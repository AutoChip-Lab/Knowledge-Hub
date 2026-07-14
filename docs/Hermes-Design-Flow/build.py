#!/usr/bin/env python3
"""Build ``content.js`` from the design-flow Markdown chapters.

Run from any directory:
    python3 hermes-design-flow/build.py

The generated site records the checked-out repository HEAD used as its source
baseline and refuses to build without usable Git metadata.
"""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import quote, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
EN_DIR = os.path.join(HERE, "en")

STAGES = [
    {
        "num": "①",
        "prefix": "01",
        "title": "Hermes 核心架构",
        "titleEn": "Hermes Core Architecture",
        "phase": "核心设计",
        "phaseEn": "Core Design",
        "summary": "多个入口怎样共享一个 AIAgent，以及核心循环和边缘能力怎样分工。",
        "summaryEn": "How multiple entry points share one AIAgent, and how the core loop divides work with edge capabilities.",
    },
    {
        "num": "②",
        "prefix": "02",
        "title": "执行闭环",
        "titleEn": "Execution Loop",
        "phase": "运行机制",
        "phaseEn": "Runtime",
        "summary": "从 run_conversation 追踪 messages、模型请求、压缩、工具回填和收尾。",
        "summaryEn": "Trace messages, model requests, compression, tool results, and finalization from run_conversation.",
    },
    {
        "num": "③",
        "prefix": "03",
        "title": "状态、Memory 与自进化",
        "titleEn": "Memory and Self-Improvement",
        "phase": "运行机制",
        "phaseEn": "Runtime",
        "summary": "前台与后台 Agent 如何更新 Memory，以及持久状态怎样进入后续上下文。",
        "summaryEn": "How foreground and review agents update durable knowledge and inject it into later context.",
    },
    {
        "num": "④",
        "prefix": "04",
        "title": "工具、代码与子代理",
        "titleEn": "Tools, Code, and Subagents",
        "phase": "运行机制",
        "phaseEn": "Runtime",
        "summary": "直接工具、execute_code 与 delegate_task 的编排和隔离边界。",
        "summaryEn": "The orchestration and isolation boundaries of direct tools, execute_code, and delegate_task.",
    },
    {
        "num": "⑤",
        "prefix": "05",
        "title": "会话存储与搜索",
        "titleEn": "Session Storage and Search",
        "phase": "状态与上下文",
        "phaseEn": "State and Context",
        "summary": "SQLite、FTS5、原位压缩和 session_search 如何配合。",
        "summaryEn": "How SQLite, FTS5, in-place compaction, and session_search work together.",
    },
]

PHASE_ORDER = [
    "核心设计",
    "运行机制",
    "状态与上下文",
]

