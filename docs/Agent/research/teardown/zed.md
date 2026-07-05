# Zed —— 事实底稿(快照:2026 年年中)

> 教学站内部研究底稿。规则:只写可溯源断言;估算/推断显式标注;缺数据写「未找到公开数据」。

## 0. 一句话定位

Zed 是一个用 **Rust** 编写、以「快」(GPU 加速渲染、原生性能)著称的**开源代码编辑器**,近两年重心转向 **AI 原生**:内置 Agent Panel、并行 agent,并且是**开放的 Agent Client Protocol(ACP)**的发起方——ACP 让任意外部 CLI agent(Claude、Codex、Gemini CLI 等)以子进程形式挂接进编辑器。

- **出品方**:Zed Industries, Inc.(营利公司)。创始人 Nathan Sobo,原 Atom 团队成员;Zed 亦出自 Atom 与 Tree-sitter 的作者团队。
- **许可**:多许可。编辑器主体 **GPL-3.0-or-later**;服务端组件 **AGPL**;打算被复用的组件(如 GUI 框架 **GPUI**)**Apache-2.0**。ACP 协议与 SDK 为 **Apache-2.0**。编辑预测模型 **Zeta/Zeta2** 为开放权重(open-weight)、开放数据。(GitHub 仓库 license 字段显示 `NOASSERTION`,即多许可混合,与官方说明一致。)
- **2026 年状态**:**活跃**。2024 年 1 月开源;2025 年 8 月完成 Sequoia Capital 领投的 **3200 万美元 A 轮**;**2026 年 4 月发布 1.0**;快照期(2026-07)最新 stable 约 **v1.9.0**。未改名、未被收购、未停更。
  - 值得记的分叉信号:2026 年 3 月有开发者 Kristoffer Grönlund 基于对 Zed AI 方向与条款的顾虑,创建了移除「AI 与 chat 功能」的分叉 **Gram**。

## 1. 解决什么问题 / 技术栈定位

Zed 要解决的是「**高性能编辑器 + AI agent 的深度集成**」:把 agent 的多文件编辑、代码库上下文、审阅工具**原生**嵌入编辑器,而不是靠终端里贴 escape code 或外挂插件。

**在 agent 技术栈里的定位——它跨了两层**:

1. **Agent Harness / 宿主(host / client)**:Zed 本身是 harness。它托管 thread、渲染 diff、管理工具权限、做上下文/记忆管理、驱动人在环审阅。既服务于「Zed Agent」(第一方 agent),也作为 ACP **client** 承载「External Agents」(第三方 agent)。
2. **互操作协议层(基础设施)**:Zed 发起并维护 **ACP**,是「agent ↔ 编辑器」之间的标准接口——类比 LSP 之于语言服务、MCP 之于工具。这一层的价值是把 agent 的 loop 与编辑器的 UI **解耦**。

**与底层 LLM 的关系**:Zed 不训练前沿对话/编码大模型,是「模型消费方 + harness」。

- **Zed Agent**(第一方):通过 LLM Providers 使用模型——Zed 托管模型、用户自带 provider API key(Anthropic / OpenAI / Google 等)、订阅、gateway、以及本地模型(如 Ollama / LM Studio;推断为 OpenAI 兼容端点,具体清单以官方 LLM Providers 文档为准)。
- **External Agents**(ACP):模型选择/计费/鉴权归**外部 agent 自己**所有,Zed 不碰。
- **唯一自研模型**:**Zeta / Zeta2**——用于 keystroke 粒度的 **Edit Prediction**(下一步编辑预测),开放权重、上 Hugging Face,官方称 Zeta2 接受率比 Zeta1 高约 30%,已成所有用户默认。注意:Zeta 是补全/预测模型,**不是** Agent Panel 的对话推理模型。

**商业分层**(2026):Free(每月 2,000 次 Zeta 预测)/ Pro($10/月,无限编辑预测 + Zed 托管 AI 模型 + token credits)/ Business(组织层,管控 + 统一计费)。

## 2. 架构与核心组件(点名真实构件)

以下构件名来自 Zed 仓库结构与 DeepWiki 对源码的索引(见来源),供讲课时点名:

