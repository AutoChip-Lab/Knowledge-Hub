# End-to-End Chip Design Flow · Stage ⑤: RTL Design

> The fifth article in the End-to-End Chip Design Flow series.
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

RTL Design turns the approved microarchitecture—pipeline diagrams, state machines, buffer depths, interfaces, and timing behavior—into a simulatable and synthesizable hardware description. It is the first stage to produce an executable representation that verification can test cycle by cycle and synthesis can map into a gate-level netlist.

> **Positioning:** microarchitecture is the implementation blueprint; RTL is the machine-readable source description from which hardware is verified and built.

> **Running example:** Stages ①–④ used a forward-looking, hypothetical data-center LLM accelerator to explain product and architecture choices. From this stage onward, implementation examples refer where useful to the publicly documented Google TPU v1: a 28 nm, 700 MHz inference accelerator with a 256 × 256 INT8 matrix-multiply unit, 24 MiB Unified Buffer, DDR3 memory, and die area no greater than 331 mm², as reported by Jouppi et al. at ISCA 2017. The two examples represent different generations and should not be treated as one chip; TPU v1 did not use the hypothetical design's FP8, HBM, or PCIe 5.0 assumptions.

---

## 1. What RTL Design Actually Is

In one sentence: **use a hardware description language to specify how data transfers among registers through combinational logic on each clock event, producing code that is both functionally simulatable and synthesizable into digital hardware.**

RTL means **Register-Transfer Level**. It abstracts away individual gates while retaining explicit state, clocks, cycle boundaries, widths, and combinational transformations. Above RTL is an algorithmic or behavioral description; below it is the gate-level implementation. RTL occupies the level at which engineers can describe intent and EDA tools can reliably infer hardware.

### A Fundamental Principle: RTL Is Not Software

An assignment such as `a <= b + c;` does not describe a processor executing “add, then assign.” It describes an adder whose result is captured by register `a` at a clock event. Separate concurrent processes and continuous assignments represent hardware that exists and operates in parallel.

- Software statements normally execute according to a control sequence on an existing processor.
- RTL elaborates into concurrent logic and state elements; ordering inside a procedural block has HDL-specific semantics, but independent hardware processes operate concurrently.

> Write RTL while visualizing the circuit, clock boundaries, and data movement it will create—not a sequence of software instructions.

### Boundary with Microarchitecture

- **Microarchitecture:** defines pipeline stages, states, FIFO depths, arbitration, protocols, latency, and timing intent in diagrams and specifications.
- **RTL:** implements that behavior in HDL so simulators can execute it and synthesis can map it into cells and macros.

For an illustrative TPU-like processing element, microarchitecture may define an 8-bit multiply with a wider accumulator and one-result-per-cycle throughput. RTL expresses the multiplier, accumulator register, controls, and pipeline timing, then parameterized hierarchy composes many processing elements into an array.

---

## 2. Ownership and Required Inputs

**RTL or logic design engineers** own implementation, often continuing from microarchitecture ownership on the same block. Functional verification, synthesis, physical design, DFT, low-power, safety, security, and software teams remain active because RTL choices directly affect verification complexity, timing, area, power, testability, and software-visible behavior.

Inputs normally include:

- Approved microarchitecture specification: pipeline and FSM diagrams, interface timing, buffers, banks and ports, cycle behavior, and timing budget.
- Coding guidelines: naming, reset style, clocking policy, synthesizable constructs, assertions, parameterization, and waiver rules.
- Target libraries, SRAM/compiler views, toolchain, and supported language version.
- Interface, register, memory-map, power-intent, DFT, debug, RAS, and security specifications.
- Verification plan and traceability to system requirements.

An RTL engineer should be able to predict the major circuit structures produced by each construct. Code that simulates correctly but infers latches, uncontrolled clocks, excessive mux depth, or physically impractical fanout is not complete engineering work.

---

## 3. Core RTL Design Content

### 3.1 HDL Choice and the Synthesizable Subset

Common choices include **SystemVerilog/Verilog**, VHDL, and generator languages such as Chisel or SpinalHDL; High-Level Synthesis may generate RTL from C/C++ for suitable data-oriented blocks. SystemVerilog is widely used because `always_ff`, `always_comb`, interfaces, packages, types, assertions, and parameterization can express design intent clearly.

