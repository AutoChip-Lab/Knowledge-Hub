# 芯片设计完整流程 · DFT设计（Design for Test）

> 「芯片设计完整流程」DFT设计专题;本页是专题入口,不代表一个边界严格的串行阶段。
> 十三个编号主阶段:① 产品/市场需求 → ② 系统规格 → ③ 架构 → ④ 微架构 → ⑤ RTL → ⑥ 验证
> → ⑦ 综合 → ⑧ 物理设计 → ⑨ 签核 → ⑩ 流片 → ⑪ 制造 → ⑫ 封测 → ⑬ bring-up/量产。
> DFT设计涉及:③ 测试架构与覆盖率目标 → ④/⑤ 测试控制和可测逻辑 → ⑦ Scan/压缩/MBIST 插入与 ATPG → ⑧ Scan 链重排及测试时钟、功耗、拥塞收敛 → ⑨ 测试模式与覆盖率签核 → ⑫/⑬ ATE、诊断与良率学习。

---

## 0. 先看全景:DFT设计为什么会涉及多个主流程环节

```
③ 架构:定测试质量目标、测试接口、ATE 时间/功耗预算、存储器修复策略
  → ④/⑤ 微架构与 RTL:让时钟、复位、寄存器、存储器和电源域具备可测性
  → ⑦ 综合:产出 DFT-ready 网表、库、SDC/UPF 与宏测试模型
  ⇄ 主要落地窗口:综合网表后集中插 scan/压缩/MBIST/JTAG/OCC,启动 ATPG 与覆盖率收敛
  ⇄ ⑧ 物理设计:scan reorder、测试逻辑布局、测试时钟/功耗/布线协同收敛
  ⇄ ⑨ 签核:测试模式 STA、功耗、IR/EM、连接、等价性与最终图样验证
  → ⑫/⑬ ATE 与量产:逐颗筛选,失败数据回流诊断、图样优化与良率学习
```

Overview 不再把 DFT 画成综合与物理设计之间的普通圆形节点,而是用一个与主流程节点对齐的 DFT设计关联框,标出从架构规划到 ATE、诊断和良率学习的具体触点。不同公司会因工具链、IP 交付形态和实现方法而划出不同边界;常见做法是在综合网表形成后集中完成 scan/压缩、部分 MBIST 连接、测试点与 OCC 等结构插入,并启动 ATPG 和覆盖率收敛,但这只是**主要落地窗口**,不是 DFT 的起点或终点。此前若没有预留测试访问、存储器冗余、可控制的时钟/复位和测试功耗预算,此后若不继续处理物理可实现性、测试模式签核、图样上机和失效诊断,DFT 都不算真正闭环。

> 一句话定位:**功能验证证明“设计逻辑是否符合规格”;DFT 让量产测试能够回答“这颗真实制造出来的芯片有没有缺陷,而且能否在可接受的成本内把缺陷测出来”。**

---

## 1. DFT 到底是什么

一句话:**在不改变芯片正常功能的前提下,为内部逻辑、存储器和芯片边界增加可控制、可观察、可访问的测试结构,再依据制造故障模型生成测试图样,使晶圆测试和成品测试能够高质量、低成本地筛出坏片。**

### 先分清四件容易混淆的事
- **功能验证**找设计错误:RTL 是否实现了规格?协议、计算结果、异常处理是否正确?
- **结构化量产测试**找制造缺陷:开路、短路、固定值故障、速度异常、存储单元故障等是否存在?
- **功能/代码覆盖率**衡量验证环境探索得是否充分;**ATPG fault coverage**衡量某类抽象故障中有多少能被测试图样检测。它们不是同一个指标。
- DFT 不能证明功能设计正确;功能验证也不能替代制造测试。两者解决的是不同风险。

现代 SoC 内部有海量状态节点,外部引脚不可能直接控制和观察每个节点。DFT 的核心就是用少量测试端口和片上测试硬件,把深藏内部的节点变得**可控(controllable)、可观(observable)、可访问(accessible)**。

> 灵魂句:**DFT 是给芯片装一套“体检基础设施”——不仅要看得见问题,还要测得快、测得稳、定位得出、量产用得起。**

---

## 2. 谁来做 + 需要什么输入

**谁来做**:**DFT / test design engineer** 牵头,与 RTL、综合、物理设计、STA、低功耗、存储器/IP、ATE 测试、产品工程和良率团队协同。DFT 的结构在设计端完成,最终价值却要到测试机和量产数据里兑现。

