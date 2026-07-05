# Stanford STORM / Co-STORM 技术拆解（快照：2026 年中）

## 1. 一句话定位 + 出身 + 许可 + 状态

**一句话**：STORM 是一个由 LLM 驱动的**知识策展（knowledge curation）系统**——给它一个主题，它先"多视角提问 + 模拟对话 + 联网检索"做前期调研，再生成带引用的、维基百科式的长文报告；Co-STORM 是其**人机协作**升级版，让多个 LM agent 就主题相互提问/回答，人类可旁观或插话引导，最终产出一份挂着"思维导图"的报告。

- **STORM 缩写**：Synthesis of Topic Outlines through **R**etrieval and **M**ulti-perspective Question Asking。
- **出身**：斯坦福 **OVAL（Open Virtual Assistant Lab，开放虚拟助手实验室）**，PI 为 Monica S. Lam 教授。
  - STORM 论文《Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models》，**NAACL 2024**，作者 Yijia Shao, Yucheng Jiang, Theodore A. Kanell, Peter Xu, Omar Khattab, Monica S. Lam（arXiv 2402.14207）。
  - Co-STORM 论文《Into the Unknown Unknowns: Engaged Human Learning through Participation in Language Model Agent Conversations》，**EMNLP 2024 main**，作者 Yucheng Jiang, Yijia Shao, Dekun Ma, Sina Semnani, Monica S. Lam（arXiv 2408.15232）。
- **许可**：仓库代码 **MIT License**（Copyright (c) 2024 Stanford Open Virtual Assistant Lab）。注意：其检索到的维基百科内容本身受 CC BY-SA 约束——代码许可与生成内容的来源许可是两回事。
- **状态（截至 2026 年中）**：**开源、活跃度中等**。未被收购、未改名、未废弃。仓库仍是主要入口，`knowledge-storm` PyPI 包在维护。GitHub Releases 页最后一个打了 tag 的 release 是 **v1.1.0（2025-01-23，LiteLLM 兼容）**；但 PyPI 上有更新的 **`knowledge-storm` v1.1.1（2025-09-29）**（GitHub Releases 未同步打 tag，属 PyPI-only 发布）——说明 2025 下半年仍有维护动作，只是节奏低（约每半年一个补丁版）。在线 demo `storm.genie.stanford.edu` 仍挂着研究预览，官方 README 称累计 **7 万+** 用户试用过（"More than 70,000 people have tried our live research preview"）。

---

## 2. 它解决什么问题 + 在技术栈里的位置

**问题**：从零写一篇有广度、有深度、有引用、结构合理的长文（如维基条目）。裸 LLM 的痛点是——不知道该问什么问题（覆盖面窄）、容易幻觉、无引用、组织混乱。STORM 把"**前期调研 pre-writing**"当成核心难点来攻，而不是只优化"下笔 writing"。Co-STORM 进一步解决"**unknown unknowns**"——用户根本不知道自己该问什么，靠围观多 agent 对话来"偶遇"盲区。

**栈里的位置**：它是一个**领域专用的 agentic 应用 / 编排管线（application-level orchestration pipeline）**，不是通用 agent 框架，也不是模型提供商。
- 对下：**模型无关**。通过 **DSPy**（Omar Khattab 是共同作者，DSPy 是其编程/签名/优化抽象）组织所有 LLM 调用；v1.1.0 起接入 **LiteLLM**，从而支持 LiteLLM 覆盖的几乎所有 LM 与 embedding 模型（OpenAI/Anthropic Claude/Google/DeepSeek/Ollama/VLLM/TGI/Together 等）。
- 对检索：可插拔的 Retriever 层，内置 `YouRM`、`BingSearch`、`SerperRM`、`BraveRM`、`SearXNG`、`DuckDuckGoSearchRM`、`TavilySearchRM`、`GoogleSearch`、`AzureAISearch`，以及用于自有语料的向量检索 `VectorRM`。
- 形态判定：更像"**harness + 编排管线**"，而非单体 agent；Co-STORM 内部才真正是"**多 agent 编排**"。它不给你写代码/开发环境，专注文本知识合成。

