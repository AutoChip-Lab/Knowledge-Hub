# Factory Droids（Factory.ai）技术底稿

> 事实快照时点：2026 年年中（约 2026-07）。断言尽量注明来源与时点;估算/未核实处已显式标注。

## 1. 一句话定位 · 出品方 · 许可 · 2026 年状态

**一句话定位**：Factory Droids 是 Factory.ai 出品的**企业级「agent-native 软件开发」平台**——一组面向完整软件开发生命周期（SDLC）的自主 agent（称为 "Droids"），核心交付物是终端里的 **Droid CLI**（命令 `droid`），主打「从工单/规范到可合并 PR」的端到端自动化，并可跨 CLI / Web / Slack·Teams / Linear·Jira / Mobile 使用。

- **出品方**：Factory（法律实体 "The San Francisco AI Factory, Inc."），2023 年由 Matan Grinberg（前 UC Berkeley 物理学 PhD）与 Eno Reyes（ML 工程师）创立,两人在一次 LangChain hackathon 上结识。
- **许可**：**闭源专有**。公开 GitHub 仓库 `factory-ai/factory` 只含文档、issues、GitHub Actions,**不含 CLI 源码**;CLI 以编译二进制/npm 包分发。仓库 README/版权声明为 "Copyright © 2025-2026 Factory AI. All rights reserved.",GitHub API 返回 `license: null`。（注意：站点有 `/oss` 页,但未说明具体哪些组件开源、以何许可——**未找到明确的开源许可声明**。）
- **2026 年状态：活跃、势头强、未改名/未被收购**。关键时间线：
  - 2025-05-28：Droids **GA**（"the entire SDLC"）。
  - 2025-09-25：宣布 **Terminal-Bench #1**（58.75%）+ **$50M B 轮**（NEA / Sequoia / NVIDIA / J.P. Morgan 领投,估值约 $300M）。
  - 2025-12：Terminal-Bench 刷新到 **63.1%**（Claude Opus 4.5）。
  - 2026-04-16：**$150M C 轮**,Khosla Ventures 领投（Keith Rabois 入董事会),投后估值 **$1.5B**;累计融资约 $220M。
  - 2026-06-15：**Factory 2.0 / "software factories"** 发布,从单点 coding agent 转向组织级端到端系统。

## 2. 解决什么问题 · 在 agent 栈里的位置 · 与底层 LLM 的关系

**解决的问题**：把「工单 → 编码/迁移/现代化 → 测试 → 代码审查 → 上线 → 值班/事故根因」这条链上的工作委托给自主 agent,面向企业（合规、审计、私有部署）而非单纯个人玩具。GA 公告列出 6 类能力：端到端编码、on-call 事故处置与 RCA、代码库检索问答、工单管理与优先级、产品规范生成、自动 PR 审查。

**在栈里的位置**：**平台 + harness/scaffold,而非模型**。Factory 明确「model-independent」——自己不训练前沿基座,而是在别人的 LLM 之上做 **agent harness（脚手架/编排/工具层/权限层/记忆层）**。它同时是：
- **harness/CLI 层**（`droid`,交互 REPL + headless `droid exec`）;
- **编排/多 agent 层**（Missions,worker/validator);
- **平台层**（Web app、Slack/Teams、Droid Computers 云环境、治理/审计、SSO）。

**与底层 LLM 的关系**：**模型无关、可换、可自带**。Droid 可挂多家托管模型并在会话中途换模,并支持 BYOK / OpenAI-compatible 自定义端点：
- Anthropic：Claude Opus 4.8/4.7/4.6/4.5、Sonnet 4.6/4.5、Haiku 4.5（据文档/检索,快照期在售型号会滚动更新）;
- OpenAI：GPT-5.4 / 5.2 / 5.2-Codex / 5.3-Codex;
- Google：Gemini 3.1 Pro / Gemini 3 Flash;
- **"Droid Core"**：一组托管的**开放权重**模型（检索称包含 GLM-5/5.1、Kimi K2.5/K2.6、MiniMax M2.7 等——**具体清单随时间变化,以 Settings 内为准**);
- 自定义：`~/.factory/settings.json` 指向自有 Anthropic/OpenAI key、OpenRouter、Fireworks、Groq、Ollama 等。
- Factory 2.0 强调 **model routing（自动路由）** 作为投入方向之一。

## 3. 架构与核心组件（点名真实构件）

来自 CLI Reference / DeepWiki / Terminal-Bench 技术说明的实际构件：

