# Agno 拆解手册（快照：2026 年年中）

## 1. 一句话定位与身份

**Agno（原 Phidata）是一个用 Python 写的、主打高性能与生产运行时的多智能体框架**：你用纯 Python 声明式地拼出带工具、记忆、知识与推理的 Agent，把多个 Agent 组成 Team，把确定性步骤组成 Workflow，再用 **AgentOS**（一个预制的 FastAPI 运行时 + 控制面）把它们部署成自托管的生产服务。官方一句话定位是 "Agent Framework and High-Performance Runtime for Multi-Agent Systems"；v2 之后官网 README 的措辞升级为 "Build, run, and manage agent platforms."

- **谁做的**：Agno Inc.（前身 Phidata），创始人 **Ashpreet Bedi**，总部纽约。核心为全职工程团队。
- **License**：**Apache-2.0**。**注意历史变更**：先前是 **MPL 2.0**，在 **2026 年 2 月（v2.5.2 前后）**改为 Apache-2.0，官方理由是"对商业使用更宽松、对齐行业标准"。引用旧文时可能仍写 MPL。
- **2026 年状态**：**活跃且高速迭代**。不是被收购、也未停更。
  - **改名**：由 **Phidata → Agno**，官方口径为 **2025 年初**（多个二手来源写 2025 年 1 月）。"Agno"（ἁγνὸ）在希腊语意为"纯净"，呼应其"无 graph/无 chain、纯 Python"的设计主张。
  - **重大版本**：**Agno 2.0 于 2025-09-09 发布**，从"Python agent 框架"升级为"框架 + 运行时（AgentOS）"，并把 Agent/Team 改为**完全无状态（stateless）**。
  - 截至本快照，最新 release 为 **v2.6.22（2026-07-03）**；2026 年 2 月单月即发布约 10 个大版本，节奏很快。
- **融资**：种子轮约 **$5.4M**（**2024 年 8 月**），由 GreatPoint Ventures 领投，含 Surface Ventures、Zero Prime 及天使。（数额为二手来源 Tracxn，标注为估算/需谨慎。）

## 2. 解决什么问题 & 在栈里的位置

Agno 解决两件事：**(a) 用极低开销把带工具/记忆/知识/推理的智能体拼出来；(b) 把智能体原型变成可自托管、可监控、多租户隔离的生产服务**——官方把 AgentOS 称为"原型到部署之间缺失的那块"（the missing piece）。

**在栈里它同时是"编排框架 + 运行时/平台"，不是单个 Agent，也不是底层模型。** 更精确地说是**三层一体**：

- **Python SDK（框架层）**：构建 Agent / Team / Workflow。
- **AgentOS（运行时层）**：一个预制的、**无状态、可水平扩展**的 FastAPI 应用，带 50+ REST 端点，负责会话/记忆/追踪持久化、调度、鉴权/RBAC、审计。
- **Control Plane（控制面 UI）**：直连你自己的 AgentOS，用于测试、监控、可视化、调试。**关键卖点：数据不出你的基础设施**（会话、记忆、日志留在你自己的库/云里，控制面只是连过去）。

**与底层 LLM 的关系**：Agno 自己不产生智能，是编排+运行层，通过统一 Model 抽象接入 **23+（官方另有"30+"口径）模型 provider**：OpenAI、Anthropic（Claude）、Google（Gemini）、Groq、Hugging Face、以及本地模型等。最小示例即 `Agent(model=Claude(id=...), tools=[...])`。

## 3. 架构与核心组件

真实的"运动部件"（v2 语义）：

