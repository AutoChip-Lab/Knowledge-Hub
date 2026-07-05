# Agent 与 Agent Harness · 第 ㉑ 篇:拆解 · 编码 Agent 群像(终端 CLI 与云端自主派)

> 「Agent 与 Agent Harness」学习系列第 ㉑ 篇 · 案例拆解板块。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ Agent Harness → ⑫–㉘ 主流 Agent 与 Harness 拆解(**本篇**)→ ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:除了 Claude Code / Codex,还有一整片「编码 agent」的野生地带

拆 Claude Code、Codex、Cursor、Aider 的那几篇,画的是「明星产品」——大厂自家模型、自家 harness、紧紧绑在一起卖。但你要是真在 2026 年这个时点去 GitHub 上翻一圈,会发现另一整片野生地带:一堆**不绑任何一家模型**的编码 agent,有的开源到能自己改,有的干脆是一个「你派任务、它在云上跑」的托管服务。

这一片地带里,两股力量正在角力:

```
        编码 agent 的两个坐标轴

        provider 绑定 ◀──────────────────────▶ provider 无关
                                              (换模型不换 harness)

    在  ┌──────────────────┬──────────────────┐
    本  │  Claude Code      │  OpenCode        │
    地  │  Codex CLI        │  Goose           │◀── 本章上半场:开源终端 CLI
    跑  │  (⑫⑬,自家模型)   │  (MIT / Apache)  │
    ────┼──────────────────┼──────────────────┤
    在  │  Codex Cloud      │  Warp / Oz       │
    云  │  Devin            │  Factory Droids  │◀── 本章下半场:云端长跑自主派
    上  │  (⑬⑯)            │  Sourcegraph Amp │
    跑  └──────────────────┴──────────────────┘
```

左半边(自家模型绑定)前面几篇拆过了。**这一篇拆右半边**——那些「模型无关」的编码 agent,以及它们里面那批把 agent 推到云上、事件触发、后台长跑的自主派。

具体分两场:上半场**深拆**两个开源终端 CLI——**OpenCode**(TypeScript,client/server 架构)和 **Goose**(Rust,MCP 原生);下半场**群像横扫**三个云端自主派——**Warp**(从终端长出来的 ADE)、**Sourcegraph Amp**(多模型分角色编排)、**Factory Droids**(企业级 SDLC 平台)。

> 读这一篇的正确姿势:**别把它们当成「Claude Code 的开源平替」。** 它们赌的是一件 Claude Code 不赌的事——「模型是会换的商品,harness 才是护城河」。谁做对了这件事,谁就能活过下一次模型换代。

---

## 1. 这一类到底是什么、边界在哪、为什么值得单独一章

先把这一章圈的范围用一句话钉死:

> **它们是「不绑定单一模型厂商」的编码 agent——你直接付钱给模型 vendor(或自带 key、跑本地模型),harness 只是那层「把模型接到真实动作」的骨架,可以随时换模型不换 harness。**

这句话的每个词都在划界:

- **不绑定单一模型厂商(provider 无关 / model-agnostic)**:这是这一类的**第一原则**。Claude Code 深度绑 Anthropic、Codex 深度绑 OpenAI;而 OpenCode 号称支持 75+ providers、Goose 支持 15+、Warp 支持 20+ 模型、Amp 甚至把不同模型分派到不同角色。换模型对它们是配置项,不是重写。OpenCode 的 CEO Jay V 有句定位金句把这层意思说穿了:

> 💡「OpenCode 不是一个 AI 产品,它是一个**为使用 AI 而设计**的产品。」(*"OpenCode is not an AI product. It's a product designed to use AI."*)——模型是别人的、会换的;它做的是外面那层骨架。

- **编码 agent(coding agent),不是补全插件、不是框架**:它们都是「完整的 harness + 运行时」——自带 agent loop、工具层、上下文/记忆管理、权限门控、子 agent 编排。这和 LangGraph 那种「给你搭 agent 用的库」(讲通用框架的那篇)不同:它们是**开箱能用的产品**,不是让你造 agent 的乐高。
- **两种形态并存**:上半场的 OpenCode / Goose 是**本地跑的终端 CLI**(你的机器、你的 shell);下半场的 Warp / Amp / Droids 把 agent 推到**云上长跑**——事件触发、定时调度、并行跑多个、开完 PR 通知你。前者是「陪跑型的开源版」,后者一只脚(甚至两只脚)踏进了讲自主 SWE 的那篇的「长跑型」领地。

**为什么值得单独一章?** 因为它们共同回答了一个前面几篇没正面回答的问题:**当你不想被任何一家模型公司锁死,agent 该长成什么样?** 答案不是「少一点功能的 Claude Code」,而是一套围绕「模型可替换」重新组织的架构——client/server 拆分、MCP 原生工具、多模型分角色、云端编排。这套架构本身就是一堂课。

