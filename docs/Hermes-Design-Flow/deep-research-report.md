# Hermes Agent 事实核对备忘

这份文件是 `01`–`13` 章节的源码依据，不参与网页导航。网页由 `build.py` 在构建时写入 **Hermes 源码基线 commit**；事实应以该 commit 的代码为准，而不是以易变化的模型、平台或测试数量为准。

## 1. 定位与架构

Hermes 是个人 AI Agent 运行时，同一 `AIAgent` 支撑 CLI、TUI、消息网关、Desktop backend、ACP 和 HTTP API 等 LLM 驱动路径。窄腰核心负责提示词、provider、工具、预算、中断、压缩和状态回调；平台连接、第三方能力、技能与记忆在边缘扩展。

明确例外：

- Cron `no_agent=True` 只执行脚本并投递 stdout，不创建 `AIAgent`。
- `api_mode="codex_app_server"` 从 `AIAgent` 入口进入，但使用 Codex 原生线程与工具循环。
- `/v1/chat/completions` 默认无状态；Batch/RL 轨迹不写入 `state.db`。

**证据：** `AGENTS.md`、`run_agent.py`、`agent/conversation_loop.py`、`cron/scheduler.py`、`gateway/platforms/api_server.py`、`batch_runner.py`。

## 2. Prompt cache 与系统提示

`agent/system_prompt.py` 将来源分为 `stable`、`context`、`volatile`，然后拼成一个 `_cached_system_prompt`，在会话内原样复用。`volatile` 是 session snapshot，不是 per-turn refresh。

以下内容在 API 调用时附加，不写回冻结提示：

- external-memory prefetch；
- plugin `pre_llm_call` context；
- prefill messages；
- ephemeral/channel system prompt。

普通 turn 不应重建提示或更换工具面。压缩允许重建；provider fallback 还会同步更新 Model/Provider 身份行，这是显式例外。

**证据：** `agent/system_prompt.py`、`agent/conversation_loop.py`、`agent/prompt_caching.py`。

## 3. Agent loop 与工具

用户消息在第一次 API 调用前持久化。模型返回工具调用后，Hermes 校验、审批和 dispatch，追加 tool result，再继续模型调用；多工具调用在满足条件时可并发。用量、消息和退出状态增量更新，异常路径也经过 finalizer。

Agent-state tools（如 `memory`、`session_search`、`delegate_task`）由 `run_agent.py` 拦截；普通 registry tools 由 `model_tools.py` dispatch。JSONL trajectory 默认关闭，memory sync 与 skill review 也是条件性/best-effort 路径。

**证据：** `agent/turn_context.py`、`agent/conversation_loop.py`、`agent/turn_finalizer.py`、`run_agent.py`、`model_tools.py`。

## 4. 状态与会话库

默认 profile 的数据库位于 `~/.hermes/state.db`；其他 profile 使用各自 `$HERMES_HOME/state.db`。当前源码基线的 schema version 为 19，主要对象包括：

- `sessions`、`messages`；
- `messages_fts`、`messages_fts_trigram`；
- `gateway_routing`、`compression_locks`；
- `state_meta`、`schema_version`。

SQLite 默认 WAL，写入使用 `BEGIN IMMEDIATE`、短 timeout、jitter retry 和周期性 checkpoint；WAL 不兼容文件系统会回退到 DELETE journal mode。

默认 `compression.in_place: true`。压缩前的 live rows 变为 `active=0, compacted=1`，压缩结果成为同 session 的 active rows。恢复只读 active rows，`session_search` 默认仍搜索 compacted rows。`parent_session_id` 是保留的 session-rotation 路径，不是默认压缩语义。

**证据：** `hermes_state.py`、`agent/conversation_compression.py`、`tools/session_search_tool.py`。

## 5. 压缩与缓存

压缩阈值不是单一“50%”：

