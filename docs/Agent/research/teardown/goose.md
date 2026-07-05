# Goose 事实底稿（快照：2026 年年中）

> 拆解对象：**Goose**（曾名 "codename goose"）——本地优先、MCP 原生的开源 AI agent 框架，CLI + 桌面 + API 三入口。
> 底稿口径：只写可溯源断言；估算/单来源项已显式标注；找不到写「未找到公开数据」。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**：一个「跑在你自己机器上」的通用 AI agent 框架/运行时——桌面 app、CLI、可嵌入 API 三种形态，把任意 LLM 接到真实动作（读写文件、跑命令、跑测试、装依赖），工具面全部走 MCP。官方仓库自述：*"an open source, extensible AI agent that goes beyond code suggestions - install, execute, edit, and test with any LLM"*（[GitHub](https://github.com/aaif-goose/goose)）。
- **原出品方**：**Block, Inc.**（即 Square / Cash App / Afterpay 母公司）的 Open Source Program Office，2025-01-28 首次发布（[block.xyz](https://block.xyz/inside/block-open-source-introduces-codename-goose)）。
- **许可**：**Apache-2.0**（自发布至今一致，[GitHub](https://github.com/aaif-goose/goose) / [block.xyz](https://block.xyz/inside/block-open-source-introduces-codename-goose)）。
- **2026 状态：活跃，且发生治理迁移（关键事件，非停更/非被收购）**。
  - Block 把 Goose **捐给了 Linux Foundation 新成立的 Agentic AI Foundation（AAIF）**，与 Anthropic 的 **MCP**、OpenAI 的 **AGENTS.md** 一同作为 AAIF 的创始项目。Linux Foundation 官方新闻稿日期 **2025-12-09**（[linuxfoundation.org](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)）。AAIF 铂金会员：AWS、Anthropic、Block、Bloomberg、Cloudflare、Google、Microsoft、OpenAI。
  - **GitHub 仓库迁移**：`block/goose` → `aaif-goose/goose`（`block/goose` 现为跳转）。官方博客《goose has a new home》日期 **2026-04-07**（[goose-docs.ai blog](https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/)）。
  - ⚠️ **日期口径小分歧**：第三方文章（Arcade、部分博客）称捐赠发生在「2025 年 11 月」，但 Linux Foundation 正式新闻稿为 2025-12-09；以官方新闻稿为准，11 月很可能是内部/预告口径。
  - **活跃度证据**：最新 release **v1.41.0，2026-07-03**（本底稿写作前一天，[GitHub releases](https://github.com/aaif-goose/goose)）；仍高频发版。**未改产品名**（仍叫 goose），未见被收购或停更。

---

## 2. 解决什么问题 / 技术栈位置 / 与 LLM 的关系

- **解决的问题**：把「LLM 能推理」和「在真实环境里落地执行」之间那段 toil（体力活）自动化——不是给代码补全建议，而是自主 read/write files、run code and tests、refine outputs、install dependencies（[block.xyz](https://block.xyz/inside/block-open-source-introduces-codename-goose)）。CTO Dhanji Prasanna 的说法是 "reduce toil and give people time back"。
- **栈内位置**：它同时是 **agent** 和 **harness/运行时**——一个第三方分析把它形容为 *"more like an executable Agent Runtime than a conversation-centric product"*（[jimmysong.io](https://jimmysong.io/blog/goose-aaif-agentic-runtime/)）。更精确的分层（Arcade 引用 Goose 团队 Rizel Scarlett 的比喻，[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/)）：
  - **LLM = "游戏卡带"**（推理能力，可换）；
  - **harness = agentic loop**（把输入喂给模型、执行工具、迭代到完成）——**这就是 Goose 本体**；
  - **tools = MCP 兼容的 extensions**。
- **与底层 LLM 的关系**：**模型无关（model-agnostic）**。官方称支持 15+ providers：Anthropic、OpenAI、Google、Ollama、OpenRouter、Azure、Bedrock 等；还能通过 **ACP** 复用你已有的 Claude/ChatGPT/Gemini 订阅（[GitHub README](https://github.com/aaif-goose/goose)）。构建期内置约 **~1700 个模型**的能力注册表用于能力发现（单来源：[DeepWiki](https://deepwiki.com/block/goose)，⚠️数字未在官方 README 复核）。

---

## 3. 架构与核心组件（点名真实构件）

Goose 是一个 **Cargo workspace（Rust 为主）+ TypeScript/Electron 桌面 app** 的组合。语言占比（GitHub 显示）：Rust ~66.8% / TypeScript ~27.3%，其余 Python/Shell/JS/HTML 少量。真实 crate/二进制（[DeepWiki](https://deepwiki.com/block/goose)）：

| 组件 | 角色 |
|---|---|
| **`goose`（core library crate）** | 中枢：Agent Core 编排、LLM provider 抽象层、extension 生命周期管理、**SQLite 会话持久化**、recipe 模板执行、模型能力注册表 |
| **`goose-cli`（binary: `goose`）** | 交互式 session、recipe 执行、provider 配置——终端入口 |
| **`goose-server`（binary: `goosed`）** | 基于 **Axum** 的 HTTP + WebSocket 后端，暴露 agent 能力；通常由桌面 app 拉起 |
| **`goose-mcp`** | Goose 自带的内置 MCP servers：文件操作、shell 执行、GUI 自动化（computer-controller）、持久化 memory |
| **Electron 桌面 app（TS）** | macOS / Linux / Windows GUI，前端连 `goosed` |

**Agent Core 内的逻辑子系统**（[DeepWiki](https://deepwiki.com/block/goose) / [maxamillion.sh](https://maxamillion.sh/blog/stop-building-agents-start-harnessing-goose/)）：
- **Agent Core / 对话循环**：ReAct 风格的交互 loop——「所有能力都从 extension 系统来，core 本身极小」（*"The agent core itself is minimal, it's an interactive loop plus context management. That's it."*）。
- **Extension Manager + Tool Execution Pipeline**：加载/路由 MCP 工具。
- **Context Management 层**：长历史 compaction（摘要压缩以留在 token 预算内）。
- **Permission System**：工具审批模式、认证、prompt-injection 检测。
- **Recipe Engine**：Jinja 模板 + YAML 声明式工作流。
- **Tool Shim**：给不原生支持 tool-calling 的模型（如某些 Ollama 本地模型）做工具调用适配（experimental，用一个本地 interpreter 模型规整接口）。

---

## 4. 一步步怎么运转（控制/编排回路）——**本节最重要**

用户请求实际流经的回路（综合 [DeepWiki](https://deepwiki.com/block/goose)、[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/)、[maxamillion.sh](https://maxamillion.sh/blog/stop-building-agents-start-harnessing-goose/)）：

1. **入口分流**：用户从 CLI（`goose` 二进制）、桌面 app（走 `goosed` 的 HTTP/WebSocket），或 API 发起请求——三条路径**都汇聚到 core library**。
2. **会话初始化**：Agent 建立/加载一个 **session**（元数据 + 历史 + 工具调用日志，持久化在 **SQLite**）。启动时把已启用的 **extensions**（MCP servers）注册进 Extension Manager，聚合它们暴露的 tool schema；若配置了 recipe，则先加载 recipe 里声明的 extensions（跑完即卸载）。
3. **Provider 解析 + 组装请求**：core 解析选中的 LLM provider，把系统提示 + AGENTS.md（若有）+ 会话历史 + 可用工具清单组装成一次模型调用（非原生工具模型走 Tool Shim 规整）。
4. **模型返回计划/工具调用**：LLM 返回文本或 **tool call**。Arcade 的官方口径：*"Goose handles the agentic loop: sending user input to the model, receiving a plan, executing tools, and iterating until the task is complete."*
5. **权限闸门（人在环）**：在把工具真正执行前，**Permission System** 按当前 mode 决定——`Completely Autonomous` 直接执行；`Manual Approval` 逐个弹确认；`Smart Approval` 用**风险分级**自动放行低风险、拦截高风险；`Chat Only` 根本不执行工具。工具级还能覆写为 Always Allow / Ask Before / Never Allow。
6. **工具执行**：批准后经 **Tool Execution Pipeline** 把调用派发给对应 **MCP extension**（文件 I/O、shell、GitHub、浏览器、数据库、内部 API……），拿回结果。
7. **结果回灌 + 迭代**：工具结果作为新一轮消息回写进会话历史，再次调 LLM——**plan → call tools → evaluate → repeat** 的通用核心 loop 持续转，直到任务完成或用户终止。
8. **上下文管理穿插其中**：历史逼近 token 预算时，Context Management 层做 **compaction**（摘要旧历史、保留关键信息），保证 loop 能长跑。
9. **（可选）子任务派发**：在 autonomous 模式下，Agent 可自行判断把子任务交给 **subagent**（隔离 session、可限制 extension 子集）或调 **subrecipe**（见 §5），结果汇回主 session。

**Recipe 化的运转（Block 内部规模化的关键机制）**：一个 recipe 就是一份 YAML，字段含 `name` / `description` / `params`（带类型的输入变量，等于把 recipe 变成「函数」）/ `extensions`（本次运行动态挂载、跑完丢弃的 MCP servers）/ `prompt`（编号步骤，充当**规划骨架**，agent 不必每次重新发明流程）。调用示例：`goose recipe run review-pr --params pr_url=...`。recipe 是可提交进仓库、和被操作代码放一起的产物（`recipes/review-pr.yaml`）。（[the-agent-report](https://the-agent-report.com/2026/05/block-goose-ai-agent-recipe-runner-scaled-60-percent/) / [maxamillion.sh](https://maxamillion.sh/blog/stop-building-agents-start-harnessing-goose/)）

---

## 5. Harness 层设计

- **上下文/记忆管理**：会话历史存 **SQLite**；长会话由 Context Management 层做 **compaction/摘要**。内置 **memory** MCP extension 提供跨会话持久记忆。（[DeepWiki](https://deepwiki.com/block/goose)）
- **工具接口**：**MCP 原生**——任何 MCP server 即插即用成为能力；官方称可连 **70+ extensions**（databases / APIs / browsers / GitHub / Google Drive…，[README](https://github.com/aaif-goose/goose)）。Goose 是**公开可用的第一个 MCP client**，并把自己定位成 **MCP reference implementation**——MCP server 开发者拿 Goose 做兼容性测试（[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/)）。
- **规划**：
  - **Plan-before-work / Planner 模式**：可先出计划再执行（[goose-docs: creating-plans](https://goose-docs.ai/docs/guides/context-engineering/creating-plans/)）。
  - **Lead/Worker 多模型**：`GOOSE_LEAD_MODEL`（+ 可选 `GOOSE_LEAD_PROVIDER`）用「强推理模型做规划」+「快模型做执行」；`GOOSE_PLANNER_PROVIDER`/`GOOSE_PLANNER_MODEL` 把规划与执行拆到不同模型（例：GPT 规划、Claude 执行）。（多来源，含 [GitHub issue #4036](https://github.com/aaif-goose/goose)、[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/)；⚠️环境变量名以官方 config 文档为准，本底稿未逐字复核 docs 原文）
- **多 agent 交接**：
  - **Subagents**：用自然语言临时召唤的一次性 AI 实例，可**顺序**（"first…then"）或**并行**（"parallel/concurrently"）执行；默认继承主 session 全部 extensions，可按需收窄（"only the developer extension"）；需挂 `summon` 平台 extension 才有 delegate 工具；**默认 5 分钟超时**，失败/超时则该实例无输出；**硬约束**：subagent 不能再生 subagent（防无限递归）、不能开关 extension、不能管调度。只在 **autonomous** 模式自动派生（manual/smart/chat-only 下禁用）。（[goose-docs: subagents](https://goose-docs.ai/docs/guides/context-engineering/subagents/)）
  - **Subrecipes**：预写好的可复用工作流文件（只能 YAML），带参数化，跑在隔离 session、**无共享状态**——适合可重复的多 agent 编排。subagent vs subrecipe 的取舍是 Goose 文档专门讲的一课。
- **人在环**：即上文 4 档 permission 模式 + 工具级 Always/Ask/Never 覆写；可在会话中用 `/mode approve`、`/mode smart_approve` 切换。默认 **Completely Autonomous**。（[goose-docs: goose-permissions](https://goose-docs.ai/docs/guides/managing-tools/goose-permissions)）
- **沙箱/安全**：Permission System 内含 **prompt-injection 检测**；Block 工程团队公开写过对自家 agent 做 red-team 的实践（[engineering.block.xyz](https://engineering.block.xyz/blog/how-we-red-teamed-our-own-ai-agent-)）。⚠️ 未找到 Goose 内置强隔离 OS 级沙箱（如容器/VM 强制隔离）的官方证据——它主要靠权限闸门 +（可选）subagent 的工具收窄，而非进程级硬沙箱；如需强隔离通常靠用户自建环境。

---

## 6. 独特设计取舍（为什么有人选它）

- **本地优先 + 模型无关**：Rust 二进制整体跑在**用户机器上**，可接云 provider 也可全本地（Ollama / Llama / Qwen），不被绑死在某家云或某个模型——这是相对 Claude Code/Codex 等「与自家模型强绑定」产品的核心差异（[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/)）。
- **"Harness 才是护城河" 的哲学**：core loop 刻意做薄、做成通用商品；能力全靠 extension/recipe/skill 组合。一篇被广泛引用的博客把这套主张概括为 *"the agent is mature enough to be the commodity. The harness is your competitive advantage"*、*"stop building agents, start harnessing Goose"*（[maxamillion.sh](https://maxamillion.sh/blog/stop-building-agents-start-harnessing-goose/)）。
- **Recipe = 可提交的产物**：一份 30 行 YAML 就能让「一个 CLI」服务全公司不同岗位；recipe 与代码同仓、可 review、可参数化复用——这是它从工程扩散到销售/设计/产品的机制（[the-agent-report](https://the-agent-report.com/2026/05/block-goose-ai-agent-recipe-runner-scaled-60-percent/)）。
- **MCP reference implementation + 中立治理**：Goose 与 MCP 是同源问题的两面（Block 早期即 MCP spec 贡献者），入 AAIF 后成为**中立基础设施**，可信度对企业采纳是加分（[arcade.dev](https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/) / [linuxfoundation.org](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)）。
- **取舍代价**：偏工程/运行时、非消费级打磨；强隔离沙箱需自建；本地大模型的 tool-calling 要靠 Tool Shim 兜底，效果不及原生工具模型。

---

## 7. 采用度信号

- **GitHub star**：**约 50.6k stars / ~5.4k forks**（时点：2026-07 前后，仓库页 `aaif-goose/goose`，[GitHub](https://github.com/aaif-goose/goose)）。对比 2025 年中第三方文章记的 **44,000+ stars / 368+ contributors / 2,600+ forks**（[the-agent-report](https://the-agent-report.com/2026/05/block-goose-ai-agent-recipe-runner-scaled-60-percent/)），一年内 star 明显增长、势头持续向上。
- **发版节奏**：最新 **v1.41.0（2026-07-03）**，主版本号已到 1.4x，高频迭代（[GitHub releases](https://github.com/aaif-goose/goose)）。
- **旗舰内部用户 = Block 自己**：**约 60% 的 ~12,000 名 Block 员工每周用 Goose**，覆盖 **15 种岗位**（工程、销售、设计、产品、客户成功等）——这是「dogfooding 到全公司」的强信号（[lennysnewsletter](https://www.lennysnewsletter.com/p/blocks-custom-ai-agent-goose) / [the-agent-report](https://the-agent-report.com/2026/05/block-goose-ai-agent-recipe-runner-scaled-60-percent/)）。⚠️ 60% / 12,000 为 Block 自述口径，无独立第三方核实。
- **机构背书**：作为 AAIF/Linux Foundation 创始项目，与 MCP、AGENTS.md 同列；AAIF 铂金会员含 AWS/Anthropic/Google/Microsoft/OpenAI 等（[linuxfoundation.org](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)）。
- **生态**：Block 设有 **goose grant program** 资助开源 AI（[block.xyz](https://block.xyz/inside/introducing-the-goose-grant-program)）；官方称 70+ extensions 可接。外部知名生产用户名单：**未找到公开、可核实的第三方大厂署名清单**（除 Block 自身）。

---

## 8. 来源（一手优先）

1. GitHub 仓库（现址 `aaif-goose/goose`，star/version/license/描述）：https://github.com/aaif-goose/goose
2. Linux Foundation 官方新闻稿（AAIF 成立，2025-12-09，goose/MCP/AGENTS.md 捐赠、成员）：https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation
3. Block 官方发布博文（2025-01-28，codename goose、Apache-2.0、MCP、定位）：https://block.xyz/inside/block-open-source-introduces-codename-goose
4. 官方文档博客《goose has a new home – AAIF》（2026-04-07，仓库迁移）：https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/
5. 官方文档 · Subagents（子 agent 机制、超时、限制、权限门）：https://goose-docs.ai/docs/guides/context-engineering/subagents/
6. DeepWiki · block/goose（crate/binary 架构、agent loop、context 管理、SQLite）：https://deepwiki.com/block/goose
7. Arcade.dev 博客（Goose 与 MCP 同源史、harness/LLM/tools 分层、lead-worker、reference impl）：https://www.arcade.dev/blog/goose-the-open-source-agent-that-shaped-mcp/
8. The Agent Report（recipe YAML 结构与运行、Block 60%/12,000 规模化、2025 star 快照）：https://the-agent-report.com/2026/05/block-goose-ai-agent-recipe-runner-scaled-60-percent/

**辅助**：goose-docs 权限模式页 https://goose-docs.ai/docs/guides/managing-tools/goose-permissions ；maxamillion.sh「harness engineering」论 https://maxamillion.sh/blog/stop-building-agents-start-harnessing-goose/ ；jimmysong.io「agentic runtime」论 https://jimmysong.io/blog/goose-aaif-agentic-runtime/ 。
