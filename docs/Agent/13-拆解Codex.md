# Agent 与 Agent Harness · 第 ⑬ 篇:拆解 OpenAI Codex CLI

> 「Agent 与 Agent Harness」学习系列第十三篇 · 案例拆解板块第二篇 · 与⑫做同题对照。
> 全站地图:①–⑤ 认识 Agent → ⑥–⑪ 认识 Harness → ⑫ Claude Code → **⑬ Codex CLI** → ⑭ Cursor → ⑮ Aider → ⑯–⑲ 更多拆解 → ㉙–㉛ 融会贯通与落地。

---

## 0. 全景:同一道作文题,另一家厂商的答卷

上一篇我们把 **Claude Code** 搬上手术台,逐层对照了⑥–⑪那张「组件地图」。这一篇,我们把它的头号对家也拉上来——**OpenAI Codex CLI**。

选它紧跟 Claude Code,理由很简单:**这是一道「同题作文」。** 两者都是「模型厂商亲自下场、做终端里的自主编码 agent」;都能读代码库、改文件、跑 shell、连 MCP;都用一份项目级 markdown 当记忆。骨架高度相似——所以真正有意思的,不是它们哪里一样,而是**在同一道题上,两家做出了哪些不同的取舍**。

一句话预告这篇的看点:**如果说 Claude Code 把赌注押在「权限模式这根滑杆 + 庞大 hook 系统」上,那 Codex 把赌注押在「操作系统级沙箱」上。** 前者主要靠「问不问你」来控风险,后者先用一道操作系统的硬墙把「能不能做」框死——再谈问不问。这就是本篇的主线。

```
第⑥篇的 7 层 harness 地图            这一篇在 Codex CLI 上逐层验证:
   User / Interfaces           →   CLI(TUI)/ exec 无头 / 桌面 App / VS Code / JetBrains / Cloud
   Agent loop                  →   跑在 Responses API 上、SSE 流式的循环
   Permission system           →   审批策略(approval)+ 沙箱(sandbox)双层正交
   Tools                       →   shell 执行 + apply_patch 补丁 + MCP
   State & persistence         →   AGENTS.md 分层 + 压缩(compaction)
   Execution environment       →   Seatbelt(mac)/ Bubblewrap(Linux)/ 原生 Windows 沙箱
```

> 读这一篇的正确姿势:**边拆边和⑫对表。** 每拆一个部件,问自己一句「Claude Code 这块是怎么做的,Codex 为什么换了个做法」。§6 那张对比表,就是这一整篇的收口。

---

## 1. Codex CLI 是什么、谁做的、现在什么状态

一句话:

> **OpenAI Codex CLI 是 OpenAI 官方开源的、跑在终端里的编码 agent——它在你本地的开发环境里读代码、改文件、执行命令,全程关在一个操作系统级沙箱里,由 OpenAI 的模型驱动。**

几个关键事实(据 OpenAI 官方文档与公开仓库,截至 2026 年中,数字均为快照):

- **谁做的**:OpenAI——GPT/o 系列模型背后的公司。和 Claude Code 一样,这是「模型厂商亲自造 harness」的路线。**别和 2021 年那个老 Codex 搞混**:那个是微调过的 GPT-3 代码补全模型;2025 年起的这个 Codex,是带工具、带沙箱、带多轮循环的完整 agent 系统。
- **什么时候**:**2025 年 4 月 16 日** 首发,最初是一个 **开源的 TypeScript / Node.js** 项目;**2025 年 6 月宣布用 Rust 重写**。截至 2026 年中,代码库已 **约 96.5% 是 Rust**,发布极其高频(大约每 3–7 天一个版本;截至写作时最新是 **v0.142.5,2026 年 7 月 1 日**)。许可证 **Apache-2.0**。
- **跑在什么模型上**:截至 2026 年中,推荐默认是 **`gpt-5.5`**,另有 `gpt-5.4`、`gpt-5.4-mini`(快、给子代理用)、`gpt-5.3-codex-spark`(纯文本研究预览)。这些型号名会随版本快速变动,当快照看。
- **在哪用**:一个引擎、多个门面——交互式 **CLI(TUI)**、无头的 **`codex exec`**、桌面 App(Windows/macOS)、VS Code 扩展、JetBrains/Xcode 集成,以及一条 **Codex Cloud**(异步云端任务、直接开 GitHub PR)的支线。
- **火到什么程度**:据公开报道,Codex 到 **2026 年 3 月中旬**周活跃用户约 **200 万**(这是个 3 月快照;此后 OpenAI 报告 2026 年内更晚时候达到 **500 万+** 周活)。**注意**:常被引用的「五倍增长」指的是**用量**增长,用户数增长约 3 倍——别把两者混为一谈。

