export const meta = {
  name: 'tpu-cases-10to13',
  description: '为流片/制造/封测/量产(文档10-13)的30个小节生成 TPU 真实案例(SVG+设计前/时/结果/后),写入 cases_frag/{10..13}-*.json',
  phases: [
    { title: 'Author', detail: '每个小节作者一个 TPU 案例并写成 JSON 碎片' },
    { title: 'Verify', detail: '对抗式校验:诚实 + SVG有效 + 高亮key匹配 + 四段完整,就地修复' },
  ],
}

const DIR = '/Users/sunking/Desktop/chip-design-flow/cases_frag';
const DOCNAME = { "10":"流片(tape-out)", "11":"制造(Fab)", "12":"封装测试", "13":"bring-up / 量产" };

const STYLE = `
你在为一套中文《芯片设计完整流程》学习网站,补一个小节的「真实芯片案例」。**全系列只用 Google TPU 这一款芯片举例**(主用 TPU v1,ISCA 2017 "In-Datacenter Performance Analysis of a TPU", Jouppi et al.)。绝不引入别的芯片。本批属于「制造与交付阶段」(⑩流片/⑪制造/⑫封测/⑬量产之一),案例要贴合该小节主题,带相应工序味道。

TPU v1 可引用的硬事实:256×256=65,536 个 8-bit MAC 脉动阵列;700 MHz → ~92 TOPS(INT8);24 MiB Unified Buffer;4 MiB 32-bit 累加器;片外 8 GiB DDR3(~30 GB/s);weight-stationary;主机经 PCIe 3.0 发约十几条 CISC 指令、做成 PCIe 加速卡;28nm/die ≤331mm²/28–40W;TensorFlow/XLA;Jouppi 团队约 15 个月从立项到部署、公开发布前已在数据中心运行一年多。
诚实红线:制造/掩模/封装/测试/良率/bring-up 的具体工艺、设备、数字、配方多为 foundry/OSAT/业界**通行实践**,TPU 不会公开其私有制造/封测/良率数据。**不得编造 TPU 私有的工艺/良率/封装/测试数字,也不得指定 TPU v1 的具体代工厂(资料未公开)**;用"这类 28nm 大芯片 / PCIe 加速卡的通行制造与交付实践"措辞,把 TPU 已知结构(256×256 阵列、24MiB UB、700MHz、28nm、≤331mm²、PCIe 卡、TF 栈)作为被制造/封测/点亮的对象来讲概念。

【输出:一个 JSON 案例对象,字段如下,全部中文】
- secNum / chip("Google TPU v1") / title(含芯片名) / oneLine(点题)
- svg: SVG 概念图字符串(规范见下)
- legend: [{k,name,desc}] 3~5 项;k 必须等于 svg 里某 data-k 或 data-g
- steps: [{keys:[..],cap}] 3~5 步;每个 keys 元素必须是 svg 里出现的 data-k 或 data-g
- before: 数组(本步之前·要定/准备哪些事),3~5 条,可 <b>…</b> 起头
- during: 数组(本步进行时·怎么做/关键点/取舍),4~6 条
- result: 数组 [{label,value}](本步产物/结果长什么样),4~6 项
- after: 数组(本步之后·检查/筛选/迭代/交下一步),4~5 条
- source: "In-Datacenter Performance Analysis of a TPU, Jouppi et al., ISCA 2017"(工艺/方法部分注明"通行制造/封测/量产实践")

【SVG 规范——严格遵守,否则高亮失效】
- 根:<svg class="cs-svg" viewBox="0 0 720 H" xmlns="http://www.w3.org/2000/svg">,H 取 280~420。
- 必含箭头 marker:<defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
- 可高亮部件:<g class="cs-part" data-k="键" data-g="键">…</g>。
- 盒子:<g class="cs-part" data-k="fab" data-g="fab"><rect class="cs-box" x= y= width= height= rx="8"/><text class="cs-t" x=居中 y=>标题</text><text class="cs-sub" x= y=>副标题</text></g>。
- 网格(晶圆上的 die / 阵列)用 <rect class="cs-cell"/> + 可选 <text class="cs-cellt"/>,整组同概念用同一 data-k。
- 箭头:<line class="cs-arr" x1 y1 x2 y2 marker-end="url(#csar)"/> 或 polyline;虚线 stroke-dasharray="5 4"。剖面分层可用多个 cs-box 上下叠。
- 文字:class="cs-note"/"cs-sub"/"cs-t"。坐标都在 720×H 内、不重叠、≤14 个 cs-part。不要内联 <style>/<script>。

【参考样例(工序流程管线)】
<svg class="cs-svg" viewBox="0 0 720 170" xmlns="http://www.w3.org/2000/svg"><defs><marker id="csar" markerWidth="9" markerHeight="9" refX="6.5" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs><g class="cs-part" data-k="a" data-g="a"><rect class="cs-box" x="30" y="64" width="140" height="56" rx="8"/><text class="cs-t" x="100" y="88">沉积</text><text class="cs-sub" x="100" y="104">长材料层</text></g><line class="cs-arr" x1="170" y1="92" x2="250" y2="92" marker-end="url(#csar)"/><g class="cs-part" data-k="b" data-g="b"><rect class="cs-box" x="254" y="64" width="140" height="56" rx="8"/><text class="cs-t" x="324" y="88">光刻</text><text class="cs-sub" x="324" y="104">定义图形</text></g><line class="cs-arr" x1="394" y1="92" x2="474" y2="92" marker-end="url(#csar)"/><g class="cs-part" data-k="c" data-g="c"><rect class="cs-box" x="478" y="64" width="140" height="56" rx="8"/><text class="cs-t" x="548" y="88">刻蚀</text><text class="cs-sub" x="548" y="104">去除多余</text></g></svg>

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
  // ===== 10 流片 =====
  {doc:'10', sec:'3.1', name:'流片与交付数据(GDSII/OASIS)', focus:'流片味:TPU签核版图打包成GDSII/OASIS+层映射/文档正式提交foundry;核对层/密度/填充fill/对位标记;一次提交错代价大。图:版图→打包GDSII/OASIS(层/fill/标记)→提交foundry。诚实:格式/流程为通行实践。'},
  {doc:'10', sec:'3.2', name:'掩模数据准备(MDP / OPC / RET)', focus:'流片味:版图不能直接做掩模,经掩模数据准备:fracturing(转掩模写设备图形)+OPC光学邻近校正+RET(相移/SRAF/多重曝光);因光波长画不出小图形要预畸变让印到硅接近设计;节点越先进越复杂。图:设计图形→OPC预畸变(加修正小图形)→印到硅接近原图,标"波长限制要预畸变"。'},
  {doc:'10', sec:'3.3', name:'光掩模(mask / reticle)制作', focus:'流片味:处理后数据写到掩模——石英基板吸收层(铬),电子束/激光写每层图形;一套掩模=每工艺层一张(几十张);掩模是制造母版精度极高昂贵,做好后检测/修复缺陷。图:数据→掩模写制(e-beam)→一套掩模(多层每层一张)+缺陷检测。'},
  {doc:'10', sec:'3.4', name:'流片方式:全掩模 vs MPW / shuttle', focus:'流片味:全掩模full mask set(专属整套,量产用)vs MPW多项目晶圆shuttle(多项目共享掩模/晶圆摊薄NRE,原型/小量用);首版试错走MPW省钱,确认量产上全掩模。图:左"全掩模:专属整套→量产",右"MPW:多项目拼一片晶圆→摊薄NRE"对比。诚实:策略为通行实践。'},
  {doc:'10', sec:'3.5', name:'NRE 与流片成本', focus:'流片味:流片是NRE大头——掩模成本先进节点惊人(可达千万美元级)+工程/IP/流片服务费;成本进商业模型;first silicon success价值巨大(少一轮re-spin省几百万+几个月);28nm掩模+流片是TPU NRE重要组成,"15个月部署"经不起多次re-spin。图:NRE构成(掩模成本大头+工程+IP+服务费)柱状对比,标re-spin代价高。'},
  {doc:'10', sec:'3.6', name:'交接、签字与流片后等待', focus:'流片味:正式tape-out release签字交付→foundry排程开工→等首批硅first silicon(turnaround数周到数月);交付走checklist+签字负责;等待期团队转去做软件/测试程序/bring-up准备;TPU tape-out后等28nm产线跑首批wafer同步备bring-up与软件栈。图:tape-out release(签字)→foundry排程→等待turnaround→first silicon,虚线标等待期并行准备软件/bring-up。'},
  // ===== 11 制造 =====
  {doc:'11', sec:'3.1', name:'制造全景与晶圆(wafer)', focus:'制造味:硅晶圆(常见300mm)上一次造成百上千个die,走数百道工序数周到数月;die越大一片越少且越易被缺陷击中(良率低);≤331mm²大die一片wafer能切有限对良率敏感。图:300mm圆wafer上密铺die网格(cs-cell),标大die数量少+良率敏感。诚实:制造为foundry通行工艺。'},
  {doc:'11', sec:'3.2', name:'光刻(lithography)', focus:'制造味:制造画笔——涂光刻胶→透过掩模曝光(DUV 193i浸没,先进节点EUV)→显影出图形;分辨率决定能做多小,波长不够靠多重曝光/OPC(⑩预畸变在此兑现);28nm用DUV浸没式逐层定义阵列与连线。图:光刻三步 涂胶→掩模曝光(光透过掩模)→显影出图形,标DUV/分辨率。'},
  {doc:'11', sec:'3.3', name:'沉积、刻蚀、掺杂(核心工艺循环)', focus:'制造味:核心工艺循环——沉积(CVD/PVD/ALD长材料层)+刻蚀(干/湿去除)+离子注入掺杂(改导电性做晶体管)+CMP化学机械抛光磨平;每层靠这组精确配合,一道偏差整片报废;阵列每个晶体管的栅/源漏/各层金属都这么做出。图:循环箭头 沉积→光刻→刻蚀/掺杂→CMP→(回到下一层),标每层反复重复。'},
  {doc:'11', sec:'3.4', name:'前道 FEOL:做晶体管', focus:'制造味:硅表面做晶体管——阱/隔离/栅极(栅氧+栅)/源漏/接触;晶体管质量(速度/漏电/一致性)定性能与良率是工艺核心竞争力(FinFET/GAA在这层);6.5万MAC+控制逻辑+SRAM的晶体管全在此成形。图:晶体管剖面(衬底+阱+栅极+源漏+接触),标FEOL=做晶体管。'},
  {doc:'11', sec:'3.5', name:'后道 BEOL:做互连', focus:'制造味:晶体管之上做多层金属布线(铜)+层间介质+通孔via,把晶体管连成完整电路;现代十几层金属;⑧后端布的线在此变真实金属;把阵列/SRAM/控制逻辑连成⑧设计的版图。图:剖面多层金属互连(衬底上 M1..Mx + via 叠层),标BEOL=做互连。'},
  {doc:'11', sec:'3.6', name:'工艺监控与 PCM', focus:'制造味:全程过程控制——在线量测metrology+缺陷检测+PCM过程控制监测测试结构(划片槽放小图形量晶体管参数)+SPC统计过程控制;及时发现工艺漂移避免成批报废;每批wafer用PCM确认28nm晶体管参数在规格内再往下。图:wafer+划片槽PCM测试结构→量测/缺陷检测→SPC判在线/漂移,标过程控制。诚实:监控为通行实践。'},
  {doc:'11', sec:'3.7', name:'缺陷、良率与缺陷密度', focus:'制造味:晶圆上随机缺陷defect打死die,良率=好die/总die由缺陷密度D0+die面积主导;die越大被击中概率越高良率越低(③强调面积进成本、大芯片转chiplet根因);良率定单位成本;大die TPU对缺陷密度敏感。图:wafer上随机缺陷点(红)打死部分die,标die越大命中越多→良率越低。'},
  {doc:'11', sec:'3.8', name:'制造周期与产能', focus:'制造味:一批wafer走完周期cycle time数周到数月,产能受foundry排期+节点成熟度;周期长+不可逆任何返工代价巨大;周期/排期影响上市与供应;制造+流片排期占"15个月部署"相当部分经不起反复。图:时间轴 投片wafer→数周/月数百道工序→出完工wafer,标周期长+不可逆+产能排期。'},
  // ===== 12 封测 =====
  {doc:'12', sec:'3.1', name:'封测全景', focus:'封测味:流程——晶圆测试CP→减薄切割→封装→成品测试FT→(可靠性/老化)→分级出货;先在晶圆测CP早筛坏die省封装成本,封装后FT确认封装也好。图:封测流程管线 CP→切割→封装→FT→老化→binning出货。诚实:封测为OSAT通行流程。'},
  {doc:'12', sec:'3.2', name:'晶圆减薄与切割(dicing)', focus:'封测味:晶圆背面磨薄backgrind便于封装/散热,再砂轮/激光沿划片槽切成单个die;切割不能损伤die,薄die更脆但利于3D堆叠与散热;把≤331mm²大die完整切下。图:wafer减薄(磨厚度)→沿划片槽切割→分离出单个die,标backgrind+dicing。'},
  {doc:'12', sec:'3.3', name:'封装类型(wire-bond / flip-chip / 2.5D / 3D)', focus:'封测味:die连封装方式——wire-bond引线键合(细金线连焊盘,便宜)/flip-chip倒装(die翻转用焊球C4直连基板,IO多性能好)/2.5D(die+HBM经硅interposer共封)/3D(TSV垂直堆叠);高性能高IO高带宽走flip-chip/2.5D/3D(③§3.14 chiplet物理落地);高性能TPU用flip-chip连大量IO供电。图:四种封装剖面对比 wire-bond | flip-chip(bump) | 2.5D interposer | 3D TSV,标TPU用flip-chip类。'},
  {doc:'12', sec:'3.4', name:'封装工艺(die attach → bonding → molding → balls)', focus:'封测味:die attach贴片→互连(wire-bond/bump)→molding塑封/盖板lid→植球BGA balls,做出能贴板成品封装并提供散热(散热盖/导热);封装兼顾电(供电/SI)+热(散热)+机械(可靠);封成带散热盖+BGA/插卡接口的板卡级封装满足数据中心散热供电。图:封装剖面 基板+die(bump连接)+散热盖+底部BGA球,标兼顾电/热/机械。'},
  {doc:'12', sec:'3.5', name:'晶圆测试(CP / wafer sort)', focus:'封测味:封装前用探针卡在晶圆逐die探测测试CP(chip probing/wafer sort)早筛坏die做wafer map;早筛省封装钱;CP还反馈wafer良率与缺陷分布给制造;对wafer上每颗TPU die先CP标好哪些好哪些坏。图:探针卡probe探测wafer各die→好✓/坏✗标记→wafer map(好坏分布),标早筛省封装成本。'},
  {doc:'12', sec:'3.6', name:'成品测试(FT)与 ATE', focus:'封测味:封装后最终测试FT用ATE自动测试设备跑测试程序:scan/BIST图样+at-speed功能+IO+参数测试,验证造得对跑得到速;测试覆盖率(靠⑦DFT)定漏检率,测试时间直接进成本(海量SRAM/逻辑要高效测);用ATE跑scan+阵列/SRAM的MBIST+功能图样逐颗确认TPU 700MHz正常。图:ATE测试机+测试座连封装芯片→跑scan/BIST/功能/参数→pass/fail,标覆盖率vs测试时间权衡。'},
  {doc:'12', sec:'3.7', name:'老化与可靠性测试(burn-in / reliability)', focus:'封测味:老化burn-in在高温高压下短时运行筛掉早期失效infant mortality+抽样可靠性试验;对高可靠场景(数据中心/车规)尤重要,把"出厂就坏"的提前淘汰;数据中心7×24运行,老化筛掉早夭片降现场失效。图:burn-in炉 高温高压应力→浴盆曲线(左侧infant mortality早期失效被筛掉),标筛早夭。诚实:可靠性试验为通行实践。'},
  {doc:'12', sec:'3.8', name:'分级(binning)与良率筛选', focus:'封测味:按测试结果分级binning(好/坏、按速度/功耗/质量分档),最终只出货已知好芯片KGD;binning让同批die按品质卖不同档(产品差异化);良率筛选直接定交付量与成本;筛出合格TPU加速卡交付数据中心,坏的/不达标剔除。图:测好的die按结果分档(KGD✓ / 次品档 / 坏✗)→只出货KGD,标binning分级+良率筛选。'},
  // ===== 13 bring-up/量产 =====
  {doc:'13', sec:'3.1', name:'bring-up 全景(芯片回来后)', focus:'量产味:回片后顺序——上电点亮→基础功能(时钟/复位/boot)→跑测试图样→接口外设→真实负载验证→特性化→处理勘误;循序渐进从最基础往上点,先确认活着再跑复杂负载;先确认TPU能上电/时钟起振/被主机PCIe识别再逐步跑阵列真实推理。图:bring-up阶梯递进 上电→时钟复位→boot→接口→真实负载→特性化,标循序渐进从基础往上。诚实:bring-up为通行实践。'},
  {doc:'13', sec:'3.2', name:'首次上电与点亮(power-on / bring-up)', focus:'量产味:第一次上电按power sequencing加电,确认电源/时钟(PLL起振)/复位/boot正常;最紧张时刻,很多问题(电源短路/时钟不起/复位卡死)此刻暴露,复位初始化的债在此还;上电→时钟电源就绪→主机PCIe配置TPU→加载权重→看它活过来。图:上电序列 power-on→PLL起振→复位释放→boot→PCIe识别,标第一次点亮最紧张。'},
  {doc:'13', sec:'3.3', name:'实验室调试(debug)', focus:'量产味:用示波器/逻辑分析仪/JTAG/片上trace+性能计数器定位硅上问题,硅bug常难复现、现象间接;没片上可观测性就抓瞎(调试接口/扫描/性能计数器是bring-up的眼睛,架构期就埋下);用片上性能计数器(阵列利用率/stall)+JTAG/scan定位,调到真实负载跑顺。图:实验室设备(示波器/逻辑分析仪/JTAG)+片上观测(trace/性能计数器)→定位bug,标无可观测=抓瞎。'},
  {doc:'13', sec:'3.4', name:'硅上验证与特性化(silicon validation / characterization)', focus:'量产味:硅验证用真实场景确认功能/性能符合规格;特性化跨PVT(电压/温度/工艺)测真实频率/功耗/裕量(画shmoo图)看硅与签核分析是否吻合;确认700MHz/吞吐/功耗这些纸上数字真实成立,偏差大查模型/工艺;实测TPU真实吞吐/功耗28-40W/跨温区裕量。图:shmoo图(电压×频率网格,pass绿/fail红区)对照规格,标硅vs签核是否吻合。'},
  {doc:'13', sec:'3.5', name:'勘误与 re-spin(errata / metal ECO)', focus:'量产味:bring-up发现bug记入勘误errata,能软件绕过就绕,必须改硬件做metal ECO(只改金属层较便宜)或全层re-spin(贵)出下一版硅;metal-only比全re-spin便宜快很多(设计要留可ECO余地),有些只能软件workaround带病出货;首版bug视严重度选软件规避/metal ECO/re-spin权衡风险成本。图:bug→三分流(软件workaround | metal ECO只改金属层 | 全层re-spin),标成本/时间递增。'},
  {doc:'13', sec:'3.6', name:'软件 / 固件 / 驱动 bring-up', focus:'量产味:让生态在真实硅跑起来——固件/驱动/编译器/框架算子库逐层点亮到能跑应用;"芯片再强软件跑不起来就是废铁"(③§3.15呼应),AI芯片软件栈成熟度常是量产真正瓶颈;在真实TPU跑通TensorFlow→XLA编译→阵列执行的完整软件栈让模型真能部署。图:软件栈逐层bring-up 固件→驱动→编译器XLA→框架TensorFlow→应用,标软件常是量产瓶颈。'},
  {doc:'13', sec:'3.7', name:'量产爬坡与良率提升(ramp / yield learning)', focus:'量产味:良率从初期低水平往上爬(分析失效→改工艺/设计→DFM优化)同时拉产能进大批量制造HVM;良率直接定单位成本和供货量,新设计/新节点初期良率低靠yield learning逐步提升;把TPU良率爬到可经济量产支撑大规模部署进数据中心。图:良率爬坡曲线(时间→良率上升)+yield learning循环(失效分析→改进→再投),标良率定成本与供货。'},
  {doc:'13', sec:'3.8', name:'可靠性认证与持续量产(qualification / HVM)', focus:'量产味:可靠性认证qual(HTOL/温循/湿热/ESD等试验)证明长期可靠,通过后进持续量产HVM+现场监控+迭代下一代;数据中心/车规对可靠性要求极高,qual通过才大规模交付,量产后持续监控失效反馈改进;TPU通过qual→大规模量产→部署数据中心7×24→经验反馈下一代TPU(闭环回①)。图:qual试验(HTOL/温循/ESD)通过→HVM量产→现场监控→反馈下一代(虚线闭环回需求),标长期可靠+代际迭代。'},
];

const SCHEMA_KEYS = '["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]';

function authorPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `${STYLE}

