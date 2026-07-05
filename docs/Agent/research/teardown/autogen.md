# Microsoft AutoGen / AG2 — 拆解简报

> 快照时间：2026 年年中。本文只写有一手来源支撑的内容，估算/未证实处均已明确标注。

---

## 1. 一句话定位 + 出身 + 许可证 + 2026 状态

**一句话定位**：AutoGen 是一个**事件驱动的多智能体"对话"编程框架**——把复杂任务拆给多个可对话（conversable）的 agent，让它们通过异步消息互相协作/交接来完成任务。

- **谁造的**：微软研究院（Microsoft Research，AI Frontiers 实验室）。原始论文作者包括 Qingyun Wu、Chi Wang、Gagan Bansal、Adam Fourney、Ahmed Awadallah 等（COLM 2024，获 ICLR'24 LLM Agents Workshop Best Paper）。
- **许可证**：代码 **MIT**，文档 **CC-BY-4.0**（`microsoft/autogen` 仓库双许可）。社区分叉 **AG2** 用 **Apache-2.0**（叠加继承自 MIT 的原始代码）。
- **2026 状态（关键）**：
  - **原版 AutoGen 已进入"维护模式"（maintenance mode）**。仓库明文："AutoGen is now in maintenance mode. It will not receive new features or enhancements and is community managed going forward." 只收 bug 修复/安全补丁，不再有新功能投入。
  - **原因**：2025 年 10 月 1 日，微软宣布把 **AutoGen + Semantic Kernel 合并**成统一的 **Microsoft Agent Framework (MAF)**，作为"企业级后继者"。MAF 于 2025-10-01 公开预览，**2026-04-03 发布 1.0 GA（.NET + Python，MIT 许可）**。微软官方推荐新用户直接上 MAF。
  - **AG2 社区分叉仍在活跃开发**：v0.14.0（2026-06-26），有明确的 v1.0 路线图。
  - 一句话概括 2026 现状：**"原创者出走成立 AG2、微软把品牌并入 MAF"——AutoGen 这个名字既没死也没被收购，而是被拆成了两条继承线。**

---

## 2. 解决什么问题 + 在技术栈里的位置

**问题**：单个 LLM 一次调用无法可靠完成需要"规划 → 调工具 → 写代码 → 执行 → 反思 → 重试"的多步任务。AutoGen 的立论是：**把这些能力拆成不同角色的 agent，让它们像人类团队一样"对话"来协作**，比单体 prompt 更模块化、可复用、可控。

**在栈里的位置**：它是**编排框架（orchestration framework）**，不是单个 agent、也不是终端产品。层次上：

```
你的业务应用
    ↓
AutoGen（编排框架：多 agent 对话/交接/群聊）
    ↓
LLM 客户端层（OpenAI / AzureOpenAI / 本地模型…）
    ↓
底层 LLM 提供商
```

- **与 LLM 提供商的关系**：AutoGen **自己不训练/不托管模型**，通过 Extensions 层的 model client（`OpenAIChatCompletionClient`、`AzureOpenAIChatCompletionClient` 等）接入。模型是可插拔的。
- **同时也附带了准产品层**：**AutoGen Studio**（低代码 GUI）和 **AutoGen Bench**（评测工具），但官方明确 Studio "is not a production ready tool"，主打快速原型/研究。

---

## 3. 架构与核心组件（v0.4 分层重写）

v0.4 是相对 v0.2 的**彻底重写**，从"单进程对话循环"改成"**Actor 模型 + 异步消息总线**"。四层：

1. **Core API（底层）**——事件驱动的基础设施：Actor 模型的 agent runtime、异步消息传递、支持本地/分布式 runtime、支持事件驱动与请求/响应两种交互模式。**跨语言互操作**（当前 Python + .NET/C#，仓库语言构成 Python 61.7% / C# 25.1% / TypeScript 12.4%）。内建 **OpenTelemetry** 可观测性（metric、message tracing、debug）。
2. **AgentChat API（高层）**——面向任务的"有主张"的高级 API，快速原型用。提供预置 agent（`AssistantAgent`、`UserProxyAgent`）、群聊/团队、代码执行、流式、序列化、状态管理、memory。行为向 v0.2 兼容以便迁移。
3. **Extensions API**——core 接口的具体实现 + 第三方集成：LLM 客户端（OpenAI/AzureOpenAI）、Azure 代码执行器等。
4. **Developer Tools**——**AutoGen Studio**（无代码 GUI）、**AutoGen Bench**（GAIA/WebArena/AssistantBench 等基准）。

