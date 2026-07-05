# Agent 与 Agent Harness · 第 ⑳ 篇:拆解 · 编码 Agent 群像(IDE / 编辑器派)

> 「Agent 与 Agent Harness」学习系列第 ⑳ 篇 · 案例拆解板块。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ Agent Harness → ⑫–㉘ 主流 Agent 与 Harness 拆解(**本篇**)→ ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:把 agent 塞进你天天用的那个编辑器

拆 Cursor 的那篇讲过一件事:2024 年之后,「AI 编码」这件事的战场,从「聊天窗口里贴代码」搬进了**你天天打开的那个编辑器**。而 Cursor 只是其中一条路——它 fork 了 VS Code。放大看,同一时期冒出来一大群产品,共同做一件事:**把一个能自己读代码、改文件、跑命令的 agent,装进 IDE 或编辑器的侧边栏里。**

这一篇就横扫这一整个「物种」。它和拆 Cursor 的那篇互补:Cursor 是这一派里最出名的单株,而这里我们要看清**整片森林**——从开源社区起家的 Cline、把 agent 做成 IDE 灵魂的 Windsurf,到一票各有各定位的国内外产品。

```
        「把 agent 装进编辑器」这一形态,在 agent 生态里的位置

   模型层        Claude / GPT / Gemini / Qwen / GLM …(它们几乎都不自己训)
     │
     ▼
   harness 层    ┌─────────────────────────────────────────────┐
  (本章焦点)     │  IDE / 编辑器派 coding agent                 │
                 │                                             │
                 │  VS Code 侧边栏插件   ── Cline / Roo / Kilo  │
                 │                          Continue / CodeGeeX │
                 │  VS Code / Code-OSS   ── Windsurf / Trae     │
                 │    的 fork(整个 IDE)    Qoder / Kiro / 反重力 │
                 │  原生编辑器(非 fork)── Zed                  │
                 │  企业大库 / 云 agent  ── Augment / Amazon Q   │
                 └─────────────────────────────────────────────┘
     │
     ▼
   交付形态       IDE 侧边栏 · 独立 App · CLI · 云端异步 agent
```

这一派和拆自主 SWE 的那篇(SWE-agent / OpenHands / Devin)是**两个极端**:那一派的姿势是「派出去、它自己跑、开个 PR 回来」,人只在进出两端;这一派的默认姿势是**你坐在编辑器里、边看边改、每一步都能拦住它**。当然,你会看到本章后半段的产品都在往「更自主」滑,但它们的**根**都扎在编辑器里。

> 读这一篇的正确姿势:**别记产品名,记它们各自把 agent 装进编辑器时,在「多自主 / 多可控 / 多可审计」这个三角上站在哪。** 十几家产品,本质是同一道题的十几种答卷。

---

## 1. 这一类到底是什么、边界在哪

先给一句定义:

> **「IDE / 编辑器派 coding agent」= 一个寄生在你现有编辑器(或它自己 fork 的编辑器)里、能读整个代码库、自主读改文件跑命令、但默认把每一步动作摊到你面前让你审的 agent。** 关键词四个:**寄生编辑器、看整库、自己动手、逐步可审。**

逐条拆开这四个基因,顺便划清边界:

- **寄生编辑器**:它不是一个独立跑在云上的服务,而是**长在编辑器里**——要么是 VS Code 扩展(Cline、Roo、Continue、CodeGeeX),要么直接 fork 一个编辑器把 agent 焊进去(Windsurf、Trae、Kiro、Qoder 都是 VS Code / Code-OSS 的 fork)。这决定了它天生贴着你的工作流:你打开的文件、光标位置、终端输出,它都能顺手拿到。
- **看整库**:和「补全」类工具只看当前文件不同,这一派几乎都有某种**代码库检索/索引**——Windsurf 的 Indexing Engine、Augment 的语义 Context Engine、Qoder 的 Repo Wiki。因为要做多文件改动,它必须先「看懂」这个仓库。
- **自己动手**:它有一套**工具词表**(读文件、写文件、跑终端命令、开浏览器、调 MCP),能把模型的意图变成对文件系统的真实动作——这正是「agent」区别于「聊天机器人」的地方(见讲核心循环的那篇)。
- **逐步可审**:这是它区别于自主 SWE 派最要命的一条。默认情况下,凡是「有后果的动作」(写文件、跑命令),它都**挂起来等你批准**,把改动做成 diff 让你看。人始终在环里(human-in-the-loop)。

**边界在哪?** 往上,它不是「补全工具」(那是 Copilot Tab、CodeGeeX 的 FIM 那一层,一次性生成、无多步循环);往下,它不是「通用 agent 框架」(LangGraph 那种给你拼装 agent 的库,见拆通用框架的那篇);往旁边,它也不是「派出去自己跑」的云端自主 agent(那是 Devin 那一派)。它就卡在中间:**一个有编辑器身体、以人为环、专攻代码的 agent。**

为什么值得单独一章?因为**同一个模型,装进不同编辑器 harness,体验和能力天差地别**——这正是全站反复讲的「harness 比模型重要」。这一派把这句话演绎出了十几个版本。

---

## 2. 一次任务在这类系统里怎么流动

