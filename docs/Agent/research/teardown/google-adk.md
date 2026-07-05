# Google Agent Development Kit (ADK) + A2A 协议 —— 拆解简报

> 快照时间：2026 年年中。本文覆盖 ADK 框架本身，以及与其配套的 A2A（Agent2Agent）跨 agent 通信协议。

---

## 1. 一句话定位 / 出品方 / 许可 / 状态

**一句话定位**：ADK 是 Google 出品的**开源、代码优先（code-first）的 agent 开发框架**——用来构建、评估、部署单 agent 与多 agent 系统；它不是模型，也不是终端产品，而是介于「LLM 提供方」和「上层 agent 应用」之间的**编排框架 + 运行时（runtime）**。

- **出品方**：Google（Google Cloud），在 **Google Cloud NEXT 2025（2025 年 4 月 9 日）**发布。它是 Google 内部 Agentspace、Customer Engagement Suite（CES）等产品所用的**同一套框架**（官方博客明确说明）。
- **许可**：**Apache 2.0**（ADK 各语言仓库与 A2A 协议均为 Apache 2.0）。
- **2026 年状态**：**活跃且持续大版本演进**。
  - `google/adk-python` 已迭代到 **2.x**：**2.0.0 GA 于 2026-05-19**，README 显示当前版本 **2.3.0（2026-06-18）**，共 68 个 release、约 3,157 次 main 提交。
  - `google/adk-go` **2.0 GA 于 2026-06-30**。截至该快照，**Workflow Runtime（2.0 新架构）目前只在 Python 与 Go SDK 上 GA**；Java/TypeScript/Kotlin 版本尚未跟进到 2.0（需注意）。
  - **未被弃用、未被收购、未改名**——ADK 仍是 Google 主推的 agent 框架，且已收敛为 Vertex AI「Gemini Enterprise Agent Platform」文档体系的一部分。

**重要提示（版本断代）**：ADK 存在**两代明显不同的架构**。1.x（2025 全年）是「层级式 agent 执行器 + Runner/事件循环」；2.0（2026-05 起）**彻底重构为 graph-based Workflow Runtime**，顶层 agent API 是**破坏性变更（breaking）**。教学时必须区分「你讲的是哪一代」。

---

## 2. 解决什么问题 / 在栈里的位置

**问题**：当应用从「单个 LLM 调用」演进到「多个专职 agent 协作、带工具、带状态、要能评估和上生产」时，出现新的工程难题——如何编排 agent、如何管理上下文与状态、如何在确定性代码与 LLM 自由推理之间取平衡、如何调试/评估/部署。ADK 的目标是**把 agent 全生命周期（Build → Interact → Evaluate → Deploy）标准化**。

**栈中的位置**（自下而上）：

```
LLM 提供方（Gemini / Vertex Model Garden / 经 LiteLLM 接 Anthropic、Meta、Mistral…）
        ↑ ADK 通过模型抽象层调用
ADK 框架/运行时（agent 定义、编排循环、工具层、Session/State/Memory、评估）
        ↑
你的 agent 应用（单 agent 或多 agent 系统）
        ↑ 可选：通过 A2A 协议 与其它厂商/框架的 agent 互通
Vertex AI Agent Engine（可选的托管运行时，负责 scale / 会话 / 内存，按算力+内存计费）
```

- ADK **本身与模型解耦**：原生对 Gemini 优化，但可经 Vertex Model Garden 或 **LiteLLM** 接第三方模型（Anthropic、Meta、Mistral、AI21 等）。
- **它是「框架 + harness」而非产品**：既提供 agent 抽象（框架），也提供事件循环/状态/内存/调试 UI（harness）。终端产品（Agentspace、CES）建在它之上。
- **与 A2A 的关系**：ADK 负责「一个进程内怎么搭 agent」；A2A 负责「跨进程/跨厂商的 agent 之间怎么对话」。两者互补，A2A 又与 Anthropic 的 **MCP 互补**（MCP 管 agent↔工具/上下文，A2A 管 agent↔agent）。

---

## 3. 架构与核心组件

