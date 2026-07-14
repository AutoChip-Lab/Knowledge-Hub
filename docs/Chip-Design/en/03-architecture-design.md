# End-to-End Chip Design Flow · Stage ③: Architecture Design

> The third article in the End-to-End Chip Design Flow series.
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

Architecture Design sits between requirements and implementation. It converts “what the product must do” into “what major hardware structures are required, how they communicate, how data moves, and whether the resulting system can meet its targets.” No production RTL exists yet; decisions are made with specifications, analytical models, executable models, traces, simulation, and estimates.

This is the stage at which design choices have the greatest leverage over **performance, power, area (PPA), cost, software usability, and schedule**, while they are still relatively inexpensive to change. A poor architecture cannot usually be repaired by heroic RTL or physical-design optimization.

---

## 1. What Architecture Design Actually Is

In one sentence: **define the chip's hardware skeleton before RTL—major blocks, interconnects, memory hierarchy, data and control flow—and use models to demonstrate that this structure can meet performance targets within power, area, cost, and schedule budgets.**

Architecture answers three questions:

1. **What exists?** Which functional blocks and externally visible resources make up the chip?
2. **How is the system organized?** How do blocks communicate, share memory, synchronize, and move data?
3. **Will it meet the contract?** Do models and budgets show a credible path to the required PPA, cost, reliability, and software behavior?

### A Frequently Confused Boundary: Architecture vs. Microarchitecture

- **Architecture** is the externally visible contract and macro-level organization: instruction set, programmer-visible state, memory map, block-level partitioning, protocols, and major interfaces. Software should not need to change when an implementation changes without changing this contract.
- **Microarchitecture** is the internal implementation of that contract: pipeline depth, cache organization, branch predictor, state machines, bank structure, buffering, arbitration details, and critical-path choices.

In practice the boundary is continuous. Architecture teams often explore block-level microarchitecture to establish feasibility, while Stage ④ specifies each block cycle by cycle. The useful distinction is: **architecture defines the external contract and system structure; microarchitecture defines how each block realizes it.**

---

## 2. Inputs Required Before Architecture Begins

Architecture begins from controlled product and system requirements, not an empty block diagram. Typical inputs include:

- **Target workloads and use cases:** representative benchmarks or traces for mobile, data center, networking, automotive, AI inference, or another mission.
- **Performance requirements:** throughput, latency, quality-of-service, utilization, and frequency range at named operating points.
- **Power and thermal limits:** TDP, battery or cooling constraints, transient limits, and energy-efficiency goals.
- **Area and cost envelope:** target die size, package, memory and bill-of-materials constraints, selling price, and margin.
- **Process technology:** foundry and node, which determine density, speed, leakage, cost, design rules, and IP availability.
- **Standards and protocols:** PCIe, CXL, UCIe, DDR, LPDDR, HBM, Ethernet, USB, display, or domain-specific interfaces.
- **Software and ecosystem constraints:** ISA compatibility, driver model, compiler/runtime integration, frameworks, and legacy behavior.
- **Program constraints:** time to market, team capability, reusable IP, EDA capacity, budget, and supply-chain options.
- **Quality, security, DFT, reliability, and certification requirements.**

### 2.1 How Are Architecture Targets Established?

Targets should not be invented by intuition. Most flow down from Stages ① and ②, then become feasible through **triangulation and back-solving** from three directions:

1. **Competitive baseline:** measure representative workloads on incumbent or previous-generation products. This establishes the minimum credible performance, power, cost, and software experience. Differentiation defines which axis must improve and by how much.
2. **Customer pull:** convert anchor-customer needs into quantified service-level objectives such as throughput at a specified latency and total cost of ownership.
3. **Physical and economic bounds:** form factor constrains power; power constrains compute; price and margin constrain die, memory, and package cost; available technology constrains achievable density and bandwidth.

For each major axis:

