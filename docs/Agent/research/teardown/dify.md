# Dify 事实底稿(快照:2026 年年中)

> 研究对象:Dify —— 开源 LLMOps / agentic 应用开发平台。
> 快照时点:2026-07。所有星标/版本数字都标注了核对时点。凡估算或未证实处均显式标注。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**:Dify 是一个**可视化、自托管的 LLM 应用与 agentic 工作流开发平台**。官方 GitHub 仓库描述在 2026 年年中已更新为 "Production-ready platform for agentic workflow development."(早期描述强调 "AI workflow + RAG pipeline + agent + model management + observability")。它把 RAG、Agent、模型管理、可观测性、Backend-as-a-Service 打包进一个可视化画布。
- **出品方**:**LangGenius, Inc.**,总部 Sunnyvale, California(Crunchbase / Dealroom 记为 LangGenius Inc.)。项目 2023 年 3 月上线。
- **许可**:**Dify Open Source License** —— 基于 **Apache 2.0** 外加附加条款。附加条款主要有两条:(a) 不得用 Dify 做**多租户 SaaS 服务**运营(除非取得商业授权);(b) 不得移除/修改 console 与应用中的 Dify LOGO 与版权信息。因此严格说它**不是纯 OSI 意义上的开源**,是「source-available + 商业条款」。
- **2026 状态:活跃、加速**。2026 年 3 月完成 **$30M Series Pre-A** 融资(领投 HSG,跟投 GL Ventures、Alt-Alpha Capital、5Y Capital、Mizuho Leaguer Investment、NYX Ventures)。周更节奏;最新稳定版 **1.15.0(2026-06-25 发布)**。未改名、未被收购、未停更。

---

## 2. 解决什么问题、在 agent 技术栈中的位置、与底层 LLM 的关系

- **解决的问题**:让开发者(乃至非开发者)不写胶水代码就能把 LLM 拼成生产级应用——用可视化画布编排 prompt、RAG、工具调用、agent 推理、条件分支、人工审批,并自带日志/追踪/API 暴露。核心叙事是「从 solution adopter 变成 solution builder」。
- **栈内位置**:**平台层 / 低代码编排框架**,而不是一个单薄的 agent 库。它同时是:
  - **编排框架**(workflow graph engine + Agent 节点);
  - **平台 / LLMOps**(模型管理、可观测性、多租户、marketplace);
  - **Backend-as-a-Service**(每个应用自动生成 REST API)。
  它比 LangChain 这类「库」更靠上(带 UI、带部署、带运维),比一个纯 agent runtime 更宽(覆盖 RAG + workflow + HITL)。
- **与底层 LLM 的关系**:**模型无关(model-agnostic)**。通过 provider 抽象接入 GPT、Claude、Gemini、Mistral、Llama3、DeepSeek-R1、o1/o3 系列,以及任何 OpenAI-API 兼容端点和自托管(Ollama 等)。自 **v1.0.0(2025-02)** 起,所有模型都从核心解耦、以**插件**形式提供。Dify 自身不训练模型,是模型之上的编排/运维层。

---

## 3. 架构与核心组件(点名真实构件)

微服务架构,几个真实容器/服务(来自 docker-compose、环境变量文档与 DeepWiki 架构页):

- **api(Flask,Python)**:主应用服务器,承载所有 REST 端点与业务逻辑。镜像 `langgenius/dify-api`。配置用 Pydantic `BaseSettings`(`/api/configs/feature/__init__.py`)。
- **worker(Celery)**:Redis 背书的异步任务队列——文档索引、知识库处理、以及(1.13.0 起)流式工作流执行。用 `CELERY_WORKER_AMOUNT` / `CELERY_AUTO_SCALE` 扩缩。
- **web(Next.js / React)**:前端,状态管理用 Zustand、Jotai、TanStack React Query。
- **sandbox(`langgenius/dify-sandbox`,Go 写)**:隔离执行 Code 节点(Python / Node.js)与 Template Transform(Jinja2)的**独立沙箱服务**,可开关网络访问。
- **ssrf_proxy**:限制沙箱代码/HTTP 节点向内网发请求,做 SSRF 防护。
- **plugin daemon(`dify-plugin-daemon`)**:管理插件生命周期(见 §5)。
- **数据层**:
  - **PostgreSQL 15**(默认;也支持 MySQL 8.0)—— 元数据/应用定义/日志。
  - **Redis 6** —— Celery broker + 缓存 + 节点间事件传输(1.13 起还用于 PubSub,`PUBSUB_REDIS_URL`)。
  - **向量库**:通过工厂模式 `VectorFactory`(`/api/core/rag/datasource/vdb/vector_factory.py`)抽象,支持 **20+ 实现**,默认 **Weaviate**,另有 Qdrant、Milvus、pgvector、oceanbase、myscale、relyt 等。
  - **对象存储**:Apache OpenDAL 抽象,支持 S3 / Azure Blob 等。
