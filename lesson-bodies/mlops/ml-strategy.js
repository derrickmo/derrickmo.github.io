// GENERATED from content/lessons/mlops/ml-strategy.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/mlops/ml-strategy/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "ml-strategy": {
    "level": "core",
    "body": {
      "intuition": [
        "The first seam in a production system is between THE METRIC AND THE GOAL, and it is the one that decides whether any of the engineering that follows is worth doing. A project that optimizes a well-chosen metric badly can be rescued; a project that optimizes the wrong metric perfectly cannot.",
        "Error analysis is the cheapest high-value activity in applied ML and the most consistently skipped. Take a hundred errors, categorize them by hand, and count. The result is a priority list ordered by how much of the remaining error each category holds, which converts an open-ended 'improve the model' into a ranked set of finite tasks - and it routinely shows that the fashionable fix addresses 4% of the errors.",
        "The strategic discipline underneath both is to establish a CEILING and a FLOOR before optimizing. The floor is the trivial baseline: predict the majority class, predict the last value, use the existing rule. The ceiling is human or Bayes-level performance on the same inputs. A model at 82% means nothing until you know the floor is 71% and the ceiling is 86% - at which point you know there are four points available, not eighteen."
      ],
      "math": [
        {
          "h": "The decomposition that directs effort",
          "paras": [
            "Split the gap between your model and the ceiling into avoidable bias and variance, measured against the floor and the ceiling rather than in the abstract.",
            "The two gaps point at completely different work, and reading them the wrong way round is how a team spends a quarter collecting data for a bias problem."
          ],
          "tex": "\\underbrace{\\text{ceiling} - \\text{train error}}_{\\text{avoidable bias}} \\qquad \\underbrace{\\text{train error} - \\text{dev error}}_{\\text{variance}} \\qquad \\underbrace{\\text{dev} - \\text{test/production}}_{\\text{distribution mismatch}}",
          "texNote": "The third gap is the one Andrew Ng's framing adds and it is the most useful in practice: a dev-to-production gap is not overfitting, it is a data mismatch, and more regularization will not touch it."
        },
        {
          "h": "★ Error analysis arithmetic",
          "paras": [
            "Categorize a sample of errors by hand and count. The ceiling on any fix is the share of errors it addresses, which bounds the return before you build it.",
            "This is a two-hour exercise that reorders a roadmap."
          ],
          "tex": "\\text{max gain from fixing category } c \\;=\\; \\text{error rate} \\times \\text{share}(c) \\times \\text{fix effectiveness}",
          "texNote": "At 18% error with a category holding 40% of errors, a perfect fix buys 7.2 points. A category holding 4% buys 0.7 at best. Both numbers exist before any work is done, and one of them usually kills the plan everyone liked."
        },
        {
          "h": "The floor and the ceiling frame everything",
          "paras": [
            "A metric with no baseline is not a result, and a metric with no ceiling has no sense of how much is left.",
            "Human-level performance is the practical proxy for the Bayes rate on perceptual tasks, and it is often far from 100%."
          ],
          "tex": "\\text{floor (trivial baseline)} \\;\\le\\; \\text{model} \\;\\le\\; \\text{ceiling (human / Bayes)}: \\quad 0.71 \\le 0.82 \\le 0.86",
          "texNote": "Four points available rather than eighteen. That single reframing changes whether the project is nearly finished or barely started, and it is available on day one."
        }
      ],
      "code": [
        {
          "h": "The error analysis loop",
          "paras": [
            "Two hours, a spreadsheet, and a hundred examples. There is no cheaper way to redirect a project."
          ],
          "code": "# 1 SAMPLE ~100 errors from the DEV set, randomly (not the worst ones)\n# 2 CATEGORIZE by hand, adding categories as they appear\n# 3 COUNT, and allow multiple tags per example\n# 4 SORT by share of total error\n\n#   category                      share   max gain at 18% error\n#   blurry / low-quality input     31%          5.6 pts\n#   mislabelled ground truth       22%          4.0 pts   ★ fix the LABELS\n#   rare class confusion           18%          3.2 pts\n#   ambiguous even to a human      15%          2.7 pts   ★ CEILING, not a bug\n#   the thing everyone wanted to    4%          0.7 pts\n#     work on\n\n# ★ TWO CATEGORIES CHANGE THE PLAN EVERY TIME:\n#   MISLABELLED GROUND TRUTH - the fix is data, not modelling, and it also\n#     means your metric is understating the model by roughly that share\n#   AMBIGUOUS TO A HUMAN - that is the ceiling. It is not addressable and\n#     including it in the target is how a project never ends.",
          "caption": "The mislabelled category is the one that most often reverses a decision, because it means the evaluation is wrong as well as the model."
        },
        {
          "h": "Choosing the metric, and the tier structure",
          "paras": [
            "One optimizing metric, several satisficing constraints. That structure is what makes a multi-objective problem decidable."
          ],
          "code": "# ONE OPTIMIZING METRIC   the thing you improve\n# SATISFICING METRICS     thresholds you must not cross\n#   e.g. maximize accuracy SUBJECT TO p99 < 100 ms, model < 200 MB,\n#        false-positive rate < 2%, no subgroup below 0.80\n\n# ★ This is the guardrail tier from the experimentation material, and the\n#   burden of proof is REVERSED on the satisficing ones: you need evidence\n#   of NO harm, so a wide interval is a failure rather than a pass.\n\n# AND THE METRIC MUST MATCH THE DECISION\n#   ranking consumed -> AUC/NDCG is fine, calibration optional\n#   probability consumed -> calibration is mandatory (a price, a cost\n#     threshold, an expected-value calculation)\n#   ★ systems drift from the first into the second without anyone\n#     rechecking, which is how a fine model becomes a wrong one",
          "caption": "The optimizing/satisficing split is what turns 'make it better without making anything worse' into a problem with a defined answer."
        }
      ],
      "useCases": [
        "The first week of any ML project, where establishing the floor, the ceiling and the metric tier costs two days and determines whether the next quarter is well spent.",
        "A stalled project, where error analysis on a hundred examples usually reveals that the effort is going into a category holding a small share of the error.",
        "Deciding between more data, better labels and a better model, which the bias-variance-mismatch decomposition answers directly and intuition answers badly.",
        "Reviewing someone else's project, where 'what is the floor, what is the ceiling, and what does an error analysis say' is three questions that find most problems."
      ],
      "pitfalls": [
        "Reporting a metric with no floor and no ceiling. 82% means nothing until you know the trivial baseline is 71% and human performance is 86% - four points available, not eighteen.",
        "Skipping error analysis because it is manual. A hundred examples and two hours produce a ranked priority list, and it routinely shows the fashionable fix addresses 4% of errors.",
        "Sampling the worst errors rather than a random sample. That biases the category shares toward whatever produces confident mistakes and misdirects the priority list.",
        "Treating mislabelled ground truth as noise to be tolerated. It means the metric is understating the model, so the evaluation is wrong as well as the model, and the fix is data.",
        "Optimizing past the ceiling. Errors that are ambiguous to a human are the Bayes rate showing through, and including them in the target is how a project never finishes.",
        "Reading a dev-to-production gap as overfitting. It is a distribution mismatch, and regularization does not touch it - the fix is data that matches deployment.",
        "Using several optimizing metrics. One optimizing metric with satisficing constraints is what makes the problem decidable; a weighted blend hides the exchange rate someone chose."
      ],
      "connections": [
        {
          "ref": "ml-theory/bias-variance",
          "text": "The decomposition this operationalizes, with the third term - dev-to-production mismatch - that the classical framing omits."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Choosing the optimizing metric, and why the metric must match what the decision consumes rather than what is conventional."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The guardrail tier and the reversed burden of proof, which is where the satisficing metrics get tested."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "What happens when the optimizing metric is a proxy and you push hard on it - the Goodhart turn, measured."
        },
        {
          "ref": "mlops/testing",
          "text": "How the error categories become permanent regression tests, so a fixed category cannot silently return."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What frames a metric?",
          "a": "A FLOOR (trivial baseline) and a CEILING (human/Bayes). 0.71 ≤ 0.82 ≤ 0.86 means four points are available, not eighteen — and both numbers exist on day one."
        },
        {
          "q": "Give the three-gap decomposition.",
          "a": "Ceiling − train = avoidable bias · train − dev = variance · dev − production = DISTRIBUTION MISMATCH. The third is the one the classical framing omits and the most useful in practice."
        },
        {
          "q": "Dev-to-production gap — what is it?",
          "a": "A data mismatch, not overfitting. Regularization won't touch it; the fix is training data that matches deployment."
        },
        {
          "q": "What is error analysis?",
          "a": "Sample ~100 dev errors, categorize by hand, count, sort by share of total error. Two hours, and it converts \"improve the model\" into a ranked list of finite tasks."
        },
        {
          "q": "Give the gain arithmetic.",
          "a": "Max gain = error rate × share(category) × fix effectiveness. At 18% error, a category holding 40% buys at most 7.2 points; one holding 4% buys 0.7."
        },
        {
          "q": "Why sample randomly rather than the worst errors?",
          "a": "The worst errors bias category shares toward whatever produces CONFIDENT mistakes, which misdirects the priority list."
        },
        {
          "q": "★ Which two categories change the plan?",
          "a": "MISLABELLED GROUND TRUTH (the fix is data, and your metric is understating the model) and AMBIGUOUS TO A HUMAN (that's the ceiling, not a bug — targeting it is how a project never ends)."
        },
        {
          "q": "How many optimizing metrics?",
          "a": "One. Everything else is a satisficing constraint — a threshold you must not cross. That's what makes a multi-objective problem decidable."
        },
        {
          "q": "What's the burden of proof on a satisficing metric?",
          "a": "REVERSED — you need evidence of no harm, so a wide interval is a failure rather than a pass. Same as the experimentation guardrail tier."
        },
        {
          "q": "When is calibration mandatory?",
          "a": "When a probability is consumed — a price, a cost threshold, an expected-value calculation. If only the ranking is consumed, it's optional."
        },
        {
          "q": "Why does that matter over time?",
          "a": "Systems drift from consuming an ordering to consuming a probability without anyone rechecking, which is how a fine model quietly becomes a wrong one."
        },
        {
          "q": "What do error categories become later?",
          "a": "Permanent regression tests, so a fixed category cannot silently return. That's the seam between error analysis and the test suite."
        }
      ],
      "standard": [
        {
          "q": "A model is at 82% accuracy. What do you need to know before deciding what to do?",
          "a": "THE FLOOR AND THE CEILING, BECAUSE 82% ALONE IS NOT INTERPRETABLE. The floor is the trivial baseline — majority class, last value, the existing rule — and the ceiling is human or Bayes-level performance on the same inputs. If the floor is 71% and the ceiling is 86%, there are FOUR points available rather than eighteen, and that reframing decides whether the project is nearly finished or barely started. Both numbers are available on day one and cost almost nothing. THEN THE THREE-GAP DECOMPOSITION, because the gaps point at different work. Ceiling minus training error is avoidable bias, and it says the model is not capable enough or not trained enough. Training minus dev error is variance, and it says regularize or get more data. AND DEV MINUS PRODUCTION IS A DISTRIBUTION MISMATCH, which is the term the classical framing omits and the one most often misread — a model that generalizes fine within its dataset and fails in production does not have an overfitting problem, and more regularization will not help; it needs training data that matches deployment. THEN ERROR ANALYSIS on a hundred randomly-sampled dev errors, categorized by hand, which turns the remaining gap into a ranked list of finite tasks.",
          "deepDive": {
            "q": "How careful do you need to be with the human-level ceiling?",
            "a": "The human-level ceiling deserves care because it is often used loosely. On perceptual tasks — vision, speech, reading a scan — human performance is a reasonable proxy for the Bayes rate and is measurable by having several annotators label the same examples and computing their agreement. On tasks where humans are not the reference — predicting churn, forecasting demand — there is no human ceiling and the right substitute is the irreducible noise you can estimate from repeated observations of the same input, or simply an honest statement that the ceiling is unknown. What you should not do is assume 100%, because that makes every remaining error look addressable and produces projects that never finish. The other subtlety is that the ceiling is per-slice: human performance on clear examples may be 99% and on ambiguous ones 60%, so an aggregate ceiling hides where the headroom actually is — which is the reference-class discipline from the trustworthy-AI module applied to the target rather than to the metric."
          }
        },
        {
          "q": "Walk me through an error analysis.",
          "a": "SAMPLE ABOUT A HUNDRED ERRORS FROM THE DEV SET, RANDOMLY. Not the worst ones, not the most confident mistakes — randomly, because the worst errors bias the category shares toward whatever produces confident failures and that misdirects the whole exercise. CATEGORIZE THEM BY HAND, adding categories as they appear and allowing multiple tags per example. COUNT AND SORT BY SHARE. A typical result looks like: blurry or low-quality input 31%, mislabelled ground truth 22%, rare-class confusion 18%, ambiguous even to a human 15%, and the thing everybody wanted to work on 4%. THE GAIN ARITHMETIC THEN BOUNDS EVERY PROPOSAL BEFORE IT IS BUILT: at 18% error, a perfect fix for a category holding 40% buys 7.2 points, and one holding 4% buys 0.7 at absolute best. TWO CATEGORIES REORDER THE PLAN ALMOST EVERY TIME. Mislabelled ground truth means the fix is data rather than modelling AND that your metric is understating the model by roughly that share, so the evaluation is wrong as well. Ambiguous-to-a-human is the ceiling showing through — it is not addressable, and including it in the target is how a project never finishes. THE WHOLE EXERCISE IS TWO HOURS and it is the cheapest way to redirect a quarter.",
          "deepDive": {
            "q": "What second-order consequence does the mislabelled category have?",
            "a": "The mislabelled category has a second-order consequence worth chasing: if 22% of your errors are label errors, then some fraction of your APPARENT successes are also mislabelled in the other direction, and your metric is noisy in both directions rather than just pessimistic. Relabelling a sample of the dev set is the cheap diagnostic — a few hundred examples relabelled carefully gives you an estimate of label noise, which both corrects the metric and tells you whether label quality is the binding constraint. In several domains it is, and no amount of modelling work substitutes. The related discipline is to turn the categories into permanent artefacts: each becomes a named slice with its own tracked metric, so a future model that improves the aggregate while regressing on 'blurry input' is visible. That connects error analysis to the test suite, and it is the mechanism by which a fixed problem stays fixed — otherwise the categories are rediscovered every six months by whoever next does the exercise."
          }
        },
        {
          "q": "How do you choose the metric?",
          "a": "ONE OPTIMIZING METRIC AND SEVERAL SATISFICING CONSTRAINTS, because that structure is what makes a multi-objective problem decidable. The optimizing metric is the thing you improve; the satisficing ones are thresholds you must not cross — latency under 100 ms at p99, model under 200 MB, false-positive rate under 2%, no subgroup below 0.80. That converts 'make it better without making anything worse' into a well-posed problem, and it forces the exchange rates into the open rather than hiding them in a weighted blend that someone chose once and nobody revisits. THE BURDEN OF PROOF IS REVERSED ON THE SATISFICING METRICS, which is the guardrail discipline from the experimentation material: you need evidence of NO harm, so a wide confidence interval is a failure rather than a pass, and 'p > 0.05 on latency' frequently means 'we could not have detected a 20% regression'. AND THE OPTIMIZING METRIC MUST MATCH WHAT THE DECISION CONSUMES. If only the ranking is consumed, AUC or NDCG is appropriate and calibration is optional. If a probability is consumed — a price, a cost threshold, an expected-value calculation — calibration is mandatory, and the metric has to reflect that.",
          "deepDive": {
            "q": "What should you watch for explicitly?",
            "a": "The drift from ordering to probability is worth watching for explicitly because it happens without a decision. A model ships as a ranker, then someone wires a threshold to the score for an automation rule, then a downstream service starts combining it with another model's output — and at each step the requirement changed while nobody re-examined the model. The cheap defence is a written contract per model output stating what it means, what consumes it, and whether it is an ordering or a probability, checked when consumers change. That is about ten lines in a model card and it prevents a specific and expensive class of failure. The other thing worth building early is the slice list: the subgroups, segments and error categories the satisficing metrics apply to, fixed in advance rather than chosen after seeing results — because choosing which slices to report after the fact is the same selection problem as choosing a primary metric after the readout, and it leaves no trace."
          }
        },
        {
          "q": "How do you decide between more data, better labels and a better model?",
          "a": "THE THREE-GAP DECOMPOSITION ANSWERS IT DIRECTLY AND INTUITION ANSWERS IT BADLY. If avoidable bias is large — training error is far from the ceiling — the model is not fitting, so more data will not help and the answer is capacity, features, or training longer. If variance is large — training error is much better than dev — more data or regularization is the answer. If the dev-to-production gap is large, it is a mismatch and the answer is data that matches deployment, which is a different and more specific request than 'more data'. ERROR ANALYSIS THEN REFINES IT: if 22% of errors are mislabelled ground truth, the binding constraint is label quality and neither more data nor a better model addresses it — relabelling is the highest-return work and it also corrects the metric. I'D ALSO RUN A LEARNING CURVE, which is cheap and settles the more-data question empirically: plot dev error against training-set size, and if it has flattened, more of the same data will not help and the answer is different data or a different model. That plot takes an afternoon and it replaces an argument that otherwise runs for weeks.",
          "deepDive": {
            "q": "What is the learning curve's less well known second use?",
            "a": "The learning curve has a second use that is less well known: comparing the curve's shape across slices tells you where more data would help, which converts 'collect more data' into 'collect more data of this kind'. If the curve is flat overall but still descending for a rare class, targeted collection on that class is the action, and that is a far cheaper request than proportional scaling. It also interacts with the active-learning material — if you are going to collect more labels, choosing which ones is a lever worth using, with the caveat that an actively-selected set biases your evaluation and needs a separate random sample for measurement. The general shape of this decision is worth stating: each of the three gaps has a distinct diagnostic and a distinct remedy, and the failure mode is applying the remedy for one gap to another, which is how a team spends a quarter collecting data for a bias problem or adding regularization for a mismatch problem. Naming which gap you are attacking, in one sentence, before starting the work, prevents most of it."
          }
        },
        {
          "q": "How does this lesson set up the module?",
          "a": "IT IS THE FIRST SEAM, AND THE MODULE'S THEME IS THAT THE FAILURES ARE AT THE SEAMS. Here the seam is between THE METRIC AND THE GOAL: two things that are each perfectly well-defined, connected by an assumption nobody writes down. A metric can be measured precisely, optimized effectively, and be the wrong thing — and no amount of engineering downstream repairs that, which is why this lesson comes first. EVERY LATER LESSON IS ANOTHER SEAM between components that are individually correct: training and serving runtimes in the export lesson, the model and the request in serving, one environment and another in containerization, deployment and reality in monitoring, a commit and production in CI/CD, code correctness and model correctness in testing. AND AT EVERY ONE THE FAILURE IS SILENT — no exception, wrong answer — which is what makes them different from ordinary bugs and what makes the discipline of naming the contract at each seam worth the effort. THE TRANSFERABLE QUESTION for the module: what is the contract at this boundary, and what happens when it is violated without anyone noticing?",
          "deepDive": {
            "q": "Why is MLOps a distinct discipline rather than software engineering with models in it?",
            "a": "It is worth being explicit that this framing is why MLOps is a distinct discipline rather than software engineering with models in it. In ordinary software, a violated contract between components usually produces an exception, a type error, or a failed test — the system tells you. In an ML system the components exchange arrays of numbers, and a violated contract produces different numbers, which flow through and become a decision. Nothing raises. That is the structural reason ML systems need monitoring, data validation and parity checks that ordinary services do not, and it is why the answer to 'why is this so much harder than it looks' is not complexity but SILENCE. Every practice in the remaining lessons — schema validation, export parity checks, canary deployment, drift monitoring, model tests — exists to convert a silent failure into a loud one, which is a useful way to evaluate any proposed MLOps tool: does it make a silent failure audible, and at which seam?"
          }
        },
        {
          "q": "What would you do in the first week of a new ML project?",
          "a": "FIVE THINGS, IN THIS ORDER, AND NONE OF THEM IS TRAINING A MODEL. ONE: WRITE DOWN THE DECISION the system will make and who acts on it, because the metric follows from the decision and choosing the metric first is how the wrong thing gets optimized. TWO: ESTABLISH THE FLOOR — the trivial baseline, the existing rule, the majority class — because it is the number every future result is measured against and it sometimes ends the project immediately. THREE: ESTABLISH THE CEILING, by having several people label the same examples and measuring agreement, which gives both a target and an estimate of label noise. FOUR: BUILD THE EVALUATION BEFORE THE MODEL — the split that respects the data's dependency channel, the slices that matter, and the satisficing constraints — because the evaluation is what everything else is judged by and retrofitting it is how leakage survives. FIVE: A DELIBERATELY SIMPLE MODEL, end to end, into a serving path if possible, because that exercises every seam in the system while the stakes are low and reveals which ones are hard. ONLY THEN error analysis on its errors, which now has something to analyse and directs everything after.",
          "deepDive": {
            "q": "Which item generates the most resistance and pays the most?",
            "a": "The fifth item is the one that generates the most resistance and pays the most. An end-to-end path with a trivial model — logistic regression, or even a rule — surfaces the integration problems while nobody is invested in a result: whether the features are available at serving time, whether the latency budget is achievable, whether the labels arrive when you thought, whether the deployment path works at all. Those are the expensive discoveries and they are much cheaper before six weeks of modelling than after. It is also the fastest way to find out that the project is infeasible for a reason unrelated to accuracy, which happens often enough to justify the practice on its own. The related habit is to write the model card's skeleton in week one — what it predicts, what consumes it, what it must not do, what would make you turn it off — because filling it in later means reconstructing decisions nobody recorded, and because a question you cannot answer in week one is usually the question the project should be organized around."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's theme",
        "back": "THE FAILURES ARE AT THE SEAMS. Every lesson is a boundary between two components that are each individually correct — and at every seam the failure is SILENT: no exception, wrong answer."
      },
      {
        "type": "formula",
        "front": "★ Floor and ceiling frame the metric",
        "back": "floor (trivial baseline) ≤ model ≤ ceiling (human/Bayes). 0.71 ≤ 0.82 ≤ 0.86 means **four points available, not eighteen** — and both numbers exist on day one."
      },
      {
        "type": "formula",
        "front": "The three gaps",
        "back": "ceiling − train = avoidable BIAS · train − dev = VARIANCE · **dev − production = DISTRIBUTION MISMATCH**. The third is omitted by the classical framing and is the most often misread."
      },
      {
        "type": "pitfall",
        "front": "Dev-to-production gap",
        "back": "A data MISMATCH, not overfitting. Regularization won't touch it — the fix is training data that matches deployment. Reading it as overfitting costs a quarter."
      },
      {
        "type": "formula",
        "front": "Error-analysis gain arithmetic",
        "back": "max gain = error rate × share(category) × fix effectiveness. At 18% error: a category holding 40% buys **7.2 points**; one holding 4% buys **0.7** at best. Both known before any work."
      },
      {
        "type": "intuition",
        "front": "★ The two categories that reorder the plan",
        "back": "MISLABELLED GROUND TRUTH (fix is data — and your metric is UNDERSTATING the model) and AMBIGUOUS TO A HUMAN (that's the ceiling, not a bug; targeting it is how a project never ends)."
      },
      {
        "type": "pitfall",
        "front": "Sample randomly, not the worst errors",
        "back": "The worst errors bias category shares toward whatever produces CONFIDENT mistakes, which misdirects the entire priority list."
      },
      {
        "type": "definition",
        "front": "Optimizing vs satisficing metrics",
        "back": "ONE optimizing metric; everything else a threshold you must not cross (p99 latency, size, FPR, no subgroup below X). That's what makes a multi-objective problem decidable."
      },
      {
        "type": "intuition",
        "front": "The reversed burden of proof",
        "back": "On a satisficing metric you need evidence of NO HARM, so a wide interval is a FAILURE, not a pass. \"p > 0.05 on latency\" often means \"we couldn't have detected a 20% regression.\""
      },
      {
        "type": "intuition",
        "front": "The metric must match what's consumed",
        "back": "Ordering consumed → AUC/NDCG, calibration optional. PROBABILITY consumed (price, cost threshold, expected value) → calibration mandatory. Systems drift from the first to the second with nobody rechecking."
      },
      {
        "type": "intuition",
        "front": "More data, better labels, or a better model?",
        "back": "The three gaps answer it. Plus a LEARNING CURVE — dev error vs training-set size — which settles the more-data question empirically in an afternoon and replaces a weeks-long argument."
      },
      {
        "type": "intuition",
        "front": "★ Week one, in order",
        "back": "Write the DECISION → establish the FLOOR → establish the CEILING (multi-annotator agreement) → **build the EVALUATION before the model** → a deliberately simple model end-to-end into a serving path. Only then error analysis."
      }
    ],
    "refs": [
      {
        "title": "Ng, Machine Learning Yearning",
        "url": "https://info.deeplearning.ai/machine-learning-yearning-book"
      },
      {
        "title": "Google, Rules of Machine Learning: Best Practices for ML Engineering",
        "url": "https://developers.google.com/machine-learning/guides/rules-of-ml"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Northcutt, Athalye & Mueller (2021), Pervasive Label Errors in Test Sets Destabilize ML Benchmarks",
        "url": "https://arxiv.org/abs/2103.14749"
      },
      {
        "title": "Huyen (2022), Designing Machine Learning Systems",
        "url": "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
      }
    ],
    "demos": [
      "classification-metrics",
      "roc",
      "bias-variance-decomp",
      "cross-validation"
    ]
  }
};