> 一句话:**这一章讲的不是「更便宜的编码 agent」,是「押注 harness 而非模型」的一整个流派。**

---

## 2. 一次任务在这类系统里怎么流动

挑两个代表走一遍生命周期——一个本地(OpenCode)、一个云端(Warp/Oz)——你就能看清「provider 无关的本地 CLI」和「云端自主派」这两种形态在同一件事上的分野。

设想同一句需求:

> 「帮我在这个仓库里加一个输入校验,并跑测试确认没坏。」

**形态 A:本地终端 CLI(以 OpenCode 为例)**

```
  你在终端敲 `opencode`
     │
     ▼
① 起两个进程   Go 写的 TUI(前端) + Bun/TS 写的 server(核心逻辑)
     │         TUI 经 HTTP+SSE 连 server(默认 127.0.0.1:4096)
     ▼         首次进项目读/建 AGENTS.md 作为长期项目上下文
② 你打 prompt   当前 primary agent 决定权限画像(build 放手 / plan 只读)
     │         TUI 把 prompt POST 给 server
     ▼
③ 进 SessionPrompt.loop()   组装消息 → Provider.getModel() 经 Vercel AI SDK 发流式请求
     │                       模型吐文本增量或 tool call,经 SSE 实时推回 TUI
     ▼
④ 工具执行(带权限门控)   tool call 命中权限系统:
     │        build 下多数工具 allow 直接跑;plan 下 edit/bash 默认 ask 弹窗
     │        工具结果(文件内容 / bash 输出 / grep 命中 / LSP 诊断)回填对话
     ▼
⑤ 迭代        带着工具结果再进循环(回到③),转到无 tool call 的最终文本
     │        └─ 上下文逼近窗口 → isOverflow 触发自动 compaction(摘要+剪枝),几乎无感
     ▼
⑥ 收尾        改动落盘(Drizzle 持久化)、经 SSE 广播给所有客户端;`/undo` 可回滚
```

**形态 B:云端自主派(以 Warp 的 Oz 为例)**

```
  触发            不是「你敲命令」,而是 Slack 消息 / GitHub issue / cron / CI step 触发
     │
     ▼
① Oz 接管生命周期   在一个 Environment(Docker 容器 + repo + 镜像 + 启动命令)里 provision
     │
     ▼
② 分诊 + 规划   Oz 对 issue 做 triage、提澄清问题、生成实现计划(planning mode 可用 reasoning 模型)
     │
     ▼
③ 执行循环      agent 在容器里调工具(读写文件、native diff 编辑、跑命令),推理经 Warp 控制面(ZDR)
     │        └─ 密钥运行时注入,不落库到 LLM
     ▼
④ 结果审计      每次 run 留持久记录:status、transcript(prompt/plan/commands/logs)、artifact(PR/branch)
     │
     ▼
⑤ 交付 + 通知   开 PR、发 in-app/系统通知;你只在「进」(派任务)和「出」(review PR)两端出现
```

两条流程一对比,分野一目了然:

- **A 把 loop 放进一个本地长驻 server**,你全程能看、能随时 `/undo`、`plan` 模式还能逼它「先审后改」。人是**陪跑**的。
- **B 把 loop 推到云端容器里事件触发地跑**,你不在现场——它自己 triage、自己规划、自己开 PR。人只在两端。这已经是讲自主 SWE 那篇里「长跑型」的姿势了。

> 一句话:**同样是「provider 无关的编码 agent」,本地 CLI 卖的是「你的机器、你说了算、随时打断」,云端派卖的是「派出去、它自己跑、开完 PR 叫你」。** 这一章的五个系统,就散布在这两极之间。

---

## 3. 拆开看

上半场把 OpenCode、Goose 分别搬上手术台(各占一个 `### 3.x`,一步步讲清它的控制回路与核心组件);下半场用一个「群像横扫」子节覆盖 Warp、Amp、Droids。

### 3.1 OpenCode(Anomaly/前 SST):灵魂是「client/server 拆分 + provider 无关」

**它是谁**:OpenCode 是一个 **MIT 许可**的开源终端编码 agent,由 **Anomaly**(即 SST / Serverless Stack 团队,核心人物 Jay V、Frank Wang、Dax Raad、Adam Elmore)出品,2025-06-19 用 **TypeScript + Bun** 重写后公开发布。截至 2026 年中,仓库 `anomalyco/opencode`(原 `sst/opencode` 现重定向)约 **182k stars**、最新 release **v1.17.13**(2026-07-01),**高度活跃**、未停更未被收购。