---

## 3. 架构与核心组件

### STORM（自动、无人在环）
四大模块（对应 `STORMWikiRunner` 的四个阶段方法）：
1. **Knowledge Curation Module**（知识策展）——多视角提问 + 模拟对话 + 检索，产出信息表。
2. **Outline Generation Module**（大纲生成）——从对话信息生成分层大纲。
3. **Article Generation Module**（正文生成）——按大纲逐节写作、带内联引用。
4. **Article Polishing Module**（润色）——写导语/摘要、去重。

关键类与数据结构：
- 顶层编排：`STORMWikiRunner`；配置 `STORMWikiRunnerArguments`、`STORMWikiLMConfigs`；检索 `Retriever`。
- 视角发现：`StormPersonaGenerator`（找相似维基页、抽取其目录 TOC、生成多个 persona）。
- 模拟对话：`AskQuestion` / `AskQuestionWithPersona`（WikiWriter 角色带 persona 提问）、`TopicExpert`（把问题转成检索 query、检索、给出**基于检索结果 grounded** 的回答）、`ConvToSection` / `WriteSection`（写作）、`WritePageOutline` / `WritePageOutlineFromConv`（大纲）、`WriteLeadSection` / `PolishPage`（润色）。
- 数据结构：`StormInformationTable`（保存所有对话轮 + 引用来源）、`StormArticle`（分层 section/引用）、`DialogueTurn`（记录 utterance、回答、搜索 query、检索结果）。

### Co-STORM（多 agent + 人在环）
- 顶层编排：`CoStormRunner`；配置 `CollaborativeStormLMConfigs`、`RunnerArgument`。
- **回合调度器 `DiscourseManager`**——实现"discourse protocol / 回合策略（turn policy）"，决定下一步由谁发言。
- **Agent 角色**：
  - `CoStormExpert`（领域专家，基于外部知识 grounded 回答并追问）；
  - `Moderator`（主持人，受"已检索但尚未深挖"的信息启发，抛出发人深省的问题，保证覆盖面/引出 unknown unknowns）；
  - `SimulatedUser`（用于自动化测试，模拟人类 utterance）；
  - `PureRAGAgent`（纯 RAG 基线 agent，直接检索直答，作对照）；
  - **人类用户**（旁观或主动插话引导）。
- **动态思维导图 / 知识库**：`KnowledgeBase` 数据类，是一棵 `KnowledgeNode` 父子层级树；
  - `InsertInformationModule`（用 LLM 判断 + 向量相似度，把新信息挂到合适节点）；
  - `ExpandNodeModule`（某节点信息过多时自动重构、拆子节。
- 多个专用 LM 配置位：`question_answering_lm`、`question_asking_lm`、`utterance_polishing_lm` 等。

---

## 4. 逐步控制流（最重要）

### STORM 的 `run()` 管线（一次请求从头到尾）
输入：一个 topic 字符串。`STORMWikiRunner.run()` 顺序执行（可从中间 checkpoint 续跑）：

1. **run_knowledge_curation_module**
   a. **视角发现**：`StormPersonaGenerator` 检索与该 topic 相似的现有维基条目 → 抽取它们的目录结构 → 归纳出 N 个"视角/persona"（默认含一个"基础事实撰写者"+ 若干专业视角）。
   b. **多轮模拟对话**（每个 persona 各开一场，可并行）：扮演"维基写手"的 LLM 带着该 persona 向 `TopicExpert` 提问 → Expert 把问题**改写成搜索 query** → 走 Retriever 联网检索 → 基于检索片段生成 grounded 回答并附来源 → 写手据此更新理解、追问下一问（多轮）。
   c. 所有轮次、引用落入 `StormInformationTable`。

