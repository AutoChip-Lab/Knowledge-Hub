# Strands Agents 事实底稿

> 快照:2026 年年中(2026-07)。所有断言尽量溯源;推断/未核实项已显式标注。

## 1. 一句话定位 · 出品方 · 许可 · 2026 状态

- **一句话**:Strands Agents 是 AWS 开源的「model-driven」agent SDK——你给一个模型、一段 system prompt、一组工具,由 LLM 自己规划、选工具、循环推理,直到产出最终答案,而不是让开发者手写编排流程图。官方近期把自己重新表述为「build an agent harness, control it end-to-end」(构建 agent harness 并端到端掌控)。
- **出品方**:AWS(Amazon)。原始公告作者为 AWS Agentic AI 首席工程师 Clare Liguori。
- **许可**:Apache-2.0(SDK、tools、docs、shell 等全家桶均为 Apache-2.0)。
- **时间线**:2025-05-16 以 preview 开源(仓库创建于 2025-05-14);2025-07-15 发布 1.0(生产就绪 + 多 agent 编排)。
- **2026 状态:活跃,持续高频迭代。** 未停更、未改名产品、未被剥离。
  - 核心仓库在 2026 年从 `strands-agents/sdk-python` **重命名为 `strands-agents/harness-sdk`**,并整合成 monorepo(Python SDK + TypeScript SDK + 文档站 + CLI)。语义从「Python SDK」升级到「多语言 agent harness」。
  - 版本节奏很快:Python 与 TypeScript 各自独立版本号。截至 2026-06-25,Python `v1.45.0`、TypeScript `v1.7.0`(monorepo 内以 `python/vX` 和 `typescript/vX` tag 分别发布)。PyPI 上 `strands-agents` 当前 1.45.0,要求 Python ≥3.10。
  - 未核实:有二手来源提到「实验性 Python-WASM 构建」,但 harness-sdk README 的目录表里没有 WASM 包,**未能核实,存疑**。

## 2. 解决什么问题 · 技术栈位置 · 与 LLM 的关系

- **要解决的痛点**:早期 agent 框架需要大量脚手架、复杂 prompt 工程、几个月调优才能上生产。Strands 的赌注是「现代 LLM 的原生推理 + 工具调用能力已经够强」,因此把规划/工具编排交给模型,SDK 只提供把这套循环跑稳、可观测、可上生产的最小骨架,把上线周期从「数月」压到「数天到数周」。
- **栈内位置**:它是 **agent 运行时 + harness 层的 SDK/库**,不是托管平台、不是纯编排 DSL。官方自我定位就是「agent harness」——即包住模型、维护对话状态、执行工具、施加约束/可观测性的那一层。它**下承**各家 LLM(model provider 可插拔),**上接**部署与托管:可裸跑在 Lambda/Fargate/EC2,也可用 `BedrockAgentCoreApp` 包装后部署进 **Amazon Bedrock AgentCore**(AWS 的 serverless agent 运行时,提供 identity/memory/observability)。可以理解为:Strands = 写 agent 逻辑的 SDK;AgentCore = 托管它的平台。二手来源称 AgentCore 的声明式 harness(Preview)会从 config 组装 Strands agent(**未逐字核实措辞,方向可信**)。
- **与底层 LLM 的关系**:模型是「推理引擎」,SDK 是模型不可知的。两个 SDK 都默认走 Amazon Bedrock(默认 Claude Sonnet,需要 AWS 凭证 + 模型访问权限),但一等公民支持 **Amazon Bedrock / Anthropic / OpenAI / Google Gemini**,外加 Ollama(本地)、Llama API、LiteLLM 网关及自定义 provider。切换模型只改 provider 配置,业务代码不动。

## 3. 架构与核心组件(点名真实构件)

**最小心智模型 = 三件套**:`Model`(推理引擎)+ System Prompt(角色/任务定义)+ Tools(能力)。围绕这三件套是运行时。

真实构件(以 Python SDK 为主,类名/装饰器均来自官方文档与 README):
- **`Agent` 类**:主实体。一次 `agent("...")` 调用内部就跑完整个 agent loop;`stream_async` 做实时事件流 + 取消。
- **Agent loop / event loop**:执行原语。官方文档把它描述为系统级编排行为,并未强制命名一个统一的 `EventLoop` 类——循环逻辑与 `Agent` 实例绑定。
- **Tool 层**:
  - `@tool` 装饰器把任意 Python 函数变成工具;开发期支持热重载(hot-reload,改工具不重启)。
  - **Tool registry**:执行前按 schema 校验、在注册表里定位、带错误处理执行。
  - **MCP(Model Context Protocol)**:一等公民,可接入数千个已发布 MCP server 当工具。
  - `strands-agents-tools`(独立仓库 `tools`,~1.1k stars):20+ 预置工具(文件、HTTP、AWS API、`retrieve` 语义检索、`think` 深度分析、多 agent 编排工具等)。
