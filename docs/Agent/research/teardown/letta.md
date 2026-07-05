# Letta (MemGPT) 拆解简报

> 快照时间：2026 年 7 月。除非特别标注，均以官方一手资料（GitHub、docs.letta.com、letta.com/blog、MemGPT 论文）为准。凡估算/未证实数据均已显式标注。

---

## 1. 一句话定位 / 出身 / 许可 / 2026 状态

- **一句话定位**：Letta 是一个"有状态智能体（stateful agents）"的开源平台/运行时——把无状态的 LLM 变成拥有持久记忆、能随时间自我编辑记忆并"学习"的智能体。官方 tagline："Platform for stateful agents: AI with advanced memory that can learn and self-improve over time."
- **出身**：源自 UC Berkeley 的 **MemGPT** 论文（Packer et al., *MemGPT: Towards LLMs as Operating Systems*, arXiv:2310.08560，2023-10）。2024-09-23 论文项目正式并入 **Letta**（公司），MemGPT 从此成为 Letta 内的一种智能体设计范式，仓库/框架更名为 Letta（"Letta, formerly MemGPT"）。
- **公司 & 融资**：Letta 是 UC Berkeley（BAIR）孵化的创业公司，2024-09-23 出隐身并宣布完成 **$10M 种子轮**（约 **$70M 投后估值**），由 **Felicis** 领投，Sunflower Capital、Essence VC 及天使（Jeff Dean、Clem Delangue 等）参投。创始人为原 MemGPT 论文作者（Charles Packer、Sarah Wooders）。
- **许可**：**Apache-2.0**（`letta-ai/letta` 主仓库）。
- **2026 状态：活跃，且发生产品重心迁移**。
  - 核心开源框架（`letta-ai/letta`，即 Letta server / Agents API）仍在维护，最新 release **v0.16.8（2026-05-14）**（该仓库现被描述为承载"legacy Letta server"，主开发已迁往新的 Letta Agent 仓库）。
  - **Letta Code**（`letta-ai/letta-code`）于 **2026-04-06** 发布：面向个人的"有状态智能体"harness（CLI + 桌面 App，覆盖 macOS/Windows/Linux），定位为"更像人而非工具"的个性化智能体（有记忆、身份、经验感），可从既有代码或 Claude Code / Codex 的历史会话 `/init` 初始化记忆。
  - 独立的 **LettaBot** 据二手资料称已于 **2026-05 归档并并入 Letta Code（作为 Channels）**（*来源为二手汇总，未在官方博客逐条核实，标注为不确定*）。
  - 未被收购、未被弃用；相反它是"收购方"——2024-09 吸收了 MemGPT 项目本身。

---

## 2. 解决什么问题 / 在栈里的位置

**问题**：原生 LLM 是无状态的——上下文窗口一满，早期信息就被截断丢弃，跨会话无记忆。Letta 要解决"如何让智能体在超出上下文窗口的时间跨度上持续记住用户、事实与自身状态并自我改进"。

**在栈中的位置**：Letta **同时是 harness、运行时和框架**，不是单纯的库：

- 它是一个**有状态智能体运行时（stateful agent runtime）**：一个 **FastAPI REST 服务器**（默认端口 8283），把所有智能体状态——记忆、用户消息、推理、工具调用——**持久化到数据库**（PostgreSQL + pgvector，或本地 SQLite）。状态即使被逐出上下文窗口也永不丢失。
- 它是一个**框架/SDK**：Python/TypeScript SDK + REST API，供开发者嵌入应用；ADE（Agent Development Environment）是官方 GUI。
- 它现在也是一个**面向终端用户的产品**：Letta Code（桌面 App / CLI）。
- **与底层 LLM 的关系**：完全 **model-agnostic**。通过 `LLMClient` 工厂适配 OpenAI、Anthropic、Google Gemini 及 10+ 提供商；官方推荐 Anthropic / OpenAI / zAI 模型。关键卖点：智能体的记忆与身份**与模型解耦**，可在会话中途切换模型而保留完整上下文、记忆、人格。Letta 坐在 LLM 提供商**之上**，自己不训练模型。

核心哲学是 **"LLM as an Operating System / LLM-OS"**：把上下文窗口当作 RAM（物理内存），把外部存储当作虚拟内存/磁盘，由一套上下文管理系统在"virtual context"（全部可用数据）与"physical context"（真实上下文窗口）之间搬运数据——直接类比操作系统的分层虚拟内存。

