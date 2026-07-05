---
key: cline
name: Cline (+ Roo Code)
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- MAJOR: The brief attributes the '74.2% Terminal Benchmark' score to 'claude-sonnet-4-6.' The Cline SDK blog's actual benchmark table attributes 74.2% to claude-opus-4.7 running on Cline CLI, on Terminal-Bench 2.0 (pass@1). This was product/model confusion (the brief even noted the model ID suspiciously matched 'this conversation's model ID'). Corrected to claude-opus-4.7 on Terminal-Bench 2.0.
- DATE: Original 'Claude Dev' release corrected from 'June 2024' to July 13, 2024. The announcement tweet (x.com/sdrzn/status/1812107453611282849) is dated July 13, 2024. The 'June 2024' framing conflates the Anthropic 'Build with Claude June 2024' hackathon (where it was prototyped, ~10 days after Claude 3.5 Sonnet's June 20, 2024 release) with the actual public marketplace release/announcement in July. Rename to Cline v2.0 on Oct 9, 2024 is confirmed accurate.
- CLARIFIED: Roomote pricing. The brief presents '$899/month' as the Roomote price. That is the enterprise tier (per parallel instance); Roomote also has a Pro plan (~$20/mo + $5/agent-hour) and a Team plan (~$99/mo). Reframed as a tiered pricing model.
- SOFTENED: The claim that Cline 'rejects plain text with an error' and that Plan mode 'must use plan_mode_respond' is sourced primarily from a Medium article, not primary docs. plan_mode_respond is a real Cline tool, but DeepWiki frames Plan-mode conversational output around attempt_completion/proposals and does not confirm a hard plain-text-rejection error. Downgraded to 'tool-structured output is enforced' with the strict-error detail flagged as blog-sourced.
- CLARIFIED install figure: '8M+ installs' is a cline.bot marketing figure ('8.0M+ installs across all platforms') and is accurately quoted, but multiple third-party 2026 sources still cite 4–5M. Labeled explicitly as a self-reported/marketing number with unspecified counting methodology.
- CLARIFIED provider count: '30+ LLM providers' is corroborated by Cline's own docs (there is a docs page literally titled 'Other 30+ Providers'), even though the homepage only shows ~12 provider logos. Kept as accurate but noted the homepage/docs discrepancy.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED: '74.2% on Terminal Benchmark for claude-sonnet-4-6' — the real figure is claude-opus-4.7 (74.2%) on Terminal-Bench 2.0 via Cline CLI. No sonnet-4-6 74.2% number exists in the source.
- DUBIOUS/DATE: 'Originally released June 2024' — actual public release was July 13, 2024 (built during the June hackathon).
- DUBIOUS: 'plain text is rejected with an error' (tool-first enforcement as a hard error) — primary docs do not confirm a hard error; this is a Medium-blog characterization.
- DUBIOUS: '@cline/agents is truly browser-compatible in production' — docs assert 'browser-compatible stateless agent execution loop,' but this remains a documented design property, not something independently demonstrated. Kept as a documented claim, not a verified runtime fact.
- DUBIOUS: Roomote '$899/month' as the headline price — it is only the enterprise/per-parallel-instance tier.
- UNVERIFIED-BUT-PLAUSIBLE: Roo Code '~3M installs' — the ~24,200 stars and 3,300 forks are corroborated; the exact ~3M install count is widely repeated in secondary sources but not primary-verified.

**尚未解决的问题:**
- Exact real-world unique-user count behind cline.bot's '8.0M+ installs' — methodology (unique users vs cumulative installs across VS Code/JetBrains/Cursor/Windsurf/CLI) is not published, and third-party sources still cite 4–5M.
- Whether the strict 'plain text rejected with an error' behavior (and the precise role of the plan_mode_respond tool) is enforced exactly as the Medium article describes; primary docs frame Plan-mode output around attempt_completion/proposals without confirming a hard error.
- The exact allowed tool set in strict vs non-strict Plan mode (strictPlanModeEnabled blocks edits, but the full permitted-tool list per mode is not spelled out in fetched primary sources).
- Whether @cline/agents' browser-compatibility is exercised in a production/shipping surface or remains a documented architectural property with no public demo.
- Kanban board maturity/version — it lives in a separate repo and is positioned as CLI-agnostic (works with Cline, Claude Code, Codex), but no standalone version number/GA status was confirmed.
- Roo Code's precise install count (~3M is widely repeated but not primary-verified; only the ~24,200 stars / ~3,300 forks are corroborated) and the exact internal behavior of its 'Boomerang Tasks' (repo now archived, docs largely gone).

---
## Cline (formerly Claude Dev) — Final Verified Brief

### What it is + who/when
Cline is an **open-source, model-agnostic autonomous coding agent** delivered as a VS Code extension, a JetBrains plugin (early access), a CLI, and an embeddable TypeScript SDK (`@cline/sdk`). It reads codebases, edits files, runs terminal commands, drives a browser, and calls MCP-server tools in an agentic loop, pausing for user approval at each step unless auto-approve is configured. It is BYOK ("bring your own key")/model-agnostic — users supply their own API keys or point at local models.

- Created by **Saoud Rizwan** and first published to the VS Code Marketplace as **"Claude Dev" on July 13, 2024** (announcement: https://x.com/sdrzn/status/1812107453611282849). It was prototyped during Anthropic's "Build with Claude" June 2024 hackathon, ~10 days after Claude 3.5 Sonnet's June 20, 2024 release. *(Corrected from the brief's "June 2024" release.)*
- **Renamed "Cline" (portmanteau of CLI + editor) at v2.0 on Oct 9, 2024** (https://x.com/sdrzn/status/1843989769828602273).
- Now developed by **Cline Bot Inc.**, **Apache-2.0** licensed. The company raised $27M (Forbes, Jul 2025).
- The **VS Code Marketplace extension ID remains `saoudrizwan.claude-dev`** despite the rename (https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev).
- Repo stats (https://github.com/cline/cline, verified Jul 2026): **64.3k stars, 6.8k forks, 322 contributors, TypeScript 97.5%, © 2026 Cline Bot Inc.** Latest release **CLI v3.0.37 (Jul 4, 2026)**.
- Homepage self-reports **"8.0M+ installs across all platforms"** (https://cline.bot/) — a marketing figure with unspecified methodology; third-party 2026 write-ups still commonly cite 4–5M.

### Architecture & named components
Following the **May 2026 SDK redesign** (announced May 13, 2026; https://cline.bot/blog/introducing-cline-sdk-the-upgraded-agent-runtime), Cline was re-based onto a layered TypeScript runtime, published to npm and open-sourced under Apache-2.0. Package roles per official docs (https://docs.cline.bot/sdk/overview):
- **`@cline/sdk`** — public SDK surface (re-exports `@cline/core`).
- **`@cline/core`** — Node runtime: sessions, built-in tools, persistence, hub support, automation.
- **`@cline/agents`** — the **stateless, browser-compatible** agent execution loop (the ReAct cycle).
- **`@cline/llms`** — provider gateway and model catalogs.
- **`@cline/shared`** — types, schemas, tool helpers, hooks, storage helpers.

Application surfaces sit on top: **VS Code extension, JetBrains plugin, CLI (`apps/cli/`), and a separate Kanban board** (CLI-agnostic multi-agent orchestrator that runs tasks in git worktrees; announced alongside the SDK). Other named internals: **`ContextManager`** (`src/core/context/context-management/ContextManager.ts`) with its **`contextHistoryUpdates`** map; **`StateManager`** (persists mode/settings/context history); a **shadow Git repository** for checkpoints; the **MCP Marketplace** (one-click server install, built into the extension); a **plugin system** at the runtime layer; and **`.clinerules`** project rule files.

### How one task flows through it (step-by-step)
1. User enters a task in the VS Code chat pane (or CLI).
2. **Plan mode (read-only):** Cline issues read/search tool calls (`read_file`, `search_files`, `list_files`) to explore the codebase and proposes a plan. `strictPlanModeEnabled` (confirmed real; https://deepwiki.com/cline/cline/3.4-plan-and-act-modes) explicitly blocks file edits in Plan mode. Cline enforces **structured, tool-based output** rather than free-form chat (the stronger "plain text is rejected with an error" framing is blog-sourced and should be treated as under-verified).
3. User switches to **Act mode** (UI toggle or `/act`). Under the hood the mode transition flows UI → StateManager mode update → Controller rebuilds the API handler with the act-mode config → state rebroadcast to the webview. With `planActSeparateModelsSetting = true` (confirmed real), each mode can use a different model/provider.
4. **Act loop:** the LLM receives the system prompt (tailored to mode/model family), full context, and tool definitions, then emits a tool call. A dedicated **tool handler** validates the request, checks the relevant auto-approve category, and either executes immediately or surfaces an approval UI.
5. After each file edit/command, `ContextManager` records the operation in `contextHistoryUpdates` (timestamps + edit type; duplicate file reads collapsed inline), and the **shadow Git repo commits a checkpoint** of current file state.
6. Tool result is appended; the LLM observes and reasons about the next step; loop repeats.
7. On context pressure, truncation kicks in using **`maxAllowedSize = Math.max(contextWindow − 40_000, contextWindow × 0.8)`** (formula confirmed; https://cline.ghost.io/understanding-the-new-context-window-progress-bar-in-cline/); messages are dropped from the **middle** in even pairs, preserving the opening exchange.
8. The LLM calls `attempt_completion`; the user can accept, reject, or **restore to any checkpoint**.

### Distinctive design decisions & tradeoffs
1. **Plan/Act split with optional separate models** — cheap model to plan, capable model to execute; switching is a context-preserving toggle, not a restart.
2. **Tool-structured output** — the loop favors machine-parseable tool calls over conversational drift; tradeoff: more rigid but more reliable.
3. **Shadow Git checkpoints** — reversibility without polluting the user's real Git history; captures even untracked files. Three restore paths (confirmed; https://docs.cline.bot/features/checkpoints): **Restore Files**, **Restore Task Only**, **Restore Files & Task**. Tradeoff: storage cost on large repos.
4. **Granular auto-approve** — **8 permission categories** (Read project files, Read all files, Edit project files, Edit all files, Execute safe commands, Execute all commands, Use the browser, Use MCP servers) plus a **YOLO mode** master override (confirmed; https://docs.cline.bot/features/auto-approve).
5. **Model-agnostic / BYOK** — **30+ providers** (corroborated by docs page "Other 30+ Providers"), including Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure OpenAI, GCP Vertex, Mistral, DeepSeek, xAI, Cerebras, OpenRouter, LiteLLM, Ollama, LM Studio, and any OpenAI-compatible endpoint. No vendor lock-in; users manage keys/costs.
6. **Surgical context management** — `contextHistoryUpdates` tracks edits with timestamps and dedupes redundant reads instead of naive sliding-window truncation.
7. **Plugin system over forking** and **stateless loop + durable runtime** — `@cline/agents` is stateless/browser-compatible while `@cline/core` adds durability, so sessions can persist and move across surfaces (VS Code, CLI, Kanban).
8. **Native multi-agent teams/subagents** in the SDK/CLI (coordinator + specialists via shared task board, inter-agent mailbox, mission log). Per docs this is SDK/CLI/Kanban-first, not yet in the IDE extensions.

### How it differs from peers
- **vs Claude Code (Anthropic):** Claude Code is terminal-native, single-provider, tied to Anthropic subscriptions; Cline is IDE-first, open-source, and model-agnostic (BYOK). Notably, Cline's own benchmark table shows **Cline CLI edging out Claude Code** on Terminal-Bench 2.0 for shared models (e.g., claude-opus-4.7: Cline 74.2% vs Claude Code 69.4%).
- **vs Cursor:** Cursor is a proprietary paid VS Code fork with deep IDE integration + autocomplete; Cline is an open-source extension (plus JetBrains/CLI) with no autocomplete focus.
- **vs GitHub Copilot:** Copilot is per-seat and autocomplete-centric; Cline charges only underlying LLM API costs and is fully agentic (file/terminal/browser/MCP control).
- **vs Roo Code (archived):** Roo Code was a **fork of Cline** adding role-based modes (Architect/Code/Debug/Ask/Custom), sticky per-mode models, and "Boomerang Tasks" subagent orchestration with more aggressive autonomy. **Roo Code shut down May 15, 2026** (repo archived read-only at ~24,200 stars / ~3,300 forks; shutdown announced by the team on Apr 21, 2026; https://thenewstack.io/roo-code-cloud-ides-ai-coding/). The team pivoted to **Roomote**, a Slack/cloud operational-engineering agent (tiered pricing: ~$20/mo Pro, ~$99/mo Team, ~$899/mo enterprise per parallel instance — *not* a flat $899). **Roo's official migration recommendation back to Cline is confirmed** (Kilo Code is the other main fork-based alternative).

### Teaching hooks (pedagogically interesting)
1. **Plan/Act as a mental model** — separating "understand the problem" from "execute" mitigates the classic agent failure of acting on incomplete context; the gRPC toggle + separate model configs make it concrete to trace.
2. **Tool-structured output as a design pattern** — enforcing tool calls over free text is what makes the agent loop machine-reliable; a clean contrast to raw function-calling APIs.
3. **Shadow Git for reversibility** — how to make destructive AI actions safe without exposing Git internals; the three restore modes map to real user recovery scenarios.
4. **Concrete token-budget management** — the `max(cw−40k, cw×0.8)` formula plus middle-deletion and dedup via `contextHistoryUpdates` is implementable and shows the memory-vs-cost tradeoff.
5. **Permission granularity as a spectrum** — from YOLO to 8 individual toggles is an excellent teaching artifact for human-in-the-loop design.
6. **Provider abstraction (`@cline/llms`)** — decoupling an agent from its LLM backend.
7. **SDK extraction as architectural evolution** — separating the stateless loop (`@cline/agents`) from the durable runtime (`@cline/core`) to go multi-surface, and the **Roo Code fork→shutdown→pivot** as a case study in strategic divergence.
8. **Benchmarking honesty as a lesson** — the corrected 74.2% figure (claude-opus-4.7, Terminal-Bench 2.0) is a good live example of why teaching material must trace a number to its exact model/harness/benchmark rather than trusting a paraphrase.