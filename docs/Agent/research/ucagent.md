---
key: ucagent
name: UCAgent (芯片功能验证 agent)
category: 芯片域 agent
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- Training-data figure was imprecise. The brief cited 'Python 178.44 GB vs. 0.84 GB for HDL.' The paper (from The Stack v2) actually gives THREE figures: Python 178.44 GB, Verilog 9.348 GB, SystemVerilog 0.84 GB. The 0.84 GB refers specifically to SystemVerilog, not 'HDL' as a whole. Corrected in final brief.
- PageTableWalker wording corrected. Brief said it was 'not completed automatically.' More precisely: it could not be completed with the DEFAULT workflow due to scale (155,408 LOC); using a human-in-the-loop strategy, UCAgent achieved the expected verification outcome within ~8 hours. This is a scaling/HITL data point, not an outright failure.
- GPT-5 model label clarified. Brief hedged 'GPT-5-2025 ... unverified whether same as public GPT-5.' The paper uses the explicit dated snapshot 'gpt-5-2025-08-07'. Uncertainty resolved.
- IntegerDivider claim tightened. Paper states code coverage 'exceeds 97% across all three models' for IntegerDivider, and IntegerDivider 'consistently achieves 100% functional coverage.' The brief's compressed phrasing ('>97% code and 100% functional across all three LLMs') is accurate but the >97% figure is the one explicitly tied to 'all three models'; kept both, tightened wording.
- Claude-Sonnet-4.5 testcase-failure detail added: paper reports 'averaging 27.3 failures' (the brief only said 'highest testcase failure rate'). GPT-5 averages 73 bins (confirmed).
- Repo 'last updated' date refined. Brief said 'July 2, 2026.' The latest tagged release is v26.06.24 (June 24, 2026); repo activity may post-date it but the release/version reference point is June 24, 2026. Stars (183) and forks (41) confirmed.
- Picker output-language framing clarified: native interfaces are C++/Python; the additional targets (Java, Scala, Golang, Lua) are supported target languages. Confirmed against repo.
- ChipAgents 'Renoir' + RLVR confirmed as REAL (not fabricated) but sourced only from Alpha Design AI's own blog/PR — kept at 'med' confidence and explicitly labeled vendor-first-party marketing, not independently verified.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- '0.84 GB for HDL' — DUBIOUS/IMPRECISE as originally stated. 0.84 GB is the SystemVerilog figure only; Verilog is separately 9.348 GB. The Python-vs-SystemVerilog contrast is the real argument.
- 'PageTableWalker not completed automatically' — MISLEADING as phrased. It was completed via human-in-the-loop in ~8h; the default fully-automatic workflow could not handle its 155K LOC scale.
- ChipAgents 'Renoir' model and 'RLVR (Reinforcement Learning from Verification Results)' — REAL but UNVERIFIED beyond vendor's own marketing (chipagents.ai blog / PRNewswire). No independent/primary confirmation of capabilities or pricing. Treat as vendor claims.
- Production use of UCAgent inside UnityChipForXiangShan / XiangShan verification — NOT CONFIRMED. UCAgent and UnityChipForXiangShan are sibling repos in the same XS-MLVP org sharing the Python-first verification philosophy, but no accessed source documents an actual production integration.
- The exact names of all 31 stages — still NOT enumerated in the accessible arXiv HTML (paper refers to 'Fig. 3' for the detailed breakdown; only the four macro-phases are described in text). Would need the figure or the repo YAML to list all 31.

**尚未解决的问题:**
- The full list of all 31 stage names is not in the accessible arXiv HTML text (the paper points to 'Fig. 3'). Only the four macro-phases (requirement analysis, infrastructure, coverage model, testcase/bug analysis) are described in prose. Definitive stage names require the figure or the repo's workflow YAML.
- Whether UCAgent is used in PRODUCTION within UnityChipForXiangShan / the XiangShan (Kunminghu) verification effort is unconfirmed. The two are sibling repos in the same XS-MLVP org sharing the Python-first philosophy, but no accessed source documents an actual integration.
- ChipAgents 'Renoir' model capabilities, base MoE model, and pricing are only from the vendor's own blog/PRNewswire — not independently verified.
- Precise per-model coverage breakdowns for UART-16550 and ALU754 (beyond 'generally surpass 86% functional') were not fully enumerated from the accessed HTML; exact tables would need the paper's results figures.
- The 'testcase failure rate' framing for Claude-Sonnet-4.5 (paper: 'averaging 27.3 failures') — the denominator/normalization (failures per run vs per stage) was not fully specified in the extracted text.
- The exact quantitative head-to-head vs. PRO-V/UVM²/MAVF is not provided in the paper as apples-to-apples numbers (different benchmark DUTs), so any cross-framework coverage comparison remains directional, not rigorous.

