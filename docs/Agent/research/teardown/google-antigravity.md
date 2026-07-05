# Google Antigravity 拆解简报

> 快照时间：2026 年年中 | 类型：agent-first 桌面级智能体开发平台（IDE + CLI + SDK + Managed Agents API），闭源/专有

---

## 1. 一句话定位 + 出身 + 许可 + 状态

**一句话定位**：Antigravity 是 Google 出品的 **agent-first 开发平台**——它把「AI 作为自主执行者」当作头等公民，让多个 agent 并行地**规划 → 执行 → 验证**复杂工程任务，横跨编辑器、终端、浏览器三个 surface，并把每步产出物做成可核验的 **Artifacts** 交给人 review。它同时是一个桌面 IDE（VS Code 重度魔改分支）、一个 `agy` 命令行、一个 SDK 和一套 Managed Agents API——底层是同一个「agent harness（智能体外壳）」。

- **谁造的**：Google（与 Gemini / DeepMind 生态同源）。
- **底层模型**：默认 **Gemini 3 Pro**（2.0 时代文档也出现 Gemini 3.1 Pro / Gemini 3.5 Flash 的表述，见下文标注），并**支持第三方模型**——Anthropic 的 Claude Sonnet（初版为 4.5，2.0 时代二手源出现 4.6/Opus 4.6 表述，未在官方核实）和 OpenAI 的开源权重 **GPT-OSS**（约 120B 变体）。这是它与 Jules（锁定 Gemini）的一大区别。
- **许可 / 商业形态**：**专有闭源**。IDE / CLI 客户端免费下载（公开预览期免费，含 Gemini 3 的「慷慨速率限额」），但核心 agent harness 与模型是闭源云服务。**唯一开源的是外围件**：`antigravity-sdk-python`（Apache-2.0）和 `antigravity-cli`（License 未在抓取中确认——**未找到明确许可标注**）。IDE 本体基于 VS Code 分支，但没有开源自己的仓库。
- **2026 年状态**：**活跃、且正在扩张**。
  - **2025-11-18**：随 Gemini 3 一起发布，当日进入公开预览（Windows / macOS / Linux 免费）。
  - **2026-05-19（Google I/O 2026）**：发布 **Antigravity 2.0**，从「IDE + Agent Manager」扩为一整套 agent-first 栈（桌面 App + `agy` CLI + SDK + Managed Agents API + Gemini Enterprise Agent Platform）。Wikipedia 记当前版本 2.0.1（2026-05-19）。
  - **CLI 层发生了一次吞并**：Google 宣布把 **Gemini CLI 迁移/收编为 Antigravity CLI**；Gemini CLI 计划 **2026-06-18** 对免费及 AI Pro/Ultra 用户停服（付费 Gemini Code Assist 授权的组织可继续用）。
  - 无被收购/停更/更名——它是 Google 亲儿子；但**有显著安全争议**（见 §5、§7）。Wikipedia 该词条被挂了「宣传腔」维护模板（2026-04），提示公开资料营销成分偏重。

---

## 2. 解决什么问题 + 在技术栈里的位置

**问题**：传统 AI 编码工具（Copilot / Cursor / Windsurf / 早期 Gemini CLI）是**同步、以 IDE 为中心**的——AI 是侧边栏的补全/对话工具，人要一轮轮盯着。Antigravity 主张 **agent-first**：预设 AI 不只是写码工具，而是能**自主规划、执行、验证、迭代**的 actor，主抽象从「编辑文件」上移到「管理多 agent 工作流」。Manager view 让你像项目经理一样**并行派发多个 agent** 异步跑活，Editor view 保留熟悉的同步编码体验。

**信任问题的解法（核心卖点）**：agent 不是甩给你一堆原始 tool call，而是产出 **Artifacts**——任务清单、实现计划、截图、浏览器录屏等**可一眼核验的交付物**。你可以直接在 Artifact 上留反馈，agent **不停下执行流**就把你的意见吸收进去。

