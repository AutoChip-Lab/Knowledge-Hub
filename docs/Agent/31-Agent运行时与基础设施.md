# Agent 与 Agent Harness · 第 ㉘ 篇:拆解 · Agent 运行时与基础设施(harness 生态)

> 「Agent 与 Agent Harness」学习系列第 ㉘ 篇 · 案例拆解板块。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ Agent Harness → ⑫–㉘ 主流 Agent 与 Harness 拆解(**本篇**)→ ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:agent 火起来之后,脚下悄悄长出的一层

前面几十篇一直盯着**「脑子」**——agent 怎么循环、怎么用工具、怎么记事、怎么规划。但你只要真把一个 agent 派出去干活,立刻会撞上一堆和「聪不聪明」无关的问题:

- 它想跑一段自己刚写的 Python——**在谁的机器上跑?** 跑崩了、跑出恶意代码怎么办?
- 它得连着跑两小时、跨三次对话还记得你是谁——**这些状态存哪?** 进程一崩是不是就没了?
- 你要把它上线给一千个用户用——**会话之间怎么隔离?身份、密钥、审计谁来管?**

这些都不是「模型更强」能解决的,是**基础设施问题**。于是这两年,在 agent 这层「脑子」之下,悄悄长出了一整层**运行时与基础设施(agent runtime & infrastructure)**,专干那些「无差别的重活」。

```
        ┌─────────────────────────────────────────────┐
        │  应用 / 编排层:你的 agent 循环、planner、框架 │
        └───────────────────┬─────────────────────────┘
                            │ 调用
        ┌───────────────────▼─────────────────────────┐
        │  ★ 本篇:运行时 & 基础设施层 ★               │
        │  ┌────────┐  ┌───────────┐  ┌────────────┐  │
        │  │  E2B   │  │ AgentCore │  │   Letta    │  │
        │  │ 安全执 │  │ 托管运行  │  │ 持久记忆   │  │
        │  │ 行沙箱 │  │ 时/身份/  │  │ /记忆 OS   │  │
        │  └────────┘  │ 网关      │  └────────────┘  │
        │              └───────────┘                   │
        │        └──── 互通协议:MCP / A2A / ACP ────┘  │
        └───────────────────┬─────────────────────────┘
                            │ 承载
        ┌───────────────────▼─────────────────────────┐
        │  云 / OS / 网络(真实的机器)                │
        └─────────────────────────────────────────────┘
```

这一篇拆三块承重墙,各押一件事:**E2B** 押「让 agent 安全地跑代码」、**AWS Bedrock AgentCore** 押「把 agent 托管上生产」、**Letta / MemGPT** 押「让 agent 长出持久记忆」。末尾再横扫把它们黏起来的**协议层**(MCP / A2A / ACP)。

> 读这一篇的正确姿势:**别把它们当成「又几个 agent 产品」。** 它们全都刻意**不是 agent**——是 agent 站上去的地板。地板不出彩,但地板塌了,上面再聪明的脑子也摔死。

---

## 1. 这一类到底是什么、边界在哪、为什么值得单独一章

先给一句最硬的定义:

> **Agent 运行时与基础设施,是一层「不含推理循环、专门为 agent 提供执行、托管、记忆、互通能力」的底座。** 判断某物属不属于这一层,就问一句:**它自己会不会「想下一步做什么」?** 会,它是 agent / 框架(讲通用 agent 与框架的那篇);不会,只等着被调用去「把这件重活干了」,它就是基础设施。

拿本篇三家验一下:

- **E2B** 明说自己**不含推理循环、不含 planner、不做工具选择**——你把一段代码字符串丢给它,它给你一台干净的 Linux microVM 跑完、把结果还你,仅此而已。循环在**你的**代码里。
- **AgentCore** 明说自己**不提供规划器**——推理循环留给你选的框架(LangGraph / CrewAI / Strands 等),它只管「外壳与周边」:隔离、身份、记忆、工具接入、观测、护栏。
- **Letta** 稍特殊:它**同时是 harness、运行时和框架**,自带循环。但它被划进这一章的理由是——它的**内核价值是「有状态运行时」**,是那个把记忆持久化到数据库、让状态跨会话不丢的底座,循环只是顺带。