Only the synthesizable subset belongs in production design RTL. Simulation delays, most testbench system tasks, dynamically timed behavior, and unconstrained constructs are not hardware. Tool support and project policy—not language syntax alone—define the accepted subset.

Regular structures should use controlled parameterization and generate constructs rather than copied code. A processing-element array, for example, can be elaborated from a reviewed PE module and bounded nested generate loops.

### 3.2 Combinational vs. Sequential Logic

RTL must distinguish combinational transformations from clocked state.

- Use `always_comb` or an equivalent complete combinational process for logic whose output depends only on current inputs.
- Use `always_ff` or an equivalent clocked process for flops and state updates.
- The standard discipline is **blocking assignments (`=`) for combinational procedural calculations and nonblocking assignments (`<=`) for sequential state updates**.

This convention reflects intended hardware and avoids ordering races and misleading simulation behavior. Combinational processes must assign every output on every path; otherwise synthesis may infer a latch.

```systemverilog
always_comb begin
  next_state = state;
  result_d   = result_q;
  if (accept) begin
    next_state = RUN;
    result_d   = operand_a + operand_b;
  end
end

always_ff @(posedge clk) begin
  if (!rst_n) begin
    state    <= IDLE;
    result_q <= '0;
  end else begin
    state    <= next_state;
    result_q <= result_d;
  end
end
```

### 3.3 Registers, Clocks, and Reset

Implement state elements with a controlled clocking and reset policy:

- Use approved clock sources and clock-control structures; do not create arbitrary clocks in logic.
- Define synchronous or asynchronous reset according to the architecture, and synchronize deassertion as required in each domain.
- Reset control state, protocol state, and software-visible state to known values. Large datapath arrays may intentionally avoid reset when an explicit initialization sequence safely establishes validity, reducing reset-tree area and power.
- Do not treat reset as a universal cure for unknown values. Track valid bits and initialization protocols explicitly.
- Review reset-domain crossings as well as clock-domain crossings.

In an accelerator, FSMs and control counters require deterministic reset. Thousands of accumulator flops may instead be cleared through a controlled operation if the specification allows it.

### 3.4 Datapath RTL: Width, Operators, and Signedness

Arithmetic and logical operators infer adders, multipliers, shifters, comparators, multiplexers, and other data-path hardware. Width and signedness must be explicit:

- Calculate result width, carry, guard bits, truncation, saturation, and rounding.
- Declare signed and unsigned signals deliberately; mixed-signed expressions can produce surprising extension and comparison behavior.
- Size constants and casts explicitly to avoid silent truncation or unintended widening.
- Pipeline long arithmetic and high-fanout selects according to the microarchitecture timing plan.

An INT8 multiplier with a wider accumulator might use signed 8-bit operands and a signed 32-bit accumulation path. The exact accumulation width must be justified from numerical range and overflow policy.

### 3.5 RTL Encoding of Finite-State Machines

Implement the state register, next-state logic, and outputs from the approved transition diagram. A two- or three-process style often improves clarity:

- A sequential process updates the state register.
- A complete combinational process computes next state.
- Outputs are either part of the same combinational logic or a separate registered/output process.

Supply safe defaults, cover legal and error transitions, and define illegal-state behavior. Avoid accidental latches and unintended priority. Assertions should capture legal states, legal transitions, bounded response, and mutual exclusion.

A tiled matrix engine might implement `IDLE → LOAD_WEIGHTS → STREAM → ACCUMULATE → WRITEBACK`, with explicit abort, error, and reset behavior.

### 3.6 Memory RTL: Inference vs. Instantiation

On-chip storage can be inferred from coding templates or instantiated as a technology-specific macro.

- **Inference:** suitable for small or portable memories when the synthesis flow reliably maps the coding style to the desired implementation.
- **Instantiation:** used for large SRAMs, ROMs, register files, and specialty memories produced by a memory compiler. Macros provide much better density and characterized timing/power but require wrappers and technology views.

Honor port semantics, byte enables, read-during-write behavior, output registration, latency, banking, ECC/parity, sleep modes, and initialization. Simulation models must match the physical macro. Large structures such as TPU v1's 24 MiB Unified Buffer would be implemented from banked memory macros rather than millions of generic flops.

### 3.7 Pipeline, Handshake, and FIFO RTL

Implement stage registers, valid/ready or credit-based flow control, FIFOs, skid buffers, and backpressure exactly as specified.

