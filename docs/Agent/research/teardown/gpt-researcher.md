# GPT-Researcher 拆解 (Teardown)

> 快照时间：2026 年年中（mid-2026）。本文只收录可溯源的事实；数字若为估计会显式标注。

## 1. 一句话定位 + 出品方 + 许可证 + 2026 状态

**一句话定位**：GPT-Researcher 是一个**开源的自主"深度研究"agent**——你给它一个问题，它自己规划子问题、并行抓取多个网页/本地文档、逐源摘要、去重聚合，最后产出一份**带引用的长报告**（PDF / Docx / Markdown）。它把"搜索"升级为"研究"：不是返回原始搜索结果让你自己筛，而是自主探索、交叉验证多源后给出综合结论。

- **出品方**：作者 **Assaf Elovic**（个人发起，2023-05-12 建仓）。Assaf Elovic 同时是搜索/检索 API 公司 **Tavily** 的联合创始人，Tavily 是本项目的默认检索后端，但项目本身独立、非 Tavily 专属产品。
- **许可证**：**Apache-2.0**（以主仓库根 `LICENSE` 文件与 GitHub API `license.spdx_id` 为准，两者均为 Apache-2.0；已核验）。
  - ⚠️ **需注意的口径冲突**：官网 gptr.dev 首页某处仍写"License: MIT"。经核验，MIT 实际是**独立的 MCP server 仓库 `gptr-mcp` 的许可证**，而 gptr-researcher 主体是 Apache-2.0——官网把两者混写了。**主项目以仓库为准 = Apache-2.0。**
- **2026 状态**：**活跃**。最新版本 **v3.5.1（2026-06-23）**，共 71 个 release；仓库 `pushed_at` 为 2026-06-28。未更名、未被收购、未废弃。近期新增能力包括 **MCP server 集成** 与 **Google Gemini 内联图像生成**。

---

## 2. 解决什么问题 + 在技术栈中的位置

**问题**：单次 LLM 调用做研究有三大痛点——(a) 幻觉/错误信息，(b) 上下文窗口塞不下大量来源，(c) 结果不确定、不可复现。GPT-Researcher 借鉴 **Plan-and-Solve** 与 **RAG** 思路，用"规划 + 并行执行 + 逐源摘要"来降低幻觉、提速、增强确定性。文档口径：**单次研究平均聚合 20+ 个网页来源**，约 **3 分钟 / ~$0.1**（标准模式，用 GPT-4o-mini + GPT-4o 混合）。

**在栈中的位置**：它是一个**应用层的编排框架 + 可直接跑的产品**，横跨多种形态：
- 作为 **agent/编排框架**：`pip install gpt-researcher`，嵌进你自己的代码。
- 作为**端到端产品**：自带 FastAPI 后端 + 前端（轻量 HTML/JS 版 或 NextJS+Tailwind 版），Docker 一键起。
- 作为**多智能体系统**：基于 LangGraph / AG2(AutoGen) 的多角色团队。
- 作为**工具/服务**：`gptr-mcp` 把它包成 MCP server，供 Claude / ChatGPT 等外部 AI 调用。

**与底层 LLM 提供商的关系**：**provider-agnostic（不锁定厂商）**。默认用 OpenAI，但通过 `llm_provider` 配置可切换 Anthropic Claude、Google Gemini/Vertex、Mistral、Ollama（本地）、Groq、Together、Bedrock、DeepSeek、OpenRouter、Azure OpenAI 等；也支持任意 OpenAI 兼容端点（`OPENAI_BASE_URL`）。检索侧同理：默认 Tavily，可换 Google、Bing、DuckDuckGo、Serper、SearX、Arxiv、Exa、custom、MCP，且可逗号分隔多检索器串联。**LLM 与检索都是可插拔适配层，不是硬绑定。**

---

## 3. 架构与核心组件

GPT-Researcher 有**两套架构**，对应两种复杂度：

### A. 标准架构（默认，`GPTResearcher` 类）—— 三层 agent
1. **Planner Agent（规划器）**：把用户 query 拆成一组"合起来能形成客观结论"的研究子问题。
2. **Execution / Crawler Agents（执行/爬取器）**：对每个子问题触发一个爬取 agent，抓取在线资源；逐源摘要并**记录来源出处**。
3. **Publisher Agent（发布器）**：过滤、去重、聚合所有摘要，生成最终报告。