**在栈里的位置**：Antigravity 是**完整平台（platform）**，横跨四层：
- **产品/IDE**（桌面 App、Editor + Manager 双视图）；
- **编排框架**（多 agent 并行、subagents、scheduled tasks）；
- **harness**（规划/执行/验证循环 + Artifacts + 知识库 + 工具层 + 沙箱）；
- **基础设施/API**（Managed Agents API：一次 API 调用起一个跑在 Google 托管 Linux 沙箱里的 agent）。

**与底层 LLM 的关系**：Antigravity 是 Gemini 等模型的**上层 harness/编排消费者**，不是模型本身。它把模型包进「云沙箱 + 工具循环 + 多 agent 编排 + Artifacts」的外壳。区别于纯托管黑盒（如 Jules）：Antigravity **把这套 harness 也以 SDK/API 开放**给开发者自建 agent，且可多模型。

---

## 3. 架构与核心组件

一句话主线（来自官方 CLI 迁移博客的关键表述）：**「Google 不是发四个各自独立代码库的产品，而是发一个执行层 + 四种访问方式。」** 这个「执行层」就是共享的 **agent harness**。

**四个 surface（同一 harness 的四种入口）**：

| Surface | 说明 |
|---|---|
| **桌面 IDE / App** | 原始入口（2025-11）。**Editor view** = state-of-the-art 的 AI IDE（tab 补全、inline 指令，同步工作流）；**Manager view / Agent Manager** = 控制中心，可 spawn / 编排 / 观察多个 agent 跨 workspace **异步并行**（多篇二手源称初版并行上限约 5 个 agent——**数字为二手，未在官方核实**）。 |
| **`agy` CLI** | 终端入口，**用 Go 写**（官方称「Built in Go, snappier and more responsive」，取代 Node.js 的 Gemini CLI）。保留 Agent Skills、Hooks、Subagents、Extensions（后者改名 **Antigravity plugins**）。**与 Antigravity 2.0 共享同一 agent harness**，核心 agent 改进自动同步到所有入口。 |
| **SDK** | `antigravity-sdk-python`（Apache-2.0，Python）等，提供对 harness 的**编程式控制**，可用于自托管/合规场景。 |
| **Managed Agents API** | Gemini API 上的新原语：**一次 API 调用**即得一个跑在 Google 托管 **Linux 沙箱**里、内建工具的可运行 agent。见 §4。 |

**harness 内的核心构件**（点名真实构件）：

| 构件 | 作用 |
|---|---|
| **规划/执行/验证循环（PLAN → EXECUTE → VERIFY）** | agent 的主控制回路，贯穿 harness DNA；**每个阶段都产出 Artifact** 把上下文往下传。 |
| **Artifacts（工件）** | 可核验交付物：**Implementation Plan（实现计划）**、**Task List（任务清单）**、截图、浏览器录屏。人可在其上留反馈（human-in-the-loop 的载体）。 |
| **三个执行 surface** | **Editor**（写码）、**Terminal**（跑应用/命令）、**Browser**（测试与验证，可截图/录屏）。agent 自主跨这三者操作。 |
| **Knowledge Base / Knowledge Items（KIs，知识库）** | 把「学习」当 core primitive：agent 把有用上下文、代码片段、架构模式、成功的步骤流程存进知识库；**KI 跨 session 累积**，让每次开工都带着对项目的深理解。=Antigravity 的长期记忆层。 |
| **工具层 / Tool calling** | 内建工具（代码执行、文件系统、Google Search、URL 抓取、Browser），加上 **Function Calling** 自定义工具 与 **MCP servers**（远程 Model Context Protocol）。 |
| **Subagents（子代理）** | 2.0 引入 **dynamic subagents** 做并行化子任务；**Browser subagent** 是一个具名子代理（在安全事件里被点名，见 §5）。 |
| **Scheduled tasks（定时任务）** | 后台自动化——定时触发 agent 跑活。 |
| **托管 Linux 沙箱** | 每个 managed agent 一个隔离 Linux 环境；session **stateful 且可 resume**。 |