- config 基值：`compression.threshold: 0.50`；
- context 小于 512K：effective threshold 至少 75%；
- Codex OAuth gpt-5.4/5.5/5.6：默认 85%；
- Gateway hygiene：85% token safety net，另有默认 5000 message hard limit；
- Codex app-server：默认 native compaction。

压缩过程保护头尾、对齐 tool call/result、生成或更新结构化 summary、修复角色交替并清理历史媒体。摘要遇到鉴权/网络错误时保留原消息并中止；其他失败在默认配置下使用有上限的 deterministic fallback。

Anthropic cache 使用 `system_and_3`：system 加最近三个可承载 marker 的非-system 消息，最多四个 breakpoint。

**证据：** `hermes_cli/config.py`、`agent/context_compressor.py`、`agent/conversation_compression.py`、`agent/prompt_caching.py`、`gateway/run.py`。

## 6. 执行路径

- **直接工具：** 短、可观察、需要主 Agent 逐步判断。
- **`execute_code`：** 中间 RPC 结果留在脚本内，主上下文得到有上限的 stdout、状态和失败信息。
- **`delegate_task`：** 顶层模型调用立即返回并后台运行；完成结果以后续消息回流。leaf 默认不能继续 delegate，nested orchestration 需要提高 `max_spawn_depth`。
- **Cron：** 需要计划触发或脱离当前聊天；Agent jobs 默认 `skip_memory=True`，连续性用文件或 `context_from`。

后台 delegation 是进程内、非耐久任务；父会话关闭或进程退出可能丢弃结果。

**证据：** `tools/code_execution_tool.py`、`tools/delegate_tool.py`、`cron/jobs.py`、`cron/scheduler.py`。

## 7. 插件、技能、记忆与 Curator

General PluginManager、model-provider discovery、memory-provider discovery 和 context-engine selection 是不同路径。通用插件通过公开 `PluginContext` 注册 tool、hook、middleware、CLI/slash command、platform 或 bundled skill；第三方产品集成应发布为独立插件仓库。

Skill 是按需加载的程序性知识；Memory 是跨会话事实或画像；SessionDB 是完整历史。三者不能互换。

Curator 默认做确定性的闲置维护。当前配置默认 `prune_builtins: true`，但关键 bundled skills 与 hub-installed skills 受保护；LLM consolidation 默认关闭。所有自动移除都应是可恢复归档，pinned skills 不参与自动迁移。

**证据：** `hermes_cli/plugins.py`、`providers/__init__.py`、`agent/memory_manager.py`、`tools/skills_tool.py`、`agent/curator.py`、`hermes_cli/config.py`。

## 8. 交付面

- Dashboard Chat 通过 `/api/pty` 嵌入真正的 Ink TUI。
- Electron Desktop 是独立 React chat，使用 `apps/shared` client 连接 headless `hermes serve`。
- ACP 用 stdio JSON-RPC，并将同步 Agent 放入 thread pool；cwd、tool event 和 permission 都有协议桥接。
- TUI gateway dispatcher 可走 stdio 或 WebSocket。
- API server 提供 Chat Completions、Responses、Runs、SSE、approval/stop 与 health/capabilities。
- Batch 单独保存 ShareGPT-style trajectories。

交付不会自动产生长期学习：只有 SessionDB、memory、skill/Curator 和 trajectory 各自的明确路径会写状态。

**证据：** `hermes_cli/web_server.py`、`web/src/pages/ChatPage.tsx`、`apps/desktop/README.md`、`apps/shared/`、`tui_gateway/`、`acp_adapter/`、`gateway/platforms/api_server.py`、`agent/trajectory.py`。

## 9. 安全口径

审批、allowlist、模式扫描和 redaction 是防御层，不是 containment。面对不可信输入，应使用权限、挂载、网络和凭证都受限的 sandbox、容器或 VM；普通同用户进程没有隔离能力。

**证据：** `SECURITY.md`、`tools/file_tools.py`、`tools/environments/docker.py`。
