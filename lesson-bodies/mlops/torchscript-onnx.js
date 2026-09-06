// GENERATED from content/lessons/mlops/torchscript-onnx.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/mlops/torchscript-onnx/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "torchscript-onnx": {
    "level": "core",
    "body": {
      "intuition": [
        "Export is the seam between the TRAINING runtime and the SERVING runtime, and it is the seam where the failure is most purely numerical. Both sides are correct implementations; they disagree slightly; and the disagreement flows into a decision without anything raising.",
        "Every export format is three things: a GRAPH, an OPSET, and PARITY. The graph is what got captured, and tracing captures the path your example took rather than the code you wrote. The opset is the vocabulary of operations the target runtime understands, and an unsupported op should make export REFUSE rather than silently substitute. Parity is the check that the two runtimes agree, and it is the part most often reduced to 'it exported'.",
        "The measurement worth internalizing is that PARITY IS TWO NUMBERS. Exporting a small network to a reduced-precision runtime gave a maximum logit drift of 3.25e-04 and a decision agreement of 0.9996. That looks reassuring until you ask WHERE the 0.04% of disagreements live: the median margin among agreeing rows was 0.0765 and among disagreeing rows 0.0001. The disagreements are entirely in the lowest-margin decile - which is exactly the population a downstream threshold is deciding."
      ],
      "math": [
        {
          "h": "★ Parity is two numbers, and the second is the one that matters",
          "paras": [
            "Numerical drift tells you the runtimes differ. Decision agreement tells you whether it matters for the output your system consumes.",
            "Reporting only the first is how a parity check passes on a model whose decisions moved."
          ],
          "tex": "\\max|z_{\\text{train}}-z_{\\text{serve}}| = 3.25\\times10^{-4} \\qquad \\Pr[\\arg\\max\\ \\text{agrees}] = 0.9996",
          "texNote": "A drift of 3e-4 is fine for a regression output read at three decimal places and irrelevant to a classifier's argmax except near the boundary. Which of those you are is a property of the consumer, not of the export."
        },
        {
          "h": "★ The disagreements are not uniformly distributed",
          "paras": [
            "Sorting by the margin between the top two logits shows the disagreements concentrate entirely at the bottom. That is expected and it is the reason the aggregate agreement number is misleading.",
            "Disagreement rate by margin decile, lowest first."
          ],
          "tex": "\\begin{array}{lr} \\text{margin decile} & \\text{disagreement rate}\\\\ 1\\ (\\text{lowest}) & \\mathbf{0.0040}\\\\ 2 & 0.0000\\\\ 3 & 0.0000\\\\ 4 & 0.0000\\\\ 5 & 0.0000 \\end{array}",
          "texNote": "Median margin among agreeing rows 0.0765; among disagreeing rows 0.0001. Export error is a boundary phenomenon, so a system that abstains or escalates on low-margin cases is largely immune, and one that thresholds on them is maximally exposed."
        },
        {
          "h": "Tracing captures a path, not a program",
          "paras": [
            "Tracing runs your model on an example and records the operations that executed. Any control flow that depended on the data is baked in as the branch that example took.",
            "Scripting compiles the code including its control flow, which is why it is the correct choice whenever behaviour is input-dependent."
          ],
          "tex": "\\texttt{trace}(f, x_0) \\;\\equiv\\; \\text{the straight-line program } f \\text{ executed on } x_0 \\qquad \\texttt{script}(f) \\;\\equiv\\; f",
          "texNote": "A traced model with a length-dependent branch, a dynamic shape, or a training/eval conditional will silently produce the wrong branch on inputs unlike the example. It runs, it returns numbers, and it is wrong - which is the module's signature."
        }
      ],
      "code": [
        {
          "h": "The parity check that should gate every export",
          "paras": [
            "Three assertions, run in CI, on data that includes the boundary cases the aggregate number hides."
          ],
          "code": "# 1 NUMERICAL          max |z_train - z_serve| over a representative batch\n#                      report it; choose a tolerance from the CONSUMER\n# 2 DECISION           agreement of the output the system actually uses\n#                      (argmax, threshold crossing, ranking order)\n# 3 ★ LOW-MARGIN       decision agreement restricted to the lowest-margin\n#                      decile - measured 0.0040 disagreement there against\n#                      0.0000 in deciles 2-5\n\n# AND ON SHAPES\n#   test at batch size 1, at the max batch, and at a shape the trace\n#   never saw. A traced model frequently has the example's shape baked in.\n\n# ★ THE TOLERANCE IS A CONSUMER PROPERTY. A ranking system tolerates\n#   large logit drift and no ranking inversions; a cost-threshold system\n#   tolerates almost no probability drift. Set it from what reads the\n#   output, not from a default epsilon.",
          "caption": "Reporting aggregate agreement alone hides exactly the population that a threshold decides, which is why the third check exists."
        },
        {
          "h": "The failure modes, and which one should be loud",
          "paras": [
            "Two of these raise, one does not, and the one that does not is the dangerous one."
          ],
          "code": "# LOUD - export refuses\n#   an unsupported op for the target opset\n#   ★ THIS IS THE FEATURE. A silent substitution would run, look\n#     plausible, and be subtly wrong. Refusal is the system working.\n\n# LOUD - shapes mismatch at load time\n#   a traced dynamic axis that was fixed at trace time\n\n# ★ SILENT - and this is where the effort goes\n#   * a traced data-dependent BRANCH baked in as one path\n#   * a preprocessing step that lives in Python and was never exported,\n#     so serving reimplements it slightly differently\n#   * a training-mode layer (dropout, batch-norm statistics) exported in\n#     the wrong mode\n#   * reduced precision on the serving runtime shifting boundary decisions\n\n# ★ Three of those four are not about the exporter at all - they are about\n#   what was OUTSIDE the exported graph.",
          "caption": "The preprocessing gap is the most common of these in practice, and it is the same seam as the registry lesson's: the model is bigger than the weights."
        }
      ],
      "useCases": [
        "Serving a PyTorch-trained model from a runtime without Python - a C++ service, a mobile app, an embedded target - where the export IS the deployment.",
        "Getting inference speedups from a graph-optimizing runtime, where operator fusion and constant folding are the return and parity is the price of admission.",
        "Hardware portability, where ONNX's value is that one artifact runs on several accelerator backends without re-implementing the model.",
        "Freezing a model artifact for auditability, where a graph plus an opset is a far more precise description of what ran than a Python codebase at a commit."
      ],
      "pitfalls": [
        "Reporting only numerical drift. Parity is two numbers - drift of 3.25e-04 with decision agreement 0.9996 - and the second is what the system consumes.",
        "Reading aggregate decision agreement as safety. The disagreements sat entirely in the lowest-margin decile at 0.0040, against 0.0000 in deciles two through five - exactly the rows a threshold decides.",
        "Tracing a model with data-dependent control flow. The traced graph is the path your example took, so a different branch is silently baked in and the model runs and returns the wrong answer.",
        "Testing export at one shape. A traced model frequently has the example's batch size or sequence length fixed, so test at batch 1, at the maximum, and at a shape the trace never saw.",
        "Leaving preprocessing outside the exported graph. Serving then reimplements it, slightly differently, which is train/serve skew arriving through the export seam.",
        "Exporting in training mode. Dropout active or batch-norm using batch statistics at inference produces plausible, wrong outputs with nothing raising.",
        "Treating an export refusal as an obstacle. Refusing an unsupported op is the feature - a silent substitution would run and be subtly wrong, which is strictly worse."
      ],
      "connections": [
        {
          "ref": "mlops/model-serving",
          "text": "Where the exported artifact runs, and the other half of the same skew problem - preprocessing that differs between training and the request path."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The precision reduction that produces most export drift, and why outliers rather than average error set the achievable scale."
        },
        {
          "ref": "mlops/testing",
          "text": "Where the parity assertions live permanently, so a model that stops matching its export fails the build rather than shipping."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why a probability-consuming system has a far tighter parity tolerance than a ranking one - the tolerance is a property of the consumer."
        },
        {
          "ref": "mlops/mlflow",
          "text": "The versioning seam this depends on: the exported artifact, the preprocessing object and the weights must move as one unit."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three parts of any export format?",
          "a": "A GRAPH (what got captured), an OPSET (the operations the target understands), and PARITY (whether the two runtimes agree). \"It exported\" only means the tracer completed."
        },
        {
          "q": "★ Parity is how many numbers?",
          "a": "TWO. Numerical drift AND decision agreement. Measured: max |logit drift| **3.25e-04**, decision agreement **0.9996**."
        },
        {
          "q": "★ Where do the disagreements live?",
          "a": "Entirely in the lowest-margin decile: disagreement rate **0.0040** there, **0.0000** in deciles 2–5. Median margin 0.0765 (agreeing) vs **0.0001** (disagreeing)."
        },
        {
          "q": "Why does that matter?",
          "a": "Export error is a BOUNDARY phenomenon — exactly the rows a downstream threshold decides. A system that abstains on low margin is largely immune; one that thresholds there is maximally exposed."
        },
        {
          "q": "Trace or script?",
          "a": "Trace records the operations your EXAMPLE executed — a straight-line program. Script compiles the code including control flow. Any data-dependent branch requires scripting."
        },
        {
          "q": "What goes wrong with a traced branch?",
          "a": "The branch your example took is baked in. On different inputs it runs, returns numbers, and is wrong — nothing raises."
        },
        {
          "q": "What shapes should you test?",
          "a": "Batch size 1, the maximum batch, and a shape the trace never saw. Traced models frequently have the example's batch size or sequence length fixed."
        },
        {
          "q": "★ An unsupported op makes export fail. Good or bad?",
          "a": "GOOD — it's the feature. A silent substitution would run, look plausible, and be subtly wrong, which is strictly worse than a refusal."
        },
        {
          "q": "Name the silent export failures.",
          "a": "A traced data-dependent branch · preprocessing left OUTSIDE the graph · a training-mode layer (dropout, batch-norm stats) · reduced precision shifting boundary decisions."
        },
        {
          "q": "What do three of those four have in common?",
          "a": "They aren't about the exporter at all — they're about what was OUTSIDE the exported graph."
        },
        {
          "q": "How do you set the parity tolerance?",
          "a": "From the CONSUMER. A ranking system tolerates large drift and no inversions; a cost-threshold system tolerates almost no probability drift. Not from a default epsilon."
        },
        {
          "q": "Why export at all?",
          "a": "A runtime without Python (C++, mobile, embedded) · graph-optimizing speedups (fusion, constant folding) · hardware portability · and an auditable artifact more precise than a codebase at a commit."
        }
      ],
      "standard": [
        {
          "q": "How do you validate a model export?",
          "a": "WITH THREE CHECKS, BECAUSE 'IT EXPORTED' ONLY MEANS THE TRACER COMPLETED. FIRST, NUMERICAL PARITY: the maximum absolute difference between training-runtime and serving-runtime outputs over a representative batch. Measured on a small network exported to a reduced-precision runtime, that was 3.25e-04. SECOND, DECISION PARITY: agreement of the output the system actually consumes — the argmax, the threshold crossing, the ranking order — which came out at 0.9996, so 0.04% of decisions changed. THOSE TWO ARE THE STANDARD CHECK AND THEY ARE NOT ENOUGH. THIRD, AND THE ONE THAT MATTERS: decision agreement restricted to the LOW-MARGIN population. Sorting by the gap between the top two logits, the disagreement rate in the lowest decile was 0.0040 and in deciles two through five it was 0.0000 — the median margin among agreeing rows was 0.0765 and among disagreeing rows 0.0001. EVERY DISAGREEMENT WAS AT THE BOUNDARY, which is exactly the population a downstream threshold is deciding, so the aggregate 0.9996 is reassuring about precisely the rows that were never at risk. I'D ALSO TEST SHAPES — batch 1, maximum batch, and a shape the trace never saw — because traced models frequently have the example's dimensions baked in.",
          "deepDive": {
            "q": "What tolerance is acceptable?",
            "a": "The tolerance question follows from that and is worth making explicit: the acceptable drift is a property of the CONSUMER, not of the export. A ranking system can tolerate large absolute logit drift provided no ranking inversions occur, so its parity check should measure rank correlation and top-k membership rather than element-wise difference. A system feeding a cost-based threshold consumes a probability, so it tolerates almost no drift near the threshold and its check should be the decision-flip rate at the deployed operating point specifically. A regression output read to three decimal places tolerates 1e-4 and not 1e-2. Setting a single default epsilon across an organization is therefore wrong in both directions — too strict for rankers, too loose for thresholded systems — and the useful convention is that each model's parity tolerance is declared alongside what consumes its output, which is the same contract the strategy lesson asked for. That also makes the check meaningful in CI, because a failure then means something specific rather than a number moved."
          }
        },
        {
          "q": "Explain tracing versus scripting and when each fails.",
          "a": "TRACING RUNS THE MODEL ON AN EXAMPLE AND RECORDS THE OPERATIONS THAT EXECUTED, so what you get is the straight-line program your model performed on that particular input. SCRIPTING COMPILES THE CODE, including its control flow, so you get the program. THE CONSEQUENCE IS THAT ANY DATA-DEPENDENT BEHAVIOUR IS BAKED IN BY TRACING as whatever branch the example took: a conditional on sequence length, a loop whose count depends on the input, an early exit, a training-versus-eval branch. The exported model then RUNS on inputs that should have taken the other branch, returns numbers, and is wrong — with nothing raising, which is this module's signature failure. TRACING IS THE RIGHT CHOICE when the model is genuinely a fixed computation graph, which most feed-forward networks are, and it is simpler and supports more operations. SCRIPTING IS REQUIRED whenever behaviour depends on the data, and it costs you in that the compiler supports a restricted subset of the language, so models often need modification to be scriptable. THE PRACTICAL DIAGNOSTIC is to trace with two examples that should take different paths and compare outputs against the original model; if they diverge from the eager model in the same way, the branch was captured wrongly.",
          "deepDive": {
            "q": "Is there a subtler version of that failure?",
            "a": "The subtler version of this affects dynamic shapes rather than control flow, and it is more common. A trace records tensor shapes as constants unless the exporter is explicitly told which axes are dynamic, so a model traced on a batch of 32 and a sequence of 128 may reject or silently mishandle other sizes — and the failure mode varies: sometimes it raises at load time, which is fine, and sometimes it produces wrong results by broadcasting against a baked-in dimension, which is not. Declaring dynamic axes explicitly at export time and then testing at several shapes is the whole fix. It is also worth noting that the modern PyTorch export path uses graph capture that handles control flow and dynamic shapes far better than classic tracing, with graph breaks where it cannot, so the trace-versus-script framing is becoming a question about which capture mechanism and how it reports what it could not capture. The durable principle survives the tooling change: know what was captured, and test the inputs that would exercise what was not."
          }
        },
        {
          "q": "An unsupported operator makes your export fail. What do you do?",
          "a": "FIRST, RECOGNIZE THAT THE FAILURE IS THE SYSTEM WORKING. The alternative — a silent substitution of an approximately-equivalent operator — would produce a model that runs, looks plausible, and is subtly wrong, which is strictly worse than a refusal and is exactly the class of failure this module is about. So an export that refuses has given you information at the cheapest possible moment. THEN THE OPTIONS, in order of preference. REPLACE THE OPERATION with a supported equivalent, which is usually possible and is the cleanest outcome — many unsupported ops are convenience functions with a decomposition into primitives. RAISE THE OPSET VERSION, if the target runtime supports a newer one, since operator coverage grows with opset. IMPLEMENT A CUSTOM OPERATOR for the target runtime, which is the correct answer for a genuinely novel operation and carries a maintenance cost you should count. OR MOVE THE OPERATION OUT OF THE GRAPH into pre- or post-processing — which works and creates the seam this lesson is warning about, because that logic now lives outside the exported artifact and must be reimplemented identically in the serving path. IF I TAKE THAT LAST OPTION I would make the extracted logic a versioned artifact rather than loose code.",
          "deepDive": {
            "q": "Where do export decisions turn into skew problems?",
            "a": "That last point is where export decisions turn into skew problems and it is worth tracing through. Every operation you move outside the graph to make export succeed is an operation that now exists twice — once in the training pipeline in Python, once in the serving path in whatever language the runtime uses — and the two copies drift independently. That is the same failure as the registry lesson's preprocessing object, and the same remedy applies: the extracted logic must be versioned and deployed with the model, ideally as data rather than as code, so it cannot be updated on one side only. The strongest version of the discipline is to push as much preprocessing INTO the graph as the opset allows, precisely so it cannot diverge — normalization constants, tokenization where feasible, resizing and padding. A model whose exported graph consumes raw inputs has no preprocessing seam at all, which eliminates a whole failure class rather than managing it."
          }
        },
        {
          "q": "Your exported model matches on the test set but production predictions differ. Where do you look?",
          "a": "AT WHAT WAS OUTSIDE THE GRAPH, BECAUSE THAT IS WHERE THREE OF THE FOUR SILENT FAILURES LIVE. FIRST, PREPROCESSING: if normalization, tokenization, resizing or feature computation happens in Python during evaluation and is reimplemented in the serving path, the two will differ — a different resize interpolation, a different tokenizer version, a scaler loaded from the wrong artifact. This is the most common cause by a wide margin, and the test is to feed the same RAW input through both paths and compare at the model's input tensor, not at its output. SECOND, MODE: a model exported in training mode has dropout active or batch-norm using batch statistics, which produces plausible wrong outputs, and it is silent. THIRD, SHAPES AND BATCHING: a traced model with a baked-in batch dimension can behave differently at the batch sizes production actually uses, and any layer whose behaviour depends on the batch — batch norm again — changes with batching that evaluation did not exercise. FOURTH, PRECISION: if the serving runtime uses reduced precision, expect the boundary population to shift, and check the low-margin decile specifically rather than the aggregate. I'D BISECT BY COMPARING AT INTERMEDIATE TENSORS, which localizes it in one pass.",
          "deepDive": {
            "q": "Which diagnostic is the highest-value here?",
            "a": "Comparing at the model's input tensor is the single highest-value diagnostic here and it is often skipped because it requires plumbing. If the input tensors match and the outputs differ, the problem is the runtime — precision, an operator implementation, a fused kernel. If the input tensors differ, the problem is preprocessing and the model is innocent, which redirects the investigation entirely. Building that comparison as a permanent test — raw input in, assert on the tensor at the graph boundary — catches the preprocessing class before deployment rather than after, and it is the check that most directly targets this seam. It is also worth logging a hash of the model artifact and of the preprocessing artifact with every prediction in production, at least during a rollout, because then the question 'is serving using what I think it is using' is answerable from the logs rather than by inspection. That is cheap and it resolves a surprising fraction of these investigations in seconds."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE PUREST SEAM IN THE MODULE, BECAUSE BOTH SIDES ARE PROVABLY CORRECT. The training runtime computes the model correctly. The serving runtime computes the model correctly. They use different kernels, different fusion, different precision, and they disagree by 3.25e-04 — and that disagreement propagates into a decision with nothing raising. NOBODY WROTE A BUG. THE CONTRACT AT THIS SEAM is that the two runtimes agree to a tolerance the consumer can absorb, and the violation is silent by construction because a numerical difference is not an error condition. WHAT THIS LESSON ADDS TO THE MODULE is that the aggregate parity number is misleading in a specific, predictable direction: decision agreement was 0.9996 and the disagreements sat entirely in the lowest-margin decile at 0.0040, with zero in deciles two through five. So the check that passes is measuring the rows that were never at risk. THAT IS THE REFERENCE-CLASS PROBLEM from the trustworthy-AI module appearing in a CI assertion — the number is true over the wrong population — and the fix is the same: state the population, and check the one the decision actually runs on.",
          "deepDive": {
            "q": "What connects this to the rest of the curriculum?",
            "a": "There is a satisfying connection to make between this and the boundary structure of the whole curriculum. Export error concentrates at the decision boundary; adversarial examples live at the decision boundary; conformal prediction's uncertainty is largest at the boundary; calibration matters most where the threshold is. The boundary is where a model's output is least determined by the data and most determined by everything else — precision, perturbation, the arbitrary tie-break — and it is also where the decision changes. So a system that treats low-margin cases differently, by abstaining or escalating or routing to a human, is simultaneously buying robustness to export drift, to adversarial perturbation, and to calibration error, because all three are boundary phenomena. That is a single architectural decision paying off against three unrelated-seeming failure modes, which is a genuinely useful thing to notice and a good argument to bring to a design review."
          }
        },
        {
          "q": "Would you always export, and what does it cost?",
          "a": "NO — EXPORT WHEN THERE IS A REASON, BECAUSE IT ADDS A SEAM. The reasons are real: serving from a runtime without Python, which for C++ services, mobile and embedded targets makes the export the deployment; graph-level optimization, where operator fusion and constant folding give speedups the eager runtime cannot; hardware portability, where one ONNX artifact runs across several accelerator backends; and auditability, since a graph plus an opset version is a far more precise description of what ran than 'this repository at this commit'. THE COST IS THE SEAM ITSELF: a second runtime that must be kept in parity, a parity check to maintain in CI, an export step that can fail on a model change, and a class of silent failures that did not exist before. IF YOU ARE SERVING PYTHON FROM A PYTHON PROCESS and the latency budget is met, exporting buys you a maintenance burden and a failure mode for no return. THE DECISION IS THEREFORE THE SAME ARITHMETIC AS THE DESIGN LESSONS: what does the latency budget require, what does the target platform support, and does the speedup justify a new seam? Answering that before exporting is cheaper than discovering afterwards that the model was fast enough.",
          "deepDive": {
            "q": "Is there a middle path?",
            "a": "There is a middle path worth knowing that gets much of the benefit with less of the seam: compile within the training framework rather than exporting out of it. PyTorch's compilation path applies graph capture and kernel fusion while staying in the same runtime, so you get a meaningful speedup without a second implementation to keep in parity — and where it cannot capture something it falls back to eager rather than producing a wrong graph, which is the safe failure direction. That does not help with a non-Python target or with hardware portability, which are the cases where export is genuinely required. The general principle for this module is to count seams: each one is a place where two correct components can disagree silently, so adding one should be a deliberate purchase against a stated benefit. Systems accumulate seams by default — a cache here, a reimplementation there — and the accumulated silent-failure surface is most of what makes production ML harder than it looks."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Every export format is three things",
        "back": "A GRAPH (what got captured) · an OPSET (operations the target understands) · PARITY (whether the runtimes agree). \"It exported\" only means the tracer completed."
      },
      {
        "type": "formula",
        "front": "★ Parity is TWO numbers",
        "back": "max |logit drift| = **3.25e-04** AND decision agreement = **0.9996**. The second is what the system consumes; reporting only the first is how a parity check passes on a model whose decisions moved."
      },
      {
        "type": "formula",
        "front": "★ Where the disagreements live",
        "back": "Lowest-margin decile: **0.0040** disagreement. Deciles 2–5: **0.0000**. Median margin agreeing 0.0765 vs disagreeing **0.0001**. Export error is a BOUNDARY phenomenon."
      },
      {
        "type": "intuition",
        "front": "Why that makes aggregate parity misleading",
        "back": "0.9996 is reassuring about the rows that were never at risk. The boundary rows are exactly the ones a threshold decides — the reference-class problem, appearing in a CI assertion."
      },
      {
        "type": "definition",
        "front": "Trace vs script",
        "back": "trace(f, x₀) = the straight-line program f executed ON THAT EXAMPLE. script(f) = f, control flow included. Any data-dependent branch requires scripting."
      },
      {
        "type": "pitfall",
        "front": "The traced-branch failure",
        "back": "The branch your example took is baked in. On other inputs it RUNS, returns numbers, and is wrong — nothing raises. Diagnostic: trace with two examples that should take different paths and compare against eager."
      },
      {
        "type": "pitfall",
        "front": "Dynamic shapes",
        "back": "A trace records shapes as CONSTANTS unless told which axes are dynamic. Sometimes it raises at load (fine) and sometimes it broadcasts against a baked-in dimension (not). Declare dynamic axes, then test batch 1, max batch, and an unseen shape."
      },
      {
        "type": "intuition",
        "front": "★ An unsupported op making export FAIL is the feature",
        "back": "A silent substitution would run, look plausible, and be subtly wrong — strictly worse than a refusal. The refusal gave you information at the cheapest possible moment."
      },
      {
        "type": "pitfall",
        "front": "The four silent export failures",
        "back": "A traced data-dependent BRANCH · preprocessing left OUTSIDE the graph · training-mode layers (dropout, batch-norm stats) · reduced precision shifting boundary decisions. **Three of four aren't about the exporter at all.**"
      },
      {
        "type": "intuition",
        "front": "Set the tolerance from the CONSUMER",
        "back": "Ranking → measure rank correlation and top-k membership, absolute drift is irrelevant. Cost threshold → measure the decision-flip rate AT the deployed operating point. A single org-wide epsilon is wrong in both directions."
      },
      {
        "type": "intuition",
        "front": "Production differs from the test set — where to look",
        "back": "Compare at the model's INPUT TENSOR, not its output. Inputs match, outputs differ → the runtime. Inputs differ → preprocessing, and the model is innocent. One pass localizes it."
      },
      {
        "type": "intuition",
        "front": "★ Boundary phenomena share a fix",
        "back": "Export drift, adversarial examples, conformal uncertainty and calibration error all concentrate at the DECISION BOUNDARY. Abstaining or escalating on low-margin cases buys robustness to all four — one architectural decision, three unrelated-seeming failure modes."
      }
    ],
    "refs": [
      {
        "title": "PyTorch Documentation, TorchScript and torch.export",
        "url": "https://pytorch.org/docs/stable/jit.html"
      },
      {
        "title": "ONNX, Operators and Opset Versioning",
        "url": "https://onnx.ai/onnx/intro/concepts.html"
      },
      {
        "title": "ONNX Runtime, Performance Tuning and Graph Optimizations",
        "url": "https://onnxruntime.ai/docs/performance/model-optimizations/graph-optimizations.html"
      },
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      },
      {
        "title": "Dettmers, Lewis, Belkada & Zettlemoyer (2022), LLM.int8(): 8-bit Matrix Multiplication at Scale",
        "url": "https://arxiv.org/abs/2208.07339"
      }
    ],
    "demos": [
      "quantization",
      "mixed-precision",
      "batching",
      "model-cascade"
    ],
    "demoTitles": {
      "quantization": "Quantization",
      "mixed-precision": "Mixed Precision",
      "batching": "Dynamic Batching",
      "model-cascade": "Model Cascade (Early-Exit)"
    }
  }
};
