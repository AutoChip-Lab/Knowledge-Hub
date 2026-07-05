# Windsurf (Cascade) 拆解简报

> 快照时间：2026-07（mid-2026）。本简报以官方文档、Cognition/Devin 工程博客与主要新闻源为准。**重大状态变更：Windsurf 已于 2026-06-02 更名为 "Devin Desktop"，Cascade agent 被 "Devin Local"（Rust 重写）继承。** 下文以 Cascade 时代设计为主，并标注 2026 的更名/迭代。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **一句话定位**：Windsurf 是一个"agentic IDE"（VS Code fork），其核心是名为 **Cascade** 的 agent，能在整个代码库上做多文件、多步骤的读-改-测-跑闭环，并具备实时行为感知（flow awareness）、持久记忆（Memories）与工具调用（含 MCP、终端、Web）。
- **出品方**：最初由 **Codeium** 开发（公司前身 **Exafunction**，2021-06 由 **Varun Mohan**（CEO）与 **Douglas Chen** 创立，2022 从 GPU 优化转向 AI 编码工具）。Windsurf Editor 于 **2024-11-13** 发布，自称"第一个 agentic IDE"。2025-07 起归属 **Cognition AI**（Devin 的公司）。
- **许可**：**闭源商业产品**（proprietary）。不是开源框架，无公开源码仓库；GitHub 上没有产品本体的可 star 仓库（区别于 Cursor/Copilot 也同样闭源）。**GitHub star 数：不适用/未找到公开数据**。
- **2026 状态**：**活跃，但已更名并整合进 Devin 产品线**。
  - 2025-07 收购三方拆分（见 §6）后，Windsurf 品牌与产品由 Cognition 运营为子公司。
  - 2025-10-29 发布自研模型 **SWE-1.5**。
  - 2025-11 发布 **Windsurf Codemaps**（AI 标注代码库地图）。
  - **2026-06-02 通过 OTA 更新更名为 "Devin Desktop"**；Cascade 被 **Devin Local**（Rust 从零重写）取代，遗留 Cascade agent 支持延续至 **2026-07-01**（EOL）。文档已迁移至 docs.devin.ai（Cascade 页现存于 `docs.devin.ai/desktop/cascade/cascade`）；旧 docs.windsurf.com 仍可解析并指向新品牌主页。

---

## 2. 解决什么问题 + 在栈中的位置

- **问题**：把 LLM 从"聊天补全"升级为"能在真实代码库里自主执行任务"的 agent，并解决 agent 最大痛点——**上下文/代码库感知**（不只是当前打开的文件）与**人类可控性**（可审阅 diff、可回滚）。
- **栈中位置**：**完整产品（full product）= IDE + agent harness**，不是纯 agent 也不是可嵌入的编排框架。
  - 它**是一个 harness**：Cascade 就是围绕 LLM 的编排/工具/记忆外壳。Cognition 明确称其为 "the Cascade agent harness"，并用它做 SWE-1.5 的 RL 训练环境。
  - 它**不是**给开发者复用的库/SDK（区别于 LangGraph、AutoGen）。
- **与底层 LLM 的关系**：**模型可插拔**。Cascade 让用户选择底层模型（Claude Sonnet/GPT/Gemini 等第三方前沿模型），其上叠加 Codeium 自研的 **Indexing Engine**（代码库检索）、planning agent、记忆与工具层。2025-10 起补上**自研模型 SWE-1.5**（见 §6），可与第三方模型并存。因此它既是第三方 LLM 的消费方，也逐步自建模型。

---

## 3. 架构与核心组件（真实可命名的部件）

- **Editor 外壳**：VS Code fork，保留 extensions/keybindings/LSP。
- **Cascade agent**：agentic pane，含 **Code 模式**（可创建/修改代码库）与 **Chat 模式**（问答，不改盘）。
- **Planning agent（双 agent 结构）**：一个"专门的 planning agent 持续精炼长期计划"，被选中的执行模型据此做短期动作；产出并动态更新 **Todo 列表**。
- **Indexing Engine**：代码库索引/检索引擎，从**整个代码库**（非仅最近打开文件）取上下文，供补全与 Cascade 使用。
- **工具层**：Search、Analyze、Web Search、**MCP**（Model Context Protocol servers）、**终端（terminal）**。上限 **每个 prompt 最多 20 次 tool call**，用尽后出现 `continue` 按钮续跑。
- **Memories & Rules 系统**：
  - **Memories**：自动/手动生成，存于本地 `~/.codeium/windsurf/memories/`，**workspace 级、不入库、不跨工作区**。
  - **Rules**：`global_rules.md`（6,000 字符上限）、workspace 规则 `.windsurf/rules/*.md`（12,000 字符/文件，2026 新路径为 `.devin/rules/*.md`）、遗留 `.windsurfrules`；企业级还有系统路径。支持 `AGENTS.md`。
