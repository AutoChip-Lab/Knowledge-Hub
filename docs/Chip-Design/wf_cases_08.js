export const meta = {
  name: 'tpu-cases-08',
  description: '为物理设计(文档08)的11个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/08-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 后端案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/Chip-Design/cases_frag';

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.)。绝不引入别的芯片。本篇是「⑧ 物理设计(后端)」,案例要带后端味道——讲"怎么把 TPU 的这部分门级网表布局/布线/做成版图、用什么工具/数据、产物长什么样"。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB Unified Buffer(约占 die 29% 面积);4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令;28nm/die ≤331mm²/28–40W;TensorFlow/XLA。
诚实红线:后端的工具/流程/版图数据(Innovus/ICC2、LEF/DEF、SDC、CTS、SPEF、Calibre DRC/LVS、IR-drop)是**通行后端 EDA 实践**,TPU 不会公开其 floorplan/PDN/QoR/版图细节。**不得编造 TPU 私有的后端数字或版图**;用"这类大芯片的通行后端实践"措辞,把 TPU 已知结构(脉动阵列、24MiB UB SRAM、700MHz、28nm、≤331mm²、weight-stationary)作为被实现对象来讲后端概念。可写示意性的设置(如利用率 70%、金属层 M1–Mx)但标明示意。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum / chip("Google TPU v1") / title(含芯片名) / oneLine(点题:本案例如何映射该后端小节)
- svg: SVG 概念图字符串(规范见下)
- legend: [{k,name,desc}] 3~5 项;k 必须等于 svg 里某 data-k 或 data-g
- steps: [{keys:[..],cap}] 3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(后端前·要定哪些事:库LEF/工艺规则/floorplan/电源方案/约束/UPF/DFT等),3~5 条,可 <b>…</b> 起头
- during: 数组(后端实现时·怎么做/取舍/铁律),4~6 条
- result: 数组 [{label,value}](后端产物/设置长什么样:可含示意设置、版图块、报告),4~6 项
- after: 数组(本步后·检查时序/拥塞/DRC、迭代、交签核),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(后端方法部分注明"通行后端实践")

