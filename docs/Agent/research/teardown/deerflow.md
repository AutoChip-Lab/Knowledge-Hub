# ByteDance DeerFlow (2.0) — 拆解简报

> 快照时间：2026 年年中。以下均来自一手来源（官方 GitHub README、README_zh、官方文档站、GitHub API 元数据）。带"未找到公开数据 / 估计值"标记的为无法一手证实的信息。

---

## 1. 一句话定位 / 出处 / 许可 / 状态

- **一句话定位**：DeerFlow（Deep Exploration and Efficient Research **Flow**）是一个 **开源的 "super agent harness"（超级智能体运行时/骨架）**，把 **sub-agents（子智能体）+ memory（记忆）+ sandbox（沙盒）+ skills（技能）+ message gateway（消息网关）** 组织成一个能跑分钟级到小时级长任务的系统。官方 GitHub 描述原文：*"An open-source long-horizon SuperAgent harness that researches, codes, and creates."*
- **谁做的**：字节跳动（ByteDance）。文档署名核心作者 "Daniel Walnut" 与 "Henry Li"。
- **许可**：MIT（GitHub API `spdx_id: MIT` 确认）。
- **状态（截至 2026-07）**：**活跃**。仓库 `bytedance/deer-flow` 创建于 2025-05-07，2026-07-04 仍有 push（GitHub API `pushed_at: 2026-07-04`）。未重命名、未被弃用。
  - **重要版本事实**：**2.0 是彻底重写（ground-up rewrite），与 1.x 不共享任何代码**。2.0 发布于 **2026-02-28**（README_zh：*"2026 年 2 月 28 日，DeerFlow 2 发布后登上 GitHub Trending 第 1 名"*；DEV 社区文章记为 2026-02-27，两处日期相差一天）。
  - **1.x（原 Deep Research 框架）仍在维护**，位于 `1.x` / `main-1.x` 分支；主线开发已转向 2.0。

---

## 2. 解决什么问题 / 在栈里的位置

- **它是什么层**：**不是单纯的 agent，也不只是编排框架，而是一个"运行时/harness（骨架）+ 半成品产品"**。官方原话：*"DeerFlow 2.0 is no longer a framework you wire together. It's a super agent harness — batteries included, fully extensible."* 对比 LangGraph/CrewAI/AutoGen 那种"积木原语"，DeerFlow 提供的是**一个带默认执行模型、内置技能、沙盒和记忆层的、能直接跑起来的系统**。
- **1.x 解决的问题**：Deep Research —— 把一个研究问题拆成计划，多智能体并行检索/爬取/写代码/出报告（Markdown / PPT / 播客音频）。
- **2.0 解决的问题扩大为**：**长时程（long-horizon）通用任务** —— 研究、写代码、造网页/幻灯片/图像/视频等，任务可持续分钟到小时。核心卖点是"给智能体一台真电脑"：*"an isolated Docker container with a full filesystem, a bash terminal, and the ability to read, write, and execute files. The agent does not suggest a bash command. It runs it."*（区别于"角色扮演式执行"的框架）。
- **与底层 LLM 的关系**：**模型无关（model-agnostic）**，*"works with any LLM that implements the OpenAI-compatible API"*。DeerFlow 自己不训练模型，坐在 LLM 之上做编排/工具/沙盒/记忆。推荐用长上下文（100k+ tokens）、带推理、多模态、强 tool-use 的模型；官方点名 **Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5**（README_zh 还列了 GPT-4o、Gemini 2.5 Flash、vLLM 上的 Qwen3）。
- **技术底座**：构建在 **LangGraph + LangChain** 之上；消息/状态用 **LangGraph-compatible Gateway API + LangGraph Store**。

---

## 3. 架构与核心组件（真实可命名的部件）

