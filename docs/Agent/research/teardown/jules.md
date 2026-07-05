# Google Jules 拆解简报

> 快照时间：2026 年年中 | 类型：异步自主编码 agent（云端托管产品）

---

## 1. 一句话定位 + 出身 + 许可 + 状态

**一句话定位**：Jules 是 Google Labs 出品的**异步自主编码 agent**——你把一个任务（issue / prompt）丢给它，它在 Google 云端 VM 里克隆你的仓库、自己规划、执行、跑测试，最后开一个 Pull Request 回来给你 review，全程你不用盯着屏幕。

- **谁造的**：Google（Google Labs 孵化，属 DeepMind/Gemini 生态）。
- **底层模型**：Gemini 系列（详见时间线，从 Gemini 2.5 Pro 演进到 3.1 Pro）。
- **许可 / 商业形态**：**闭源 SaaS 产品**，不是开源框架。唯一开源的是配套的 GitHub Action 封装 `google-labs-code/jules-action`（MIT 许可）。主产品本身没有开源代码库。
- **2026 年状态**：**活跃在售**。2025-05-20 公开 beta，2025-08-06 正式退出 beta（GA），此后持续高频迭代（见 changelog）。未被收购/更名/弃用——它本身就是 Google 亲儿子。

---

## 2. 解决什么问题 + 在技术栈里的位置

**问题**：传统 AI 编码工具（Copilot、Cursor、Windsurf、Gemini CLI）是**同步/交互式**的——你得坐在那儿一轮轮对话、盯输出。Jules 反其道而行，主打**"fire-and-forget 异步委派"**：把范围明确（"very scoped"）的任务后台化，让开发者去干别的，PR 好了再回来 review。TechCrunch 把这条"排队而非实时聊天"作为它区别于 Cursor/Windsurf/Lovable（三者都是同步工作）的核心卖点——但用的是"stands apart from"，并非"唯一"这类绝对表述。

**在栈里的位置**：Jules 是一个**完整的托管产品（full product）**，不是给你自己搭 agent 的库/框架。它内部**自带一整套 agent harness**（规划循环 + 执行器 + 沙箱 + 工具层 + 记忆），但这套 harness 对用户是黑盒。

**与底层 LLM 的关系**：Jules 是 Gemini 的**上层编排消费者**。它不是模型，而是把 Gemini（planner 用强模型、执行用快模型的分层策略）包进一个"云 VM + 工具 + 循环"的外壳里。用户不能换成别家模型——它锁定 Gemini。

---

## 3. 架构与核心组件

Jules 是闭源产品，以下是从官方 blog/docs/changelog + 二手工程分析拼出的组件图（部分为推断，已标注）：

| 组件 | 作用 |
|---|---|
| **任务池 / 调度器（scheduler）** | 接收来自 UI、GitHub issue（`jules` label）、API、CLI、cron 的任务，排队并分配 VM。受并发额度限制（免费 3 个并发）。 |
| **云 VM（Google Cloud VM）** | 每个任务一个**全新隔离的** Google 托管 VM，克隆仓库、装依赖、跑测试。预装 Node/Python/Go/Java/Rust 等多语言工具链（2026 年从默认 Ubuntu 24.04 LTS 升级了 Rust/Node/Python 等版本）。任务结束后 VM 销毁。 |
| **Planner（规划器）** | 用较强的 Gemini 模型（2.5 Pro 时代靠 "Gemini 2.5 thinking"）分析代码库+任务，产出**显式 plan + 受影响文件列表**，供用户审批。 |
| **Executor（执行器）** | 用较快模型在 VM 内落地具体改动：改文件、跑命令、跑测试、按报错迭代。 |
| **Critic / Planning Critic（评审 agent）** | 二级 agent。2026-01-26 上线的 "Planning Critic" 会审查非交互式（自动模式）的计划，官方称**失败率降低 9.5%**；Gemini 3 时代 critic "会在 replanning 后重新介入，保持长任务不跑偏"。 |
| **Memory（记忆）** | 2025-09-30 上线。跨会话/仓库记住用户偏好、纠正、nudge，随 session 携带上下文。 |
| **AGENTS.md 读取** | 2025-06-20 起，自动在仓库找 `AGENTS.md`，读取项目/工具的交互约定作为上下文。 |
| **工具层 + MCP** | VM 内可执行 shell/测试/构建；2026-02-02 起支持 **MCP server**（Linear、Neon、Supabase、Tinybird、Context7、Stitch 等外部工具接入）。 |
| **接口层** | Web UI、GitHub 集成、**Jules Tools CLI**（npm 安装，`code` 命令）、**REST API**、GitHub Action。官方强调所有 surface"对项目有同一份视图，可无缝切换不丢上下文"。 |

**API 对象模型**（`jules.googleapis.com/v1alpha`）：
- **Source**：输入源（如一个 GitHub 仓库，需先装 Jules GitHub app）。
- **Session**：一段连续工作（类似一次 chat session），由 prompt + source 发起。
- **Activity**：session 内的单个动作（用户或 agent 的一步）。
- 认证走 `X-Goog-Api-Key` header（每账号最多 3 个 key）。

