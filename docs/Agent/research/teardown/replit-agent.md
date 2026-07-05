# Replit Agent 事实底稿（快照:2026 年年中）

> 研究对象:Replit Agent —— Replit 的自然语言 → 全栈应用 agent,云端构建 + 一键部署(Agent v2 / Agent 3)。
> 快照口径:2026-07。所有断言尽量溯源;标注 **[估算]** / **[未核实]** / **[未找到公开数据]** 的地方即为不确定。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**:一个「action-oriented」的自主编码 agent —— 用户用自然语言描述想法,Agent 自己**规划 → 写代码 → 配置基础设施(数据库/密钥/部署)→ 自测 → 交付**一个可运行、可发布的全栈应用。官方明确把它区别于「聊天机器人式的代码助手」。
- **出品方**:Replit(公司,创始人兼 CEO Amjad Masad)。
- **许可**:**闭源专有 SaaS**。Agent 本身不是开源项目,没有公开的 GitHub 仓库/README(**star 数不适用**,见第 7 节)。它构建在 Replit 自研云基础设施之上。
- **2026 状态:高度活跃、快速增长**。
  - 版本线:Agent v1(2024)→ **Agent v2**(2025-02-25 早期访问,配合 Anthropic Claude 3.7 Sonnet 发布)→ **Agent 3**(2025-09-10 正式发布,当前主力)。
  - 公司:2025-09 估值 $3B(年化收入约 $150M);**2026-03 完成 $400M Series D(Georgian 领投),估值 $9B**(六个月内翻 3 倍)。Sacra 估计 2026-04 年化收入约 **$525M**,公司对外目标年底 $1B ARR。**[未核实:$1B ARR 为公司目标,非已实现]**
  - 未改名、未被收购、未停更。

---

## 2. 解决什么问题 / 技术栈定位 / 与 LLM 的关系

- **解决的问题**:让非专业/半专业用户(以及想加速的开发者)从一句话拿到**已部署、已联好数据库、经过自动测试**的应用,消除「从想法到线上」之间的环境、基建、部署摩擦(即所谓 vibe coding)。Agent 3 还专门解决了「**Potemkin 界面**」问题 —— 之前生成的功能看着能用(按钮渲染了、仪表盘显示了),但缺事件处理、数据是 mock、链接是死的。
- **技术栈定位**:它是一个 **agent + harness + 平台/基础设施三合一的垂直整合产品**,而不是一个可复用的编排框架:
  - Agent 层:多 agent 编排(manager/editor/verifier)。
  - Harness 层:自研工具 DSL、上下文压缩、检查点、子 agent 隔离。
  - 平台/基建层:Repl 容器沙箱、Nix 环境、快照引擎(bottomless storage)、托管 Postgres、密钥库、一键 Deployments。
  - 这三层深度绑定 Replit 自家云,**不能拆出来单独用**(区别于 LangGraph、Claude Code 这类可移植 harness)。
- **与底层 LLM 的关系**:Agent 是模型之上的编排层,**不训练自己的前沿模型**,而是调用第三方前沿模型:
  - LangChain 案例明确:早期最大性能跃升来自升级到 **Claude 3.5 Sonnet**;微调实验没有带来突破,所以「换更强的基座模型」成为关键杠杆。
  - Agent v2 配合 **Claude 3.7 Sonnet** 发布。
  - **[未核实]** 有二手报道称 2026 年 Agent 运行在 Claude Opus 4.7 + Gemini 3.1 Pro 的「model-choice」组合上,以及早期用 GPT-4 做 code review、Gemini 做低成本操作 —— 这些**只见于聚合类二手来源,官方一手材料未确认**,讲课时应标注为传闻。官方一手可确认的最新点:Replit 报告其内部代码编辑基准上 **Claude Sonnet 4.6 达到 0% 错误率**。**[未核实:0% 数字来自二手转述]**
  - 官方文档提供 **Lite / Economy / Power(+Turbo)** 的 effort 档位,high effort 会把复杂任务路由到「frontier models」—— 即它是**多模型、按难度路由**的。

---

## 3. 架构与核心组件(点名真实构件)

