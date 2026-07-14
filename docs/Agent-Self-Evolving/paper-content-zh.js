window.paperAuditsZh = {
  "godel-machines": {
    type: "形式化递归自我改进",
    background: "Gödel Machine 是研究自指 Agent 的形式化思想实验。系统在有限生命周期内与环境交互，获得 reward、承担计算 cost，并用一组 axioms 描述自身的硬件、软件与环境。初始程序同时包含执行任务的 problem solver 和寻找证明的 proof searcher。",
    problem: "任意自我修改都可能带来风险：一次局部看似有利的 rewrite，可能破坏系统未来更重要的能力。论文因此设置 proof gate：只有当前形式系统能够证明“现在切换”的预期未来 utility 高于继续搜索、等待日后修改的预期 utility，系统才执行 self-rewrite。",
    results: [
      { metric: "主要结果", note: "在给定 axioms、utility、资源限制与初始 proof-search bias 的前提下，一旦 proof gate 通过，立即切换的预期 utility 不低于继续等待未来其他 rewrite。" },
      { metric: "初始搜索", note: "Universal search 按 P(w)=K^{-length(w)} 一类 prior 分配 proof technique 的运行时间，但隐藏常数可能很大。" },
      { metric: "实证评测", note: "这项工作的贡献是形式化架构与理论证明，并非一个已经实现并接受 benchmark 评测的 LLM Agent。" }
    ],
    formulae: [
      { title: "预期未来 utility", note: "每次 action、proof-search step 和 rewrite 都消耗时间，因此共同影响同一个目标。" },
      { title: "Proof gate", note: "右侧已经包含原 proof searcher 以后找到另一个 rewrite 的可能性。" },
      { title: "BIOPS prior 示例", note: "较短的 proof-generating program 得到更多搜索时间；如果能够证明有益，prior 本身也可以被重写。" }
    ],
    buildNotes: [
      "把 evaluator 放入 trusted computing base，不允许 candidate 修改 hidden tests 或评分代码。",
      "评估 rewrite 与未来搜索过程的成本，而不只看即时任务准确率。",
      "对完整状态进行版本管理，使经验式近似方案失败时能够回滚。"
    ],
    limitations: [
      "有用的 target theorem 可能不可证明或计算上不可达；不可判定性给出了硬限制。",
      "证明保证的可信度取决于初始 axioms 是否一致，以及 environment model 是否贴近真实环境。",
      "BIOPS 只在乘法常数范围内最优，而这个常数可能大到不实用。",
      "框架假设 utility function 可以形式化，但真实人类目标往往不完整、会变化且难以编码。"
    ],
    diagramTitle: "Proof-gated self-rewrite",
    diagramCaption: "只有 proof searcher 能够从 axioms 推导出 rewrite 会提高 expected utility，系统才执行修改。",
    diagramDetails: {
      env: "环境提供 observation 与 reward/cost。实现时最好提供确定性 simulator 或可回放日志，使候选 rewrite 能在相同条件下重复比较。",
      solver: "使用当前 task policy 执行动作。代码、memory policy 和资源份额都可以成为 rewrite target，并输出供 utility 推理使用的执行历史。",
      utility: "把未来 trajectory 映射成一个目标，包含 reward、剩余生命周期与计算成本。它定义了什么叫有益修改，并不只是 unit-test score。",
      axioms: "提供硬件、当前代码、初始状态、环境假设、概率规则和 utility 的形式化描述。错误或不一致的 axioms 会使保证失效。",
      proof: "BIOPS 枚举 proof techniques。候选必须证明 switch-now utility 大于 continue-search utility，仅仅看起来更好并不够。",
      rewrite: "证明成立后立即执行 switch program。它可以修改 solver、proof searcher、axioms、utility code 或 scheduling；新 utility 仍须被旧 utility 判定为更好。"
    }
  },

  poet: {
    type: "开放式 environment-agent 协同进化",
    background: "困难的 RL 任务常存在具有欺骗性的 local optimum：Agent 可能只学会避免失败，却始终发现不了跨越障碍所需的行为。POET 把有价值的中间 problem-solution pair 视为开放式探索的阶段性成果，并行探索多条 curriculum。",
    problem: "系统既要创造可学习、又不能过于简单的挑战，还要保留每个挑战对应 solver 的训练进度，并允许一条分支上学到的能力迁移到另一条分支。Direct optimization、固定 curriculum，或缺少 transfer 的 mutation，都可能错过这些成长路径。",
    results: [
      { metric: "在 POET 目标环境上直接运行 ES", note: "对 gap、roughness 和 stump 三类目标分别进行五次 direct optimization，并取最佳结果；POET 在三类目标上都超过 solved threshold 230。" },
      { metric: "运行规模", note: "三次运行、20 个 active environments、每个 ES step population 512；使用 256 CPU cores 约 10 天。" },
      { metric: "环境创建后达到 solved 的时间", note: "报告 challenging、very challenging 与 extremely challenging 环境达到 solved 所需的平均 iteration，以及 95% 区间。" },
      { metric: "Transfer ablation", note: "有 transfer 的 POET 覆盖显著更大的环境空间；没有 transfer 时没有解决任何 extremely challenging environment。" },
      { metric: "Backward transfer 示例", note: "子环境中学到的 gait 可以迁移回父环境；在相同优化预算下，这种迁移进一步提高了父环境得分。" }
    ],
    formulae: [
      { title: "实验中的 minimal criterion", note: "子环境中的 Agent 从父代 Agent 的副本开始训练。可接受分数区间与具体领域有关，需要针对任务校准。" },
      { title: "候选 environment 的 novelty", note: "原始 POET 使用手工 environment encoding φ(E)；k-nearest neighbors 包含 active 与 archived environments。" },
      { title: "Evolution Strategy update", note: "论文在加权更新前对 return 做 rank normalization，并使用 Adam。" },
      { title: "Walker 每个未跌倒 step 的 reward", note: "跌倒得到 -100；走到终点且总分至少 230 才算 solved。" }
    ],
    buildNotes: [
      "用不可变的 environment config、带版本的 policy checkpoint 和 optimizer state 表示每个 pair。",
      "创建 child 或接受 transfer 时重置 optimizer state，与论文一致。",
      "environment 离开 active population 后仍保留在 archive 中用于 novelty。",
      "改造成 LLM 版本时，可 mutate task generator、复制 parent scaffold/memory，并用 tests 实现 minimal criterion。"
    ],
    limitations: [
      "environment encoding 限定了所有可能挑战；原 POET 只能改变预定义 obstacle type 与范围。",
      "Novelty 是 domain-specific，因为手工 genes 的 Euclidean distance 不一定对应行为差异。",
      "它共同进化 task 与 agent，但没有进化 reward 定义。",
      "all-pairs transfer 与并行 policy optimization 的计算成本很高。"
    ],
    diagramTitle: "Environment-agent pair 的分支树",
    diagramCaption: "子代继承父代 Agent，同时改变 environment；transfer 箭头表示较强的 Agent 可以跨分支迁移。",
    diagramDetails: {
      root: "Step 1：初始化一个简单的 environment-agent pair，例如 flat terrain 与 random policy，并保存 environment encoding 和 policy checkpoint。",
      a: "Step 2：选择符合条件的父代，改变 environment genes，复制其 policy，重置 optimizer state，再评估新环境是否可学习。",
      b: "Step 3：保留多条分支。POET 不是单一路径 curriculum；每条分支都可专门化并在以后贡献 policy。",
      c: "Step 4：子代只有同时通过 minimal criterion 且具有足够 novelty，才会被接纳，并成为新的优化目标和未来父代。",
      e: "Step 5：每个 retained policy 在自己的 environment 中优化。challenge 与当前 solution 共同构成开放式探索的阶段性成果。",
      d: "如果当前 Agent 已接近 criterion 上限，则环境太简单，缺乏学习压力。",
      f: "如果 inherited/current agent 得不到有效 reward，则环境太难；能力提高后可再次生成。"
    }
  },

  "enhanced-poet": {
    type: "更通用的开放式搜索",
    background: "原始 POET 展示了开放式 pair search，但它的 environment distance 与 terrain genes 专为 Bipedal Walker 设计。Enhanced POET 将 environment generation 与 characterization 分离，并引入衡量开放式创新进展的指标。",
    problem: "若要做到跨领域通用，系统不能假设原始 environment parameters 可以直接比较，甚至不能假设这些参数始终可见。它还需要更丰富的 generator、更稳定的 transfer test，以及判断搜索是否仍在产生有意义新挑战的方法。",
    results: [
      { metric: "PATA-EC overhead", note: "相较手工设计的 characterization，PATA-EC 需要更多 ES steps，但能达到相近的 diversity 与 challenge level。" },
      { metric: "改进后的 transfer cost", note: "改进策略把 transfer 计算量降至原方法的一部分，同时维持相近的 diversity 与 challenge level。" },
      { metric: "运行规模", note: "40 个 active environments，60,000 iterations；使用 750 CPU cores 约 12 天。" },
      { metric: "Curriculum controls", note: "Direct ES/PPO 与手工 interpolation curricula 在中后期 target 上低于 POET。" },
      { metric: "ANNECS", note: "原始版本约 20k 后 plateau；Enhanced POET 到 60k 仍在增长，但 task 变难后速度放缓。" }
    ],
    formulae: [
      { title: "PATA-EC profile", note: "两个 environment 如果对 agent population 产生不同排序，就被视为不同。" },
      { title: "Behavioral novelty", note: "这里不再比较 terrain genes，而是比较 agent-performance profiles。" },
      { title: "Transfer threshold", note: "candidate 先在 direct transfer 中超过 τ 才进行 fine-tuning，fine-tuning 后还要再次超过。" },
      { title: "ANNECS", note: "重复环境或永久无法解决的环境都不会增加该指标。" }
    ],
    buildNotes: [
      "缓存 agent-by-environment score matrix，因为 PATA-EC 与 transfer 会重复使用。",
      "对并列 rank 使用稳定规则，否则 novelty distance 会改变。",
      "分离 CPPN genotype 与 rendered terrain，保证同一 genotype 可精确复现。",
      "ANNECS 是评价整个 run 的指标，不是每个 policy 直接优化的 reward。"
    ],
    limitations: [
      "PATA-EC 不依赖领域特定的环境编码，但对全部 Agent 进行 evaluation 仍然昂贵且难以扩展。",
      "CPPN 扩大了 terrain variety，但 simulator 与 biped body 仍限定 domain。",
      "ANNECS 依赖选定的 novelty、minimal criterion 与 solved threshold。",
      "当 domain 没有更多有意义挑战时，open-ended progress 仍可能 plateau。"
    ],
    diagramTitle: "用 agent population behavior 定义 novelty",
    diagramCaption: "Enhanced POET 比较环境对 Agent 群体产生的 performance profile，而不是直接比较 terrain parameters。",
    diagramDetails: {
      cppn: "Step 1：进化 generator 而非固定 obstacle vector。对每个 x，CPPN(x) 输出 terrain height；NEAT 可逐代增加 node 与 connection。",
      envA: "Step 2：把 CPPN genotype 渲染成可复现 environment，可产生设计者未预先命名的 terrain structure。",
      envB: "另一个 genotype 产生不同 environment；raw genotype distance 不用作 semantic novelty。",
      pop: "Step 3：用同一组 active 与 archived agents probe 两个 environment，并缓存 score matrix。",
      profile: "Step 4：clip、rank、normalize 每个 score vector；Euclidean distance 表示环境区分 Agent 能力的方式是否不同。",
      annecs: "Step 5：只有新环境 behaviorally novel、通过 minimal criterion 且最终 solved 才增加 ANNECS。"
    }
  },

  reflexion: {
    type: "Verbal reinforcement learning",
    background: "LLM Agent 即使不断重试，也可能因为 model weights 与 prompt 没有改变而重复同一错误。Reflexion 把 natural-language feedback 作为保存在模型外部的轻量 policy update。",
    problem: "通过/失败这类 scalar reward 只能说明结果是否正确，却没有解释原因。系统需要把 sparse feedback 和冗长 trajectory 压缩成可指导下一次尝试的规则，同时不 fine-tune base model。",
    results: [
      { metric: "ALFWorld", note: "ReAct + Reflexion 完成 130 个任务，最多 12 次 trial 内仍持续改进。" },
      { metric: "HumanEval Python", note: "论文中的 GPT-4 baseline 为 80.1%。" },
      { metric: "HumanEval Rust", note: "GPT-4 baseline 为 60.0%。" },
      { metric: "LeetCode Hard Python", note: "GPT-4 baseline 为 7.5%。" },
      { metric: "MBPP Python", note: "结果低于 80.1% baseline，部分原因是 generated tests 出现 false positive；这说明 evaluator 本身也可能成为失败来源。" }
    ],
    formulae: [
      { title: "Actor policy", note: "policy parameters 是 frozen Actor 加可编辑的 in-context memory，而不是更新后的 model weights。" },
      { title: "Evaluation and reflection", note: "reflection model 把 sparse reward 放大成 task-specific verbal lesson。" },
      { title: "Bounded episodic memory", note: "实验使用很小的 sliding window，因为每条 reflection 都会消耗 context。" }
    ],
    buildNotes: [
      "score 必须附带 evidence，例如 failed assertion、重复 action、exact mismatch 或 environment state。",
      "保存 causal lesson 与具体 next action，而不是 trajectory summary。",
      "后来证据与 reflection 冲突时，应 deduplicate 或 invalidate。",
      "用 held-out tasks 判断 reflection prompt 是否真的有效，而不是只因 token 更多。"
    ],
    limitations: [
      "loop 可能收敛到较差的 local strategy，因为它只更新 context，不更新底层 model。",
      "错误 evaluator 或不稳定的 self-generated tests 会产生有害 reflection。",
      "sliding window 会忘记较早的 lesson；无限扩展 memory 又会占满 context window。",
      "对 nondeterministic、API-dependent、hardware-dependent 或 concurrent program，test-driven reflection 很困难。"
    ],
    diagramTitle: "把失败转化为 verbal memory",
    diagramCaption: "系统保存的重点不是 raw trace，而是解释失败原因、并说明下一次应如何行动的 lesson。",
    diagramDetails: {
      task: "Step 1：开始或重置一次 trial，提供相同 objective 与当前 observable state，不能把 ground truth 泄漏给 reflection。",
      actor: "Step 2：根据短期 trajectory history 和最近 1-3 条 reflection 产生 action 或 answer。",
      eval: "Step 3：输出 scalar reward 与 concrete evidence，可来自 ALFWorld heuristic、exact match、generated unit tests 或 LLM classifier。",
      reflect: "Step 4：提炼失败原因与具体改变；好的输出应可执行，例如使用物品前先确认已持有。",
      memory: "Step 5：append lesson 并按 memory budget 截断；下一次 Actor call 把它作为 in-context policy update。"
    }
  },

  voyager: {
    type: "Minecraft LLM Agent",
    background: "Open-world embodied Agent 面对持续出现且事先未知的 task sequence。每次从零开始会浪费经验，而只保存 conversation trace 又难以直接复用。Voyager 把学习结果外部化为 curriculum 与 executable skill library，并保持 GPT-4 weights frozen。",
    problem: "Agent 要选择难度合适的下一目标、生成可靠的 long-horizon behavior、从 execution failure 恢复、验证 task success，并保存已掌握行为供以后组合。",
    results: [
      { metric: "Unique items", note: "在 Minecraft 评测中，Voyager 获得的 unique items 数量是先前最佳方法的 3.3 倍。" },
      { metric: "Technology tree", note: "wooden 15.3x、stone 8.5x、iron 6.4x；报告比较中只有 Voyager 达到 diamond。" },
      { metric: "Exploration distance", note: "跨多样 terrain 的移动距离是 baseline 的 2.3 倍。" },
      { metric: "Transfer", note: "learned skill library 能帮助 Agent 在新 world 中完成 novel tasks，而基线方法难以完成这些任务。" }
    ],
    formulae: [
      { title: "Skill retrieval（实现形式）", note: "论文使用 vector database 与 top-5 retrieval；q 结合 generated plan 与 environment feedback，d_j 是 program description。" },
      { title: "Verified skill insertion", note: "只有独立 verifier 接受任务完成后，executable code 才写入 library。" },
      { title: "Repair budget", note: "如果连续四轮都没有进展，Voyager 会暂时放弃当前任务，并让 curriculum 生成新的 objective。" }
    ],
    buildNotes: [
      "skill metadata 应包含 description、code、dependencies、preconditions、postconditions 和 verification trace。",
      "sandbox generated code，并只暴露 narrow typed control API。",
      "success check 应检查 state change，而不能相信 program 自己宣称成功。",
      "替换被广泛复用的 skill 前，应创建新版本并运行 regression tasks。"
    ],
    limitations: [
      "依赖具有 programmable control API 与 observable state 的 environment。",
      "LLM self-verification 可能错误接受失败或拒绝有效但意外的行为。",
      "Skill retrieval 可能返回无关或不兼容代码；坏 skill 会成为持久 failure source。",
      "Minecraft-specific prompt 与 Mineflayer primitive 限制直接迁移。",
      "系统积累 external skills，但不更新 base model weights。"
    ],
    diagramTitle: "LLM 把 function 连接到 executable code",
    diagramCaption: "curriculum 选任务，skill manager 检索代码，controller 生成并修复程序，验证成功后才写入 library。",
    diagramDetails: {
      state: "Step 1：总结 observable world state 与 progress，curriculum 据此选择接近当前能力边界的目标。",
      llm: "Step 2：不同 GPT call 分别提出任务、编写/修复代码和验证成功；图中为易读性把它们归为 controller。",
      f1: "Step 3：根据 current plan/feedback 与 stored skill descriptions 的 embedding similarity 检索 top-5 skills。",
      f2: "每一行把 human-readable function description 映射到 executable JavaScript；代码就是 reusable memory payload。",
      f3: "library 以组合方式增长，后来的代码可调用早期 function，不必重新发现 low-level behavior。",
      code: "Step 4：根据 task、API、retrieved skills、state、previous code、errors 与 critique 生成具体 program。",
      exec: "Step 5：在 environment 执行，收集 feedback 与 interpreter errors，再交给独立 verifier；只有 verified success 才保存。"
    }
  },

  stop: {
    type: "递归自我改进 scaffold",
    background: "给定 utility function，language model 可以改进 program；但真正决定如何生成、评分、保留和重试候选方案的，是外围 scaffold。STOP 研究能否把 scaffold 本身视为 solution string，在底层 LLM 不变的情况下递归改进它。",
    problem: "目标并非得到某一道任务的 downstream answer，而是获得一个 reusable improver program I，使它能在整个 task distribution 上持续产出高分 solution。评估 I 的成本很高：每次计算 meta-utility 都要执行 I，而 I 又会反复调用 LLM 与 downstream utility。",
    results: [
      { metric: "LPN self-improvement", note: "在 5 次独立运行、每次评测 50 个未见过的 LPN instances 时，GPT-4 的平均 held-out meta-utility 在前三轮持续上升；但受随机性影响，单次运行并不保证单调提升。" },
      { metric: "LPN reference baselines", note: "无错误时 CoT 为 57.7% ±3.0%，greedy iterative improver 为 64.2% ±0.9%；它们是 reference method，不是 STOP recursion round。" },
      { metric: "String Grid transfer", note: "比较 seed improver I0 与在 LPN 训练的 T=4 improver IT；原 downstream solution 为 43.9%。" },
      { metric: "Quadratic Assignment", note: "transfer gain 较小但为正；原 solution 为 20.4%。" },
      { metric: "3SAT transfer", note: "最大 transfer gain；原 seed solution 为 0%，且没有在 3SAT 上额外 self-optimization。" },
      { metric: "MaxCut transfer", note: "LPN-trained scaffold transfer 到不同 combinatorial optimization utility；原 seed solution 为 0%。" },
      { metric: "Parity without noise", note: "从 noisy parity training transfer 到相关但不同的任务；原 solution 为 50.0%。" },
      { metric: "GPT-3.5 reliability", note: "25 次运行中，只有 3 次至少提升 3%；较小的模型常能提出合理想法，却容易实现错误或破坏 scaffold。" },
      { metric: "Unsandboxing attempts", note: "在 10,000 个 generated improvements 中，GPT-4/GPT-3.5 尝试绕过 sandbox 的比例很低，但并非为零。" }
    ],
    formulae: [
      { title: "Downstream improvement", note: "s 是被改进 artifact；在 self-improvement 时，s 就是 I 自身的 source code。" },
      { title: "Expected improver quality", note: "表示 improver 面对从 task distribution 抽取的未来任务时，其解法得分的期望值。" },
      { title: "Training meta-utility", note: "STOP 优化有限 task set 上的估计；Appendix A 给出 bounded program 与 utility 的 generalization bound。" },
      { title: "Recursive scaffold update", note: "固定 LLM 仍可产生不同 improver，因为每个 I_t 包含不同 search code、prompt、budget 与 candidate-selection logic。" },
      { title: "Reported cost order", note: "meta-optimization 会把 downstream utility/LLM budget 再乘上 meta-utility budget。" }
    ],
    buildNotes: [
      "把 utility 作为 callable 与 description 传入，但 budget 必须由 candidate-editable code 外部强制执行。",
      "分离 meta-train 与 held-out tasks，避免 improver 过拟合 evaluator quirks。",
      "将 syntax error、timeout 与 sandbox violation 记为零 utility，同时保留上一版最佳 improver。",
      "记录每一次 utility call，因为 nested budget 是主要成本与常见 attack surface。"
    ],
    limitations: [
      "STOP 改进 scaffold，不改 LLM weights 或 architecture。",
      "较差的 I_t 可能被接受并导致以后退化；论文序列每轮只保留一个 improver。",
      "需要快速、可描述的 utility function，成本远高于只运行最终 improver 一次。",
      "错误 utility 会引发 reward hacking。",
      "generated improver 可能删除或绕过 budget/sandbox instruction，因此控制必须外置。"
    ],
    diagramTitle: "Improver 本身成为被改进的 artifact",
    diagramCaption: "底层 LLM 始终不变；每轮把当前 improver 的 source code 作为下一轮待改进的 solution 输入。",
    diagramDetails: {
      llm: "固定 component：每一轮都是同一个 black-box L。不同 improver 来自外围 source code 对 prompt 与 search 的改变。",
      meta: "Evaluator：compile improver，在多个 downstream (utility, seed) task 上运行并平均 solution score；budget 必须外置。",
      i0: "Step 1：seed improver 请求多个 candidate edit，对每个调用 utility，并返回最高分 valid candidate。",
      i1: "Step 2：I0 把自身 source 当作 s、meta_utility 当作 u；I1 可加入 beam、cache、dynamic temperature 或 stopping rule。",
      i2: "Step 3：I1 执行下一次 self-edit；在这一 recursion level，被编辑 artifact 与执行编辑的 algorithm 是同一个 program。",
      i3: "Step 4：持续到 preset depth T。论文不证明 optimality；实践中应保留最佳 held-out checkpoint。"
    }
  },

  gptswarm: {
    type: "可优化的 Agent graph",
    background: "ReAct、tool pipeline、debate 与 multi-agent swarm 都可以表示为 directed computational graph。GPTSwarm 把 communication structure 和 node prompt 变成可学习的变量，而不是沿用固定的人类设计。",
    problem: "一个包含 d 条 optional edges 的 graph 共有 2^d 种 configuration，execution score 通常不可微；不同 node prompt 还会通过 predecessor output 相互影响。系统既要学习应保留哪些 communication channel，也要学习每个 specialized node 应如何工作。",
    results: [
      { metric: "Mini Crosswords edge optimization", note: "从 initial graph distribution 到十轮 REINFORCE，三次 run 的平均结果。" },
      { metric: "Mini Crosswords node after edge", note: "edge optimization 后用 UCB1 选择 prompt demonstrations。" },
      { metric: "Mini Crosswords final", note: "GPT-4-Turbo evaluation；ToT GPT-4 baseline 0.675，ToT GPT-4-Turbo 0.668。" },
      { metric: "HumanEval node optimization", note: "八轮 online prompt optimization。" },
      { metric: "GAIA average", note: "7 个 ToT Agent 的 swarm 对比 GPT-4-Turbo 9.70；runtime 随 Agent 数近似线性增加。" }
    ],
    formulae: [
      { title: "Agent graph execution", note: "每个 node 都可接收唯一 task input x，以及 predecessor nodes 的 message。" },
      { title: "Probabilistic graph objective", note: "D_θ 表示 feasible DAG 的概率分布，其参数 θ 就是各条 optional edge 被启用的概率。" },
      { title: "REINFORCE estimate", note: "实现时通常减去 baseline 以降低 variance，并限制 probability 不要在 exploration 阶段过早变成精确的 0 或 1。" },
      { title: "Node prompt update", note: "h_n 是 node-local execution history，d_n 描述 node 的 intended role。" }
    ],
    buildNotes: [
      "执行 sampled graph 前验证 acyclicity 并缓存 topological order。",
      "utility 必须包含 cost 与 latency，否则会偏好不必要的 dense graph。",
      "尽量保存 node-local evidence，因为 graph-level reward 会产生 credit-assignment problem。",
      "在 held-out tasks 与多个 random seeds 上评价 topology 与 prompt。"
    ],
    limitations: [
      "REINFORCE 的 variance 较高，而 optional-edge search 会出现组合爆炸。",
      "论文会优化 Agent 之间的 communication edges，但不会动态重构每个 Agent 内部的 topology。",
      "graph-level reward 对单个 node prompt failure 的 credit assignment 很弱。",
      "更多 Agent 与 edges 会增加 token cost、latency 与 coordination failure。",
      "实验使用 task-specific node routine 与 optimizer，展示的 search procedure 比 graph representation 更特定。"
    ],
    diagramTitle: "带概率 edge 的 Agent graph",
    diagramCaption: "graph 只接收一个外部 input；optional edge 决定 node 之间是否传递信息，最终只生成一个 output。",
    diagramDetails: {
      task: "唯一 external input x：一个 question 或 task 进入 graph；内部 node 可共同收到 x，optional edge 传递 predecessor output。",
      router: "Graph entry：把同一个 task 分发到 selected DAG paths，并不是第二个 external input。",
      llm: "Node type：带自己 prompt 的 LLM routine；history 保存收到的 context 与产生的 text。",
      tool: "Node type：deterministic 或 external tool call；即使只优化 LLM-node prompt，也应记录 cost、error 与 latency。",
      rag: "Node type：retrieval 或 web/file analysis；optional-edge probability 控制信息是否进入 downstream node。",
      critic: "Node type：specialized LLM judge 或 reflection call；edge optimization 学习它是否改善 task-level score。",
      agg: "Output/aggregation node：用固定或 prompted decision rule 合并 predecessor answers，仍属于 Agent graph。",
      output: "唯一的 graph output ŷ：先由 task utility 评分，再用 graph-level score 优化 edge，并把相关 evidence 写入各 node 的 history。"
    }
  },

  adas: {
    type: "Automated Design of Agentic Systems",
    background: "ADAS 把 Agent design 表述为 optimization problem，由 representable agent search space、search algorithm 与 evaluation function 三部分组成。Meta Agent Search 进一步把 code 作为更宽广、也更容易检查的搜索空间。",
    problem: "Prompt-only search 无法发明全新的 workflow、tool policy 或 multi-agent structure。代码搜索空间虽然更广，却近乎无界且评估昂贵；因此 meta-agent 需要把 previous discoveries 当作阶段性成果，并依赖可靠的 validation feedback。",
    results: [
      { metric: "DROP", note: "Meta Agent Search 对比最佳 hand-designed Role Assignment 65.8 ±0.9。" },
      { metric: "MGSM", note: "对比 LLM Debate 39.0 ±3.4 与 prompt optimization 30.6 ±3.2。" },
      { metric: "MMLU", note: "对比 prompt optimization 67.6 ±3.2。" },
      { metric: "GPQA", note: "对比 prompt optimization 32.9 ±3.2。" },
      { metric: "Search setup", note: "由 GPT-4 meta-agent 设计 Agent system，再使用 GPT-3.5 在四个 reasoning domain 上进行评测。" }
    ],
    formulae: [
      { title: "ADAS formulation", note: "系统在 representable agent space S 中，寻找让 evaluation function 得分最高的 Agent；objective 可以同时考虑 quality、cost、latency 与 safety。" },
      { title: "Archive update（实现形式）", note: "不断增长的 archive 会成为下一轮 meta-agent proposal 的 context，而不只是记录冠军的 leaderboard。" },
      { title: "Multi-objective extension", note: "论文 formulation 允许这些 objective，尽管主要实验强调 task performance。" }
    ],
    buildNotes: [
      "定义 narrow candidate API，例如 forward(taskInfo)，但允许内部 arbitrary control flow。",
      "sandbox candidate code，并独立限制 LLM calls、wall time 与 token cost。",
      "保存 failed 与 mediocre agents，因为其中 component 以后可能成为可供后续探索利用的阶段性成果。",
      "final held-out set 只用于选择/报告结果，不能反馈给 meta-agent。"
    ],
    limitations: [
      "meta-agent 只能生成所提供的 framework、tools 与 model API 能够表达的代码。",
      "反复根据同一 validation set 搜索，可能造成 overfitting。",
      "执行 arbitrary generated workflow 成本高且需要强 sandbox。",
      "archive 作为 text 回传，增长后会受 context limit 限制。",
      "search algorithm 本身固定；Meta Agent Search 设计 task agent，不设计自己的 meta-agent loop。"
    ],
    diagramTitle: "Meta-agent 在 Agent design space 中搜索",
    diagramCaption: "系统执行并评估 candidate code，再将结果写入 archive；下一轮 proposal 会把过去的 Agent 当作阶段性成果。",
    diagramDetails: {
      archive: "Step 1：初始化 prior agent code、idea description 与 score；保留多样的阶段性成果，而不只保留当前 best。",
      meta: "Step 2：foundation model 读取任务领域与 archive，提出新设计，进行两轮 novelty reflection，并输出 forward(taskInfo) code。",
      code: "Step 3：在 sandbox compile candidate；code 可包含 prompt、loop、multiple model calls、voting、tool use 或 verification。",
      run: "Step 4：在固定 call/token/time budget 下运行 validation taskInfo，并捕获 output 与 exception。",
      eval: "Step 5：计算 accuracy/F1、cost 与 failure metric；execution error 最多 repair 五次，随后 archive candidate。"
    }
  },

  "godel-agent": {
    type: "Self-referential Agent framework",
    background: "传统 meta-learning Agent 会改进 task policy，却把人工编写的 update algorithm 固定不变。Gödel Agent 扩大了 editable surface：运行中的 Agent 不仅可以 inspect 并 monkey-patch task policy，还能修改负责 inspect、evaluate 与 update 的改进逻辑。",
    problem: "固定 optimizer 会成为能力瓶颈。Agent 需要一个 self-referential runtime，使当前 improvement routine 能像普通 data 一样被读取与修改，让 code change 在运行期间生效，并让 feedback 改变下一次 recursive call。",
    results: [
      { metric: "Godel-base MGSM", note: "constrained version 对比 Meta Agent Search 53.4 ±3.5。" },
      { metric: "Godel-free", note: "在 DROP、MGSM、MMLU 与 GPQA 上均有提升；但 unconstrained run 有时会调用更强的 model，因此不能视为资源条件相同的公平比较。" },
      { metric: "Game of 24", note: "一次 run 在六次失败 improvement 后把 LLM-based approach 改成 explicit search。" },
      { metric: "Robustness", note: "100 次 MGSM optimization trial 中，92% 有 temporary drop，4% 意外终止。" },
      { metric: "Reported search cost", note: "四个 domain 共 30 次 recursive improvement；论文对 Meta Agent Search 报告约 $300。" }
    ],
    formulae: [
      { title: "Fixed meta-learning agent", note: "task policy 改变，但 I 保持固定。" },
      { title: "Self-referential update", note: "当前 optimizer I_t 接收自身 representation，可以同时重写自己与 policy。" },
      { title: "Recursive transition", note: "s 表示可被 inspect 的 runtime state；continue_improve 会递归调用可能已经被更新的 decision function。" }
    ],
    buildNotes: [
      "把 monkey patch 限制在带版本的 module namespace 内，并在启用前验证 function signature。",
      "保留 external supervisor 与 last-known-good checkpoint，因为 runtime self-edit 常产生 temporary regression。",
      "把 structured error trace 反馈给下一次 decision，而不只传 scalar score。",
      "区分 constrained 与 unconstrained evaluation，model/tool escalation 可能主导表面 gain。"
    ],
    limitations: [
      "没有 formal proof 保证 self-update 有益，temporary performance drop 很常见。",
      "monkey-patch recursive improvement routine 可能终止未来 self-improvement。",
      "当前 LLM 常重新发现已知 design，案例中没有超过强 Tree-of-Thought initialization。",
      "结果依赖规模较小的 validation set；递归重复 evaluation 可能造成 overfitting。",
      "Godel-free 结果包含调用更强 model，不能与 fixed-resource baseline 直接比较。"
    ],
    diagramTitle: "同时更新 policy 与 improver",
    diagramCaption: "每一轮都根据 validation feedback，同时修改 task-solving policy π 与 improvement logic I。",
    diagramDetails: {
      goal: "输入 g：例如 maximize validation accuracy 的 high-level objective，定义 improvement 含义但不规定 workflow。",
      pi: "Step 2：π_t 是当前 task-solving flow，可为 prompting、voting、code-assisted verification 或 hand-written search。",
      env: "Step 3：通过 U(E,π_t) 在 validation tasks 上运行 policy，并保留 score、error 与 trace 以便从坏 edit 恢复。",
      I: "Step 4：当前 decision function I_t 用 LLM 选择 inspect、interact、update 与 recurse action，并可读取和重写自身实现。",
      next: "Step 5：monkey-patch π_t 和/或 I_t，再递归调用更新后的代码。joint update 是它区别于 fixed meta-agent optimizer 的关键。"
    }
  },

  dgm: {
    type: "开放式 self-improving Agent evolution",
    background: "Formal Gödel Machine 要求为自我修改给出形式化证明，而这种证明在现实任务中通常难以获得。Darwin Gödel Machine 改用 empirical benchmark selection，并把 self-modifying code 与 archive-based population exploration 结合起来。",
    problem: "Greedy self-editing 可能删除关键功能，也可能困在单一 lineage 中。系统需要保留多样化的阶段性成果，提高表现强、但尚未充分探索的 parent 的采样概率，让 parent 根据自己的 evaluation logs 提出修改，并淘汰已经失去 code-editing 能力的 child。",
    results: [
      { metric: "SWE-bench", note: "经过 80 iterations。" },
      { metric: "Polyglot full", note: "full-benchmark estimate；50-task search subset 从 14.0% 提升到 38.0%。" },
      { metric: "No open-ended archive", note: "SWE-bench / Polyglot subset，对比 DGM 的 50.0% / 38.0%。" },
      { metric: "Fixed modifier baseline", note: "去掉 self-improving agent、保留 generation 后低于 DGM。" },
      { metric: "Claude 3.7 transfer", note: "DGM 发现的 scaffold improvement transfer 到更强 frozen model。" }
    ],
    formulae: [
      { title: "Performance transform", note: "α_i 表示 Agent 的 benchmark performance；sigmoid 会平滑分数差异，避免高分 Agent 完全垄断采样。" },
      { title: "Underexplored-lineage bonus", note: "n_i 统计该 parent 已产生的 functioning children 数量；成功 descendant 越少，探索奖励越高。" },
      { title: "Parent selection", note: "只要 Agent 符合条件且 benchmark performance 尚未满分，它就会保留非零的父代采样概率。" },
      { title: "Archive transition", note: "admission gate 是 validity，而不是相对 parent 的即时 score improvement。" }
    ],
    buildNotes: [
      "使用 copy-on-write repository 或 Git branch，使每个 child 有 immutable parent 与可检查 diff。",
      "在昂贵 benchmark 前先测试基本 code-editing capability。",
      "archive management 与 evaluator code 放在 editable child repository 外部。",
      "sandbox network、shell、filesystem access，并保留 promoted version 的 human review。"
    ],
    limitations: [
      "open-ended archive 与 parent-selection algorithm 固定，DGM 不能重写它们。",
      "benchmark 只是 coding ability 与未来 self-modification ability 的 proxy，未必等同于真实部署能力。",
      "重复 benchmark-guided search 即使有 held-out transfer test 仍可能 overfit。",
      "分阶段且含噪声的 evaluation 可能对 Agent 排序错误，维护和评估 archive 的成本也很高。",
      "实验修改 frozen model 周围的 tool 与 workflow，不重写 training code 或训练新 foundation model。",
      "self-modifying code 需要强 sandbox、traceability 与 human oversight。"
    ],
    diagramTitle: "Archive 中的 Agent lineage tree",
    diagramCaption: "系统每次复制一个 parent repository，再将副本编辑成 child；只要 child 仍是 valid code editor，就可以进入 archive。",
    diagramDetails: {
      a0: "Step 1：archive 从一个 lightweight coding agent 开始；每轮按 sigmoid performance × 1/(1+functioning children) 选择 parent。",
      a1: "Step 2：复制 parent repository；parent 读取 evaluation logs，提出 feature 并编辑 copy，形成不同 child agent。",
      a2: "Step 3：保留多条分支，而不是只替换唯一的 canonical agent；当前低分但 valid 的 child 仍可能成为未来 descendant 的阶段性成果。",
      a3: "Step 4：descendant 可从同一早期 lineage 实现另一种 workflow/tool change；每个 node 记录 exact parent 与 diff。",
      a4: "Step 5：强 descendant 可能来自中途下降的 branch；archive admission 不要求立即超过 parent。",
      eval: "Step 6：compile，先在 10 tasks 上测试基本 code editing，再把较强 Agent 放到更大 benchmark subset；只 archive functioning code editor。"
    }
  },

  alphaevolve: {
    type: "Evaluator-guided program evolution",
    background: "AlphaEvolve 是面向可由程序自动评分的科学与工程问题的 evolutionary coding agent。人类用 initial program 与 evaluator 定义目标，系统再结合 context-rich prompt、code diff、evaluation 和多样化的 previous discoveries，持续搜索更好的程序。",
    problem: "传统 genetic programming 需要人工编写 mutation operator；反复进行 LLM sampling 又缺少 cumulative selection；只搜索单一函数的方法则无法修改较大的系统。AlphaEvolve 因此需要可靠的 evaluator、能保留多样性的 database、精确的全文件编辑、multiple objectives，以及足够高的吞吐量来支持长期进化。",
    results: [
      { metric: "Matrix multiplication targets", note: "54 个 target 中 14 个超过 best known、38 个持平、2 个落后，并产出 exact algorithm。" },
      { metric: "4x4 complex matmul", note: "改进了一项长期未被突破的 matrix multiplication construction。" },
      { metric: "Gemini kernels", note: "相对 expert heuristic 的平均 kernel speedup，对应 Gemini training time 约降低 1%。" },
      { metric: "Data-center scheduling", note: "平均回收 fleet-wide compute resources。" },
      { metric: "Ablations", note: "context、meta-prompt、full-file evolution 和 strong/small-model ensemble 均改善 tensor-decomposition search。" }
    ],
    formulae: [
      { title: "Task evaluator", note: "evaluate(program) 返回一个或多个 scalar metrics，惯例为越大越好。" },
      { title: "Child generation", note: "I 是 inspiration programs，以及可选 human/LLM-generated context 的集合。" },
      { title: "Multiobjective retention", note: "可以用 Pareto dominance 决定多指标下的保留关系；AlphaEvolve 还通过 MAP-Elites 与 island-style 机制维持 database 的多样性。" },
      { title: "Throughput objective（实现视角）", note: "asynchronous system 优化整个 pipeline throughput，而不是单个 proposal latency。" }
    ],
    buildNotes: [
      "先写 evaluate()，并用 known good、bad、slow、malformed program 验证。",
      "使用 exact diff matching，ambiguous patch 直接拒绝。",
      "evaluator code 放在 EVOLVE-BLOCK 外，并在 resource-limited worker 执行 candidate。",
      "保留 per-metric elites 与 multiple islands，使异常但有潜力的 structure 继续出现。"
    ],
    limitations: [
      "最主要的限制是必须提供 automated evaluator；许多 natural-science experiment 无法被低成本模拟或评分。",
      "evaluator misspecification 可能选择高分但无效或不理想的 program。",
      "长期搜索需要大量 LLM/evaluation compute，以及针对具体应用搭建的 infrastructure。",
      "系统进化 target program/algorithm，通常不重写 AlphaEvolve controller 自身。",
      "数学正确性与 production change 都需要 independent verification。"
    ],
    diagramTitle: "Evaluator-grounded code evolution",
    diagramCaption: "database 提供 parent 与 inspiration；LLM 生成 code edit，evaluator 执行并评分，再把 valid child 放回 database。",
    diagramDetails: {
      human: "Step 1：提供 initial complete program、返回 scalar metrics 的 evaluate()、editable EVOLVE-BLOCK 和可选 equation/literature。",
      db: "Step 2：sample 一个 parent 与 diverse inspiration programs；database 在 high score 与 MAP-Elites/island diversity 间平衡。",
      prompt: "Step 3：组合 current code、score、feedback、prior programs、explicit context、stochastic template 和可选 co-evolved meta-prompt。",
      llm: "Step 4：fast/strong model ensemble 提出 targeted SEARCH/REPLACE block 或 complete rewrite。",
      child: "Step 5：精确应用 diff；不匹配、越过 editable region 或 static check 失败的 patch 被拒绝。",
      eval: "Step 6：先 cheap test 再 expensive evaluation；把 valid child、lineage、metrics、output 与 feedback 写回 database。"
    }
  },

  "hermes-agent-self-evolving": {
    type: "DSPy + GEPA optimization harness",
    background: "Hermes Agent Self-Evolution 是面向 Hermes Agent 的独立 repository。它首先优化 SKILL.md，并计划继续扩展到 tool description 与 system-prompt section。这些 text artifact 可以通过 API 直接修改，无需进行 GPU training。",
    problem: "人工编写的 instructions 会随着工具和任务变化而逐渐过时，而重复出现的 failure trace 往往包含尚未被系统利用的证据。该方案需要 evaluation dataset、能够从完整 trace 而非仅从 scalar score 学习的 optimizer、严格的 regression gate，以及便于人工审查的 deployment path。",
    results: [
      { metric: "Phase 1 average", note: "local validation report 中两个 held-out examples 的平均提升。" },
      { metric: "Validation example 1", note: "第一个 held-out arXiv-skill task 的提升。" },
      { metric: "Validation example 2", note: "第二个 held-out example 没有 regression。" },
      { metric: "Validation setup", note: "共 7 个 synthetic examples，1 轮 BootstrapFewShot，少于 60 秒，估计低于 $0.50。" },
      { metric: "Current implementation status", note: "skill evolution 已经实现；tool description、system prompt、code evolution 与 continuous monitoring 仍处于规划阶段。" }
    ],
    formulae: [
      { title: "Phase 1 heuristic fitness", note: "local report 使用低成本 proxy，只衡量 keyword overlap，不能代表完整的语义正确性。" },
      { title: "Pareto retention", note: "保留 nondominated variants，使在特定 task category、cost 或 safety metric 上表现突出的 specialist 不会被平均分淘汰。" },
      { title: "Promotion gate", note: "方案要求 full tests，并提出 TBLite 2% 内 no-regression tolerance；production threshold 应按 target 配置。" }
    ],
    buildNotes: [
      "优先使用真实的 failed sessions；synthetic examples 只用于扩展 coverage，不应成为唯一证据。",
      "尽量使用 LLM rubric 或 task execution，keyword overlap 太容易被表面优化。",
      "冻结 schema 与 non-editable safety text，并对 mutable body 运行 semantic-drift check。",
      "按 task category 比较 multiple Pareto variants，不要过早压成单一 average。"
    ],
    limitations: [
      "现有 local report 是小规模 Phase 1 validation，不是 peer-reviewed large-scale benchmark。",
      "+20.7% average 只来自两个 held-out examples 与 keyword-overlap proxy，不确定性很高。",
      "tool description、system prompt、code evolution 与 continuous monitoring 多数仍是 roadmap。",
      "synthetic dataset 可能编码 generator model 的假设并漏掉真实 failure mode。",
      "GEPA/DSPy 改进 text scaffold，而不修改 model weights；最终收益仍取决于 base model 与 evaluation quality。"
    ],
    diagramTitle: "Trace-aware prompt 与 skill evolution",
    diagramCaption: "GEPA 读取完整 execution trace，产生 instruction variant；通过 Pareto retention 与 regression gate 后再交给人类 review。",
    diagramDetails: {
      module: "Step 1：读取当前 SKILL.md，把 editable body 包装为 DSPy module parameter，并保留 frontmatter、schema 与 frozen safety constraint。",
      examples: "Step 2：从 real session、synthetic generation 与 benchmark 构建 task/rubric pairs，在 optimization 前切分 train 与 held-out validation。",
      metric: "Step 3：定义 task execution 或 rubric fitness；local Phase 1 使用 cheap keyword-overlap proxy，强结论需要更可靠 evaluator。",
      trace: "Step 4：运行 candidate 并捕获 intermediate output、tool choice、error 与 final score，使 mutation 能针对具体失败原因。",
      gepa: "Step 5：对 trace 做 reflection 并提出 targeted instruction mutation；MIPROv2 是 instruction/demo combination search fallback。",
      variants: "Step 6：保留在不同 example 或 metric 上表现较强的 nondominated variants，再依次通过 tests、size、semantic、cache 与 benchmark gates。",
      deploy: "Step 7：创建 branch 与 PR，附上 before/after metrics 和 exact diff；由人类 merge，active session 不 hot-swap。"
    }
  }
};