**主要输入**:
- 已验证的 RTL 或 ⑦ 综合网表,以及标准单元库中的 scan cell / test model。
- 时钟、复位、时钟域、测试模式、功能/测试 SDC 与 OCC/PLL 方案。
- UPF/CPF 功耗域、掉电、隔离、保持与 always-on 策略。
- 所有嵌入式存储器的实例清单、端口时序、MBIST 模型、冗余行列和修复接口。
- 芯片/IP 测试接口要求:JTAG/TAP、core wrapper、IJTAG 仪器访问等。
- 产品质量目标及 fault model;ATE 通道数、频率、向量存储、测试时间和功耗上限。
- 持续更新的布局/分区信息,用于 physical-aware DFT、scan reorder、拥塞评估和测试功耗分析;后端 ECO 也会反向触发链与图样复核。
- 对 2.5D/3D 芯片,还需 die/stack 拓扑、die-to-die 接口及 pre-stack/post-stack 测试策略。

> 关键心态:**DFT 不是只追一个覆盖率数字,而是同时收敛测试质量、测试成本、PPA、功耗、物理可实现性和诊断能力。**

---

## 3. DFT 的核心内容(从规划到量产闭环)

每项给:**是什么 + 怎么做 + 关键边界/示例**。

### 3.1 DFT 规格、测试架构规划与可测性 DRC
- **是什么**:先定义测试模式、fault model、覆盖率目标、scan 通道/链长、压缩架构、MBIST 层次、JTAG/IJTAG 接入、ATE 数据量、测试时间和功耗预算。
- **怎么做**:在 RTL/早期网表上跑 DFT rule checking,检查不可控时钟/复位、组合环、锁存器、黑盒、三态、X 源、跨电源域路径与不可扫描寄存器;每个 waiver 都要有原因、责任人与验证证据。
- **关键边界**:DFT DRC 不是普通 lint。它关心测试模式能否可靠 shift/capture/observe;问题越早发现,返工越小。

### 3.2 测试访问架构:JTAG、Core Wrapper 与 IJTAG
- **是什么**:建立从芯片外部到内部测试资源的“路网”。IEEE 1149.1 JTAG/TAP 与 boundary scan 主要服务芯片边界、板级/封装互连和标准化访问;IEEE 1500 wrapper 便于嵌入式 core 的层次化测试;IEEE 1687(IJTAG)用于访问片上 MBIST、传感器和监控仪器。
- **怎么做**:规划 TAP 指令、测试数据寄存器、wrapper bypass、仪器网络、访问安全与层次化 pattern retarget;确认每个 IP 在 core 级和 SoC 级都能进入、旁路和退出测试模式。
- **不要混淆**:有 JTAG 不等于内部 logic scan 已完成;CPU debug 复用 TAP,也不代表制造测试架构自动成立。

### 3.3 Scan、测试压缩与可测结构插入
- **是什么**:把普通触发器映射为 scan FF,测试模式下串成 scan chain;再加入 decompressor / response compactor,用少量外部通道驱动大量内部短链。必要时插 observation/control test point 提升难测逻辑的可控可观性。
- **怎么做**:规划链数、最大链长、时钟域/电源域分组、scan enable、lockup latch、X-bounding/masking 与压缩比。正常模式下 scan mux 必须退出功能通路;插入后跑 chain connectivity 和功能模式 LEC。
- **权衡**:链越多,shift 时间越短,但通道和压缩网络更复杂;压缩比过高可能增加拥塞、X 处理难度与图样数,也可能降低诊断分辨率。
- *以 TPU v1 公开结构作示意*:大规模重复计算阵列与大量 SRAM 说明了为什么逻辑 scan/压缩和 memory DFT 都重要;但公开论文没有披露 TPU v1 的 scan 链数、压缩比、MBIST 架构或覆盖率,本页案例只讲通行方法,不把示意当成产品事实。

### 3.4 ATPG、故障模型与覆盖率收敛
- **是什么**:ATPG 根据抽象 fault model 自动寻找激励,让目标故障被激活并传播到可观察点;fault simulation 再确认每个图样检测了哪些模型故障。
- **常见模型**:**stuck-at**(节点固定为 0/1)、**transition**(slow-to-rise/fall,at-speed 基础)、以及按质量要求增加的 bridging、path-delay、cell-aware 等。
- **怎么做**:按模型分别生成/压缩图样,分析 detected、untestable、ATPG-untestable、aborted/未解析故障;对随机难测逻辑加 test point,对真实不可测项给出可审计 exclusion,迭代到覆盖率和 pattern count 同时达标。
- **关键边界**:fault coverage 不等于真实 defect coverage,更不等于最终 DPPM;后者还受缺陷分布、模型质量、参数测试和整个测试组合影响。报告不能只写一个“99%”。

