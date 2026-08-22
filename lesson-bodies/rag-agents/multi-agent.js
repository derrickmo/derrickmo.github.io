// GENERATED from content/lessons/rag-agents/multi-agent.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/multi-agent/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "multi-agent": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Multi-agent systems are usually justified with an analogy - a team is better than an individual - and the analogy is doing more work than the evidence. The arithmetic from 18-06 does not stop applying when you split a loop across several models; it applies across the agents as well, and it acquires a second term for coordination. So the question worth asking is not whether a team is better in general but which of three specific mechanisms you are relying on, because each one has a condition attached and fails when the condition is not met.",
        "The three mechanisms are SPECIALIZATION, which requires accurate routing and falls below a single generalist when routing errs; VOTING, which requires INDEPENDENT errors and gives almost nothing when the voters are copies of the same model; and DECOMPOSITION, which requires cleanly separable subtasks and inherits the compounding of a pipeline when it does not get them. None of these is unreliable in principle. All of them are conditional, and the conditions are frequently unmet in exactly the configurations that get built.",
        "There is one justification that holds up more robustly than the popular ones, and it is worth leading with because it is often skipped: CONTEXT ISOLATION. A subagent exploring a dead end fills its own window with false starts, and when it returns only a conclusion, the main agent's context stays clean. That is a real architectural benefit which has nothing to do with collective intelligence - it is about the fact that a context window is a scarce, shared, degradable resource. Parallelism for latency is the other honest reason. 'More agents will be smarter' is not one."
      ],
      "math": [
        {
          "h": "Voting is Condorcet - and independence is the load-bearing assumption",
          "paras": [
            "With independent voters each right with probability p, a majority of n is more reliable than any one of them when p is above a half.",
            "The same mechanism runs in reverse below a half, which is the part people forget."
          ],
          "tex": "P_{\\text{maj}} = \\sum_{k>n/2} \\binom{n}{k} p^k (1-p)^{n-k} \\;\\;\\xrightarrow[n\\to\\infty]{}\\;\\; \\begin{cases} 1 & p > 1/2 \\\\ 0 & p < 1/2\\end{cases}",
          "texNote": "So voting AMPLIFIES in both directions - a panel of below-chance voters is driven toward zero, not toward the middle. And the whole result rests on independence: with correlated errors the ensemble barely improves on a single member, because they are wrong on the same items. Three calls to the same model with the same prompt are heavily correlated, which is why naive self-consistency across identical agents yields far less than the formula promises. Diversity has to be engineered - different prompts, different models, different evidence - or you are paying n times for one opinion."
        },
        {
          "h": "Coordination grows faster than the team",
          "paras": [
            "A supervisor topology has one edge per agent; an all-to-all discussion has an edge per pair.",
            "The second grows quadratically, which is the real reason large debating teams are impractical."
          ],
          "tex": "\\text{star: } O(n) \\;\\;=\\; n-1 \\text{ messages} \\qquad \\text{complete: } O(n^2) \\;=\\; \\frac{n(n-1)}{2} \\text{ per round}",
          "texNote": "At sixteen agents that is 15 messages versus 120 per round, and every message is tokens, latency and another chance to lose information. The practical consequence is that debate-style topologies stay small - three to five participants, two or three rounds - and anything larger should be a supervisor with specialists. This is the same reason human meetings scale badly, arrived at from the same arithmetic."
        },
        {
          "h": "Specialization needs routing, and routing can be wrong",
          "paras": [
            "A specialist beats a generalist on its own domain, but only reaches its domain when routed there correctly.",
            "That gives a crossover: below a routing accuracy, the specialist team is WORSE than one generalist."
          ],
          "tex": "P_{\\text{team}} = (1-r)\\,p_{\\text{spec}} + r\\,p_{\\text{wrong-spec}} \\quad\\text{vs}\\quad p_{\\text{gen}}, \\qquad r = \\text{routing error}",
          "texNote": "The term that hurts is p_wrong-spec: a specialist handed an out-of-domain task typically performs WORSE than a generalist would, because it is narrow, so routing errors are doubly costly. With p_spec of 0.92 and p_gen of 0.67, the team stays ahead only while routing error is modest - and routing accuracy is itself a classification problem that degrades as the number of specialists grows and their descriptions blur. So adding specialists makes routing harder, which is a feedback loop working against you."
        }
      ],
      "code": [
        {
          "h": "The four topologies, and the condition each depends on",
          "paras": [
            "Each is a different bet, and naming the bet is what makes the choice reviewable."
          ],
          "code": "# 1. ROUTER / SUPERVISOR  -  bet: ROUTING IS ACCURATE\n#    one classifier picks a specialist; O(n) coordination\n#    ✔ genuinely distinct domains with distinct tools\n#    ✘ routing error r hurts DOUBLE (a specialist off-domain is worse\n#      than a generalist) and gets WORSE as you add specialists\n\n# 2. SEQUENTIAL PIPELINE  -  bet: SUBTASKS ARE SEPARABLE\n#    research -> draft -> review -> format\n#    ✔ clean interfaces, auditable, each stage testable\n#    ✘ INHERITS s^n: 5 agents at 0.9 = 0.59, and an early error\n#      propagates through every later stage\n\n# 3. PARALLEL + AGGREGATE  -  bet: ERRORS ARE INDEPENDENT\n#    ✔ latency (real, and often the best reason), broad coverage\n#    ✘ same model + same prompt = CORRELATED errors, so the Condorcet\n#      gain mostly evaporates. Engineer diversity or don't bother.\n\n# 4. DEBATE / CRITIQUE  -  bet: CRITIQUE IS EASIER THAN GENERATION\n#    ✔ often true! verification is genuinely easier than generation,\n#      which is why a separate critic beats self-critique\n#    ✘ O(n^2) messages per round -> keep it to 3-5 agents, 2-3 rounds\n\n# ★ AND THE ONE THAT ISN'T ABOUT INTELLIGENCE AT ALL:\n# 5. CONTEXT ISOLATION - a subagent burns its OWN window on dead ends\n#    and returns only a conclusion. The main context stays clean.\n#    This is the most robust real justification, and it's structural:\n#    a context window is a scarce, shared, DEGRADABLE resource.",
          "caption": "Each topology is a bet on a condition. Writing the condition down is what turns 'add another agent' from a reflex into a decision someone can argue with."
        },
        {
          "h": "The measurements that keep a multi-agent system honest",
          "paras": [
            "Two of these are routinely skipped, and both of them decide whether the architecture was worth it."
          ],
          "code": "# ★ 1. THE BASELINE NOBODY RUNS: a SINGLE agent on the same suite.\nprint(\"single agent :\", single_score, single_cost, single_p95)\nprint(\"multi-agent  :\", multi_score,  multi_cost,  multi_p95)\n#    Multi-agent systems are typically several times the cost and\n#    latency. If the quality gain is 2 points, that is a finding - and\n#    it is the finding you most need before committing to the topology.\n\n# 2. ERROR CORRELATION between agents - the assumption under voting.\ncorr = correlation(agent_a.correct_mask, agent_b.correct_mask)\n#    High correlation (same model, same prompt) => voting buys ~nothing\n#    and you are paying n times for one opinion. Measure it, don't\n#    assume diversity because the system prompts differ.\n\n# 3. PER-AGENT AND PER-HANDOFF attribution.\n#    Failures must be attributable, or you cannot fix anything:\n#      which agent failed, and did the INTERFACE lose information?\n#    The handoff is where the information loss actually happens -\n#    agent B gets a summary of what A found, not what A saw. Log both\n#    sides of every handoff and diff them.\n\n# 4. ROUTING ACCURACY, as its own number.\n#    It is a classification problem, it degrades as specialists\n#    multiply, and the crossover where the team falls BELOW a single\n#    generalist is a real point you can compute.\n\n# THE DECISION RULE I'd apply: fewest agents the task needs. Add one\n# only when its CONDITION is measured to hold and the single-agent\n# baseline is measured to be insufficient.",
          "caption": "The single-agent baseline is the measurement that most often reverses the decision, and it is the one least often run."
        }
      ],
      "useCases": [
        "Tasks with genuinely separable subtasks and clean interfaces, where a sequential pipeline of specialists is auditable and each stage independently testable.",
        "Broad exploratory work - research over many sources - where parallel subagents both cut latency and keep their exploration out of the main context window.",
        "Generate-then-verify workflows, which exploit the genuine asymmetry that checking is easier than producing, and where a separate critic outperforms self-critique.",
        "Deciding against multi-agent, which the single-agent baseline frequently supports: several times the cost and latency for a small quality gain is a finding, not a failure."
      ],
      "pitfalls": [
        "Assuming voting helps without checking error correlation. Three calls to the same model with the same prompt are heavily correlated, so the Condorcet gain largely evaporates and you pay n times for one opinion.",
        "Forgetting that voting amplifies in BOTH directions. A panel of below-chance voters is driven toward zero rather than toward the middle, so ensembling a systematically wrong approach makes it worse.",
        "Treating specialization as free. A specialist handed an out-of-domain task usually performs worse than a generalist, so routing errors cost double - and routing accuracy degrades as you add specialists.",
        "Ignoring the compounding in a sequential team. Five agents at 90% is 59%, and an early error propagates through every downstream stage as a false assumption.",
        "Scaling a debate topology. All-to-all communication is quadratic in participants - 120 messages per round at sixteen agents - so debate stays useful only at three to five agents and two to three rounds.",
        "Never running the single-agent baseline. It is the measurement most likely to reverse the architecture decision and the one most often skipped.",
        "Failing to instrument the handoffs. Agent B receives a summary of what A found rather than what A saw, so the interface is where information is lost and where failures become unattributable."
      ],
      "connections": [
        {
          "ref": "rag-agents/agent-loops",
          "text": "The same compounding, applied across steps rather than agents - and the same conclusion, that the cheapest reliability gain is removing components rather than adding them."
        },
        {
          "ref": "supervised-learning/ensembles",
          "text": "Where the independence requirement is made precise. Bagging attacks variance and needs decorrelated learners, which is exactly the property that same-model agents lack."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "The case where composition inverts - independent layers multiply the attacker's failure probability, so adding components helps rather than hurts."
        },
        {
          "ref": "rag-agents/rag-eval",
          "text": "The per-stage attribution discipline this lesson depends on: without per-agent and per-handoff measurement a multi-agent failure is unfixable."
        },
        {
          "ref": "agentic-ai/multi-agent",
          "text": "The dedicated treatment, with the specialization crossover, Condorcet behaviour and coordination costs measured directly against known ground truth."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three mechanisms multi-agent systems rely on?",
          "a": "Specialization, which needs accurate routing; voting, which needs independent errors; and decomposition, which needs cleanly separable subtasks."
        },
        {
          "q": "What is the load-bearing assumption behind voting?",
          "a": "Independence. With correlated errors the ensemble barely beats one member, because they are wrong on the same items."
        },
        {
          "q": "Are three calls to the same model independent?",
          "a": "No - they are heavily correlated, so naive self-consistency across identical agents yields far less than Condorcet promises."
        },
        {
          "q": "What happens when you ensemble below-chance voters?",
          "a": "Majority voting drives the result toward zero, not toward the middle. It amplifies in both directions."
        },
        {
          "q": "Why do routing errors cost double?",
          "a": "A specialist handed an out-of-domain task typically does worse than a generalist would, so you lose the specialist's advantage and take a penalty."
        },
        {
          "q": "What happens to routing as you add specialists?",
          "a": "It gets harder - more classes with blurrier descriptions - so adding specialists degrades the mechanism they depend on."
        },
        {
          "q": "Five agents in a pipeline at 90% each?",
          "a": "About 59%, and an early error propagates as a false assumption through every later stage."
        },
        {
          "q": "How does coordination scale?",
          "a": "A supervisor is O(n) messages; all-to-all debate is O(n squared) per round - 120 at sixteen agents versus 15."
        },
        {
          "q": "So how big should a debate be?",
          "a": "Three to five participants, two or three rounds. Beyond that use a supervisor with specialists."
        },
        {
          "q": "What is the most robust justification for multi-agent?",
          "a": "Context isolation - a subagent burns its own window on dead ends and returns only a conclusion, keeping the main context clean. Plus parallelism for latency."
        },
        {
          "q": "Why does a separate critic beat self-critique?",
          "a": "Verification is genuinely easier than generation, and a separate critic is not anchored on the reasoning that produced the answer."
        },
        {
          "q": "What is the measurement most likely to reverse the decision?",
          "a": "The single-agent baseline on the same suite, reported with cost and p95 latency. It is also the one most often skipped."
        }
      ],
      "standard": [
        {
          "q": "When is a multi-agent system actually the right architecture?",
          "a": "LESS OFTEN THAN IT IS BUILT, and the honest way to answer is to name the mechanism you are relying on, because each one has a condition and the conditions are frequently unmet. THE THREE STANDARD MECHANISMS AND THEIR CONDITIONS. SPECIALIZATION requires accurate routing. A team of specialists beats a generalist on their own domains, but only reaches those domains when routed correctly - and a specialist handed an out-of-domain task usually performs WORSE than a generalist, so routing errors cost twice. There is a genuine crossover: below some routing accuracy the specialist team falls below a single generalist. Worse, routing accuracy degrades as you add specialists, since it is a classification problem with more classes and blurrier boundaries, so the architecture undermines the mechanism it depends on. VOTING requires independent errors. Condorcet says a majority of independent above-chance voters beats any one of them, and it is a real effect. But three calls to the same model with the same prompt are heavily correlated - they are wrong on the same items - so the gain largely evaporates. Diversity has to be engineered: different models, different prompts, different evidence. Otherwise you are paying n times for one opinion. And it amplifies in both directions, so ensembling a systematically wrong approach makes it worse. DECOMPOSITION requires separable subtasks. A pipeline of five agents at 90% each is 59% end-to-end, and an early error propagates as a false assumption through every stage after it. Decomposition works when the interfaces are clean and each stage's output is checkable; it fails when the subtasks are entangled and the handoff loses the context the next stage needed. THE JUSTIFICATIONS I FIND MORE ROBUST, and I would lead with these. CONTEXT ISOLATION: a subagent exploring a dead end fills its OWN window with false starts and returns only a conclusion, keeping the main agent's context clean. That is architectural rather than about collective intelligence, and it holds up because a context window is a scarce, shared, degradable resource. PARALLELISM for latency, when subtasks genuinely are independent. And VERIFICATION, because checking really is easier than generating, which makes a separate critic a good bet - and separate rather than self-critique matters, since a self-critic is anchored on the reasoning that produced the answer. THE DECISION PROCEDURE I WOULD USE: run the single-agent baseline on the same suite, with cost and p95 latency, before committing. Multi-agent systems are typically several times the cost and latency of one agent, so a two-point quality gain is a finding that should stop the project. Then add agents one at a time, each with its condition stated and measured. The rule I would state is the fewest agents the task needs - which is the same conclusion 18-06 reached about steps, arrived at by the same arithmetic.",
          "deepDive": {
            "q": "Design a multi-agent research system, and defend each decision.",
            "a": "I WOULD BUILD IT AS A SUPERVISOR WITH PARALLEL SEARCH SUBAGENTS, and the defence rests mostly on context isolation and latency rather than on collective intelligence - which I think is the honest framing for this particular task. THE ARCHITECTURE. A LEAD agent that decomposes the research question into subtopics, spawns a SUBAGENT per subtopic to search and read, receives their written findings, and synthesizes. Optionally a CITATION checker at the end that verifies each claim against the retrieved sources. Star topology, so coordination is O(n) rather than quadratic - the subagents do not talk to each other, and that is deliberate. WHY THIS TASK SUITS IT, which is the part that has to be argued rather than assumed. Research is genuinely PARALLEL - subtopics are largely independent, so several searches can run at once and the latency is the slowest branch rather than the sum. It is CONTEXT-HUNGRY: a thorough search burns an enormous number of tokens on pages that turn out to be irrelevant, and the isolation property means that waste stays in the subagent's window instead of degrading the lead's. And it is VERIFIABLE at the end, because claims can be checked against sources. Those three properties are what justify the topology; a task lacking them would not get this design. THE DECISIONS I WOULD DEFEND SPECIFICALLY. Subagents do NOT communicate with each other - all-to-all is quadratic and buys little when subtopics are independent, so information flows through the lead. Subagents return WRITTEN FINDINGS, not raw transcripts - the handoff is where information is lost, and forcing a structured summary makes the loss explicit and reviewable rather than accidental. The lead specifies each subagent's task precisely, including what a good answer looks like, because vague delegation is the largest single source of wasted subagent work. Every subagent gets a step and cost budget, since the compounding and heavy-tailed cost from 18-06 apply per subagent and the totals multiply across them. And the citation check is a SEPARATE agent rather than self-review, exploiting the verification asymmetry and avoiding the anchoring of self-critique. WHAT I WOULD MEASURE, and the first one is the one that decides whether any of it was worth building. The SINGLE-AGENT BASELINE on the same questions with cost and p95 - a research system like this can easily be several times the token cost of one agent, so the quality gain has to justify a real multiple. Then: per-subagent success, so failures are attributable; the handoff diff, comparing what the subagent saw against what it reported, which is where the loss shows up; citation validity as an unfoolable quality signal; and the distribution of subagent counts, because a lead that spawns eight subagents for a question needing two is paying for a decomposition it did not need. WHERE I EXPECT IT TO FAIL. Questions requiring synthesis ACROSS subtopics, where the insight lives in the connection between two branches and neither subagent can see it - the decomposition destroys exactly the information the question needed. Questions where subtopics are actually dependent, so hop two needed hop one's answer and the parallelism was wrong. And cost, which is the failure people notice - this design's token consumption is dramatically higher than a single agent's, and that is a product decision that should be made explicitly rather than discovered on a bill."
          }
        },
        {
          "q": "How do you get real diversity in an ensemble of agents?",
          "a": "BY ENGINEERING IT, because it does not arrive by default and the whole Condorcet benefit depends on it. The failure mode is specific: teams instantiate three agents with different system prompts, observe that the prompts differ, and conclude the errors are independent. They are not - same model, same training, same weaknesses - so they are wrong on the same items, and the ensemble inherits one agent's error profile at three times the cost. THE SOURCES OF DIVERSITY, roughly in decreasing effectiveness. (1) DIFFERENT MODELS, ideally from different families and training pipelines. This is the strongest lever because the errors have genuinely different origins. It costs operational complexity - multiple providers, different rate limits and failure modes - which is the honest trade. (2) DIFFERENT EVIDENCE. Give each agent a different retrieved context, a different slice of the corpus, a different tool. This is often the most practical option because it works even within one model: the errors differ because the INPUTS differ, and you also get coverage as a bonus. (3) DIFFERENT DECOMPOSITIONS or reasoning strategies - one works forward from the premises, another backward from the candidate answer, another by elimination. Genuinely different paths produce genuinely different errors. (4) TEMPERATURE, which is the weakest and most commonly used. Sampling diversity gives you variation around the same mode; it does not fix a systematic error, and a model confidently wrong about something will be confidently wrong at every temperature. HOW I WOULD VERIFY IT rather than assume it: measure the CORRELATION of the correctness masks across agents on the eval set. That is one line and it settles the question. High correlation means the ensemble is theatre - drop it and spend the budget on one better agent or on more retrieval. Low correlation means the mechanism is live and voting should help by roughly the amount the formula predicts. I would report that correlation next to any ensemble result, because without it the reader cannot tell whether the gain came from the ensemble or from n times the compute. THE ASYMMETRIC ALTERNATIVE, which is often better than voting: GENERATE-THEN-VERIFY. Rather than n agents producing n answers to be voted on, have one produce and another check. This exploits a real asymmetry - verification is easier than generation - and it does not require independence in the same way, because the verifier is doing a different task rather than the same task again. It also produces something a vote cannot: a REASON, which is auditable. When I have a fixed budget of extra calls, spending them on verification usually beats spending them on more opinions. AND THE CAVEAT WORTH STATING: even a perfect ensemble cannot fix a systematically wrong approach, because voting amplifies whatever the population believes. If all your agents share a false premise from the retrieved context, unanimity is not evidence - it is correlation, and it will look exactly like confidence."
        },
        {
          "q": "How would you debug a multi-agent system that produces poor results?",
          "a": "BY MAKING FAILURES ATTRIBUTABLE FIRST, because 'the system gave a bad answer' in a multi-agent architecture is close to uninformative - the answer passed through several components and any of them, or any interface between them, could be responsible. Without attribution you are guessing, and multi-agent systems are expensive to guess about. THE INSTRUMENTATION I WOULD REQUIRE. Log every agent's input, output, and cost. Log BOTH SIDES of every handoff. And log the routing decision with its alternatives, if there is a router. That is enough to answer the questions below and it is not optional - a multi-agent system without per-agent logging is not debuggable, only replaceable. THE DIAGNOSTIC ORDER. (1) IS IT THE ROUTER? Check routing accuracy against a labelled sample. This is a classification problem with its own metric, and it degrades as specialists multiply. A wrongly-routed task lands on a specialist that is worse than a generalist for it, so this failure is doubly costly and it masquerades as a specialist being weak. (2) IS IT ONE AGENT? Per-agent success rates on tasks routed to them correctly. If one is weak, you have a normal single-agent problem and 18-06's diagnostics apply. (3) ★ IS IT THE HANDOFF? This is where I would look hardest, because it is the failure most specific to this architecture and the least instrumented. Agent B receives a SUMMARY of what A found, not what A saw. Diff the two: what did A have access to, and what did it pass on? The characteristic failure is A discovering a caveat, judging it minor, omitting it, and B building a confident conclusion that the caveat would have blocked. No individual agent is wrong; the INTERFACE lost the information. (4) IS IT COMPOUNDING? If per-agent rates are all high and end-to-end is poor, compute the product. Five at 0.9 is 0.59, and the architecture is the problem rather than any component - which means the fix is fewer agents, not better ones. (5) IS IT CORRELATION, on a voting design? Measure the correlation of correctness masks. If it is high the vote is decoration. THE COMPARISON I WOULD RUN ALONGSIDE ALL OF IT: the single-agent baseline. It is common for this to reveal that the multi-agent system is worse, or barely better at several times the cost - and that outcome is easier to accept when the number was collected as part of debugging rather than presented as a verdict on someone's design. THE FIX THAT MOST OFTEN WORKS, honestly: remove an agent. Merge two stages whose handoff keeps losing information. Replace a specialist pair with one generalist and skip the routing risk. Collapse a debate to a single generate-then-verify pair. Each removal deletes a factor from the product and an interface from the surface area, and in a system with many components the cheapest reliability gain is almost always subtraction."
        },
        {
          "q": "What is the case for and against agent debate?",
          "a": "THE CASE FOR rests on a real asymmetry: verification is easier than generation. Checking whether an argument holds is a smaller problem than producing it, which is why a critic can catch errors its own generator would not have avoided - and why a SEPARATE critic outperforms self-critique, since a self-critic is anchored on the reasoning that produced the answer and tends to rationalize rather than check. Debate operationalizes that: several agents produce positions, critique each other, and revise. The published results show gains on reasoning and factuality tasks, and the mechanism is plausible rather than mysterious - an error that survives one pass often does not survive being challenged specifically. THE CASE AGAINST, and there are four distinct objections. COST. Every round multiplies the calls, and all-to-all communication is quadratic in participants: sixteen agents is 120 messages per round versus 15 for a supervisor. That confines debate to small groups and few rounds, which limits how much it can deliver. CORRELATION. If the debaters are the same model, they share the same blind spots, so they will agree on the same wrong answer and the debate converges quickly and confidently to it. Agreement between correlated agents is not evidence, though it reads exactly like confidence - which makes this failure worse than useless, since it manufactures unwarranted certainty. SYCOPHANCY AND ANCHORING. Models tend to accommodate a confidently-stated position, so debates can converge on whoever asserted first or loudest rather than on whoever is right. The first position stated has undue influence, which is a bias worth controlling for by randomizing order and by having agents commit to positions independently before seeing others. AND THE COMPARISON THAT IS USUALLY MISSING: debate is rarely compared against the obvious cheaper alternative - one strong agent with a longer reasoning budget, or a single generate-then-verify pair. Some reported debate gains plausibly reflect more total computation rather than the debate structure, and separating those requires a compute-matched baseline that is not always run. WHERE I WOULD USE IT. Small groups, two or three rounds, on tasks where errors are checkable and the stakes justify the cost - and with engineered diversity, ideally different models, so the independence assumption has some basis. WHERE I WOULD NOT. Anything latency-sensitive, anything high-volume, and anything where the agents are identical, which describes most implementations. WHAT I WOULD DO INSTEAD, as a default: generate-then-verify with a separate critic. It captures the verification asymmetry, which is the part of debate that is genuinely load-bearing, at a fraction of the cost and with no quadratic term. It also produces an auditable reason rather than a vote, which is worth more than the vote in most products. Debate is the elaborate version of an idea whose simple version already delivers most of the value."
        },
        {
          "q": "How should agents share state and memory?",
          "a": "DELIBERATELY, BECAUSE THE SHARING MECHANISM IS WHERE MULTI-AGENT SYSTEMS ACTUALLY FAIL - not inside the agents but between them. Each agent has its own context window, so 'shared state' is not a given; it is something you build, and the design choice determines what gets lost. THE THREE PATTERNS. (1) MESSAGE PASSING. Each agent receives a written message from the previous one. Simple, auditable, and the default in most frameworks. Its property - and this is the thing to internalize - is that the message is a SUMMARY of what the agent found, not a record of what it saw. That compression is where information dies, and it is invisible unless you instrument it. (2) SHARED SCRATCHPAD or blackboard. A common structured store all agents read and write - findings, open questions, decisions with their rationale. Better than message passing because information is not repeatedly re-compressed at each hop, and because a late agent can consult an early finding directly rather than through three layers of summary. The cost is contention and context budget: everyone reads it, so it grows into everyone's window and eventually crowds out the task. (3) EXTERNAL MEMORY - a store the agents query rather than carry. Documents, a database, a vector index of prior findings. This scales past the window and is the right answer once the shared state outgrows a prompt, at the price of turning recall into a retrieval problem with its own recall ceiling - which is the earlier half of this module reappearing inside the agent system. WHAT I WOULD ACTUALLY BUILD: a STRUCTURED handoff rather than free text. Not 'here is what I found' but explicit fields - findings, sources, confidence, caveats, what I could NOT determine. The last two matter most. The characteristic multi-agent failure is an agent discovering a caveat, judging it minor, omitting it from its summary, and a downstream agent building a confident conclusion the caveat would have blocked. Nobody was wrong; the interface had no slot for it. Giving uncertainty a required field is a small change that prevents a whole failure class, for the same reason that making 'unknown' expressible in a tool schema prevents fabrication - if there is no legal way to express a doubt, it will not be expressed. THE MEASUREMENT: log both sides of every handoff and diff them. What did the agent have access to, and what did it pass on? That diff is the most informative artefact in a multi-agent system and almost nobody collects it. Track handoff size too, since a summary that is growing over a long chain often means agents are forwarding raw material rather than synthesizing, and one that is shrinking fast means compression is destroying detail. THE DESIGN PRINCIPLE I WOULD STATE: prefer fewer, richer handoffs to many lossy ones. Every interface is a compression step, so a five-agent chain compresses four times and a two-agent pair compresses once. That is another argument in the same direction as everything else in this lesson - the fewest agents the task needs - and it arrives from information flow rather than from reliability arithmetic, which is what makes it worth stating separately."
        },
        {
          "q": "How does this lesson complete the module's framing?",
          "a": "IT SHOWS THE MULTIPLICATION STRUCTURE ACQUIRING A SECOND TERM, and that is the specific contribution beyond 18-06. There, adding a step multiplied reliability by a factor below one. Here, adding an AGENT does that too - a five-stage pipeline at 0.9 each is 0.59 - and it additionally adds COORDINATION, which grows faster than the team: quadratically in an all-to-all topology. So the cost of a component is now superlinear in the component count, which is a stronger statement than 18-06's and it drives the same conclusion harder: use the fewest agents the task requires. IT ALSO SHOWS THAT THE MECHANISMS ARE CONDITIONAL, which is the transferable idea. Specialization is not good in itself - it is good WHEN routing is accurate, and routing gets worse as specialists multiply, so the architecture erodes its own precondition. Voting is not good in itself - it is good WHEN errors are independent, and same-model agents are not. Decomposition is not good in itself - it is good WHEN subtasks separate cleanly and the handoff preserves what the next stage needs. Naming the condition is what converts 'add another agent' from a reflex into a decision someone can argue with, and every one of those conditions is measurable in an afternoon. THE MEASUREMENT THAT ANCHORS IT, and it is the module's evaluation discipline applied to architecture: the single-agent baseline. It is the number most likely to reverse the decision and the number least often collected, for the same reason 18-05's per-stage decomposition is skipped - the aggregate looks fine, the architecture is the interesting artefact, and nobody wants the comparison that says the elaborate version was not needed. AND IT SETS UP THE INVERSION, which is what makes the module's framing complete rather than merely cautionary. Everything so far has been composition working AGAINST you: ceilings bound you, factors multiply below one, coordination grows quadratically. 18-09 is where the sign flips. Independent guardrail layers multiply the ATTACKER's failure probability, so three imperfect defences at 0.6, 0.8 and 0.9 detection take attack success from 1.0 to 0.008. Same arithmetic, opposite direction, and the difference is structural: in a pipeline all components must succeed, in a defence any one succeeding suffices. Learning to ask which of those two you are building is the single most useful habit this module offers, because it tells you in advance whether the next component you add will help or hurt."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The three mechanisms, each CONDITIONAL",
        "back": "SPECIALIZATION needs accurate routing · VOTING needs INDEPENDENT errors · DECOMPOSITION needs separable subtasks. None is unreliable in principle; all fail when the condition is unmet — and it usually is."
      },
      {
        "type": "formula",
        "front": "Condorcet amplifies in BOTH directions",
        "back": "Majority of n independent voters → 1 if p>½, → 0 if p<½. So ensembling a systematically wrong approach makes it WORSE. And independence is load-bearing: correlated voters are wrong on the same items."
      },
      {
        "type": "pitfall",
        "front": "Different system prompts ≠ independence",
        "back": "Same model, same training, same weaknesses. Measure the CORRELATION of correctness masks — one line. High correlation → the vote is theatre and you're paying n× for one opinion."
      },
      {
        "type": "formula",
        "front": "Coordination grows faster than the team",
        "back": "star O(n) = n−1 messages · complete O(n²) = n(n−1)/2 per round. 16 agents: 15 vs 120. Hence debate stays at 3–5 agents, 2–3 rounds; anything bigger is a supervisor."
      },
      {
        "type": "formula",
        "front": "Routing errors cost DOUBLE",
        "back": "P_team = (1−r)·p_spec + r·p_wrong-spec. A specialist off-domain is worse than a generalist, so you lose the edge AND take a penalty. Below a routing accuracy the team falls BELOW one generalist."
      },
      {
        "type": "pitfall",
        "front": "Adding specialists degrades routing",
        "back": "Routing is a classification problem — more classes, blurrier descriptions, lower accuracy. So the architecture erodes the very precondition it depends on. A feedback loop working against you."
      },
      {
        "type": "intuition",
        "front": "★ The most robust justification: CONTEXT ISOLATION",
        "back": "A subagent burns its OWN window on dead ends and returns only a conclusion — the main context stays clean. Nothing to do with collective intelligence; it's that a context window is a scarce, shared, DEGRADABLE resource."
      },
      {
        "type": "intuition",
        "front": "Generate-then-verify beats voting on a fixed budget",
        "back": "Verification is genuinely easier than generation, and a SEPARATE critic isn't anchored on the reasoning that produced the answer. It needs no independence assumption and yields an auditable REASON, not a vote."
      },
      {
        "type": "pitfall",
        "front": "★ The baseline nobody runs",
        "back": "A SINGLE agent on the same suite, with cost and p95. Multi-agent is typically several × the cost and latency — so a 2-point gain is a finding that should stop the project. Most-likely-to-reverse, least-often-collected."
      },
      {
        "type": "pitfall",
        "front": "The handoff is where information is lost",
        "back": "Agent B gets a SUMMARY of what A found, not what A saw. Classic failure: A finds a caveat, judges it minor, omits it; B builds a confident conclusion the caveat would have blocked. No agent is wrong — the INTERFACE lost it. Log both sides and diff."
      },
      {
        "type": "intuition",
        "front": "The case against debate, in four parts",
        "back": "COST (quadratic messages) · CORRELATION (same model → confident agreement on the same wrong answer) · SYCOPHANCY/anchoring on whoever asserted first · and the missing COMPUTE-MATCHED baseline (one agent, longer budget)."
      },
      {
        "type": "intuition",
        "front": "The fix that most often works: SUBTRACTION",
        "back": "Merge two stages whose handoff keeps losing information; replace a specialist pair with one generalist and skip the routing risk; collapse a debate to generate-then-verify. Each removal deletes a factor AND an interface."
      }
    ],
    "refs": [
      {
        "title": "Du et al. (2023), Improving Factuality and Reasoning in Language Models through Multiagent Debate",
        "url": "https://arxiv.org/abs/2305.14325"
      },
      {
        "title": "Wu et al. (2023), AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
        "url": "https://arxiv.org/abs/2308.08155"
      },
      {
        "title": "Hong et al. (2023), MetaGPT: Meta Programming for a Multi-Agent Collaborative Framework",
        "url": "https://arxiv.org/abs/2308.00352"
      },
      {
        "title": "Park et al. (2023), Generative Agents: Interactive Simulacra of Human Behavior",
        "url": "https://arxiv.org/abs/2304.03442"
      },
      {
        "title": "Anthropic (2025), How We Built Our Multi-Agent Research System",
        "url": "https://www.anthropic.com/engineering/multi-agent-research-system"
      }
    ],
    "demos": [
      "agent-router",
      "react-agent",
      "bagging-boosting",
      "guardrails"
    ]
  }
};