- **Agent Panel**:agent 交互主界面(命令面板 `agent: new thread` 或状态栏 ✨ 打开)。承载消息提交、流式回复、diff 审阅、following。
- **`AcpThread`(entity)**:面向 UI 的 thread 表示,管理**回合制**(turn-based)状态与消息列表 `entries`;通过 `handle_session_update` 接收协议更新。
- **`AgentConnection`(trait)**:抽象接口,定义会话生命周期与交互方法(new/load/resume/prompt/cancel/close_session、`model_selector`、`session_list` 等能力)。
- **`Session`(struct)**:内部把 `Thread` entity 与协议 handler 配对,带 `ref_count`。
- **消息/流式更新类型**:`TextChunk`(追加流式文本)、`Thought`(记录 reasoning)、`ToolCall`(发起工具执行)、`Stop`(结束回合、结算 token)——分别由 `handle_text_chunk` / `handle_thought_chunk` / `handle_tool_call` / `handle_stop` 处理。
- **传输层**:Zed 作 **JSON-RPC client**,用 `ShellBuilder` + `Stdio::piped()` 把外部 agent 拉起为**子 OS 进程**,捕获 stdin/stdout/stderr;`AcpDebugMessage::parse` 解析行为 JSON-RPC;`AcpDebugLog`(上限 2000 条)记录全部流量供诊断(`dev: open acp logs`)。
- **工具层**:内置工具(代码库搜索、文件编辑、跑终端命令等)+ **MCP Servers**(外部工具)。工具可用性由 **Agent Profiles** 决定;调用受 **Tool Permissions** 门控。
- **权限/沙箱框架**:粒度 `AllowOnce` / `AllowThread` / `AllowAlways` / `Deny`,由 `SandboxingFeatureFlag` 提供沙箱控制;取消返回 `"Tool canceled by user"`。
- **子 agent 层**:`SubagentContext`(带 `parent_thread_id`、`depth`)、`SpawnAgentTool`、`ThreadEnvironment` trait(`create_subagent()` / `resume_subagent()`)、`SubagentHandle` trait(`id()` / `send()` / `num_entries()`)、`ThreadStore`(把带 `parent_session_id` 的子 agent 从主列表过滤掉)。**`MAX_SUBAGENT_DEPTH = 1`**——层级刻意只允许一层,子 agent 不能再生子 agent。
- **审阅/记忆构件**:Checkpoint(每次编辑可 Restore Checkpoint 回滚)、Review Changes(多 buffer 审阅 tab)、自动/手动 Compaction(`/compact`、New From Summary)、Follow mode(crosshair 跟随 agent 逐文件跳转)。
- **模型**:Zeta/Zeta2(编辑预测,独立于 agent 对话模型)。

## 3. 一步步怎么运转(控制/编排回路)—— 本节最重要

Zed 有**两条**回路,讲课时要分清:A) 第一方 Zed Agent;B) 外部 ACP agent。

### A. 第一方 Zed Agent 回路

1. **发起**:用户在 Agent Panel 输入 prompt(可编辑再提交)。用 `@`-mention 显式注入上下文:文件、目录、符号、之前的 thread、Skills、诊断、分支 diff、URL;也可用选区/图片作上下文。选中的 **Agent Profile** 决定这一 thread 能用哪些内置工具 + MCP 工具。
2. **组装 & 发模型**:Zed 把消息历史 + 上下文 + 工具 schema 交给所选 LLM provider 的模型。
3. **流式回合(turn)**:模型流式回吐;文本增量渲染,reasoning 单列显示。
4. **工具调用**:模型请求工具(搜代码、编辑文件、跑终端命令……)→ 命中 **Tool Permissions** 门控(allow/deny/confirm,含 AllowOnce/AllowThread/AllowAlways)→ 执行 → 结果回灌模型,回合继续。
5. **编辑落地 + 人在环审阅**:每次编辑生成一个 **Checkpoint**(可 Restore 回滚)。改动汇总到 **Review Changes** 的多 buffer tab,用户可**逐 hunk**或整体 accept/reject;开 `agent.single_file_review` 则在单文件内联 diff。**Follow mode** 让编辑器跟着 agent 触及的文件跳转。
6. **回合边界与队列**:回合结束用 `Stop` 收尾并结算 token。生成中排队的消息在**下一个回合边界**发送。
7. **上下文/记忆管理(贯穿全程)**:token 用量显示在 profile selector 旁;接近阈值时**自动 compaction**(摘要早期消息),也可手动 `/compact` 或 New From Summary 压缩长会话。80,000 token 以下的模型接近上限会告警。
8. **并行/委派**:一个 window 内可跑**多 agent、一 thread 一 agent**;主 thread 可用 `SpawnAgentTool` 派生子 agent(深度上限 1)并行处理子任务。