- **编排核心**:**Queue-based Graph Engine**(队列式图引擎,1.9.0 起,见 §4)+ 应用 runner(chat / advanced-chat / workflow / agent)+ **Agent 节点**(自主推理,含可插拔 Agent Strategy)+ **model runtime**(provider 抽象)+ **tool 层**(50+ 内建 + 插件)。

> 注:仓库语言构成约 TypeScript 52% / Python 44%(GitHub 页面数字,随时点变动)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 本节最详

Dify 有两条相关但不同的回路:**workflow 图执行**(宏观编排),以及 **Agent 节点内部循环**(微观自主推理)。讲课时两者都要讲。

### A. Workflow 图执行(队列式图引擎,1.9.0,2025-09-23)

用户请求 → 前端调 API(或直接调应用自动生成的 REST 端点)→ 触发一次 workflow run:

1. **入队而非直跑**:所有节点任务进入**统一队列**,由调度器(scheduler / dispatcher)管理依赖与顺序(引擎原话:"All tasks enter a unified queue, where the scheduler manages dependencies and order")。这取代了旧的直接递归执行模型。
2. **worker pool 按负载自动伸缩**,并行分支不再各自维护难以复现的状态——队列模型统一管理分支状态、降低并行执行报错。
3. **ResponseCoordinator** 负责把多个节点的流式输出按正确顺序拼装给用户(保证 streaming 的时序)。
4. **可从任意节点开始执行**——支持 partial run、resume、子图调用(subgraph invocation)。
5. **CommandProcessor** 支持运行中 pause / resume / terminate 的外部控制指令。
6. 执行步数上限、worker 数、伸缩阈值都可配,但**默认开启、零额外配置**。
7. 节点类型(真实):**LLM、Knowledge Retrieval、Agent、Code、HTTP Request、Template Transform、IF/ELSE 条件分支、Iteration(对 list 逐项循环)、Loop、变量聚合、Human Input(人工输入)、Trigger** 等。LLM 节点默认流式输出;Knowledge Retrieval 支持向量 / 关键词(BM25)/ 混合检索,可配 top-k 与 rerank。

> 1.13.0(2026-02-11)执行架构再次重构:**流式 workflow 执行 + Advanced Chat 执行改到 Celery worker 里跑**(非流式仍在 API 进程),新增强制队列 `workflow_based_app_execution`。这一步是为了支撑 HITL 的**有状态 pause/resume**。

### B. Agent 节点内部循环(自主推理)

当图走到一个 **Agent 节点**时,控制权交给 LLM 做自主的多步工具推理,三阶段:

1. **初始化(Initialization)**:装载 instructions(角色/目标/上下文,自然语言,可用 Jinja2 引用上游节点变量)、query(用户输入/任务)、工具集、上下文;设定 **Maximum Iterations**(防死循环的安全上限——简单任务建议 3–5,复杂研究 10–15)。记忆用 **TokenBufferMemory** 控制记住多少条历史消息。
2. **迭代循环(Iterative loop)**:准备 prompt → 带工具信息调 LLM → 解析响应 → 若需调用工具则执行并把结果写回上下文 → 再次调 LLM。**推理策略(Agent Strategy)可插拔**:
   - **Function Calling**:把工具定义直接经 `tools` 参数交给 LLM 原生 function-calling(适合 GPT-4、Claude 3.5 等)。
   - **ReAct**:用结构化 prompt 引导显式 **Thought → Action → Observation** 循环(适合 function-calling 弱的模型,推理链透明)。
   - Agent Strategy 本身是**插件/开放标准**,可自定义——官方称把 Dify 变成「AI 推理策略的试验台」。
