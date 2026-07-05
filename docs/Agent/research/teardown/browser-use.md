# browser-use 拆解简报

> 事实底稿快照:2026 年年中(2026-07)。仓库数据经 GitHub API 直接核验;带「估算/未核实」标注处均为无法溯源的断言。

---

## 1. 一句话定位 / 出品方 / 许可 / 2026 状态

**定位**:browser-use 是一个开源 Python agent 框架,让 LLM 操控真实浏览器完成网页任务。核心思路是把网页界面**转成结构化文本 + 带索引的可交互元素清单**喂给 LLM,而不是主要依赖截图视觉(README slogan:"🌐 Make websites accessible for AI agents. Automate tasks online with ease.")。

- **出品方**:Browser Use(公司同名),总部旧金山。创始人 **Magnus Müller** 与 **Gregor Žunič(Zunic)**,起源于 2024 年 ETH Zurich 的 Student Project House;YC Winter 2025 batch。
- **许可**:**MIT**(开源库);另有闭源商业云平台 Browser Use Cloud。
- **2026 状态:高度活跃,未停更、未改名、未被收购**。已完成 $17M 种子轮(2025-03,Felicis Ventures 领投)。经 GitHub API 核验(2026-07-03):**102,615 star / 11,369 fork / 281 open issues**,最新 release **0.13.3(2026-07-01)**,`pushed_at` 为 2026-07-03——每日级活跃提交。130+ releases,2.7k dependents(README/仓库页数据)。

---

## 2. 解决什么问题 / 技术栈位置 / 与 LLM 的关系

**问题**:让 agent 可靠、廉价地操作任意网站(登录、填表、抓数据、QA 测试、CRM 集成等)。创始人明确反对纯视觉路线:Müller 称"很多 agent 依赖视觉系统……东西就崩了。我们把网页转成 agent 能理解的东西"。官方种子轮博文也说纯视觉自动化"slow, expensive, and unreliable",他们改为"convert website interfaces into structured text"。

**技术栈位置**:它是一个 **agent + harness 一体的编排框架/库**,不是底层模型也不是纯基础设施:
- **向上**:接一个 LLM(自带或第三方),对外暴露 `Agent(task=..., llm=...)` 高层 API。
- **向下**:自己实现浏览器控制层(CDP)、DOM 提取、动作执行——即它**自带 harness**,不依赖外部 agent runtime。
- **旁边**:另有 **Browser Use Cloud**(基础设施平台:托管浏览器、代理轮换、隐身指纹、并行执行、1000+ 集成),这是把框架产品化的商业层。

**与 LLM 的关系**:模型可插拔。框架负责"感知(DOM→文本)+ 编排(循环/记忆/动作执行)",LLM 只负责"看当前状态→决定下一步动作(结构化输出)"。支持 `ChatBrowserUse`(自研、针对浏览器任务优化的模型,走 provider 前缀 ID)、`ChatOpenAI`、`ChatAnthropic`、`ChatGoogle`(Gemini)、Ollama 本地模型;统一抽象为 `BaseChatModel`。

---

## 3. 架构与核心组件(点名真实构件)

据官方文档、AGENTS.md 与 DeepWiki 代码索引,五大子系统:

1. **Agent 系统**——`Agent` 类是主编排器,驱动迭代循环;`MessageManager` 负责把浏览器状态 + 历史拼成 prompt;`AgentHistoryList` 承载执行历史(`urls()`、`action_names()`、`errors()`、`model_thoughts()`→`AgentBrain` 等)。
2. **LLM 集成层**——`BaseChatModel` 抽象统一各家 provider;`ChatBrowserUse` 为自研模型 wrapper。
3. **Tools / Controller 注册表**——`Controller`(向后兼容别名 `Tools`)。用 `@tools.action(...)` 装饰器注册自定义动作;**按参数名注入**(工具函数声明 `browser_session: BrowserSession` 就自动拿到会话);动作返回 `ActionResult`(字段:`extracted_content`、`long_term_memory`、`error`、`is_done`、`success`、`attachments`)。
4. **DOM 处理引擎**——`DomService` 构建语义化 DOM 树;`DOMTreeSerializer` 序列化;`ClickableElementDetector`(`browser_use/dom/serializer/clickable_elements.py`)识别可交互元素;`DOMSelectorMap` 把稳定整数索引映射到 `EnhancedDOMTreeNode`。
5. **浏览器控制层**——`BrowserSession`(别名 `Browser`)管理浏览器 target 生命周期,**纯 CDP(Chrome DevTools Protocol)** 通信;`SessionManager` 管 CDP target;支持 `cdp_url` 连远程浏览器、`use_cloud=True` 走云。