**2.0 的运动部件：**
- **Lead agent（主智能体）+ Sub-agents（子智能体）**：主智能体把复杂任务拆成结构化子任务，**按需动态拉起子智能体**，能并行则并行。每个子智能体有**自己独立的上下文、工具集、终止条件**，且**看不到主智能体或兄弟子智能体的上下文**（隔离上下文）。
- **Agent Runtime / 控制循环**：管理 LLM 调用 → 工具选择 → 子智能体分派 → 结果合成 → 上下文压缩 → 长期记忆持久化。
- **Sandbox（沙盒执行）**：三种模式 —— **Local Execution / Docker Execution / Kubernetes pod（经 provisioner）**。每个任务拿到独立执行环境和完整文件系统视图。安全提示：`LocalSandboxProvider` 默认禁用 host bash，官方明说**本地模式不是安全边界**。
- **Memory（记忆）**：本地持久化的长期记忆（画像、偏好、累积知识），跨 session；apply 时**去重跳过（duplicate-skipping）**，通过"异步去抖队列（asynchronously debounced queue）"更新。DEV 社区文章提到近期接入 **TIAMAT** 作为云端记忆后端（用于企业级规模）——*此为二手来源，未在官方 README 直接证实，标注为待核实*。
- **Skills（技能）**：一个 **Markdown 文件**，定义工作流/最佳实践/引用；**渐进式加载（progressive loading，用到才加载）**；`/skill-name` 单轮激活。内置技能覆盖：网络研究、报告、幻灯片、网页、图像、视频。
- **Tool layer（工具层）**：web search、web fetch、rendered web capture（渲染截图）、file operations、bash execution；可通过 **MCP servers** 和 **Python 函数**扩展自定义工具。
- **Message Gateway（消息网关）**：多 IM 渠道接入，**自启动、无需公网 IP** —— Telegram（Bot API 长轮询）、Slack（Socket Mode）、Feishu/Lark（WebSocket）、WeChat（腾讯 iLink 长轮询）、WeCom 企业微信（WebSocket）、DingTalk（Stream Push）。IM 内命令：`/new`、`/status`、`/models`、`/memory`、`/help`。Docker Compose 下网关跑在 `gateway` 容器里。
- **Filesystem 约定（沙盒容器内路径）**：`/mnt/skills/public`、`/mnt/skills/custom`；`/mnt/user-data/{uploads, workspace, outputs}`。

**1.x 的角色（对比用，plan-then-execute）**：**Coordinator（入口/生命周期）→ Planner（拆解+决定何时出报告）→ Research Team = Researcher（搜索/爬取/MCP）+ Coder（Python REPL）→ Reporter（汇总成报告）**，外加 **Human Feedback** 节点。这是一个 LangGraph 状态图，节点间靠消息传递，可在 LangGraph Studio 可视化调试。

---

## 4. 逐步工作流程（控制/编排循环）—— 核心

### 2.0（super agent 循环）
1. **入口**：用户请求从 Web UI（`http://localhost:2026`）或某个 IM 渠道（经 message gateway）进入，落到某个 thread（会话线程）。
2. **主智能体推理**：lead agent 用 LLM 推理，决定这是"直接答"还是"需要拆解/工具/子智能体"。
3. **工具选择/执行**：需要动手时，在沙盒容器内实际执行 —— bash、写/读文件、跑 Python、web search/fetch/render capture。**是真执行，不是建议**。
4. **子智能体并行分派**：任务复杂时，主智能体动态 spawn 若干子智能体，每个带**独立上下文 + 限定工具 + 各自终止条件**，能并行则并行；子任务完成后**回传结构化结果**给主智能体（子智能体之间/与主体之间上下文互不可见）。
5. **结果合成**：主智能体聚合子智能体结果。
6. **上下文压缩（关键）**：*"manages context aggressively — summarizing completed sub-tasks, offloading intermediate results to the filesystem, compressing what's no longer immediately relevant."* 即：完成的子任务做摘要、把中间产物落盘到文件系统、压缩不再相关的内容。
7. **长期记忆持久化**：把关于用户/项目的持久信息写入 memory，跨 session 复用（去重）。
8. **目标驱动的自动续跑（HITL 变体）**：若通过 `/goal <完成条件>` 设了线程级完成条件，每轮跑完后 DeerFlow **拿可见对话对照 active goal 做评估**，只有满足条件才注入"隐藏续跑（hidden continuation）"继续干；**安全上限默认 8 次隐藏续跑**；另有"无进展熔断"——连续 **2 次**相同的"无进展"评估就停。`/goal clear` 清除目标。

### 1.x（plan-then-execute + 人在环中）
Coordinator 接请求 → Planner 出结构化计划 → **人审计划**（`[ACCEPTED]` 接受 / `[EDIT PLAN] ...` 修改；或 `auto_accepted_plan: true` 自动接受）→ Research Team（Researcher + Coder）并行执行各步 → 若上下文不足 Planner 决定继续研究，足够则触发 Reporter → 出 Markdown 报告（可再转 PPT/播客/Tiptap 可编辑块）。

