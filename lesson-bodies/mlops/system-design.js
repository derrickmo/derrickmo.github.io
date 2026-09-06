// GENERATED from content/lessons/mlops/system-design.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/mlops/system-design/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "system-design": {
    "interview": {
      "quickGrind": [
        {
          "q": "What fraction of an ML system is the model?",
          "a": "A small box in a large diagram. Data pipelines, feature computation, serving, monitoring and retraining are the rest, and they are where most incidents come from."
        },
        {
          "q": "Define training-serving skew.",
          "a": "Any difference between how a feature is computed in training and at serving. It produces different numbers rather than an error, so it flows through and becomes a wrong decision."
        },
        {
          "q": "Give a concrete example of it.",
          "a": "Refitting a scaler at serving on the request batch instead of loading the training statistics. AUC can be identical while a fraction of decisions flip."
        },
        {
          "q": "Why does batch size make skew worse?",
          "a": "A statistic computed on the request batch converges to the training statistic as the batch grows. Load tests use large batches; real traffic arrives in ones and twos, so it is invisible in staging."
        },
        {
          "q": "What is the structural fix for skew?",
          "a": "One implementation used by both paths — the same transform code, or a feature store serving both. Monitoring the seam is second best; removing it is better."
        },
        {
          "q": "Batch or online inference?",
          "a": "Batch when predictions can be precomputed for a known key set and freshness in hours is fine. Online when input arrives at request time or freshness matters. Most real systems run both."
        },
        {
          "q": "What is a feature store for?",
          "a": "Serving the same feature values to training and inference with point-in-time correctness. It removes one seam and introduces another — its own online and offline paths are two systems."
        },
        {
          "q": "What is point-in-time correctness?",
          "a": "Building a training row using only feature values that were knowable at the label's timestamp. Getting it wrong is a leak that is invisible offline and fatal online."
        },
        {
          "q": "Why does a GPU misconfiguration often not raise?",
          "a": "The framework finds no device and falls back to CPU. Every answer stays correct and latency goes from ~20 ms to ~2 s. One startup assert converts it into a crash loop."
        },
        {
          "q": "What should the fallback be when the model is unavailable?",
          "a": "A decision, not a default. Cached score, a simpler model, a static value, or failing the request — each is right in different situations, and inheriting a 500 is rarely one of them."
        },
        {
          "q": "What breaks when you retrain and swap the model?",
          "a": "Everything fitted to the previous model: decision thresholds, calibration parameters, conformal quantiles, monitoring baselines. Nobody changed the threshold, and it now means something different."
        },
        {
          "q": "What is the one-line summary of MLOps?",
          "a": "The failures are at the seams, and they are silent — components exchange arrays of numbers, so a violated contract produces different numbers rather than an exception."
        }
      ],
      "standard": [
        {
          "q": "Walk through the design of a production ML system end to end.",
          "a": "Start from the decision, not the model: what action does the prediction drive, at what latency, at what volume, and what happens when it is wrong in each direction? Those answers determine everything downstream, and skipping them is how systems end up optimizing a metric nobody consumes. Then data and labels, which is where strong candidates separate — where does the label come from, how delayed is it, and is it censored by the system's own actions? A fraud system that blocks a transaction never learns whether it was fraud, which is selection on the outcome and shapes the whole design. Then the architecture, chosen by the latency budget rather than by preference: if the candidate set is large, a funnel is forced rather than chosen, because scoring millions with a rich model does not fit any realistic budget. Then features, with the seam question answered explicitly — one implementation for both paths, or a feature store, and point-in-time correctness in the offline path. Then serving: batch where you can precompute, online where you cannot, with an explicit fallback for when the model is unavailable and an explicit decision about what stale means. Then monitoring, which needs to cover inputs, outputs and — with a labelling budget — actual performance, because unlabelled monitors cannot see concept shift at all. And finally the retraining path, which is the part most often left manual and is the one that changes production most frequently. The habit worth demonstrating is naming the failure behaviour of each stage as you go, since that is the item most reliably missing and the cheapest to add.",
          "deepDive": {
            "q": "Which part is most often missing from a candidate's answer?",
            "a": "The failure behaviour of each stage. If the feature store times out, do you serve with defaults, use a cached value, or fail the request? If the ANN index is stale, how stale is acceptable? If the ranker is down, do you fall back to popularity or to cached scores? Those answers are usually obvious once asked, and volunteering them is what distinguishes someone who has operated a system from someone who has built one. The second most-missing is cost per unit of business value rather than in the abstract — cost per thousand requests or per incremental conversion makes the trade legible to whoever is funding it."
          }
        },
        {
          "q": "Explain train-serve skew, how it hides, and how you eliminate it.",
          "a": "Skew is any difference between how a feature is computed during training and at serving. What makes it the defining MLOps failure is that it does not raise — the pipeline runs, the model returns a number, and the number is wrong. The canonical instance is a normalizer refitted on the serving batch rather than loading the training statistics, and the measured version in this curriculum is instructive: AUC was IDENTICAL at 0.7823 while 0.69% of decisions flipped. So the offline check passes and the product is different. It gets worse as batch size falls — 0.69% at a batch of 8,000, 1.05% at 500, 3.69% at 50, 4.34% at 8 — because a statistic computed on the request batch converges to the training statistic as the batch grows. Load tests and staging use large batches; production traffic arrives in ones and twos. So the failure is systematically invisible in exactly the environments built to catch it, and severe in exactly the environment that matters. Detection: log the actual feature vectors served and compare their distribution against training, and better, replay a sample of production requests through the training pipeline and diff the feature values element-wise — that is the direct test and it catches things distribution comparisons miss. Elimination is better than detection: one implementation used by both paths, so there is no seam to skew. A shared transform library is the simplest version; a feature store is the heavier one, and it is worth being precise that it MOVES the seam rather than removing it, since its own online and offline paths are two systems and point-in-time correctness in the offline path is a nontrivial guarantee that is frequently approximate.",
          "deepDive": {
            "q": "Why is a structural fix better than a monitor here?",
            "a": "Because a monitor tells you after the fact and requires someone to act, while a shared implementation makes the failure impossible to express. This is the general MLOps preference: convert a silent failure into a loud one where you can, and remove the possibility entirely where you can. It is also why 20-09's project-structure argument is a correctness argument rather than a hygiene one — several of this module's failure modes are consequences of having two implementations, and organizing the code so there is one is the fix."
          }
        },
        {
          "q": "How would you roll out a new model version safely?",
          "a": "Treat it as a deployment with a measurable blast radius, not a file swap. First, shadow: run the new model on real traffic without serving its output, and compare predictions against the incumbent. This catches crashes, latency regressions and gross distribution shifts at zero user risk, and the comparison worth making is not just aggregate agreement but agreement in the lowest-margin decile, because that is where disagreements become flipped decisions — an aggregate agreement of 0.9996 can sit entirely on top of a decile where it is much worse. Then canary: route a small percentage, with automatic rollback triggers that are blunt, fast and about health — error rate, latency, crash loops — kept explicitly separate from the quality decision, which needs a pre-defined window and should not be evaluated continuously against a fixed threshold, because a canary is watched continuously by construction and that is the peeking problem. Use a sequential boundary if you want to stop early. Then ramp. Throughout, the item people forget is re-derivation: a retrained model shifts the score distribution, so every quantity fitted to the previous model is now wrong — decision thresholds tuned to produce a given alert volume, calibration parameters, conformal quantiles, monitoring baselines. The symptom is an unexplained volume shift a week later that gets attributed to traffic. The engineering fix is to enumerate everything fitted to a model or a distribution and make recomputing it a required, deploy-blocking step. And the rollback path has to include those artifacts too, since reverting the model without reverting the threshold produces a third configuration nobody tested."
        },
        {
          "q": "What would you monitor, and what can monitoring not tell you?",
          "a": "Four layers. Operational — latency percentiles, error rate, throughput, saturation — which is ordinary service monitoring and catches the loud failures. Input — feature distributions, missing rates, schema conformance — which catches upstream breakage without needing labels. Output — the score distribution and the decision rate, which is often the single most informative signal because it moves when either the inputs or the model change, and because a decision-rate shift is directly a business quantity. And performance, which requires labels and therefore a labelling budget, which is the part that gets cut and should not be. What monitoring cannot tell you is the important half. Unlabelled monitors cannot see concept shift at all: the measured case in this curriculum is a shift with P(x) held bit-for-bit identical that took accuracy from 0.7453 to 0.3375 — below chance — while every drift detector sat at control, mean confidence barely moved, and a KS test on the inputs saw nothing, because nothing about the inputs changed. Only the relationship did. That is why a labelling budget is a monitoring component rather than a research nicety. The second limit is alert design: on identical distributions, a thousand features at alpha 0.01 flags six, so an uncorrected per-feature dashboard emits a steady stream of true nulls and the organisational cost is that people learn to ignore it — which means the one alarm that matters gets ignored with the rest. Tie every alert to a decision and an owner before creating it, and demote the rest to a dashboard nobody is paged for."
        },
        {
          "q": "When do you retrain, and what is the risk in automating it?",
          "a": "Four triggers, in rough order of how principled they are. Performance-based is best when you can afford labels: retrain when measured accuracy on a labelled sample drops below a threshold. Drift-based is the common substitute when you cannot, with the honest caveat from the monitoring lesson that the relationship between input drift and performance is weak in both directions — drift without degradation and degradation without drift both occur — so it is a proxy and should be treated as one. Schedule-based is unprincipled and often correct in practice: retrain weekly because it is simple, predictable, and bounds how stale the model can get. Data-volume-based fits domains where enough new labelled data is itself the event. The risk in automating it is that the scheduled retrain becomes the path that changes production most often and has the least oversight — three artifacts change production and only code goes through a pull request, so a data refresh or an automatic retrain ships with no review at all. That argues for gating the retrain like a deploy: the same evaluation thresholds, the same regression slices, the same canary, and an automatic hold if the new model fails any of them. The deeper risk is the feedback loop: if the model's predictions influence which data is collected — who is shown what, whose application is reviewed, which transactions are approved — then retraining on production logs trains on a distribution the previous model created, and small biases compound across generations. That is a causal problem rather than a drift problem, it is invisible in offline evaluation, and the mitigations are logging propensities and keeping a randomized holdout, both of which have to be built before you need them."
        },
        {
          "q": "A model that was fine is now making bad decisions. Trace it.",
          "a": "Work the seams in order, because each has a distinct signature and the aggregate metric will not name any of them. First, did anything deploy? Three things change production — code, model artifact, and data — and only the first usually leaves a pull request, so check the model version and the data version alongside the git SHA. If a retrain landed, suspect the re-derivation problem immediately: the score distribution moved and a threshold fitted to the old one is now producing a different volume, which reads as the model getting worse when the model is fine. Second, compare features served against features trained: replay a sample of live requests through the training pipeline and diff element-wise. If they differ, it is skew and the model is innocent. Third, if the features match, compare the model's outputs on those exact inputs between environments — if they differ, it is the runtime, so check export parity, precision, and whether the GPU silently fell back to CPU. Fourth, if inputs and outputs both match, the world changed rather than the system: check for concept shift, which needs labels, since no unlabelled monitor will show it. Fifth, slice everything — by segment, device, region, time — because an aggregate that moved a little often hides a subgroup that moved a lot, and the module's whole theme is that summary statistics conceal the thing that decides. Throughout, prefer diffing two things that should be identical over inspecting one thing that looks wrong; that is what turns a plausible story into evidence."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why MLOps is a distinct discipline",
        "back": "In ordinary software a violated contract raises. Here components exchange arrays of NUMBERS, so a violated contract produces different numbers that flow on and become a decision."
      },
      {
        "type": "definition",
        "front": "Train-serve skew",
        "back": "Any difference in how a feature is computed between training and serving. It does not raise — it returns a wrong number."
      },
      {
        "type": "formula",
        "front": "Skew scales inversely with batch",
        "back": "Measured: 0.69% of decisions flipped at batch 8,000; 1.05% at 500; 3.69% at 50; 4.34% at 8 — while AUC was identical at 0.7823."
      },
      {
        "type": "intuition",
        "front": "Why staging cannot catch it",
        "back": "Batch statistics converge to training statistics as batch grows. Load tests use large batches; production arrives in ones and twos."
      },
      {
        "type": "intuition",
        "front": "Structural beats procedural",
        "back": "One implementation for both paths makes skew impossible to express. A monitor only tells you afterwards and needs someone to act."
      },
      {
        "type": "definition",
        "front": "Point-in-time correctness",
        "back": "Build each training row from only what was knowable at the label's timestamp. Getting it wrong is a leak invisible offline and fatal online."
      },
      {
        "type": "pitfall",
        "front": "A feature store as a skew solution",
        "back": "It MOVES the seam. Its online and offline paths are two systems, and offline point-in-time correctness is a nontrivial guarantee that is frequently approximate."
      },
      {
        "type": "pitfall",
        "front": "Silent GPU fallback",
        "back": "No device found, framework falls back to CPU, every answer still correct, ~20 ms becomes ~2 s. One startup assert makes it a crash loop instead."
      },
      {
        "type": "pitfall",
        "front": "Forgetting re-derivation",
        "back": "A retrain shifts the score distribution, so thresholds, calibration, conformal quantiles and baselines are all stale. Symptom: an unexplained volume shift a week later."
      },
      {
        "type": "pitfall",
        "front": "Unlabelled monitors and concept shift",
        "back": "Accuracy fell 0.7453 to 0.3375 with P(x) bit-for-bit identical and every detector at control. A labelling budget IS a monitoring component."
      },
      {
        "type": "pitfall",
        "front": "Uncorrected per-feature drift dashboards",
        "back": "A thousand features at alpha 0.01 flags six on identical distributions. People learn the dashboard is noise, and ignore the one alarm that matters."
      },
      {
        "type": "pitfall",
        "front": "The ungated retrain",
        "back": "Code, model and data all change production; only code gets a pull request. The scheduled retrain has the least oversight and runs most often."
      }
    ],
    "refs": [
      {
        "title": "Sculley et al. (2015) — Hidden Technical Debt in Machine Learning Systems",
        "url": "https://papers.nips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems"
      },
      {
        "title": "Breck et al. (2017) — The ML Test Score: A Rubric for ML Production Readiness",
        "url": "https://research.google/pubs/pub46555/"
      },
      {
        "title": "Polyzotis et al. (2017) — Data Management Challenges in Production Machine Learning",
        "url": "https://dl.acm.org/doi/10.1145/3035918.3054782"
      },
      {
        "title": "Paleyes, Urma & Lawrence (2020) — Challenges in Deploying Machine Learning: A Survey of Case Studies",
        "url": "https://arxiv.org/abs/2011.09926"
      },
      {
        "title": "Huyen — Designing Machine Learning Systems (2022)",
        "url": "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
