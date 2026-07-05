# Pydantic AI — 技术底稿(快照:2026 年年中)

> 事实核查快照日期:2026-07-04。带「⚠️ 未核实/估算」标记的为无法从一手来源确证的内容。

## 1. 一句话定位

Pydantic AI 是 Pydantic 团队出品的**类型安全 Python agent 框架**,官方自述为「A Python agent framework designed to help you quickly, confidently, and painlessly build production grade applications and workflows with Generative AI」,GitHub 仓库标语是「AI Agent Framework, the Pydantic way」。

- **出品方**:Pydantic team(Pydantic Services Inc.)——即 Pydantic 数据校验库、FastAPI 底层校验层、Logfire 可观测性平台的同一批人。设计初衷是「bring that FastAPI feeling to GenAI app and agent development」。
- **许可**:MIT(Copyright Pydantic Services Inc. 2024–present)。
- **2026 状态**:**活跃、未改名、未被收购、未停更**。仓库创建于 2024-06-21;v1.0 稳定版于 **2025-09-04** 发布;v2.0.0 于 **2026-06-23** 发布(经历 7 个 beta),快照时最新版本 v2.5.0(2026-07-04),累计 275 个 release、约 2325 次 main 分支提交。有明确版本策略:v1 承诺发布后至少 6 个月无破坏性变更,v2 发布后 v1 继续提供至少 6 个月安全修复。

## 2. 解决什么问题 / 栈中位置

**问题**:把 LLM 的非结构化文本调用,变成**类型安全、可校验、可测试、可观测**的工程构件——把 Pydantic 的「用类型定义 schema + 运行时校验」范式带到 agent 开发,让结构化输出、工具参数、依赖注入都被静态类型检查器(mypy/pyright)和 Pydantic 运行时双重把关。

**栈中位置**:属于 **agent 编排框架 / agent harness 层**(等价生态位:LangChain/LangGraph、CrewAI、Google ADK、OpenAI Agents SDK)。它不是模型、不是推理基础设施、不是托管平台。它向上把 LLM 封装成 Agent 对象,向下通过统一 Model 抽象对接各家 LLM。

**与底层 LLM 的关系**:**模型无关(model-agnostic)**。官方声称支持「virtually every model and provider」,点名的有 OpenAI、Anthropic、Google Gemini、DeepSeek、Grok(xAI)、Cohere、Mistral、Perplexity,以及 Azure、Amazon Bedrock、Google Cloud、Groq、Ollama、LiteLLM 等云/网关。LLM 调用被抽象为 `ModelRequestNode`,可运行时替换 model 而不改 agent 逻辑。

## 3. 架构与核心组件

- **Agent**:核心接口与「容器」,捆绑 instructions/system prompt、function tools/toolsets、结构化 output type、dependencies、LLM model、model settings、capabilities。类型上是泛型 `Agent[DepsType, OutputType]`,便于静态检查。设计为可复用(类比 FastAPI app 实例)。
- **pydantic-graph(执行引擎)**:每个 Agent run 底层跑在 `pydantic-graph` 上——一个**通用、类型中心的有限状态机库**。它**不依赖 pydantic-ai**,可独立用于任何 workflow。Agent 的运行循环就是在图节点间迁移。
- **图节点(真实构件,即「循环」)**:`UserPromptNode`(装配指令+用户输入)→ `ModelRequestNode`(发请求给 LLM)→ `CallToolsNode`(处理响应、执行工具)→ 循环回到 `ModelRequestNode` 或到达 `End`。
- **工具层**:`@agent.tool` 装饰的函数;`Toolset`(抽象基类 `AbstractToolset`)用于成组管理工具,`MCPToolset` 用于对接 MCP server。
- **Capability(能力,扩展主机制)**:官方定义「a reusable, composable unit of agent behavior」,可捆绑 tools + lifecycle hooks + instructions + model settings 四类,比单个 tool 更高层——适合封装「工作流」(如退款流程 = 退款指令 + 退款工具 + 审批门 + 提升推理强度,一次加载)。内置 capability:`Thinking`、`WebSearch`/`WebFetch`、`ImageGeneration`、`MCP`、`ToolSearch`。支持 `defer_loading=True`,把能力折叠成「一行目录条目」,由模型按需加载以省 prompt。
- **RunContext / dependencies(依赖注入 + 记忆入口)**:运行期上下文,工具通过 `ctx.deps` 拿到注入的依赖、通过 `ctx.usage` 拿到用量。
- **Harness(能力电池库,独立包 `pydantic-ai-harness`)**:见第 5 节。
- **Durable execution 层**:通过 `TemporalAgent` 等包装器把 run 映射到持久化 workflow,见第 4/5 节。
- **可观测性**:原生 Logfire / OpenTelemetry 集成(非营销:Thoughtworks Radar 亦点名 first-class OTel 观测)。

