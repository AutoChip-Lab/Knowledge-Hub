# Agent 与 Agent Harness · 第 ㉔ 篇:拆解 · 构建 Agent 的工程框架

> 「Agent 与 Agent Harness」学习系列第 ㉔ 篇 · 案例拆解板块。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ Agent Harness → ⑫–㉘ 主流 Agent 与 Harness 拆解(**本篇**)→ ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:你已经看了「成品」,这篇看「造成品的车间」

前面十几篇拆的,大多是**成品**:Claude Code 是能直接用的 CLI,Devin 是托管到云上的服务,Cursor 是一个 IDE。你打开就能派活。

这一篇换个角度——拆的是**你自己搭 agent 时脚下那块地基**。

设想你不是要用一个现成的编码 agent,而是要给公司做一个「读合同、抽条款、走审批」的业务 agent,或者一个「查内部知识库、回答客服问题」的 agent。你不会从零手写 HTTP 请求去调模型、手搓一个 while 循环去解析工具调用、手写重试逻辑——你会**站在一个框架上**。这一篇拆的,就是这类框架:**你用来搭 agent 的工程底座**。

```
        agent 生态的三个楼层

   ┌─────────────────────────────────────────────┐
   │  成品 harness / 产品                          │  ← 前面拆过
   │  Claude Code · Cursor · Devin · OpenHands     │    (拿来即用)
   └───────────────────▲─────────────────────────┘
                       │ 用它/借鉴它
   ┌───────────────────┴─────────────────────────┐
   │  工程框架 / 底座  ← 本篇                       │
   │  LlamaIndex · Pydantic AI · DSPy              │    (你在上面搭 agent)
   │  Agno · Mastra · Semantic Kernel ·            │
   │  Strands Agents · Vercel AI SDK               │
   └───────────────────▲─────────────────────────┘
                       │ 调用
   ┌───────────────────┴─────────────────────────┐
   │  底层模型 / provider                          │
   │  OpenAI · Anthropic · Gemini · 本地模型 …     │    (发动机)
   └───────────────────────────────────────────────┘
```

讲通用 agent 与框架的那篇已经拆过 LangGraph(把 agent 建成一张图)和 Manus、AutoGPT。这一篇是它的**姊妹篇**,补上另一批底座——它们不比谁的 agent 循环更花哨(循环几乎都长一个样),而是各自在**别的维度**下了重注:类型安全、结构化输出、可编译优化的提示词、TypeScript 生态、企业级可审计。

> 读这一篇的正确姿势:**别问「哪个框架最好」,问「它把工程重心押在了哪个维度」。** 八个框架的 agent 循环是同一句话——「模型决策 → 调工具 → 回灌结果 → 再决策」;真正区分它们的,是这句话**外面**那圈工程。

---

## 1. 这一类到底是什么、边界在哪

先给一句定义:

> **「构建 agent 的工程框架」是一层库/SDK——它把「调模型 + 循环 + 工具 + 记忆 + 部署」这些搭 agent 的重复工程,封装成可复用的构件,让你用普通代码(Python/TypeScript)把 agent 拼出来、测出来、送上生产。** 它自己不产生智能(智能在模型里),它是**发动机外面那套底盘和仪表盘**。

这句话里藏着三条边界,划清楚了这一类才不会和别的东西混:

- **它不是模型。** LlamaIndex、Pydantic AI 这些全部是**模型无关(model-agnostic)**的——通过一层统一抽象接 OpenAI/Anthropic/本地模型,你换个模型不用改业务代码。框架自己不训练、不托管基础模型(见讲什么是 Harness 的那篇)。
- **它不(主要)是成品产品。** Claude Code 是「打开就用」;这些框架是「你在上面写代码」。虽然有些框架也带托管服务(LlamaCloud、Mastra Cloud、AgentOS、Bedrock AgentCore),但**核心身份是开源库**。
- **它比「一个 harness」更宽。** 讲 Harness 核心组件的那篇讲的是「一个 agent 运行时该有哪些部件」;而这些框架里,有的确实就是 harness(Strands 直接自称 agent harness),但也有的是**编排框架**(LlamaIndex 的事件驱动 Workflows、Mastra 的确定性图),甚至是**提示词编译器**(DSPy)——它们比单纯的运行时骨架管得更多。

**为什么值得单独一章?** 因为这是绝大多数团队真正会碰到的东西。你未必去魔改 Claude Code 的源码,但你大概率要在某个框架上搭自己的 agent。而这些框架的设计取舍,直接决定你写出来的 agent **好不好测、好不好换模型、上生产时会不会翻车**——这些恰恰是 demo 阶段看不出、上线才要命的维度。

> 一句话:成品 harness 教你「agent 长什么样」,工程框架决定你「能不能把它稳稳造出来」。

---

## 2. 一次任务在这类系统里怎么流动

八个框架的 agent 循环是**同一个骨架**(就是讲核心循环那篇讲的经典循环),所以先把这条通用流程走一遍,再看谁在哪一环加了独门料。挑最有代表性的两个走:一个「类型安全」派的 **Pydantic AI**,一个「事件驱动」派的 **LlamaIndex**。

**共通骨架**(设想你问一个带工具的 agent:「上海明天要带伞吗?」):

