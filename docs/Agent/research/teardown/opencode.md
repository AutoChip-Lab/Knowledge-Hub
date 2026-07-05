# OpenCode 事实底稿(快照:2026 年年中)

> 研究对象:**OpenCode** —— 开源终端编码 agent,由 Anomaly(前身即 SST 团队)出品,provider 无关,对位 Claude Code。
> 快照时点:2026-07,以官方文档 / GitHub 仓库 / 一手工程叙述为准。

---

## 0. 命名与身份消歧(重要,先厘清)

"OpenCode" 这个名字在 2024–2025 年间指过**两个不同的项目**,讲课时必须区分:

- **原始 OpenCode(Go 版)**:由 Kujtim Hoxha 于 2024 年创建,托管在 `opencode-ai` GitHub org,用 Go 写的终端编码助手。2025 年 Charm 公司(Bubbletea / Lipgloss 终端 UI 库的作者)介入,雇了 Hoxha 并试图把仓库迁到自己 org 下。持有 `opencode.ai` 域名的 Dax Raad / Adam 一方反对并主张品牌归属。**争议以 Charm 把自己的版本改名为 `Crush` 收场**,原 Go 代码库归到 Charm/Crush 名下继续维护。
- **现今 OpenCode(TypeScript 版)**:Raad 一方保留 "OpenCode" 名称,用 **TypeScript + Bun 运行时重写**,2025-06-19 公开发布。这就是本底稿的研究对象,**当今说 "OpenCode" 几乎都指这个**。

> 溯源注:上述 Charm/Crush 分裂细节来自二手技术媒体综述(TFN、BigGo、Grokipedia 等)转述,官方文档未正式复述这段争议;时间线(2025 公开发布、TS 重写)可与官方一致对上。分裂的"谁对谁错"属立场性叙述,**此处只记事实脉络,不做裁决**。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**:开源、provider 无关的**终端编码 agent**("The open source AI coding agent"),主界面是 TUI,也提供 desktop app(beta)与 IDE 扩展。对标 Claude Code,但不绑定单一模型厂商。
- **出品方**:**Anomaly**(GitHub org:`anomalyco`)。这家公司就是 SST(Serverless Stack)团队;官方对外身份长期叫 SST,2026 年把所有项目统一收编到 Anomaly 品牌下(见 §7)。核心人物:**Jay V(CEO)、Frank Wang(CTO)、Dax Raad、Adam Elmore**。SST 2021 年过 YC,demo day 后融 ~$1M,2025 年实现盈利(据 TFN)。
- **许可**:**MIT**。
- **2026 状态**:**高度活跃**。仓库 `github.com/anomalyco/opencode`(原 `sst/opencode` 现重定向到此)。截至 2026-07-01 最新 release **v1.17.13**,累计 **830 个 release**。**未停更、未被收购**;2026 年发生的"改名"是公司品牌从 SST → Anomaly 的对外统一(GitHub org 由 `sst` 迁到 `anomalyco`),**产品本身仍叫 OpenCode**。

> 溯源注:`sst/opencode` → `anomalyco/opencode` 的迁移由 Dax(@thdxr)在 X 上确认:"official company name has always been anomaly … now it's anomalyco/opencode … if you're using the opencode github action you'll have to update it"。

---

## 2. 解决什么问题 / 在技术栈里的位置 / 与底层 LLM 的关系

- **解决的问题**:让开发者在终端里用自然语言驱动一个能**读写文件、跑 shell、探索大型代码库、看 LSP 诊断**的自主 agent 完成编码任务;并且**不锁定模型厂商**——你直接付钱给模型 vendor,而不是付给 OpenCode。
- **栈内位置**:它是一个**完整的 agent harness + agent 运行时**,而不是单纯的库或编排框架。更精确地说,它是**本地 agent 服务器 + 多客户端**的产品形态:核心 agent 逻辑跑在一个本地 server 进程里(§3/§4),TUI/desktop/IDE/CI 都是连它的客户端。它自带工具层、上下文/记忆管理、权限门控、子 agent 编排——即一个"harness"的全部要件。
- **与底层 LLM 的关系**:**provider 无关**。通过 **Vercel AI SDK(`ai` + `@ai-sdk/*`)** 抽象模型调用,支持 **75+ providers**(Anthropic、OpenAI、Google、GitHub Copilot、Ollama 本地模型等)。模型元数据来自团队自维护的 **models.dev**(号称"最大的 AI 模型数据库")。官方还提供托管的 **OpenCode Zen**(curated 模型入口,零注册/零信用卡的低摩擦上手,也是主要变现来源)。
  - 关键取舍:`Provider.getModel()` 拿到模型后由 AI SDK 统一走 tool-calling / streaming 协议,所以**换模型不换 harness**。

