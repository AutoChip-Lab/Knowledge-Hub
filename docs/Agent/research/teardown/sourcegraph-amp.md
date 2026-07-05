# Sourcegraph Amp —— 事实底稿（快照:2026 年年中)

> 教学站拆解简报。只写可溯源断言;不确定处显式标注。

## 0. 一句话定位 / 出品方 / 许可 / 2026 状态

- **一句话定位**:Amp 是一款**面向前沿模型的 agentic 编码 agent**——不是补全插件,而是能自己读代码库、跑命令/测试、跨文件改代码、多步迭代并自我纠错的编码 agent,提供 CLI + 多编辑器扩展 + 网页/移动端线程界面。
- **出品方 / 归属(2026 关键事实)**:
  - Amp 由 **Sourcegraph**(2013 年成立、以全局代码搜索著称,累计融资 >2 亿美元、估值曾达 26 亿美元)于 **2025 年 5 月**推出。
  - **2025 年 12 月 2 日,Amp 从 Sourcegraph 拆分(spin out)为独立公司**,官方名 **Amp Frontier Corporation / "Amp Inc."**,自称"独立研究实验室"。约 20 位联合创始人,含 **Quinn Slack(CEO,Sourcegraph 联合创始人)、Beyang Liu、Thorsten Ball(lead engineer,自称 "Dictator")** 等原班团队。官方原话:"Amp's traction spun us out of Sourcegraph. Amp is profitable."(声称已盈利——**未见公开财报佐证**)。
  - **与 Cody 的关系(易混淆点,务必讲清)**:Cody 是 Sourcegraph 的**上一代**编码助手。2025 年 6 月 25 日起停止新开 Cody Free/Pro;7 月 23 日终止所有 Free/Pro 账号;Enterprise Starter 不再含 Cody。Sourcegraph **官方把个人开发者引导到 Amp**,并给老用户 40 美元 Amp credits。**Cody Enterprise 仍在售**($59/user/月,年约)。所以 Amp 常被描述为"Cody 的 agentic 继任者",但二者是**不同产品**,且 Amp 现已归属独立公司。
- **许可**:**核心 agent 闭源、商业产品**。GitHub 上 `ampcode` org 里是**周边生态**(Neovim 插件 `amp.nvim` Apache-2.0、`amp-contrib` 技能/工具集、`amp-examples-and-guides`、`zvelte-check` MIT 等),**agent 本体不在开源仓库中**。
- **2026 状态**:**活跃、快速迭代**(周更节奏)。已改名/拆分为独立公司(见上)。商业模式在演进:2026 年出现 **ad-supported 的 "Amp Free"** 层(每日约 $10 API 额度、广告支撑、需开启 Training Mode;2026 年 5 月起对部分用户收紧),付费 "Smart" 层为**按量透传 API 成本、个人零加价**、企业约 50% 加价。

## 1. 解决什么问题 / 在 agent 技术栈里的位置

- **解决的问题**:让 LLM 在**真实、庞大、每次 commit 都在变的代码库**里自主完成多步编码任务(跨文件重构、写测试、修 bug、迁移),而不是只做单文件补全或问答。
- **技术栈位置**:**一个完整的编码 agent 产品 + harness**(agent loop、工具层、多 agent 编排、上下文/线程管理、沙箱策略、CLI/编辑器/云执行都自带),**不是**给别人搭 agent 的编排框架(不像 LangGraph/AutoGen),也**不是**纯基础设施。类比对象是 Claude Code、Cursor Agent、OpenAI Codex CLI、Goose、opencode。
- **与底层 LLM 的关系**:**模型无关、多模型编排(model-agnostic + multi-model)**,不自研前沿模型(它是"研究实验室"但走产品路线,官方口号 "ship products rather than publish papers")。它把**不同模型分派到不同角色**(见 §5),并随模型更新滚动切换——官方口号 "Amp moves where the models take it"。**在不同角色上"用别人最强的模型"**是其核心设计哲学之一。

## 2. 架构与核心组件(点名真实构件)

来源交叉印证(官方 manual + 泄露/整理的 system prompt 仓库 x1xhlol)。**注意:模型名随时间快速变化,下方按快照时点标注**。

