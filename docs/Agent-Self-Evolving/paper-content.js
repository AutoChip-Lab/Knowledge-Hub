window.paperAudits = {
  "godel-machines": {
    sourceMap: "Sections 2-6; Equation 1; Theorem 4.1; BIOPS in Section 5",
    background: "The Godel Machine is a formal thought experiment for a self-referential agent. The machine has one finite lifetime, interacts with an environment, receives rewards and costs, and contains a description of its own hardware and software inside an axiomatic system. Its initial software contains both a task-facing problem solver and a proof searcher.",
    problem: "Arbitrary self-modification is dangerous because a locally attractive rewrite may destroy future capabilities. The paper asks for a principled gate: execute a self-rewrite only when the current formal system can prove that switching now has higher expected future utility than continuing to run the current program and search for some later rewrite.",
    method: [
      "Run the problem solver and proof searcher as parts of the same program and charge both against the same lifetime utility.",
      "Encode axioms for hardware transitions, the initial program, environment assumptions, uncertainty, and the utility function.",
      "Enumerate proof techniques with BIOPS. A proof technique may inspect state, derive theorems, and propose a switch program.",
      "Prove the target theorem comparing switch-now utility with continue-searching utility.",
      "If the proof succeeds, execute the switch program immediately. It may rewrite the solver, proof searcher, time allocation, axioms, or even the utility code.",
      "Any utility-function rewrite must be justified as beneficial according to the old utility function, preventing an arbitrary change of goals."
    ],
    results: [
      { metric: "Primary result", value: "Global optimality theorem", note: "Relative to the encoded axioms, utility, resources, and initial proof-search bias, a proven switch is better than waiting for any later switch the unchanged searcher might find." },
      { metric: "Initial search", value: "BIOPS is O()-optimal", note: "Universal search allocates time to proof techniques according to a prior such as P(w) = K^{-length(w)}; large constants remain." },
      { metric: "Empirical benchmark", value: "None", note: "The contribution is a formal architecture and proof, not an implemented LLM agent benchmark." }
    ],
    formulae: [
      { title: "Expected future utility", latex: String.raw`u(s,\mathrm{Env})=\mathbb{E}_{\mu}\!\left[\left.\sum_{\tau=\mathrm{time}(s)}^{T} r(\tau)\,\right|\,s,\mathrm{Env}\right]`, note: "Every action, proof-search step, and rewrite consumes time and therefore affects the same objective." },
      { title: "Proof gate", latex: String.raw`u\!\left(s(t_1)\oplus[\mathrm{switchbit}=1],\mathrm{Env}(t_1)\right)>u\!\left(s(t_1)\oplus[\mathrm{switchbit}=0],\mathrm{Env}(t_1)\right)`, note: "The right side already includes the possibility that the unchanged proof searcher finds a different rewrite later." },
      { title: "Example BIOPS prior", latex: String.raw`P(w)=K^{-\ell(w)}`, note: "Short proof-generating programs receive more search time, but the prior itself may later be rewritten if a proof justifies it." }
    ],
    implementation: `# A practical approximation cannot prove a messy real-world theorem.
# Keep the same architecture, but replace proof with a verified promotion gate.
while budget.remaining():
    candidate = proof_search.propose_rewrite(snapshot(system))
    report = sandbox.evaluate(candidate, regression_suite, holdout_suite)
    if report.valid and report.lower_confidence_bound > incumbent_score:
        system = atomic_promote(candidate)
        audit_log.append(candidate.diff, report)
`,
    buildNotes: [
      "Make the evaluator part of the trusted computing base; do not let candidates edit hidden tests or score computation.",
      "Evaluate the cost of the rewrite and the future search process, not only immediate task accuracy.",
      "Version the full state so a failed empirical approximation can roll back even though the formal machine would not need rollback."
    ],
    limitations: [
      "Useful target theorems can be unprovable or computationally out of reach; Rice-style undecidability gives hard limits.",
      "A proof is only as trustworthy as the consistency and realism of the initial axioms and environment model.",
      "BIOPS is optimal only up to multiplicative constants, which can be impractically large.",
      "The framework assumes a formalizable utility function; real human objectives are incomplete, changing, and difficult to encode."
    ],
    walkthrough: ["env", "solver", "utility", "axioms", "proof", "rewrite"],
    diagramDetails: {
      env: "Input: observations and reward/cost. The environment may react to the solver's previous outputs. Implementation: expose a deterministic simulator or logged replay when possible so candidate rewrites can be compared reproducibly.",
      solver: "Operation: act using the current task policy e. Its code, memory policy, and resource share are all eligible rewrite targets. Output: actions plus an execution history used by utility reasoning.",
      utility: "Operation: map possible future trajectories to one objective. It includes reward, remaining lifetime, and computation cost. This is not merely a unit-test score; it defines what a beneficial rewrite means.",
      axioms: "Input to proof search: formal descriptions of hardware, current code, initial state, environment assumptions, probability rules, and utility. Bad or inconsistent axioms invalidate the guarantee.",
      proof: "Operation: BIOPS enumerates proof techniques. A candidate must prove switch-now utility is greater than continue-search utility; merely finding a rewrite that looks better is insufficient.",
      rewrite: "Output: execute switchprog immediately after the target theorem is proven. The rewrite may modify the solver, proof searcher, axioms, utility code, or scheduling. A new utility must still be preferred by the old utility."
    }
  },

  poet: {
    sourceMap: "Section 3; Algorithms 1-3; Sections 4.1-4.3; Supplement 6",
    background: "Hard reinforcement-learning tasks often have deceptive local optima: an agent can learn to avoid catastrophic failure without ever discovering the behavior needed to cross the obstacle. POET treats useful intermediate problem-solution pairs as stepping stones and searches for many curricula at once rather than prescribing one target curriculum.",
    problem: "The system must invent challenges that are learnable but nontrivial, preserve the solver progress attached to each challenge, and allow a skill discovered on one branch to rescue another branch. Direct optimization, a fixed curriculum, or mutation without transfer can miss those serendipitous routes.",
    method: [
      "Initialize an archive with a flat environment E0 and a randomly initialized policy theta0.",
      "Every mutation interval, select eligible parents whose paired agents score at least 200, mutate their environment parameter vectors, and copy the parent policy into each child pair.",
      "Apply the minimal criterion 50 <= score <= 300; this removes children that are currently hopeless or already trivial.",
      "When too many children survive, prioritize novelty relative to active and archived environment encodings, then cap the active population.",
      "Optimize every paired policy independently with an ES step; other RL optimizers could replace ES.",
      "Every transfer interval, evaluate all other active policies in each target environment, including one-step fine-tuning, and replace the incumbent only when the transferred policy scores higher."
    ],
    results: [
      { metric: "Direct ES on POET targets", value: "17.9 / 39.6 / 13.6", note: "Best of five direct-optimization runs on gap, roughness, and stump targets; POET exceeded the solved threshold of 230 on each." },
      { metric: "Run scale", value: "25,200 iterations", note: "Three runs, 20 active environments, population 512 per ES step; about 10 days on 256 CPU cores." },
      { metric: "Time after creation to solve", value: "638 / 1,180 / 2,178", note: "Mean iterations for challenging / very challenging / extremely challenging environments, with reported 95% intervals." },
      { metric: "Transfer ablation", value: "p < 2.2e-16", note: "POET with transfer covered significantly more environment space; without transfer it solved no extremely challenging environments." },
      { metric: "Backward-transfer example", value: "309 -> 349", note: "A gait learned on a child environment transferred back and improved the parent score after equal optimization." }
    ],
    formulae: [
      { title: "Minimal criterion used in the experiment", latex: String.raw`50\le E_{\mathrm{child}}(\theta_{\mathrm{child}})\le 300`, note: "The child starts with a copy of the parent agent. The interval is domain-specific and must be calibrated." },
      { title: "Novelty of a candidate environment", latex: String.raw`\rho(E)=\frac{1}{k}\sum_{E_i\in \mathrm{kNN}(E)}\left\|\phi(E)-\phi(E_i)\right\|_2`, note: "Original POET uses the hand-designed environment encoding phi(E); k-nearest neighbors include active and archived environments." },
      { title: "Evolution-strategy update", latex: String.raw`\Delta\theta\approx\frac{1}{n\sigma}\sum_{i=1}^{n}F(\theta+\sigma\epsilon_i)\epsilon_i,\qquad \epsilon_i\sim\mathcal N(0,I)`, note: "The paper rank-normalizes returns before the weighted update and uses Adam." },
      { title: "Walker reward per non-fall step", latex: String.raw`r_t=130\,\Delta x_t-5\,\Delta\mathrm{hullAngle}_t-0.00035\,\mathrm{torque}_t`, note: "A fall gives -100. An environment is called solved after reaching the end with total score at least 230." }
    ],
    implementation: `archive = [Pair(flat_env(), random_policy())]
for t in range(T):
    if t % mutate_every == 0:
        for parent in eligible_parents(archive, score_min=200):
            env = mutate(parent.env_encoding)
            agent = copy(parent.agent)
            s = evaluate(agent, env)
            if 50 <= s <= 300:
                admit_by_novelty(archive, Pair(env, agent))

    parallel_for(pair in active(archive)):
        pair.agent = es_step(pair.agent, pair.env)

    if t % transfer_every == 0:
        parallel_for(target in active(archive)):
            candidates = direct_and_one_step_transfers(active(archive), target.env)
            target.agent = argmax_score([target.agent, *candidates], target.env)
`,
    buildNotes: [
      "Represent a pair as immutable environment config plus a versioned policy checkpoint and optimizer state.",
      "Reset optimizer state when a child is created or a transfer is accepted, matching the paper.",
      "Keep the archive for novelty even after an environment leaves the active population.",
      "For an LLM adaptation, mutate task generators and copy the parent agent scaffold or memory, then use tests as the minimal criterion."
    ],
    limitations: [
      "The environment encoding fixes the universe of possible challenges; original POET only varies predefined obstacle types and ranges.",
      "Novelty is domain-specific because Euclidean distance over hand-designed genes may not match behavioral difference.",
      "It co-evolves tasks and agents but does not evolve the reward definition itself.",
      "The all-pairs transfer process and parallel policy optimization are computationally expensive."
    ],
    walkthrough: ["root", "a", "b", "c", "e", "d", "f"],
    diagramDetails: {
      root: "Step 1 - Initialize one easy environment-agent pair: flat terrain plus a random policy. Store both the environment encoding and the policy checkpoint.",
      a: "Step 2 - Reproduce an eligible parent. Mutate its environment genes, copy its policy into the child, reset optimizer state, and evaluate learnability.",
      b: "Step 3 - Keep multiple branches. POET is not a single easy-to-hard list; each branch can specialize and later donate a useful policy elsewhere.",
      c: "Step 4 - Admit a child only if it passes the minimal criterion and is sufficiently novel. It becomes a new optimization target and future parent.",
      e: "Step 5 - Optimize each retained policy in its own environment. The pair is the stepping stone: a challenge together with its current solution.",
      d: "Reject as too easy when current agents already score near the top of the criterion. Such a child adds little learning pressure.",
      f: "Reject as too hard when inherited/current agents cannot obtain useful reward. The child can be generated again later after capability improves."
    }
  },

  "enhanced-poet": {
    sourceMap: "Sections 3.1-3.2, 4-7; Algorithm 1 in Appendix A.1",
    background: "Original POET demonstrated open-ended paired search, but its environment distance and terrain genes were designed specifically for Bipedal Walker. Enhanced POET separates environment generation from environment characterization and adds a progress measure for open-ended innovation.",
    problem: "A domain-general system cannot assume that raw environment parameters are comparable or even available. It also needs a richer generator, a less noisy transfer test, and a way to tell whether the run is still producing meaningfully new solved challenges.",
    method: [
      "Generate terrain with a CPPN: query x coordinates and interpret network outputs as heights; evolve weights and topology with NEAT.",
      "Characterize each environment by evaluating all active and archived agents on it, producing a raw performance vector.",
      "Clip scores, replace them with ranks, and normalize ranks to [-0.5, 0.5]. This PATA-EC profile makes Euclidean novelty independent of terrain-specific features.",
      "Use the maximum of the incumbent agent's five most recent target-environment scores as a transfer threshold.",
      "Run candidate direct transfer first; only if it beats the threshold spend compute on one-step fine-tuning, which must also beat the threshold.",
      "Track ANNECS: count generated environments that pass novelty/minimal-criterion tests and are eventually solved."
    ],
    results: [
      { metric: "PATA-EC overhead", value: "+82.4 +/- 7.31%", note: "More ES steps than the hand-designed characterization while matching its diversity and challenge levels." },
      { metric: "Improved transfer cost", value: "79.7 +/- 1.67%", note: "Fraction of original transfer computation while preserving diversity and challenge levels." },
      { metric: "Run scale", value: "60,000 iterations", note: "40 active environments; about 12 days using 750 CPU cores." },
      { metric: "Curriculum controls", value: "p < 0.01", note: "Direct ES/PPO and hand-built interpolation curricula underperformed POET on middle- and late-stage targets." },
      { metric: "ANNECS", value: "Original plateaus ~20k", note: "Enhanced POET continued rising through the 60k experiment, with slower growth after about 30k as tasks became harder." }
    ],
    formulae: [
      { title: "PATA-EC profile", latex: String.raw`c(E)=\mathrm{rankNorm}_{[-0.5,0.5]}\!\left(\mathrm{clip}\left([R(\theta_1,E),\ldots,R(\theta_m,E)],L,U\right)\right)`, note: "Two environments are different when they induce different orderings of the agent population." },
      { title: "Behavioral novelty", latex: String.raw`\rho(E)=\frac{1}{5}\sum_{E_i\in\mathrm{5NN}(E)}\left\|c(E)-c(E_i)\right\|_2`, note: "This no longer compares terrain genes; it compares agent-performance profiles." },
      { title: "Transfer threshold", latex: String.raw`\tau_E(t)=\max\{R_E(\theta_E^{t-4}),\ldots,R_E(\theta_E^t)\}`, note: "A candidate must beat tau with direct transfer before fine-tuning is attempted, and must beat it again after fine-tuning." },
      { title: "ANNECS", latex: String.raw`\mathrm{ANNECS}(t)=\sum_{E\,\mathrm{created}\le t}\mathbf 1[\mathrm{novel}(E)\wedge\mathrm{eventuallySolved}(E)]`, note: "It rewards neither duplicates nor permanently unsolved environments." }
    ],
    implementation: `def pata_profile(env, agents, low, high):
    scores = [evaluate(agent, env) for agent in agents]
    clipped = clip(scores, low, high)
    return rank_normalize(clipped, out_range=(-0.5, 0.5))

def transfer(candidate, incumbent, env, recent_scores):
    threshold = max(recent_scores[-5:])
    if evaluate(candidate, env) <= threshold:
        return incumbent                 # skip expensive fine-tuning
    tuned = optimize_one_step(copy(candidate), env)
    return tuned if evaluate(tuned, env) > threshold else incumbent
`,
    buildNotes: [
      "Cache the agent-by-environment score matrix because PATA-EC and transfer reuse the same evaluations.",
      "Use stable rank handling for ties; changing tie policy changes novelty distances.",
      "Separate the CPPN genotype from rendered terrain so the same genotype can be reproduced exactly.",
      "ANNECS is an evaluation metric for the run, not a reward directly optimized by each policy."
    ],
    limitations: [
      "PATA-EC is domain-general in its inputs, but its all-agent evaluations are expensive and become harder to scale.",
      "CPPNs greatly expand terrain variety but the physical simulator and biped body still bound the domain.",
      "ANNECS depends on chosen novelty, minimal-criterion, and solved thresholds.",
      "Open-ended progress can still plateau when the domain has no further physically meaningful challenges."
    ],
    walkthrough: ["cppn", "envA", "envB", "pop", "profile", "annecs"],
    diagramDetails: {
      cppn: "Step 1 - Evolve a generator, not a fixed obstacle vector. For each horizontal coordinate x, CPPN(x) returns terrain height; NEAT can add nodes and connections over generations.",
      envA: "Step 2 - Render one CPPN genotype into a reproducible environment. The generated shape can contain structures never named as obstacle types by the designer.",
      envB: "Step 2 - Another genotype produces a different environment. Raw genotype distance is not used as semantic novelty.",
      pop: "Step 3 - Transfer-probe both environments with the same active and archived agents. Store the score matrix for reuse.",
      profile: "Step 4 - Clip, rank, and normalize each environment's score vector. Euclidean distance now measures whether environments distinguish agent capabilities differently.",
      annecs: "Step 5 - Increment only when a newly created environment is behaviorally novel, passes the minimal criterion, and is eventually solved."
    }
  },

  reflexion: {
    sourceMap: "Section 3 and Algorithm 1; Sections 4-5",
    background: "An LLM agent can retry a task but still repeat the same mistake because its model weights and prompt are unchanged. Reflexion treats natural-language feedback as a lightweight policy update stored outside the model, combining a short-term trajectory with a small long-term memory of distilled lessons.",
    problem: "A scalar reward such as pass/fail says that an attempt was wrong but not why. The method must convert sparse feedback and a long trajectory into a concise rule that changes the next attempt without fine-tuning the base model.",
    method: [
      "The Actor produces a trajectory using the task, current observations, short-term history, and reflection memory.",
      "The Evaluator assigns a task-specific reward using environment heuristics, exact match, unit tests, or an LLM judge.",
      "The Self-Reflection model receives the trajectory, reward, and prior memory and writes a specific verbal explanation and next-step strategy.",
      "Append the reflection to long-term memory; the paper typically keeps only the latest one to three reflections to fit the context window.",
      "Reset/retry the task with the memory in the Actor's prompt until the evaluator passes or the trial budget is exhausted."
    ],
    results: [
      { metric: "ALFWorld", value: "130 / 134", note: "ReAct + Reflexion completed 130 tasks; improvement continued over up to 12 trials." },
      { metric: "HumanEval Python", value: "91.0% pass@1", note: "Compared with the paper's GPT-4 baseline of 80.1%." },
      { metric: "HumanEval Rust", value: "68.0%", note: "Compared with GPT-4 baseline 60.0%." },
      { metric: "LeetCode Hard Python", value: "15.0%", note: "Compared with GPT-4 baseline 7.5%." },
      { metric: "MBPP Python", value: "77.1%", note: "Lower than the 80.1% base due partly to false-positive generated tests; an important evaluator failure case." }
    ],
    formulae: [
      { title: "Actor policy", latex: String.raw`a_i\sim\pi_{\theta}(a_i\mid s_i),\qquad \theta=\{M_a,\mathrm{mem}\}`, note: "The policy parameters are the frozen Actor plus editable in-context memory, not updated model weights." },
      { title: "Evaluation and reflection", latex: String.raw`r_t=M_e(\tau_t),\qquad sr_t=M_{sr}(\tau_t,r_t,\mathrm{mem}_t)`, note: "The reflection model amplifies a sparse reward into a task-specific verbal lesson." },
      { title: "Bounded episodic memory", latex: String.raw`\mathrm{mem}_{t+1}=\mathrm{tail}_{\Omega}\!\left(\mathrm{mem}_t\,\Vert\,sr_t\right),\qquad \Omega\in\{1,2,3\}`, note: "The experiments use a small sliding window because every reflection consumes context." }
    ],
    implementation: `memory = deque(maxlen=3)
for trial in range(max_trials):
    trajectory = actor.run(task, reflections=list(memory))
    reward, evidence = evaluator(trajectory)
    if reward == PASS:
        return trajectory.answer

    lesson = reflector.generate(
        task=task,
        trajectory=trajectory,
        evidence=evidence,
        prior_reflections=list(memory),
    )
    memory.append(validate_and_compress(lesson))
raise TrialBudgetExceeded
`,
    buildNotes: [
      "Return evidence with the score: failed assertion, repeated action, exact mismatch, or environment state.",
      "Store a causal lesson and a concrete next action, not a transcript summary.",
      "Deduplicate or invalidate reflections when later evidence contradicts them.",
      "Use held-out tasks to test whether the reflection prompt helps rather than merely increasing token count."
    ],
    limitations: [
      "The loop can converge to a poor local strategy because it updates context, not the underlying model.",
      "Incorrect evaluators or flaky self-generated tests create harmful reflections and premature success.",
      "A sliding memory window forgets older lessons; an unbounded memory overwhelms the context window.",
      "Test-driven reflection is difficult for nondeterministic, API-dependent, hardware-dependent, or concurrent programs."
    ],
    walkthrough: ["task", "actor", "eval", "reflect", "memory"],
    diagramDetails: {
      task: "Step 1 - Start or reset one trial. Provide the same objective plus current observable state; do not leak the ground-truth answer into reflection.",
      actor: "Step 2 - Generate actions or an answer conditioned on short-term trajectory history and the latest one-to-three stored reflections.",
      eval: "Step 3 - Produce a scalar reward and concrete evidence. In the paper this can be an ALFWorld heuristic, exact match, generated unit tests, or an LLM classifier.",
      reflect: "Step 4 - Distill why the trajectory failed and what should change. Good output is actionable, such as verifying possession before attempting to use an object.",
      memory: "Step 5 - Append the lesson and trim to the memory budget. The next Actor call uses it as an in-context policy update."
    }
  },

  voyager: {
    sourceMap: "Sections 2.1-2.3; Sections 3.3-3.4; Appendix A prompts",
    background: "Open-world embodied agents face a lifelong sequence of unknown tasks. Solving each task from scratch wastes experience, while storing only conversation traces makes useful behaviors hard to reuse. Voyager externalizes learning into a curriculum and an executable skill library while keeping GPT-4 weights frozen.",
    problem: "The agent must choose its own next goal at an appropriate difficulty, synthesize reliable long-horizon behavior, recover from execution failures, verify success without a hand-written checker for every task, and preserve mastered behavior for later composition.",
    method: [
      "Automatic curriculum prompts GPT-4 with inventory, nearby entities/blocks, biome, health, position, and completed/failed tasks to propose a diverse but achievable next objective.",
      "The skill manager asks GPT-3.5 for a task plan, combines it with environment feedback, embeds that text, and retrieves the top five skill descriptions from a vector database.",
      "The action agent prompts GPT-4 with control APIs, retrieved skills, world state, prior code, errors, feedback, and a critique, then generates JavaScript.",
      "Execute the code in Mineflayer. Feed environment messages and interpreter errors into the next repair round.",
      "A separate GPT-4 verifier inspects the task and current state, returns success/failure and a critique, and repeats for up to four code rounds.",
      "On success, generate a description, store its embedding as the key and verified code as the value, then request the next curriculum task."
    ],
    results: [
      { metric: "Unique items", value: "3.3x", note: "More than prior state of the art in the Minecraft evaluation." },
      { metric: "Technology tree", value: "up to 15.3x faster", note: "15.3x wooden, 8.5x stone, 6.4x iron; only Voyager reached diamond in the reported comparison." },
      { metric: "Exploration distance", value: "2.3x", note: "Longer traversal across diverse terrains than baselines." },
      { metric: "Transfer", value: "New-world reuse", note: "The learned skill library supported novel tasks in a fresh world while baselines struggled." }
    ],
    formulae: [
      { title: "Skill retrieval (implementation form)", latex: String.raw`\mathrm{skills}(q)=\operatorname{TopK}_{j,\,k=5}\;\cos\!\left(\mathrm{Emb}(q),\mathrm{Emb}(d_j)\right)`, note: "The paper specifies a vector database and top-5 retrieval. q combines a generated plan with environment feedback; d_j is a stored program description." },
      { title: "Verified skill insertion", latex: String.raw`\mathrm{Library}\leftarrow\mathrm{Library}\cup\{(\mathrm{Emb}(d),\mathrm{code})\}\quad\text{only if }V(\mathrm{task},\mathrm{state})=\mathrm{true}`, note: "Executable code is committed only after the separate verifier accepts task completion." },
      { title: "Repair budget", latex: String.raw`\mathrm{code}_{t+1}=\mathrm{LLM}(\mathrm{task},\mathrm{APIs},\mathrm{skills},\mathrm{state},\mathrm{code}_t,\mathrm{feedback}_t),\quad t<4`, note: "After four stuck rounds, Voyager abandons the task and asks the curriculum for another objective." }
    ],
    implementation: `while True:
    task = curriculum.propose(world.snapshot(), progress_log)
    query = planner.describe(task, world.feedback())
    skills = skill_db.top_k(embed(query), k=5)
    code = None

    for attempt in range(4):
        code = action_llm.generate(task, api_docs, skills, code, world.feedback())
        execution = sandbox.run(code)
        verdict = verifier(task, world.snapshot(), execution)
        if verdict.success:
            description = describe(code)
            skill_db.insert(embed(description), code, tests=execution.trace)
            progress_log.mark_done(task)
            break
    else:
        progress_log.mark_failed(task)
`,
    buildNotes: [
      "Store skill metadata: description, code, dependencies, preconditions, postconditions, and a verification trace.",
      "Sandbox generated code and expose a narrow, typed control API.",
      "Make success checks inspect state changes rather than trusting the generated program's own claim.",
      "Version skills and run regression tasks before replacing a widely reused skill."
    ],
    limitations: [
      "The approach depends on an environment with programmable control APIs and observable state.",
      "LLM self-verification can accept false success or reject valid but unexpected behavior.",
      "Skill retrieval can return irrelevant or incompatible code; bad skills become persistent failure sources.",
      "Minecraft-specific prompts and Mineflayer primitives limit direct transfer to physical robotics or other games.",
      "The agent accumulates external skills but does not update the base model weights."
    ],
    walkthrough: ["state", "llm", "f1", "f2", "f3", "code", "exec"],
    diagramDetails: {
      state: "Step 1 - Summarize observable world state and progress. The curriculum uses this to choose a goal near the current capability frontier.",
      llm: "Step 2 - One controller role proposes the task; another writes/repairs code; a separate verifier judges success. The diagram groups these GPT calls for readability.",
      f1: "Step 3 - Retrieve top-5 skills by embedding similarity between the current plan/feedback and stored skill descriptions.",
      f2: "Step 3 - Each table row maps a human-readable function description to executable JavaScript. The code is the reusable memory payload.",
      f3: "Step 3 - The library grows compositionally: later code may call earlier functions rather than rediscovering low-level behavior.",
      code: "Step 4 - Generate a concrete program from the task, APIs, retrieved skills, current state, previous code, errors, and critique.",
      exec: "Step 5 - Run in the environment, collect chat feedback and interpreter errors, then ask a separate verifier. Save the skill only on verified success."
    }
  },

  stop: {
    sourceMap: "Sections 3-7; Equations 1-2; Algorithm 1; Appendix A",
    background: "A language model can improve a program when given a utility function, but the surrounding scaffold determines how candidates are sampled, scored, retained, and retried. STOP asks whether that scaffold can itself be treated as the solution string and improved recursively while the underlying LLM remains fixed.",
    problem: "The target is not one downstream answer. It is a reusable improver program I that should produce high-scoring solutions across a distribution of tasks. Evaluating I is expensive because each meta-utility call runs I, which calls the LLM and downstream utility many times.",
    method: [
      "Represent a task as utility u plus an initial solution string s; define an improver I(u, s, L) that returns a new solution string.",
      "Build a training set D of downstream tasks and define meta-utility as the average score obtained after one improvement call on each task.",
      "Start with a seed improver that asks the LLM for candidate code improvements, evaluates them, and returns the best.",
      "Use the current improver to improve its own source code under meta-utility: I_t = I_{t-1}(meta_utility, I_{t-1}, L).",
      "Repeat for a fixed recursion depth T and strict budgets for LM calls, samples per call, utility calls, runtime, and sandbox execution.",
      "Evaluate the final improver on held-out task instances and transfer tasks; inspect generated code for reward hacking and constraint circumvention."
    ],
    resultSummary: "The experiments ask three separate questions: can the scaffold improve on its training task, does the improved scaffold transfer to unseen task types, and does recursive code generation remain reliable and constrained? The strongest evidence is transfer: an improver evolved only on LPN improved all five new tasks without further self-optimization.",
    results: [
      { metric: "LPN self-improvement", value: "Rounds 1-3 improved", note: "GPT-4 mean held-out meta-utility rose over the first three rounds across 5 runs and 50 unseen LPN instances. A single run could still decline because both generation and evaluation are stochastic." },
      { metric: "LPN reference baselines", value: "57.7% / 64.2%", note: "Chain-of-thought scored 57.7% +/- 3.0% when error-free; a greedy iterative improver scored 64.2% +/- 0.9%. These are reference methods, not recursive STOP rounds." },
      { metric: "String Grid transfer", value: "44.3% -> 56.7%", note: "Seed improver I0 versus the T=4 improver IT trained on LPN. The original downstream solution itself scored 43.9%." },
      { metric: "Quadratic Assignment", value: "20.6% -> 22.1%", note: "A small but positive transfer gain; the original downstream solution scored 20.4%." },
      { metric: "3SAT transfer", value: "21.2% -> 75.1%", note: "The largest transfer gain. The original seed solution scored 0%; no extra self-optimization on 3SAT was performed." },
      { metric: "MaxCut transfer", value: "58.7% -> 74.2%", note: "The LPN-trained scaffold transferred to a different combinatorial optimization utility; the original seed solution scored 0%." },
      { metric: "Parity without noise", value: "59.3% -> 81.7%", note: "Transfer from noisy parity training to a related but distinct task; the original solution scored 50.0%." },
      { metric: "GPT-3.5 reliability", value: "12%", note: "Only 3 of 25 runs achieved at least a 3% improvement. Smaller models often proposed plausible ideas but implemented them incorrectly or degraded the scaffold." },
      { metric: "Unsandboxing attempts", value: "0.42% / 0.12%", note: "GPT-4 / GPT-3.5 rates among 10,000 generated improvements. Wilson 95% intervals were 0.31-0.57% and 0.07-0.21%; low is not zero." }
    ],
    formulae: [
      { title: "Downstream improvement", latex: String.raw`s'=I(u,s,L),\qquad u(s')\gg u(s)`, note: "s is the artifact being improved. During self-improvement, s is the source code of I itself." },
      { title: "Expected improver quality", latex: String.raw`\bar u(I)=\mathbb E_{(u,s)\sim\mathcal D}\left[u\!\left(I(u,s,L)\right)\right]`, note: "This is the desired performance on future tasks from the task distribution." },
      { title: "Training meta-utility", latex: String.raw`\hat u(I)=\frac{1}{|D|}\sum_{(u,s)\in D}u\!\left(I(u,s,L)\right)`, note: "STOP optimizes this finite-task estimate; Appendix A gives a generalization bound for bounded programs and utilities." },
      { title: "Recursive scaffold update", latex: String.raw`I_t=I_{t-1}(\hat u,I_{t-1},L),\qquad t=1,\ldots,T`, note: "The same fixed LLM can produce different improvers because each I_t contains different search code, prompts, budgets, and candidate-selection logic." },
      { title: "Reported cost order", latex: String.raw`O\!\left((B_u+B_L)B_{\hat u}\right)`, note: "Meta-optimization multiplies downstream utility/LLM budgets by the meta-utility budget." }
    ],
    implementation: `def meta_utility(improver_source, tasks):
    scores = []
    for utility, seed in tasks:
        improver = sandbox.compile(improver_source)
        candidate = improver(utility, seed, bounded_llm)
        scores.append(utility(candidate))
    return mean(scores)

improver = seed_improver_source
for _ in range(T):
    candidate = sandbox.compile(improver)(meta_utility, improver, bounded_llm)
    # Keep a protected incumbent in a practical implementation.
    if validate(candidate) and holdout_meta_utility(candidate) >= holdout_meta_utility(improver):
        improver = candidate
`,
    buildNotes: [
      "Pass the utility both as a callable and a description, but enforce budgets outside candidate-editable code.",
      "Separate meta-train tasks from held-out tasks; otherwise the improver can overfit evaluator quirks.",
      "Treat syntax errors, timeouts, and sandbox violations as zero utility and preserve the previous best improver.",
      "Log every utility call because the nested budget is the dominant cost and a common attack surface."
    ],
    limitations: [
      "STOP improves the scaffold, not the LLM weights or architecture.",
      "A worse I_t can be accepted and cause later deterioration; the paper's sequence keeps one improver per round.",
      "It requires a fast, describable utility function and becomes much more expensive than running the final improver once.",
      "Misspecified utilities invite reward hacking, including malformed outputs that exploit score code.",
      "Generated improvers may remove or bypass budget and sandbox instructions unless those controls are externally enforced."
    ],
    walkthrough: ["llm", "meta", "i0", "i1", "i2", "i3"],
    diagramDetails: {
      llm: "Fixed component - L is the same black-box model at every recursion. Different improvers arise because their surrounding source code changes how L is prompted and searched.",
      meta: "Evaluator - Compile an improver, run it on several downstream (utility, seed) tasks, and average the resulting solution scores. Enforce all budgets outside candidate code.",
      i0: "Step 1 - Seed improver: ask for several candidate solution edits, call utility on each, and return the highest-scoring valid candidate.",
      i1: "Step 2 - I0 receives its own source as s and meta_utility as u. The output I1 may add a beam, caching, dynamic temperature, or a stopping rule.",
      i2: "Step 3 - I1 now performs the next self-edit. The artifact and the algorithm applying the edit are the same program at this recursion level.",
      i3: "Step 4 - Continue to preset depth T. The paper does not stop by proving optimality; a practical harness should retain the best held-out checkpoint."
    }
  },

  gptswarm: {
    sourceMap: "Sections 2.2-2.4; Algorithms 1-3; Sections 3.2-3.4; Appendix G",
    background: "Agent workflows such as ReAct, tool pipelines, debate, and multi-agent swarms can all be represented as directed computational graphs. GPTSwarm makes the communication structure and node prompts explicit optimization variables rather than fixed human design choices.",
    problem: "A graph with d optional edges has 2^d configurations, execution scores are usually nondifferentiable, and node prompts interact through predecessor outputs. The system needs a way to learn which communication channels to keep and how each specialized node should behave.",
    method: [
      "Represent one agent as a DAG G=(N,E,F,o): nodes execute in topological order, receive the same external task x plus outputs from predecessor nodes, and send their output to successors.",
      "Compose several agent graphs by adding optional inter-agent edges; keep one external task input and one output/aggregation node.",
      "Assign each optional edge a Bernoulli probability theta_i. Sample an edge only if adding it preserves acyclicity.",
      "Run sampled graphs, score whole-graph outputs with task utility, and update theta with a REINFORCE gradient estimate.",
      "For node optimization, store each node's own input context and output in its history. Apply a prompt optimizer using that local history, the current prompt, and the node's function description.",
      "Graph-level success can annotate histories, but useful node optimization needs node-relevant evidence such as unit-test results or whether a code-generating node's output executed correctly."
    ],
    results: [
      { metric: "Mini Crosswords edge opt", value: "0.465 -> 0.575", note: "Initial graph distribution to ten REINFORCE iterations, mean over three runs." },
      { metric: "Mini Crosswords node after edge", value: "0.668 +/- 0.0060", note: "UCB1 selected prompt demonstrations after edge optimization." },
      { metric: "Mini Crosswords final", value: "0.800 +/- 0.0616", note: "GPT-4-Turbo evaluation; ToT GPT-4 baseline 0.675 and ToT GPT-4-Turbo 0.668." },
      { metric: "HumanEval node opt", value: "0.76 -> 0.88 +/- 0.007", note: "Online prompt optimization over eight iterations." },
      { metric: "GAIA average", value: "18.45", note: "Seven-ToT-agent swarm versus GPT-4-Turbo 9.70; runtime rose roughly linearly with agent count." }
    ],
    formulae: [
      { title: "Agent graph execution", latex: String.raw`z_n=\{f_v(z_v,x):v\in\mathrm{pre}(n)\},\qquad \hat y=f_o(z_o,x)`, note: "Every node may see the single task input x plus messages from predecessor nodes." },
      { title: "Probabilistic graph objective", latex: String.raw`\max_{\theta\in\Theta}\;\mathbb E_{G'\sim D_{\theta}}\left[u_{\tau}(G')\right]`, note: "D_theta is a distribution over feasible DAGs, parameterized by optional-edge probabilities." },
      { title: "REINFORCE estimate", latex: String.raw`\nabla_{\theta}J\approx\frac{1}{M}\sum_{i=1}^{M}\hat u_{\tau}(G_i)\nabla_{\theta}\log p_{\theta}(G_i)`, note: "In practice subtract a baseline to reduce variance and clamp probabilities away from exactly zero/one during exploration." },
      { title: "Node prompt update", latex: String.raw`h_n\leftarrow h_n\cup\{((z_n,x),f_n^{p_n}(z_n,x))\},\qquad p_n\leftarrow I(h_n,p_n,d_n)`, note: "h_n is node-local execution history; d_n describes the intended role of the node." }
    ],
    implementation: `for step in range(edge_steps):
    sampled = [sample_dag(theta) for _ in range(batch_size)]
    rewards = [evaluate(run(graph, task_batch)) for graph in sampled]
    theta += lr * reinforce_gradient(sampled, rewards, theta, baseline=mean(rewards))

best_graph = materialize(theta)
for task in prompt_train_tasks:
    trace = run_with_node_traces(best_graph, task)
    for node in best_graph.nodes:
        node.history.append((trace.input_to(node), trace.output_of(node), trace.evidence_for(node)))
        node.prompt = prompt_optimizer(node.prompt, node.role, node.history)
`,
    buildNotes: [
      "Validate acyclicity before executing a sampled graph and cache topological order.",
      "Track cost and latency in the utility; otherwise edge optimization can prefer needlessly dense graphs.",
      "Store node-local evidence whenever possible, because one graph-level reward creates a credit-assignment problem.",
      "Evaluate optimized topology and prompts on held-out tasks and multiple random seeds."
    ],
    limitations: [
      "REINFORCE has high variance and optional-edge search grows combinatorially.",
      "The paper optimizes communication edges but does not dynamically redesign the internal topology of each agent.",
      "Graph-level rewards provide weak credit assignment for individual node prompt failures.",
      "More agents and edges increase token cost, latency, and coordination failures; the paper flags scaling beyond 100 agents as a challenge.",
      "Experiments use task-specific node routines and optimizers, so the graph representation is more general than the demonstrated search procedures."
    ],
    walkthrough: ["task", "router", "llm", "rag", "tool", "critic", "agg", "output"],
    diagramDetails: {
      task: "Single external input x - one question or task enters the graph. Internally, nodes may all receive x while optional edges carry predecessor outputs.",
      router: "Graph entry - dispatches the same task into the selected DAG paths. This is not a second external input.",
      llm: "Node type - an LLM routine with its own prompt. Its history contains the context it received and the text it produced.",
      tool: "Node type - a deterministic or external tool call. Include its cost, errors, and latency in the trace even if only LLM-node prompts are optimized.",
      rag: "Node type - retrieval or web/file analysis. An optional edge probability controls whether its information reaches downstream nodes.",
      critic: "Node type - a specialized LLM judge or reflection call. Edge optimization learns whether messages reaching it improve the task-level score.",
      agg: "Output/aggregation node - combines predecessor answers by a fixed or prompted decision rule. It remains inside the agent graph.",
      output: "Single graph output y-hat - score this answer with task utility, then use that graph-level score for edge optimization and attach relevant evidence to node histories."
    }
  },

  adas: {
    sourceMap: "Sections 2-4; Meta Agent Search pseudocode in Appendix H",
    background: "Automated Design of Agentic Systems (ADAS) frames agent design as an optimization problem with three choices: a search space of representable agents, a search algorithm, and an evaluation function. Meta Agent Search is the paper's concrete demonstration using code as a broad, interpretable search space.",
    problem: "Prompt-only search cannot invent a different workflow, tool policy, or multi-agent structure. A code search space is much broader, but it is unbounded and expensive, so the meta-agent needs prior discoveries as stepping stones and reliable validation feedback.",
    method: [
      "Provide a small framework of under 100 lines with foundation-model APIs and formatting helpers; a candidate agent implements only forward(taskInfo).",
      "Optionally seed an archive with baselines such as Chain-of-Thought and Self-Refine, including code, idea descriptions, and validation metrics.",
      "Prompt a meta-agent with the task domain and archive to propose an interestingly new agent idea and implement it as executable code.",
      "Run two self-reflection checks for novelty, then compile and evaluate the candidate on validation tasks.",
      "If execution errors occur, let the meta-agent repair the design up to five times.",
      "Add every evaluated candidate and its metrics to the archive; later agents can combine earlier stepping stones even if those steps were not immediate winners. Repeat for a fixed iteration budget."
    ],
    results: [
      { metric: "DROP", value: "79.4 +/- 0.8", note: "Meta Agent Search versus best hand-designed Role Assignment at 65.8 +/- 0.9." },
      { metric: "MGSM", value: "53.4 +/- 3.5", note: "Versus LLM Debate 39.0 +/- 3.4 and prompt optimization 30.6 +/- 3.2." },
      { metric: "MMLU", value: "69.6 +/- 3.2", note: "Versus prompt optimization 67.6 +/- 3.2." },
      { metric: "GPQA", value: "34.6 +/- 3.2", note: "Versus prompt optimization 32.9 +/- 3.2." },
      { metric: "Search setup", value: "30 iterations", note: "GPT-4 meta-agent designed systems evaluated with GPT-3.5 in the four reasoning domains." }
    ],
    formulae: [
      { title: "ADAS formulation", latex: String.raw`A^{*}=\arg\max_{A\in\mathcal S}\;\mathrm{Eval}(A;D_{\mathrm{val}})`, note: "The paper states ADAS as search over a representable agent space S under an evaluation function; objectives may include quality, cost, latency, or safety." },
      { title: "Archive update (implementation form)", latex: String.raw`\mathcal A_i=\mathcal A_{i-1}\cup\{(\mathrm{code}(A_i),\mathrm{idea}(A_i),\mathrm{metrics}(A_i))\}`, note: "The growing archive is context for the next meta-agent proposal, not only a leaderboard of winners." },
      { title: "Multi-objective extension", latex: String.raw`\mathbf m(A)=[\mathrm{quality}(A),-\mathrm{cost}(A),-\mathrm{latency}(A),\mathrm{safety}(A)]`, note: "The paper's formulation permits these objectives even though the main experiments emphasize task performance." }
    ],
    implementation: `archive = load_seed_agents()
for iteration in range(30):
    proposal = meta_agent.design(domain, summarize(archive))
    proposal = meta_agent.reflect_for_novelty(proposal, archive, rounds=2)

    for repair in range(5):
        candidate = compile_agent(proposal.code)
        report = evaluate(candidate, validation_tasks)
        if report.executed_cleanly:
            break
        proposal = meta_agent.repair(proposal, report.errors)

    archive.append({"idea": proposal.idea, "code": proposal.code, "metrics": report.metrics})
return select_on_holdout(archive)
`,
    buildNotes: [
      "Define a narrow candidate API such as forward(taskInfo) while allowing arbitrary control flow inside it.",
      "Sandbox candidate code and separately cap LLM calls, wall time, and token cost.",
      "Store failed and mediocre agents because their components may become useful stepping stones later.",
      "Use a final held-out set only for selecting/reporting the result, not as feedback to the meta-agent."
    ],
    limitations: [
      "The meta-agent can only invent code expressible through the provided framework, tools, and model APIs.",
      "Validation-set search can overfit after many generated agents.",
      "Execution of arbitrary generated workflows is expensive and requires strong sandboxing.",
      "The archive is fed back as text, so context limits force lossy summarization as it grows.",
      "The search algorithm itself remains fixed; Meta Agent Search designs task agents, not its own meta-agent loop."
    ],
    walkthrough: ["archive", "meta", "code", "run", "eval"],
    diagramDetails: {
      archive: "Step 1 - Initialize prior agent code, idea descriptions, and scores. Keep diverse stepping stones, not only the current best; the expanded archive becomes context for every later proposal.",
      meta: "Step 2 - A foundation model reads the domain and archive, proposes a novel agent design, reflects on novelty twice, and emits code implementing forward(taskInfo).",
      code: "Step 3 - Compile the candidate inside a sandbox. The code may contain prompts, loops, multiple model calls, voting, tool use, or verification.",
      run: "Step 4 - Execute the candidate over validation taskInfo records under fixed call, token, and time budgets. Capture outputs and exceptions.",
      eval: "Step 5 - Compute accuracy/F1 plus cost and failure metrics. Repair execution errors up to five times, then archive the candidate and use it in the next iteration."
    }
  },

  "godel-agent": {
    sourceMap: "Sections 3-6; Algorithm 1; Table 1; Appendix A-C",
    background: "Meta-learning agents can improve a task policy but leave the human-written update algorithm fixed. Godel Agent increases the editable surface: the running agent can inspect and monkey-patch both its task policy and the code that decides how to inspect, evaluate, and update itself.",
    problem: "A fixed optimizer becomes a bottleneck. The agent needs a self-referential runtime in which the current improvement routine is visible as data, code changes can take effect during execution, feedback can redirect the next recursive call, and errors do not always terminate the process.",
    method: [
      "Initialize a task policy pi0 and a self-referential learning algorithm I0, implemented as a decision function plus action executor.",
      "Inspect local/global runtime state to recover current policy and improvement code.",
      "The LLM chooses actions from self_state, interact/evaluate, self_update, and continue_improve; the action set itself may later be expanded.",
      "Interact calls the task utility on a validation environment and records score/error feedback.",
      "Self-update generates code and monkey-patches the running policy and/or improvement routine.",
      "Continue-improve recursively calls the newly modified logic. Thinking, error recovery, code execution, and LLM-call tools are provided as initial accelerators."
    ],
    results: [
      { metric: "Godel-base MGSM", value: "64.2 +/- 3.4", note: "Constrained version versus Meta Agent Search 53.4 +/- 3.5." },
      { metric: "Godel-free", value: "90.5 / 90.6 / 87.9 / 55.7", note: "DROP / MGSM / MMLU / GPQA; unconstrained runs sometimes called stronger models, so these are not fair same-resource comparisons." },
      { metric: "Game of 24", value: "100%", note: "One run replaced an LLM-based approach with explicit search after six failed improvement attempts." },
      { metric: "Robustness", value: "14% final failures", note: "Across 100 MGSM optimization trials; 92% had temporary drops and 4% terminated unexpectedly." },
      { metric: "Reported search cost", value: "~$15", note: "Thirty recursive improvements across four domains versus about $300 reported for Meta Agent Search." }
    ],
    formulae: [
      { title: "Fixed meta-learning agent", latex: String.raw`\pi_{t+1}=I(\pi_t,r_t),\qquad r_t=U(E,\pi_t)`, note: "The task policy changes, but I stays fixed." },
      { title: "Self-referential update", latex: String.raw`\pi_{t+1},I_{t+1}=I_t(\pi_t,I_t,r_t,g),\qquad r_t=U(E,\pi_t)`, note: "The current optimizer I_t receives its own representation and may rewrite itself as well as the policy." },
      { title: "Recursive transition", latex: String.raw`(\pi,s,r)\leftarrow\mathrm{EXECUTE}(E,\pi,s,r,a_i),\qquad a_{1:n}=f_t(\pi,s,r,g)`, note: "s is inspected runtime state; continue_improve invokes the possibly updated decision function recursively." }
    ],
    implementation: `def self_improve(env, policy, runtime_state, reward, goal):
    actions = decision_llm(policy, runtime_state, reward, goal)
    for action in actions:
        if action.kind == "self_state":
            runtime_state = inspect_runtime()
        elif action.kind == "interact":
            reward = evaluate(env, policy)
        elif action.kind == "self_update":
            policy, self_improve = guarded_monkey_patch(action.code)
        elif action.kind == "continue_improve":
            return self_improve(env, policy, inspect_runtime(), reward, goal)
    return policy, runtime_state, reward
`,
    buildNotes: [
      "Restrict monkey patches to a versioned module namespace; validate signatures before activation.",
      "Keep an external supervisor and last-known-good checkpoint because runtime self-edits frequently cause temporary regressions.",
      "Feed structured error traces into the next decision, not only a scalar score.",
      "Separate constrained and unconstrained evaluations; tool/model escalation can dominate apparent gains."
    ],
    limitations: [
      "There is no formal proof that a self-update is beneficial; temporary performance drops are common.",
      "Monkey-patching the recursive improvement routine can terminate future self-improvement.",
      "Current LLMs often rediscover known designs and did not surpass strong Tree-of-Thought initialization in the case study.",
      "Results depend on a small validation set and can overfit through repeated recursive evaluation.",
      "The unconstrained Godel-free results include spontaneous use of stronger models and are not directly comparable to fixed-resource baselines."
    ],
    walkthrough: ["goal", "pi", "env", "I", "next"],
    diagramDetails: {
      goal: "Input g - a high-level objective such as maximize validation accuracy. It tells the self-referential routine what improvement means but does not prescribe a workflow.",
      pi: "Step 2 - pi_t is the current task-solving flow. The runtime can inspect its code; it may be prompting logic, voting, code-assisted verification, or a hand-written search algorithm.",
      env: "Step 3 - Run the current policy on validation tasks through utility U(E, pi_t). Preserve scores, errors, and traces so the recursive routine can recover from a bad edit.",
      I: "Step 4 - The current decision function I_t uses an LLM to choose inspect, interact, update, and recurse actions. I_t can inspect and rewrite its own implementation.",
      next: "Step 5 - Monkey-patch pi_t and/or I_t, then recursively invoke the new code. This joint update is the key difference from a fixed meta-agent optimizer."
    }
  },

  dgm: {
    sourceMap: "Sections 3-6; Appendix C.2-C.4; Equations 1-7",
    background: "Formal Godel Machines require proofs that are unavailable for practical coding agents. The Darwin Godel Machine replaces proof with empirical benchmark selection and combines self-modifying code with population-based open-ended exploration over an archive of agent variants.",
    problem: "Greedy self-editing can lose essential functionality or become trapped on one lineage. The system must preserve diverse stepping stones, favor strong but underexplored parents, let a parent use its own evaluation logs to propose a feature, and reject children that can no longer edit code.",
    method: [
      "Initialize the archive with one lightweight coding agent containing Bash and whole-file edit tools around a frozen foundation model.",
      "Select parents with nonzero probability using sigmoid-scaled benchmark performance multiplied by an inverse functioning-child count.",
      "Give each selected parent its benchmark logs and a self-improvement instruction. The parent proposes a feature and receives that proposal as a coding task.",
      "Copy the parent's repository and let the parent modify that copy, producing a distinct child agent with a traceable code diff.",
      "Compile and stage-evaluate the child on 10, then 50/60, and for strong SWE-bench agents up to 200 tasks.",
      "Archive every child that compiles and retains codebase-editing functionality, even when its current benchmark score is lower than its parent's.",
      "Repeat for 80 iterations; archived branches can later become parents and yield improvements after temporary score dips."
    ],
    results: [
      { metric: "SWE-bench", value: "20.0% -> 50.0%", note: "After 80 iterations." },
      { metric: "Polyglot full", value: "14.2% -> 30.7%", note: "Full-benchmark estimate; the 50-task search subset improved 14.0% -> 38.0%." },
      { metric: "No open-ended archive", value: "23.0% / 14.0%", note: "SWE-bench / Polyglot subset, versus DGM 50.0% / 38.0%." },
      { metric: "Fixed modifier baseline", value: "39.0% / 28.0%", note: "Removing self-improving agents while keeping generation underperformed DGM." },
      { metric: "Claude 3.7 transfer", value: "19.0% -> 59.5%", note: "DGM-discovered scaffold improvements transferred to a stronger frozen model." }
    ],
    formulae: [
      { title: "Performance transform", latex: String.raw`s_i=\frac{1}{1+\exp[-\lambda(\alpha_i-\alpha_0)]},\qquad \lambda=10,\;\alpha_0=0.5`, note: "alpha_i is agent benchmark performance; the sigmoid softens score differences." },
      { title: "Underexplored-lineage bonus", latex: String.raw`h_i=\frac{1}{1+n_i}`, note: "n_i counts functioning children, so parents with fewer successful descendants receive more weight." },
      { title: "Parent selection", latex: String.raw`w_i=s_i h_i,\qquad p_i=\frac{w_i}{\sum_j w_j},\qquad \mathrm{parents}\sim\mathrm{Categorical}(p)`, note: "All eligible agents with nonperfect performance retain nonzero probability." },
      { title: "Archive transition", latex: String.raw`\mathcal A_{t+1}=\mathcal A_t\cup\{(c,\mathrm{score}(c)):\mathrm{validCodeEditor}(c)\}`, note: "Validity, not immediate score improvement, is the admission gate." }
    ],
    implementation: `archive = [evaluate(base_agent)]
for iteration in range(80):
    weights = []
    for agent in eligible(archive):
        s = sigmoid(10 * (agent.score - 0.5))
        h = 1 / (1 + agent.functioning_children)
        weights.append(s * h)

    for parent in categorical_sample(archive, normalize(weights), k=parallelism):
        feature = parent.propose_feature(parent.evaluation_logs)
        child_repo = copy_repository(parent.repo)
        child = parent.solve_coding_task(child_repo, feature)
        report = staged_benchmark(child, stages=[10, 50, 200])
        if child.compiles and child.can_edit_codebases:
            archive.append(record_lineage(child, parent, report))
`,
    buildNotes: [
      "Use copy-on-write repositories or Git branches so every child has an immutable parent and inspectable diff.",
      "Test basic code-editing capability before expensive benchmark stages.",
      "Keep archive management and evaluator code outside the editable child repository, matching the paper's fixed exploration loop.",
      "Sandbox network, shell, and filesystem access; retain human review for promoted agent versions."
    ],
    limitations: [
      "The open-ended archive and parent-selection algorithm are fixed and cannot be rewritten by the DGM.",
      "The benchmark is only a proxy for both coding ability and future self-modification ability.",
      "Repeated benchmark-guided search risks overfitting despite held-out transfer tests.",
      "Staged noisy evaluations can mis-rank agents, and maintaining/evaluating an archive is expensive.",
      "The experiments modify tools and workflows around frozen models; they do not rewrite training code or train new foundation models.",
      "Self-modifying code requires strong sandboxing, traceability, and human oversight."
    ],
    walkthrough: ["a0", "a1", "a2", "a3", "a4", "eval"],
    diagramDetails: {
      a0: "Step 1 - Start the archive with one lightweight coding agent. On each iteration sample a parent using sigmoid-scaled performance times 1/(1 + functioning children).",
      a1: "Step 2 - Copy the parent repository. The parent reads its evaluation logs, proposes a feature, and edits the copy to create a distinct child agent.",
      a2: "Step 3 - Keep branching rather than replacing one canonical agent. A lower-scoring but valid child can remain a stepping stone for a later descendant.",
      a3: "Step 4 - A descendant can implement another workflow or tool change from the same earlier lineage. Every node records its exact parent and diff.",
      a4: "Step 5 - Strong descendants can emerge from branches that temporarily dipped. Immediate improvement over the parent is not the archive admission rule.",
      eval: "Step 6 - Compile, test basic code editing on 10 tasks, then stage stronger agents onto larger benchmark subsets. Archive only agents that remain functional code editors."
    }
  },

  alphaevolve: {
    sourceMap: "Sections 2.1-2.6; Sections 3-4; Discussion",
    background: "AlphaEvolve is an evolutionary coding agent for machine-gradable scientific and engineering problems. A human defines what to optimize through an initial program and evaluator; the system searches for how to improve it by repeatedly sampling context-rich prompts, generating code diffs, evaluating programs, and resurfacing diverse prior discoveries.",
    problem: "Classical genetic programming needs hand-written mutation operators, repeated LLM sampling lacks cumulative selection, and single-function search cannot modify larger systems. AlphaEvolve needs robust evaluation, diversity-preserving program storage, targeted full-file edits, multiple objectives, and enough throughput for long evolutionary runs.",
    method: [
      "The user supplies evaluation function h, an initial complete program, optional problem context, and EVOLVE-BLOCK markers delimiting editable regions.",
      "Sample a parent plus inspiration programs from a database inspired by MAP-Elites and island populations.",
      "Build a prompt containing current code/scores, prior high-performing programs, rendered evaluator feedback, equations/literature, stochastic template variants, and optionally co-evolved meta-prompts.",
      "Use an ensemble of Gemini 2.0 Flash for throughput and Gemini 2.0 Pro for occasional stronger proposals; request SEARCH/REPLACE diffs or full rewrites.",
      "Apply the diff, then run an evaluation cascade: cheap validity tests first, expensive tests only for promising programs, with parallel execution when possible.",
      "Store program, metrics, outputs, lineage, and feedback in the database; multiobjective niches preserve diverse high performers for future prompts.",
      "Run the controller, LLM samplers, and evaluators asynchronously to maximize evaluated ideas per compute budget."
    ],
    results: [
      { metric: "Matrix multiplication targets", value: "14 / 54 surpassed", note: "Matched the best known on 38 targets and trailed on 2; produced exact algorithms." },
      { metric: "4x4 complex matmul", value: "48 multiplications", note: "Improved a long-studied construction." },
      { metric: "Gemini kernels", value: "+23% average", note: "Kernel speedup over expert heuristics, corresponding to about 1% reduction in Gemini training time." },
      { metric: "Data-center scheduling", value: "+0.7%", note: "Average fleet-wide compute resources recovered." },
      { metric: "Ablations", value: "Every major component helped", note: "Context, meta-prompts, full-file evolution, and the mixed strong/small-model ensemble each improved tensor-decomposition search." }
    ],
    formulae: [
      { title: "Task evaluator", latex: String.raw`h:\mathcal P\rightarrow\mathbb R^m,\qquad h(P)=[m_1(P),\ldots,m_m(P)]`, note: "evaluate(program) returns one or more scalar metrics, conventionally maximized." },
      { title: "Child generation", latex: String.raw`P_{\mathrm{child}}=\mathrm{ApplyDiff}\!\left(P_{\mathrm{parent}},\mathrm{LLM}(\mathrm{Prompt}(P_{\mathrm{parent}},\mathcal I,\mathrm{feedback}))\right)`, note: "I is a set of inspiration programs and optional human/LLM-generated context." },
      { title: "Multiobjective retention", latex: String.raw`P_a\succ P_b\iff \left(\forall j:\,m_j(P_a)\ge m_j(P_b)\right)\wedge\left(\exists j:\,m_j(P_a)>m_j(P_b)\right)`, note: "Pareto dominance is a useful implementation rule; AlphaEvolve additionally uses MAP-Elites/island-style diversity in its database." },
      { title: "Throughput objective (implementation view)", latex: String.raw`\max\;\frac{\#\{\text{valid evaluated proposals}\}}{\text{wall-clock compute budget}}`, note: "The asynchronous system is optimized for pipeline throughput rather than latency of one proposal." }
    ],
    implementation: `database = ProgramDatabase(initial_program, map_elites=True, islands=True)
async def worker():
    while budget.remaining():
        parent, inspirations = database.sample()
        prompt = prompt_sampler.build(parent, inspirations, evaluator_feedback=True)
        diff = await model_ensemble.generate(prompt)
        child = apply_search_replace_diff(parent, diff)

        results = await evaluation_cascade(child, stages=[syntax, cheap_tests, full_evaluate])
        if results.valid:
            database.add(child, metrics=results.metrics, parent=parent, feedback=results.details)

await run_many(worker, llm_workers=N, evaluator_workers=M)
`,
    buildNotes: [
      "Write evaluate() before evolution and validate it against known good, bad, slow, and malformed programs.",
      "Use exact diff matching and reject ambiguous patches rather than applying them heuristically.",
      "Keep evaluator code outside EVOLVE-BLOCK regions and execute candidates in resource-limited workers.",
      "Preserve per-metric elites and multiple islands so unusual but promising structures continue to appear in prompts."
    ],
    limitations: [
      "The main limitation stated by the paper is the need for an automated evaluator; many natural-science experiments cannot be cheaply simulated or graded.",
      "Evaluator misspecification can select invalid or undesirable programs despite high scores.",
      "Long searches require substantial LLM and evaluation compute, and application-specific infrastructure remains significant.",
      "The system evolves target programs and algorithms; it is not generally rewriting the AlphaEvolve controller itself.",
      "Reported discoveries require independent verification, especially for mathematical correctness and production-system changes."
    ],
    walkthrough: ["human", "db", "prompt", "llm", "child", "eval"],
    diagramDetails: {
      human: "Step 1 - Human supplies an initial complete program, evaluate() returning scalar metrics, editable EVOLVE-BLOCK markers, and optional equations or literature.",
      db: "Step 2 - Sample a parent to improve plus diverse inspiration programs. The database balances high scores with MAP-Elites/island diversity.",
      prompt: "Step 3 - Assemble current code, scores, feedback, prior programs, explicit context, stochastic template choices, and optionally a co-evolved meta-prompt.",
      llm: "Step 4 - A fast/strong model ensemble proposes targeted SEARCH/REPLACE blocks or a complete rewrite.",
      child: "Step 5 - Apply the diff exactly to create the child. Reject patches that do not match, escape editable regions, or fail static checks.",
      eval: "Step 6 - Run cheap tests before expensive evaluation, potentially across many workers. Insert valid child, lineage, metrics, outputs, and feedback into the database for future sampling."
    }
  },

  "hermes-agent-self-evolving": {
    year: "2026",
    sourceMap: "Repository README and PLAN; Phase 1 Validation Report in reports/",
    background: "Hermes Agent Self-Evolution is a standalone repository that operates on Hermes Agent. It targets the editable instruction layer - SKILL.md files first, then tool descriptions and system-prompt sections - because these are text artifacts that can be mutated through API calls without GPU training. Later code evolution phases are planned separately.",
    problem: "Manual instructions become stale and repeated failure traces contain evidence that authors may not systematically use. The proposal needs an evaluation dataset, an optimizer that learns from complete traces rather than only scalar scores, hard regression gates, and a human-reviewable deployment path.",
    method: [
      "Load an existing Hermes skill and preserve non-editable structure such as frontmatter and schemas.",
      "Build task/expected-behavior examples from synthetic generation, real SessionDB traces, or benchmarks; split training from held-out validation.",
      "Wrap the skill text as an optimizable DSPy module whose instruction field controls how the agent handles each task.",
      "Use GEPA for reflective evolution: run candidates, inspect execution traces and rubric feedback, propose targeted text mutations, and keep a Pareto set of variants that excel on different examples or metrics.",
      "Use MIPROv2 as a fallback for instruction/few-shot search; it proposes instruction and demonstration candidates and uses Bayesian optimization to choose combinations to evaluate.",
      "Reject variants that fail tests, size limits, caching compatibility, semantic-preservation checks, or benchmark gates.",
      "Write the winning variant to a Git branch and PR for human review; never hot-swap content into an active conversation."
    ],
    results: [
      { metric: "Phase 1 average", value: "0.391 -> 0.472", note: "+20.7% across two held-out examples in the local validation report." },
      { metric: "Validation example 1", value: "0.408 -> 0.569", note: "+39.5% on the first held-out arXiv-skill task." },
      { metric: "Validation example 2", value: "0.374 -> 0.374", note: "No regression on the second held-out example." },
      { metric: "Validation setup", value: "3 train / 2 validation", note: "Seven synthetic examples total, one BootstrapFewShot round, under 60 seconds and estimated under $0.50." },
      { metric: "Current implementation status", value: "Phase 1", note: "Skill evolution is implemented; tool descriptions, system prompts, code evolution, and continuous monitoring are listed as planned phases." }
    ],
    formulae: [
      { title: "Phase 1 heuristic fitness", latex: String.raw`\mathrm{score}=0.3+0.7\frac{|W_{\mathrm{expected}}\cap W_{\mathrm{output}}|}{|W_{\mathrm{expected}}|}`, note: "This exact proxy appears in the local validation report. It is cheap but measures keyword overlap rather than full semantic correctness." },
      { title: "Pareto retention", latex: String.raw`v_a\succ v_b\iff \left(\forall j:\,m_j(v_a)\ge m_j(v_b)\right)\wedge\left(\exists j:\,m_j(v_a)>m_j(v_b)\right)`, note: "Keeping nondominated variants preserves specialists that may be best for particular task categories, costs, or safety metrics." },
      { title: "Promotion gate", latex: String.raw`\mathrm{promote}(v)\iff \Delta\mathrm{holdout}(v)>0\;\wedge\;\mathrm{tests}(v)=100\%\;\wedge\;\mathrm{regression}(v)\ge-2\%`, note: "The plan requires full tests and proposes a TBLite no-regression tolerance within 2%; production thresholds should be configured per target." }
    ],
    implementation: `skill = load_skill(path)
train, validation = build_dataset(skill, sources=["sessiondb", "synthetic"])
module = SkillModule(instructions=skill.body)

optimizer = GEPA(metric=rubric_metric, capture_traces=True)
pareto_variants = optimizer.compile(module, trainset=train)

for variant in pareto_variants:
    report = evaluate(variant, validation)
    if (constraints.pass_all(variant)
            and tests.pass_all(variant)
            and benchmarks.no_regression(variant, tolerance=0.02)):
        create_review_pr(reassemble(skill.frontmatter, variant.instructions), report)
`,
    buildNotes: [
      "Prefer real failed sessions for evaluation data and keep synthetic examples as coverage expansion, not the sole evidence source.",
      "Use an LLM rubric or task execution where possible; keyword overlap is too easy to optimize superficially.",
      "Freeze schemas and non-editable safety text, then run semantic-drift checks on the mutable body.",
      "Compare multiple Pareto variants by task category instead of collapsing every objective into one average too early."
    ],
    limitations: [
      "The available local report is a small Phase 1 validation, not a peer-reviewed large-scale benchmark study.",
      "Its reported +20.7% average uses only two held-out examples and a keyword-overlap proxy, so uncertainty is high.",
      "Most of the broader roadmap - tool descriptions, system prompts, code evolution, and continuous monitoring - is planned rather than demonstrated.",
      "Synthetic datasets can encode the generator model's assumptions and miss real user failure modes.",
      "GEPA/DSPy improve text scaffolds, not model weights; broad behavioral gains still depend on the underlying model and evaluation quality."
    ],
    walkthrough: ["module", "examples", "metric", "trace", "gepa", "variants", "deploy"],
    diagramDetails: {
      module: "Step 1 - Read the current SKILL.md and wrap its editable body as a DSPy module parameter. Preserve frontmatter, schemas, and frozen safety constraints.",
      examples: "Step 2 - Build task/rubric pairs from real sessions, synthetic generation, and benchmarks. Split train and held-out validation before optimization.",
      metric: "Step 3 - Define task execution or rubric fitness. The local Phase 1 report used a cheap keyword-overlap proxy, which should be replaced for stronger claims.",
      trace: "Step 4 - Run candidates and capture intermediate outputs, tool choices, errors, and final scores so mutation can respond to a concrete failure cause.",
      gepa: "Step 5 - Reflect on traces and propose targeted instruction mutations. MIPROv2 is a fallback instruction/demonstration combination search.",
      variants: "Step 6 - Keep nondominated variants that are strong on different examples or metrics, then apply tests, size, semantic, cache, and benchmark gates.",
      deploy: "Step 7 - Create a branch and PR with before/after metrics and the exact diff. A human merges it; active sessions are never hot-swapped."
    }
  }
};
