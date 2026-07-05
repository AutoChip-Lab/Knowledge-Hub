# OpenAI Operator / CUA — 事实底稿（快照:2026 年年中)

> 研究对象:OpenAI 的 **Computer-Using Agent (CUA)** 模型,及其两个产品化面孔——消费级 **Operator** 产品(已并入 ChatGPT Agent)与开发者 **computer use 工具**(Responses API)。
> 说明:Operator 作为独立产品在 2025-08 停用;本底稿把「模型/能力」与「产品外壳」分开写,以免混淆。

---

## 1. 一句话定位

**Operator = 一个能像人一样看屏幕截图、发出鼠标/键盘动作来操作浏览器与桌面的 agent 产品**,底层是 OpenAI 自研的 CUA 模型(视觉 + 强化学习的 GUI 操作),不依赖 OS/网站专用 API。

- **出品方**:OpenAI。
- **许可**:
  - 消费产品(Operator / ChatGPT Agent):闭源、订阅制。
  - 开发者侧参考实现 `openai/openai-cua-sample-app`:**MIT License**(开源示例,非产品源码)。
- **2026 年状态**:
  - 独立 Operator 产品(operator.chatgpt.com)**已停用**;2025-07-17 并入 **ChatGPT Agent**,标准 Operator 站点在 2025-08-31 前后关闭。
  - **能力活跃、只是改名**:CUA 模型能力现存活于 ChatGPT Agent 内的「agent mode / 虚拟浏览器」,以及 API 的 **computer use 工具**中。
  - 开发者示例仓库仍在维护(最近推送 2026-03-30),且在 2026-03 被**重写为 TypeScript 版并升级到 `gpt-5.4` 模型**(见 §7 与「模型演进」)。

**模型演进(重要,别只记住 GPT-4o)**:
- 2025-01 发布:CUA = **GPT-4o 视觉 + RL**,API 模型名 `computer-use-preview`。
- 2025-05:ChatGPT 里的 Operator 模型升级为 **基于 o3 的 o3 Operator**(API 版当时仍保留 4o-based `computer-use-preview`)。
- 2026-03:官方示例仓库 `main` 分支默认模型改为 **`gpt-5.4`**(原 Python/`computer-use-preview` 示例被移到 `v1` 分支保留)。

---

## 2. 解决什么问题 / 在技术栈里的位置

**问题**:让 AI 完成「需要点开网页、点按钮、填表单、翻页」的任务——订餐、订票、填报销、跨遗留系统做数据录入等——这些没有干净 API、只有 GUI 的活。CUA 的卖点是**用截图+坐标动作通用地操作任意 GUI**,而不是为每个网站写集成。

**栈内位置**——它同时横跨两层,讲课时要拆开:
- **模型层**:CUA 本身是一个 **multimodal action 模型**(输入截图,输出 GUI 动作),这是能力的来源。
- **harness / agent 层**:
  - 消费侧:Operator/ChatGPT Agent 是**完整 agent + 托管沙箱**(自带云端浏览器/虚拟机)。
  - 开发侧:API 的 `computer` 工具 **只是一个工具接口**——模型发动作,**执行沙箱由开发者自己提供**(Playwright / Docker / Browserbase / Scrapybara)。OpenAI 还提供 **Agents SDK** 与 **Responses API** 作为编排层。

**与底层 LLM 的关系**:CUA 不是外挂在通用 LLM 上的 prompt 框架,而是**一个专门训练/微调过的模型**(GPT-4o→o3→gpt-5.4 谱系),把「看 GUI、决定下一步动作」的能力烧进权重里。harness 只负责执行动作、回传截图、做安全闸门。

---

## 3. 架构与核心组件(点名真实构件)

围绕 **CUA loop(感知-推理-动作循环)**,真实构件:

- **感知输入**:浏览器/桌面的**截图**(base64 PNG,`input_image`);浏览器环境还回传 `current_url`。
- **模型输出项(Responses API `output`)**:
  - `message`:给用户的文字。
  - `computer_call`:一个待执行的 GUI 动作,含 `action`、`call_id`、可选 `pending_safety_checks`。
  - (通用)`function_call`:普通工具调用。
- **动作空间(action types,来自官方示例 `v1`)**:`click(x,y,button)`、`double_click`、`scroll(x,y,scroll_x,scroll_y)`、`type(text)`、`keypress(keys)`、`move(x,y)`、`drag(path)`、`wait(ms)`;截图作为下一轮输入回传。
- **执行器 / 沙箱(harness 侧)**:抽象为 `Computer` 接口(`computers/computer.py`),负责把 `computer_call` 真正落到环境上。示例实现:`LocalPlaywright`(本地浏览器)、`Docker`(容器化 Linux 桌面)、`Browserbase`、`ScrapybaraBrowser`、`ScrapybaraUbuntu`。
- **agent 循环器**:`agent/agent.py` 的 `run_full_turn()`——反复调模型直到没有待处理的 computer/function 调用。
- **安全构件**:`pending_safety_checks` / `acknowledged_safety_checks`(API 级别的确认闸门)、URL 黑名单检查(`check_blocklisted_url`);消费产品侧还有独立的 **monitor model(监视模型)** 与 **watch mode**。
- **消费产品外壳(Operator/ChatGPT Agent)专有**:托管**云端浏览器 / 虚拟计算机(virtual computer)**、**takeover 接管模式**、并在 ChatGPT Agent 里额外挂了 **text browser、terminal(跑 Python)、API connectors(Gmail/GitHub/日历等)**。