挑两个代表走一遍生命周期,一个陪跑型(Cline),一个偏自主型(Windsurf 的 Cascade),你就摸到了这一派的骨架。

设想你丢进去一句:

> 「这个解析器遇到某种边界输入会崩,帮我定位并修了,加个测试。」

**Cline 的流动(逐步可审的典型)**:

```
  用户需求(在 Plan 模式)
     │
     ▼
① 组装上下文   PromptRegistry 按模型选系统提示;StateManager 注入对话历史 +
     │         打开的文件 + 若有则读入 Memory Bank / .clinerules
     ▼
② Plan 模式    只能读文件/搜索/讨论,不能改盘;产出方案用 plan_mode_respond 回话
     │         └─ 你点头后 Tab 切到 Act 模式,Plan 阶段上下文原样带过来
     ▼
③ 模型出一个工具调用   每轮只发一个 tool call,然后等结果(Cline 的核心节奏)
     │
     ▼
④ 审批闸门     写文件/跑命令这类动作在 Task.ask() 挂起;DiffViewProvider 把改动
     │         做成 diff,你批准/改/拒
     ▼
⑤ 执行 + 打 checkpoint   ToolExecutor 真正执行;每次工具调用后把工作区快照
     │                   commit 进 shadow git(影子 git,不脏你的主 git 历史)
     ▼
⑥ 结果回灌 → 回到 ③   如此循环,直到模型发 attempt_completion 宣告完成
     │
     ▼
   任意时刻可按 checkpoint 三种模式回退(只回文件 / 只回对话 / 全回滚)
```

注意 ③④ 那个「一个工具调用 → 等你批 → 执行 → 回灌」的节奏——这是陪跑型的心跳。它慢,但每一步你都看得见、拦得住。

**Windsurf Cascade 的流动(偏自主的对照)**:同样一句需求,Cascade 的姿势不太一样。它有 **real-time awareness(实时感知)**:不用你手动喂上下文,它自动感知你近期的编辑、终端输出、光标选区,再叠加 Indexing Engine 对**整库**的检索。对较长任务,它后台有一个**独立的 planning agent** 持续精炼长期计划,并在会话里维护一个 **Todo 列表**;被选中的执行模型据此做短期动作。它一次可改多文件,但把改动暂存成 **可审 diff** 逐步等你批;落盘后自动跑 linter 修 lint 错误。每个 prompt 最多 20 次 tool call,用尽了弹一个 `continue` 按钮续跑——防止它无限跑飞。

两条流动的差异,恰好是这一派的**主轴**:Cline 把「规划」显式拆成 Plan/Act 两个模式、每步都审;Cascade 把「规划」交给一个后台 agent、执行更连贯。往后你会看到,每家都在这条轴上选了自己的位置。

> 一句话:**这一派的生命周期,全是「组装上下文 → 模型出工具调用 → 审批门 → 执行 → 回灌」这个循环在转;差异只在——规划放哪、审批多严、上下文怎么记。**

---

## 3. 拆开看

下面把两株深拆到控制回路,再用一个「群像」子节横扫其余十一家。

### 3.1 Cline:Plan/Act 双模式 + 每步审批 + 透明不加价

**它是谁**:Cline 是一个 **Apache-2.0 全开源**的自主编码 agent,跑在你的 IDE(VS Code / JetBrains)和终端里。由 **Saoud Rizwan** 于 2024 年创建,最初叫 "Claude Dev",后改名 Cline(公司 Cline Bot Inc.)。截至 2026 年中,GitHub 主仓约 **64.3k stars**,活跃高频发布;2025 年累计融资约 **$32M**(Series A + Seed)。它没被收购、没停更——反倒是它最著名的下游 fork **Roo Code 在 2026-05 关停并归档,官方建议用户迁回 Cline**。

Cline 最值得记的,是创始人那句商业主张:**"inference cannot be the business strategy"**——它坚持 **BYOK(自带 API key)**,只当编排层,**不在模型成本上加隐藏的 credit 层、不偷偷降配到小模型**。底层可插 11+ 提供商(Anthropic、OpenAI、Gemini、OpenRouter、本地 Ollama / LM Studio 等任意 OpenAI 兼容端点)。

**招牌一:Plan/Act 双模式。** 这是它对抗「模糊需求」的招——把「想清楚」和「动手干」显式切成两档(Tab 切换):

- **Plan 模式**:只能 `read_file`、搜索、讨论,**不能改文件或跑命令**;产出用 `plan_mode_respond` 回话。你和它对齐方案。
- **Act 模式**:全部工具解锁。**关键设计**:切到 Act 时,Plan 阶段的完整上下文原样带过来,不用重复交代。
- 还有 **auto-approve / YOLO 模式**:可关掉部分或全部确认,让它自动跑(长跑 dev server、跑测试都能实时反应终端输出)。

**招牌二:上下文工程(Cline 的真功夫)。** 长会话最怕「跑题」和「撑爆窗口」,Cline 有一整套:

