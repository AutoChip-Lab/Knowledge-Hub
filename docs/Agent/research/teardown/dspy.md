# DSPy 拆解 brief（快照：2026 年中）

## 1. 一句话定位 / 出身 / 许可 / 状态

**一句话定位**：DSPy 是一个「**编程而非提示**」的 Python 框架——你把任务写成带类型的 **signature（签名）**、用 **module（模块）** 组织控制流，然后交给 **optimizer（优化器）** 针对一个 metric 去自动生成/调优提示词（乃至微调权重）。仓库口号：*"The framework for programming—rather than prompting—language models"*；官网定义：*"DSPy is a Python framework for building AI systems. Express your tasks as structured signatures, not prompts, to produce maintainable, modular, and optimizable programs."*

- **谁做的**：起源于 **Stanford NLP**（*"DSPy started at Stanford NLP"*）。项目负责人（Project Lead）是 **Omar Khattab**；项目 mentor 包括 Chris Potts（Stanford）、Matei Zaharia（UC Berkeley & Databricks）、Heather Miller（CMU）。DSPy 与 **Databricks** 关系紧密——Khattab 此前是 Databricks 的 Research Scientist，Databricks 也把 DSPy 作为其 GenAI 栈的一部分（有官方 tracing 集成）。**注意**：DSPy 本身仍是 stanfordnlp GitHub 组织下的独立开源项目，**并非被 Databricks 收购**；说它「属于 Databricks」是不准确的口径（第 1 段搜索里出现的"now Databricks"表述未在一手来源核实，此处采信更保守的说法）。Khattab 于 2025 年秋加入 MIT EECS 任助理教授。
- **许可**：**MIT License**。
- **2026 年状态**：**活跃维护**，未改名、未停更。截至抓取时最新稳定版为 **3.2.1（2026-05-05，PyPI 核实）**，另有预发布 **3.3.0b1（2026-05-28）**。GitHub `stanfordnlp/dspy` 约 **35.8k stars**（抓取时点），共 109 个 release、4,563 次 commit、434+ 贡献者、约 1.9k 个下游依赖项目。（**口径提示**：GitHub 页面显示 3.2.1 日期为 2026-05-05，而 releases 页解析出的年份一度显示为 2025，经 PyPI 交叉核实确认为 **2026**。）

> **名字**：DSPy 常被回溯解释为 "**D**eclarative **S**elf-improving **Py**thon"（声明式自改进 Python）。这是社区/文档里的通行读法，非严格官方缩写词源，标注为**弱断言**。

## 2. 解决什么问题 / 在栈里的位置

**问题**：手写长提示词脆弱、不可维护、换模型就崩。DSPy 主张把「**程序的流程（modules）**」和「**每一步的参数（提示词文本 + few-shot 示例 + 可选权重）**」解耦，让后者由优化器**自动搜索**，而不是人肉调 prompt。官方一句：*"separates the flow of your program (modules) from the parameters (LM prompts and weights) of each step."*

**栈中位置**：它是一个**声明式的 LLM 程序框架 / 编排层 + 提示优化编译器**——**不是**面向终端用户的 agent 产品，也不是托管平台。可以把它理解成「LLM 调用的编译器 + 组合库」：你写声明式程序，它把程序**编译（compile）**成一套具体的提示词/示例。它既能搭 pipeline（RAG、分类、抽取），也能搭 agent（ReAct）。

**与底层 LLM 的关系**：模型无关。统一入口是 `dspy.LM`（历史上底层走 **LiteLLM**，接 OpenAI / Anthropic / 本地等 100+ provider；3.2 起在逐步**解耦 LiteLLM**、引入 capability 属性与更中性的 LM 边界）。DSPy **不自带模型**，只负责把声明式程序变成对某个 LM 的一串结构化调用。

## 3. 架构与核心组件

真实「运动部件」：

