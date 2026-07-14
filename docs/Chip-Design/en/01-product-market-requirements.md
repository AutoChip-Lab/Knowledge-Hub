# End-to-End Chip Design Flow · Stage ①: Product / Market Requirements

> The first article in the End-to-End Chip Design Flow series—and the real starting point of the entire program.
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

Stage ① sits at the extreme upstream end of the flow. It decides **whether the product should exist, what should be built, who will buy it, and what outcome makes the investment worthwhile**. It does not draw circuits or write RTL. It frames the business and product problem that every later engineering decision must solve.

This step deserves rigor because a chip program is a large and only partly reversible commitment. At an advanced process node, engineering labor, IP licenses, package development, masks, wafers, validation, and software can require years and very substantial non-recurring engineering (NRE) investment. A team that chooses the wrong product direction may execute every downstream stage perfectly and still deliver a chip that the market does not need.

> **Scope of this series:** the series follows the digital SoC / ASIC implementation path through thirteen numbered stages, with DFT treated as a cross-stage discipline rather than a single step between synthesis and physical design. Analog and mixed-signal design, FPGA product flows, the full software stack, and certification programs proceed as purchased IP or parallel workstreams and are discussed only where they constrain the digital flow. SerDes, PLL, and HBM/DDR PHY blocks are therefore treated as qualified hard IP black boxes rather than designed from transistor level here.

---

## 1. What This Stage Actually Is

In one sentence: **before major engineering spend begins, determine which chip to build, for whom, with what capabilities and economics, and by what market window—then establish an organization-wide target and a formal Go/No-Go decision.**

Three characteristics define the work:

- It is **business-led, not technology-led**. Engineering feasibility is essential, but it is a constraint on the product decision rather than the reason to build the product.
- Its output becomes the **north star for all technical work**. Performance, power, cost, interfaces, schedule, quality, and software-ecosystem targets flow from this stage into the system specification and architecture.
- It is a bet on a market several years in the future. The team must reason about changing workloads, standards, competitors, supply, and customer behavior rather than merely describe today's landscape.

Throughout this chapter, consider a hypothetical **data-center LLM inference accelerator card** as the running example.

---

## 2. Who Owns the Work

This stage is normally led by **product management and product marketing**, with several groups contributing evidence:

- Market intelligence, business development, and sales provide market, customer, pricing, and competitive information.
- Architecture and engineering estimate feasibility, cost, staffing, IP availability, and schedule.
- Finance and operations build the investment, supply, and margin model.
- Lead customers validate use cases, operating points, deployment constraints, and willingness to adopt.
- Software and ecosystem teams evaluate whether the product can be used effectively when the silicon arrives.

The result should not be one person's intuition. It is a negotiated, evidence-based alignment among business, customers, engineering, finance, operations, and software.

---

## 3. Core Content

### 3.1 Market Analysis

- **Market size and growth:** estimate total, serviceable, and obtainable markets (TAM, SAM, and SOM). A large TAM alone is not enough; the company needs a credible path to the segment it can actually serve and win.
- **Target segment:** distinguish data center, mobile, automotive, edge, networking, industrial, and other environments. Each has different power, cost, qualification, lifecycle, and software constraints.
- **Competitive landscape:** compare existing products and published roadmaps across performance, power, area or package, price, total cost of ownership (TCO), software maturity, supply, and time to market.
- **Differentiation:** state why a customer would switch. Examples include better energy efficiency, lower TCO, predictable latency, a workload-specific advantage, simpler deployment, or stronger security and reliability.
- **Market window:** identify when the ecosystem and customer demand will be ready, and when competing products may close the opportunity.

For an LLM inference card, comparison must use representative end-to-end workloads rather than headline TOPS alone. Tokens per second, time to first token, time per output token, supported models, memory capacity, utilization, and software effort all matter.

### 3.2 Customers and Use Cases

- Distinguish the **buyer**, the deployer, and the ultimate user; their incentives are often different.
- Identify one or more **anchor customers** willing to provide detailed requirements, early workloads, evaluation access, or a purchase commitment.
- Characterize concrete workloads: model family, batch size, sequence length, prefill/decode mix, numerical formats, service-level objectives, concurrency, and availability.
- Translate qualitative requests such as “make it faster” into measurable operating points and acceptance conditions.
- Forecast shipment volume by customer, segment, and year. Volume determines whether NRE can be amortized and whether a custom chip is economically rational.

### 3.3 Product Definition

- Define the product boundary: bare die, chiplet, packaged device, accelerator card, module, or complete appliance.
- Separate **must-have**, **should-have**, **could-have**, and explicitly excluded capabilities. This prevents optional features from silently becoming schedule-critical requirements.
- Plan the product family: determine whether one architecture can support higher- and lower-end SKUs through binning, configuration, or modular scaling.
- Establish positioning—premium, mainstream, cost-optimized, or volume-focused—and ensure that capabilities and economics match that position.

For an inference accelerator card, the sellable product may include compute die, HBM, advanced package, board, power delivery, cooling, firmware, driver, compiler, runtime, and management tooling. Defining only the die would miss much of the customer experience and cost.

### 3.4 Requirements That Flow Downstream

Product language must be converted into quantitative targets that the system-specification and architecture teams can refine:

- **Performance:** throughput, latency, utilization, and workload-specific operating points such as tokens/s, TTFT, and TPOT.
- **Power and thermal envelope:** board or package power, cooling method, junction-temperature limits, and energy-efficiency targets. Form factor often establishes a hard ceiling.
- **Cost, price, and margin:** target selling price and gross margin imply an allowable die, package, memory, test, and board cost—and therefore influence die area and process choice.
- **Interfaces and standards:** required PCIe/CXL generation, memory technology, chiplet interface, management interfaces, and protocol-compliance expectations.
- **Software and ecosystem:** supported frameworks, compilers, runtimes, operators, drivers, APIs, and compatibility requirements. For AI hardware, ecosystem readiness can be as decisive as silicon PPA.
- **Reliability, quality, and certification:** mission profile, lifetime, failure-rate targets, data-center reliability, AEC-Q100 or functional-safety requirements where applicable.
- **Physical constraints:** package dimensions, ball count, board envelope, cooling solution, and deployment environment.

