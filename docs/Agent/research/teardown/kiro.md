# Kiro 事实底稿(快照:2026 年年中)

> 研究对象:**Kiro** —— AWS 出品的「规范驱动(spec-driven)」智能体 IDE。
> 本文只写可溯源断言;估算/推断处显式标注;找不到即写「未找到公开数据」。

---

## 1. 一句话定位 / 出品方 / 许可 / 2026 状态

- **定位**:Kiro 是一个「规范驱动的智能体 IDE / CLI / Web」——它先把一句自然语言 prompt 转成三份结构化文档(需求 requirements.md、设计 design.md、任务 tasks.md),经开发者逐阶段审核批准后,再由 agent 按任务清单生成、验证、同步代码。它把「工作单元」从「聊天 prompt」重新定义为「规范(spec)」。
- **出品方**:Amazon Web Services(AWS)内部团队构建并运营。产品负责人 Nikhil Swaminathan;VP DevEx & Agents 为 Deepak Singh(据 introducing 博客)。
- **技术底座许可**:客户端基于 **Code OSS**(VS Code 的开源核心),可导入 VS Code 设置/主题、安装 Open VSX 兼容插件。**Kiro 应用本体源码并未开源**——GitHub 上的 `kirodotdev/Kiro` 仓库只承载 issues、文档、脚本、下载,不含 IDE 应用源码(该仓库归 Amazon 所有,受 Amazon Open Source Code of Conduct 约束;具体 license 名称未在仓库首页明确列出——**未找到公开的应用本体开源许可**)。
- **2026 状态:活跃,并且已从「预览」走向「一般可用」,同时是 AWS 编码工具线的战略主线**:
  - 2025-07-14 发布(预览);因需求爆量在 2025 年下半年一度加候补名单(waitlist)并加用量上限。截至 2025-10(发布满 90 天),超过 **10 万开发者** 加入候补名单,随后候补名单取消、开放注册。
  - 2026 年:引入 GovCloud(US)区域(据 2026-02-23 AWS Weekly Roundup),并推出 **Kiro autonomous agent**(自主后台 agent)预览。
  - **Kiro 取代了 Amazon Q Developer**:据报道,AWS 于 **2026-05-07 国际上线** Kiro,定位为 Q Developer 的「从头重写的替代品」而非功能升级;Amazon Q Developer CLI 已被改名为 Kiro;Q Developer IDE 插件/付费订阅的支持终止日期为 **2027-04-30**,新注册于 2026-05-15 停止(此段来自二手技术博客 developersdigest,**日期需谨慎对待**;AWS 官方也有《Upgrade to Kiro》《Migrating from Amazon Q Developer》迁移文档佐证方向)。
  - 谱系:CodeWhisperer(2024-04-30 并入)→ Amazon Q Developer →(2026)Kiro。

---

## 2. 解决什么问题 / 在 agent 栈中的位置 / 与底层 LLM 的关系

- **问题**:对抗「vibe coding」(纯聊天式即兴生成)带来的规模化失控——需求含糊、设计缺失、大改动难审计。Kiro 把需求澄清、架构设计前置为**显式、可审阅、可版本化的产物**,再驱动 agent 实现,强调「人在环」的分阶段批准。
- **栈中位置**:它同时是**编排框架 + agent harness + 产品化 IDE/CLI/Web 前端**——不是底层模型,也不是纯基础设施。它编排「规范→设计→任务→代码」的多阶段回路,管理上下文/工具/子 agent,并把这套 harness 包进一个 Code OSS 编辑器与终端里。
- **与底层 LLM 的关系**:Kiro **不训练自有基础模型**,而是路由到一批第三方前沿模型。默认模式为 **Auto**(Kiro 的模型路由器,混用多个前沿模型 + 专用小模型以求「质量/成本比」最优,按任务自动选型)。可手选的模型据官方 models 文档包含 Anthropic Claude 系列(Opus 4.5/4.6/4.7/4.8、Sonnet 4.0/4.5/4.6/Sonnet 5、Haiku 4.5)与若干开源权重模型(MiniMax M2.x、GLM-5、DeepSeek 3.2、Qwen3 Coder Next 等)。**注意版本漂移**:FAQ/models 页在不同快照给出的可选模型清单不完全一致(例如 models 页列到 Opus 4.8/Sonnet 5,FAQ 只列到 Opus 4.7),说明清单随时间快速更新,**具体在册模型以你使用当日为准**。
- **Bedrock 关系**:多份二手材料称 Kiro「构建于 Amazon Bedrock 之上」并在 Bedrock 上访问模型;**但 kiro.dev 官方 FAQ / models / introducing 三处均未直接确认「模型跑在 Bedrock 上」**。因此「运行于 Bedrock」应视为**强烈但非官方直证的推断**(AWS 生态一致性 + 二手报道)。