为什么值得单独一章?因为**这一层的兴衰,直接决定 agent 能不能从「demo」走到「生产」**。讲 Claude Code、讲 Codex 的那几篇里的成品之所以能真跑,底下都趴着这类东西——沙箱、会话隔离、记忆存储。一个类比:**如果 agent 是应用程序,这一层就是操作系统 + 云 + 数据库**——你写 App 时几乎不想它们,但它们决定了你的 App 崩了能不能恢复、能不能扛住一千个用户。它们平时隐身,但整个生态的可靠性,一大半压在这层地板上。

---

## 2. 一次任务在这类系统里怎么流动

因为这一层不「想」、只「承载」,它的生命周期最好从**调用方视角**看:一个 agent 循环转起来,基础设施在被点到时做了什么。挑两个最有代表性的走一遍——一个「执行」(E2B),一个「记忆」(Letta)。

**场景一:agent 要跑一段自己写的代码(E2B)。** 设想讲自主 SWE 的那篇里的 agent,循环转到「跑测试」,它写好了一段 `pytest`:

```
  你的 agent 循环(E2B 之外)——LLM 决定「执行这段代码」,产出代码字符串
     │
     ▼
  ① 建沙箱(控制平面 · REST):Sandbox.create() ──▶ POST /sandboxes
        └─ 经 Client Proxy → Consul 服务发现 → Orchestrator
        └─ Orchestrator 拉起一台 Firecracker microVM,VM 内启动守护进程 envd
        └─ 返回 sandboxId + envdAccessToken(默认 TTL 300 秒)
     │
     ▼
  ② 执行(数据平面 · gRPC 直连 envd:49983):run_code(...) / commands.run(...)
        └─ 绕过 REST 直打 envd,回传结构化对象:stdout / stderr / results(含图表) / error
        └─ 有状态:同一沙箱里 x=1 后 x+=1 返回 2,内核变量保留
     │
     ▼
  ③ 回喂 LLM:拼进上下文 ──▶ 或「完成」,或「再写一段修 bug」→ 回到 ②,复用同一沙箱
     │
     ▼
  ④ 收尾:kill() 立即销毁 / pause() 挂起(连内存一起冻结)→ 之后 connect() 恢复
```

这里藏着 E2B 最该记的一条:**REST 管「机器的生死」(低频、API key 鉴权),gRPC/envd 管「机器里干活」(高频、access token 鉴权)——两条协议、两个平面分离。** 读写文件、跑命令这种高频操作**绕过 REST 直连 envd**,就是为了不让控制平面成为瓶颈。理解这个「双平面」,就理解了 E2B 的骨架。

**场景二:agent 要记住你是谁(Letta)。** 换 Letta,它自带循环,看一个用户消息进来怎么在「有状态」机制里转一圈:请求打到 FastAPI(`POST /v1/agents/{id}/messages`)→ `SyncServer` 从数据库加载该 agent 的持久化状态(memory blocks、最近消息、配置)→ **上下文编译**(把 system prompt + 常驻 memory blocks + recall/archival 统计 + 工具 schema + 消息缓冲拼成上下文)→ 调 LLM,输出 = 推理 + 一个动作 → **动作分派**(记忆编辑改 blocks/写向量库、检索查库回注、普通工具在沙箱执行、或回复用户)→ **每一步的推理、工具调用、结果、消息全部落库**(这是「有状态」的物理基础)→ 若还要继续则回到上下文编译再转一圈。上下文溢出时触发摘要/逐出,但**被逐出的原文仍在库里,可用 `conversation_search` 再捞回**。

对比两个场景,一眼看出这一层的分工:**E2B 是「借完就还的机器」,状态默认随沙箱销毁;Letta 是「永不失忆的账本」,每一步都落库。** 一个把「无状态」做到极致(干净、可弃),一个把「有状态」做到极致(持久、可恢复)——这正是基础设施层最基本的一条张力。

> 一句话:**基础设施不决定「下一步做什么」,但它决定「这一步能不能安全地做、做完记不记得住」。**

---

## 3. 拆开看

把三家分别搬上手术台,再横扫协议层。每家都对着上面的生命周期,看它在哪一环下了重注。

### 3.1 E2B:给 agent 一台「用完即弃」的云端 microVM

**它是谁**:E2B(读作 "e-two-b",取自 "environment to business")是**为 AI agent 提供云端隔离沙箱、执行 LLM 生成代码的开源基础设施**。公司注册在旧金山,创始团队来自捷克(Tomáš Valenta、Vasek Mlejnský),2023 年成立。许可上,主仓库(`e2b-dev/E2B` 等)是 **Apache-2.0**,PyPI 基础包 `e2b` 标 MIT——SDK 与整套 infra 都开源可自部署,托管云则是 freemium + 按秒计费。截至 2026 年中**活跃**:2025 年 7 月完成 2100 万美元 A 轮(Insight Partners 领投),主 SDK 仓库约 **1.28 万 star**(2026-07-04 实测),几乎每天有提交。

