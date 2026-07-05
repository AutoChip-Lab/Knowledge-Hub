# Coze / Coze Studio 拆解简报

> 事实快照:2026 年年中(2026-07)。断言尽量溯源;标注了估算与未核实项。

## 1. 一句话定位

**Coze(中文名「扣子」)是字节跳动的可视化 bot/agent 搭建平台;其开源内核 Coze Studio 是一个用拖拽式画布 + 工作流 + 插件 + 知识库来构建、调试、部署 AI agent 的「agent 开发平台」。**

- **出品方**:字节跳动(ByteDance)。托管平台海外站 `coze.com`、国内站 `coze.cn`(即「扣子」)。
- **许可**:开源部分(Coze Studio、Coze Loop、底层 Eino 框架)全部 **Apache 2.0**。托管 SaaS 为商业产品。
- **首发时间**:托管 Coze 于 **2024-02-01** 上线;开源版 **Coze Studio + Coze Loop 于 2025-07-25** 发布。
- **2026 年状态**:**活跃**。未改名、未被收购、未停更。
  - 开源仓库 `coze-dev/coze-studio` 最近推送 **2026-04-20**,最新 release **v0.5.1(2026-02-05)**(据 GitHub 仓库页快照,star≈21.1k;API 计数见 §7)。
  - 托管侧节奏更快:**2026-01-19 发布 Coze 2.0**,整合 Agent Skill / Agent Plan / Agent Coding / Agent Office(据 aibase 报道,未在官方一手页复核细节)。
  - 注意名字层级:**Coze = 品牌** / **Coze Studio = 开源搭建平台** / **Coze Loop = 开源 LLMOps** / **Coze Space = 内测中的多 agent 协作产品(2025-04 起内测,据 TechNode)** / **Eino = 底层 Go 运行时框架**。不要混为一谈。

## 2. 解决什么问题 · 在技术栈里的位置

**问题**:让非资深工程师用「无代码/低代码」方式把 LLM 能力 + 外部工具(插件)+ 私有知识(RAG)+ 业务逻辑,编排成可发布的 chatbot / agent / 应用。

**栈位**:它是一个**平台(platform)**,而非单纯的库或框架。内部分层清晰:

- **平台层 = Coze Studio**:可视化 IDE(画布、资源管理、发布)+ 后端微服务。
- **harness/运行时层 = Eino**(`cloudwego/eino`):真正跑 agent 循环、工具调用、工作流 DAG、RAG 索引/检索、模型抽象的 Go 框架。**Coze Studio 的 agent 与工作流运行引擎、模型抽象、知识库索引/检索均由 Eino 团队支撑**(据 Coze Studio README/wiki 致谢)。
- **LLMOps 层 = Coze Loop**:prompt 调试、评测、可观测(trace)。
- **底层 LLM**:模型可插拔。Studio 的模型服务可接 **OpenAI、火山引擎方舟(Volcengine Ark)、Ollama 等**(据 wiki「What is Coze Studio」)。托管 Coze 主打字节自研 **豆包(Doubao)** 系列。

一句话:**Coze 之于 Dify/n8n,约等于「字节的开源 agent 平台」,而 Eino 之于 Coze,约等于「LangGraph/LangChain 之于上层应用」——只是用 Go 写。**

## 3. 架构与核心组件(点名真实构件)