### 3.1 ADK 1.x（2025，层级式执行器）——理解基础语义的关键
- **Agent 类型**：
  - `LlmAgent`（别名 `Agent`）：核心 agent，由 `name / model / instruction / tools` 定义，由 LLM 驱动决策。
  - **Workflow Agents（确定性编排）**：`SequentialAgent`（顺序）、`ParallelAgent`（并发）、`LoopAgent`（循环）——这些是**代码控制的确定性流程**，不靠 LLM 决定顺序。
  - `CustomAgent`：继承 `BaseAgent`，实现 `_run_async_impl` 自定义逻辑。
  - **多 agent 组合**：agent 可按**层级（hierarchy）**组合，父 agent 把子 agent 当「工具」或子节点调度；也支持 LLM 驱动的**动态路由（dynamic routing）**。
- **Runner**：单次用户调用（invocation）的中央协调器，串起 Session、Agent、Event。
- **Session / State / Memory**：三者分离——
  - **Session**：一次会话的历史（事件序列）。
  - **State**：键值状态，通过事件的 `state_delta` 提交，支持 session rewind/迁移。
  - **Memory**：跨会话的长期记忆，独立于 State。
- **Event**：结构化事件，是 agent、工具、回调之间通信的原子单位；事件携带 `EventActions`（含 `state_delta`）。
- **Tools**：`FunctionTool`（Python 函数）、**MCP 工具**、**OpenAPI 工具**，以及内置工具（Google Search、Code Execution）；支持工具鉴权。
- **Callbacks**：在 agent/模型/工具执行前后插入的异步钩子。
- **InvocationContext (`ctx`)**：贯穿一次调用的上下文对象。

### 3.2 ADK 2.0（2026，graph-based Workflow Runtime）——当前主线
- **Workflow Runtime**：把执行模型从「层级 agent 执行器」换成**基于图的执行引擎**。Agent、Tool、Function 都被当作图里的**节点（node）**，用**边（edge）**连成显式执行路径。原生支持：**routing、fan-out/fan-in、loop、retry、状态管理、动态节点、human-in-the-loop、嵌套 workflow**。
- **Task API**：结构化的 **agent→agent 委派**——支持 multi-turn task 模式、single-turn 受控输出、混合委派、HITL，以及「task agent 作为 workflow 节点」。
- **两大顶层类**：`Agent`（定义指令/工具/行为）与 `Workflow`（用节点+边编排 agent 与 task）。
- **确定性 + 自适应混合**：核心卖点是「把确定性代码与自适应 LLM 推理编织在一起」，用显式执行路径换可预测、可重放（replay-safe）的结果。
- **Event schema 变更**：新增 `node_info`、`output` 字段以追踪图状态与 workflow 输出（自定义会话存储需改 schema）。
- **破坏性变更要点**（教学避坑）：
  - 1.x 的 `Agent()` 构造签名变了；agent 需被包成/部署为 WorkflowRuntime 节点。
  - 1.x 的 `@tool` 装饰器被 `@WorkflowNode` 模式取代。
  - **存储不兼容**：2.0 存储不能用在 1.x 数据库上（Google 明确标注为「数据丢失」级别风险）。
  - **异常处理陷阱**：工具里若保留宽泛 `except Exception:` 会屏蔽框架的**自动重试**；`catch BaseException` 会误吞 `NodeInterruptedError`，破坏 **HITL 暂停**能力。

---

## 4. 逐步拆解：一次请求的控制/编排循环（最重要）

以 **1.x 事件循环（Event Loop）** 为主线讲——这是理解 ADK「Runner ↔ Agent 协作循环」的核心心智模型；2.0 在此之上换成图调度器（见文末对照）。

**核心机制：Runner 与 Agent 之间的「yield-暂停-恢复」协程循环。**

