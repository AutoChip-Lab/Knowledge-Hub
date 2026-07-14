# End-to-End Chip Design Flow · Stage ④: Microarchitecture Design

> The fourth article in the End-to-End Chip Design Flow series.
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

Microarchitecture sits between Architecture Design and RTL Design. Architecture partitions the chip into blocks, defines external behavior and interfaces, and assigns PPA budgets. Microarchitecture enters each block and specifies **how it behaves cycle by cycle**: pipeline stages, state transitions, data paths, buffering, arbitration, memory banking, clock-domain crossings, and the timing structure needed to reach the target frequency.

The output is not yet production RTL, but it must be precise enough for an RTL engineer to implement without inventing fundamental behavior. A useful framing is: **architecture makes the PPA commitment; microarchitecture turns that commitment into a structure that can actually deliver it.**

---

## 1. What Microarchitecture Design Actually Is

In one sentence: **refine every architectural block from its external function into a cycle-accurate internal implementation, selecting pipelines, state machines, data paths, storage, flow control, and timing so the block meets its performance, power, and area budget at the target frequency.**

### Architecture vs. Microarchitecture: Establishing the Boundary

| | **Architecture** | **Microarchitecture** |
|---|---|---|
| Primary question | What is the block, and what externally visible behavior does it provide? | How is that behavior implemented internally? |
| Software visibility | Part of the software-visible contract | Normally transparent to software |
| Examples | ISA, registers, memory map, block interfaces, memory model | Pipeline depth, FSMs, FIFO depth, bank organization, critical paths |
| Main stage | ③ Architecture Design | ④ Microarchitecture Design |
| Relationship | One architectural contract | Many valid implementations |

The classic example is an ISA: a shallow in-order core and a deep out-of-order superscalar core can implement the same ISA while exhibiting very different PPA and performance. Software sees the same contract; the implementation differences are microarchitecture.

For an LLM inference accelerator, architecture may select a 256 × 256 systolic array, FP8 support, a weight-stationary dataflow, a given amount of SRAM, and a memory-bandwidth target. Microarchitecture determines how the MAC is pipelined, how weights enter the array, how many SRAM banks and ports sustain each cycle, how deep DMA-to-SRAM-to-array queues must be, and which FSM sequences load, execute, accumulate, and write back each tile.

---

## 2. Ownership and Required Inputs

**Microarchitects and senior design engineers** usually own blocks and often continue into RTL implementation. Architecture supplies the contract; verification, DFT, logic synthesis, physical design, low-power, safety, and security teams should review early because microarchitecture choices strongly determine their downstream difficulty.

Required inputs include:

- Architecture specification, top-level block diagram, interfaces, protocols, memory map, and block-level PPA budgets.
- Target frequencies and timing constraints for each clock domain.
- Process and library characteristics, including representative cell delay and SRAM macro timing, area, ports, and power.
- Workload traces or access distributions for throughput-critical blocks.
- Power-domain, clock-domain, reset, DFT, debug, RAS, and security requirements.
- Verification objectives and externally observable acceptance criteria.

The microarchitect must think simultaneously about **performance, timing, physical feasibility, and verification complexity**. A high-throughput structure that cannot close timing, route, reset, test, or verify is not a successful microarchitecture.

---

## 3. Core Microarchitecture Content

### 3.1 Pipeline Design: The Central Microarchitecture Problem

Choose pipeline depth, the operations assigned to each stage, stage boundaries, register placement, and handling of structural, data, and control hazards.

Work backward from the target clock period: each stage's worst combinational delay, including setup, skew, uncertainty, and margin, must fit its budget. Deeper pipelines can raise frequency and throughput but add latency, registers, clock power, bypassing, bubbles, and recovery cost. Shallow pipelines reduce those costs but may miss frequency. The target is a balanced **sweet spot**, not the largest stage count.

Stages must be balanced because the slowest stage determines the achievable clock. Hazards require explicit handling:

- **Structural hazards:** two operations need the same resource; resolve with replication, arbitration, or stalling.
- **Data hazards:** a consumer needs an unfinished result; resolve with forwarding/bypass, interlocks, scoreboarding, or scheduling.
- **Control hazards:** future work depends on a decision; resolve with prediction, speculation, early resolution, or flushing where justified.