> 现行 `main` 分支(2026-03,TS 版)引入了两种运行模式:`native`(直接暴露 Responses API computer 工具)与 `code`(通过 `exec_js` 暴露一个持久 Playwright JS REPL,让模型写脚本操作浏览器,而非发原子坐标动作)。这是 harness 形态的一个明显演化。

---

## 4. 一步步怎么运转(控制/编排回路)—— 本节最重要

以 **API computer use 工具**为例(可据此讲课,取自官方示例 `simple_cua_loop.py`,v1 分支):

1. **建工具声明**:harness 读出环境屏幕尺寸,声明工具
   `{"type": "computer-preview", "display_width", "display_height", "environment": "browser"|"linux"|...}`。
2. **喂用户请求**:把 `{"role":"user","content": <任务>}` 加入 `items`。
3. **调模型**:`create_response(model="computer-use-preview", input=items, tools=tools, truncation="auto")`。
4. **读输出项**:遍历 `response["output"]`,逐项 `handle_item`:
   - 若是 `message` → 打印/回给用户。
   - 若是 `computer_call` → 取出 `action`(如 `click`),**在 `Computer` 执行器上真正执行**(`getattr(computer, action_type)(**args)`)。
5. **截图回传**:执行动作后 `computer.screenshot()` 拿新截图,构造
   `{"type":"computer_call_output","call_id": item["call_id"], "output":{"type":"input_image","image_url":"data:image/png;base64,..."}}`
   （浏览器环境再塞入 `current_url`)。
6. **安全闸门**:若该 `computer_call` 带 `pending_safety_checks`,**先让人确认**(`acknowledge_safety_check_callback`);确认后把它们放进回传项的 `acknowledged_safety_checks` 里,否则抛错终止。浏览器环境还对 `current_url` 跑黑名单检查。
7. **回灌 + 续循环**:把 `computer_call_output` 追加进 `items`,回到第 3 步再调模型。**如此「模型出动作 → harness 执行 → 回传新截图 → 模型看结果再决定」不断迭代**。
8. **收敛退出**:当模型返回的最后一项是普通 assistant 消息(没有新的 `computer_call`)——即 `items[-1]["role"]=="assistant"`——本轮结束,等下一条用户输入。

关键点:**编排回路的「大脑」在模型权重里**(把任务拆成多步计划、遇阻自我纠正),harness 是一个「渲染器 + 执行器 + 安全闸门」,不做 LLM 规划逻辑。执行沙箱由使用者提供,OpenAI 不代管(这正是与消费版 Operator 的分界)。

**消费版 Operator / ChatGPT Agent** 的回路多了三件事:(a)OpenAI 托管云端浏览器/虚拟机,用户不管执行器;(b)遇登录/支付会**暂停并把控制权交给用户(takeover)**,此时**不截图**以保护密码;(c)提交订单/发邮件等**consequential action 前需用户批准**,敏感站点用 **watch mode** 要求用户在场监督。ChatGPT Agent 还会在**视觉浏览器 / 文本浏览器 / terminal / connector** 之间自行选择合适工具。

---

## 5. harness 层设计

- **上下文/记忆管理**:通过 `items` 累积消息 + `computer_call` + `computer_call_output`(截图)线性拼接;`truncation="auto"` 让 API 自动截断长历史。工具循环用 `previous_response_id` 或完整 `items` 维持连续性。ChatGPT Agent 侧额外共享 ChatGPT 的记忆/个性化(这是并入 ChatGPT 的一大动机——省去「从 chat 复制到 Operator」的摩擦)。
- **工具接口**:computer 工具本质是「**模型发意图动作、harness 负责执行并回传观测**」的截图-动作契约;与之并存的还有普通 `function_call` 工具。官方明确:**已有 Playwright/Selenium/VNC/MCP 自动化栈的开发者不必重建**,可把现有栈包成一个普通工具暴露给模型。
- **规划**:无外部显式 planner——**多步计划与自我纠正是模型内建能力**(RL 训练所得),harness 不写 plan 图。
- **多 agent 交接**:computer 工具本身单 agent;跨 agent 编排交给 **Agents SDK**(handoff 概念在 SDK 层,不在 CUA loop 内)。ChatGPT Agent 是把原 Operator(操作)+ Deep Research(检索分析)+ 浏览/终端整合进**一个 agent 面**,而非多 agent 网。
- **人在环(HITL)**:三档——API 级 `pending_safety_checks` 确认;产品级 **takeover**(登录/支付交还用户,期间停截图);**consequential action 批准** + **watch mode** 监督。
- **沙箱**:开发侧由使用者提供(本地 Playwright / Docker / 远程 Browserbase / Scrapybara);消费侧由 OpenAI 托管云端浏览器/虚拟计算机。官方反复警告:**preview 期不要指向已登录/金融/医疗等高风险环境**。

