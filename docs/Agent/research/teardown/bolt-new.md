# Bolt.new 拆解简报

> 快照时间：2026 年年中（mid-2026）。所有星标 / ARR / 估值均标注 as-of 日期。凡估算 / 第三方估计已显式标注。

## 1. 一句话定位 + 出身 + 许可 + 状态

**Bolt.new 是一个「浏览器内的全栈 AI app builder」——把 LLM 编码代理和 StackBlitz 自研的 WebContainer(浏览器内 Node.js 运行时) 焊在一起，让 AI 拥有对文件系统、npm、终端、dev server 的完全控制权，用户在一个聊天框里 prompt → 生成 → 实时预览 → 一键部署，全程不碰云端 VM 也不用本地环境。** 官方 README 一句话：*"AI-powered web development agent that allows you to prompt, run, edit, and deploy full-stack applications directly from your browser."*

- **出品方 / 团队**：**StackBlitz**（CEO **Eric Simons**）。StackBlitz 早在 2017 年就做在线 IDE，WebContainer 技术 2021-05-20 首次公布；Bolt.new 是 2024 年 10 月基于这套底层技术推出的 AI 产品，公司主体从「StackBlitz IDE」重心 pivot 到「Bolt」。
- **许可**：**闭源产品**（bolt.new 本体是 SaaS）。但 StackBlitz 于 2024 年把 **bolt.new 的前身代码以 MIT 开源**放在 `stackblitz/bolt.new`(README 标注 MIT；as-of 报道约 16.4k stars / 14.7k forks)——注意这是历史快照 / 简化版，不是当前生产版本。真正活跃的开源分支是社区维护的 **`stackblitz-labs/bolt.diy`**（MIT，见 §6/§7）。**底层 WebContainer API 本身不是 MIT——商用生产需要单独商业授权**（原型 / POC 免费）。
- **2026 状态：活跃、增长、未被收购、未改名、未停更。** 仍是 StackBlitz 旗下独立产品线。近期动作：**Bolt Cloud**(2025-08，联合 Netlify / Supabase 提供 hosting / 数据库 / auth / serverless)；**2026-05 与 Microsoft 合作**(Azure 原生部署 + 上架 Microsoft Marketplace，此前已在 AWS Marketplace)。重大代理换代：**「v1 Agent」(自研旧代理)正在退役——2026-04-13 起新项目不可选 v1，2026-08-03 后 v1 项目自动迁移到「Claude Agent」**（见 §2/§5）。

## 2. 解决什么问题 + 在栈里的位置 + 与底层 LLM 的关系

**解决的问题**：消灭「本地开发环境 + 云端 CI + 部署」这一整条链路的摩擦。传统 AI 编码工具给你代码片段，你还得自己 `npm install`、跑 dev server、调错、找地方部署；Bolt 把这些全塞进浏览器一个 tab，AI 直接在一个真实（虚拟）Node.js 环境里写文件、装包、起服务、看报错、修，然后一键 deploy。目标用户是「vibe coding」——非专业 / 半专业开发者用自然语言造能跑的 web app 和原型。

**栈内定位**：它是**平台 + 产品**，而非通用编排框架。分层看它是三层的合体：
- **产品层 / harness**：一个专用编码代理（system prompt + 动作协议 + 执行循环），不是 LangGraph / CrewAI 那种可编程编排框架。
- **基础设施层(这是它真正的护城河)**：**WebContainer**——WebAssembly 微内核操作系统，让 Node.js 原生跑在浏览器里(§3)。这层是 StackBlitz 多年自研的，别家(Lovable / v0)通常靠云端 VM / 沙箱，Bolt 靠浏览器。
- **模型层：不自训模型，绑定外部 LLM。** 与底层 LLM 是**深度绑定 Anthropic Claude** 的关系：Bolt.new 从 2024-10 发布起就**独家选用 Claude**（launch 时对应 Anthropic 2024-10-22 升级版 **Claude 3.5 Sonnet**——多方一手材料称 bolt.new 是「新一代代码代理独家用 Claude，30 天 $0→$4M ARR」的典型案例；Anthropic 自己的材料也把它当 Claude 商用旗舰案例引用）。到 2026 年，默认代理已升级为 **「Claude Agent」**（基于 Anthropic 更新的 Claude Sonnet 系列 + Claude Agent 能力，取代自研 v1 Agent），官方称错误更少、对代码库理解更深。**注意**：开源的 bolt.diy 走另一条路——**任意 LLM 可插**（见 §6）。

