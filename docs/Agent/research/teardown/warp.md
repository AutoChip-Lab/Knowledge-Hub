# Warp —— 事实底稿（快照:2026 年年中）

> 拆解对象:Warp,「从终端长出来」的智能体开发环境(Agentic Development Environment, ADE)。内置编码 agent,也可接入外部 CLI agent(Claude Code / Codex / Gemini CLI 等),配套云端编排平台 **Oz** 跑后台/事件触发的自主 agent。
> 底稿性质:只写可溯源断言;不确定处显式标注。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **一句话定位**:Warp 是「从终端长出来的智能体开发环境(ADE)」(官方 repo 描述原文:*"Warp is an agentic development environment, born out of the terminal."*)。它把「打开文件敲代码 / 打开终端敲命令」的默认工作单元,换成「写 prompt、驾驭 agent、发布」。
- **出品方**:Warp(公司,原名 Warp Dev / Denver Technologies)。创始人兼 CEO **Zach Lloyd**(前 Google Principal Engineer、TIME 临时 CTO)。公司创立于 **2020 年 6 月**。
- **融资**(累计约 $73M):种子轮 $6M;Series A(2022-04,GV / Google Ventures 领投,Figma 的 Dylan Field 参投,常被报道为 $17M–$23M,口径不一见备注);Series B **$50M**(2023-06,Sequoia 领投)。天使含 Sam Altman、Marc Benioff(TIME Ventures)、Tobi Lütke、Jeff Weiner。**估值未公开披露**。
  - ⚠️ Series A 金额来源冲突:Wikipedia 记 $17M,Zach Lloyd 本人 LinkedIn 与多家媒体记 "$23M"(可能含 seed+A 合并口径)。此处不确定。
- **许可**:客户端 2026-04-28 **开源**。双许可:UI 框架 crates(`warpui_core`/`warpui`)为 **MIT**,其余代码为 **AGPL-3.0**(GitHub API `spdx_id` 返回 `AGPL-3.0`)。**云端服务(Warp Drive 等)仍闭源**。
- **2026 状态:活跃,未改名/未被收购/未停更**。
  - 2026-02-10 发布 **Oz**(云 agent 编排平台)。
  - 2026-04-28 **开源** ADE 客户端 + Oz 编排层;**OpenAI 成为其开源仓库的旗舰赞助商**,GPT 模型(含 **GPT-5.5**)驱动为该仓库改代码、发 PR 的 agent 工作流。
  - GitHub 最近推送时间戳 **2026-07-04**(仍在高频提交)。
  - ⚠️ "GPT-5.5" 为 Warp 官方公告用词,本人无法独立核实该模型对外命名。

---

## 2. 解决什么问题 + 技术栈定位 + 与底层 LLM 的关系

- **解决的问题**:传统终端对 AI 工作流不友好(纯文本、无块结构、无 agent 编排、无团队共享上下文)。Warp 重写终端,并在其上叠加编码 agent、多 agent 管理、团队知识库(Drive),再用 Oz 把 agent 推到云端做后台/定时/事件触发的自主执行。
- **技术栈定位**:横跨多层,不是单一层:
  - **平台 / 产品**:桌面 ADE 应用(终端 + 编码 + agent + Drive 四合一)。
  - **Harness(骨架)**:内置编码 agent 的循环、上下文引擎、工具层、规划、权限/人在环。
  - **编排框架 + 基础设施**:Oz —— 触发、编排、执行、环境、密钥注入、结果审计;含 CLI / API / SDK / 调度器 / Docker 沙箱。
  - **CLI agent 宿主**:同一 UI 内也能跑第三方 CLI agent(Claude Code / Codex / OpenCode / Gemini CLI)。
- **与底层 LLM 的关系**:Warp **不训练自有基础模型**,是模型无关的编排层。可接 OpenAI / Anthropic / Google 的最新模型,2025 年底支持 **20+ 模型**(点名过 OpenAI o3 / GPT-5、Anthropic Claude Sonnet 4 / Opus 4 / Opus 4.1、Google Gemini 2.5 Pro;开源仓库另支持 Kimi / MiniMax / Qwen 等开放权重)。推理经 Warp 控制面路由,LLM 提供方均在 **零数据保留(ZDR)** 协议下,不存储/不训练用户数据。

---