### 3.5 存储器 DFT:MBIST、诊断、BIRA/BISR
- **是什么**:SRAM 等嵌入式存储器不适合只靠 logic scan。MBIST 控制器用 March 等读写序列测试存储阵列并记录失败位置;若宏有冗余行/列,BIRA 计算修复方案,BISR/eFuse/OTP 在上电时加载修复映射。
- **怎么做**:完成 memory inventory 与分组,匹配端口/时序/算法,平衡并行度和功耗,验证 fail capture、诊断、冗余分析、熔丝编程与 repair reload 全链路。
- **不要混淆**:ECC 主要处理运行期软错误或有限硬错误;BISR 面向制造测试后的永久冗余修复。二者可以互补,不能互相替代。
- *在 AI 加速器上*:存储器面积占比高,MBIST/BISR 会直接影响良率、测试时间和单颗成本,往往与 logic scan 同等关键。

### 3.6 Boundary Scan、LBIST 与其他片上自测
- **Boundary scan**:在芯片 I/O 边界加入扫描单元,用于板级、封装和 die-to-die 互连的控制/观察,通常由 JTAG TAP 访问,并用 BSDL 描述器件边界结构。
- **LBIST**:用片上伪随机图样发生器和响应压缩器自测逻辑,可减少外部图样依赖并支持上电/现场测试;但要处理随机抗性逻辑、X 值、覆盖率、误判概率和测试功耗。
- **怎么选**:不是每颗芯片都必须采用同一组合。汽车/高可靠产品可能重视周期性自检和安全机制;成本敏感产品则要严格评估面积、测试时间与安全需求。

### 3.7 测试时钟、低功耗模式、测试功耗与 X 处理
- **测试时钟**:scan shift、静态 capture、at-speed launch/capture 可能使用不同频率与序列;OCC、PLL bypass、多时钟域、跨域 lockup 和 test-mode SDC 必须一起定义。
- **测试功耗**:scan shift/capture 会制造功能模式中很少同时出现的大面积翻转。功耗过高会引发 IR-drop、false fail、过热甚至损伤;需要 ATPG fill/clock gating/分区调度控制峰值与平均活动率。
- **X 源**:未初始化存储器、模拟 IP、掉电域和黑盒会污染 response compactor。可用 X-bounding/masking,但遮蔽过多会吞掉可观察性和覆盖率。
- **低功耗**:每个 test mode 都要定义哪些域上电、隔离如何旁路、retention 如何处理;不能把功能模式的 UPF 假设直接照搬。

### 3.8 Physical-aware DFT 与 Scan Reorder
- **是什么**:DFT 结构在逻辑上正确还不够,必须能摆、能布、能满足时序/功耗。placement 后依据物理距离重排 scan 链,并合理放置压缩逻辑、OCC、MBIST controller 和测试访问网络。
- **怎么做**:在遵守时钟域、电源域和 lockup 规则的前提下缩短链路、平衡链长、控制拥塞;后端 ECO/reorder 后重新导出链信息并复查连接。
- **关键边界**:旧 ATPG pattern 不能在网表/链定义变化后自动视为有效。必须基于最终设计重新生成或严格验证图样。

### 3.9 DFT 验证与测试模式签核
- 插入前后均跑 DFT DRC,检查每条 scan chain 的完整连接、长度、极性、时钟与电源关系。
- 做 scan shift、MBIST、JTAG/IJTAG 和代表性 ATPG pattern 的仿真或静态协议检查。
- 在功能模式做 LEC,证明插 DFT 后的功能逻辑仍与已验证 RTL 等价。
- 所有 test mode 都进入 STA/MMMC;at-speed capture、scan enable、OCC 与跨域 lockup 不能只靠假设。
- 对测试模式同样跑功耗、IR/EM、UPF 隔离/掉电与安全访问检查。

