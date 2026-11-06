/**
 * 三级代理插件 (three-level agent plugin).
 *
 * Turns the delegation tree into a three-level agent mode:
 *
 * 1. Raises the subagent runtime limits so a depth-1 subagent can create its
 *    own depth-2 sub-subagents (main agent -> subagent -> sub-subagent), and
 *    so a full 1 x 9 x 9 tree (90 children) fits in one process.
 * 2. Registers the `agent_message` tool: any agent in the delegation tree may
 *    message any other agent in the same tree — ancestors, descendants, and
 *    siblings — not just its direct parent/child. Targets are addressed by
 *    agent id or by the shortcuts "parent" and "root".
 * 3. Communication is asynchronous and race-safe. A send only ENQUEUES the
 *    message (FIFO per recipient) and returns immediately, so the sender
 *    keeps working. A background drainer serializes delivery under a
 *    per-target mutex and performs the wait-for-ready sequence itself: it
 *    waits for the recipient's connection to become ready in bounded rounds
 *    instead of retrying, and reports a delivery failure back to the sender
 *    only if the connection never comes up within `maxWaitMs`.
 */
import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { queueHostSubagentPrompt, steerHostSubagentPrompt } from "@deepseek-ai/dsh-subagent/internal";
import { createUserMessage } from "@deepseek-ai/dsh-llm";

export const name = "three-level-agent";

export const inject = ["tools", "subagents", "agents", "systemPrompt"];

export const Config = z.object({
	/** Delegation depth cap enforced for this profile (>= 2 enables three levels). */
	maxDepth: z.number().step(1).min(2).max(64).default(2),
	/** Resident-child capacity of one delegation tree (>= 90 for a 1 x 9 x 9 tree). */
	maxActiveSubagents: z.number().step(1).min(8).max(1024).default(128),
	/** One bounded round of the wait-for-ready sequence, in milliseconds. */
	readyTimeoutMs: z.number().step(1).min(1000).max(600000).default(30000),
	/** Total time a queued message may wait for its connection before failing. */
	maxWaitMs: z.number().step(1).min(1000).max(3600000).default(600000),
	/** queue: a distinct next turn; steer: inject at the nearest step boundary. */
	delivery: z.union(["queue", "steer"]).default("queue")
});

/** Protocol shared by every cosmokit Volatile config reference. */
const VOLATILE_WRITE = Symbol.for("cosmokit.volatile.write");