### B. 外部 ACP agent 回路(以 Gemini CLI / Claude Agent 为例)

1. **拉起子进程**:Zed 作 ACP **client**,把外部 agent(如 `gemini`)当**子进程**用管道 I/O 拉起,双方走 **JSON-RPC**(不是终端 escape code)。用户从 **ACP Registry**(Zed 内)或自定义 `agent_servers` 配置安装/指定。
2. **握手**:`initialize`(协议握手 + 能力协商,当前 stable 协议 version 1)。
3. **建会话**:`session/new`(`new_session`)建新会话;`load_session` 回放历史 / `resume_session` 不回放直接接上。
4. **发 prompt**:`session/prompt` 把用户输入送给外部 agent 进程。
5. **流式更新**:外部 agent 通过 `session/update` 回吐 —— TextChunk / Thought / ToolCall。**注意职责切分**:外部 agent **自己拥有** runtime、鉴权、模型选择、工具、native 配置与 skill/instruction 系统;**Zed 只负责** thread UI、会话历史、ACP 消息路由、可选的 MCP server 转发、以及工具权限边界。
6. **编辑渲染 & 审阅**:agent 提出的改动由 Zed 渲染到带**语法高亮 + LSP** 的多 buffer,用户实时观察并**审阅后再 accept**。官方强调外部 agent 路径下「nothing touches our servers」——代码不经 Zed 服务器。
7. **结束/取消**:`Stop` 结束回合结算 token;`cancel` 中止;`close_session` 释放资源。全程 JSON-RPC 流量落 `AcpDebugLog`(`dev: open acp logs` 可查)。

## 4. Harness 层设计要点

- **上下文/记忆管理**:显式(`@`-mention 各类实体 + 选区/图片)+ 隐式(自动 compaction 摘要 + token 阈值告警 + New From Summary)。跨 thread 无统一「今天所有工具调用」审计日志(社区讨论指出的现状缺口)。
- **工具接口**:内置工具 + **MCP** 外部工具;由 **Agent Profile** 决定可见工具集,由 **Tool Permissions** 门控执行(4 档 allow/deny)。部分模型不支持某 MCP 工具时以图标提示。
- **规划**:Zed **不内置**固定「planner」模块;规划由所选 LLM(或外部 agent)自行完成。社区里常见「orchestrator(如 Claude Sonnet)+ 专用 subagent」的编排模式,但那是用户拼的,非框架强制。
- **多 agent 交接**:两种形态——(1) **并行 agent**:一 window 多 thread、一 thread 一 agent,git **worktree** 做隔离(可选);(2) **子 agent 委派**:`SpawnAgentTool` 派生,`MAX_SUBAGENT_DEPTH = 1`(只允许一层,防递归爆炸),子 agent 继承父项目上下文但独立消息历史/工具状态。
- **人在环**:Checkpoint 回滚 + 多 buffer 逐 hunk 审阅 + Follow mode 跟随 + 工具调用确认门控——审阅/否决是一等公民。
- **沙箱**:`SandboxingFeatureFlag` + 4 档权限;快照期沙箱能力仍在演进(feature flag 命名暗示)。**注意**:并行 agent 会同时对同一文件系统 / git remote / LLM provider 落 tool call,官方讨论明确点出这带来的并发与成本风险。

## 5. 独特设计取舍(为什么有人选它)