**Magentic-One** 是用 AgentChat + Extensions 搭出来的"state-of-the-art 多 agent 团队"，既是示范也是可复用组件（`MagenticOneGroupChat`）。

核心概念术语：**ConversableAgent / AssistantAgent / UserProxyAgent**（角色）、**Team / GroupChat**（编排单元）、**TerminationCondition**（终止条件）、**HandoffMessage**（Swarm 交接消息）、**Model Client / Tool**（工具层）。

---

## 4. 一步步：一个请求怎么流过控制/编排循环（最重要）

以 v0.4 AgentChat 的**团队（Team）**为例，一个用户任务的实际流程：

1. **构造团队**：开发者创建若干 agent（如一个 `AssistantAgent` 带工具、一个 `UserProxyAgent` 或 `CodeExecutorAgent`），塞进某种 **Team** 编排器，并设置**终止条件**（如 `TextMentionTermination("TERMINATE")`、`MaxMessageTermination(n)`，可 `|` 组合）。
2. **投递任务**：调用 `team.run(task=...)` 或 `run_stream(...)`。任务作为初始消息进入团队的共享上下文。
3. **选下一个发言者（编排的核心分歧点）**，取决于 Team 类型：
   - **RoundRobinGroupChat**：所有 agent 共享同一上下文，**按固定顺序轮流**发言，每次发言广播给全体。
   - **SelectorGroupChat**：每条消息广播后，**用一个 ChatCompletion 模型（LLM）动态挑下一个发言者**（可自定义 selector 逻辑）。
   - **Swarm**：agent 用 **`HandoffMessage` 显式把控制权交给指定 agent**（去中心化交接，细粒度委派）。
   - **MagenticOneGroupChat**：由 Orchestrator 用双账本机制驱动（见第 5 节 / Magentic-One）。
4. **被选中的 agent 执行一步**：agent 拿共享上下文调 LLM → 可能产出 **工具调用 / 代码块 / 文本**。
5. **工具/代码执行**：若产生工具调用或代码，由对应执行器执行（如 `CodeExecutorAgent` / Docker / 本地命令行 / Azure executor），**结果作为新消息回灌**到共享上下文。
6. **广播 + 检查终止**：新消息广播给团队；团队在每个 agent 响应后**调用一次终止条件**。未满足则回到步骤 3 继续选下一个发言者。
7. **（可选）人类介入**：`UserProxyAgent` 可在环中暂停，向真人要输入/审批，再把人类回复注入上下文。
8. **终止 + 返回**：满足终止条件后，团队停止，返回完整 `TaskResult`（消息序列 + 停止原因）。状态可序列化，支持保存/恢复继续跑。

**要点**：整个循环本质是"**共享消息上下文 + 一个'谁下一个说话'的调度策略 + 每步可执行工具/代码 + 终止条件把关**"。不同 Team 类型只是替换了第 3 步的调度策略。

---

## 5. Harness 级设计

- **上下文/Memory 管理**：群聊团队用**共享消息上下文**（每 agent 广播给全体）；v0.4 新增独立的 **Memory** 能力、状态**序列化/持久化**（`save_state`/`load_state`），可暂停-恢复长任务。
- **工具接口**：agent 挂载 Python 函数作为 tool（走 LLM 的 function/tool calling），Extensions 提供 model client 与执行器。
- **代码执行 / 沙箱**：`CodeExecutorAgent` + 可插拔执行后端——**本地命令行、Docker 容器、Azure Container 代码执行器**。Docker/容器是推荐的隔离方式；纯本地执行有安全风险，官方多次提示。
- **规划（Planning）**：AgentChat 本身不强制 planner；显式规划体现在 **Magentic-One 的 Orchestrator**——**Task Ledger**（外循环：事实、猜测、计划）+ **Progress Ledger**（内循环：进度自反思、给各 agent 派活、判断是否完成/是否卡住）。卡住时外循环重写 Task Ledger、重新规划。
- **多智能体交接（Handoff）**：**Swarm** 用 `HandoffMessage` 做显式点对点交接；**Selector** 用 LLM 动态选人；**RoundRobin** 固定轮转。
- **Human-in-the-loop**：`UserProxyAgent` 提供多种人类参与模式（每步/从不/终止时），可把真人当作团队里的一个"agent"。
- **可观测性**：内建 OpenTelemetry，跨进程 message tracing / metrics / debug——这是相对 v0.2 的重要 harness 升级。