1. **初始化**：`Runner.run_async(...)` 收到用户 query → 调 `SessionService` 加载对应 **Session**，把用户 query 作为**第一个 Event** 追加进历史 → 准备 `InvocationContext (ctx)`。
2. **启动根 agent**：Runner 调用根 agent 的 `agent.run_async(ctx)`（例如一个 `LlmAgent`）。
3. **LLM 决策**：`LlmAgent` 判断需要信息 → 组装请求发给 LLM（Gemini 或经 LiteLLM 的第三方模型）。LLM「驱动决策」，决定**调哪个工具 / 任务是否完成**。
4. **产出事件并暂停**：agent 收到 LLM 返回的 `FunctionCall`，包成 `Event(author=..., content=Content(parts=[Part(function_call=...)]))`，用 **`yield`** 抛给 Runner——**agent 在 yield 处立即暂停执行**。
5. **Runner 记录 + 提交状态**：Runner 收到事件，交给 `SessionService` 写入历史；若事件带 `EventActions.state_delta`，**此刻才把状态变更永久提交到 Session**（「加入购物车 vs. 结账」的类比：只有 yield 出事件、Runner 提交后，状态才对其它 agent/工具可见）。这个「先提交后可见」保证了失败中断时的一致性。
6. **执行工具**：Runner/框架执行被请求的工具（FunctionTool / MCP / OpenAPI），拿到工具结果。
7. **恢复 agent**：Runner 通知暂停的 agent 继续，把工具结果作为新事件喂回；agent 基于**已提交的状态**继续下一轮 LLM 调用。
8. **循环**：3→7 反复进行——LLM 每轮决定「继续调工具」还是「完成」。
9. **终止**：当 agent 判断无需更多工具、任务完成，**yield 出最终 response 事件**，循环结束，Runner 把最终结果返回用户。

> 关键设计原则：**状态只有在 yield 出事件、被 Runner 提交后才持久化/可见**。直接改内存而不 yield 事件的状态是「未提交」的，中途失败会不一致。

**2.0 的对照**：不再是单根 agent 的递归/层级驱动，而是 **Workflow Runtime 按图调度节点**——按 edge 决定 routing/fan-out/fan-in/loop，每个节点（agent/tool/function）执行后由引擎决定下一跳；失败节点走**自动 retry**；遇到需要人类输入的节点抛 `NodeInterruptedError` **暂停整个 workflow（HITL）**，等人给输入后**可重放地**恢复。

---

## 5. Harness 级设计细节

- **上下文/内存管理**：ADK 强调「**不是把字符串一直拼到爆上下文窗口**」，而是主动管理上下文——**自动过滤无关事件、摘要旧对话轮、惰性加载 artifact、追踪 token 用量**。三层分工清晰：Session（本次历史）/ State（键值状态，事件驱动提交）/ Memory（跨会话长期记忆）。
- **工具接口**：统一为「工具」抽象——Python 函数工具、**MCP 工具**（接 MCP 生态）、**OpenAPI 工具**（用 OpenAPI 规范自动生成工具）、内置工具（Search、Code Execution），并支持工具级鉴权。
- **规划/编排**：两种范式并存——**确定性编排**（1.x 的 Sequential/Parallel/Loop；2.0 的图 workflow）与 **LLM 驱动的动态路由**。2.0 的核心哲学就是「确定性代码 + 自适应推理」混编。
- **多 agent 交接（handoff）**：1.x 靠层级组合（父 agent 调度子 agent，或把子 agent 当工具）；2.0 用 **Task API** 做结构化委派（多轮 task、受控单轮输出、混合模式）+ 协作式 workflow（coordinator 协调多个 subagent）。跨**厂商/框架**边界的交接则交给 **A2A 协议**。
- **Human-in-the-loop**：2.0 原生支持——workflow 节点可暂停等人输入（依赖 `NodeInterruptedError` 机制，可重放恢复）。
- **沙箱/安全**：内置 **Code Execution** 工具用于安全执行代码；部署到 **Vertex AI Agent Engine** 时由托管运行时提供隔离/伸缩。工具鉴权与 A2A 层的企业级认证补齐安全面（未找到 ADK 自带通用容器级沙箱的公开细节，标注为不确定）。
- **调试 UI**：`adk-web` 提供内置开发者 Web UI，配合 CLI 可本地跑/调 agent、看事件流。

---

## 6. 与同类的差异化设计与取舍

