# End-to-End Chip Design Flow · Design for Test (DFT)

> A dedicated Design for Test (DFT) chapter in the "End-to-End Chip Design Flow" series. This page is a cross-stage entry point, not a strictly bounded serial stage.
> Thirteen numbered main stages: ① Product/Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Verification
> → ⑦ Logic Synthesis → ⑧ Physical Design → ⑨ Signoff → ⑩ Tapeout → ⑪ Wafer Fabrication → ⑫ Packaging & Test → ⑬ Silicon Bring-up / Volume Production.
> DFT spans: ③ test architecture and coverage targets → ④/⑤ test control and testable logic → ⑦ scan/compression/MBIST insertion and automatic test pattern generation (ATPG) → ⑧ scan-chain reordering plus test-clock, power, and congestion closure → ⑨ test-mode and coverage signoff → ⑫/⑬ automated test equipment (ATE), diagnosis, and yield learning.

---

## 0. The Big Picture: Why DFT Spans Multiple Main-Flow Stages

```
③ Architecture: define test-quality targets, test interfaces, ATE time/power budgets, and memory-repair strategy
  → ④/⑤ Microarchitecture and RTL: make clocks, resets, registers, memories, and power domains testable
  → ⑦ Synthesis: produce a DFT-ready netlist, libraries, SDC/UPF, and macro test models
  ⇄ Primary implementation window: insert scan/compression/MBIST/JTAG/OCC after synthesis and begin ATPG and coverage closure
  ⇄ ⑧ Physical design: scan reorder, test-logic placement, and joint closure of test clocks, power, and routing
  ⇄ ⑨ Signoff: test-mode STA, power, EM/IR, connectivity, equivalence, and final-pattern validation
  → ⑫/⑬ ATE and production: screen every device; feed failures back into diagnosis, pattern optimization, and yield learning
```

The overview does not portray DFT as a conventional circular node placed between synthesis and physical design. Instead, it uses a DFT relationship frame aligned with the main-flow stages to show concrete touchpoints from architecture planning to ATE, diagnosis, and yield learning. Organizational boundaries vary with toolchains, IP-delivery models, and implementation methodology. A common practice is to perform concentrated insertion of scan, compression, selected MBIST connectivity, test points, and on-chip clock control after a synthesized netlist exists, while starting ATPG and coverage closure. That is the **primary implementation window**, not the beginning or end of DFT. If test access, memory redundancy, controllable clocks and resets, and a test-power budget were not reserved earlier—or if physical feasibility, test-mode signoff, tester deployment, and failure diagnosis are not completed later—the DFT flow is not closed.

> In one sentence: **Functional verification asks whether the design logic meets its specification; DFT allows production test to ask whether this particular manufactured chip contains a defect and whether that defect can be detected at an economically acceptable cost.**

---

## 1. What Exactly Is DFT?

In one sentence: **DFT adds controllability, observability, and access structures for internal logic, embedded memories, and chip boundaries without changing normal functional behavior, then generates tests from manufacturing fault models so wafer and final test can screen defective devices at high quality and acceptable cost.**

### Four concepts that must not be confused

- **Functional verification** finds design errors: Does the RTL implement the specification? Are protocols, computations, and exception behavior correct?
- **Structured production test** finds manufacturing defects: Does the device contain opens, shorts, stuck-at faults, delay defects, or memory-cell faults?
- **Functional or code coverage** measures how thoroughly a verification environment has explored the design; **ATPG fault coverage** measures what fraction of a defined set of abstract faults can be detected by generated patterns. They are different metrics.
- DFT cannot prove that the functional design is correct, and functional verification cannot replace manufacturing test. They address different risks.

A modern SoC contains enormous numbers of internal state elements. External pins cannot directly control or observe every one. DFT uses a limited number of test ports and on-chip test structures to make deeply internal nodes **controllable, observable, and accessible**.

> The central idea: **DFT equips a chip with a diagnostic infrastructure. It must reveal faults, test quickly and repeatably, support localization, and remain economical in production.**

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it**: a **DFT or test-design engineer** leads the work in collaboration with RTL, synthesis, physical design, STA, low-power, memory/IP, ATE, product engineering, and yield teams. DFT structures are implemented on the design side, but their final value appears on the tester and in production data.

**Primary inputs**:

- Verified RTL or the synthesized netlist from ⑦, plus scan-cell definitions and test models from the standard-cell libraries.
- Clock, reset, clock-domain, and test-mode definitions; functional and test SDC; and the OCC/PLL strategy.
- UPF/CPF descriptions of power domains, power-down behavior, isolation, retention, and always-on logic.
- A complete inventory of embedded memories, including port timing, MBIST models, redundant rows and columns, and repair interfaces.
- Chip- and IP-level access requirements, including JTAG/TAP, core wrappers, and IJTAG instrument access.
- Product-quality objectives and fault models, together with ATE channel, frequency, vector-memory, test-time, and power limits.
- Continuously updated placement and partition information for physically aware DFT, scan reordering, congestion estimation, and test-power analysis. Back-end ECOs can in turn require chain and pattern revalidation.
- For 2.5D and 3D products, die and stack topology, die-to-die interfaces, and pre-stack and post-stack test strategies.

> The essential mindset: **DFT is not the pursuit of one coverage number. It is simultaneous closure of test quality, test cost, performance and area overhead, test power, physical feasibility, and diagnostic capability.**

---

## 3. Core DFT Activities: From Planning to the Production Feedback Loop

Each item below explains **what it is, how it is done, and an important boundary or example**.

### 3.1 DFT specification, test-architecture planning, and testability DRC

- **What it is**: define test modes, fault models, coverage targets, scan-channel and chain-length targets, compression architecture, MBIST hierarchy, JTAG/IJTAG access, ATE data volume, test time, and power budgets.
- **How it is done**: run DFT rule checking on RTL or an early netlist to identify uncontrollable clocks and resets, combinational loops, latches, black boxes, tri-state logic, X sources, cross-power-domain paths, and non-scannable registers. Every waiver needs a rationale, owner, and verification evidence.
- **Important boundary**: DFT DRC is not ordinary lint. It asks whether the design can shift, capture, and observe reliably in test mode. The earlier a violation is found, the less expensive the repair.

### 3.2 Test-access architecture: JTAG, core wrappers, and IJTAG

- **What it is**: construct the access network from external pins to internal test resources. IEEE 1149.1 JTAG/TAP and boundary scan primarily address chip-boundary, board, package-interconnect, and standardized-access needs. IEEE 1500 wrappers enable hierarchical test of embedded cores. IEEE 1687, or IJTAG, provides access to embedded instruments such as MBIST controllers, sensors, and monitors.
- **How it is done**: plan TAP instructions, test-data registers, wrapper bypass paths, instrument networks, access security, and hierarchical pattern retargeting. Verify that each IP can enter, bypass, and exit its test modes correctly at both core and SoC levels.
- **Do not confuse these concepts**: the presence of JTAG does not mean internal logic scan is complete. Reusing a TAP for CPU debug does not automatically create a manufacturing-test architecture.

### 3.3 Scan, test compression, and test-structure insertion

- **What it is**: map ordinary flip-flops to scan flip-flops and connect them into scan chains in test mode. Add decompressors and response compactors so a small number of external channels can drive and observe many short internal chains. Where necessary, insert observation and control test points to improve controllability and observability of difficult logic.
- **How it is done**: plan chain count, maximum chain length, clock- and power-domain grouping, scan enable, lockup latches, X-bounding and X-masking, and compression ratio. In functional mode, scan multiplexers must select the functional path and remain transparent to normal operation. After insertion, run chain-connectivity checks and functional-mode logic equivalence checking (LEC).
- **Trade-off**: more chains reduce shift time but require more channels or a more complex compression network. Excessive compression can worsen congestion and X handling, increase pattern count, and reduce diagnostic resolution.
- *Using the public TPU v1 structure as an illustration*: a large repetitive compute array and substantial SRAM explain why both logic scan/compression and memory DFT matter. Public papers do not disclose TPU v1's scan-chain count, compression ratio, MBIST architecture, or achieved coverage. The examples here describe accepted industry methods and must not be presented as product-specific facts.

### 3.4 ATPG, fault models, and coverage closure

- **What it is**: automatic test pattern generation (ATPG) searches for stimuli that activate a target fault and propagate its effect to an observable point. Fault simulation then establishes which modeled faults each pattern detects.
- **Common models**: **stuck-at faults**, in which a node behaves as though fixed at 0 or 1; **transition faults**, including slow-to-rise and slow-to-fall behavior and forming a foundation for at-speed testing; and, where product quality requires them, bridging, path-delay, cell-aware, and other models.
- **How it is done**: generate and compact patterns separately for each model. Analyze detected, untestable, ATPG-untestable, aborted, and unresolved faults. Add test points for random-pattern-resistant or structurally difficult logic, document auditable exclusions for genuinely untestable items, and iterate until both coverage and pattern-count targets are met.
- **Important boundary**: fault coverage is not the same as physical defect coverage, and neither is equivalent to final defective-parts-per-million (DPPM). DPPM also depends on the actual defect distribution, fault-model fidelity, parametric tests, and the complete test strategy. A report that says only "99%" is incomplete.

