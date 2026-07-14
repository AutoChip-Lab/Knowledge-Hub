# End-to-End Chip Design Flow · Stage ②: System Specification

> The second article in the End-to-End Chip Design Flow series.
> Thirteen numbered core stages: ① Product / Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Functional Verification
> → ⑦ Logic Synthesis → ⑧ Physical Design → ⑨ Signoff → ⑩ Tapeout → ⑪ Wafer Fabrication → ⑫ Packaging & Test → ⑬ Silicon Bring-up / Volume Production.
> Design for Test (DFT) touches several of these stages: ③ test architecture and coverage targets → ④/⑤ test controls and testable logic → ⑦ scan, compression, and MBIST insertion plus ATPG → ⑧ scan-chain reordering and test-mode timing, power, and congestion closure → ⑨ test-mode and coverage signoff → ⑫/⑬ ATE deployment, diagnosis, and yield learning.

---

## 0. The Big Picture: From an Idea to Production Silicon

```text
① Product / Market Requirements → ② System Specification → ③ Architecture Design
   → ④ Microarchitecture Design → ⑤ RTL Design → ⑥ Functional Verification
   → ⑦ Logic Synthesis → ⑧ Physical Design (floorplan / placement / CTS / routing)
   → ⑨ Signoff (STA / power / EM/IR / physical verification / equivalence)
   → ⑩ Tapeout → ⑪ Wafer Fabrication → ⑫ Packaging & Test
   → ⑬ Silicon Bring-up / Volume Production

DFT: ③ Test architecture → ④/⑤ Test controls and testable logic
   → ⑦ Scan / compression / MBIST insertion and ATPG
   → ⑧ Scan-chain reordering and test-mode timing / power closure
   → ⑨ Test-mode and coverage signoff → ⑫/⑬ ATE / diagnosis / yield learning
```

Stage ② converts the product targets from Stage ① into a precise technical contract that Stage ③ can implement as an architecture. A statement such as “deliver an energy-efficient LLM inference card within 300 W by Q4 2027” is still product language. The system specification defines supported data types and workloads, exact interface generations, operating conditions, registers, error behavior, measurable performance, and the criteria by which the finished device will be accepted.

The system specification is the chip program's **single source of truth**. Architecture must satisfy it; design must implement it; verification must trace tests to it; and silicon validation must use it to decide whether the device is correct. Ambiguity in the specification does not disappear downstream—it becomes incompatible assumptions, verification gaps, or silicon defects.

---

## 1. What This Stage Actually Is

In one sentence: **translate business goals into a complete, unambiguous, feasible, and verifiable engineering specification that states what the chip must do, under which conditions, to what level, and how compliance will be judged.**

Keep three layers distinct:

- **PRD / Target Specification:** what the market and product need, and why.
- **System specification:** the externally visible engineering contract—the precise, measurable **WHAT**.
- **Architecture:** the internal structure selected to satisfy that contract—the **HOW**.

The governing rule is **specify WHAT, not HOW**.

- Appropriate requirement: “At batch size 32, output-token latency shall be below 10 ms; the device shall support FP16 and FP8; the host interface shall be PCIe 5.0 x16.”
- Inappropriate requirement at this level: “Use a 256 × 256 systolic array.” That is an architecture choice and would prematurely exclude other valid implementations.

The specification supports three downstream questions: **What must architecture deliver? What must verification measure? What does done mean?**

The running example remains a data-center LLM inference accelerator card.

---

## 2. Who Writes and Approves It

A **system architect or systems engineer** normally serves as the specification owner. Product management ensures fidelity to the PRD, while design, verification, software, packaging, test, security, reliability, operations, and key customers participate in review.

Verification must be involved from the beginning. A requirement that cannot be observed, stimulated, measured, or bounded is not ready for approval. Likewise, architecture and implementation teams must confirm feasibility before a requirement is baselined.

Clear ownership matters: one accountable owner controls terminology, requirement IDs, versions, unresolved issues, review status, and the formal baseline.

---

## 3. Core Content

A complex chip rarely has one monolithic document. The specification is usually a controlled set containing a top-level chip specification, interface-control documents, programming and register specifications, electrical and package specifications, and subsystem requirements.

### 3.1 Functional Specification

- Define every required function, its parameters, boundary conditions, and error behavior.
- Describe operating modes such as normal operation, low power, test, debug, secure operation, recovery, and their legal transitions.
- Enumerate required use cases and unsupported combinations.
- For an LLM accelerator, distinguish prefill and decode, batch and sequence-length ranges, numerical formats, model classes, scheduling behavior, and exceptional conditions.
- State initialization, shutdown, reset, and recovery behavior where externally observable.

Avoid adjectives without thresholds. “Fast recovery” must become a bounded recovery time under stated conditions.

### 3.2 Interface Specification

