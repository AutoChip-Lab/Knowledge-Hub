// English copy for the chapter overview maps.
// Structure and section references mirror secmaps.js exactly.
window.SECMAP_EN = {
  "03": {
    note: "The upper row shows the approximate progression: analyze workloads → partition the system → co-design the major datapath subsystems in parallel → integrate the system and define its external interfaces. The lower band is cross-cutting: clocks, power, reset, security, RAS, and DFT must be addressed in every hardware block—not added after the datapath is complete.",
    flow: [
      { lbl: "① Start", items: [["3.1","Workload analysis"]] },
      { lbl: "② Partition", items: [["3.2","Functional partitioning"]] },
      { lbl: "③ Core datapath subsystems (parallel)", items: [["3.3","Compute architecture"],["3.4","Memory hierarchy"],["3.5","On-chip interconnect / NoC"],["3.6","Dataflow / datapath"],["3.7","I/O & connectivity"]] },
      { lbl: "④ Integration & interfaces", items: [["3.14","Package / chiplets"],["3.15","Software / programming interface"],["3.16","Third-party IP integration"]] },
    ],
    span: {
      lbl: "Cross-cutting · Apply throughout every hardware block (compute / memory / interconnect / I/O)",
      items: [["3.8","Clock architecture"],["3.9","Power architecture"],["3.10","Reset & initialization"],["3.11","Security architecture"],["3.12","RAS"],["3.13","DFT architecture"]],
    },
  },
  "04": {
    note: "The upper row shows the approximate progression: establish the block structure (pipeline, datapath/control, and FSMs) → implement and size timing, buffers, storage, parallel resources, and arithmetic → close with performance modeling. The lower band is cross-cutting: interfaces, CDC, low power, and DFT must be designed into every block rather than added at the end.",
    flow: [
      { lbl: "① Core structure (parallel)", items: [["3.1","Pipeline design"],["3.2","Datapath vs. control"],["3.3","FSM design"]] },
      { lbl: "② Implementation & sizing (parallel)", items: [["3.4","Timing & frequency budget"],["3.5","Buffering & flow control"],["3.6","Memory microarchitecture"],["3.7","Parallelism / resource trade-offs"],["3.8","Arithmetic & numerics"]] },
      { lbl: "③ Closure", items: [["3.13","Performance model / verification plan"]] },
    ],
    span: {
      lbl: "Cross-cutting · Apply throughout the design of every hardware block",
      items: [["3.9","Block interfaces / handshakes"],["3.10","CDC & reset"],["3.11","Low-power microarchitecture"],["3.12","DFT / debug hooks"]],
    },
  },
  "05": {
    note: "The upper row shows the approximate progression: establish the foundations (HDL and synthesizable subset, combinational/sequential discipline, registers, clocks, and reset) → implement each block in RTL. The lower band is cross-cutting: CDC, low power, controllable test-mode clocks and resets, parameterization, and coding standards apply to every module; clean lint is also a synthesis release gate.",
    flow: [
      { lbl: "① Foundations (parallel)", items: [["3.1","HDL / synthesizable subset"],["3.2","Combinational vs. sequential"],["3.3","Registers / clocks / reset"]] },
      { lbl: "② Block RTL (parallel)", items: [["3.4","Datapath RTL"],["3.5","FSM encoding"],["3.6","Memory RTL"],["3.7","Pipelines / handshakes / FIFOs"]] },
    ],
    span: {
      lbl: "Cross-cutting · Apply to the RTL of every hardware module",
      items: [["3.8","CDC RTL"],["3.9","Low-power RTL"],["3.10","Test controls / testable RTL"],["3.11","Parameterization / reuse"],["3.12","Coding / lint / synthesis readiness"]],
    },
  },
  "06": {
    note: "This chapter is more linear than the preceding design stages: establish the verification plan → build the environment (testbench, stimulus, self-checking, and UVM) → apply coverage, assertions, formal methods, acceleration, and specialized checks → run regressions and manage bugs → close coverage and sign off for release.",
    flow: [
      { lbl: "① Plan", items: [["3.1","Verification plan"]] },
      { lbl: "② Build environment (parallel)", items: [["3.2","Testbench architecture"],["3.3","Directed / constrained-random"],["3.4","Self-checking / reference model"],["3.6","UVM methodology"]] },
      { lbl: "③ Apply techniques (parallel)", items: [["3.5","Coverage"],["3.7","SVA assertions"],["3.8","Formal verification"],["3.9","Simulation acceleration"],["3.10","Specialized verification"]] },
      { lbl: "④ Execute", items: [["3.11","Regression / debug / bugs"]] },
      { lbl: "⑤ Close & sign off", items: [["3.12","Coverage closure / signoff"]] },
    ],
  },
  "07": {
    note: "The approximate flow is: understand the synthesis flow → prepare technology libraries and SDC constraints → optimize timing, area, power, and synthesis strategy in parallel → use formal equivalence to prove netlist ≡ RTL → establish a DFT-ready baseline shared by DFT insertion and physical implementation. SDC steers synthesis; equivalence checking is the indispensable safety net.",
    flow: [
      { lbl: "① Overview", items: [["3.1","Synthesis flow / outputs"]] },
      { lbl: "② Inputs (parallel)", items: [["3.2","Technology libraries / standard cells"],["3.3","SDC constraints"]] },
      { lbl: "③ Optimize (parallel · core)", items: [["3.4","Timing-driven synthesis / slack"],["3.5","Area / timing / power trade-offs"],["3.6","Power optimization"],["3.8","Synthesis strategy"]] },
      { lbl: "④ Prove functionality", items: [["3.9","LEC equivalence"]] },
      { lbl: "⑤ Shared baseline", items: [["3.7","DFT-ready preparation"],["3.10","Outputs / coordinated handoff"]] },
    ],
  },
  "dft": {
    note: "DFT planning begins during architecture; RTL implements test controls and controllable clocks and resets. Once the synthesized netlist is available, scan, compression, MBIST, and related structures are inserted and ATPG begins. The flow then continues through physical scan-chain reordering, test-mode signoff, ATE bring-up, production diagnosis, and yield learning. DFT is a cross-stage discipline, not one sharply bounded step between synthesis and physical design.",
    flow: [
      { lbl: "① Early planning", items: [["3.1","Specification / architecture / DFT DRC"]] },
      { lbl: "② Establish test access", items: [["3.2","JTAG / wrappers / IJTAG"]] },
      { lbl: "③ Primary implementation window", items: [["3.3","Scan / compression / test points"],["3.5","MBIST / BISR"],["3.6","Boundary scan / LBIST"]] },
      { lbl: "④ ATPG & coverage", items: [["3.4","Pattern generation / fault-coverage closure"]] },
      { lbl: "⑤ Physical-to-production loop", items: [["3.9","DFT verification / test-mode signoff"],["3.10","ATE patterns / protocols"],["3.11","Diagnosis / yield learning"]] },
    ],
    span: {
      lbl: "Cross-cutting DFT constraints · Every structure and pattern must account for test clocks, power, low-power states, physical feasibility, production diagnosis, and hierarchical 3D-IC test",
      items: [["3.7","Test clocks / power / low-power / X"],["3.8","Physically aware DFT / scan-chain reordering"],["3.12","2.5D / 3D DFT"]],
    },
  },
  "08": {
    note: "Physical implementation is highly iterative: prepare the design → floorplan and build the power network → place → synthesize the clock tree → route → hand off for signoff. Timing closure, parasitic extraction and signal integrity, DRC/LVS, low-power structures, and DFT implementation span the flow and must be rechecked after each major step; any failure sends the design back for another iteration.",
    flow: [
      { lbl: "① Setup", items: [["3.1","Flow / data setup"]] },
      { lbl: "② Plan", items: [["3.2","Floorplanning"],["3.3","Power-delivery network"]] },
      { lbl: "③ Placement", items: [["3.4","Placement"]] },
      { lbl: "④ Clock tree", items: [["3.5","Clock-tree synthesis (CTS)"]] },
      { lbl: "⑤ Routing", items: [["3.6","Routing"]] },
      { lbl: "⑥ Handoff", items: [["3.11","GDSII outputs / handoff"]] },
    ],
    span: {
      lbl: "Across implementation · Recheck and iterate after placement, CTS, and routing",
      items: [["3.7","Timing closure"],["3.8","Parasitic extraction / SI"],["3.9","Physical verification DRC/LVS"],["3.10","Low-power / DFT implementation"]],
    },
  },
  "09": {
    note: "Signoff is not one serial check: prepare extracted parasitics and all analysis corners → run every signoff dimension in parallel until each is clean → pass the tapeout gate. Any red result blocks tapeout and returns the design to Stage ⑧ for an ECO, followed by another complete signoff iteration.",
    flow: [
      { lbl: "① Golden setup", items: [["3.1","Signoff flow / golden tools"]] },
      { lbl: "② Full signoff (parallel · all clean)", items: [["3.2","STA"],["3.3","MMMC / OCV"],["3.4","Power signoff"],["3.5","IR drop / EM"],["3.6","SI / crosstalk signoff"],["3.7","Physical verification DRC/LVS"],["3.8","LEC equivalence"],["3.9","DFM / reliability"]] },
      { lbl: "③ Gate", items: [["3.10","Signoff gate / tapeout"]] },
    ],
  },
  "10": {
    note: "Tapeout is a mostly linear handoff: release the final layout database → perform mask-data preparation (fracturing, OPC, and RET) → fabricate photomasks → choose a full mask set or MPW and account for NRE → authorize the release and wait for first silicon. Beyond this gate, the design is frozen into the manufacturing flow and changes become extremely costly.",
    flow: [
      { lbl: "① Release data", items: [["3.1","Tapeout / layout release"]] },
      { lbl: "② Mask-data preparation", items: [["3.2","MDP / OPC / RET"]] },
      { lbl: "③ Mask fabrication", items: [["3.3","Photomask fabrication"]] },
      { lbl: "④ Vehicle & cost (parallel)", items: [["3.4","Full mask set vs. MPW"],["3.5","NRE / cost"]] },
      { lbl: "⑤ Release & wait", items: [["3.6","Handoff / approval / silicon wait"]] },
    ],
  },
  "11": {
    note: "The manufacturing backbone is concise: start with a silicon wafer → build transistors in the front end of line (FEOL) → build interconnect in the back end of line (BEOL). The lower band spans the full flow: lithography and the deposition/etch/doping process loop repeat across layers, while process control, yield, cycle time, and capacity remain continuously active.",
    flow: [
      { lbl: "① Start", items: [["3.1","Fabrication overview / wafer"]] },
      { lbl: "② FEOL", items: [["3.4","Build transistors"]] },
      { lbl: "③ BEOL", items: [["3.5","Build interconnect"]] },
    ],
    span: {
      lbl: "Across fabrication · Core process loops repeat by layer; process control, yield, cycle time, and capacity remain active",
      items: [["3.2","Lithography"],["3.3","Deposition / etch / doping"],["3.6","Process control / PCM"],["3.7","Defects / yield"],["3.8","Cycle time / capacity"]],
    },
  },
  "12": {
    note: "Packaging and test is broadly linear: wafer sort (CP) screens bad dies early → thin and dice the wafer → package the die with its I/O, power, and thermal path → run final test → perform burn-in where required → bin and ship qualified devices. How effectively defects can be screened was largely determined by DFT planning much earlier in the flow.",
    flow: [
      { lbl: "① Overview", items: [["3.1","Packaging & test overview"]] },
      { lbl: "② Wafer sort", items: [["3.5","Wafer sort (CP)"]] },
      { lbl: "③ Thin & dice", items: [["3.2","Wafer thinning / dicing"]] },
      { lbl: "④ Packaging", items: [["3.3","Package types"],["3.4","Assembly process"],["3.9","Package co-design"]] },
      { lbl: "⑤ Final test", items: [["3.6","Final test / ATE"],["3.10","Test-program development"]] },
      { lbl: "⑥ Burn-in & binning", items: [["3.7","Burn-in / reliability"],["3.8","Binning"]] },
    ],
  },
  "13": {
    note: "The final stage is: receive first silicon → perform first power-on → debug in the lab → validate and characterize silicon → manage errata while bringing up software → ramp yield and complete reliability qualification → enter volume production. Bring-up is the point at which the rigor of every preceding stage is tested against physical reality.",
    flow: [
      { lbl: "① Overview", items: [["3.1","Bring-up overview"]] },
      { lbl: "② Power-on", items: [["3.2","First power-on"]] },
      { lbl: "③ Debug", items: [["3.3","Lab debug"]] },
      { lbl: "④ Validate & characterize", items: [["3.4","Silicon validation / characterization"]] },
      { lbl: "⑤ Errata & software (parallel)", items: [["3.5","Errata / re-spin"],["3.6","Software bring-up"]] },
      { lbl: "⑥ Volume production", items: [["3.7","Yield ramp"],["3.8","Reliability qualification / HVM"]] },
    ],
  },
};
