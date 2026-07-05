# Langflow 事实底稿(快照:2026 年年中)

> 研究对象:Langflow —— 可视化拖拽构建 agent / LangChain 流的低代码平台。
> 快照时点:2026-07。所有带时点的数字均已标注取数日期。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

**定位**:Langflow 是一个开源、基于 Python 的可视化 low-code 平台,用拖拽画布把「组件节点」连成图(flow),用来搭建 **agent 与 RAG 应用**;同时内置 API server 和 MCP server,可把搭好的 flow 直接对外发布。官方 README 自称 "a powerful platform for building and deploying AI-powered agents and workflows … provides developers with both a visual authoring experience and built-in API and MCP servers"。

**出品方 / 沿革**(一手可溯):
- 由巴西 Uberlândia 的初创公司 **Logspace** 创建(创始人 CEO Rodrigo Nader、CTO Gabriel Luiz Freitas Almeida);Langflow 工具最早于 **2023 年 2 月**发布。
- **2024-04-04**:DataStax 收购 Logspace(即 Langflow 背后团队),未披露价格(TechCrunch / BusinessWire)。
- **2025-02-25**:IBM 宣布收购 DataStax,交易预计 2025 Q2 完成;IBM 将把 Langflow 并入 **watsonx** 生成式 AI 产品组合,并承诺继续支持 Langflow 等开源社区(IBM Newsroom / The New Stack)。
- 因此 2026 年 Langflow 的最终母公司是 **IBM**(经 DataStax)。

**许可**:**MIT**(GitHub 仓库 langflow-ai/langflow,取数 2026-07)。

**2026 状态**:**活跃、未停更、未改名**。最新版本 **v1.10.1(2026-06-23 发布)**;文档已覆盖 1.10.x 并有 1.11.x "Next"。仓库累计 **299 个 release**(取数 2026-07)。

---

## 2. 解决什么问题 / 在 agent 技术栈的位置 / 与 LLM 的关系

**解决的问题**:把「搭一个多步 agent / RAG 管线」从写胶水代码(LangChain 等)降级为在画布上连节点。目标用户是需要快速原型 + 一键发布为服务的开发者与半技术团队,同时保留导出 JSON / 走 API 的可编程能力。

**栈中位置**:属于**可视化编排框架 / low-code agent 构建平台**这一层——介于「纯代码 agent 框架(LangChain / LangGraph / CrewAI)」与「托管平台」之间。它**不是**基础模型,也**不是**推理运行时;它是一个**图执行编排器 + 组件市场 + 发布层(API/MCP/嵌入式聊天)**。可以把它理解为「LangChain 的可视化 IDE + 运行时 + 服务器」。

**与底层 LLM 的关系**:模型无关(model-agnostic)。LLM 作为一种组件类型(端口色:Fuchsia = LanguageModel)接入,provider(OpenAI、Anthropic、IBM watsonx.ai 等)通过全局 Model Providers 配置 API key 启用。Agent 组件把 LLM 当作**推理引擎**驱动工具调用循环。

---

## 3. 架构与核心构件(点名真实构件)

- **Flow(流)**:一张有向图,是应用的功能单元。
- **Component(组件)**:图的节点,继承自基类 `Component`,像类一样封装一个用例/集成(如 `RecursiveCharacterTextSplitter`,声明 `IntInput`/`DataInput` 等输入与 `build_*` 方法)。分为 **Core components**(通用输入输出、数据存储)与**专用组件**(Agent、语言模型、embedding)。
- **Ports / handles(端口)**:节点边缘的圆点连接点,按数据类型着色,只有同类型(同色)端口能连。已确认的数据类型:**Message(indigo)、LanguageModel(fuchsia)、Data(pink)、Tool(cyan)、JSON(red)、Embeddings(emerald)、Memory(orange)**。Prompt Template 会根据 `{变量}` **动态生成输入端口**。
- **Agent component**:核心构件,内置多 LLM provider、工具调用、自定义指令("Agent Instructions" 系统提示)、默认开启的**会话记忆**(按 session ID 分组、滚动上下文窗口)。
- **工具层(Tools)**:任意组件可通过开启 **Tool Mode** 变成 agent 的工具,接到 Agent 的 **Tools 端口**;每个工具可暴露多个 action(函数),可单独启用/禁用并配描述。
- **MCP server(内置)**:每个 Langflow project 自带 MCP server,把该 project 的 flows 作为 tools 暴露给 MCP 客户端。
- **API server(内置)**:`/api/v1/run/$FLOW_ID` 端点执行 flow。
- **执行/后台构件(1.10 引入)**:**Redis 支撑的 job queue**(支持多 worker 部署、共享 build 事件)、**Memory bases**(按 flow 的向量库做长期语义记忆)、**File System component**(给 agent 的**沙箱化**文件访问)、**Unified Knowledge Base**(合并摄取与检索)、可配置向量库后端(Chroma、OpenSearch)。
- **技术栈**:后端 Python(约 64.5% 代码,支持 **Python 3.10–3.14**),前端 TypeScript/JavaScript(约 35%)。