```
   用户 prompt
      │
      ▼
 ① 装配上下文   system 指令 + 历史 + 记忆 + 工具 schema  ──▶ 拼成一次模型输入
      │
      ▼
 ② 调模型       发给 LLM ──▶ 模型要么给最终文本,要么给若干 tool call
      │
      ├──有 tool call──▶ ③ 校验参数 → 执行工具(查天气 API)→ 结果回灌历史
      │                        │
      │                        └──▶ 回到 ②(带着工具结果再问模型)
      │
      └──只有文本──▶ ④ 校验/收敛 → 返回最终答案
```

**Pydantic AI 的走法**——多了一层「类型闸门」。它的运行循环其实是跑在一个叫 `pydantic-graph` 的通用状态机上,节点名很直白:`UserPromptNode`(装指令)→ `ModelRequestNode`(发请求)→ `CallToolsNode`(执行工具)→ 循环回 `ModelRequestNode` 或到 `End`。关键差异在 ③:工具的参数**先用 Pydantic 校验**才执行;如果模型给的参数不合 schema,**校验错误会作为一条 retry 请求回传给模型**,让它拿修正后的参数重试,直到达到重试上限。最终输出同样用 Pydantic 按 `output_type` 校验通过,才算到 `End`。——「即到即验」是它的灵魂,后面细拆。

**LlamaIndex 的走法**——同一条骨架,被摊成了一串**事件**。它的多 agent 编排器 `AgentWorkflow` 内部是一串带名字的 step:`init_run` → `setup_agent`(发 `AgentInput`)→ `run_agent_step`(让 LLM 决策,发 `AgentOutput`)→ `parse_agent_output`(有工具就发 `ToolCall`,没工具就结束)→ `call_tool`(发 `ToolCallResult`)→ `aggregate_tool_results`(回灌历史,回到决策)。你看,骨架完全一样,只是每一步的输入输出都被显式建模成一个 **event**——这让它天然能暂停、能流式、能并行。

> 一句话:**循环都一样,分野在「循环旁边加了什么」。** Pydantic AI 在每一步加了类型校验的闸门,LlamaIndex 把每一步变成了可路由的事件——同一个循环,两种工程气质。下面就把三个深拆对象逐一搬上手术台。

---

## 3. 拆开看

现在分别拆。前三个深拆(LlamaIndex / Pydantic AI / DSPy),各自代表一种鲜明的工程哲学;最后一个子节做「群像横扫」,把其余五个快速点清。

### 3.1 LlamaIndex:从「和数据对话」长成「事件驱动编排」

**它是谁**:LlamaIndex 出自 run-llama(公司 LlamaIndex, Inc.,创始人 Jerry Liu / Simon Suo),核心框架 MIT 许可。它**起家于 RAG**——把 PDF、表格、网页这些非结构化数据解析、切块、索引、检索,喂给 LLM。截至 2026 年中,它已经从「数据框架」长成了「事件驱动的 agent 编排框架 + 文档 agent 平台」:官方 GitHub 自述甚至改成了「the leading document agent and OCR platform」。GitHub 上 `run-llama/llama_index` 约 50.6k star(采集于 2026-07),仍高频发布(`llama_index` v0.14.23,2026-06-24),2025 年 5 月拿了 1900 万美元 A 轮。**活跃,未改名未被收购。**

它最值得拆的,是那个反直觉的编排内核——**Workflows**。

**先给直觉**:大多数编排框架让你「画一张图」——节点是步骤,边是流向(讲通用框架那篇里的 LangGraph 就是显式图)。LlamaIndex 偏不。它的 Workflows 是**事件驱动**的:你写一堆用 `@step` 装饰的函数,每个函数「接收一个 event → 干活 → 返回一个 event」。**没有中央调度器、没有显式路由表**——一个 step 返回什么类型的 event,就自动触发那个「类型注解声明接收该 event」的下一个 step。路由是靠**函数签名的类型注解**隐式决定的。

这套构件都是真实的运动部件(2025-06-30 已拆成独立包 `llama-index-workflows`):

- **Step**:`@step` 装饰的函数,输入/输出 event 类型从签名类型注解推断。
- **Event**:用户自定义的 **Pydantic** 对象;特殊的 `StartEvent`(入口,`.run()` 的参数挂在上面)、`StopEvent`(终止并返回结果)。
- **Context(`ctx`)**:跨 step 的共享状态(`ctx.store`)、发事件(`ctx.send_event`)、扇入等待一组事件(`ctx.collect_events`,做 map-reduce 的 fan-in)、向外部流式吐事件(`ctx.write_event_to_stream`)。
- **并行**:一个 step 返回 `list[Event]` 就触发并发,下游用 `list[Event]` 收集——天然支持扇出/扇入。
- **运行前静态校验**:产出的 event 有没有消费者、消费的 event 有没有生产者、有没有终止事件——都在跑之前查一遍。

**agent 是建在 Workflows 之上的。** `FunctionAgent`(模型支持工具调用时用)和 `ReActAgent`(不支持时用文本化 Thought/Action/Observation 循环)都继承自同一个 `BaseWorkflowAgent`。而多 agent 编排器 `AgentWorkflow`,内部就是 §2 拆过的那串 step 跑在 Workflows 引擎上。