**别和它的「支线」搞混**:Codex CLI(本地、你盯着)和 Codex Cloud(云端、异步、发完就走)是两种形态。这一篇主拆 CLI;Cloud 那种「派出去、明天收 PR」的托管形态,更接近我们⑯篇要讲的云 agent。

> 一句话:**Codex CLI = OpenAI 版的「本地终端编码 agent」,一个零依赖的 Rust 二进制,把自己关在系统沙箱里干活。** 记住这句,后面全是展开。

---

## 2. 一次任务在它体内怎么流动

老规矩,拆零件之前先看**血液怎么流**。还是那个熟悉的场景,你在项目里敲下:

> 「测试挂了,帮我修好。」

Codex 内部大致这样走一圈(对照②篇「单步」、⑦篇「循环工程」,并留意它和⑫那张流程图的异同):

```
你的 prompt / codex exec 'PROMPT'
   │
   ▼
① 组装指令    分层 AGENTS.md 拼进系统指令前缀
             (全局 ~/.codex/AGENTS.md → 项目根 → 目录级,近的覆盖远的)
   │
   ▼
② 构造请求    系统指令 + 工具定义(Responses API schema) + 对话历史
             └─ 稳定前缀刻意保持不变 → 尽量命中 prompt cache(省钱)
   │
   ▼
③ 调 API      HTTP POST 给 Responses API → 结果以 SSE 流式回来
             (response.output_text.delta 一段段实时显示在 TUI 里)
   │
   ▼
④ 判断轮次    收到「最终助手消息」→ 本轮结束;收到「工具调用」→ 进审批
   │
   ▼
⑤ 审批闸门    看当前 approval policy:untrusted / on-request / never
             └─(可选)approvals_reviewer=auto_review → 交给「审查子代理」先过一遍
   │
   ▼
⑥ 沙箱执行    工具在操作系统级沙箱里跑(read-only / workspace-write / danger-full-access)
             └─ 沙箱是「硬技术边界」,审批是「软同意层」——两者正交
   │
   ▼
⑦ 回填 & 循环  工具输出追加进 buffer → 回到 ③;token 涨大时触发 compaction
   │
   ▼
⑧ 收尾        模型返回「助手消息」(而非工具调用)→ 循环结束
             (exec 模式可用 --output-last-message 抓最终消息)
```

三个值得当场记住的细节,恰好是它和 Claude Code 分野的地方:

- **两道关卡,不是一道**:一个工具调用要落地,先过 **审批**(问不问你),再过 **沙箱**(操作系统允不允许)。这是 Codex 最核心的设计——**「能做什么」和「要不要问」被拆成两根正交的轴**(见 3.3 / 3.4)。
- **稳定前缀是省钱的关键**:系统指令 + 工具定义这段刻意保持长而不变,让每次只有「尾巴」在变,从而反复命中 prompt cache——哪怕每次都把整段历史发出去,成本也能压到接近线性(见 3.1)。
- **压缩发生在服务端**:上下文吃紧时,Codex 走 `POST /responses/compact`,把历史压成一个**加密的 compaction 项**回填,而不是在本地拼一段文字摘要(见 3.5)。

> 一句话:**Codex 的一次任务,是⑦篇那个 while 循环踩着 Responses API、过着「审批 + 沙箱」双闸门、必要时叫服务端帮它压缩历史——把「修好测试」磨成几十步、每步都关在墙里的真实动作。**

---

## 3. 拆开看它的组件

现在对着⑥篇的 7 层栈,逐个部件拆,并随手和⑫对照。

### 3.1 Agent loop 与模型:跑在 Responses API 上的「无状态友好」循环

Codex 的循环骨架和任何 agent 一样朴素:调模型 → 拿到工具调用 → 执行 → 回填 → 再调。特别之处在**它跑在哪条 API 上、以及历史怎么带**。

