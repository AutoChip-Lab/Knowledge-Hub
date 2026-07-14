# End-to-End Chip Design Flow · Stage ⑨: Signoff

> Part nine of the "End-to-End Chip Design Flow" learning series.
> Numbered main flow: ① Product/Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Verification
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

**Signoff sits between physical design (⑧) and tapeout (⑩).** The back end has produced a layout that appears converged, but can it really be manufactured, and will it operate across every required condition? Signoff is the **final, most stringent examination with signoff-grade, qualified tools before tapeout**. It establishes, under worst-case conditions, that timing, power, power integrity, signal integrity, physical rules, and logical equivalence to RTL are all clean. **Only when every required check is green should the project press the irreversible tapeout button.**

> In one sentence: **every earlier “close enough” must become certainty at signoff. Signoff does not accept “it should work,” because it guards an irreversible gate worth millions of dollars.**

---

## 1. What Signoff Really Is

In one sentence: **use signoff-grade tools under the most rigorous conditions—multi-mode, multi-corner analysis and on-chip variation—to perform the final multidomain validation of the layout. Timing, power, power delivery, signal integrity, physical verification, and functional equivalence must all be clean before tapeout is authorized.**

### Why Signoff Cannot Be Skipped or Relaxed

- **Tapeout is irreversible:** once masks are made, a defect is embodied in silicon. Recovery requires a re-spin, often costing millions of dollars and several months.
- **Signoff is the authoritative source of record:** timing analysis during synthesis and implementation progressively approaches reality. Signoff uses **extracted parasitics (SPEF), the full required set of corners, and on-chip variation**. A check is truly passed only when it passes at signoff.
- **Golden tools:** foundries and the industry qualify signoff-grade tools—PrimeTime for STA, for example—so their results can support formal engineering approval.

### Signoff Is Not One Check; Every Dimension Must Be Clean Together

Signoff comprises a suite of checks, described individually in Section 3. **If any required dimension is red, the design cannot tape out.** Signoff is an aggregate gate: the project issues a tapeout release only after every discipline provides acceptable evidence.

*For a TPU:* Step ⑧ produces a converged 28 nm layout. Step ⑨ must use extracted parasitics to prove 700 MHz timing across all required 28 nm corners, verify that IR drop remains acceptable under full-array activity, confirm power against budget, achieve clean DRC and LVS, and prove that the final gate-level netlist remains equivalent to the verified RTL. Only then can tapeout proceed.

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it:** **signoff, STA, and physical-verification teams**, together with physical-design, power, and reliability engineers. The project makes the final decision through a formal **tapeout review**.

**Required inputs:**

- The **final layout from Step ⑧**: GDSII and the final gate-level netlist.
- **Extracted parasitics (SPEF):** accurate RC derived from the completed layout.
- **Multi-corner, multi-mode libraries and constraints:** timing libraries for every required PVT corner, SDC, and definitions for functional, scan-shift, at-speed capture, MBIST, and other operating modes.
- The **DFT baseline:** final scan chains and ScanDEF, OCC and test-clock definitions, MBIST and JTAG modes, DFT DRC/connectivity/coverage reports, and the versioned final ATPG patterns.
- **Power and power-delivery data**, process DRC/LVS decks and DFM requirements, and the **RTL reference for equivalence checking**.

> Key principle: signoff is deliberately skeptical. It assumes the design contains problems until every required dimension proves otherwise. Signoff does not optimize the design; it **decides whether the design is fit for tapeout**.

---

## 3. Core Elements of Signoff

Each item covers **what it is, how it is handled in practice, and what it looks like for a TPU**.

### 3.1 Signoff Flow and Golden Tools

- **What it is:** organize the complete signoff program—prepare extracted parasitics and multi-mode, multi-corner data; run each signoff discipline in parallel; then aggregate results at a tapeout gate—using industry-qualified signoff tools.
- **How it is done:** drive every discipline to zero violations or to a state where every residual violation has a rigorous explanation and approved waiver. Signoff is highly iterative: a failure returns to physical design (⑧) for an ECO, and the affected analyses rerun until the project is green.
- *For a TPU:* prepare SPEF and all required corners for the 28 nm layout, then coordinate timing, power, power-integrity, physical-verification, and equivalence signoff.

### 3.2 Static Timing Analysis (STA): The Primary Signoff Battleground

- **What it is:** **Static Timing Analysis (STA)** uses extracted parasitics to analyze all timing paths without simulation stimulus, checking both **setup—whether data arrives soon enough—and hold—whether it changes too soon**.
- **How it is done:** STA is vectorless and covers all modeled timing paths in one analysis, making its **path coverage more comprehensive than simulation**. But STA does not understand function. It analyzes logically impossible **false paths** and functionally valid **multicycle paths** as ordinary single-cycle paths unless correct **SDC timing exceptions** exclude or reclassify them. Incorrect exceptions create either excessive pessimism or missed real failures. In addition to functional modes, signoff must cover scan shift, scan enable, OCC launch/capture, MBIST and JTAG modes, and cross-domain lockup paths. **A setup failure may sometimes be mitigated by reducing frequency; a hold failure cannot and is a hard silicon risk.** Both must meet the release criteria.
- *For a TPU:* extracted-parasitic STA is the final evidence that every array and global path meets setup and hold at 700 MHz. It is what makes the published frequency physically credible.

