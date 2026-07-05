# Amazon Q Developer 事实底稿

> 快照时点:2026 年年中(7 月)。本文只写可溯源断言;推断与不确定处显式标注。

## 0. 一句话 TL;DR + 关键状态提醒

Amazon Q Developer 是 AWS 的 AI 编码 agent(前身 CodeWhisperer),覆盖 IDE 插件、agentic CLI(Rust)、`/dev` 特性开发 agent 与 GitHub 集成,底层跑在 Amazon Bedrock 上、主用 Anthropic Claude 系列模型。

**重大状态变化(务必写进教案):Q Developer 正在被 AWS 用继任产品 Kiro 取代,处于「end-of-support」轨道。**
- 2026-05-15 起停止新注册(新 Free Tier 账号 / 新 Q Developer 订阅创建被封);已有订阅仍可加人。
- IDE 插件与付费订阅支持到 **2027-04-30** 截止(经 Q Developer Pro 或 Kiro 订阅访问的用户维持到该日)。
- CLI 已开源仓库(`aws/amazon-q-developer-cli`)**不再主动维护,仅收关键安全修复**;功能演进转移到闭源的 **Kiro CLI**。
- 2026-05-29 起 Opus 4.6 从 Q Developer Pro 下架(Opus 4.5 及其余模型保留);最新模型(如 Opus 4.7)专供 Kiro。
- 未受影响:AWS 管理控制台内、文档站、移动 App、Slack/Teams 聊天集成中的 Q Developer。

因此「2026 年状态」的准确表述是:**活跃但已进入日落期,继任者为 Kiro(闭源,spec-driven)**。

---

## 1. 定位 / 出品方 / 许可 / 状态

- **一句话定位**:面向 AWS 生态的端到端编码 agent —— 从 IDE 内代码补全/聊天,到终端 agentic CLI,到 `/dev` 多文件特性开发、代码审查、Java 升级 / .NET 移植等「专项 agent」。
- **出品方**:Amazon Web Services(AWS)。
- **历史沿革**:前身 **Amazon CodeWhisperer**;2024-04-30 正式并入 **Amazon Q Developer** 并 GA(AWS 说法:CodeWhisperer 只是起点,想要覆盖更广用例的品牌)。
- **许可**:
  - CLI 开源部分 `aws/amazon-q-developer-cli` **双许可 Apache-2.0 / MIT**,代码 ~99.5% Rust。
  - 服务本体(IDE 插件、后端、专项 agent)为**闭源托管服务**。
- **2026 状态**:见上「关键状态」——日落期,新签约通道 2026-05-15 关闭,支持 2027-04-30 止,继任产品 Kiro。定价:Free tier + Pro **$19/user/月**(截至 2026-06;Free tier 含无限补全 + 每月 50 次 agent chat 交互 —— 后一数字为第三方定价页转述,建议以官方定价页复核)。

---

## 2. 解决什么问题 / 在 agent 栈中的位置 / 与 LLM 的关系

- **解决的问题**:在开发者已有的三个位置(IDE、终端、GitHub / 控制台)提供从补全到自主多文件改动的连续体,并深度绑定 AWS 特有工作流(AWS CLI 调用、CDK、Java 版本升级、.NET 跨平台移植、安全扫描/修复)。
- **栈中位置**:它同时是 **agent(harness)** 和**多 agent 编排层**,不是纯模型也不是纯底层平台:
  - CLI(`q chat`)= 一个完整 agent harness(自带 agent loop、native 工具、MCP 工具层、上下文/权限管理)。
  - `/dev`、`/review`、Java/.NET transform = 后端托管的**专项 agent**(plan → 生成 → 测试)。
  - **CLI Agent Orchestrator(CAO)** = 官方开源的**多 agent 编排框架**,把 Q CLI / Claude Code 当作 worker。
- **与底层 LLM 的关系**:自身**不训练前沿基础模型**,通过 **Amazon Bedrock** 消费第三方模型,主力为 **Anthropic Claude** 系列。可验证的时间线:早期 agentic CLI 用 **Claude 3.7 Sonnet**;2025-06(CLI v1.11.0+)加入 **Claude Sonnet 4**,可用 `/model` 命令切换/设默认;后期 Pro 侧提供到 Opus 4.5/4.6(4.6 于 2026-05-29 下架)。→ Q Developer 是 harness/编排,模型是可插拔的 Bedrock 后端。

---

## 3. 架构与核心组件(点名真实构件)

**CLI(`aws/amazon-q-developer-cli` monorepo,Rust)**
- `chat_cli` —— 主 `q` CLI / agentic chat 应用(agent loop 所在)。
- `crates/` —— 多个内部 Rust crate(库层)。
- 历史上同仓还含桌面 app / autocomplete / figterm / VSCode & JetBrains 插件等构件(旧 monorepo 结构);当前 README 主推 `chat_cli` + crates + scripts + docs。
- **Native 工具层**:`fs_read`、`fs_write`、执行 shell 命令(bash)、调用 AWS CLI 等 —— agent 直接读写本地文件、生成 diff、跑编译器/包管理器/git。
- **MCP 工具层**:通过 Model Context Protocol 接入本地(进程)与远程(HTTP,可 OAuth)MCP server;配置在 `~/.aws/amazonq/mcp.json`。
- **自定义 agent(custom agents)**:JSON 配置文件,定义可用工具、可信工具、上下文、模型、MCP —— 见第 5 节 schema。
- **上下文/记忆构件**:`resources`(glob 载入的上下文文件,如 `.amazonq/rules/**/*.md`)、context **hooks**(agent 启动时跑 shell 命令把输出注入上下文,如 `git status`)。