这里有一个很漂亮的设计,值得单独记:**多 agent 的「交接(handoff)」被实现成了一个「工具」。** `AgentWorkflow` 里,一个 agent 想把活交给另一个 agent,不是靠什么特殊的调度指令——`handoff` 被 merge 进当前 agent 的 tools 列表,变成一个可以被 function-calling 触发的普通工具;它执行时把目标 agent 名字写进 `Context.next_agent`,下一轮就切到新 agent 值班。

> 反直觉的点:**LlamaIndex 里,「换一个 agent 来干」和「调一个工具」是同一件事。** 这就是为什么它能像去中心化交接那样工作——因为交接根本不是一个独立机制,只是「工具」这个概念的一次复用。用最少的新概念,撬动最多的能力,这是好抽象的标志。

**记忆**上它也分了层:短期是 SQL(默认内存 SQLite)存的 FIFO chat buffer,超 token 上限就丢弃或 flush 到长期;长期是三种 **Memory Block**——`StaticMemoryBlock`(不变的用户画像)、`FactExtractionMemoryBlock`(边聊边抽取事实)、`VectorMemoryBlock`(向量库语义召回历史)。每个 block 带 `priority`,超限时按优先级决定保谁(priority 0 = 永远保留)——这正是讲上下文压缩那篇讲的「长任务撑爆上下文」的一个具体工业答案。

**它的护城河和取舍**:文档解析(LlamaParse OCR)+ 检索是别的 agent 框架的弱项,LlamaIndex 把它做成一等公民。一个广为流传的第三方经验法则是:**如果你的应用大约九成是「和我的数据对话」,选 LlamaIndex;如果是通用自主 agent,LangGraph 更成熟——常见的生产组合是「LangGraph 管编排 + LlamaIndex 管检索」。** 代价是:事件驱动的隐式路由写起来像普通 async Python、样板少,但**全局拓扑不如显式图直观**——你得在脑子里拼出「哪个 event 触发哪个 step」。另外它**不提供代码执行沙箱**,工具就在宿主进程里跑,生产隔离靠 llama_deploy / LlamaAgents 的微服务化 + Docker。

### 3.2 Pydantic AI:把「类型安全」当第一性原理

**它是谁**:Pydantic AI 出自 **Pydantic 团队**(Pydantic Services Inc.)——就是做 Pydantic 数据校验库、FastAPI 底层校验层、Logfire 可观测性平台的那批人。MIT 许可。它的设计初衷官方说得很直白:「把 FastAPI 那种感觉带到 GenAI 开发里(bring that FastAPI feeling)」。仓库 2024-06 创建,v1.0 稳定版 2025-09-04 发布,v2.0.0 于 2026-06-23 发布(快照时最新 v2.5.0);GitHub star 约 18,203(2026-07-04 经 API 核实);Thoughtworks 技术雷达 2025-11 把它列为 **Trial**。**活跃、未改名未被收购。**

它的灵魂就一句话:**类型安全不是附加功能,是第一性原理。**

**先给直觉**:普通 agent 框架里,模型吐出来的东西是一坨文本,你自己解析、自己祈祷格式对。Pydantic AI 反过来——它把 Pydantic 的「用类型定义 schema + 运行时校验」这套范式,贯穿到 agent 的每一个接缝:结构化输出、工具参数、依赖注入,全部被**静态类型检查器(mypy/pyright)+ Pydantic 运行时校验**双重把关。

核心构件:

- **Agent**:核心「容器」,捆绑 instructions、工具、结构化 output type、dependencies、model、settings。类型上是泛型 **`Agent[DepsType, OutputType]`**——注意这个泛型签名,它让静态检查器能在你写代码时就抓到「你以为返回 A、实际会返回 B」这类错误,而不是等运行时炸。设计上可复用,类比一个 FastAPI app 实例。
- **pydantic-graph**:每个 agent run 底层跑在这个**通用、类型中心的有限状态机库**上。有意思的是它**不依赖 pydantic-ai**,可以独立拿来编排任何 workflow——图和 agent 抽象解耦。
- **工具与校验**:`@agent.tool` 装饰函数;参数由 Pydantic 校验,失败就**回灌重试**(§2 讲过的那个闸门)。
- **RunContext / dependencies**:运行期上下文,工具通过 `ctx.deps` 拿注入的依赖(数据库连接、配置、API key)、通过 `ctx.usage` 拿用量——这就是「FastAPI feeling」里的依赖注入。
- **Capability(能力)**:比单个 tool 更高层的复用单元,可以把「工具 + 生命周期钩子 + 指令 + model settings」四类东西捆成一包。官方举的例子很典型:一个「退款流程」capability = 退款指令 + 退款工具 + 审批门 + 提升推理强度,一次加载。还支持 `defer_loading=True`,把能力折叠成「一行目录条目」,由模型按需加载来省 prompt。

**一个讲课能拆到底的钩子**:Pydantic AI 有两种驱动模式。`run()` 是高层,自动跑完整个图返回结果;而 `iter()` 是低层,返回一个 `AgentRun`,你可以 `async for node in agent_run` **逐节点迭代**,甚至用 `await agent_run.next(node)` **手动驱动**——在每个节点执行前检查、修改、跳过。这意味着它的 agent 循环不是黑盒,你能一步一步把它掰开看。