- **Signature（签名）**：任务的**声明式 I/O 规格**——带类型的输入/输出字段（如 `question -> answer`，或类式定义带 `InputField`/`OutputField` 和描述）。它声明「做什么」，不写「怎么提示」。
- **Module / Predictor（模块 / 预测器）**：给某个 signature **绑定一种调用 LM 的策略**。基类是 `dspy.Module`（多步程序里实现 `forward()` 并组合子模块）。官网点名的内置模块：**`Predict`（最基础）**、**`ChainOfThought`**、**`ReAct`**、`ProgramOfThought`、`CodeAct`、`BestOfN`、`Refine`、`MultiChainComparison`、`Parallel`、`RLM`。最小可调用单元 `dspy.Predict` 即一个 predictor。
- **Adapter（适配器）**：**signature ↔ 具体提示词/消息**之间的翻译层。它「handles the complete transformation pipeline from DSPy inputs to LM calls and back to structured outputs」：把 signature + few-shot + 历史格式化成 system/user/assistant 多轮消息，调 LM，再把 LM 输出**解析回**对应输出字段的字典。变体：
  - **`ChatAdapter`**：默认，用「字段标记」格式（field-marker）。
  - **`JSONAdapter`**：对支持 structured output 的模型强制吐 JSON，便于稳定解析类型化输出。
  - **`TwoStepAdapter`**：两步式（先自由生成、再结构化抽取）。
- **Optimizer（优化器，旧称 teleprompter）**：LM 驱动的算法，给定 metric，去**调 prompt 指令和/或 few-shot 示例**（部分还能微调权重）。官网点名：**`BootstrapFewShot`**、`LabeledFewShot`、`BootstrapFinetune`、**`COPRO`**、**`MIPROv2`**、**`GEPA`**、`SIMBA`、`KNN`、`Ensemble`、`InferRules`、`BetterTogether`。
- **Metric + Trace（度量 + 追踪）**：metric 是你给的可调用评分函数；编译时 DSPy 会 **trace** 每个 predictor 的输入/输出，供优化器评估与验证中间步骤。
- **Tool 层 / Sandbox**：`dspy.Tool`（包住 Python 可调用、name/description/参数 schema）+ **`PythonInterpreter`**（默认在 **Deno + Pyodide 的 WASM 运行时**里执行 Python，**无文件系统、无网络**，每次 `forward()` 新建、用完关掉；可换成 E2B / Modal 等远程 sandbox）。

## 4. 一步步怎么运转（最重要）

分两条回路：**推理时的前向调用回路** 和 **编译/优化回路**。

### A. 前向调用（inference / forward pass）

以 `qa = dspy.ChainOfThought("question -> answer")` 然后 `qa(question=...)` 为例：

1. **实例化模块**：用 signature 生成一个可调用对象。ChainOfThought 会**在 signature 里自动插入一个 `reasoning`（思维链）输出字段**，再包一个内部 `Predict`。
2. **调用 = 一次 `forward`**：官方原话——模块「takes in keyword arguments corresponding to the signature input fields, **formats a prompt** to implement the signature and **includes the appropriate demonstrations**, **calls the LM**, and **parses the output fields**.」
3. **Adapter 格式化**：`Predict` 把 signature + 当前已编译进来的 few-shot 示例（demos）+ 对话历史交给 **Adapter**。Adapter 生成 system 消息（字段说明、结构指令、任务描述）+ 交替的 user/assistant few-shot 消息 + 当前输入。
4. **调 LM**：经 `dspy.LM`（→ LiteLLM/provider）发出请求，拿回原始文本或结构化输出。
5. **Adapter 解析**：把 LM 输出**解析回**一个字典，键就是 signature 的输出字段名（如 `reasoning`、`answer`），返回一个 `Prediction` 对象。
6. **组合控制流**：如果是多步程序，`forward()` 里可以像普通 Python 一样串联多个子模块（检索 → 生成 → 校验），全部用普通控制流（if/for/函数调用）拼起来——**这就是 DSPy 的「编排」，不是 DSL、就是 Python**。

### B. ReAct agent 的循环（当模块是 `dspy.ReAct` 时，第 6 步展开成一个显式回路）

`dspy.ReAct(signature, tools=[...], max_iters=...)`（`max_iters` 默认 20）：