来源以 **LangChain「Breakout Agents」案例**(Replit 工程团队一手讲述)和 Replit 官方工程博客为准。

- **多 agent 编排(从单 agent ReAct 演进而来)**:
  - **Manager agent**:统筹整个工作流。
  - **Editor agent(s)**:执行具体编码任务(把任务切到「尽可能小」以降低单 agent 出错率)。
  - **Verifier agent**:校验代码,但**独特点在于它经常主动回退去和用户对话**,而不是自动往下推进 —— 用来强制「人在环」。
- **工具层(关键设计取舍)**:**不用传统 function calling**。团队选择让模型**生成代码来调用工具**,并写了一套**受限的 Python DSL** 来承接这些调用,提升工具执行准确率(工具库 30+ 个,工具调用成功率约 **90%**)。
- **测试/验证执行器(Agent 3 新增)**:一个**基于 REPL 的验证子系统** —— 在沙箱里执行注入了 **Playwright** 辅助函数的 JavaScript/Node 代码,用「code use」而非「computer use」来驱动浏览器自测(详见第 4、5 节)。
- **记忆/上下文管理**:压缩 trajectory 以适配上下文窗口;主 agent 上下文约 **80,000–100,000 token**,把测试等放到**子 agent**里隔离,避免污染主上下文。
- **沙箱 / 执行环境**:每个用户/项目一个 **Repl = Docker 容器**(非 root 的 `runner` 用户),用 **Nix**(`replit.nix` + `.replit`)管理系统包与运行时;数据由 **bottomless storage**(NBD 虚拟块设备,后端 GCS,16 MiB 不可变分块 + manifest)承载。
- **快照引擎(Snapshot Engine)**:检查点/回滚/数据库 fork 的底座 —— Copy-on-Write「remix」磁盘,常数时间复制;代码侧对应一个 git commit 并写入 checkpoint 元数据(每个 app 有不可变 append-only 的 git remote)。
- **消息总线/角色**:对外表现为**聊天式 agent loop**(每个 prompt 翻译成对上述 primitives 的一串 action);agent 可产出多种「角色/产物」(Web/移动 app、slides、design、data viz)共享同一后端。
- **可观测性**:内部用 **LangGraph**(agent 框架)+ **LangSmith**(trace 观测,用来定位用户卡住的瓶颈)。

---

## 4. 一步步怎么运转(控制/编排回路)—— 最重要一节

以 Agent 3 为主,融合 v2 行为。用户一条请求实际流经的回路:

1. **入口 & 意图**:用户在聊天框描述想法(或选「Agents & Automations」)。系统为该项目起一个隔离环境:一个 Docker 容器 Repl(Nix 环境)+ 一个 dev 用 Postgres 实例 + 存储层。

2. **(可选)Plan Mode / Design Canvas**:
   - **Plan mode**:Agent 先产出一个**有序任务分解 + 架构取舍**的计划,用户**在写任何代码前审阅并显式批准**,防止跑偏。
   - **Design Canvas**:先在可视化画布上探索 mockup;v2 起有**行业首创的实时设计预览**,边建边渲染真实界面。

3. **Manager 分解 & 派活**:Manager agent 把批准后的目标拆成尽可能小的子任务,分派给 Editor agent(s)。

4. **Editor 的「假设 → 检索 → 编辑」回路(v2 起的核心行为)**:每一步 Editor **先形成假设 → 检索定位相关文件 → 收集到足够信息后才动手改**。目标是**少走「盲目试错 + 卡在同一个 bug 上死循环」**的老路;卡住时会「退一步重想」。工具调用通过第 3 节的 **Python DSL 生成代码**执行,而非 function call。

5. **配置基础设施**:按需 provision 开发数据库、写密钥/secrets、装 Nix 包 —— 全部在沙箱内、只对 **dev 数据库**有权限(生产库隔离)。

6. **检查点(Checkpoint)**:每完成一个主要阶段,系统**自动 commit**:
   - 代码侧:一个 git commit 写入 checkpoint 元数据;
   - 数据/文件系统侧:快照引擎做一次 Copy-on-Write 快照。
   - → 用户可**回滚到任意历史检查点**(新手用按钮、进阶用 Git),这也是**计费单位**(见第 7 节)。

