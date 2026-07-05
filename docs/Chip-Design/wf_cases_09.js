export const meta = {
  name: 'tpu-cases-09',
  description: '为签核(文档09)的10个小节生成 TPU 真实案例(SVG概念图+设计前/时/结果/后),写入 cases_frag/09-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 签核案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/Chip-Design/cases_frag';

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.)。绝不引入别的芯片。本篇是「⑨ 签核(signoff)」,案例要带签核味道——讲"流片前怎么对 TPU 的版图做这一维度的最终签核、用什么金标准工具/数据、判据是什么"。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB Unified Buffer(约占 die 29%);4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令;28nm/die ≤331mm²/28–40W;TensorFlow/XLA。
诚实红线:签核的工具/流程/corner/判据(PrimeTime STA、MMMC、OCV、RedHawk/Voltus IR-EM、Calibre DRC/LVS、Formality LEC、DFM)是**通行签核 EDA 实践**,TPU 不会公开其签核报告/corner/QoR。**不得编造 TPU 私有签核数字**;用"这类大芯片的通行签核实践"措辞,把 TPU 已知结构(脉动阵列、24MiB UB、700MHz、28nm、≤331mm²、28–40W、weight-stationary)作为被签核对象来讲签核概念。可写示意性的判据(如 setup slack ≥ 0、IR-drop < 电源 X%)但标明示意。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum / chip("Google TPU v1") / title(含芯片名) / oneLine(点题:本案例如何映射该签核小节)
- svg: SVG 概念图字符串(规范见下)
- legend: [{k,name,desc}] 3~5 项;k 必须等于 svg 里某 data-k 或 data-g
- steps: [{keys:[..],cap}] 3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(签核前·要定哪些事:真实寄生SPEF/corner集/模式/判据/工具/豁免规则等),3~5 条,可 <b>…</b> 起头
- during: 数组(签核时·怎么做/取舍/铁律),4~6 条
- result: 数组 [{label,value}](签核结果/判据长什么样:可含示意判据、报告项),4~6 项
- after: 数组(签核后·违例回⑧ECO/再签/汇总闸门/tape-out),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(签核方法部分注明"通行签核实践")

