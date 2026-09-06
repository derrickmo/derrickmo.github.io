// GENERATED from content/lessons/advanced-nlp/fine-tuning-transformers.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/fine-tuning-transformers/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "fine-tuning-transformers": {
    "level": "core",
    "body": {
      "intuition": [
        "Fine-tuning is the whole reason pretraining is worth doing: you spend enormous compute once to learn a general representation, then spend a few GPU-minutes per task adapting it. The mechanics are almost embarrassingly simple - attach a randomly-initialized head, train everything with a small learning rate for a few epochs - and the recipe (AdamW, 2e-5, 3 epochs, warmup then linear decay) is so stable across tasks that it has become folklore.",
        "The part that is NOT folklore, and that most people learn the hard way, is that this procedure is genuinely UNSTABLE when the dataset is small. On the small GLUE tasks, fine-tuning BERT-large diverges to majority-class performance on a substantial minority of random seeds - Dodge et al. found that changing only the seed produced a range of results wider than the gaps between competing published methods. That is a serious claim about a whole literature: a paper reporting a one-point improvement from a single run may be reporting a lucky seed. Once you have seen it, you stop trusting any small-data fine-tuning number that comes without a spread.",
        "The other thing worth internalizing early is that you are ADJUSTING a representation, not learning one, and that framing explains almost every hyperparameter. The learning rate is ~100x smaller than you would use from scratch because large steps destroy what you paid for. Warmup exists because the random head emits large, meaningless gradients in the first few steps and those flow straight into the pretrained body. Layer-wise decay exists because lower layers encode general features that need almost no change while upper layers are task-specific. Early stopping exists because with a few thousand examples and 110 million parameters, three epochs is often one too many."
      ],
      "math": [
        {
          "h": "Layer-wise learning rate decay",
          "paras": [
            "Give each layer its own learning rate, decaying geometrically as you go down the stack. Lower layers encode general lexical and syntactic features that transfer as-is; upper layers are specialized to the pretraining objective and need the most adjustment. This is ULMFiT's discriminative fine-tuning, and it remains one of the cheapest stability wins available."
          ],
          "tex": "\\eta_{\\ell} = \\eta_{\\mathrm{top}} \\cdot \\xi^{\\,L-\\ell}, \\qquad \\xi \\in [0.65, 0.95]",
          "texNote": "With L = 12 and xi = 0.9, layer 1 trains at 0.9^11 ~ 0.31 of the top rate; with xi = 0.65 it is 0.65^11 ~ 0.009, i.e. effectively frozen. Smaller xi means stronger regularization toward the pretrained weights - use it when data is scarce."
        },
        {
          "h": "Warmup, and what it is protecting against",
          "paras": [
            "The head is random, so its initial gradients are large and point nowhere useful, and they propagate into the pretrained body. Warmup keeps the step size near zero while the head finds its bearings; the decay afterwards is standard annealing."
          ],
          "tex": "\\eta(t) = \\eta_{\\max} \\cdot \\min\\!\\left(\\frac{t}{t_w},\\; \\frac{T - t}{T - t_w}\\right), \\qquad t_w \\approx 0.06\\,T",
          "texNote": "6-10% of total steps is the usual warmup fraction. Mosbach et al. showed that omitting warmup - or omitting Adam's bias correction, which BERT's original TensorFlow implementation did - is a direct cause of the divergent runs on small datasets."
        },
        {
          "h": "Why fine-tuning can be WORSE than a linear probe out of distribution",
          "paras": [
            "Kumar et al. (2022) gave the clean account. Fine-tuning updates the features to fit the head; when the head starts random, the early updates distort the pretrained features to accommodate a meaningless target. In-distribution this is harmless because the features re-fit the data, but OUT of distribution the distorted features have lost generality. The fix, LP-FT, is to train the head first with the body frozen, then fine-tune everything."
          ],
          "tex": "\\text{ID: } \\mathrm{FT} \\ge \\mathrm{LP} \\qquad \\text{OOD: } \\mathrm{LP} \\text{ can beat } \\mathrm{FT} \\qquad \\text{LP-FT} \\ge \\text{both}",
          "texNote": "The mechanism is that a random head's gradient has a large component orthogonal to anything useful, and the body absorbs it. Two lines of code - freeze, train head, unfreeze - buy most of the fix."
        }
      ],
      "code": [
        {
          "h": "The recipe, with the stability measures included",
          "paras": [
            "This is the version worth using by default, not the minimal one. Every extra piece here is answering a documented failure mode."
          ],
          "code": "from torch.optim import AdamW\nfrom transformers import get_linear_schedule_with_warmup\n\ndef param_groups(model, base_lr=2e-5, decay=0.9, wd=0.01):\n    \"\"\"Layer-wise LR decay + no weight decay on bias/LayerNorm.\"\"\"\n    no_decay = (\"bias\", \"LayerNorm.weight\")\n    groups, L = [], model.config.num_hidden_layers\n    for name, p in model.named_parameters():\n        if not p.requires_grad:\n            continue\n        if \"embeddings\" in name:            depth = 0\n        elif \"encoder.layer.\" in name:      depth = int(name.split(\"encoder.layer.\")[1].split(\".\")[0]) + 1\n        else:                               depth = L + 1        # head\n        groups.append({\n            \"params\": [p],\n            \"lr\": base_lr * decay ** (L + 1 - depth),\n            \"weight_decay\": 0.0 if any(n in name for n in no_decay) else wd,\n        })\n    return groups\n\nopt = AdamW(param_groups(model), eps=1e-8)   # AdamW applies bias correction -\n                                             # BERT's original impl did NOT, and\n                                             # that omission caused divergent runs\ntotal = len(loader) * EPOCHS\nsched = get_linear_schedule_with_warmup(opt, int(0.1 * total), total)\n\nfor epoch in range(EPOCHS):\n    for batch in loader:\n        loss = model(**batch).loss\n        loss.backward()\n        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)\n        opt.step(); sched.step(); opt.zero_grad()",
          "caption": "Warmup, bias correction, gradient clipping, layer-wise decay, and no weight decay on bias/LayerNorm. None of these is exotic; together they are most of the difference between a recipe that converges on every seed and one that does not."
        },
        {
          "h": "Measuring the seed variance instead of hoping it is small",
          "paras": [
            "If you take one thing from this lesson into practice, make it this. The cost is a few extra runs; the benefit is knowing whether your improvement exists."
          ],
          "code": "import numpy as np\n\nscores = []\nfor seed in range(5):\n    torch.manual_seed(seed)\n    model = AutoModelForSequenceClassification.from_pretrained(CKPT, num_labels=K)\n    scores.append(train_and_eval(model, seed))\n\nprint(f\"{np.mean(scores):.3f} +/- {np.std(scores):.3f}   min={min(scores):.3f}\")\n\n# Representative behaviour on a small GLUE task (RTE, ~2.5k examples), BERT-large:\n#   seed 0: 0.703   seed 1: 0.688   seed 2: 0.527  <- degenerate: majority class\n#   seed 3: 0.715   seed 4: 0.531  <- degenerate\n#\n# Two of five runs collapsed. Reporting max() here would claim 0.715; reporting\n# a single unlucky run would claim 0.527. The published differences between\n# competing methods on this task are often smaller than that spread, which is\n# why single-seed small-data comparisons should not be believed.\n#\n# Mosbach et al.: the cause is largely OPTIMIZATION, not overfitting - vanishing\n# gradients early in training plus the missing Adam bias correction. Longer\n# training with warmup and proper bias correction removes most of the failures.",
          "caption": "Two of five seeds collapsing to majority class is normal on small datasets, not a bug in your code. Always report mean and spread; a single run on a few-thousand-example task carries almost no information."
        }
      ],
      "useCases": [
        "Task-specific models at production volume: a fine-tuned 110-300M encoder for classification, tagging, or extraction runs at a fraction of the latency and cost of prompting a large model, with calibrated probabilities you can threshold.",
        "Domain adaptation in two stages - continued pretraining on unlabelled in-domain text, then supervised fine-tuning on your labels. This is the highest-return sequence when your text is clinical, legal, financial, or code, and it routinely beats fine-tuning a general model directly.",
        "Intermediate-task transfer (STILT): fine-tune on a large related task first (MNLI is the classic bridge for sentence-pair tasks), then on your small target task. On small GLUE tasks this both raises the mean and dramatically reduces the seed variance.",
        "Distilling a large model's behaviour into a small one: label a corpus with an LLM, fine-tune a small encoder on those labels, and deploy the encoder. The standard path from an expensive prototype to an affordable production system."
      ],
      "pitfalls": [
        "Reporting a single fine-tuning run on a small dataset. On few-thousand-example tasks a meaningful fraction of seeds collapse to majority-class, and the seed spread often exceeds the effect you are claiming. Run 3-5 seeds and report mean and standard deviation - this is the single most important habit in this lesson.",
        "Using a from-scratch learning rate. 1e-3 will destroy the pretrained weights in the first hundred steps. The 2e-5 to 5e-5 band is not superstition; it reflects that you are adjusting a representation rather than learning one.",
        "Skipping warmup, or using an Adam implementation without bias correction. Both are documented causes of the divergent runs, and both are free to fix.",
        "Fine-tuning everything when you have 500 examples. At that size, linear probing, LP-FT (probe first, then fine-tune), or a PEFT method will usually beat full fine-tuning, and will certainly be more stable.",
        "Assuming fine-tuning always beats a frozen backbone. In distribution it usually does; OUT of distribution a linear probe can win, because early updates from a random head distort the pretrained features. LP-FT is the cheap fix and should be the default when robustness matters.",
        "Ignoring the trivial baselines. TF-IDF plus logistic regression beats fine-tuned BERT more often than people expect on topical classification, and it takes ten minutes. If you cannot beat it convincingly, the problem is your data, not your model.",
        "Training past the point of overfitting because 'the paper said three epochs'. With a small dataset, evaluate every few hundred steps and early-stop on a real validation split; with a large one, three epochs may be far too few."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/bert",
          "text": "Fine-tuning is the payoff of masked pretraining - the whole point of learning a general representation is that this step is cheap."
        },
        {
          "ref": "fine-tuning/lora",
          "text": "PEFT methods make fine-tuning tractable at LLM scale and are also more STABLE at small n, because far fewer parameters can be distorted."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The seed-variance problem is a special case of the general point that a single held-out estimate on a small dataset is a noisy statistic - the discipline is the same."
        },
        {
          "ref": "neural-nets/adam-lr-scheduling",
          "text": "Warmup, bias correction, and decay schedules are exactly the optimizer details that decide whether fine-tuning converges here."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "LLM-labels-then-fine-tune-a-small-model is the standard production path, and it is distillation with a data-generation step in front."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the standard fine-tuning recipe?",
          "a": "AdamW at 2e-5 to 5e-5, 2-4 epochs, batch 16-32, linear warmup over the first 6-10% of steps then linear decay, weight decay 0.01 (not on bias/LayerNorm), gradient clipping at 1.0."
        },
        {
          "q": "Why such a small learning rate?",
          "a": "You are ADJUSTING a pretrained representation, not learning one. A from-scratch rate overwrites the pretrained weights before the head has learned anything - that is catastrophic forgetting."
        },
        {
          "q": "Why warmup?",
          "a": "The head is randomly initialized, so its first gradients are large and badly directed, and they flow into the pretrained body. Warmup keeps steps tiny while the head orients itself."
        },
        {
          "q": "What is layer-wise learning rate decay?",
          "a": "Scale the learning rate down by a factor (~0.65-0.95) per layer going down the stack. Lower layers hold general features that need little change; upper layers are objective-specific and need the most."
        },
        {
          "q": "How unstable is small-data fine-tuning?",
          "a": "Very. On small GLUE tasks a real fraction of seeds collapse to majority-class, and the seed spread frequently exceeds the differences between published methods. Always report 3-5 seeds."
        },
        {
          "q": "What causes that instability?",
          "a": "Mostly optimization: vanishing gradients early in training and the missing Adam bias correction in BERT's original implementation - not, primarily, overfitting. Warmup, bias correction, and longer training fix most of it."
        },
        {
          "q": "What is catastrophic forgetting here?",
          "a": "Overwriting pretrained knowledge during fine-tuning, usually from too high a learning rate or too many epochs. Symptom: training loss collapses while validation degrades."
        },
        {
          "q": "What is LP-FT?",
          "a": "Linear-probe first (head only, body frozen), then fine-tune everything. It prevents the random head's early gradients from distorting the features, and beats both pure probing and pure fine-tuning out of distribution."
        },
        {
          "q": "When does linear probing beat fine-tuning?",
          "a": "When the labelled set is very small, and out of distribution generally - fine-tuning distorts pretrained features to fit an initially-random head, which costs generality."
        },
        {
          "q": "What is intermediate-task transfer / STILT?",
          "a": "Fine-tune on a large related task (MNLI is the classic) before your small target task. It raises the mean AND sharply reduces seed variance on small datasets."
        },
        {
          "q": "What is continued pretraining?",
          "a": "Running the pretraining objective on your own unlabelled in-domain corpus before supervised fine-tuning. Highest-return step when your domain is far from web text."
        },
        {
          "q": "Why exclude bias and LayerNorm from weight decay?",
          "a": "Decay is a prior toward zero, which is meaningful for weight matrices and meaningless-to-harmful for biases and normalization scales - shrinking a LayerNorm gain toward zero just suppresses the layer."
        }
      ],
      "standard": [
        {
          "q": "Fine-tuning BERT on your 3,000-example dataset gives wildly different results across runs. Diagnose and fix it.",
          "a": "FIRST: THIS IS EXPECTED, NOT A BUG IN YOUR CODE. Small-dataset fine-tuning of large pretrained transformers is a documented instability. Dodge et al. (2020) showed that varying ONLY the random seed on small GLUE tasks produces a spread of outcomes wider than the gaps between competing published methods, and that a fraction of runs collapse entirely to majority-class prediction. Recognizing this immediately is the right first move, because the alternative - hunting for a bug - wastes a day. WHAT THE SEED ACTUALLY CONTROLS, since 'the seed' is three different things. (1) The HEAD INITIALIZATION - a randomly initialized classifier whose early gradients propagate into the pretrained body. (2) The DATA ORDER - which examples appear in the first few batches, when the learning rate is rising and the model is most plastic. (3) Dropout masks. Dodge et al. found (1) and (2) both matter substantially and roughly independently. DIAGNOSIS - what I would look at, in order. (a) Plot the TRAINING LOSS of the good and bad runs together. If a bad run's loss stays flat near ln(K) and never descends, it is an OPTIMIZATION failure - the model never escaped the initial region. If the training loss descends fine but validation degrades, it is overfitting or forgetting. These have different fixes and the plot distinguishes them in seconds. (b) Check the gradient norms in the first hundred steps - the failure signature is vanishing gradients through the lower layers. (c) Check whether the degenerate runs predict a single class, which confirms collapse. THE FIXES, roughly in order of return on effort. (1) USE ADAM WITH BIAS CORRECTION. BERT's original TensorFlow optimizer omitted it, and Mosbach et al. identified that omission as a direct cause of divergence; PyTorch's AdamW includes it, so this is often free. (2) WARMUP over 10% of steps, which protects the body from the random head's opening gradients. (3) TRAIN LONGER - counterintuitively, Mosbach et al. found that more epochs (up to 20 on small tasks) with early stopping REDUCES variance rather than increasing it, because the failures are runs that never converged rather than runs that overfit. (4) LOWER THE LEARNING RATE and add layer-wise decay (xi ~ 0.9), which keeps the lower layers near their pretrained values. (5) RE-INITIALIZE THE TOP FEW LAYERS. Zhang et al. showed that discarding the top 3-6 pretrained layers and reinitializing them improves both mean and variance - those layers are the most specialized to the pretraining objective and are often the least useful for your task. (6) INTERMEDIATE-TASK TRANSFER: fine-tune on MNLI first, then on your task. For sentence-pair tasks this is dramatic, and it works partly because the head is no longer starting from noise. (7) SWITCH TO PEFT - LoRA and adapters are noticeably more stable at small n, because there are far fewer parameters available to be distorted. (8) MIXOUT, which stochastically replaces weight updates with the pretrained values - an explicit regularizer toward the starting point. WHAT I WOULD DO WITH THE RESULT, which matters as much as the fix. Report MEAN AND STANDARD DEVIATION over at least five seeds, never a single run and never the maximum. If you are comparing two approaches, the comparison is only meaningful if the difference exceeds the seed spread - and on a 3,000-example dataset it frequently does not, which is a legitimate finding to report. And ensemble if you can afford it: averaging predictions over five fine-tuned models both raises accuracy and eliminates the risk of shipping a degenerate run, which on a small dataset is often the most valuable thing you can do with five runs you already had to do anyway.",
          "deepDive": {
            "q": "Why does fine-tuning sometimes hurt out-of-distribution performance, and what is the fix?",
            "a": "THE PHENOMENON. Fine-tuning almost always improves IN-DISTRIBUTION accuracy over a frozen backbone with a linear head. But Kumar et al. (2022) showed that on distribution SHIFT, the ordering can reverse: a linear probe on frozen features can beat full fine-tuning, sometimes substantially. That is surprising, because fine-tuning is strictly more expressive - it can represent whatever the probe represents. THE MECHANISM, which is the interesting part. Consider the two components: pretrained FEATURES and a randomly initialized HEAD. At step zero the head is noise, so its gradient with respect to the features is essentially arbitrary - it points toward whatever would make the current random head fit the data. The body absorbs that gradient and the features MOVE in a direction determined by noise. Because the features are being dragged to accommodate the head rather than the head being fitted to the features, the early phase of fine-tuning DISTORTS the pretrained representation. In distribution this does not matter: the features and head co-adapt and end up fitting the training distribution well. Out of distribution it matters a great deal, because the distortion has destroyed exactly the general structure that pretraining bought and that OOD generalization depends on. Kumar et al. formalized this in an overparameterized linear setting: fine-tuning changes features in the directions spanned by the training data while leaving orthogonal directions at their pretrained values, producing a feature map that is inconsistent between the two subspaces - and that inconsistency is what OOD data exposes. THE FIX - LP-FT. Two stages. First LINEAR PROBE: freeze the body, train only the head to convergence. Now the head is a good, low-noise readout of the pretrained features. Then FINE-TUNE everything at a small learning rate. Because the head is already near-optimal, the gradient reaching the body is small and well-directed, so features are refined rather than distorted. This gets you the ID accuracy of fine-tuning and much of the OOD robustness of probing, and it costs one extra cheap training stage. It is a two-line change and should arguably be the default. RELATED APPROACHES, all attacking the same problem. (a) WISE-FT: fine-tune normally, then linearly INTERPOLATE the fine-tuned and pretrained weights (w = alpha*w_ft + (1-alpha)*w_pre). Astonishingly, this often improves BOTH ID and OOD simultaneously - the interpolation path stays in a low-loss region and the midpoint inherits robustness from the pretrained endpoint. (b) Small learning rates and layer-wise decay, which limit distortion by construction. (c) PEFT - LoRA and adapters constrain updates to a low-rank or bottlenecked subspace, so the pretrained features cannot be moved far; this is part of why PEFT often shows better OOD behaviour than full fine-tuning at similar ID accuracy. (d) Regularizing explicitly toward the pretrained weights (L2-SP, Mixout). THE BROADER LESSON I would draw. There is a real tension between FITTING the target distribution and PRESERVING pretrained generality, and standard fine-tuning resolves it entirely in favour of fitting, without ever asking. Every method above is a way of putting a thumb on the other side of the scale. It also reframes what pretrained features ARE: not a starting point to be improved, but an asset that fine-tuning spends. And practically, it means that if you care about robustness you must EVALUATE out of distribution - an ID validation set will show fine-tuning winning and will never reveal the trade."
          }
        },
        {
          "q": "How would you decide between full fine-tuning, PEFT, linear probing, and prompting?",
          "a": "THE DECISION IS DRIVEN BY THREE VARIABLES: how much labelled data you have, how big the model is, and how many tasks you must serve. Let me take them as a decision procedure. STEP 1 - HOW MUCH LABELLED DATA? Under ~100 examples: PROMPTING or few-shot, because no gradient-based method has enough signal to beat a good prompt, and fine-tuning at this size is a variance generator. 100-1,000: PEFT (LoRA, adapters) or LP-FT - full fine-tuning is unstable here and PEFT's restricted update space is an effective regularizer. 1,000-10,000: full fine-tuning of a small-to-mid encoder becomes the strongest option, with the stability measures applied and multiple seeds. Above ~10,000: full fine-tuning, comfortably, and the instability problem largely disappears. STEP 2 - HOW BIG IS THE MODEL? Under ~1B parameters, full fine-tuning is cheap and there is little reason to avoid it. Above that, full fine-tuning needs optimizer states and gradients at roughly 12-16 bytes per parameter, so a 7B model wants ~100GB+ of accelerator memory and a 70B model is out of reach without a cluster - PEFT becomes not a preference but a requirement. QLoRA extends this further by quantizing the frozen base to 4-bit and training LoRA adapters on top, which puts 70B fine-tuning on a single large GPU. STEP 3 - HOW MANY TASKS? One task: full fine-tune, simplest thing that works. Many tasks with one base model: PEFT decisively - LoRA adapters are megabytes rather than gigabytes, you can hot-swap them against a shared base at serving time, and you avoid maintaining N full copies. This operational argument is usually the one that actually decides it in production. Many tasks that change weekly: prompting, because the iteration loop is minutes rather than hours. WHAT EACH METHOD ACTUALLY BUYS. LINEAR PROBING: fastest, most stable, best OOD robustness, lowest ceiling. Genuinely underrated as a BASELINE - if a probe gets within a point of your fine-tune, the fine-tune is not earning its complexity. PEFT: within ~1 point of full fine-tuning on most tasks, 100-1000x fewer trained parameters, more stable at small n, better OOD behaviour, and trivially composable. The gap widens when the target task is far from pretraining, where the model genuinely needs to move. FULL FINE-TUNING: highest ceiling, especially for domain shift and for tasks requiring new capabilities rather than new readouts. Most expensive, least stable at small n, and produces a full model copy per task. PROMPTING: zero training cost, instant iteration, no labelled data needed, but higher inference cost per call, weaker on specialized formats and domains, and harder to make reliably consistent. THE ANSWER I ACTUALLY GIVE in a design review, because it is a sequence rather than a choice: prompt first to establish feasibility and generate a baseline, use the prompted model to LABEL data, then fine-tune a small model on those labels for production. You get the LLM's flexibility during development and the small model's economics at scale. The decision is a lifecycle, and treating it as a single fork is the most common framing error."
        },
        {
          "q": "You have 200,000 unlabelled in-domain documents and 2,000 labelled examples. What is your plan?",
          "a": "This is the classic two-stage setup and the plan is well established, but the ORDER and the baselines matter more than the technique. STEP 1 - BASELINES FIRST, before any pretraining. (a) Majority class. (b) TF-IDF plus logistic regression, which takes ten minutes and beats fine-tuned transformers more often than people admit on topical tasks. (c) Off-the-shelf fine-tuning of a general pretrained model on the 2,000 labels. (d) A zero-shot or few-shot LLM. These four numbers frame everything and occasionally end the project - if (b) is already good enough, you are done. Skipping this step and going straight to domain-adaptive pretraining is the most common way to spend three weeks unnecessarily. STEP 2 - DOMAIN-ADAPTIVE PRETRAINING (DAPT). Continue masked language modelling on the 200,000 unlabelled documents starting FROM an existing checkpoint - never from scratch, since 200k documents is nowhere near enough to learn a representation. Gururangan et al. ('Don't Stop Pretraining') measured this carefully and found consistent gains from DAPT across four domains, with the gains LARGEST when the domain is furthest from the pretraining corpus. They also introduced TASK-ADAPTIVE pretraining (TAPT) - MLM on the task's own unlabelled text, which is a much smaller corpus but exactly on distribution - and found DAPT followed by TAPT best of all. Practical details: a few epochs is usually enough, monitor DOWNSTREAM performance rather than MLM loss (the pretraining loss tells you almost nothing about transfer), and checkpoint periodically because more is not monotonically better. STEP 3 - CHECK THE TOKENIZER, which people skip and should not. Measure FERTILITY - average subword pieces per word - on your domain. If specialist vocabulary is being shredded into four or five pieces, the model is spending capacity reassembling terms it should know. You can add domain tokens and initialize their embeddings as the mean of their constituent subwords, then let DAPT train them. SciBERT's advantage over BERT on scientific text is substantially a vocabulary story, not only a weights story. STEP 4 - FINE-TUNE ON THE 2,000 LABELS, carefully, because this is the fragile step. Layer-wise LR decay, warmup, early stopping on a proper validation split, and 3-5 seeds with mean and spread reported. Consider LP-FT and consider PEFT - at 2,000 examples both are competitive and both are more stable. STEP 5 - USE THE UNLABELLED DATA A SECOND TIME, since DAPT is not the only way to exploit it. PSEUDO-LABELLING: train on the 2,000, predict on the 200,000, keep high-confidence predictions, retrain. This is often complementary to DAPT because it uses the unlabelled data for the TASK rather than for the representation. Consistency-regularization methods (UDA, FixMatch-style) do something similar with augmentation. STEP 6 - AND THE HIGHEST-VALUE OPTION, which I would raise first in any real project: ACTIVE LEARNING. If labelling more is possible at all, use the model's uncertainty to select the next 500 documents to label. Going from 2,000 to 2,500 well-chosen labels typically buys more than any algorithmic change on this list, and it is worth saying so before proposing a month of pretraining. EVALUATION DISCIPLINE throughout: with 2,000 labels the validation set is small and noisy, so use cross-validation, split by the correct unit (document, author, time period - never randomly if there is leakage structure), and report confidence intervals. Many of the differences between the steps above will be inside the noise, and knowing that prevents chasing them."
        },
        {
          "q": "What is intermediate-task transfer, and when does it help or hurt?",
          "a": "THE IDEA. Instead of pretrained -> target, insert a stage: pretrained -> INTERMEDIATE TASK -> target. Phang et al. called it STILT (Supplementary Training on Intermediate Labeled Tasks). The canonical example is fine-tuning on MNLI (393k sentence-pair examples) before a small sentence-pair task like RTE (2.5k), and the gains are large - several points - alongside a dramatic reduction in seed variance. WHY IT WORKS, and there are three mechanisms worth separating. (1) SKILL TRANSFER: MNLI teaches sentence-pair reasoning - how to compare two texts and judge their relationship - which is precisely the skill RTE needs. The intermediate task supplies the abundant supervision the target task lacks. (2) A NON-RANDOM STARTING POINT: after the intermediate stage the model's upper layers are already organized for the task FORMAT, so the target fine-tune begins from a sensible place rather than from noise. This is why the variance reduction is so pronounced - it is attacking the same root cause as LP-FT and warmup. (3) IMPLICIT REGULARIZATION: the model has been pulled toward a region of weight space that generalizes for a related task, which constrains where the small target fine-tune can go. WHEN IT HELPS - the empirical picture from Pruksachatkun et al., who ran the large study across many intermediate/target pairs. Gains are most reliable when the intermediate task is LARGE, requires HIGH-LEVEL INFERENCE (NLI, QA, commonsense), and the target task is SMALL. MNLI and QQP are the most consistently useful intermediates for sentence-pair targets; SQuAD transfers well to other QA. The correlation the study found is informative: intermediate tasks that best predicted transfer were those requiring reasoning, not those most superficially similar in domain. WHEN IT HURTS - and it genuinely can, this is not a free lunch. NEGATIVE TRANSFER occurs when the intermediate task is small (so you are just adding noise and one more overfitting opportunity), when it is low-level (tagging, surface-form tasks transfer poorly to inference tasks), or when its output format or label semantics conflict with the target's. It can also induce forgetting: an aggressive intermediate fine-tune can degrade the pretrained representation before you ever reach the target task, which is the same feature-distortion problem in a different costume. The published results include plenty of negative cells in the transfer matrix, and there is no reliable a priori rule for predicting them - which is the honest answer to 'how do I pick the intermediate task?' You try a few and measure. THE MODERN CONTEXT, because this technique evolved rather than disappeared. Multi-task intermediate training (running many intermediate tasks jointly) is usually better than a single one, and that idea scaled into INSTRUCTION TUNING - T0, FLAN, and their successors are intermediate-task transfer with hundreds of tasks and a natural-language interface. The line from STILT to instruction tuning is direct: both are 'train on lots of supervised tasks between pretraining and deployment so the model learns the shape of tasks'. That framing is worth having, because it makes instruction tuning look less like a new idea and more like the scaled version of one that was already understood. PRACTICALLY, for a small sentence-pair or QA task today: starting from an MNLI-tuned checkpoint (they are freely available) instead of a raw pretrained one costs nothing and typically helps. It is one of the cheapest wins available and it is routinely overlooked."
        },
        {
          "q": "How do you fine-tune for token-level tasks, and what breaks that does not break for classification?",
          "a": "THE STRUCTURAL DIFFERENCE. Sequence classification needs one decision per example; token classification needs one per TOKEN, and the model's tokens are not your tokens. That single mismatch is the source of nearly every token-level fine-tuning bug. THE HEAD is simple: a shared linear layer applied at every position, producing per-token logits, with cross-entropy summed over valid positions. Nothing subtle. WHAT BREAKS. (1) SUBWORD ALIGNMENT, the big one. Your labels are per word; WordPiece or BPE splits words into pieces. The standard convention is to assign the word's label to its FIRST subword and set the remaining pieces to -100 so the loss ignores them, then aggregate back at inference. The failure mode is quiet and nasty: if you get this wrong, per-token accuracy still looks respectable - because the vast majority of tokens are 'O' and those are easy - while entity-level F1 is badly degraded. You will not notice from the metric you are probably watching. Use the tokenizer's word_ids() mapping rather than hand-rolling the alignment. (2) THE METRIC IS THE SECOND TRAP. Token accuracy is close to meaningless when ~85% of tokens are 'O' - a model predicting 'O' everywhere scores 85%. You must evaluate at the ENTITY level with exact span matching (the seqeval convention): a prediction counts only if the full span AND the type are right. A system at 99% token accuracy can be at 60% entity F1, and only the second number reflects whether the product works. (3) INVALID LABEL SEQUENCES. With BIO tagging, an independent per-token softmax can emit I-PER directly after O, or I-LOC after B-PER, which are structurally impossible. Three responses: post-hoc repair (cheap, works surprisingly well), CONSTRAINED VITERBI DECODING with a transition matrix that forbids illegal moves, or a CRF layer that learns transition scores and decodes jointly. The gain from a CRF on top of a strong transformer is smaller than it was on top of an LSTM - the contextual encoder already captures much of the tag dependency - but constrained decoding is nearly free and removes an entire class of embarrassing outputs. (4) CLASS IMBALANCE is extreme and structural, not incidental. Consider class weighting or focal loss, but be aware both can hurt calibration. (5) DOCUMENT BOUNDARIES AND WINDOWING. Long documents must be chunked, and an entity split across a chunk boundary is unrecoverable. Use a STRIDE so windows overlap, and reconcile predictions in the overlap region - typically by preferring the prediction from the window where the token sits furthest from an edge, since edge tokens have the least context. (6) CASING AND PREPROCESSING matter far more than for classification: capitalization is one of the strongest NER cues, so an uncased model is materially worse, and text that arrives lowercased (ASR output, some logs) needs a truecasing step or a model trained for it. WHAT I WOULD VERIFY BEFORE TRUSTING THE MODEL: decode a handful of examples end to end and eyeball the spans against the source text; confirm the entity-level F1 pipeline agrees with a manual count on ten examples; check the per-TYPE breakdown, since rare entity types are usually far worse than the aggregate suggests; and inspect boundary errors specifically - 'partially correct span' is the dominant error mode in practice and exact-match F1 scores it as both a false positive and a false negative, which is harsh but is also what most downstream consumers actually require."
        },
        {
          "q": "Your fine-tuned model scores well on the test set but poorly in production. How do you investigate?",
          "a": "I would treat this as a distribution problem until proven otherwise, and work through it in a fixed order rather than starting from the model. STEP 1 - IS THE TEST SET LEGITIMATE? Check for LEAKAGE first, because it is the most common cause and the most embarrassing to find late. Were train and test split randomly when they should have been split by document, user, session, or TIME? If the same customer's tickets appear in both, or near-duplicate texts straddle the split, your test score is measuring memorization. Deduplicate across the split (exact and near-duplicate, not just exact) and re-evaluate; a large drop confirms it. Also check whether any preprocessing was fitted on the full dataset before splitting. STEP 2 - IS PRODUCTION THE SAME DISTRIBUTION? Almost always not, and the useful move is to quantify it rather than assume. Compare input length distributions, vocabulary overlap, out-of-vocabulary and fertility rates, class balance, and the rate of things the training set never contained - empty inputs, other languages, boilerplate, HTML, truncated text. A cheap and effective diagnostic: train a binary classifier to distinguish training inputs from production inputs. If it succeeds easily, the distributions differ, and its most informative features tell you HOW. STEP 3 - IS THE PREPROCESSING IDENTICAL? Training-serving skew is a mundane and extremely common cause. Same tokenizer version, same truncation length and side, same normalization, same casing, same handling of special characters. Assert this in code rather than believing it - run one production example through both paths and compare the token IDs. STEP 4 - IS THE LABEL DEFINITION THE SAME? Training labels are often produced by a careful annotator with guidelines; production 'ground truth' often comes from a different process with different incentives. If your production metric is computed from user behaviour or agent overrides, it may be measuring something else entirely, and the model may be fine. STEP 5 - LOOK AT ERRORS BY HAND. Fifty production failures, read individually. This finds more in an hour than any dashboard, and it is the step people skip. Group them: are they long inputs (truncation), rare classes, a new topic that emerged after training, sarcasm or negation, or a systematically mislabelled category? STEP 6 - CHECK THE TEMPORAL AXIS specifically. Text distributions drift - new products, new slang, seasonal topics, changed workflows. If your test set is a random split of historical data, it contains future information relative to any given training point and will overstate performance. The honest evaluation is a TIME-BASED split: train on before, test on after. Doing this often reproduces the production gap immediately, and if it does, you have both your diagnosis and your future evaluation protocol. STEP 7 - CHECK CALIBRATION AND THRESHOLDS. If you deployed with a confidence threshold tuned on the test set, and production confidence is distributed differently, the operating point has moved even if the ranking is unchanged. Recalibrate on production data. THE FIXES, once diagnosed: retrain including production-like data (which is why you should be logging and sampling it for labelling from day one); use time-based splits going forward; add monitoring for input drift rather than only output metrics; set up a continuous labelled sample from production as your real evaluation set. AND THE PREVENTION, which is what I would push in a design review: the test set should be constructed to resemble deployment - same time period relationship, same population, same preprocessing path - before the first model is trained. Most of these gaps are decided at split time, months before anyone notices them."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The default fine-tuning recipe",
        "back": "AdamW 2e-5 to 5e-5, 2-4 epochs, batch 16-32, warmup 6-10% then linear decay, weight decay 0.01 excluding bias/LayerNorm, grad clip 1.0. Small LR because you are ADJUSTING a representation, not learning one."
      },
      {
        "type": "pitfall",
        "front": "Seed variance on small datasets",
        "back": "On few-thousand-example tasks a real fraction of seeds collapse to majority-class, and the spread often EXCEEDS the gap between published methods. Never report a single run; report mean +/- std over 3-5 seeds."
      },
      {
        "type": "intuition",
        "front": "What causes fine-tuning instability",
        "back": "Mostly OPTIMIZATION, not overfitting: vanishing gradients early plus the missing Adam bias correction in BERT's original impl. Fix with warmup, proper AdamW, and LONGER training with early stopping - more epochs reduces variance."
      },
      {
        "type": "definition",
        "front": "Layer-wise LR decay",
        "back": "eta_l = eta_top * xi^(L-l), xi ~ 0.65-0.95. Lower layers hold general features needing little change; upper layers are objective-specific. Smaller xi = stronger pull toward pretrained weights = use when data is scarce."
      },
      {
        "type": "definition",
        "front": "LP-FT",
        "back": "Linear-probe the head with the body frozen, THEN fine-tune everything. Stops a random head's early gradients from distorting pretrained features. Matches FT in-distribution and beats it out-of-distribution."
      },
      {
        "type": "intuition",
        "front": "Why FT can lose to a linear probe OOD",
        "back": "A random head's early gradient is arbitrary, and the body absorbs it - features get dragged to fit noise. ID this is harmless (they re-fit); OOD the lost generality shows. Fixes: LP-FT, WiSE-FT weight interpolation, PEFT, small LRs."
      },
      {
        "type": "definition",
        "front": "Intermediate-task transfer (STILT)",
        "back": "Fine-tune on a large related task (MNLI is the classic) before the small target task. Raises the mean AND sharply cuts seed variance. Scaled up, this idea became instruction tuning."
      },
      {
        "type": "intuition",
        "front": "Why warmup",
        "back": "The head is random, so its opening gradients are large and badly directed - and they flow into the pretrained body. Warmup holds the step size near zero until the head has oriented itself."
      },
      {
        "type": "pitfall",
        "front": "Token-task metric trap",
        "back": "~85% of tokens are 'O', so 99% token accuracy can hide 60% entity F1. Evaluate at the ENTITY level with exact span match (seqeval), and check the per-type breakdown."
      },
      {
        "type": "intuition",
        "front": "DAPT then TAPT",
        "back": "Continued MLM on your domain corpus (DAPT), then on the task's own unlabelled text (TAPT), then supervised fine-tuning. Gains are largest when the domain is furthest from web text; monitor DOWNSTREAM metrics, not MLM loss."
      },
      {
        "type": "pitfall",
        "front": "Skipping the trivial baselines",
        "back": "TF-IDF + logistic regression beats fine-tuned BERT more often than expected on topical tasks and takes ten minutes. If you cannot clearly beat it, the problem is the data, not the model."
      },
      {
        "type": "intuition",
        "front": "Choosing FT vs PEFT vs probe vs prompt",
        "back": "<100 labels: prompt. 100-1k: PEFT or LP-FT. 1k-10k: full FT with stability measures. >10k: full FT comfortably. Model >1B or many tasks on one base: PEFT. In practice it is a lifecycle - prompt, label with the LLM, fine-tune small for production."
      }
    ],
    "refs": [
      {
        "title": "Dodge et al. (2020), Fine-Tuning Pretrained Language Models: Weight Initializations, Data Orders, and Early Stopping",
        "url": "https://arxiv.org/abs/2002.06305"
      },
      {
        "title": "Mosbach et al. (2021), On the Stability of Fine-tuning BERT",
        "url": "https://arxiv.org/abs/2006.04884"
      },
      {
        "title": "Kumar et al. (2022), Fine-Tuning can Distort Pretrained Features and Underperform Out-of-Distribution",
        "url": "https://arxiv.org/abs/2202.10054"
      },
      {
        "title": "Gururangan et al. (2020), Don't Stop Pretraining: Adapt Language Models to Domains and Tasks",
        "url": "https://arxiv.org/abs/2004.10964"
      },
      {
        "title": "Pruksachatkun et al. (2020), Intermediate-Task Transfer Learning with Pretrained Language Models",
        "url": "https://arxiv.org/abs/2005.00628"
      }
    ],
    "demos": [
      "lr-schedule",
      "overfitting",
      "lora",
      "distillation"
    ],
    "demoTitles": {
      "lr-schedule": "Learning-Rate Schedules",
      "overfitting": "Overfitting Lab",
      "lora": "LoRA - Low-Rank Adaptation",
      "distillation": "Knowledge Distillation"
    }
  }
};
