---
key: openclaw
name: OpenClaw (harness)
category: 影响力 harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- NAMING/TRADEMARK CONFLATION (important): The brief's keyFacts state the final rename to 'OpenClaw' (Jan 30, 2026) was 'after trademark pressure from Anthropic.' This is wrong. Per Wikipedia, ONLY the Jan 27, 2026 rename to 'Moltbot' was driven by Anthropic's trademark complaints (over the Claude-derived 'Clawd' root). The Jan 30 rename to 'OpenClaw' was because Steinberger felt 'Moltbot' never quite rolled off the tongue -- not trademark pressure. Corrected timeline: Warelay (Nov 24 2025) -> CLAWDIS/Clawdis (Dec 3 2025) -> Clawdbot (Jan 2 2026) -> Moltbot (Jan 27 2026, Anthropic trademark) -> OpenClaw (Jan 30 2026, stylistic).
- ACP IS NOT OPENCLAW-INVENTED (important clarification): The architecture section presents ACP largely as an OpenClaw component. ACP (Agent Client Protocol) is in fact an independent open standard created by Zed Industries, released August 2025, using JSON-RPC 2.0 over stdio (an 'LSP for AI coding agents'). OpenClaw is a *consumer* of this external standard via its @openclaw/acpx plugin; it did not create ACP. This also UPGRADES the brief's flagged uncertainty: the 'JSON-RPC' characterization is now VERIFIED from the official ACP spec (agentclientprotocol.com), not merely secondary sources.
- HERMES COMPARISON RESOLVED (brief listed as unknown): The New Stack article body was still not directly fetchable, but multiple secondary analyses resolve the distinction. Hermes Agent is from Nous Research and is built around a memory/learning loop (self-improving skills, nudge_interval reflection prompts); OpenClaw is built around the always-on gateway (routing, channels, permissions). Framing: 'Hermes packages a gateway around a learning agent; OpenClaw packages an agent around a messaging gateway.'
- TASK BRAIN vs TASK FLOWS naming precisely disambiguated: 'Task Brain' is a press/community label (36kr, openclaws.io blog) for the SQLite-backed unified task ledger introduced in v2026.3.31(-beta.1). 'Task Flow(s)' is the OFFICIAL docs term (docs.openclaw.ai/automation/taskflow) for the durable background orchestration layer that became fully operational in v2026.4.2. They are related but distinct milestones; the brief's uncertainty on this was correct and is now pinned down.
- BENCHMARK AUTHOR COUNT confirmed at 16 (not 20): The canonical arXiv abstract page for 2606.12344 lists exactly 16 authors, matching the brief. An intermediate HTML fetch that reported '20 authors' was a fetch-model artifact; disregard it. The eight affiliations (TokenRhythm Technologies, Infinigence AI, Peking University, Tsinghua, Shanghai Jiaotong, Beijing Jiaotong, City University of Hong Kong, SEE Fund) are corroborated but note they are not shown on the bare abstract page -- they come from the paper PDF/HTML byline.
- GitHub star count is a moving target, not a fixed fact: 382k stars / 80k forks was confirmed in the current (mid-2026) fetch, but contemporaneous press cites varying figures (196k at the OpenAI-join announcement, 247k on Mar 2 2026, ~323k in a May 2026 shortage article). Present star counts as time-stamped snapshots of a rapidly growing repo, not as a single canonical number.
- The Register source URL is partially broken: the exact URL in the brief (with trailing '/5241530') returns HTTP 404. The article's substance (OpenClaw self-hosting driving Mac Mini / high-unified-memory shortages; 'harness may matter as much as the model') is strongly corroborated by Tom's Hardware, The Next Web, and Decrypt, so the CLAIM stands even though that specific URL should not be cited verbatim.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED: 'OpenClaw' final name (Jan 30 2026) resulted from Anthropic trademark pressure. -> The Jan 30 rename was stylistic; only the Jan 27 'Moltbot' rename was trademark-driven.
- DUBIOUS/UNVERIFIED IN PRIMARY DOCS: 'maxConcurrentSessions: 8 by default' and permissionMode set '{approve-all, approve-reads, deny-all}'. The fetched acp-agents-setup content confirmed 'approve-all' and a 'nonInteractivePermissions' concept and that ACP is non-interactive/non-sandboxed, but did NOT surface the exact '8' default or the full three-value permissionMode enum. Treat these specific values as plausible-but-unconfirmed pending a direct read of the setup page.
- DUBIOUS FRAMING: 'manifest is the control-plane source of truth' (stated absolutely). Docs confirm the manifest (openclaw.plugin.json) is central to discovery/validation/declared-surfaces, but also state runtime behavior ultimately derives from the plugin module's register(api) function. So the manifest is authoritative for identity and declared surfaces, not for all runtime behavior -- soften the absolute phrasing.
- MINOR: secondary sources give inconsistent origin detail -- one says April 2025 experimentation was 'initially under the name Clawdbot,' which contradicts the Warelay-first (Nov 2025) timeline. The April 2025 'began experimenting with agents' and 'first version coded in ~an hour' claims are corroborated in spirit, but the pre-November-2025 micro-history is secondary-source and slightly inconsistent; do not present it as precise.
- NOTE (not refuted, added context): press reports an OpenAI-vs-Meta 'bidding war' preceded Steinberger joining OpenAI, and that OpenAI 'co-developed' / backs the Foundation while it remains independent. Whether the OpenClaw Foundation is a fully formalized legal non-profit entity vs. an announced-but-forming arrangement remains not definitively established.

