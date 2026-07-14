# End-to-End Chip Design Flow · Stage ⑫: Packaging & Test

> The twelfth article in the "End-to-End Chip Design Flow" learning series.
> Thirteen numbered main stages: ① Product/Market Requirements → ② System Specification → ③ Architecture → ④ Microarchitecture → ⑤ RTL → ⑥ Verification
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

**Packaging and test sit between fabrication (⑪) and bring-up/volume production (⑬).** Fabrication produces an entire wafer containing completed die sites. Those dies are fragile and cannot be used directly after separation. This stage performs two distinct jobs: **packaging**—separating each die, protecting it, connecting it to pins or solder balls, and providing a thermal path—and **production test**—electrically testing every unit to screen manufacturing defects. Together they turn a piece of silicon into a product that can be mounted on a board and is known to meet its outgoing quality criteria.

> In one sentence: **Packaging makes a chip usable by giving it protection, electrical connections, power delivery, and heat removal; test makes it trustworthy by screening defective units. Only a device that is both usable and trustworthy can be shipped.**

---

## 1. What Exactly Are Packaging and Test?

In one sentence: **This stage thins wafers, dices them into individual dies, places the dies into packages, connects I/O and power, provides thermal management, and electrically and functionally tests every unit to screen manufacturing defects and deliver qualified packaged devices.**

### Two workstreams: packaging makes it usable; test identifies good units

- **Packaging**: a bare die is small, fragile, and has connection features too fine for direct system use. The package provides **mechanical protection, electrical connections through leads or solder balls, power delivery, and a heat-removal path**, bridging the nanometer-scale die to the millimeter-scale board.
- **Test**: manufacturing is imperfect, so **every production die must be screened**. Production test in ⑫ is not the same as functional verification in ⑥. Verification asks whether the design implements the specification; production test asks whether this manufactured unit is classified as passing under the defined structural, functional, and parametric tests. No finite test program proves the absolute absence of every physical defect.

*For a TPU-class accelerator*: a high-I/O package such as flip-chip, an appropriate package substrate, and a robust thermal solution are standard implementation choices, followed by screening on automated test equipment (ATE). TPU v1's exact package construction, assembly flow, and production-test program are not disclosed in the cited public architecture material.

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it**: an **outsourced semiconductor assembly and test provider (OSAT)**—for example ASE or Amkor—or an integrated foundry packaging/test line. On the design-company side, **package and test engineers** develop package designs, test structures, and test programs and manage the handoff.

**Required inputs**: **completed wafers from ⑪**; the **package design** based on the package planning performed during ③ and ⑧; **test programs and patterns** produced by the DFT flow and continuously refined as the netlist, layout, and ATE environment converge—including scan/ATPG, MBIST/JTAG patterns, waveforms, and coverage reports; and the required **ATE and probe cards**.

> The essential mindset is that **DFT's production value is realized here**. If the upstream team did not establish scan, compression, MBIST, final patterns, and robust test protocols, this stage cannot test thoroughly or screen effectively. Test quality directly affects outgoing quality and field-failure rate.

---

## 3. Core Packaging and Test Activities

Each item below explains **what it is, the key engineering point, and what it looks like for the TPU**.

### 3.1 Packaging and test overview

- **What it is**: the broad unit flow is wafer probe/wafer sort (CP) → wafer thinning and dicing → package assembly → final test (FT) → optional production burn-in → binning and shipment. Sample-based reliability qualification runs as a separate product-release activity.
- **Key point**: **test on the wafer first** so that bad dies are identified before package cost is spent. Test again after packaging to verify both die and assembly.
- *For a TPU-class production flow*: each die would normally receive an initial wafer-level screen and then final test after assembly. TPU v1's exact CP/FT insertion points and coverage are not public.

### 3.2 Wafer thinning and dicing