### Coze Studio(仓库 `coze-dev/coze-studio`)
- **后端**:**Golang**;HTTP 框架 **Hertz**(CloudWeGo 系)。
- **前端**:**React + TypeScript**;工作流画布用 **FlowGram**(字节开源的流程画布引擎)。
- **架构范式**:**微服务 + 领域驱动设计(DDD)**。
- **核心资源模型**:官方把「**工作流、插件、数据库、知识库、变量**」统称为 **resources**。
- **功能构件**:
  - **Model Service**:模型列表管理,接 OpenAI / Volcengine Ark / Ollama 等。
  - **Agent(单体 agent)**:绑定 prompt + workflow + 知识库 + 数据库 + 记忆。
  - **Workflow / Chatflow 引擎**:见 §4。
  - **Plugin 系统**:HTTP-based 工具 + 鉴权;插件的定义/调用/管理机制均开源。
  - **Knowledge Base(RAG)**:文档上传 → 向量化存储 → 语义检索(内置)。
  - **Database**:结构化持久存储,供 agent 读写。
  - **Memory / Variables**:变量 + 数据库 + 基于用户历史会话的记忆特性。
  - **API & SDK 层**:OpenAPI + **Chat SDK**(嵌入到外部应用)。
- **开源版明确缺失(相对商业版)**:应用 UI builder、**多 agent**、语音 I/O、多模态生成(据 DEV 社区拆解文,已交叉两处来源)。

### Eino(仓库 `cloudwego/eino`,真正的 harness 引擎)
- **组件抽象(Components)**:`ChatModel`、`Tool`、`Retriever`、`ChatTemplate`、`Embedding`、`Indexer`、`Document Loader`、`Lambda`(自定义计算节点)。
- **编排原语(3 级)**:
  - **Chain** — 只能前进的链式有向图。
  - **Graph** — 支持分支、循环(cyclic)、全局 state 的有向图。
  - **Workflow** — **struct 字段级数据映射的 DAG**(Coze 工作流即建于此)。
- **Agent**:`ChatModelAgent` 是 ReAct 式 agent,内建工具调用、会话状态、推理循环。
- **ADK(Agent Development Kit)**:多 agent 上下文自动改写(agent 交接时重写会话历史)、**Agent-as-Tool**、**Interrupt/Resume(人在环 checkpoint)**、内置模式(Deep Agent / Supervisor / Sequential)、中间件系统(文件系统、token 缩减)。
- **流式与回调**:5 类回调(`OnStart`/`OnEnd`/`OnError`/`OnStartWithStreamInput`/`OnEndWithStreamOutput`);框架自动做 stream 的拼接/转换/合并/复制。
- **State**:Graph 全局 state 读写经 `StateHandler`,线程安全并发访问。

### Coze Loop(仓库 `coze-dev/coze-loop`)
- **架构**:微服务 + DDD,分 Platform / SDK / LLM 三层。
- **六大模块**:Data(数据集)、Evaluation(评测实验)、Observability(全链路 trace)、Prompt(prompt 开发调试)、LLM(模型管理调用)、Foundation(用户/权限)。
- **技术栈**:Hertz(HTTP)、**Kitex(RPC)**;存储 **MySQL / ClickHouse / Redis / MinIO / RocketMQ**;Docker Compose 部署。
- **Observability**:完整记录「用户输入 → prompt 解析 → 模型调用 → 工具执行 → 输出」每一步,自动捕获中间结果与异常。

## 4. 一步步怎么运转(控制/编排回路)—— 本节最重要

Coze 有两种主要执行形态。**理解 Coze 的关键:上层是拖拽画布,底层真正跑的是 Eino 的 Graph/Workflow。**

### A. 单体 Agent 的一次对话(ReAct 回路,由 Eino `ChatModelAgent` 驱动)
1. **入口**:用户消息经 Chat SDK / OpenAPI 进 Coze Studio 后端(Hertz)。
2. **组装上下文**:后端拉取该 agent 的 prompt 模板、绑定的知识库/数据库/变量/历史会话记忆,注入 message 列表。若配置了知识库,先做 **RAG 检索**(Retriever/Indexer 语义召回)拼进上下文。
3. **模型决策(Reason)**:`ChatModel` 收到 message 历史,输出**要么是工具调用(tool calls),要么是最终回复**。
4. **工具执行(Act)**:若有 tool calls → 执行对应 **Plugin(HTTP 工具)/ 工作流(可作为工具暴露)/ 代码**,收集结果。
5. **观察回灌(Observe)**:工具结果作为新的 message 追加进上下文。
6. **循环**:回到步骤 3,直到模型产出最终回复(无更多 tool call)。
7. **返回 & 落记忆**:回复经流式 callback 返回用户;会话写入历史/数据库以供后续记忆。
   - 全程被 Coze Loop 的 observability 以 trace 形式记录(可选)。