- **Workflows**：`.windsurf/workflows/` 下的 Markdown 配方，用 `/workflow-name` slash 命令触发的可复用 agentic recipe。
- **Checkpoints**：项目状态命名快照，可回滚。
- **Linter 集成**：自动修复生成代码的 lint 错误（默认开启）。
- **（2026 Devin Desktop 新增）**：**Agent Command Center**（Kanban 统管本地+云端 agent）、**Spaces**（跨 agent 共享上下文，分组 sessions/PR/文件）、**Devin Local**（Rust 重写、token 效率提升约 30%、支持 subagents + sandboxing）、**ACP（Agent Client Protocol）** 开放协议，可跑 Codex/Claude Agent/OpenCode 等第三方 agent。

---

## 4. 逐步工作流程（控制/编排闭环，最重要部分）

以用户在 Cascade（Code 模式）里发一条自然语言指令为例：

1. **上下文组装**：Cascade 不需要你手动喂上下文——它有 **real-time awareness**，感知你近期的编辑、终端输出、光标/选区；再叠加 **Indexing Engine** 对整库的检索结果，以及被激活的 **Rules**（按 `trigger`：`always_on` 全量注入 / `model_decision` 按相关性拉取 / `glob` 触碰匹配文件时 / `manual` 通过 `@rule-name`）和相关 **Memories**、被 `@` 引用的 Codemap。
2. **规划（Planning）**：对较长任务，后台 **planning agent** 生成/精炼**长期计划**，并在会话内建立 **Todo 列表**展示步骤；用户可要求修改 Todo 从而改计划。执行模型据此聚焦短期动作。
3. **动作循环（agentic loop）**：被选中的 LLM 迭代产出 **tool call**——从 Search/Analyze/Web Search/MCP/终端里选择；如需依赖会自动检测并安装缺失包。**每 prompt 至多 20 次 tool call**，用尽出现 `continue`。
4. **编辑分级为可审 diff**：Cascade 可一次改多文件，但把改动**暂存为可审阅 diff**，逐步（per-step）需人类批准后才落盘（human-in-the-loop）。
5. **Lint/自愈**：落盘后触发 linter，Cascade **自动修复**生成代码的 lint 错误（修 lint 的编辑可能免费扣额度）。
6. **回滚点**：用户可创建/回到 **checkpoint** 命名快照，或悬停撤销某步。
7. **记忆固化**：若 Cascade 认为出现值得记住的上下文（或你说"create a memory of…"），写入本地 Memories，供后续会话自动引用；跨机器/团队共享的知识则建议写成 Rule 或 `AGENTS.md`。
8. **消息排队**：任务执行中，用户可回车**排队后续消息**，完成后依次执行。

> 2026 版闭环差异：Devin Local（Rust）承接该 loop，新增 subagents 与 sandboxing；Agent Command Center 让一条请求可路由到本地或云端 Devin，多 agent 并行以 Kanban 管理。

---

## 5. Harness 级设计

- **上下文/记忆管理**：三层——(a) 短期"实时感知"（编辑/终端/选区）；(b) Indexing Engine 的整库检索；(c) 持久层 = 本地 Memories（自动、workspace 级、易失、不入库）+ 版本化 Rules（团队共享、`trigger` 控制注入方式）+ `AGENTS.md` + Codemaps 引用。设计上刻意把"易失的自动记忆"与"可提交的显式规则"分开。
- **工具接口**：内建工具 + **MCP** 开放服务器 + 终端；per-prompt 20 次 tool-call 预算 + `continue` 续跑，防止无限跑飞。
- **规划**：**独立 planning agent** 与执行模型解耦（长期计划 vs 短期动作）；计划以可编辑 Todo 呈现。
- **多 agent handoff**：Cascade 时代基本单 agent。**2026 Devin Local 引入 subagents**；**Agent Command Center + Spaces** 提供本地/云端多 agent 编排与上下文共享；**ACP** 允许把第三方 agent（Codex、Claude Agent、OpenCode）挂进同一 IDE。
- **Human-in-the-loop**：per-step diff 审批、checkpoints 回滚、Chat 模式只读、消息排队。
- **Sandboxing**：Cascade 时代文档未突出沙箱；**Devin Local 明确列出 sandboxing 为新特性**。