---

## 3. 架构与核心组件(点名真实构件)

严格的 **client/server** 架构,核心业务逻辑全在 server,与表现层完全隔离。

- **Server(核心)**:**Bun / TypeScript** 实现,HTTP 框架用 **Hono**。启动命令 `opencode serve`,默认监听 `127.0.0.1:4096`。暴露 **OpenAPI 3.1** 规范(`/doc`)。可选 HTTP basic auth(`OPENCODE_SERVER_PASSWORD`,用户名默认 `opencode`)。
  - 代码构成:仓库约 71% TypeScript(其余 MDX/CSS 为文档站)。
- **TUI(主客户端)**:**Go 实现**的终端界面(团队是 neovim 用户 + terminal.shop 作者)。运行 `opencode` 时**同时起 TUI + server,TUI 只是 talk to server 的 client**。
- **其他客户端**:Desktop app(Electron 壳 + Solid.js 前端,beta)、VS Code 扩展(spawn CLI)、GitHub Actions / GitLab CI runner、以及任意通过 SDK 调 HTTP/SSE 的自定义程序。
- **消息总线 / 事件系统**:server 通过 **Server-Sent Events(SSE)** 向客户端流式推送(`/event`、`/global/event`)。DeepWiki 将其记为 "Event Bus and Sync Architecture"。TUI 还能被**远程驱动**(`/tui/control/*`:追加 prompt、提交、打开 dialog)。
- **状态 / 记忆持久化**:会话状态经 **Drizzle ORM**(`#db` alias)落库持久化;compaction 不做物理删除而是打时间戳(见 §5)。
- **agent 循环核心**:**`SessionPrompt.loop()`** 编排整个 agent 处理,内部调 `Provider.getModel()` 走 AI SDK,`Tool.execute()` 执行工具,每步经权限门控。
- **工具层**:一组内置工具(§5)+ **MCP servers** + 自定义工具;含 **LSP 集成**(实验性)。
- **角色 / agent**:内置 primary agent(build / plan)+ 内置 subagent(general / explore / scout),可自定义(§5)。
- **沙箱**:**无内置强隔离沙箱**——安全边界靠**权限系统**(allow/ask/deny)而非容器/VM(见 §5、§6)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 最重要一节

一个用户请求实际流经的回路(以 TUI 为例):

1. **启动**:`opencode` 拉起两个进程——Go TUI(client)+ Bun/TS server。TUI 通过 HTTP + SSE 连 server(默认 `:4096`)。首次进项目会用/生成 `AGENTS.md`(项目根)作为长期项目上下文。
2. **输入**:用户在 TUI 里打 prompt(可 `@` fuzzy 引用文件、拖拽贴图片)。当前 **primary agent**(默认 **build**,Tab 切到 **plan**)决定权限画像。TUI 把 prompt 经 HTTP POST 到 server 的 session/message 端点。
3. **进入 agent 循环 `SessionPrompt.loop()`**:
   a. server 组装消息(系统 prompt + AGENTS.md + 历史 + 本轮 user)。
   b. `Provider.getModel()` 拿到目标模型(provider/model-id),经 **Vercel AI SDK** 发起**流式** completion。
   c. 模型返回文本增量或 **tool call**;增量经 SSE 实时推回 TUI 渲染。
4. **工具执行(带权限门控)**:模型发起 tool call → 命中**权限系统**。
   - `build` agent:多数工具 `allow`,直接 `Tool.execute()`。
   - `plan` agent:`edit` 与 `bash` 默认 `ask`,弹权限询问(可对命令做 glob 匹配,如 `"git *": "ask"`),用户批准后才执行。
   - 工具结果(文件内容、bash 输出、grep 命中、LSP 诊断……)作为 tool result 回填进对话。
5. **迭代**:带着工具结果**再次进循环**(回到 3a),模型基于新信息继续下一步。这个"模型↔工具"往返一直转,直到模型给出无 tool call 的最终文本,或触达 agent 配置的 `steps`(最大 agentic 迭代数)上限。
6. **子 agent 分叉(需要时)**:primary agent 通过 **task 工具**把子任务派给 subagent(general / explore / scout,或用户 `@general …` 手动派)。子 agent 有独立的工具/权限画像,跑自己的 loop,把结果汇报回 primary,**主对话上下文不被子任务的中间噪音污染**。
7. **上下文压力处理**:每当一条 assistant 消息完成/失败,循环调 `SessionCompaction.isOverflow()` 检测是否逼近上下文窗口。溢出则触发**自动 compaction**(生成结构化摘要 + prune 老 tool 输出,§5),然后 **replay 最后一条 user 消息**继续,用户基本无感。
8. **状态落盘 & 推送**:全程会话状态经 Drizzle 持久化;所有变化经 SSE 广播给**所有**连着的客户端(所以 desktop / 第二个终端能看到同一 session 实时更新)。
9. **回退**:`/undo`、`/redo` 可回滚 agent 做的改动并复原原始消息,支持迭代式返工。