### 3.10 ATE 图样、协议与最终交接
- **是什么**:ATPG 最终交付的是可在 ATE 上执行的 pattern、波形、时序和模式切换协议,不只是 coverage 报告。STIL/WGL/SVF 等格式负责在生成环境、转换工具和测试程序之间传递数据。
- **怎么做**:完成 pattern validation、tester conversion、周期/管脚映射、模式切换、初始化/复位和 pass/fail 规则;在仿真、ATE 与硅上做相关性检查。
- **交接对象**:⑧/⑨ 获得带 DFT 网表、ScanDEF、test SDC 和验证基线;⑫ ATE 团队获得图样、波形、限制与调试信息;产品/良率团队获得诊断模型。

### 3.11 失效诊断与良率学习闭环
- **是什么**:晶圆测试/成品测试记录 failing pattern、cycle、channel 与 fail memory address;scan/memory diagnosis 将失败响应映射到候选逻辑单元、连线、存储单元或物理位置。
- **怎么做**:把大量 failing die 的诊断结果与版图、工艺层、批次/晶圆位置关联,寻找系统性缺陷,反馈测试图样、设计规则和制造工艺。
- **关键认知**:DFT 的终点不是“ATPG 跑完”,而是图样能稳定上机、测试成本可接受、坏片能筛出、失效能定位、良率能持续改善。

### 3.12 2.5D/3D 芯片的 DFT
- **是什么**:3D 芯片要同时覆盖 die 内部、die-to-die 互连、堆叠前 known-good-die(KGD)、部分堆叠与完整堆叠后的测试。IEEE 1838 提供面向堆叠 die 的测试访问架构框架。
- **怎么做**:架构期规划每颗 die 独立可测、堆叠后仍可访问,并覆盖 TSV、micro-bump、hybrid bond 等互连;联合分配测试带宽、ATE 引脚、并行功耗与热预算。
- **对本项目的意义**:如果坏 die 在测试前就完成昂贵堆叠/封装,报废成本会被放大。pre-stack KGD 和 post-stack interconnect test 必须成为 3D 芯片流程的一等公民。

---

## 4. 贯穿始终、必须反复权衡的东西

- **测试质量 vs 测试成本**:更多 fault model/图样通常提升筛选能力,也会增加 ATE 数据量和机时。
- **覆盖率 vs PPA**:test point、压缩、OCC、MBIST/BISR 能提升可测性,但会占面积、耗功并可能伤关键路径。
- **压缩率 vs 可实现性/诊断**:压得更高不一定图样更少,还可能加重 X、拥塞和诊断模糊。
- **测试功耗 vs 缺陷激活**:活动率太高会 IR-drop/false fail,压得过低又可能掩盖动态缺陷。
- **层次化 vs 顶层优化**:IP 级 pattern 复用可降 runtime,但 wrapper、retarget、顶层时钟/电源关系必须验证。
- **安全 vs 可访问性**:测试/debug 端口需要强访问能力,也会形成资产泄露和攻击面;生命周期权限、认证和量产锁定要从架构期设计。
- **覆盖率数字 vs 可审计性**:同一个百分比若 fault model、分母、exclusion 不同,含义完全不同。指标必须能复现、能解释。

> 灵魂句:**好的 DFT 不是“覆盖率最高”,而是在质量、成本、PPA、功耗、诊断与安全之间取得可量产、可审计的平衡。**

---

## 5. DFT“怎么做”出来的(方法、工具与标准)