---

## 6. 独特设计选择与取舍（vs 同类）

- **"Flow awareness / real-time awareness"**：无需手动喂上下文，agent 跟随你的实时动作——这是相对早期 Cursor/Copilot 的差异化卖点（2024-11 首发即打"agentic IDE"标签）。
- **Indexing Engine 整库检索**：上下文取自全库而非仅打开文件，提升补全/回答质量。
- **Planning agent 与执行模型解耦**：长期计划由专门 agent 维护，降低长任务漂移。
- **模型-harness 协同设计（最独特）**：Cognition 用 **Cascade agent harness 本身**作为 RL 训练环境训练 **SWE-1.5**——"dogfood 模型→发现 harness 问题→改工具/prompt→再训练"的闭环。**SWE-1.5**：数千颗 **GB200 NVL72** 集群训练、基于某开源强基座、"数千亿参数"、用"无偏 policy gradient 变体"稳定长多轮轨迹；经 **Cerebras** 推理达 **最高 950 tok/s**（约 Haiku 4.5 的 6×、Sonnet 4.5 的 13×），SWE-Bench Pro 近前沿。取舍：速度/成本优先，绝对能力略让位于纯前沿模型。
- **Codemaps（2025-11）**：SWE-1.5 或 Sonnet 4.5 生成的 AI 标注代码地图，主打"先理解再 vibe"，可 `@{codemap}` 注入 Cascade。
- **闭源 + 产品化**：相对 LangGraph/AutoGen 等开源框架，Windsurf 是"开箱即用的 IDE 产品"，不可作为库嵌入——取舍是易用性换可组合性。
- **2026 转向"agent manager 包裹 IDE"**：Devin Desktop 定位从"编辑器 + AI"变为"agent 管理器 + 全功能 IDE"，并用 ACP 拥抱第三方 agent。

---

## 7. 采用信号

- **用户/企业**：官方口径 **100 万+ 开发者**、**350+ 企业客户**（如 JPMorgan Chase、Dell）；亦有二手源称 4,000+ 企业客户（**未在官方一手源核实，标注为存疑**）。
- **营收**：ARR 从 **$12M（2024 Q4）→ $82M（2025 Q2/收购时官方口径）**；另有二手源称 2025 Q3 达 $100M（企业 ARR 环比翻倍）——**$100M 数字为二手源，标注为存疑**。
- **资本事件（收购三方拆分，2025-07）**：
  - OpenAI 曾于 2025-05 约定以 **$3B** 收购，因 **Microsoft 依 OpenAI 协议可获其收购的 IP**（Windsurf 直接对标 GitHub Copilot），Nadella 拒绝豁免，独家期到期后崩盘（2025-07-11）。
  - **Google** 以 **$2.4B** 非独家**授权**技术，并聘走 CEO Varun Mohan、联创 Douglas Chen 及部分核心工程师（2025-07-11）。
  - **Cognition** 于 **2025-07-14** 收购剩余实体（IP/产品/品牌/客户），二手源估约 **$250M（未证实/存疑）**；Jeff Wang 升任 CEO，员工获加速 vesting。
  - OpenAI 最终一无所获。
- **动量**：被 Cognition 持续投入（SWE-1.5、Codemaps、Devin Desktop 更名、ACP），2026 仍在活跃迭代——momentum 为正，但品牌已并入 Devin。
- **GitHub stars**：**不适用**（闭源产品，无公开产品仓库）。

---

## 8. 来源（primary-first）

1. Windsurf/Devin 官方文档 — Cascade（现托管于 docs.devin.ai）：https://docs.devin.ai/desktop/cascade/cascade
2. 官方文档 — Memories & Rules：https://docs.devin.ai/desktop/cascade/memories
3. Cognition 工程博客 — Introducing SWE-1.5（一手模型/训练/推理细节）：https://cognition.com/blog/swe-1-5
4. Cognition 博客 — Windsurf Codemaps：https://cognition.com/blog/codemaps
5. Devin 官方博客 — "Windsurf is now Devin Desktop"（更名/Devin Local/ACP）：https://devin.ai/blog/windsurf-is-now-devin-desktop/
6. 官方文档 — Devin Desktop FAQ（更名/迁移/定价）：https://docs.devin.ai/desktop/devin-desktop-faq
7. DeepLearning.AI The Batch — 收购拆分时间线与金额：https://www.deeplearning.ai/the-batch/google-cognition-carve-up-windsurf-after-openais-failed-3b-acquisition-bid
8. TechCrunch — Cognition acquires Windsurf（2025-07-14）：https://techcrunch.com/2025/07/14/cognition-maker-of-the-ai-coding-agent-devin-acquires-windsurf/
9. Lenny's Newsletter — Varun Mohan 亲述 Windsurf 起源（founding/1M 用户）：https://www.lennysnewsletter.com/p/the-untold-story-of-windsurf-varun-mohan

