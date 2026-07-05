export const meta = {
  name: 'tpu-cases',
  description: '为芯片设计流程文档 03/04 的其余26个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:TPU事实诚实性 + SVG有效性 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/Chip-Design/cases_frag';

// ---------- 共享风格指南(所有 agent 都注入) ----------
const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.;仅当 v1 确实没有该特性时才可引 TPU v2/v3/v4 pod,仍属 TPU)。绝不引入别的芯片。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB 软件管理 Unified Buffer(scratchpad,不用硬件cache);4 MiB 32-bit 累加器;片外 8 GiB DDR3(~34 GB/s);weight-stationary 数据流;主机经 PCIe 3.0 发 CISC 指令(host-driven,指令仅约十几条);28nm、die ≤331mm²、TDP 28–40W;TensorFlow/XLA 生态。
诚实红线:对 TPU v1 公开资料薄弱的子系统(安全/RAS/DFT/时钟/复位/CDC 等),**不得编造 TPU 专属数字或机制**;改用"TPU 这类数据中心推理 ASIC 的通行做法",并在文字里点明这是通行实践而非 v1 披露细节。可用上面的硬事实做背景。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum: 小节号字符串(下方给定)
- chip: "Google TPU v1"(或必要时 "Google TPU v2"/"v4 pod")
- title: 案例标题(含芯片名),如 "TPU v1 · 24 MiB Unified Buffer 扁平存储层次"
- oneLine: 一句话点题(说明本案例如何映射到该小节的主题)
- svg: 一段 SVG 概念图字符串(规范见下)
- legend: 数组 [{k,name,desc}],3~5 项;k 必须等于 svg 里某个 data-k 或 data-g
- steps: 数组 [{keys:[..],cap}],3~5 步分步演示;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(设计前·要定哪些量/必须考虑的约束与输入),3~5 条,可用 <b>…</b> 起头
- during: 数组(设计时·怎么权衡取舍),4~6 条
- result: 数组 [{label,value}](设计结果·关键参数),4~6 项;value 简短;无确切数字时给诚实的定性值
- after: 数组(设计后·验证/交接/下一步),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(或注明通行实践)

【SVG 规范——必须严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg"> ,H 取 280~420。
- 必含一次箭头 marker 定义:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:用 <g class="cs-part" data-k="键" data-g="键">…</g> 包裹。data-k 唯一标识,data-g 用于成组高亮(同组多个元素给同一 data-g)。
- 盒子:<g class="cs-part" data-k="mxu" data-g="mxu"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>
- 阵列/网格单元:<rect class="cs-cell" .../> + <text class="cs-cellt" .../>;整块同概念就所有 cell 用同一 data-k。
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 <polyline class="cs-arr" points=.. fill="none" marker-end="url(#csar)"/>;虚线加 stroke-dasharray="5 4"。
- 自由文字:class="cs-note"(灰小注)/ "cs-sub"(副标) / "cs-t"(主标,居中 text-anchor 已在CSS)。坐标都在 720×H 内、避免重叠、≤14 个 cs-part。
- 优先画"带标签盒子 + 箭头"的框图,或网格/分层条带;roofline 类用简单折线+点+坐标轴文字即可。FSM 用圆角盒子(rx 大)+箭头。不要内联 <style>/<script>。

【参考样例(一个最简框图)】
<svg class="cs-svg" viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="host" data-g="host"><rect class="cs-box" x="40" y="90" width="130" height="58" rx="8"/><text class="cs-t" x="105" y="116">主机 Host</text><text class="cs-sub" x="105" y="132">发 CISC 指令</text></g><line class="cs-arr" x1="170" y1="119" x2="250" y2="119" marker-end="url(#csar)"/><g class="cs-part" data-k="mxu" data-g="mxu"><rect class="cs-box" x="254" y="84" width="150" height="70" rx="8"/><text class="cs-t" x="329" y="114">MXU 矩阵单元</text><text class="cs-sub" x="329" y="132">256×256 脉动阵列</text></g><text class="cs-note" x="254" y="74">数据通路 →</text></svg>

【写文件——用 Bash 跑 python3,确保 JSON 转义正确(svg 用 raw 三单引号串)】
python3 - <<'PYEOF'
import json
svg = r'''<svg class="cs-svg" ...>...</svg>'''
case = {"secNum":"X.Y","chip":"Google TPU v1","title":"...","oneLine":"...","svg":svg,
 "legend":[{"k":"...","name":"...","desc":"..."}],
 "steps":[{"keys":["..."],"cap":"..."}],
 "before":["..."],"during":["..."],"result":[{"label":"...","value":"..."}],"after":["..."],
 "source":"In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"}