These are still product targets. Stage ② will turn them into a complete, unambiguous, and verifiable engineering contract.

### 3.5 Business Case

The business case connects technical ambition to financial reality:

- **NRE:** engineering headcount, EDA, third-party IP, masks, prototype wafers, package development, validation systems, software, and certification.
- **Unit cost:** wafer cost divided by good dies per wafer, plus package, memory, test, board, yield loss, logistics, and support. Larger die area reduces dies per wafer and typically lowers yield.
- **Volume, price, and gross margin:** calculate the shipment volume and time required to recover NRE and reach profitability.
- **ROI and payback period:** compare the proposed program with alternative uses of capital and engineering capacity.
- **Make versus buy:** custom silicon is usually justified only when scale, differentiation, strategic control, or system-level savings exceed the cost and risk of using merchant silicon.

The stage normally ends with an investment or program **gate review**. Passing the gate authorizes the next level of engineering commitment; failing it should stop or reshape the program before the most expensive work begins.

### 3.6 Timing and Roadmap

- Define the latest credible launch date and the customer qualification schedule behind it.
- Confirm that the process node, package technology, manufacturing capacity, memory supply, and required IP will be mature and available in that window.
- Build a multi-generation roadmap rather than treating the chip as a one-off product. Plan compatible derivatives and the next architecture where possible.
- Reconcile schedule feasibility with the market window. A technically excellent chip that arrives after customers have standardized on another platform may have little value.

### 3.7 Risk

Maintain an explicit risk register covering:

- **Market risk:** demand, pricing, or workload assumptions may change before production.
- **Technical risk:** required PPA, interfaces, package, or software may not be achievable on schedule.
- **Competitive risk:** competitors may change price, performance, or generation cadence.
- **Supply risk:** foundry allocation, advanced packaging, HBM, substrates, or critical IP may be unavailable.
- **Customer risk:** an anchor customer's stated interest may not become a purchase order.
- **Execution risk:** the organization may lack the staffing, expertise, verification capacity, or program discipline required.

Every high-impact risk needs an owner, an early evidence milestone, a mitigation, and a fallback—not merely a color on a slide.

### 3.8 Constraints

Capture non-negotiable boundaries early:

- Budget, staffing, schedule, and reusable internal IP.
- Foundry relationship, process-node access, packaging ecosystem, and manufacturing capacity.
- Export controls, regulatory constraints, IP-license terms, and geographic restrictions.
- Required protocol, safety, security, environmental, and quality certifications.
- Existing software compatibility and customer deployment infrastructure.

---

## 4. Key Trade-offs and Mindset

- **Ambition versus feasibility:** targets must be aggressive enough to win and realistic enough to build, validate, manufacture, and ship on time.
- **Market pull over technology push:** a technically elegant idea is not a product unless a customer has a reason to buy it.
- **Leverage of early numbers:** a six-month slip or a 20% power miss can erase an entire generation's advantage. A few targets set here drive thousands of engineer-months downstream.
- **Total-cost thinking:** include NRE, software, ecosystem, customer support, certification, packaging, test, and supply risk—not only die cost.
- **Evidence over optimism:** distinguish measured customer data and competitive benchmarks from assumptions, and assign plans to retire the most important assumptions early.

---

## 5. Deliverables

- **Market Requirements Document (MRD):** market, customer, competitive, and timing evidence.
- **Product Requirements Document (PRD):** product scope, use cases, priorities, and product-level requirements.
- **Business case / investment proposal:** volume, price, cost, margin, ROI, break-even point, cash needs, and major risks.
- **Target Specification:** the north-star set of function, performance, power, area/cost, interfaces, software, quality, and schedule targets passed to system engineering and architecture.
- **Roadmap and risk register:** generation plan, key dependencies, owners, mitigations, and evidence milestones.
- **Formal Go/No-Go decision:** an accountable gate with stated conditions and unresolved assumptions.

---

## 6. Commonly Missed but Critical Failure Modes

1. **Technology-led rather than market-led development:** building an impressive capability without a paying use case.
2. **Underestimating software and ecosystem work:** especially for AI silicon, weak compiler, runtime, framework, or operator support can make strong hardware unusable.
3. **Missing the market window:** late delivery can eliminate the product's differentiation even if the silicon is excellent.
4. **Gold-plating:** allowing “nice-to-have” features to consume area, power, validation effort, and schedule.
5. **Counting only die cost:** ignoring NRE, software, package, test, support, and certification produces a false business case.
6. **Proceeding without an anchor customer:** relying entirely on market forecasts greatly increases requirement and adoption risk.
7. **Ignoring the product family:** a single fixed SKU may not amortize the platform investment or address multiple price points.
8. **Separating targets from feasibility:** product targets set without engineering feedback may be physically, economically, or temporally impossible.

---

## 7. Summary and Next Stage

**Product / Market Requirements determines what chip to build, for whom, with what value proposition, economics, and launch window before the organization commits major capital.** Its central outputs are an aligned Target Specification and a formal Go/No-Go decision. This is the true business-driven start of the chip program.

Stage ②, **System Specification**, converts those product targets into an engineering contract: exact functionality, interfaces, operating conditions, quantitative performance and power requirements, and objective acceptance criteria. It is the bridge from product intent to architecture.
