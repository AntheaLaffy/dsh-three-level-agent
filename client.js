window.__ModuleLoader__.load({
	id: 'dsh-three-level-agent',
	factory(require) {
		const React = require('react');
		const ReactDOM = require('react-dom');
		const { useMemo, useState, useRef, useEffect } = React;
		const h = React.createElement;

		const CSS = `
.tla-root{position:relative;display:inline-flex;align-items:center;gap:10px;min-width:0}
.tla-badge{border-radius:var(--dsw-radius-sm);min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;align-items:center;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex;gap:4px;font-variant-numeric:tabular-nums}
.tla-badge:focus-visible{color:var(--dsw-alias-label-primary)}
@media (hover:hover){.tla-badge:hover{color:var(--dsw-alias-label-primary)}}
.tla-badge svg{flex:none}
.tla-activity{flex:none;justify-content:center;align-items:center;width:14px;height:14px;display:inline-flex}
.tla-menu{z-index:120;box-sizing:border-box;border-radius:var(--dsw-radius-lg);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:336px;max-width:min(400px,100vw - 32px);max-height:min(560px,100vh - 140px);box-shadow:var(--dsw-elevation-prominent);flex-direction:column;padding:4px;display:flex;position:fixed;overflow:hidden}
.tla-menu:before{content:"";z-index:-1;border-radius:inherit;background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));backdrop-filter:var(--dsw-menu-backdrop-filter,none);position:absolute;inset:0}
.tla-toolbar{align-items:center;gap:4px;padding:4px 8px 6px;display:flex}
.tla-toolbarTitle{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.tla-chip{border-radius:var(--dsw-radius-sm);min-height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;padding:3px 7px;font-size:11px;line-height:16px}
.tla-chip:focus-visible{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
@media (hover:hover){.tla-chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}}
.tla-chipActive{color:var(--dsw-alias-brand-primary);font-weight:500}
.tla-body{flex-direction:column;flex:auto;min-height:0;display:flex;overflow:auto}
.tla-node{min-width:0;position:relative}
.tla-body>.tla-node{margin-left:-2px}
.tla-row{box-sizing:border-box;border-radius:var(--dsw-radius-md);width:100%;min-height:44px;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:0;outline:none;align-items:flex-start;gap:6px;padding:6px 7px 6px 9px;font-size:12px;line-height:17px;display:flex;position:relative}
.tla-row:focus-visible>.tla-clickarea{background:var(--dsw-alias-interactive-bg-hover)}
@media (hover:hover){.tla-row:hover>.tla-clickarea{background:var(--dsw-alias-interactive-bg-hover)}}
.tla-clickarea{box-sizing:border-box;border-radius:var(--dsw-radius-md);flex:1;align-self:stretch;align-items:flex-start;gap:6px;min-width:0;margin:-6px -7px;padding:6px 7px;display:flex}
.tla-dot{flex:none;justify-content:center;align-items:center;width:14px;height:17px;display:inline-flex}
.tla-disclosure,.tla-disclosureSpace{flex:none;width:14px;height:17px}
.tla-disclosure{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;justify-content:center;align-items:center;padding:0;transition:transform .12s;display:inline-flex}
@media (hover:hover){.tla-disclosure:hover{color:var(--dsw-alias-label-primary)}}
.tla-disclosureOpen{transform:rotate(90deg)}
.tla-content{flex-direction:column;flex:1;min-width:0;display:flex}
.tla-label{color:inherit;font-weight:400;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.tla-meta{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.tla-right{flex:none;align-items:center;gap:6px;display:flex}
.tla-depth{border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-tertiary);border:.5px solid var(--dsw-alias-border-l2);font-size:10px;line-height:14px;padding:0 5px;font-variant-numeric:tabular-nums}
.tla-count{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:17px;min-width:18px;text-align:right;font-variant-numeric:tabular-nums}
.tla-children{margin-left:16px;padding-left:3px;position:relative}
.tla-children:before,.tla-children>.tla-node:before{content:"";border-left:.5px solid var(--dsw-alias-border-l2);position:absolute;left:0}
.tla-children:before{height:23px;top:-23px}
.tla-children>.tla-node:before{top:0;bottom:0;left:-3px}
.tla-children>.tla-node:last-child:before{height:15px;bottom:auto}
.tla-children>.tla-node>.tla-row:before{content:"";border-top:.5px solid var(--dsw-alias-border-l2);width:12px;position:absolute;top:14px;left:-3px}
.tla-empty,.tla-error{color:var(--dsw-alias-label-tertiary);padding:8px 10px;font-size:11px;line-height:16px}
.tla-error{color:var(--dsw-alias-state-error-primary)}
.tla-loading{color:var(--dsw-alias-label-tertiary);padding:6px 10px;font-size:11px;line-height:16px}
`;
		const tagId = 'dsh-three-level-agent/client.css';
		if (document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-three-level-agent';
			tag.dataset.pluginCss = tagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		const NS = 'dsh-three-level-agent/client';

		/** Inline copy of the bundle icon (three-tier nodes). */
		function TierIcon({ size = 14 }) {
			return h('svg', { viewBox: '0 0 48 48', width: size, height: size, 'aria-hidden': true },
				h('rect', { width: 48, height: 48, rx: 10, fill: '#0c1a33' }),
				h('g', { stroke: '#4d8cff', strokeWidth: 1.4, fill: 'none' },
					h('path', { d: 'M24 10 L12 22 M24 10 L24 22 M24 10 L36 22' }),
					h('path', { d: 'M12 22 L8 37 M12 22 L15 37 M12 22 L21 37' }),
					h('path', { d: 'M24 22 L19 37 M24 22 L24 37 M24 22 L29 37' }),
					h('path', { d: 'M36 22 L33 37 M36 22 L40 37 M36 22 L27 37' })),
				h('g', { fill: '#8db8ff' },
					h('circle', { cx: 24, cy: 9.5, r: 3.4 }),
					h('circle', { cx: 12, cy: 22.5, r: 3 }), h('circle', { cx: 24, cy: 22.5, r: 3 }), h('circle', { cx: 36, cy: 22.5, r: 3 }),
					h('circle', { cx: 8, cy: 37.5, r: 2.7 }), h('circle', { cx: 15, cy: 37.5, r: 2.7 }), h('circle', { cx: 21, cy: 37.5, r: 2.7 }), h('circle', { cx: 27, cy: 37.5, r: 2.7 }), h('circle', { cx: 33, cy: 37.5, r: 2.7 }), h('circle', { cx: 40, cy: 37.5, r: 2.7 })));
		}

		function Dot({ state }) {
			const color = state === 'running'
				? 'var(--dsw-alias-brand-primary,#4d8cff)'
				: state === 'done'
					? 'var(--dsw-alias-state-success-primary,#34c07a)'
					: 'var(--dsw-alias-label-tertiary,#8a94a6)';
			return h('span', { className: 'tla-dot' }, h('span', {
				style: { width: 7, height: 7, borderRadius: '50%', background: color, display: 'block' }
			}));
		}

		function Chevron({ open }) {
			return h('svg', { viewBox: '0 0 12 12', width: 12, height: 12, 'aria-hidden': true, style: { transform: open ? 'rotate(90deg)' : 'none' } },
				h('path', { d: 'M4.5 2.5 L8 6 L4.5 9.5', stroke: 'currentColor', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
		}

		function activityOf(entry, summaries) {
			if (entry.activity === 'running') return 'running';
			const timing = summaries[entry.id]?.projectionValues?.subagentTiming;
			if (entry.activity === 'inactive' && timing?.lastTurnCompleted === true) return 'done';
			return 'idle';
		}

		/** Bottom-up visibility under the active status filter. */
		function visibleSet(entries, catalogs, summaries, filter, depth) {
			if (depth > 8) return new Set();
			const result = new Set();
			for (const entry of entries) {
				const children = catalogs[entry.id]?.entries ?? [];
				const childVisible = visibleSet(children, catalogs, summaries, filter, depth + 1);
				const state = activityOf(entry, summaries);
				const selfVisible = filter === 'all' || (filter === 'running' && state === 'running') || (filter === 'done' && state === 'done');
				if (selfVisible || childVisible.size > 0) result.add(entry.id);
			}
			return result;
		}

		function TreeRows({ entries, parentId, level, catalogs, summaries, filter, visible, expanded, toggle, openChild, t }) {
			if (entries.length === 0) return h('div', { className: 'tla-empty' }, t('empty'));
			return entries
				.filter((entry) => visible.has(entry.id))
				.map((entry) => {
					const childCatalog = catalogs[entry.id];
					const children = childCatalog?.entries ?? [];
					const hasChildren = childCatalog !== undefined && children.length > 0;
					const loadingChildren = childCatalog === undefined || childCatalog.state === 'loading';
					const childVisible = visibleSet(children, catalogs, summaries, filter, level + 1);
					const isOpen = expanded.has(entry.id);
					const state = activityOf(entry, summaries);
					const canExpand = hasChildren || loadingChildren;
					return h('div', { key: entry.id, className: 'tla-node' }, [
						h('div', { className: 'tla-row', onClick: () => openChild({ parentSessionId: parentId, childSessionId: entry.id, mode: entry.mode ?? 'continuable' }) }, [
							h('span', { className: 'tla-clickarea' }, [
								canExpand
									? h('button', {
										className: 'tla-disclosure' + (isOpen ? ' tla-disclosureOpen' : ''),
										onClick: (event) => { event.stopPropagation(); toggle(entry.id); },
										'aria-expanded': isOpen
									}, h(Chevron, { open: isOpen }))
									: h('span', { className: 'tla-disclosureSpace' }),
								h(Dot, { state }),
								h('span', { className: 'tla-content' }, [
									h('span', { className: 'tla-label' }, entry.label ?? entry.id),
									entry.external === true && h('span', { className: 'tla-meta' }, t('mode.external'))
								]),
								h('span', { className: 'tla-right' }, [
									h('span', { className: 'tla-depth' }, 'L' + level),
									hasChildren && h('span', { className: 'tla-count' }, '\u00d7' + children.length),
									loadingChildren && h('span', { className: 'tla-count' }, '\u2026')
								])
							])
						]),
						isOpen && h('div', { className: 'tla-children' },
							TreeRows({ entries: children, parentId: entry.id, level: level + 1, catalogs, summaries, filter, visible: childVisible, expanded, toggle, openChild, t }))
					]);
				});
		}

		function ThreeLevelBadge({ sessionId, useSessions, useSessionStatus, t, refreshProjection, openChild }) {
			const isChild = useSessions((state) => state.byId[sessionId]?.origin === 'subagent');
			const projections = useSessions((state) => state.projectionsBySession ?? {});
			const summaries = useSessions((state) => state.byId ?? {});
			const statuses = useSessionStatus((value) => value);
			const catalogs = useMemo(() => Object.fromEntries(Object.entries(projections).map(([id, snapshot]) => {
				const projected = snapshot.values?.subagentCatalog;
				return [id, {
					state: snapshot.state === 'idle' ? (projected === undefined ? 'loading' : 'ready') : (snapshot.state === 'migration-required' && projected !== undefined ? 'ready' : snapshot.state),
					error: snapshot.error,
					entries: (projected ?? []).map((entry) => ({
						...entry,
						activity: (statuses?.get?.(entry.id)?.running ?? summaries[entry.id]?.running) === true ? 'running' : 'inactive'
					}))
				}];
			})), [projections, summaries, statuses]);
			const rootCatalog = catalogs[sessionId];
			const directEntries = rootCatalog?.entries ?? [];
			const [open, setOpen] = useState(false);
			const [filter, setFilter] = useState('all');
			const [expanded, setExpanded] = useState(() => new Set());
			const rootRef = useRef(null);
			const menuRef = useRef(null);
			const [menuPosition, setMenuPosition] = useState(undefined);

			// Load every direct child's catalog when the panel opens (the
			// grandchild counts come from those projections).
			useEffect(() => {
				if (!open) return;
				for (const entry of directEntries) {
					if (projections[entry.id] === undefined) refreshProjection(entry.id);
				}
			}, [open]); // eslint-disable-line react-hooks/exhaustive-deps

			useEffect(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					if (menuRef.current !== null && !menuRef.current.contains(event.target) && rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === 'Escape') setOpen(false);
				};
				document.addEventListener('pointerdown', onPointerDown);
				document.addEventListener('keydown', onKeyDown);
				return () => {
					document.removeEventListener('pointerdown', onPointerDown);
					document.removeEventListener('keydown', onKeyDown);
				};
			}, [open]);

			if (isChild) return null;

			const runningCount = directEntries.filter((entry) => entry.activity === 'running').length;
			const knownGrandCounts = directEntries.map((entry) => catalogs[entry.id]?.entries?.length).filter((count) => count !== undefined);
			const grandKnown = knownGrandCounts.length === directEntries.length && directEntries.length > 0;
			const grandCount = knownGrandCounts.reduce((sum, count) => sum + count, 0);
			if (directEntries.length === 0 && (rootCatalog === undefined || rootCatalog.state === 'ready')) return null;

			const toggle = (id) => {
				setExpanded((previous) => {
					const next = new Set(previous);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			};
			const expandAll = () => {
				const next = new Set();
				for (const entry of directEntries) if (catalogs[entry.id]?.entries?.length > 0) next.add(entry.id);
				setExpanded(next);
			};
			const collapseAll = () => setExpanded(new Set());
			const visible = visibleSet(directEntries, catalogs, summaries, filter, 1);

			const openMenu = () => {
				if (open) {
					setOpen(false);
					return;
				}
				const rect = rootRef.current?.getBoundingClientRect();
				if (rect !== undefined) {
					const top = Math.min(rect.bottom + 4, window.innerHeight - 320);
					const right = Math.max(8, window.innerWidth - rect.right);
					setMenuPosition({ top: Math.max(8, top), right });
				} else setMenuPosition({ top: 80, right: 16 });
				setOpen(true);
			};

			return h('div', { className: 'tla-root', ref: rootRef }, [
				h('button', {
					type: 'button',
					className: 'tla-badge',
					'aria-haspopup': 'tree',
					'aria-expanded': open,
					'aria-label': grandKnown ? t('badge.aria', { direct: directEntries.length, grand: grandCount }) : t('badge.partial.aria', { direct: directEntries.length }),
					onClick: openMenu
				}, [
					runningCount > 0 && h('span', { className: 'tla-activity' }, h(Dot, { state: 'running' })),
					h(TierIcon, {}),
					h('span', null, t(grandKnown ? 'badge' : 'badge.partial', {
						direct: directEntries.length,
						grand: grandCount,
						running: runningCount
					}))
				]),
				open && ReactDOM.createPortal(h('div', {
					className: 'tla-menu',
					ref: menuRef,
					role: 'dialog',
					'aria-label': t('panel.title'),
					style: { top: menuPosition?.top, right: menuPosition?.right }
				}, [
					h('div', { className: 'tla-toolbar' }, [
						h('span', { className: 'tla-toolbarTitle' }, t('panel.title')),
						h('button', { type: 'button', className: 'tla-chip', onClick: expandAll }, t('expand.all')),
						h('button', { type: 'button', className: 'tla-chip', onClick: collapseAll }, t('collapse.all'))
					]),
					h('div', { className: 'tla-toolbar' }, [
						h('button', { type: 'button', className: 'tla-chip' + (filter === 'all' ? ' tla-chipActive' : ''), onClick: () => setFilter('all') }, t('filter.all')),
						h('button', { type: 'button', className: 'tla-chip' + (filter === 'running' ? ' tla-chipActive' : ''), onClick: () => setFilter('running') }, t('filter.running')),
						h('button', { type: 'button', className: 'tla-chip' + (filter === 'done' ? ' tla-chipActive' : ''), onClick: () => setFilter('done') }, t('filter.done'))
					]),
					h('div', { className: 'tla-body', role: 'tree', 'aria-label': t('panel.title') },
						rootCatalog === undefined || rootCatalog.state === 'loading'
							? h('div', { className: 'tla-loading' }, t('loading'))
							: rootCatalog.state !== 'ready'
								? h('div', { className: 'tla-error' }, rootCatalog.error?.message ?? t('load.error'))
								: TreeRows({
									entries: directEntries,
									parentId: sessionId,
									level: 1,
									catalogs,
									summaries,
									filter,
									visible,
									expanded,
									toggle,
									openChild,
									t
								}))
				])
			, document.body)
			]);
		}

		const inject = ['slots', 'locale', 'sessions', 'uiWorkspace'];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh: {
					'badge': '{direct} 子代理 · {grand} 孙代理',
					'badge.partial': '{direct} 子代理',
					'badge.aria': '三级代理：{direct} 个子代理，{grand} 个孙代理',
					'badge.partial.aria': '三级代理：{direct} 个子代理',
					'panel.title': '三级代理树',
					'expand.all': '全部展开',
					'collapse.all': '全部折叠',
					'filter.all': '全部',
					'filter.running': '运行中',
					'filter.done': '已完成',
					'mode.external': '外部执行',
					'loading': '加载中…',
					'load.error': '加载代理树失败',
					'empty': '（暂无子代理）'
				},
				en: {
					'badge': '{direct} subagents · {grand} grand',
					'badge.partial': '{direct} subagents',
					'badge.aria': 'Three-level agents: {direct} subagents, {grand} grandchildren',
					'badge.partial.aria': 'Three-level agents: {direct} subagents',
					'panel.title': 'Three-level agent tree',
					'expand.all': 'Expand all',
					'collapse.all': 'Collapse all',
					'filter.all': 'All',
					'filter.running': 'Running',
					'filter.done': 'Done',
					'mode.external': 'External run',
					'loading': 'Loading…',
					'load.error': 'Could not load the agent tree',
					'empty': '(no subagents)'
				}
			}), 'three-level-agent: client dictionaries');
			const actions = () => ({
				refreshProjection(sessionId) {
					ctx.sessions.refreshProjections(sessionId);
				},
				openChild(address) {
					ctx.uiWorkspace.openSession(address);
				}
			});
			ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
				name: 'conversation.session.header.actions',
				id: 'three-level-agent-tree',
				order: 20,
				locale: NS,
				inject: actions
			}, ThreeLevelBadge));
		}
		return { inject, apply };
	}
});
