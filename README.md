# AutoChip Knowledge Hub

AutoChip Knowledge Hub 是由 AutoChip Lab 维护的开放学习资料库，面向希望系统学习芯片设计、AI agent 与 agent engineering 的读者，也面向准备搭建芯片设计方向 agent 的研究者和开发者。

这个仓库不是零散资料的备份，而是一个 **开放、系统、可直接访问的网页知识入口**。我们希望把芯片设计流程、agent 原理、harness、memory、自演化机制和多智能体系统等主题整理成结构化的学习文档。读者不需要预先配置复杂环境，只要打开对应链接，就可以按主题学习和分享。

AutoChip Lab 关注的是 **Agentic AI for End-to-End Chip Design**，探索如何让专门化的 AI agent 参与架构探索、RTL 生成、功能验证、综合优化、物理设计、评测、任务规划、工具调用和 memory 管理等芯片设计环节。Knowledge Hub 将这一方向所需的基础知识开放出来，希望既能帮助初学者建立完整认知，也能为芯片设计与 agent 交叉方向的研究和实践提供参考。

当前 Knowledge Hub 包含六个并列的学习文档，覆盖芯片设计流程、agent 工程、多智能体协作、自演化机制和具体 agent 系统拆解。点击知识库名称即可直接打开对应网页：

