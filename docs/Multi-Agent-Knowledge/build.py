#!/usr/bin/env python3
"""
生成 content.js：把 multi-agent-single-knowledge 中的 NN-*.md 文档打包给静态页面。

用法：
  cd docs/multi-agent-single-knowledge
  python build.py
"""
import glob
import json
import os
import re


HERE = os.path.dirname(os.path.abspath(__file__))

STAGES = [
    {"num": "①", "prefix": "01", "title": "全景与定义", "phase": "基础", "summary": "先认识单 Agent 和使用多 Agent 的标准，再阅读多智能体系统全景与分层架构，最后建立拓扑直觉。"},
    {"num": "②", "prefix": "02", "title": "角色与团队设计", "phase": "设计", "summary": "用职责、非目标、输出契约、能力和权限组成互补团队。"},
    {"num": "③", "prefix": "03", "title": "任务分解与规划", "phase": "设计", "summary": "把目标拆成带依赖、负责人、验收标准和重规划条件的任务图。"},
    {"num": "④", "prefix": "04", "title": "协作拓扑", "phase": "协作", "summary": "Pipeline、Supervisor、Blackboard、Debate、Market、Graph 与动态拓扑。"},
    {"num": "⑤", "prefix": "05", "title": "通信协议", "phase": "协作", "summary": "消息信封、状态机、幂等、引用、上下文预算与协议测试。"},
    {"num": "⑥", "prefix": "06", "title": "路由与交接", "phase": "协作", "summary": "Triage、handoff、能力路由、交接包与失败升级。"},
    {"num": "⑦", "prefix": "07", "title": "观测、评测与调试", "phase": "工程", "summary": "跨 Agent trace、事件日志、指标、回放、故障分类与回归测试。"},
    {"num": "⑧", "prefix": "08", "title": "安全与生产化", "phase": "工程", "summary": "角色权限、共享工具边界、提示注入、审批、成本、回滚与审计。"},
    {"num": "⑨", "prefix": "09", "title": "案例：软件工厂", "phase": "案例", "summary": "基于 ChatDev 1.0 与 MetaGPT 公开源码/论文的软件公司结构。"},
    {"num": "⑩", "prefix": "10", "title": "案例：研究团队", "phase": "案例", "summary": "基于 AutoGen 官方 Literature Review 示例的研究团队结构。"},
    {"num": "⑪", "prefix": "11", "title": "框架与项目图谱", "phase": "生态", "summary": "AutoGen、ChatDev、MetaGPT、CrewAI、Swarm、CAMEL 与 LangGraph。"},
    {"num": "⑫", "prefix": "12", "title": "学习路线与引用", "phase": "生态", "summary": "围绕多智能体设计、实现与研究组织练习、论文和项目入口。"},
]

SUPPLEMENTS = [
    {
        "slug": "topology-pipeline",
        "file": "topology-pipeline.md",
        "title": "Pipeline 流水线拓扑的现代实现",
        "summary": "类型化产物、阶段门禁、检查点，以及 2024–2026 年工作流生成与运行优化。",
        "back_stage": 3,
        "back_hash": "4-pipeline-分阶段串行协作",
        "back_label": "Pipeline：分阶段串行协作",
    },
    {
        "slug": "topology-supervisor",
        "file": "topology-supervisor.md",
        "title": "Supervisor 主管制拓扑与现代编排器",
        "summary": "任务/进度账本、能力路由、错误恢复，以及 Magentic-One 等可核验实例。",
        "back_stage": 3,
        "back_hash": "5-supervisor-中心化任务调度",
        "back_label": "Supervisor：中心化任务调度",
    },
    {
        "slug": "topology-blackboard",
        "file": "topology-blackboard.md",
        "title": "Blackboard 黑板拓扑与共享工作空间",
        "summary": "经典多 Agent Blackboard、中央与分布式形态，以及 Han & Zhang、Salemi 和 Flock 的现代 LLM 实现。",
        "back_stage": 3,
        "back_hash": "6-blackboard-共享状态协作",
        "back_label": "Blackboard：共享状态协作",
    },
    {
        "slug": "topology-debate",
        "file": "topology-debate.md",
        "title": "Debate 辩论拓扑、置信度与裁判可靠性",
        "summary": "独立候选、多样性、显式置信度、Judge 风险和 2024–2026 年新证据。",
        "back_stage": 3,
        "back_hash": "7-debate-多候选评审与决策",
        "back_label": "Debate：多候选评审与决策",
    },
    {
        "slug": "market-task-auction",
        "file": "market-task-auction.md",
        "title": "多智能体任务拍卖与市场式分配",
        "summary": "从启发式质量—成本评分，深入到能力校准、动态信誉、策略拍卖与激励相容。",
        "back_stage": 3,
        "back_hash": "8-market-基于竞价的任务分配",
        "back_label": "Market：基于竞价的任务分配",
    },
    {
        "slug": "topology-graph",
        "file": "topology-graph.md",
        "title": "Graph 作为通用可执行拓扑",
        "summary": "把其他拓扑视为受限图模板，深入状态 reducer、并行汇合、循环、子图、检查点与节点/边优化。",
        "back_stage": 3,
        "back_hash": "9-graph-通用状态图编排",
        "back_label": "Graph：通用状态图编排",
    },
    {
        "slug": "topology-dynamic",
        "file": "topology-dynamic.md",
        "title": "Dynamic Topology 动态拓扑与自动团队设计",
        "summary": "团队选择、图生成、通信剪枝，以及 2024–2026 年自动拓扑研究。",
        "back_stage": 3,
        "back_hash": "10-动态拓扑-按任务调整团队结构",
        "back_label": "动态拓扑：按任务调整团队结构",
    },
]

