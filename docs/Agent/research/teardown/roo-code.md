# Roo Code 拆解简报

> 快照时点:2026 年年中。本文只写可溯源断言;估算与不确定处已显式标注。
> **重要状态更新:Roo Code(VS Code 扩展 + Roo Code Cloud + Roo Code Router)已于 2026-05-15 全线停更/关停,GitHub 仓库同日被归档为只读。** 详见第 1、7 节。

---

## 1. 一句话定位 · 出品方 · 许可 · 2026 状态

- **定位**:Roo Code 是一款开源的 VS Code 扩展,把编辑器变成一个自主编码 agent —— 具备真实文件系统读写、终端命令执行、浏览器操作能力,并按「模式(mode)」把 agent 拆成多个专职角色(Code / Architect / Ask / Debug / Orchestrator 等)。官方标语:"Your AI-Powered Dev Team, Right in Your Editor"。
- **出品方**:RooCodeInc(公司位于美国 San Rafael,CA)。CEO 为 Danny Leffel,核心工程负责人 Matt Rubens(mrubens,GitHub 上活跃提交者)。VS Code Marketplace 发布者标识为 `RooVeterinaryInc`,扩展 ID `roo-cline`。
- **许可**:Apache-2.0(完全开源)。
- **谱系**:2024 年底 fork 自 **Cline**,初名 **Roo Cline**;2025 年初更名 **Roo Code**。Cline 生态衍生出两个主要独立 fork:Roo Code 与 Kilo Code。
- **融资**:据 Tracxn,Roo Code 为 Series A 公司,累计融资约 **$5M**,最近一轮 Series A 于 **2025-07-14**。(Tracxn 为第三方数据库,金额/日期未经官方确认,标注为二手数据。)
- **2026 状态 —— 已关停并转型**:
  - **2026-04-20** 官方宣布日落(sunset)。
  - **2026-05-15** Roo Code VS Code 扩展、Roo Code Cloud、Roo Code Router 全部关停;GitHub 仓库当日归档为只读。仓库/文档站现挂横幅:"The Roo Code Extension was shut down on May 15th",并引导原付费用户联系 `billing@roocode.com`。
  - **转型方向**:团队称「不认为 IDE 是编码的未来」,把公司押注在 **Roomote** —— 一个 Slack 优先、云端、端到端执行任务的 agent(接一个 prompt 直接跑完,集成 Slack / GitHub / Linear),不再逐步辅助 IDE 内开发。LinkedIn 公司页已更名为「**Roomote (formerly Roo Code)**」。截至快照,Roomote 处于 waitlist 阶段(估算/二手,标注)。
  - **官方迁移建议**:开源扩展用户迁往 **Cline**(Roo 的源头,官方称 Cline 团队「已吸收了我们做的很多东西」);社区另起了 fork **ZooCode**;第三方文章亦常提到 **Kilo Code**。

> 教学要点:Roo Code 是「IDE 内自主 agent」这一形态在 2024–2026 的代表作之一,但其出品公司在 2026 年中主动关闭它、转向云端/Slack agent —— 本身就是「IDE agent vs. 云端 agent」路线之争的一个标志性事件。讲课时应把它当作**已停更的历史范本 + 一次公开的战略转向**来讲,而非在售产品。

## 2. 解决什么问题 · 技术栈定位 · 与 LLM 的关系

- **解决的问题**:把 LLM 从「聊天里给代码片段」升级为「在真实仓库里自主执行多步开发任务」—— 读文件、按 diff 改代码、跑测试/构建命令、开浏览器验证、调用外部工具,并在每一步(可选)请求人类批准。
- **技术栈定位**:它是一个 **agent harness(编排/运行时外壳)**,不是模型也不是基础设施。它自身不训练/不托管模型,而是把用户请求 + 动态生成的 system prompt + 工具协议喂给外部 LLM,再把模型产出的「工具调用」翻译成对 IDE/文件系统/终端的真实动作。
- **与 LLM 的关系 —— 模型无关(model-agnostic)**:支持通过 OpenRouter、Anthropic、OpenAI、Google Gemini、本地(Ollama/LM Studio)等多种 provider 接入任意模型;每个 mode 可绑定不同模型(例:Architect 用 Gemini 2.5、Code 用 Claude Sonnet)。团队还自建过 **Roo Code Router**(模型路由,已随日落关停)。

