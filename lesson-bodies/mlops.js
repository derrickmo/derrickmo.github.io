// GENERATED from content/lessons/mlops/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "mlops". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
  },
  "mlflow": {
    "level": "core",
    "body": {
      "intuition": [
        "The seam here is between AN EXPERIMENT AND ITS REPRODUCTION, and the failure is the most ordinary in applied ML: a number in a notebook that nobody can produce again. The model that scored 0.87 exists, and the combination of code, data, parameters and environment that produced it does not, so the result is an anecdote rather than a measurement.",
        "Tracking is not a dashboard. It is the discipline of recording enough that a run is REPRODUCIBLE, and the useful test of any tracking setup is whether a colleague can regenerate a result from the record alone. Four things have to be pinned and teams routinely pin two: the code version, the DATA version, the parameters, and the environment.",
        "The data version is the one that gets skipped, and it is the one that silently invalidates comparisons. If two runs a month apart used 'the training table' and the table grew, the comparison between them is confounded by a variable nobody recorded - which is the same structural problem as an unlogged confounder, and it means the entire experiment log is a set of observational results rather than controlled ones."
      ],
      "math": [
        {
          "h": "What a reproducible run record contains",
          "paras": [
            "Four coordinates, and a run is reproducible only if all four are pinned. Most setups capture parameters and metrics and treat the other two as implicit.",
            "The test is operational: can someone else regenerate the number from the record?"
          ],
          "tex": "\\text{run} = \\big(\\underbrace{\\text{code SHA}}_{\\text{usually pinned}},\\ \\underbrace{\\text{data version}}_{\\textbf{usually not}},\\ \\underbrace{\\text{params}}_{\\text{pinned}},\\ \\underbrace{\\text{environment}}_{\\textbf{usually not}}\\big) \\to (\\text{metrics},\\ \\text{artifacts})",
          "texNote": "Pinning code and parameters alone gives a record that reproduces only on the machine and the dataset it was run against, which is exactly the situation that produces 'it worked last month'."
        },
        {
          "h": "The comparison problem, stated as confounding",
          "paras": [
            "Two runs differing in more than one coordinate cannot attribute the difference. That is the same identification problem as any observational comparison, arriving in an experiment log.",
            "Most experiment tables are observational data about your own project."
          ],
          "tex": "\\Delta\\text{metric} = f(\\Delta\\text{code}, \\Delta\\text{data}, \\Delta\\text{params}, \\Delta\\text{env}) \\quad\\Rightarrow\\quad \\text{attributable only if exactly one } \\Delta \\neq 0",
          "texNote": "A run log where the data version is unrecorded has an unobserved variable in every comparison. You cannot condition on what you did not log, which is module 23's point in a tooling costume."
        },
        {
          "h": "Seeds, and what they do and do not buy",
          "paras": [
            "A fixed seed makes a run repeatable and does NOT make a result reliable. A single-seed comparison between two methods is a sample of size one from a distribution whose spread is often larger than the difference being claimed."
          ],
          "tex": "\\text{report } \\bar{m} \\pm s \\text{ over } k \\text{ seeds, not } m_{\\text{seed}=42}",
          "texNote": "The practical rule: log the seed for reproducibility, and report a mean and spread over several seeds for any claim. A method that wins on one seed and loses on another has not won."
        }
      ],
      "code": [
        {
          "h": "What to log, and the two entries usually missing",
          "paras": [
            "Everything below is cheap. The two marked entries are the ones that turn a log into a reproducible record."
          ],
          "code": "# PARAMS       hyperparameters, architecture, optimizer, schedule\n# METRICS      train/val curves, final numbers, PER-SLICE metrics\n# ARTIFACTS    the model, the preprocessing object, plots, the config file\n# ★ CODE       the git SHA - and whether the tree was DIRTY at run time\n# ★ DATA       a version or content hash of the exact training set\n# ENVIRONMENT  the lockfile, the CUDA/driver version, the framework version\n# SEED         for repeatability - not for reliability\n# HARDWARE     device type and count (a batch-size-per-device change is a\n#              different experiment)\n\n# ★ THE DIRTY-TREE FLAG is the cheapest high-value field: a SHA recorded\n#   from a modified working tree points at code that never existed, and\n#   it is a one-line check that catches the most common reproduction\n#   failure in practice.",
          "caption": "Logging a git SHA from an uncommitted working tree is worse than logging nothing, because it looks like a pin and is not."
        },
        {
          "h": "The registry, and what a stage actually means",
          "paras": [
            "A model registry is the seam between an experiment and a deployment. Its value is not storage - it is that the deployed artifact has a traceable lineage back to a run."
          ],
          "code": "# THE QUESTION A REGISTRY MUST ANSWER\n#   'which run produced the model currently serving traffic, and can I\n#    regenerate it?'   -> if the answer is no, you cannot debug production\n\n# STAGES are a workflow convention, not a guarantee\n#   None -> Staging -> Production -> Archived\n#   ★ nothing enforces that a Production model passed anything; the gates\n#     live in CI/CD, and the stage is a label recording that they ran\n\n# WHAT MUST BE VERSIONED TOGETHER, or the seam leaks\n#   the model weights\n#   the PREPROCESSING object (fitted scalers, encoders, vocabularies)\n#   the feature computation code\n#   ★ these three must move as ONE unit. Versioning weights alone is the\n#     most common source of train/serve skew, because the preprocessing\n#     drifts independently and nothing raises.",
          "caption": "The preprocessing object is part of the model. Treating it as code rather than as an artifact is how a redeploy silently changes predictions."
        }
      ],
      "useCases": [
        "Any project with more than a handful of runs, where the log is what lets you answer 'what did we already try' without re-running it.",
        "Debugging a production regression, where the registry's lineage from serving artifact back to run is the difference between a two-hour investigation and a rebuild.",
        "Handing a project over, where the record is the deliverable and an unreproducible result is not transferable.",
        "Reporting results honestly, where a mean and spread over seeds distinguishes a real improvement from a lucky run."
      ],
      "pitfalls": [
        "Not versioning the data. Two runs a month apart against 'the training table' are confounded by an unrecorded variable, which makes the whole experiment log observational rather than controlled.",
        "Logging a git SHA from a dirty working tree. That points at code that never existed and looks like a pin, which is worse than logging nothing.",
        "Versioning model weights without the preprocessing object. The fitted scalers, encoders and vocabularies are part of the model, and letting them drift independently is the most common source of train/serve skew.",
        "Treating a fixed seed as evidence. It buys repeatability, not reliability - report a mean and spread over several seeds for any claim.",
        "Comparing runs that differ in more than one coordinate. The difference is unattributable, which is the identification problem from the causal module arriving in an experiment table.",
        "Reading a registry stage as a guarantee. Nothing enforces that a Production model passed anything; the gates live in CI/CD and the stage records that they ran.",
        "Logging only aggregate metrics. Per-slice metrics cost nothing extra at log time and are the only way a later regression on a subgroup is visible."
      ],
      "connections": [
        {
          "ref": "mlops/project-structure",
          "text": "Where the configuration lives so that a run is describable by a single versioned object rather than by a call signature."
        },
        {
          "ref": "mlops/cicd",
          "text": "Where the gates actually are - a registry stage records that they ran, and the pipeline is what enforces them."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "Why an unrecorded data version makes every run comparison observational: you cannot condition on what you did not log."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The seam this feeds - the deployed artifact must trace back to a run, or a production regression cannot be debugged."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "Why a single-seed, single-split number is a sample of size one, and what the spread across repetitions is telling you."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What makes a run reproducible?",
          "a": "Four pinned coordinates: code SHA, **DATA version**, parameters, and environment. Most setups pin parameters and code and treat the other two as implicit."
        },
        {
          "q": "Which is most often missing?",
          "a": "The data version. Two runs a month apart against \"the training table\" differ in an unrecorded variable, so the comparison is confounded."
        },
        {
          "q": "Why is that a causal problem?",
          "a": "Δmetric = f(Δcode, Δdata, Δparams, Δenv) is attributable only if exactly one Δ ≠ 0. You cannot condition on what you did not log — module 23 in a tooling costume."
        },
        {
          "q": "★ What's wrong with a SHA from a dirty tree?",
          "a": "It points at code that never existed and LOOKS like a pin, which is worse than logging nothing. Log a dirty-tree flag — one line, catches the most common reproduction failure."
        },
        {
          "q": "What does a fixed seed buy?",
          "a": "Repeatability, not reliability. Log it for reproduction; report a mean and spread over several seeds for any claim."
        },
        {
          "q": "A method wins on one seed. Has it won?",
          "a": "No. A single-seed comparison is a sample of size one from a distribution whose spread is often larger than the claimed difference."
        },
        {
          "q": "★ What must be versioned TOGETHER?",
          "a": "Model weights + the **PREPROCESSING object** (fitted scalers, encoders, vocabularies) + the feature computation code. Versioning weights alone is the most common source of train/serve skew."
        },
        {
          "q": "What question must a registry answer?",
          "a": "\"Which run produced the model currently serving traffic, and can I regenerate it?\" If the answer is no, you cannot debug production."
        },
        {
          "q": "Does a Production stage guarantee anything?",
          "a": "No — it's a workflow label. Nothing enforces that the model passed anything; the gates live in CI/CD and the stage records that they ran."
        },
        {
          "q": "What else should be logged that usually isn't?",
          "a": "PER-SLICE metrics (free at log time, and the only way a later subgroup regression is visible) and hardware/device count, since batch-size-per-device changes the experiment."
        },
        {
          "q": "Is tracking a dashboard?",
          "a": "No — it's the discipline of recording enough to REPRODUCE. The test: can a colleague regenerate the number from the record alone?"
        },
        {
          "q": "How do you version a large dataset cheaply?",
          "a": "A content hash of the manifest plus an immutable snapshot or a time-travel table. You need identity, not a copy."
        }
      ],
      "standard": [
        {
          "q": "What does experiment tracking actually need to capture, and why?",
          "a": "FOUR COORDINATES, AND A RUN IS REPRODUCIBLE ONLY IF ALL FOUR ARE PINNED: the code version, the DATA version, the parameters, and the environment. Most setups capture parameters and metrics well, capture code passably, and treat data and environment as implicit — which produces a record that reproduces only on the machine and against the dataset it originally ran on. THE OPERATIONAL TEST IS SIMPLE: can a colleague regenerate the number from the record alone? If not, the result is an anecdote. THE DATA VERSION IS THE ONE THAT SILENTLY INVALIDATES COMPARISONS. If two runs a month apart both trained on 'the training table' and the table grew, the difference between them is a function of both the change you made and the data change you did not record, and it is unattributable. That is exactly the identification problem from the causal module — Δmetric depends on Δcode, Δdata, Δparams and Δenv, and it is attributable only when exactly one is nonzero — so an experiment log without data versions is a set of OBSERVATIONAL results about your own project rather than controlled ones. AND THE PREPROCESSING OBJECT IS PART OF THE MODEL: fitted scalers, encoders and vocabularies must be versioned with the weights, or they drift independently and nothing raises.",
          "deepDive": {
            "q": "Which field is the cheapest and almost nobody logs?",
            "a": "The dirty-tree flag deserves a specific mention because it is the cheapest high-value field in a tracking schema and almost nobody logs it. A git SHA recorded while the working tree has uncommitted changes points at code that never produced that result, and because it LOOKS like a pin it is actively worse than recording nothing — someone will check out that SHA, get a different number, and lose a day. One line at run start that records whether the tree was clean prevents it entirely. On data versioning, the practical objection is cost, and the answer is that you need IDENTITY rather than a copy: a content hash over the file manifest, or a snapshot identifier from a table format that supports time travel, is a few bytes and is sufficient to detect that two runs saw different data. That distinction — identity versus copy — is what makes data versioning affordable at scale, and confusing them is why teams decide it is impractical and then spend years unable to compare their own experiments."
          }
        },
        {
          "q": "How would you report an experimental result honestly?",
          "a": "WITH A MEAN AND A SPREAD OVER SEEDS, AGAINST A BASELINE, ON SLICES. A single-seed number is a sample of size one, and for many methods the seed-to-seed spread is larger than the difference being claimed — so a method that wins on seed 42 and loses on seed 7 has not won, and reporting only the win is a selection effect. The seed should be LOGGED for reproducibility and never used as evidence. AGAINST A BASELINE, because a metric with no comparison is not a result, and the baseline must have received the same tuning budget — the realistic-evaluation problem that appeared in the semi-supervised lesson and again in tabular deep learning, where a heavily-tuned new method is compared against a default. AND ON SLICES, because per-slice metrics are free at log time and an aggregate improvement is compatible with a regression on a subgroup, which is the aggregation failure this curriculum has found in every module. I'D ALSO REPORT WHAT CHANGED — exactly one coordinate if possible — because a run differing in code, data and parameters simultaneously produces a number nobody can attribute, and a log full of those is a log you cannot learn from.",
          "deepDive": {
            "q": "Is there a selection problem that tracking tools make worse?",
            "a": "There is a subtler selection problem in experiment logs that is worth naming because tracking tools make it easier rather than harder: running many configurations and reporting the best is a multiple-comparisons exercise, and the best-of-N on a validation set is optimistically biased by roughly the spread of the N. That is the same arithmetic as peeking in the experimentation module, and the mitigation is the same — a final held-out evaluation the search never touched, consulted once. Tracking systems encourage large sweeps and make the best result easy to surface, so the discipline has to be deliberate: record the sweep, report the selected configuration's performance on a set that played no part in selecting it, and state how many configurations were tried. That last number is what a reader needs to discount appropriately, and it is almost never reported. It costs one field."
          }
        },
        {
          "q": "What is a model registry for, beyond storage?",
          "a": "LINEAGE, WHICH IS THE ONLY THING THAT MAKES A PRODUCTION REGRESSION DEBUGGABLE. The question a registry must answer is: which run produced the model currently serving traffic, and can I regenerate it? If the answer is no, then when production degrades you cannot compare the serving artifact against the run that validated it, cannot check whether the preprocessing matches, and cannot reproduce the training to bisect. You are reduced to retraining and hoping, which is a bad position at exactly the moment you can least afford it. THE SECOND FUNCTION IS TO MAKE THE DEPLOYABLE UNIT EXPLICIT, and the unit is bigger than the weights: the model, the fitted preprocessing object, and the feature computation code must move together as one versioned artifact. Versioning weights alone is the most common source of train/serve skew, because the preprocessing is treated as code, code evolves independently, and a redeploy silently changes predictions with nothing raising. THE THIRD IS WORKFLOW, and here I would be precise: stages like Staging and Production are LABELS, not guarantees. Nothing about the registry enforces that a Production model passed a test; the gates live in CI/CD, and the stage records that they ran.",
          "deepDive": {
            "q": "Why does that distinction matter?",
            "a": "That last distinction matters because registries are frequently sold as governance and are not, on their own. A stage transition is an assertion by whoever made it, and the assurance comes from whether a pipeline gated the transition on tests, evaluation thresholds, and a canary — which is the CI/CD lesson's territory. A useful design principle is that stage transitions should be performed by automation rather than by people, so the label is a consequence of the gate rather than a claim about it. The related practice worth adopting is recording the EVALUATION artifacts alongside the model in the registry — the slice metrics, the calibration curve, the fairness table, the parity check against the exported version — so that the deployed artifact carries its own evidence. That turns the registry into the answer to 'why did we believe this was safe', which is the question asked after an incident, and reconstructing it from scattered notebooks afterwards is exactly the situation this whole lesson exists to prevent."
          }
        },
        {
          "q": "How do you version a dataset without copying it?",
          "a": "BY RECORDING IDENTITY RATHER THAN CONTENT, WHICH IS CHEAP. The requirement is to detect that two runs saw different data and to be able to reconstruct which data a run saw — neither of which needs a copy. A content hash over the file manifest, including paths, sizes and modification times or per-file hashes, is a few bytes and is sufficient for detection. For warehouse tables, modern table formats support snapshot identifiers and time travel, so recording a snapshot ID pins the exact state and reconstruction is a query. For append-only logs, a maximum timestamp or offset serves the same purpose. FOR THE CASES WHERE A COPY IS GENUINELY WARRANTED — a benchmark set, a golden evaluation set, a labelled sample — copy them, because they are small and they are the artifacts you will most want to be certain about years later. THE ANTI-PATTERN IS TREATING THIS AS ALL-OR-NOTHING: teams conclude that versioning petabytes is impractical, log nothing, and lose the ability to compare their own experiments. Identity for the large training data and copies for the small evaluation data is affordable at any scale and captures nearly all of the value.",
          "deepDive": {
            "q": "Is there a second-order benefit?",
            "a": "There is a second-order benefit that makes this worth more than it first appears: once the data version is a field, you can detect the specific failure where a result becomes unreproducible because the data moved under it, which otherwise presents as a mysterious inability to replicate and gets attributed to seeds or environments. Being able to say 'the data version differs' resolves those in seconds. It also makes the training pipeline's inputs auditable, which matters when a regulator or an incident review asks what a model was trained on — and 'the table as of some point last spring' is not an answer. The related practice is to pin the data version in the pipeline definition rather than resolving 'latest' at run time, so a scheduled retrain is a deliberate act with a recorded input rather than a moving target. Retrains that silently pick up whatever data exists are how a model changes without a corresponding change in any code, which is the seam this lesson is about."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE SEAM IS BETWEEN AN EXPERIMENT AND ITS REPRODUCTION, and the failure has the module's signature: nothing raises. A run completes, a number is produced, and it is correct — the defect is that the combination which produced it was never recorded, and that defect is invisible until someone tries to reproduce it, which is typically weeks later during an incident. NO ERROR OCCURS AT THE MOMENT THE INFORMATION IS LOST. THE CONTRACT AT THIS SEAM is that a record contains everything needed to regenerate its result, and the violation is silent by construction because the missing coordinate — usually the data version or the environment — is absent rather than wrong. THAT IS WHY THE DISCIPLINE HAS TO BE UP FRONT: unlike most bugs, this one cannot be found by testing after the fact, because there is nothing to test. It also connects to the causal module directly: an experiment log with an unrecorded coordinate is observational data about your own project, and every comparison in it is confounded by whatever you did not log. You cannot condition on a variable you never recorded, which is the same statement in two vocabularies.",
          "deepDive": {
            "q": "What is the organizational version of this failure?",
            "a": "It is worth noting the organizational version of this failure, because it is more common than the technical one. Tracking usually exists — someone set up MLflow — and the gap is that it records what the library logs by default, which is parameters and metrics, and not what makes a run reproducible. So the team has a dashboard, believes it has traceability, and discovers during an incident that it has neither. The cheap remedy is to write down the four coordinates as an explicit schema and to fail a run that cannot populate them, which converts a convention into a constraint. That is the same move as every other practice in this module — turn a silent omission into a loud failure at the point where it happens — and it is the criterion worth applying to any MLOps tooling decision: does this make a silent failure audible, and where?"
          }
        },
        {
          "q": "A result from three months ago cannot be reproduced. How do you investigate?",
          "a": "BY BISECTING THE FOUR COORDINATES, IN ORDER OF PRIOR PROBABILITY. FIRST, DATA — it is the most commonly unpinned and the most commonly changed, so check whether the training table has grown, been backfilled, or had a schema change since; a backfill is particularly insidious because it rewrites history and no code changed. SECOND, ENVIRONMENT — a framework, CUDA or driver upgrade changes numerics and occasionally changes defaults, and a library's default parameter changing between minor versions has silently altered many results; the lockfile is what settles it, and its absence is itself the finding. THIRD, CODE — check whether the recorded SHA is real and whether the working tree was clean, since a SHA logged from a dirty tree points at code that never ran. FOURTH, SEED AND NONDETERMINISM — GPU reductions are nondeterministic by default, so exact reproduction may require deterministic flags at a performance cost, and if the gap is within the seed-to-seed spread then there was never a result to reproduce. I'D ALSO CHECK HARDWARE, because a different device count changes the effective batch size and is a different experiment wearing the same config.",
          "deepDive": {
            "q": "Which cause catches people repeatedly?",
            "a": "The last one catches people repeatedly and is worth internalizing: a config specifying batch size per device produces a different global batch on four GPUs than on eight, which changes the effective learning rate dynamics and can change results materially — and the config file is identical, so every recorded coordinate matches. Logging device type and count is one field and it resolves this class immediately. The broader lesson from a failed reproduction is that it should generate a schema change rather than only a fix: whatever coordinate was missing gets added as a required field, so the same investigation cannot recur. Teams that treat each reproduction failure as a one-off keep having them; teams that treat it as a gap in the record converge on a schema that works. That is the same posture as adding a regression test after a bug, applied to metadata rather than to code, and it is the mechanism by which tracking discipline actually improves rather than being periodically re-exhorted."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ The four coordinates of a reproducible run",
        "back": "code SHA · **DATA version** · parameters · environment. Most setups pin params and code and treat the other two as implicit. Test: can a colleague regenerate the number from the record alone?"
      },
      {
        "type": "formula",
        "front": "Why an unlogged coordinate is confounding",
        "back": "Δmetric = f(Δcode, Δdata, Δparams, Δenv) — attributable only if exactly one Δ ≠ 0. **You cannot condition on what you did not log.** An unversioned log is observational data about your own project."
      },
      {
        "type": "pitfall",
        "front": "★ A SHA from a dirty working tree",
        "back": "Points at code that NEVER produced the result, and it LOOKS like a pin — worse than logging nothing. A one-line clean/dirty flag catches the most common reproduction failure."
      },
      {
        "type": "intuition",
        "front": "What a fixed seed buys",
        "back": "Repeatability, NOT reliability. Log it to reproduce; report mean ± spread over several seeds for any claim. A method that wins on seed 42 and loses on seed 7 has not won."
      },
      {
        "type": "pitfall",
        "front": "★ Version these three TOGETHER",
        "back": "Model weights + the **PREPROCESSING object** (fitted scalers, encoders, vocabularies) + feature computation code. Versioning weights alone is the most common source of train/serve skew — the preprocessing drifts and nothing raises."
      },
      {
        "type": "definition",
        "front": "The question a registry must answer",
        "back": "\"Which run produced the model currently serving traffic, and can I regenerate it?\" If no, you cannot debug production — you're reduced to retraining and hoping."
      },
      {
        "type": "pitfall",
        "front": "Does a \"Production\" stage guarantee anything?",
        "back": "No — it's a LABEL. Nothing enforces that the model passed anything; the gates live in CI/CD. Stage transitions should be made by AUTOMATION, so the label is a consequence of the gate."
      },
      {
        "type": "intuition",
        "front": "Versioning data cheaply: identity, not copies",
        "back": "A content hash over the file manifest, a table snapshot ID, or a max offset — a few bytes. COPY only the small things (benchmark and golden evaluation sets). Treating it as all-or-nothing is why teams log nothing."
      },
      {
        "type": "pitfall",
        "front": "The sweep selection effect",
        "back": "Best-of-N on a validation set is optimistically biased by roughly the spread of the N — the peeking arithmetic again. Report the selected config on a set that played NO part in selection, and state how many configs were tried."
      },
      {
        "type": "pitfall",
        "front": "The hardware coordinate",
        "back": "Batch size PER DEVICE means four GPUs and eight GPUs are different experiments with an IDENTICAL config file. Log device type and count — one field, and it resolves a whole class of failed reproductions."
      },
      {
        "type": "intuition",
        "front": "Investigating a failed reproduction",
        "back": "Bisect by prior probability: DATA (grew? backfilled? schema change?) → ENVIRONMENT (a library default changed between minor versions) → CODE (real SHA? clean tree?) → seed/nondeterminism → hardware."
      },
      {
        "type": "intuition",
        "front": "★ The seam, and why it's silent",
        "back": "Between an experiment and its REPRODUCTION. Nothing raises when the information is lost — the missing coordinate is ABSENT rather than wrong, so it cannot be found by testing afterwards. A failed reproduction should produce a SCHEMA change, not just a fix."
      }
    ],
    "refs": [
      {
        "title": "MLflow Documentation, Tracking and Model Registry",
        "url": "https://mlflow.org/docs/latest/tracking.html"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Pineau et al. (2021), Improving Reproducibility in Machine Learning Research",
        "url": "https://www.jmlr.org/papers/v22/20-303.html"
      },
      {
        "title": "Bouthillier, Laurent & Vincent (2019), Unreproducible Research is Reproducible",
        "url": "https://proceedings.mlr.press/v97/bouthillier19a.html"
      },
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      }
    ],
    "demos": [
      "cross-validation",
      "overfitting",
      "lr-schedule",
      "bias-variance-decomp"
    ]
  },
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
    ]
  },
  "model-serving": {
    "level": "core",
    "body": {
      "intuition": [
        "Serving is the seam between THE MODEL AND THE REQUEST, and the defining failure is train/serve skew: the training pipeline and the serving path each compute features correctly, they compute them slightly differently, and the difference flows into a prediction with nothing raising.",
        "The measurement that makes this concrete is a single preprocessing mistake - serving refits the scaler on the incoming batch instead of loading the one from training. AUC was IDENTICAL to four decimals, 0.7823 against 0.7823, because rescaling preserves the ranking. So the offline metric check PASSES. The probabilities moved by a mean of 0.0042 and 0.69% of decisions at a 0.5 threshold flipped - and probabilities are what a cost threshold consumes.",
        "The detail that makes it a production bug rather than a curiosity is the batch-size dependence. At a serving batch of 8,000 the decision change was 0.69%; at 500 it was 1.05%; at 50, 3.69%; at 8, 4.34%. THE BUG IS NEARLY INVISIBLE AT LARGE BATCH AND SEVERE AT SMALL BATCH, so it passes a load test and breaks on real traffic, which is the shape of a great many serving incidents."
      ],
      "math": [
        {
          "h": "★ The skew that an offline check cannot see",
          "paras": [
            "A monotone transform of the inputs changes the probabilities and preserves the ranking, so any ranking metric is blind to it.",
            "That is the general reason offline validation misses skew: most offline metrics are rank-based."
          ],
          "tex": "\\mathrm{AUC}_{\\text{correct}} = 0.7823 \\;=\\; \\mathrm{AUC}_{\\text{skewed}} = 0.7823, \\qquad \\overline{|\\Delta p|} = 0.0042, \\qquad \\Pr[\\text{decision flips at } 0.5] = 0.69\\%",
          "texNote": "The check that would have caught it is a prediction-level comparison between the training path and the serving path on identical inputs - not a metric comparison, which is exactly the quantity that stayed fixed."
        },
        {
          "h": "★ Severity scales inversely with batch size",
          "paras": [
            "A statistic computed on the request batch converges to the training statistic as the batch grows, so the error is largest exactly where production operates.",
            "Load tests use large batches; real traffic arrives in ones and twos."
          ],
          "tex": "\\begin{array}{rrr} \\text{serving batch} & \\overline{|\\Delta p|} & \\text{decisions changed}\\\\ 8{,}000 & 0.0042 & 0.69\\%\\\\ 500 & 0.0077 & 1.05\\%\\\\ 50 & 0.0265 & 3.69\\%\\\\ 8 & 0.0685 & 4.34\\% \\end{array}",
          "texNote": "An order of magnitude in batch size costs roughly an order of magnitude in error. A bug that is invisible in staging and severe in production is not bad luck - it is a predictable consequence of testing at the wrong batch size."
        },
        {
          "h": "The latency budget, decomposed",
          "paras": [
            "Model inference is usually a minority of the request. Optimizing it while feature fetch dominates is the most common misallocation in serving work."
          ],
          "tex": "t_{p99} = t_{\\text{network}} + t_{\\text{feature fetch}} + t_{\\text{preprocess}} + t_{\\text{model}} + t_{\\text{postprocess}} + t_{\\text{serialize}}",
          "texNote": "Measure each term before optimizing any. And p99 with fan-out is set by the slowest dependency, so a request touching ten shards needs each shard at roughly p99.9 - which is the tail-at-scale arithmetic."
        }
      ],
      "code": [
        {
          "h": "★ The check that catches skew",
          "paras": [
            "A prediction-level comparison on identical raw inputs, run in CI and again against production traffic. Metric comparisons cannot see this."
          ],
          "code": "# THE ASSERTION\n#   feed the SAME RAW INPUT through the training path and the serving path\n#   compare at TWO points:\n#     1 the model's INPUT TENSOR   -> catches preprocessing skew\n#     2 the final PREDICTION       -> catches runtime/export drift\n#   ★ comparing metrics catches NEITHER: AUC was 0.7823 both ways\n\n# THE PRODUCTION VERSION\n#   log a sample of (raw input, features, prediction) from serving, replay\n#   through the training pipeline, and assert agreement. Run it continuously.\n#   ★ this is the only check that survives a refactor of either side\n\n# THE STRUCTURAL FIX, in order of strength\n#   1 ONE implementation, called by both paths (a shared library)\n#   2 features computed once and READ by both (a feature store)\n#   3 preprocessing pushed INSIDE the exported graph, so it cannot diverge\n#   4 two implementations plus the assertion above (weakest, most common)",
          "caption": "Option four is where most systems are, which is why the assertion matters: the divergence is a matter of time rather than a possibility."
        },
        {
          "h": "The serving decisions that are not about the model",
          "paras": [
            "Batching, concurrency and rollout dominate the operational behaviour, and none of them is a modelling choice."
          ],
          "code": "# DYNAMIC BATCHING   accumulate requests for a few ms, run one batch\n#   trades latency for throughput; the wait must fit the p99 budget\n#   ★ only pays when traffic is dense enough to fill a batch quickly -\n#     at 69,000 QPS a batch fills in under a millisecond; at 100 QPS\n#     you are adding latency for nothing\n\n# CONCURRENCY        one model instance per worker vs a shared instance\n#   GPU models are usually one instance, request-queued; CPU models fork\n\n# ROLLOUT            canary a small share, compare on live traffic, then\n#   ramp. ★ compare PREDICTIONS between old and new on the SAME requests\n#   (shadow traffic), not just aggregate metrics - a metric can match\n#   while individual decisions differ, which is this lesson's whole point\n\n# FALLBACK           what happens when the model times out or errors?\n#   serve a cached score, a simpler model, or a default - and DECIDE this\n#   rather than discovering it, because the default is a 500 to the user",
          "caption": "Shadow traffic comparing predictions rather than metrics is the rollout version of the parity assertion, and it catches the same class of failure."
        }
      ],
      "useCases": [
        "Any online model behind an API, where the request path is a second implementation of everything the training pipeline did.",
        "Internal demos and stakeholder review, where a Gradio interface turns a model into something people can interrogate and produces better feedback than a metric table.",
        "Shadow deployment, where a new model scores live traffic without serving it, which is the cheapest way to compare predictions rather than metrics.",
        "Cost and latency work, where measuring the request decomposition first usually shows the model is a minority of the budget."
      ],
      "pitfalls": [
        "Validating with a metric comparison. A refitted scaler left AUC identical at 0.7823 both ways while 0.69% of decisions flipped - ranking metrics are blind to monotone input transforms.",
        "Load-testing at large batch. The same bug was 0.69% at batch 8,000 and 4.34% at batch 8, so it passes staging and breaks on real traffic that arrives in ones and twos.",
        "Computing any statistic on the request batch. Normalization, imputation defaults and encodings must be loaded from the training artifact, never recomputed at serving time.",
        "Treating preprocessing as code rather than as a versioned artifact. Two implementations drift, and the divergence is a matter of time rather than a possibility.",
        "Optimizing model inference first. It is usually a minority of the request - measure network, feature fetch, preprocessing, model, postprocessing and serialization before choosing.",
        "Adding dynamic batching at low traffic. It only pays when a batch fills quickly; at low QPS it is added latency for no throughput gain.",
        "Comparing only aggregate metrics during a canary. Metrics can match while individual decisions differ, which is exactly the failure this lesson is about - compare predictions on the same requests."
      ],
      "connections": [
        {
          "ref": "mlops/torchscript-onnx",
          "text": "The other half of the same seam - runtime drift at the boundary, where this lesson covers preprocessing drift before the boundary."
        },
        {
          "ref": "mlops/monitoring",
          "text": "Where the production version of the parity check lives, replaying logged serving traffic through the training pipeline continuously."
        },
        {
          "ref": "interview-capstone/system-design-framework",
          "text": "The latency budget arithmetic and the funnel it forces, which decides what can be in the request path at all."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why a probability shift matters even when the ranking is preserved: a cost threshold consumes the probability, and skew moves it."
        },
        {
          "ref": "mlops/cicd",
          "text": "Where the parity assertion is enforced, and the canary and rollback machinery that bounds the damage when it is violated anyway."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is train/serve skew?",
          "a": "The training pipeline and the serving path each compute features correctly and slightly differently. The difference flows into a prediction with nothing raising."
        },
        {
          "q": "★ Why doesn't an offline metric catch it?",
          "a": "A refitted scaler left AUC **identical at 0.7823 both ways** — a monotone input transform preserves the ranking, and most offline metrics are rank-based."
        },
        {
          "q": "What did move?",
          "a": "The probabilities: mean |Δp| = 0.0042 and **0.69% of decisions flipped** at a 0.5 threshold. Probabilities are what a cost threshold consumes."
        },
        {
          "q": "★ Give the batch-size dependence.",
          "a": "Decisions changed: batch 8,000 → 0.69% · 500 → 1.05% · 50 → 3.69% · **8 → 4.34%**. An order of magnitude in batch costs roughly an order of magnitude in error."
        },
        {
          "q": "Why does that make it a production bug?",
          "a": "It's nearly invisible at large batch and severe at small batch — so it passes a LOAD TEST and breaks on real traffic, which arrives in ones and twos."
        },
        {
          "q": "What check would have caught it?",
          "a": "A PREDICTION-level comparison: same raw input through both paths, compared at the model's INPUT TENSOR and at the final prediction. Not a metric comparison."
        },
        {
          "q": "Rank the structural fixes.",
          "a": "(1) ONE implementation called by both paths · (2) features computed once and READ by both (a feature store) · (3) preprocessing pushed INSIDE the exported graph · (4) two implementations plus an assertion — weakest, and most common."
        },
        {
          "q": "Decompose the latency budget.",
          "a": "network + feature fetch + preprocess + model + postprocess + serialize. Model inference is usually a MINORITY — measure each term before optimizing any."
        },
        {
          "q": "p99 with fan-out?",
          "a": "Set by the SLOWEST dependency. A request touching ten shards needs each at roughly p99.9 — the tail-at-scale arithmetic."
        },
        {
          "q": "When does dynamic batching pay?",
          "a": "Only when traffic is dense enough to fill a batch quickly. At 69,000 QPS a batch fills in under a millisecond; at 100 QPS you're adding latency for nothing."
        },
        {
          "q": "★ What should a canary compare?",
          "a": "PREDICTIONS between old and new on the SAME requests (shadow traffic) — not aggregate metrics, which can match while individual decisions differ."
        },
        {
          "q": "What's the fallback when the model errors?",
          "a": "A cached score, a simpler model, or a default — DECIDED in advance. The undecided default is a 500 to the user."
        }
      ],
      "standard": [
        {
          "q": "What is train/serve skew and how do you detect it?",
          "a": "IT IS THE SEAM BETWEEN THE MODEL AND THE REQUEST: the training pipeline computes features one way, the serving path computes them another, both correctly, and the difference becomes a prediction with nothing raising. THE MEASUREMENT I'D GIVE is a single realistic mistake — serving recomputes the scaler on the incoming batch instead of loading the one fitted during training. AUC WAS IDENTICAL TO FOUR DECIMALS, 0.7823 against 0.7823, because rescaling is monotone and preserves the ranking, so every rank-based offline metric is blind to it. What moved was the probabilities: mean absolute change 0.0042, and 0.69% of decisions flipped at a 0.5 threshold — and probabilities are what a cost-based threshold consumes. SO THE DETECTION HAS TO BE AT THE PREDICTION LEVEL, not the metric level: feed the same raw input through both paths and compare at two points, the model's input tensor, which catches preprocessing skew, and the final prediction, which catches runtime drift. THE PRODUCTION VERSION is to log a sample of raw inputs, features and predictions from serving, replay them through the training pipeline, and assert agreement continuously — which is the only check that survives a refactor of either side.",
          "deepDive": {
            "q": "What turns this from a curiosity into an explanation for real incidents?",
            "a": "The batch-size result is what turns this from a curiosity into an explanation for a category of incidents. The same bug produced a 0.69% decision change at a serving batch of 8,000, 1.05% at 500, 3.69% at 50 and 4.34% at 8 — because a statistic computed on the request batch converges to the training statistic as the batch grows. Load tests and staging environments use large batches; real traffic arrives in ones and twos. So the bug is nearly invisible exactly where you test and severe exactly where you deploy, and that is not bad luck, it is a predictable consequence of testing at the wrong batch size. The general lesson is to include batch size 1 in every serving test, because a whole class of defects — batch statistics, padding behaviour, any per-batch normalization — is invisible above it. That is the same discipline as testing n=1 in the coding round, arriving as an infrastructure requirement."
          }
        },
        {
          "q": "How would you prevent skew structurally rather than detecting it?",
          "a": "BY REDUCING THE NUMBER OF IMPLEMENTATIONS, IN FOUR DESCENDING LEVELS OF STRENGTH. STRONGEST: ONE implementation called by both paths — the training job and the serving process import the same library and execute the same code, so divergence is impossible rather than unlikely. That is often achievable and is blocked in practice by language boundaries, since training is Python and serving may not be. SECOND: features computed ONCE and READ by both, which is what a feature store provides — the training set is built by reading the same store the serving path reads, with point-in-time correctness, so there is no second computation to diverge. THIRD: push the preprocessing INSIDE the exported graph, so normalization constants, tokenization and resizing travel with the model and cannot be reimplemented. A model whose graph consumes raw inputs has no preprocessing seam at all. FOURTH AND WEAKEST: two implementations plus a parity assertion, which is where most systems actually are and is why the assertion matters — with two implementations, divergence is a matter of time rather than a possibility. THE PRINCIPLE IS TO COUNT SEAMS: each one is a place where two correct components can disagree silently.",
          "deepDive": {
            "q": "What caveat does the feature-store option need?",
            "a": "The feature store option deserves a caveat because it is often oversold as a skew solution. It removes the computation seam for features it serves, and it introduces a new one — the store's online and offline paths are themselves two systems, and point-in-time correctness in the offline path is a nontrivial guarantee that is frequently approximate. So a feature store moves the seam rather than eliminating it, and the question becomes whether its seam is better managed than yours would be, which for a mature product it usually is. The third option, pushing preprocessing into the graph, is underused and has the strongest guarantee: an artifact that takes raw pixels or raw text and emits a prediction cannot suffer preprocessing skew, because there is no preprocessing outside it. The limits are opset coverage and that some preprocessing genuinely requires external state — a vocabulary, an embedding table, a lookup — which then has to be versioned as data alongside the model. That is still far better than code, because data can be pinned by content hash and code cannot."
          }
        },
        {
          "q": "How do you approach the latency budget for a served model?",
          "a": "MEASURE THE DECOMPOSITION BEFORE OPTIMIZING ANYTHING, because model inference is usually a minority of the request and optimizing it while feature fetch dominates is the most common misallocation in serving work. The terms are network in and out, feature fetch, preprocessing, model, postprocessing and serialization, and I would want a p99 for each rather than a mean, because the budget is a tail budget. THEN THE FAN-OUT ARITHMETIC: if a request touches ten shards or ten dependencies, its p99 is set by the slowest of them, so each dependency needs to be at roughly p99.9 for the request to hit p99 — which is the tail-at-scale result and it is why adding a dependency is more expensive than its mean latency suggests. THE LEVERS, roughly in order of return: caching, which removes the work entirely for repeated requests; reducing the candidate set, since the funnel arithmetic says a cross-encoder scores about 128 items in a 115 ms budget; dynamic batching, which trades latency for throughput and only pays when traffic is dense enough to fill a batch quickly; and only then model-level optimization — quantization, compilation, a smaller model. AND A HARD TIMEOUT WITH A DEFINED FALLBACK, because an unbounded request is a queue that eventually becomes an outage.",
          "deepDive": {
            "q": "What should the fallback actually be?",
            "a": "The fallback decision is worth making explicitly rather than inheriting, because the default is a 500 to the user and that is rarely the right answer. The options are a cached score, which is stale but usually acceptable; a simpler and faster model, which is the cascade pattern and gives graceful degradation; a static default, which is honest and blunt; or failing the request, which is correct only when a wrong answer is worse than no answer — a fraud block, say. Choosing among them is a product decision and it should be recorded, because it will be exercised. The related operational point is that the fallback path must be TESTED, since a fallback that has never run in production is as likely to be broken as any other untested code, and it will be invoked for the first time during an incident. Periodically forcing the fallback in a small traffic share is the cheap insurance, and it is the same argument as exercising a backup restore rather than assuming it works."
          }
        },
        {
          "q": "How would you roll out a new model version?",
          "a": "SHADOW FIRST, THEN CANARY, COMPARING PREDICTIONS RATHER THAN METRICS. SHADOW: run the new model on live traffic without serving its output, and compare its predictions against the incumbent's on the SAME requests. That is the strongest available check and it costs only compute — it catches skew, export drift and behaviour changes that aggregate metrics cannot see, because a metric can match while individual decisions differ, which is this lesson's entire point. CANARY: serve a small share, monitor the guardrails, and ramp. The comparison during a canary should still be prediction-level where possible, plus the business metrics with the reversed burden of proof from the strategy lesson — evidence of no harm rather than absence of evidence of harm. AND A ROLLBACK THAT IS ONE ACTION, tested, with the previous artifact still available; a rollback plan that requires a rebuild is not a rollback plan. I'D ALSO RE-DERIVE EVERYTHING DOWNSTREAM OF THE MODEL as part of the deploy: the calibration temperature, any conformal calibration set, thresholds tuned for the old model, and monitoring baselines are all properties of the model-plus-distribution pair and become silently wrong otherwise.",
          "deepDive": {
            "q": "Which failure here is common and hard to diagnose?",
            "a": "That last item is a genuinely common and hard-to-diagnose failure. A retrained model changes the score distribution, so a threshold tuned to produce 700 alerts a day now produces 2,000 or 200, and nobody changed the threshold — the model's calibration moved underneath it. Similarly a conformal calibration set computed on the previous model is invalid, and monitoring baselines for score distribution will alarm continuously or never. The fix is to make re-derivation a required step in the deployment pipeline rather than a checklist item, so a model cannot ship without its dependent artifacts being recomputed. That is the same insight as versioning the preprocessing with the weights: the deployable unit is larger than the model, and every part of it that was fitted to the previous model is stale. Enumerating those parts once, for a given system, is an hour of work and it prevents an entire category of post-deployment surprises that otherwise present as unexplained metric shifts a week later."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE MODULE'S CENTRAL SEAM AND THE ONE WITH THE MOST INSTRUCTIVE MEASUREMENT. The model is correct. The serving code is correct. They compute features differently, and the difference becomes a decision with nothing raising — no exception, no failed test, no alert. THE CONTRACT IS THAT THE SERVING PATH REPRODUCES THE TRAINING PATH'S FEATURES EXACTLY, and it is violated silently because a slightly different number is not an error condition. WHAT MAKES THIS LESSON'S VERSION SHARP IS THAT THE OBVIOUS CHECK PASSES: AUC was identical to four decimals while 0.69% of decisions flipped, because AUC is rank-based and the skew was monotone. So a team doing everything the standard playbook asks — validate offline, compare metrics, load test — sees nothing. AND THE BATCH-SIZE RESULT explains why it reaches production: 0.69% at batch 8,000 and 4.34% at batch 8, so the defect is smallest where you test and largest where you deploy. THE TRANSFERABLE HABIT is to compare the thing the system consumes, at the level it consumes it, rather than a summary statistic over it.",
          "deepDive": {
            "q": "What is the through-line of the whole curriculum here?",
            "a": "That habit generalizes past serving and is the through-line of the whole curriculum, which is worth noticing at this point. The trustworthy-AI module found aggregate ECE hiding a subgroup, marginal coverage hiding per-class coverage, and a robustness number hiding a threat model. The applications module found aggregate metrics hiding a leak. Here an aggregate AUC hides a decision change. IN EVERY CASE THE SUMMARY STATISTIC WAS TRUE AND THE THING BEING DECIDED WAS ELSEWHERE. The serving version is perhaps the most operationally expensive because it is the closest to the user: the summary is computed in an offline notebook and the decision is made in a request, and the gap between them is where the money is. Comparing at the level of the decision — the prediction, the threshold crossing, the ranked list — rather than at the level of the metric is a small change in what you assert and it closes most of this class."
          }
        },
        {
          "q": "When would you use Gradio rather than a proper API?",
          "a": "FOR THE AUDIENCE THAT CANNOT READ A METRIC TABLE, WHICH IS MOST OF THE PEOPLE WHOSE OPINION DECIDES THE PROJECT. A Gradio or Streamlit interface turns a model into something a domain expert, a product owner or a reviewer can interrogate directly — they type an input, see the output, and immediately find the failure cases that no aggregate would have surfaced. That feedback is qualitatively different from a metric review and it arrives much faster, and in my experience it is the single most efficient way to discover that the model is confidently wrong on a case everyone in the room considers obvious. IT IS ALSO THE RIGHT TOOL FOR ERROR ANALYSIS, since browsing errors interactively is faster than exporting them, and for stakeholder demos where the alternative is a slide. WHAT IT IS NOT is a serving path: no authentication story worth relying on, no autoscaling, no batching, no latency guarantees, and a synchronous execution model that does not survive concurrency. THE FAILURE TO AVOID is a demo becoming production by accident, which happens when it is useful enough that someone points a real workflow at it. Putting it behind an internal-only boundary and stating plainly that it is not a serving path prevents that.",
          "deepDive": {
            "q": "What is the real design point underneath?",
            "a": "There is a real design point underneath which is that the demo interface and the production API should share the same inference code, precisely so the demo exercises the real path rather than a third implementation. If the demo has its own preprocessing, then it is a third place for skew to appear, and worse, the failures stakeholders find in the demo may not exist in production and vice versa — which destroys the value of the exercise. Building the demo as a thin wrapper over the serving client rather than over the model directly is the right structure: it costs nothing extra and it means every demo session is also an integration test of the real path. That is the same seam-counting discipline as the rest of the lesson, applied to a tool that feels informal enough to skip it — which is exactly when these things get skipped."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Train/serve skew",
        "back": "The training pipeline and the serving path each compute features CORRECTLY and slightly differently. The difference becomes a prediction with nothing raising."
      },
      {
        "type": "formula",
        "front": "★ Why an offline metric misses it",
        "back": "A refitted scaler: **AUC 0.7823 both ways**, identical to four decimals — a monotone input transform preserves ranking, and most offline metrics are rank-based. What moved: mean |Δp| 0.0042, **0.69% of decisions flipped**."
      },
      {
        "type": "formula",
        "front": "★ Severity scales inversely with batch size",
        "back": "Decisions changed: 8,000 → 0.69% · 500 → 1.05% · 50 → 3.69% · **8 → 4.34%**. Invisible where you LOAD TEST, severe where you DEPLOY. Always include batch size 1 in serving tests."
      },
      {
        "type": "definition",
        "front": "The check that catches skew",
        "back": "Same RAW input through both paths, compared at (1) the model's INPUT TENSOR — catches preprocessing skew — and (2) the final PREDICTION — catches runtime drift. Metric comparison catches neither."
      },
      {
        "type": "intuition",
        "front": "★ Structural fixes, strongest first",
        "back": "(1) ONE implementation called by both · (2) features computed once and READ by both (feature store) · (3) preprocessing INSIDE the exported graph — no seam at all · (4) two implementations + an assertion (weakest, most common)."
      },
      {
        "type": "pitfall",
        "front": "A feature store moves the seam",
        "back": "It removes the computation seam and introduces its own — online and offline paths are two systems, and point-in-time correctness offline is a nontrivial, often approximate guarantee. Better managed, not eliminated."
      },
      {
        "type": "formula",
        "front": "The latency decomposition",
        "back": "network + feature fetch + preprocess + MODEL + postprocess + serialize. Model inference is usually a MINORITY. Measure each p99 before optimizing any."
      },
      {
        "type": "intuition",
        "front": "Fan-out and the tail",
        "back": "A request touching ten dependencies has p99 set by the SLOWEST — so each needs to be at ~p99.9. Adding a dependency costs far more than its mean latency suggests."
      },
      {
        "type": "intuition",
        "front": "When dynamic batching pays",
        "back": "Only when traffic fills a batch quickly. At 69,000 QPS a batch fills in <1 ms; at 100 QPS you're adding latency for no throughput. It trades latency for throughput — the wait must fit the p99 budget."
      },
      {
        "type": "intuition",
        "front": "★ What a canary should compare",
        "back": "PREDICTIONS between old and new on the SAME requests (shadow traffic). Aggregate metrics can match while individual decisions differ — which is the whole point of this lesson."
      },
      {
        "type": "pitfall",
        "front": "Re-derive everything downstream on deploy",
        "back": "A retrained model shifts the score distribution, so calibration temperature, conformal calibration sets, tuned thresholds and monitoring baselines all go silently stale. A threshold set for 700 alerts/day now gives 2,000, and nobody changed it."
      },
      {
        "type": "intuition",
        "front": "★ The habit that generalizes",
        "back": "Compare THE THING THE SYSTEM CONSUMES, at the level it consumes it — not a summary statistic over it. Aggregate ECE hid a subgroup; marginal coverage hid per-class; here AUC hid a decision change."
      }
    ],
    "refs": [
      {
        "title": "Google, Rules of Machine Learning — Training-Serving Skew",
        "url": "https://developers.google.com/machine-learning/guides/rules-of-ml"
      },
      {
        "title": "Dean & Barroso (2013), The Tail at Scale",
        "url": "https://research.google/pubs/pub40801/"
      },
      {
        "title": "Olston et al. (2017), TensorFlow-Serving: Flexible, High-Performance ML Serving",
        "url": "https://arxiv.org/abs/1712.06139"
      },
      {
        "title": "Crankshaw et al. (2017), Clipper: A Low-Latency Online Prediction Serving System",
        "url": "https://www.usenix.org/conference/nsdi17/technical-sessions/presentation/crankshaw"
      },
      {
        "title": "FastAPI Documentation, Concurrency and async/await",
        "url": "https://fastapi.tiangolo.com/async/"
      }
    ],
    "demos": [
      "autoscaling",
      "batching",
      "model-cascade",
      "canary-rollout"
    ]
  },
  "docker": {
    "level": "core",
    "body": {
      "intuition": [
        "A container is the seam between ONE ENVIRONMENT AND ANOTHER, and its job is to make that seam explicit rather than implicit. Without it the environment is whatever happened to be installed on the machine, which is a dependency you cannot version, cannot inspect and cannot reproduce - the missing fourth coordinate from the tracking lesson.",
        "The failure this prevents is 'it works on my machine', and the failure it does NOT prevent is the one that catches ML teams: an unpinned dependency inside the image. A Dockerfile that installs a package without an exact version produces a DIFFERENT image every time it is built, so the container is reproducible only in the sense that it reproduces the build instructions - not the environment. Pinning the image tag and floating the packages inside it is the most common version of this.",
        "For ML the additional constraint is that the environment includes the ACCELERATOR STACK - the driver on the host, the CUDA runtime in the image, and the framework build compiled against a specific version of it. Those three have to be compatible, only one of them is in your image, and a mismatch surfaces as a runtime error or, worse, as a silent fallback to CPU that turns a 20 ms inference into 2 seconds."
      ],
      "math": [
        {
          "h": "What a container does and does not isolate",
          "paras": [
            "The container carries user-space: your code, libraries, and the CUDA runtime. It shares the host kernel and therefore the GPU driver.",
            "That boundary is where ML-specific container problems live, and it is why 'it runs in the container' is not a portability guarantee for GPU workloads."
          ],
          "tex": "\\underbrace{\\text{host kernel} + \\text{GPU driver}}_{\\text{SHARED, not in the image}} \\;\\big|\\; \\underbrace{\\text{CUDA runtime} + \\text{framework} + \\text{your code}}_{\\text{in the image}}",
          "texNote": "So a container that works on one host can fail on another with a different driver, and the compatibility constraint is driver >= runtime. Pinning the image does not pin the driver, which is the one part of the stack you do not control."
        },
        {
          "h": "Reproducible means the same bytes, not the same instructions",
          "paras": [
            "A build is reproducible when rebuilding produces an identical image. Instructions that resolve to 'latest' at build time break that, and they are the default in most package managers.",
            "The failure is silent: the build succeeds, and the image differs."
          ],
          "tex": "\\texttt{pip install torch} \\;\\to\\; \\text{whatever is current} \\qquad\\text{vs}\\qquad \\texttt{pip install torch==2.7.1} + \\text{a lockfile with hashes}",
          "texNote": "The base image tag has the same problem: a mutable tag can be repointed, so the same Dockerfile builds a different image next month. Pinning by DIGEST rather than by tag is what makes the base immutable."
        },
        {
          "h": "Layer caching is why build order matters",
          "paras": [
            "Each instruction is a cached layer, and changing one invalidates every layer after it. Ordering from least to most frequently changed is the difference between a ten-second and a ten-minute iteration."
          ],
          "tex": "\\text{base} \\to \\text{system deps} \\to \\text{python deps} \\to \\text{model artifact} \\to \\text{application code}",
          "texNote": "Copying the whole source tree before installing dependencies is the classic mistake: every code change reinstalls every package. Copy the lockfile, install, then copy the code."
        }
      ],
      "code": [
        {
          "h": "The Dockerfile decisions that matter",
          "paras": [
            "Five of them, and the first two are what make the image reproducible at all."
          ],
          "code": "# 1 ★ PIN THE BASE BY DIGEST, not by tag\n#     FROM python:3.11-slim@sha256:...   <- immutable\n#     a mutable tag can be repointed, so the same Dockerfile builds a\n#     different image next month and nothing tells you\n\n# 2 ★ PIN EVERY DEPENDENCY with a lockfile including hashes\n#     an unpinned install makes the build instructions reproducible and\n#     the ENVIRONMENT not, which is the opposite of the point\n\n# 3 LAYER ORDER: least- to most-frequently-changed\n#     base -> system deps -> lockfile + install -> model -> app code\n#     copying the source before installing means every code change\n#     reinstalls every package\n\n# 4 MULTI-STAGE BUILD: compile in a builder, copy artifacts to a slim\n#     runtime. ML images are large; the build toolchain is most of it.\n\n# 5 NON-ROOT USER, no secrets in layers (they persist even if deleted\n#     in a later instruction), and a HEALTHCHECK that exercises the MODEL\n#     rather than just the HTTP port\n\n# ★ Item 5's last clause matters: a liveness probe that hits /health tells\n#   you the process is up. A probe that runs one inference tells you the\n#   model loaded, which is the failure that actually happens.",
          "caption": "A health check that does not touch the model will happily report healthy while every request returns a 500 from a failed model load."
        },
        {
          "h": "The GPU stack, and the failure that is not an error",
          "paras": [
            "Three components must agree and only one is inside your image."
          ],
          "code": "# THE THREE LAYERS\n#   HOST     NVIDIA driver          - NOT in the image, you may not control it\n#   IMAGE    CUDA runtime + cuDNN   - in the image\n#   IMAGE    framework build        - compiled against a specific CUDA\n#   constraint: driver version >= CUDA runtime version\n\n# ★ THE SILENT FAILURE\n#   a mismatch, a missing --gpus flag, or a container without the runtime\n#   often does NOT error - the framework falls back to CPU. Inference goes\n#   from ~20 ms to ~2 s and everything still returns correct answers.\n#   -> ASSERT the device at startup and FAIL if it is not what you expect:\n#        assert torch.cuda.is_available(), 'GPU not visible'\n#      one line, and it converts a 100x slowdown into a crash loop you\n#      notice in minutes rather than a latency regression you argue about\n\n# AND SIZE\n#   a CUDA-enabled framework image is several GB. Multi-stage builds, slim\n#   runtime bases and CPU-only variants for CPU services are the levers,\n#   and image size is a COLD-START cost under autoscaling.",
          "caption": "The CPU fallback is the module's theme in one behaviour: correct answers, wrong system, nothing raised."
        }
      ],
      "useCases": [
        "Any deployment where the serving environment must match the environment a model was validated in, which is every deployment that matters.",
        "Reproducing a training run months later, where the container is the fourth coordinate the tracking lesson said was usually missing.",
        "Local development that matches production, which removes an entire class of 'works locally' investigations.",
        "Batch and scheduled jobs, where the container is the unit the orchestrator schedules and the environment is otherwise whatever the worker node has."
      ],
      "pitfalls": [
        "Pinning the base image by tag rather than by digest. A mutable tag can be repointed, so the identical Dockerfile builds a different image later and nothing reports it.",
        "Installing dependencies without a lockfile. The build instructions are then reproducible and the environment is not, which is the opposite of the point of containerizing.",
        "Copying the source tree before installing dependencies. Every code change invalidates the dependency layer, turning a ten-second rebuild into a ten-minute one.",
        "Assuming the container isolates the GPU driver. The driver is on the host and shared, so a container that works on one node can fail on another, and driver must be at least the CUDA runtime version.",
        "Not asserting the device at startup. A missing GPU usually falls back to CPU silently - correct answers, 100x slower - and one assert turns it into an immediate crash.",
        "Health checks that only probe the HTTP port. They report healthy while every request fails on a model that did not load; the check should run one inference.",
        "Putting secrets in a layer. Layers are immutable and a secret deleted in a later instruction is still present in the earlier one, recoverable from the image."
      ],
      "connections": [
        {
          "ref": "mlops/mlflow",
          "text": "The environment coordinate this makes explicit - the fourth of the four things a reproducible run needs pinned."
        },
        {
          "ref": "mlops/model-serving",
          "text": "What runs inside the container, and why the health check should exercise the model rather than the process."
        },
        {
          "ref": "mlops/cicd",
          "text": "Where the image is built, scanned and promoted, and why an immutable digest is what makes a promotion meaningful."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Why the framework build is compiled against a specific accelerator stack, and what a precision or kernel mismatch does to numerics."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The startup assertions and health checks that turn a silent environment failure into an alert."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a container isolate, and what does it not?",
          "a": "It carries USER-SPACE — code, libraries, CUDA runtime. It SHARES the host kernel and therefore the GPU DRIVER. The driver is not in your image."
        },
        {
          "q": "What's the GPU compatibility constraint?",
          "a": "Host driver version ≥ CUDA runtime version in the image. Pinning the image does not pin the driver, which is the part you may not control."
        },
        {
          "q": "★ What happens on a GPU mismatch?",
          "a": "Usually NOT an error — the framework falls back to CPU. Inference goes from ~20 ms to ~2 s and every answer is still correct. The module's theme in one behaviour."
        },
        {
          "q": "The one-line fix?",
          "a": "`assert torch.cuda.is_available()` at startup. Converts a 100× latency regression you argue about into a crash loop you notice in minutes."
        },
        {
          "q": "★ Tag or digest for the base image?",
          "a": "DIGEST. A mutable tag can be repointed, so the identical Dockerfile builds a different image next month and nothing reports it."
        },
        {
          "q": "Why is an unpinned `pip install` a problem?",
          "a": "It makes the build INSTRUCTIONS reproducible and the ENVIRONMENT not — the opposite of the point. Use a lockfile with hashes."
        },
        {
          "q": "Give the layer ordering rule.",
          "a": "Least- to most-frequently-changed: base → system deps → lockfile + install → model artifact → app code."
        },
        {
          "q": "What breaks if you get it wrong?",
          "a": "Copying the source before installing means every code change invalidates the dependency layer — a ten-second rebuild becomes ten minutes."
        },
        {
          "q": "What should a health check do?",
          "a": "Run ONE INFERENCE, not just probe the HTTP port. A port probe reports healthy while every request 500s on a model that failed to load."
        },
        {
          "q": "Why multi-stage builds?",
          "a": "Compile in a builder, copy artifacts into a slim runtime. The build toolchain is most of an ML image's size, and size is a COLD-START cost under autoscaling."
        },
        {
          "q": "Why are secrets in layers dangerous?",
          "a": "Layers are immutable. A secret deleted in a later instruction is still present in the earlier one and recoverable from the image."
        },
        {
          "q": "Which coordinate does a container pin?",
          "a": "The ENVIRONMENT — the fourth of the four a reproducible run needs (code, data, params, environment), and one of the two usually treated as implicit."
        }
      ],
      "standard": [
        {
          "q": "What does containerization buy an ML system, and what does it not?",
          "a": "IT MAKES THE ENVIRONMENT EXPLICIT, which is the fourth coordinate the tracking lesson identified as usually missing. Without a container, the environment is whatever happened to be installed on the machine — a dependency you cannot version, inspect or reproduce — and 'it worked last month' becomes unanswerable. With one, the environment is an artifact with an identity. WHAT IT DOES NOT BUY IS REPRODUCIBILITY BY ITSELF, and this is the part ML teams get wrong. A Dockerfile that installs packages without exact versions produces a different image every build, so what is reproducible is the INSTRUCTIONS rather than the environment — which is precisely backwards. The same applies to the base image: a mutable tag can be repointed upstream, so the identical Dockerfile builds a different image later and nothing reports it. Pinning by digest and using a lockfile with hashes is what closes that. AND IT DOES NOT ISOLATE THE ACCELERATOR STACK: the container carries the CUDA runtime and the framework build, and the GPU DRIVER lives on the host and is shared, with the constraint that driver version must be at least the runtime version. So a container that works on one node can fail on another, and the one component you cannot pin is the one you do not control.",
          "deepDive": {
            "q": "Which failure mode is the module's theme in a single behaviour?",
            "a": "The GPU failure mode deserves emphasis because it is the module's theme in a single behaviour. A driver mismatch, a missing GPU flag, or a container launched without the accelerator runtime frequently does NOT raise — the framework detects no device and falls back to CPU. Every answer is still correct; inference goes from around twenty milliseconds to around two seconds; and what you observe is a latency regression that gets attributed to load, to the network, or to a noisy neighbour, and argued about for a week. One assertion at startup that the expected device is visible converts that into an immediate crash loop, which is a much better failure: loud, immediate, and unambiguous. That is the general pattern worth extracting for infrastructure work — prefer a startup assertion over a runtime degradation, because a service that refuses to start is diagnosed in minutes and a service that is quietly slow is diagnosed in days. The same reasoning applies to asserting the model version, the artifact hash and the feature schema at startup: each is one line and each converts a silent wrong-configuration into a loud one."
          }
        },
        {
          "q": "How would you structure a Dockerfile for an ML service?",
          "a": "FIVE DECISIONS, AND THE FIRST TWO DETERMINE WHETHER IT IS REPRODUCIBLE AT ALL. PIN THE BASE BY DIGEST rather than by tag, so the foundation is immutable. PIN EVERY DEPENDENCY with a lockfile including hashes, so the environment rather than the instructions is what reproduces. ORDER THE LAYERS from least- to most-frequently-changed — base, system dependencies, lockfile and install, model artifact, application code — because each instruction is a cached layer and changing one invalidates everything after it; copying the source tree before installing dependencies is the classic mistake and turns a ten-second rebuild into a ten-minute one. USE A MULTI-STAGE BUILD, compiling in a builder image and copying only the artifacts into a slim runtime, because ML images are large and the build toolchain is most of that size — and image size is a cold-start cost under autoscaling, so it is a latency concern rather than a tidiness one. AND THE OPERATIONAL DETAILS: a non-root user, no secrets in any layer since layers are immutable and a deleted secret remains recoverable from the earlier one, and a HEALTH CHECK THAT RUNS ONE INFERENCE rather than probing the port.",
          "deepDive": {
            "q": "Why argue for that last item specifically?",
            "a": "That last item is worth arguing for specifically because the default is wrong in a way that matters. A liveness probe hitting an HTTP endpoint tells you the process is running; it tells you nothing about whether the model loaded, whether the weights file was present, or whether the artifact matches what the service expects. A container that starts, fails to load its model, and serves 500s will pass a port-based probe indefinitely and will be kept in the load balancer's rotation. A probe that runs a single inference on a fixed input catches all of that, and if you compare the output against a stored expected value it also catches a wrong model version or a corrupted artifact — which turns the health check into a continuous parity assertion. It costs one small forward pass per probe interval, which is negligible, and it is the difference between an outage that pages immediately and one that manifests as a slowly rising error rate. The model artifact question — where it lives — is the related decision: baking it into the image makes the deployable unit fully immutable and the image large, while mounting it at runtime keeps images small and reintroduces a seam. Baking is usually right for a service, mounting for a platform serving many models."
          }
        },
        {
          "q": "A container works locally and fails in production. How do you diagnose it?",
          "a": "BY ASKING WHAT IS OUTSIDE THE IMAGE, because that is the only thing that can differ if the image is genuinely pinned. THE FIRST CANDIDATE IS THE GPU DRIVER, since it lives on the host and is shared: check the driver version against the CUDA runtime in the image, with the constraint that driver must be at least runtime, and check whether the container was launched with accelerator access at all. If neither, the framework has fallen back to CPU and you are looking at a latency problem rather than a correctness one. THE SECOND IS THE IMAGE ITSELF NOT BEING PINNED — if the base was a mutable tag or the dependencies unpinned, then 'the same image' is not the same image, and the local and production builds happened at different times. Comparing digests settles it in seconds. THE THIRD IS EVERYTHING ELSE OUTSIDE: environment variables, mounted volumes, network policy, secrets, resource limits — a memory limit that triggers an OOM kill under production batch sizes but not under local ones is common, and it presents as a restart loop rather than an error message. THE FOURTH IS ARCHITECTURE, since an image built on one CPU architecture and run on another either fails loudly or runs under emulation, which is slow enough to look like a different problem.",
          "deepDive": {
            "q": "Why does the resource-limit case deserve expanding?",
            "a": "The resource-limit case is worth expanding because it interacts with the serving lesson's batch-size finding. Local testing runs at small batch and low concurrency, production runs at whatever the traffic dictates, and memory scales with both — so a limit that is generous locally is exceeded in production and the container is killed. The symptom is a restart loop with no application error, because the process was terminated by the kernel rather than failing, and logs frequently show nothing useful. Setting limits from a measured production-shaped load test, and logging peak memory, is the preventative. The general point for this lesson is that a container makes the environment explicit and does not make it identical: the image is a variable you now control, and the host, the orchestrator's configuration and the traffic remain variables you did not. Enumerating what is still outside the image — driver, limits, environment, mounts, architecture, network — is a five-minute exercise per service and it is exactly the list you will work through during an incident anyway."
          }
        },
        {
          "q": "How do you handle the model artifact - in the image or mounted?",
          "a": "IT IS A TRADE BETWEEN IMMUTABILITY AND IMAGE SIZE, AND THE RIGHT ANSWER DEPENDS ON WHETHER THE SERVICE SERVES ONE MODEL OR MANY. BAKING THE MODEL INTO THE IMAGE makes the deployable unit fully immutable: one artifact, one digest, one thing to promote and roll back, and no possibility of the code and the weights being mismatched at runtime. That is a strong property and it is what I would default to for a service dedicated to one model. The costs are image size — which is a cold-start cost under autoscaling, so it becomes a latency concern — and that every model update requires a rebuild and redeploy. MOUNTING THE MODEL at runtime, from object storage or a volume, keeps images small and lets you update the model without rebuilding, which is necessary for a platform serving many models or updating frequently. IT REINTRODUCES A SEAM: the code and the weights are now two independently-versioned things, and the service must ASSERT at startup that it loaded the expected artifact — a hash check against a version it was told to expect — or you have exactly the mismatch the registry lesson warned about. Either way, the model version belongs in the health check and in every prediction log.",
          "deepDive": {
            "q": "What makes the mounted option safe?",
            "a": "The assertion is what makes the mounted option safe and it is usually omitted, which is how a service ends up quietly serving last month's weights after a deployment that failed to copy the new ones. Comparing an artifact hash against an expected value at startup costs a few milliseconds and turns that into a refusal to start. Logging the model version with every prediction is the complementary practice: it makes the question 'which model produced this output' answerable from the logs, which is what you need during an incident and what is impossible to reconstruct afterwards. There is also a middle design worth knowing for platforms — bake a default model into the image so the service can always start and serve something, and mount overrides — which gives a working fallback when artifact storage is unavailable, and that failure does occur. The general principle across all three options is the one this module keeps returning to: make the deployable unit explicit, assert its identity at the boundary, and log it, because the alternative is discovering during an outage that nobody knows what is running."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE SEAM IS BETWEEN ENVIRONMENTS, AND CONTAINERIZATION IS THE RARE CASE WHERE THE FIX IS TO MAKE A SEAM EXPLICIT RATHER THAN TO REMOVE IT. Before a container, the environment is an implicit dependency of every result — invisible, unversioned, and only discovered when a machine changes. A container turns it into an artifact with an identity, which is the same move as versioning the preprocessing object or pinning the data: convert an unrecorded variable into a recorded one. WHAT MAKES THE LESSON BELONG HERE is that containerization is routinely believed to have SOLVED reproducibility when it has only relocated it. An unpinned dependency inside the image, or a mutable base tag, means the image is different on each build and nothing says so — a silent failure at the seam you thought you had closed. AND THE GPU FALLBACK IS THE MODULE'S SIGNATURE IN ONE BEHAVIOUR: a driver mismatch produces correct answers, a hundred times slower, with no error. THE CONTRACT is that the runtime environment matches the validated one; the violation is silent because a missing device is a fallback rather than a fault; and the fix is a one-line startup assertion that converts it into a crash.",
          "deepDive": {
            "q": "What principle does that fix generalize into?",
            "a": "That fix generalizes into a principle worth carrying beyond containers: at every boundary, assert the thing you are assuming, at startup, and fail loudly. The model version matches what was promoted. The GPU is visible. The feature schema matches what the model expects. The artifact hash matches the registry. Each is one line, each runs once per process rather than per request, and each converts a silent misconfiguration into an immediate, unambiguous failure. That is cheap in a way that monitoring is not — monitoring detects a problem after it has affected traffic, and a startup assertion prevents the process from ever serving. Given that this module's recurring problem is silence, startup assertions are the highest-leverage practice in it, and they are systematically under-used because they feel defensive rather than productive. The counter-argument is the incident you did not have."
          }
        },
        {
          "q": "What is the honest cost of containerizing an ML workflow?",
          "a": "REAL, AND WORTH STATING SO THE PRACTICE IS ADOPTED RATHER THAN RESENTED. IMAGE SIZE: a CUDA-enabled framework image runs to several gigabytes, which slows builds, consumes registry storage and — importantly — becomes a COLD-START latency cost under autoscaling, so an image nobody optimized directly worsens tail latency during a traffic spike. Multi-stage builds and CPU-only variants for CPU services are the levers. BUILD TIME AND ITERATION FRICTION: a badly-ordered Dockerfile turns every code change into a full dependency reinstall, which is the difference between iterating and not; correct layer ordering fixes most of it, and a local development mount for code is the usual accommodation. GPU COMPLEXITY: the driver-runtime-framework compatibility matrix is a genuine source of difficulty and it is not the container's fault so much as it is exposed by containerizing. AND A REAL ORGANIZATIONAL COST — it moves environment problems from the individual to the platform, which is a net win and does mean someone owns it. WHAT I WOULD NOT CONCEDE is that it is optional for anything that reaches production, because the alternative is an unversioned dependency in every result.",
          "deepDive": {
            "q": "Is there a middle ground during exploration?",
            "a": "There is a pragmatic middle ground for the research phase that is worth naming, since insisting on full containerization during exploration slows people down for benefits they do not yet need. A lockfile plus a documented environment gets most of the reproducibility value at a fraction of the friction, and containerization becomes required at the point where a result is going to be depended on — a published number, a model heading to review, anything that will be reproduced. Making that boundary explicit in a team's conventions avoids both failure modes: exploratory work grinding to a halt under process, and production work resting on somebody's laptop. It is the same graduated standard that applies to testing and to tracking, and the useful framing is that the ceremony should scale with how much the result will be relied on. That framing also makes the conversation about a specific artifact rather than about discipline in general, which is the version people actually act on."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "What a container isolates",
        "back": "USER-SPACE: code, libraries, CUDA runtime. It SHARES the host kernel and therefore the **GPU driver** — which is not in your image and may not be under your control. Constraint: driver ≥ CUDA runtime."
      },
      {
        "type": "pitfall",
        "front": "★ The GPU mismatch is not an error",
        "back": "A driver mismatch or a missing accelerator flag usually falls back to **CPU**: ~20 ms → ~2 s, every answer still correct. The module's theme in one behaviour. Fix: `assert torch.cuda.is_available()` at startup."
      },
      {
        "type": "pitfall",
        "front": "★ Tag vs digest",
        "back": "Pin the base by DIGEST. A mutable tag can be repointed upstream, so the identical Dockerfile builds a different image next month and nothing reports it."
      },
      {
        "type": "intuition",
        "front": "Reproducible = same BYTES, not same instructions",
        "back": "`pip install torch` makes the INSTRUCTIONS reproducible and the ENVIRONMENT not — exactly backwards. Use a lockfile with hashes."
      },
      {
        "type": "definition",
        "front": "Layer ordering",
        "back": "Least- to most-frequently-changed: base → system deps → **lockfile + install** → model artifact → app code. Copying source before installing turns a 10-second rebuild into 10 minutes."
      },
      {
        "type": "intuition",
        "front": "★ The health check should run an inference",
        "back": "A port probe reports healthy while every request 500s on a model that failed to load — and the container stays in rotation. One inference against a stored expected output also catches a wrong model version."
      },
      {
        "type": "pitfall",
        "front": "Secrets in layers",
        "back": "Layers are IMMUTABLE. A secret deleted in a later instruction is still present in the earlier one and recoverable from the image."
      },
      {
        "type": "intuition",
        "front": "Why multi-stage builds",
        "back": "Compile in a builder, copy artifacts to a slim runtime. The build toolchain is most of an ML image's several GB — and image size is a **COLD-START latency cost** under autoscaling, not a tidiness concern."
      },
      {
        "type": "intuition",
        "front": "Works locally, fails in production — what to check",
        "back": "What's OUTSIDE the image: GPU driver · whether the image was actually pinned (compare digests) · env vars, mounts, network, **resource limits** (an OOM kill is a restart loop with no application error) · CPU architecture."
      },
      {
        "type": "intuition",
        "front": "Model in the image or mounted?",
        "back": "BAKED = fully immutable unit, one digest to promote and roll back; costs size and a rebuild per model update. MOUNTED = small images, independent updates, and it REINTRODUCES a seam — so assert the artifact hash at startup."
      },
      {
        "type": "intuition",
        "front": "★ Assert at the boundary, at startup",
        "back": "GPU visible · model version matches what was promoted · artifact hash matches the registry · feature schema matches. One line each, once per process. Converts silent misconfiguration into an immediate crash — cheaper than monitoring, which detects after traffic is affected."
      },
      {
        "type": "intuition",
        "front": "The honest cost",
        "back": "Image size (cold starts) · build friction from bad layer ordering · the driver/runtime/framework compatibility matrix. A lockfile plus a documented env is the right level during EXPLORATION; containerize when a result will be depended on."
      }
    ],
    "refs": [
      {
        "title": "Docker Documentation, Best Practices for Writing Dockerfiles",
        "url": "https://docs.docker.com/build/building/best-practices/"
      },
      {
        "title": "NVIDIA, CUDA Compatibility and the Container Toolkit",
        "url": "https://docs.nvidia.com/deploy/cuda-compatibility/"
      },
      {
        "title": "Kubernetes Documentation, Configure Liveness, Readiness and Startup Probes",
        "url": "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
      },
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Reproducible Builds, Definitions and Techniques",
        "url": "https://reproducible-builds.org/docs/definition/"
      }
    ],
    "demos": [
      "autoscaling",
      "canary-rollout",
      "batching",
      "model-cascade"
    ]
  },
  "monitoring": {
    "level": "core",
    "body": {
      "intuition": [
        "Monitoring is the seam between DEPLOYMENT AND REALITY, and it is the one where the industry has built the most machinery around the wrong quantity. A drift detector monitors P(x). Your alert says the model may be degraded. Those are different things, and they come apart in both directions.",
        "Measured on the same model: a covariate shift moving ten of twenty input features by a full standard deviation produced a Bonferroni-corrected p-value that underflowed to zero with ten features flagged - a maximal alarm - while accuracy sat at 0.7446 against a baseline of 0.7506. Then a concept shift that left P(x) EXACTLY unchanged took accuracy to 0.3375, worse than chance, and every detector stayed quiet.",
        "And it is not a tooling gap. On that concept shift the mean confidence was 0.7473 against a control's 0.7466, a KS test on the predicted scores gave p = 0.911, and a domain classifier scored AUC 0.5223. EVERY UNLABELLED SIGNAL WAS BLIND, because the model saw exactly the inputs it was trained on and responded exactly as before. Only the labels moved, so only labels can see it - which makes a labelling budget a monitoring component rather than a nice-to-have."
      ],
      "math": [
        {
          "h": "★ The detector fires when nothing is wrong",
          "paras": [
            "Under pure covariate shift with a well-specified model the optimal predictor is unchanged, so the alarm is correct about P(x) and irrelevant to the decision it triggers."
          ],
          "tex": "\\begin{array}{lrl} \\text{shift} & \\text{accuracy} & \\text{Bonferroni } p\\\\ 0.0 & 0.7437 & 6.5\\times10^{-1}\\ \\text{quiet}\\\\ 0.3 & 0.7429 & 3.2\\times10^{-156}\\ \\textbf{ALARM}\\\\ 1.0 & 0.7446 & 0.0\\ \\textbf{ALARM} \\end{array}",
          "texNote": "Baseline accuracy 0.7506. Ten of twenty features flagged, p-values underflowing, and accuracy varying by less than one point across every row."
        },
        {
          "h": "★ And is silent when everything is",
          "paras": [
            "Concept shift with the input distribution held bit-for-bit identical. The p-value is the same in every row because the inputs are the same in every row."
          ],
          "tex": "\\begin{array}{lrl} \\text{concept flip} & \\text{accuracy} & \\text{Bonferroni } p\\\\ 0.00 & 0.7453 & 3.8\\times10^{-1}\\ \\text{quiet}\\\\ 0.50 & 0.5448 & 3.8\\times10^{-1}\\ \\text{quiet}\\\\ 1.00 & \\mathbf{0.3375} & 3.8\\times10^{-1}\\ \\textbf{quiet} \\end{array}",
          "texNote": "And no other unlabelled monitor sees it either: mean confidence 0.7473 against a control's 0.7466, KS on predicted scores p = 0.911, domain-classifier AUC 0.5223. This is information-theoretic, not a gap in the tooling."
        },
        {
          "h": "Uncorrected per-feature testing is an alarm generator",
          "paras": [
            "At production sample sizes every difference is significant, and a wide feature table multiplies the opportunities."
          ],
          "tex": "\\text{A/A, IDENTICAL distributions, } \\alpha=0.01: \\quad 10 \\to 0,\\quad 200 \\to 1,\\quad 1000 \\to \\mathbf{6}\\ \\text{features flagged}",
          "texNote": "Six true nulls flagged on a thousand features with no shift whatsoever. Teams learn the dashboard is noise, which is the worst outcome because the one alarm that matters is ignored too."
        }
      ],
      "code": [
        {
          "h": "★ What to build, in priority order",
          "paras": [
            "The ordering is close to the reverse of how monitoring stacks are usually assembled."
          ],
          "code": "# 1 A CONTINUOUS RANDOM LABELLED SAMPLE\n#     a few hundred uniformly-sampled production cases labelled per week\n#     bounds accuracy to a couple of points and is the ONLY thing that\n#     detects concept shift. Stratify by the segments decisions partition\n#     on. ★ the sample must be RANDOM - labelling low-confidence cases\n#     gives a biased, pessimistic estimate (and human-reviewed cases are\n#     selection-biased, which is module 23's collider)\n\n# 2 PIPELINE INTEGRITY, written as INVARIANTS not statistical tests\n#     null rates, cardinality, ranges, schema, freshness, row counts\n#     -> these fire on real bugs, have low false-positive rates, and catch\n#        the failures that do the most damage fastest\n\n# 3 OUTPUT AND CONFIDENCE MONITORING, with EFFECT-SIZE thresholds\n#     score distribution, prediction rate, conformal set size\n#     -> a cheap early hint, explicitly NOT a performance metric\n\n# 4 PROXY OUTCOMES - weak labels arriving free and continuously\n#     correction rate, escalation rate, appeal rate, retry, abandonment\n#     -> often the earliest real signal of degradation\n\n# ★ NOT FIRST: a per-feature statistical drift dashboard over a wide table.",
          "caption": "Items two and four are the ones that earn their keep daily; item one is the only one that can see the failure that matters most."
        },
        {
          "h": "Making the alarms mean something",
          "paras": [
            "Four rules that convert a noise generator into a system people act on."
          ],
          "code": "# CORRECT FOR MULTIPLICITY, or monitor one multivariate statistic\n#   1000 features at raw alpha=0.01 flags ~6 on IDENTICAL distributions\n\n# ALERT ON EFFECT SIZE, NOT p-VALUES\n#   at production n everything is significant and almost nothing matters\n\n# PRUNE FEATURES THE MODEL DOES NOT USE\n#   drift in an unused feature is not a finding, and it is roughly half\n#   of most drift dashboards\n\n# TIE EVERY ALERT TO A DECISION before creating it\n#   which model consumes this, what would you do differently, who is paged\n#   -> alerts failing that test become a dashboard nobody is paged for\n\n# ★ AND RE-DERIVE ON EVERY RETRAIN: the calibration temperature, any\n#   conformal calibration set, tuned thresholds and the monitoring\n#   BASELINES themselves are properties of the model-plus-distribution\n#   pair. A threshold set for 700 alerts/day silently becomes 2,000.",
          "caption": "The re-derivation step is a half-day of pipeline work that prevents a category of failure whose symptom appears weeks after its cause."
        }
      ],
      "useCases": [
        "Deciding when to retrain, where the honest trigger is a labelled performance estimate and an input monitor is at best a cheap early hint.",
        "Catching pipeline breaks - a feature silently null, a unit change, an upstream schema migration - which is what input monitoring is genuinely excellent at.",
        "Detecting a provider model update, where a third-party version change is a concept shift with your inputs completely unchanged and every unlabelled monitor green.",
        "Sizing a labelling budget, since a few hundred random production cases a week bounds accuracy better than any unlabelled stack."
      ],
      "pitfalls": [
        "Treating a drift alarm as a performance alarm. A maximal covariate-shift alarm accompanied accuracy of 0.7446 against a 0.7506 baseline - a difference of six tenths of a point.",
        "Treating drift silence as reassurance. Concept shift drove accuracy to 0.3375 with the detector's p-value identical to the no-shift case in every row.",
        "Believing a better unlabelled monitor exists for concept shift. Mean confidence, prediction rate, score distribution and a domain classifier were all at control values while accuracy collapsed.",
        "Running uncorrected per-feature tests on a wide table. Six of a thousand features flagged at alpha 0.01 on identical distributions, which trains everyone to ignore the dashboard.",
        "Alerting on p-values at production sample sizes, where every difference is significant and the question is whether it is large enough to matter.",
        "Labelling the cases the model was least confident about. That gives a biased, pessimistic estimate; a small uniform random sample beats a large convenience sample.",
        "Not re-deriving downstream artifacts after a retrain. Calibration, conformal calibration sets, tuned thresholds and monitoring baselines are all properties of the model-plus-distribution pair and go silently stale."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "The full treatment of the three shifts and the information-theoretic reason no unlabelled statistic detects a concept change."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Where the production parity check lives - replaying logged serving traffic through the training pipeline is a monitoring job."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "Set size as an unlabelled monitoring signal, and the exchangeability assumption that shift invalidates silently."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Why the labelled sample must be random, and the sizing arithmetic that says a few hundred a week is enough."
        },
        {
          "ref": "mlops/cicd",
          "text": "Where the retrain trigger and the re-derivation of downstream artifacts are enforced rather than remembered."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a drift detector monitor?",
          "a": "P(x). Your alert says the model may be degraded. Those are different quantities and they come apart in BOTH directions."
        },
        {
          "q": "★ Give the covariate-shift result.",
          "a": "Ten of twenty features shifted 1σ: Bonferroni p underflowed to **0**, ten features flagged — and accuracy was **0.7446** against a 0.7506 baseline."
        },
        {
          "q": "★ Give the concept-shift result.",
          "a": "P(x) held identical: accuracy 0.7453 → 0.5448 → **0.3375** (below chance), with the detector's p-value **3.8e-01 in every row**."
        },
        {
          "q": "Does any unlabelled monitor see it?",
          "a": "No. Mean confidence 0.7473 (control 0.7466), KS on predicted scores p=0.911, domain-classifier AUC 0.5223 — all at control while accuracy collapsed."
        },
        {
          "q": "Why is that not a tooling gap?",
          "a": "Information-theoretic. The model saw exactly its training inputs and responded exactly as before. Only the labels moved, so only labels can see it."
        },
        {
          "q": "What does that imply for budget?",
          "a": "A labelling budget is a MONITORING COMPONENT, not a nice-to-have. A few hundred random production cases a week bounds accuracy to a couple of points."
        },
        {
          "q": "Why must the labelled sample be random?",
          "a": "Labelling low-confidence cases gives a biased, pessimistic estimate; human-reviewed cases are selection-biased — module 23's collider. A small uniform sample beats a large convenience one."
        },
        {
          "q": "★ What do uncorrected per-feature tests produce?",
          "a": "False alarms: **6 of 1000 features flagged at α=0.01 on IDENTICAL distributions**. Teams learn the dashboard is noise — so the one alarm that matters is ignored too."
        },
        {
          "q": "p-value or effect size?",
          "a": "Effect size. At production n everything is statistically significant and almost nothing is important."
        },
        {
          "q": "What is input monitoring genuinely good for?",
          "a": "PIPELINE BREAKS — a feature silently null, cents→dollars, a schema migration. Write them as INVARIANTS, not statistical tests: low false-positive rate, fastest-damaging failures."
        },
        {
          "q": "Name the free weak labels.",
          "a": "Correction rate, escalation rate, appeal rate, retry, abandonment. High-volume, continuous, and often the earliest real degradation signal."
        },
        {
          "q": "★ What must be re-derived on every retrain?",
          "a": "Calibration temperature, conformal calibration set, tuned thresholds, and the monitoring BASELINES. All are properties of the model-plus-distribution pair. A threshold set for 700 alerts/day silently becomes 2,000."
        }
      ],
      "standard": [
        {
          "q": "What would you actually build for production monitoring?",
          "a": "FOUR LAYERS, IN ROUGHLY THE REVERSE ORDER OF HOW STACKS ARE USUALLY ASSEMBLED. FIRST, A CONTINUOUS RANDOM LABELLED SAMPLE — a few hundred uniformly-sampled production cases labelled per week, stratified by the segments decisions partition on. It bounds accuracy to a couple of points and it is the ONLY thing that detects concept shift. The sample must be random: labelling the model's least-confident cases gives a biased, pessimistic estimate, and labelling whatever a human happened to review is selection-biased, which is the collider problem in a monitoring costume. SECOND, PIPELINE INTEGRITY written as INVARIANTS rather than statistical tests — null rates, cardinality, ranges, schema, freshness, row counts. These fire on real bugs, have low false-positive rates, and catch the failures that do the most damage fastest. THIRD, OUTPUT AND CONFIDENCE MONITORING with effect-size thresholds and multiplicity control, as a cheap early hint that is explicitly not a performance metric. FOURTH, PROXY OUTCOMES — correction rate, escalation, appeals, retries, abandonment — which are weak labels arriving free and continuously and are frequently the earliest real signal. WHAT I WOULD NOT BUILD FIRST is a per-feature statistical drift dashboard over a wide table.",
          "deepDive": {
            "q": "What is the number behind that?",
            "a": "That last point needs the number behind it: on A/A comparisons with identical distributions and no shift whatsoever, a thousand features at a raw alpha of 0.01 flagged six. So an uncorrected per-feature dashboard produces a steady stream of true nulls, and the organizational cost is that people learn the dashboard is noise — which means the one alarm that matters will be ignored along with the rest. If such a dashboard exists it needs multiplicity correction or a single multivariate statistic, effect-size thresholds instead of p-values, restriction to features the model actually uses, and an owner and documented action per alert. That last criterion — tie every alert to a decision before creating it — is the one that prunes most of them: which model consumes this feature, what would you do differently if this fired, and who gets paged. Alerts that fail that test belong on a dashboard nobody is paged for, and demoting them is a strict improvement because it restores the signal value of the ones that remain."
          }
        },
        {
          "q": "Your drift dashboard is red. Walk me through it.",
          "a": "I'D ASK WHAT ACCURACY IS DOING FIRST, BECAUSE THE DASHBOARD CANNOT ANSWER THAT. If a labelled sample exists the investigation ends in minutes; if it does not, that absence is the actual finding and it is what I would fix. THE MEASUREMENT THAT JUSTIFIES THE SKEPTICISM: a covariate shift moving ten of twenty features by a full standard deviation produced a Bonferroni-corrected p-value that underflowed to zero, with ten features flagged — and accuracy was 0.7446 against a baseline of 0.7506. A maximal alarm about a six-tenths-of-a-point change. Under pure covariate shift with a well-specified model the optimal predictor is unchanged, so the alarm is correct about P(x) and irrelevant to the decision it triggered. THEN I'D CHECK WHETHER THE MODEL USES THE DRIFTED FEATURES, since drift in an unused feature is not a finding and is roughly half of most dashboards. THEN WHETHER THIS IS A PIPELINE BREAK rather than a world change — a feature silently null, a unit change from cents to dollars, an upstream schema migration, a new client version writing a different default. That is what input monitoring is genuinely excellent at and it is the most likely useful explanation. AND I'D LOOK AT EFFECT SIZE rather than the p-value, because at production sample sizes everything is significant.",
          "deepDive": {
            "q": "Which conversation is more dangerous than that one?",
            "a": "The mirror-image conversation is the more dangerous one and worth pre-empting: the dashboard is GREEN and someone concludes the model is fine. Measured, a concept shift with P(x) held bit-for-bit identical took accuracy from 0.7453 to 0.3375 — below chance — with the detector's p-value identical to the no-shift control in every row, and with mean confidence at 0.7473 against a control's 0.7466, a KS test on predicted scores at p = 0.911, and a domain classifier at AUC 0.5223. Every unlabelled signal at control while the model was wrong on two-thirds of inputs. So green on an input-monitoring dashboard carries almost no information about performance, and saying that plainly is more useful than any refinement of the dashboard. The one production case where this bites hardest and is most surprising is a third-party model update: your prompts are identical, your traffic is identical, and P(output | input) has moved, so every unlabelled monitor stays green by construction and the first signal is a user complaint."
          }
        },
        {
          "q": "How would you detect that a model has degraded without labels?",
          "a": "YOU LARGELY CANNOT FOR THE CASE THAT MATTERS MOST, AND SAYING SO IS THE HONEST ANSWER. I tested four monitors against a concept shift that took accuracy from 0.7460 to 0.3375: mean confidence came in at 0.7473 against a control's 0.7466, prediction rate 0.5031 against 0.4938, a KS test on the predicted score distribution p = 0.911, and a domain classifier separating training from production inputs at AUC 0.5223. ALL FOUR AT CONTROL VALUES, because the model saw exactly the inputs it was trained on and responded to them exactly as before. Only the labels moved, and that is information-theoretic rather than a gap in the tooling. WHAT PARTIALLY WORKS: confidence and score-distribution monitoring catch some covariate shifts that DO hurt, particularly where the model is pushed into regions it is uncertain about, so they are worth having as an early hint. Conformal set size is a better version of the same signal. And PROXY OUTCOMES are often the earliest real evidence — a user who edits the suggestion, a reviewer who overturns a decision, a retry, an abandonment — because they are weak labels arriving free and in volume. THE ANSWER THAT WORKS IS A LABELLING BUDGET, planned at design time rather than requested after an incident.",
          "deepDive": {
            "q": "Which channel deserves more investment than it gets?",
            "a": "The proxy-outcome channel deserves more investment than it usually gets because it is nearly free and it is genuinely predictive. Most systems have implicit feedback arriving continuously and unlogged: corrections, escalations, complaints, retries, abandonment. None is a clean label and all are high-volume, and their RATE is frequently a sharper degradation signal than any input statistic. The caution is that they have their own confounders — a UI change alters the correction rate with no model change — so each needs its own baseline and its own change-management discipline. On the labelled side, the design detail that matters most is randomness, and the second is stratification: a uniform sample stratified by the segments your decisions partition on lets you catch a subgroup regression that an aggregate hides, which is the failure this curriculum has found in every module. A few hundred labels a week, stratified, is a small ongoing cost and it is the difference between knowing your accuracy and inferring it."
          }
        },
        {
          "q": "When do you retrain?",
          "a": "ON A LABELLED PERFORMANCE ESTIMATE CROSSING A THRESHOLD TIED TO A BUSINESS DECISION — not on a drift signal, because drift and performance move independently in both directions. A drift-triggered retrain fires on harmless covariate shift, which the measurement showed at accuracy 0.7446 against a 0.7506 baseline, and misses concept shift entirely, which took accuracy to 0.3375 with every detector quiet. IF LABELS ARE GENUINELY UNAVAILABLE, a fixed schedule is usually better than a drift trigger: it is predictable, it can be tested, and it does not create a feedback loop where noisy alarms drive model churn. The cadence should come from measured decay — retrain, hold out a time-forward window, and see how fast performance falls — which is a one-time measurement that replaces an argument. AND I'D COUNT THE COSTS THAT GET IGNORED: every retrain invalidates the calibration temperature, any conformal calibration set, thresholds tuned for the old model, and the monitoring baselines themselves, because all of those are properties of the model-plus-distribution pair. A threshold set to produce 700 alerts a day silently becomes 2,000, and nobody changed the threshold. Re-derivation has to be a required pipeline step rather than a checklist item.",
          "deepDive": {
            "q": "Which risk is invisible offline?",
            "a": "The feedback-loop risk is the one that is invisible offline and worth naming. If the model's predictions influence which data you collect — who is shown what, whose application is reviewed, which transactions are approved — then retraining on production logs trains on a distribution the previous model created, and small biases compound across generations. That is a causal problem rather than a drift problem: the logged data is confounded by the policy that generated it, which is exactly the setting the causal module established, and the mitigations are the same — logged propensities and a permanent random holdout. The holdout does double duty here, providing both unbiased training data and an unbiased performance estimate, which makes it easier to justify than either alone. The other guard is to compare a retrained model against the incumbent on a frozen benchmark AND on fresh labelled production data: the first catches regressions and the second catches the case where both models look fine on the old distribution and only one handles the new one."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE SEAM BETWEEN DEPLOYMENT AND REALITY, AND THE ONE WHERE THE STANDARD INSTRUMENT MEASURES THE WRONG SIDE OF IT. A drift detector reports, correctly and honestly, that the input distribution changed. The alert routes to a page saying the model may be degraded. Those are different statements, and the measurements show them coming apart in both directions: a maximal alarm at 0.7446 accuracy against a 0.7506 baseline, and total silence at 0.3375. THE CONTRACT AT THIS SEAM is that the deployed model still performs as validated, and the violation is silent because a model that has become wrong produces outputs in exactly the same format at exactly the same rate. NOTHING ABOUT THE SYSTEM CHANGES OBSERVABLY. WHAT DISTINGUISHES THIS SEAM FROM THE OTHERS IN THE MODULE is that the gap is not closable by engineering: export parity can be asserted, skew can be checked by replay, environment can be pinned — but no unlabelled statistic can detect a concept change, which I verified against four of them. SO THE RESPONSE IS DIFFERENT IN KIND: buy the missing information with a labelling budget, or document that you have accepted the exposure.",
          "deepDive": {
            "q": "How should that distinction drive the budget?",
            "a": "That distinction between closable and unclosable gaps is the most useful thing to carry from this lesson, and it determines where the budget goes. A closable gap is a reporting or engineering failure and the fix is discipline: assert the parity, replay the traffic, pin the digest, compute the per-slice metric. An unclosable gap is an information limit and the fix is acquisition. Confusing them produces a characteristic and expensive error — building ever-more-elaborate unlabelled monitoring in the hope of catching concept shift, which cannot work, while consuming the budget that labels would have used. Sorting a monitoring stack into those two categories is a short exercise and it tends to reallocate money immediately, usually from dashboards toward labelling and toward the per-slice reporting that was three lines away. That reallocation is the single most valuable output of this lesson, and it is unpopular because dashboards are visible and a labelling line item is not."
          }
        },
        {
          "q": "What is the most common monitoring mistake you see?",
          "a": "BUILDING THE PER-FEATURE DRIFT DASHBOARD FIRST AND THE LABELLED SAMPLE NEVER. It is the most visible artifact, it is what the tooling makes easy, and it monitors the quantity least connected to the decision. The consequences compound: it generates false alarms at production sample sizes — six of a thousand features flagged at alpha 0.01 on identical distributions — so people learn to ignore it, which means the rare true alarm is ignored too. Meanwhile the failure that actually costs money is invisible to it by construction. THE SECOND MOST COMMON is not re-deriving downstream artifacts after a retrain, which produces a category of incident whose symptom appears weeks after its cause and looks like drift: a calibration that no longer holds, a threshold producing three times the intended alert volume, a conformal calibration set that is invalid, and monitoring baselines that alarm continuously or never. THE THIRD is monitoring aggregates only, so a subgroup regression is averaged away — the failure this curriculum has found in every single module, arriving here as a dashboard design decision. ALL THREE ARE CHEAP TO FIX and none of them is fixed by better statistics.",
          "deepDive": {
            "q": "What specific engineering recommendation follows?",
            "a": "The re-derivation problem is worth a specific engineering recommendation because it is so tractable: enumerate, once, everything in your system that was fitted to a model or to a distribution — calibration parameters, conformal quantiles, decision thresholds, alerting baselines, and any cached statistics — and make recomputing them a required step in the deployment pipeline that fails the deploy if it cannot run. That enumeration takes an hour for a given system and it prevents an entire class of post-deployment surprises. It also has a diagnostic use: when something behaves oddly a week after a deploy, the list is the first thing to check, and it usually contains the answer. The broader point for this module is that most monitoring value comes from making silent things loud at the moment they happen — a startup assertion, a schema invariant, a re-derivation failure — rather than from statistical inference over production data after the fact. Inference over production data is what you resort to when you did not build the assertion."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "pitfall",
        "front": "★ The detector fires when nothing is wrong",
        "back": "Ten of 20 features shifted 1σ → Bonferroni p underflowed to **0**, ten flagged. Accuracy: **0.7446** vs a 0.7506 baseline. A maximal alarm about six tenths of a point."
      },
      {
        "type": "pitfall",
        "front": "★ …and is silent when everything is",
        "back": "Concept shift, P(x) IDENTICAL: accuracy 0.7453 → 0.5448 → **0.3375** (below chance), detector p-value **3.8e-01 in every row** — the same as the no-shift control."
      },
      {
        "type": "pitfall",
        "front": "No unlabelled monitor sees concept shift",
        "back": "At accuracy 0.3375: mean confidence 0.7473 (control 0.7466) · pred rate 0.5031 · KS on scores p=0.911 · domain-clf AUC 0.5223. **Information-theoretic, not a tooling gap.**"
      },
      {
        "type": "intuition",
        "front": "★ What to build, in priority order",
        "back": "(1) A continuous RANDOM LABELLED SAMPLE — the only thing that sees concept shift. (2) Pipeline integrity as INVARIANTS. (3) Output/confidence with effect-size thresholds. (4) Proxy outcomes. **NOT first: a per-feature drift dashboard.**"
      },
      {
        "type": "pitfall",
        "front": "Why the labelled sample must be RANDOM",
        "back": "Labelling low-confidence cases → biased, pessimistic. Labelling human-reviewed cases → selection bias, module 23's collider. A small uniform stratified sample beats a large convenience sample."
      },
      {
        "type": "formula",
        "front": "Uncorrected per-feature testing",
        "back": "A/A, IDENTICAL distributions, α=0.01: 10 features → 0 flagged · 200 → 1 · **1000 → 6**. Teams learn the dashboard is noise, so the one alarm that matters is ignored too."
      },
      {
        "type": "intuition",
        "front": "Four rules that make alarms mean something",
        "back": "Correct for multiplicity (or one multivariate statistic) · alert on EFFECT SIZE not p-values · prune features the model doesn't use (~half the dashboard) · **tie every alert to a decision, an action and an owner BEFORE creating it**."
      },
      {
        "type": "intuition",
        "front": "What input monitoring IS good for",
        "back": "PIPELINE BREAKS: a feature silently null, cents→dollars, a schema migration, a new client default. Write them as INVARIANTS, not statistical tests — low false-positive rate, fastest-damaging failures."
      },
      {
        "type": "definition",
        "front": "Proxy outcomes — free weak labels",
        "back": "Correction rate, escalation, appeals, retries, abandonment. High-volume, continuous, often the EARLIEST real signal. Caveat: they have their own confounders — a UI change moves the correction rate with no model change."
      },
      {
        "type": "pitfall",
        "front": "★ Re-derive on every retrain",
        "back": "Calibration temperature · conformal calibration set · tuned thresholds · monitoring BASELINES. All are properties of the model-plus-distribution pair. A threshold set for 700 alerts/day silently becomes 2,000, and nobody changed it."
      },
      {
        "type": "intuition",
        "front": "When to retrain",
        "back": "On a LABELLED performance estimate tied to a business decision. If labels are unavailable, a fixed SCHEDULE beats a drift trigger — predictable, testable, and it doesn't let noisy alarms drive model churn."
      },
      {
        "type": "intuition",
        "front": "★ Closable vs unclosable gaps",
        "back": "Export parity, skew, environment: CLOSABLE by engineering — assert, replay, pin. Concept shift: UNCLOSABLE — buy the information (labels) or document the exposure. Confusing them funds dashboards that cannot work."
      }
    ],
    "refs": [
      {
        "title": "Rabanser, Gunnemann & Lipton (2019), Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift",
        "url": "https://arxiv.org/abs/1810.11953"
      },
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      },
      {
        "title": "Lipton, Wang & Smola (2018), Detecting and Correcting for Label Shift with Black Box Predictors",
        "url": "https://arxiv.org/abs/1802.03916"
      },
      {
        "title": "Google SRE Book, Monitoring Distributed Systems",
        "url": "https://sre.google/sre-book/monitoring-distributed-systems/"
      },
      {
        "title": "Garg, Balakrishnan, Lipton, Neyshabur & Sedghi (2022), Leveraging Unlabeled Data to Predict Out-of-Distribution Performance",
        "url": "https://arxiv.org/abs/2201.04234"
      }
    ],
    "demos": [
      "drift-detection",
      "calibration",
      "conformal",
      "classification-metrics"
    ]
  },
  "cicd": {
    "level": "core",
    "body": {
      "intuition": [
        "CI/CD is the seam between A COMMIT AND PRODUCTION, and the ML-specific difficulty is that the thing being promoted is not only code. THREE ARTIFACTS CAN CHANGE INDEPENDENTLY - the code, the data, and the model - and a pipeline that gates only on code changes lets the other two through ungated.",
        "That asymmetry is why 'we have CI' is a weaker statement here than in ordinary software. A retrain triggered by a schedule can ship a new model with no commit, no review and no diff, which means the deployment path with the least oversight is the one that runs most often. The fix is to treat a model version as a release artifact subject to the same gates as a code release, which is a policy decision rather than a tooling one.",
        "And the gate that does the real work is not a test - it is a CANARY comparing PREDICTIONS on the same requests. The serving lesson measured why: a skewed pipeline left AUC identical to four decimals at 0.7823 while 0.69% of decisions flipped, so a metric-based gate passes a change that alters what the system does. Compare the thing the system consumes."
      ],
      "math": [
        {
          "h": "★ Three artifacts, three triggers",
          "paras": [
            "Ordinary CI assumes a commit is the only way production changes. In an ML system there are three, and only one of them has a pull request attached.",
            "A pipeline that gates on code alone has two ungated paths."
          ],
          "tex": "\\text{production} = f(\\underbrace{\\text{code}}_{\\text{PR, review, CI}},\\ \\underbrace{\\text{data}}_{\\text{often ungated}},\\ \\underbrace{\\text{model}}_{\\text{often ungated}})",
          "texNote": "A scheduled retrain changes production with no commit and no reviewer. That path deserves the strictest gate precisely because it has the least human attention, and it usually has the least."
        },
        {
          "h": "The gate ladder, in increasing cost and confidence",
          "paras": [
            "Each level catches a class the previous one cannot, and each costs more wall-clock. The ordering is what keeps the pipeline fast enough to use."
          ],
          "tex": "\\text{lint/unit (s)} \\to \\text{data validation (s)} \\to \\text{parity checks (min)} \\to \\text{eval thresholds (min)} \\to \\text{shadow (hours)} \\to \\text{canary (days)}",
          "texNote": "Put the cheap, high-yield checks first so failures surface in seconds. A pipeline where the first signal arrives in forty minutes is a pipeline people work around, and a bypassed gate is worse than no gate because it creates false confidence."
        },
        {
          "h": "★ Why the metric gate is not enough",
          "paras": [
            "An evaluation threshold compares summary statistics. The serving lesson's skew changed no summary statistic and changed decisions.",
            "The gate has to compare at the level the system consumes."
          ],
          "tex": "\\mathrm{AUC}_{\\text{old}} = 0.7823 = \\mathrm{AUC}_{\\text{new}}, \\qquad \\text{decisions changed} = 0.69\\%",
          "texNote": "So the gate that catches it is a prediction-level comparison on identical inputs - shadow traffic - rather than a metric threshold. Metrics gate quality; prediction diffs gate behaviour, and they are different questions."
        }
      ],
      "code": [
        {
          "h": "The pipeline, and where each gate belongs",
          "paras": [
            "Ordered by cost so that the fast checks fail fast."
          ],
          "code": "# ON EVERY COMMIT (seconds)\n#   lint, type check, unit tests on data transforms and feature code\n#   ★ a test that the SERVING preprocessing matches the TRAINING one\n#     on fixed inputs - the cheapest skew check there is\n\n# ON EVERY DATA REFRESH (seconds)\n#   schema validation, null/range/cardinality invariants, row counts\n#   ★ gate the DATA, not just the code - this is one of the two\n#     ungated paths\n\n# ON EVERY MODEL BUILD (minutes)\n#   train on a small fixed subset, assert it converges (a smoke train)\n#   EXPORT PARITY: numerical drift AND decision agreement AND the\n#     low-margin decile specifically\n#   EVALUATION THRESHOLDS: aggregate AND per-slice, against the incumbent\n#   ★ re-derive calibration, conformal sets, tuned thresholds\n\n# BEFORE PROMOTION (hours to days)\n#   SHADOW: score live traffic, compare PREDICTIONS with the incumbent\n#   CANARY: serve a small share, watch guardrails, ramp\n#   ROLLBACK: one action, tested, previous artifact retained",
          "caption": "The commit-time preprocessing parity test is the highest value-per-second item in the list, because it catches the failure mode that costs the most and runs in milliseconds."
        },
        {
          "h": "What makes a rollback real",
          "paras": [
            "A rollback plan that has never been executed is a hypothesis. Three properties make it a plan."
          ],
          "code": "# 1 ONE ACTION - repoint to the previous immutable artifact.\n#     if it requires a rebuild, it is not a rollback\n# 2 THE PREVIOUS ARTIFACT IS RETAINED, by digest, along with its\n#     calibration, thresholds and monitoring baselines\n#     ★ rolling back weights while leaving the NEW thresholds in place\n#       produces a third configuration that was never tested\n# 3 IT HAS BEEN EXERCISED - a rollback that has never run in production\n#     is as likely to be broken as any untested path, and it will be\n#     invoked for the first time during an incident\n\n# ★ AND STATE THE TRIGGER IN ADVANCE: what number, at what level, for\n#   how long, decided before the deploy. A rollback criterion invented\n#   during an incident is negotiated rather than applied.",
          "caption": "The third-configuration problem is the one people meet in practice: partial rollbacks produce a state that neither the old nor the new evaluation covers."
        }
      ],
      "useCases": [
        "Any model that redeploys more than occasionally, where the retrain path is the one carrying the most risk and the least review.",
        "Enforcing the parity, evaluation and re-derivation steps that are otherwise checklist items people skip under deadline.",
        "Making promotion auditable, so the question 'why did we believe this was safe' has an answer produced at the time rather than reconstructed afterwards.",
        "Bounding blast radius, since canary and rollback are what convert an undetected defect from an outage into a small, reversible degradation."
      ],
      "pitfalls": [
        "Gating only on code. Data and model are two independent paths into production, and a scheduled retrain ships with no commit and no reviewer.",
        "Using an evaluation threshold as the final gate. A skewed pipeline left AUC identical at 0.7823 while 0.69% of decisions flipped, so metrics gate quality and not behaviour.",
        "Putting slow checks first. A pipeline whose first signal arrives in forty minutes gets worked around, and a bypassed gate is worse than no gate because it creates false confidence.",
        "Comparing only aggregate metrics during shadow or canary. Compare predictions on the same requests, which is the only check that sees a behaviour change with unchanged metrics.",
        "Rolling back the model without its thresholds and calibration. That produces a third configuration that neither evaluation covered.",
        "Treating an untested rollback as a plan. It will be executed for the first time during an incident, which is the worst moment to discover it does not work.",
        "Deciding the rollback trigger during the incident. State the number, the level and the duration before deploying, or the criterion gets negotiated rather than applied."
      ],
      "connections": [
        {
          "ref": "mlops/testing",
          "text": "What the fast gates actually run - data validation, invariance tests, and the behavioural checks that unit tests cannot express."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Why a prediction-level comparison is the gate that matters, and the shadow-traffic mechanism that implements it."
        },
        {
          "ref": "mlops/docker",
          "text": "The immutable artifact that makes promotion and rollback meaningful - a digest to repoint at rather than a build to repeat."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The re-derivation step, and why calibration, conformal sets, thresholds and baselines must be recomputed as part of the deploy."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The canary's statistics - guardrails with a reversed burden of proof, and the peeking discipline that makes an early read meaningful."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What's ML-specific about CI/CD?",
          "a": "THREE artifacts can change production independently — code, data, model — and only code has a pull request attached. A pipeline gating on code alone has two ungated paths."
        },
        {
          "q": "Which path has the least oversight?",
          "a": "The scheduled retrain: it ships a new model with no commit, no review and no diff — and it runs most often. It deserves the strictest gate and usually has the weakest."
        },
        {
          "q": "Give the gate ladder.",
          "a": "lint/unit (s) → data validation (s) → parity checks (min) → eval thresholds (min) → shadow (hours) → canary (days). Cheap and high-yield first."
        },
        {
          "q": "Why does ordering matter?",
          "a": "A pipeline whose first signal arrives in forty minutes gets worked around — and a BYPASSED gate is worse than no gate, because it creates false confidence."
        },
        {
          "q": "★ Why isn't a metric threshold enough?",
          "a": "A skewed pipeline left **AUC identical at 0.7823** while **0.69% of decisions flipped**. Metrics gate QUALITY; prediction diffs gate BEHAVIOUR."
        },
        {
          "q": "So what's the gate that catches it?",
          "a": "A prediction-level comparison on identical inputs — shadow traffic — rather than a summary statistic."
        },
        {
          "q": "What's the highest value-per-second check?",
          "a": "A commit-time test that the SERVING preprocessing matches the TRAINING one on fixed inputs. Runs in milliseconds, catches the costliest failure mode."
        },
        {
          "q": "What must a model build gate on?",
          "a": "A smoke train that converges · export parity (drift, decision agreement, AND the low-margin decile) · evaluation thresholds aggregate AND per-slice against the incumbent · re-derivation of downstream artifacts."
        },
        {
          "q": "What makes a rollback real?",
          "a": "ONE action repointing to a retained immutable artifact · the previous artifact kept WITH its calibration and thresholds · and it has actually been EXERCISED."
        },
        {
          "q": "★ What's the third-configuration problem?",
          "a": "Rolling back the weights while leaving the NEW thresholds in place produces a state that neither the old nor the new evaluation covered."
        },
        {
          "q": "When do you decide the rollback trigger?",
          "a": "Before deploying — what number, at what level, for how long. A criterion invented during an incident gets negotiated rather than applied."
        },
        {
          "q": "Why is an untested rollback not a plan?",
          "a": "It's as likely to be broken as any untested path, and it will run for the first time during an incident — the worst moment to find out."
        }
      ],
      "standard": [
        {
          "q": "What makes CI/CD for ML different from ordinary software CI/CD?",
          "a": "THREE ARTIFACTS CAN CHANGE PRODUCTION INDEPENDENTLY, AND ONLY ONE HAS A PULL REQUEST. In ordinary software a commit is the only way production changes, so gating on commits covers everything. In an ML system, production is a function of the code, the DATA and the MODEL — and a scheduled retrain ships a new model with no commit, no diff and no reviewer. THAT MEANS THE DEPLOYMENT PATH WITH THE LEAST OVERSIGHT IS THE ONE THAT RUNS MOST OFTEN, which is exactly backwards, and it is why 'we have CI' is a weaker statement here. The fix is a policy decision rather than a tooling one: treat a model version as a release artifact subject to the same gates as a code release, and gate the data refresh too. THE SECOND DIFFERENCE IS THAT THE FINAL GATE IS NOT A TEST. An evaluation threshold compares summary statistics, and the serving lesson measured a skewed pipeline leaving AUC identical to four decimals at 0.7823 while 0.69% of decisions flipped — so a metric gate passes a change that alters what the system does. The gate that catches it is a prediction-level comparison on identical requests, which means shadow traffic rather than a threshold.",
          "deepDive": {
            "q": "Which check would you put first?",
            "a": "The ordering of gates matters more than in ordinary CI because ML checks span six orders of magnitude in wall-clock: a lint check is milliseconds and a canary is days. Putting the cheap high-yield checks first is what keeps the pipeline usable, and the specific item I would put first is a unit test asserting that the serving preprocessing matches the training preprocessing on a handful of fixed inputs. It runs in milliseconds and it targets the failure mode that costs the most, which makes it the best value-per-second in the whole pipeline. The failure mode to design against is a slow pipeline getting bypassed — an ML pipeline where the first signal arrives forty minutes after push will be worked around, and a bypassed gate is strictly worse than no gate because the organization believes the check ran. That argues for splitting into a fast path that must pass before merge and a slow path that runs before promotion, with the promotion gates enforced by automation so the label on the registry means something rather than asserting something."
          }
        },
        {
          "q": "What would you gate a model promotion on?",
          "a": "FOUR THINGS, IN INCREASING COST. FIRST, A SMOKE TRAIN: train on a small fixed subset and assert it converges, which catches broken data plumbing, a bad learning rate, or a shape error in seconds rather than after a full run. SECOND, EXPORT PARITY — and specifically three numbers, not one: numerical drift, decision agreement, and decision agreement restricted to the LOW-MARGIN population, because the export lesson measured every disagreement concentrated in the lowest-margin decile at 0.0040 with 0.0000 in deciles two through five. An aggregate agreement of 0.9996 is reassuring about the rows that were never at risk. THIRD, EVALUATION THRESHOLDS against the incumbent, aggregate AND per-slice, because an aggregate improvement is compatible with a regression on a subgroup — the failure this curriculum has found in every module. FOURTH, RE-DERIVATION: the calibration temperature, any conformal calibration set, tuned thresholds and the monitoring baselines are all properties of the model-plus-distribution pair, and a deploy that does not recompute them ships a model whose downstream configuration is stale. THEN SHADOW AND CANARY, which are the only gates that see behaviour rather than summary statistics.",
          "deepDive": {
            "q": "Which gate would you insist on automating rather than documenting?",
            "a": "The re-derivation gate is the one I would most insist on automating rather than documenting, because its failure is delayed and confusing. A retrained model shifts the score distribution, so a threshold tuned to produce seven hundred alerts a day now produces two thousand or two hundred, and nobody changed the threshold — the symptom appears as an unexplained volume shift a week later and gets attributed to traffic. Making recomputation a required pipeline step that fails the deploy if it cannot run converts a class of mysterious incidents into a clear build failure. The complementary practice is to store the evaluation artifacts alongside the model in the registry — slice metrics, calibration curve, parity numbers, fairness table — so the deployed artifact carries its own evidence and the question 'why did we believe this was safe' has an answer produced at the time. Reconstructing that after an incident, from notebooks, is exactly the situation the tracking lesson exists to prevent."
          }
        },
        {
          "q": "How would you structure a canary for a model?",
          "a": "SHADOW FIRST, THEN CANARY, AND COMPARE PREDICTIONS AT BOTH STAGES. Shadow means running the new model on live traffic without serving its output, which costs only compute and is the strongest available check: the comparison is against the incumbent on the SAME requests, so it sees behaviour changes that aggregate metrics cannot. That is the lesson from the serving measurement — identical AUC, 0.69% of decisions changed — and it is why a shadow phase catches things a metric gate cannot. THEN CANARY: serve a small share of traffic, watch the guardrails, and ramp. The statistics here are the experimentation module's: guardrails with the burden of proof REVERSED, so you need evidence of no harm and a wide interval is a failure rather than a pass; and a peeking discipline, because watching a canary continuously against a fixed threshold inflates the false-positive rate the same way it does in an A/B test — 5% to 25% over twenty looks. AND THE TRIGGER STATED IN ADVANCE: which number, at what level, sustained for how long, decided before the deploy, because a rollback criterion invented during an incident is negotiated rather than applied.",
          "deepDive": {
            "q": "How does the peeking problem apply to a canary?",
            "a": "The peeking point is worth taking seriously because canaries are watched continuously by construction, so the naive procedure is the worst case for it. The practical accommodations are to define the decision window in advance, to use a sequential boundary rather than a fixed threshold if you want to stop early, and to distinguish clearly between the automatic rollback triggers — which should be blunt, fast and about availability and error rates rather than about subtle metric movements — and the promotion decision, which is a slower, statistical judgement. Conflating them produces either a canary that rolls back on noise or one that never rolls back at all. The other structural point is that a canary measures the new model on a mixture of traffic that the incumbent is also serving, so interference is possible in systems with feedback: in a recommender, the canary's outputs change what users do, which changes the incumbent's inputs. That is the interference problem from the experimentation module, and where it applies, the honest design is a proper holdout rather than a percentage split."
          }
        },
        {
          "q": "What does a real rollback require?",
          "a": "THREE PROPERTIES, AND MOST ROLLBACK PLANS HAVE ONE. ONE ACTION: repoint to the previous immutable artifact by digest. If rolling back requires a rebuild, a retrain, or a sequence of manual steps, it is not a rollback — it is a recovery, and it takes long enough that the incident is decided before it completes. THE PREVIOUS ARTIFACT RETAINED, together with its calibration parameters, thresholds and monitoring baselines, because rolling back the weights while leaving the new thresholds in place produces a THIRD CONFIGURATION that neither the old nor the new evaluation covered — and that is a state you have no evidence about, entered during an incident. AND IT MUST HAVE BEEN EXERCISED. A rollback path that has never run in production is as likely to be broken as any other untested path, and it will be invoked for the first time under pressure. Forcing a rollback periodically, in a low-traffic window, is cheap insurance and it is the same argument as testing a backup restore rather than assuming it works. PLUS THE TRIGGER DECIDED IN ADVANCE — what number, at what level, for how long — because a criterion invented during an incident gets negotiated by whoever has the most at stake.",
          "deepDive": {
            "q": "What does the third-configuration problem generalize to?",
            "a": "The third-configuration problem generalizes past rollback and is worth carrying: any partial revert of a coupled system produces a state nobody tested. It applies to reverting the model but not the feature pipeline, reverting the code but not the config, or reverting one service in a chain. The structural defence is to make the deployable unit contain everything that was validated together — model, preprocessing, thresholds, calibration — so that a revert moves all of it or none. That is the same argument as versioning the preprocessing object with the weights, arriving at the operational layer, and it is why the registry lesson insisted the deployable unit is bigger than the model. Where that coupling is impractical, the minimum is to enumerate the coupled artifacts and make the rollback procedure move them together explicitly, which is a short checklist that someone must own — and, following this module's theme, it should be automation rather than a document, because a document is not executed during an incident."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE SEAM IS BETWEEN A COMMIT AND PRODUCTION, AND THE ML-SPECIFIC FAILURE IS THAT THE SEAM HAS THREE INPUTS WHILE THE MACHINERY WAS BUILT FOR ONE. Code, data and model change independently; ordinary CI gates the first; and the other two reach production ungated — silently, in the module's sense, because a scheduled retrain producing a worse model raises nothing, has no diff, and appears in no review queue. THE CONTRACT is that everything reaching production has passed the gates, and it is violated silently because two of the three paths were never wired to a gate at all. WHAT THIS LESSON ADDS is that even the gate people do build is measuring the wrong thing: an evaluation threshold compares summary statistics, and the serving measurement showed AUC identical to four decimals while 0.69% of decisions changed. SO THE PIPELINE CAN BE GREEN AT EVERY STAGE while shipping a behaviour change — which is the module's signature applied to the machinery that exists to prevent exactly that. THE FIX IS THE MODULE'S: compare the thing the system consumes, at the level it consumes it.",
          "deepDive": {
            "q": "How would you evaluate a proposed MLOps tool?",
            "a": "There is a useful way to evaluate any proposed MLOps tool that falls out of this module and lands most naturally here: does it convert a silent failure into a loud one, and at which seam? Data validation converts a silent schema change into a build failure. A parity check converts silent export drift into a red test. A startup assertion converts a silent CPU fallback into a crash loop. A canary converts a silent behaviour change into a bounded, observed one. A drift dashboard, by contrast, converts a silent input change into a loud alarm about a quantity that may not matter — which is why it ranks low despite being the most visible tool in the category. Applying that criterion to a roadmap tends to reorder it toward cheap assertions and away from dashboards, and it gives a defensible answer to 'why are we building this' that is more specific than best practice. It is also, in this module's terms, the through-line: every practice here exists because ML components fail by disagreeing quietly rather than by erroring."
          }
        },
        {
          "q": "How much CI/CD does a project actually need?",
          "a": "IT SHOULD SCALE WITH HOW MUCH THE OUTPUT IS RELIED ON, AND THE GRADUATION POINTS ARE FAIRLY CLEAR. FOR EXPLORATORY WORK, almost none: a lockfile and version control, because the cost of ceremony exceeds the cost of the mistakes at that stage. ONCE A RESULT WILL BE DEPENDED ON — a number in a document, a model heading to review — add the reproducibility gates: pinned environment, tracked runs, a smoke train. ONCE IT SERVES TRAFFIC, the full ladder becomes justified: data validation, parity checks, per-slice evaluation, re-derivation, shadow, canary and a tested rollback. ONCE IT SERVES TRAFFIC AND RETRAINS AUTOMATICALLY, the retrain path needs the strictest gates of all, because it is the highest-frequency and lowest-oversight path into production. THE FAILURE TO AVOID IN BOTH DIRECTIONS is a team that puts a research notebook behind a six-stage pipeline and stops iterating, and a team that lets an automated retrain deploy to millions of users with no gate because the pipeline was built for code. THE RIGHT QUESTION IS NOT 'DO WE HAVE CI' but 'which of the three artifacts can reach production without passing a gate', and the answer is usually two of them.",
          "deepDive": {
            "q": "What is the most useful audit question for an existing system?",
            "a": "That framing — name the ungated paths — is the most useful audit question for an existing system and it takes ten minutes. Walk the ways production can change: a merged pull request, a scheduled retrain, a data refresh, a config change, a feature-flag flip, a dependency update in a base image, a third-party model version bump. For each, ask what gate it passes. In most systems at least three of those paths are ungated, and the config change and the base-image update are the two people are most surprised by — a config change can alter a threshold, which is a behaviour change with no code and no model change at all. Bringing configuration under the same review and canary discipline as code is unglamorous and closes a genuine hole. It is also the point at which this module's theme becomes an operating principle rather than an observation: enumerate the seams, ask what is asserted at each, and make the unasserted ones loud."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What's ML-specific about CI/CD",
        "back": "THREE artifacts change production independently — code, DATA, MODEL — and only code has a pull request. A pipeline gating on commits has two ungated paths."
      },
      {
        "type": "pitfall",
        "front": "The path with the least oversight",
        "back": "The scheduled RETRAIN: a new model with no commit, no diff, no reviewer — and it runs most often. It deserves the strictest gate and usually has the weakest."
      },
      {
        "type": "definition",
        "front": "The gate ladder",
        "back": "lint/unit (s) → data validation (s) → parity checks (min) → eval thresholds (min) → shadow (hours) → canary (days). Cheap and high-yield first, because a slow pipeline gets BYPASSED — and a bypassed gate is worse than none."
      },
      {
        "type": "formula",
        "front": "★ Why a metric threshold isn't enough",
        "back": "A skewed pipeline: **AUC identical at 0.7823**, **0.69% of decisions flipped**. Metrics gate QUALITY; prediction diffs gate BEHAVIOUR. The pipeline can be green at every stage while shipping a behaviour change."
      },
      {
        "type": "intuition",
        "front": "The best value-per-second check",
        "back": "A commit-time unit test asserting SERVING preprocessing matches TRAINING preprocessing on fixed inputs. Milliseconds to run; targets the costliest failure mode in the module."
      },
      {
        "type": "definition",
        "front": "What a model build must gate on",
        "back": "A smoke train that converges · export parity (drift + decision agreement + **the low-margin decile**) · eval thresholds aggregate AND per-slice vs the incumbent · **re-derivation** of calibration, conformal sets, thresholds and baselines."
      },
      {
        "type": "intuition",
        "front": "Shadow before canary",
        "back": "Shadow runs the new model on live traffic WITHOUT serving it, comparing predictions against the incumbent on the SAME requests. Costs only compute, and it's the strongest check available."
      },
      {
        "type": "pitfall",
        "front": "Canaries and peeking",
        "back": "Watching continuously against a fixed threshold inflates false positives exactly as in an A/B test (5% → 25% over twenty looks). Separate BLUNT automatic rollback triggers from the slower statistical promotion decision."
      },
      {
        "type": "definition",
        "front": "What makes a rollback real",
        "back": "(1) ONE action repointing to a retained immutable digest — if it needs a rebuild it's a recovery, not a rollback. (2) The previous artifact retained WITH its calibration and thresholds. (3) It has actually been EXERCISED."
      },
      {
        "type": "pitfall",
        "front": "★ The third-configuration problem",
        "back": "Rolling back weights while leaving the NEW thresholds in place produces a state neither evaluation covered — entered during an incident, with no evidence about it. Any partial revert of a coupled system does this."
      },
      {
        "type": "intuition",
        "front": "Decide the trigger in advance",
        "back": "What number, at what level, sustained how long — before the deploy. A rollback criterion invented during an incident gets NEGOTIATED by whoever has the most at stake."
      },
      {
        "type": "intuition",
        "front": "★ The audit question, and the tool criterion",
        "back": "Not \"do we have CI\" but **\"which of the three artifacts can reach production without a gate?\"** — usually two. And for any tool: does it convert a SILENT failure into a LOUD one, and at which seam?"
      }
    ],
    "refs": [
      {
        "title": "Google Cloud, MLOps: Continuous Delivery and Automation Pipelines in Machine Learning",
        "url": "https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning"
      },
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      },
      {
        "title": "Forsgren, Humble & Kim (2018), Accelerate: The Science of Lean Software and DevOps",
        "url": "https://itrevolution.com/product/accelerate/"
      },
      {
        "title": "Google SRE Book, Release Engineering and Canarying",
        "url": "https://sre.google/sre-book/release-engineering/"
      },
      {
        "title": "Johari, Koomen, Pekelis & Walsh (2017), Peeking at A/B Tests",
        "url": "https://dl.acm.org/doi/10.1145/3097983.3097992"
      }
    ],
    "demos": [
      "canary-rollout",
      "autoscaling",
      "drift-detection",
      "cross-validation"
    ]
  },
  "testing": {
    "level": "core",
    "body": {
      "intuition": [
        "Testing is the seam between CODE CORRECTNESS AND MODEL CORRECTNESS, and the reason it needs its own discipline is that the usual tools cannot express the second. A unit test asserts an exact output. A model has no exact output to assert - it has a distribution of behaviour - so the assertions have to be about PROPERTIES rather than values.",
        "The most valuable tests in an ML system are therefore not model tests at all. Data validation - schema, ranges, null rates, cardinality, freshness - written as INVARIANTS rather than statistical tests, catches the failures that do the most damage fastest and has a low false-positive rate. Those are ordinary assertions about ordinary values, and they are skipped because they feel too simple to matter.",
        "The model-specific layer is behavioural: invariance tests, directional tests and minimum-functionality tests, which assert what the model should do rather than what it did. And the through-line with the rest of the module is that each one converts a silent failure into a loud one - which is the only defence available when the failure mode is a wrong number rather than an exception."
      ],
      "math": [
        {
          "h": "The four layers, and what each can express",
          "paras": [
            "They ascend from ordinary software testing to claims only a model can violate. Most ML systems have the first and the last and neither of the middle two.",
            "The middle two are where the model-specific value is."
          ],
          "tex": "\\underbrace{\\text{unit}}_{\\text{transforms, features}} \\to \\underbrace{\\text{data validation}}_{\\text{invariants on inputs}} \\to \\underbrace{\\text{behavioural}}_{\\text{properties of predictions}} \\to \\underbrace{\\text{evaluation}}_{\\text{metrics on a set}}",
          "texNote": "Evaluation is the one everyone has and the weakest per unit of effort: it produces a single number that can improve while a slice regresses, which is the aggregation failure this curriculum has found in every module."
        },
        {
          "h": "★ The three behavioural test types",
          "paras": [
            "Borrowed from the CheckList framing, and they are the tests a unit test cannot express because they assert relationships rather than values.",
            "Each catches a class the metric cannot see."
          ],
          "tex": "\\text{INVARIANCE: } f(x)\\approx f(T(x)) \\quad\\cdot\\quad \\text{DIRECTIONAL: } f(x') > f(x)\\ \\text{for a known-direction edit} \\quad\\cdot\\quad \\text{MINIMUM FUNCTIONALITY: } f(x)=y\\ \\text{on trivial cases}",
          "texNote": "Invariance encodes what should not matter - a name change, a synonym, a reordering. Directional encodes what should. Minimum functionality is a unit test for the simplest cases everyone assumes work and nobody checks."
        },
        {
          "h": "Why slice tests rather than a threshold",
          "paras": [
            "An aggregate metric gate lets a model regress on a segment while improving overall. Per-slice assertions are the same cost and catch the case the aggregate averages away."
          ],
          "tex": "\\text{assert } m_{\\text{new}} \\ge m_{\\text{old}} - \\epsilon \\quad \\textbf{for every slice}, \\ \\text{not only } \\bar{m}",
          "texNote": "The slices come from the error analysis in the strategy lesson: each category found there becomes a named slice with a tracked metric, which is how a fixed problem stays fixed rather than being rediscovered in six months."
        }
      ],
      "code": [
        {
          "h": "Data validation, written as invariants",
          "paras": [
            "These are the highest-value tests in an ML system and they are ordinary assertions. Write them as invariants rather than as statistical tests - the false-positive rate is what determines whether anyone acts on them."
          ],
          "code": "# SCHEMA        expected columns, types, and NO unexpected columns\n# RANGES        min/max per numeric column, from domain knowledge\n# NULLS         null rate per column against an expected bound\n# CARDINALITY   distinct counts for categoricals; a sudden collapse to 1\n#               is an upstream join gone wrong\n# FRESHNESS     max timestamp within an expected lag\n# ROW COUNT     within a band - a 10x drop is a broken partition\n# UNIQUENESS    primary keys actually unique\n# RELATIONSHIPS cross-column invariants (start <= end, sum of parts = total)\n\n# ★ WHY INVARIANTS RATHER THAN STATISTICAL TESTS:\n#   a KS test on 1000 features flags ~6 on IDENTICAL distributions at\n#   alpha=0.01. An invariant fires only when something is actually broken,\n#   so people act on it. The false-positive rate IS the design constraint.",
          "caption": "Every one of these is a two-line assertion, and together they catch the failures that reach production fastest and cost the most."
        },
        {
          "h": "The model tests worth writing",
          "paras": [
            "Behavioural assertions plus the pipeline checks the rest of this module has been accumulating."
          ],
          "code": "# BEHAVIOURAL\n#   INVARIANCE   f(x) ~ f(T(x)) for label-preserving T\n#                (paraphrase, a name swap, an irrelevant field change)\n#   DIRECTIONAL  a known-direction edit moves the score the right way\n#   MIN FUNC     trivial cases the team assumes work - and nobody checks\n\n# PIPELINE (from earlier lessons, as permanent tests)\n#   ★ SERVING PARITY   training and serving preprocessing agree on fixed\n#                      inputs - milliseconds, and the highest value/second\n#   ★ EXPORT PARITY    drift, decision agreement, AND the low-margin decile\n#   SMOKE TRAIN        converges on a small fixed subset\n#   OVERFIT-ONE-BATCH  the model CAN drive loss to ~0 on 8 examples;\n#                      if it cannot, something is wired wrong\n#   SHAPE/DTYPE        at batch 1, max batch, and an unseen shape\n\n# EVALUATION\n#   per-SLICE thresholds against the incumbent, not just the aggregate\n#   ★ slices come from ERROR ANALYSIS - each category becomes a test, so\n#     a fixed problem cannot silently return",
          "caption": "Overfit-one-batch is the fastest diagnostic in deep learning: it separates a broken pipeline from a hard problem in under a minute."
        }
      ],
      "useCases": [
        "Any pipeline consuming upstream data you do not own, where schema and range invariants catch a breaking change before it becomes a silent prediction shift.",
        "Preventing regression on a known failure mode, by turning each error-analysis category into a permanent slice test.",
        "Debugging a model that will not learn, where overfit-one-batch separates a wiring bug from a genuinely hard problem in under a minute.",
        "Gating a retrain, where the behavioural and parity tests are the checks a metric threshold cannot express."
      ],
      "pitfalls": [
        "Testing only with an evaluation metric. It produces one number that can improve while a slice regresses, which is the aggregation failure this curriculum finds in every module.",
        "Writing data validation as statistical tests. A KS test over a thousand features flags about six on identical distributions, and a checker people ignore is worse than none.",
        "Asserting exact model outputs. A model has a distribution of behaviour rather than an exact output, so the assertions must be about properties - invariance, direction, minimum functionality.",
        "Skipping data validation because it feels too simple. Schema, range and freshness invariants catch the failures that reach production fastest and cost the most.",
        "Not testing at batch size 1. A whole class of defects - batch statistics, padding, per-batch normalization - is invisible above it, which the serving lesson measured at 0.69% versus 4.34% decision change.",
        "Letting error-analysis categories die in a notebook. Each should become a named slice with a tracked assertion, or the problem is rediscovered in six months.",
        "Testing the happy path only. The fallback path, the empty input, the malformed record and the timeout are what run during an incident, and an untested fallback is as likely to be broken as any other untested code."
      ],
      "connections": [
        {
          "ref": "mlops/cicd",
          "text": "Where these tests run, and the ordering that keeps the fast, high-yield ones first so failures surface in seconds."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Where the slices come from - each error-analysis category becomes a permanent test, which is how a fixed problem stays fixed."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The parity assertion that belongs in the fast test suite, and why a metric comparison cannot substitute for it."
        },
        {
          "ref": "trustworthy-ai/red-teaming",
          "text": "The adversarial extension, and why a patched suite measures regression rather than safety once you have optimized against it."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The production continuation of the same invariants, where a schema check becomes a runtime assertion rather than a build-time one."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why can't a unit test express model correctness?",
          "a": "A unit test asserts an exact output. A model has a DISTRIBUTION of behaviour, so the assertions must be about PROPERTIES rather than values."
        },
        {
          "q": "Name the four layers.",
          "a": "Unit (transforms, features) → data validation (invariants on inputs) → behavioural (properties of predictions) → evaluation (metrics on a set). Most systems have the first and last and neither middle one."
        },
        {
          "q": "★ Which layer has the best return?",
          "a": "DATA VALIDATION. Ordinary assertions about ordinary values, catching the failures that reach production fastest and cost the most — and skipped because they feel too simple."
        },
        {
          "q": "Invariants or statistical tests for data?",
          "a": "INVARIANTS. A KS test over 1000 features flags ~6 on IDENTICAL distributions at α=0.01. **The false-positive rate is the design constraint** — a checker people ignore is worse than none."
        },
        {
          "q": "List the data invariants worth writing.",
          "a": "Schema (and NO unexpected columns) · ranges · null rates · cardinality (a collapse to 1 is a broken join) · freshness · row-count band · key uniqueness · cross-column relationships."
        },
        {
          "q": "★ Name the three behavioural test types.",
          "a": "INVARIANCE f(x) ≈ f(T(x)) for label-preserving T · DIRECTIONAL — a known-direction edit moves the score the right way · MINIMUM FUNCTIONALITY on trivial cases."
        },
        {
          "q": "What does invariance encode?",
          "a": "What should NOT matter — a paraphrase, a name swap, an irrelevant field change. Directional encodes what should."
        },
        {
          "q": "What is overfit-one-batch?",
          "a": "Assert the model CAN drive loss to ~0 on 8 examples. If it cannot, something is wired wrong. The fastest diagnostic in deep learning — under a minute."
        },
        {
          "q": "Which parity checks belong in the suite?",
          "a": "SERVING parity (training vs serving preprocessing on fixed inputs — milliseconds, highest value per second) and EXPORT parity (drift, decision agreement, and the low-margin decile)."
        },
        {
          "q": "★ Why per-slice thresholds?",
          "a": "An aggregate gate lets a model regress on a segment while improving overall — the aggregation failure found in every module of this curriculum. Same cost, catches what the average hides."
        },
        {
          "q": "Where do the slices come from?",
          "a": "ERROR ANALYSIS. Each category becomes a named slice with a tracked assertion — which is how a fixed problem stays fixed rather than being rediscovered in six months."
        },
        {
          "q": "Why test batch size 1?",
          "a": "A whole class of defects — batch statistics, padding, per-batch normalization — is invisible above it. Measured: 0.69% decision change at batch 8,000 vs 4.34% at batch 8."
        }
      ],
      "standard": [
        {
          "q": "How do you test a machine learning system?",
          "a": "IN FOUR LAYERS, AND THE TWO IN THE MIDDLE ARE THE ONES MOST SYSTEMS LACK. UNIT TESTS on the deterministic parts — data transforms, feature computation, the serving preprocessing — which are ordinary software and should be tested as such. DATA VALIDATION, written as INVARIANTS: schema with no unexpected columns, ranges from domain knowledge, null rates, cardinality, freshness, row-count bands, key uniqueness, cross-column relationships. These are the highest-return tests in an ML system and they are skipped because they feel too simple to matter. BEHAVIOURAL TESTS, which assert properties of predictions rather than values, because a model has a distribution of behaviour and no exact output to assert against. AND EVALUATION, which everyone has and which is the weakest per unit of effort — it produces one number that can improve while a slice regresses. THE REASON DATA VALIDATION SHOULD BE INVARIANTS RATHER THAN STATISTICAL TESTS is the false-positive rate: a KS test over a thousand features flags about six on identical distributions at alpha 0.01, and a checker people learn to ignore is worse than no checker, because the one true alarm is ignored with the rest.",
          "deepDive": {
            "q": "What does the behavioural layer actually contain?",
            "a": "The behavioural layer is worth expanding because it is the genuinely ML-specific part and the CheckList framing names it well. INVARIANCE tests assert that a label-preserving transformation does not change the prediction — swapping a name, paraphrasing, reordering irrelevant fields, changing a unit that the model should normalize away — and they encode what should not matter. DIRECTIONAL tests assert that an edit with a known sign moves the score the right way, which is a weaker and much more robust claim than asserting a value. MINIMUM FUNCTIONALITY tests are unit tests for the simplest cases everyone assumes work: the clearest positive, the clearest negative, the empty input. Together they catch a class of defect that metrics cannot see, because a model can have excellent aggregate accuracy while being sensitive to a name change — which is both a quality bug and, in many domains, a fairness one. The practical way to generate them is from the error analysis: every category found there suggests an invariance or a directional test, which is how the two lessons connect and how the exercise stops being a one-off."
          }
        },
        {
          "q": "What data validation would you write, and why invariants?",
          "a": "EIGHT CHECKS, ALL TWO-LINE ASSERTIONS. Schema — expected columns and types, and crucially NO unexpected columns, since a silently added column is a schema change nobody announced. Ranges per numeric column from domain knowledge. Null rate per column against a bound. Cardinality for categoricals, where a sudden collapse to one distinct value is an upstream join that produced nulls. Freshness — maximum timestamp within an expected lag. Row count within a band, because a tenfold drop is a broken partition. Key uniqueness. And cross-column relationships: start before end, parts summing to the total. WHY INVARIANTS RATHER THAN STATISTICAL TESTS is the crux and it is about the false-positive rate. A statistical drift test over a wide table fires constantly at production sample sizes — six of a thousand features on identical distributions — so people stop reading it, and the organizational cost is that the one genuine alarm is ignored alongside the noise. An invariant fires only when something is actually broken, which is what makes it actionable. THE DESIGN CONSTRAINT IS THE FALSE-POSITIVE RATE, not the detection power, and that inverts the usual instinct.",
          "deepDive": {
            "q": "How do validation and drift detection differ?",
            "a": "The distinction between validation and drift detection is worth keeping sharp because the tooling blurs it. Validation asks whether the data is BROKEN — a contract violation with a right answer. Drift detection asks whether the data has CHANGED — a statistical question with no right answer, whose relationship to performance the monitoring lesson showed is weak in both directions. They deserve different alert routing, different thresholds and different owners: a validation failure should block a pipeline, and a drift signal should inform a human. Conflating them produces either a pipeline that halts on harmless distribution shifts or a validation suite people snooze. The other practical point is where validation runs: at the boundary of every stage, not once at ingestion, because the most common real failure is a transformation producing nulls or out-of-range values downstream of a perfectly valid input. Asserting the contract at each stage boundary localizes the fault to a single step, which turns a pipeline debugging session into a stack trace."
          }
        },
        {
          "q": "What is overfit-one-batch and why is it valuable?",
          "a": "TAKE ABOUT EIGHT EXAMPLES, TURN OFF REGULARIZATION AND AUGMENTATION, AND ASSERT THE MODEL CAN DRIVE THE LOSS TO NEARLY ZERO. If it can, the pipeline is wired correctly — the data reaches the model, the labels align with the inputs, the loss is connected to the parameters, and the optimizer updates them. If it cannot, something is broken, and the failure is upstream of anything about the problem's difficulty. IT IS THE FASTEST DIAGNOSTIC IN DEEP LEARNING because it runs in under a minute and it cleanly separates 'the pipeline is broken' from 'the problem is hard', which is the ambiguity that otherwise costs days. The failures it catches are the ones with no error message: labels shuffled relative to inputs, a detached tensor breaking the gradient path, a learning rate of zero, the loss computed on the wrong axis, a frozen layer that should not be, augmentation destroying the signal. ALL OF THOSE PRESENT IDENTICALLY as a model that trains and does not improve, which is a symptom people spend a week attributing to the data or the architecture. AS A PERMANENT TEST it is a smoke check that catches a refactor breaking the training path, and it belongs in the fast tier of the pipeline.",
          "deepDive": {
            "q": "What is the complementary check?",
            "a": "The complementary check is the label-shuffle test: train on deliberately randomized labels and assert that validation performance is at chance. If a model achieves meaningfully better than chance on shuffled labels, there is leakage — information reaching the model through a path other than the intended features — and that is a much more direct leakage detector than staring at the feature list. It is the same logic as the A/A test from the experimentation module and the negative-control discipline from the causal one, arriving as a training-pipeline check. Both tests share a shape worth noticing: they establish what SHOULD happen in a degenerate case and assert it, rather than checking whether the real case looks good. That is generally the most reliable form of test available for a system whose correct output you cannot specify — bound the behaviour in cases where you know the answer, and let the uncertain cases be measured rather than asserted."
          }
        },
        {
          "q": "How do you keep a fixed problem fixed?",
          "a": "BY TURNING EVERY ERROR-ANALYSIS CATEGORY INTO A NAMED SLICE WITH A TRACKED ASSERTION. The strategy lesson's exercise produces a ranked list of error categories — blurry inputs, mislabelled ground truth, rare-class confusion — and the usual fate of that list is a notebook that nobody opens again, so the same categories are rediscovered six months later by whoever next does the analysis. INSTEAD, EACH CATEGORY BECOMES A SLICE: a named subset with its own metric, tracked over releases, and gated in the pipeline with an assertion that the new model does not regress on it by more than a small tolerance. That converts a one-off insight into a permanent property of the system, and it costs a filter and a threshold per category. AND IT FIXES THE AGGREGATION FAILURE at the same time, because a per-slice gate catches the case where the aggregate improves while a segment regresses — which is the failure this curriculum has found in every module, from subgroup calibration to negative transfer to search's tail queries. THE COMPLEMENTARY PRACTICE is to add a specific test for each production incident, the same way a bug gets a regression test, so the incident cannot recur silently.",
          "deepDive": {
            "q": "Which maintenance question has to be answered?",
            "a": "There is a maintenance question that has to be answered or the practice decays: slices accumulate, some become irrelevant as the product changes, and a suite of forty slice gates that nobody prunes becomes a source of flaky failures that get overridden. The discipline is to give each slice an owner and a review date, and to retire slices deliberately rather than by neglect — which is the same governance shape as the fairness metric choice and the loss weights in multi-task. The other consideration is statistical: small slices have wide intervals, so a strict threshold on a slice with two hundred examples will fail on noise, and the gate should be an interval-aware comparison rather than a point threshold. That is the minimum-detectable-effect discipline applied to a CI gate, and getting it wrong in either direction is costly — too strict and the pipeline is flaky, too loose and the gate does nothing. Sizing the slice evaluation sets deliberately, rather than taking whatever falls out of the filter, is the fix."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE SEAM IS BETWEEN CODE CORRECTNESS AND MODEL CORRECTNESS, AND THE WHOLE LESSON IS ABOUT CONVERTING SILENT FAILURES INTO LOUD ONES. That is the module's theme stated as a practice: every check here exists because an ML component fails by producing a different number rather than by raising, and a test is the mechanism that turns a wrong number into a build failure. THE REASON IT NEEDS ITS OWN DISCIPLINE is that ordinary testing tools assert values and a model has no exact value to assert — so the assertions become properties, which is a weaker and more robust form of claim. AND THE HIGHEST-VALUE LAYER IS THE LEAST GLAMOROUS: data validation as invariants, which is ordinary software testing applied to inputs, catching the failures that reach production fastest. THE DESIGN CONSTRAINT WORTH CARRYING is that the false-positive rate determines whether anyone acts — a statistical test over a thousand features flagging six on identical distributions produces a checker people snooze, and a snoozed checker is worse than none because it manufactures confidence. Prefer assertions that fire only when something is broken.",
          "deepDive": {
            "q": "What can a test suite not establish?",
            "a": "Reading this lesson against the red-teaming material completes a useful picture of what testing can and cannot establish. A test suite is a sample of the behaviour space, so a passing suite is a statement about the cases you thought of — which is precisely the coverage argument, and it means 'the tests pass' has the same epistemic shape as 'the red team found nothing'. That is why the suite has to keep growing from error analysis and incidents rather than being written once, and why some findings should stay unpatched as measurement. It also explains the limit: no suite establishes that a model is correct, because correctness is not a property you can enumerate. What a suite establishes is that a specific set of known failures does not recur, which is a real and bounded claim, and stating it that way is more honest and more useful than treating a green pipeline as a safety argument."
          }
        },
        {
          "q": "What would you test first on an inherited ML system?",
          "a": "DATA VALIDATION AT EVERY STAGE BOUNDARY, BECAUSE IT IS CHEAP AND IT LOCALIZES FAULTS. Schema, ranges, nulls, cardinality, freshness and row counts asserted at each stage's input and output means the next pipeline failure produces a specific message about a specific step rather than a wrong number at the end. THEN THE SERVING PARITY TEST — the same raw input through the training path and the serving path, compared at the model's input tensor — because it is milliseconds to run and it targets the failure mode with the largest measured cost, where a skewed pipeline left AUC identical at 0.7823 while 0.69% of decisions flipped. THEN OVERFIT-ONE-BATCH AND A LABEL-SHUFFLE TEST, which together establish that the training pipeline is wired correctly and that there is no leakage, in about two minutes of compute. THEN PER-SLICE EVALUATION against the incumbent, with the slices taken from whatever error analysis exists or a quick one if none does. THAT ORDERING IS DELIBERATE: it starts with the checks that have the lowest false-positive rate and the fastest feedback, so the suite is trusted from the beginning — a new test suite that fires spuriously in its first week never recovers its credibility.",
          "deepDive": {
            "q": "Why does the sequencing matter organizationally?",
            "a": "The credibility point is worth taking seriously because it is an organizational constraint rather than a technical one, and it determines whether the work survives. A suite that is trusted gets extended; a suite that cries wolf gets bypassed with a skip marker and then deleted in a cleanup six months later. So the sequencing should optimize for early true positives: start with invariants that only fire on genuine breakage, demonstrate that they catch something real, and add the more statistical checks once the suite has standing. The other move that helps is to make the first tests ones that would have caught a PAST incident, because the argument for the work then writes itself and the team can see what it buys. That is the same principle as the module's tool criterion — does it convert a silent failure into a loud one — applied to the adoption problem rather than the technical one, and in most organizations the adoption problem is the harder of the two."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The four testing layers",
        "back": "Unit (transforms, features) → **data validation** (invariants on inputs) → **behavioural** (properties of predictions) → evaluation (metrics). Most systems have the first and last and neither middle one."
      },
      {
        "type": "intuition",
        "front": "Why unit tests can't express model correctness",
        "back": "A unit test asserts an exact output. A model has a DISTRIBUTION of behaviour, so assertions must be about PROPERTIES — a weaker and far more robust form of claim."
      },
      {
        "type": "intuition",
        "front": "★ Invariants, not statistical tests",
        "back": "A KS test over 1000 features flags ~6 on IDENTICAL distributions at α=0.01. **The false-positive rate is the design constraint** — a checker people snooze is worse than none, because it manufactures confidence."
      },
      {
        "type": "definition",
        "front": "The eight data invariants",
        "back": "Schema (and NO unexpected columns) · ranges · null rates · cardinality (collapse to 1 = a broken join) · freshness · row-count band · key uniqueness · cross-column relationships (start ≤ end, parts = total)."
      },
      {
        "type": "definition",
        "front": "★ The three behavioural tests",
        "back": "INVARIANCE f(x) ≈ f(T(x)) — what should NOT matter (paraphrase, name swap). DIRECTIONAL — a known-sign edit moves the score correctly. MINIMUM FUNCTIONALITY — the trivial cases everyone assumes work."
      },
      {
        "type": "intuition",
        "front": "Validation vs drift detection",
        "back": "Validation asks whether the data is BROKEN — a contract with a right answer, and it should BLOCK. Drift asks whether it CHANGED — statistical, no right answer, and it should INFORM. Different thresholds, routing and owners."
      },
      {
        "type": "intuition",
        "front": "Where validation runs",
        "back": "At EVERY stage boundary, not once at ingestion — because the common failure is a transformation producing nulls downstream of perfectly valid input. Asserting per stage turns a debugging session into a stack trace."
      },
      {
        "type": "definition",
        "front": "★ Overfit-one-batch",
        "back": "8 examples, no regularization or augmentation, assert loss → ~0. Under a minute, and it separates \"the pipeline is broken\" from \"the problem is hard\" — the ambiguity that otherwise costs days."
      },
      {
        "type": "intuition",
        "front": "What overfit-one-batch catches",
        "back": "Shuffled labels · a detached tensor breaking the gradient path · LR of zero · loss on the wrong axis · a wrongly frozen layer · augmentation destroying the signal. **All present identically** as \"trains but doesn't improve.\""
      },
      {
        "type": "definition",
        "front": "The label-shuffle test",
        "back": "Train on randomized labels; assert validation is at CHANCE. Better than chance ⇒ LEAKAGE through a path other than the intended features. The A/A test and the negative control, arriving as a pipeline check."
      },
      {
        "type": "intuition",
        "front": "★ How a fixed problem stays fixed",
        "back": "Every error-analysis category becomes a NAMED SLICE with a tracked assertion, gated per release. Otherwise the list dies in a notebook and the categories are rediscovered in six months. Add a test per incident too."
      },
      {
        "type": "pitfall",
        "front": "Slice gates need interval awareness",
        "back": "Small slices have wide intervals, so a strict point threshold fails on NOISE and the pipeline becomes flaky and gets overridden. Size the slice evaluation sets deliberately; give each slice an owner and a review date."
      }
    ],
    "refs": [
      {
        "title": "Breck, Cai, Nielsen, Salib & Sculley (2017), The ML Test Score",
        "url": "https://research.google/pubs/pub46555/"
      },
      {
        "title": "Ribeiro, Wu, Guestrin & Singh (2020), Beyond Accuracy: Behavioral Testing of NLP Models with CheckList",
        "url": "https://arxiv.org/abs/2005.04118"
      },
      {
        "title": "Polyzotis, Zinkevich, Roy, Breck & Whang (2019), Data Validation for Machine Learning",
        "url": "https://mlsys.org/Conferences/2019/doc/2019/167.pdf"
      },
      {
        "title": "Karpathy, A Recipe for Training Neural Networks",
        "url": "http://karpathy.github.io/2019/04/25/recipe/"
      },
      {
        "title": "Great Expectations, Data Quality Testing Documentation",
        "url": "https://docs.greatexpectations.io/"
      }
    ],
    "demos": [
      "cross-validation",
      "classification-metrics",
      "drift-detection",
      "overfitting"
    ]
  },
  "project-structure": {
    "level": "core",
    "body": {
      "intuition": [
        "The last seam is between PEOPLE, and it is the one every other lesson in this module quietly depends on. A parity check that lives in one engineer's notebook is not a gate. A data-version convention nobody else follows is not a convention. Structure is how a practice survives the person who introduced it.",
        "The concrete failure is the notebook-to-production gap. Notebooks are excellent for exploration and structurally hostile to everything after it: hidden state means the code that produced a result may not be the code on screen, execution order is not recorded, diffs are unreadable, and nothing is importable - so the path to production is a rewrite, which is a second implementation and therefore a seam.",
        "The structural answer is small and unglamorous: put the logic in importable modules, keep notebooks as thin callers, make configuration a versioned object rather than a call signature, and give the pipeline a single entry point that runs the same way locally and in CI. That is what makes a run describable, a result reproducible, and a check enforceable - which is every other lesson in this module."
      ],
      "math": [
        {
          "h": "★ Why notebooks do not survive the seam",
          "paras": [
            "Four properties, each individually tolerable and collectively fatal to anything that must be reproduced, reviewed or automated.",
            "None of them is an argument against notebooks for exploration, which is what they are good at."
          ],
          "tex": "\\text{hidden state} \\;\\cdot\\; \\text{unrecorded execution order} \\;\\cdot\\; \\text{unreviewable diffs} \\;\\cdot\\; \\text{not importable}",
          "texNote": "Hidden state is the sharpest: a cell edited and not re-run means the displayed result was produced by code that no longer exists on screen. That is the reproducibility failure from the tracking lesson, occurring inside a single session."
        },
        {
          "h": "The layout that follows from the constraints",
          "paras": [
            "Not a convention to memorize - each directory exists because something in this module needs it to exist.",
            "Configuration as data rather than as arguments is the piece that makes a run describable by a single versioned object."
          ],
          "tex": "\\texttt{src/} \\ \\text{(importable)} \\;\\cdot\\; \\texttt{configs/} \\ \\text{(versioned data)} \\;\\cdot\\; \\texttt{tests/} \\;\\cdot\\; \\texttt{notebooks/} \\ \\text{(thin callers)} \\;\\cdot\\; \\texttt{pipelines/} \\ \\text{(one entry point)}",
          "texNote": "The rule that generates all of it: anything that must be reproduced, reviewed, tested or automated lives in src and configs. Anything exploratory lives in notebooks and may be deleted without loss."
        },
        {
          "h": "Ceremony should scale with reliance",
          "paras": [
            "The failure modes are symmetric and both are common: exploratory work strangled by process, and production work resting on someone's laptop.",
            "The graduation points are what make the standard arguable rather than a matter of taste."
          ],
          "tex": "\\text{exploration} \\to \\text{a result others rely on} \\to \\text{serves traffic} \\to \\text{retrains automatically}",
          "texNote": "Lockfile and version control at the first. Tracking, pinned environment and a smoke train at the second. The full test and gate ladder at the third. The strictest gates at the fourth, because it is the highest-frequency and lowest-oversight path into production."
        }
      ],
      "code": [
        {
          "h": "The structure, and why each part exists",
          "paras": [
            "Every entry traces back to a lesson in this module rather than to a style preference."
          ],
          "code": "# src/            IMPORTABLE modules - data, features, model, evaluate,\n#                 serve. Because a notebook cannot be imported, tested,\n#                 or shared between training and serving, and the parity\n#                 requirement means both paths must call ONE implementation.\n# configs/        configuration as VERSIONED DATA, not call arguments.\n#                 Because a run must be describable by a single object\n#                 that can be logged, diffed and pinned.\n# tests/          because a check outside CI is a suggestion.\n# notebooks/      THIN callers that import from src. Exploration is what\n#                 notebooks are good at; keep the logic elsewhere.\n# pipelines/      ONE entry point that runs identically locally and in CI.\n#                 Because a pipeline that only runs in CI cannot be\n#                 debugged, and one that only runs locally is not a gate.\n# Dockerfile      the environment coordinate, pinned by digest.\n# lockfile        the dependency coordinate, with hashes.\n\n# ★ THE GENERATING RULE: anything that must be reproduced, reviewed,\n#   tested or automated lives in src/ and configs/. Anything exploratory\n#   lives in notebooks/ and can be deleted without loss.",
          "caption": "The layout is not a convention to adopt on authority - each directory is the answer to a specific failure from an earlier lesson."
        },
        {
          "h": "The practices that make the module's checks enforceable",
          "paras": [
            "Each of these is what turns a good intention from an earlier lesson into something that survives a busy week."
          ],
          "code": "# ONE IMPLEMENTATION, TWO CALLERS\n#   training and serving import the same preprocessing function\n#   -> removes the skew seam rather than monitoring it\n\n# CONFIG AS DATA, LOGGED WITH THE RUN\n#   -> makes the run describable, diffable and pinnable (tracking lesson)\n\n# EVERY CHECK IN CI, NONE IN A README\n#   -> parity, data validation, slice thresholds, re-derivation\n#      a check that must be remembered will not be\n\n# A MODEL CARD WRITTEN IN WEEK ONE, not at the end\n#   what it predicts, what consumes it (ORDER or PROBABILITY), what it\n#   must not do, what would make you turn it off\n#   ★ a question you cannot answer in week one is usually the question\n#     the project should be organized around\n\n# AN OWNER PER UNRESOLVABLE CHOICE\n#   the fairness criterion, the loss weights, the operating point, the\n#   rollback trigger. None is derivable from data; each needs a name.",
          "caption": "The last item is the one this curriculum keeps arriving at from different directions, which is a good sign it is structural rather than incidental."
        }
      ],
      "useCases": [
        "Any project that will outlive its author, which is most of them, and where the structure is what makes the handover possible.",
        "Moving from a working notebook to a deployed model, where the rewrite is the seam and importable modules are what remove it.",
        "Onboarding, where a single entry point that runs identically locally and in CI is the difference between a day and a fortnight.",
        "Making the earlier lessons' checks real, since a parity assertion outside CI and a data convention nobody follows are both suggestions."
      ],
      "pitfalls": [
        "Keeping logic in notebooks. Hidden state means the displayed result may come from code no longer on screen, and nothing is importable, so the path to production is a rewrite and therefore a second implementation.",
        "Configuration as call arguments rather than versioned data. A run is then not describable by a single object, so it cannot be logged, diffed or pinned.",
        "Two implementations of preprocessing. The parity check is then a permanent obligation rather than an unnecessary one - one implementation with two callers removes the seam.",
        "Checks documented in a README rather than enforced in CI. A check that must be remembered will not be, particularly during the week it matters.",
        "A pipeline that only runs in CI. It cannot be debugged; one that only runs locally is not a gate. It must run identically in both.",
        "Writing the model card at the end. Its questions - what consumes this, what must it not do, what would make you turn it off - are the ones that should shape the project, and a question you cannot answer in week one is usually the important one.",
        "Leaving unresolvable choices unowned. The fairness criterion, the loss weights, the operating point and the rollback trigger are not derivable from data, and an unowned choice defaults to whoever last edited a config."
      ],
      "connections": [
        {
          "ref": "mlops/mlflow",
          "text": "Why configuration must be versioned data - it is what makes a run describable by a single loggable, diffable object."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The skew seam that one implementation with two callers removes rather than monitors."
        },
        {
          "ref": "mlops/testing",
          "text": "The checks this structure makes enforceable, and why a test outside CI is a suggestion."
        },
        {
          "ref": "mlops/system-design",
          "text": "The architectural patterns this scaffolding supports, and where the module's seams appear at system scale."
        },
        {
          "ref": "interview-capstone/portfolio-capstone",
          "text": "The same structure as a deliverable - a project you can defend end to end is one whose decisions were recorded as they were made."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What is the seam here?",
          "a": "Between PEOPLE. A parity check in one engineer's notebook is not a gate; a convention nobody else follows is not a convention. Structure is how a practice survives its author."
        },
        {
          "q": "Name the four notebook problems.",
          "a": "Hidden state · unrecorded execution order · unreviewable diffs · not importable. Individually tolerable, collectively fatal to anything reproduced, reviewed or automated."
        },
        {
          "q": "Which is sharpest?",
          "a": "HIDDEN STATE — a cell edited and not re-run means the displayed result came from code no longer on screen. The tracking lesson's reproducibility failure, inside a single session."
        },
        {
          "q": "So are notebooks bad?",
          "a": "No — they're excellent for EXPLORATION, which is what they're for. Keep the logic in importable modules and the notebooks as thin callers."
        },
        {
          "q": "★ Give the generating rule for the layout.",
          "a": "Anything that must be reproduced, reviewed, tested or automated lives in `src/` and `configs/`. Anything exploratory lives in `notebooks/` and can be deleted without loss."
        },
        {
          "q": "Why is configuration data rather than arguments?",
          "a": "So a run is describable by a SINGLE versioned object that can be logged, diffed and pinned — which is what the tracking lesson requires."
        },
        {
          "q": "Why one implementation with two callers?",
          "a": "It REMOVES the train/serve skew seam rather than monitoring it. Two implementations make the parity check a permanent obligation."
        },
        {
          "q": "Why must the pipeline run locally too?",
          "a": "A pipeline that only runs in CI cannot be debugged; one that only runs locally is not a gate. It must run identically in both."
        },
        {
          "q": "When do you write the model card?",
          "a": "Week one. Its questions — what consumes this, ORDER or PROBABILITY, what must it not do, what would make you turn it off — are the ones that should shape the project."
        },
        {
          "q": "★ What does ceremony scale with?",
          "a": "How much the output is RELIED ON: exploration → a result others depend on → serves traffic → retrains automatically. Each graduation adds gates."
        },
        {
          "q": "What are the symmetric failures?",
          "a": "Exploratory work strangled by process, and production work resting on someone's laptop. Both are common; the graduation points make the standard arguable rather than a matter of taste."
        },
        {
          "q": "Which choices need a named owner?",
          "a": "The fairness criterion, the loss weights, the operating point, the rollback trigger. None is derivable from data — and an unowned choice defaults to whoever last edited a config."
        }
      ],
      "standard": [
        {
          "q": "Why does project structure matter for an ML system specifically?",
          "a": "BECAUSE EVERY OTHER PRACTICE IN THIS MODULE DEPENDS ON IT, AND THE SEAM IS BETWEEN PEOPLE. A parity check that lives in one engineer's notebook is not a gate. A data-versioning convention nobody else follows is not a convention. A re-derivation step documented in a README is not a step. Structure is the mechanism by which a practice survives the person who introduced it and the week when nobody has time. THE CONCRETE ML-SPECIFIC FAILURE IS THE NOTEBOOK-TO-PRODUCTION GAP. Notebooks are excellent at exploration and structurally hostile to everything after it: hidden state means the displayed result may have been produced by code that is no longer on screen; execution order is not recorded; diffs are unreviewable; and nothing is importable. THAT LAST ONE IS THE EXPENSIVE PART, because if the training logic cannot be imported then the serving path must reimplement it — which is a second implementation, which is the train/serve skew seam, which the serving lesson measured at 0.69% of decisions flipping with AUC unchanged to four decimals. SO THE STRUCTURAL FIX IS ALSO THE SKEW FIX: put the logic in importable modules and have both paths call one implementation, which removes the seam rather than monitoring it.",
          "deepDive": {
            "q": "Why does that connection matter?",
            "a": "That connection is worth making explicit because it reframes structure from a hygiene argument into a correctness one. The usual case for organizing a project is readability and onboarding, which are real and are weak motivators under deadline. The stronger case is that several of this module's failure modes are consequences of structure rather than of discipline: skew follows from two implementations, unreproducible runs follow from configuration living in call signatures, unenforced checks follow from tests living outside CI. Fix the structure and those failures become impossible rather than unlikely, which is a much better position than monitoring for them. The corollary is that a structural fix is worth more than a procedural one wherever it is available — one implementation beats a parity test, configuration-as-data beats a convention to log parameters, and a single pipeline entry point beats a runbook. Where the structural fix is unavailable, the procedural one is the fallback and it needs enforcement in CI, which is the theme of the previous lesson."
          }
        },
        {
          "q": "What layout would you use, and what generates it?",
          "a": "ONE RULE GENERATES ALL OF IT: anything that must be reproduced, reviewed, tested or automated lives in importable modules and versioned configuration; anything exploratory lives in notebooks and can be deleted without loss. THAT PRODUCES src FOR IMPORTABLE MODULES — data, features, model, evaluation, serving — because a notebook cannot be imported, tested or shared between the training and serving paths, and the parity requirement means both must call one implementation. CONFIGS AS VERSIONED DATA rather than as call arguments, because the tracking lesson requires a run to be describable by a single object that can be logged, diffed and pinned; configuration passed as arguments is not that object. TESTS, because a check outside CI is a suggestion. NOTEBOOKS AS THIN CALLERS that import from src, since exploration is what they are genuinely good at and the logic belongs elsewhere. PIPELINES WITH ONE ENTRY POINT that runs identically locally and in CI — a pipeline that only runs in CI cannot be debugged, and one that only runs locally is not a gate. AND THE DOCKERFILE AND LOCKFILE, which are the environment and dependency coordinates from the tracking lesson made concrete. NONE OF THAT IS A STYLE PREFERENCE; each directory answers a specific failure from an earlier lesson.",
          "deepDive": {
            "q": "Why does the configuration point have the widest consequences?",
            "a": "The configuration point deserves elaboration because it is the one most often done casually and it has the widest consequences. When configuration is a set of command-line arguments or hard-coded constants, a run is described by an invocation that nobody records in full, so the tracking lesson's requirement — that a run be reproducible from its record — cannot be met even with good intentions. When configuration is a versioned file, the run is described by its content hash, the diff between two runs is readable, and a sweep is a set of files rather than a shell history. It also makes the config reviewable, which matters because a threshold or a loss weight changed in a config is a behaviour change with no code change, and the CI/CD lesson identified that as one of the commonly ungated paths into production. Bringing configuration under review and canary discipline closes it, and it costs nothing beyond deciding that config files are code."
          }
        },
        {
          "q": "How much structure does a project need?",
          "a": "IT SHOULD SCALE WITH HOW MUCH THE OUTPUT IS RELIED ON, and the graduation points are clear enough to argue about rather than being a matter of taste. FOR EXPLORATION: version control and a lockfile, and nothing else, because the cost of ceremony exceeds the cost of the mistakes at that stage and a team that puts a research notebook behind a six-stage pipeline stops iterating. ONCE A RESULT WILL BE RELIED ON — a number in a document, a model heading to review — add the reproducibility layer: tracked runs with the four coordinates, a pinned environment, and a smoke train. ONCE IT SERVES TRAFFIC: the full ladder — importable modules, data validation, parity checks, per-slice evaluation, re-derivation, shadow, canary, tested rollback. ONCE IT RETRAINS AUTOMATICALLY: the strictest gates, because that is the highest-frequency and lowest-oversight path into production. THE TWO FAILURE MODES ARE SYMMETRIC and both are common — exploratory work strangled by process, and production work resting on somebody's laptop — and naming the graduation point converts an argument about discipline into a question about a specific artifact, which is the version people actually act on.",
          "deepDive": {
            "q": "How does that settle the 'should we refactor this notebook' argument?",
            "a": "The graduated framing also gives a clean answer to the perennial 'should we refactor this notebook' question, which otherwise gets decided by whoever feels most strongly. The answer is: has it crossed a graduation point? If a result from it is about to be relied on, extract the logic into modules and pin the environment. If it is about to serve traffic, the whole ladder applies. If it is still exploration, leave it alone — and be willing to delete it, which is the property that makes exploratory code cheap. The corollary worth stating to a team is that notebooks in the exploratory tier should be treated as disposable rather than as assets: the moment someone wants to keep one because it is valuable, that is the signal it has graduated and its logic should move. Teams that resist that end up with a directory of notebooks nobody dares delete and nobody can run, which is the worst of both tiers."
          }
        },
        {
          "q": "What belongs in a model card, and when do you write it?",
          "a": "IN WEEK ONE, NOT AT THE END, BECAUSE ITS QUESTIONS ARE THE ONES THAT SHOULD SHAPE THE PROJECT. WHAT IT PREDICTS and what one row means. WHAT CONSUMES IT, and specifically whether the consumer needs an ORDER or a PROBABILITY — that single distinction decides whether calibration is optional or mandatory, and the ads case measured it as worth up to 36.9% of revenue. THE POPULATION IT WAS EVALUATED ON, with per-slice numbers rather than an aggregate, since every guarantee in this curriculum turned out to be true over a reference class that the headline omitted. WHAT IT MUST NOT DO — the guardrails, with the burden of proof reversed. WHAT WOULD MAKE YOU TURN IT OFF, which is the rollback trigger stated before it is needed. AND THE OWNERS of the choices that are not derivable from data: the operating point, the fairness criterion, the loss weights. WRITING IT FIRST IS THE POINT: a question you cannot answer in week one is usually the question the project should be organized around, and discovering in month three that nobody knows what consumes the output is a much more expensive way to find out.",
          "deepDive": {
            "q": "Isn't a week-one model card just speculation?",
            "a": "There is a practical objection — that a week-one model card is speculative — and the answer is that speculative answers are informative. Writing 'we do not yet know whether the consumer needs a probability' is a finding, and it puts a specific question in front of the person who can answer it while the design is still cheap to change. The card then gets updated as the project proceeds, and its diff over time is a record of what was decided and when, which is exactly what a handover or an incident review needs. The related habit is to keep the card in the repository next to the code rather than in a document system, so it is versioned with what it describes and so a pull request that changes the model's behaviour can change the card in the same commit. A card that lives elsewhere goes stale within a quarter, which is why most model cards are archaeology rather than documentation."
          }
        },
        {
          "q": "How does this lesson close the module?",
          "a": "IT IS THE SEAM THE OTHER EIGHT DEPEND ON. Every lesson in this module identified a boundary where two correct components disagree silently, and proposed a check: parity assertions, data invariants, startup assertions, re-derivation, canaries, slice gates. EVERY ONE OF THOSE CHECKS IS ONLY REAL IF IT IS ENFORCED, and enforcement is a structural property — a check in CI is a gate, and the same check in a README is a suggestion. So this lesson is where the module's practices become durable rather than aspirational. THE THEME HOLDS HERE TOO: the failure at this seam is silent. A convention nobody follows does not raise an error; a check that was removed from CI to unblock a release does not announce itself; a notebook that produced a number nobody can reproduce fails only when someone tries, months later. AND THE STRONGEST MOVES ARE STRUCTURAL RATHER THAN PROCEDURAL — one implementation removes the skew seam rather than monitoring it, configuration-as-data removes the tracking gap rather than reminding people to log, a single entry point removes the local-versus-CI divergence. WHERE A STRUCTURAL FIX EXISTS, PREFER IT; where it does not, enforce the procedure in CI.",
          "deepDive": {
            "q": "What is the module's through-line, one final time?",
            "a": "It is worth stating the module's through-line one final time, because it is the most portable thing in it. In ordinary software, a violated contract between components usually raises — a type error, an exception, a failing test. In an ML system the components exchange arrays of numbers, so a violated contract produces different numbers, which flow onward and become a decision, and nothing raises. That single structural fact explains why ML systems need practices ordinary services do not: parity checks, data validation, drift monitoring, canaries comparing predictions, startup assertions. Each exists to convert a silent disagreement into a loud one at the seam where it occurs. It also gives a criterion for evaluating any proposed tool or practice in this space — does it make a silent failure audible, and at which seam? — which is more useful than a list of best practices, because it generalizes to seams that do not exist yet."
          }
        },
        {
          "q": "You inherit a project that is one large notebook. What do you do?",
          "a": "I'D ESTABLISH REPRODUCIBILITY BEFORE REFACTORING, because a refactor you cannot verify is a rewrite. FIRST, RUN IT TOP TO BOTTOM in a fresh kernel and see whether it produces the reported number — which frequently it does not, and that is the finding rather than an obstacle, since hidden state means the displayed results may have come from code that has since been edited. SECOND, PIN THE ENVIRONMENT with a lockfile and, if it will be relied on, a container, so the next person is not solving this again. THIRD, EXTRACT THE LOGIC INTO MODULES INCREMENTALLY, starting with the pieces the serving path will need — preprocessing and feature computation first, because those are the ones the skew seam runs through and the ones a serving implementation would otherwise duplicate. Move a function, import it back into the notebook, confirm the number is unchanged, repeat. THAT KEEPS THE NOTEBOOK WORKING THROUGHOUT, which is what makes the refactor safe. FOURTH, ADD THE CHEAP TESTS as the modules appear — data invariants and a serving-parity check on fixed inputs — so the extraction is verified rather than trusted. AND ONLY THEN the pipeline, config extraction and CI.",
          "deepDive": {
            "q": "Why does the ordering matter so much?",
            "a": "The ordering matters because the common failure is refactoring first and discovering afterwards that the numbers changed, with no way to tell whether the original was wrong, the refactor introduced a bug, or the environment moved. Establishing a reproducible baseline — even a bad one — gives you an invariant to refactor against, and the extract-import-verify loop keeps that invariant checkable at every step. It is the same discipline as characterization testing in legacy software: capture the current behaviour before changing it, whether or not the current behaviour is correct. The other practical note is to resist the temptation to fix modelling problems during the extraction. Doing both at once makes any change in the numbers ambiguous, and the extraction is much easier to review when it is behaviour-preserving by construction. Fix the structure, verify nothing moved, then fix the model — which is the same 'change one thing' principle the tracking lesson identified as the condition for a comparison to mean anything."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The last seam",
        "back": "Between PEOPLE. A parity check in one engineer's notebook is not a gate; a convention nobody follows is not a convention. Structure is how a practice survives its author and the week nobody has time."
      },
      {
        "type": "definition",
        "front": "The four notebook problems",
        "back": "Hidden state · unrecorded execution order · unreviewable diffs · **not importable**. The last is the expensive one: it forces the serving path to reimplement, which IS the skew seam."
      },
      {
        "type": "pitfall",
        "front": "Hidden state, precisely",
        "back": "A cell edited and not re-run means the displayed result was produced by code that no longer exists on screen — the tracking lesson's reproducibility failure, occurring inside a single session."
      },
      {
        "type": "intuition",
        "front": "★ The generating rule for the layout",
        "back": "Anything that must be REPRODUCED, REVIEWED, TESTED or AUTOMATED lives in `src/` and `configs/`. Anything exploratory lives in `notebooks/` and can be deleted without loss."
      },
      {
        "type": "intuition",
        "front": "Why configuration must be DATA",
        "back": "So a run is describable by a single versioned object — loggable, diffable, pinnable. Config as call arguments can't be that object. And config files are CODE: a threshold changed there is a behaviour change with no code change."
      },
      {
        "type": "intuition",
        "front": "★ Structural fixes beat procedural ones",
        "back": "One implementation with two callers REMOVES the skew seam rather than monitoring it. Config-as-data removes the tracking gap rather than reminding people to log. Prefer structural where available; enforce in CI where not."
      },
      {
        "type": "pitfall",
        "front": "The pipeline entry point",
        "back": "It must run IDENTICALLY locally and in CI. One that only runs in CI cannot be debugged; one that only runs locally is not a gate."
      },
      {
        "type": "definition",
        "front": "★ Ceremony scales with reliance",
        "back": "Exploration (lockfile + VCS) → a result others rely on (tracking, pinned env, smoke train) → serves traffic (full ladder) → **retrains automatically (strictest gates — highest frequency, lowest oversight)**."
      },
      {
        "type": "intuition",
        "front": "The symmetric failures",
        "back": "Exploratory work strangled by process, AND production work resting on someone's laptop. Naming the graduation point turns an argument about discipline into a question about a specific artifact."
      },
      {
        "type": "definition",
        "front": "The model card, written in WEEK ONE",
        "back": "What it predicts · what CONSUMES it (order or PROBABILITY) · the population it was evaluated on, per slice · what it must not do · **what would make you turn it off** · owners for the non-derivable choices."
      },
      {
        "type": "intuition",
        "front": "Why week one, not the end",
        "back": "A question you cannot answer in week one is usually the one the project should be organized around. \"We don't yet know if the consumer needs a probability\" IS a finding, and it puts the question in front of someone while the design is cheap."
      },
      {
        "type": "intuition",
        "front": "★ Inheriting one large notebook",
        "back": "Reproduce BEFORE refactoring — run it fresh and see if the number holds (often it doesn't; that's the finding). Pin the env. Then extract → import back → verify unchanged → repeat, preprocessing first. Don't fix modelling during extraction."
      }
    ],
    "refs": [
      {
        "title": "Sculley et al. (2015), Hidden Technical Debt in Machine Learning Systems",
        "url": "https://proceedings.neurips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html"
      },
      {
        "title": "Cookiecutter Data Science, A Logical, Standardized Project Structure",
        "url": "https://cookiecutter-data-science.drivendata.org/"
      },
      {
        "title": "Mitchell et al. (2019), Model Cards for Model Reporting",
        "url": "https://arxiv.org/abs/1810.03993"
      },
      {
        "title": "Feathers (2004), Working Effectively with Legacy Code",
        "url": "https://www.oreilly.com/library/view/working-effectively-with/0131177052/"
      },
      {
        "title": "Google, Rules of Machine Learning: Best Practices for ML Engineering",
        "url": "https://developers.google.com/machine-learning/guides/rules-of-ml"
      }
    ],
    "demos": [
      "cross-validation",
      "overfitting",
      "model-cascade",
      "canary-rollout"
    ]
  }
};
