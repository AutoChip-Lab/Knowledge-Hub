# Microsoft Semantic Kernel(SK)拆解简报

> 快照时间：2026 年 7 月。本简报以微软官方文档、GitHub 仓库、devblogs 与 Azure 官方博客为主要来源。**重要背景：Semantic Kernel 已被其继任者 Microsoft Agent Framework(MAF)取代，MAF 于 2026-04-03 发布 1.0 GA。** 本文同时拆解经典 SK 与 MAF，因为二者是同一团队的连续演进（"把 MAF 当作 Semantic Kernel v2.0"是官方原话）。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

**一句话定位**：Semantic Kernel 是微软出品的**模型无关（model-agnostic）企业级 AI 编排 SDK**，把 LLM、原生代码工具（plugins/functions）、记忆/向量库、以及 agent 编排统一到一个可依赖注入、可观测、可审计的"内核（Kernel）"里，目标是把 LLM 能力嵌入生产级 .NET/Python/Java 企业应用。

- **出品方**：Microsoft（同一团队后续负责 Microsoft Agent Framework）。
- **许可**：MIT（开源）。
- **支持语言**：C#/.NET（仓库约 66% 代码）、Python（约 32%）、Java（独立 `semantic-kernel-java` 仓库）。
- **2026 状态（关键）**：
  - **未被弃用（not deprecated），但已进入"维护 + 继任"阶段**。官方定位：**"Microsoft Agent Framework 是 Semantic Kernel 的继任者（successor）"**，同时承诺 **"在可预见的未来继续支持 Semantic Kernel v1.x"**，具体为：修复关键 bug 与安全问题、把部分现有 SK 功能推到 GA、并在 **MAF 离开 Preview 后至少再支持 SK 一年**。
  - **大多数新功能已转向 MAF**。SK 与 AutoGen 都进入以 MAF 为中心的"维护模式"式表述（官方博客用词是"绝大多数新功能将为 MAF 构建"）。
  - **未被收购/未被重命名为独立产品**——它是微软内部演进，最新发布仍在活跃（如 `python-1.43.1`，2026-06-17）。

---

## 2. 它解决什么问题 + 在栈里的位置

**问题**：企业要把 LLM 落地生产，需要的不只是"调个 API"，而是：多模型可替换、工具/函数可插拔、记忆与检索、多 agent 协作、可观测性/遥测、责任 AI 过滤器、依赖注入与配置集中管理。SK 把这些做成一个统一 SDK。

**在栈里的位置**：SK **不是一个 agent，也不是一个终端产品，而是一个编排框架 / SDK（orchestration framework + harness building blocks）**。它坐在你的应用代码与底层 LLM 提供商之间：
- **向下**：通过 connectors 连接 LLM 提供商（Azure OpenAI、OpenAI、以及 MAF 阶段扩展到 Anthropic Claude、Amazon Bedrock、Google Gemini、Ollama、Microsoft Foundry），并连接向量库（Redis、Qdrant、Azure AI Search、PostgreSQL 等）。
- **向上**：给应用暴露 Kernel、Plugin/Function、Agent、Process/Workflow 等抽象。
- SK **本身不托管模型**，模型推理仍在各提供商侧；SK 负责提示构建、函数调用循环、状态/历史管理、编排与遥测。

---

## 3. 架构与核心组件（经典 SK）

- **Kernel（内核）**：中心组件，本质是一个**依赖注入容器**，管理运行 AI 应用所需的全部 **Services** 与 **Plugins**。几乎所有组件都通过 Kernel 获取服务与插件。官方建议在 C# 里把 Kernel 注册为 transient（轻量、每次用完即弃）。
- **Services**：分两类——AI services（如 chat completion、embeddings）与其它服务（logging、HTTP client 等），仿照 .NET Service Provider 模式，跨语言支持 DI。
- **Plugins / Functions（工具层）**：插件是 AI 能调用的工作单元。函数有两类：
  - **Native functions**：普通代码函数，用 `@kernel_function` / `[KernelFunction]` 标注，带描述与 JSON schema。
  - **Prompt / semantic functions**：由提示模板 + 输入变量构成（`PromptTemplateConfig`）。
