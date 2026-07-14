const papers = [
  {
    id: "godel-machines",
    year: "2003/2007",
    title: "Godel Machines",
    type: "Formal recursive self-improvement",
    mechanisms: ["Evaluation", "Self-editing code"],
    background:
      "Schmidhuber's Godel Machine asks what a fully self-improving agent would look like if every self-rewrite had to be justified formally.",
    problem:
      "A self-modifying system can easily make itself worse. The paper tries to solve this by requiring proof before any rewrite is executed.",
    method: [
      "The system has a problem solver that acts in the environment and a proof searcher that searches for useful self-rewrites.",
      "The proof searcher reasons from axioms describing the hardware, current software, utility function, environment assumptions, and uncertainty rules.",
      "If it proves that a rewrite improves expected utility, the machine executes the rewrite immediately.",
      "The rewrite can affect the solver, proof searcher, resource allocation, or utility-related code."
    ],
    result:
      "This is mainly a theoretical result. The paper establishes a formal ideal for provably beneficial recursive self-improvement, not a practical LLM-agent benchmark.",
    limitation:
      "The proof requirement is the bottleneck. For modern LLM agents, environments are too messy and underspecified for most useful rewrites to be formally proven.",
    implementation: `while True:
    solver.act()
    proof = proof_searcher.find_proof(candidate_rewrite)
    if proof.shows_higher_expected_utility():
        apply(candidate_rewrite)`,
    diagram: {
      title: "Proof-gated self-rewrite",
      caption: "The rewrite happens only after the proof searcher proves higher expected utility from the axioms.",
      boxes: [],
      nodes: [
        { id: "env", label: "Environment", sub: "reward/cost", x: 80, y: 210, w: 120, h: 62 },
        { id: "solver", label: "Problem solver", sub: "acts", x: 275, y: 210, w: 132, h: 62 },
        { id: "utility", label: "Utility function", sub: "scores futures", x: 475, y: 330, w: 145, h: 62 },
        { id: "proof", label: "Proof searcher", sub: "searches proofs", x: 475, y: 90, w: 140, h: 62 },
        { id: "axioms", label: "Axioms", sub: "formal assumptions", x: 685, y: 90, w: 140, h: 62 },
        { id: "rewrite", label: "Self-rewrite", sub: "modify system", x: 855, y: 210, w: 132, h: 62 }
      ],
      edges: [
        { from: "solver", to: "env", label: "actions", offset: -12 },
        { from: "env", to: "solver", label: "feedback", offset: 12 },
        { from: "env", to: "utility" },
        { from: "solver", to: "utility" },
        { from: "utility", to: "proof" },
        { from: "axioms", to: "proof" },
        { from: "solver", to: "proof" },
        { from: "proof", to: "rewrite", label: "proof authorizes" },
        { from: "rewrite", to: "solver" },
        { from: "rewrite", to: "proof" },
        { from: "rewrite", to: "axioms" },
        { from: "rewrite", to: "utility" }
      ],
      details: {
        solver: "The task-facing program. It acts in the environment, produces answers/actions, and is one possible target of self-rewrite.",
        proof: "The meta-level process. It searches for a proof that executing a candidate rewrite has higher expected utility than continuing the current search.",
        axioms: "The formal starting assumptions: hardware behavior, current software, environment model, uncertainty rules, and utility definition. The machine may rewrite axiom-related code only when the proof permits it.",
        utility: "The scoring rule for expected future usefulness. In the paper, the proof searcher must reason about this utility before approving a rewrite.",
        rewrite: "A system-level code change. It can target the problem solver, proof searcher, axiom store/representation, utility-related code, or time allocation.",
        env: "The external task and reward/cost signal."
      }
    }
  },
  {
    id: "poet",
    year: "2019",
    title: "POET",
    type: "Paired Open-Ended Trailblazer",
    mechanisms: ["Evaluation", "Skill library", "Prompt / policy search"],
    background:
      "Directly training an RL agent on a hard task often fails because the agent never finds a useful learning signal.",
    problem:
      "The key problem is curriculum discovery: how can a system automatically create the right next challenge, not too easy and not impossible?",
    method: [
      "Maintain many environment-agent pairs instead of one task.",
      "Generate child environments by mutating the parent environment encoding.",
      "Create the child agent by inheriting/copying the parent agent, then optimize it in the child environment.",
      "Filter environments using a minimal criterion: reject too easy and too hard environments.",
      "Use novelty to decide which acceptable child environments are worth keeping.",
      "Periodically transfer agents across environments because another lineage may solve an environment better than its original parent."
    ],
    result:
      "POET showed that open-ended co-evolution can discover stepping-stone environments and agents that solve harder tasks than direct optimization.",
    limitation:
      "The generator still defines the universe of possible tasks. Original POET also used domain-specific environment encodings and novelty metrics.",
    implementation: `for pair in archive:
    child_env = mutate(pair.env_encoding)
    child_agent = copy(pair.agent)      # inheritance
    train(child_agent, child_env)

    if min_score < score(child_agent, child_env) < max_score:
        if novel(child_env, archive):
            archive.add(child_env, child_agent)

periodically:
    transfer_best_agents_between_envs()`,
    diagram: {
      title: "Pyramid of environment-agent pairs",
      caption: "Each child inherits the parent agent and mutates the environment. Transfer arrows let strong agents jump across branches.",
      boxes: [],
      nodes: [
        { id: "root", label: "Env0 + Agent0", sub: "simple start", x: 390, y: 70, w: 145, h: 58 },
        { id: "a", label: "Env1 + Agent1", sub: "mutated terrain", x: 240, y: 175, w: 145, h: 58 },
        { id: "b", label: "Env2 + Agent2", sub: "useful challenge", x: 540, y: 175, w: 145, h: 58 },
        { id: "c", label: "Env3 + Agent3", sub: "novel", x: 120, y: 290, w: 145, h: 58 },
        { id: "d", label: "Env4 + Agent4", sub: "too easy reject", x: 320, y: 290, w: 145, h: 58 },
        { id: "e", label: "Env5 + Agent5", sub: "harder", x: 520, y: 290, w: 145, h: 58 },
        { id: "f", label: "Env6 + Agent6", sub: "too hard reject", x: 720, y: 290, w: 145, h: 58 }
      ],
      edges: [
        { from: "root", to: "a", label: "mutate env + inherit agent" },
        { from: "root", to: "b", label: "mutate env + inherit agent" },
        { from: "a", to: "c", label: "child pair" },
        { from: "a", to: "d", label: "child pair" },
        { from: "b", to: "e", label: "child pair" },
        { from: "b", to: "f", label: "child pair" },
        { from: "e", to: "c", label: "agent transfer", dashed: true, offset: -12 },
        { from: "c", to: "e", label: "agent transfer", dashed: true, offset: 12 }
      ],
      details: {
        root: "The first paired task and solver.",
        a: "A child pair created by changing the environment encoding and copying the parent agent.",
        b: "A different branch that may later produce transferable skills.",
        c: "Kept if it is novel and learnable.",
        d: "Rejected if too easy: no learning pressure.",
        e: "A useful harder stepping stone.",
        f: "Rejected if too hard: no useful signal.",
        default: "POET's archive is not a linear curriculum; it is a branching search over paired tasks and solvers."
      }
    }
  },
  {
    id: "enhanced-poet",
    year: "2020",
    title: "Enhanced POET",
    type: "More general open-ended search",
    mechanisms: ["Evaluation", "Skill library", "Prompt / policy search"],
    background:
      "Original POET worked, but some parts were hand-designed for a specific terrain domain.",
    problem:
      "How can open-ended environment generation become less tied to human-chosen features and measure progress more generally?",
    method: [
      "Replace hand-designed novelty with PATA-EC: characterize an environment by how a population of transferred agents performs on it.",
      "Use CPPN/NEAT environment encodings so terrain complexity can grow over time.",
      "Use ANNECS to measure open-endedness by counting novel environments that are both created and solved.",
      "Improve transfer by evaluating candidate transferred agents and only spending optimization budget on promising transfers."
    ],
    result:
      "Enhanced POET expanded the search space and introduced more domain-general novelty and progress measurements.",
    limitation:
      "It still depends on the chosen generator and remains expensive because many environments and agent transfers must be evaluated.",
    implementation: `profile(env) = [
    normalize(score(agent_i, env))
    for agent_i in agent_population
]

novelty(env_a, env_b) = distance(profile(env_a), profile(env_b))
ANNECS = count(solved_and_novel_envs)`,
    diagram: {
      title: "Novelty from agent-population behavior",
      caption: "Enhanced POET compares environments by performance profiles rather than raw terrain parameters.",
      boxes: [],
      nodes: [
        { id: "cppn", label: "CPPN / NEAT", sub: "terrain generator", x: 90, y: 185, w: 135, h: 62 },
        { id: "envA", label: "Env A", sub: "generated", x: 250, y: 105, w: 110, h: 56 },
        { id: "envB", label: "Env B", sub: "generated", x: 250, y: 265, w: 110, h: 56 },
        { id: "pop", label: "Agent population", sub: "transfer probes", x: 435, y: 185, w: 150, h: 62 },
        { id: "profile", label: "PATA-EC profile", sub: "score vector", x: 635, y: 185, w: 145, h: 62 },
        { id: "annecs", label: "ANNECS", sub: "solved novelty", x: 635, y: 300, w: 145, h: 56 }
      ],
      edges: [
        { from: "cppn", to: "envA" },
        { from: "cppn", to: "envB" },
        { from: "envA", to: "pop", label: "evaluate agents" },
        { from: "envB", to: "pop", label: "evaluate agents" },
        { from: "pop", to: "profile", label: "scores" },
        { from: "profile", to: "annecs", label: "novel + solved" }
      ],
      details: {
        cppn: "A CPPN maps coordinates to terrain heights; NEAT evolves the CPPN structure.",
        pop: "The same set of agents probes many environments.",
        profile: "If two environments rank agents differently, they are behaviorally different.",
        annecs: "A metric for accumulated open-ended innovation."
      }
    }
  },
  {
    id: "reflexion",
    year: "2023",
    title: "Reflexion",
    type: "Verbal reinforcement learning",
    mechanisms: ["Reflection", "Memory", "Evaluation"],
    background:
      "LLM agents often repeat mistakes across attempts because their model weights do not change.",
    problem:
      "How can an agent learn from failed attempts without fine-tuning the base model?",
    method: [
      "Run an actor LLM on a task.",
      "Collect feedback from an environment, tests, a heuristic, or an LLM critic.",
      "Use a reflection model to convert the trajectory and feedback into a concise natural-language lesson.",
      "Store that lesson in episodic memory and retrieve it as context in later trials."
    ],
    result:
      "Reflexion improved performance across sequential decision-making, QA, and coding-style settings by adding memory and reflection without weight updates.",
    limitation:
      "The memory can store bad lessons. It also depends on retrieving the right lessons at the right time.",
    implementation: `for trial in range(max_trials):
    trajectory = actor.solve(task, memory.retrieve(task))
    feedback = evaluator(trajectory)
    lesson = reflector(trajectory, feedback)
    memory.add(lesson)`,
    diagram: {
      title: "Failure becomes verbal memory",
      caption: "The important object stored is not a raw trace, but a lesson explaining what to change next time.",
      boxes: [],
      nodes: [
        { id: "task", label: "Task", sub: "new attempt", x: 85, y: 185, w: 100, h: 56 },
        { id: "actor", label: "Actor LLM", sub: "acts", x: 245, y: 185, w: 125, h: 62 },
        { id: "eval", label: "Evaluator", sub: "tests / critic", x: 420, y: 95, w: 130, h: 62 },
        { id: "reflect", label: "Reflection LLM", sub: "distills lesson", x: 600, y: 185, w: 145, h: 62 },
        { id: "memory", label: "Memory", sub: "lesson store", x: 420, y: 285, w: 130, h: 62 }
      ],
      edges: [
        { from: "task", to: "actor", label: "input" },
        { from: "actor", to: "eval", label: "trajectory" },
        { from: "eval", to: "reflect", label: "feedback" },
        { from: "actor", to: "reflect", label: "what happened" },
        { from: "reflect", to: "memory", label: "lesson" },
        { from: "memory", to: "actor", label: "retrieved context" }
      ],
      details: {
        actor: "The agent that tries to solve the task.",
        eval: "Can be an environment result, unit test, exact score, or LLM critic.",
        reflect: "Turns feedback into a reusable verbal rule.",
        memory: "Stores lessons such as: verify possession before using an object."
      }
    }
  },
  {
    id: "voyager",
    year: "2023",
    title: "Voyager",
    type: "Minecraft LLM agent",
    mechanisms: ["Memory", "Skill library", "Evaluation"],
    background:
      "Embodied agents need to accumulate reusable capabilities over long horizons, not solve isolated prompts.",
    problem:
      "How can an LLM agent continuously explore an open world, decide its own curriculum, and preserve useful behaviors?",
    method: [
      "Automatic curriculum proposes the next task from the current world state and progress.",
      "A skill manager retrieves relevant existing skills as context.",
      "An LLM writes code to solve the current task using APIs and retrieved skills.",
      "Execution feedback and errors are used to refine the code.",
      "Successful code is saved as a reusable skill in the skill library."
    ],
    result:
      "Voyager discovered more diverse Minecraft items and skills than baseline agents, showing that executable skill memory can accumulate capability.",
    limitation:
      "It needs a programmable environment, reliable success checks, and careful skill retrieval. Bad skills can pollute the library.",
    implementation: `task = curriculum(world_state, progress)
skills = skill_library.retrieve(task)
code = llm.write_code(task, skills, api_docs)

while not success:
    feedback = execute(code)
    code = llm.repair(code, feedback)

skill_library.add(name, code)`,
    diagram: {
      title: "LLM links functions to executable code",
      caption: "Voyager's memory is executable: named functions are retrieved and expanded into code blocks.",
      boxes: [
        { label: "Function table / skill library", x: 325, y: 45, w: 230, h: 290 }
      ],
      nodes: [
        { id: "state", label: "World state", sub: "inventory + nearby", x: 95, y: 185, w: 120, h: 62 },
        { id: "llm", label: "LLM controller", sub: "task + code", x: 230, y: 185, w: 135, h: 70 },
        { id: "f1", label: "mineWood()", sub: "function", x: 405, y: 95, w: 132, h: 46 },
        { id: "f2", label: "craftPickaxe()", sub: "function", x: 405, y: 185, w: 132, h: 46 },
        { id: "f3", label: "smeltOre()", sub: "function", x: 405, y: 275, w: 132, h: 46 },
        { id: "code", label: "Code block", sub: "JS program", x: 650, y: 185, w: 150, h: 92 },
        { id: "exec", label: "Execute", sub: "env/error feedback", x: 650, y: 315, w: 135, h: 58 }
      ],
      edges: [
        { from: "state", to: "llm" },
        { from: "llm", to: "f1" },
        { from: "llm", to: "f2" },
        { from: "llm", to: "f3" },
        { from: "f1", to: "code" },
        { from: "f2", to: "code" },
        { from: "f3", to: "code" },
        { from: "code", to: "exec" },
        { from: "exec", to: "llm", label: "errors + critique" },
        { from: "exec", to: "f2", label: "save verified", dashed: true }
      ],
      details: {
        llm: "Chooses goals, writes code, and repairs failed code.",
        f1: "A reusable function in the skill library.",
        f2: "Skills are callable behavior, not just verbal advice.",
        f3: "The library grows as the agent succeeds.",
        code: "The current generated program composed from API calls and skills.",
        exec: "The environment supplies success, failure, and execution errors."
      }
    }
  },
  {
    id: "stop",
    year: "2023/2024",
    title: "Self-Taught Optimizer (STOP)",
    type: "Recursive optimizer improvement",
    mechanisms: ["Evaluation", "Prompt / policy search", "Self-editing code"],
    background:
      "LLM scaffolds can improve programs under a utility function. STOP asks whether the scaffold itself can be improved the same way.",
    problem:
      "How can a system improve the optimizer/improver, not only the task solution?",
    method: [
      "Define an improver I that uses an LLM L to improve a solution artifact s according to utility u.",
      "Define meta_utility(I) as the average quality of solutions produced by improver I.",
      "Apply the improver to its own code: the improver becomes the solution artifact.",
      "Repeat for a bounded recursion depth or search budget."
    ],
    result:
      "STOP demonstrates practical recursive self-improvement of LLM scaffolds while keeping the underlying LLM fixed.",
    limitation:
      "The system is only as good as its evaluator and search budget. Recursive self-improvement can also overfit or create brittle scaffolds.",
    implementation: `utility(s) = score of solution s
meta_utility(I) = average utility(I(u, s, LLM))

I0 = seed_improver
I1 = I0(meta_utility, I0, LLM)
I2 = I1(meta_utility, I1, LLM)
I3 = I2(meta_utility, I2, LLM)`,
    diagram: {
      title: "The improver is the artifact being improved",
      caption: "Each generation uses the current improver to rewrite the next improver.",
      boxes: [],
      nodes: [
        { id: "llm", label: "LLM L", sub: "fixed model", x: 90, y: 95, w: 110, h: 56 },
        { id: "meta", label: "meta_utility", sub: "score improvers", x: 90, y: 320, w: 135, h: 56 },
        { id: "i0", label: "I0", sub: "seed improver", x: 255, y: 205, w: 140, h: 62 },
        { id: "i1", label: "I1", sub: "I0(meta, I0, L)", x: 455, y: 205, w: 150, h: 62 },
        { id: "i2", label: "I2", sub: "I1(meta, I1, L)", x: 665, y: 205, w: 150, h: 62 },
        { id: "i3", label: "I3 ...", sub: "I2(meta, I2, L)", x: 860, y: 205, w: 145, h: 62 }
      ],
      edges: [
        { from: "llm", to: "i0", label: "fixed L" },
        { from: "meta", to: "i0", label: "objective" },
        { from: "i0", to: "i1" },
        { from: "i1", to: "i2" },
        { from: "i2", to: "i3" }
      ],
      details: {
        i0: "The initial optimizer scaffold.",
        i1: "A modified optimizer, for example with better candidate search.",
        i2: "A later optimizer that may improve prompts, caching, beam search, or stopping rules.",
        meta: "Scores improvers by the average quality of the solutions they produce.",
        llm: "The base LLM remains fixed; the scaffold around it changes."
      }
    }
  },
  {
    id: "gptswarm",
    year: "2024",
    title: "GPTSwarm",
    type: "Language agents as optimizable graphs",
    mechanisms: ["Evaluation", "Prompt / policy search"],
    background:
      "Many agent systems are workflows: LLM calls, tools, memory, critics, and aggregators connected by communication paths.",
    problem:
      "How can the structure of a multi-agent workflow be optimized automatically instead of hand-designed?",
    method: [
      "Represent the swarm/agent as a graph.",
      "Nodes can be LLM calls, tools, RAG, memory retrieval, critics, code generation, or aggregation.",
      "Edges represent communication. Each edge has an inclusion probability.",
      "Sample graphs, run them on tasks, evaluate outputs, and update edge probabilities with reinforcement learning.",
      "Node prompts can also be optimized using local input/output history and graph-level feedback."
    ],
    result:
      "GPTSwarm shows that graph topology and node prompts can be treated as optimizable parts of an agent system.",
    limitation:
      "Credit assignment is hard: a node often only knows the final graph succeeded or failed, not whether that node was responsible.",
    implementation: `for trial in range(T):
    graph = sample_edges(edge_probabilities)
    output = run_graph(graph, task)
    reward = evaluate(output)
    update_edge_probs(graph.edges, reward)`,
    diagram: {
      title: "Agent graph with probabilistic edges",
      caption: "Edges have probabilities. Good sampled graphs increase probabilities for their used communication paths.",
      boxes: [
        { label: "Agent graph", x: 150, y: 45, w: 610, h: 300 }
      ],
      nodes: [
        { id: "task", label: "Task input", sub: "one request", x: 65, y: 195, w: 100, h: 52 },
        { id: "router", label: "Graph input", sub: "start node", x: 205, y: 195, w: 110, h: 54 },
        { id: "llm", label: "LLM", sub: "reason", x: 355, y: 105, w: 105, h: 54 },
        { id: "rag", label: "RAG", sub: "memory", x: 355, y: 285, w: 105, h: 54 },
        { id: "tool", label: "Tool", sub: "execute", x: 530, y: 105, w: 105, h: 54 },
        { id: "critic", label: "Critic", sub: "judge", x: 530, y: 285, w: 105, h: 54 },
        { id: "agg", label: "Aggregator", sub: "merge", x: 695, y: 195, w: 125, h: 56 },
        { id: "output", label: "Output", sub: "answer", x: 865, y: 195, w: 95, h: 52 }
      ],
      edges: [
        { from: "task", to: "router", label: "p=1.00" },
        { from: "router", to: "llm", label: "p=0.83" },
        { from: "router", to: "rag", label: "p=0.62" },
        { from: "llm", to: "tool", label: "p=0.74" },
        { from: "rag", to: "critic", label: "p=0.45" },
        { from: "tool", to: "critic", label: "p=0.58" },
        { from: "llm", to: "agg", label: "p=0.69" },
        { from: "critic", to: "agg", label: "p=0.81" },
        { from: "agg", to: "output", label: "p=1.00" }
      ],
      details: {
        task: "There is one external task input. GPTSwarm optimizes the internal graph that processes it.",
        router: "A start node inside the agent graph. From here, sampled edges decide which internal modules receive the task.",
        llm: "An LLM node with a prompt that can be optimized.",
        rag: "A retrieval or memory node.",
        tool: "A tool-call node such as search, file access, or code execution.",
        critic: "A judge/reflection node.",
        agg: "Combines selected node outputs into the final answer.",
        output: "Final graph output is evaluated."
      }
    }
  },
  {
    id: "adas",
    year: "2024",
    title: "ADAS / Meta Agent Search",
    type: "Automated design of agentic systems",
    mechanisms: ["Evaluation", "Prompt / policy search"],
    background:
      "Agent architectures are usually hand-designed: prompts, tools, control flow, reflection, debate, retrieval, and routing.",
    problem:
      "Can an LLM design stronger agent architectures automatically, using previous designs as inspiration?",
    method: [
      "A meta-agent writes candidate agents in code.",
      "Each candidate agent is evaluated on validation tasks.",
      "The candidate and score are stored in an archive.",
      "Later meta-agent calls see the archive and design new agents from prior discoveries."
    ],
    result:
      "ADAS demonstrated that an automated meta-agent can discover task-specific agent workflows that outperform several hand-designed baselines.",
    limitation:
      "The meta-agent and search procedure are still fixed. The quality of discovered agents depends heavily on evaluation tasks and archive quality.",
    implementation: `archive = []
for i in range(iterations):
    agent_code = meta_agent.design(task, archive)
    score = evaluate(agent_code)
    archive.append((agent_code, score))`,
    diagram: {
      title: "Meta-agent searches over agent designs",
      caption: "The archive stores previous agent designs and results as stepping stones.",
      boxes: [],
      nodes: [
        { id: "meta", label: "Meta-agent", sub: "writes agents", x: 120, y: 185, w: 130, h: 62 },
        { id: "code", label: "Agent code", sub: "candidate", x: 310, y: 95, w: 130, h: 62 },
        { id: "run", label: "Run agent", sub: "tasks", x: 500, y: 95, w: 120, h: 62 },
        { id: "eval", label: "Evaluator", sub: "score", x: 500, y: 275, w: 120, h: 62 },
        { id: "archive", label: "Archive", sub: "agent + score", x: 310, y: 275, w: 130, h: 62 }
      ],
      edges: [
        { from: "meta", to: "code" },
        { from: "code", to: "run", label: "execute" },
        { from: "run", to: "eval", label: "outputs" },
        { from: "eval", to: "archive", label: "store" },
        { from: "archive", to: "meta", label: "context" }
      ],
      details: {
        meta: "The LLM-based designer.",
        code: "A concrete agent workflow in code.",
        archive: "Prior discoveries used as stepping stones.",
        eval: "Validation tasks choose which designs look useful."
      }
    }
  },
  {
    id: "godel-agent",
    year: "2024",
    title: "Godel Agent",
    type: "Self-referential LLM agent",
    mechanisms: ["Evaluation", "Prompt / policy search", "Self-editing code"],
    background:
      "Meta-learning agents can improve their policy, but their update rule is usually fixed by humans.",
    problem:
      "Can an LLM agent update both its task-solving policy and the logic that updates the policy?",
    method: [
      "Represent the current solver/policy as pi.",
      "Represent the self-improvement logic as I.",
      "Evaluate the current solver to get feedback r.",
      "Use the current improvement logic and LLM to modify both pi and I.",
      "Implement self-awareness and self-modification through runtime code inspection and monkey patching."
    ],
    result:
      "The paper reports improvements on DROP, MGSM, MMLU, GPQA, and Game of 24 compared with fixed hand-designed agents and a meta-agent baseline.",
    limitation:
      "It is not formally proof-based. Self-modification can break the agent, especially if it damages the recursive improvement code.",
    implementation: `# Fixed meta-learning
pi_next = I(pi, r)

# Godel Agent
pi_next, I_next = I(pi, I, r, goal)`,
    diagram: {
      title: "Policy and improver update together",
      caption: "The system can change the solver and the optimization logic that changes the solver.",
      boxes: [],
      nodes: [
        { id: "pi", label: "Policy pi_t", sub: "solver", x: 120, y: 185, w: 120, h: 62 },
        { id: "env", label: "Evaluator", sub: "feedback r_t", x: 300, y: 95, w: 125, h: 62 },
        { id: "I", label: "Improver I_t", sub: "self-update logic", x: 500, y: 185, w: 140, h: 62 },
        { id: "goal", label: "Goal g", sub: "objective", x: 300, y: 285, w: 125, h: 62 },
        { id: "next", label: "pi_{t+1}, I_{t+1}", sub: "rewritten code", x: 715, y: 185, w: 155, h: 62 }
      ],
      edges: [
        { from: "pi", to: "env" },
        { from: "env", to: "I", label: "r_t" },
        { from: "goal", to: "I", label: "g" },
        { from: "pi", to: "I", label: "inspect pi_t" },
        { from: "I", to: "next", label: "rewrite both" },
        { from: "next", to: "pi", label: "next iteration", dashed: true }
      ],
      details: {
        pi: "The current task-solving agentic flow.",
        I: "The logic that decides how to improve the flow and itself.",
        env: "Validation feedback, score, or error traces.",
        next: "The new policy and new improvement logic."
      }
    }
  },
  {
    id: "dgm",
    year: "2025",
    title: "Darwin Godel Machine",
    type: "Open-ended self-modifying coding agents",
    mechanisms: ["Evaluation", "Prompt / policy search", "Self-editing code"],
    background:
      "Godel Machines require formal proof. Modern coding agents can instead validate changes empirically with benchmarks.",
    problem:
      "How can a self-modifying coding agent improve without getting stuck in one brittle lineage?",
    method: [
      "Start with a base coding agent and evaluate it.",
      "Store valid agents in an archive.",
      "Select parent agents from the archive using performance and underexplored-lineage pressure.",
      "A parent modifies a copy of its own codebase to create a child agent.",
      "Evaluate the child on coding benchmarks and keep it if it remains a valid code-editing agent."
    ],
    result:
      "DGM improved from 20.0% to 50.0% on SWE-bench and from 14.2% to 30.7% on full Polyglot. Ablations showed both self-improvement and open-ended archive search matter.",
    limitation:
      "The archive/search controller is fixed in this version. It is compute-heavy and benchmark optimization can create objective-hacking risks.",
    implementation: `archive = [(base_agent, evaluate(base_agent))]

for t in range(T):
    parent = select_parent(archive)
    child = parent.modify(copy(parent.codebase))
    score = evaluate(child)
    if child.is_valid_code_agent():
        archive.append((child, score))`,
    diagram: {
      title: "Archive box with a tree of agent versions",
      caption: "The parent is copied, modified, evaluated, then added to the archive if valid.",
      boxes: [
        { label: "Archive of valid coding agents", x: 105, y: 50, w: 650, h: 295 }
      ],
      nodes: [
        { id: "a0", label: "A0", sub: "base", x: 205, y: 105, w: 90, h: 54 },
        { id: "a1", label: "A1", sub: "tool edit", x: 360, y: 165, w: 90, h: 54 },
        { id: "a2", label: "A2", sub: "dip", x: 360, y: 285, w: 90, h: 54 },
        { id: "a3", label: "A3", sub: "retry flow", x: 530, y: 115, w: 100, h: 54 },
        { id: "a4", label: "A4", sub: "best", x: 530, y: 235, w: 100, h: 54 },
        { id: "eval", label: "Benchmark", sub: "valid + score", x: 790, y: 185, w: 120, h: 62 }
      ],
      edges: [
        { from: "a0", to: "a1", label: "copy + self-modify" },
        { from: "a0", to: "a2", label: "copy + self-modify" },
        { from: "a1", to: "a3", label: "descendant" },
        { from: "a2", to: "a4", label: "stepping stone" },
        { from: "a3", to: "eval", label: "evaluate" },
        { from: "a4", to: "eval", label: "evaluate" },
        { from: "eval", to: "a4", label: "keep if valid", dashed: true }
      ],
      details: {
        a0: "The initial coding agent.",
        a1: "A child with a codebase modification.",
        a2: "A lower-performing child may still be useful later.",
        a4: "A strong descendant from a branch.",
        eval: "Benchmarks estimate coding and self-modification ability."
      }
    }
  },
  {
    id: "alphaevolve",
    year: "2025",
    title: "AlphaEvolve",
    type: "Evaluator-guided program evolution",
    mechanisms: ["Evaluation", "Prompt / policy search"],
    background:
      "Many scientific and engineering discoveries can be represented as code and evaluated automatically.",
    problem:
      "How can LLM creativity be grounded enough to produce real algorithms, not just plausible text?",
    method: [
      "Human defines the problem, evaluator, initial program, and evolvable code blocks.",
      "A program database stores candidates, scores, outputs, and prior ideas.",
      "The prompt sampler builds rich prompts from a parent program, previous good programs, evaluation feedback, and optional human context.",
      "An LLM ensemble proposes diffs.",
      "Evaluators execute child programs and store results in the database."
    ],
    result:
      "AlphaEvolve improved state of the art for 14 matrix multiplication targets, found new mathematical constructions, and improved Google infrastructure such as scheduling, kernels, TPU circuit code, and compiler-generated code.",
    limitation:
      "It requires an automated evaluator. It mostly evolves target programs, not the AlphaEvolve agent itself.",
    implementation: `parent, inspirations = database.sample()
prompt = build_prompt(parent, inspirations, feedback)
diff = llm.generate(prompt)
child = apply_diff(parent, diff)
scores = evaluator.execute(child)
database.add(child, scores)`,
    diagram: {
      title: "Evaluator-grounded code evolution",
      caption: "The evaluator is the selection pressure. The database preserves useful old programs as future inspiration.",
      boxes: [],
      nodes: [
        { id: "human", label: "Human setup", sub: "problem + evaluator", x: 85, y: 215, w: 130, h: 62 },
        { id: "db", label: "Program database", sub: "parents + scores", x: 285, y: 215, w: 150, h: 62 },
        { id: "prompt", label: "Prompt sampler", sub: "context", x: 490, y: 85, w: 145, h: 62 },
        { id: "llm", label: "LLM ensemble", sub: "diffs", x: 745, y: 85, w: 140, h: 62 },
        { id: "child", label: "Child program", sub: "candidate", x: 745, y: 335, w: 140, h: 62 },
        { id: "eval", label: "Evaluator", sub: "execute + score", x: 490, y: 335, w: 145, h: 62 }
      ],
      edges: [
        { from: "human", to: "db" },
        { from: "db", to: "prompt", label: "parent + inspirations" },
        { from: "prompt", to: "llm" },
        { from: "llm", to: "child", label: "code diff" },
        { from: "child", to: "eval" },
        { from: "eval", to: "db", label: "scores + outputs" }
      ],
      details: {
        human: "Defines what counts as progress.",
        db: "Balances reusing strong programs and preserving diversity.",
        prompt: "Injects prior successes and feedback into the LLM context.",
        llm: "Proposes mutations without hand-written mutation operators.",
        eval: "Filters hallucinations by executing code."
      }
    }
  },
  {
    id: "hermes-agent-self-evolving",
    year: "2025",
    title: "Hermes Agent Self-Evolving",
    type: "DSPy + GEPA harness",
    mechanisms: ["Evaluation", "Prompt / policy search", "Skill library"],
    background:
      "The Hermes project frames self-evolution as optimizing an agent's prompts, skills, and tool descriptions inside a repeatable DSPy evaluation harness.",
    problem:
      "A scalar score alone tells you that an agent failed, but not which prompt phrase, tool description, or skill instruction caused the failure.",
    method: [
      "Define agent behavior as DSPy modules with inputs, outputs, tools, skills, and metrics.",
      "Run the module on examples and keep execution traces.",
      "Use GEPA to inspect traces, generate reflective feedback, and mutate prompts, skills, or tool descriptions.",
      "Keep variants that are strong on different slices of the task distribution instead of collapsing immediately to one average-score winner."
    ],
    result:
      "The repository proposes a practical self-evolution harness rather than a full benchmark paper. Its important contribution for this taxonomy is the trace-aware prompt/skill evolution loop.",
    limitation:
      "It is harness-level self-evolution: the optimizer, task set, metrics, and allowed mutation targets are still human-defined, and reported results are not as established as the peer-reviewed benchmark papers.",
    implementation: `module = DSPyAgent(signature, tools, skills)
examples = load_training_cases()
metric = task_metric

evolved_module = GEPA.compile(
    module,
    trainset=examples,
    metric=metric,
    reflect_on="execution_trace",
    mutation_targets=["instructions", "skills", "tool_descriptions"]
)

# Keep a Pareto pool, not just one winner:
# A may be best for coding, B for retrieval, C for tool use.`,
    diagram: {
      title: "Trace-aware prompt and skill evolution",
      caption: "DSPy supplies the runnable module and metric. GEPA reads traces, mutates instructions/skills/tool descriptions, then keeps diverse strong variants.",
      boxes: [
        { label: "DSPy harness", x: 110, y: 55, w: 330, h: 285 },
        { label: "GEPA evolution loop", x: 490, y: 55, w: 330, h: 285 }
      ],
      nodes: [
        { id: "module", label: "DSPy module", sub: "agent signature", x: 220, y: 115, w: 135, h: 58 },
        { id: "examples", label: "Examples", sub: "input/output", x: 220, y: 205, w: 120, h: 54 },
        { id: "metric", label: "Metric", sub: "score rule", x: 220, y: 295, w: 120, h: 54 },
        { id: "trace", label: "Execution trace", sub: "why it failed", x: 430, y: 205, w: 135, h: 58 },
        { id: "gepa", label: "GEPA", sub: "reflect + mutate", x: 600, y: 205, w: 120, h: 58 },
        { id: "variants", label: "Variant pool", sub: "Pareto front", x: 760, y: 115, w: 130, h: 58 },
        { id: "deploy", label: "Evolved agent", sub: "best fit", x: 760, y: 295, w: 130, h: 58 }
      ],
      edges: [
        { from: "module", to: "trace" },
        { from: "examples", to: "trace" },
        { from: "metric", to: "trace" },
        { from: "trace", to: "gepa", label: "reflect" },
        { from: "gepa", to: "variants", label: "mutate" },
        { from: "variants", to: "module", label: "try again", dashed: true },
        { from: "variants", to: "deploy", label: "select" }
      ],
      details: {
        module: "DSPy turns the agent into an optimizable program: inputs, outputs, internal prompts, skills, and optional tools are explicit.",
        examples: "The harness needs examples or tasks to expose failure modes. Without examples, there is no grounded pressure for evolution.",
        metric: "The metric is the task score. GEPA uses it together with traces so optimization is not blind scalar hill-climbing.",
        trace: "This is the key difference from simple prompt search: the system inspects intermediate reasoning, tool calls, and errors to decide what to mutate.",
        gepa: "GEPA produces reflective feedback and genetic-style mutations over prompts, skills, and tool descriptions.",
        variants: "Keeping diverse strong variants means preserving agents that win on different slices, even if none is the single best average performer.",
        deploy: "The final selected module can be a single best variant or a routed collection of variants."
      }
    }
  }
];

