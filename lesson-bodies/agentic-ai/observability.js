// GENERATED from content/lessons/agentic-ai/observability.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/observability/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "observability": {
    "level": "advanced",
    "body": {
      "intuition": [
        "An agent run is a distributed trace whether or not you instrument it as one: a sequence of spans, each with a duration and a cost, nested under a single request. Instrumenting it that way produces a finding that changes where you spend effort - the LATENCY bottleneck and the COST bottleneck are usually DIFFERENT STEPS. Latency concentrates in tool and network calls; cost concentrates in model calls with large token counts. So 'optimize the slow part' and 'optimize the expensive part' send you to different places, and an aggregate number sends you to neither.",
        "The second finding is a cost curve nobody notices until the bill arrives. The natural way to write an agent - send the whole conversation to the model each step - is QUADRATIC in trajectory length, because each step re-sends a history that grew by the previous step. Measured at forty steps it costs 3.1 times a managed window, and the multiplier keeps climbing with roughly half the trajectory length divided by the window size. Nothing about this shows up as an error; the agent works perfectly and simply costs several times what it needs to.",
        "The third is about the shape of the cost distribution, and it is the one that changes a policy argument. Agent cost is HEAVY-TAILED: most runs are cheap and a few are enormous. Applying a per-run cap cut the maximum from $15.50 to $0.50 and total spend by 34% while leaving the MEDIAN RUN COMPLETELY UNCHANGED. That is the answer to the usual objection that a cap will degrade quality - for the typical request it does nothing at all, because the typical request was never near the cap. The same shape appears in latency, where p95 ran 3.8 times p50, which is why tails govern how a product feels."
      ],
      "math": [
        {
          "h": "Naive history handling is quadratic",
          "paras": [
            "Each step re-sends everything before it, so total tokens grow with the square of the trajectory.",
            "A managed window makes it linear."
          ],
          "tex": "\\text{naive} = \\sum_{i=1}^{n} i\\,w \\approx \\frac{n^2 w}{2} \\qquad\\text{vs}\\qquad \\text{windowed} = n\\,W, \\qquad \\text{ratio} \\approx \\frac{n}{2W}",
          "texNote": "Measured at forty steps this was 3.1 times the windowed cost, and the ratio grows linearly in trajectory length - so a system that is fine at ten steps is expensive at forty and untenable at two hundred. The failure is silent: nothing errors, the agent behaves correctly, and it simply costs a multiple of what it should. This is also where the memory design and the cost curve meet, since the window is exactly the memory-management decision from 21-05."
        },
        {
          "h": "Caching is linear in hit rate",
          "paras": [
            "A cache removes a fraction of the work equal to the hit rate.",
            "Agent workloads have unusually high hit rates because prefixes repeat."
          ],
          "tex": "\\text{cost} = (1-h)\\,c_{\\text{uncached}}, \\qquad h = 0.8 \\;\\Rightarrow\\; 20\\% \\text{ of uncached}",
          "texNote": "There is no cleverness here and that is the point - the relationship is linear, so the engineering question is entirely about raising h. Agent traffic is well suited to it because the system prompt, tool schemas and early history repeat identically across steps of the same run and across runs, which is precisely what prefix caching exploits. Structuring the prompt so the stable part comes FIRST is what makes the prefix cacheable, and it is a free win that ordering alone can destroy."
        },
        {
          "h": "The tail is the whole cost problem",
          "paras": [
            "The distribution is heavy-tailed, so the mean and the maximum are set by a few runs.",
            "A cap therefore removes spend without touching the typical request."
          ],
          "tex": "\\text{cap } \\$0.50: \\quad \\max \\$15.50 \\to \\$0.50, \\quad \\text{total} \\downarrow 34\\%, \\quad \\textbf{median unchanged}",
          "texNote": "That last term is the argument. The usual objection to a cap is that it will degrade quality, and for the median request it demonstrably does nothing - the typical run was never close to the limit. The cap removes the runaway trajectories, which are disproportionately the confused ones anyway. Latency has the same shape, with p95 at 3.8 times p50, which is why an average latency figure describes an experience no user has."
        }
      ],
      "code": [
        {
          "h": "Trace the run, and attribute per step",
          "paras": [
            "The instrumentation is standard distributed tracing; the finding is that two bottlenecks live in different places."
          ],
          "code": "# An agent run IS a distributed trace: one root span per request, a\n# child span per step, and a leaf per model or tool call.\nwith tracer.span(\"agent_run\", task_id=t) as run:\n    for i in range(budget):\n        with run.span(f\"step_{i}\") as step:\n            with step.span(\"llm\") as s:      # tokens_in/out, cost, ms\n                action = model(...)\n            with step.span(\"tool\", name=action.name) as s:\n                obs = tools[action.name](...)\n\n# ★ THE FINDING: the two bottlenecks are DIFFERENT STEPS.\n#     LATENCY  concentrates in TOOL / NETWORK calls\n#     COST     concentrates in LLM calls with large token counts\n#   So \"optimize the slow part\" and \"optimize the expensive part\" send\n#   you to different places - and one aggregate number sends you to\n#   neither. Attribute BOTH per step or you will optimize the wrong one.\n\n# WHAT EVERY SPAN SHOULD CARRY:\n#   duration, tokens_in, tokens_out, cost, cache_hit, error,\n#   tool_name, retry_index, and the trajectory/task id to join on\n\n# ★ AND THE ONE THAT MAKES FAILURES DIAGNOSABLE AT ALL: log what was\n#   IN the context for each call, not just the response. Almost every\n#   agent post-mortem reduces to \"was the fact present?\", which is\n#   unanswerable afterwards unless it was recorded (21-05).",
          "caption": "Latency lives in tool calls and cost lives in token counts, so per-step attribution of both is what stops you optimizing the wrong step."
        },
        {
          "h": "The three cost levers, in order of what they return",
          "paras": [
            "One removes a quadratic term, one is linear in hit rate, and one bounds the tail."
          ],
          "code": "# 1. ★ FIX THE QUADRATIC. Naive: resend the whole history every step.\n#    total ~ n^2*w/2   vs   windowed  n*W\n#    MEASURED at n=40:  3.1x  the managed-window cost, and the ratio\n#    grows ~ n/(2W) - fine at 10 steps, expensive at 40, untenable at\n#    200. Nothing errors. The agent works and costs a multiple.\n\n# 2. CACHE. cost = (1-h) * uncached, so h=0.8 -> 20%.\n#    Agent traffic caches unusually well: the system prompt, tool\n#    schemas and early history repeat identically across steps.\n#    ★ STRUCTURE THE PROMPT SO THE STABLE PART IS FIRST - prefix\n#      caching needs a stable prefix, and putting a timestamp or a\n#      per-request id at the top destroys the hit rate silently.\n\n# 3. CAP. The distribution is HEAVY-TAILED:\n#      $0.50 per-run cap ->  max $15.50 -> $0.50\n#                            total spend  -34%\n#                            MEDIAN RUN   UNCHANGED\n#    ★ That last line answers the standard objection. A cap does not\n#      degrade the typical request - the typical request was nowhere\n#      near it. It removes runaway trajectories, which are\n#      disproportionately the CONFUSED ones anyway.\n\n# AND FOR LATENCY, the same shape: p95 = 3.8x p50. Report and alert on\n# PERCENTILES; a mean latency describes an experience no user has.\n\n# ⚠ THE PRICES ABOVE ARE ILLUSTRATIVE. The SHAPES and RATIOS are the\n#   transferable content - quadratic growth, linear cache benefit,\n#   heavy tail - and those hold regardless of the price list.",
          "caption": "The cap's median-unchanged result is the argument that matters: bounding cost removes the tail without touching the typical request."
        }
      ],
      "useCases": [
        "Diagnosing a slow agent, where per-step spans show whether the time is in tool calls or model calls and those have different fixes.",
        "Controlling spend on a deployed agent, where a per-run cap bounds the tail and leaves the median run untouched.",
        "Finding the quadratic history bug, which produces no error and simply multiplies cost as trajectories get longer.",
        "Post-mortems on agent failures, which are usually unanswerable unless the context and the per-step trace were recorded at the time."
      ],
      "pitfalls": [
        "Optimizing from an aggregate. The latency bottleneck and the cost bottleneck are usually different steps, so a single number points at neither.",
        "Resending the full history each step. Total tokens grow with the square of trajectory length - 3.1 times a managed window at forty steps - with no error to signal it.",
        "Putting a timestamp or request id at the top of the prompt. It changes the prefix on every call and silently destroys the cache hit rate.",
        "Objecting to cost caps on quality grounds. The measured cap cut the maximum thirty-fold and total spend by a third while leaving the median run unchanged.",
        "Reporting mean latency. The distribution is heavy-tailed - p95 was 3.8 times p50 - so the mean describes an experience no user has.",
        "Logging responses but not context. Nearly every agent post-mortem asks whether a fact was present, and that is unanswerable afterwards unless it was recorded.",
        "Treating prices as the lesson. The transferable content is the shapes - quadratic growth, linear cache benefit, heavy tail - which hold regardless of the price list.",
        "Instrumenting only at the request level. Without per-step spans you cannot attribute cost or latency, and an agent is a distributed system whether or not you traced it as one."
      ],
      "connections": [
        {
          "ref": "agentic-ai/agent-memory",
          "text": "Where the quadratic comes from and how it is fixed - the managed window is the memory decision, and its cost consequence is measured here."
        },
        {
          "ref": "agentic-ai/react-planning",
          "text": "The interaction that multiplies everything: an adaptive strategy replans repeatedly, and each replan re-reads the history at whatever it costs."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "Why cost belongs beside accuracy in any comparison, and where the per-step data for trajectory rubrics comes from."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "The serving-side mechanism behind prefix caching, and why prefill cost scales with context length in the first place."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The general practice - percentiles over means, distributions over point estimates, and alerting on shifts rather than thresholds."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Where does agent latency concentrate?",
          "a": "In tool and network calls. Cost concentrates in model calls with large token counts - they are usually different steps."
        },
        {
          "q": "Why does that matter?",
          "a": "'Optimize the slow part' and 'optimize the expensive part' point at different places, and one aggregate number points at neither."
        },
        {
          "q": "What is the cost of resending the whole history each step?",
          "a": "Quadratic - roughly n squared times w over 2 - measured at 3.1 times a managed window at forty steps."
        },
        {
          "q": "How does that ratio grow?",
          "a": "Roughly as trajectory length over twice the window, so it is fine at ten steps, expensive at forty and untenable at two hundred."
        },
        {
          "q": "Does that bug produce an error?",
          "a": "No. The agent works correctly and simply costs a multiple of what it should, which is why it survives so long."
        },
        {
          "q": "How does caching scale?",
          "a": "Linearly in hit rate - cost is one minus h times uncached, so an 80% hit rate gives 20% of the uncached cost."
        },
        {
          "q": "Why does agent traffic cache well?",
          "a": "The system prompt, tool schemas and early history repeat identically across steps and runs, which is exactly what prefix caching exploits."
        },
        {
          "q": "What silently destroys a cache hit rate?",
          "a": "Putting a timestamp or request id at the top of the prompt. Prefix caching needs a stable prefix, so the variable part must come last."
        },
        {
          "q": "What shape is the cost distribution?",
          "a": "Heavy-tailed. Most runs are cheap and a few are enormous, so the mean and the maximum are set by a small number of trajectories."
        },
        {
          "q": "What did a per-run cap do?",
          "a": "Cut the maximum from $15.50 to $0.50 and total spend by 34%, with the median run unchanged."
        },
        {
          "q": "Why is 'the median unchanged' the important part?",
          "a": "It answers the objection that a cap degrades quality - the typical request was never near the limit, and the cap removes runaway trajectories."
        },
        {
          "q": "What was p95 latency relative to p50?",
          "a": "3.8 times. Tails govern how a product feels, so a mean latency describes an experience no user has."
        }
      ],
      "standard": [
        {
          "q": "How would you instrument an agent for production?",
          "a": "AS A DISTRIBUTED TRACE, BECAUSE THAT IS WHAT IT IS - one root span per request, a child span per step, and leaves for each model and tool call. Treating it that way is not a metaphor; the standard tracing tooling applies directly, and it is the only structure that supports the attribution questions you will actually need to answer. WHAT EVERY SPAN CARRIES: duration, input and output tokens, cost, cache hit, error, tool name, retry index, and the trajectory and task ids to join on. That is enough to answer nearly every question after the fact. THE FINDING THAT JUSTIFIES PER-STEP ATTRIBUTION: the latency bottleneck and the cost bottleneck are usually DIFFERENT STEPS. Latency concentrates in tool and network calls, cost concentrates in model calls with large token counts. So the two natural optimization instincts point at different places, and an aggregate points at neither. A team looking at 'agent is slow and expensive' and picking one lever has an even chance of working on the wrong step. THE ONE PEOPLE OMIT, and it is the one that makes post-mortems possible: log WHAT WAS IN THE CONTEXT for each model call, not just the response. Almost every agent investigation reduces to 'was the relevant fact present at that point', and that is unanswerable afterwards unless it was recorded. This is an instrumentation decision made before you know you need it, and the cost of not having it is that failures become unexplainable rather than merely hard. WHAT I WOULD ALERT ON, chosen so the signal precedes the complaint. Budget-exhaustion rate, which rises when traffic gets deeper, a tool gets flakier, or the policy starts wandering - three different causes with different fixes, but one early symptom. Cost and latency at p95 rather than mean, because the distribution is heavy-tailed and p95 ran 3.8 times p50. Error rate by tool, since one degraded tool damages every trajectory that touches it. Cache hit rate, which can collapse from a prompt-ordering change and cost several times more with nothing else visible. And step-count distribution, whose tail is where confused trajectories live. WHAT I WOULD SAMPLE RATHER THAN AGGREGATE: full trajectories, prioritized by the signals above - budget exhausted, unusually long, high cost, low self-consistency. Reading trajectories is the highest-information-per-hour activity available on an agent system, and dashboards are structurally unable to show you a failure mode nobody thought to count. AND THE OPERATIONAL PAYOFF OF UNIFORM ENVELOPES, worth noting because it is a real argument for a protocol like MCP: when every tool call has the same request and response shape, one interceptor gives you per-tool latency, cost and error rates across every provider, and the instrumentation stops being per-integration work.",
          "deepDive": {
            "q": "An agent costs far more than expected. Walk through the investigation.",
            "a": "I WOULD GO AFTER THE THREE STRUCTURAL CAUSES IN ORDER, because they have very different sizes and the first is usually the biggest and least visible. CAUSE 1 - THE QUADRATIC HISTORY, which I would check first because it produces no error and is easy to write accidentally. If each step sends the whole conversation, total tokens grow as roughly n squared times the per-step tokens over two, against a managed window's linear n times W. Measured at forty steps that was 3.1 times the windowed cost, and the ratio climbs with trajectory length - so a system that seemed fine in testing at ten steps is expensive at forty. THE DIAGNOSTIC is immediate from traces: plot input tokens per step against step index. A rising line is the bug; a flat line means the window is managed. THE FIX is the memory design from 21-05 - a window of recent turns plus retrieval plus a summary - and it is usually the single largest cost reduction available. CAUSE 2 - CACHE MISSES. Cost falls linearly with hit rate, so an 80% hit rate means 20% of the uncached bill, and agent traffic should cache extremely well because system prompts, tool schemas and early history repeat identically across steps of a run and across runs. THE DIAGNOSTIC is the cache-hit field on the spans. If it is near zero, the usual cause is a prompt whose prefix is not stable - a timestamp, a request id, a randomized instruction order, or tool schemas serialized in a non-deterministic order. Any of those changes the prefix on every call and destroys prefix caching silently. THE FIX is prompt ORDERING: stable content first, variable content last. It is a rearrangement rather than a redesign and it can cut cost several-fold. CAUSE 3 - THE TAIL. Cost is heavy-tailed, so the mean is set by a few enormous runs. THE DIAGNOSTIC is the cost distribution, not the average: if the maximum is thirty times the median, you have a tail problem rather than a per-request efficiency problem. In the measured setting a $0.50 cap cut the max from $15.50 to $0.50 and total spend by 34% WITH THE MEDIAN UNCHANGED - which is the key fact, because it means bounding cost did not degrade the typical request at all. THE FIX is caps: per-run spend, step budget and wall-clock, whichever binds first. And I would look at WHAT the expensive runs were doing, because runaway trajectories are disproportionately confused ones - retry storms against a failing tool, repeated identical actions, or a loop that never satisfies its stopping condition. Those often point at a fix upstream of cost entirely. WHAT ELSE I WOULD CHECK. Retry policy: retries multiply cost and an unbounded policy inside an unbounded loop is how a single request becomes remarkable. Model choice per step, since routing simple steps to a smaller model is a large and often untried saving. Tool output size, because a tool returning a large payload puts it in the context for every subsequent step - which interacts with the quadratic term multiplicatively. AND THE REPORTING DISCIPLINE: the prices in any of this are illustrative and the SHAPES are what transfer. Quadratic growth, linear cache benefit, heavy tail. Those hold regardless of the price list, which is what makes the analysis worth learning rather than the numbers."
          }
        },
        {
          "q": "Why are cost caps the right default, and what is the objection?",
          "a": "BECAUSE THE COST DISTRIBUTION IS HEAVY-TAILED, WHICH MEANS A CAP AND A QUALITY REDUCTION ARE NOT THE SAME THING - and the measurement settles the argument that usually stalls this decision. THE OBJECTION, stated fairly: a cap will cut off runs that would have succeeded, so it trades quality for cost and someone has to decide how much quality to give up. That would be a real trade if cost were uniformly distributed across runs. THE MEASUREMENT: it is not. Applying a $0.50 per-run cap cut the maximum from $15.50 to $0.50 and reduced total spend by 34%, and the MEDIAN RUN WAS UNCHANGED. The typical request was nowhere near the limit, so it was unaffected. The spend removed came from a small number of runaway trajectories. WHY THAT IS MORE THAN A COST ARGUMENT. Runaway runs are disproportionately CONFUSED runs - retry storms against a failing tool, repeated identical actions, a loop whose stopping condition is never satisfied. Those are not usually the runs that would have succeeded with more budget; they are the ones that had already gone wrong. So the cap is frequently removing spend on failures rather than truncating successes, which inverts the objection. WHAT THE CAP ALSO BUYS, beyond money. It makes worst-case cost a NUMBER you can state - in a contract, in a capacity plan, in a rate limit. Without it, expected cost depends on a halting probability you do not control and the tail is unbounded. That predictability is worth as much as the savings in most organizations. HOW I WOULD SET IT, since the objection deserves an answer rather than a dismissal. Look at the cost distribution and put the cap at a high percentile of successful runs - so essentially every run that was going to succeed completes, and only the tail is truncated. Measure the fraction of runs hitting the cap and what happens to them; if successful runs are being cut, raise it. And treat cap-hit rate as a monitoring signal in its own right, because a rise means something changed - deeper traffic, a flakier tool, or a wandering policy. WHAT TO DO WHEN THE CAP FIRES, which is a design decision with a bad default. Returning nothing wastes everything spent. Return the PARTIAL result with an explicit statement that the budget was reached, so the user gets what was found and knows it is incomplete. That converts a hard failure into a degraded success, which is almost always the better product behaviour. AND THE SAME ARGUMENT APPLIES TO LATENCY, where p95 ran 3.8 times p50. A timeout is a cap on the latency tail, and the tail is what users remember - so bounding it improves the experienced product even though it makes the average slightly worse by truncating slow successes. Both cases are the same lesson: in a heavy-tailed distribution, the tail is a different phenomenon from the median and can be managed separately."
        },
        {
          "q": "How do you find the quadratic history problem, and why is it so common?",
          "a": "IT IS COMMON BECAUSE IT IS THE OBVIOUS IMPLEMENTATION, AND INVISIBLE BECAUSE IT PRODUCES NO ERROR. The natural way to write an agent loop is to keep a message list, append each action and observation, and send the whole thing to the model every step. That is correct behaviour - the model sees everything - and the cost grows as roughly n squared times the per-step tokens over two, because step i re-sends everything from steps 1 through i minus 1. Nothing warns you. The agent works. It just costs a multiple. THE DIAGNOSTIC, which takes one plot: input tokens per step against step index. A rising line is the bug; a flat line means the window is managed. From traces this is a single query, and it is the first thing I would look at on any agent cost investigation. THE SCALE, so the priority is clear: measured at forty steps, naive handling cost 3.1 times a managed window, and the ratio grows as roughly trajectory length over twice the window size. At ten steps it is barely noticeable, which is why it survives development. At two hundred steps it dominates everything else you might optimize. WHY IT INTERACTS BADLY WITH OTHER CHOICES. Adaptive control multiplies it: every replan re-reads the history, so a hybrid agent at 8 planning calls or ReAct at 18 pays the growing context that many times. Large tool outputs multiply it too - a tool returning a big payload puts it in the context for every subsequent step, so one verbose tool inflates the whole quadratic. And it raises latency as well as cost, since prefill scales with context length, so the agent gets slower as it goes. THE FIX, which is the memory design from 21-05 rather than a special-purpose optimization: keep recent turns verbatim, retrieve older material semantically, maintain a running summary for the gist, and store extracted facts rather than raw transcript. The transcript grows much faster than its information content, so this improves quality and cost together - which is unusual and worth exploiting. THE SECONDARY FIX: truncate or summarize large tool outputs before they enter the history. An agent does not need the full 50KB API response in context for the next twenty steps; it needs the three fields it used. AND THE PREVENTION, which is cheap: put a per-step input-token budget in the instrumentation and alert if it grows past a threshold. That turns an invisible cost curve into a visible one, and it is the kind of guard that pays for itself the first time someone adds a verbose tool without thinking about the downstream context cost."
        },
        {
          "q": "What should you actually alert on for an agent system?",
          "a": "ON SIGNALS THAT PRECEDE COMPLAINTS AND POINT AT A CAUSE, which rules out most of what people put on dashboards. THE ONES I WOULD SET. (1) BUDGET-EXHAUSTION RATE. This rises when traffic gets deeper, when a tool gets flakier, or when the policy starts wandering - three different causes, one early symptom, and it fires before users notice because an exhausted run usually still returns something partial. (2) COST AND LATENCY AT p95, never the mean. The distribution is heavy-tailed, with p95 at 3.8 times p50 in the measured setting, so the mean describes an experience nobody has and moves too slowly to alert on. (3) CACHE HIT RATE. It can collapse from a single prompt-ordering change - someone adds a timestamp to the top of the system prompt - and the only symptom is a several-fold cost increase with identical behaviour. That is a large regression with no functional signal, which makes it exactly the kind of thing an alert should catch. (4) ERROR RATE BY TOOL, not aggregated. One degraded tool damages every trajectory that touches it, and the aggregate hides it if the tool is used in a minority of runs. (5) STEP-COUNT DISTRIBUTION, watching the tail rather than the mean. A growing tail means trajectories are wandering, which precedes both cost and quality problems. (6) INPUT TOKENS PER STEP, as a guard against the quadratic creeping back in when someone adds a verbose tool. WHAT I WOULD NOT ALERT ON. Success rate as a primary alert, because on live traffic you usually do not have labels, and the proxies that stand in for it are noisy enough to produce false alarms. Mean anything. And thresholds on metrics whose normal range drifts, which produce alerts that get muted and then ignored - a muted alert is worse than none because it creates the impression of coverage. WHAT I WOULD MONITOR WITHOUT ALERTING: the label-free quality proxies - self-consistency across repeated runs, rephrase and undo rates from users, escalation to human channels. These are informative and slow, so they belong on a weekly review rather than a pager. AND THE PRACTICE THAT BEATS ALL OF IT: read sampled trajectories regularly, prioritized by the signals above. Dashboards are structurally unable to show a failure mode nobody thought to count, and agent failures are diverse enough that new modes appear routinely. Every agent system I would want to operate has a standing habit of someone reading the traces - not because the metrics are wrong, but because the metrics only answer questions that were already asked."
        },
        {
          "q": "How does observability differ for agents versus ordinary services?",
          "a": "THE TOOLING IS THE SAME AND THREE PROPERTIES ARE DIFFERENT, and the differences are what make naive service monitoring inadequate. SIMILARITY FIRST: an agent run is a distributed trace, and the standard concepts - spans, parent-child nesting, sampling, percentile latency - apply directly. There is no need to invent an agent-specific observability stack, and treating it as one is how teams end up with worse tooling than they already had. DIFFERENCE 1 - NON-DETERMINISM. The same request twice produces different traces: different steps, different tools, different costs. So per-request comparison is meaningless and everything must be distributional. It also means a failure may not reproduce, which changes debugging from 'run it again with a breakpoint' to 'you have exactly the trace you captured' - and that raises the value of capturing context, arguments and observations at the time, because there may be no second chance. DIFFERENCE 2 - COST IS A FIRST-CLASS SIGNAL. An ordinary service's per-request cost is roughly constant and small enough to ignore in monitoring. An agent's varies by orders of magnitude across requests and is heavy-tailed, so cost belongs beside latency as a primary metric with percentiles and caps. Very little general observability tooling treats cost this way, which is the main practical gap. DIFFERENCE 3 - CORRECTNESS IS UNOBSERVABLE. A service returns 200 or 500. An agent returns a fluent, plausible answer whether or not it is right, so there is no status code for wrongness. That is the deepest difference: everything else can be measured directly, and quality can only be proxied - by self-consistency, by user behaviour like rephrasing and undoing, by sampled human review, and by whatever verifiable sub-steps you managed to build in. WHAT FOLLOWS PRACTICALLY. Capture more per request than you would for a service, because reproduction is unreliable and the context is the evidence. Report distributions rather than means for latency, cost and step count. Treat cost as a monitored, capped and alerted quantity. Build verifiability into the tasks wherever possible, since a checkable sub-step is the only thing that behaves like a status code. And keep a standing human review of sampled trajectories, because the unobservable dimension is the one that matters most and no metric substitutes for looking. THE FRAMING I WOULD OFFER: agent observability is ordinary observability plus a cost axis plus an admission that the quality axis is only ever sampled. Teams that bring service-monitoring habits without those two adjustments end up with a green dashboard over a system that is expensive and wrong."
        },
        {
          "q": "How does this lesson fit the module?",
          "a": "IT SUPPLIES THE INSTRUMENTATION EVERY OTHER LESSON ASSUMED, and it produces one finding of its own that follows the module's pattern exactly. WHAT IT SUPPLIES. The ladder in 21-01 needed per-configuration measurement. The frontier in 21-04 needed plan-call counts. The crossovers in 21-06 needed per-agent attribution. The rubrics in 21-07 needed step-level traces to score. All of those are trivial with spans and impossible without them - which is why this lesson sits where it does rather than as an appendix, and why the instrumentation decision has to be made before you know which question you will ask. THE FINDING IN THE MODULE'S SHAPE: latency and cost bottleneck at DIFFERENT STEPS. That is the same structure as everything else here - a quantity everyone treats as one thing ('the agent is slow and expensive') decomposing into two with different locations and different fixes. And the same consequence follows: an aggregate points at neither, so the optimization effort has an even chance of landing on the wrong step. THE SECOND FINDING is a silent failure, which is this curriculum's recurring villain. Quadratic history handling produces no error, behaves correctly, and costs a multiple that grows with trajectory length - 3.1 times at forty steps and worse beyond. It survives development because it is invisible at ten steps, and it is caught by one plot of input tokens against step index. THE THIRD is the one that changes a policy argument rather than an engineering one. The standard objection to cost caps is that they trade quality for money; the measurement shows the cap cut the maximum thirty-fold and total spend by a third with the MEDIAN UNCHANGED, because the distribution is heavy-tailed and the typical run was never near the limit. That is a case where measuring the shape of a distribution, rather than its average, resolves a disagreement that could otherwise run indefinitely on intuition. AND THE HONESTY NOTE that the module would want stated: the dollar figures are illustrative. What transfers is the shapes - quadratic growth, linear cache benefit, heavy tail - and those hold regardless of the price list, the provider, or the year. Teaching the shape rather than the number is the difference between a lesson that ages and one that does not, which is the same reasoning behind preferring mechanisms and regimes to benchmark results throughout this module."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Latency and cost bottleneck at DIFFERENT steps",
        "back": "Latency concentrates in TOOL/NETWORK calls; cost concentrates in LLM calls with large token counts. \"Optimize the slow part\" and \"optimize the expensive part\" point elsewhere — and one aggregate points at neither."
      },
      {
        "type": "formula",
        "front": "★ Naive history handling is QUADRATIC",
        "back": "Σ i·w ≈ n²w/2 vs windowed n·W; ratio ≈ n/(2W). Measured 3.1× at n=40. Fine at 10 steps, expensive at 40, untenable at 200 — and it produces NO error. The agent works and costs a multiple."
      },
      {
        "type": "intuition",
        "front": "The one-plot diagnostic",
        "back": "Input tokens per step vs step index. A RISING LINE is the quadratic bug; a flat line means the window is managed. First thing to check on any agent cost investigation."
      },
      {
        "type": "formula",
        "front": "Caching is linear in hit rate",
        "back": "cost = (1−h)·uncached, so h=0.8 → 20%. Agent traffic caches unusually well (system prompt, tool schemas, early history repeat identically) — but the STABLE part must come FIRST."
      },
      {
        "type": "pitfall",
        "front": "What silently destroys the cache",
        "back": "A timestamp, request id, or non-deterministic tool-schema ordering at the TOP of the prompt. Prefix caching needs a stable prefix — the symptom is a several-fold cost increase with identical behaviour and no functional signal."
      },
      {
        "type": "formula",
        "front": "★ The cap argument, settled by measurement",
        "back": "$0.50 per-run cap: max $15.50 → $0.50, total spend −34%, **MEDIAN RUN UNCHANGED**. The objection \"a cap degrades quality\" fails for the typical request — it was never near the limit."
      },
      {
        "type": "intuition",
        "front": "Runaway runs are CONFUSED runs",
        "back": "Retry storms against a failing tool, repeated identical actions, a stopping condition never satisfied. The cap usually removes spend on FAILURES rather than truncating successes — which inverts the standard objection."
      },
      {
        "type": "formula",
        "front": "Tails govern UX",
        "back": "p95 latency = 3.8× p50. Report and alert on PERCENTILES — a mean latency describes an experience no user has. A timeout is a cap on the latency tail, and the tail is what people remember."
      },
      {
        "type": "pitfall",
        "front": "★ Log what was IN the context",
        "back": "Not just the response. Almost every agent post-mortem reduces to \"was the fact present at that point?\" — unanswerable afterwards unless recorded. And agent failures often don't reproduce, so there may be no second chance."
      },
      {
        "type": "intuition",
        "front": "What to alert on",
        "back": "Budget-exhaustion rate (deeper traffic / flakier tool / wandering policy) · cost + latency at p95 · CACHE HIT RATE · error rate BY TOOL · step-count tail · input tokens per step. Not means, not drifting thresholds."
      },
      {
        "type": "intuition",
        "front": "How agent observability differs from a service",
        "back": "NON-DETERMINISM (per-request comparison meaningless; failures may not reproduce) · COST is a first-class heavy-tailed signal · and CORRECTNESS is unobservable — there is no status code for wrongness, only proxies and sampling."
      },
      {
        "type": "intuition",
        "front": "The prices are illustrative; the SHAPES transfer",
        "back": "Quadratic growth, linear cache benefit, heavy tail. Those hold regardless of provider, price list or year — which is why the shape is the lesson and the number is not."
      }
    ],
    "refs": [
      {
        "title": "Sigelman et al. (2010), Dapper: A Large-Scale Distributed Systems Tracing Infrastructure",
        "url": "https://research.google/pubs/pub36356/"
      },
      {
        "title": "Dean & Barroso (2013), The Tail at Scale",
        "url": "https://research.google/pubs/pub40801/"
      },
      {
        "title": "OpenTelemetry, Traces and Spans",
        "url": "https://opentelemetry.io/docs/concepts/signals/traces/"
      },
      {
        "title": "Anthropic, Prompt Caching Documentation",
        "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
      },
      {
        "title": "Kapoor et al. (2024), AI Agents That Matter (cost-controlled evaluation)",
        "url": "https://arxiv.org/abs/2407.01502"
      }
    ],
    "demos": [
      "kv-cache",
      "kv-cache-eviction",
      "tokenizer",
      "react-agent"
    ]
  }
};