【SVG 规范——严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg">,H 取 280~420。
- 必含箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。
- 盒子:<g class="cs-part" data-k="mxu" data-g="mxu"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>。画版图块/die 也用 cs-box。
- 箭头/连线:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;电源网格/布线可用细 line(可不带 marker)。虚线 stroke-dasharray="5 4"。
- 文字:class="cs-note"/"cs-sub"/"cs-t"。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(后端流程管线)】
<svg class="cs-svg" viewBox="0 0 720 170" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="fp" data-g="fp"><rect class="cs-box" x="30" y="64" width="130" height="56" rx="8"/><text class="cs-t" x="95" y="88">布局规划</text><text class="cs-sub" x="95" y="104">floorplan</text></g><line class="cs-arr" x1="160" y1="92" x2="236" y2="92" marker-end="url(#csar)"/><g class="cs-part" data-k="place" data-g="place"><rect class="cs-box" x="240" y="64" width="130" height="56" rx="8"/><text class="cs-t" x="305" y="88">布局</text><text class="cs-sub" x="305" y="104">placement</text></g><line class="cs-arr" x1="370" y1="92" x2="446" y2="92" marker-end="url(#csar)"/><g class="cs-part" data-k="route" data-g="route"><rect class="cs-box" x="450" y="64" width="130" height="56" rx="8"/><text class="cs-t" x="515" y="88">布线</text><text class="cs-sub" x="515" y="104">routing</text></g></svg>

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
  {doc:'08', sec:'3.1', name:'物理设计流程与数据准备', focus:'后端味:TPU 后端流程——数据准备(网表/LEF/tech规则/SDC/SRAM宏)→floorplan→电源→布局→CTS→布线→收敛→GDSII;高度迭代。图:后端流程管线 Netlist+LEF+Tech→Floorplan→Power→Place→CTS→Route→Signoff/GDSII,标各步。诚实:流程为通行后端实践。'},
  {doc:'08', sec:'3.2', name:'布局规划(floorplan)', focus:'后端味:TPU die≤331mm²上摆——256×256阵列规整大块、24MiB Unified Buffer的SRAM宏(约占die 29%面积)沿阵列边、累加器、IO/pad环;定利用率、留布线/电源通道;floorplan定全局成败,宏摆不好后面布线拥塞时序崩。图:die矩形里放几个块(MXU阵列大块、UB SRAM宏、Accumulators、IO环),标利用率与通道。'},
  {doc:'08', sec:'3.3', name:'电源网络规划(power planning / PDN)', focus:'后端味:TPU 256×256阵列满负荷电流巨大→铺足够粗的电源环ring+电源条/网格straps压IR-drop/电迁移EM;PDN太弱→压降致时序失效甚至功能错;PDN与布线抢金属资源。图:die上电源环+电源条网格(网格线),标"高翻转阵列需强PDN压IR-drop"。'},
  {doc:'08', sec:'3.4', name:'布局(placement)', focus:'后端味:TPU标准单元时序驱动+拥塞驱动摆放再合法化;阵列规整性是后端福音——成排PE规则摆、数据流方向清晰、拥塞可控;盯congestion,摆太挤布不通。图:核内单元摆放(规整阵列区+控制逻辑区),标时序驱动+拥塞驱动+合法化。'},
  {doc:'08', sec:'3.5', name:'时钟树综合(CTS)', focus:'后端味:CTS前时钟当理想(零延迟),CTS真正搭时钟分发树(buffer树/H-tree)目标低skew偏差+合理插入延迟+整合时钟门控;把700MHz低偏差送到整块巨大阵列所有触发器;skew大→跑不到频率+诱发hold。图:H-tree时钟树从根经buffer逐级分发到阵列触发器,标skew要小。'},
  {doc:'08', sec:'3.6', name:'布线(routing)', focus:'后端味:TPU全局布线(分配走廊)+详细布线(具体到层/走向)用真实金属线,多金属层,满足DRC,盯拥塞/串扰;阵列内规则短连线+全局控制/数据总线;布完RC才完全真实。图:多金属层布线 global→detailed,阵列短连线+全局总线,标金属层与DRC。'},
  {doc:'08', sec:'3.7', name:'时序收敛(timing closure / ECO)', focus:'后端味:TPU布局后/CTS后/布线后反复STA修setup(提速:换快单元/缩线/重摆)和hold(加延迟:插延迟单元),用useful skew/ECO增量;阵列关键路径短setup宽裕,重点修长全局路径+hold(大阵列hold修复琐碎);后端最耗时拉锯,贯穿全程。图:一条时序路径修复——setup违例→换快单元;hold违例→插延迟单元,标贯穿布局到布线迭代。'},
  {doc:'08', sec:'3.8', name:'寄生提取与信号完整性(extraction / SI)', focus:'后端味:TPU寄生提取RC(出SPEF)算每条线真实电阻电容供精确时序;信号完整性处理串扰crosstalk(aggressor/victim)/噪声;密集阵列相邻线串扰+长总线RC纳入时序,确保700MHz在真实寄生下仍成立。图:版图线→提取RC(SPEF)→精确时序;旁边串扰aggressor干扰victim示意。'},
  {doc:'08', sec:'3.9', name:'物理验证(DRC / LVS / antenna)', focus:'后端味:TPU版图硬性体检——DRC(线宽/间距规则)+LVS(版图连接≡网表)+antenna;必须100%干净,是foundry收版图、能否流片的硬门槛。图:版图→DRC检查(规则违规标记)+LVS检查(版图vs网表比对),通过✓/违规✗,标"不干净=不能流片"。'},
  {doc:'08', sec:'3.10', name:'后端的低功耗与 DFT 落地', focus:'后端味:TPU把低功耗/DFT意图版图落地——电源开关/隔离单元/电平移位器摆放、always-on区域、电源域边界(按UPF);scan链物理重排序(就近重连)利布线;空闲PE列门控/电源管理落地。图:电源域边界+隔离单元/电平移位器 + scan链物理重排示意,标UPF落地。'},
  {doc:'08', sec:'3.11', name:'产出与交接(GDSII 准备)', focus:'后端味:TPU后端最终产物GDSII/OASIS版图+提取寄生SPEF+最终网表+时序/功耗/DRC报告→交⑨签核做全面STA/功耗/EM-IR/物理验证/等价,通过即⑩流片;后端与签核来回迭代到全绿。图:后端产物打包(GDSII/SPEF/Netlist/Reports)→箭头→⑨签核→⑩流片。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(物理设计/后端)· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU/后端 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取案例碎片:${path}(文档 ${d.doc} 小节 ${d.sec}「${d.name}」,物理设计的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB(约占die 29%)、4MiB累加器、DDR3 ~30GB/s、28nm/≤331mm²、PCIe、weight-stationary);后端工具/流程/版图用"通行后端实践"措辞,不得编造 TPU 私有 floorplan/PDN/QoR 数字;示意设置标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上语义,且有后端味(floorplan/PDN/placement/CTS/routing/timing closure/DRC-LVS/GDSII等)。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,300)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个后端小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