- **Performance:** specify a workload and operating point, not “fast.” For LLM inference, include model class, batch, sequence length, precision, tokens/s, TTFT, and TPOT. Use competitive measurements plus customer SLAs.
- **Power:** accept the form-factor ceiling first, then determine how much compute and memory movement can fit under it. A rack accelerator, edge appliance, and battery device occupy very different design spaces.
- **Area and cost:** work backward from price and gross-margin goals to allowable silicon, package, memory, and test cost, then to die-area and transistor budgets at the chosen node.
- **Protocols:** select standards required by the deployment ecosystem and available as mature, supported IP by the production window. The newest generation is not automatically the lowest-risk choice.
- **Software:** default toward the stack customers already use unless committed customers justify the cost of a new compiler, runtime, and framework ecosystem.

> Start from a reference design or measured baseline rather than a blank page. Architecture is a constrained search around known evidence: perturb array size, precision, frequency, bandwidth, buffering, and reuse, then quantify the resulting trade-offs.

The objective is not to maximize one metric. It is to find a feasible, defensible point inside a set of conflicting requirements.

---

## 3. Core Architecture Content

### 3.1 Workload Analysis: The Starting Point

Architecture serves workloads, not aesthetic block diagrams. The characterization must be specific enough to size resources without overfitting the chip to one model that may be obsolete at launch.

A practical workload definition has three layers:

- **Workload class plus anchor models:** for example, LLM inference represented by a small set of dense, mixture-of-experts, and large-model anchors.
- **Operating points:** data type, batch size, prompt and generated sequence length, prefill/decode mix, concurrency, and latency objective.
- **Hardware invariants:** arithmetic intensity, working-set size, memory bandwidth, communication pattern, data reuse, and available parallelism. These quantities directly determine resource sizing.

A useful rule is: **if a parameter changes resource sizing, constrain it or at least specify a range; if it does not, leave implementation freedom.** Define a must-win primary point and a broader coverage envelope so the architecture is optimized without becoming brittle.

Use a fidelity ladder, increasing modeling cost only when the current decision requires it:

1. **Analytical models and roofline analysis:** count operations and bytes, derive arithmetic intensity, and identify whether the workload is compute- or bandwidth-bound. Spreadsheets and Python often resolve most early choices.
2. **Profiling on existing hardware:** measure operator mix, memory traffic, utilization, kernel time, and reuse using tools such as Nsight, PyTorch Profiler, perf, or VTune.
3. **Architecture cost and mapping models:** explore dataflow, tiling, energy, utilization, and storage with tools such as Timeloop/Accelergy, MAESTRO, SCALE-Sim, CACTI, or domain-specific simulators.
4. **Cycle- or event-level simulation:** use gem5, DRAMSim/Ramulator, BookSim/Garnet, Accel-Sim, SST, or custom models when queueing, contention, tail latency, and timing order matter.
5. **Emulation or FPGA prototypes:** reserve the highest-cost fidelity for later microarchitecture and RTL questions.

The principle is: **use roofline and analytical bounds to eliminate most of the design space, then spend detailed simulation on the remaining candidates.**

For an LLM accelerator, decode is often memory-bandwidth bound because weights and KV state must be supplied for each generated token; prefill is more compute-intensive because it contains large matrix operations. KV-cache capacity scales with layers, heads, head dimension, sequence length, batch, and bytes per element. GQA, MQA, and MLA alter the storage equation substantially. These observations drive HBM capacity and bandwidth, on-chip SRAM, tensor-array size, and scheduling.

### 3.2 Functional Partitioning and Module Decomposition

Decide which major blocks exist—CPU, GPU/NPU, accelerators, memory controllers, I/O, NoC, peripherals, security, management—and how responsibilities divide between hardware, firmware, and software.

Specialize a function when it is a large share of execution time, relatively stable, and offers a compelling efficiency advantage in hardware. Keep changing, infrequent, or control-heavy behavior programmable. Even a specialized accelerator should preserve a software fallback or bypass path where practical.

For LLM inference, matrix multiplication and attention primitives may justify dedicated tensor hardware, while scheduling, sampling, KV management, exception handling, and uncommon operators remain programmable.

### 3.3 Compute Architecture

Choose ISA where required, homogeneous or heterogeneous cores, SIMD/vector width, tensor or systolic arrays, specialized engines, data-path width, numerical formats, and macro-level parallelism.