const resultRows = {
  "godel-machines": [
    { metric: "Result type", value: "Theoretical", note: "Proof-gated recursive self-improvement; no benchmark suite." }
  ],
  poet: [
    { metric: "Run scale", value: "25,200 iterations", note: "Three runs, 20 active environments, about 10 days on 256 CPU cores." },
    { metric: "Solve effort", value: "638 / 1,180 / 2,178", note: "Mean POET iterations for challenging / very challenging / extremely challenging environments." },
    { metric: "Transfer value", value: "p < 2.2e-16", note: "POET with transfer covered significantly more environment space than POET without transfer." },
    { metric: "Transfer example", value: "309 -> 349", note: "Backward transfer improved the parent flat-ground gait score." }
  ],
  "enhanced-poet": [
    { metric: "Run scale", value: "60,000 iterations", note: "Population size 40 active environments." },
    { metric: "Compute", value: "12 days / 750 CPU cores", note: "Reported for a 60,000-iteration run." },
    { metric: "Original POET ANNECS", value: "plateaus ~20k", note: "Fixed encoding gradually runs out of novelty." },
    { metric: "Enhanced POET ANNECS", value: "continues past 30k", note: "CPPN + PATA-EC keep generating solved novel environments longer." }
  ],
  reflexion: [
    { metric: "HumanEval Python", value: "91.0% pass@1", note: "Compared with GPT-4 baseline 80.1% in the paper table." },
    { metric: "HumanEval Rust", value: "68.0%", note: "Compared with GPT-4 baseline 60.0%." },
    { metric: "ALFWorld", value: "130 / 134", note: "ReAct + Reflexion completed 130 tasks." },
    { metric: "Reported gains", value: "+22% / +20%", note: "Decision-making and HotPotQA improvements reported in the intro." }
  ],
  voyager: [
    { metric: "Novel items", value: "3.3x", note: "More unique Minecraft items than prior SOTA." },
    { metric: "Tech tree", value: "15.3x faster", note: "Wooden level; stone 8.5x, iron 6.4x, only Voyager reached diamond." },
    { metric: "Exploration", value: "2.3x", note: "Longer traversed distances than baselines." },
    { metric: "Skill retrieval eval", value: "309 samples", note: "Paper appendix evaluates retrieval accuracy over stored skills." }
  ],
  stop: [
    { metric: "Self-improvement rounds", value: "1-3", note: "Meta-utility improved over early recursive rounds in reported curves." },
    { metric: "GPT-3.5 robustness", value: "12%", note: "Runs yielding at least a 3% improvement." },
    { metric: "Safety signal", value: "<1%", note: "Low but non-zero unsandboxing attempts in 10,000 improvements." }
  ],
  gptswarm: [
    { metric: "Mini Crosswords", value: "0.800 ± 0.0616", note: "Optimized GPTSwarm with GPT-4-Turbo; TOT GPT-4 baseline 0.675." },
    { metric: "HumanEval edge opt", value: "0.465 -> 0.575", note: "Initial edge distribution to optimized distribution." },
    { metric: "HumanEval node opt", value: "0.668 ± 0.0060", note: "After node prompt optimization following edge optimization." },
    { metric: "GAIA average", value: "18.45", note: "GPTSwarm vs GPT-4-Turbo 9.70 average in Table 1." }
  ],
  adas: [
    { metric: "DROP / reading", value: "79.4 ± 0.8", note: "Meta Agent Search vs best hand-designed 65.8 ± 0.9." },
    { metric: "MGSM / math", value: "53.4 ± 3.5", note: "Compared with LLM Debate 39.0 ± 3.4." },
    { metric: "MMLU", value: "69.6 ± 3.2", note: "Compared with prompt optimization 67.6 ± 3.2." },
    { metric: "GPQA", value: "34.6 ± 3.2", note: "Compared with prompt optimization 32.9 ± 3.2." }
  ],
  "godel-agent": [
    { metric: "DROP", value: "90.5 ± 1.8", note: "Godel-free, compared with CoT 64.2 ± 0.9." },
    { metric: "MGSM", value: "90.6 ± 2.0", note: "Compared with CoT 28.0 ± 3.1." },
    { metric: "MMLU", value: "87.9 ± 2.2", note: "Compared with CoT 65.4 ± 3.3." },
    { metric: "GPQA", value: "55.7 ± 3.1", note: "Compared with CoT 29.2 ± 3.1." }
  ],
  dgm: [
    { metric: "SWE-bench", value: "20.0% -> 50.0%", note: "Base agent to DGM." },
    { metric: "Polyglot full", value: "14.2% -> 30.7%", note: "Full benchmark improvement." },
    { metric: "Polyglot subset", value: "14.0% -> 38.0%", note: "Subset used in ablation table." },
    { metric: "Claude 3.7 transfer", value: "19.0% -> 59.5%", note: "DGM improvements transfer to stronger base model." }
  ],
  alphaevolve: [
    { metric: "Matrix multiplication", value: "14 / 54", note: "Surpassed SOTA targets; matched 38, fell behind 2." },
    { metric: "4x4 complex matmul", value: "48 multiplications", note: "Improvement in a long-studied setting." },
    { metric: "Gemini kernels", value: "+23%", note: "Average kernel speedup; about 1% training-time reduction." },
    { metric: "Data center scheduling", value: "+0.7%", note: "Average fleet-wide compute resources recovered." }
  ],
  "hermes-agent-self-evolving": [
    { metric: "Artifact type", value: "Repository / harness", note: "Not a peer-reviewed benchmark paper in this note set." },
    { metric: "Core loop", value: "DSPy + GEPA", note: "Optimize prompts, skills, and tool descriptions from traces." },
    { metric: "Selection", value: "Pareto variants", note: "Keep diverse strong variants instead of only one scalar winner." }
  ]
};