In a tensor accelerator, multipliers and accumulation are pipelined, while the systolic array itself forms a two-dimensional pipeline through which operands and partial sums advance each cycle.

> Pipelining trades latency for throughput: one operation may take more cycles, while the structure can accept or retire work every cycle once full.

### 3.2 Datapath and Control-Path Separation

Separate the **datapath**—ALUs, multipliers, registers, multiplexers, shifters, arrays, and widths—from the **control path** that sequences operations and generates enables, selects, and requests.

Draw the datapath first: show every source, transformation, storage point, bypass, and destination. Then define the controller that coordinates it. This decomposition maps naturally to clean RTL, independent verification, and clearer timing analysis.

In an accelerator, the array, accumulators, and quantization units form the datapath; FSMs and loop counters control weight load, activation streaming, accumulation, and writeback.

### 3.3 Finite-State Machine Design

Define states, legal transitions, outputs, exceptional paths, timeout behavior, and reset state. Choose Moore or Mealy output behavior and an encoding such as binary, one-hot, or Gray where it affects timing, power, or safety.

Protocol engines, DMA controllers, initialization sequences, schedulers, and tiling loops are typical FSMs. One-hot encoding may improve decoding speed for moderate state counts at the cost of flops; binary encoding reduces state bits but can add decode depth. Synthesis may choose the encoding unless safety or timing requires an explicit choice.

Produce a state-transition diagram and table. Include error, abort, flush, retry, reset, and illegal-state recovery—not only the nominal path.

### 3.4 Timing and Frequency Budget

Identify likely critical paths and allocate combinational logic depth between registers. Even before full synthesis, estimate arithmetic, mux, priority, fanout, and memory delays. Account for SRAM read latency, clock uncertainty, CDC boundaries, and high-fanout control.

If a path is too long, consider another pipeline stage, retiming, parallel or tree structures, precomputation, speculation, or a changed interface. Use **trial synthesis** of representative blocks and paths to validate assumptions early. Waiting until full-chip synthesis to discover that the target frequency is unreachable can force a pipeline change that alters cycle behavior and invalidates substantial verification work.

For an accumulator, a serial adder chain may be replaced by a balanced tree, carry-save structure, or extra stage.

### 3.5 Buffering and Flow Control: Determining FIFO Depth

Choose queue and FIFO depth, burst handling, credit count, skid buffering, and end-to-end flow-control behavior.

Depth should be derived from workload and transport properties, not guessed. Useful inputs include Little's Law, bandwidth-delay product, maximum burst length, arbitration delay, service-time variation, and the amount of work required to hide memory latency. A shallow queue can throttle throughput; an oversized queue wastes area and leakage, increases latency, and can conceal congestion.

Common flow-control mechanisms include valid/ready and credit-based protocols. Backpressure must propagate without combinational loops, packet loss, starvation, or deadlock. Analyze cyclic resource dependencies explicitly.

Between HBM/DDR DMA, on-chip SRAM, and a tensor array, buffers should allow data movement and computation to overlap so the compute fabric does not wait for memory.

### 3.6 Memory Microarchitecture: SRAMs and Register Files

Select flops, register files, or SRAM macros; determine capacity, banks, ports, width, read latency, write policy, ECC/parity, arbitration, and address mapping. Cache blocks additionally require tag/data arrays, associativity, replacement, miss-status holding registers (MSHRs), and write buffers.

Use flops or register files for small, highly ported structures; use dense SRAM macros for larger storage. SRAM ports are expensive, so achieve bandwidth through banking when access patterns permit. Derive bank count, port count, and word width from peak concurrent accesses and conflict behavior, not only total capacity.

For a tensor array, the on-chip SRAM must deliver enough operands every cycle to sustain the array. A large nominal capacity with insufficient banks or ports still produces low utilization.

### 3.7 Parallelism and Resource Trade-offs

Choose replication and unrolling for throughput versus time-multiplexing and sharing for area efficiency. This is one of the strongest block-level PPA controls.

- Replication increases operations per cycle but consumes area, routing, and power.
- Sharing reduces area but adds arbitration, multiplexing, latency, and possible throughput loss.
- Partial unrolling provides an intermediate point and may align better with memory bandwidth.