| 组件 | 作用 |
|---|---|
| **Agent** | 官方定义为"**围绕无状态模型的一个有状态控制回路**（a stateful control loop around a stateless model）"。组成：`model` + `tools` + `instructions` + 可选 `memory` / `knowledge` / `storage` / `reasoning`。自主选工具、迭代调用。 |
| **Team** | 多 Agent 协作，由 leader 统筹。三种模式：**Route**（leader 分类后转派专家）、**Collaborate**（全体共攻一个问题）、**Coordinate**（leader 拆解、成员并行执行、leader 汇总）。 |
| **Workflow** | 确定性、步骤化编排。每个 step 可以是一个 Agent、一个 Team 或一个 Python 函数；支持顺序/并行/条件/循环、显式分支、暂停/恢复、完整审计轨迹。用于合规/可重复场景。 |
| **Model** | 统一 LLM 抽象，23+/30+ provider 包装类（`Claude`、`OpenAIChat`、`Gemini`、`Groq` …）。 |
| **Tools / Toolkits** | 工具即 Python 函数或 Toolkit 类；框架**内省函数签名自动生成 schema** 传给 LLM。官方称 **100+ toolkits / 数千工具**（金融、web 搜索、GitHub、DB、文件系统等）。**MCP 一等公民**，支持 stdio / streamable HTTP / SSE 三种传输。 |
| **Memory** | DB 持久化的 **User Memories**（跨会话，PostgreSQL/SQLite/MySQL/DynamoDB）+ **Session Summaries**（会话摘要/历史滑窗与自动裁剪）。 |
| **Knowledge** | **Agentic RAG**：Agent 按需主动检索知识库（而非预填上下文）。v2 统一为单一 Knowledge 层，吃 PDF/CSV/网页爬取/Markdown/文本。向量库 20+：pgvector、Chroma、LanceDB、Qdrant、Weaviate、Milvus、Pinecone、MongoDB Atlas 等，支持混合检索（BM25+向量）与 rerank。 |
| **Reasoning** | 三条路：`ReasoningTools()`（Agent 显式调推理工具做 CoT）、`reasoning=True`（挂一个专门的推理模型先分解再行动）、或用 instructions 引导 CoT。 |
| **Db（存储）** | v2 收敛为**单库**统一存 sessions / memories / evals / metrics（`SqliteDb`、`PostgresDb` 等）。 |
| **AgentOS** | 预制 FastAPI 应用：50+ 端点、SSE 流式、后台/长时任务、run 取消、自定义事件、鉴权/RBAC/多租户隔离、审计日志、OpenTelemetry 观测。 |

## 4. 一步步：一个用户请求怎么流经系统（最重要）

以"用户对一个带工具+知识+记忆的 Agent 发一条消息"为例（`agent.run(...)` / AgentOS 的 `/runs` 端点）：

1. **入口**。请求经 AgentOS 的 FastAPI 端点（或直接 `agent.run()` / `arun()`）进入。因为 v2 里 Agent 是**无状态**的，运行所需的会话状态（历史、记忆、user_id/session_id）是**从 Db 读出来注入**，而不是挂在 Agent 对象上——这就是它能水平扩展、每实例只需极小内存的根因。

2. **组装上下文**。框架把这些拼成一次模型调用的输入：
   - system/instructions（角色与规则）；
   - 从 Db 拉的 **会话历史**（做滑窗/自动裁剪以控上下文）；
   - 若开了 memory，注入相关的 **User Memories**；
   - 若开了 knowledge，**Agentic RAG**：Agent 决定是否检索、生成查询、打向量库（可混合检索+rerank），把命中片段并入上下文；
   - 把 tools 的 schema（由函数签名自动生成）一并交给模型。

3. **进入控制回路（the loop）**。这是核心的"有状态控制回路包裹无状态模型"：
   - 模型基于当前上下文**推理**，要么直接产出回答，要么发出一个/多个 **tool call**；
   - 若开了 reasoning，先由 `ReasoningTools`/专门推理模型做 **chain-of-thought 分解**，再落到行动；
   - 框架**解析 tool call → 执行对应 Python 函数/Toolkit/MCP 工具 → 把结果回灌**到消息序列；
   - 回到模型再推理。**循环往复**，直到模型不再要工具、产出最终答案（或触达上限）。

4. **人在环 / 护栏（可选，插在回路里）**。
   - **确认门（confirmation gates）**：对危险操作要求用户批准，如 `require_confirmation=["delete_record", ...]`，命中即暂停等人工放行；
   - **pre-run / post-run 生命周期钩子**：在执行前后对输入/输出做校验或改写（guardrails）。

5. **多 Agent 交接（若是 Team/Workflow）**。
   - **Team**：leader 按模式把子任务 **Route/Coordinate/Collaborate** 给成员 Agent；成员各自跑第 3 步的回路；leader 汇总；
   - **Workflow**：按预定义 step（Agent/Team/函数）确定性推进，支持并行、条件、循环、**暂停/恢复**。

6. **持久化与流式输出**。整个过程中，会话、记忆、trace/metrics 写回**你自己的 Db**；输出经 **SSE** 流式返回。run 可被**取消**，长时任务可后台执行。

7. **可观测**。运行产生 OpenTelemetry trace，Control Plane 直连 AgentOS 做监控/回放/调试；无数据离开你的基础设施。

**据此讲课的一句话**：Agno 的回路本身是经典的 "reason → tool-call → observe → repeat"，它的独特点不在回路形状，而在于**把状态外置到 DB、让 Agent 无状态**，从而 AgentOS 能像普通无状态微服务一样横向扩展。

## 5. Harness 层设计