- **代码优先（code-first）**：不是低代码/拖拽（虽然生态里有 no-code 变体），核心卖点是「用代码精确控制」agent 逻辑与编排。相对 LangChain/LangGraph，ADK 更贴 Google/Gemini 与企业部署（Vertex AI Agent Engine）。
- **确定性图 + LLM 自由推理的显式二分**：2.0 用**显式图/节点**换来可预测、可重放；相比纯「LLM-as-orchestrator」少了随机性，代价是更多样板结构（`@WorkflowNode`、图定义）。这是 ADK 相对「一切让 LLM 决定」的框架的主要取舍。
- **多语言官方 SDK**：官方维护 **五个** SDK——Python / TypeScript / Go / Java / Kotlin（另有 Android 示例），是少数几个提供多语言一等公民实现的 agent 框架（但 2.0 新架构目前仅 Python/Go GA）。
- **模型无关但 Gemini 优先**：经 LiteLLM 接第三方，但原生能力（如 Gemini 2.5 的推理/工具、双向音视频流）在 Gemini 上最完整。
- **与 A2A/MCP 三件套协同**：ADK（搭 agent）+ MCP（接工具）+ A2A（跨 agent）构成 Google 押注的开放 agent 栈——「选它」的一大理由是想吃这套互操作生态 + Vertex 托管部署。
- **取舍/风险**：2.0 破坏性极大（API、存储、异常语义都变），1.x→2.0 迁移成本高；且新架构语言覆盖尚不齐。

---

## 7. 采用信号（截至 2026 年年中快照）

- **GitHub stars**：
  - `google/adk-python`：README 显示约 **20.4k stars**（2026 年年中）。发布数月内破 15k，年中接近 20k。
  - `a2aproject/A2A`（A2A 协议仓库）：约 **24.6k stars**，最新 release **v1.0.1（2026-05-28）**。
  - （其它语言仓库 adk-go/adk-java/adk-js 具体星数**未找到统一公开数据**，标注为不确定。）
- **发布节奏**：ADK Python 约双周一个 release，累计 68 个 release；A2A 已到 **v1.0**。
- **知名使用方 / 生态**：
  - Google 内部：**Agentspace、Customer Engagement Suite（CES）**基于同一 ADK。
  - 部署去向：**Vertex AI Agent Engine** 作为托管运行时。
  - **A2A 生态**：由 Google 于 **2025-04-09** 发布，**2025-06 捐给 Linux Foundation** 做中立治理；LF 创始成员含 **AWS、Cisco、Google、Microsoft、Salesforce、SAP、ServiceNow**；发布伙伴 50+（Atlassian、Box、Cohere、Intuit、LangChain、MongoDB、PayPal、Salesforce、SAP、ServiceNow、Workday，及 Accenture、BCG、Deloitte、Infosys、TCS、Wipro 等咨询商）。截至 2026-04，A2A 已达 **150+ 组织**（Google 官方叙述）；官方 SDK 覆盖 **Python / JavaScript / Java / Go / .NET 五语言**（另有社区 Rust）。**IBM 的 ACP（Agent Communication Protocol）已并入 A2A**：2025-08-29 由 LF AI & Data 宣布，IBM 的 Kate Blair 加入 A2A 技术指导委员会（TSC）——此项已由一手来源确认（不再是「待核实」）。
- **动能判断**：ADK + A2A 在 2025–2026 是增长最快的开源 agent 栈之一，星数、release 频率、企业联盟规模均为强信号。

---

## 8. 来源（Sources）

1. Google Developers Blog —— ADK 发布公告：https://developers.googleblog.com/en/agent-development-kit-easy-to-build-multi-agent-applications/
2. `google/adk-python` GitHub 仓库（描述/许可/版本/星数）：https://github.com/google/adk-python
3. ADK 官方文档站（架构/概念，含 2.0）：https://adk.dev/ 与 https://adk.dev/2.0/
4. ADK Runtime 事件循环深潜（Shins777, Medium）：https://medium.com/@shins777/understanding-of-adk-runtime-process-2c92f586e803
5. ADK 2.0 破坏性变更与迁移（DEV Community）：https://dev.to/peytongreen_dev/google-adk-20-is-now-stable-workflow-runtimes-breaking-changes-and-how-to-migrate-4ah8
6. Google Developers Blog —— A2A 协议发布公告：https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/
7. Linux Foundation —— A2A 项目成立新闻稿：https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents
8. A2A 协议官方规范 / 仓库：https://a2a-protocol.org/latest/specification/ 与 https://github.com/a2aproject/A2A
9. LF AI & Data —— ACP 并入 A2A 公告（2025-08-29）：https://lfaidata.foundation/communityblog/2025/08/29/acp-joins-forces-with-a2a-under-the-linux-foundations-lf-ai-data/
10. Google Developers Blog —— Why we built ADK 2.0：https://developers.googleblog.com/why-we-built-adk-20/ ；ADK Go 2.0 公告：https://developers.googleblog.com/announcing-adk-go-20/

