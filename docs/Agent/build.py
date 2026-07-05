#!/usr/bin/env python3
"""
生成 content.js —— 把文件夹里的 NN-*.md 原文 + 31 章课程元数据打包给网页。
用法:在 agent-flow/ 目录下运行  python3 build.py
新增/修改章节文档后,重跑一次即可,网页自动更新。
"""
import json
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# 31 章「Agent 与 Agent Harness」教学课程。
# phase 用于首页分组与配色;summary 是首页卡片上的一句话;prefix 匹配文件名前缀(如 "03" 匹配 03-*.md)。
STAGES = [
    # ── 板块一 · 认识 Agent ────────────────────────────────────────────────
    {"num": "①", "prefix": "01", "title": "什么是 Agent", "phase": "认识 Agent",
     "summary": "从一个只会聊天的模型,到能自己动手把事做完的智能体——先讲清 agent 到底是什么、和 chatbot / workflow 的界限、以及「自主性」的阶梯。"},
    {"num": "②", "prefix": "02", "title": "Agent 的核心循环与解剖", "phase": "认识 Agent",
     "summary": "拆开一个 agent:模型 + 循环 + 工具 + 上下文 + 记忆。用 ReAct「想一步—做一步—看结果」把这个闭环讲透。"},
    {"num": "③", "prefix": "03", "title": "工具使用 Tool Use", "phase": "认识 Agent",
     "summary": "agent 的手脚。function calling 怎么工作、工具怎么设计才好用(ACI)、以及把工具标准化的 MCP。"},
    {"num": "④", "prefix": "04", "title": "上下文与记忆", "phase": "认识 Agent",
     "summary": "agent 的工作台与笔记本。上下文窗口、短期/长期记忆、RAG、以及「上下文工程」与压缩。"},
    {"num": "⑤", "prefix": "05", "title": "规划与推理", "phase": "认识 Agent",
     "summary": "面对复杂任务,agent 怎么把大目标拆成小步、怎么反思纠错、什么时候才真的需要「规划」。"},

    # ── 板块二 · Agent Harness ────────────────────────────────────────────
    {"num": "⑥", "prefix": "06", "title": "什么是 Agent Harness", "phase": "Agent Harness",
     "summary": "包在模型外面的那层代码。为什么同一个模型,换个 harness 表现天差地别——有时 harness 比模型更重要。"},
    {"num": "⑦", "prefix": "07", "title": "核心组件:循环·提示·工具分发", "phase": "Agent Harness",
     "summary": "harness 的发动机:agent loop 怎么转、系统提示怎么搭、工具如何注册与分发、会话状态怎么管。"},
    {"num": "⑧", "prefix": "08", "title": "上下文管理与压缩", "phase": "Agent Harness",
     "summary": "上下文会被填满。harness 如何裁剪、总结、压缩(compaction),以及用记忆文件(CLAUDE.md 一类)对抗遗忘。"},
    {"num": "⑨", "prefix": "09", "title": "权限·安全·沙箱", "phase": "Agent Harness",
     "summary": "让 agent 动手,又不让它闯祸。审批模式、沙箱隔离、提示注入与越权防护。"},
    {"num": "⑩", "prefix": "10", "title": "子代理与多代理编排", "phase": "Agent Harness",
     "summary": "一个 agent 忙不过来时:subagent、supervisor/swarm、任务委派与并行,以及上下文如何隔离。"},
    {"num": "⑪", "prefix": "11", "title": "扩展与生态:hooks / MCP / skills", "phase": "Agent Harness",
     "summary": "harness 怎么长出插件生态:hooks、slash 命令、MCP、skills,以及可观测性。"},

    # ── 板块三 · 主流 Agent 与 Harness 拆解(编码 agent 起步)──────────────
    {"num": "⑫", "prefix": "12", "title": "拆解 · Claude Code", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "Anthropic 官方 CLI agent。一步步看它的 agent loop、工具集、CLAUDE.md、子代理、权限与钩子。"},
    {"num": "⑬", "prefix": "13", "title": "拆解 · OpenAI Codex CLI", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "OpenAI 开源的 Rust CLI agent。apply_patch、沙箱(Seatbelt/Landlock)、审批模式与 AGENTS.md。"},
    {"num": "⑭", "prefix": "14", "title": "拆解 · Cursor(编辑器类)", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "把 agent 装进编辑器:Composer/Agent 模式、代码库索引与检索、apply 模型;对比 Copilot / Cline。"},
    {"num": "⑮", "prefix": "15", "title": "拆解 · Aider(+ Gemini CLI)", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "开源结对编程 Aider 的 repo map 与编辑格式;对照 Google Gemini CLI 的 CLI 形态。"},

    # ── 板块三(续)· 自主 agent · 框架 · 新一代 harness · 领域 ────────────
    {"num": "⑯", "prefix": "16", "title": "拆解 · 自主 SWE agent", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "长跑型 agent:SWE-agent 的 ACI、OpenHands 的事件流与运行时、Devin 的沙箱与长程执行。"},
    {"num": "⑰", "prefix": "17", "title": "拆解 · 通用 agent 与框架", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "Manus 的云端虚机 agent、LangGraph 的图式编排、AutoGPT 的自主 agent 起源与教训。"},
    {"num": "⑱", "prefix": "18", "title": "拆解 · 新一代 harness", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "OpenClaw 的 ACP 元编排、Hermes 的自进化 skills 与 provider 抽象——harness 自己也在长成生态。"},
    {"num": "⑲", "prefix": "19", "title": "拆解 · 芯片设计域 agent", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "UCAgent 的验证工作流、RTL 生成 / 验证 agent 全景、以及物理与系统层的调优 agent——agent 真正走进 EDA 流程。"},

    # ── 板块三(续)· 主流系统全景拆解(编码群像 → 框架 → 平台 → GUI → 研究 → 基础设施)──
    {"num": "⑳", "prefix": "23", "title": "拆解 · 编码 Agent 群像(IDE 派)", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "把 agent 装进编辑器:深拆 Cline 与 Windsurf,横扫 Roo Code / Kilo Code / Continue / Zed / Augment / Amazon Q / Trae / Qoder / Kiro / Antigravity 与国产阵营。"},
    {"num": "㉑", "prefix": "24", "title": "拆解 · 编码 Agent 群像(CLI 与云端)", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "provider 无关的开源终端 agent 与云端长跑自主 SWE:深拆 OpenCode 与 Goose,横扫 Warp / Sourcegraph Amp / Factory Droids。"},
    {"num": "㉒", "prefix": "25", "title": "拆解 · Vibe Coding 应用生成器", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "用自然语言直接造应用:深拆 Replit Agent 与 Bolt.new,对照 Vercel v0 与 Lovable——面向非专业开发者的整包生成+托管。"},
    {"num": "㉓", "prefix": "26", "title": "拆解 · 多智能体编排框架", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "role-based / conversation / SOP / handoff 四种编排范式:深拆 CrewAI、AutoGen、MetaGPT,横扫 OpenAI Agents SDK / Google ADK / CAMEL / smolagents。"},
    {"num": "㉔", "prefix": "27", "title": "拆解 · 构建 Agent 的工程框架", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "你用来搭 agent 的工程底座:深拆 LlamaIndex、Pydantic AI、DSPy,横扫 Agno / Mastra / Semantic Kernel / Strands / Vercel AI SDK。"},
    {"num": "㉕", "prefix": "28", "title": "拆解 · 低代码 / 可视化平台", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "不写代码也能搭 agent:深拆 Dify 与 n8n,对照 Coze 与 Langflow——可视化编排、LLMOps、自托管的取舍。"},
    {"num": "㉖", "prefix": "29", "title": "拆解 · 会用电脑的 Agent(GUI/浏览器)", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "让 agent 像人一样点鼠标、敲键盘、看屏幕:深拆 browser-use 与 Anthropic Computer Use,对照 OpenAI Operator——截图坐标 vs DOM。"},
    {"num": "㉗", "prefix": "30", "title": "拆解 · 深度研究 Agent", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "planner→并行检索→综合成带引用报告:深拆 DeerFlow 与 GPT-Researcher,对照 STORM 与 Perplexity。"},
    {"num": "㉘", "prefix": "31", "title": "拆解 · Agent 运行时与基础设施", "phase": "主流 Agent 与 Harness 拆解",
     "summary": "agent 火起来后长出的基础设施:深拆 E2B 沙箱、Bedrock AgentCore 托管运行时、Letta 记忆 OS,回顾 MCP / A2A / ACP 协议层。"},

    # ── 板块四 · 融会贯通与落地 ────────────────────────────────────────────
    {"num": "㉙", "prefix": "20", "title": "如何设计一个好的 Harness", "phase": "融会贯通与落地",
     "summary": "把前面所有组件串成一套设计方法论,并盘点那些反复出现的坑与最佳实践。"},
    {"num": "㉚", "prefix": "21", "title": "怎么评测一个 Agent", "phase": "融会贯通与落地",
     "summary": "SWE-bench 一类基准、评测的陷阱、以及怎么判断一个 agent / harness 到底好不好。"},
    {"num": "㉛", "prefix": "22", "title": "落地:端到端芯片设计 Agent", "phase": "融会贯通与落地",
     "summary": "用一个高约束领域案例,把整站知识落到「端到端 agent/harness 设计」上。"},
]

PHASE_ORDER = ["认识 Agent", "Agent Harness", "主流 Agent 与 Harness 拆解", "融会贯通与落地"]


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
    print(f"已生成 content.js:{n_avail}/{len(docs)} 章有文档。")
    for d in docs:
        flag = "✓" if d["available"] else "·"
        print(f"  {flag} {d['num']} {d['title']:<26} {d['file'] or '(未写)'}")


if __name__ == "__main__":
    main()