- **两种执行形态**：交互式 TUI（`droid`,REPL + 40+ slash 命令）与 **headless `droid exec`**（单发,支持 `text/json/stream-json/stream-jsonrpc` 输出),两者共享同一套配置、工具执行基座与会话状态。
- **Tool Router（工具路由/权限执行器）**：在工具调用前按**自主等级（autonomy level）**评估并放行。核心工具集刻意精简：`Read / Write / Create / Delete / Execute(bash) / Grep(ripgrep) / Glob / Task(委派子 agent) / Skill`。
- **自主分级 + Command Policies**：`read-only / low / medium / high / unsafe` 门控破坏性操作;shell 命令走 allowlist/denylist。
- **Spec/规划模式**：先出计划再执行,可让「更强的模型做规划、更快的模型做执行」（`--spec-model` 与主 `-m` 分离)。
- **Missions（多 agent 编排）**：worker + validator 双角色,`--worker-model / --validator-model / --worker-reasoning-effort / --validator-reasoning-effort`;并行处理、可在规划期暂停/调整、从 **Mission Control** 视图恢复。
- **记忆/上下文**：分层配置（`settings.json` / `AGENTS.md` / `mcp.json`,高层覆盖低层);会话可 resume/fork/tag/archive;`/compress` 压缩会话并迁移到新会话;`/context` 显示上下文占用;`droid search` 跨消息/文档/工具结果做本地索引检索（可 `--reindex`）。
- **扩展层**：MCP（`droid mcp add ...`,注册表含 40+ 预置 server 如 Linear/Sentry/Notion/Stripe/Vercel)、Skills、Custom Droids（子 agent）、Hooks、自定义 slash 命令、Plugins、Mixed Models、BYOK。
- **隔离/执行环境**：git **worktree**（`-w`,并行分支,`exec` 下干净 worktree 自动清理、脏的保留);**Droid Computers**（Factory 托管的远端云环境,持久长跑);`droid computer`（BYOM,注册自有机器,支持 ssh）。
- **安全/合规构件**：**DroidShield**（提交前实时静态分析,查漏洞/bug/IP 泄露)、沙箱隔离、审计轨迹、"traceable and reversible";合规声明 ISO 42001 / SOC 2 / ISO 27001 / GDPR / CCPA。
- **历史内核（Code Droid 技术报告,2024）**：**HyperCode**（构建代码库多分辨率表示）+ **ByteRank**（检索算法）——早期检索/上下文子系统;多模型采样（Anthropic+OpenAI）生成多条 trajectory,再用测试验证择优。（**注**：这是早期报告的命名,当前 CLI 文档未再强调这两个术语,可能已演进,标注为历史构件。)

## 4. 一步步怎么运转（控制/编排回路 —— 本节最重要）

以一个 `droid exec "修复 X 并加测试"` 或交互式请求为例,请求实际流经的回路：

1. **入口分流**：交互式经 TUI（`!` 前缀直接跑 bash,其余进 AI;`/xxx` 走 slash 处理器);`droid exec` 绕过 TUI 直入执行逻辑,产出结构化输出。
2. **会话/环境 bootstrap**：新会话注入一批「salient system info」（工作目录、git 状态、环境),读取分层配置（`AGENTS.md`/`settings.json`/`mcp.json`),确定当前模型、reasoning effort、autonomy level、启用/禁用的工具集。
3. **（可选）Spec 规划**：若 `--use-spec` / Spec 模式,先由 `--spec-model`（如更强的 Opus）产出**具体计划**,交互式下用户可带补充指引批准;`高自主`场景可自动继续。
4. **主 agent 循环（ReAct 式 tool-use loop）**：模型在「hierarchical prompting」（工具描述 + system prompt + 时敏的 user-level 注入消息）下推理 → 发起工具调用 → **Tool Router 按 autonomy level + Command Policies 放行/拦截** → 执行（Read/Grep-ripgrep/Execute/Write…,含 background 长跑原语、短默认超时「fail fast」)→ 结果回灌上下文 → 用 **Planning 工具**更新简明计划与进度 → 迭代,直到目标达成或需人工介入。
5. **（可选）委派子 agent**：主循环可用 `Task` 工具把子问题**委派给 Custom Droid/子 agent**（需 medium 自主),隔离其上下文后回汇结果。
6. **（可选）Missions 编排**：复杂/长时任务进入 Missions——把工作分解,多个 **worker** 并行推进（各自跑上面的 tool-use loop),**validator** 角色校验产出;可暂停/调整/从 Mission Control 恢复,收尾要求更新 README。跨小时/天的长跑可落到 **Droid Computers**。
7. **隔离与并行**：`-w` 在 git worktree 里做并行分支,互不污染工作区。
8. **护栏与收尾**：提交前 **DroidShield** 做静态安全/IP 扫描;所有动作留审计轨迹、可回溯可回滚;`high` 自主才允许 `git push` / 部署脚本。产物为可合并 PR / 变更集,交互式下 `/review` 可发起审查、`/rewind-conversation` 可回退。
9. **上下文压力管理**：长会话用 `/compress` 压缩并迁移新会话;历史可 `droid search` 本地检索复用。

## 5. Harness 层设计要点

