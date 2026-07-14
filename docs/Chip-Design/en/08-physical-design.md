# End-to-End Chip Design Flow · Stage ⑧: Physical Design

> Part eight of the "End-to-End Chip Design Flow" learning series.
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
DFT: ③ Test Architecture → ④/⑤ Test Control and Testable Logic → ⑦ Scan/Compression/MBIST and ATPG → ⑧ Scan Reordering/Test Timing and Power → ⑨ Test-Mode and Coverage Signoff → ⑫/⑬ ATE/Diagnosis/Yield Learning
```

**Physical design, commonly called the back end, takes the gate-level implementation from logic synthesis (⑦) and drives it toward signoff (⑨) and tapeout (⑩).** The baseline entering physical design normally contains an initial implementation of scan, compression, MBIST, and related test structures, but it still describes only **logical connectivity**—which gates are connected—not final locations. Physical design places those cells **within the die area**, choosing coordinates for every cell, routes for every net, a power-delivery structure, and a clock-distribution network, ultimately producing a manufacturable **layout**. DFT does not end here: scan reordering, placement of test logic, test-clock and test-power closure, and backend ECOs continually drive updates to chains, constraints, coverage, and patterns.

> In one sentence: **synthesis produces a logical wiring diagram; physical design turns it into a real layout with a location for every gate and a route for every net. Interconnect delay now becomes physical reality.**

---

## 1. What Physical Design Really Is

In one sentence: **under the target process’s physical rules, transform a gate-level netlist through floorplanning, cell placement, clock-tree synthesis, routing, and timing/power/physical-rule closure into a manufacturable GDSII layout.**

### Why This Step Is a Qualitative Change: Delay Finally Becomes Real

Timing during synthesis is an **estimate**. No wires have been routed, so interconnect delay comes from models. After placement and routing, cells have coordinates and wires have actual lengths and metal layers. Their **parasitic resistance and capacitance (RC) are now known**, and delay approaches the final physical value. Many designs that appear closed in synthesis reveal serious problems after routing. The central back-end challenge is to **close timing and power while preserving routability in the real physical implementation**.

> The essential idea: **front-end timing is still a projection; the back end reveals reality because only placed and routed interconnect has real delay.**

### Simultaneous Multi-Objective Closure in the Back End

Physical design is not a single-objective optimization. It must satisfy all of the following **at the same time**: **timing** to reach frequency, **area** to control die cost, **routability** to avoid congestion, **power and power integrity** to meet IR-drop and electromigration limits, and **physical rules** to achieve clean DRC and LVS. Failure in any one dimension means the design is not closed.

*For a TPU:* Step ⑦ produces the synthesized netlist for structures such as the 256×256 array, and DFT enters its concentrated structural implementation window after synthesis. Step ⑧ places the array, the SRAM macros for the 24 MiB Unified Buffer, accumulators, and test logic together on a 28 nm die no larger than 331 mm². It reorders scan chains using physical locality to reduce wirelength and congestion, and closes the test clock tree, shift/capture timing, test power, and IR drop. Every ECO or chain-mapping change requires connectivity to be rechecked and patterns to be revalidated. The actual DFT architecture is not public; this example describes the standard coordination model rather than undisclosed TPU v1 details.

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it:** **physical-design/back-end engineers**, working closely with synthesis and timing-signoff teams.

**Required inputs:**

- A **gate-level netlist suitable for starting physical design after the first DFT insertion pass**, based on the synthesized netlist from Step ⑦, plus functional- and test-mode **SDC**. This is not a one-time final netlist; scan reordering, timing and congestion feedback, and ECOs will update it.
- **Physical libraries and process files:** standard-cell physical abstracts in **LEF**, timing libraries (`.lib`), process design rules such as technology LEF and DRC decks, SRAM/IP macro LEF and timing models, and the **metal-stack definition**.
- **Floorplanning inputs:** die and core dimensions, I/O and pad locations, macro-placement constraints, and the power-delivery concept.
- **Power intent (UPF/CPF)** plus scan-chain, compression, MBIST, and on-chip-clock-control (OCC) information; ScanDEF or equivalent chain mapping; and test-mode definitions.

> Key principle: the back end is where optimistic assumptions become physical obligations. Timing, area, routability, and power assumptions made earlier must be realized with actual coordinates and metal layers. If they cannot be realized, the project must iterate back into synthesis or even RTL.

---

## 3. Core Elements of Physical Design

Each item covers **what it is, how it is handled in practice, and what it looks like for a TPU**.

### 3.1 Physical-Design Flow and Data Preparation

- **What it is:** the complete back-end sequence—data preparation → floorplanning → power-delivery network → placement → clock tree → routing → timing and physical closure → layout generation—along with import of the netlist, LEF, technology files, constraints, and related data.
- **How it is done:** ensure that libraries, process files, constraints, and macro views are complete and mutually consistent before implementation begins. The back end is **highly iterative**: every major step reviews timing, congestion, and power, and failures drive the design back to an earlier step.
- *For a TPU:* load the array netlist, 28 nm process rules, SRAM macro LEFs, and 700 MHz constraints to establish the implementation database.

### 3.2 Floorplanning

- **What it is:** define the **die and core dimensions and shape, target utilization, I/O and pad ring, placement of large macros such as SRAM, PLL, and IP, and reserved routing and power corridors**.
- **How it is done:** floorplanning often determines the project’s global outcome. Poor macro placement creates congestion, timing failure, and blocked power delivery downstream. Large regular structures such as arrays and SRAM banks should align with dataflow and power delivery, while utilization must leave enough whitespace for routing.
- *For a TPU:* place the 256×256 array as a regular block and arrange the SRAM macros forming the 24 MiB Unified Buffer—which occupy substantial die area—near its edges so that data-supply paths remain short.

### 3.3 Power Planning and the Power-Delivery Network (PDN)

- **What it is:** design the **power-delivery network**: power rings, straps or meshes, and local rails that deliver current to every cell while keeping **IR drop and electromigration (EM)** within limits.
- **How it is done:** high-switching, high-current regions such as compute arrays require a sufficiently strong power mesh. A weak PDN causes voltage droop, timing failure, and potentially incorrect function. Power structures also consume routing metal, so PDN strength and signal-routing capacity must be balanced.
- *For a TPU:* the 256×256 array draws substantial current at full activity and therefore needs a strong mesh to control IR drop; otherwise, the array can become locally starved of supply voltage.

### 3.4 Placement

- **What it is:** place **standard cells** at legal sites within the core using both timing-driven and congestion-driven optimization, then legalize the result.
- **How it is done:** bring timing-critical cells closer together to reduce long interconnect, while monitoring **congestion**. An overly dense placement cannot be routed. Placement quality strongly determines the difficulty of clock-tree synthesis and detailed routing.
- *For a TPU:* the array’s regularity is an implementation advantage. Rows of PEs can be placed in a structured pattern with a clear dataflow direction and manageable congestion.

### 3.5 Clock-Tree Synthesis (CTS)

- **What it is:** before CTS, clocks are treated as ideal: zero skew, no implemented distribution network, and zero or estimated insertion delay. CTS builds the actual clock network—buffer trees, H-trees, or meshes—with the goals of **low skew and reasonable insertion delay**, while integrating clock gating.
- **How it is done:** uncontrolled clock-arrival differences consume setup or hold margin depending on their direction and can create violations. CTS controls this skew while distributing the clock to thousands or millions of sequential elements. Skew is signed, however: deliberately directed **useful skew** can borrow margin between paths and aid closure, as discussed in Section 3.7. It is distinct from the uncontrolled variation CTS seeks to remove. Timing becomes substantially more realistic after CTS.
- *For a TPU:* distribute a 700 MHz clock with low skew across every sequential element in a very large array. The larger the array, the harder clock distribution becomes.

### 3.6 Routing

- **What it is:** implement every connection with **real metal interconnect**. **Global routing** allocates broad routing corridors, and **detailed routing** selects the exact path and metal layer for every net while satisfying DRC.
- **How it is done:** allocate connections across multiple metal layers and monitor spacing, width, congestion, and crosstalk. If routing cannot complete, return to placement or floorplanning. Once routing is complete, interconnect RC is fully geometry based.
- *For a TPU:* the array contains regular short local connections together with global control and data buses. Regularity improves predictability, but the sheer number of nets still creates a large implementation workload.

### 3.7 Timing Closure and ECO

- **What it is:** repeatedly run STA after placement, CTS, and routing, repair **setup violations** by improving speed and **hold violations** by adding delay, and continue until timing is clean. **Useful skew** and incremental **engineering change orders (ECOs)** are key repair mechanisms.
- **How it is done:** setup fixes include faster cells, shorter interconnect, and local replacement; hold fixes usually insert dedicated delay cells. This is one of the most time-consuming iterative battles in the back end and continues from placement through routing. Physical reality corrects optimistic synthesis estimates.
- *For a TPU:* the short MAC path inside the array may have comfortable setup margin, while long global paths and hold closure require more effort. Hold repair across a large array can be especially tedious.

### 3.8 Parasitic Extraction and Signal Integrity

- **What it is:** **RC extraction** calculates the real resistance and capacitance of every routed net and writes data such as SPEF for accurate timing. **Signal-integrity (SI)** analysis addresses physical effects such as **crosstalk and noise**.
- **How it is done:** rerun timing with extracted RC. At advanced nodes, **electrical crosstalk** and **double/multiple patterning** must both be handled, but they are different phenomena. Pattern decomposition and layout coloring can require mask-aware extraction that distinguishes same-mask and different-mask coupling capacitance; SI crosstalk is an electrical-noise problem. Do not conflate the two.
- *For a TPU:* extract crosstalk between dense neighboring array wires and RC on long buses, then verify that 700 MHz remains valid with real parasitics.

### 3.9 Physical Verification: DRC, LVS, and Antenna

- **What it is:** mandatory checks on the finished geometry. **Design Rule Checking (DRC)** verifies dimensions such as width and spacing; **Layout Versus Schematic (LVS)** verifies that layout connectivity matches the netlist; antenna checks cover manufacturing-induced charging risks, among other rules.
- **How it is done:** **DRC and LVS must be clean** except for formally accepted foundry waivers. This is a hard gate for layout acceptance; a design that fails cannot tape out. Physical design repeatedly runs and repairs these checks.
- *For a TPU:* the complete die must pass DRC, LVS, and all applicable antenna and electrical-rule checks before GDSII can be released for fabrication.

### 3.10 Physical Implementation of Low-Power and DFT Structures

- **What it is:** realize prior low-power and DFT intent in the physical layout. This includes placement of power switches, isolation cells, level shifters, and always-on regions; **physical scan-chain reordering**; placement of compression logic, OCC, and MBIST controllers; and test-clock routing.
- **How it is done:** implement power-domain boundaries and isolation according to UPF. Reconnect scan chains using physical locality while respecting clock domains, power domains, and lockup rules, reducing detours and balancing chain lengths. After every reorder or ECO, export updated chain information, recheck connectivity, and regenerate or validate ATPG patterns against the final netlist.
- *For a TPU:* clock gating for idle PE columns becomes placed ICG cells and implemented clock-tree branches; any separate power-gating intent becomes switches, isolation, retention, and always-on structures. If the large array uses scan, its chains should be reordered by physical location to avoid long detours and congestion. Public sources do not disclose TPU v1’s actual chain or power-domain architecture.

### 3.11 Outputs and Handoff: Preparing GDSII

- **What it is:** the principal back-end output is the **GDSII or OASIS layout**, accompanied by extracted parasitics, the final netlist, and implementation reports. These data go to **signoff (⑨)** for comprehensive STA, power, EM/IR, and physical verification before **tapeout (⑩)**.
- **How it is done:** release a coherent package of clean, converged layout and analysis data. Physical implementation and signoff usually iterate until every gate is green.
- *For a TPU:* converged 28 nm layout → signoff → tapeout after approval.

### 3.12 Cross-Flow View: How Low-Power Intent and UPF Span the Design Flow

Like DFT, low-power implementation is a **cross-cutting discipline**. **UPF or CPF is the source of truth for power-domain intent**—voltage domains, isolation, level shifting, retention, power states, and always-on behavior. Clock gating, activity assumptions, and multi-Vt optimization also depend on RTL, constraints, libraries, and tool settings; they are not defined by UPF alone. The distributed activities connect as follows:

```
③ Architecture: partition voltage/power domains and define the TDP budget and low-power states (P/C-states)
  → ④ Microarchitecture: choose gating granularity, operand isolation, and retention strategy (power hooks)
  → ⑤ RTL: express enable-controlled updates so tools infer gating; pair RTL with UPF rather than hand-gating clocks
  → ⑥ Verification: run power-aware simulation for power-down/up, retention, and isolation behavior
  → ⑦ Synthesis: infer or insert ICG cells from RTL enables and constraints, optimize multiple Vt cells, and use UPF/CPF to implement power-domain boundaries
  → ⑧ Physical design (this chapter): place power switches, isolation cells, level shifters, always-on regions, and the PDN
  → ⑨ Signoff: sign off dynamic and leakage power, IR drop, and EM, and prove that the netlist matches UPF intent