- **Main Agent(主 agent)**:唯一直接与用户对话的角色,跑主 agent loop。历史上默认 **Claude Sonnet 4.x**;system prompt 有 `claude-4-sonnet.yaml` 与 `gpt-5.yaml` 双配置。2026 manual 文案已提到 **GPT-5.5 / Opus 4.8** 等更新模型,并分 **Deep / Smart / Rush** 三种 agent 模式(Deep=GPT-5.5+延展思考;Smart=不设限的 SOTA 模型;Rush=快速、低 token、无 reasoning)。**具体默认模型随时间变动,以官方为准**。
- **Oracle(神谕 / "第二意见"模型)**:一个 `oracle` **工具**,把一个**更强推理模型**当"资深工程师"来做规划、架构评审、复盘、难 bug 调试。**该角色所用模型随时间明显变化**:早期 **o3** → 后 **GPT-5** → 某快照为 **"Claude Fable 5" high reasoning**(**该模型名疑为内部/代号,未在别处独立核实,存疑标注**)。Oracle 为**只读**受限工具集。
- **Subagents(子 agent,经 `Task` 工具)**:主 agent 可 fire-and-forget 派生子 agent 做重活/多文件实现,**各自独立 context window、彼此不通信、中途不可干预、不继承主线对话**,只回**最终摘要**——刻意隔离以**防止上下文污染**。子 agent 工具集受限(Read/edit_file/create_file/Bash/Grep/glob/format_file/get_diagnostics/web_search/read_web_page/codebase_search_agent)。
- **codebase_search_agent(概念检索子 agent)**:跨语言/跨层做"概念性"代码发现,以"像跟另一个工程师说话"的自然语言查询驱动,可并行多实例。
- **Librarian(图书管理员子 agent)**:搜**远程代码库**——公开 GitHub 全量代码 + 你的私有 GitHub 仓库(需配 GitHub 连接);做外部库/API 变更调研。2026 迭代称 **~3x 更快、便宜 43%**。常需**显式提示主 agent 去用它**。
- **工具层(built-in tools,约 18 个,可 `amp tools list` 列出)**:编排类 `oracle` / `Task` / `codebase_search_agent`;文件 `Read` / `edit_file` / `create_file` / `format_file` / `list_directory` / `undo_edit`;搜索 `Grep` / `glob`;执行 `Bash` / `get_diagnostics`;Web `read_web_page` / `web_search`;规划 `todo_read` / `todo_write`;可视化 `mermaid`;MCP `read_mcp_resource`。
- **指导文件 `AGENTS.md`(旧称 AGENT.md)**:多作用域自动加载(当前目录 / 父目录 / 子树 / 系统级 `/etc/ampcode/AGENTS.md`),支持 `@`-mention 引用其它文档、可带 `globs` 条件包含——用来编码项目/语言/组织约定。
- **Skills / Plugins / MCP**:插件系统可 hook 事件、注册工具(`amp.registerTool()`)、创建自定义 agent、强制审批/权限策略;支持 MCP server 扩展工具;支持 `SKILL.md` 技能。
- **Threads(线程)**:对话持久化到 ampcode.com,可 `@T-<id>`/URL 跨线程引用、搜索、归档;可私有/工作区共享/公开。
- **执行/沙箱**:CLI 本地执行;云端 **"Orbs"** 远程 agent 执行(可配 CPU/内存),passkey 认证 web/移动端控制。
- **代码检索哲学(重要教学点)**:**不用 embeddings/向量库/RAG**,而是**让 LLM 在循环里跑 grep/glob/read/find**。官方立场:代码库每次 commit 都在变,冻结的 embedding 不如 agent 实时驱动 ripgrep。这也是 Thorsten Ball 名文《How to build an agent, or the emperor has no clothes》的核心论点。

## 3. 一步步怎么运转(控制/编排回路)—— 本节最重要

以官方 manual 的会话生命周期事件 + system prompt 行为约束为准,给出可讲课的控制流:

