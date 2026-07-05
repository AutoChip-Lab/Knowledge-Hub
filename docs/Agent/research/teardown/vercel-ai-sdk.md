# Vercel AI SDK 事实底稿(快照:2026 年年中)

> 研究对象:**Vercel AI SDK**(npm 包名 `ai`)—— 面向 TypeScript 的 provider 无关 AI/agent 工具库。
> 核查时点:2026-07-04。所有数字均标注来源与时点;未核实项显式标注。

---

## 1. 一句话定位 / 出品方 / 许可 / 2026 状态

- **一句话定位**:一个 provider 无关的 TypeScript 工具库,用统一 API(`generateText` / `streamText` / `tool` / `Agent`)在任意 LLM 之上构建 AI 应用与 agent,并附带前端 UI hooks。官方自述:"The AI Toolkit for TypeScript. From the creators of Next.js, the AI SDK is a free open-source library for building AI-powered applications and agents"(GitHub 仓库描述,2026-07-04 核)。
- **出品方**:Vercel(Next.js 的母公司)开发并维护。
- **许可**:npm registry 元数据显示 `Apache-2.0`(2026-07-04 直查 registry)。**注意矛盾点**:GitHub API 对仓库 LICENSE 返回 `NOASSERTION`(即 GitHub 的自动识别器未能归类该 LICENSE 文件),而 npm 包声明为 Apache-2.0。以 npm 声明为准,但 LICENSE 文件本身未逐字核验。
- **2026 状态**:**高度活跃**,非改名/非停更/非被收购。仓库最后 push 为 2026-07-04(即核查当天)。版本迭代密集:
  - **AI SDK 5** — 2025-07-31 发布
  - **AI SDK 6** — 2025-12-22 发布
  - **AI SDK 7** — 2026-06-25 发布(当前主线;npm `ai@7.0.15`,2026-07-04 直查)
  - 期间仍有子包高频发布,例如 `@ai-sdk/workflow-harness@1.0.18`(2026-07-04)。

---

## 2. 解决什么问题 / 在 agent 技术栈中的位置 / 与底层 LLM 的关系

**解决的问题**:消除 provider 之间 API 差异(OpenAI / Anthropic / Google / xAI / Bedrock / Azure / Mistral / Groq / Cohere / DeepSeek 等 20+ 家),提供一套统一的文本生成、结构化输出、工具调用、流式传输、agent 循环与前端 UI 接口,让开发者"专注于构建应用而非管理 provider 差异"(官方 introduction 文案)。

**栈中位置**:它横跨多层,不是单一层:
- **SDK / 库层(核心身份)**:`AI SDK Core` 提供 `generateText`/`streamText`/`generateObject`/`tool`,是最小抽象、provider 无关的调用层。
- **编排 / agent 框架层**:从 AI SDK 5 起加入 agent 循环原语(`stopWhen`/`prepareStep`),AI SDK 6 加入 `Agent` 接口与 `ToolLoopAgent` 实现,AI SDK 7 加入 `WorkflowAgent`(durable)与 `HarnessAgent`。
- **前端 UI 层**:`AI SDK UI` 提供 framework-agnostic 的 chat/generative hooks(React/Next.js/Vue/Svelte/Angular/Solid/Expo/TanStack Start 等)。
- **harness 层(2026 新增)**:`AI SDK Harnesses` 通过 `HarnessAgent` 用一套 API 驱动已成型的外部 agent harness(Claude Code、Codex、Pi)。

**与底层 LLM 关系**:纯客户端/服务端 SDK,**自身不托管、不训练模型**。通过 provider 包(`@ai-sdk/openai` 等)或 Vercel AI Gateway 路由到真实模型端点;LLM 是被调用的外部依赖。

---

## 3. 架构与核心组件(点名真实构件)

