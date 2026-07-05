# n8n 事实底稿(快照:2026 年年中)

> 研究定位:把 n8n 作为「agent harness / 编排平台」样本拆解——它不是一个自主 coding agent,而是一个**可视化工作流引擎**,AI Agent 只是其中一类节点。它对本教学站的价值在于:展示「用有向图 + 类型化连接把 LLM、工具、记忆显式接线」这一与「纯自然语言 ReAct 循环」截然不同的 harness 范式。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **一句话**:n8n 是一个 **fair-code(源码可见但非 OSI 开源)的可视化工作流自动化平台**,把 400+(README 副标题说 400+,正文另处称 1500+ 集成——数字口径不一,**存疑**)服务集成、自定义代码节点和一套 LangChain 封装的 AI/agent 节点放在同一张有向无环图画布上,可 self-host 或用云托管。官方 GitHub 描述原文:*"Fair-code workflow automation platform with native AI capabilities. Combine visual building with custom code, self-host or cloud, 400+ integrations."*
- **出品方**:n8n GmbH(柏林)。创始人兼 CEO **Jan Oberhauser**,2019-06-23 首次把 v1 推上 GitHub(单人起步)。
- **许可**:**fair-code**,双许可组合——**Sustainable Use License**(n8n 2022 年自创)+ **n8n Enterprise License**。要点:可免费 self-host 完整社区版、无限工作流/执行/用户;**但不得把 n8n 作为托管服务转售**、商用需与 n8n 建立合作。这**不是** OSI 认可的开源许可。
- **2026 状态:高度活跃、独立、未改名未被收购**。2025-10 完成 **1.8 亿美元 C 轮**,投后估值 **25 亿美元**(领投 Accel;跟投含 NVIDIA 创投臂 NVentures、Deutsche Telekom T.Capital、Meritech、Redpoint 等;老股东 Sequoia / Highland Europe / HV Capital / Felicis 跟投)。累计融资约 2.4 亿美元。2025-12 发布 **n8n 2.0**;截至 2026-07-03 最新版本为 **n8n@2.28.6**(共 703 个 release)。ARR 已超 4000 万美元、用量同比约 10x(公司口径)。

---

## 2. 解决什么问题 · 在 agent 技术栈的位置 · 与 LLM 的关系

- **解决的问题**:让「跨系统的多步自动化」可视化地被搭建、调度、监控——从传统 iPaaS(Zapier/Make 那类触发→动作)到近两年的「AI agent 编排」。核心卖点是**低代码画布 + 随处可插的全代码逃生舱**(Code 节点跑 JS/Python)。
- **技术栈位置**:属于 **编排框架 / 平台 / 基础设施** 一层,**不是**一个自主 agent,也不是一个纯 SDK(如 LangChain/OpenAI Agents SDK)。更准确说:n8n 是**宿主平台**,里面的「AI Agent 节点」才对应 agent;它把 agent 循环封装成图上的一个可配置构件。相对本站其它对象:它像 CrewAI/AutoGen 的「编排」角色,但载体是**持久化的可视化工作流引擎 + 队列执行器**,而非 Python 进程内对象。
- **与底层 LLM 的关系**:**模型无关(BYO-LLM)**。Agent 节点本身不含模型;必须接一个 **AI Language Model 子节点**(OpenAI、Anthropic、Google、Groq、Mistral、Azure OpenAI、以及本地/开源模型)。n8n 只做编排与工具接线,推理外包给所连模型。

---

## 3. 架构与核心组件(点名真实构件)

**A. 运行时进程模型(执行器 / 消息总线 / worker)** —— 来自源码维基与官方 hosting 文档:

- **三种进程类型**:
  - **Main**(`n8n start`):Web UI、REST API、workflow 编排;监听 webhook;跑非 HTTP 触发器(定时器、轮询、RabbitMQ/IMAP 长连接)、剪枝历史。queue 模式下它**只入队不执行**。
  - **Worker**(`n8n worker`,仅 queue 模式):用 `JobProcessor` 从队列取活执行工作流,可水平扩容多实例并行。
  - **Webhook**(`n8n webhook`,仅 queue 模式):专收生产 webhook 并立即入队,给 main 卸载流量;不跑轮询触发器。
- **两种执行模式**:
  - **regular(单进程)**:`WorkflowRunner` 直接 `run()` 在同进程执行,`ActiveExecutions` 内存跟踪。
  - **queue(分布式)**:`ScalingService` 用 **Redis + Bull** 队列;main 生成 execution 但不跑,把 execution ID 推给 Redis,worker 取 ID 后从数据库读工作流定义再执行;`Publisher`/`Subscriber`(Redis pub/sub)传进程间命令与事件;`Push` 组件走 WebSocket 给前端推实时进度。