2. **run_outline_generation_module**
   先用 `WritePageOutline` 从 LLM 内在知识起一个草稿大纲，再用 `WritePageOutlineFromConv` **结合模拟对话里的信息**精修成分层 Markdown 大纲。

3. **run_article_generation_module**
   拆出一级 section → 对每个 section 从 `StormInformationTable` 取相关信息 → `WriteSection` 逐节生成带**内联引用**的正文（多节并行）→ 拼装（跳过 Introduction/Conclusion 这类会另行处理的节）。

4. **run_article_polishing_module**
   `WriteLeadSection` 写导语/摘要给读者速览；可选 `PolishPage` 全文去重、统一表达。

输出：Markdown 长文 + 参考文献。全程无人参与。

### Co-STORM 的回合循环 `CoStormRunner.step()`
这是一个**逐回合的多 agent 对话循环**，人类可随时插入：

1. **warm start（热启动）**：预交互初始化——先生成多个专家视角、跑一批模拟对话、建起初始 `KnowledgeBase`（思维导图雏形），并给用户一段总结，建立"共享概念空间"。
2. 进入 `step()` 循环，每回合：
   a. 若用户给了 utterance，先加入对话历史；
   b. **`DiscourseManager` 按 turn policy 选下一个发言者**——可能是：让某 `CoStormExpert` 回答一个 query / 让 `Moderator` 抛新问题 / 让 `SimulatedUser` 参与 / **根据对话焦点更新专家名单**；
   c. 选中的 agent 结合"知识库 + 历史"生成回答（专家回答走检索 grounding）；
   d. **知识库更新**：`InsertInformationModule` 把新信息挂进思维导图对应节点；
   e. **必要时重组**：`ExpandNodeModule` 在节点过载时拆分出有意义的子节，保持导图可读。
3. 人类可选择只旁观、也可插话把话题引向自己关心的方向（这就是"steer the discourse"）。
4. 任意时刻调用 **`generate_report()`**：把思维导图的**节点名当作章节标题**，将累积知识组织成带章节/子章节/引用的结构化报告作为"takeaways"。

---

## 5. Harness 级设计细节

- **上下文 / 记忆管理**：STORM 的"记忆"是外部化的 `StormInformationTable`（对话+引用），不是塞进单一超长 prompt——写作阶段按 section 精准取用相关信息，天然做上下文压缩。Co-STORM 更进一步用 **`KnowledgeBase` 层级树（思维导图）**作为持久、结构化的共享记忆，靠"LLM 判断 + 向量相似度"决定信息归属，节点过载自动拆分——这是它对"长对话上下文膨胀"的核心答案。
- **工具接口**：工具面窄而专——核心是**检索**，抽象成可插拔 Retriever（Bing/Serper/Brave/Tavily/DuckDuckGo/SearXNG/Google/AzureAISearch/You，加自有语料 `VectorRM`）。所有 LLM 调用经 **DSPy 签名/模块**组织，v1.1.0 后经 **LiteLLM** 统一模型接入。
- **规划**：规划是"**流水线式的隐式规划**"而非通用 ReAct planner——STORM 的"计划"就是四阶段固定管线；真正的"探索性规划"发生在 Co-STORM 的 `DiscourseManager` turn policy 里（决定下一步问谁、答什么、要不要换专家）。
- **多 agent handoff**：仅 Co-STORM 有真正的多 agent 交接，由 `DiscourseManager` 集中调度（中心化回合制，而非去中心化自由竞争发言）。
- **Human-in-the-loop**：这是 Co-STORM 相对 STORM 的**根本区别**——用户可旁观或插话引导，agent"替用户提问"，帮用户撞见"unknown unknowns"。STORM 本身是全自动、无人在环。
- **Sandboxing**：**未找到公开数据** 表明有代码执行沙箱——它不执行任意代码，工具面基本只有网络检索，安全边界主要是检索 API 而非任意 shell/代码执行，因此沙箱不是其设计重点。