- **Focus Chain**(v3.25 起默认开):启动时生成一份 task 检查清单(可编辑的 markdown「活范围」),默认**每 6 条消息**把清单重注入上下文,防止长会话漂走。
- **Auto Compact**:上下文接近上限时,生成一份保留「决策/代码改动/状态」的总结,替换冗长历史后继续(见讲上下文压缩的那篇)。
- **`new_task` 交接**:在自然节点开一个「全新 task」,只打包计划、决策、相关文件、下一步——等价于给新同事做精准 onboarding,突破单一上下文窗口上限。
- **Memory Bank**:以 markdown 存在 repo 里的持久知识层(`projectbrief.md` / `activeContext.md` / `progress.md` 等),约定每个 task 开始先读全部 memory bank。

**招牌三:shadow git checkpoint。** 每次工具调用后,把工作区快照 commit 进一个**影子 git 仓库**(独立于你项目的主 git,存在 VS Code 全局存储),连未被主 git 跟踪的文件也纳入。好处:主 git 历史保持干净,任意时刻可一键回退(三种模式:只回文件 / 只回对话 / 全回滚)。代价:大仓库下每步 commit 会占存储、拖速度(官方建议大仓可关)。

**安全模型上的诚实取舍**:Cline **没有内建强隔离容器沙箱**。它的安全靠「逐步审批 + diff + checkpoint 一键撤销 + `.clineignore`/命令白名单」这一整套,而不是 OS 级 sandbox。这是它相对某些托管 agent 的显式让步——信任但要盯着(权限与沙箱的取舍见讲权限安全的那篇)。

> Cline 的灵魂一句话:**它赌「透明 + 每步可审 + 不在推理上赚差价」能打动企业。** Roo 关停后回流、SAP/Samsung 等被官方点名采用,给这条「社区优先」路线背了书。

### 3.2 Windsurf(Cascade):flow awareness + 独立 planning agent + 模型-harness 协同设计

**它是谁**:Windsurf 是一个 **agentic IDE**(VS Code fork),核心是名为 **Cascade** 的 agent。最初由 **Codeium**(公司前身 Exafunction,Varun Mohan 与 Douglas Chen 创立)开发,Windsurf Editor 于 **2024-11-13** 发布,自称「第一个 agentic IDE」。它是**闭源商业产品**。

这里有一个 2026 年中必须交代的重大状态变更:**2025 年 7 月,Windsurf 经历了一场三方拆分**——OpenAI 曾约 $3B 收购未成,Google 以 $2.4B **非独家授权**技术并挖走 CEO Varun Mohan 等核心工程师,**Cognition(Devin 的公司)于 2025-07-14 收购剩余实体**(IP/产品/品牌)。此后 Windsurf 归 Cognition 运营,并在 **2026-06-02 更名为 "Devin Desktop"**,Cascade 被 **Devin Local**(Rust 重写)继承,遗留 Cascade 支持延续到 2026-07-01。下文以 Cascade 时代设计为主,并标注 2026 的迭代。

**招牌一:flow awareness(实时感知)。** 这是它 2024 年首发就打的差异化——**你不用手动喂上下文**,Cascade 感知你近期的编辑、终端输出、光标/选区,再叠加 Indexing Engine 对**整个代码库**(不只是打开的文件)的检索。对比早期 Cursor/Copilot 要你 `@` 引用文件,这是「跟随你的动作」的体验。

**招牌二:独立 planning agent(双 agent 结构)。** 这是 Windsurf 一个很聪明的解耦——它有**一个专门的 planning agent 持续精炼长期计划**,与执行模型分开。planning agent 维护长期计划、动态更新 Todo 列表;被选中的执行模型据此做短期动作。为什么这么设计?因为长任务最容易「忘了两小时前定的方向」——把长期计划交给一个专职 agent 守着,能降低这种漂移。

**招牌三:Memories 与 Rules 分层。** Windsurf 刻意把记忆分成两类:

- **Memories**:自动/手动生成,存本地(`~/.codeium/windsurf/memories/`),**workspace 级、不入库、易失、不跨工作区**。
- **Rules**:版本化、团队共享,按 `trigger` 控制注入方式(`always_on` 全量注入 / `model_decision` 按相关性拉取 / `glob` 触碰匹配文件时 / `manual` 通过 `@rule-name`);还支持 `AGENTS.md`。

设计意图很清晰:**把「易失的自动记忆」和「可提交的显式规则」分开**——一个是 agent 自己攒的,一个是团队约定的。

**最独特的一招:模型-harness 协同设计。** 这是 Windsurf(Cognition)最值得学的工程哲学。他们用 **Cascade agent harness 本身**作为强化学习(RL)训练环境,来训练自研模型 **SWE-1.5**——「dogfood 模型 → 发现 harness 问题 → 改工具/prompt → 再训练」的闭环。SWE-1.5 用数千颗 GB200 NVL72 集群训练、基于某开源强基座、「数千亿参数」;经 Cerebras 推理达最高 **950 tok/s**(约 Sonnet 4.5 的 13×),SWE-Bench Pro 近前沿。取舍很明确:**速度/成本优先,绝对能力略让位于纯前沿模型。**(精确参数量、基座名、SWE-Bench Pro 具体分数官方未公开。)

