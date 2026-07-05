# Perplexity 拆解简报

> 事实底稿快照:2026 年年中(2026-07)。只写可溯源断言;估算/未证实处显式标注。

## 1. 一句话定位

**Perplexity** 是一个「answer engine(带引用的实时搜索问答)+ agentic 研究/任务执行 + agentic 浏览器」的产品栈,核心卖点是把「LLM + 实时 web 检索 + 引用锚定」缝合成一个可回答、可执行任务的回路。

- **出品方**:Perplexity AI, Inc.(旧金山,创始人 Aravind Srinivas / Denis Yarats 等)。
- **许可**:**闭源商业产品**。消费端有免费 / Pro / Max 分层订阅;开发者侧是收费 API(Sonar API + Agent API)。其自研 `Sonar` 模型据 Perplexity 官方说明**基于 Meta Llama 3.3 70B 再训练**(Llama 社区许可),但 Perplexity **未开源** Sonar 权重或 Deep Research/Comet 的编排代码。
- **2026 年状态**:**高度活跃、快速扩张**。未改名、未被收购、未停更。近一年重大动作:Deep Research(2025-02)、Sonar 自研模型(2025-02)、Comet 浏览器(2025-07 桌面→2025-10 全球免费→2025-11 Android→2026-03 iOS/企业版)、Agent API(2026-03)、"Computer" 多模型编排 + Deep Research 2.0(2026-02 前后)。融资/估值信号见 §7。

## 2. 解决什么问题 / 在 agent 技术栈的位置

**问题**:传统搜索给链接、传统聊天 LLM 会幻觉且知识过期。Perplexity 要给「带引用、可核查、可执行多步任务」的答案。

**技术栈位置**:Perplexity 横跨多层,不是单一层——这是理解它的关键。

| 层 | Perplexity 的构件 |
|---|---|
| 基础模型 | 自研 `Sonar`(Llama 3.3 70B 再训练);同时代理第三方前沿模型(GPT / Claude / Gemini / Grok) |
| 推理基础设施 | 与 **Cerebras** 合作,用 WSE-3 晶圆级引擎跑 Sonar,官方称约 **1200 tokens/s** 解码 |
| Harness / 编排 | Deep Research 的迭代 search-read-reason 回路;"Computer" 多模型子任务路由;Comet 的 agent loop |
| 平台 / API | Sonar API(问答级)、Agent API(2026-03,自称"managed runtime for agentic workflows") |
| 产品 | 消费级 answer engine、Comet 浏览器、Pages/报告导出 |

**与底层 LLM 的关系**:Perplexity **既是模型厂**(Sonar)**又是模型路由器/编排层**。默认搜索走 Sonar;Deep Research 2.0 / Computer / Agent API 则是**模型无关**的编排层,把子任务派给最合适的前沿模型(见 §4/§5)。

## 3. 架构与核心组件(点名真实构件)

分三条产品线,各有独立 harness:

### A. Deep Research(研究回路)
- 官方描述:"iteratively searches, reads documents, and reasons about what to do next, refining its research plan"。
- 底层模型 `sonar-deep-research`(API 名);官方称其构建在 Sonar 架构上。
- 2026 的 **Deep Research 2.0 / "Computer"** 引入两个具名构件:
  - **Search as Code** —— 模型写代码来"组装搜索本身",从而并行跑数千个检索步骤。
  - **多模型子任务路由** —— 把研究拆成子任务,按专长派给 20+ 前沿模型(法律推理模型审合同、数据模型核算表格、写作模型出稿);核心 reasoning engine 用 Claude Opus 4.6(据 MarkTechPost 报道)。

### B. Comet 浏览器(agentic browser,逆向工程可见构件)
基于 **Chromium**。据 Zenity Labs 逆向报告,由四部分组成:
- **Perplexity API Backend** —— LLM 在此规划任务。
- **Sidecar / SPA** —— 右侧边栏 UI(`perplexity.ai/sidecar`)。
- **三个 Chrome 扩展**:
  - `comet-agent`(`agents.crx`):~700KB service worker,实现完整 RPC 系统,`dispatchRpcRequest` 路由后端指令。
  - `Comet`(`perplexity.crx`):浏览器侧编排层,管 tab 生命周期、PDF 解析。
  - `Comet Web Resources`(`comet_web_resources.crx`):静态资源可访问性。
- **双通道通信**:SSE 流(`/rest/sse/perplexity_ask`,推理/token/引用)+ WebSocket(`wss://www.perplexity.ai/agent`,浏览器自动化)。
- **安全边界函数**:`isInternalPage`(挡 `chrome://settings` 等)、`isUrlBlocked`(挡 `file://`、黑名单域)。

### C. Agent API(2026-03,开发者编排运行时)
- 单端点 `POST https://api.perplexity.ai/v1/agent`。
- 内置工具:`web_search`、`fetch_url`、`finance_search`。
- **presets** 机制:预配置好模型+system 指令+token 上限+工具(如 `pro-search`、`advanced-deep-research`)。
- 官方自称替代:model router + search layer + embeddings provider + sandbox service + monitoring stack。