---

## 6. 与同类的差异化设计与取舍

- **"提问"作为一等公民**：与"outline-then-retrieve"的朴素 RAG 长文基线相比，STORM 把重心放在"**问对问题**"——先从相似维基条目里发现**多视角**，再让不同 persona 提问，从而拓宽覆盖面。论文报告：相较 outline-driven RAG 基线，STORM 生成文章在"组织性"上绝对提升约 **25%**、在"广度"上约 **10%**。
- **模拟对话 grounding 每一步**：每个回答都强制走检索并附引用，压制幻觉、保证可溯源。
- **Co-STORM 的"unknown unknowns"定位**：不是又一个"深度研究"直答工具，而是让用户**围观 agent 之间的对话**去发现盲区——这是它区别于 Perplexity/一般 deep-research agent 的独特卖点。思维导图作为共享认知支架。
- **DSPy-native**：可对 prompt/流水线做程序化优化，模型可换、可调，学术可复现性强。
- **取舍**：
  - 专而不通——只做知识合成/写作，不写代码、不做通用 agent 任务；
  - 全自动 STORM 速度/成本随视角数与检索轮数上升；
  - 输出偏"维基风格"长报告，团队公开表示在探索"维基之外的其他呈现形式"；
  - 中心化回合调度实现简单、可控，但不是可无限扩展的自治多 agent 群。

---

## 7. 采用与热度信号

- **GitHub `stanford-oval/storm`**：约 **29.8k stars、2.8k forks**（as of 抓取时，2026-07 前后；星数为近期读数，非精确实时）。抓取时显示 ~58 open issues、~64 open PRs。**contributor 数量未找到公开数据**（页面加载受限）。
- **在线 demo**：`storm.genie.stanford.edu`，官方称 **7 万+** 用户试用过研究预览版。
- **学术分量**：两篇会议主论文（NAACL 2024 + EMNLP 2024 main），配套数据集 **FreshWiki**（2022-02～2023-09 的 100 篇高质量维基条目）与 **WildSeek**（复杂信息检索任务对）。
- **谱系**：出自 OVAL，与该实验室的 **WikiChat**（抗幻觉 RAG）一脉相承，STORM 被视为其知识策展方向的延续。
- **动能判断**：星数高、被大量二次教程/媒体报道引用；打 tag 的 GitHub release 停在 2025-01（v1.1.0），但 PyPI 上有 v1.1.1（2025-09-29）补丁版，说明仍在低频维护——热度更多来自"经典参考实现"地位而非高频迭代。

---

## 8. 来源（primary / 权威）

1. GitHub 主仓库 README — https://github.com/stanford-oval/storm （定位、模块、类名、检索器列表、star 数、demo、许可）
2. GitHub Releases — https://github.com/stanford-oval/storm/releases （v0.1.0→v1.1.0 版本历史、Co-STORM/LiteLLM/DSPy/VectorRM 演进、日期）
3. LICENSE — https://raw.githubusercontent.com/stanford-oval/storm/main/LICENSE （MIT，2024 Stanford OVAL）
4. STORM 论文（NAACL 2024，ACL Anthology）— https://aclanthology.org/2024.naacl-long.347/ ；arXiv — https://arxiv.org/abs/2402.14207
5. Co-STORM 论文（EMNLP 2024 main，ACL Anthology）— https://aclanthology.org/2024.emnlp-main.554/ ；arXiv — https://arxiv.org/abs/2408.15232
6. 官方项目页 — https://storm-project.stanford.edu/research/storm/ （团队、发表、demo 链接）
7. DeepWiki 架构解析（STORM pipeline）— https://deepwiki.com/stanford-oval/storm/2-storm-pipeline （STORMWikiRunner 各阶段方法与类名）
8. DeepWiki 架构解析（Co-STORM）— https://deepwiki.com/stanford-oval/storm/3-co-storm-collaborative-system （CoStormRunner.step、DiscourseManager、KnowledgeBase/思维导图模块）