- **Planners（规划器，已弃用）**：早期 SK 用 `SequentialPlanner`、`HandlebarsPlanner`、`FunctionCallingStepwisePlanner` 让 LLM 生成执行计划。**这些在 SK 1.x 已被弃用/移除**，官方推荐迁移到 **Auto Function Calling**（`FunctionChoiceBehavior.Auto()`），因为它更可靠、消耗更少 token，并自动管理 ChatHistory。
- **Memory / Vector Store connectors**：记忆抽象 + 向量库连接器。`VolatileMemoryStore`（进程内、易失、仅供开发/测试）到生产级 Redis/Qdrant/Azure AI Search/PostgreSQL；支持向量检索、混合检索（vector + BM25）、语义排序、过滤等。可切换后端而不改 agent 代码。
- **ChatHistory**：函数调用循环中所有步骤（函数调用与结果）都被追加到 ChatHistory，可事后审计。
- **Filters / Middleware / Events**：在提示与函数调用的每一步注入中间件（logging、状态更新、责任 AI），并配合 OpenTelemetry 做遥测。
- **Agent Framework（SK 内的 agent 层）**：`ChatCompletionAgent`、`OpenAIAssistantAgent`、`AzureAIAgent`、`OpenAIResponsesAgent`；`AgentGroupChat`/orchestration 包提供多 agent 编排。
- **Process Framework（业务流程层，experimental）**：见 §5。
- **MCP 支持**：可把 Kernel 里注册的函数**导出为 MCP server**（`kernel.as_mcp_server(...)`，支持 Stdio / SSE），也可把提示模板暴露为 MCP Prompt。

---

## 4. 逐步拆解：一个请求如何流经内核（最重要）

### 4a. 经典 SK 的函数调用循环（Auto Function Calling）
当应用向 Kernel 发起一次调用（invoke prompt / agent），Kernel 会：
1. **选择 AI service**：从 DI 容器里挑最合适的 chat completion 服务。
2. **构建提示**：用提供的 prompt template + 输入变量渲染最终提示。
3. **附带工具清单**：把 Kernel 里注册的 plugins/functions（含描述与 JSON schema）作为 tool 定义发给模型，并设置 `FunctionChoiceBehavior.Auto()`。
4. **发送给 LLM**：模型返回文本或**一个/多个 function call 请求**。
5. **自动执行函数调用循环**：若模型请求调用函数，SK 自动执行对应 native/prompt function，把结果作为 tool 消息追加进 **ChatHistory**，再把更新后的历史回传给模型——循环往复，直到模型给出最终答案（这取代了旧的 Stepwise Planner，"规划"由模型的 function calling 隐式完成）。
6. **解析并返回**：解析响应返回给应用。
7. **贯穿全程的中间件/事件**：每一步都可触发 logging、状态更新、责任 AI 过滤，全部集中在 Kernel。

### 4b. MAF 的两条编排路径
MAF 把上面这套 agent 循环规整为**两大能力类别**：
- **Agents（LLM 驱动、自主）**：单个 agent 用 LLM 处理输入、调用 tools/MCP server、生成响应——适合开放式/对话式、需要自主工具使用与规划的任务。控制循环与 4a 类似（模型决定调哪些工具，middleware 拦截）。
- **Workflows（图驱动、确定性）**：见 §5，用于步骤明确、需要显式控制执行顺序、多 agent 协调的任务。官方给的判据："如果能用一个普通函数解决，就别用 AI agent。"

---

## 5. Harness 级设计

### 上下文 / 记忆管理
- 经典 SK：ChatHistory + Memory/Vector Store connectors（可插拔后端）。
- MAF：`Agent session`（会话级状态管理）+ **Context Providers**（可插拔后端的 agent 记忆）+ **middleware hooks**；MAF 的 **Agent Harness（BUILD 2026 发布）**引入**自动 token 压缩（token compaction）**、文件记忆持久化、任务跟踪。

### 工具接口
- 统一为"带描述 + JSON schema 的函数"，模型通过 function calling 选择；同时原生支持 **MCP**（动态发现/调用外部工具）与 **OpenAPI**（无需手写包装直接接 REST API）。

### 规划
- 经典 SK：从显式 Planner 演进为**隐式的 Auto Function Calling**（模型即规划器）。
- MAF：agent 侧仍是 LLM 隐式规划；workflow 侧则由开发者**显式**用有向图定义执行路径。

