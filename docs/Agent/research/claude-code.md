---
key: claude-code
name: Claude Code (Anthropic)
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- TOOL COUNT: Brief claimed 'the tool table lists 43 named built-in tools.' The current official tools-reference table (verified July 2026) lists 42 named tools -- and the 42 names the brief enumerated are exactly the ones present (Agent through Write). No tool name was fabricated. The '54 built-in tools (19 unconditional, 35 conditional)' figure in the arXiv paper counts internal/feature-gated tool implementations, not the public docs table. Corrected count to 42 (docs table) and clarified the 54 figure's meaning.
- HOOK EVENT COUNT: Brief claimed 'exactly 27 lifecycle event types across 6 categories' (citing the docs). The arXiv paper says 27, but the current official hooks doc lists ~31 event types -- it adds UserPromptExpansion and Setup among others. Corrected to '~31 in current docs (27 per the arXiv source-code analysis); the set is versioned and has grown.' Also removed the false precision of 'exactly.'
- SWE-BENCH SCORE: Brief cited '80.8% SWE-bench Verified for Claude Code.' This is stale/misattributed -- as of July 2026 secondary benchmark aggregators report Opus 4.8 ~88.6% and Sonnet 5 ~85.2% SWE-bench Verified. Downgraded and reframed as a model-level (not agent-level) benchmark with no confirmed official 'Claude Code' agent-harness number.
- NPM INSTALL: Brief listed 'npm install -g @anthropic-ai/claude-code' as a co-equal install method. The npm package was deprecated (as of ~v2.1.15, January 2026) in favor of the native installer. Corrected to note native install (curl script), Homebrew, and WinGet as current methods, with npm deprecated.
- DEFAULT MODEL: Brief listed the 'Sonnet 5 default / 1M-token context' as med/low confidence secondary claim. Verified: Claude Sonnet 5 (released ~June 30, 2026) is the confirmed new default on Free/Pro; Opus 4.8 is the flagship for Max/Team/Enterprise; 1M-token context ships on Opus flagships and Sonnet 5. Upgraded confidence and corrected attribution (this is model-config, not the Agent SDK overview).
- SDK BACKEND PROVIDER NAMES: Refined to the exact current names/env vars from the SDK docs: Amazon Bedrock (CLAUDE_CODE_USE_BEDROCK), Claude Platform on AWS (CLAUDE_CODE_USE_ANTHROPIC_AWS), Google Cloud's Agent Platform / Vertex (CLAUDE_CODE_USE_VERTEX), Microsoft Azure / Foundry (CLAUDE_CODE_USE_FOUNDRY). The brief's naming was close but imprecise.
- AGENT-LOOP FRAMING: Brief presents the loop as a 'ReAct-pattern while-loop (queryLoop in query.ts)' sourced to the docs. That naming comes from the arXiv source-code analysis, not the official docs -- the official docs describe it as three phases (gather context, take action, verify results). Re-attributed the internal-symbol naming to the arXiv paper and kept the docs' phase framing as the primary description.
- WORK-MODE STAT: Brief's '56% building/fixing/testing' is correct but is a sum (building 25% + fixing 26% + testing/orchestrating 5%). Noted the breakdown for accuracy.
- SUCCESS-RATE STAT: Brief's '~33% expert vs ~15% novice' -- the source states 15% for novice and 28-33% for intermediate/expert (33% is the top of the expert band, not a clean expert-vs-novice pair). Clarified the range.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- 'SWE-bench Verified 80.8% for Claude Code' -- DUBIOUS/STALE. No official Anthropic primary source ties this exact number to the Claude Code agent harness with a model/date. Current model-level figures (Opus 4.8 ~88.6%, Sonnet 5 ~85.2%) come from third-party benchmark aggregators (morphllm.com), not an Anthropic primary page. Treat any single SWE-bench number as model- and date-specific, not a stable 'Claude Code' property.
- 'Exactly 27 hook lifecycle event types' -- REFUTED as of July 2026 docs, which enumerate ~31 events. 27 was accurate at the time of the arXiv paper; the count is version-dependent and has grown.
- '43 named built-in tools' -- CORRECTED to 42 in the current docs table. Not a fabrication of names, just an off-by-one count; the tool set is also feature-gated and version-dependent, so any fixed count is a snapshot.
- 'npm install -g @anthropic-ai/claude-code' as a current recommended install path -- DEPRECATED (~Jan 2026). Still technically resolvable on npm but no longer the recommended method.
- Workplace-adoption percentages (18% Claude Code / 29% Copilot / 18% Cursor) -- UNVERIFIED. Sourced only to third-party comparison blogs (cosmicjs, nxcode) with unknown methodology; no citable primary survey. Kept only as rough, caveated illustration.
- 'Auto mode ML classifier' internal mechanics -- UNDISCLOSED. Confirmed it exists and is a research preview, but false-positive/negative rates and model details are not public. Any specific description of how it decides is speculative.

