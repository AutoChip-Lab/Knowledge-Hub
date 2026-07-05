# Continue —— 事实底稿(快照:2026 年年中)

> 研究员备注:本文所有断言尽量溯源到一手材料(官方 docs、GitHub/DeepWiki 代码结构、release notes、并购报道)。凡估算或无法核实处均已显式标注。**关键时效性提醒:Continue 已于 2026 年 6 月被 Cursor(Anysphere)收购并停更,仓库转为只读。** 本站作为教学素材时应把它当作「一个已冻结、可完整阅读源码的经典 IDE agent harness 样本」,而非在维护的活产品。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**:Continue 是一个**开源的 IDE 编码 agent**——把「任意 LLM + 任意上下文」接进 VS Code / JetBrains / CLI,提供 Tab 自动补全、Chat、内联 Edit,以及会自主调用工具的 Agent 模式;并配一个 hub(continue hub / hub.continue.dev)用于分发可复用的「assistant」及其构件。官方 README 自我描述为 "pioneering open-source coding agent"(先驱级开源编码 agent)。
- **出品方**:Continue Dev, Inc.,2023 年由 **Ty Dunn(CEO)** 与 **Nate Sesti(CTO)** 创立,Y Combinator 2023 夏季批次(S23)。融资:YC 后约 **$2.1M**,2025 年 2 月再融约 **$3M**(SAFE,由 Heavybit 领投),累计约 **$5–5.6M**(不同数据源在 $5M / $5.6M 间略有出入,标注为估算区间)。
- **许可**:**Apache-2.0**(© 2023–2026 Continue Dev, Inc.)。收购后代码仍以 Apache-2.0 保留,forks / pinned builds 继续合法运行。
- **2026 状态(重要)**:**已停更 / 被收购**。
  - 2026-06-16 前后官网首页 + FAQ 更新,宣布 **被 Cursor(法律实体 Anysphere)收购**,属于典型 **acqui-hire(收人不收产品)**;交易条款未披露(无价格、无结构、无正式新闻稿)。The New Stack 报道日期 2026-06-22。
  - **产品线关停**:托管服务(cloud)下线,recurring billing 已停;现有用户须在 **2026-07-15** 前导出数据(会话历史、保存的配置、团队设置),之后删除。
  - **仓库只读**:`continuedev/continue` 已标注 "no longer actively maintained and is read-only for all users";最终版本 **v2.0.0**(GitHub release 2026-06-19,VS Code 端 `v2.0.0-vscode`),该版本主要做了「移除匿名遥测、拆掉鉴权、修 bug」等收尾。
  - **人员**:联合创始人 **Nate Sesti 加入 Cursor**;**Ty Dunn** 据其 LinkedIn 约在 2025-05(收购公开前几周)已离开 Continue,是否加入 Cursor 不明确。
  - **更上层链条(已核实但属外部背景)**:同一时间窗口(2026-06-16),SpaceX 宣布以约 **$60B 全股票**收购 Cursor 母公司 Anysphere(CNBC / TechCrunch / Quartz 多源印证),交易预计 Q3 2026 完成,归入已与 SpaceX 合并的 xAI 体系。因此 Continue 的代码资产名义上最终落到 Cursor→SpaceX/xAI 手里。**注意**:这条链条对「Continue 本体如何运转」无技术影响,仅作时代背景,教学时可一句带过。

---

## 2. 解决什么问题 / 在 agent 栈里的位置 / 与底层 LLM 的关系

- **解决的问题**:让开发者**不被单一供应商锁定**地在编辑器里用 AI——自选模型(闭源云端 / 本地 Ollama)、自选上下文、自定义补全与 chat/agent 行为,并把这套配置作为可版本化、可分享的「assistant」在团队和多个 IDE 间同步。卖点是 "amplified, not automated"(增强开发者,而非替代),以及本地优先 / 隐私可控。
- **在栈里的位置**:它**同时是 harness 又是 IDE 客户端**,而不是纯编排框架或云平台。可拆成三层看:
  - **IDE 集成层 / 前端**:VS Code 扩展、JetBrains(IntelliJ)插件、`cn` CLI、(社区)Neovim。
  - **harness / agent 运行时**:`core` —— 承载 agent 循环、工具、上下文检索、索引、配置、LLM 抽象。**这是教学重点**。
  - **平台层(轻)**:Continue Hub(hub.continue.dev)——一个「building blocks」注册表 + assistant 分发/同步服务(现已随收购关停托管)。
