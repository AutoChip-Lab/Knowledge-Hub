# Agent 与 Agent Harness · 第 ⑱ 篇:拆解 · 新一代 harness(OpenClaw / Hermes)

> 「Agent 与 Agent Harness」学习系列第十八篇 · 案例拆解板块。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ 认识 Harness → ⑫ Claude Code → ⑬ Codex CLI → ⑭ Cursor → ⑮ Aider → ⑯ Devin → ⑰ AutoGPT/开源浪潮 → **⑱ 新一代 harness(OpenClaw / Hermes)** → ⑲ 芯片域拆解 → ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:当 harness 开始「驱动别的 harness」

前面拆的每一个真家伙——Claude Code、Codex、Cursor、Devin——都是同一个套路:**一个 harness 驱动一个模型**,把模型包成能读代码、跑命令、改文件的自主 agent。你已经很熟这张地图了。

这一篇要看的,是 2026 年冒出来的一种**新形态**。harness 自己开始「往上长」——长出两条我们前面没见过的能力:

- 一条是**横向**:harness 不再只驱动模型,它开始**驱动别的 harness**。你手里的 Claude Code、Codex、Gemini CLI,在它眼里都退化成了「一个可以被调用的子代理」。它成了「harness 的 harness」,业界叫**元编排(meta-orchestration)**。
- 一条是**纵向**:harness 不再只是被动执行,它开始**从自己干过的活里长出技能**——一个任务做成了,它自动把这套做法沉淀成一个可复用的 skill,下次遇到类似的活直接调,而且越用越顺。这叫**自进化(self-evolution)**。

⑪篇讲「扩展生态」时,我们埋过一句伏笔:MCP 让 agent 接工具、ACP 让 agent 接 agent、skills 让能力可移植——「这些标准会催生一层新的 harness」。这一篇就是那句伏笔的兑现。两个代表:**OpenClaw**(元编排的代表)与 **Hermes**(自进化的代表)。

```
前十七篇拆的形态:                     这一篇拆的新形态:

   harness ──驱动──▸ 模型             OpenClaw ──ACP──▸ Claude Code ──▸ 模型
                                             ├──ACP──▸ Codex ──────▸ 模型
   (一对一,一个壳包一个脑)                    └──ACP──▸ Gemini CLI ─▸ 模型
                                       (元编排:harness 把别的 harness 当子代理)

                                       Hermes ──跑任务──▸ 成功轨迹 ──▸ 自动生成 skill
                                          ▲                              │
                                          └──────── 下次复用 & 自我改进 ◂─┘
                                       (自进化:用得越久,自己越强)
```

> 读这一篇的正确姿势:**别把 OpenClaw / Hermes 当成「又两个 Claude Code」。** 它们在的是**上一层**——一个把「整个 agent」当积木来搭、或者把「经验」当资产来攒的元层。看它们,是看 harness 这个物种在 2026 年往哪进化。

---

## 1. 它们是什么、谁做的、什么状态

先给两句定位,把两家钉在地图上。

> **OpenClaw 是一个开源、自托管、「本地优先」的多渠道 AI agent 网关(gateway)——它以 ACP 元编排闻名:能把外部的编码 harness(Claude Code / Codex / Gemini CLI / OpenCode 等)当子代理来驱动,再套一层消息路由、持久化、调度和插件生态。**

> **Hermes 是 Nous Research 出的开源、模型无关(model-agnostic)的自进化 agent harness——它以「闭环学习」闻名:跑任务时能从成功轨迹里自动造出 skill、在使用中自我改进、把关于你的事实持久化下来,还能检索自己过去的对话。**

几个关键事实(据两家官方文档/仓库,数字均为**截至 2026 年中**的快照,会随版本变):