它最强调的三件事,恰好画出它的定位:

1. **类型契约比别人硬。** 泛型 + 静态检查 + 运行时校验,结构化输出「即到即验(streamed structured outputs with immediate validation)」。
2. **可观测性走开放标准。** 原生 OpenTelemetry / Logfire 集成,不是私有埋点——Thoughtworks 雷达专门点名这是优势。
3. **持久执行(durable execution)是关键卖点。** 官方维护 4 个持久化后端集成——**Temporal、DBOS、Prefect、Restate**。以 Temporal 为例:用 `TemporalAgent` 包装 agent 后,**所有非确定性工作(模型调用、工具执行、外部 API)自动下放成 Temporal Activities**,agent 的协调逻辑本身成为确定性 Workflow;结果记进 workflow history,进程重启后从 history **确定性重放**、取缓存结果而非重跑。这让一个 agent 能扛过 API 抖动、进程崩溃、甚至跨天的长任务不丢进度——这是讲上下文管理那篇提到的「可恢复性」在框架层最工程化的一个答案。

> 记住 Pydantic AI 的一句话:**它赌的是「构建 GenAI 应用说到底还是软件工程」。** 别的框架比谁出 demo 快,它比谁能稳稳上生产、能被 mypy 检查、能被 pytest 测、能崩了重放。代价也在这:它的 Harness 电池库(`pydantic-ai-harness`,含 Code Mode 沙箱、文件系统、Shell 等)仍在 0.x,API 未稳定;而且它**没有独立的规划器组件**,规划隐含在模型的 tool-call 循环里,重度依赖模型本身的能力。

### 3.3 DSPy:把「提示词」变成可编译优化的参数

前两个框架拆的是「怎么把循环跑稳」。DSPy 拆的是一个**完全不同维度**的问题——它几乎不在乎循环长什么样,它在乎的是:**你的提示词凭什么是手写死的?**

**它是谁**:DSPy 起源于 **Stanford NLP**,项目负责人 Omar Khattab,mentor 里有 Matei Zaharia(现挂 UC Berkeley 与 Databricks)、Chris Potts 等,和 Databricks 关系紧密(有官方 tracing 集成)——但**注意:DSPy 本身仍是 stanfordnlp 组织下的独立开源项目,并未被 Databricks 收购**,「它属于 Databricks」是不准确的口径。MIT 许可,`stanfordnlp/dspy` 约 35.8k star(2026 年中),最新稳定版 3.2.1(2026-05-05)。名字常被回溯解释为「Declarative Self-improving Python(声明式自改进 Python)」——这是社区通行读法,非严格官方词源,当弱断言看。**活跃维护中。**

**先给直觉,也是全篇最反直觉的一个钩子**:你辛辛苦苦调了两周的那段 prompt,换个模型可能就全崩了——因为提示词是脆的、和具体模型强耦合的。DSPy 的主张是:

> **别再手写提示词了。你只声明「要做什么」(输入输出的类型契约),提示词的具体文字和示例,交给一个优化器针对你的评分标准去自动搜索生成。** 提示词不该是你手抠的常量,它是一个**可以被程序编译优化的参数**。

它的官方口号就是「**programming—rather than prompting**(编程,而非提示)」。核心是把两件事解耦:**程序的流程(modules)** 和 **每一步的参数(提示词文本 + few-shot 示例 + 可选权重)**——后者由优化器自动搜,而不是人肉调。

真实的运动部件:

- **Signature(签名)**:任务的**声明式 I/O 规格**——带类型的输入输出字段(如 `question -> answer`)。它声明「做什么」,不写「怎么提示」。
- **Module / Predictor**:给某个 signature 绑定一种调 LM 的策略。内置的有 `Predict`(最基础)、`ChainOfThought`、`ReAct`、`ProgramOfThought`、`CodeAct` 等。
- **Adapter(适配器)**:signature ↔ 具体提示词/消息之间的**翻译层**。它把 signature + few-shot + 历史格式化成多轮消息、调 LM、再把输出**解析回**对应字段的字典。变体:`ChatAdapter`(默认,字段标记格式)、`JSONAdapter`(强制吐 JSON)、`TwoStepAdapter`(先自由生成再结构化抽取)。这层是关键——因为「怎么提示、怎么解析」的脏活被它抽走了,理论上**换模型只需重编译,不改业务代码**。
- **Optimizer(优化器,旧称 teleprompter)**:DSPy 的灵魂。给定一个 metric(你写的评分函数),它自动去调提示词的指令和/或 few-shot 示例。点名几个:`BootstrapFewShot`(用程序自己跑训练集、把**跑对的轨迹**收集成 few-shot 示例注入)、`MIPROv2`(用**贝叶斯优化**同时搜索指令 + 示例的联合空间)、`GEPA`(用 LLM **反思执行轨迹**——读评估日志、报错、约束违规这些**文本反馈**而非只看标量分——来变异指令,并维护一个 Pareto 前沿)。

**它的两条回路**(这是理解 DSPy 的关键):