- **Task Runners(沙箱执行器)**:通用的**隔离代码执行**机制,专跑 Code 节点里的用户 JS/Python。组件为「task runner + task broker + task requester」,runner 用 websocket 连 broker,requester 提交任务、runner 执行后回传结果。**n8n 2.0 起 task runner 默认开启**——即所有 Code 节点默认在隔离环境跑、默认屏蔽环境变量访问、默认禁用可任意执行命令的节点(见 §5、§第 5 节安全)。
- **执行引擎**:实际的节点排序与执行逻辑委托给 `core` 包(`WorkflowExecute`);`BaseCommand` 初始化序列:连数据库+迁移 → 加载节点/凭据 → (queue) 初始化 Publisher/Subscriber → 启动 task runners。

**B. AI/agent 层(LangChain 封装,"cluster nodes")**:

- n8n 把 LangChain 抽象暴露为**一等可视化节点**,总计 **70+ 个 LangChain 系 AI 节点**(agent、vector store、memory、LLM、embedding 等)。包名前缀 `n8n-nodes-langchain.*`。
- **Cluster node = root 节点 + 若干 sub 子节点**:root(如 AI Agent、Vector Store、Chain)提供主功能,sub 子节点挂上去配置其行为。
- **类型化 AI 连接**(这是 n8n harness 的关键设计):普通节点走 `main` 连接传 JSON;AI 节点用**专用类型连接**——**AI Language Model / AI Memory / AI Tool / AI Retriever / AI Text Splitter / AI Embedding / AI Document**(另有 Output Parser)。类型系统**强制合法组合**:不能把 vector store 接到期望 language model 的口子上。
- **AI Agent 节点(root)**:自 **v1.82.0 起只保留一种 agent 类型——Tools Agent**(旧的多 agent-type 选项已移除);它实现 LangChain 的 **tool-calling 接口**。必须至少接 1 个 Tool 子节点;可选接 Memory、Output Parser;必接 1 个 Language Model。

---

## 4. 一步步怎么运转(控制/编排回路)—— **本节最重要**

以「Chat Trigger → AI Agent(Tools Agent)」的 self-host queue 模式为例,追一个用户请求的完整回路:

1. **触发**。请求进来有三条典型入口:Chat Trigger(内置聊天 UI/嵌入)、Webhook(外部系统 POST)、或定时/轮询触发器。生产 webhook 命中 **Webhook 进程** → 立即把「要跑哪个工作流」入 **Redis** 队列(main 不亲自执行)。
2. **入队与派发**。**Main** 生成一个 execution(带 ID),`ScalingService` 把 job 推进 Bull/Redis 队列。空闲 **Worker** 抢到 job,用 execution ID 回数据库拉工作流 JSON 定义。
3. **图执行开始**。Worker 内 `WorkflowExecute` 按连线拓扑逐节点跑,节点间沿 `main` 连接传 item 数组(n8n 的数据单元是 `[{json, binary}]` 列表)。数据流到 **AI Agent 根节点**。
4. **组装 agent**。Agent 节点从它的**类型化子连接**收集运行期依赖:AI Language Model 子节点(具体 LLM)、若干 AI Tool 子节点(每个工具带 name+schema)、可选 AI Memory 子节点、可选 Output Parser。它把这些拼成一个 LangChain Tools Agent。
5. **推理-工具循环(ReAct/tool-calling loop)**。Agent 把「系统提示 + 记忆里的历史 + 当前用户输入 + 所有工具的 schema」发给 LLM。LLM 要么直接答、要么返回一个/多个 **tool call**(工具名 + 参数)。
6. **工具执行**。对每个 tool call,n8n 调用对应 Tool 子节点——可以是内置工具(Calculator、Wikipedia、Vector Store retriever)、任一 **app 集成包装成的工具**(Slack/HTTP Request/Postgres 查询…共 150+),或 **Workflow Tool / AI Agent Tool**(把另一条 n8n 工作流或另一个 agent 当工具调)。工具结果回灌给 LLM 作为下一轮观测。
7. **迭代直到收敛或触顶**。第 5–6 步循环,直到 LLM 给出最终答案,或达到 **Max Iterations(默认 10)**。可开 **Return Intermediate Steps** 把每步 tool 调用暴露出来做可观测。
8. **输出解析**。若接了 Output Parser,n8n 把 parser **作为一个「格式化工具」传给模型**(结构化/列表/auto-fixing),约束最终输出格式。
9. **人在环(可选阻断点)**。若某工具调用需人工批准,可用 Wait/「Send and Wait for Response」把工作流**暂停并落盘**,通过 Slack/Telegram/内置 Chat 发审批请求;人点批准 → 外部回调 `$execution.resumeUrl` webhook → 工作流从断点带原数据**恢复**继续(见 §5)。
10. **回流与持久化**。Agent 输出沿 `main` 连接继续走下游节点(存库、发消息、触发下一 agent…)。执行状态与结果写入数据库;worker 通过 Bull/Redis 上报进度,`Push`/WebSocket 把结果推回前端 Chat UI 或调用方拿到 webhook 响应。