## 3. 架构与核心组件

Bolt.new 本体闭源，但其开源前身 `stackblitz/bolt.new` 与活跃社区分支 `stackblitz-labs/bolt.diy` 共享同一套架构骨架(下述组件名多取自 bolt.diy 源码 / DeepWiki 拆解 + PostHog 工程报道；bolt.new 生产版细节可能已演进，凡此已标注)。两大子系统：

### A. 代理 / harness 子系统（把 LLM 输出变成动作）
- **系统提示词(`prompts.ts`)**：定义一套自定义 XML 动作协议(见 §4)，把 WebContainer 的能力与约束灌给模型。
- **`/api/chat` 端点**（`app/routes/api.chat.ts`）：服务端接收富化后的用户消息，做**上下文优化 / 窗口化**（从工作区选相关文件而非塞整个代码库），拼系统提示 + 会话历史，调 LLM。
- **`streamText()`（Vercel AI SDK）**：bolt.diy 用 Vercel AI SDK 做多提供商抽象层，以 **SSE 流式**回传 token。
- **`StreamingMessageParser` / `EnhancedStreamingMessageParser`**（`app/lib/runtime/message-parser.ts`）：**边流边解析**——从 token 流里实时抠出 `<boltArtifact>` / `<boltAction>` 结构，边到边排队执行(不用等整条消息)。
- **`ActionRunner`**（`app/lib/runtime/action-runner.ts`）：**顺序执行**动作，管文件锁。
- **`WorkbenchStore`**（`app/lib/stores/workbench.ts`）：中央协调器，`addArtifact()` 建 ActionRunner、`addAction()` 入队、`runAction()` 串行执行；维护**全局执行队列**防竞态。
- 状态管理：**nanostores（全局/workbench）+ zustand（UI）+ 多层持久化(IndexedDB)**。相关 store：`FilesStore`(文件 CRUD + 锁)、`TerminalStore`(终端输出流)、`PreviewsStore`(预览 URL)、`providersStore`(API key / 提供商)。
- 会话持久化：**`useChatHistory`**（`app/lib/persistence/useChatHistory.ts`，落 IndexedDB），支持回滚 / rewind。

### B. 执行器 / 沙箱子系统——WebContainer(这才是独特构件)
据 PostHog 工程报道，WebContainer 内部：
- **Rust 写、编译成 WebAssembly 的微内核 OS**：管进程 / 任务列表。
- **虚拟文件系统**：Rust→WASM，用 **`SharedArrayBuffer`** 让多个 Web Worker 并发访问；POSIX 兼容磁盘操作，实测比 IndexedDB / OPFS 快。
- **进程 / 线程模型**：**每个 Web Worker 当一个 Node 进程**；信号与 stdio 走共享内存标志位。
- **`JSH`**：自研 TypeScript shell，模拟 Bash 命令。
- **虚拟网络栈**：**Service Worker 拦截内部 URL**(如 `/__bolt/3000/…`) 映射到浏览器；WebSocket 桥做热更新(HMR)；数据库客户端走 **TCP tunnel + relay 中继**兜底。
- **模块解析**：自研 TS loader 复刻 Node 模块解析；ESM↔CommonJS 桥。
- **性能**：运行时 bundle < 10 MB；预压缩包层缓存在浏览器；`npm install` 常 < 500ms；build 甩给 Web Worker 防 UI 卡。
- **安全模型**：**100% 代码执行在浏览器安全沙箱内**，无云端 VM、不碰用户本地文件系统 / 硬件(除非显式授权)。