const formulaSnippets = {
  "godel-machines": `Proof gate:
execute(rewrite) only if a proof shows:
ExpectedUtility(after rewrite) > ExpectedUtility(continue current proof search)

Rewrite targets:
problem_solver, proof_searcher, axioms, utility_function, resource_allocation`,
  poet: `Novelty score:
N(E, L) = (1 / k) * sum_{i=1..k} || e(E) - e(E_i) ||_2

Minimal criterion:
reject if score(child_agent, child_env) is too low or too high`,
  "enhanced-poet": `PATA-EC idea:
environment_vector(E) = rank_normalize([
    score(agent_1, E), score(agent_2, E), ..., score(agent_n, E)
])

ANNECS:
count environments that are both novel and solved by the system`,
  reflexion: `Verbal RL loop:
trajectory = Actor(task, memory)
feedback = Evaluator(trajectory)
reflection = SelfReflection(feedback, trajectory)
memory.append(reflection)`,
  voyager: `Skill loop:
task = curriculum_agent(world_state, progress)
code = action_agent(task, retrieve(skill_library))
feedback = minecraft.execute(code)
if success: skill_library.add(code)`,
  stop: `Self-improving optimizer:
I_t := I_{t-1}(meta_utility, I_{t-1}, LLM)

meta_utility(I) = average_{task in eval_set} utility(I(utility, seed_solution, LLM))`,
  gptswarm: `Edge optimization objective:
maximize E_{G ~ D_theta}[reward(run(G, task))]

REINFORCE-style update:
grad_theta J ~= (R - baseline) * grad_theta log P_theta(sampled_graph)`,
  adas: `Meta Agent Search:
A_i = MetaAgent(task, archive_{i-1})
score_i = Evaluate(A_i)
archive_i = archive_{i-1} union {(A_i, score_i, trace_i)}`,
  "godel-agent": `Meta-learning agent:
pi_{t+1} = I(pi_t, r_t)

Godel Agent:
pi_{t+1}, I_{t+1} = I_t(pi_t, I_t, r_t, g)`,
  dgm: `Open-ended self-modification:
parent = select(archive)
child = parent.modify(copy(parent.codebase), feedback)
if valid(child) and score(child) is acceptable:
    archive.add(child)`,
  alphaevolve: `Evaluator-guided evolution:
parent_program, inspirations = database.sample()
prompt = prompt_sampler(problem, parent_program, inspirations, feedback)
child_program = apply_diff(parent_program, LLM(prompt))
database.add(child_program, evaluator(child_program))`,
  "hermes-agent-self-evolving": `DSPy + GEPA:
module + examples + metric + traces
    -> GEPA(reflect, mutate)
    -> Pareto pool of prompt/skill/tool variants`
};