**前向回路(运行时)** 其实平平无奇——就是普通的 forward:模块拿输入 → Adapter 格式化成 prompt(带上已编译进来的 few-shot 示例)→ 调 LM → Adapter 解析回结构化输出。如果模块是 `dspy.ReAct`,这一步展开成一个显式的 `for` 循环(默认 `max_iters=20`):每轮产出 `next_thought / next_tool_name / next_tool_args`,执行工具、结果存进 trajectory(轨迹)、回灌下一轮,直到模型选择内置的 `finish` 工具。**工具报错也会被当成 observation 记进上下文**,让模型自我纠正。

**编译/优化回路(离线,DSPy 真正的灵魂)** 才是它和所有其他框架的分水岭:你调 `optimizer.compile(program, trainset=..., metric=...)`,优化器就在**候选提示空间**里搜索——用 metric 打分(配合 trace 验证中间步骤)、选最优配置——最后产出一个**已编译的程序**:结构没变,但每个 predictor 内部已经**绑定了优化后的指令 + 示例**,可以序列化保存。之后再跑前向回路,用的就是这套调好的产物。

> DSPy 最该记住的一句话:**它的核心不是「更好的 agent 循环」,而是「把提示词当作可被程序化优化的参数」。** 运行前用编译回路把提示调好,运行时才是普通 forward。这也是它为什么定位「窄而深」——它不做 IDE、不做托管、不做长期记忆库、也没有一等公民的多 agent handoff 原语;多 agent 就是把多个 module 当子模块组合进一个更大的 `forward()`。

**取舍很清楚**:要吃到优化红利,你**得先有数据集 + metric**(纯零样本用它收益有限);编译是**离线的、要跑很多次 LM 调用**(有成本、有时间);而且 API 历史上演进较快(2.x → 3.x 有破坏性变化),学习曲线偏抽象。但如果你的场景是「同一套 pipeline 要频繁换模型、要把准确率榨到极限」,DSPy 给你的东西别的框架给不了——**一个提示词编译器**。

### 3.4 群像横扫:其余五个各占一个山头

深拆完三个,剩下五个各有鲜明定位,快速点清。它们和前三个共享同一个 agent 循环骨架,区别全在「押注的维度」。

**Agno(原 Phidata)——押「性能 + 无状态运行时」。** Agno Inc.(创始人 Ashpreet Bedi)出品的 Python 多智能体框架,Apache-2.0(2026 年 2 月从 MPL 2.0 改过来),约 40.8k star(2026-06)。它的一句话定位是「Agent Framework and High-Performance Runtime」。独特点有二:一是**极致的每-agent 开销**——官方(厂商自测,需谨慎)称 Agent 实例化约 3μs、单 agent 内存约 6.6KB;二是 **v2(2025-09-09)把 Agent 改成完全无状态(stateless)**——运行状态从 DB 读出来注入,而不是挂在对象上,所以它的运行时 **AgentOS**(一个预制的 FastAPI 应用,50+ REST 端点、RBAC、多租户、可观测)能像普通无状态微服务一样**水平扩展**。它官方定义 Agent 就是「围绕无状态模型的一个有状态控制回路」。**私有优先**是它的差异卖点:控制面直连你自己的 AgentOS,**数据不出你的基础设施**。多 agent 靠 Team 的三种模式(Route/Coordinate/Collaborate)。**活跃、高速迭代。**

**Mastra——押「TypeScript 生态 + 确定性图与自主 agent 并列」。** 由前 Gatsby 团队(Sam Bhagwat、Abhi Aiyer、Shane Thomas)打造的 TS agent 框架,YC W25,核心 Apache-2.0(`ee/` 企业目录为 source-available),约 25.8k star(2026-07-04)。它瞄准的是**不想为了做 agent 跳到 Python 的 web 开发者**,口号「a framework for the next million AI developers」。特点:**agents(自主循环)和 workflows(确定性图)是两个并列的一等公民**,还能互相嵌套(workflow step 里调 agent,agent 把 workflow 当工具),适合「大部分确定、局部需要自主」的生产流程;记忆原生分层(working / semantic recall / observational memory);多 agent 走 supervisor 模式(subagent 以 tool call 形式委派,带 `onDelegationStart/Complete` 钩子和记忆隔离)。它有自研的 model router(号称覆盖 133+ providers),同时**兼容 Vercel AI SDK v6**——注意这个关系,下面要对照。已发 1.0(2026-01-20),Series A 2200 万美元。**活跃、快速增长。**