Array size is extensive replication; a low-duty-cycle unit such as softmax may be shared across several data streams if its service rate remains sufficient.

### 3.8 Arithmetic and Numerical Implementation

Define numerical formats, operand and accumulator widths, signedness, rounding, saturation, exception behavior, and implementations of adders, multipliers, reductions, and MACs.

Select structures according to timing, area, and energy: ripple-carry versus faster prefix adders, array versus tree multipliers, carry-save accumulation, pipelined reductions, or approximate arithmetic only where the specification permits it. Guard bits and wider accumulators prevent silent overflow; conversion and quantization rules must be deterministic and verifiable.

In low-precision AI hardware, FP8 or INT multipliers often accumulate into a wider representation before rounding or quantizing back to a storage format. Numerical accuracy and PPA must be evaluated together.

### 3.9 Block Interfaces and Handshake Protocols

Choose standard interfaces such as AXI or a custom valid/ready protocol, define transaction ordering, response, backpressure, sideband metadata, error handling, and latency contract.

Well-defined interfaces make blocks independently implementable, verifiable, and reusable. A latency-insensitive handshake can allow internal pipeline changes without modifying neighboring blocks, provided throughput and protocol guarantees remain stable.

Interface specifications should include timing diagrams and corner cases: reset during traffic, response reordering, cancellation, timeout, malformed requests, and downstream stalls.

### 3.10 Clock-Domain Crossing and Reset

Implement every crossing established by the clock architecture. Use two-flop synchronizers for appropriate single-bit level signals, pulse or handshake synchronizers for events, and asynchronous FIFOs or coherent transfer protocols for multi-bit data.

Never synchronize independent bits of a multi-bit word and assume a coherent value. Consider data stability, reconvergence, metastability mean time between failures, reset interaction, and source/destination power states.

Define synchronous or asynchronous assertion as required, but ensure reset release is safely synchronized within each domain. Reset-domain crossings (RDC) deserve the same rigor as CDC.

### 3.11 Low-Power Microarchitecture

Translate architecture-level power intent into concrete hooks:

- Clock-enable opportunities and safe integrated clock-gating boundaries.
- Operand isolation so idle arithmetic inputs do not toggle.
- Bank- or block-level power gating, state retention, isolation, and wake-up sequencing.
- Idle detection, activity aggregation, and power-management handshakes.
- DVFS-safe interfaces and state transitions.

For memory-bound phases, many compute elements may be idle. Fine-grained gating can materially improve performance per watt, but gating control must not create timing, CDC, DFT, or functional hazards.

### 3.12 DFT and Debug Hooks

Microarchitecture must expose the control and observability required for test and bring-up:

- Controllable clocks and resets in test mode; avoid structures that cannot be scanned safely.
- MBIST access, memory isolation, repair, and diagnostic interfaces for SRAMs.
- Test-mode control, JTAG/IJTAG access, and scan-chain partitioning assumptions.
- Performance counters, error injection, trace, status capture, and strategic internal observation points.

“Scan-friendly” should not be a vague label. It means the clock, reset, state, memory, power, and access structures have explicit mechanisms that downstream DFT insertion and ATPG can use.

### 3.13 Microarchitecture-Level Performance Modeling and Verification Planning

Build a block-level or cycle-level model before RTL to demonstrate that the proposed pipeline, queues, banks, arbitration, and dataflow meet throughput and latency commitments. Run representative and adversarial traffic, not only ideal steady state.

At the same time, create the block verification plan: stimulus, reference model, assertions, coverage points, protocol checkers, error injection, and performance counters. If the model misses targets, revise pipeline stages, buffer depth, banking, or arbitration before RTL makes the change expensive.

---

## 4. Trade-offs That Apply Throughout

- **Latency versus throughput:** deeper pipelines and larger buffers can raise sustained throughput while increasing individual latency.
- **Area versus speed:** replication, unrolling, wide datapaths, and fast arithmetic improve service rate but consume area and power.
- **Power versus performance:** frequency and switching activity raise power; gating and sharing save power but may reduce throughput or add wake-up delay.
- **Pipeline sweet spot:** too shallow misses frequency; too deep increases hazards, clock power, recovery cost, and diminishing returns.
- **Complexity versus verifiability:** dynamic scheduling, speculation, and aggressive reordering may improve performance while expanding the state space and bug risk.
- **Commitment versus escalation:** if a block cannot meet its architecture budget, return evidence to Stage ③ and revise the architecture. RTL cannot reliably rescue an infeasible microarchitecture.