**尚未解决的问题:**
- Is there an OFFICIAL Anthropic-published SWE-bench Verified number specifically for the Claude Code agent harness (vs. bare-model scores)? Current numbers (Opus 4.8 ~88.6%, Sonnet 5 ~85.2%) come from third-party aggregators, not an Anthropic primary page.
- Exact current count of built-in tools and hook events fluctuates with CLI version (2.1.x ships frequently). The 42-tools / ~31-hook-events figures are a July 2026 snapshot; a teaching writer should re-check against the live docs at publish time.
- The '~1.6% AI / ~98.4% infrastructure' split is a community source-code estimate reported by the arXiv paper, not an official Anthropic figure -- its precision should not be over-stated.
- Auto-mode classifier internals (how it decides, false-positive/negative behavior) remain undisclosed publicly; it is labeled a research preview.
- Workplace-adoption percentages for Claude Code vs Copilot vs Cursor lack a citable primary survey; the third-party blog numbers should be treated as illustrative only.
- The exact GA scope on May 22, 2025 (which surfaces/plans were 'generally available' that day vs. rolled out later) is asserted by secondary timelines; an Anthropic primary changelog entry would firm this up.

---
## Claude Code (Anthropic) — Verified Source Brief (as of July 2026)

### What it is + who/when
Claude Code is Anthropic's official **agentic coding tool** — an AI harness that reads a codebase, edits files, runs shell commands, uses git, searches/fetches the web, spawns subagents, and connects to external services, all driven by natural language ([overview](https://code.claude.com/docs/en/overview)). It ships across many surfaces that all share one engine: **terminal CLI**, **VS Code / Cursor extension**, **JetBrains plugin**, **standalone Desktop app**, **browser at claude.ai/code**, plus Slack, GitHub Actions / GitLab CI, and a programmable **Agent SDK** (Python + TypeScript).