papers.forEach((paper) => {
  paper.results = resultRows[paper.id] || [];
  if (formulaSnippets[paper.id]) {
    paper.implementation = `${formulaSnippets[paper.id]}\n\nImplementation skeleton:\n${paper.implementation}`;
  }
});

const auditedContent = window.paperAudits || {};
papers.forEach((paper) => {
  const audit = auditedContent[paper.id];
  if (!audit) return;

  const originalDiagram = paper.diagram;
  Object.assign(paper, audit);
  paper.diagram = originalDiagram;
  paper.diagram.details = {
    ...(originalDiagram.details || {}),
    ...(audit.diagramDetails || {})
  };
  paper.diagram.walkthrough = audit.walkthrough || originalDiagram.nodes.map((node) => node.id);
});

const overviewPage = {
  id: "overview",
  year: "START",
  title: "总览脉络图",
  isOverview: true
};

const pages = [overviewPage, ...papers];

const paperSources = {
  "godel-machines": [
    { label: "arXiv: cs/0309048", url: "https://arxiv.org/abs/cs/0309048" }
  ],
  poet: [
    { label: "arXiv: 1901.01753", url: "https://arxiv.org/abs/1901.01753" }
  ],
  "enhanced-poet": [
    { label: "arXiv: 2003.08536", url: "https://arxiv.org/abs/2003.08536" }
  ],
  reflexion: [
    { label: "arXiv: 2303.11366", url: "https://arxiv.org/abs/2303.11366" }
  ],
  voyager: [
    { label: "arXiv: 2305.16291", url: "https://arxiv.org/abs/2305.16291" }
  ],
  stop: [
    { label: "arXiv: 2310.02304", url: "https://arxiv.org/abs/2310.02304" }
  ],
  gptswarm: [
    { label: "arXiv: 2402.16823", url: "https://arxiv.org/abs/2402.16823" }
  ],
  adas: [
    { label: "arXiv: 2408.08435", url: "https://arxiv.org/abs/2408.08435" }
  ],
  "godel-agent": [
    { label: "arXiv: 2410.04444", url: "https://arxiv.org/abs/2410.04444" }
  ],
  dgm: [
    { label: "arXiv: 2505.22954", url: "https://arxiv.org/abs/2505.22954" }
  ],
  alphaevolve: [
    { label: "arXiv: 2506.13131", url: "https://arxiv.org/abs/2506.13131" }
  ],
  "hermes-agent-self-evolving": [
    { label: "Related arXiv: GEPA 2507.19457", url: "https://arxiv.org/abs/2507.19457" },
    { label: "Hermes project repository", url: "https://github.com/NousResearch/hermes-agent-self-evolution" }
  ]
};

papers.forEach((paper) => {
  paper.sources = paperSources[paper.id] || [];
});

const overviewPapersZh = {
  "godel-machines": {
    mechanism: "用形式化证明作为自我重写的门槛",
    contribution: "第一次把 problem solver、proof searcher、utility 与可重写系统放进同一个递归自改框架。",
    route: "形式化自修改 → 后来的经验式自修改"
  },
  poet: {
    mechanism: "共同进化 environment-agent pairs",
    contribution: "把“能力提升”从单个固定任务，扩展成持续创造问题、解法与阶段性成果的开放式搜索。",
    route: "环境进化 → 分支 archive 与阶段性成果"
  },
  "enhanced-poet": {
    mechanism: "用 agent population 的表现刻画环境新颖度",
    contribution: "让 novelty 不再依赖手写环境参数，并用 CPPN/NEAT 扩展可生成环境。",
    route: "领域特定 novelty → 行为式、较通用的 novelty"
  },
  reflexion: {
    mechanism: "把失败轨迹压缩成自然语言反思并写入记忆",
    contribution: "说明 LLM agent 不改模型权重，也能跨尝试积累可复用经验。",
    route: "稀疏分数 → 可读的 verbal feedback → 下一次行为"
  },
  voyager: {
    mechanism: "把成功行为保存成可执行代码技能",
    contribution: "从“记住教训”推进到“积累能直接调用的能力”，并让 agent 自己提出下一项任务。",
    route: "反思记忆 → executable skill library"
  },
  stop: {
    mechanism: "把 improver 本身作为待优化 artifact",
    contribution: "从改善任务答案，升级为改善生成答案的搜索、提示、预算与候选选择机制。",
    route: "solution optimization → optimizer self-improvement"
  },
  gptswarm: {
    mechanism: "搜索 agent graph 的概率边与 LLM node prompt",
    contribution: "把可进化对象扩展到多节点、多 Agent 的通信拓扑和局部提示。",
    route: "单一流程 → probabilistic agent graph"
  },
  adas: {
    mechanism: "Meta-agent 编写、评估并归档新的 Agent 系统",
    contribution: "把 Agent workflow 当成代码搜索空间，让先前设计成为下一轮设计的阶段性成果。",
    route: "prompt search → whole-agent design search"
  },
  "godel-agent": {
    mechanism: "同时修改 task policy 与 improver",
    contribution: "把固定 meta-optimizer 改成能读取自身代码和运行反馈的递归优化器。",
    route: "fixed improver → self-referential improver"
  },
  dgm: {
    mechanism: "保留多条 agent lineage，并经验式选择 parent",
    contribution: "不只留下当前最优版本；有效但暂时较弱的 child 也可成为未来开放式探索的阶段性成果。",
    route: "单线自编辑 → archive-based agent evolution"
  },
  alphaevolve: {
    mechanism: "LLM ensemble + evaluator + program database",
    contribution: "把 archive-based evolution 扩展到大型程序与算法，通过可靠 evaluator 长时间累积改进。",
    route: "agent evolution → general program evolution"
  },
  "hermes-agent-self-evolving": {
    mechanism: "GEPA 从完整 trace 反思并进化 prompt/skill",
    contribution: "把 scalar score 与可读执行证据结合，用 Pareto variants 和 regression gate 管理部署。",
    route: "manual instructions → trace-aware prompt/skill evolution"
  }
};

const overviewPapersEn = {
  "godel-machines": { mechanism: "Formal proof gates every self-rewrite.", contribution: "It places the problem solver, proof searcher, utility, and editable system inside one recursive architecture.", route: "Formal self-modification → empirical self-modification" },
  poet: { mechanism: "Co-evolve environment-agent pairs.", contribution: "Capability growth expands from one fixed task to an open-ended search for problem-solution stepping stones.", route: "Environment evolution → branching archives and stepping stones" },
  "enhanced-poet": { mechanism: "Measure novelty through agent-population behavior.", contribution: "Novelty no longer depends on a hand-written environment vector, while CPPN/NEAT broadens generation.", route: "Domain-specific novelty → behavioral novelty" },
  reflexion: { mechanism: "Distill failed trajectories into verbal memory.", contribution: "An LLM agent can accumulate reusable experience across attempts without updating model weights.", route: "Sparse score → verbal feedback → next attempt" },
  voyager: { mechanism: "Store successful behavior as executable code skills.", contribution: "Learning progresses from remembering lessons to accumulating capabilities that can be called and composed.", route: "Reflective memory → executable skill library" },
  stop: { mechanism: "Treat the improver itself as the artifact to optimize.", contribution: "The system improves the search, prompts, budget, and candidate selection that produce solutions.", route: "Solution optimization → optimizer self-improvement" },
  gptswarm: { mechanism: "Optimize probabilistic graph edges and LLM-node prompts.", contribution: "The editable object expands to multi-node and multi-agent communication structure.", route: "Single workflow → probabilistic agent graph" },
  adas: { mechanism: "A meta-agent writes, evaluates, and archives agent systems.", contribution: "Whole agent workflows become a code search space, with earlier designs serving as stepping stones.", route: "Prompt search → whole-agent design search" },
  "godel-agent": { mechanism: "Jointly rewrite the task policy and improver.", contribution: "A fixed meta-optimizer becomes a recursive optimizer that can inspect its own runtime code.", route: "Fixed improver → self-referential improver" },
  dgm: { mechanism: "Preserve multiple agent lineages and select parents empirically.", contribution: "Valid but temporarily weaker children can survive as future stepping stones instead of being discarded greedily.", route: "Single-line self-editing → archive-based agent evolution" },
  alphaevolve: { mechanism: "Combine an LLM ensemble, evaluator, and program database.", contribution: "Archive-based evolution scales to programs and algorithms with reliable automatic evaluation.", route: "Agent evolution → general program evolution" },
  "hermes-agent-self-evolving": { mechanism: "Use GEPA to reflect on complete traces and evolve prompts or skills.", contribution: "Scalar scores and readable execution evidence are combined with Pareto variants and regression gates.", route: "Manual instructions → trace-aware prompt/skill evolution" }
};