## 3. 架构与核心组件(点名真实构件)

Roo Code 的运行时构件(来源:官方 docs + DeepWiki 对源码的解析):

- **Task 循环(agentic loop)**:核心是「LLM 产出一次工具调用 → harness 执行 → 结果回灌 → 再次调用 LLM」的迭代,直到 `attempt_completion`。
- **动态 System Prompt 组装器**:源码 `src/core/prompts/system.ts` 中的 `SYSTEM_PROMPT` 函数,由一组「专职子函数」拼装,**每次交互都重新生成**,随当前 mode / 可用工具 / 自定义设置变化。八大区块:① 角色定义(按 mode)② 工具描述(含参数与示例)③ 工具使用准则(顺序执行、等结果)④ 能力说明 ⑤ 可用 mode 列表 ⑥ 操作规则 ⑦ 系统信息(OS/shell/工作目录)⑧ 自定义指令(全局 + mode 级)。
- **Mode / 角色系统**:内置 Code、Architect、Ask、Debug、Orchestrator(🪃 Boomerang)等。每个 mode 有独立的角色定义、工具组权限(如 Architect/Ask 不能写代码或跑命令)、可绑定不同模型、可加载 mode 级自定义指令。支持完全自定义 mode。
- **工具层(按组组织)**:Read(`read_file`、`list_files`、`read_command_output`)、Search(`search_files`、`codebase_search`)、Edit(`apply_diff`、`apply_patch`、`write_to_file`、`search_replace`、`edit_file`)、Command(`execute_command`、`run_slash_command`)、Image(`generate_image`)、MCP(`use_mcp_tool`、`access_mcp_resource`)、Workflow(`switch_mode`、`new_task`、`attempt_completion`、`ask_followup_question`、`update_todo_list`、`skill`)。其中 `ask_followup_question`、`attempt_completion`、`switch_mode`、`new_task` 四个**任何 mode 都可用**。
- **执行器 + 人类批准门**:每个工具调用先以「提案」形式呈现(Save/Reject 按钮),批准后才执行;可对可信操作开 Auto-approve。
- **上下文/记忆管理**:Intelligent Context Condensing(LLM 摘要压缩)+ 滑动窗口截断 + Checkpoints(可回溯的检查点)。
- **MCP 集成**:内置 MCP 客户端,可接任意 MCP server 扩展工具;并有 **Marketplace**(扩展内一键安装 MCP server 与自定义 Mode)。
- **Roo Code Cloud / Router(已关停)**:云端可从 GitHub / Web / Slack 触发更长/团队协作型任务;Router 做模型路由。

## 4. 一步步怎么运转(控制/编排回路 —— 讲课重点)

以「在 Code 模式下修一个 bug」为例,一次用户请求实际流经的回路:

1. **用户输入请求**(自然语言),选定当前 mode(默认 Code)。
2. **动态组装 System Prompt**:`SYSTEM_PROMPT` 按当前 mode 拼出角色定义 + 该 mode 允许的工具组描述 + 工具使用准则 + 系统信息(OS/shell/cwd)+ 全局与 mode 级自定义指令。
3. **发起 LLM 调用**:把 system prompt + 对话历史(必要时经条件压缩,见步骤 8)发给当前 mode 绑定的模型。
4. **模型产出一次工具调用**:采用 **XML 风格工具语法**,一次消息只发**一个**工具,例如:
   ```xml
   <read_file><path>src/foo.ts</path></read_file>
   ```
   工具使用准则明确要求「顺序执行、每步等结果再继续」。