export function apply(ctx, config = {}) {
	// --- 1. Three-level delegation capacity ---------------------------------
	// The subagents service owns `maxDepth` and `maxActiveSubagents` as
	// volatile runtime config; raising them here applies for the whole
	// process without touching the user's profile file. Existing higher
	// values (settings UI) win.
	const subagents = ctx.subagents;
	const maxDepthRef = subagents.config.maxDepth;
	maxDepthRef[VOLATILE_WRITE](Math.max(maxDepthRef.get(), config.maxDepth ?? 2));
	const capacityRef = subagents.config.maxActiveSubagents;
	capacityRef[VOLATILE_WRITE](Math.max(capacityRef.get(), config.maxActiveSubagents ?? 128));

	// --- 2. Delegation-tree index (derived cache over the live agent tree) --
	// One row per live agent: its direct parent, tree root, and delegation
	// depth. Seeded from the registry and kept in sync through agent
	// lifecycle events; nothing here is durable, the session log is.
	const index = new Map();
	const record = (agent) => {
		if (index.has(agent.id)) return index.get(agent.id);
		const parentId = agent.session.header.parentSession;
		let entry;
		if (parentId === void 0) {
			entry = {
				parentId: void 0,
				rootId: agent.id,
				depth: agent.session.header.delegationDepth ?? 0
			};
		} else {
			const parent = ctx.agents.get(parentId);
			const parentEntry = parent === void 0 ? void 0 : record(parent);
			entry = {
				parentId,
				rootId: parentEntry?.rootId,
				depth: agent.session.header.delegationDepth ?? 0
			};
		}
		index.set(agent.id, entry);
		return entry;
	};
	for (const agent of ctx.agents.list()) record(agent);
	const stopCreated = ctx.on("agent/created", ({ agent }) => record(agent));
	// Finished subagents leave the live registry but stay addressable through
	// the runtime's cold resume, so their rows are kept: the index is a
	// session-lifetime memory of the tree, not a liveness mirror.

	/** Live ancestry chain of one agent id, bottom-up, bounded. */
	const chainOf = (agentId) => {
		const chain = [];
		let current = agentId;
		while (current !== void 0 && chain.length < 128) {
			chain.push(current);
			const entry = index.get(current);
			if (entry === void 0) break;
			current = entry.parentId;
		}
		return chain;
	};

	/** Resolve "parent" / "root" shortcuts, otherwise pass the id through. */
	const resolveTarget = (senderId, raw) => {
		if (raw === "parent") {
			const entry = index.get(senderId);
			if (entry?.parentId === void 0) throw new Error("agent_message: you have no parent agent (you are the main agent)");
			return entry.parentId;
		}
		if (raw === "root") {
			const entry = index.get(senderId);
			if (entry?.rootId === void 0 || entry.rootId === senderId) throw new Error("agent_message: you are the main agent, or the tree root is not live");
			return entry.rootId;
		}
		return raw;
	};

	/** Require sender and target to share one delegation tree. */
	const authorize = (senderId, targetId) => {
		if (targetId === senderId) throw new Error("agent_message: cannot message yourself");
		const senderChain = new Set(chainOf(senderId));
		for (const id of chainOf(targetId)) if (senderChain.has(id)) return;
		throw new Error(`agent_message: agent "${targetId}" is not in your delegation tree; you can message your ancestors, descendants, and siblings under the same main agent`);
	};

	// --- 3. Wait-for-ready sequence -----------------------------------------
	/** Resolve once the agent appears in the registry, the timeout passes, or the signal aborts. */
	const waitForAgentLive = (agentId, timeoutMs, signal) => new Promise((resolve, reject) => {
		if (ctx.agents.get(agentId) !== void 0) return resolve(true);
		let settled = false;
		let stopCreated;
		let timer;
		const onAbort = () => reject(signal?.reason instanceof Error ? signal.reason : new Error("agent_message: aborted while waiting for the recipient"));
		const finish = (live) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			stopCreated?.();
			signal?.removeEventListener("abort", onAbort);
			resolve(live);
		};
		stopCreated = ctx.on("agent/created", ({ agent }) => {
			if (agent.id === agentId) finish(true);
		});
		timer = setTimeout(() => finish(false), timeoutMs);
		signal?.addEventListener("abort", onAbort, { once: true });
	});

	const messageSource = (senderId) => ({
		kind: "agent-message",
		form: "relay",
		senderSessionId: senderId
	});

	/**
	 * Deliver one message to a tree member. The caller performs no retries:
	 * when the recipient's direct parent is not live yet, this joins the
	 * wait-for-ready queue and waits in bounded rounds until the connection
	 * comes up or the total budget runs out.
	 */
	const deliver = async (senderId, targetId, content, signal) => {
		const entry = index.get(targetId);
		if (entry === void 0) throw new Error(`agent_message: agent "${targetId}" is not in your delegation tree (unknown id, or it belongs to a different main agent)`);
		if (entry.parentId === void 0) {
			// The target is a top-level main agent: steer it directly.
			const live = ctx.agents.get(targetId);
			if (live === void 0) throw new Error(`agent_message: the main agent "${targetId}" is not live`);
			const input = createUserMessage({ content, source: messageSource(senderId) });
			live.steer(input);
			return input.id;
		}
		// Every deeper target is admitted through its direct parent; the
		// subagent runtime then handles residency, cold resume, and its own
		// per-child delivery lock.
		const deadline = Date.now() + (config.maxWaitMs ?? 600000);
		const roundMs = config.readyTimeoutMs ?? 30000;
		let parent = ctx.agents.get(entry.parentId);
		while (parent === void 0) {
			signal?.throwIfAborted();
			const remaining = Math.min(roundMs, Math.max(0, deadline - Date.now()));
			if (remaining <= 0) throw new Error(`agent_message: communication not ready — parent agent "${entry.parentId}" of target "${targetId}" is not live (it finished or left the tree) within ${config.maxWaitMs ?? 600000}ms; the target itself may still be resumable, so message its parent or a live ancestor instead`);
			await waitForAgentLive(entry.parentId, remaining, signal);
			parent = ctx.agents.get(entry.parentId);
		}
		return (config.delivery ?? "queue") === "steer"
			? steerHostSubagentPrompt(subagents, parent, targetId, content, messageSource(senderId), signal)
			: queueHostSubagentPrompt(subagents, parent, targetId, content, messageSource(senderId), signal);
	};

	// --- 4. Per-target FIFO queue + mutex + background drainer --------------
	// Enqueueing is synchronous and lock-free; only delivery is serialized.
	// A per-target mutex (promise chain) linearizes every delivery into one
	// inbox, so concurrent senders never interleave. A single drainer per
	// target consumes the queue and owns the wait-for-ready sequence.
	const runtime = new AbortController();
	const runtimeSignal = runtime.signal;
	const pending = new Map(); // targetId -> queued message rows
	const draining = new Set(); // targetIds with a live drainer
	const tails = new Map(); // per-target delivery mutex

	const withTargetLock = (targetId, operation) => {
		const previous = tails.get(targetId) ?? Promise.resolve();
		const result = previous.then(operation, operation);
		const tail = result.then(() => void 0, () => void 0);
		tails.set(targetId, tail);
		void tail.then(() => {
			if (tails.get(targetId) === tail) tails.delete(targetId);
		});
		return result;
	};

	/** Report a failed delivery back to the sender, best effort, never re-reported. */
	const notifyFailure = (item, error) => {
		const content = [{
			type: "text",
			text: `agent_message delivery failed: your message ${item.id} to agent ${item.targetId} was not delivered — ${error instanceof Error ? error.message : String(error)}`
		}];
		enqueue({
			id: randomUUID(),
			senderId: "three-level-agent",
			targetId: item.senderId,
			content,
			notice: true
		});
	};

	/** Append one row to a recipient's FIFO queue and make sure a drainer runs. */
	const enqueue = (item) => {
		let queue = pending.get(item.targetId);
		if (queue === void 0) {
			queue = [];
			pending.set(item.targetId, queue);
		}
		queue.push(item);
		if (!draining.has(item.targetId)) startDrain(item.targetId);
		return item.id;
	};

	/** Start the single drainer that owns one recipient's queue. */
	const startDrain = (targetId) => {
		if (draining.has(targetId)) return;
		draining.add(targetId);
		void (async () => {
			try {
				while (true) {
					const queue = pending.get(targetId);
					if (queue === void 0 || queue.length === 0) {
						pending.delete(targetId);
						return;
					}
					const item = queue[0];
					// The mutex makes delivery into one inbox linear; the wait
					// for the connection happens inside this critical section.
					const failure = await withTargetLock(targetId, async () => {
						if (runtimeSignal.aborted) return new Error("three-level-agent plugin unloaded before delivery");
						try {
							await deliver(item.senderId, targetId, item.content, runtimeSignal);
							return void 0;
						} catch (error) {
							return error instanceof Error ? error : new Error(String(error));
						}
					});
					queue.shift();
					if (failure !== void 0) {
						if (item.notice) ctx.logger.warn(`three-level-agent: could not report delivery failure of message ${item.id} back to sender ${item.senderId}`);
						else notifyFailure(item, failure);
					}
					if (runtimeSignal.aborted) return;
				}
			} finally {
				draining.delete(targetId);
			}
		})();
	};

	// --- 5. Model-facing tool and prompt guidance ---------------------------
	const disposeTool = ctx.effect(() => {
		const unregister = ctx.tools.register(defineTool({
			name: "agent_message",
			description: "Send one message to any agent in your delegation tree — the main agent, your parent, your siblings, or your own subagents at any depth. The message is queued for delivery and the call returns immediately, so you can continue your work while the connection to the recipient is established in the background. Messages to the same recipient are queued in order (FIFO) and delivered under a lock, so concurrent senders cannot interleave into the same inbox. If delivery never becomes possible, you receive a delivery-failure notice. Use agent ids from list_agents, or the shortcuts \"parent\" (your direct parent) and \"root\" (the main agent).",
			parameters: {
				agent_id: {
					type: "string",
					required: true,
					description: "Target agent: an id from list_agents (children or descendants scope), \"parent\" for your direct parent, or \"root\" for the main agent at the top of your tree."
				},
				message: {
					type: "string",
					required: true,
					description: "Self-contained message to deliver."
				}
			},
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						messageId: { type: "string", required: true },
						target: { type: "string", required: true },
						status: { type: "string", required: true, const: "queued" }
					}
				},
				render: (_args, value) => [{
					type: "text",
					text: `queued message ${value.messageId} for agent ${value.target}; delivery proceeds in the background when the recipient is ready — keep working`
				}]
			},
			isConcurrencySafe: () => true,
			execute(args, exec) {
				const sender = exec.agent;
				if (!sender) throw new Error("agent_message requires a calling agent (exec.agent was undefined)");
				const targetId = resolveTarget(sender.id, args.agent_id);
				authorize(sender.id, targetId);
				const content = [
					{ type: "text", text: `Agent ${sender.id} sent a message: ` },
					{ type: "text", text: args.message }
				];
				const messageId = enqueue({
					id: randomUUID(),
					senderId: sender.id,
					targetId,
					content,
					notice: false
				});
				return { messageId, target: targetId, status: "queued" };
			}
		}));
		return unregister;
	});
	const disposePrompt = ctx.effect(() => {
		const stopSection = ctx.systemPrompt.section({
			name: "three-level:policy",
			order: ctx.systemPrompt.getSectionOrder("TOOL_SUBAGENT"),
			text: "Three-level agent mode is enabled: any agent may create subagents up to delegation depth 2 (main agent → subagent → sub-subagent). Use agent_message to message any agent in your delegation tree by agent id, or use the shortcuts \"parent\" and \"root\". Sends are asynchronous: the message joins the recipient's FIFO queue, delivery is serialized under a lock and waits for the connection in the background, and a failure is reported back to you — keep working, do not retry."
		});
		const stopContext = ctx.systemPrompt.context({
			name: "three-level:depth",
			order: ctx.systemPrompt.getContextOrder("SUBAGENT_DELEGATION"),
			text: (context) => {
				const agent = context.agent;
				if (agent === void 0) return "";
				const depth = agent.session.header.delegationDepth ?? 0;
				if (depth === 0) return "You are the main agent at delegation depth 0. Subagents you create sit at depth 1 and may each create depth-2 sub-subagents. Use agent_message to message any of them; subagents reach you with agent_message({ agent_id: \"root\", ... }).";
				return `You are a subagent at delegation depth ${depth}. ${depth < 2 ? "You may create subagents one level deeper." : "You are at the deepest allowed level; carry out the work directly."} Use agent_message to message your parent (\"parent\"), the main agent (\"root\"), or your siblings and descendants by id.`;
			}
		});
		return () => {
			stopSection();
			stopContext();
		};
	});

	// Unloading the plugin stops the drainers, then removes listeners, tool,
	// and prompt text.
	return () => {
		runtime.abort(new Error("three-level-agent plugin unloaded"));
		pending.clear();
		draining.clear();
		disposePrompt();
		disposeTool();
		stopCreated();
	};
}