- **上下文/记忆管理**：会话历史滑窗 + 自动裁剪；长期 User Memories 与 Session Summaries 分离，均落 SQL/NoSQL 库；v2 收敛为单库统一存 sessions/memories/evals/metrics。
- **工具接口**：Python 函数或 Toolkit 类，**签名自动生成 schema**；100+ 内置 toolkits；**MCP 一等支持**（stdio / streamable HTTP / SSE），v2.x 还加了带身份/作用域的自定义 MCP 工具（`MCPServerConfig`）。
- **规划/推理**：`ReasoningTools`（显式 CoT 工具）/ `reasoning=True`（专门推理模型）/ instructions 引导，三选一或组合。
- **多 Agent 交接**：Team 的 Route/Coordinate/Collaborate 三模式做动态交接；Workflow 做确定性步骤编排（可暂停/恢复）。
- **人在环**：confirmation gates（危险操作需批准）+ pre/post-run 钩子；AgentOS 侧有审批流、审计日志。
- **沙箱**：**未找到 Agno 内置代码执行沙箱/隔离容器的一手证据**；隔离主要在**运行时层**——AgentOS 提供多用户会话隔离、RBAC/JWT、per-user isolation，并主打 BYOC/自托管（AWS/GCP/Railway/airgapped）让数据留在你的边界内。工具级安全靠 confirmation gates + 作用域 MCP 工具。

## 6. 与同类相比的独特取舍（为什么有人选它）

- **性能是核心卖点**（官方 2025-10 基准，Apple M4 MacBook Pro；**厂商自测，需谨慎**）：Agent 实例化 **~3μs**、单 Agent 内存 **~6.6KB**（平均约 **3.75KiB**）；官方声称比 LangGraph 快 ~529×、省内存 ~24×（LangGraph ~1.6ms / 160KB），也快于 PydanticAI（~171μs）与 CrewAI（~210μs）。取舍：把"每 Agent 开销"压到极低，换来"单机上万并发会话"。
- **"纯 Python、无 graph/无 chain"**：对比 LangGraph 的显式图、DSPy 的编译式管线，Agno 主打直接写 Python 类，学习曲线低。
- **框架 + 运行时打包**：AgentOS 把 FastAPI 服务/RBAC/观测/控制面开箱给你，省掉自建 ~4 个月运行层（厂商话术）。对比只做框架的 CrewAI/AutoGen，Agno 更"到部署为止"。
- **私有优先 / 自托管**：数据不出你的云，对合规敏感团队友好——这是它相对托管型平台的差异点。
- **成本**：作为对照，v2 把 Agent 改为无状态是为可扩展性，代价是状态必须外置到 DB、会话管理心智从对象转到存储层。

## 7. 采用度信号

- **GitHub star**：约 **40,837（2026-06-25）**，release 页显示 **~41k**；Python 占比 99.7%。
- **贡献者**：**400+ contributors**（2026 年 2 月官方称突破里程碑），2 月单月 15+ 首次贡献者。
- **依赖/使用**：GitHub 显示被 **2,700+ 项目**使用（"Used by"）。
- **势头**：2026 年 2 月单月 10 个大版本；官方社区月报展示 17 个生产应用、称"数百个生产部署"（未给精确数）。
- **知名用户/企业名单**：**未找到可靠的一手客户名单**（官方页面多为泛化表述）。

## 8. 来源

1. Agno 官网（定位/AgentOS/组件）：https://www.agno.com/ 与 https://www.agno.com/agentos
2. GitHub 仓库（license、star、版本、"build/run/manage agent platforms"）：https://github.com/agno-agi/agno
3. Agno 2.0 发布公告（2025-09-09、stateless、AgentOS、统一存储/知识）：https://www.agno.com/blog/introducing-agno-v2
4. 2026-02 社区月报（40K star、MPL→Apache 许可变更、400 贡献者）：https://www.agno.com/blog/community-roundup-february-2026
5. 官方文档 Agents 介绍（"stateful control loop around a stateless model"、Agent 组成）：https://docs.agno.com/agents/introduction 与 https://docs.agno.com/introduction
6. 第三方深度拆解（run loop、Team 三模式、20+ 向量库、性能基准表、HITL、MCP）：https://github.com/dgunning/research/blob/main/agno-framework-deep-dive/README.md
7. WorkOS 工程博客（面向 Python 团队的框架综述、声明式组件）：https://workos.com/blog/agno-the-agent-framework-for-python-teams
8. Tracxn（融资 ~$5.4M / 2024-08，二手，需谨慎）：https://tracxn.com/d/companies/agno/__gaWccvuQ-KZgWWIO81dQZBJqBF0sfbhpN5_dDCfQDWM
