// GENERATED from content/lessons/agentic-ai/multi-agent.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/multi-agent/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "multi-agent": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The structural argument for and against multi-agent systems is made in 18-07: three mechanisms, each conditional, each failing when its condition is unmet. This lesson does the thing that makes those conditions usable - it locates the CROSSOVERS. Knowing that specialization needs accurate routing is a caution; knowing that a specialist team falls below a single generalist once routing error exceeds 0.37 is a design constraint you can check against your router's measured accuracy this afternoon.",
        "The three numbers are worth carrying. SPECIALIZATION: a supervisor with specialists scores 0.92 against a generalist's 0.67 when routing is perfect, and the two curves cross at a routing error of about 0.37 - so the question 'should I use specialists' becomes 'is my router better than roughly 63% accurate', which is answerable. VOTING: independent errors take 0.61 to 0.79, correlated errors leave it flat near 0.62, and a below-chance population at 0.40 gets driven toward zero rather than toward the middle. PIPELINES: ten stages at 0.9 each is 0.34.",
        "That last pair of facts is the one that changes behaviour. Voting is not a safety net - it is an amplifier, and it amplifies whatever direction the population leans. A team of correlated agents that share a wrong assumption will agree, confidently and unanimously, and the unanimity reads as evidence. Combined with the coordination cost - 32 messages for a supervisor topology at sixteen agents against 240 for all-to-all - the practical conclusion is the same one the structural argument reached, now with numbers attached: use the fewest agents the task actually needs."
      ],
      "math": [
        {
          "h": "The specialization crossover, solved",
          "paras": [
            "A specialist team beats a generalist only while routing error stays below a threshold, and the threshold is computable.",
            "Below it, specialists win; above it, one generalist is strictly better."
          ],
          "tex": "(1-r)\\,p_{\\text{spec}} + r\\,p_{\\text{wrong}} = p_{\\text{gen}} \\;\\Longrightarrow\\; r^{*} = \\frac{p_{\\text{spec}} - p_{\\text{gen}}}{p_{\\text{spec}} - p_{\\text{wrong}}} \\approx 0.37",
          "texNote": "With specialists at 0.92, a generalist at 0.67 and a mis-routed specialist performing worse than a generalist would, the curves cross near a routing error of 0.37. So the architecture question becomes a measurement: is the router better than about 63% accurate on my traffic? And note the direction of the feedback - adding specialists increases the number of classes the router must separate, which pushes r UP, so the architecture erodes the condition it depends on."
        },
        {
          "h": "Voting amplifies in both directions",
          "paras": [
            "Condorcet is a real effect and it is conditional on independence, and it has a second edge people forget.",
            "The measured numbers show all three cases."
          ],
          "tex": "\\text{independent } 0.61 \\to 0.79, \\qquad \\text{correlated } 0.62 \\to 0.62, \\qquad \\text{below chance } 0.40 \\to 0",
          "texNote": "The first is the promise, the second is what you usually get from copies of one model, and the third is the one nobody mentions: majority voting over a systematically wrong population drives the result toward zero, not toward the middle. So an ensemble of agents sharing a false premise produces confident unanimity, and unanimity reads as evidence. Measure the correlation of correctness masks before believing a voting result."
        },
        {
          "h": "Fragility and coordination, both superlinear in the wrong way",
          "paras": [
            "A chain multiplies; an all-to-all discussion grows quadratically.",
            "Together they bound how large a useful team can be."
          ],
          "tex": "s^{n}: \\;0.9^{10} = 0.34, \\qquad \\text{star } n-1 = 32 \\;\\;\\text{vs}\\;\\; \\text{complete } \\tfrac{n(n-1)}{2} = 240 \\;\\;(n=16)",
          "texNote": "Ten competent agents in sequence produce a system that fails two times in three, and every message in a debate topology is tokens, latency and another chance to lose information at an interface. The two constraints point the same way and they are why real multi-agent systems are small: a supervisor with a handful of specialists, or a debate among three to five, and essentially never a large flat team."
        }
      ],
      "code": [
        {
          "h": "The three crossovers, as decision rules",
          "paras": [
            "Each mechanism has a checkable condition rather than a general recommendation."
          ],
          "code": "# 1. SPECIALIZATION - the crossover is a ROUTER ACCURACY threshold.\n#      routing perfect:   specialists 0.92  vs  generalist 0.67\n#      crossover:         r* ~ 0.37  (routing error)\n#    ★ DECISION RULE: measure router accuracy on real traffic. Above\n#      ~63% correct -> specialists win. Below -> ONE generalist is\n#      strictly better, and you have been paying for orchestration to\n#      get a worse answer.\n#    ⚠ FEEDBACK: adding specialists adds classes, which pushes r UP.\n#      The architecture erodes its own precondition as it grows.\n\n# 2. VOTING - the condition is INDEPENDENCE, and it cuts both ways.\n#      independent errors:  0.61 -> 0.79      (the promise)\n#      correlated errors:   0.62 -> 0.62      (what you usually get)\n#      below chance (0.40): ---> 0            (★ the forgotten edge)\n#    ★ DECISION RULE: measure correlation of the correctness masks.\ncorr = np.corrcoef(agent_a.correct, agent_b.correct)[0,1]\n#      High -> the vote is theatre; you're paying n x for one opinion.\n#    ⚠ And voting AMPLIFIES: a population sharing a false premise\n#      agrees unanimously, and unanimity READS as evidence.\n\n# 3. PIPELINES - the condition is a short chain.\n#      0.9 ** 10 = 0.34    <- ten competent agents, two-in-three failure\n#    ★ DECISION RULE: count the stages. Each one is a factor.\n\n# 4. COORDINATION - superlinear, so it bounds team size.\n#      star (supervisor):  n-1        =  32 msgs   at n=16\n#      complete (debate):  n(n-1)/2   = 240 msgs   at n=16\n#    ★ Hence: supervisor + a handful of specialists, or debate among\n#      3-5. Large flat teams are not a thing that works.",
          "caption": "Each mechanism reduces to a number you can measure this afternoon — router accuracy, error correlation, stage count, message count — rather than an architectural preference."
        },
        {
          "h": "The comparison that decides it, and the one nobody runs",
          "paras": [
            "Two baselines, both cheap, both frequently omitted."
          ],
          "code": "# ★ BASELINE 1 - A SINGLE AGENT on the same suite, with cost and p95.\nprint(\"single :\", s_score, s_cost, s_p95)\nprint(\"multi  :\", m_score, m_cost, m_p95)\n#   Multi-agent is typically SEVERAL TIMES the cost and latency. A\n#   2-point quality gain against 4x cost is a finding that should stop\n#   the project - and it is the number least often collected.\n\n# ★ BASELINE 2 - COMPUTE-MATCHED. Give the single agent the same total\n#   budget: more reasoning, more retries, best-of-n sampling.\n#   Some reported multi-agent gains are more COMPUTE, not more\n#   ARCHITECTURE - and only this baseline separates them.\n\n# WHAT TO INSTRUMENT so failures are attributable at all:\n#   per-agent success (on tasks routed to them CORRECTLY)\n#   routing accuracy + the CONFUSION MATRIX (names the merge candidates)\n#   error correlation between agents (the voting assumption)\n#   both sides of every HANDOFF, diffed  <- where information dies\n\n# THE HANDOFF, again, because it is the failure most specific to this\n# architecture: agent B receives a SUMMARY of what A found, not what A\n# SAW. A finds a caveat, judges it minor, omits it; B builds a\n# confident conclusion the caveat would have blocked. Neither agent is\n# wrong. The INTERFACE lost it - the same silent-loss shape as\n# summarization memory (21-05), arriving at a boundary instead.\n\n# ★ THE FIX THAT MOST OFTEN WORKS: remove an agent. Each removal\n#   deletes a FACTOR from the product AND an interface from the\n#   surface area.",
          "caption": "The compute-matched baseline is the one that separates 'more architecture' from 'more compute' — and some published gains do not survive it."
        }
      ],
      "useCases": [
        "Deciding whether specialists beat a generalist, which reduces to measuring router accuracy against the 0.37 error crossover.",
        "Deciding whether a vote is worth its cost, which reduces to measuring error correlation between the agents you were going to poll.",
        "Sizing a team, where the coordination cost and the chain fragility both argue for the smallest configuration that covers the task.",
        "Auditing an existing multi-agent system, where the single-agent and compute-matched baselines frequently show the architecture is not earning its multiple."
      ],
      "pitfalls": [
        "Adopting specialists without measuring the router. The curves cross at about 0.37 routing error, below which one generalist is strictly better and the orchestration is buying a worse answer.",
        "Forgetting that adding specialists makes routing harder. More classes with blurrier boundaries push routing error up, so the architecture erodes the precondition it depends on.",
        "Assuming a vote helps. Correlated agents left the score flat at 0.62 in the measured setting, so identical models with different prompts pay n times for one opinion.",
        "Treating unanimity as evidence. Voting amplifies in both directions - a below-chance population is driven toward zero, and a shared false premise produces confident agreement.",
        "Chaining many agents. Ten stages at 0.9 each gives 0.34, and an early error propagates as a false assumption through every stage after it.",
        "Scaling a debate topology. All-to-all messaging is quadratic - 240 messages per round at sixteen agents against a supervisor's 32 - so debate stays useful only at three to five participants.",
        "Skipping the single-agent baseline. It is the measurement most likely to reverse the decision and the one least often collected.",
        "Skipping the compute-matched baseline. Some multi-agent gains are more total computation rather than better architecture, and only that comparison separates them."
      ],
      "connections": [
        {
          "ref": "rag-agents/multi-agent",
          "text": "The structural argument these numbers make actionable - three conditional mechanisms, the coordination cost, and context isolation as the most robust justification."
        },
        {
          "ref": "supervised-learning/ensembles",
          "text": "Where the independence requirement is precise. Bagging attacks variance and needs decorrelated learners, which is exactly what same-model agents are not."
        },
        {
          "ref": "agentic-ai/agent-memory",
          "text": "The handoff is the same silent-loss shape as summarization memory, relocated to an interface between agents rather than inside one."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "Why per-agent attribution and the confusion matrix matter - a multi-agent failure that cannot be localized cannot be fixed."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where coordination messages become a cost line, and why message count per task is a metric worth watching in any team topology."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Where do specialists and a generalist cross over?",
          "a": "At a routing error of about 0.37. Below it specialists win; above it a single generalist is strictly better."
        },
        {
          "q": "What were the endpoint numbers?",
          "a": "Specialists 0.92 with perfect routing against a generalist's 0.67 - a large gain that is entirely conditional on the router."
        },
        {
          "q": "So what question replaces 'should I use specialists'?",
          "a": "Is my router better than roughly 63% accurate on real traffic. That is measurable in an afternoon."
        },
        {
          "q": "Why do routing errors cost double?",
          "a": "A specialist handed an out-of-domain task performs worse than a generalist would, so you lose the specialist edge and take a penalty."
        },
        {
          "q": "What happens to routing as specialists multiply?",
          "a": "It degrades - more classes, blurrier boundaries - so the architecture pushes its own crossover threshold against itself."
        },
        {
          "q": "What did voting give with independent errors?",
          "a": "0.61 to 0.79 - a real and substantial gain, and the reason the technique has a good reputation."
        },
        {
          "q": "And with correlated errors?",
          "a": "Essentially nothing - flat around 0.62 - which is what copies of one model with different prompts produce."
        },
        {
          "q": "What is the forgotten edge of Condorcet?",
          "a": "A below-chance population at 0.40 is driven toward zero, not toward the middle. Voting amplifies whatever direction the population leans."
        },
        {
          "q": "Why is unanimity not evidence?",
          "a": "Correlated agents sharing a false premise agree confidently, so agreement measures correlation rather than correctness."
        },
        {
          "q": "Ten agents in a chain at 0.9 each?",
          "a": "0.34 - a system that fails two times in three, built from components that each look competent."
        },
        {
          "q": "How does coordination scale?",
          "a": "A supervisor is n minus 1 messages - 32 at sixteen agents - while all-to-all is n times n minus 1 over 2, which is 240."
        },
        {
          "q": "What are the two baselines to run?",
          "a": "A single agent on the same suite with cost and p95, and a compute-matched single agent given the same total budget."
        }
      ],
      "standard": [
        {
          "q": "How would you decide whether to use specialist agents?",
          "a": "BY MEASURING THE ROUTER AGAINST A COMPUTED CROSSOVER, because the decision has an exact threshold rather than a judgement call. THE MEASURED PICTURE. With perfect routing, a supervisor plus specialists scored 0.92 against a single generalist's 0.67 - a large gain, and it is real. But routing is not perfect, and a mis-routed task lands on a specialist that performs WORSE than a generalist would, because a specialist is narrow. Solving for where the two curves meet gives a routing error of about 0.37. So the architectural question reduces to an empirical one: is my router better than roughly 63% accurate on real traffic? THE PROCEDURE. Label a few hundred real queries with the correct specialist. Measure routing accuracy - and measure it against the MAJORITY-CLASS baseline, because a router that looks decent may just be predicting the most common class. Compare against the crossover. If you are comfortably above it, specialists earn their orchestration. If you are near it, the architecture is buying a worse answer than one generalist would give, at higher complexity and cost. THE FEEDBACK LOOP THAT MAKES THIS UNSTABLE, and it is the part that matters over time. Routing is a classification problem, so adding specialists adds classes with blurrier boundaries and pushes routing error UP. The architecture therefore erodes the condition it depends on as it grows - a team that was comfortably above the crossover at four specialists can fall below it at twelve without anything else changing. That means the measurement is not one-time; it needs re-running whenever the roster changes. WHAT I WOULD DO WITH A CONFUSION MATRIX, which is the useful artefact rather than the scalar. It names which specialist PAIRS are being confused, and those pairs are candidates for merging or for sharper descriptions. In my experience most routing error concentrates in a small number of pairs whose scopes genuinely overlap, and fixing the taxonomy is a larger and cheaper gain than improving the router. THE ALTERNATIVE I WOULD CONSIDER FIRST: one generalist with good tools. It has no routing risk, no orchestration, no handoffs, and the measured generalist number is not catastrophic - 0.67 against a best case of 0.92. Whether that gap justifies the machinery depends on the task, and the honest way to find out is the single-agent baseline with cost and latency attached. AND THE HYBRID worth mentioning: route with a confidence threshold, and fall back to the generalist when the router is unsure. That caps the damage from mis-routing, because uncertain cases go to the component that is merely mediocre everywhere rather than to a specialist that is bad off-domain. It is a few lines and it moves the effective crossover in your favour.",
          "deepDive": {
            "q": "You inherit a five-agent system. How do you evaluate whether it should exist?",
            "a": "I WOULD RUN TWO BASELINES AND FOUR MEASUREMENTS, and I would expect the baselines to be decisive. BASELINE 1 - A SINGLE AGENT on the same task suite, reported with cost and p95 latency. Multi-agent systems are typically several times the cost and latency of one agent, so the comparison has to be against the multiple, not against zero. A two-point quality gain for four times the cost is a finding that should stop the project, and it is the number least often collected - partly because nobody wants to run the experiment that might invalidate the architecture. BASELINE 2 - COMPUTE-MATCHED. Give the single agent the SAME total budget the team consumes: longer reasoning, more retries, best-of-n sampling with a verifier. This is the baseline that separates 'more architecture' from 'more compute', and some reported multi-agent gains do not survive it. If the compute-matched single agent matches the team, the team is an expensive way to spend tokens. MEASUREMENT 1 - ROUTING ACCURACY against the 0.37 crossover, with the confusion matrix. If the router is below the crossover, the specialists are actively worse than one generalist and that is the finding. MEASUREMENT 2 - ERROR CORRELATION between any agents whose outputs are combined by voting. If it is high, the vote is decoration and the budget should go elsewhere - measured, correlated agents left the score flat where independent ones took 0.61 to 0.79. MEASUREMENT 3 - THE CHAIN LENGTH and per-agent success. If all five agents are individually strong and end-to-end is weak, compute the product: five at 0.9 is 0.59, and the architecture is the problem rather than any component. That diagnosis points at merging stages, not at improving them. MEASUREMENT 4 - THE HANDOFFS, diffed. Log what each agent had access to and what it passed on. The characteristic failure of this architecture is an agent finding a caveat, judging it minor, omitting it, and a downstream agent building a confident conclusion the caveat would have blocked. No agent is wrong; the interface lost it. This is the same silent-loss shape as summarization memory, relocated to a boundary. WHAT I EXPECT TO CONCLUDE, honestly: that the system should have fewer agents. The most common productive change in a multi-agent system is subtraction - merge two stages whose handoff keeps losing information, replace a specialist pair with one generalist and delete the routing risk, collapse a debate into a single generate-then-verify pair. Each removal deletes a factor from the reliability product AND an interface from the surface area, so it improves two things at once. AND THE CASE I WOULD PRESERVE if the numbers support it: context isolation. If subagents exist so their dead-end exploration stays out of the main context, that is a genuine architectural benefit independent of collective intelligence, and it survives all of the above. It is also the justification most likely to be true of a research or search system, so I would check whether that is what the team is actually doing before recommending consolidation."
          }
        },
        {
          "q": "When does agent voting actually help?",
          "a": "WHEN THE ERRORS ARE INDEPENDENT AND THE POPULATION IS ABOVE CHANCE, and both conditions are measurable rather than assumable. THE THREE MEASURED CASES, which together tell the whole story. Independent errors: 0.61 to 0.79 - a large, real gain, and the reason Condorcet has a good reputation. Correlated errors: flat at about 0.62 - essentially nothing, which is what you get from copies of one model with different prompts. Below-chance population at 0.40: driven toward ZERO. That third case is the one nobody mentions and it is important, because it means voting is not a safety net. It is an amplifier, and it amplifies whichever direction the population leans. HOW INDEPENDENCE FAILS IN PRACTICE. Teams instantiate three agents with different system prompts, observe that the prompts differ, and conclude the errors are independent. They are not - same model, same training, same blind spots - so they are wrong on the same items. The verification is one line: correlate the correctness masks on an eval set. If it is high, the ensemble inherits one agent's error profile at three times the cost, and the honest move is to drop it. HOW TO ENGINEER REAL DIVERSITY, in decreasing effectiveness. Different MODELS from different families, which is the strongest lever because the errors have different origins. Different EVIDENCE - give each agent a different retrieved context or tool - which works within one model and is often the most practical. Different reasoning STRATEGIES, working forward versus backward versus by elimination. And temperature, which is the weakest and most common: sampling variation moves you around one mode and does not fix a systematic error. THE ASYMMETRIC ALTERNATIVE I would usually prefer on a fixed budget: GENERATE-THEN-VERIFY. Instead of n agents producing n answers to be voted on, have one produce and another check. It exploits a genuine asymmetry - verification is easier than generation - it does not require independence in the same way because the verifier is doing a different task, and it produces a REASON rather than a tally, which is auditable. Voting gives you a number; verification gives you an argument. WHAT VOTING CANNOT FIX, and this follows directly from the amplification result: a systematically wrong approach. If all agents share a false premise - from the same retrieved context, the same system prompt, the same training - they will agree, and the agreement will look like confidence. Unanimity among correlated agents is a measurement of correlation, not of truth. That is worth stating plainly because ensembling is often reached for precisely when a system is unreliable, which is exactly the situation where shared error is most likely."
        },
        {
          "q": "How do you decide the topology of a multi-agent system?",
          "a": "FROM THE COORDINATION COST AND THE FAILURE MODE, both of which are superlinear in ways that bound the design. THE COORDINATION MATH. A supervisor topology is n minus 1 messages - the agents talk only to the lead - so 32 at sixteen agents. All-to-all discussion is n times n minus 1 over 2, so 240 at sixteen. Every message is tokens, latency, and another interface at which information can be lost. That quadratic term is why debate topologies stay small, and it is a hard constraint rather than a preference. THE TOPOLOGIES AND WHAT EACH BETS ON. SUPERVISOR or router: bets that routing is accurate, costs O(n), and is the right default when the subtasks are genuinely distinct. SEQUENTIAL pipeline: bets that subtasks are separable with clean interfaces, and inherits s to the n - ten at 0.9 is 0.34, so it must be short. PARALLEL plus aggregate: bets on independence, and is the best choice when latency matters because the wall-clock is the slowest branch rather than the sum. DEBATE: bets that critique is easier than generation, which is true, but pays the quadratic message cost so it lives at three to five agents and two to three rounds. HOW I WOULD CHOOSE. Start from the task's structure rather than from a preferred pattern. Are the subtasks independent? Then parallel, and you get latency as a bonus. Do they form a genuine sequence where each needs the previous output? Then a pipeline, kept as short as possible, with verification between stages so an error does not propagate as a false assumption. Are they distinct domains? Then a supervisor, and measure the router against the crossover. Is the value in checking rather than producing? Then generate-then-verify, which is a two-agent pipeline and the highest-value pattern per unit of complexity. WHAT I WOULD AVOID. Large flat teams, which the coordination math rules out. Long chains, which the fragility math rules out. And any topology where agents talk to each other without a clear reason - the message count grows and the failure attribution collapses, because a problem could have originated anywhere in the mesh. THE PROPERTY I WOULD OPTIMIZE FOR, which is not usually stated as a goal: ATTRIBUTABILITY. A topology where failures can be localized to an agent or a handoff is one you can improve; a mesh where they cannot is one you can only replace. That argues for star and pipeline shapes with explicit, logged interfaces, and against emergent free-form collaboration - which demos well and is very difficult to operate. AND THE DEFAULT I WOULD RECOMMEND when the answer is unclear: one agent. Then add the second only when a measurement says the first cannot do it, which is the same burden-of-proof direction the whole module keeps arriving at."
        },
        {
          "q": "Why do multi-agent systems fail in ways single agents do not?",
          "a": "BECAUSE THEY ADD TWO FAILURE SURFACES A SINGLE AGENT DOES NOT HAVE - the ROUTING decision and the HANDOFF - and both fail silently. FAILURE 1 - MIS-ROUTING. The task goes to the wrong specialist, which then performs worse than a generalist would because it is narrow and out of its domain. It does not error; it produces a confident, plausible, wrong answer in its own style. And this failure has the crossover property: past about 0.37 routing error the whole architecture is net negative, so a degradation in the router flips the system from better-than-generalist to worse without any component breaking. FAILURE 2 - THE HANDOFF. Agent B receives a SUMMARY of what A found, not what A saw. The characteristic case: A discovers a caveat, judges it minor, omits it from the handoff, and B builds a confident conclusion the caveat would have blocked. Neither agent made an error by its own lights - the INTERFACE lost the information. This is the same silent-loss shape as summarization memory, relocated to a boundary between agents, and it is invisible unless you log both sides and diff them. FAILURE 3 - COMPOUNDING, which single agents also have but teams make worse by construction, since a five-stage team has five factors where a single agent has one decision point per step. Five at 0.9 is 0.59 from components that each look fine. FAILURE 4 - CORRELATED CONFIDENCE. When outputs are combined by voting, correlated agents produce unanimity that reads as strong evidence. A single agent that is unsure at least sounds unsure; three agreeing agents sound certain, and the certainty is an artefact of shared training rather than of truth. FAILURE 5 - UNATTRIBUTABILITY, which is the meta-failure and the one that makes the others expensive. In a single agent, a bad output has one place to look. In a team, the answer passed through several components and any of them, or any interface, could be responsible - so without per-agent and per-handoff logging the system is not debuggable, only replaceable. WHAT THIS IMPLIES FOR DESIGN. Log both sides of every handoff. Give handoffs a STRUCTURE with required fields for uncertainty and for what could not be determined, because a caveat with no slot to go in will not be passed on. Measure routing accuracy continuously rather than once. Measure error correlation before trusting any aggregation. And keep the team small, because every one of these failures scales with the number of components and interfaces. AND THE HONEST SUMMARY: a multi-agent system is not a more capable version of a single agent. It is a distributed system with all the coordination failures that implies, built out of components that fail probabilistically and silently. Treating it as an org chart rather than as a distributed system is why so many of them underperform the single agent they replaced."
        },
        {
          "q": "What is the strongest genuine case for multiple agents?",
          "a": "CONTEXT ISOLATION, and it is worth separating from the popular arguments because it survives measurement while some of them do not. THE ARGUMENT. A subagent exploring a dead end fills ITS OWN context with false starts, failed searches and irrelevant material, and returns only a conclusion. The main agent's context stays clean. That is an architectural benefit with nothing to do with collective intelligence - it is about the fact that a context window is a scarce, shared, degradable resource, and that irrelevant content measurably degrades output quality rather than being neutral. Given the memory results, this is a direct answer to a measured problem. WHY IT IS STRONGER THAN THE OTHERS. Specialization is conditional on a router that degrades as you add specialists. Voting is conditional on independence that same-model agents do not have. Decomposition inherits the compounding. Context isolation has no such condition - it works because the windows are physically separate, and it works better as the task gets more exploratory, which is exactly when the other arguments get weaker. THE SECOND GENUINE CASE: PARALLELISM for latency, when subtasks are independent. Wall-clock becomes the slowest branch rather than the sum. This is a real engineering benefit and it is measurable directly. THE THIRD: VERIFICATION, exploiting the asymmetry that checking is easier than generating. A separate critic beats self-critique because it is not anchored on the reasoning that produced the answer, and it produces an auditable reason rather than a vote. WHAT I WOULD NOT ACCEPT AS A JUSTIFICATION. 'More agents will be smarter', which the measurements contradict in every mechanism unless its condition holds. 'It mirrors how a human team works', which is an analogy rather than an argument and imports coordination costs that the message math shows are worse for agents than for people - agents cannot build shared context cheaply the way colleagues do. And 'the framework makes it easy', which is how most multi-agent systems actually get built. HOW I WOULD DESIGN AROUND THE GOOD CASE. If context isolation is the reason, then the design follows from it: subagents get narrow, well-specified tasks; they return STRUCTURED findings rather than transcripts; they do not talk to each other, since the isolation is the point and a mesh would defeat it; and the lead's context holds conclusions rather than process. That is a star topology with O(n) coordination, which is also the cheapest, and it is a good sign when the justification and the efficient structure agree. AND THE TEST I would apply to any proposed multi-agent design: which of the three genuine cases is this, and what happens if I merge it into one agent? If the answer is 'nothing much, except the context gets messier', you have found the real reason - and if the answer is 'nothing much at all', you have found that you do not need it."
        },
        {
          "q": "How does this lesson differ from the structural treatment in module 18?",
          "a": "MODULE 18 ARGUED THE CONDITIONS; THIS ONE LOCATES THEM, and the difference is what makes them usable. In 18-07 the claim was that specialization requires accurate routing, voting requires independent errors, and decomposition requires separable subtasks - three conditional mechanisms, correctly identified. Each of those is a caution. Turning a caution into a design constraint requires a number, and that is this lesson's contribution. WHAT THE NUMBERS ADD. 'Specialization needs routing' becomes 'the curves cross at 0.37 routing error, so check whether your router beats 63% accuracy'. 'Voting needs independence' becomes three measured cases - 0.61 to 0.79 independent, flat at 0.62 correlated, and driven toward zero below chance - with the third case being one the structural argument did not surface at all. 'Chains compound' becomes 0.9 to the tenth equals 0.34. 'Coordination costs' becomes 32 versus 240 messages at sixteen agents. Each of those converts a discussion into a check. THE ONE FINDING THAT ONLY THE MEASUREMENT PRODUCED is the amplification edge: majority voting over a below-chance population drives the result toward zero rather than toward the middle. That is not something the structural framing suggests - if anything the structural framing implies ensembling is neutral-to-positive - and it changes how you think about the technique. Voting is not a safety net that averages out mistakes; it is an amplifier that sharpens whatever the population believes. Combined with the correlation result, it means an ensemble is most dangerous exactly when it is most reassuring: correlated agents sharing a false premise produce unanimity, and unanimity reads as evidence. THE METHOD, restated because this is the module's whole approach: take a claim that circulates as architectural wisdom, construct a setting where the ground truth is known, measure the claim, and report the REGIME rather than a verdict. Every mechanism here works somewhere and fails somewhere, and the location of the boundary is the engineering content. AND THE CONCLUSION BOTH TREATMENTS REACH, now from two directions: use the fewest agents the task needs. The structural argument gets there because components compose against you; the measurement gets there because every mechanism's condition is fragile and several of them degrade as the system grows. Agreement between an argument and a measurement is the strongest form this kind of claim comes in."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The specialization CROSSOVER",
        "back": "r* = (p_spec − p_gen)/(p_spec − p_wrong) ≈ 0.37. Specialists 0.92 vs generalist 0.67 at perfect routing. So \"should I use specialists?\" becomes \"is my router better than ~63% accurate?\" — checkable this afternoon."
      },
      {
        "type": "pitfall",
        "front": "The architecture erodes its own precondition",
        "back": "Routing is classification: adding specialists adds classes with blurrier boundaries, pushing routing error UP toward the crossover. A team comfortably above it at 4 specialists can fall below at 12 with nothing else changing."
      },
      {
        "type": "formula",
        "front": "★ Voting amplifies in BOTH directions",
        "back": "independent 0.61→0.79 (the promise) · correlated 0.62→0.62 (what you actually get) · below-chance 0.40→0 (the forgotten edge). It is not a safety net — it's an amplifier of whatever the population leans toward."
      },
      {
        "type": "pitfall",
        "front": "Unanimity is a measurement of CORRELATION",
        "back": "Agents sharing a false premise agree confidently, and the agreement reads as evidence. Ensembling is reached for exactly when a system is unreliable — which is when shared error is most likely."
      },
      {
        "type": "formula",
        "front": "Fragility and coordination, both superlinear",
        "back": "0.9¹⁰ = 0.34 — ten competent agents, two-in-three failure. Star n−1 = 32 msgs vs complete n(n−1)/2 = 240 at n=16. Both point the same way: real multi-agent systems are SMALL."
      },
      {
        "type": "intuition",
        "front": "★ The two baselines nobody runs",
        "back": "(1) SINGLE agent, same suite, with cost + p95 — multi-agent is typically several× the cost, so a 2-point gain is a stop signal. (2) COMPUTE-MATCHED single agent — separates \"more architecture\" from \"more compute\". Some published gains don't survive it."
      },
      {
        "type": "intuition",
        "front": "Measure error correlation — one line",
        "back": "corr(agent_a.correct, agent_b.correct). Different system prompts on the same model ≠ independence — same training, same blind spots, wrong on the same items. High correlation → the vote is theatre."
      },
      {
        "type": "intuition",
        "front": "Generate-then-verify beats voting on a fixed budget",
        "back": "Verification is genuinely easier than generation; a SEPARATE critic isn't anchored on the reasoning that produced the answer; it needs no independence assumption; and it yields an auditable REASON rather than a tally."
      },
      {
        "type": "pitfall",
        "front": "The handoff is the failure specific to this architecture",
        "back": "B gets a SUMMARY of what A found, not what A SAW. A finds a caveat, judges it minor, omits it; B concludes confidently. Neither agent is wrong — the INTERFACE lost it. Same silent-loss shape as summarization memory, at a boundary."
      },
      {
        "type": "intuition",
        "front": "Optimize for ATTRIBUTABILITY",
        "back": "A topology where failures localize to an agent or a handoff can be improved; a free-form mesh can only be replaced. Argues for star and pipeline shapes with explicit logged interfaces — and against emergent collaboration, which demos well and operates badly."
      },
      {
        "type": "intuition",
        "front": "★ The strongest genuine case: CONTEXT ISOLATION",
        "back": "A subagent burns its OWN window on dead ends and returns a conclusion. Unlike specialization (needs a router) or voting (needs independence), this has NO fragile condition — the windows are physically separate, and it works better the more exploratory the task."
      },
      {
        "type": "intuition",
        "front": "The test for any multi-agent design",
        "back": "Which of the three genuine cases is this — context isolation, parallel latency, or verification? And what happens if I merge it into one agent? \"Nothing much, except the context gets messier\" is the real reason. \"Nothing much at all\" means you don't need it."
      }
    ],
    "refs": [
      {
        "title": "Du et al. (2023), Improving Factuality and Reasoning in Language Models through Multiagent Debate",
        "url": "https://arxiv.org/abs/2305.14325"
      },
      {
        "title": "Wang et al. (2022), Self-Consistency Improves Chain of Thought Reasoning in Language Models",
        "url": "https://arxiv.org/abs/2203.11171"
      },
      {
        "title": "Wu et al. (2023), AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
        "url": "https://arxiv.org/abs/2308.08155"
      },
      {
        "title": "Cemri et al. (2025), Why Do Multi-Agent LLM Systems Fail?",
        "url": "https://arxiv.org/abs/2503.13657"
      },
      {
        "title": "Anthropic (2025), How We Built Our Multi-Agent Research System",
        "url": "https://www.anthropic.com/engineering/multi-agent-research-system"
      }
    ],
    "demos": [
      "agent-router",
      "bagging-boosting",
      "react-agent",
      "guardrails"
    ]
  }
};