---

## 3. 架构与核心组件（真实可名状的部件）

自底向上：

- **持久化层**：SQLAlchemy ORM + PostgreSQL/SQLite，`pgvector` 提供向量相似度检索。`DatabaseRegistry` 管理异步会话与重连；`LETTA_PG_URI` 配置 PG。所有 message / block / passage（archival 条目）/ run 都是数据库实体。
- **LLM 提供商层**：`LLMClient` 工厂，为每个 provider 生成统一接口的客户端。
- **服务器 / 编排层**：**FastAPI** 应用（`/v1/*` 路由：agents、tools、blocks、folders、messages、runs）+ 中间件（如 RequestIdMiddleware）。核心协调者是 **`SyncServer`**——API 与领域逻辑之间的编排层，管理服务依赖。
- **智能体执行层**：`LettaAgent`（及新的 v2/v3 实现）。`AgentType` 枚举定义支持的架构（v2、v3、voice 等）。智能体持有结构化 **memory blocks**（persona / human / 自定义）。
- **记忆子系统（三层，见 §5）**：Core memory（blocks）/ Recall memory（对话历史）/ Archival memory（向量库 passages）。
- **消息 / 步（step）模型**：Message Schemas + Message Conversion Pipeline，在内部表示与各 provider 格式间转换；"step"是一次 LLM 调用 + 一次工具执行的循环单元。
- **上下文编译**：Context Window Management + Summarization，负责把 memory blocks、记忆统计、工具 schema 拼进上下文，并在超限时截断/摘要。
- **工具层**：内置工具 + 自定义 Python 工具 + 工具执行沙箱（E2B / Modal / 本地）+ **Tool Rules** 约束系统 + MCP 支持。
- **前端 / 接入**：ADE（GUI，现已迁入 chat.letta.com 与桌面 App，旧版 ADE 已弃用）、Letta Code CLI、桌面 App、Slack 集成、Agent SDK。

---

## 4. 一步步：一个请求如何流经控制循环（最重要）

Letta 的智能体本质定义（官方 v1 博客）："an agent is a loop that calls an LLM and executes a tool." 每一轮（step）智能体必须三选一：**调用工具 / 发送消息、推理、终止**。

一个用户请求的完整流转：

1. **入站**：请求打到 FastAPI（如 `POST /v1/agents/{id}/messages`），经 `SyncServer` 定位/加载该 agent 的持久化状态（memory blocks、最近消息、agent 配置）。
2. **上下文编译（context compilation）**：服务器把系统提示拼装出来——
   - 基础 system prompt + 当前所有 in-context **memory blocks**（persona、human 及自定义块，以 XML-like 结构 prepend，"always visible, no retrieval needed"）；
   - recall / archival 的统计元数据（有多少历史、多少条 archival passage）；
   - 全部可用工具的 JSON schema（name、description、参数）；
   - 最近的对话消息缓冲。
3. **LLM 调用**：编译好的上下文发给底层模型。模型输出 = 推理（reasoning）+ 一个"动作"。在 MemGPT/v1 旧设计里，**每个动作都是工具调用**（包括回复用户，走特殊的 `send_message` 工具）。
4. **动作分派**：
   - 若是**记忆编辑工具**（如 `core_memory_replace`、`archival_memory_insert`）→ 修改 blocks / 写入向量库，落库。
   - 若是**检索工具**（`archival_memory_search`、`conversation_search`）→ 查向量库/历史，结果作为工具返回值注入下一轮上下文。
   - 若是**普通工具 / 代码执行**（`run_code`、`web_search`、自定义 Python）→ 在沙箱执行，返回值回注。
   - 若是 `send_message`（旧）/ 原生 assistant message（v1 新）→ 把内容发给用户。
5. **是否继续（heartbeat 机制，MemGPT 版）**：MemGPT 通过工具调用里的控制参数决定循环是否继续：`request_heartbeat=True` 表示"我还想再执行一轮"（例如刚检索完、还要接着回答）；**默认 `request_heartbeat=False`——即默认终止而非默认继续**。这让"多步工具链"成为显式行为。
6. **落库**：每个 step 的推理、工具调用、结果、消息全部写入数据库——这是"有状态"的物理基础。
7. **循环**：只要上一步请求了 heartbeat（或工具规则要求继续），回到第 2 步重新编译上下文再调 LLM，直到智能体终止本轮。
8. **上下文溢出处理**：当消息缓冲逼近上下文上限，触发摘要/逐出（summarization / truncation）；被逐出的原文仍在数据库中，可经 `conversation_search`（recall）重新捞回。