**事件驱动内核**:2025-08 从 Playwright 迁移到裸 CDP 后,引入**事件总线 + watchdog 架构**。事件总线是自研库 **bubus**(github.com/browser-use/bubus);各 watchdog(如 `downloads_watchdog`、`crash_watchdog.py`)订阅 CDP 事件、扩展功能而不改核心("Watchdogs extend functionality without modifying core")。

---

## 4. 一步步怎么运转(控制/编排回路)——**本节最重要**

用户调用 `Agent(task="...", llm=...).run()` 后,进入迭代 **step 循环**(每一步 = 观察→思考→动作→执行→更新):

1. **观察 / 建状态**:`DomService` 通过 CDP 抓当前页 DOM,`ClickableElementDetector` 用四档启发式挑出可交互元素:
   - (a) 原生标签 `button/input/select/textarea/a/details/summary`(显式排除 `label` 防重复触发);
   - (b) JS 监听器——`has_js_click_listener`,由 `DomService` 经 CDP `getEventListeners` 探测 `click/mousedown/mouseup`;
   - (c) ARIA 角色/属性(`button/link/menuitem/checkbox/tab`、`aria-checked/aria-expanded` 等;排除 `aria-disabled=true`、`aria-hidden=true`);
   - (d) 表单控件后代(`has_form_control_descendant`,向下最多 2 层)。
2. **建索引**:`_assign_interactive_indices_and_mark_new_nodes` 给可见的可交互节点分配**顺序整数**,写入 `DOMSelectorMap`(整数 ID → `EnhancedDOMTreeNode`)。这样 LLM 只需说"click element 42",无需 XPath/坐标。多趟序列化用 `_clickable_cache` 提速。
3. **可选视觉**:`use_vision`(默认 `"auto"`)——auto 只在需要时给截图(视口截图转 base64),`True` 每步都给,`False` 全不给;粒度由 `vision_detail_level`(low/high/auto)控制。**DOM 文本是主输入,视觉是补充**。
4. **组 prompt**:`MessageManager` 把 [系统提示 + 任务 + 序列化 DOM(带索引清单)+ (可选)截图 + 历史] 拼成消息。历史窗口由 `max_history_items` 控(`None`=全留);`use_thinking`(默认 `True`)决定是否走内部推理步。
5. **调 LLM**:`BaseChatModel` 调所选模型,要求**结构化输出**——AgentBrain(思考)+ 一批动作。`page_extraction_llm` 可指定一个更轻的模型专做 DOM 文本抽取。
6. **一步多动作**:单步最多输出 `max_actions_per_step`(默认 **4**)个动作(如一次填 4 个表单字段),批量执行以省往返;但页面一变化就停下重新观察。
7. **执行动作**:`Controller/Tools` 把动作(click/type/navigate/…)解析,`DOMSelectorMap` 把整数索引解析回 `target_id` + `backend_node_id`,经 CDP 执行;返回 `ActionResult`。期间 watchdog(下载、崩溃等)通过 bubus 事件总线异步响应。
8. **更新与判停**:结果写进 `AgentHistoryList`;若某动作 `is_done=True` 或达到 `max_steps` 则结束。
9. **容错**:单步失败重试上限 `max_failures`(默认 **3**);LLM 侧限流/鉴权/5xx 会重试(约 5 次)后切 `fallback_llm`;`final_response_after_failure`(默认 `True`)在超阈值后再喂一次中间结果逼出最终回答;超时由 `llm_timeout`(90s)、`step_timeout`(120s)守护。
10. **回环**:回到步骤 1,直到完成或耗尽预算。`AgentHistoryList` 可回放 URL、动作名、思考、截图路径。

---

## 5. harness 层设计

- **上下文/记忆管理**:短期靠 `MessageManager` + `max_history_items` 滚动窗口;`ActionResult.long_term_memory` 字段允许动作把要点写入长期记忆(区别于一次性的 `extracted_content`)。`save_conversation_path` 落盘完整对话。云平台额外提供"持久文件系统 + 记忆"。
- **工具接口**:装饰器注册 `@tools.action(...)` + 按参数名依赖注入 + Pydantic 参数校验;`output_model_schema` 可强制最终输出为指定 Pydantic 模型(结构化产出)。
- **规划**:文档暴露 `use_thinking` 内部推理与(历史版本中的)独立 planner 参数;`page_extraction_llm` 实现"抽取用小模型、决策用大模型"的分工。(注:独立 `planner_llm`/`planner_interval` 在早期文档出现过,当前主推 thinking + flash_mode 路径——**是否仍为一等参数未逐版核实**。)
- **多 agent 交接**:核心库主打**单 agent 循环**;并行/多任务主要由 **Browser Use Cloud** 的"high-performance parallel execution"承担。**框架内是否有正式的 multi-agent handoff 原语,未找到明确一手文档确认**。
- **人在环 (HITL)**:通过 `sensitive_data`(敏感数据字典,做占位/脱敏)、`available_file_paths`(文件白名单)、`BrowserProfile` 的域名过滤等做边界控制;云平台有 CAPTCHA 求解。**是否有内置"暂停等人确认"的一等 HITL 机制,未找到确切一手来源**。
- **沙箱**:开源侧靠 `BrowserProfile`(headless、域名过滤)+ CDP 会话隔离 + 文件白名单;真正的沙箱化由云平台(Stealth Browsers、隔离浏览器基础设施、代理轮换、指纹)提供。