> 说明：DeepWiki 为第三方代码索引，但其内容与官方 README/代码类名高度一致，故用作类名/方法名交叉验证。所有星数、7 万用户等数字均标注为"读数/官方声称"，非独立实时核验。

---

## 核验记录（2026-07 独立核对）

对本文"最容易错"的高风险声明逐条独立核验（数字 / 归属 / 版本 / 超级词 / 架构细节）：

**已改正（1 处实质性错误）：**
- **版本 / 维护节奏**：原文称"最后一个正式 release 是 v1.1.0（2025-01-23）"，并把"2025 下半年是否有新 release"标记为"未找到公开数据 / 不确定"。经查 PyPI `knowledge-storm` 存在更新版 **v1.1.1，上传时间 2025-09-29**（PyPI JSON API `upload_time_iso_8601` = 2025-09-29T22:34:31Z）。GitHub Releases 页确未为其打 tag（仍停在 v1.1.0），属 PyPI-only 发布。已改写"状态"段与"动能判断"段：明确 2025 下半年仍有低频维护，删去"未找到公开数据"的空缺表述。

**已核实无误（保留原文）：**
- GitHub `stanford-oval/storm`：**29.8k stars、2.8k forks、58 open issues、64 open PRs**（README 抓取值，与原文一致；contributor 数页面确实未展示，"未找到公开数据"表述保留）。
- 许可：**MIT，Copyright (c) 2024 Stanford Open Virtual Assistant Lab**（LICENSE 原文核对一致）。
- STORM 缩写：Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking（README 一致）。
- 出身实验室：**OVAL = Open Virtual Assistant Lab，PI 为 Monica Lam**（oval.cs.stanford.edu 首页确认）。
- STORM 论文：NAACL 2024，作者 Shao / Jiang / Kanell / Xu / Khattab / Lam，arXiv 2402.14207 —— 全部一致（ACL Anthology 2024.naacl-long.347）。
- Co-STORM 论文：《Into the Unknown Unknowns…》**EMNLP 2024 main**（Miami，2024-11），作者 Jiang / Shao / Ma / Semnani / Lam，arXiv 2408.15232 —— 全部一致（ACL Anthology 2024.emnlp-main.554）。
- Retriever 列表（YouRM / BingSearch / VectorRM / SerperRM / BraveRM / SearXNG / DuckDuckGoSearchRM / TavilySearchRM / GoogleSearch / AzureAISearch）—— 与 README 一致。
- 评测数字："组织性 +25%（绝对）、广度 +10%"—— 与 NAACL 论文/README 表述一致。
- 数据集：FreshWiki（100 篇高质量维基条目，**2022-02～2023-09** 最常编辑页）、WildSeek（信息检索 topic+goal 对）—— 一致。
- "7 万+ 用户"、demo `storm.genie.stanford.edu` —— README 原文"More than 70,000 people have tried our live research preview"确认。
- "探索维基之外的呈现形式"—— README roadmap 有对应项"Information Abstraction… presentation formats beyond the Wikipedia-style report"，属实。
- 版本演进（v0.1.0 2024-04→v0.2.0 2024-07 加 VectorRM+web UI→v1.0.0 2024-09 加 Co-STORM→v1.1.0 2025-01 LiteLLM）—— GitHub Releases 核对一致。

**未能独立核实（保留原文的"未找到公开数据"标注，未删）：** contributor 总数（GitHub 页面未展示）；Co-STORM 内部类名 `CoStormExpert / SimulatedUser / PureRAGAgent / InsertInformationModule / ExpandNodeModule` 未在官方 README 出现，仅经 DeepWiki 第三方索引交叉验证——按原文说明保留该来源限定，未作删除。
