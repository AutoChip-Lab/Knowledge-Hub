# CrewAI 拆解手册（快照：2026 年年中）

## 1. 一句话定位与身份

**CrewAI 是一个用 Python 写的、基于"角色扮演"的多智能体编排框架**：你把多个有职位/目标/工具的 Agent 组成一个 "Crew（团队）"，再用 "Flow（工作流）" 做事件驱动的编排，从而把复杂任务拆给一群自治智能体协作完成。官方 README 的一句话定义是 "Framework for orchestrating role-playing, autonomous AI agents"。

- **谁做的**：由 João (Joe) Moura 于 2023 年创立，公司 CrewAI, Inc.（起源于巴西圣保罗）。Moura 现任 CEO/创始人。
- **License**：**MIT**（开源核心）。
- **2026 年状态**：**活跃**。既没有改名，也没有被收购或废弃。开源框架于 **2025-10-20 发布 1.0.0**，此后保持约每月一个大版本的节奏；截至本快照最新为 **v1.15.1（2026-06-26/27）**。公司已完成融资：种子轮由 Boldstart Ventures 领投、Series A 由 Insight Partners 领投，合计约 **$18M**，天使包括 Andrew Ng、Dharmesh Shah 等。
- **注意**：企业侧产品线现称 **CrewAI AMP**（此前概念上叫 Enterprise/Control Plane），是商业化的托管/自托管控制面，与开源框架并存——这是"重命名/改品牌"的唯一之处，框架本身未改名。

## 2. 解决什么问题 & 在栈里的位置

CrewAI 解决的是"**把一个大任务拆成一队分工明确的智能体、并可靠地编排它们的执行与交接**"。

**它是编排框架（orchestration framework），不是单个 Agent，也不是底层模型。** 更精确地说，它是一个**双层框架**：

- **Crews**：高层抽象。给定角色（role）、目标（goal）、背景故事（backstory）、工具、任务，让智能体"自治协作"。适合探索性、需要智能体自己决定怎么做的场景。
- **Flows**：低层、确定性的控制层。事件驱动的 Python 类，用装饰器精确控制"什么时候跑什么"，可把多个 Crew 和直接的 LLM 调用串成生产级流水线。

**与底层 LLM 的关系**：CrewAI 自己不产生智能，它是编排层，通过 LLM 抽象（内部走 LiteLLM 风格的多provider接入）调用 OpenAI / Anthropic / Google / Ollama 本地模型等。默认 Agent LLM 历史上回退到 `OPENAI_MODEL_NAME`（旧默认 gpt-4；记忆分析层默认 `gpt-4o-mini`）。**关键差异化**：CrewAI 自 **v0.86.0（2024 年底，Moura 在 X 上确认 "LangChain is completely removed from CrewAI"）** 起彻底移除 LangChain 依赖，到 1.x 已是"从零重写、无 LangChain/无其它 agent 框架依赖"的独立轻量栈——主打 lean / 更快导入 / 更少版本冲突。

## 3. 架构与核心组件

真实的"运动部件"：

| 组件 | 作用 |
|---|---|
| **Agent** | 角色化人格：`role` / `goal` / `backstory` + `llm` + `tools`。执行控制参数：`max_iter`（默认 **20**）、`max_rpm`、`max_execution_time`、`max_retry_limit`（默认 **2**）、`allow_delegation`（默认 **False**）、`reasoning`（默认 False，开启后先反思再执行）、`verbose`。 |
| **Task** | 一个工作单元：`description` + `expected_output`，可绑定 `agent`，可用 `context=[...]` 显式指定上游任务输出作为上下文。 |
| **Tool** | 工具层：`@tool` 装饰器（用 docstring 当描述）或继承 `BaseTool`（Pydantic 校验输入）。工具描述是 prompt 的功能性部分（语义匹配）。 |
| **Crew** | 编排器：持有 agents + tasks + `process`，`kickoff()` 启动执行。 |
| **Process** | 执行策略：`Process.sequential` 或 `Process.hierarchical`。 |
| **AgentExecutor** | Agent 的执行循环（ReAct: Thought/Action/Action Input/Observation）。**1.x 已弃用旧的 `CrewAgentExecutor`，默认切到 `AgentExecutor`**。 |
| **Manager**（层级模式）| `manager_llm` 或自定义 `manager_agent`，负责 planning / delegation / validation。 |
| **Memory** | 记忆子系统（见 §5）。 |
| **Flow** | 事件驱动编排引擎（装饰器 + 状态机），把多个 Crew 串起来。 |