## 3. 架构与核心组件(点名真实构件)

Warp 2.0(2025-06 发布)四大能力合一:**Code / Agents / Terminal / Drive**,统一入口是「既接 prompt 也接终端命令」的 universal input。

底层控制/执行分离(企业文档明确):

- **控制面(Control Plane,Warp 托管)**:任务编排、可观测性、LLM 推理路由——均走 Warp 服务器,在 ZDR 下。
- **执行面(Execution Plane,可选位置)**:agent 实际运行、访问源码仓库、跑 shell 命令、用运行时密钥的地方——可在 Warp 云,也可在客户自有网络。

按构件点名:

- **Oz —— 编排平台**:官方定位「驱动 Warp 全部 agent 的编排平台」。既在 Warp 本地跑交互式 agent,也把自主 agent 部署到云端。核心原语:**触发(triggering)/ 编排(orchestrating)/ 执行(executing,可选环境)/ 密钥注入(injecting secrets)/ 结果审计(inspecting results)**。
- **循环 + 规划**:编码 agent 有专门 **planning mode**,用 reasoning 模型(点名 o3)先出实现计划再改代码;`/plan` 命令进入规划对话。⚠️ 有 GitHub issue #8176 报告 planning model 已不能在 Agent Profiles 单独配置(文档滞后),说明"独立 planning 模型"这一细节可能已变化。
- **上下文引擎(记忆)**:`grep` / `glob` 到 **codebase embeddings**(大仓用)做文件发现;实时索引代码库;`@` 提及、blocks、images、URLs、选区做上下文注入;**MCP**;**Warp Drive**(团队共享知识库,见 §5)。
- **工具层**:跑命令(含长运行命令 pip / REPL / server logs)、读写文件、native code diff 编辑、SSH 环境、MCP servers。兼容 `AGENT.md` / Skills / MCP,并自动识别已有 `CLAUDE.md` / `Cursor` 规则文件。
- **执行器 / 沙箱**:云 agent 在 **Docker 容器** 隔离运行(Warp 托管在 GCP);**Environment** = repo + 镜像 + 启动命令(可加多个仓库给全上下文)。
- **调度器**:Oz 内置 cron 调度(`oz schedule --cron ...`)。
- **多 agent 管理**:Agent Management Panel / `oz.warp.dev` web app —— 并行跑多 agent、看状态、需要人介入时通知。
- **Skills(角色/可复用 agent 定义)**:可把 Skill 当 agent 启动,含为 Claude Code / Codex 写的 Skill。
- **消息总线 / 事件源**:Slack、GitHub(Actions)、Linear、CI step、crash/bug report、cron 都能触发云 agent。⚠️ 官方未把内部通信显式称作"message bus";self-hosted managed worker 经 **WebSocket** 连回 Oz。

---

## 4. 一步步怎么运转(控制/编排回路)—— 讲课主线

### A. 本地交互式 agent(在 Warp app 里)

1. **输入**:用户在 universal input 写 prompt(或敲终端命令)。选模型(20+ 可选),可附上下文(`@` 文件、blocks、images、URL、选区、MCP、Warp Drive)。
2. **上下文收集**:agent 用 `grep`/`glob` + codebase embeddings 做文件发现;实时索引本地代码库;拉取 Warp Drive 里团队规则/命令/notebook/env vars;可跨多仓。
3. **规划**:如进入 planning mode(`/plan`),用 reasoning 模型(o3 类)先产出实现计划,与人对齐,再动手(⚠️ 独立 planning 模型配置项可能已被移除,见 §3)。
4. **执行循环**:LLM 经 Warp 控制面(ZDR)推理 → agent 调工具(读写文件、native diff 编辑、跑命令/长运行命令、SSH、MCP)。
5. **人在环闸门**:按权限设置在关键点暂停——批准某条命令、审阅 diff、确认 file read、确认完成。可设 allowlist/denylist 让部分命令自主执行;任务中途可暂停纠偏。
6. **通知 + 收尾**:任务完成或需人介入时发 in-app / 系统通知;diff 可一键接受;会话可共享、云同步、进 activity log。

### B. 云端自主 agent(Oz)

