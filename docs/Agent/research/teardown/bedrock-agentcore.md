# AWS Bedrock AgentCore 事实底稿

> 快照:2026 年年中(2026-07)。只写可溯源断言;估算/推断已显式标注。

## 1. 一句话定位

Amazon Bedrock AgentCore 是 AWS 的**框架无关、模型无关的托管 agent 运行平台**——一组可独立或组合使用的模块化托管服务(运行时、身份、记忆、工具网关、浏览器、代码解释器、可观测性等),用来把「用任意框架/任意模型写好的 agent」安全地部署、扩展、治理到生产环境。它**不是一个 agent 框架、也不是一个编排 DSL**,而是 agent 之下的**平台 / 基础设施层**。

- **出品方**:Amazon Web Services(AWS),属 Amazon Bedrock 产品线。
- **许可 / 形态**:核心是**闭源托管云服务**(按用量计费,无预付)。配套开源工具在 Apache-2.0 下:Python SDK(`aws/bedrock-agentcore-sdk-python`)、AgentCore CLI(`aws/agentcore-cli`)、starter toolkit、samples。**平台本体不开源**。
- **2026 年状态:活跃、扩张中**。时间线:2025-07 预览发布;**2025-10-13 GA**(Runtime / Memory / Gateway / Identity / Observability 五大件转正);2025-12 又发一批 preview(Policy、Evaluations 等)。未改名、未被收购、未停更。2026-01 新增独立的 `agentcore-cli` 仓库(旧 starter toolkit 标注为 legacy),说明工具链仍在迭代。

## 2. 解决什么问题 / 栈中位置

**问题**:开源 agent 框架(LangGraph、CrewAI、Strands 等)能在本地把 agent 写出来,但生产化要自己解决:会话隔离与安全、身份与凭证、长时/异步执行、记忆持久化、工具接入、可观测性、合规护栏。AgentCore 把这些「无差别的重活」做成托管服务。

**栈中位置**:**平台 / 基础设施层**,位于 agent(推理循环)之下、云基础设施之上。

- **与框架的关系**:框架无关。开发者的 agent 逻辑(循环、规划、工具选择)仍由所选框架决定;AgentCore 提供托管的宿主与周边服务。官方点名兼容 LangGraph、CrewAI、LlamaIndex、Strands Agents、Google ADK、OpenAI Agents SDK,以及自定义无框架代码。
- **与底层 LLM 的关系**:模型无关。**不绑定 Bedrock 模型**——可用 Bedrock 内的 Claude/Nova/Llama/Mistral,也可用 Bedrock 外的 OpenAI、Google Gemini 等。模型调用由 agent 代码自己发起,AgentCore 不代管推理(Gateway 的 model-based routing 是可选的统一转发,非必需)。
- **注意区分**:AgentCore ≠ 早期的 "Amazon Bedrock Agents"(那是 AWS 托管的、绑定 Bedrock 的 agent 编排产品)。AgentCore 是更底层、更开放的新平台。

## 3. 架构与核心组件(点名真实构件)

模块化服务(可独立、可组合):

| 组件 | 是什么 | 关键技术点 |
|---|---|---|
| **Runtime** | serverless agent/工具宿主(执行器) | 每会话独立 **microVM**(隔离 CPU/内存/文件系统);最长 **8 小时**执行;冷启动快;100MB payload;HTTP/WebSocket 双向流;不可变版本 + endpoint 路由 |
| **Memory** | 短期 + 长期记忆 | 短期=单会话逐轮上下文;长期=跨会话抽取(语义事实、摘要、用户偏好);2025-12 加**情景记忆(episodic)**;可跨 agent 共享记忆库 |
| **Gateway** | 工具/agent/模型的统一 AI 网关 | 把 OpenAPI / Smithy / Lambda 转成 **MCP 工具**;接入既有 MCP server;passthrough 到其他 agent(A2A)与 HTTP 服务;**语义工具检索**;入站+出站双向鉴权 |
| **Identity** | agent 身份 + 凭证管理 | 兼容任意 IdP(Cognito、Okta、Entra ID、Auth0);**token vault** 存刷新令牌;入站(SigV4/OAuth2)+ 出站(OAuth/API key,用户委托 或 自主模式) |
| **Code Interpreter** | 隔离沙箱执行代码 | Python/JS/TS;隔离环境 |
| **Browser** | 云端托管浏览器工具 | 供 agent 填表/导航/抓取;兼容 Playwright、BrowserUse |
| **Observability** | 端到端追踪/调试/监控 | **OpenTelemetry(OTEL)** 标准输出;CloudWatch/Datadog/LangSmith/Langfuse;捕获推理步骤、工具调用、模型交互;session/latency/token/error 指标 |
| **Payments** *(较新)* | agent 微支付 | **x402 协议**;钱包(Coinbase CDP、Stripe/Privy);支出上限 |
| **Policy** *(2025-12 preview)* | 确定性护栏 | 自然语言或 **Cedar** 规则;经 Gateway **在工具调用执行前拦截**每次 tool call |
| **Evaluations** *(2025-12 preview)* | agent 质量评测 | 13 个内置评估器(helpfulness、工具选择、准确性等)+ 自定义模型打分;基于 session/trace/span |
| **Optimization** *(较新)* | 持续改进 | 基于 traces 给出 system prompt / 工具描述优化建议,经 Gateway 流量拆分做 A/B |
| **Registry** *(较新)* | agent/MCP/工具目录 | 语义+关键词检索、发布审批治理 |
| **Harness** *(较新)* | 托管 agent 循环 | 单 API 调用:指定 model+system prompt+tools;平台代管编排/工具执行/记忆/生成;每会话跑在带文件系统与 shell 的隔离 microVM |

