// GENERATED from content/lessons/llm-systems/structured-output.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/structured-output/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "structured-output": {
    "level": "core",
    "body": {
      "intuition": [
        "A program consuming a model's output needs it to parse. Prompting for JSON works most of the time, and most of the time is a failure rate - at scale, a percent of malformed responses is a percent of your requests erroring, and the failures cluster on exactly the long or unusual inputs you care about. There are three levels of answer: ask nicely and retry, fine-tune the format in, or make invalid output IMPOSSIBLE by masking the logits at every decoding step so that only tokens which can continue a valid string are available.",
        "Constrained decoding is the guaranteed one and the mechanism is simple: maintain a parser state, compute the set of tokens that could legally come next, set every other logit to negative infinity, sample. The engineering difficulty is a mismatch - the grammar is defined over CHARACTERS and decoding happens over TOKENS, so a single token may span a legal boundary or advance the parser through several states. Efficient implementations precompute, for each parser state, the set of allowed tokens, which turns a per-step parse into a table lookup and is what makes the technique fast enough to use.",
        "And then the caveat that makes this lesson worth having rather than a recipe. Masking guarantees the FORM and can damage the CONTENT. When you zero out tokens the model wanted and renormalize over what remains, you are not sampling the model's conditional distribution given that the output will be valid - you are sampling a different, restricted distribution, and you can force the model down a path it assigned low probability, which puts it off-distribution for everything that follows. The evidence is genuinely mixed: some studies report constrained decoding degrading reasoning tasks, others attribute much of that to the prompt formatting rather than the constraint. My reading is that the mechanism is real, the magnitude is task-dependent, and the reliable mitigation is structural - let the model reason in free text first and constrain only the final answer, which gets you both properties."
      ],
      "math": [
        {
          "h": "Masking is not conditioning",
          "paras": [
            "Constrained decoding renormalizes the distribution over the allowed tokens at each step. That is a per-step restriction, and it is not the same object as conditioning the whole sequence on being valid.",
            "The difference is that a greedy per-step restriction can commit you to a prefix from which the valid continuations are all poor, which conditioning on the full sequence would have avoided."
          ],
          "tex": "p_{\\text{masked}}(x_t \\mid x_{<t}) = \\frac{p(x_t \\mid x_{<t})\\,\\mathbb{1}[x_t \\in A_t]}{\\sum_{x \\in A_t} p(x \\mid x_{<t})} \\;\\;\\neq\\;\\; p\\big(x_t \\mid x_{<t},\\, \\text{sequence valid}\\big)",
          "texNote": "The right-hand side would require knowing which prefixes lead to good valid completions - a lookahead the greedy mask does not perform. So the technique can force a token the model assigned very low probability, and everything generated afterwards is conditioned on a prefix the model considers unlikely, which is exactly the off-distribution regime where quality degrades."
        },
        {
          "h": "The token-character mismatch",
          "paras": [
            "The grammar accepts strings of characters; the decoder emits tokens, which are multi-character and may straddle grammatical boundaries. So the allowed-token set for a parser state must be computed by asking which tokens keep the parse alive.",
            "Precomputing that map per state is what turns an expensive per-step parse into a lookup."
          ],
          "tex": "A(s) = \\{\\, \\tau \\in V : \\delta^{*}(s, \\mathrm{chars}(\\tau)) \\neq \\varnothing \\,\\}",
          "texNote": "For each parser state s, run the automaton's transition function over each token's characters and keep the tokens that do not lead to a dead end. With a vocabulary of a hundred thousand and many states this is expensive to do naively and cheap once cached - which is the core engineering contribution of the practical libraries. Note it also means the constraint is tokenizer-dependent: the same grammar gives different allowed sets under a different tokenization."
        },
        {
          "h": "Validity and correctness are different measurements",
          "paras": [
            "Constraining guarantees that the output parses. It says nothing about whether the values are right, and conflating the two is the standard evaluation error here.",
            "The interesting quantity is correctness conditional on validity, because that is what the constraint might be damaging."
          ],
          "tex": "\\Pr[\\text{valid}] \\;=\\; 1 \\;\\text{ by construction}, \\qquad \\Pr[\\text{correct}] = \\Pr[\\text{correct} \\mid \\text{valid}] \\cdot \\underbrace{\\Pr[\\text{valid}]}_{=1}",
          "texNote": "So the only number that moved is the conditional, and it is the one to measure. Comparing a constrained system against an unconstrained one on end-to-end success conflates the validity gain with any correctness loss - the honest comparison reports both terms separately, and on the unconstrained side you must decide whether an unparseable response counts as incorrect or is excluded."
        }
      ],
      "code": [
        {
          "h": "Logit masking, and the precomputation that makes it fast",
          "paras": [
            "The mechanism is four lines. The cost is in computing the allowed set, which is why the practical libraries precompute it per parser state."
          ],
          "code": "def constrained_step(logits, parser_state, allowed_cache):\n    allowed = allowed_cache[parser_state]           # precomputed token id set\n    mask = torch.full_like(logits, float(\"-inf\"))\n    mask[allowed] = 0.0\n    return logits + mask                            # invalid tokens: p = 0\n\n# BUILDING THE CACHE - the actual engineering. The grammar is over CHARACTERS,\n# decoding is over TOKENS, and a token may span a grammatical boundary or\n# advance the parser through several states:\ndef allowed_tokens(state, automaton, vocab):\n    out = []\n    for tok_id, tok_str in vocab.items():\n        s = state\n        for ch in tok_str:\n            s = automaton.step(s, ch)\n            if s is DEAD: break\n        else:\n            out.append(tok_id)                       # the whole token survives\n    return out\n#   Naive, this is |V| x |token| work PER STEP with a 100k vocabulary. Cached\n#   per parser state it is a lookup - which is the core contribution of the\n#   practical libraries and what makes the technique usable.\n#   NOTE it is TOKENIZER-DEPENDENT: the same grammar gives different allowed\n#   sets under a different tokenization.\n\n# WHAT YOU CAN CONSTRAIN, by grammar power:\n#   REGEX / finite automaton  -> dates, enums, identifiers, fixed formats\n#   JSON SCHEMA -> pushdown   -> nesting requires a stack (matched braces)\n#   full CFG                  -> SQL, code, arbitrary structured languages\n#\n# WHAT A GRAMMAR CANNOT ENFORCE, and this is the boundary worth knowing:\n#   - that a number is in a valid RANGE for the field's meaning\n#   - that an id REFERS to something that exists\n#   - that the values are TRUE\n# Grammar gives you syntax. Semantics still needs validation after parsing.",
          "caption": "The masking is trivial; the allowed-token computation is the engineering. And the boundary at the bottom is the one people misjudge - a grammar guarantees the output parses and cannot make it correct."
        },
        {
          "h": "The two-phase pattern, and how to evaluate honestly",
          "paras": [
            "The reliable mitigation for the quality concern, and the evaluation that separates the two things constraining affects."
          ],
          "code": "# THE PROBLEM: masking can force a token the model gave low probability, and\n# everything after is conditioned on a prefix the model considers unlikely -\n# off-distribution, which is where quality degrades. The evidence on how much\n# is MIXED: some studies report degraded reasoning under format constraints,\n# others attribute much of it to the PROMPT formatting rather than the\n# constraint itself. The mechanism is real; the magnitude is task-dependent.\n\n# THE FIX THAT SIDESTEPS THE ARGUMENT - two phases, one call:\n#   PHASE 1: generate reasoning FREELY, no constraint\n#   PHASE 2: constrain only the final structured answer\nout = model.generate(prompt + \"Think step by step, then answer in JSON.\\n\")\n#   ... free text reasoning ...\n#   then switch the constraint ON at the delimiter:\nout += model.generate(out, grammar=json_schema_grammar)\n#   The model reasons in the distribution it was trained on, and only the\n#   short final span is constrained - where there is little left to get wrong.\n#   This is the standard mitigation and it works.\n\n# ---- EVALUATION: measure BOTH things, separately ----\nmetrics = {\n  \"parse_rate\":       fraction_that_parse(outputs),        # 1.0 if constrained\n  \"schema_valid\":     fraction_matching_schema(outputs),   # types, required\n  \"semantically_ok\":  fraction_correct(outputs),           # <- THE REAL ONE\n  \"correct_given_valid\": correct_and_valid / valid,        # what the constraint\n                                                            # might have damaged\n}\n# CONSTRAINING SETS parse_rate TO 1 BY CONSTRUCTION. That is not a result - it\n# is the definition. The only number that can move is semantic correctness, so\n# an evaluation reporting only validity has measured nothing about the trade.\n#\n# AND ON THE UNCONSTRAINED SIDE, decide explicitly whether an unparseable\n# response counts as INCORRECT or is EXCLUDED - the two give very different\n# comparisons and the choice is usually left implicit.",
          "caption": "Reporting a parse rate of 100% under constrained decoding is reporting the definition, not a finding. The only number that can move is correctness given validity, and the two-phase pattern is what protects it."
        }
      ],
      "useCases": [
        "Any programmatic consumer of model output - extraction into a database, populating a UI, driving a workflow - where a percent of unparseable responses is a percent of your requests erroring, concentrated on the unusual inputs.",
        "Tool and function calling, where the model must emit a call with a valid name and arguments matching that tool's schema, and where an invalid call is an exception rather than a degraded answer.",
        "Generating code or queries in a formal language, where a full context-free grammar can guarantee syntactic validity - though not that the query does what was asked.",
        "Classification and enumerated outputs, where constraining to the label set removes an entire class of parsing and normalization work and costs essentially nothing, since there is no reasoning to disturb."
      ],
      "pitfalls": [
        "Reporting a parse rate of 100% as a result. Constrained decoding sets it to one by construction - that is the definition, not a finding. The only quantity that can move is semantic correctness given validity, and that is what should be measured.",
        "Assuming a valid output is a correct one. A grammar guarantees syntax: it cannot enforce that a number is in a sensible range, that an identifier refers to something real, or that the values are true. Semantic validation after parsing is still required.",
        "Constraining the whole generation on a reasoning task. Masking can force a low-probability token, putting everything after it off-distribution. Let the model reason freely and constrain only the final answer - the two-phase pattern gets both properties.",
        "Treating the quality concern as settled in either direction. Some studies report format constraints degrading reasoning; others attribute much of that to prompt formatting rather than the constraint. The mechanism is real and the magnitude is task-dependent, so measure it on your task.",
        "Forgetting that the constraint is tokenizer-dependent. The allowed-token set is computed by running each token's characters through the automaton, so the same grammar behaves differently under a different tokenization - and a cache built for one tokenizer is wrong for another.",
        "Computing the allowed set per step naively. With a hundred-thousand-token vocabulary that is expensive enough to dominate decoding; the practical libraries precompute it per parser state, turning it into a lookup.",
        "Comparing against an unconstrained baseline without stating how unparseable responses are scored. Counting them as incorrect and excluding them give very different comparisons, and the choice is usually left implicit."
      ],
      "connections": [
        {
          "ref": "agentic-ai/tool-calling",
          "text": "The application that makes this load-bearing: an agent's tool call must parse and must match the tool's schema, and an invalid call is an exception in a loop rather than a degraded sentence."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The alternative level of the answer. Fine-tuning teaches format conventions reliably - it is what SFT is unambiguously good at - and it reduces the failure rate without guaranteeing anything, which is why the two are complementary rather than competing."
        },
        {
          "ref": "rnn-nlp/text-generation",
          "text": "Where the decoding machinery this modifies is developed. Constrained decoding is a mask applied to the logits before whatever sampling strategy you were already using, so it composes with temperature, top-p and beam search."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "The same idea applied to content rather than form. Both constrain what the model may emit, and both face the same question of whether restricting the distribution degrades what remains."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Why the evaluation design matters here specifically: constraining moves one metric to its ceiling by construction, so an evaluation that reports it has measured the definition rather than the effect."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is constrained decoding?",
          "a": "Masking the logits at every step so only tokens that can continue a valid string under a grammar are available, making invalid output impossible rather than unlikely."
        },
        {
          "q": "What are the three levels of answer for structured output?",
          "a": "Prompt and retry, fine-tune the format in, or constrain the decoding. Only the third guarantees validity."
        },
        {
          "q": "Why is masking not the same as conditioning?",
          "a": "It restricts per step and renormalizes, without lookahead. So it can commit to a prefix from which all valid completions are poor - which conditioning on the whole sequence would avoid."
        },
        {
          "q": "What is the token-character mismatch?",
          "a": "Grammars accept characters and decoders emit tokens, which are multi-character and may straddle grammatical boundaries. The allowed set must be computed by running each token's characters through the automaton."
        },
        {
          "q": "Why precompute the allowed-token sets?",
          "a": "Computing them per step over a hundred-thousand-token vocabulary would dominate decoding. Cached per parser state it becomes a lookup, which is what makes the technique practical."
        },
        {
          "q": "Is the constraint tokenizer-dependent?",
          "a": "Yes. The allowed sets are derived from token strings, so the same grammar behaves differently under a different tokenization and a cache built for one is wrong for another."
        },
        {
          "q": "What grammar power does JSON schema need?",
          "a": "A pushdown automaton, because nesting requires a stack to match braces. Regular expressions suffice for flat formats; a full CFG is needed for languages like SQL."
        },
        {
          "q": "What can a grammar not enforce?",
          "a": "Semantics: that a number is in a sensible range, that an identifier refers to something real, or that the values are true. It guarantees syntax only."
        },
        {
          "q": "Why can constraining degrade quality?",
          "a": "Masking can force a token the model gave low probability, so everything after is conditioned on a prefix it considers unlikely - off-distribution, where quality degrades."
        },
        {
          "q": "What is the two-phase pattern?",
          "a": "Generate reasoning freely with no constraint, then constrain only the final structured answer - so the model reasons in its own distribution and only a short span is restricted."
        },
        {
          "q": "Why is a 100% parse rate not a result?",
          "a": "Constrained decoding sets it to one by construction. That is the definition of the technique, and the only quantity that can move is correctness given validity."
        },
        {
          "q": "What is the state of evidence on quality degradation?",
          "a": "Mixed. Some studies report format constraints hurting reasoning; others attribute much of it to prompt formatting rather than the constraint. The mechanism is real and the magnitude is task-dependent."
        }
      ],
      "standard": [
        {
          "q": "How would you guarantee that a model's output matches a schema?",
          "a": "THERE ARE THREE LEVELS AND THEY ARE COMPLEMENTARY, so I would describe the ladder rather than pick one. LEVEL 1: PROMPT AND VALIDATE. Ask for the format, parse the result, retry on failure with the error message appended. Simple, no infrastructure, works with any provider. Its problem is that it works MOST of the time, and most of the time is a failure rate - at scale a percent of malformed responses is a percent of requests erroring, concentrated on the long or unusual inputs, which are the ones you care about. Retries also cost latency and money, and a persistent failure loops. LEVEL 2: FINE-TUNE THE FORMAT IN. This is what supervised fine-tuning is unambiguously good at - surface conventions transfer reliably, which is exactly the finding from the instruction-tuning literature. It substantially reduces the failure rate and guarantees nothing, so it is a complement rather than a substitute. LEVEL 3: CONSTRAINED DECODING, which is the guarantee. At each step, maintain a parser state, compute the set of tokens that could continue a valid string, set every other logit to negative infinity, and sample from what remains. Invalid output becomes impossible rather than unlikely. THE ENGINEERING, which is the interesting part. The grammar is defined over CHARACTERS and decoding happens over TOKENS, which are multi-character and may straddle grammatical boundaries or advance the parser through several states. So the allowed-token set for a parser state has to be computed by running each token's characters through the automaton and keeping the ones that do not hit a dead end. Done naively per step over a large vocabulary that dominates decoding; precomputed per parser state it is a table lookup, and that caching is the core contribution of the practical libraries. Note it makes the constraint tokenizer-dependent, so a cache is not portable across tokenizations. GRAMMAR POWER, by what you need: a regular expression or finite automaton for flat formats, dates and enums; a pushdown automaton for JSON, because nesting needs a stack to match braces; a full context-free grammar for SQL or code. THE CAVEAT I WOULD RAISE UNPROMPTED, because it is what separates understanding this from using it. Masking is NOT conditioning. Renormalizing over the allowed tokens at each step, greedily and without lookahead, is a different object from the model's conditional distribution given that the whole output will be valid. It can force a token the model assigned very low probability, and everything generated afterwards is conditioned on a prefix the model considers unlikely - which is off-distribution and is where quality degrades. The evidence on magnitude is genuinely mixed: some studies report format constraints hurting reasoning tasks, others attribute much of that to the prompt formatting rather than the constraint. My reading is that the mechanism is real and the size is task-dependent. THE MITIGATION THAT SIDESTEPS THE ARGUMENT: two phases. Let the model reason in free text with no constraint, then constrain only the final structured answer. The reasoning happens in the distribution the model was trained on, and the constrained span is short and has little left to get wrong. That is the standard pattern and I would use it by default on anything requiring reasoning. AND THE THING TO REMEMBER ABOUT VALIDATION: a grammar guarantees syntax and cannot enforce semantics - that a number is in range, that an identifier exists, that the values are true. Post-parse validation is still required.",
          "deepDive": {
            "q": "Explain precisely how masking differs from conditioning, and construct a case where it hurts.",
            "a": "THE TWO OBJECTS. What we WANT is p(x | prefix, the full sequence will be valid) - the model's belief about the next token given that the completed output satisfies the grammar. What masking COMPUTES is p(x | prefix) restricted to the tokens that keep the parse alive right now, renormalized. Those differ because the first involves a lookahead over all completions and the second is greedy. A CONSTRUCTED CASE. Suppose the schema requires a field whose value is one of two enums, and the model's belief is that neither applies well but one continuation would let it express uncertainty in a later free-text field while the other would not. The correct conditional would account for what each choice makes possible downstream. The greedy mask cannot: it picks between the two on their immediate probabilities, and may commit to the branch from which every valid completion is poor. A SIMPLER AND MORE COMMON CASE. The model wants to begin with a brief clarification - 'Based on the document, ' - before the JSON. Under a constraint requiring the output to start with an opening brace, that token is masked to zero probability and the model emits the brace instead, having assigned it low probability. Everything after is now conditioned on a prefix that, from the model's perspective, is unusual - and the standard finding about off-distribution prefixes is that quality degrades. This is the mechanism, and it is why the effect is most visible on tasks where the model would naturally reason before answering. THE FORMAL STATEMENT of what would be correct. You would need, for each candidate token, the total probability mass of valid completions following it - a quantity requiring you to marginalize over all continuations, which is intractable for anything but a trivial grammar. So the greedy mask is an approximation nobody knows how to remove cheaply, and that is worth stating plainly rather than treating the technique as exact. WHAT MITIGATES IT, in order of practicality. (1) THE TWO-PHASE PATTERN, which sidesteps the problem for the case that matters most - reasoning - by constraining only a short final span where there is little left to get wrong. (2) A MORE PERMISSIVE GRAMMAR: allow leading whitespace, allow an optional preamble field, allow the model's natural phrasings where the schema does not care. Every unnecessary restriction is an opportunity to force a low-probability token. (3) BEAM SEARCH OR SAMPLING WITH RESTARTS under the constraint, which recovers some lookahead at a cost. (4) FINE-TUNING ON THE FORMAT, so the model's unconstrained distribution already puts mass where the grammar allows - at which point the mask rarely binds and the whole concern evaporates. That last one is the most satisfying answer: the constraint hurts in proportion to how often it actually fires, and a model trained on the format triggers it seldom. HOW I WOULD MEASURE IT on my own task. Log the KL divergence between the masked and unmasked distributions at each step, or more simply the probability mass the model assigned to the tokens that were masked away. If that mass is consistently near zero the constraint is inert and there is nothing to worry about; if it is frequently large, the constraint is doing real work to the distribution and the quality question is live. That single measurement turns an unresolved literature debate into a fact about your deployment, and it is a few lines."
          }
        },
        {
          "q": "How does function calling work, and what makes it hard?",
          "a": "THE MECHANICS. You give the model a set of tool definitions - a name, a description, and a JSON schema for the arguments - and it emits a call: which tool, with what arguments. Structurally it is two problems: a SELECTION problem, choosing among tools or choosing to answer directly, and a GENERATION problem, producing arguments matching that tool's schema. Constrained decoding handles the second cleanly, since once the tool is chosen its schema is a grammar. THE SELECTION PROBLEM IS THE HARDER ONE and it gets less attention. It is effectively classification over the tool set plus a null option, driven only by the tool descriptions and the user's request. It degrades in predictable ways: with many tools, since the descriptions compete for attention and the model's discrimination falls; with SIMILAR tools, where two overlapping descriptions are genuinely ambiguous; and at the boundary of when to call anything at all, where models tend toward over-calling because the tools are salient in the context. The practical responses are to keep the tool set small per request - retrieving a relevant subset rather than presenting all of them - to write descriptions that state when NOT to use the tool as well as when to, and to make the descriptions maximally distinguishing rather than maximally complete. WHAT MAKES ARGUMENT GENERATION HARD BEYOND SYNTAX. A grammar guarantees the JSON parses and the types match. It cannot enforce that the identifier refers to a real record, that a date is in a plausible range, that units are right, or that the value answers the user's question. Those are semantic and they need post-parse validation with a clear error path back to the model. In my experience the failure distribution is heavily weighted toward valid-but-wrong once constrained decoding is in place, which is exactly what the validity-versus-correctness distinction predicts. THE MULTI-CALL COMPLICATIONS. Parallel calls - emitting several independent calls in one turn - need a grammar admitting a list and a runtime that can execute them concurrently, and they raise the question of what to do when one fails. Sequential calls, where the second depends on the first's result, are an agent loop rather than a single generation and belong to that machinery. And in either case results must be fed back in a format the model was trained to consume, which is a template question that is easy to get subtly wrong. THE EVALUATION I WOULD RUN, which mirrors the validity-correctness split. Tool selection accuracy, including the decision not to call. Argument validity, which constrained decoding sets to one. Argument SEMANTIC correctness, which is the number that matters. And end-to-end task success, which is the only one a user experiences. Reporting only the first two is the common mistake and it describes a system that reliably calls the right tool with well-formed nonsense. THE DESIGN POINT I WOULD MAKE. Constrained decoding solves the syntactic half completely and cheaply, which is genuinely valuable because it removes a whole class of production errors. It leaves the two hard parts - which tool, and are the arguments right - exactly where they were, and those are where the engineering effort should go once the syntax is guaranteed."
        },
        {
          "q": "How would you evaluate a structured-output system?",
          "a": "THE CENTRAL DISCIPLINE IS SEPARATING VALIDITY FROM CORRECTNESS, because constrained decoding moves the first to its ceiling by construction and can only affect the second. THE METRICS, in layers. (1) PARSE RATE - does the output parse at all. Under constrained decoding this is one, by definition. Reporting it as a result is reporting the definition of the technique, which is a surprisingly common error in write-ups. (2) SCHEMA VALIDITY - do the types match, are required fields present, are enums from the allowed set. A grammar covers most of this, and if you are not constraining, this is the meaningful reliability number. (3) SEMANTIC CORRECTNESS - are the values right. This is the metric that matters and it is the only one that can move when you introduce a constraint. (4) CORRECTNESS GIVEN VALIDITY - the conditional, which isolates what the constraint might have damaged from what it fixed. (5) END-TO-END TASK SUCCESS, which is what a user experiences and which folds in everything downstream. THE COMPARISON DESIGN, which is where this usually goes wrong. Comparing constrained against unconstrained requires deciding how to score an unparseable response on the unconstrained side. Counting it as incorrect makes the constrained system look better by exactly the parse-rate gain. Excluding it makes the unconstrained system look better, because you have discarded its failures. Both are defensible and they give different answers, so the choice must be stated - and the honest report gives both numbers, or better, reports parse rate and conditional correctness separately so the reader can combine them however they wish. WHAT ELSE I WOULD MEASURE. The MASKED PROBABILITY MASS - how much probability the model assigned to tokens the constraint removed, per step. If that is consistently near zero the constraint is inert and the quality concern is moot for your task; if it is frequently large, the constraint is materially reshaping the distribution and the correctness comparison deserves attention. This turns an unresolved debate in the literature into a measured fact about your deployment, and it is a few lines. Also: latency, since constrained decoding adds per-step work even when cached, and the retry-based alternative adds whole extra generations. THE TEST SET DESIGN. Include the cases where format failures actually occur, which are the long inputs, the unusual ones, the ones with characters that need escaping, and the ones where the correct answer is empty or null. A test set of well-behaved examples shows a high parse rate for both approaches and measures nothing - the whole value of constraining is on the tail, so the evaluation has to contain the tail. AND FOR REASONING TASKS SPECIFICALLY, evaluate the two-phase pattern as a third arm alongside fully-constrained and unconstrained. If it matches unconstrained on correctness and constrained on validity - which is what it is designed to do and usually achieves - that is the answer and the fully-constrained arm was a false choice.",
          "deepDive": {
            "q": "The literature disagrees about whether constrained decoding degrades quality. How would you resolve it for your own system?",
            "a": "I WOULD TREAT IT AS A MEASURABLE PROPERTY OF MY DEPLOYMENT rather than a question with a universal answer, because the mechanism is clear and its magnitude obviously depends on the task and the model. WHY THE LITERATURE DISAGREES, which is worth understanding before designing the experiment. The studies reporting degradation typically compare free-form generation against fully-constrained generation on reasoning benchmarks. The rebuttals argue that much of the observed gap comes from the PROMPT changing - asking for JSON alters the instruction, and the model may reason less because it was told to produce a compact structured answer, not because tokens were masked. That is a genuine confound: the constraint and the instruction were varied together. So a large part of the disagreement is about experimental design rather than about the mechanism, which means my experiment has to separate them. THE EXPERIMENT I WOULD RUN, four arms, holding everything else fixed. (A) FREE-FORM with a natural prompt - the baseline for reasoning quality. (B) SAME PROMPT AS (A), asking for reasoning then a JSON answer, with NO constraint - this isolates the prompt effect. (C) SAME PROMPT AS (B), WITH the constraint applied throughout - this isolates the masking effect, since (B) and (C) differ only in the mask. (D) TWO-PHASE: same prompt, constraint applied only to the final answer span. Comparing (A) to (B) measures the prompt's effect. Comparing (B) to (C) measures the constraint's effect, which is the actual question. And (D) tells you whether the mitigation works. Without arm (B) you cannot separate the two, which is precisely the flaw in much of the published comparison. THE DIRECT MEASUREMENT that supplements the experiment. Log, at each constrained step, the probability mass the model assigned to the tokens that were masked away. This is the mechanism made visible: if that mass is near zero throughout, the constraint is inert - the model was going to produce valid output anyway - and no quality effect is possible. If it is frequently large, the constraint is actively redirecting generation and the effect is plausible. I find this more informative than the benchmark comparison because it explains rather than merely detects, and it localizes WHERE in the output the constraint binds. WHAT I WOULD EXPECT TO FIND, stated in advance so the experiment is falsifiable. On extraction and classification tasks, where there is no reasoning to disturb and the model's natural output is already close to the schema, essentially no degradation - the masked mass should be tiny. On multi-step reasoning with the constraint applied throughout, a real degradation, because the model is prevented from thinking in text. And the two-phase arm matching free-form on correctness while retaining perfect validity. If that pattern holds, the practical conclusion is simple: constrain freely on extraction, use two phases on anything requiring reasoning, and stop worrying about the debate. THE BROADER METHODOLOGICAL POINT. A disagreement in the literature that turns on a confound is resolved by an experiment that breaks the confound, not by weighing the papers. And a mechanism you can measure directly - the masked probability mass - beats an outcome comparison, because it tells you whether the mechanism is even active in your case. That is the same discipline as everywhere in this curriculum: measure the thing, not a downstream consequence of it."
          }
        },
        {
          "q": "When would you not use constrained decoding?",
          "a": "FOUR CASES, and naming them is what distinguishes understanding the technique from applying it reflexively. (1) WHEN THE OUTPUT IS PROSE. If a human reads the result, there is no schema to enforce and constraining buys nothing while risking the quality effect. This is obvious and it is worth stating because the tooling makes it easy to constrain things that did not need it. (2) DURING REASONING. Masking can force low-probability tokens and put the model off-distribution for everything after, and reasoning is where that costs most. The two-phase pattern - reason freely, constrain the answer - is strictly better than constraining throughout, so the case for full constraint on a reasoning task is weak. (3) WHEN THE PROVIDER DOES NOT EXPOSE LOGITS. Constrained decoding requires modifying the distribution at each step, which needs logit access or a provider-side implementation. With a hosted API that offers only a schema-conformance mode you are using their implementation, and with one that offers neither you are back to prompt-and-retry. This is a practical constraint that decides the matter more often than the theoretical arguments do. (4) WHEN THE FAILURE RATE IS ALREADY ACCEPTABLE AND THE COST IS NOT. Constrained decoding adds per-step work, requires grammar infrastructure, ties you to a tokenizer, and adds a component that can itself be wrong. If a fine-tuned model produces valid JSON 99.9% of the time and a retry handles the rest, the marginal value of a guarantee may not justify the machinery - though I would note the guarantee is worth more than the rate suggests when failures cluster on important inputs. THE ALTERNATIVES WORTH CONSIDERING FIRST. FINE-TUNING on the format, which is what SFT is best at and which reduces the failure rate substantially - and has the additional benefit of making any constraint you later add rarely bind, which removes the quality concern. PROMPT-AND-RETRY with the parse error fed back, which is simple and often sufficient. And SIMPLIFYING THE SCHEMA, which is under-used: a flat schema with short field names and no deep nesting is far easier for a model to produce correctly than an elaborate one, and much of the reliability problem is self-inflicted by schema design. WHERE I WOULD ALWAYS USE IT. Enumerated outputs and classification, where constraining to the label set is free - there is no reasoning to disturb and it removes an entire class of normalization work. And tool-call arguments once the tool is selected, where the schema is known and an invalid call is an exception in a loop. Those two are close to unconditional. THE FRAMING I WOULD OFFER. Constrained decoding solves one problem completely - syntactic validity - and its cost is a possible distributional effect whose size depends on how often the mask actually binds. So the question is not whether to use it but where, and the answer follows from where the mask would fire and whether reasoning is happening there."
        },
        {
          "q": "How would you design the schema itself?",
          "a": "THE SCHEMA IS PART OF THE PROMPT, which is the point people miss. Constrained decoding forces the output into the schema's shape, so whatever the schema makes easy to express is what you will get - a badly designed schema produces valid, useless output and the parse rate will not tell you. THE DESIGN RULES I WOULD APPLY. (1) MAKE THE FIELD NAMES DESCRIPTIVE. The model conditions on them, so `estimated_delivery_date` elicits better values than `d2`. This is free and it measurably matters. (2) PREFER ENUMS OVER FREE STRINGS wherever the value set is closed. An enum turns a generation problem into a selection problem, the grammar enforces it exactly, and downstream code stops needing normalization. This is the single highest-value schema decision. (3) ORDER THE FIELDS SO REASONING COMES FIRST. Generation is left-to-right and every field conditions on the ones before it, so a `reasoning` or `evidence` field placed before `answer` gives the model somewhere to compute; the same field placed after is decoration, because the answer is already committed. This is the two-phase idea expressed inside a single schema and it costs one line. (4) MAKE ABSENCE AND UNCERTAINTY EXPRESSIBLE. If the schema requires a value the model does not have, the constraint guarantees it will invent one - the grammar leaves no other legal path. So include nullable fields, an explicit `unknown` enum member, or a `confidence` field. THE ALTERNATIVE IS NOT ABSTENTION, IT IS FABRICATION, which is a direct consequence of masking rather than a model failing. (5) KEEP NESTING SHALLOW. Deep nesting costs stack depth in the parser, costs tokens, and gives more places for the model to lose track. Flat structures with enums outperform elaborate hierarchies in my experience. (6) AVOID CONSTRAINTS THE GRAMMAR CANNOT EXPRESS. A regex can enforce a date's SHAPE but not that it is in the future or that February has fewer than thirty days. Anything cross-field or semantic is validation, not grammar, and it belongs in code after parsing. THE PROCESS. Draft the schema, run it unconstrained first to see what the model naturally produces - that tells you where the schema fights the model - then constrain. And treat a schema change as invalidating your evaluation, because it changes the task."
        },
        {
          "q": "How does this lesson relate to the module's framing?",
          "a": "IT SITS SLIGHTLY APART FROM THE TWO-REGIME SPINE, and being honest about that is more useful than forcing it. Most of this module is about compute-bound training and bandwidth-bound inference. Structured output is not primarily a resource question - it is a CORRECTNESS-AND-INTERFACE question about what the model is allowed to emit. WHERE IT DOES CONNECT, and there are three genuine links. (1) IT IS AN INFERENCE-TIME INTERVENTION, applied in the decode loop, so it inherits that loop's economics. It adds per-step work - even cached, there is a mask to apply - and any technique operating per token is charged on every token forever, which is the inference regime's characteristic cost structure. The two-phase pattern is partly motivated by that: constrain a short span rather than the whole generation. (2) IT INTERACTS WITH THE DECODE PATH's other techniques. Masking composes with temperature and top-p because it applies before them. It interacts awkwardly with speculative decoding, since the draft must also respect the grammar or its proposals are wasted - and a draft that does not know the constraint has a much lower acceptance rate wherever the mask binds, which is a real and under-discussed interaction. And it has to survive batching, since different sequences in a batch are at different parser states, which means the allowed-set lookup is per sequence. (3) IT IS AN ALTERNATIVE TO SPENDING TRAINING COMPUTE. Fine-tuning the format in is a training-regime answer; constrained decoding is an inference-regime answer to the same requirement. That is the same cross-regime choice as distillation - pay once in training or pay per request at inference - and the analysis has the same shape: fine-tuning costs a run and makes the constraint rarely bind; constraining costs per-token work forever and guarantees the outcome. Doing both is usually right, and knowing they are substitutes for one requirement clarifies why. WHERE ITS OWN FRAMING IS BETTER. The distinction this lesson actually turns on is VALIDITY versus CORRECTNESS - the constraint moves one to its ceiling by construction and can only affect the other. That is the evaluation discipline the lesson exists to teach, and it is closer to the curriculum's recurring theme about measurement than to the resource framing. So I would present it as the module's interface lesson: everything else here is about making the model cheaper to train or serve, and this is about making its output usable by a program - which is a different kind of requirement that the module would be incomplete without."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Constrained decoding",
        "back": "At each step, maintain a parser state, compute the tokens that could continue a valid string, set every other logit to -inf, sample. Invalid output becomes IMPOSSIBLE rather than unlikely. The three levels: prompt+retry, fine-tune the format, constrain."
      },
      {
        "type": "formula",
        "front": "Masking is NOT conditioning",
        "back": "p_masked(x_t | x_<t) renormalizes over allowed tokens GREEDILY, with no lookahead. p(x_t | x_<t, sequence valid) would require marginalizing over all completions - intractable. So the mask can commit to a prefix from which every valid completion is poor."
      },
      {
        "type": "intuition",
        "front": "The mechanism by which constraining hurts",
        "back": "It can force a token the model gave LOW probability, so everything after is conditioned on a prefix the model considers unlikely - off-distribution, where quality degrades. Most visible on tasks where the model would naturally reason in text first."
      },
      {
        "type": "definition",
        "front": "The token-character mismatch",
        "back": "Grammars accept CHARACTERS, decoders emit TOKENS (multi-character, may straddle boundaries). A(s) = tokens whose characters keep the parse alive from state s. Naive = |V| x |token| work PER STEP; cached per state = a lookup. Also makes it TOKENIZER-dependent."
      },
      {
        "type": "pitfall",
        "front": "A 100% parse rate is the DEFINITION, not a result",
        "back": "Constraining sets validity to 1 by construction. The only quantity that can MOVE is semantic correctness given validity - so an evaluation reporting only parse rate has measured nothing about the trade."
      },
      {
        "type": "intuition",
        "front": "The two-phase pattern",
        "back": "Reason FREELY with no constraint, then constrain ONLY the final structured answer. The model reasons in the distribution it was trained on and the constrained span is short. Standard mitigation, and it sidesteps the whole quality debate."
      },
      {
        "type": "pitfall",
        "front": "A grammar cannot enforce SEMANTICS",
        "back": "It guarantees the output parses and types match. It cannot enforce that a number is in a sensible RANGE, that an identifier REFERS to something real, or that the values are TRUE. Post-parse validation is still required."
      },
      {
        "type": "intuition",
        "front": "The measurement that settles the quality debate for YOU",
        "back": "Log the PROBABILITY MASS the model assigned to tokens the constraint masked away. Near zero throughout = the constraint is INERT and no quality effect is possible. Frequently large = it is actively redirecting generation. A few lines, and it explains rather than detects."
      },
      {
        "type": "pitfall",
        "front": "The confound in the published comparisons",
        "back": "Studies vary the CONSTRAINT and the PROMPT together - asking for JSON changes the instruction, so the model may reason less because it was told to be compact. The fix is a four-arm design: free-form, JSON-prompted-unconstrained, JSON-prompted-CONSTRAINED, and two-phase."
      },
      {
        "type": "definition",
        "front": "Grammar power by format",
        "back": "REGEX / finite automaton: dates, enums, identifiers, flat formats. PUSHDOWN: JSON, because nesting needs a stack for matched braces. Full CFG: SQL, code, arbitrary structured languages."
      },
      {
        "type": "intuition",
        "front": "Tool calling is TWO problems",
        "back": "SELECTION (which tool, or none - effectively classification, and the harder one) and GENERATION (arguments matching that tool's schema - which constraining solves cleanly). Selection degrades with MANY tools and SIMILAR tools, and models tend to OVER-call."
      },
      {
        "type": "intuition",
        "front": "Fine-tuning makes the constraint rarely bind",
        "back": "If the model's unconstrained distribution already puts mass where the grammar allows, the mask seldom fires and the quality concern evaporates. The two are COMPLEMENTARY - a training-regime and an inference-regime answer to one requirement."
      }
    ],
    "refs": [
      {
        "title": "Willard & Louf (2023), Efficient Guided Generation for Large Language Models (Outlines)",
        "url": "https://arxiv.org/abs/2307.09702"
      },
      {
        "title": "Geng et al. (2023), Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning",
        "url": "https://arxiv.org/abs/2305.13971"
      },
      {
        "title": "Tam et al. (2024), Let Me Speak Freely? A Study on the Impact of Format Restrictions on LLM Performance",
        "url": "https://arxiv.org/abs/2408.02442"
      },
      {
        "title": "Beurer-Kellner et al. (2024), Guiding LLMs The Right Way: Fast, Non-Invasive Constrained Generation",
        "url": "https://arxiv.org/abs/2403.06988"
      },
      {
        "title": "Schick et al. (2023), Toolformer: Language Models Can Teach Themselves to Use Tools",
        "url": "https://arxiv.org/abs/2302.04761"
      }
    ],
    "demos": [
      "constrained-decoding",
      "guardrails",
      "decoding",
      "beam-search"
    ],
    "demoTitles": {
      "constrained-decoding": "Constrained Decoding",
      "guardrails": "Guardrails",
      "decoding": "Decoding Strategies",
      "beam-search": "Beam Search Tree"
    }
  }
};