## 4. 一步步怎么运转(控制/编排回路)——本节最详

### 回路 A:Deep Research 一次请求的生命周期
1. **意图展开**:用户提交复杂问题;系统把 intent 展开为**研究计划 + 子查询集**。
2. **并行检索**:对数十个 web 搜索并行发起(2.0 里由"Search as Code"生成代码,跑数千并行检索步)。
3. **读 + 抽取证据**:读取可达上百个源文档,做抽取式证据选择 + 重排(rerank)。
4. **推理并决定下一步**:对已读内容 reason,**动态改写研究计划**(这是"迭代"而非一次性 RAG 的关键)——回到步骤 2 继续,直到覆盖足够。
5. **合成 + 引用锚定**:把证据 condition 进生成模型,产出结构化、**每条断言带引用**的报告。
6. **交付**:2–4 分钟内完成(官方"most tasks under 3 min");可导出 PDF 或转成 Perplexity Pages。

> 注:上面"子查询展开→并行多跳检索→抽取/重排→引用感知生成"的 pipeline 描述,部分来自第三方技术解读(架构镜像现代 RAG 最佳实践);Perplexity 官方原文措辞为迭代 search/read/reason + 精炼 research plan。二者一致但**颗粒度上第三方补充的重排/抽取细节非官方逐字**,已标注。

### 回路 B:Deep Research 2.0 / "Computer" 的多模型编排
1. 复杂问题 → 拆成子任务。
2. **按专长把子任务路由给 20+ 前沿模型**(不同模型干不同活)。
3. Search as Code 并行跑检索;接入 PitchBook / CB Insights 等付费源。
4. 各子结果汇总,由核心 reasoning engine(报道称 Opus 4.6)合成。
5. 输出为 report / deck / live spreadsheet,Computer **直接读写文件**(而非在旁边生成)。

### 回路 C:Comet agentic loop(逆向可见,最"能据此讲课")
1. 用户在 Sidecar 输入指令(如"去 HN 点开头条")。
2. 前端打开 **SSE 流**(`/rest/sse/perplexity_ask`),后端 LLM 开始 reason,token 实时回流边栏。
3. 后端决定需要动作 → SSE 消息里带 **`entropy_request`**(含 `base_url` 指向 `wss://.../agent`)。
4. Sidecar 拆包 `entropy_request` → 转发给 `comet-agent` 扩展。
5. 建立 **WebSocket** 连接,扩展执行细粒度动作:
   - **`ReadPage`**:调 `chrome.debugger` 的 `Accessibility.getFullAXTree`,把页面变成 **YAML 格式的可访问性树**(带 reference ID)给模型"看"。
   - **`GetPageText`**:HTML→markdown。
   - **`Navigate` / `FormInput`(按 node 引用填值) / `ComputerBatch`(原始像素坐标序列点击) / `TabsCreate` / `CreateSubagent`(派生嵌套子任务)**。
6. 动作结果经 WebSocket 回传;SSE 继续,模型合成最终答复;流关闭。

> 高层工具经 SSE 的 `browser_tool` 暴露:`BROWSER_OPEN_TAB`、`BROWSER_CLOSE_TABS`、`BROWSER_GROUP_TABS`、`GET_URL_CONTENT`、`ENTROPY_REQUEST`。

### 回路 D:Agent API 单请求
模型看 input + 可用工具 → 决定是否调 `web_search`/`fetch_url` → 执行 → 合成答案。`output` 数组同时含工具结果(`search_results`/`fetch_url_results`)和最终 `message`。**单请求内完成一轮 tool-calling**;跨轮 agent loop 需开发者用后续请求串接(传 previous response id / 上下文)。

## 5. Harness 层设计

- **上下文/记忆管理**:Sonar 系模型上下文窗口——`sonar` 128k、`sonar-pro` 200k、`sonar-reasoning-pro` / `sonar-deep-research` 128k(第三方汇总,非官方 docs 逐字,已标注)。Comet 官方称"跨会话维持 context"。Deep Research 的"记忆"本质是**迭代过程中动态维护的研究计划 + 已读证据集**,而非长期记忆库。
- **工具接口**:API 侧是声明式 `tools=[{"type": "web_search"|"fetch_url"|"finance_search"}]`,`web_search` 支持域名 allow/deny(≤20 域)、recency、date-range、语言、每页内容预算。Comet 侧是 RPC + WebSocket 的浏览器动作集(§4C)。
- **规划**:Deep Research 显式"formulates a research plan"并迭代精炼;Computer 用子任务拆分 + Search as Code。
- **多 agent 交接**:Comet 有 `CreateSubagent` 派生嵌套子任务;Computer 有跨 20+ 模型的子任务路由(Model Council 变体:同一 query 并发派给 Claude Opus 4.6 / GPT-5.2 / Gemini 3 Pro 再合成异同,据报道)。
- **人在环**:Comet 是交互式边栏,用户可中途看推理、介入;Deep Research 基本是一次性长回合(low HITL)。
- **沙箱/安全**:Comet 靠 `isInternalPage`/`isUrlBlocked` 做硬边界;Agent API 官方称内置 sandbox service。**但**:Brave 安全团队(2025-08 起)公开了 Comet 的**间接 prompt injection** 漏洞——"Summarize this webpage" 会把不可信页面内容直喂 LLM 不做指令/内容区分,隐藏 HTML 甚至截图内近隐形文字可被当成命令执行,以用户已认证权限跨域行动;Brave 称截至披露 Perplexity 尚未完全缓解。这是 agentic 浏览器 harness 的**结构性风险点**,讲课可作反面案例。