---
## UCAgent — End-to-End Agent for Block-Level Functional Verification

### What it is + who/when
**UCAgent** is an open-source, LLM-powered end-to-end agent that automates **block-/unit-level hardware functional verification** (not full-chip simulation). It replaces the traditional manual flow — engineers hand-writing UVM/SystemVerilog testbenches — with an agent loop driving a **configurable 31-stage verification workflow implemented entirely in Python**.

- **Paper:** *UCAgent: An End-to-End Agent for Block-Level Functional Verification*, arXiv **2603.25768**, submitted **March 26, 2026**, licensed **CC BY 4.0**. (https://arxiv.org/abs/2603.25768)
- **Authors:** Junyue Wang, Zhicheng Yao, Yan Pi, Xiaolong Li, Fangyuan Song, Jinru Wang, Yunlong Xie, Sa Wang, Yungang Bao.
- **Affiliations:** State Key Lab of Processors, Institute of Computing Technology (ICT), CAS; University of Chinese Academy of Sciences (UCAS); Beijing Institute of Open Source Chip (BOSC). (Yungang Bao's group.)
- **Ecosystem:** Part of the **XS-MLVP / UnityChip ("万众一芯开放验证")** open-source verification stack. Repo **XS-MLVP/UCAgent** — **183 stars, 41 forks, Apache-2.0, Python** (~78.6%); latest release **v26.06.24** (June 24, 2026). (https://github.com/XS-MLVP/UCAgent)
- **Motivation stated in paper:** functional verification consumes ~**70% of IC development time**.

### Architecture & named components
Four layers plus one cross-cutting mechanism:

1. **Workflow Management Layer** — `VerifyStage` + `StageManager` classes. Stages are defined in **user-configurable YAML**; each stage references Markdown templates in `Guide_Doc/` (with variable substitution like `{PROJECT}`, `{DOC_GEN_LANG}`, `{OUT}`). State is serialized at each transition for resumability; forward progression is gated on checker pass. (https://ucagent.open-verify.cc/content/03_develop/04_template/)
2. **Agent Middleware Layer** — built on **LangChain**; unifies multi-LLM API access into a central **VerifyAgent** driven by a **ReAct** reason→act loop.
3. **MCP Tool Layer** — capabilities exposed via **Model Context Protocol** in two categories: **(a) workflow-control tools** (stage queries, trigger checkers, advance/rollback) and **(b) verification-environment tools** (compile, run tests, retrieve coverage). This layer can be driven by UCAgent's built-in LLM client **or** delegated to an external Code Agent (**OpenHands, GitHub Copilot, Claude Code, Gemini-CLI, Qwen-Code**) over MCP.
4. **Python Verification Environment Layer** — **Picker** compiles Verilog/SystemVerilog RTL into **PyDUT** (a Python package backed by a compiled `.so`); **Toffee** wraps PyDUT with UVM-inspired abstractions **Bundle / Agent / Model / Env**. The LLM writes all testbenches/tests in **Python via Toffee** — no SystemVerilog generation.

**VCLM (Verification Consistency Labeling Mechanism, cross-cutting):** three hierarchical label levels — **FG = Function Group, FC = Function Checkpoint, CK = Check Point** — injected into prompts and validated by stage-specific checkers so that specification → coverage model → testcases stay traceable; bidirectional extraction flags hallucination/semantic drift.

**Supporting tools (verified):**
- **Picker** (XS-MLVP/picker, ~90 stars, C++): RTL→high-level-language codegen. Supported simulators: **Verilator, Synopsys VCS, GSIM, UniVista Simulator (UVS)**. Native **C++/Python** interfaces; additional target languages **Java, Scala, Golang, Lua**. (https://github.com/XS-MLVP/picker)
- **Toffee** (XS-MLVP/toffee, **v0.1.3**, Oct 26 2024): Python verification framework incorporating UVM methodology elements; requires **Picker 0.9.0+**. (https://github.com/XS-MLVP/toffee)

### How one task flows through it (e.g., verifying an integer divider)
1. **Input** — engineer supplies the RTL DUT (`.v`/`.sv`), a spec document, and optionally a YAML workflow config.
2. **Picker conversion** — RTL compiled against a simulator (e.g., Verilator) → **PyDUT** Python API mirroring the DUT's ports/signals.
3. **Requirement-analysis stages** — agent reads spec, produces an **FG/FC/CK-labeled functional decomposition**; a deterministic checker validates label completeness before `StageManager` advances.
4. **Infrastructure stages** — agent uses Toffee **Bundle/Agent** abstractions to write Python drivers/wrappers for PyDUT; checker confirms code runs without import/runtime errors.
5. **Coverage-model stages** — agent builds a Toffee functional coverage model (groups/bins) with VCLM labels mapped from the spec; checker validates spec↔coverage label correspondence.
6. **Testcase stages** — agent fills templates → executable Python tests, runs against PyDUT, receives coverage as tool feedback, and iterates within a per-stage retry budget until bins are hit or budget exhausted.
7. **Bug-analysis stages** — on unexpected failure, agent receives the trace, performs bug-oriented analysis, and logs suspected DUT defects (with FG/FC/CK back-tracing).
8. **Completion** — final state, coverage metrics, and a report are serialized (code coverage %, functional bin counts, discovered bugs).

**Human-in-the-loop:** an engineer can intervene at any stage, fix an artifact, and let the agent **resume from that stage** rather than restart.

### Distinctive design decisions & tradeoffs
1. **Python over SystemVerilog** — the core bet: LLMs write far better Python than HDL. Grounding figure from **The Stack v2**: **Python 178.44 GB vs. Verilog 9.348 GB vs. SystemVerilog 0.84 GB** of training data. Tradeoff: must maintain the Picker/PyDUT/Toffee stack; industrial EDA expects SV output.
2. **31-stage granularity** — empirically derived by refining a coarser workflow on checker-failure analysis. Finer stages localize errors but add orchestration overhead; the count is configurable.
3. **Deterministic per-stage checkers** (not LLM judges) — gate progression, preventing error accumulation (the main failure mode of single-prompt approaches). Tradeoff: a checker must be authored per stage type.
4. **VCLM semantic traceability** — machine-checkable FG/FC/CK tags prevent coverage models drifting from spec intent; sacrifices natural-language flexibility.
5. **MCP as the interface** — makes UCAgent composable: any MCP-capable Code Agent can drive it; adds an MCP dependency/attack surface.
6. **State persistence / resumability** — serialize at every transition → resume after interruption + post-hoc per-stage failure-rate analysis.
7. **YAML+Markdown workflow-as-data** — domain experts customize workflows without touching framework code.

**Interaction modes:** standard, enhanced, advanced; plus **Master mode** (web-based centralized agent management). **Backends** (OpenAI-compatible via `config.yaml`): langchain, claude, opencode, copilot, kilo, qwen, iflow.

### Evaluation (verified)
- **DUTs:** UART-16550 (268 LOC), ALU754/FPU (572), IntegerDivider (1,024), LaneFAdd (1,283), ICache-WayLookup (3,483), **PageTableWalker (155,408)**.
- **Headline:** up to **98.5% code coverage** and up to **100% functional coverage**. **IntegerDivider** exceeds **97% code coverage across all three models** and consistently reaches **100% functional coverage**; ALU754 and UART-16550 generally surpass 86% functional.
- **LLMs:** **Claude-Sonnet-4.5** (85.9% avg code coverage, ~91 min avg, highest testcase-failure rate ~**27.3** failures avg); **GPT-5 (`gpt-5-2025-08-07`)** (most stable, consistently 100% functional, ~73 bins avg); **Qwen3-Coder-Plus** (74.7% avg code coverage, ~74 min avg, fastest).
- **Real bug find:** UCAgent discovered previously unknown boundary-condition defects in **LaneFAdd** and back-traced them to specific FG/FC/CK points.
- **Scaling limit / HITL:** the 155,408-LOC **PageTableWalker** could **not** be completed by the default automatic workflow; with a **human-in-the-loop** strategy UCAgent reached the expected outcome in **~8 hours**.

### How it differs from peers
- **vs. UVM² / "From Concept to Practice: an Automated LLM-aided UVM Machine"** (arXiv **2504.19959**, **ICCAD 2025**): UVM² *generates SystemVerilog UVM* testbenches and refines via coverage feedback (**87.44% code / 89.58% functional** on its benchmark). UCAgent avoids SV entirely (Python+Toffee) and uses a more granular 31-stage workflow. (Different benchmarks — not directly comparable.) (https://arxiv.org/abs/2504.19959)
- **vs. UVLLM** (arXiv **2411.16238**, Nov 25 2024): UVLLM targets RTL error detection/fix (**86.99% syntax-fix / 71.92% functional-fix**), not test/coverage generation. (https://arxiv.org/abs/2411.16238)
- **vs. MAVF / "A Multi-Agent Generative AI Framework for IC Module-Level Verification Automation"** (arXiv **2507.21694**, Jul 29 2025): MAVF uses *multiple specialized agents* (spec parser / strategy / code). UCAgent is a *single agent with a staged workflow* — specialization by stage decomposition, not role decomposition. (https://arxiv.org/abs/2507.21694)
- **vs. PRO-V** (cited in the paper): pure-Python generation but **lacks a functional coverage model / traceability**; UCAgent adds VCLM-driven coverage as a first-class stage.
- **vs. ChipAgents (Alpha Design AI, San Jose CA — commercial)**: closed **"Renoir"** agentic MoE model, UVM-targeted, exploring **RLVR (Reinforcement Learning from Verification Results)**. UCAgent is academic/open-source, model-agnostic, Python-native. *(Renoir/RLVR details are from the vendor's own blog/PR — treat as marketing.)* (https://chipagents.ai/blogs/ai-agents-uvm)
- **vs. ChipStack UVMaiAgent (commercial SaaS)**: UVM testbench enhancement, closed-source. (https://www.chipstack.ai/product-pages/uvmaiagent)

### Teaching hooks
1. **Match output modality to LLM capability, not to industry convention** — the 178.44 GB Python vs 0.84 GB SystemVerilog contrast is a crisp justification for the Python-native design.
2. **Staged workflow + deterministic checkers = error containment** — decomposing a long agentic task with per-stage validators to stop error accumulation is a reusable reliability pattern.
3. **Agent-as-tool / tool-as-agent inversion via MCP** — UCAgent both *uses* tools and *is* a tool other agents drive; a clean illustration of composable multi-agent architecture.
4. **VCLM as structured grounding** — the FG/FC/CK hierarchy with bidirectional checker validation generalizes the problem of keeping semantic consistency across a long workflow.
5. **Full-stack open ecosystem** — Picker → Toffee → UCAgent → UnityChipForXiangShan shows an academic group building an AI-native verification pipeline end-to-end, contrasting with closed commercial agents.
6. **Benchmark honesty** — the paper openly reports that the 155K-LOC PageTableWalker needed human-in-the-loop decomposition, a candid example of current LLM-agent scaling limits.

### Key sources
- Paper: https://arxiv.org/abs/2603.25768 · HTML: https://arxiv.org/html/2603.25768v1
- Repo: https://github.com/XS-MLVP/UCAgent · Org: https://github.com/XS-MLVP
- Picker: https://github.com/XS-MLVP/picker · Toffee: https://github.com/XS-MLVP/toffee
- Docs: https://ucagent.open-verify.cc/ · Ecosystem: https://open-verify.cc/en/
- Peers: https://arxiv.org/abs/2504.19959 · https://arxiv.org/abs/2411.16238 · https://arxiv.org/abs/2507.21694 · https://chipagents.ai/blogs/ai-agents-uvm