---

### 存疑/未证实清单
- Cognition 收购剩余实体价 **~$250M**：仅二手源，未见官方数字确认。
- **$100M ARR（2025 Q3）**：二手源；官方收购口径为 $82M。
- **4,000+ 企业客户**：二手源，与官方 350+ 口径冲突，采信 350+。
- **SWE-1.5 精确参数量 / 基座模型名 / SWE-Bench Pro 具体分数**：官方仅给"数千亿参数""某强开源基座""near-frontier"，**具体数值未公开**。
- Devin Desktop 是否仍为 VS Code fork：官方 FAQ/更名博客未明确表态（仅称 extensions/keybindings/LSP/workflows 与 Windsurf 及 VSCode 向后兼容），**未找到明确一手确认**。

---

## 核验记录

核验日期：2026-07-04。逐条对照一手源（Cognition/Devin 博客、官方文档）与主要新闻源（TechCrunch、Bloomberg、Fortune、CNBC）。

**已核实无误（原文正确，保留）**：
- 出品方与创业史：Exafunction 2021-06 由 Varun Mohan（CEO）+ Douglas Chen 创立，2022 转向 AI 编码，Codeium beta 2022-10，Windsurf Editor 发布日 **2024-11-13**，自称"first agentic IDE"——均确认。
- 收购三方拆分：OpenAI 约 **$3B**（2025-05 达成协议、独家期到期后崩盘）、Google 约 **$2.4B** 非独家授权 + 挖走 Mohan/Chen（2025-07-11）、Cognition **2025-07-14** 收购剩余实体——时间线与金额均确认（一手：Cognition/TechCrunch/Bloomberg）。
- SWE-1.5：**2025-10-29** 发布；"thousands of GB200 NVL72"集群；"hundreds of billions of parameters"；"strong open-source model as the base"；Cerebras "up to **950 tok/s**"、"6x Haiku 4.5 / 13x Sonnet 4.5"；"variant of unbiased policy gradient"；"SWE-Bench Pro benchmark from Scale AI"、near-frontier——逐字确认（一手：cognition.com/blog/swe-1-5，含"co-optimize models and harness"dogfood 闭环）。
- Codemaps 发布 **2025-11**（announce 11-04），SWE-1.5 或 Sonnet 4.5 生成——确认。
- 更名：**2026-06-02** OTA 更名 Devin Desktop；Cascade → Devin Local（Rust 重写、up to 30% token 效率、subagents）；遗留 Cascade EOL **2026-07-01**；Agent Command Center / Spaces / ACP（支持 Codex/Claude Agent/OpenCode）——逐条确认（一手：devin.ai 更名博客）。
- Cascade 机制：Code 模式 vs Chat 模式、**每 prompt 20 次 tool call + `continue`**——逐字确认（docs.devin.ai/desktop/cascade/cascade）。
- 采用信号：1M+ 开发者、350+ 企业客户（JPMorgan/Dell）、ARR $82M（2025-07 口径）——确认。

**已修正**：
- §1 与 §8 源①原称 "docs.windsurf.com 现已 **307 重定向** 到 docs.devin.ai"。实测：docs.devin.ai/desktop/cascade/cascade 正常返回内容；旧 docs.windsurf.com 仍自解析（未见 307 到 docs.devin.ai）。已改为中性表述"文档已迁移至 docs.devin.ai，旧域名仍可解析"，删除未经证实的具体 HTTP 状态码。

**已在原文标注为存疑/未证实的项**（复核后维持存疑，未采信为事实）：Cognition 收购价 ~$250M（仅二手源）、$100M ARR（2025 Q3，二手源）、4,000+ 企业客户（与官方 350+ 冲突）、SWE-1.5 精确参数量/基座名/SWE-Bench Pro 具体分数（官方未公开）、Devin Desktop 是否仍为 VS Code fork（一手源未明确）。