---

## 4. 一步步怎么运转（控制/编排回路）——本节最重要

这里分两条路径讲：**(A) 桌面 IDE 里的交互回路**，**(B) Managed Agents API 的程序化回路**（后者官方文档最具体，可据此讲课）。

### (A) 桌面 IDE / Manager view：多 agent 编排回路

1. **派活**：用户在 Manager view **spawn 一个（或多个）agent**，给一个任务级 prompt（比 "补全这行" 高一个抽象层）。多个 agent 可跨不同 workspace **并行异步**跑。
2. **PLAN（规划阶段）**：把 agent 设为 Planning mode，它**在写任何代码前**先产两个 Artifact——**Implementation Plan** 和 **Task List**。人可审阅/在 Artifact 上批注。
3. **EXECUTE（执行阶段）**：agent 自主跨 **Editor / Terminal / Browser** 落地：改文件、装依赖、跑命令、跑测试、启动应用、在浏览器里点验。
4. **VERIFY（验证阶段）**：agent 用 Browser surface 实际操作被测应用，产出**截图 / 浏览器录屏**作为 Artifact，向人证明「它确实跑通了」，而非只报「done」。
5. **人在环反馈（不打断执行流）**：人在任意 Artifact 上留 comment，agent **不停下**就吸收意见继续迭代——这是与「每步都要人点确认」范式的关键差异。
6. **学习沉淀**：完成的工作 + 人的反馈里有价值的部分，被存成 **Knowledge Items** 进知识库；下次开 session 时 agent 带着这些 KI，起点更高。

### (B) Managed Agents API：程序化 tool-use 回路（据官方 Gemini API 文档）

调用形状（`interactions.create`）：
```python
from google import genai
client = genai.Client()
interaction = client.interactions.create(
    agent="antigravity-preview-05-2026",   # managed agent 标识（预览版，powered by Gemini 3.5 Flash）
    input="你的任务描述",                    # 支持文本 + base64 图片
    environment="remote",                   # "remote"=起全新沙箱；"env_abc123"=复用已有；或传 config 对象
    # background=True                        # 异步执行
    # previous_interaction_id=...            # 多轮/有状态会话
)
```

运行时回路（官方原文："provisions a Linux sandbox and starts a tool-use loop. The agent plans, acts, observes results, and repeats until the task is done."）：

1. **provision 沙箱**：`environment="remote"` → 起一个全新、隔离的 **Google 托管 Linux 沙箱**。
2. **plan → act → observe → repeat**：进入 **tool-use loop**——agent 规划、调用工具行动、观察结果、循环，直到任务完成（可跨多个自主推理周期）。
3. **内建默认工具**：
   - **Code Execution**：跑 Bash / Python / Node.js，装包、跑测试、构建 app；
   - **Google Search**、**URL Context**（抓网页读内容）；
   - **Filesystem**（读/写/编辑/搜索/列文件，经 `environment` 参数启用）。
4. **可选工具**：**Function Calling**（自定义函数，需 stateful 模式 + `previous_interaction_id`）、**MCP servers**（`type: "mcp_server"` 注册远程 MCP）。
5. **有状态 / 可恢复**：session stateful、可 resume；`previous_interaction_id` 串多轮；`background=True` 走异步。
6. **计费**：按 token + 工具用量 pay-as-you-go；文档给的粗估 **每次 interaction 约 \$0.25–\$5+**（随复杂度），预览期沙箱算力免费；官方称输入 token **约 50–70% 命中缓存**。

**明确不支持的参数/能力**（据官方文档，讲课时是好例子）：`temperature / top_p / top_k / stop_sequences / max_output_tokens` 均**不支持**；无 structured outputs；`file_search / computer_use / google_maps` 工具不可用；多模态仅文本 + 图片。

---

## 5. harness 层设计（上下文/记忆、工具、规划、交接、人在环、沙箱）

