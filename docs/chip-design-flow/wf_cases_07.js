export const meta = {
  name: 'tpu-cases-07',
  description: '为逻辑综合(文档07)的10个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/07-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 综合案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/chip-design-flow/cases_frag';

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.)。绝不引入别的芯片。本篇是「⑦ 逻辑综合」,案例要带综合味道——讲"怎么把 TPU 的这部分 RTL 综合成门级网表、用什么约束/库/工具、产物长什么样"。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB Unified Buffer;4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令;28nm/331mm²/28–40W;TensorFlow/XLA。
诚实红线:综合的工具/约束/库/QoR(Design Compiler/Genus/Yosys、SDC、Liberty、多Vt、LEC)是**通行 EDA 综合实践**,TPU 不会公开其约束脚本/库/QoR 数字。**不得编造 TPU 私有的综合数字或脚本**;用"这类设计的通行综合实践"措辞,把 TPU 已知结构(脉动阵列、UB、700MHz、28nm、weight-stationary)作为被综合对象来讲综合概念。可写示意性的 SDC 片段(如 create_clock -period 1.43)但标明示意。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum / chip("Google TPU v1") / title(含芯片名) / oneLine(点题:本案例如何映射该综合小节)
- svg: SVG 概念图字符串(规范见下)
- legend: [{k,name,desc}] 3~5 项;k 必须等于 svg 里某 data-k 或 data-g
- steps: [{keys:[..],cap}] 3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(综合前·要定哪些事:库/约束SDC/功耗意图/DFT要求/QoR目标等),3~5 条,可 <b>…</b> 起头
- during: 数组(综合时·怎么做/取舍/铁律),4~6 条
- result: 数组 [{label,value}](综合产物/设置长什么样:可含示意 SDC 片段、库选项、网表/报告),4~6 项
- after: 数组(综合后·等价检查/看报告/迭代/交后端),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(综合方法部分注明"通行 EDA 综合实践")