---

## 3. 架构与核心组件(点名真实构件)

据官方文档与博客,Kiro 的可命名构件包括:

- **三种交付形态**:Kiro IDE(Code OSS 桌面编辑器)、Kiro CLI(终端里的同一 agent)、Kiro Web / autonomous agent(异步后台 agent)。
- **Specs(规范引擎)**:核心编排产物,生成 `requirements.md` / `design.md` / `tasks.md` 三文件;需求用 **EARS(Easy Approach to Requirements Syntax)** 记法写验收标准。
- **规划器 / 任务图**:把 `tasks.md` 解析为**依赖图**,按「波次(wave)」并发执行——Wave 1 为无依赖任务并发跑,后续波次随依赖完成解锁(Run all Tasks)。
- **任务级 agent 会话(执行器)**:点单个任务时,Kiro **spawn 一个仅限该任务作用域的 agent 会话**,读取 spec + steering 文件,产出 diff 供人批准/编辑/拒绝(类似 PR review)。
- **Steering files(持久记忆/项目知识)**:markdown 文件,存架构决策、编码规范、命名约定、领域规则;三种加载模式:always-on(每会话)、auto(按请求匹配描述加载)、manual(slash 命令触发)。
- **Agent Hooks(事件驱动自动化)**:「本地版 GitHub Actions,但由 AI 驱动、用自然语言写」——文件 save/create/delete 或手动触发时在后台跑一段 prompt(如改 React 组件即更新测试、改 API 即刷新 README、commit 前跑凭据扫描)。
- **工具层 / MCP**:原生支持 **Model Context Protocol(MCP)** 挂接外部工具;并有 **Kiro Powers**——预打包的、面向 AWS 领域(CDK、CloudFormation、定价、HealthOmics 等)的 MCP server 集合。
- **Autonomous agent 的子 agent 编排 + 沙箱**:后台 agent 启动**隔离沙箱**(镜像你的开发环境,自动探测 DevFile/Dockerfile,可配置网络访问级别与 per-task 密钥/环境变量),并协调 research/planning、code-writing、verification 等**专用子 agent**,最后开 PR。
- **企业/生态集成**:据二手材料,深度接 AWS 生态(CodeCatalyst、IAM Identity Center 企业鉴权 等);**AWS 官方文档未逐一确认全部集成,视为方向性描述**。

---

## 4. 一步步怎么运转(控制/编排回路)—— 本节最重要

以 **IDE 内规范驱动主回路**为主线(这是 Kiro 的招牌路径):

1. **用户下达意图**:开发者在 spec 面板输入一句高层描述(如「给应用加一个用户 review 系统」)。
2. **Phase 1 — 需求生成 + 人审门**:agent 把 prompt 展开为 `requirements.md`——一组 user story + 用 **EARS 记法** 写的验收标准,覆盖边界情形。**开发者在此审阅/修改/批准**;不批准不进入下一阶段。
3. **Phase 2 — 技术设计 + 人审门**:agent 读取**已批准的需求 + 当前代码库**,产出 `design.md`——系统架构、数据模型、API 端点、组件结构、数据库 schema、序列图 / 数据流、错误处理策略(据官方含 TypeScript 接口等具体产物)。**开发者再次审阅/批准**。
4. **Phase 3 — 任务分解**:agent 生成 `tasks.md`——离散、可追踪、编号的实现任务,每个任务**回链到具体需求**,并把任务间**依赖显式映射**(还可含单测、集成测试、加载态、移动端响应、可访问性等条目)。
5. **执行调度**:
   - **逐任务模式**:点某个任务 → Kiro **spawn 一个作用域仅限该任务的 agent 会话** → 会话读取 spec + steering → 产出 diff → 开发者像审 PR 一样 approve/edit/reject。
   - **Run all Tasks 模式**:Kiro 把 `tasks.md` 编成依赖图,**按 wave 并发**跑独立任务、逐波推进,实时回报每个任务状态。