## 4. 一步步怎么运转(控制/编排回路)——最重要

用户调用 `agent.run('prompt', deps=...)`(或 `run_sync` / `run_stream` / `iter`),流经如下回路:

1. **入口**:用户 prompt 进入 run 方法,建立初始上下文。
2. **装配指令(`UserPromptNode`)**:收集并排序 static 与 dynamic instructions/system prompt。static 排在 dynamic 之前——官方说明这是为了 **prompt caching** 优化。
3. **发模型请求(`ModelRequestNode`)**:把装配好的 prompt+指令+上下文发给 LLM。
4. **收模型响应**:得到 `ModelResponse`,内容要么是文本输出,要么是若干 tool call 规格。
5. **判定与执行工具(`CallToolsNode`)**:若模型请求了工具,则执行——独立工具可**并行**,否则**顺序**。执行前用 **Pydantic 校验工具参数**;工具在依赖上下文中运行(`RunContext`);结果封装为 `ToolReturnPart`。
6. **参数校验失败 → 回灌重试**:工具参数校验错误(以及后面的输出校验错误)会**作为 retry 请求回传给模型**,让它用修正后的参数重试,直到达到 retry 上限。
7. **回环**:工具结果打包进下一个 `ModelRequestNode`,回到第 3 步。「一次 run 可能代表整段对话,消息交换次数无上限。」
8. **输出校验与终止**:当收到匹配 `output_type` 的文本/结构化输出,用 Pydantic 校验。tool-based 输出用「default per-tool limit」的 retry 预算,text 输出用「single global budget」。校验通过 → 图到达 `End` 节点。
9. **返回**:得到 `RunResult`,含 `result.output`(带完整静态类型)、usage 统计、完整消息历史(`all_messages()`)。

**两种驱动模式**:
- `run()`:高层,自动跑完整个图,返回 `RunResult`。
- `iter()`:低层,返回 `AgentRun`,可 `async for node in agent_run` 逐节点迭代,或用 `await agent_run.next(node)` **手动驱动**——可在节点执行前检查/修改/跳过。这是「讲课能拆到底」的关键钩子。

**流式**:`run_stream()` 流式吐最终输出文本;`run_stream_events()` 吐原始 `AgentStreamEvent`(tool call、delta、part 迁移)。`end_strategy='graceful'/'exhaustive'` 时,文本输出后的 tool call 仍可执行。

## 5. Harness 层设计

**上下文/记忆管理**:核心靠 `RunContext` + dependencies 注入 + 消息历史(`message_history=result.all_messages()` 可在 agent 间传递)。Harness 包补充:**滑动窗口对话裁剪**、**LLM 驱动摘要**、context/迭代边界前的**限额警告**、以及 memory 与 session 持久化能力。

**工具接口**:`@agent.tool` 函数 → 参数由 Pydantic 校验 → 失败回灌重试。成组用 Toolset;跨大工具集用 `ToolSearch`(渐进式发现「deferred tools」)。

**规划**:无独立「planner」组件;规划隐含在 LLM 的 tool-call 循环里。复杂显式控制流交给 pydantic-graph 状态机。Harness 另提供「deep agents」(planning + 文件操作 + 任务委派 + 沙箱代码执行)。

**多 agent 交接**(三种真实模式):
1. **Agent delegation(委派)**:在**工具函数内部** `await delegate_agent.run(prompt, usage=ctx.usage, deps=ctx.deps)`;父 agent 保持控制权,委派完成后收回。传 `usage=ctx.usage` 累计 token,传 `deps=ctx.deps` 共享依赖。
2. **Programmatic hand-off(程序化接力)**:应用代码顺序调用 `agent1.run(...)` → `agent2.run(...)`,由业务逻辑/人决定下一个调谁;用 `message_history=result.all_messages()` 传递上下文。若要彻底交出、不再返回,可用 output function。
3. **Graph-based control flow**:用 pydantic-graph 显式定义非线性/条件式编排。

**人在环(HITL)**:v1 引入 **Human-in-the-Loop Tool Approval**——可标记某些 tool call 在执行前需批准。

**沙箱**:核心不含沙箱;Harness 提供 **Code Mode**(通过 **Monty** 做沙箱化 Python 执行,「一次 run_code 调用替代 N 次 tool call」)、**Filesystem**(读写编辑搜索,带路径穿越防护)、**Shell**(带 allowlist/denylist/timeout)。另有安全护栏:输入/输出校验、secret masking、成本追踪、卡死循环检测与错误恢复。

**Harness 包状态**:`pydantic-ai-harness`,MIT,官方维护,**0.x 版本**(API 未稳定,minor 版可能含破坏性变更),快照时最新 v0.5.0(2026-07-01),需 Python 3.10+ 与 `pydantic-ai-slim>=1.95.1`;`[codemode]`(Monty)、`[logfire]` 为可选 extra。

