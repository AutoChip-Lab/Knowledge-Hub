# End-to-End Chip Design Flow · Stage ⑩: Tapeout

> The tenth article in the "End-to-End Chip Design Flow" learning series.
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

**Tapeout sits between signoff (⑨) and fabrication (⑪).** Once signoff passes, the design is **formally released to the foundry**: the final layout is converted into mask-writer-ready data, the photomasks are produced, and manufacturing begins. The term "tapeout" dates back to the era when layout data was delivered to the fab on magnetic tape. Today it marks one decisive transition: **the released design revision changes from editable data into a committed, effectively irrevocable manufacturing order.**

> In one sentence: **Tapeout is the moment the team presses the multimillion-dollar, irreversible button—releasing the signed-off layout to the foundry, committing the mask set, and starting fabrication. From that point, the design is frozen into silicon.**

---

## 1. What Exactly Is Tapeout?

In one sentence: **Tapeout is the formal handoff of the signed-off final layout (GDSII/OASIS), through mask data preparation and photomask generation, to the foundry for fabrication. It is the boundary between design and manufacturing, and the point at which the design is frozen.**

### Why it is a major event rather than just another step

- **Irreversible and expensive**: once the masks have been made, even a small design change may require new masks and a re-spin. Depending on node and mask strategy, a leading-edge mask set can cost millions of US dollars, while a re-spin can consume months.
- **It changes the responsibility boundary**: the design company remains accountable for the correctness and integrity of the submitted database; the foundry is accountable for manufacturing it to the qualified process and agreed specifications. Both parties continue to collaborate on data disposition and yield.
- **It turns data into a physical order**: the released GDSII/OASIS revision is frozen as the manufacturing baseline. Its geometry will be written into reticles and repeatedly transferred onto silicon wafers.

*For the TPU*: a signed-off 28 nm layout would pass through mask data preparation and reticle fabrication before wafer start. TPU v1 went from project start to deployment in roughly 15 months, but its private release package, mask records, detailed tapeout schedule, and costs are not public; the sequence described here is the standard foundry flow.

---

## 2. Who Does It, and What Inputs Are Required?

**Who does it**: **tapeout, mask, and manufacturing-interface engineers** coordinate with the **foundry**, and the project authorizes the handoff through a formal **tapeout release**.

**Required inputs**:

- The **signed-off final layout (GDSII/OASIS)** from ⑨, together with layer definitions and process information.
- The foundry's **mask and process rules**, the selected tapeout vehicle (full mask set or MPW), the commercial agreement, and the manufacturing schedule.

> The essential mindset is that correctness has already been justified by signoff in ⑨. Tapeout engineering must now guarantee **correct data delivery, correct mask generation, and firm commercial and scheduling execution**. A single delivery or formatting error can waste an entire fabrication run.

---

## 3. Core Tapeout Activities

Each item below explains **what it is, how it is done, and what it looks like for the TPU**.

### 3.1 Tapeout and layout data delivery (GDSII/OASIS)

- **What it is**: package the signed-off layout in a foundry-accepted format—**GDSII or OASIS**—together with layer maps and required documentation, then formally submit it.
- **How it is done**: verify every layer, density requirement, dummy/fill structure, seal ring, and alignment mark. A submission mistake is extremely costly, so the release package is checked repeatedly before delivery.
- *For the TPU*: package and submit the complete 28 nm die layout using the foundry's layer definitions.

### 3.2 Mask data preparation (MDP: fracturing, OPC, and RET)

- **What it is**: layout data cannot be written directly onto a mask. It first passes through **mask data preparation**, including **fracturing** into shapes supported by the mask writer, **optical proximity correction (OPC)**, and **resolution enhancement techniques (RET)** such as phase-shift masks, sub-resolution assist features (SRAFs), and multiple patterning/exposure.
- **How it is done**: optical imaging cannot reproduce arbitrarily small shapes directly, so the mask patterns are deliberately "pre-distorted" until the printed wafer geometry approaches the intended design. OPC and RET become increasingly complex at more advanced nodes.
- *For the TPU*: the 28 nm geometry is OPC-corrected so that transistor and interconnect features print at the intended dimensions on silicon.

### 3.3 Photomask and reticle fabrication

- **What it is**: the processed data is written onto a **mask**—typically a quartz substrate carrying an absorber layer—using an electron-beam or laser writer. A mask set contains **a reticle for each lithographic mask level, and sometimes multiple reticles for a multiply patterned level**, often numbering in the dozens. In modern projection lithography the production object is more precisely a **reticle**: its pattern is commonly written at **4× scale**, then reduced to 1× on the wafer by the scanner's projection optics and exposed one field at a time. The reticle pattern is therefore not a 1:1 copy of the silicon geometry.
- **How it is done**: a reticle is the manufacturing master for its layer. It demands extreme dimensional accuracy, is expensive to produce, and must be inspected and, where possible, repaired after writing.
- *For the TPU*: the complete 28 nm reticle set is manufactured, covering device, contact, via, metal, and other process layers.

### 3.4 Tapeout vehicles: full mask set versus MPW/shuttle

