// GENERATED from content/lessons/agentic-ai/agent-capstone.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/agent-capstone/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "agent-capstone": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The module assembles into one agent, measured on a deliberately hazardous suite - flaky tools, injection attempts, and tasks whose required tool is dead - with each production feature toggleable so its contribution can be attributed. The result is an ablation across three axes: capability, safety, and cost bound. And the finding is that each feature moves essentially one of them, so no single configuration short of the full one is simultaneously capable, safe and bounded.",
        "One number in that table is worth the whole lesson. Adding RETRY took success from 0.41 to 0.97 - by far the largest capability gain in the module - and in the same move sent the worst-case cost to 1001 units on the dead-tool tasks, because an agent that retries a tool which will never work retries it forever. The feature that helped most and the feature that created an unbounded liability are the SAME feature. That is not a trade-off between capability and safety; it is one mechanism with two consequences, which means they have to ship together rather than being sequenced.",
        "The rest of the table has the shape the module predicted. Tools alone moved success only from 0.31 to 0.41, because tools that fail intermittently are not much use without recovery - so measuring tools in isolation understates them and the interaction is what matters. The guardrail moved attacks-blocked from 0.0 to 1.0 and did not touch success. The budget bounded worst-case cost from 1001 to 13 and did not touch either. Two features with zero measurable quality effect, and the system is unshippable without them."
      ],
      "math": [
        {
          "h": "The ablation - each feature moves its own axis",
          "paras": [
            "Three axes, five configurations, and almost no cross-movement.",
            "Reading it by column is what makes the case for each component individually."
          ],
          "tex": "\\begin{array}{lccc} & \\text{success} & \\text{attacks blocked} & \\max \\text{cost} \\\\ \\text{one-shot} & 0.31 & - & \\text{low} \\\\ +\\text{tools} & 0.41 & 0.0 & \\text{low} \\\\ +\\text{retry} & \\mathbf{0.97} & 0.0 & \\mathbf{1001} \\\\ +\\text{guardrail} & 0.97 & \\mathbf{1.0} & 1001 \\\\ +\\text{budget} & 0.97 & 1.0 & \\mathbf{13} \\end{array}",
          "texNote": "The guardrail row and the budget row move nothing on the success column - by design. An accuracy-driven evaluation would delete exactly those two, and the resulting agent would be capable, unsafe and financially unbounded. That is the capstone's argument in one table: the axes are close to independent, so a single headline metric is structurally unable to describe the system."
        },
        {
          "h": "Retry: one mechanism, two consequences",
          "paras": [
            "Feeding errors back raises effective per-step reliability sharply.",
            "On a task whose tool will never succeed, the same policy has no stopping condition."
          ],
          "tex": "s_{\\text{eff}} = 1-(1-s)^r \\;\\;\\Rightarrow\\;\\; 0.41 \\to 0.97, \\qquad \\text{but } \\mathbb{E}[\\text{cost} \\mid \\text{dead tool}] \\to \\infty \\;\\text{ without a cap}",
          "texNote": "The measured worst case was 1001 units against a bounded 13 once a budget was added. Note the structure: retries help exactly because failures are usually transient, and they run away exactly when a failure is permanent - and the agent cannot reliably tell those apart from inside the loop. So the cap is not a hedge against retries working badly; it is the necessary companion to retries working well."
        },
        {
          "h": "Reporting the held-out result properly",
          "paras": [
            "The final number comes with an interval, on tasks not used during development.",
            "Doing this is the evaluation lesson applied to the module's own result."
          ],
          "tex": "\\text{held-out success} = 0.977 \\;\\; (95\\%\\ \\mathrm{CI}\\ [0.968,\\,0.984]), \\quad \\text{attacks blocked} = 1.0, \\quad \\text{cost bounded}",
          "texNote": "The interval is narrow because the suite is large enough to support it - which is the point of the sizing argument, where a five-task suite ranks a better agent below a worse one about half the time. A capstone that reported 0.977 with no interval and no held-out split would be modelling exactly the practice the module spent a lesson arguing against."
        }
      ],
      "code": [
        {
          "h": "The assembled agent, feature by feature",
          "paras": [
            "Every component here earned its place in a specific measurement earlier in the module."
          ],
          "code": "def run(task, budget=10, cost_cap=CAP):\n    tools   = allowlist_for(task)          # 21-09: 1.00 -> 0.00 attacks,\n    history, spent = [], 0                 #        0 legit blocked\n    for step in range(budget):             # 21-01: the staircase sets B\n        action = policy(task, history)     # 21-04: hybrid replan-on-deviation\n        if action.type == \"finish\":\n            return action.answer\n\n        ok, err = validate(action, tools)   # 21-02: crashes -> retryable\n        if not ok:                          #        rejections (0.57 -> 0.57,\n            history.append(Obs(error=err))  #        but a different failure CLASS)\n            continue                        #        ★ error goes back as an\n                                            #          OBSERVATION so the retry DIFFERS\n        if risk(action) >= CONFIRM_AT:      # 21-09: 0 damage at 0.15 friction\n            return ask_user(action)         #        (conditional on your risk mix)\n\n        obs = tools[action.name](**action.args)\n        history.append(obs)                 # 21-05: managed WINDOW, not full\n                                            #        history (21-08: O(n^2))\n        spent += obs.cost\n        if spent > cost_cap:                # 21-08: heavy tail; median untouched\n            return partial(history)\n    return partial(history)                 # degrade, don't hang\n\n# EVERY LINE TRACES TO A MEASUREMENT:\n#   allowlist   1.00 -> 0.00 attacks, 0 legitimate blocked\n#   budget      the staircase (task depth), + bounds a non-halting policy\n#   validate    72/72 caught, correctness unchanged, ~10% crashes -> retries\n#   retry       0.41 -> 0.97   ★ and max cost -> 1001 without the cap\n#   window      3.1x cost at n=40 if you resend everything\n#   cost cap    max 1001 -> 13, median unchanged",
          "caption": "The loop is short and every guard in it traces to a specific measured result rather than to a general principle."
        },
        {
          "h": "Reading the ablation - the two rows that justify the whole exercise",
          "paras": [
            "One shows an interaction; two show features with no quality effect at all."
          ],
          "code": "# ★ ROW 2 -> 3: THE INTERACTION.\n#   +tools alone:  0.31 -> 0.41   (small! tools that fail intermittently\n#                                  aren't much use without recovery)\n#   +retry:        0.41 -> 0.97   (the largest single gain in the module)\n#   ⚠ So measuring TOOLS in isolation UNDERSTATES them. The pair is\n#     complementary, and an ablation that stopped at row 2 would have\n#     concluded tools were barely worth adding.\n\n# ★ THE SAME FEATURE CREATED THE LIABILITY:\n#   +retry also sent MAX COST to 1001 on dead-tool tasks - an agent\n#   retrying a tool that will NEVER work retries it forever, and it\n#   cannot tell \"transient\" from \"permanent\" from inside the loop.\n#   So retries and budgets are ONE feature, not two. Shipping retry\n#   without a cap is shipping the gain and the liability together and\n#   noticing only the gain.\n\n# ★ ROWS 4 AND 5: ZERO QUALITY MOVEMENT, BY DESIGN.\n#   +guardrail  -> attacks 0.0 -> 1.0,  success unchanged\n#   +budget     -> max cost 1001 -> 13, success unchanged\n#   An accuracy-driven evaluation DELETES BOTH, with data on its side,\n#   and ships an agent that is capable, unsafe and unbounded.\n\n# ★ THE HELD-OUT REPORT, done the way 21-07 argued for:\n#   success 0.977  (95% CI [0.968, 0.984])   <- interval, not a point\n#   attacks blocked 1.0 · cost bounded · on tasks NOT used in development",
          "caption": "Rows 4 and 5 are the argument: two features with no measurable quality effect, without which the system cannot ship."
        }
      ],
      "useCases": [
        "Presenting an agent to reviewers, where an ablation across capability, safety and cost justifies each component individually rather than as a package.",
        "Deciding what to build next on an existing agent, since the axis with the worst number names the missing feature.",
        "Auditing an agent someone else built, by asking which of the three axes were ever measured - usually only the first.",
        "Interview system-design answers on agents, where the per-axis decomposition and the retry-versus-budget pairing distinguish a designed answer from a component list."
      ],
      "pitfalls": [
        "Optimizing a single success metric. The axes are close to independent, so a team improves the one that is easiest and ships a system that is unsafe or unbounded while reporting progress.",
        "Deleting features that show no quality gain. Guardrails and budgets move zero success by design, and an accuracy-driven evaluation removes exactly the components that make the agent deployable.",
        "Shipping retries without a cost cap. The same mechanism that took success from 0.41 to 0.97 sent worst-case cost to 1001, because a permanently failing tool has no stopping condition.",
        "Measuring features in isolation. Tools alone moved success only 0.31 to 0.41; their value appears only in combination with recovery, so an ablation that stops early understates them.",
        "Reporting a final number without an interval or a held-out split. That is precisely the practice the evaluation lesson argues against, and a capstone doing it would undercut its own module.",
        "Assuming an agent can distinguish transient from permanent failure from inside the loop. It cannot reliably, which is why the budget is a structural companion to retry rather than a hedge.",
        "Treating the hazardous suite as pessimistic. Flaky tools, injection attempts and dead dependencies are ordinary production conditions, and an agent evaluated only on clean tasks has not been evaluated."
      ],
      "connections": [
        {
          "ref": "rag-agents/capstone-assistant",
          "text": "The same one-feature-one-axis finding on a retrieval-centred system, with the build order that puts the loop late and the eval set first."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "Where the reporting discipline comes from - held-out tasks, confidence intervals, and the suite sizing that makes a comparison mean anything."
        },
        {
          "ref": "agentic-ai/agent-security",
          "text": "The measured basis for the allowlist and confirmation rows, including why a structural control has full effect at zero legitimate cost."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where the cost bound is enforced and monitored, and why the heavy-tailed distribution means a cap leaves the median run untouched."
        },
        {
          "ref": "interview-capstone/design-fraud-llm",
          "text": "The same architecture as an interview design case, where the threshold-as-cost-decision and the guardrail frontier are the measured trade-offs."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three axes in the capstone ablation?",
          "a": "Capability (task success), safety (attacks blocked), and cost bound (worst-case spend). Each feature moves essentially one of them."
        },
        {
          "q": "What did adding tools alone buy?",
          "a": "Only 0.31 to 0.41, because tools that fail intermittently are not much use without recovery. Measuring them in isolation understates them."
        },
        {
          "q": "What did retry buy?",
          "a": "0.41 to 0.97 - the largest single capability gain in the module - by feeding errors back so the next attempt differs."
        },
        {
          "q": "And what did retry cost?",
          "a": "Worst-case cost went to 1001 on dead-tool tasks, because an agent retrying a tool that will never work retries it forever."
        },
        {
          "q": "Why can't the agent just stop retrying a dead tool?",
          "a": "It cannot reliably distinguish a transient failure from a permanent one from inside the loop, which is why the budget is structural rather than a hedge."
        },
        {
          "q": "So how do retry and budget relate?",
          "a": "They are one feature, not two. The mechanism that produces the gain is the mechanism that produces the liability, so they ship together."
        },
        {
          "q": "What did the guardrail move?",
          "a": "Attacks blocked from 0.0 to 1.0, and nothing else. Success was unchanged."
        },
        {
          "q": "What did the budget move?",
          "a": "Worst-case cost from 1001 to 13, and nothing else. Success was unchanged."
        },
        {
          "q": "What would an accuracy-only evaluation do to those two rows?",
          "a": "Delete them, with data on its side - and ship an agent that is capable, unsafe and financially unbounded."
        },
        {
          "q": "What was the held-out result?",
          "a": "0.977 success with a 95% confidence interval of 0.968 to 0.984, attacks fully blocked, and cost bounded."
        },
        {
          "q": "Why report the interval?",
          "a": "Because a point estimate without one is the practice the evaluation lesson argues against - and a small suite can invert a ranking entirely."
        },
        {
          "q": "Why is the suite deliberately hazardous?",
          "a": "Flaky tools, injections and dead dependencies are ordinary production conditions. An agent measured only on clean tasks has not been measured."
        }
      ],
      "standard": [
        {
          "q": "Walk me through building a production agent and justifying each component.",
          "a": "I WOULD BUILD IT AS AN ABLATION ACROSS THREE AXES - capability, safety, cost bound - because the measured result is that each feature moves essentially one of them, which means no single metric can describe the system and each component needs its own justification. THE LADDER, with what each rung bought. ONE-SHOT, no tools: 0.31. Adding TOOLS: 0.41 - a small gain, and the smallness is informative, because tools that fail intermittently are not much use without recovery. An ablation stopping here would conclude tools were barely worth adding. Adding RETRY with the error fed back as an observation: 0.97, the largest single gain in the module - and simultaneously worst-case cost running to 1001 units on tasks whose tool is permanently dead. Adding the GUARDRAIL - a per-task allowlist: attacks blocked from 0.0 to 1.0, success unchanged. Adding the BUDGET: worst-case cost from 1001 to 13, success unchanged. THE TWO THINGS THAT TABLE TEACHES. First, the INTERACTION: tools and retry are complementary, so measuring either alone understates it. That is a general caution about ablations - a feature whose value is conditional on another feature looks worthless in isolation. Second, and more important, the FEATURE THAT HELPED MOST CREATED THE LIABILITY. Retry produced both the 0.56 capability gain and the unbounded cost, because retries help when failures are transient and run away when they are permanent - and the agent cannot reliably tell those apart from inside the loop. So retry and budget are one feature, not two, and shipping retry without a cap means shipping the gain and the liability together while noticing only the gain. THE ROWS THAT JUSTIFY THE WHOLE EXERCISE are the last two, both showing zero movement on success. An accuracy-driven evaluation deletes them, with data on its side, and the resulting agent is capable, unsafe and financially unbounded. That is the argument for reporting a panel rather than a number, and it is the same finding as the RAG capstone reached on a different system - which is a good sign it is structural rather than incidental. HOW I WOULD REPORT THE FINAL RESULT, modelling what the evaluation lesson argued for: 0.977 success with a 95% interval of 0.968 to 0.984, on tasks held out from development, with attacks blocked at 1.0 and cost bounded. A capstone reporting a bare point estimate would be undercutting its own module. AND THE SUITE ITSELF is a design decision worth defending: it is deliberately hazardous - flaky tools, injection attempts, dead dependencies - because those are ordinary production conditions rather than pessimistic ones, and an agent measured only on clean tasks has not been measured.",
          "deepDive": {
            "q": "You have an agent at 0.97 in testing that disappoints in production. What is likely wrong?",
            "a": "I WOULD SUSPECT THE EVALUATION BEFORE THE AGENT, because 0.97 on a development suite and disappointment in production is a pattern with a small number of well-understood causes, and most of them are about the measurement rather than the system. CAUSE 1 - THE SUITE WAS TUNED AGAINST. If the same tasks guided development, the number is a fitted result rather than an estimate - the same selection-over-noise effect that inflates any repeatedly-optimized benchmark. The held-out split exists for exactly this, and the fact that the capstone reports a held-out figure with an interval is the practice rather than a formality. If there was no held-out set, I would treat the 0.97 as an upper bound and re-measure. CAUSE 2 - THE DISTRIBUTION MOVED. Production traffic is not the traffic you sampled: deeper tasks, different phrasings, different tools invoked. I would compare the depth distribution and the tool-usage distribution between the suite and live traffic, since a suite of depth-one tasks tells you nothing about the depth-three ones users actually send. CAUSE 3 - THE HAZARDS ARE DIFFERENT. The suite had flaky tools at a chosen rate; production has correlated outages, slow tools that time out rather than error, malformed payloads, and rate limits. Correlated failure in particular breaks the retry arithmetic, since retries help when failures are independent and a tool that is down stays down. I would check the deviation rate and failure-correlation in production against what the suite assumed. CAUSE 4 - COST OR LATENCY IS THE REAL COMPLAINT. 'Disappointing' often means slow or expensive rather than wrong, and those are different axes that the success number never described. Per-step traces answer this quickly, and the usual culprits are the quadratic history, a collapsed cache hit rate, or retries against a degraded tool. CAUSE 5 - THE UNMEASURED AXIS. If the suite scored outcomes only, the agent may be succeeding for the wrong reasons at high step counts - the sound-success gap, where two agents at identical success differed 0.78 versus 0.43. That agent looks fine until the distribution shifts slightly, and then it fails in ways nobody predicted. WHAT I WOULD DO CONCRETELY. Sample failing production trajectories and categorize them - that single step usually identifies the cause within an hour, and it is the thing dashboards cannot do. Then add those cases to the suite permanently, so the measurement converges toward the live distribution. And re-run the ablation on the production-derived suite, because a feature's contribution is not a constant: retry buys more when tools are flakier, the guardrail matters more when injections are real, and the budget binds more when tasks are deeper. THE STRUCTURAL LESSON I would take: a development suite measures the agent you built against the world you imagined. The gap between that and production is not a failure of the agent - it is the thing the evaluation was always going to under-measure, which is why the suite has to be fed from real traffic continuously rather than constructed once."
          }
        },
        {
          "q": "Why do the guardrail and the budget belong in the system if they move no quality?",
          "a": "BECAUSE QUALITY IS ONE OF THREE AXES AND THEY OWN THE OTHER TWO, and the measurement makes that concrete rather than rhetorical. The guardrail moved attacks blocked from 0.0 to 1.0 and left success at 0.97. The budget moved worst-case cost from 1001 to 13 and left success at 0.97. If you evaluate on success alone, both rows are noise and the rational decision is to remove them - with data on your side. The resulting agent scores identically, is fully exploitable, and has no upper bound on what a single request can cost. WHY THIS IS NOT AN EDGE CASE. It is the structure of the problem. Safety controls exist to prevent something that does not happen on the tasks you measure quality on, and cost controls exist to bound a tail that the median run never reaches. Neither can show up in an average over normal tasks, by construction. So the absence of a quality effect is EVIDENCE THE FEATURE IS WORKING AS DESIGNED, not evidence it is useless - which is exactly the inversion that makes single-metric evaluation dangerous here. WHAT THE COST BOUND IS ACTUALLY BUYING, since 'it saves money' undersells it. It makes the worst case a NUMBER. Without a cap, expected cost depends on a halting probability nobody controls and the distribution has no upper bound; with one, you can state a maximum in a contract, a capacity plan or a rate limit. Predictability is worth as much as the savings in most organizations, and it is not visible in a spend total. WHAT THE GUARDRAIL IS ACTUALLY BUYING, likewise: the per-task allowlist took attack success to zero at zero legitimate cost, because an unreachable tool cannot be invoked. That is a structural property, not a detection rate, so it does not degrade as attacks improve - which means its value is durable in a way a classifier's is not. THE PRESENTATION THAT MAKES THE CASE. Report the panel: success with an interval, attacks blocked, worst-case cost, p95 latency. Then show the ablation so each feature's contribution is attributable. A reviewer who sees only the final 0.977 has no way to know which components were load-bearing, and a reviewer who sees only the success column will correctly conclude that two of them do nothing. The table is more work than the number and it is the thing that survives scrutiny. AND THE GENERALIZATION worth carrying: whenever a control is designed to prevent a rare bad event or bound a tail, its correct measurement is on the axis it targets - never on the average outcome. That applies to rate limits, circuit breakers, timeouts, permission systems and audit logging just as much as it does here."
        },
        {
          "q": "How would you decide what to build next on an existing agent?",
          "a": "BY FINDING WHICH AXIS IS WORST AND WHICH STAGE IS BINDING, because those two questions between them name the work - and both are answerable from measurements that already exist if the system is instrumented. STEP 1 - SCORE THE THREE AXES. Success with an interval, attacks blocked on an injection suite, and worst-case cost. Most agents I have seen have never measured the second or third at all, in which case the answer is immediate: measure them, and expect the guardrail and the budget to be missing. That is the highest-value next step by a distance, because their absence is not a degradation, it is an unbounded exposure. STEP 2 - IF CAPABILITY IS THE WEAK AXIS, decompose it. Per-step reliability and trajectory length distinguish a COMPOUNDING problem - high per-step, long trajectories, so 0.97 to the fifteenth is 0.63 and the architecture is wrong - from a LOCAL problem at a specific step. For compounding, remove steps: which steps happen on every trajectory and could be code rather than decisions? For a local problem, the tool-calling decomposition applies - selection, formatting, arguments - and each has a different fix. And check retry, because it was the single largest gain in the module and its absence is common. STEP 3 - IF COST IS THE WEAK AXIS, three structural causes in order. The quadratic history, diagnosed by plotting input tokens against step index; cache misses, usually caused by an unstable prompt prefix; and the tail, fixed by a cap that leaves the median untouched. These are usually larger than any per-call optimization and they are all configuration-level. STEP 4 - IF SAFETY IS THE WEAK AXIS, the order is structural first: per-task allowlist, data scoping, capability bounds, confirmation by risk, and detection last as one layer. The allowlist is the one with full effect at zero legitimate cost, so it is always the first thing. STEP 5 - RE-RUN THE ABLATION after any change, because a feature's contribution is not a constant. Retry buys more when tools are flakier; the budget binds more when tasks are deeper; the guardrail matters more when the ingestion path carries third-party content. A component that was marginal at one operating point can be load-bearing at another. THE PRIORITIZATION RULE I would apply across all of it: prefer structural changes that remove a whole failure class over improvements that shift a distribution. A per-task allowlist removes a class of damage entirely. A cost cap removes an unbounded tail entirely. Constrained decoding removes format failures entirely. Each of those is worth more than several points of model quality and each is available in an afternoon - which is the same ordering principle the RAG module reached from the other direction."
        },
        {
          "q": "What would you tell a team about to build their first agent?",
          "a": "PROBABLY DON'T, AND HERE IS THE MEASUREMENT THAT SAYS SO - which is a more useful opening than a list of components. THE FIRST QUESTION: does your task have compositional depth above one? The ladder from 21-01 attributes the loop's value precisely: model alone 0.000 - a grounding failure - one tool call 0.333, the full loop 1.000. Two thirds of the gain was having a TOOL; the loop bought the last third and bought it only for tasks needing a lookup conditioned on a previous lookup. If your queries need one retrieved fact and an answer, a single call plus a generation gets the same result with none of the step budget, retry logic, termination guards, unbounded cost or debugging difficulty. Measure the depth distribution of real traffic before committing. THE SECOND: if you do need it, ROUTE. Send the depth-one majority through a single-call path and reserve the loop for the minority, which keeps the compounding out of the common path and makes the cost profile predictable. IF YOU ARE BUILDING IT, THE ORDER I WOULD USE. The evaluation suite first, including hazardous tasks - flaky tools, injections, dead dependencies - because every decision after this is a comparison on it and those conditions are ordinary rather than pessimistic. Then constrained decoding, which takes tool-call parse rates from 0.722 to 1.000 for a configuration change. Then validate-before-execute, which leaves accuracy untouched and converts about a tenth of crashes into retryable rejections. Then a step budget, set from the measured task-depth staircase rather than a round number. Then retry with the error fed back - the largest single gain available - AND the cost cap in the same change, because they are one feature. Then the per-task allowlist. Then a managed context window before trajectories get long enough for the quadratic to bite. THE THINGS I WOULD TELL THEM TO EXPECT. That the demo will work at three steps and disappoint at fifteen, because reliability compounds and the exponent is the trajectory length. That the framework default is ReAct, replanning every step, which is insurance against a deviation rate they may not have - and measuring that rate takes an afternoon and can cut planning calls by more than half. That multi-agent will be tempting and the single-agent baseline is the measurement that most often reverses the decision. And that their biggest surprise will be cost, arriving through the quadratic history rather than through anything they chose. THE HABIT I WOULD MOST WANT TO TRANSFER, which is the module rather than any component: when you read a claim about agents, ask what the measurement was and what regime it held in. Almost none of the claims come with either, and constructing the small experiment that answers it is an afternoon - which is a very good trade against building an architecture on an unstated condition."
        },
        {
          "q": "How would you present this system to a skeptical reviewer?",
          "a": "WITH THE ABLATION AND THE HELD-OUT INTERVAL, because a skeptic is not asking whether the number is good - they are asking why each piece is there and whether the number will survive contact with anything. THE STRUCTURE. Start from the naive baseline: one-shot, no tools, 0.31. That establishes what the engineering is actually buying and it occasionally comes out uncomfortably close, which is worth knowing early. Then add one feature at a time and show ALL THREE AXES at each step, so the reader can see that tools bought 0.10, retry bought 0.56, the guardrail bought only safety and the budget bought only the cost bound. WHAT THAT PRE-EMPTS. The reviewer's obvious challenges are 'why is this component here' and 'did you just add things until it worked'. The ablation answers both by construction: each row has an attributable delta, and the two rows with zero quality movement are shown as deliberate rather than accidental. It also volunteers the interaction - tools alone look barely worthwhile, and their value appears only with recovery - which is the kind of nuance that makes the rest of the analysis credible. THE NUMBER I WOULD LEAD THE FINAL SECTION WITH: 0.977 with a 95% interval of 0.968 to 0.984, on held-out tasks. Both qualifiers matter to a skeptic. The interval says the suite was large enough to support the claim, which the mis-ranking result makes non-negotiable - at five tasks a genuinely better system loses the comparison half the time. The held-out split says the number is an estimate rather than a fitted result. WHAT ELSE I WOULD BRING UNPROMPTED. The hazard composition of the suite, so the reviewer knows the 0.977 is not on clean tasks. Cost per task and p95 latency, because that question always arrives and answering it late looks evasive. The failure analysis - what still breaks, categorized - which is disproportionately persuasive because it shows someone read trajectories rather than a dashboard. And the limitations: the environment is simulated, the injections are the ones we thought of, and a passing safety result bounds the failure rate at roughly three over n rather than proving safety. WHAT I WOULD NOT DO: present 0.977 as the headline and the components as a design description. That is unfalsifiable in the reviewer's hands, hides which parts are load-bearing, and reads as a demo. The ablation is more work and it is more persuasive precisely because it lets a skeptic check each claim separately - and a claim that survives being checked individually is worth much more than a summary taken on trust."
        },
        {
          "q": "What is the single most transferable idea from this module?",
          "a": "ASK WHAT THE MEASUREMENT WAS AND WHAT REGIME IT HELD IN - and when neither is stated, construct the small experiment that answers it, because it is usually an afternoon. That habit is the module, and every lesson is an instance of it. WHAT IT PRODUCED, lesson by lesson, and the pattern is consistent. The loop helps - by 0.333 to 1.000, and only for tasks with compositional depth above one. Tool calling is three problems with very different difficulty, and the aggregate hides which is failing. A protocol buys extensibility - 1.000 against 0.000 on a tool added after the client was written - and costs predictability and a trust boundary. Planning is not a philosophy: static collapses to 0.075 at a 0.4 deviation rate while ReAct holds 0.925, and hybrid gets 89% of that for 45% of the cost. Memory strategies fail in three unrelated SHAPES, and the shape decides which your traffic survives. Specialists beat a generalist until routing error passes 0.37. Outcome-only evaluation is blind, holistic judges have a length bias, and a five-task suite ranks the better agent below the worse one half the time. Latency and cost bottleneck at different steps. Least privilege takes attacks to zero at zero legitimate cost. THE SECOND IDEA, which the capstone makes concrete: features move axes, not systems. Each addition here moved essentially one of capability, safety and cost bound, so a single headline metric is structurally unable to describe the system - and an accuracy-driven evaluation deletes exactly the components that make it deployable. That generalizes far past agents: whenever a control targets a rare event or a tail, measuring it on the average outcome will conclude it does nothing. THE THIRD, and the one I would want remembered longest: the same mechanism often produces both the gain and the liability. Retry took success from 0.41 to 0.97 and sent worst-case cost to 1001, because it helps when failures are transient and runs away when they are permanent - and the agent cannot tell which from inside the loop. That is not a trade-off to balance; it is a pairing to ship together. Looking for that pattern - what does this feature's mechanism ALSO do - catches a class of problem that no amount of testing the intended behaviour will find. AND THE HONESTY THAT UNDERWRITES ALL OF IT: the toy environments exist so the ground truth is known, and production has no oracle. Every number here is a mechanism and a regime, not a promise about your system. Saying which is which is what makes the measurements worth keeping."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The capstone ablation",
        "back": "one-shot 0.31 → +tools 0.41 → +retry **0.97** (max cost → **1001**) → +guardrail (attacks 0.0→1.0, success unchanged) → +budget (max cost 1001→**13**, success unchanged). Each feature moves essentially ONE axis."
      },
      {
        "type": "intuition",
        "front": "★ The same feature made the gain AND the liability",
        "back": "Retry gave the largest capability jump in the module (+0.56) and the unbounded cost, because retries help when failures are TRANSIENT and run away when they're PERMANENT — and the agent can't tell which from inside the loop. Ship retry and cap together."
      },
      {
        "type": "pitfall",
        "front": "Tools alone looked barely worth adding",
        "back": "0.31 → 0.41 only, because tools that fail intermittently are useless without recovery. Measuring a feature whose value is CONDITIONAL on another feature understates it — an ablation that stops early draws the wrong conclusion."
      },
      {
        "type": "pitfall",
        "front": "★ Rows 4 and 5 move zero quality — BY DESIGN",
        "back": "Guardrail → safety only. Budget → cost bound only. An accuracy-driven evaluation deletes both WITH DATA ON ITS SIDE, and ships an agent that is capable, unsafe and financially unbounded."
      },
      {
        "type": "intuition",
        "front": "No quality effect is EVIDENCE IT WORKS",
        "back": "Safety controls prevent something that doesn't happen on the tasks you measure quality on; cost controls bound a tail the median never reaches. Neither CAN show up in an average, by construction. Measure a control on the axis it targets."
      },
      {
        "type": "formula",
        "front": "Report it the way 21-07 argued",
        "back": "0.977 success, 95% CI [0.968, 0.984], on HELD-OUT tasks, plus attacks blocked 1.0 and cost bounded. A capstone reporting a bare point estimate would undercut its own module."
      },
      {
        "type": "intuition",
        "front": "The suite is deliberately HAZARDOUS",
        "back": "Flaky tools, injection attempts, dead dependencies. These are ordinary production conditions, not pessimism — an agent measured only on clean tasks has not been measured."
      },
      {
        "type": "intuition",
        "front": "Every line of the loop traces to a measurement",
        "back": "allowlist 1.00→0.00 attacks at 0 legit cost · budget from the depth STAIRCASE · validate 72/72 with correctness unchanged · retry 0.41→0.97 · managed window (else 3.1× at n=40) · cost cap (median untouched)."
      },
      {
        "type": "intuition",
        "front": "What to build next: find the worst AXIS",
        "back": "Never measured safety or cost? Measure them — the guardrail and budget are probably missing, which is exposure not degradation. Capability weak? Split compounding (remove steps) from a local step failure. Cost weak? quadratic history → cache → tail."
      },
      {
        "type": "intuition",
        "front": "Advice for a first agent: probably don't",
        "back": "Two thirds of the ladder's gain was having a TOOL. If your tasks are depth-1, one call + a generation matches the loop with none of the budget/retry/termination/cost machinery. Measure the depth distribution first, then ROUTE."
      },
      {
        "type": "intuition",
        "front": "★ The module's habit",
        "back": "When you read a claim about agents, ask what the MEASUREMENT was and what REGIME it held in. Almost none come with either — and building the small experiment that answers it is an afternoon, against building an architecture on an unstated condition."
      },
      {
        "type": "intuition",
        "front": "Ask what a feature's mechanism ALSO does",
        "back": "Retry's mechanism produced both the biggest gain and the unbounded tail. Looking for the second consequence catches a class of problem that testing the INTENDED behaviour never will."
      }
    ],
    "refs": [
      {
        "title": "Anthropic (2024), Building Effective Agents",
        "url": "https://www.anthropic.com/engineering/building-effective-agents"
      },
      {
        "title": "Kapoor et al. (2024), AI Agents That Matter",
        "url": "https://arxiv.org/abs/2407.01502"
      },
      {
        "title": "Debenedetti et al. (2024), AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses",
        "url": "https://arxiv.org/abs/2406.13352"
      },
      {
        "title": "Jimenez et al. (2023), SWE-bench: Can Language Models Resolve Real-World GitHub Issues?",
        "url": "https://arxiv.org/abs/2310.06770"
      },
      {
        "title": "NIST (2023), AI Risk Management Framework 1.0",
        "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf"
      }
    ],
    "demos": [
      "react-agent",
      "guardrails",
      "agent-router",
      "prompt-injection"
    ]
  }
};