**它解决什么**:LLM 会生成代码,或想「操作电脑」,但**直接在你的生产主机上跑 LLM 生成的不可信代码,是在玩火**。E2B 给你一个「一次性、隔离、可联网、有状态」的 Linux 环境,让生成代码**永远不碰你的基础设施**。

**招牌决策:VM 级隔离,不是容器。** 每个沙箱是一台按需启动的 **Firecracker microVM**——AWS Lambda 同款的那套 microVM/KVM,**每个沙箱一个独立内核 + 硬件虚拟化**。为什么不用更轻的 Docker 容器?因为容器**共享宿主内核**——一旦 LLM 跑出的代码利用了内核漏洞,理论上能逃出去碰到别人;而 microVM 每台有自己的内核,安全边界硬得多,你才能**安心跑完全不可信的代码**。代价是它比容器重,E2B 靠快照 + 预热把冷启动压到官方口径约 **150ms**(<200ms,量级来自官方/第三方博客,未做独立基准)。

**核心构件**(名称都来自 `e2b-dev/infra`),按「双平面」理解:

- **控制平面**:REST API(`packages/api/`,Gin/Go,管沙箱生命周期与鉴权,状态存 PostgreSQL + Redis)+ **Orchestrator**(`packages/orchestrator/`,Firecracker 的控制器,需 root,对外暴露 gRPC)。
- **数据平面**:**envd**(`packages/envd/`),**跑在每个 microVM 内部**的守护进程,监听 **端口 49983**,基于 Connect RPC,提供文件系统、进程/命令、PTY 终端 API。高频操作直连它。
- **边缘路由**:Client Proxy / Edge,经 **Consul** 做服务发现,把请求路由到正确的 orchestrator。
- **Template(模板)**:**Dockerfile → 构建 → 转成 Firecracker microVM 快照**,默认模板叫 `"base"`(配了 MCP 则用 `"mcp-gateway"`)。
- **编排底座**:**Nomad**(调度)+ **Consul**(服务发现)+ Terraform IaC,主部署到 GCP(AWS beta);可观测性走 OpenTelemetry → Grafana 栈。仓库 87.9% 是 Go。

**它给 agent 的「记忆」很物理**:不是管 LLM 上下文窗口(那不归它),而是**沙箱状态持久化**。`pause()` **连内存一起冻结**——运行中的进程、已加载的变量全保留;`connect()` 恢复到一模一样的状态。性能上暂停约 4 秒/GiB RAM、恢复约 1 秒,暂停后目前**可无限期保留**。