- **性能优先**:Rust + 自研 GPU 加速 GUI 框架 **GPUI**;主打「code at the speed of thought」。与 Electron 系(VS Code / 早期 Cursor)形成对比。
- **开放协议而非围墙**:发起 **ACP**(Apache-2.0),把 agent 与编辑器解耦,让 Claude/Codex/Gemini CLI 等**任意** ACP agent 挂进来——JetBrains 亦与 Zed 合作接入 ACP。取舍:Zed 放弃「独占一个自研 agent」的护城河,换来生态互操作。
- **开放模型血统**:Zeta/Zeta2 开放权重/开放数据、可自托管/微调——与闭源补全形成差异化。
- **人在环审阅深度**:多 buffer 审阅 + checkpoint + following 是围绕「让人看得懂、控得住 agent」设计,而非全自动黑箱。
- **隐私姿态**:外部 agent 路径「不经 Zed 服务器」。
- **取舍代价**:并行/子 agent 的成本与并发写冲突需用户自管;无跨 thread 统一审计;规划靠模型自身;沙箱仍在成熟中。

## 6. 采用度信号

- **GitHub `zed-industries/zed`**:约 **86,449 stars / 9,358 forks**(GitHub API,2026-07-04 取)。语言 Rust(约 97%)。约 38,823 commits、1,200+ releases。
- **ACP `zed-industries/agent-client-protocol`**:约 **3.6k stars / 289 forks**(WebFetch 于 2026-07 读取;GitHub API 未鉴权调用未返回精确数,以 3.6k 为近似)。SDK 覆盖 Rust / TypeScript / Python / Java / Kotlin;schema 最新 v1.17.0(2026-06-29)。
- **知名接入方/生态**:Claude(Agent)、OpenAI Codex、Google Gemini CLI、GitHub Copilot、OpenCode、Cursor、Devin、Cline、OpenHands 等 50+ agent;编辑器侧 JetBrains IDEs、Neovim、Emacs、Obsidian 等参与 ACP(数字来自 zed.dev/acp 页面自述,未逐一独立核实)。
- **资金/里程碑**:2025-08 Sequoia 领投 3200 万美元 A 轮;2026-01-28 上线 **ACP Registry**;2026-04 发布 1.0;2026-04-22 v0.233.5 stable 上线**并行 agent**(2026-04-08 进 Preview)。
- **势头**:2025-05 大改 Agent Panel;2025-08-27 发布「Bring Your Own Agent(Gemini CLI)」。整体处于**高速上升期**。

## 未能独立核实 / 待补

- ACP 精确 star 数(仅 WebFetch 近似 3.6k,未鉴权 API 调用未返回)。
- Zed Agent 支持的 LLM provider 精确清单(overview 页未逐条列出,需查 LLM Providers 专页)。
- zed.dev/acp 自述的「50+ agents / 12+ editors」为页面营销口径,未逐一独立核实。
- 并行 agent 是否有硬性并发上限:官方讨论称未指定固定上限。

## 来源(一手为主)

1. Zed 官方 Agent Panel 文档 — https://zed.dev/docs/ai/agent-panel
2. Zed 官方 External Agents 文档 — https://zed.dev/docs/ai/external-agents
3. Zed ACP 主页(定义/生态/许可)— https://zed.dev/acp
4. ACP 规范仓库(JSON-RPC 方法 / SDK / Apache-2.0)— https://github.com/zed-industries/agent-client-protocol
5. Zed 博客:ACP Registry 上线(2026-01-28)— https://zed.dev/blog/acp-registry
6. Zed 博客:Bring Your Own Agent(Gemini CLI,2025-08-27)— https://zed.dev/blog/bring-your-own-agent-to-zed
7. DeepWiki 源码索引:ACP 协议与连接 / 子 agent 层级 — https://deepwiki.com/zed-industries/zed/8.2-acp-protocol-and-connection · https://deepwiki.com/zed-industries/zed/8.6-subagent-and-thread-hierarchy
8. Zed 主仓库 + Wikipedia(公司/许可/资金/里程碑)— https://github.com/zed-industries/zed · https://en.wikipedia.org/wiki/Zed_(text_editor)
