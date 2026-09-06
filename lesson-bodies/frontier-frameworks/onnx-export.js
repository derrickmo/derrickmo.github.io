// GENERATED from content/lessons/frontier-frameworks/onnx-export.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/onnx-export/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "onnx-export": {
    "level": "core",
    "body": {
      "intuition": [
        "Every model export format is three things: a GRAPH, an OPSET, and a PARITY CHECK. The graph is an intermediate representation of the computation as nodes and edges. The opset is a contract stating which operations the target runtime is guaranteed to understand. And parity is the only way you find out whether the exported thing computes what the original did. ONNX, TorchScript, TFLite, CoreML and StableHLO are five instances of that structure, which is why understanding the structure beats learning any one of their APIs.",
        "The parity check is the part that gets skipped, and it is the only one that can catch a correctness failure. Exporting a small network produced a five-node graph, and a from-scratch interpreter running that graph reproduced the original framework's outputs to about 6 times 10 to the minus 6, with predictions agreeing exactly. That is what 'the export worked' should mean. 'It exported without raising an error' means only that the tracer completed - which is a much weaker statement and the one people usually settle for.",
        "The opset is a contract, and the useful demonstration is what happens when it is violated: exporting a model containing an operation outside the opset REFUSED rather than silently substituting an approximation. That refusal is the feature. A tool that quietly replaces an unsupported activation with a near-equivalent produces a model that runs, returns plausible numbers, and is subtly wrong - a failure that surfaces as a mysterious quality regression in production rather than as an error at build time."
      ],
      "math": [
        {
          "h": "Parity is the export correctness check",
          "paras": [
            "Run both the original and the exported graph on the same inputs and compare.",
            "Agreement to floating-point noise is the evidence that the export is faithful."
          ],
          "tex": "\\max_i \\big| y^{\\text{exported}}_i - y^{\\text{original}}_i \\big| \\approx 6\\times10^{-6}, \\qquad \\text{prediction agreement} = 1.000",
          "texNote": "Two numbers, because they answer different questions. The maximum absolute difference says the numerics are faithful; the prediction agreement says the decisions are identical. Small numeric drift with identical decisions is the normal and acceptable outcome, and the pair distinguishes it from the case where drift has become large enough to flip an argmax - which a tolerance check alone would let through."
        },
        {
          "h": "The opset is a contract, and violation should REFUSE",
          "paras": [
            "Export succeeds only if every operation in the graph has a definition the target understands.",
            "The alternative to refusing is silently substituting, which is worse."
          ],
          "tex": "\\text{export ok} \\iff \\text{ops}(\\text{graph}) \\subseteq \\text{opset}(v), \\qquad \\text{unsupported} \\Rightarrow \\textbf{refuse}, \\text{ not approximate}",
          "texNote": "A refusal at build time is a cheap, loud failure. A silent substitution - replacing an unsupported activation with something close - produces a model that runs, returns plausible numbers and is subtly wrong, which surfaces in production as an unexplained quality regression. The opset version is also why exported models pin a version: the same graph against a different opset is a different contract."
        },
        {
          "h": "Quantized export - drift without decision change",
          "paras": [
            "Integer weights are smaller and the outputs move slightly.",
            "Whether that matters depends entirely on what consumes the output."
          ],
          "tex": "\\text{size} \\;\\downarrow 3.6\\times, \\qquad \\text{accuracy } 0.912 \\to 0.914, \\qquad \\text{logits DRIFT, } \\arg\\max \\text{ unchanged}",
          "texNote": "The accuracy moving slightly UP is within noise and is the honest reading - quantization did not help, it did not measurably hurt. The important observation is the last clause: the logits changed and the decisions did not, because argmax is a step function and the drift was smaller than the margin. That is reassuring for a classifier and it is exactly the property that makes accuracy blind to quantization damage in a GENERATIVE model, where you sample from the distribution and errors compound."
        }
      ],
      "code": [
        {
          "h": "Graph, opset, parity - the three things every export format is",
          "paras": [
            "Building the IR and an interpreter by hand is what makes the structure visible."
          ],
          "code": "# 1. THE GRAPH - an IR of nodes and edges. Exporting a small MLP gave\n#    a FIVE-NODE graph, with framework ops mapped to opset ops:\n#      Linear -> Gemm      ReLU -> Relu\n#    The mapping is the interesting part: the export format has its own\n#    vocabulary, and your framework's op must translate into it.\n\n# 2. ★ THE PARITY CHECK - the only step that can catch a CORRECTNESS\n#    failure, and the one that gets skipped:\ny_ref = torch_model(x)\ny_exp = interpret(graph, x)          # a from-scratch interpreter\nprint(abs(y_exp - y_ref).max())      # 6e-6   <- numerics faithful\nprint((y_exp.argmax(-1) == y_ref.argmax(-1)).mean())   # 1.000\n#    ★ TWO numbers because they answer DIFFERENT questions: drift says\n#      the arithmetic matches; agreement says the DECISIONS match.\n#      Small drift + identical decisions is the normal good outcome.\n#    ⚠ \"It exported without an error\" only means the TRACER completed.\n\n# 3. ★ THE OPSET IS A CONTRACT. An op outside it made export REFUSE:\n#      GELU not in opset  ->  export FAILS, loudly, at build time\n#    THAT REFUSAL IS THE FEATURE. The alternative - silently swapping\n#    in a near-equivalent - gives you a model that RUNS, returns\n#    PLAUSIBLE numbers, and is subtly wrong. That surfaces as an\n#    unexplained quality regression in production, weeks later, with\n#    no error to grep for.\n#    (It is also why exports pin an opset VERSION: the same graph\n#     against a different opset is a different contract.)",
          "caption": "A refusal at build time is a cheap loud failure; a silent substitution is a correctness bug that surfaces as a mysterious regression weeks later."
        },
        {
          "h": "Quantized runtime - and the caveat that decides whether it is safe",
          "paras": [
            "The measured result is reassuring, and the reason it is reassuring does not generalize."
          ],
          "code": "# MEASURED, int8 weights in the exported runtime:\n#   size        3.6x smaller\n#   accuracy    0.912 -> 0.914     (up slightly = WITHIN NOISE; the\n#                                   honest reading is \"no measurable\n#                                   change\", not \"quantization helped\")\n#   logits      DRIFT\n#   decisions   UNCHANGED\n\n# ★ WHY DECISIONS SURVIVED: argmax is a STEP FUNCTION, and the drift\n#   was smaller than the margin between the top two logits. Nothing\n#   flipped.\n#\n# ⚠ AND THAT IS EXACTLY WHY IT DOESN'T GENERALIZE. For a CLASSIFIER,\n#   \"logits drift, argmax holds\" is a safe result. For a GENERATIVE\n#   model you SAMPLE from the distribution, so drift changes which\n#   tokens can appear - and errors COMPOUND over hundreds of\n#   autoregressive steps (17-06). The same measurement that reassures\n#   here is the one that hides quantization damage there.\n\n# SO THE EXPORT CHECKLIST DEPENDS ON THE CONSUMER:\n#   classifier   -> parity on logits + agreement on argmax  ✓ enough\n#   generative   -> ALSO perplexity, long-output generation, and\n#                   sampling at the deployed temperature\n#   regression   -> parity on the VALUES; there is no argmax to hide\n#                   drift behind, so the tolerance IS the metric\n\n# AND THE OPERATIONAL ONES that are easy to forget:\n#   dynamic axes declared (or the export bakes in the batch size)\n#   preprocessing INSIDE or OUTSIDE the graph - decide and document\n#   the opset version PINNED alongside the artifact",
          "caption": "\"Logits drift, decisions don't\" is a safe result for a classifier and the exact blind spot that hides quantization damage in a generative model."
        }
      ],
      "useCases": [
        "Moving a trained model to a different runtime or language, where the graph-plus-opset structure is what makes the handoff possible at all.",
        "Deploying to constrained targets - mobile, embedded, browser - where a quantized exported runtime is often the only way the model fits.",
        "Decoupling training and serving stacks, so the serving side is not pinned to the training framework's version.",
        "Verifying that an optimization or conversion preserved behaviour, which the parity check answers directly and 'it ran' does not."
      ],
      "pitfalls": [
        "Treating a successful export as a successful conversion. It means the tracer completed; only a parity check tells you the exported graph computes the same thing.",
        "Checking numeric tolerance without checking decisions. Small drift with identical predictions is fine, and the pair distinguishes it from drift large enough to flip an argmax.",
        "Wanting the exporter to substitute unsupported operations. A refusal at build time is loud and cheap; a silent approximation is a correctness bug that surfaces as a quality regression weeks later.",
        "Not pinning the opset version with the artifact. The same graph against a different opset is a different contract, and behaviour can change underneath you.",
        "Generalizing 'logits drift but decisions do not' beyond classifiers. Generative models sample from the distribution and compound errors, so that reassuring result is exactly the blind spot there.",
        "Forgetting dynamic axes. An export without them bakes in the traced batch size or sequence length, which fails at the first differently-shaped input.",
        "Leaving preprocessing ambiguous. Whether normalization lives inside or outside the graph is a decision that silently produces wrong answers if the serving side assumes the other one."
      ],
      "connections": [
        {
          "ref": "mlops/torchscript-onnx",
          "text": "The production context for this - tracing versus scripting, versioning the artifact, and the serving stack the export feeds."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Why accuracy is a step function and cannot see distributional damage - the same mechanism that makes the classifier result reassuring and the generative case dangerous."
        },
        {
          "ref": "pytorch-internals/torchscript",
          "text": "Tracing versus scripting, and the failure where a trace bakes in the path taken at one input while scripting refuses instead."
        },
        {
          "ref": "frontier-frameworks/torch-compile-triton",
          "text": "The other consumer of a captured graph - a compiler optimizing it in place rather than an exporter shipping it elsewhere."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Where the exported artifact goes, including versioning, warmup and the operational concerns that outlive any particular export format."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is every export format, structurally?",
          "a": "A graph, an opset, and a parity check. ONNX, TorchScript, TFLite, CoreML and StableHLO are five instances of that structure."
        },
        {
          "q": "What does a successful export actually tell you?",
          "a": "That the tracer completed. It says nothing about whether the exported graph computes the same thing."
        },
        {
          "q": "What is the parity check?",
          "a": "Run both the original and the exported graph on the same inputs and compare - here, maximum difference 6e-6 with predictions agreeing exactly."
        },
        {
          "q": "Why report two numbers?",
          "a": "Drift says the arithmetic matches; agreement says the decisions match. Small drift with identical decisions is the normal good outcome."
        },
        {
          "q": "What is an opset?",
          "a": "A contract stating which operations the target runtime is guaranteed to understand. Export succeeds only if every op in the graph is in it."
        },
        {
          "q": "What happened with an unsupported operation?",
          "a": "Export refused, loudly, at build time - rather than silently substituting an approximation."
        },
        {
          "q": "Why is refusing better?",
          "a": "A silent substitution produces a model that runs, returns plausible numbers and is subtly wrong, surfacing as a quality regression with no error to find."
        },
        {
          "q": "Why pin the opset version?",
          "a": "The same graph against a different opset is a different contract, so behaviour can change underneath you without the artifact changing."
        },
        {
          "q": "What did int8 export measure?",
          "a": "3.6 times smaller, accuracy 0.912 to 0.914 - within noise - with logits drifting and decisions unchanged."
        },
        {
          "q": "Why did decisions survive the drift?",
          "a": "Argmax is a step function, and the drift was smaller than the margin between the top two logits, so nothing flipped."
        },
        {
          "q": "When does that reassurance fail?",
          "a": "For generative models. You sample from the distribution, so drift changes which tokens can appear and errors compound over many steps."
        },
        {
          "q": "What operational details are easy to forget?",
          "a": "Declaring dynamic axes, deciding whether preprocessing is inside or outside the graph, and pinning the opset version with the artifact."
        }
      ],
      "standard": [
        {
          "q": "How would you export a model and know that the export is correct?",
          "a": "BY TREATING EXPORT AS THREE THINGS AND CHECKING THE THIRD, because the first two are what tools give you and the third is what tells you it worked. THE THREE THINGS: a GRAPH - an IR of nodes and edges representing the computation; an OPSET - a contract about which operations the target runtime understands; and a PARITY CHECK - a comparison of outputs between the original and the export. Every export format is these three, which is why the structure transfers across ONNX, TorchScript, TFLite, CoreML and whatever comes next. WHAT EXPORT ACTUALLY DOES. It maps your framework's operations into the target's vocabulary - a Linear becomes a Gemm, a ReLU becomes a Relu - and produces a graph. Exporting a small network gave five nodes. The mapping is where the interesting failures live, because the target has its own vocabulary and your operation must translate into it. THE PARITY CHECK, which is the answer to the question. Run both on the same inputs and report TWO numbers: the maximum absolute difference in outputs, which was about 6e-6, and the prediction agreement, which was exactly 1.0. Two numbers because they answer different questions - drift says the arithmetic is faithful, agreement says the decisions are identical, and small drift with identical decisions is the normal acceptable outcome. Reporting only a tolerance would let through a case where drift had grown large enough to flip an argmax. WHY 'IT EXPORTED' IS NOT ENOUGH. That statement means the tracer completed. It does not mean the graph computes what the original computed, and there are several ways for those to differ: a traced control-flow path baked in, a missing dynamic axis, a subtle difference in an operator's semantics between frameworks, or preprocessing that lives on the wrong side of the boundary. All of those produce a model that runs. THE OPSET AS A CONTRACT, and the demonstration that matters: an operation outside the opset made export REFUSE rather than substitute. That refusal is the feature. A tool that silently replaces an unsupported activation with a near-equivalent gives you something that runs, returns plausible numbers and is subtly wrong - which surfaces weeks later as an unexplained quality regression with no error to grep for. Cheap loud failure beats expensive quiet failure, and it is worth choosing tools on that basis. WHAT ELSE I WOULD CHECK BEFORE SHIPPING: dynamic axes declared, so the export does not bake in the traced batch size or sequence length; preprocessing decided and documented as inside or outside the graph; the opset version pinned alongside the artifact; and parity re-verified on a REALISTIC input distribution rather than one random tensor, because a single input can pass while an edge case diverges.",
          "deepDive": {
            "q": "The exported model gives slightly different outputs. Is that a problem?",
            "a": "IT DEPENDS ENTIRELY ON WHAT CONSUMES THE OUTPUT, and that is the whole answer - the same drift is harmless in one setting and disqualifying in another. FIRST, ESTABLISH THE SCALE. A maximum absolute difference around 1e-6 is floating-point noise from a different operation order, a fused kernel, or a different accumulation precision. That is expected and unavoidable. A difference around 1e-2 is not noise and points at a real semantic difference - a different default in an operator, a padding convention, an epsilon in a normalization layer, or a substituted operation. So the magnitude tells you which conversation you are having. THEN ASK WHO CONSUMES IT. For a CLASSIFIER, what matters is the argmax, and the measured case is the reassuring one: logits drifted, decisions were identical, because argmax is a step function and the drift was smaller than the margin between the top two logits. Report prediction agreement, and if it is 1.0 on a realistic input set you are fine. For a REGRESSION model there is no argmax to hide behind - the values ARE the output, so the tolerance is the metric and you need to decide what tolerance the downstream system can accept. For a GENERATIVE model, this is where the reassuring result becomes a trap. You SAMPLE from the distribution rather than taking the argmax, so drift changes which tokens can appear at all - particularly in the low-probability tail where the relative error is largest. And errors COMPOUND, because each token conditions on the ones before it, so a small per-step perturbation becomes a large divergence over hundreds of steps. A prediction-agreement check on the first token would pass while the generated text degraded, which is exactly the blind spot from 17-06. For a RANKING or RETRIEVAL system, what matters is the induced ordering, so measure rank correlation and recall at k rather than the score values. THE CHECK I WOULD RUN FOR THE GENERATIVE CASE, since the classifier's check is inadequate there: perplexity on held-out text, which is continuous and sensitive; long-output generation compared at the deployed sampling parameters rather than greedily; repetition and format-violation rates; and the divergence between the two output distributions, which measures what actually changed rather than a downstream consequence of it. WHERE THE DRIFT USUALLY COMES FROM, in rough order: fused operations accumulating in a different order, different epsilon or default values in normalization, a different padding or rounding convention, reduced-precision accumulation in the runtime, and outright operator substitution. The last one is the one to rule out first, because it is the only one that is a bug rather than a property. AND THE PRINCIPLE, which is this module's habit: choose a check the consumer can actually be broken by. Prediction agreement is the right check when a prediction is what ships, and it is the wrong check when a distribution is what ships - which is the same 'what would this metric fail to detect' question that the evaluation lessons keep returning to."
          }
        },
        {
          "q": "Why is a refusal better than a substitution?",
          "a": "BECAUSE A LOUD CHEAP FAILURE BEATS A QUIET EXPENSIVE ONE, and this is one of the clearest cases of that principle in the curriculum. THE SITUATION: a model contains an operation the target opset does not define. The exporter has two options. Option one is to REFUSE - fail at build time with a message naming the unsupported operation. Option two is to SUBSTITUTE something close, so the export succeeds. WHY SUBSTITUTION IS WORSE, even though it is more convenient in the moment. The resulting model runs. It returns numbers in the right range. Its outputs are plausible. And it computes something different from what you trained. That failure surfaces as a quality regression in production, possibly weeks later, with no error message, no stack trace and nothing to grep for - and the investigation starts from 'the model got worse' with no pointer at the export step, which by then is several deploys back. The cost of finding it dwarfs the cost of handling the refusal. WHY REFUSAL IS CHEAP. You get the failure at build time, with the offending operation named, and the fixes are all straightforward: use a later opset that defines it, decompose the operation into supported primitives, register a custom operator, or change the model to use a supported equivalent deliberately. Each of those is a decision YOU make with knowledge of the consequences, rather than one the tool makes silently on your behalf. THE GENERAL PRINCIPLE, which recurs across this curriculum: prefer tools that fail loudly at the boundary over tools that degrade quietly past it. The same argument appears with tracing versus scripting, where a trace bakes in the path taken at one input and scripting refuses on unsupported constructs; with strict schema validation over lenient coercion; and with a validator that rejects a malformed tool call rather than executing a guessed interpretation. In every case the strict option is more annoying up front and cheaper overall. HOW I WOULD APPLY IT WHEN CHOOSING TOOLS. Ask what a conversion tool does with something it does not understand. If the answer is 'best effort', treat every conversion as requiring a full parity check on a realistic input distribution, because you cannot rely on the tool telling you. If the answer is 'refuses', the parity check is still worth running - but you have a much stronger guarantee that the graph you shipped is the graph you built. AND THE CONNECTION TO THE PARITY CHECK: refusal handles the failures the tool can SEE. Parity handles the ones it cannot - a semantic difference in an operator that exists in both vocabularies but behaves slightly differently. You need both, and they cover different classes of error."
        },
        {
          "q": "When is exporting worth the trouble at all?",
          "a": "WHEN THE SERVING ENVIRONMENT DIFFERS FROM THE TRAINING ENVIRONMENT IN A WAY THAT MATTERS - and when it does not, the export step is complexity for nothing. WHERE IT PAYS. A DIFFERENT RUNTIME OR LANGUAGE: serving from C++, Rust, Java, mobile or the browser, where shipping a Python training framework is not an option. This is the original motivation and it is still the strongest one. CONSTRAINED TARGETS: mobile and embedded, where a quantized exported runtime is frequently the only way the model fits at all, and where the framework's overhead is unacceptable. DECOUPLING VERSIONS: the serving stack stops being pinned to the training framework's version, so you can upgrade one without the other - which matters more the longer a model is in production. OPTIMIZED RUNTIMES: the target runtime may have graph optimizations, fused kernels or hardware-specific paths that the training framework does not, which is where a real speedup comes from rather than from the export itself. WHERE IT DOES NOT PAY. If you serve from the same framework you trained in, on similar hardware, at a scale where the framework's own serving path is adequate - the export adds a conversion step, a parity obligation, an artifact to version and a class of failure that would not otherwise exist. That is a real cost for no benefit, and 'we should export because that is what you do' is how it gets adopted. WHAT IT COSTS, honestly, so the decision is informed. The conversion can fail on unsupported operations or dynamic control flow. The exported model may be harder to debug, since you have lost the framework's introspection. Some operations behave subtly differently, which is what parity checks exist to catch. Dynamic shapes need explicit handling. And you now maintain two paths - training and serving - that must be kept in agreement, which is an ongoing obligation rather than a one-time task. HOW I WOULD DECIDE: name the specific constraint the export is solving. 'We serve from Java' is a constraint. 'We need it on device' is a constraint. 'The runtime is measurably faster on our hardware' is a constraint, once measured. 'It is more portable' is not a constraint unless portability is a requirement someone has. AND THE PART THAT SURVIVES EITHER WAY, which is why the lesson is worth learning regardless: graph, opset, parity is the structure of every conversion, not just export. Compiling a model, quantizing it, distilling it, or moving it between hardware are all transformations where the same question applies - does the transformed thing compute what the original did, and how would I know. The parity check is the durable habit, and it applies to changes you would not think of as exports at all."
        },
        {
          "q": "What does 'logits drift but decisions do not' tell you?",
          "a": "IT TELLS YOU THE PERTURBATION WAS SMALLER THAN THE ARGMAX MARGIN - which is reassuring here and is exactly the blind spot that hides quantization damage elsewhere. WHAT WAS MEASURED. Int8 export gave a model 3.6 times smaller with accuracy moving 0.912 to 0.914 - which is within noise, and the honest reading is 'no measurable change' rather than 'quantization helped'. The logits changed and the predictions did not. WHY. Argmax is a STEP FUNCTION of the logits: only which one is largest matters. If the top logit led the second by more than the drift, the ordering survives and accuracy is unchanged. So the accuracy result is not evidence that the model is unchanged; it is evidence that the change was smaller than the margins. Those are different claims and the second is much weaker. WHY THAT MATTERS FOR CLASSIFIERS ANYWAY: for a system that ships a prediction, the argmax IS the output, so if the argmax is stable the model is behaving identically from the consumer's perspective. The check is appropriate to the consumer and the result is genuinely reassuring. WHERE IT BECOMES DANGEROUS: a generative model. There you SAMPLE from the distribution rather than taking the argmax, so drift in the logits changes the probabilities and therefore which tokens can appear - particularly in the low-probability tail, where the relative error from quantization is largest and where sampling actually reaches. And errors COMPOUND, because each token conditions on the previous ones, so a small per-step perturbation becomes a large divergence over hundreds of steps. A prediction-agreement check would pass while the generated text degraded, which is precisely the failure in 17-06 where quantized models pass benchmarks and produce worse long outputs. WHAT TO MEASURE INSTEAD IN THAT CASE: perplexity, which is continuous and responds immediately; the divergence between the two output distributions, which measures the thing that changed rather than a downstream consequence; long-output generation at the DEPLOYED sampling parameters rather than greedily; and repetition and format-violation rates, where compounding shows up. THE GENERAL PRINCIPLE this is an instance of, and it recurs through the whole curriculum: choose a metric that can MOVE in response to the change you are testing. Accuracy cannot see a distributional change because it is a step function. That is a property of the instrument, not a fact about the model, and it is why the same measurement is a valid safety check in one setting and a false reassurance in another. Asking 'what change would this metric fail to detect' before running it is the habit that prevents both errors."
        },
        {
          "q": "What operational details make an export actually deployable?",
          "a": "FOUR THINGS THAT ARE EASY TO OMIT AND EXPENSIVE TO DISCOVER LATE. (1) DYNAMIC AXES. Export traces with concrete shapes, so unless you declare which dimensions are dynamic, the batch size and sequence length are baked in - and the first differently-shaped input fails, usually in staging if you are lucky and production if you are not. This has to be declared at export time and verified by running the exported model at several shapes, which is a two-line test that is routinely skipped. (2) THE PREPROCESSING BOUNDARY. Normalization, tokenization, resizing and type conversion either live inside the exported graph or outside it, and both are valid choices - what is not valid is leaving it ambiguous. If the serving code assumes preprocessing is inside and it is outside, the model receives unnormalized inputs and returns confident nonsense, with no error. I would decide deliberately, document it with the artifact, and prefer INSIDE the graph where the target supports it, because it removes a whole class of skew between training and serving. (3) VERSION PINNING. The opset version is part of the contract, so the artifact must record which one it was exported against - the same graph against a different opset is a different contract. Alongside it: the exporter version, the source framework version and the model version, because reproducing a conversion six months later is otherwise guesswork. (4) THE PARITY TEST AS A CI ARTIFACT, not a one-time check. Store a set of reference inputs and their expected outputs from the original model, and re-run the comparison every time the model, the exporter or the runtime changes. That turns a manual step into a regression gate, and it is the only thing that catches a runtime upgrade changing an operator's behaviour underneath you. WHAT I WOULD ALSO VERIFY BEFORE TRUSTING IT: parity on a REALISTIC input distribution rather than one random tensor, since edge cases - empty inputs, maximum lengths, unusual values - are where semantic differences surface. Performance on the target hardware, because the reason for exporting is often speed and that should be measured rather than assumed. And warmup behaviour, since many runtimes optimize on the first inference and the first request is not representative. THE FRAMING I WOULD OFFER: an exported model is a build artifact, and it deserves the treatment a build artifact gets - versioned, tested, reproducible, with its inputs pinned. Treating it as a file someone generated once is how a serving stack ends up with a model nobody can rebuild, which is a worse problem than any of the individual failures above."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT REDUCES A FORMAT-HEAVY TOPIC TO THREE INVARIANTS THAT DO NOT DEPEND ON THE FORMAT. Export tooling is churn: ONNX opsets version, TorchScript was superseded, TFLite and CoreML and StableHLO each have their own vocabulary and their own converters. A lesson about any one API would date quickly. GRAPH, OPSET, PARITY does not - every one of those formats is those three things, and understanding the structure means a new format's documentation is recognizable rather than novel. THE HABIT IT INSTALLS is the parity check, and it generalizes far past export. Any transformation of a model - compiling it, quantizing it, distilling it, pruning it, moving it to different hardware - raises the same question: does the transformed thing compute what the original did, and how would I know? 'It ran without an error' is the answer people accept and it is much weaker than it sounds. Two numbers - numeric drift and decision agreement - is the answer that means something, and running both is what distinguishes them. THE DESIGN PRINCIPLE the opset demonstrates is one this curriculum keeps arriving at from different directions: prefer loud cheap failure to quiet expensive failure. The exporter REFUSING an unsupported operation is better than substituting an approximation, because the substituted model runs and is subtly wrong, and that surfaces weeks later with nothing to grep for. The same principle is why scripting refusing beats tracing baking in a path, why validation rejecting a malformed tool call beats executing a guess, and why a strict schema beats lenient coercion. AND THE MOST TRANSFERABLE RESULT is the one that looks like good news: logits drifted, decisions did not. That is reassuring for a classifier and it is precisely the mechanism that hides quantization damage in a generative model, because argmax is a step function and sampling is not. Same measurement, opposite meaning, depending on what consumes the output. Learning to ask what a metric would FAIL to detect - before running it - is worth more than any of the specific numbers here, and it is the thread that ties this lesson to the evaluation lessons in every other module."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Every export format is three things",
        "back": "A GRAPH (IR of nodes and edges) · an OPSET (contract of ops the target understands) · a PARITY CHECK (does it compute the same thing). ONNX, TorchScript, TFLite, CoreML, StableHLO are five instances — learn the structure, not the API."
      },
      {
        "type": "pitfall",
        "front": "\"It exported\" means the TRACER completed",
        "back": "Nothing more. It doesn't mean the graph computes what the original did — a traced control-flow path, a missing dynamic axis, an operator semantic difference, or misplaced preprocessing all produce a model that RUNS."
      },
      {
        "type": "formula",
        "front": "★ The parity check is TWO numbers",
        "back": "max|y_exp − y_ref| ≈ 6e-6 (the arithmetic is faithful) AND prediction agreement = 1.000 (the DECISIONS match). Small drift + identical decisions is the normal good outcome; a tolerance check alone would let a flipped argmax through."
      },
      {
        "type": "formula",
        "front": "The opset is a CONTRACT",
        "back": "export ok ⟺ ops(graph) ⊆ opset(v). An unsupported GELU made export REFUSE at build time. Pin the opset VERSION with the artifact — the same graph against a different opset is a different contract."
      },
      {
        "type": "intuition",
        "front": "★ Why refusal is the FEATURE",
        "back": "A silent substitution gives a model that RUNS, returns PLAUSIBLE numbers, and is subtly wrong — surfacing as an unexplained quality regression weeks later with no error to grep for. Loud cheap failure beats quiet expensive failure."
      },
      {
        "type": "intuition",
        "front": "Same principle, four places",
        "back": "Exporter refusing vs substituting · scripting refusing vs tracing baking in a path · validation rejecting a malformed tool call vs executing a guess · strict schema vs lenient coercion. Strict is more annoying up front and cheaper overall."
      },
      {
        "type": "formula",
        "front": "Quantized export, measured",
        "back": "3.6× smaller · accuracy 0.912 → 0.914 (WITHIN NOISE — the honest reading is \"no measurable change\", not \"it helped\") · logits DRIFT · decisions UNCHANGED."
      },
      {
        "type": "intuition",
        "front": "★ Why decisions survived — and why that doesn't generalize",
        "back": "argmax is a STEP FUNCTION and the drift was smaller than the top-two margin. Safe for a CLASSIFIER. For a GENERATIVE model you SAMPLE, so drift changes which tokens can appear, and errors COMPOUND over hundreds of steps."
      },
      {
        "type": "intuition",
        "front": "The check depends on the CONSUMER",
        "back": "Classifier → logit parity + argmax agreement. Regression → the tolerance IS the metric (no argmax to hide behind). Generative → perplexity, distribution divergence, long-output generation at DEPLOYED sampling params. Ranking → rank correlation, recall@k."
      },
      {
        "type": "intuition",
        "front": "Drift magnitude tells you which conversation you're having",
        "back": "~1e-6 = floating-point noise from op order, fusion or accumulation precision — expected. ~1e-2 = a real semantic difference: an operator default, a padding convention, an epsilon, or an outright substitution. Rule out substitution FIRST."
      },
      {
        "type": "pitfall",
        "front": "Four operational details that bite",
        "back": "DYNAMIC AXES (or the batch/seq size is baked in) · the PREPROCESSING boundary (decide inside-or-outside and document it, or serving sends unnormalized inputs silently) · VERSION pinning (opset, exporter, framework) · parity as a CI GATE, not a one-time check."
      },
      {
        "type": "intuition",
        "front": "When exporting is NOT worth it",
        "back": "Same framework, similar hardware, adequate native serving — the export adds a conversion step, a parity obligation, an artifact to version, and a failure class that wouldn't exist. Name the specific constraint it solves; \"portability\" isn't one unless someone requires it."
      }
    ],
    "refs": [
      {
        "title": "ONNX, Operators and Opset Versioning",
        "url": "https://onnx.ai/onnx/repo-docs/Versioning.html"
      },
      {
        "title": "Jacob et al. (2018), Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference",
        "url": "https://arxiv.org/abs/1712.05877"
      },
      {
        "title": "Krishnamoorthi (2018), Quantizing Deep Convolutional Networks for Efficient Inference: A Whitepaper",
        "url": "https://arxiv.org/abs/1806.08342"
      },
      {
        "title": "ONNX Runtime, Performance and Quantization Documentation",
        "url": "https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html"
      },
      {
        "title": "PyTorch, torch.onnx Export Documentation",
        "url": "https://pytorch.org/docs/stable/onnx.html"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "distillation",
      "batching"
    ],
    "demoTitles": {
      "quantization": "Quantization",
      "pruning": "Pruning & Sparsity",
      "distillation": "Knowledge Distillation",
      "batching": "Dynamic Batching"
    }
  }
};
