export const meta = {
  name: 'tpu-cases-05',
  description: '为 RTL 设计(文档05)的12个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/05-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU RTL 案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:TPU事实诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/chip-design-flow/cases_frag';

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.;仅当 v1 确实没有该特性时才可引 TPU v2/v3/v4 pod,仍属 TPU)。绝不引入别的芯片。本篇是「⑤ RTL 设计」,案例要带 RTL 味道——讲"这段硬件用 HDL 怎么写、写出来的结构/信号长什么样"。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB 软件管理 Unified Buffer(scratchpad,不用硬件cache);4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s,论文 Table 1);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令(host-driven);28nm、die ≤331mm²、TDP 28–40W;TensorFlow/XLA 生态。
诚实红线:RTL 的具体写法/编码规范多为工程通行实践,TPU 不会逐行公开。**不得编造 TPU 专属的 RTL 代码细节或私有数字**;用"这类设计/通行 RTL 实践"措辞,把 TPU 的已知结构(PE=8bit乘+32bit累加、阵列、UB、FSM、多时钟域)作为载体讲 RTL 概念即可。可在 result/正文写示意性的 HDL 片段(如 always_ff @(posedge clk) acc<=acc+a*b;)说明写法,但标明是示意。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum: 小节号字符串(下方给定)
- chip: "Google TPU v1"
- title: 案例标题(含芯片名)
- oneLine: 一句话点题(说明本案例如何映射到该 RTL 小节主题)
- svg: 一段 SVG 概念图字符串(规范见下)
- legend: 数组 [{k,name,desc}],3~5 项;k 必须等于 svg 里某个 data-k 或 data-g
- steps: 数组 [{keys:[..],cap}],3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(设计/编码前·要定哪些事:语言/复位风格/位宽/接口/可综合约束等),3~5 条,可 <b>…</b> 起头
- during: 数组(写 RTL 时·怎么写/铁律/取舍),4~6 条
- result: 数组 [{label,value}](写出来长什么样:可含示意 HDL 片段、位宽、风格),4~6 项
- after: 数组(写完要做什么:lint/仿真/CDC检查/试综合/交验证),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(RTL 编码部分可注明"通行 RTL 实践")

【SVG 规范——必须严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg"> ,H 取 280~420。
- 必含一次箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。data-k 唯一标识,data-g 用于成组高亮。
- 盒子:<g class="cs-part" data-k="acc" data-g="acc"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>
- 寄存器画成盒子可在左下角加个小三角表示时钟沿(可选:<path d=".." fill="#8b5cf6"/> 放进该 g);组合逻辑用普通盒子。
- 阵列/网格单元:<rect class="cs-cell"/> + <text class="cs-cellt"/>;整块同概念就所有 cell 用同一 data-k。
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;虚线加 stroke-dasharray="5 4"。
- 文字:class="cs-note"(灰小注)/"cs-sub"(副标)/"cs-t"(主标)。HDL 片段可作为 cs-note 或 cs-sub 文字放图里(短)。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(一个最简框图)】
<svg class="cs-svg" viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="mul" data-g="mul"><rect class="cs-box" x="60" y="80" width="150" height="60" rx="8"/><text class="cs-t" x="135" y="106">组合乘法器</text><text class="cs-sub" x="135" y="124">always_comb  =</text></g><line class="cs-arr" x1="210" y1="110" x2="300" y2="110" marker-end="url(#csar)"/><g class="cs-part" data-k="acc" data-g="acc"><rect class="cs-box" x="304" y="80" width="160" height="60" rx="8"/><text class="cs-t" x="384" y="106">累加寄存器</text><text class="cs-sub" x="384" y="124">always_ff  &lt;=</text></g></svg>

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