**Magentic-One 具体机制**（`arXiv:2411.04468`，v1 提交于 2024-11-07）：Orchestrator 领导 4 个专用 agent——**WebSurfer**（用 Chromium，靠 accessibility tree + set-of-marks 提示做网页交互）、**FileSurfer**（markdown 预览读本地文件/目录）、**Coder**（写代码/产物）、**ComputerTerminal**（跑代码、装库）。默认所有 agent 用 **GPT-4o**。

---

## 6. 独特设计选择与取舍（vs 同侪）

- **"对话即编程"（conversation programming）**：把多 agent 协作抽象成消息对话，是 AutoGen 最初的招牌立论——用自然语言 + 代码定义 agent 行为和对话模式。相比 LangGraph 的"显式状态图"，AutoGen 更偏"让 agent 自由对话/由 LLM 动态选人"，灵活但更难精确控制。
- **v0.4 转向 Actor 模型 / 异步消息总线**：换来分布式、跨语言（Python+.NET）、事件驱动、可观测——代价是**从 v0.2 到 v0.4 的破坏性重写**，迁移有成本，社区一度分裂。
- **分层抽象**：Core（要控制）/ AgentChat（要快）/ Extensions（要集成），可按需选层。
- **强代码执行 + 研究血统**：内建代码执行器 + AutoGenBench + Magentic-One 在 GAIA/WebArena/AssistantBench 上的实测，是它相对纯"编排库"的差异化。
- **取舍/风险**：治理动荡是最大痛点——**原创者出走→AG2 分叉**、**微软品牌→并入 MAF**，导致"选哪条线"成了实际决策成本。选 AutoGen 的人现在多半要在 **AG2（社区继续）vs MAF（微软企业级后继）** 之间做迁移决策。

**Magentic-One 基准**（来源：MSR 文章 + arXiv）：在 GAIA / AssistantBench / WebArena 上取得**与当时 SOTA 统计上相当**的表现，且**不修改核心架构**。文章中给出人类水平参照 GAIA ~92%、WebArena ~78%；Magentic-One 各基准的**具体准确率百分比在原文以柱状图呈现，正文未给文字数值**——**精确数字未找到公开文字数据**（需查 arXiv:2411.04468 全文表格）。

---

## 7. 采纳信号

- **GitHub stars**：`microsoft/autogen` **约 59.5k**（本次抓取时，2026 年年中）。⚠️ 注意有二手来源称 2026-01-15 为 53,482 星，本简报以仓库页面实测 59.5k 为准，量级一致、趋势向上。
- **AG2 分叉**：`ag2ai/ag2` **约 4.7k stars**（本次抓取）。
- **最新版本**：AutoGen 最后功能版约 **python-v0.7.5（2025-09-30）**，之后进入维护模式；AG2 **v0.14.0（2026-06-26）** 仍在更新。
- **维护者背景**：AG2 由跨组织志愿者群体维护（含来自 Meta、IBM、多所高校的研究者；管理员 Chi Wang、Qingyun Wu，即原 AutoGen 核心作者）。
- **动能判断**：作为独立框架，AutoGen 品牌处于**收敛/迁移期**（微软主推 MAF）；但其思想与代码通过 **MAF（企业线）+ AG2（社区线）** 双线延续，装机与教程基数仍很大。**具体企业客户名单未找到可靠一手公开数据**。

---

## 8. 来源（primary / 权威）

