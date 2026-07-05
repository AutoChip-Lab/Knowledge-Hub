# Mastra 事实底稿(快照:2026 年年中)

> 研究对象:**Mastra** —— TypeScript AI agent 框架,由前 Gatsby 团队打造。
> 快照时点:2026-07-04。所有"当前状态"断言以此日期为准。

---

## 1. 一句话定位 / 出品方 / 许可 / 2026 状态

- **一句话定位**:Mastra 是一个开源的 TypeScript agent 框架,把 **agents(自主决策)、workflows(图式编排)、memory(记忆)、RAG、evals、observability** 打包进一套"batteries-included"的库,让 web/TS 开发者用普通 TypeScript 就能构建生产级 AI 应用。官方自述:"Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack."
- **出品方**:Mastra AI(GitHub org `mastra-ai`),旧金山,YC **Winter 2025** 批次,团队约 30 人。
- **创始人**:**Sam Bhagwat**(CEO)、**Abhi Aiyer**(CTO)、**Shane Thomas**(CPO)。三人此前均出自 **Gatsby**(React 静态站点框架)——注意:Gatsby 的原始创始人是 **Kyle Mathews**,他**不是** Mastra 创始人(有二手文章把 Kyle Mathews 误列为 Mastra 创始人,已核实为错误,见第 8 节说明)。Sam 2017 年加入并共同创立 Gatsby Inc.,团队把 Gatsby 做到约 $5M ARR 后被 Netlify 收购。
- **许可**:核心框架 **Apache License 2.0**(仓库内绝大多数代码);任何名为 `ee/` 的目录为 **source-available**,受 "Mastra Enterprise License" 约束(RBAC、SSO、ACL 等企业特性,生产使用需商业授权)。GitHub API 因此把仓库整体许可标为 `NOASSERTION`(混合许可)。⚠️ 注意:官方 `docs/community/licensing` 页只讲 Apache-2.0,对 `ee/` 只字未提;`ee/` 双许可结论来自仓库根 `LICENSE.md` 与 `ee/LICENSE` 文件路径(第 8 节标注)。
- **2026 状态**:**活跃、快速增长、未停更未被收购**。已发布 **1.0(2026-01-20)**,并持续快速迭代:`@mastra/core@1.48.0` 于 **2026-07-01** 发布(仓库 `pushed_at` = 2026-07-04)。**Series A $22M**(2026 年 4 月,前置有 2025-10 的 $13M seed)。

---

## 2. 解决什么问题 / 技术栈定位 / 与底层 LLM 的关系

- **解决的问题**:团队自述 2024-10 开始做 Mastra,起因是"struggling with existing agent development tools"。目标读者是 **JS/TS 生态的 web 开发者**——他们不想为了做 agent 跳到 Python/LangChain,想要类型安全、少样板、能直接跑在 Next.js/Node 里的东西。定位口号之一是 "a framework for the next million AI developers"。
- **在技术栈里的位置**:**编排框架 + harness 层**(不是模型、不是纯托管平台)。它同时提供:
  - **编排框架**:workflows(确定性图)与 agents(LLM 自主循环)两套原语。
  - **harness 能力**:记忆管理、工具接口、上下文压缩、多 agent 交接、human-in-the-loop suspend/resume、evals、observability。
  - **轻量运行/部署层**:server adapters(Express/Hono/Fastify/Koa)、deployers(如 VercelDeployer),以及 `mastra dev` 本地开发服务器 + playground。
  - 商业侧另有 Mastra Cloud(托管)与 `ee/` 企业特性,但**核心是开源库**,非纯 SaaS。
- **与底层 LLM 的关系**:Mastra **自己实现了一个 model router**,用 `"provider/model"` 字符串(如 `openai/gpt-...`、`vercel/google/gemini-3-flash`)统一寻址,号称覆盖 **133+ providers / 4500+ models**,带自动生成的 TypeScript 类型(IDE 补全)。历史上 Mastra 曾直接构建在 **Vercel AI SDK** 之上;到 1.0 时它有自己的 router,但**仍与 AI SDK v6 互操作**——可直接喂入 `LanguageModelV3` 模型并兼容 `ToolLoopAgent`,同时向后兼容 V1/V2 model 接口。⚠️ 二手来源在"是否仍依赖 Vercel AI SDK"上说法不一(见第 8 节),一手事实是:**Mastra 有自己的 router 抽象层,AI SDK 从"底座"退化为"可选的兼容适配对象"之一**。

---

## 3. 架构与核心组件(点名真实构件)