- **底座是 Responses API + SSE**:循环驱动 OpenAI 的 **Responses API**,响应以 **Server-Sent Events(SSE)** 流式回来。CLI、Cloud、SDK 三者**共用 Responses API 这一层底座**——这是 Codex 整个架构的公共地基(对比:Claude Code 底座是 Anthropic 自家的 Messages/Agent 那套)。
- **「无状态友好」的历史链接**:Codex 偏好 **无状态的 input-array 链接**——把上一轮的输出、压缩项直接拼进下一次请求的输入数组里再发出去。好处是**对 Zero-Data-Retention(零数据保留)友好、跨供应商可移植**。

这里要特别澄清一个常见误解(素材的核查雷区):**不能说「Codex 每个请求都是无状态、从不用 `previous_response_id`」。** 据 OpenAI 官方压缩文档,`previous_response_id` 链接**同样是被支持的模式**,只是 Codex 默认更偏向无状态那条路。所以准确的说法是:**「无状态友好、但不排斥有状态链接」。**

> 反直觉的点:**每次把整段历史都重发一遍,听起来贵得离谱,其实不然。** 只要把「系统指令 + 工具定义」这段稳定前缀做得长而不变,prompt cache 会反复命中,真正付全价的只有那条不断变长的「尾巴」——成本因此接近线性,而不是随轮数爆炸。这是⑧篇「上下文即预算」的又一个活样本。

### 3.2 工具:shell 执行 + apply_patch 补丁,而非一堆细粒度文件工具

这是 Codex 和 Claude Code 在**工具哲学**上最鲜明的分叉。

回忆⑫:Claude Code 有约 42 个内置工具,光「改文件」就分了 Edit / Write / NotebookEdit 好几个。Codex 走的是另一条路——**收敛到两类核心动作**:

- **shell 执行**:模型要看什么、找什么、跑什么(`grep`、`cat`、`npm test`……),基本都通过在沙箱里执行 shell 命令完成。
- **`apply_patch` 统一补丁**:模型要**改代码**,不是调一堆细粒度的文件工具,而是产出一份**统一格式的补丁**,由 `apply_patch` 一次性落地。

**为什么用一个统一的补丁工具,而不是一堆细粒度文件工具?** 这背后是③篇「代理-计算机接口(ACI, agent-computer interface)」的思路:

1. **补丁是「原子的、可审计的」**:一次编辑就是一份 diff——你(和审批层、沙箱)看到的是「它到底要改哪几行」,而不是一连串零散的写操作。**要放行还是拦下,一眼能判断爆炸半径。**
2. **少一个工具,就少一份要塞进上下文的 schema**,也少一个模型会用错的接口。工具面越窄,模型越不容易在「该用哪个工具」上翻车。
3. **和 shell 天然合拍**:补丁本来就是 Unix 世界的通用货币,`apply_patch` 让「改代码」这件事回到了工程师熟悉的 diff 语汇里。

> 一句话:**Claude Code 给模型「一整套精细工具」,Codex 给模型「一把 shell + 一种补丁」。** 前者接口丰富、表达力强;后者面窄、可审计、和操作系统贴得更紧——为它下一节的沙箱铺好了路。

### 3.3 沙箱:把「爆炸半径」用操作系统硬框死

这是 Codex 最招牌、也最值得对着⑨篇看的一层。**它的核心信条是:别指望模型永远听话,先用一道操作系统的硬墙,把它「最多能碰到什么」框死。**

沙箱有三档能力(截至 2026 中):

| 沙箱模式 | 它允许什么 |
|---|---|
| **`read-only`** | 只能读,不能改文件、不能联网。 |
| **`workspace-write`(默认)** | 能读、能改**工作区内**的文件;网络默认受限。 |
| **`danger-full-access`** | 护栏全开——名字里带 `danger`,就是提醒你后果自负。 |

关键在于它**怎么落地这道墙**——用的是**各操作系统原生的沙箱机制**,而不是自己发明一套(据官方沙箱文档,截至 2026 中):

- **macOS**:用系统内置的 **Seatbelt** 框架。
- **Linux / WSL2**:用 **Bubblewrap(`bwrap`)**。
- **Windows**:用**原生 Windows 沙箱**(在 WSL2 下,则改走 Linux 的 `bwrap` 那条路)。