**关键约束(直接塑造系统提示与代理行为)**：WebContainer **不能跑原生二进制**——无 C/C++ 编译、无 g++；**无 `pip`**，Python **仅限标准库**；**Git 不可用**；提示词因此要求「优先 Node.js 脚本而非 shell 脚本」。

## 4. 一步步怎么运转（控制 / 编排回路）——本节最重要

**核心动作协议**：模型不用「函数调用/tool-use JSON」，而是被系统提示要求输出一段自定义 XML——**单个 `<boltArtifact>` 包裹整个方案**，里面若干 `<boltAction>`。真实 schema：
- `<boltArtifact id="kebab-case-id" title="...">`：一个项目一个 artifact；`id` 用 kebab-case，改动时**复用同一 id**(增量更新)。
- `<boltAction type="shell">…</boltAction>`：跑 shell 命令(如 `npm install`)。
- `<boltAction type="file" filePath="...">…完整文件内容…</boltAction>`：写 / 更新文件，`filePath` 必填。
- （bolt.diy 还扩展了 `type="start"` 起 dev server、`type="supabase"` 跑数据库迁移等。）

系统提示的硬性规则（逐条来自 `prompts.ts`）：**「先 HOLISTICALLY & COMPREHENSIVELY 思考再建 artifact」**（先想清所有文件 / 依赖 / 之前改动）；**「永远先装依赖再生成其他 artifact」**（必要时先建 package.json）；**动作有序**——文件必须先存在，才能跑执行它的 shell 命令；**「dev server 已起就别因装新包重跑 dev 命令」**；**「绝不用占位符」**——给完整无截断的文件内容；**「不要啰嗦、除非用户问否则啥都别解释」**。

一次用户请求的完整流经回路（合并 DeepWiki 步骤流 + PostHog 工程细节）：

1. **输入富化**：用户在聊天框输入 prompt；客户端把附件 / 模板 / 当前工作区上下文拼进消息，发往 `/api/chat`。
2. **服务端上下文优化**：`/api/chat` 从 `chatStore` 取历史，从 `FilesStore` 选相关文件(不是整库)，做上下文窗口化以省 token，拼出系统提示 + 项目状态。
3. **模型选择 + 调用**：（bolt.diy 经 `providersStore` 选提供商；bolt.new 生产走 Claude Agent）调 `streamText()`，把系统提示 + 会话历史 + artifact 协议一起送进 LLM。
4. **流式回传**：LLM 输出经 **SSE** 一块块流回浏览器。
5. **边流边解析**：`StreamingMessageParser` 实时从 token 流抠 `<boltArtifact>`/`<boltAction>`，**解析出一个动作就入队一个**——不等整条响应。
6. **建 artifact + 排队**：`WorkbenchStore.addArtifact()` 建 `ActionRunner` 实例；`addAction()` 把 FileAction / ShellAction / StartAction 等塞进**全局执行队列**。
7. **串行执行(防竞态)**：队列**顺序**跑，文件锁防并发改，终端输出按序流出。
8. **WebContainer 引导**：首个动作触发 `@webcontainer/api` 单例初始化——虚拟 FS、shell、端口转发、沙箱就绪。
9. **动作落地**：`ActionRunner` 逐个执行——`FilesStore.updateFile()`→写 WebContainer FS→同步编辑器；shell 命令走 `BoltShell`/JSH→捕获输出→更新 UI；StartAction→`npm install`/build→spawn dev server→端口转发→生成预览 URL。
10. **实时反馈闭环**：文件树、终端输出、预览窗口、diff 视图实时更新；**报错被捕获并作为 alert 呈现**——用户(或代理 auto-fix)可把错误反馈回聊天，触发下一轮修复迭代。
11. **长响应续写**：若 LLM 撞上 max token 上限而 artifact 没写完，触发**续写机制(`CONTINUE_PROMPT`)**——保存当前状态、压缩上下文、发新请求从断点续，历史存 IndexedDB。
12. **下一轮 / 部署**：用户可再 prompt 改需求、rewind 到早期状态、或导出 / 一键部署(经 Netlify / Bolt Cloud)。

