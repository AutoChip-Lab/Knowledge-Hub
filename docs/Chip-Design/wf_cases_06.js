export const meta = {
  name: 'tpu-cases-06',
  description: '为功能验证(文档06)的12个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/06-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 验证案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/Chip-Design/cases_frag';

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.)。绝不引入别的芯片。本篇是「⑥ 功能验证」,案例要带验证味道——讲"怎么验证 TPU 的这部分硬件、验证环境/流程长什么样"。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB 软件管理 Unified Buffer;4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s,论文 Table 1);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令;28nm/331mm²/28–40W;TensorFlow/XLA。
诚实红线:功能验证的具体测试平台/方法学(UVM/SVA/covergroup/formal/emulation)是**业界通行实践**,TPU 不会公开其验证环境细节。**不得编造 TPU 私有的验证数字或环境**;用"这类设计的通行验证实践"措辞,把 TPU 的已知结构(脉动阵列、Unified Buffer、握手、多时钟域、CISC指令接口)作为被验证对象来讲验证概念。可写示意性的 covergroup/assert 片段但标明示意。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum / chip("Google TPU v1") / title(含芯片名) / oneLine(点题:本案例如何映射该验证小节)
- svg: SVG 概念图字符串(规范见下)
- legend: [{k,name,desc}] 3~5 项;k 必须等于 svg 里某 data-k 或 data-g
- steps: [{keys:[..],cap}] 3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(验证前·要定哪些事:验证计划/覆盖目标/参考模型/激励策略/完成判据等),3~5 条,可 <b>…</b> 起头
- during: 数组(搭环境/跑验证时·怎么做/取舍/铁律),4~6 条
- result: 数组 [{label,value}](验证环境/产出长什么样:可含示意 covergroup/assert 片段、组件、判据),4~6 项
- after: 数组(验证后·覆盖收敛/回归/bug收敛/签核/交综合),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(验证方法部分注明"通行验证实践")

【SVG 规范——严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg">,H 取 280~420。
- 必含箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。
- 盒子:<g class="cs-part" data-k="sb" data-g="sb"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;虚线 stroke-dasharray="5 4"。
- 文字:class="cs-note"/"cs-sub"/"cs-t"。示意片段(covergroup/assert)可作短 cs-note 放图里。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(testbench 框图)】
<svg class="cs-svg" viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="drv" data-g="drv"><rect class="cs-box" x="40" y="90" width="120" height="56" rx="8"/><text class="cs-t" x="100" y="114">Driver</text><text class="cs-sub" x="100" y="130">灌激励</text></g><line class="cs-arr" x1="160" y1="118" x2="244" y2="118" marker-end="url(#csar)"/><g class="cs-part" data-k="dut" data-g="dut"><rect class="cs-box" x="248" y="84" width="150" height="68" rx="8"/><text class="cs-t" x="323" y="112">DUT 脉动阵列</text><text class="cs-sub" x="323" y="130">被验证 RTL</text></g><line class="cs-arr" x1="398" y1="118" x2="482" y2="118" marker-end="url(#csar)"/><g class="cs-part" data-k="sb" data-g="sb"><rect class="cs-box" x="486" y="90" width="170" height="56" rx="8"/><text class="cs-t" x="571" y="114">Scoreboard</text><text class="cs-sub" x="571" y="130">对照参考模型判对错</text></g></svg>

