---
key: cursor
name: Cursor
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- DATE CORRECTION: Cursor 1.0 (and Bugbot's GA launch, and Background Agent GA) was released June 4, 2025, NOT July 2025 as the brief repeatedly stated. Verified against cursor.com/changelog/1-0. Background Agent early preview was Cursor 0.50 on May 15, 2025 (brief's 'May 2025' was correct).
- TOOL COUNT CORRECTION: The leaked agent system prompt (sshh12 gist) defines 12 tools, not 13. The brief said '13 tools ... plus a reapply tool,' but 'reapply' is already the 12th tool in its own enumerated list — the brief double-counted it. Correct list: codebase_search, read_file, run_terminal_cmd, list_dir, grep_search, edit_file, file_search, delete_file, reapply, fetch_rules, web_search, diff_history.
- CONFIDENCE UPGRADE (Composer 2 = Kimi K2.5): The brief marked this 'med' and listed it as an uncertainty citing only VentureBeat. It is now CONFIRMED by Cursor's own 'Composer 2 Technical Report' and by co-founder Aman Sanger's public acknowledgment that not disclosing the Kimi K2.5 base was a mistake. Moonshot AI confirmed an authorized commercial partnership. ~75% of Composer 2 compute was Cursor's own training, ~25% inherited from the base. Upgraded to 'high'.
- CONFIDENCE UPGRADE (Tab RL numbers): The brief listed the +0.75/-0.25 reward, 25% acceptance threshold, 21%-fewer-suggestions/28%-higher-acceptance figures, and the 1.5–2 hour retrain cycle as UNCERTAIN secondary-source (Medium) claims. All of these are in fact stated in Cursor's OWN blog post cursor.com/blog/tab-rl (Sept 2025). Upgraded to 'high' and removed from uncertainties.
- DATE NUANCE (Composer 2): shipped March 19, 2026 (brief said 'March 2026' — acceptable, now made precise). Cursor 2.0 + Composer 1 shipped October 29, 2025 (brief's 'October 2025' correct). Cursor 3 shipped April 2, 2026 (brief's 'April 2026' correct).
- SpaceX DEAL NUANCE: SpaceX first secured a purchase OPTION on ~April 21, 2026, then EXERCISED/ANNOUNCED the acquisition on June 16, 2026. The brief compressed this to 'announced June 2026,' which is defensible but omits the April option step. Deal is all-stock (~$60B), tied to SpaceX's June 12, 2026 IPO; expected to close Q3 2026. The prior $2B/$50B venture round was superseded and never closed.
- FOUNDER UPDATE: Co-founder Arvid Lunnemark left Cursor in October 2025 to found a safety-focused AI lab, Integrous Research. The brief's founder list is otherwise correct (all four were MIT students, company founded 2022 as Anysphere, Inc.). Note some sources describe them as MIT dropouts rather than graduates.
- HQ NUANCE: Anysphere is headquartered in San Francisco (per the brief's 'whatItIs'), though the Wikipedia-cited keyFact omitted it; multiple sources corroborate SF HQ. No change needed, just confirmed.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- 'Cursor 1.0 / Bugbot launched July 2025' — REFUTED. Correct date is June 4, 2025 (cursor.com/changelog/1-0). (Bugbot may have been separately promoted/marketed later in July, e.g., a July 25, 2025 press cycle, but the v1.0 changelog with Bugbot is June 4.)
- 'Agent system prompt shows 13 tools' — DUBIOUS/OVERCOUNTED. The source gist contains 12 tools; the brief double-counts 'reapply.' The tool NAMES and reapply's self-correction behavior are accurate.
- 'Bugbot stats (1M+ PRs, 1.5M+ issues, 50%+ fix rate) are in the cursor.com/changelog/1-0 source' — DUBIOUS CITATION. Those specific numbers are NOT in the 1.0 changelog; they appear in Cursor's Bugbot blog/marketing (cursor.com/blog/building-bugbot). The stats themselves check out (beta: 1M+ PRs, 1.5M issues, 50%+ resolution; now 2M+ PRs/month, resolution risen 52%→over 70%), but the brief attributed them to the wrong URL.
- '40-tool MCP cap' — remains UNVERIFIED in official docs (brief already flagged this; no primary confirmation found).
- 'copy_from_namespace 50% write discount / 7.87s→525ms' — CONFIRMED, not dubious. Verified on turbopuffer.com/customers/cursor along with 1T+ documents, 80M+ namespaces, 95%/20x cost reduction, 10GB/s write peaks.

**尚未解决的问题:**
- Whether Priompt is still the ACTIVE server-side prompt compiler in Cursor 3.x, or has been superseded. The github.com/anysphere/priompt repo and design are confirmed real, but no 2026 primary source confirms it is still the production path after the 2.0/3.0 agent rewrites.
- The exact production embedding model in 2026 (whether a custom code-tuned embedder, and any reranker like a CodeLlama-based one) is not confirmed by a current primary source. Turbopuffer stores the vectors, but Cursor has not publicly documented the 2026 embedding model.
- The precise sync interval for codebase indexing. Cursor's secure-indexing blog confirms Merkle-tree diffing + SHA-256 + syntactic chunking, but does NOT state the '~10 minutes' cadence or explicitly name 'tree-sitter' — those specifics come from third-party analyses.
- Whether the Apply model in 2026 is still the Llama-3-70B fine-tune on Fireworks, or has been folded into Composer's own fast generation. The Llama-3-70B/1000 tok-s/13x/speculative-edits facts are well-documented for 2024–25 (Fireworks + Cursor blogs) but may be dated for mid-2026.
- Whether the SpaceX acquisition has actually CLOSED (expected Q3 2026; as of the July 2026 review date it was announced but pending regulatory approval), and the final company/product structure post-close.
- Exact scope of Cursor 3's plugin Marketplace and multi-repo parallel execution internals — confirmed to exist (official cursor.com/blog/cursor-3 + Marketplace with Skills/Subagents/MCP/Hooks/Rules), but deep technical architecture is described mainly in secondary coverage.

---
# Cursor (AI Code Editor by Anysphere) — Verified Source Brief

*Fact-checked July 2026. Confidence: HIGH. Dates and one tool-count corrected vs. the original brief; the Composer-2/Kimi-K2.5 relationship and the Tab-RL numbers were upgraded from "uncertain" to "confirmed" against Cursor's own publications.*

## 1. What it is + who/when

Cursor is a standalone, AI-native code editor built as a **fork of the open-source VS Code codebase** by **Anysphere, Inc.** (which now does business as "Cursor"). AI is embedded at the editor core rather than bolted on as a plugin. Founded **in 2022** by four MIT students — **Michael Truell (CEO), Sualeh Asif, Arvid Lunnemark, and Aman Sanger** — and headquartered in **San Francisco**. ([Wikipedia/Anysphere](https://en.wikipedia.org/wiki/Anysphere), [Forbes](https://www.forbes.com/sites/rashishrivastava/2025/11/13/four-cofounders-of-popular-ai-coding-tool-cursor-are-now-billionaires/))

- **Note:** Co-founder **Arvid Lunnemark left in October 2025** to start a safety-focused AI lab (Integrous Research). Some sources describe the founders as MIT dropouts.
- **Business trajectory:** ~$100M ARR (Jan 2025) → **$1B+ ARR announced with the Series D** (Nov 2025) → ~$3B+ ARR by early 2026. **Series D: $2.3B at a $29.3B valuation, Nov 2025**, co-led by Accel and Coatue with NVIDIA and Google as new investors. ([Goodwin](https://www.goodwinlaw.com/en/news-and-events/news/2025/11/announcements-technology-goodwin-advises-cursor-on-2-billion-series-b-financing), [Crunchbase News](https://news.crunchbase.com/venture/cursor-financing-ai-coding-automation/))
- **SpaceX acquisition:** SpaceX secured a purchase **option (~April 21, 2026)** and then **announced an all-stock acquisition of ~$60B on June 16, 2026**, days after SpaceX's own IPO; expected to close **Q3 2026** (regulatory approval pending). A planned $2B venture round at ~$50B was superseded and never closed. Corroborated by [CNBC](https://www.cnbc.com/2026/06/16/spacex-spcx-cursor-acquisition-ipo.html) and [TechCrunch](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/). *As of this review the deal was announced but not confirmed closed.*

## 2. Architecture & named components

Cursor forks VS Code so it can hook the renderer, file system, and extension host directly. Four primary AI surfaces:

1. **Tab autocomplete** — a custom fine-tuned model predicting multi-line/multi-file edits using **speculative decoding** (existing source code serves as draft tokens).
2. **Inline Edit (Cmd/Ctrl+K)** — direct model call on a selection.
3. **Chat/Agent panel (Composer)** — the main agentic tool loop.
4. **Background / Cloud Agents** — isolated remote VMs that run terminal commands, browse, and edit asynchronously.

Supporting infrastructure:

- **Composer model** — Cursor's in-house **mixture-of-experts (MoE)** coding model, trained with **RL in sandboxed cloud environments** and **MXFP8 MoE kernels** for low-precision native training; ~**4× faster generation than similar-quality "fast frontier" models**, released **Oct 29, 2025**. ([cursor.com/blog/composer](https://cursor.com/blog/composer))
- **Composer 2** — shipped **March 19, 2026**; **continued-pretrained/fine-tuned from Moonshot AI's open-weight Kimi K2.5** (~75% of compute from Cursor's own RL training, ~25% from the base), then large-scale RL. Confirmed by Cursor's technical report and co-founder acknowledgment. ([cursor.com/blog/composer-2-technical-report](https://cursor.com/blog/composer-2-technical-report), [VentureBeat](https://venturebeat.com/technology/cursors-composer-2-was-secretly-built-on-a-chinese-ai-model-and-it-exposes-a))
- **Apply ("Fast Apply") model** — a **fine-tuned Llama-3-70B** on **Fireworks AI** using a custom "speculative edits" algorithm, hitting **~1,000 tokens/sec (~13× vs. vanilla Llama-3-70B)**. Converts the agent's intended change into the actual file rewrite. ([Fireworks](https://fireworks.ai/blog/cursor), [cursor.com/blog/instant-apply](https://cursor.com/blog/instant-apply))
- **Shadow Workspace** — a **hidden Electron window** that runs language servers/LSP on AI-proposed edits in isolation, feeding lint/diagnostics back to the agent without touching the user's editor; uses **gRPC/Protocol Buffers** between extension hosts (rather than VS Code's default JSON IPC). ([cursor.com/blog/shadow-workspace](https://cursor.com/blog/shadow-workspace))
- **Codebase indexer** — **Merkle tree of SHA-256 hashes** for incremental sync; changed files split into **syntactic chunks**; embeddings stored in a vector DB. Filenames/paths are encrypted and source code is not stored server-side. ([cursor.com/blog/secure-codebase-indexing](https://cursor.com/blog/secure-codebase-indexing))
- **Turbopuffer** — serverless, object-storage-backed vector store: **1T+ documents, 80M+ namespaces, ~10 GB/s write peaks, ~95% (20×) cost reduction**. Its **`copy_from_namespace`** index-reuse (50% write discount) cut median time-to-first-query from **7.87s → 525ms**. ([turbopuffer.com/customers/cursor](https://turbopuffer.com/customers/cursor))
- **Priompt** — Cursor's **JSX-based, priority-aware prompt compiler**; elements carry priority scores and low-priority items are dropped (via binary search) when over budget. **Open-sourced** at [github.com/anysphere/priompt](https://github.com/anysphere/priompt). *(Whether it's still the production path in 3.x is unconfirmed — see uncertainties.)*
- Other components: **Bugbot** (PR-review agent), **Explore subagent**, **@-context system**, **Cursor Rules** (`.cursor/rules/*.mdc`), **AGENTS.md/BUGBOT.md**, **MCP integration**, **Marketplace plugins**, **CLI**, **mobile app**, and **git-integrated checkpoints**.

## 3. How one task flows through it (Agent-mode multi-file refactor)

1. **Context assembly** — the request plus always-on rules, open files, conversation history, and `@`-mentioned files are priority-scored and packed into the token budget (Priompt-style).
2. **Model call** — sent to the selected LLM (Claude, GPT, Gemini, or Cursor's own Composer/Composer 2).
3. **Tool loop** — the agent issues tool calls: `codebase_search` (semantic retrieval against the Turbopuffer index), `grep_search` (exact matches), `read_file`, `run_terminal_cmd`, etc. An **Explore subagent** can run broad parallel searches in its own short context.
4. **Apply** — for each edit the agent emits an intended change, which the **Fast Apply model** turns into the concrete file rewrite via speculative decoding (~1,000 tok/s).
5. **Validation** — the **Shadow Workspace** runs language servers on the edits and returns lint/type diagnostics to the agent, which can iterate on errors.
6. **Review** — the user reviews an aggregated diff; **checkpoints** allow git-integrated rollback.
7. **Background variant** — the whole loop can run in a cloud VM; the user monitors from the IDE, web, Slack/Linear/GitHub, or mobile and pulls results back locally.

## 4. Distinctive design decisions & tradeoffs

1. **Fork VS Code, don't plug in** — full control of renderer/FS/extension host enables Shadow Workspace and speculative previews; tradeoff is the burden of tracking VS Code upstream.
2. **Separate "what to change" from "how to write it"** — a cheap specialized **Apply model** does the file write, using source code as speculative draft tokens (only generates where the file actually changes) for a ~13× speedup.
3. **Priority-based context packing (Priompt)** — declarative context budgeting instead of ad-hoc truncation.
4. **Client-side privacy** — encrypted paths + no server-side source storage; only embeddings/obfuscated metadata reach Turbopuffer.
5. **Online RL for Tab** — the show/don't-show decision is baked into the policy; **reward +0.75 accepted, −0.25 rejected, 0 silent**, so the model only surfaces a suggestion above a **25% predicted-acceptance** bar. Result: **21% fewer suggestions, 28% higher accept rate**, with checkpoints rolled out frequently on a **1.5–2 hour retrain cycle** over **400M+ requests/day**. ([cursor.com/blog/tab-rl](https://cursor.com/blog/tab-rl))
6. **Namespace-per-codebase + `copy_from_namespace`** — reuse embeddings across near-identical codebases instead of recomputing.
7. **Rules as fetched entries** — the agent pulls relevant rules via `fetch_rules` rather than always prepending all rules, avoiding context bloat.

## 5. How it differs from peers

- **vs. GitHub Copilot** — Copilot is a plugin inside an existing IDE; Cursor *is* the IDE, enabling shadow workspace, full FS hooks, and speculative edits, with multi-file agent editing as a core feature.
- **vs. Claude Code** — Claude Code is a terminal-native CLI agent (no GUI); Cursor is a full GUI IDE optimized for interactive editing ergonomics. Cursor 3's "Agents Window" is an explicit move toward orchestrating fleets of agents, narrowing this gap.
- **vs. Windsurf (Codeium; acquired-related to OpenAI, 2025)** — Windsurf's "Cascade/Flows" blur user vs. AI actions; Cursor keeps the user reviewing each change and offers broad model choice plus its own Composer models.
- **vs. vanilla VS Code + Copilot** — Cursor bundles semantic indexing, custom Apply model, and the shadow-workspace feedback loop that a plugin cannot provide.

## 6. Version timeline (verified)

- **0.50 — May 15, 2025:** Background Agent early preview; new Tab model; `@folders`; multi-root workspaces. ([changelog/0-50](https://cursor.com/changelog/0-50))
- **1.0 — June 4, 2025** *(corrected from "July 2025")*: Background Agent GA; **Bugbot** launch; Jupyter support; Memories beta; one-click MCP. ([changelog/1-0](https://cursor.com/changelog/1-0))
- **2.0 + Composer 1 — Oct 29, 2025:** parallel multi-agent interface (up to ~8 agents via worktrees/remote), in-house Composer model. ([cursor.com/blog/2-0](https://cursor.com/blog/2-0))
- **Cloud Agents "Computer Use" — Feb 24, 2026:** each agent gets a full desktop VM + browser to visually verify changes. ([changelog/02-24-26](https://cursor.com/changelog/02-24-26))
- **Composer 2 — March 19, 2026:** Kimi-K2.5-based, RL-trained.
- **Cursor 3 — April 2, 2026:** agent-first "Agents Window," local↔cloud handoff, multi-repo parallel execution, **Marketplace** (plugins bundling Skills/Subagents/MCP/Hooks/Rules). ([cursor.com/blog/cursor-3](https://cursor.com/blog/cursor-3))

## 7. Teaching hooks

1. **Two-pass agent architecture** — separating *what to change* (frontier model) from *how to write it into the file* (fast Apply model) is a clean lesson in latency/cost tradeoffs in agent systems.
2. **Context engineering made concrete (Priompt)** — priority-ranked, JSX-style context packing as a systematic answer to "what goes in the window."
3. **Shadow Workspace as a safe agent sandbox** — a hidden window running LSP diagnostics is an accessible analogy for staging environments and tool harnesses that shield users from broken intermediate states.
4. **Learning from production (Tab online RL)** — the +0.75/−0.25 reward, 25% show-threshold, and 1.5–2 hr retrain loop are a rare, fully-documented example of near-real-time improvement from user behavior.
5. **Infrastructure optimization (Merkle + `copy_from_namespace`)** — Merkle-tree diffing plus namespace reuse (7.87s → 525ms) is a vivid case of systems work inside an AI harness.
6. **Rules as persistent memory** — `.cursor/rules/*.mdc` injected per context window is a concrete counter to LLM statelessness.
7. **A real agent tool loop** — the leaked system prompt exposes **12 concrete tools** (`codebase_search`, `read_file`, `run_terminal_cmd`, `list_dir`, `grep_search`, `edit_file`, `file_search`, `delete_file`, `reapply`, `fetch_rules`, `web_search`, `diff_history`), including `reapply` which escalates to a smarter model for self-correction — a grounded look at what "tool use" means in a deployed agent. ([gist](https://gist.github.com/sshh12/25ad2e40529b269a88b80e7cf1c38084))

*(Caveat: the leaked prompt is a March 2025 snapshot and may be outdated; the current tool set likely differs after the 2.0/3.0 rewrites.)*