## 4. 控制循环——一步步怎么跑（最重要）

### A. Crew 层（单个团队内部）

1. **`crew.kickoff(inputs={...})`** 启动。inputs 会插值进各 Task 的 `description` 模板。
2. 若开启 memory，**执行前**：Agent 从记忆里检索相关上下文，注入进任务 prompt。
3. **进入某个 Task**，把 role/goal/backstory + task description + expected_output + 可用工具列表拼成一个 ReAct 提示模板。
4. **AgentExecutor 的 ReAct 循环**：
   - LLM 产出 `Thought:`（推理）→ `Action:`（选一个工具名）→ `Action Input:`（一个 JSON 参数对象）。
   - **CrewAI 后端解析这段输出，自己调用对应的 Python 工具函数**——LLM 不直接执行代码。
   - 工具返回值作为 `Observation:` 回注进 prompt。
   - 循环重复，直到 LLM 给出 `Final Answer:`，或撞到 `max_iter`（默认 20）/`max_execution_time` 上限。
5. **执行后**：若开启 memory，从任务输出中抽取离散事实（`extract_memories()`）并写入记忆（`remember()`）。
6. **任务链接**：
   - **Sequential**：任务按列表顺序跑，前一个任务输出**自动作为**下一个任务的 context（流水线）。每个任务必须显式指定 agent，否则初始化校验失败。
   - **Hierarchical**：任务不预先分派；Manager 分析任务列表，把每个任务**动态委派**给最合适的 agent，审阅其输出，判断是否够好、是否需要重派（模拟公司层级）。委派本身是通过内建的 delegation 工具实现的（`allow_delegation`）。
7. `kickoff()` 返回 `CrewOutput`（含最终结果、各任务输出、token 用量等）。

### B. Flow 层（多团队/生产编排）

Flow 是一个 Python 类，方法用装饰器声明触发关系，引擎负责执行顺序、状态穿线和持久化：

- **`@start()`**：入口。多个无条件 start 可并行启动。
- **`@listen(method)`**：当被监听的方法完成，其输出作为参数触发该监听方法（事件级联）。
- **`@router(...)`**：条件分支，返回字符串标签，由 `@listen("success")` / `@listen("failed")` 之类接住。
- **`@or_()` / `@and_()`**：任一/全部上游完成才触发（广播/汇合同步）。
- **`@persist`**：状态持久化（默认落 SQLite），支持从某个 state id 恢复/fork。
- **状态**：无结构（`self.state['key']`，自动带 UUID）或结构化（Pydantic `BaseModel` + `Flow[YourState]`，类型安全）。
- **串 Crew**：在 `@start`/`@listen` 方法里调 `crew.kickoff()`，结果存进 `self.state`，再传给下一个 crew 作 inputs。
- 附：`kickoff_async()` 异步执行、`flow.plot()` 生成执行图 HTML、`flow.usage_metrics` 聚合全流程 token。

## 5. Harness 级设计