6. **横切增强(贯穿全程)**:
   - **Steering 注入**:每个 agent 会话都会加载相关 steering 文件,使生成物遵守项目既定规范(而非每次聊天重复交代)。
   - **Hooks 触发**:文件 save/create/delete 等事件异步触发后台 prompt(更新测试、刷新文档、跑扫描)——与主回路并行的**事件驱动侧回路**。
   - **工具调用**:agent 经 MCP / Kiro Powers 调用外部工具与 AWS 领域能力。
7. **(可选)Quick Plan / 简化路径**:对「已被充分理解」的功能,Quick Plan 会**一次性生成全部产物、跳过中间审批门**(用清晰度换速度)。
8. **(可选)自主后台回路(autonomous agent)**:在 GitHub/GitLab issue 上打 `kiro` 标签或评论里 `/kiro` → 后台 agent **异步** 起隔离沙箱、克隆并分析代码库、把工作拆成需求+验收标准、调度 research/code/verify 子 agent、跑测试验证、**开 PR** 并附实现说明;它**非会话制**,跨仓库/跨交互保持持久上下文,单实例据称可并行处理 **最多 10 个任务**,并从 code review 反馈中学习沉淀团队模式。

**要点(可据此讲课)**:Kiro 的编排回路的「灵魂」是**在需求→设计两处强制人审门 + 把设计冻结成可版本化文档 + 任务级隔离 agent 会话 + 依赖图波次并发**;记忆靠 steering 文件持久化,自动化靠 hooks 事件侧回路,外部能力靠 MCP/Powers。

---

## 5. harness 层设计

- **上下文 / 记忆管理**:
  - **规范文档即长期记忆**:批准后的 requirements/design/tasks 是被版本化、可复用的持久上下文,agent 每次执行都回读。
  - **Steering files** 是显式的、分模式加载(always-on / auto / manual)的项目知识层——把「团队约定」从易失的聊天上下文外置为磁盘上的 markdown。
  - **autonomous agent** 号称跨会话、跨仓库维持持久上下文,并从 review 反馈中学习(区别于会话制、关闭即失忆的 IDE 助手)。
- **工具接口**:标准 **MCP**;外加 AWS 领域打包的 **Kiro Powers**(CDK/CloudFormation/pricing/HealthOmics 等 MCP server)。
- **规划**:两级——(a)宏观规划=spec 三阶段(需求→设计→任务);(b)执行规划=`tasks.md` 依赖图 → 波次并发调度。
- **多 agent 交接**:任务级 spawn 出**作用域受限的子会话**;autonomous agent 内部再分 research/planning、code-writing、verification 专用子 agent 协作。
- **人在环(HITL)**:在需求与设计两个阶段有**强制批准门**;任务执行产出 diff 走 PR 式 approve/edit/reject;Quick Plan 提供「一次性跳过门」的旁路。
- **沙箱**:autonomous agent 起**隔离沙箱**镜像开发环境(自动探测 DevFile/Dockerfile,network 访问可配为「仅集成 / 常见依赖 / 开放互联网」,密钥/环境变量 per-task 注入)。IDE 内逐任务执行则以「diff 待批」作为安全边界。
- **数据/隐私**:据 FAQ,经 AWS IAM Identity Center / 外部 IdP 接入的 Pro/Pro+/Pro Max/Power 用户内容**不用于模型训练**;免费/个人订阅内容可能用于服务改进,可 opt out。

---

## 6. 与同类相比的独特设计取舍(为什么有人选它)