1. **会话启动**:用户在 CLI / 编辑器 / 网页提交 prompt → 触发 `session.start`。自动加载 **`AGENTS.md`**(各作用域)、system prompt(按所选模型加载对应 `*.yaml` 配置,如 `claude-4-sonnet.yaml` / `gpt-5.yaml`)、可用工具清单与 MCP。
2. **进入 agent turn**:触发 `agent.start`。主 agent 读取上下文,决定下一步:是自己调工具,还是先问 Oracle 规划,还是派 Task 子 agent。**默认不逐工具征求批准**("Amp does not ask for approval before running tools"),除非插件拦截 `tool.call` 强制审批。
3. **工具调用循环(核心 loop)**:主 agent 发起 `tool.call`(如 `Grep`/`Read`/`Bash`/`edit_file`)→ 工具执行 → 返回 `tool.result` → 模型消化结果 → 决定继续调工具或结束本 turn。**独立操作(读、搜、诊断、写、子 agent)默认并行**;**写冲突与共享契约变更(类型/API/schema)强制串行**。system prompt 三条硬护栏:**先试最简修复、优先复用既有模式、影响 >3 文件的改动不"惊喜式"直接落地(需用户同意)**。
4. **需要重推理时 → Oracle**:主 agent 自主(或用户显式"use the oracle to…")召唤 `oracle` 工具,把当前计划/diff 交给更强推理模型做评审/规划/调试,**只读**探查后返回意见,**不污染主线上下文**。system prompt 鼓励"频繁使用 oracle:做计划时用、复盘自己的工作时用"。
5. **需要大范围检索时 → 检索子 agent**:主 agent 派 `codebase_search_agent`(本地概念检索,可并行)或 `Librarian`(远程/GitHub 检索)去消耗大量 token 做调研,**只把结论摘要回给主线**。
6. **需要多文件重活时 → Task 子 agent**:主 agent 把"junior 工程师式"的详细指令(交付物/约束/上下文一次性给全)派给一个或多个 **Task 子 agent**,各自**独立 context、隔离运行、并行**(典型例:改 36 个 YAML 文件时自发派 4 个子 agent 各处理约 9 个)。子 agent **不能互相通信、中途不可指导**,完成后**只回最终摘要**。
7. **规划/进度**:主 agent 用 `todo_write`/`todo_read` 维护任务清单;用 `get_diagnostics`(LSP)、编译错误、测试输出、CI 结果作为**反馈信号**驱动下一轮迭代("rich feedback loops over perfect prompts")。
8. **turn 结束**:触发 `agent.end`;用户可继续追问、审阅 diff("Diffs" 暂存/评审)、或发起新 turn。线程持久化到 ampcode.com,可被未来线程引用。

**一句话回路总结**:`加载 AGENTS.md+system prompt → 主 agent 在"调工具↔读 result"里迭代 → 遇难题外包给 Oracle(推理)/检索子 agent(找)/Task 子 agent(重活),全部隔离上下文并行,只回摘要 → CI/诊断/测试当反馈 → 收敛后交 diff`。

## 4. harness 层设计

- **上下文/记忆管理**:核心理念 **"curated context beats comprehensive context"(精选优于全塞)**。手段:①**子 agent 隔离 context window**,把探索/失败/调试的"噪音"关在子 agent 里,主线只收摘要;②**Oracle 只读探查、结论回主线**,不把探索过程灌进主上下文;③**"一线程一任务"**;④线程持久化 + 跨线程 `@T-<id>` 引用做长期记忆。**明确不用 embeddings/RAG**,靠 grep/read 实时取证。**具体的自动 compaction 机制官方 manual 未详细披露(未找到公开细节)**。
- **工具接口**:统一的 `tool.call`/`tool.result` 事件模型;built-in 约 18 个工具;可经 **MCP server** 与 **plugin `amp.registerTool()`** 扩展;支持 **SKILL.md** 技能与 slash 命令。
- **规划**:三条路径——`todo` 工具做任务清单;`oracle` 做重推理/架构规划;system prompt 强约束"先简后繁、优先复用、大改需同意"。
- **多 agent 交接(handoff)**:主 agent 是唯一对用户面;向下**单向派发** Task/检索/Oracle 子 agent,**子 agent 之间不通信、无共享总线**,交接只发生在"派发指令下去 / 摘要收上来"。2026 还上线了 "Handoff" 特性(在会话间转交)。
- **人在环(human-in-the-loop)**:**默认放手不逐步征询**(区别于很多"每步确认"的工具),但可通过 plugin 拦截 `tool.call` 上审批 UI;`amp.mcpPermissions` 按 URL/命令模式黑白名单管控 MCP;>3 文件的"惊喜"改动要用户同意;diff 评审/暂存作为落地前关卡。
- **沙箱/执行**:本地 CLI 直接跑命令(默认不沙箱,靠权限策略 + AGENTS.md + 插件约束);云端 **Orbs** 提供可配 CPU/内存的远程 agent 执行环境;官方明确警示"不可信仓库/MCP server/外部输入可能影响 Amp 行为"(prompt injection 风险自担)。

## 5. 模型-角色分派(独有取舍的关键)