- **上下文/记忆**：1.x 引入**统一 `Memory` 类**（取代早期分裂的 short-term=ChromaDB+RAG / long-term=SQLite / entity 三件套）。新架构：默认后端 **LanceDB**，落盘 `./.crewai/memory`（可用 `$CREWAI_STORAGE_DIR` 或 `storage` 参数改），用 LLM 在存储时推断 scope/类别/重要性，检索用**复合打分** = `语义相似度×0.5 + 时间衰减×0.3 + 重要性×0.2`（30 天半衰期）。默认 embedder：OpenAI `text-embedding-3-large`（3072 维），支持 12+ provider（Ollama、Azure、Google、Cohere、VoyageAI、Bedrock、HF、Jina、WatsonX 等）。也可外接 **Mem0** 做外部记忆。（注：ChromaDB/SQLite 是旧版本描述，读老教程需注意版本差。）
- **工具接口**：`@tool` 装饰器或 `BaseTool` 子类（Pydantic 校验）；描述文本进 prompt 做语义匹配。后端解析 ReAct 输出并亲自调用 Python 函数（LLM 不执行代码，天然多一层隔离）。
- **规划（planning）**：Agent 级 `reasoning=True` 让其先反思出计划再执行（`max_reasoning_attempts`）；层级模式由 Manager 做 planning/delegation/validation。
- **多智能体交接（handoff）**：Sequential 靠输出→context 直接串；Hierarchical 靠 Manager 委派 + 内建 delegation 工具；Flow 层靠事件（`@listen`/`@router`）+ 共享 state。
- **Human-in-the-loop**：Flow 提供 `@human_feedback`（暂停等人审批，LLM 解读反馈并路由到 `@listen("approved")` 等分支）；Task 级也有人类输入选项。
- **沙箱**：**弱**。默认无强隔离；值得注意的是 1.x **移除了 `CodeInterpreterTool` 及代码执行参数**（安全/精简考量）。隔离主要来自"后端调工具、LLM 不直接跑代码"这一设计，而非容器沙箱。生产隔离需靠 AMP/Factory 部署侧自己做。

## 6. 独特设计选择与取舍（vs 同类）

- **心智模型**：CrewAI 想的是"角色/任务/委派"——Agent 像有职位的员工，工作沿组织层级流动。对比：LangGraph 想的是"节点/边/条件"的状态机；AutoGen 想的是"对话/辩论/共识"。
- **上手最快**：普遍评价学习曲线 CrewAI（最易）> AutoGen > LangGraph（最陡）；做出可跑 demo 约 2–3 人日（LangGraph 约 10–14 人日）——**开发速度**是选它的头号理由。
- **代价**：控制力/灵活度最低（LangGraph > AutoGen > CrewAI）；调试难（易上手但"agent 之间互相给错指令"时难查）；多 agent 各自持全上下文 → **token 成本翻倍**（三 agent 至少 3×）。
- **已知坑**：有较权威的批评指出**层级 Manager–Worker 模式与文档不完全一致**——实测中编排逻辑偏弱，容易变成"所有任务顺序跑"，出现错误的 agent 调用、输出被覆盖、延迟/token 膨胀（详见 Towards Data Science 文章）。教学时应把它标为"文档承诺 > 实际行为"的注意点。
- **卖点**：无 LangChain 依赖、导入轻、双层（Crews 自治 + Flows 确定性）可组合，且有清晰的企业化路径（AMP 云 / Factory 自托管）。

## 7. 采纳信号

- **GitHub Stars**：README 显示 **~54.9k**（as of 2026-06/07 快照）；forks ~7.7k，GitHub dependents ~18.7k。（不同二手来源在 45.9k→50.8k→54k 间波动，取官方 README 数为准。）
- **社区**：官方称"100,000+ 认证开发者"（社区课程）。
- **企业采用**：官网称被 **63% 的 Fortune 500** 使用（页面另一处写 60%；2024 企业 beta 期约"半数"→2026 升至 60–63%）；开源/平台侧公司口径为**每月运行 4.5 亿+（450M）agentic workflow**，过去 12 个月约 **20 亿次 agent 执行**（"每月 1000 万+"是 2024-10 的旧数字，已过时；均属公司自述市场宣称，宜标注为公司口径、无第三方审计）。
- **动能**：约每月一个大版本；1.0（2025-10）→ 1.15（2026-06）稳定推进。相较之下 Microsoft 已把 AutoGen 转入维护模式并转向 Microsoft Agent Framework，而 CrewAI 仍在活跃开发——相对动能是加分项。