> 注:上表中 Payments / Optimization / Registry / Harness 出现在官方文档「Core services」总表,但其单独发布日期/GA 状态本次未逐一核实(**未找到统一的发布状态清单**)。Policy / Evaluations 明确为 2025-12 preview。

## 4. 一步步怎么运转(控制/编排回路)—— 最重要

以 **Runtime** 承载一个自定义 agent、请求实际流经的回路为例:

**部署期(一次性):**
1. 开发者写 agent 逻辑(任意框架/模型)。用 AgentCore SDK 暴露约定的 HTTP 端点:HTTP 协议下容器须在 **8080 端口** 提供 `POST /invocations`(处理)和 `/ping`(健康/异步状态);SDK 里就是 `BedrockAgentCoreApp` + `@app.entrypoint` + `app.run()`。(MCP 协议走 8000 端口 `/mcp`;A2A 走 9000 端口根路径 JSON-RPC 2.0;AG-UI 走 8080。)
2. 打包 `requirements.txt`,构建容器镜像推到 **ECR**。
3. `CreateAgentRuntime` 创建运行时——自动生成不可变 **V1** 与 **DEFAULT** endpoint。每次改配置(镜像/协议/网络)生成新版本;endpoint 指向某版本,可无停机切换/回滚。

**调用期(每个用户请求):**
4. 客户端为每段对话生成唯一 `runtimeSessionId`,调用 `InvokeAgentRuntime`(或 WebSocket 版),带上 agent ARN + session id + payload。
5. **入站鉴权(Inbound Auth,由 Identity 支撑)**:先验证调用者。IAM SigV4 或 OAuth2——校验 IdP 签发的 bearer token(discovery URL、allowed audiences/clients)。通过才放行。
6. endpoint 把请求解析到具体 agent 版本。
7. **会话映射到 microVM**:相同 `runtimeSessionId` 复用同一 microVM(保持上下文);新 session 起新 microVM,拥有隔离的 CPU/内存/文件系统。会话状态:Active / Idle / Terminated。
8. payload 交给容器 `/invocations`,进入**开发者自己框架的 agent 循环**(推理→规划→工具选择由框架负责,AgentCore 不替它决策)。
9. 循环中按需与周边服务交互:
   - 调 **Memory**:取短期上下文/长期偏好,写回新事实;
   - 经 **Gateway** 调工具:Gateway 做语义工具检索→翻译(MCP/JSON-RPC → 目标 API / Lambda 调用)→注入该工具的凭证(出站鉴权)→返回结果;
   - **出站鉴权(Outbound Auth)**:访问 Slack/GitHub/第三方时,Identity 以「用户委托」或「自主」模式取/换 token;
   - 若启用 **Policy**:每次 tool call 在执行前被 Cedar 规则拦截判定;
   - 需要跑代码 → **Code Interpreter** 沙箱;需要操作网页 → **Browser**;
   - 全程向 **Observability** 发 OTEL trace(每一步 span)。
10. **返回**:一次性 JSON,或 SSE/WebSocket 流式增量返回。
11. **异步/长时**:超出请求/响应周期的任务后台跑,`/ping` 上报状态,最长 8h。文件系统可跨 stop/resume 持久化(装好的包、构建产物存活)。
12. **终止**:15 分钟无活动、或到 8h 上限、或判定不健康 → 整个 microVM 销毁、内存清零。会话态是易失的;要长期持久化必须用 **Memory**。

**关键取舍**:AgentCore **只管"外壳与周边"**(隔离、身份、记忆、工具接入、观测、护栏),**推理循环本身留给你的框架**。这是它与「自带 agent 循环」的托管产品的根本区别。

## 5. Harness 层设计

