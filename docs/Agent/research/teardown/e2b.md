# E2B —— AI agent 云端代码执行沙箱

> 事实底稿快照:2026 年 7 月初。所有星标/版本数据以 2026-07-04 GitHub API 实测为准。

## 1. 一句话定位

E2B(读作 "e-two-b",取自 "environment to business")是**为 AI agent 提供云端隔离沙箱、执行 LLM 生成代码的开源基础设施**。每个沙箱是一台按需启动的 Firecracker microVM(带完整 Linux、文件系统、shell、联网),官方定位语是 "The Enterprise AI Agent Cloud" / "Open-source, secure environment with real-world tools for enterprise-grade agents"。

- **出品方**:E2B(公司注册在美国旧金山,创始团队来自捷克)。创始人 Tomáš Valenta、Vasek(Václav)Mlejnský,公司成立于 2023 年。
- **许可**:主仓库 `e2b-dev/E2B`、`code-interpreter`、`infra`、`desktop` 均为 **Apache-2.0**;但 PyPI 上的基础包 `e2b`(v2.30.0,2026-06-25 发布)标注为 **MIT**。也就是 SDK 与自托管基础设施都开源可自部署,托管云是 freemium + 按秒计费。
- **2026 年状态**:**活跃**。未改名、未被收购。2025-07-28 完成 **2100 万美元 A 轮**(Insight Partners 领投,Decibel、Sunflower Capital、KAYA 及 Docker 前 CEO Scott Johnston 等天使跟投);累计融资约 3500 万美元。主仓库最后 push 为 2026-07-03/07-04(高频活跃)。

## 2. 解决什么问题 / 在 agent 栈里的位置

**问题**:LLM 会生成代码(Python/JS/shell)或想"操作电脑",但直接在生产主机上跑 LLM 生成的不可信代码有安全与稳定性风险。E2B 提供一个**一次性、隔离、可联网、有状态**的 Linux 环境,让生成代码"永远不碰你的基础设施"。

**栈内位置**:E2B 是**基础设施 / 执行器层(execution layer / sandbox),不是 agent、不是编排框架**。它不含推理循环、不含 planner、不做工具选择——这些留给上层(LangChain / LlamaIndex / OpenAI SDK / 自研 agent loop)。E2B 只负责"给我一台干净机器,把这段代码跑了,把结果(含 stdout/stderr/图表/文件)还给我"。

**与底层 LLM 的关系**:**LLM 无关(model-agnostic)**。E2B 不内置任何模型;LLM 由调用方提供(OpenAI、Anthropic、开源模型等)。典型模式是:LLM 产出代码字符串 → E2B 执行 → 结果回喂 LLM 做下一步。官方演示大量对接 LangChain、OpenAI、Anthropic;computer-use 场景对接 OpenAI(Surf 项目)与开源 VLM(OS-Atlas/ShowUI 等,见 open-computer-use)。

## 3. 架构与核心组件(点名真实构件)

E2B 采用**双协议架构:控制平面(REST)与数据平面(gRPC)分离**。核心构件(名称来自 `e2b-dev/infra` 的 `packages/` 与 CLAUDE.md):

- **SDK(客户端)**:Python 包 `e2b` / `e2b-code-interpreter`,JS/TS 包 `e2b` / `@e2b/code-interpreter`。gRPC 传输在 JS 侧用 `@connectrpc/connect-web`,Python 侧用自定义 Connect RPC 客户端。
- **REST API(`packages/api/`,控制平面)**:Gin(Go)框架,负责沙箱生命周期(create/kill/timeout/pause/connect)、鉴权(API key / access token / OIDC),状态存 PostgreSQL + Redis,把 VM 操作下发给 orchestrator。
- **Orchestrator(`packages/orchestrator/`,控制平面)**:Firecracker microVM 的控制器,需 root。负责 VM 生命周期、网络(iptables + netlink)、存储(Network Block Device / NBD)、模板缓存(GCS)。对外暴露 gRPC 供 API 调用。
- **envd(`packages/envd/`,数据平面)**:**跑在每个 microVM 内部**的环境守护进程,监听 **端口 49983**,基于 Connect RPC。提供文件系统、进程/命令、PTY 终端 API。高频操作(读写文件、跑命令、watch 目录)**绕过 REST 直连 envd**。
- **Client Proxy / Edge(`packages/client-proxy/`)**:边缘路由层,经 **Consul** 做服务发现,把请求路由到正确的 orchestrator,状态存 Redis。
- **Template(模板)**:用户环境的初始镜像。**Dockerfile → 构建 → 转成 Firecracker microVM 快照**并注册到模板 registry;默认模板叫 `"base"`(配了 MCP 则为 `"mcp-gateway"`)。CLI(`e2b template build`)负责构建。
- **编排底座**:**Nomad**(作业调度)+ **Consul**(服务发现),IaC 用 Terraform/HCL(`iac/provider-gcp/`),主部署目标 GCP(AWS beta)。可观测性:OpenTelemetry → Grafana 栈(Loki/Tempo/Mimir),分析用 ClickHouse。仓库 87.9% 为 Go。
- **隔离技术**:**Firecracker**(与 AWS Lambda 同款 microVM/KVM);topic 中也出现 gVisor。冷启动官方口径约 **150ms(<200ms)**。