**Semantic Kernel(SK)——押「.NET 企业级 + 依赖注入」,且正在被继任者取代。** 微软出品的模型无关企业级编排 SDK,MIT 许可,C#/Python/Java 三语言并重(C# 约 66%、Python 约 32%),约 28.3k star(2026-06)。它最鲜明的差异是**以依赖注入为中心**:那个「内核(Kernel)」本质就是一个 DI 容器,管理所有 Services 和 Plugins——这天然贴合 .NET 企业工程实践,也是它在 .NET 阵营被采用的主因。它还是一个**很好的教学案例**:SK 早期押注显式 **Planner**(`SequentialPlanner` 等)让 LLM 生成执行计划,后来随着模型 function calling 成熟,**Planner 被弃用、退回到 Auto Function Calling**(模型即规划器)——一个「框架抽象被模型能力吞并」的活标本(见讲规划那篇)。**关键状态:SK 已被继任者 Microsoft Agent Framework(MAF,2026-04-03 发布 1.0 GA)取代**——官方原话是「把 MAF 当作 Semantic Kernel v2.0」,承诺 SK v1.x 在 MAF GA 后至少再支持一年。MAF 引入了确定性 workflow(改良版 Pregel/BSP 超步模型,带同步屏障和检查点)和 CodeAct 沙箱(在隔离的 Hyperlight micro-VM 里跑 Python)。**未被弃用,但重心已迁到 MAF。**

**Strands Agents——押「model-driven + 开箱可观测的 harness」,AWS 出品。** AWS 开源的「model-driven」agent SDK,Apache-2.0,2025-05 开源、2025-07 发 1.0。它是八个里**唯一直接自称「agent harness」**的——官方定位「build an agent harness, control it end-to-end」。核心赌注:**现代 LLM 的原生推理 + 工具调用已经够强**,所以把规划/工具编排交给模型,SDK 只提供「把这套循环跑稳、可观测、可上生产」的最小骨架,把上线周期从数月压到数天。特点:**默认全链路 OpenTelemetry 追踪**(「默认追踪每个决策」)、hooks 可拦截任意一步、内建 guardrails/steering;记忆有 `SlidingWindow` 和 `Summarizing` 两种 `ConversationManager`;多 agent 原语齐全(Swarm/Graph/Workflow/Agents-as-Tools/Handoffs/A2A);还有个轻量沙箱 `Strands Shell`——in-process、Bourne 兼容、冷启动 <1ms,靠声明式白名单限权(「给 agent 一个 shell,但不给它你机器的钥匙」)。2026 年核心仓库从 `sdk-python` 重命名为 **`harness-sdk`** 并整合成 Python+TS monorepo,约 6,405 star(2026-07),PyPI 上月下载约 3,386 万次。**AWS 内部生产血统**(Q Developer、Glue 等在用),下承各家 LLM、上接 Bedrock AgentCore 托管。**活跃、高频迭代。**

**Vercel AI SDK——押「最小抽象 + 前端一体化」,TS 生态的事实标准候选。** Vercel(Next.js 母公司)出品的 provider 无关 TS 工具库(npm 包名 `ai`),Apache-2.0,约 25.4k star、周下载约 1,545 万次(2026-07-04,均为直查)。它的身份**横跨多层**:核心是极小抽象的调用层(`generateText`/`streamText`/`generateObject`),往上从 AI SDK 5 起加了 agent 循环原语(`stopWhen`/`prepareStep`)、AI SDK 6 加了 `Agent` 接口和 `ToolLoopAgent`(默认最多 20 步)、AI SDK 7(2026-06-25)加了 durable 的 `WorkflowAgent` 和 `HarnessAgent`。它的哲学是**几乎零抽象**——官方明说「凡是 `Agent` 能做的,`generateText`/`streamText` 都能做」,`Agent` 只是配置的封装;规划权完全在 LLM,SDK 只给循环骨架 + 每步 hook。两个差异化:一是**前端一体化**(`AI SDK UI` 的 chat/generative hooks 打通 React/Next.js,端到端类型安全 + SSE 流式,是 Vercel 的主场);二是 2026 新增的 **`HarnessAgent`**——用一套 API 桥接 Claude Code / Codex / Pi 等**成型的外部 harness**(竞品少见的取向)。**注意它没有一等公民的多 agent handoff 原语,也不内置代码沙箱。高度活跃。**

> 群像的一句话:**这五个不是「五个同类」,是「五个不同赌注」。** Agno 赌运行时可扩展,Mastra 赌 TS 开发者体验,SK 赌 .NET 企业地盘,Strands 赌可观测可控的 harness,Vercel AI SDK 赌前端一体化和最小抽象。选哪个,先看你站在哪个生态、最痛的是哪个维度。

---

## 4. 它们与众不同的设计决策与取舍

退一步,把八个框架的「押注」对齐看,会看到几组清晰的张力。

**张力一:循环相同,重心不同。** 前面反复强调:八个框架的 agent 循环几乎是同一句话(模型决策→调工具→回灌→再决策)。这不是巧合——**因为循环本身已经是被讲透的公共知识了**(见讲核心循环那篇)。真正的竞争发生在循环**之外**:类型契约(Pydantic AI)、提示词优化(DSPy)、事件驱动可暂停(LlamaIndex)、无状态可扩展(Agno)、前端一体化(Vercel AI SDK)、企业 DI(SK)。这印证了讲什么是 Harness 那篇的核心论点——**同一个模型、同一个循环,外面那圈工程决定成败。**

**张力二:「显式图」vs「隐式路由」vs「纯 Python 循环」。** 三种编排哲学在这批框架里都能找到样本:讲通用框架那篇的 LangGraph 是**显式图**(你画节点和边);LlamaIndex Workflows 是**隐式事件路由**(step 签名即路由,少样板但全局拓扑不直观);Agno 主打**纯 Python、无 graph/无 chain**(直接写类,学习曲线低)。Mastra 和 SK/MAF 则**两条都要**——确定性图和自主 agent 并列成一等公民,让「大部分确定、局部自主」的流程都能表达。没有对错,只有「你的流程有多确定」这个问题的不同答案。