### 3.5 Memory DFT: MBIST, diagnosis, BIRA, and BISR

- **What it is**: embedded SRAM and similar memories are not efficiently tested by logic scan alone. An MBIST controller applies read/write algorithms such as March tests and records failing addresses. When a macro includes redundant rows or columns, built-in redundancy analysis (BIRA) determines a repair solution, eFuse or OTP stores the repair signature, and built-in self-repair (BISR) logic reloads and applies that mapping at power-up.
- **How it is done**: complete the memory inventory and grouping, match ports, timing, and algorithms, balance parallelism against power, and verify the full chain of fail capture, diagnosis, redundancy analysis, fuse programming, and repair reload.
- **Do not confuse these concepts**: ECC primarily addresses run-time soft errors or a limited number of permanent faults. BISR applies a stored repair mapping so redundant rows or columns substitute for resources identified as faulty during manufacturing test. They are complementary, not substitutes.
- *For an AI accelerator*: memories often occupy a large fraction of die area, so MBIST and BISR directly affect yield, test time, and cost per good unit and can be as important as logic scan.

### 3.6 Boundary scan, LBIST, and other on-chip self-test

- **Boundary scan**: places scan cells around chip I/O to control and observe board-, package-, and die-to-die interconnect, typically through a JTAG TAP. A BSDL file describes the device's boundary-scan structure.
- **Logic BIST (LBIST)**: uses an on-chip pseudo-random pattern generator and response compactor to test logic, reducing dependence on external pattern storage and supporting power-on or in-field test. It must still address random-pattern-resistant logic, X values, coverage, aliasing probability, and test power.
- **How to choose**: no single combination is mandatory for every product. Automotive and high-reliability devices may prioritize periodic self-test and safety mechanisms; cost-sensitive products must weigh area, execution time, and safety requirements carefully.

### 3.7 Test clocks, low-power modes, test power, and X handling

- **Test clocks**: scan shift, low-speed capture, and at-speed launch/capture may use different frequencies and sequences. OCC design, PLL bypass, multiple clock domains, cross-domain lockup, and test-mode SDC must be defined together.
- **Test power**: scan shift and capture can create widespread simultaneous switching that rarely occurs in functional operation. Excessive power can cause IR drop, false failures, overheating, or even damage. ATPG fill strategies, clock gating, and partitioned scheduling are used to control peak and average activity.
- **X sources**: uninitialized memories, analog IP, powered-down domains, and black boxes can corrupt response compactors. X-bounding and X-masking can contain this contamination, but excessive masking removes observability and coverage.
- **Low-power modes**: each test mode must define which domains are powered, how isolation is controlled or bypassed, and how retention is handled. Functional-mode UPF assumptions cannot simply be copied into test mode.

### 3.8 Physically aware DFT and scan reordering

- **What it is**: a logically correct DFT structure must also be placeable, routable, and capable of meeting timing and power limits. After placement, scan chains are reordered according to physical proximity, and compression logic, OCCs, MBIST controllers, and test-access networks are placed deliberately.
- **How it is done**: shorten chain wiring, balance chain lengths, and control congestion while obeying clock-domain, power-domain, and lockup rules. After a back-end ECO or reordering pass, export updated chain information and recheck connectivity.
- **Important boundary**: old ATPG patterns must not be assumed valid after the netlist or chain definition changes. Patterns must be regenerated from the final design or subjected to rigorous validation against it.

### 3.9 DFT verification and test-mode signoff

- Run DFT DRC before and after insertion; check complete chain connectivity, length, polarity, clocking, and power relationships.
- Simulate or statically validate scan shift, MBIST, JTAG/IJTAG, and representative ATPG patterns and protocols.
- Run functional-mode LEC to prove that the DFT-inserted design remains functionally equivalent to the verified RTL.
- Include every test mode in STA and MMMC. At-speed capture, scan enable, OCC behavior, and cross-domain lockup cannot be left as unverified assumptions.
- Apply power, EM/IR, UPF isolation and power-down, and security-access checks to test modes as well as functional modes.

### 3.10 ATE patterns, protocols, and final handoff