- **vs. Claude Code / Cursor / 终端 agent**:Kiro 把「规范」而非「聊天」当工作单元,**强制前置需求+设计并落成可版本化文档**,牺牲即时性换可审计性/可预测性——适合大改动、多人协作、合规敏感场景。
- **vs. GitHub Spec Kit / BMAD-METHOD 等纯 SDD 方法**:Kiro 把 SDD **产品化进一个完整 IDE**(而非一套 prompt/脚本约定),并内建 hooks、steering、任务依赖图并发、autonomous agent。
- **vs. 前身 Amazon Q Developer**:Kiro **抛弃了插件形态**(不再是寄生在既有 IDE 里的插件),改为独立 Code OSS 编辑器 + spec-first 工作流。
- **AWS 生态与合规**:GovCloud(US)可用、IAM Identity Center 企业鉴权、AWS 安全/隐私控制、Kiro Powers 直连 AWS 领域——对已在 AWS 上的团队是天然卖点。
- **取舍代价**:三阶段审批更重、更慢(故有 Quick Plan 旁路);基于 credit 的计费在高强度使用下成本高且曾引发强烈争议(见 §7)。

---

## 7. 采用度信号

- **GitHub**:`kirodotdev/Kiro` 仓库(2025-06 创建)约 **4k stars、约 274 forks、约 2,700+ open issues**(**时点:2026 年年中快照**;注意这是 issues/docs/下载仓库,非应用源码仓,star 数不代表源码社区规模)。
- **需求/势头**:发布满 90 天(2025-10)时 **>10 万开发者** 加入候补名单;需求过大导致 AWS 一度加用量上限+候补名单。
- **战略地位**:成为 AWS 编码工具主线,**取代 Amazon Q Developer**;进入 GovCloud;推出面向个人开发者的 autonomous agent;有 AWS Startups 的 Kiro Pro+ 一年免费额度计划、社区 hub / Kiro Labs / awesome-kiro 生态。
- **争议信号(负面但真实的采用度证据)**:2025-08 定价改版引发广泛反弹(The Register 称「wallet-wrecking tragedy」;GitHub Issue #2182 同名),曾出现「任务错误消耗多个 request」的计费 bug(AWS 承认并修复、重置受影响用户额度)。
- **具体知名企业客户**:**未找到可靠的公开知名用户名单**(官方与二手材料多为泛化表述,不做点名以免编造)。

---

## 8. 来源(一手优先)

1. Introducing Kiro(官方博客,2025-07-14)— https://kiro.dev/blog/introducing-kiro/
2. Kiro Docs — Specs(规范三文件 / EARS / 波次并发)— https://kiro.dev/docs/specs/
3. Kiro Docs — Models(Auto 路由 + 在册模型清单)— https://kiro.dev/docs/models/
4. Introducing Kiro autonomous agent(自主后台 agent / 沙箱 / 子 agent / PR)— https://kiro.dev/blog/introducing-kiro-autonomous-agent/
5. GitHub — kirodotdev/Kiro(仓库性质 / star/issue 计数 / README)— https://github.com/kirodotdev/Kiro
6. AWS Weekly Roundup(2026-02-23:Kiro 进 GovCloud、Bedrock 上 Claude Sonnet 4.6)— https://aws.amazon.com/blogs/aws/aws-weekly-roundup-claude-sonnet-4-6-in-amazon-bedrock-kiro-in-govcloud-regions-new-agent-plugins-and-more-february-23-2026/
7. The Register(2025-08-18:定价争议)— https://www.theregister.com/2025/08/18/aws_updated_kiro_pricing/
8. Amazon Q Developer → Kiro 迁移(官方)— https://kiro.dev/docs/migrating-from-q-developer/ ;并参 AWS 官方《Upgrade to Kiro》https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/upgrade-to-kiro.html

---

### 存疑 / 未核实清单(诚实标注)

- **「模型跑在 Amazon Bedrock 上」**:二手广泛断言,但 kiro.dev 官方 FAQ/models/introducing 未直证 → 记为强推断,非官方确证。
- **Q Developer 停更精确日期**(新注册 2026-05-15 停、支持终止 2027-04-30、Opus 4.6+ 仅限 Kiro 等):来自二手技术博客,方向有官方迁移文档佐证但**精确日期未逐条官方核实**。
- **在册模型清单**:随快照快速漂移(FAQ 与 models 页不完全一致),以使用当日为准。
- **知名企业客户名单 / 精确 MAU/DAU**:未找到可靠公开数据。