PHASE_ORDER = ["基础", "设计", "协作", "工程", "案例", "生态"]
PHASE_ORDER_EN = ["Foundations", "Design", "Collaboration", "Engineering", "Case Studies", "Ecosystem"]

STAGES_EN = [
    {"title": "Overview and Definitions", "phase": "Foundations", "summary": "Start with the criteria for choosing one agent or many, then build a systems-level view of architecture, layers, and topology."},
    {"title": "Roles and Team Design", "phase": "Design", "summary": "Build complementary teams from responsibilities, non-goals, output contracts, capabilities, and permissions."},
    {"title": "Task Decomposition and Planning", "phase": "Design", "summary": "Turn goals into task graphs with dependencies, owners, acceptance criteria, and replanning conditions."},
    {"title": "Collaboration Topologies", "phase": "Collaboration", "summary": "Pipeline, Supervisor, Blackboard, Debate, Market, Graph, and dynamic topologies."},
    {"title": "Communication Protocols", "phase": "Collaboration", "summary": "Message envelopes, state machines, idempotency, references, context budgets, and protocol testing."},
    {"title": "Routing and Handoffs", "phase": "Collaboration", "summary": "Triage, handoffs, capability routing, handoff packages, and failure escalation."},
    {"title": "Observability, Evaluation, and Debugging", "phase": "Engineering", "summary": "Cross-agent traces, event logs, metrics, replay, failure classification, and regression testing."},
    {"title": "Safety and Production Readiness", "phase": "Engineering", "summary": "Role permissions, shared-tool boundaries, prompt injection, approvals, cost, rollback, and auditing."},
    {"title": "Case Study: Software Factory", "phase": "Case Studies", "summary": "Software-company structures grounded in the public source code and papers for ChatDev 1.0 and MetaGPT."},
    {"title": "Case Study: Research Team", "phase": "Case Studies", "summary": "A research-team structure grounded in AutoGen's official Literature Review example."},
    {"title": "Framework and Project Map", "phase": "Ecosystem", "summary": "AutoGen, ChatDev, MetaGPT, CrewAI, Swarm, CAMEL, and LangGraph."},
    {"title": "Learning Paths and References", "phase": "Ecosystem", "summary": "Exercises, papers, and project entry points for multi-agent design, implementation, and research."},
]