# These are presentation anchors, not a second source tree.  Each item points
# at the exact implementation a presenter can open while explaining the design
# idea in the corresponding chapter.  Keep the explanations short: the page
# is a pointer into the real repository, not a code copy.
CODE_ANCHORS = {
    "01": [
        {"title": "AIAgent 对外入口", "path": "run_agent.py", "start": 5775, "end": 5825, "note": "AIAgent 接收用户输入，并把正常 turn 转给统一 conversation loop。"},
        {"title": "统一 Conversation Loop", "path": "agent/conversation_loop.py", "start": 523, "end": 646, "note": "准备 TurnContext 后，进入共享的模型—工具循环。"},
        {"title": "工具统一执行入口", "path": "agent/tool_executor.py", "start": 306, "end": 390, "note": "模型产生的 tool calls 最终由同一个执行层运行并回填。"},
        {"title": "SessionDB", "path": "hermes_state.py", "start": 871, "end": 930, "note": "会话持久化独立于入口和模型运行时。"},
    ],
    "02": [
        {"title": "TurnContext：建立本轮 messages", "path": "agent/turn_context.py", "start": 271, "end": 347, "note": "复制历史、追加 user、取得 cached system prompt，并提前持久化 inbound turn。"},
        {"title": "messages 投影为 api_messages", "path": "agent/conversation_loop.py", "start": 787, "end": 882, "note": "动态 context 只进入请求副本；system prompt 在请求时前置。"},
        {"title": "请求前压力检查", "path": "agent/conversation_loop.py", "start": 954, "end": 1058, "note": "按 messages、system 和 tools 的完整规模判断压缩，压缩后重建请求。"},
        {"title": "工具回填闭环", "path": "agent/conversation_loop.py", "start": 4660, "end": 4784, "note": "assistant tool_calls 和 tool results 写回同一个 messages，再进入下一轮。"},
        {"title": "压缩五阶段", "path": "agent/context_compressor.py", "start": 2793, "end": 3055, "note": "裁剪 tool results，保护 head/tail，总结 middle，再重组 transcript。"},
        {"title": "统一收尾", "path": "agent/turn_finalizer.py", "start": 30, "end": 120, "note": "循环退出后统一完成持久化、结果组装和后台 review。"},
    ],
    "03": [
        {"title": "Memory 周期触发", "path": "agent/turn_context.py", "start": 278, "end": 314, "note": "从持久历史恢复计数，并按用户 turn 设置 memory review bool。"},
        {"title": "Finalizer 合并两个触发器", "path": "agent/turn_finalizer.py", "start": 454, "end": 480, "note": "Skill 按 loop iteration 触发；任一 trigger 成立即启动后台 review。"},
        {"title": "构造隔离 Review Agent", "path": "agent/background_review.py", "start": 650, "end": 830, "note": "继承运行时和会话快照，但关闭持久化、压缩和递归 review，只开放 memory/skill。"},
        {"title": "统一 Memory 写入口", "path": "tools/memory_tool.py", "start": 959, "end": 1034, "note": "前台和后台最终都通过 add/replace/remove/batch 修改 MemoryStore。"},
        {"title": "Memory 冻结快照", "path": "tools/memory_tool.py", "start": 169, "end": 204, "note": "live entries 可以写盘，但当前 session 的 system-prompt snapshot 保持不变。"},
        {"title": "Memory 进入 system prompt", "path": "agent/system_prompt.py", "start": 450, "end": 482, "note": "未来 fresh Agent 从冻结 snapshot 构造 cached system prompt。"},
        {"title": "Curator consolidation", "path": "agent/curator.py", "start": 1480, "end": 1590, "note": "确定性审计默认运行；LLM umbrella consolidation 必须显式开启。"},
    ],
    "04": [
        {"title": "execute_code 编排工具", "path": "tools/code_execution_tool.py", "start": 1115, "end": 1170, "note": "确定性的循环和过滤留在脚本中，主会话只接收有界结果。"},
        {"title": "委派运行方式", "path": "run_agent.py", "start": 5684, "end": 5714, "note": "顶层委派强制后台运行；orchestrator 子代理同步等待 worker。"},
        {"title": "角色与工具继承", "path": "tools/delegate_tool.py", "start": 1078, "end": 1152, "note": "默认 leaf 降权；orchestrator 只有在配置和深度允许时保留 delegation。"},
        {"title": "构造独立 Child Agent", "path": "tools/delegate_tool.py", "start": 1301, "end": 1354, "note": "创建独立 session、预算和 prompt，同时记录父子身份。"},
        {"title": "启动 Child Loop", "path": "tools/delegate_tool.py", "start": 1919, "end": 1925, "note": "只传 goal 和 child task_id，不复制父 conversation_history。"},
        {"title": "后台结果回流", "path": "tools/async_delegation.py", "start": 249, "end": 319, "note": "Child 结果进入共享 completion queue，再按原 session 投递为新 turn。"},
    ],
    "05": [
        {"title": "SessionDB schema", "path": "hermes_state.py", "start": 730, "end": 870, "note": "sessions、messages 与两套 FTS 索引组成持久会话的主体。"},
        {"title": "增量写入 messages", "path": "run_agent.py", "start": 1753, "end": 1910, "note": "以 conversation_history 为 baseline，只追加尚未持久化的消息。"},
        {"title": "恢复 active transcript", "path": "hermes_state.py", "start": 4084, "end": 4191, "note": "把 active rows 还原成下一轮的 conversation_history。"},
        {"title": "原位压缩", "path": "hermes_state.py", "start": 3694, "end": 3744, "note": "旧 rows 标记 compacted，新 head + summary + tail 成为 active view。"},
        {"title": "全文搜索", "path": "hermes_state.py", "start": 4512, "end": 4705, "note": "普通 FTS 与 trigram 共同覆盖词项、中文和子串搜索。"},
    ],
}


def _git(*args: str) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return ""
    return result.stdout.strip()


def _repository_url(remote: str) -> str:
    remote = remote.strip()
    if not remote:
        return ""
    if remote.startswith("git@") and ":" in remote:
        host, path = remote[4:].split(":", 1)
        remote = f"https://{host}/{path}"
    elif remote.startswith("ssh://git@"):
        parsed = urlparse(remote)
        remote = f"https://{parsed.hostname or ''}{parsed.path}"
    if remote.endswith(".git"):
        remote = remote[:-4]
    return remote if remote.startswith(("http://", "https://")) else ""