【写文件——Bash 跑 python3,svg 用 raw 三单引号串】
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
  {doc:'06', sec:'3.1', name:'验证计划', focus:'验证味:为TPU列验证计划——从规格逐条拆特性(矩阵乘正确性/各精度尺寸/溢出饱和/握手不死锁/指令序列/CDC),每条定激励策略+覆盖目标+完成判据。图:spec→特性清单→每条映射(激励/覆盖/判据)的框图。诚实:验证计划是通行方法学。'},
  {doc:'06', sec:'3.2', name:'测试平台(testbench)架构', focus:'验证味:TPU验证环境——Driver(灌矩阵+指令)→DUT(阵列RTL)→Monitor(抓输出)→Scoreboard(对照参考模型判对错)。图:testbench框图 Driver→DUT(脉动阵列)→Monitor→Scoreboard←Reference Model,标各组件职责。'},
  {doc:'06', sec:'3.3', name:'激励生成:定向 vs 约束随机', focus:'验证味:TPU定向测全零/最大值溢出/饱和等要害;约束随机在合法约束内生成海量尺寸/数值矩阵逼出意外组合(现代主力)。图:两条激励源对比 Directed(手写关键用例)| Constrained-Random(约束内随机海量)→DUT,标各自用途。'},
  {doc:'06', sec:'3.4', name:'自检与参考模型(scoreboard / golden model)', focus:'验证味:TPU参考模型=独立写的朴素软件矩阵乘(golden),scoreboard逐元素比对阵列输出;参考模型绝不能和RTL抄同一份理解(共同盲点)。图:DUT阵列输出 vs Golden矩阵乘模型→Scoreboard比对(相等/报错),标"参考模型独立实现防共同盲点"。'},
  {doc:'06', sec:'3.5', name:'覆盖率(coverage)', focus:'验证味:TPU代码覆盖(行/分支/翻转/FSM,工具自动收)+功能覆盖(手写covergroup:各矩阵尺寸/是否溢出/各指令/FIFO满空/各CDC路径);覆盖驱动验证CDV盯空洞补激励;覆盖到≠检查对。图:两类覆盖 Code(自动)|Functional(手写covergroup)→收敛进度,标CDV循环与"覆盖≠查对"警示。'},
  {doc:'06', sec:'3.6', name:'UVM 方法学', focus:'验证味:TPU为阵列/内存接口/指令接口各搭UVM agent(sequencer→driver→monitor),组合成chip-level环境;约束随机+覆盖+自检都在UVM框架里。图:UVM环境层次 Test→Env→Agent{Sequencer→Driver, Monitor}→Scoreboard,标可复用。诚实:UVM是业界标准方法学。'},
  {doc:'06', sec:'3.7', name:'断言(assertions / SVA)', focus:'验证味:TPU断言示意——valid拉高后ready前数据不变、FIFO不溢出、阵列不在装填未完时输出;断言在bug发生那一刻那个位置抓住,缩短调试,还能喂formal。图:一个接口上挂 assert property 监视握手,违反即红灯定位;标SVA(示意)。'},
  {doc:'06', sec:'3.8', name:'形式验证(formal)', focus:'验证味:TPU用formal穷举证控制FSM无死锁、握手协议恒成立、CDC结构正确(仿真难穷尽);大数据通路阵列易状态爆炸要划范围。图:formal对一个FSM/协议穷举所有状态→证明holds或给反例counterexample,旁边对比"仿真只走有限路径"。'},
  {doc:'06', sec:'3.9', name:'仿真加速:emulation / FPGA 原型', focus:'验证味:TPU软件仿真跑完整芯片/真实模型推理太慢→emulator(Palladium/ZeBu/Veloce)快几个数量级跑整芯片级数据流;FPGA原型更快给软件团队提前用。图:三档速度对比 软件仿真(慢/可见性好)→Emulation(快/可见性中)→FPGA原型(最快/可见性差),标各自用途。诚实:加速平台通行。'},
  {doc:'06', sec:'3.10', name:'专项验证(CDC/低功耗/X/寄存器/连通性)', focus:'验证味:TPU专项——CDC验证(核心域↔PCIe↔DDR3同步,注入亚稳态)、低功耗验证(空闲PE门控下电/保持/隔离/恢复)、X传播、CSR寄存器读写复位值、连通性;普通功能仿真默认看不到却最致命。图:几个专项检查并列(CDC/低功耗UPF/X-prop/CSR/连通性)各指向TPU对应部件。诚实:通行专项验证。'},
  {doc:'06', sec:'3.11', name:'回归、调试与 bug 管理', focus:'验证味:TPU每晚回归海量随机矩阵+定向用例,失败自动分诊(设计bug还是环境bug)→入bug库跟踪到关闭;盯bug发现/关闭收敛曲线判能否流片。图:回归闭环 Nightly Regression→Pass/Fail→Triage→Bug DB→Fix→回归,附一条bug收敛曲线示意。'},
  {doc:'06', sec:'3.12', name:'覆盖收敛与验证签核(closure)', focus:'验证味:TPU回答"验完了吗能流片吗"——判据=功能/代码覆盖率达标+验证计划逐条闭环+bug收敛(新bug趋零、无未决严重bug),正式闸门放行综合/流片。图:三条收敛判据(覆盖率达标✓/计划闭环✓/bug收敛✓)→Sign-off闸门→放行⑦综合。诚实:签核判据通行。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(功能验证)· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU/验证 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取案例碎片:${path}(文档 ${d.doc} 小节 ${d.sec}「${d.name}」,功能验证的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 ~30GB/s、28nm/331mm²、PCIe、weight-stationary);验证方法学(UVM/SVA/covergroup/formal/emulation)用"通行验证实践"措辞,不得编造 TPU 私有验证环境/数字;示意片段标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上语义,且有验证味(验证计划/覆盖/scoreboard/UVM/断言/形式/签核等)。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,300)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个验证小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