- **Launched as a limited research preview on February 24, 2025**, alongside Claude 3.7 Sonnet ([Anthropic announcement](https://www.anthropic.com/news/claude-3-7-sonnet)).
- **Reached general availability May 22, 2025**, with Claude Opus 4 and Claude Sonnet 4.
- As of July 2026 it is under active, frequently-versioned development (CLI in the 2.1.x series). The **npm package `@anthropic-ai/claude-code` was deprecated (~v2.1.15, Jan 2026)** in favor of a native installer.

**Install (current):** native script `curl -fsSL https://claude.ai/install.sh | bash` (auto-updates), Homebrew `brew install --cask claude-code`, or WinGet `winget install Anthropic.ClaudeCode`. npm still resolves but is deprecated ([overview/setup](https://code.claude.com/docs/en/overview)).

**Models (July 2026):** **Claude Sonnet 5** (released ~June 30, 2026) is the new default on Free/Pro; **Opus 4.8** is the flagship for Max/Team/Enterprise. 1M-token context ships on the Opus flagships and Sonnet 5 ([model config](https://code.claude.com/docs/en/model-config)). Switch mid-session with `/model`.

### Architecture & named components
A useful mental model (synthesized from the official docs plus the source-code analysis in the [VILA-Lab arXiv paper 2604.14228](https://arxiv.org/abs/2604.14228)) is five layers around one small loop:

1. **Surface layer** — terminal CLI (interactive + headless `-p`), Agent SDK, IDE extensions, Desktop app, web, Slack, CI. All converge on the same core loop.
2. **Core loop** — an iterative agent loop the docs describe as three blended phases (**gather context → take action → verify results**), repeating until done. The arXiv source analysis names the implementation the `queryLoop()` async generator in `query.ts`, characterizing it as a ReAct-style while-loop that streams events.
3. **Safety / action layer** — permission system, **~42 built-in tools** (a mix of unconditional and feature-gated), hook pipeline, MCP client, checkpoints, subagent spawning.
4. **State layer** — CLAUDE.md hierarchy, auto-memory (MEMORY.md), JSONL session transcripts, subagent sidechain transcripts, per-edit file snapshots.
5. **Backend layer** — shell execution (Bash/PowerShell), MCP servers, Anthropic-managed cloud VMs (Routines, web sessions), and third-party model backends.

**Key named components (verified):**
- **Built-in tool set — 42 named tools** in the current [tools-reference](https://code.claude.com/docs/en/tools-reference) table: Agent, Artifact, AskUserQuestion, Bash, CronCreate/Delete/List, Edit, EnterPlanMode, EnterWorktree, ExitPlanMode, ExitWorktree, Glob, Grep, ListMcpResourcesTool, LSP, Monitor, NotebookEdit, PowerShell, PushNotification, Read, ReadMcpResourceTool, RemoteTrigger, ReportFindings, ScheduleWakeup, SendMessage, SendUserFile, ShareOnboardingGuide, Skill, TaskCreate/Get/List/Update, TaskOutput (deprecated), TaskStop, TodoWrite (disabled by default since v2.1.142), ToolSearch, WaitForMcpServers, WebFetch, WebSearch, Workflow, Write. (The arXiv paper's "up to 54 tools, 19 unconditional / 35 conditional" counts internal feature-gated implementations, not the public docs table.)
- **Bash tool limits (confirmed exactly):** 2-minute default timeout, configurable up to 10 minutes; output capped at 30,000 chars by default, hard ceiling 150,000 via `BASH_MAX_OUTPUT_LENGTH`.
- **Permission system — 7 modes** per the arXiv type analysis (`plan, default, acceptEdits, auto, dontAsk, bypassPermissions`, plus internal `bubble` for subagents). In the CLI, **Shift+Tab cycles 4 modes**: Default → Auto-accept edits → Plan mode → **Auto mode** (a research-preview classifier) ([how-it-works](https://code.claude.com/docs/en/how-claude-code-works)).
- **Hook system — ~31 lifecycle event types** in current docs (the arXiv paper counted 27; the set is versioned and has grown, adding e.g. `UserPromptExpansion`, `Setup`). Hooks have **5 implementation types**: `command`, `http`, `mcp_tool`, `prompt`, `agent` ([hooks](https://code.claude.com/docs/en/hooks)).
- **Context compaction — a 5-stage pipeline** run before model calls: **Budget Reduction → Snip → Microcompact → Context Collapse → Auto-Compact** (arXiv). Docs confirm the behavior: clear older tool outputs first, then summarize.
- **CLAUDE.md** — project instructions read every session; nested subdirectory files are lazy-loaded when Claude touches those files.
- **Auto-memory (MEMORY.md)** — agent-written learnings; the **first 200 lines or 25KB (whichever comes first)** load at session start ([how-it-works](https://code.claude.com/docs/en/how-claude-code-works)).
- **Sessions** — conversation written to **JSONL files under `~/.claude/projects/`** (docs call them plaintext JSONL; the arXiv paper emphasizes their append-only nature), enabling resume/fork/rewind. Every edit is snapshotted (Esc-twice to rewind).
- **Subagents (Agent tool)** — run in a **fresh, isolated context window** with their own sidechain transcript; only a **text summary returns to the parent**.
- **MCP client** — connects external tools/data (stdio, SSE, HTTP). **MCP tool definitions are deferred by default and loaded on demand via `ToolSearch`** to save context.
- **Agent SDK** — Python `claude-agent-sdk` (`pip install`) and TypeScript `@anthropic-ai/claude-agent-sdk` (`npm install`); renamed from "Claude Code SDK" in September 2025 to signal use beyond coding. Supports third-party backends via env vars: **Amazon Bedrock** (`CLAUDE_CODE_USE_BEDROCK`), **Claude Platform on AWS** (`CLAUDE_CODE_USE_ANTHROPIC_AWS`), **Google Cloud's Agent Platform / Vertex** (`CLAUDE_CODE_USE_VERTEX`), **Microsoft Azure / Foundry** (`CLAUDE_CODE_USE_FOUNDRY`) ([SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)).
- **Managed Agents** — a hosted REST API where Anthropic runs the loop + sandbox (distinct from the in-process SDK).

### How one task flows through it (e.g., "fix the failing tests")
1. **Prompt submit** — user types the prompt; the `UserPromptSubmit` hook can block or inject context.
2. **Context assembly** — system prompt + CLAUDE.md (root + lazy subdir) + auto-memory + loaded skill descriptions + session history are assembled. If context is tight, the 5-stage compaction pipeline runs (cheap → expensive).
3. **Model call** — context goes to the model (Sonnet/Opus); it emits text + `tool_use` blocks, streamed as events.
4. **Permission gate** — each tool call is checked deny-first, then against the active mode, then the auto-mode classifier if enabled. Allowed calls fire `PreToolUse` (can block/modify).
5. **Tool execution** — e.g., Bash runs `npm test` (output capped 30k chars); `PostToolUse` fires; the result is appended as `tool_result`.
6. **Loop** — the model reads test failures, Greps for source, Reads files, Edits a fix, re-runs tests, and (if asked) commits via git — chaining dozens of steps and course-correcting.
7. **Stop** — when the model judges the task done, the `Stop` hook can veto stopping; the final text is shown.
- **Interruption:** Esc cancels the running tool; typing a correction is read at the next step boundary. **Subagent delegation:** the Agent tool spawns an isolated agent that returns only a summary.

### Distinctive design decisions & tradeoffs
1. **Minimal loop, maximal harness.** The agent loop is deliberately simple; most engineering lives in deterministic infrastructure (permissions, compaction, session storage, hooks). The arXiv paper's headline estimate: **~1.6% of the codebase is AI decision logic, ~98.4% is operational infrastructure** (a community source-code estimate — directional, not an official Anthropic metric).
2. **Deny-first permissions + approval fatigue.** Rules deny by default. Anthropic's auto-mode analysis found users **approve ~93% of permission prompts**, implying interactive approval alone is unreliable — motivating the **auto-mode classifier** as a middle ground (research preview; internals undisclosed).
3. **Append-only JSONL sessions.** Sequential, never mutated — enables audit, resume, fork, rewind; tradeoff is no rich query over history.
4. **Lazy context loading.** Subdirectory CLAUDE.md and MCP tool schemas load only on demand, because the context window is the binding constraint.
5. **Subagent isolation.** Separate context + transcript, summary-only return — keeps exploratory reads/failed attempts out of the parent context and forms a clean trust boundary.
6. **Five-stage, lazy compaction.** Each stage runs only if the prior one didn't free enough space; model-generated summaries (Auto-Compact) are last resort because they're lossy and costly.
7. **Hooks as first-class policy.** ~31 events × 5 hook types let orgs enforce security/quality/audit without forking.
8. **Unix-philosophy CLI.** Composable: stdin piping, headless `-p`, CI integration.

### How it differs from peers
- **vs GitHub Copilot** — Copilot is primarily IDE-native autocomplete/chat; Claude Code is a terminal-native autonomous agent that works across whole codebases with real shell/git/web execution, subagents, and a hook system Copilot lacks.
- **vs Cursor** — Cursor is an AI-native IDE (VS Code fork) with the deepest inline-diff/visual editing; Claude Code rewards terminal fluency and long multi-step autonomy. Common pattern: Cursor for daily editing, Claude Code for complex autonomous tasks.
- **vs Devin (Cognition)** — Devin is a hosted cloud-sandbox agent (VM per task); Claude Code runs locally (optionally cloud) with direct filesystem access, exposes all intermediate steps, and allows human interruption at any point.
- **vs OpenAI Codex CLI** — both are terminal agents; Claude Code has a more mature permission model, explicit CLAUDE.md memory, a large hook system, subagents, and a large context window.
- **vs the Anthropic Client SDK / Messages API** — the Client SDK gives raw API access and you write the tool loop yourself; the Agent SDK / Claude Code runs the loop, tools, context management, permissions, and session storage for you.

### Teaching hooks (pedagogically interesting)
1. **The ~98.4% rule.** Most of Claude Code is *not* the model — it's harness (permissions, compaction, storage, hooks). Great counter-intuitive opener: reliability and safety come from deterministic infrastructure, not raw model capability. (Cite as a community estimate.)
2. **The agentic loop as a simple loop.** "Gather context → act → verify → repeat." Sophisticated behavior (planning, debugging, multi-file edits) *emerges* from a simple loop plus careful harness design — a clean demystification of "agents."
3. **Context window as the binding resource.** Lazy CLAUDE.md, deferred MCP tools, subagent isolation, and 5-stage compaction are all explained by one constraint. Teach the compaction stages as cheap → destructive.
4. **Permission modes as a trust spectrum.** Plan → default → acceptEdits → auto → dontAsk → bypassPermissions is a slider from human-in-the-loop to full autonomy. The 93%-approval stat is a memorable hook: rubber-stamped prompts are "security theater," hence the classifier.
5. **Subagents as context isolation, not just parallelism.** Key insight: a *fresh* context window. Example: "search the codebase" spawns a subagent that reads 50 files and returns a 200-word summary — the parent context stays clean.
6. **Hooks as agent policy enforcement.** ~31 events × 5 types (command/http/mcp_tool/prompt/agent) span simple scripts to intelligent verification subagents — where orgs encode security, quality gates, and audit.
7. **Three-tier memory model.** CLAUDE.md (human-written, durable) → auto-memory / MEMORY.md (agent-written, semi-stable, first 200 lines/25KB loaded) → conversation history (ephemeral, lost to compaction).

### Selected usage research ([Anthropic, "Claude Code expertise"](https://www.anthropic.com/research/claude-code-expertise))
Anthropic analyzed **~400,000 sessions from ~235,000 people, Oct 2025–Apr 2026**: users make **~70% of planning decisions**, Claude **~80% of execution decisions**. Session mix: building 25% + fixing 26% + testing/orchestrating 5% (**~56% total**), operating software 17%, planning/exploring 14%, analysis/prose 13%. Verified success rate ~**15% for novices vs 28–33% for intermediate/expert** sessions; experts trigger **~3,200 words/prompt vs ~600 for novices**. Average session value rose **~27%** and debugging fell from **33% → 19%** over the period. A separate internal survey of **132 engineers** reported ~27% of assisted tasks were work "not attempted without the tool" (small, likely internal sample).