> ⚠️ 命名雷区(讲课必须先厘清):"OpenCode" 这名字在 2024–2025 年间指过**两个项目**。最早是 Kujtim Hoxha 用 **Go** 写的版本;后来 Charm 公司(做 Bubbletea 终端 UI 库那家)介入雇了 Hoxha,与持有 `opencode.ai` 域名的一方发生品牌之争,**争议以 Charm 把自己那版改名为 `Crush` 收场**。**如今说 "OpenCode" 几乎都指这个 TypeScript 重写版**——本节讲的就是它。(分裂细节来自二手技术媒体转述,不做谁对谁错的裁决。)

它最值得记住的架构决定,不是某个工具,而是一句**「agent loop 不跑在 CLI 进程里,跑在一个本地 server 里」**。

**先给直觉**:你想过没有——为什么一个「终端工具」要拆成 client 和 server?最朴素的编码 agent 就是「一个进程里跑一个循环」,你敲命令、它在同一个进程里想、干、答。OpenCode 偏不:它把核心 agent 逻辑塞进一个 **Bun/TypeScript 写的 server**(启动命令 `opencode serve`,默认监听 `127.0.0.1:4096`,HTTP 框架用 **Hono**,还暴露 OpenAPI 3.1 规范),而 TUI(**Go 写的**,出自 neovim / terminal.shop 那一派,做工干净)只是**一个连 server 的薄客户端**。你运行 `opencode` 时,它其实同时起了 TUI + server 两个进程。

为什么这么费劲?因为一旦 loop 住在一个能被远程访问的 server 里,你就白得了三件事:**同一个 session 可被多客户端同时观测和驱动**(TUI、desktop app、VS Code 扩展、GitHub Actions / GitLab CI、任意调 HTTP/SSE 的脚本都是它的客户端,server 经 **Server-Sent Events(SSE)** 把每步变化广播给所有客户端——所以第二个终端能实时看到同一 session 在动);**天然支持 headless(CI)与嵌入**(CI 里没有终端,但有 HTTP);**TUI 甚至能被远程驱动**(`/tui/control/*`:追加 prompt、提交、打开 dialog)。

它的循环核心叫 **`SessionPrompt.loop()`**,一圈是:server 组装消息(系统 prompt + AGENTS.md + 历史 + 本轮 user)→ `Provider.getModel()` 拿到目标模型、经 **Vercel AI SDK** 发流式请求 → 模型吐文本增量或 tool call → tool call 命中**权限系统**(三态 allow / ask / deny,可对命令 glob 匹配如 `"git *": "ask"`)→ `Tool.execute()` 跑工具 → 结果回填 → 再进循环。

provider 无关的**技术支点**就在这:模型调用全部经 Vercel AI SDK 抽象(`ai` + `@ai-sdk/*`),支持 75+ providers,模型元数据来自团队自维护的 **models.dev**;拿到模型后由 SDK 统一走 tool-calling / streaming 协议,所以**换模型不换 harness**。它还提供托管的 **OpenCode Zen**(curated 模型入口,低摩擦上手,也是主要变现来源)。

其余组件对着生命周期扫一遍:

- **工具层**:`bash`、`read`、`write`、`edit`(精确字符串替换)、`grep`、`glob`、`list`、`apply_patch`、`lsp`(实验:definition / references / hover)、`todowrite`、`webfetch`、`websearch`、`skill`(加载 `SKILL.md`)、`question`(执行中主动向你提问)、`task`(派子 agent);另可加自定义工具与 **MCP servers**。
- **Plan/Build 双 agent(显式两段式)**:**plan** 默认对 `edit`/`bash` 设 `ask`——只读分析、给方案不动文件;按 **Tab** 切到 **build** 才执行。「先审后改」摆到台面上。
- **子 agent**:primary 经 `task` 工具把子任务派给内置 subagent——**general**(全工具)、**explore**(只读探库)、**scout**(只读查外部文档),子 agent 跑自己的 loop、只回摘要,**主对话不被子任务的中间噪音污染**。
- **上下文压缩(核心机制)**:每条 assistant 消息完成时调 `SessionCompaction.isOverflow()`——可用上下文 = 模型总窗口 − 预留输出(默认 32,000)− 安全缓冲(20,000)。溢出则用结构化 **SUMMARY_TEMPLATE**(Goal / Constraints / Progress / Key Decisions / Next Steps / Critical Context)生成摘要,并从后往前**剪枝老 tool 输出**(保护最后 2 轮,`skill` 永不剪);关键设计:**剪枝不物理删除**——给老消息盖 `compacted` 时间戳令其在后续请求里「隐形」,数据仍留库。这和讲 Claude Code 那篇的「只追加会话」殊途同归:拿最笨的存储换最强的可恢复性。
- **沙箱**:**无内置强隔离沙箱**——安全边界靠权限系统 + plan 模式默认收敛,而非容器/VM;它直接操作你的真实文件系统与 shell,这点和 Claude Code 的默认取向相近。