**关于「循环 / 规划 / 执行器」**:Langflow 的 Agent **不自研 ReAct 执行器**,而是把规划与工具调用循环**下放给 LLM 的原生 tool-calling + 底层库**。历史上核心 agent 基于 LangChain 的 tool-calling / ReAct agent(AgentExecutor,`max_iterations` 默认 15,`agent_scratchpad` 存中间结果);当前版本已把 **LangChain 拆为可选 bundle**(见第 6 节),核心 Agent 组件不强依赖 LangChain。**注:官方文档明确未逐字说明当前核心 Agent 循环由哪个库/执行器驱动——此点为据文档措辞与历史代码的推断,标注为「未在文档逐字确认」。**

---

## 4. 一步步怎么运转(控制/编排回路)—— 核心节

以「用户在 Chat 里发一句话,经一个带工具的 Agent flow」为例,请求实际流经的回路:

1. **入口**。用户请求从两种入口之一进来:(a) Playground / 嵌入式 `langflow-chat` web 组件里的 Chat Input 节点;(b) 外部程序 POST 到 `/api/v1/run/$FLOW_ID`,body 带 input 与参数,可带 `session_id` 标识会话,可带 `tweaks`(运行时一次性覆盖某组件参数)。鉴权:1.5+ 大多数端点要求 `x-api-key` / `LANGFLOW_API_KEY`。
2. **图加载与调度**。后端加载该 flow(节点=组件,边=类型化端口连接)。在多 worker 部署下,build 事件经 **Redis job queue** 共享,请求被调度到某个 worker。
3. **上游依赖求值**。运行整条 flow 时,后端沿依赖关系求值:被连到 Agent 的上游组件(如 Prompt Template 填入 `{变量}`、检索器取上下文、Chat Input 取用户文本)先各自 `build/run` 产出对应类型的数据(Message/Data 等)。被 **freeze** 的组件跳过重算、复用缓存输出。
4. **组装 agent 调用**。Agent 组件拿到:系统提示(Agent Instructions)、用户输入(Message)、绑定的 LLM(LanguageModel 端口)、注册的工具列表(Tools 端口,每个工具带描述与 action)、以及按 `session_id` 取出的**会话记忆**(滚动窗口)。
5. **推理—行动循环(交给 LLM + 底层执行器)**。LLM 作为推理引擎:读输入 → 决定是否调用工具 → 若调用,生成结构化 tool call → 后端执行对应组件/action → 把 observation 回灌 → LLM 再判断继续调工具还是给最终答案。此循环由模型的原生 tool-calling 驱动(历史上对应 LangChain AgentExecutor 的迭代循环,`max_iterations` 默认 15)。若某工具本身是**另一个 Agent**(agent-as-tool),则该子 agent 走同样的子循环(见第 5 节多 agent)。
6. **产出与流式**。循环收敛后,Agent 输出 Message → 连到 Chat Output / 作为 API 响应返回。API 支持**流式**返回;1.10 起 Agent 可产出**结构化响应**。
7. **记忆写回**。本轮对话按 `session_id` 写回会话记忆;若配置了 **Memory base**,相关内容可写入该 flow 的向量库供长期语义检索。
8. **发布态复用**。同一张 flow 可同时以三种面孔对外:REST API(`/api/v1/run`)、MCP tool(被别的 agent 当工具调用)、嵌入式聊天 widget——三者复用同一执行回路,只是入口不同。

**要点(讲课用)**:Langflow 的编排回路 = 「**图求值(确定性、拓扑依赖)** 外层」包裹「**agent 的推理—行动循环(非确定性、LLM 驱动)** 内层」。画布决定"数据怎么流经组件",Agent 组件内部把"下一步做什么"的决策权交给 LLM。

---

## 5. Harness 层设计

