---
key: hermes
name: Hermes Agent (Nous Research)
category: 影响力 harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- GitHub stars: The brief's '27,000+ stars within two months' is a stale April 2026 (v0.9.0-era) figure from a secondary blog. As of July 2026 the repo is at roughly 209,000 stars (per github.com/NousResearch/hermes-agent). Corrected to reflect the current count and flagged the 27K figure as a historical snapshot.
- v0.13.0 release date: The brief dates the Kanban board / multi-agent release to 'April 2026'. The official release ('The Tenacity Release', tag v2026.5.7) is dated May 7, 2026. Corrected to May 2026. (April 2026 in the release timeline corresponds to v0.11.0 on Apr 23 and v0.12.0 on Apr 30.)
- Provider count: The brief's 'over 60 inference providers / 30+ named providers' and the architecture section's '~60 providers' are not supported by the official docs, which advertise '300+ frontier agentic models' (aggregated largely via Nous Portal) and enumerate roughly 24 first-class named providers. Corrected to '300+ models across ~24 named first-class providers (any OpenAI-compatible endpoint also works).'
- Provider names: Several provider names in the brief's enumeration (opencode-zen, alibaba-coding-plan, tencent-tokenhub, copilot-acp) do not appear in the official provider list and could not be verified; removed them from the confirmed list and replaced with the documented named providers (Nous Portal, OpenRouter, Anthropic, OpenAI Codex, GitHub Copilot, AWS Bedrock, xAI, Gemini/Vertex, DeepSeek, z.ai/GLM, Kimi/Moonshot, Qwen, MiniMax, NVIDIA NIM, Ollama Cloud, LM Studio, Azure AI Foundry, etc.).
- Codename precision: The brief attaches codenames only to v0.11.0-era items loosely. Confirmed and added the official codenames: v0.13.0 'The Tenacity Release' (May 7), v0.16.0 'The Surface Release' (Jun 5), v0.17.0 'The Reach Release' (Jun 19), v0.18.0 'The Judgment Release' (Jul 1). Note release tags use date form (e.g., v2026.7.1), which is why a direct /releases/tag/v0.18.0 URL 404s.
- BedrockTransport sourcing: The official agent-loop.md lists only three API modes (chat_completions, codex_responses, anthropic_messages) and does not mention Bedrock. BedrockTransport (AWS Converse API, added v0.11.0) is real and documented elsewhere (v0.11.0 coverage + AWS Bedrock docs), so the claim stands, but the agent-loop.md citation for the four-transport list is imprecise; adjusted the source attribution.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- '27,000+ GitHub stars within two months' as a current/defining stat — DUBIOUS as presented. True historically (~April 2026) but badly understates the July 2026 reality (~209K). Do not present 27K as the current figure.
- 'v0.13.0 (April 2026)' for the Kanban/multi-agent release — REFUTED. Correct date is May 7, 2026.
- '60+ inference providers... 30+ named providers' — DUBIOUS/UNVERIFIED. Official framing is '300+ models' via aggregation and ~24 named first-class providers. The specific 60/30 counts are not supported.
- Provider names 'opencode-zen', 'alibaba-coding-plan', 'tencent-tokenhub', 'copilot-acp' — UNVERIFIED. Not found in official provider docs; likely fabricated, mis-transcribed, or version-specific.
- 'Hermes-4-405B (128K context) via Nebius Token Factory' from a substack source — CORRECTLY flagged by the original brief as noise: this conflates the Hermes LLM series with the Hermes Agent harness. It is NOT a fact about the harness.
- agent-loop.md as the source for a four-transport list including BedrockTransport — DUBIOUS sourcing. That doc lists only three API modes; Bedrock support is documented separately.