---

## 6. 独特设计取舍(为什么有人选它)

- **通用 GUI、不靠专用 API**:用截图+坐标操作任意界面,能碰**没有 API 的遗留系统 / 复杂 JS 网站**——这是它相对「函数调用式 agent」的核心差异。
- **能力烧进模型**:规划/纠错在权重里,harness 极薄——上手门槛低,但**开发者对规划逻辑的可控性也低**(要改行为得靠 prompt 和工具设计,而非改 planner 代码)。
- **执行沙箱解耦**:API 版**不代管执行环境**,可插进你已有的 Playwright/Docker/VNC/MCP 栈——比「全托管黑盒」更灵活,代价是安全/沙箱责任落到你头上。
- **代价与已知短板**:截图-动作回路**慢且脆**;复杂结账(CAPTCHA、复杂 JS、会话管理)成功率偏低(据外部报道,旗舰用例真实站点成功率曾 <50%,未经 OpenAI 官方确认),这也是独立 Operator 被并回 ChatGPT 的一个原因。选它主要因为**通用性 + OpenAI 生态(Responses API / Agents SDK / ChatGPT 集成)**,而非当下的稳态可靠性。

---

## 7. 采用度信号

- **`openai/openai-cua-sample-app`(MIT,官方开发者示例)**:约 **1,743 stars / 425 forks**(2026-07-04 GitHub API 实测),创建于 2025-03-11,2026-03-30 仍有推送;2026-03 重写为 TypeScript 版并默认 `gpt-5.4`,原 Python 版保留在 `v1` 分支。注意这是示例仓库,**star 数不代表产品装机量**。
- **产品分发**:Operator 起初仅限**美国 ChatGPT Pro**;并入 ChatGPT Agent 后逐步开放到 **Plus / Pro / Team / Enterprise**(Enterprise 需管理员启用)。具体活跃用户数**未找到公开数据**。
- **生态与合作方**:发布时点名合作 **DoorDash、Instacart、OpenTable、Priceline、StubHub、Thumbtack、Uber** 等,以贴合真实场景与站点规范。
- **平台落地**:computer use 能力也经 **Azure OpenAI** 提供(Microsoft Learn 有 Computer Use 文档),说明已进入企业云渠道。
- **势头**:标志性事件是 2025-07 从「独立产品」收敛为「ChatGPT 内的一种 agent 模式」——即**从单点产品走向平台化默认能力**;模型谱系持续升级(4o→o3→gpt-5.4)显示仍在活跃投入。

---

## 8. 来源

1. OpenAI — Computer-Using Agent(CUA 模型与基准):https://openai.com/index/computer-using-agent/
2. OpenAI — Introducing Operator(产品发布,2025-01-23):https://openai.com/index/introducing-operator/
3. OpenAI — Introducing ChatGPT agent(2025-07-17,并入/虚拟计算机/工具集):https://openai.com/index/introducing-chatgpt-agent/
4. OpenAI — Addendum: o3 Operator(模型从 4o 升级到 o3):https://openai.com/index/o3-o4-mini-system-card-addendum-operator-o3/
5. GitHub — `openai/openai-cua-sample-app`(MIT 官方示例;`main`=TS/gpt-5.4,`v1`=Python/computer-use-preview):https://github.com/openai/openai-cua-sample-app
6. GitHub 源码 — `simple_cua_loop.py`(v1,原始 CUA loop 实现,§4 依据):https://github.com/openai/openai-cua-sample-app/blob/v1/simple_cua_loop.py
7. OpenAI Developers — Computer use 工具指南(computer_call / 安全检查 / Playwright 集成):https://developers.openai.com/api/docs/guides/tools-computer-use
8. Presenc AI — Operator→ChatGPT Agent 时间线追踪(2025-08-31 停用、2026 现状,二手佐证):https://presenc.ai/research/openai-operator-update-tracker-2026

---

### 核实与不确定标注
- **已核实**:仓库 star/fork/许可/推送时间与分支结构(GitHub API 实测);CUA loop 代码结构与字段名(直接读 v1 源码);动作空间、`Computer` 环境列表、安全检查字段(官方 README/源码);发布/并入/停用日期(多来源一致);模型谱系 4o→o3(官方 addendum);`main` 分支改为 TS + `gpt-5.4`(实测 README/分支)。
- **来自二手/未经 OpenAI 官方逐字确认**:独立 Operator 结账成功率「<50%」及停用「因可靠性缺口」的归因(外部报道);2025-08-31 精确停用日期(以追踪站为准)。已在正文显式标注。
- **未找到公开数据**:Operator/ChatGPT Agent 的活跃用户或使用量;`gpt-5.4` computer-use 模型的官方基准数字。
- **注意**:OpenAI 官方 `openai.com` 与 `developers.openai.com` 页面对自动抓取返回 403,§1–§6 的官方细节以「搜索引擎返回的官方页面摘要 + GitHub 一手源码」交叉核对得到;computer use API 指南的字段细节以官方源码(§4 依据的 `simple_cua_loop.py`)为准绳校验,避免抓取摘要幻觉。
