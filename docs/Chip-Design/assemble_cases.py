#!/usr/bin/env python3
"""把中英文案例碎片合并成 cases.js / cases_en.js,并做结构校验。
用法:python3 assemble_cases.py   (--write 才真正写 bundle;默认只校验+报告)
"""
import json, glob, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
FRAG_ZH = os.path.join(BASE, "cases_frag")
FRAG_EN = os.path.join(BASE, "cases_frag_en")
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

def load_fragments(folder, label):
    frags = sorted(glob.glob(os.path.join(folder, "*.json")))
    CASES, report, bad = {}, [], []
    for f in frags:
        name = os.path.basename(f)[:-5]          # 03-3.4
        doc, sec = name.split("-", 1)
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            bad.append(name); report.append(f"✗ {label}/{name}: JSON 解析失败 {e}"); continue
        iss = check(doc, sec, d)
        CASES.setdefault(doc, {})[sec] = d
        if iss:
            bad.append(name); report.append(f"✗ {label}/{name}: " + "; ".join(iss))
        else:
            report.append(f"✓ {label}/{name}: {d.get('title','')[:36]}")
    return frags, CASES, report, bad


def flatten(cases):
    return {f"{doc}-{sec}": case for doc, sections in cases.items() for sec, case in sections.items()}


def svg_shape(svg):
    return re.sub(r'(<text\b[^>]*>).*?(</text>)', r'\1__TEXT__\2', svg, flags=re.S)


def html_tags(text):
    return re.findall(r'</?[A-Za-z][^>]*>', text or "")


def compare_case(name, zh, en):
    issues = []
    if list(zh) != list(en):
        issues.append("顶层字段或顺序变化")
    if zh.get("secNum") != en.get("secNum") or zh.get("chip") != en.get("chip"):
        issues.append("secNum/chip 结构字段变化")
    if svg_shape(zh.get("svg", "")) != svg_shape(en.get("svg", "")):
        issues.append("SVG 除 <text> 文案外的结构发生变化")
    if [x.get("k") for x in zh.get("legend", [])] != [x.get("k") for x in en.get("legend", [])]:
        issues.append("legend key/order 变化")
    if [x.get("keys") for x in zh.get("steps", [])] != [x.get("keys") for x in en.get("steps", [])]:
        issues.append("step keys/order 变化")
    if [list(x) for x in zh.get("legend", [])] != [list(x) for x in en.get("legend", [])]:
        issues.append("legend 字段结构变化")
    if [list(x) for x in zh.get("steps", [])] != [list(x) for x in en.get("steps", [])]:
        issues.append("steps 字段结构变化")
    for field in ("legend", "steps", "before", "during", "result", "after"):
        if len(zh.get(field, [])) != len(en.get(field, [])):
            issues.append(f"{field} 数量变化")
    for field in ("oneLine", "source"):
        if html_tags(zh.get(field, "")) != html_tags(en.get(field, "")):
            issues.append(f"{field} HTML 标签变化")
    for field in ("before", "during", "after"):
        if [html_tags(x) for x in zh.get(field, [])] != [html_tags(x) for x in en.get(field, [])]:
            issues.append(f"{field} HTML 标签变化")
    if [list(x) for x in zh.get("result", [])] != [list(x) for x in en.get("result", [])]:
        issues.append("result 字段结构变化")
    if re.search(r'[一-龥]', json.dumps(en, ensure_ascii=False)):
        issues.append("英文案例仍含中文字符")
    return issues


def write_bundle(filename, global_name, cases, comment):
    out = os.path.join(BASE, filename)
    with open(out, "w", encoding="utf-8") as fp:
        fp.write(comment + "\n")
        fp.write(f"window.{global_name} = " + json.dumps(cases, ensure_ascii=False, indent=1) + ";\n")


def main():
    zh_frags, zh_cases, zh_report, zh_bad = load_fragments(FRAG_ZH, "ZH")
    en_frags, en_cases, en_report, en_bad = load_fragments(FRAG_EN, "EN")
    zh_flat, en_flat = flatten(zh_cases), flatten(en_cases)
    parity_bad = []
    for name in sorted(set(zh_flat) & set(en_flat)):
        issues = compare_case(name, zh_flat[name], en_flat[name])
        if issues:
            parity_bad.append(name)
            en_report.append(f"✗ EN/{name}: " + "; ".join(issues))
    missing_en = sorted(set(zh_flat) - set(en_flat))
    extra_en = sorted(set(en_flat) - set(zh_flat))
    if extra_en:
        parity_bad.extend(extra_en)
        en_report.append("✗ EN 额外案例: " + " ".join(extra_en))

    zh_counts = "  ".join(f"{doc}:{len(secs)}" for doc, secs in sorted(zh_cases.items()))
    en_counts = "  ".join(f"{doc}:{len(secs)}" for doc, secs in sorted(en_cases.items()))
    print(f"中文碎片 {len(zh_frags)} 个 | {zh_counts} | 问题 {len(zh_bad)} 个")
    print(f"英文碎片 {len(en_frags)} 个 | {en_counts or '(none)'} | 校验问题 {len(en_bad)+len(parity_bad)} 个 | 待翻译 {len(missing_en)} 个")
    for r in zh_report + en_report: print("  " + r)

    if "--write" in sys.argv:
        if not zh_bad:
            write_bundle("cases.js", "CASES", zh_cases,
                         "// 自动生成(assemble_cases.py 合并 cases_frag/*.json)。全部以 Google TPU 为唯一示例。")
            print(f"已写出 cases.js({len(zh_flat)} 个案例)")
        else:
            print("中文碎片有问题,未写出 cases.js。")
        if not en_bad and not parity_bad and not missing_en and len(en_flat) == len(zh_flat):
            write_bundle("cases_en.js", "CASES_EN", en_cases,
                         "// Auto-generated by assemble_cases.py from cases_frag_en/*.json. Google TPU is the consistent case study.")
            print(f"已写出 cases_en.js({len(en_flat)} English cases)")
        else:
            print("英文碎片尚未完整或结构校验未通过,未写出 cases_en.js。")
    bad = zh_bad + en_bad + parity_bad
    if bad: print("BAD:", " ".join(sorted(set(bad))))
    if missing_en: print("MISSING_EN:", " ".join(missing_en))
    if bad or ("--write" in sys.argv and missing_en):
        raise SystemExit(1)

if __name__ == "__main__":
    main()