**IDE 侧(VS Code / JetBrains 插件)**
- 内联补全、聊天、`/dev` 特性开发 agent、`/review`、代码转换 agent;agent 产出 **diff 视图**并设**审批门**(Run/Reject、可逐条或整体撤销)。

**多 agent:CLI Agent Orchestrator(CAO,官方开源)**
- **Supervisor agent**(维护全局项目上下文)+ **specialized worker agents**(领域任务)的**分层**结构。
- 每个 agent 跑在**隔离的 tmux 会话**里,agent 间通过 **MCP server 通信**。

---

## 4. 一步步怎么运转(控制/编排回路 —— 本节最重要)

### 4a. CLI agentic chat 主回路(`q chat`)
一次用户请求实际流经的循环(据官方博客 + 配置文档综合):

1. **入口 & agent 装载**:用户运行 `q chat`(可 `--agent front-end` 选特定 custom agent)。CLI 载入该 agent 的 JSON 配置:system-prompt 性质的 `prompt`、`tools`(可用集)、`allowedTools`(可信集)、`mcpServers`、`resources`、`hooks`、`model`。
2. **上下文组装**:执行 context **hooks**(如 `git status`)把输出注入;按 `resources` 的 glob 载入上下文文件(README、规则文件、用户偏好 md);连接并枚举各 MCP server 暴露的工具。
3. **发给模型**:把用户输入 + 组装上下文 + native/MCP 工具清单发给 Bedrock 上的 Claude 模型(如 Claude Sonnet 4 / Opus 4.5)。
4. **模型推理并请求工具**:模型用 step-by-step reasoning 拆解任务,决定调用工具(`fs_read` 读文件、`fs_write` 写文件、执行 shell、AWS CLI 等)。注:agent 在编辑前会先读文件,以检测用户手工改动。
5. **权限门**:对每个工具调用查是否在 `allowedTools` —— 可信则直接执行,不可信则**弹确认**让用户 verify(可开启逐操作确认)。
6. **执行 & 回灌**:CLI 执行工具、拿到结果(文件内容、命令 stdout/stderr、diff),把结果作为新一轮观察回灌给模型。
7. **循环**:模型据观察决定下一步或收尾 —— 即经典 **观察→推理→工具调用→观察** 的多轮 ReAct 式 agent loop,支持 multi-turn 的开发者-agent 来回协作。
8. **收尾**:任务完成后总结;文件改动以 diff 形式呈现,用户可保留/撤销。

### 4b. `/dev` 特性开发 agent 回路(IDE,托管后端)
1. 用户在 chat 输入 `/dev` + 自然语言需求。
2. Agent **分析代码库**,产出**跨多文件的实现计划(plan)**。
3. **计划审批门**:用户可接受计划,或让 agent 迭代修改计划。
4. 计划确认后,agent **生成代码改动**(多文件),并生成/运行单元测试。
5. 每个被改文件打开 **diff 视图**;用户审阅后决定应用。
→ 关键区别于 CLI:**先出计划、经人批准、再落地**的 plan-then-execute 结构。

### 4c. CAO 多 agent 编排回路
- Supervisor 收到任务 → 按需求 / 专长匹配 / 依赖关系**路由**到 worker。
- 三种协作原语:
  - **Handoff** —— 同步任务转交,等对方完成。
  - **Assign** —— 异步派生,并行执行。
  - **Send Message** —— 已存在 agent 间直接通信。
- Supervisor 只把**必要上下文**下发给 worker(避免 "context pollution"),worker 在隔离 tmux 会话中干活、经 MCP 回话。

---

## 5. harness 层设计

- **上下文 / 记忆管理**:`resources`(glob 载入 md / 规则 / 偏好文件)+ context **hooks**(动态注入 shell 输出);无公开的持久向量记忆细节(**未找到公开数据**说明其长时记忆机制)。CAO 层用「supervisor 只下发必要上下文」做跨 agent 上下文压缩。
- **工具接口**:双轨 —— **native 内建工具**(`fs_read`/`fs_write`/execute bash/AWS CLI)+ **MCP**(本地进程 + 远程 HTTP,支持 OAuth)。`toolAliases` 解决命名冲突。
- **规划**:CLI 侧靠模型隐式规划(无强制 plan 步);`/dev` 侧是**显式 plan-then-approve-then-execute**。
- **多 agent 交接**:CAO 的 handoff(同步)/ assign(异步)/ send message(直连),分层 supervisor-worker。
- **人在环(HITL)**:核心设计点 —— `tools` vs `allowedTools` 的**可用 vs 可信**二分;不可信工具触发确认;IDE 侧每个命令 Run/Reject + diff 审阅 + 逐条撤销。
- **沙箱**:CLI 直接在**用户本机**执行(非重沙箱,靠权限门约束);CAO 用 **tmux 会话隔离**做进程级隔离。**未找到**证据表明有容器/VM 级强沙箱(据此推断为轻隔离,标注为推断)。