### B. 多智能体架构（`multi_agents/`，基于 LangGraph，受 STORM 论文启发）—— 编辑部式角色分工
仿一个"研究编辑部"，角色：
- **Human**（可选）：监督、给反馈。
- **Chief Editor（主编）**：总协调，用 LangGraph 驱动整个团队。
- **Researcher（gpt-researcher 本体）**：做深度自主研究。
- **Editor（编辑）**：规划报告大纲与结构。
- **Reviewer（审稿）**：按标准校验研究正确性。
- **Revisor / Reviser（修订）**：根据审稿反馈修正。
- **Writer（撰稿）**：汇编最终报告。
- **Publisher（发布）**：输出 PDF / Docx / Markdown。

**技术栈**：后端 FastAPI + uvicorn；多智能体编排 LangGraph + AG2(AutoGen)；LLM/文档处理 LangChain；检索默认 Tavily；前端 HTML/JS 或 NextJS+Tailwind；Docker 部署。语言构成大致 Python ~58% / TypeScript ~26% / JS ~7%。

---

## 4. 逐步控制流（最重要）

### 标准模式的编排循环（一次 `.conduct_research()` → `.write_report()`）
1. **建域 agent**：根据 query/task 创建一个领域专用 agent（选定 prompt、report_type、检索器、来源范围）。
2. **规划子问题**：Planner 让 LLM 生成一组研究子问题，合起来覆盖主题、力求客观。
3. **并行检索**：对每个子问题，触发一个 crawler agent，用配置的检索器（默认 Tavily）搜网、抓取 top 资源。这一步是 **并行/异步（async/await）** 的——多个子问题同时跑，这是"提速"的关键。
4. **逐源摘要 + 记源**：对每个抓到的资源，让 LLM 基于"与该子问题的相关性"做压缩摘要，同时保存 URL/出处，供最后引用。
5. **聚合去重**：Publisher 过滤、聚合所有摘要成一个统一 context（这一步在做 map-reduce 式的上下文压缩，避免超窗）。
6. **成文**：把聚合 context 喂给 LLM 生成最终报告（5-6 页），附引用；再由 publisher 导出 PDF/Docx/MD。

> 用一句 mental model 概括：**一个 planner 扇出 N 个并行的"搜索→摘要"分支，再 reduce 成一份带引用的报告。** 上下文管理靠"逐源先摘要再聚合"而非把原始网页全塞进窗口。

### Deep Research 模式（递归树状探索）
在标准 fan-out 之上再加**递归深度**，模拟人类"顺着线索往下挖"：
- 每一层生成多个搜索 query 探索主题的不同侧面（**breadth**）；
- 对每个分支**递归下钻**，追踪线索、发现关联（**depth**）；
- **Smart Context Management**：自动跨所有分支聚合、综合发现。
- 参数：`deep_research_breadth`（每层并行路径数，默认 **4**）、`deep_research_depth`（下钻层数，默认 **2**）、`deep_research_concurrency`（并发数，默认 **4**）。
- 用 async/await 同时跑多条研究路径。
- 成本口径：**~5 分钟 / ~$0.4**，推荐用**推理型模型**如 `o3-mini`（`'high'` reasoning effort）。

### 多智能体（LangGraph）流水线
`plan → 采集/分析 → review/revise → write/submit → publish` 五阶段。关键点：**"对大纲里的每个主题并行执行 Researcher→Reviewer→Revisor 的迭代精修"**，再由 Writer 汇编、Publisher 出稿；`include_human_feedback` 打开可插入人工反馈环。

---

## 5. Harness 级设计