> 讲课要点:与"一个进程里跑循环"的简单 agent 不同,OpenCode 把 **loop 放进一个长驻 server**,客户端只是薄壳。这带来两个后果:(a) 同一 session 可被多客户端/远程/CI 同时观测和驱动;(b) session fork——子 session 继承父的**已压缩历史**作为全新对话起点(需 v2 server)。

---

## 5. harness 层设计

- **上下文 / 记忆管理**:
  - **项目记忆**:`AGENTS.md`(项目根)承载代码库约定/长期上下文;支持全局(`~/.config/opencode/`)与项目级(`.opencode/`)分层配置。
  - **自动 compaction(核心机制)**:
    - **溢出判定 `isOverflow`**:可用上下文 = 模型总窗口 − 预留输出 token(默认 **32,000**)− 安全缓冲(**20,000**);当前 token 超 `usable` 即溢出。
    - **摘要生成**:溢出时排入 `CompactionPart`,用结构化 **SUMMARY_TEMPLATE**(Goal / Constraints / Progress / Key Decisions / Next Steps / Critical Context)由专门的 agent loop 生成摘要;上下文吃紧时按模型能力剥离图片/PDF 等媒体附件(`MessageV2.toModelMessages` 过滤,转成 `[Attached image/…: filename]` 占位符)。
    - **tool 输出剪枝 `SessionCompaction.prune`**:从后向前扫描;保护最后 2 轮(`DEFAULT_TAIL_TURNS`);仅当 tool 输出总量超 **40,000** token(`PRUNE_PROTECT`)且可剪量≥**20,000**(`PRUNE_MINIMUM`)才剪;`skill` 等工具**永不剪**以保关键能力状态。**剪枝不物理删除**——给老消息盖 `compacted` 时间戳令其在后续请求中"隐形",数据仍留库。
    - **失败兜底**:compaction 本身失败则挂 `ContextOverflowError` 到 assistant 消息并**终止本轮 prompt loop**(不可恢复态)。
    - **可扩展点**:`experimental.session.compacting` hook 在生成续写摘要前触发,可注入默认摘要 prompt 抓不到的领域上下文。
- **工具接口(内置工具)**:`bash`、`read`、`write`、`edit`(精确字符串替换)、`grep`(正则)、`glob`(`**/*.js` 之类)、`list`、`apply_patch`、`lsp`(实验:definition/references/hover/call hierarchy)、`todowrite`(多步任务待办)、`webfetch`、`websearch`(走 Exa,需 `OPENCODE_ENABLE_EXA`)、`skill`(加载 `SKILL.md`)、`question`(执行中向用户提问,可带预设选项)、`task`(派子 agent)。可加**自定义工具**与 **MCP servers**(接外部工具/数据库/API)。
- **规划**:**Plan/Build 双 agent**。**plan** 默认对 `edit`/`bash` 设 `ask`,只读分析、给实现方案不动文件;**Tab** 切到 **build** 执行。这是"先审后改"的显式两段式。
- **多 agent 交接(hand-off)**:primary ↔ subagent 经 **task 工具**;subagent 分工:**general**(全工具除 todo,多步/并行)、**explore**(只读探库)、**scout**(只读查外部文档/依赖)。自定义 agent 在 `opencode.json` 或 `~/.config/opencode/agents/*.md` / `.opencode/agents/*.md` 定义,可配 `mode`(primary/subagent/all)、`model`、`temperature`、`prompt`(`{file:./path}`)、`permission`、`steps`、`description`。
- **人在环(HITL)**:权限系统三态 **allow / ask / deny**,细到每工具且支持 glob(`"git *": "ask"`);`question` 工具让 agent 主动征询;`/undo`、`/redo` 事后回滚。权限 key 包括 `read/edit/glob/grep/list/bash/task/external_directory/todowrite/webfetch/websearch/lsp/skill/question/doom_loop`。
- **沙箱**:**无强隔离沙箱**——不启容器/VM,安全靠上述权限门控 + plan 模式默认收敛。跑在本机、直接操作真实文件系统与 shell,与 Claude Code 的默认取向相近。(若需隔离,常见做法是外层套容器/远程 host,如 Leafcloud 私有部署等第三方方案。)