---

## 6. 独特设计取舍(为什么有人选它)

- **AWS 原生绑定**:对已在 AWS 上的团队,agent 能直接调 AWS CLI、生成 CDK、跑 Java 升级 / .NET 移植 / 安全扫描 —— 这是 Copilot / Claude Code 不覆盖的 AWS 专项工作流。
- **模型可插拔 + 无额外模型费**:通过 Bedrock 用 Claude,`/model` 切换,模型费含在订阅内(Sonnet 4 上线时明确「no additional cost」)。
- **可用 vs 可信 的权限二分**:比「全放行 / 全确认」更细,适合企业审计口味。
- **CLI 开源(Rust)+ 官方多 agent 编排(CAO)**:给了 harness 层可读性与可扩展性;CAO 还能编排 Claude Code,不锁死自家 agent。
- **代价 / 为什么可能不选**:SWE-bench 早期分数偏低(2024-05 Q Developer agent 报 13.82% SWE-bench / 20.33% SWE-bench lite —— 那是早期自研数据,非当前 Claude 后端水平);品牌/产品线动荡(CodeWhisperer→Q→现被 Kiro 取代)带来迁移风险,这是 2026 年选型最大的负面信号。

---

## 7. 采用度信号

- **GitHub star**:`aws/amazon-q-developer-cli` 约 **2,000 stars**(时点:2026 年年中本次抓取;数量级信号,非精确)。
- **SWE-bench**:Q Developer 自研 agent 2024-05 报 13.82%(full)/ 20.33%(lite),AWS 称当时居榜首;此后改用 Claude(Sonnet 4 官方引用 72.7% agentic SWE-bench —— 那是 Anthropic 的模型分,非 Q harness 分,勿混淆)。
- **知名用户 / 势头**:**未找到**可靠的具名大客户 logo 或 DAU/付费席位公开数据。势头方向明确为**下行**:AWS 主动日落 Q Developer、把资源与最新模型倾斜到 Kiro。第三方定价站(aiproductivity、costbench 等)在持续跟踪,但非一手采用数据。
- **生态**:社区有 `awesome-q-developer` 列表、第三方 Web UI(`amazon-q-developer-cli-webui`)、CAO 编排框架等,说明 CLI 时代有真实开发者生态,但正随日落迁移。

---

## 8. 来源

1. GitHub `aws/amazon-q-developer-cli`(README:许可、Rust、~2k star、不再维护、指向 Kiro CLI):https://github.com/aws/amazon-q-developer-cli
2. AWS 官方 end-of-support 公告(2026-05-15 停新签、2027-04-30 支持截止、Opus 版本变动、Kiro 继任):https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/
3. AWS DevOps 博客:enhanced/agentic CLI(Bedrock、Claude 3.7 Sonnet、native 工具、bash、确认门):https://aws.amazon.com/blogs/devops/introducing-the-enhanced-command-line-interface-in-amazon-q-developer/
4. AWS DevOps 博客:CLI custom agents(`~/.aws/amazonq/cli-agents/*.json`、tools vs allowedTools、resources、hooks、MCP):https://aws.amazon.com/blogs/devops/overcome-development-disarray-with-amazon-q-developer-cli-custom-agents/
5. AWS Open Source 博客:CLI Agent Orchestrator(supervisor/worker、handoff/assign/send message、tmux 隔离、MCP 通信):https://aws.amazon.com/blogs/opensource/introducing-cli-agent-orchestrator-transforming-developer-cli-tools-into-a-multi-agent-powerhouse/
6. AWS DevOps 博客:IDE agentic coding experience(diff、审批门、`/dev` plan-then-execute):https://aws.amazon.com/blogs/devops/amazon-q-developer-agentic-coding-experience/
7. AWS DevOps 博客:Claude Sonnet 4 接入 CLI(`/model` 切换、v1.11.0+、无额外费用):https://aws.amazon.com/blogs/devops/access-claude-sonnet-4-in-amazon-q-developer-cli/
8. TechCrunch:CodeWhisperer 更名 Q Developer、2024-04-30 GA、Agents 能力:https://techcrunch.com/2024/04/30/amazon-codewhisperer-is-now-called-q-developer-and-is-expanding-its-functions/

### 显式标注的未核实 / 不确定项
- Free tier「每月 50 次 agent chat」及 $19/月:来自第三方定价站转述,建议以 AWS 官方定价页(https://aws.amazon.com/q/developer/pricing/)最终复核。
- 2k star 为数量级快照,非精确实时值。
- 强沙箱缺失、长时持久记忆机制:**未找到公开数据**,文中相关结论已标为推断。
- 具名企业客户 / DAU / 付费席位:**未找到公开一手数据**。
