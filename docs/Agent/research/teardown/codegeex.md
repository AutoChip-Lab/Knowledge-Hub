# CodeGeeX 事实底稿(快照:2026 年年中)

> 教学站内部研究底稿。只保留可溯源断言;估算/未证实项已显式标注。

## 0. 一句话

CodeGeeX 是清华 THUDM 起家、由智谱/Z.ai(zai-org)出品并商业化的**开源多语言代码大模型 + IDE 编码助手插件**:一端是可下载权重的代码 LLM(最新公开权重为 CodeGeeX4-ALL-9B,基于 GLM-4-9B),另一端是装进 VS Code / JetBrains 的补全 + 对话插件。它本身**不是 agent 框架或编排平台**,而是「模型 + IDE 助手」这一层。

---

## 1. 定位 / 出品方 / 许可 / 2026 状态

- **定位**:面向 20+(插件宣称 100+)编程语言的代码补全、生成、翻译、解释、Q&A 的编码助手,底层是自研代码 LLM。KDD 2023 论文《CodeGeeX: A Pre-Trained Model for Code Generation with Multilingual Evaluations on HumanEval-X》。
- **出品方**:最初为清华大学 THUDM(知识工程组/数据挖掘组)研究项目;后随智谱 AI(Zhipu AI / Z.ai,北京智谱华章)商业化。GitHub 组织已从 `THUDM` 迁移/重命名到 **`zai-org`**(旧仓库同步搬迁)。智谱于 **2026-01-08 在香港上市(2513.HK)**,自称全球首家上市的 LLM 公司。
- **许可**:代码 **Apache-2.0**;模型权重走单独的自定义 `MODEL_LICENSE` —— 学术使用开放,**商用需注册**(非纯 OSI 开源许可)。
- **2026 状态(关键分叉,须讲清)**:
  - **模型仓库层已基本停更**:`zai-org/CodeGeeX4` 最近一次提交为 **2024-08-25**(此后未见公开新版权重),快照时点看起来处于休眠。CodeGeeX 系列本体没有发布 5 代公开权重。
  - **IDE 插件层仍在活跃迭代**:VS Code 扩展(`aminer.codegeex`)最新 **v2.27.6,发布日 2026-06-08**;JetBrains 插件 **v2.27.4-223,2025-12-11** 上线,changelog 出现「Add agent」。
  - 合理推断(**未在一手文档确证**):插件后端的对话/agent 能力如今很可能改接智谱更新的 GLM 系列(如 GLM-4.6 / GLM-4.7,后者 2025-12-22 开源、主打 agentic coding),而非固定绑死 9B 权重;插件里出现「Pro/Lite 模型选择」也印证这点。**此为推断,官方 CodeGeeX 文档未明说当前默认模型版本。**

---

## 2. 解决什么问题 / 在 agent 技术栈里的位置

- **问题**:在编辑器里提供高质量代码补全(含跨文件/FIM 填空)、自然语言到代码、代码翻译、单测、代码审查、仓库级问答,并给出**可自部署的开源代码模型**替代闭源补全(Copilot 类)。
- **栈内位置**:属于「**基础模型 + IDE harness 助手**」层,**不是**通用 agent 编排框架(不像 LangGraph / AutoGPT),也不是 Cline / Cursor 那种以自主多步执行为核心的 coding agent。
  - CodeGeeX4-ALL-9B 官方宣称具备 **code interpreter、web search、function call、repository-level Q&A** —— 即它给了「agent 能力的原材料/单模型工具调用」,但**没有公开一套多步自主规划-执行循环的框架代码**(README 只给 System Prompt / Infilling / Repository Tasks / Local Mode 四份 guideline,未提供 `/agent/` 编排目录)。
- **与底层 LLM 的关系**:CodeGeeX 就是 LLM 的名字,同时也是套壳在其上的助手产品。演进链:CodeGeeX(13B,自研)→ CodeGeeX2-6B(基于 ChatGLM2-6B)→ CodeGeeX4-ALL-9B(基于 GLM-4-9B)。因此它与 GLM/ChatGLM 家族**同源共祖**,是 GLM 通用模型在代码域的持续预训练分支。

---

## 3. 架构与核心组件(点名真实构件)