- **What it is**: the wafer is **thinned by backgrinding** to meet package-height, mechanical, and thermal requirements, then separated into individual dies by a **diamond saw or laser along the scribe lanes**.
- **Key point**: dicing must not crack or contaminate the die. A thinner die can help meet package-height and some thermal or 3D-integration requirements, but it is more mechanically fragile.
- *For the TPU*: large dies approaching 331 mm² must be separated from the wafer intact and prepared for assembly.

### 3.3 Package types: wire bond, flip-chip, 2.5D, and 3D

- **What it is**: common die-to-package interconnect options include **wire bonding**, which uses fine wires from die pads and is economical; **flip-chip**, which turns the die face-down and connects it through C4 bumps or similar structures for high I/O density and performance; **2.5D integration**, where logic and HBM share a silicon interposer; and **3D integration**, which vertically stacks dies using TSVs or newer bonding structures.
- **Key point**: high-performance, high-I/O, and high-bandwidth products tend toward flip-chip, 2.5D, or 3D approaches. This is the physical realization of the chiplet and package architecture introduced in ③ §3.14.
- *For a TPU-class accelerator*: flip-chip-class packaging is a common way to provide dense I/O and power delivery. HBM-based accelerators often use advanced 2.5D integration; exact choices are product- and generation-specific.

### 3.4 Package assembly: die attach → interconnect → molding/lid → solder balls

- **What it is**: a typical sequence is **die attach → wire-bond or bump interconnect → molding compound or lid attach → BGA ball attach**, producing a component that can be mounted on a board. The assembly also creates a thermal path through a lid, thermal interface material, and external cooling solution.
- **Key point**: the package must simultaneously satisfy electrical requirements—power and signal integrity—thermal limits, and mechanical reliability.
- *For a TPU-class accelerator*: the package may combine flip-chip interconnect, a package substrate, BGA attachment to the accelerator board, and a lid or heat spreader sized for data-center power delivery and cooling. This is an industry implementation example, not a disclosed TPU v1 package stack-up.

### 3.5 Wafer probe (CP/wafer sort)

- **What it is**: before packaging, a **probe card** contacts each die on the wafer for **chip probing (CP), also called wafer sort**. The resulting wafer map identifies passing and failing die locations.
- **Key point**: early known-good-die (KGD) screening avoids spending package cost on known-bad die. Wafer sort also returns defect distribution and wafer-yield information to manufacturing.
- *For a TPU-class production flow*: wafer sort would create a die map identifying candidates for assembly. TPU v1's actual wafer-sort program and selection limits are not public.

### 3.6 Final test (FT) and automated test equipment (ATE)

- **What it is**: after packaging, each device undergoes **final test** on **automated test equipment**. The test program applies scan and BIST patterns, at-speed and functional sequences, I/O tests, and parametric measurements to determine whether the device was manufactured correctly and can operate at its rated conditions.
- **Key point**: escape rate is influenced by the combined quality of DFT structures, final ATPG/MBIST patterns, and parametric and functional tests. Test time contributes directly to unit cost.
- *For a TPU-class AI accelerator*: an ATE flow commonly combines logic scan, memory BIST, I/O and parametric tests, and at-speed or functional patterns. TPU v1's actual production-test flow is not public, so this industry practice must not be presented as a disclosed TPU product fact.

### 3.7 Burn-in and reliability testing

- **What it is**: **burn-in**, when specified, is a production screen that operates units at elevated temperature and sometimes elevated voltage for a defined interval to precipitate early-life failures. It is distinct from sample-based qualification stresses such as high-temperature operating life (HTOL), which establish reliability for a population rather than screen every production unit.
- **Key point**: burn-in is not mandatory for every data-center or automotive product. Its use, conditions, and duration depend on reliability targets, expected defect mechanisms, outgoing-quality goals, and cost; sample-based qualification remains a separate obligation.
- *For a TPU-class accelerator*: the appropriate mix of production burn-in and sample-based reliability testing would be selected from product-reliability requirements and characterization data. TPU v1's actual screen conditions and qualification plan are not public.

