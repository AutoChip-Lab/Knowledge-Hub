# Kilo Code —— 事实底稿(快照:2026 年年中)

> 研究员注:Kilo 在 2026 年 4 月做了一次大改版("major rebuild"),把扩展重建在一个共享的开源内核(OpenCode server)之上,并**弃用了 Orchestrator 模式、把 "Modes" 重命名为 "Agents"、把 "Checkpoints" 改叫 "Snapshots"**。因此网上很多 2025 年素材描述的是**旧架构**(Orchestrator + 五模式)。本文对**旧/新两代设计都作标注**,因为教学站需要讲清楚这次演进。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**:开源编码 agent,官方自述"The open source coding agent for building with AI in VS Code, JetBrains, or the CLI"。跑在 VS Code / JetBrains 扩展、独立 CLI、以及云端(Cloud Agent / Code Reviews / KiloClaw)。卖点是 **500+ 模型、可任务中途切换、零加价按模型商原价付费**。
- **出品方**:Kilo Code(公司实体 Kilo,完全远程,约 30 人,分布北美与欧洲,枢纽在阿姆斯特丹和旧金山)。孵化自 **Open Core Ventures**(GitLab 联合创始人/前 CEO **Sid Sijbrandij** 的"把开源变商业公司"的机构)。创始 CEO **Jan Paul Posma**(已因个人原因退居);现任 CEO **Scott Breitenother**(2025 年 9 月加入,原 Brooklyn Data Co. 创始人);Sijbrandij 任执行主席。**已完成 800 万美元种子轮**(据 Tessl 深度报道)。
- **许可**:**MIT**(README 明确:可商用,保留署名与许可声明即可)。
- **2026 状态**:**活跃,未停更、未被收购、未改名**。GitHub 主仓 `Kilo-Org/kilocode` 在快照当日(2026-07-04)仍有提交(`pushed_at` 为 2026-07-04),`archived: false`。命名与产品结构在 2026-04 有重构但品牌未变。
  - ⚠️ **易混淆点**:被"关停/归档"的是 **Roo Code**(见 §6),不是 Kilo。Kilo 是 Roo 的 fork,是 Roo 官方推荐的迁移去处之一。

---

## 2. 解决什么问题 / 技术栈定位 / 与 LLM 的关系

- **解决什么**:在你自己的编辑器/终端里,用自然语言完成**跨多文件生成、重构、调试、跑命令、审查**的端到端编码任务;并把"用哪个模型"这件事变成可插拔、无加价、可中途切换。
- **技术栈定位**:它是一个 **coding agent + harness(scaffold)**,不是模型、也不是纯编排框架。更准确地说,2026-04 后它把自己叫作 **"all-in-one agentic engineering platform"**——同一个开源 agent 内核同时驱动 IDE 扩展、CLI 和云端 agent。它自身不训练/不托管模型。
- **与底层 LLM 的关系**:**模型中立**。用户可 BYO API key,或经 **Kilo Gateway** 访问 500+ 模型(OpenAI / Anthropic / Google / Mistral / Meta Llama / 自托管等),**零加价**转发。Kilo 是**编排层/harness**,LLM 是可替换的推理后端;支持**任务中途换模型**以匹配延迟/成本/推理强度。

---

## 3. 架构与核心组件(点名真实构件)

**运行时(2026-04 rebuild 后)**
- **可移植开源内核**:一个"portable, open-source core",在 VS Code / CLI / Cloud Agents 之间共享。**CLI 是 OpenCode 的 fork**(README 原文:"Kilo CLI is a fork of OpenCode, enhanced to work within the Kilo agentic engineering platform")。
- **Agents(原 Modes)**:内置 **Code / Plan / Ask / Debug / Review** 等专职 agent;每个 agent 有 `name`、`description`(供 agent 选择器与 orchestrator 委派时读取)、`prompt`(注入系统提示的 markdown 正文)、`model`(可 pin 到 `provider/model`)、`mode`(角色:`primary` 用户可选 / `subagent` 仅被委派 / `all`)。
- **工具层与权限**:工具类型包括 `read`、`edit`、`bash`、`glob`、`grep`、`task`、`webfetch`、`websearch`、`todowrite`、`todoread` 等;权限用 **glob + 有序规则(last-match-wins)** 控制,如 `edit: { "*.md": "allow", "*": "deny" }`。旧的"auto-confirm"整体开关已被**逐工具粒度权限**取代。
- **Subagents(子代理)**:核心委派原语。full-access agent 通过 **`task` 工具**启动子代理(类型如 `general` / `explore`),**子代理在独立上下文里跑(独立对话历史、无共享状态)**,完成后把**摘要**回传父 agent。
- **Agent Manager**:2026-04 引入,支持**同时运行多个 agent**(IDE 内并行)。
- **执行器**:直接编辑工作区文件(带 Smart Diff Preview 与审批门 y/n/d/s)、跑终端命令、控制浏览器。
- **快照(Snapshots,原 Checkpoints)**:基于 Git 的工作目录快照,可回滚。
- **记忆**:项目级 **AGENTS.md**(取代已弃用的 **Memory Bank**;旧 Memory Bank 存于 `.kilocode/rules/memory-bank/`,仍向后兼容);**Skills**(SKILL.md 元数据先行、按需加载);**Codebase Indexing**(AI embedding 存 **Qdrant**,做语义检索——⚠️ 2026-04 rebuild 后**暂时下线、开发中**)。
- **扩展**:**MCP marketplace**,一键接入 MCP server 扩展工具能力。