1. 构造一个**动态 signature**，把所有工具枚举进去（`"the tool must be one of:"` + 每个 `dspy.Tool` 的 name/description/JSON 参数）。
2. **循环 `for idx in range(max_iters)`**：每轮调内部 `self.react` predictor，产出 `next_thought`（思考）、`next_tool_name`（选哪个工具）、`next_tool_args`（参数）。
3. **执行工具**：`self.tools[next_tool_name](**next_tool_args)`，结果作为 observation 存进 **trajectory**（轨迹字典，键形如 `thought_1 / tool_name_1 / tool_args_1 / observation_1 ...`）。工具报错则把 `"Execution error in {tool}: {msg}"` 当作 observation 记下（错误也进上下文，让模型自我纠正）。
4. **轨迹回灌**：整条 trajectory 在下一轮喂回 LM，让它看到完整历史。
5. **终止**：当模型选择内置的 `finish` 工具（`next_tool_name == "finish"`）时跳出循环。
6. **抽取答案**：循环结束后调 `self.extract`（一个 `ChainOfThought`），基于完整 trajectory 生成最终结构化输出。

### C. 编译 / 优化回路（compile，DSPy 的灵魂）

`optimizer.compile(program, trainset=..., metric=...)`：

1. 你提供**未优化的程序** + 一个**训练/开发集** + 一个 **metric**。
2. 优化器在**候选提示空间**里搜索——不同优化器策略不同：
   - **`BootstrapFewShot`**：用程序自己跑 trainset，把**跑对的轨迹**收集成 few-shot 示例（demos）注入各 predictor（「自举示例」）。
   - **`MIPROv2`**（Multiprompt Instruction PRoposal Optimizer v2）：同时优化**指令 + few-shot 示例**，用**贝叶斯优化**在指令与示例的联合空间里搜；带 **dataset summarizer**（先总结数据集特征，让指令生成「data-aware & demonstration-aware」）。
   - **`GEPA`**（**Genetic-Pareto**，Agrawal et al. 2025, arXiv:2507.19457，"Reflective Prompt Evolution"）：用 LLM **反思执行 trace**（读评估日志、报错、约束违规等**文本反馈**而非只看标量分）来**变异指令**，并维护一个 **Pareto 前沿**（保留在至少一个样例上得分最高的候选集），号称能「以极少 rollout 超过 RL」。
3. 编译时对每个候选用 metric 打分（配合 trace 验证中间步骤），选出最优配置。
4. 产出**已编译的程序**：结构不变，但每个 predictor 内部已经**绑定了优化后的指令 + demos**（可序列化保存/加载）。之后再走上面的前向回路时就用这套优化产物。

**要点**：DSPy 的核心不是「更好的循环」，而是「**把 prompt 当作可被程序化优化的参数**」——运行前用编译回路把提示词/示例调好，运行时才是普通的 forward。

## 5. Harness 层设计

- **上下文/记忆管理**：**没有**长期跨会话记忆的中央组件（不同于 Letta/MemGPT）。上下文靠三处拼装：signature 声明的字段、编译进 predictor 的 **demos（few-shot 示例）**、以及 module 里显式传的历史（如 ReAct 的 **trajectory**、`dspy.History` 类型）。「记忆」在 DSPy 里更多是**优化产物 + 程序状态**，而非独立 memory 层。
- **工具接口**：`dspy.Tool` 包 Python 可调用；**工具靠 docstring + 类型注解**暴露语义（docstring 说明工具做什么，type hints 让 LM 生成正确参数格式）。3.3 起 `ReActV2` 支持**原生 tool calling**（native function calling）+ 并行工具调用 + 多轮把历史工具调用/结果按 assistant/tool 消息重放，官方测试称某些任务 **成本降最多约 50%**（厂商自述，标注为弱断言）。
- **规划**：无独立 planner 组件；「规划」= 你用 Python 写的控制流 + ChainOfThought/ReAct 的推理字段。ProgramOfThought/CodeAct 则让模型**生成代码**作为动作。
- **多 agent / 交接**：**无一等公民的 handoff 原语**（不像 OpenAI Agents SDK 的 handoff、CrewAI 的角色分工）。多 agent = 把多个 module 当子模块**组合**进一个更大的 `forward()`，用普通函数调用互相传结果。
- **人在环（HITL）**：**未找到内置的一等 HITL 组件**；一手文档主要讲工具/循环，不含显式 human-in-the-loop 原语（需自行在 forward 里插入等待）。标注为**未找到公开数据**。
- **沙箱**：`PythonInterpreter` 默认 **Deno+Pyodide WASM**、无 FS/无网络、每次 forward 新建即毁；可替换为 E2B/Modal 远程 sandbox。

