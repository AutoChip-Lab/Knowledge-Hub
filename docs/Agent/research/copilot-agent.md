---
key: copilot-agent
name: GitHub Copilot (agent mode + coding agent)
category: 编码 agent/harness
confidence: high
---
## ⚠️ 核查笔记(写作时必读)

**已更正:**
- MODEL DEFAULT IS STALE: The brief states 'GitHub Copilot now defaults to GPT-4.1' as a current fact. Verified: that quote is real but comes from a blog post dated Aug 29 / Sep 2, 2025 (https://github.blog/ai-and-ml/github-copilot/under-the-hood-exploring-the-ai-models-powering-github-copilot/). As of July 2026 the official supported-models page (https://docs.github.com/en/copilot/reference/ai-models/supported-models) lists GPT-4.1 as RETIRED (scheduled 2026-06-01, suggested replacement GPT-5.5). So GPT-4.1 is no longer the default and is no longer selectable. The brief should present GPT-4.1-as-default as a 2025 historical fact, not a July-2026 current fact.
- 'SUSPICIOUS' MODEL NAMES ARE REAL, NOT HALLUCINATED: The brief's uncertainties flagged 'Claude Fable 5, GPT-5.3-Codex, Gemini 3.x' as possibly a tool's hallucinated future-state summary. Verified against the live official supported-models page: these are GENUINELY listed (Claude Fable 5, Claude Sonnet 5, Claude Opus 4.5-4.8, GPT-5.3-Codex, GPT-5.4/5.4-mini/5.5, Gemini 3 Flash / 3.1 Pro / 3.5 Flash, plus MAI-Code-1-Flash, Kimi-K2.7-Code). This is the real July-2026 model catalog. Corrected the uncertainty to a confirmed fact.
- SANDBOX TECH — TWO DIFFERENT TECHNOLOGIES: The brief attributes 'Microsoft MXC technology' to both local and cloud sandboxes and ties the local MXC sandbox to 'agent mode tool execution.' Verified (https://docs.github.com/en/copilot/concepts/about-cloud-and-local-sandboxes): LOCAL sandboxing is built on Microsoft MXC (consistent across macOS/Linux/Windows) and is delivered primarily via the Copilot CLI; CLOUD sandboxing is built on Azure Container Apps Sandboxes (GitHub adds identity/policy/billing). The brief conflated the two and omitted the Azure Container Apps detail.
- COPILOT APP STATUS UPGRADED: The brief says the 'Copilot app' was 'launched 2026' and lists its GA/preview status as an open uncertainty. Verified: it entered technical preview at Microsoft Build 2026 (announced ~2026-06, expanded preview 2026-06-02) and became GENERALLY AVAILABLE for macOS/Windows/Linux on 2026-06-17 (https://github.blog/changelog/2026-06-17-github-copilot-app-generally-available/). This uncertainty is now resolved.
- AGENT-MODE SUPPORTED MODELS AT LAUNCH: The brief's architecture section implies GPT-4.1 was the agent-mode default from the start. The April 4, 2025 rollout post actually lists the launch model choices as 'Claude 3.5 and 3.7 Sonnet, Google Gemini 2.0 Flash, and OpenAI GPT-4o' (GPT-4o, not GPT-4.1). GPT-4.1 became the default later in 2025. Minor sequencing correction.
- SOURCE ATTRIBUTION FOR THE EXTENSIONS-DEPRECATION CLAIM UPGRADED TO PRIMARY: The brief cited only a third-party summary (nxcode.io, confidence med) for 'Copilot Extensions deprecated Nov 2025 → MCP.' Verified against GitHub's own changelog (https://github.blog/changelog/2025-09-24-deprecate-github-copilot-extensions-github-apps/): GitHub App-based Copilot Extensions were sunset on Nov 10, 2025 (new server-side extensions blocked after Sep 24, 2025), replaced by MCP. Confidence raised from med to high with a primary source.
- PRICING NUANCE: The brief's keyFacts says '1 coding agent session = 1 premium request (simplified from earlier per-model-request billing).' The GA changelog does NOT contain this simplification; the still-documented model is that (from June 4, 2025) coding agent uses one premium request PER MODEL REQUEST the agent makes. The '1 session = 1 premium request' claim is from a community discussion and could not be confirmed as the current July-2026 billing model; treat as unverified rather than high-confidence.

**存疑/被驳斥(不要写进正文,或需降低确定性):**
- '1 coding agent session = 1 premium request' (brief listed confidence med): Could NOT be confirmed against any primary GitHub source. GitHub's documented billing (June 4, 2025 onward) is one premium request per MODEL request the agent makes — i.e., a session can consume multiple premium requests. The 'session = 1 request' simplification appears only in a community thread and may be outdated or was never GitHub's stated model. Do not present as fact.
- 'GitHub Copilot defaults to GPT-4.1' as a July-2026 current fact: DUBIOUS/STALE. True in 2025; GPT-4.1 was retired around 2026-06-01. Not the current default.
- The uncertainty framing that 'Claude Fable 5 / GPT-5.3-Codex / Gemini 3.x may reflect a hallucinated future state': REFUTED — these are the real, currently-listed models.
- 'Local MXC sandbox restricts filesystem/network/syscall access during agent-mode tool execution' — partially dubious: MXC local sandboxing is documented for the Copilot CLI's shell execution, not clearly for the in-IDE agent-mode Chat panel's edit/read tools specifically. The isolation-during-tool-execution framing is directionally right but the 'agent mode' surface attribution is loose.

**尚未解决的问题:**
- Current (July 2026) premium-request billing for the coding agent: is it still one premium request PER MODEL REQUEST (June 4, 2025 model), or has GitHub moved to a simpler per-session model? The '1 session = 1 request' claim could not be confirmed against any primary GitHub source and should be checked at docs.github.com/en/copilot/concepts/usage-limits before publishing a specific number.
- Whether the coding agent uses the same user-selected model as agent mode or a fixed/routed model in the cloud context. A 2026-05-18 changelog ('Fast, cost-efficient models for simple tasks') indicates the cloud agent now offers model selection (e.g., Claude Haiku 4.5, GPT-5.4-mini) with routing by task complexity, but the exact default/routing logic is not fully documented.
- Context-compaction specifics (95% trigger, checkpoints, preserved tool-call sequences / reasoning summaries) originate from DeepWiki (community-generated, about copilot-cli), not official GitHub docs. The behavior is plausible and directionally consistent, but the exact 95% threshold and mechanism remain unverified against a primary source.
- Whether local MXC sandboxing applies to the in-IDE agent-mode Chat panel's edit/read tools specifically, or only to shell execution via the Copilot CLI. Docs describe it around CLI/shell command execution; the agent-mode surface attribution should be confirmed.
- Multi-agent orchestration details (coding agent invoked as a sub-task from agent mode; Claude Code acting as a sub-agent via MCP/GitHub) are referenced but not architecturally documented in primary sources.

---
## GitHub Copilot: Agent Mode + Coding Agent — Verified Source Brief (as of July 2026)

### What it is + who/when

**GitHub Copilot** is an AI coding assistant from **GitHub (Microsoft)**. It launched as an inline code-completion tool in a **technical preview on June 29, 2021** (originally powered by OpenAI Codex, a GPT-3 descendant), added **Copilot Chat**, and by 2025-2026 offers two distinct *agentic* surfaces plus a new desktop app:

1. **Agent Mode** — a **synchronous, in-IDE** autonomous coding collaborator in the Copilot Chat panel. Announced **Feb 6, 2025** (VS Code Insiders preview) and rolled out to **VS Code Stable on April 4, 2025**; also available in Visual Studio, JetBrains, Eclipse, and Xcode. (https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/)
2. **Coding Agent / "cloud agent"** — an **asynchronous, cloud-hosted** agent that takes GitHub issue assignments, runs in a **GitHub Actions-powered ephemeral environment**, and delivers **draft pull requests** for human review. Public preview at **Microsoft Build, May 19, 2025**; **generally available Sept 25, 2025** for all paid Copilot subscribers. (https://github.blog/changelog/2025-09-25-copilot-coding-agent-is-now-generally-available/)
3. **Copilot app** — an **agent-native desktop experience** (macOS/Windows/Linux). Technical preview at Build 2026; **generally available June 17, 2026**. Provides a "My Work" view of parallel agent sessions, worktrees, canvases, and cloud automations. (https://github.blog/changelog/2026-06-17-github-copilot-app-generally-available/)

### Architecture & named components

**Agent Mode (IDE-local, synchronous):**
- Runs in the Copilot Chat panel. Core loop: user prompt → **augmented system prompt** (user query + summarized workspace structure + machine context + tool descriptions with full JSON schemas) → LLM selects tool calls → tools execute → results returned → loop until done. (https://github.blog/ai-and-ml/github-copilot/agent-mode-101-all-about-github-copilots-powerful-mode/)
- **Built-in tools** (illustrative names): read file, edit file, run in terminal, workspace search, and linting/diagnostics access.
- **MCP client**: any registered MCP server (local or remote) becomes callable tools; GitHub's own MCP server exposes issues/PRs/search.
- **Model selector**: user-selectable multi-model menu (see model list below).
- **Context compaction**: long sessions compact rather than truncate (see caveat under uncertainties).

**Coding Agent (GitHub Actions-based, asynchronous):**
- **Runtime**: an ephemeral development environment **powered by GitHub Actions**; the agent clones the repo, configures the environment, then works. (https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- **Context acquisition**: repository code search / RAG to build an implementation plan. (https://github.blog/news-insights/product-news/github-copilot-meet-the-new-coding-agent/)
- **Two default (pre-configured) MCP servers**: a **GitHub MCP Server** (specially scoped token with **read-only** access to the current repo) and a **Playwright MCP Server** (web interaction restricted to `localhost`/`127.0.0.1` by default). Additional MCP servers are configurable via repository settings. (https://docs.github.com/en/copilot/concepts/agents/coding-agent/mcp-and-coding-agent)
- **Agent firewall**: on by default with a recommended allowlist covering OS package repos (Debian/Ubuntu/Red Hat), container registries (Docker Hub, Azure CR, AWS ECR), language package registries (npm, PyPI, NuGet, and many others), common certificate authorities, and hosts used to download browsers for Playwright. Org admins can enable/disable/"let repositories decide." (https://docs.github.com/en/copilot/reference/copilot-allowlist-reference)
- **Hard limits**: each session has a **maximum execution time of 59 minutes (a hard, non-extendable cap)**; the agent **works on one branch at a time and opens exactly one PR per assigned task**. (https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)

**Sandboxes (public preview June 2, 2026):**
- **Local sandbox** — built on **Microsoft MXC** technology for consistent isolation across macOS/Linux/Windows; restricts Copilot's shell command execution's access to filesystem, network, and system capabilities (delivered primarily via the Copilot CLI).
- **Cloud sandbox** — fully isolated, ephemeral Linux env built on **Azure Container Apps Sandboxes**, with GitHub supplying identity/policy/billing; launched via `copilot --cloud`. (https://github.blog/changelog/2026-06-02-cloud-and-local-sandboxes-for-github-copilot-now-in-public-preview/)

**Supported models (live official list, July 2026)** — user-selectable menu spanning OpenAI (GPT-5 mini, GPT-5.3-Codex, GPT-5.4 / 5.4 mini / 5.4 nano, GPT-5.5), Anthropic (Claude Fable 5, Claude Haiku 4.5, Claude Sonnet 4.5 / 4.6 / 5, Claude Opus 4.5 → 4.8 incl. a fast-mode preview), Google (Gemini 2.5 Pro, Gemini 3 Flash, Gemini 3.1 Pro, Gemini 3.5 Flash), and others (Microsoft MAI-Code-1-Flash, Raptor mini, Moonshot Kimi-K2.7-Code). **Note: GPT-4.1 — the 2025 default — was retired around 2026-06-01.** (https://docs.github.com/en/copilot/reference/ai-models/supported-models)

### How one task flows through it (step-by-step)

**Agent Mode — a refactoring task:**
1. Developer selects "agent" in Copilot Chat and types a task (e.g., "refactor auth to use JWT").
2. VS Code sends the augmented prompt (query + workspace summary + machine context + tool JSON schemas).
3. LLM returns a plan + first tool call (e.g., read the auth file).
4. Tool result appended to context; LLM calls the next tool (e.g., workspace search for import sites).
5. Agent proposes edits shown as a diff; runs terminal commands (e.g., pytest) — terminal commands require user approval by default.
6. Agent reads failures, edits, re-runs; loop continues until tests pass or the task is complete. User can reject any individual edit.

**Coding Agent — a GitHub issue:**
1. Developer assigns an issue to **Copilot** (or uses the agents panel / VS Code delegate).
2. Copilot adds a **👀 emoji reaction** to signal activation.
3. A GitHub Actions runner boots an ephemeral VM and clones the repo.
4. Agent performs code-search/RAG to understand the repo and build a plan.
5. Agent implements changes, using the GitHub MCP Server (read repo/issues/PRs) and Playwright MCP Server if needed.
6. Agent runs tests/linters and iterates on failures.
7. Agent **opens a branch and a draft PR early** and pushes commits regularly; the PR description is updated with reasoning/validation.
8. At completion or the **59-minute cap**, the PR is ready for review. **CI/CD workflows require human approval before running.**
9. Developer reviews; can @-mention `@copilot` in PR comments to request changes; the agent iterates. (https://github.blog/ai-and-ml/github-copilot/assigning-and-completing-issues-with-coding-agent-in-github-copilot/)

### Distinctive design decisions & tradeoffs

1. **Synchronous vs. asynchronous split** — agent mode (watch it live) vs. coding agent (fire-and-forget). GitHub documents them as complementary.
2. **GitHub Actions as agent compute** — reuses a battle-tested CI/CD platform instead of a bespoke sandbox, inheriting its security model, audit logging, and customization.
3. **Firewall on by default** — least-privilege network access to mitigate prompt-injection/exfiltration; admins can expand but the control is on by default.
4. **MCP as the universal extension layer** — GitHub **sunset its proprietary GitHub-App-based Copilot Extensions on Nov 10, 2025** (new server-side extensions blocked after Sep 24, 2025), standardizing on **MCP** (an open standard originated at Anthropic) so integrations are portable across MCP hosts. (https://github.blog/changelog/2025-09-24-deprecate-github-copilot-extensions-github-apps/)
5. **Two narrowly-scoped default MCP servers** — read-only GitHub token + localhost-only Playwright = useful capability without arbitrary external access.
6. **Human-in-the-loop at the PR boundary** — CI/CD doesn't auto-run on agent PRs; the requester can't approve the agent's own PR; the review gate is preserved.
7. **Tool-description engineering as first-class work** — the VS Code team noted refining tool descriptions/system prompts consumed significant effort, following Anthropic's agent-building principles.
8. **Model-agnostic architecture** — a user-selectable model menu rather than one hardcoded model.

### How it differs from peers

- **vs. Cursor/Windsurf**: Copilot's coding agent is cloud/GitHub-native and asynchronous; those tools are synchronous IDE agents without native cloud-async task execution. Copilot's structural edge is deep GitHub issues/PR/Actions integration.
- **vs. Devin (Cognition)**: Devin is a persistent-workspace autonomous engineer with broad web/package/code freedom aimed at *replacement*; Copilot's coding agent is deliberately constrained (59-min cap, allowlist firewall, read-only default GitHub token) and aimed at *augmentation* inside the PR-review workflow.
- **vs. Claude Code (Anthropic)**: CLI-first, local, deeper shell/filesystem autonomy with lighter default sandboxing; Copilot offers IDE-native UX + GitHub platform integration. The two can interoperate via MCP/GitHub integration.
- **vs. Amazon Q Developer**: AWS-ecosystem-tied (Bedrock, CodeWhisperer heritage) with AWS-infra focus; Copilot is GitHub/Azure-native with broader multi-model choice.
- **vs. JetBrains AI Assistant**: more limited agentic capability; Copilot agent mode now runs natively inside JetBrains IDEs too.
- **Key structural differentiator**: Copilot is the major coding agent with native bidirectional integration across GitHub's issue tracker, PR system, Actions runner, and code search — the full SDLC in one platform.

### Teaching hooks

1. **The two-agent split as a teaching frame** — synchronous "pair-program with me now" (agent mode) vs. asynchronous "assign the ticket and walk away" (coding agent) cleanly illustrates the tight-feedback-loop vs. autonomous-background-execution tradeoff.
2. **Tool-calling as the core primitive** — agent mode is a textbook ReAct-style loop (system prompt with tool JSON schemas → LLM selects tool → execute → loop); a concrete case that *tool description design* rivals model choice in importance.
3. **Reusing trusted infrastructure** — using GitHub Actions as the agent runtime instead of a new sandbox solves reliability/audit/trust "for free" — an underappreciated production pattern.
4. **Security-by-default in agentic systems** — allowlist firewall + read-only GitHub token + localhost-only Playwright + human-approval CI gate = least privilege applied to autonomous agents; excellent "how do you safely ship agents?" material.
5. **MCP as a universal adapter** — the real-world Extensions→MCP migration is a case study in why standards win in fast-moving AI tooling.
6. **RAG in a coding agent** — code-search retrieval to understand a large repo (rather than dumping everything into context) illustrates how production coding agents handle scale.
7. **Benchmarks with an expiry date** — agent mode's **56.0% on SWE-bench Verified with Claude 3.7 Sonnet** (stated in the April 2025 rollout post) grounds "AI can code" in a number — while teaching that such figures are model- and date-specific and go stale fast. (https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/)