---

## 4. 逐步拆解：一个请求怎么流过 Jules（最重要）

以下是一个任务的完整控制/编排循环：

1. **提交任务**：用户通过四种入口之一提交——(a) Jules Web UI 选仓库/分支 + 写 prompt；(b) 在 GitHub issue 上打 `jules` label；(c) REST API `POST /v1alpha/sessions`（带 `prompt` + `sourceContext{source, branch}`）；(d) Jules Tools CLI 或 GitHub Action（`prompt` 输入）。

2. **入池调度**：调度器把任务放入队列，受并发额度约束（免费 3 并发 / Pro 15 / Ultra 60）。轮到时**分配一个全新隔离 VM**。

3. **环境准备**：VM 内 `git clone` 目标仓库到指定分支，安装依赖，（可选）用 **Environment Snapshots**（2025-08-05 上线）复用缓存好的环境状态来加速冷启动。

4. **上下文建立**：Gemini planner 读取代码库、任务 brief、`AGENTS.md`、以及跨会话 **Memory**（用户偏好），建立项目理解。

5. **规划（Plan）**：planner 产出**显式的分步计划 + 受影响文件清单**。默认行为按模式分叉：
   - **交互模式**：暂停，等用户审批/编辑计划（`:approvePlan`）才动代码——human-in-the-loop 卡点。
   - **自动模式**（`requirePlanApproval=false`，API 默认自动批准）：**Planning Critic** 这个二级 agent 先审一遍计划，再放行。

6. **执行（Execute）**：executor（较快的 Gemini）在 VM 内逐步落地——改文件、跑命令、**跑测试套件**、按报错自我迭代修复，无需人介入。

7. **评审回环**：critic agent 在长任务中监控，若跑偏触发 **replanning** 并重新介入，回到步骤 5/6 循环。

8. **验证**：在 VM 内实际运行代码/测试，确认改动可用后才收尾（官方强调"verify that changes actually work before submitting a PR"）。

9. **交付 PR**：向一个新分支开 Pull Request，附**变更摘要 + diff + 测试输出**（`automationMode="AUTO_CREATE_PR"`）。commit 作者归属可选（Jules 独署 / co-authored / 用户署名，2026-02-19）。

10. **人类 review + 追问**：VM 销毁，PR 落在 GitHub 上像普通贡献一样被 review。用户可在 PR 评论里追加要求，**Jules 会读 PR comment 并回应/再改**（2025-09-23）。

11. **（可选）持续化**：可设 **Scheduled Tasks**（2025-12-10 cron 定时维护），或 **CI Auto-Fixing**（2026-02-19，自动检测并修 GitHub Actions 失败）。

---

## 5. Harness 级设计

- **上下文 / 记忆管理**：三层——(1) VM 内的实时代码库 checkout；(2) `AGENTS.md` 声明式项目约定；(3) 跨 session 的 **Memory**（偏好/纠正）。Gemini 3 时代还加了**环境变量支持**和"记忆在 session 内更好地传递"。
- **工具接口**：VM 内可跑任意 shell/构建/测试命令；外部通过 **MCP server**（Linear/Neon/Supabase 等）接入。多 surface（UI/CLI/API/Action）共享同一项目视图。
- **规划**：planner/executor 分离——强模型做 plan，快模型做执行，critic 做评审，三段式。
- **多 agent 交接**：planner → executor → critic 的内部角色分工；critic 在 replanning 时重新接管。
- **Human-in-the-loop**：默认交互模式下**计划必须人工审批**才动代码；PR 阶段人类 review；PR 评论可持续对话式追改。自动模式把审批换成 Planning Critic。
- **沙箱**：每任务一个**一次性、隔离的 Google Cloud VM**，任务完销毁；私有 by default，官方声明**不拿私有代码训练**，数据隔离在执行环境内。

---

## 6. 独特设计取舍 vs 同类

- **异步/排队优先**：Jules 主打排队/后台化而非实时聊天。TechCrunch 明确指出它"与 Cursor、Windsurf、Lovable 等同步工作的主流编码工具区别开来"（原文用 "stands apart from"，并未称其为"唯一"）。取舍——适合范围明确、可后台化的任务；不适合需要密集来回探索的活（那种 Google 让你用 Gemini CLI）。
- **云 VM 而非本地**：长任务不占你的机器，天然多任务并发；代价是必须信任 Google 托管环境、有额度上限。
- **锁定 Gemini + 分层模型**：planner/executor/critic 用不同档位的 Gemini，成本/速度/质量分层优化；但你不能换模型。
- **"当团队成员对待"的安全姿态**：官方明确建议合并前 review PR，并警告不要让不可信用户通过 issue 事件触发 workflow。
- **深度嵌进 GitHub + 全套接口**：issue label / API / CLI / Action / MCP / cron 五路入口，比多数竞品的接入面更广。

---

## 7. 采用信号