- **What it is**: ATPG ultimately delivers patterns, waveforms, timing, and mode-transition protocols that can execute on ATE—not merely a coverage report. STIL and WGL commonly carry test-pattern data into conversion and tester-program environments; SVF is commonly used where JTAG or boundary-scan vector delivery applies.
- **How it is done**: complete pattern validation, tester conversion, cycle and pin mapping, mode sequencing, initialization and reset, and pass/fail criteria. Correlate behavior across simulation, ATE, and silicon.
- **Handoff recipients**: physical design and signoff in ⑧/⑨ receive the DFT-inserted netlist, ScanDEF, test SDC, and validation baseline; the ATE team in ⑫ receives patterns, waveforms, constraints, and debug information; product and yield teams receive diagnosis models.

### 3.11 Failure diagnosis and the yield-learning feedback loop

- **What it is**: wafer and final test record failing patterns, cycles, channels, and memory addresses. Scan and memory diagnosis map observed failures to candidate logic cells, interconnects, memory cells, or physical locations.
- **How it is done**: correlate diagnosis across many failing dies with layout, process layer, lot, wafer, and spatial location to reveal systematic defects, then feed findings back into patterns, design rules, and the manufacturing process.
- **Key insight**: DFT does not end when ATPG finishes. Patterns must run reliably on the tester, test cost must remain acceptable, bad devices must be screened, failures must be localizable, and yield must continue to improve.

### 3.12 DFT for 2.5D and 3D chips

- **What it is**: a 3D product must test logic within each die, die-to-die interconnect, known-good-die status before stacking, partially assembled stacks, and the completed stack. IEEE 1838 defines a framework for test access in stacked-die systems.
- **How it is done**: plan for each die to be independently testable before assembly and still accessible after stacking. Cover TSVs, micro-bumps, hybrid bonds, and other die-to-die connections while jointly budgeting test bandwidth, ATE pins, parallel-test power, and thermal load.
- **Why it matters for this project**: if a bad die is discovered only after expensive stacking and packaging, the scrap cost is amplified. Pre-stack KGD screening and post-stack interconnect test must be first-class elements of a 3D-chip flow.

---

## 4. Trade-offs That Persist Throughout DFT

- **Test quality versus test cost**: adding fault models and patterns generally improves screening but also increases ATE data volume and execution time.
- **Coverage versus power, performance, and area (PPA)**: test points, compression, OCCs, and MBIST/BISR improve testability but consume area and power and may affect critical paths.
- **Compression ratio versus implementation and diagnosis**: higher compression does not guarantee fewer patterns and can worsen X sensitivity, congestion, and diagnostic ambiguity.
- **Test power versus defect activation**: excessive activity causes IR drop and false failures, while suppressing activity too aggressively may hide dynamic defects.
- **Hierarchical reuse versus top-level optimization**: reusing IP-level patterns can reduce ATPG runtime, but wrappers, retargeting, and top-level clock and power relationships still require validation.
- **Security versus accessibility**: test and debug ports need powerful access and therefore create a potential attack and asset-leakage surface. Lifecycle permissions, authentication, and production locking must be designed from architecture onward.
- **Coverage percentage versus auditability**: the same percentage means different things when the fault model, denominator, or exclusions differ. Every metric must be reproducible and explainable.

> The central idea: **Good DFT does not mean "the highest coverage." It means a production-ready, auditable balance among quality, cost, performance and area overhead, test power, diagnosis, and security.**

---

## 5. How DFT Is Implemented: Methods, Tools, and Standards