### 3.3 Multi-Mode Multi-Corner Analysis and On-Chip Variation (MMMC / OCV)

- **What it is:** **Multi-Mode Multi-Corner (MMMC)** signoff analyzes the Cartesian product of operating modes—functional, test, low power, and others—and required **PVT corners**, including process variants such as SS, TT, and FF, supply voltage, and temperature. **OCV, AOCV, and POCV** account for variation within one die through appropriate derating or statistical models.
- **How it is done:** the design must pass the relevant worst-case combinations. Slow process, low voltage, and high temperature commonly stress setup; fast conditions commonly stress hold. Omitting one corner can leave a silicon failure that occurs precisely under that condition.
- *For a TPU:* every required 28 nm corner and mode must pass so that 700 MHz remains stable at data-center temperatures and under supply variation.

### 3.4 Power Signoff: Dynamic and Leakage

- **What it is:** establish that total power remains within budget, including **dynamic switching power and static leakage**, at both average and peak activity. Analysis may use workload activity vectors or vectorless estimation.
- **How it is done:** confirm compliance with TDP and cooling and supply limits. Peak power also drives power-integrity risk. Test modes require independent analysis because broad simultaneous switching during scan shift or capture can be more aggressive than a typical functional workload; the analysis must align with ATPG low-power constraints.
- *For a TPU:* compare workload-based analysis with the published 28–40 W power range and the product's power-delivery and cooling limits. Public sources do not disclose TPU v1's private signoff vectors, peak-versus-idle split, leakage breakdown, or signoff margin; those values must not be inferred from the published range.

### 3.5 Power Integrity: IR Drop and Electromigration

- **What it is:** **power-integrity signoff** covers static and dynamic **IR drop**, the voltage loss caused by current through the PDN, and **electromigration (EM)**, long-term metal degradation caused by excessive current density.
- **How it is done:** excessive IR drop lowers the voltage seen by cells and can cause timing or functional failure. Excessive EM reduces product lifetime. High-current structures such as compute arrays demand particular scrutiny, and signoff must prove that the implemented PDN can support them.
- *For a TPU:* full activity in the 256×256 array creates large transient current. IR-drop and EM signoff establish that the Step ⑧ power mesh controls droop and remains reliable over product life.

### 3.6 Signal-Integrity Signoff

- **What it is:** **signal-integrity signoff** determines whether **crosstalk-induced delay changes or noise glitches** can violate timing or corrupt function.
- **How it is done:** include crosstalk effects in SI-aware STA. Signal integrity becomes increasingly dominant at advanced nodes and requires dedicated signoff rather than a nominal timing check.
- *For a TPU:* verify that coupling among dense parallel array wires and noise on long buses do not compromise 700 MHz timing.

### 3.7 Physical-Verification Signoff: DRC, LVS, and Antenna

- **What it is:** the final hard examination of layout geometry and connectivity, including **DRC**, **LVS**, **antenna checks**, ERC, and related requirements, using qualified golden tools.
- **How it is done:** results must be **clean**, with any remaining item either repaired or covered by a foundry-approved waiver. This is a hard requirement for foundry layout acceptance and tapeout.
- *For a TPU:* the complete 28 nm die must achieve clean DRC, LVS, and applicable antenna/ERC checks before the foundry accepts the tapeout database.

### 3.8 Logical-Equivalence Signoff (LEC)

- **What it is:** the **final equivalence check** proves that the final gate-level netlist, after synthesis, physical optimization, and every ECO, remains logically equivalent to the verified RTL.
- **How it is done:** physical optimization and ECOs can modify logic. **LEC is the standard formal method used to prove that functionality was not silently changed.** It preserves the functional-correctness chain from verification in Step ⑥ all the way to tapeout.
- *For a TPU:* prove that the netlist represented by the final layout is equivalent to the RTL verified in Step ⑥, maintaining functional correctness through release.

### 3.9 Reliability and Design for Manufacturability: DFM, ESD, Latch-Up, and Aging

- **What it is:** signoff for **yield and long-term reliability**, including **Design for Manufacturability (DFM)** improvements such as redundant vias and lithography-friendly geometry, **ESD and latch-up** protection, and aging margins for mechanisms such as HCI and NBTI.
- **How it is done:** DFM improves yield and reduces unit cost. ESD, latch-up, and aging checks determine whether the chip remains stable in the field, especially under continuous data-center operation.
- *For a TPU:* data-center deployment requires high long-term reliability, so these checks support production yield and service-life targets.

### 3.10 Signoff Gate and Tapeout Decision