Begin with the parallelism inherent in the workload: data, thread, task, pipeline, and instruction parallelism lead to different structures. Back-solve compute capacity from target throughput, operations per processing element per cycle, frequency, utilization, and allowed precision. Then check whether the power and area budgets can support it.

Prefer a mature ISA such as Arm or RISC-V for general-purpose control unless proprietary differentiation justifies the full compiler and software burden of a new ISA. In an LLM accelerator, large tensor arrays handle GEMM while vector units handle normalization, activation, reduction, and other operations. Array sizing is tied to compute-intensive prefill; operating frequency is constrained by power and physical feasibility.

### 3.4 Memory Hierarchy: Often the Real Performance Determinant

Decide cache levels and policies, scratchpad size and banking, register files, SRAM and off-chip memory technology, channels and controllers, consistency/coherence, address mapping, and aggregate bandwidth.

Start with arithmetic intensity and working-set size. Determine whether capacity, bandwidth, or latency is limiting. Size on-chip storage from tile and reuse analysis: enough SRAM to keep valuable data close and sustain the compute fabric, but no more than justified because SRAM consumes substantial die area and leakage. Infer off-chip channels or HBM stacks from required sustained—not peak—bandwidth.

Accelerators often prefer software-managed scratchpads to coherent hardware caches because they reduce complexity and improve predictability. General-purpose shared-memory systems may require coherent caches and a defined memory-consistency model.

The memory wall is fundamental: unused arithmetic units are common when the architecture cannot feed data at the required rate.

### 3.5 On-Chip Interconnect and Network-on-Chip

Choose bus, crossbar, ring, mesh, tree, or hierarchical NoC topology; protocols; coherent and non-coherent fabrics; arbitration; QoS; buffering; virtual channels; bandwidth; and latency.

Build a traffic matrix showing source-destination pairs, sustained and burst traffic, and latency sensitivity. Estimate bisection bandwidth and hot spots. Small systems may use buses or crossbars; larger systems need scalable NoCs. Reserve QoS and adequate bandwidth for dominant flows such as compute-to-HBM, while ensuring that control and response traffic cannot deadlock or starve.

For an accelerator, the NoC must deliver memory bandwidth to compute with high utilization. Peak HBM bandwidth has no value if arbitration, topology, or endpoint injection limits prevent the array from receiving it.

### 3.6 Dataflow and Data Path

Define how data is transferred among I/O, memory, SRAM, and compute: DMA engines, queues, FIFOs, descriptors, buffering, flow control, backpressure, and completion signaling.

Use DMA and double buffering to overlap transfer with computation. Balance throughput across each stage because the narrowest stage limits the end-to-end pipeline. Ensure backpressure propagates safely and cannot create cyclic dependency or deadlock.

In an LLM accelerator, weights and KV data move from HBM through DMA into on-chip buffers while the array computes on another tile. Scheduling quality determines whether compute remains busy or stalls for data.

### 3.7 I/O and Connectivity

Select high-speed SerDes protocols such as PCIe, CXL, Ethernet, and UCIe; memory PHYs; chip-to-chip links; and low-speed management interfaces such as I2C, SPI, UART, and GPIO.

Host and scale-out bandwidth must meet system traffic needs rather than become the bottleneck. High-speed PHYs are difficult analog hard IP, so mature, silicon-proven IP on the target process is usually safer than an internal design. Integration still requires reference clocks, power, package channels, signal integrity, lane repair, initialization, compliance, and software support.

### 3.8 Clock Architecture

Define clock domains, frequencies, PLL/DLL sources, distribution assumptions, clock gating, dynamic voltage and frequency scaling (DVFS), and clock-domain crossings (CDC).

Partition domains according to interface requirements, performance, and power. Every crossing needs a deliberate synchronization or asynchronous transport scheme. Missing one CDC can produce intermittent silicon failures that conventional functional simulation does not reveal.

### 3.9 Power Architecture

Define voltage and power domains, always-on logic, isolation and retention, clock and power gating, power-management control, P-states/C-states, sequencing, and early power-delivery and thermal assumptions.

Decompose total power into block budgets and require each block to demonstrate a credible path. The most effective energy improvement is often reducing data movement, not adding arithmetic efficiency in isolation. Inactive structures should stop switching or power down when wake-up and state-retention requirements permit.