**(a) 模型本体**
- 初代 CodeGeeX:13B 参数,**Transformer decoder,40 层,hidden 5120,最大序列长 2048**;MindSpore 实现,在 **1536 张昇腾 Ascend 910** 上训练,**>850B token**(2022-04-18 至 2022-06-22),23 种语言约 158.7B 代码 token。
- CodeGeeX2-6B:基于 ChatGLM2-6B,再训 **600B 代码 token**。
- CodeGeeX4-ALL-9B:基于 **GLM-4-9B**,**128K 上下文**;宣称 <10B 内最强代码模型,function call 执行成功率宣称优于 GPT-4(一手 README 断言,未独立复核)。

**(b) 助手/插件侧构件(从 guideline 与插件功能反推)**
- **补全引擎 / FIM 填空层**:general、cross-file(跨文件上下文)、new-file 三类填空模式。
- **对话/Q&A 层**:多轮对话 + System Prompt 定制(有 System Prompt Guideline)。
- **仓库任务层(Repository Tasks)**:仓库级 Q&A + 文件修改,是最接近「agent」的部分。
- **工具能力(单模型内置)**:code interpreter(执行代码)、web search、function call。
- **Local Mode**:本地起模型(Ollama / vLLM / HF Transformers / Rust-Candle),IDE 扩展连本地端点,数据不出内网 —— 这是它作为「可私有部署 harness」的卖点。
- **无公开的独立消息总线 / 多 agent 角色 / 沙箱编排框架**:未找到公开资料描述这些构件;code interpreter 的执行沙箱细节**未找到公开数据**。

---

## 4. 一步步怎么运转(控制/编排回路)——最重要

⚠️ 前置说明:CodeGeeX 未公开完整 agent 编排源码,下述回路是从官方四份 guideline、插件功能列表与部署文档**综合重建**的,**非逐行源码级**。

**回路 A — 内联补全(主力路径,始终在跑)**
1. 用户在 IDE 打字/停顿(插件 stealth 模式在停顿时自动触发)。
2. 插件采集当前光标上下文 + **跨文件上下文**,组装成 **FIM(fill-in-the-middle)填空 prompt**(prefix / suffix)。
3. 发往模型端点(在线 codegeex.cn 或本地 Local Mode 端点)。
4. 模型返回候选补全;交互模式下 Ctrl+Enter 给多候选。
5. 插件把补全 inline 渲染,用户 Tab 接受。**此路径无多步循环、无工具调用**,是一次性生成。

**回路 B — 对话 / 仓库级 Q&A(带工具的路径)**
1. 用户在侧边栏发问(可选 Pro/Lite 模型)。
2. 助手按 System Prompt 组装多轮上下文;若是仓库级问题,先做**代码检索/仓库上下文注入**(repository-level Q&A),把相关文件片段塞进 128K 上下文窗口(Code NIAH 128K 检索准确率官方称 100%)。
3. 模型生成答复;**若判断需要工具**,产出 function call / code interpreter / web search 请求。
4. 外层(插件/运行时)执行该工具,把结果回灌为下一轮观察(observation),模型据此续写 —— 构成一个**单模型 ReAct 风格的「模型出意图 → 宿主执行 → 结果回灌」小循环**。
5. 涉及改文件时(Repository Tasks),模型产出编辑,插件应用到工作区。

**回路 C — 代码翻译 / 单测 / 审查(模板化单步)**
- 由固定 prompt 模板(prompt mode / 快捷键,如 Ctrl+Alt+T 翻译)一次性调用模型,基本无循环。

**要点**:CodeGeeX 的「编排」重心在**上下文组装(FIM + 跨文件 + 仓库检索)**与**单模型工具调用**,而**不是**长程自主任务分解。多份 2026 评测明确指出它「不像 Cline/Cursor 那样自主规划并执行多步变更」;JetBrains 端 2025-12 才加「agent」词条,能力边界仍以问答/编辑为主(**其 agent 模式的具体自主程度未见一手文档详述,存在评测口径冲突**)。

---

## 5. harness 层设计