## 4. 一步步怎么运转(控制/编排回路)—— 最重要一节

下面是一个用户请求实际流经的回路。注意:**agent 循环在你的代码里,E2B 只是循环中的"执行工具"**。

**A. 上层 agent 侧(调用方的循环,E2B 之外)**
1. 用户提问 →(你的)agent 把问题 + 工具描述发给 LLM。
2. LLM 决定"我需要执行代码",产出一段代码字符串(如 Python)。

**B. 建沙箱(控制平面,REST)**
3. 调用方执行 `Sandbox.create(templateId)`(Python `Sandbox.create()` / JS 同名)。SDK 里的 `ConnectionConfig` 校验 `E2B_API_KEY`。
4. SDK 发 `POST /sandboxes` 到 REST API(默认域 `e2b.app`,`api.{domain}`)。
5. 请求经 Client Proxy → Consul 发现 → orchestrator。orchestrator:校验 key、分配资源、**在某个 host node 上拉起一台 Firecracker microVM**、在 VM 内启动 envd。
6. API 返回:`sandboxId`、`envdAccessToken`(`secure:true` 为默认)、`envdVersion`。默认 TTL **300 秒**(可运行上限:Hobby 1 小时、Pro 24 小时)。

**C. 执行代码(数据平面,gRPC → envd)**
7. SDK 用返回的 token 打开到 **envd:49983** 的 gRPC 通道(header 带 `envdAccessToken`)。
8. `run_code("...")`(code-interpreter SDK,内部对接一个 **Jupyter 内核**)或 `commands.run(...)` / `filesystem.write(...)` 通过 gRPC 直达 envd。
9. envd 在 VM 内执行,回传**结构化 execution 对象**:`stdout`、`stderr`、`results`(rich outputs,含图表/图片等)、`error`。有状态:同一沙箱内 `x=1` 后再 `x+=1; x` 返回 `2`(内核变量保留)。

**D. 回喂 LLM,进入下一轮**
10. 调用方把执行结果拼进对话上下文,再交给 LLM。LLM 或"完成"或"再写一段代码修 bug/继续分析" → 回到步骤 7,复用同一沙箱多轮迭代。

**E. 生命周期收尾**
11. 长任务可 `set_timeout()`/`setTimeout()` 续期;`get_info()` 查元数据。
12. 结束:`kill()` 立即销毁;或 `pause()` 挂起(见 §5),之后用 `connect()`/`Sandbox.connect(id)` 恢复。

关键点:**REST 管"机器的生死"(低频、API key 鉴权),gRPC/envd 管"机器里干活"(高频、access token 鉴权)**。这一分离是理解 E2B 的核心。

## 5. Harness 层设计

E2B **本身不是 harness**(不含记忆/规划/多 agent 交接逻辑),但它为上层 harness 提供关键原语:

- **上下文/记忆管理**:E2B 不管理 LLM 上下文窗口。它提供的"记忆"是**沙箱状态持久化**:`pause()` 冻结**文件系统 + 内存(运行中进程、已加载变量、数据全保留)**,`connect()` 恢复到同一状态。`keepMemory:false` / `keep_memory=False` 则只存文件系统(冷启动恢复)。性能:暂停约 **4 秒 / GiB RAM**,恢复约 **1 秒**;暂停后可**无限期保留**(目前无自动清理策略)。生命周期钩子:`lifecycle:{ onTimeout:'pause', autoResume:false }`(默认 `onTimeout:'kill'`)。**注**:persistence 处于 public beta,有已知 issue(如多次 resume 后文件变更不持久,见 e2b-dev/E2B #884)——需显式标注为 beta。
- **工具接口**:给 agent 的"工具"就是沙箱 API——`commands.run`(含后台进程、PTY)、`filesystem`(读写/上传下载/watch)、`run_code`(Jupyter 内核,富输出)。可对接 MCP(默认模板 `mcp-gateway`)。
- **规划**:**不提供**。planner 属上层。
- **多 agent 交接**:E2B 无原生 handoff;但沙箱可共享/传递 `sandboxId`,或 pause 后由另一进程 connect,实现"状态过继"。
- **人在环(HITL)**:通过 Desktop Sandbox(带图形界面的虚拟电脑)+ 可暴露的 HTTP 端口(`allowPublicTraffic` + `trafficAccessToken`)实现观察/接管;computer-use 场景由此支撑。
- **沙箱**:即产品本体——VM 级隔离(独立内核),每沙箱一台 microVM;联网、可装第三方包;支持任意 Linux 负载(Python/JS/Ruby/C++/R/Fortran 等,非单语言优化)。

配套产品:**Desktop Sandbox**(`e2b-dev/desktop`,给 LLM 的图形化虚拟电脑,computer-use)、**Fragments**(`e2b-dev/fragments`,AI 生成全栈 app 的 Next.js 模板)、**open-computer-use**(开源 VLM 驱动的电脑操作 agent)、**Surf**(OpenAI 驱动的 computer-use demo)。

## 6. 独特设计取舍(为什么有人选它)

- **VM 级隔离而非容器**:选 Firecracker microVM(独立内核 + 硬件虚拟化)而非共享内核容器,安全边界更强,可安心跑不可信 LLM 代码——代价是比纯容器重,靠快照/预热把冷启动压到 ~150ms 来抵消。
- **通用性优先于专用优化**:创始人明确"不为单语言优化",支持任意 Linux 负载。早期定位"cloud computer for AI"用户看不懂,后收敛到 "code interpreter" 叙事,再扩到 "agent cloud"。
- **开源 + 可自托管**:SDK 与整套 infra(Apache-2.0)可自部署到 AWS/GCP/Azure/BYOC/on-prem,规避供应商锁定——这是相对 Modal、Daytona、Vercel Sandbox 等闭源/半闭源方案的差异点。
- **SDK-first → API-first 演进**:创始人称正把能力做成"公共 API 可控",因为"最终是 LLM 自己想控制并采集这些数据",顺应用户从人类开发者转向 agent。
- **状态持久化(pause/resume 含内存)**:面向多轮 agent 工作流的差异化能力(beta)。

## 7. 采用度信号

GitHub 星标(**2026-07-04 实测**):
- `e2b-dev/E2B`(主 SDK/monorepo):**12,832**
- `e2b-dev/fragments`:**6,342**
- `e2b-dev/code-interpreter`:**2,356**
- `e2b-dev/open-computer-use`:**2,103**
- `e2b-dev/desktop`:**1,423**
- `e2b-dev/infra`:**1,210**

官网自报数据(**营销口径,未独立核实**):Fortune 100 中 **94%** 使用(注:A 轮新闻稿口径为 **88%**,存在版本差异,标注不一致)、月下载 **7M+**、累计启动沙箱 **1B+**。点名客户/用户:**Perplexity、Manus、Hugging Face、Groq、Lindy、Genspark**,以及 IBM watsonx 集成。生态集成:LangChain(有专门 data-analysis 集成与 `langchain-e2b`)、OpenAI、Anthropic。融资势头见 §1(2025-07 A 轮 2100 万美元)。

## 8. 来源

1. E2B 主仓库(README/许可/描述)—— https://github.com/e2b-dev/E2B
2. E2B infra 仓库 + CLAUDE.md(组件/Nomad/Consul/Firecracker/请求流)—— https://github.com/e2b-dev/infra/blob/main/CLAUDE.md
3. DeepWiki: E2B System Architecture(控制/数据平面、envd:49983、Sandbox.create 流程、鉴权)—— https://deepwiki.com/e2b-dev/E2B/1.1-system-architecture
4. 官方文档:Sandbox / 生命周期 / 超时 —— https://e2b.dev/docs/sandbox
5. 官方文档:Sandbox persistence(pause/connect、内存+文件系统、4s/GiB、beta)—— https://e2b.dev/docs/sandbox/persistence
6. code-interpreter SDK(run_code/富输出/Jupyter)—— https://github.com/e2b-dev/code-interpreter
7. A 轮融资(Insight Partners,2100 万美元,2025-07-28,88% Fortune 100)—— https://www.insightpartners.com/ideas/e2b-raises-a-21m-series-a-to-offer-cloud-for-ai-agents-to-fortune-100/
8. 官网(定位、客户名单、94%/7M/1B 自报数据、产品线)—— https://e2b.dev/

## 待核实 / 存疑标注

- **Fortune 100 占比**:官网 94% vs A 轮新闻稿 88% —— 口径不一致,均为公司自报,**未独立核实**。
- **7M+ 月下载 / 1B+ 累计沙箱**:营销口径,**未独立核实**。
- **persistence 的可靠性**:官方标 public beta,存在开源 issue 报告的状态不持久问题;生产使用需注意。
- **冷启动 ~150ms、快照恢复 5–30ms**:多来自官方/第三方博客,数字量级一致但**未做独立基准测试**。
- **员工数(约 37,Tracxn)**:第三方数据库口径,**未在官方核实**。