> 💡 OpenCode 最该记住的一句:**它把「一个终端进程一个循环」升级成「一个可远程、可多客户端、可 headless 的本地 agent 服务器」——loop 从此不属于任何一个终端窗口。**

### 3.2 Goose(Block → AAIF):灵魂是「MCP 原生 + harness 即护城河」

**它是谁**:Goose(曾名 "codename goose")是一个 **Apache-2.0** 的开源 AI agent 框架/运行时,由 **Block, Inc.**(Square / Cash App / Afterpay 母公司)的开源办公室于 2025-01-28 首发。**本地优先**、模型无关,有 CLI + 桌面 app + 可嵌入 API 三个入口。截至 2026 年中约 **50.6k stars**、最新 release **v1.41.0**(2026-07-03),活跃且高频发版。

> 一个关键治理事件(不是停更,是「换了个家」):**Block 把 Goose 捐给了 Linux Foundation 新成立的 Agentic AI Foundation(AAIF)**——与 Anthropic 的 **MCP**、OpenAI 的 **AGENTS.md** 一同作为 AAIF 创始项目(官方新闻稿 2025-12-09;仓库随后从 `block/goose` 迁到 `aaif-goose/goose`,官方博客《goose has a new home》2026-04-07)。AAIF 铂金会员含 AWS、Anthropic、Google、Microsoft、OpenAI。意思是:Goose 现在是一块**中立的行业基础设施**,不再只属于 Block。

Goose 有别于 OpenCode 的地方,在于它把「工具」这件事外包得更彻底——**所有能力都走 MCP**。

**先给直觉**:OpenCode 有一批内置工具(bash / read / grep …),再额外接 MCP。Goose 反过来——它**几乎没有「内置工具」这个概念**,连文件操作、shell 执行、GUI 自动化、持久 memory 都是以 MCP server(`goose-mcp` 里的一组)的形式挂上来的;任何 MCP server 即插即用就成了它的一项能力(官方称可连 70+ extensions)。这不是巧合:**Goose 是公开可用的第一个 MCP client,并把自己定位成 MCP 的参考实现**——MCP server 开发者拿 Goose 做兼容性测试。可以说 Goose 和 MCP 是同一个问题的两面。

它的架构是 **Rust 为主的 Cargo workspace + TypeScript/Electron 桌面 app**(GitHub 语言占比 Rust ~66.8% / TS ~27.3%)。点名真实构件:

| 组件 | 角色 |
|---|---|
| **`goose`(core library crate)** | 中枢:Agent Core 编排、LLM provider 抽象、extension 生命周期、**SQLite 会话持久化**、recipe 模板执行 |
| **`goose-cli`(二进制 `goose`)** | 交互式 session、recipe 执行、provider 配置——终端入口 |
| **`goose-server`(二进制 `goosed`)** | 基于 **Axum** 的 HTTP + WebSocket 后端,通常由桌面 app 拉起 |
| **`goose-mcp`** | 自带的内置 MCP servers:文件操作、shell、GUI 自动化(computer-controller)、持久 memory |
| **Electron 桌面 app(TS)** | 跨平台 GUI,前端连 `goosed` |

它的控制回路(ReAct 风格,官方口径「core 本身极小,就是一个交互 loop 加上下文管理」):三个入口(CLI / 桌面走 `goosed` 的 HTTP+WS / API)**都汇聚到 core library** → 建立/加载 session(元数据 + 历史 + 工具日志,存 SQLite),把已启用的 extensions(MCP servers)注册进 Extension Manager、聚合它们的 tool schema → core 组装系统提示 + AGENTS.md + 历史 + 工具清单发一次模型调用 → 模型返回文本或 tool call → **权限系统按 mode 决定放不放行** → 批准后经 Tool Execution Pipeline 派给对应 MCP extension → 结果回灌、再调 LLM,`plan → call tools → evaluate → repeat` 转到任务完成;上下文逼近预算时,Context Management 层做 compaction。

它的 harness 层有几个和 OpenCode 不同的重注:

- **权限系统四档模式(比三态更细)**:`Completely Autonomous`(直接执行,默认)/ `Manual Approval`(逐个确认)/ `Smart Approval`(风险分级自动放低风险、拦高风险)/ `Chat Only`(根本不执行工具);工具级还能覆写 Always / Ask / Never。安全上,Permission System 内含 **prompt-injection 检测**,Block 工程团队公开写过对自家 agent 做 red-team 的实践。
- **Recipe(Block 内部规模化的关键机制)**:一份 YAML,字段含 `params`(带类型的输入变量——等于**把 recipe 变成一个「函数」**)/ `extensions`(本次运行动态挂载、跑完丢弃的 MCP servers)/ `prompt`(编号步骤,充当**规划骨架**,让 agent 不必每次重新发明流程)。它可提交进仓库、和被操作的代码放一起,`goose recipe run review-pr --params pr_url=...` 就能跑。**这是它从工程扩散到销售/设计/产品岗位的机制**——一份 30 行 YAML 就能让「一个 CLI」服务全公司不同岗位。
- **多模型分工**:`GOOSE_LEAD_MODEL` 让「强推理模型做规划 + 快模型做执行」;`GOOSE_PLANNER_*` 把规划与执行拆到不同模型(例:GPT 规划、Claude 执行)。
- **子 agent**:autonomous 模式下可用自然语言临时召唤 subagent,可**顺序或并行**,默认继承主 session 全部 extensions、可按需收窄;**硬约束**:subagent 不能再生 subagent(防无限递归)、默认 5 分钟超时。另有 subrecipe(预写好的 YAML 工作流,跑在隔离 session、无共享状态)。
- **沙箱**:和 OpenCode 一样——**未见内置强隔离 OS 级沙箱**,主要靠权限闸门 +(可选)subagent 的工具收窄;要强隔离得自建环境。

Goose 背后有一句被广泛引用的哲学,把这一整章的赌注说得最直白:

> 💡「agent 本身已经成熟到可以是**商品**了;**harness 才是你的竞争优势**。」(*"the agent is mature enough to be the commodity. The harness is your competitive advantage."*)——core loop 刻意做薄、做成通用件,能力全靠 extension / recipe / skill 组合。

采用度上有一个特别硬的信号:**约 60% 的 ~12,000 名 Block 员工每周用 Goose**,覆盖工程、销售、设计、产品、客户成功等 15 种岗位——这是「dogfooding 到全公司」的强证据。(60% / 12,000 为 Block 自述口径,无独立第三方核实。)

> Goose 最该记住的一句:**它把「工具即 MCP、流程即 recipe」推到极致——core 极小、能力全外置。** 想理解「为什么有人说 harness 是护城河」,Goose 是最纯的样本。

### 3.3 群像横扫:云端自主派三家(Warp / Sourcegraph Amp / Factory Droids)

上面两家是「你的机器、你说了算」的开源终端 CLI。下面三家把重心挪到了**云端长跑 + 企业级**——它们也大多是 provider 无关的,但赌的东西各不相同。这里每家 2–4 句点出定位、独特点、开源闭源与状态,细节进 §6 的对比表。

**Warp —— 「从终端长出来的智能体开发环境(ADE)」**
Warp(公司创始人兼 CEO Zach Lloyd,前 Google Principal Engineer)不是一个 CLI,而是一个把「终端 + 编码 + agent 管理 + 团队知识库(Drive)」四合一的桌面应用,并配一个云端编排平台 **Oz**(2026-02 发布)——用同一套原语(触发 / 编排 / 执行 / 密钥注入 / 结果审计)把 agent 从「你在旁边手动驾驭」平滑过渡到「Slack / GitHub / cron / CI 事件触发、在 Docker 容器里后台并行跑」。它模型无关(2025 年底支持 20+ 模型),并有一个不锁死自家 agent 的设计:**同一个 UI 里也能直接跑第三方 CLI agent**(Claude Code / Codex / Gemini CLI / OpenCode)。企业向的**控制面/执行面分离**(推理走 Warp 服务器、源码与命令执行可留在你自有网络,ZDR + 仅出站网络)是它的合规卖点。**状态**:活跃;2026-04-28 **开源客户端**(双许可:UI 框架 crates 为 MIT,其余 AGPL-3.0;云端 Drive/Oz 仍闭源),OpenAI 成为其开源仓库旗舰赞助商,用 GPT 模型驱动 agent 在公开仓库自我迭代(triage → 提问 → 计划 → 写码 → 开 PR,全程公开)。

