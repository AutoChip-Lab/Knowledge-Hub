---
key: aider
name: Aider
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- VERSION: The brief states the 'latest tagged release is v0.86.0 (August 9, 2025)' as if current. Corrected: as of July 2026 the latest release on PyPI is v0.86.2 (released Feb 12, 2026), with v0.86.1 in between. v0.86.0 was the Aug 9 2025 release. Cadence also slowed markedly in 2026 (occasional releases, not 'roughly every two weeks' as it was in 2024-2025). Source: https://pypi.org/project/aider-chat/ and https://aider.chat/HISTORY.html
- EDIT FORMATS COUNT: The brief says 'Four edit formats.' Corrected: aider documents at least six named edit formats — whole, diff, diff-fenced, udiff, editor-diff, and editor-whole (the editor-* pair are streamlined formats used by the editor model in architect mode). A 'patch' format also exists for some models. Source: https://aider.chat/docs/more/edit-formats.html
- PAGERANK MULTIPLIERS: The brief lists only '10x mentioned, 10x well-named, 50x chat files' (flagged med-confidence from a DeepWiki secondary source). Verified and expanded against the actual source (aider/repomap.py): 10x for user-mentioned identifiers; 10x for well-named snake/kebab/camelCase identifiers of length >= 8; 50x for references originating from files already in the chat; and additionally 0.1x (down-weight) for underscore-prefixed/private identifiers and for identifiers defined in more than 5 files, plus sqrt() scaling of reference counts. These are now confirmed from primary source code, not just DeepWiki.
- MCP SUPPORT — SIGNIFICANT: The brief lists MCP client support as a component/keyFact (citing a secondary VIPS source). Corrected/downgraded: MCP is NOT documented on aider's official config/docs pages (verified https://aider.chat/docs/config.html contains no MCP references). The widely-cited 'Aider MCP servers' (disler, sengokudaikon, mcpm-aider) are THIRD-PARTY wrappers that let other MCP clients call Aider, or bridges — they are not native/official Aider MCP-client functionality. Native MCP client support in Aider is unconfirmed from any primary source and should not be presented as a verified built-in feature.
- SHELL EXECUTION: The brief's architecture/uncertainties waffle on shell execution. Clarified: Aider does have /run (user runs a shell command and can share stdout/stderr with the model) and /test + --test-cmd and --lint (auto-run after edits, errors fed back to the model in a tree-sitter-formatted report). But this is user-configured/user-triggered, NOT an autonomous bash/tool-calling loop like Claude Code's agentic shell tool. Source: https://aider.chat/docs/usage/lint-test.html
- GITHUB STARS/FORKS: '47,000 stars / 4.7k forks' matches the cached GitHub snapshot but that snapshot also still shows 'v0.86.0 / 93 releases' which is stale relative to PyPI's v0.86.2. The star/fork figures should be treated as an approximate mid-2025 snapshot that has likely grown by mid-2026; do not present exact counts as current.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED as 'current': 'Latest tagged release is v0.86.0 (August 9, 2025)' — superseded by v0.86.1 and v0.86.2 (Feb 12, 2026).
- DUBIOUS / NOT OFFICIALLY SUPPORTED: 'MCP client support exists (stdio transport, configurable via .aider.conf.yml)' — no primary aider.chat documentation supports native MCP client support; the YAML/stdio config examples circulating online come from third-party bridge projects, not core Aider. Treat as unverified.
- INCOMPLETE (not wrong, but undercounts): 'Four edit formats' — there are at least six documented formats.
- OVERSTATED PRECISION: 'ships roughly every two weeks' — true for 2024-2025 but the 2026 release cadence slowed to occasional releases.
- OVERSTATED as marketing-y but ACTUALLY TRUE: 'Aider wrote 88% of its own code in v0.86.0 and 62% in current main' — verified verbatim from the primary HISTORY.html; note the per-release figure is volatile (e.g. v0.85.0 was only 21%, v0.84.0 was 79%), so the honest framing is 'usually ~70-80% per release, but it varies widely release to release.'

**尚未解决的问题:**
- Native MCP client support: is there ANY first-party Aider MCP-client feature in a 2026 release? Official docs (config.html) show none; all evidence points to third-party bridges. Needs confirmation from HISTORY.md or the options reference before stating Aider is an MCP client.
- Exact current GitHub star/fork counts and total release count as of July 2026 (the cached repo page still shows the stale v0.86.0 / 93-releases / 47k-stars snapshot).
- Whether v0.86.2 (Feb 2026) is truly the newest release or whether a v0.87.x line shipped after Feb 2026 — PyPI showed v0.86.2 as latest, but this should be re-checked at publication time.
- The full/current polyglot leaderboard top entry may shift as new models (e.g. GPT-5.5, Claude 4.6) are added; the gpt-5 88.0% figure is current but volatile — re-fetch the leaderboard before publishing exact numbers.
- The 'patch' edit format and precisely which models default to which format is only lightly documented; the exact per-model default mapping was not fully verified.
- Whether the Python scripting API (Coder.create()) remains marked unofficial/unstable in the latest release (brief claims so; not re-verified this pass but low-risk).