1. **触发**:system event / schedule(cron)/ 集成(Slack、GitHub、Linear、CI、crash/bug report)或手动显式启动。
2. **编排**:Oz 接管生命周期。开源仓库示例:Oz 做 issue 三分诊断(triage)、提澄清问题、生成实现计划、写代码、开 PR——全程公开可追踪。
3. **执行(带环境)**:agent 在 **Environment**(Docker 容器 + repo + 镜像 + 启动命令)里跑;可加多仓拿全上下文;跨仓改动;用团队共享上下文。
   - 本地:`oz agent run --prompt "..."`
   - 云端:`oz agent run-cloud --prompt "..." --environment <slug>`
   - 定时:`oz schedule --skill "flag-cleanup" --cron "0 2 * * *"`
4. **密钥注入**:运行时安全注入 secret(不落库到 LLM)。
5. **结果审计**:每次 run 产出持久记录——status、metadata、session transcript(prompt、plan、commands、logs、outputs、后续消息)、可分享链接、artifact(PR / branch / plan)。经 CLI / API / web 在访问控制下被团队查看/实时驾驶。
6. **部署形态**:
   - Warp 托管(GCP,Docker 隔离)。
   - Self-hosted **managed**:`oz-agent-worker` 守护进程经 WebSocket 连 Oz,自动收任务,agent 在你机器的 Docker 容器里跑。
   - Self-hosted **unmanaged**:直接在 CI / K8s / dev 环境跑 `oz agent run`(Linux/macOS/Windows,无 Docker 依赖)。两者均**仅需出站网络,无需入站**。

### C. 开源仓库的"agent 公开建站"回路(2026-04 起)

用户在产品或 GitHub 提功能请求 → Oz 分诊 → 提澄清问题 → 生成计划 → 写代码 → 开 PR,全公开;由 GPT 模型(含 GPT-5.5)驱动,OpenAI 旗舰赞助。用户可从 triage 一路追到 production。

---

## 5. Harness 层设计

- **上下文 / 记忆管理**:三层——(a)实时代码库索引 + embeddings + grep/glob;(b)对话内注入(`@`、blocks、图片、URL、选区、MCP、prompt queueing、conversation forking);(c)**Warp Drive** 团队级持久共享(命令、notebook、env vars、prompt、组织 rule、MCP 配置),agent 与人共享同一知识库,保证跨团队一致执行。支持 `AGENT.md` / Skills,自动识别 `CLAUDE.md` / Cursor 规则。
- **工具接口**:文件读写、native code diff、命令执行(含长运行)、SSH、MCP servers、自定义 router / 自定义 endpoint / 自带 API key。
- **规划**:planning mode(reasoning 模型先出计划再执行);Oz 侧把复杂任务拆成可执行步骤 + 结构化计划。
- **多 agent 交接**:agent 多线程,并行跑多个,Management Panel 统一看状态;Oz 支持 parallel / scheduled / event-driven 编排模式;Skill 作为可复用 agent 定义可被其他 agent 启动。⚠️ 官方未明确给出"agent 间自动 handoff/委派协议"的正式规格,更多是人或编排逻辑并行调度。
- **人在环**:细粒度权限——文件读/写范围、可用 MCP server、可跑命令(allowlist/denylist)、diff 自动接受开关、需要审阅计划/批准命令/确认完成的闸门、中途暂停纠偏。
- **沙箱**:云 agent 在 Docker 容器隔离(Warp 托管或自托管);Environment 定义 repo+镜像+启动命令;控制面/执行面分离让敏感执行可留在客户网络;ZDR + 仅出站网络。

---

## 6. 独特设计取舍(为什么有人选它)

- **终端作为控制面**:把 CLI/终端当成 agent 的天然工作台与操控台,而非另建 IDE;对重命令行/重服务器/SSH 的工程师摩擦小。
- **一个 UI 同时容纳内置 agent 与外部 CLI agent**:不锁死自家 agent,可直接在 Warp 里跑 Claude Code / Codex / Gemini CLI / OpenCode,复用其 Skill。
- **本地交互 + 云端自主同一编排层(Oz)**:同一套原语从"人在旁边手动驾驭"平滑过渡到"事件触发、定时、并行、跨仓的后台自主执行"。Warp 自我定位 **面向团队**(对比 Claude Code 面向个人)。
- **控制面/执行面分离 + 自托管 + ZDR + 仅出站网络**:企业可把源码与命令执行留在自有网络,只把编排/推理走 Warp,合规友好。
- **开源 + agent 公开建产品**:客户端 AGPL/MIT 开源,且用自家 agent(GPT 驱动、OpenAI 赞助)在公开仓库自我迭代,是一种"dogfooding + 社区 + 营销"合一的取舍。
- **代价/权衡**:核心云服务(Drive、Oz 云托管)仍闭源且计费(AI 用量 + 计算用量);推理默认经 Warp 服务器(虽 ZDR);内置 agent 与外部 CLI agent 的能力/权限模型不完全一致。