### 3.10 Reset and Initialization Architecture

Define reset domains, reset sources, assertion and release sequencing, power-on order, boot ROM and firmware flow, secure boot, memory and PHY training, error recovery, and software-visible readiness.

The sequence must be deterministic, repeatable, and observable. Silicon bring-up depends on knowing which power, clock, reset, firmware, and interface state failed first.

### 3.11 Security Architecture

Begin with a threat model. Define root of trust, secure boot, lifecycle states, key storage and derivation, cryptographic engines, isolation, access control, debug authorization, attestation, firmware update, and side-channel assumptions.

For a data-center accelerator, firmware integrity and multi-tenant isolation may be central. Security mechanisms should address named threats rather than accumulate as disconnected features.

### 3.12 Reliability, Availability, and Serviceability

Allocate ECC, parity, CRC, retry, redundancy, fault containment, telemetry, degradation, and repair according to failure consequence and rate. Large SRAMs and external memory generally require ECC; links may require CRC and replay.

Data-center systems also need observability and service actions: report, locate, isolate, and work around faulty resources so fleet availability can be maintained. Automotive and industrial programs add explicit functional-safety goals and evidence.

### 3.13 Design-for-Test Architecture

DFT begins at architecture, not after synthesis. Define scan and compression strategy, MBIST/BISR for embedded memories, JTAG/TAP and boundary scan, test-access architecture, clocking and power assumptions in test mode, fault models, coverage targets, ATE bandwidth, and test-time constraints.

Large SRAM-rich accelerators require MBIST and often repair. Large logic designs require scan compression to keep pattern volume and ATE time practical. Early architectural decisions must reserve test control, access, power, and security lifecycle behavior.

### 3.14 Package and Chiplet Architecture

Choose monolithic versus 2.5D/3D chiplet implementation, partition functions across dies, select die-to-die protocols such as UCIe where suitable, and define interposer/substrate, HBM placement, package routing, thermal path, known-good-die strategy, assembly yield, and test access.

Chiplets can improve yield and scalability when a monolithic die approaches reticle or economic limits, but they introduce die-to-die power, latency, area, package cost, thermal, clocking, reliability, and test complexity. HBM-based accelerators commonly use 2.5D integration with logic and memory on a silicon interposer.

### 3.15 Software and Programming Interface

Define the programming model, ISA extensions where relevant, control/status registers, queueing model, memory model, driver interface, interrupt/event behavior, telemetry, and compiler/runtime mapping.

Hardware and software teams must converge early. Custom hardware that mainstream frameworks and compilers cannot use is not a deployable product. Every novel interface adds software, validation, documentation, and customer-adoption cost.

### 3.16 Third-Party IP Selection, Integration, and Qualification

Modern SoCs depend heavily on third-party soft and hard IP: CPU cores, SerDes, PCIe/CXL/UCIe, HBM/DDR PHYs, PLLs, standard-cell libraries, SRAM/ROM compilers, and foundation IP. Architecture must decide make versus buy, supplier, version, process support, license, roadmap, support, and integration risk.

- **Selection:** evaluate PPA, feature fit, target-foundry support, availability, license cost, vendor support, roadmap, and silicon-proven evidence.
- **Soft versus hard IP:** synthesizable RTL is flexible but must be implemented and signed off by the integrator; hard macros offer characterized PPA but impose strict placement, power, clock, routing, and process constraints.
- **Integration:** align protocol, timing, CDC, reset and power sequencing, UPF boundaries, DFT access, address maps, analog supplies, reference clocks, package channels, and physical keep-outs.
- **Qualification:** run vendor test suites and compliance tests, validate the intended process corners and use cases, review errata, confirm deliverable completeness, and establish a support path. Buying an IP license does not prove that the IP is ready for this product.
- **Supply resilience:** evaluate alternative sources or fallback plans for critical IP, memory, package, and manufacturing dependencies.

For an LLM accelerator, mature hard IP is normally used for high-speed PHYs and PLLs while differentiation remains in compute, scheduling, memory organization, and on-chip communication.

---

## 4. Trade-offs That Apply Throughout