json.dump(case, open("${DIR}/<DOC>-<SEC>.json","w"), ensure_ascii=False, indent=1)
print("wrote")
PYEOF
只写这一个 JSON 碎片文件,不要改动其它任何文件、不要启动服务器或打开浏览器。
`;

// ---------- 26 个小节(doc, sec, name, focus) ----------
const DESCS = [
  // ===== 03 架构设计 =====
  {doc:'03', sec:'3.1', name:'工作负载分析', focus:'TPU 立项前对 Google 数据中心推理负载的画像:MLP/CNN/LSTM 都 lower 成矩阵乘(GEMM);量化容忍度高→INT8;关键发现——理论峰值很高但实际很多层因 batch 小/权重大而 memory-bound,TPU 论文自己画了 roofline。图:一张 roofline(x=算术强度 FLOP/Byte,y=性能 TOPS,斜屋顶=带宽限、平屋顶=算力限,标几个 workload 点:大矩阵靠近算力屋顶、小batch落在带宽斜坡)。分步演示沿屋顶/各点讲。'},
  {doc:'03', sec:'3.2', name:'功能划分 / 模块分解', focus:'TPU 的软硬件划分:把"矩阵乘"硬化成 MXU,激活/池化/归一化用专用单元,而复杂控制/调度全交给主机(host-driven,PCIe 发约十几条 CISC 指令)。图:顶层框图 Host—(PCIe)—TPU{Weight FIFO, MXU, Accumulators, Activation, Unified Buffer, DDR3},用颜色/标注区分"硬化的固定功能"vs"交给主机软件"。'},
  {doc:'03', sec:'3.4', name:'存储层次', focus:'TPU 的扁平存储:24 MiB 软件管理 Unified Buffer(scratchpad,刻意不做硬件cache→确定性+省面积)、4 MiB 32-bit 累加器、片外 8 GiB DDR3(~34 GB/s)。v2+ 才上 HBM。图:分层条带(片上 Unified Buffer 24MiB / 累加器 4MiB / 片外 DDR3 8GiB),每带标容量+带宽+用途;强调"近大远小"与砍cache。'},
  {doc:'03', sec:'3.5', name:'片上互连 / NoC', focus:'诚实:TPU v1 并不是复杂 mesh NoC——它是以 MXU 为中心的"宽数据通路+控制总线",数据从 Unified Buffer 经很宽的接口直灌阵列(把带宽无损送达是关键)。要点:单一主导数据流时,简单宽通路胜过通用 NoC。多芯片扩展才需要互连(TPU v2/v3 pod 的 ICI inter-chip interconnect,2D 环面)。图:UB↔MXU 宽数据通路(粗箭头标 GB/s)+ host 控制总线;可加一个小的 v2 pod ICI 网格示意并注明"多芯片才用"。'},
  {doc:'03', sec:'3.6', name:'数据流 / 数据通路', focus:'TPU 的端到端数据通路与 weight-stationary 脉动数据流 + 双缓冲让搬运与计算重叠:DDR3→Weight FIFO→MXU(权重不动);Host→DMA→Unified Buffer→MXU→Accumulators→Activation→回 UB。图:端到端 dataflow 框图,标出两条并行流(权重流/激活流)在 MXU 汇合,强调流水重叠不让阵列空转。'},
  {doc:'03', sec:'3.7', name:'IO 与连接', focus:'TPU v1 的对外 IO:PCIe 3.0 连主机(TPU 是协处理器,host 发指令)、DDR3 内存接口 PHY。诚实:v1 是单卡;规模扩展靠 v2/v3 的 ICI/OCS(光交换)组 pod。图:TPU 卡 IO 框图(PCIe to Host、DDR3 PHY to 8GiB),标带宽;旁注"scale-out 看 pod ICI"。'},
  {doc:'03', sec:'3.8', name:'时钟架构', focus:'已知 700 MHz 主时钟。诚实(细节未公开):讲这类大数据通路 ASIC 的时钟域划分(核心阵列域700MHz / PCIe域 / DDR3接口域)与"脉动阵列对时钟分布友好"——规则结构、局部短互连,易做时钟树、易达 700MHz。图:时钟域划分示意(PLL→core阵列域;PCIe域;DDR3域,边界标 CDC),注明域划分是通行做法。'},
  {doc:'03', sec:'3.9', name:'功耗架构', focus:'TPU TDP 28–40W,远低于同期 GPU。能效三杠杆:①量化(8-bit,MAC更小更省)②极少访存(论文原话:64K ALU之间传数据全程不访存,显著降功耗)③砍掉cache/乱序/分支预测。图:能效杠杆示意或功耗去向(MAC阵列占大头、数据搬运被压到很小),标三杠杆;可做功耗域划分。'},
  {doc:'03', sec:'3.10', name:'复位与初始化架构', focus:'诚实(细节少):TPU 是 host-driven 协处理器——上电后主机经 PCIe 配置 TPU、把权重加载到片外 DDR3、初始化内存接口,然后下发指令。讲这类加速器的上电/初始化/host 配置流程与可重复可调试的重要性。图:boot/init 时序框图(上电→host 经PCIe配置→加载权重→内存PHY训练→ready 可下发指令)。'},
  {doc:'03', sec:'3.11', name:'安全架构', focus:'诚实:TPU v1 论文未强调安全。讲数据中心推理 ASIC 的通行安全做法:固件完整性/安全启动、可信根、(多租户场景)模型与数据隔离。明确标注"通行实践,非 v1 公开细节"。图:信任链概念图(Root of Trust→Secure Boot→固件校验→运行;旁注隔离),用通行做法措辞。'},
  {doc:'03', sec:'3.12', name:'RAS(可靠性/可用性/可维护性)', focus:'诚实:讲数据中心规模可靠性的通行做法应用到 TPU 这类加速器——内存 ECC(DDR3 通常带ECC)、链路CRC、大规模部署下用 fleet 级冗余/调度容忍单芯片故障、可观测遥测。明确这是通行实践。图:ECC 保护的数据路径 + fleet 级冗余概念(一台坏了调度绕开),注明通行做法。'},
  {doc:'03', sec:'3.13', name:'可测性架构(DFT)', focus:'诚实:任何 331mm² 大 ASIC + 海量片上 SRAM 都必须做 DFT。讲通行做法:scan 链测逻辑、MBIST 测 24MiB SRAM、JTAG/边界扫描、定覆盖率目标;大阵列+大SRAM不做DFT→良率算不清、坏片漏出。图:scan链穿过阵列 + MBIST 包住 Unified Buffer + JTAG 概念图。'},
  {doc:'03', sec:'3.14', name:'封装 / Chiplet 架构', focus:'TPU v1 是单片(monolithic,28nm,die ≤331mm²)。演进对比:v2+ 把 HBM 用 2.5D 硅 interposer 与逻辑共封;pod 用多芯片+ICI 扩展。讲何时从单片走向 2.5D/多die(良率、内存带宽、reticle 上限)。图:左"v1 单片 die",右"v2+ 逻辑die + HBM 经 interposer 2.5D 共封"对比。'},
  {doc:'03', sec:'3.15', name:'软件/编程接口', focus:'TPU 编程模型:主机经 PCIe 发约十几条 CISC 指令(如 Read_Weights/MatrixMultiply/Activate);TensorFlow 模型经 XLA 编译器编译成 TPU 指令;生态(TF/XLA)是关键。图:软件栈分层(TensorFlow 模型 → XLA 编译器 → TPU CISC 指令 → 硬件 MXU),自上而下箭头,体现"编译器把图下发到阵列"。'},
  // ===== 04 微架构设计 =====
  {doc:'04', sec:'3.2', name:'数据通路 vs 控制通路', focus:'TPU 把数据通路与控制分得很干净:数据通路=MXU阵列+累加器+激活(做实际运算);控制=主机CISC指令驱动的片上 sequencer(发控制信号,极简——复杂控制留主机)。图:左"数据通路 MXU+累加器+激活"、右"控制 主机指令→片上sequencer→控制信号",控制信号虚线指向数据通路。'},
  {doc:'04', sec:'3.3', name:'有限状态机(FSM)设计', focus:'诚实(具体FSM未公开):讲控制 MXU 做分块矩阵乘(tiling)的 GEMM 控制器 FSM 形态——载权重→泵激活→累加→写回→取下一块。图:状态转移图(圆角盒子做状态)Idle→LoadWeights→StreamActivations→Accumulate→WriteBack→(回Idle 或 NextTile),箭头标转移条件;注明是这类GEMM控制器的典型FSM。'},
  {doc:'04', sec:'3.4', name:'时序与频率预算', focus:'脉动阵列为何容易达 700MHz:每级关键路径只是"一个 8-bit MAC"(逻辑浅);全是局部短互连+规则结构(没有长全局线)→ 时序好收敛。对比:通用CPU有长关键路径要费力切。图:左"一个PE内的关键路径:乘→加→寄存器(很短)";右"规则局部连线 vs 假想长全局线(慢)"对比,标 700MHz。'},
  {doc:'04', sec:'3.5', name:'缓冲与流控', focus:'TPU 的缓冲:Weight FIFO 深度要"盖住"从 DDR3 取权重的延迟,Unified Buffer 双缓冲让激活搬运与计算重叠,目标是阵列零空转。带宽×延迟积/Little law 决定深度。图:DDR3→Weight FIFO(标"深度=盖住取数延迟")→MXU;UB 双缓冲(ping/pong)喂阵列;强调重叠。'},
  {doc:'04', sec:'3.6', name:'存储器微架构', focus:'Unified Buffer 的内部组织:要每拍同时喂阵列 256 行→必须多 bank、很宽的读口;4 MiB 累加器要接住每列部分和。图:Unified Buffer 切成多个 bank(画几个bank),宽口并行喂入 MXU 左侧各行;旁注"端口/bank数由峰值并发反推"。'},
  {doc:'04', sec:'3.7', name:'并行与资源权衡', focus:'TPU 把"复制换吞吐"做到极致:65,536 个 MAC 全空间展开(spatial,full replicate);weight-stationary 又用"复用换带宽"。对比时分复用(省面积但降吞吐)。图:左"64K MAC 全展开的阵列(空间并行)",右用文字/小图对比"时分复用一份硬件"的取舍;标 PPA 旋钮。'},
  {doc:'04', sec:'3.8', name:'算术与数值实现', focus:'TPU 的 MAC 数值实现:8-bit 整数乘 + 32-bit 累加(低精度乘、高精度累加防溢出),量化/反量化在边界。图:一个 MAC 单元的数据通路——INT8×INT8 乘法器→INT32 加法器→累加寄存器,标位宽;旁注"低精度省面积/功耗、高精度累加防溢出"。'},
  {doc:'04', sec:'3.9', name:'块接口与握手协议', focus:'诚实:脉动阵列 PE 之间是"规则的局部寄存器逐拍传递"(systolic 同步推进,无需复杂握手)——这正是它简单高效的原因;块间(UB/MXU/累加器)用规整接口。图:相邻PE间的 staging 寄存器逐拍传递示意(数据 a 每拍右移、部分和下移),对比通用块间 valid/ready 握手的复杂;强调规则同步。'},
  {doc:'04', sec:'3.10', name:'跨时钟域与复位', focus:'诚实(细节少):TPU 至少有 核心阵列域/PCIe域/DDR3域 三个时钟域,跨域信号要 CDC(单比特双触发器同步、多比特异步FIFO/握手)。讲这类多域芯片的 CDC 与复位释放。图:三时钟域框(core 700MHz / PCIe / DDR3),边界画 CDC 同步器/异步FIFO;注明域划分是通行做法。'},
  {doc:'04', sec:'3.11', name:'低功耗微架构', focus:'TPU 的低功耗钩子:decode/小负载时阵列常空转→细粒度时钟门控让空闲 PE 不耗动态功耗;操作数隔离;"不访存即省电"。图:阵列里部分列被"时钟门控关闭"(灰显/标 gated)、活跃列正常,旁注三招(时钟门控/操作数隔离/减少访存)。'},
  {doc:'04', sec:'3.12', name:'可测性与可调试钩子', focus:'诚实:讲 TPU 这类大阵列+大SRAM的微架构级 DFT/debug 钩子——scan 链穿过阵列、MBIST 测 Unified Buffer、性能计数器(阵列利用率、stall 数)供 bring-up 与调优观测。图:scan链贯穿PE阵列 + MBIST包住UB + 性能计数器读出,概念示意;注明通行做法。'},
  {doc:'04', sec:'3.13', name:'微架构级性能建模与验证规划', focus:'TPU 论文里的 roofline 分析正是"微架构级性能建模"的范例:先建模确认这套微架构在真实负载上的利用率/瓶颈(被算力还是带宽卡),达标再写 RTL,同时定块级验证计划。图:一张 roofline(实测点 vs 屋顶线)+ 一条"建模→不达标则回调微架构→达标→写RTL/定验证计划"的小流程箭头。'},
];

// ---------- 流水线:author → verify ----------
const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(${d.doc==='03'?'架构设计':'微架构设计'})· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按上面的"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取已生成的案例碎片:${path}(它是文档 ${d.doc} 小节 ${d.sec}「${d.name}」的 TPU 案例)。
逐项检查并在发现问题时**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,且含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 8GiB、28nm/331mm²/28–40W、PCIe、weight-stationary);对弱文档子系统不得编造 TPU 专属数字,须用"通行做法"措辞。本小节角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全部闭合、<g> 与 </g> 数量相等;坐标都在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 里每个 k、steps 里每个 keys 元素,都必须能在 svg 文本中作为某个 data-k 或 data-g 的值找到;否则补到 svg 上或改 key 使其一致。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 段落齐全、具体、对得上"设计前/时/结果/后"语义。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后,回报:secNum、是否改动、发现并修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,400)}))
);

const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