### B. 工作流 / Chatflow 的一次运行(DAG 执行,由 Eino Workflow 驱动)
Coze 工作流是**同时含控制流与数据流的 DAG**,建在 Eino 的 workflow 能力之上。

1. **触发**:从 **Start 节点**进入,携带入参。
2. **逐节点执行**:节点是功能积木,常见类型:
   - **LLM 节点** — 调大模型生成内容;
   - **Plugin 节点** — 调 HTTP 插件/外部能力;
   - **Code 节点** — 跑自定义脚本(支持 Python);
   - **Knowledge/RAG 节点** — 检索知识库;
   - **Condition(条件)/ Intent Recognition(意图识别)/ Question(问答)节点** — 具「分支选择」能力;
   - **Loop / Batch 节点** — 循环与并行批处理;
   - **Sub-workflow 节点** — 工作流嵌套;
   - **End 节点** — 输出。
3. **数据流**:节点间以 **struct 字段级映射**传值(Eino Workflow 特性),上游输出显式接到下游输入。
4. **控制流 / 分支**:Condition / 意图识别 / 问答的「多 port 选择」由 **Eino 的 Branch 机制**实现——按节点实际输出选走哪条边。
5. **并行**:Batch/并行节点并发执行分支。
6. **异常处理**:LLM 节点与 Code 节点支持通用异常策略——**超时、重试、异常后回落默认输出、走异常分支**。
7. **Chatflow 差异**:Chatflow 是「面向对话」的工作流变体,在工作流基础上带会话上下文/记忆,用于多轮对话型 agent(区别于一次性任务型 workflow)。

> 讲课要点:A(agent 循环)是「模型自主决定调什么工具」的**自主 ReAct 回路**;B(工作流)是「开发者预先画好 DAG」的**确定性编排**。二者可互相嵌套:工作流可作为 agent 的一个工具;agent 也可作为工作流里的 LLM 节点。底座都是 Eino。

## 5. Harness 层设计

- **上下文 / 记忆**:分层——① 会话历史(短期);② **变量**(会话/用户级 KV);③ **数据库**(结构化持久);④ **知识库 RAG**(非结构化召回);⑤ 基于用户历史会话的长期记忆特性。Eino 侧提供 Graph 全局 `State`(线程安全)承载运行期状态。
- **工具接口**:插件 = **HTTP-based 工具 + 鉴权**;Eino 层统一为 `Tool` 组件,工作流本身可被暴露为工具(Agent-as-Tool / Workflow-as-Tool)。
- **规划**:两条路——工作流是**显式人工编排**(拖拽 DAG);agent 是 **ReAct 隐式规划**(模型逐步决定)。Eino ADK 另提供 Deep Agent / Supervisor / Sequential 等预置多 agent 规划模式。
- **多 agent 交接**:**开源 Coze Studio 明确不含多 agent**;多 agent 能力在 Eino ADK 层(自动改写会话历史做 agent transfer)与托管商业版/Coze Space 中。
- **人在环**:Eino ADK 提供 **Interrupt/Resume**——从 checkpoint 暂停等人工审批再恢复。
- **沙箱**:Code 节点跑自定义脚本(Python)。**未找到公开材料明确说明其代码执行的隔离/沙箱实现细节**(标注:未核实)。

## 6. 独特设计取舍(为什么有人选它)