单一 TypeScript monorepo(99%+ TS,pnpm workspaces + Turbo)。核心构件:

- **Model Router**(`provider/model` 字符串 → provider 配置;JSON provider registry + 自动生成类型;支持直连 provider 与 gateway providers:OpenRouter、Vercel、Netlify、Azure OpenAI、Mastra 自家)。
- **Agent**(`Agent` 类):LLM + tools 的自主循环;`.generate()`(跑完所有工具调用后返回完整结果)/ `.stream()`(流式 token/事件);可选 stop condition;可挂 memory、tools、subagents。
- **Tools**(`createTool()`,来自 `@mastra/core/tools`):字段 `id` / `description` / `inputSchema`(Zod)/ `execute(input, ctx)`;执行上下文提供 `requestContext`、`tracingContext`、`abortSignal` 等。
- **Workflow 引擎**(`createWorkflow()` + `createStep()`):图式确定性编排;控制流原语 `.then()` / `.branch()` / `.parallel()` / `.dowhile()` / `.foreach()`;每步有 `inputSchema`/`outputSchema`(支持 Zod / Valibot / ArkType);`.commit()` 定型;`.start()`(等完成)/ `.stream()`(发事件)。
- **Memory 子系统**(`Memory` 类 + storage provider):message history、working memory、semantic recall(向量)、observational memory(见第 5 节)。
- **Storage / Vector 层**:存储后端如 `@mastra/libsql`(`LibSQLStore`);1.0 引入 **Composite/per-domain Storage**(不同域可配不同后端)。向量库支持 pgvector(`PgVector`)、Pinecone、Qdrant、MongoDB 等。
- **RAG 层**:`MDocument`(文档处理/切块)、`embedMany()` + `ModelRouterEmbeddingModel`、vector store `upsert()`/`query()`。
- **Processor System**(1.0 大改):对进出消息做过滤/变换的处理器管线。
- **Evals**:model-graded / rule-based / statistical 三类,支持自定义 eval。
- **Observability**:1.0 统一 observability schema;可追踪 embedding/retrieval 性能与 agent trace。
- **Server Adapters / Deployers**:`@mastra/express|hono|fastify|koa`(1.0 起为默认部署方式)、`VercelDeployer` 等;`mastra dev` 本地服务器 + playground。
- **MCP**:内置 MCP server 编写能力(可把 Mastra 工具/agent 暴露为 MCP,也可消费 MCP)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 本节最重要

Mastra 有**两条可组合的主回路**:Agent 自主循环(不确定序列)与 Workflow 确定性图(已知序列)。二者可互相嵌套(workflow step 里调 agent;agent 把 workflow 当工具/subagent 用)。

### A. Agent 自主循环(用户 → agent → 工具 → 收敛)

1. **注册**:开发者创建 `Mastra` 实例,把 `Agent`(带 instructions、model、tools、memory)注册进去。运行时用 `getAgent('key')` 取出,或直接持有引用。
2. **入口**:调用 `agent.generate(input, opts)` 或 `agent.stream(...)`。若配了 memory,会传 `{ memory: { resource, thread } }` 来定位对话线程。
3. **组装上下文**:框架把 system instructions + memory 召回(recent messages / working memory / semantic recall / observational memory)+ 本次输入拼成发给模型的消息,并把 tools 的 schema(由 Zod 生成)一并交给 model router。
4. **模型推理 → 决策**:model router 把 `provider/model` 解析到具体 provider,发起调用。模型要么产出最终答案,要么产出一个或多个 **tool call**。
5. **工具执行**:对每个 tool call,框架用 `inputSchema` 校验参数后调用该 tool 的 `execute(input, ctx)`,`ctx` 带 `requestContext`/`tracingContext`/`abortSignal`。工具结果回填进消息历史。
6. **迭代**:带着工具结果再次进模型 —— 循环第 4-5 步,直到模型不再发 tool call(得出最终答案)或命中可选 **stop condition** / 步数上限。
7. **收尾**:`.generate()` 返回聚合结果;`.stream()` 沿途 emit token 与执行事件。之后 memory 子系统把本轮消息写回 thread,并(若开启)触发 observational memory 的后台压缩。

### B. Workflow 确定性回路(已知多步流程)

