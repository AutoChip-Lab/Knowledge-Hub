---
key: devin
name: Devin (Cognition Labs)
category: 自主 SWE agent
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- STALE VALUATION (most important fix): The brief presents ~$10.2B (Sept 2025) as the current/latest valuation. As of a July 2026 brief this is outdated. On May 27, 2026 Cognition raised ~$1B at a $25B pre-money / $26B post-money valuation (led by Lux Capital, General Catalyst, 8VC), reporting ~$492M annualized revenue run-rate. The $10.2B figure should be framed as a Sept 2025 milestone, not the current number. (https://techcrunch.com/2026/05/27/ai-coding-startup-cognition-raises-1b-at-25b-pre-money-valuation/, https://www.bloomberg.com/news/articles/2026-05-27/ai-coding-startup-cognition-raises-1-billion-at-26-billion-value)
- MULTI-AGENT SOURCE/TITLE FIX: The brief attributes the single-agent design rationale to a third-party Maven page (maven.com/.../why-devin-does-not-use-multi-agents). The primary source is Cognition's own blog post titled 'Don't Build Multi-Agents' by Walden Yan (https://cognition.com/blog/dont-build-multi-agents). Cognition later published a companion piece 'Multi-Agents: What's Actually Working' (https://cognition.com/blog/multi-agents-working). Cite the primary Cognition posts, not the Maven paraphrase.
- ACP ORIGIN FIX: The brief lists 'Agent Client Protocol (ACP)' among Devin's own components and implies Cognition introduced it. ACP was created by Zed Industries (August 2025); Devin Desktop ADOPTED it on June 2, 2026. ACP is an open, third-party standard (JSON-RPC 2.0 over stdio), not a Cognition invention. Adopters include JetBrains, Google (Gemini CLI), GitHub, Zed, and 25+ agents. (https://zed.dev/blog/jetbrains-on-acp, https://docs.devin.ai/desktop/acp)
- SOURCE ATTRIBUTION FIX (Internet of Bugs): The brief cites eesel.ai for the Internet of Bugs demo critique. The primary source is the Internet of Bugs YouTube video 'Debunking Devin: First AI Software Engineer Upwork lie exposed' (https://www.youtube.com/watch?v=tNmgmwEtoWE) and the associated Hacker News thread (https://news.ycombinator.com/item?id=40008109). Attribute to the primary source.
- BLOG DOMAIN NORMALIZATION: Several brief citations use cognition.com/blog/... but the canonical domain for the annual performance review and several 2026 posts is cognition.ai/blog/... (e.g., https://cognition.ai/blog/devin-annual-performance-review-2025, https://cognition.ai/blog/devin-can-now-manage-devins). Both domains resolve to Cognition, but cognition.ai is the active blog host as of 2026.
- GOLDMAN SACHS FIGURE NUANCE: The brief states a '20% efficiency gain' projection. Goldman's own public statements (via CIO Marco Argenti) describe expecting productivity gains of '3-4x the rate of previous AI tools' and plans to deploy 'hundreds of Devins... potentially thousands' alongside its ~12,000 human developers. The '20%' figure is not the headline number in primary coverage; treat any specific percentage as a soft, company-sourced projection. (https://www.cnbc.com/2025/07/11/goldman-sachs-autonomous-coder-pilot-marks-major-ai-milestone.html, https://www.ibm.com/think/news/goldman-sachs-first-ai-employee-devin)
- DEEPWIKI LAUNCH-DATE NOTE: The brief's April 25, 2025 date matches Cognition's official docs/release notes ('shipped Deep Wiki' April 25). Some third-party sources say April 27 or 'May 5' (a wider public/blog-post date). Kept April 25 as the primary-sourced date but flagged the spread. Also: DeepWiki's own launch messaging cited '50,000+' top repos indexed (docs/release notes), while the brief and other sources say '30k+'; figures grew over time, so '30k+ at launch, later 50k+' is the accurate framing.
- DANA CAPITALIZATION: Cognition's docs and blog render the data-analyst variant as 'Dana' (invoked via /dana or @Devin !dana). Some coverage writes 'DANA'. Standardized to 'Dana'. Its Redshift/PostgreSQL/Snowflake/BigQuery-via-MCP description is confirmed.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- 'Planner + Coder + Critic + Browser' as separate specialized submodels: REFUTED as architecture. Cognition's primary materials explicitly argue AGAINST multi-agent decomposition ('Don't Build Multi-Agents'). Any description of Devin as a swarm of specialized models is third-party speculation. Read-only helper subagents (e.g., a DeepWiki code-search subagent) exist but behave like tool calls, not a specialist federation.
- The exact ~$250M Windsurf acquisition price: DUBIOUS/UNCONFIRMED. Cognition did not disclose terms. '~$250M' is a media estimate only. Confirmed facts: acquisition announced ~July 14, 2025; Google separately paid $2.4B to license Windsurf tech and hire CEO/co-founder Varun Mohan + research leads; OpenAI's earlier ~$3B bid had collapsed.
- PR merge rate (67% in 2025, up from 34%): NOT INDEPENDENTLY AUDITED. It is self-reported by Cognition in its own 'Devin's 2025 Performance Review.' Present as vendor-reported, not verified. Same caveat for '4x faster, 2x more efficient' and 'Devin 2.0 completes 83% more junior-level tasks per ACU.'
- Devin's current competitive SWE-bench standing: The 13.86% (March 2024) figure is historical. Cognition has not published head-to-head SWE-bench numbers for Devin 2.x vs. frontier models (Claude, GPT, Gemini), which have far surpassed the original score. Do not present 13.86% as anything but the March 2024 launch result.
- DeepWiki powered by 'Claude 3.7': DUBIOUS. Appears only in third-party write-ups ('advanced LLMs like Claude 3.7'); not confirmed in Cognition primary docs, which say the core Devin agent model is undisclosed. Treat the specific model as unconfirmed.
- Goldman '20% efficiency gain' as a hard result: not substantiated; it is a projection from company statements (see corrections).

**尚未解决的问题:**
- The internal model(s) powering the core Devin agent remain undisclosed by Cognition. DeepWiki is described by third parties as using 'Claude 3.7,' but this is not confirmed in primary docs.
- Exact Windsurf acquisition price is undisclosed (~$250M is a media estimate only).
- Whether Devin cloud (ACU-based) and Devin Desktop (Windsurf-derived Free/Pro/Max/Teams/Enterprise tiers) billing have fully merged under the unified brand is unclear; the two pricing models appear to be converging but the exact unified structure is not pinned down.
- PR merge rate (67%), '4x faster / 2x more efficient,' the '83% more tasks per ACU' figure, and Goldman's productivity projections are all self-reported by Cognition or its customers with no independent audit.
- Devin's current competitive benchmark standing is unquantified: Cognition has not published updated SWE-bench (or SWE-bench Verified/Pro) numbers for Devin 2.x against frontier models, and 2026 third-party leaderboards carry noted grader-reliability concerns.
- DeepWiki's exact public-launch date and indexed-repo count vary across sources (April 25 vs. April 27 vs. 'May 5'; 30k+ vs. 50k+ repos) as the product scaled; April 25, 2025 is the primary-sourced ship date.

---
## Devin (Cognition Labs) — Verified Source Brief (as of July 2026)

### What it is + who/when
**Devin** is a cloud-hosted, autonomous AI software engineer built by **Cognition** (Cognition AI / Cognition Labs). Announced **March 12, 2024**, it takes a whole engineering task expressed in natural language (or a ticket) and executes it end-to-end inside its own sandboxed cloud environment, delivering a **pull request for human review**. It is not a code-completion plugin: it runs **asynchronously** in a persistent session with its own shell, code editor, and browser.

At launch, Devin resolved **13.86% of SWE-bench issues (79 of 570)**, beating the prior state of the art of **4.80% assisted and 1.96% unassisted (both Claude 2)** ([technical report](https://cognition.com/blog/swe-bench-technical-report)). This is a historical figure; frontier models have since far surpassed it, and Cognition has not published head-to-head SWE-bench numbers for Devin 2.x.

**Corporate trajectory:** Cognition acquired the remnants of **Windsurf in July 2025** (announced ~July 14) after Google paid $2.4B to license Windsurf's tech and hire CEO/co-founder Varun Mohan and research leads (an earlier ~$3B OpenAI bid had collapsed); the Windsurf purchase price was undisclosed (media estimate ~$250M, unconfirmed) ([TechCrunch](https://techcrunch.com/2025/07/14/cognition-maker-of-the-ai-coding-agent-devin-acquires-windsurf/)). Cognition then raised **$400M at a $10.2B valuation (Sept 2025)** ([CNBC](https://www.cnbc.com/2025/09/08/cognition-valued-at-10point2-billion-two-months-after-windsurf-.html)), and most recently **~$1B at a $25B pre-/$26B post-money valuation (May 27, 2026)**, reporting ~$492M annualized revenue run-rate ([TechCrunch](https://techcrunch.com/2026/05/27/ai-coding-startup-cognition-raises-1b-at-25b-pre-money-valuation/)).

**Product line (2026):** Devin cloud agent; **Devin Desktop** (rebranded Windsurf IDE, effective **June 2, 2026**); Devin CLI; **Devin Review** (free PR analysis); plus **DeepWiki** and the **Dana** data-analyst variant. Enterprise customers named publicly include Goldman Sachs, Citi, Santander, Nubank, Mercedes-Benz, Dell, and US Army/Navy.

### Architecture & named components
Devin uses a **single-agent architecture**, not a multi-agent swarm. Cognition's design philosophy is documented in **"Don't Build Multi-Agents" by Walden Yan** ([cognition.com/blog/dont-build-multi-agents](https://cognition.com/blog/dont-build-multi-agents)) and its follow-up **"Multi-Agents: What's Actually Working"** ([link](https://cognition.com/blog/multi-agents-working)): coordination across many independent agents introduces fragility, so Cognition invests in **context engineering** for one coherent agent, using only read-only helper subagents (e.g., a DeepWiki code-search subagent) that behave like tool calls.

Core components:
- **Sandboxed cloud VM** (one per session, isolated, ephemeral): shell (bash), VS Code-based editor, multi-tab browser; repo cloned in.
- **Planning layer** ("Interactive Planning," Devin 2.0): proactive codebase scan → numbered plan, surfaced with **Confidence Scores (green/yellow/red)** added in **Devin 2.1 (May 15, 2025)**.
- **Context/memory:** persistent **Knowledge** (standing org/architecture facts), **Playbooks** (reusable workflow templates), and **DeepWiki** (auto-indexed repo documentation).
- **Two interaction modes:** **Ask** (read-only Q&A/planning) and **Agent** (full autonomous execution).
- **Managed Devins / "Devin can now Manage Devins"** ([cognition.ai/blog/devin-can-now-manage-devins](https://cognition.ai/blog/devin-can-now-manage-devins)): a coordinator session scopes work, dispatches child Devins (each a full Devin in its own VM), monitors, resolves conflicts, and compiles results — an explicit 2026 orchestration layer on top of the single-agent core, not a change to it.
- **Devin Review** ([docs](https://docs.devin.ai/work-with-devin/devin-review)): free PR analysis (swap "github" → "devinreview" on a PR URL) with logical diff grouping, a **Bug Catcher**, security scanning, and **Autofix** of review-bot/lint/CI comments.
- **DeepWiki** ([docs release notes](https://docs.devin.ai/release-notes/2025)): standalone public product (deepwiki.com) that turns any public GitHub repo into interactive docs; shipped **April 25, 2025**; the same indexing tech Devin uses to onboard to a codebase.
- **Dana:** data-analyst Devin variant querying Redshift/PostgreSQL/Snowflake/BigQuery via MCP (`/dana` or `@Devin !dana`) ([docs](https://docs.devin.ai/work-with-devin/data-analyst)).
- **Devin Desktop / Devin Local:** local IDE agent; **Devin Local** is a Rust rewrite of Windsurf's Cascade, claiming up to **30% better token efficiency** and adding subagent support (Cascade EOL July 1, 2026). Interoperates via the **Agent Client Protocol (ACP)** — an open standard **created by Zed Industries (Aug 2025)**, adopted by Devin Desktop June 2, 2026, and by JetBrains, Google (Gemini CLI), and GitHub. ([devin.ai blog](https://devin.ai/blog/windsurf-is-now-devin-desktop/), [ACP docs](https://docs.devin.ai/desktop/acp))
- **Tooling & extensibility:** MCP integrations via the **MCP Marketplace** (launched **July 28, 2025**, `/settings/mcp-marketplace`, 1000s of tools; more connectors added in 2026); **Skills** (slash-command/@mention reusable instructions); **Guardrails** safety controls; **Devin Fast Mode** (~2x faster, 4x ACU per session); **Session Insights** post-run analysis.

### How one task flows through it (step by step)
1. **Submit:** User sends an NL prompt via app.devin.ai, Slack (`@Devin`), Linear/Jira, or the REST API; can include `@file` references and repo context.
2. **Plan (Ask mode):** Devin scans the repo (DeepWiki-indexed context), identifies relevant files, and produces a numbered plan with Confidence Scores; the user reviews/edits before authorizing.
3. **Init session:** A fresh isolated cloud VM is provisioned (shell + VS Code-based editor + browser); the repo is cloned in.
4. **Execute (Agent mode):** Devin works the plan — reading/writing files, running commands and tests, browsing docs — watchable in real time.
5. **Self-correct:** On test/compile failures, it reads errors, hypothesizes fixes, re-runs tests, and re-plans as it discovers constraints.
6. **Collaborate:** It surfaces blockers/questions and can pause for user input mid-session.
7. **Complete → PR:** Opens a PR (GitHub/GitLab/Bitbucket/Azure DevOps), attributable to Devin or the developer.
8. **Insights:** Post-run "Generate Analysis" yields a timeline, tips, and an improved prompt template.
For parallel work, a coordinator Devin spawns child Devins (each in its own VM) with per-child ACU budgets, then merges results.

### Distinctive design decisions & tradeoffs
1. **Single agent + context engineering over a multi-agent swarm** — maximizes reliability/coherence; Managed Devins adds parallel orchestration only as an explicit 2026 layer.
2. **One isolated cloud VM per session** — enables parallelism, reproducibility, and security (no cross-session data sharing; code not retained after session). Tradeoff: setup latency; no local-device testing (e.g., mobile).
3. **Ask-then-Agent two-step** — cheap read-only exploration/validation before compute-consuming execution; targets ambiguous prompts, the primary failure mode.
4. **ACU (Agent Compute Unit) pricing** — a normalized unit bundling VM time + inference + networking, **≈15 minutes of active work**, ~**$2.25/ACU** on the Core/Pro plan ([docs](https://docs.devin.ai/release-notes/2025)). Predictable per-task cost; tradeoff: less transparent than raw tokens.
5. **Knowledge vs. Playbooks separation** — standing architectural context vs. procedural workflows, to avoid context bloat.
6. **DeepWiki as a public product** — a free network-effect flywheel feeding the same indexing infra Devin uses internally.
7. **Buy-not-build local IDE** — acquired Windsurf, rebranded to Devin Desktop, replaced Cascade with Rust-based Devin Local, and leaned on the open ACP standard for interoperability.

### How it differs from peers
- **vs. GitHub Copilot / Cursor (IDE assistants):** Devin is asynchronous, cloud-hosted, runs in its own VM, executes tests, and outputs PRs without the developer present; Copilot/Cursor are synchronous, local, in-editor. Copilot/Cursor support bring-your-own-model; Devin uses Cognition's hosted models only.
- **vs. Claude Code (CLI agent):** Claude Code is terminal-native, local, synchronous, with direct filesystem access; Devin is cloud-sandboxed and async.
- **vs. OpenHands (open source):** OpenHands is self-hostable with a similar VM+shell+browser sandbox but designed for control over hosting/models; Devin is proprietary SaaS.
- **vs. Windsurf (pre-acquisition):** Windsurf was a local AI IDE (Cascade agent); now folded into Devin Desktop with Cascade replaced by Devin Local.
- **Devin differentiators:** per-session cloud VM, ACU pricing, persistent Knowledge + Playbooks, DeepWiki indexing, Managed Devins orchestration, deep enterprise integrations, and Devin Review as a separate free PR product.

### Teaching hooks
1. **Agent vs. copilot:** Devin is the canonical asynchronous cloud agent (VM + persistent session + PR-as-output) illustrating the observe → plan → act → observe loop concretely.
2. **The planning problem:** Ask-then-Agent + Confidence Scores show why surfacing uncertainty and validating a plan *before* spending compute reduces the dominant failure mode (ambiguous prompts).
3. **Context engineering vs. multi-agent:** Cognition's documented "Don't Build Multi-Agents" stance — and its later "what's actually working" nuance — is a rich, real-world design-tradeoff case, paired with structured memory (Knowledge vs. Playbooks).
4. **Evaluation honesty:** The 13.86% result teaches benchmark framing (25% random subset, 45-min limit, Python-only; a test-driven variant hit 23% on 100 samples). The Internet of Bugs teardown of the 2024 Upwork demo ([YouTube](https://www.youtube.com/watch?v=tNmgmwEtoWE), [HN](https://news.ycombinator.com/item?id=40008109)) is a lesson in cherry-picked demos and vendor-reported metrics.
5. **ACU as an abstraction:** Metering resource-heavy agentic work (VM + inference + network) as one normalized unit is a clean product-engineering pattern.
6. **Tool use & open protocols:** The shell+editor+browser sandbox plus MCP (tools) and ACP (editor↔agent interop, created by Zed) show how open protocols enable composable ecosystems without bespoke integrations.
7. **Orchestration patterns:** Managed Devins (coordinator + child sessions with ACU budgets and structured outputs) is a hands-on map-reduce-style hierarchical orchestration example.

### Key metrics (all vendor-reported unless noted; treat as claims, not audits)
- 67% of PRs merged in 2025 (vs. 34% prior year); "4x faster, 2x more efficient"; Devin 2.0 "83% more junior tasks per ACU" ([2025 performance review](https://cognition.ai/blog/devin-annual-performance-review-2025), [Devin 2.0](https://cognition.com/blog/devin-2)).
- Goldman Sachs pilot (July 2025) alongside ~12,000 developers; company projects 3–4x gains over prior AI tools and "hundreds, potentially thousands" of Devins ([CNBC](https://www.cnbc.com/2025/07/11/goldman-sachs-autonomous-coder-pilot-marks-major-ai-milestone.html), [IBM Think](https://www.ibm.com/think/news/goldman-sachs-first-ai-employee-devin)).