**要点**：这是一个**「单 artifact、边流边执行、串行队列」**的回路，而非多代理并行编排。规划被压进「一次 holistic 思考 + 一个大 artifact」，反馈闭环靠 WebContainer 的实时报错回灌。

## 5. Harness 层设计

- **上下文 / 记忆管理**：服务端**上下文优化 + 文件级选择 + 窗口化**(选相关文件而非整库)；会话历史落 **IndexedDB**(`useChatHistory`)支持 rewind / 回滚；撞 token 上限用 **`CONTINUE_PROMPT` 续写**。这是「省 token 的工程化上下文」而非向量记忆。
- **工具接口**：**不用标准 function-calling / MCP，用自定义 XML 动作协议**(`<boltArtifact>`/`<boltAction>`，type ∈ {shell, file, start, supabase…})。好处是能边流边解析边执行、天然表达「有序步骤」；代价是强依赖模型严格遵守 XML 格式(Claude 遵守得好，是它绑 Claude 的原因之一)。
- **规划**：**无显式独立 planner**。规划靠系统提示逼模型「先 holistic 思考、一个 artifact 里排好有序动作(先装依赖→建文件→起服务)」——planning 内联在生成里。
- **多代理交接**：**无。是单代理架构**，非 multi-agent。所有工作在一个执行队列串行跑。（这是刻意取舍：为可预测 / 少竞态。）
- **人在环(HITL)**：以**「持续预览 + 报错回灌 + 自然语言追问」**为主的宽松人在环——用户看实时预览和 diff，随时用下一个 prompt 修正 / rewind；不像 Cline 那种「每个动作逐条审批」。
- **沙箱**：**WebContainer——100% 浏览器内 WASM 沙箱**，无云 VM、不触本地文件系统 / 硬件。这是它与所有「云端沙箱 / 远程 VM」类竞品最根本的隔离模型差异。安全边界即浏览器同源沙箱。

## 6. 与同类相比的独特设计取舍（为什么有人选它）

- **护城河 = WebContainer(浏览器内运行时)**：v0(Vercel) / Lovable / Replit Agent 多数把执行放在**云端 VM / 容器**；Bolt 把整个 Node.js 环境放进**浏览器 tab 的 WASM 沙箱**。取舍：① 服务端零执行成本(「server 就是你的浏览器」)、启动毫秒级、离线可用、隔离更硬；② 代价——**跑不了原生二进制 / pip / 真 Git**，重负载受浏览器内存限制，不适合需要原生依赖的场景。
- **单 artifact + 边流边执行**：相比多步 tool-call 往返，Bolt 一次生成一个完整 artifact 边流边落地，**首字节到可预览更快**、适合「一句话出整个 app」的 vibe coding 体感。取舍是对模型格式遵从度要求高，长项目要靠续写机制。
- **深绑 Claude**：生产版独家 Claude，把「模型不确定性」换成「格式稳定 + 代码质量」；这也是 Anthropic 反复引用它做旗舰案例的原因。取舍：用户在 bolt.new 上换不了模型（要换模型请用 bolt.diy）。
- **全链路闭环(生成→预览→部署→Bolt Cloud)**：不只写代码，还给 hosting / DB / auth / serverless，一站到底。适合非专业开发者，代价是锁定生态。
- **开源逃生舱 bolt.diy**：想自带 LLM(19+ 提供商：OpenAI / Anthropic / Gemini / Ollama / Mistral / DeepSeek / Groq / Bedrock…)、自托管、要 diff / 文件锁 / Electron 桌面版的人，可用社区版——这是「要控制权」用户选它生态的理由。

## 7. 采用度信号