- **PPA:** performance improvements often increase area and power; optimizing one metric in isolation can make the product infeasible.
- **Cost:** die area, process, package, memory, IP, masks, test time, and yield all matter.
- **Time to market:** a theoretically optimal architecture has no value if it cannot be designed, verified, and qualified before the market window.
- **Risk:** new custom IP and aggressive structures offer differentiation but carry implementation and verification risk.
- **Scalability and product family:** preserve configuration points for derivative SKUs without burdening the base design with excessive generality.
- **Verifiability:** architecture complexity can make state space, stimulus, and debug unmanageable.
- **Manufacturability and yield:** very large dies, advanced packages, and immature technology increase cost and yield exposure.
- **Flexibility versus efficiency:** programmability adapts to future workloads; specialization offers superior energy and area efficiency.
- **Make versus buy:** reuse accelerates delivery; internal design should focus on areas that create defensible differentiation.

Every major architecture decision moves several of these axes simultaneously.

---

## 5. How Architecture Converges: Methods and Tools

Architecture is iterative: requirements → alternatives → models → evaluation → feedback → convergence.

- **Analytical models and spreadsheets** estimate throughput, bandwidth, storage, latency bounds, area, power, and cost.
- **Performance simulators** use traces or cycle-level behavior to evaluate contention, queueing, and utilization.
- **Design-space exploration (DSE)** sweeps array size, cache/SRAM capacity, channels, frequency, topology, and dataflow to expose Pareto-optimal choices.
- **Virtual platforms and SystemC/TLM** provide early executable interfaces for software and firmware development.
- **Power and area estimators** use process libraries and tools such as CACTI, McPAT, or Accelergy.
- **Emulation and FPGA prototypes** add fidelity after the architecture has narrowed the alternatives.
- **Competitive and previous-generation benchmarking** anchors assumptions in measured behavior.

Models must be calibrated and their assumptions documented. A precise simulation of the wrong workload or unrealistic memory behavior is still misleading.

---

## 6. Architecture Deliverables

- Controlled **Architecture Specification** with decisions, assumptions, and rationale.
- Top-level block diagram, clock/reset/power-domain diagrams, and interfaces.
- Memory map, programmer-visible registers, and software contract.
- Performance, power, area, bandwidth, thermal, and cost **budget decomposition** by block.
- DSE results and models showing why the selected point meets requirements and how much margin remains.
- Workload suite, traces, model versions, and reproducible analysis.
- Make-versus-buy and IP qualification plan.
- DFT, debug, RAS, security, boot, and package architecture.
- Block-level requirements that become the direct inputs to microarchitecture.

---

## 7. Commonly Missed but Important Points

1. **Design architecture for verification:** define how behavior, corner cases, ordering, and performance will be observed and checked before committing to complexity.
2. **Bring DFT into architecture:** late scan, MBIST, access, power, or test-time decisions can force expensive structural changes.
3. **Engage software and firmware early:** registers, queues, memory behavior, telemetry, and boot are architecture—not post-silicon documentation work.
4. **Reserve margin and configuration points:** frequency, bandwidth, power, capacity, and schedule need headroom for modeling error and implementation loss.
5. **Plan bring-up and debug:** counters, trace, error injection, isolation, and boot visibility are easiest to add before RTL.
6. **Reduce data movement:** moving data often costs more energy than arithmetic; locality can matter more than peak compute.
7. **Consider second sources and supply:** critical IP, HBM, substrate, packaging, and foundry capacity affect production feasibility.
8. **Treat architecture errors as the most expensive errors:** spending extra time on models and evidence here is usually cheaper than downstream rework.

---

## 8. Summary and Next Stage

**Architecture Design uses models and design-space exploration to turn the system contract into a hardware skeleton—blocks, interconnects, memory, dataflow, software interfaces, and budgets—and to show that it can meet PPA, cost, schedule, and risk targets.** Its discipline is multi-objective trade-off, not optimization of one headline metric.

Stage ④, **Microarchitecture Design**, enters each block and defines the cycle-level implementation: pipeline stages, state machines, data paths, buffers, banking, interfaces, and timing choices. It is the bridge from architectural intent to synthesizable RTL.
