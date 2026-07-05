---
key: concept-agent
name: AI Agent 基础概念
category: 概念
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- MAJOR: The brief repeatedly claims Lilian Weng decomposed the LLM agent into FOUR components — 'Planning, Memory, Tool Use, and Action.' This is wrong. Weng's June 23, 2023 post (verified directly) defines THREE top-level components: Planning, Memory, and Tool Use, with the LLM as the 'brain'/controller. 'Action' is NOT a separate top-level component in Weng's taxonomy. Corrected everywhere it appeared (keyFacts, architecture section header, teaching angle #3). The four-layer architecture in the brief's 'architecture' field is a reasonable pedagogical expansion, but must not be attributed to Weng as her canonical decomposition.
- Resolved an over-hedged uncertainty: Reflexion's NeurIPS 2023 acceptance IS confirmed by the official NeurIPS site (neurips.cc/virtual/2023/poster/70114), not merely the GitHub README. Upgraded from 'verify against proceedings' to confirmed.
- Sharpened OpenAI Agents SDK date: confirmed released March 11, 2025 (announced alongside the Responses API). Its predecessor was OpenAI Swarm (experimental, October 2024). The brief's 'March 2025 / unverified from primary source' hedge is resolved to a confirmed date via multiple reputable secondary sources; the SDK docs themselves confirm it is the production successor to Swarm.
- Sharpened OpenAI function calling date: the June 2023 announcement was specifically June 13, 2023; the migration to the 'tools' parameter was November 2023 (older 'functions'/'function_call' deprecated with the 2023-12-01 API version). Brief's month-level claims were correct; added day-level precision.
- Clarified Reflexion author list: full author list is Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao (brief abbreviated as 'Shinn, Cassano et al.' — fine, but the '91% vs GPT-4 80%' figure is verified verbatim from the abstract).
- Clarified the components[] list in the original brief (which lists 12 engineering components) is a synthesized/implementation-level list, not a cited taxonomy; kept but labeled as such to avoid it being read as an authoritative source-backed decomposition.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED: 'Lilian Weng canonically decomposed the LLM agent into FOUR components: Planning, Memory, Tool Use, and Action.' — Weng's post defines THREE components (Planning, Memory, Tool Use). 'Action' is not a separate top-level component. (Verified against lilianweng.github.io/posts/2023-06-23-agent/.)
- DUBIOUS / MARKETING HYPE (already flagged by brief, retained): '2025 is the year of AI agents' framing — this is industry/marketing framing, not a verified technical fact; production agent reliability (error recovery, long-horizon planning) remains an open research problem.
- HISTORICAL, NOT CURRENT (already flagged, retained): Reflexion's '91% HumanEval pass@1 vs GPT-4 80%' is accurate as of the paper (early 2023) but is historical context only — current frontier models far exceed both numbers. Must not be presented as a current capability claim.
- UNSETTLED (retained): The 5-level autonomy taxonomy (Feng, McDonald, Zhang) is a 2025 working/academic paper, not an adopted industry standard; competing frameworks with different level counts exist.
- SYNTHESIZED, NO SINGLE CANONICAL PAPER (retained): 'Plan-and-Execute' as an agent pattern has no single canonical source paper; it is a LangChain-popularized synthesis drawing on BabyAGI and the Plan-and-Solve paper (Wang et al. 2023). Confidence remains med.

**尚未解决的问题:**
- The 'agent' vs. 'agentic workflow' boundary remains contested. Anthropic's Dec 2024 distinction (predefined code paths vs. LLM-directed) is clean, but most production systems are hybrids and there is no single industry-standard taxonomy as of July 2026.
- Plan-and-Execute has no single canonical source paper; it is a LangChain-popularized synthesis of BabyAGI + Plan-and-Solve (Wang et al. 2023). The pattern description is reliable but the attribution should stay soft (confidence: med).
- Autonomy-level frameworks are unsettled: the Feng/McDonald/Zhang 5-level taxonomy is an academic working paper; competing frameworks with different level counts exist, and no major platform has adopted any of them as a standard.
- The four-LAYER engineering architecture (core model / planning / memory / tool) is a common and useful teaching device but is a synthesis across surveys, not a single authoritative source — do not attribute it to Weng, who names three components.
- '2025 = the year of AI agents' is marketing framing; production reliability (long-horizon planning, error recovery) is still an open research problem, so any deployment-maturity claims should be stated cautiously.
- OpenAI Agents SDK's exact March 11 2025 date is confirmed via reputable secondary sources (InfoQ, VentureBeat, SD Times) and the SDK's self-description as the Swarm successor; the SDK docs homepage itself does not print a release date, so treat the day-level date as well-supported rather than primary-sourced.

---
# AI Agent 基础概念 (AI Agent Fundamentals) — Source Brief

*Fact-checked July 2026. Confidence: HIGH on all core historical/technical claims below; residual uncertainties listed at the end.*

## 1. What it is + who/when

An **AI agent** is a software system in which a large language model (LLM) acts as the core controller (the "brain"), augmented by **tools, memory, and a planning loop**, enabling it to autonomously decompose a goal, take multi-step actions in an environment, observe results, and iterate until the task is done.

- **Classical root (1995):** Russell & Norvig, *Artificial Intelligence: A Modern Approach* (1st ed., 1995) define an agent as "anything that can be viewed as **perceiving its environment through sensors and acting upon that environment through actuators**." ([AIMA / Wikipedia summary](https://en.wikipedia.org/wiki/Artificial_Intelligence:_A_Modern_Approach)) The modern LLM-agent formulation specializes this: an LLM decides which tools to call, folds environmental feedback into subsequent reasoning, and maintains state across turns.
- **Modern founding formalization (2022):** **ReAct** (Yao et al., [arXiv 2210.03629](https://arxiv.org/abs/2210.03629), submitted Oct 6 2022, published ICLR 2023) is widely credited as the founding formalization of the LLM agent loop — interleaving **Thought → Action → Observation** rather than separating reasoning and acting. On ALFWorld and WebShop it beat imitation/RL baselines by **34%** and **10%** absolute success respectively, using only **1–2 in-context examples** (verified against the paper).

Distinct from a **chatbot** (essentially single- or multi-turn Q&A, no tool execution or autonomous planning) and from a **workflow/chain** (multi-step but with developer-predefined code paths). An agent **dynamically directs its own process** — it chooses the next action based on observations.

## 2. Architecture & named components

**Canonical decomposition — Lilian Weng, "LLM Powered Autonomous Agents" (June 23 2023, [lilianweng.github.io](https://lilianweng.github.io/posts/2023-06-23-agent/)):** an LLM-powered agent = **LLM (brain) + three components**:

1. **Planning** — task decomposition into subgoals; self-reflection/self-criticism over past actions (subsumes techniques like Chain-of-Thought, ReAct, Tree of Thoughts, Reflexion).
2. **Memory** — three tiers by analogy to human cognition:
   - *Sensory memory* → learned embedding representations of raw inputs (text/image/multimodal),
   - *Short-term / working memory* → in-context learning, bounded by the finite context window,
   - *Long-term memory* → external vector store queried via fast retrieval at runtime.
3. **Tool Use** — calling external APIs for information/capabilities missing from model weights.

> **Correction from the brief under review:** Weng defines **three** components (Planning, Memory, Tool Use), **not four**. "Action" is *not* a separate top-level component in her taxonomy. (Verified directly against her post.)

**A useful four-layer *engineering* view (pedagogical expansion, not Weng's taxonomy):**
1. **Core model** — foundation LLM as controller; not fine-tuned per task; reasoning elicited via prompting/in-context examples.
2. **Planning module** — CoT (Wei et al. 2022), ReAct (Yao et al. 2022), Tree of Thoughts, Plan-and-Execute, Reflexion.
3. **Memory module** — short-term (context window) + long-term (vector DB, e.g. pgvector/Pinecone; episodic reflection buffers).
4. **Tool/action module** — tools described via JSON Schema; model selects+parameterizes a call, an executor runs it, the observation is appended to context.

**Implementation-level component checklist** (synthesized, for engineers building one): LLM core; system prompt (persona + tool schemas + constraints); agent loop / run-time orchestrator; tool definitions (JSON Schema); tool executor (client- or server-side); short-term memory (context/history); long-term memory (vector store / episodic buffer); planner; reflector/critic; multi-agent orchestrator (routing, subagents); guardrails (I/O validation); human-in-the-loop approval checkpoints.

**The agent loop (observe–think–act):** receive goal → loop{ (1) model emits reasoning + tool call **or** final answer; (2) if tool call → execute, append observation, go to (1); (3) if final answer or max-iterations → return }.

## 3. How one task flows through it (step-by-step)

Example goal: *"Research competitor pricing and write a summary."*

- **Step 0 — Ingestion:** orchestrator builds the initial prompt (system prompt with tool schemas + constraints, then the user goal) and sends it to the LLM.
- **Step 1 — Reason (Thought):** LLM produces a CoT trace and emits a `tool_use` block, e.g. `name="web_search", input={"query": "Competitor A pricing 2025"}`.
- **Step 2 — Act:** the host process (or the provider's server infra, for server tools) executes the tool.
- **Step 3 — Observe:** the result is formatted as a `tool_result` and appended to context (goal + thought + tool call + output).
- **Step 4 — Iterate:** LLM is re-invoked with updated context; may call another tool or produce the final answer.
- **Step 5 — Terminate:** loop ends on (a) final answer with no tool call, (b) max-iterations guard, or (c) a done/handoff signal.
- **Step 6 — Reflect (optional):** in Reflexion-style loops, a verifier judges the answer, a textual self-critique is written to an episodic buffer, and a new trial incorporates it.

**Protocol anchor (Anthropic tool use, [official docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)):** when Claude returns `stop_reason: "tool_use"` with one or more `tool_use` blocks, the caller **must** return matching `tool_result` blocks in the next turn, or the loop breaks. For **server tools** (e.g. `web_search`, `code_execution`) Anthropic executes on its own infrastructure and returns results inline; for **client tools** the caller runs them.

**Tool-call standard lineage:** OpenAI introduced **function calling on June 13, 2023** ([announcement](https://openai.com/index/function-calling-and-other-api-updates/)), then generalized `functions`/`function_call` to the **`tools` parameter in November 2023** (old params deprecated with the 2023-12-01 API version, [OpenAI function calling docs](https://developers.openai.com/api/docs/guides/function-calling)). The structured "model returns a tool call → caller executes → returns tool result" round-trip became the de facto pattern adopted by Anthropic, Google, Meta, and others.

## 4. Distinctive design decisions & tradeoffs

1. **Interleave reasoning + acting (ReAct vs. CoT-only):** grounding each thought in the latest observation reduces hallucination/error propagation. *Tradeoff:* more API calls, higher latency.
2. **Verbal feedback over gradient updates (Reflexion, [arXiv 2303.11366](https://arxiv.org/abs/2303.11366)):** natural-language self-critique in an episodic buffer improves trial-to-trial with no weight updates. *Tradeoff:* needs a multi-trial budget and verifiable outcomes (coding, reasoning, games).
3. **Separate planner + executor (Plan-and-Execute):** a strong LLM plans once, a cheaper executor runs steps — fewer expensive-model calls than step-by-step ReAct. *Tradeoff:* the plan must be revised when reality diverges. (No single canonical paper — see uncertainties.)
4. **Tools as structured schemas (function calling):** JSON-Schema definitions + constrained decoding replace brittle free-text parsing. *Tradeoff:* schema maintenance; strict mode adds latency.
5. **Server- vs. client-side tool execution (Anthropic):** server tools (web_search, code_execution) need no caller handler; client tools (custom funcs, bash, text editor) are fully customizable. *Tradeoff:* server tools are less customizable and carry usage-based pricing on top of tokens.
6. **Simplicity first (Anthropic, "Building Effective Agents," Dec 19 2024, [post](https://www.anthropic.com/research/building-effective-agents)):** start with the simplest pattern and only add an agent loop when simpler solutions fail — an explicit pushback against over-engineered frameworks. *Tradeoff:* agents buy task performance on open-ended, unpredictably-long tasks at the cost of latency and money.
7. **Memory externalization:** fixed context windows push long-term memory into external vector stores. *Tradeoff:* retrieval adds latency and can surface irrelevant memories.

**Anthropic's five workflow patterns** (composable, distinct from full agents, verified from the post): **Prompt Chaining, Routing, Parallelization, Orchestrator-Workers, Evaluator-Optimizer.** Definitions (verbatim): *Workflows* = "systems where LLMs and tools are orchestrated through predefined code paths"; *Agents* = "systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."

## 5. How it differs from peers

- **vs. Chatbot:** agent adds a run-time loop, tool execution, cross-loop state, and autonomous next-action decisions.
- **vs. Workflow/Chain:** workflow steps are fixed by the programmer; an agent decides its next action at each step from observations (Anthropic's precise line: predefined code paths vs. LLM-directed process).
- **vs. Classic symbolic AI agent:** symbolic planners/rule systems use explicit world models and hand-coded rules; LLM agents swap the symbolic reasoner for a neural LM — gaining generalization and NL understanding, losing determinism/auditability/reliability.
- **vs. RAG system:** RAG retrieves once per query and generates (single-pass workflow); an agent can call retrieval repeatedly, mix it with other tools, and loop toward a goal.
- **vs. Fine-tuned model:** fine-tuning bakes behavior into weights at train time; an agent keeps the base model frozen and adapts via prompting, tool selection, and runtime memory — generalizing to new tools/tasks without retraining.

**Framework landmarks worth naming:**
- **Toolformer** (Schick et al., Meta AI, [arXiv 2302.04761](https://huggingface.co/papers/2302.04761), Feb 9 2023): an LM teaches *itself* to use APIs (calculator, Q&A, search, translation, calendar) in a **self-supervised** way, improving zero-shot performance without hurting core language modeling.
- **OpenAI Agents SDK** (released **March 11, 2025**, open-source; production successor to the Oct 2024 experimental **Swarm**, [docs](https://openai.github.io/openai-agents-python/)): three primitives — **Agents** (LLMs + instructions + tools), **Handoffs** (delegation to other agents), **Guardrails** (I/O validation) — plus a **built-in agent loop** and Sessions for memory.
- **Chip Huyen** ("Agents," Jan 7 2025, [post](https://huyenchip.com/2025/01/07/agents.html)) categorizes tools into: **knowledge augmentation** (retrievers, web browsing, SQL), **capability extension** (calculators, code interpreters, converters), and **write actions** (DB writes, email, transactions).
- **Levels of Autonomy** (Feng, McDonald, Zhang, [arXiv 2506.12469](https://arxiv.org/abs/2506.12469), June 14 2025): five user-role levels — **Operator → Collaborator → Consultant → Approver → Observer** (academic working paper, not an adopted standard).

## 6. Teaching hooks

1. **30-year historical arc:** Russell & Norvig 1995 (perceive + act) → ReAct 2022 (LLMs cross into practical agents) → Toolformer (tools) → Reflexion (self-improvement) → Anthropic 2024 (pattern synthesis). Clean narrative spine.
2. **The loop is the key insight:** one-shot (chatbot) vs. looping (agent). Draw observe→think→act→observe; ReAct's Thought/Action/Observation notation is a quotable, implement-in-minutes anchor.
3. **Three components as scaffold:** use Weng's **Planning / Memory / Tool Use** (with the LLM as brain) as the skeleton for the whole topic — each maps to a well-studied sub-problem. *(Note: three, not four.)*
4. **Workflow→agent spectrum:** Anthropic's five patterns form a simple→complex ladder. Teach engineers to ask "can a predefined code path solve this?" before reaching for a loop — combats over-engineering.
5. **Memory taxonomy as human-cognition analogy:** sensory/working/long-term makes context-window limits and vector DBs intuitive.
6. **Tool protocol as a concrete engineering artifact:** the JSON-Schema definition → `tool_use` block → `tool_result` round-trip (and Anthropic's `stop_reason: "tool_use"` rule) is directly implementable.
7. **Reflexion as an on-ramp to self-improvement:** improving *without* fine-tuning bridges to Constitutional AI / RLHF later; the 91%-vs-80% HumanEval result is memorable **(historical, early-2023 context only — not a current capability claim).**
8. **Levels of autonomy as a product-communication tool:** Operator→Observer helps engineers negotiate how much human oversight an agent needs.