- **What it is:** aggregate every signoff discipline into a **formal release gate**, covering both functional and DFT test modes. Only a green result—or residual items with complete explanation and approval—produces the **tapeout release**.
- **How it is done:** conduct a formal review with a checklist and accountable approvals. In addition to conventional STA, power, physical verification, and LEC, confirm final scan/MBIST/JTAG connectivity; test-mode STA and EM/IR; and version consistency among chains, ECOs, and ATPG patterns. Signoff, DFT, physical-design, and project owners then jointly approve the release.
- *For a TPU:* every signoff discipline turns green → the tapeout review passes → the 28 nm GDSII is released to the foundry.

---

## 4. Tradeoffs That Must Be Revisited Throughout

- **Rigor vs. schedule:** greater rigor reduces risk, but every signoff and ECO iteration takes time. Omitting one necessary analysis can jeopardize an entire product generation. The release plan must set an appropriately strict bar.
- **Worst-corner thinking:** the question is not whether the typical case runs; it is whether every required mode and corner passes with on-chip variation. Signoff judges the worst applicable case.
- **Setup may be recoverable; hold is a hard failure:** lowering frequency can ease some setup failures. It cannot fix hold. Hold violations can create intermittent silicon errors and demand zero tolerance at release.
- **Violations vs. waivers:** not every reported item must be repaired; an expert or foundry may approve a valid waiver. Every waiver, however, needs defensible evidence and accountable signoff.
- **Respect for irreversibility:** tapeout cannot be undone. It is better to run one additional analysis than to release unresolved doubt into silicon.

> The essential idea: **signoff is the final set of eyes before an irreversible decision. It assumes the design is faulty until every required dimension and worst-case corner proves otherwise. It does not make the design better; it decides whether the design is worthy of tapeout.**

---

## 5. How Signoff Is Executed: Methods and Tools

- **Timing signoff (STA):** Synopsys PrimeTime and Cadence Tempus for MMMC analysis with extracted parasitics and OCV.
- **Power signoff:** PrimePower and Voltus.
- **Power integrity (EM/IR):** Ansys RedHawk-SC and Cadence Voltus for rail analysis.
- **Physical verification:** Calibre, IC Validator, and Pegasus for DRC, LVS, antenna, and DFM.
- **Equivalence checking (LEC):** Formality and Conformal.
- **Parasitic extraction:** StarRC and Quantus, commonly producing SPEF.
- **Flow:** run disciplines in parallel → aggregate violations → return to Step ⑧ for ECOs → rerun affected signoff analyses, iterating until every requirement is green and the tapeout review approves release.

---

## 6. Signoff Deliverables

- **Signoff reports for every discipline**—STA, power, EM/IR, SI, physical verification, LEC, and reliability—with all items clean or formally waived.
- A **tapeout signoff checklist and release decision**, the formal authorization to manufacture.
- The **final GDSII and associated release data**, delivered to **tapeout (⑩)** and then to the foundry.

> The signoff deliverable is not merely a file. It is **accountable certainty that the project can commit to tapeout**, integrating evidence from every dimension of the flow strongly enough to support an irreversible decision.

---

## 7. Commonly Overlooked but Critical Failure Modes

1. **A missing corner or mode:** nominal operation passes, but the chip fails at an omitted PVT corner or in an omitted test or low-power mode. Incomplete MMMC coverage is the leading signoff failure mode.
2. **Residual hold violations:** hold cannot be repaired by lowering frequency. A missed violation creates intermittent silicon errors and can make the device unusable.
3. **Underestimated IR drop or EM:** voltage loss in a high-current block causes timing or functional failure, or electromigration shortens lifetime. Power integrity is frequently underestimated.
4. **SI and crosstalk omitted from signoff:** real electrical coupling causes silicon timing failures that nominal delay analysis misses.
5. **No final LEC:** a physical-design ECO silently changes function and the defect tapes out.
6. **Residual DRC or LVS issues:** the foundry rejects the layout or the project releases silicon with a known physical risk.
7. **Treating signoff as a formality:** a checklist is completed without rigor at worst-case conditions, and failures appear only after tapeout, forcing an expensive re-spin.
8. **Unsupported waivers:** violations are dismissed without evidence that an approver can defend, hiding rather than managing risk.
9. **Signoff disconnected from physical design:** violations bounce repeatedly between Steps ⑧ and ⑨ without a disciplined closure loop and destroy the schedule.

---

## 8. Summary and the Next Step

**Signoff is the final and most rigorous multidomain examination before tapeout. Signoff-grade tools analyze timing through STA, dynamic and leakage power, power integrity through EM/IR analysis, signal integrity, physical rules through DRC and LVS, and equivalence to RTL across all required modes, corners, and variation models, producing an accountable release decision.** Its governing principle is that **“it should work” is not evidence; every required worst-case condition must demonstrate that it works**. Its defining responsibility is respect for **the irreversibility of tapeout**, and its zero-tolerance failures include **hold violations and unresolved DRC/LVS errors**.

The next step, Step ⑩, is **tapeout**: formally release the signed-off final GDSII to the foundry for mask generation. At that point, the design moves from data into a manufacturing order worth millions of dollars—an irreversible commitment.