- **调用层(Core)**:`generateText`(非交互/一次成型,返回所有 step 的 tool calls 与 results)、`streamText`(交互式,SSE 流式,支持在流中夹带 "Data Parts" 类型化数据)、`generateObject`/`streamObject`(结构化输出)。
- **工具层**:`tool()` helper(`description` + `inputSchema`(Zod)+ `execute` 异步函数);`dynamicTool()`(运行时定义、类型未知的工具);MCP 工具(连接 MCP server,标准化发现);provider-executed tools(在 provider 侧执行,如内建搜索)。
- **循环(Loop)**:agent 的核心。官方定义 agent = "LLMs that use tools in a loop to accomplish tasks",三要素 = **LLM + Tools + Loop**。循环由 `stopWhen`(停止条件)驱动,默认单步;设置后转为多步 tool-calling loop。
- **规划 / step 控制**:`prepareStep`(每步执行前调整 model/instructions/tools、压缩或过滤 context、强制工具);`stepCountIs(n)` 等停止条件。
- **Agent 抽象**:`Agent` 是**接口而非类**(允许自定义实现);官方实现 `ToolLoopAgent`(默认最多 20 步)、`WorkflowAgent`(durable/可恢复)、`HarnessAgent`(桥接外部 harness)。
- **记忆 / 上下文**:`runtimeContext`(跨步共享的 agent 状态:租户设置、凭据、进度)与 `toolsContext`(每工具、带类型 schema 的隔离上下文)。消息层区分 `UIMessage`(应用状态的 source of truth)与 `ModelMessage`(发给模型的精简表示)。
- **执行器 / 持久化**:`@ai-sdk/workflow` + `WorkflowAgent` 提供 durable execution,每个 tool 执行成为可重试、可观测的 step,可跨进程重启/部署/中断/延迟审批恢复(第三方示例:Workflow DevKit 的 `DurableAgent`)。
- **人在环**:`toolApproval`(取代已弃用的 `needsApproval`),状态含 `user-approval`/`approved`/`denied`/`not-applicable`。
- **可观测性**:OpenTelemetry 与 Node.js tracing channels(AI SDK 7)。
- **TUI**:`AI SDK TUI` 包,几行代码即可跑 agent 并做实时调试(AI SDK 7)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 讲课主线

以一个用 `ToolLoopAgent`(或等价的带 `stopWhen` 的 `generateText`)的请求为例。官方明确:"Everything you can do with `Agent` can be done with `generateText` or `streamText`",`Agent` 只是对配置的封装。

1. **入口**:开发者构造 `new ToolLoopAgent({ model, tools, ... })`,调用 `agent.generate(...)`(或 `stream`)。默认单步;要多步必须设 `stopWhen`(例如 `stepCountIs(20)`)。
2. **消息装配**:输入的 `UIMessage`(含 metadata、tool results、历史)被转换为精简的 `ModelMessage` 发给模型;`system` 指令、工具的 `inputSchema` 一并序列化进请求。
3. **prepareStep(可选,每步前)**:在把请求发给 provider 前触发,可切换 model、改指令、增删/强制工具(`toolChoice: 'auto' | 'required' | 'none' | {type:'tool',toolName}`)、压缩/过滤 context 以控 token,并可更新 `runtimeContext`。
4. **调用 LLM**:通过 provider 包/AI Gateway 发起一次模型调用。模型要么产出纯文本,要么产出一个或多个 **tool call**(名字 + 符合 `inputSchema` 的参数)。
5. **工具执行**:SDK 用 Zod 校验模型给的参数 → 调用对应 `tool.execute(input, { toolsContext, ... })`。
   - 若该工具标了需要审批,`toolApproval` 流程介入:**第一次模型调用返回审批请求 → 等待用户 `approved`/`denied` → 第二次模型调用**才真正执行或拒绝(HITL 需要两次模型往返)。
   - provider-executed tools 在 provider 侧执行,本地 `toolApproval` 不管这类。
6. **回灌结果**:每个 tool 的 output 作为 **tool result** 回填进消息序列,拼成下一步的输入。
7. **循环判定(`stopWhen`)**:检查停止条件——达到步数上限,**或**模型这一步只产出文本、不再调用工具——满足则退出;否则回到第 3 步继续下一 step。
8. **收敛返回**:退出后返回 `result.text`(最终答案)与 `result.steps`(完整执行 trace,含每步 tool calls/results)。`streamText` 路径则在整个过程中通过 SSE 持续把文本增量与 Data Parts 推给前端。
9. **(durable 变体)**:若用 `WorkflowAgent`/`@ai-sdk/workflow`,上述每个 step(尤其 tool 执行)被物化为 checkpoint;进程崩溃/部署/延迟审批后可从最后成功 checkpoint 恢复,而非重跑。

**关键取舍**:控制流就是"模型决定调不调工具 → SDK 执行 → 结果回灌 → 再问模型",直到模型停止调用工具或触到步数上限。没有隐藏的规划器/DAG;规划权在 LLM 本身,SDK 只提供循环骨架 + 每步 hook。

---

## 5. harness 层设计