- **与底层 LLM 的关系**:Continue 是 LLM 之上的 **middleware / harness**,自身不训练模型,**provider-agnostic**。它把请求路由到用户配置的模型(OpenAI、Anthropic Claude、Gemini、Mistral、本地 Ollama、vLLM 等),并按「角色(role)」分工不同模型(见 §3)。工具调用既支持模型**原生 function calling**,也提供一套**「system message tools」把工具塞进 system prompt** 的兼容路径,让无原生工具能力的模型也能在 agent 模式里跑(见 §4/§5)。

---

## 3. 架构与核心组件(点名真实构件)

代码仓库分层(来自 GitHub README 目录约定 + DeepWiki 代码地图):

- **`core/`** —— 业务逻辑中枢,跨 IDE 复用。中心类是 **`Core`**:初始化各子系统、注册各类消息 handler,负责 history、autocomplete、indexing、streamChat 等。
- **`gui/`** —— 侧边栏 webview 的 **React + Redux Toolkit** UI;持有 UI 状态(当前 chat session 等)。
- **`extensions/`** —— IDE 特定实现:VS Code(TS)、JetBrains(**Kotlin + IntelliJ Platform SDK**)。负责启动 core+gui、转发消息、实现 IDE 接口(读写文件、终端、diff 等)。
- **`binary/`** —— core 的薄可执行封装,和扩展通过 **stdin/stdout** 通信;`cn` CLI 也带自己的 TUI chat 界面和**子 agent(sub-agent)系统**。
- **`packages/`** —— 抽出的公共 NPM 包,如 `config-yaml`(配置 schema)。
- **`core/protocol/`** —— **类型化消息协议**定义(`ToCoreProtocol` / `FromCoreProtocol` / `ToWebviewProtocol` 等)。

功能子系统(agent harness 的真实构件):

- **循环 / 执行器**:agent 模式的「LLM ↔ 工具」回合循环(见 §4),工具执行走 core 内置实现或 MCP server。
- **工具层**:内置工具 + MCP 工具。内置只读工具(Plan/Agent 可用):Read file、Read currently open file、`ls`(List directory)、Glob search、Grep search、Fetch URL、Search web、View diff、View repo map、View subdirectory、Codebase;写工具(仅 Agent):Create new file、`edit_existing_file`、Run terminal command、Create Rule Block;另有 AskQuestion(暂停问澄清)、Checklist/Status 等控制类工具(具体清单随版本演进,标注为 v2 附近状态)。
- **记忆 / 上下文**:上下文提供者(context providers,`@`-mention)、`docs` 索引(向量检索文档站)、**`CodebaseIndexer`** 后台代码库索引(多种 index 类型);注意 `@Codebase` 作为独立 context provider **已弃用**,改由 agent 用文件浏览/搜索工具自行理解代码库。
- **规划**:三态模式 Chat / **Plan** / Agent;Plan 是「只读工具 + 制定策略、不落盘」的中间态。
- **角色(model roles)**:同一 assistant 可给不同模型分派角色——`chat`、`edit`、`apply`、`autocomplete`、`embed`、`rerank`、`summarize`(默认 `[chat, edit, apply, summarize]`)。`apply` 专门负责把模型产出的改动落到文件(「fast apply」思路)。
- **rules(角色/约束)**:注入 Agent/Chat/Edit 请求的 system-message 指令(相当于 project rules / persona)。
- **消息总线**:core ↔ extension ↔ gui 的**严格消息传递**(见 §4),含 pass-through 优化。
- **沙箱**:无内建强沙箱;隔离靠**工具权限三态**(Ask/Automatic/Excluded)+ IDE 进程边界(见 §5)。

---

## 4. 一步步怎么运转(控制/编排回路)——本节最重要

### 4a. 组件间的消息总线(所有请求的物理通道)
Continue 强制**消息传递、无跨层直接函数调用**。逻辑拓扑是:

```
gui (React webview)  <—>  extension (IDE 层)  <—>  core (业务逻辑/agent 运行时)  <—>  LLM / 工具
```

- core 和 gui **都能直接给 extension 发消息**;core 与 gui **互相通信必须经 extension 中转**。
- 为性能设了**pass-through 白名单**(`WEBVIEW_TO_CORE_PASS_THROUGH` / `CORE_TO_WEBVIEW_PASS_THROUGH`),让 webview↔core 的高频消息(如 `history/list`、`config/addModel`、`llm/streamChat`、`indexProgress`、`configUpdate`)绕过 IDE 层。
- **平台差异**:VS Code 里 core 与扩展**同进程**,用 `InProcessMessenger` 免序列化;IntelliJ 里 core 是**独立进程**,插件通过 **binary** 用 JSON over **TCP 或 stdin/stdout** 通信。