const uiText = {
  zh: {
    overviewNav: "总览脉络图",
    overviewProgress: "总览",
    papers: "篇论文",
    previousArticle: "上一篇论文",
    nextArticle: "下一篇论文",
    sourceMap: "原文位置",
    paperSources: "论文来源",
    backgroundProblem: "背景与问题",
    background: "背景",
    problem: "问题",
    results: "结果与 Benchmark",
    methods: "方法流程",
    nextStep: "下一步",
    expandGraph: "全屏查看",
    exitGraph: "退出全屏",
    limitations: "局限性",
    formulaImplementation: "公式与实现框架",
    runnableSkeleton: "实现骨架",
    buildChecklist: "实现检查清单",
    noBenchmark: "该工作没有以实证 benchmark table 作为主要贡献。",
    step: "步骤",
    of: "/",
    methodComponent: "方法组件",
    detail: "详情",
    graphFallback: "该节点是 self-evolution 流程的一部分。",
    graphLegend: "节点颜色图例",
    nodeKinds: {
      input: "输入 / 环境",
      agent: "Agent / Solver",
      evaluator: "Evaluator / Utility",
      optimizer: "Optimizer / Improver",
      memory: "Archive / Memory",
      code: "Code / Artifact",
      output: "输出 / 选中结果",
      reject: "拒绝 / 过滤",
      generator: "Generator / Mutation"
    }
  },
  en: {
    overviewNav: "Overview Map",
    overviewProgress: "Overview",
    papers: "papers",
    previousArticle: "Previous article",
    nextArticle: "Next article",
    sourceMap: "Source map",
    paperSources: "Paper sources",
    backgroundProblem: "Background + Problem",
    background: "Background",
    problem: "Problem",
    results: "Results / Benchmarks",
    methods: "Methods",
    nextStep: "Next step",
    expandGraph: "Expand graph",
    exitGraph: "Exit full view",
    limitations: "Limitations",
    formulaImplementation: "Formulae + Implementation Sketch",
    runnableSkeleton: "Runnable skeleton",
    buildChecklist: "Build checklist",
    noBenchmark: "No empirical benchmark table is central to this work.",
    step: "Step",
    of: "of",
    methodComponent: "Method component",
    detail: "Detail",
    graphFallback: "This node is part of the paper's self-evolution flow.",
    graphLegend: "Node color legend",
    nodeKinds: {
      input: "Input / environment",
      agent: "Agent / solver",
      evaluator: "Evaluator / utility",
      optimizer: "Optimizer / improver",
      memory: "Archive / memory",
      code: "Code / artifact",
      output: "Output / selected result",
      reject: "Rejected / filtered",
      generator: "Generator / mutation"
    }
  }
};

function loadLanguagePreference() {
  try {
    return localStorage.getItem("selfEvolvingAgentsLanguage") || "zh";
  } catch {
    return "zh";
  }
}

let currentLanguage = loadLanguagePreference();

function t(key) {
  return uiText[currentLanguage]?.[key] || uiText.en[key] || key;
}

function lang(zh, en) {
  return currentLanguage === "zh" ? zh : en;
}

function localizedPaper(basePaper) {
  if (!basePaper || basePaper.isOverview || currentLanguage === "en") return basePaper;
  const localized = window.paperAuditsZh?.[basePaper.id];
  if (!localized) return basePaper;

  return {
    ...basePaper,
    ...localized,
    results: (basePaper.results || []).map((row, index) => ({
      ...row,
      ...(localized.results?.[index] || {})
    })),
    formulae: (basePaper.formulae || []).map((formula, index) => ({
      ...formula,
      ...(localized.formulae?.[index] || {})
    })),
    diagram: {
      ...basePaper.diagram,
      title: localized.diagramTitle || basePaper.diagram.title,
      caption: localized.diagramCaption || basePaper.diagram.caption,
      details: {
        ...(basePaper.diagram.details || {}),
        ...(localized.diagramDetails || {})
      }
    }
  };
}

let currentIndex = 0;
let activeNode = null;
let dragState = null;

const articleEl = document.getElementById("article");
const timelineEl = document.getElementById("timeline");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const languageSwitch = document.getElementById("languageSwitch");

function init() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  renderTimeline();
  const hashIndex = pages.findIndex((item) => `#${item.id}` === window.location.hash);
  currentIndex = hashIndex >= 0 ? hashIndex : 0;
  render();
  prevBtn.addEventListener("click", () => goTo(currentIndex - 1));
  nextBtn.addEventListener("click", () => goTo(currentIndex + 1));
  languageSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-language]");
    if (!button || button.dataset.language === currentLanguage) return;
    setLanguage(button.dataset.language);
  });
  window.addEventListener("hashchange", () => {
    const hashIndex = pages.findIndex((item) => `#${item.id}` === window.location.hash);
    if (hashIndex >= 0 && hashIndex !== currentIndex) {
      currentIndex = hashIndex;
      render();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isGraphExpanded()) {
      event.preventDefault();
      setGraphExpanded(false);
      return;
    }
    if (isGraphExpanded()) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepNode();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepNode(-1);
      }
      return;
    }
    if (event.key === "ArrowRight") goTo(currentIndex + 1);
    if (event.key === "ArrowLeft") goTo(currentIndex - 1);
  });
  window.addEventListener("pointermove", handleDiagramPointerMove, { passive: false });
  window.addEventListener("pointerup", endDiagramDrag);
  window.addEventListener("pointercancel", endDiagramDrag);
}

function setLanguage(language) {
  if (!uiText[language]) return;
  currentLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  try {
    localStorage.setItem("selfEvolvingAgentsLanguage", language);
  } catch {
    // The toggle still works when storage is unavailable.
  }
  renderTimeline();
  render();
}

function renderTimeline() {
  timelineEl.innerHTML = "";
  pages.forEach((paper, index) => {
    const timelinePaper = localizedPaper(paper);
    const button = document.createElement("button");
    button.className = `timeline-button${paper.isOverview ? " overview-link" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="timeline-year">${paper.isOverview ? "START" : paper.year}</span>
      <span class="timeline-title">${paper.isOverview ? t("overviewNav") : paper.title}</span>
      <span class="timeline-summary">${paper.isOverview ? lang("发展路线总览", "Development map") : timelinePaper.type}</span>
    `;
    button.addEventListener("click", () => goTo(index));
    timelineEl.appendChild(button);
  });
}

function render() {
  const basePaper = pages[currentIndex];
  const paper = localizedPaper(basePaper);
  endDiagramDrag();
  clearGraphInertState();
  document.body.classList.remove("graph-view-open");
  window.location.hash = paper.id;
  document.title = `${paper.title} - Self-Evolving Agents`;

  progressText.textContent = paper.isOverview
    ? `${t("overviewProgress")} · ${papers.length} ${t("papers")}`
    : `${currentIndex} / ${papers.length} ${t("papers")}`;
  progressBar.style.width = `${(currentIndex / papers.length) * 100}%`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === pages.length - 1;

  let activeTimelineButton = null;
  document.querySelectorAll(".timeline-button").forEach((button, index) => {
    button.classList.toggle("active", index === currentIndex);
    if (index === currentIndex) activeTimelineButton = button;
  });
  if (activeTimelineButton) {
    const centerTimelineSelection = () => {
      if (!activeTimelineButton.isConnected) return;
      const wideTimeline = window.matchMedia("(min-width: 901px)").matches;
      if (wideTimeline) {
        const rail = activeTimelineButton.closest(".rail");
        if (rail) {
          rail.scrollTop = activeTimelineButton.offsetTop
            - (rail.clientHeight - activeTimelineButton.offsetHeight) / 2;
        }
      } else {
        timelineEl.scrollLeft = activeTimelineButton.offsetLeft
          - (timelineEl.clientWidth - activeTimelineButton.offsetWidth) / 2;
      }
    };
    centerTimelineSelection();
    requestAnimationFrame(centerTimelineSelection);
  }
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  prevBtn.setAttribute("aria-label", t("previousArticle"));
  nextBtn.setAttribute("aria-label", t("nextArticle"));
  languageSwitch.setAttribute("aria-label", currentLanguage === "zh" ? "语言" : "Language");

  if (paper.isOverview) {
    renderOverview();
    return;
  }

  activeNode = (paper.diagram.walkthrough || paper.diagram.nodes.map((node) => node.id))[0];

  articleEl.innerHTML = `
    <section class="paper-hero paper-metadata-hero">
      <h2>${paper.title}</h2>
      <p class="paper-byline">${paper.type}</p>
      <div class="paper-meta-row">
        <span>${paper.year}</span>
        <span class="meta-divider" aria-hidden="true">|</span>
        <div class="paper-source-links" aria-label="${t("paperSources")}">
          ${paper.sources.map((source) => `
            <a class="paper-source-link" href="${source.url}" target="_blank" rel="noopener noreferrer">
              <span>${source.label}</span><span aria-hidden="true">↗</span>
            </a>
          `).join("")}
        </div>
      </div>
      <p class="source-map">${t("sourceMap")}: ${paper.sourceMap || "paper method and experiments"}</p>
    </section>

    <section class="teaching-layout">
      ${backgroundProblemCard(paper)}
      ${resultCard(t("results"), paper.resultSummary || "", paper.results || [])}

      <aside id="methodGraphPanel" class="diagram-panel" aria-label="${paper.title} method graph">
        <div class="diagram-head">
          <div>
            <p class="section-label">${t("methods")}</p>
            <h3>${paper.diagram.title}</h3>
          </div>
          <div class="diagram-actions">
            <button id="stepBtn" class="small-button" type="button">${t("nextStep")}</button>
            <button
              id="expandGraphBtn"
              class="small-button"
              type="button"
              aria-controls="methodGraphPanel"
              aria-expanded="false"
            >${t("expandGraph")}</button>
          </div>
        </div>
        <div id="diagramCanvas" class="diagram-canvas"></div>
        ${diagramLegend(paper)}
        <p class="diagram-caption">${paper.diagram.caption}</p>
        <div class="detail-box">
          <p id="detailStep" class="detail-step"></p>
          <p id="detailTitle" class="detail-title"></p>
          <p id="detailText" class="detail-text"></p>
        </div>
      </aside>

      ${formulaImplementationCard(paper)}
      ${listCard(t("limitations"), paper.limitations || [paper.limitation], false, "limitations-card")}
    </section>
    ${stopImproverExample(paper)}
  `;

  drawDiagram(paper);
  updateDetail();
  document.getElementById("stepBtn").addEventListener("click", () => stepNode());
  document.getElementById("expandGraphBtn").addEventListener("click", () => {
    setGraphExpanded(!isGraphExpanded());
  });
  initStopImproverExample(paper);
  typesetMath();
}