- **上下文 / 记忆管理**:会话记忆默认开启,按 `session_id` 分组、维护**滚动上下文窗口**;`session_id` 也用于区分嵌入式 widget 发起的运行。长期记忆由 1.10 的 **Memory bases**(per-flow 向量库、语义检索)承担。
- **工具接口**:统一的 **Tool 抽象**——任意组件开 **Tool Mode** 即成工具,接 Agent 的 Tools 端口;工具带**描述**(告诉 agent 能干什么)与多个可启用/禁用的 **action**。外部能力经**内置 MCP server**把 flow 暴露为 tool,或 agent 反向消费外部 MCP servers。
- **规划**:无独立"规划器"组件;规划隐含在 Agent 组件内部的推理循环里,由 LLM 完成(官方称 Agent 内部处理 planning 与 reasoning,对用户抽象掉迭代循环)。
- **多 agent / 交接**:通过 **agent-as-tool** 实现层级式多 agent——把子 Agent 开 Tool Mode 接到主 Agent 的 Tools 端口,主 agent 按需把子任务"交接"给专用子 agent。README 亦提"multi-agent orchestration with conversation management"。
- **人在环(HITL)**:通过 Playground 的**逐步执行 / step-by-step control**与交互式测试实现观测与介入;未见文档明确的、独立的「审批门 / 中断-恢复」HITL 原语——**此点未找到明确一手描述,标注为未核实**。
- **沙箱**:1.10 的 **File System component** 提供给 agent 的**沙箱化文件访问**;安全侧新增登录限速(IP 级防暴力破解)、MCP server 的锁控制与 embedded 模式 UI 标志。
- **可观测性**:内置对接 **LangSmith、LangFuse**(README)。

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **可视化画布优先**:相对 LangChain/LangGraph/CrewAI 这类**代码优先**框架,Langflow 把编排搬到拖拽画布,连节点≈写 LangChain 代码,降低门槛;同时支持导出 JSON、走 API,不锁死在 UI 里——**"低代码但不无代码天花板"**是其核心取舍。
- **框架无关化(去 LangChain 化)**:早期强绑定 LangChain,现已把 **LangChain 降级为可选 bundle**,核心 Agent 组件不强依赖它;并另有独立的 Core 组件(如通用 SQL Database 与 LangChain 版并存)。取舍:换来对单一上游框架的解耦,代价是文档对"核心循环底层实现"表述变模糊。
- **一次搭建、三种发布**:同一 flow 同时是 REST API + MCP tool + 嵌入式聊天,发布路径短,这是相对纯框架的显著差异化。
- **工程化打磨**:1.10 报告称通过依赖裁剪、worker 生命周期管理、Linux Copy-on-Write 等把**内存占用降低约 89%**(官方博客口径),Redis job queue 支持多 worker——面向生产部署而非只做 demo。
- **企业归属**:背靠 DataStax → IBM watsonx,提供 watsonx.ai / watsonx Orchestrate 集成路径(IBM 将其纳入 watsonx 组合)。对已有 IBM/DataStax(AstraDB/Cassandra)栈的团队是加分项。

**为什么有人选它**:要快速把 RAG/agent 原型做出来又能一键发成服务、团队里有非纯工程角色、或已在 IBM/DataStax 生态里。**为什么有人不选**:需要对 agent 控制流做细粒度、代码级掌控(此时 LangGraph 等代码优先框架更合适)。

---

## 7. 采用度信号

- **GitHub star**:**约 151k**(取数 **2026-07**,langflow-ai/langflow);fork 约 9.4k。里程碑:**2025-08-14 达到 100k stars**(创始人 Rodrigo Nader 宣布)。
- **依赖与生态**:GitHub 显示 **1,500+ 个 dependent projects**;299 个 release(取数 2026-07)。
- **社区规模**(100k 里程碑页,2025-08 口径):GitHub followers ~138k、Discord ~23k、X ~10k、YouTube 15k+。
- **知名用户 / 客户名单**:**未找到公开、点名的企业采用者清单**(官方博客与 README 均未逐一点名具体公司)。IBM 将其并入 watsonx 是最强的机构背书信号。
- **势头**:2025→2026 保持高频发版(1.8 → 1.9 → 1.10,2026 年内多次发布),功能向"生产化 + agent 原生 + MCP"演进,势头持续。

---

## 8. 来源(一手为主)

1. Langflow 官方文档首页(定位/架构/概念):https://docs.langflow.org/
2. GitHub 仓库 langflow-ai/langflow(许可/版本/star/技术栈):https://github.com/langflow-ai/langflow
3. Langflow 文档 · Components(组件/端口/数据类型/执行):https://docs.langflow.org/concepts-components
4. Langflow 文档 · Agents(Agent 组件/记忆/指令):https://docs.langflow.org/agents
5. Langflow 文档 · Release notes(1.10 特性:Redis 队列/Memory bases/File System 沙箱):https://docs.langflow.org/release-notes
6. TechCrunch:DataStax 收购 Logspace / Langflow(2024-04-04,起源与创始人):https://techcrunch.com/2024/04/04/datastax-acquires-logspace-the-startup-behind-the-langflow-low-code-tool-for-building-rag-based-chatbots/
7. IBM Newsroom:IBM 收购 DataStax(2025-02-25,归入 watsonx):https://newsroom.ibm.com/2025-02-25-ibm-to-acquire-datastax,-deepening-watsonx-capabilities-and-addressing-generative-ai-data-needs-for-the-enterprise
8. Langflow 博客:100k stars(2025-08-14,社区规模):https://www.langflow.org/blog/100k-stars-on-github

---

### 未能核实 / 需谨慎的点(显式标注)
- **核心 Agent 循环的底层执行器**:文档未逐字说明当前(去 LangChain 化后)核心 Agent 的工具调用循环由哪个库/执行器驱动;`max_iterations=15`、AgentExecutor、ReAct 等为 LangChain 通用/历史口径,推断性表述,已在第 3/4 节标注。
- **独立 HITL 原语**(审批门/中断-恢复):未找到明确一手描述,仅确认 Playground 有逐步执行/观测能力。
- **知名企业采用者点名清单**:未找到公开数据。
- **内存降低约 89%**:来自官方博客单方口径,未见独立复核。
- IBM `think/tutorials` 关于 watsonx Orchestrate 集成的页面抓取时返回 403,watsonx 归属结论改由 IBM Newsroom / The New Stack 佐证。
