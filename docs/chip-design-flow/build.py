#!/usr/bin/env python3
"""
生成 content.js —— 把文件夹里的 NN-*.md 原文 + 13 步阶段元数据打包给网页。
用法:在 chip-design-flow/ 目录下运行  python3 build.py
新增 04~13 的文档后,重跑一次即可,网页自动更新。
"""
import json
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# 13 步全流程。phase 用于首页分组与配色。summary 是首页卡片上的一句话。
# prefix 对应文件名前缀(如 "03" 匹配 03-*.md)。
STAGES = [
    {"num": "①", "prefix": "01", "title": "产品/市场需求", "phase": "定义",
     "summary": "烧钱前定清「做哪颗、为谁、要多强、卖多少、何时上市、能否赚钱」,产出 Target Spec + Go/No-Go。"},
    {"num": "②", "prefix": "02", "title": "系统规格", "phase": "定义",
     "summary": "把商业目标翻成完整、无歧义、可验证的技术契约(说 WHAT 不说 HOW),是单一事实来源。"},
    {"num": "③", "prefix": "03", "title": "架构设计", "phase": "设计",
     "summary": "用建模 + DSE 把规格翻成「由哪些块组成、怎么连、能否在 PPA/成本内达标」的硬件骨架。"},
    {"num": "④", "prefix": "04", "title": "微架构设计", "phase": "设计",
     "summary": "定每个块内部怎么实现(流水线级数、cache 结构、状态机、缓冲深度),架构到 RTL 的桥。"},
    {"num": "⑤", "prefix": "05", "title": "RTL 设计", "phase": "设计",
     "summary": "用 Verilog/VHDL 把微架构写成可综合的寄存器传输级代码。"},
    {"num": "⑥", "prefix": "06", "title": "功能验证", "phase": "验证与综合",
     "summary": "证明 RTL 行为符合规格(仿真/UVM/形式验证/覆盖率),通常是全流程最大的工作量。"},
    {"num": "⑦", "prefix": "07", "title": "逻辑综合", "phase": "验证与综合",
     "summary": "把 RTL 映射成标准单元门级网表,并做时序/面积/功耗优化。"},
    {"num": "⑧", "prefix": "08", "title": "物理设计", "phase": "物理与签核",
     "summary": "布局规划 → 布局 → 时钟树 → 布线,把网表变成有坐标的真实版图。"},
    {"num": "⑨", "prefix": "09", "title": "签核", "phase": "物理与签核",
     "summary": "STA / 功耗 / EM-IR / 物理验证(DRC/LVS)/ 等价性检查,确认可以送厂。"},
    {"num": "⑩", "prefix": "10", "title": "流片", "phase": "制造与交付",
     "summary": "生成 GDSII 掩模数据,交给晶圆厂(tape-out)。"},
    {"num": "⑪", "prefix": "11", "title": "制造", "phase": "制造与交付",
     "summary": "晶圆厂(Fab)在硅片上把芯片真正做出来。"},
    {"num": "⑫", "prefix": "12", "title": "封装测试", "phase": "制造与交付",
     "summary": "切割、封装、晶圆/成品测试、良率筛选。"},
    {"num": "⑬", "prefix": "13", "title": "bring-up/量产", "phase": "制造与交付",
     "summary": "芯片回片后点亮调试、验证、爬坡量产。"},
]

PHASE_ORDER = ["定义", "设计", "验证与综合", "物理与签核", "制造与交付"]


def find_md(prefix):
    hits = sorted(glob.glob(os.path.join(HERE, f"{prefix}-*.md")))
    return hits[0] if hits else None


def main():
    docs = []
    for s in STAGES:
        path = find_md(s["prefix"])
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
        docs.append(entry)

    site = {"phaseOrder": PHASE_ORDER, "stages": docs}
    payload = json.dumps(site, ensure_ascii=False)
    out = os.path.join(HERE, "content.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 自动生成,请勿手改。改文档后运行  python3 build.py  重新生成。\n")
        f.write("window.SITE = " + payload + ";\n")

    n_avail = sum(1 for d in docs if d["available"])
    print(f"已生成 content.js:{n_avail}/{len(docs)} 步有文档。")
    for d in docs:
        flag = "✓" if d["available"] else "·"
        print(f"  {flag} {d['num']} {d['title']:<12} {d['file'] or '(未写)'}")


if __name__ == "__main__":
    main()
