# @local/dsh-three-level-agent

三级代理插件 — three-level agent mode for DeepSeek Harness.

## What it does

1. **允许开启子代理**：把 subagent 运行时的委派深度上限提升到 2（默认，可配置），
   深度 1 的子代理可以继续建立自己的子代理（主代理 → 子代理 → 孙代理，三级结构），
   同时把单棵代理树的驻留容量上限提升到 128，足以容纳 1×9×9 = 90 个子代理。
2. **双向通信**：注册全局工具 `agent_message`，代理树内任意代理之间都可以互发消息
   （祖先、后代、同树兄弟），目标用 `list_agents` 给出的 id 或快捷方式
   `"parent"` / `"root"` 寻址。
3. **异步队列 + 互斥锁 + 就绪等待**：发送只是入队并立即返回，发送方继续干活；
   每个收件人一条 FIFO 队列，后台投递线程在互斥锁内线性投递，等待连接就绪
   （分轮有界等待，不做重复重试）；超出 `maxWaitMs` 仍无法投递时才把失败通知
   回投给发送方。已结束的子代理不会离开树索引——只要它的父代理还活着，
   投递会通过运行时的冷恢复（cold resume）把它唤醒，就像原生 `send_message` 一样。

## Configuration

- `maxDepth` (default 2): 委派深度上限，≥2 即开启三级代理。
- `maxActiveSubagents` (default 128): 单棵树的驻留子代理容量，1×9×9 至少需要 90。
- `readyTimeoutMs` (default 30000): 连接就绪等待的单轮时长。
- `maxWaitMs` (default 600000): 一条排队消息等待连接的总预算，超时投递失败并通知发送方。
- `delivery` (default `queue`): `queue` 作为独立下一回合投递；`steer` 在最近步骤边界注入。

Plugin rows are edited in the profile's `cordis.patch.yml`:

```yaml
- id: three-level-agent
  name: '@local/dsh-three-level-agent'
  config:
    maxDepth: 2
    maxActiveSubagents: 128
```