5. **人类批准门**:harness 把该工具调用渲染成提案(显示将要执行什么),用户 Save(批准)/ Reject(拒绝),或此前已对该类操作开启 Auto-approve 则自动放行。
6. **执行器执行 + 校验**:先做 mode 权限检查、参数校验,再实际调用文件系统/终端/浏览器/MCP;判定成功或失败并处理错误。
7. **结果回灌**:工具执行结果作为**独立的 tool 消息**回写进对话历史(而非塞进上一条 assistant 消息)。
8. **上下文管理**:若对话逼近上下文窗口阈值(默认 100%,可调到如 80% 提前触发),触发 Intelligent Context Condensing —— **用当前会话同一个 provider/模型**把早期历史摘要压缩(官方明确:换模型压缩会在含 tool 调用/结果的结构化历史上降低摘要质量);原始消息仍被保留,可经 Checkpoints 回溯。
9. **迭代**:回到步骤 3,LLM 依据新结果决定下一个工具调用。典型链路 `read_file → apply_diff → execute_command(跑测试) → …`。
10. **收尾**:模型调用 `attempt_completion`,把最终结果/摘要交回;任务结束。中途若信息不足,模型可用 `ask_followup_question` 反问用户;或用 `switch_mode`/`new_task` 切换/派生子任务(见第 5 节)。

> 讲课时可强调三个「回灌点」:工具结果回灌(步骤 7)、上下文摘要回灌(步骤 8)、子任务完成摘要回灌(第 5 节)。这三处是 harness 层真正做「记忆/上下文工程」的地方。

## 5. Harness 层设计

- **上下文/记忆管理**:三重机制叠加 ——(a)**Intelligent Context Condensing**:接近窗口上限时用同模型 LLM 摘要早期历史,显示压缩前后 token 数、该次 AI 调用成本、可展开的摘要;可自动或手动("Condense Context" 按钮)触发。(b)**滑动窗口截断**作为兜底。(c)**Checkpoints**:压缩/截断不真正删除原始消息,回溯到某检查点时自动恢复完整历史。
- **工具接口**:XML 风格、一次一工具、顺序执行、等结果;工具按 Read/Search/Edit/Command/Image/MCP/Workflow 分组,mode 决定可用工具组;所有工具调用默认经人类批准门,可按类型开 Auto-approve。
- **规划**:无独立「规划器」模块;规划体现在(a)Architect mode(只读、专做高层设计,不能改代码)与(b)`update_todo_list` 工具维护待办清单 +(c)Orchestrator mode 的任务分解。
- **多 agent 交接(Boomerang Tasks / Orchestrator)**:🪃 Orchestrator 为内置 mode。它用 `new_task` 派生子任务 —— **`mode` 参数**指定子任务用哪个专职 mode(Code/Architect/Debug…),**`message` 参数**下传本次子任务所需的全部上下文。关键设计:
  - **上下文隔离**:每个子任务有**独立会话历史**,**不自动继承**父任务上下文;信息只经两个通道传:下行=`message` 初始指令,上行=完成摘要。
  - **父任务挂起/恢复**:子任务执行时父任务暂停;子任务用 `attempt_completion` 的 `result` 返回**精简摘要**,父任务恢复后只收到该摘要(而非子任务完整历史),从而不被 diff/文件分析等细节污染,专注高层编排。
  - 默认每个子任务的创建与完成都需人类批准(可经 Auto-approve 自动化)。
- **人在环(human-in-the-loop)**:默认每个工具使用都要显式批准(Save/Reject);Auto-approve 可按操作类型放开;子任务边界同样有批准门。
- **沙箱**:**没有内置容器化沙箱**;命令通过 `execute_command` 在用户真实终端/工作区执行,安全边界主要靠「每步人类批准 + mode 工具权限限制」。(相较之下,同类的 OpenHands 走 Docker 沙箱路线 —— 这是 Roo 的一个明确取舍。)

## 6. 独特设计取舍(为什么有人选它)