---
## Aider — Verified Source Brief (fact-checked July 2026)

### What it is + who/when
**Aider** is an open-source, terminal-native **AI pair-programming CLI** created by **Paul Gauthier**. You run it inside a local git repo, chat with an LLM about changes, and Aider applies the LLM's proposed edits to your files and (by default) auto-commits each change. First released in **2023**; written in **Python**; installable via pip/uv. As of July 2026 the latest PyPI release is **v0.86.2 (Feb 12, 2026)** — v0.86.0 was the Aug 9 2025 release, followed by v0.86.1 and v0.86.2 ([PyPI](https://pypi.org/project/aider-chat/), [HISTORY](https://aider.chat/HISTORY.html)). The 2024–2025 cadence of ~biweekly releases slowed to occasional releases in 2026. GitHub metrics were ~47k stars / ~4.7k forks at a mid-2025 snapshot ([repo](https://github.com/Aider-AI/aider)) and have likely grown since — treat exact counts as approximate.

### Architecture & named components
A stateless Python CLI (no persistent daemon; state lives in git history) sitting between the terminal and LLM APIs. Verified components:
- **RepoMap** (`aider/repomap.py`) — tree-sitter + PageRank codebase summary (details below).
- **Coder** base class with per-format subclasses: `WholeCoder`, `EditBlockCoder`, `UnifiedDiffCoder`, `ArchitectCoder`, `EditorCoder`.
- **InputOutput** — the REPL prompt, slash-command parsing, user I/O.
- **GitRepo** — auto-commit, dirty-commit-first handling, `/undo`, commit-message generation.
- **litellm** integration — one abstraction layer over OpenAI, Anthropic, Gemini, DeepSeek, Ollama, OpenRouter, xAI, etc. (model-agnosticism is a core differentiator).
- **Edit applicator** with fuzzy fallback (whitespace normalization, context relaxation).
- **Weak/cheap model** — used only for commit messages (sees diffs + chat history, not full context).
- **Linter/test integration** — post-edit checks; errors fed back to the model in a tree-sitter-formatted report ([lint-test docs](https://aider.chat/docs/usage/lint-test.html)).

**Edit formats (at least six, not four):** `whole` (full-file rewrite), `diff` (git-conflict-style SEARCH/REPLACE blocks), `diff-fenced` (Gemini variant, path *inside* the fence), `udiff` (simplified unified diff, targets GPT-4-Turbo laziness), and `editor-diff` / `editor-whole` (streamlined formats the editor model uses in architect mode); a `patch` format also exists for some models ([edit-formats](https://aider.chat/docs/more/edit-formats.html)).

**Chat modes:** `code` (default), `ask` (no edits), `architect` (two-model), `help` (self-docs).

### How one task flows through it (verified)
1. `aider file1.py file2.py` — Aider finds the git root, runs **tree-sitter** (via `py-tree-sitter-languages`) over tracked files to extract definitions/references, builds a **NetworkX** dependency graph (edges: referencing file → defining file), and runs **personalized PageRank** biased toward the added/chat files to pick the most relevant symbols, emitting a compact, token-budgeted map (default **1,024 tokens**, `--map-tokens`; expands dynamically) ([repomap docs](https://aider.chat/docs/repomap.html), [repomap article](https://aider.chat/2023/10/22/repomap.html)).
2. REPL reads a message at the `>` prompt.
3. Context assembled: system prompt (with edit-format instructions), repo map, contents of explicitly added files, conversation history.
4. Request sent via litellm to the configured model.
5. Model replies with edits in the configured format.
6. Edit applicator parses and applies them, with fuzzy fallback matching.
7. If configured, `--lint`/`--test`(via `/test`, `/lint`, `--test-cmd`) run; failures are pasted back to the model for iterative fixing.
8. Auto-commit: any dirty pre-existing changes are committed first (protecting user work), then AI edits are committed with a generated message. `/undo` reverts, `/diff` shows changes.

**PageRank edge weighting (verified against source, richer than commonly cited):** ×10 for user-mentioned identifiers; ×10 for "well-named" snake/kebab/camelCase identifiers of length ≥ 8; ×50 for references coming from files already in the chat; ×0.1 (down-weight) for underscore/private identifiers and for identifiers defined in >5 files; reference counts are `sqrt()`-scaled ([source `repomap.py`](https://github.com/Aider-AI/aider/blob/main/aider/repomap.py)).

### Distinctive design decisions & tradeoffs
1. **Repo map instead of full-context dump** — structural awareness at ~1k tokens; PageRank propagates transitive importance so heavily-referenced files rank high without being mentioned.
2. **Pluggable edit formats** — different models have different failure modes (GPT-4-Turbo laziness, Gemini fencing violations); formats are swappable per-model without touching the agent loop. `udiff` was designed specifically to fight placeholder-comment "laziness," and it omits line numbers because "GPT is terrible at working with source code line numbers" ([unified-diffs](https://aider.chat/docs/unified-diffs.html)).
3. **Architect/Editor split (Sept 2024)** — a reasoning model plans ("what to do"), a cheaper editor model formats correct diffs ("how to write it"). Verified SOTA: **o1-preview (architect) + o1-mini or DeepSeek (editor) = 85.0%**; **o1-preview + Claude 3.5 Sonnet = 82.7%** ([architect](https://aider.chat/2024/09/26/architect.html)).
4. **Git as the undo mechanism** — every edit is a commit, `/undo` reverts; reuses developer tooling instead of a bespoke state system; dirty-commit-first prevents data loss.
5. **litellm for model abstraction** — broad provider support, BYOM.
6. **Tree-sitter replaced ctags** — pure-Python, pip-installable, richer AST data (full signatures) ([repomap article](https://aider.chat/2023/10/22/repomap.html)).
7. **Weak model for commit messages** — keeps costs low.

**Benchmark facts (verified):** The `udiff` format raised a 89-task Python refactoring/"laziness" benchmark from **20% → 61%**, cutting lazy-placeholder tasks from 12 → 4 ([unified-diffs](https://aider.chat/docs/unified-diffs.html)). The **polyglot leaderboard** = **225 Exercism exercises** across **C++, Go, Java, JavaScript, Python, Rust**; current top: **gpt-5 (high) 88.0% @ $29.08**, gpt-5 (medium) 86.7% @ $17.69, **o3-pro (high) 84.9% @ $146.32**, gemini-2.5-pro 83.1% ([leaderboard](https://aider.chat/docs/leaderboards/)). **Dogfooding:** Aider wrote **88% of v0.86.0** and **62% of the current main branch**; per-release figures vary widely (v0.85.0 was 21%, v0.84.0 was 79%), so the honest summary is "usually ~70–80% per release, but variable" ([HISTORY](https://aider.chat/HISTORY.html)).

### How it differs from peers
- **vs Cursor:** Cursor is a VS Code fork with GUI + inline completions and ties you to its subscription/models; Aider is terminal-only, git-centric, BYOM.
- **vs Claude Code:** both terminal-native and git-aware, but Claude Code is closed-source, Claude-only, with a stronger autonomous shell/tool-execution model. Aider predates it and maintains its own benchmarks and edit-format system. (Aider's shell story is user-triggered `/run` + configured `/test`/`--lint`, not an autonomous bash tool.)
- **vs GitHub Copilot:** IDE-embedded inline completions, no repo-map equivalent, limited git integration, tightly coupled to GitHub/Microsoft.
- **vs Cline/Roo-Code:** VS Code extension agents with richer autonomous tool use (shell, browser, MCP) but less git-centric and without Aider's benchmark-validated edit-format system.

Aider's niche: open-source, BYOM, git-as-undo, published/maintained benchmarks (polyglot leaderboard), and heavy dogfooding.

### Teaching hooks
1. **Repo map = "selective context" for the context-window problem.** PageRank over a code-dependency graph is a concrete, teachable "relevance" algorithm; a clean counterexample to naive "dump the whole codebase."
2. **Edit formats = reliability engineering.** The 20%→61% udiff story shows output-format contracts measurably change model behavior — a lesson agent newcomers underestimate.
3. **Architect/Editor = a minimal two-agent pipeline.** Reasoning model decides *what*; cheap model formats *how* — task decomposition across specialized models, with a cost win.
4. **Git as the safety mechanism.** Reuse existing infrastructure (VCS) as rollback/audit instead of bespoke state; `/undo` = a git revert.
5. **Benchmark-driven development.** A public leaderboard and edit-format benchmarks that actually drive design choices — a model for responsible agent engineering.
6. **Dogfooding as a falsifiable signal.** "Aider wrote 88% of v0.86.0" is memorable — but teach the caveat that the number swings release-to-release (21%→88%), which itself is a lesson in reading self-reported metrics skeptically.