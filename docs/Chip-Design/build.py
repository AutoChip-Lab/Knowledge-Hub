#!/usr/bin/env python3
"""
生成 content.js —— 把文件夹里的阶段 Markdown 原文 + 全流程阶段元数据打包给网页。
用法:在 chip-design-flow/ 目录下运行  python3 build.py
新增或修改阶段文档后,重跑一次即可,网页自动更新。
"""
import json
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

# 十三个编号主阶段。phaseKey 用于稳定分组与配色，phase 保留中文展示标签；summary 是首页卡片上的一句话。
# prefix 对应文件名前缀(如 "03" 匹配 03-*.md)。
STAGES = [
    {"num": "①", "prefix": "01", "title": "产品/市场需求", "titleEn": "Product / Market Requirements", "phase": "定义", "phaseKey": "definition",
     "summary": "烧钱前定清「做哪颗、为谁、要多强、卖多少、何时上市、能否赚钱」,产出 Target Spec + Go/No-Go。",
     "summaryEn": "Before committing major NRE, define the product, target users, performance targets, pricing and volume, launch window, and business viability; deliver the Target Specification and a Go/No-Go decision."},
    {"num": "②", "prefix": "02", "title": "系统规格", "titleEn": "System Specification", "phase": "定义", "phaseKey": "definition",
     "summary": "把商业目标翻成完整、无歧义、可验证的技术契约(说 WHAT 不说 HOW),是单一事实来源。",
     "summaryEn": "Translate business goals into a complete, unambiguous, and verifiable technical contract that defines what the system must do—not how it is implemented—and serves as the single source of truth."},
    {"num": "③", "prefix": "03", "title": "架构设计", "titleEn": "Architecture Design", "phase": "设计", "phaseKey": "design",
     "summary": "用建模 + DSE 把规格翻成「由哪些块组成、怎么连、能否在 PPA/成本内达标」的硬件骨架。",
     "summaryEn": "Use modeling and design-space exploration (DSE) to turn the specification into a hardware architecture—blocks, interconnects, and dataflow—and show that PPA and cost targets are achievable."},
    {"num": "④", "prefix": "04", "title": "微架构设计", "titleEn": "Microarchitecture Design", "phase": "设计", "phaseKey": "design",
     "summary": "定每个块内部怎么实现(流水线级数、cache 结构、状态机、缓冲深度),架构到 RTL 的桥。",
     "summaryEn": "Define how each block is implemented—pipeline depth, cache organization, state machines, and buffer sizing—forming the bridge from architecture to RTL."},
    {"num": "⑤", "prefix": "05", "title": "RTL 设计", "titleEn": "RTL Design", "phase": "设计", "phaseKey": "design",
     "summary": "用 Verilog/VHDL 把微架构写成可综合的寄存器传输级代码。",
     "summaryEn": "Implement the microarchitecture as synthesizable register-transfer-level code in SystemVerilog, Verilog, or VHDL."},
    {"num": "⑥", "prefix": "06", "title": "功能验证", "titleEn": "Functional Verification", "phase": "验证与综合", "phaseKey": "verification_synthesis",
     "summary": "证明 RTL 行为符合规格(仿真/UVM/形式验证/覆盖率),通常是全流程最大的工作量。",
     "summaryEn": "Verify that the RTL conforms to the specification through simulation and UVM, formal verification, and coverage closure; this is often the largest part of the engineering effort."},
    {"num": "⑦", "prefix": "07", "title": "逻辑综合", "titleEn": "Logic Synthesis", "phase": "验证与综合", "phaseKey": "verification_synthesis",
     "summary": "把 RTL 映射成标准单元门级网表,并做时序/面积/功耗优化。",
     "summaryEn": "Map RTL to a standard-cell gate-level netlist while optimizing timing, area, and power."},
    {"num": "⑧", "prefix": "08", "title": "物理设计", "titleEn": "Physical Design", "phase": "物理与签核", "phaseKey": "physical_signoff",
     "summary": "布局规划 → 布局 → 时钟树 → 布线,把网表变成有坐标的真实版图。",
     "summaryEn": "Perform floorplanning, placement, clock-tree synthesis, and routing to transform the netlist into a physically implemented layout."},
    {"num": "⑨", "prefix": "09", "title": "签核", "titleEn": "Signoff", "phase": "物理与签核", "phaseKey": "physical_signoff",
     "summary": "STA / 功耗 / EM-IR / 物理验证(DRC/LVS)/ 等价性检查,确认可以送厂。",
     "summaryEn": "Close static timing, power, EM/IR, physical verification (DRC/LVS), and equivalence checks to establish tapeout readiness."},
    {"num": "⑩", "prefix": "10", "title": "流片", "titleEn": "Tapeout", "phase": "制造与交付", "phaseKey": "manufacturing_delivery",
     "summary": "生成 GDSII 掩模数据,交给晶圆厂(tape-out)。",
     "summaryEn": "Release the final GDSII/OASIS layout database to the foundry for mask generation and wafer fabrication."},
    {"num": "⑪", "prefix": "11", "title": "制造", "titleEn": "Wafer Fabrication", "phase": "制造与交付", "phaseKey": "manufacturing_delivery",
     "summary": "晶圆厂(Fab)在硅片上把芯片真正做出来。",
     "summaryEn": "Fabricate the integrated circuits on silicon wafers using the qualified process flow."},
    {"num": "⑫", "prefix": "12", "title": "封装测试", "titleEn": "Packaging & Test", "phase": "制造与交付", "phaseKey": "manufacturing_delivery",
     "summary": "切割、封装、晶圆/成品测试、良率筛选。",
     "summaryEn": "Perform wafer sort, dicing and packaging, final test, and quality and yield screening."},
    {"num": "⑬", "prefix": "13", "title": "bring-up/量产", "titleEn": "Silicon Bring-up / Volume Production", "phase": "制造与交付", "phaseKey": "manufacturing_delivery",
     "summary": "芯片回片后点亮调试、验证、爬坡量产。",
     "summaryEn": "Power up, debug, and characterize first silicon, then qualify the product and ramp to volume production."},
]