def source_metadata() -> dict:
    # Documentation commits live on a dedicated branch and do not exist on
    # GitHub's main branch.  Pin source links to the branch point instead of
    # HEAD so every code anchor resolves to the public source revision the
    # documentation was written against.  As the docs branch advances, its
    # merge-base with local ``main`` remains that original source baseline.
    commit = _git("merge-base", "HEAD", "main")
    if not re.fullmatch(r"[0-9a-fA-F]{40}", commit):
        raise RuntimeError("无法确定文档分支与 main 的 40 位源码基线；请在完整 Git checkout 中构建")
    commit = commit.lower()
    commit_date = _git("show", "-s", "--format=%cI", commit)
    repository = _repository_url(_git("remote", "get-url", "origin"))
    changed_paths = _git("diff", "--name-only", commit, "--").splitlines()
    dirty = any(
        path and not path.strip('"').startswith("hermes-design-flow/")
        for path in changed_paths
    )
    return {
        "commit": commit,
        "shortCommit": commit[:10],
        "commitDate": commit_date,
        "repository": repository,
        "commitUrl": f"{repository}/commit/{commit}" if repository else "",
        "dirty": dirty,
    }


def find_md(prefix: str) -> str | None:
    hits = sorted(glob.glob(os.path.join(HERE, f"{prefix}-*.md")))
    return hits[0] if hits else None


def find_en_md(prefix: str) -> str | None:
    hits = sorted(glob.glob(os.path.join(EN_DIR, f"{prefix}-*.md")))
    return hits[0] if hits else None


def build_code_anchors(prefix: str, source: dict) -> list[dict]:
    """Validate and turn presentation anchors into commit-pinned source links."""
    anchors = []
    for raw in CODE_ANCHORS.get(prefix, []):
        anchor = dict(raw)
        source_path = Path(REPO_ROOT) / anchor["path"]
        if not source_path.is_file():
            raise RuntimeError(f"代码锚点不存在：{anchor['path']}")
        with source_path.open(encoding="utf-8") as source_file:
            line_count = sum(1 for _ in source_file)
        if not (1 <= anchor["start"] <= anchor["end"] <= line_count):
            raise RuntimeError(
                f"代码锚点行号越界：{anchor['path']}:"
                f"{anchor['start']}-{anchor['end']}（文件 {line_count} 行）"
            )
        anchor["range"] = f"{anchor['path']}:L{anchor['start']}-L{anchor['end']}"
        if source.get("repository"):
            encoded_path = quote(anchor["path"], safe="/")
            anchor["url"] = (
                f"{source['repository']}/blob/{source['commit']}/{encoded_path}"
                f"#L{anchor['start']}-L{anchor['end']}"
            )
        else:
            anchor["url"] = ""
        anchors.append(anchor)
    return anchors


def main() -> None:
    source = source_metadata()
    docs = []
    for stage in STAGES:
        path = find_md(stage["prefix"])
        entry = dict(stage)
        entry["codeAnchors"] = build_code_anchors(stage["prefix"], source)
        if path:
            with open(path, encoding="utf-8") as source_file:
                entry["raw"] = source_file.read()
            entry["available"] = True
            entry["file"] = os.path.basename(path)
        else:
            entry["raw"] = ""
            entry["available"] = False
            entry["file"] = None
        en_path = find_en_md(stage["prefix"])
        if en_path:
            with open(en_path, encoding="utf-8") as source_file:
                entry["rawEn"] = source_file.read()
            entry["fileEn"] = os.path.relpath(en_path, HERE)
        else:
            entry["rawEn"] = entry["raw"]
            entry["fileEn"] = None
        docs.append(entry)

    site = {
        "title": "Hermes Agent 技术导览",
        "titleEn": "Hermes Agent Technical Guide",
        "subtitle": "沿着 run_conversation，讲清核心循环、自改进、子代理和持久会话。",
        "subtitleEn": "Follow run_conversation through the core loop, self-improvement, subagents, and durable sessions.",
        "source": source,
        "phaseOrder": PHASE_ORDER,
        "stages": docs,
    }
    output_path = os.path.join(HERE, "content.js")
    with open(output_path, "w", encoding="utf-8") as output:
        output.write("// 自动生成，请勿手改。修改 Markdown 后运行 python build.py。\n")
        output.write("window.SITE = ")
        output.write(json.dumps(site, ensure_ascii=False))
        output.write(";\n")

    available = sum(doc["available"] for doc in docs)
    print(
        f"已生成 content.js：{available}/{len(docs)} 篇文档，"
        f"源码 {site['source']['shortCommit']}"
    )


if __name__ == "__main__":
    main()