> ⚠️ 这条能力**目前是 public beta**,有已知问题(多次 resume 后文件变更不持久,见开源 issue e2b-dev/E2B #884)。生产上依赖「暂停-恢复」前,先自己验一遍。

配套产品也点出它往哪扩:**Desktop Sandbox**(给 LLM 的图形化虚拟电脑,支撑 computer-use)、**Fragments**(AI 生成全栈 app 的模板)、**open-computer-use**、**Surf**。

> 反直觉的点:**E2B 最核心的产品,是「一台会被立刻扔掉的电脑」。** 它的价值恰恰在「一次性」——你不该指望它长期保存什么,而该指望它「干净、隔离、跑完即弃」。想要持久,那是 Letta 的活。

### 3.2 AWS Bedrock AgentCore:把「agent 生产化的重活」拆成一堆托管服务

**它是谁**:Amazon Bedrock AgentCore 是 AWS 的**框架无关、模型无关的托管 agent 运行平台**——一组**可独立、可组合**的模块化托管服务(运行时、身份、记忆、工具网关、浏览器、代码解释器、可观测性等)。它明确**不是框架、也不是编排 DSL**,而是 agent 之下的平台层。核心是**闭源托管云服务**(按用量计费),配套 SDK / CLI / samples 在 Apache-2.0 下开源,**平台本体不开源**。时间线:2025-07 预览、**2025-10-13 GA**(Runtime / Memory / Gateway / Identity / Observability 五大件转正)、2025-12 又发一批 preview(Policy、Evaluations)。截至 2026 年中活跃扩张。

> ⚠️ 别把它和早期的 "Amazon Bedrock Agents" 搞混——**那**是绑定 Bedrock 的托管编排产品;AgentCore 是更底层、更开放的**新**平台。

**它解决什么**:开源框架能在你笔记本上把 agent 写出来,但生产化要自己解决一长串「无聊但要命」的事:会话隔离与安全、身份与凭证、长时/异步执行、记忆持久化、工具接入、可观测性、合规护栏。AgentCore 把这些做成托管服务,你**挑着用**。

**核心构件**(可拆用是它的灵魂,不必买全家桶):

| 组件 | 是什么 | 关键点 |
|---|---|---|
| **Runtime** | serverless 的 agent/工具宿主 | 每会话独立 **microVM**;最长 **8 小时**执行;100MB payload;HTTP/WebSocket 双向流;**不可变版本 + endpoint 路由**(可无停机切换/回滚) |
| **Memory** | 短期 + 长期记忆 | 短期=单会话逐轮;长期=跨会话抽取(语义事实/摘要/偏好);2025-12 加**情景记忆(episodic)**;可跨 agent 共享 |
| **Gateway** | 工具/agent/模型的统一 AI 网关 | 把 OpenAPI / Smithy / Lambda 转成 **MCP 工具**;接入既有 MCP server;**语义工具检索**;入站+出站双向鉴权 |
| **Identity** | agent 身份 + 凭证管理 | 兼容任意 IdP(Cognito/Okta/Entra ID/Auth0);**token vault** 存刷新令牌;出站取 token 分「用户委托」/「自主」两种模式 |
| **Code Interpreter / Browser** | 隔离沙箱执行代码 / 云端托管浏览器 | 前者跑 Python/JS/TS;后者供 agent 填表/导航,兼容 Playwright、BrowserUse |
| **Observability** | 端到端追踪 | 走 **OpenTelemetry(OTEL)**;接 CloudWatch/Datadog/LangSmith/Langfuse |
| **Policy** *(2025-12 preview)* | 确定性护栏 | 自然语言或 **Cedar** 规则;经 Gateway **在 tool call 执行前拦截** |
| **Evaluations** *(2025-12 preview)* | agent 质量评测 | 13 个内置评估器 + 自定义打分,基于 session/trace/span |

> 注:官方「Core services」总表里还列了 Payments(x402 微支付)、Optimization、Registry、Harness 等较新组件,但各自发布/GA 状态本次未逐一核实(**未找到统一的发布状态清单**),当「较新、存在」看即可。

**控制回路的关键分层**(以 Runtime 承载自定义 agent 为例):部署期把 agent 打包成容器镜像推到 ECR,用 `CreateAgentRuntime` 生成不可变的 V1 版本 + endpoint;调用期客户端为每段对话生成唯一 `runtimeSessionId` 调 `InvokeAgentRuntime`,先过**入站鉴权**验证调用者身份,然后——最关键的一步——**相同 `runtimeSessionId` 复用同一 microVM(保持上下文),新 session 起新 microVM(隔离 CPU/内存/文件系统)**。payload 交给你的容器 `/invocations`,进入**你自己框架的 agent 循环**,循环中按需去点 Memory、Gateway、Code Interpreter、Browser,全程往 Observability 发 OTEL trace。会话终止很干脆:**15 分钟无活动、或到 8 小时上限、或判定不健康,整个 microVM 销毁、内存清零**;要长期持久化,**必须**显式用 Memory 服务。

**一条贯穿全平台的哲学**:AgentCore 只管「外壳与周边」——隔离、身份、记忆、工具接入、观测、护栏——**推理循环本身留给你的框架**。它是「生产化底座」,不是「开箱即用的 agent」。Gateway 尤其体现它的品味:当你有上千个工具、全塞进 prompt 既贵又慢,它用**语义工具检索**让 agent 按任务只挑相关的几个,凭证按工具注入、**agent 代码根本不碰密钥**——把「上下文压缩」和「权限隔离」这两件在讲上下文管理、讲权限安全那两篇里的老话题,做成了工具层的托管服务。

> 反直觉的点:**AWS 做的这东西,刻意「不聪明」。** 一个规划算法都不给你,一个「更强的 agent」都不卖你。它赌的是:**当下缺的不是更聪明的 agent,而是让 agent 安全上生产的地板。** 十几个组件全围着「安全、隔离、身份、审计、可观测」转——这是一份「企业刚需」清单,不是「炫技」清单。

### 3.3 Letta / MemGPT:把「记忆」做成运行时的一等公民

**它是谁**:Letta 是一个**「有状态智能体(stateful agents)」的开源平台/运行时**——把无状态的 LLM 变成拥有持久记忆、能随时间**自我编辑记忆**并「学习」的 agent。它源自 UC Berkeley 的 **MemGPT** 论文(Packer et al., *MemGPT: Towards LLMs as Operating Systems*, arXiv:2310.08560,2023-10);2024-09-23 论文项目并入 Letta 公司,MemGPT 从此成为 Letta 内的一种 agent 设计范式(「Letta, formerly MemGPT」)。同日出隐身,宣布完成 1000 万美元种子轮(Felicis 领投,天使含 Jeff Dean、Clem Delangue)。许可 **Apache-2.0**,主仓库 `letta-ai/letta` 约 **2.36 万 star**(截至 2026-07)。

**2026 状态有个重要拐点**:核心开源框架(Letta server / Agents API)仍在维护,最新 release **v0.16.8(2026-05-14)**,但**该仓库现被官方描述为「legacy Letta server」,主开发已迁往新仓库**;同时 2026-04-06 发布了面向个人的 **Letta Code**(有状态 agent 的 CLI + 桌面 App,可从 Claude Code / Codex 的历史会话 `/init` 初始化记忆)。产品重心正从「开源框架」向「个人化 agent 产品」迁移。

**它的内核哲学一句话就是招牌**:**「LLM as an Operating System(LLM-OS)」**。把上下文窗口当作 **RAM(物理内存)**,把外部存储当作**虚拟内存/磁盘**,由一套上下文管理系统在「全部可用数据」和「真实上下文窗口」之间搬运——**直接照抄操作系统的分层虚拟内存**。这是 MemGPT 论文的原创思想,也是讲上下文与记忆的那篇反复回扣的源头之一。

**核心机制一:三层记忆(OS 类比)。** Letta 最该记住的结构:

- **Core memory(≈RAM)**:由 **memory blocks** 组成,**常驻上下文、始终可见、无需检索**。每块有 `label`(如 persona / human)、`description`(agent 靠它判断这块干嘛用)、`value`、`limit`(字符上限),还能设 `read_only=True` 禁改写。
- **Recall memory(≈磁盘缓存)**:完整对话历史,存库、按需搜索(`conversation_search`)。上下文里被逐出的消息落这里,可再捞回。
- **Archival memory(≈冷存储)**:外部向量库(pgvector 的 passages),agent 显式 `archival_memory_insert` 写入、`archival_memory_search` 语义检索。

**核心机制二:自我编辑记忆(self-editing memory)。** 这是 MemGPT 论文的核心创新——**让 LLM 用工具调用来管理自己的分层记忆**(`core_memory_replace`、`archival_memory_insert`、`conversation_search` 等)。记忆不是被动存储,是 agent 主动经营的东西。

**核心机制三:有状态的物理基础——一切落库。** Letta 是一个 **FastAPI REST 服务器**(默认端口 8283),把所有 agent 状态——记忆、用户消息、推理、工具调用——**全部持久化到数据库**(PostgreSQL + pgvector,或本地 SQLite)。**状态即使被逐出上下文窗口也永不丢失。** 核心协调者是 `SyncServer`,执行层是 `LettaAgent`(有 v2/v3 演进)。因为记忆和身份**与模型解耦**,你还能在**会话中途切换模型**而保留完整上下文、记忆、人格——多数 harness 做不到。

**两个进阶设计值得点名**:

- **Sleep-time compute / 后台记忆 agent**(v0.7.0 引入):双 agent 结构——**primary agent** 处理用户交互,独立的 **sleep-time agent** 在后台异步整合/压缩/归档记忆,把「raw context」熬成「learned context」,不打断主循环;可给两者配不同模型(主用快的、后台用更强更慢的)。官方称在 AIME/GSM 等数学基准取得「Pareto improvement」——但**未见具体百分比**,当方向看。
- **Tool Rules(工具规则)**:用 `tool_rules` 对工具序列施加**图状约束**,把默认无约束的循环变成受控状态机——`InitToolRule`(必须首先调用)、`TerminalToolRule`(调用即终止)、`ChildToolRule`(调用后必须接指定子工具之一)等。⚠️ 局限:除 `TerminalToolRule` 外,其余依赖 provider 的 **structured outputs**,当前主要 OpenAI 的 gpt-4o 系列支持——**跨模型不一致**。

**可移植性(Agent File / `.af`)**:开源的 `.af` 格式(2025-04)把一个有状态 agent 的全部组件(system prompt、可编辑记忆、工具代码+schema、LLM 配置)序列化成人类可读的 JSON,实现 agent 的分享、checkpoint、版本控制,甚至跨框架迁移。

顺带把本篇三家串起来:Letta 自己**不做沙箱**——它的工具在隔离环境执行时,底层用的正是 **E2B**(需 `E2B_API_KEY`)、Modal 或本地。**Letta 管记忆,把「跑代码」这件脏活外包给 E2B 这样的沙箱。**

> 反直觉的点:**Letta 的产品不是「一个更聪明的 agent」,而是「一套让 agent 不失忆的记忆管理系统」。** 跟 LangGraph / CrewAI 这类主要做**编排**的框架(讲通用 agent 与框架的那篇)的根本区别就在这:别家花力气让多个 agent 协作,Letta 把力气全花在「怎么让一个 agent 记得住」——**把记忆做成运行时核心,而不是应用代码里的一团可变状态。**

### 3.4 群像横扫:把它们黏起来的协议层(MCP / A2A / ACP)

前面三家是「盒子」,但盒子要互通,得有**标准的插座**。讲扩展生态、讲新一代 harness 那两篇里反复出现的三个协议,就是这一层的插座标准。这里做一次群像回顾,顺便点清各管哪一头:

- **MCP(Model Context Protocol,模型上下文协议)**——**agent ↔ 工具/数据**的标准。它让 agent 用统一方式接外部工具和数据源,是本篇几家的公共依赖:E2B 的默认模板里就有 `mcp-gateway`,AgentCore 的 Gateway 把 OpenAPI/Lambda **统一翻译成 MCP 工具**、也直接接入既有 MCP server,Letta 也支持 MCP。三家全都押它,是本层里渗透最广的那根插座。

- **A2A(Agent-to-Agent)**——**agent ↔ agent** 的标准。在 AgentCore 里落地得很具体:走 **9000 端口、JSON-RPC 2.0,用 Agent Cards 做发现**,Gateway 可 passthrough 到其他 agent。让不同 agent 互相通信、互相发现,不必知道对方内部实现,面向「多 agent 互通」这一头。

- **ACP(Agent Client Protocol)**——**把「别的 agent」当子代理来驱动**的标准,面向「harness 驱动 harness」这一头。⚠️ 别记错归属:**ACP 不是任何单一 harness 发明的,而是个独立的协议标准**;讲新一代 harness 那篇里的元编排 harness 只是它的**消费者**——靠它把 Claude Code / Codex / Gemini CLI 当子代理调来调去。它的具体规格、出处与年代,详见讲新一代 harness 的那篇(本篇不重复展开)。

一句话对齐三根插座:**MCP 让 agent 接工具、A2A 让 agent 找到并对话别的 agent、ACP 让一个 harness 把另一个 harness 当子代理驱动。** 三者不冲突,反而互补——一个成熟的 agent 系统常常三根同时插着。详细拆解见讲扩展生态和讲新一代 harness 的那两篇,这里只把它们摆进本章地图。

---

## 4. 它们与众不同的设计决策与取舍

退一步看,三家都在回答同一个问题——「**agent 要上生产,底下缺的那块地板长什么样?**」——但各补**不同的一块**:

- **E2B 押「安全执行」:VM 级隔离 > 容器,通用性 > 单语言优化。** 赌注:agent 要真跑不可信代码,**隔离强度是硬需求**,宁可背 microVM 的重量、靠快照把冷启动压到 ~150ms 抵消;还刻意「不为单语言优化」,支持任意 Linux 负载。**收益**:开源可自托管(规避锁定,这是相对 Modal / Daytona / Vercel Sandbox 等闭源方案的差异点)、隔离硬。**代价**:它只是「一台干净机器」,不含循环、不管记忆——上层要自己搭。

- **AgentCore 押「托管周边」:框架无关 + 模型无关 + 模块可拆用。** 赌注:企业缺的不是 agent,是让 agent 安全上生产的一整套周边;所以拆成十几个可独立采用的托管服务,**唯独不碰 agent 循环**。**收益**:对已投资 LangGraph/CrewAI/Strands 的团队迁移成本低,microVM 级会话隔离 + 结束清零面向合规,8 小时长时执行 + 文件系统持久化面向真正的长任务。**代价**:AWS 锁定(核心闭源、多维度计费)、组件多导致心智负担重,且**它不给你 agent 循环**——要开箱即用反而别的产品更省事。

- **Letta 押「持久记忆」:记忆即一等公民,状态存服务端 DB 而非应用代码。** 赌注:让 agent 从「一次性对话」变成「能跨会话学习的实体」,关键在**把状态从进程搬到数据库、并让 agent 能自我编辑它**。**收益**:状态永不丢、可 checkpoint、可跨模型切换、可用 `.af` 迁移。**代价**:有状态 + DB 依赖(PostgreSQL/pgvector)带来**部署重量**;而 v1 为了「用模型原生控制循环」弃用了 heartbeat/`send_message`,换来简洁,代价是**失去对推理状态的可编程控制**(闭源 API 的推理不透明、不可变、不可跨模型传递)。

一句话对齐:**E2B 补「agent 在哪跑」的地板,AgentCore 补「agent 怎么上生产」的地板,Letta 补「agent 怎么记得住」的地板。** 它们能叠着用——Letta 的代码执行底层就调 E2B,AgentCore 也能托管一个用了 Letta 式记忆的 agent。

> 一个贯穿的反直觉:**这三家没有一家是靠「一个更聪明的 agent」立身的。** E2B 靠隔离、AgentCore 靠周边、Letta 靠记忆——全是讲「什么是 harness」那篇里「harness 比模型更重要」再往下挖一层:**连 harness 都要站在地板上,而地板本身,是一门独立的、不比模型简单的工程。**

---

## 5. 局限与坑

基础设施层最容易被当成「透明的、总在那儿的」,踩坑往往在你最没防备处。诚实列几条(机器会渲染成 ⚠️ 警示卡):

1. **把 beta 能力当生产能力用,是这一层最隐蔽的致命坑。** E2B 的 pause/resume(连内存冻结)听着很美,但它**明确标注 public beta**,且有开源 issue 报告「多次 resume 后文件变更不持久」(#884)。致命在于:你以为状态稳稳存着,某次恢复它悄悄丢了改动,而这类 bug **不报错、只给你一个「看起来对但其实旧」的状态**。怎么避:凡标 beta / preview 的能力(E2B 的 persistence、AgentCore 的 Policy/Evaluations),生产依赖前**自己写一遍端到端验证**,别信文档口径。

2. **「隔离」降低风险,但从不消除风险——尤其人不在场时。** 三家都很重隔离(E2B microVM、AgentCore 每会话 microVM + 清零、Letta 外包 E2B),但隔离防的是「代码逃出沙箱」,防不住**你亲手给它的权限被滥用**。致命在于:一个藏在 issue、README 或网页里的**提示注入**(见讲权限安全的那篇),可能诱导一个在沙箱里、却**握着你真实云凭证/仓库权限**的 agent 去 exfiltrate 数据——沙箱是干净的,泄漏却是真的。怎么避:最小权限授予,凭证走 AgentCore Identity 这类**按工具注入、agent 不碰密钥**的机制,别把大范围凭证塞进沙箱环境变量。

3. **会话态默认易失——不显式持久化,它就真没了。** AgentCore 的 microVM「15 分钟无活动 / 8 小时上限 / 判定不健康」就销毁、**内存清零**;E2B 沙箱 `kill()` 即毁。致命在于:开发时你几分钟内测完一切正常,上线后用户中途离开二十分钟回来,**上下文已被清空**,agent 一脸茫然。怎么避:任何需要跨会话/长时间存活的状态,**必须**显式落到持久层(AgentCore 用 Memory、Letta 用它的数据库)——**默认易失是特性,不是 bug**。

4. **厂商自报的数字,别当已验证事实引用。** E2B 官网自报「Fortune 100 中 94% 使用」(但 A 轮新闻稿口径是 88%,**同一家两个口径**)、「月下载 7M+、累计沙箱 1B+」;Letta 的 sleep-time「Pareto improvement」没给百分比;某二手来源的 Letta「$1.4M ARR」自身还自相矛盾。致命在于:你拿这些数字做技术选型论证,一旦被追问来源就站不住。怎么避:凡带具体百分比/规模的宣称,默认标「厂商自报、未独立核实」,选型看**可验证的**东西(许可、架构、star、release 节奏)。

5. **开源承诺会漂移——今天开源的,明天可能被标 legacy。** Letta 的核心开源 server 已被官方标注为「legacy Letta server」,主开发迁往新仓库,重心向个人化的 Letta Code 迁移。致命在于:你基于「它是活跃开源框架」做了长期押注,结果社区投入方向变了,你依赖的仓库进入维护模式。怎么避:选开源基础设施时,看**主开发在哪个仓库、release 是否还在滚、公司商业化方向会不会把开源版边缘化**——把「开源」当一个会变的状态,而非永久承诺。

6. **别把「基础设施齐全」误当成「agent 会自己干活」。** AgentCore 组件多到像全家桶,但它**一个规划器都不给你**;E2B 连循环都没有;Letta 虽自带循环,你仍要设计它的 memory blocks、tool rules。致命在于:团队看到「AWS 出的 agent 平台」就以为买回来能开箱即用,结果发现**推理循环、规划、工具编排全得自己搭**,项目预期严重错位。怎么避:选型前先分清你缺的是**地板**(这一层)还是**脑子**(框架 / 成品 harness)——缺地板才来这一层,缺脑子来这一层只会更累。

---

## 6. 一句话记住 + 对比表

> **Agent 运行时与基础设施,是 agent 火起来之后在它脚下长出的一层地板:E2B 押「安全执行」(用完即弃的 microVM 沙箱)、AgentCore 押「托管上生产」(框架无关、模块可拆的周边服务)、Letta 押「持久记忆」(把状态搬进数据库、让 agent 自我编辑记忆),再由 MCP / A2A / ACP 三根开放插座黏成一整层——它们全都刻意不是 agent,而是 agent 站上去的地板。**

本篇所有系统横向对齐(数字均为截至 2026 年中的快照):

| 系统 | 定位(补哪块地板) | 内核 | 开源/闭源 | 最适合谁 | 状态 |
|---|---|---|---|---|---|
| **E2B** | 安全执行:云端隔离沙箱 | Firecracker microVM + 双平面(REST 控制 / envd:49983 数据) | 开源(Apache-2.0 / SDK MIT),托管云按秒计费 | 要让 agent 安全跑不可信代码、想自托管避锁定的人 | 活跃(A 轮 2100 万,~1.28 万 star) |
| **AWS Bedrock AgentCore** | 托管上生产:运行时/身份/记忆/网关等一组服务 | 每会话 microVM + 模块化托管服务(框架无关/模型无关) | 平台闭源(按用量计费),SDK/CLI 开源 | 已用 LangGraph/CrewAI/Strands、要把 agent 安全推上生产的企业 | 活跃扩张(2025-10 GA + 2025-12 新 preview) |
| **Letta / MemGPT** | 持久记忆:有状态运行时(记忆 OS) | LLM-OS 三层记忆 + 自我编辑 + 一切落库(FastAPI:8283 + PG/pgvector) | 开源(Apache-2.0,主 server 标 legacy),另有 Cloud | 要 agent 跨会话记住、可 checkpoint、可跨模型迁移的人 | 活跃但重心迁移(开源 server→Letta Code) |
| **MCP** | 协议:agent ↔ 工具/数据 | 统一工具/数据接入标准 | 开放标准 | 所有要接外部工具的 agent(本篇几家的公共依赖) | 本篇三家全都押它 |
| **A2A** | 协议:agent ↔ agent | JSON-RPC 2.0 + Agent Cards 发现(AgentCore 走 9000 端口) | 开放标准 | 要做多 agent 互通/发现的系统 | 落地中(AgentCore 已支持) |
| **ACP** | 协议:harness 驱动 harness | 把「别的 agent」当子代理来驱动的独立协议标准 | 开放标准 | 要把别的 harness 当子代理调用的元编排层 | 详见讲新一代 harness 的那篇 |

**怎么选**:想**让 agent 安全跑代码、且要开源可自托管**,看 E2B;想**把已有框架的 agent 安全推上生产、要企业级身份/隔离/观测**且接受 AWS 锁定,看 AgentCore;想**让 agent 跨会话记住、能 checkpoint、能中途换模型**,看 Letta;而 MCP / A2A / ACP 不是二选一,是搭系统时按需插上的插座。

对照前面的拆解章,这一篇补上了「地板」这块拼图:讲 Claude Code、Codex 那几篇拆的是**成品 harness**(脑子),讲自主 SWE、通用框架那几篇拆的是**更大的脑子**,而这一篇拆的是它们全都趴在上面的**运行时与基础设施**——安全执行的沙箱、托管的运行时/身份/网关、持久的记忆、以及把这一切黏起来的互通协议。**agent 生态火起来之后,最先长出、也最容易被忽视的,恰恰是这层地板。**