**2026 的转向**:Devin Desktop 把定位从「编辑器 + AI」变成「agent 管理器 + 全功能 IDE」——新增 Agent Command Center(Kanban 统管本地+云端 agent)、Spaces(跨 agent 共享上下文)、Devin Local 的 subagents + sandboxing,以及 **ACP(Agent Client Protocol)** 开放协议,可把 Codex/Claude Agent/OpenCode 等第三方 agent 挂进同一 IDE。

> Cascade 的灵魂一句话:**它把「感知你」做到极致(flow awareness),把「守住长期计划」交给一个专职 agent,还敢用自己的 harness 去训练自己的模型。** 别家买模型来配 harness,它反过来——用 harness 长出模型。

### 3.3 群像横扫:其余十一家各自赌了什么

这一派太热闹,逐一深拆会失焦。下面每家用几句点清「定位 / 独特点 / 开源闭源 / 状态」——记它们各自的**那一个赌注**就够。

**Roo Code —— 多模式 + Boomerang 子任务(已关停的历史范本)。** Apache-2.0 开源,2024 年底 fork 自 Cline(原名 Roo Cline)。它 fork 出去的原因,恰恰是想加 Cline 不愿并入的东西:把「单一 agent」拆成**专职 mode**(Code / Architect / Ask / Debug / Orchestrator),每个 mode 有独立角色、工具组权限、可绑不同模型。它的 **Orchestrator(🪃 Boomerang)** 用 `new_task` 派生子任务,**子任务独立上下文、只回传摘要**给父任务,以此对抗长任务上下文污染。**重大状态:出品方 RooCodeInc 于 2026-04-21 宣布日落、2026-05-15 关停并归档仓库**(归档时约 24.3k stars),团队称「不再相信 IDE 是编码的未来」,转做云端 Slack agent Roomote,官方建议迁回 Cline。它是「IDE agent vs 云端 agent」路线之争的一座标志性墓碑。

**Kilo Code —— Roo 的继承者,继续深耕 IDE agent。** MIT 开源,孵化自 Open Core Ventures(GitLab 联创 Sid Sijbrandij 的机构)。血缘链是 **Cline → Roo → Kilo**(Kilo 是 Roo 的 fork,CLI 侧另 fork 自 OpenCode)。卖点:500+ 模型、任务中途换模型、零加价。2026-04 做了一次大重构——把扩展重建在共享开源内核上,**弃用 Orchestrator 模式**(委派能力下放到普通 agent 的 `task` 工具起子代理)、把 Modes 改叫 Agents、Checkpoints 改叫 Snapshots。截至 2026 年中约 **25.5k stars,活跃未停更**——它正是 Roo 官方点名的迁移去处,反其道继续做 IDE agent。

**Continue —— 供应商中立 + 配置即制品(已被 Cursor 收购停更)。** Apache-2.0 开源,2023 年 YC S23 出身。定位是「把任意 LLM + 任意上下文接进 IDE」,最大卖点是**供应商中立 + 本地优先**(可接 Ollama 完全离线),口号 "amplified, not automated"。两个值得记的设计:一是**角色化模型分工**(一个 assistant 里 chat/edit/apply/autocomplete/embed 各用最合适的模型,粒度比多数竞品细);二是**配置即制品**——把 models/rules/prompts 组成的 assistant 用 `config.yaml` 版本化、发到 Hub 分享、跨 IDE 同步。**重大状态:2026-06 被 Cursor(Anysphere)收购,属 acqui-hire(收人不收产品),仓库转只读,最终版 v2.0.0。** 教学上当它「一个已冻结、可完整读源码的经典 IDE agent 样本」。

**Zed —— Rust 原生高性能 + 开放的 ACP 协议。** 编辑器主体 GPL-3.0,ACP 协议与 SDK 为 Apache-2.0。它和其余大多数不同——**不是 VS Code fork,而是用 Rust 从零写的原生编辑器**(自研 GPU 加速 GUI 框架 GPUI,主打「快」)。2026-04 发布 1.0,活跃上升期。它在这一派里最独特的赌注是**发起并维护 ACP(Agent Client Protocol)**:一个「agent ↔ 编辑器」的标准接口,类比 LSP 之于语言服务、MCP 之于工具。Zed 既做第一方 Zed Agent,也作为 ACP client 把 **Claude / Codex / Gemini CLI 等任意外部 agent 当子进程挂进来**(走 JSON-RPC,不是终端 escape code)。它放弃了「独占一个自研 agent」的护城河,换来生态互操作——子 agent 层还刻意把 `MAX_SUBAGENT_DEPTH` 设为 1(只允许一层,防递归爆炸)。

**Augment Code —— 押注「上下文而非模型」,专攻企业大库。** 闭源商业(但 SWE-bench 参赛 agent 是 MIT 开源的),2022 年创立,2024 年携 $252M 融资出隐身。它的核心论点是 **"context is the new compiler"**——决定 agent 质量的不是 prompt 而是喂给模型的那一小撮正确上下文。护城河是一个跨仓库的**语义 Context Engine**(向量索引,理解「含义而非文本」,官方称可一次处理最多 50 万文件),对外还以 MCP server 形式暴露 `codebase-retrieval` 工具——即它可以**只当别人 agent 的「上下文供应商」**。它明确不训自有 driver 模型、也刻意不 fork IDE(做 VS Code/JetBrains 插件 + Auggie CLI),理由是开发者更愿留在原 IDE。活跃未停更。

