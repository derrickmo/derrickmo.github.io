// GENERATED from content/lessons/frontier-frameworks/provider-apis.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/provider-apis/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "provider-apis": {
    "level": "core",
    "body": {
      "intuition": [
        "Almost nothing in this lesson is about machine learning. Retries with exponential backoff and jitter, token-bucket rate limiting, idempotency keys and streaming responses are distributed-systems client engineering that predates language models by decades. That is precisely why they are worth learning here: the provider, the model and the endpoint will all change, and a correctly built client will keep working against whatever replaces them.",
        "The measurements show how much these mechanisms are worth. Against an endpoint failing 30% of the time, a naive client succeeded 71.3% of the time end to end; with exponential backoff and jitter it reached 99.7%, against a theoretical ceiling of 99.76% set by five consecutive failures. A token bucket took a 100-call burst from 95 rejections to zero. Streaming reached first output in 0.25 seconds against 1.43 for the complete response - 5.7 times sooner - and because prefill is roughly constant while total time grows with output length, streaming wins MORE on long replies, not less.",
        "The two genuinely LLM-specific facts are worth separating from the general engineering. OUTPUT tokens dominate spend, so cost control is mostly about controlling how much the model says rather than how much you send it. And idempotency interacts with billing in a way most APIs do not: three retries of a generation are three billable generations unless the key deduplicates them, at which point they become one. Retrying is the standard fix for flakiness and it is also, without a key, a way to pay three times for one answer."
      ],
      "math": [
        {
          "h": "Retries against independent failures",
          "paras": [
            "If each attempt fails independently, end-to-end success is one minus the probability that all attempts fail.",
            "That gives both the gain and the ceiling."
          ],
          "tex": "P_{\\text{success}} = 1 - p_{\\text{fail}}^{\\,n+1}: \\quad 0.713 \\;\\xrightarrow{\\;4\\text{ retries}\\;}\\; 0.997, \\qquad \\text{ceiling } 1 - 0.3^5 = 0.9976",
          "texNote": "The measured 99.7% sits essentially at the analytic ceiling, which tells you the retry policy is extracting nearly everything available. The assumption doing the work is INDEPENDENCE - retries help against transient failures and do nothing against a provider outage, where every attempt fails together. That is why retry budgets and circuit breakers exist: past a point, retrying a systematically failing dependency adds load without adding success."
        },
        {
          "h": "The rate-limit mismatch that produces surprise 429s",
          "paras": [
            "Your token bucket and the provider's limiter may implement different models.",
            "A bucket that allows bursts can exceed a sliding-window cap even while respecting its own average rate."
          ],
          "tex": "\\text{bucket: rate } r,\\ \\text{capacity } c \\quad\\text{vs}\\quad \\text{provider: } \\le N \\text{ per window} \\;\\Rightarrow\\; \\text{burst } c + \\text{refills in-window} > N",
          "texNote": "Setting capacity to 1 removes bursting, and setting the rate below the cap - 4 against a limit of 5 - leaves a safety margin for clock skew and in-flight requests. Without that margin the measured configuration still produced 8 rejections, because a burst plus refills landing inside the same window momentarily exceeded the sliding cap. The general lesson is that a client-side limiter must be conservative relative to a server-side one whose exact model you cannot see."
        },
        {
          "h": "Streaming changes which latency you are measuring",
          "paras": [
            "Prefill is roughly constant; generation time grows with the number of output tokens.",
            "So time-to-first-token is nearly flat while total time is not."
          ],
          "tex": "T_{\\text{total}} \\approx t_{\\text{prefill}} + N\\,t_{\\text{token}} \\quad (1.43\\ \\text{s}), \\qquad \\mathrm{TTFT} \\approx t_{\\text{prefill}} \\quad (0.25\\ \\text{s}) \\;\\Rightarrow\\; 5.7\\times",
          "texNote": "Because only the total grows with N, streaming's advantage INCREASES with response length - the opposite of the intuition that it is a small constant improvement. The consequence for measurement is that in a streaming product, mean total latency describes something no user experiences; TTFT and inter-token latency are the numbers that correspond to the experience."
        }
      ],
      "code": [
        {
          "h": "The four client mechanisms, with what each measured",
          "paras": [
            "None of these are LLM-specific, which is exactly why they will outlast the API."
          ],
          "code": "# 1. RETRIES - exponential backoff WITH JITTER\n#      30%-flaky endpoint:  71.3%  ->  99.7%   (ceiling 1-0.3^5 = 99.76%)\ndelay = min(base * 2**attempt, cap) * random()   # ★ jitter, not fixed\n#    ★ RETRY ONLY TRANSIENT failures - 429, 5xx, timeouts. Retrying a\n#      400 is guaranteed waste: the request was malformed and will be\n#      malformed again.\n#    ★ JITTER beats the thundering herd: without it, every client that\n#      failed at the same moment retries at the same moment.\n#    ⚠ AND THE ASSUMPTION: retries help against INDEPENDENT failures.\n#      In a provider outage every attempt fails together, so retrying\n#      adds load without adding success -> retry budgets, circuit\n#      breakers.\n\n# 2. RATE LIMITING - token bucket, client side\n#      100-call burst:  95 rejected  ->  0 rejected\n#    ★ THE SUBTLE PART, and it cost 8 rejections before it was fixed:\n#      YOUR bucket and THEIR limiter may implement different models. A\n#      bucket with capacity>1 can burst, and burst + refills landing in\n#      the SAME window momentarily exceeds a SLIDING-WINDOW cap even\n#      though the average rate is legal.\n#      FIX: capacity = 1 (no burst) and rate BELOW the cap (4 vs 5) as\n#      a margin for clock skew and in-flight requests.\n\n# 3. STREAMING - TTFT 0.25s vs full 1.43s = 5.7x sooner\n#    ★ prefill is ~CONSTANT, total grows LINEARLY with output length,\n#      so streaming wins MORE on long replies - not a fixed small gain.\n\n# 4. IDEMPOTENCY KEY - and this one is about MONEY\n#      3 retries + key  ->  1 billable generation (replayed from cache)\n#      3 retries, no key ->  3 billable generations\n#    Retrying is the standard fix for flakiness AND a way to pay three\n#    times for one answer.",
          "caption": "Four mechanisms from ordinary distributed-systems practice — and the idempotency one is the only place where a retry policy shows up on the invoice."
        },
        {
          "h": "Cost, tails, and the virtual clock that made this testable",
          "paras": [
            "Two production facts and one methodological trick worth stealing."
          ],
          "code": "# COST: OUTPUT tokens dominate spend. So cost control is mostly about\n# controlling how much the model SAYS - max_tokens, stop sequences,\n# asking for structure rather than prose - not about trimming prompts.\n# (Prompt length is a LATENCY lever via prefill; output is the money.)\n\n# ★ LATENCY: p50 1.14s, p95 2.00s - and the BACKOFF WAITS LIVE IN THE\n#   TAIL. So the retry policy that took success from 71.3% to 99.7%\n#   also made p95 worse. That is a real trade, and it is invisible if\n#   you only report the mean:\n#     retries      -> success UP, tail latency UP\n#     more retries -> diminishing success, worsening tail\n#   Set a retry BUDGET and a deadline, not just a max attempt count.\n\n# ★ THE METHODOLOGICAL TRICK: a VIRTUAL CLOCK. Backoff logic is\n#   normally painful to test because correct code SLEEPS - so tests are\n#   slow, or you shorten the delays and test something else.\n#   With a virtual clock, time advances on demand:\nclock.advance(delay)      # no real sleeping\n#   -> the backoff arithmetic is EXACT and the suite runs instantly.\n#   Any time-dependent policy - retries, rate limits, timeouts,\n#   circuit breakers, caches - is testable this way, and most codebases\n#   never do it.\n\n# ⚠ THE WHOLE LESSON USED A MOCK PROVIDER, NO NETWORK. That is what\n#   makes the numbers reproducible and the failure rates exactly known.\n#   It measures CLIENT POLICY, not any provider's real reliability.",
          "caption": "The virtual clock makes backoff arithmetic exact and the tests instant — and it applies to any time-dependent policy, which is why most codebases test these badly."
        }
      ],
      "useCases": [
        "Any application calling a hosted model, where client-side reliability engineering determines the user-visible failure rate more than the provider's uptime does.",
        "Cost control on a deployed product, where output-token limits and idempotent retries are the two largest levers.",
        "Perceived-latency work, where streaming changes both the experience and which metric should be reported.",
        "Testing time-dependent policies - retries, rate limits, timeouts, circuit breakers - which a virtual clock makes exact and fast."
      ],
      "pitfalls": [
        "Retrying every failure. Only transient errors deserve a retry; a 400 was malformed and will be malformed again, so retrying it is guaranteed waste.",
        "Backing off without jitter. Every client that failed at the same moment retries at the same moment, which recreates the load spike that caused the failure.",
        "Assuming retries help in an outage. The gain depends on failures being independent, and in a provider outage every attempt fails together - so retry budgets and circuit breakers are what stop you adding load.",
        "Matching your rate limiter's average to the provider's cap. A burst plus refills inside the same window can exceed a sliding-window limit even at a legal average, which is why capacity of one and a rate below the cap are the safe configuration.",
        "Reporting mean latency in a streaming product. Time-to-first-token and inter-token latency correspond to the experience; the mean total describes something no user has.",
        "Retrying without an idempotency key. Three retries of a generation are three billable generations, and the key is what makes them one.",
        "Ignoring what retries do to the tail. The policy that took success from 71.3% to 99.7% also pushed backoff waits into p95, so success and tail latency trade against each other.",
        "Trimming prompts to save money. Output tokens dominate spend; prompt length is primarily a latency lever through prefill."
      ],
      "connections": [
        {
          "ref": "frontier-frameworks/vllm-inference",
          "text": "What is happening on the other side of the API - prefill versus decode, continuous batching, and why time-to-first-token and inter-token latency have different causes."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The same concerns from the server's perspective, including admission control and the capacity planning that produces the rate limits clients see."
        },
        {
          "ref": "agentic-ai/observability",
          "text": "Where these costs are measured in an agent, including the heavy-tailed spend distribution and why a per-run cap leaves the median untouched."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The general practice - percentiles over means, distributions over point estimates, and alerting on shifts rather than fixed thresholds."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why prefill is roughly constant and generation grows with output length, which is the mechanism behind the streaming result."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What did retries buy against a 30%-flaky endpoint?",
          "a": "End-to-end success from 71.3% to 99.7%, against an analytic ceiling of 99.76% - so the policy extracted nearly everything available."
        },
        {
          "q": "What assumption does that rest on?",
          "a": "Independent failures. In a provider outage every attempt fails together, so retrying adds load without adding success."
        },
        {
          "q": "Which failures should you retry?",
          "a": "Transient ones - 429, 5xx, timeouts. A 400 was malformed and will be malformed again, so retrying it is guaranteed waste."
        },
        {
          "q": "Why jitter?",
          "a": "Without it, every client that failed at the same moment retries at the same moment - recreating the load spike that caused the failure."
        },
        {
          "q": "What did client-side rate limiting do?",
          "a": "Took a 100-call burst from 95 rejections to zero, using a token bucket."
        },
        {
          "q": "What is the subtle rate-limit failure?",
          "a": "Your bucket and their limiter may use different models - a burst plus refills inside the same window can exceed a sliding-window cap at a legal average rate."
        },
        {
          "q": "What is the safe configuration?",
          "a": "Capacity of one, so no bursting, and a rate below the cap - four against a limit of five - as margin for clock skew and in-flight requests."
        },
        {
          "q": "What did streaming measure?",
          "a": "Time to first output 0.25 seconds against 1.43 for the full response - 5.7 times sooner."
        },
        {
          "q": "Why does streaming win more on long replies?",
          "a": "Prefill is roughly constant while total time grows with output length, so TTFT stays flat while the thing it is compared against grows."
        },
        {
          "q": "What does an idempotency key do?",
          "a": "Makes three retries one billable generation instead of three, by replaying the cached response rather than generating again."
        },
        {
          "q": "What dominates cost?",
          "a": "Output tokens. Prompt length is primarily a latency lever through prefill; how much the model says is the money."
        },
        {
          "q": "What do retries do to latency?",
          "a": "Push backoff waits into the tail - p95 was 2.00 seconds against a p50 of 1.14, so success and tail latency trade against each other."
        }
      ],
      "standard": [
        {
          "q": "How would you build a production client for a hosted model API?",
          "a": "AS AN ORDINARY DISTRIBUTED-SYSTEMS CLIENT, because almost none of what makes it reliable is machine-learning specific - and that is what makes the work durable across providers and models. MECHANISM 1 - RETRIES with exponential backoff and jitter. Against an endpoint failing 30% of the time, a naive client succeeded 71.3% end to end; with retries it reached 99.7%, essentially at the analytic ceiling of one minus 0.3 to the fifth. Two rules make this correct rather than harmful. Retry only TRANSIENT failures - 429, 5xx, timeouts - because a 400 was malformed and will be malformed again, so retrying it is guaranteed waste and adds load. And use JITTER, because without it every client that failed at the same instant retries at the same instant, recreating the spike that caused the failure. MECHANISM 2 - CLIENT-SIDE RATE LIMITING with a token bucket, which took a 100-call burst from 95 rejections to zero. The subtle part cost 8 rejections before it was found: your limiter and the provider's may implement DIFFERENT MODELS. A bucket with capacity above one can burst, and a burst plus refills landing inside the same window can exceed a sliding-window cap even though the average rate is legal. The safe configuration is capacity one - no bursting - and a rate below the published cap, four against five, as margin for clock skew and requests already in flight. MECHANISM 3 - STREAMING, which reached first output in 0.25 seconds against 1.43 for the complete response. The mechanism matters: prefill is roughly constant while total time grows with output length, so streaming's advantage INCREASES with reply length rather than being a fixed small gain. It also changes which metric is meaningful - in a streaming product, mean total latency describes an experience nobody has, and TTFT plus inter-token latency are the numbers that correspond to what users feel. MECHANISM 4 - IDEMPOTENCY KEYS, which is the one place this differs from a typical API because generation is expensive. Three retries with a key is one billable generation, replayed from cache; without a key it is three. So the standard fix for flakiness is also, unguarded, a way to pay three times for one answer. THE TRADE I WOULD MAKE EXPLICIT: retries improve success and worsen the TAIL, because backoff waits land in p95 - measured at 2.00 seconds against a p50 of 1.14. So I would set a retry BUDGET and an overall DEADLINE rather than only a maximum attempt count, and report both success rate and p95 rather than choosing whichever looks better. AND THE COST LEVER that is specific to this domain: output tokens dominate spend, so max_tokens, stop sequences and asking for structured rather than prose output are the levers that matter. Trimming prompts is mostly a latency optimization through prefill, not a cost one.",
          "deepDive": {
            "q": "Your provider integration is unreliable and expensive. Walk through fixing it.",
            "a": "I WOULD SEPARATE THE FOUR FAILURE MODES FIRST, because 'unreliable and expensive' is at least four different problems with different fixes and the aggregate hides which. STEP 1 - CLASSIFY THE FAILURES from logs. What fraction are 429 rate limits, 5xx server errors, timeouts, and 4xx client errors? Each has a different response. 429s mean your client-side limiting is wrong or absent. 5xx and timeouts are transient and deserve retries. 4xx are YOUR bug and retrying them is pure waste - and a surprisingly large share of 'flaky provider' reports turn out to be a malformed request being retried repeatedly. STEP 2 - FIX RATE LIMITING, if 429s are present. A token bucket sized conservatively: capacity one to prevent bursting, rate below the published cap. The failure I would specifically look for is the subtle one - a burst plus refills landing inside the same sliding window exceeding the cap at a legal average rate, which produced 8 rejections in the measured setup before the margin was added. If you are running multiple client instances, the limit is shared and each instance needs a fraction of it, which is a common oversight when a service scales horizontally. STEP 3 - FIX RETRIES. Exponential backoff with jitter, transient errors only, with a retry BUDGET and an overall deadline. And check for the pathological case: retries without an idempotency key on a generation endpoint means you are paying for every attempt, so a flaky integration is directly inflating the bill. Adding the key turns three attempts into one billable generation. STEP 4 - ATTACK COST, which is a different investigation. Output tokens dominate spend, so I would look at the output-length distribution first. A tail of very long responses is usually the largest single cost item and it is usually unintended - a missing max_tokens, a prompt that invites rambling, or a model asked for prose where structure would do. Set max_tokens, add stop sequences, and request structured output. Then caching: if requests repeat, prompt caching on the stable prefix is a large linear saving and it requires the stable content to come FIRST in the prompt. Then model selection per request type, since routing simple calls to a smaller model is often the biggest untried saving. STEP 5 - MEASURE THE TAIL, because retries and the fixes above interact. Report p50 and p95 for latency and cost separately, and watch the retry rate as its own metric - a rising retry rate is an early warning that the provider or your request pattern has changed, and it precedes both the reliability and the cost symptoms. WHAT I WOULD BUILD SO THIS IS NOT A ONE-TIME FIX: the virtual-clock test suite. Backoff, rate limiting, timeouts and circuit breakers are all time-dependent, which normally makes them slow to test and therefore untested. With a virtual clock the arithmetic is exact and the suite runs instantly, so these policies can have real tests rather than hopeful ones - and in my experience that is the difference between a client that is correct and one that has never been exercised at its edges."
          }
        },
        {
          "q": "How do you rate-limit correctly against a limit you cannot see?",
          "a": "CONSERVATIVELY, BECAUSE YOUR MODEL OF THEIR LIMITER IS A GUESS - and the measured failure shows how a reasonable-looking configuration still gets rejected. THE MECHANISM YOU CONTROL: a token bucket. Tokens accumulate at a fixed rate up to a capacity; each request consumes one; if none are available, you wait. It is simple, it is standard, and it took a 100-call burst from 95 rejections to zero. THE MISMATCH THAT BITES. A token bucket with capacity greater than one permits BURSTS - you can spend accumulated tokens quickly. Many server-side limiters use a SLIDING WINDOW instead, counting requests over a trailing period. Those two models disagree: a burst that spends the bucket, plus refills arriving inside the same window, can put more requests in that window than the cap allows, even though your average rate is legal. That is exactly what produced 8 rejections in the measured setup before the margin was added, and it is the reason a client that 'respects the rate limit' still sees 429s. THE SAFE CONFIGURATION: capacity of one, which removes bursting entirely, and a rate BELOW the published cap - four against a limit of five. The margin covers clock skew between you and the provider, requests already in flight when you count, and any difference between your model of their limiter and its actual behaviour. Giving up a fifth of nominal throughput to eliminate rejections is usually a good trade, because a rejection costs a round trip and a retry anyway. WHAT ELSE COMPLICATES IT IN PRODUCTION. Multiple client instances share one limit, so each needs a fraction - and a service that scales horizontally silently multiplies its request rate unless the limiter is coordinated or the per-instance rate is divided. Limits are often per-model and per-key, and sometimes on tokens per minute rather than requests, in which case you must estimate token counts before sending. Limits change without notice. And headers frequently report your remaining quota, which is far better information than your own model - if the provider tells you, use that rather than inferring. THE COMPLEMENTARY MECHANISM: handle 429s gracefully anyway, with backoff that respects a Retry-After header when one is provided. Client-side limiting reduces rejections; it does not eliminate them, because your model can always be wrong. AND THE GENERAL PRINCIPLE: when you must respect a constraint enforced by a system whose internals you cannot observe, be strictly more conservative than the stated limit and treat rejections as a signal that your model is wrong rather than as noise to retry through. That applies well beyond rate limits - it is the same reasoning as leaving headroom on any capacity you do not control."
        },
        {
          "q": "What does streaming change, beyond feeling faster?",
          "a": "IT CHANGES WHICH LATENCY IS THE PRODUCT'S LATENCY, and that reframing has consequences for measurement, for architecture and for cost. THE MEASUREMENT: first output at 0.25 seconds against 1.43 for the complete response - 5.7 times sooner. THE MECHANISM, which is the part worth internalizing: prefill is roughly constant for a given prompt, while total generation time grows linearly with the number of output tokens. So time-to-first-token is nearly flat in response length while total time is not - which means streaming's advantage GROWS with reply length rather than being a fixed small improvement. A long response is exactly where streaming matters most, which is the opposite of the intuition that it is a nicety for short interactions. WHAT IT CHANGES ABOUT MEASUREMENT. In a streaming product, mean total latency describes something no user experiences - they experienced the first token quickly and then a stream. The metrics that correspond to the experience are TTFT and INTER-TOKEN latency, and they have different causes: TTFT is prefill plus queueing, inter-token latency is decode plus scheduling interference from other requests. A system can be excellent on one and unacceptable on the other, and a single latency number describes neither. I would report both at p95. WHAT IT CHANGES ABOUT ARCHITECTURE. The client must handle a partial response - rendering incrementally, handling a mid-stream error, and deciding what to do if the user navigates away. Anything that needs the COMPLETE output before acting - validating a JSON structure, running a guardrail on the finished text, executing a tool call - cannot start until the stream ends, so streaming buys nothing for those paths and adds complexity. That is a real design consideration: streaming helps where a human reads the output progressively and helps very little where a program consumes it whole. WHAT IT CHANGES ABOUT CANCELLATION, which is a cost lever people miss. With streaming you can stop generation when the user navigates away or interrupts, which stops the meter. Without it you pay for the whole response whether or not anyone reads it. In an interactive product with a meaningful abandonment rate, that is a real saving and it requires the cancellation to actually propagate. AND WHAT IT DOES NOT CHANGE: total throughput, total cost per completed response, or the underlying generation speed. It is a latency-perception and cancellation mechanism, not a performance one - so if the complaint is 'the system is slow' in the sense of total time, streaming addresses how it feels rather than what it costs, and both are legitimate targets as long as you are clear which one you are hitting."
        },
        {
          "q": "What is the virtual clock, and why does it matter?",
          "a": "IT IS A TEST-TIME REPLACEMENT FOR REAL TIME, AND IT MAKES A WHOLE CATEGORY OF LOGIC TESTABLE THAT OTHERWISE IS NOT. THE PROBLEM. Backoff, rate limiting, timeouts, circuit breakers and cache expiry are all time-dependent, and correct implementations SLEEP. So a faithful test of an exponential backoff policy with a few retries takes tens of seconds, and a full suite becomes unusably slow. The two usual responses are both bad: shorten the delays for tests, which means you are testing different code from what runs in production, or skip the tests, which is what most codebases do - leaving the exact logic that only executes during incidents completely unexercised. THE FIX: inject the clock. The policy asks a clock object for the current time and calls a sleep on it, and in tests that object advances instantly on demand. The backoff arithmetic is then EXACT - you can assert that the third retry waited precisely the intended interval - and the suite runs in milliseconds. WHAT IT LETS YOU TEST that otherwise goes untested. That the delay sequence is what you designed, including the cap. That jitter is within its intended bounds and is actually random rather than accidentally fixed. That the retry budget and the overall deadline are respected, and which one binds first. That the rate limiter's tokens refill correctly across a window boundary - which is exactly where the sliding-window mismatch lives. That a circuit breaker opens after the right number of failures and half-opens after the right interval. And that a timeout fires at the timeout rather than at a value someone changed six months ago. WHY IT MATTERS DISPROPORTIONATELY HERE. All of this logic runs only when things are going wrong, so bugs in it are discovered during incidents, which is the worst possible time. A retry policy with an off-by-one that turns four attempts into forty, a rate limiter that fails to refill across a boundary, a circuit breaker that never closes again - each is a small bug with a large blast radius and each is invisible in normal operation. THE GENERAL PRACTICE, which is worth stealing regardless of what you are building: make time an INPUT rather than an ambient fact. Anything the code reads from the environment - time, randomness, the filesystem, network - is a dependency, and injecting it is what turns untestable behaviour into testable behaviour. Randomness gets the same treatment here, since jitter is only assertable if the source is controllable. AND IT IS WHY THE MEASUREMENTS IN THIS LESSON ARE EXACT: with a mock provider and a virtual clock, the failure rate is known by construction and the backoff arithmetic is not approximated. The numbers describe CLIENT POLICY precisely rather than describing one afternoon's experience of a real endpoint, which is a much more useful thing to have measured."
        },
        {
          "q": "How would you control the cost of a provider-based product?",
          "a": "BY ATTACKING OUTPUT TOKENS FIRST, because they dominate spend - which makes most prompt-trimming efforts a latency optimization dressed as a cost one. LEVER 1 - OUTPUT LENGTH, the largest by a distance. Look at the output-length DISTRIBUTION rather than the mean; the tail is usually where the money is and it is usually unintended. Set max_tokens as a hard bound. Add stop sequences. Ask for structured output rather than prose, which is shorter and more useful downstream. And check the prompt for language that invites rambling - 'explain in detail' costs real money at volume. LEVER 2 - CACHING, which is linear in hit rate and unusually effective for this workload because prompts repeat. Prompt caching on a stable prefix requires the stable content to come FIRST - a timestamp or request id at the top of the system prompt silently destroys the hit rate, and the only symptom is a several-fold cost increase with identical behaviour. Response caching for exactly repeated requests is even cheaper where the workload allows it. LEVER 3 - MODEL ROUTING. Not every request needs the largest model. Classifying request difficulty and routing the simple majority to a smaller one is often the biggest untried saving in a mature product, and it is measurable: run both on a sample and compare quality on the routed subset rather than overall. LEVER 4 - IDEMPOTENCY, which is a correctness fix with a billing consequence. Retries without a key mean paying for every attempt, so an unreliable integration inflates the bill in proportion to its flakiness - three retries become three generations. With a key they become one. LEVER 5 - CANCELLATION, if streaming. Stopping generation when a user abandons stops the meter, and in an interactive product with real abandonment that is a genuine saving. It requires the cancellation to propagate, which is easy to omit. WHAT I WOULD MEASURE to drive all of this: cost per request at p50 and p95, because the distribution is heavy-tailed and the mean is set by the tail; cost broken down by request type, which usually reveals one category consuming most of the budget; cache hit rate, monitored so a prompt change cannot silently destroy it; and the output-length distribution. AND THE ONE I WOULD SET AS A GUARDRAIL rather than an optimization: a per-request and per-user cost cap. As the agent observability lesson measured, cost distributions are heavy-tailed enough that a cap removes the runaway tail while leaving the median run untouched - so it bounds exposure without degrading the typical request. That is the difference between a cost you can state and one that depends on a behaviour you do not control."
        },
        {
          "q": "How does this lesson fit the module?",
          "a": "IT IS THE MOST EXPLICIT CASE OF THE MODULE'S THESIS: almost none of this is about machine learning, and that is exactly why it lasts. Exponential backoff with jitter, token-bucket rate limiting, idempotency keys and streaming are distributed-systems client engineering with decades of history. The provider will change, the model will change, the endpoint and the SDK will change - and a client built on these mechanisms keeps working, because the mechanisms are answers to properties of networks rather than properties of language models. WHAT IS ACTUALLY LLM-SPECIFIC, and it is worth isolating because it is small: OUTPUT tokens dominate cost, which inverts the usual instinct to trim inputs; and idempotency interacts with BILLING, because a generation is expensive enough that paying three times for a retried request is a real line item rather than a rounding error. Everything else transfers from any API client you have written. THE MEASUREMENTS give the mechanisms weight rather than leaving them as advice: 71.3% to 99.7% from retries, 95 rejections to zero from a token bucket, 5.7 times sooner from streaming. And each comes with its condition - retries assume INDEPENDENT failures and do nothing in an outage; the rate limiter needs a MARGIN because your model of the provider's limiter is a guess; streaming's gain GROWS with output length rather than being fixed. THE TRADE-OFF THAT GETS HIDDEN is worth carrying: the retry policy that took success to 99.7% also pushed backoff waits into p95. Success and tail latency trade against each other, and reporting only the one that improved is the flattering version. That is the same habit this module applied to compile-time benchmarks and to quantization accuracy - report the number that could embarrass the technique. AND THE METHODOLOGICAL CONTRIBUTION, which I would rank alongside the content: the virtual clock. Time-dependent policies are normally untested because faithful tests are slow, so the logic that runs only during incidents is the least exercised code in the system. Injecting the clock makes the arithmetic exact and the suite instant. It is a small technique, it applies to anything with a timeout or a delay, and most codebases never do it - which makes it a good example of the kind of durable, transferable practice this module is trying to leave behind."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Almost none of this is ML",
        "back": "Backoff+jitter, token buckets, idempotency keys, streaming — distributed-systems client engineering predating LLMs by decades. The provider, model and SDK will change; a client built on these keeps working. THAT is why it's here."
      },
      {
        "type": "formula",
        "front": "Retries against a 30%-flaky endpoint",
        "back": "P = 1 − p_fail^(n+1): **71.3% → 99.7%**, ceiling 1 − 0.3⁵ = 99.76% — so the policy extracted nearly everything available. Assumption doing the work: INDEPENDENT failures."
      },
      {
        "type": "pitfall",
        "front": "Retries do nothing in an OUTAGE",
        "back": "Every attempt fails together, so retrying adds load without adding success — hence retry BUDGETS and circuit breakers. And retry only TRANSIENT errors: a 400 was malformed and will be malformed again."
      },
      {
        "type": "intuition",
        "front": "Why jitter",
        "back": "Without it, every client that failed at the same instant retries at the same instant — recreating the load spike that caused the failure. delay = min(base·2^n, cap) × random()."
      },
      {
        "type": "formula",
        "front": "★ The subtle 429 source",
        "back": "YOUR token bucket and THEIR limiter may use different models. A burst (capacity>1) plus refills landing in the SAME window exceeds a SLIDING-WINDOW cap even at a legal average rate. Cost 8 rejections before the margin was added."
      },
      {
        "type": "intuition",
        "front": "The safe rate-limit configuration",
        "back": "capacity = 1 (no bursting) and rate BELOW the cap (4 vs 5) as margin for clock skew and in-flight requests. Also: multiple instances SHARE the limit, and if headers report remaining quota, trust that over your own model."
      },
      {
        "type": "formula",
        "front": "★ Streaming wins MORE on long replies",
        "back": "T_total ≈ t_prefill + N·t_token (1.43 s) but TTFT ≈ t_prefill (0.25 s) = 5.7×. Prefill is ~constant, total grows with N — so the advantage GROWS with response length, not a fixed small gain."
      },
      {
        "type": "intuition",
        "front": "Streaming changes which metric is real",
        "back": "Mean total latency describes an experience nobody has. Report TTFT (prefill + queueing) and INTER-TOKEN latency (decode + interference) separately at p95 — different causes, different fixes."
      },
      {
        "type": "pitfall",
        "front": "Retries show up on the INVOICE",
        "back": "3 retries without an idempotency key = 3 billable generations. With a key = 1, replayed from cache. The standard fix for flakiness is also, unguarded, a way to pay three times for one answer."
      },
      {
        "type": "pitfall",
        "front": "★ Retries worsen the TAIL",
        "back": "The policy that took success 71.3% → 99.7% pushed backoff waits into p95 (2.00 s vs p50 1.14 s). Success and tail latency TRADE. Set a retry budget AND a deadline — and report both numbers, not the flattering one."
      },
      {
        "type": "intuition",
        "front": "OUTPUT tokens dominate cost",
        "back": "So cost control is about how much the model SAYS — max_tokens, stop sequences, structured output — not about trimming prompts. Prompt length is primarily a LATENCY lever via prefill."
      },
      {
        "type": "intuition",
        "front": "★ The virtual clock",
        "back": "Correct backoff code SLEEPS, so faithful tests are slow — and this logic runs ONLY during incidents, making it the least-exercised code you own. Inject the clock: arithmetic exact, suite instant. Applies to retries, rate limits, timeouts, breakers, caches."
      }
    ],
    "refs": [
      {
        "title": "AWS Architecture Blog, Exponential Backoff and Jitter",
        "url": "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/"
      },
      {
        "title": "Google SRE Book, Handling Overload",
        "url": "https://sre.google/sre-book/handling-overload/"
      },
      {
        "title": "Stripe API, Idempotent Requests",
        "url": "https://docs.stripe.com/api/idempotent_requests"
      },
      {
        "title": "Anthropic, API Rate Limits",
        "url": "https://docs.anthropic.com/en/api/rate-limits"
      },
      {
        "title": "Dean & Barroso (2013), The Tail at Scale",
        "url": "https://research.google/pubs/pub40801/"
      }
    ],
    "demos": [
      "batching",
      "kv-cache",
      "decoding",
      "tokenizer"
    ],
    "demoTitles": {
      "batching": "Dynamic Batching",
      "kv-cache": "KV Cache",
      "decoding": "Decoding Strategies",
      "tokenizer": "Tokenizer Lab"
    }
  }
};
