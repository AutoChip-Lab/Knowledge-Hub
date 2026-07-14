#!/usr/bin/env python3
"""Generate the English source files without modifying the Chinese originals.

The script protects Markdown/HTML/code delimiters while translating visible copy,
then writes sibling files with an ``_en`` suffix.  The generated files are normal
source files: the site build never needs network access.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from svg_translations import SVG_COMMENT_TRANSLATIONS, SVG_TRANSLATIONS


HERE = Path(__file__).resolve().parent
BOUNDARY = "__MA_SEG_BOUNDARY_7F3A__"
MAX_BATCH_CHARS = 1400
CJK_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
_LOCAL_TRANSLATOR = None

MARKDOWN_FILES = [
    "01-全景与定义.md",
    "02-角色与团队设计.md",
    "03-任务分解与规划.md",
    "04-协作拓扑.md",
    "05-通信协议.md",
    "06-路由与交接.md",
    "07-观测评测与调试.md",
    "08-安全与生产化.md",
    "09-案例软件工厂.md",
    "10-案例研究团队.md",
    "11-框架与项目图谱.md",
    "12-学习路线与引用.md",
    "market-task-auction.md",
    "topology-blackboard.md",
    "topology-debate.md",
    "topology-dynamic.md",
    "topology-graph.md",
    "topology-pipeline.md",
    "topology-supervisor.md",
]

SVG_FILES = [
    "assets/failure-localization-trace.svg",
    "assets/high-risk-action-approval.svg",
    "assets/overview-main-flow.svg",
    "assets/prompt-injection-defense.svg",
    "assets/role-design-from-capability.svg",
    "assets/system-layers.svg",
    "assets/task-dag-from-goal.svg",
    "assets/topology-debate-three-rounds.svg",
]

# The interactive architecture is inline in index.html.  These are the standalone
# illustrations referenced by Markdown; keeping the list explicit prevents an
# already generated English SVG from becoming an input on a later run.

PROTECT_RE = re.compile(
    r"<[^>]+>"
    r"|https?://[^\s<>)\]}]+"
    r"|(?<=\()(?:(?:assets/)?[^()\s]+\.(?:svg|md|png|jpe?g|webp)|index\.html[^()\s]*)"
    r"|[\"'][^\"'\r\n]+\.(?:md|svg)[\"']"
    r"|\$[^$\r\n]+\$"
)


def english_path(path: Path) -> Path:
    return path.with_name(f"{path.stem}_en{path.suffix}")


def protect(text: str) -> tuple[str, list[str]]:
    """Replace syntax-sensitive spans with stable ASCII placeholders."""
    protected: list[str] = []

    def stash(value: str) -> str:
        token = f"__MA_PROTECTED_{len(protected):04d}__"
        protected.append(value)
        return token

    text = PROTECT_RE.sub(lambda match: stash(match.group(0)), text)

    # Keep backtick delimiters stable. Translate their contents only when they
    # contain natural-language Chinese; pure identifiers remain untouched.
    inline_code = re.compile(r"(`+)([^`\r\n]*?)(\1)")

    def protect_code(match: re.Match[str]) -> str:
        opening, content, closing = match.groups()
        if CJK_RE.search(content):
            return f"{stash(opening)}{content}{stash(closing)}"
        return stash(match.group(0))

    text = inline_code.sub(protect_code, text)
    return text, protected


def restore(text: str, protected: list[str]) -> str:
    for index, value in enumerate(protected):
        text = text.replace(f"__MA_PROTECTED_{index:04d}__", value)
    missing = re.findall(r"__MA_PROTECTED_\d{4}__", text)
    if missing:
        raise ValueError(f"unrestored placeholders: {missing[:3]}")
    return text


def request_translation(text: str) -> str:
    query = urllib.parse.urlencode(
        {"client": "gtx", "sl": "zh-CN", "tl": "en", "dt": "t", "q": text}
    )
    request = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0 bilingual-doc-builder/1.0"},
    )
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.load(response)
            return "".join(part[0] for part in data[0] if part[0])
        except Exception as exc:  # pragma: no cover - network recovery
            last_error = exc
            time.sleep(min(8, 1.5**attempt))
    raise RuntimeError("translation service failed after five attempts") from last_error


def local_translate_strings(values: list[str]) -> list[str]:
    """Translate a list with the cached local Marian model (no network at build time)."""
    global _LOCAL_TRANSLATOR
    if not values:
        return []
    if _LOCAL_TRANSLATOR is None:
        from transformers import pipeline

        _LOCAL_TRANSLATOR = pipeline(
            "translation", model="Helsinki-NLP/opus-mt-zh-en", device=0
        )
    translated = _LOCAL_TRANSLATOR(
        values, batch_size=16, max_length=512, truncation=True
    )
    output = [item["translation_text"].strip() for item in translated]
    retry_indexes = [index for index, value in enumerate(output) if CJK_RE.search(value)]
    if retry_indexes:
        retried = _LOCAL_TRANSLATOR(
            [f"翻译成英文：{output[index]}" for index in retry_indexes],
            batch_size=16,
            max_length=512,
            truncation=True,
        )
        for index, item in zip(retry_indexes, retried):
            output[index] = item["translation_text"].strip()
    return output


def translate_items(items: list[str]) -> list[str]:
    """Translate independent strings in bounded batches while preserving order."""
    if not items:
        return []
    result: list[str] = []
    pending: list[str] = []
    pending_size = 0

    def flush() -> None:
        nonlocal pending, pending_size
        if not pending:
            return
        joined = f"\n{BOUNDARY}\n".join(pending)
        translated = request_translation(joined)
        parts = re.split(rf"\s*{re.escape(BOUNDARY)}\s*", translated)
        if len(parts) != len(pending):
            # A rare service-side formatting rewrite should not corrupt the file.
            parts = [request_translation(item) for item in pending]
        result.extend(part.strip("\r\n") for part in parts)
        pending = []
        pending_size = 0

    for item in items:
        item_size = len(item) + len(BOUNDARY) + 2
        if pending and pending_size + item_size > MAX_BATCH_CHARS:
            flush()
        if len(item) > MAX_BATCH_CHARS:
            flush()
            result.append(request_translation(item).strip("\r\n"))
            continue
        pending.append(item)
        pending_size += item_size
    flush()
    return result


def translate_text(raw: str) -> str:
    """Translate CJK-bearing lines and leave all other source bytes alone."""
    lines = raw.splitlines(keepends=True)
    candidates: list[str] = []
    metadata: list[tuple[int, str, list[str]]] = []

    for index, line in enumerate(lines):
        if not CJK_RE.search(line):
            continue
        ending_match = re.search(r"(\r?\n)$", line)
        ending = ending_match.group(1) if ending_match else ""
        body = line[: -len(ending)] if ending else line
        leading = re.match(r"^\s*", body).group(0)
        protected_body, protected = protect(body[len(leading) :])
        candidates.append(protected_body)
        metadata.append((index, leading + ending, protected))

    translated = translate_items(candidates)
    for (index, whitespace, protected), value in zip(metadata, translated):
        original = lines[index]
        ending = "\n" if original.endswith("\n") else ""
        if original.endswith("\r\n"):
            ending = "\r\n"
        leading = whitespace[: len(whitespace) - len(ending)] if ending else whitespace
        lines[index] = leading + restore(value, protected) + ending
    return "".join(lines)


def rewrite_english_asset_links(raw: str) -> str:
    for relative in SVG_FILES:
        asset = Path(relative).as_posix()
        en_asset = Path(relative).with_name(f"{Path(relative).stem}_en.svg").as_posix()
        raw = raw.replace(asset, en_asset)
    return raw


def polish_english_markdown(source: str, translated: str) -> str:
    """Repair translator spacing/word-order around Markdown and inline HTML."""
    translated = re.sub(
        r"(!?\[[^\]\n]+\])\s+\(([^)\n]+)\)", r"\1(\2)", translated
    )
    replacements = {
        "When encountering the following English words for the first time in this chapter, first understand them according to their Chinese meanings; their characteristics and engineering practices will be expanded upon later.":
            "When you first encounter the terms below, use these working definitions as a quick reference; later sections cover their properties and engineering implications.",
        "| English terminology | Chinese saying | The meaning of remember first |":
            "| Term | Working definition | Key idea |",
        "| English terminology | Chinese saying | Specific meaning in this chapter |":
            "| Term | Working definition | Meaning in this chapter |",
        "| English terminology | Chinese saying | Meaning |":
            "| Term | Working definition | Meaning |",
        "flow charts and Chinese explanations are teaching abstractions":
            "flowcharts and explanatory prose are teaching abstractions",
        "Quote:\n": "References:\n",
        "Review quote:\n": "References:\n",
    }
    for old, new in replacements.items():
        translated = translated.replace(old, new)

    source_lines = source.splitlines(keepends=True)
    target_lines = translated.splitlines(keepends=True)
    if len(source_lines) != len(target_lines):
        raise ValueError("translation changed line count before HTML-boundary repair")

    for index, (source_line, target_line) in enumerate(zip(source_lines, target_lines)):
        ending = "\r\n" if target_line.endswith("\r\n") else "\n" if target_line.endswith("\n") else ""
        body = target_line[: -len(ending)] if ending else target_line
        source_body = source_line.strip()
        stripped = body.strip()
        indent = body[: len(body) - len(body.lstrip())]

        if source_body.startswith("<") and stripped and not stripped.startswith("<"):
            match = re.match(r"([^<]+)(<[^>]+>)(.*)$", stripped)
            if match:
                prefix, opening, remainder = match.groups()
                stripped = f"{opening}{prefix.strip()} {remainder.lstrip()}"

        if source_body.endswith(">") and stripped and not stripped.endswith(">"):
            match = re.match(r"^(.*)(</[^>]+>)(\s*[^<]+)$", stripped)
            if match:
                beginning, closing, suffix = match.groups()
                stripped = f"{beginning.rstrip()} {suffix.strip()}{closing}"

        target_lines[index] = indent + stripped + ending if stripped else ending
    return "".join(target_lines)


def translate_cjk_remainder(raw: str, passes: int = 3) -> str:
    """Retry isolated labels that a batch translation occasionally leaves intact."""
    for _ in range(passes):
        if not CJK_RE.search(raw):
            break
        raw = translate_text(raw)
    return raw


def validate_pair(source: str, translated: str, source_name: str) -> None:
    invariants = ["```", '<div class="learning-path">', '<div class="chapter-check">']
    for marker in invariants:
        if source.count(marker) != translated.count(marker):
            raise ValueError(
                f"{source_name}: marker count changed for {marker!r} "
                f"({source.count(marker)} -> {translated.count(marker)})"
            )
    if CJK_RE.search(translated):
        matches = sorted(set(CJK_RE.findall(translated)))
        raise ValueError(f"{source_name}: untranslated CJK remains: {''.join(matches[:12])}")
    if "__MA_PROTECTED_" in translated or BOUNDARY in translated:
        raise ValueError(f"{source_name}: translation placeholder leaked")


def write_markdown(force: bool) -> None:
    for relative in MARKDOWN_FILES:
        source_path = HERE / relative
        target_path = english_path(source_path)
        if target_path.exists() and not force:
            print(f"skip {target_path.name} (already exists)")
            continue
        source = source_path.read_text(encoding="utf-8")
        translated = translate_text(source)
        translated = polish_english_markdown(source, translated)
        translated = rewrite_english_asset_links(translated)
        validate_pair(source, translated, relative)
        target_path.write_text(translated, encoding="utf-8", newline="\n")
        print(f"wrote {target_path.name}")


def translate_svg_locally(source: str) -> str:
    matches = [
        match
        for match in re.finditer(r">([^<>]*[\u3400-\u9fff][^<>]*)<", source)
    ]
    values = []
    for match in matches:
        value = html.unescape(match.group(1)).strip()
        if value not in values:
            values.append(value)
    translated_values = local_translate_strings(values)
    translations = dict(zip(values, translated_values))

    def replace(match: re.Match[str]) -> str:
        original = html.unescape(match.group(1))
        leading = original[: len(original) - len(original.lstrip())]
        trailing = original[len(original.rstrip()) :]
        translated = translations[original.strip()]
        return f">{leading}{html.escape(translated, quote=False)}{trailing}<"

    return re.sub(r">([^<>]*[\u3400-\u9fff][^<>]*)<", replace, source)


def translate_svg_manually(source: str) -> str:
    """Apply layout-aware curated labels to an SVG source string."""
    missing: list[str] = []

    def replace(match: re.Match[str]) -> str:
        original = html.unescape(match.group(1))
        key = original.strip()
        if key not in SVG_TRANSLATIONS:
            missing.append(key)
            return match.group(0)
        leading = original[: len(original) - len(original.lstrip())]
        trailing = original[len(original.rstrip()) :]
        translated = html.escape(SVG_TRANSLATIONS[key], quote=False)
        return f">{leading}{translated}{trailing}<"

    translated = re.sub(r">([^<>]*[\u3400-\u9fff][^<>]*)<", replace, source)
    for original, english in SVG_COMMENT_TRANSLATIONS.items():
        translated = translated.replace(f"<!-- {original} -->", f"<!-- {english} -->")
    if missing:
        raise ValueError(f"missing curated SVG translations: {missing[:5]}")
    return translated


def preserve_svg_layout(previous: str, translated: str) -> str:
    """Carry intentional text positions across an explicit regeneration.

    Do not preserve ``textLength``/``lengthAdjust``: shrinking glyphs horizontally
    makes English labels look flattened.  English SVGs use natural text wrapping,
    proportional font-size changes, and explicit layout adjustments instead.
    """
    pattern = re.compile(r"<text\b[^>]*>[^<]*</text>")
    layouts: dict[str, list[dict[str, str]]] = {}
    for match in pattern.finditer(previous):
        node = match.group(0)
        opening, content = node.split(">", 1)
        key = html.unescape(content.rsplit("</text", 1)[0]).strip()
        attrs = {}
        for name in ("x", "y"):
            found = re.search(rf'\s{name}="([^"]*)"', opening)
            if found:
                attrs[name] = found.group(1)
        layouts.setdefault(key, []).append(attrs)

    used: dict[str, int] = {}

    def restore_layout(match: re.Match[str]) -> str:
        node = match.group(0)
        opening, content = node.split(">", 1)
        key = html.unescape(content.rsplit("</text", 1)[0]).strip()
        position = used.get(key, 0)
        used[key] = position + 1
        candidates = layouts.get(key, [])
        if position >= len(candidates):
            return node
        for name, value in candidates[position].items():
            opening = re.sub(rf'\s{name}="[^"]*"', "", opening)
            opening += f' {name}="{value}"'
        return opening + ">" + content

    return pattern.sub(restore_layout, translated)


def write_svgs(force: bool, offline: bool = False) -> None:
    for relative in SVG_FILES:
        source_path = HERE / relative
        target_path = english_path(source_path)
        if target_path.exists() and not force:
            print(f"skip {target_path.relative_to(HERE)} (already exists)")
            continue
        source = source_path.read_text(encoding="utf-8")
        previous = target_path.read_text(encoding="utf-8") if target_path.exists() else ""
        translated = (
            translate_svg_manually(source)
            if offline
            else translate_cjk_remainder(translate_text(source))
        )
        if previous:
            translated = preserve_svg_layout(previous, translated)
        if CJK_RE.search(translated):
            raise ValueError(f"{relative}: untranslated CJK remains")
        target_path.write_text(translated, encoding="utf-8", newline="\n")
        print(f"wrote {target_path.relative_to(HERE)}")


def translate_answers_locally(source: str) -> str:
    templates = re.findall(r"`([^`]*)`", source)
    segments: list[str] = []
    split_templates: list[list[str]] = []
    for template in templates:
        parts = re.split(r"(<code>.*?</code>)", template)
        split_templates.append(parts)
        for part in parts:
            if CJK_RE.search(part) and not part.startswith("<code>"):
                segments.append(part)
    translated_segments = iter(local_translate_strings(segments))
    rebuilt: list[str] = []
    for parts in split_templates:
        output = []
        for part in parts:
            if CJK_RE.search(part) and not part.startswith("<code>"):
                output.append(next(translated_segments))
            else:
                output.append(part)
        rebuilt.append("".join(output))
    translations = iter(rebuilt)
    return re.sub(r"`([^`]*)`", lambda _: f"`{next(translations)}`", source)


def translate_answers_online(source: str) -> str:
    templates = re.findall(r"`([^`]*)`", source)
    segments: list[str] = []
    split_templates: list[list[str]] = []
    for template in templates:
        parts = re.split(r"(<code>.*?</code>)", template)
        split_templates.append(parts)
        for part in parts:
            if CJK_RE.search(part) and not part.startswith("<code>"):
                segments.append(part)
    translated_segments = iter(translate_items(segments))
    rebuilt: list[str] = []
    for parts in split_templates:
        output = []
        for part in parts:
            if CJK_RE.search(part) and not part.startswith("<code>"):
                output.append(next(translated_segments))
            else:
                output.append(part)
        rebuilt.append("".join(output))
    translations = iter(rebuilt)
    return re.sub(r"`([^`]*)`", lambda _: f"`{next(translations)}`", source)


def write_answers(force: bool, offline: bool = False) -> None:
    source_path = HERE / "check-answers.js"
    target_path = HERE / "check-answers_en.js"
    if target_path.exists() and not force:
        print(f"skip {target_path.name} (already exists)")
        return
    curated_marker = "// Curated answers for the chapters and deep dives currently linked by the site."
    curated = ""
    if target_path.exists():
        previous = target_path.read_text(encoding="utf-8")
        if curated_marker in previous:
            curated = curated_marker + previous.split(curated_marker, 1)[1]
    source = source_path.read_text(encoding="utf-8")
    translated = (
        translate_answers_locally(source)
        if offline
        else translate_answers_online(source)
    )
    translated = translated.replace("window.CHECK_ANSWERS =", "window.CHECK_ANSWERS_EN =", 1)
    translated = re.sub(r'(?P<name>[^"\r\n]+?)(?P<suffix>\.md")', r'\g<name>_en\g<suffix>', translated)
    if curated:
        translated = translated.rstrip() + "\n\n" + curated.rstrip() + "\n"
    validation_copy = re.sub(r'"[^"\r\n]+_en\.md"', '"english-source_en.md"', translated)
    if CJK_RE.search(validation_copy):
        raise ValueError("check-answers.js: untranslated CJK remains")
    target_path.write_text(translated, encoding="utf-8", newline="\n")
    print(f"wrote {target_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing _en files")
    parser.add_argument("--offline", action="store_true", help="use the cached local model for SVGs and answer data")
    args = parser.parse_args()
    write_markdown(args.force)
    write_svgs(args.force, args.offline)
    write_answers(args.force, args.offline)


if __name__ == "__main__":
    main()