7. **自测循环(Agent 3 的招牌,App Testing 开启时)**:Agent **周期性决定测试应用** —— 在 Agent 面板里开一个**浏览器预览**,你能看到 Agent 的**光标在应用里点击**:
   - 用**注入 Playwright 的 JS 在 REPL/沙箱里执行**来点按钮、填表单、查 API、验数据源;能用 **Replit Auth 自动登录**测登录流。
   - 它读的不是像素,而是**增强版 DOM(带 ARIA label、test 属性)+ 数据库查询工具 + 前后端日志**,来判断真伪功能。
   - 「navigate 36 months forward」这类可以写成**一个循环**,而不是 36 次独立工具调用 → token/成本效率高。
   - 测试**跑在独立子 agent** 里,不污染主上下文。
   - 测完 Agent 回一份**测试摘要**,并**自动修复**发现的问题 → 回到第 4 步重跑,直到通过或达标。
   - 官方数字:自测把「无人干预可持续工作」的时长从 **20 分钟 → 200+ 分钟**(Max Autonomy 可更久);单次测试**中位成本约 $0.20**;整体自称比通用「Computer Use」**快约 3x、便宜约 10x**,自主成功率约 **90%**(**[估算/官方口径]**,基准细节未公开)。

8. **人在环回退点**:Verifier agent 在关键处**主动回来找用户确认**(而非硬推),用户可随时中断、改需求、或回滚检查点。

9. **交付 & 部署**:验证通过后,Agent 报告完成;用户可一键把多产物(Web/移动/slides 等,共享后端)一起 **Publish/Deploy** 到 Replit Deployments。

10. **Agent 3 特有:生成「别的 agent/自动化」**:用户用自然语言描述一个工作流,Agent 3 会**生成一个专用 agent**(如 Telegram bot、Slack agent、定时自动化),自动接第三方连接器(Notion / Linear / Dropbox / SharePoint / GitHub / Google Drive / Outlook Calendar 等),并配一个测试用 admin dashboard、安全托管凭据。

---

## 5. Harness 层设计

- **上下文/记忆管理**:trajectory 压缩以适配窗口;主 agent 上下文 ~80k–100k token;**子 agent 隔离**(测试/校验放子 agent,防污染);prompt 用 **XML tag 分区** + **few-shot** 长任务指令。
- **工具接口**:**code-as-tool-call** —— 模型生成代码,经**受限 Python DSL** 执行(不是 OpenAI 式 function calling);工具库 30+,成功率 ~90%。浏览器自测则用**注入 Playwright 的 JS**(变量/会话跨多次执行持久化,支持迭代式测试)。
- **规划**:显式 **Plan Mode**(有序分解 + 取舍,需用户批准);Manager/Editor 分层;effort 档位(Lite/Economy/Power+Turbo)按难度路由到不同强度的模型。
- **多 agent 交接**:Manager → Editor(尽可能小的任务)→ Verifier(校验 + 回退问用户);测试子 agent 独立跑。
- **人在环**:「不追求完全自主,要用户持续参与」是明确设计哲学;Verifier 主动回问;每个主要步骤自动 commit → 任意回滚;Plan mode 事前批准。
- **沙箱**:Docker 容器 Repl(非 root)+ Nix 环境;**bottomless storage**(NBD/GCS/16MiB 不可变分块)+ **快照引擎**(CoW 秒级 fork 代码与数据库);Agent **只对 dev 数据库**有权,生产库隔离;git 历史存独立卷、append-only。路线图提到用 **Parallel Sampling** 并行跑多条 agent 轨迹再择优。

---

## 6. 与同类相比的独特设计取舍