### 多 agent handoff / 编排模式
MAF 提供多种编排模式：**sequential（顺序）、concurrent（并发）、group chat（群聊）、handoff（专家路由交接）、Magentic-One（源自 AutoGen 研究的动态编排）**。经典 SK 也有对应的 orchestration 包与 `AgentGroupChat`。

### Workflow 执行模型（MAF，重点）
- **组件**：`WorkflowBuilder` 把 **Executors**（处理单元，可是 agent 或自定义逻辑）与 **Edges**（带条件的消息路由边）连成有向图；**Events** 用于流式观测。
- **构建期校验**：类型兼容（连接的 executor 间消息类型必须兼容）、图连通性（所有 executor 可从起点到达）、executor 绑定、边校验（重复/非法边）。
- **执行模型 = 改良版 Pregel / BSP（Bulk Synchronous Parallel）超步（superstep）**。每个 superstep：
  1. 收集上一个 superstep 的所有待处理消息；
  2. 按边定义（类型 + 条件）把消息路由到目标 executor；
  3. **并发**运行本 superstep 所有目标 executor；
  4. **同步屏障**：必须等全部 executor 完成才进入下一个 superstep；
  5. 把新产生的消息入队给下一个 superstep。
- **由此带来的保证**：确定性执行（同输入同顺序）、可靠的**检查点（checkpointing，在 superstep 边界保存状态）**、无 superstep 内竞态。
- **代价/权衡**：fan-out 时，链式路径会被同一 superstep 内的长任务阻塞（同步屏障的后果）；官方建议把独立并行的顺序步骤合并进单个 executor 来规避。

### Human-in-the-loop
- Workflow 支持 **request/response** 交互、**pause/resume**、以及审批（approval）机制，配合检查点支持长时运行任务。经典 SK agent 层也支持 human-in-the-loop 审阅。

### 沙箱 / 安全
- 经典 SK 无内建代码沙箱。MAF 在 BUILD 2026 引入 **CodeAct**（把多次 tool call 合并成单个 Python 程序，在隔离的 **Hyperlight micro-VM** 中执行；官方称在代表性负载上降低 52.4% 延迟、节省 63.9% token）与 **Foundry Hosted Agents**（每会话 VM 隔离、scale-to-zero、持久文件系统、App Insights 可观测）。
- 责任 AI 由开发者自行实现（metaprompt、内容过滤等）；官方明确对接第三方系统/非 Azure 直连模型的风险由使用者承担。

---

## 6. 独特设计选择与权衡（vs 同侪）

- **依赖注入为中心**：Kernel 就是一个 DI 容器，天然贴合 .NET 企业工程实践——这是 SK 相对 LangChain/LlamaIndex 最鲜明的差异，也是它在 .NET 阵营被采用的主因。
- **企业优先**：session 状态、类型安全、filters/middleware、OpenTelemetry 遥测、审计能力是一等公民，而非附加物。
- **从显式 Planner 退回到 function calling**：SK 早期押注 Planner，后随模型 function calling 成熟而弃用之——一个值得教学的"框架抽象被模型能力吞并"的案例。
- **确定性 workflow vs 自主 agent 二分**：MAF 明确区分"LLM 自主编排"与"图驱动确定性编排"，比纯 agent 框架更适合受监管/需可复现的企业场景（Pregel/BSP 带来确定性 + 检查点）。
- **多语言并重**：.NET 与 Python 一等公民（外加 Java），在以 Python 为主的生态里较少见。
- **AutoGen × SK 收敛**：MAF 把 AutoGen 的多 agent 研究创新（如 Magentic-One）与 SK 的生产基座合一，原生内建 MCP + A2A + OpenTelemetry。
- **权衡**：抽象层较厚、概念多（Kernel/Plugin/Function/Planner→FunctionCalling/Agent/Process/Workflow），学习曲线偏陡；且正处于 SK→MAF 迁移期，存在 API 变动与文档双轨的过渡成本。

---

## 7. 采用信号

