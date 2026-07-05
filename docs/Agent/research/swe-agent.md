---
key: swe-agent
name: SWE-agent (Princeton)
category: 自主 SWE agent
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- EnIGMA improvement over prior agents on NYU CTF: brief said '3.3x'; primary sources (arXiv 2409.16165 and swe-agent.com/latest/background) say 'more than 3x' / '>3x' with EnIGMA solving 13.5% of the 200-challenge NYU CTF test set. Removed the fabricated-precision '3.3x' and replaced with '>3x (13.5% on NYU CTF's 200 challenges)'.
- Peer comparison 'Claude Code: Claude Opus 4.7 achieves 78.4% on SWE-bench Verified' is wrong/outdated. As of July 2026, Claude Opus 4.7 scores ~87.6% on SWE-bench Verified (Opus 4.8 ~88.6%, with newer Claude models higher). The 78.4% figure appears conflated/stale. Corrected and added an explicit 'benchmark numbers move fast, as-of-date' caveat to the whole peer table.
- Brief said EnIGMA's IATs and Summarizer were 'backported to all SWE-agent use cases.' The official docs state 'SWE-agent EnIGMA is currently only available for SWE-agent v0.7.0,' which contradicts full backporting. Reworded to: EnIGMA is a v0.7.0-only mode; its Summarizer concept influenced later context handling but the CTF-specific IATs were not universally backported.
- search_dir behavior: brief said it 'returns only filename plus match counts.' Source (tools/search/bin/search_dir) refuses/narrows when matched files > 100 and otherwise lists each matching file (filenames), per docs 'we simply list each file that had at least one match' — it does not primarily return per-file match counts. Corrected wording. The >100-file threshold itself is CONFIRMED from source ('if [ $num_files -gt 100 ]').
- 'File viewer shows exactly 100 lines per turn with 2-line overlap between scrolls': the 100-line window is confirmed by docs ('works best when displaying just 100 lines in each turn') but window/overlap are set via a runtime registry, and the windowed_file.py source shows OVERLAP defaults to 0 when unset. The specific '2-line overlap' could not be confirmed from source; downgraded from asserted fact to 'window defaults to 100 lines; overlap is configurable (blog reports 2)'.
- Ablation figure: added the precise paper number — SWE-agent solves 10.7 percentage points more than a plain-Linux-shell baseline agent on a 300-issue ablation subset (paper). The '~12% vs ~3% => ~4x' framing (from the dev.to blog) is directionally consistent but is the blog's rounding, not the paper's headline stat; both are now presented with correct attribution.
- Confirmed and de-flagged several items the brief marked uncertain: changelog dates are 2025 (v1.0.0 2025-02-13, v1.0.1 2025-02-28, v1.1.0 2025-05-22); the 8 flake8 codes INCLUDING E902 are correct (source uses flake8 --isolated --select=F821,F822,F831,E111,E112,E113,E999,E902); goto offset multiplier 1/6 confirmed in source; per_instance_cost_limit default 3.0 USD confirmed in docs; Live-SWE-agent 79.2% with Claude Opus 4.5 confirmed on the official leaderboard.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- '3.3x improvement' for EnIGMA — refuted; the real claim is '>3x' (13.5% on NYU CTF). The extra decimal is fabricated precision.
- 'Claude Opus 4.7 achieves 78.4% on SWE-bench Verified' — refuted for mid-2026; Opus 4.7 is ~87.6%. Number is stale/conflated.
- 'IATs and Summarizer backported to ALL SWE-agent use cases' — dubious; docs say EnIGMA is v0.7.0-only.
- '2-line overlap between scrolls' — unverified against source (code default OVERLAP=0; value comes from a registry). Treat as blog-derived, not primary-confirmed.
- 'search_dir returns filename plus match counts' — dubious; source/docs indicate it lists matching filenames and refuses when >100 files, not per-file counts.
- The dev.to blog's per-component ablation framing ('~12% vs ~3%, ~4x') is a secondary-source rounding; the paper's headline ablation stat is '+10.7 percentage points over a shell-only baseline on a 300-issue subset.'