- **主 agent**:选"主动性强、肯迈过最后一关"的模型(历史上 Claude Sonnet 4.x;2026 文案含 GPT-5.5 / Opus 4.8;分 Deep/Smart/Rush 模式)。
- **Oracle**:选"擅长规划/调试的强推理但更慢更贵"的模型(o3 → GPT-5 → 某快照 "Claude Fable 5",**模型名随时间变、部分代号存疑**)。
- **快速工具模型**:处理搜索/摘要等轻活。
- 官方模型评测框架就是三问:能否当主 agent?能否当专精子 agent?能否当快速工具模型?——**"在每个角色上用当下最合适的模型"**,这是 Amp 区别于"单模型绑定"工具的核心。

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **多模型分角色编排 + 显式 Oracle "第二意见"**:不是单模型跑到底,而是主 agent(执行力)+ Oracle(推理力)+ 检索子 agent(找)分工——比"一个模型什么都干"更能压制难 bug/架构错误。
- **激进的上下文隔离(子 agent 各自 context)**:大规模跨文件任务自发并行,主线上下文保持干净——对**大代码库**尤其对味(承袭 Sourcegraph 代码搜索基因)。
- **Librarian:跨仓/公开 GitHub 检索**是较独特的能力,便于查外部库真实用法/API 变更。
- **默认放手 + 按量透传定价**:不逐步确认、个人层零加价按 token 走(早期 prototype 每月 $1k–5k 的用量被官方视为"feature 不是 bug")。取舍代价:**成本可能高、放手带来的失控/prompt-injection 风险需自管**。
- **不用 embeddings/RAG**:实现简单、对频繁变动代码库更鲁棒;代价是超大库全局检索靠 grep 迭代可能更慢/更耗 token。
- **多入口**:CLI + VS Code/JetBrains/Neovim/Zed + 网页/移动端 + 云 Orbs 远程执行。
- **可迁移性**:官方专门写了 "Switch to Amp from Claude Code" 指南,`AGENTS.md` 与 MCP 是行业通用格式,迁移成本低。

## 7. 采用度信号

- **GitHub star(时点:2026 年年中)**:**agent 本体闭源、无主仓 star 数**。生态仓库量级偏小:`amp.nvim` ~192★、`amp-contrib` ~71★、`amp-examples-and-guides` ~50★(**据 GitHub org 页面抓取,数值随时点变动**)。用 GitHub star 衡量 Amp 采用度**不适用**。
- **商业/势头信号**:官方称 **Amp 已盈利**且"traction 促成拆分独立"(2025-12 拆分为 Amp Frontier Corporation)——**盈利与营收数字未见公开财报佐证,存疑标注**。Sourcegraph 代码搜索侧服务 >25 万代码仓、含 Dropbox/Stripe/Canva 等(**这是 Sourcegraph 而非 Amp 的客户数据,不可直接等同 Amp 采用量**)。
- **社区/口碑**:有大量第三方深度使用记录(如"4 个月 6000 个线程"用户帖)、awesome-amp-code 清单、Changelog 播客(#648 Thorsten Ball)等,显示活跃开发者社群。
- **具体 Amp 独立用户数 / ARR / 企业客户名单**:**未找到可靠公开数据**。

## 8. 来源(4–8 条)

1. Amp 官方 Owner's Manual — https://ampcode.com/manual （工具、会话生命周期、模式、Librarian、Oracle、AGENTS.md）
2. Amp 官方拆分公告 "Amp Frontier Corporation" — https://ampcode.com/news/amp-inc （2025-12-02 独立、创始人名单、"profitable"）
3. Amp 官方 "Model Evaluation" — https://ampcode.com/news/model-evaluation （主 agent/oracle 三角色模型评测、Sonnet 4/GPT-5/o3）
4. Amp 官方 "The Librarian" — https://ampcode.com/news/librarian （远程/GitHub 检索子 agent）
5. Sourcegraph 官方 "Changes to Cody Free, Pro, and Enterprise Starter plans" — https://sourcegraph.com/blog/changes-to-cody-free-pro-and-enterprise-starter-plans （Cody 停用时间线、引导至 Amp）
6. x1xhlol/system-prompts-and-models-of-ai-tools · Amp（DeepWiki 整理)— https://deepwiki.com/x1xhlol/system-prompts-and-models-of-ai-tools/5.3-amp-by-sourcegraph （18 工具清单、Task/Oracle/双 yaml、并行/串行约束)
7. nibzard, "What Sourcegraph learned building AI coding agents" — https://www.nibzard.com/ampcode/ （无 RAG、子 agent 自发涌现、Oracle 模式、定价即 feature）
8. ainativedev/tessl 报道 Amp 拆分 + Thorsten Ball《How to build an agent》/ Changelog #648 — https://changelog.com/podcast/648 （grep-in-a-loop、agent 设计哲学一手访谈)

---
**显式存疑/未核实清单**:
- Oracle 快照模型名 "Claude Fable 5"、主 agent "Opus 4.8/GPT-5.5" 等具体模型名**随时间快速变动、部分疑为代号,未在独立第二来源交叉核实**。
- Amp "已盈利" 及任何营收/ARR/独立用户数**无公开财报佐证,未核实**。
- 自动 context compaction 的具体机制**官方 manual 未详细披露,未找到公开细节**。
- ampcode org 的 star 数为抓取快照,**会随时点变化**。
