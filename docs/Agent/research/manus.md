---
key: manus
name: Manus (Monica)
category: 通用 agent
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- GAIA comparison number CORRECTED: The brief said Manus (86.5% L1) beat 'OpenAI Deep Research (67.36%)'. This is wrong/conflated. Multiple sources give Deep Research L1 = 74.3% (not 67.36%); L2 Manus 70.1% vs DR 69.1%; L3 Manus 57.7% vs DR 47.6%. The 67.36% figure was a *prior SOTA* (a different, non-OpenAI system), not Deep Research.
- Incorporation location CORRECTED: Brief said Butterfly Effect Pte. Ltd. was 'incorporated in Singapore.' Wikipedia and reporting indicate the parent Butterfly Effect was incorporated in the Cayman Islands; the company *relocated its HQ/operations to Singapore in mid-2025* (a Singapore entity operates the product outside China). The founders started the company in China (Wuhan/Beijing) in 2022.
- Funding/valuation CORRECTED: Brief said '~$100M valuation by late 2024' funded by 'Tencent and Sequoia Capital China.' Corrected timeline: Seed (2023) led by ZhenFund; Series A (Nov 2024) with Sequoia China (HSG) + Tencent (this is roughly the ~$100M-valuation stage); Series B (April 2025) ~US$75M led by Benchmark at ~US$500M valuation (Tencent, ZhenFund, HongShan also participated). The ~$100M figure was the *pre-Series-B* valuation, not the peak.
- Third co-founder ADDED: Brief named only Xiao Hong (CEO) and Ji Yichao (Chief Scientist/'Peak'). A third co-founder, Zhang Tao (product director), was omitted.
- arXiv 2505.02024 authorship CLARIFIED (resolving a brief uncertainty): This paper ('From Mind to Machine') is authored by academics at Virginia Tech, Brown, UIUC, and Northeastern — it is a THIRD-PARTY analysis, NOT written by the Manus team. Its claims about internal architecture (distinct Planner/Execution/Verification agents) and 'trained with RLHF' are outside-in inferences and should NOT be presented as authoritative descriptions of Manus internals.
- Multi-agent architecture DOWNGRADED: The brief presented a firm multi-agent system with a distinct 'Verification Agent.' Primary evidence is mixed. The best primary source (Ji's own context-engineering post) describes a SINGLE agent loop (~50 tool calls, one context/event stream), and an early system-prompt-leak investigation concluded 'multi-agent functionality isn't implemented' at launch (an E2B sandbox wrapping an Anthropic API call). Some third-party write-ups describe Planner/Knowledge/Datasource *modules*. No primary source confirms a separate 'Verification Agent' — that component is treated as UNVERIFIED/likely-inferred and reframed accordingly.
- Meta acquisition CONFIRMED and UPGRADED from 'med' to 'high' with precise dates: announced Dec 2025, closed Dec 29, 2025 at ~US$2B (some reports say up to $3B); China's NDRC opened a probe Jan 2026 and ordered the deal unwound Apr 27, 2026; Meta severed data access/ties ~June 2026. A Tencent-led consortium (Tencent, Sequoia China, ZhenFund; Benchmark exiting) moved to buy back Meta's stake at the original ~$2B price, returning control to the original backers. Founders reportedly faced exit bans during the probe.
- Browser tooling DETAIL ADDED: Brief described only a generic 'Chromium browser tool.' Investigations indicate the browser automation is Playwright-based and, at launch, used the open-source 'Browser Use' library. Manus itself credits heavy reliance on open source.
- Tool count NUANCED: Brief said '27-29 tools.' Confirmed: E2B's blog says 27; the leaked system prompt investigation counted 29. Both figures are legitimate depending on source/version; kept as a range with attribution.
- 'My Computer' approval model NUANCED: Brief said 'per-command explicit approval.' Accurate but incomplete — the desktop app (launched Mar 16, 2026) offers two modes: 'Allow Once' (per-command review) and 'Always Allow' (trusted recurring workflows).
- Models framing TIGHTENED: Kept the Claude Sonnet + fine-tuned Qwen claim but re-labeled it as sourced from a co-founder's public comment + system-prompt leaks (Claude 3.5 Sonnet v1 at launch, testing 3.7), NOT official current-version documentation. Removed the implication that Manus's *own* planner is 'trained with RLHF' — that claim traces to the third-party arXiv paper.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- 'OpenAI Deep Research (67.36%)' as the GAIA Level-1 comparator — REFUTED. Deep Research's reported L1 is 74.3%; 67.36% is a different/prior system's score.
- 'Incorporated in Singapore' — REFUTED (incorporated Cayman Islands; HQ moved to Singapore mid-2025).
- '~$100M valuation by late 2024 [as the headline funding fact], funded by Tencent and Sequoia Capital China' — MISLEADING. The headline round is Series B ~$75M led by Benchmark at ~$500M (Apr 2025); ~$100M was only the pre-B stage.
- Distinct 'Verification Agent' as a real Manus component — DUBIOUS/UNVERIFIED. No primary source confirms it; it appears to originate in third-party (arXiv) multi-agent framing. Primary sources describe a single agent loop.
- 'The planner uses a transformer LLM with reinforcement learning (including RLHF) for decision-making' — DUBIOUS. This traces to the third-party arXiv paper, not to Manus. Manus's public stance is context engineering over training; it consumes external models (Claude, Qwen).
- Firm claim that Manus is a 'multi-agent system' as its defining architecture — OVERSTATED. Best evidence points to a single-agent, single-context loop with tools; multi-agent 'Wide Research' fan-out was added later (v1.6) for parallel sub-tasks, not the core loop.
- Treating '147 trillion tokens' and '80M+ virtual computers' as neutral verified facts — CAUTION. These come from the promotional 'Manus Joins Meta' blog post; real but vendor/deal-marketing sourced.
- Implicit claim that the arXiv paper is a Manus-authored technical description — REFUTED (it is external academic analysis).

**尚未解决的问题:**
- Exact models powering Manus 1.5/1.6/Max are not officially disclosed per version. Public signals point to Claude (3.5 Sonnet v1 at launch, later 3.7) + fine-tuned Qwen, but this is from a co-founder comment and system-prompt leaks, not versioned documentation.
- Whether Manus still uses E2B/Firecracker for VM infrastructure as of mid-2026 (post-Meta events and scale growth) is unconfirmed; the E2B blog describes the launch-era setup.
- The true internal control structure remains ambiguous: the team's own writing describes a single agent loop, while some third-party analyses describe Planner/Knowledge/Datasource modules. There is no primary confirmation of a distinct 'Verification Agent.' 'Wide Research' (v1.6) is the only confirmed multi-agent parallelism.
- Whether '1.6 Max' is a distinct fine-tuned model or a routing/config/compute tier over base models is not clearly documented.
- Final settled ownership as of July 2026: NDRC ordered unwind (Apr 2026) and a Tencent-led buyback of Meta's stake at ~$2B was in motion — confirm whether that buyback has fully closed and who holds control now.
- GAIA scores (86.5/70.1/57.7 and the Deep Research comparators) are Manus's own launch numbers echoed by secondary sources; the original GAIA leaderboard submission has not been independently re-verified and Manus was noted as not appearing on the public leaderboard under standard conditions.
- The '147 trillion tokens' / '80M+ virtual computers' / '$100M ARR' figures originate from deal-related promotional material and lack independent audit.

---
## Manus — Cleaned Source Brief (verified July 2026)

### 1. What it is + who/when
**Manus** is a general-purpose autonomous AI agent that completes multi-step tasks end-to-end inside a cloud virtual machine (browser, shell, code, filesystem) and returns a finished artifact (report, deployed web app, data file), rather than just chatting. The name is Latin for "hand" — symbolizing execution.

- **Maker:** Butterfly Effect (consumer brand also known as **Monica** / monica.im). Parent **Butterfly Effect Pte. Ltd. was incorporated in the Cayman Islands**; the company was founded and initially operated from China (Wuhan/Beijing) in **2022**, and **relocated its HQ/operations to Singapore in mid-2025** (a Singapore entity runs the product outside China). ([Wikipedia](https://en.wikipedia.org/wiki/Manus_(AI_agent)), [TechNode](https://technode.com/2025/07/10/manus-trims-china-team-relocates-core-staff-to-singapore-headquarters/))
- **Founders:** **Xiao Hong** ("Red", CEO), **Ji Yichao** ("Peak", Chief Scientist — author of the context-engineering post), and **Zhang Tao** (product director). Xiao founded Butterfly Effect in 2022, ~2 months before ChatGPT's launch; the team's prior product was the **Monica** browser extension (LLM aggregator). ([Wikipedia](https://en.wikipedia.org/wiki/Manus_(AI_agent)))
- **Launch:** **March 6, 2025**, invite-only beta. Launch demo drew **>1M views in <20 hours**; invite codes were resold for thousands of dollars. ([Wikipedia](https://en.wikipedia.org/wiki/Manus_(AI_agent)), [seo.ai](https://seo.ai/blog/manus-ai-statistics-and-facts))
- **Funding:** Seed (2023, ZhenFund) → **Series A (Nov 2024)** with Sequoia China (HSG) + Tencent (roughly the ~$100M-valuation stage) → **Series B (April 2025): ~US$75M led by Benchmark at ~US$500M valuation.** ([TechCrunch](https://techcrunch.com/2025/04/25/chinese-ai-startup-manus-reportedly-gets-funding-from-benchmark-at-500m-valuation/))
- **Scale (vendor-reported):** In its first months the agent reportedly processed **>147 trillion tokens** and powered **>80M virtual computers**; ~$100M ARR in ~8 months. These come from the promotional "Manus Joins Meta" post — real but marketing-sourced. ([manus.im](https://manus.im/blog/manus-joins-meta-for-next-era-of-innovation), [VentureBeat](https://venturebeat.com/orchestration/why-meta-bought-manus-and-what-it-means-for-your-enterprise-ai-agent))
- **Ownership saga:** Meta announced acquisition **Dec 2025** (~US$2B, some reports up to $3B), **closed Dec 29, 2025**. China's **NDRC opened a probe (Jan 2026)** and **ordered the deal unwound on Apr 27, 2026**; Meta severed data access ~June 2026. A **Tencent-led consortium (Tencent, Sequoia China, ZhenFund; Benchmark exiting) moved to buy back Meta's stake at the original ~$2B price**, returning control to the original backers. Manus continues as a standalone subscription product. ([TechCrunch](https://techcrunch.com/2026/04/27/china-vetoes-metas-2b-manus-deal-after-months-long-probe/), [CNBC](https://www.cnbc.com/2026/04/27/meta-manus-china-blocks-acquisition-ai-startup.html), [36Kr](https://eu.36kr.com/en/p/3866588633469956))

### 2. Architecture & named components
Manus is best understood as a **single autonomous agent loop operating a cloud VM sandbox, engineered primarily through context management** — NOT a heavyweight multi-agent framework (see caveat below). Verified layers:

1. **Agent loop + context (from the team's own writing):** one append-only **event stream** (system prompt + observations + a recited **todo.md**). No separate confirmed "planner agent" / "verification agent" as distinct services; planning and self-correction happen within the single loop. ([Context Engineering post, by Yichao 'Peak' Ji](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))
2. **Sandbox:** each task gets a full cloud VM — at launch **E2B Firecracker microVMs (Ubuntu), ~150ms boot**; **Docker was rejected (10–20s spawn, no full OS)**. Contains Chromium/Playwright browser, bash/shell (sudo), Python + Node.js, full filesystem, networking; Zero-Trust isolation with in-sandbox root. ([E2B](https://e2b.dev/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers))
3. **Tools:** **27 tools** per E2B (a leaked system prompt counted **29**), prefixed by group (`browser_*`, `shell_*`). Browser automation is **Playwright-based** and used the open-source **"Browser Use"** library at launch. ([E2B](https://e2b.dev/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers), [the-decoder](https://the-decoder.com/chinese-ai-agent-manus-uses-claude-sonnet-and-open-source-technology/))
4. **Context mechanisms:** **KV-cache preservation** (stable prompt prefix, append-only context, deterministic serialization); **file system as unlimited memory** with **restorable compression** (drop page content, keep URL/path); **todo.md recitation** to fight lost-in-the-middle; **errors left in context** as implicit belief updates. ([Context Engineering post](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))
5. **Tool gating:** a **logit-masking state machine** constrains which tools are callable per step **without removing tool definitions** (removal would break KV-cache and confuse the model). ([Context Engineering post](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))
6. **Extensibility:** **Agent Skills** (file-system workflows with progressive disclosure), **MCP connectors** (Gmail, Google Calendar/Drive, Notion, HubSpot, Stripe, GitHub, Hugging Face via OAuth 2.0), slash commands. **Wide Research** (v1.6) adds *parallel sub-agents* for fan-out research — this is the one place real multi-agent parallelism is confirmed. ([manus.im blog](https://manus.im/blog/manus-max-release))
7. **Persistence tiers:** per-task sandbox (ephemeral), **Cloud Computer** (persistent Ubuntu VM), **My Computer** (desktop app, local machine).
8. **Underlying models (not officially documented per version):** co-founder Ji has said Manus uses **Claude + fine-tuned Qwen variants**; leaks indicate **Claude 3.5 Sonnet v1** at launch (later Sonnet 3.7). Manus is model-consuming, not model-training. ([the-decoder](https://the-decoder.com/chinese-ai-agent-manus-uses-claude-sonnet-and-open-source-technology/))

### 3. How one task flows through it
1. **Input:** user submits a goal; a Firecracker microVM boots (~150ms).
2. **Plan:** the agent writes a **todo.md** and decomposes the goal (stable system prompt to preserve cache).
3. **Loop (~50 tool calls avg):** read event-stream context → logit-masking selects allowed tools → execute (e.g., `browser_navigate`, screenshot, `shell_exec` Python) → append observation (including failures/stack traces) → update + **recite todo.md at end of context** → repeat.
4. **Memory offload:** intermediate data written to the sandbox filesystem; long content restorably compressed (URL kept, body dropped).
5. **Self-correction:** errors remain visible; the loop re-plans as needed (no confirmed separate verifier service).
6. **Delivery:** artifact stored in sandbox; **async** — user can close the tab and get notified.
7. **Persistence:** sandbox sleeps; files persist per tier (free recycles after ~7 days sleep, Pro ~21 days). ([manus-sandbox blog](https://manus.im/blog/manus-sandbox), [Context Engineering post](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))

### 4. Distinctive design decisions & tradeoffs
- **Context engineering over model training** → ship improvements in hours; tradeoff: dependence on external providers (Claude/Qwen). ([Context Engineering post](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))
- **KV-cache hit rate = "single most important production metric"**; **cached vs uncached Claude Sonnet tokens: $0.30 vs $3.00 /MTok (10×)**; average **input:output ≈ 100:1** (prefill-heavy). Drives stable prefixes, append-only context, deterministic serialization, session-ID routing.
- **Logit masking instead of dynamic tool removal** (cache-safe gating).
- **File system as memory** + **restorable compression** (never permanently lose info).
- **todo.md as attention anchor**; **errors left in context**; **controlled randomness** to avoid pattern-lock; **Firecracker over Docker**; **"less structure, more intelligence"**; framework **rebuilt 4×**, jokingly "**Stochastic Graduate Descent**." ([Context Engineering post](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus))
- **Progressive disclosure in Skills** (metadata ≈100 tokens at startup; full instructions <5k only when triggered). ([manus-skills blog](https://manus.im/blog/manus-skills))
- **Version milestones:** **Manus 1.5 (Oct 16, 2025)** — avg task time ~**15 min → <4 min**, **+15% task quality**, **+6% satisfaction**, expanded per-task context. **Manus 1.6 / 1.6 Max (early 2026)** — Wide Research (all sub-agents on Max), Chat Mode, Design View, mobile app dev; double-blind satisfaction **+~19.2%**. **My Computer desktop app (Mar 16, 2026)** — local CLI on macOS/Windows with **Allow Once / Always Allow** approval and optional local-GPU use. ([1.5](https://manus.im/blog/manus-1.5-release), [1.6/Max](https://manus.im/blog/manus-max-release), [My Computer](https://manus.im/blog/manus-my-computer-desktop))

### 5. How it differs from peers
- **vs OpenAI Operator:** Operator is browser-control only; Manus adds a full Linux VM, code execution, deployment, and async operation.
- **vs Claude Computer Use:** Computer Use is an API capability; Manus is a packaged product with its own agent loop, sandbox, and context engineering on top.
- **vs OpenAI Deep Research:** Deep Research specializes in web research/reports; Manus is broader (code, deploy, files). On **GAIA at launch, Manus vs Deep Research: L1 86.5% vs 74.3%; L2 70.1% vs 69.1%; L3 57.7% vs 47.6%** (self-reported by Manus at launch, not independently re-verified). ([helicone](https://www.helicone.ai/blog/manus-benchmark-operator-comparison), [curam-ai](https://curam-ai.com.au/comparative-analysis-of-openais-deep-research-and-manus-ai-using-the-gaia-benchmark/))
- **vs Devin (Cognition):** Devin is software-engineering-specialized; Manus is a generalist that also codes.
- **vs ChatGPT/Claude chat:** Manus returns finished artifacts and runs asynchronously.

### 6. Teaching hooks
1. **Context engineering as a discipline** — Ji's post is a rare practitioner account; use the **10× cached-vs-uncached token cost** and **100:1 input:output ratio** to teach agent economics.
2. **Anatomy of a real agent loop** — the **~50-tool-call task** + **todo.md checklist** = a memorable, human-relatable solution to lost-in-the-middle.
3. **Infrastructure shapes agents** — Docker (10–20s) vs Firecracker (~150ms) shows agent performance isn't only model quality.
4. **Agent memory hierarchy** — (a) in-context event stream, (b) sandbox filesystem, (c) external MCP connectors: a concrete three-tier memory example.
5. **Design to fit inference internals** — logit masking instead of tool removal teaches that framework design must respect KV-cache behavior, not just clean logic.
6. **Reading sources skeptically** — the gap between Manus's *own* single-loop description and third-party *multi-agent* write-ups (incl. an academic arXiv paper NOT by the team) is a great lesson in sourcing hierarchy and marketing-vs-engineering claims.