---

## 7. 采用度信号

- **GitHub**:`warpdotdev/warp` **62,785 star / 5,169 fork / 4,499 open issues**(GitHub API,**2026-07-04** 时点;repo 页显示 "62.8k stars",一致)。仓库创建 2021-07-08,55 个 release,最新 `v0.2026.06.03.09.49.stable`(2026-06-03)。Rust 占 ~98.3%。
- **用户规模**:官方 2026-04 公告称「近 100 万开发者」使用;客户含 **Docker、Ramp、Peloton**,并称覆盖「超过半数 Fortune 500」。⚠️ 均为官方自述,未独立核实。
- **产品里程碑(官方 2025 回顾)**:2025-02 Windows 版;2025-06 Warp 2.0;2025-09 Warp Code;2025-11 Agents 3.0。
- **量化(官方 2025 数字,未独立核实)**:agent 编辑 **32 亿行代码**;索引/同步 **12 万+ 代码库**;处理"数十万亿 tokens";内部合并 **10,000+ PR**、关闭 940 issue;diff 接受率 **96%+**。
- **Benchmark(官方自报,两个时点)**:
  - 2025-06(2.0 发布):Terminal-Bench **#1,52%**;SWE-bench Verified **top-5,71%**。
  - 2025 年底回顾:Terminal-Bench **61.2%**;SWE-bench Verified **75.6%**。
  - ⚠️ 均为官方口径,基准分数随模型/时间变动,非第三方独立评测。
- **其他**:入选 TIME "Best Inventions of 2025";Newsweek AI Impact Award(官方自述)。
- **势头**:CEO 在播客称 ARR「每周 +$1M」——⚠️ 创始人口径,未经独立核实。

---

## 8. 来源(URL)

1. GitHub 仓库(定位/许可/star/结构):https://github.com/warpdotdev/warp
2. Warp 2.0 发布博客(四大能力/agent/上下文/人在环/benchmark):https://www.warp.dev/blog/reimagining-coding-agentic-development-environment
3. Oz 发布博客(编排原语/环境/Skill/CLI/调度/沙箱):https://www.warp.dev/blog/oz-orchestration-platform-cloud-agents
4. Agent Platform 文档(交互式 vs 云 agent / 子系统清单):https://docs.warp.dev/agent-platform/
5. Cloud Agents 文档(触发源/原语/审计/自托管模式):https://docs.warp.dev/agent-platform/cloud-agents/overview/
6. 企业架构文档(控制面/执行面/ZDR/仅出站网络):https://docs.warp.dev/enterprise/enterprise-features/architecture-and-deployment/
7. 开源公告(2026-04-28,开源范围/OpenAI 赞助/GPT-5.5/客户):https://www.warp.dev/newsroom/2026/4/28/warp-open-sources-its-agentic-development-environment
8. 2025 年度回顾(里程碑/量化/benchmark):https://www.warp.dev/blog/2025-in-review
9. Wikipedia(公司史/融资/许可/平台):https://en.wikipedia.org/wiki/Warp_(terminal)

---

### 未能核实/存疑清单
- Series A 金额 $17M vs $23M 口径冲突(§1)。
- "GPT-5.5" 模型对外命名无法独立核实(§1)。
- 用户"近百万 / 超半数 Fortune 500"、32 亿行代码、96%+ 接受率、benchmark 分数、每周 +$1M ARR —— 全为 Warp 官方/创始人自述,无第三方独立验证(§7)。
- planning mode 是否仍支持"独立 planning 模型"配置存疑(GitHub issue #8176,文档可能滞后)(§3/§4)。
- Oz 内部通信是否存在正式"消息总线",以及多 agent 之间是否有自动 handoff 协议——官方未给正式规格(§3/§5)。