3. **最终响应(Final response)**:任务完成或触顶迭代上限时返回。输出含 final answer、tool results、reasoning trace、iteration count、success status、结构化日志(供追踪)。

> 关键区分:**旧式 workflow** 里每次工具调用是「预编排的固定动作」;**Agent 节点**把「用哪个工具、何时用」交给 LLM 自主判断。二者可组合(routing / handoff:把 Agent 节点当作 LLM 节点的扩展,拆解复杂问题)。

---

## 5. Harness 层设计

- **上下文 / 记忆管理**:Agent 节点用 **TokenBufferMemory** 按 token 预算保留最近 N 条消息;workflow 变量在节点间用变量系统 + Jinja2 引用传递;长期知识经 RAG(知识库检索)注入而非塞进对话记忆。
- **工具接口**:两类——(1) 50+ 内建工具(Google Search、DALL·E、Stable Diffusion、WolframAlpha 等);(2) 插件工具(Perplexity、Slack、Firecrawl、Jina、ComfyUI 等)。工具需授权凭证 + 清晰用途说明 + 参数定义(参数可自动生成或手工配置)。**MCP 双向支持(v1.6.0,协议版本 2025-03-26)**:既能作 MCP client 调外部 MCP server(Linear、Notion、Zapier、Composio),也能把 Dify 应用**暴露为 MCP server** 供 Claude Desktop、Cursor 等调用。
- **规划**:没有独立的「全局 planner」组件;规划内生于 Agent 节点的迭代循环(ReAct 的 Thought 或 function-calling 的模型自决),宏观「计划」由人在画布上显式编排为图。
- **多 agent 交接(handoff)**:通过 **routing + handoff** 模式实现——把 Agent 节点当 LLM 节点的扩展,配合条件分支/自定义路由按钮把控制流导向不同分支/子 agent。官方**未提供**成熟的「autonomous multi-agent 协商/黑板」原语;多 agent 更像「显式编排的图 + 分支」。(判断,基于现有文档)
- **人在环(HITL)**:**Human Input 节点(v1.13.0,2026-02-11)**。工作流可在关键决策点**原生暂停**,推送可定制表单(web app 内展示或邮件发给工作区成员/外部邮箱),人可 review 输出、编辑变量、点自定义按钮(Approve / Reject / Escalate)决定后续分支。**引擎持久化暂停态**,可挂起很久再可靠 resume(`HUMAN_INPUT_GLOBAL_TIMEOUT_SECONDS` 默认 604800 秒=7 天)。1.15.0 增强表单:支持下拉选择与文件上传。
- **沙箱**:独立 **DifySandbox**(Go)隔离执行 Code/Template 节点代码,网络可关;**ssrf_proxy** 防内网穿透。注意——**插件的隔离走另一套**:靠**加密签名 + 预安装审核**,而非运行时沙箱(见下)。
- **插件运行时(v1.0.0,2025-02)**:插件从核心解耦,四种运行时:
  - **本地部署**:插件作为**父进程管理的子进程**,经 **stdin/stdout 管道**通信,由 plugin daemon 管生命周期;
  - **SaaS**:serverless,**AWS Lambda** 承载高并发;
  - **企业版**:私有可控可信运行时;
  - **远程调试**:TCP 长连接 + Redis 做状态路由。
  支持 **reverse call**(插件反向调用 Dify 已鉴权的模型/工具/应用)。插件打包为 `.difypkg`,marketplace 上每个插件过代码审核并声明数据处理与权限。

---

## 6. 独特设计取舍(为什么有人选它)