### 4b. Agent 模式的编排回路(一个用户请求的实际流经路径)
以「在 Agent 模式下让它改多文件」为例:

1. **用户在 gui 输入** → 消息经 extension 送到 core;core 组装请求:用户消息 + 选中/打开文件等上下文 + `rules`(system 指令)+ **当前可用工具清单**。
2. **工具随请求下发**:在 Agent 模式,可用工具(内置 + 已配置的 MCP 工具)以「name + arguments schema」形式随 `user` 请求一并发给模型。工具是否可见取决于模式(Chat 无工具 / Plan 仅只读 / Agent 全量)与逐工具权限。
3. **模型决策**:模型可以直接回文本,也可以**在回复里包含一个 tool call**。
   - 若模型有**原生 function calling**,走原生工具协议;
   - 若模型**无原生工具能力**,Continue 用 **system message tools**:把工具定义转成 **XML** 塞进 system prompt,模型以结构化 XML 生成 tool call,Continue 再**解析**出来。(该 XML 路径是保证「几乎任何能跟随指令的模型都能用 agent」的兼容层;文档同时标注它为**实验特性**,对无原生工具支持的模型**并非全自动兜底、需显式配置**——两处措辞有张力,教学时可点出这是「稳定路径=原生工具,兼容路径=XML 系统消息工具」。)
4. **人在环 / 权限门**:core 依据该工具的策略决定是否**暂停等用户批准**。三态:**Ask First(默认,弹批准)/ Automatic(直接执行)/ Excluded(对模型隐藏)**。策略是 per-user 本地控制,在输入栏工具图标里逐项切换。
5. **工具执行**:批准(或 Automatic)后,core 调用**内置工具实现**或**对应 MCP server**执行(如读文件、grep、跑终端命令、浏览器自动化)。写文件类改动可交给 `apply` 角色模型/apply 逻辑落盘,并在 IDE 里以 diff 呈现。
6. **回灌结果**:core 把工具结果发回模型。
7. **回合循环**:模型据结果**再产出下一步 tool call**,回到第 3 步;如此往复,直到模型判断任务完成、给出最终回复。这就是 agent 的「ReAct 式 观察-决策-行动」外循环,由 core 驱动、gui 逐步渲染中间步骤、extension 提供落地能力。

### 4c. 其他入口的简化回路
- **Tab 自动补全**:走 `autocomplete` 角色模型,低延迟单发(非 agent 循环),不涉工具。
- **内联 Edit**:走 `edit`(+ `apply`)角色,针对选区做定向改写,产出 diff 供接受/拒绝。
- **Plan 模式**:同 4b 的循环,但工具集限制为**只读**,产出策略/计划而不落盘;用户可切到 Agent 再执行(`Cmd/Ctrl + .` 在 Chat/Plan/Agent 间循环)。

---

## 5. harness 层设计(上下文/记忆、工具接口、规划、多 agent 交接、人在环、沙箱)

- **上下文 / 记忆管理**:
  - **短期**:会话 history(gui 持有当前 session,core 管 history 存取)。
  - **检索式**:context providers(`@files`、`@docs`、URL、终端等),`docs` 站点做向量索引,`CodebaseIndexer` 后台建多类代码库索引。**演进**:老的 `@Codebase` 一次性检索被弃用,新范式是让 agent **用工具(glob/grep/read/repo-map)自行探索代码库**——即从「预注入 RAG」转向「agent 自主检索」。