## 6. 与同类相比的独特设计取舍

- **核心差异**：DSPy 卖点**不是运行时 agent 循环**，而是「**提示词/示例是可编译优化的参数**」这一范式。别人（LangChain/LlamaIndex/CrewAI）主要给你**编排 + 集成**；DSPy 额外给你一个**优化器编译器**（MIPROv2/GEPA），能针对 metric 自动把 prompt 调到更好——**换模型只需重编译，而非重写 prompt**。这是选它的最主要理由。
- **声明式 vs 命令式 prompt**：signature 让你声明 I/O 契约，Adapter 把「怎么提示 / 怎么解析」这件脏活抽走，理论上**换 provider / 换 adapter 不改业务代码**。
- **代价 / 门槛**：需要**数据集 + metric** 才能吃到优化红利（纯零样本用它收益有限）；编译是**离线、要跑很多 LM 调用**（有成本/时间）；API 与最佳实践历史上**演进较快**（2.x→3.x 有破坏性变化），学习曲线偏抽象。
- **它不做的**：不是 IDE/coding agent、不是托管平台、不给你 UI、不做长期记忆库、没有内置多 agent 消息总线。定位窄而深。

## 7. 采用度信号

- **GitHub**：`stanfordnlp/dspy` 约 **35.8k stars**（抓取时点，2026 年中）、109 releases、4,563 commits、434+ 贡献者、约 1.9k 下游依赖项目。（历史对照：2024-08 前后约 16k stars / 16 万月下载——增长明显。）
- **下载量**：早期公开数字约 **16 万+ / 月 pip 下载**（2024 口径）；2026 更高的确切数字**未找到一手核实**，标注为未核实。
- **知名背书 / 用户**：出自 Stanford NLP，作者含 Matei Zaharia、Chris Potts；与 **Databricks** 深度绑定（官方 MLflow/GenAI **tracing 集成**）、**Together AI** 有官方 DSPy 文档。学术侧被大量论文用作提示优化基线（如知识图谱构建、teleprompter 对齐评测等 arXiv 研究）。
- **势头**：release 节奏密（2026 上半年 3.1.x→3.2.x→3.3.0b1 连续迭代），新增 GEPA、ReActV2 原生工具调用、LiteLLM 解耦、Python 3.14 支持等，属**活跃演进期**。

## 来源（一手为主）

1. GitHub 仓库（口号 / license / star / release 概况）：https://github.com/stanfordnlp/dspy
2. 官网首页（官方定义 / 模块与优化器清单）：https://dspy.ai/
3. PyPI（版本与发布日期核实，3.2.1 = 2026-05-05）：https://pypi.org/project/dspy/
4. Releases 页（3.1.x–3.3.0b1、ReActV2/GEPA/LiteLLM 解耦）：https://github.com/stanfordnlp/dspy/releases
5. 原始论文《DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines》（arXiv:2310.03714，作者/基准数字）：https://arxiv.org/abs/2310.03714
6. Adapter API（signature↔prompt 翻译层，ChatAdapter/JSONAdapter/TwoStepAdapter）：https://dspy.ai/api/adapters/Adapter/
7. ReAct 模块 API（forward 循环 / trajectory / max_iters / finish / extract 机制）：https://dspy.ai/api/modules/ReAct/
8. GEPA 优化器 API（Genetic-Pareto、反思式提示进化，arXiv:2507.19457）：https://dspy.ai/api/optimizers/GEPA/overview/

**核实说明**：release 年份一度出现 2025/2026 口径冲突，已用 PyPI 交叉核实为 **2026**；「Databricks 收购/改名」的说法**未在一手来源证实**，按保守口径否定。内置 HITL 原语、2026 精确月下载量、ReActV2「降成本 50%」为**未核实/弱断言**，已在正文显式标注。