- **`stackblitz/bolt.new`（开源前身）**：as-of 2026 年中报道约 **16.3–16.4k stars / 14.6–14.7k forks**，TypeScript 89.9%。（注：这是历史/简化版仓库，非生产版。）
- **`stackblitz-labs/bolt.diy`（活跃社区分支）**：as-of 抓取约 **19.3–19.5k stars / 10.4k forks**，MIT；由 **Cole Medin** 发起，现为大型社区协作项目(1,600+ commits)；支持 19+ LLM 提供商，基于 Vercel AI SDK。
- **商业指标**：ARR **首周约 $1M → 30 天 $4M → 2 个月 ~$20M → 2025-03 达 $40M**（StackBlitz 投资人更新 / Business Insider / Sacra 报道；官方 2025-03 称已盈利）。用户 **2025-05 报约 500 万注册；2025-12 报超 700 万**（Sacra；含部分第三方口径）。毛利率 **2025-05 约 40%**（Sacra，估）。
- **融资 / 估值**：**2025-01 Series B $105.5M**(Emergence + GV 领投，Madrona / Conviction / Mantis 参投) + 此前未披露 **Series A $22M**；**2025-12 累计融资 $135M**（Sacra）。估值 **2025 年约 $700M**（Forbes / Bloomberg 报道口径，略有出入，标为报道值）。
- **流量(第三方估计,均为估算)**：2026-03 Semrush 估 **5.43M 访问 / 月**、Similarweb 估 3.8M；同期对比 Cursor ~25.5M、Replit ~20.9M(即 Bolt 体量小于纯 IDE 系代理，但在「浏览器 app builder」赛道领先)；平均会话 17 分钟、直接流量占比高(复访强)。
- **知名背书**：**Anthropic 官方**多次把 bolt.new 当 Claude 商用旗舰案例引用；被列为 vibe-coding / AI app builder 代表产品。**未找到公开的「具体企业客户 logo 名单」**（官方多用聚合用户数而非点名大客户）。

## 8. 来源

- StackBlitz `stackblitz/bolt.new` 仓库(README / 系统提示 `app/lib/.server/llm/prompts.ts`)：https://github.com/stackblitz/bolt.new
- `stackblitz-labs/bolt.diy` 仓库(开源社区版)：https://github.com/stackblitz-labs/bolt.diy
- bolt.diy 架构拆解(DeepWiki，含完整请求流 / 组件名)：https://deepwiki.com/stackblitz-labs/bolt.diy
- PostHog《From 0 to $40M ARR: inside the tech》(WebContainer 工程细节 + ARR 时间线)：https://newsletter.posthog.com/p/from-0-to-40m-arr-inside-the-tech
- StackBlitz《Introducing WebContainers》(底层运行时官方公告，2021-05-20)：https://blog.stackblitz.com/posts/introducing-webcontainers/
- Sacra 股权研究页(融资 / 估值 / ARR / Claude 绑定 / Bolt Cloud)：https://sacra.com/c/bolt-new/
- Bolt 官方 Release Notes / Help Center(v1 Agent 退役 → Claude Agent 迁移)：https://support.bolt.new/release-notes
- getpanto.ai《Bolt.new Statistics 2026》(用户 / 流量 / 竞品对比，多为第三方估计)：https://www.getpanto.ai/blog/bolt-new-statistics

---

### 未能核实 / 需注意的口径
- **bolt.new 生产版当前的确切内部组件名**未公开——§3/§4 的类名(`ActionRunner`/`WorkbenchStore`/`StreamingMessageParser` 等)取自开源 bolt.diy 与开源前身，生产版可能已演进；已在正文标注「多取自 bolt.diy」。
- **具体企业客户名单**未找到公开数据(官方只给聚合用户数)。
- **估值口径**($700M)来自 Forbes/Bloomberg 报道而非官方披露，标为报道值；流量数字均为 Semrush/Similarweb **第三方估算**。
- **「Claude Agent」背后的确切 Claude 型号版本**(截至 2026 年中对应哪一代 Sonnet)Bolt 官方未逐版点名，故只说「Anthropic Claude Sonnet 系列 + Claude Agent 能力」。
