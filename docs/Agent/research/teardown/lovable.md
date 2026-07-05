# Lovable 事实底稿（快照:2026 年年中）

> 定位一句话:**Lovable 是一个用自然语言造全栈 web app 的「vibe-coding 平台」——它不是一个 agent 库,而是把一套围绕 Anthropic Claude 的 agent harness + 托管执行/部署基础设施打包成产品的闭源 SaaS。**

标注约定:凡写「未找到公开数据」即检索未得一手来源;凡写「(推断)」为基于材料的合理推断而非厂商明述;模型版本等易变事实均注明来源时点。

---

## 1. 定位 / 出品方 / 许可 / 2026 状态

- **出品方**:Lovable(公司名 Lovable),总部瑞典斯德哥尔摩。创始人 **Anton Osika**(CEO)与 **Fabian Hedin**,公司 2023 年成立。[Wikipedia]
- **前身**:Osika 2023 年 6 月做的开源项目 **GPT Engineer**(CLI codegen 工具,MIT 许可),曾是 GitHub 史上增长最快的仓库之一。其后商业化为 "GPT Engineer App",2024 年春/夏两次以该名发布均未起量;**2024 年 12 月改名 Lovable** 后开放访问,2024-11-21 同时登顶 Product Hunt 与 Hacker News。[Wikipedia; Contrary Research]
- **许可**:**产品本体闭源**(专有 SaaS)。开源的只有前身 `AntonOsika/gpt-engineer`(MIT,**已于 2026-04-22 归档为只读**,55.2k star / 7.3k fork,截至 2026-07 抓取)。Lovable 平台本身未开源。[GitHub; 抓取时点 2026-07]
- **2026 年状态:活跃、独立、增长极快**。
  - 融资:2025-02 A 轮 2 亿美元(Accel 领投),估值 18 亿;2025-12 B 轮 3.3 亿美元(CapitalG、Menlo Ventures 领投;NVIDIA/NVentures、Salesforce、Databricks、Khosla、DST、EQT、Accel、Creandum 等跟投),估值 **66 亿美元**。累计约 5.5 亿美元。[TechCrunch; Menlo; Wikipedia]
  - ARR:2025-11 达 **2 亿美元 ARR**;第三方称 2026 约 5 亿 ARR(**第三方口径,未经官方确认**)。[Wikipedia; getlatka——存疑]
  - 规模:官方称约 **8 百万用户**、**120 名员工**(2026-06 Wikipedia 时点);日新建约 10 万项目,首年累计 2500 万+ 项目。[Wikipedia; Lovable Series B blog]

## 2. 解决什么问题 / 在 agent 栈里的位置 / 与底层 LLM 的关系

- **问题**:让非技术用户用聊天造出可上线的全栈 web app——前端 UI、数据库、鉴权、支付、部署一条龙,无需接触代码。
- **栈内位置**:**平台 + agent harness + 托管基础设施三合一**,不是编排框架也不是模型。它自己**不训练模型**;推理全部调用 **Anthropic Claude API**(官方客户案例)。[Anthropic case study]
- **与 LLM 的关系**:Lovable = harness(编排/上下文/工具/验证)+ 托管运行时(浏览器沙箱 + Supabase 后端 + CDN 部署)。模型是可替换的「大脑」,Lovable 的护城河在其外围的 harness 与执行/部署闭环。厂商明述随每次 Claude 新版做回归评测再切换。[Anthropic case study]
- **底层模型(2026 快照,注意时点)**:官方案例把 **Claude Sonnet 3.5** 称为「第一个让 agent 真正работает 的模型」,把 **Claude Opus 4.5** 称为「长时程任务可靠性的又一次阶跃」。[Anthropic case study] 第三方技术拆解描述其**分层路由**:**Haiku 4.x** 做路由/选文件、**Sonnet** 做大部分生成、**Opus** 做复杂多文件重构(**此路由细节为第三方拆解,非官方明述**)。Opus/Sonnet 具 1M 上下文、Haiku 200K 为 Anthropic 通用规格。[Sarthak Substack——secondary; Anthropic 模型文档]

## 3. 架构与核心组件

来自官方案例的**一手骨架**:「a harness around a main agent that can use subagents to orchestrate tasks effectively, with the right models at each step」。[Anthropic case study]