function renderOverview() {
  const copy = currentLanguage === "zh" ? {
    badge: "总览",
    title: "自进化 Agent 的发展路线",
    subtitle: "研究重点逐渐从“怎样证明一次自我修改安全”，走向“怎样用反馈、记忆、搜索、archive 和 evaluator 持续产生更强的 Agent 或程序”。",
    relationNote: "图中的箭头表示概念演进，不表示论文之间一定存在直接引用关系。",
    mapTitle: "五个关键能力扩展",
    mapHelp: "点击论文节点查看它在路线中新增了什么，再进入对应论文。",
    phases: [
      ["形式化自修改", "证明后才重写"],
      ["开放式探索的阶段性成果", "任务与解法共同进化"],
      ["经验写入上下文", "反思与代码技能"],
      ["优化器与架构搜索", "搜索怎样解决问题"],
      ["经验式群体进化", "archive + evaluator"]
    ],
    noveltyEdge: "更通用的 novelty",
    memoryEdge: "经验载体变强",
    columnNotes: ["形式证明决定|是否允许重写", "阶段性成果构成|渐进式课程", "无需更新权重|也能积累能力", "优化对象从答案|扩展到工作流", "多样性避免|局限于单一路线"],
    chainTitle: "进化链",
    axisLabels: ["修改目标", "修改准入标准", "探索方式"],
    axisValues: [
      ["单次答案", "记忆 / 技能", "Prompt / Workflow", "Improver / Codebase"],
      ["形式化证明", "奖励 / 测试", "Meta-utility", "Pareto / 回归门槛"],
      ["单次重写", "探索的阶段性成果", "搜索 Agent 设计", "Archive + 多样化路线"]
    ],
    typeLabel: "自进化 Agent 发展脉络",
    timelineLabel: "发展时间线"
  } : {
    badge: "Overview",
    title: "How Self-Evolving Agents Developed",
    subtitle: "The field moves from proving that a self-rewrite is safe toward using feedback, memory, search, archives, and evaluators to continually produce stronger agents or programs.",
    relationNote: "Arrows show conceptual development, not necessarily direct citation relationships between papers.",
    mapTitle: "Five major capability expansions",
    mapHelp: "Select a paper to see what capability it added, then open the full article page.",
    phases: [
      ["Formal self-|modification", "rewrite only after proof"],
      ["Open-ended|stepping stones", "co-evolve tasks and solutions"],
      ["Experience in context", "reflection and code skills"],
      ["Optimizer and|architecture search", "search how problems are solved"],
      ["Empirical population|evolution", "archive + evaluator"]
    ],
    noveltyEdge: "more general novelty",
    memoryEdge: "stronger experience artifact",
    columnNotes: ["formal proof|gates every rewrite", "stepping stones|form the curriculum", "learn without|weight updates", "optimize workflows|and optimizers", "preserve diverse|lineages"],
    chainTitle: "Evolution chain",
    axisLabels: ["Modification target", "Acceptance criterion", "Exploration strategy"],
    axisValues: [
      ["One answer", "Memory / Skills", "Prompt / Workflow", "Improver / Codebase"],
      ["Formal proof", "Reward / Test", "Meta-utility", "Pareto / Regression gates"],
      ["One rewrite", "Stepping stones", "Search over agents", "Archive + diverse lineages"]
    ],
    typeLabel: "Self-Evolving Agent Development Map",
    timelineLabel: "Development timeline"
  };

  articleEl.innerHTML = `
    <section class="paper-hero overview-hero">
      <div class="article-kicker">
        <span class="year-pill">${copy.badge}</span>
        <span class="type-pill">${copy.typeLabel}</span>
      </div>
      <h2>${copy.title}</h2>
      <p class="subtitle">${copy.subtitle}</p>
      <p class="source-map">${copy.relationNote}</p>
    </section>

    <section class="overview-map" aria-labelledby="overviewMapTitle">
      <div class="overview-map-head">
        <div>
          <p class="section-label">${copy.timelineLabel}</p>
          <h3 id="overviewMapTitle">${copy.mapTitle}</h3>
        </div>
        <p>${copy.mapHelp}</p>
      </div>

      <div class="overview-canvas">
        <svg class="overview-svg" viewBox="0 0 1240 650" role="img" aria-labelledby="overviewSvgTitle overviewSvgDesc">
          <title id="overviewSvgTitle">Self-evolving agent development timeline</title>
          <desc id="overviewSvgDesc">A five-stage flow from formal proof-gated self-rewriting to archive-based empirical evolution of agents, programs, prompts, and skills.</desc>
          <defs>
            <marker id="overviewArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z"></path>
            </marker>
          </defs>

          ${overviewPhase(25, 1, "2003/07", copy.phases[0][0], copy.phases[0][1], "formal")}
          ${overviewPhase(270, 2, "2019-20", copy.phases[1][0], copy.phases[1][1], "open")}
          ${overviewPhase(515, 3, "2023", copy.phases[2][0], copy.phases[2][1], "memory")}
          ${overviewPhase(760, 4, "2023-24", copy.phases[3][0], copy.phases[3][1], "meta")}
          ${overviewPhase(1005, 5, "2025", copy.phases[4][0], copy.phases[4][1], "evolution")}

          <path class="overview-flow" d="M 225 77 L 265 77"></path>
          <path class="overview-flow" d="M 470 77 L 510 77"></path>
          <path class="overview-flow" d="M 715 77 L 755 77"></path>
          <path class="overview-flow" d="M 960 77 L 1000 77"></path>

          ${overviewNode("godel-machines", 48, 178, 154, 74, "Gödel Machines", "proof-gated rewrite", "formal")}

          ${overviewNode("poet", 293, 160, 154, 74, "POET", "env-agent pairs", "open")}
          <path class="overview-inner-flow" d="M 370 234 L 370 282"></path>
          <text class="overview-edge-label" x="382" y="263">${copy.noveltyEdge}</text>
          ${overviewNode("enhanced-poet", 293, 285, 154, 82, "Enhanced POET", "behavioral novelty", "open")}

          ${overviewNode("reflexion", 538, 160, 154, 74, "Reflexion", "verbal memory", "memory")}
          ${overviewNode("voyager", 538, 285, 154, 82, "Voyager", "executable skills", "memory")}
          <path class="overview-branch" d="M 615 234 L 615 273"></path>
          <text class="overview-edge-label" x="627" y="258">${copy.memoryEdge}</text>

          ${overviewNode("stop", 783, 132, 154, 70, "STOP", "improve improver", "meta")}
          ${overviewNode("gptswarm", 783, 228, 154, 70, "GPTSwarm", "optimize graph", "meta")}
          ${overviewNode("adas", 783, 324, 154, 70, "ADAS", "design agents", "meta")}
          ${overviewNode("godel-agent", 783, 420, 154, 70, "Gödel Agent", "rewrite π and I", "meta")}

          ${overviewNode("dgm", 1028, 150, 154, 74, "DGM", "agent lineages", "evolution")}
          ${overviewNode("alphaevolve", 1028, 275, 154, 74, "AlphaEvolve", "program evolution", "evolution")}
          ${overviewNode("hermes-agent-self-evolving", 1028, 400, 154, 82, "Hermes + GEPA", "trace-aware evolution", "evolution")}

          ${overviewColumnNote(125, copy.columnNotes[0])}
          ${overviewColumnNote(370, copy.columnNotes[1])}
          ${overviewColumnNote(615, copy.columnNotes[2])}
          ${overviewColumnNote(860, copy.columnNotes[3])}
          ${overviewColumnNote(1105, copy.columnNotes[4])}
        </svg>
      </div>

      <div id="overviewDetail" class="overview-detail" aria-live="polite"></div>
    </section>

    <section class="overview-reading">
      <h3>${copy.chainTitle}</h3>
      <div class="overview-axis">
        <strong>${copy.axisLabels[0]}</strong>
        <span>${copy.axisValues[0][0]}</span><i></i><span>${copy.axisValues[0][1]}</span><i></i><span>${copy.axisValues[0][2]}</span><i></i><span>${copy.axisValues[0][3]}</span>
      </div>
      <div class="overview-axis">
        <strong>${copy.axisLabels[1]}</strong>
        <span>${copy.axisValues[1][0]}</span><i></i><span>${copy.axisValues[1][1]}</span><i></i><span>${copy.axisValues[1][2]}</span><i></i><span>${copy.axisValues[1][3]}</span>
      </div>
      <div class="overview-axis">
        <strong>${copy.axisLabels[2]}</strong>
        <span>${copy.axisValues[2][0]}</span><i></i><span>${copy.axisValues[2][1]}</span><i></i><span>${copy.axisValues[2][2]}</span><i></i><span>${copy.axisValues[2][3]}</span>
      </div>
    </section>
  `;

  const nodeButtons = [...document.querySelectorAll("[data-overview-paper]")];
  nodeButtons.forEach((button) => {
    button.addEventListener("click", () => selectOverviewPaper(button.dataset.overviewPaper));
  });
  selectOverviewPaper("godel-machines");
}

function overviewPhase(x, number, year, title, subtitle, kind) {
  const titleLines = title.split("|");
  const titleMarkup = titleLines.map((line, index) => `
    <tspan x="${x + 16}" y="${titleLines.length > 1 ? 72 + index * 17 : 80}">${line}</tspan>
  `).join("");
  return `
    <g class="overview-phase phase-${kind}">
      <rect x="${x}" y="24" width="200" height="96" rx="8"></rect>
      <text class="overview-phase-number" x="${x + 16}" y="50">0${number}</text>
      <text class="overview-phase-year" x="${x + 184}" y="50" text-anchor="end">${year}</text>
      <text class="overview-phase-title">${titleMarkup}</text>
      <text class="overview-phase-subtitle" x="${x + 16}" y="108">${subtitle}</text>
      <path class="overview-phase-stem" d="M ${x + 100} 120 L ${x + 100} 548"></path>
    </g>
  `;
}

