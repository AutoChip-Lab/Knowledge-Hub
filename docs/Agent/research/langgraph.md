---
key: langgraph
name: LangGraph (LangChain)
category: agent 框架
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- Channel class names corrected: the brief's 'BinOp' is not the real class name — it is `BinaryOperatorAggregate`. The brief's 'Delta' is not the real class name — it is `DeltaChannel`. Verified against the official reference (reference.langchain.com/python/langgraph/channels).
- Channel list expanded/corrected: the full set of channels in langgraph.channels is LastValue, LastValueAfterFinish, Topic, AnyValue, UntrackedValue, BinaryOperatorAggregate, EphemeralValue, DeltaChannel, NamedBarrierValue, NamedBarrierValueAfterFinish (plus BaseChannel). The brief's 5-channel list (LastValue, BinOp, Topic, EphemeralValue, Delta) was both inexactly named and incomplete — notably it omitted AnyValue and the NamedBarrierValue channels used for barrier synchronization.
- Production-user attribution corrected: the PyPI page only explicitly names Klarna, Replit, and Elastic ('and more'). Uber and LinkedIn appear in the LangChain 1.0 blog, not PyPI. J.P. Morgan could not be traced to a primary LangChain source and has been demoted to unverified.
- LangGraph Platform -> LangSmith Deployment rebrand CONFIRMED (previously a flagged uncertainty). The Oct 2025 product-naming change renamed LangGraph Platform to 'LangSmith Deployment' and LangGraph Studio to 'LangSmith Studio' (changelog.langchain.com/announcements/product-naming-changes-langsmith-deployment-and-langsmith-studio). The open-source library remains 'LangGraph'.
- Self-Hosted Lite free tier phrasing tightened to the exact wording 'up to 1 million nodes executed' (not just '1M nodes').
- Benchmark provenance nailed down: the supervisor-vs-swarm numbers (~4.2s vs ~2.8s single-domain, 2 vs 1 LLM calls, 94% vs 91% routing accuracy) are the article author's OWN measurements (Austin Vance / Focused Labs), explicitly NOT an official LangChain benchmark. The article also gives handoff-required figures (~9.1s vs ~5.4s; 4 vs 2 LLM calls). Kept as illustrative only.
- create_react_agent deprecation clarified: at LangGraph/LangChain 1.0 the whole langgraph.prebuilt module (including create_react_agent) is deprecated in favor of langchain.agents.create_agent; deprecated in v1.0, slated for removal in v2.0. Backward compatibility is maintained until 2.0.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- REFUTED as a precise class name: channel 'BinOp' — real class is `BinaryOperatorAggregate`. 'BinOp' is at best informal shorthand and should not be taught as the API name.
- REFUTED as a precise class name: channel 'Delta' — real class is `DeltaChannel`.
- DUBIOUS: 'J.P. Morgan uses LangGraph in production' — not found on PyPI or in a primary LangChain customer source during re-verification; treat as unconfirmed.
- DUBIOUS (mis-attributed source): Uber and LinkedIn as production users are cited to PyPI in the brief, but PyPI lists only Klarna/Replit/Elastic; Uber and LinkedIn come from the LangChain 1.0 blog instead.
- DUBIOUS / NON-AUTHORITATIVE: all supervisor-vs-swarm latency and accuracy numbers — single-author, single-scenario (customer-service) measurements from a dev.to post, not a reproducible or official benchmark. Do not present as established fact.
- UNVERIFIED (unchanged from brief): v1.1 'model retry middleware' / 'content moderation middleware' (Dec 2025) and the exact internal semantics of DeltaChannel — no primary source located.

**尚未解决的问题:**
- v1.1 'model retry middleware' and 'content moderation middleware' (reportedly Dec 2025) remain unconfirmed against primary sources.
- Exact internal semantics of DeltaChannel are not documented in enough primary detail to teach precisely (name confirmed; behavior only loosely 'tracks incremental changes').
- J.P. Morgan as a production user is unconfirmed by any primary LangChain source found; Klarna/Replit/Elastic (PyPI) and Uber/LinkedIn (1.0 blog) are the reliably attributable names.
- LangGraph JS/TS feature parity with Python is asserted to exist but was not exhaustively verified field-by-field.
- Post-rebrand LangSmith Studio (formerly LangGraph Studio) feature set was not re-verified in detail; only the naming change is confirmed.
- The CrewAI '5.76x faster' and any cross-framework speed claims are third-party, workload-specific, and not independently reproduced here.

---
## LangGraph — Verified Source Brief (as of July 2026)