## 6. 与同类相比的独特设计取舍

- **引用优先 answer engine 定位**:相对 ChatGPT/Gemini,Perplexity 从第一天就把"每条断言带来源"作为产品核心而非可选项。
- **自研模型 + 极速推理**:Sonar(Llama 3.3 70B 再训练)+ Cerebras WSE-3 ≈ 1200 tok/s,官方称约为 Gemini 2.0 Flash 的 ~10×,牺牲"最强通用能力"换"搜索场景下够好且极快"。
- **Deep Research 走"快而免费"路线**:2–4 分钟(对手 5–30 分钟),Humanity's Last Exam 21.1%(2025-02 发布时超 Gemini Thinking/o3-mini/o1/DeepSeek-R1)、SimpleQA 93.9%;2.0 进一步到 BrowseComp 40.7%→83.8%、HLE 36.4%→50.5%(据报道)。
- **模型无关编排**:Agent API / Computer 把自己定位成"你不用自建 model router+search+sandbox+monitoring 的一站式 runtime",赌注在"编排层"而非"最强单模型"。
- **agentic 浏览器 = agent 经济入口**:押注 Comet 作为"帮你在真实网页上做事"的执行面,取舍是**放大了 prompt injection 攻击面**(§5)。

## 7. 采用度信号

- **GitHub star**:Perplexity 核心产品/编排代码**未开源,无对应官方主仓 star 数**——未找到公开数据。生态里有第三方封装(如 `hex/llm-perplexity`),但非官方且规模小,不能代表采用度。
- **用户/流量**:约 **45M 用户**(据第三方统计站,2025 末;非官方财报),月访问约 170M;月查询 2025-05 约 **780M**(对比 2024 中约 230M)。**以上均来自第三方统计聚合站,非 Perplexity 官方披露,数值有出入,视为估算。**
- **收入**:ARR 报道从 2025 末 ~$148–200M 到 2026 ~$450M 不等——**第三方口径分歧大,标注为估算**。
- **估值/融资**:2026 年初 Series E-6 后估值报道约 **$21–23B**;2026-06 另有为 Comet 融 ~$200M 报道。**均为媒体报道,非官方确认,估算。**
- **知名信号**:与 Cerebras 的推理合作有双方新闻稿背书(较硬);Comet 企业版 2026-03 上线;"Computer for Counsel"(法律)垂直化。

## 8. 来源

1. Perplexity 官方 Sonar 模型文档(模型分层/用途): https://docs.perplexity.ai/docs/sonar/models
2. Perplexity 官方 Agent API quickstart(端点/工具/preset/请求响应形): https://docs.perplexity.ai/docs/agent-api/quickstart
3. Cerebras 新闻稿(Sonar 推理:1200 tok/s、WSE-3、CTO Denis Yarats 引用): https://www.cerebras.ai/press-release/cerebras-powers-perplexity-sonar-with-industrys-fastest-ai-inference
4. Zenity Labs — Comet 逆向工程(SSE/WebSocket、entropy_request、comet-agent、ReadPage/AX tree、动作集): https://labs.zenity.io/p/perplexity-comet-a-reversing-story
5. Brave 安全博客 — Comet 间接 prompt injection 漏洞: https://brave.com/blog/comet-prompt-injection/
6. MarkTechPost — Deep Research 2.0 / "Computer" 20+ 模型路由、Search as Code、基准提升: https://www.marktechpost.com/2026/06/11/perplexity-moves-deep-research-into-computer-routing-research-subtasks-across-20-frontier-models-for-reports-decks-and-dashboards/
7. Perplexity 官方(转载/引述)Deep Research 发布 — HLE 21.1%、SimpleQA 93.9%、2–4 min: https://justainews.com/companies/perplexity/meet-perplexity-deep-research/ (原文 https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research 抓取返回 403)
8. Perplexity 官方 Comet 发布博客: https://www.perplexity.ai/hub/blog/introducing-comet

### 未能核实 / 缺口
- Perplexity 官方 hub 博客(Deep Research、meet-new-sonar、Agent API、Comet)多数返回 **HTTP 403**,相关官方逐字表述改用官方新闻稿/官方转载/一手逆向报告佐证,已在正文标注。
- Sonar 各模型**上下文窗口具体数值**、Deep Research 免费/Pro **每日查询限额**仅见第三方汇总,未在官方 docs 逐字核实,已标注为估算。
- 用户数 / ARR / 估值均来自第三方统计站与媒体,**无官方财报**,数值分歧大,一律标注估算。
- GitHub star:核心产品闭源,**未找到公开数据**。