- **beta 期数据**（截至 2025-08 GA，官方/TechCrunch）：2.28M 次访问；45% 流量来自移动端；Top 市场 印度/美国/越南；数千开发者完成数万个任务；**140,000+ 公开代码改进**被分享。
- **模型迭代节奏**（活跃度信号）：2.5 Pro（2025-08）→ Gemini 3 Pro（2025-11-19）→ Gemini 3 Flash 成为基座（2026-01-30）→ **Gemini 3.1 Pro（2026-03-09，Pro 用户新基座）**。几乎每月都有 changelog 更新。
- **GitHub 星标**：主产品闭源无公开 repo。配套的 `google-labs-code/jules-action`（GitHub Action）截至 **2026-06-30 为 208 stars / 41 forks**（GitHub API 实测），2025-11-24 建库，v1.0.0 于 2025-12-15 发布。⚠️ 注意：这只是外围工具的星数，**不代表产品体量**（Jules 主体是 SaaS）。
- **定价**（GA 后，反映规模化商业意图）：免费档 15 任务/日 · 3 并发；Google AI Pro $19.99/月（约 5×，100/日 · 15 并发）；Google AI Ultra $249.99/月标准价（约 20×，300/日 · 60 并发）。注意 $124.99 只是 Ultra 前三个月的引流优惠价，标准价为 $249.99/月（2026 年年中之前）。

**未能核实的项**：
- Planner/Executor 具体用的是哪一档 Gemji 模型做"快速执行"——官方只说"分层"，未公开精确型号映射（分层执行的说法部分来自二手工程分析，标记为推断）。
- VM 的精确规格（CPU/RAM/超时）：**未找到公开数据**。
- 产品级 DAU/MAU 或付费用户数：**未找到公开数据**（只有 beta 期访问量）。

---

## 8. 来源（Sources）

1. Google Blog（官方发布公告）— https://blog.google/innovation-and-ai/models-and-research/google-labs/jules/
2. Jules 官网 — https://jules.google/
3. Jules 官方 Changelog（模型/功能时间线）— https://jules.google/docs/changelog/
4. Jules API Reference（对象模型/端点）— https://jules.google/docs/api/reference/
5. TechCrunch（GA 报道 + beta 数据，2025-08-06）— https://techcrunch.com/2025/08/06/googles-ai-coding-agent-jules-is-now-out-of-beta/
6. TechCrunch（API/CLI + 竞争格局，2025-10-02）— https://techcrunch.com/2025/10/02/googles-jules-enters-developers-toolchains-as-ai-coding-agent-competition-heats-up/
7. Google Developers Blog（Gemini 3 in Jules，critic agent）— https://developers.googleblog.com/jules-gemini-3/
8. GitHub `google-labs-code/jules-action`（Action 源码 + 星标）— https://github.com/google-labs-code/jules-action

---

## 核验记录

对本简报中风险最高的数字、日期、归属与"唯一/最"类断言逐条独立核验（快照 2026 年年中）：

**已修正**
- **Google AI Ultra 定价**：原文写 $124.99/月 → 修正为 **$249.99/月标准价**（$124.99 实为前 3 个月引流价）。来源：Jules usage-limits 文档 + Google AI 订阅页/多家二手报道。
- **"唯一"超级断言**：原文两处（§2、§6）称 TechCrunch 把"排队而非实时聊天"作为 Jules"唯一"卖点/称其"唯一一个……主流编码 agent"。核对 TechCrunch 2025-08-06 原文，实际措辞为 Jules "stands apart from" Cursor/Windsurf/Lovable（三者同步工作），**未使用"唯一/only/first"**。已改为忠实转述，删去绝对化表述。

**已核实无误（保留）**
- GitHub `jules-action`：208 stars / 41 forks、建库 2025-11-24、v1.0.0 于 2025-12-15、MIT 许可 —— GitHub API 实测全部吻合。
- 里程碑日期：公开 beta 2025-05-20（Google I/O）、GA 2025-08-06 —— TechCrunch/官方 blog 确认。
- beta 期数据：2.28M 次访问、45% 移动端、Top 市场 印度/美国/越南、"140,000+ 公开代码改进" —— TechCrunch 原文逐字吻合。
- Changelog 特性与日期：Planning Critic 2026-01-26（失败率 −9.5%）、Memory 2025-09-30、AGENTS.md 2025-06-20、MCP 2026-02-02、Environment Snapshots 2025-08-05、Scheduled Tasks 2025-12-10、CI Auto-Fixing 2026-02-19、PR 评论回改 2025-09-23、commit 署名 2026-02-19 —— 官方 changelog 确认。
- Gemini 模型时间线：2.5 Pro（2025-08）→ 3 Pro（2025-11-19）→ 3 Flash（2026-01-30）→ 3.1 Pro（2026-03-09）—— 官方 changelog 确认。
- 定价/额度：免费 15 任务/日·3 并发、Pro $19.99/月（100/日·15 并发）、Ultra（300/日·60 并发）—— Jules usage-limits 文档确认。
- API 细节：`jules.googleapis.com/v1alpha`、`X-Goog-Api-Key` 头、每账号最多 3 个 API key、Source/Session/Activity 对象模型 —— 官方 API 文档逐字确认。

**未改动的标注推断**：Planner/Executor 精确 Gemini 档位映射、VM 规格、DAU/MAU —— 原文已明确标为"未能核实/推断"，保留。