**OpenClaw**
- **谁做的**:奥地利「vibe coder」Peter Steinberger。它有一段著名的「改名史」——从 Warelay(2025年11月)一路改到 OpenClaw(2026年1月30日)。中间有一步(改名 Moltbot)确实是 Anthropic 的商标施压导致的;但**最终定名 OpenClaw 纯粹是觉得顺口**,和商标无关(这点常被传错,别踩)。
- **状态**:MIT 许可,TypeScript 为主(配 Swift 的 iOS/macOS 伴侣 App)。作者已于 2026年2月加入 OpenAI,项目交给一个社区性质的 **OpenClaw Foundation** 托管(OpenAI 支持,但作为独立开源项目运作——它是否已成正式法人非营利实体,截至 2026 年中尚未被一手来源完全钉死)。仓库增长凶猛——GitHub 星标从加入 OpenAI 时的约 19.6 万,涨到 2026 年中的约 **38 万**(星标是移动靶,只当时间戳快照看)。

**Hermes**
- **谁做的**:Nous Research。**注意别和它家的 Hermes 大模型系列(Hermes-4 等)搞混**——此处 Hermes 指的是那个 agent harness,不是模型。
- **状态**:MIT 许可,主要 Python(约 82%)+ 一层 TypeScript 的 TUI/桌面壳。设计成一个跑在你自己基础设施上的常驻守护进程(号称「从 5 美元的 VPS 到 GPU 集群都能跑」),通过你日常用的聊天平台找到你。GitHub 星标截至 2026 年中约 **20.9 万**(早期流传的「两个月 2.7 万星」是 2026 年 4 月的陈旧快照,别当现状)。

**两家的共同气质**,一眼就和前十七篇的产品不一样:它们都**不是编码 IDE、也不是终端里陪你敲代码的助手**,而是**常驻的、多渠道的、自托管的 agent 基础设施**——你在 Telegram / Discord / Slack 里给它发消息,它在后台替你调度一堆活,干完把结果推回来。编码只是它们能干的活之一,而且往往是**外包给别的编码 harness**去干的。

> 一句话:**Claude Code 是「你坐在它旁边看它写代码」;OpenClaw / Hermes 是「你在群里 @ 它一句,它在后台调度一队 agent 去把事办了」。** 形态上就高了一层。

---

## 2. 各自怎么工作:两条生命周期

拆组件前,先看血液怎么流。两家都跑「网关 → 准备运行时 → 循环 → 出结果」这条共性主干,但**在关键一步上分道扬镳**:OpenClaw 在循环里把活**外包给一个外部 harness**;Hermes 在循环收尾时**为自己长出一个 skill**。

设想同一个请求:你在 Discord 里 @ 它——**「把这个仓库分析一遍,写份报告。」**

**OpenClaw 的一圈(元编排路径):**

```
你在 Discord 发消息
   │
   ▼
① 入站       渠道适配器(20+ 平台之一)→ 交给 Gateway(那个常驻的控制面进程)
   │
   ▼
② 网关受理   `agent` RPC 校验参数、解析会话、落库,立刻返回 {runId, acceptedAt}
             └─ 不阻塞等结果:先给你个「收到了」的回执(异步)
   │
   ▼
③ 备运行时   解析 provider/model-id → 载入 skills 快照 → 按优先级挑「运行时」
             (模型级策略 ▸ provider 级策略 ▸ auto 的 supports(ctx) ▸ 内嵌兜底)
   │
   ▼
④ 走 ACP     若选中外部 harness:@openclaw/acpx 在独立工作目录里
             拉起一个 Claude Code / Codex 进程,把它当子代理来驱动
             └─ ⚠️ 这段执行不套 OpenClaw 的沙箱:外部 CLI 用它自己的权限跑
   │
   ▼
⑤ 核心循环   同一会话内串行执行、拿会话写锁;工具 schema 先按策略过滤再给模型看
             三路事件流:assistant(文字)/ tool(执行)/ lifecycle(起止/错误)
   │
   ▼
⑥ 收尾       上下文超限则自动压缩;拼装回复;worktree/PR 类结果先发一行
             「规范状态行」,再唤醒编排器,把事实性摘要发回原来那个会话线程
```

**Hermes 的一圈(自进化路径):**