| 知识库 | 主要内容 |
| --- | --- |
| [Chip&#8209;Design](https://autochip-lab.github.io/Knowledge-Hub/Chip-Design/) | 梳理芯片从产品定义、系统规格、架构、RTL、验证、综合、物理设计、签核、流片到 bring-up / 量产的完整工程流程。 |
| [Agent](https://autochip-lab.github.io/Knowledge-Hub/Agent/) | 系统讲解 agent 的核心循环、工具调用、上下文与记忆、规划推理、harness、权限安全、运行时和工程框架。 |
| [Multi&#8209;Agent](https://autochip-lab.github.io/Knowledge-Hub/Multi-Agent/) | 学习多智能体编排，包括角色分工、handoff、控制流、通信协议、共享状态、可靠性、安全和 serving。 |
| [Self&#8209;Evolving&nbsp;Agents](https://autochip-lab.github.io/Knowledge-Hub/Agent-Self-Evolving/) | 以时间线梳理自演化 agent 的代表性研究、核心机制、公式、实验结果、实现模式与现实局限。 |
| [Hermes&nbsp;Design&nbsp;Flow](https://autochip-lab.github.io/Knowledge-Hub/Hermes-Design-Flow/) | 从源码路径拆解 Hermes Agent 的核心架构、执行闭环、memory 与 skill 更新、工具与子代理、会话存储和搜索。 |
| [Multi&#8209;Agent&nbsp;Knowledge](https://autochip-lab.github.io/Knowledge-Hub/Multi-Agent-Knowledge/) | 以中英双语系统讲解角色与团队、任务规划、协作拓扑、通信协议、路由交接、评测调试、安全生产化和案例。 |

## 这个仓库解决什么问题

| 目标 | 说明 |
| --- | --- |
| 系统学习 | 为芯片设计、agent 和多智能体系统提供结构化的学习路径。 |
| 跨领域入门 | 帮助芯片背景与 AI 背景的读者补齐彼此领域的基础知识。 |
| 芯片 Agent 实践 | 在搭建芯片设计 agent 前，先理解对应工程环节和 agent 系统能力。 |
| 网页化学习 | 大部分资料以网页形式呈现，适合直接分享链接和浏览器阅读。 |
| 开放扩展 | 持续加入新的学习文档，逐步形成可公开使用的交叉领域知识体系。 |

## 知识文档

### 1. [Chip-Design](https://autochip-lab.github.io/Knowledge-Hub/Chip-Design/)

#### 文档定位

《芯片设计完整流程》面向对芯片设计流程还不熟悉的读者，以及希望理解芯片设计 agent 应该如何嵌入真实工程流程的研究者和开发者。

这份文档的目标不是把每个环节都讲到专家级深度，而是先建立一张完整的工程地图：一颗芯片从最早的产品需求，到系统规格、架构、RTL、验证、综合、物理设计、签核、流片、制造、封装测试，再到 bring-up 和量产，中间到底经历了哪些阶段，每个阶段解决什么问题，产出什么东西，又会影响下游哪些环节。

如果希望搭建芯片设计方向的 agent，就不能把它当作脱离工程流程的聊天机器人。只有先理解芯片设计全流程，才能判断：

- architecture agent 应该服务哪个阶段；
- RTL agent 的输入和输出应该是什么；
- verification agent 为什么必须理解规格、RTL 和 testbench；
- backend / physical-design agent 为什么要关心 PPA、时序和签核；
- tapeout 或 bring-up 相关 agent 为什么需要理解真实硅片回片后的问题。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 芯片设计初学者 | 快速建立芯片设计全流程的基本框架。 |
| 做 AI agent 但不熟悉芯片流程的成员 | 理解 agent 应该嵌入哪些工程环节。 |
| 做架构、RTL、验证或后端方向的成员 | 从全局视角理解自己所在环节的上下游关系。 |
| 准备搭建芯片设计 agent 的研究者和开发者 | 理解不同 agent 所需的输入、输出、约束与工具环境。 |

#### 内容总览

这份文档把芯片设计流程压缩成五个连续阶段，先看分组，再进入每个环节的细节：

| 流程段 | 包含环节 | 主线 |
| --- | --- | --- |
| 需求与规格 | ① 产品定义与市场需求 -> ② 系统规格 | 把“为什么做、做成什么样”变成工程约束。 |
| 设计实现 | ③ 架构设计 -> ④ 微架构设计 -> ⑤ RTL 设计 | 把目标落到可实现的硬件结构和代码。 |
| 验证与收敛 | ⑥ 功能验证 -> ⑦ 逻辑综合 -> ⑧ 物理设计 -> ⑨ 签核 | 证明设计正确，并收敛时序、功耗、面积和规则检查。 |
| 制造交付 | ⑩ 流片 -> ⑪ 制造 -> ⑫ 封装测试 | 从设计文件走向真实、可测试、可交付的芯片。 |
| 硅后闭环 | ⑬ bring-up / 量产 | 在真实硅片上点亮、调试、爬坡并反馈下一轮设计。 |

完整顺序：`① 产品定义` -> `② 系统规格` -> `③ 架构` -> `④ 微架构` -> `⑤ RTL` -> `⑥ 验证` -> `⑦ 综合` -> `⑧ 物理设计` -> `⑨ 签核` -> `⑩ 流片` -> `⑪ 制造` -> `⑫ 封测` -> `⑬ bring-up / 量产`

#### 每一部分在讲什么

| 阶段 | 核心问题 | 对 Agent 开发的启发 |
| --- | --- | --- |
| ① 产品定义与市场需求 | 决定为什么要做这颗芯片、给谁用、目标是什么。 | 帮助 agent 理解设计任务背后的产品目标，而不是只优化局部指标。 |
| ② 系统规格 | 把产品目标翻译成可执行、可验证的工程规格。 | verification agent、architecture agent 都需要以规格为约束。 |
| ③ 架构设计 | 决定芯片的系统结构、模块划分、数据流和关键权衡。 | architecture agent 的核心工作区。 |
| ④ 微架构设计 | 把架构细化成流水线、状态机、缓冲、控制逻辑等结构。 | 连接架构决策和 RTL 实现，是 RTL agent 的重要上游。 |
| ⑤ RTL 设计 | 用硬件描述语言实现可综合的数字逻辑。 | RTL generation / repair agent 的主要工作区。 |
| ⑥ 功能验证 | 验证 RTL 是否符合规格和预期行为。 | verification agent 的主要工作区。 |
| ⑦ 逻辑综合 | 把 RTL 转换成门级网表，并进行初步 PPA 优化。 | synthesis-aware agent 需要理解这一阶段的约束和反馈。 |
| ⑧ 物理设计 | 完成 floorplan、placement、CTS、routing 等后端实现。 | physical-design agent 的核心工作区。 |
| ⑨ 签核 | 在 tape-out 前完成时序、功耗、物理规则、等价性等检查。 | agent 需要理解什么问题会阻止设计进入流片。 |
| ⑩ 流片 | 将最终设计交付制造，进入不可轻易回退的阶段。 | 帮助 agent 理解 tapeout readiness 的意义。 |
| ⑪ 制造 | 晶圆厂根据版图制造真实硅片。 | 让团队理解设计决策如何影响良率、成本和制造风险。 |
| ⑫ 封装测试 | 将 die 封装成可用芯片，并进行测试、筛选和分级。 | 帮助理解 DFT、测试覆盖率和量产质量之间的关系。 |
| ⑬ bring-up / 量产 | 回片后点亮、调试、硅验证、良率爬坡并进入量产。 | 让 agent 设计考虑真实硅片调试、可观测性和工程闭环。 |

#### 推荐阅读顺序

如果你是第一次阅读，建议不要跳着看。可以按下面的节奏理解：

```mermaid
flowchart LR
  A["①-②\n先理解需求和规格"] --> B["③-④\n再理解架构和微架构"]
  B --> C["⑤-⑥\n进入 RTL 与验证"]
  C --> D["⑦-⑨\n理解综合、后端和签核"]
  D --> E["⑩-⑬\n理解流片、制造和量产"]
  E --> F["进入芯片设计 Agent 实践"]
```

如果你已经知道自己要做的 agent 方向，可以重点阅读对应部分：

| 方向 | 优先阅读 |
| --- | --- |
| Architecture Agent | ①、②、③、④ |
| RTL Agent | ③、④、⑤ |
| Verification Agent | ②、⑤、⑥ |
| Synthesis / Backend Agent | ⑤、⑦、⑧、⑨ |
| Tapeout / Bring-up Assistant | ⑨、⑩、⑪、⑫、⑬ |

#### 这份文档的特点

- **网页化**：可以直接通过浏览器访问，不需要本地环境。
- **流程化**：按芯片从想法到量产的真实顺序组织。
- **面向新人**：重点是建立全局认知，而不是堆砌细节。
- **面向实践**：每个阶段都可以映射到相应的芯片设计 agent 和工具链。
- **适合反复引用**：之后讨论具体 agent 时，可以直接引用某个流程阶段。

### 2. [Agent](https://autochip-lab.github.io/Knowledge-Hub/Agent/)

#### 文档定位

《Agent》是一份围绕 **agent 与 agent harness** 展开的系统课程。它从 agent 的基本概念、核心循环、工具调用、上下文与记忆、规划与推理讲起，再进入 harness 的工程结构、权限安全、沙箱、子代理、多代理编排、运行时与基础设施。

这份文档的重点不是只介绍某一个框架，而是帮助团队建立一个更底层的 agent 工程视角：一个真正可落地的 agent 系统，除了大模型本身，还需要任务循环、工具接口、上下文组织、记忆策略、权限控制、执行环境、观测评测和失败恢复。

对于希望开发芯片设计 agent 或其他工程型 agent 的读者，这份文档提供了共同的系统基础。无论是 architecture agent、RTL agent、verification agent，还是 backend、评测、memory、runtime 等方向，都需要先回答同一个问题：要构建的不是单次问答，而是能在复杂工程环境中持续行动、调用工具、维护状态并接受约束的 agent 系统。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 刚开始学习 agent 的成员 | 从概念、循环和工具使用建立完整基础。 |
| 准备开发工程型或芯片设计 agent 的成员 | 理解 agent 系统从 prompt 到 harness 的工程边界。 |
| 负责 agent runtime / memory / tool use 的成员 | 对齐上下文管理、权限控制、执行环境和运行时设计。 |
| 研究编码 agent、SWE agent 或芯片域 agent 的成员 | 快速比较不同系统的设计取舍和可复用模式。 |

#### 内容总览

| 模块 | 包含内容 | 重点问题 |
| --- | --- | --- |
| Agent 基础 | 什么是 Agent -> 核心循环 -> 工具使用 -> 上下文与记忆 -> 规划与推理 | agent 为什么不只是聊天模型，它如何观察、思考、行动和修正。 |
| Harness 工程 | Harness 概念 -> 核心组件 -> 上下文管理 -> 权限安全沙箱 -> 子代理与多代理 | 如何把模型包装成可控、可评测、可扩展的工程系统。 |
| 主流系统拆解 | Claude Code -> Codex -> Cursor -> Aider -> SWE agent -> 通用框架 | 通过成熟产品和框架理解真实 agent 系统的设计模式。 |
| 芯片域落地 | 芯片域拆解 -> 如何设计 Harness -> 评测 Agent -> 落地芯片 Agent | 将通用 agent 能力映射到芯片设计任务中。 |
| 生态与基础设施 | 编码 IDE / CLI、低代码平台、浏览器与计算机使用、深度研究 Agent、运行时基础设施 | 理解 agent 工程生态，以及不同场景可以借鉴的组件形态。 |

### 3. [Multi-Agent](https://autochip-lab.github.io/Knowledge-Hub/Multi-Agent/)

#### 文档定位

《Multi-Agent》是一份关于 **多智能体编排** 的系统学习手册。它关注的是：当一个复杂任务无法只靠单个 agent 稳定完成时，应该如何拆分角色、组织流程、传递状态、协调工具、控制风险，并让多个 agent 在一个可管理的系统中协同工作。

这份文档从单 agent 的解剖开始，逐步进入多 agent 的边界、编排语法、控制流、通信、状态、协议、上下文与记忆、可靠性、失败模式、评估方法、安全与对抗，再延伸到自动化编排、学习型编排、agent serving、协议生态和垂直 agent。

芯片设计天然是多阶段、多角色、多约束的工程活动，也是多 agent 编排的重要应用方向。架构探索、RTL 实现、功能验证、综合优化、物理设计、签核分析和 bring-up 支持之间既需要分工，也需要共享上下文、传递约束、回收反馈和形成闭环。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 准备设计多 agent 系统的成员 | 理解多 agent 不是简单堆叠，而是编排、协议和状态管理问题。 |
| 设计芯片方向多 agent 系统的成员 | 思考不同芯片设计 agent 之间如何协作、交接和约束。 |
| 研究 agent framework / workflow 的成员 | 对比静态图、动态路由、handoff、黑板、群聊等编排模式。 |
| 负责可靠性、评测或安全的成员 | 识别多 agent 系统中的失败传播、责任归因和安全边界问题。 |

#### 内容总览

| 模块 | 包含内容 | 重点问题 |
| --- | --- | --- |
| 基础 | 单 agent 解剖 -> 推理与规划 -> 从单到多 | 什么时候需要多 agent，什么时候单 agent 反而更合适。 |
| 编排语法 | 四根轴 -> 控制流 -> 编排模式 -> 通信、状态、协议 | 如何描述 agent 之间的角色关系、执行顺序和信息流。 |
| 工程现实 | 上下文与记忆 -> 可靠性、失败、评估 -> 安全与对抗 -> 贯穿案例 | 多 agent 系统为什么会失败，以及如何观测、评测和约束。 |
| 前沿方向 | 自动化编排 -> 学习型编排与信用分配 -> 系统与 serving | 从手写工作流走向自动生成、优化和部署的 agent 系统。 |
| 生态与能力维 | 框架工具地图 -> 当前问题 -> MCP / 协议生态 -> agentic RAG -> 垂直 agent | 理解多 agent 技术栈、工具协议和实际应用场景。 |

### 4. [Self-Evolving Agents](https://autochip-lab.github.io/Knowledge-Hub/Agent-Self-Evolving/)

#### 文档定位

《Self-Evolving Agents》是一份关于 **自演化智能体** 的中英双语交互式研究指南。它沿着技术发展的时间线，梳理 agent 如何从依赖人工固定规则，逐步走向能够利用反馈修改记忆、策略、工具、代码、工作流乃至自身搜索过程的系统。

这份文档不只罗列论文名称，还把代表性工作的机制、公式、实验结果、实现思路和限制放在同一条演进脉络中比较。读者可以通过可交互的方法流程图和论文链接，理解每项工作究竟改变了什么、依赖什么反馈，以及它是否真正实现了可持续的能力提升。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 研究 agent learning / self-improvement 的成员 | 建立自演化 agent 研究的发展脉络和概念边界。 |
| 负责 agent memory、skill 或经验复用的成员 | 理解反思、记忆更新、技能沉淀与策略搜索的不同机制。 |
| 准备实现自动优化 agent 的成员 | 从论文结果、公式和实现草图中识别可复用方法与工程限制。 |
| 负责 agent 评测与安全的成员 | 关注自修改系统中的反馈质量、退化风险、验证成本和控制边界。 |

#### 内容总览

| 模块 | 代表内容 | 重点问题 |
| --- | --- | --- |
| 理论起点 | Gödel Machines、POET、Enhanced POET | 系统在什么条件下可以修改自身，开放式搜索如何产生新能力。 |
| 经验与环境反馈 | Reflexion、Voyager | agent 如何把失败转化为记忆、技能和下一轮行动策略。 |
| 自动改写与搜索 | STOP、GPTSwarm、ADAS | 如何搜索 prompt、程序、工作流和 agent 结构。 |
| 近期自演化系统 | Gödel Agent、Darwin Gödel Machine、AlphaEvolve、Hermes Agent Self-Evolving | 如何把自修改、验证、归档和持续迭代组成完整闭环。 |
| 工程判断 | 实验结果、实现模式、限制与检查清单 | 论文中的提升能否迁移到真实、长期运行的 agent 系统。 |

### 5. [Hermes Design Flow](https://autochip-lab.github.io/Knowledge-Hub/Hermes-Design-Flow/)

#### 文档定位

《Hermes Design Flow》是一份以 Hermes Agent 源码为基线的技术导览。它从 `run_conversation()` 出发，沿着同一份 `messages` 跟踪一次 agent turn 的完整生命周期，把模型调用、工具执行、上下文压缩、memory 与 skill 更新、子代理委派、会话持久化和历史搜索连接起来。

这份文档的价值在于把抽象的 agent 概念落到具体代码路径。每一章都对应 Hermes 的真实模块和源码位置，因此既可以用于理解系统架构，也可以作为设计 agent harness 与 runtime 时的工程参考。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 已理解 agent 基础、准备阅读真实系统源码的成员 | 从概念层进入完整 agent runtime 的代码级实现。 |
| 负责 harness、runtime 或 tool execution 的成员 | 理解统一模型-工具循环、执行预算、失败处理和边界划分。 |
| 负责 memory、skill 与 context compression 的成员 | 看清长期状态如何更新、注入、压缩、持久化和检索。 |
| 负责子代理与多入口集成的成员 | 理解共享核心、独立 child agent、消息回传与入口解耦。 |

#### 内容总览

| 章节 | 核心内容 | 重点问题 |
| --- | --- | --- |
| Hermes 核心架构 | 多种入口、共享 `AIAgent`、conversation loop、provider、tools 与 SessionDB | 哪些能力属于稳定核心，哪些能力应留在系统边缘。 |
| 执行闭环 | TurnContext、模型请求、三个压缩检查点、工具结果回填与统一收尾 | 一次用户输入如何在模型和工具之间循环并可靠结束。 |
| 状态与自改进 | Memory、Skills、周期触发器和 background review | agent 如何在不污染主会话的前提下沉淀长期能力。 |
| 工具、代码与子代理 | 直接工具、`execute_code`、`delegate_task` 与 child agent | 如何根据任务性质选择执行方式并控制上下文与权限。 |
| 会话存储与搜索 | SQLite、FTS5、增量写入、原位压缩和 `session_search` | 会话如何跨轮次和进程恢复，同时保留可搜索的完整历史。 |

### 6. [Multi-Agent Knowledge](https://autochip-lab.github.io/Knowledge-Hub/Multi-Agent-Knowledge/)

#### 文档定位

《Multi-Agent Knowledge》是一份面向多智能体系统设计与落地的中英双语教学手册。它从角色和团队设计开始，依次讲解任务分解、协作拓扑、通信协议、路由与交接、观测评测、安全生产化，并通过软件工厂与研究团队案例把这些组件连接成完整系统。

相较于《Multi-Agent》对编排领域的整体导览，这份文档进一步提供了更细的专题材料、双语章节、教学讲稿、架构图和自检内容，适合在确定多 agent 方向后进行系统学习和方案设计。

#### 适合谁阅读

| 读者 | 阅读收益 |
| --- | --- |
| 负责多 agent 总体架构的成员 | 系统建立角色、任务、拓扑、协议和治理之间的关系。 |
| 负责 orchestrator、router 或 shared state 的成员 | 深入比较监督者、流水线、图、黑板、辩论和动态拓扑。 |
| 负责评测、调试、安全和生产部署的成员 | 学习轨迹观测、失败定位、审批边界、注入防御和运行治理。 |
| 希望通过案例学习的成员 | 从软件工厂和研究团队案例理解端到端多 agent 系统。 |

#### 内容总览

| 模块 | 包含内容 | 重点问题 |
| --- | --- | --- |
| 团队设计 | 全景与定义、角色与团队、任务分解与规划 | 如何从目标和能力边界出发建立 agent 团队。 |
| 协作机制 | Pipeline、Supervisor、Graph、Blackboard、Debate、Dynamic Topology | 不同任务结构应该选择哪种协作拓扑。 |
| 信息流 | 通信协议、路由、handoff、共享状态与任务市场 | agent 之间传递什么、何时交接、由谁决定下一步。 |
| 工程保障 | 观测、评测、调试、安全、审批与生产化 | 如何定位失败、限制高风险行为并验证系统收益。 |
| 案例与生态 | 软件工厂、研究团队、框架与项目图谱、学习路线和引用 | 如何从成熟框架、项目和论文继续深入。 |

后续新的学习文档正式加入仓库后，也会按这种形式作为独立大块补充到 README 中。