---

## 6. 独特设计取舍(为什么有人选它)

- **provider 无关是第一原则**:75+ providers + models.dev,同一 harness 换模型。Jay V 的定位金句:*"OpenCode is not an AI product. It's a product designed to use AI."* —— 对不想被 Anthropic/OpenAI 锁定、或要跑本地/自托管模型的人有决定性吸引力。
- **client/server 而非单体 CLI**:agent loop 驻留在可远程/多客户端驱动的 server 上,天然支持 headless(CI)、desktop、IDE、脚本 SDK 同源驱动同一 session——比"一个终端进程一个循环"的形态更适合自动化与嵌入。
- **TUI 工艺**:出自 neovim/terminal.shop 一派,界面被普遍评价为干净、响应快;把终端体验当作卖点。
- **开放与可扩展**:MIT、自定义 agent / 工具 / MCP / plugin / hooks,配置分层(全局+项目),`AGENTS.md` 作为可版本化的项目约定。
- **compaction 做得细**:结构化摘要 + 阈值化剪枝 + "盖时间戳不删库",在长会话上比粗暴截断更可控。
- **代价 / 取舍**:无内置沙箱(安全靠权限,不靠隔离);Go TUI + Bun server 双语言双进程,内部实现比单体更复杂;高度依赖 Vercel AI SDK 抽象(受其能力边界约束);变现绑 OpenCode Zen 是可选而非强制,但也是其商业动机所在。

---

## 7. 采用度信号

- **GitHub star**:`anomalyco/opencode`(原 `sst/opencode`)**约 182k stars、22.5k forks、830 releases,最新 v1.17.13(2026-07-01)**——数据取自 2026-07 抓取的仓库页。
  - 时间线可交叉印证增长:2025 年内 ~50k stars / 500 contributors(发布后 5 个月,TFN);2026-05 前后媒体记为 160k+;2026-07 仓库页 182k。**贡献者精确数当日页面加载失败,未取到确切数字(二手来源称 ~900 contributors,未在官方页面核实)。**
- **月活**:TFN 记 2025 年发布后 5 个月内 **~650,000 MAU**;更晚的营销材料称 "7.5M developers/月"——**后者仅见二手/营销口径,未在一手来源核实,标注为存疑**。
- **企业用户**:TFN 点名 **Cloudflare** 为企业客户(一手报道口径)。其余"知名用户"清单**未找到可靠公开数据**。
- **变现势头**:OpenCode Zen 托管模型据 TFN 带来 "several million dollars in annualized revenue"(二手报道)。
- **母体信誉**:同团队的 SST(~25k stars)、OpenNext、OpenAuth、OpenTUI 等开源项目背书。

> 采用度断言中,凡涉及月活/收入/贡献者精确数的,均为**二手或营销口径**,已逐条标注;唯 GitHub 仓库计数(182k/22.5k/830/v1.17.13)与 Cloudflare 客户为相对可靠口径。

---

## 8. 来源

1. 官方站点(定位/接口/OpenCode Zen):https://opencode.ai/ 与文档 https://opencode.ai/docs/
2. GitHub 仓库(license / stars / release / 代码构成):https://github.com/anomalyco/opencode
3. 官方 agents 文档(primary/subagent、权限 key、agent 配置):https://opencode.ai/docs/agents/
4. 官方 server 文档(`opencode serve`、端口、OpenAPI、SSE、TUI 远控):https://opencode.ai/docs/server/
5. 官方 tools 文档(内置工具、LSP、MCP):https://opencode.ai/docs/tools/
6. DeepWiki 架构逆向(`SessionPrompt.loop`、Hono/Bun、Drizzle、事件总线):https://deepwiki.com/sst/opencode 与 compaction 细节 https://deepwiki.com/sst/opencode/2.4-context-management-and-compaction
7. TechFundingNews 背景报道(创始人、发布日期、MAU/Cloudflare/Zen 收入):https://techfundingnews.com/opencode-the-background-story-on-the-most-popular-open-source-coding-agent-in-the-world/
8. 分裂脉络(Charm/Crush、Hoxha、Go→TS 重写,二手综述)+ Dax 迁 org 推文:https://finance.biggo.com/news/202507310715_Charm_Crush_AI_Coding_Agent 与 https://x.com/thdxr/status/2007199285251842478