```
你在 Telegram 发消息
   │
   ▼
① 入站       平台适配器 on_message() → Gateway 解析「按用户/按平台」的会话键
   │
   ▼
② 进循环     AIAgent.run_conversation() 派任务 ID,把你的话追加进历史
   │
   ▼
③ 拼提示     三层系统提示(稳定层/上下文层/易失层);MEMORY.md、USER.md
             作为「冻结快照」注入(专门为了保住模型的前缀缓存命中)
   │
   ▼
④ 压缩预检   历史超阈值(默认约上下文窗口的 50%)→ 先压再调 API
   │
   ▼
⑤ 定 provider  三种 API 模式按优先级挑:chat_completions / codex_responses /
               anthropic_messages(外加一条 Bedrock 路径);300+ 模型可达
   │
   ▼
⑥ 调模型 & 派工具  多个工具调用用线程池并发(交互式工具强制串行)
                  每次:解析 handler → pre_tool_call 钩子 → 危险命令分类
                        → 执行 → post_tool_call 钩子 → 回填
   │
   ▼
⑦ 循环        直到出现「纯文字、无工具调用」= 完成,或撞上默认 90 轮预算上限
   │
   ▼
⑧ ✦造技能✦   若这轮满足条件(用了 5+ 次工具 / 从错误里恢复过 / 你纠正过它 /
             是个不显然的工作流)→ agent 自主写一个 skill 存进 ~/.hermes/skills/
   │
   ▼
⑨ 落盘 & 送达  状态存进 SQLite(FTS5 全文索引);MEMORY.md/USER.md 刷盘;回复送回原平台
```

对照着看,**两条生命周期的「分歧点」一目了然**:

- OpenClaw 的关键动作在**第 ④ 步**:它没自己写代码,而是**拉起一个外部 harness 进程当子代理**。它的价值在「怎么把活派出去、怎么把结果收回来」。
- Hermes 的关键动作在**第 ⑧ 步**:任务干完了,它**顺手把这套做法结晶成一个 skill**。它的价值在「怎么让这次的经验,变成下次的能力」。

> 一句话:**OpenClaw 的一圈是「把活外包给最合适的 harness」;Hermes 的一圈是「把这次的活变成下次的技能」。** 一个横向借力,一个纵向攒力——这就是元层 harness 的两个方向。

---

## 3. 拆开看两家 + 元层的意义

现在把两家分别搬上手术台,再退一步看「元层」这个新层次到底意味着什么。

### 3.1 OpenClaw:把「别的 agent」当工具来编排

OpenClaw 的招牌,是**元编排**。要看懂它,先认清它的骨架分层(据官方文档,截至 2026 年中):

- **Gateway(网关 / 控制面)**:一个常驻的本地进程,是会话、路由、渠道连接的**单一事实源**。所有渠道消息先汇到这里,它对外暴露 `agent`、`agent.wait` 这样的 RPC。
- **渠道层(channels)**:20+ 平台适配器(WhatsApp / Telegram / Slack / Discord / iMessage / 飞书 / 微信……),每个渠道是一个实现了「消息能力」类型的插件。
- **Provider 层**:管认证、模型发现、传输规整、故障转移,用 `provider/model-id` 的命名(如 `anthropic/claude-opus-4-8`)。
- **Agent Runtime 层**:每个运行时「拥有一个准备好的模型循环」。三类:内嵌 `openclaw` 运行时(兜底)、内嵌插件运行时、以及 **CLI 后端**(如 `claude-cli`)。选谁有一套优先级(模型级策略 ▸ provider 级策略 ▸ auto 模式的 `supports(ctx)` ▸ 内嵌兜底)。**一旦某个插件 harness 认领了一次运行,OpenClaw 就不会再把它塞进另一个运行时重放**——这保住了认证语义、避免副作用被执行两遍。

**招牌机制:ACP(Agent Client Protocol)——「把别的 agent 当工具/子代理」**

这是 OpenClaw 最出圈的地方,但有个**极其重要的事实校准**:

> ⚠️ **ACP 不是 OpenClaw 发明的。** ACP 是 **Zed Industries** 提出的一个**独立开放标准**(2025年8月发布),基于 **JSON-RPC 2.0 over stdio**,定位是「AI 编码 agent 界的 LSP」。OpenClaw 只是这个标准的**消费者**——它通过一个单独安装的 `@openclaw/acpx` 插件去**拉起并驾驭**外部 harness,包括 Claude Code、Codex、Gemini CLI、Cursor、GitHub Copilot、OpenCode 等一长串。别把 ACP 记成 OpenClaw 的组件。