- **可视化画布 + 生产运维一体**:相对 LangChain(纯库,自己搭运维),Dify 自带 UI、日志、追踪(Langfuse / Opik / Arize Phoenix 集成)、多租户、API 暴露。适合「想快速上线并运维」的团队。
- **RAG + Agent + Workflow + HITL 全在一个平台**:不用东拼西凑。知识库检索、agent 自主推理、确定性工作流、人工审批在同一画布内组合。
- **插件生态解耦**:模型/工具/策略都是可独立升级的插件,升级不需整平台大版本。
- **自托管 + source-available**:数据可完全私有部署(Docker Compose / K8s Helm / Terraform / AWS CDK / 阿里云),对合规敏感的企业有吸引力。
- **代价 / 取舍**:(1) 许可有商业条款(禁多租户 SaaS、禁去 LOGO),不是纯 OSI 开源;(2) 强可视化画布对**超复杂/高度定制**逻辑不如纯代码框架灵活;(3) 多 agent 更偏「显式编排」,缺成熟自治多智能体原语(判断)。相对 Flowise/n8n:Dify 更偏「LLM 原生 + RAG/Agent 深度」,n8n 更偏「通用自动化连接器」(判断,基于对比文章)。

---

## 7. 采用度信号

- **GitHub star**:约 **148k**(langgenius/dify,核对时点 2026-06/07,来自 1.15.0 release 页与仓库页;另一独立来源 theplanettools 记 2026-04 为 138k+ —— 数字随时点抬升,取用请注明时点)。
- **仓库活跃度**:800+ contributors、10,000+ commits、周更(来源:第三方综述 skywork/theplanettools,**未在官方页逐项二次核实**,标注为估算/二手)。
- **规模指标(官方 $30M 融资博文,2026-03)**:GitHub 上**第 51 高 star** 开源项目;运行在 **140 万+ 台机器**、**175+ 国家/地区**;**280+ 家企业**、**2,000+ 团队**从「采用者」转为「构建者」。另有二手来源称「100 万+ 应用已部署」(未在官方核实,二手)。
- **知名用户 / 集成方**:Toptal 有内部 fork(toptal/dify-ds);可观测性侧与 Langfuse、Arize Phoenix、Opik 官方集成;marketplace 有 DupDub、Zapier、Composio 等第三方插件。**具体企业客户名单未找到权威公开清单**(标注:未找到公开数据)。
- **势头**:2026 上半年连续大版本(1.6 MCP、1.9 队列图引擎/知识管线、1.13 HITL、1.15 difyctl / CoT 可视化),加 $30M 融资,方向明确指向「生产级 agent + 企业运维控制 + 面向非开发者 + 生态」。

---

## 8. 来源(一手优先)

1. GitHub 仓库 README(定位、许可、特性、tech stack、版本):https://github.com/langgenius/dify
2. Dify $30M 融资 + 采用度官方博文(2026-03):https://dify.ai/blog/dify-raises-30m-tomorrow-s-organizations-will-be-built-by-people-and-agents
3. 官方文档 · Agent 节点(执行三阶段、Function Calling / ReAct、参数、TokenBufferMemory):https://docs.dify.ai/en/guides/workflow/node/agent
4. 官方博文 · Agent 节点原理(策略即插件、workflow vs 自主推理):https://dify.ai/blog/dify-agent-node-introduction-when-workflows-learn-autonomous-reasoning
5. 1.9.0 release 讨论(Queue-based Graph Engine、Knowledge Pipeline;2025-09-23):https://github.com/langgenius/dify/discussions/26138
6. 1.13.0 release 讨论(Human-in-the-Loop、执行改到 Celery、pause/resume;2026-02-11):https://github.com/langgenius/dify/discussions/32245
7. 官方博文 · 插件系统设计与实现(四运行时、stdio、reverse call、签名隔离):https://dify.ai/blog/dify-plugin-system-design-and-implementation
8. 官方博文 · v1.6.0 双向 MCP 支持(协议 2025-03-26):https://dify.ai/blog/v1-6-0-built-in-two-way-mcp-support
9.(架构辅证,二手)DeepWiki 架构页:https://deepwiki.com/langgenius/dify ;1.15.0 release:https://github.com/langgenius/dify/releases/tag/1.15.0
