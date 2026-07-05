# OpenAI Agents SDK 拆解简报

> 快照时间：2026 年年中。本简报只写有据可查的内容；估算/未证实的数字均已显式标注。

## 1. 一句话定位 / 出身 / 许可 / 状态

**一句话定位**：OpenAI Agents SDK 是一个**轻量、代码优先（code-first）的多智能体编排框架**——你用它把"LLM + 指令 + 工具 + 护栏 + 交接"组装成 agent，并交给一个 `Runner` 循环去执行。官方定位是 [Swarm](https://github.com/openai/swarm)（2024 年 10 月发布的教学性实验框架）的**生产就绪继任者**。

- **谁做的**：OpenAI 官方维护。
- **许可**：MIT（Python 与 TypeScript 两个仓库均为 MIT）。
- **发布**：2025 年 3 月 11 日，作为"新一代 agent 构建工具"整体发布的一部分（与 Responses API、内置工具、Tracing 同批），见 [InfoQ 报道](https://www.infoq.com/news/2025/03/openai-responses-api-agents-sdk/)。
- **2026 年状态：活跃、快速迭代，非弃用/非改名/非被收购**。
  - Python 仓库 `openai/openai-agents-python` 最新版 **v0.17.7（2026-06-24）**（截至抓取时的 GitHub 显示；发布节奏为周级/双周级，例如 v0.17.1 于 2026-05-11）。
  - 2026-04-17 前后有一次重要升级：加入 **Sandbox Agents（容器化沙箱）** 与一个 **Codex 风格的"model harness"**（见 [DevOps.com](https://devops.com/openai-upgrades-its-agents-sdk-with-sandboxing-and-a-new-model-harness/)）。
  - 存在两套实现：Python（`openai/openai-agents-python`）与 **TypeScript/JS**（`openai/openai-agents-js`，后者额外承载 **Realtime/Voice Agents**）。

> 注意"改名"这一点容易误解：Agents SDK 本身**没有**改名。2025 年 10 月 DevDay，OpenAI 推出了一个更上层的产品套件 **AgentKit**（含可视化 Agent Builder、ChatKit、Connector Registry、Evals）。Agents SDK 是 AgentKit 生成/运行工作流的**底层代码层**，二者是包含关系而非替代关系（见 [Introducing AgentKit](https://openai.com/index/introducing-agentkit/)）。

## 2. 解决什么问题 / 在栈里的位置

**它是一个编排框架（orchestration framework / harness），不是一个成品 agent，也不是 LLM 本身。** 它坐在"LLM 提供方"之上、"你的应用"之下。

OpenAI 官方对边界的划分很直白（[developers.openai.com Agents 指南](https://developers.openai.com/api/docs/guides/agents)）：
- 当"**一次模型调用 + 工具 + 应用自有逻辑**就够用"时，用 **Responses API**。
- 当"**你的应用需要拥有编排、工具执行、审批与状态**"时，用 **Agents SDK**。

它解决的核心痛点：把"调模型 → 模型要求调工具 → 执行工具 → 把结果喂回模型 → 循环直到出终答"这个 **agent 循环**、以及多 agent 之间的**任务交接（handoff）**、**输入/输出安全校验（guardrails）**、**跨轮记忆（sessions）**、**可观测（tracing）** 这些"每个人都要重写一遍"的样板，做成一套薄而稳的原语。

**与底层 LLM 的关系**：**provider-agnostic（供应商无关）**。原生走 OpenAI 的 **Responses API** 或 **Chat Completions API**；同时通过 `LiteLLM` / `any-llm` 等集成号称支持 **100+ 其他 LLM**（README 原话）。部分**托管工具**（Web/File search、Code Interpreter、Computer use）只在使用 `OpenAIResponsesModel` 时可用——这是它"provider 无关但对 OpenAI 有偏好"的地方。

## 3. 架构与核心组件（真实的活动部件）

SDK 刻意做得"少而正交"，README 列出的核心原语：

| 组件 | 作用 |
|---|---|
| **Agent** | 一个被配置好的 LLM：`name` + `instructions`（静态或动态回调）+ `model`/`model_settings`（temperature、top_p、tool_choice）+ `tools` + `handoffs` + `input_guardrails`/`output_guardrails` + `output_type`（结构化输出）+ `hooks`（生命周期回调）。 |
| **Runner** | **执行引擎/agent 循环**。`Runner.run()`（async，返回 `RunResult`）、`run_sync()`（同步封装）、`run_streamed()`（流式，返回 `RunResultStreaming`）。 |
| **RunConfig** | 全局运行配置：模型默认值、护栏、tracing、`session_input_callback`、`session_settings` 等，不改单个 agent 就能统一控制整轮。 |
| **Context** | **依赖注入对象**——你 new 出来传给 `Runner.run()`，会被透传给每个 agent / tool / handoff。是运行期状态和依赖的"杂物袋"，任意 Python 对象。 |
| **Tools** | 五类：`@function_tool`（本地函数）、托管工具（OpenAI 服务器上跑）、agents-as-tools、MCP 工具、实验性 Codex 工具。 |
| **Handoffs** | agent 间任务转交；对 LLM 表现为一个工具（`transfer_to_<agent>`）。 |
| **Guardrails** | 与主执行并行/前置的输入/输出安全校验，带 tripwire 断路机制。 |
| **Sessions** | 跨 `run()` 的自动会话记忆层（多种后端）。 |
| **Tracing** | 默认开启的 trace/span 观测，导出到 OpenAI 面板或第三方。 |
| **Sandbox Agents / model harness**（2026 新增） | 预配置在容器里跑长任务的 agent；Codex 风格的 harness，内建 instructions/tools/approvals/tracing/handoffs 与 **resume 记账（断点续跑）**。 |
| **Realtime/Voice Agents** | 语音 agent（`gpt-realtime-2`，自动打断检测、上下文管理、护栏），JS SDK 里最完整（`RealtimeAgent`、`OpenAIRealtimeWebSocket`/`WebRTC`）。 |

## 4. 逐步拆解：一个请求怎么流过控制循环（最重要）

官方文档给出的 **agent 循环**编号步骤（[Running agents](https://openai.github.io/openai-agents-python/running_agents/)），这是整个框架的心脏：

1. **调用当前 agent 的 LLM**，输入 = 当前 input（首轮=用户输入，或 session 历史 + 用户输入）。
2. **LLM 产出输出**，据此三选一：
   1. 若产出了 **`final_output`**（且类型匹配 `output_type`、且**没有任何工具调用**）→ 循环结束，返回 `RunResult`。
   2. 若产出了 **handoff** → 把"当前 agent"切换为目标 agent、更新 input，**回到第 1 步重跑**。
   3. 若产出了 **tool calls** → 执行这些工具、把结果 append 回消息历史，**回到第 1 步重跑**。
3. 若超过 **`max_turns`**（默认有上限，可设 `None` 关闭）→ 抛 **`MaxTurnsExceeded`** 异常。

**终答判定规则**（原话）："LLM 输出被视为 final output 的条件是：它产出了目标类型的文本输出，且没有工具调用。"

把 sessions / guardrails 叠加进来的**完整一轮实际流程**：

1. **（可选）输入护栏**：如为 blocking 模式，先跑完再决定是否启动 agent；默认 parallel 模式下与 agent 并行跑（省延迟）。tripwire 触发即抛 `InputGuardrailTripwireTriggered`，agent 可能根本不执行（省 token）。
2. **拉取会话历史**：若传了 `session`，Runner 先从 session 取历史、prepend 到本轮 input（可用 `RunConfig.session_input_callback` 定制合并、`SessionSettings(limit=N)` 只取最近 N 条控制上下文窗口）。
3. **进入上面的 1–3 步 agent 循环**（可能多轮工具调用 + 多次 handoff，全在**同一个 run**内）。
4. **输出护栏**：仅对"产出最终输出的那个 agent"跑。
5. **写回 session**：本轮产生的所有 items（用户输入、assistant 回复、工具调用/结果）自动持久化，供下一次 `run()` 复用。
6. 全程被 **tracing** 包裹：整个 Runner 调用是一个 trace，其下 agent 执行、LLM 生成、工具调用、护栏、handoff、音频操作各为一个 span。

## 5. Harness 级设计细节

- **上下文/记忆管理**：两层。(a) **Context 对象**做进程内依赖注入（非发给模型的历史，而是运行期依赖/状态）；(b) **Sessions** 做发给模型的会话历史，自动省去手动 `to_input_list()`。后端丰富：`SQLiteSession`（本地/内存）、`AsyncSQLiteSession`、`RedisSession`、`SQLAlchemySession`、`MongoDBSession`、`DaprSession`、`OpenAIConversationsSession`（服务端托管）、`EncryptedSession`（加密包装）、`AdvancedSQLiteSession`（带分支/分析）。会话操作：`get_items`/`add_items`/`pop_item`（用于纠错回滚）/`clear_session`。
- **工具接口**：`@function_tool` 装饰器用 Python `inspect` + `griffe` 解析签名与 docstring，**自动生成 JSON schema**（支持基本类型、Pydantic model、TypedDict；可用 `Field` 加约束/描述）。托管工具：`WebSearchTool`、`FileSearchTool`（OpenAI 向量库）、`CodeInterpreterTool`（沙箱代码）、`ImageGenerationTool`、`ComputerTool`、`ToolSearchTool`（大工具面延迟加载）、`HostedMCPTool`（远程 MCP）。
- **规划（planning）**：**没有独立的 planner 组件**——规划隐式发生在"LLM + 工具调用 + 循环"里（ReAct 式），或通过 `output_type`+多 agent 编排显式化。这是它与"显式 plan-then-execute"框架的关键区别。
- **多 agent 交接**：handoff 对模型就是工具（`transfer_to_<name>`）。`handoff()` 可定制：`on_handoff` 回调（如提前预取数据）、`input_type`（让模型交出结构化元数据如 reason/priority/summary）、`input_filter`（过滤接收方能看到的历史，参数为 `HandoffInputData`：`input_history`/`pre_handoff_items`/`new_items`）。官方建议在指令里加 `RECOMMENDED_PROMPT_PREFIX` 帮助模型理解 handoff。**护栏边界**：输入护栏只作用于链上第一个 agent，输出护栏只作用于产出终答的 agent。
- **Human-in-the-loop / 审批**：内建审批门。工具/agents-as-tools 可设审批门，"在有风险的动作前阻断或暂停"（[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)）。
- **沙箱**：2026 的 **Sandbox Agents** 让 agent 在"受控、隔离的工作区"里跑，只能访问必要的文件/代码；配合 Codex 风格 harness 的 **resume bookkeeping** 支持长任务断点续跑。

## 6. 显著设计取舍 vs 同行

- **极简 + 少抽象**：只有 Agents / Handoffs / Guardrails / Sessions / Tracing 少数原语，"Python/TS 原生优先"，没有 LangChain/LangGraph 那种庞大 DSL 或图定义。学习曲线低、可读性高，但复杂显式流程控制（如确定性 DAG、复杂状态机）需自己在代码里写。
- **handoff = 工具**：把多 agent 协作降维成"一个特殊工具调用"，模型自然会用，无需额外调度器/消息总线。代价是编排"分散"在各 agent 的 handoff 列表里而非集中式图。
- **护栏并行 + tripwire 断路**：用便宜/快的小模型并行做安全校验，命中即断路，避免昂贵慢模型白跑——延迟与成本上的实用主义设计。
- **默认全链路 tracing**：开箱即用可观测（可 `OPENAI_AGENTS_DISABLE_TRACING=1` 或按 run 关闭），官方 Tracing 文档列出约 28 家第三方观测平台的原生 external trace processor 集成（Logfire、AgentOps、Braintrust、Langfuse、LangSmith、Arize-Phoenix、MLflow、W&B、Datadog、PostHog、Comet Opik、Portkey、Galileo、PromptLayer 等）。
- **provider 无关但偏 OpenAI**：支持 100+ LLM，但托管工具/Responses API 特性在 OpenAI 上最完整——选它常因为"已在 OpenAI 生态里，想要最少胶水 + 官方支持 + 与 AgentKit/Codex 打通"。

## 7. 采用信号

- **GitHub stars**：`openai/openai-agents-python` **约 27.6k stars**（截至抓取时的 GitHub 页面显示，2026 年年中）；另有报道称 2026-05 时约 26.4k stars、4000+ forks——数字随时间增长，取抓取时点约 27k+ 量级。
- **发布节奏**：周级/双周级发版（v0.17.1 → v0.17.7 跨越 2026-05 至 2026-06），迭代活跃。
- **生态**：TS/JS 独立仓库（含 Realtime/Voice）；被 OpenAI 上层产品 **AgentKit / Agent Builder**（2025-10 DevDay 发布）作为运行时代码层采用——Agent Builder 里可切到 "Agents SDK" 标签直接导出 Python/TS 代码；约 28 家观测平台集成。
- **知名用户具体名单**：**未找到可靠的一手公开清单**（官方博客有引用早期采用者，但本次未取到可直接引用的具名列表，故不列举）。

## 8. 来源（primary / 权威二手）

1. GitHub 仓库 README（stars、许可、原语、100+ LLM）：https://github.com/openai/openai-agents-python
2. 官方文档 · Running agents（Runner 循环编号步骤、max_turns、MaxTurnsExceeded）：https://openai.github.io/openai-agents-python/running_agents/
3. 官方文档 · Agents（Agent 属性、context、output_type、动态指令）：https://openai.github.io/openai-agents-python/agents/
4. 官方文档 · Handoffs（transfer_to_、handoff()、input_filter、RECOMMENDED_PROMPT_PREFIX）：https://openai.github.io/openai-agents-python/handoffs/
5. 官方文档 · Guardrails（并行/阻断、tripwire、便宜模型断路）：https://openai.github.io/openai-agents-python/guardrails/
6. 官方文档 · Sessions（各类 session 后端与操作）：https://openai.github.io/openai-agents-python/sessions/
7. 官方文档 · Tracing（默认开启、trace/span、第三方集成）：https://openai.github.io/openai-agents-python/tracing/
8. OpenAI 开发者 · Agents 指南（Responses API vs Agents SDK 边界、审批）：https://developers.openai.com/api/docs/guides/agents
9. InfoQ（2025-03-11 发布、Swarm 继任者、Responses API 同批发布）：https://www.infoq.com/news/2025/03/openai-responses-api-agents-sdk/
10. DevOps.com（2026 Sandbox Agents + Codex 风格 model harness + resume bookkeeping）：https://devops.com/openai-upgrades-its-agents-sdk-with-sandboxing-and-a-new-model-harness/
11. OpenAI · Introducing AgentKit（Agents SDK 与 AgentKit 的包含关系）：https://openai.com/index/introducing-agentkit/

## 核验记录

对抗式复核（2026-07 抓取）。逐条独立核验最高风险声明：

- **发布日期 2025-03-11**：确认。与 Responses API / 内置工具 / Tracing 同批发布（InfoQ、OpenAI 官方 "New tools for building agents"、VentureBeat 均一致）。
- **Swarm 为前身、2024-10 发布**：确认。openai/swarm 仓库与 InfoQ/Forbes 报道一致（2024-10-09 前后），OpenAI 明确称其为教学性/实验性、不用于生产。
- **GitHub stars ~27.6k / 版本 v0.17.7（2026-06-24）/ MIT 许可**：确认。直接抓取 github.com/openai/openai-agents-python，显示 27.6k stars、latest release v0.17.7（Jun 24, 2026）、MIT。
- **100+ LLM / provider-agnostic（LiteLLM、any-llm）**：确认为 README 原话（"as well as 100+ other LLMs"）。
- **2026-04-17 Sandbox Agents + Codex 风格 model harness + resume bookkeeping**：确认。DevOps.com 文章发布日 2026-04-17，明确写有 "instructions, tools, approvals, tracing, handoffs, and resume bookkeeping" 且 "same scaffolding that powers Codex"；harness 先上 Python、TS 稍后。"Sandbox Agents" 措辞取自 GitHub README（该文用 "controlled, siloed workspace"，README 用 "work with a container"）——两者一致，保留。
- **AgentKit 于 2025-10 DevDay 发布、含 Agent Builder/ChatKit/Connector Registry/Evals、Agents SDK 为其代码层**：确认（OpenAI Introducing AgentKit + InfoQ DevDay 报道）。据此补注了发布时间与 "Agents SDK 标签导出代码" 细节。
- **Realtime/Voice 用 `gpt-realtime-2`**：确认。gpt-realtime-2 于 2026-05 发布，JS SDK `RealtimeAgent`/`RealtimeSession`（@openai/agents/realtime）确以其为默认模型。
- **修正**：原文 "25+ 家观测平台" → 依官方 Tracing 文档实际列表订正为 "约 28 家"（两处），并补入 external trace processor 的准确定性描述。

未发现事实性错误；以上为精度性订正与出处收紧。所有超级词（"首个/唯一/最佳"类）在原文中已被规避，无需删改。