# DFT设计涉及多个主流程环节,不计入十三个编号主阶段,但保留独立阅读入口。
TOPICS = [
    {"num": "DFT", "prefix": "dft", "title": "DFT设计", "titleEn": "Design for Test (DFT)", "phase": "DFT设计", "phaseKey": "dft",
     "spanStart": "03", "spanEnd": "13", "focusStart": "07", "focusEnd": "09",
     "focusLabel": "主要实现与覆盖率收敛窗口", "focusLabelEn": "Primary implementation and coverage-closure window",
     "members": ["惠晨宇", "陈岩松", "待定", "公司工程师"],
     "touchpoints": [
         {"prefix": "03", "label": "架构", "labelEn": "Architecture", "role": "测试策略 / 覆盖目标", "roleEn": "Test strategy / coverage targets", "kind": "plan"},
         {"prefix": "04", "label": "微架构", "labelEn": "Microarchitecture", "role": "测试访问 / 控制接口", "roleEn": "Test-access architecture / control interfaces", "kind": "plan"},
         {"prefix": "05", "label": "RTL", "labelEn": "RTL", "role": "测试模式 / 时钟复位可控", "roleEn": "Test-mode controls / clock and reset controllability", "kind": "plan"},
         {"prefix": "06", "label": "功能验证", "labelEn": "Verification", "role": "测试模式 / DFT 控制验证", "roleEn": "Verify test modes / DFT control logic", "kind": "collab"},
         {"prefix": "07", "label": "逻辑综合", "labelEn": "Synthesis", "role": "Scan / 压缩 / MBIST 插入", "roleEn": "Scan / compression / MBIST insertion", "kind": "focus"},
         {"prefix": "08", "label": "物理设计", "labelEn": "Physical Design", "role": "Scan 链重排 / 测试时序功耗", "roleEn": "Scan-chain reorder / test-mode timing and power closure", "kind": "focus"},
         {"prefix": "09", "label": "签核", "labelEn": "Signoff", "role": "DFT DRC / ATPG 覆盖签核", "roleEn": "DFT DRC / ATPG coverage signoff", "kind": "focus"},
         {"prefix": "12", "label": "封装测试", "labelEn": "Packaging & Test", "role": "ATPG 图样 / ATE 测试", "roleEn": "ATPG patterns / ATE execution", "kind": "silicon"},
         {"prefix": "13", "label": "量产", "labelEn": "Volume Production", "role": "失效诊断 / 良率优化", "roleEn": "Failure diagnosis / yield learning", "kind": "silicon"},
     ],
     "summary": "在架构期定义测试目标和访问方案,在 RTL 与综合网表中实现并插入 Scan、压缩、MBIST 等结构,再与物理设计、签核、ATE 和量产诊断持续收敛,让芯片可测试、可诊断、可量产。",
     "summaryEn": "Define test-quality targets and the test-access architecture early, implement test controls in RTL, insert scan, compression, and MBIST structures in the synthesized design, and jointly close physical implementation, signoff, ATE deployment, and production diagnostics so the chip is testable, diagnosable, and ready for volume production."},
]