---

## 5. Harness 级设计要点

- **上下文/记忆管理**：双层 —— **session 内**激进压缩（摘要 + 落盘 offload + 压缩无关内容）；**跨 session** 长期 memory（去重、异步去抖队列写入）。子智能体上下文隔离，避免主上下文膨胀。
- **工具接口**：内置工具 + MCP server + Python 函数三条扩展路径；工具在沙盒里真实执行。
- **规划**：2.0 靠 lead agent 动态拆解 + 动态 spawn 子智能体（非静态图）；1.x 是显式 Planner 节点出计划。
- **多智能体交接**：子智能体拿"限定作用域上下文 + 工具 + 终止条件"，完成后回传**结构化结果**（而非把原始上下文塞回主体）。
- **人在环中（HITL）**：1.x 是**计划审批**（accept/edit）；2.0 是 `/goal` **完成条件驱动 + 隐藏续跑上限（8）+ 无进展熔断（2）** 的安全护栏。
- **沙盒**：Local / Docker / K8s pod 三档；每任务独立文件系统；本地模式非安全边界，生产建议 Docker/K8s 隔离。
- **运行要求（2.0）**：Docker、Node.js 22+、Python 3.12+；起步硬件约 4 vCPU / 8 GB RAM / 20–25 GB SSD。入口 `make docker-init`→`make docker-start`（或 `make up` 生产）；`make setup` 交互式向导生成 `config.yaml`/`.env`；`make doctor` 自检。

---

## 6. 独特设计选择与取舍（vs 同类）

- **"电池全含"harness 而非积木框架**：对比 LangGraph/CrewAI/AutoGen 提供的是原语，DeerFlow 给的是"有主见的运行系统"——默认执行模型、内置技能、沙盒、记忆一步到位。**取舍**：上手/部署快，但架构上有既定约束（灵活度换开箱即用）。
- **真执行 vs 角色扮演**：给智能体一台真容器电脑（bash/文件/Python），而不是让 LLM 输出"假装执行"的文本。
- **Skill = Markdown + 渐进加载**：技能就是 Markdown 说明书，用到才进上下文 —— 与 Claude Code 的 skills 理念同源；**官方还提供 `claude-to-deerflow` skill，可从 Claude Code 终端直接驱动一个 DeerFlow 实例**（`npx skills add ... --skill claude-to-deerflow`）。
- **消息网关内建多 IM 接入**（Telegram/Slack/飞书/企微/钉钉/微信）且免公网 IP —— 面向"把 agent 挂进团队 IM"的落地场景，是相对同类少见的一等公民能力。
- **HITL 的两种范式**：1.x 计划审批式，2.0 目标条件 + 隐藏续跑护栏式，后者更贴合长时程自动化。

---

## 7. 采用信号

- **GitHub Stars**：**76,053**，Forks **10,280**（GitHub API `bytedance/deer-flow`，快照 2026-07-04；`stargazers_count: 76053`、`forks_count: 10280`）。Open issues 952，主语言 Python（含 TypeScript 前端）。
- **增长势头（二手，标注估计值）**：DEV 社区文章称 2.0 **发布 24 小时内登顶 GitHub Trending 第 1**，"发文时累计约 **25,000 stars / 3,000 forks**"（原文：*"within 24 hours it was sitting at the top of GitHub Trending. The repository has since accumulated around 25,000 stars and 3,000 forks."*）。**注意**：这 25k/3k 是该文写作时的累计值、非"24 小时增量"；网传"24 小时 35.3k stars""一个月破 4 万"等具体增速数字在本简报所引来源中查无实据，已删除。当前一手快照（76k+ stars）与写作时的 25k 之间为正常时间增长。
- **生态/集成**：1.x 曾被集成进 **Volcengine（火山引擎）FaaS Application Center**；社区已出现多个 fork / 增强版（如中文本地化增强版）。
- **知名用户名单**：未找到公开、可一手证实的具体企业用户清单（**未找到公开数据**）。

---

## 8. 来源（URL）