**Amazon Q Developer —— AWS 原生绑定(已进日落期,继任者是 Kiro)。** AWS 出品,前身 CodeWhisperer。CLI 开源部分双许可 Apache-2.0/MIT(~99.5% Rust),服务本体闭源。它的赌注是**深度绑 AWS 工作流**——直接调 AWS CLI、生成 CDK、跑 Java 升级 / .NET 移植 / 安全扫描,这些是 Copilot/Claude Code 不覆盖的。权限模型上有个值得记的细分:`tools`(可用)vs `allowedTools`(可信)的二分。还开源了一个多 agent 编排框架 **CAO(CLI Agent Orchestrator)**——supervisor + worker 分层、每 agent 跑在隔离 tmux 会话、经 MCP 通信。**重大状态:AWS 正用继任产品 Kiro 取代它——2026-05-15 停新注册,支持到 2027-04-30,CLI 仓库仅收安全修复。** 势头明确下行。

**Trae —— 字节的 AI 原生 IDE,SOLO 端到端 + 覆盖非工程角色。** ByteDance 出品。**IDE 本体闭源(Code-OSS fork);但同名的开源 CLI `trae-agent` 是 MIT**——注意别把「Trae 开源」套到整个 IDE 上,开源的只是 CLI。它的招牌是 **SOLO 模式**:走「PRD-先行」的端到端范式——先不写代码,而是**产出一份 PRD 文档作为唯一强制审批门(Ready to Builder)**,你点头后高度自主执行、四面板实时旁观、一键部署到 Vercel。这是介于「每步审批」(Cline)与「全自动黑盒」之间的 plan-then-autonomous-execute。另一独特点是 **MTC(More Than Coding)**:把 agent IDE 外扩到 PM/数据/运营等非工程角色。**必须点名的暗面**:The Register 等报道 Trae 遥测在用户 opt-out 后仍持续上传(约 7 分钟发起 ~500 次调用、传 ~26MB),因开关只管 VS Code 框架层——这是选型时最实质的隐私风险。开源 CLI 在 SWE-bench Verified 上报过 Pass@1 75.20%(论文口径),活跃迭代中。

**Qoder —— 阿里的自主开发桌面,Agent + Quest 双范式 + Repo Wiki。** 阿里巴巴(通义实验室)出品,**闭源专有**(国内前身「通义灵码」2026-05 改名 Qoder CN 并入)。它在同一产品里合并两种交互范式:**Agent Mode**(带 File Checkpoint 检查点的同步式结对,human-in-the-loop)和 **Quest Mode**(端到端异步自主交付,口号「Define the goal. Review the result.」,人 on-the-loop)。记忆侧下重注:**Repo Wiki**(自动分析全仓生成架构文档,存内部索引不落盘,约 1 万文件上限)+ 混合检索(向量 + 代码图)+ 双记忆(Active/Automatic)。Quest 遇难点时 Experts Mode 多 agent 并行探索,提交前自动跑静态分析+单测+合规检查,号称支持 30+ 小时长运行。多模型智能路由 + Qwen 垂直整合。活跃,官方称 >500 万用户、企业客户贡献 70% 营收(厂商自报)。

**Kiro —— spec-driven,把「规范」而非「聊天」当工作单元。** AWS 出品,是 Q Developer 的继任者(从头重写,不是升级)。客户端基于 Code OSS,**应用本体源码未开源**。它是这一派里**最反 vibe-coding** 的一株——不让你直接聊,而是先把一句 prompt 转成**三份结构化文档**:`requirements.md`(用 EARS 记法写验收标准)、`design.md`(架构/数据模型/API)、`tasks.md`(编号任务,回链需求、依赖显式映射)。**在需求→设计两处强制人审门**,批准后才由任务级隔离 agent 会话按依赖图「波次(wave)」并发执行。记忆靠 **Steering files**(分 always-on/auto/manual 三种加载),自动化靠 **Agent Hooks**(「AI 驱动的本地版 GitHub Actions」)。2026 起是 AWS 编码工具战略主线,进了 GovCloud,活跃 GA;定价争议(credit 计费)是真实的采用摩擦。它牺牲即时性换**可审计性/可预测性**,适合大改动、多人协作、合规敏感场景。

**Google Antigravity —— agent-first,主抽象从「编辑文件」上移到「管理多 agent」。** Google 出品,**专有闭源**(外围 SDK/CLI 部分开源),2025-11 随 Gemini 3 发布,2026-05 升 2.0。它最激进的一点是**默认 AI 不是侧边栏工具,而是自主 actor**——**Manager view** 让你像项目经理一样并行派发多个 agent 异步跑活,**Editor view** 才保留熟悉的同步编码。核心信任原语是 **Artifacts(工件)**:agent 不甩给你原始 tool call,而是产出可一眼核验的交付物(Implementation Plan、Task List、截图、浏览器录屏),你在 Artifact 上留反馈、**agent 不停执行流就吸收**。主控制回路是显式的 **PLAN → EXECUTE → VERIFY**——尤其 VERIFY 阶段它会用 Browser 亲自操作被测应用、截图录屏证明「确实跑通了」。它「一个 harness、四种入口」(IDE / `agy` CLI / SDK / Managed Agents API),且多模型(Gemini + Claude + GPT-OSS)。**必须点名的暗面**:2025-11 被披露间接 prompt injection → 数据外泄(恶意网页用 1px 字体藏指令诱导 agent cat `.env` 收集凭证),2026-04 又修补了一个 RCE 级 prompt injection——agent-first + 本地全权限 = prompt injection 的高价值攻击面(见讲权限安全的那篇)。