**张力三:「相信模型」vs「约束模型」。** Strands 和 Vercel AI SDK 站「相信模型」这端——把规划交给 LLM 的 chain-of-thought,SDK 只给最小骨架;它们赌模型已经够强。DSPy 和 Pydantic AI 站「约束模型」这端——DSPy 不信手写 prompt、要用数据把它编译优化;Pydantic AI 不信模型输出、要用类型校验每一个接缝。这条张力其实是讲规划那篇「模型即规划器」争论在框架层的回响。

**张力四:开源库 vs 托管平台的收敛。** 几乎每个框架都在往「库 + 运行时/托管」两头长:LlamaIndex 有 LlamaCloud/LlamaAgents,Mastra 有 Mastra Cloud,Agno 有 AgentOS,Strands 有 Bedrock AgentCore,Vercel AI SDK 背靠 Vercel 平台,SK 通往 Azure/Foundry。这反映一个共同判断——**光给库不够,团队要的是「从原型到生产」那一整段**。但每往托管走一步,就多一分厂商绑定的风险(下一节的坑)。

> 一句话把四条张力收口:**这批框架分歧的从来不是「agent 怎么想」,而是「你这个工程师怎么把它管住、测住、扩住、送上线」。** 模型是发动机,它们卖的是底盘、仪表盘、和保修单。

---

## 5. 局限与坑

这类框架最容易踩的坑,几乎都不在「能不能跑」,而在「上生产、长期维护、换东西」时才暴露。诚实列几条(机器会渲染成⚠️警示卡):

1. **框架的 API 演进速度,是你没算进去的技术债。** 这批框架**普遍迭代极快**:Pydantic AI 一年内 v1→v2、Mastra 1.x 已到 1.48 且弃用过 `.network()` 等原语、DSPy 2.x→3.x 有破坏性变化、Agno 单月发过约 10 个大版本、Vercel AI SDK 一年跳了三个大版本(5→6→7)。**致命处**:你照着某篇博客写的代码,半年后可能就跑不了了,升级要跟迁移指南。**怎么避**:选框架时把「版本策略」当硬指标看(Pydantic AI 就明确承诺 v1 发布后至少 6 个月无破坏性变更);把框架版本**锁死**、升级当独立任务排期,别在业务迭代里顺手升。

2. **「模型无关」是真的,但「零成本换模型」是幻觉。** 所有框架都自称 model-agnostic,换 provider 只改配置。**但这只保证「调用能通」,不保证「效果一样」。** 你精心为 GPT 调的提示词、为某模型的工具调用格式做的假设,换到另一个模型上可能悄悄掉点——尤其是走 ReAct 文本循环(而非原生 function calling)的路径。**怎么避**:换模型后**重跑评测**(见讲评测 agent 那篇),别只看「能不能跑」;如果换模型是常态,认真考虑 DSPy 这种「换模型就重编译提示」的路子。

3. **多数框架不内置代码沙箱——工具就在你的进程里裸跑。** LlamaIndex、Mastra、Agno、Vercel AI SDK 的底稿都明确:**没有自带的代码执行沙箱**,工具的 `execute` 直接在宿主进程里跑。**致命处**:一旦你给 agent 的工具能执行任意代码或碰文件系统,一次提示注入(见讲权限与沙箱那篇)就可能让它在你的服务器上乱来。**怎么避**:别把「框架能编排工具」误当成「框架帮你隔离了工具」;高危工具自己上隔离(容器/外部服务/带白名单的沙箱如 Strands Shell、DSPy 的 WASM `PythonInterpreter`、MAF 的 Hyperlight micro-VM),权限按最小化给。

4. **DSPy 的优化红利,不投喂数据就吃不到。** DSPy 最诱人的是「自动优化提示词」,但**很多人忽视了它的前提**:优化器要工作,**你必须先有一个训练/开发集 + 一个能打分的 metric**。**致命处**:纯零样本、没有数据集的场景硬上 DSPy,你只会得到一个「更抽象、更难懂」的普通框架,却吃不到它最核心的价值,反而背上学习曲线。**怎么避**:上 DSPy 前先问「我有没有 metric、有没有几十上百条带标注的样例」;没有就先把数据攒出来,或先用更轻的框架。

5. **越往「托管/运行时」靠,厂商绑定的爆炸半径越大。** 这批框架几乎都往「库 + 平台」两头长(§4 张力四)。**致命处**:你图省事深度用了某家的托管(LlamaCloud、AgentOS、Bedrock AgentCore、Mastra Cloud),会话/记忆/部署都长在它上面,哪天要迁移,成本远超「换个库」。SK 更极端——它整个正在被继任者 MAF 取代,今天照 SK 写的东西,官方都在引导你迁向 MAF。**怎么避**:把「核心 agent 逻辑(开源库那部分)」和「托管运行时」在架构上分层解耦,让托管是可替换的;押注前查清楚这个框架**是否处于被继任/大改的过渡期**(SK→MAF 就是活例子)。

