// GENERATED from content/lessons/trustworthy-ai/distribution-shift.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/distribution-shift/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "distribution-shift": {
    "level": "core",
    "body": {
      "intuition": [
        "Drift detection is the most widely deployed trustworthy-AI machinery and the one whose guarantee is most consistently misread. A drift detector monitors P(x). Your alert is about accuracy. Those are different quantities, and they come apart in both directions.",
        "Measured on the same model: a covariate shift that moved ten of twenty input features by a full standard deviation produced a Bonferroni-corrected p-value of essentially zero with ten features flagged - a maximally loud alarm - while accuracy sat at 0.7446 against a baseline of 0.7506. Nothing was wrong. Then a concept shift that left P(x) EXACTLY unchanged and only flipped P(y|x) took accuracy to 0.3375, worse than chance, and every detector stayed quiet: minimum p-value 1.89e-02, zero features flagged, in every row.",
        "And it is not a tooling gap. On the concept shift the mean confidence was 0.7473 against a control's 0.7466, the prediction rate 0.5031 against 0.4938, a KS test on the predicted scores gave p = 0.911, and a domain classifier scored AUC 0.5223. EVERY UNLABELLED SIGNAL WAS BLIND, because the model saw exactly the inputs it was trained on and responded exactly as before. Only the labels moved, and labels are the only thing that can see it."
      ],
      "math": [
        {
          "h": "The three shifts, and which ones a monitor can see",
          "paras": [
            "Decomposing the joint tells you immediately what an input-only monitor can and cannot detect. Covariate shift changes the marginal on x; label shift changes the marginal on y; concept shift changes the conditional.",
            "Only the first is visible without labels, and it is the one least likely to hurt you."
          ],
          "tex": "P(x,y)=P(y\\mid x)P(x): \\quad \\text{covariate: } P(x)\\ \\text{moves} \\quad \\text{label: } P(y)\\ \\text{moves} \\quad \\text{concept: } P(y\\mid x)\\ \\text{moves}",
          "texNote": "Under pure covariate shift with a well-specified model, the optimal predictor is unchanged - which is exactly why the alarm fired on a harmless change. Concept shift changes the target function itself and is invisible in x."
        },
        {
          "h": "★ The detector fires when nothing is wrong",
          "paras": [
            "Two-sample KS per feature with Bonferroni correction, against a model whose baseline accuracy is 0.7506."
          ],
          "tex": "\\begin{array}{lrrl} \\text{shift} & \\text{accuracy} & \\text{Bonferroni } p & \\\\ 0.0 & 0.7437 & 6.5\\times10^{-1} & \\text{quiet}\\\\ 0.3 & 0.7429 & 3.2\\times10^{-156} & \\textbf{ALARM}\\\\ 0.6 & 0.7453 & 0.0 & \\textbf{ALARM}\\\\ 1.0 & 0.7446 & 0.0 & \\textbf{ALARM} \\end{array}",
          "texNote": "Ten of twenty features flagged, p-values underflowing to zero, and accuracy varying by less than one point across every row. The detector is correct about P(x) and irrelevant to the decision it triggers."
        },
        {
          "h": "★ And is silent when everything is",
          "paras": [
            "Concept shift with the input distribution held bit-for-bit identical to training."
          ],
          "tex": "\\begin{array}{lrrl} \\text{concept flip} & \\text{accuracy} & \\text{Bonferroni } p & \\\\ 0.00 & 0.7453 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 0.25 & 0.6642 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 0.50 & 0.5448 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 1.00 & \\mathbf{0.3375} & 3.8\\times10^{-1} & \\textbf{quiet} \\end{array}",
          "texNote": "The p-value is identical in every row because the inputs are drawn from the same distribution in every row. Accuracy falls below chance and no input-space statistic moves at all."
        }
      ],
      "code": [
        {
          "h": "Nothing unlabelled sees the concept shift",
          "paras": [
            "Four monitors people actually deploy, on the same three scenarios."
          ],
          "code": "#          scenario     true acc   mean conf   pred rate   KS(score)   dom-clf AUC\n#  no shift (control)     0.7460      0.7466      0.4938      4.3e-01      0.5177\n# covariate shift 1.0     0.7446      0.7492      0.4364     2.9e-38      0.9882\n# concept flip (P(x)      0.3375      0.7473      0.5031      9.1e-01      0.5223\n#   identical)            ^^^^^^      ^^^^^^      ^^^^^^      ^^^^^^^      ^^^^^^\n#                         BROKEN      normal      normal       quiet       chance\n\n# ★ The model is wrong on two-thirds of inputs and is EXACTLY as confident as\n#   before, predicts the same class balance, produces the same score\n#   distribution, and its inputs are indistinguishable from training.\n\n# This is INFORMATION-THEORETIC, not a gap in the tooling. Nothing computed\n# from x and f(x) can detect a change in P(y|x). A labelling budget is the\n# only answer, and it should be planned at design time.",
          "caption": "The covariate-shift column is the one every monitoring stack is built to catch, and it is the column where accuracy did not move."
        },
        {
          "h": "Drift dashboards are alarm generators by default",
          "paras": [
            "Per-feature testing with no correction, on data with no shift whatsoever."
          ],
          "code": "# A/A comparisons - IDENTICAL distributions - at raw alpha = 0.01\n#     10 features ->  0 flagged      Bonferroni min-p*d = 0.822  quiet\n#     50 features ->  0 flagged                           1.370  quiet\n#    200 features ->  1 flagged                           0.985  quiet\n#   1000 features ->  6 flagged                           0.135  quiet\n\n# ★ Uncorrected per-feature drift monitoring on a wide table produces a\n#   steady stream of true nulls. Teams learn to ignore the dashboard,\n#   which is the worst possible outcome for the one alarm that matters.\n\n# WHAT TO DO INSTEAD\n#   * correct for multiplicity, or monitor a single multivariate statistic\n#   * alert on EFFECT SIZE, not p-value - at production n everything is\n#     significant and almost nothing is important\n#   * tie the alert to a DECISION: which features feed which model, and\n#     what would you do differently if this fired?",
          "caption": "A p-value threshold on a wide feature table at production sample sizes is a random alarm generator with a schedule."
        }
      ],
      "useCases": [
        "Deciding when to retrain, where the honest trigger is a labelled performance estimate and the input monitor is at best a cheap early hint.",
        "Debugging a pipeline break - a feature that silently became null, a unit change, an upstream schema migration - which is what input monitoring is genuinely excellent at.",
        "Sizing a continuous labelling budget, since a few hundred labelled production cases a week bound accuracy far better than any unlabelled monitor.",
        "Validating a model before deployment in a new region or segment, where the shift is known in advance and the question is whether performance transfers."
      ],
      "pitfalls": [
        "Treating a drift alarm as a performance alarm. A maximal covariate-shift alarm accompanied accuracy of 0.7446 against a 0.7506 baseline - a difference of six tenths of a point.",
        "Treating drift silence as reassurance. Concept shift drove accuracy to 0.3375 with the detector's p-value identical to the no-shift case in every row.",
        "Believing a better unlabelled monitor exists for concept shift. Mean confidence, prediction rate, score distribution and a domain classifier were all at control values while accuracy collapsed.",
        "Running uncorrected per-feature tests on a wide table. Six of a thousand features flagged at alpha 0.01 on identical distributions, which trains everyone to ignore the dashboard.",
        "Alerting on p-values at production sample sizes, where every difference is significant and the question is whether it is large enough to matter.",
        "Assuming importance-weighting fixes covariate shift. It requires the support of the training distribution to cover the test distribution, and the effective sample size collapses exactly as it did for propensity weighting.",
        "Monitoring features nobody uses. Drift in a feature the model ignores is not a finding, and half of most drift dashboards is exactly this."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The guarantee that shift invalidates - coverage fell from 0.919 to 0.752 under shift with no observable symptom, the same blindness in another formalism."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why calibration decays first: the temperature was fitted to a distribution, and confidence degrades under some shifts before accuracy visibly does."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The labelling discipline that actually works - a small continuously-labelled random sample, which is the same recommendation as calibrating observational estimates against experiments."
        },
        {
          "ref": "trustworthy-ai/adversarial-robustness",
          "text": "The adversarial version of the same question, where the perturbation set is chosen by an attacker rather than by the world."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The production plumbing - what to log, how to sample, and where the labelled feedback loop attaches."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three shifts.",
          "a": "Covariate (P(x) moves), label (P(y) moves), concept (P(y|x) moves). Only the first is visible without labels."
        },
        {
          "q": "★ Give the covariate-shift result.",
          "a": "Ten of twenty features shifted by 1σ: Bonferroni p underflowed to 0, ten features flagged — and accuracy was 0.7446 vs a 0.7506 baseline."
        },
        {
          "q": "★ Give the concept-shift result.",
          "a": "P(x) held identical; accuracy 0.7453 → 0.6642 → 0.5448 → **0.3375**, and the detector's p-value was 3.8e-01 in EVERY row."
        },
        {
          "q": "Does mean confidence catch concept shift?",
          "a": "No. 0.7473 against a control's 0.7466. Prediction rate 0.5031 vs 0.4938, KS on scores p=0.911, domain-classifier AUC 0.5223 — all at control."
        },
        {
          "q": "Why is that not a tooling gap?",
          "a": "It's information-theoretic. Nothing computed from x and f(x) can see a change in P(y|x) — the model saw its training inputs and responded identically."
        },
        {
          "q": "So what detects concept shift?",
          "a": "Labels. A continuously-labelled random sample of production traffic is the only answer, and it should be planned at design time."
        },
        {
          "q": "Why is pure covariate shift often harmless?",
          "a": "With a well-specified model, P(y|x) is unchanged, so the optimal predictor is unchanged. Performance only moves if the model was wrong in the newly-visited region."
        },
        {
          "q": "What does uncorrected per-feature drift monitoring produce?",
          "a": "False alarms: 6 of 1000 features flagged at α=0.01 on IDENTICAL distributions. Teams then learn to ignore the dashboard."
        },
        {
          "q": "P-value or effect size for a drift alert?",
          "a": "Effect size. At production n everything is statistically significant and almost nothing is important."
        },
        {
          "q": "What is input monitoring genuinely good for?",
          "a": "Pipeline breaks — a feature silently null, a unit change, a schema migration. It's excellent at that and it's not a performance monitor."
        },
        {
          "q": "Does importance weighting fix covariate shift?",
          "a": "Only under support overlap, and the effective sample size collapses exactly as it did for propensity weighting in module 23."
        },
        {
          "q": "What's the first thing to prune from a drift dashboard?",
          "a": "Features the model doesn't use. Drift in an unused feature is not a finding, and it's half of most dashboards."
        }
      ],
      "standard": [
        {
          "q": "Explain the types of distribution shift and which ones you can monitor.",
          "a": "DECOMPOSE THE JOINT AND THE ANSWER FALLS OUT. P(x,y) = P(y|x)P(x). Covariate shift moves the marginal on x; label shift moves the marginal on y; concept shift moves the conditional. AN INPUT-ONLY MONITOR SEES EXACTLY ONE OF THEM, and it is the one least likely to hurt you — under pure covariate shift with a well-specified model, P(y|x) is unchanged, so the optimal predictor is unchanged and performance only degrades if the model was already wrong in the region newly being visited. THE MEASUREMENTS MAKE THIS UNCOMFORTABLE. Shifting ten of twenty features by a full standard deviation produced a Bonferroni-corrected p-value that underflowed to zero with ten features flagged — as loud as an alarm gets — while accuracy sat at 0.7446 against a baseline of 0.7506. Then a concept shift that left P(x) bit-for-bit identical and only flipped the conditional took accuracy to 0.3375, worse than chance, with the detector reporting a p-value of 3.8e-01 in every single row, identical to the no-shift control. THE DETECTOR FIRES WHEN NOTHING IS WRONG AND IS SILENT WHEN EVERYTHING IS, and both behaviours are correct, because it is answering a question about P(x) and being read as a question about accuracy.",
          "deepDive": {
            "q": "Which kind of shift can you actually correct cheaply?",
            "a": "Label shift deserves its own note because it is the case where cheap correction genuinely works. If P(y) moves but P(x|y) does not — a disease becomes more prevalent, fraud rates rise seasonally — then the classifier's outputs can be corrected with a confusion-matrix-based estimate of the new label marginal, via BBSE or similar, using only unlabelled data plus the original confusion matrix. That is a real result and it is worth knowing because it is the one shift with a free lunch. Covariate shift has importance weighting, which is the same machinery as inverse propensity weighting from module 23 and inherits the same failure: it requires the training support to cover the test support, and the effective sample size collapses when it does not — so the honest diagnostic is n_eff, exactly as it was there. Concept shift has nothing, and the reason is structural rather than technical. The practical framing I would give a team is that unlabelled monitoring is a cheap smoke detector for pipeline breaks, and a labelled sample is the fire alarm for performance; conflating them is how a model degrades for a quarter with a green dashboard."
          }
        },
        {
          "q": "Your drift dashboard is red. What do you do?",
          "a": "FIRST I ASK WHAT ACCURACY IS DOING, because the two are not the same question and the dashboard cannot answer the second. If there is a labelled sample, that ends the investigation in minutes. If there is not, that absence is the actual finding and I would fix it. SECOND I ASK WHICH FEATURES DRIFTED AND WHETHER THE MODEL USES THEM, since drift in an unused feature is not a finding and half of most dashboards is exactly that. THIRD I ASK WHETHER THIS IS A PIPELINE BREAK RATHER THAN A WORLD CHANGE — a feature silently going null, a unit change from cents to dollars, an upstream schema migration, a new client version writing a different default. Input monitoring is genuinely excellent at catching these, and it is the use case that justifies the dashboard. FOURTH I LOOK AT EFFECT SIZE RATHER THAN THE P-VALUE. At production sample sizes every difference is significant: in an A/A comparison with a thousand features and no shift at all, six flagged at alpha 0.01. If the alert is a p-value threshold on a wide table, it is a random alarm generator with a schedule, and the team has already learned to ignore it — which is the worst outcome, because the one alarm that matters will be ignored too.",
          "deepDive": {
            "q": "What design change stops a drift dashboard becoming noise?",
            "a": "The design fix worth pushing is to tie every alert to a decision before it is created: which model consumes this feature, what would you do differently if this fired, and who is on the hook. Alerts that fail that test should be demoted to a dashboard nobody is paged for. Beyond that, the single highest-value change is usually to monitor the model's OUTPUT distribution and its inputs separately, and to alert on the output only when it moves in a way the input distribution does not explain — that combination catches a class of problems neither catches alone. And I would push for a labelling budget in the same conversation, since a few hundred randomly-sampled production cases labelled per week bounds accuracy to a couple of points, costs less than the monitoring infrastructure, and answers the question everyone actually has. That recommendation is the same shape as the causal module's advice to calibrate observational estimates against experimental truth: a small amount of ground truth, collected continuously, beats a large amount of inference about ground truth."
          }
        },
        {
          "q": "How would you detect that a model's performance has degraded without labels?",
          "a": "YOU LARGELY CANNOT, AND THE HONEST ANSWER IS TO SAY SO AND THEN DESCRIBE THE PARTIAL MEASURES. I tested four monitors people deploy against a concept shift that took accuracy from 0.7460 to 0.3375. Mean confidence: 0.7473 against a control's 0.7466. Prediction rate: 0.5031 against 0.4938. A KS test on the predicted score distribution: p = 0.911. A domain classifier trying to separate training from production inputs: AUC 0.5223, chance. ALL FOUR AT CONTROL VALUES while the model was wrong on two-thirds of inputs — because the model saw exactly the inputs it was trained on and responded to them exactly as before. Only the labels moved. That is information-theoretic rather than a gap in the tooling. WHAT DOES PARTIALLY WORK: confidence and score-distribution monitoring catch some covariate shifts that DO hurt, particularly where the model is pushed into regions it is uncertain in, so they are worth having. Conformal set sizes are a better version of the same signal. Proxy metrics tied to downstream behaviour — click-through, escalation rate, user correction rate, appeal rate — are often the earliest real signal, because they are weak labels arriving for free. AND THE ANSWER THAT WORKS IS A LABELLING BUDGET, planned at design time.",
          "deepDive": {
            "q": "What is the most underused signal available here?",
            "a": "The proxy-metric point deserves elaboration because it is the most useful practical move and it is underused. Many systems have implicit labels arriving continuously: a user who edits the model's suggestion, a reviewer who overturns a decision, a customer who calls to complain, a retry, an abandonment. None is a clean label and all are cheap and high-volume, and their RATE is often a sharper degradation signal than any input statistic. The caution is that they are themselves subject to shift — a change in the UI changes the correction rate without any model change — so they need their own baseline. On the labelling side, the design detail that matters most is that the sample must be RANDOM. Labelling the cases the model was least confident about gives a biased and usually pessimistic estimate, and labelling the ones a human happened to review gives a selection-biased one, which is module 23's collider problem in a monitoring costume. A small uniform random sample beats a large convenience sample, and stratifying it by segment lets you catch the subgroup degradation that an aggregate number hides — which is this module's thesis applied to monitoring."
          }
        },
        {
          "q": "How do you decide when to retrain?",
          "a": "ON A LABELLED PERFORMANCE ESTIMATE CROSSING A THRESHOLD TIED TO A BUSINESS DECISION, not on a drift signal. The reason is the measurement above: drift and performance are different quantities that move independently, so a drift-triggered retrain fires on harmless covariate shift and misses concept shift entirely. IF LABELS ARE GENUINELY UNAVAILABLE, scheduled retraining on a fixed cadence is usually better than drift-triggered retraining, because it is predictable, it can be tested, and it does not create a feedback loop where noisy alarms drive model churn. The cadence should come from measured decay: retrain, hold out a time-forward window, and see how fast performance falls — that curve is the input, and it is worth measuring once properly. THERE ARE COSTS TO RETRAINING that get ignored in this conversation. Every retrain invalidates a calibration, a conformal calibration set, any fairness thresholds, and any monitoring baselines, so the retrain pipeline has to re-derive all of them or they silently become wrong. A retrained model can also be worse in a segment while better on average, which is the aggregation failure this module keeps returning to, so segment-level comparison should be a gate rather than a post-hoc check.",
          "deepDive": {
            "q": "Which hazard is invisible in offline evaluation?",
            "a": "The feedback-loop risk is worth a specific mention because it is a genuine hazard in production systems and it is invisible in offline evaluation. If the model's predictions influence which data you collect — who gets shown what, whose application gets reviewed, which transactions are approved — then retraining on production logs trains on a distribution the previous model created, and small biases compound across generations. That is a causal problem, not a drift problem: the logged data is confounded by the policy that generated it, which is exactly module 23's setting and the reason logged propensities and a permanent random holdout matter. The holdout serves double duty here — it gives unbiased training data and an unbiased performance estimate — which makes it easier to justify than either alone. The other practical guard is to compare a retrained model against the incumbent on a fixed frozen benchmark AND on fresh labelled production data, since the first catches regressions and the second catches the case where both models are fine on the old distribution and only one handles the new one."
          }
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE THESIS AT ITS MOST OPERATIONALLY EXPENSIVE, because this is the guarantee most teams have actually deployed. A drift detector reports, correctly and honestly, that the input distribution has changed. That statement is true. The alert routes to a page that says the model may be degraded, which is a different statement, and the two came apart in both directions in the same experiment: a maximal alarm at 0.7446 accuracy against a 0.7506 baseline, and total silence at 0.3375. OVER WHAT SET DOES THE GUARANTEE HOLD? Over P(x). Is that the set you care about? Almost never — you care about P(y|x) and about accuracy. WHAT MAKES THIS LESSON DIFFERENT from the others is that the gap is not closable. Conformal's marginal coverage can be made conditional with Mondrian partitioning. Calibration's aggregate can be split by subgroup. An attribution's baseline can be stated. Here, no unlabelled statistic can see concept shift, and I checked four of them. THE ONLY ANSWER IS TO BUY THE MISSING INFORMATION — a labelling budget — which makes this the module's clearest case of a limit you plan around rather than engineer away.",
          "deepDive": {
            "q": "Which of these gaps are reporting failures and which are information limits?",
            "a": "That distinction between closable and unclosable gaps is worth carrying, because it changes what the right response is. A closable gap — marginal versus conditional coverage, aggregate versus subgroup calibration — is a reporting failure, and the fix is discipline: compute the conditional version and state it. An unclosable gap is an information limit, and the fix is a different kind of investment: acquire the information, or accept and document the exposure. Confusing the two produces two characteristic errors. The first is building ever-more-elaborate unlabelled monitoring in the hope of catching concept shift, which cannot work and consumes the budget that labels would have used. The second is treating a closable gap as a fact of life and shipping the aggregate number when the per-slice number was three lines away. Sorting your guarantees into these two categories is a short exercise and it tends to reallocate effort immediately — in most monitoring stacks I would expect it to move money from dashboards to labelling, which is the least glamorous and highest-value change available."
          }
        },
        {
          "q": "What would you actually build for a production monitoring stack?",
          "a": "FOUR THINGS, IN THIS PRIORITY ORDER. FIRST, A CONTINUOUS RANDOM LABELLED SAMPLE. A few hundred uniformly-sampled production cases labelled per week bounds accuracy to a couple of points, catches concept shift, and is the only thing here that can. Stratify it by the segments your decisions partition on so subgroup degradation is visible, since an aggregate hides it. SECOND, PIPELINE INTEGRITY MONITORING, which is what input monitoring is genuinely excellent at: null rates, cardinality, range violations, schema changes, unit changes, freshness. These fire on real bugs, they have low false-positive rates when written as invariants rather than as statistical tests, and they catch the failures that do the most damage fastest. THIRD, OUTPUT AND CONFIDENCE MONITORING with effect-size thresholds and multiplicity control — score distribution, prediction rate, conformal set size — as a cheap early hint that is explicitly not a performance metric. FOURTH, PROXY OUTCOME METRICS: correction rate, escalation rate, appeal rate, retry rate. These are weak labels arriving free and continuously, and they are frequently the earliest real signal of degradation.",
          "deepDive": {
            "q": "What would you deliberately not build first?",
            "a": "The thing I would deliberately NOT build first is a per-feature statistical drift dashboard over a wide table, which is what most stacks start with. On identical distributions with a thousand features, six flagged at alpha 0.01, so it generates a steady stream of true nulls, and the organisational cost is that people learn the dashboard is noise. If it exists, it needs multiplicity correction, effect-size thresholds rather than p-values, restriction to features the model actually uses, and an owner for each alert with a documented action. The other thing worth building early and cheaply is a re-derivation step in the retrain pipeline: every retrain must recompute the temperature, the conformal calibration set, any fairness thresholds, and the monitoring baselines, because all four are properties of the model-plus-distribution pair and all four silently become wrong otherwise. That is a half-day of work that prevents a category of failure which is very hard to diagnose later, since the symptom appears weeks after the cause and looks like drift."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The three shifts",
        "back": "P(x,y) = P(y|x)P(x). COVARIATE: P(x) moves. LABEL: P(y) moves. CONCEPT: P(y|x) moves. Only covariate shift is visible without labels — and it's the one least likely to hurt."
      },
      {
        "type": "pitfall",
        "front": "★ The detector fires when nothing is wrong",
        "back": "Ten of 20 features shifted 1σ → Bonferroni p underflowed to **0**, 10 features flagged. Accuracy: **0.7446** vs a 0.7506 baseline. A maximal alarm about a six-tenths-of-a-point change."
      },
      {
        "type": "pitfall",
        "front": "★ …and is silent when everything is",
        "back": "Concept shift, P(x) held IDENTICAL: accuracy 0.7453 → 0.6642 → 0.5448 → **0.3375** (below chance). Detector p-value **3.8e-01 in every row** — same as the no-shift control."
      },
      {
        "type": "pitfall",
        "front": "★ No unlabelled monitor sees concept shift",
        "back": "At accuracy 0.3375: mean confidence 0.7473 (control 0.7466), pred rate 0.5031 (0.4938), KS on scores p=0.911, domain-clf AUC 0.5223. All at control. The model saw its training inputs and responded identically."
      },
      {
        "type": "intuition",
        "front": "Why is that not a tooling gap?",
        "back": "It's information-theoretic. Nothing computed from x and f(x) can detect a change in P(y|x). A labelling budget is the only answer — plan it at design time."
      },
      {
        "type": "intuition",
        "front": "Why is pure covariate shift often harmless?",
        "back": "With a well-specified model P(y|x) is unchanged, so the OPTIMAL predictor is unchanged. Performance only degrades if the model was already wrong in the newly-visited region."
      },
      {
        "type": "definition",
        "front": "Label shift — the one free lunch",
        "back": "If P(y) moves but P(x|y) doesn't, you can correct outputs from UNLABELLED data plus the original confusion matrix (BBSE). Covariate shift has importance weighting (needs support overlap; n_eff collapses). Concept shift has nothing."
      },
      {
        "type": "pitfall",
        "front": "Drift dashboards as alarm generators",
        "back": "A/A comparisons, IDENTICAL distributions, α=0.01: 1000 features → **6 flagged**. Teams learn the dashboard is noise — so the one alarm that matters gets ignored too."
      },
      {
        "type": "intuition",
        "front": "P-value or effect size?",
        "back": "Effect size. At production n everything is statistically significant and almost nothing is important. And prune features the model doesn't use — that's half of most dashboards."
      },
      {
        "type": "intuition",
        "front": "What input monitoring IS good for",
        "back": "Pipeline breaks: a feature silently null, cents→dollars, a schema migration, a new client default. Write them as INVARIANTS, not statistical tests — low false-positive rate, fastest-damaging failures."
      },
      {
        "type": "pitfall",
        "front": "The labelled sample must be RANDOM",
        "back": "Labelling low-confidence cases gives a biased (pessimistic) estimate; labelling human-reviewed cases is selection-biased — module 23's collider problem in monitoring costume. Small uniform sample > large convenience sample."
      },
      {
        "type": "intuition",
        "front": "★ Closable vs unclosable gaps",
        "back": "Marginal→conditional coverage, aggregate→subgroup calibration: CLOSABLE, so it's a reporting failure, fix with discipline. Concept shift: UNCLOSABLE, an information limit — buy the information or document the exposure. Confusing them misallocates the whole budget."
      }
    ],
    "refs": [
      {
        "title": "Quinonero-Candela, Sugiyama, Schwaighofer & Lawrence (2009), Dataset Shift in Machine Learning",
        "url": "https://mitpress.mit.edu/9780262170055/dataset-shift-in-machine-learning/"
      },
      {
        "title": "Lipton, Wang & Smola (2018), Detecting and Correcting for Label Shift with Black Box Predictors (BBSE)",
        "url": "https://arxiv.org/abs/1802.03916"
      },
      {
        "title": "Rabanser, Gunnemann & Lipton (2019), Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift",
        "url": "https://arxiv.org/abs/1810.11953"
      },
      {
        "title": "Koh et al. (2021), WILDS: A Benchmark of in-the-Wild Distribution Shifts",
        "url": "https://arxiv.org/abs/2012.07421"
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
      "active-learning"
    ],
    "demoTitles": {
      "drift-detection": "Data Drift Detection",
      "calibration": "Model Calibration",
      "conformal": "Conformal Prediction",
      "active-learning": "Active Learning"
    }
  }
};