- In a valid/ready protocol, the transfer occurs only when both are asserted. A source should not wait for `ready` before presenting a valid item if that creates a protocol deadlock.
- Prevent unintended combinational paths or loops across module boundaries.
- Correctly handle full, empty, simultaneous push/pop, wraparound, flush, reset, and error conditions.
- Preserve data and sideband alignment through every pipeline stall.
- Verify that backpressure propagates end to end without overflow, starvation, or cyclic deadlock.

In an accelerator, weight queues and DMA-to-buffer-to-array handshakes allow transfer and computation to overlap while preventing underflow and overflow.

### 3.8 Clock-Domain Crossing RTL

No raw signal should cross an asynchronous clock boundary without an approved CDC structure.

- A stable single-bit level may use a characterized two-flop synchronizer.
- A pulse or event may require a toggle, pulse synchronizer, or request/acknowledge handshake.
- Multi-bit payloads require an asynchronous FIFO, a bundled-data handshake with stability guarantees, or another proven protocol.
- Independently synchronizing each bit of a bus does not guarantee a coherent word.

Add the attributes and structural conventions expected by the CDC and synthesis tools, and run dedicated CDC analysis. Simulators generally do not model metastability, so functional simulation alone cannot validate CDC safety.

### 3.9 Low-Power RTL: Clock Enables and Power Intent

RTL exposes safe opportunities for clock gating and operand isolation, while UPF or CPF describes power domains, isolation, retention, and power states.

- Code standard clock-enable patterns so synthesis can infer or insert approved integrated clock-gating (ICG) cells.
- Do not create a gated clock with arbitrary combinational logic; glitches can violate functionality, STA, and DFT assumptions.
- Isolate operands to idle arithmetic where toggling would otherwise consume power.
- Ensure isolation, retention, reset, and software-visible state transitions match the power-intent specification.
- Verify each low-power mode and transition, not only the always-on functional mode.

### 3.10 RTL That Supports DFT

DFT-aware RTL provides explicit test-mode controls and avoids structures that obstruct scan and ATPG:

- Use controllable, approved clock and reset structures; expose test-mode bypass or control where required by the DFT architecture.
- Avoid unintended latches, combinational loops, internally generated asynchronous controls, and unobservable state.
- Provide MBIST/BISR wrappers, isolation, repair, and diagnostic access for embedded memories.
- Integrate JTAG/IJTAG or other test-access controls according to the architecture.
- Ensure low-power domains, isolation, and clock gating have defined behavior in scan shift, scan capture, and memory-test modes.

This is more precise than saying “DFT-friendly RTL”: the RTL must make clocks, resets, state, memories, and test controls accessible to the planned scan, MBIST, and ATPG flow.

### 3.11 Parameterization and Module Reuse

Use parameters, types, packages, interfaces, generate loops, and hierarchy to represent repeated or configurable structures. Candidate parameters include width, depth, number of banks, number of channels, and array dimension.

Parameterization reduces duplicated code and supports product derivatives, but every legal configuration must elaborate, lint, synthesize, and verify. Avoid unconstrained generality that produces complex conditionals, poor timing, or untested combinations. Define a supported configuration matrix.

### 3.12 Coding Standards, Lint, and Synthesis-Oriented RTL

Follow project coding standards and keep lint results clean or explicitly waived with review. Static analysis should detect:

- Incomplete assignments and latch inference.
- Width and signedness mismatches.
- Multiple drivers, undriven or unused signals, unreachable states, and suspicious constants.
- Incomplete `case` behavior, wildcard/X hazards, and unintended priority.
- Clock/reset misuse and structural CDC/RDC issues.
- Constructs that do not synthesize consistently across the supported toolchain.

Readable RTL and good synthesis are not opposing goals. Clear hierarchy, explicit state, bounded loops, well-typed interfaces, and obvious timing boundaries help people and tools. “Simulation passed” is an entry condition; **clean static checks, synthesizability, CDC/RDC safety, and understandable timing intent** are also required.

---

## 4. Trade-offs That Apply Throughout

- **Readability versus structural control:** excessively behavioral code can make hardware cost difficult to predict; excessively structural code can be repetitive and fragile. Preserve circuit intent while keeping the design reviewable.
- **Abstraction versus precision:** reuse and generators improve productivity, but widths, clocks, reset, latency, and ordering must remain explicit.
- **Simulation, synthesis, and formal consistency:** one RTL source must have consistent meaning across tools, especially around unknown values, assignment semantics, initialization, and unreachable behavior.
- **Speed of coding versus correctness:** latches, X behavior, CDC, and reset defects often hide until integration or silicon.
- **Reuse versus optimization:** generic modules lower maintenance cost, while a critical path may need a specialized implementation.
- **Local simplicity versus system behavior:** a locally valid handshake or reset choice can still create global deadlock, congestion, or an unsafe transition.