**CodeGeeX —— 清华/智谱的开源代码模型 + IDE 助手(不是真 agent)。** 清华 THUDM 起家、智谱(Z.ai,zai-org)商业化。**代码 Apache-2.0,模型权重自定义许可(商用需注册)**。它和上面所有产品**不是一个层**——它主要是「**可下载权重的开源代码 LLM + IDE 补全/对话插件**」,不是以自主多步执行为核心的 coding agent。最新公开权重是 CodeGeeX4-ALL-9B(基于 GLM-4-9B,128K 上下文)。它的核心价值是**可私有部署**(Local Mode 起本地模型,数据不出内网),对数据敏感团队友好;单模型内置 code interpreter / web search / function call,但**没有公开一套多步自主规划-执行框架**。状态是个分叉:**模型仓库 2024-08 后基本停更**,但 IDE 插件仍活跃发版(VS Code 扩展 v2.27.6/2026-06,百万级安装),JetBrains 端 2025-12 才加「agent」词条——推断插件后端很可能已换接更新的 GLM 系列(官方未明说)。多份评测明确指出它「不像 Cline/Cursor 那样自主规划执行多步变更」。

**一句带过的国产阵营。** 除了上面的 Trae(字节)、Qoder(阿里)、CodeGeeX(智谱),国内还有**腾讯的 CodeBuddy、百度的 Comate(文心快码)**等同类产品,共同构成一个由大厂驱动、模型自研 + 产品化的国产编码 agent 阵营——它们的存在本身,说明「把 agent 装进编辑器」已是各家大模型公司的标配入口之战。

---

## 4. 它们与众不同的设计决策与取舍

退一步看整片森林,你会发现这十几家其实在几条**同一维度**上各自选了位置。看清这几条轴,比记产品名有用得多。

**轴一:开源 vs 闭源。** 开源阵营(Cline、Roo、Kilo、Continue、Zed 主体、Trae 的 CLI、CodeGeeX)赌的是「可审计、可自托管、模型自由、社区外溢」;闭源阵营(Windsurf、Augment、Trae IDE、Qoder、Kiro、Antigravity)赌的是「产品化开箱即用 + 企业集成 + 自建护城河」。Cline 那句 "inference cannot be the business strategy" 是开源派的旗帜;Augment 的 "context is the new compiler" 是闭源派把护城河从模型挪到上下文的宣言。

**轴二:fork 编辑器 vs 寄生插件 vs 原生重写。** 大多数产品选了 fork VS Code / Code-OSS(Windsurf、Trae、Qoder、Kiro、Antigravity)——好处是拿到整个编辑器的控制权,能把 agent 焊进 UI 深处;代价是维护一个 fork 的重量。Cline/Roo/Kilo/Continue/CodeGeeX 走**轻量插件**——寄生在原版 VS Code 里,upgrade 跟得上、但受宿主 API 限制。Zed 最硬核——**Rust 原生从零重写**,换来极致性能,但代价是生态从头长。Augment 则刻意**不 fork**,理由是「开发者更愿留在原 IDE」。

**轴三:每步审批 vs plan-then-execute vs agent-first。** 这是自主度的主轴:
- **每步审批**(Cline、Roo、Continue):最可控,最啰嗦。适合不接受「无人值守改仓库」的团队。
- **plan-then-execute**(Trae SOLO 的 PRD 门、Kiro 的三阶段审门、Amazon Q 的 `/dev`):用一两个显式审批门换执行阶段的自主与速度。
- **agent-first**(Antigravity 的 Manager view、Qoder 的 Quest):主抽象上移到「管理多个异步 agent」,人 on-the-loop 而非 in-the-loop。

**轴四:上下文怎么记。** 几乎每家都有自己的答案——Cline 的 Focus Chain + Memory Bank、Windsurf 的 Memories/Rules 分层、Augment 的语义 Context Engine、Qoder 的 Repo Wiki + 双记忆、Kiro 的 Steering files、Antigravity 的 Knowledge Items。共性是:**把「团队约定/项目知识」从易失的聊天上下文,外置成磁盘上可版本化的东西**(`AGENTS.md`、rules、steering 文件)。这和讲 Claude Code 的那篇里 CLAUDE.md 的思想一脉相承。

**轴五:规划放哪。** 有人塞进模式(Cline 的 Plan、Roo 的 Architect、Kilo 的 Plan agent),有人做成独立 agent(Windsurf 的 planning agent),有人外化成文档(Trae 的 PRD、Kiro 的 spec 三文件),有人显式做成阶段(Antigravity 的 PLAN 阶段)。没有谁不做规划——只是把它放在了不同的可见度上。