> ⚠️ 两处求准确(避坑):其一,当前官方文档在 Linux 上主推的是 **Bubblewrap**;早期材料里常见的「Landlock / seccomp」是**历史提法**,不要当成「当前机制」写。其二,macOS 的 Seatbelt 就是「系统内置框架」,**没有任何官方「已弃用(deprecated)」的说法**——别道听途说地给它扣「deprecated sandbox-exec」的帽子。

这道沙箱,就是①⑨篇反复讲的「**限制爆炸半径(blast radius)**」的教科书实现:**不是靠说服模型「你别乱来」,而是靠操作系统让它「就算想乱来也做不到」。** 对比之下,Claude Code 的主力护栏是权限模式与 hook(软控制为主),Codex 则把「操作系统级硬隔离」摆在了第一位——这是两家最实质的路线差异。

### 3.4 审批模式:和沙箱正交的另一根轴

上一节讲「**能**做什么」,这一节讲「做之前**问不问**你」。Codex 特意把这两件事拆成**两根正交的轴**——这是理解它安全模型的钥匙。

审批策略(approval policy)三档(截至 2026 中):

| 审批策略 | 什么时候问你 |
|---|---|
| **`untrusted`** | 只有「已知安全的读操作」自动跑,其余都要问。 |
| **`on-request`** | 当某个动作**要越过沙箱边界**时,才弹出来问你(交互式默认组合里常见)。 |
| **`never`** | 从不问——给 CI/CD 全自动流水线用。 |

再加一个进阶挡位:把 `approvals_reviewer` 设成 **`auto_review`**,符合条件的请求会先被一个**「审查子代理」**过一遍——它专门检查数据外泄、凭据探测、持续削弱安全、破坏性操作这几类风险,并且在「构造/审查/解析失败」时**默认拒绝(fail closed)**。这是「一个 agent 干活、另一个 agent 在放行前先审」的多代理信任层(见 4)。

**和 Claude Code 的模式对照着看**(⑫的 3.4):
- Claude Code 是**一根滑杆**:从 `plan`(事事先规划)一路滑到 `bypassPermissions`(全自主),Shift+Tab 循环 4 档——它把「问不问 + 敢不敢做」揉在同一根轴上。
- Codex 是**两根轴的网格**:一边是「沙箱能力」(read-only↔full-access),一边是「审批策略」(untrusted↔never),二者组合。所以交互式默认约等于 `workspace-write` + `on-request`——**能改工作区,越界才问**。

> 反直觉的点:**「能不能做」和「问不问你」根本是两回事,把它们拆开反而更清楚。** 沙箱回答「这个 agent 有什么能力」,审批回答「它动手前要不要经过你同意」。分成两根轴,你就能精确调出「能力放宽但审批收紧」或「能力收死但不打扰我」这类组合——这是 Codex 在⑨篇「权限设计」上给出的独到答卷。

### 3.5 AGENTS.md 与配置:一份跨工具的开放约定

对照⑫里的 CLAUDE.md,Codex 用的是 **AGENTS.md**——同一类东西:**放在项目里、每次会话读进系统指令的项目级人写指令。** 但有两个关键区别值得记住:

- **分层拼接,近的覆盖远的**:从全局 `~/.codex/AGENTS.md` → 项目根 → 目录级,一路拼进系统指令前缀,越靠近当前目录的越优先——**这个层级思路和 `.gitignore` 一模一样**,天然把「操作者级约束」和「用户级指令」分了层。
- **AGENTS.md 是一个开放约定,不是 Codex 私有格式**:这是它和 CLAUDE.md 在定位上最不一样的一点。CLAUDE.md 是 Claude Code 自家的原生格式;**AGENTS.md 则是被多个工具共享的跨工具约定**——同一份文件,理论上能被不同的 agent 工具读(截至 2026 中,连 Claude Code 都已能读 AGENTS.md,只是 CLAUDE.md 仍是它更丰富的原生格式)。

配置层面还有个上限:AGENTS.md 有个 `project_doc_max_bytes` 的字节上限(社区常引「默认 32 KiB」,但官方 config-reference 未明确给出这个数字,所以这个具体值按「拿不准就降级措辞」处理——**只说「有字节上限」,不把 32 KiB 当确凿事实写死**)。

