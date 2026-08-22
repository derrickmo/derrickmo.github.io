// GENERATED from content/lessons/agentic-ai/tool-calling.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/agentic-ai/tool-calling/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "tool-calling": {
    "level": "core",
    "body": {
      "intuition": [
        "Tool calling is usually discussed as one capability and it is three, with three different failure modes and three different fixes. SELECTION is choosing the right tool, and it is a classification problem. FORMATTING is emitting something that parses and matches the schema, and it is a decoding problem. ARGUMENTS is putting sensible VALUES in the fields, and it is a reasoning problem. A single 'tool call success rate' averages over all three and tells you almost nothing about which one is broken.",
        "Separating them immediately produces useful results. Selection turns out to be easy enough that a tiny bag-of-words classifier reaches perfect accuracy on a task where guessing the most common tool gets 0.194 - which means you do not need a large model to route, and it also means selection errors are usually a symptom of tool DESCRIPTIONS being confusable rather than of the model being weak. Formatting is solved by construction: constrained decoding takes a parse rate of 0.722 to 1.000, because a grammar makes invalid output unreachable.",
        "The third one is where the honest caveat lives, and it is the reason this lesson exists as a measurement rather than a recipe. Constraining the format guarantees the JSON parses; it says nothing about whether the values are right. Validation catches the structurally wrong ones - every broken call in the measured set, with no false rejections - and the effect on end-to-end correctness is exactly zero. Correctness stayed at 0.57. What validation bought was that about a tenth of calls became clean retryable REJECTIONS instead of crashes. That is a real and valuable thing, and it is not what people usually think validation is for."
      ],
      "math": [
        {
          "h": "One number hiding three",
          "paras": [
            "A usable tool call requires all three to go right, so the observed rate is a product.",
            "Reporting the product alone makes the failing factor invisible."
          ],
          "tex": "P(\\text{good call}) = \\underbrace{P(\\text{right tool})}_{\\text{classification}} \\cdot \\underbrace{P(\\text{parses \\& matches schema})}_{\\text{decoding}} \\cdot \\underbrace{P(\\text{sensible arguments})}_{\\text{reasoning}}",
          "texNote": "Each factor has its own fix: selection improves with clearer descriptions or a dedicated router, formatting is solved by constrained decoding, arguments improve with better context and are the hardest of the three. A team seeing 0.6 end-to-end and blaming the model may have a 0.99 x 0.72 x 0.85 problem, where the cheap decoding fix is worth more than any model change."
        },
        {
          "h": "Constrained decoding makes validity a DEFINITION",
          "paras": [
            "A grammar makes invalid output unreachable, so the parse rate goes to one by construction.",
            "The quantity that can still move is correctness GIVEN validity."
          ],
          "tex": "0.722 \\;\\xrightarrow{\\text{grammar-constrained}}\\; 1.000 \\;\\;\\text{(parse rate)}, \\qquad \\text{movable: } P(\\text{correct} \\mid \\text{valid})",
          "texNote": "So a reported parse rate of 100% under constrained decoding is not a result - it is what the technique does, and quoting it as evidence of quality is a category error. The measurement that matters is the same one as in 17-09: hold validity fixed and ask whether the CHOICES are right. In the measured setting the format was perfect and selection accuracy was a separate 0.952, which is the number that actually describes the system."
        },
        {
          "h": "What validation actually buys - measured",
          "paras": [
            "A from-scratch schema validator caught every malformed call with no false rejections.",
            "The effect on correctness was nil, and that is the point rather than a disappointment."
          ],
          "tex": "\\text{caught } 72/72,\\;\\; \\text{false rejects } 0, \\qquad \\text{correctness } 0.57 \\to 0.57, \\qquad \\text{crashes} \\to \\text{retryable rejections } (\\approx 10\\%)",
          "texNote": "Validation does not make the agent smarter and it was never going to. What it changes is the CLASS of failure: roughly a tenth of executions that would have been exceptions against a real system became clean rejections the loop can observe and retry. That converts an unrecoverable error into a recoverable one, which is worth a great deal in production and is invisible in an accuracy metric."
        }
      ],
      "code": [
        {
          "h": "The three problems, measured separately",
          "paras": [
            "Each number answers a different question, and the fixes do not overlap."
          ],
          "code": "# 1. SELECTION - a CLASSIFICATION problem, and an easy one.\n#    A tiny bag-of-words router:  test accuracy 1.000\n#    Majority-class baseline:            0.194\n#    ★ TAKEAWAY: you do not need the big model to route. And when\n#      selection DOES fail, suspect the tool DESCRIPTIONS, not the\n#      model - two tools that sound alike are a labelling problem.\n\n# 2. FORMATTING - solved BY CONSTRUCTION.\n#    free-form emission, parsed:         0.722\n#    grammar-constrained:                1.000\n#    ★ CAVEAT (same as 17-09): 1.000 is the DEFINITION of constrained\n#      decoding, not a result. Quoting it as evidence of quality is a\n#      category error. Selection accuracy stayed a separate 0.952 -\n#      THAT is the number describing the system.\n\n# 3. ARGUMENTS - the reasoning problem, and the one that stays hard.\n#    Constrained decoding guarantees the JSON PARSES. It says nothing\n#    about whether \"2024-13-45\" is a date or whether the customer id\n#    belongs to this customer. Different layer, different fix.\n\n# ★ REPORT THEM SEPARATELY or you cannot tell which is failing:\nreport = {\n  \"tool_selection_acc\": ...,   # vs the MAJORITY-CLASS baseline\n  \"schema_valid_rate\":  ...,   # ~1.0 if constrained; else diagnostic\n  \"args_sensible_rate\": ...,   # the honest one - needs judgement\n}\n# A team at 0.6 end-to-end blaming \"the model\" may have a\n# 0.99 x 0.72 x 0.85 problem, where the cheap DECODING fix is worth\n# more than any model change.",
          "caption": "Selection is nearly free, formatting is solved by construction, and arguments are the residual - which is why one averaged number is the least informative thing you can report."
        },
        {
          "h": "Validate before executing - and what it is really for",
          "paras": [
            "The measured effect on correctness is zero. The measured effect on failure CLASS is large."
          ],
          "code": "def step(action, tools):\n    spec = tools.get(action.name)\n    if spec is None:\n        return Obs(error=f\"unknown tool {action.name}; available: {list(tools)}\")\n\n    ok, err = validate(action.args, spec.schema)   # types, required,\n    if not ok:                                     # enums, ranges\n        return Obs(error=err)   # ← an OBSERVATION, not an exception:\n                                #   the loop sees it and RETRIES\n    return spec.fn(**action.args)\n\n# MEASURED: 72/72 broken calls caught, 0 false rejections,\n#           end-to-end correctness 0.57 -> 0.57 (UNCHANGED),\n#           ~10% of executions: crash -> clean retryable rejection.\n#\n# ★ SO WHAT VALIDATION IS ACTUALLY FOR: it does not make the agent\n#   smarter. It changes the CLASS of failure from unrecoverable to\n#   recoverable - and keeps a malformed argument from reaching a real\n#   system. Both are invisible in an accuracy metric, which is why\n#   this gets skipped.\n\n# THE ERROR MESSAGE IS INPUT TO THE NEXT DECISION, not a log line:\n#   BAD : \"validation failed\"\n#   GOOD: \"expected YYYY-MM-DD for `due`, got '03/04/2024'\"\n#   The second makes the retry DIFFER; the first guarantees a repeat.\n\n# AND THE LAYER ABOVE, which validation is NOT: AUTHORIZATION.\n#   valid != permitted. A well-formed delete_account call that passes\n#   every schema check is exactly the call an allowlist must stop.",
          "caption": "Validation's measured contribution is converting crashes into observations the loop can act on — not accuracy, which it left untouched at 0.57."
        }
      ],
      "useCases": [
        "Diagnosing an agent with a mediocre tool-call rate, where splitting the number into selection, formatting and arguments usually localizes the problem in an hour.",
        "Choosing where to spend: a tiny router handles selection cheaply, constrained decoding handles formatting by construction, and only arguments need model quality.",
        "Hardening an agent that touches real systems, where validate-before-execute keeps malformed arguments out and converts crashes into retryable observations.",
        "Designing tool interfaces, where confusable descriptions are the usual cause of selection errors and renaming is the cheapest available fix."
      ],
      "pitfalls": [
        "Reporting one tool-call success rate. It is a product of selection, formatting and argument quality, and the averaged number cannot say which factor is failing.",
        "Quoting a 100% schema-valid rate under constrained decoding as a quality result. Validity is the definition of the technique; the movable quantity is correctness given validity.",
        "Assuming constrained decoding gives sensible arguments. It guarantees the JSON parses and says nothing about whether the values mean anything - a different layer with a different fix.",
        "Expecting validation to improve accuracy. In the measured setting correctness was unchanged at 0.57; what changed was that a tenth of failures became recoverable instead of crashes.",
        "Writing validation errors for logs rather than for the model. 'Validation failed' guarantees an identical retry; naming the expected format makes the next attempt differ.",
        "Confusing valid with permitted. A well-formed destructive call passes every schema check, so authorization is a separate layer that validation does not provide.",
        "Blaming the model for selection errors. Selection is an easy classification problem, so failures usually mean two tool descriptions are confusable and should be renamed or merged.",
        "Adding more tools without re-measuring selection. It is a classifier with more classes and blurrier boundaries, so accuracy degrades as the tool set grows."
      ],
      "connections": [
        {
          "ref": "llm-systems/structured-output",
          "text": "The mechanism behind the formatting result - logit masking, why validity is guaranteed by construction, and the honest caveat that masking is not conditioning."
        },
        {
          "ref": "agentic-ai/agent-loop",
          "text": "Where a validation rejection becomes an observation the loop can act on, and why the error message is input to the next decision rather than a log line."
        },
        {
          "ref": "agentic-ai/mcp",
          "text": "The same typed interface standardized across processes, where dynamic discovery lets a client use a tool that did not exist when it was written."
        },
        {
          "ref": "agentic-ai/agent-security",
          "text": "The layer validation does not provide: valid is not permitted, and a well-formed destructive call is exactly what an allowlist must stop."
        },
        {
          "ref": "supervised-learning/model-comparison",
          "text": "Why the majority-class baseline matters. Selection accuracy of 1.000 is only impressive against the 0.194 that guessing gets."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three separate problems in tool calling?",
          "a": "Selection - which tool; formatting - does it parse and match the schema; arguments - are the values sensible. Three failure modes, three fixes."
        },
        {
          "q": "Why is one tool-call success rate unhelpful?",
          "a": "It is a product of the three, so it cannot say which factor is failing - and the fixes do not overlap."
        },
        {
          "q": "How hard is tool selection?",
          "a": "Easy. A tiny bag-of-words router reached 1.000 against a majority-class baseline of 0.194, so you do not need a large model to route."
        },
        {
          "q": "What does a selection failure usually indicate?",
          "a": "Confusable tool descriptions rather than a weak model. Renaming or merging two similar-sounding tools is the cheapest fix."
        },
        {
          "q": "What does constrained decoding do to the parse rate?",
          "a": "It took 0.722 to 1.000 - by construction, because a grammar makes invalid output unreachable."
        },
        {
          "q": "So why not report that 1.000?",
          "a": "It is the definition of the technique, not a result. The movable quantity is correctness given validity - selection accuracy was a separate 0.952."
        },
        {
          "q": "Does constrained decoding give sensible arguments?",
          "a": "No. It guarantees the JSON parses; it says nothing about whether the values mean anything. That is a different layer."
        },
        {
          "q": "What did the validator measure?",
          "a": "72 of 72 broken calls caught with zero false rejections - and end-to-end correctness unchanged at 0.57."
        },
        {
          "q": "So what did validation buy?",
          "a": "About a tenth of executions became clean retryable rejections instead of crashes against a real system. It changes the failure class, not the accuracy."
        },
        {
          "q": "How should a validation error be written?",
          "a": "For the model, not the log. 'Expected YYYY-MM-DD, got 03/04/2024' makes the retry differ; 'validation failed' guarantees a repeat."
        },
        {
          "q": "Is valid the same as permitted?",
          "a": "No. A well-formed destructive call passes every schema check, which is exactly why authorization is a separate layer."
        },
        {
          "q": "What happens to selection as you add tools?",
          "a": "It degrades - more classes with blurrier boundaries - so selection accuracy needs re-measuring whenever the tool set grows."
        }
      ],
      "standard": [
        {
          "q": "An agent's tool calls fail often. How do you diagnose it?",
          "a": "BY SPLITTING THE ONE NUMBER INTO THREE, because 'tool calls fail' is a product of three independent problems with three non-overlapping fixes, and the averaged rate cannot distinguish them. THE DECOMPOSITION. P(good call) equals P(right tool) times P(parses and matches schema) times P(sensible arguments). Measure each. A team at 0.6 end-to-end blaming the model may have a 0.99 by 0.72 by 0.85 problem, in which case the cheapest decoding change is worth more than any model upgrade - and they would never find that from the aggregate. FACTOR 1, SELECTION, and it is the easiest. Measure tool-choice accuracy against a labelled set, and crucially against the MAJORITY-CLASS baseline - in the measured setting a tiny bag-of-words classifier hit 1.000 where guessing the most common tool got 0.194. Two consequences. First, you do not need a large model to route; a small classifier does it, which is cheaper and faster and more predictable. Second, when selection DOES fail it is almost always because two tool descriptions are confusable, so the fix is renaming, merging or sharpening descriptions rather than anything model-related. And selection degrades as the tool set grows, since it is a classifier with more classes, so this needs re-measuring whenever tools are added. FACTOR 2, FORMATTING, which is solved by construction. Free-form emission parsed 0.722 of the time; grammar-constrained decoding took it to 1.000. If you are not using constrained decoding or a provider's structured-output mode, this is the highest-value change available and it is a configuration rather than a project. THE CAVEAT I would state in the same breath: that 1.000 is the DEFINITION of the technique and not evidence of quality. Reporting it as a result is the same category error as reporting a 100% parse rate for constrained decoding generally. FACTOR 3, ARGUMENTS, which is the residual and the hard one. The JSON parses and the fields are the right types, and the values are still wrong - a date that does not exist, an id belonging to another record, a filter that means something different from what the user asked. This is a reasoning problem and it responds to better context, better tool descriptions that say what a field MEANS, enums instead of free strings, and examples. It is also the factor that needs human judgement to measure, which is why it gets skipped. WHAT I WOULD DO WITH THE RESULT. If selection is low, fix descriptions. If formatting is low, turn on constrained decoding. If arguments are low, work on context and schema design - and consider whether the schema even lets the model express uncertainty, because a required field with no legal 'unknown' guarantees invention. AND THE SEPARATE LAYER that this diagnosis does not cover: authorization. Every factor above can be perfect and the call can still be one the agent should not be permitted to make.",
          "deepDive": {
            "q": "Design the tool interface for an agent, and justify each choice.",
            "a": "I WOULD DESIGN IT AS AN API FOR A CAPABLE BUT CONTEXT-POOR CALLER, and justify each choice against the three factors, because every design decision moves one of them. FOR SELECTION. Few tools, sharply distinguished - selection accuracy is high when the classes are separable and degrades as they blur, so two tools called search_documents and find_files will be confused and merging or renaming them is a larger gain than any model change. Descriptions should say WHEN to use the tool, not just what it does, since the model is performing classification and the discriminative information is what helps. And I would measure selection accuracy against the majority-class baseline whenever the tool set changes, because adding a tool is a change to a classifier. FOR FORMATTING. Use constrained decoding or the provider's structured-output mode, which makes this factor approximately one and removes an entire class of failure for a configuration change. Keep schemas SHALLOW - deep nesting costs tokens, parser stack depth and more places for the model to lose track, and flat structures with enums consistently outperform elaborate hierarchies. FOR ARGUMENTS, which is where the real design work is. Descriptive names, because the model conditions on them literally - cancel_subscription(subscription_id) beats do_action(id, type). ENUMS wherever the value set is closed, which converts a generation problem into a selection problem and lets the grammar enforce it exactly; this is the single highest-value schema decision. Field descriptions that say what a value MEANS and give an example, since the format is often ambiguous. And critically, MAKE ABSENCE EXPRESSIBLE: nullable fields, an explicit unknown, or a confidence field. If the schema requires a value the model does not have, the constraint guarantees invention - there is no legal alternative path - so fabrication here is a schema bug rather than a model failure. FOR THE ERROR PATH, which is a first-class part of the interface. Errors are INPUT to the next decision, not log lines. 'Expected YYYY-MM-DD for due, got 03/04/2024' lets the retry differ; 'Error 400' guarantees a repeat. This measurably changes retry success and it costs nothing but attention. FOR SAFETY AND OPERATIONS. Idempotency, because agents retry and a non-idempotent tool called twice sends two emails - either take an idempotency key or require confirmation. A DRY-RUN mode returning what WOULD happen, which is valuable for evaluation and for confirmation flows. And per-task authorization outside the schema entirely, since valid is not permitted. WHAT I WOULD MEASURE AFTER BUILDING IT: the three factors separately, plus argument-validity rate by FIELD - which localizes the schema problem to a specific parameter and usually points at a missing enum, a missing example, or a field with no legal way to say 'I don't know'. That field-level breakdown is where most tool-interface improvements actually come from, and it is available for the cost of logging what you already have."
          }
        },
        {
          "q": "How does constrained decoding fit into tool calling, and what are its limits?",
          "a": "IT SOLVES EXACTLY ONE OF THE THREE PROBLEMS, COMPLETELY, and understanding which one is the whole point. WHAT IT DOES. At each decoding step, a grammar derived from the schema determines which tokens could continue a valid output, and the rest are masked to probability zero. Invalid output becomes unreachable, so the parse rate is 1.000 by construction - measured, it took free-form emission from 0.722 to 1.000. For tool calling this is enormously useful, because a malformed call is a total failure: you cannot partially execute a function. THE FIRST LIMIT, and it is a framing point rather than a technical one. That 1.000 is the DEFINITION of the technique, not a result. Reporting 'our tool calls are 100% schema-valid with constrained decoding' is stating what constrained decoding is. The quantity that can still move is correctness GIVEN validity, and in the measured setting that was a separate 0.952 selection accuracy - which is the number that actually describes the system's quality. THE SECOND LIMIT: the grammar constrains SHAPE, not MEANING. It can enforce that a date field matches a date pattern; it cannot enforce that the date is in the future, that February has fewer than thirty days, or that the customer id belongs to this customer. Anything cross-field or semantic is validation, not grammar, and it belongs in code after parsing. Conflating these is common and it produces systems that are confidently well-formed and wrong. THE THIRD LIMIT, the deepest one: MASKING IS NOT CONDITIONING. Renormalizing over the allowed tokens at each step does not give you the model's distribution conditioned on producing a valid output - those are different objects, and the difference is measurable. Practically this means constraining can push the model toward choices it would not otherwise make, so a strong constraint can degrade the CONTENT while perfecting the format. THE MITIGATION worth knowing: let the model reason freely first, then constrain only the final structured emission. Two phases - open generation for the thinking, constrained generation for the tool call - which keeps the format guarantee without forcing the reasoning through a grammar. This is the standard fix and it is cheap. THE OPERATIONAL NOTES. Constrained decoding costs some throughput, since the mask must be computed per step, though per-parser-state caching makes this manageable. Grammar power matters by format - a regex suffices for simple shapes, JSON needs a pushdown automaton for nesting. And provider structured-output modes give you this without implementing it. HOW I WOULD SUMMARIZE IT: constrained decoding removes format failures entirely and changes nothing else. That is a large, well-defined, cheap win - and treating it as a general quality improvement is the mistake, because the two factors it does not touch, selection and argument sensibility, are where the remaining failures live."
        },
        {
          "q": "What is validation actually for, if it does not improve accuracy?",
          "a": "IT CHANGES THE CLASS OF FAILURE FROM UNRECOVERABLE TO RECOVERABLE, and that is worth a great deal even though it is invisible in an accuracy metric - which is precisely why it gets skipped. THE MEASURED RESULT, which is worth stating plainly because it surprises people. A from-scratch schema validator caught 72 of 72 malformed calls with zero false rejections. End-to-end correctness went from 0.57 to 0.57 - unchanged. What changed was that roughly a tenth of executions that would have been exceptions against a real system became clean rejections the agent could observe and retry. WHY THAT IS VALUABLE. An exception in a tool call is a bad event in three ways. It may have partially executed against a real system before failing, leaving inconsistent state. It surfaces as an error the agent cannot interpret, so it cannot adapt. And it is often unrecoverable within the run, so the whole task fails. A validation rejection is none of those: nothing was executed, the agent receives a specific message describing what was wrong, and the loop can produce a corrected call. Same underlying model error, completely different operational consequence. WHY IT DOES NOT MOVE ACCURACY, and why expecting it to is the wrong frame. Validation is a filter, not a generator. It cannot make a wrong call right; it can only stop a malformed one from executing. If the model chose the wrong tool or the wrong arguments in a way that is structurally valid, validation passes it - correctly - and the task still fails. The accuracy ceiling is set by the model's reasoning, and validation was never in that path. WHAT MAKES A VALIDATOR EFFECTIVE. Zero false rejections matters as much as full catch rate: a validator that rejects legitimate calls converts working behaviour into failure, and it is the more damaging error because it is silent - the agent just retries and gives up. And the error message must be written FOR THE MODEL. 'Expected YYYY-MM-DD for due, got 03/04/2024' is a fix instruction; 'validation failed' guarantees an identical retry. That distinction changes measured retry success and costs nothing. WHERE VALIDATION SITS AMONG THE LAYERS, which is worth being precise about because these get conflated. Constrained decoding guarantees the output PARSES and matches the shape. Validation checks semantic and cross-field constraints the grammar cannot express - ranges, referential existence, mutually exclusive fields. AUTHORIZATION checks whether this call is PERMITTED, which is a different question again: a well-formed, semantically valid delete_account call passes both earlier layers and is exactly what an allowlist must stop. Three layers, three questions, and a system with only the first has none of the guarantees people assume it has. THE GENERAL LESSON I would draw: measure what a control ACTUALLY changes, not what it feels like it should change. Validation looked like a quality feature and measured as a reliability feature. That reframing is what tells you where to put it - in the execution path as a gate, not in the evaluation report as an accuracy claim."
        },
        {
          "q": "How would you route among a large number of tools?",
          "a": "BY TREATING IT AS A CLASSIFICATION PROBLEM WITH A KNOWN DEGRADATION CURVE, because that is what it is and the curve is the thing that determines the architecture. THE BASELINE FACT: selection is easy at small tool counts. A tiny bag-of-words router hit 1.000 against a majority-class baseline of 0.194 in the measured setting, which says two useful things - a small dedicated model handles routing cheaply, and the big model is not needed for it. THE PROBLEM AT SCALE: accuracy degrades as tools multiply, because you are adding classes with increasingly overlapping descriptions. Twenty tools is fine; two hundred is a different problem; a thousand does not fit in context at all. And there is a feedback loop working against you - the more specialists you add, the harder routing gets, so the architecture erodes its own precondition. THE APPROACHES, in the order I would try them. (1) FEWER TOOLS. The first move is almost always consolidation: merge tools that do similar things with a parameter distinguishing them, and delete ones nobody calls. This is unglamorous and it is usually the largest gain, because it directly reduces the number of classes. (2) HIERARCHICAL ROUTING. Route to a CATEGORY first, then to a tool within it - two easy classifications instead of one hard one. This scales well and it matches how tool sets actually grow, since they cluster by domain. It also means only the selected category's tool descriptions need to be in context. (3) RETRIEVAL OVER TOOLS. Embed tool descriptions, retrieve the top-k relevant for the query, and put only those in context. This is the standard answer above a few hundred tools, and it is worth noticing that it makes tool selection a RETRIEVAL problem - which brings the entire ceiling structure with it: if the right tool is not retrieved, no reasoning recovers it, so recall@k over tools becomes a metric you must track. (4) A DEDICATED ROUTER MODEL, small and fine-tuned on your traffic. Cheap, fast, and better than a general model at your specific tool set. (5) TWO-STAGE with a fallback: route, and if confidence is low, escalate to the larger model with a broader tool set. WHAT I WOULD MEASURE THROUGHOUT. Selection accuracy against the majority-class baseline, per tool - the confusion MATRIX is the useful artefact, because it names which pairs are being confused and those pairs are the renaming or merging candidates. Recall@k if using retrieval, since that is the new ceiling. And the accuracy curve as a function of tool count, so you know where your current approach stops working before you cross it. THE DESIGN POINT I would emphasize: most large tool sets are large by accretion rather than by necessity, and the routing problem is often a symptom. Before building hierarchical routing or tool retrieval, I would look at whether the tool set can be halved - because that is a smaller project than either, and it improves every other metric at the same time."
        },
        {
          "q": "How does tool calling relate to the rest of this module?",
          "a": "IT IS THE INTERFACE EVERY LATER LESSON ASSUMES, and its decomposition is the module's method applied at the smallest scale. THE METHOD, visible here in miniature: take a capability everyone treats as one thing, split it into parts that can be measured separately, and discover that the parts have very different difficulty. Selection is nearly free - a bag-of-words classifier beats a majority baseline of 0.194 with a perfect score. Formatting is free by construction under constrained decoding. Arguments are the residual and stay hard. A single averaged 'tool call success' metric would have hidden all three facts, and hiding them is what leads to spending on the model when the fix is a configuration or a rename. WHAT IT FEEDS FORWARD. 21-03 takes the typed-interface idea and standardizes it across processes, where the measured payoff is DYNAMIC DISCOVERY - a client using a tool added after it was written, which a hard-coded agent cannot do at all. 21-04's planning is a sequence of these calls, so argument quality compounds across steps. 21-08's observability discovers that the latency bottleneck and the cost bottleneck are different STEPS, which only means something when steps are individually instrumented tool calls. And 21-09's security rests on the distinction this lesson ends with: valid is not permitted, so the allowlist is a separate layer from the schema. THE RESULT I WOULD MOST WANT REMEMBERED is the validation one, because it is the clearest example of the module's habit paying off. Validation looked like a quality feature. Measured, it left correctness at exactly 0.57 and converted about a tenth of crashes into retryable rejections. If you evaluate it on accuracy you conclude it does nothing and remove it; if you evaluate it on failure CLASS you see it doing something important that no accuracy metric can express. That is the same shape as the capstone finding in module 18 - features that move zero quality and are essential anyway - and it is why the panel of separate metrics matters more than any single headline. AND THE HABIT: when someone reports a tool-calling number, ask which of the three it is. Most of the time the answer reveals that the impressive figure was the one guaranteed by construction, and the interesting one - whether the agent chose sensibly - was not measured at all."
        },
        {
          "q": "What would you build first for an agent's tool layer?",
          "a": "CONSTRAINED DECODING, THEN VALIDATION, THEN THE ALLOWLIST - in that order, because the first is a configuration with a measured 0.722-to-1.000 effect, the second changes the failure class for very little work, and the third is the only one of the three that bounds damage. STEP 1 - CONSTRAINED DECODING or the provider's structured-output mode. It removes an entire failure category by construction, it is usually a flag rather than a project, and without it roughly a quarter of emissions fail to parse in the measured setting. There is no argument for deferring this. STEP 2 - SCHEMAS WORTH CONSTRAINING TO. This is where the actual design effort goes and it is cheap: descriptive names, enums wherever the value set is closed, field descriptions with examples, shallow nesting, and a legal way to express 'unknown'. That last one prevents a specific failure - a required field the model cannot fill guarantees invention, because the grammar leaves no other path - and it is a schema bug misread as a hallucination. STEP 3 - VALIDATE BEFORE EXECUTE, with errors written for the model rather than the log. Measured: full catch, no false rejections, correctness unchanged, and a tenth of crashes converted into clean retryable rejections. It does not make the agent smarter and it makes its failures survivable. STEP 4 - A PER-TASK ALLOWLIST. Valid is not permitted, and this is the layer that bounds what a confused or compromised agent can reach. It costs nothing when the task's tool set is known and it is the only control here that limits damage rather than improving behaviour. STEP 5 - THE MEASUREMENT PANEL: selection accuracy against the majority baseline, schema-valid rate, argument-sensibility rate, and the per-tool confusion matrix. Without these the next problem is undiagnosable. WHAT I WOULD DEFER. A dedicated router model, until selection accuracy measures poorly - at small tool counts it is already near perfect, so this is a solution looking for a problem. Tool retrieval, until the tool count makes context a constraint. Fine-tuning for tool use, which is a project and is rarely the binding constraint. And elaborate tool sets generally: most large tool inventories are large by accretion, and consolidating them improves selection, context cost and maintenance simultaneously. THE ORDERING PRINCIPLE, which is the same one this whole curriculum keeps arriving at: do the cheap structural things that remove whole failure classes before the expensive ones that shift a distribution. Constrained decoding removes format failures entirely. An allowlist removes a class of damage entirely. Those are worth more than several points of model quality, and they are available in an afternoon."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ One number hiding three",
        "back": "P(good call) = P(right tool) × P(parses/matches schema) × P(sensible args) — CLASSIFICATION × DECODING × REASONING. A 0.6 aggregate may be 0.99 × 0.72 × 0.85, where the cheap decoding fix beats any model change."
      },
      {
        "type": "formula",
        "front": "Selection is EASY — measure it against the baseline",
        "back": "A tiny bag-of-words router: 1.000 vs majority-class 0.194. So you don't need the big model to route — and when selection fails, suspect confusable tool DESCRIPTIONS, not the model."
      },
      {
        "type": "formula",
        "front": "Formatting is solved BY CONSTRUCTION",
        "back": "Free-form parse 0.722 → constrained 1.000. But that 1.000 is the DEFINITION of the technique, not a result. The number describing the system was the separate selection accuracy of 0.952."
      },
      {
        "type": "pitfall",
        "front": "Constrained decoding ≠ sensible arguments",
        "back": "The grammar constrains SHAPE, not MEANING. It can enforce a date pattern; it cannot enforce that the date exists or that the id belongs to this customer. Cross-field and semantic checks are validation, not grammar."
      },
      {
        "type": "formula",
        "front": "★ What validation MEASURED",
        "back": "72/72 broken calls caught, 0 false rejections — and correctness 0.57 → 0.57, UNCHANGED. What changed: ~10% of executions went from crash to clean retryable REJECTION. It changes the failure CLASS, not the accuracy."
      },
      {
        "type": "intuition",
        "front": "Why that's valuable anyway",
        "back": "An exception may have partially executed, is uninterpretable to the agent, and often kills the run. A rejection executed nothing, carries a specific message, and the loop can correct it. Same model error, completely different operational consequence."
      },
      {
        "type": "pitfall",
        "front": "Zero FALSE rejections matters as much as full catch",
        "back": "A validator that rejects legitimate calls converts working behaviour into failure — and it's the more damaging error because it's SILENT: the agent just retries and gives up."
      },
      {
        "type": "intuition",
        "front": "The three layers, three questions",
        "back": "CONSTRAINED DECODING: does it parse? VALIDATION: are the values semantically ok? AUTHORIZATION: is this call PERMITTED? A well-formed, valid delete_account passes the first two and is exactly what the third must stop."
      },
      {
        "type": "pitfall",
        "front": "A required field with no \"unknown\" guarantees invention",
        "back": "If the schema demands a value the model doesn't have, the constraint leaves no legal alternative — so it fabricates. That's a SCHEMA BUG misread as a hallucination. Add nullable / explicit unknown / confidence."
      },
      {
        "type": "intuition",
        "front": "Errors are INPUT to the next decision",
        "back": "\"expected YYYY-MM-DD for `due`, got '03/04/2024'\" makes the retry DIFFER. \"validation failed\" guarantees a repeat. This measurably changes retry success and costs nothing but attention."
      },
      {
        "type": "intuition",
        "front": "Routing at scale",
        "back": "Accuracy degrades as tools multiply (more classes, blurrier). Order: FEWER TOOLS (usually the biggest win) → hierarchical routing → tool RETRIEVAL (which brings a recall@k CEILING with it) → a small fine-tuned router. Use the confusion matrix to find merge candidates."
      },
      {
        "type": "intuition",
        "front": "Build order for the tool layer",
        "back": "1 constrained decoding (a flag, removes a whole class) · 2 schemas worth constraining to (enums! expressible unknown) · 3 validate-before-execute with model-facing errors · 4 per-task ALLOWLIST · 5 the three-metric panel. Defer routers and fine-tuning."
      }
    ],
    "refs": [
      {
        "title": "Patil et al. (2023), Gorilla: Large Language Model Connected with Massive APIs",
        "url": "https://arxiv.org/abs/2305.15334"
      },
      {
        "title": "Qin et al. (2023), ToolLLM: Facilitating LLMs to Master 16000+ Real-World APIs",
        "url": "https://arxiv.org/abs/2307.16789"
      },
      {
        "title": "Willard & Louf (2023), Efficient Guided Generation for Large Language Models",
        "url": "https://arxiv.org/abs/2307.09702"
      },
      {
        "title": "Xu et al. (2023), On the Tool Manipulation Capability of Open-Source Large Language Models",
        "url": "https://arxiv.org/abs/2305.16504"
      },
      {
        "title": "JSON Schema (2020-12), Core Specification",
        "url": "https://json-schema.org/draft/2020-12/json-schema-core.html"
      }
    ],
    "demos": [
      "constrained-decoding",
      "agent-router",
      "react-agent",
      "tokenizer"
    ]
  }
};