> 一个贯穿的观察:**这十几家几乎没有一家是靠「自己训了个更强的模型」赢的。** 它们几乎都是模型消费方(连自研 SWE-1.5 的 Windsurf,也是把力气花在 harness 上、用 harness 训模型)。真正的分野,全在「怎么把 agent 装进编辑器」这套外壳——这正是全站那句「harness 比模型更重要」在编辑器战场的十几种复读。

---

## 5. 局限与坑

这一派最容易被「装进熟悉的编辑器」的亲切感麻痹。诚实列几条(机器会渲染成 ⚠️ 警示卡):

1. **「装进 IDE」不等于「安全」——大多数没有强沙箱。** Cline、Roo、Kilo、Continue、Amazon Q CLI 几乎都**没有 OS 级容器/VM 沙箱**,命令直接在你本机、你的真实工作区里跑。安全靠「每步审批 + diff + checkpoint 回滚 + 命令白名单」这套软约束兜底。**为什么致命**:一旦你开了 auto-approve/YOLO 图省事,一条 `rm -rf` 或一次误跑脚本就能真的动你的机器。**怎么避**:高危操作保持人工审批;敏感项目优先选有真沙箱的路径(如 Kiro/Antigravity 的隔离沙箱、或自己套 Docker);别在生产凭证在场时开全自动。

2. **prompt injection 在「本地全权限 agent」上被放大。** Antigravity 被真实披露过:恶意网页用 1px 字体藏指令,诱导 agent 去 cat `.env` 收集 AWS 凭证、再经默认 allow-list 里的通道外泄;还修补过 RCE 级注入。**为什么致命**:这一派的 agent 能自己上网、读仓库任意文件、跑命令——一段藏在 issue、依赖 README 或网页里的恶意指令,就可能劫持一个你以为「只是在帮你写代码」的 agent(见讲权限安全的那篇)。**怎么避**:收紧浏览器/网络 allow-list;别让 agent 无差别读密钥目录;把可信来源和不可信内容在心里分清。

3. **闭源产品的遥测/数据出境,开关未必真关得掉。** Trae 被记录到 opt-out 遥测后仍持续上传(开关只管 VS Code 框架层,产品自有工具不受约束),本地补全端点每次打开/编辑文档都上传完整文件内容。**为什么致命**:你的专有代码可能在你以为「已关闭上报」时仍在出境——对合规受限或隐私敏感团队是硬伤。**怎么避**:选型闭源 IDE 前,实测网络流量、读隐私政策;高敏场景优先本地优先/可离线的方案(Continue + 本地模型、CodeGeeX Local Mode)。

4. **选一个「已停更/日落」的产品,等于选一个不再修 bug 的地基。** 2026 年中这一派死了一批:**Roo Code 关停归档、Continue 被收购转只读、Amazon Q Developer 进日落期、Windsurf 更名并整合进 Devin**。**为什么致命**:agent 工具依赖模型和 IDE 双双快速演进,一个停更的 harness 很快跟不上新模型的工具协议、也不再修安全洞。**怎么避**:选型时把「出品方是否在活跃投入」当一等指标;已停更的(Roo/Continue)只当学习范本或迁移前的临时桥,别押未来。

5. **别把「diff 全绿」等于「做对了」。** 无论陪跑还是自主,这一派最终给你的都是一个待审的 diff(或一个 PR)。它跑过的测试过了,只说明它想到要测的地方过了。**为什么致命**:测试覆盖不到的边界、它没想到的场景,照样可能错;spec-driven 的 Kiro 也只是把「你没说清」的风险前移到需求文档,不是消除。**怎么避**:把自己从「写代码」解放到「审代码」,但**别把自己从「负责」里解放出来**——review 是你的活,不是它的。

6. **上下文压缩是有损的,长会话它会「忘」。** 这一派全靠压缩/摘要撑长会话(Cline 的 Auto Compact、Roo/Kilo 的 Context Condensing、Trae 的记忆摘要)。**为什么致命**:压缩即丢信息,agent 可能忘掉两小时前定的方案、在错误方向越走越远;而厂商「压缩不掉点」的说法多是自报、未指明测什么(见讲上下文压缩的那篇)。**怎么避**:长任务用显式交接(Cline 的 `new_task`、开新 spec)而非一路硬跑;关键决策落到磁盘(rules/steering/AGENTS.md),别指望它记在对话里。

---

## 6. 一句话记住 + 对比表

> **IDE/编辑器派 coding agent = 把一个能看整库、自己读改跑、但默认逐步可审的 agent,焊进你天天用的编辑器。 它们几乎都不自己训模型,真正的分野全在三条轴上——开源还是闭源、每步审批还是 agent-first、以及上下文/记忆怎么记。 Cline 赌「透明每步可审」,Windsurf 赌「感知你 + 用 harness 训模型」,Kiro 赌「spec 而非聊天」,Antigravity 赌「agent-first」;而 2026 年中这一派已经死了一批(Roo/Continue/Windsurf 品牌/Amazon Q),活着的还在往「更自主」滑。**