SUPPLEMENTS_EN = {
    "topology-pipeline": {
        "title": "Modern Pipeline Topology Implementations",
        "summary": "Typed artifacts, stage gates, checkpoints, and workflow generation and runtime optimization from 2024–2026.",
        "back_hash": "4-pipeline-phased-serial-collaboration",
        "back_label": "Pipeline: phased serial collaboration",
    },
    "topology-supervisor": {
        "title": "Supervisor Topologies and Modern Orchestrators",
        "summary": "Task and progress ledgers, capability routing, error recovery, and verifiable systems such as Magentic-One.",
        "back_hash": "5-supervisor-centralized-task-scheduling",
        "back_label": "Supervisor: centralized task scheduling",
    },
    "topology-blackboard": {
        "title": "Blackboard Topologies and Shared Workspaces",
        "summary": "Classic multi-agent blackboards, centralized and distributed forms, and modern LLM implementations by Han & Zhang, Salemi, and Flock.",
        "back_hash": "6-blackboard-shared-status-collaboration",
        "back_label": "Blackboard: shared-state collaboration",
    },
    "topology-debate": {
        "title": "Debate Topologies, Confidence, and Judge Reliability",
        "summary": "Independent candidates, diversity, explicit confidence, judge risks, and new evidence from 2024–2026.",
        "back_hash": "7-debate-multiple-candidate-review-and-decision-making",
        "back_label": "Debate: multi-candidate review and decisions",
    },
    "market-task-auction": {
        "title": "Multi-Agent Task Auctions and Market-Based Allocation",
        "summary": "From heuristic quality-cost scoring to capability calibration, dynamic reputation, strategic auctions, and incentive compatibility.",
        "back_hash": "8-market-task-allocation-based-on-bidding",
        "back_label": "Market: bid-based task allocation",
    },
    "topology-graph": {
        "title": "Graph as a General Executable Topology",
        "summary": "Treat other topologies as constrained graph templates, then explore state reducers, parallel joins, loops, subgraphs, checkpoints, and node/edge optimization.",
        "back_hash": "9-graph-universal-state-chart-arrangement",
        "back_label": "Graph: general state-graph orchestration",
    },
    "topology-dynamic": {
        "title": "Dynamic Topologies and Automated Team Design",
        "summary": "Team selection, graph generation, communication pruning, and automated topology research from 2024–2026.",
        "back_hash": "10-dynamic-topology-adjust-team-structure-according-to-tasks",
        "back_label": "Dynamic topology: adapt team structure to the task",
    },
}
FENCE = "\x60" * 3

# 发布正文只描述当前内容，不向读者暴露文档的修改历史。
# 这里使用有明确编辑语义的短语，避免误伤“旧版本消息”“旧快照”等领域概念。
EDITORIAL_RESIDUE = (
    "原图",
    "旧图",
    "上一版",
    "此前版本",
    "原章节",
    "从原“",
    "吸收了原",
    "本章删除",
    "已替换的",
    "本章替换了",
    "修复后的顺序",
    "之前自造",
    "本章移除了",
)


def find_md(prefix):
    hits = [
        path
        for path in sorted(glob.glob(os.path.join(HERE, f"{prefix}-*.md")))
        if not path.endswith("_en.md")
    ]
    return hits[0] if hits else None


def english_filename(filename):
    stem, extension = os.path.splitext(filename)
    return f"{stem}_en{extension}"


def validate_english_source(raw, filename):
    """Keep English sources structurally paired and free of Chinese UI copy."""
    if re.search(r"[\u3400-\u9fff\uf900-\ufaff]", raw):
        raise ValueError(f"{filename} still contains Chinese text")
    for marker in ('<div class="learning-path">', '<div class="chapter-check">'):
        if raw.count(marker) != 1:
            raise ValueError(f"{filename} must contain exactly one {marker}")
    if raw.count(FENCE) % 2:
        raise ValueError(f"{filename} contains an unclosed fenced block")
    for asset in re.findall(r"!\[[^\]]*\]\((assets/[^)]+\.svg)\)", raw):
        if not asset.endswith("_en.svg"):
            raise ValueError(f"{filename} references a non-English SVG: {asset}")
        if not os.path.exists(os.path.join(HERE, asset)):
            raise FileNotFoundError(f"{filename} references a missing SVG: {asset}")


def validate_explanations(raw, filename):
    """确保每个围栏块后都有与其内容相邻的中文说明。"""
    lines = raw.splitlines()
    in_fence = False
    language = ""

    for index, line in enumerate(lines):
        if not in_fence and line.startswith(FENCE):
            in_fence = True
            language = line[len(FENCE) :].strip()
            continue

        if in_fence and line == FENCE:
            in_fence = False
            nearby = "\n".join(lines[index + 1 : index + 8])
            if language == "mermaid":
                required = "读图时重点看："
                kind = "Mermaid 图"
            else:
                required = '<div class="code-explanation">'
                kind = f"{language or '未标注语言'} 代码块"

            if required not in nearby:
                raise ValueError(
                    f"{filename}:{index + 1} 的 {kind} 缺少紧邻的中文解释"
                )

    if in_fence:
        raise ValueError(f"{filename} 存在未闭合的代码块")