**Sourcegraph Amp —— 「多模型分角色编排 + 显式 Oracle『第二意见』」**
Amp 由 Sourcegraph(以全局代码搜索著称)于 2025-05 推出,**2025-12-02 拆分成独立公司**(Amp Frontier Corporation,CEO Quinn Slack、lead engineer Thorsten Ball),是 Sourcegraph 上一代助手 Cody 的 agentic 继任者(Cody Free/Pro 已停,官方把个人开发者引导到 Amp)。它的招牌是**把不同模型分派到不同角色**:主 agent(选主动性强的模型执行)+ **Oracle**(一个把更强推理模型当「资深工程师」的只读工具,用来做规划、架构评审、难 bug 复盘)+ 检索子 agent(**codebase_search_agent** 本地概念检索、**Librarian** 跨公开/私有 GitHub 检索)。两个反直觉的设计:一是**默认放手不逐工具征询批准**("Amp does not ask for approval before running tools");二是**不用 embeddings/RAG**,而是让 LLM 在循环里跑 grep/glob/read——官方立场是「代码库每次 commit 都在变,冻结的 embedding 不如 agent 实时驱动 ripgrep」(Thorsten Ball 名文《How to build an agent》的核心论点)。子 agent 各自独立 context、彼此不通信、只回摘要,刻意隔离以防上下文污染。**状态**:活跃、周更;**核心 agent 闭源商业**(GitHub 上 `ampcode` org 只有周边生态,agent 本体不开源),用 GitHub star 衡量它的采用度不适用;有 ad-supported 的 "Amp Free" 层与按量透传的付费 "Smart" 层。(官方称「已盈利」,无公开财报佐证。)

**Factory Droids —— 「企业级 agent-native SDLC 平台」**
Factory(创始人 Matan Grinberg、Eno Reyes)的 Droids 面向**完整软件开发生命周期**(工单 → 编码/迁移 → 测试 → 代码审查 → 上线 → 值班/RCA),核心交付物是终端里的 **Droid CLI**(命令 `droid`,交互 REPL + headless `droid exec`),但可跨 CLI / Web / Slack / Jira / Mobile 使用。它模型无关到「会话中途能换模、支持 BYOK / OpenAI-compatible 端点」,还自带一组托管的开放权重模型 "Droid Core" 与自动 model routing。区别于个人向 CLI 的,是它**主打企业与治理**:私有/自托管/air-gapped、SSO、审计轨迹、合规认证(ISO 42001 / SOC 2 等),提交前有 **DroidShield**(实时静态分析查漏洞/IP 泄露),并用 git **worktree** 与云端 **Droid Computers** 做隔离与长跑;多 agent 靠 **Missions**(worker + validator 双角色并行,从 Mission Control 恢复)。**状态**:活跃、势头强、**闭源专有**(公开仓库 `factory-ai/factory` 只含文档、约 1,006 stars,不是 CLI 源码);资本层面 2026-04 完成 $150M C 轮、估值 **$1.5B**;它反复讲的差异化叙事是「同样用 Claude Opus / GPT-5,Droid 的 scaffold 把 Terminal-Bench 分数显著抬高」(官方自报,2025-12 报 63.1%,注意利益相关)。

> 三家的共同点是把 agent 推向**云端、事件触发、企业级**,但赌注不同:**Warp 赌「终端就是控制面」、Amp 赌「多模型分角色 + grep-in-a-loop」、Droids 赌「治理与合规才是企业买单的理由」。** 它们和讲自主 SWE 那篇的 Devin/OpenHands 是近亲——都在回答「人不在场怎么让 agent 长跑」,只是各自站在了「provider 无关 + 编码专精」这个坐标上。

---

## 4. 它们与众不同的设计决策与取舍

退一步看,本章五家其实在共同验证一句话——**「模型是会换的商品,harness 才是护城河」**——但下注的位置各不相同。

- **OpenCode 押「client/server 拆分」**:赌注是「agent loop 不该被锁在一个终端窗口里」。把 loop 放进一个可远程、可多客户端、可 headless 的本地 server。**收益**:同一 session 可被 TUI/desktop/IDE/CI/脚本同源驱动,天然适合自动化与嵌入,SSE 实时同步。**代价**:Go TUI + Bun server 双语言双进程,内部比单体复杂;重度依赖 Vercel AI SDK 抽象,受其能力边界约束。
- **Goose 押「MCP 原生 + core 极薄」**:赌注是「能力应该全部外置成 MCP 与 recipe,core 做成通用商品」。**收益**:任何 MCP server 即插即用、recipe 让一个 CLI 服务全公司、入 AAIF 后是中立基础设施。**代价**:偏工程/运行时、非消费级打磨;本地大模型的 tool-calling 要靠 Tool Shim 兜底,效果不及原生工具模型。
- **Warp 押「终端即控制面 + 本地/云同一编排层」**:赌注是「重命令行的工程师不想换 IDE,而团队需要把 agent 推到云上后台跑」。**收益**:一个 UI 同时容纳内置 agent 与外部 CLI agent,Oz 让「手动驾驭」平滑升到「事件触发的自主执行」,控制面/执行面分离对企业合规友好。**代价**:核心云服务(Drive、Oz 云托管)仍闭源计费;推理默认经 Warp 服务器。
- **Amp 押「多模型分角色 + 激进上下文隔离 + 不用 RAG」**:赌注是「一个模型什么都干不如让最强推理当 Oracle、执行力强的当主 agent、便宜快的当检索工具」。**收益**:大代码库上难 bug/架构错误被压得更狠,子 agent 隔离让主线上下文干净。**代价**:默认放手带来的失控/prompt-injection 风险自管,按量透传成本可能高。
- **Droids 押「企业治理才是买点」**:赌注是「个人爽感不值钱,能过审计、能私有部署、能扫 IP 泄露才值钱」。**收益**:私有/air-gapped、SSO、DroidShield、Missions 的 worker/validator 双角色。**代价**:闭源专有、企业定价、核心 CLI 不可自审源码,个人/开源友好度不如开源 CLI。

