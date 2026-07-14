# End-to-End Chip Design Flow · Stage ⑦: Logic Synthesis

> Part seven of the "End-to-End Chip Design Flow" learning series.
> Thirteen numbered main stages: ① Product/Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Verification
> → ⑦ Logic Synthesis → ⑧ Physical Design → ⑨ Signoff → ⑩ Tapeout → ⑪ Wafer Fabrication → ⑫ Packaging & Test → ⑬ Silicon Bring-up / Volume Production.
> DFT spans: ③ test architecture and coverage targets → ④/⑤ test control and testable logic → ⑦ scan/compression/MBIST insertion and ATPG → ⑧ scan-chain reordering plus test-clock, power, and congestion closure → ⑨ test-mode and coverage signoff → ⑫/⑬ ATE, diagnosis, and yield learning.

---

## 0. The Big Picture: From an Idea to Production Silicon

```
① Product/Market Requirements → ② System Specification → ③ Architecture Design → ④ Microarchitecture Design → ⑤ RTL Design
   → ⑥ Functional Verification → ⑦ Logic Synthesis → ⑧ Physical Design (floorplanning/placement/clock tree/routing)
   → ⑨ Signoff (STA/power/EM/IR/physical verification/equivalence) → ⑩ Tapeout
   → ⑪ Fabrication (Fab) → ⑫ Packaging and Test → ⑬ Post-silicon Bring-up/Volume Production
DFT: ③ Test Architecture → ④/⑤ Test Controls and Testable Logic → ⑦ Scan/Compression/MBIST and ATPG → ⑧ Scan-Chain Reordering/Test-Mode Timing and Power Closure → ⑨ Test-Mode and Coverage Signoff → ⑫/⑬ ATE/Diagnosis/Yield Learning
```

**Logic synthesis takes the RTL and functional-verification baseline from Steps ⑤ and ⑥ and establishes the gate-level implementation baseline for physical design (⑧).** RTL is a cycle-level hardware description written in an HDL. Synthesis **translates it into a gate-level netlist composed of standard cells from a specific technology library and the logical nets that connect them**, then optimizes that circuit against timing, area, and power constraints. For DFT, this netlist normally opens the main implementation window for scan, compression, test-point insertion, and initial ATPG. Those structures then iterate bidirectionally with physical design and signoff. This is the first point in the flow where the design becomes **a technology-mapped network of library cells and logical nets**. It is tied to target-library and process assumptions, while placed-and-routed physical interconnect is still to come.

> In one sentence: **RTL describes cycle-level hardware behavior and structure; synthesis compiles it into a concrete selection of library cells and logical connections. A synthesis engine is the hardware world’s compiler and optimizer.**

---

## 1. What Logic Synthesis Really Is

In one sentence: **given synthesizable RTL, a target technology library, and constraints such as clock, area, and power objectives, logic synthesis automatically maps and optimizes the design into a gate-level netlist—a precise standard-cell-and-net representation that physical implementation can place and route.**

### Synthesis Has Three Broad Steps, Much Like a Compiler

1. **Elaboration and translation to generic logic:** parse the RTL into technology-independent structures such as adders, multiplexers, and registers.
2. **Technology mapping:** map the generic logic to **standard cells in the target library**, selecting concrete AND, OR, MUX, and flip-flop variants along with drive strengths and threshold-voltage options.
3. **Optimization:** repeatedly improve the mapped circuit under **timing, area, and power** constraints. This is the central value of synthesis.

### A Required Mental Model: The Synthesis Engine Optimizes Exactly What You Constrain

A synthesis tool cannot infer unstated intent. **If the SDC says the design must run at a certain speed, the engine will work aggressively on timing; if a requirement is absent, the engine has no reason to honor it.** Consequently, **constraint quality is a major determinant of synthesis QoR.**

> The essential principle is **garbage in, garbage out**: with incorrect constraints, the synthesis engine can work extremely hard to optimize the wrong objective.

### Boundaries with RTL Design (⑤) and Signoff (⑨)