这里就是「元编排」的实质:**OpenClaw 把「一个完整的 Claude Code 进程」当成自己的一个子代理来调用**——就像 Claude Code 把 `Bash` 当成一个工具一样。层次抬高了一格:⑩篇里子代理还是「同一个 harness 派生的、跑在独立上下文里的自己」,而这里的子代理**是另一个厂商的、另一套完整的 harness**。

**worktree 策略 + resume**:多个外部 harness(Claude Code / Codex / 实验性的 OpenCode)共享一套 **Git worktree 隔离**——每个后端有自己的适配器和「resume substrate(会话续接机制)」,helper 会确保子代理不会踩坏主代理的记忆/转录文件。收尾走一个「两步完成契约」:先吐一行规范状态行,再唤醒编排器发一段事实性摘要回原线程。

**关于「循环」的重要澄清**:网上有一种流传的说法,把 OpenClaw 的运行时描述成一个「六阶段控制循环」(初始化→建上下文→调 LLM→决策→收工具结果→溢出检查)。

> ⚠️ **这个「六阶段」说法在官方文档里找不到依据,不要写、不要背。** 官方文档描述的是**模块边界**(embedded-agent-runner、sessions、agent-core、runtime facade、agent-hooks、llm provider registry 等),而不是一个编号的六阶段。准确的说法是:**一个嵌套的 attempt 循环 + compaction(压缩)+ overflow(溢出)保护**。「嵌套 attempt」这个概念是真的(每次尝试是一个可重放/可恢复的单元),「六个整齐的阶段名」是被合成出来的,是雷区。

**三层可扩展性**(值得单独记):OpenClaw 把「扩展 agent」分成清清楚楚的三级——**Skills**(`SKILL.md` 指令包,自然语言写的工作流/规则,不是代码)< **Tools**(注册进来的代码工具)< **Plugins**(可安装的能力包)。什么时候用哪级,一目了然。

> 一句话:**OpenClaw 是「一个套在消息网关外壳里的 agent」——它的核心创新不在于自己多会写代码,而在于它能通过 ACP 这个开放标准,把市面上最强的编码 harness 当积木调来调去。**

### 3.2 Hermes:用久了越来越强的自进化 harness

Hermes 的招牌是**闭环学习(closed learning loop)**。但要撑起这个闭环,它底下有三块硬骨头,先拆。

**第一块:provider 抽象(和模型/供应商彻底解耦)**

Hermes 是**模型无关**的极致样板。它把「用哪个模型」和「怎么和这个模型的 API 说话」拆成两层:

- 上层是 **API 模式**:三种有文档的模式——`chat_completions`(OpenAI 兼容)、`codex_responses`(OpenAI Responses/Codex API)、`anthropic_messages`(原生 Anthropic),外加一条 **Bedrock 路径**(AWS Converse API)。
- 下层是**传输类**:每种 API 形状一个类(AnthropicTransport / ChatCompletionsTransport / ResponsesApiTransport / BedrockTransport),各自负责把历史「格式化成这家 API 认的形状」。

结果就是:**同一个 runtime,能驱动 300+ 模型**(据官方文档,主要经 Nous Portal 聚合,横跨约 24 家一等 provider,任何 OpenAI 兼容端点也能接)。这就是⑥篇「harness 和模型解耦」讲到底的样子。

**第二块:完整的压缩路径(辅助模型总结旧轮次)**

对照④⑧两篇的上下文工程,Hermes 的压缩是教科书级的(据社区技术分析,数字为截至 2026 年中):默认在**上下文窗口约 50%** 时触发;流程是「刷记忆 → 用**辅助模型**总结中段轮次 → 保护头段和尾段(尾部默认约 20 条)→ 工具调用/结果成对保留」。摘要预算约为被压内容的 **20%**(2000 token 下限、12000 token 上限)。

