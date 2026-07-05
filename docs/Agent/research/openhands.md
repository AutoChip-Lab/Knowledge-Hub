---
key: openhands
name: OpenHands (formerly OpenDevin)
category: 自主 SWE agent
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- FUNDING (incomplete, now corrected): The original brief lists only the $18.8M Series A. All Hands AI actually raised in two rounds: a $5M seed (led by Menlo Ventures, Sep 2024) and an $18.8M Series A (Nov 2025), for ~$23.8M total. Both are now stated.
- GITHUB ORG RENAME (clarified): The brief's repo URL 'OpenHands/OpenHands' initially looked suspicious (the paper/history use 'All-Hands-AI/OpenHands'), but verification confirms the GitHub organization was renamed from All-Hands-AI to OpenHands. Both URLs resolve (GitHub preserves the redirect). 'OpenHands/OpenHands' is the current canonical location. Corrected the brief to note this rename explicitly so a writer isn't confused by older sources.
- REPO POSITIONING (updated): The current repo description is 'The self-hosted developer control center for coding agents and automations' — a repositioning from a single-agent Devin clone toward a multi-agent/orchestration control center. The brief's framing as purely 'an autonomous SWE agent platform' is dated; added the control-center framing.
- SDK PAPER DATE (corrected): The brief cites the SDK paper as v1 (Nov 5, 2025). It was revised April 22, 2026. Benchmarks in it are on SWE-Bench Verified AND GAIA (the brief mentioned only SWE-Bench). Added GAIA.
- TERMINOLOGY (clarified): 'Microagents' have been renamed 'Skills' in current docs; '.openhands/microagents/' still works for backward compatibility. The brief used 'Microagents / Skills' interchangeably without noting Skills is now the primary term — clarified.
- OPENHANDS INDEX (made precise): The brief said '5 SWE task categories using 9+ models.' Confirmed exactly 9 models and named the 5 categories with their underlying benchmarks (SWE-Bench Verified, commit0, SWE-Bench Multimodal, SWT-Bench, GAIA). Top model is 'Claude 4.5 Opus' (exact naming), second is gpt-5.2-codex.
- SDK PACKAGE NAMING (noted): The SDK paper writes packages with dots (openhands.sdk) while the repo folders use hyphens (openhands-sdk). Both are legitimate (namespace vs. distribution name); noted to avoid a writer flagging it as a discrepancy.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- 'Software Engineer 2.5 LM' — CONFIRMED NON-EXISTENT. No such named All Hands AI model/product appears on openhands.dev, GitHub, the papers, or 2026 blog posts. (This term came from the upstream task prompt, not from this brief's keyFacts; the brief already correctly flagged it. Do NOT include it in teaching material.)
- '77.6 SWEBench score' in the software-agent-sdk README — VERIFIED PRESENT as a badge, but still has no model pairing, date, or methodology. It does not match the paper's headline 72.8% (Claude Sonnet 4.5). Treat as an unlabeled marketing badge, not a citable benchmark result.
- 'LLMSummarizingCondenser reduces API costs up to 2x with no degradation in agent performance' — VERIFIED as a verbatim claim in the SDK paper, but the paper does not specify the benchmark/task used to establish 'no degradation.' Present it as a vendor-reported figure, not an independently established fact.
- 'Runtime bundles Playwright Chromium + VSCode Web' specifically — The official runtime architecture doc confirms bash, Jupyter, a browser, and VSCode via the plugin system, but this particular doc excerpt does NOT name Playwright/Chromium as the browser engine or confirm 'VSCode Web' branding. The engine identity (Playwright/BrowserGym) is supported by the paper but is a slightly softer claim than the brief implies.

**尚未解决的问题:**
- The '77.6' SWE-Bench badge in the software-agent-sdk README still has no attached model, date, or methodology and does not reconcile with the paper's 72.8% (Claude Sonnet 4.5) — which run it refers to is unknown.
- The LLMSummarizingCondenser '2x cost reduction, no degradation' figure is a verbatim vendor claim in the SDK paper but the paper does not name the benchmark/task used to establish 'no degradation.'
- V0-to-V1 deprecation timeline: as of the June 2026 v1.40.0 release the repo still references both architectures, so migration appears incomplete; a firm V0 end-of-life date was not confirmed.
- The runtime browser engine (Playwright/Chromium) and 'VSCode Web' branding are supported by the platform paper but were not confirmed in the current official runtime-architecture doc excerpt, which describes them generically via the plugin system.
- No public detailed spec/documentation for the Agent-Client Protocol (ACP) was located from a primary source; only feature-level mentions in the repo and blog.
- The OpenHands Index summary names 'Claude 4.5 Opus' as winner over 9 models as of Jan 2026; a May 2026 '3 months out' update exists and may have shifted rankings — the latest exact leaderboard numbers were not re-fetched.

---
## OpenHands (formerly OpenDevin) — Source Brief

### What it is + who/when
**OpenHands** is an open-source, **MIT-licensed** platform for building and running AI software-engineering agents that act like a human developer: writing code, running shell commands, and browsing the web ([arXiv:2407.16741](https://arxiv.org/abs/2407.16741)). It began as **OpenDevin** in **early 2024**, a community response to Cognition's proprietary **Devin**, and was renamed **OpenHands** in **late 2024** under the company **All Hands AI**.

- **Funding:** ~$23.8M total — a **$5M seed** (led by Menlo Ventures, Sep 2024) and an **$18.8M Series A** (Nov 2025) ([TechCrunch](https://techcrunch.com/2024/09/05/all-hands-ai-raises-5m-to-build-open-source-agents-for-developers/), [Crunchbase](https://www.crunchbase.com/organization/all-hands-ai)).
- **Papers:** platform paper at **ICLR 2025** ([arXiv:2407.16741](https://arxiv.org/abs/2407.16741)); **OpenHands Software Agent SDK** paper ([arXiv:2511.03690](https://arxiv.org/abs/2511.03690), v1 Nov 2025, revised Apr 2026).
- **Repo / release:** GitHub org was **renamed All-Hands-AI → OpenHands**; canonical repo is now [github.com/OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) (older `All-Hands-AI/OpenHands` links redirect). **~79.3k stars**; latest **cloud release v1.40.0 (June 26, 2026)**. Current repo tagline: *"the self-hosted developer control center for coding agents and automations."*
- **Deployment:** self-hosted OSS + **OpenHands Cloud** SaaS. **Model-agnostic** via **LiteLLM** (100+ providers).

### Architecture & named components
Event-sourced, append-only design: every action and observation is a typed (Pydantic) event in an immutable **EventLog**, and all state is derived by replaying it.

- **V0 (legacy, being deprecated):** monolithic; mandatory Docker sandbox; sprawling config (**140+ fields, 15 classes, ~2.8K lines** — verified in the SDK paper); an **AgentController** loop reads/writes the EventStream.
- **V1 (current SDK, `OpenHands/software-agent-sdk`):** four packages — **openhands-sdk** (core agent, events, LLM abstraction), **openhands-tools** (terminal, file editor, browser, task tracker), **openhands-workspace** (local or containerized execution), **openhands-agent-server** (REST/WebSocket API). Agents are **stateless immutable specs**; all mutable state lives in one **ConversationState** (holding the EventLog). Sandboxing is **optional** (local-first, remote when needed). Supports **deterministic replay**. (SDK paper writes package names with dots, e.g. `openhands.sdk`; repo folders use hyphens — same thing.)

Key subsystems: **LLM abstraction** (LiteLLM; native reasoning fields; `NonNativeToolCallingMixin` for models lacking function calling; **RouterLLM** per-request routing); **Tool system** (Action → Executor → Observation; **MCP tools first-class**, JSON schemas auto-translated into Action models); **Runtime/sandbox** (Docker with **bash**, **Jupyter/IPython**, a **browser**, and **VSCode**, orchestrated by an in-container **Action Execution Server** — browser engine is Playwright/BrowserGym per the platform paper, though not named in every doc); **Condenser** (`LLMSummarizingCondenser` compresses history); **SecurityAnalyzer + ConfirmationPolicy** (risk-tiers each tool call low/med/high/unknown, gates execution); **Event storage** (`FilesystemEventService` locally, Google Cloud in production).

Named primitives worth teaching: `CodeActAgent`, `BrowsingAgent`, `AgentDelegateAction`/`AgentDelegateObservation`, `CmdRunAction`, `IPythonRunCellAction`, `BrowserInteractiveAction`, `AgentFinishAction`, `CondensationSummaryEvent`.

### How one task flows through it (e.g., "Fix bug #123")
1. **Ingestion:** task arrives via CLI, web UI, or GitHub trigger; conversation seeded with a `SystemPromptEvent` + user `MessageEvent`.
2. **Skill/microagent loading:** agent reads `.openhands/microagents/`; **`repo.md` is always loaded**; keyword-triggered files activate when their frontmatter `triggers:` words appear in the message. (These are now called **Skills**; the microagents path is kept for backward compatibility.)
3. **Agent loop:** the controller (V0) / stateless agent fn (V1) replays the full EventLog into an LLM conversation (system / assistant+tool_calls / tool roles).
4. **Action generation:** LLM emits a `MessageAction` or a **CodeAct** action — `IPythonRunCellAction` (Python) or `CmdRunAction` (bash); browser tasks use `BrowserInteractiveAction`.
5. **Security check:** `SecurityAnalyzer` scores risk; if `ConfirmationPolicy` requires it, the loop pauses (`WAITING_FOR_CONFIRMATION`).
6. **Execution:** action is dispatched over REST to the in-container **Action Execution Server**, which runs it and returns an `ObservationEvent`.
7. **Persistence:** both events are appended to the immutable EventLog.
8. **Iterate** until `AgentFinishAction` or a user `PauseEvent`.
9. **Context management:** when the log grows, the **Condenser** summarizes old events into a `CondensationSummaryEvent`.
10. **Delegation:** for specialized subtasks, `CodeActAgent` emits `AgentDelegateAction` to e.g. `BrowsingAgent`, which returns `AgentDelegateObservation`.
11. **Delivery:** integration callbacks (e.g. GitHub) post results (PR/comment) back; session is fully restorable from the EventLog.

### Distinctive design decisions & tradeoffs
1. **CodeAct — executable code as a unified action space** (vs. fixed JSON tool schemas). Code composes, self-debugs, and creates tools on the fly. The **CodeAct paper** ([arXiv:2402.01030](https://arxiv.org/abs/2402.01030)) reports up to **+20% success** vs. JSON-tool baselines across 17 LLMs.
2. **Append-only EventLog as single source of truth** → pause/resume, deterministic replay, audit trails; tradeoff: unbounded growth, requiring the Condenser.
3. **Optional sandboxing (V1)** — V0's mandatory Docker caused local/prod divergence; V1 is local-first with identical APIs and a remote sandbox via a workspace factory.
4. **Stateless immutable agents + single ConversationState** — agents as pure functions; config frozen at construction; eliminates shared-mutable-state bugs.
5. **MCP as first-class integration** — MCP tool schemas auto-map into Action models; no bespoke adapters.
6. **Skills/microagents** — repo-contextual Markdown knowledge dropped in `.openhands/microagents/`, externalizing domain knowledge without touching agent code.
7. **SecurityAnalyzer + ConfirmationPolicy** — autonomy on low-risk actions, human approval on destructive ones.
8. **Four-package modular SDK** — adopt the core SDK without the server; isolated tool testing; one codebase across CLI/web/CI.

### How it differs from peers
- **vs. Devin (Cognition):** OpenHands is open-source (MIT) and model-agnostic; Devin is proprietary SaaS.
- **vs. SWE-agent:** SWE-agent is a research/eval tool; OpenHands is production-oriented (cloud, enterprise SSO/RBAC/VPC, multi-agent, MCP, the OpenHands Index).
- **vs. Claude Code / Codex / Gemini CLIs:** OpenHands can *host* these via the **Agent-Client Protocol (ACP)** alongside native agents, adding sandbox isolation, delegation, and a web platform.
- **vs. Aider:** Aider is a CLI code assistant; OpenHands adds a sandboxed execution environment, web UI, cloud, and multi-agent orchestration.

### Benchmarks (as reported)
- **SDK paper (Claude Sonnet 4.5):** **72.8% SWE-Bench Verified**, **67.9% GAIA** ([arXiv:2511.03690](https://arxiv.org/html/2511.03690v1)). (Claude Sonnet 4: 68.0% / 57.6%; GPT-5 high: 68.8% / 62.4%.)
- **Original paper (CodeActAgent v1.8, Claude-3.5-Sonnet):** **26% SWE-Bench Lite** (300 instances, no hints), **~$1.10/instance** ([arXiv:2407.16741v3](https://arxiv.org/html/2407.16741v3)).
- **OpenHands Index** (launched **Jan 29, 2026**): continually-updated leaderboard over **9 models** across **5 task categories** — issue resolution (SWE-Bench Verified), greenfield (commit0), frontend (SWE-Bench Multimodal), testing (SWT-Bench), info-gathering (GAIA). Top: **Claude 4.5 Opus** ("overall winner"), then **gpt-5.2-codex** ([blog](https://www.openhands.dev/blog/openhands-index)).
- **`software-agent-sdk` README** shows a **"77.6"** badge with no stated model/date/methodology — treat as an unlabeled marketing figure, not a citable result.

### Recent additions
- **Planning Agent (beta, v1.6.0, Mar 30 2026):** switch between **Plan Mode** and **Code Mode**; in Plan Mode the agent has read-only tools except it can write a **PLAN.md** and asks for approval before coding ([Mar 2026 update](https://www.openhands.dev/blog/openhands-product-update---march-2026)).
- **ACP interoperability:** run Claude Code, Codex, Gemini, or any ACP agent through OpenHands.

### Teaching hooks
1. **Action-space design:** CodeAct (code as universal tool) vs. "list of JSON tools" — anchor with the ~20% CodeAct-paper win and the self-debug/create-tools capability.
2. **Event-sourced agent memory:** the append-only EventLog is a clean, real-world example of event sourcing enabling pause/resume, deterministic replay, and audit — contrast with stateful agents that lose context on restart.
3. **The context-window problem:** the Condenser / `LLMSummarizingCondenser` is a concrete production answer to "long-running agent overflows its context" (vendor-reported ~2× cost cut) — good for teaching the full-history-vs-cost tradeoff.
4. **Externalized domain knowledge:** the `repo.md` + keyword-triggered Skills/microagents pattern is immediately reusable and contrasts with hardcoding knowledge in prompts.
5. **Multi-agent delegation:** `AgentDelegateAction → BrowsingAgent` is a crisp generalist-orchestrator / specialist-subagent example.
6. **V0 → V1 as an architecture case study:** monolithic + mandatory-sandbox → modular, stateless, optional-sandbox — real lessons about scaling agent frameworks (140+-field config → immutable specs + one ConversationState).