- **多 mode / 可完全自定义角色**:相比 Cline 的单一 agent 形态,Roo 把「无限模糊权限的单一 prompt 面」拆成专职 mode(Architect 只读设计、Code 写代码、Debug 诊断),并允许自定义 mode + mode 级模型绑定 —— 这是它 fork Cline 后最核心的差异化。
- **Orchestrator/Boomerang 的上下文隔离式多任务**:用「子任务独立上下文 + 仅回传摘要」来对抗长任务的上下文污染,是它相对轻量 agent 的显著设计。
- **强 MCP 生态 + 扩展内 Marketplace**:一键安装 MCP server 与社区 mode。
- **模型无关 + 可全本地**:任意 provider、可接 Ollama/LM Studio 本地模型,成本可控(社区常见「Roo Code + OpenRouter 低成本」用法)。
- **每步人类批准的安全模型**:适合不接受「无人值守改仓库」的团队。
- **取舍代价**:无内置沙箱(靠人类批准兜底);XML 工具协议 + 逐工具批准在长任务上比全自动 agent 更「啰嗦」;以及最根本的 —— 出品方已停更,选它等于选一个不再维护的代码库(应转 Cline/Kilo/ZooCode)。

## 7. 采用度信号

- **GitHub star**:归档时约 **24.3k**(截至 2026-05-15 仓库归档时点,来自仓库页;更早的二手报道给出 ~23.8k / 24.2k,量级一致)。
- **VS Code 安装量**:官方日落语境下报道 **3,000,000+ 安装**(3M+);另有二手来源给出「1.55M installs、300+ 贡献者」的更保守口径 —— 两组数字并存,**未能核实哪个为准**,均标注为报道数据。
- **贡献者/社区**:300+ 贡献者(二手报道);围绕它形成了 RooFlow、SPARC/Orchestration、大量社区自定义 mode 与 prompt 仓库。
- **势头**:2025 全年高速迭代(v3.x 系列,如 v3.17 於 2025-05-14、v3.36 等 release notes 可查),曾是 Cline 之外最热门的开源 IDE agent 之一。**2026-04 宣布日落、2026-05-15 关停后势头终止**,官方引导用户转向 Cline。
- **知名用户**:**未找到可靠的具名企业用户公开数据**(除官方称其最初为「内部团队」自用而 fork)。

## 8. 来源

1. Roo Code GitHub 仓库(含归档横幅、许可、star 数、标语):https://github.com/RooCodeInc/Roo-Code
2. 官方日落公告页:https://roocodeinc.github.io/Roo-Code/sunset (原 https://docs.roocode.com/sunset 301 跳转)
3. The New Stack:Roo Code 转向云端 agent、称 IDE 不是编码的未来:https://thenewstack.io/roo-code-cloud-ides-ai-coding/
4. 官方文档 —— System Prompt 结构(`src/core/prompts/system.ts`):https://roocodeinc.github.io/Roo-Code/advanced-usage/prompt-structure
5. 官方文档 —— How Tools Work(XML 工具协议 + 批准回路):https://roocodeinc.github.io/Roo-Code/basic-usage/how-tools-work
6. 官方文档 —— Boomerang Tasks / Orchestrator(多 agent 交接):https://roocodeinc.github.io/Roo-Code/features/boomerang-tasks
7. 官方文档 —— Intelligent Context Condensing(上下文压缩):https://roocodeinc.github.io/Roo-Code/features/intelligent-context-condensing
8. Tracxn 公司档案(融资 $5M / Series A 2025-07-14,二手):https://tracxn.com/d/companies/roocode/__UJqyuZv39yhKmX1NdwB0EohinKBEUE7oJa0bbMySf7I

---

### 未能核实 / 显式标注为估算的点
- 安装量口径冲突:3M+(日落报道)vs 1.55M(另一二手来源)—— 未定论。
- 融资 $5M / Series A 2025-07-14:仅 Tracxn 二手,未见官方确认。
- Roomote 处于 waitlist、集成 Slack/GitHub/Linear:来自二手报道,官方产品细节未直接核验。
- 具名企业客户:未找到公开数据。