**旧架构(2025 → 2026-04 前,教学对照用)**
- 五模式:**Ask / Architect / Code / Debug / Orchestration**;Orchestrator 是"项目经理",Architect 是"技术负责人",Code 是"资深开发",Debug 是"SRE"。此设计谱系来自 Roo(Roo 首创 Custom modes、Architect/Code/Debug 拆分、diff-based editing)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 本节最重要

**A. 单 agent 工具-使用循环(plan–act–observe–fix)**
一次用户请求在一个 agent 内的典型回路:
1. **接收请求**:用户在 IDE/CLI 里下达自然语言指令;当前 agent(如 Code/Plan)带着其 `prompt`(系统提示)+ 项目上下文(AGENTS.md、@提及、索引检索结果、环境细节)组成 prompt。
2. **理解与规划**:agent 读请求 → 分析代码库上下文 → 生成分步计划(官方描述:"Understand the request → Analyze the codebase context → Create a step-by-step plan → Execute each step → Verify the results → Report completion")。
3. **执行一步(act)**:agent 发起一次工具调用——`read`/`glob`/`grep` 探查、`edit`(带 diff 预览与审批门)改文件、`bash` 跑命令、`webfetch`/`websearch` 取信息。权限规则(glob,last-match-wins)裁决该调用是否放行,否则弹逐工具审批。
4. **观察(observe)**:工具结果(文件内容、命令 stdout/stderr、diff)回灌到对话历史,作为下一轮输入。
5. **自检与修复(fix)**:agent 审查输出、发现错误就迭代(Debug 场景专注跑命令、看输出、反复修到通过)。
6. **循环**直到任务完成 → 报告完成。

**B. 子代理委派回路(2026-04 后的编排,取代 Orchestrator)**
1. **判断委派**:一个 full-access agent(Code/Plan/Debug)在执行中判断"某子任务放到隔离上下文更划算"(如探索代码库、并行检索、隔离处理某子任务)。
2. **启动子代理**:通过 **`task` 工具**开一个子代理会话(`general` 自主干活 / `explore` 只做代码库调研)。
3. **隔离执行**:子代理**在自己的独立上下文里跑**——独立对话历史、不共享状态——从而**不用父 agent 的细节淹没父上下文**。
4. **回传摘要**:子代理完成后**返回一段摘要**给父 agent;父 agent 拿摘要**继续**自己的工作。
   - ⚠️ 旧版(Orchestrator 模式)是同一机制的前身:Orchestrator 用 `new_task` 建子任务并指定 mode,父任务**暂停**;子任务在隔离上下文跑完,经 **`attempt_completion`** 把结果摘要传回,父任务恢复。2026-04 起 **Orchestrator 模式被弃用**,委派能力下放到普通 full-access agent,**不再需要专门的编排 agent**。

**C. 上下文侧的并发回路**
每当上下文接近窗口上限,**Context Condensing**(自动或手动 `/condense`)触发:分析历史 → 用配置的模型摘要 → 用压缩版替换详细历史(文中实测:65.3K → 9.4K tokens)。这条回路与 A/B 并行,保证长任务不撞窗口。

---

## 5. harness 层设计

- **上下文/记忆管理**:
  - **Automatic Context Search**——只捞相关文件,不把整库塞进去。
  - **Context Mentions(@ 语法)**——开发者手动把特定文件/函数钉进上下文。
  - **AGENTS.md**——项目根的持久 markdown,跨会话注入编码规范/指令(取代 Memory Bank)。
  - **Skills**——SKILL.md 三段式:发现只读元数据 → 元数据进上下文 → 匹配任务时才加载全文。
  - **Codebase Indexing**——embedding 存 Qdrant 做语义检索(⚠️ rebuild 后暂下线)。
  - **Context Condensing**——自动/`/condense` 压缩对话历史(见 §4C)。