def validate_teaching_structure(raw, filename):
    """防止正文重新退化成“资料在前、教学附在章末”的结构。"""
    required_counts = {
        '<div class="learning-path">': 1,
        '<div class="chapter-check">': 1,
    }
    for marker, expected in required_counts.items():
        actual = raw.count(marker)
        if actual != expected:
            raise ValueError(f"{filename} 的教学结构标记 {marker} 数量为 {actual}，应为 {expected}")

    if "教学展开" in raw or "教学拆解" in raw:
        raise ValueError(f"{filename} 仍包含孤立的“教学展开/教学拆解”章节")

    primer_match = re.search(
        r"^## (?:1\. .*核心术语|学习准备：先认清(?:本章|本页)术语)",
        raw,
        flags=re.MULTILINE,
    )
    primer = primer_match.start() if primer_match else -1
    first_content_heading = re.search(r"^## (?!学习准备)", raw, flags=re.MULTILINE)
    if primer < 0 or (first_content_heading and primer > first_content_heading.start()):
        raise ValueError(f"{filename} 的术语准备没有放在正文概念之前")


def validate_chapter_headings(raw, filename):
    """保证章内标题从 1 开始，并按二级、三级、四级层次连续编号。"""
    expected_h2 = 1
    current_h2 = 0
    expected_h3 = 1
    current_h3 = 0
    expected_h4 = 1
    in_fence = False

    for line_number, line in enumerate(raw.splitlines(), start=1):
        if line.lstrip().startswith(FENCE):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        h2 = re.match(r"^## (?!#)(\d+)\.\s+\S", line)
        h3 = re.match(r"^### (?!#)(\d+)\.(\d+)\s+\S", line)
        h4 = re.match(r"^#### (?!#)(\d+)\.(\d+)\.(\d+)\s+\S", line)

        if line.startswith("## ") and not h2:
            raise ValueError(f"{filename}:{line_number} 存在未编号的二级标题：{line}")
        if h2:
            number = int(h2.group(1))
            if number != expected_h2:
                raise ValueError(
                    f"{filename}:{line_number} 的二级标题编号为 {number}，应为 {expected_h2}"
                )
            current_h2 = number
            expected_h2 += 1
            expected_h3 = 1
            current_h3 = 0
            expected_h4 = 1
            continue

        if line.startswith("### ") and not h3:
            raise ValueError(f"{filename}:{line_number} 存在未编号的三级标题：{line}")
        if h3:
            parent, number = map(int, h3.groups())
            if parent != current_h2 or number != expected_h3:
                raise ValueError(
                    f"{filename}:{line_number} 的三级标题编号为 {parent}.{number}，"
                    f"应为 {current_h2}.{expected_h3}"
                )
            current_h3 = number
            expected_h3 += 1
            expected_h4 = 1
            continue

        if line.startswith("#### ") and not h4:
            raise ValueError(f"{filename}:{line_number} 存在未编号的四级标题：{line}")
        if h4:
            h2_number, h3_number, number = map(int, h4.groups())
            if (
                h2_number != current_h2
                or h3_number != current_h3
                or number != expected_h4
            ):
                raise ValueError(
                    f"{filename}:{line_number} 的四级标题编号为 "
                    f"{h2_number}.{h3_number}.{number}，"
                    f"应为 {current_h2}.{current_h3}.{expected_h4}"
                )
            expected_h4 += 1

    if expected_h2 == 1:
        raise ValueError(f"{filename} 没有二级标题")


def validate_chapter_flow(raw, filename):
    """保证开篇路线能映射到正文，并拒绝只有代码与代码说明的小节。"""
    steps = re.findall(
        r'<div class="learning-path-step"><span>(\d+)</span><div>(.*?)</div></div>',
        raw,
    )
    if [number for number, _ in steps] != ["1", "2", "3"]:
        raise ValueError(f"{filename} 的“本章怎么学”必须包含连续的 1、2、3 三步")
    for number, content in steps:
        if not re.search(r"第 \d+(?:～\d+)? 节", content):
            raise ValueError(
                f"{filename} 的学习路径第 {number} 步没有明确对应的正文小节"
            )

    lines = raw.splitlines()
    headings = []
    in_fence = False
    for index, line in enumerate(lines):
        if line.lstrip().startswith(FENCE):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        heading = re.match(r"^(#{2,4})\s+(.+)$", line)
        if heading:
            headings.append(
                {
                    "index": index,
                    "line": index + 1,
                    "level": len(heading.group(1)),
                    "title": heading.group(2),
                }
            )

    for position, heading in enumerate(headings):
        end = len(lines)
        for candidate in headings[position + 1 :]:
            if candidate["level"] <= heading["level"]:
                end = candidate["index"]
                break

        has_code = False
        has_prose = False
        in_fence = False
        for line in lines[heading["index"] + 1 : end]:
            if line.lstrip().startswith(FENCE):
                if not in_fence:
                    has_code = True
                in_fence = not in_fence
                continue
            if in_fence:
                continue

            stripped = line.strip()
            if (
                stripped
                and not stripped.startswith(("#", "<", "|", "-", "*"))
                and stripped != "---"
                and not re.match(r"^\d+\.\s", stripped)
            ):
                has_prose = True

        if has_code and not has_prose:
            raise ValueError(
                f"{filename}:{heading['line']} 的“{heading['title']}”"
                "只有代码模块和代码说明，缺少独立正文"
            )