### 3.8 Binning and yield screening

- **What it is**: test results assign each unit to a **bin**—pass or fail and, where appropriate, a speed, power, quality, or feature grade. Only qualified devices proceed to shipment or system integration.
- **Key point**: binning allows dies from the same manufacturing population to support differentiated products. Screening yield directly controls shipment volume and cost.
- *For the TPU*: qualified accelerators are shipped to data centers, while failing or out-of-spec units are removed or assigned to a lower eligible grade if the product strategy permits.

### 3.9 Package design and die-package-board co-design: a package is more than a protective shell

- **What it is**: §3.3 and §3.4 described how the OSAT physically assembles a die, but **the package itself is an engineering design**. Substrate and interposer routing, package-level signal integrity (SI) and power integrity (PI), coordinated **die-package-board co-design**, and thermal-mechanical design all require dedicated work. For an accelerator delivered as a combined die, HBM, package, board, and cooling solution, this is a substantial engineering effort.
- **Key points**:
  - **Substrate and interposer design**: flip-chip C4 bumps and redistribution layers, and the dense silicon-interposer wiring used to connect a logic die to thousands of HBM signals, must meet routing-density, impedance, and crosstalk requirements.
  - **SI/PI co-design**: high-speed SerDes package channels, wide parallel HBM buses, the power-delivery path from the board through the package to the on-die PDN, power/ground planes, and decoupling capacitors must be modeled together. **On-die IR-drop signoff in ⑨ is electrically connected to package- and board-level power delivery.**
  - **Thermal design**: the lid or heat spreader, thermal interface material (TIM), heat sink, or cold plate must keep junction temperature (Tj) within specification and remove heat from compute-array hot spots.
  - **Die-package-board co-design**: pad, bump, and ball assignments and the respective stack-ups must be planned together; a change in one domain commonly forces changes in the other two.
- *For a TPU v1-class illustration*: a die approaching 331 mm² would require package and board power delivery plus a thermal solution sized for continuous data-center loading. Flip-chip, BGA, lid, and substrate details shown here are representative industry choices, not disclosed TPU v1 construction. HBM-based accelerators commonly add 2.5D interposer or other advanced package integration.

### 3.10 Production test-program development

- **What it is**: CP and FT in §3.5 and §3.6 require an executable **test program**, and that program must itself be engineered. It is a distinct bridge between post-silicon characterization in ⑬ and high-volume screening. Engineers define test **limits and guardbands**, organize scan, MBIST, functional, parametric, and at-speed patterns, establish **CP-to-FT correlation**, reduce **test time**, debug the **ATE program**, enable **multisite testing**, and implement the binning rules.
- **Key points**:
  - **Where limits come from**: test limits are derived from product specifications and characterization data, with an appropriate guardband. Limits that are too loose allow escapes; limits that are too tight discard good yield.
  - **Test time is money**: large SRAM and logic populations depend on **scan compression and MBIST** to contain execution time. ATE time is charged by the second, so program efficiency directly affects per-unit test cost.
  - **Coverage depends on DFT**: screening quality depends on scan and MBIST structures, final ATPG patterns, and achieved coverage. The ATE program converts the capability accumulated and signed off across netlist, layout, and tester-debug stages into concrete waveforms, limits, and decision logic. Findings on the tester feed back into pattern and condition refinement.
  - **CP-to-FT correlation and multisite**: wafer-level and package-level decisions must correlate consistently; testing several devices simultaneously on ATE increases throughput.
- *For a TPU v1-class illustration*: assuming standard scan and MBIST structures, engineers would build an ATE program that covers array logic and SRAM, correlates CP with FT, controls test time, and sets limits informed by characterization around the 700 MHz product target. TPU v1's actual chains, MBIST architecture, ATE conditions, multisite strategy, limits, and bins are not public.

---

## 4. Trade-offs That Persist Throughout Packaging and Test