> 讲课要点:与「一个进程里跑 while-loop 的 coding agent」不同,n8n 的 agent 循环**嵌在一张持久化的图里**,循环外层是「触发器→队列→worker→图执行」的平台回路,内层才是「LLM↔工具」的 tool-calling 回路。工具不是模型的临时函数,而是**图上真实的、可复用的、能自己带凭据/错误处理的节点**。

---

## 5. harness 层设计

- **上下文 / 记忆管理**:记忆是**可插拔的 AI Memory 子节点**,不是隐式全局态。常见类型:Simple/Window Buffer Memory(内存,进程内、**默认不跨会话持久化**)、以及外部持久化后端(Postgres / Redis / MongoDB 等)。持久化记忆靠 **session key**(常用会话/用户 ID)分区。跨会话或跨 agent 的长期状态需**显式存外部库(Postgres/Redis)按 session ID 读写**——n8n 不替你做隐式长期记忆。n8n 2.0 称对 AI Agent 节点做了「现代化 + 增强 token 管理」(细节官方 blog 未展开,**具体机制未找到公开细节**)。
- **工具接口**:工具 = 实现 LangChain tool-calling 接口的子节点(带 name + JSON schema)。三条来源:(a) 内置工具(Calculator/Wikipedia/Vector Store 等);(b) 任一 app 集成节点当工具;(c) **Workflow Tool**——把整条 n8n 工作流包成一个工具,于是 agent 能间接调用全部 400+ 集成而无需写胶水代码。
- **规划**:无独立规划器;规划隐含在 LLM 的 tool-calling 迭代里(Tools Agent),由 Max Iterations 兜底。复杂编排靠**图结构本身**(分支/路由节点)显式表达,而非让 LLM 自由发挥。
- **多 agent 交接(handoff)**:两种官方模式——**Router**(用条件分支路由到各自带 agent+工具的子工作流)、**Orchestrator**(主 agent 用 **AI Agent Tool** 把其它 agent 当工具调),或 **Workflow Tool** 让每个专家 agent 活在独立工作流(各自触发器/错误处理/部署生命周期)。**状态不自动跨 agent 传递**,需显式经数据库/传参共享。
- **人在环**:核心机制是 **Wait 节点 / 「Send and Wait for Response」**——暂停并落盘工作流,经 Slack/Telegram/Chat 发审批;外部调 `$execution.resumeUrl`(可配鉴权)恢复。n8n 2.0 修了子工作流里 Wait 节点的返回数据 bug(此前返回的是 Wait 输入而非工作流末端数据),使 agent 父流里的 HITL 更可靠。
- **沙箱**:**Task Runners** 隔离 Code 节点里的用户 JS/Python;n8n 2.0 起**默认开启**,并默认屏蔽环境变量、默认禁用可执行任意命令的节点——「secure-by-default」硬化。queue 模式下每个 worker 需自带 task-runner sidecar 容器。

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **可视化图 vs 纯代码/纯 NL**:相比 LangChain/OpenAI Agents SDK 那种进程内 Python 对象,n8n 把编排落成**可视化、可持久化、可版本化(2.0 引入 Save/Publish 分离)的图**——非工程师也能读改,且天然带监控/重放/凭据管理。取舍:表达力受图约束,深度定制仍要靠 Code 节点逃生。
- **类型化 AI 连接**:强制「LLM/memory/tool/retriever」按类型接线,把「组件组装错误」在编辑期而非运行期挡掉——这是它区别于「一切皆自然语言」的显著 harness 决策。
- **self-host + fair-code**:数据/部署完全自控、社区版免费无限跑,是相对 Zapier/Make(纯 SaaS)的核心差异,也是自托管 AI agent 场景选它的主因。取舍:非 OSI 开源、商用托管受限。
- **agent 只是图上一个节点**:AI 与传统 iPaaS 集成同栈——agent 能顺手调 400+ 真实业务系统,传统自动化里也能塞一个 LLM 步骤。适合「企业已有一堆系统、想加 AG 而非从零搭 agent 平台」的团队(客户含 Volkswagen、Delivery Hero、Decathlon、KPMG、Vodafone、Twitch——公司口径)。
- **代价 / 边界**:执行是「图驱动」的,长时自主、开放式的 coding-agent 式探索不是它的原生场景;多 agent 状态需手工经数据库管理;数字口径(集成数)与部分 2.0 AI 细节公开信息不一致。