> 一句话:**AGENTS.md 之于 Codex,约等于 CLAUDE.md 之于 Claude Code——但它更像一份「跨工具的行业公约」,而非一家的私有格式。**

### 3.6 MCP:同一套外部工具协议

对照⑪篇,Codex 的可扩展性主要走 **MCP(Model Context Protocol,模型上下文协议)**:第三方工具通过在配置里声明 `mcp_servers` 接入,**同时支持 stdio 和 HTTP streamable 两种服务器**。

这一点上 Codex 和 Claude Code **站在同一个生态里**——MCP 是两家(以及整个行业)共用的「外部工具/数据源接口」。所以你为一个工具写的 MCP server,理论上两边都能连。**扩展生态是它们为数不多的「真·同款」之处。**

---

## 4. 它与众不同的设计决策

拆完零件,退一步看 Codex 的「设计哲学」——这些取舍才是真正值得学的。

- **Rust 重写 + 零依赖二进制。** 2025 年 6 月从 Node.js 换到 Rust,换来:甩掉 Node 运行时、直接触达操作系统沙箱 API(无 FFI 开销)、长循环里没有 GC 停顿、还能对外暴露一套**语言无关的线协议**——于是 TypeScript/Python 的 SDK 能在**不重写内核**的前提下扩展这个 agent。**trade-off**:Rust 内核门槛更高、迭代改动更重;但对一个要频繁跑长时任务、还要贴着操作系统做隔离的 agent 来说,这笔账划算。(顺带:它是个 Rust Cargo 工作区,位于 `codex-rs/`,**约含 130+ 个成员 crate**——早期材料流传的「~70 个」是明显低估,别再引用那个数字。)

- **沙箱优先(security-first)。** 把「操作系统级硬隔离」摆在护栏体系的第一位,而不是主要依赖「多问你几次」。**trade-off**:沙箱在不同平台上机制不同(Seatbelt / bwrap / Windows 原生),行为可能有平台差异;而且沙箱管得住「文件/网络」,管不住「模型在允许范围内做了蠢事」——所以它才需要审批层和 auto-reviewer 兜另一半。

- **`apply_patch` 的补丁哲学。** 用「一份统一补丁」而非「一堆细粒度文件工具」来落地编辑,让每次改动都是原子、可审计的 diff——**和沙箱、审批天然合拍**(要放行的东西,一眼能看清)。**trade-off**:补丁格式对模型的「一次性产出正确 diff」能力要求更高,不像逐次小编辑那样容错。

- **与 Responses API 深绑定。** 循环、压缩(`/responses/compact`)、prompt cache 全都建在 Responses API 这条底座上,CLI/Cloud/SDK 共用。**trade-off**:换来一致性与省钱(稳定前缀缓存),代价是**和 OpenAI 的模型/API 绑得很紧**——不像有些工具能轻松换后端。

- **多代理默认开、但有天花板。** `features.multi_agent` 默认开启;但 `max_threads` 默认 **6**、`max_depth` 默认 **1**(根会话从深度 0 起)——**故意给递归设了天花板**,防止子代理无限套娃跑飞。这和「auto-reviewer 失败时默认拒绝」是同一种保守心态:**宁可保守失败,不可放飞。**

> 一句话:**Claude Code 的信条是「让循环笨一点、让 harness 强一点」;Codex 的信条则是「先用操作系统把墙砌死,再谈其它」。** 一个把可靠性押在确定性的 harness 工程上,一个把安全押在操作系统的硬隔离上——同题作文,答案各有侧重。

---

## 5. 局限与坑

诚实地说几条边界(也提醒你别神化它,尤其别踩这几个「引用雷区」):