- **上下文/记忆**：分层配置覆盖（org > project > user）+ `AGENTS.md` 作为持久项目记忆 + 会话 resume/fork/tag + `/compress` 压缩迁移 + 本地会话检索索引。
- **工具接口**：刻意**极简工具集 + 简化输入 schema 以降歧义**;权限门控（autonomy tiers + allow/deny 命令策略);ripgrep 加速、短超时「fail fast」、background 长跑。
- **规划**：Spec 模式（规划模型与执行模型分离);Planning 工具显式追踪进度。
- **多 agent 交接**：`Task` 子 agent 委派 + Missions 的 worker/validator 双角色并行。
- **人在环**：Spec 计划审批、Mission 暂停/调整、autonomy 分级、`--skip-permissions-unsafe`（仅隔离环境)、Mission Control 可视化。
- **沙箱/隔离**：git worktree、Droid Computers 云环境、BYOM 机器、DroidShield 提交前扫描、审计与可回滚。
- **模型层**：model-agnostic、会话中途换模、mixed models、BYOK、自动 router。

## 6. 独特设计取舍（为什么有人选它）

- **面向企业与治理,而非个人爽感**：私有/自托管/air-gapped（"Sovereign Intelligence")、SSO、审计日志、合规认证、DroidShield——这是它区别于纯个人向 CLI 的核心卖点。
- **强模型无关 + BYOK/自定义端点**：不锁死单一厂商,可接自有 key、OpenRouter/Fireworks/Groq/Ollama,并带自动路由;相对「深度绑一家模型」的方案更中立。
- **多入口一致体验**：同一 Droid 跨 CLI/Web/Slack/Jira/Mobile,而非只有终端。
- **"harness 胜于模型" 的实证叙事**：Terminal-Bench 上同样用 Claude Opus/GPT-5,Droid scaffold 显著抬高分数（见 §7),把「脚手架工程」作为差异化。
- **取舍代价**：**闭源专有**、企业定价与 seat/usage 计费,个人/开源友好度不如开源 CLI;核心 CLI 不可自审源码。

## 7. 采用度信号

- **GitHub `factory-ai/factory`**：**1,006 stars**、80 forks、120 open issues（**GitHub API,2026-07-03 时点**;仓库创建于 2025-09-10)。**注意：这是文档/hub 仓库,非 CLI 源码,star 数不能等同于 CLI 装机量。**
- **Benchmark**：Terminal-Bench **#1**——2025-09 报 58.75%（Claude Opus 4.1),2025-12 刷新到 **63.1%**（Claude Opus 4.5）;文档称领先 Anthropic Claude Code 约 23.0 个百分点、领先 OpenAI Codex CLI 约 2.7 个百分点（**Factory 官方 leaderboard 页数据,自报,注意利益相关**)。
- **知名用户**：MongoDB、Zapier、Framer、Clari（GA 期);EY、Bilt Rewards、Bayer（早期);Factory 2.0 列出 NVIDIA、EY、Adobe、Palo Alto Networks、Adyen、Blackstone、Wipro、Comarch 的生产部署。（客户名单来自 Factory 自述,**未独立核实**。）
- **融资势头**：$50M B 轮（2025-09,~$300M)→ $150M C 轮（2026-04,$1.5B,Khosla 领投),累计约 $220M——资本层面明确处于快速上升期。

## 8. 来源

- Droid CLI Reference（官方文档,命令/flag/模式）：https://docs.factory.ai/reference/cli-reference
- Terminal-Bench 排行榜（官方,63.1% / Opus 4.5 / vs Claude Code & Codex）：https://docs.factory.ai/leaderboards
- "Droid: The #1 Software Development Agent on Terminal-Bench"（harness 设计细节,58.75%,2025-09-25）：https://factory.ai/news/terminal-bench
- "Factory is GA: Droids for the Entire SDLC"（GA,2025-05-28,6 类能力,集成）：https://factory.ai/news/factory-is-ga
- "Factory 2.0: From coding agents to software factories"（2026-06-15,Missions/Droid Computers/routing）：https://factory.ai/news/software-factory
- Code Droid: A Technical Report（HyperCode/ByteRank/多模型采样/SWE-bench,历史）：https://factory.ai/news/code-droid-technical-report
- GitHub `factory-ai/factory`（闭源、docs-hub、star 数）：https://github.com/factory-ai/factory
- TechCrunch — Factory $1.5B / $150M C 轮（2026-04-16,融资/创始人核实）：https://techcrunch.com/2026/04/16/factory-hits-1-5b-valuation-to-build-ai-coding-for-enterprises/

---
### 未核实 / 存疑项
- **GA 日期存在口径差异**：一处官方内容显示 "Factory is GA" 为 **2025-05-28**,但 "any model, any interface" 与 Terminal-Bench 叙事集中在 2025-09。可能是「Droids GA（5 月）」与「9 月的大版本/Series B 发布」两次事件被混提——**建议讲课时区分两者,不要合并成单一日期**。
- **"Droid Core" 开放权重模型清单**（GLM/Kimi/MiniMax 具体版本）来自检索快照,随时间滚动,**以 Settings 内实时列表为准**。
- **HyperCode / ByteRank** 属 2024 技术报告命名,当前 CLI 文档未再强调,可能已演进或更名——标为历史构件。
- **客户名单**均为 Factory 自述,**未独立第三方核实**。
- **`/oss` 开源范围与许可**：站点有该入口但未见明确许可声明——**未找到公开数据**。