### What it is + who/when
**LangGraph** is an open-source, low-level orchestration framework and runtime for building, running, and deploying long-running, **stateful** AI agents. It is built by **LangChain, Inc.** and models agent workflows as **directed graphs**: nodes are computation steps (LLM calls, tool invocations, routing logic) and edges define control flow. Unlike a plain loop, a LangGraph graph carries a central, typed **state object** that persists across nodes, and it supports **cycles**, enabling iterative agentic loops. It does **not** require LangChain as a dependency, though it integrates tightly with it. Licensed **MIT**. ([pypi.org/project/langgraph](https://pypi.org/project/langgraph/))

- **First PyPI release:** v0.0.9 on **January 8, 2024**. ([pypi.org/project/langgraph](https://pypi.org/project/langgraph/))
- **1.0 (first stable major):** released **October 22, 2025**, alongside LangChain 1.0, marketed as the first stable major release in the durable-agent space. LangChain committed to **no breaking changes until 2.0**. ([langchain.com/blog/langchain-langgraph-1dot0](https://www.langchain.com/blog/langchain-langgraph-1dot0))
- **Current version:** **1.2.7**, released **June 30, 2026**. ([pypi.org/project/langgraph](https://pypi.org/project/langgraph/))
- **Python:** requires **>=3.10**; supports CPython 3.10–3.13 and PyPy. ([pypi.org/project/langgraph](https://pypi.org/project/langgraph/))
- **Functional API** (`@entrypoint` / `@task` decorators): introduced **January 2025** as an alternative to the StateGraph builder. ([langchain.com/blog/introducing-the-langgraph-functional-api](https://www.langchain.com/blog/introducing-the-langgraph-functional-api))

### Architecture & named components
LangGraph's runtime is a **Pregel / Bulk Synchronous Parallel (BSP)** implementation. Both authoring paths compile to the same runtime object.

- **Two authoring APIs → one runtime.**
  1. **StateGraph** (graph builder): `add_node()`, `add_edge()`, `add_conditional_edges()`, then `.compile()` → returns a **CompiledStateGraph** (a `Pregel` subclass).
  2. **Functional API**: `@entrypoint` on a function directly builds a `Pregel`; `@task` marks discrete work units.
- **Core runtime class:** `Pregel` — holds nodes (`PregelNode` actors), channels (one per state field), input/output channels, an optional `BaseCheckpointSaver`, `interrupt_before`/`interrupt_after` node lists, retry policy, and cache policy. Public API: `invoke`/`ainvoke`, `stream`/`astream`, `batch`, `get_state`, `update_state`, `get_state_history`.
- **Execution controller:** `PregelLoop` (`SyncPregelLoop` / `AsyncPregelLoop`); tasks run via `PregelRunner` (thread pool for sync, asyncio for async).
- **Superstep phases** (repeat until no node is eligible, recursion limit hit, or interrupt): ([deepwiki.com/langchain-ai/langgraph/3-core-execution-system](https://deepwiki.com/langchain-ai/langgraph/3-core-execution-system))
  1. **Plan** — `prepare_next_tasks()` selects actors whose subscribed channels changed last superstep.
  2. **Execute** — selected actors run concurrently; each reads subscribed channels and buffers writes.
  3. **Update** — `apply_writes()` commits writes to channels, applying each channel's reducer.

- **State channels (verified class names).** `langgraph.channels` provides: `LastValue` (default; most recent value), `LastValueAfterFinish`, `Topic` (pub/sub queue of multiple values), `BinaryOperatorAggregate` (running reducer via a binary op, e.g. `operator.add` to append lists — **this is the real name; "BinOp" is informal shorthand only**), `EphemeralValue` (holds one step then clears), `AnyValue` (last value, assumes concurrent writes are equal), `UntrackedValue`, `DeltaChannel` (**real name; "Delta" is shorthand**), `NamedBarrierValue` / `NamedBarrierValueAfterFinish` (barrier synchronization), and the `BaseChannel` abstract base. ([reference.langchain.com/python/langgraph/channels](https://reference.langchain.com/python/langgraph/channels))
- **Checkpointing.** `BaseCheckpointSaver` interface with implementations `InMemorySaver` (dev/test), `SqliteSaver` (lightweight), `PostgresSaver` (production). When configured, `PregelLoop` restores via `get_tuple()`, and persists via `put()`/`put_writes()`. The **`durability`** parameter controls flush timing: `"sync"` (before next step), `"async"` (background), `"exit"` (only at termination). ([deepwiki.com/langchain-ai/langgraph/3-core-execution-system](https://deepwiki.com/langchain-ai/langgraph/3-core-execution-system))
- **Human-in-the-loop.** `interrupt_before`/`interrupt_after` node lists pause execution and checkpoint state; `get_state()` / `update_state()` inspect and mutate; resume with `invoke(None, config)`. The Functional API uses the `interrupt()` function.
- **Routing primitives.** `START` / `END` sentinels; `Send` (dynamic fan-out); `Command` (combines state update + routing + interrupt-resume value).
- **Design lineage.** LangGraph draws on **Pregel** (Google), **Apache Beam**, and **NetworkX**. ([docs.langchain.com/oss/python/langgraph/overview](https://docs.langchain.com/oss/python/langgraph/overview))

### How one task flows through it (create_react_agent tool-loop)
1. `graph.invoke({"messages": [HumanMessage("query")]}, config={"configurable": {"thread_id": "abc"}})`.
2. `PregelLoop` init: if a checkpointer is set, `get_tuple()` restores prior state for the `thread_id` into channels.
3. **Superstep 1 – Plan:** `START` triggers → route to **agent** node.
4. **Superstep 1 – Execute:** agent node reads the `messages` channel, calls the LLM with full conversation, gets an `AIMessage`.
5. **Superstep 1 – Update:** `AIMessage` appended to `messages` (via the append reducer / `BinaryOperatorAggregate`-style channel used by `MessagesState`); state checkpointed.
6. **Superstep 2 – Plan:** conditional edge inspects `AIMessage.tool_calls` → route to **tools** node if present, else `END`.
7. **Superstep 2 – Execute (tools):** `ToolNode` runs all tool calls in parallel (**v1**), or fans them out via the **Send API** to separate node instances (**v2**). Results become `ToolMessage`s. ([reference.langchain.com/.../create_react_agent](https://reference.langchain.com/python/langgraph.prebuilt/chat_agent_executor/create_react_agent))
8. **Superstep 2 – Update:** `ToolMessage`s appended; state checkpointed.
9. Loop back to the agent node, which now sees tool results and calls the LLM again.
10. When the LLM returns an `AIMessage` with no `tool_calls`, the conditional edge routes to `END`; the loop terminates and returns final state.

**HITL variant:** `interrupt_before=["tools"]` pauses after planning but before tool execution; state is checkpointed; external code inspects/edits via `get_state`/`update_state`; `invoke(None, config)` resumes from the interrupted node without re-running prior nodes.

### Distinctive design decisions & tradeoffs
1. **Pregel/BSP execution.** Within one superstep, nodes cannot observe each other's writes — they see only the previous superstep's committed state. This gives atomic, transactional semantics (a failed parallel node means none of that superstep's writes commit) and safe parallelism. Tradeoff: heavier mental model than a loop. ([medium.com/.../langgraph-transactions-pregel](https://medium.com/@maksymilian.pilzys/langgraph-transactions-pregel-message-passing-and-super-steps-0e101e620f10))
2. **Typed state + per-field channel reducers.** State is a `TypedDict`/Pydantic model; each field has channel semantics (`LastValue`, `BinaryOperatorAggregate`, `Topic`, …). Makes parallel writes predictable without manual merge logic. Tradeoff: upfront schema.
3. **Cycles as first-class.** Unlike DAG-only systems, cycles are supported (the enabler of agent loops); a `recursion_limit` guards against runaway loops.
4. **Persistence baked into the runtime.** Checkpointing after each superstep makes any workflow resumable, enabling multi-day runs, HITL approval, and time-travel debugging with no app-level plumbing. Tradeoff: I/O per superstep.
5. **Deliberately low-level.** Direct control over nodes, edges, and state; prebuilt helpers (`create_react_agent`, supervisor, swarm) are thin, optional wrappers. Tradeoff: steeper curve than role-based frameworks.
6. **Two APIs, one runtime.** StateGraph (visualization, explicit routing) vs. Functional API (natural Python control flow, less boilerplate) both compile to `Pregel`.
7. **Multi-agent topology as opt-in libraries.** Separate `langgraph-supervisor` and `langgraph-swarm` packages instead of one baked-in topology.
8. **MCP via adapters, not core.** MCP support is bridged by the separate `langchain-mcp-adapters` package, keeping the core dependency-light.
9. **Platform as a separate commercial layer.** OSS library is free; production deployment infra is the commercial **LangSmith Deployment** (formerly LangGraph Platform).

**Prebuilt / multi-agent components (verified):**
- `MessagesState`, `ToolNode`, `create_react_agent()` (in the now-deprecated `langgraph.prebuilt`; superseded by `langchain.agents.create_agent`).
- `langgraph-supervisor`: `create_supervisor()`, `create_handoff_tool()`, `create_forward_message_tool()`, `create_handoff_back_messages()`, `add_inline_agent_name()`, `remove_inline_agent_name()`, `with_agent_name()`. ([reference.langchain.com/python/langgraph-supervisor](https://reference.langchain.com/python/langgraph-supervisor))
- `langgraph-swarm`: `SwarmState`, `create_swarm()`, `create_handoff_tool()`, `get_handoff_destinations()`, `add_active_agent_router()`. `SwarmState` tracks conversation `messages` + the `active_agent` so a run resumes with the last-active agent. ([reference.langchain.com/python/langgraph-swarm](https://reference.langchain.com/python/langgraph-swarm))
- `langchain-mcp-adapters` (`pip install langchain-mcp-adapters`): `load_mcp_tools()` converts MCP tools to LangChain tools; `MultiServerMCPClient` manages multiple servers; transports **stdio, streamable_http (http), sse**. ([github.com/langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters))

### LangGraph Platform / LangSmith Deployment
- Announced in **beta October 31, 2024** as LangGraph Platform. ([langchain.com/blog/langgraph-platform-announce](https://www.langchain.com/blog/langgraph-platform-announce))
- **Rebranded (Oct 2025):** LangGraph Platform → **LangSmith Deployment**; LangGraph Studio → **LangSmith Studio**. The OSS library keeps the name LangGraph. ([changelog.langchain.com/.../product-naming-changes-langsmith-deployment-and-langsmith-studio](https://changelog.langchain.com/announcements/product-naming-changes-langsmith-deployment-and-langsmith-studio))
- **Four deployment tiers:** Self-Hosted Lite (**free, up to 1 million nodes executed**), Cloud SaaS, Bring Your Own Cloud (BYOC, AWS VPC), Self-Hosted Enterprise. ([langchain.com/blog/langgraph-platform-announce](https://www.langchain.com/blog/langgraph-platform-announce))

### How it differs from peers
- **vs. a plain agent loop (`while True: llm → tools`):** adds typed persistent state, automatic per-step checkpointing, HITL via interrupts, conditional routing, parallel node execution, and time-travel debugging.
- **vs. CrewAI:** CrewAI is role-based ("agents as employees"), optimized for quick setup; LangGraph is lower-level graph/state-machine with typed state — more control and production reliability (persistence, HITL), steeper setup. (Comparative speed claims like "CrewAI 5.76x faster on some QA tasks" are third-party and workload-specific.)
- **vs. AutoGen (Microsoft):** AutoGen centers conversational message-passing and dynamic role-play; LangGraph favors explicit typed graph topology and deterministic production pipelines.
- **vs. plain LangChain:** LangChain excels at chaining and broad provider integrations; LangGraph adds durable execution, checkpointing, cycles, HITL, and is now the default runtime under LangChain's `create_agent`. LangGraph does not require LangChain.
- **vs. Temporal/durable-execution frameworks:** similar resume-from-checkpoint durability, but LLM-native (nodes are LLM/tool calls, not arbitrary business logic), plus visual LLM debugging (Studio).
- **vs. OpenAI Agents SDK:** OpenAI's SDK is higher-level and more opinionated; LangGraph is lower-level and model-agnostic (any ChatModel-compatible provider).

### Teaching hooks
1. **"Why graphs over loops."** Start with a naive `while` loop agent, show what breaks (no crash-recovery, no human pause, no branching, no parallelism), then map each LangGraph primitive (checkpointer, interrupt, conditional edge, Send) to exactly one fix. Makes the abstraction feel necessary, not bureaucratic.
2. **The superstep = a database transaction.** Within a superstep, nodes are isolated from each other's writes (they see only prior committed state). Engineers who know ACID immediately grasp why this makes parallelism and failure-recovery predictable.
3. **Channels are the "secret sauce."** Each state field maps to a channel with its own update semantics. `BinaryOperatorAggregate` with `operator.add` is what lets parallel nodes safely append to one list without race conditions — a great lens on why LangGraph parallelizes cleanly. (Teach the real class names, not the "BinOp"/"Delta" shorthand.)
4. **Two APIs, one runtime.** StateGraph vs. Functional API is a clean lesson in interface-vs-runtime separation: same `Pregel` under both; pick by ergonomics (visualization/explicit routing vs. natural Python control flow).
5. **Supervisor vs. swarm as a latency/accuracy tradeoff.** Frame the architectural choice with concrete numbers — but flag them as one team's single-scenario measurements (~4.2s / 2 LLM calls / 94% routing for supervisor vs. ~2.8s / 1 call / 91% for swarm), not an official benchmark. Good for teaching "measure your own workload." ([dev.to/.../supervisor-vs-swarm](https://dev.to/focused_dot_io/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture-1b7e))
6. **Deprecation as a teachable migration.** `langgraph.prebuilt.create_react_agent` → `langchain.agents.create_agent` (deprecated in 1.0, removed in 2.0) illustrates how a framework evolves API surface while promising backward compatibility until a major bump.