**v1（2026）对循环的重构**（官方 `letta-v1-agent` 博客）：
- **弃用 heartbeat 与 `send_message` 工具**，改用模型**原生 reasoning + 原生 assistant message**。理由是新一代模型已把"agentic 控制循环"的理解内化，不再需要用工具调用去显式编排控制流。
- **代价（tradeoff）**：因为推理发生在闭源 API 的不透明、不可变区域，开发者**失去了修改原生推理状态、或把推理轨迹跨模型传递的能力**。循环形态不变（仍是 loop），但控制权从"框架显式编排"转移到"依赖模型能力"。

---

## 5. Harness 级设计

**上下文 / 记忆管理（核心卖点，三层 OS 类比）**：
- **Core memory（≈RAM）**：由 **memory blocks** 组成，常驻上下文、始终可见、无需检索。每个 block 有 `label`（如 persona、human）、`description`（关键——智能体靠它判断该块用途）、`value`、`limit`（字符上限）。可设 `read_only=True` 禁止智能体改写。
- **Recall memory（≈磁盘缓存）**：完整对话历史，存库、按需搜索（`conversation_search`）。上下文逐出的消息落在这里可再捞回。
- **Archival memory（≈冷存储）**：外部向量库（pgvector 的 passages），智能体显式 `archival_memory_insert` 写入、`archival_memory_search` 语义检索。

**自我编辑记忆（self-editing memory）**：智能体通过内置工具改写自己的记忆——`core_memory_append` / `core_memory_replace`（旧）、`memory_insert` / `memory_replace`、`archival_memory_insert` / `archival_memory_search`、`conversation_search`。这是 MemGPT 论文的核心创新：让 LLM 用函数调用管理自己的分层记忆。

**共享记忆 / 多智能体**：一个 memory block 可**同时挂载到多个智能体**（通过 `block_ids`），实现跨智能体的共享内存/共享状态。

**Sleep-time compute / 后台记忆智能体**（v0.7.0 引入）：
- 双智能体结构：**primary agent** 处理用户交互；独立的 **sleep-time agent** 在后台异步管理记忆。sleep-time 智能体能同时管理 primary 的 in-context 记忆和自己的 in-context 记忆。
- 作用：把"raw context"转化为"learned context"，做记忆整合/压缩/归档维护，不打断主循环。相较 MemGPT 的增量式更新，sleep-time 能持续把记忆重写得"clean, concise, detailed"。
- 因 model-agnostic，可给两者配不同模型（主用快模型如 gpt-4o-mini，sleep-time 用更强更慢的模型如 gpt-4.1 / Sonnet 3.7）。
- 官方称在 AIME、GSM 等数学基准上取得"Pareto improvement"，把算力从高延迟的用户交互期挪到系统空闲期而不损失质量（*未见具体百分比*）。Letta Code 里对应"memory subagents periodically review sessions to rewrite context and refine memory"。

**工具接口**：自定义工具是**服务端执行的 Python 函数**（区别于本地运行的 client tools）；内置工具含 `web_search`（Exa 驱动）、`fetch_webpage`、`run_code`（E2B 代码解释器，Python + 191+ 个预装包，另支持 JS/TS/R/Java）。支持 **MCP**。工具 schema（name/description/args）注入上下文供模型选择。

**规划 / 循环约束（Tool Rules）**：用 `tool_rules` 对工具序列施加**图状约束**（constraint graph），把默认无约束的循环变成受控状态机：
- `InitToolRule(tool_name=...)`：该工具必须首先被调用。
- `TerminalToolRule(tool_name=...)`：调用即终止执行。
- `ChildToolRule(tool_name=..., children=[...])`：调用后必须接 children 中之一。
- （另有 ParentToolRule、ConditionalToolRule、MaxCountPerStep 等，*具体清单以官方 tool-rules 文档为准*）。
- 限制：除 `TerminalToolRule` 外，其余规则依赖 provider 的 **structured outputs**，当前主要是 OpenAI 的 gpt-4o / gpt-4o-mini 支持。

