# End-to-End Chip Design Flow · Stage ⑪: Wafer Fabrication

> The eleventh article in the "End-to-End Chip Design Flow" learning series.
> Numbered main flow: ① Product/Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Verification
> → ⑦ Logic Synthesis → ⑧ Physical Design → ⑨ Signoff → ⑩ Tapeout → ⑪ Wafer Fabrication → ⑫ Packaging & Test → ⑬ Silicon Bring-up / Volume Production.
> DFT spans: ③ test architecture and coverage targets → ④/⑤ test control and testable logic → ⑦ scan/compression/MBIST insertion and ATPG → ⑧ scan-chain reordering plus test-clock, power, and congestion closure → ⑨ test-mode and coverage signoff → ⑫/⑬ ATE, diagnosis, and yield learning.

---

## 0. The Big Picture: From an Idea to Silicon

```
① Product/Market Requirements → ② System Specification → ③ Architecture Design → ④ Microarchitecture Design → ⑤ RTL Design
   → ⑥ Functional Verification → ⑦ Logic Synthesis → ⑧ Physical Design (floorplanning/placement/clock-tree synthesis/routing)
   → ⑨ Signoff (STA/power/EM/IR/physical verification/equivalence) → ⑩ Tapeout
   → ⑪ Fabrication (fab) → ⑫ Packaging and Test → ⑬ Post-silicon Bring-up/Volume Production

DFT: ③ test architecture → ④/⑤ test control and testable logic → ⑦ scan/compression/MBIST and ATPG → ⑧ scan-chain reordering/test timing and power → ⑨ test-mode and coverage signoff → ⑫/⑬ ATE/diagnosis/yield learning
```

**Fabrication sits between tapeout (⑩) and packaging and test (⑫).** After receiving the reticle set, the foundry repeatedly performs **lithography, deposition, etch, doping, cleaning, and polishing** operations on silicon wafers in a cleanroom. Across hundreds of process steps, it **prints the layout layer by layer as real transistors and metal interconnect**. This is the stage most directly dominated by process physics, chemistry, and materials engineering. An abstract layout becomes a circuit built at near-atomic dimensions.

> In one sentence: **Fabrication uses light, chemistry, materials, and hundreds of process steps to transfer the reticle patterns onto silicon layer by layer, creating nanometer-scale transistors and wires. The layout finally becomes physical.**

---

## 1. What Exactly Is Fabrication?

In one sentence: **Using the complete reticle set, the foundry performs hundreds of front-end-of-line (FEOL) steps to create transistors and back-end-of-line (BEOL) steps to create interconnect, producing completed die sites on silicon wafers while continuously monitoring process health and yield.**

### The core cycle: print one layer at a time

A chip is a stack of **dozens of structured layers**. Each layer broadly repeats the same cycle: **deposit material → define a pattern by lithography → etch or dope → clean and planarize**. Once one layer is complete, the process advances to the next. Each reticle provides the master pattern for one or more of these patterning operations.

### The two major manufacturing domains: FEOL and BEOL

- **Front end of line (FEOL)**: forms the **transistors** at and near the silicon surface, including wells, isolation, gates, and source/drain regions.
- **Back end of line (BEOL)**: builds the **multilevel metal interconnect** above the transistors, including interlayer dielectrics and vias, to connect the devices into functional circuits.

> An important industry qualification: the "nanometer" designation of an advanced process—such as 7 nm, 5 nm, or 3 nm—is now primarily a commercial label for a process generation and density class. It is **not equal to a particular minimum measurable feature on the chip**. Actual contacted gate pitch may be around 50 nm and minimum metal pitch around 30 nm, both much larger than the node name. A new node still generally means smaller, denser structures and more transistors per unit area, but that result comes from the coordinated scaling of cell height, fin or nanosheet count, contacted poly pitch, metal pitch, and other parameters—not from scaling one transistor dimension in direct proportion to the marketed node number. Historically, node names were more closely tied to physical dimensions, but that relationship has progressively weakened. **More advanced processes are harder and more expensive to manufacture.**

*For the TPU*: the 28 nm reticles released in ⑩ guide FEOL processing that creates the transistors for the array's 65,536 MACs, control logic, and SRAM, followed by BEOL processing that connects them into the systolic array and on-chip memory system. The wafer ultimately contains many TPU dies, each no larger than about 331 mm².

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it**: the **semiconductor foundry**. For a fabless design company, this work is outsourced to a manufacturer such as TSMC, Samsung, or Intel Foundry, while manufacturing and operations interface engineers coordinate from the design-company side.