- Synthesis **must not change functionality**. The netlist and RTL must remain **logically equivalent**, which is why passing formal equivalence is a release requirement; see Section 3.9.
- Timing analysis inside synthesis is still an **estimate** because routing does not yet exist and interconnect delay comes from models. **Final timing signoff occurs in Step ⑨ after physical implementation.** “Timing closure” during synthesis is preliminary, not the final account.

*For a TPU:* Step ⑤ describes the 256×256 array in RTL. Step ⑦ maps it into target-library standard cells for a 28 nm process, optimizes against a 700 MHz clock constraint, inserts clock-gating cells, and produces the gate-level baseline shared by DFT insertion, initial ATPG, and physical implementation. The published paper provides the broad structure and frequency; the detailed synthesis scripts and results are not public.

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it:** a **synthesis or implementation engineer**, often part of the physical-design organization or a closely coupled neighboring team. RTL design, DFT, low-power, and timing engineers collaborate closely.

**Required inputs:**

- **Synthesizable RTL (⑤)** backed by confidence from **functional verification (⑥)**. Do not synthesize unverified RTL as if it were a production baseline.
- **Technology libraries (`.lib` / Liberty):** standard-cell libraries for the target foundry and process node, including timing, power, and area characterization for every cell.
- **Constraints (SDC):** clock definitions, I/O delays, timing exceptions such as false and multicycle paths, and area or power goals. These are the synthesis engine’s **steering inputs**.
- **Power intent (UPF/CPF)** for multiple-voltage or power-domain designs, plus **DFT requirements** such as scan, compression, and coverage objectives.

> Key principle: synthesis quality of results (QoR) is the product of RTL quality, constraint quality, library quality, and strategy. **Even excellent RTL will not produce a good circuit under incorrect constraints.**

---

## 3. Core Elements of Logic Synthesis

Each item covers **what it is, how it is handled in practice, and what it looks like for a TPU**.

### 3.1 Synthesis Flow and Outputs

- **What it is:** read RTL → elaborate into generic logic → technology-map into standard cells → optimize timing, area, and power → write the gate-level netlist and reports.
- **How it is done:** understand the purpose of each stage and run iteratively. Review reports, refine constraints or strategies, rerun, and continue until QoR meets the agreed targets.
- *For a TPU:* map the RTL for the compute array, Unified Buffer control, instruction decode, and related logic into a 28 nm standard-cell netlist.

### 3.2 Technology Libraries and Standard Cells

- **What it is:** the target process’s **standard-cell library**, a collection of predesigned and precharacterized circuits—gates, flip-flops, multiplexers, adders, and more. Cells come in multiple **drive strengths** and **threshold-voltage (Vt) variants**. Low-Vt cells are fast but leak more; high-Vt cells reduce leakage but are slower.
- **How it is done:** synthesis selects cells from the library to realize the RTL. **Mixing multiple Vt options** is a major leakage-reduction technique: fast cells serve critical paths, while energy-efficient cells serve noncritical paths.
- *For a TPU:* the many MAC and register structures in the array use available library cells; HVT variants can cover noncritical paths to reduce leakage.

### 3.3 Constraints (SDC)

- **What it is:** **Synopsys Design Constraints (SDC)** tell the synthesis engine what the design must achieve: clocks through `create_clock`, input and output delays, timing exceptions such as false and multicycle paths, and area or power targets.
- **How it is done:** constraints must be **accurate and complete**. A missing clock or an incorrect false path sends optimization in the wrong direction, producing either artificial violations or missed real violations. Constraint development is among the most error-prone and consequential parts of synthesis.
- *For a TPU:* define the core clock at 700 MHz, constrain every clock domain, classify crossing paths correctly as false or multicycle where justified, and specify I/O delays.

### 3.4 Timing-Driven Synthesis and Slack

- **What it is:** synthesis prioritizes timing and uses static timing analysis with pre-layout interconnect estimates. For every path it computes **slack = required time − arrival time**. Negative slack is a **timing violation**.
- **How it is done:** focus on critical paths with the worst slack. Remedies include selecting faster cells, restructuring logic, adding pipeline stages when the microarchitecture permits, and retiming. Remember that interconnect delay is still estimated; final signoff comes after physical implementation.
- *For a TPU:* a single MAC stage in the regular array can have ample margin at 700 MHz, while long global control or I/O paths may be the actual timing bottlenecks.