- **Conversation / Context 管理**:`ConversationManager` 接口 + 两种内置策略(见 §5)。这是模型的「工作记忆」。
- **Session 管理**:`SessionManager` 抽象,把会话与 agent 状态持久化/恢复到外部存储(如 Amazon S3),使 agent 在计算重启后能续跑。
- **Hooks**:生命周期事件回调,可拦截/观测/改写/重定向任意一步(如 `BeforeToolCallEvent`)。
- **Interrupts / Human-in-the-loop**:中断机制 + `handoff_to_user` 工具(见 §5)。
- **Guardrails + Steering handlers**:护栏在工具运行前拦错;steering handler 让 agent 自我纠错而非静默失败。集成 Amazon Bedrock Guardrails 做内容过滤。
- **多 agent 原语**:`Swarm` / `Graph` / `Workflow` / Agents-as-Tools / Handoffs / A2A(见 §5、§6)。
- **可观测性**:内置 OpenTelemetry(OTEL)——traces/spans 记录每次 model call、tool call、循环迭代、token 消耗、延迟;可接 AWS X-Ray / CloudWatch / Jaeger / Langfuse。「默认追踪每个决策」是其卖点之一。
- **沙箱(独立仓库 `shell`,~212 stars)**:`Strands Shell` 是一个 in-process、Bourne 兼容的 shell(内置 grep/sed/jq/curl/find 等 50+ 命令),不 fork/exec/syscall、冷启动 <1ms;通过声明式白名单限定 agent 能触达的文件/URL/凭证(「给 agent 一个 shell,但不给它你机器的钥匙」)。是对 Docker/云沙箱的轻量替代。
- **配套仓库**:`sdk-typescript`(旧的独立 TS 仓库,现 TS 主体已并入 monorepo 的 `strands-ts/`)、`samples`、`agent-builder`、`agent-sop`(自然语言 SOP 工作流)、`evals`(评测框架)、`mcp-server`(把 Strands 文档喂给编码助手)。

## 4. 一步步怎么运转(核心章节:请求实际流经的控制回路)

用户一次请求在 Strands 里走的是一个**递归的 agent loop / event loop**。以 `agent("帮我算 1764 的平方根")` 为例:

1. **组装上下文并调用模型**:Strands 把 system prompt、累积的对话历史(user + assistant + tool result 三类消息)、以及可用工具的 schema 一起发给 LLM。对话历史就是模型这次任务的「工作记忆」。
2. **模型推理并决定动作**:LLM「出声思考」,产出推理轨迹,并给出一个 **stop reason**——要么直接给最终文本(`end_turn`),要么请求调用一个或多个工具(`tool_use`)。
3. **若是 `tool_use` → 框架执行工具**:event loop 拦截工具请求,执行层依次:按 schema **校验**参数 → 在 **registry** 里定位工具 → 带错误处理**执行**。
   - 关键容错:**工具失败时,错误作为一条「工具错误结果」回传给模型,而不是抛异常终止循环**——让模型自己决定重试/换路。
4. **把工具结果喂回历史**:工具输出被格式化成 **tool result 消息(以 user 角色)**追加进对话历史。
5. **回到第 1 步递归**:带着新历史再次调用模型。如此「调用模型 → 要不要用工具 → 执行 → 回填 → 再调用」循环往复。
6. **终止**:直到模型给出无工具调用的最终文本(`end_turn`)才退出。其他退出条件:`max_tokens`/回合上限等预算耗尽、被外部取消(cancelled)、被 guardrail 过滤(filtered)、或被 interrupt 打断转人类。

**贯穿这个回路的横切层**(讲课时可作为「回路的旁路」):
- 每一步都可被 **hooks** 拦截(记录/校验/改写/重定向);例如在 `BeforeToolCallEvent` 上插入人类审批。
- 每一步默认发 **OTEL span**(model call / tool call 各一个 span),串成一条 trace。
- **conversation manager** 在历史增长时按策略裁剪/摘要,保证不超上下文窗口。
- **session manager** 可在任意回合把状态落盘,崩溃后从外部存储恢复续跑。
- `stream_async` 让上述事件实时流出(打字机式输出 + 可中途取消)。

