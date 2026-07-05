# Cline 拆解简报

> 快照时间：2026 年年中（mid-2026）。所有星标 / 安装量均标注 as-of 日期。

## 1. 一句话定位 + 出身 + 许可 + 状态

**Cline 是一个开源的自主编码代理（autonomous coding agent），运行在你的 IDE（VS Code / JetBrains）和终端里；核心卖点是"Plan/Act 双模式 + 每一步人工审批 + 完全透明、自带 API key、不加价"。** 官方 README 一句话定位：*"The open source coding agent in your IDE and terminal."*

- **作者 / 公司**：由 **Saoud Rizwan** 于 **2024 年**创建，最初名为 **"Claude Dev"**，后改名 Cline。公司实体 **Cline Bot Inc.**，总部在美国 Sacramento（加州）。
- **许可**：**Apache 2.0**（完全开源，可审计数据出站与对 LLM 提供商的调用）。
- **融资**：2025-07-31 官方宣布累计 **$32M**（Seed + Series A）——Series A（约 $27M）由 **Emergence Capital** 领投，此前 Seed（约 $5M）由 **Pace Capital** 与 **1984 Ventures** 领投；跟投 / 参投包括 Essence VC、Cox Exponential，以及天使 Jared Friedman、Logan Kilpatrick、Addy Osmani、Eric Simons 等。
- **2026 状态**：**活跃开发中，非常高频发布**。截至 2026-07-04，GitHub 主仓约 **64.3k stars**（as-of 报道数据），308+ releases、322 contributors；最新 CLI 版本 v3.0.37（2026-07-04）。**未被收购、未废弃、未改名。** 反倒是它最著名的下游 fork **Roo Code 于 2026-05-15 关停并归档仓库**，官方建议用户迁回 Cline（见 §6）。

## 2. 解决什么问题 + 在栈里的位置

Cline 解决的问题：让 LLM **真正动手改代码库**，而不是给你贴片段。它会读整个代码库、创建/编辑文件、跑终端命令、驱动无头浏览器、调用外部工具，并在每一步把动作摆到你面前审批。

**栈内定位**：它同时是**代理（agent）+ 代理运行时/harness + 产品**，但**不是**通用编排框架（不是 LangGraph 那种）。分层看：

- 它**自身不训练/不托管模型**。用户 **BYOK（自带 API key）**，Cline 只是编排层。核心商业主张是创始人那句 *"inference cannot be the business strategy / model"*——**拒绝在模型成本上加隐藏的 credit 层，不为保利润偷偷降配到小模型**。
- 底层可插 **11+ 提供商**：Anthropic Claude、OpenAI、Google Gemini、OpenRouter、Vercel AI Gateway、AWS Bedrock、Azure/GCP Vertex、Cerebras/Groq、Mistral、本地 Ollama / LM Studio，以及任意 OpenAI 兼容端点。
- **交付形态有四种**：VS Code 扩展、JetBrains 插件、**CLI（终端）**、**SDK（`@cline/sdk`，Node.js 编程接口）**，外加一个基于 web 的 Kanban 任务板。这使它从"IDE 侧边栏工具"扩展成了可嵌 CI/CD 与脚本的**代理控制面**。

## 3. 架构与核心组件

真实的运行组件（来自 DeepWiki 对 cline/cline 源码的拆解）：

- **`Controller`**：管理任务生命周期（创建 / 切换 / 销毁 task）。
- **`Task`**：单个 task 实例，执行 agentic loop 的主体。
- **`StateManager`**：跨会话跟踪对话历史与工作区状态；带设置优先级层级（user > workspace > defaults），落盘持久化，重启不丢。
- **`PromptRegistry`**：按所选模型挑选合适的系统提示词。
- **`ApiHandler`**：把 LLM 响应以 token chunk **流式**拉回。
- **`AssistantMessageContent`**：解析模型输出里的**文本块**与**工具调用块（tool-use blocks）**。
- **`ToolExecutor`**：分发工具调用。
- **`DiffViewProvider`**：把待写入的改动渲染成可审阅的 diff。
- **权限守卫**：`ClineIgnoreController`（`.clineignore` 隐藏文件）、`CommandPermissionController`（命令白/黑名单）。
- **WebView 层**：扩展主机（extension host）与 React UI 之间靠 `ExtensionMessage` / `WebviewMessage` 消息类型通信（承载审批请求、工具结果、状态更新）；UI 侧有 `ChatView` / `ChatRow` / `ChatTextArea`、`SettingsView` / `ApiOptions`。
- **SDK 侧**：`ClineCore` 与 `Agent` 类，供编程式构建代理。
- **Checkpoint 层**：**shadow git 仓库**（影子 git，独立于你项目自己的 git，存于 VS Code 全局存储）。