## 8. 来源

1. GitHub 官方仓库/README：https://github.com/crewaiinc/crewai
2. 官方文档 · Flows：https://docs.crewai.com/en/concepts/flows
3. 官方文档 · Processes（sequential/hierarchical）：https://docs.crewai.com/en/concepts/processes
4. 官方文档 · Memory（统一 Memory / LanceDB / 复合打分）：https://docs.crewai.com/en/concepts/memory
5. 官方文档 · Changelog（1.0.0 = 2025-10-20，1.15.x）：https://docs.crewai.com/en/changelog
6. João Moura（X）确认移除 LangChain：https://x.com/joaomdmoura/status/1867585281177637073
7. "Under the Hood of CrewAI"（ReAct 执行循环工程细节）：https://medium.com/@mahmudulhoque/under-the-hood-of-crewai-332fac712d6e
8. 批评："Why CrewAI's Manager-Worker Architecture Fails"（TDS）：https://towardsdatascience.com/why-crewais-manager-worker-architecture-fails-and-how-to-fix-it/

---
*未能独立核实的项*：① "每月 450M agentic workflow / 12 个月 ~20 亿次执行" 与 "60–63% Fortune 500" 均为公司自述口径，无第三方审计数据；② 精确 star 数随时间漂移，二手来源不一致，已取官方 README 快照值；③ Series A 具体估值/最新总融资额（$18M 为 2024-10 已披露口径）未找到 2026 年更新的公开数据。

## 核验记录

对本文最高风险的量化/所有权/超级形容词/架构声明做了独立核验（2026-07 快照）：

- **已确认无误**：
  - 身份/所有权：João (Joe) Moura 于 **2023** 年创立、公司位于**巴西圣保罗**、现任 CEO（Crunchbase/Tracxn/LinkedIn 一致）。
  - License **MIT**、README 一句话定义、GitHub **54.9k stars / 7.7k forks / 18.7k dependents**（官方仓库页快照一致）。
  - 版本/日期：**1.0.0 = 2025-10-20**、最新 **v1.15.1 = 2026-06-26/27**（官方 changelog 确认）。
  - **LangChain 于 v0.86.0（2024 年底）彻底移除**——Moura 在 X 的原帖 "LangChain is completely removed from CrewAI" 确认。
  - 融资 **$18M**：boldstart 领投 inception 轮 + Insight Partners 领投 Series A，天使含 Andrew Ng、Dharmesh Shah（Insight/pulse2/EnterpriseAIWorld 一致，公告 2024-10-22）。
  - Memory 架构：默认后端 **LanceDB**、落盘 `./.crewai/memory`、默认 embedder `text-embedding-3-large`（3072 维）、复合打分 **0.5×相似度 + 0.3×时间衰减 + 0.2×重要性**、**30 天半衰期**（官方 memory 文档逐项确认）。
  - 对手动能：Microsoft 已把 **AutoGen（与 Semantic Kernel）转入维护模式**、并入 **Microsoft Agent Framework**（2025-10-01 预览、2026-04-03 发 1.0）——VentureBeat/微软文档确认。
  - 引用来源存在且内容相符：TDS "Why CrewAI's Manager-Worker Architecture Fails"、Medium "Under the Hood of CrewAI"。
- **已修正**：
  - §7 与来源脚注中的 **"每月执行 1000 万+ agent"** 是 **2024-10 旧数字**，已过时。据 crewai.com 首页 2026 口径改为 **每月约 4.5 亿（450M）agentic workflow、过去 12 个月约 20 亿次执行**，并明确标注为公司自述、无第三方审计。
  - "63% Fortune 500" 补注官网另一处写 **60%**（两数并存），避免读者误以为是单一权威口径。