**Required inputs**: the complete **reticle set** from ⑩, the selected **process technology**—whose node and PDK were locked earlier—silicon wafers and process materials, and the foundry's tightly controlled process recipes.

> The essential mindset is that the design company largely hands over direct control at this stage. Its influence comes from selecting the right process and foundry, delivering clean tapeout data, and collaborating on yield. The actual manufacturing recipe is the foundry's core proprietary know-how.

---

## 3. Core Fabrication Activities

Each item below explains **what it is, the key engineering point, and what it looks like for the TPU**.

### 3.1 Fabrication overview and the silicon wafer

- **What it is**: many die sites are fabricated together on a silicon wafer, commonly 300 mm in diameter. The gross count can range from tens for very large dies to thousands for small dies, before edge losses and yield are considered. The entire wafer passes through hundreds of operations over weeks to months.
- **Key point**: a larger die yields fewer candidate dies per wafer and has a higher probability of intersecting a random defect, reducing yield. Die area therefore feeds directly into unit cost.
- *For the TPU*: a die approaching 331 mm² occupies substantial wafer area, so only a limited number fit on a 300 mm wafer and the economics are sensitive to defect density and yield.

### 3.2 Lithography

- **What it is**: lithography is manufacturing's "drawing tool." The wafer is coated with **photoresist**, exposed through a reticle—using 193 nm immersion DUV for many layers and **EUV** at leading-edge nodes—and developed to reveal a pattern.
- **Key point**: lithographic resolution limits printable geometry. When the wavelength is insufficient, the process relies on **multiple patterning and OPC/RET**; the pre-distortion introduced during tapeout in ⑩ is realized here. Lithography is among the most expensive and critical fab operations.
- *For the TPU*: a 28 nm process relies on 193 nm DUV lithography, with immersion used for critical layers, to define array and interconnect structures layer by layer. TPU v1's foundry-specific layer and patterning sequence is not public.

### 3.3 Deposition, etch, doping, and planarization: the core process loop

- **What it is**: **deposition** grows or places material layers using CVD, PVD, or ALD; **dry or wet etch** removes unwanted material; **ion implantation** changes silicon conductivity to create device regions; and **chemical-mechanical planarization (CMP)** flattens the surface for subsequent layers.
- **Key point**: every layer depends on precise coordination among these steps. A deviation in one operation can render a large portion of a wafer unusable.
- *For the TPU*: the gate, source/drain structures, contacts, vias, and metal layers for every transistor in the array are formed through repeated instances of this process loop.

### 3.4 FEOL: building transistors

- **What it is**: FEOL forms the **transistors** at the silicon surface, including wells, isolation, gate dielectric and gate structures, source/drain regions, and contacts.
- **Key point**: transistor speed, leakage, variability, and reliability directly determine product performance and yield. Device architecture—planar, FinFET, GAA, and so on—is a central differentiator of a process technology.
- *For the TPU*: the transistors implementing 65,536 MACs, the surrounding control logic, and SRAM are all created in FEOL.

### 3.5 BEOL: building interconnect

- **What it is**: BEOL creates **multiple layers of metal routing**, traditionally copper at many nodes, together with **interlayer dielectrics** and **vias** that connect the transistors into a complete circuit. Modern chips may use well over ten metal layers.
- **Key point**: the wires routed during physical design in ⑧ become physical metal here. Layer count, line width, via structure, and low-k dielectrics influence delay, power, reliability, and routability.
- *For the TPU*: the systolic array, SRAM, and control logic are connected using the multilayer metal network defined by physical design.

### 3.6 Process control, metrology, and PCM structures

- **What it is**: process health is monitored through **in-line metrology**, defect inspection, **process control monitor (PCM) structures**—small test structures often placed in wafer scribe lanes to measure transistor and interconnect parameters—and statistical process control (SPC).
- **Key point**: early detection of process drift prevents the loss of entire wafer lots. PCM data answers the practical question, "How did the transistors and interconnect in this lot actually turn out?"
- *For the TPU*: PCM measurements verify that the electrical parameters of each 28 nm wafer lot remain within the process specification before the lot advances.

### 3.7 Defects, yield, and defect density