For every external interface, define:

- Protocol, revision, lane or channel count, supported features, and optional features that are excluded.
- Bandwidth, latency, ordering, flow control, retry, timeout, and error semantics.
- Clocking, reset, power-state, discovery, initialization, and hot-plug behavior where applicable.
- Protocol-compliance and interoperability tests that the product must pass.
- Pin, ball, signal, and voltage definitions as the package converges.

High-impact interfaces commonly receive a dedicated **Interface Control Document (ICD)** because they form hard contracts with hosts, memory, companion dies, boards, software, and third-party IP.

### 3.3 Performance Specification

- State throughput, latency, frequency, utilization, and quality-of-service targets with the exact workload and operating point.
- Define typical, guaranteed, and worst-case conditions rather than publishing one unconstrained peak number.
- Identify measurement boundaries: include or exclude host transfer, preprocessing, synchronization, and software overhead explicitly.
- For LLM inference, specify model class, batch size, prompt and generation length, precision, TTFT, TPOT, tokens/s, concurrency, and any service-level percentile.
- Record assumptions about clocks, memory population, thermal state, power mode, and software version.

A performance requirement without a workload and measurement method is not reproducible.

### 3.4 Power and Thermal Specification

- Define active, idle, sleep, and test-mode power; thermal design power; transient limits; and state-transition latency.
- Specify performance-per-watt targets at named operating points.
- Define junction-temperature range, ambient assumptions, cooling interface, thermal resistance, throttling, and shutdown behavior.
- List supply rails, nominal voltages, tolerances, current limits, sequencing, and power-state dependencies.
- Distinguish package, board, and chip power to avoid incompatible budgets.

### 3.5 Physical and Package Specification

- Package technology, outline, height, keep-outs, ball or pin count, and preliminary ball map.
- Target process node, preliminary die-area envelope, reticle or chiplet constraints, and assembly assumptions.
- Board-level mechanical constraints, cooling attachment, warpage, and service environment.
- Operating voltage and temperature grades—commercial, industrial, automotive, or other mission-specific ranges.
- Memory placement and advanced-package requirements where HBM or chiplets are used.

### 3.6 Electrical Specification

- Supply voltages, tolerances, ripple, sequencing, and current transients.
- I/O standards, drive strengths, termination, loading, signal-integrity, and timing requirements.
- Reference clocks, frequency tolerance, jitter, duty cycle, and clock-failure behavior.
- ESD, latch-up, absolute-maximum, and recommended operating conditions.
- Package and board assumptions needed for compliance.

### 3.7 Software and Programming Specification

- Programmer-visible register map and control/status register (CSR) behavior.
- Memory map, address spaces, privilege, access ordering, and coherency expectations.
- Boot and initialization sequence, firmware responsibilities, and recovery paths.
- Programming model, queues, descriptors, interrupts, events, and driver requirements.
- Instruction-set architecture or extensions where applicable.
- ABI/API compatibility, discovery, telemetry, and software-visible error reporting.

This section may overlap with architecture, but the specification describes the software-visible contract; internal implementation remains an architecture and microarchitecture decision.

### 3.8 Reliability, Availability, Serviceability, Safety, and Quality

- Reliability targets such as service life and failure-in-time rate, with the applicable mission profile.
- Required ECC, parity, CRC, retry, containment, degradation, telemetry, and recovery behavior.
- Availability and serviceability expectations for data-center products.
- Functional-safety goals and ASIL allocation for automotive products where applicable.
- Security requirements including secure boot, key handling, isolation, lifecycle states, and update policy.
- Product-quality, outgoing-quality, and defect-level objectives.

Requirements must distinguish fault detection, correction, reporting, isolation, and recovery; these are not interchangeable capabilities.

### 3.9 Testability and Debug Specification

- DFT requirements: scan architecture, logic-test and memory-test strategy, compression assumptions, fault models, and coverage targets.
- JTAG, boundary scan, trace, performance counters, debug access, and security lifecycle controls.
- MBIST/BISR expectations for embedded memories and repair data handling.
- Production-test time, power, ATE channel, and pattern-memory constraints where known.
- Silicon-observability and failure-diagnosis requirements needed for bring-up and yield learning.

DFT targets begin here and in architecture; they cannot be added safely as an afterthought after synthesis.

### 3.10 Environmental and Compliance Specification

- Operating and storage temperature, humidity, altitude, vibration, and other mission conditions.
- ESD, latch-up, EMI/EMC, material, safety, and environmental requirements.
- Required protocol, regulatory, export, automotive, industrial, or customer certifications.
- Sample size, corner coverage, laboratory method, and evidence required for each compliance claim.

### 3.11 Acceptance Criteria

This is the most frequently omitted and most important section. **Every requirement needs a verification or validation method, test conditions, measurement boundary, and pass/fail criterion.**