- **Go 全栈 harness**:底座 Eino 用 Go(而非 Python),契合字节高并发后端;经豆包、抖音等内部大规模场景打磨后开源(据 CloudWeGo)。选它 = 要**生产级、高并发、可自托管**的 agent 后端。
- **Apache 2.0 + 无 SaaS 限制**:相对 Dify / n8n 的多租户/商用条款,Coze「几乎无限制,可商用、可二开、可再分发」(据 DEV 拆解文)。这是自建团队的关键卖点。
- **平台化而非库化**:开箱即有可视化画布、资源管理、Chat SDK、评测/可观测(Loop)全家桶——比 LangGraph/DIY 少很多脚手架工作。
- **代价**:开源版功能被裁(无多 agent / 语音 / 多模态生成 / 应用 UI builder),重度能力仍在托管商业版;组件多(Studio+Loop+Eino),学习/运维面较大。
- **对比锚点**:与 Dify / n8n / LangGraph / RAGFlow 常被并列比较(据 Jimmy Song 2026 对比文,未逐项复核)。

## 7. 采用度信号

- **GitHub star(GitHub API,2026-07-03 采集)**:
  - `coze-dev/coze-studio` — **21,104 ★ / 3,069 fork / 520 open issues**(created 2025-06-26,last push 2026-04-20)。
  - `coze-dev/coze-loop` — **5,575 ★ / 772 fork**(last push 2026-07-03,活跃)。
  - `cloudwego/eino` — **12,113 ★ / 1,007 fork**(created 2024-12-04,last push 2026-07-03)。
- **开源初期势头**:Coze Studio 开源后 **24h ≈1.2k★**、**48h ≈9k★**、**3 天破 1 万★**(据 Rohan Paul / 36Kr 报道)。
- **托管平台规模**:字节称豆包上已创建 **超 800 万个 agent、月活 2600 万**(据 kr-asia 引用,时点约 2024;标注:字节官方口径,非独立审计)。豆包(底层模型/助手)**2026-05 用户 3.3 亿**(据搜索聚合,非一手,标注估算/未复核)。
- **知名用户 / 内部背书**:Eino 官方称已在 **豆包(Doubao)、抖音/TikTok** 等内部产品实战使用(据 CloudWeGo)。**未找到公开的外部大客户具名清单**。

## 8. 来源

- Coze Studio 仓库(README/描述/许可/star):https://github.com/coze-dev/coze-studio
- Coze Studio wiki「What is Coze Studio」(组件/模型服务/资源):https://github.com/coze-dev/coze-studio/wiki/1.-What-is-Coze-Studio
- Coze Loop 仓库 + 架构 wiki(六模块/技术栈):https://github.com/coze-dev/coze-loop/wiki/3.-Architecture
- Eino 概览(组件/编排/ReAct/ADK):https://www.cloudwego.io/docs/eino/overview/
- Eino 开源公告(背景/内部使用):https://www.cloudwego.io/docs/eino/overview/eino_open_source/
- 36Kr 拆解「Coze 开源三大核心组件 / 48h 9K star」:https://eu.36kr.com/en/p/3398065816816003
- DEV 社区「Coze 到底开源了什么」(缺失功能 / 许可对比):https://dev.to/brooks_wilson_36fbefbbae4/what-exactly-did-coze-open-source-this-time-cp3
- kr-asia「ByteDance launches Coze」(首发时间 / 用户口径):https://kr-asia.com/bytedance-launches-coze-its-new-ai-agent-platform-in-beta

## 未核实 / 存疑标注

- **Coze 2.0(2026-01-19)** 具体能力仅经二手媒体(aibase),未在官方一手页复核。
- **Code 节点的沙箱/隔离机制**:未找到公开一手说明。
- **豆包 3.3 亿用户、Coze 800 万 agent/2600 万 MAU**:均为字节官方或媒体口径,非独立审计,时点也较早。
- **v0.5.1 版本号与 README star 数(21.1k)** 来自页面快照;GitHub API 同日计数已在 §7 给出为准。