- **What it is**: random wafer **defects** can kill individual dies. **Die yield is the fraction of fabricated candidate dies that meet the applicable test criteria**, and it is strongly influenced by **defect density (D0)** and die area.
- **Key point**: **the larger the die, the greater the probability that it intersects a defect and the lower its yield tends to be**. This is why architecture discussion in ③ §3.14 treats area as cost and why large monolithic chips may move toward chiplets, whose physical integration appears in ⑫. Yield directly determines cost per good die.
- *For the TPU*: a large TPU die is especially sensitive to defect density, making yield a major driver of manufacturing cost.

### 3.8 Manufacturing cycle time and capacity

- **What it is**: the **cycle time** for a wafer lot to traverse the complete process is commonly measured in weeks to months. Available **capacity** depends on foundry scheduling, equipment loading, and process maturity.
- **Key point**: long cycle time and limited reversibility make rework extremely expensive. Capacity commitments and fab scheduling directly affect launch timing and supply.
- *For the TPU*: wafer fabrication necessarily occupied part of the roughly 15-month path from project start to deployment, leaving little room for repeated fabrication cycles. TPU v1's detailed foundry schedule and cycle-time breakdown are not public.

---

## 4. Trade-offs That Persist Throughout Fabrication

- **Feature scaling versus cost and difficulty**: a more advanced node may offer better density and performance, but it also brings more difficult process control, more expensive masks and wafers, and a longer yield ramp.
- **Die area versus yield and cost**: a large die can deliver high capability, but typically yields fewer good units and costs more. This is a fundamental motivation for chiplets.
- **Yield ramp**: a new process or new design often begins at lower yield and improves through time, data, and yield learning.
- **Handing over control**: a fabless company delegates manufacturing to the foundry. It controls process selection, release data, contractual coordination, and collaborative yield work—not the detailed process recipe.

> The central idea: **Fabrication is where the promise behind a "nanometer" process is realized at near-atomic dimensions through light, chemistry, materials, and hundreds of operations. It determines whether the intended compute actually exists on silicon, at what yield, and at what cost.**

---

## 5. How Fabrication Is Executed: Methods and Equipment

- **Key equipment**: DUV/EUV scanners, CVD/PVD/ALD deposition systems, etchers, ion implanters, CMP tools, cleaning systems, and metrology/inspection equipment.
- **Data and monitoring**: in-line metrology, defect inspection, PCM structures, and SPC.
- **Flow**: reticles enter production → FEOL → BEOL → continuous in-line monitoring → completed wafers. The flow takes weeks to months and is largely irreversible once processed.

---

## 6. Fabrication Deliverables

- **Processed wafers** containing completed die sites, delivered to **packaging and test in ⑫** for wafer sort, thinning, dicing, and assembly.
- **PCM and in-line monitoring data** demonstrating whether the process remained within specification.
- **Preliminary wafer-level yield information** for cost and capacity analysis.

> Fabrication produces real silicon dies. Every abstract design decision made upstream has finally become a physical object that can be handled once it is packaged.

---

## 7. Easily Overlooked but Potentially Fatal Pitfalls

Most of these risks are owned by the manufacturing side, but design teams must understand them.

1. **Large die area depresses yield**: greater area generally increases exposure to random defects and raises cost; ignoring this during architecture can create painful production economics.
2. **Process drift goes undetected**: inadequate PCM or SPC can allow entire wafer lots to be lost.
3. **High defect density**: early yield at a new node may be poor. A product plan that leaves no time for yield ramp can create severe supply shortages.
4. **Inadequate lithography or OPC**: printed geometry diverges from the design, reducing functionality or yield.
5. **Selecting a node by label rather than maturity**: a very new node may have incomplete IP, unstable yield, and constrained capacity.
6. **Ignoring cycle time and capacity**: fabrication takes weeks to months and cannot simply be undone; poor planning can miss the market window.

---

## 8. Summary and Next Step

**Fabrication is the foundry's execution of hundreds of FEOL transistor-formation and BEOL interconnect-formation steps on silicon wafers, printing the design as a real circuit layer by layer while continuously controlling process health and yield. It is the stage most directly dominated by process physics, chemistry, and materials engineering, and the design company largely hands over direct control.** Its defining challenge is **realizing the promise of a process node at near-atomic dimensions**. Its central economic law is **larger dies generally have lower yield, so area directly drives cost**. Its unavoidable reality is that **cycle time is long, processing is largely irreversible, and yield improves through a deliberate ramp**.

The next stage, ⑫, is **packaging and test**: the wafer is separated into individual dies, each die is placed in a package that provides protection, electrical connections, power delivery, and heat removal, and every unit is electrically tested. Manufacturing defects are screened out so that only **qualified packaged devices** proceed to delivery.