【SVG 规范——严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg">,H 取 280~420。
- 必含箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。
- 盒子:<g class="cs-part" data-k="map" data-g="map"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;虚线 stroke-dasharray="5 4"。
- 文字:class="cs-note"/"cs-sub"/"cs-t"。示意 SDC 片段可作短 cs-note 放图里。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(综合流程管线)】
<svg class="cs-svg" viewBox="0 0 720 180" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="rtl" data-g="rtl"><rect class="cs-box" x="30" y="70" width="120" height="56" rx="8"/><text class="cs-t" x="90" y="94">RTL</text><text class="cs-sub" x="90" y="110">可综合代码</text></g><line class="cs-arr" x1="150" y1="98" x2="226" y2="98" marker-end="url(#csar)"/><g class="cs-part" data-k="map" data-g="map"><rect class="cs-box" x="230" y="64" width="150" height="68" rx="8"/><text class="cs-t" x="305" y="92">工艺映射</text><text class="cs-sub" x="305" y="110">映射到标准单元</text></g><line class="cs-arr" x1="380" y1="98" x2="456" y2="98" marker-end="url(#csar)"/><g class="cs-part" data-k="net" data-g="net"><rect class="cs-box" x="460" y="70" width="150" height="56" rx="8"/><text class="cs-t" x="535" y="94">门级网表</text><text class="cs-sub" x="535" y="110">标准单元+连线</text></g></svg>

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
  {doc:'07', sec:'3.1', name:'综合流程与产物(全景)', focus:'综合味:TPU RTL经 read→elaborate(通用逻辑)→technology mapping(标准单元)→optimize(时序/面积/功耗)→门级网表+报告 五步;迭代跑调约束。图:综合流程管线 RTL→Elaborate→Tech Map→Optimize→Netlist,标各步与产物。诚实:流程是通行EDA实践。'},
  {doc:'07', sec:'3.2', name:'工艺库与标准单元', focus:'综合味:TPU 28nm标准单元库——门/触发器/加法器,多驱动强度+多Vt(LVT快漏大/HVT省漏慢);综合从库挑单元实现逻辑,阵列海量MAC用库单元,非关键路径用HVT压漏电。图:标准单元库(几个cell:AND/FF/ADD各标drive/Vt)→综合挑选→实现逻辑。诚实:库由foundry提供,具体单元非TPU私有。'},
  {doc:'07', sec:'3.3', name:'约束(constraints / SDC)', focus:'综合味:TPU用SDC给综合指挥棒——create_clock 700MHz(周期≈1.43ns,示意)、IO延迟、跨域false/multicycle path;约束错/漏→优化错方向(garbage in garbage out)。图:一条时序路径上挂SDC约束(create_clock、set_input_delay、set_false_path),标"约束=指挥棒,错了优化错目标"。SDC片段标示意。'},
  {doc:'07', sec:'3.4', name:'时序驱动综合与 slack', focus:'综合味:TPU综合以满足时序为首要,算每条路径 slack=要求时间-到达时间,负slack=违例;盯关键路径优化;阵列关键路径=一个MAC很短slack充裕轻松700MHz,真正吃紧的是长全局控制/IO路径;综合线延迟是估计,真账在签核⑨。图:一条时序路径 起点FF→组合逻辑→终点FF,标 arrival/required/slack,正slack✓/负slack✗。'},
  {doc:'07', sec:'3.5', name:'面积与时序/面积/功耗权衡', focus:'综合味:TPU PPA铁三角——压时序常涨面积/功耗;阵列时序宽裕→回收非关键路径面积(downsize、换HVT),在保700MHz下省面积和漏电。图:PPA三角(时序↔面积↔功耗)+ "时序满足后回收非关键路径面积/功耗"的箭头。'},
  {doc:'07', sec:'3.6', name:'功耗优化(综合阶段)', focus:'综合味:TPU综合阶段插省电结构——自动时钟门控ICG(把⑤写的带enable更新识别成门控)、多Vt(非关键换HVT)、操作数隔离、按UPF多电源域;空闲PE列门控在这里真正插成ICG单元。图:综合把一组寄存器前插入ICG门控单元(enable+clk→gated_clk)+ 多Vt替换示意,标"工具自动插入"。'},
  {doc:'07', sec:'3.7', name:'DFT 综合(scan 插入)', focus:'综合味:TPU综合中把普通FF换成scan FF并串成scan chain+test compression,达覆盖率目标;DFT友好RTL在这才插得进;阵列成千上万FF串scan、SRAM接MBIST,保证量产可测、算得清良率。图:普通FF→scan FF→串成scan chain(几个scan FF链)+ compression,标量产可测。'},
  {doc:'07', sec:'3.8', name:'综合策略(层次 vs 展平、retiming)', focus:'综合味:TPU 层次化vs展平——大芯片层次化(runtime/内存友好、可复用),关键块局部展平;retiming挪寄存器平衡流水;256×256阵列=同一PE海量复制→层次化综合一个PE再复用铺满阵列,省runtime又一致。图:左"层次化:综合一个PE→复用铺满N×N阵列",右"展平:跨边界一起优化"对比,标TPU用层次化复用。'},
  {doc:'07', sec:'3.9', name:'形式等价性检查(LEC)', focus:'综合味:TPU每次综合/ECO后跑LEC(Formality/Conformal)用形式方法数学证明门级网表≡RTL,确保优化没改功能;不可省的签核项,综合器也可能因约束误导或bug改错功能,只有LEC兜得住。图:RTL ──LEC──> Netlist,中间"≡ 逻辑等价?"判定(等价✓/给反例✗),标"功能从⑥一路守到门级"。'},
  {doc:'07', sec:'3.10', name:'综合产出与交接(给后端)', focus:'综合味:TPU综合交付——28nm门级网表+综合后SDC+时序/面积/功耗报告+scan/DFT信息→交⑧物理设计开始布局布线;网表+SDC是后端输入,报告供评估QoR能否进后端。图:综合产物打包(Netlist/SDC/Reports/Scan)→箭头→⑧物理设计(布局布线),标交接。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(逻辑综合)· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU/综合 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取案例碎片:${path}(文档 ${d.doc} 小节 ${d.sec}「${d.name}」,逻辑综合的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 ~30GB/s、28nm/331mm²、PCIe、weight-stationary);综合工具/约束/库/QoR 用"通行 EDA 综合实践"措辞,不得编造 TPU 私有综合数字/脚本;示意 SDC 片段标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上语义,且有综合味(库/SDC/slack/PPA/门控/scan/LEC/网表等)。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,300)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个综合小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
