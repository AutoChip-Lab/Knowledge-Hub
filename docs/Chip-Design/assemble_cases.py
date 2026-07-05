#!/usr/bin/env python3
"""把 cases_frag/*.json 合并成 cases.js,并做校验。
用法:python3 assemble_cases.py   (--write 才真正写 cases.js;默认只校验+报告)
"""
import json, glob, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FRAG = os.path.join(BASE, "cases_frag")
REQ = ["secNum","chip","title","oneLine","svg","legend","steps","before","during","result","after","source"]

def check(doc, sec, d):
    issues = []
    for k in REQ:
        if k not in d: issues.append(f"缺字段 {k}")
    if d.get("secNum") != sec: issues.append(f"secNum={d.get('secNum')} != {sec}")
    svg = d.get("svg","")
    if "cs-svg" not in svg or "viewBox" not in svg: issues.append("svg 缺 cs-svg/viewBox")
    if svg.count("<g")  != svg.count("</g>"): issues.append(f"<g>/<​/g> 不平衡 {svg.count('<g')}/{svg.count('</g>')}")
    if "id=\"csar\"" not in svg: issues.append("svg 缺 csar marker")
    # 收集 svg 中所有 data-k / data-g 值
    keys = set(re.findall(r'data-[kg]="([^"]+)"', svg))
    for it in d.get("legend",[]):
        if it.get("k") not in keys: issues.append(f"legend key 不在svg: {it.get('k')}")
    for st in d.get("steps",[]):
        for kk in st.get("keys",[]):
            if kk not in keys: issues.append(f"step key 不在svg: {kk}")
    for seg,lo in [("before",3),("during",4),("result",4),("after",4),("legend",3),("steps",3)]:
        if len(d.get(seg,[])) < lo: issues.append(f"{seg} 数量不足({len(d.get(seg,[]))}<{lo})")
    return issues

def main():
    frags = sorted(glob.glob(os.path.join(FRAG, "*.json")))
    CASES, report, bad = {}, [], []
    for f in frags:
        name = os.path.basename(f)[:-5]          # 03-3.4
        doc, sec = name.split("-", 1)
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            bad.append(name); report.append(f"✗ {name}: JSON 解析失败 {e}"); continue
        iss = check(doc, sec, d)
        CASES.setdefault(doc, {})[sec] = d
        if iss:
            bad.append(name); report.append(f"✗ {name}: " + "; ".join(iss))
        else:
            report.append(f"✓ {name}: {d.get('title','')[:36]}")

    n03 = len(CASES.get("03", {})); n04 = len(CASES.get("04", {}))
    print(f"碎片 {len(frags)} 个 | 03:{n03}/15  04:{n04}/13 | 问题 {len(bad)} 个")
    for r in report: print("  " + r)

    if "--write" in sys.argv and not bad:
        out = os.path.join(BASE, "cases.js")
        with open(out, "w", encoding="utf-8") as fp:
            fp.write("// 自动生成(assemble_cases.py 合并 cases_frag/*.json)。全部以 Google TPU 为唯一示例。\n")
            fp.write("window.CASES = " + json.dumps(CASES, ensure_ascii=False, indent=1) + ";\n")
        print(f"已写出 cases.js({n03+n04} 个案例)")
    elif "--write" in sys.argv:
        print("有问题,未写出 cases.js;先修复上面 ✗ 的碎片。")
    if bad: print("BAD:", " ".join(bad))

if __name__ == "__main__":
    main()