1. `microsoft/autogen` GitHub 仓库（tagline、许可证、维护模式声明、四层架构、stars、版本）：https://github.com/microsoft/autogen
2. Microsoft Research 博客《AutoGen v0.4: Reimagining the foundation of agentic AI…》（Actor 模型、异步消息、跨语言、OpenTelemetry）：https://www.microsoft.com/en-us/research/blog/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/
3. AutoGen 官方文档 — Magentic-One（Orchestrator、Task/Progress Ledger、5 个 agent）：https://microsoft.github.io/autogen/stable//user-guide/agentchat-user-guide/magentic-one.html
4. Microsoft Research 文章《Magentic-One: A Generalist Multi-Agent System…》（GPT-4o、双循环、GAIA/WebArena/AssistantBench，arXiv:2411.04468 v1 2024-11-07）：https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/
5. `ag2ai/ag2` GitHub 仓库（AgentOS 定位、Apache-2.0、2024-11-11 分叉、治理、v0.14.0）：https://github.com/ag2ai/ag2
6. Microsoft Research 论文《AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation》（ConversableAgent/GroupChat/conversation programming，COLM 2024）：https://www.microsoft.com/en-us/research/publication/autogen-enabling-next-gen-llm-applications-via-multi-agent-conversation-framework/
7. VentureBeat《Microsoft retires AutoGen and debuts Agent Framework…》+ Visual Studio Magazine（2025-10-01 AutoGen+Semantic Kernel→MAF、维护模式）：https://venturebeat.com/ai/microsoft-retires-autogen-and-debuts-agent-framework-to-unify-and-govern
8. Microsoft Research 博客《Introducing AutoGen Studio》（低代码 Team Builder / Playground / Gallery，非生产工具）：https://www.microsoft.com/en-us/research/blog/introducing-autogen-studio-a-low-code-interface-for-building-multi-agent-workflows/

---

## 核验记录

本次对高风险主张做了独立复核（快照 2026-07）。逐项结果：

**已改正：**
- **Magentic-One arXiv 提交日期**：原文写 `2024-11-04`，实为 `arXiv:2411.04468` v1 提交于 **2024-11-07 UTC**（arxiv.org/abs/2411.04468 提交历史）。第 5、6 节两处均已改。
- **MAF 1.0 发布日期精确化**：原文只写"2026 年 4 月发布 1.0"，已精确到 **2026-04-03 GA**（Visual Studio Magazine 2026-04-06 报道 + MAF devblog《Version 1.0》），并补注 MAF 采用 MIT 许可。

**逐条核验为正确、未改（直接抓仓库/一手页面确认）：**
- `microsoft/autogen` **59.5k stars**、双许可 CC-BY-4.0 + MIT、维护模式声明原文、语言构成 Python 61.7% / C# 25.1% / TypeScript 12.4%——均与仓库页面一致。（部分二手站给出 53k–58.7k 的旧/低值，已在第 7 节保留量级说明。）
- `ag2ai/ag2` **4.7k stars**、**Apache-2.0**、最新 **v0.14.0（2026-06-26）**、fork 起点 **2024-11-11**（"evolving AutoGen into AG2"）、维护者 Chi Wang / Qingyun Wu、tagline "Open-Source AgentOS"——均与仓库页面一致。
- AutoGen 最后功能版 **python-v0.7.5（2025-09-30）** 后进入维护模式：与 v0.4（2025 年初重写）之后的 0.7.x 线时间线自洽；注意个别二手来源误标为 2024，已按仓库/时间线判为 2025。
- 2025-10-01 AutoGen + Semantic Kernel 合并为 MAF、两者转入"maintenance mode"（不加新功能，仅 bug/安全补丁）——多来源一致。
- AutoGen 论文 **COLM 2024**，且获 **ICLR'24 LLM Agents Workshop Best Paper**——官方推文 + 论文页确认。
- Magentic-One 摘要原文："statistically competitive ... to the state-of-the-art"，跨 GAIA / AssistantBench / WebArena，"without modification to core agent capabilities"——与第 6 节表述一致；默认 GPT-4o、四个专用 agent（WebSurfer/FileSurfer/Coder/ComputerTerminal）确认。

**存疑/未证实，按原文保留标注（未强改）：**
- Magentic-One 各基准的精确文字准确率——原文仅以柱状图呈现，正文无文字数值，简报已如实标注"未找到公开文字数据"。
- 具体企业客户名单——无可靠一手公开来源，简报已标注"未找到"。
