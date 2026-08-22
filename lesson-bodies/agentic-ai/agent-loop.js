// GENERATED from content/lessons/agentic-ai/agent-loop.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/agent-loop/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "agent-loop": {
    "level": "core",
    "body": {
      "intuition": [
        "Almost everything written about agents is a claim without a measurement attached. The loop helps. Tools help. Retries help. Planning helps. Each of these is probably true in some regime, and the regime is almost never stated - which is why agent projects so often reproduce a demo and then fail to reproduce the result. This module takes the opposite approach throughout: plant a known ground truth in a small world, run the technique against it, and report the number and the CONDITION under which it holds.",
        "For the loop itself, the honest question is what it actually contributes, and you can isolate that with a ladder. Ask a model a question whose answer it cannot know, with no tools: it scores zero, and that failure is about GROUNDING, not reasoning. Give it a single lookup: it now answers the questions that need one fact, and still fails the ones that need several combined. Give it the loop, so it can look up, observe, and look up again conditioned on what it saw: it answers all of them. Three rungs, three numbers, and they attribute the gain precisely - the loop's contribution is COMPOSITION over tool results, not the tools alone.",
        "That distinction matters because it tells you when a loop is worth its cost. If your task needs one retrieved fact, a loop adds steps, latency and failure modes to do what one call does. If it needs a fact that determines which fact to fetch next, no single call reaches it at any prompt quality. The loop is not a general upgrade; it is the mechanism for compositional depth, and depth is something you can measure in your own task distribution before committing to the architecture."
      ],
      "math": [
        {
          "h": "The ladder - attributing the gain to a capability",
          "paras": [
            "Each rung adds exactly one capability, so the deltas say what that capability was worth.",
            "Running all three costs nothing extra and it is the measurement most agent write-ups omit."
          ],
          "tex": "\\underbrace{0.00}_{\\text{model alone}} \\;\\xrightarrow{\\;+\\text{tool}\\;}\\; \\underbrace{0.33}_{\\text{single lookup}} \\;\\xrightarrow{\\;+\\text{loop}\\;}\\; \\underbrace{1.00}_{\\text{observe and re-act}}",
          "texNote": "The first delta is GROUNDING - the model does not know these facts and no prompting recovers them. The second is COMPOSITION - chaining a lookup on the result of a previous lookup. Reporting only the final 1.00 would credit the loop with the whole gain, when two thirds of it came from having a tool at all. That mis-attribution is exactly how teams end up building loops for problems that a single tool call solves."
        },
        {
          "h": "The step budget is a STAIRCASE, not a dial",
          "paras": [
            "A task with compositional depth d cannot be solved in fewer than d steps, and extra steps beyond d add nothing.",
            "So success as a function of budget is a step function, and its position is a property of the task."
          ],
          "tex": "\\text{success}(B) = \\begin{cases} 0 & B < d_{\\text{task}} \\\\ s^{d} & B \\ge d_{\\text{task}} \\end{cases} \\qquad d = 2,3,4 \\;\\text{for 1, 2, 3 chained facts}",
          "texNote": "Measured on a task family this produces a visible staircase: single-lookup tasks succeed from a budget of 2, scaled ones from 3, summed ones from 4. The practical consequence is that the budget is not a hyperparameter to tune by feel - it is set by the deepest task you intend to serve, and a budget below that returns zero on those tasks no matter how good the model is. Measure the depth distribution of your traffic and the budget follows."
        },
        {
          "h": "The cost of robustness, priced",
          "paras": [
            "Observe-and-retry converts a flaky tool into a reliable one, and the price is extra calls.",
            "Both sides are measurable, which turns a reflex into a decision."
          ],
          "tex": "0.708 \\;\\xrightarrow{\\text{observe-and-retry}}\\; 1.000, \\qquad \\Delta\\,\\text{tool calls} = +10 \\;\\;\\text{on the same task set}",
          "texNote": "A tool failing roughly a third of the time drags end-to-end success to 0.708 through compounding; feeding the error back as an observation and retrying recovers it completely. The +10 calls is the honest cost, and it is why an unbounded retry policy inside an unbounded loop is how a single request becomes expensive. Retries are the highest-value pattern in the loop AND the reason budgets are mandatory - the same mechanism produces both."
        }
      ],
      "code": [
        {
          "h": "The loop, and the ladder that measures it",
          "paras": [
            "The loop is short. The ladder around it is what turns a demo into a result."
          ],
          "code": "def run(task, tools, budget):\n    history = []\n    for _ in range(budget):                    # termination is STRUCTURAL\n        action = policy(task, history)         # the model chooses\n        if action.type == \"finish\":\n            return action.answer\n        obs = tools[action.name](**action.args)\n        history.append((action, obs))          # the OBSERVATION is the\n    return None                                # whole point of the loop\n\n# ★ THE LADDER - run all three, always. It costs one extra config each\n#   and it ATTRIBUTES the gain instead of crediting it to the loop:\n#\n#   rung 1  model alone, no tools        -> 0.000   (GROUNDING gap:\n#                                                    it cannot know this)\n#   rung 2  one tool call, no loop       -> 0.333   (grounded, but only\n#                                                    single-fact tasks)\n#   rung 3  full loop + tools            -> 1.000   (COMPOSITION: a\n#                                                    lookup conditioned\n#                                                    on a lookup)\n#\n# READ IT AS: two thirds of the gain was HAVING A TOOL. The loop bought\n# the last third, and it bought it only for tasks with compositional\n# DEPTH. Reporting 1.000 alone credits the loop with all of it - which\n# is how teams build loops for problems one call solves.\n\n# WHY THE TOY IS DETERMINISTIC AND OFFLINE: so the ground truth is\n# KNOWN. A rule-based policy stands in for the model, real lookup and\n# calc tools do the work. Every number above is graded against the\n# planted answer - which is exactly what you CANNOT do in production,\n# and why 21-07 exists.",
          "caption": "The ladder is one extra config per rung and it is the difference between 'the agent scored 1.0' and knowing which component earned it."
        },
        {
          "h": "The two guards, and what each is measured to buy",
          "paras": [
            "Both are one-liners; both have a number attached that says why they are not optional."
          ],
          "code": "# 1. THE STEP BUDGET - measured as a STAIRCASE, not tuned by feel.\n#    success vs budget on a task family:\n#      budget:  1     2     3     4     5\n#      single:  0   1.00  1.00  1.00  1.00     <- needs 2 (act, finish)\n#      scale:   0   0.00  1.00  1.00  1.00     <- needs 3\n#      sum:     0   0.00  0.00  1.00  1.00     <- needs 4\n#    Each task family has a MINIMUM depth. Below it, zero - at any model\n#    quality. Above it, nothing more is bought. So: measure the depth\n#    distribution of your traffic, then set B from the deepest case.\n#\n#    AND the guard direction: a policy with no finishing condition runs\n#    to B and stops. Without B it does not stop. The budget is what\n#    makes the worst case a NUMBER.\n\n# 2. OBSERVE-AND-RETRY - the error goes back in as an OBSERVATION.\n#    A tool that fails ~1/3 of the time:\n#      no retry            -> 0.708 end-to-end   (compounding)\n#      observe-and-retry   -> 1.000              (+10 tool calls)\n#    ★ The retry must DIFFER from the original attempt. Feeding the\n#      error back is what makes it differ; a blind repeat of an\n#      identical malformed call fails identically.\n\n# THE HONEST PAIRING: retries are the highest-value pattern in the loop\n# AND the reason budgets are mandatory. Same mechanism, both effects -\n# so they ship together or the cost distribution has no upper bound.",
          "caption": "The staircase turns 'how many steps should the agent get' from a guess into a measurement of the task's compositional depth."
        }
      ],
      "useCases": [
        "Deciding whether a task needs a loop at all, by measuring the compositional depth of real traffic rather than assuming the answer.",
        "Attributing a demo's success to the right component, using the three-rung ladder before committing to an architecture.",
        "Setting a step budget from the task family's measured staircase instead of picking a round number and hoping.",
        "Pricing robustness explicitly - the flaky-tool recovery is real, and so is the tool-call bill it arrives with."
      ],
      "pitfalls": [
        "Reporting the full system's score without the ladder. It credits the loop with gains that came from having a tool at all, which is how loops get built for problems one call solves.",
        "Treating the step budget as a tunable dial. Success versus budget is a staircase whose position is set by the task's compositional depth, so a budget below it returns zero at any model quality.",
        "Retrying identically. The error must be fed back as an observation so the next attempt differs; a blind repeat of a malformed call fails the same way.",
        "Shipping retries without a budget. The same mechanism that recovers a flaky tool is what makes the cost distribution unbounded, so they belong together.",
        "Assuming the loop is a general upgrade. It buys compositional depth specifically, and for single-fact tasks it adds steps, latency and failure modes for nothing.",
        "Generalizing from a deterministic toy to production. The toy exists so the ground truth is known; a real agent has no oracle, which is the entire reason evaluation needs its own lesson.",
        "Confusing a grounding failure with a reasoning failure. A model that cannot know the fact scores zero for reasons no prompt improvement addresses."
      ],
      "connections": [
        {
          "ref": "rag-agents/agent-loops",
          "text": "The systems-composition argument this lesson measures - there the claim that reliability compounds and steps should be removed, here the numbers behind it."
        },
        {
          "ref": "agentic-ai/tool-calling",
          "text": "The next rung down: how a tool call is made typed, validated and routed, and what each of those is measured to buy."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "Why the toy is deterministic. Production has no oracle, so trajectory-level evaluation is how you recover the grading this lesson gets for free."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where the tool-call cost of retries becomes a heavy-tailed spend distribution, and what caps do to it."
        },
        {
          "ref": "reinforcement-learning/mdp-bellman",
          "text": "The formal version of perceive-reason-act. The agent loop is a policy acting in an environment, without the reward signal or the convergence guarantee."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does the agent loop actually add over a single tool call?",
          "a": "Composition - a lookup conditioned on the result of a previous lookup. For single-fact tasks it adds steps and failure modes for nothing."
        },
        {
          "q": "What is the three-rung ladder?",
          "a": "Model alone, model plus one tool call, model plus the loop. The deltas attribute the gain to grounding and to composition separately."
        },
        {
          "q": "Model alone scores zero. What kind of failure is that?",
          "a": "Grounding, not reasoning. It cannot know the fact, so no prompt improvement recovers it."
        },
        {
          "q": "Why is reporting only the full system's score misleading?",
          "a": "It credits the loop with the whole gain when most of it came from having a tool - which is how loops get built for problems one call solves."
        },
        {
          "q": "What shape is success versus step budget?",
          "a": "A staircase. Each task family has a minimum depth; below it success is zero, above it extra budget buys nothing."
        },
        {
          "q": "So how do you set the budget?",
          "a": "Measure the compositional depth distribution of real traffic and set it from the deepest case you intend to serve."
        },
        {
          "q": "What does a termination guard do to a non-finishing policy?",
          "a": "Bounds it at the budget. Without one it does not stop, so the budget is what makes the worst case a number."
        },
        {
          "q": "What does observe-and-retry buy on a flaky tool?",
          "a": "It took end-to-end success from 0.708 to 1.000 in the measured setting, at a cost of about ten extra tool calls."
        },
        {
          "q": "Why must the retry differ from the original attempt?",
          "a": "An identical repeat of a malformed call fails identically. Feeding the error back as an observation is what makes the next attempt different."
        },
        {
          "q": "Why do retries and budgets ship together?",
          "a": "The same mechanism that recovers a flaky tool is what makes the cost distribution unbounded, so one without the other is incomplete."
        },
        {
          "q": "Why is the teaching environment deterministic and offline?",
          "a": "So the ground truth is known and every claim can be graded. Production has no oracle, which is why evaluation needs its own treatment."
        },
        {
          "q": "What is the loop's relationship to reinforcement learning?",
          "a": "It is a policy acting in an environment - perceive, reason, act - without the reward signal or the convergence guarantees."
        }
      ],
      "standard": [
        {
          "q": "How would you measure what an agent loop is actually contributing?",
          "a": "WITH A LADDER OF ABLATIONS, RUN FROM THE BOTTOM, because the single number a finished agent produces cannot attribute its own success and the attribution is what determines whether the architecture was the right one. THE THREE RUNGS. Rung one: the model alone, no tools, on the same task set. In the measured setting this scores ZERO, and the important thing is what kind of zero it is - a GROUNDING failure. The model does not know these facts, so no amount of prompt engineering, chain-of-thought or model upgrading moves it. Establishing that first is worth doing because it separates 'the model cannot reason about this' from 'the model does not have the information', and those get confused constantly. Rung two: one tool call, no loop. This jumps to about a third. The agent is now grounded and answers everything that needs a single retrieved fact - and still fails everything that needs two facts combined, because there is no mechanism to use the first result to determine the second query. Rung three: the full loop. This reaches 1.000, and the delta from rung two is the loop's actual contribution: COMPOSITION. WHY THIS MATTERS PRACTICALLY. Two thirds of the total gain came from having a tool at all, and one third from the loop. A write-up that reports only the final number credits the loop with all of it. That mis-attribution has a direct cost, because it leads teams to build loops - with their step budgets, retry logic, termination guards, observability and unbounded cost - for task distributions where a single tool call would have done the same work at a fraction of the complexity and with none of the compounding. WHAT I WOULD DO WITH THE RESULT. Measure the compositional DEPTH distribution of real traffic: what fraction of queries need one fact, two chained facts, three. If most traffic is depth one, the right architecture is a single retrieval call with routing, and the loop serves a minority - which argues for routing to the loop rather than making everything agentic. If a substantial share is depth two or more, the loop is earning its cost and the budget follows from the deepest case. THE HONEST LIMITATION of this whole exercise, which I would state rather than let a reader discover: the ladder is run in a deterministic offline environment with a rule-based policy standing in for the model, precisely so the ground truth is known and every number is graded against a planted answer. That is what makes it a measurement rather than an anecdote - and it is exactly what you cannot do in production, where there is no oracle. The ladder tells you what the loop buys IN PRINCIPLE for a task shape; measuring what it buys on your live traffic is a different and harder problem, which is why trajectory-level evaluation gets its own lesson.",
          "deepDive": {
            "q": "How would you set the step budget for a real agent?",
            "a": "FROM A MEASURED STAIRCASE RATHER THAN A ROUND NUMBER, because success as a function of budget is a step function and its position is a property of the TASK, not of the model. THE MEASUREMENT. Take a family of tasks with known compositional depth and sweep the budget. What comes out is a clean staircase: single-lookup tasks succeed from a budget of two - one act, one finish - two-step tasks from three, three-step tasks from four. Below the task's depth the success rate is ZERO, at any model quality, because the agent physically cannot take the steps the task requires. Above it, additional budget buys nothing on that family. So the budget is determined by the deepest task you intend to serve, and there is no tuning to do once you know that. HOW I WOULD FIND THE DEPTH ON REAL TRAFFIC, where nobody has labelled it. Sample queries and label the minimum number of tool calls each needs - a few hundred is enough, and it is quick because the judgement is usually obvious. That gives a depth histogram. Then set the budget at a high percentile of it rather than the maximum, because the tail is usually a handful of pathological queries that would be better routed to a human or declined. THE ADJUSTMENTS I WOULD MAKE ON TOP. Add headroom for RETRIES, since a flaky tool consumes budget without making progress - if the tool fails a third of the time and you allow three attempts, the effective step count is meaningfully higher than the depth. Add a small margin for the model taking a suboptimal path, since the measured depth is the MINIMUM and a real policy sometimes wanders. But keep the margin small, because a generous budget is not free: it is exactly the room in which a confused agent burns cost, and the wall-clock and spend caps are what the user actually experiences. WHAT ELSE NEEDS A CAP, and this is the part usually missed. The step budget alone does not bound cost, because one step can be arbitrarily expensive - a long context, a large tool result, a retry storm. So I would cap SPEND and WALL-CLOCK independently, and treat whichever binds first as the real limit. In the observability lesson the cost distribution turns out to be heavy-tailed, which means the median run tells you nothing about exposure and only a hard cap makes the worst case a number you can state. WHAT TO DO WHEN THE BUDGET IS EXHAUSTED, since this is a design decision and the default is bad. Returning nothing wastes everything spent. I would return the PARTIAL result with an explicit statement that the budget was reached - the user gets what was found, and the system says honestly that it did not finish. And I would monitor the budget-exhaustion RATE as a first-class metric: a rise means either traffic got deeper, a tool got flakier, or the policy started wandering, and those three have different fixes. That metric is one of the few that catches an agent degrading before users report it."
          }
        },
        {
          "q": "When is an agent loop the wrong architecture?",
          "a": "WHENEVER THE TASK HAS COMPOSITIONAL DEPTH OF ONE, which is most tasks, and the measurement in this lesson is what makes that concrete rather than a preference. THE ARGUMENT FROM THE LADDER. The loop's measured contribution was the step from single-tool to composition. If your queries need one retrieved fact and then an answer, the loop is contributing nothing while adding a step budget, retry logic, a termination guard, unbounded cost, wandering behaviour and a much harder debugging story. A single tool call plus a generation gets the same score with none of it. THE CASES WHERE I WOULD NOT USE A LOOP. Tasks that decompose identically every time - retrieve, extract, validate, format. That is a pipeline, and writing it as one makes it testable, cheap and predictable; every step you specify in code rather than sample is a factor removed from the reliability product. Tasks with hard latency budgets, since each loop iteration is a full model call and a voice or interactive product cannot afford several. Tasks where the action set is small and the routing is the only decision - that is a classifier, not an agent, and a small router model does it more reliably and far more cheaply. And high-stakes irreversible actions, where I would rather have a constrained pipeline with an explicit human decision point than a loop that is usually right. WHERE THE LOOP IS GENUINELY REQUIRED. Compositional depth above one, where the next query depends on the previous result - the multi-hop case, which no single pass reaches at any prompt quality. Open-ended tasks whose steps cannot be enumerated in advance: debugging, research, operations against systems whose state is unknown. And environments that misbehave, where a static plan built on a false assumption propagates it and only observing between steps recovers. THE ARCHITECTURE I WOULD ACTUALLY RECOMMEND for most products, which follows directly from the depth histogram: ROUTE. Classify the incoming query's depth, send the depth-one majority through a single-call path, and reserve the loop for the minority that needs it. That keeps the step count at one for most traffic - so the compounding stays out of the common path - while still serving the queries a pipeline structurally cannot. It also makes the cost profile predictable, because the expensive path is a known fraction of volume rather than the default. THE FRAMING I WOULD GIVE A TEAM: the burden of proof is on the loop. It is the more capable and much more expensive architecture, and the ladder plus the depth histogram are two afternoons of work that tell you whether you need it. Building the loop first and measuring later is the common order, and it is the expensive one."
        },
        {
          "q": "How do you make an agent robust to unreliable tools?",
          "a": "WITH OBSERVE-AND-RETRY, AND BY PRICING IT, because the measured version of this pattern has both a large benefit and a real bill and only reporting one of them is how retry storms get shipped. THE MECHANISM. When a tool fails, the failure goes back into the history as an OBSERVATION rather than being swallowed or raised. The next decision is therefore made with knowledge of what went wrong, which is what makes the next attempt DIFFERENT. That distinction is the whole thing: a blind repeat of an identical malformed call fails identically, so a retry loop without error feedback is just a slower failure. THE MEASURED EFFECT. On a tool failing roughly a third of the time, end-to-end success sat at 0.708 - the compounding from 18-06 doing its work across steps - and observe-and-retry recovered it to 1.000. That is a large gain from a small mechanism, and it is why I would treat it as the first robustness feature to build rather than the last. THE MEASURED COST: about ten extra tool calls across the same task set. That is the honest other half, and it means retries and BUDGETS are one feature, not two. An unbounded retry policy inside an unbounded loop is precisely how a single request becomes expensive, and the cost distribution is heavy-tailed so the median run will not warn you. WHAT MAKES THE ERROR FEEDBACK USEFUL, since this is where implementations differ most. The error has to be actionable: 'Invalid date format, expected YYYY-MM-DD, got 03/04/2024' lets the next attempt succeed, while 'Error 400' guarantees a repeat. The error message is INPUT to the next decision, not a log line, and writing tool errors with that in mind measurably changes retry success. This is a tool-design property rather than an agent property, which is why the tooling lesson matters as much as the loop. THE OTHER LAYERS I WOULD ADD. Distinguish TRANSIENT failures - timeouts, rate limits, 5xx - which deserve a retry with backoff, from PERMANENT ones - bad arguments, missing permissions, a nonexistent record - where retrying the same call is guaranteed waste and the agent should change approach or report. Cap retries per tool and in total. Make tools idempotent or key them, because an agent that retries a non-idempotent action sends two emails. And provide a fallback path where one exists, so a failing tool degrades to a worse answer rather than to none. AND THE THING THAT BEATS ALL OF IT WHERE IT IS AVAILABLE: make the step VERIFIABLE. If the output can be checked cheaply - a schema, a test, a constraint, a lookup - then check it and retry on failure, and that step's effective reliability approaches one. Steps that can be verified compound far more gently than steps that cannot, so a productive question when designing tools is not 'how do I make this reliable' but 'how do I make its output checkable'. That is usually an easier problem and it is where I would spend the effort first."
        },
        {
          "q": "Why teach agents in a deterministic offline toy environment?",
          "a": "BECAUSE IT IS THE ONLY SETTING WHERE THE CLAIMS CAN BE GRADED, and grading them is the whole point of this module. In a toy world you plant the ground truth: you know which facts exist, which tasks require how many chained lookups, exactly when a tool will fail, and what the correct answer is. So every claim - the loop helps, retries help, the budget matters - becomes a number measured against a known answer rather than an impression formed from a few runs. WHAT IT LETS YOU DO that production does not. Run the ablation ladder, so the gain is attributed to grounding versus composition instead of credited wholesale to the architecture. Sweep the step budget and see the staircase, which reveals that the budget is a property of the task rather than a dial. Set a tool's failure rate exactly and measure what retries recover and what they cost. And re-run everything deterministically, so a difference between two configurations is a real difference rather than sampling noise - which matters more than usual here, because agent runs are high variance and a single run per configuration is close to meaningless. THE SUBSTITUTIONS THAT MAKE IT WORK. A rule-based policy stands in for the model, which sounds like a cheat and is actually the point: it removes model variance so the ARCHITECTURE's contribution is visible in isolation. The tools are real - actual lookup and arithmetic - so the composition being measured is genuine. Nothing touches a network, so the experiment is reproducible by anyone. WHAT IT CANNOT TELL YOU, and I would state this before anyone concludes too much. Real policies are stochastic, so they wander, repeat and stop early in ways a rule-based policy does not. Real tools fail in correlated bursts rather than independently, which breaks the retry arithmetic. Real tasks are ambiguous, so 'correct' is often contested. And real environments are adversarial, which the toy is not at all. So the toy establishes MECHANISMS and their conditions; it does not establish that your agent will hit 1.000. THE PROGRESSION THIS SETS UP, which is how I would frame the module: the toy gives you the mechanism and the regime in which it holds; the evaluation lesson gives you how to recover a grading signal when the oracle is gone; and the observability lesson gives you the signals that stand in for ground truth in production. That sequence is deliberate, and it maps onto how you would actually take an agent from a working idea to something you can operate - which is a different journey from making a demo work, and considerably less discussed."
        },
        {
          "q": "What does the agent loop borrow from reinforcement learning, and what does it not?",
          "a": "IT BORROWS THE STRUCTURE AND ALMOST NONE OF THE THEORY, and being precise about which parts transfer is useful because the RL framing gets invoked loosely and then relied on too heavily. WHAT TRANSFERS. The shape is identical: a policy observes a state, selects an action, receives an observation, and repeats - perceive, reason, act. The concept of a TRAJECTORY transfers, and with it the recognition that quality is a property of the whole path rather than the final state, which is what motivates trajectory-level evaluation. Compounding over a horizon transfers, and it is the same structural fact that makes behaviour cloning pay a cost quadratic in horizon length: a small per-step error rate becomes a large end-to-end one, and errors move the agent into states it has less competence in. And the exploration-exploitation tension appears whenever the agent chooses between using a known-good tool and trying a different approach. WHAT DOES NOT TRANSFER, and these are the load-bearing absences. There is NO REWARD SIGNAL. An RL agent improves because the environment scores it; an LLM agent gets no gradient from its own execution, so it does not get better at a task by doing it repeatedly - each run starts from the same policy. That single difference invalidates most of the intuition about agents 'learning' from their environment. There are NO CONVERGENCE GUARANTEES, because nothing is being optimized at run time. There is no VALUE FUNCTION, so the agent has no principled estimate of how good a state is, which is why planning is so much shakier than in a setting with a learned value. And the state is not Markov in any usable sense - it is a growing text history, which is why memory management becomes its own engineering problem rather than a modelling one. WHY THIS MATTERS PRACTICALLY. Because the policy is fixed at run time, improvement has to come from outside the loop: better prompts, better tools, better retrieval, a fine-tuned model, or a changed architecture. An agent that fails a task will fail it identically next time unless something outside the loop changes, and 'let it try again' is not a learning mechanism. It also means the loop's guards are doing work that RL's formalism would otherwise handle - the step budget substitutes for a discount factor, the termination guard for an absorbing state, and the verification step for a reward signal. WHERE THE TWO ARE CONVERGING, worth noting: training agents with RL on trajectory outcomes is an active direction, and it reintroduces the reward signal that the plain loop lacks. When that is done the RL intuitions become load-bearing again - including the uncomfortable ones about reward hacking and specification gaming, where an agent optimized against a proxy for task success will find the proxy. That is a good reason to understand the RL framing properly rather than as a metaphor."
        },
        {
          "q": "How does this lesson set up the module?",
          "a": "IT ESTABLISHES THE METHOD, which is what distinguishes this module from the one that precedes it. Module 18 treated agents as one part of a composed system and argued the structure: ceilings bound you, steps multiply, defences invert. That argument is correct and it is an ARGUMENT. This module does something narrower and more useful for a practitioner - it plants a known ground truth in a small world and MEASURES each claim, then reports the condition under which it holds. THE PATTERN EVERY LESSON FOLLOWS. Take a widely-repeated claim about agents. Construct a setting where the right answer is known by construction. Run the ablation. Report the number, and - this is the part that matters - report the REGIME. The finding is almost never 'this works' or 'this does not'. It is 'this works when X', and X is measurable: composition helps when the task has depth above one; specialization helps while routing error stays below a threshold; voting helps when errors are independent; retries help when failures are independent and the error is fed back. Naming the condition is what makes a technique usable rather than fashionable. WHAT THIS LESSON CONTRIBUTES SPECIFICALLY. The LADDER, as a reusable habit - never report a system's score without the ablation that attributes it, because the attribution is what tells you which component to keep. And the STAIRCASE, which converts the most common agent hyperparameter from a guess into a measurement of the task. Both are cheap, both are skipped, and both change decisions. WHERE IT GOES. Tool calling and MCP measure the interface - what typing, validation and dynamic discovery each buy. Planning measures the control strategies against a misbehaving environment, and finds that the production default is neither of the two famous options. Memory measures what each strategy actually retains and finds a specific failure the literature underplays. Multi-agent measures the three mechanisms and finds each has a crossover. Evaluation measures the evaluators, and finds the judge has a length bias. Observability measures where cost and latency actually live, and finds they are not the same step. Security measures what bounds a compromised agent, and finds structure beats detection. And the capstone assembles everything and ablates it. THE HABIT I WOULD WANT SOMEONE TO LEAVE WITH is smaller than any individual result: when you read a claim about agents, ask what the measurement was and what regime it held in. Most of the time neither is stated, and constructing the toy that answers it is an afternoon - which is a very good trade against building an architecture on an unstated condition."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's method",
        "back": "The agent literature is mostly CLAIMS. Every lesson here plants a known ground truth, measures the technique against it, and reports the CONDITION under which it holds. The finding is never \"it works\" — it's \"it works when X\", and X is measurable."
      },
      {
        "type": "formula",
        "front": "★ The three-rung ladder",
        "back": "model alone 0.000 (GROUNDING gap — it cannot know) → +one tool 0.333 (grounded, single-fact only) → +loop 1.000 (COMPOSITION). Two thirds of the gain was HAVING A TOOL. Reporting 1.000 alone credits the loop with all of it."
      },
      {
        "type": "intuition",
        "front": "What the loop actually buys",
        "back": "Composition — a lookup CONDITIONED on a previous lookup. For depth-1 tasks it adds steps, latency and failure modes for nothing. The loop isn't a general upgrade; it's the mechanism for compositional DEPTH."
      },
      {
        "type": "formula",
        "front": "The step budget is a STAIRCASE",
        "back": "success(B) = 0 for B < d_task, then flat. Measured: single needs 2, scale 3, sum 4. Below the depth → ZERO at any model quality. Above → nothing more bought. Set B from the depth distribution of real traffic."
      },
      {
        "type": "formula",
        "front": "The cost of robustness, priced",
        "back": "Flaky tool (~⅓ failure): 0.708 → 1.000 with observe-and-retry, at +10 tool calls. Both halves matter — retries are the highest-value pattern in the loop AND the reason budgets are mandatory. Same mechanism, both effects."
      },
      {
        "type": "pitfall",
        "front": "The retry must DIFFER",
        "back": "A blind repeat of an identical malformed call fails identically. Feeding the error back as an OBSERVATION is what makes the next attempt different — so the error message is INPUT to the next decision, not a log line."
      },
      {
        "type": "intuition",
        "front": "Grounding failure ≠ reasoning failure",
        "back": "A model that cannot KNOW the fact scores zero for reasons no prompt improvement addresses. Rung one of the ladder exists to separate these two, which get confused constantly."
      },
      {
        "type": "intuition",
        "front": "Route by depth instead of going agentic",
        "back": "Label a few hundred real queries with their minimum tool-call count → a depth histogram. Send the depth-1 majority through a single call; reserve the loop for the minority. Keeps sⁿ out of the common path and makes cost predictable."
      },
      {
        "type": "pitfall",
        "front": "The budget alone doesn't bound cost",
        "back": "One step can be arbitrarily expensive — long context, big tool result, retry storm. Cap SPEND and WALL-CLOCK independently and treat whichever binds first as the real limit. The cost distribution is heavy-tailed; the median won't warn you."
      },
      {
        "type": "intuition",
        "front": "Why the toy is deterministic and offline",
        "back": "So the ground truth is KNOWN and every claim is graded against a planted answer. A rule-based policy replaces the model deliberately — removing model variance makes the ARCHITECTURE's contribution visible in isolation."
      },
      {
        "type": "pitfall",
        "front": "What the toy CANNOT tell you",
        "back": "Real policies wander and stop early; real tools fail in CORRELATED bursts (breaking the retry arithmetic); real tasks are ambiguous; real environments are adversarial. The toy establishes MECHANISMS and regimes, not that your agent hits 1.0."
      },
      {
        "type": "intuition",
        "front": "What the loop borrows from RL — and what it doesn't",
        "back": "BORROWS: perceive/act structure, trajectories, horizon compounding. LACKS: any REWARD SIGNAL (so it does not improve by doing the task again), value function, convergence, Markov state. Improvement must come from OUTSIDE the loop."
      }
    ],
    "refs": [
      {
        "title": "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models",
        "url": "https://arxiv.org/abs/2210.03629"
      },
      {
        "title": "Schick et al. (2023), Toolformer: Language Models Can Teach Themselves to Use Tools",
        "url": "https://arxiv.org/abs/2302.04761"
      },
      {
        "title": "Mialon et al. (2023), Augmented Language Models: A Survey",
        "url": "https://arxiv.org/abs/2302.07842"
      },
      {
        "title": "Liu et al. (2023), AgentBench: Evaluating LLMs as Agents",
        "url": "https://arxiv.org/abs/2308.03688"
      },
      {
        "title": "Anthropic (2024), Building Effective Agents",
        "url": "https://www.anthropic.com/engineering/building-effective-agents"
      }
    ],
    "demos": [
      "react-agent",
      "agent-router",
      "constrained-decoding",
      "guardrails"
    ]
  }
};