---

## 6. 与同类相比的独特取舍

- **DOM-first,而非视觉-first**:把 DOM 序列化成带整数索引的元素清单是其招牌取舍。好处:更快、更便宜、更可靠、可用任意会 function-calling 的 LLM;代价:重排版/canvas/纯视觉布局信息弱,故保留 `use_vision="auto"` 作补充。对比 OpenAI Operator / 纯 computer-use 视觉路线,这是差异化根基。
- **裸 CDP 而非 Playwright 适配层**(2025-08 迁移):去掉 Playwright 依赖,直接说浏览器母语——元素提取/截图/动作全部提速,支持跨源 iframe 和异步事件响应;换来事件驱动 + watchdog 架构。
- **开源 + MIT + Python 原生**:低门槛、可改可嵌,是它对比闭源 Operator 的核心卖点;也因此被 Manus 等产品直接拿去用。
- **"直接给 Python 控制权"的 CLI 3.0 / Browser Harness** 路线:相较更高度封装的 Stagehand(Browserbase)让开发者选"哪些用代码、哪些用自然语言",browser-use 走"薄而可编辑的 harness + 直接 Python/CDP 控制"。选它的人通常要**开源可控 + DOM 可靠性 + 模型无关**。

---

## 7. 采用度信号

- **GitHub star**:**102,615(2026-07-03,GitHub API 直接核验)**;fork 11,369。README 页显示的 103k 与之一致。(注:某第三方博客称"81k / 2026-04"——与官方 API 曲线不符,**以 API 数据为准,该二手数字疑为过时或口径不同**。)YC 主页曾以"50k stars in 3 months"宣传早期势头。
- **融资**:$17M 种子轮(2025-03,Felicis 领投;A Capital、Nexus、YC、SV Angel、Pioneer Fund、Paul Graham、Liquid2 等跟投)。
- **知名用户**:TechCrunch 报道称同批 YC 有 20+ 公司在用;二手来源(Tracxn/Crunchbase 类)列举 Airbnb、Amazon、Anthropic 等"大厂工程团队",**但这些为聚合数据库口径,未见官方逐一背书,标注为未完全核实**。中国创业公司 **Manus**(Butterfly Effect)走红时被曝基于 browser-use。
- **性能基准**:官方 SOTA 技术报告称 WebVoyager **89.1% 成功率(586 任务)**;但 2026 年竞品(如 Magnitude 宣称 93.9%)已反超,且各家任务集不同不可直接横比——**基准领先性已非独占**。BU 2.0 模型据二手来源称较 1.0 提升约 12% 准确率(2026-01,**未见一手 release note 直接核实**)。

---

## 8. 来源(一手优先)

1. GitHub 仓库(README、releases、star/fork,API 核验):https://github.com/browser-use/browser-use
2. 官方 Agent 全参数文档(循环/记忆/工具/视觉参数与默认值):https://docs.browser-use.com/customize/agent/all-parameters
3. 官方博文《Closer to the Metal: Leaving Playwright for CDP》(CDP 迁移 + watchdog + bubus):https://browser-use.com/posts/playwright-to-cdp
4. 官方种子轮博文《We Raised $17M …》(融资/愿景/早期采用):https://browser-use.com/posts/seed-round
5. 官方 SOTA 技术报告(WebVoyager 89.1%):https://browser-use.com/posts/sota-technical-report
6. DeepWiki 代码索引 · 交互元素检测(ClickableElementDetector / DOMSelectorMap / DomService,含文件路径):https://deepwiki.com/browser-use/browser-use/5.3-interactive-element-detection
7. AGENTS.md(内部类/别名/ActionResult 字段/CDP):https://github.com/browser-use/browser-use/blob/main/AGENTS.md
8. TechCrunch 报道(创始人原话、竞品 Operator/Manus、YC 采用):https://techcrunch.com/2025/03/23/browser-use-the-tool-making-it-easier-for-ai-agents-to-navigate-websites-raises-17m/