- **工具接口**:标准化工具集(read/edit/bash/glob/grep/task/webfetch/websearch/todo*);**MCP** 作为外部工具扩展总线;逐工具 glob 权限。
- **规划**:旧 Architect / 新 Plan agent 负责"先出计划、不改代码";带内置 todo 工具跟踪步骤。
- **多 agent 交接**:`task` 工具 + 独立上下文 + 摘要回传;`mode: subagent` 的 agent 对用户隐藏、仅可被委派。Agent Manager 支持 IDE 内并行多 agent。
- **人在环**:diff 预览 + 审批门(y/n/d/s)、逐工具权限;也提供 CLI `--auto` 无提示模式给 CI/CD。
- **沙箱**:⚠️ **未找到 Kilo 自带强隔离沙箱/容器化执行的一手证据**;命令在本地工作区跑,隔离主要靠(a)子代理**上下文隔离**、(b)Git 快照回滚、(c)权限门。云端 KiloClaw / Cloud Agents 的隔离细节**未找到公开技术文档**。

---

## 6. 与同类相比的独特取舍(为什么有人选它)

- **谱系**:Cline → Roo Code → Kilo(Kilo 是 Roo 的 fork,"codebases share a grandparent");自述为 Roo/Cline 的"superset"。CLI 侧另 fork 自 **OpenCode**。
- **对比 Roo Code**:**Roo 已于 2026 关停/归档**(见下),团队全押云端 agent "Roomote";Kilo 反其道**继续深耕 IDE agent**,并成为 Roo 官方点名的迁移去处、提供迁移指南。
  - 溯源:Roo CEO **Matt Rubens 于 2026-04-21 宣布关停**,repo **2026-05-15 归档**,称 Roo 达 **300 万安装**后决定"all-in on Roomote"。
- **对比 Cline**:Kilo 多了 **JetBrains、Cloud Agents、Agent Manager、更大模型目录、Roo 迁移路径**;Cline 装机历史更久。
- **取舍要点**:(a)**多表面统一**——同一开源 agent 覆盖 IDE/CLI/Cloud;(b)**模型自由 + 零加价**(500+ 模型、任务中途换);(c)**MIT 全开源可商用**;(d)**开放定价**的开核商业模式。代价/风险:2026-04 大重构导致**部分能力(代码索引、自定义 profile、Orchestrator)被下线或重命名**,文档与生态处于迁移期;沙箱隔离偏弱。

---

## 7. 采用度信号

- **GitHub**:`Kilo-Org/kilocode` **25,534 stars / 2,849 forks / 787 open issues / 107 watchers**(GitHub API,**2026-07-04** 时点,`archived: false`)。技术栈 TypeScript 83.1% / Kotlin 12.8%。
  - ⚠️ 2025 年素材里的 "13K stars"(Tessl)、"10K+"、"23.3K" 都是更早时点,已被上面 25.5K 取代。
- **安装/用户量(厂商自述,⚠️ 未独立核实)**:早期 "1.5M+ users / 25T tokens";较新(2026-05-29 前后)口径 **"3M+ Kilo Coders / 40T+ tokens processed"**;官方博客有 "3 Million Downloads" 复盘文。
- **OpenRouter 排名**:厂商与多篇二手评测称 **Kilo 为 OpenRouter #1 app**;第三方 CodeSOTA 追踪显示 30 天内经 OpenRouter 约 **5.84T tokens、约 $4.77M 推理花费**(⚠️ 第三方估算)。
- **产品动量**:2026-04 GA 重构、上线 Cloud Agents / Code Reviews / KiloClaw;公司自称用 Kilo 造 Kilo(含无前端工程师、靠 marketer 用 Kilo 维护官网)。

---

## 8. 来源

1. Kilo Code GitHub 主仓(README、许可、平台、OpenCode fork、star/fork 经 API 核实):https://github.com/Kilo-Org/kilocode
2. Tessl 工程深度报道(创始人、$8M 种子轮、Open Core Ventures、起源、模式、记忆、商业模式):https://tessl.io/blog/inside-kilo-code-an-open-source-ai-coding-agent-with-plans-to-reshape-software-development/
3. Kilo 官方文档 — Custom Modes / Agents(mode 字段、工具权限、subagent 委派):https://kilo.ai/docs/customize/custom-modes
4. Kilo 官方文档 — Orchestrator Mode(弃用说明 + `task` 委派、子代理隔离与摘要回传):https://kilo.ai/docs/basic-usage/orchestrator-mode
5. Kilo 官方 "What's New"(2026-04 rebuild:开源内核、subagents、Agent Manager、Snapshots、Orchestrator 弃用、索引下线):https://kilo.ai/docs/code-with-ai/platforms/vscode/whats-new
6. "Context Engineering: How Kilo Code Manages Context"(Condensing 65.3K→9.4K、@提及、AGENTS.md、Skills、Qdrant 索引):https://medium.com/@jasonyang.algo/context-engineering-explained-how-kilo-code-manages-context-a3126d97d44f
7. Kilo 官方博客 "Thank you, Roo!"(Roo 关停、Kilo=Roo fork、迁移):https://blog.kilo.ai/p/thank-you-roo
8. The New Stack — Roo Code 关停/转云端(2026-04-21 宣布、300 万安装、5-15 归档 对照):https://thenewstack.io/roo-code-cloud-ides-ai-coding/