1. `createStep()` 定义每步(schema + `execute({ inputData, state, setState })`),`createWorkflow()` 用 `.then()/.branch()/.parallel()/.dowhile()/.foreach()` 连接,`.commit()` 定型,注册进 Mastra 实例。
2. `run.start()`(等完成)或 `.stream()`(发执行事件)启动。数据沿 schema 在 step 间流动;跨 step 的共享数据走 `stateSchema` + `state/setState`(无需改 schema),请求级值走 `RequestContext`。
3. 任一 step 可 **suspend**(见第 5 节 HITL):workflow 结果状态变 `suspended`,携带 `suspendPayload`;外部拿到人类/异步输入后用 `resumeStream()` 从最后活动 step 续跑。
4. step 的 `execute` 里可以调普通函数、外部 API、**tool 或 agent** —— 这是两条回路的缝合点。

### C. 多 agent 编排回路(supervisor 模式,见第 5 节)

supervisor agent 把 subagents 挂在 `agents` 属性上,用自己的 `.stream()/.generate()` 协调;**subagent 以 tool call 形式被委派**,委派前后有 `onDelegationStart`/`onDelegationComplete` 钩子拦截。⚠️ 早期的 `.network()`/`AgentNetwork`/`NewAgentNetwork` 已被弃用(将于未来大版本移除),官方推荐迁移到 supervisor agents。

---

## 5. harness 层设计

- **上下文/记忆管理**(`Memory` 类,需 storage provider):
  - **Message history**:`lastMessages: N` 保留最近 N 轮。
  - **Working memory**:持久化结构化用户数据(姓名、偏好、目标),默认 **resource-scoped** 共享。
  - **Semantic recall**:对历史消息做向量语义检索,而非关键词匹配。
  - **Observational memory**(`observationalMemory: true`):长对话时后台 agent 把旧消息压缩成"dense observations",防止上下文溢出。
  - **作用域**:两个标识符 —— `resource`(稳定的用户/实体 id)与 `thread`(隔离单次会话)。同 resource+thread 共享完整消息历史;仅同 resource 则跨 thread 共享 observations/working memory。
- **工具接口**:`createTool()`,Zod `inputSchema` 强校验;`execute(input, ctx)`;支持把工具暴露/消费为 **MCP**。
- **规划**:两种范式并存 —— **Workflow = 显式规划**(开发者画确定性图);**Agent = 隐式规划**(LLM 逐轮自选工具);supervisor 的 routing 也是"LLM 先推理再委派"。
- **多 agent 交接**(supervisor agents):
  - subagents 注册在 `agents` 属性;委派 = **tool call**(可配为后台任务)。
  - `onDelegationStart(ctx)`:委派前触发,`ctx` 带 `primitiveId`/`prompt`/`iteration`;可返回 `proceed`、`modifiedPrompt`、`modifiedMaxSteps` 控制。
  - `onDelegationComplete(ctx)`:委派后触发,带 `result`/`error`/`bail()`;返回 `{ feedback }` 注入 supervisor 记忆。
  - `messageFilter(messages, primitiveId, prompt)`:过滤转发给 subagent 的上下文(防泄漏 + 控 token)。
  - **memory 隔离**:完整上下文可转发给 subagent 做决策,但 subagent 记忆里**只存它自己的委派 prompt + 回复**;每次委派用独立 thread id;`resourceId` 派生为 `{parentResourceId}-{agentName}`,做到"每次委派隔离、跨重复调用持久"。默认只有 subagent 的**文本**回到 supervisor 模型上下文,`includeSubAgentToolResultsInModelContext: true` 才带上嵌套工具结果。
- **人在环(HITL)**:workflow 级 **suspend/resume** + 状态持久化;结果状态 `suspended` 携 `suspendPayload`,`resumeStream()` 续跑。
- **沙箱**:⚠️ **未找到 Mastra 自带代码执行沙箱的一手证据**。工具 `execute` 直接跑在宿主 Node 进程里;隔离依赖开发者自行做(如把工具跑到外部服务/容器)。有 `abortSignal` 做取消,但这不等同沙箱。

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **TS-first、少样板、读起来像普通 TypeScript**:核心卖点是相对 **LangChain(Python 味重、抽象多、样板多)** 更贴近 web 开发者直觉;用 Zod schema + 函数式风格,类型安全 + IDE 补全贯穿 model 名、tool schema、workflow schema。
- **确定性 workflow 与自主 agent 并列一等公民**:很多框架偏一端;Mastra 让"图式可控编排"和"LLM 自主循环"都成原语并可互相嵌套 —— 适合"大部分确定、局部需要自主"的生产流程。
- **batteries-included 单框架**:agents/workflows/memory/RAG/evals/observability/MCP/部署适配器同一套,减少拼装。
- **原生记忆分层**(working / semantic recall / observational)+ supervisor 的记忆隔离与委派钩子,比"手搓 memory"省事。
- **能直接嵌进现有 JS 服务**(Express/Hono/Fastify/Koa adapters)与前端栈(Next.js/React),而非强制独立 runtime。
- **取舍代价**:企业特性(RBAC/SSO/ACL)在 `ee/`,生产用需商业授权;无自带执行沙箱;API 迭代很快(1.x 已到 1.48,历史上 `.network()` 等原语被弃用,升级需跟迁移指南)。