一句话总结控制流:**「规划」不在 SDK 里,而在模型的 chain-of-thought 里;SDK 负责把模型的决策变成真实的工具执行、把结果回填、并把整条链路观测/约束住。**

## 5. Harness 层设计细节

- **上下文 / 记忆管理(`ConversationManager` 接口,两种内置策略)**:
  - `SlidingWindowConversationManager`:维护滑动窗口,超出消息数上限就从窗口移除旧消息;保留 tool-use 配对、避免非法窗口状态;开启截断时,超大 tool result 只留首尾各 ~200 字符,且**优先截断最旧的 tool result**,保住最近上下文。
  - `SummarizingConversationManager`:对旧上下文做**摘要**而非直接丢弃。参数如 `summary_ratio`(默认 0.3,缩减时摘要多大比例的消息)、`preserve_recent_messages`(默认 10,始终保留的最近消息数)。
  - 长期/跨会话记忆走外部:`SessionManager` 持久化到 S3 等;第三方 `mem0.ai` 集成做长期记忆。
- **工具接口**:`@tool` 装饰任意函数(Python)/ Zod-typed 工具(TypeScript);schema 自动生成;热重载;MCP server 即插即用;支持 return-of-control(部分工具执行「交还」给客户端,做混合云/本地执行)。
- **规划**:无硬编码 planner——规划涌现自 LLM 的推理。需要更强流程约束时用 `Graph`(见下)。另有 `agent-sop` 仓库把自然语言 SOP 变成可复用工作流。
- **多 agent 交接(1.0 引入四类原语)**:
  - **Agents-as-Tools**:把专家 agent 包成可调用工具,orchestrator 委派而不交出控制权(分层委派)。
  - **Handoffs**:显式把责任转交(给另一个 agent 或人类),转交时保留对话上下文。
  - **Swarm**:一池 agent 通过共享内存自组织、自主互相 handoff,路径由 agent 自己决定(去中心化协作)。
  - **Graph**:确定性有向图编排,节点可以是 agent / 自定义节点 / 嵌套的 Swarm 或 Graph,支持条件路由与审批链(需要确定步骤时用它)。
  - **Workflow**:开发者在代码里定义所有任务及依赖,按既定顺序/依赖执行(结构化协调)。
  - **A2A(Agent-to-Agent)协议**:开放标准,JSON-RPC-over-HTTP(S) + SSE 流式,靠 "Agent Card" 元数据做发现与委派,跨厂商/框架互操作。注意:`A2AAgent` 目前**不支持用在 Swarm 里**,远程 A2A agent 要走 Graph 工作流。
- **人在环 / Interrupts**:中断系统可在特定生命周期事件暂停循环、把控制权还给用户;可从 hook 回调或工具定义里抛 interrupt(`BeforeToolCallEvent` 可中断,用于工具执行前人工审批)。`handoff_to_user` 工具两种模式:交互模式(`breakout_of_loop=False`,收集输入后继续)/ 完全交接模式(`breakout_of_loop=True`,停掉 event loop 交给人)。
- **沙箱**:`Strands Shell`(§3),in-process VFS + 声明式白名单;对比 Docker(~200ms 冷启)/云 MicroVM 沙箱(~1s),它 <1ms 且 in-process。
- **安全**:细粒度工具访问控制(每个 agent 只暴露必要工具、最小权限);Bedrock Guardrails;日志脱敏;IAM/Cognito/OAuth 鉴权层;AWS MAESTRO 威胁建模框架。

## 6. 与同类相比的独特取舍(为什么有人选它)

- **model-driven,而非 workflow-driven**:相对 LangGraph 那种「开发者显式画状态机/图」的路线,Strands 默认让模型自己规划,代码量极少(几行起一个 agent);需要确定性时再用 `Graph`/`Workflow` 把缰绳拉回来。取舍:少写编排代码,换来对模型推理质量的更强依赖。
- **「harness」定位 + 默认可观测/可控**:卖点是「端到端掌控」——默认 OTEL 全链路追踪、hooks 可拦截任意一步、guardrails/steering 内建。适合把可审计/可运维放在第一位的企业场景。
- **AWS 原生 + 模型不可知**:默认 Bedrock、深度整合 AgentCore/Lambda/Fargate/X-Ray/CloudWatch/Guardrails,但又一等公民支持 Anthropic/OpenAI/Gemini/Ollama。对已在 AWS 上的团队摩擦最小,同时不锁死单一模型。
- **同一套代码 Python + TypeScript**:monorepo 双 SDK,API 对齐(`Agent` / `invoke`),前后端可共用心智模型——多数竞品只有 Python。
- **生产血统**:不是纯社区实验,而是从 Amazon 内部生产系统(Q Developer、Glue、Kiro 等)抽出来开源的,harness/session/沙箱这些「上生产才需要」的部件是原生的而非事后补。
- **取舍代价**:社区规模与生态插件数不及 LangChain/LangGraph;强 AWS 底色对非 AWS 用户是心智负担;model-driven 在模型较弱时行为更难预测(所以才有 guardrails/steering/Graph 兜底)。