- **Test coverage versus test cost**: broader testing improves screening, but pattern volume and ATE time directly add to unit cost. Efficient DFT—scan compression and BIST in particular—is required to balance the two.
- **Early screening versus late screening**: CP saves package cost by removing bad dies early, while some defects appear only after assembly or reliability stress.
- **Package capability versus cost**: flip-chip and 2.5D approaches provide superior performance and I/O density but are more expensive than wire bond. The product position should drive the choice.
- **Escape rate versus field failure**: inadequate testing allows defective devices to reach customers, where failure cost is usually far greater than a modest increase in test time.
- **Accumulated DFT debt**: weaknesses in early DFT planning cannot be fully repaired at final test. Testability accumulates from architecture through RTL, synthesis, structural insertion, physical implementation, and signoff; packaging and test can only realize what upstream design made possible.

> The central idea: **Packaging connects the chip to the outside world, and test makes the chip worthy of trust. How effectively production test can screen devices was largely determined during DFT planning; packaging and test are where that earlier investment—or debt—becomes visible.**

---

## 5. How Packaging and Test Are Executed: Methods and Equipment

- **Packaging**: die-attach equipment, wire bonders or flip-chip bonders, molding, ball attach, lid and heat-spreader assembly, and package-substrate and thermal design tools.
- **Test**: **ATE** plus **probe cards for CP**, **test sockets for FT**, and test programs containing scan, BIST, functional, and parametric content.
- **Reliability**: production burn-in equipment where required, plus separate sample-based qualification equipment for HTOL, temperature cycling, humidity, and related stresses.
- **Flow**: CP → dicing and package assembly → FT → optional burn-in → binning → shipment of qualified devices.

---

## 6. Packaging and Test Deliverables

- **Packaged production devices** and, where the program includes module integration, completed modules or accelerator cards.
- **Test results and binning data** recording each unit's qualification and grade.
- **Qualified packaged devices** delivered to **silicon bring-up / volume production in ⑬** and ultimately to customers.
- **Yield and failure data** fed back to manufacturing and design for improvement.

> The output of packaging and test is a product that is both usable and trustworthy. For the first time in the flow, the preceding engineering work has become something that can be placed directly into a customer's system.

---

## 7. Easily Overlooked but Potentially Fatal Pitfalls

1. **Inadequate DFT planning**: insufficient scan or MBIST causes weak screening and defect escapes; the field cost can dwarf the cost of additional test.
2. **Uncontrolled test time**: large SRAM and logic populations without compression or BIST consume excessive ATE time and raise unit cost.
3. **Testing function but not speed or parameters**: omitting at-speed and parametric content allows marginal devices to fail intermittently in the field.
4. **Skipping burn-in when the product requires it**: early-life failures reach customers and can be especially damaging in high-reliability applications.
5. **Failing to co-optimize package electrical, thermal, and mechanical behavior**: weak power delivery, insufficient cooling, or mechanical stress can cause package-level failures.
6. **No early CP screen**: known-bad dies consume package materials and capacity unnecessarily.
7. **Weak outgoing-quality criteria**: loose binning and screening rules allow substandard units to ship and damage product reputation.

---

## 8. Summary and Next Step

**Packaging and test separate a wafer into dies, place each die in a usable package with I/O, power delivery, protection, and heat removal, and electrically and functionally test every unit to screen manufacturing defects and deliver qualified packaged devices.** Their defining principle is that **packaging makes the chip usable and test makes it trustworthy**. Their key causal relationship is that **screening quality was substantially determined during DFT planning**. Their central cost problem is **balancing coverage and test time while recognizing that defect escapes are much more expensive in the field**.

The next and final numbered step, ⑬, is **bring-up and volume production**. First silicon returns to the laboratory for initial power-on, debugging, and validation with real workloads. The team then ramps yield, closes reliability and software readiness, and turns a successful design into sustained high-volume delivery.