**尚未解决的问题:**
- Exact first-release date: '~February 2026' is asserted by community sites (hermes-agent.org), not stated prominently in the official repo. The earliest documented releases in the visible changelog are the v0.11.x/v0.12.x line (late April 2026); the true v0.1.0 date is unconfirmed.
- Whether the 'app-server' path (CodexAppServerSession) is fully distinct from the codex_responses transport mode, or a layer on top of the same Codex integration — docs describe them as related but the boundary is not crisply defined.
- The ProviderProfile ABC (third-party provider plugins) exists (referenced around v0.13.0 / issue #413) but its exact API surface is not verified in official docs.
- Whether Honcho user modeling writes its own persistent store independent of MEMORY.md/USER.md, or layers on top of them, is not clear from public sources.
- Governance of the agentskills.io standard — whether Nous Research created/governs it or merely adopts a third-party community standard — is unconfirmed.
- Exact current GitHub star count fluctuates; ~209K is the July 2026 reading and should be treated as approximate.
- The precise number and names of tool-call parsers (brief said '11') could not be confirmed in official docs; the count may be version-specific.

---
## Hermes Agent (Nous Research) — Verified Source Brief

*Fact-checked July 2026. Confidence: high for architecture/mechanics; medium for a few version-specific counts (noted inline).*

### What it is + who/when

**Hermes Agent** is an open-source, self-improving, model-agnostic AI **agent harness** from **Nous Research** — explicitly **NOT** the Hermes LLM series (Hermes-4 etc.). It is a persistent, autonomous agent daemon designed to run on your own infrastructure (advertised as running on anything "from a $5 VPS to a GPU cluster") and to reach you through the messaging platforms you already use.

- **License:** MIT. **Language:** primarily Python (~82%) with a TypeScript TUI/desktop layer.
- **First released:** ~February 2026 (widely reported; the exact date is asserted by community sites like hermes-agent.org rather than stated prominently in the official repo — treat "Feb 2026" as approximate).
- **Latest version (as of July 1, 2026):** **v0.18.0 "The Judgment Release"** (git tag `v2026.7.1`). Source: https://github.com/NousResearch/hermes-agent/releases
- **Popularity:** ~**209,000 GitHub stars** as of July 2026. (An often-cited "27,000+ stars in two months" figure is a stale April-2026 / v0.9.0-era snapshot — do not present it as current.)
- **Requires:** Python 3.11. Installable via `pip install hermes-agent` (packaging added in the v0.14.0 timeframe). Primary config: `~/.hermes/config.yaml` (+ `.env` for secrets). Repo: https://github.com/NousResearch/hermes-agent
- **Positioning:** a "full harness" that builds all five harness components — identity/instructions (SOUL.md), hooks/constraints, memory, feedback/learning loop, and orchestration — automatically rather than by hand. Its headline differentiator is a **closed learning loop**: it creates skills from experience, refines them in use, persists facts about you, and searches its own past sessions.

### Architecture & named components

Python persistent daemon with a layered design. **Verified components:**

- **`AIAgent` class in `run_agent.py`** — core orchestrator. Unified entry point method **`run_conversation()`** (a thin `chat()` wrapper returns just the final string). All surfaces converge here. *(Verified in official agent-loop.md.)*
- **Surfaces:** interactive CLI/TUI (Ink/React frontend over a `tui_gateway` JSON-RPC service), long-running **messaging gateway** (`gateway/run.py`), native **desktop app** (Electron; macOS/Linux/Windows, added v0.16.0), scheduled cron jobs, API server, and an ACP/batch runner.
- **Provider/transport resolution** (`agent/runtime_provider.py`): three documented **API modes** — `chat_completions` (OpenAI-compatible), `codex_responses` (OpenAI Responses/Codex API), `anthropic_messages` (native Anthropic). A **fourth Bedrock path** (AWS Converse API) was added in **v0.11.0** (documented separately from agent-loop.md). Resolution order: explicit `api_mode` arg → provider-name heuristic → base-URL heuristic → default `chat_completions`. Source: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/agent-loop.md
- **Transport layer** (`agent/transports/`): format-conversion + HTTP transport refactored in **v0.11.0** into per-shape classes — **AnthropicTransport, ChatCompletionsTransport, ResponsesApiTransport, BedrockTransport** — each owning its own API format. Plus an optional **`CodexAppServerSession`** (JSON-RPC subprocess to the Codex CLI app-server).
- **Tool system:** central registry (`tools/registry.py`) with **47 tools across 20 toolsets** upstream (installs commonly expose fewer, since many toolsets are opt-in). **Registration (import time) is deliberately separated from exposure (per-run, model-visible toolset selection).** Dangerous-command classification via `tools/approval.py`. Four **agent-intercepted** tools — `todo`, `memory`, `session_search`, `delegate_task` — bypass the registry and mutate agent state directly. Source: https://arize.com/blog/how-hermes-implements-open-source-agent-harness-architecture/
- **Skill system:** Markdown skill files in `~/.hermes/skills/` following the open **agentskills.io** standard; `skill_manage` tool (create/patch/edit/delete). **Three-level progressive disclosure:** L0 `skills_list()` metadata (~3k tokens) → L1 `skill_view(name)` full content → L2 `skill_view(name, path)` reference file. Community "Skills Hub" tap (includes an `NVIDIA/skills` trusted tap, added v0.16.0).
- **Memory system (layered):** (a) prompt memory — **`MEMORY.md`** (2,200 chars / ~800 tokens) and **`USER.md`** (1,375 chars / ~500 tokens) in `~/.hermes/memories/`, injected as a **frozen snapshot at session start** to preserve the LLM prefix cache; (b) **session search** — SQLite + FTS5 with auxiliary-LLM summarization for cross-session recall; (c) skills as procedural memory; (d) **Honcho** (Plastic Labs) dialectic user modeling. Additional external memory providers are pluggable.
- **Auxiliary model client** (`agent/auxiliary_client.py`): offloads side tasks (compression, vision, web-page summarization, dangerous-command classification, session-search summarization, skill matching, MCP tool dispatch, memory flush) to a cheaper fast model — **Gemini Flash by default**, via an auto-detection chain (OpenRouter → Nous → Codex).
- **Persistence** (`hermes_state.py`): **SQLite with FTS5 full-text search and WAL journaling** at `~/.hermes/state.db`; CLI and gateway sessions share one session plane.
- **System prompt assembly** (`agent/prompt_builder.py`): three tiers — **stable** (identity/SOUL.md, tool guidance, skills index, env hints), **context** (project files via `AGENTS.md` with injection scanning), **volatile** (MEMORY.md/USER.md, external blocks, timestamps/metadata). Anthropic prefix-cache markers injected via `agent/prompt_caching.py`.
- **Multi-agent:** `delegate_task` spawns in-process child `AIAgent` instances with restricted toolsets and capped budgets. A durable **Kanban board** (added **v0.13.0, "The Tenacity Release," May 7, 2026** — *not April*) adds heartbeats, task reclaim, zombie detection, a hallucination gate, and per-task `max_retries`.

### How one task flows through it (step-by-step)

Example: *"Analyze this codebase and write a report."*

1. **Ingestion** — message arrives via CLI, a gateway platform adapter (e.g., Telegram `on_message()`), or API. Gateway resolves a per-user/per-platform session key and authorizes via pairing codes.
2. **Loop entry** — `AIAgent.run_conversation()` assigns a task ID and appends the user message to in-memory history.
3. **Prompt assembly** (`prompt_builder.py`) — builds the 3-tier system prompt; MEMORY.md/USER.md injected as a frozen snapshot; cache markers added.
4. **Preflight compression check** — if history exceeds the trigger threshold, compress before the API call (see below).
5. **Provider/transport resolution** (`runtime_provider.py`) — pick provider + API mode by the priority chain; apply credential-pool rotation / fallback.
6. **API call** — the matching transport formats history into the provider's shape and streams the response.
7. **Tool dispatch** (`model_tools.py` + `tools/registry.py`) — single tool call runs in the main thread; **multiple calls run concurrently via `ThreadPoolExecutor`**, except **interactive tools (e.g., `clarify`) force sequential execution**. Per call: resolve handler → `pre_tool_call` hook → dangerous-command check (`approval.py`) → execute → `post_tool_call` hook → append result. Agent-intercepted tools mutate agent state directly.
8. **Loop continuation** — append tool results, repeat until a text-only response (done), the iteration budget is hit (**default 90 turns**, returns a work summary), or user interrupt.
9. **Skill-creation check** — after 5+ tool calls, error recovery, user corrections, or a non-obvious workflow, the agent autonomously writes a skill (`skill_manage` create) to `~/.hermes/skills/`.
10. **Persistence & delivery** — final state persists to SQLite (FTS5-indexed); MEMORY.md/USER.md flush to disk; the reply returns to the originating surface.

*Sub-agent delegation:* `delegate_task` spawns a child agent with a restricted toolset and its own budget (**default 50 iterations** for subagents). **Background mode (v0.17.0+):** `delegate_task(background=true)` returns a handle immediately; results re-enter as new turns. Kanban heartbeats track liveness; a missed heartbeat marks a worker suspect for reclaim.

*Budget pressure:* warnings inject into context at **70% (caution)** and **90% (critical)** of the iteration budget (e.g., `[BUDGET: 63/90. 27 iterations left.]`).

### Context compression (verified numbers)

Triggers at **~50% of the context window** by default (the gateway uses a more aggressive threshold). Process: flush memory → summarize the middle turns via the auxiliary model → **protect head and tail segments** (tail default ~20 messages) → keep tool-call/result pairs together. **Summary budget ≈ 20% of compressed content, with a 2,000-token floor and 12,000-token ceiling.** Rather than rewriting the transcript, compression **closes the current SQLite session row, creates a child session seeded by the summary, rotates the session ID, and records parent-child lineage** (transcripts are never mutated; subsequent compressions pass the prior summary for incremental update). Source: https://arize.com/blog/how-hermes-implements-open-source-agent-harness-architecture/

### Distinctive design decisions & tradeoffs

1. **Registration vs. exposure separation** — a large installed tool library, but a small model-visible surface per run (cuts context bloat and prompt-injection surface).
2. **Lineage-based compression over transcript rewriting** — auditable, debuggable, queryable parent→child chains.
3. **Frozen memory snapshot** — MEMORY.md/USER.md injected once at session start specifically to preserve prefix-cache hits (matters for Anthropic cache-write pricing).
4. **Auxiliary-model pattern** — cheap fast model (Gemini Flash) for side tasks keeps the primary context clean and lowers cost/latency.
5. **Sessions as first-class infrastructure** — SQLite + FTS5 + WAL shared across CLI, gateway, and cron enables cross-session search, durable coordination, and resume-after-interrupt.
6. **Codex app-server as an optional wrapper** — when `openai/*` or `openai-codex/*` models are used, Hermes can hand the turn to a Codex CLI subprocess over JSON-RPC and act as the *shell* (sessions DB, slash commands, gateway, memory, skill review). **Tradeoff:** gains Codex's sandboxing/plugin ecosystem (`shell`, `apply_patch`, `update_plan`, Linear/GitHub/Gmail plugins, etc.) but **loses `delegate_task`, `memory`, and `session_search`** (they need live mid-loop `AIAgent` state a stateless MCP callback can't drive; Codex's `update_plan` substitutes for `todo`). Revert with `/codex-runtime auto`. Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/codex-app-server-runtime
7. **Kanban for swarm durability** — heartbeats + reclaim + zombie detection + hallucination gate instead of fire-and-forget spawning.
8. **agentskills.io open standard** — portable, shareable skills rather than a proprietary format.
9. **Mixture-of-Agents (v0.18.0)** — MoA is now a **first-class selectable model** in every picker; each reference model shows its own labeled reasoning block and the aggregator's synthesis streams live. Reliability at the cost of extra API calls.

### How it differs from peers

- **vs. Claude Code:** Claude Code is Anthropic-only and IDE/CLI-centric with `CLAUDE.md` as its context mechanism and no built-in learning loop or messaging gateway. Hermes is model-agnostic (300+ models), treats sessions as infrastructure (SQLite+FTS5), and can even **drive Claude Code as a sub-agent** (`claude-code` skill).
- **vs. OpenHands:** Both are model-agnostic (OpenHands via LiteLLM). Hermes uses OpenHands as an **execution backend**, delegating through the terminal tool with `--headless --json --override-with-envs --exit-without-confirmation` and consuming a JSONL stream of `MessageEvent` / `ActionEvent` / `ObservationEvent`. OpenHands focuses on coding; Hermes is general-purpose with broad platform reach. Source: https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-openhands
- **Sibling sub-agent skills:** `claude-code` (Anthropic-native), `codex` (OpenAI-native), `opencode` (multi-provider), `openhands` (model-agnostic via LiteLLM), and `hermes-agent` (Hermes subagents via `delegate_task`).
- **vs. AutoGPT-era agents:** formal session infra, structured compression-with-lineage, and a community skill standard replace ad-hoc memory.
- **vs. LangGraph/LangChain:** those are libraries/frameworks for building agent graphs; Hermes is an end-to-end deployable product (UI surfaces, gateway, skill ecosystem).
- **vs. Cursor/Copilot:** IDE-coupled assistants without persistent cross-session memory, a multi-platform gateway, or autonomous skill creation.
- **Core differentiator:** the **closed learning loop** — autonomous skill creation from successful trajectories → agentskills.io format → progressive-disclosure injection → in-place skill improvement via patch. Nous emphasizes this as the primary architectural distinction; no comparable OSS harness ships it as a first-class built-in.

### Messaging & extensibility (verified)

- **Gateway: 22 messaging channels** — Telegram, Discord, Slack, WhatsApp (official Business Cloud API), Signal, SMS, Email, Matrix, LINE, SimpleX, iMessage (BlueBubbles relay, and **relay-free via Photon in v0.17.0**), Home Assistant, Mattermost, DingTalk, Feishu/Lark, WeCom, WeChat, QQBot, Microsoft Teams, Tencent Yuanbao, Google Chat, generic Webhook, and the **Raft agent network** (added as a gateway channel in v0.17.0; content-free "wake" bridge). Source: https://blakecrosley.com/guides/hermes
- **Six terminal backends:** local (default), docker (hardened containers), ssh, singularity (HPC), modal (serverless), daytona (persistent cloud workspace).
- **MCP:** external MCP servers via `hermes mcp add` (command- or URL-based); Hermes also runs as an MCP server (`hermes mcp serve`).
- **Plugins:** discovered from `~/.hermes/plugins/`, `.hermes/plugins/`, and pip entry points; types = Tool / Hook / Memory-provider; lifecycle hooks include `pre_tool_call`, `post_tool_call`, `tool_progress_callback`, `step_callback`. A **`ProviderProfile` ABC** (v0.13.0-era) lets third parties add providers without editing core (API surface not fully verified — see uncertainties).
- **Providers:** **300+ models** reachable, largely via Nous Portal aggregation, across ~24 named first-class providers (Nous Portal, OpenRouter, Anthropic, OpenAI/OpenAI Codex, GitHub Copilot, AWS Bedrock, xAI, Google Gemini/Vertex, DeepSeek, z.ai/GLM, Kimi/Moonshot, Qwen, MiniMax, NVIDIA NIM, Ollama Cloud, LM Studio, Azure AI Foundry, Hugging Face, Arcee, GMI, NovitaAI, and any OpenAI-compatible custom endpoint). Source: https://hermes-agent.nousresearch.com/docs/integrations/providers
- **Research tooling:** batch trajectory generation and Tinker-Atropos RL environments for fine-tuning research; ShareGPT export; multiple tool-call parsers (a "separate self-evolution repo, `hermes-agent-self-evolution`, uses DSPy + GEPA to optimize skills/prompts/code).

### Teaching hooks (pedagogically interesting)

1. **The closed learning loop as the core novelty** — trace a concrete 5-tool-call task → Markdown skill file → progressive-disclosure retrieval → patch-based self-improvement. Mechanistically inspectable end-to-end.
2. **Tool registration vs. exposure** — a clean, broadly applicable principle: "know about many tools, show the model only what this task needs."
3. **Compression with lineage** — contrast summarize-middle / protect-tail / child-session-with-parent-ID against naive truncation or sliding windows; the **20% / 2k-floor / 12k-ceiling** budget is a concrete teachable policy.
4. **Auxiliary models for side tasks** — a real production pattern: route compression, dangerous-command classification, and skill matching to a cheap fast model (Gemini Flash), keeping the expensive primary model focused.
5. **Provider-abstraction depth** — four transport classes plus the optional Codex app-server path make "what provider abstraction actually means in code" concrete (impedance-matching different API shapes).
6. **Frozen memory snapshot for cache efficiency** — a vivid example of how memory-injection design directly interacts with inference cost (prefix-cache hit rate).
7. **Durable multi-agent coordination (Kanban)** — heartbeats/reclaim/zombie-detection/hallucination-gate teach why task orphaning is a real production failure mode that fire-and-forget spawning ignores.