- **主流程**:DFT spec → RTL testability/DRC → MBIST/JTAG/core wrapper 集成 → 综合网表基线 → scan/压缩/test point/OCC 插入 → post-DFT DRC/LEC → ATPG/fault simulation → 物理重排 → 最终图样验证 → ATE/诊断闭环。
- **商业工具族**:Synopsys TestMAX、Siemens Tessent、Cadence Modus 等覆盖 scan/压缩、ATPG、MBIST、diagnosis 与 physical-aware DFT;具体采用哪套取决于工艺、IP、团队流程和公司许可。
- **关键标准**:[IEEE 1149.1](https://standards.ieee.org/ieee/1149.1/10977/)(JTAG/boundary scan)、IEEE 1500(core test wrapper)、IEEE 1687(IJTAG)、IEEE 1450(STIL)、IEEE 1838(3D stacked die test)。
- **常见数据**:综合网表、Liberty/test model、SDC/UPF、ScanDEF/chain map、BSDL、CTL、ICL/PDL、STIL/WGL/SVF、fault list/coverage database、诊断模型。
- **官方资料入口**:[Synopsys TestMAX DFT](https://www.synopsys.com/implementation-and-signoff/rtl-synthesis-test/test-automation/dftmax.html)、[Cadence Modus](https://www.cadence.com/en_US/home/tools/digital-design-and-signoff/test-automation/modus-test.html)。

> 方法论重点:**每次网表、chain、时钟、电源或物理 ECO 变化,都要重新确认“结构仍连通、功能仍等价、图样仍有效、测试模式仍签核”。**

---

## 6. DFT设计在各里程碑形成的主要交付物

- 审批通过的 **DFT spec**、测试架构图、模式定义、fault model/覆盖率/测试成本目标。
- 插入 DFT 后的 RTL/门级网表、功能与测试 SDC、UPF 配置、版本清单。
- scan/压缩/test point/OCC 结构,ScanDEF 或 chain mapping。
- MBIST/BISR 控制器、memory mapping、算法、诊断、repair/eFuse 协议。
- TAP/boundary scan 与 BSDL;core wrapper/CTL;IJTAG ICL/PDL(按项目采用)。
- 各 fault model 的 ATPG pattern、fault simulation/coverage 报告、exclusion/waiver 清单。
- DFT DRC、连接、LEC、STA、功耗/IR 与 pattern validation 报告。
- STIL/WGL/SVF 等 ATE-ready 数据、波形/模式切换说明、tester 限制。
- 失效诊断模型/数据库及给物理、签核、ATE、产品和良率团队的 handoff 包。

> 放行标准不是“工具跑完”,而是**交付物彼此版本一致,所有模式可重现,未解决项有 owner/风险/waiver,下游拿到即可继续收敛。**

---

## 7. 容易被忽视、却致命的坑

1. **把 DFT 当综合后的补丁**:架构期没留接口、功耗预算和 memory redundancy,后期只能高成本返工。
2. **把功能覆盖率当制造测试覆盖率**:功能仿真全绿,并不代表开路/短路/延迟缺陷可被筛出。
3. **把 JTAG、内部 scan 与 IJTAG 混成一件事**:接口、对象与交付物不同,不能互相替代。
4. **只追一个 coverage 百分比**:不看模型、分母、untestable/aborted 与 exclusion,数字漂亮也可能漏风险。
5. **测试时钟/复位不可控**:跨域链缺 lockup、OCC/PLL/test SDC 不完整,图样在 ATE 上不稳定。
6. **X masking 过多**:表面能跑,实际把可观察性和故障覆盖率一起遮掉。
7. **忽略测试功耗**:仿真过、ATE 却因 IR-drop/过热产生 false fail 或良率损失。
8. **“接上 MBIST 就结束”**:漏 memory model、诊断、冗余分析、eFuse 装载或 repair 验证。
9. **压缩比过激**:coverage、pattern count、拥塞或诊断分辨率反而恶化。
10. **scan reorder/ECO 后沿用旧 pattern**:链定义已变,旧图样可能失效或测错对象。
11. **只签功能模式**:test mode 的 STA、UPF、功耗、IR/EM 与连接问题会留到硅上。
12. **测试端口缺安全生命周期控制**:量产或现场留下未授权访问、密钥/资产泄露风险。
13. **3D 芯片只做最终封装后测试**:没有 KGD 与 die-to-die 互连策略,坏 die 会放大堆叠和封装损失。

---

## 8. 小结 + 与主流程后续阶段的协同

**DFT = 为芯片建立一套从“内部状态可控制/可观察”,到“ATPG 能生成高覆盖图样”,再到“ATE 能经济执行并诊断失效”的完整测试基础设施。** 它不只是插几条 scan chain,也不是功能验证的替代品;它同时涉及 scan/压缩、MBIST/BISR、JTAG/IJTAG、时钟、功耗、物理实现、ATE、安全与硅后良率闭环。

> 灵魂句:**功能验证证明设计逻辑是对的,DFT 让量产线有能力证明每一颗造出来的芯片没有被制造缺陷悄悄破坏。**

在十三个编号主阶段中,⑦ 综合之后会进入 DFT 结构插入和初步 ATPG 的**主要落地窗口**,主流程同时继续到 ⑧ 物理设计。此后 DFT 与物理实现、⑨ 签核双向迭代:scan reorder、ECO、时钟/功耗和版图变化都可能要求重新验证链连接、等价性、覆盖率与图样。最终能力在 ⑫ 封装测试和 ATE 上兑现,再由 ⑬ 量产的失败诊断与良率数据持续反哺图样、测试限值乃至下一版设计。