**工具集（tool set）**——这是 harness 的"动作词表"：
`read_file`、`write_to_file`、`replace_in_file`、`execute_command`、`browser_action`（无头浏览器/Puppeteer 式）、`use_mcp_tool`（调 MCP server）、`ask_followup_question`、`attempt_completion`（宣告任务完成）、`new_task`（开新任务做上下文交接）、`plan_mode_respond`（Plan 模式下只回话不动手）。

## 4. 逐步：一个请求怎么在控制回路里流动（最重要）

以一次典型 task 为例，控制/编排回路如下：

1. **入口 & 模式**。用户在侧边栏 / 终端提出需求。当前处于 **Plan 或 Act** 模式（可 Tab 切换）。
2. **组装上下文**。`Task` 通过 `PromptRegistry` 选系统提示词，`StateManager` 注入对话历史 + 工作区元数据（打开的文件、模型、环境状态）+ 若存在则读入 **Memory Bank / `.clinerules`**。
3. **调用模型（流式）**。`ApiHandler` 向选定提供商发起请求，token chunk 流式返回。
4. **解析输出**。`AssistantMessageContent` 把响应拆成文本块与**工具调用块**。模型每一轮**只发一个工具调用**，然后等结果——这是 Cline 的核心节奏。
5. **审批闸门（human-in-the-loop）**。凡是"有后果的动作"（写文件、跑命令、浏览器操作）都在 `Task.ask()` 处**挂起**回路，`DiffViewProvider` 把改动以 diff 呈现给用户批准/修改/拒绝。
   - **Plan 模式**：只能 `read_file` / 搜索 / 讨论，**不能改文件或执行命令**；产出用 `plan_mode_respond` 回话。对齐后切到 Act 模式，**Plan 阶段的完整上下文原样带过来**，无需重复。
   - **Act 模式**：可执行全部工具。
   - **auto-approve / YOLO 模式**：可关掉部分或全部确认，让它自动跑（长跑 dev server、测试、部署都能实时反应终端输出）。
6. **执行工具**。批准后 `ToolExecutor` 真正执行；`execute_command` 会跟踪终端输出并把结果回填。
7. **打 checkpoint**。**每一次工具调用后**，把当前工作区快照 commit 进 **shadow git**（连未被主 git 跟踪的文件也纳入），主 git 历史保持干净。
8. **结果回灌 & 下一轮**。工具结果追加进历史，回到第 3 步开新一轮 LLM turn。如此循环，直到模型发出 `attempt_completion` 宣告完成，或用户中止。
9. **回退**。任何时刻可按 checkpoint 恢复，三种模式：**Restore Files**（只回文件、留对话）/ **Restore Task Only**（只删该点之后消息、不动文件）/ **Restore Files & Task**（全量回滚）。

## 5. Harness 级设计

- **上下文/记忆管理（context engineering，Cline 的招牌）**：
  - **Focus Chain**：v3.25 起默认开启。启动时生成 task 检查清单（可编辑的 markdown"活范围"），默认**每 6 条消息**把清单重新注入上下文，防止长会话"跑题"。
  - **Auto Compact（自动压缩）**：上下文接近上限时，生成一份保留"决策/代码改动/状态"的总结，替换掉冗长历史后继续；与 Focus Chain 搭配时 todo 清单穿越压缩循环保留。
  - **`/smol`**：在同一 task 内**原地手动压缩**对话（调试/探索时保动量、不做完整交接）。
  - **`new_task` / `/newtask` 交接工具**：在自然节点开一个"全新 task"，只打包计划、决策、相关文件、下一步——等价于给新同事做精准 onboarding，突破单一上下文窗口上限。可在 `.clinerules` 里写规则（如"上下文用量 > 50% 就提议交接"），并规定往 `<context>` 块里塞什么。
  - **Memory Bank**：以 markdown 存在 repo 里的持久知识层，核心文件 `projectbrief.md` / `productContext.md` / `activeContext.md` / `systemPatterns.md` / `techContext.md` / `progress.md`；约定"每个 task 开始必须先读全部 memory bank"。
  - **`contextHistoryUpdates` map**：底层带时间戳跟踪对每条消息块的修改，可把冗长内容替换成简短通知以省 token。
  - **`/deep-planning`**：把调研前置写进 `implementation_plan.md`，避免探索垃圾污染工作上下文。