> Synthesis implements the structure described. Unintended storage, long combinational paths, and excessive fanout do not disappear because they were accidental.

---

## 5. RTL Development Methods and Tools

- **Simulation:** commercial tools such as VCS, Questa, or Xcelium and open-source tools such as Verilator execute directed and constrained-random tests.
- **Lint and static analysis:** SpyGlass, Verilator lint, and related tools detect coding, structural, width, reset, and intent problems early.
- **CDC/RDC analysis:** dedicated structural and formal checks validate synchronization and reset-domain schemes that simulation cannot exhaustively prove.
- **Waveform debug:** tools such as Verdi or GTKWave expose cycle-by-cycle state and transactions.
- **Assertions and formal verification:** SystemVerilog Assertions express protocol, safety, and liveness intent; formal tools prove or find counterexamples around difficult control logic.
- **Trial synthesis:** compile critical blocks early to compare timing, area, power proxies, and inferred memory or gating structures against microarchitecture assumptions.
- **Version control and review:** RTL is a controlled source artifact. Use Git, code review, ownership, regression checks, and reproducible tool configurations.
- **Automation:** generate registers, repetitive interfaces, and configuration artifacts from one controlled source where possible, then verify the generated result.

Continuous checks should run on each integration change so defects are discovered near their source rather than during full-chip milestones.

---

## 6. RTL Deliverables

- Complete, synthesizable RTL and generated source required for the supported configurations.
- File lists, packages, parameters, constraints assumptions, and build/elaboration instructions.
- Block-level testbench hooks and verification environment interfaces for Stage ⑥.
- Lint, CDC, RDC, reset, and initial trial-synthesis reports with reviewed waivers.
- Assertions, coverage hooks, and reference-model interfaces.
- CSR/register documentation and generated hardware/software views.
- Power-intent integration, DFT and MBIST wrappers, and debug/trace controls.
- Traceability from microarchitecture and system requirements to RTL modules and tests.

RTL is the principal branch point: functional verification checks it, synthesis converts it into gates, and errors that escape both can become silicon failures.

---

## 7. Commonly Missed but Critical Failure Modes

1. **Incorrect blocking/nonblocking discipline:** race-prone sequential code or misleading combinational behavior can cause tool-dependent simulation and implementation errors.
2. **Accidental latch inference:** missing assignments in combinational logic create storage, complicating timing, power, and test.
3. **Incomplete or inconsistent reset:** control state may remain unknown or release unsafely, preventing reliable bring-up.
4. **Unmanaged X behavior:** optimistic or pessimistic simulation can hide real initialization and control defects.
5. **Missing CDC synchronization:** metastability and incoherent data may appear only intermittently in silicon.
6. **Incomplete sensitivity in legacy Verilog:** simulation may not update when synthesis implements full combinational behavior; prefer `always_comb`.
7. **Handwritten clock gating or combinational loops:** these create functional, timing, power, and DFT problems; use approved structures.
8. **Treating simulation success as completion:** code may still fail lint, CDC, synthesis, timing, power, or testability checks.
9. **Width or signedness errors:** silent truncation, extension, overflow, or incorrect comparisons can corrupt only a subset of values.
10. **Protocol behavior missing under stall, reset, or error:** nominal traffic passes while backpressure and recovery paths deadlock or lose data.

---

## 8. Summary and Next Stage

**RTL Design converts the microarchitecture blueprint into synthesizable hardware description: concurrent combinational logic and clocked state whose cycle behavior can be simulated, verified, and mapped into cells and macros.** The essential mindset is that RTL describes hardware, not software. Strong discipline means explicit widths and signedness, complete combinational assignments, well-formed sequential logic, safe clocks/resets/CDC, clean lint, and concrete DFT controls.

Stage ⑥, **Functional Verification**, builds a verification environment, applies extensive stimulus, checks assertions and reference models, and closes coverage to demonstrate that the RTL conforms to the specification before synthesis establishes the implementation baseline and tapeout commits the design to manufacturing.