**Human-in-the-loop / 可观测性**：ADE 提供对智能体运行每一环的可视化——上下文窗口全部组成（memory、state、prompt）+ 工具执行轨迹，用于调试与人工介入。

**沙箱**：工具在隔离环境执行——**E2B**（需 `E2B_API_KEY`）、**Modal**、或本地；Letta Cloud 开箱即用。

**多智能体 handoff**：通过共享 memory blocks + subagents（skills）+ 多智能体消息传递实现；sleep-time 是一种特化的后台多智能体模式。

**可移植性（Agent File / .af）**：开源 `.af` 格式（2025-04 发布），把有状态智能体的全部组件——system prompt、可编辑记忆、工具（代码 + schema）、LLM 配置——序列化成人类可读 JSON，实现智能体的分享、checkpoint、版本控制，甚至跨框架迁移。

---

## 6. 独特设计选择与取舍（vs 同类）

- **"记忆即一等公民 / 有状态运行时"**：与 LangGraph、AutoGen、CrewAI 等主要做**编排**的框架不同，Letta 的差异化在于把**持久记忆 + 状态数据库**做成运行时核心——状态存在服务端 DB 而非应用代码里。这也区别于 Mem0 这类"记忆层库"：Letta 是完整运行时，Mem0 更像插件式记忆存储。
- **LLM-as-OS / 自我编辑记忆**：让模型用工具调用**自主管理分层记忆**，是 MemGPT 论文原创、Letta 商业化的招牌范式。
- **模型解耦 & 会话中途换模型**：记忆/身份不绑定 provider，可中途切换模型且保留全部上下文——多数 harness 做不到。
- **Sleep-time compute**：把"离线思考/记忆整合"产品化，是较独特的方向。
- **主要取舍**：
  - v1 弃用 heartbeat/`send_message` 换取"用模型原生控制循环"，代价是**失去对推理状态的可编程控制**（闭源 API 推理不透明、不可变、不可跨模型传递）。
  - 有状态 + DB 依赖（PostgreSQL/pgvector）带来**部署重量**，比无状态库更复杂。
  - Tool Rules 的完整能力受限于 provider 的 structured outputs 支持，跨模型不一致。
  - 2026 产品重心向 Letta Code（个人化 agent 产品）迁移，开源 server 被标注为 "legacy"，社区对开源框架的长期投入方向存在不确定性。

---

## 7. 采纳信号

- **GitHub stars**：`letta-ai/letta` **约 23.6k stars、2.5k forks、139 watchers**（截至 2026-07 抓取时）。
- **贡献者**："over a hundred contributors from around the world."
- **Agent File（.af）**：截至相关资料"nearly 1,000 GitHub stars"，被官方定位为有状态智能体序列化的新事实标准（*"事实标准"为官方/二手表述，非独立验证*）。
- **生产采用**：AWS 官方博客记载 Letta 用 **Amazon Aurora PostgreSQL** 构建生产级智能体、可自托管于用户 VPC；提供 Railway 一键部署模板。
- **教育/背书**：与 **DeepLearning.AI** 合作开设课程《LLMs as Operating Systems: Agent Memory》。天使投资含 Jeff Dean、Clem Delangue 等业界人物。
- **动能**：2025→2026 从纯开源框架扩展到 Cloud + ADE + 桌面 App + Letta Code CLI，产品线明显扩张；同时开源主仓库被标注为"legacy server"，显示重心正在向新一代 agent 产品迁移。
- **ARR（二手，未证实）**：某第三方（getlatka）列 "$1.4M ARR"——*来源可靠性低，标注为未证实*。

---

## 8. 来源