def validate_published_copy(raw, filename):
    """拒绝把编辑过程和已经不存在的页面元素写进发布正文。"""
    for marker in EDITORIAL_RESIDUE:
        if marker in raw:
            raise ValueError(f"{filename} 包含面向编辑过程的残留表述：{marker}")


def main():
    docs = []
    for stage in STAGES:
        path = find_md(stage["prefix"])
        entry = dict(stage)
        if path:
            with open(path, encoding="utf-8") as f:
                entry["raw"] = f.read()
            validate_explanations(entry["raw"], os.path.basename(path))
            validate_teaching_structure(entry["raw"], os.path.basename(path))
            validate_chapter_headings(entry["raw"], os.path.basename(path))
            validate_chapter_flow(entry["raw"], os.path.basename(path))
            validate_published_copy(entry["raw"], os.path.basename(path))
            entry["available"] = True
            entry["file"] = os.path.basename(path)
        else:
            entry["raw"] = ""
            entry["available"] = False
            entry["file"] = None
        docs.append(entry)

    supplements = []
    for supplement in SUPPLEMENTS:
        path = os.path.join(HERE, supplement["file"])
        if not os.path.exists(path):
            raise FileNotFoundError(f"缺少专题页：{supplement['file']}")
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        validate_explanations(raw, supplement["file"])
        validate_teaching_structure(raw, supplement["file"])
        validate_published_copy(raw, supplement["file"])
        entry = dict(supplement)
        entry["raw"] = raw
        supplements.append(entry)

    site = {
        "title": "Multi-Agent Knowledge 多智能体系统教学手册",
        "subtitle": "只讲多智能体：从团队设计与协作机制，到评测、安全、案例和框架生态",
        "phaseOrder": PHASE_ORDER,
        "stages": docs,
        "supplements": supplements,
    }

    docs_en = []
    for source, metadata in zip(docs, STAGES_EN):
        if not source["file"]:
            raise FileNotFoundError(f"cannot pair missing Chinese chapter {source['prefix']}")
        filename = english_filename(source["file"])
        path = os.path.join(HERE, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"missing English chapter: {filename}")
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        validate_english_source(raw, filename)
        validate_chapter_headings(raw, filename)
        entry = {
            **source,
            **metadata,
            "raw": raw,
            "file": filename,
            "available": True,
        }
        docs_en.append(entry)

    supplements_en = []
    for source in supplements:
        filename = english_filename(source["file"])
        path = os.path.join(HERE, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"missing English supplement: {filename}")
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        validate_english_source(raw, filename)
        metadata = SUPPLEMENTS_EN[source["slug"]]
        supplements_en.append({**source, **metadata, "file": filename, "raw": raw})

    site_en = {
        "title": "Multi-Agent Knowledge: A Systems Handbook",
        "subtitle": "A focused guide to team design, collaboration mechanisms, evaluation, safety, case studies, and the framework ecosystem",
        "phaseOrder": PHASE_ORDER_EN,
        "stages": docs_en,
        "supplements": supplements_en,
    }
    with open(os.path.join(HERE, "content.js"), "w", encoding="utf-8") as f:
        f.write("// 自动生成，请勿手改。修改 Markdown 后运行 python build.py。\n")
        f.write("window.SITE_ZH = ")
        f.write(json.dumps(site, ensure_ascii=False))
        f.write(";\nwindow.SITE = window.SITE_ZH;\n")

    with open(os.path.join(HERE, "content_en.js"), "w", encoding="utf-8") as f:
        f.write("// Generated file. Edit the paired _en Markdown sources, then run python build.py.\n")
        f.write("window.SITE_EN = ")
        f.write(json.dumps(site_en, ensure_ascii=False))
        f.write(";\n")

    print(
        f"已生成 content.js：{sum(d['available'] for d in docs)}/{len(docs)} 篇文档，"
        f"{len(supplements)} 个专题页；content_en.js：{len(docs_en)} 篇文档，"
        f"{len(supplements_en)} 个专题页"
    )


if __name__ == "__main__":
    main()