const DESCS = [
  {doc:'05', sec:'3.1', name:'HDL 选择与可综合子集', focus:'RTL味:语言选择(Verilog/SystemVerilog主流、Chisel生成式)+可综合子集 vs 仅testbench(#delay/initial/$display不可进设计)。TPU阵列规整、要参数化→适合支持generate的SV或Chisel一键拉256×256。图:分区框图"可综合子集(进设计)| 仅testbench(不综合)",或 HDL→综合器→门级 流向标"只有可综合子集能变电路"。诚实:语言选择是工程惯例。'},
  {doc:'05', sec:'3.2', name:'组合逻辑 vs 时序逻辑(阻塞/非阻塞铁律)', focus:'RTL味:TPU的PE——乘法是组合(always_comb prod=a*b,用=)、累加是时序(always_ff @(posedge clk) acc<=acc+prod,用<=);铁律"<=给时序、=给组合",用反→仿真综合不一致。图:一个PE的RTL结构:组合乘法器盒(标 always_comb / =)→箭头→累加寄存器盒(带clk三角,标 always_ff / <=)。'},
  {doc:'05', sec:'3.3', name:'寄存器、时钟与复位', focus:'RTL味:复位策略(同步/异步、复位如何安全释放)+复位风格一致;TPU控制FSM/计数器必须复位到确定态,海量累加器可不复位(靠流程清零)省巨大复位网络;漏复位→仿真X、bring-up起不来。图:两类寄存器对比"控制寄存器(带rst,clk+rst信号)" vs "累加寄存器(无rst,省面积)"。'},
  {doc:'05', sec:'3.4', name:'数据通路的 RTL(位宽/有符号)', focus:'RTL味:运算符映射成加法器/乘法器;位宽要算准、有符号要声明。TPU MAC:logic signed[7:0] a,b; logic signed[31:0] acc;—— INT8乘进INT32累加,累加位宽必须够防溢出。图:MAC数据通路标位宽 8×8→(16)→累加到32,强调位宽增长防溢出与signed声明。'},
  {doc:'05', sec:'3.5', name:'状态机(FSM)的 RTL 编码', focus:'RTL味:把④的状态图写成两段式/三段式RTL(时序块只更新state_reg用always_ff;组合块算next_state+输出用always_comb,必须有default防latch)。TPU控制分块GEMM:Idle→LoadW→Stream→Accumulate→WriteBack。图:状态转移图(圆角盒做状态)+旁注"state_reg(always_ff<=) + next_state(always_comb,带default)"。诚实:具体FSM未公开。'},
  {doc:'05', sec:'3.6', name:'存储器的 RTL(推断 vs 例化)', focus:'RTL味:片上存储两种落法——推断(特定always写法让综合器认出RAM,适合小regfile)vs 例化(调用内存编译器生成的SRAM宏,大块用这个,密度/时序/功耗更好)。TPU 24MiB Unified Buffer用例化多bank SRAM宏。图:左"推断:always写法→小RAM",右"例化:SRAM macro(内存编译器)";标UB用例化宏。'},
  {doc:'05', sec:'3.7', name:'流水线、握手与 FIFO 的 RTL', focus:'RTL味:流水寄存器逐级打拍 + valid/ready握手 + FIFO满空/读写指针 + 背压。TPU Weight FIFO、DMA→UB→阵列之间的握手保证阵列不空转又不溢出;握手不能成环、背压端到端不死锁。图:valid/ready握手框图 producer→FIFO→consumer(标 valid/ready 双向、背压箭头)。'},
  {doc:'05', sec:'3.8', name:'跨时钟域(CDC)的 RTL', focus:'RTL味:单比特用双触发器同步器、多比特用异步FIFO/握手;裸信号跨域=亚稳态;要CDC lint。TPU核心阵列域↔PCIe域↔DDR3域。图:双触发器同步器(两个FF串联跨虚线域边界,标第一级吸收metastability),旁注多比特用异步FIFO。强调这是"仿真过、流片后随机崩"重灾区。'},
  {doc:'05', sec:'3.9', name:'低功耗 RTL(门控与功耗意图)', focus:'RTL味:别手写门控时钟(毛刺/坏DFT/坏时序)——RTL写成带enable的更新,综合时工具自动插入门控单元ICG;操作数隔离;配UPF功耗意图。TPU空闲PE列时钟门控"不干活就不耗动态功耗"。图:ICG门控单元(enable + clk → gated_clk → 一组寄存器),标"工具自动插入ICG,别手写门控逻辑"。'},
  {doc:'05', sec:'3.10', name:'可测试性友好的 RTL(DFT)', focus:'RTL味:让触发器能串scan链、SRAM能MBIST;避免裸门控时钟/组合环/latch/内部生成异步复位(都破坏扫描与时序)。TPU成千上万PE触发器要串scan、UB要MBIST。图:scan链把几个FF用scan-mux串成移位链 + 标"DFT友好:无latch/无裸门控时钟/无组合环"。诚实:通行DFT实践。'},
  {doc:'05', sec:'3.11', name:'参数化与模块复用', focus:'RTL味:用parameter/generate/模块例化写成可配置可复用;把位宽/深度/阵列边长做成parameter,重复结构用generate循环,为产品家族留旋钮。TPU:一个参数化PE模块 + generate双重循环→拉出N×N阵列,改N裁不同算力。图:参数化PE模块(parameter N)+ generate循环展开成网格阵列示意。'},
  {doc:'05', sec:'3.12', name:'编码规范、Lint 与面向综合的写法', focus:'RTL味:遵守编码规范、过Lint(抓latch/不完整敏感列表case/位宽不匹配/多驱动/X/CDC)、按综合得好跑得到频率写(避免超长组合链)。"仿真通过"只是起点。TPU阵列关键路径短(一个MAC),lint干净+不写长组合链就易收敛700MHz。图:关卡流程 RTL→Lint(列出latch/位宽/CDC...几项检查)→可综合,标"仿真通过≠合格,Lint干净+可综合才合格"。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(RTL 设计)· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU/RTL 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取已生成的案例碎片:${path}(文档 ${d.doc} 小节 ${d.sec}「${d.name}」,RTL 设计的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 ~30GB/s、28nm/331mm²/28–40W、PCIe、weight-stationary);RTL 具体写法用"通行实践"措辞,不得编造 TPU 私有 RTL 数字;示意 HDL 片段要标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上"设计前/时/结果/后"语义,且有 RTL 味(语言/铁律/lint/可综合等)。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,300)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个 RTL 小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