- **平台垂直整合 vs 可移植 harness**:与 Claude Code / Cursor / LangGraph 不同,Replit Agent **不是一个能装到你机器上的工具或框架**,而是把 agent 和「容器 + 数据库 + 密钥 + 部署 + 快照回滚」全都做进自家云。取舍:**开箱即得可部署的全栈 app 与安全沙箱**,代价是**锁定在 Replit 平台、闭源**。
- **code-as-tool-call(生成代码调工具)而非 function calling**:牺牲通用 API 便利,换**更高的工具执行准确率**;自测同理用「code use + Playwright」而非「Computer Use」,换**成本/速度/token 效率**(自称 3x/10x)。
- **多 agent + 「尽可能小的任务」**:降低单 agent 出错率;Verifier **刻意不全自动**,强制人在环 —— 明确「不追求 full autonomy」。这与「越自主越好」的流派是相反取舍。
- **快照引擎带来的安全实验**:CoW fork 让 agent 能在**隔离副本**里试危险操作、随时回滚 —— 这是很多纯本地/纯 IDE agent 不具备的基建级安全网。
- **为什么有人选它**:想从一句话直接拿到**上线的应用**、不想碰环境/部署/DB 的非专业用户与快速原型团队;以及需要「生成自动化/bot」的场景。

---

## 7. 采用度信号

- **GitHub star:不适用** —— Agent 是闭源专有产品,**未找到公开的官方源码仓库或 star 数**。
- **平台规模**:Replit 用户 2025-09 达 **40M+**,2026-03 达 **50M+**;称 **Fortune 500 中 85%** 有用户在平台上。**[部分为公司自述]**
- **收入/增长**:年化收入从约 $2.8M 冲到 $150M(不到一年,截至 2025-09);2026-04 约 $525M(Sacra 估算)。
- **估值**:$1.16B(2023)→ $3B(2025-09)→ **$9B(2026-03,$400M Series D,Georgian 领投)**。
- **生产规模信号**:LangChain 案例称 Agent 已有「数十万次生产运行」;Mastra 报道称 Agent 3 每天为用户生成大量 Mastra agent(**[数量级为二手描述,未核实具体数字]**)。
- **知名度**:被 TechCrunch、InfoQ、Forbes 等广泛报道;是 2025-2026「vibe coding」浪潮的代表产品之一。

---

## 8. 来源(一手优先)

1. Replit 官方博客 —— Introducing Agent 3: https://replit.com/blog/introducing-agent-3-our-most-autonomous-agent-yet
2. Replit 官方博客 —— Enabling Agent 3 to Self-Test at Scale with REPL-Based Verification: https://replit.com/blog/automated-self-testing
3. Replit 官方博客 —— Inside Replit's Snapshot Engine (让 AI agent 安全的基建): https://replit.com/blog/inside-replits-snapshot-engine
4. Replit 官方博客 —— Introducing Replit Agent v2 in Early Access: https://replit.com/blog/agent-v2
5. Replit 官方博客 —— Introducing Effort-Based Pricing for Replit Agent: https://blog.replit.com/effort-based-pricing
6. Replit 官方文档 —— Agent: https://docs.replit.com/replitai/agent
7. LangChain「Breakout Agents」案例 —— Replit 工程团队讲多 agent / DSL 工具调用 / 模型选择: https://www.langchain.com/breakoutagents/replit
8. TechCrunch —— Replit snags $9B valuation six months after hitting $3B(2026-03): https://techcrunch.com/2026/03/11/replit-snags-9b-valuation-6-months-after-hitting-3b/

补充二手(仅供交叉,可靠性次之):InfoQ《Replit Introduces Agent 3》(https://www.infoq.com/news/2025/09/replit-agent-3/,抓取时返回 405,内容仅来自其检索摘要);Sacra Replit 页面(收入估算);ZenML LLMOps DB(转述 LangChain 案例)。

---

### 讲课时需要显式声明的不确定点
- **具体模型名(2026)**:Agent 3 当前跑什么前沿模型的确切组合(Opus 4.7 / Gemini 3.1 Pro / GPT-5.x 等)**只见二手来源,官方一手未确认** → 讲课按「多模型、按 effort 路由、基座随前沿模型迭代升级」表述最稳。
- **各项自测/性能数字**(90% 自主成功率、3x 快、10x 便宜、$0.20 中位成本、20→200 分钟)均为 **Replit 官方口径**,独立基准未公开,应标注为厂商自报。
- **$1B ARR** 是公司目标,非已实现;**50M 用户 / Fortune 500 85%** 含公司自述成分。
- **未找到公开数据**:Agent 源码/GitHub star;精确的内部模型路由表;Agent 每天生成 agent 的确切数量。