- **上下文/记忆**:128K 窗口;补全侧靠 FIM + cross-file 上下文拼装;对话侧靠多轮 System Prompt;仓库级 Q&A 靠检索式上下文注入。**未见持久化长期记忆 / 向量记忆存储的公开描述**。
- **工具接口**:function call(结构化工具调用)、code interpreter(执行)、web search —— 均为**单模型内置能力**,由宿主运行时执行并回灌;**未找到公开的标准化工具注册协议(如 MCP)描述**(快照时点)。
- **规划**:无公开的显式 planner/子任务分解模块;属「模型隐式规划」。
- **多 agent 交接**:**未找到公开数据**——无多角色/交接机制文档。
- **人在环**:强人在环 —— 补全需 Tab 接受、编辑需人工 apply,默认非自动落盘。
- **沙箱**:Local Mode 提供数据不出内网的私有部署;code interpreter 的执行隔离/沙箱实现细节**未找到公开数据**。

---

## 6. 独特设计取舍(为什么有人选它)

- **可自部署的真开源代码模型**:9B 权重可下载,Ollama/vLLM/HF/Rust-Candle 多路径本地跑,IDE 连本地端点 —— 对数据敏感/内网团队友好,这是相对 Copilot/Cursor 的核心差异。
- **小而全**:<10B 参数塞进补全 + 对话 + interpreter + 搜索 + 函数调用 + 仓库 Q&A,主打推理速度与性能平衡;适合低成本本地部署而非追求 frontier 推理。
- **代价**:9B 体量在复杂多步推理上被评测点名为天花板;**缺少真正的自主 agent 循环**,不适合「给个目标自己干完多文件重构」的用例;商用需注册(许可摩擦);模型本体 2024-08 后停更,产品力主要靠插件 + 疑似换用更新 GLM 后端维持(**后者为推断**)。
- **选它的人**:要免费/开源补全、要私有化部署、要多语言 + 中文技术问答、又不需要强自主 agent 的团队。

---

## 7. 采用度信号

- GitHub:`zai-org/CodeGeeX`(初代)约 **8.8k star / 687 fork**;`zai-org/CodeGeeX4` 约 **2.6k star / 263 fork**(均为本次抓取时点读数,非官方公告数)。
- JetBrains 插件:**约 995,515 次下载,评分 3.7(114 评)**(抓取时点)。
- VS Code 扩展(`aminer.codegeex`):**约 1,297,590 安装**,最新 v2.27.6(2026-06-08)(抓取时点)。
- 势头:模型研究侧(权重/论文)势头已过、停更;**产品/插件侧仍在持续发版并保有百万级安装量**,属「稳定长尾、非前沿热点」。知名企业级具名客户**未找到公开数据**。

---

## 8. 来源

1. https://github.com/zai-org/CodeGeeX4 — CodeGeeX4-ALL-9B README(基座 GLM-4-9B、128K、benchmark、能力、许可、四份 guideline)
2. https://github.com/zai-org/CodeGeeX — 初代模型仓库(13B/40 层/Ascend 910/850B token/HumanEval-X、许可、star)
3. https://github.com/zai-org/CodeGeeX4/commits/main — 提交历史(证实最近提交 2024-08-25,已休眠)
4. https://plugins.jetbrains.com/plugin/20587-codegeex-ai-coding-assistant — JetBrains 插件(下载量、v2.27.4-223 2025-12-11「Add agent」)
5. https://marketplace.visualstudio.com/items?itemName=aminer.codegeex — VS Code 扩展(安装量、v2.27.6 2026-06-08、Pro/Lite 模型选择)
6. https://vibecoding.app/blog/codegeex-review — 2026 评测(明确「无自主多步 agent」、功能与定价)
7. https://arxiv.org/abs/2303.17568 — KDD 2023 论文《CodeGeeX ... Multilingual Evaluations on HumanEval-X》
8. https://huggingface.co/THUDM/codegeex2-6b — CodeGeeX2-6B(基于 ChatGLM2-6B、+600B token,2023-07)

---

### 未能核实 / 冲突项(讲课时须标注)
- **当前插件后端默认模型版本**(是否已换 GLM-4.6/4.7):推断,官方 CodeGeeX 文档未明说。
- **JetBrains「Add agent」的实际自主程度**:评测口径与 changelog 冲突,未见一手能力说明。
- **code interpreter 执行沙箱 / 隔离实现**:未找到公开数据。
- **多 agent 交接、持久记忆、标准工具协议(如 MCP)**:未找到公开描述。
- **具名企业客户**:未找到公开数据。
- star/下载数均为抓取时点读数,非官方发布数字。
