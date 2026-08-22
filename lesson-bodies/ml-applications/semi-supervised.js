// GENERATED from content/lessons/ml-applications/semi-supervised.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-applications/semi-supervised/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "semi-supervised": {
    "level": "core",
    "body": {
      "intuition": [
        "Semi-supervised learning uses unlabelled data to improve a supervised model, and it only works because of an ASSUMPTION about structure: that the decision boundary lies in a low-density region, that points in the same cluster share a label, or that the data lies on a manifold along which labels vary smoothly. Those three are the same idea from different directions, and unlabelled data is informative only to the extent one of them holds.",
        "That makes this the module's most explicit instance of the spine, because here the structure is not incidental to the domain - it IS the method. Where the assumption fails, unlabelled data does not merely fail to help: pseudo-labelling actively propagates the model's early mistakes, which is confirmation bias with a training loop around it.",
        "The honest framing that the field converged on is that SSL's reported gains shrink dramatically under fair comparison. Oliver et al.'s realistic-evaluation result is the reference point: give the purely supervised baseline the same tuning budget, the same augmentation and the same architecture, and much of the published advantage disappears. So the question to ask of any SSL claim is not whether it beat a baseline but whether the baseline was given the same budget."
      ],
      "math": [
        {
          "h": "The three assumptions, which are one assumption",
          "paras": [
            "Each says that the unlabelled data's geometry constrains where the boundary can be. If the geometry is uninformative about the label, none of them holds and unlabelled data cannot help.",
            "Stating which one you are relying on is the first step, because it tells you what to check."
          ],
          "tex": "\\text{cluster: } x_i,x_j\\ \\text{same cluster} \\Rightarrow y_i=y_j \\quad\\cdot\\quad \\text{low-density: } p(x)\\ \\text{small at the boundary} \\quad\\cdot\\quad \\text{manifold: } y\\ \\text{smooth along } \\mathcal{M}",
          "texNote": "The check is cheap and rarely run: cluster the unlabelled data and measure label purity within clusters on whatever labelled data you have. High purity means the assumption holds; purity near the base rate means SSL will not help and may hurt."
        },
        {
          "h": "Consistency regularization, the method that works",
          "paras": [
            "Require the model's prediction to be stable under perturbations that should not change the label. That is an augmentation-encoded invariance applied to unlabelled points, which is why SSL's success tracks augmentation quality so closely.",
            "FixMatch's contribution is the pairing: a weak augmentation produces the pseudo-label and a strong one must match it, with a confidence threshold gating which points participate."
          ],
          "tex": "\\mathcal{L}=\\mathcal{L}_{\\text{sup}} + \\lambda\\,\\mathbb{E}_{x\\sim\\mathcal{U}}\\Big[\\mathbb{1}\\{\\max p(y|\\alpha(x))>\\tau\\}\\cdot H\\big(\\hat{y}_{\\alpha(x)},\\,p(y|\\mathcal{A}(x))\\big)\\Big]",
          "texNote": "The threshold tau is doing the real work: it restricts pseudo-labelling to points the model is already confident about, which limits how fast errors can propagate. It is also why calibration matters here - an overconfident model admits bad pseudo-labels at any threshold."
        },
        {
          "h": "★ Confirmation bias, and why it compounds",
          "paras": [
            "Self-training fits on its own predictions, so an early error becomes a training label, which reinforces the error, which admits more of the same. There is no external signal in the loop to correct it.",
            "The failure is characteristically silent: training loss falls throughout and the pseudo-label distribution collapses toward whichever class the model started favouring."
          ],
          "tex": "\\hat{y}^{(t+1)} = f_{\\theta^{(t)}}(x_u) \\;\\to\\; \\theta^{(t+1)} \\;\\to\\; \\hat{y}^{(t+2)} \\quad\\text{(no external correction anywhere in the loop)}",
          "texNote": "The diagnostic to run every round is the pseudo-label CLASS DISTRIBUTION against the labelled set's prior. Drift toward one class is the tell, and it appears well before any validation metric moves."
        }
      ],
      "code": [
        {
          "h": "The check that decides whether to bother",
          "paras": [
            "One clustering run answers whether the assumption these methods depend on actually holds in your data."
          ],
          "code": "# BEFORE any SSL method:\n#   1 cluster the UNLABELLED pool (k-means, or the model's embeddings)\n#   2 measure label PURITY within each cluster using the labelled data\n#   3 compare against the base rate\n#\n#   purity >> base rate  -> cluster assumption holds, SSL should help\n#   purity ~  base rate  -> the geometry says nothing about the label;\n#                           SSL will not help and pseudo-labelling may hurt\n#\n# ★ This is the same statistic as HOMOPHILY in the graph lesson, computed\n#   over clusters instead of edges. Both answer 'does the structure I am\n#   about to exploit carry label information at all?'\n\n# AND THE OTHER PRECONDITION, which is easy to check and often false:\n#   the unlabelled pool must come from the SAME distribution as the\n#   labelled data. Class distribution mismatch - unlabelled data containing\n#   classes not in the labelled set - reliably makes SSL worse than\n#   supervised-only, which is one of the realistic-evaluation findings.",
          "caption": "Two checks, both cheap, both usually skipped. Together they predict whether the method can work before you implement it."
        },
        {
          "h": "Evaluating an SSL claim honestly",
          "paras": [
            "The realistic-evaluation protocol, which is the reason reported gains shrank when it was applied."
          ],
          "code": "# GIVE THE SUPERVISED BASELINE EVERYTHING THE SSL METHOD GETS\n#   * the same architecture\n#   * the same AUGMENTATION (strong augmentation alone explains much of\n#     the reported gain, because it is doing the regularizing)\n#   * the same TUNING BUDGET (SSL papers often tune the SSL method\n#     extensively against a lightly-tuned baseline)\n#   * a REALISTICALLY SMALL validation set - tuning on a large labelled\n#     validation set contradicts the premise that labels are scarce\n\n# AND REPORT\n#   * transfer learning as a baseline: a pretrained model fine-tuned on the\n#     labelled data alone is frequently better than SSL from scratch, and\n#     is the option a practitioner actually has\n#   * the labelled-set size sweep - SSL's advantage is largest when labels\n#     are very scarce and vanishes as they grow\n\n# ★ 'It beat the baseline' is uninformative without the baseline's budget.",
          "caption": "The validation-set point is the sharpest: tuning SSL hyperparameters on a thousand labelled examples while claiming a hundred-label regime is not a fair experiment."
        }
      ],
      "useCases": [
        "Domains where unlabelled data is nearly free and labels are expensive - audio, medical imaging, industrial sensing - which is the setting these methods were designed for.",
        "Bootstrapping a first model when a labelling budget exists but has not been spent, where active learning chooses what to label and SSL uses the rest.",
        "Exploiting a large unlabelled pool that genuinely matches the deployment distribution, which is the precondition most often violated.",
        "Deciding NOT to use SSL, which the cluster-purity check answers in an afternoon and saves a quarter."
      ],
      "pitfalls": [
        "Not checking whether the cluster assumption holds. Cluster purity near the base rate means the geometry carries no label information and SSL cannot help - the same check as homophily in the graph lesson.",
        "Comparing against an under-tuned supervised baseline. Realistic evaluation showed much of the reported advantage disappears when the baseline gets the same architecture, augmentation and tuning budget.",
        "Tuning on a large labelled validation set while claiming a label-scarce regime. That contradicts the premise and is the most common structural flaw in SSL results.",
        "Assuming the unlabelled pool matches the labelled distribution. Class mismatch - unlabelled data containing classes absent from the labelled set - reliably makes SSL worse than supervised-only.",
        "Ignoring confirmation bias. Self-training fits on its own predictions with no external correction, so an early error compounds and the tell is pseudo-label class drift, not the loss.",
        "Skipping transfer learning as a baseline. A pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch and is the option actually available.",
        "Using a fixed confidence threshold on an uncalibrated model. The threshold is what limits error propagation, and an overconfident model admits bad pseudo-labels at any setting."
      ],
      "connections": [
        {
          "ref": "ml-applications/gnn",
          "text": "Label propagation is the graph instance of the same idea, and the homophily statistic is the cluster-purity check computed over edges."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "Why consistency regularization works at all - it applies an augmentation-encoded invariance to unlabelled points, so SSL's success tracks augmentation quality."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why the confidence threshold needs a calibrated model: an overconfident network admits bad pseudo-labels at any threshold, and modern networks are overconfident by default."
        },
        {
          "ref": "unsupervised-learning/kmeans",
          "text": "The clustering used for the precondition check, and the low-density intuition the cluster assumption formalizes."
        },
        {
          "ref": "multimodal/simclr-byol",
          "text": "Self-supervised pretraining, which is the alternative use of unlabelled data and frequently the stronger one - representation first, then supervised fine-tuning."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What assumption does SSL depend on?",
          "a": "That the data's geometry constrains the label: cluster (same cluster ⇒ same label), low-density (the boundary sits where p(x) is small), or manifold (y varies smoothly along it). Three views of one idea."
        },
        {
          "q": "★ How do you check it?",
          "a": "Cluster the unlabelled pool and measure label PURITY within clusters using whatever labels you have. Purity ≫ base rate → it holds. Purity ≈ base rate → SSL can't help."
        },
        {
          "q": "What is that check's analogue elsewhere?",
          "a": "HOMOPHILY in the graph lesson — the same statistic computed over edges instead of clusters. Both ask whether the structure carries label information at all."
        },
        {
          "q": "What is consistency regularization?",
          "a": "Require predictions to be stable under label-preserving perturbations, applied to unlabelled points. It's an augmentation-encoded invariance, which is why SSL tracks augmentation quality."
        },
        {
          "q": "What does FixMatch pair?",
          "a": "A WEAK augmentation produces the pseudo-label; a STRONG one must match it; a confidence threshold gates which points participate."
        },
        {
          "q": "What is the threshold actually doing?",
          "a": "Limiting how fast errors propagate — it restricts pseudo-labelling to points the model is already confident about. Which is why an uncalibrated, overconfident model breaks it at any setting."
        },
        {
          "q": "★ What is confirmation bias here?",
          "a": "Self-training fits on its own predictions, so an early error becomes a training label and reinforces itself. There is no external signal anywhere in the loop to correct it."
        },
        {
          "q": "How do you detect it?",
          "a": "Track the pseudo-label CLASS DISTRIBUTION against the labelled prior each round. Drift toward one class appears well before any validation metric moves. Training loss falls throughout."
        },
        {
          "q": "★ What did realistic evaluation show?",
          "a": "Much of SSL's reported advantage disappears when the supervised baseline gets the same architecture, augmentation and tuning budget (Oliver et al.)."
        },
        {
          "q": "Name the sharpest protocol flaw.",
          "a": "Tuning SSL hyperparameters on a large labelled validation set while claiming a hundred-label regime. It contradicts the premise that labels are scarce."
        },
        {
          "q": "When does SSL reliably HURT?",
          "a": "Class distribution mismatch — when the unlabelled pool contains classes absent from the labelled set. It reliably underperforms supervised-only."
        },
        {
          "q": "What baseline is usually missing?",
          "a": "Transfer learning. A pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch, and it's the option a practitioner actually has."
        }
      ],
      "standard": [
        {
          "q": "When does semi-supervised learning help, and how do you know in advance?",
          "a": "IT HELPS WHEN THE UNLABELLED DATA'S GEOMETRY CARRIES INFORMATION ABOUT THE LABEL, and that is a checkable property rather than a hope. The three standard assumptions — cluster, low-density and manifold — are the same idea from different directions: that the decision boundary sits where the data is sparse, so seeing where the data IS constrains where the boundary CAN BE. If the geometry is uninformative about the label, unlabelled points tell you nothing about the boundary and no method recovers that. THE CHECK IS CHEAP AND ALMOST NEVER RUN: cluster the unlabelled pool, then measure label purity within clusters using whatever labelled data you have, and compare against the base rate. Purity well above the base rate means the assumption holds. Purity near the base rate means it does not, and pseudo-labelling will propagate noise. THAT IS THE SAME STATISTIC AS HOMOPHILY in the graph lesson, computed over clusters instead of edges — both answer whether the structure you are about to exploit carries label information at all. THE SECOND PRECONDITION is that the unlabelled pool comes from the same distribution as the labelled data: class mismatch, where the pool contains classes absent from the labelled set, reliably makes SSL worse than supervised-only.",
          "deepDive": {
            "q": "Which precondition is most often violated, and how do you check it?",
            "a": "The distribution-match precondition is the one most often violated in practice because unlabelled data is usually collected differently from labelled data — it is whatever was cheap to gather, and the labelled set is whatever someone chose to annotate, which is frequently a curated or filtered subset. So the two differ systematically in ways nobody documented. Checking it is a domain-classifier exercise: train a model to distinguish labelled from unlabelled examples, and an AUC well above 0.5 means they are distinguishable, which is exactly the diagnostic from the distribution-shift lesson used for a different purpose. If they are distinguishable, the honest options are to subset the unlabelled pool to the overlapping region, to reweight, or to accept that SSL is being applied across a shift and expect degradation. None of that is exotic and all of it is skipped when the unlabelled pool is treated as free data rather than as a second dataset with its own provenance."
          }
        },
        {
          "q": "Explain confirmation bias in self-training and how you would detect it.",
          "a": "SELF-TRAINING FITS ON ITS OWN PREDICTIONS, AND THERE IS NO EXTERNAL SIGNAL ANYWHERE IN THE LOOP. The model labels unlabelled points, those pseudo-labels become training targets, the model trains on them, and the next round's pseudo-labels come from a model that has been reinforced in whatever it already believed. An early error is therefore not corrected but amplified, and the amplification compounds across rounds. THE FAILURE IS CHARACTERISTICALLY SILENT: training loss falls monotonically the whole way, because the model is getting better at predicting labels it generated, and every internal signal looks healthy. THE DIAGNOSTIC IS THE PSEUDO-LABEL CLASS DISTRIBUTION compared against the labelled set's prior, checked every round. Drift toward one class is the tell, and it appears well before any validation metric moves — a model that starts slightly favouring a majority class will pseudo-label it more, train on it more, and collapse toward it. THE MITIGATIONS ARE ALL ABOUT LIMITING THE RATE: a confidence threshold so only high-certainty points participate, class-balanced pseudo-label selection so the distribution cannot drift, and a held-out labelled validation set that never enters the loop, which is the only genuinely external correction available.",
          "deepDive": {
            "q": "Is the confidence threshold the guarantee it looks like?",
            "a": "The confidence threshold is doing more work than it appears and it interacts badly with a fact from the trustworthy-AI module: modern networks are systematically overconfident, so a threshold of 0.95 admits far more than 5% error. That means the threshold is not the guarantee it looks like, and calibrating the model — temperature scaling on the labelled validation set, which took ECE from 0.087 to 0.011 there — makes the threshold mean approximately what it says. That is a genuinely useful and cheap coupling between two lessons: the SSL threshold's effectiveness depends on a calibration step nobody in the SSL literature mentions. The other mitigation worth naming is to REGENERATE pseudo-labels from scratch each round rather than accumulating them, so an early mistake can be revised rather than being frozen into the training set permanently. Accumulating is more stable and more prone to lock-in, which is the trade to state explicitly rather than inherit from an implementation."
          }
        },
        {
          "q": "How would you evaluate a claimed SSL improvement?",
          "a": "BY CHECKING WHAT THE BASELINE WAS GIVEN, because that is where most reported gains went when the field looked properly. The realistic-evaluation protocol is the reference: give the purely supervised baseline the SAME architecture, the SAME augmentation, and the SAME tuning budget as the SSL method. Strong augmentation alone explains a large share of the reported advantage in several methods, because the augmentation is doing the regularizing and the SSL machinery is along for the ride — so a baseline trained without it is not a comparison. AND THE TUNING BUDGET MATTERS ENORMOUSLY: SSL papers frequently tune their method extensively against a lightly-tuned baseline, which is a comparison of effort rather than of methods. THE SHARPEST PROTOCOL FLAW is the validation set: tuning SSL hyperparameters on a large labelled validation set while claiming a hundred-label regime contradicts the premise. If labels were that scarce you would not have a thousand of them to tune on, so the reported regime is not the regime the method was developed in. I'D ALSO REQUIRE TRANSFER LEARNING AS A BASELINE, since a pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch and is the option a practitioner actually has, and a labelled-set-size sweep, because SSL's advantage is largest when labels are very scarce and shrinks as they grow.",
          "deepDive": {
            "q": "Which single plot is the most informative, and usually absent?",
            "a": "That last sweep is the most informative single plot in an SSL evaluation and it is often absent. Performance against labelled-set size, with and without the method, shows where the crossover is — and the crossover is the decision-relevant quantity, because it tells you whether to spend the next month on the method or on labelling. If SSL buys the equivalent of three hundred extra labels and three hundred labels cost a week of annotation, the method is not worth implementing, and that comparison is the one a manager should be shown. Framing SSL's value in LABEL-EQUIVALENT terms rather than in accuracy points makes it directly comparable to the alternative use of the budget, which is the argument that actually decides projects. It also connects to active learning, which spends the labelling budget more efficiently rather than avoiding it, and the two are complements rather than competitors: choose what to label with active learning, use the rest with SSL, and measure both against simply labelling randomly."
          }
        },
        {
          "q": "SSL or self-supervised pretraining?",
          "a": "USUALLY PRETRAINING FIRST, AND THE DISTINCTION IS WORTH KEEPING SHARP BECAUSE THE TERMS GET CONFLATED. Self-supervised pretraining learns a REPRESENTATION from unlabelled data using a pretext task — contrastive, masked prediction, or a generative objective — with no reference to the downstream labels, and then you fine-tune supervised on the labelled set. Semi-supervised learning uses unlabelled data DURING supervised training, with the labels shaping how the unlabelled data is used. THE PRACTICAL ARGUMENT FOR PRETRAINING is that the representation is reusable across tasks, the training is stable and has no confirmation-bias loop, and the pretrained model can come from someone else's compute — which is decisive, since a strong public backbone plus fine-tuning on your labels is a very high baseline that costs almost nothing. THE ARGUMENT FOR SSL is that it uses unlabelled data from YOUR distribution specifically, which matters when the deployment domain is far from any available pretraining corpus — industrial sensing, specialized medical imaging, proprietary signal data. THEY COMPOSE: pretrain on the unlabelled pool, fine-tune on labels, then apply consistency regularization on the remaining unlabelled data, and each step is checkable independently.",
          "deepDive": {
            "q": "What is the honest current state of that choice?",
            "a": "The honest current state is that for images, text and audio, pretraining has largely absorbed the practical role SSL was invented for, because public backbones cover so much of the input space that starting from scratch is rarely correct. Where SSL retains a clear edge is narrow domains with abundant unlabelled in-distribution data and no relevant pretrained model — and that set is shrinking as multimodal backbones broaden. That is not a reason to dismiss the methods; it is a reason to sequence the evaluation properly, since a paper comparing SSL-from-scratch against supervised-from-scratch answers a question nobody faces. The related point for a practitioner is that the two use unlabelled data for different things: pretraining learns what the input space looks like, SSL learns where the boundary is. If your problem is that the model does not understand the inputs, pretraining is the fix; if it understands the inputs and has too few labels to place the boundary, SSL is. Diagnosing which of those you have takes one experiment — fine-tune a pretrained backbone and see whether the remaining error looks like representation failure or boundary uncertainty."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE MODULE'S SPINE IN ITS PUREST FORM, BECAUSE HERE THE STRUCTURE IS NOT INCIDENTAL TO THE DOMAIN — IT IS THE METHOD. Time series exploit ordering, graphs exploit edges, audio exploits the recording's coherence; those are properties of the data that a method uses. Semi-supervised learning has no content beyond the structural assumption: unlabelled data helps if and only if the geometry constrains the label, and the cluster, low-density and manifold assumptions are three ways of saying that. So the question 'does the structure I am exploiting actually hold' is not a caveat here, it is the entire feasibility check — and it is answered by one clustering run and a purity comparison against the base rate. WHAT THIS LESSON ADDS is the failure direction. In the other domains, ignoring the structure produced an over-optimistic MEASUREMENT — 0.9999 against 0.5807, or a centred window hiding a harm. Here, a structure that does not hold makes the MODEL ITSELF worse, because pseudo-labelling propagates errors with no external correction. THE STRUCTURE IS THE PRIOR AND THE TRAP, and when the prior is false the trap closes on the model rather than on the evaluation.",
          "deepDive": {
            "q": "Why does that distinction change how much effort to spend?",
            "a": "That distinction is worth carrying because it changes what the check buys you. In the leakage domains, checking the structure protects your knowledge of how good the model is; the model itself is unaffected. In SSL — and in the graph lesson's heterophily case, which is the same shape — checking the structure protects the model. Those are different stakes and they justify different amounts of effort: a wrong split costs you a bad decision, and a wrong structural assumption costs you a worse model than you started with. The pleasing part is that both checks are the same statistic in different clothing, cluster purity and homophily, and both are one line. If this module leaves one operational habit, it should be to compute the structure statistic before choosing the method — purity for clustered data, homophily for graphs, autocorrelation for series, group signature strength for grouped data — because it decides both whether the method can work and how the evaluation must be built."
          }
        },
        {
          "q": "What would you actually do with a large unlabelled pool and a small labelling budget?",
          "a": "SPEND THE BUDGET WELL BEFORE TRYING TO AVOID SPENDING IT. FIRST, THE TWO CHECKS: cluster purity against the base rate, which says whether the geometry is informative, and a domain classifier between labelled and unlabelled data, which says whether they are the same distribution. Together they take an afternoon and they determine whether anything downstream can work. SECOND, THE STRONGEST CHEAP BASELINE: a pretrained backbone fine-tuned on whatever labels exist. That is usually better than SSL from scratch and it costs an afternoon. THIRD, SPEND THE LABELLING BUDGET WITH ACTIVE LEARNING rather than randomly — uncertainty or coreset selection typically reaches a given accuracy with meaningfully fewer labels, and unlike SSL it adds real information rather than redistributing existing information. FOURTH, APPLY CONSISTENCY REGULARIZATION on the remaining unlabelled data, with a calibrated confidence threshold and class-balanced selection, monitoring pseudo-label class drift every round. AND THROUGHOUT, MEASURE IN LABEL-EQUIVALENT TERMS: how many labels is this method worth? That number is comparable to the cost of annotation and is the one that decides whether to continue.",
          "deepDive": {
            "q": "What caveat comes with active learning?",
            "a": "The active-learning caveat worth stating is that it interacts badly with the evaluation discipline this module is built on. An actively-selected labelled set is not a random sample of the population — it is deliberately concentrated on hard or uncertain regions — so a validation set drawn from it is biased and will understate performance, sometimes substantially. The fix is to keep a separate randomly-sampled labelled set purely for evaluation, spent from the same budget and never used for training or selection. That feels wasteful and is the only way to know what the model does on the actual population, which is the same argument as the permanent randomized holdout in the recommender lesson and the random allow-through slice in the fraud case — the third appearance of 'reserve a random sample or you cannot measure anything' in this curriculum. When a recommendation recurs that often across unrelated domains, it has stopped being domain advice and become a principle."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ SSL's three assumptions (which are one)",
        "back": "CLUSTER (same cluster ⇒ same label) · LOW-DENSITY (the boundary sits where p(x) is small) · MANIFOLD (y varies smoothly along it). Unlabelled data helps iff the geometry constrains the label."
      },
      {
        "type": "intuition",
        "front": "★ The feasibility check",
        "back": "Cluster the unlabelled pool, measure label PURITY within clusters, compare to the base rate. Purity ≫ base rate → SSL should help. Purity ≈ base rate → it can't, and pseudo-labelling will propagate noise."
      },
      {
        "type": "intuition",
        "front": "Its analogue elsewhere",
        "back": "HOMOPHILY in the graph lesson — the same statistic over edges instead of clusters. Both ask: does the structure I'm about to exploit carry label information at all?"
      },
      {
        "type": "formula",
        "front": "Consistency regularization / FixMatch",
        "back": "L = L_sup + λ·E_u[ 1{max p(y|α(x)) > τ} · H(ŷ_α, p(y|A(x))) ]. WEAK augmentation makes the pseudo-label, STRONG must match, and τ gates participation."
      },
      {
        "type": "pitfall",
        "front": "★ The threshold needs a CALIBRATED model",
        "back": "τ limits how fast errors propagate — but modern nets are systematically overconfident, so τ=0.95 admits far more than 5% error. Temperature scaling (ECE 0.087→0.011) makes the threshold mean what it says."
      },
      {
        "type": "pitfall",
        "front": "Confirmation bias",
        "back": "Self-training fits on its OWN predictions with no external signal in the loop, so early errors amplify. Training loss falls monotonically the whole time — every internal signal looks healthy."
      },
      {
        "type": "intuition",
        "front": "How to detect it",
        "back": "Track the pseudo-label CLASS DISTRIBUTION against the labelled prior each round. Drift appears well before any validation metric moves. Fixes: class-balanced selection, and REGENERATE pseudo-labels each round rather than accumulating."
      },
      {
        "type": "pitfall",
        "front": "★ What realistic evaluation showed",
        "back": "Much of SSL's reported advantage disappears once the supervised baseline gets the same architecture, augmentation and TUNING BUDGET (Oliver et al.). Strong augmentation alone explains much of the gain."
      },
      {
        "type": "pitfall",
        "front": "The sharpest protocol flaw",
        "back": "Tuning SSL hyperparameters on a LARGE labelled validation set while claiming a hundred-label regime. If labels were that scarce you wouldn't have a thousand to tune on."
      },
      {
        "type": "pitfall",
        "front": "When SSL reliably HURTS",
        "back": "Class distribution mismatch — the unlabelled pool contains classes absent from the labelled set. Check it with a domain classifier between labelled and unlabelled data (AUC ≫ 0.5 = distinguishable)."
      },
      {
        "type": "intuition",
        "front": "Report in LABEL-EQUIVALENT terms",
        "back": "\"This method is worth ~300 labels.\" That's directly comparable to the cost of annotation and is the number that decides the project — unlike accuracy points, which aren't."
      },
      {
        "type": "intuition",
        "front": "★ The failure direction is different here",
        "back": "Elsewhere, ignoring the structure gives an over-optimistic MEASUREMENT. Here a false assumption makes the MODEL worse. A wrong split costs a bad decision; a wrong structural assumption costs you a worse model than you started with."
      }
    ],
    "refs": [
      {
        "title": "Oliver, Odena, Raffel, Cubuk & Goodfellow (2018), Realistic Evaluation of Deep Semi-Supervised Learning Algorithms",
        "url": "https://arxiv.org/abs/1804.09170"
      },
      {
        "title": "Sohn et al. (2020), FixMatch: Simplifying Semi-Supervised Learning with Consistency and Confidence",
        "url": "https://arxiv.org/abs/2001.07685"
      },
      {
        "title": "Chapelle, Scholkopf & Zien (2006), Semi-Supervised Learning",
        "url": "https://mitpress.mit.edu/9780262033589/semi-supervised-learning/"
      },
      {
        "title": "Arazo et al. (2020), Pseudo-Labeling and Confirmation Bias in Deep Semi-Supervised Learning",
        "url": "https://arxiv.org/abs/1908.02983"
      },
      {
        "title": "Chen, Kornblith, Norouzi & Hinton (2020), A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)",
        "url": "https://arxiv.org/abs/2002.05709"
      }
    ],
    "demos": [
      "label-propagation",
      "active-learning",
      "coreset",
      "kmeans"
    ]
  }
};
