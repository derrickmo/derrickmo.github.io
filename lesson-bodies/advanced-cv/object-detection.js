// GENERATED from content/lessons/advanced-cv/object-detection.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-cv/object-detection/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "object-detection": {
    "interview": {
      "quickGrind": [
        {
          "q": "Why is detection harder than classification?",
          "a": "The output is a variable-length set of localized objects rather than one label, so there is no fixed output shape, and the loss has to solve an assignment problem before it can be computed at all."
        },
        {
          "q": "What are anchors for?",
          "a": "They turn detection into a fixed-shape problem. Tile boxes of set scales and aspect ratios across the feature map, then predict a class and an offset per anchor — a dense classification-plus-regression task instead of a set-prediction one."
        },
        {
          "q": "Define IoU.",
          "a": "Intersection over union of two boxes. It is scale-invariant and bounded in [0,1], which is why it works both as the matching rule and as the evaluation criterion."
        },
        {
          "q": "How are anchors assigned to ground truth?",
          "a": "By IoU thresholds: above a high threshold is positive, below a low one is negative, in between is ignored so ambiguous anchors do not contribute noise."
        },
        {
          "q": "What is the class-imbalance problem in detection?",
          "a": "Almost every anchor is background — often thousands to one. Naive cross-entropy is dominated by easy negatives, and the loss can fall while detection quality does not move."
        },
        {
          "q": "How is that fixed?",
          "a": "Either sample — hard negative mining, or a fixed positive-negative ratio — or reweight, which is focal loss: scale each term by (1-p)^gamma so confident easy negatives contribute almost nothing."
        },
        {
          "q": "Why smooth L1 rather than L2 for box regression?",
          "a": "L2's gradient grows with the error, so a badly-placed box or a mislabelled one dominates the update. Smooth L1 is quadratic near zero and linear beyond, bounding the influence of outliers."
        },
        {
          "q": "What does non-max suppression do?",
          "a": "Removes duplicate detections: sort by score, keep the top box, drop everything overlapping it above an IoU threshold, repeat. It is a post-process, not part of the loss."
        },
        {
          "q": "What is the NMS threshold trade-off?",
          "a": "Low threshold suppresses aggressively and drops genuinely overlapping objects; high threshold keeps duplicates. It is a precision-recall dial and crowded scenes are where it hurts."
        },
        {
          "q": "One-stage or two-stage?",
          "a": "Two-stage proposes regions then classifies them, historically more accurate. One-stage predicts densely in a single pass, faster; focal loss closed most of the accuracy gap by fixing the imbalance that made dense prediction hard."
        },
        {
          "q": "What is mAP?",
          "a": "Average precision — the area under precision-recall — computed per class at an IoU threshold and averaged. COCO's headline averages it over IoU 0.5 to 0.95, which rewards localization quality, not just detection."
        },
        {
          "q": "What did DETR change?",
          "a": "It removed anchors and NMS by predicting a fixed set of boxes and matching them to ground truth with a Hungarian assignment inside the loss. Set prediction becomes end-to-end instead of being approximated by dense anchors plus a post-process."
        }
      ],
      "standard": [
        {
          "q": "Explain the class imbalance in dense detection and why focal loss works.",
          "a": "A one-stage detector evaluates on the order of 100,000 anchor positions per image and typically a handful contain objects, so the negative-to-positive ratio is roughly 1000:1. The problem is not only the ratio but the DIFFICULTY distribution: the overwhelming majority of those negatives are trivially easy — empty sky, uniform road — and each contributes a small loss, but summed over tens of thousands they dominate the gradient. The measurable symptom is that the total loss decreases steadily while detection quality does not improve, because the update is mostly being spent making already-confident background slightly more confident. Two families of fix. Sampling controls WHICH terms enter the loss: hard negative mining keeps the highest-loss negatives, and fixed-ratio sampling caps the negatives per positive. That works and it discards data and adds a pipeline stage. Focal loss instead reweights every term continuously: multiply the standard cross-entropy by (1 - p_t)^gamma, so a background anchor predicted at 0.99 confidence has its loss scaled by 0.0001 at gamma = 2 while a hard example near 0.5 is barely attenuated. Nothing is discarded, the easy mass simply stops dominating. Lin et al.'s result was that with this loss a dense one-stage detector matched two-stage accuracy, which is the strong form of the claim: the accuracy gap between one-stage and two-stage detectors was substantially an imbalance problem rather than an architectural one.",
          "deepDive": {
            "q": "What is the prior-initialization detail people miss?",
            "a": "The final classification bias is initialized so the model starts predicting a low object probability — around 0.01 — rather than 0.5. Without it, the first iterations produce an enormous loss from the sheer number of background anchors each predicted at chance, and training is unstable or diverges. It is a one-line change that the paper reports as necessary, and it is a good example of a detail that looks cosmetic and is load-bearing."
          }
        },
        {
          "q": "Walk through the full detection loss and how matching works.",
          "a": "The loss is multi-task and it cannot even be written down until assignment is settled, which is the part that distinguishes detection from classification. Assignment first: compute IoU between every anchor and every ground-truth box. An anchor above the high threshold — typically 0.7 for RPN, 0.5 for many one-stage detectors — is a positive assigned to that box; below the low threshold it is background; in between it is IGNORED, contributing to neither term, because forcing a label on an ambiguous anchor injects noise into both heads. There is usually a rule guaranteeing every ground-truth box gets at least one positive anchor, so small or oddly-shaped objects are not silently dropped. Then the loss has two parts. Classification runs over positives AND negatives, since knowing where objects are not is most of the task. Regression runs over POSITIVES ONLY — there is no meaningful box offset for a background anchor — and this asymmetry is a common source of bugs, because a naive implementation that averages the regression term over all anchors divides by the wrong denominator and effectively scales the localization loss to nothing. The regression target is parameterized as offsets relative to the anchor, normalized by anchor size, so the network predicts a small correction rather than absolute coordinates; that keeps the targets in a consistent range across scales and is why anchors help optimization and not just output shape.",
          "deepDive": {
            "q": "What does DETR do instead, and what did it cost?",
            "a": "It predicts a fixed number of queries — say 100 — and finds a one-to-one Hungarian matching between predictions and ground truth inside the loss, with unmatched queries supervised as 'no object'. That makes the assignment global and optimal rather than local and heuristic, and it eliminates both anchors and NMS, since duplicates are penalized by construction. The cost was convergence: the original DETR needed around 500 epochs, roughly ten times a comparable Faster R-CNN, because the matching is unstable early in training when predictions are near-random. Deformable DETR and successors fixed most of that with sparse attention and better query initialization."
          }
        },
        {
          "q": "Non-max suppression is a hand-written post-process outside the loss. What follows from that?",
          "a": "Several things, and it is a good question to think about structurally. First, the model is never trained knowing NMS exists, so it is optimized to produce a dense scored set and then evaluated after a step that discards most of it — a train-test mismatch that everyone accepts and nobody removes in the classical pipeline. Second, NMS has a hyperparameter that is genuinely a precision-recall dial, and the right value depends on the scene: crowded scenes with real overlap need a permissive threshold or they lose true objects, sparse scenes want an aggressive one to kill duplicates. That is a property of the data, so a single global value is always a compromise. Soft-NMS improves on this by decaying overlapping detections' scores rather than deleting them, which keeps a genuinely-overlapping second object alive at a lower score instead of removing it outright. Third, it is a sequential greedy algorithm and therefore an awkward part of the latency budget: it is hard to batch, and on a crowded image with thousands of surviving boxes it can be a meaningful fraction of inference time. All three considerations point the same direction, which is why end-to-end set prediction is attractive — DETR removes NMS entirely by making duplicate suppression part of the training objective, so the model learns not to emit duplicates rather than having them cleaned up afterwards."
        },
        {
          "q": "How do you evaluate a detector, and where does mAP mislead?",
          "a": "mAP is average precision per class averaged over classes, where AP is the area under the precision-recall curve obtained by sweeping the score threshold, with a detection counted correct if it exceeds an IoU threshold against an unmatched ground-truth box. COCO averages over IoU from 0.5 to 0.95 in steps, which means a large part of the headline number is measuring localization TIGHTNESS rather than whether the object was found — a system that finds everything with loose boxes scores far worse than that description suggests. That is the first way it misleads. The second is that mAP averages over classes equally, so rare classes carry the same weight as common ones and a model can move the headline by improving classes nobody cares about. The third is that AP integrates over all operating points, and deployment runs at ONE threshold, so a model with better AP can be worse at the confidence you actually ship. Practically I would report mAP for comparability and then the things that decide the product: precision and recall at the operating threshold, broken out by object size — small objects are usually where systems fail and COCO's small-object AP is often less than half the headline — and by the slices that matter operationally, plus latency at the target batch size, since a detector that is two points better and three times slower is often not better."
        },
        {
          "q": "Your detector performs well on the benchmark and badly in production. Where do you look?",
          "a": "Start by separating the four candidate causes, because they have different fixes. Domain shift is the most common: benchmark images are well-lit, well-framed and often taken with different cameras than the deployment. The check is to slice production performance by capture metadata — device, resolution, time of day, site — and if performance correlates with something causally unrelated to the label, the model has partly learned the channel rather than the object. Second, object-size distribution: benchmarks are relatively balanced, and production may be dominated by small or distant objects where AP was always weak; comparing the size histograms of the two sets takes minutes and frequently explains everything. Third, the operating point — the benchmark reports an integral over thresholds and production runs at one, so recompute precision and recall at the shipped threshold on production data rather than trusting mAP. Fourth, crowding: if production scenes contain many overlapping instances and the benchmark did not, the NMS threshold tuned on the benchmark is now suppressing true positives, and that shows up as recall loss concentrated in dense images. The general habit is that a detector's aggregate number hides its failure modes by construction, since it averages over classes, sizes and thresholds all at once — so the diagnostic move is always to disaggregate along the axis that differs between the two settings."
        },
        {
          "q": "Would you use anchors today?",
          "a": "It depends on the constraint, and the honest answer names both sides. Anchor-based detectors remain a strong, extremely well-tooled default: they converge fast, they are supported everywhere, and the hyperparameters — scales, aspect ratios, IoU thresholds — are well understood even though they are a real tuning burden and are dataset-specific in a way that quietly costs time. Anchor-free approaches removed most of that. FCOS and CenterNet predict objects at points with a distance-to-boundary or centre-heatmap parameterization, keeping dense prediction and dropping the anchor hyperparameters entirely. DETR-family models go further and remove NMS as well, at the cost of much slower convergence in the original formulation, largely fixed by later variants. For a new system today I would default to a modern anchor-free or DETR-style detector, mostly because there are fewer knobs whose wrong values fail quietly. I would still reach for a well-tuned anchor-based model when the deployment target has a constrained operator set — the export path for classical detectors is far better trodden — or when there is an existing tuned pipeline whose hyperparameters already encode real knowledge about the data, since discarding that is a cost people routinely underestimate."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why detection is structurally harder",
        "back": "The output is a variable-length SET, so the loss cannot be computed until an assignment between predictions and ground truth is chosen."
      },
      {
        "type": "definition",
        "front": "Anchors",
        "back": "Tiled boxes of fixed scales and aspect ratios that convert set prediction into dense per-anchor classification plus offset regression."
      },
      {
        "type": "formula",
        "front": "Focal loss",
        "back": "FL = -(1 - p_t)^gamma log(p_t). At gamma=2 a background anchor at p=0.99 is scaled by 1e-4; hard examples near 0.5 are barely touched."
      },
      {
        "type": "definition",
        "front": "IoU",
        "back": "Intersection over union — scale-invariant, bounded in [0,1]. Used both as the matching rule and as the correctness criterion."
      },
      {
        "type": "intuition",
        "front": "Ignore band",
        "back": "Anchors between the low and high IoU thresholds contribute to neither term. Forcing a label on an ambiguous anchor injects noise into both heads."
      },
      {
        "type": "formula",
        "front": "Smooth L1",
        "back": "Quadratic near zero, linear beyond. L2's gradient grows with error, so one badly-placed or mislabelled box would dominate the update."
      },
      {
        "type": "definition",
        "front": "Non-max suppression",
        "back": "Sort by score, keep the top box, drop overlaps above an IoU threshold, repeat. A post-process the model is never trained to anticipate."
      },
      {
        "type": "intuition",
        "front": "The focal-loss claim",
        "back": "With the imbalance fixed, a dense one-stage detector matched two-stage accuracy — so the gap was an imbalance problem, not an architectural one."
      },
      {
        "type": "pitfall",
        "front": "Averaging regression over all anchors",
        "back": "Box regression is defined on POSITIVES only. Dividing by the total anchor count scales the localization loss to nearly nothing."
      },
      {
        "type": "pitfall",
        "front": "The focal-loss bias init",
        "back": "Initialize the final classification bias to a low prior (~0.01), or the first steps produce an enormous background loss and training is unstable."
      },
      {
        "type": "pitfall",
        "front": "Reading COCO mAP as detection rate",
        "back": "Averaging IoU 0.5-0.95 means much of it measures localization tightness. Small-object AP is often under half the headline."
      },
      {
        "type": "pitfall",
        "front": "One global NMS threshold",
        "back": "Crowded scenes need permissive, sparse scenes aggressive. A benchmark-tuned value silently suppresses true positives in dense production images."
      }
    ],
    "refs": [
      {
        "title": "Lin et al. (2017) — Focal Loss for Dense Object Detection (RetinaNet)",
        "url": "https://arxiv.org/abs/1708.02002"
      },
      {
        "title": "Ren et al. (2015) — Faster R-CNN: Towards Real-Time Object Detection with RPNs",
        "url": "https://arxiv.org/abs/1506.01497"
      },
      {
        "title": "Carion et al. (2020) — End-to-End Object Detection with Transformers (DETR)",
        "url": "https://arxiv.org/abs/2005.12872"
      },
      {
        "title": "Tian et al. (2019) — FCOS: Fully Convolutional One-Stage Object Detection",
        "url": "https://arxiv.org/abs/1904.01355"
      },
      {
        "title": "Bodla et al. (2017) — Soft-NMS: Improving Object Detection With One Line of Code",
        "url": "https://arxiv.org/abs/1704.04503"
      }
    ],
    "demos": []
  }
};