PHASE_ORDER = ["definition", "design", "verification_synthesis", "physical_signoff", "manufacturing_delivery"]


def find_md(prefix):
    hits = sorted(glob.glob(os.path.join(HERE, f"{prefix}-*.md")))
    return hits[0] if hits else None


def find_md_en(prefix):
    hits = sorted(glob.glob(os.path.join(HERE, "en", f"{prefix}-*.md")))
    return hits[0] if hits else None


def load_entries(items):
    docs = []
    for s in items:
        path = find_md(s["prefix"])
        en_path = find_md_en(s["prefix"])
        entry = dict(s)
        if path:
            with open(path, encoding="utf-8") as f:
                entry["raw"] = f.read()
            entry["available"] = True
            entry["file"] = os.path.basename(path)
        else:
            entry["raw"] = ""
            entry["available"] = False
            entry["file"] = None
        if en_path:
            with open(en_path, encoding="utf-8") as f:
                entry["rawEn"] = f.read()
            entry["availableEn"] = True
            entry["fileEn"] = os.path.relpath(en_path, HERE)
        else:
            entry["rawEn"] = ""
            entry["availableEn"] = False
            entry["fileEn"] = None
        docs.append(entry)
    return docs


def heading_shape(raw):
    """Return the H2/H3 level and optional numeric section id for parity checks."""
    shape = []
    for line in raw.splitlines():
        match = re.match(r"^(#{2,3})\s+(?:(\d+(?:\.\d+)*)\.?\s)?", line)
        if match:
            shape.append((len(match.group(1)), match.group(2) or ""))
    return shape


def validate_bilingual(entries):
    for entry in entries:
        for key in ("titleEn", "summaryEn", "phaseKey"):
            if not entry.get(key):
                raise ValueError(f"{entry['prefix']}: missing bilingual metadata field {key}")
        if entry["availableEn"] and heading_shape(entry["raw"]) != heading_shape(entry["rawEn"]):
            raise ValueError(f"{entry['prefix']}: Chinese/English H2-H3 structure mismatch")
        for point in entry.get("touchpoints", []):
            if not point.get("labelEn") or not point.get("roleEn"):
                raise ValueError(f"{entry['prefix']}: incomplete English DFT touchpoint metadata")


def main():
    docs = load_entries(STAGES)
    topics = load_entries(TOPICS)
    validate_bilingual(docs + topics)

    site = {"phaseOrder": PHASE_ORDER, "stages": docs, "topics": topics}
    payload = json.dumps(site, ensure_ascii=False)
    out = os.path.join(HERE, "content.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 自动生成,请勿手改。改文档后运行  python3 build.py  重新生成。\n")
        f.write("window.SITE = " + payload + ";\n")

    n_avail = sum(1 for d in docs if d["available"])
    n_topics = sum(1 for d in topics if d["available"])
    n_avail_en = sum(1 for d in docs if d["availableEn"])
    n_topics_en = sum(1 for d in topics if d["availableEn"])
    print(f"已生成 content.js：中文 {n_avail}/{len(docs)} 个编号主阶段 + {n_topics}/{len(topics)} 个 DFT 专题；"
          f"英文 {n_avail_en}/{len(docs)} 个编号主阶段 + {n_topics_en}/{len(topics)} 个 DFT 专题。")
    for d in docs:
        flag = "✓" if d["available"] else "·"
        flag_en = "EN" if d["availableEn"] else "--"
        print(f"  {flag} {flag_en} {d['num']} {d['title']:<12} {d['file'] or '(未写)'}")
    for d in topics:
        flag = "✓" if d["available"] else "·"
        flag_en = "EN" if d["availableEn"] else "--"
        print(f"  {flag} {flag_en} ↔ {d['num']} {d['title']:<8} {d['file'] or '(未写)'}")


if __name__ == "__main__":
    main()