```

- **In one sentence:** **UPF/CPF is the power-intent contract carried from Step ③ through Step ⑨.** It defines voltage domains, isolation, level shifting, retention, and always-on behavior; tools at each stage implement and cross-check that intent. A missing isolation cell or misplaced level shifter can produce the classic result “simulation passed, silicon failed,” or allow leakage to become uncontrolled.
- *For a TPU:* fine-grained clock gating for idle PE columns progresses from an RTL enable in Step ⑤, to an inserted ICG in Step ⑦, to ICG placement and clock-tree implementation in Step ⑧, and finally to dynamic-power and clocking signoff in Step ⑨. Separately, any UPF-defined power domains proceed through switch, isolation, retention, and always-on implementation and signoff. Keeping these mechanisms distinct avoids conflating clock gating with power gating.

---

## 4. Tradeoffs That Must Be Revisited Throughout

- **Simultaneous multi-objective closure:** timing, area, routability, power and power integrity, and DRC must all converge. **Failure in one dimension means the layout is not done.**
- **Area vs. routability:** aggressive utilization reduces die area but creates congestion and timing failure; too much whitespace wastes die cost.
- **Clock skew vs. power:** a more balanced clock tree reduces skew but often requires more buffers and consumes more power.
- **PDN strength vs. routing resources:** a robust mesh controls IR drop but competes with signal nets for metal layers.
- **The back end must repay front-end optimism:** synthesis timing and area assumptions must be realized in physical geometry. If they cannot be, the project returns to Step ⑦ or even Step ⑤.
- **New problems at advanced nodes:** crosstalk, multiple patterning, EM, and IR drop become increasingly dominant at 7 nm and 5 nm.

> The essential idea: **the back end is where every optimistic front-end assumption must be paid for with real coordinates, metal layers, parasitics, and a power grid. If any objective fails to converge, the layout cannot be released.**

---

## 5. How Physical Design Is Executed: Methods and Tools

- **Implementation tools:** Cadence Innovus, Synopsys IC Compiler II and Fusion Compiler, and Aprisa for floorplanning, placement, CTS, and routing.
- **Parasitic extraction:** StarRC and Quantus, commonly producing SPEF.
- **Signoff STA:** PrimeTime, using extracted RC for final timing in Step ⑨.
- **Physical verification:** Calibre, IC Validator, and Pegasus for DRC, LVS, and antenna checks.
- **Data formats:** LEF/DEF for physical implementation, GDSII/OASIS for layout, SPEF for parasitics, and UPF for power intent.
- **Flow:** highly iterative—after every major step, review timing, congestion, power, and DRC; step back and adjust whenever one dimension fails, until all objectives converge together.

---

## 6. Physical-Design Deliverables

- **GDSII/OASIS layout:** the final physical artifact and the core input to **tapeout (⑩)** after signoff.
- **Final gate-level netlist and parasitics (SPEF):** used for authoritative timing and power signoff in Step ⑨.
- **Timing, power, congestion, and DRC/LVS reports:** evidence of convergence.
- **Clean physical-verification evidence:** a hard prerequisite for tapeout.

> The back-end deliverable is the first manufacturable geometric realization of the abstract design. It gives every preceding logical decision a physical form that a fab can build.

---

## 7. Commonly Overlooked but Critical Failure Modes

1. **Weak floorplanning:** poor macro placement or utilization creates downstream congestion, timing failure, and blocked power delivery, often forcing a restart. It is the leading back-end failure mode, and early mistakes are the most expensive.
2. **An inadequate PDN:** excessive IR drop starves cells, causing timing or functional failure; excessive EM reduces product lifetime.
3. **Uncontrolled congestion:** an overpacked design cannot be routed, regardless of how good estimated timing looks.
4. **Poor clock-skew control:** the design misses frequency and accumulates widespread hold violations.
5. **Treating synthesis timing as final:** post-route RC is ignored until routing reveals a large set of real violations.
6. **Unclean DRC or LVS:** the foundry rejects the layout; the hard tapeout gate cannot be passed.
7. **Ignoring crosstalk and SI, especially at advanced nodes:** real electrical noise causes timing failure in silicon.
8. **Incomplete hold repair:** unlike setup violations, hold violations cannot be rescued by reducing frequency. A missed hold failure creates intermittent silicon errors.
9. **Incorrect physical implementation of low-power or DFT intent:** broken power-domain boundaries, isolation, or scan reordering compromises power behavior or testability.

---

## 8. Summary and the Next Step

**Physical design, or the back end, takes a gate-level netlist through floorplanning, placement, clock-tree synthesis, and routing under real process rules, while closing timing, area, routability, power, and physical verification together, and ultimately produces a manufacturable GDSII layout.** Its central truth is that **delay becomes real here, and every optimistic front-end assumption must be realized in physical coordinates and metal layers**. Its nonnegotiable gate is that **unclean DRC or LVS blocks tapeout**. Its most time-consuming challenge is **simultaneous multi-objective closure**.

The next step, Step ⑨, is **signoff**: perform the final and most stringent analysis of this layout—STA with extracted parasitics, dynamic and leakage power, EM and IR drop, physical verification, and equivalence to RTL. Only when every required signoff check is green can the project authorize tapeout in Step ⑩.
