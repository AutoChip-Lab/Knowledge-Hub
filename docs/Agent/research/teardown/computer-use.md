# Anthropic Computer Use 事实底稿（快照：2026 年年中）

> 拆解对象：**Anthropic Computer Use**——Claude 的「看截图 + 动鼠标键盘」桌面控制能力，及其官方参考实现（`anthropic-quickstarts/computer-use-demo`）。
> 底稿口径：只写可溯源断言；估算/单来源项已显式标注；找不到写「未找到公开数据」。

---

## 1. 一句话定位 + 出品方 + 许可 + 2026 状态

- **定位**：Computer Use 不是一个独立框架，而是 **Claude Developer Platform（Messages API）上的一个内置工具类型**——`computer_2025xxxx`。它让 Claude 通过「截图看屏幕 → 输出鼠标/键盘动作 → 你在自己的沙箱里执行 → 再截图回传」的循环自主操作任意桌面 GUI。官方定义：*"the ability for AI models to understand and interact with computer interfaces… by looking at a screen, moving a cursor, clicking buttons, and typing text"*（[anthropic.com/news](https://www.anthropic.com/news/3-5-models-and-computer-use)）。
- **出品方**：**Anthropic**。工具本体是训练进模型的内置能力（schema 内置、不可修改），参考实现为官方开源。
- **许可**：
  - **工具能力本身**：闭源，随 Claude 模型提供，按 token 计费（无独立许可）。
  - **参考实现 `computer-use-demo`**：属 `anthropic-quickstarts` 仓库，**MIT License**（[GitHub](https://github.com/anthropics/anthropic-quickstarts)）。
- **2026 状态：活跃，仍为 beta，但快速迭代且已成 Anthropic 多条 agent 产品线的底层能力**。
  - **首发**：2024-10-22，随 upgraded Claude 3.5 Sonnet 发布，是「第一个提供 computer use public beta 的前沿模型」（[anthropic.com/news](https://www.anthropic.com/news/3-5-models-and-computer-use)）。
  - **仍是 beta**：截至 2026 年年中，官方文档仍标注 *"Computer use is in beta and requires a beta header"*（[平台文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)）——**未 GA**。
  - **未改名、未被收购、未停更**。工具版本三代演进：`computer_20241022`（初代）→ `computer_20250124`（2025-01，加 scroll/hold_key/wait 等）→ `computer_20251124`（2025-11，加 `zoom` 动作）。
  - ⚠️ **命名口径注意**：正确的工具 `type` 字符串是 **`computer_20251124`**（无 `_use_`）；部分二手来源写成 `computer_use_20251124` 系错误。beta header 才是 `computer-use-2025-11-24`。

---

## 2. 解决什么问题 / 技术栈位置 / 与 LLM 的关系

- **解决的问题**：让 agent 能操作**没有 API 的软件**——遗留桌面应用、任意网站、需要点选拖拽的 GUI。不依赖 DOM/无障碍树，而是**纯像素视觉 + 通用鼠标键盘动作**，因此理论上「人能点的它都能点」。
- **栈内位置**：这是**最底层的一层能力原语（capability primitive / tool），不是编排框架**。它处在栈的最下方：
  - **模型层**：Claude（视觉理解 + 决定坐标/动作）——能力内生于模型权重。
  - **工具层（本对象）**：`computer` 工具定义 = 一组固定动作 schema（screenshot/click/type/…），由 Claude 直接产出结构化 `tool_use`。
  - **Harness 层（你或参考实现提供）**：agent loop、图像裁剪、prompt caching、沙箱、执行器。参考实现 `loop.py` 就是这一层。
  - **产品层（构建在其上）**：Anthropic 自家的 **Claude for Chrome**（浏览器 agent，2025-08 研究预览、2025-11 扩至 Max、2025-12 全付费计划 beta）明确以 computer use 为底层能力——*"computer use is just one tool in the larger tool bag… that understanding of what digital buttons to click… is what makes Claude's Chrome plugin possible"*（[Engadget](https://www.engadget.com/ai/claudes-chrome-plugin-is-now-available-to-all-paid-users-221024295.html)）。
- **与底层 LLM 的关系**：**强绑定 Claude**。动作决策（看哪、点哪个坐标）完全由模型完成，非 Claude 模型无法调用此 beta 工具；坐标精度、zoom 触发、effort 设定都随具体模型档位变化（见 §7）。这是它与 model-agnostic 框架（如 LangChain/Goose）最根本的差异。

---

## 3. 架构与核心组件（点名真实构件）

Computer Use 本体只有「工具契约」；一个可运行系统由**工具契约 + harness + 沙箱**三块拼成。参考实现 `computer-use-demo` 是官方标准拼法。

**A. 工具契约（内置于模型，Anthropic 侧）**
- **schema-less 工具**：三个内置工具无需你提供 input schema——`computer_20251124`（图形）、`bash_20250124`（shell）、`text_editor_20250728`（`str_replace_based_edit_tool`，文件编辑）。文档：*"the schema is built into Claude's model and can't be modified"*。
- **专用 system prompt**：当请求含 Anthropic-schema 工具时，API 自动生成 computer-use 专用系统前缀（*"You have access to a set of functions… This includes access to a sandboxed computing environment…"*），并与用户 `system` 参数拼接。
- **内置 prompt-injection 分类器**：截图会自动过一层分类器；命中疑似注入时**自动转为让 agent 先向用户求确认**（可 contact support 关闭）。

**B. Harness / Agent Loop（`computer_use_demo/loop.py`，你侧）**
- `sampling_loop`（async）：主循环，从 `TOOL_GROUPS_BY_VERSION[tool_version]` 取工具组、拼系统提示、反复调 `client.beta.messages.with_raw_response.create()`、跑工具、回填结果。
- `ToolCollection` / `tool_collection.run()`：工具分发器。
- `_maybe_filter_to_n_most_recent_images`：上下文瘦身，只保留最近 N 张截图（见 §5）。
- `_inject_prompt_caching`：给最近 3 个 user turn + system 打 `cache_control: ephemeral`。
- `APIProvider` 枚举：`ANTHROPIC` / `BEDROCK` / `VERTEX` 三后端。

**C. 沙箱 / 执行器（Docker 容器，参考实现 `entrypoint.py` + `Dockerfile`）**
- **虚拟显示**：`Xvfb`（X Virtual Framebuffer）渲染桌面。
- **窗口管理**：`Mutter`（WM）+ `Tint2`（面板）跑在 Linux（Ubuntu）上。
- **预装应用**：Firefox、LibreOffice、文本编辑器、文件管理器等。
- **可视/接入端口**：`5900`（VNC）、`6080`（noVNC HTML `vnc.html`）、`8501`（Streamlit 聊天）、`8080`（合并视图：聊天+桌面）。
- **UI**：`streamlit_app.py` 提供对话入口。

> ⚠️ 参考实现有意「最小化」：agent loop 与被控桌面**跑在同一容器内**（弱隔离），一次只能一个 session，换 session 要重启。官方明确这是 demo 取舍，生产另见 `computer-use-best-practices`。

---

## 4. 一步步怎么运转（控制/编排回路）——最重要

以官方例子 *"Save a picture of a cat to my desktop."* 走完整回路：

1. **发起请求**：你的 harness 调 `POST /v1/messages`，带
   - `model: claude-opus-4-8`（或其他兼容档），
   - `anthropic-beta: computer-use-2025-11-24` header，
   - `tools`: `[computer_20251124(display_width_px, display_height_px, display_number), text_editor_20250728, bash_20250124]`，
   - `messages`: 用户指令。
   注意：Anthropic 自动注入 computer-use 专用 system prompt。
2. **Claude 决策（模型侧）**：Claude 判断需要看屏幕，返回 `stop_reason: "tool_use"`，content 里带一个 `tool_use` block，例如 `{"action": "screenshot"}`。
3. **Harness 执行（你侧）**：`process_tool_calls` 提取 `block.input["action"]` → `handle_computer_action` 映射到真实操作（在 Xvfb 上截图/点击/键入）→ 得到结果（截图 base64 或命令输出）。
   - 关键：**Claude 永不直接连沙箱**。文档强调 *"Your application must explicitly run the computer use tool; Claude cannot run it directly."*
4. **回填结果**：把结果封成 `tool_result` block（`tool_use_id` 对应），追加为一条 `user` 消息，连同全部历史再次发给 API。
5. **循环（agent loop）**：Claude 看到新截图 → 决定下一步（比如 `{"action":"left_click","coordinate":[500,300]}` 打开浏览器 → `type` 搜索 → 保存图片）。**步骤 3–4 无用户介入地反复**，直到：
   - Claude 返回**不含任何 `tool_use`** 的纯文本（任务完成，`sampling_loop` return），或
   - 触及 `max_iterations`（参考实现默认示例 10）——防止死循环烧钱的硬保险。

**回路里的关键子机制（讲课要点）**：
- **视觉闭环而非状态机**：没有显式规划器/DAG。规划隐式发生在模型每一步的推理里；官方甚至建议 prompt 里让它 *"After each step, take a screenshot and carefully evaluate if you have achieved the right outcome…"*——因为模型会「假设动作成功而不检查」。
- **坐标映射**：Claude 按它看到的图像分辨率返回坐标。若你的真实屏幕大于模型图像上限，必须自己缩放截图 + 反向缩放坐标回真实屏幕（见 §5）。
- **多工具协作**：同一 loop 里 `computer` 负责 GUI，`bash` 负责跑命令，`text_editor` 负责改文件——Claude 自行择工具。
- **指令-图像顺序**：user turn 的 content 里应把**指令文本放在截图之前**，可提升点击准确率（文档明确建议）。

---

## 5. Harness 层设计（上下文/记忆/工具/规划/人在环/沙箱）

- **上下文/记忆管理**：
  - **图像裁剪** `_maybe_filter_to_n_most_recent_images`：截图是 token 大户，只保留最近 N 张，按 `min_removal_threshold` 成块删除（利于缓存对齐）。**开启 prompt caching 时被禁用**（设为 0，因为缓存读更便宜）。
  - **Prompt caching**：`PROMPT_CACHING_BETA_FLAG = "prompt-caching-2024-07-31"`，`_inject_prompt_caching` 给最近 3 个 user turn 和 system 打 `ephemeral` cache_control（仅 Anthropic provider）。
  - 无长期记忆/向量库——记忆就是**消息历史 + 最近若干截图**。
- **工具接口**：内置三工具 schema-less，动作以固定字符串枚举（见下）；可在同一 `tools` 数组里加自定义 custom tool。
- **动作集合**（`computer` 工具）：
  - 全版本：`screenshot` / `left_click`(`[x,y]`) / `type` / `key`（如 `ctrl+s`）/ `mouse_move`。
  - `computer_20250124`+：`scroll`（带方向/量）/ `left_click_drag` / `right_click` / `middle_click` / `double_click` / `triple_click` / `left_mouse_down` / `left_mouse_up` / `hold_key`（按住 N 秒）/ `wait`。
  - `computer_20251124`：新增 `zoom`（需工具定义 `enable_zoom: true`，传 `region:[x1,y1,x2,y2]` 看局部全分辨率——用于看小字/文件名/行号/标签）。
  - 修饰键：在 click/scroll 上用 `text` 参数（`shift`/`ctrl`/`alt`/`super`），区别于会持续按住的 `hold_key`。
- **规划**：无独立 planner；靠模型逐步视觉推理 + extended/adaptive thinking。effort 建议（官方内部 benchmark）：Opus 4.7 默认 `high`（成本敏感用 `low`）；Sonnet 4.6 / Opus 4.6 默认 `medium`，避免 `max`（不提准确率只加成本）。
- **多 agent 交接**：Computer Use 本体**无内建多 agent/交接机制**——它是单 loop 单 session。多 agent 需上层框架（如 Claude Agent SDK）自行编排。
- **人在环（HITL）**：两条设计——(1) prompt-injection 分类器命中时**自动**插入用户确认；(2) 官方强烈建议对金融交易、接受 cookie/ToS 等**有真实后果的动作**要求人工确认。
- **沙箱**：官方四条硬建议——专用低权限 VM/容器；不给敏感凭据；把上网限制到域名 allowlist；对高后果动作插人工确认。图像尺寸限制：Sonnet 5 / Opus 4.8 / Opus 4.7 长边可到 **2576px**；更早模型长边 **1568px**、总量约 1.15MP；单边 >8000px 直接被拒。推荐工作分辨率 **XGA 1024×768**（准确率最佳，更高分辨率应缩放）。**ZDR 合规**：本 feature 支持 Zero Data Retention。

---

## 6. 与同类相比的独特设计取舍（为什么有人选它）

- **纯视觉、无障碍无关**：对比基于 DOM/accessibility-tree 的浏览器 agent（含 Anthropic 自家 `browser-use-demo` 走 Playwright + DOM），Computer Use 走**像素级视觉**，泛化到任何 GUI（桌面软件、canvas、游戏、远程桌面），代价是坐标点击更易错、更慢、更贵（每步一张截图）。
- **能力内建于模型 vs 框架逻辑**：动作决策由 Claude 权重承担，harness 极薄——你几乎只需实现「执行动作 + 回传截图」。取舍：**强绑 Claude，不可换模型**；换来的是省掉外部 grounding/OCR 模型。
- **官方参考实现 + 三云可用**：Anthropic API / AWS Bedrock / Google Vertex 三处一致可用（首发即三云），MIT 参考实现可直接 docker run 起。
- **安全被当一等公民**：内置 injection 分类器 + 自动求确认，是多数第三方 computer-use 方案没有的。
- **谁会选它**：需要操作**无 API 的老系统/任意网站**、且已在 Claude 生态里、愿意接受 beta 与像素点击误差的团队（QA 自动化、RPA、跨应用工作流）。不适合：追求 model-agnostic、或有稳定 API 可调的场景。

---

## 7. 采用度信号

- **参考实现仓库**：`anthropics/anthropic-quickstarts` **约 17.2k stars**（WebFetch 读取时点约 2026-07；该仓库含 6 个 quickstart，computer-use-demo 只是其一，star 非专属于它）（[GitHub](https://github.com/anthropics/anthropic-quickstarts)）。⚠️ 未找到 computer-use-demo 子目录的独立采用数据。
- **首发署名早期采用者**：Asana、Canva、Cognition、DoorDash、Replit、The Browser Company（[anthropic.com/news](https://www.anthropic.com/news/3-5-models-and-computer-use)）。
- **能力势头（OSWorld，衡量 GUI 操作的核心基准）**——清晰的逐代跃升：
  - 首发 Claude 3.5 Sonnet：screenshot-only **14.9%**（次优系统 7.8%），加步骤 **22.0%**（[anthropic.com/news](https://www.anthropic.com/news/3-5-models-and-computer-use)）。
  - Claude Opus 4.5：OSWorld **约 66.3%**（P@1, avg@5）（二手汇编，⚠️单来源 [Vellum](https://www.vellum.ai/blog/claude-opus-4-6-benchmarks)）。
  - Opus 4.6 约 **72.7%** → Opus 4.7 更新后 **82.3%** → Opus 4.8（OSWorld-Verified）**87.1%**（二手汇编，⚠️数字来自 Vellum/第三方，未逐一在官方 system card 复核）。
- **生态延伸**：Computer Use 已成 Anthropic **Claude for Chrome** 浏览器 agent 的底层能力（2025-12 起对所有付费计划 beta），是采用度最强的间接信号（[Engadget](https://www.engadget.com/ai/claudes-chrome-plugin-is-now-available-to-all-paid-users-221024295.html)）。
- ⚠️ **未找到公开数据**：Computer Use API 的调用量/收入/DAU；GA 时间表。

---

## 8. 来源（URL）

1. Computer use tool（官方平台文档，工具版本/动作/agent loop/尺寸限制/安全）— https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
2. Introducing computer use, a new Claude 3.5 Sonnet, and Claude 3.5 Haiku（首发公告/OSWorld/早期采用者/限制）— https://www.anthropic.com/news/3-5-models-and-computer-use
3. anthropic-quickstarts 仓库（MIT 许可、star 数、quickstart 清单）— https://github.com/anthropics/anthropic-quickstarts
4. computer-use-demo README（Docker/Xvfb/VNC/端口/三云/安全警告）— https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/README.md
5. computer-use-demo `loop.py`（sampling_loop/图像裁剪/prompt caching/provider）— https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/computer_use_demo/loop.py
6. Claude's Chrome plugin now available to all paid users（computer use 作为 Chrome agent 底层）— https://www.engadget.com/ai/claudes-chrome-plugin-is-now-available-to-all-paid-users-221024295.html
7. Claude Opus 4.6 Benchmarks（OSWorld 逐代进展，⚠️二手）— https://www.vellum.ai/blog/claude-opus-4-6-benchmarks