function overviewColumnNote(x, text) {
  const lines = text.split("|");
  return `
    <text class="overview-column-note" x="${x}" y="${lines.length > 1 ? 570 : 578}">
      ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 16}">${line}</tspan>`).join("")}
    </text>
  `;
}

function overviewNode(id, x, y, width, height, title, subtitle, kind) {
  return `
    <foreignObject x="${x}" y="${y}" width="${width}" height="${height}">
      <button type="button" class="overview-node node-${kind}" data-overview-paper="${id}">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </button>
    </foreignObject>
  `;
}

function selectOverviewPaper(id) {
  const paper = papers.find((item) => item.id === id);
  const displayPaper = localizedPaper(paper);
  const summary = (currentLanguage === "zh" ? overviewPapersZh : overviewPapersEn)[id];
  const labels = currentLanguage === "zh"
    ? { mechanism: "核心机制：", route: "脉络：", open: "进入论文" }
    : { mechanism: "Core mechanism: ", route: "Route: ", open: "Open paper" };
  if (!paper || !summary) return;

  document.querySelectorAll("[data-overview-paper]").forEach((button) => {
    const selected = button.dataset.overviewPaper === id;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const detail = document.getElementById("overviewDetail");
  detail.innerHTML = `
    <div>
      <p class="detail-step">${paper.year} · ${displayPaper.type}</p>
      <h3>${paper.title}</h3>
      <p><strong>${labels.mechanism}</strong>${summary.mechanism}</p>
      <p>${summary.contribution}</p>
      <p class="overview-route"><strong>${labels.route}</strong>${summary.route}</p>
    </div>
    <button id="openOverviewPaper" class="small-button overview-open-button" type="button">${labels.open}</button>
  `;
  document.getElementById("openOverviewPaper").addEventListener("click", () => {
    goTo(pages.findIndex((item) => item.id === id));
  });
}

function stopImproverExample(paper) {
  if (paper.id !== "stop") return "";

  return `
    <section class="lesson-card stop-example">
      <div class="stop-example-head">
        <div>
          <p class="section-label">${lang("交互示例", "Interactive example")}</p>
          <h3>${lang("Improver 如何改进另一个 Improver", "How an improver improves an improver")}</h3>
        </div>
        <span class="example-badge">${lang("示意分数", "Illustrative scores")}</span>
      </div>
      <div class="stop-step-controls" role="group" aria-label="${lang("STOP 示例步骤", "STOP example steps")}">
        <button type="button" class="stop-step-button active" data-stop-step="0">${lang("1. 改进 solution", "1. Improve solution")}</button>
        <button type="button" class="stop-step-button" data-stop-step="1">${lang("2. 评价 I0", "2. Score I0")}</button>
        <button type="button" class="stop-step-button" data-stop-step="2">${lang("3. 改进 I0", "3. Improve I0")}</button>
        <button type="button" class="stop-step-button" data-stop-step="3">${lang("4. 运行 I1", "4. Run I1")}</button>
      </div>
      <div id="stopExampleStage" class="stop-example-stage" aria-live="polite"></div>
      <div class="stop-example-footer">
        <button id="stopExampleNext" class="small-button" type="button">${lang("下一示例步骤", "Next example step")}</button>
        <span id="stopExampleCounter" class="stop-example-counter"></span>
      </div>
    </section>
  `;
}

function initStopImproverExample(paper) {
  if (paper.id !== "stop") return;

  const buttons = [...document.querySelectorAll("[data-stop-step]")];
  const next = document.getElementById("stopExampleNext");
  let step = 0;

  const renderStep = (nextStep) => {
    step = nextStep;
    buttons.forEach((button, index) => {
      button.classList.toggle("active", index === step);
      button.setAttribute("aria-pressed", String(index === step));
    });
    renderStopExampleStage(step);
    document.getElementById("stopExampleCounter").textContent = lang(`步骤 ${step + 1} / 4`, `Step ${step + 1} of 4`);
    next.textContent = step === 3
      ? lang("重新开始", "Restart example")
      : lang("下一示例步骤", "Next example step");
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => renderStep(Number(button.dataset.stopStep)));
  });
  next.addEventListener("click", () => renderStep((step + 1) % 4));
  renderStep(0);
}

function renderStopExampleStage(step) {
  const stage = document.getElementById("stopExampleStage");
  if (!stage) return;

  const views = [
    `
      <div class="stop-flow" aria-label="I0 improves a downstream solution">
        <article class="stop-flow-node solution-node">
          <span class="flow-node-type">task + seed solution</span>
          <strong>${lang("找数组中最接近 a 的数", "Find the closest number to a")}</strong>
          <code>s0: linear search O(n)</code>
          <small>${lang("假设每个数组已经排序。", "Assume each array is already sorted.")}</small>
        </article>
        <div class="stop-flow-arrow"><span>u, s0, L</span></div>
        <article class="stop-flow-node improver-node">
          <span class="flow-node-type">seed improver I0</span>
          <strong>${lang("让 LLM 提出 N 个修改", "Ask the LLM for N edits")}</strong>
          <code>return argmax utility(candidate)</code>
        </article>
        <div class="stop-flow-arrow"><span>candidates</span></div>
        <div class="candidate-stack">
          ${stopCandidate("linear search", 55, false)}
          ${stopCandidate("sort every query", 47, false)}
          ${stopCandidate("binary search", 96, true)}
        </div>
      </div>
      <p class="stop-stage-note"><strong>${lang("I0 改进一个 solution。", "I0 improves a solution.")}</strong> ${lang("utility 检查正确性与速度，因此最高分的 valid proposal 会替换", "The utility checks correctness and speed, so the highest-scoring valid proposal replaces")} <code>s0</code>.</p>
    `,
    `
      <div class="meta-eval-layout" aria-label="Meta-utility evaluates I0 across task solution pairs">
        <div class="meta-task-list">
          ${stopMetaTask("Closest value", "linear -> binary search", 92)}
          ${stopMetaTask("Route planning", "basic DFS -> A*", 68)}
          ${stopMetaTask("String matching", "nested loops -> KMP", 61)}
        </div>
        <div class="meta-aggregation-arrow"><span>average best result</span></div>
        <article class="stop-flow-node evaluator-node">
          <span class="flow-node-type">meta_utility(I0)</span>
          <strong>(92 + 68 + 61) / 3</strong>
          <div class="meta-score">73.7</div>
        </article>
      </div>
      <p class="stop-stage-note">${lang("对每个", "For each")} <code>(task, solution)</code> pair，${lang("I0 返回最佳 candidate；Meta-utility 对这些分数取平均，因此评价的是 reusable improver，而不是某个答案。", "I0 returns its best candidate. Meta-utility averages those returned scores, so it measures the reusable improver rather than one answer.")}</p>
    `,
    `
      <div class="self-edit-flow" aria-label="I0 receives its own source code as the solution">
        <article class="stop-flow-node evaluator-node">
          <span class="flow-node-type">objective u</span>
          <strong>meta_utility</strong>
          <code>score an improver across D</code>
        </article>
        <div class="stop-flow-arrow"><span>u</span></div>
        <article class="stop-flow-node code-node">
          <span class="flow-node-type">artifact s</span>
          <strong>${lang("I0 的 source code", "Source code of I0")}</strong>
          <code>LLM candidates -> evaluate -> best</code>
        </article>
        <div class="stop-flow-arrow"><span>I0(u, s, L)</span></div>
        <article class="stop-flow-node improver-node selected">
          <span class="flow-node-type">new improver I1</span>
          <strong>${lang("提出方案前先检索", "Search before proposing")}</strong>
          <code>web/RAG + top-k + utility</code>
        </article>
      </div>
      <div class="equation-strip"><code>I1 = I0(meta_utility, I0, LLM)</code></div>
      <p class="stop-stage-note"><strong>${lang("关键的类型切换：", "The key type switch:")}</strong> ${lang("I0 通常编辑 task solution，但此处 solution 参数是 I0 自己的 source code。加入 search、top-k beam 或更好 stopping rule 的 candidate 可能在整个 task set 上得到更高分。", "I0 normally edits a task solution, but here the solution argument is I0's own source code. A candidate that adds search, a top-k beam, or better stopping can score higher across the task set.")}</p>
    `,
    `
      <div class="generation-compare" aria-label="I1 outperforms I0 and produces I2">
        <div class="generation-column">
          <span class="flow-node-type">before</span>
          <strong>I0: ${lang("直接生成 LLM proposals", "direct LLM proposals")}</strong>
          ${stopScoreBar("Closest value", 92)}
          ${stopScoreBar("Route planning", 68)}
          ${stopScoreBar("String matching", 61)}
          <div class="generation-average">mean 73.7</div>
        </div>
        <div class="generation-shift"><span>I1 uses retrieval + top-k</span></div>
        <div class="generation-column selected">
          <span class="flow-node-type">after</span>
          <strong>I1: ${lang("检索、提出、保留最佳方案", "search, propose, retain best")}</strong>
          ${stopScoreBar("Closest value", 96)}
          ${stopScoreBar("Route planning", 83)}
          ${stopScoreBar("String matching", 78)}
          <div class="generation-average">mean 85.7</div>
        </div>
      </div>
      <div class="equation-strip"><code>I2 = I1(meta_utility, I1, LLM)</code></div>
      <p class="stop-stage-note">${lang("下一轮 recursion 的第二个参数必须是", "The second argument must be")} <code>I1</code>${lang("。写成", " in the next recursive round. Writing")} <code>I1(meta_utility, I0, LLM)</code> ${lang("会让新 improver 再次编辑旧 seed，不是标准 STOP recurrence。", "would ask the new improver to edit the old seed again; it would not be the standard STOP recurrence.")}</p>
    `
  ];

  stage.innerHTML = views[step];
}

function stopCandidate(name, score, selected) {
  return `
    <div class="candidate-row${selected ? " selected" : ""}">
      <span>${name}</span>
      <strong>u=${score}</strong>
    </div>
  `;
}

function stopMetaTask(task, change, score) {
  return `
    <div class="meta-task">
      <span><strong>${task}</strong><small>${change}</small></span>
      <b>${score}</b>
    </div>
  `;
}

function stopScoreBar(label, score) {
  return `
    <div class="score-bar-row">
      <span>${label}</span>
      <div class="score-track"><i style="width:${score}%"></i></div>
      <b>${score}</b>
    </div>
  `;
}

function backgroundProblemCard(paper) {
  return `
    <section class="lesson-card intro-card">
      <div class="split-explanation">
        <div>
          <h3>${t("background")}</h3>
          <p>${paper.background}</p>
        </div>
        <div>
          <h3>${t("problem")}</h3>
          <p>${paper.problem}</p>
        </div>
      </div>
    </section>
  `;
}

function listCard(title, items, ordered = true, className = "") {
  const tag = ordered ? "ol" : "ul";
  return `
    <section class="lesson-card ${className}">
      <h3>${title}</h3>
      <${tag}>${items.map((item) => `<li>${item}</li>`).join("")}</${tag}>
    </section>
  `;
}

function resultCard(title, summary, rows) {
  const table = rows.length
    ? `<div class="result-table">
        <div class="result-header" aria-hidden="true">
          <span>${lang("指标", "Metric")}</span>
          <span>${lang("结果", "Result")}</span>
          <span>${lang("论文证据与说明", "Evidence and notes")}</span>
        </div>
        ${rows.map((row) => `
          <div class="result-row">
            <span class="result-metric">${row.metric}</span>
            <span class="result-value">${row.value}</span>
            <span class="result-note">${row.note || ""}</span>
          </div>
        `).join("")}
      </div>`
    : `<p class="muted-note">${t("noBenchmark")}</p>`;

  return `
    <section class="lesson-card results-card">
      <h3>${title}</h3>
      ${summary ? `<p>${summary}</p>` : ""}
      ${table}
    </section>
  `;
}

function formulaImplementationCard(paper) {
  const formulae = (paper.formulae || []).map((formula) => `
    <article class="formula-entry">
      <h4>${formula.title}</h4>
      <div class="math-block">\\[${formula.latex}\\]</div>
      <p>${formula.note}</p>
    </article>
  `).join("");

  return `
    <section class="lesson-card formula-card">
      <h3>${t("formulaImplementation")}</h3>
      <div class="formula-list">${formulae}</div>
      <div class="implementation-block">
        <h4>${t("runnableSkeleton")}</h4>
        <div class="code-editor" role="region" aria-label="${t("runnableSkeleton")}">
          <div class="code-editor-toolbar" aria-hidden="true">
            <span class="code-editor-dots"><span></span><span></span><span></span></span>
            <span class="code-editor-filename">agent-implementation.py</span>
            <span class="code-editor-language">Python</span>
          </div>
          <pre><code>${highlightPythonLike(paper.implementation || "")}</code></pre>
        </div>
      </div>
      ${(paper.buildNotes || []).length ? `
        <div class="build-checklist">
          <h4>${t("buildChecklist")}</h4>
          <ul>${paper.buildNotes.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      ` : ""}
    </section>
  `;
}

function typesetMath() {
  if (!window.MathJax?.typesetPromise) return;
  if (window.MathJax.typesetClear) window.MathJax.typesetClear([articleEl]);
  window.MathJax.typesetPromise([articleEl]).catch(() => {});
}

const nodeKinds = {
  input: { label: "Input / environment", icon: "IN" },
  agent: { label: "Agent / solver", icon: "AG" },
  evaluator: { label: "Evaluator / utility", icon: "EV" },
  optimizer: { label: "Optimizer / improver", icon: "OP" },
  memory: { label: "Archive / memory", icon: "ME" },
  code: { label: "Code / artifact", icon: "CD" },
  output: { label: "Output / selected result", icon: "OUT" },
  reject: { label: "Rejected / filtered", icon: "NO" },
  generator: { label: "Generator / mutation", icon: "GN" }
};

function diagramLegend(paper) {
  const kinds = [...new Set(paper.diagram.nodes.map((node) => inferNodeKind(node)))];
  return `
    <div class="diagram-legend" aria-label="${t("graphLegend")}">
      ${kinds.map((kind) => `
        <span class="legend-item">
          <span class="legend-swatch node-${kind}"></span>
          <span>${t("nodeKinds")[kind]}</span>
        </span>
      `).join("")}
    </div>
  `;
}

function inferNodeKind(node) {
  const text = `${node.id} ${node.label} ${node.sub || ""}`.toLowerCase();

  if (text.includes("reject") || text.includes("too easy") || text.includes("too hard")) return "reject";
  if (text.includes("output") || text.includes("answer") || text.includes("deploy") || text.includes("evolved agent") || text.includes("selected")) return "output";
  if (text.includes("archive") || text.includes("database") || text.includes("memory") || text.includes("skill library") || text.includes("variant pool") || text.includes("axiom")) return "memory";
  if (text.includes("generator") || text.includes("mutate") || text.includes("cppn") || text.includes("neat") || text.includes("llm ensemble")) return "generator";
  if (text.includes("code") || text.includes("program") || text.includes("skill") || text.includes("diff") || text.includes("child") || text.includes("artifact") || text.includes("rewrite")) return "code";
  if (text.includes("evaluator") || text.includes("benchmark") || text.includes("metric") || text.includes("utility") || text.includes("score") || text.includes("critic") || text.includes("reward")) return "evaluator";
  if (text.includes("proof") || text.includes("improver") || text.includes("meta") || text.includes("optimizer") || text.includes("gepa") || text.includes("sampler") || text.includes("searcher") || text.includes("reflection") || text.includes("annecs") || text.includes("pata")) return "optimizer";
  if (text.includes("env") || text.includes("environment") || text.includes("input") || text.includes("task") || text.includes("examples") || text.includes("world") || text.includes("human setup") || text.includes("goal")) return "input";
  return "agent";
}

function drawDiagram(paper) {
  const canvas = document.getElementById("diagramCanvas");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 940 430");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.classList.add("mechanism-svg");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2f3a45"></path>
    </marker>
  `;
  svg.appendChild(defs);

  for (const box of paper.diagram.boxes || []) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", box.x);
    rect.setAttribute("y", box.y);
    rect.setAttribute("width", box.w);
    rect.setAttribute("height", box.h);
    rect.setAttribute("rx", "10");
    rect.classList.add("group-box");
    group.appendChild(rect);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", box.x + 14);
    label.setAttribute("y", box.y + 24);
    label.classList.add("group-label");
    label.textContent = box.label;
    group.appendChild(label);
    svg.appendChild(group);
  }

  const byId = Object.fromEntries(paper.diagram.nodes.map((node) => [node.id, node]));
  const edgeLabels = [];

  paper.diagram.edges.forEach((edge, index) => {
    const start = byId[edge.from];
    const end = byId[edge.to];
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const { sx, sy, ex, ey } = edgeAnchors(start, end);
    const dx = ex - sx;
    const dy = ey - sy;
    const length = Math.hypot(dx, dy) || 1;
    const offset = edge.offset || 0;
    const nx = Math.abs(dy) < 16 ? 0 : (-dy / length) * offset;
    const ny = Math.abs(dy) < 16 ? offset : (dx / length) * offset;
    const osx = sx + nx;
    const osy = sy + ny;
    const oex = ex + nx;
    const oey = ey + ny;
    const bend = edge.dashed ? 55 : Math.min(55, Math.max(22, Math.abs(dy) * 0.35));
    const cx = sx + dx / 2 + nx;
    const cy = sy + dy / 2 + ny - bend;
    const d = Math.abs(dy) < 16 && !offset ? `M ${sx} ${sy} L ${ex} ${ey}` : `M ${osx} ${osy} Q ${cx} ${cy} ${oex} ${oey}`;
    path.setAttribute("d", d);
    path.setAttribute("marker-end", "url(#arrow)");
    path.classList.add("edge");
    if (edge.dashed) path.classList.add("dashed");
    path.dataset.edgeIndex = index;
    path.dataset.from = edge.from;
    path.dataset.to = edge.to;
    svg.appendChild(path);

    if (edge.label) {
      const isStraight = Math.abs(dy) < 16 && !offset;
      const candidates = [];
      for (const t of [0.5, 0.35, 0.65, 0.25, 0.75]) {
        const oneMinusT = 1 - t;
        const baseX = isStraight
          ? sx + (ex - sx) * t
          : oneMinusT * oneMinusT * osx + 2 * oneMinusT * t * cx + t * t * oex;
        const baseY = isStraight
          ? sy + (ey - sy) * t
          : oneMinusT * oneMinusT * osy + 2 * oneMinusT * t * cy + t * t * oey;
        const tangentX = isStraight
          ? ex - sx
          : 2 * oneMinusT * (cx - osx) + 2 * t * (oex - cx);
        const tangentY = isStraight
          ? ey - sy
          : 2 * oneMinusT * (cy - osy) + 2 * t * (oey - cy);
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const normalX = -tangentY / tangentLength;
        const normalY = tangentX / tangentLength;
        for (const distance of [0, 18, -18, 32, -32]) {
          candidates.push({
            x: baseX + normalX * distance,
            y: baseY + normalY * distance - 8
          });
        }
      }
      edgeLabels.push({ text: edge.label, candidates });
    }
  });

  for (const node of paper.diagram.nodes) {
    const kind = inferNodeKind(node);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.dataset.nodeId = node.id;
    group.dataset.kind = kind;
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", node.label);
    group.addEventListener("pointerdown", (event) => beginDiagramDrag(event, paper, node));
    group.addEventListener("click", () => setActiveNode(node.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setActiveNode(node.id);
      }
    });

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", node.x - node.w / 2);
    rect.setAttribute("y", node.y - node.h / 2);
    rect.setAttribute("width", node.w);
    rect.setAttribute("height", node.h);
    rect.setAttribute("rx", "8");
    rect.classList.add("node-shape", `node-${kind}`);
    group.appendChild(rect);

    const accent = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    accent.setAttribute("x", node.x - node.w / 2);
    accent.setAttribute("y", node.y - node.h / 2);
    accent.setAttribute("width", "8");
    accent.setAttribute("height", node.h);
    accent.setAttribute("rx", "8");
    accent.classList.add("node-accent", `node-${kind}`);
    group.appendChild(accent);

    const badge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    badge.setAttribute("cx", node.x - node.w / 2 + 19);
    badge.setAttribute("cy", node.y - node.h / 2 + 18);
    badge.setAttribute("r", "12");
    badge.classList.add("node-badge", `node-${kind}`);
    group.appendChild(badge);

    const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    badgeText.setAttribute("x", node.x - node.w / 2 + 19);
    badgeText.setAttribute("y", node.y - node.h / 2 + 22);
    badgeText.classList.add("node-badge-text");
    badgeText.textContent = nodeKinds[kind].icon;
    group.appendChild(badgeText);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", node.x + 10);
    label.setAttribute("y", node.y - 5);
    label.classList.add("node-label");
    label.textContent = node.label;
    group.appendChild(label);

    const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sub.setAttribute("x", node.x + 10);
    sub.setAttribute("y", node.y + 15);
    sub.classList.add("node-sub");
    sub.textContent = node.sub || "";
    group.appendChild(sub);

    svg.appendChild(group);
  }

  placeEdgeLabels(edgeLabels, paper.diagram.nodes).forEach((item) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const width = Math.min(210, Math.max(48, item.text.length * 6.2 + 16));
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", item.x - width / 2);
    rect.setAttribute("y", item.y - 14);
    rect.setAttribute("width", width);
    rect.setAttribute("height", 21);
    rect.setAttribute("rx", "5");
    rect.classList.add("edge-label-bg");
    group.appendChild(rect);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", item.x);
    label.setAttribute("y", item.y);
    label.classList.add("edge-label");
    label.textContent = item.text.length > 31 ? `${item.text.slice(0, 28)}...` : item.text;
    group.appendChild(label);
    svg.appendChild(group);
  });

  canvas.innerHTML = "";
  canvas.appendChild(svg);
  updateDiagramState();
}