最妙的一笔:**它不改写转录文本**。压缩时它「关掉当前 SQLite 会话行,新建一个由摘要播种的子会话,轮换会话 ID,记下父子血缘」。所以历史永远是可审计、可查询的父→子链条——而不是被就地涂改。这里的「辅助模型」是一个专门的便宜快模型(默认 Gemini Flash),把压缩、看图、网页总结、危险命令分类这些**杂活**都从昂贵的主模型手里接过去。

**第三块也是招牌:自学习循环**

这是 Nous 自己强调的核心差异化,别家 OSS harness 目前没有把它做成一等内建的。它由四个动作拼成:

1. **从成功轨迹自动造 skill**:一轮任务干完,若满足条件(用了 5+ 次工具、从错误里恢复过、你纠正过它、是个不显然的工作流),agent 会**自主写一个 skill**,存成 Markdown 存进 `~/.hermes/skills/`。
2. **使用中自我改进**:skill 不是写死的——用的时候发现有问题,可以 patch 式地就地改进它。
3. **持久化用户事实**:关于你的偏好/事实落进 `MEMORY.md`、`USER.md`,会话开始时作为冻结快照注入。
4. **检索自己的历史对话**:SQLite + FTS5 全文检索,让它能翻自己过去的会话来「回忆」。

而且这些 skill 遵循一个**开放标准 agentskills.io**——意味着 skill 更像一种**跨 harness 可移植的社区开放格式**,而不是锁死在 Hermes 里的私有护城河。(不过这个标准由谁治理,官方尚未明确,别断言是 Nous 创的;「可移植」目前更多是方向,不是保证——细节见 §5。)

**它也能当元编排器**:和 OpenClaw 一样,Hermes 能把 Claude Code、Codex、OpenCode、OpenHands 当子代理驱动——每个对应一个 sibling skill(`claude-code` / `codex` / `opencode` / `openhands`)。比如它用 OpenHands 当执行后端时,通过 terminal 工具以 `--headless --json` 方式驱动,消费一条 JSONL 事件流。

> 一句话:**Hermes 是「一个套在学习循环外壳里的网关」——它赌的是:一个 agent 真正的价值,不是它今天多强,而是它能不能把每一次经验攒成明天的技能。**

### 3.3 元层的意义:「harness 编排 harness」为什么在 2026 出现

退一步问一个更根本的问题:为什么偏偏是 2026 年,冒出「harness 驱动 harness」这一层?它和⑩篇的多代理、⑪篇的 MCP/skills 是什么关系?

三个原因催生了它:

- **点 harness 已经足够好、且足够多。** 当 Claude Code、Codex、Gemini CLI 各自都是成熟的、能独立干活的编码 agent,「把它们当积木组合」就变成一件划算的事——你不必重造轮子,直接站在别人的肩膀上编排。
- **有了标准的「接口」。** ⑪篇讲过三根插座:MCP 让 agent 接**工具**、skills 让**能力**可移植、而 **ACP 让 agent 接 agent**。正是 ACP(2025年8月)这根新插座,让「把整个 agent 当子代理调用」从「各家私有 hack」变成「跨家可插拔」。**没有标准,就没有元层。**
- **需求变了。** 人们要的不再只是「陪我写代码」,而是「常驻在后台、多渠道找我、把一队 agent 调度起来把事办完」。这就需要一层管路由、管持久化、管调度、管编排的东西——那正是网关型元 harness 的位置。

和前面两章的关系可以这样对齐:

| 概念 | 出处 | 元层里对应什么 |
|---|---|---|
| **子代理(subagent)** | ⑩篇:同一 harness 派生、独立上下文的「自己」 | 元层把它升级成:**另一套完整 harness** 当子代理 |
| **MCP** | ⑪篇:agent ↔ **工具** 的标准 | 元层里仍用它接外部工具/数据 |
| **ACP** | ⑪篇埋的伏笔:agent ↔ **agent** 的标准 | 元层的**承重墙**:靠它把别的 harness 当子代理 |
| **skills** | ⑪篇:可复用能力包 | 元层里变成**可跨 harness 移植、还能自动生成**的资产 |

> 一句话:**元层不是凭空长出来的,它是⑩篇的子代理、⑪篇的 MCP/ACP/skills 这些零件,在「点 harness 足够成熟」这个前提下自然拼装出的上一层。** OpenClaw 把「子代理」这条线推到极致(子代理=别的 harness),Hermes 把「skills」这条线推到极致(skills 能自己长出来)。