---

## 7. 采用度信号

- **GitHub star**:**25,802**(GitHub API,**2026-07-04** 时点;fork 2,354,open issues 387,watchers 95)。轨迹:2025-02 一周从 ~1,500 冲到 ~7,500(HN 首页);1.0 时(2026-01)约 19.8k;本快照 25.8k。
- **npm 下载**:2025-03 约 60k/月 → 1.0(2026-01)约 **300k+/周** → 有二手称 2026-02 达 ~1.8M/月(⚠️ 后者为二手,量级未在一手页核实)。被称"第三快增长的 JS 框架"(⚠️ 营销口径)。
- **社区**:1.0 时 300+ contributors、~4,800 Discord 成员。
- **点名用户**(公开使用/写过实现):**Replit、PayPal、SoftBank、Adobe、Docker、Elastic、Sanity、Marsh McLennan(75,000 员工)、Range、Counsel Health**。⚠️ 名单来自官方博客/融资稿,"生产使用 vs 试用/撰文"未逐一区分。
- **书**:团队出版《Principles of Building AI Agents》,称 70,000+ 纸质 + 100,000+ 数字分发(二手,融资稿口径)。
- **融资**:Seed **$13M**(2025-10,YC 领投)→ Series A **$22M**(2026-04)。

---

## 8. 来源(URL)

1. Mastra 官方 GitHub 仓库 — https://github.com/mastra-ai/mastra (star/license/features;star 数另经 GitHub REST API `api.github.com/repos/mastra-ai/mastra` 于 2026-07-04 核实为 25,802)
2. Agents 概览(官方 docs)— https://mastra.ai/docs/agents/overview
3. Supervisor agents(官方 docs)— https://mastra.ai/docs/agents/supervisor-agents
4. Memory 概览(官方 docs)— https://mastra.ai/docs/memory/overview
5. AgentNetwork 演进(官方博客,Abhi Aiyer,2025-10-10)— https://mastra.ai/blog/agent-network
6. Announcing Mastra 1.0(官方博客,2026-01-20)— https://mastra.ai/blog/announcing-mastra-1
7. About / 团队页(创始人核对)— https://mastra.ai/about  与 YC 页 https://www.ycombinator.com/companies/mastra
8. Model Provider System(DeepWiki,二手技术剖析)— https://deepwiki.com/mastra-ai/mastra/5-model-provider-system

### ⚠️ 未能完全核实 / 需注意的冲突点

- **创始人姓名冲突**:一篇二手融资稿(technews180)把创始人写成 "Kyle Mathews, Abhi Aiyer, Shane Allen",与官方 About 页 + YC 页的 **Sam Bhagwat / Abhi Aiyer / Shane Thomas** 冲突。**以官方为准**;Kyle Mathews 是 Gatsby 原始创始人,不是 Mastra 创始人;"Shane Allen" 疑为 "Shane Thomas" 笔误。
- **许可细节**:`ee/` 企业许可结论来自仓库文件路径(`LICENSE.md`、`ee/LICENSE`)与二手描述;官方 `docs/community/licensing` 页只讲 Apache-2.0,未提 `ee/`。GitHub API 报 `NOASSERTION` 与"混合许可"一致,但**未逐字读取 ee/LICENSE 全文**。
- **与 Vercel AI SDK 关系**:二手来源分歧("仍构建在 AI SDK 之上" vs "已用自研 router 替代")。一手可确认:Mastra **有自研 model router**,同时 1.0 起**兼容 AI SDK v6 `LanguageModelV3` 与 `ToolLoopAgent`**;确切依赖边界(是否仍把 AI SDK 作为运行时硬依赖)**未在一手页逐字确认**。
- **下载量 ~1.8M/月、"第三快增长 JS 框架"**:二手/营销口径,量级**未在一手页核实**。
- **沙箱**:**未找到** Mastra 自带代码执行沙箱的一手证据(结论:很可能没有内置沙箱,隔离靠开发者自理)。