- **What it is**: a **full mask set** is dedicated to one product and is appropriate for production. A **multi-project wafer (MPW), or shuttle run**, shares reticle and wafer area among several projects, spreading the non-recurring engineering cost and making prototypes or low-volume trials more economical.
- **How it is done**: early prototypes and risk-reduction silicon often use an MPW; a product expected to enter meaningful volume generally moves to a dedicated mask set.
- *For the TPU*: production-class silicon would normally use a full mask set, while early experimental silicon could use an MPW if that matched the program strategy. TPU v1's actual prototype vehicle and commercial mask strategy are not public.

### 3.5 NRE and tapeout cost

- **What it is**: tapeout is a major component of non-recurring engineering (**NRE**) cost. At advanced nodes, a mask set can be on the order of US$10 million, in addition to engineering, IP, and foundry service charges; actual pricing varies substantially by node, layer count, mask strategy, supplier, and commercial terms.
- **How it is done**: this cost feeds directly into the business model and break-even analysis introduced in ①. Consequently, **first-silicon success** is enormously valuable: avoiding one re-spin saves both millions of dollars and several months.
- *For the TPU*: mask and fabrication costs would have been material NRE items, but TPU v1's actual costs are not public. Its roughly 15-month path from project start to deployment left little schedule margin for repeated re-spins.

### 3.6 Release, authorization, and the wait for silicon

- **What it is**: the formal **tapeout release** authorizes delivery; the foundry schedules and starts the lot; the team then waits for **first silicon**. Foundry **turnaround time** is commonly measured in weeks to months.
- **How it is done**: the release follows a signed checklist with named accountability. During the wait, the project shifts substantial effort toward software, test-program development, evaluation hardware, and bring-up preparation.
- *For the TPU*: a project following this standard flow would prepare its bring-up environment, evaluation hardware, test program, and software stack while waiting for the first 28 nm wafers. TPU v1's detailed post-tapeout work plan is not public.

---

## 4. Trade-offs That Persist Throughout Tapeout

- **Irreversibility versus schedule**: delaying tapeout may miss the market window, but releasing with unresolved doubts may trigger a re-spin. Signoff in ⑨ exists to make this commitment defensible.
- **Full mask set versus MPW**: low-cost experimentation versus a direct path to production; the right choice depends on project maturity and confidence.
- **The value of first-silicon success**: a successful first pass can save millions of dollars and preserve an entire product-generation window.
- **Zero tolerance for delivery errors**: one error in format, layer mapping, fill, or markers can invalidate a fabrication run.

> The central idea: **Tapeout is the design's rite of passage. Beyond this gate, it is no longer code or layout that can be changed at will; it is a physical commitment about to be written into silicon, backed by millions of dollars.**

---

## 5. How Tapeout Is Executed: Methods and Tools

- **Mask data preparation (MDP)**: fracturing, OPC, and RET tools, typically operated by the foundry or mask shop.
- **Data formats**: GDSII/OASIS for layout, plus layer-mapping and release files.
- **Flow**: signoff release → foundry data submission → MDP → reticle fabrication → wafer start, with commercial and scheduling work proceeding in parallel.
- **Quality controls**: release checklists and final layout checks covering layers, fill, density, seal structures, and alignment marks.

---

## 6. Tapeout Deliverables

- **Final layout data submitted to the foundry**—GDSII/OASIS plus layer mapping and documentation.
- **The complete reticle set**, produced by the mask shop or foundry.
- **Tapeout release records and the committed manufacturing schedule**, proving that fabrication has formally started.

> Tapeout converts the design into a reticle set and a manufacturing order in the foundry's hands. Fabrication in ⑪ uses those artifacts to print the chip onto silicon.

---

## 7. Easily Overlooked but Potentially Fatal Pitfalls

1. **Taping out with unresolved concerns**: if signoff in ⑨ is not genuinely clean, first silicon may contain a bug, costing millions of dollars and months in a re-spin.
2. **Delivery-data errors**: incorrect layer mapping, fill, alignment marks, or density can cause rejection by the foundry or waste an entire run.
3. **Underestimating OPC/RET**: without adequate resolution enhancement at an advanced node, printed geometry can diverge materially from the design.
4. **Reticle defects**: a mask defect is replicated across every exposed field; mask inspection and repair cannot be skipped.
5. **Counting mask cost but not schedule cost**: turnaround can take months. Insufficient schedule margin may close the product window.
6. **Choosing the wrong tapeout vehicle**: committing to a full mask set when the design still needs experimentation is unnecessarily expensive; remaining on MPW after production demand arrives constrains capacity.

---

## 8. Summary and Next Step

**Tapeout means turning the signed-off final layout into a reticle set through mask data preparation and formally releasing it to the foundry. It is the handoff from design to manufacturing, and a multimillion-dollar, effectively irreversible design-freeze milestone.** Its defining truth is that **once this gate is crossed, a change requires a re-spin**. Its most valuable outcome is **first-silicon success—saving both millions of dollars and a product-generation window**. Its least forgiving requirement is **error-free data delivery and mask quality**.

The next step, ⑪, is **fabrication**. Using the reticle set, the fab performs hundreds of lithography, deposition, etch, implantation, cleaning, and planarization operations to **build transistors and metal interconnect layer by layer**. The abstract layout finally becomes a physical circuit.