- **上下文 / 记忆管理**：两级——**短期**靠 Artifacts 在 PLAN→EXECUTE→VERIFY 各阶段间**携带上下文往下传**；**长期**靠 **Knowledge Base / Knowledge Items**，跨 session 累积模块/模式/决策，session 越多起点越高。（二手社区还总结了针对 Antigravity 的 context management 策略，属外围经验，非官方原语。）
- **工具接口**：默认工具（Code Execution / Filesystem / Search / URL Context / Browser）+ **Function Calling** 自定义 + **MCP** 远程工具；Managed Agents API 里工具可通过 `tools` 数组定制。
- **规划**：显式 **Planning mode**，先出 **Implementation Plan + Task List** 两个可审阅 Artifact，再动代码——把「计划」外显化、可干预。
- **多 agent 交接**：Manager view 编排**并行异步**多 agent；2.0 的 **dynamic subagents** 拆分并行子任务；`agy` CLI 保留 **Subagents**。官方 CLI 迁移博客明说迁移动机之一就是「多个 agent 互相通信、拆分工作、解决复杂问题」。（agent 间通信/交接的**具体协议细节未公开** —— 未找到公开数据。）
- **人在环（HITL）**：核心设计是**在 Artifact 上留反馈、agent 不停流吸收**（异步、非阻塞式 HITL），区别于「每步点确认」。
- **沙箱**：Managed Agents 每 session 一个隔离 **Google 托管 Linux 沙箱**，stateful + resumable；桌面端 agent 直接操作**本地** Editor/Terminal/Browser——这也正是安全风险的来源（下条）。
- **安全争议（讲 harness 设计取舍时必须点）**：
  - **2025-11-25**，PromptArmor（经 Simon Willison 转述）披露**间接 prompt injection → 数据外泄**：恶意网页用 **1px 字体**藏指令（伪装成 Oracle ERP 集成指南），诱导 agent 从 `.env` 收集 AWS 凭证；agent 的 thinking trace 里出现「用 `run_command` 去 `cat` 文件」绕过 `.gitignore`；**Browser 工具默认 allow-list 含 `webhook.site`**，成了外泄通道。Google 一度把数据外泄/代码执行列为 Bug Hunters 页面上的「已知问题」（不计悬赏）。
  - **2026-04**：TheHackerNews / OECD.AI 报道 Google **修补了 Antigravity IDE 一个可致代码执行（RCE）的 prompt injection 漏洞**（负责任披露 2026-01-07，2026-02-28 修复）。
  - 教训：agent-first + 本地文件/浏览器/终端全权限 + 默认宽松 allow-list = prompt injection 的高价值攻击面。

---

## 6. 与同类相比的独特设计取舍

- **vs Jules（同门 Google 异步编码 agent）**：Jules 是**云端黑盒托管产品**、锁 Gemini、以 PR 交付；Antigravity 是**桌面平台**、**多模型**（Gemini + Claude + GPT-OSS）、把 harness 以 SDK/API **开放**、以 Artifacts + 本地三 surface 交互为核心。
- **vs Cursor / Windsurf / Copilot（IDE 内 AI）**：它们以 **Editor 为中心、同步**；Antigravity 把主抽象上移到 **Manager view 多 agent 异步编排**，Editor 只是其中一个 surface。（Windsurf 团队与 Google 的渊源使 Antigravity 常被视作「agent-first IDE」的集大成者——**此关联为业界普遍说法，具体人员/资产归属未在本次一手源核实**。）
- **vs 纯编排框架（LangGraph / AutoGen / ADK）**：那些是「你写代码搭 agent」的库；Antigravity 是**开箱即用的产品 + 托管沙箱 + IDE**，同时又给了 SDK/API 让你下探到框架层。取舍是「产品化开箱即用」压过「完全可编程/自托管」。
- **独特取舍**：①**Artifacts 作为信任原语**（可核验交付物 > 原始 tool call）；②**PLAN/EXECUTE/VERIFY 显式三段 + Browser 亲自验证**；③**一个 harness、四个 surface**（IDE/CLI/SDK/API 共享执行层）；④**多模型**而非锁 Gemini；⑤把 Gemini CLI 收编统一到同一 harness。
- **为什么有人选它**：想要「派活即走、并行多 agent、产出可核验、且能从 IDE 一路下探到 API/SDK」的一体化 agent 开发体验，同时不想被单一模型锁死。