- **工具接口**：见 §3 的固定工具词表 + **MCP**（可从 marketplace 装 MCP server 接数据库/API/基础设施）+ 通过 SDK **注册自定义工具与生命周期 hook** + `.clinerules`（版本化的、Cline 会读也能按需自改的团队规范）。
- **规划**：靠 Plan/Act 两阶段 + `/deep-planning` 慢思考，而非独立 planner 组件。
- **多代理交接**：官网列出 **"Coordinator agents delegate to specialists with their own tools and context"**（协调者代理把任务派给有各自工具与上下文的专家）；CLI 2.0 的实现是**在并行 tmux 面板里跑多个完全隔离**（状态/对话/配置各自独立）的实例，如一个重构 DB、另一个改文档。
- **人在环（HITL）**：默认每个有后果动作都要审批；diff 可审阅；`.clineignore` + 命令权限控制器做访问限制；auto-approve/YOLO 可放开。
- **沙箱**：**没有内建强隔离容器沙箱**——安全模型主要靠"逐步审批 + diff + checkpoint 一键撤销 + `.clineignore`/命令白名单"，而不是 OS 级 sandbox。（这是它相对某些托管代理的一个显式取舍。）

## 6. 与同类的区别 & 取舍

- **单代理哲学 vs 多模式**：Cline 坚持相对简洁的 **Plan/Act 单代理**范式。**Roo Code** 正是因为想加"多模式（Code/Architect/Ask/Debug）+ Boomerang 并行子代理"而在 2024 年初从 Cline fork 出去（原名 "Roo Cline"），因为这套与 Cline 单代理哲学冲突、上游不愿并入。**血缘链：Cline → Roo Code → Kilo Code。**
  - **2026-04-21 Roo Code（CEO Matt Rubens）宣布关停、2026-05-15 归档仓库**（团队理由是"不再相信 IDE 是编码的未来"，转做云代理 Roomote），并**官方建议迁回 Cline**（Roo 归档时约 24.2k stars / 3.3k forks）。Cline 官方回应称 Roo "比任何其他 fork 都更多地贡献给了我们的社区"。这实际给 Cline 的"社区优先"路线背了书。
- **透明 / BYOK / 不加价**：相对 Copilot、Cursor、Claude Code 等，Cline 的差异化是 **Apache 2.0 全开源可审计 + 自带 key + API 成本全透明 + 无 vendor lock-in**（任意 OpenAI 兼容端点）。
- **checkpoint 用 shadow git**：不污染用户主 git 历史，且能捕获未跟踪文件；代价是大仓库下每步 commit 快照会**占存储、拖慢速度**（官方建议大仓可关）。
- **终端 / CI 一等公民**：CLI 2.0（2026-02-13）把命令行做成一等开发面：`-y` 全自主无交互、`--json` 结构化输出、`--acp` 兼容 **Agent Client Protocol**（可用于 JetBrains/Zed/Neovim/Emacs），可作为 Unix 组件吃 piped 输入（git diff → code review）、接 GitHub Actions/GitLab CI/Jenkins/cron。
- **取舍**：强审批 + 无强沙箱意味着"信任但要盯"；上下文工程强大但需要用户理解 Focus Chain/Memory Bank/交接这套心智模型才能发挥。

## 7. 采用信号

- **GitHub stars**：约 **64.3k**（as-of 2026-07-04，报道数据）；此前 2025-07-31 官方口径为 48k——**一年内显著增长**。
- **安装量**：官方 2025-07-31 称 VS Marketplace + Open VSX 合计 **2.7M installs**；另有二手来源称 **5M+ installs**（*未在一手渠道核实，标注为估计*）。
- **社区**：48k X 关注、20k Discord 成员（2025-07-31 官方口径）；322 contributors、3.3k dependents（2026-07 GitHub 数据）。
- **企业用户**：官方点名 **SAP、Samsung** 及"其他 Fortune 100 公司"作为选用者。
- **动能**：308+ releases、极高频发布节奏；生态外溢出 Roo Code、Kilo Code 等 fork，且 Roo 关停后回流。

## 8. 来源（Sources）