Acceptance criteria should identify:

- Whether compliance is shown by inspection, analysis, simulation, emulation, formal proof, laboratory measurement, or production test.
- Required process, voltage, temperature, workload, clock, memory, software, and package conditions.
- Numerical limits, tolerance, confidence, repetitions, and percentile where relevant.
- The responsible team and evidence artifact.

These criteria become the basis of functional verification, signoff, silicon bring-up, qualification, and customer acceptance. A requirement that cannot be objectively evaluated is not a usable requirement.

---

## 4. Characteristics of a Good Specification

- **Complete:** no undefined gaps that downstream teams must fill with private assumptions.
- **Unambiguous:** one reasonable interpretation for every statement and term.
- **Verifiable:** each requirement has an observable outcome and an objective pass/fail method.
- **Consistent:** requirements, modes, interfaces, and budgets do not contradict one another.
- **Traceable:** every requirement links upward to product intent and downward to design and verification evidence.
- **Feasible:** architecture and implementation teams have evidence that it can be met within technology, cost, and schedule constraints.
- **At the correct abstraction level:** precise about external behavior while preserving implementation freedom.
- **Atomic and uniquely identified:** one independently testable obligation per requirement ID wherever practical.

Words such as fast, low power, robust, adequate, and user-friendly are not requirements until they are tied to measurable conditions.

---

## 5. Managing the Specification in Practice

- Give every requirement a **stable unique ID**, owner, rationale, verification method, and status.
- Maintain a traceability chain from PRD → system requirement → architecture/design element → verification test → result.
- Decompose hierarchically from chip-level requirements into subsystem and block specifications without losing parent-child relationships.
- Establish a controlled baseline or freeze. After baseline, use formal change control with impact analysis across architecture, RTL, verification, software, package, schedule, and cost.
- Keep one authoritative version. Comments, slide decks, and email do not supersede the controlled specification.
- Resolve terminology in a glossary, including units, rounding, binary versus decimal prefixes, and signal polarity.
- Iterate with architecture during feasibility convergence. Specification and architecture refine each other until requirements and implementation evidence agree.

Late changes are not automatically wrong, but they are expensive. The process must make their downstream impact visible before approval.

---

## 6. Key Mindset and Tensions

- **Single source of truth:** a specification defect can become a design defect even when RTL matches the document perfectly.
- **Precision without over-constraint:** be exact enough to serve as a contract, but do not encode an arbitrary implementation when multiple architectures can satisfy the requirement.
- **Freeze timing:** freezing too late causes repeated rework; freezing too early may lock in poorly understood assumptions.
- **Verification co-approval:** verification should sign that requirements are testable before the baseline is approved.
- **Budgets must balance:** performance, power, bandwidth, area, thermal, reliability, and schedule requirements must describe one physically consistent product.
- **Exceptions are part of behavior:** timeout, reset during traffic, malformed input, partial failure, and recovery paths need the same rigor as the nominal case.

---

## 7. Deliverables

- Controlled **chip / system specification**, usually with top-level, subsystem, and mode definitions.
- Interface Control Documents, electrical specifications, and package requirements.
- Programming model, CSR/register specification, and memory map.
- Requirements traceability matrix with planned verification methods.
- Glossary, assumptions, open-issue register, and approved waivers.
- Formal specification baseline or signoff gate with accountable reviewers.

---

## 8. Commonly Missed but Critical Failure Modes

1. **Ambiguity or incompleteness:** teams fill gaps with incompatible assumptions and discover the conflict only at integration.
2. **Specifying HOW instead of WHAT:** implementation choices become frozen before design-space exploration.
3. **Non-verifiable requirements:** statements such as “respond quickly” provide no objective acceptance criterion.
4. **Missing traceability:** the program cannot prove that every requirement was implemented and tested.
5. **Specification drift:** several versions circulate without controlled ownership or change approval.
6. **No verification co-signature:** requirements enter the baseline without a practical way to test them.
7. **Freezing too late:** architecture, RTL, verification, and software build on a moving foundation.
8. **Omitting non-functional requirements:** power, thermal, testability, debug, reliability, security, environment, and compliance surface too late to fix economically.
9. **Undefined corner behavior:** nominal traffic works, but reset, error, timeout, low-power transition, or overload behavior is unspecified.

---

## 9. Summary and Next Stage

**The system specification translates product intent into a complete, unambiguous, feasible, and verifiable technical contract.** It states what the chip must do, under which conditions, and how compliance will be judged. Its core discipline is **WHAT, not HOW**, supported by measurable acceptance criteria and end-to-end traceability.

Stage ③, **Architecture Design**, converts that contract into a hardware structure: major blocks, interconnects, dataflow, memory hierarchy, and resource budgets, with models showing that the design can meet performance, power, area, cost, and schedule targets.