- **上下文/记忆管理**：核心手法是**"逐源摘要 → 聚合"的 map-reduce 压缩**，把 20+ 来源压成能进上下文窗口的浓缩 context，而不是把原始网页硬塞。混合模式下同时管理 web + 本地文档两路 context；Deep Research 用 "Smart Context Management" 跨分支综合。
- **工具/检索接口**：检索器是可插拔适配层（Tavily / Google / Bing / DuckDuckGo / Serper / SearX / Arxiv / Exa / custom / MCP），可逗号串联多个按序使用。MCP 采用**两阶段智能选择**：Stage 1 LLM 从可用 MCP server 里挑最相关工具，Stage 2 用带 query 参数的调用执行研究（由 LangChain 集成驱动）。
- **规划**：标准模式一次性生成子问题；Deep Research 递归再规划（每层重新出 query）；多智能体模式由 Editor 生成大纲、Chief Editor 编排。
- **多 agent 交接**：LangGraph 状态图驱动角色间 handoff（Chief Editor→Editor→Researcher→Reviewer→Revisor→Writer→Publisher），大纲各主题**并行**处理。
- **Human-in-the-loop**：`include_human_feedback` 开关，可在自主研究环里插入人工监督/反馈。
- **本地/私有数据**：`DOC_PATH` + `report_source="local"/"hybrid"` 支持 PDF、纯文本、CSV、Excel、Markdown、PPT、Word；也可传 LangChain document、指定 `source_urls`、`complement_source_urls` 控制是否越出给定 URL 再研究。
- **报告类型**：`research_report`（标准）、`custom_report`（自定义方向与版式，如"APA 格式含引用"）、`langchain_documents`、`static`（指定 URL）、`local`、`hybrid`。
- **沙箱**：未找到公开的强隔离沙箱机制说明（它主要做只读的网页抓取 + LLM 推理，不是执行任意代码的 agent，因此沙箱不是其核心关注点）。

---

## 6. 与同类相比的独特设计与取舍

- **"研究"而非"搜索"**：相较普通 web-search 工具返回原始结果占满上下文，GPT-Researcher 自主探索、交叉验证、只留相关最新信息 —— 这是它被包成 MCP server 后相对标准搜索工具的核心卖点。
- **provider/retriever 双不锁定**：LLM 和检索器都可插拔，避免被单一厂商绑定；同时默认 Tavily 让开箱即用体验顺滑。
- **并行 fan-out 降本提速**：靠 async 并行的"搜索→摘要"分支，把长研究压到 ~3 分钟 / ~$0.1（标准）。
- **两档复杂度**：标准三层 agent（便宜快）↔ 多智能体编辑部 / Deep Research（更深更贵）。用户按预算与深度自选。
- **成本优化的模型混用**：标准模式混用 GPT-4o-mini（便宜摘要）+ GPT-4o（成文，128K 窗），Deep Research 才上推理模型 o3-mini。
- **取舍**：非商业 SaaS——本体免费开源，用户只付底层 LLM/检索的账单（无 gptr.dev 平台计费）。对比 Perplexity Deep Research / OpenAI Deep Research 这类闭源产品，它的卖点是**可自托管、可定制、可审计引用、不锁厂商**；代价是需要自己配 key、自己运维。
- **理论渊源**：Plan-and-Solve、RAG（标准架构）；STORM（多智能体架构）。

---

## 7. 采用信号（Adoption）

- **GitHub Stars**：**~28,062★**（截至 2026-06 GitHub API 读数），forks **~3,788**，open issues **~201**，71 个 release。（早前二手来源的 27,972★ 与本读数一致同量级。）
- **PyPI**：官网称"millions of downloads"（**百万级下载，官方口径，未独立核实具体数字**）。
- **社区**：官网称"hundreds of contributors"、Discord "thousands of members"（官方口径，未独立核实）。
- **第三方评测**：官网称在 **卡内基梅隆 DeepResearchGym** 基准（2025-05）上"Ranked #1"、领先 Perplexity / OpenAI 的 Deep Research。**⚠️ 此说法与原论文不符（已核验，arXiv:2505.19253）**：该论文并未评出任何"综合第一"，成绩按维度分散——Perplexity 在 Key Point Recall 上最高，GPT-Researcher 强在引用精度/召回（citation precision ~89、recall ~94）；论文明确指出"即使表现最好的系统"在信息覆盖度上仍逊于写作质量。"#1"属官网自我营销的过度概括，非基准结论。
- **生态位**：261 个 GitHub dependent 项目（依赖它的仓库，GitHub 口径）；被 Tavily 官方文档收录为开源示例；有独立 MCP server 项目 `gptr-mcp`。
- **动量**：2026 年仍高频发版（v3.5.x），持续加 MCP、图像生成等新特性，属**持续活跃演进**而非维护停滞。