### 3.5 Area and the Timing/Area/Power Tradeoff

- **What it is:** synthesis searches the **PPA trade space**. Improving timing often increases area and power; reducing area can degrade timing.
- **How it is done:** use constraints and tool strategies to select the right priority—timing first, area first, or a balanced objective. Once timing is met, recover area and power on noncritical paths through downsizing and HVT substitution.
- *For a TPU:* if array timing has margin, downsize noncritical cells and use lower-leakage variants while preserving 700 MHz operation.

### 3.6 Power Optimization During Synthesis

- **What it is:** synthesis can insert and optimize power-saving structures, including **automatic clock gating**, **multi-Vt optimization**, and operand isolation, while implementing multiple-voltage and power-domain intent from **UPF/CPF**.
- **How it is done:** RTL written as enable-controlled state updates allows the tool to infer gating and insert integrated clock-gating (ICG) cells. Multi-Vt optimization then maximizes the use of low-leakage cells without violating timing.
- *For a TPU:* clock gating for idle PE columns becomes concrete ICG cells at this stage, while noncritical paths move to HVT cells to reduce whole-chip leakage.

### 3.7 Synthesis Preparation and Handoff for DFT

- **What it is:** synthesis must produce a **DFT-ready** netlist. The target library needs scan-capable cells; clocks, resets, and gating structures must be controllable in test mode; black-box and memory models must be complete; and the information required for later scan, compression, MBIST, and test-point insertion must remain intact.
- **How it is done:** first run testability rule checks and eliminate uncontrollable clocks, problematic asynchronous controls, combinational loops, and unmodeled black boxes. Freeze a coherent RTL, library, SDC/UPF, and naming baseline so that the synthesized netlist and reports can enter DFT’s **primary implementation window**. Scan, compression, test-point insertion, and initial ATPG are covered in the DFT chapter; they are not logic mapping itself. Nevertheless, uncontrollable structures, coverage bottlenecks, or PPA problems discovered there must feed back into RTL, constraints, and synthesis.
- *For a TPU:* array and control netlists must preserve clear clock and reset boundaries. SRAM macros need valid test models and MBIST interfaces so DFT tools can construct test paths without damaging functional behavior. TPU v1’s proprietary DFT implementation is not public.

### 3.8 Synthesis Strategy: Hierarchical vs. Flat, Retiming, and Incremental Runs

- **What it is:** the organization of synthesis. **Hierarchical synthesis** processes modules separately, improving runtime, memory use, and reuse. **Flat synthesis** optimizes across module boundaries and can improve QoR at a much greater computational cost. Other strategies include **retiming**, which moves registers to balance pipeline stages, and incremental synthesis.
- **How it is done:** large chips usually combine hierarchical synthesis with selective flattening of critical blocks. Regular replicated structures such as arrays can reuse a well-synthesized leaf block hierarchically.
- *For a TPU:* the 256×256 array contains massive replication of one PE. **Synthesize a PE hierarchically, then reuse it across the array** for consistent results and manageable runtime.

### 3.9 Formal Equivalence Checking (LEC)

- **What it is:** **Logic Equivalence Checking (LEC)** uses formal methods to **prove mathematically that the synthesized netlist and RTL are logically equivalent**, ensuring that synthesis and downstream optimizations did not change behavior.
- **How it is done:** run formal equivalence with tools such as Formality or Conformal on release candidates and after transformations such as synthesis or logic ECOs that can affect the netlist. **Passing equivalence is a release and signoff requirement.** Incorrect setup or unintended transformations can alter functionality; equivalence checking is the safety net.
- *For a TPU:* prove that the gate-level netlists for the array and control logic are equivalent to the verified RTL, preserving functional correctness from Step ⑥ into the gate domain.

### 3.10 Synthesis Outputs and Coordinated Handoff: Enabling DFT Implementation and Physical Design