**尚未解决的问题:**
- Exact default OVERLAP and WINDOW values: the 100-line window is docs-confirmed and offset_multiplier=1/6 is source-confirmed, but the '2-line overlap' is registry-driven and defaults to 0 in windowed_file.py when unset — the true configured default (and whether it is 2) was not confirmed from a primary config file.
- Attribution of Live-SWE-agent (79.2% with Claude Opus 4.5): it is published by OpenAutoCoder and builds on the SWE-agent lineage, but it is NOT a Princeton NLP release. Confirm how you want to label it in teaching material.
- Whether EnIGMA is actively maintained in mid-2026 or frozen alongside SWE-agent v0.7: only SWE-agent main is explicitly declared maintenance-only; EnIGMA's status is implied (v0.7.0-only) but not separately stated.
- Per-component ablation numbers (linter vs. windowed viewer vs. search individually): only the aggregate '+10.7 pts over shell-only baseline (300-issue subset)' is confirmed; the paper's per-feature breakdown was not re-extracted here.
- The mini-swe-agent '>74%' and 'same performance as SWE-agent' claims are from the project's own README/site; independent third-party reproduction was not verified.
- Peer benchmark scores (OpenHands ~72%, Devin 2.0 45.8%, Claude models 87-88%+) are current as of July 2026 and will drift; any published version of this brief should re-check them at publication time.

---
# SWE-agent (Princeton NLP) — Verified Source Brief

*Fact-checked July 2026. Benchmark leaderboard numbers change fast; scores below carry an as-of date.*

## What it is + who/when
SWE-agent is an open-source autonomous software-engineering agent from **Princeton University** (John Yang, Carlos E. Jimenez, Alexander Wettig, Kilian Lieret, Shunyu Yao, Karthik Narasimhan, Ofir Press). It lets a language model autonomously fix real GitHub issues, and has been extended to competitive coding and offensive-security (CTF) challenges. Paper: **"SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering," NeurIPS 2024** (arXiv **2405.15793**, first posted May 2024). https://arxiv.org/abs/2405.15793 · https://openreview.net/forum?id=mXpq6ut8J3

Its defining research contribution is the **Agent-Computer Interface (ACI)**: purpose-built shell commands and feedback formats designed for LLM consumption rather than for humans. Original headline result (GPT-4 Turbo): **12.47% pass@1 on 2,294 SWE-bench test issues** ("12.5%" in the abstract) and **87.7% on HumanEvalFix**, versus a previous non-interactive RAG best of **3.8%**. https://arxiv.org/abs/2405.15793

**Status (as of mid-2026):** SWE-agent is officially in **maintenance-only mode**, superseded by **mini-swe-agent** ("We recommend mini-swe-agent instead of SWE-agent... Same performance, much more simple & flexible"). The main codebase is at **v1.1.0 (2025-05-22)**. https://swe-agent.com/latest/

## Architecture & named components
Single-agent, single-loop system — no built-in planning or multi-agent coordination. Three tiers:

1. **Entry / configuration** — a `sweagent` CLI initializes the run. Config is a single YAML file with **Pydantic** schemas; **Jinja2** templates render prompts; model access routes through **LiteLLM** (any OpenAI-compatible API, Anthropic, local models). A **CLI trajectory inspector** was added in v1.0.0. https://swe-agent.com/latest/installation/changelog/
2. **Agent core (`Agent` class)** — runs a `forward()` loop per turn: render history → call LLM → parse (thought, action) → validate → execute. Context is managed by swappable **HistoryProcessors** (`cache_control`, `last_n_observations`, `image_observations`), not by the loop itself.
3. **Execution backend (SWE-ReX)** — a standalone sandboxed-execution package with a deployment layer (**Local, Docker, Podman, AWS Fargate, Modal, Daytona**, or remote) and a runtime layer that manages persistent shell sessions inside the container. Agent code is identical across backends. https://swe-rex.com/latest/ · https://github.com/SWE-agent/SWE-ReX