- **Main flow**: DFT specification → RTL testability and DRC → MBIST/JTAG/core-wrapper integration → synthesized-netlist baseline → scan/compression/test-point/OCC insertion → post-DFT DRC and LEC → ATPG and fault simulation → scan-chain reordering → final-pattern validation → ATE and diagnosis feedback loop.
- **Commercial tool families**: Synopsys TestMAX, Siemens Tessent, and Cadence Modus cover scan and compression, ATPG, MBIST, diagnosis, and physically aware DFT. Tool choice depends on process, IP, methodology, team experience, and company licenses.
- **Key standards**: [IEEE 1149.1](https://standards.ieee.org/ieee/1149.1/10977/) for JTAG/boundary scan; IEEE 1500 for core test wrappers; IEEE 1687 for IJTAG; IEEE 1450 for STIL; and IEEE 1838 for stacked-die test.
- **Common data**: synthesized netlists, Liberty and test models, SDC/UPF, ScanDEF or chain maps, BSDL, CTL, ICL/PDL, STIL/WGL pattern data, SVF where applicable, fault lists and coverage databases, and diagnosis models.
- **Official product entry points**: [Synopsys TestMAX DFT](https://www.synopsys.com/implementation-and-signoff/rtl-synthesis-test/test-automation/dftmax.html) and [Cadence Modus](https://www.cadence.com/en_US/home/tools/digital-design-and-signoff/test-automation/modus-test.html).

> Methodology rule: **Whenever a netlist, scan chain, clock, power definition, or physical ECO changes, reconfirm that structures remain connected, functional behavior remains equivalent, patterns remain valid, and test modes remain signed off.**

---

## 6. Major DFT Deliverables at Each Milestone

- An approved **DFT specification**, test-architecture diagram, mode definitions, fault models, and coverage, time, and cost targets.
- DFT-inserted RTL or gate-level netlists, functional and test SDC, UPF configuration, and a version manifest.
- Scan, compression, test-point, and OCC structures, plus ScanDEF or chain mapping.
- MBIST/BISR controllers, memory maps, algorithms, diagnosis, and repair/eFuse protocols.
- TAP and boundary scan plus BSDL; core wrappers and CTL; and IJTAG ICL/PDL where adopted.
- ATPG patterns for each fault model, fault-simulation and coverage reports, and exclusion and waiver lists.
- DFT DRC, connectivity, LEC, STA, power and EM/IR, and pattern-validation reports.
- ATE-ready STIL/WGL pattern data, applicable SVF data, waveform and mode-transition documentation, and tester constraints.
- Failure-diagnosis models and databases, together with handoff packages for physical design, signoff, ATE, product, and yield teams.

> The release criterion is not "the tool completed." **Every deliverable must be version-consistent, every mode reproducible, every unresolved item assigned an owner, risk, and waiver, and every downstream team able to continue closure from the handoff.**

---

## 7. Easily Overlooked but Potentially Fatal Pitfalls

1. **Treating DFT as a post-synthesis patch**: when architecture reserved no access, power budget, or memory redundancy, late repair is expensive and disruptive.
2. **Confusing functional coverage with manufacturing-test coverage**: green functional simulation does not prove that opens, shorts, or delay defects can be screened.
3. **Treating JTAG, internal scan, and IJTAG as one thing**: their interfaces, targets, and deliverables differ and they cannot replace one another.
4. **Optimizing a single coverage percentage**: a beautiful number can hide risk if the model, denominator, untestable and aborted faults, and exclusions are not examined.
5. **Uncontrollable test clocks or resets**: missing lockups across domains or incomplete OCC, PLL, or test SDC definitions make ATE patterns unstable.
6. **Excessive X-masking**: tests appear runnable but observability and fault coverage disappear behind the mask.
7. **Ignoring test power**: simulation passes, while IR drop or overheating on ATE causes false failures or yield loss.
8. **Assuming MBIST integration is complete when it merely connects**: memory models, diagnosis, redundancy analysis, eFuse loading, and repair verification may still be missing.
9. **Overaggressive compression**: coverage, pattern count, congestion, or diagnostic resolution can get worse rather than better.
10. **Reusing old patterns after scan reordering or an ECO**: the chain definition has changed, so the patterns may no longer apply or may test the wrong state elements.
11. **Signing off functional mode only**: test-mode STA, UPF, power, EM/IR, and connectivity problems survive until silicon.
12. **No secure lifecycle control on test access**: production or field devices retain unauthorized access paths that expose keys or proprietary assets.
13. **Testing a 3D chip only after final assembly**: without KGD and die-to-die interconnect strategies, one bad die multiplies stack and package loss.

---

## 8. Summary and Collaboration with the Remaining Main-Flow Stages

**DFT builds a complete test infrastructure that begins with controllable and observable internal state, enables ATPG to create high-coverage patterns, and allows ATE to execute those patterns economically and diagnose failures.** It is not merely the insertion of a few scan chains and is not a substitute for functional verification. It jointly encompasses scan and compression, MBIST/BISR, JTAG/IJTAG, clocks, power, physical implementation, ATE, security, and the post-silicon yield loop.

> The central idea: **Functional verification demonstrates that the design logic is correct; DFT gives production test a measurable ability to screen each physical device for modeled manufacturing defects.**

Within the thirteen numbered main stages, the **primary implementation window** for structural DFT insertion and initial ATPG opens after synthesis in ⑦, while the main flow continues into physical design in ⑧. DFT then iterates bidirectionally with physical implementation and signoff in ⑨: scan reordering, ECOs, clock or power changes, and layout changes may all require renewed validation of chain connectivity, equivalence, coverage, and patterns. The resulting capability is realized in packaging, test, and ATE in ⑫, then continuously improved using failure diagnosis and yield data from production in ⑬.