- **上下文/记忆**:Runtime 会话在 microVM 内维持进程内上下文;跨轮/跨会话的持久记忆交给 Memory 服务(短期逐轮、长期抽取语义/摘要/偏好、2025-12 加情景记忆),而非塞进 prompt。记忆库可跨 agent 共享。
- **工具接口**:标准化到 **MCP**。Gateway 是工具层核心——把 OpenAPI/Smithy/Lambda/既有 MCP server 统一成 MCP 工具,并用**语义工具检索**让 agent 在上千工具中按任务上下文选择,压 prompt、降延迟。凭证按工具注入,agent 代码不碰密钥。
- **规划**:平台**不提供规划器**;规划由开发者的框架承担。(Harness 组件是例外:它托管一个 agent 循环,但仍是「你给 model+tools,它跑循环」,非固定规划算法。)
- **多 agent 交接**:靠协议而非内建编排器——**A2A**(9000 端口,JSON-RPC 2.0,Agent Cards 做发现)用于 agent 间通信;Gateway 可 passthrough 到其他 agent。多 agent 的编排逻辑仍在框架层。
- **人在环**:文档举例(客服升级到人工)体现 HITL 是应用层模式;平台侧未见专门的内建 HITL 原语(**未找到内建 HITL 原语的明确文档**)。
- **沙箱**:三层——Runtime 每会话 microVM(强隔离,内存销毁清零)、Code Interpreter 代码沙箱、Browser 托管浏览器。
- **护栏/治理**:Policy(Cedar,tool call 前置拦截)+ Identity(身份/凭证)+ Observability(审计)+ Evaluations(质量门禁)。

## 6. 独特设计取舍(为什么有人选它)

- **彻底框架无关 + 模型无关**:不逼你用某框架或某模型;甚至不逼你用 Bedrock 上的模型(可接 OpenAI/Gemini)。对已在 LangGraph/CrewAI/Strands 上投资的团队,迁移成本低。
- **模块可拆用**:每个服务能独立采用——只想要托管记忆、或只想要 Gateway,都行,不必全家桶。
- **microVM 级会话隔离**:每会话独立 microVM + 结束销毁清零,面向企业/合规;这是相对「共享容器 + 逻辑隔离」方案的强安全卖点。
- **8 小时长时执行 + 文件系统持久化 + 100MB payload**:面向真正的长时/异步/多模态 agent,而非只跑短对话。
- **企业级接入**:VPC / PrivateLink / CloudFormation / 资源标签(GA 起全服务支持)、原生 IdP 集成、OTEL 可观测。
- **代价/取舍**:AWS 锁定(核心闭源、按用量计费、组件多计费维度)、心智负担重(十余个组件);且平台**不给你 agent 循环/规划**——它更像「生产化底座」而非「开箱即用的 agent」。要即用型托管 agent 编排,反而是老的 Bedrock Agents 或第三方框架更省事。

## 7. 采用度信号

- 官方 samples 仓库 `awslabs/agentcore-samples`(即 `amazon-bedrock-agentcore-samples` 的规范名):**约 3,163 star / 1,227 fork**(GitHub API,2026-07-02)。
- Python SDK `aws/bedrock-agentcore-sdk-python`:**约 735 star / 129 fork**(2026-07-02),2025-07 创建,仍活跃(pushed 2026-07-02)。
- starter toolkit `aws/bedrock-agentcore-starter-toolkit`:**约 498 star / 151 fork**(2026-07-02),已标注 legacy,指向新 CLI。
- 新 `aws/agentcore-cli`:**约 200 star / 52 fork**(2026-07-02),2026-01 创建——工具链仍在积极演进。
- **势头**:2025-07 预览 → 2025-10 GA → 2025-12 再发一批 preview(Policy/Evaluations)+ 情景记忆 + 语音双向流,半年内节奏很快;9 个 AWS Region;AWS 大力宣发。
- **具名用户**:本次**未找到可靠的具名生产客户列表**(除官方博客/案例中的泛化叙述外),不做断言。

## 8. 来源

- 官方文档 · Overview(组件总表):https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- 官方文档 · Runtime How it works(会话/microVM/版本/endpoint/鉴权):https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html
- 官方文档 · Runtime 服务契约(端口/端点/协议对比):https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html
- 官方文档 · Gateway(工具层/MCP/语义检索/双向鉴权):https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html
- 官方文档 · Memory(短期/长期/策略):https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html
- AWS News Blog · 预览发布(架构/SDK 集成模式):https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-agentcore-securely-deploy-and-operate-ai-agents-at-any-scale/
- AWS What's New · GA(2025-10-13,组件/企业特性/Region):https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available/
- AWS What's New · Policy & Evaluations preview(2025-12):https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-bedrock-agentcore-policy-evaluations-preview/
- GitHub API(star/fork,2026-07-02):`aws/bedrock-agentcore-sdk-python`、`awslabs/agentcore-samples`、`aws/agentcore-cli`、`aws/bedrock-agentcore-starter-toolkit`