The v1.x `SWEEnv` is a thin wrapper around SWE-ReX (the heavy v0.x `SWEEnv` is gone). ACI **tool bundles** are shell scripts/binaries installed onto the container `PATH`:
- **Windowed file viewer:** `open`, `goto`, `scroll_up`, `scroll_down`, `create`. Window **defaults to ~100 lines per turn** ("works best when displaying just 100 lines"); `goto` places the target line ~**1/6 down** the window (`offset_multiplier = 1/6`, confirmed in `windowed_file.py`). Scroll overlap is configurable (registry-driven; a secondary blog reports 2 lines — not confirmed in source). https://swe-agent.com/1.0/background/aci/
- **Bounded search:** `search_dir`, `search_file`, `find_file`. `search_dir` **refuses when >100 files match** (`if [ $num_files -gt 100 ]`) and otherwise lists each matching filename, keeping output compact.
- **Edit with linting:** `edit <start>:<end> … end_of_edit`. Runs `flake8 --isolated --select=F821,F822,F831,E111,E112,E113,E999,E902` (undefined names, duplicate args, indentation, syntax, IO/tokenization). Runs on old and new versions; only **newly introduced** errors trigger an **automatic revert** (pre-existing errors are line-shifted so the model isn't blamed). https://swe-agent.com/0.7/background/aci/
- **Submit sentinel:** `submit` emits `<<SWE_AGENT_SUBMISSION>>`, which the loop detects to end the run; `git diff` becomes the patch.

**Cost control:** `per_instance_cost_limit` default **$3.00** is the primary budget knob (normalizes across models that use very different step counts). https://swe-agent.com/latest/config/models/

## How one GitHub-issue task flows through it
1. **Init** — user gives an issue URL + model via CLI. `sweagent` reads YAML, builds `Agent` + `SWEEnv`; SWE-ReX provisions a Docker image with the target repo and installs the ACI tool bundles onto `PATH`.
2. **Prompt injection** — system prompt documents the ACI commands with exact syntax/examples; the issue text is the first user message.
3. **Turn loop** — (a) HistoryProcessors compress history (drop old observations, keep last N; insert Anthropic cache breakpoints); (b) call the model → (thought, action); (c) parser extracts a single command (native function-call JSON or the first ```bash``` block); (d) validator runs `bash -n` and a blocklist (rejects `vim`, `nano`, etc.), re-prompting up to ~3×; (e) SWE-ReX executes the command in the persistent shell; a state command injects viewport state (open file, position) into the observation; cost is checked against the limit.
4. **Editing** — `edit`/`end_of_edit` triggers the flake8 subset; new errors → revert + explicit before/after error message.
5. **Submission** — `submit` → `<<SWE_AGENT_SUBMISSION>>` → loop terminates; `git diff` captured.
6. **Error handling** — cost overrun / context overflow / repeated parse failure triggers an autosubmission path: run `git diff` and submit whatever patch exists (degraded success rather than hard failure).

## Distinctive design decisions & tradeoffs
1. **ACI over raw shell** — custom LLM-friendly commands instead of a bare shell. Ablation: SWE-agent resolves **+10.7 percentage points** over a plain-Linux-shell baseline agent on a 300-issue subset (paper); i.e., interface design, not model choice, dominates. (Secondary blog framing "~12% vs ~3%, ≈4×" is directionally consistent rounding.) https://arxiv.org/abs/2405.15793
2. **Windowed viewer (~100 lines)** — forces incremental scrolling so large files don't blow the context window; `goto` gives surrounding context.
3. **Bounded search (>100-file cutoff)** — prevents context explosion from common tokens; forces query refinement.
4. **Pre-commit linting with rollback** — stops a corrupt edit from derailing all later steps; before/after display guides correction.
5. **Cost limit as primary control (not step count)** — step counts aren't comparable across model families; cost is the normalizing currency.
6. **HistoryProcessor plugin architecture** — context strategy decoupled from the loop, swappable per task type.
7. **Single command per turn** — forces an observation after every action, preventing hallucinated multi-step chains.
8. **Autosubmit on failure** — every error path yields a partial patch (may still pass some tests).
9. **SWE-ReX separation** — standalone sandbox enables massively parallel cloud evaluation and reuse by other projects.
10. **mini-swe-agent (successor) inverts the philosophy** — no custom tools, stateless `subprocess.run` per action, ~100 lines; simplicity aids fine-tuning and works with any model.

## How it differs from peers
*Benchmark numbers as of July 2026; SWE-bench Verified is a moving target.*
- **vs. raw-bash agent:** ACI's purpose-built commands beat a bare shell by ~10.7 pts on the same model — the core empirical claim.
- **vs. OpenHands (OpenDevin / CodeAct):** OpenHands executes Python directly, browses the web, richer multimodal action space, 100+ LLM backends; reaches **~72% on SWE-bench Verified** (Claude Sonnet 4.5, extended thinking). SWE-agent is narrower (shell-focused) but was the research baseline that shaped the space. https://www.marktechpost.com/2026/05/15/best-ai-agents-for-software-development-ranked-a-benchmark-driven-look-at-the-current-field/
- **vs. Devin (Cognition):** closed-source, with planning, memory, browser, IDE. **Devin 2.0 ≈ 45.8%** on SWE-bench Verified. SWE-agent is fully open and research-oriented.
- **vs. Claude Code (Anthropic):** first-party CLI, MCP tool extensibility, tightly integrated with Anthropic models. Current Anthropic models score very high on SWE-bench Verified (e.g., Claude Opus 4.7 ≈ 87.6%, Opus 4.8 ≈ 88.6% as of mid-2026 — *not* the 78.4% some older writeups cite). SWE-agent is model-agnostic and hackable. https://benchlm.ai/benchmarks/sweVerified
- **vs. Agentless:** non-agentic localize-then-patch pipeline (no interactive shell loop). SWE-agent is interactive/stateful; the paper explicitly contrasts with non-interactive RAG (3.8% prior SOTA).
- **Key differentiator:** the ACI framing — *LLMs are a new class of end user needing purpose-built interfaces* (analogous to humans needing IDEs). This idea remains influential even as raw benchmark numbers have been surpassed.
- **Modern SWE-agent-lineage result:** **Live-SWE-agent + Claude Opus 4.5 scores 79.2% on SWE-bench Verified** (self-evolving scaffold; leads open-source scaffolds). https://live-swe-agent.github.io/ *(This is from OpenAutoCoder, a research group building on the SWE-agent lineage — verify whether you want to attribute it to Princeton; it is not a Princeton NLP release.)*

## Extensions & the data flywheel
- **EnIGMA (v0.7.0 only, Sept 2024; Tel-Aviv University + NYU + Princeton):** offensive-security/CTF mode. Solves **13.5% of the 200-challenge NYU CTF test set, >3× prior agents** (arXiv **2409.16165**). Introduced **Interactive Agent Tools (IATs)** — run interactive utilities (e.g., a debugger) while keeping the main shell — and a **Summarizer** for long outputs. Note: EnIGMA is currently available only in **SWE-agent v0.7.0**; treat "backported to all use cases" as an overstatement. https://swe-agent.com/latest/background/ · https://arxiv.org/abs/2409.16165
- **mini-swe-agent (successor):** ~100 lines of Python for the agent class, **bash-only (no tool-calling interface)**, **stateless `subprocess.run` per action**, scores **>74% on SWE-bench Verified** with modern models. https://github.com/SWE-agent/mini-swe-agent
- **SWE-smith (NeurIPS 2025 D&B Spotlight, arXiv 2504.21798):** synthesizes SWE task data at scale — **~52k task instances** from 128 repos and **~26k SWE-agent trajectories**. Fine-tuning Qwen 2.5 Coder 32B on ~5k (5,016) expert trajectories yields **SWE-agent-LM-32B at 40.2% on SWE-bench Verified** (single attempt, no verifiers) — SOTA among open-weights models at release. https://arxiv.org/abs/2504.21798 · https://github.com/SWE-bench/SWE-smith

## Teaching hooks
1. **The ACI is the lesson.** Same GPT-4, +10.7 pts from the interface alone on the ablation subset. "The interface is the product."
2. **Four ACI design principles** (informative-but-concise feedback, simplicity, efficiency, error guardrails), each illustrated by a concrete failure it prevents (e.g., `cat` on a 10k-line file drowns the context).
3. **The agent loop as a REPL:** observe → think → act → observe; one command per turn makes causality explicit — great for beginners.
4. **Cost vs. steps:** the $3.00-per-instance budget teaches that step counts aren't comparable across models and normalization matters.
5. **Simplification arc:** SWE-agent → v1.0 (SWE-ReX split) → mini-swe-agent shows that ~100 lines of bash rivals the complex ACI once the base model is strong enough — scaffolding complexity has diminishing returns.
6. **Generalization proof (EnIGMA):** the same interface-design philosophy applied to CTF security (>3×) shows the idea travels beyond bug-fixing.
7. **Data flywheel (SWE-smith):** an agent framework generates its own training data (26k trajectories → a 40.2% open-weights model).

## Key source URLs
- Paper: https://arxiv.org/abs/2405.15793 · https://openreview.net/forum?id=mXpq6ut8J3
- Docs / status: https://swe-agent.com/latest/ · changelog https://swe-agent.com/latest/installation/changelog/ · ACI https://swe-agent.com/1.0/background/aci/
- SWE-ReX: https://swe-rex.com/latest/ · https://github.com/SWE-agent/SWE-ReX
- EnIGMA: https://arxiv.org/abs/2409.16165 · https://swe-agent.com/latest/background/
- mini-swe-agent: https://github.com/SWE-agent/mini-swe-agent
- SWE-smith: https://arxiv.org/abs/2504.21798 · https://github.com/SWE-bench/SWE-smith
- Live-SWE-agent: https://live-swe-agent.github.io/