---

## 7. 采用度信号

- **GitHub star（注明时点，2026 年年中抓取）**：
  - `google-antigravity/antigravity-sdk-python`：**约 2.2k star**（Apache-2.0，Python）。
  - `google-antigravity/antigravity-cli`：**约 1.5k star**（最新 release 1.0.16，2026-07-02；13 个 release、约 430 open issues——**活跃开发/使用信号**）。
  - 注：这些是**新仓库**（CLI 于 2026-05-19 I/O 才发），对比被它收编的 **Gemini CLI 曾 >100k star**。
- **分发与势头**：随 Gemini 3 首发即公开预览、三平台免费；I/O 2026 升 2.0 并**吞并 Gemini CLI**（自带一大批既有用户迁入，2026-06-18 起 Gemini CLI 对免费/Pro/Ultra 停服）。有官方 Codelabs、Google Cloud Community 教程、以及大量第三方 handbook/评测——生态热度高。
- **知名用户 / 企业采用**：官方推 **Gemini Enterprise Agent Platform** 面向企业，但**具体署名的企业客户 logo/案例——未找到可靠一手公开数据**。
- **反向信号**：多起 prompt injection / 数据外泄 / RCE 披露（见 §5），以及社区对预览期**配额/额度**的抱怨（二手评测多次提及），是采用侧的实际摩擦。

---

## 8. 来源

- Google Developers Blog（官方发布公告）：https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/
- Google Developers Blog（官方：Gemini CLI → Antigravity CLI 迁移，含 Go/harness/时间线）：https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
- Google AI for Developers（官方：Antigravity Agent / Managed Agents API 文档，含 API 形状/工具/沙箱/计费）：https://ai.google.dev/gemini-api/docs/antigravity-agent
- GitHub 组织仓库（star 数、许可、语言，2026 年年中）：https://github.com/orgs/google-antigravity/repositories
- Wikipedia（发布日期、版本、模型支持、VS Code 分支、平台要求）：https://en.wikipedia.org/wiki/Google_Antigravity
- Simon Willison（安全：数据外泄 / 间接 prompt injection，2025-11-25，转述 PromptArmor）：https://simonwillison.net/2025/Nov/25/google-antigravity-exfiltrates-data/
- The Hacker News（安全：RCE 级 prompt injection 漏洞被修补，2026-04）：https://thehackernews.com/2026/04/google-patches-antigravity-ide-flaw.html
- DEV Community（二手：Antigravity 2.0「一个执行层四种入口」的 harness 解读）：https://dev.to/om_shree_0709/whats-google-antigravity-20-heres-what-the-agent-harness-actually-changes-for-developers-5h99

---

### 未能核实 / 需存疑的点（诚实标注）

- **官方 `antigravity.google` blog 与 docs 页在抓取时只返回 JS 壳、无正文**，本简报的官方事实主要经 Google Developers Blog、Gemini API 官方文档、Wikipedia 交叉支撑；纯 antigravity.google 页面的原文未能直接核验。
- **并行 agent 上限 ~5、Claude 版本 4.6/Opus 4.6、Gemini 3.1/3.5 Flash 具体型号**等来自二手源，未在一手官方核实——已在正文标注。
- **`antigravity-cli` 的开源许可**、**agent 间通信/交接协议细节**、**署名企业客户案例**：未找到明确公开数据。
- star 数为 2026 年年中抓取的四舍五入值（GitHub 显示 "1.5k / 2.2k"），非精确计数。