**尚未解决的问题:**
- Exact ACP config defaults in OpenClaw: is 'maxConcurrentSessions' really 8 by default, and is the permissionMode enum exactly {approve-all, approve-reads, deny-all}? The fetched setup docs confirmed non-interactive/non-sandboxed behavior and an 'approve-all'/'nonInteractivePermissions' notion but did not surface these precise values -- a direct read of https://docs.openclaw.ai/tools/acp-agents-setup is needed to confirm.
- Is the OpenClaw Foundation a fully incorporated legal non-profit, or an announced-but-still-forming stewardship arrangement? Press (Forbes/TechCrunch/Yahoo) confirms the intent and OpenAI backing/independence but not the precise legal status.
- The New Stack Hermes article body remains directly un-fetchable (homepage-only scrape); the OpenClaw-vs-Hermes 'control' distinction here is reconstructed from secondary analyses (Composio, screenshotone, Vectorize, mem0) rather than the primary article.
- Which OpenClaw release/version first introduced ACP/acpx, and the exact wire-level ACP method names OpenClaw uses, were not pinned to a primary changelog entry (ACP-the-standard is JSON-RPC 2.0, but OpenClaw's specific method surface wasn't enumerated in fetched docs).
- The eight author affiliations for Claw-SWE-Bench (TokenRhythm Technologies, Infinigence AI, Peking/Tsinghua/SJTU/BJTU/CityU-HK, SEE Fund) are corroborated but not visible on the bare arXiv abstract page; they should be confirmed against the paper PDF byline before citing affiliations authoritatively.
- The 'resume substrate' (per-harness session-continuity mechanism) is referenced in docs snippets but its exact per-backend implementation (Claude Code vs Codex vs OpenCode) is not fully documented in fetched primary sources.
- Pre-November-2025 micro-history (April 2025 experimentation; whether an early prototype was ever called 'Clawdbot' before Warelay) is secondary-source and mildly inconsistent across outlets; treat as color, not precise fact.
- The exact The Register article URL in the original brief 404s; a corrected canonical URL for that specific piece should be located before citing it verbatim (the underlying claims are independently corroborated by Tom's Hardware/TNW/Decrypt).

---
## OpenClaw (agent harness) — verified source brief

*Fact-checked July 2026. Confidence: HIGH for core facts; residual uncertainties listed at the end. Star counts and version numbers are time-stamped snapshots of a fast-moving project.*

### 1. What it is + who/when

**OpenClaw** is an open-source, self-hosted, **local-first multi-channel gateway for AI agents** that runs on any OS. Its GitHub tagline: *"Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞"* (https://github.com/openclaw/openclaw). It wraps LLMs with a persistent agent loop, a tool system, a plugin architecture, multi-channel message routing, and a sub-agent/external-harness delegation system. **MIT-licensed.** Tech stack: **TypeScript** (monorepo, pnpm workspaces) with **Swift** companion apps (iOS/macOS); Docker support included. Runtime requires **Node.js 24** (recommended) or **22.19+**, plus **pnpm**.

**Creator & timeline (https://en.wikipedia.org/wiki/OpenClaw):** Built by Austrian "vibe coder" **Peter Steinberger**. Steinberger began experimenting with local agents around April 2025; the first version was famously prototyped in about an hour. First public release: **Nov 24, 2025 as "Warelay"** (originally a WhatsApp↔LLM relay). Rename sequence:

- **Warelay** — Nov 24, 2025
- **CLAWDIS / Clawdis** — Dec 3, 2025
- **Clawdbot** — Jan 2, 2026
- **Moltbot** — Jan 27, 2026 *(this rename was forced by Anthropic trademark complaints over the "Clawd" root)*
- **OpenClaw** — Jan 30, 2026 *(stylistic — "Moltbot never quite rolled off the tongue" — NOT trademark)*

**Stewardship:** Steinberger announced **joining OpenAI on Feb 14, 2026** (news broke Feb 15; https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/). OpenClaw was placed under an **OpenClaw Foundation** as a community/non-profit, backed by but independent of OpenAI (https://www.forbes.com/sites/ronschmelzer/2026/02/16/openai-hires-openclaw-creator-peter-steinberger-and-sets-up-foundation/). The project grew explosively: ~196k stars at the OpenAI-join announcement, 247k (Mar 2 2026), ~323k (May 2026), and **382k stars / 80k forks** in the current mid-2026 GitHub fetch.

**Versioning (date-based):** stable **2026.6.11** (June 30, 2026); pre-release **2026.7.1-beta.1** (July 2, 2026) (https://github.com/openclaw/openclaw/releases).

### 2. Architecture & named components

- **Gateway (control plane):** single always-on local process; source of truth for sessions, routing, and channel connections. Exposes Gateway RPC (`agent`, `agent.wait`).
- **Channel layer:** 20+ platform adapters (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, WeChat, QQ, WebChat, plus macOS/iOS/Android companions). Each channel is a plugin implementing a messaging capability type.
- **Plugin registry:** one-way registry; plugins register, core consumes. The `openclaw.plugin.json` **manifest** is authoritative for identity and declared surfaces (though final runtime behavior comes from the plugin's `register(api)`). **13 public capability types** (text inference, CLI inference backend, embeddings, speech, realtime transcription/voice, media understanding, transcript sources, image/music/video generation, web fetch/search, channel/messaging, gateway discovery) (https://docs.openclaw.ai/plugins/architecture).
- **Provider layer:** auth, model discovery, transport normalization, failover. `provider/model-id` naming (e.g., `anthropic/claude-opus-4-8`). Providers implement **43+ optional hooks** (catalog, normalizeModelId, createStreamFn, refreshOAuth, resolveThinkingProfile, buildReplayPolicy, sanitizeReplayHistory, …).
- **Agent Runtime layer:** owns one prepared model loop. Three families: (a) embedded `openclaw` runtime (default fallback), (b) embedded plugin runtimes (e.g., native `codex` app-server), (c) CLI backends (e.g., `claude-cli`). Selection priority: model-scoped policy > provider-scoped policy > auto-mode `supports(ctx)` > embedded fallback. Once a plugin harness claims a run, OpenClaw does not replay it through another runtime.
- **Tool system:** eight built-in domains (Runtime, Files, Web, Browser, Messaging, Sessions/Agents, Automation, Media). Tool schemas are **dynamically filtered before model exposure** per policy.
- **Skills system:** `SKILL.md` instruction packs loaded into the prompt (workflows/rubrics/constraints, not code). Precedence: workspace > global > bundled.
- **ACP / @openclaw/acpx plugin:** ACP = **Agent Client Protocol**, an *independent* open standard from **Zed Industries** (released Aug 2025), **JSON-RPC 2.0 over stdio**, an "LSP for AI coding agents" (https://agentclientprotocol.com, https://zed.dev/acp). OpenClaw consumes it via the separately-installed `@openclaw/acpx` plugin to spawn/steer external harnesses: **Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Kimi/Moonshot, Qwen Code, Kilocode, iFlow, Kiro, Droid, OpenCode** (https://docs.openclaw.ai/tools/acp-agents). It can inject a built-in MCP server (`openclaw-plugin-tools`) into ACP session bootstrap.
- **Task ledger ("Task Brain" in press) & Task Flows:** SQLite-backed unified task ledger (v2026.3.31) folds ACP sessions, sub-agents, cron tasks, and background CLI processes into one execution plane (heartbeats, recovery, parent-child cancel propagation). **Task Flows** (official term; v2026.4.2) add durable restart-safe orchestration, `openclaw flows` inspect/recover/cancel commands, managed-vs-mirrored sync modes, and sticky cancel propagation (https://docs.openclaw.ai/automation/taskflow).
- **Context Engine:** pluggable, exclusive slot, owns ingest/assembly/optional compaction.
- **Worktree strategy + Notification pipeline:** Git worktree isolation shared across Claude Code / Codex / (experimental) OpenCode with per-backend adapters and resume substrates; two-step completion contract delivers a canonical status line then wakes the orchestrator for a factual summary to the origin thread.

### 3. How one task flows through it (external-harness/coding example)

1. **Inbound:** user message on a bound channel (e.g., Discord) → channel adapter → Gateway.
2. **Gateway acceptance:** `agent` RPC validates params, resolves session, persists metadata, and immediately returns **`{ runId, acceptedAt }`** without waiting (https://docs.openclaw.ai/concepts/agent-loop).
3. **Runtime prep:** resolve model (`provider/model-id`), apply thinking/verbose/trace defaults, load skills snapshot, pick runtime via the priority hierarchy.
4. **ACP path (if chosen):** `@openclaw/acpx` spawns an external harness process (e.g., Claude Code) in its own workspace dir (helper ensures sub-agents don't clobber the primary agent's memory/transcripts).
5. **Core loop:** runs are **serialized per session lane** (optionally a global lane); session write lock acquired; prompt = base prompt + skills + bootstrap files; tool schemas filtered before the model sees them.
6. **Tool execution:** tool start/update/end events stream. **ACP harness execution is NOT wrapped by OpenClaw's sandbox** — the external CLI acts under its own permissions and `cwd`.
7. **Streaming:** three channels — `assistant` (text/reasoning deltas), `tool` (execution events), `lifecycle` (start/end/error).
8. **Compaction:** auto-summarize when context limits are exceeded.
9. **Reply assembly:** assistant text + inline tool summaries; the token `NO_REPLY` is filtered; duplicate messaging-tool sends removed.
10. **Completion:** `agent.wait` blocks for `runId` and returns `{ status: ok|error|timeout, startedAt, endedAt, error? }`. Default agent timeout: **48 hours (`agents.defaults.timeoutSeconds` = 172800s)**.
11. **Notification:** for worktree/PR outcomes, plugin posts a canonical status line then wakes the orchestrator (with original route/thread metadata) to send a factual summary.

### 4. Distinctive design decisions & tradeoffs

1. **Gateway as single source of truth** — one local process, not distributed services. Simplicity + data control vs. single point of failure.
2. **Plugins run in-process, deliberately unsandboxed** — *"a malicious native plugin is equivalent to arbitrary code execution inside the OpenClaw process."* Security traded for simplicity/perf.
3. **ACP boundary is not a sandbox** — external harnesses are trusted peers running under their own permission models.
4. **Manifest-first plugins** — cheap activation/startup planning without materializing the full module.
5. **Provider ≠ model ≠ runtime ≠ channel** — e.g., run `anthropic/claude-opus-4-8` through the `claude-cli` backend; more config surface in exchange for flexibility.
6. **Exclusive runtime ownership** — no cross-runtime replay of a claimed run (preserves auth semantics, avoids duplicated side effects).
7. **Skills as instruction packs, not code** — non-developers extend behavior in natural language; less precise than code tools.
8. **SQLite task ledger** — unified durability/recovery/heartbeats for all background work.
9. **Dynamic tool filtering** — model never sees tools it can't use, reducing hallucinated calls.

### 5. How it differs from peers

- **vs. Claude Code / Codex / Gemini CLI (point harnesses):** those are single-harness coding agents; OpenClaw is a **meta-harness/gateway** that drives them as sub-agents via ACP while adding multi-channel delivery, persistence, scheduling, and plugin extensibility.
- **vs. Hermes Agent (Nous Research):** per The New Stack ("agree on what an agent is; disagree on what controls it"), **Hermes is memory/learning-loop-centric** (self-improving skills, periodic reflection nudges), while **OpenClaw is gateway-centric** (always-on routing/channels/permissions). "Hermes packages a gateway around a learning agent; OpenClaw packages an agent around a messaging gateway." (https://thenewstack.io/openclaw-hermes-agent-harness/, https://composio.dev/content/openclaw-vs-hermes-agent)
- **vs. Cline/Aider:** editor-integrated agents; OpenClaw is messaging-platform-first with ACP as the on-ramp for editor-style coders.
- **Benchmark evidence (Claw-SWE-Bench, arXiv:2606.12344, 10 Jun 2026, 16 authors):** 350 multilingual instances, 8 languages, 43 repos, five harnesses compared (openclaw, hermes-agent, zeroclaw, nanobot, generic). With **GLM 5.1**, OpenClaw's full adapter scored **73.4% Pass@1** vs **19.1%** for a bare/minimal direct-diff adapter. **Model choice shifts Pass@1 by 29.4pp; harness choice by 27.4pp** — comparable magnitudes (https://arxiv.org/abs/2606.12344). *Note: OpenClaw here is a third-party evaluation adapter, not OpenClaw's own runner.*

### 6. Teaching hooks

1. **"The harness matters as much as the model."** Claw-SWE-Bench's near-equal 27.4pp (harness) vs 29.4pp (model) Pass@1 swings — plus the Mac-Mini-shortage press — make a concrete, citable case for studying harnesses, not just models.
2. **Anatomy of an agent turn.** OpenClaw's loop (Gateway RPC → runtime prep → serialized core loop → tool exec → 3-stream output → `agent.wait`) is unusually well-documented for a production system — a clean step-by-step case study.
3. **The ACP "harness-of-harnesses" pattern.** A general gateway delegating to specialist coding CLIs over an open JSON-RPC standard (ACP, itself an LSP-style abstraction from Zed) is a crisp 2026 meta-orchestration lesson — and a good MCP-vs-ACP contrast (ACP = editor↔agent; MCP = agent↔tool).
4. **Security-vs-simplicity tradeoff, made real.** In-process unsandboxed plugins + non-sandboxed ACP execution produced documented consequences: the security paper (arXiv:2603.27517, "A Security Analysis of the OpenClaw AI Agent Framework") reports **470 advisories**, an unauthenticated Gateway RCE chain, malicious-`SKILL.md` droppers, and exec-allowlist bypasses via shell line-continuation, busybox multiplexing, and GNU option abbreviation.
5. **Three tiers of extensibility.** Skills (`SKILL.md` prompt packs) vs. Tools (registered code) vs. Plugins (installable capability bundles) cleanly separate levels of agent extension and when to use each.
6. **SQLite as a durability substrate.** Task Brain / Task Flows use one SQLite ledger for restart recovery, heartbeats, and parent-child cancellation — an accessible durability/concurrency pattern.
7. **The naming-chaos story.** Five names in ~two months (Warelay → CLAWDIS → Clawdbot → Moltbot → OpenClaw) — with only the Moltbot step being trademark-forced — vividly illustrates the velocity of the 2025–26 open-source agent wave.

---
**Key sources:** https://en.wikipedia.org/wiki/OpenClaw · https://github.com/openclaw/openclaw · https://github.com/openclaw/openclaw/releases · https://docs.openclaw.ai/concepts/agent-loop · https://docs.openclaw.ai/tools/acp-agents · https://docs.openclaw.ai/plugins/architecture · https://docs.openclaw.ai/concepts/model-providers · https://docs.openclaw.ai/automation/taskflow · https://agentclientprotocol.com · https://arxiv.org/abs/2606.12344 · https://arxiv.org/abs/2603.27517 · https://thenewstack.io/openclaw-hermes-agent-harness/ · https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/