- [letta-ai/letta（GitHub 主仓库，README / 星标 / license / v0.16.8）](https://github.com/letta-ai/letta)
- [Rearchitecting Letta's Agent Loop: Lessons from ReAct, MemGPT, & Claude Code（官方博客，v1 循环）](https://www.letta.com/blog/letta-v1-agent)
- [Sleep-time Compute（官方博客，后台记忆智能体）](https://www.letta.com/blog/sleep-time-compute/)
- [Introducing the Letta Code App（官方博客，2026-04 发布）](https://www.letta.com/blog/introducing-the-letta-code-app/)
- [MemGPT: Towards LLMs as Operating Systems（arXiv:2310.08560，原始论文）](https://arxiv.org/abs/2310.08560)
- [Memory Blocks / Tool Rules / Architectures（Letta 官方文档 docs.letta.com）](https://docs.letta.com/guides/agents/tool-rules)
- [Agent File (.af)（letta-ai/agent-file，可移植格式）](https://github.com/letta-ai/agent-file)
- [How Letta builds production-ready AI agents with Amazon Aurora PostgreSQL（AWS 官方博客，架构/生产采用）](https://aws.amazon.com/blogs/database/how-letta-builds-production-ready-ai-agents-with-amazon-aurora-postgresql/)
- [Letta system architecture（DeepWiki，SyncServer / LettaAgent / 持久化层）](https://deepwiki.com/letta-ai/letta)

---

## 核验记录

> 2026-07 对本简报最高风险的数字、日期、版本、归属、超级词与架构细节做了独立核验（WebSearch/WebFetch）。逐条结论：

**已核实无误（保留原文）：**
- **融资**：$10M 种子轮、Felicis 领投、Sunflower Capital / Essence VC / Jeff Dean / Clem Delangue 参投 — 由 PR Newswire、TechCrunch（2024-09-23）证实。
- **MemGPT→Letta 时点**：2024-09-23 出隐身同时改名，"MemGPT = 论文里的 agent 设计范式，Letta = 框架/公司" — 官方博客 memgpt-and-letta 证实。
- **GitHub 指标**：`letta-ai/letta` 23.6k stars / 2.5k forks / 139 watchers、Apache-2.0 — 抓取 GitHub 仓库页证实。
- **版本**：最新 release v0.16.8（2026-05-14），changelog 为 "workflows update" + "use JSON instead of pickle for sandbox→server tool result transport"；仓库自述为 "legacy Letta server" — GitHub releases 页证实（注：GitHub 相对日期易被误读为 2025，实为 2026）。
- **Letta Code**：官方博客 2026-04-06 发布，覆盖 macOS/Windows/Linux，可 `/init` 从既有代码及 Claude Code / Codex 历史会话初始化记忆 — introducing-the-letta-code-app 证实。
- **Sleep-time compute**：v0.7.0 引入，双智能体结构，AIME/GSM 上 "without sacrificing performance quality"，主用 gpt-4o-mini、sleep-time 用 gpt-4.1 / Sonnet 3.7 — sleep-time-compute 博客证实。
- **Agent File (.af)**：2025-04-02 发布、"nearly 1,000 stars" — 官方博客/仓库证实。
- **端口 8283、Aurora PostgreSQL + pgvector、可自托管于自有 VPC** — AWS 官方数据库博客证实（含 "Uvicorn running on http://0.0.0.0:8283"）。
- **v1 agent loop**："agent is a loop that calls an LLM and executes a tool"（含 Simon Willison 框定）、弃用 heartbeat 与 `send_message`、改用原生 reasoning + 原生 assistant message、代价是原生推理不透明/不可变/不可跨模型传递 — letta-v1-agent 博客证实。
- **工具层**：run_code 用 E2B、web_search "powered by Exa"、支持 Python/JS/TS/R/Java — docs.letta.com/guides/agents/run-code 证实。
- **DeepLearning.AI 课程** "LLMs as Operating Systems: Agent Memory"，由 Packer & Wooders 主讲 — deeplearning.ai 证实。
- **"over a hundred contributors"** — 系官方 README 原话，非独立计数。

**已修正：**
- §1 融资行：删去无源的 "YC 系" 表述（一手资料一致称其为 "Berkeley AI Research Lab spinout / UC Berkeley 创业公司"，未见 YC 佐证），改为 "UC Berkeley（BAIR）孵化"，并补入已证实的 "~$70M 投后估值"（PR Newswire / TradedVC）。
- §5 工具接口：预装包数由 "191" 精确为 "191+"（docs 原文为 "191+ pre-installed packages"）。

**核对但维持"未证实"标注（未删，因原文已诚实标注）：**
- getlatka "$1.4M ARR" 确实存在，但同源自相矛盾（列 "$4.3M 估值 / bootstrapped 无外部融资"，与已证实的 $10M/Felicis 冲突），可靠性低的标注成立。
- LettaBot 于 2026-05 归档并入 Letta Code Channels — 未在官方博客逐条证实，保留原有"不确定"标注。