【SVG 规范——严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg">,H 取 280~420。
- 必含箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。
- 盒子:<g class="cs-part" data-k="sta" data-g="sta"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>。
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;虚线 stroke-dasharray="5 4"。
- 文字:class="cs-note"/"cs-sub"/"cs-t"。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(多维度汇入闸门)】
<svg class="cs-svg" viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="sta" data-g="sta"><rect class="cs-box" x="30" y="40" width="150" height="44" rx="8"/><text class="cs-t" x="105" y="67">STA 时序 ✓</text></g><g class="cs-part" data-k="pwr" data-g="pwr"><rect class="cs-box" x="30" y="96" width="150" height="44" rx="8"/><text class="cs-t" x="105" y="123">功耗 ✓</text></g><line class="cs-arr" x1="180" y1="62" x2="300" y2="100" marker-end="url(#csar)"/><line class="cs-arr" x1="180" y1="118" x2="300" y2="108" marker-end="url(#csar)"/><g class="cs-part" data-k="gate" data-g="gate"><rect class="cs-box" x="304" y="78" width="170" height="56" rx="8"/><text class="cs-t" x="389" y="104">tape-out 闸门</text><text class="cs-sub" x="389" y="122">全绿才放行</text></g></svg>

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
  {doc:'09', sec:'3.1', name:'签核流程与"金标准"工具', focus:'签核味:TPU签核组织——准备SPEF真实寄生+全corner→并行跑各维度签核→汇总tape-out闸门;用业界认可签核级工具;高度迭代,发现问题回⑧ECO再签到全绿。图:签核流程 版图+SPEF→[多维度并行签核]→tape-out闸门,标金标准工具+迭代回⑧。诚实:签核流程为通行实践。'},
  {doc:'09', sec:'3.2', name:'静态时序分析(STA)', focus:'签核味:TPU STA不靠仿真、用真实寄生穷举所有时序路径逐条查setup(够快)/hold(别太快);vectorless覆盖所有路径比仿真彻底;setup可降频救、hold是硬伤必须全清;证明阵列+全局路径700MHz下setup/hold全满足=700MHz作数的最终依据。图:一条时序路径 发起FF→组合逻辑→捕获FF,标setup/hold检查与slack,标"穷举所有路径、无需激励"。'},
  {doc:'09', sec:'3.3', name:'多角多模与片上偏差(MMMC / OCV)', focus:'签核味:TPU多模式(功能/测试/低功耗)×多PVT corner(工艺SS/TT/FF、电压、温度)都签核;OCV/AOCV/POCV考虑片上偏差加derate;最坏组合下仍成立(慢工艺低压高温查setup、快工艺查hold);corner漏一个硅上那条件失效;28nm各corner×各模式都过(数据中心高温电压波动700MHz稳)。图:corner矩阵(工艺×电压×温度几格,标SS/TT/FF)+模式,标"最坏组合必须过"。'},
  {doc:'09', sec:'3.4', name:'功耗签核(动态 + 漏电)', focus:'签核味:TPU确认功耗在预算——动态(翻转)+静态(漏电),峰值与平均;核对是否超TDP/触发散热供电上限;峰值关系电源完整性;确认满负荷28-40W、漏电受控(多Vt效果在此验收)。图:功耗构成(动态功耗+漏电功耗)柱状+TDP红线,标峰值/平均。'},
  {doc:'09', sec:'3.5', name:'电源完整性(IR-drop / EM)', focus:'签核味:TPU电源完整性签核——IR-drop(电流过PDN压降,静态+动态)+电迁移EM(电流密度高致金属长期失效);IR-drop大→单元电压不足→时序失效甚至功能错;EM超标→缩寿命;256×256阵列满负荷瞬时电流巨大是重灾区,确认⑧的PDN压得住用得久。图:die上IR-drop热图(阵列区颜色深=压降大,网格示意)+EM电流密度检查,标高电流阵列重灾区。'},
  {doc:'09', sec:'3.6', name:'信号完整性(SI)签核', focus:'签核味:TPU SI签核——串扰crosstalk引起延迟变化+噪声毛刺glitch是否破坏时序/功能;纳入STA(crosstalk-aware);先进节点SI越来越主导;阵列密集并行连线串扰+长总线噪声确认不破坏700MHz。图:aggressor线干扰victim线(串扰耦合)→延迟变化/毛刺→纳入STA检查,标crosstalk-aware。'},
  {doc:'09', sec:'3.7', name:'物理验证签核(DRC / LVS / antenna)', focus:'签核味:TPU版图最终硬体检 DRC(设计规则)+LVS(版图≡网表)+antenna+ERC,签核级金标准最终确认;必须100%干净(违例修掉或foundry豁免)是收版图、能否流片的硬门槛;28nm die全清才被产线接收。图:版图→金标准 DRC/LVS/antenna 检查→全清✓/违例✗(修或豁免),标"不干净=不收版图"。'},
  {doc:'09', sec:'3.8', name:'逻辑等价性签核(LEC)', focus:'签核味:TPU最终等价检查——证明经综合/后端/所有ECO后最终门级网表仍≡已验证RTL;后端每次物理优化/ECO都可能动逻辑,只有LEC保证功能没悄悄改坏;把功能正确性从⑥一路守到tape-out。图:RTL ──最终LEC──> 最终网表(经ECO),≡逻辑等价判定(等价✓/反例✗),标"功能从⑥守到流片"。'},
  {doc:'09', sec:'3.9', name:'可靠性与可制造性(DFM / ESD / latch-up / aging)', focus:'签核味:TPU面向良率与长期可靠的签核——DFM可制造性(冗余via/光刻友好)提良率降成本+ESD/latch-up保护检查+老化aging(HCI/NBTI)可靠性裕量;数据中心7×24要长期高可靠;确保量产良率与寿命达标。图:三项并列 DFM(冗余via)/ESD-latchup保护/aging老化,各指向"良率与寿命",标数据中心长期可靠。诚实:可靠性签核为通行实践。'},
  {doc:'09', sec:'3.10', name:'签核闸门与 tape-out 决策', focus:'签核味:TPU把所有维度签核结果汇总成正式闸门,全绿(或违例豁免有据)才出tape-out放行;正式评审有checklist有签字负责;签核团队+后端+项目共同确认可流片;所有绿灯→评审通过→送28nm GDSII给foundry。图:多维度签核结果(STA✓/功耗✓/IR✓/SI✓/DRC-LVS✓/LEC✓/可靠✓)汇入→tape-out闸门→放行⑩流片,标checklist+签字。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(签核)· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU/签核 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取案例碎片:${path}(文档 ${d.doc} 小节 ${d.sec}「${d.name}」,签核的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 ~30GB/s、28nm/≤331mm²/28–40W、PCIe、weight-stationary);签核工具/corner/判据用"通行签核实践"措辞,不得编造 TPU 私有签核数字/报告;示意判据标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上语义,且有签核味(STA/MMMC/corner/IR-EM/SI/DRC-LVS/LEC/tape-out等)。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,300)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个签核小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