---

## 8. Sources

1. GitHub 仓库（README / 描述 / 技术栈 / release）— https://github.com/assafelovic/gpt-researcher
2. GitHub API（stars/forks/issues/license/时间戳，本次读数的权威来源）— https://api.github.com/repos/assafelovic/gpt-researcher
3. 官方文档 · 架构与流程 Introduction — https://docs.gptr.dev/docs/gpt-researcher/getting-started/introduction
4. 官方文档 · Deep Research（递归树/参数/成本）— https://docs.gptr.dev/docs/gpt-researcher/gptr/deep_research
5. 官方文档 · 多智能体 LangGraph（角色分工/STORM）— https://docs.gptr.dev/docs/gpt-researcher/multi_agents/langgraph
6. 官方文档 · 检索器与报告类型/本地文档 — https://docs.gptr.dev/docs/gpt-researcher/search-engines & https://docs.gptr.dev/docs/gpt-researcher/context/tailored-research
7. 官方文档 · MCP 集成（两阶段工具选择）+ MCP server 仓库 — https://docs.gptr.dev/docs/gpt-researcher/mcp-server/getting-started & https://github.com/assafelovic/gptr-mcp
8. Tavily 官方文档收录页 — https://docs.tavily.com/examples/open-sources/gpt-researcher

---

### 未能独立核实 / 需标注的项
- **官网"License: MIT"**：已核验，MIT 属独立的 `gptr-mcp` 仓库；主项目为 Apache-2.0（官网混写）。
- **PyPI"百万级下载"、Discord"数千成员"、"数百贡献者"**：均为官方自述，未独立核实（PyPI 页面存在但未拉到精确下载数）。
- **DeepResearchGym #1（CMU, 2025-05）**：已核验 arXiv:2505.19253，论文**未评出综合第一**；"#1"为官网营销概括，已在正文改正。

---

## 核验记录

快照复核时间 2026-07-04（对抗式核查，"每条高风险断言默认为错，直到有源证实"）。

**逐条核验（GitHub API 权威读数，api.github.com/repos/assafelovic/gpt-researcher）**
- Stars 28,062 / forks 3,788 / open issues 201 —— 与正文完全一致 ✓
- License spdx_id = Apache-2.0 ✓；created_at 2023-05-12 ✓；pushed_at 2026-06-28 ✓；主语言 Python ✓
- Release 数：分页计数 = **71** ✓；最新 tag **v3.5.1 / 2026-06-23** ✓
- Dependents：network/dependents 页显示 **261 Repositories** ✓

**官方文档核验**
- 20+ 来源、~3 分钟 / ~$0.1、gpt-4o-mini + gpt-4o(128K)：introduction 页原文一致 ✓
- Deep Research：breadth=4 / depth=2 / concurrency=4、~5 分钟 / ~$0.4、o3-mini(high)：deep_research 页原文一致 ✓
- 多智能体：7 角色（Human/Chief Editor/Researcher/Editor/Reviewer/Revisor/Writer/Publisher）、明确"Inspired by STORM (arXiv:2402.14207)" ✓

**已修正的错误**
1. **DeepResearchGym"Ranked #1"** —— 最高风险项。原文仅标"需核实"，实为**错误**：CMU 论文（arXiv:2505.19253）评测 6 个系统，未评出综合第一，成绩按维度分散（Perplexity 领先 Key Point Recall，GPT-Researcher 强在引用精度/召回）。已在正文明确改正为"官网营销概括，非基准结论"。
2. **许可证口径** —— 原文称官网"MIT"是"过时/口误"。核验后更精确：MIT 是**独立 `gptr-mcp` 仓库**的许可证，官网首页把它与主项目 Apache-2.0 混写。已改正解释。

**保留为"官方自述、未独立核实"（无独立源可证，未删但已标注）**：PyPI"百万级下载"、Discord"数千成员"、"数百贡献者"。