本章所有系统横向对齐(状态、数字均为截至 2026 年中的快照):

| 系统 | 定位 / 独特点 | 内核 / 形态 | 开源闭源 | 最适合谁 | 2026 中状态 |
|---|---|---|---|---|---|
| **Cline** | Plan/Act 双模式 + 每步审批 + 透明不加价 | VS Code/JetBrains 扩展 + CLI + SDK | Apache-2.0 开源 | 要透明可审、BYOK 不加价的团队 | 活跃(~64.3k★) |
| **Windsurf(Cascade)** | flow awareness + 独立 planning agent + 用 harness 训模型 | agentic IDE(VS Code fork) | 闭源 | 想要「跟随你」的自主 IDE 体验 | 2026-06 更名 Devin Desktop |
| **Roo Code** | 多 mode + Boomerang 子任务隔离 | VS Code 扩展 | Apache-2.0 | (历史范本) | **已关停归档**(2026-05) |
| **Kilo Code** | Roo 继承者,500+ 模型、中途换模型 | VS Code/JetBrains/CLI 共享内核 | MIT 开源 | 要模型自由 + 继续用 IDE agent | 活跃(~25.5k★) |
| **Continue** | 供应商中立 + 配置即制品 + 角色化模型分工 | VS Code/JetBrains/CLI(core) | Apache-2.0 | 要本地优先/离线/可换任意模型 | **被 Cursor 收购、只读** |
| **Zed** | Rust 原生高性能 + 发起 ACP 协议 | 原生编辑器(非 fork) | GPL-3.0 主体 / ACP Apache-2.0 | 要极致性能 + 挂任意外部 agent | 活跃(~86k★,2026-04 出 1.0) |
| **Augment Code** | 押「上下文而非模型」,语义 Context Engine 攻企业大库 | VS Code/JetBrains 插件 + CLI + 云 | 主体闭源(SWE agent MIT) | 几十万文件、多仓库的企业库 | 活跃 |
| **Amazon Q Developer** | AWS 原生绑定 + 可用/可信权限二分 + CAO 多 agent | IDE 插件 + CLI(Rust) | CLI 双许可 / 服务闭源 | 深度在 AWS 上的团队 | **日落期**(继任 Kiro) |
| **Trae** | 字节 AI 原生 IDE,SOLO PRD 门 + 覆盖非工程角色 | Code-OSS fork(IDE)+ CLI | IDE 闭源 / CLI MIT | 要低价大厂 + 端到端 SOLO | 活跃(遥测争议) |
| **Qoder** | 阿里自主开发桌面,Agent+Quest 双范式 + Repo Wiki | 桌面/CLI/云(闭源客户端) | 闭源 | 大仓库理解 + 企业团队 | 活跃(称 >500 万用户) |
| **Kiro** | spec-driven,需求/设计/任务三文件 + 强制审门 | Code OSS(IDE/CLI/Web) | 应用本体未开源 | 大改动、多人、合规敏感 | 活跃 GA(AWS 主线) |
| **Google Antigravity** | agent-first,Manager view 多 agent + Artifacts + PLAN/EXECUTE/VERIFY | IDE + agy CLI + SDK + Managed Agents API | 专有(外围 SDK 开源) | 要派活即走、并行多 agent | 活跃(有安全争议) |
| **CodeGeeX** | 清华/智谱开源代码模型 + IDE 助手(非真 agent) | 代码 LLM + VS Code/JetBrains 插件 | 代码 Apache-2.0 / 权重需注册 | 要私有部署/离线/多语言补全 | 模型停更、插件活跃 |
| *(国产阵营)* CodeBuddy / Comate | 腾讯 / 百度的同类编码 agent | IDE 集成 | — | 各家大模型生态用户 | 存在,本章一句带过 |

**怎么选(判断法则)**:
- 想**透明、可审计、每步可控、不被加价**——看 Cline(或它的继承者 Kilo)。
- 想**本地优先/离线/接任意模型**——看 Continue(已停更,当基座)或 CodeGeeX Local Mode。
- 想**极致性能 + 把任意外部 agent 挂进来**——看 Zed(靠 ACP)。
- 面对**几十万文件的企业大库**——看 Augment(它甚至能只当你别的 agent 的上下文供应商)。
- 要**强流程、可审计、合规敏感的大改动**——看 Kiro(spec-driven)。
- 要**派活即走、并行多 agent、产出可核验**——看 Antigravity(agent-first)。
- 已在 **AWS 生态**里——原本是 Amazon Q,现在该看它的继任 Kiro。

对照拆 Cursor 的那篇,这一篇补全了「把 agent 装进编辑器」这一整片森林:Cursor 是这派里最出名的单株,而这里你看到了从开源插件到 fork IDE、从每步审批到 agent-first、从硅谷到字节/阿里/智谱的**十几种答卷**。它们和拆自主 SWE 的那篇(Devin 那派「派出去自己跑」)恰好是自主度的两端——而 2026 年中你已经能看到,这两端正在**相互靠拢**:IDE 派在长出 Manager view、云端 agent、异步 Quest,自主 SWE 派也在做本地形态。编辑器与云,终将在中间相遇。