---

## 4. 它们与众不同的设计决策

拆完零件,退一步看两家真正值得学的取舍——每一条都带 trade-off。

- **元编排:把整个 agent 当一个工具(OpenClaw)。** 好处是站在巨人肩膀上——不重造编码能力,直接借最强的 harness。「借力划算」还有实测背书:2026 年的 **Claw-SWE-Bench**(arXiv:2606.12344,350 个多语言实例、8 种语言、43 个仓库)比了五种 harness,发现**换 harness 带来的 Pass@1 摆幅(约 27.4 个百分点)和换模型的摆幅(约 29.4 个百分点)量级相当**;固定 GLM 5.1 这个模型,一个裸的、直出 diff 的最小适配器只有 **19.1%**,而完整适配器能到 **73.4%**——这正是「harness 和模型一样值钱」的硬证据(⚠️ 注意:这里的「OpenClaw」是第三方评测里的一个适配器,不是 OpenClaw 官方跑分器,别当成产品自评)。代价则有两个:**其一,信任边界变模糊**——ACP 那段执行**不套 OpenClaw 的沙箱**,外部 CLI 是以「可信同侪」的身份、用它自己的权限跑的(官方明说这不是沙箱边界);**其二,插件在进程内不隔离**——文档直言「一个恶意的原生插件等价于在 OpenClaw 进程里任意代码执行」。这是拿安全换简单和性能的清醒取舍(⑨篇的护栏,在这里是被主动放松的)。
- **自进化 skills:用久了越来越强(Hermes)。** 好处是 agent 会「成长」——今天教会它的一套流程,明天自动复用。代价是**不确定性与可调试性**:自动生成的 skill 可能是错的、可能污染以后的行为;所以 Hermes 才要配上一整套「危险命令分类 + 冻结快照 + 血缘式压缩」来兜底。自进化不是免费的,它需要更重的护栏来配平。
- **provider 抽象:与模型/供应商解耦(Hermes)。** 好处是 300+ 模型随便换,不被任何一家绑死;还能把杂活甩给便宜的辅助模型省钱。代价是**多了一层抽象的复杂度**——四种传输形状、三种 API 模式的「阻抗匹配」,都是要维护的表面积。而当它把一轮交给 Codex app-server 当 runtime 时,能白捡 Codex 的沙箱和插件生态,却会**丢掉 `delegate_task`、`memory`、`session_search`**(这些需要活的 mid-loop 状态,一个无状态回调驱动不了)——一个很具体的「借力就得让渡一部分能力」的取舍。
- **网关即单一事实源(OpenClaw)。** 一个常驻本地进程管一切,数据全在你手里、简单——代价是单点故障。这是「本地优先」哲学的必然。
- **skills 作为开放标准而非私有格式(两家)。** OpenClaw 的 `SKILL.md`、Hermes 的 agentskills.io,都赌「可移植、可共享」比「私有护城河」更值。这是开源 harness 才敢下的注。

> 一句话:**这两家的设计信条,都是「harness 不该只是一个壳,而该是一个平台」——OpenClaw 赌它是编排别人的平台,Hermes 赌它是攒经验的平台。** 它们各自把⑥篇那句「harness 比模型更重要」又往前推了一层:重要的不只是这一个 harness,而是 harness 组成的**生态**。

---

## 5. 局限与坑

这两家是 2026 年的新物种,越新越要冷静。诚实列几条边界:

1. **它们太新、演进太快,别把任何数字当常量。** 星标(38 万 / 20.9 万)、版本号、provider 数、渠道数、乃至上面那组 benchmark 分……全在高频变动,有些甚至月月大改。凡引用务必带「截至某版本 / 某模型」;把这一章的具体数字当**快照**,不是稳定事实。
2. **元编排叠太多层,极难调试。** 当「你的消息 → OpenClaw 网关 → ACP → Claude Code → 它的子代理 → 模型」串成一条五六层的链,一旦出错,你很难定位是哪一层的锅。**层次每加一层,可观测性就掉一截**——元层的威力和它的调试地狱是一体两面。
3. **ACP / skill 标准仍在碎片化。** ACP 是 2025 年 8 月才有的年轻标准,skill 的开放格式(agentskills.io)治理归属还没完全明朗。**「跨 harness 可移植」目前更多是承诺,不是保证**——不同后端的 resume/续接机制实现并不统一,别指望无缝。
4. **元编排的信任边界被主动放松了,安全要自己扛。** OpenClaw 的 ACP 执行不套沙箱、插件在进程内不隔离(甚至有独立安全研究报告过大量 advisory)。**你在享受「借用外部 harness」的便利时,也继承了它们各自的权限和风险面**。别默认它替你把安全兜住了(对比⑨篇:这里护栏是被有意松开的)。
5. **自动生成的 skill 可能是「学错的经验」。** Hermes 从成功轨迹自动造 skill,听起来很美,但**「一次碰巧成功」不等于「一套正确方法」**。错的 skill 会被复用、会污染后续行为。它靠幻觉门(hallucination gate)、心跳、僵尸检测等机制兜底,但这类自进化系统的失败模式,本质上比「写死的流程」更难预测。
6. **别把它们当「云托管、发完就走」的省心机器。** 它们是**自托管**的——网关、SQLite、渠道凭证、模型密钥全得你自己运维。省心的是「多渠道找你」,不省心的是「这一整套后台是你自己的服务器在扛」。

---

## 6. 一句话记住它们 + 对比表

> **OpenClaw = 一个「套在消息网关外壳里的 agent」,以 ACP 元编排把别的编码 harness 当子代理来驱动,横向借力;Hermes = 一个「套在闭环学习外壳里的网关」,从成功轨迹自动长出可移植的 skill,纵向攒力。它们代表 2026 年 harness 的新形态——不再是「一个壳包一个脑」,而是「一层编排/进化生态」的元层。**

把这一篇的两家,和⑫⑬拆过的点 harness 拉齐对照:

| 维度 | **OpenClaw** | **Hermes** | **Claude Code(⑫)** | **Codex CLI(⑬)** |
|---|---|---|---|---|
| **谁做的** | Peter Steinberger / OpenClaw Foundation(OpenAI 支持) | Nous Research | Anthropic | OpenAI |
| **核心创新** | ACP **元编排**(把别的 harness 当子代理) | **闭环自进化**(自动造 skill + 自我改进) | 极简循环 + 极重 harness(权限/压缩/hooks) | 终端自主编码 + 沙箱/审批 |
| **开放性** | MIT 开源、自托管、本地优先 | MIT 开源、自托管、模型无关(300+ 模型) | 闭源;绑 Claude 模型(SDK 可切第三方后端) | 开源 CLI;绑 OpenAI 模型 |
| **元编排能力** | ★ 招牌:经 ACP 驱 Claude Code/Codex/Gemini CLI 等 | ✔ 能驱 Claude Code/Codex/OpenCode/OpenHands | ✘ 自己就是被编排的那个点 harness | ✘ 同上(可被 Hermes 当 runtime 包住) |
| **skill 机制** | `SKILL.md` 指令包(人写,三层扩展) | agentskills.io 开放标准 + **自动生成/自我改进** | Skill 工具(人写为主) | 插件/工具为主 |
| **主打形态** | 多渠道消息网关(20+ 平台) | 多渠道常驻守护进程(22 渠道) | 终端/IDE 编码 agent | 终端编码 agent |

从⑫到这一篇,你能看到一条清晰的进化线:**点 harness(⑫–⑮)把「一个模型」包成能干活的 agent → 云托管 agent(⑯)把它搬上远端 → 开源浪潮(⑰)让人人能造 → 元层 harness(⑱)开始编排和进化这些 agent 本身。** harness 这个物种,正在从「工具」长成「生态」。

下一篇,我们把镜头从通用 harness 转向一个**具体的垂直战场**——**芯片设计域的 agent 拆解**,看这一整套原理和形态,落到一个真实的、高门槛的工程领域里会长成什么样。板块四(融会贯通与落地)由此开场。

> 👉 继续读 **第 ⑲ 篇:拆解 · 芯片域 agent**。