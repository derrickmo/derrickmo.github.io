// GENERATED from content/lessons/advanced-nlp/cot.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/cot/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "cot": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Two capabilities appeared at scale that nobody trained for directly. IN-CONTEXT LEARNING: put a few input-output examples in the prompt and the model performs the task, with no gradient step - the 'learning' happens entirely in the forward pass. CHAIN OF THOUGHT: ask the model to work through the problem before answering and accuracy on multi-step problems jumps dramatically, with PaLM-540B going from 17.9% to 56.9% on GSM8K grade-school maths purely from the prompt format.",
        "The natural interpretation is that the model is learning the task from the examples and then reasoning through the problem. Two experiments make that interpretation hard to sustain. Min et al. replaced the labels in the few-shot demonstrations with RANDOM ones - pairing each input with an incorrect class - and performance barely moved. What mattered was the label SPACE, the input distribution, and the FORMAT; the actual input-to-label mapping contributed little. And Turpin et al. biased models by always placing the correct answer at option (A) in the few-shot examples, then gave a test question where (A) was wrong. Accuracy fell by up to 36 points, the models followed the bias - and their chains of thought NEVER MENTIONED IT, instead constructing fluent, plausible justifications for the biased answer.",
        "So the honest framing is that chain of thought is a computational device, not a window. Generating intermediate tokens gives the model more forward passes to work with, lets it externalize state that would otherwise have to be held in a single activation, and conditions later tokens on earlier partial results - and that genuinely improves accuracy on problems requiring several steps. What it does not do is faithfully report the computation that produced the answer. Those are different claims, they are routinely conflated, and the difference matters enormously the moment you use a model's stated reasoning as evidence about its actual reasoning."
      ],
      "math": [
        {
          "h": "Why intermediate tokens add computation",
          "paras": [
            "A transformer answering directly must compute the answer within a fixed depth of L layers. Generating n intermediate tokens gives it n additional forward passes, each conditioned on everything written so far - so the effective serial computation available scales with the length of the reasoning, not just with depth."
          ],
          "tex": "\\text{direct: } \\;\\text{depth} = L \\qquad\\text{vs}\\qquad \\text{CoT: } \\;\\text{effective depth} \\approx L \\cdot n_{\\text{tokens}}",
          "texNote": "This is why CoT helps most on problems with inherent SERIAL structure - multi-step arithmetic, multi-hop inference - and helps little on problems solvable in one step. Theoretical work formalizes this: with a polynomial number of intermediate tokens, constant-depth transformers can express computations they provably cannot express in a single pass."
        },
        {
          "h": "Self-consistency: marginalize over reasoning paths",
          "paras": [
            "Greedy decoding commits to one chain. Sampling many chains and taking the majority vote on the FINAL ANSWER treats the reasoning path as a latent variable to be marginalized out - and it works because there are many ways to reach a correct answer and comparatively few ways to reach any specific wrong one."
          ],
          "tex": "\\hat{a} = \\arg\\max_{a} \\sum_{i=1}^{k} \\mathbb{1}\\big[\\mathrm{ans}(r_i) = a\\big], \\qquad r_i \\sim p_\\theta(\\cdot \\mid x), \\; T > 0",
          "texNote": "Wang et al. report roughly +18 points on GSM8K over greedy CoT with k ~ 40 samples. The cost is k forward passes, and the gain saturates around k = 20-40. Note it requires a comparable final answer, so it applies to tasks with extractable discrete answers, not open-ended generation."
        },
        {
          "h": "What the demonstrations actually contribute",
          "paras": [
            "Min et al. decomposed the few-shot prompt into four factors and ablated each. The input-label MAPPING - the thing everyone assumes is being learned - turned out to matter least."
          ],
          "tex": "p(y \\mid x, \\mathcal{D}) \\;\\text{ depends on }\\; \\{\\text{label space}, \\text{input distribution}, \\text{format}\\} \\;\\gg\\; \\{\\text{input-label mapping}\\}",
          "texNote": "Replacing every demonstration label with a random one costs only a few points on many classification tasks. The demonstrations are largely LOCATING a capability the model already has - specifying the output vocabulary and the response format - rather than teaching a new mapping."
        }
      ],
      "code": [
        {
          "h": "The faithfulness test you can run in an afternoon",
          "paras": [
            "This is the experiment that should change how you read a model's explanation. It requires no special access - only the ability to construct a biased prompt."
          ],
          "code": "# Turpin et al. (2023), \"Language Models Don't Always Say What They Think\"\n#\n# SETUP: few-shot examples where the correct answer is ALWAYS option (A).\n# Then a test question where (A) is wrong.\n\nbiased_prompt = few_shot_with_all_answers_at_A + test_question\nclean_prompt  = few_shot_with_shuffled_answers  + test_question\n\n#   accuracy, clean prompt ........ baseline\n#   accuracy, biased prompt ....... up to 36 points LOWER\n#   chains of thought that MENTION the position pattern ..... ~0\n#\n# The model's answer moved because of the position bias. Its stated reasoning\n# never referenced the bias - it produced a fluent, specific, plausible\n# justification for the biased answer instead. Not a refusal to explain, and\n# not an obviously bad explanation: a CONFABULATION.\n#\n# Same finding with a social-bias cue in the few-shot examples: the model\n# adopts the biased answer and explains it on other grounds.\n\n# THE THREE PRACTICAL TESTS for whether a CoT is load-bearing (Lanham et al.):\n#   1. TRUNCATE the chain and force an answer early. If the answer is\n#      unchanged, the later reasoning was not doing work.\n#   2. INJECT A MISTAKE mid-chain. If the final answer is unaffected, the\n#      chain is not being read by the rest of the computation.\n#   3. PARAPHRASE the chain. If the answer flips, it depended on surface form.\n#\n# Larger models were found to be LESS faithful by these tests on easier tasks -\n# they can reach the answer without the chain, so the chain becomes decoration.",
          "caption": "A model's answer shifts by up to 36 points under a position bias its chain of thought never mentions. Stated reasoning is a generated artifact, not a log of the computation - which is exactly what makes it unsafe as evidence."
        },
        {
          "h": "Self-consistency, and the confidence signal it gives you free",
          "paras": [
            "The accuracy gain is the headline, but the agreement RATE across sampled chains is a genuinely useful uncertainty estimate - one of the better ones available from a black-box model."
          ],
          "code": "from collections import Counter\n\ndef self_consistent_answer(prompt, k=20, temperature=0.7):\n    chains  = [generate(prompt, temperature=temperature) for _ in range(k)]\n    answers = [extract_final_answer(c) for c in chains]\n    counts  = Counter(a for a in answers if a is not None)\n    if not counts:\n        return None, 0.0\n    top, n = counts.most_common(1)[0]\n    return top, n / len(answers)          # agreement rate = confidence proxy\n\nanswer, agreement = self_consistent_answer(prompt)\nif agreement < 0.6:\n    answer = escalate_to_human(prompt)    # disagreement predicts error well\n\n# GSM8K, representative published numbers:\n#   greedy CoT ................. 56.5\n#   self-consistency, k=40 ..... 74.4\n#\n# Two caveats worth stating. (1) Cost is LINEAR in k - 40 samples is 40x the\n# inference bill, and the gain saturates around k=20-40. (2) It requires a\n# comparable discrete final answer, so it does not apply to open-ended text.\n#\n# And a limitation that matters more than either: majority voting over\n# reasoning paths does not make the reasoning FAITHFUL. It marginalizes over\n# sampling noise in the path, which improves the answer; it does nothing about\n# a systematic bias that shifts every sampled path in the same direction.",
          "caption": "Self-consistency buys ~18 points on GSM8K and an agreement-rate confidence signal for free. It corrects sampling noise in the reasoning path - not systematic bias, which moves every path together."
        }
      ],
      "useCases": [
        "Multi-step quantitative and logical problems - arithmetic word problems, unit conversions, date and schedule reasoning, multi-hop lookups - where the serial structure is exactly what intermediate tokens provide room for.",
        "Self-consistency for high-stakes single-answer questions, where the agreement rate across sampled chains doubles as a confidence estimate that can route low-agreement cases to human review.",
        "Prototyping and cold start: in-context learning gets a working system with zero labelled data and a minutes-long iteration loop, which is why almost every LLM feature begins as a prompt and is only later distilled into something cheaper.",
        "Generating reasoning traces as TRAINING DATA: sample chains, keep the ones that reach a verified-correct answer, and fine-tune on them. This bootstrapping loop (STaR and its descendants) is how much reasoning capability is now trained, and it sidesteps the faithfulness problem by only requiring the answer to be right."
      ],
      "pitfalls": [
        "Reading a chain of thought as an explanation. Models follow biases their stated reasoning never mentions - up to a 36-point accuracy shift from a position cue with essentially zero acknowledgement of it. The chain is generated text that looks like reasoning, not a log of the computation that produced the answer.",
        "Assuming demonstrations teach the input-label mapping. Replacing every demonstration label with a RANDOM one costs only a few points on many tasks. What the examples supply is the label space, the input distribution, and the format - they locate an existing capability rather than teaching a new one.",
        "Ignoring demonstration ORDER. Permuting the same few examples can move accuracy from near state-of-the-art to near chance on the same model and task. Report the variance across permutations, or you are reporting one lucky ordering.",
        "Expecting CoT to help below roughly 10B parameters. On small models it often HURTS, because they generate incoherent chains and then condition on them. The threshold is task-dependent and partly an artifact of how the metric is measured, but the practical implication holds.",
        "Using CoT on single-step tasks. It adds latency and cost and can reduce accuracy, because it introduces opportunities to talk yourself out of a correct immediate answer. Reserve it for problems with genuine serial structure.",
        "Treating self-consistency as a fix for unfaithful reasoning. It marginalizes over sampling noise in the path, which improves the answer; a systematic bias moves every sampled path the same way and survives the vote untouched.",
        "Deploying in-context learning where a few hundred labels exist. A fine-tuned small model will usually beat few-shot prompting, run far cheaper, and be more consistent. ICL's niche is genuinely zero-data or fast-changing tasks."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/interpretability",
          "text": "The faithfulness problem is precisely why mechanistic interpretability uses CAUSAL interventions rather than asking the model what it did - self-report is not evidence."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "Same structure as the artifact story: a model achieving the right output through a mechanism other than the one assumed, invisible to the metric being reported."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "CoT and in-context learning are the canonical 'emergent' capabilities, and whether emergence is real or an artifact of discontinuous metrics is an open and consequential argument."
        },
        {
          "ref": "rag-agents/agent-loops",
          "text": "ReAct and agent scaffolds are chain of thought with tool calls interleaved - the same mechanism, with external actions grounding the intermediate steps."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "A plausible-sounding chain is exactly the kind of output an LLM judge rewards, which is how style-over-substance bias and unfaithful reasoning compound."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is chain-of-thought prompting?",
          "a": "Prompting the model to produce intermediate reasoning steps before its answer. On GSM8K, PaLM-540B went from 17.9% to 56.9% purely from the prompt format."
        },
        {
          "q": "What is zero-shot CoT?",
          "a": "Appending 'Let's think step by step' with no worked examples. Substantially cheaper than few-shot CoT and recovers much of the gain (Kojima et al.)."
        },
        {
          "q": "Why do intermediate tokens help mechanically?",
          "a": "They add serial computation. A direct answer must be computed within L layers; n reasoning tokens give n additional forward passes, each conditioned on the partial result, so effective depth scales with chain length."
        },
        {
          "q": "When does CoT NOT help?",
          "a": "Single-step tasks, where it adds cost and can talk the model out of a correct immediate answer; and small models (below roughly 10B), where incoherent chains get conditioned on and hurt."
        },
        {
          "q": "What is self-consistency?",
          "a": "Sample k reasoning chains at temperature, then majority-vote on the FINAL ANSWER. About +18 points on GSM8K at k~40; the agreement rate is also a useful confidence estimate."
        },
        {
          "q": "Why does self-consistency work?",
          "a": "It marginalizes the reasoning path as a latent variable. There are many routes to a correct answer and comparatively few to any specific wrong one, so correct answers accumulate votes."
        },
        {
          "q": "What is in-context learning?",
          "a": "Performing a task from examples in the prompt, with no weight update. The adaptation happens entirely in the forward pass."
        },
        {
          "q": "What did Min et al. find about demonstrations?",
          "a": "Replacing every demonstration label with a RANDOM one barely hurts. The label space, input distribution, and format do the work; the input-label mapping contributes little."
        },
        {
          "q": "How sensitive is ICL to example order?",
          "a": "Severely. Permuting the same few examples can span near-state-of-the-art to near-chance on the same model and task, so a single ordering's result is not a measurement."
        },
        {
          "q": "What is the CoT faithfulness problem?",
          "a": "The stated reasoning does not reflect the actual computation. Biasing models with a position cue shifted accuracy by up to 36 points while the chains never mentioned the cue - they confabulated other justifications."
        },
        {
          "q": "How do you test whether a chain is load-bearing?",
          "a": "Truncate it and force an early answer; inject a mistake mid-chain; paraphrase it. If the final answer is unchanged, the chain was not doing the work."
        },
        {
          "q": "What is STaR-style bootstrapping?",
          "a": "Sample reasoning chains, keep only those reaching a verified-correct answer, fine-tune on them, repeat. It converts a prompting trick into trained capability and needs only the ANSWER to be checkable."
        }
      ],
      "standard": [
        {
          "q": "Explain chain-of-thought prompting: why it works, and what it does not tell you.",
          "a": "WHAT IT IS. Prompt the model to produce intermediate steps before the final answer, either by including worked examples (few-shot CoT, Wei et al.) or by simply appending 'Let's think step by step' (zero-shot CoT, Kojima et al.). The gains on multi-step problems are large - PaLM-540B on GSM8K went from 17.9% to 56.9% with no change to the model at all. WHY IT WORKS - three mechanisms, and they are separable. (1) MORE SERIAL COMPUTATION. A transformer producing an answer directly has L layers of depth to compute it in, full stop. Each generated token is another forward pass conditioned on everything written so far, so n reasoning tokens give roughly n times the serial computation. There is theoretical backing here: constant-depth transformers with a polynomial number of intermediate tokens can express computations provably outside their single-pass expressive class. This is the mechanism I would lead with, because it explains the pattern of when CoT helps. (2) EXTERNALIZED WORKING MEMORY. Intermediate results are written into the context and can be attended to later, rather than having to be maintained in a single activation vector through the remaining layers. For a problem with several intermediate quantities this is the difference between feasible and not. (3) DISTRIBUTION CONDITIONING. Text that reasons step by step is followed, in the training corpus, by correct conclusions more often than text that jumps to an answer. Producing reasoning-shaped tokens moves the model into a region of its distribution where correct answers are more likely. This is the least satisfying mechanism and probably contributes real effect. THE EVIDENCE FOR THE COMPUTATIONAL ACCOUNT. CoT helps most on problems with inherent serial structure and little on single-step problems - exactly what the depth argument predicts. Longer chains help more on harder problems. And there is the striking finding that FILLER TOKENS - meaningless padding - can recover part of the benefit on some tasks, which supports 'more compute' over 'better reasoning' as at least part of the story. WHAT IT DOES NOT TELL YOU, which is the important half. The chain is NOT a faithful account of how the answer was produced. Turpin et al. biased models by placing the correct answer at option (A) in every few-shot example, then tested on a question where (A) was wrong. Accuracy dropped by up to 36 points, models followed the bias, and their chains of thought essentially never mentioned it - instead producing fluent, specific justifications for the biased answer on entirely different grounds. That is confabulation, not a bad explanation. Lanham et al. made this measurable with three tests: truncate the chain and force an early answer, inject an error mid-chain, or paraphrase it - if the final answer is unchanged, the chain was not load-bearing. Their more uncomfortable finding is that LARGER models are often LESS faithful on easy tasks, because they can reach the answer without the chain, so the chain becomes post-hoc decoration. WHY THE DISTINCTION MATTERS PRACTICALLY. If you use CoT to IMPROVE ACCURACY, none of this is a problem - it works, use it. If you use CoT as an EXPLANATION - to audit a decision, to detect bias, to satisfy a transparency requirement, or to let a user verify the reasoning - then you are relying on a property it does not have, and the failure mode is a plausible-sounding justification for a decision made on other grounds. That is worse than no explanation, because it is convincing. The honest position is that chain of thought is a computational technique that happens to be human-readable, and readability is not faithfulness."
        },
        {
          "q": "How does in-context learning work, and what do the ablations tell us?",
          "a": "THE PHENOMENON. Put a few input-output examples in the prompt and the model performs the task on a new input, with no gradient update. GPT-3 made this the dominant interface, and it is genuinely strange: the adaptation happens entirely inside a forward pass over the context. WHAT THE ABLATIONS FOUND, which is where the interest is. Min et al. decomposed the demonstrations into four factors and ablated each. The headline: replacing every demonstration's label with a RANDOM one - deliberately pairing inputs with wrong labels - costs only a few points on many classification tasks. What DOES matter: (a) the LABEL SPACE, so the model knows the possible outputs; (b) the INPUT DISTRIBUTION, so it knows what kind of text it is dealing with; (c) the FORMAT, so it knows the response shape; and (d) the number of examples, with diminishing returns. The input-label MAPPING - the thing 'learning from examples' implies - contributes least. Lu et al. added the ORDER result: permuting the same examples can move a model from near state-of-the-art to near chance, which is not the behaviour of something learning a mapping. WHAT THAT IMPLIES. The demonstrations largely LOCATE a capability the model already has rather than teaching a new one - they specify the task, the vocabulary, and the format, and the model's pretrained knowledge does the rest. That reframes 'in-context learning' as 'task identification' for a large class of cases. THE IMPORTANT CAVEAT, because the story got more nuanced. This holds most strongly for tasks the model already knows. For genuinely NOVEL mappings - arbitrary or flipped label semantics - larger models CAN override their priors and learn the demonstrated mapping (Wei et al., 'Larger language models do in-context learning differently'). So there is a spectrum: small models rely almost entirely on priors and format, large models can genuinely use the mapping when it conflicts with what they expect. Both findings are real and the apparent contradiction is a scale effect. THE MECHANISTIC ACCOUNTS, none fully settled. (1) INDUCTION HEADS: attention heads implementing 'find the previous occurrence of the current token and copy what followed it'. Olsson et al. showed these form abruptly during training at the same point ICL ability appears, and ablating them damages it - the strongest mechanistic evidence available, though induction heads clearly do not explain all of ICL. (2) IMPLICIT GRADIENT DESCENT: several groups showed transformers CAN implement gradient descent on a linear model within their forward pass, and trained transformers on linear-regression tasks behave consistently with that. Elegant, demonstrated in toy settings, and the extent to which real LLMs do it is unresolved. (3) BAYESIAN TASK INFERENCE: the model treats the prompt as evidence about which latent task is being requested and conditions on the posterior. This matches the ablation results best - it explains why format and label space matter more than the mapping, since they are what identify the task. (4) The pretraining data's structure - documents containing repeated patterns and analogies - creates the pressure for these circuits. WHAT I TAKE FROM IT PRACTICALLY. (a) Spend effort on FORMAT and on choosing REPRESENTATIVE inputs, not only on label correctness. (b) Test multiple ORDERINGS and report the variance; a single ordering's number is not a measurement. (c) Retrieve demonstrations similar to the test input rather than using a fixed set - consistently helps. (d) If you have a few hundred labels, fine-tune instead; ICL's real niche is zero-data and fast iteration. (e) Do not describe ICL as 'the model learns from your examples' to stakeholders, because it sets an expectation the mechanism does not meet - it will not reliably absorb a correction you put in the prompt.",
          "deepDive": {
            "q": "Is 'emergence' at scale real, or an artifact of how capabilities are measured?",
            "a": "THE CLAIM. Certain capabilities - multi-step arithmetic, CoT benefit, some in-context learning - are absent in smaller models, appear abruptly beyond a parameter threshold, and cannot be predicted by extrapolating smaller models' performance. Wei et al. catalogued dozens of such curves and the framing became widespread, with real consequences: if capabilities appear discontinuously and unpredictably, then small-scale evaluation cannot tell you what a larger model will do, which is an argument about safety as much as about science. THE CHALLENGE (Schaeffer et al., 'Are Emergent Abilities of Large Language Models a Mirage?'). Emergence may be a property of the METRIC rather than of the model. The argument: many emergent capabilities are measured with DISCONTINUOUS, ALL-OR-NOTHING metrics - exact match on a multi-digit arithmetic answer, or accuracy on a task where every step must be right. Consider 5-digit addition scored by exact match. If per-digit accuracy improves smoothly from 0.7 to 0.9, exact-match accuracy on all five digits goes from 0.7^5 ~ 0.17 to 0.9^5 ~ 0.59 - and if per-digit accuracy is lower still, the exact-match curve looks flat and then explodes. The underlying capability improved SMOOTHLY; the metric manufactured the cliff. Their evidence: switching to continuous metrics on the same tasks and models - token edit distance, per-token accuracy, log-probability of the correct answer - makes the sharp transitions disappear and reveals smooth, predictable improvement. They also produce emergence artificially in vision models by choosing a discontinuous metric, showing the effect is metric-driven rather than domain-specific. WHERE THIS LEAVES THE ARGUMENT, honestly. The critique is correct that many published emergence curves are metric artifacts, and this is now widely accepted. It does not fully dissolve the phenomenon, for several reasons. (1) SOME transitions survive continuous metrics, and INDUCTION HEADS are the cleanest case - Olsson et al. observed a genuine phase change during training, visible as a bump in the loss curve, with a mechanistic correlate (the circuit forming) and a behavioural correlate (ICL appearing). That is a real discontinuity in the model, not in the measurement. (2) The metric-artifact argument explains why the CURVE looks sharp; it does not remove the fact that the model could not do the task at one scale and can at another. If exact-match on 5-digit addition is what your application needs, the practical discontinuity is real even if the underlying quantity moved smoothly. (3) Discontinuities in the LOSS LANDSCAPE and in learned circuits are documented independently - grokking is a related phenomenon where generalization appears long after memorization, with the loss showing a genuine phase transition. WHAT I THINK THE DEFENSIBLE SYNTHESIS IS. Underlying capabilities improve smoothly and predictably with scale, and this is well supported - scaling laws work. Many reported 'emergent' jumps are the composition of that smooth improvement with a thresholded metric. But circuits do form discretely during training, and downstream USABILITY genuinely is thresholded, because applications require tasks to be done correctly end to end rather than 80% correctly. WHY IT MATTERS BEYOND THE SEMANTICS. If emergence is a mirage, then small-scale experiments plus continuous metrics let you predict large-model behaviour, and evaluation should switch to continuous metrics wherever possible - which is good practice regardless. If some emergence is real, then there are capabilities you cannot anticipate before training, and safety evaluation must happen after training at scale. Both conclusions have teeth, and the practical recommendation is the same in either case: measure with continuous metrics so you can see the trend, AND evaluate at the scale you intend to deploy, because the thresholded version is what your users experience."
          }
        },
        {
          "q": "How would you make a model's reasoning more trustworthy given the faithfulness problem?",
          "a": "ACCEPT FIRST THAT YOU CANNOT MAKE FREE-FORM CoT FAITHFUL BY ASKING IT TO BE. The failure is not that the model is being evasive; it is that the text is generated by the same process that produced the answer and has no privileged access to that process. So the strategies are about making the reasoning VERIFIABLE or making it STRUCTURALLY LOAD-BEARING, not about improving the prose. STRATEGY 1 - MAKE THE REASONING EXECUTABLE. If the model writes CODE that computes the answer, the reasoning is checkable by running it. Program-aided language models (PAL) and program-of-thought do exactly this for quantitative problems, and the gain is twofold: arithmetic is delegated to an interpreter that does not make slips, and the trace is inspectable and re-runnable. Wherever the reasoning can be expressed as a computation, this is the strongest available answer. STRATEGY 2 - GROUND EACH STEP IN RETRIEVAL OR TOOLS. In a ReAct-style loop the model alternates reasoning with actions - search, lookup, calculation - and each intermediate claim is anchored to a retrieved source or a tool result. You can then verify the intermediate steps independently of the model's narration of them. This does not make the model's internal process transparent, but it makes the CLAIMS checkable, which is usually what you actually needed. STRATEGY 3 - FORCE THE CHAIN TO BE LOAD-BEARING. Decompose the problem so each step's output is the literal input to the next, with the model unable to see the whole problem at once. Least-to-most prompting and explicit decomposition pipelines do this. If a step's output is what the next step consumes, the chain cannot be decorative - and Lanham et al.'s truncation test is the way to verify you achieved it. STRATEGY 4 - VERIFY INSTEAD OF TRUSTING. Train or prompt a separate VERIFIER to check each step or the final answer. Process-supervised reward models score each reasoning step rather than only the outcome, and were shown to outperform outcome supervision on maths - which is notable because it means grading the process is trainable even though self-reported process is unreliable. Independent verification is the general principle: never let the same forward pass both produce and certify. STRATEGY 5 - MEASURE FAITHFULNESS ROUTINELY. Make the three tests part of evaluation: truncate the chain and check whether the answer changes; inject a mistake mid-chain and check whether the answer follows it; paraphrase the chain and check for flips. Also run counterfactual bias tests - reorder options, change irrelevant surface features, insert the Turpin-style position cue - and measure how much the answer moves. A faithfulness score belongs in your evaluation table next to accuracy. STRATEGY 6 - USE CONSISTENCY AS A SIGNAL. Self-consistency's agreement rate is a decent uncertainty estimate; low agreement should route to human review. Note again that it corrects sampling noise, not systematic bias. WHAT I WOULD TELL A PRODUCT TEAM, plainly. Do not show a chain of thought to users as an EXPLANATION of why the system decided something, especially in any setting with fairness or compliance stakes - it will be fluent, specific, and potentially unrelated to the actual cause, which is worse than showing nothing because it is convincing. Do show retrieved SOURCES, executed CODE, and tool RESULTS, because those are verifiable artifacts. Use CoT internally to improve accuracy, which it genuinely does. And if a regulatory requirement demands an explanation of the decision, an unfaithful narration does not satisfy it in substance even if it satisfies it in form - which is a point worth raising before it becomes someone else's problem."
        },
        {
          "q": "When should you use in-context learning versus fine-tuning?",
          "a": "THE VARIABLES ARE: how much labelled data exists, how often the task changes, how much volume you serve, and how tightly you need to control behaviour. IN-CONTEXT LEARNING WINS WHEN. (1) You have NO LABELLED DATA or a handful of examples. Below roughly 100 examples, no gradient method beats a good prompt. (2) The task CHANGES FREQUENTLY - iteration is seconds, and there is no retraining, no evaluation gate, no deployment. This is often the decisive practical factor. (3) You need MANY DIFFERENT TASKS from one model, and maintaining a fine-tune per task is not worth it. (4) The task is OPEN-ENDED or the label space is not fixed. (5) You are still discovering what the task IS, which is most of the early life of any feature - prompting lets you find the specification before committing to it. (6) You need the model's general world knowledge and reasoning, not just a mapping. FINE-TUNING WINS WHEN. (1) You have THOUSANDS of labelled examples - it will beat prompting on accuracy, usually comfortably. (2) VOLUME IS HIGH: prompts consume input tokens on every call, and a long few-shot prompt can dominate the bill; a fine-tuned model needs only the input. At scale this alone justifies it. (3) LATENCY MATTERS - a shorter prompt is a faster prefill, and a fine-tuned SMALL model beats a prompted large one on both latency and cost. (4) You need CONSISTENCY. Prompted behaviour varies with example order, phrasing, and model version; fine-tuned behaviour is baked in and versioned. (5) The task needs a SPECIALIZED FORMAT or domain conventions that are tedious to specify in a prompt and easy to demonstrate in bulk. (6) The behaviour must be RELIABLE against adversarial or unusual input, where prompt instructions can be talked around. THE ECONOMICS, which usually decide it. Fine-tuning costs a one-off training run plus ongoing maintenance - re-evaluation, versioning, and redoing it when the base model changes. ICL costs input tokens on every single request, forever. The crossover is a straightforward calculation: if a few-shot prompt adds 2,000 tokens per call and you serve a million calls a month, that is 2 billion tokens of pure overhead, which dwarfs any fine-tuning cost. Teams frequently fail to run this calculation and are surprised by the bill. THE MIDDLE OPTIONS worth naming, because the question is usually a false binary. PEFT gets fine-tuning's benefits at a fraction of the cost and lets you keep one base model with swappable adapters. PROMPT TUNING learns soft prompt embeddings - between the two in cost and capability. RETRIEVAL-AUGMENTED ICL selects demonstrations per query from a labelled pool, which uses your data without training and is consistently better than a fixed demonstration set. WHAT I ACTUALLY RECOMMEND, because it is a sequence rather than a fork: start with ICL to establish feasibility and discover the real specification. Log everything. Use the prompted system to LABEL data, with human review of a sample. Once volume or accuracy justifies it, fine-tune a smaller model on those labels and deploy that, keeping the large prompted model for the low-confidence tail and for new capabilities. This gets the LLM's flexibility during development and the small model's economics in production, and it treats the labelled dataset as the durable asset - which it is, since it survives every model change while a prompt does not."
        },
        {
          "q": "Your CoT-prompted model gets arithmetic wrong in the middle of otherwise correct reasoning. What do you do?",
          "a": "THIS IS THE MOST COMMON AND MOST FIXABLE CoT FAILURE, and the fix is to stop asking the model to do arithmetic. WHY IT HAPPENS. Language models compute arithmetic through learned pattern-matching over token sequences, not through an algorithm. Several things make it fragile: TOKENIZATION splits numbers inconsistently, so '1234' may be one token in one context and '12'+'34' in another, which makes digit alignment something the model must learn separately for every splitting pattern; carries require serial dependency across digit positions that a fixed-depth forward pass handles poorly; and larger or unusual numbers are rarer in training. The characteristic signature is exactly what you describe - correct setup, correct approach, correct final step, and a wrong multiplication in the middle. THE PRIMARY FIX - DELEGATE THE COMPUTATION. Program-aided approaches (PAL, program-of-thought) have the model write CODE expressing the reasoning and execute it. The model does what it is good at - understanding the problem and translating it into operations - and the interpreter does what it is good at, which is arithmetic. The gains on GSM8K-style benchmarks are substantial and the failure mode largely disappears, because the model is no longer computing anything. Equivalently, give it a calculator tool and require its use for every operation. If you take one thing from this question, it is this: a language model should never be the arithmetic unit in a system that has an arithmetic unit available. SECONDARY MITIGATIONS, for when tools are not available. (1) SELF-CONSISTENCY: sample k chains and majority-vote. Arithmetic slips are largely random rather than systematic, so they rarely coincide across samples, which is exactly the error type voting fixes best. (2) FORCE FINER-GRAINED STEPS - one operation per line, with intermediate results written explicitly. This both adds serial computation and makes errors localizable. (3) A VERIFIER PASS: have the model check each step, or use a separate model to. Process-supervised verifiers that score individual steps outperform outcome-only supervision on maths, and they catch exactly this failure. (4) UNIT AND SANITY CHECKS in the prompt - order of magnitude, units consistency, plausibility of the answer. (5) For simple cases, post-hoc extraction and re-computation: parse the arithmetic expressions out of the chain and evaluate them, flagging disagreements. HOW I WOULD DIAGNOSE IT PROPERLY FIRST, because 'gets arithmetic wrong' has sub-types with different fixes. Sample fifty failures and classify: is it single-operation errors (a wrong multiplication), carry or digit-alignment errors (right method, digits misaligned), transcription errors (a correct intermediate result copied wrong into the next step), or SETUP errors (the arithmetic is executed correctly but the wrong quantities were chosen)? Only the first three are fixed by delegating computation. Setup errors are comprehension failures and need better prompting, decomposition, or a stronger model - and mistaking one for the other means adding a calculator and seeing no improvement. THE SYSTEM-DESIGN POINT worth making: this is a specific instance of the general rule that you should give a language model TOOLS for anything with a deterministic correct answer - arithmetic, date computation, unit conversion, database lookup, string manipulation. Prompting a model to be more careful about arithmetic is optimizing the wrong component. The right architecture uses the model for language and judgement and delegates computation to things that compute, and the same reasoning applies to every deterministic subtask in the pipeline."
        },
        {
          "q": "What is the relationship between chain-of-thought and modern reasoning models?",
          "a": "THE LINEAGE IS DIRECT. Chain of thought began as a PROMPTING trick - discovered in 2022, requiring no model change, and producing large gains on multi-step problems. Reasoning models are what happened when the field decided to TRAIN the capability rather than elicit it. THE INTERMEDIATE STEP - BOOTSTRAPPING. STaR (Zelikman et al.) established the loop: prompt the model to produce reasoning chains, KEEP ONLY those that reach a verified-correct answer, fine-tune on them, and repeat. The elegance is that it needs only the final answer to be checkable, not the reasoning - which neatly sidesteps the faithfulness problem, since you never have to certify the chain, only the outcome. Rejection-sampling fine-tuning generalized this and it became standard practice. WHAT CHANGED WITH REASONING MODELS. (1) RL ON OUTCOMES AT SCALE. Rather than supervised fine-tuning on filtered chains, train with reinforcement learning where the reward is whether the final answer is correct (verifiable in maths, code, and formal domains). The model discovers reasoning strategies rather than imitating demonstrated ones, and the strategies that emerge - backtracking, self-checking, trying an alternative approach, explicitly noticing an error - were not designed in. (2) INFERENCE-TIME COMPUTE AS A SCALING AXIS. The striking empirical result is that accuracy improves predictably with the LENGTH of the reasoning process, giving a second scaling dimension alongside parameters and training data. You can now buy accuracy with inference tokens, which changes the deployment economics of the whole field. (3) PROCESS SUPERVISION: reward models that score each reasoning STEP rather than only the outcome, which was shown to outperform outcome supervision on maths and gives a denser training signal. (4) LONG COHERENT TRACES - thousands of tokens of exploration, far beyond what prompted CoT produced, with the model spending compute on approaches it eventually abandons. WHAT STAYED THE SAME. The underlying mechanism is unchanged: intermediate tokens buy serial computation and externalize working state. Reasoning models do more of it, better, because they were trained to rather than asked to. The faithfulness question also stayed the same and arguably got sharper - a long reasoning trace optimized against outcome reward has no pressure toward being an accurate account of the computation, only toward reaching correct answers. Several labs treat the raw trace as something not to expose to users, partly for competitive reasons and partly because it is not a clean explanation. WHAT THIS IMPLIES PRACTICALLY. (1) For maths, code, and logic, use a reasoning model rather than prompting a general model to think step by step - the trained version is substantially better and you no longer need CoT prompting techniques for it. (2) They are SLOW AND EXPENSIVE, since they generate many tokens before answering, so they are wrong for latency-sensitive or simple tasks. Route by difficulty. (3) Their advantage is concentrated in VERIFIABLE domains, because that is where outcome-based RL has a reward signal. On open-ended writing, summarization, or judgement the gains are much smaller - which follows directly from how they were trained and is worth stating when someone proposes using one for everything. (4) 'Reasoning effort' is becoming a tunable knob, which makes accuracy-versus-cost a per-request decision rather than a model-selection decision. THE ARC WORTH NAMING, because it recurs: a capability was first ELICITED by prompting, then DISTILLED into weights by fine-tuning on filtered outputs, then OPTIMIZED directly with RL against a verifiable objective. The same arc ran through instruction following and tool use, and it is a reasonable prior for whatever the next prompting trick turns out to be."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Chain-of-thought prompting",
        "back": "Prompt for intermediate steps before the answer. PaLM-540B on GSM8K: 17.9% -> 56.9% from the prompt format alone. Zero-shot variant: 'Let's think step by step'."
      },
      {
        "type": "intuition",
        "front": "Why intermediate tokens help",
        "back": "They add SERIAL COMPUTATION. A direct answer must be computed in L layers; n reasoning tokens give n more forward passes, each conditioned on the partial result. Explains why CoT helps on multi-step and not single-step problems."
      },
      {
        "type": "pitfall",
        "front": "CoT is not an explanation",
        "back": "Turpin et al.: bias the few-shot examples so the answer is always (A), and accuracy drops up to 36 points while the chains essentially NEVER mention the cue - they confabulate other justifications. Generated text that looks like reasoning, not a log of it."
      },
      {
        "type": "definition",
        "front": "Testing whether a chain is load-bearing",
        "back": "TRUNCATE it and force an early answer; INJECT a mistake mid-chain; PARAPHRASE it. If the final answer does not change, the chain was decoration. Larger models are often LESS faithful on easy tasks - they don't need the chain."
      },
      {
        "type": "definition",
        "front": "Self-consistency",
        "back": "Sample k chains at temperature, majority-vote the FINAL ANSWER (~+18 pts on GSM8K at k=40). Works because many paths reach a correct answer and few reach any specific wrong one. Agreement rate = a free confidence estimate."
      },
      {
        "type": "pitfall",
        "front": "Self-consistency does not fix unfaithfulness",
        "back": "It marginalizes SAMPLING NOISE in the reasoning path. A systematic bias shifts every sampled path in the same direction and survives the vote untouched."
      },
      {
        "type": "pitfall",
        "front": "Random demonstration labels barely hurt",
        "back": "Min et al.: replacing every few-shot label with a wrong one costs a few points. What matters is the LABEL SPACE, INPUT DISTRIBUTION, and FORMAT. Demonstrations largely LOCATE an existing capability rather than teach a mapping."
      },
      {
        "type": "pitfall",
        "front": "Demonstration order sensitivity",
        "back": "Permuting the same few examples can span near-SOTA to near-chance on the same model and task. Report variance across permutations, or you are reporting one lucky ordering."
      },
      {
        "type": "definition",
        "front": "Induction heads",
        "back": "Attention heads implementing 'find the previous occurrence of this token and copy what followed'. They form ABRUPTLY during training at the same point ICL appears, and ablating them damages it - the strongest mechanistic evidence for ICL."
      },
      {
        "type": "intuition",
        "front": "Is emergence real?",
        "back": "Many emergence curves are METRIC artifacts - exact-match on multi-step tasks turns smooth per-step improvement into a cliff (0.7^5=0.17 -> 0.9^5=0.59). Continuous metrics flatten most of them. But induction-head formation is a genuine phase change, and thresholded USABILITY is real regardless."
      },
      {
        "type": "intuition",
        "front": "Fix arithmetic errors by delegating",
        "back": "Don't prompt the model to be careful - have it write CODE and execute it (PAL), or give it a calculator. Models compute arithmetic by pattern-matching over inconsistently-tokenized digits. Never make an LLM the arithmetic unit when one is available."
      },
      {
        "type": "definition",
        "front": "STaR bootstrapping",
        "back": "Sample chains, KEEP only those reaching a verified-correct answer, fine-tune on them, repeat. Needs only the ANSWER to be checkable, not the reasoning. The bridge from CoT-as-prompting to reasoning models trained with outcome-based RL."
      }
    ],
    "refs": [
      {
        "title": "Wei et al. (2022), Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        "url": "https://arxiv.org/abs/2201.11903"
      },
      {
        "title": "Min et al. (2022), Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?",
        "url": "https://arxiv.org/abs/2202.12837"
      },
      {
        "title": "Turpin et al. (2023), Language Models Don't Always Say What They Think",
        "url": "https://arxiv.org/abs/2305.04388"
      },
      {
        "title": "Wang et al. (2023), Self-Consistency Improves Chain of Thought Reasoning",
        "url": "https://arxiv.org/abs/2203.11171"
      },
      {
        "title": "Schaeffer et al. (2023), Are Emergent Abilities of Large Language Models a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      }
    ],
    "demos": [
      "self-consistency",
      "decoding",
      "constrained-decoding",
      "react-agent"
    ],
    "demoTitles": {
      "self-consistency": "Self-Consistency",
      "decoding": "Decoding Strategies",
      "constrained-decoding": "Constrained Decoding",
      "react-agent": "ReAct — Reason + Act"
    }
  }
};