一句话把五条路对齐:**OpenCode 改造 loop 的「归属」(从终端窗口搬进 server),Goose 改造能力的「来源」(全部走 MCP/recipe),Warp 改造 agent 的「工作台」(终端即控制面),Amp 改造模型的「分工」(一个角色一个模型),Droids 改造交付的「合规」(企业级治理)。** 五者不冲突——你完全能想象一个产品同时借鉴 client/server、MCP 原生、多模型分角色和云端治理。

> 💡 一个贯穿全章的反直觉:**这五家没有一家靠「训一个更强的模型」赢。** 它们全部**不训基础模型**,全部押注「模型可替换、harness 是差异化」——这是讲「什么是 harness」那篇那句「harness 比模型更重要」在真实产品上最集中的一次兑现,因为它们把「模型无关」直接写进了第一原则。

---

## 5. 局限与坑

这一流派最容易被误读成「Claude Code 的免费/开源平替」,也最容易踩坑。诚实列几条(机器会渲染成⚠️警示卡):

1. **「provider 无关」不等于「换任何模型效果都一样好」。** 换模型是配置项没错,但 harness 里那些 system prompt、工具描述、compaction 摘要模板,往往是围绕某几个强模型调出来的;换到弱模型或本地开放权重模型上,tool-calling 可能不稳(Goose 得靠 Tool Shim 兜底,效果不及原生工具模型)。**「支持 75+ providers」是能连上,不是「75 家跑起来都一样强」。** 避坑:把「provider 无关」理解成「不被锁死的自由」,而不是「换谁都一样」;认真选模型仍是你的活。
2. **开源终端 CLI 大多没有强隔离沙箱——安全全押在权限门控上。** OpenCode 和 Goose 都**不启容器/VM**,直接操作你的真实文件系统与 shell,安全边界靠权限系统(allow/ask/deny 或四档模式)+ plan/chat 模式收敛。这意味着一条被放行的危险命令、一次 prompt injection,没有一层 OS 级隔离兜底。避坑:高风险仓库/不可信输入下,别用「完全自主」默认档;要强隔离就自己在外层套容器或远程 host——**别指望 CLI 自带**。
3. **云端自主派把「人不在场」的锅全丢给了你。** Warp/Amp/Droids 一旦事件触发后台跑,你就不在环里了。Amp 甚至**默认不逐工具征询批准**。这把讲权限那篇的问题推到极端:沙箱逃逸、危险命令、把密钥打进日志、被 issue 里的恶意指令诱导 exfiltrate 代码——没有实时的人兜底。三家都很重隔离(Warp 的 Docker + 控制面/执行面分离、Droids 的 worktree + DroidShield),但**隔离降低风险不消除风险**;给它的仓库权限、云凭证越大,爆炸半径越大。
4. **厂商自报的数字,一个都不能当「已验证事实」引用。** Warp 的「近百万开发者」「diff 接受率 96%+」「SWE-bench 75.6%」、Droids 的「Terminal-Bench 63.1%、领先 Claude Code 约 23 个百分点」、Amp 的「已盈利」——**全部是官方/创始人自述,无第三方独立核实**。尤其 benchmark 分数受模型、提示词、思考预算、评分器影响极大,横向不可比(讲评测那篇专门拆过这件事)。避坑:引用任何数字务必带「什么模型、哪个变体、什么时候、谁测的」,并标清「厂商自报」。
5. **别把「开源」和「你能完全掌控」画等号。** OpenCode 的变现绑着托管的 OpenCode Zen、Warp 开源了客户端但云端 Drive/Oz 仍闭源计费、Amp 核心 agent 干脆闭源(GitHub 上只有周边生态)。**「开源」在这一片地带是光谱,不是开关。** 避坑:选型前看清楚——开源的是「客户端/周边」还是「核心 agent」?自托管能不能脱离厂商云跑?变现钩子挂在哪?
6. **命名和归属会漂,别用旧信息选型。** "OpenCode" 历史上指过两个项目(Go 版之争以对方改名 Crush 收场);Goose 从 `block/goose` 迁到了 `aaif-goose/goose`(捐给 AAIF);Amp 从 Sourcegraph 拆分成了独立公司。**你搜到的一篇 2024 年的教程,可能指的根本不是今天这个产品。** 避坑:凡涉及仓库地址、许可、归属,以「截至 2026 年中」的官方最新页面为准,别信二手旧文。

