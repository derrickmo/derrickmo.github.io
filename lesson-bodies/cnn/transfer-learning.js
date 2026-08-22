// GENERATED from content/lessons/cnn/transfer-learning.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/cnn/transfer-learning/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "transfer-learning": {
    "interview": {
      "quickGrind": [
        {
          "q": "Why do pretrained features transfer at all?",
          "a": "Early layers learn edges, colour and texture, which are properties of natural images rather than of the labels. Almost any vision task needs the same primitives, so that work is reusable."
        },
        {
          "q": "Feature extraction versus fine-tuning, in one line each?",
          "a": "Feature extraction freezes the backbone and trains a head — fast, tiny, safe on small data. Fine-tuning updates the backbone too — more capacity to adapt, more data required, more ways to break it."
        },
        {
          "q": "What learning rate for the backbone?",
          "a": "Much lower than the head's, typically 10x. The head is random and needs to move; the backbone is already good and a large step destroys what you are trying to keep."
        },
        {
          "q": "What is discriminative or layer-wise learning rate decay?",
          "a": "Give each layer its own rate, increasing with depth — lowest at the bottom, highest at the top. It follows the transferability gradient: general features should barely move, specific ones should."
        },
        {
          "q": "When does transfer actively hurt?",
          "a": "When the source and target domains differ in low-level statistics — medical scans, satellite imagery, spectrograms — and the target set is large enough to learn its own features. Then the pretrained prior is a bias, not a head start."
        },
        {
          "q": "Should you freeze batch norm when fine-tuning?",
          "a": "Usually put BN in eval mode if the batch is small or the domain shifted, because updating running statistics on a few unrepresentative samples corrupts them. It is one of the most common silent bugs in transfer."
        },
        {
          "q": "How much target data before full fine-tuning beats a frozen backbone?",
          "a": "There is no universal number — it depends on domain distance more than count. Measure it: run both across a label-budget sweep and read the crossover off the curve."
        },
        {
          "q": "What is LP-FT?",
          "a": "Linear-probe then fine-tune: train the head with the backbone frozen, then unfreeze. It stops the random head's large early gradients from distorting good features, and Kumar et al. showed it helps out-of-distribution accuracy in particular."
        },
        {
          "q": "Why does a random head damage a pretrained backbone?",
          "a": "Its initial gradients are large and essentially meaningless, and they flow straight into the backbone. A few hundred steps of that can undo pretraining before the head has learned anything worth propagating."
        },
        {
          "q": "Do you need to match the pretraining input resolution?",
          "a": "Not exactly, but close helps — the filters and any position embeddings were learned at a scale. Large changes want interpolation of position embeddings and usually a short adaptation phase."
        },
        {
          "q": "What about the classifier head itself?",
          "a": "Initialize it small or zero-ish and warm it up first. A zero-initialized final layer starts the model at the pretrained function and learns a perturbation, which is the residual argument applied to fine-tuning."
        },
        {
          "q": "How do you pick which layers to freeze?",
          "a": "Sweep it rather than guess: freeze the first k blocks for several k and read the curve. The optimum moves with domain distance and dataset size, so it is a measurement, not a rule."
        }
      ],
      "standard": [
        {
          "q": "You have a pretrained backbone and 2,000 labelled images for a new task. Walk me through it.",
          "a": "With 2,000 labels the default is a frozen backbone and a trained head, because full fine-tuning at that scale usually overfits and can degrade features that were better than anything the target set can teach. But I would not stop at the default — I would establish the curve, because that is the decision-relevant object. Concretely: start with a linear probe on frozen features as the baseline, which trains in minutes and sets the floor. Then run LP-FT — keep the probe, unfreeze the backbone at a low rate with layer-wise decay, and warm up — which is the version most likely to win. Then a partial unfreeze of the last block or two as a middle point. Compare all three on a properly grouped split, and if the images cluster by patient, site, session or camera, split on that, because a random split here inflates every number and the effect is large. Two details decide whether this works. Put batch norm in eval mode unless the batch is large and the domain close, since updating running statistics on small unrepresentative batches is a silent and common way to lose accuracy. And use strong augmentation, because with 2,000 labels augmentation is doing more work than the architecture choice. Finally, be explicit about the alternative: if the frozen probe is close to the fine-tuned model, the honest recommendation is to spend the next week on labels rather than on training, since the curve tells you which one buys more.",
          "deepDive": {
            "q": "Why does LP-FT help out-of-distribution specifically?",
            "a": "Kumar et al.'s argument is that a randomly initialized head produces large, uninformative gradients that distort the pretrained features before the head is any good — and the distortion is concentrated in the directions the target set happens to cover. In-distribution that is harmless or even helpful, because those are the directions being evaluated. Out of distribution it is a real loss, because the features that transferred were the ones you just overwrote. Fitting the head first means that by the time the backbone unfreezes, the gradients arriving at it are already meaningful."
          }
        },
        {
          "q": "Explain the transferability gradient and how you would measure it for your own problem.",
          "a": "Layers differ in how general their features are. The first layers learn Gabor-like edge and colour detectors that are essentially universal across natural images; the last layers learn combinations specific to the pretraining label set, and the final classifier is entirely specific. So transferability decreases with depth, which is why the standard recipes freeze from the bottom and adapt from the top. Yosinski et al. measured this directly by transferring the first k layers and retraining the rest, and found two distinct effects that are worth separating: features become less general with depth, and there is a separate penalty from splitting CO-ADAPTED layers — cutting a network in the middle hurts even when transferring to the SAME task, because neighbouring layers had learned to work together. Fine-tuning removes that second penalty, which is part of why it beats freezing when you have the data for it. To measure it on your own problem the experiment is cheap: freeze the first k blocks for k = 0, 1, 2, ... and plot target accuracy against k. The shape tells you what you need. A flat curve means the pretrained features are already sufficient and you should not be fine-tuning at all. A curve that rises then falls locates the sweet spot directly. And a monotonically decreasing curve — best at k = 0 — says the source domain is far enough away that you are better off training from scratch, which is the answer people most often fail to consider.",
          "deepDive": {
            "q": "What does it mean if the best k is zero but from-scratch is still worse?",
            "a": "That pretraining is helping as an INITIALIZATION rather than as a feature extractor. The weights are a better starting point than random even though none of them should be held fixed, which is common for distant domains with moderate data. The practical read is: unfreeze everything, but keep the low learning rate and the warmup, because you are still trying to preserve the optimization advantage rather than the features."
          }
        },
        {
          "q": "What goes wrong with batch normalization during transfer?",
          "a": "Batch norm carries two kinds of state and they fail differently. The learned scale and shift are ordinary parameters and behave like any other weights. The running mean and variance are buffers estimated from the data, and they are the problem. In train mode, every forward pass updates them from the current batch — so fine-tuning with a batch size of 8 on a domain whose statistics differ from ImageNet's replaces well-estimated population statistics with a noisy estimate from a handful of unrepresentative images, and the damage accumulates over steps without appearing in the loss in any legible way. The classic symptom is a model whose training accuracy looks fine and whose eval accuracy is much worse, because eval uses the corrupted running statistics while training used the batch ones. The fixes are simple once you know: put BN modules in eval mode so the buffers freeze; or if the domain has genuinely shifted and you have enough data, recompute the statistics deliberately by running forward passes over the target set with a large batch before evaluating. This is also a good argument for architectures using group or layer normalization when small-batch fine-tuning is the expected workflow, since neither keeps cross-batch state and neither has this failure mode at all."
        },
        {
          "q": "When would you train from scratch instead?",
          "a": "Three situations. First, when the input is not natural images in any meaningful sense — raw spectrograms, tabular data reshaped into a grid, scientific instrument output — because the low-level statistics the backbone learned do not describe your data and the prior is a handicap rather than a head start. Second, when you have enough target data that the pretrained prior stops mattering: at millions of in-domain examples the model can learn better features than any transferred set, and the freeze sweep will show it by peaking at k = 0. Third, when architecture is constrained by deployment in a way no pretrained checkpoint matches — an unusual input resolution, a hard latency budget, a device that needs a specific operator set — and adapting a large backbone is more work than training the right small model. The honest caveat is that from-scratch is chosen far more often than it should be, usually early in a project when nobody has measured. The cheap discipline is to run the frozen linear probe first: it costs an afternoon, and if it already beats the from-scratch model you were planning, that settles the question before anyone spends a month on it."
        },
        {
          "q": "How do you tell whether transfer actually helped?",
          "a": "Against the right baselines, and there are three that matter. The first is the same architecture trained from scratch on the target data, which is the comparison people usually mean. The second is a randomly initialized frozen backbone with a trained head — a surprisingly strong baseline, because random convolutional features are not useless, and if pretrained-frozen barely beats random-frozen then the pretraining is contributing much less than assumed. The third is a simple non-deep baseline, which on small tabular-like or highly structured problems sometimes wins outright. Then check that the comparison is fair: the same augmentation, the same schedule length, the same tuning budget for each arm, since an under-tuned from-scratch baseline is the standard way transfer results get inflated. Report the label-efficiency curve rather than a single number, because the interesting claim is almost always 'transfer reaches the from-scratch model's accuracy with a tenth of the labels' rather than 'transfer is two points better', and the curve makes the trade legible to whoever is deciding whether to fund more labelling. And if the split is not grouped correctly for the domain, none of these numbers mean anything, so that check comes first."
        },
        {
          "q": "Full fine-tuning or a parameter-efficient method for vision?",
          "a": "The choice is usually made by serving rather than by accuracy. If you are adapting one backbone to one task and will deploy that one model, full fine-tuning is simplest and generally the accuracy ceiling. Parameter-efficient methods — adapters, LoRA on the attention or convolutional projections, or just training the biases — earn their place when you have many tasks and one backbone, because they let you keep a single set of frozen weights in memory and swap a few megabytes per task, and because LoRA in particular can be merged back into the weights so inference costs nothing extra. They also bound the damage: a method that can only modify a small subspace cannot destroy the pretrained features, which makes it a reasonable default when the target set is small or noisy. The trade to state honestly is that PEFT accuracy on a single well-resourced task is usually at or slightly below full fine-tuning, so if the accuracy is what you are optimizing and you only have one task, the parameter count is not the constraint and you should just fine-tune. The parameter-efficiency argument is about deployment economics and about bounding interference, not about being more accurate."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why features transfer",
        "back": "Early layers learn edges, colour and texture — properties of natural images, not of the labels. Almost any vision task needs the same primitives."
      },
      {
        "type": "definition",
        "front": "Transferability gradient",
        "back": "Generality decreases with depth: universal edge detectors at the bottom, pretraining-label-specific combinations at the top. Freeze from the bottom, adapt from the top."
      },
      {
        "type": "definition",
        "front": "LP-FT",
        "back": "Linear-probe then fine-tune. Fitting the head first stops a random head's large gradients from distorting good features; helps OOD accuracy in particular."
      },
      {
        "type": "definition",
        "front": "Layer-wise LR decay",
        "back": "Per-layer learning rates increasing with depth. Encodes the transferability gradient directly: general features barely move, specific ones do."
      },
      {
        "type": "intuition",
        "front": "Co-adaptation penalty",
        "back": "Yosinski's second effect: splitting neighbouring layers hurts even when transferring to the SAME task, because they had learned to work together. Fine-tuning removes it."
      },
      {
        "type": "intuition",
        "front": "Read the freeze sweep",
        "back": "Flat = features already sufficient. Rise-then-fall = a real sweet spot. Monotonically decreasing = the source domain is too far; consider from scratch."
      },
      {
        "type": "formula",
        "front": "Backbone learning rate",
        "back": "Roughly 10x below the head's, with warmup. The head is random and must move; the backbone is good and a large step destroys it."
      },
      {
        "type": "intuition",
        "front": "Zero-init the head",
        "back": "Starts the model at the pretrained function and learns a perturbation — the residual argument applied to fine-tuning."
      },
      {
        "type": "pitfall",
        "front": "Batch norm in train mode",
        "back": "Running statistics get overwritten from small unrepresentative batches. Training looks fine, eval collapses. Put BN in eval mode or recompute the statistics deliberately."
      },
      {
        "type": "pitfall",
        "front": "Ungrouped split",
        "back": "If images cluster by patient, site, session or camera, a random split leaks the group signature and inflates every arm of the comparison."
      },
      {
        "type": "pitfall",
        "front": "Under-tuned from-scratch baseline",
        "back": "The standard way transfer results get inflated. Equal augmentation, equal schedule, equal tuning budget — or the comparison says nothing."
      },
      {
        "type": "pitfall",
        "front": "PEFT for accuracy",
        "back": "On one well-resourced task, PEFT sits at or slightly below full fine-tuning. Its case is deployment economics and bounded interference, not accuracy."
      }
    ],
    "refs": [
      {
        "title": "Yosinski et al. (2014) — How Transferable Are Features in Deep Neural Networks?",
        "url": "https://arxiv.org/abs/1411.1792"
      },
      {
        "title": "Kumar et al. (2022) — Fine-Tuning Can Distort Pretrained Features and Underperform Out-of-Distribution",
        "url": "https://arxiv.org/abs/2202.10054"
      },
      {
        "title": "Kornblith, Shlens & Le (2019) — Do Better ImageNet Models Transfer Better?",
        "url": "https://arxiv.org/abs/1805.08974"
      },
      {
        "title": "Raghu et al. (2019) — Transfusion: Understanding Transfer Learning for Medical Imaging",
        "url": "https://arxiv.org/abs/1902.07208"
      },
      {
        "title": "Howard & Ruder (2018) — Universal Language Model Fine-tuning (ULMFiT; discriminative LRs)",
        "url": "https://arxiv.org/abs/1801.06146"
      }
    ],
    "demos": []
  }
};