1. GitHub 主仓 README — https://github.com/cline/cline
2. 官网首页（Plan/Act、checkpoints、.clinerules、多代理、提供商）— https://cline.bot/
3. 官方融资公告（$32M、投资人、thesis、2.7M installs、企业用户）— https://cline.bot/blog/cline-raises-32m-series-a-and-seed-funding-building-the-open-source-ai-coding-agent-that-enterprises-trust
4. 官方文档 · Plan & Act 模式 — https://docs.cline.bot/core-workflows/plan-and-act
5. 官方博客 · Context Engineering（Focus Chain / Auto Compact / new_task / /smol / /deep-planning，v3.25、每 6 条、50%）— https://cline.bot/blog/how-to-think-about-context-engineering-in-cline
6. 官方文档 · Checkpoints（shadow git、三种恢复模式）— https://docs.cline.bot/core-workflows/checkpoints
7. DeepWiki 源码级架构（Controller/Task/StateManager/ToolExecutor/工具集/tool loop）— https://deepwiki.com/cline/cline
8. Roo Code 关停与血缘 — https://www.bodegaone.ai/blog/roo-code-shutdown-alternatives ；CLI 2.0 — https://devops.com/cline-cli-2-0-turns-your-terminal-into-an-ai-agent-control-plane/

## 核验记录

（2026-07-04 独立核验；每条"最可疑"声明均先假定为错，再找一手/多方来源确认。）

- **GitHub 指标**：64.3k stars、308 releases、322 contributors、Apache-2.0、README 一句话定位——逐项与 github.com/cline/cline 页面一致，**核验通过**。
- **最新 CLI 版本 v3.0.37（2026-07-04）**：与 GitHub releases 页面一致（v3.0.37 于 2026-07-04 发布；主扩展线另有 v4.0.x），**核验通过**。
- **出身 / 改名**：Saoud Rizwan 于 2024-06 以 "Claude Dev" 发布，2024-10-09 随 2.0 改名 Cline（"CLI"+"editor"）；实体 Cline Bot Inc.；VS Code 扩展 ID 仍为 `saoudrizwan.claude-dev`——**核验通过**（原文未列改名精确日期，属可接受省略）。
- **融资 $32M**：金额、领投（Emergence / Pace / 1984）、投资人与 2025-07-31 公告日均确认；**已修正**为更精确的结构——Series A（约 $27M，Emergence 领投）+ Seed（约 $5M，Pace Capital 与 1984 Ventures 领投），原文把三家笼统写成"领投"。
- **Roo Code 关停日期**：**已修正** 原文"2026-04-20 宣布"→ 多来源确认为 **2026-04-21**（CEO Matt Rubens 宣布）；归档日 2026-05-15 正确。并补入归档时约 24.2k stars / 3.3k forks。
- **Roomote 定性**：**已删除** 原文"Slack-first 云代理"中的"Slack-first"限定——来源仅支持"cloud agent / 云代理"，无一手来源证实 Slack-first，属过度具体。
- **Roo 血缘与 fork 缘由**：2024 年初从 Cline fork（原 "Roo Cline"），因多模式（Code/Architect/Ask/Debug）+ Boomerang 与 Cline 单代理哲学冲突；Cline → Roo → Kilo——**核验通过**。
- **CLI 2.0（2026-02-13）**：发布日、`-y`/`--json`/`--acp` 标志、ACP（JetBrains/Zed/Neovim/Emacs）、tmux 隔离并行、piped 输入、GitHub Actions/GitLab CI/Jenkins/cron——逐项与官方博客一致，**核验通过**。
- **上下文工程**：Focus Chain 于 **v3.25 默认开启**、默认**每 6 条消息**重注入清单、Auto Compact、`/smol`、`new_task`、`/deep-planning`——与官方 Context Engineering 博客一致，**核验通过**。（">50% 提议交接"来自 `.clinerules` 示例约定而非硬阈值，表述保留为"可写规则"。）
- **架构组件**：Controller / Task / StateManager / PromptRegistry / ApiHandler / AssistantMessageContent / ToolExecutor / DiffViewProvider / ClineIgnoreController / CommandPermissionController——逐项经 DeepWiki 确认。checkpoints 为 **git-based 快照**（"shadow git"为社区/官方文档通用叫法，指独立于主 repo 的影子仓库，保留）。
- **采用信号**：2.7M installs 与 48k stars 为 2025-07-31 官方口径；5M+ installs 由二手来源（AI Wiki，2026）佐证，仍标注为估计；SAP / Samsung / Fortune 100 企业用户经官方公告确认——**核验通过**。
