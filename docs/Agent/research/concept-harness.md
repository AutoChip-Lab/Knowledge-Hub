---
key: concept-harness
name: Agent Harness 概念
category: 概念
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- OpenClaw 'six-phase control loop' (Initialization, Context Building, LLM Call, Decide, Collect Tool Result, Overflow Check) DOWNGRADED from high confidence to UNVERIFIED. Fetching the actual docs page (docs.openclaw.ai/agent-runtime-architecture) shows it describes module/file boundaries (embedded-agent-runner, sessions, agent-core, runtime facade, agent-hooks, llm provider registry) — NOT a numbered six-phase loop. Those phase names appear to have been synthesized from a search-result summary and should not be presented as documented fact.
- NLAH '~90% of token usage in tested agents flows through subagents' RE-SCOPED. The actual paper (arXiv 2603.25723, Pan et al.) attributes the ~90% figure SPECIFICALLY to the TRAE harness running under Full IHR — not a general property of all tested agents. Corrected to state the conditions.
- HarnessAudit attribution corrected. Paper title is 'Auditing Agent Harness Safety' (arXiv 2605.14271); 'HarnessAudit' is the framework/benchmark name used inside the abstract (brief's usage is fine). Lead author is Chengzhi Liu with 11 co-authors (Yichen Guo, Yepeng Liu, Yuzhe Yang, et al.), not simply 'Liu et al.'. The 'UCSB AI Group' affiliation is NOT shown on the arXiv abstract page — flagged as unconfirmed rather than asserted (a github.com/UCSB-AI/HarnessAudit repo is referenced but affiliation is unverified).
- The 'systematic analysis of 70 open-source LLM agent projects shows 60% adopt the Agent Loop pattern' (aimagicx.com) COULD NOT be independently verified — the source URL and the specific 60%/70-projects statistic do not surface in any independent source. Removed as a load-bearing citation and replaced in the differsFrom/teaching material with the independently corroborated TerminalBench 2.0 example (changing only the harness moved DeepAgent-from-LangChain from outside the top-30 to the top-5), which appears across multiple 2026 sources.
- Strengthened the 'harness matters more than model' claim by adding the verified position paper 'Stop Comparing LLM Agents Without Disclosing the Harness' (arXiv 2605.23950, Zhang et al., Tulane/Rutgers/Virginia Tech) and its 'Binding Constraint Thesis' as a primary academic anchor, rather than relying on marketing blogs.
- CAAF uncertainty resolved: arXiv 2604.17025 confirmed to exist as 'Harness as an Asset: Enforcing Determinism via the Convergent AI Agent Framework (CAAF)'. Noted its existence; detailed taxonomy still not extracted, so kept out of load-bearing claims.
- Confirmed OpenClaw is a REAL open-source agent system, not a fabricated/conflated product: the Claude Code paper (2604.14228) explicitly names OpenClaw and Hermes Agent as the two independent open-source systems it compares against, and OpenClaw's official docs exist.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED as documented fact: OpenClaw's 'six-phase control loop' with the named phases Initialization → Context Building → LLM Call → Decide → Collect Tool Result → Overflow Check. Not present in the official docs, which instead describe module boundaries. The general idea (embedded attempt loop + compaction + overflow safeguards) is real, but the six named phases are not.
- DUBIOUS: 'A systematic analysis of 70 open-source LLM agent projects shows 60% adopt the Agent Loop pattern' (aimagicx.com). Neither the source page nor the statistic is independently verifiable. Treat as unsourced.
- OVER-GENERALIZED (now corrected): NLAH '~90% of tokens flow through subagents' is NOT a universal finding; it is specific to the TRAE harness under Full IHR configuration.
- PARTIALLY UNVERIFIED bundle: LLMLingua 20x compression is confirmed real (Microsoft Research, EMNLP'23, up to 20x with ~1.5% loss). But the two figures bundled with it — 'prompt caching yields 84% token reduction on long-horizon tasks' and 'parallel tool calling reduces latency 20-40%' — come only from the community awesome-harness-engineering list and are NOT independently verified; keep at low/med confidence.
- UNCONFIRMED: 'UCSB AI Group' as the affiliation for the HarnessAudit paper — not shown on arXiv abstract.
- SOFT/OPINION: 'harness engineering is replacing prompt engineering' is a widely-repeated 2026 framing (Data Science Dojo, Drata, Addy Osmani, MongoDB, HuggingFace) and directionally well-supported, but remains a framing/narrative rather than a measured fact — present it as the field's consensus framing, not a proven law.

**尚未解决的问题:**
- OpenClaw's actual runtime control-loop phasing: the official docs describe module boundaries (embedded-agent-runner, agent-hooks, etc.) but do not publish a numbered phase list. What is the real per-turn phase sequence, and is the 'six-phase' description sourced from anywhere authoritative?
- Institutional affiliation of the HarnessAudit / 'Auditing Agent Harness Safety' authors (Chengzhi Liu et al.) — is it actually UCSB? Not shown on the arXiv abstract; the github.com/UCSB-AI/HarnessAudit repo suggests it but is unconfirmed.
- Methodology behind the 1.6% / 98.4% Claude Code code-split — the paper attributes it to 'community analysis of the extracted source' but does not document how the split was computed (LOC? files? which extraction?).
- Whether prompt caching '84% token reduction' and parallel tool calling '20-40% latency reduction' have primary sources — currently only the community awesome-harness-engineering list; not independently verified.
- Whether the crisp scaffold-vs-harness boundary (behavior vs execution) is genuinely converging as field consensus or remains a HuggingFace/OpenDev definitional preference that most practitioners still use interchangeably.
- CAAF (arXiv 2604.17025, 'Harness as an Asset: Convergent AI Agent Framework') — confirmed to exist, but its detailed component taxonomy and determinism-enforcement mechanism were not extracted and should be read directly before citing specifics.
- Exact token budgets of Claude Code's two-stage auto-mode ML classifier (the brief's '64-token fast pass / up to 4,096-token reasoning pass') were not re-confirmed verbatim; treat those specific numbers as unverified.

---
# Agent Harness (智能体线束 / 执行外壳) — Verified Source Brief

*Fact-checked July 2026. Confidence levels and source URLs are inline. Claims I could not independently verify are marked and collected under "Remaining uncertainties."*

## 1. What it is + who/when

An **agent harness** is the runtime execution layer that wraps an LLM API and turns a stateless text-completion model into an autonomous, action-taking agent. It is everything that is **not the model**: the agent loop, tool dispatch, context management, permission/approval system, session state, subagent coordination, extensibility hooks, and the user interface.

The community's canonical framing is:

> **Agent = Model + Harness + Scaffolding**

This mental model was formalized by the **Hugging Face glossary "Harness, Scaffold, and the AI Agent Terms Worth Getting Right"** (Sergio Paniego & Andrés Marafioti/Aritra Roy Gosthipaty, **May 25 2026**, https://huggingface.co/blog/agent-glossary):
- **Model** — the LLM (text in, text out). No memory between calls, no loop. It can *express intent* to call a tool but cannot execute it.
- **Harness** — the *execution* layer: calls the model, handles tool calls, decides when to stop. "The harness is what makes the agent run."
- **Scaffolding** — the *behavior-defining* layer: system prompt, tool descriptions, response parsing, context/memory policy.

HuggingFace notes that scaffold-only improvements have yielded **~10–20 point gains on SWE-bench Verified with no change to model weights** — a headline motivation for the whole discipline. (verified via search + glossary; **high**)

The term **"harness" overtook "scaffold"** in 2025–2026 industry usage. A commonly-cited rationale: "scaffold" connotes a *temporary* structure that comes down as models improve, while "harness" connotes *persistent, necessary* infrastructure. This is a terminology narrative, widely repeated but not a measured fact. (**med**)

**Why it matters** — the "ratio shock": community analysis of Claude Code's extracted source estimates that **~1.6% of the codebase is AI decision logic and ~98.4% is operational infrastructure (the harness)** — verified verbatim in arXiv 2604.14228 §3.1, which itself attributes the figure to "community analysis of the extracted source" (methodology not fully documented). Treat the *number* as an illustrative community estimate, not a rigorous measurement. (https://arxiv.org/abs/2604.14228; **med** on the number, **high** that the paper states it)

## 2. Architecture & named components

The most-cited reference decomposition is the **7-layer stack** from *"Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems"* (Jiacheng Liu, Xiaohan Zhao, Xinyi Shang, Zhiqiang Shen; **VILA-Lab**, arXiv **2604.14228**, Apr 2026; the paper explicitly compares Claude Code against two independent open-source systems, **OpenClaw** and **Hermes Agent**):

1. **User** — submits prompts, approves permissions, reviews output
2. **Interfaces** — CLI, headless, Agent SDK, IDE/browser (all feed the same loop)
3. **Agent loop** — a simple `while`-loop / async generator: assemble context → call model → parse → if `tool_use`: permission check → dispatch → collect result → repeat; terminates on final text (no tool call) or a safety cap
4. **Permission system** — deny-first rule evaluation, **seven modes** + an **ML classifier** for ambiguous cases
5. **Tools** — built-in registry (file ops, shell, web, LSP, subagent spawning, MCP) + dynamically discovered MCP tools
6. **State & persistence** — append-only transcripts, `CLAUDE.md`/`AGENTS.md` hierarchy, session checkpoints, subagent sidechains
7. **Execution environment** — shell, filesystem, MCP connections, sandbox

(All four load-bearing specifics — 7 permission modes, ML classifier, 5-layer compaction, 4 extensibility mechanisms — verified verbatim in the paper. **high**)

**Cross-harness component reference (all verified):**

| Component | Where it appears |
|---|---|
| **5-stage compaction pipeline** — `budget reduction → snip → microcompact → context collapse → auto-compact` (cheapest-first) | Claude Code / 2604.14228 §4.3 (verbatim). **high** |
| **7 permission modes** — `plan, default, acceptEdits, auto (ML classifier), dontAsk, bypassPermissions, bubble` (subagent escalation, internal-only) | Claude Code / 2604.14228 §5.1 (verbatim; 5 are in the `EXTERNAL_PERMISSION_MODES` array). **high** |
| **5-layer safety architecture** — Prompt Guardrails → Schema Restrictions (plan-mode whitelist, per-subagent `allowed_tools`, MCP gating) → Runtime Approval (Manual/Semi-Auto/Auto) → Tool Validation (`DANGEROUS_PATTERNS` blocklist, stale-read detection, timeouts) → Lifecycle Hooks (pre-tool blocking via exit code 2) | OpenDev / arXiv 2603.05344 Fig. 3 (verbatim). **high** |
| **6 harness subsystems** — State & Persistence, Security & Governance, Orchestration & Tool Use, Memory, Observability, Evals | MongoDB (Bazeley/Kumar/Xu, May 11 2026). **high** |

**Named academic systems (all confirmed real):**
- **OpenDev** — arXiv 2603.05344, *"Building AI Coding Agents for the Terminal: Scaffolding, Harness, Context Engineering, and Lessons Learned."* 4-layer vertical decomposition; single `MainAgent` class; **5 specialized model roles**. **high**
- **OpenClaw** — real open-source agent system with official docs (docs.openclaw.ai) and an `AgentHarness` plugin SDK. Its harness plugin interface requires `supports(ctx)` and `runAttempt(params)`; optional lifecycle methods include `reset()`, `runAgentEndSideEffects()`, `classifyAgentHarnessTerminalOutcome()` (verified against docs.openclaw.ai/plugins/sdk-agent-harness). ⚠️ Its docs describe module boundaries, **not** the "six-phase control loop" the original brief claimed — see corrections. **high** on the SDK interface, **refuted** on the six-phase loop.

## 3. How one task flows through the harness (step-by-step)

*Synthesized from arXiv 2603.05344 (OpenDev), 2604.14228 (Claude Code), and OpenClaw docs.*

**Pre-conversation (Scaffold phase):**
1. Agent factory runs skill discovery, subagent registration, and main-agent init.
2. Prompt composer assembles the system prompt from priority-ordered conditional sections (identity, tool guidance, permission policy, context directives). OpenDev builds this **eagerly at construction time** to avoid first-call latency/races.
3. Tool registry builds LLM-facing schemas; subagents receive **filtered** schemas per their `allowed_tools`.
4. Session state loads from persistent storage (prior transcript, `CLAUDE.md`/`AGENTS.md`, project memory).

**Runtime (Harness loop, per turn):**
5. **Pre-check:** assess token budget; if near limit, run compaction shapers cheapest-first (`budget reduction → snip → microcompact → context collapse → auto-compact`).
6. **Optional thinking** phase at configurable depth.
7. **Action:** full LLM call with assembled context + tool schemas → model returns text or `tool_use` blocks.
8. **If `tool_use`:** deny-first permission check (ML classifier for ambiguous cases in Claude Code's `auto` mode) → if approved, dispatch to registry handler.
9. **Execute:** handler runs (shell / file edit / web fetch); output collected and **bounded** (truncation, disk-spill for large outputs).
10. Result appended to history → return to step 5.
11. **Terminate:** final text without tool calls, OR safety cap (iteration/token limit or explicit completion tool).
12. **Post-process:** lifecycle hooks fire, session state persists, cost metadata recorded.

**Multi-agent variant:** an orchestrator spawns subagents with filtered schemas and subagent-specific prompts; each runs its own inner loop and returns results. The NLAH paper (arXiv 2603.25723) reports that in one measured configuration (**the TRAE harness under Full IHR**) **~90% of token/call volume flows through delegated child agents** — a config-specific figure, not a universal law. **high** (as scoped)

## 4. Distinctive design decisions & tradeoffs

1. **Single concrete agent class (OpenDev).** No planner/coder/researcher class hierarchy — one `MainAgent`; behavior varies purely by construction params (`allowed_tools`, prompt overrides). Kills diamond-inheritance/class-explosion problems. (verbatim, 2603.05344; **high**)
2. **Eager scaffold construction (OpenDev).** Build system prompt + tool schemas at constructor time to remove first-call latency and MCP-discovery races. (**high**)
3. **Subagent-based planning vs. state machine (OpenDev).** Instead of a brittle enter/exit "plan mode" state machine, delegate planning to a **Planner subagent whose schema contains only read-only tools** — writes are *architecturally impossible* because the model never sees write-tool definitions. Enforcement moves from runtime checks to the schema level. (**high**)
4. **Deny-first permissions (Claude Code, OpenDev).** Default deny; rules explicitly *allow*. Claude Code's `auto`-mode ML classifier uses two-stage evaluation (fast pass → longer reasoning pass) and deliberately excludes prose to resist prompt injection. (**high** on deny-first + ML classifier existence; exact token budgets of the two passes = **low**, not re-confirmed verbatim)
5. **Multi-strategy compaction (Claude Code).** Five strategies cheapest-first rather than single-pass truncation — treats context as a managed scarce resource. (**high**)
6. **Lazy MCP tool discovery.** Load external tools on demand via keyword-scored search rather than eagerly at startup — lowers baseline prompt overhead. (**high**)
7. **Multi-role model routing (OpenDev: 5 roles).** Separate models for normal execution, thinking, critique, VLM, and compaction — per-workflow cost/latency/capability optimization. (**high**)
8. **Natural-language harness externalization (NLAH, 2603.25723).** Express harness control logic as portable, inspectable natural-language artifacts interpreted by an Intelligent Harness Runtime — enabling comparability, portability, ablation. (**high**)
9. **Harness as safety upper bound (HarnessAudit, 2605.14271).** "Harness design sets the upper bound of safe deployment" — the harness, not the model, sets the ceiling on enforceable safety, because violations occur *mid-trajectory*, not at terminal output. (verbatim; **high**)

## 5. How it differs from peers

- **vs. raw LLM API call:** raw calls are stateless, single-turn, no tool execution. The harness adds the loop, state, tool execution, and safety enforcement. The model never touches the filesystem/shell directly — only via the structured `tool_use` protocol the harness controls. (2604.14228; **high**)
- **vs. prompt engineering:** prompt engineering is static text optimization; harness engineering is dynamic runtime-infrastructure design. The "prompt → context → harness engineering" progression is the widely-repeated 2026 framing (HuggingFace, MongoDB, Data Science Dojo, Drata, Addy Osmani). Treat as **field consensus framing**, not a proven law. (**med**)
- **vs. agent frameworks (LangChain, LlamaIndex):** these are SDK-level building blocks; a harness is a complete production system integrating those blocks with safety, permissions, persistence, observability, and multi-agent coordination. Frameworks are *inputs* to harness construction.
- **vs. eval harnesses (e.g., EleutherAI lm-evaluation-harness):** an eval harness runs fixed scenarios and records metrics; it does not orchestrate live tool execution or manage production sessions. **Term collision** is a documented source of confusion (HuggingFace glossary). (**high**)
- **Scaffold vs. harness:** scaffold = behavior definition (prompt, tool descriptions, context policy); harness = execution (calls model, routes tools, stops). OpenDev states it cleanly: "Where scaffolding is concerned with constructing the agent *before* the first prompt, the harness is concerned with everything that happens *after*." Note: many blogs/papers use the two terms interchangeably; the crisp split is not universally observed. (**high** that the crisp definition exists; **med** that it's universal)
- **Across real harnesses:** OpenClaw exposes a pluggable `AgentHarness` SDK and a Gateway that manages channel delivery/tool approval/session files (harness = the low-level per-turn executor); Claude Code has the most documented permission system (7 modes + ML classifier + 5-layer compaction). The **harness-choice performance spread** (below) shows this is not cosmetic.

**The empirical "harness > model" evidence (all verified):**
- **Claw-SWE-Bench** (arXiv 2606.12344, Zheng et al., 350 issues / 8 languages / 43 repos): on **Qwen 3.6-flash**, five harnesses spread from **38.6% (GenericAgent) to 66.0% (OpenClaw) Pass@1 — a 27.4 pp gap** from harness choice alone, comparable to a model-tier jump. And with a fixed **GLM 5.1** backbone, a **bare adapter scores 19.1% Pass@1 (67/350, ~69.1% patch-apply failures)** vs a **full adapter at 73.4% (257/350, <1.5% apply failures)**. (**high**)
- **"Stop Comparing LLM Agents Without Disclosing the Harness"** (arXiv 2605.23950, Zhang et al., Tulane/Rutgers/Virginia Tech): formalizes the **"Binding Constraint Thesis"** — for frontier-comparable models on long-horizon tasks, harness variance can exceed model variance, including *model-ranking reversals*; leaderboards that don't disclose the harness are "incomplete and potentially misleading." (**high**)
- **TerminalBench 2.0** (widely reported, 2026): swapping only the harness moved DeepAgent-from-LangChain from outside the top-30 to the top-5 — an independently-corroborated replacement for the unverifiable "60% of 70 projects" statistic. (**med**)

## 6. Teaching hooks

1. **The ratio shock.** Open with ~1.6% AI logic vs ~98.4% infrastructure (2604.14228). Most engineers assume the LLM *is* the agent; flipping that expectation earns instant engagement — then explain what the 98.4% actually does. (Present the number as a community estimate.)
2. **The formula, drawn as three boxes.** `Agent = Model + Harness + Scaffolding` (HuggingFace). The model is stateless with no loop; only the harness gives it real-world effects.
3. **A concrete lifecycle.** Trace one file-edit request: prompt assembly → loop start → `tool_use` block → deny-first permission check (7 modes) → dispatch to write handler → result appended → loop. Engineers reason in code flows.
4. **The benchmark proof.** Claw-SWE-Bench's 27.4 pp harness spread on the *same* model (and 19.1% → 73.4% on GLM 5.1) makes "harness matters more than model" citable, not hand-wavy. Pair it with the Binding Constraint Thesis paper.
5. **Safety is trajectory-level.** HarnessAudit shows a harness can return a *correct final answer while violating permissions mid-trajectory* — output-only evaluation is blind to this. Non-obvious and important for anyone building on top of agents.
6. **Context is the binding constraint.** The 5-stage compaction pipeline (`budget reduction → snip → microcompact → context collapse → auto-compact`) teaches why production harnesses treat the context window as a *managed scarce resource*, not a bottomless buffer.
7. **Permission design as safety-meets-UX.** Deny-first rules, graduated trust modes, ML classifiers for ambiguity, and persistent caching to prevent "approval fatigue" are directly reusable patterns. Schema-level write-blocking for planner subagents (OpenDev) is the cleanest illustration of *enforcing safety at the schema layer instead of at runtime*.

---

### Key source URLs
- HuggingFace glossary — https://huggingface.co/blog/agent-glossary
- Anthropic, *Effective harnesses for long-running agents* (Nov 26 2025) — https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- *Dive into Claude Code* (2604.14228) — https://arxiv.org/abs/2604.14228
- OpenDev (2603.05344) — https://arxiv.org/html/2603.05344v1
- Natural-Language Agent Harnesses (2603.25723) — https://arxiv.org/abs/2603.25723
- HarnessAudit / *Auditing Agent Harness Safety* (2605.14271) — https://arxiv.org/abs/2605.14271
- Claw-SWE-Bench (2606.12344) — https://arxiv.org/abs/2606.12344
- *Stop Comparing LLM Agents Without Disclosing the Harness* (2605.23950) — https://arxiv.org/abs/2605.23950
- MongoDB, *The Agent Harness* — https://medium.com/@MongoDB/the-agent-harness-why-the-llm-is-the-smallest-part-of-your-agent-system-bce68414ccfd
- OpenClaw agent-harness SDK — https://docs.openclaw.ai/plugins/sdk-agent-harness
- LLMLingua (Microsoft) — https://github.com/microsoft/LLMLingua