// GENERATED from content/lessons/trustworthy-ai/fairness.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/fairness/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "fairness": {
    "level": "core",
    "body": {
      "intuition": [
        "There is no fairness metric. There are about twenty, several are mutually incompatible by arithmetic, and choosing among them is a policy decision that cannot be delegated to an optimizer. That is not a gap in the literature waiting to be filled - it is a theorem, and knowing it is what separates useful work here from a compliance exercise.",
        "The condition that forces the conflict is unequal base rates, which is the normal case. In simulation with base rates of 0.20 and 0.45 and an equally informative signal in both groups, a within-group-calibrated score at a common threshold gives an FNR gap of +0.198 - group A's true positives are missed twice as often. Move A's threshold from 0.500 to 0.232 and the FNR gap goes to exactly 0.0000, while the PPV gap blows out from -0.061 to -0.231. THE SAME SCORE NOW MEANS DIFFERENT THINGS IN THE TWO GROUPS.",
        "Every option costs someone something specific, and the module's thesis applies exactly: each metric is a true statement about a narrow property. 'Equal opportunity' really equalizes false negatives. It does not equalize anything else, and the name does not tell you that. Ask which error the system should distribute equally, and make someone accountable answer."
      ],
      "math": [
        {
          "h": "The three families, and what each fixes",
          "paras": [
            "Independence ignores the label. Separation conditions on the true label. Sufficiency conditions on the prediction. They are three different conditional independences and they are the reason the metrics conflict."
          ],
          "tex": "\\text{independence: } \\hat{Y}\\perp A \\qquad \\text{separation: } \\hat{Y}\\perp A \\mid Y \\qquad \\text{sufficiency: } Y\\perp A\\mid \\hat{Y}",
          "texNote": "Demographic parity is independence. Equalized odds (and its one-sided form, equal opportunity) is separation. Calibration within groups is sufficiency. Any two of the three force the third to fail whenever base rates differ."
        },
        {
          "h": "The impossibility, as arithmetic",
          "paras": [
            "The identity below ties PPV, FNR, FPR and the base rate together. Fix any two of them equal across groups and the third is determined - and it cannot match, because the base rate does not.",
            "This is not an approximation or an empirical tendency. It is an algebraic constraint."
          ],
          "tex": "\\mathrm{FPR}=\\frac{p}{1-p}\\cdot\\frac{1-\\mathrm{PPV}}{\\mathrm{PPV}}\\cdot(1-\\mathrm{FNR}), \\qquad \\frac{p_A/(1-p_A)}{p_B/(1-p_B)} = 0.3034",
          "texNote": "With base rates 0.199 and 0.450 the odds ratio is 0.3034, so equalizing PPV and FNR forces FPR to differ by that factor. No loss function, architecture or amount of data changes this."
        },
        {
          "h": "The three policies, measured on the same score",
          "paras": [
            "One equally-informative, within-group-calibrated score. Only the thresholds differ."
          ],
          "tex": "\\begin{array}{lrrrr} \\text{policy} & \\Delta\\text{sel} & \\Delta\\text{FNR} & \\Delta\\text{FPR} & \\Delta\\text{PPV}\\\\ \\text{common threshold }0.5 & -0.283 & \\mathbf{+0.198} & -0.091 & -0.061\\\\ \\text{equal opportunity} & -0.172 & \\mathbf{0.000} & -0.002 & \\mathbf{-0.231}\\\\ \\text{demographic parity} & \\mathbf{0.000} & -0.187 & +0.152 & \\mathbf{-0.392} \\end{array}",
          "texNote": "Every row zeroes exactly one column and pays in the others. Equal opportunity needed A's threshold at 0.2323 against B's 0.5000; demographic parity needed 0.1332 against 0.6714. The score is identical throughout."
        }
      ],
      "code": [
        {
          "h": "Group-blindness is not neutrality",
          "paras": [
            "Dropping the protected attribute does not remove its influence; it removes your ability to see it."
          ],
          "code": "# A score built WITHOUT the group attribute, from an equally\n# informative signal, on groups with base rates 0.20 vs 0.45:\n\n#   score bucket    P(Y=1 | A)   P(Y=1 | B)\n#     [0.4, 0.6)      0.2049       0.4456     <- same score, 2.2x the risk\n\n# ★ A group-blind score CANNOT be calibrated within both groups when base\n#   rates differ, because the same evidence implies different posteriors.\n#   'We don't use the attribute' is a statement about the FEATURE LIST,\n#   not about the model's behaviour - proxies carry it anyway.\n\n# The within-group-calibrated score used in the rest of this lesson USES\n# the group's base rate. That is the only way sufficiency can hold, and it\n# is exactly what several legal regimes restrict.",
          "caption": "The choice is not between using the attribute and not using it. It is between using it explicitly and having proxies use it invisibly."
        },
        {
          "h": "What each policy costs, in one place",
          "paras": [
            "Stated as who is harmed, because that is the form a decision-maker can act on."
          ],
          "code": "# DEMOGRAPHIC PARITY   equal selection rates\n#   pays: error rates diverge (FPR gap +0.152, PPV gap -0.392)\n#   harms: qualified members of the higher-base-rate group, rejected to\n#          hold the quota; and everyone relying on the score's meaning\n\n# EQUALIZED ODDS       equal TPR and FPR\n#   pays: sufficiency - PPV gap -0.231, so the SAME SCORE means different\n#          things by group\n#   harms: downstream users reading the score as a probability\n\n# CALIBRATION          the score means one thing everywhere\n#   pays: selection and error rates differ (FNR gap +0.198)\n#   harms: the lower-base-rate group, whose true positives are missed\n#          about twice as often\n\n# ★ There is no row with no cost. Picking one is choosing whom to fail.",
          "caption": "The deliverable from a fairness analysis is this table plus a named owner for the choice, not a single number that went green."
        }
      ],
      "useCases": [
        "Lending, hiring, admissions, insurance and criminal justice, where the metric choice is often constrained by statute and the engineering job is to surface the trade-off rather than resolve it.",
        "Content moderation and abuse detection, where FNR parity (equal protection from harm) and FPR parity (equal freedom from wrongful action) are both defensible and cannot both hold.",
        "Medical triage models, where base rates differ across populations for real clinical reasons and calibration is usually the property clinicians rely on.",
        "Any model with a subgroup accuracy gap, where the fairness question begins before the metric choice - a model that knows less about a group harms them under every parity definition."
      ],
      "pitfalls": [
        "Looking for the right fairness metric. Independence, separation and sufficiency conflict by arithmetic when base rates differ; the odds-ratio factor here was 0.3034 and no method removes it.",
        "Treating group-blindness as neutrality. A score built without the attribute gave P(Y=1) of 0.2049 and 0.4456 in the same score bucket - the attribute's influence survives via proxies while your ability to measure it does not.",
        "Reporting one parity metric as 'the model is fair'. Equal opportunity zeroed the FNR gap and moved the PPV gap to -0.231; the headline is true and radically incomplete.",
        "Assuming the base-rate difference is itself neutral. It often reflects historical measurement and access, so equalizing on a biased label equalizes with respect to the bias.",
        "Optimizing a fairness constraint into the loss without deciding the policy first. The optimizer will satisfy whatever you wrote, including a metric nobody would have chosen deliberately.",
        "Ignoring that per-group thresholds require the attribute at inference - the same legal constraint that blocks per-group calibration, and one engineering cannot resolve alone.",
        "Evaluating fairness only at the model, when the harm is usually produced by the surrounding process - who is measured, who appeals, and what happens after a positive."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Sufficiency is calibration within groups, so the per-group temperature question from that lesson is one leg of this impossibility rather than a free improvement."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The same parity choice in coverage form: minority coverage 0.7734 against 0.9193, and Mondrian conditioning is the equalizing move with the same policy cost."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "Why the mediator-versus-confounder distinction becomes legal here - path-specific effects decide which routes from a protected attribute to an outcome count as discrimination."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The counterfactual framing of fairness - would this decision change if the attribute changed - and why it needs a causal model that the data cannot supply."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Where the unresolvable choice belongs: an accountable owner, a documented rationale, and a review process rather than a threshold in a config file."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three families of fairness criteria.",
          "a": "Independence (Ŷ ⫫ A), separation (Ŷ ⫫ A | Y), sufficiency (Y ⫫ A | Ŷ). Demographic parity, equalized odds, and calibration-within-groups respectively."
        },
        {
          "q": "State the impossibility result.",
          "a": "When base rates differ, calibration within groups, equal FPR and equal FNR cannot all hold. Chouldechova 2017; Kleinberg–Mullainathan–Raghavan 2016."
        },
        {
          "q": "Why? Give the identity.",
          "a": "FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR). Fix PPV and FNR equal; p differs, so FPR is forced to differ."
        },
        {
          "q": "Give the measured odds ratio.",
          "a": "Base rates 0.199 vs 0.450 → (p/(1−p)) ratio = 0.3034. That factor is the size of the forced gap."
        },
        {
          "q": "Common threshold 0.5 on a within-group-calibrated score — what's the gap?",
          "a": "FNR gap +0.198 (group A's positives missed ~2× as often), FPR gap −0.091, PPV gap −0.061."
        },
        {
          "q": "What does equal opportunity cost here?",
          "a": "A's threshold moves 0.500 → 0.2323, FNR gap → 0.0000, and the PPV gap blows out to −0.231. The same score now means different things by group."
        },
        {
          "q": "What does demographic parity cost?",
          "a": "Thresholds 0.1332 vs 0.6714; selection equal; FNR gap −0.187, FPR gap +0.152, PPV gap −0.392."
        },
        {
          "q": "★ Is group-blindness neutral?",
          "a": "No. A blind score gave P(Y=1) = 0.2049 vs 0.4456 in the SAME score bucket. It removes your ability to measure the effect, not the effect."
        },
        {
          "q": "Can a group-blind score be calibrated within both groups?",
          "a": "Not when base rates differ — the same evidence implies different posteriors. Sufficiency requires using the base rate, which is what several legal regimes restrict."
        },
        {
          "q": "Is the base-rate difference itself neutral?",
          "a": "Usually not. It often reflects historical measurement and access, so equalizing against a biased label equalizes with respect to the bias."
        },
        {
          "q": "Can you optimize your way out?",
          "a": "No. It is algebra, not an optimization gap. No loss, architecture, or volume of data removes a constraint on the confusion matrix."
        },
        {
          "q": "What is the deliverable from a fairness analysis?",
          "a": "The trade-off table plus a NAMED OWNER for the choice — not a single metric that went green."
        }
      ],
      "standard": [
        {
          "q": "Explain the fairness impossibility result and why it matters practically.",
          "a": "THERE ARE THREE FAMILIES OF CRITERIA AND THEY ARE THREE DIFFERENT CONDITIONAL INDEPENDENCES. Independence, Ŷ ⫫ A, ignores the label — demographic parity. Separation, Ŷ ⫫ A | Y, conditions on truth — equalized odds and its one-sided form, equal opportunity. Sufficiency, Y ⫫ A | Ŷ, conditions on the prediction — calibration within groups. WHEN BASE RATES DIFFER, ANY TWO FORCE THE THIRD TO FAIL, and it is arithmetic rather than an empirical tendency: FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR) ties the confusion matrix to the base rate, so fixing PPV and FNR equal across groups determines FPR, which then cannot match because p does not. In simulation the base rates were 0.199 and 0.450, giving an odds-ratio factor of 0.3034 — that factor IS the forced gap. MEASURED ON ONE SCORE, ONLY CHANGING THRESHOLDS: at a common 0.5 the FNR gap was +0.198; equalizing FNR required moving A's threshold to 0.2323 and blew the PPV gap from −0.061 to −0.231; demographic parity required thresholds of 0.1332 and 0.6714 and produced a PPV gap of −0.392. Every policy zeroes exactly one column and pays in the others. PRACTICALLY THIS MEANS THE CHOICE IS A POLICY DECISION, not an engineering one, and the useful output is the trade-off table with a named owner.",
          "deepDive": {
            "q": "How do you present this choice to non-technical stakeholders?",
            "a": "The framing that lands with non-technical stakeholders is to state each option as who is harmed rather than which metric moves. Demographic parity rejects qualified members of the higher-base-rate group to hold the selection rate, and it breaks the score's meaning for anyone downstream. Equalized odds makes error rates match and destroys sufficiency, so a caseworker reading '0.6' now means something different depending on the applicant — which is a real harm even though no fairness dashboard shows it. Calibration keeps the score honest and leaves the lower-base-rate group's true positives missed about twice as often. There is no row with no cost. It is also worth being precise about what the theorem does NOT say: it does not say fairness is impossible or that the work is futile. It says you cannot have all three parities simultaneously, which leaves enormous room for improvement on any one of them, and leaves entirely open the more important question of whether the accuracy gap between groups can be closed. A model that knows less about a group harms them under every definition, and closing that gap is strictly better than choosing how to distribute the failure."
          }
        },
        {
          "q": "A team says they removed the protected attribute, so the model can't discriminate. Respond.",
          "a": "THAT IS A CLAIM ABOUT THE FEATURE LIST, NOT ABOUT THE MODEL'S BEHAVIOUR. I would show it directly: building a score from an equally informative signal WITHOUT using the group attribute, on groups with base rates 0.20 and 0.45, the same score bucket [0.4, 0.6) carried P(Y=1) = 0.2049 for one group and 0.4456 for the other. Same number, 2.2× the risk. THE MECHANISM IS PROXIES — postcode, education, device, employer, purchase history — and in a rich feature space the attribute is recoverable to high accuracy even when it is nowhere in the input. Removing the column removes your ability to MEASURE the disparity, not the disparity. THERE IS A SECOND, SHARPER POINT: a group-blind score cannot be calibrated within both groups when base rates differ, because the same evidence implies different posteriors. So blindness does not merely fail to guarantee fairness — it guarantees the violation of one specific fairness property. The within-group-calibrated score used in the rest of the analysis has to USE the base rate, which is exactly what several legal regimes restrict. SO THE REAL CHOICE is between using the attribute explicitly, where the effect is measurable and auditable, and having proxies use it invisibly, and that framing usually reorients the conversation productively.",
          "deepDive": {
            "q": "How does the legal picture complicate that?",
            "a": "The legal picture genuinely complicates this and it is worth acknowledging rather than waving away, because engineers who dismiss it lose credibility with the people who have to sign off. Disparate treatment doctrine in several jurisdictions restricts using a protected attribute in the decision path, while disparate impact doctrine holds you responsible for the outcome — so the law can simultaneously forbid the most direct fix and penalise the result of not applying it. That tension is real and unresolved, and the practical consequence is that you must always MEASURE with the attribute even where you may not DECIDE with it. Collecting the attribute for audit purposes while excluding it from features is the standard compromise and it is worth setting up early, because retrofitting demographic data onto an existing pipeline is painful and sometimes impossible. One more caution: proxy removal cascades badly. Dropping postcode because it proxies for race also drops genuine signal about, say, delivery cost, and teams that iteratively drop every correlated feature end up with a much worse model and a disparity that is still there through some remaining combination."
          }
        },
        {
          "q": "How would you actually run a fairness analysis on a production model?",
          "a": "I WOULD START BEFORE THE METRICS, WITH TWO QUESTIONS: what decision does this model drive, and who is harmed by each kind of error. The metric follows from that, not the other way round. In content moderation, false negatives mean a group receives less protection from harm and false positives mean it receives more wrongful enforcement — both are defensible parity targets, they conflict, and which one dominates is a product-values question. THEN THE MEASUREMENT, and I would measure more than the metrics. Subgroup ACCURACY first, because a model that simply knows less about a group harms them under every definition and that gap is fixable in a way the impossibility is not. Then the full table — selection rate, TPR, FPR, PPV, calibration — for every group and, critically, for INTERSECTIONS, since single-axis parity routinely hides intersectional gaps. Then confidence intervals, because subgroup samples are small and a 3-point gap on 200 examples is noise. THEN THE DELIVERABLE, which is the trade-off table plus a named owner, a documented rationale, and a review date. AND I WOULD LOOK PAST THE MODEL, because the harm usually lives in the surrounding process — who gets measured at all, who can appeal, what happens after a positive, and whether the label itself was generated by a biased process.",
          "deepDive": {
            "q": "Which part of this deserves the most weight and usually gets the least?",
            "a": "That last point deserves the most weight and gets the least. If the label is 'was arrested' rather than 'committed an offence', or 'was promoted' rather than 'was capable', then the base rates you are equalizing against encode the historical process that produced them, and every parity metric computed on that label inherits it. Equalizing FNR with respect to a biased label equalizes with respect to the bias. There is no statistical fix — this is a measurement problem, and the honest responses are to find a better label, to model the label's generation explicitly, or to state plainly in the writeup that the analysis is conditional on a label you do not fully trust. The causal framing is the most principled available: counterfactual fairness asks whether the decision would change had the attribute been different, holding everything not causally downstream of it fixed, which requires a causal graph and immediately runs into the identification problems from the causal module. Path-specific effects are the version that matters legally, since some routes from attribute to outcome are considered legitimate and others are not — and that distinction is a legal judgment encoded in a graph, which is exactly the kind of assumption the previous module showed the data cannot supply."
          }
        },
        {
          "q": "Which fairness criterion would you default to, and why?",
          "a": "I WOULD NOT DEFAULT — I WOULD MAKE THE CHOICE VISIBLE — but if pressed for a starting point it depends on one question: is the score consumed downstream as a probability, or is the decision terminal? IF THE SCORE IS CONSUMED, calibration within groups is close to mandatory, because a score meaning different things for different people corrupts every downstream decision and does so invisibly. A clinician, a caseworker or a pricing engine reading 0.6 has to be able to act on it identically regardless of group; equalized odds explicitly gives that up, with a measured PPV gap of −0.231 in the simulation. IF THE DECISION IS TERMINAL AND THE ERROR IS A DENIAL OF OPPORTUNITY, equal opportunity — equal FNR — is the most defensible starting point, because missing a qualified applicant twice as often in one group is the harm most people recognise as unfairness, and it was +0.198 at a common threshold here. DEMOGRAPHIC PARITY I would reserve for cases where the base-rate difference is itself suspect, since equalizing selection is a statement that the observed base rates should not be treated as ground truth — a coherent position when the label encodes historical exclusion, and an incoherent one when the base rate is real.",
          "deepDive": {
            "q": "What resolves arguments about the criterion faster than debating metrics?",
            "a": "The meta-point is that the criterion encodes a belief about the label's validity, and making that explicit resolves most arguments faster than debating metrics. If you trust the label as a measurement of the thing you care about, sufficiency and separation are the reasonable candidates and demographic parity looks like distortion. If you think the label is a record of a biased process, demographic parity looks like a correction and calibration looks like laundering the bias. People argue about metrics when they actually disagree about the label, and surfacing that reframes the discussion into one domain experts can settle. Two practical additions. First, whatever you pick, monitor the OTHERS too — the trade-off table should be a permanent dashboard, not a one-off analysis, since a retrain can move a gap you are not watching. Second, consider whether the model needs to make the decision at all: abstention and routing to human review, sized using the conformal machinery from the previous lesson, sidesteps the parity question for the hardest cases, which are exactly the ones where the impossibility bites hardest. That is often the most practical intervention available."
          }
        },
        {
          "q": "Where does fairness work go wrong in practice, beyond picking the wrong metric?",
          "a": "THE MOST COMMON FAILURE IS TREATING IT AS A GATE RATHER THAN A DESIGN INPUT. A fairness review at the end of a project can only reject or accept; it cannot change what data was collected, what label was chosen, or who was in the training set — and those decisions determine most of the outcome. By the time there is a model to audit, the expensive fixes are unavailable. THE SECOND IS MEASURING THE MODEL AND NOT THE SYSTEM. The model is one component; the harm is produced by the pipeline around it — who is enrolled at all, whose data is missing, what the false-positive experience feels like, whether there is an appeal path, and who staffs it. A model with perfectly equal error rates embedded in a process where one group cannot appeal is not fair, and no model metric shows that. THE THIRD IS SINGLE-AXIS ANALYSIS. Parity on each attribute separately routinely coexists with large intersectional gaps, and the subgroups are small enough that people stop looking because the intervals are wide — which is a reason to collect more data on them, not to conclude there is no gap. THE FOURTH IS REPORTING ONE METRIC AS 'FAIR'. Equal opportunity zeroed the FNR gap while moving PPV to −0.231; the headline is true, and the omission is the whole story.",
          "deepDive": {
            "q": "Is there a subtler failure than those?",
            "a": "There is a fifth that is more subtle and increasingly common: optimizing a fairness constraint directly into the training objective without deciding the policy first. The optimizer will satisfy whatever you wrote, and constrained training tends to satisfy it in the cheapest available way — often by degrading performance on the majority group rather than improving the minority, which technically closes the gap and helps nobody. Always check whether a closed gap was closed upward or downward; 'we equalized TPR' is compatible with having made everyone worse. The related trap is that in-processing constraints are fitted to the training distribution and the parity they enforce does not survive shift, so a model certified fair at launch can drift out of compliance silently — which argues for post-processing thresholds, which are transparent and re-tunable, over constrained training, which bakes the choice into weights nobody can inspect. The general shape is the module's again: 'this model satisfies equalized odds' is a true statement about a specific dataset, a specific partition, and a specific moment, and it gets quoted as a property of the system."
          }
        },
        {
          "q": "How does this lesson relate to the module's thesis and to the causal module?",
          "a": "IT IS THE STRONGEST FORM OF THE MODULE'S THESIS: THE GUARANTEE IS TRUE AND NARROWER THAN ITS NAME, AND HERE THE NAMES ARE ACTIVELY MISLEADING. 'Equal opportunity' really equalizes false negative rates and nothing else. 'Demographic parity' really equalizes selection rates and nothing else. 'Fair' is not a property any of them establishes. Unlike calibration and conformal, where the gap was between marginal and conditional, here the gap is between a metric's NAME and its content — and the impossibility theorem means you cannot close it by computing more metrics, because the remaining ones are forced to differ. THE CONNECTION TO THE CAUSAL MODULE IS DIRECT AND USEFUL. That module's thesis was that the assumption is the estimate; here the assumption is about the LABEL and about which causal paths from the attribute to the outcome are legitimate. Counterfactual fairness — would this decision change had the attribute been different — is a causal question requiring a graph, with the same identification problems, and path-specific effects are how the legal distinction between permitted and prohibited pathways gets encoded. So a serious fairness analysis needs a causal model that the data cannot supply, which is exactly what the previous module established, arriving here as a legal requirement rather than a methodological preference.",
          "deepDive": {
            "q": "What does the synthesis of the two modules look like as a checklist?",
            "a": "The practical synthesis of the two modules is a discipline worth stating as a checklist. Name the estimand — which error, over which group, under which decision. Name the assumption — what the label measures, which paths count, whether base rates are ground truth or artefact. Report the trade-off rather than a single number, since every alternative harms someone specifically. Price the untestable part with a sensitivity analysis, which here means asking how much of the base-rate difference would have to be measurement bias before the recommendation flips. And assign an owner, because the decision is not derivable from the data and someone accountable has to make it. None of that is technically hard; all of it is routinely skipped in favour of a dashboard with a green metric. If there is one habit to take from these two modules together, it is that the number is the easy part and the reference class, the assumption and the owner are the work."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The three families",
        "back": "Independence Ŷ⫫A (demographic parity) · Separation Ŷ⫫A|Y (equalized odds / equal opportunity) · Sufficiency Y⫫A|Ŷ (calibration within groups). Three different conditional independences — hence the conflict."
      },
      {
        "type": "formula",
        "front": "★ The impossibility, as arithmetic",
        "back": "FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR). Fix PPV and FNR equal across groups; p differs, so FPR is FORCED to differ. Measured odds ratio at p=0.199 vs 0.450: **0.3034**."
      },
      {
        "type": "formula",
        "front": "★ Three policies, one score, only thresholds change",
        "back": "Common 0.5: ΔFNR **+0.198**, ΔPPV −0.061. Equal opportunity (A at 0.2323): ΔFNR **0.000**, ΔPPV **−0.231**. Demographic parity (0.1332 vs 0.6714): Δsel **0.000**, ΔPPV **−0.392**. Each zeroes one column and pays in the rest."
      },
      {
        "type": "pitfall",
        "front": "★ Group-blindness is not neutrality",
        "back": "A blind score gave P(Y=1) = **0.2049 vs 0.4456 in the SAME score bucket**. Proxies carry the attribute; dropping the column removes your ability to MEASURE the disparity, not the disparity."
      },
      {
        "type": "intuition",
        "front": "Can a group-blind score be calibrated within both groups?",
        "back": "No, when base rates differ — the same evidence implies different posteriors. Blindness doesn't merely fail to guarantee fairness; it GUARANTEES violating sufficiency."
      },
      {
        "type": "intuition",
        "front": "Who each policy harms",
        "back": "Parity → qualified members of the higher-base-rate group, plus everyone reading the score. Equalized odds → downstream users (the score stops meaning one thing). Calibration → the lower-base-rate group, missed ~2× as often. **No row has no cost.**"
      },
      {
        "type": "pitfall",
        "front": "Is the base rate itself neutral?",
        "back": "Usually not. If the label is 'was arrested' not 'offended', or 'was promoted' not 'was capable', equalizing against it equalizes with respect to the bias. A measurement problem with no statistical fix."
      },
      {
        "type": "intuition",
        "front": "What actually decides the metric argument",
        "back": "A belief about the LABEL. Trust it → sufficiency/separation are reasonable, parity looks like distortion. Distrust it → parity looks like correction, calibration like laundering. People argue metrics when they disagree about labels."
      },
      {
        "type": "pitfall",
        "front": "Was the gap closed upward or downward?",
        "back": "Constrained training satisfies the constraint the CHEAPEST way — usually by degrading the majority group. 'We equalized TPR' is compatible with making everyone worse. Always check the direction."
      },
      {
        "type": "pitfall",
        "front": "In-processing vs post-processing",
        "back": "In-processing bakes the parity choice into weights fitted to one distribution — it drifts out of compliance silently. Post-processing thresholds are transparent and re-tunable. Prefer them."
      },
      {
        "type": "pitfall",
        "front": "Single-axis analysis",
        "back": "Parity on each attribute separately routinely coexists with large INTERSECTIONAL gaps. Small subgroups → wide intervals → people stop looking. That's a reason to collect more data, not to conclude no gap exists."
      },
      {
        "type": "intuition",
        "front": "★ The deliverable",
        "back": "The trade-off table + a NAMED OWNER + a documented rationale + a review date. Not a single metric that went green. The choice is not derivable from data — someone accountable must make it."
      }
    ],
    "refs": [
      {
        "title": "Chouldechova (2017), Fair Prediction with Disparate Impact",
        "url": "https://arxiv.org/abs/1703.00056"
      },
      {
        "title": "Kleinberg, Mullainathan & Raghavan (2016), Inherent Trade-Offs in the Fair Determination of Risk Scores",
        "url": "https://arxiv.org/abs/1609.05807"
      },
      {
        "title": "Hardt, Price & Srebro (2016), Equality of Opportunity in Supervised Learning",
        "url": "https://arxiv.org/abs/1610.02413"
      },
      {
        "title": "Barocas, Hardt & Narayanan, Fairness and Machine Learning (free textbook)",
        "url": "https://fairmlbook.org/"
      },
      {
        "title": "Kusner, Loftus, Russell & Silva (2017), Counterfactual Fairness",
        "url": "https://arxiv.org/abs/1703.06856"
      }
    ],
    "demos": [
      "fairness",
      "roc",
      "calibration",
      "classification-metrics"
    ],
    "demoTitles": {
      "fairness": "Fairness & Group Metrics",
      "roc": "ROC, PR & Thresholds",
      "calibration": "Model Calibration",
      "classification-metrics": "Classification Metrics"
    }
  }
};