- **工具接口**:统一抽象覆盖两类来源——**内置工具**(直连 IDE 能力:文件、终端、diff、web/URL fetch、repo map)与 **MCP 工具**。MCP 支持 **stdio(本地)/ SSE / streamable-http(远程)** 三种 transport;通过 `mcpServers` 配置块或 `.continue/mcpServers/` 下的 YAML/JSON 文件加载;**MCP 仅在 agent 模式生效**。工具向模型的暴露有两条编码路径:原生 function-calling schema,或 **system-message XML tools** 兼容层。
- **规划**:显式 **Plan 模式**(只读工具 + 制定计划、零副作用)作为 Chat 与 Agent 之间的安全中间态;这是 Continue 相对早期「只有 chat/agent」产品的一个成熟化设计。
- **多 agent 交接**:主产品线不是重编排框架;**多 agent 能力集中在 `cn` CLI 的 sub-agent 系统**(binary 内)。IDE 侧的「协作」更多是 hub 上分享 assistant 定义,而非运行时的 agent-to-agent handoff。**未找到**关于 IDE 内成熟 supervisor/worker 多 agent 编排的一手文档——标注为「弱/主要在 CLI」。
- **人在环**:核心是**逐工具权限三态(Ask/Automatic/Excluded)**+ diff 审阅(改动先呈现再接受)+ `AskQuestion` 工具(agent 主动暂停问澄清)。文档明确警告:对**非只读**行为的工具设 Automatic 需谨慎。
- **沙箱**:**没有强隔离沙箱**(无容器/VM 级隔离的一手证据)。安全边界主要来自:①工具权限门控;②IDE 进程/binary 进程边界;③本地优先、可全程离线(本地模型)。教学时应明确:Continue 的安全模型是「**审批 + 本地信任**」,而非「**沙箱执行**」。

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **供应商中立 + 本地优先**:相对 GitHub Copilot / Cursor 的「捆绑自家模型/云」,Continue 让你接**任意模型**(含 Ollama 本地、完全离线),这是它最大的差异化与拥趸来源(隐私、成本、合规、可换模型)。
- **配置即制品(assistant / building blocks)**:把 models/rules/prompts/docs/mcpServers 组成的 assistant 用 `config.yaml` 版本化,并可发到 **Hub** 分享、跨 VS Code/JetBrains/CLI **同步**——把「AI 编码配置」当成可协作的一等公民。这是它区别于「单机插件」的平台野心。
- **角色化模型分工**:一个 assistant 内 chat/edit/apply/autocomplete/embed/rerank 各用最合适的模型(如便宜快模型做补全、强模型做 chat、专用 apply 模型落盘),粒度比多数竞品细。
- **广模型兼容(system message tools)**:用 XML 系统消息工具兜底,让弱模型/本地模型也能进 agent 模式——代价是可靠性和解析边界问题(已知 parser 会把「引用/解释自身工具语法」的文本误判为真实 tool call,见 issue #11070),这是它「广兼容」取舍的真实成本。
- **完全开源(Apache-2.0)可自托管/可 fork**:企业可内部魔改与合规审计;收购后这也是它「作为遗产继续存活」的方式。
- **取舍代价**:配置复杂度高(单一 config 驱动多 IDE 也意味着上手门槛);无沙箱、安全靠审批;多 agent 编排弱;且——**现已停更**,选它=选一个冻结的开源基座而非在维护的产品。

---

## 7. 采用度信号

- **GitHub star**:约 **34.7k**(`continuedev/continue`,README 快照,2026-06 收购前后);并购报道普遍引用「~34K / ~34,300 stars、~4,800 forks」。**注意**:仓库已只读,star 数此后基本冻结。
- **主要语言**:TypeScript ~83.9%(README);JetBrains 侧 Kotlin。
- **知名用户 / 势头**:YC S23 出身,融资 ~$5M;被主流开发媒体(The New Stack、TechCrunch、DevOps 类站点)持续报道;曾被广泛列为「开源 Copilot 替代」代表之一。**未找到**可靠的一手 named 大企业生产采用清单或 DAU/装机量官方数字——标注为「未找到公开数据」。势头信号在 2026-06 因收购/停更**由正转停**:产品关停、社区转向 fork 或迁移。
- **时点提醒**:所有采用度数字均为**收购前的历史快照**,非当前活数据。

---

## 8. 来源(4–8 条)

1. GitHub 仓库 README（定位、许可、star、v2.0.0、只读状态、语言）: https://github.com/continuedev/continue
2. 官网（"acquired by Cursor"、"amplified, not automated"、FAQ）: https://www.continue.dev/
3. The New Stack —— Cursor 收购 Continue（acqui-hire、日期、条款未披露）: https://thenewstack.io/cursor-acquires-continue-coding/
4. CI/CD News —— 收购细节 + 7-15 导出截止 + star/融资数字: https://cicd.deployment.to/cursor-acquires-continue-coding-assistant/
5. Continue Docs —— Agent 模式如何运转（工具下发/模型选择/审批/执行/回灌/循环）: https://docs.continue.dev/ide-extensions/agent/how-it-works
6. Continue Docs —— MCP 深潜（仅 agent 模式、stdio/SSE/streamable-http、mcpServers）: https://docs.continue.dev/customize/deep-dives/mcp
7. Continue Docs —— config.yaml Reference（models 角色、context、rules、prompts、docs、mcpServers、data）: https://docs.continue.dev/reference
8. DeepWiki 代码地图 —— System Architecture（core/extension/gui/binary/packages、协议、消息路由）: https://deepwiki.com/continuedev/continue/2.1-system-architecture

补充背景（外部,已多源核实,仅作时代背景):SpaceX 以 ~$60B 收购 Cursor 母公司 Anysphere —— https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/