1. GitHub 仓库 + 描述/星标元数据（一手）：https://github.com/bytedance/deer-flow
2. 官方英文 README（一手，2.0 组件/命令/沙盒/LLM）：https://raw.githubusercontent.com/bytedance/deer-flow/main/README.md
3. 官方中文 README_zh（一手，中文术语/发布日期/渠道）：https://raw.githubusercontent.com/bytedance/deer-flow/main/README_zh.md
4. 官方 1.x README（一手，Coordinator/Planner/Researcher/Coder/Reporter 角色）：https://github.com/bytedance/deer-flow/blob/main-1.x/README.md
5. GitHub REST API 仓库元数据（一手，stars/forks/license/dates）：https://api.github.com/repos/bytedance/deer-flow
6. 官方文档站 intro（二手镜像抓取，架构/发布日期，直连 403）：https://deerflow.one/en/intro
7. DEV 社区技术拆解（二手，星标增速/TIAMAT/需求）：https://dev.to/arshtechpro/deerflow-20-what-it-is-how-it-works-and-why-developers-should-pay-attention-3ip3
8. SitePoint 深潜（二手，长任务/沙盒执行叙述）：https://www.sitepoint.com/deerflow-deep-dive-managing-longrunning-autonomous-tasks/

---

### 待核实 / 存疑清单
- **2.0 发布日期**：官方中文 README 记 2026-02-28，二手 DEV 文章记 2026-02-27（相差一天）。
- **TIAMAT 云端记忆后端**：仅二手来源（DEV 文章）提及，官方 README 未直接确认。原文：*"The project recently added TIAMAT as a cloud memory backend..."*
- **发布初期星标增速具体数字**：所引来源仅支持"24 小时登顶 Trending"与"写作时累计 ~25k stars / 3k forks"两点；"24 小时 35.3k""一月破 4 万"等具体增速在来源中查无实据，已从正文删除。
- **具体企业用户名单**：未找到公开数据。

---

## 核验记录

> 核验时间 2026-07-04。逐条对照一手（GitHub API + 官方 README/README_zh）与所引二手来源。

**已核验属实（无需改动）：**
- 仓库元数据：`full_name` = bytedance/deer-flow，`license.spdx_id` = MIT，`created_at` = 2025-05-07，`pushed_at` = 2026-07-04，`archived`/`disabled` = false，`default_branch` = main，主语言 Python、open_issues 952 —— 均与 GitHub API 一致。
- 核心作者 **Daniel Walnut / Henry Li** —— 官方 README_zh 明确署名（Daniel Walnut = hetaoBackend，Henry Li = magiccube）。
- **2.0 发布日期 2026-02-28** —— 官方 README_zh 原文"2026 年 2 月 28 日，DeerFlow 2 发布后登上 GitHub Trending 第 1 名"证实；二手 DEV 文章记 2026-02-27，差一天，属二手误差，一手为准。
- 定位/架构原话：*"super agent harness — batteries included, fully extensible"*、model-agnostic *"works with any LLM that implements the OpenAI-compatible API"*、推荐模型 Doubao-Seed-2.0-Code / DeepSeek v3.2 / Kimi 2.5 / GPT-4o / Gemini 2.5 Flash —— 官方 README 证实。
- `/goal` 完成条件 + **隐藏续跑上限 8** + **无进展熔断 2** —— 官方 README 证实。
- 系统要求 Python 3.12+ / Node 22+ / Docker，起步 4 vCPU / 8 GB RAM / ~20 GB SSD —— 官方 README 证实。
- Web UI 端口 **2026**、网关渠道（Telegram/Slack/Feishu/WeChat/WeCom/DingTalk）与命令（/new /status /models /memory /help /skill-name）—— 官方 README 证实。
- **`claude-to-deerflow` skill 真实存在** —— 位于官方仓库 `skills/public/claude-to-deerflow/SKILL.md`，安装命令 `npx -y skills add bytedance/deer-flow --skill claude-to-deerflow` 属实。

**已更正：**
- Stars **76,052 → 76,053**、Forks **10,279 → 10,280**（对齐 GitHub API 快照实值，原数字各偏低 1）。
- **删除无据增速数字**："24 小时约 35,300 stars""不到一个月破 4 万 stars"——所引 DEV 文章并无此表述，仅支持"24 小时登顶 Trending"与"写作时累计 ~25k stars / 3k forks"，且后者是累计值而非 24 小时增量；已按来源原文重写第 7 节增长势头条目并加时间说明。

**仍为二手/未一手证实（保留标注，未删）：**
- TIAMAT 云端记忆后端（仅 DEV 文章）、发布初期精确增速、企业用户名单。