The goal is to meet the contract with the lowest practical area, power, and complexity—not to maximize cleverness.

---

## 5. How Microarchitecture Is Developed

- **Block diagrams, pipeline diagrams, state-transition diagrams, timing diagrams, and transaction tables** are the primary design language.
- **Cycle-accurate C++/SystemC or Python models** validate performance and guide buffer, bank, and pipeline choices.
- **Analytical models and spreadsheets** estimate throughput, queueing, logic depth, storage, area, and power.
- **Trial synthesis** of critical blocks tests frequency and area assumptions before full RTL and full-chip synthesis.
- **High-Level Synthesis (HLS)** can rapidly explore data-intensive alternatives where the generated result and verification method are well controlled.
- **Existing IP and previous-generation designs** provide calibrated starting points and known implementation constraints.
- **Cross-functional design reviews** with verification, DFT, synthesis, physical design, and software expose issues before they become code.

Decisions should record rationale, alternatives, model version, assumptions, and margin so later teams can distinguish intentional behavior from an omission.

---

## 6. Microarchitecture Deliverables

Each block normally receives a controlled microarchitecture specification containing:

- Block and datapath diagrams, pipeline stages, FSM transition diagrams, and interface timing diagrams.
- Cycle-by-cycle behavior, latency and throughput guarantees, ordering, arbitration, and backpressure semantics.
- Buffer/FIFO depths, memory-bank and port organization, internal registers, and address behavior.
- Datapath widths, numerical formats, rounding/saturation, and arithmetic-unit selection.
- Clock, reset, CDC/RDC, power, DFT, debug, RAS, and security behavior.
- Timing budget, likely critical paths, target frequency, and trial-synthesis evidence.
- Area and power estimates with assumptions and margin.
- Block-level performance model, workloads, and evidence that the target is met.
- Verification plan with assertions, reference models, coverage, and error cases.

This specification is the direct input to Stage ⑤. RTL should implement the approved blueprint rather than silently invent behavior.

---

## 7. Commonly Missed but Critical Failure Modes

1. **Incorrect CDC or reset-domain handling:** metastability or incoherent transfers may pass simulation and fail intermittently in silicon.
2. **Uncovered pipeline hazards:** a missing forwarding, stall, flush, or recovery case corrupts only particular sequences and is difficult to reproduce.
3. **Guessed FIFO depth or incomplete flow control:** too shallow loses throughput, too deep wastes PPA, and cyclic backpressure can deadlock the system.
4. **Inconsistent reset strategy:** incorrect domain or release sequencing can prevent silicon bring-up.
5. **Underestimated critical paths:** discovering a frequency miss after RTL may require another stage, change cycle behavior, and invalidate verification.
6. **Excessive microarchitecture complexity:** small performance gains can produce disproportionate area, power, scheduling, and verification cost.
7. **Missing DFT and debug hooks:** late scan, MBIST, trace, or observability changes are disruptive and may still produce poor test or diagnosis.
8. **Functional modeling without performance modeling:** correct outputs do not prove that the pipeline can meet throughput, latency, or utilization targets.
9. **Ignoring physical structure:** wide buses, high fanout, centralized arbitration, and distant memories may be logically elegant but impossible to place and route efficiently.

---

## 8. Summary and Next Stage

**Microarchitecture Design turns each architectural block into a cycle-accurate implementation plan—pipelines, FSMs, datapaths, buffers, banking, interfaces, timing, power, and DFT/debug hooks—so the block can meet its PPA budget at the target frequency.** Architecture defines the commitment; microarchitecture supplies the implementable structure.

Stage ⑤, **RTL Design**, expresses this blueprint as synthesizable SystemVerilog, Verilog, VHDL, or generated HDL. Every stage, state, transfer, width, and storage element becomes an executable hardware description for functional verification and logic synthesis.