- **上下文/记忆管理**:双消息模型(`UIMessage` 持久真相 vs `ModelMessage` 发送态);`runtimeContext`(跨步共享)+ `toolsContext`(每工具隔离、类型化,防止第三方工具拿到不该拿的凭据/配置——这是 AI SDK 7 强调的隔离动机)。上下文压缩/过滤靠 `prepareStep` 手动做,**SDK 不自动做 memory 摘要**。
- **工具接口**:`tool()`(Zod `inputSchema` + `execute`);`dynamicTool()`;MCP 客户端(工具发现);provider-executed tools;AI SDK 7 引入 provider 级 file/skill 上传以减少重复传输,以及 "MCP Apps"(区分 model-visible 与 app-only 工具)。
- **规划**:无独立 planner。多步能力来自 tool-calling loop(`stopWhen`)+ 每步 `prepareStep`。
- **多 agent 交接**:**无一等公民的 handoff/swarm 原语**。AI SDK 6 的博客材料明确未引入多 agent 编排;多 agent 靠把 `Agent`/工具组合到分布式系统里自行实现(可将一个 agent 暴露为另一个 agent 的 tool)。
- **人在环**:`toolApproval`(`user-approval`/`approved`/`denied`/`not-applicable`),需两次模型往返。
- **沙箱**:AI SDK **本身不内置代码沙箱**。沙箱化交给 `HarnessAgent` 桥接的外部 harness(Claude Code / Codex / Pi 各自带执行环境),或交给 Vercel Sandbox 等外部产品。**未找到 AI SDK 自带独立沙箱运行时的公开证据。**

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **最小抽象、provider 无关**:相较 LangChain 的"chains/agents/memory/retrievers + 需要学其抽象",AI SDK 给的是"流式 + 工具调用 + 结构化输出,几乎零抽象,你写普通 TypeScript"。核心张力(第三方对比文所述):**AI SDK 信任你自己搭 pattern;LangChain 给你现成 pattern 但要你学它的抽象。**(该"张力"表述来自第三方对比文,非官方,标注为观点。)
- **前端一体化**:唯一把"服务端生成 + 客户端 UI hooks + 端到端类型安全 + SSE 流式"打通到 Next.js/React 生态的库,这是 Vercel 的天然主场。
- **harness 桥接(2026 差异化)**:`HarnessAgent` 用一套 API 切换 Claude Code/Codex/Pi 等成型 harness,是竞品少见的取向。
- **常见组合用法**(第三方观察,标注为观点):生产中常"前端用 AI SDK,后端用 LangChain/LangGraph"。

---

## 7. 采用度信号

- **GitHub star**:**25,351**(vercel/ai,GitHub API 直查,2026-07-04)。forks 4,714,open issues 1,760。(第三方来源 2026-04 曾报 23.7K / "25.4k",与此一致的量级。)
- **npm 周下载(`ai` 包)**:**15,452,653**(周期 2026-06-26 → 2026-07-02,npm API 直查)。第三方另称"ai 核心包 + `@ai-sdk/*` provider 合计 30M+/周"——**该合计数未逐包核实,标注为第三方估算**。
- **对比 LangChain**:第三方(npm stats,截至 2026-06-02 当周)称 `ai` ≈14.2M/周 vs `langchain` ≈2.4M/周——**第三方数据,量级与本核查一致,精确值未独立复核**。
- **当前版本**:`ai@7.0.15`(2026-07-04 直查)。
- **知名用户**:**OpenCode**(开源编码 agent)据称完全基于 AI SDK 构建——**第三方断言,未从 OpenCode 官方独立核实**。Vercel 自家平台 AI 功能依赖它。
- **贡献者**:第三方称 614+(2026-04);GitHub API 未在本次拉取贡献者精确数,**未独立核实**。
- **势头**:被多个 2026 对比文称为"TypeScript LLM 应用的事实标准 / JS 生态最广采用的 AI 应用框架"——**营销/观点性表述,标注为观点**。

---

## 8. 来源(一手优先)

1. 官方仓库:https://github.com/vercel/ai (描述、star、许可信号,2026-07-04)
2. 官方文档 introduction:https://ai-sdk.dev/docs/introduction (模块划分、providers、frameworks)
3. 官方文档 foundations/agents:https://ai-sdk.dev/docs/foundations/agents (agent 定义、ToolLoopAgent、loop、runtimeContext/toolsContext)
4. 官方文档 tools-and-tool-calling:https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling (tool()、inputSchema、toolChoice、dynamicTool、toolApproval、MCP)
5. Vercel 官方博客 AI SDK 5:https://vercel.com/blog/ai-sdk-5 (stopWhen/prepareStep/Agent、UIMessage/ModelMessage、SSE、发布日 2025-07-31)
6. Vercel 官方博客 AI SDK 6:https://vercel.com/blog/ai-sdk-6 (Agent 接口、ToolLoopAgent、needsApproval、DurableAgent、发布日 2025-12-22)
7. Vercel 官方博客 AI SDK 7:https://vercel.com/blog/ai-sdk-7 (HarnessAgent/WorkflowAgent、@ai-sdk/workflow、TUI、reasoning、MCP Apps、发布日 2026-06-25)
8. npm registry + downloads API:https://registry.npmjs.org/ai/latest 与 https://api.npmjs.org/downloads/point/last-week/ai (版本 7.0.15、许可 Apache-2.0、周下载 15.45M)

（第三方对比/采用度类:developersdigest、speakeasy、futureagi、artificialintelligenceherald 等仅用于交叉印证量级,凡引用处已标注"第三方/观点"。）