- **What it is:** the synthesis release consists of the **gate-level netlist**, post-synthesis **SDC**, UPF and power intent, timing/area/power reports, LEC results, and DFT-readiness reports.
- **How it is done:** treat this package as the common version anchor for DFT insertion, initial ATPG, and **physical design (⑧)**. A netlist containing the required test structures normally starts physical implementation, then evolves with placement feedback, scan reordering, test timing and power analysis, and ECOs. Netlist, library corners, functional and test constraints, chain information, and verification reports must remain a coherent set; mixing versions invalidates the results.
- *For a TPU:* a 28 nm gate-level netlist plus SDC, UPF, models, and reports → concentrated DFT insertion and initial ATPG → a test-structured netlist enters placement and routing ⇄ physical feedback drives updates to chains, constraints, and patterns.

### 3.11 The Synthesis–DFT Interface: A Primary Implementation Window Within a Cross-Flow Discipline

DFT has its own specification, tool chain, fault-coverage gates, and production deliverables, so it merits a dedicated chapter. It is **not**, however, a strictly bounded serial stage between synthesis and physical design. The synthesized netlist marks the window in which scan, compression, test points, and initial ATPG are most often implemented at scale. DFT planning starts earlier, while validation and production closure finish much later. The complete interface looks like this:

```
③ Architecture: reserve scan/MBIST/JTAG resources and define coverage targets
  → ④ Microarchitecture: provide scan-compatible structures, MBIST interfaces, and test-access and observability hooks
  → ⑤ RTL: implement testable controls—avoid uncontrolled gated clocks, combinational loops, and unintended latches; keep state elements scan-eligible
  → ⑦ Synthesis (this chapter): produce a DFT-ready netlist and resolve uncontrollable clocks, resets, and black-box issues
  ⇄ Primary implementation window: replace eligible FFs with scan FFs, stitch scan chains, insert compression,
        test points, and on-chip clock controls as required; integrate or finalize generated MBIST/BISR logic;
        and begin ATPG and fault-coverage closure (stuck-at and transition)
  ⇄ ⑧ Physical design: physically implement and verify scan, compression, OCC, and MBIST/BISR structures;
        reorder scan chains for physical locality; and feed back congestion, timing, and ECO issues
  ⇄ ⑨ Signoff: sign off DFT and at-speed test clocks, power, connectivity, and final patterns together
  → ⑫ Packaging and test: ATE applies the scan and MBIST patterns to screen manufacturing defects device by device
```

- **In one sentence:** Step ⑦ reliably transforms RTL into a DFT-ready netlist. Once that netlist exists, DFT enters its concentrated insertion and initial coverage-closure window. Its **foundation was established in Steps ③, ④, and ⑤**, while physical implementation, signoff, and production closure extend through Steps ⑧, ⑨, ⑫, and ⑬.
- *For a TPU:* the public architecture helps explain how testability should be planned for extensive logic and SRAM, but the actual scan-chain topology, compression ratio, MBIST architecture, and achieved coverage are proprietary and must not be presented as TPU v1 facts.

---

## 4. Tradeoffs That Must Be Revisited Throughout

- **The PPA triangle made concrete:** more timing optimization often means more area and power; area reduction can reduce timing margin. Constraints and tool options determine the balance.
- **Constraint tightness:** an **underconstrained** design misses required optimization and fails downstream; an **overconstrained** design suffers excessive area, power, and runtime, and may become impossible to close.
- **QoR vs. runtime:** flattening can improve QoR but consumes much more time and memory; hierarchy is faster and more scalable but can constrain optimization. Choose according to design scale and criticality.
- **Synthesis is not signoff:** synthesis-time STA uses optimistic interconnect estimates. **Do not confuse synthesis “closure” with final closure**; the authoritative result comes in Step ⑨.
- **Function must not change:** synthesis optimizes implementation, not behavior. **LEC is the mandatory safety net.**

> The essential idea: **a synthesis engine optimizes the objectives expressed in its constraints. It will pursue what you specify and cannot protect requirements that are omitted or wrong. Constraints are the steering mechanism.**

---