6. **别把「framework 帮你搭好了」当成「你不用懂里面在干嘛」。** 这些框架把循环、记忆、重试封装得很顺手,顺手到你可能整个 agent 上线都没搞清它内部怎么转。**致命处**:一旦线上出问题(死循环烧钱、上下文被压缩吃掉了关键信息、工具静默失败),你连去哪看都不知道。**怎么避**:上生产前,至少用 Pydantic AI 的 `iter()` 逐节点驱动、或 Strands/Pydantic AI 的 OpenTelemetry 追踪,把这个框架的循环**亲手拆开看一遍**——你封装的东西,你得能拆开。

---

## 6. 一句话记住它们 + 对比表

> **这一类是「你用来搭 agent 的工程底座」——八个框架的 agent 循环几乎一模一样,真正区分它们的是循环外面那圈工程:LlamaIndex 押事件驱动编排 + 文档检索,Pydantic AI 押类型安全,DSPy 押可编译优化的提示词,Agno 押无状态高性能运行时,Mastra 押 TS 生态,Semantic Kernel 押 .NET 企业级(且正被 MAF 取代),Strands 押可观测可控的 harness,Vercel AI SDK 押前端一体化。选它不是选「最好的循环」,是选「和你生态最合、最痛维度最对症」的那圈工程。**

八个横向对齐(数字均为截至 2026 年中的快照,star/版本会持续漂移;凡厂商自测已标注):

| 框架 | 定位 | 内核/招牌 | 语言 | 开源闭源 | 最适合谁 | 状态 |
|---|---|---|---|---|---|---|
| **LlamaIndex** | 数据框架 → 事件驱动编排 + 文档 agent 平台 | Workflows 事件驱动引擎(step 签名即路由)+ LlamaParse 检索 | Python(+TS) | 开源(MIT,核心);LlamaCloud 闭源托管 | 九成是「和我的数据对话」、重 RAG/文档 | 活跃(~50.6k★) |
| **Pydantic AI** | 类型安全 Python agent 框架 | 泛型 `Agent[Deps,Output]` + Pydantic 校验 + pydantic-graph + durable execution | Python | 开源(MIT) | 已用 Pydantic/FastAPI、要稳要可测上生产 | 活跃(~18.2k★,v2) |
| **DSPy** | 「编程而非提示」的 LLM 程序框架 + 提示编译器 | Signature/Module/Adapter + Optimizer(MIPROv2/GEPA) | Python | 开源(MIT,Stanford NLP) | 有数据集+metric、要频繁换模型/榨准确率 | 活跃(~35.8k★) |
| **Agno** | 高性能多智能体框架 + 运行时 | 无状态 Agent + AgentOS(FastAPI 运行时,可水平扩展) | Python | 开源(Apache-2.0) | 要高并发、私有自托管、数据不出边界 | 活跃(~40.8k★,v2) |
| **Mastra** | TypeScript agent 框架 | 自主 agent 与确定性 workflow 并列一等公民 + 分层记忆 | TypeScript | 开源(Apache-2.0;`ee/` 企业目录 source-available) | JS/TS web 开发者、「大部分确定局部自主」 | 活跃(~25.8k★,v1) |
| **Semantic Kernel** | .NET 企业级编排 SDK | 内核=DI 容器 + Auto Function Calling(Planner 已弃用) | C#/Python/Java | 开源(MIT) | .NET 企业、要 DI/审计/多语言 | 维护+继任(被 MAF 取代,~28.3k★) |
| **Strands Agents** | AWS 的 model-driven agent harness | 极简循环 + 默认 OTEL 全链路 + Strands Shell 沙箱 | Python + TypeScript | 开源(Apache-2.0) | 已在 AWS、把可观测/可控放第一位 | 活跃(~6.4k★,v1.45) |
| **Vercel AI SDK** | provider 无关的 TS AI/agent 工具库 | 最小抽象循环(`stopWhen`/`prepareStep`)+ 前端 UI hooks + HarnessAgent 桥接 | TypeScript | 开源(Apache-2.0) | Next.js/React 前端一体化、要最小抽象 | 高度活跃(~25.4k★,v7) |

**怎么选**(一句话决策):重**文档/RAG** → LlamaIndex;要**类型安全、稳上生产、能崩了重放** → Pydantic AI;要**自动优化提示、频繁换模型** → DSPy;要**高并发、私有自托管** → Agno;是 **TS/web 开发者** → Mastra 或 Vercel AI SDK(前者 batteries-included、后者最小抽象+前端一体);在 **.NET 企业** → Semantic Kernel(但盯着 MAF 迁移);已在 **AWS、要可观测可控** → Strands。

对照前面拆的成品 harness:那些拆过 Claude Code、Cursor、Aider 的篇章,讲的是别人替你把这圈工程做好了的**成品**;而这一篇的八个,是让你**自己造成品**的底座。看懂了它们各自押注哪个维度,你下次要搭 agent 时,就不会再问「用哪个框架」,而会问「我最痛的是哪个维度」——这才是这一篇真正想给你的判断力。

> 👉 下一篇,我们把视线从「怎么搭」抬到「怎么让它在真实业务里跑起来、跑得住」。