**Durable execution(harness 关键卖点)**:官方维护 **4** 个持久化后端集成——**Temporal、DBOS、Prefect、Restate**(与厂商团队共维护,只用 pydantic-ai 公开接口);另有第三方 Kitaru、Apache Airflow。Temporal 集成机制(一手来源):用 `TemporalAgent` 包装 agent,**所有非确定性工作(模型调用、工具执行、外部 API)自动下放为 Temporal Activities**,agent 协调逻辑本身成为确定性 Workflow;Activity 结果记入 workflow history,重启后从 history **确定性重放**、取缓存结果而非重跑;transient 失败由内置 retry policy 处理。这让 agent 能跨 API 抖动/进程重启保住进度,并支持长时/异步/HITL 工作流。

## 6. 与同类相比的独特取舍(为什么有人选它)

- **类型安全是第一性原理**:泛型 `Agent[Deps, Output]` + mypy/pyright 静态检查 + Pydantic 运行时校验双保险;结构化输出「即到即验」(streamed structured outputs with immediate validation)。对比 LangChain 系,类型契约更硬。
- **「FastAPI feeling」的 DX**:依赖注入、装饰器工具、显式类型,面向已用 Pydantic/FastAPI 的 Python 工程师零学习摩擦。
- **图与框架解耦**:pydantic-graph 可独立使用,复杂控制流不必绑死在 agent 抽象上。
- **可观测性开放标准**:原生 OpenTelemetry/Logfire,非私有埋点(Thoughtworks Radar 点名此为优势)。
- **生产化取向**:官方强调「Building GenAI applications is still just engineering」、100% 测试覆盖、durable execution、HITL 审批、evals 工具。定位偏「稳、可测、可上生产」而非「最快出 demo」。
- **代价/权衡**:Harness 仍在 0.x(API 不稳);相比 LangGraph 生态,现成集成/模板更少 ⚠️(此对比为定性判断,未量化核实);「规划」无独立组件,重度依赖模型自身 tool-call 能力。

## 7. 采用度信号

- **GitHub star**:**18,203**(pydantic/pydantic-ai,快照 2026-07-04 经 GitHub API 核实);fork 2,298,open issues 514,约 4.3k dependents。
- **下载量**:官方 v1 公告称 v1 前累计「a stunning 15 million downloads」(时点为 2025-09-04 前后)。
- **Thoughtworks Technology Radar**:2025-11 列为 **Trial**(此前 2025-04 为 Assess);评语称其为「stable, well-supported, open-source framework for building GenAI agents in production」,并称「joins the ranks of other popular agent frameworks like LangChain and LangGraph」。
- **生态背书(间接)**:Pydantic 校验层被 OpenAI SDK、Google ADK、Anthropic SDK、LangChain、LlamaIndex、CrewAI、Instructor 等广泛使用——同一团队出品为 Pydantic AI 提供信誉背书(此为背景信任信号,非直接采用数据)。
- **知名企业具名用户**:**未找到公开的具名生产用户清单**(v1 公告与官方页面均未点名具体公司)。⚠️
- **势头**:发布节奏密集(2024-06 建仓 → 2025-09 v1 → 2026-06 v2 → 快照时 v2.5.0),durable execution 后端从 1 个扩到 4 个官方集成,判断为**上升势头**(定性)。

## 8. 来源

1. GitHub 仓库(标语/特性/版本):https://github.com/pydantic/pydantic-ai
2. GitHub API(star/fork/license/日期,核实用):https://api.github.com/repos/pydantic/pydantic-ai
3. 官方文档 · Agents(运行循环/图节点):https://pydantic.dev/docs/ai/core-concepts/agent/
4. 官方文档 · Capabilities(能力机制):https://pydantic.dev/docs/ai/core-concepts/capabilities/
5. Pydantic AI Harness 仓库(电池库/Code Mode/沙箱):https://github.com/pydantic/pydantic-ai-harness
6. 官方文档 · Durable Execution 概览(Temporal/DBOS/Prefect/Restate):https://pydantic.dev/docs/ai/integrations/durable_execution/overview/
7. Temporal 工程博客(durable 架构机制):https://temporal.io/blog/build-durable-ai-agents-pydantic-ai-and-temporal
8. Pydantic AI v1 发布文(v1 日期/版本策略/1500 万下载):https://pydantic.dev/articles/pydantic-ai-v1
9. Thoughtworks Technology Radar(采用度评级):https://www.thoughtworks.com/radar/languages-and-frameworks/pydantic-ai
10. 官方多 agent 文档(委派/接力机制):https://github.com/pydantic/pydantic-ai/blob/main/docs/multi-agent-applications.md
