// GENERATED from content/lessons/agentic-ai/react-planning.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/react-planning/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "react-planning": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The plan-then-execute versus ReAct debate is usually conducted as a philosophy - is it better to think first or to adapt as you go - and it is not a philosophical question. It is a function of one measurable quantity: how often the environment does something other than what the plan assumed. Fix that quantity and the answer is determined, and the answer changes as it moves. So the useful thing is not an opinion about planning but a measurement of your environment's deviation rate.",
        "The measurement is stark. In a reliable environment a static plan scores 1.0 and costs one planning call. Drop the probability that an action does what was expected to 0.4 and the static plan collapses to 0.075 - not degraded, destroyed - because every step after the first surprise is built on a false assumption and the errors do not merely add, they invalidate the remaining plan. ReAct, replanning after every observation, holds at 0.925. That gap is the entire case for adaptive control, and it only exists when the environment misbehaves.",
        "But ReAct pays for it: 18.2 planning calls per task against the static plan's 1.0. The interesting configuration is the one in between - replan only when an observation DEVIATES from what the step expected - which holds 0.825 at 8.1 calls. Roughly ninety percent of the robustness for forty-five percent of the cost, which is why hybrid rather than either famous option is the production default. That is the shape of most good answers in this module: not the pure position, but the one that pays for adaptivity only when adaptivity is needed."
      ],
      "math": [
        {
          "h": "Why a static plan collapses rather than degrades",
          "paras": [
            "A plan survives only if every step behaves as assumed, so survival is a product over the plan's length.",
            "That is a collapse, not a decline - and it explains the measured 0.075."
          ],
          "tex": "P_{\\text{static}} = p^{\\,n} \\qquad p=0.4,\\; n \\approx 5 \\;\\Rightarrow\\; 0.01\\text{-}0.08, \\qquad p=1.0 \\;\\Rightarrow\\; 1.0",
          "texNote": "The exponent is the plan length, so a longer plan is exponentially more fragile in an unreliable environment - the opposite of the intuition that a more detailed plan is a safer one. And the failure is worse than the number suggests: after the first deviation, the remaining steps are not merely likely to fail, they are addressing a world state that no longer exists. Replanning removes the exponent by re-grounding after each observation."
        },
        {
          "h": "Decomposition doubles the reachable depth",
          "paras": [
            "A planner that can only search to depth K reaches 2K if you insert one midpoint subgoal.",
            "This is the measurable case for decomposition, and it generalizes."
          ],
          "tex": "\\text{reach} = K \\;\\xrightarrow{\\;1\\text{ subgoal}\\;}\\; 2K \\;\\xrightarrow{\\;(m-1)\\text{ subgoals}\\;}\\; mK",
          "texNote": "Measured as a clean staircase: a depth-limited planner fails everything beyond K and succeeds up to 2K once given a midpoint. So decomposition is not 'clearer thinking' - it is a multiplication of reachable depth for the price of one extra planning call, and the multiplier is the number of subgoals. The condition is that the subgoal must be REACHABLE within K and must actually lie on a path to the goal; a badly chosen midpoint buys nothing and costs a call."
        },
        {
          "h": "The frontier - robustness per planning call",
          "paras": [
            "Three strategies, two axes, and the middle one dominates on the ratio.",
            "This is the measurement that makes the choice an engineering decision."
          ],
          "tex": "\\begin{array}{lcc} & \\text{success at } p{=}0.4 & \\text{plan calls} \\\\ \\text{static} & 0.075 & 1.0 \\\\ \\text{hybrid} & 0.825 & 8.1 \\\\ \\text{ReAct} & 0.925 & 18.2 \\end{array}",
          "texNote": "Hybrid buys about 89% of ReAct's robustness for about 45% of its planning cost, which is why replan-on-deviation is the production default rather than either pure strategy. Note also what the table implies at the other end: at p near 1 the static plan matches everything else at a twentieth of the cost, so an agent operating in a reliable environment that replans every step is paying for insurance against a risk it does not face."
        }
      ],
      "code": [
        {
          "h": "The three strategies, and the one to actually ship",
          "paras": [
            "The difference is entirely in WHEN a planning call is made."
          ],
          "code": "# 1. PLAN-THEN-EXECUTE - one plan, then run it.\nplan = planner(task)\nfor step in plan: execute(step)          # 1.0 plan-call, no adaptation\n#   p=1.0 -> 1.000   p=0.4 -> 0.075   ★ COLLAPSE, not decline: after\n#   the first surprise every later step addresses a world that is gone.\n\n# 2. ReAct - replan after every observation.\nwhile not done:\n    step = planner(task, history)        # a plan-call EVERY step\n    history.append(execute(step))\n#   p=0.4 -> 0.925 at 18.2 plan-calls/task. Robust and expensive.\n\n# ★ 3. HYBRID - replan only when reality DEVIATES from the step's\n#      expectation. The production default.\nplan = planner(task)\nfor step in plan:\n    obs = execute(step)\n    if obs != step.expected:             # pay for a plan-call ONLY here\n        plan = planner(task, history); continue\n#   p=0.4 -> 0.825 at 8.1 plan-calls/task\n#   = ~89% of ReAct's robustness for ~45% of its cost.\n\n# ★ THE DECISION IS NOT A PHILOSOPHY - it's a function of p, your\n#   environment's deviation rate. MEASURE IT: run N steps, count how\n#   often the observation differs from what the step assumed.\n#     p near 1.0 -> static matches everything at 1/20th the cost, and\n#                   replanning every step is insurance against a risk\n#                   you do not face\n#     p low      -> replanning earns its cost, and hybrid earns it best\n\n# ★ A METHOD NOTE THAT IS ITSELF THE LESSON: ReAct was given static's\n#   plan DEPTH so the comparison isolates REPLANNING. Otherwise you are\n#   measuring two changes at once and attributing both to one of them.",
          "caption": "Hybrid is the default because it pays for a planning call only when the environment actually deviated — and the strategy choice is set by a rate you can measure in an afternoon."
        },
        {
          "h": "Decomposition, as a measured reach multiplier",
          "paras": [
            "A depth-limited planner gets strictly further with a midpoint, and the staircase is clean."
          ],
          "code": "# THE SETUP: a planner that can only search to depth K.\n#   goal at distance <= K   -> solved\n#   goal at distance  > K   -> 0.000, at any prompt quality\n\n# WITH ONE MIDPOINT SUBGOAL, reach doubles - a clean staircase:\n#   distance:   2   4   6   8   10\n#   direct:   1.0 1.0 0.0 0.0  0.0      <- K = 4\n#   +subgoal: 1.0 1.0 1.0 1.0  0.0      <- 2K = 8\nsub = planner.pick_midpoint(task)        # ONE extra planning call\nplan = planner(start, sub) + planner(sub, goal)\n\n# ★ SO DECOMPOSITION IS NOT \"CLEARER THINKING\" - it is a MULTIPLICATION\n#   of reachable depth, and the multiplier is the number of subgoals:\n#   m subgoals -> reach m*K.\n#\n#   THE CONDITION (which is what makes it fail when it fails): the\n#   subgoal must be reachable within K AND actually lie on a path to\n#   the goal. A badly chosen midpoint buys nothing and costs a call.\n#   That is why decomposition quality matters more than decomposition\n#   quantity - splitting into more pieces does not help if the split\n#   points are wrong.\n\n# AND THE LIMIT WORTH STATING: decomposition assumes the subtasks are\n# INDEPENDENT enough to plan separately. When hop two genuinely needs\n# hop one's RESULT (not just its completion), you need the loop, not a\n# better decomposition - which is exactly 21-01's compositional depth.",
          "caption": "The staircase makes decomposition concrete: reach goes from K to mK for m−1 extra planning calls, provided the split points lie on a real path."
        }
      ],
      "useCases": [
        "Choosing a control strategy for an agent, which reduces to measuring how often your environment deviates from what a plan assumed.",
        "Extending an agent's reach on deep tasks, where inserting subgoals multiplies the reachable depth of a planner that is otherwise capped.",
        "Cost control on an existing ReAct agent, where switching to replan-on-deviation typically keeps most of the robustness at roughly half the planning calls.",
        "Auditing an agent that works in staging and fails in production, which is very often a deviation-rate difference rather than a model difference."
      ],
      "pitfalls": [
        "Treating plan-versus-react as a philosophical choice. It is determined by the environment's deviation rate, and the right answer inverts as that rate moves.",
        "Assuming a more detailed plan is a safer plan. Static plan survival is p to the n, so a longer plan is exponentially more fragile in an unreliable environment.",
        "Replanning every step in a reliable environment. At p near one the static plan matches everything else at a twentieth of the cost, so ReAct there is insurance against a risk you do not face.",
        "Comparing strategies without controlling plan depth. Giving ReAct a different search depth than the static baseline measures two changes at once and attributes both to replanning.",
        "Decomposing into more pieces to get further. Reach multiplies only if each subgoal is reachable and lies on a real path to the goal, so split quality dominates split count.",
        "Using decomposition where the loop is required. If hop two needs hop one's actual result rather than its completion, no decomposition reaches it - that is compositional depth and it needs observation.",
        "Ignoring the cost axis entirely. ReAct at 18.2 planning calls per task is a real bill, and reporting robustness without it makes the comparison meaningless."
      ],
      "connections": [
        {
          "ref": "agentic-ai/agent-loop",
          "text": "Where compositional depth is defined and measured. Decomposition extends reach within a planner; the loop is what handles a step that needs a previous step's result."
        },
        {
          "ref": "rag-agents/agent-loops",
          "text": "The same three strategies argued structurally rather than measured - and the same conclusion that hybrid is the production default."
        },
        {
          "ref": "agentic-ai/agent-memory",
          "text": "What the replanning history costs. Every replan re-reads the trajectory, so the context management problem grows with the strategy's adaptivity."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where planning calls show up as a cost line, and why the plan-call count per task is one of the more useful agent metrics to track."
        },
        {
          "ref": "reinforcement-learning/model-based-rl",
          "text": "Planning with a learned model of the environment, including the same failure - a plan is only as good as the model's assumption about what an action does."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What determines whether to plan up front or react?",
          "a": "The environment's deviation rate - how often an action does something other than what the plan assumed. It is a measurement, not a philosophy."
        },
        {
          "q": "What happens to a static plan at a 0.4 success-per-step rate?",
          "a": "It collapses to 0.075. Not a decline - after the first surprise, every later step addresses a world state that no longer exists."
        },
        {
          "q": "Why is a longer plan more fragile?",
          "a": "Survival is p to the n, so plan length is the exponent. A more detailed plan is exponentially riskier in an unreliable environment."
        },
        {
          "q": "What did ReAct score in the same setting?",
          "a": "0.925, by replanning after every observation - at 18.2 planning calls per task against the static plan's 1.0."
        },
        {
          "q": "What is the hybrid strategy?",
          "a": "Plan once, then replan only when an observation deviates from what the step expected. It scored 0.825 at 8.1 planning calls."
        },
        {
          "q": "Why is hybrid the production default?",
          "a": "About 89% of ReAct's robustness for about 45% of its cost - you pay for a planning call only when the environment actually deviated."
        },
        {
          "q": "When is a static plan the right choice?",
          "a": "When p is near one. It matches everything else at a twentieth of the cost, and replanning there is insurance against a risk you do not face."
        },
        {
          "q": "What does decomposition buy, measured?",
          "a": "A depth-limited planner capped at K reaches 2K with one midpoint subgoal - a clean staircase, for the price of one extra planning call."
        },
        {
          "q": "What is the general form?",
          "a": "m subgoals give reach of m times K. The multiplier is the number of subgoals, not a vague improvement in clarity."
        },
        {
          "q": "When does decomposition fail?",
          "a": "When a subgoal is not reachable within K or does not lie on a real path to the goal. Split quality dominates split count."
        },
        {
          "q": "When is decomposition the wrong tool?",
          "a": "When hop two needs hop one's actual result rather than its completion. That is compositional depth and it requires observation, not a better split."
        },
        {
          "q": "Why was ReAct given the static planner's depth?",
          "a": "To isolate replanning. Different depths would change two things at once and attribute both to the strategy."
        }
      ],
      "standard": [
        {
          "q": "How would you choose between plan-then-execute, ReAct, and a hybrid?",
          "a": "BY MEASURING ONE NUMBER - the environment's deviation rate - because the answer is a function of it and inverts as it moves. THE MEASUREMENT: run a sample of trajectories and count how often an observation differs from what the step assumed. Tool failures, stale data, unexpected states, results that do not match the expectation. Call that deviation rate 1 minus p. It takes an afternoon and it settles the architecture question. WHAT THE MEASURED FRONTIER SAYS. At p of 0.4, a static plan scores 0.075 at 1.0 planning calls per task. ReAct scores 0.925 at 18.2. Hybrid - replan only on deviation - scores 0.825 at 8.1. So hybrid captures about 89% of ReAct's robustness for about 45% of its cost, which is why replan-on-deviation is the production default rather than either famous option. WHY THE STATIC PLAN COLLAPSES RATHER THAN DEGRADES, which is the part worth understanding. Survival is p to the n, so plan length is an exponent - a more detailed plan is exponentially MORE fragile, which inverts the natural intuition that thorough planning is safer. And the failure is worse than the probability suggests: after the first deviation the remaining steps are not merely likely to fail, they are addressing a world state that no longer exists, so a plan built on a false premise executes confidently into nothing. WHAT THE OTHER END OF THE TABLE SAYS, and it is the half people skip. At p near one, the static plan matches everything else at a twentieth of the cost. An agent replanning every step in a reliable environment is paying for insurance against a risk it does not face - and this is a common and expensive configuration, because ReAct is the default in most frameworks regardless of environment. HOW I WOULD ACTUALLY DECIDE. Measure p. If it is high, use a static plan or a very light hybrid, and spend the saved calls on something else. If it is low, use hybrid - the deviation trigger is a few lines and it converts most of ReAct's benefit into a fraction of its cost. Use full ReAct when deviations are frequent AND unpredictable enough that expectations cannot be specified per step, which is the condition that makes the deviation check itself unreliable. AND THE METHODOLOGICAL NOTE that I would raise because it applies to any comparison like this: in the measured setup, ReAct was given the static planner's search depth deliberately, so that the comparison isolates REPLANNING. If the strategies had differed in depth as well, the result would be a mixture of two changes attributed to one of them - which is the most common way an architecture comparison misleads, and it is easy to do accidentally.",
          "deepDive": {
            "q": "Design the deviation check for a hybrid agent. What makes it work or fail?",
            "a": "THE DEVIATION CHECK IS THE ENTIRE HYBRID STRATEGY, so its quality determines whether you get ReAct's robustness at hybrid's cost or the worst of both. It answers one question after each step: did reality match what this step assumed? WHAT MAKES IT WORK - EXPLICIT EXPECTATIONS. The planner must emit, per step, what it expects to be true afterwards: this file exists, this query returns rows, this record is in state X. Then the check is a comparison rather than a judgement. This is the design decision that matters most, and it has a useful side effect - forcing a planner to state expectations makes its plans better, because a step whose expected outcome cannot be articulated is usually underspecified. THE FAILURE MODES, and they are asymmetric. TOO SENSITIVE: the check fires on benign variation - a different row count, a reordered list, extra whitespace - and you replan constantly, collapsing toward ReAct's cost without ReAct's justification. That is the expensive failure and it is the common one, because naive equality on tool output is almost always too strict. TOO INSENSITIVE: the check passes when something meaningful changed, and the plan proceeds on a false premise, which is exactly the static-plan collapse arriving despite having chosen hybrid. That is the dangerous failure. HOW I WOULD BUILD IT, in layers from cheap to expensive. First, hard signals: the tool errored, returned empty, timed out, or returned a different type than declared. These are unambiguous, free, and they catch most real deviations. Second, structural checks against the declared expectation - the record exists, the count is nonzero, the status is one of an expected set. Third, and only where needed, a semantic check by the model: does this result support continuing with the plan? Expensive, so reserve it for steps where the first two are inadequate. THE TUNING KNOB is the sensitivity, and it should be set from the same frontier logic as everything else: measure replan RATE alongside success. If the replan rate approaches one per step you have built ReAct with extra machinery; if success is materially below full ReAct's, the check is missing deviations and should be tightened. Those two numbers bracket the correct setting. WHAT ELSE I WOULD ADD. A replan BUDGET separate from the step budget, because a pathological loop can replan repeatedly without progressing - and replanning is the expensive call. A check for whether the replan actually CHANGED the plan, since an identical replan means the planner has no new information and the agent is stuck rather than adapting. And logging of deviation reasons, which is genuinely useful operationally: the distribution of why steps deviate tells you which tools are unreliable, and that usually points at a fix upstream of the agent entirely. THE PRINCIPLE: hybrid works because most steps in most environments go as expected, so the expensive adaptation is paid for rarely. If your deviation rate is so high that it fires constantly, the honest conclusion is that you are in ReAct's regime and should stop paying for the plan."
          }
        },
        {
          "q": "What does task decomposition actually buy?",
          "a": "A MULTIPLICATION OF REACHABLE DEPTH, WHICH IS MEASURABLE - and it is a much more specific claim than 'breaking problems down helps'. THE MEASUREMENT. A planner limited to searching depth K solves everything within K and scores exactly zero beyond it, at any prompt quality, because the search cannot reach. Insert ONE midpoint subgoal and it now solves up to 2K: plan from start to subgoal, then subgoal to goal, each within the depth limit. Measured as a clean staircase. The general form is that m subgoals give reach of m times K, for m minus one extra planning calls. WHY THAT FRAMING IS BETTER than 'clearer thinking'. It tells you when decomposition will help - when the task exceeds the planner's reach - and when it will not: if the task is already within K, decomposition costs a planning call and buys nothing. It also tells you what to optimize, which is the choice of split points rather than the number of splits. THE CONDITION, which is what makes it fail when it fails. Each subgoal must be REACHABLE within K from its predecessor, and it must lie on an actual path to the goal. A midpoint that is reachable but off-path takes you somewhere you cannot continue from, so you have spent a planning call to arrive at a dead end - and the agent will then usually keep trying, spending more. So decomposition QUALITY dominates decomposition QUANTITY: splitting into six badly chosen pieces is worse than two well chosen ones. WHERE DECOMPOSITION IS THE WRONG TOOL, and this is the distinction I would want made carefully. It assumes the subtasks can be planned SEPARATELY - that you can specify the second leg without having executed the first. When hop two genuinely needs hop one's RESULT, not just its completion, no decomposition reaches it: you cannot write 'find the manager of the person who signed this' as two independent plans, because the second plan's target is unknown until the first returns. That is compositional depth from 21-01, and the answer is the loop with observation, not a better split. Confusing the two leads to elaborate decomposition machinery applied to a problem that needed one observation step. HOW I WOULD USE IT IN PRACTICE. Ask what the planner's effective reach is - how deep a chain it handles reliably - and compare against the depth distribution of real tasks. If tasks exceed reach, decomposition is the cheap fix. If they do not, skip it. And when decomposing, prefer subgoals with a VERIFIABLE completion condition, because a subgoal you can check is a place to stop and re-ground, which makes the decomposition also serve as error containment - the failure does not propagate past a checkpoint. That dual role, extending reach and bounding error propagation, is the strongest argument for decomposition and it is not the one usually given."
        },
        {
          "q": "Are language models good planners?",
          "a": "NOT PARTICULARLY, AND THE HONEST ANSWER MATTERS BECAUSE MOST AGENT ARCHITECTURES ASSUME OTHERWISE. On classical planning benchmarks - problems with formal goal states, preconditions and effects - model performance is well below what dedicated planners achieve, and it degrades quickly with problem depth. Studies that test this directly find models producing plans that look plausible and violate constraints, skip necessary preconditions, or fail to reach the goal. That is a robust finding rather than an artefact of prompting, and it should inform the architecture. WHY THEY LOOK BETTER THAN THEY ARE. Model-generated plans are fluent, well-structured and use the right vocabulary, so they READ as competent - and in familiar domains they often are competent, because the plan is close to something in the training distribution. The failure appears on novel combinations, on longer horizons, and wherever a constraint must be tracked across steps. So a demo on a familiar task predicts poorly for an unfamiliar one, which is exactly the generalization gap that makes agent projects surprising. WHAT THIS IMPLIES ARCHITECTURALLY, and it is the useful part. First, it argues FOR replanning: if the plan is unreliable, committing to it is worse than re-deriving it with new information, which is a second independent reason hybrid and ReAct beat static plans beyond the environment-deviation argument. Second, it argues for SHORT plans - reach is limited, so decomposing into short legs plays to the strength rather than the weakness. Third, it argues for VERIFICATION: if a plan step's precondition can be checked cheaply, check it, because the model's assertion that a step is applicable is not strong evidence. Fourth, it argues for using a real planner where one exists - for genuinely combinatorial subproblems, a search algorithm with the model supplying the domain description is far better than the model doing the search itself. WHERE MODELS ARE GENUINELY GOOD, since the picture is not uniformly negative. Translating an informal goal into a formal one. Choosing among a small set of known approaches. Supplying commonsense knowledge about what actions exist and roughly what they do. Recovering from a surprise, which is a local reasoning problem rather than a search problem. Those are real strengths and they suggest a division of labour: the model frames the problem and handles the local judgement, and a search procedure handles the combinatorics. HOW I WOULD STATE IT TO A TEAM: do not build an architecture whose reliability depends on the model producing a correct multi-step plan up front. Build one that assumes plans are provisional, keeps them short, verifies preconditions where verification is cheap, and re-grounds on observation. That is the same conclusion the deviation-rate measurement reaches from a completely different direction, which is a good sign it is the right one."
        },
        {
          "q": "How would you measure planning quality in an agent?",
          "a": "SEPARATELY FROM TASK SUCCESS, because a plan can be poor and the task still succeed - through retries, luck, or a forgiving environment - and a plan can be excellent and the task fail for reasons downstream. Conflating them is why planning improvements are hard to attribute. THE METRICS I WOULD TRACK. (1) PLAN VALIDITY: does the plan respect the domain's preconditions, and is every step actually available given the state at that point? This is checkable without executing anything if you have a formal-enough domain, and it separates 'the model wrote a plan that cannot work' from 'the environment misbehaved'. (2) PLAN LENGTH versus the known optimum, where the optimum is available - a plan solving in nine steps what takes four is a real inefficiency and it multiplies cost. (3) PLAN-CALLS PER TASK, which is the cost axis and the one that distinguishes the strategies: 1.0 static, 8.1 hybrid, 18.2 ReAct in the measured setting. This is one of the more useful agent metrics generally and it is rarely tracked. (4) DEVIATION RATE and REPLAN RATE, together. The first is a property of the environment, the second of your check's sensitivity. If replan rate approaches deviation rate you have a well-tuned check; if it far exceeds it, the check is firing on benign variation and you are paying ReAct's cost for hybrid's design. (5) RECOVERY RATE: given a deviation, how often does the agent get back on track? That is the number that actually justifies adaptive control. HOW I WOULD ISOLATE THE PLANNER from everything else, which is the methodological point. Fix the environment's deviation rate deliberately - inject failures at a known probability - and hold everything else constant. That is what makes a comparison attributable, and it is exactly the discipline that gave the frontier its meaning: ReAct was handed the static planner's search DEPTH so that the only difference between the arms was replanning. Without that control you are comparing two changes and crediting one. WHAT I WOULD ALSO WATCH, less quantitatively but usefully. Whether replans actually CHANGE the plan - an identical replan means no new information was incorporated and the agent is stuck rather than adapting, which looks like activity in the logs. Whether plan length grows over a trajectory, which usually means the agent is adding steps rather than converging. And the DISTRIBUTION of deviation reasons, which is operationally the most actionable thing here: if 70% of deviations come from one flaky tool, the fix is upstream of the agent entirely and no planning strategy is the right lever. THE FRAMING: planning quality is a property you can only see if you instrument the plan itself, not the outcome. Most agent systems log the actions and not the plan or its expectations, which makes every question in this answer unanswerable after the fact - so the instrumentation decision is made before you know you need it."
        },
        {
          "q": "How does this connect to classical planning and search?",
          "a": "THE PROBLEM IS THE SAME AND THE TOOLS ARE VERY DIFFERENT, and knowing the classical version tells you when to stop asking a model to do it. THE CLASSICAL SETUP: states, actions with preconditions and effects, a goal condition, and a search for a sequence that reaches it. Decades of work produced algorithms with guarantees - A-star returns an optimal path given an admissible heuristic, BFS finds the shortest unweighted path, and the whole field has well-understood complexity and completeness properties. Those guarantees are exactly what a language model does not offer. WHAT TRANSFERS DIRECTLY. Depth limits: the measured decomposition result is the classical observation that a depth-limited search reaches K and inserting a waypoint lets you compose two searches to reach 2K. The frontier-versus-cost trade in this lesson is the same shape as search's time-versus-optimality trade. And heuristics: a good heuristic is what makes search tractable, and the model's genuine strength - commonsense knowledge about what actions plausibly help - is heuristic knowledge rather than search ability. WHAT DOES NOT TRANSFER, and it is the important part. There is no guarantee of completeness or optimality; a model may simply not produce a plan that exists. There is no systematic exploration, so it does not enumerate alternatives and can miss a solution it would recognize if shown. And the state is implicit in text rather than represented, so preconditions cannot be checked mechanically unless you build that layer yourself. THE HYBRID THAT I THINK IS UNDER-USED: let the model produce the DOMAIN DESCRIPTION - what actions exist, what their preconditions and effects are, what the goal condition is - and hand the actual search to a classical planner. This plays to both sides: the model does the framing and the commonsense, which is hard to formalize, and the planner does the combinatorics, which the model does badly and the algorithm does with guarantees. For genuinely combinatorial subproblems - scheduling, routing, resource allocation, constraint satisfaction - this is dramatically better than asking a model to search, and it is a well-established pattern. WHEN TO REACH FOR IT: whenever the subproblem has a formal structure and a known algorithm. Pathfinding, dependency ordering, allocation under constraints. The tell is that you can state the problem precisely, which is exactly the condition under which a model's fluent-but-unverified plan is the wrong tool. WHERE THE LOOP IS STILL NEEDED. Classical planning assumes a known model of the environment - you must know what actions do. When you do not, or when the environment can surprise you, execution has to interleave with observation regardless of how the plan was produced. So the two are complementary rather than competing: use search where the model of the world is reliable, and use the loop where it is not. That maps neatly onto the deviation-rate measurement, which is essentially asking how good your model of the environment is."
        },
        {
          "q": "How does this lesson fit the module's method?",
          "a": "IT TAKES THE MOST-DEBATED CHOICE IN AGENT DESIGN AND SHOWS IT IS NOT A DEBATE, which is the module's method at its most useful. Plan-then-execute versus ReAct is usually argued as a matter of philosophy - think first, or adapt as you go - and the measurement dissolves the argument: the answer is a function of the environment's deviation rate, and it inverts as that rate moves. At p near one the static plan matches everything at a twentieth of the cost; at p of 0.4 it collapses to 0.075 while ReAct holds 0.925. Neither position is right in general and both are right in a regime, which is the module's recurring finding stated about a specific controversy. THE SECOND CONTRIBUTION is that the answer is neither famous option. Hybrid - replan only on deviation - captures about 89% of ReAct's robustness at about 45% of its planning cost. That result has a shape worth generalizing: pay for the expensive adaptive behaviour only when the condition that justifies it actually occurs. The same shape appears elsewhere in the module - confirm by RISK rather than uniformly, retry on ERROR rather than always, route to the loop only for tasks with depth. In each case the naive designs are 'always' and 'never', and the good design is a cheap trigger. THE THIRD CONTRIBUTION is methodological and I would not skip it: ReAct was given the static planner's search depth deliberately, so the comparison isolates replanning. Without that control the result would be a mixture of two changes credited to one, which is the most common way an architecture comparison misleads - and it is easy to do by accident, since the natural thing is to configure each arm 'as it would normally be run'. Controlling the confound is what makes the frontier a measurement rather than an anecdote, and it is a habit worth carrying into any A-versus-B comparison. AND THE DECOMPOSITION RESULT continues the pattern from 21-01. There, the loop's contribution was isolated as composition; here, decomposition's contribution is isolated as a reach MULTIPLIER, with the condition attached - the subgoal must be reachable and on-path. Both replace a vague claim ('the loop helps', 'breaking it down helps') with a mechanism, a number, and a regime. That is the whole method, and the reason to run these small measurements is that they are an afternoon each and they change architectural decisions that otherwise get made by reputation."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The frontier that settles plan-vs-ReAct",
        "back": "At p=0.4 — static 0.075 @ 1.0 plan-calls · HYBRID 0.825 @ 8.1 · ReAct 0.925 @ 18.2. Hybrid = ~89% of ReAct's robustness for ~45% of its cost → replan-on-deviation is the production default."
      },
      {
        "type": "formula",
        "front": "Why a static plan COLLAPSES",
        "back": "P = pⁿ, so plan LENGTH is the exponent — a more detailed plan is exponentially MORE fragile, inverting the natural intuition. And after the first deviation the remaining steps address a world state that no longer exists."
      },
      {
        "type": "intuition",
        "front": "The half of the table people skip",
        "back": "At p near 1.0 the static plan MATCHES everything at 1/20th the cost. An agent replanning every step in a reliable environment is buying insurance against a risk it doesn't face — and ReAct is the framework default regardless of environment."
      },
      {
        "type": "intuition",
        "front": "It's not a philosophy — measure p",
        "back": "Run N steps, count how often the observation differs from what the step assumed. That one number determines the architecture, and it takes an afternoon."
      },
      {
        "type": "formula",
        "front": "★ Decomposition = a reach MULTIPLIER",
        "back": "A depth-K planner scores 0 beyond K at any prompt quality. One midpoint subgoal → reach 2K (clean staircase); m subgoals → mK, for m−1 extra planning calls. Not \"clearer thinking\" — a multiplication."
      },
      {
        "type": "pitfall",
        "front": "The condition on decomposition",
        "back": "Each subgoal must be REACHABLE within K and lie on a real path to the goal. A reachable but off-path midpoint costs a call and arrives at a dead end. Split QUALITY dominates split COUNT."
      },
      {
        "type": "pitfall",
        "front": "When decomposition is the wrong tool",
        "back": "When hop two needs hop one's RESULT, not just its completion — you cannot write the second plan because its target is unknown until the first returns. That's compositional depth: it needs the LOOP, not a better split."
      },
      {
        "type": "intuition",
        "front": "The deviation check IS the hybrid strategy",
        "back": "Too SENSITIVE → fires on benign variation, collapsing to ReAct's cost without its justification (the common failure). Too INSENSITIVE → the static collapse arrives anyway (the dangerous one). Bracket it by watching replan rate AND success together."
      },
      {
        "type": "intuition",
        "front": "Make the planner emit EXPECTATIONS",
        "back": "Per step: what should be true afterwards. Then the check is a comparison, not a judgement. Side benefit — a step whose expected outcome can't be articulated is usually underspecified, so this improves the plans themselves."
      },
      {
        "type": "pitfall",
        "front": "Are LLMs good planners? Not particularly",
        "back": "Below dedicated planners on formal benchmarks, degrading with depth; plans READ as competent because they're fluent. So: keep plans SHORT, treat them as provisional, verify preconditions, and hand genuine combinatorics to a real search algorithm."
      },
      {
        "type": "intuition",
        "front": "The under-used hybrid with classical search",
        "back": "Let the model produce the DOMAIN DESCRIPTION (actions, preconditions, effects, goal) and give the SEARCH to a classical planner. Model does framing + commonsense (hard to formalize); algorithm does combinatorics (with guarantees)."
      },
      {
        "type": "intuition",
        "front": "★ The method note that is itself the lesson",
        "back": "ReAct was given static's plan DEPTH so the comparison isolates REPLANNING. Configuring each arm \"as it'd normally be run\" changes two things and credits one — the most common way an architecture comparison misleads."
      }
    ],
    "refs": [
      {
        "title": "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models",
        "url": "https://arxiv.org/abs/2210.03629"
      },
      {
        "title": "Zhou et al. (2022), Least-to-Most Prompting Enables Complex Reasoning in Large Language Models",
        "url": "https://arxiv.org/abs/2205.10625"
      },
      {
        "title": "Wang et al. (2023), Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning",
        "url": "https://arxiv.org/abs/2305.04091"
      },
      {
        "title": "Yao et al. (2023), Tree of Thoughts: Deliberate Problem Solving with Large Language Models",
        "url": "https://arxiv.org/abs/2305.10601"
      },
      {
        "title": "Valmeekam et al. (2023), On the Planning Abilities of Large Language Models - A Critical Investigation",
        "url": "https://arxiv.org/abs/2305.15771"
      }
    ],
    "demos": [
      "react-agent",
      "bfs-dfs-astar",
      "pathfinding",
      "mcts"
    ],
    "demoTitles": {
      "react-agent": "ReAct — Reason + Act",
      "bfs-dfs-astar": "BFS vs DFS vs A*",
      "pathfinding": "A* Pathfinding",
      "mcts": "MCTS Tree Search"
    }
  }
};
