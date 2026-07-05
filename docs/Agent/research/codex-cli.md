---
key: codex-cli
name: OpenAI Codex CLI
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- CRATE COUNT: Original brief says the codex-rs workspace has '~70 crates' (repeated in the components list). Verified directly against the workspace Cargo.toml on GitHub main: it defines ~137 member crates (DeepWiki independently says 'over 120'). Corrected to ~130+ crates. The '~70' figure came from an early secondary analysis and is a material undercount.
- STATELESS / previous_response_id: Original brief states every request is stateless because it sends 'full conversation history sent, not previous_response_id.' The primary OpenAI compaction docs (developers.openai.com/api/docs/guides/compaction) show BOTH patterns are supported: stateless input-array chaining AND previous_response_id chaining. Corrected to say Codex favors stateless input-array chaining for ZDR/portability, but previous_response_id chaining is also a supported mode, not excluded.
- WAU GROWTH FRAMING: Original brief says Codex Cloud 'reached 2 million weekly active users by March 2026, fivefold increase since January 2026.' Verified: it was ~2M WAU by mid-March 2026, but the fivefold figure refers to USAGE growth since the start of 2026, while USER growth was ~3x. Also, this is a dated snapshot: OpenAI reported 5M+ weekly active users later in 2026, so as of the brief's 'today' (July 2026) the current figure is higher. Corrected wording to distinguish usage-growth vs user-growth and to flag 2M as a March snapshot.
- TERMINAL-BENCH NUMBERS: Original brief cites '83.4% Codex / 78.9% Claude Code on Terminal-Bench 2.1' (already low-confidence). Re-verification found third-party sources disagree materially (e.g., Opus 4.8 reported at both 74.6% and 78.9%; GPT-5.5 at both 78.2% and 83.4%). Demoted from a stated figure to an explicitly unreliable, harness-dependent, third-party-only data point that should not be presented as fact.
- LINUX SANDBOX MECHANISM: Original brief lists Linux enforcement as 'Landlock/seccomp or Bubblewrap/bwrap.' Current primary sandboxing docs lead with Bubblewrap (bwrap) as the Linux/WSL2 mechanism; Landlock/seccomp reflects earlier/secondary framing. Corrected to present Bubblewrap (bwrap) as the current documented Linux mechanism, with Landlock/seccomp noted as historically referenced.
- MACOS 'DEPRECATED sandbox-exec': The original brief flagged uncertainty about macOS using 'deprecated sandbox-exec.' Primary docs describe it simply as the 'built-in Seatbelt framework' with no deprecation note. Removed the 'deprecated' characterization as unverified; presented as Seatbelt framework per official docs.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- '~70 crates in codex-rs' — REFUTED by the actual Cargo.toml (~137 member crates).
- 'Every request is stateless, not previous_response_id' — DUBIOUS/overstated; primary docs show previous_response_id chaining is also supported.
- 'Fivefold increase in [users] since January 2026' — MISLEADING; fivefold refers to usage, ~3x to users.
- Terminal-Bench 2.1 scores 83.4% vs 78.9% — DUBIOUS; third-party figures conflict (also seen as 78.2% and 74.6%); no primary OpenAI/Anthropic source. Harness-dependent.
- macOS Seatbelt described as 'deprecated sandbox-exec' — UNVERIFIED; official docs call it the built-in Seatbelt framework without a deprecation note.
- GPT-5.5 release date 'April 23, 2026' (from the brief's uncertainties) — UNCONFIRMED against a primary OpenAI announcement; left out of the final brief as a stated fact.

**尚未解决的问题:**
- Exact codex-rs crate count fluctuates with releases; verified as ~137 in the current main Cargo.toml, but this is a moving target across the frequent (every 3-7 day) releases. Cite as '~130+' rather than a fixed number.
- project_doc_max_bytes default: widely cited as 32 KiB but the config-reference page fetched did not state a numeric default explicitly. Confirm against a specific config-reference revision before publishing '32 KiB' as fact.
- Terminal-Bench 2.1 scores for GPT-5.5/Codex vs Opus 4.8/Claude Code: no primary OpenAI or Anthropic source; third-party figures conflict (Opus 4.8 seen at 74.6% and 78.9%; GPT-5.5 at 78.2% and 83.4%). Harness-dependent. Do not publish a specific number as fact.
- GPT-5.5 exact model ID and release date (a secondary 'April 23, 2026' claim exists) could not be confirmed from a primary OpenAI announcement; primary openai.com/codex pages returned errors. Leave unstated or attribute cautiously.
- Whether 'Codex Security' (March 2026, application-security agent) is a standalone product or a Codex Cloud feature is not fully clarified in primary sources; Wikipedia describes it as an introduced agent without specifying packaging.
- The precise date the Rust build became the default over TypeScript (vs merely 'announced in June 2025') is not pinned to a single primary changelog entry.
- Whether Landlock/seccomp is still used on Linux alongside Bubblewrap: current primary sandboxing docs lead with bwrap; the Landlock/seccomp framing appears in older/secondary material and was not confirmed as current.

---
## OpenAI Codex CLI — Verified Source Brief (as of July 2026)

### What it is + who/when
OpenAI Codex CLI is an open-source, terminal-based coding agent built and maintained by OpenAI. It reads, edits, and executes code in a developer's local environment with AI assistance, running inside an OS-native sandbox.

- **Launched:** April 16, 2025 as an **open-source TypeScript/Node.js** project ([github.com/openai/codex](https://github.com/openai/codex); [developers.openai.com/codex/cli](https://developers.openai.com/codex/cli)).
- **Rewritten to Rust:** June 2025 ([InfoQ, June 2025](https://www.infoq.com/news/2025/06/codex-cli-rust-native-rewrite/)). The codebase is now **96.5% Rust** (2.7% Python, plus small amounts of Starlark/TypeScript/Shell/PowerShell) per the GitHub repo.
- **License:** Apache-2.0. **Install:** curl/PowerShell scripts, `npm i -g @openai/codex`, Homebrew, or direct binary downloads ([github.com/openai/codex](https://github.com/openai/codex)).
- **Distinct from legacy 2021 Codex** (a fine-tuned GPT-3 code-completion model). The 2025+ Codex is a full agentic system with tool use, sandboxing, multi-turn loops, and cloud execution.
- **Surfaces:** CLI, Codex Cloud (async cloud tasks + GitHub PRs), desktop app (Windows/macOS), VS Code extension, and JetBrains/Xcode integrations.
- **Repo metrics (verified July 2026):** 95.4k stars, 14.1k forks, 515 watchers, 894 releases, 7,935 commits on main; latest release **v0.142.5 (July 1, 2026)**; releases roughly every 3–7 days ([github.com/openai/codex](https://github.com/openai/codex); [changelog](https://developers.openai.com/codex/changelog)).
- **Adoption:** Codex surpassed ~2M weekly active users by mid-March 2026 (usage up ~5x, users up ~3x since the start of 2026) and OpenAI later reported **5M+ weekly active users** in 2026 ([Wikipedia](https://en.wikipedia.org/wiki/Codex_(AI_agent)); [Constellation Research](https://www.constellationr.com/insights/news/openai-touts-broadening-codex-usage-5-million-weekly-active-users)).

### Architecture & named components
The CLI is a Rust Cargo **workspace at `codex-rs/` containing ~137 member crates** (verified against the workspace Cargo.toml; DeepWiki says "over 120") ([Cargo.toml on main](https://github.com/openai/codex/blob/main/codex-rs/Cargo.toml); [DeepWiki repo structure](https://deepwiki.com/openai/codex/1.2-repository-structure)). It is layered:

- **`codex-cli`** — multitool dispatcher / unified entry point.
- **`codex-tui`** — interactive fullscreen TUI built on the **Ratatui** framework.
- **`codex-exec`** — headless non-interactive runner (`codex exec 'PROMPT'`).
- **`codex-core`** — reusable library crate OpenAI intends to publish for embedding agents; owns session/thread management, tool dispatch, and context compaction.
- **`protocol`** and **`app-server*`** crates (`app-server`, `app-server-protocol`, `app-server-transport`, `app-server-client`, `app-server-daemon`) — the protocol/event layer connecting clients (TUI/CLI/SDK) to the engine, using a Submission/Event system.
- **Sandbox crates:** `sandboxing`, `linux-sandbox`, `bwrap`, `process-hardening`.
- **Extensions (`ext/`):** MCP, web-search, connectors, guardian, skills, memories, image-generation, etc.

**Substrate:** The agent loop drives the OpenAI **Responses API** with **Server-Sent Events (SSE)** streaming. CLI, Cloud, and the SDK share the Responses API as the common substrate.

### How one task flows through it (step-by-step)
1. **Invoke:** User runs `codex` (TUI) or `codex exec 'PROMPT'`. Layered **AGENTS.md** files (global `~/.codex/AGENTS.md` → project root → directory-level, closer files overriding) are concatenated into the system-instruction prefix ([AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)).
2. **Prompt construction:** Codex assembles system instructions + tool definitions (Responses API schema) + conversation history. The stable prefix is preserved to maximize prompt-cache hits.
3. **API call:** Sent via HTTP POST to the Responses API; response streams back as SSE (`response.output_text.delta` deltas surface live in the TUI).
4. **Response evaluation:** A final assistant message ends the turn; a tool call proceeds to approval.
5. **Approval gate:** The active **approval policy** is checked — `untrusted` (only known-safe reads auto-run), `on-request` (interactive prompt when an action exceeds sandbox boundaries), or `never` (no prompts, for CI/CD). Optionally `approvals_reviewer = "auto_review"` routes eligible requests to a reviewer agent ([agent-approvals-security](https://developers.openai.com/codex/agent-approvals-security)).
6. **Sandbox enforcement:** The tool runs inside the OS-native sandbox. The sandbox is the hard technical boundary; the approval policy is the soft consent layer.
7. **Result appended:** Tool output is appended to the buffer and the loop returns to step 3. When token counts grow large, **context compaction** triggers via `POST /responses/compact` ([OpenAI compaction docs](https://developers.openai.com/api/docs/guides/compaction)).
8. **Termination:** The loop ends when the model returns an assistant message (not a tool call). In `exec` mode the final message can be captured via `--output-last-message`.

### Distinctive design decisions & tradeoffs
- **Rust rewrite (June 2025):** Drops the Node.js runtime for zero-dependency binaries, reaches OS sandbox APIs natively (no FFI overhead), avoids GC pauses in long agent loops, and exposes a language-agnostic protocol so TypeScript/Python SDKs can extend the agent without rewriting the core ([InfoQ](https://www.infoq.com/news/2025/06/codex-cli-rust-native-rewrite/)).
- **Stateless-friendly agent loop:** Codex favors **stateless input-array chaining** (append outputs/compaction items into the next input array), which is Zero-Data-Retention-friendly and portable across providers. Note: `previous_response_id` chaining is **also** a supported pattern, not excluded ([compaction docs](https://developers.openai.com/api/docs/guides/compaction)). Prompt caching on stable prefixes keeps cost near-linear despite full-history sends.
- **Two-layer security model:** **Sandbox** (capability: what CAN happen) is orthogonal to **approval policy** (consent: when to ASK). Three sandbox modes — `read-only`, `workspace-write` (default), `danger-full-access` — pair with the three approval policies ([sandboxing docs](https://developers.openai.com/codex/concepts/sandboxing)).
- **Platform-native sandboxing:** **Seatbelt framework** on macOS; **Bubblewrap (bwrap)** on Linux/WSL2; **native Windows sandbox** in PowerShell (WSL2 uses the Linux bwrap path) ([sandboxing docs](https://developers.openai.com/codex/concepts/sandboxing)).
- **Context compaction via `/responses/compact`:** Compresses history into an encrypted `type=compaction` item (`encrypted_content`) that preserves the model's latent state rather than a naive text summary; the encrypted blob transits the client without exposing conversation content ([OpenAI compaction docs](https://developers.openai.com/api/docs/guides/compaction)).
- **AGENTS.md for context injection:** Hierarchical markdown files (analogous to `.gitignore` layering) provide persistent per-project instructions with a `project_doc_max_bytes` cap (commonly cited as 32 KiB default; see uncertainties).
- **MCP as extensibility:** Third-party tools integrate via Model Context Protocol (`mcp_servers` in config), supporting both **stdio** and **HTTP streamable** servers ([config-reference](https://developers.openai.com/codex/config-reference)).
- **Auto-reviewer:** `approvals_reviewer = "auto_review"` delegates consent to a reviewer agent that checks for data exfiltration, credential probing, persistent security-weakening, and destructive actions; it fails closed on prompt-build/review/parse failures ([agent-approvals-security](https://developers.openai.com/codex/agent-approvals-security)).
- **Multi-agent by default:** `features.multi_agent` is on by default; `max_threads` defaults to **6**, `max_depth` defaults to **1** (root sessions start at depth 0), limiting runaway recursion ([config-reference](https://developers.openai.com/codex/config-reference)).

### Models (as of mid-2026)
`gpt-5.5` (recommended default), `gpt-5.4`, `gpt-5.4-mini` (fast, for subagents), and `gpt-5.3-codex-spark` (text-only research preview, ChatGPT Pro only). `gpt-5.2` and `gpt-5.3-codex` are deprecated for ChatGPT sign-in ([models docs](https://developers.openai.com/codex/models)). GPT-5.3-Codex-Spark launched ~Feb 12, 2026 as a lower-latency variant ([Wikipedia](https://en.wikipedia.org/wiki/Codex_(AI_agent))). Codex Cloud's research preview (May 16, 2025) was originally powered by **codex-1**, an o3 reasoning model optimized for software engineering.

### How it differs from peers
- **vs Claude Code (Anthropic):** Codex uses OS-native sandboxing (Seatbelt/bwrap) as a hard technical boundary and ships as a zero-dependency Rust binary; Claude Code is a Node.js package relying primarily on permission prompts/config. Both support AGENTS.md-style instruction files and MCP.
- **vs Gemini CLI (Google):** Gemini CLI emphasizes larger context and multimodal input; its free tier ended June 18, 2026. Both are open-source, but Codex is tied to OpenAI models.
- **vs legacy 2021 Codex:** completion model then; full agentic system now.
- **Benchmarks:** Terminal-Bench 2.1 comparisons circulate (e.g., GPT-5.5/Codex ~78–83%, Opus 4.8 ~75–79%) but figures **conflict across third-party sources and are harness-dependent** — treat as indicative only, not verified fact.

### Teaching hooks
1. **Sandbox vs approval as orthogonal axes** — "sandbox says what the agent CAN do; approval policy says what it must ASK before doing." Explains why `workspace-write` + `on-request` is the interactive default.
2. **Stateless loop + prompt caching** — a concrete lesson in the cost of growing context: keep the stable prefix (system + tool defs) long and unchanging so only the tail varies, keeping cost near-linear.
3. **AGENTS.md as operator-level control** — layered trust (global → project → dir) distinguishes operator constraints from user instructions, analogous to system prompts and `.gitignore` hierarchies.
4. **Rust rewrite as an engineering case study** — Node.js was fine for prototyping but had dependency/GC friction in long loops; exposing a language-agnostic wire protocol (rather than forcing Rust extensions) is a reusable extensibility pattern.
5. **Auto-reviewer as a multi-agent trust hierarchy** — one agent works, a second audits before execution, enabling safer full-auto pipelines; the pattern generalizes to any agentic system needing a second check.
6. **Cloud vs CLI spectrum** — local/interactive vs cloud/async execution teaches when to pick each deployment pattern (exploratory vs long-horizon background tasks).