- **Harness(外壳)**:围绕主 agent,负责上下文注入、工具调度、验证、模型路由。
- **Main agent(主 agent)**:对整个 build 做推理,把小块工作分派给 subagent。
- **Subagents(子 agent)**:承接细粒度子任务,每个子任务匹配到最合适的 Claude 模型。
- **模型路由器**:按「用能可靠解决子问题的最便宜模型」原则,把路由/选文件交给廉价模型,把生成交给强模型,把验证交给**非 LLM 的确定性工具**。[Sarthak——secondary]
- **结构化 JSON 输出层**:生成结果不是自由文本,而是围绕编排层设计的 JSON schema——直接指明写哪些文件、跑哪些 SQL、部署哪些 edge function。这让多文件编辑可靠、确定。[Sarthak——secondary]
- **验证/自纠工具(确定性,非 LLM)**:真实浏览器测试(虚拟环境点击/填表/截图)、前端测试(Vitest + React Testing Library)、edge function 直接调用测试。[Sarthak——secondary]
- **记忆层 = Git**:每次 agent 编辑 = 一个原子 commit(`agent: <summary>`),天然获得原子性/可回滚/语义历史。[Sarthak——secondary]
- **托管执行/部署基础设施**:前端 = `src/` 打包成静态 SPA,经 CDN(HTTPS/Let's Encrypt)托管在 `*.lovable.app` 子域;后端 = **Supabase**(Postgres + Auth + Storage + Deno edge functions + Realtime),无独立 Express/Next 服务器。[ml6; vibe-eval; lowcode]
- **对外接口 = Lovable MCP server**(`https://mcp.lovable.dev`,OAuth):让 ChatGPT / Claude / Claude Code / Cursor / VS Code 通过 MCP 创建/部署/remix 项目、向项目 agent 发消息、读 diff/文件/历史、开数据库/跑 SQL、配置工作区规则、读访问分析。[docs.lovable.dev]

## 4. 一步步怎么运转(控制/编排回路)——最重要

一次用户请求实际流经的回路(综合官方案例 + 第三方逆向拆解;**标注处为 secondary**):

1. **入口 & 模式选择**。三种模式:**Chat/Plan Mode**(对话式规划,LLM 推理、追问、产出 `.lovable/plan.md` 计划文档后**等人批准**);**Agent Mode**(自主执行);**Visual Edits**(类 Figma,点选直接改 UI,不走 prompt)。[UrApp; Sarthak——secondary]
2. **规划(Plan)**。Plan Mode 只推理不改码,产出高层方案(组件、决策、实现顺序)写入 `.lovable/plan.md`;**用户批准后**才进入执行 = 人在环 checkpoint。[Sarthak——secondary]
3. **上下文组装(三层)**。Harness 注入:**Workspace Knowledge**(工作区级规则,≤10,000 字符,恒注入)+ **Project Knowledge**(项目级,恒注入,冲突时覆盖工作区)+ **Skills**(按需加载的 MD playbook,靠相关性匹配)。理由:LLM 遇无关上下文表现变差。[Sarthak——secondary]
4. **两阶段选文件检索**(不喂整仓库)。Stage 1:建轻量索引(文件路径、导出、摘要),用**廉价模型(Haiku)预筛**相关文件;Stage 2:只把选中的文件全文喂给生成模型。原则:「更多上下文≠更好上下文」。[Sarthak——secondary]
5. **(接后端时)读活库上下文**。若连了 Supabase,agent 读取现有表 schema、RLS 策略、API,从而生成正确 targeting 该项目的代码。[Sarthak——secondary]
6. **生成 = ReAct 循环**。Agent Mode 是「reason → act → observe → repeat」,每步带真实工具;主 agent 推理并把子任务派给 subagent + 匹配模型。输出为**结构化 JSON**(要写的文件 / 要跑的 SQL / 要部署的 edge function)。[Anthropic case study; Sarthak——secondary]
7. **确定性验证**。生成后跑三类**非 LLM** 检查:真实浏览器交互(点击/填表/截图)、前端单测、edge function 调用测试。[Sarthak——secondary]
8. **失败 → 自纠回路**。验证失败时把 `error_context` 塞回、state 路由回该节点,模型看到上次失败再自纠。第三方称此把 build 错误率较单发模式**降约 90%**(**secondary,厂商未直接背书该数字**)。[Sarthak——secondary]
9. **安全扫描**(核心回路而非事后)。自动检测/拦截硬编码密钥、RLS 分析、代码扫描、鉴权流分析、依赖扫描;service role key 隔离进 edge function 的 Cloud Secrets。[Sarthak——secondary]
10. **提交 & 部署**。每步落成原子 Git commit(可回滚);前端打包上 CDN、后端进 Supabase,拿到 `*.lovable.app` 子域上线。可选双向 GitHub sync 让真人开发者接手。[Sarthak; ml6——secondary/mixed]

## 5. Harness 层设计要点

- **上下文/记忆**:三层(Workspace/Project 恒注入 + Skills 按需)+ 两阶段选文件检索;长期记忆用 **Git commit 历史**充当。核心信条:「更多上下文不等于更好上下文」,故区分 always-on 与 on-demand。[Sarthak——secondary]
- **工具接口**:确定性工具(浏览器测试、前端测试、edge function 测试、四类安全扫描)为主,输出走结构化 JSON schema;对外还暴露 **MCP server** 让外部 agent 调度。[Sarthak; docs.lovable.dev]
- **规划**:显式 Plan/Chat 模式产出 `plan.md`,与 Agent 执行分离。
- **多 agent 交接**:main agent → subagents,按任务选模型。**注意取舍**:第三方拆解称 Lovable **刻意避开复杂多 agent 架构**(理由:准确率更低、失败更难解释、更慢),转而「把智能集中在生成这一步」,只用廉价模型做路由/选文件 + 强模型生成 + 确定性验证。[Sarthak——secondary]
- **人在环**:Plan 需用户批准才执行;Visual Edits 让用户直接点选改 UI。
- **沙箱/执行**:生成物在**虚拟环境里的真实浏览器**中被测试;运行时前端跑用户浏览器(publishable key + RLS 管控的「蓝区」)、后端 edge function 跑 Supabase 服务器(secret key、绕过 RLS 的「红区」),二者物理隔离。[ml6——secondary]
- **prompt 工程即 CI/CD**:prompt 改动对历史 query 库跑回归以防退化——「生产里的 prompt 工程本质是建回归 harness」。[Sarthak——secondary]

## 6. 独特设计取舍(为什么有人选它)

- **意见强的固定技术栈**(React 18 + TS + Tailwind + shadcn/ui + React Query/Zustand + Vite;后端一律 Supabase)。理由:「什么都能生成的 agent 会生成不一致的东西;永远输出同一栈的 agent 可被评测、调优」——牺牲通用性换可靠性与可评测性。[Sarthak; ml6——secondary]
- **反多 agent 复杂度**:与社区潮流相反,集中智能于单一生成步 + 确定性验证,换取更高准确率、可解释失败、更快。[Sarthak——secondary]
- **产品化的执行/部署闭环**:自带托管、DB、Auth、支付(Stripe)、CDN 部署 + 双向 GitHub sync;从想法到可收费上线常在一天内——这是相对纯 codegen 库(如其前身 gpt-engineer)或纯 IDE 插件的关键差异。[UrApp; Series B blog]
- **代价/边界**(企业视角):增量 prompt 易累积复杂度、丢整体结构;Supabase 全走公网 HTTPS,难满足网络隔离合规;无原生 dev/staging/prod 环境概念;可观测性/成本可见性有限;RLS 配错是主要漏洞面。[ml6——secondary]

## 7. 采用度信号

- **前身开源仓库** `AntonOsika/gpt-engineer`:**55.2k star / 7.3k fork**(2026-07 抓取,**已归档只读**)。Lovable 本体闭源,无 star 指标。[GitHub]
- **用量**(官方,Series B 时点):约 **8M 用户**;**日新建约 10 万项目**;首年累计 **2500 万+ 项目**;近半年 Lovable 所建站点被访问 5 亿+ 次、日访 6M+。[Series B blog; Wikipedia]
- **增长/势头**:官方称改名后 4 周达 4M ARR、60 天达 10M ARR(15 人团队);2025-11 达 200M ARR;估值 5 个月内从 18 亿翻至 66 亿。[Contrary; Wikipedia; TechCrunch]
- **知名背书/生态**:Anthropic 官方客户案例主角;投资方含 NVIDIA、Salesforce、Databricks、Google(CapitalG);MCP 打通 ChatGPT/Claude/Cursor/VS Code。[Anthropic; Menlo; docs]
- 第三方 5 亿 ARR(2026)口径**未经官方确认**,列为存疑。[getlatka——存疑]

## 8. 来源

1. Anthropic 官方客户案例(一手,模型与 harness 措辞):https://claude.com/customers/lovable
2. Lovable 官方 Series B 公告(一手,融资/用量):https://lovable.dev/blog/series-b
3. Lovable MCP server 官方文档(一手,对外接口):https://docs.lovable.dev/integrations/lovable-mcp-server
4. Wikipedia《Lovable (company)》(founders/融资/ARR/时间线):https://en.wikipedia.org/wiki/Lovable_(company)
5. TechCrunch B 轮报道(融资/估值):https://techcrunch.com/2025/12/18/vibe-coding-startup-lovable-raises-330m-at-a-6-6b-valuation/
6. Sarthak Ai 技术逆向拆解(secondary,harness/回路细节最全):https://sarthakai.substack.com/p/lets-build-the-lovable-ai-agent-tutorialcode
7. ML6《Anatomy of a Lovable App》(secondary,app 结构/安全/边界):https://www.ml6.eu/en/blog/the-anatomy-of-a-lovable-app-and-its-boundaries-in-enterprise-software
8. GitHub `AntonOsika/gpt-engineer`(前身开源仓库/许可/star):https://github.com/AntonOsika/gpt-engineer

---

### 未能完全核实 / 需注意的点
- **harness 内部机制(三层上下文、两阶段选文件、Haiku/Sonnet/Opus 路由、90% 降错、ReAct 循环、反多 agent)主要来自单一第三方技术拆解(Sarthak Substack),非 Lovable/Anthropic 官方逐条明述**——已通篇标注「secondary」。官方案例只确认了「harness + main agent + subagents + 按步选模型 + 每次新模型做回归评测」。
- 官方案例点名的模型为 **Sonnet 3.5 / Opus 4.5**;更细的三级路由(含 Haiku 具体版本)为第三方口径。
- 2026 年 **~5 亿 ARR** 仅第三方数据聚合站口径,官方仅确认到 2025-11 的 2 亿 ARR。
- Lovable 未公布上下文窗口、prompt caching 的自身实现细节(官方案例明确未披露)。
