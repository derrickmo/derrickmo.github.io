// GENERATED from content/lessons/causal-inference/uplift-modeling.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/uplift-modeling/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "uplift-modeling": {
    "level": "core",
    "body": {
      "intuition": [
        "A response model answers 'who will convert'. A campaign needs 'who will convert BECAUSE OF US'. Those are different questions, and the gap between them is the entire subject. Every user falls into one of four boxes: SURE THINGS convert either way, LOST CAUSES convert neither way, PERSUADABLES convert only if treated, and SLEEPING DOGS convert only if left alone. A campaign creates value on exactly one of the four.",
        "The trap is that a response model is far better at its own task and much worse at the job. In simulation the response model scored AUC 0.895 on the outcome and the uplift score scored 0.513 - barely above chance. Targeting the top 10% by response earned 72 incremental conversions; targeting the top 10% by uplift earned 893. TWELVE TIMES MORE, from the model that looks worthless by the usual metric.",
        "The reason is visible in who each model picks. The response model's top decile was 100% sure things - people who were going to convert anyway, so the campaign paid for conversions it already had. The uplift model's top decile was 99% persuadables. And sleeping dogs, 10% of users at -0.15 each, destroyed 543 conversions inside a blanket campaign, which is why treating everyone is not the safe default."
      ],
      "math": [
        {
          "h": "The target is a difference of conditional expectations",
          "paras": [
            "Uplift is the conditional average treatment effect. Neither term is ever observed for the same unit, so unlike ordinary supervised learning there is no per-row label - the quantity being modelled has no ground truth at the individual level.",
            "That single fact drives every design decision in this lesson: the estimators, the metrics, and why validation is awkward."
          ],
          "tex": "\\tau(x)=\\mathbb{E}[Y(1)-Y(0)\\mid X{=}x]=\\underbrace{\\mathbb{E}[Y\\mid X{=}x,T{=}1]}_{\\text{estimable}}-\\underbrace{\\mathbb{E}[Y\\mid X{=}x,T{=}0]}_{\\text{estimable}}",
          "texNote": "Both halves are estimable under randomization, and their difference is what you want - but the difference is typically far smaller than either term, so a model with excellent accuracy on each can be useless on the gap. Signal-to-noise, not capacity, is the binding constraint."
        },
        {
          "h": "Predictive quality and business value come apart completely",
          "paras": [
            "The response model dominates on the prediction task and loses by an order of magnitude on the task that pays."
          ],
          "tex": "\\mathrm{AUC}_{\\text{response}}=0.895 \\gg \\mathrm{AUC}_{\\text{uplift}}=0.513, \\qquad \\text{incremental@10\\%}: \\ 72 \\ \\text{vs} \\ \\mathbf{893} \\ (12.4\\times)",
          "texNote": "The uplift score is nearly uninformative about WHO CONVERTS and nearly perfect about WHO IS MOVED. Ranking a validation set by AUC on the outcome would select the wrong model every single time."
        },
        {
          "h": "Treating fewer people can beat treating everyone",
          "paras": [
            "With sleeping dogs present, the blanket campaign is not the upper bound. It is beaten on effectiveness and on cost simultaneously."
          ],
          "tex": "\\text{treat all}: 1600 \\ \\text{conversions at } 100\\% \\text{ cost} \\qquad \\text{treat top } 30\\% \\text{ by uplift}: \\mathbf{1854} \\ \\text{at } 30\\% \\text{ cost}",
          "texNote": "Sleeping dogs were 10% of the population with an uplift of -0.150 each, destroying 543 conversions inside the blanket campaign. Excluding them is worth more than the entire budget saving."
        }
      ],
      "code": [
        {
          "h": "Who each model actually selects",
          "paras": [
            "Same features, same training data, same algorithm. Only the target differs."
          ],
          "code": "# response model:  fit Y ~ X          (T ignored entirely)\n# two-model uplift: fit Y ~ X | T=1  and  Y ~ X | T=0, take the difference\n\n# TOP 10% SELECTED BY EACH MODEL\n#   response: sure_thing 100%   persuadable  0%\n#   uplift  : sure_thing   0%   persuadable 99%\n\n# TRUE INCREMENTAL CONVERSIONS EARNED\n#   target   by RESPONSE          by UPLIFT       ratio\n#     5%      36 (+0.020/user)    445 (+0.247)    12.4x\n#    10%      72 (+0.020/user)    893 (+0.248)    12.4x\n#    20%     144 (+0.020/user)   1764 (+0.245)    12.3x\n#    50%    1279 (+0.071/user)   1948 (+0.108)     1.5x\n#   ALL     1600 (+0.044/user)\n\n# ★ The response model's per-user uplift is FLAT at +0.020 across the top\n#   20% - it is sorting by 'converts anyway', which carries no information\n#   about being moved.",
          "caption": "The response model is not slightly worse at targeting. It is sorting on a quantity that is close to orthogonal to the one that matters."
        },
        {
          "h": "Estimators, and the validation problem",
          "paras": [
            "There is no per-row uplift label, so every metric is computed on GROUPS, and the noise is correspondingly worse."
          ],
          "code": "# THREE STANDARD ESTIMATORS\n# T-learner   two models, subtract         simple; errors of two models add\n# S-learner   one model with T as feature  can drop T entirely if it is weak\n# X-learner   impute counterfactuals,      better with very unbalanced arms\n#             then model the imputed effect\n# ...plus causal forests / DR-learner, which target tau(x) directly\n\n# METRICS - all group-based, none per-row\n#   uplift curve   incremental outcome vs fraction targeted\n#   Qini           area between that curve and the random line\n#   AUUC           area under the uplift curve\n\n# ★ NEVER select an uplift model by AUC on Y. In this run that metric\n#   ranked the response model 0.895 against the uplift model's 0.513,\n#   and the 0.513 model earned 12.4x more.",
          "caption": "The metric has to be built from the treated-versus-control contrast within each ranked bucket, which is why uplift validation needs a randomized holdout and a lot of it."
        }
      ],
      "useCases": [
        "Retention and win-back campaigns, where sleeping dogs are real - a 'we miss you' email reminds a dormant user that a subscription exists and can trigger the cancellation.",
        "Discount and promotion targeting, where sure things are the dominant cost: the margin lost on people who would have bought anyway is usually the largest line in the campaign.",
        "Notification and email volume decisions, where the counterfactual is a quieter product and the negative-uplift segment is anyone close to muting you.",
        "Medical and operational triage, where the question is who benefits from an intervention rather than who is at risk - the same distinction between prognosis and treatment effect."
      ],
      "pitfalls": [
        "Shipping a response model as a targeting model. Its top decile was 100% sure things and earned 72 incremental conversions where the uplift model earned 893.",
        "Selecting an uplift model by AUC on the outcome. That metric preferred the response model 0.895 to 0.513, and the 0.513 model was worth twelve times more.",
        "Assuming treating everyone is the safe upper bound. Sleeping dogs at 10% of users and -0.150 each destroyed 543 conversions; targeting 30% beat targeting 100% on both effect and cost.",
        "Building uplift models on observational data. The two arms differ by selection, so the fitted difference is confounding plus effect - uplift needs a randomized training set, not just a large one.",
        "Underestimating the sample size required. You are modelling a difference much smaller than either term, so uplift needs far more data than a response model of similar complexity.",
        "Evaluating on the treated group only. Every uplift metric is a treated-versus-control contrast within a ranked bucket, so a permanent randomized holdout is infrastructure, not a nicety.",
        "Using an S-learner with a weak treatment signal. Regularization can drop the treatment feature entirely, producing a model that predicts zero uplift everywhere and looks stable while doing so."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Uplift is CATE - a conditional version of the same estimand - which is why it inherits the fundamental problem and has no per-row label."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Where the randomized training data comes from, and why a permanent holdout is what makes uplift modelling possible at all."
        },
        {
          "ref": "causal-inference/propensity-matching",
          "text": "What you are forced into when the training data is not randomized, and why the resulting uplift estimates inherit every ignorability concern."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general lesson in its home context: a metric that scores the model's stated task can be anti-correlated with the decision the model is deployed to make."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The sequential version of the same targeting problem, where exploration keeps the counterfactual estimable instead of requiring a separate holdout."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does an uplift model predict?",
          "a": "CATE: τ(x) = E[Y(1) − Y(0) | X=x]. The effect of treating a unit, not the probability the unit converts."
        },
        {
          "q": "Name the four segments.",
          "a": "Sure things (convert either way), lost causes (neither way), persuadables (only if treated), sleeping dogs (only if left alone)."
        },
        {
          "q": "Which segment creates value?",
          "a": "Persuadables only. Sure things cost margin for conversions you already had; sleeping dogs are actively harmed."
        },
        {
          "q": "Why can't you train uplift like ordinary supervised learning?",
          "a": "There is no per-row label — τ(x) is a difference of two quantities that are never both observed for the same unit."
        },
        {
          "q": "Give the headline numbers from the simulation.",
          "a": "Response model AUC 0.895 vs uplift 0.513; top-10% incremental conversions 72 vs 893 — 12.4× from the model that looks worthless."
        },
        {
          "q": "Who did each model's top decile contain?",
          "a": "Response: 100% sure things. Uplift: 99% persuadables. Same features, same algorithm, different target."
        },
        {
          "q": "Can targeting fewer users beat targeting everyone?",
          "a": "Yes. Top 30% by uplift earned 1,854 vs 1,600 for the blanket campaign — more conversions at 30% of the cost."
        },
        {
          "q": "What are sleeping dogs worth?",
          "a": "In the sim: 10% of users at −0.150 each, destroying 543 conversions inside a blanket campaign."
        },
        {
          "q": "Name three uplift estimators.",
          "a": "T-learner (two models, subtract), S-learner (one model with T as a feature), X-learner (impute counterfactuals, then model the imputed effect)."
        },
        {
          "q": "What is the S-learner's characteristic failure?",
          "a": "Regularization drops the weak treatment feature, so the model predicts zero uplift everywhere — and looks stable while doing it."
        },
        {
          "q": "Name the standard uplift metrics.",
          "a": "Uplift curve, Qini coefficient, AUUC. All group-based treated-vs-control contrasts within ranked buckets — never per-row."
        },
        {
          "q": "Can you train uplift on observational data?",
          "a": "Only under ignorability. Otherwise the fitted arm difference is confounding plus effect, and no amount of data separates them."
        }
      ],
      "standard": [
        {
          "q": "Explain uplift modeling and why a response model is the wrong tool for targeting.",
          "a": "UPLIFT MODELS THE EFFECT OF TREATING SOMEONE; A RESPONSE MODEL MODELS WHETHER THEY CONVERT. Formally uplift is CATE, τ(x) = E[Y(1) − Y(0) | X = x], and the useful mental model is four segments: sure things convert either way, lost causes convert neither way, persuadables convert only if treated, and sleeping dogs convert only if left alone. A campaign creates value on persuadables, wastes margin on sure things, wastes budget on lost causes, and does active harm to sleeping dogs. A RESPONSE MODEL RANKS BY P(CONVERT), WHICH SORTS SURE THINGS TO THE TOP — precisely the people who needed nothing. In simulation the response model's top decile was 100% sure things and earned 72 incremental conversions; the uplift model's top decile was 99% persuadables and earned 893, a factor of 12.4. And the response model's per-user uplift was FLAT at +0.020 across the entire top 20%, which is the tell: it is sorting on a quantity carrying essentially no information about being moved. THE UNCOMFORTABLE PART is that by ordinary metrics the response model is far better — AUC 0.895 against 0.513, barely above chance. Selecting between the two on held-out AUC picks the wrong one every time.",
          "deepDive": {
            "q": "Why is uplift hard rather than merely counterintuitive?",
            "a": "The reason this is hard rather than merely counterintuitive is signal-to-noise. Both conditional expectations are estimable under randomization, and each can be modelled accurately, but their DIFFERENCE is typically much smaller than either term — so a pair of models with excellent individual accuracy can produce a difference that is mostly noise. That is why uplift needs far more data than a response model of comparable complexity, and why the discipline's estimators are all about controlling that noise rather than about capacity. The T-learner fits each arm separately and subtracts, which is simple and lets the two models' errors add. The S-learner uses one model with treatment as a feature, which shares statistical strength but risks regularizing the treatment feature away entirely when the effect is weak — producing a model that confidently predicts zero uplift everywhere. The X-learner imputes counterfactual outcomes and then models the imputed effect, which helps a lot when the arms are very unbalanced in size. Causal forests and DR-learners target τ(x) directly with orthogonalization, and are the modern default when there is enough randomized data to support them."
          }
        },
        {
          "q": "How do you evaluate an uplift model when there is no ground-truth label?",
          "a": "YOU EVALUATE ON GROUPS, BECAUSE NO INDIVIDUAL LABEL EXISTS. The standard construction is the uplift curve: rank the holdout by predicted uplift, then for each prefix of that ranking compute the difference in outcome rate between treated and control units WITHIN the prefix, scaled to the population. A good model puts a steep rise at the left. The Qini coefficient is the area between that curve and the random-targeting diagonal, and AUUC is the area under the curve itself. All three share the same requirement: a randomized holdout, with both arms present at every level of the ranking, because every point on the curve is a treated-versus-control contrast. THAT MAKES A PERMANENT HOLDOUT INFRASTRUCTURE RATHER THAN A COURTESY — without it there is no way to evaluate the model at all, and it is not recoverable after the fact. THE FAILURE MODE TO NAME EXPLICITLY is evaluating with the outcome metric out of habit. In the simulation AUC on Y ranked the response model 0.895 against the uplift model's 0.513, and the 0.513 model was worth twelve times more in incremental conversions. Any automated model selection driven by predictive loss — a sweep, an AutoML run, a leaderboard — will reliably pick the worse targeting model.",
          "deepDive": {
            "q": "How much should you trust a comparison of Qini coefficients?",
            "a": "Two practical cautions. First, uplift curves are NOISY, much more so than ROC curves, because each point is a difference of two rates within a bucket rather than a count. Bucket-level confidence bands are essential, and it is common for two candidate models' Qini coefficients to be statistically indistinguishable on any realistic holdout — in which case the honest report is that you cannot tell them apart, not that the higher number wins. Second, the curve answers 'how good is this ranking' but the deployment question is usually 'what fraction should we treat', and the answer to that depends on cost, not on the curve's shape alone. The right object is a net-value curve with the per-treatment cost subtracted, whose maximum gives the treatment fraction. In the simulation the raw uplift curve keeps rising slowly past 30%, but with any nonzero contact cost the optimum lands well left of that. Worth adding that the sleeping-dog structure makes this non-monotonic in a way people find surprising: the total is not maximized at 100%, so even a free campaign has an interior optimum."
          }
        },
        {
          "q": "A retention team wants to email every dormant user. What is your concern?",
          "a": "SLEEPING DOGS, AND THEY ARE ESPECIALLY LIKELY IN THIS EXACT CAMPAIGN. A 'we miss you' email to a dormant subscriber reminds them that a subscription exists and gives them a convenient link back into the product — which is also a convenient link to the cancellation page. The segment with negative uplift is not hypothetical here; it is the mechanism of the campaign working in reverse. In the simulation sleeping dogs were 10% of the population at −0.150 each, and they destroyed 543 conversions inside the blanket campaign. THE CONSEQUENCE IS THAT TREATING EVERYONE IS NOT THE UPPER BOUND, which is the assumption behind 'email everyone, it can only help'. Targeting the top 30% by uplift earned 1,854 against the blanket campaign's 1,600 — MORE total conversions at 30% of the cost. So the safe-sounding default was beaten on both axes simultaneously. WHAT I WOULD PROPOSE is a randomized holdout on the first send, which costs almost nothing and is the only way to learn any of this; measure the effect by segment, specifically looking for segments where the effect is negative rather than just small; and then build an uplift model on that randomized data and suppress the negative tail. The first campaign is the training set, and treating it that way costs one round of delay.",
          "deepDive": {
            "q": "What usually blocks this inside an organisation?",
            "a": "There is an organisational obstacle worth anticipating, because the technical answer usually is not the hard part. Campaign teams are measured on conversions among the treated, and that metric goes UP when you target sure things and goes DOWN when you suppress them, so the incentive points at exactly the wrong model. Changing the metric to incremental conversions against a holdout is the actual intervention, and it is a reporting change rather than a modelling one. The second thing worth raising is that negative uplift is frequently invisible in aggregate: if sleeping dogs are 10% at −0.15 and persuadables are 20% at +0.25, the blanket average is positive, the campaign is declared a success, and nobody looks further. Only a segmented analysis against a holdout surfaces the harm. That pattern generalises well beyond email — push notification volume, upsell prompts, and re-engagement flows all have a segment for whom the intervention is the thing that reminds them to leave, and aggregate lift will hide it every time."
          }
        },
        {
          "q": "Can you build an uplift model from observational data?",
          "a": "ONLY UNDER IGNORABILITY, AND THE PROBLEM IS WORSE HERE THAN FOR AN AVERAGE EFFECT. The mechanics do not object: fit one model on the treated rows, another on the untreated rows, subtract. But the difference between arms is then confounding plus effect, and since uplift models are estimating a small difference between two much larger quantities, a confounding term that is modest relative to the outcome can be large relative to the effect. AND IT VARIES BY X, which is the specific danger for targeting: the model does not just get the level wrong, it learns a RANKING driven by where selection is strongest. Since the users most likely to have selected into treatment are usually the most engaged — the sure things — an observational uplift model tends to rank exactly the wrong people to the top, reproducing the response-model failure while wearing causal language. IF I HAD NO CHOICE, I would use a doubly robust or DR-learner approach with a propensity model, restrict to the region of common support, and validate against whatever randomized data exists even if it is small and old. And I would report it as a hypothesis generator rather than a targeting policy, with a plan to randomize the first deployment so the model's own ranking gets tested.",
          "deepDive": {
            "q": "Is there a middle path short of a fully randomized campaign?",
            "a": "There is a cheap and underused middle path: partial randomization. You do not need a fully randomized campaign to learn uplift — a small random holdout plus a small random treated group carved out of the observational population is enough to estimate uplift in the overlap region and, critically, to CALIBRATE the observational model against experimental truth. Comparing the observational uplift ranking to the experimental one on that slice tells you how much to trust the rest, and in most consumer systems the answer is sobering. The other thing worth knowing is that logged propensities transform this problem completely: if the treatment decision was made by a model or a rule whose probabilities were recorded, you have a known assignment mechanism rather than an estimated one, and ignorability holds by construction rather than by assumption. That is a strong argument for building any targeting system with epsilon-randomization and propensity logging from day one — it is a small cost at build time and it is the difference between being able to answer counterfactual questions later and not."
          }
        },
        {
          "q": "How much data does an uplift model need relative to a response model?",
          "a": "SUBSTANTIALLY MORE, AND THE REASON IS STRUCTURAL RATHER THAN INCIDENTAL. You are estimating a difference between two conditional expectations that is typically much smaller than either. If the baseline rate is 0.30 and the effect is 0.02, both arm models can be estimated to a few percent relative error and their difference is still mostly noise — the errors of the two models do not cancel, they add. The variance of a difference of independent estimates is the sum of variances, so the standard error on τ(x) is larger than on either term, while the quantity itself is an order of magnitude smaller. SO THE PRACTICAL RULE IS THAT SAMPLE SIZE SCALES WITH THE INVERSE SQUARE OF THE EFFECT SIZE, exactly as it does for experiment power, but now you need it WITHIN each region of covariate space where you want a distinct prediction. That is what makes fine-grained personalization of treatment expensive: every extra split of the feature space divides the data supporting each estimate. THE TWO LEVERS THAT ACTUALLY HELP are reducing outcome variance — use a pre-period covariate as a control, or CUPED-style adjustment — and constraining the model to fewer, coarser segments, which is often where the value is anyway. A model that reliably separates three segments beats a per-user score that is noise.",
          "deepDive": {
            "q": "Why prefer coarse segments, when that sounds like giving up?",
            "a": "The advice to prefer coarse segments deserves defending, since it sounds like giving up. In the simulation the entire value came from separating persuadables from sure things — a single binary distinction — and any model that finds it captures nearly all the available gain, with 12.4× at the top decile and 12.3× at the top 20%. The curve is remarkably flat across that range, meaning the fine ordering within the persuadable group barely matters. That is typical: uplift structure tends to be coarse in practice, driven by a few interpretable segments, and the marginal value of a highly personalized score over a good three-bucket rule is usually small and expensive. Tree-based uplift methods lean into this by splitting directly on the difference between arms rather than on outcome purity, which both regularizes toward coarse structure and produces something a marketing team can read. The other practical point is that uplift models degrade faster than response models, because the effect can shift when the creative, the price or the competitive context changes even if the baseline conversion behaviour does not — so the holdout is needed continuously, not once."
          }
        },
        {
          "q": "What is the transferable lesson here beyond marketing?",
          "a": "A METRIC THAT SCORES THE MODEL'S STATED TASK CAN BE ANTI-CORRELATED WITH THE DECISION IT IS DEPLOYED TO MAKE. Here the gap is unusually stark and measurable: AUC 0.895 versus 0.513 on the prediction task, 72 versus 893 incremental conversions on the decision. The model that loses by 0.38 of AUC wins by 12.4×. The reason generalises — the deployed system is choosing an ACTION, and the value of an action is a difference between what happens with it and without it, which is not what a predictive score measures. THE SAME STRUCTURE APPEARS EVERYWHERE ONCE YOU LOOK. A recommender optimized for click probability recommends items the user would have found anyway, and its incremental value is much smaller than its offline metric implies. A churn model ranks people likely to leave, most of whom cannot be saved, when the actionable question is who can be. A fraud model scores likelihood rather than the effect of intervening, and blocking a transaction has its own costs on the other side. A medical risk score identifies prognosis rather than who benefits from treatment. IN EACH CASE THE FIX IS THE SAME SHAPE: define the decision, write the counterfactual comparison it implies, and build the metric from that — which almost always means a randomized holdout, because the counterfactual has to come from somewhere.",
          "deepDive": {
            "q": "What does the existence of a negative segment change?",
            "a": "There is a second, subtler transfer worth naming: the presence of a NEGATIVE segment. Most predictive framings implicitly assume the intervention is weakly helpful, so more of it is safe and the only question is budget. Sleeping dogs break that, and the consequence is not a smaller optimum but a qualitatively different one — treating 30% beat treating 100% on effect AND on cost, so the blanket policy was not even on the efficient frontier. Once you know to look for the negative segment you find it in a lot of systems: notifications that trigger muting, upsell prompts that trigger cancellation, security warnings that train users to dismiss warnings, aggressive fraud blocks that drive good customers away. Aggregate lift hides all of them, because a positive average is entirely compatible with a harmed minority, and the harmed minority is often the segment you least want to harm. So the operational habit is to look at the effect DISTRIBUTION across segments rather than its mean, and to treat a negative segment as a finding rather than as noise until a holdout says otherwise. That habit is the same one this module has been building throughout — ask what comparison the number came from, and what it would look like if the comfortable assumption were false."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ The four segments",
        "back": "Sure things (convert either way), lost causes (neither), persuadables (only if treated), sleeping dogs (only if LEFT ALONE). A campaign creates value on persuadables only."
      },
      {
        "type": "formula",
        "front": "Uplift = CATE",
        "back": "τ(x) = E[Y(1)−Y(0) | X=x]. Both halves estimable under randomization; the DIFFERENCE is far smaller than either term, so accurate arm models still give a noisy gap."
      },
      {
        "type": "pitfall",
        "front": "★ AUC 0.895 loses to AUC 0.513",
        "back": "Response model AUC 0.895 on Y; uplift score 0.513 (near chance). Top-10% incremental conversions: 72 vs 893 — 12.4×. Selecting by held-out AUC picks the wrong model every time."
      },
      {
        "type": "intuition",
        "front": "Who does each model pick?",
        "back": "Response top decile: 100% sure things (+0.020/user, FLAT across the top 20% — the tell). Uplift top decile: 99% persuadables (+0.248/user). Same features, same algorithm, different target."
      },
      {
        "type": "pitfall",
        "front": "★ Treating everyone is not the upper bound",
        "back": "Blanket campaign: 1,600 conversions at 100% cost. Top 30% by uplift: 1,854 at 30% cost. Sleeping dogs (10% of users, −0.150 each) destroyed 543 conversions inside the blanket."
      },
      {
        "type": "definition",
        "front": "T- / S- / X-learner",
        "back": "T: two arm models, subtract (errors ADD). S: one model with T as a feature (regularization can drop T → zero uplift everywhere). X: impute counterfactuals then model the imputed effect (good for unbalanced arms)."
      },
      {
        "type": "definition",
        "front": "Uplift metrics",
        "back": "Uplift curve (incremental outcome vs fraction targeted), Qini (area vs the random line), AUUC. All are treated-vs-control contrasts within ranked buckets — group-level, never per-row."
      },
      {
        "type": "pitfall",
        "front": "Why is a randomized holdout infrastructure?",
        "back": "Every point on an uplift curve needs BOTH arms present at that level of the ranking. Without a permanent holdout the model cannot be evaluated at all — and it is not recoverable after the fact."
      },
      {
        "type": "pitfall",
        "front": "Uplift on observational data",
        "back": "The arm difference = confounding + effect, and confounding VARIES BY X. Selection is strongest among the engaged — the sure things — so it ranks exactly the wrong users, in causal language."
      },
      {
        "type": "intuition",
        "front": "Why uplift needs more data",
        "back": "Variance of a difference ADDS while the quantity shrinks. n scales with 1/effect² WITHIN each region of feature space. Levers: variance reduction (CUPED, pre-period covariates) and coarser segments."
      },
      {
        "type": "intuition",
        "front": "Prefer coarse segments",
        "back": "The gain was 12.4× at top-10% and 12.3× at top-20% — nearly FLAT. All the value came from one binary distinction. Fine ordering within persuadables barely mattered."
      },
      {
        "type": "intuition",
        "front": "★ The transferable lesson",
        "back": "A metric scoring the model's stated task can be ANTI-correlated with the decision it's deployed for. Same shape in recommenders (would-have-clicked), churn (can't be saved), fraud, medical risk. Build the metric from the counterfactual the DECISION implies."
      }
    ],
    "refs": [
      {
        "title": "Radcliffe & Surry (2011), Real-World Uplift Modelling with Significance-Based Uplift Trees",
        "url": "https://www.stochasticsolutions.com/pdf/sig-based-up-trees.pdf"
      },
      {
        "title": "Gutierrez & Gerardy (2017), Causal Inference and Uplift Modelling: A Review of the Literature",
        "url": "https://proceedings.mlr.press/v67/gutierrez17a.html"
      },
      {
        "title": "Kunzel, Sekhon, Bickel & Yu (2019), Metalearners for Estimating Heterogeneous Treatment Effects",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1804597116"
      },
      {
        "title": "Athey & Imbens (2016), Recursive Partitioning for Heterogeneous Causal Effects",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1510489113"
      },
      {
        "title": "Wager & Athey (2018), Estimation and Inference of Heterogeneous Treatment Effects using Random Forests",
        "url": "https://www.tandfonline.com/doi/full/10.1080/01621459.2017.1319839"
      }
    ],
    "demos": [
      "decision-tree",
      "bagging-boosting",
      "roc",
      "classification-metrics"
    ]
  }
};