---

## 7. 采用度信号

- **GitHub star**:约 **195k**(截至 2026-07-03,取自 GitHub 仓库页读数)。历史轨迹:2025 年内新增约 11.2 万 star(某二手来源称当年 JS 项目增星第一,**存疑/单一来源**);2025-06 前后约 108k;→ 2026 年年中约 195k。数量级增长可信,精确点位以仓库页为准。
- **版本势头**:2019 起 703 个 release;2025-12 发 2.0(硬化版);2026-07 已到 2.28.x——迭代非常密。
- **商业/资本**:C 轮 1.8 亿美元 / 估值 25 亿美元(2025-10);ARR >4000 万美元、用量同比约 10x、活跃用户 >23 万(2025 各口径,公司/媒体报道)。
- **知名用户**:Volkswagen、Delivery Hero、Decathlon、KPMG、Vodafone、Twitch(公司列举,未逐一独立核实)。
- **社区**:超 20 万+活跃用户、活跃模板市场与社区论坛。

---

## 8. 来源(一手优先)

1. n8n GitHub 仓库(描述 / license / star / 版本):https://github.com/n8n-io/n8n
2. Tools Agent 节点官方文档(tool-calling、Max Iterations=10、子节点、Output Parser):https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent
3. AI Agent 根节点官方文档(v1.82.0 起仅 Tools Agent、必接工具):https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent
4. 官方 blog《Introducing n8n 2.0》(task runner 默认开、secure-by-default、Save/Publish、Wait 修复):https://blog.n8n.io/introducing-n8n-2-0/
5. n8n 官方 hosting 文档 — Task runners / Queue mode(进程模型、Redis、task broker/runner):https://docs.n8n.io/hosting/configuration/task-runners/
6. 源码维基 — Runtime Architecture & Process Models(main/worker/webhook、WorkflowRunner/ScalingService/JobProcessor/WorkflowExecute):https://deepwiki.com/n8n-io/n8n/1.2-architecture-overview
7. 官方 blog《n8n raises $180m Series C》/ PitchBook(融资、估值、投资人、ARR、客户):https://blog.n8n.io/series-c/ ; https://pitchbook.com/news/articles/ai-agent-startup-n8n-lands-2-5b-valuation-with-180m-series-c
8. n8n 官方 blog《Multi-agent systems》(Router/Orchestrator/Workflow Tool 交接模式):https://blog.n8n.io/multi-agent-systems/

---

### 未能核实 / 存疑清单(如实标注)

- **集成数量口径不一**:GitHub 副标题「400+」vs 正文「1500+」vs 文档「150+ 工具」——分别指集成/工具/可当工具的节点,口径混乱,未逐项核实。
- **n8n 2.0「AI Agent 现代化 + 增强 token 管理」具体机制**:官方 2.0 blog 未展开,二手来源仅泛述,**未找到公开的机制级细节**。
- **memory 子节点的完整清单**(Postgres/Redis/MongoDB/Motorhead/Zep 等):官方 understand-memory 页当前 404,清单为搜索结果二手汇总,**未在一手文档逐一核实**;「默认不跨会话持久化」与 session key 概念有多来源支持但需以现行文档为准。
- **「2025 年 JS 项目增星第一 / 新增 11.2 万 star」**:单一二手来源,**存疑**;star 数量级增长可信,精确点位以 GitHub 仓库页读数为准。
- **知名客户名单**:取自公司/媒体列举,**未逐一独立核实**。
- **human-in-the-loop 专页**(`advanced-ai/human-in-the-loop-tools`)当前 404;机制描述综合自 Wait 节点文档 + 社区帖 + 2.0 blog 的 Wait 修复,一手 HITL 专页未取到。