## 7. 采用度信号

- **GitHub star(核心 `harness-sdk` 仓库,GitHub API 直读,时点 2026-07-03)**:**6,405 stars**,925 forks,Apache-2.0,活跃(pushed 2026-07-03)。对比里程碑:1.0 前(2025-07)约 2,000 stars。
  - 相关仓库 stars(同一时点):`tools` 1,113 · `agent-sop` 1,067 · `samples` 801 · `sdk-typescript`(旧独立仓)696 · `agent-builder` 421 · `mcp-server` 289 · `shell` 212 · `evals` 153 · `docs` 194。
- **PyPI 下载(pypistats,时点 2026-07-03)**:`strands-agents` **上月约 3,386 万次下载**(last_month ≈ 33.86M;last_week ≈ 8.21M;last_day ≈ 1.16M)。对比:1.0 前累计仅 ~150K 下载,一年内量级暴涨。
  - 注:二手来源(rywalker.com)称「16.7M/月」,与此处直连 pypistats 的 ~33.9M/月不符——**以直读 pypistats 为准**,二手数字疑为旧/口径不同。
- **已知生产用户**:AWS 内部——**Amazon Q Developer、AWS Glue、VPC Reachability Analyzer**(官方公告点名);二手来源另称 **Kiro**(AWS IDE)在用(**未官方逐字核实**)。
- **生态伙伴/贡献者**:Accenture、Anthropic、Langfuse、mem0.ai、Meta、PwC、Ragas.io、Tavily(官方列为贡献/集成方)。0.1.0→1.0 间 150+ PR 里约 22% 来自社区。
- **势头**:一年内 star 3x、月下载从十万级到千万级、双 SDK 双周节奏发版、并入 AgentCore 生态——增长主要靠 AWS 产品线内部采用带动,而非纯病毒式开源传播。

## 8. 来源(一手为主)

1. AWS 开源博客,发布公告(定位/组件/许可/生产用户):https://aws.amazon.com/blogs/opensource/introducing-strands-agents-an-open-source-ai-agents-sdk/
2. AWS 博客,1.0 发布(多 agent 原语/session/async):https://aws.amazon.com/blogs/opensource/introducing-strands-agents-1-0-production-ready-multi-agent-orchestration-made-simple/
3. AWS ML 博客,技术深潜(event loop/可观测性/多 agent/部署):https://aws.amazon.com/blogs/machine-learning/strands-agents-sdk-a-technical-deep-dive-into-agent-architectures-and-observability/
4. GitHub `strands-agents/harness-sdk`(README + monorepo 结构 + star/version,API 直读):https://github.com/strands-agents/harness-sdk
5. 官方文档,Agent Loop(逐步控制流):https://strandsagents.com/docs/user-guide/concepts/agents/agent-loop/
6. 官方文档,Conversation Management(SlidingWindow / Summarizing):https://strandsagents.com/docs/user-guide/concepts/agents/conversation-management/
7. 官方文档,Human-in-the-Loop / Interrupts / handoff_to_user:https://strandsagents.com/docs/user-guide/concepts/agents/interventions/human-in-the-loop/
8. GitHub `strands-agents/shell`(沙箱设计)+ PyPI `strands-agents`(版本/下载):https://github.com/strands-agents/shell · https://pypi.org/project/strands-agents/

---
### 未核实 / 存疑清单
- 「实验性 Python-WASM 构建」:harness-sdk README 目录表未列 WASM 包,**未能核实**。
- 「AgentCore 声明式 harness 从 config 组装 Strands agent」:方向可信,**措辞未逐字核实**。
- 「Kiro 用 Strands」:二手来源提及,**官方未逐字确认**。
- 二手「16.7M/月下载」与直读 pypistats「~33.9M/月」冲突,已以直读为准。