function placeEdgeLabels(items, nodes) {
  const nodeBoxes = nodes.map((node) => ({
    left: node.x - node.w / 2 - 5,
    right: node.x + node.w / 2 + 5,
    top: node.y - node.h / 2 - 5,
    bottom: node.y + node.h / 2 + 5
  }));
  const placedBoxes = [];

  return items.map((item) => {
    const width = Math.min(210, Math.max(48, item.text.length * 6.2 + 16));
    let best = item.candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of item.candidates) {
      const box = {
        left: candidate.x - width / 2,
        right: candidate.x + width / 2,
        top: candidate.y - 14,
        bottom: candidate.y + 7
      };
      const nodeHits = nodeBoxes.filter((nodeBox) => boxesOverlap(box, nodeBox)).length;
      const labelHits = placedBoxes.filter((labelBox) => boxesOverlap(box, labelBox)).length;
      const overflow = Math.max(0, 8 - box.left)
        + Math.max(0, box.right - 932)
        + Math.max(0, 8 - box.top)
        + Math.max(0, box.bottom - 422);
      const score = nodeHits * 1000 + labelHits * 350 + overflow * 10 + Math.abs(candidate.y - item.candidates[0].y);

      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    placedBoxes.push({
      left: best.x - width / 2,
      right: best.x + width / 2,
      top: best.y - 14,
      bottom: best.y + 7
    });
    return { ...item, ...best };
  });
}

function boxesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function edgeAnchors(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let sx = start.x;
  let sy = start.y;
  let ex = end.x;
  let ey = end.y;

  if (absDx >= absDy) {
    sx += Math.sign(dx || 1) * (start.w / 2);
    ex -= Math.sign(dx || 1) * (end.w / 2);
  } else {
    sy += Math.sign(dy || 1) * (start.h / 2);
    ey -= Math.sign(dy || 1) * (end.h / 2);
  }

  return { sx, sy, ex, ey };
}

function beginDiagramDrag(event, paper, node) {
  if (event.button !== 0) return;
  const svg = event.currentTarget.ownerSVGElement;
  const point = clientToSvgPoint(svg, event.clientX, event.clientY);
  if (!point) return;

  event.preventDefault();
  setActiveNode(node.id);
  dragState = {
    pointerId: event.pointerId,
    paper,
    node,
    offsetX: node.x - point.x,
    offsetY: node.y - point.y
  };
  document.body.classList.add("node-dragging");
}

function handleDiagramPointerMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const svg = document.querySelector("#diagramCanvas svg.mechanism-svg");
  const point = clientToSvgPoint(svg, event.clientX, event.clientY);
  if (!point) return;

  event.preventDefault();
  const { node, paper } = dragState;
  node.x = clamp(point.x + dragState.offsetX, node.w / 2 + 10, 940 - node.w / 2 - 10);
  node.y = clamp(point.y + dragState.offsetY, node.h / 2 + 10, 430 - node.h / 2 - 10);
  drawDiagram(paper);
}

function endDiagramDrag(event) {
  if (event && dragState && event.pointerId !== dragState.pointerId) return;
  dragState = null;
  document.body.classList.remove("node-dragging");
}

function clientToSvgPoint(svg, clientX, clientY) {
  if (!svg) return null;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(matrix.inverse());
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function setActiveNode(id) {
  activeNode = id;
  updateDiagramState();
  updateDetail();
}

function updateDiagramState() {
  document.querySelectorAll(".node-shape").forEach((shape) => {
    const group = shape.closest("g");
    shape.classList.toggle("active-node", group?.dataset.nodeId === activeNode);
  });
  document.querySelectorAll(".edge").forEach((edge) => {
    const active = edge.dataset.from === activeNode || edge.dataset.to === activeNode;
    edge.classList.toggle("active-edge", active);
  });
}

function updateDetail() {
  const paper = localizedPaper(pages[currentIndex]);
  const node = paper.diagram.nodes.find((item) => item.id === activeNode);
  const walkthrough = paper.diagram.walkthrough || paper.diagram.nodes.map((item) => item.id);
  const stepIndex = walkthrough.indexOf(activeNode);
  const fallback = paper.diagram.details.default || t("graphFallback");
  document.getElementById("detailStep").textContent = stepIndex >= 0
    ? currentLanguage === "zh"
      ? `${t("step")} ${stepIndex + 1} ${t("of")} ${walkthrough.length}`
      : `${t("step")} ${stepIndex + 1} ${t("of")} ${walkthrough.length}`
    : t("methodComponent");
  document.getElementById("detailTitle").textContent = node ? node.label : t("detail");
  document.getElementById("detailText").textContent = paper.diagram.details[activeNode] || fallback;
}

function stepNode(direction = 1) {
  const paper = localizedPaper(pages[currentIndex]);
  const walkthrough = paper.diagram.walkthrough || paper.diagram.nodes.map((node) => node.id);
  const index = walkthrough.indexOf(activeNode);
  setActiveNode(walkthrough[(index + direction + walkthrough.length) % walkthrough.length]);
}

function isGraphExpanded() {
  return document.getElementById("methodGraphPanel")?.classList.contains("graph-expanded") || false;
}

function setGraphExpanded(expanded) {
  const panel = document.getElementById("methodGraphPanel");
  const button = document.getElementById("expandGraphBtn");
  if (!panel || !button) return;

  panel.classList.toggle("graph-expanded", expanded);
  document.body.classList.toggle("graph-view-open", expanded);
  setGraphBackgroundInert(expanded, panel);
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? t("exitGraph") : t("expandGraph");

  if (expanded) {
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
  } else {
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
  }

  button.focus();
}

function setGraphBackgroundInert(expanded, panel) {
  const targets = [
    document.querySelector(".rail"),
    document.querySelector(".topbar"),
    document.querySelector(".paper-hero"),
    ...[...panel.parentElement.children].filter((element) => element !== panel)
  ].filter(Boolean);

  targets.forEach((element) => {
    element.inert = expanded;
    if (expanded) {
      element.dataset.graphInert = "true";
    } else {
      delete element.dataset.graphInert;
    }
  });
}

function clearGraphInertState() {
  document.querySelectorAll('[data-graph-inert="true"]').forEach((element) => {
    element.inert = false;
    delete element.dataset.graphInert;
  });
}

function goTo(index) {
  if (index < 0 || index >= pages.length) return;
  currentIndex = index;
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightPythonLike(source) {
  const keywords = new Set([
    "and", "as", "assert", "async", "await", "break", "class", "continue",
    "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
    "or", "pass", "raise", "return", "try", "while", "with", "yield"
  ]);
  const constants = new Set(["True", "False", "None"]);
  const builtins = new Set([
    "all", "any", "dict", "enumerate", "float", "int", "len", "list",
    "max", "min", "print", "range", "set", "sorted", "str", "sum",
    "tuple", "zip"
  ]);

  const token = (className, value) =>
    `<span class="syntax-${className}">${escapeHtml(value)}</span>`;

  const highlightLine = (line) => {
    let result = "";
    let index = 0;

    while (index < line.length) {
      const rest = line.slice(index);
      const char = line[index];

      if (/\s/.test(char)) {
        const match = rest.match(/^\s+/)[0];
        result += match;
        index += match.length;
        continue;
      }

      if (char === "#") {
        result += token("comment", rest);
        break;
      }

      if (char === "\"" || char === "'") {
        const quote = char;
        let end = index + 1;
        while (end < line.length) {
          if (line[end] === "\\") {
            end += 2;
            continue;
          }
          if (line[end] === quote) {
            end += 1;
            break;
          }
          end += 1;
        }
        result += token("string", line.slice(index, end));
        index = end;
        continue;
      }

      const number = rest.match(/^\d+(?:\.\d+)?/);
      if (number) {
        result += token("number", number[0]);
        index += number[0].length;
        continue;
      }

      const identifier = rest.match(/^[A-Za-z_]\w*/);
      if (identifier) {
        const value = identifier[0];
        const nextChar = line.slice(index + value.length).match(/^\s*(.)/)?.[1];
        if (keywords.has(value)) result += token("keyword", value);
        else if (constants.has(value)) result += token("constant", value);
        else if (builtins.has(value)) result += token("builtin", value);
        else if (nextChar === "(") result += token("function", value);
        else result += escapeHtml(value);
        index += value.length;
        continue;
      }

      if (/[=+\-*/%<>!&|^~:]/.test(char)) result += token("operator", char);
      else if (/[()[\]{},.]/.test(char)) result += token("punctuation", char);
      else result += escapeHtml(char);
      index += 1;
    }

    return result || " ";
  };

  return String(source)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, index) => `<span class="code-line"><span class="code-line-number" aria-hidden="true">${index + 1}</span><span class="code-line-source">${highlightLine(line)}</span></span>`)
    .join("");
}

init();