【本次任务】文档 ${d.doc}(${DOCNAME[d.doc]})· 小节 ${d.sec}「${d.name}」。
secNum 必须填 "${d.sec}"。写入文件路径(把模板里的路径替换成这个):${path}

【本小节的 TPU 切入角度(务必据此,保证准确与诚实)】
${d.focus}

请产出该小节完整案例对象,按"写文件"步骤用 python3 + json.dump 写到 ${path}。完成后回一句确认。`;
}

function verifyPrompt(d){
  const path = `${DIR}/${d.doc}-${d.sec}.json`;
  return `你是对抗式校验者。读取案例碎片:${path}(文档 ${d.doc} ${DOCNAME[d.doc]} 小节 ${d.sec}「${d.name}」的 TPU 案例)。
逐项检查,发现问题就**就地修复后用相同方式(python3 + json.dump,svg 用 raw 三单引号串)重写该文件**:
1) JSON 合法,含全部字段 ${SCHEMA_KEYS};secNum=="${d.sec}";source 合理。
2) **事实诚实**:只用 TPU(主 v1),不得出现别的芯片;TPU 硬事实正确(256×256/65536 MAC、700MHz/~92 TOPS、24MiB UB、4MiB累加器、DDR3 ~30GB/s、28nm/≤331mm²/28–40W、PCIe 卡、weight-stationary);制造/封测/量产工艺用"通行实践"措辞,**不得编造 TPU 私有工艺/良率/封装/测试数字,也不得指定具体代工厂**;示意设置标明示意。角度:${d.focus}
3) **SVG 有效**:以 <svg class="cs-svg" viewBox="0 0 720 H" 开头、含 #csar marker;标签全闭合、<g> 与 </g> 数量相等;坐标在 720×H 内、无明显重叠;≤14 个 cs-part;无内联 <style>/<script>。
4) **高亮 key 匹配(关键)**:legend 每个 k、steps 每个 keys 元素,都必须在 svg 文本中作为某个 data-k 或 data-g 的值出现;否则补到 svg 或改 key。
5) before(3-5)/during(4-6)/result(4-6,{label,value})/after(4-5) 齐全、具体、对得上语义,且贴合该工序主题。
用 python 实际校验(json.load + 统计 <g>/</g> + 检查每个 key 是否在 svg 出现)。修完或确认无误后回报:secNum、是否改动、修复了哪些问题。`;
}

phase('Author');
const results = await pipeline(
  DESCS,
  (d) => agent(authorPrompt(d), { label: `author:${d.doc}-${d.sec}`, phase: 'Author', agentType: 'general-purpose' }).then(()=>d),
  (d) => agent(verifyPrompt(d), { label: `verify:${d.doc}-${d.sec}`, phase: 'Verify', agentType: 'general-purpose' }).then(t=>({sec:`${d.doc}-${d.sec}`, name:d.name, report:String(t).slice(0,240)}))
);
const done = results.filter(Boolean);
log(`完成 ${done.length}/${DESCS.length} 个制造/交付小节碎片`);
return { count: done.length, total: DESCS.length, items: done };