1. **各种「数字/版本号」是快照,不是常量。** `gpt-5.5` 等型号名、v0.142.5 版本号、130+ crate 数、每 3–7 天一发……都随高频版本变。教学/引用时务必带「截至 2026 中」,别当稳定事实。**尤其别再引「~70 个 crate」——那是被证伪的低估。**
2. **Terminal-Bench 之类的跑分,不要当事实引用。** 关于「Codex vs Claude Code」在 Terminal-Bench 2.1 上的比分,第三方来源**互相打架**(同一模型能被报成 74.6% / 78.9% / 78.2% / 83.4% 好几个值),且**强依赖 harness 配置**,没有 OpenAI/Anthropic 的一手来源。**当「仅供参考的坊间数据」,绝不写成「谁赢了」。**
3. **「无状态」别说过头。** 准确说法是「无状态**友好**」——`previous_response_id` 的有状态链接同样被支持。写成「Codex 从不带状态」就是过度断言。
4. **沙箱管得住文件/网络,管不住「愚蠢但合规」的操作。** 墙只框「能碰到什么」;在允许范围内,模型照样可能改错、删错。所以审批层和 auto-reviewer 是必要的另一半,别以为「有沙箱就绝对安全」。
5. **`danger-full-access` / `never` 一开,风险自己扛。** 沙箱和审批的护栏都可以亲手关掉;一旦关掉,爆炸半径就交还给你了(见⑨篇的坑)。
6. **和 OpenAI 生态绑得紧。** 深绑 Responses API 与自家模型,是一致性与省钱的来源,也是「换后端不自由」的代价——这一点在选型时要心里有数。

---

## 6. 一句话记住它 + 横向对比

> **OpenAI Codex CLI = 一个「沙箱优先」的开源终端编码 agent:零依赖 Rust 二进制,跑在 Responses API 上,用 shell + apply_patch 干活,把「能做什么(沙箱)」和「要不要问(审批)」拆成正交两根轴,先用操作系统把墙砌死再谈自主。它是 Claude Code 这道同题作文的「另一种答法」。**

和⑫ Claude Code 逐项对照(这张表是本篇的收口;细节各见对应小节):

| 维度 | **OpenAI Codex CLI(⑬)** | **Claude Code(⑫)** |
|---|---|---|
| **谁做的 / 底座** | OpenAI;跑在 **Responses API + SSE**,CLI/Cloud/SDK 共用 | Anthropic;Anthropic 自家 API 底座 |
| **实现语言 / 形态** | **Rust 重写**、零依赖二进制(约 96.5% Rust,~130+ crate) | Node.js 系(npm 包 ~2026 年初已弃用,转原生安装) |
| **权限 / 安全模型** | **沙箱 + 审批「正交两根轴」**:沙箱(read-only/workspace-write/danger-full-access)× 审批(untrusted/on-request/never) | **一根权限滑杆**(plan→…→bypassPermissions,Shift+Tab 4 档)+ deny-first + auto 分类器 |
| **沙箱机制** | **操作系统原生**:Seatbelt(mac)/ Bubblewrap(Linux)/ 原生 Windows | 有沙箱/云 VM,但主力护栏是权限模式 + hook(软控制为主) |
| **改文件的工具** | **shell + `apply_patch` 统一补丁**(面窄、可审计) | 一整套细粒度工具(Edit/Write/NotebookEdit… 约 42 个内置) |
| **记忆文件** | **AGENTS.md**(分层、**跨工具开放约定**) | **CLAUDE.md**(分层、Claude Code 原生格式) |
| **多代理** | 默认开;**审查子代理 auto-review** + 深度/线程天花板(max_depth 1、max_threads 6) | 子代理主打「上下文隔离」,只回摘要 |
| **扩展生态** | **MCP**(stdio + HTTP) | **MCP + ~31 类 hook × 5 种实现 + skills + Agent SDK** |
| **上下文压缩** | 服务端 **`/responses/compact`**,压成加密 compaction 项 | 本地 **5 段式压缩**流水线(便宜→昂贵) |
| **形态定位** | 本地 CLI + **Codex Cloud**(异步云端、开 PR)双形态 | 本地为主(可选云)、人始终在环、随时可打断 |

**怎么记这一整篇?** 一句话:**同一道「终端自主编码 agent」的题,Claude Code 靠「重 harness + 权限滑杆 + 庞大 hook」作答,Codex 靠「Rust 零依赖 + 操作系统沙箱 + 审批/沙箱正交两轴 + apply_patch 补丁」作答。** 谁更好没有标准答案——但把这两份答卷对着读,你就真正读懂了「终端编码 agent」这条流派的取舍空间。

下一篇,我们换个赛道:从「终端流」跳到「IDE 里」——拆 **Cursor**,看一个 **AI 原生 IDE** 是怎么把 agent 揉进可视化编辑、内联 diff 的另一套形态里。

> 👉 继续读 **第 ⑭ 篇:拆解 Cursor**。