---
key: gemini-cli
name: Gemini CLI (Google)
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- MAJOR / CENTRAL CORRECTION: The brief buried the single most important recent fact in its 'uncertainties' as 'unverified.' It is CONFIRMED by primary sources: On May 19, 2026, at Google I/O, Google announced it is transitioning Gemini CLI to a new closed-source, Go-based 'Antigravity CLI.' On June 18, 2026, Gemini CLI and Gemini Code Assist IDE extensions STOPPED serving requests for free-tier users, Google AI Pro/Ultra subscribers, and individual Gemini Code Assist users. Only organizations on Gemini Code Assist Standard/Enterprise (or paid Cloud API keys) retain access. Authored by Dmitry Lyalin (Group PM) and Taylor Mullen (Principal Engineer). Source: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ and repo Discussion #27274.
- Corrected the free-tier claim. The brief said the free tier is '60 requests/minute, 1,000 requests/day; SAME limit for Gemini API Key.' This is wrong. The 60 RPM / 1,000 RPD free allowance applies to OAuth login with a personal Google Account (Gemini Code Assist free tier). A Gemini API key from AI Studio has a DIFFERENT, separate free tier (lower limits, and post-April-2026 largely Flash-only). Adding more API keys does not add quota. Source: https://geminicli.com/docs/resources/quota-and-pricing/
- Corrected/updated model support. The brief said 'Gemini 2.5 Pro (at launch) / Gemini 3 models.' More precise: launch model was Gemini 2.5 Pro; the CLI's current default is 'Auto' (routes by task complexity), and it supports Gemini 3.x Pro / Flash / Flash-Lite via /model. IMPORTANT: as of April 1, 2026, Gemini Pro models became PAID-ONLY on the free tier; free access retained only Flash / Flash-Lite with reduced daily quotas. The '1M-token context window' is confirmed.
- Clarified the open-source repo status vs. hosted access. The brief implied the project is straightforwardly 'active' (citing v0.49.0 on June 25, 2026). Both are true but must be stated together: the Apache-2.0 GitHub repo remains available 'with no changes' and releases continued past the cutoff, BUT the hosted Google backend stopped serving consumer/Pro/Ultra tiers on June 18, 2026. Consumer users cannot run it against Google models without an enterprise license or paid API key.
- Fixed the CVE date phrasing. The brief's designDecisions section calls it a 'June 2025 CVE.' Precise timeline: reported to Google VDP June 27, 2025 by Tracebit; upgraded to P1/S1 on July 23, 2025; PATCHED July 25, 2025 in v0.1.14. The keyFacts entry (July 25, 2025 / v0.1.14) was already correct; only the 'June 2025' shorthand in prose was imprecise.
- Expanded the sandbox profile list. The brief listed only 'permissive-open' and 'strict.' Official docs list five macOS Seatbelt profiles: permissive-open (default), permissive-closed, permissive-proxied, restrictive-open, restrictive-closed. Confirmed: only macOS Seatbelt + Docker/Podman are supported; gVisor/LXC (from the DataCamp article) are NOT official — that brief uncertainty is resolved as inaccurate.
- Downgraded confidence on internal ChatCompressionService / ContextManager mechanics. The specific numbers (50% trigger, 30% verbatim tail, 50k-token tool budget, graph-based 'Pull Master' pattern, device-ID+inode dedup) come ONLY from third-party DeepWiki code analysis, NOT official docs. The official architecture page confirms packages/cli + packages/core + packages/core/src/tools/ but does NOT mention ContextManager, ChatCompressionService, or a 'Pull Master' graph pipeline. Presented as illustrative/unofficial.
- Added nuance to the Claude Code comparison. The brief states Claude Code 'requires minimum $20/month.' As of ~April 2026, Claude Code's inclusion in the $20 Pro tier is contested/reportedly removed, pushing it toward higher tiers or metered API usage. The core point (paid vs. Gemini's former free tier) stands but the exact $20 floor is no longer clean.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED: 'gVisor, LXC' as Gemini CLI sandbox backends (from a DataCamp comparison article). Official sandbox docs list only macOS Seatbelt and Docker/Podman.
- DUBIOUS/OUTDATED framing: 'Aggressive free tier (60 req/min, 1,000 req/day)' as a live differentiator. This was true at launch but the consumer free tier via Google's backend ended June 18, 2026, and Pro models went paid-only April 1, 2026. It should be described historically, not as a current advantage.
- DUBIOUS: The claim that the free-tier limit is the 'same limit for Gemini API Key.' OAuth/Code Assist free tier and API-key free tier are separate and different.
- LOW-CONFIDENCE (third-party only): the precise ChatCompressionService numbers (50% trigger / 30% tail / 50k tool budget) and the graph-based 'Pull Master' ContextManager pipeline. Not in official docs; from DeepWiki reverse-engineering. Directionally plausible but exact values unverified against current code.
- MINOR DATE CONFLICT: one secondary comparison article dated the Antigravity announcement 'May 12, 2026'; primary sources (official Google blog + repo Discussion #27274) say May 19, 2026 (Google I/O). Trust May 19, 2026.
- HYPE-FLAG (accurately attributed, not verified as fact): 'largest free tier / industry's largest free allowance' and Codex 'Goal mode 1,000+ sequential tool calls' are vendor/demo claims repeated in the brief. Kept as attributed claims, not independent facts.

**尚未解决的问题:**
- Is the open-source Gemini CLI repo still receiving substantive releases after June 18, 2026, or is it in maintenance/archive mode? v0.49.0 (June 25, 2026) shipped after the consumer cutoff, but long-term maintenance intent post-transition is unclear.
- Can the Apache-2.0 Gemini CLI still be run at all by non-enterprise users after June 18, 2026 — e.g., pointed at a paid Gemini API key, Vertex AI, or a third-party/OpenAI-compatible backend? Sources conflict on whether it is 'a fork-able skeleton needing Google's backend' vs. usable with any paid API key.
- Exact current free-tier state (post-April-1-2026): confirm precisely which Flash/Flash-Lite models remain free, at what reduced RPM/RPD, for OAuth login vs. AI Studio API key. Numbers vary across secondary sources.
- Whether Antigravity CLI is truly fully closed-source or will have any open components; and exact feature parity (Agent Skills, Hooks, Subagents, Extensions-as-plugins are claimed to carry over, but 'not full parity at launch' is reported).
- Precise, current internals of ChatCompressionService/ContextManager (trigger %, tail %, tool-output token budget, dedup mechanism) against the live codebase — only third-party (DeepWiki) analysis was available, not official docs.
- Whether packages/a2a-server is still labeled 'experimental' in the current release.
- Exact status of Claude Code's $20 Pro-tier inclusion in mid-2026 (reportedly removed ~April 2026) — affects the accuracy of the 'Claude Code minimum $20/month' comparison line.

---
# Gemini CLI (Google) — Source Brief for Technical Writers

> **Status flag (read first).** Gemini CLI was a landmark 2025 open-source project, but it is **being sunset for consumers as of mid-2026.** On **May 19, 2026** (Google I/O), Google announced it is transitioning Gemini CLI to a new, **closed-source, Go-based "Antigravity CLI."** On **June 18, 2026**, Google's hosted backend **stopped serving requests** for free-tier users, Google AI Pro/Ultra subscribers, and individual Gemini Code Assist users. Only orgs on **Gemini Code Assist Standard/Enterprise** (or paid Cloud API keys) retain access. The Apache-2.0 GitHub repo remains public "with no changes," and releases continued (e.g., v0.49.0 on June 25, 2026), but consumers can no longer run it against Google's models for free. Sources: [Google Developers Blog](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/), [repo Discussion #27274](https://github.com/google-gemini/gemini-cli/discussions/27274). Teach this as a *historically important, now-transitioning* tool.

## 1. What it is + who/when

**Gemini CLI** is an open-source, terminal-native AI coding agent from **Google**. It runs a **ReAct (reason-and-act) loop** connecting the terminal directly to Google's Gemini models, with built-in tools for file operations, shell execution, web search (Google Search grounding), and web fetch.

- **Launched:** June 25, 2025, open-source under **Apache 2.0**. ([blog.google](https://blog.google/technology/developers/introducing-gemini-cli-open-source-ai-agent/), [TechCrunch](https://techcrunch.com/2025/06/25/google-unveils-gemini-cli-an-open-source-ai-tool-for-terminals/))
- **Repo:** [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) — primarily **TypeScript (~98%)**. As of late June 2026: **~106K stars, ~14.2K forks, ~690 contributors, 536+ releases**, latest stable **v0.49.0** (June 25, 2026). Weekly stable releases (Tuesdays ~20:00 UTC), plus preview and nightly channels.
- **Community scale:** Google cited **6,000+ merged external PRs** as evidence of adoption — later a flashpoint when the tool was moved toward enterprise-only.
- **Related product:** Shares technology lineage with **Gemini Code Assist** (Google's IDE assistant); the free tier was in fact the Code Assist individual tier.

## 2. Architecture & named components

**Two-package TypeScript monorepo** (confirmed by [official architecture docs](https://google-gemini.github.io/gemini-cli/docs/architecture.html)):

- **`packages/cli`** — user-facing terminal REPL: input capture, history, display rendering, themes, config.
- **`packages/core`** — backend orchestrator: Gemini API client, prompt construction, tool registration/execution, state/context management.
- **`packages/core/src/tools/`** — modular built-in tools (file read/write/edit, shell, web-fetch, web-search, memory).

Additional packages referenced across the repo/ecosystem: `packages/sdk` (programmatic embedding), `packages/a2a-server` (experimental Agent-to-Agent server), `packages/vscode-ide-companion` (VS Code extension), plus test/devtools utilities. *(These are real but not all listed on the single architecture page; treat the full list as ecosystem-level, not one canonical doc.)*

**Context & compression internals — UNOFFICIAL/illustrative:** A third-party analysis ([DeepWiki](https://deepwiki.com/google-gemini/gemini-cli/4.12-chat-compression-and-context-management)) describes a graph-based `ContextManager` ("Pull Master" pattern with a token-pressure barrier) and a `ChatCompressionService` (auto-compress at ~50–70% of the token limit; preserve the recent tail verbatim; summarize the oldest segment; ~50k-token budget for tool outputs; device-ID+inode dedup for context files). **Official docs do not confirm these class names or numbers** — present the *pattern* (sliding window + summarization under token pressure) as the teachable idea, not the exact figures.

**Named user-facing subsystems (confirmed):**
- **GEMINI.md context files** — 3-tier hierarchy: global `~/.gemini/GEMINI.md` → project root (up to the `.git` boundary) → subdirectories (just-in-time discovery). ([docs](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html))
- **Sandbox** — off by default; backends: **macOS Seatbelt** + **Docker/Podman** only. Five Seatbelt profiles: `permissive-open` (default: write-restricted outside project, network allowed), `permissive-closed`, `permissive-proxied`, `restrictive-open`, `restrictive-closed`. **No gVisor/LXC.** ([docs](https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html))
- **Tool approval modes** — `default` (prompt each time), `auto_edit` (auto-approve edits, still prompt for shell), `yolo` (approve all; auto-enables sandbox). ([config docs](https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html))
- **Extensions system** (**launched Oct 2025**) — installable bundles of MCP servers + GEMINI.md context + custom slash commands + excluded-tool declarations, from a GitHub URL or local path (`gemini extensions install`). ([blog.google](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-cli-extensions/), [InfoQ](https://www.infoq.com/news/2025/10/gemini-cli-extensions/))
- **Subagents** — Markdown+YAML-frontmatter files in `.gemini/agents/*.md` (project) or `~/.gemini/agents/*.md` (user). Four built-ins: `codebase_investigator`, `cli_help`, `generalist`, `browser_agent`. **Subagents cannot call other subagents** (recursion/loop prevention). ([docs](https://geminicli.com/docs/core/subagents/))
- **Remote subagents via A2A (Agent-to-Agent) protocol** — configured with `agent_card_url` / inline `agent_card_json`; auth supports apiKey, HTTP Bearer/Basic, Google ADC, and OAuth 2.0 + PKCE. ([docs](https://geminicli.com/docs/core/remote-agents/))
- **MCP integration** (`mcpServers` in settings.json), **checkpointing** (`--checkpointing`), non-interactive mode (`-p/--prompt`, `--output-format json|stream-json`), **PTY shell backend** for interactive scripts, OTLP telemetry, `/memory` commands.

## 3. How one task flows through it (e.g., "refactor this file to async/await")

1. User types the prompt in the interactive REPL; **`packages/cli`** captures input.
2. CLI forwards input + conversation history to **`packages/core`**.
3. Core assembles the request: loads GEMINI.md context (global → project → subdir), builds the system prompt with conventions + tool function-declarations + history.
4. Core calls the **Gemini API**.
5. Gemini returns either a text answer or a **tool-use request** (e.g., `read_file`).
6. Core checks the **approval mode**: read-only tools may auto-run; writes/shell prompt the user (default) or auto-approve (`auto_edit`/`yolo`).
7. Core executes the approved tool and returns the result as a tool-result message.
8. Gemini reasons over the result and may request more tools (e.g., `write_file` with refactored code).
9. Steps 5–8 loop (**ReAct**) until Gemini returns a final answer with no more tool calls.
10. Core returns the final response to CLI for formatted display.
- **Throughout:** when token usage nears the configured threshold, history is auto-compressed before the next turn; in `yolo` mode, sandboxing is auto-enabled to contain shell commands.

## 4. Distinctive design decisions & tradeoffs

1. **Open-source Apache 2.0** — transparency + community contribution; tradeoff: competitors study the design, and (as it turned out) contributors reacted sharply when the tool later moved toward closed-source Antigravity.
2. **Split CLI/Core** — lets the SDK and VS Code companion reuse Core without the terminal UI.
3. **Hierarchical GEMINI.md** — versionable, team-shared context; tradeoff: dedup complexity.
4. **Sandbox off by default** — low-friction on local dev; tradeoff: unsafe under prompt injection (demonstrated by the July 2025 CVE). `yolo` compensates by auto-sandboxing.
5. **Graduated approval (default/auto_edit/yolo)** — a clean trust gradient; `auto_edit` automates the most common action (edits) while still gating shell.
6. **Extensions as bundles** — MCP + context + commands in one installable unit; tradeoff: arbitrary-GitHub-URL install is an attack surface.
7. **Subagent recursion ban + context isolation** — prevents token explosion and infinite delegation loops.
8. **PTY shell backend** — survives interactive prompts (npm, git rebase) that break naive subprocess pipes.
9. **A2A for remote agents** — uses an open standard for multi-agent interop rather than a proprietary protocol.
10. **Formerly aggressive free tier** — 60 RPM / 1,000 RPD on personal-Google-account login was marketed as the largest free allowance; **this consumer access ended June 18, 2026**, and Pro models went paid-only April 1, 2026.

## 5. How it differs from peers

- **vs. Claude Code (Anthropic):** Gemini CLI is Apache-2.0 open-source and (historically) had a generous free tier; Claude Code is proprietary, Anthropic-model-locked, and paid (the $20 Pro inclusion has become contested/removed around April 2026). Both use project context files (GEMINI.md vs CLAUDE.md). Gemini CLI uses a PTY shell backend and a 3-mode approval system; Claude Code uses an Allow/Ask/Deny permission model. Gemini CLI supports Vertex AI + multiple Gemini variants.
- **vs. Codex CLI (OpenAI):** Codex emphasizes long-running autonomy (Goal mode; OpenAI demoed 1,000+ sequential tool calls); Gemini CLI is more human-in-the-loop by default. ([ofox.ai](https://ofox.ai/blog/agentic-coding-claude-codex-gemini-cursor-2026/))
- **vs. Cursor Agent:** Cursor's background agents run on cloud VMs with a browser/desktop and can visually verify UI (and fan out ~8 parallel); Gemini CLI is local/terminal-only — lighter but can't verify visual output.
- **Differentiators:** open-source Apache 2.0; native Google Search grounding; A2A remote multi-agent support; extensions ecosystem (Oct 2025); multimodal input (PDFs/images/audio) in a terminal agent; 1M-token context.

## 6. Teaching hooks

1. **ReAct made concrete** — the loop (reason → tool → observe → reason) is *visible* in the terminal; an ideal first agent example before multi-agent systems.
2. **Context files as a design pattern** — GEMINI.md's global→project→subdir hierarchy vs. CLAUDE.md shows a *convergent* pattern for human-authored, versionable context.
3. **Trust gradients & human-in-the-loop** — default/auto_edit/yolo with auto-sandbox-on-yolo is a clean case study in safety-vs-autonomy.
4. **Security realism** — the July 2025 Tracebit CVE (prompt injection hidden in a README's license text + a shell-allowlist bypass via `;`) is a vivid lesson on why "sandbox off by default" is risky and why command-allowlisting is hard. ([Tracebit](https://tracebit.com/blog/code-exec-deception-gemini-ai-cli-hijack))
5. **Context-window management under pressure** — the summarize-the-head / keep-the-tail compression strategy teaches the sliding-window-plus-summarization pattern and its tradeoffs (recency bias, summary loss). *(Exact numbers are third-party/unofficial.)*
6. **Multi-agent progression** — built-in tools → MCP servers → local subagents → remote A2A agents is a tidy ladder from simple tool use to distributed multi-agent systems; recursion prevention is the key safety mechanism.
7. **Open-source agent economics & governance** — the arc from "generous free open-source tool with 6,000+ community PRs" to "enterprise-only + closed-source Go successor (Antigravity)" is a rich, real case study in open-source strategy, contributor trust, and platform lock-in.

## Key source URLs
- Official announcement: https://blog.google/technology/developers/introducing-gemini-cli-open-source-ai-agent/
- Repo: https://github.com/google-gemini/gemini-cli
- Architecture: https://google-gemini.github.io/gemini-cli/docs/architecture.html
- Sandbox: https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html
- Subagents: https://geminicli.com/docs/core/subagents/ · Remote agents: https://geminicli.com/docs/core/remote-agents/
- Extensions: https://blog.google/innovation-and-ai/technology/developers-tools/gemini-cli-extensions/ · https://www.infoq.com/news/2025/10/gemini-cli-extensions/
- Quotas/pricing: https://geminicli.com/docs/resources/quota-and-pricing/
- CVE: https://tracebit.com/blog/code-exec-deception-gemini-ai-cli-hijack
- **Antigravity transition:** https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ · https://github.com/google-gemini/gemini-cli/discussions/27274