---

## 6. 一句话记住 + 对比表

> **这一章 = 一整片「不绑单一模型厂商」的编码 agent:上半场是本地开源终端 CLI(OpenCode 押 client/server、Goose 押 MCP 原生),下半场是云端长跑自主派(Warp 押终端即控制面、Amp 押多模型分角色、Droids 押企业治理)。它们共同的赌注是同一句话——模型是会换的商品,harness 才是护城河;没有一家靠训更强的模型赢。**

五家横向对齐(数字/许可/状态均为截至 2026 年中的快照,会持续漂移):

| 系统 | 定位 | 内核(招牌机制) | 开源/闭源 | 最适合谁 | 状态(2026 中) |
|---|---|---|---|---|---|
| **OpenCode**(Anomaly/前 SST) | provider 无关的开源终端编码 agent | **client/server 拆分** + `SessionPrompt.loop()` + Vercel AI SDK(75+ providers) | 开源(MIT) | 想要多客户端/headless/CI 同源驱动、不被锁死模型的开发者 | 高度活跃,~182k★,v1.17.13 |
| **Goose**(Block → AAIF) | 本地优先、MCP 原生的开源 agent 运行时 | **MCP 原生 + Recipe**(YAML 工作流)+ 极薄 core loop | 开源(Apache-2.0) | 想自托管、想把一个 CLI 用 recipe 铺给全公司、要中立治理的团队 | 活跃,~50.6k★,v1.41.0;已入 AAIF |
| **Warp**(Zach Lloyd) | 从终端长出来的 ADE + 云编排(Oz) | **终端即控制面** + Oz 事件触发/定时/并行云 agent + 控制面/执行面分离 | 客户端开源(MIT+AGPL),云端(Drive/Oz)闭源 | 重命令行/SSH、要本地+云同一套编排、要企业合规的团队 | 活跃,客户端 2026-04 开源,OpenAI 赞助 |
| **Sourcegraph Amp**(Amp Frontier Corp) | 面向前沿模型的多模型编排编码 agent | **多模型分角色**(主 agent + Oracle + 检索子 agent)+ 不用 RAG(grep-in-a-loop) | 核心 agent 闭源商业(周边生态开源) | 啃大代码库、要「第二意见」压难 bug、接受默认放手的开发者 | 活跃周更,2025-12 从 Sourcegraph 拆分独立 |
| **Factory Droids**(Factory.ai) | 企业级 agent-native SDLC 平台 | **Droid CLI + Missions**(worker/validator)+ DroidShield + 企业治理/合规 | 闭源专有 | 要私有/air-gapped/SSO/审计、把整条 SDLC 委托给 agent 的企业 | 活跃,C 轮后估值 $1.5B |

**怎么选**:想要**开源、可 headless/多客户端、随时换模型且能嵌进 CI**,看 OpenCode;想要**自托管、MCP 原生、用 recipe 把一个 agent 铺给全公司、要中立治理**,看 Goose;想要**重终端体验、把 agent 从本地手动驾驭平滑推到云端事件触发**,看 Warp;想在**大代码库上用多模型分角色压难 bug、且能接受闭源与默认放手**,看 Amp;想要**企业级治理(私有部署、审计、合规、扫 IP 泄露)、把整条 SDLC 交给 agent**,看 Factory Droids。

对照前面几篇:讲 Claude Code / Codex 那几篇是「大厂自家模型 + 自家 harness 紧绑」的明星产品,讲自主 SWE 那篇(SWE-agent / OpenHands / Devin)是「派出去自己长跑」的极致。**这一篇补上了中间那块拼图——「不绑模型」既能做成开源本地 CLI(OpenCode / Goose),也能做成云端企业平台(Warp / Amp / Droids)。** 把「模型可替换」当第一原则,是它们和左半边那些明星产品最根本的分野。

> 👉 继续读 **融会篇:如何设计你自己的 Harness**——把前面所有拆过的系统里反复出现的那几样(loop、工具、上下文、权限、子代理、provider 无关)拼成一套可复用的设计法则。