## 5. How Logic Synthesis Is Executed: Methods and Tools

- **Synthesis tools:** Synopsys Design Compiler and Fusion Compiler, Cadence Genus, and the open-source **Yosys**.
- **Libraries and constraints:** Liberty (`.lib`) standard-cell libraries, **SDC** constraints, and UPF/CPF power intent.
- **Equivalence checking:** Formality and Conformal for LEC.
- **Downstream and specialized interfaces:** PrimeTime for signoff STA in Step ⑨. DFT tools use the synthesis baseline for concentrated scan/compression insertion and initial ATPG, then continue iterating with physical design (⑧) and signoff (⑨). This chapter is responsible for a usable and reproducible netlist, library, and constraint baseline.
- **Flow:** iterate—run synthesis → review timing, area, and power reports → refine constraints or strategy → rerun until QoR converges; run equivalence at defined release and iteration checkpoints and after relevant ECOs.

---

## 6. Logic Synthesis Deliverables

- **Gate-level netlist:** the principal synthesis output and the shared version baseline for DFT insertion and **physical design (⑧)**. Once the test-structured version enters physical implementation, it continues to evolve with physical feedback.
- **Post-synthesis SDC**, reused downstream for timing constraints.
- **Timing, area, and power reports** for QoR assessment.
- **DFT-ready information:** test-port, clock, and reset definitions; macro models; rule-check results; and constraints for subsequent insertion.
- **Passing equivalence evidence** proving netlist ≡ RTL.

> Synthesis is the design’s first technology-mapped realization. It transforms RTL into library cells and logical nets that physical implementation can place and route, while equivalence checking establishes that functionality was not lost in translation.

---

## 7. Commonly Overlooked but Critical Failure Modes

1. **Incorrect or incomplete constraints—garbage in, garbage out:** missing clocks or incorrect false/multicycle paths drive optimization in the wrong direction, creating false violations or hiding real ones. This is the leading synthesis failure mode.
2. **No equivalence checking:** synthesis or an ECO silently changes function, leaving a netlist that no longer matches the RTL and propagating the defect downstream.
3. **Treating synthesis timing as authoritative:** synthesis STA is optimistic because real interconnect delay does not yet exist; apparent closure disappears after routing.
4. **Overconstraint or underconstraint:** overconstraint causes area, power, and runtime to explode; underconstraint omits required optimization and may be impossible to recover downstream.
5. **Deferring DFT-readiness issues until concentrated insertion:** uncontrollable clocks or resets, missing test models, and ambiguous black-box boundaries block scan insertion and coverage closure, forcing RTL and synthesis rework.
6. **Misusing multi-Vt or power intent:** leakage becomes uncontrolled, or the UPF power-domain intent no longer matches the netlist.
7. **Choosing the wrong hierarchy/flattening strategy:** full flattening overwhelms runtime or memory, while rigid hierarchy blocks important optimization and degrades QoR.
8. **Residual latches or nonsynthesizable RTL:** defects missed in Step ⑤ surface only during synthesis and force rework.

---

## 8. Summary and the Next Step

**Logic synthesis automatically maps and optimizes synthesizable RTL into a gate-level netlist under a technology library and a complete set of constraints. It is the first time the design becomes a technology-mapped network of library cells and logical nets; formal equivalence checking then proves that this implementation remains functionally identical to the RTL.** Its governing principle is that **the synthesis engine optimizes exactly what its constraints express—garbage in, garbage out**. Its most important limitation is that **synthesis timing is still an estimate; final truth comes at signoff (⑨)**. Its indispensable safety net is **LEC, which proves that optimization did not change functionality**.

The next of the thirteen numbered stages is **physical design (⑧)**. At this boundary, the synthesized netlist opens DFT’s primary implementation window: scan, compression, test-point, and on-chip clock-control structures are inserted or finalized, while RTL-integrated JTAG, MBIST/BISR, and other test-control logic are preserved, connected, and verified to create a version suitable for back-end implementation. DFT then iterates repeatedly with physical design and signoff over scan-chain reordering, congestion, timing, test power, and ECOs until the final patterns execute reliably on ATE.