---

### 未能核实 / 标注不确定项
- **adk-go / adk-java / adk-js / adk-kotlin 各自精确星数**：未找到统一公开数据。
- **ADK 自带的通用容器级沙箱细节**：仅确认 Code Execution 工具与 Vertex Agent Engine 托管隔离；框架级通用沙箱机制无公开确证。
- **A2A 聚合数字**：仓库当前直读星数为 ~24.6k、spec 为 v1.0.1（2026-05-28）；「150+ 组织」为 Google 官方在 2026-04 的叙述（是「组织」而非严格意义的「生产部署」计数）。

---

## 核验记录

对抗式核验，快照 2026 年年中。逐项复核最容易出错的数字、日期、版本、归属与「太干净」的架构说法。

**已核对且确认无误（保留原文）**：
- adk-python 版本与统计：**2.3.0（2026-06-18）、20.4k stars、68 releases、约 3,157 commits、Apache 2.0**——GitHub 仓库直读一致。
- **2.0.0 GA = 2026-05-19**；**adk-go 2.0 GA = 2026-06-30**——Google Developers Blog 确认。
- **2.0 Workflow Runtime = graph-based（节点/边）+ Task API**——GitHub README「What's New in 2.0」与官方博客确认。
- **2.0 破坏性变更**：`@tool`→`@WorkflowNode`、`Agent()` 构造签名变更、存储不兼容（Google 标注「data loss」级）——迁移文档确认（session/memory/eval 存储跨版本不兼容）。
- **异常处理陷阱**：宽泛 `except Exception:` 会屏蔽 2.0 自动重试（`RetryConfig(max_attempts=…)`）；`catch BaseException` 会误吞 `NodeInterruptedError` 破坏 HITL——独立来源确认（原简报误挂在来源 #5 名下，实为多篇迁移材料佐证，语义正确故保留）。
- **ADK 发布**：Google Cloud NEXT 2025 / 2025-04-09；且为 Agentspace、CES「同一套框架」——ADK 发布博客逐字确认。
- **A2A**：24.6k stars、v1.0.1（2026-05-28）、Apache 2.0；2025-04-09 由 Google 发布、50+ 伙伴；**2025-06-23** 归入 Linux Foundation（Open Source Summit NA）；LF 创始成员 AWS/Cisco/Google/Microsoft/Salesforce/SAP/ServiceNow——LF 新闻稿确认。

**已修正**：
1. **IBM ACP 并入 A2A**：原文标为「二手来源、需进一步核实」。实为**一手确认**——LF AI & Data 于 **2025-08-29** 宣布，IBM 的 Kate Blair 加入 A2A TSC。改写为确认事实并加入来源 #9。
2. **官方 SDK 语言数**：原文写「Python/Go/Java/TypeScript（+提到 Kotlin）」，把 Kotlin 说成「仅提到」。实为**五个官方 SDK**（Python/TypeScript/Go/Java/Kotlin，另含 Android 示例）。已更正为「五个」。
3. **A2A「150+ 生产组织」措辞**：一手来源为 Google「150+ 组织」（2026-04），非严格「生产部署」计数；已弱化措辞并补注五语言官方 SDK（Python/JS/Java/Go/.NET，社区 Rust）。
4. 「未能核实」清单相应更新（移除已证实的 ACP 项，补 kotlin 星数缺口），并新增来源 #9/#10。

**未删除任何核心技术论断**——除上述措辞/归属修正外，架构与控制循环描述经抽查与一手材料一致，未发现需删除的不可支撑主张。