- **GitHub stars**：`microsoft/semantic-kernel` 约 **28.3k**（截至 2026-06 抓取仓库页时）。另有二手来源称 2026 年约 27,450 stars（数量级一致，标注为估算）。
- **前身合计影响力**：MAF 由打造 SK 与 AutoGen 的**同一团队**构建，官方定位为"融合两者"的继任者。（注：早前流传的"两前身累计超过 75,000 stars / 三年企业经验"这一具体数字，未能在任何微软官方一手来源中核实到，已删除；仅 SK 单仓当前约 28.3k stars 为可核实数据，见下。）
- **发布节奏（活跃）**：SK 仍在发版（如 `python-1.43.1`，2026-06-17）；MAF 于 2025-10-01 公开预览、2026-02 进入 RC、**2026-04-03 发布 1.0 GA**，并在 BUILD 2026（2026-06 前后）继续发布 Agent Harness、Foundry Hosted Agents、CodeAct、GitHub Copilot SDK 集成等。
- **知名用户 / 客户具体名单**：**未找到公开数据**（官方博客未披露具名客户或采用数量指标）。
- **动能**：整体处于上升期，但"重心已从 SK 迁移到 MAF"——教学时应把 SK 当作"仍受支持的 v1.x 基座 + 通往 MAF 的路径"来讲。

---

## 8. 来源（Sources）

1. Semantic Kernel GitHub 仓库（stars/license/继任声明/语言占比/最新发布）：https://github.com/microsoft/semantic-kernel
2. Microsoft Agent Framework Overview（组件、agents vs workflows、收敛声明、providers）：https://learn.microsoft.com/en-us/agent-framework/overview/
3. Understanding the kernel in Semantic Kernel（Kernel/DI/Services/Plugins/调用步骤/MCP server）：https://learn.microsoft.com/en-us/semantic-kernel/concepts/kernel
4. Process Framework（Process/Step/Pattern/事件驱动，experimental）：https://learn.microsoft.com/en-us/semantic-kernel/frameworks/process/process-framework
5. Semantic Kernel Agent Framework（agent 类型、编排包、human-in-the-loop）：https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/
6. MAF Workflows – Builder & Execution（Pregel/BSP superstep、同步屏障、检查点、校验）：https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/core-concepts/workflows
7. Semantic Kernel and Microsoft Agent Framework（继任关系、SK v1.x 支持承诺、时间线）：https://devblogs.microsoft.com/semantic-kernel/semantic-kernel-and-microsoft-agent-framework/
8. Microsoft Agent Framework Version 1.0 官方公告（GA 日期、包名、1.0 特性、编排模式、MCP/A2A）：https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/
9. MAF at BUILD 2026（Agent Harness、Hosted Agents、CodeAct、token 压缩/沙箱）：https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-at-build-2026-announce/

---

## 核验记录

对最高风险声明做了独立一手来源核验（快照：2026-07）：

**已核实为正确、保留原样：**
- **MAF 1.0 GA = 2026-04-03**：devblogs 官方公告与 Visual Studio Magazine（2026-04-06 报道）一致确认。
- **时间线**：公开预览 2025-10、RC 2026-02（Python 1.0.0-rc1 于 2026-02-19）、GA 2026-04-03 — 均一致。
- **SK GitHub stars = 28.3k**、**许可 = MIT**、**语言占比 C# 66.3% / Python 31.8%**、**最新发布 python-1.43.1（2026-06-17）**：直接抓取仓库页逐项确认（原文"约 66%/约 32%"与精确值一致）。
- **"MAF 是 SK 的继任者 / 当作 SK v2.0 / 同一团队"**：devblogs 继任者说明页确认。
- **SK v1.x 支持承诺**："在 MAF 离开 Preview 进入 GA 后至少再支持一年" — 与官方原文措辞一致确认。
- **Workflow = 改良版 Pregel / BSP superstep 模型**：超步、同步屏障、检查点在超步边界、fan-out 阻塞权衡、构建期四类校验 — 与 learn.microsoft.com 文档逐条吻合（文档明确引用 Pregel 论文并称 "modified Pregel / BSP"）。
- **CodeAct**：Hyperlight micro-VM 每次调用隔离、**延迟降低 52.4%（27.81s→13.23s）、token 节省 63.9%（6,890→2,489）** — BUILD 2026 公告精确确认。
- **编排模式**（sequential/concurrent/group chat/handoff/Magentic-One）：MAF 1.0 公告确认。

**发现错误并已修正：**
- **删除了"SK + AutoGen 累计超过 75,000 GitHub stars + 三年企业实战经验"**。此数字在 devblogs 继任者页、MAF 1.0 公告、BUILD 2026 公告等一手来源中**均未出现**；可查到的官方/媒体口径是"两仓合计 50,000+ stars"量级，与 75,000 不符。改为可核实的表述（同团队构建、SK 单仓约 28.3k）。
