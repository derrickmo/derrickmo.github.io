// GENERATED from content/lessons/fine-tuning/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "fine-tuning". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "full-fine-tuning": {
    "level": "core",
    "body": {
      "intuition": [
        "You have a pretrained model and a task it was not trained on. There are two extremes. FREEZE the backbone and train only a new head on top of its features - feature extraction, and when the head is a single linear layer, linear probing. Or UNFREEZE everything and let gradients rewrite every weight - full fine-tuning. Every other method in this module is a point between those two, defined by how much of the update it allows and where.",
        "The choice looks like a compute question and is usually presented as one: full fine-tuning is more expensive and more accurate, so spend if you can afford it. Then Kumar et al. ran the evaluation that mattered. Across ten distribution-shift benchmarks, full fine-tuning beat linear probing IN DISTRIBUTION and LOST to it OUT OF DISTRIBUTION. Not marginally: their LP-FT recipe - linear-probe first, then fine-tune - came out about 1 point better than full fine-tuning in distribution and about 10 points better out of distribution. The extra capacity was not buying generalization. It was buying fit to the fine-tuning set, and paying for it somewhere the fine-tuning set could not see.",
        "The mechanism is worth internalizing because it recurs. At the start of fine-tuning the new head is RANDOM, so its outputs are wrong, so the loss is large, so the gradients flowing back into the backbone are large - and they arrive before the head has learned to use the features it is being fed. The backbone gets rewritten to compensate for a bad head. Features that were fine get distorted, and the distortion is largest in the directions the fine-tuning data does not constrain, which is precisely where out-of-distribution performance lives. Linear-probing first puts the head somewhere sensible, so when you unfreeze, the gradients entering the backbone are small and the pretrained features survive. That is the whole of LP-FT, and it costs one extra warm-up stage. This is the module's spine in its first form: the PROXY you are optimizing is the fine-tuning set's own test split, drawn from the same distribution as the fine-tuning data, and fine-tuning essentially always improves it. Whether it improved the MODEL is a different question, and only an evaluation the fine-tuning data did not define can answer it."
      ],
      "math": [
        {
          "h": "The adaptation spectrum is a constraint on the update, not a different algorithm",
          "paras": [
            "Every method in this module writes the adapted weights as the pretrained weights plus an update, and differs only in which updates it permits. Seeing them this way makes the comparisons in the rest of the module mechanical rather than a list of tricks."
          ],
          "tex": "\\theta = \\theta_0 + \\Delta \\quad\\text{s.t.}\\quad \\begin{cases} \\Delta_{\\text{backbone}} = 0 & \\text{feature extraction} \\\\ \\Delta_{\\ell} = 0 \\;\\; \\forall \\ell < k & \\text{partial unfreezing} \\\\ \\operatorname{rank}(\\Delta_W) \\le r & \\text{LoRA} \\\\ \\Delta \\in \\mathbb{R}^{|\\theta|} & \\text{full fine-tuning} \\end{cases}",
          "texNote": "Read the constraint column as a prior on what the task should be allowed to change. Feature extraction says the pretrained representation is already right and only the readout is wrong. Full fine-tuning says nothing is protected. The intermediate rows are bets that the useful update is small in some structured sense - confined to the top layers, or low-rank - and those bets are what the rest of the module tests."
        },
        {
          "h": "What full fine-tuning actually costs",
          "paras": [
            "The number that decides most real projects. Under standard mixed-precision training with Adam, every parameter you unfreeze carries roughly sixteen bytes of training state, not two - and only two of those sixteen are the weights themselves.",
            "This is why parameter-efficient methods exist at all. The saving is not in the forward pass, which still runs the full model; it is in gradients and optimizer state, which scale with the number of TRAINABLE parameters rather than total ones."
          ],
          "tex": "M \\;\\approx\\; \\underbrace{2P}_{\\text{fp16 weights}} \\;+\\; \\underbrace{2P_{\\text{train}}}_{\\text{fp16 grads}} \\;+\\; \\underbrace{4P_{\\text{train}}}_{\\text{fp32 master}} \\;+\\; \\underbrace{8P_{\\text{train}}}_{\\text{Adam } m,\\, v} \\;+\\; A",
          "texNote": "With everything trainable this is 16 bytes per parameter plus activations A: a 7B model needs about 112 GB of optimizer and gradient state, which fits on no single accelerator you are likely to have. Freeze the backbone and the last three terms collapse to almost nothing, leaving the 2P of frozen weights plus activations - the same forward cost, a fraction of the memory."
        },
        {
          "h": "Discriminative learning rates: fine-tuning with a gradient of caution",
          "paras": [
            "ULMFiT's contribution, and still the default in strong fine-tuning recipes. Rather than choosing between frozen and unfrozen, scale the learning rate geometrically with depth so early layers - which hold the general features - move slowly, and late layers, which hold the task-specific ones, move fast."
          ],
          "tex": "\\eta_{\\ell} \\;=\\; \\eta_{L} \\cdot \\xi^{\\,L-\\ell}, \\qquad \\xi \\in [0.8,\\, 0.95]",
          "texNote": "Layer L is the top. With xi = 0.9 and 24 layers, layer 0 trains at about 8% of the top layer's rate - close to frozen without being frozen, so it can still adapt if the task genuinely demands it. Note that xi = 0 recovers feature extraction and xi = 1 recovers full fine-tuning, so the whole spectrum is one hyperparameter."
        }
      ],
      "code": [
        {
          "h": "Four adaptation modes on one backbone, with the number that decides the budget",
          "paras": [
            "The same model adapted four ways. The only thing that changes is which parameters carry requires_grad, and the trainable-parameter count is the quantity that determines memory, not accuracy."
          ],
          "code": "def count_trainable(model):\n    tr = sum(p.numel() for p in model.parameters() if p.requires_grad)\n    tot = sum(p.numel() for p in model.parameters())\n    return tr, tot, 100.0 * tr / tot\n\n# 1. FEATURE EXTRACTION - freeze the backbone, train the head only.\nfor p in model.backbone.parameters():\n    p.requires_grad = False\n\n# 2. PARTIAL UNFREEZING - the top k blocks adapt, the rest hold.\nfor blk in model.backbone.blocks[-k:]:\n    for p in blk.parameters():\n        p.requires_grad = True\n\n# 3. DISCRIMINATIVE / LAYER-WISE LR DECAY - everything trains, at different speeds.\nxi, base = 0.9, 2e-5\ngroups = [{\"params\": blk.parameters(), \"lr\": base * xi ** (L - i)}\n          for i, blk in enumerate(model.backbone.blocks)]\ngroups.append({\"params\": model.head.parameters(), \"lr\": base * 10})\nopt = torch.optim.AdamW(groups)\n\n# 4. FULL FINE-TUNING - one learning rate, everything moves.\nopt = torch.optim.AdamW(model.parameters(), lr=2e-5)\n\n# Trainable share on a typical encoder + linear head:\n#   feature extraction ....... ~0.2%    <- the head is almost nothing\n#   top-2 blocks ............. ~15%\n#   LLRD ..................... 100%     (trainable, but not equally mobile)\n#   full fine-tuning ......... 100%\n#\n# Memory tracks the FIRST column. Accuracy on the fine-tuning distribution\n# tracks it too, weakly and monotonically, which is exactly why that column\n# is a bad thing to select on by itself.",
          "caption": "The four modes differ only in which parameters carry requires_grad. Trainable share sets the memory budget; note that it also correlates with in-distribution accuracy, which is what makes selecting on in-distribution accuracy so misleading."
        },
        {
          "h": "LP-FT, and the evaluation that makes the case for it",
          "paras": [
            "Two extra lines of training code and one extra evaluation set. The evaluation is the part that matters: without an out-of-distribution split, all three methods look like a straightforward accuracy ranking and you will pick the wrong one."
          ],
          "code": "# ---- LP-FT (Kumar et al. 2022): probe first, THEN fine-tune ----\nfreeze(model.backbone)\ntrain(model, epochs=E_probe, lr=1e-3)      # head only; backbone untouched\nunfreeze(model.backbone)\ntrain(model, epochs=E_ft, lr=2e-5)         # now everything, gently\n\n# WHY IT WORKS: at step 0 of a normal fine-tune the head is RANDOM, so the\n# loss is large, so large gradients hit the backbone before the head has\n# learned to read it. The backbone gets rewritten to compensate for a bad\n# head, distorting features most in the directions the fine-tuning data does\n# not constrain - which is where OOD performance lives. Probing first makes\n# the head good, so the gradients entering the backbone start small.\n\n# ---- THE EVALUATION THAT SEPARATES THEM ----\nfor name, m in [(\"linear probe\", lp), (\"full FT\", ft), (\"LP-FT\", lpft)]:\n    print(name, evaluate(m, test_id), evaluate(m, test_ood))\n\n#                        in-distribution     out-of-distribution\n#   linear probe .......... lower ............ HIGHER\n#   full fine-tuning ...... higher ........... LOWER\n#   LP-FT ................. highest .......... highest\n#\n# Averaged over the ten shift benchmarks in the paper, LP-FT came out about\n# 1 point above full FT in-distribution and about 10 points above it OOD.\n#\n# Read the middle row. Full fine-tuning WINS on the split drawn from the\n# fine-tuning distribution and LOSES on the one that is not. If you only\n# built the first column - and the first column is the one your fine-tuning\n# data hands you for free - you would ship the worse model and your metric\n# would agree with you.",
          "caption": "LP-FT is two lines. The reason to bother is in the second table: full fine-tuning wins in-distribution and loses out-of-distribution, so the evaluation your fine-tuning set gives you for free ranks the methods in the wrong order."
        }
      ],
      "useCases": [
        "Adapting one backbone to many tasks under a serving constraint - feature extraction lets every task share one set of frozen weights and one KV-cache-friendly forward pass, with per-task heads costing kilobytes, which is why it survives in production long after it stopped being state of the art on paper.",
        "Small labelled datasets, where full fine-tuning has enough capacity to memorize the training set before it learns anything transferable, and freezing acts as the strongest regularizer available - the classic few-hundred-example regime.",
        "Domain adaptation where the target distribution is genuinely far from pretraining - medical imaging, legal text, industrial sensor data - and the pretrained features really are wrong rather than merely mis-read, which is the case where full fine-tuning earns its cost.",
        "Establishing a baseline before reaching for anything clever: a linear probe on frozen features takes minutes, sets the floor that every PEFT method in this module must clear, and frequently reveals that the pretrained representation already solves the task."
      ],
      "pitfalls": [
        "Reporting only in-distribution accuracy. It is the split your fine-tuning data defines, it rises monotonically with trainable parameters, and it ranked full fine-tuning above linear probing on benchmarks where linear probing generalized better by 10 points. Build an evaluation the fine-tuning distribution did not generate, or you are measuring fit rather than adaptation.",
        "Fine-tuning from a random head at full learning rate. This is the exact mechanism behind feature distortion - large early gradients from a head that cannot yet read the features. Warm up, probe first, or freeze for the first epoch; all three cost almost nothing.",
        "Leaving BatchNorm in training mode inside a 'frozen' backbone. requires_grad = False stops the gradients but NOT the running-statistics update, so the frozen encoder silently drifts with every forward pass and your reproducibility disappears. Call .eval() on the backbone as well - this is one of the most common silent bugs in transfer-learning code.",
        "Using the pretraining learning rate. Fine-tuning rates are typically 10 to 100 times smaller (2e-5 rather than 1e-3 for a transformer encoder); at pretraining rates the first few hundred steps destroy the representation you paid for, and the loss curve looks fine because the model relearns the task from scratch.",
        "Assuming more trainable parameters means more capability. Full fine-tuning of a 7B model needs roughly 112 GB of gradient and optimizer state, and on most adaptation tasks it is matched by methods touching under 1% of the weights - the extra capacity is spent on the fine-tuning distribution, which is the definition of the problem here.",
        "Ignoring catastrophic forgetting because the target metric looks good. A model fine-tuned hard on one task loses measurable ability on everything else, and nothing in your fine-tuning loop is looking. Keep a held-out capability suite from BEFORE the fine-tune and re-run it after.",
        "Treating the choice as permanent. WiSE-FT showed you can INTERPOLATE the zero-shot and fine-tuned weights after the fact and recover much of the robustness while keeping most of the target-task gain - a post-hoc knob that costs one weighted average and is almost never tried."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "LoRA is the next row of the constraint table: instead of choosing which layers may move, it constrains the SHAPE of the update to be low-rank, which turns out to buy the memory saving of freezing with much of the accuracy of full fine-tuning."
        },
        {
          "ref": "cnn/transfer-learning",
          "text": "The vision version of the same spectrum, and where the freeze-then-unfreeze habit comes from. The mechanism explaining why it works - protecting the backbone from a random head - is the same here."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "This lesson's central result IS a distribution-shift result. The formal treatment of why in-distribution accuracy cannot certify out-of-distribution behaviour is there; the fine-tuning consequence is here."
        },
        {
          "ref": "ml-theory/bias-variance",
          "text": "Freezing is a capacity constraint, and the classic account explains why it helps at small n. It does NOT explain the LP-FT result, which is about the trajectory rather than the hypothesis class - a useful reminder that the bias-variance story is not the whole of generalization."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "'Build an evaluation the training data did not define' is stated as a fine-tuning rule here and as a general discipline there. Every failure in this module is first a failure to have that evaluation."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is feature extraction versus full fine-tuning?",
          "a": "Feature extraction freezes the pretrained backbone and trains only a new head on its features. Full fine-tuning updates every weight. Everything else is a constraint on the update in between."
        },
        {
          "q": "What is linear probing?",
          "a": "Feature extraction where the head is a single linear layer. It is the standard measure of how linearly separable a representation already is, and the cheapest baseline for any adaptation task."
        },
        {
          "q": "How much memory does full fine-tuning need per parameter?",
          "a": "About 16 bytes under mixed precision with Adam: 2 for fp16 weights, 2 for fp16 gradients, 4 for the fp32 master copy, and 8 for Adam's two moments. A 7B model needs roughly 112 GB."
        },
        {
          "q": "Where does the memory saving of freezing come from?",
          "a": "Gradients and optimizer state, which scale with TRAINABLE parameters. The forward pass is unchanged - the full model still runs - so activations and weights stay."
        },
        {
          "q": "What did Kumar et al. (2022) find?",
          "a": "Full fine-tuning beat linear probing in-distribution but lost out-of-distribution. Their LP-FT recipe came out roughly 1 point better ID and 10 points better OOD than full fine-tuning, averaged over ten shift benchmarks."
        },
        {
          "q": "What is LP-FT?",
          "a": "Linear-probe the head with the backbone frozen, then unfreeze and fine-tune everything. Two lines of code that recover most of the robustness lost by fine-tuning from a random head."
        },
        {
          "q": "Why does fine-tuning from a random head hurt?",
          "a": "The random head makes the loss large, so large gradients hit the backbone before the head can read the features. The backbone gets rewritten to compensate for a bad head, distorting features in directions the fine-tuning data does not constrain."
        },
        {
          "q": "What is discriminative or layer-wise learning-rate decay?",
          "a": "Scale the learning rate geometrically with depth, eta_l = eta_L * xi^(L-l) with xi around 0.9, so general early features move slowly and task-specific late ones move fast. It interpolates the whole freeze/unfreeze spectrum with one knob."
        },
        {
          "q": "When does feature extraction beat full fine-tuning?",
          "a": "Small datasets, target distribution close to pretraining, many tasks sharing one backbone under a serving constraint, and any case where out-of-distribution robustness matters more than in-distribution accuracy."
        },
        {
          "q": "What is the BatchNorm trap in frozen backbones?",
          "a": "requires_grad = False stops gradients but not running-statistics updates. The frozen encoder still drifts on every forward pass unless you also call .eval() on it."
        },
        {
          "q": "What is catastrophic forgetting in this context?",
          "a": "Fine-tuning hard on one task measurably degrades capabilities the model had before, and nothing in the fine-tuning loop is watching. It needs a held-out capability suite run before and after."
        },
        {
          "q": "What is WiSE-FT?",
          "a": "Weight-space interpolation between the zero-shot and fine-tuned models after training. It recovers much of the robustness while keeping most of the target-task gain, for the cost of one weighted average."
        }
      ],
      "standard": [
        {
          "q": "How do you decide between freezing and full fine-tuning for a new task?",
          "a": "I would frame it as choosing a CONSTRAINT ON THE UPDATE rather than picking a method, because that makes the comparison to LoRA and adapters mechanical later. Write theta = theta_0 + Delta; feature extraction sets the backbone part of Delta to zero, partial unfreezing zeroes the lower layers, LoRA constrains its rank, full fine-tuning leaves it free. THE THREE INPUTS. First, DATASET SIZE. With a few hundred examples full fine-tuning has enough capacity to fit the training set before learning anything transferable, and freezing is the strongest regularizer on the table. With hundreds of thousands, the constraint starts costing more than it saves. Second, DISTANCE FROM PRETRAINING. If the target domain is genuinely far - medical imaging, legal text, an unusual sensor modality - the pretrained features are actually wrong rather than merely mis-read, and only updating the backbone fixes that. If the domain is close, the representation is already right and you are only learning a readout. Third, THE SERVING CONSTRAINT, which people forget in the training discussion. A frozen backbone means N tasks share one set of weights and one forward pass with per-task heads costing kilobytes. Full fine-tuning means N full model copies. That single fact keeps feature extraction in production long after it stopped winning papers. WHAT I WOULD ACTUALLY DO. Start with a linear probe, because it takes minutes and it sets the floor every other method has to clear - and it frequently reveals the representation already solves the task. Then LP-FT rather than a naive fine-tune, since it is two extra lines. Then a PEFT method if memory is the binding constraint. THE PART THAT CHANGES THE ANSWER. Whatever I choose, I need an evaluation the fine-tuning distribution did not generate, because in-distribution accuracy rises monotonically with trainable parameters and will therefore always recommend the least constrained method. Kumar et al. is the concrete demonstration: on their benchmarks the in-distribution column ranked full fine-tuning above linear probing while the out-of-distribution column reversed it, by about 10 points. Selecting on the free metric ships the worse model with the metric agreeing.",
          "deepDive": {
            "q": "Walk through the feature-distortion mechanism precisely. Why does the ORDER of probing and fine-tuning matter so much when the final objective is identical?",
            "a": "Because the objective is identical but the TRAJECTORY is not, and where you end up in a non-convex landscape is a function of the path. SETUP. Let the model be a head w on top of features f_theta(x). At initialization, theta = theta_0 is pretrained and good; w is random. The gradient into the backbone is dL/dtheta = (dL/df)(df/dtheta), and the first factor is proportional to the head's error signal. A random head has a large error on every example, so dL/df is large, so the backbone receives a large gradient IMMEDIATELY - at the point when the model has no information about which features are actually useful for this task. WHAT THAT LARGE EARLY GRADIENT DOES. It moves theta in whatever direction reduces the loss given the current bad head. Some of that is real learning. But the fine-tuning data only constrains the features in the directions it spans - the subspace it can distinguish. In the orthogonal directions, the gradient is essentially arbitrary and the features drift freely. Those orthogonal directions are exactly where OOD examples live, because an OOD example is one that differs from the fine-tuning distribution in a direction that distribution did not vary. So the fine-tuning process degrades the features precisely where you have no way to notice. Kumar et al. formalize this in an overparameterized linear setting: fine-tuning from a random head provably distorts the pretrained features in the directions the ID data does not span, while linear probing cannot distort them at all because it does not touch them. WHY THE ORDER FIXES IT. After probing, w is near-optimal FOR THE FROZEN FEATURES, so dL/df is small. When you unfreeze, the backbone receives a small gradient - the model is already close to as good as those features allow, so the update is a refinement rather than a repair. The features move a little, in directions the data does constrain, and the orthogonal drift is small. WHAT THIS GENERALIZES TO. Any time you attach a randomly-initialized module to a pretrained one, the random module's early error is the pretrained module's problem. Adapter and LoRA papers zero-initialize one of the two projection matrices for exactly this reason - the adapter starts as the identity, so the model at step 0 is unchanged and there is no shock. The 'freeze for the first epoch' and 'warm up the learning rate' habits are the same fix arrived at empirically. And WiSE-FT attacks the same problem from the other end: rather than controlling the trajectory, average the endpoints. Being able to say 'this is one instance of the random-new-module-shocks-the-pretrained-one pattern' is the answer that shows you understand it rather than remember it."
          }
        },
        {
          "q": "A colleague fine-tuned an LLM on their support tickets. Accuracy on their held-out tickets went from 71% to 89%. What questions do you ask?",
          "a": "The number is real and it is also the least informative measurement available, because it is the split their fine-tuning data handed them. My questions run in order of how likely they are to change the decision. FIRST: what did it FORGET? Fine-tuning hard on a narrow distribution degrades capability outside it, and their evaluation cannot see that by construction. I would want a capability suite run on the base model BEFORE the fine-tune and re-run after - general instruction-following, a couple of reasoning benchmarks, and whatever adjacent tasks the model is also expected to do in production. This is the single most common gap and it is usually not measured at all. SECOND: is the held-out split actually held out? Support tickets have near-duplicates constantly - the same issue reported by different customers, templated responses, a canned macro. A random split puts near-duplicates on both sides and 89% is partly memorization. I want dedup by content hash and MinHash near-dedup, and ideally a TIME-BASED split, since the production distribution is always the future and a random split is always the past. THIRD: what is the baseline? Not the base model zero-shot - a few-shot prompt with good exemplars, and retrieval over the ticket history. Fine-tuning is frequently compared against nothing and wins. If a prompt with five examples gets 86%, the fine-tune bought three points for a training pipeline, a serving copy, and a retraining obligation. FOURTH: what changed - style or capability? A model fine-tuned on ticket responses reliably learns the FORMAT: the greeting, the length, the register. That shows up in any metric sensitive to surface form and is much of what the 18 points can be. I would look at whether errors changed in KIND or only in presentation. This is the same finding as the imitation-model result in the instruction-tuning lesson. FIFTH: how was it trained? Was the loss masked to the response tokens only, or computed over the prompt too? Was it LP-FT or a naive fine-tune from a random head? What learning rate - at pretraining rates the first few hundred steps flatten the representation and the model relearns the task from scratch, which still fits the training data. WHAT I WOULD PROPOSE. Keep the fine-tune, add three things: a pre/post capability suite, a time-based split, and a few-shot baseline in the same table. If it survives all three it is a good result and now it is a defensible one."
        },
        {
          "q": "Derive the memory cost of full fine-tuning and use it to explain why PEFT exists.",
          "a": "THE ACCOUNTING, per parameter, for standard mixed-precision training with Adam. (1) WEIGHTS in fp16: 2 bytes. These are needed regardless - the forward pass runs the whole model whether or not it is trainable. (2) GRADIENTS in fp16: 2 bytes, allocated only for parameters with requires_grad. (3) The fp32 MASTER COPY: 4 bytes. This exists because fp16 has about 10 bits of mantissa, so a small update added to a large weight rounds away entirely; the optimizer keeps a full-precision copy and the fp16 weights are a cast of it. Trainable parameters only. (4) ADAM STATE: the first moment m and second moment v, both fp32, 4 bytes each, 8 total. Trainable parameters only. TOTAL: 16 bytes per trainable parameter, of which only 2 are the weights. Plus activations, which scale with batch size and sequence length rather than parameter count and are attacked separately by gradient checkpointing. THE CONSEQUENCE. A 7B model: 14 GB of weights, and 98 GB of gradients plus optimizer state - about 112 GB total before activations. No single accelerator you are likely to have holds that, so full fine-tuning a 7B model is a multi-GPU sharded job (which is what ZeRO and FSDP are for) rather than something you do on one card. THE PEFT INSIGHT. Terms 2, 3 and 4 - fourteen of the sixteen bytes - scale with TRAINABLE parameters, not total. If only 0.1% of parameters are trainable, they nearly vanish: you are left with 14 GB of frozen fp16 weights, about 0.1 GB of training state, and activations. Suddenly it is one consumer GPU. THE PART PEOPLE GET WRONG. PEFT does not make the forward or backward pass cheap. You still run the full model forward, and you still BACKPROPAGATE THROUGH all of it to reach the trainable parts - the gradient has to flow through the frozen layers even though it is not stored for them. So compute per step drops only modestly; it is memory that collapses. That distinction explains why LoRA's headline claim is about GPU memory and trainable parameters rather than training speed, and it is why the further techniques in this module - 4-bit quantization of the frozen base in QLoRA, gradient checkpointing for activations - attack the two terms PEFT does NOT reduce.",
          "deepDive": {
            "q": "Given that fixed accounting, rank the levers you would pull to fit a 70B fine-tune into a constrained budget, and say what each costs.",
            "a": "In the order I would actually pull them, with the price of each. (1) FREEZE THE BASE, TRAIN A LOW-RANK UPDATE. Removes fourteen of the sixteen bytes per parameter. 70B goes from about 1.1 TB of training state to roughly 140 GB of frozen fp16 weights plus a negligible adapter. Cost: the update is constrained to be low-rank, which measurably reduces how much genuinely new material the model can absorb - and, symmetrically, reduces how much it forgets. Biggest single lever by a wide margin. (2) QUANTIZE THE FROZEN BASE TO 4 BITS. The base is frozen, so it never needs to be a gradient target and its precision only has to be good enough to compute a forward pass and pass gradients through. 140 GB becomes about 35 GB. Cost: a real but small quality reduction from quantization error, and dequantization overhead on every forward pass, so it is slower per step. This is QLoRA. (3) GRADIENT CHECKPOINTING. The activation term A is untouched by everything above and at long sequence lengths it dominates. Store activations only at segment boundaries and recompute the rest in the backward pass. Cost: roughly one extra forward pass, so about 30 to 40% more compute for a large memory reduction. Note it must be SEGMENTED - checkpointing every layer individually saves almost nothing because you store a boundary for each one. (4) SHORTEN THE SEQUENCE OR MICRO-BATCH IT. Activations scale with batch x sequence, so gradient accumulation buys the same effective batch at a fraction of the peak. Cost: more steps, and any batch-statistic-dependent layer behaves differently. (5) PAGED OPTIMIZER STATES. Move optimizer state to CPU and page it in. Cost: PCIe bandwidth becomes the bottleneck; useful as a spike absorber for the memory peaks rather than a steady-state plan. (6) SHARD ACROSS DEVICES (FSDP / ZeRO-3). Divide whatever remains by the number of devices. Cost: communication - ZeRO-3 adds parameter all-gathers in forward and backward, roughly 1.5x DDP's traffic. THE ORDERING PRINCIPLE. Attack the largest term first, and prefer levers that trade a property you can MEASURE (quantization error, recompute time) over ones that trade a property you cannot (how much capability the low-rank constraint cost you on tasks you did not evaluate). That last point is why I would still run the unconstrained fine-tune at small scale if at all possible, purely to know what the constraint cost."
          }
        },
        {
          "q": "What is catastrophic forgetting, and how would you detect and mitigate it in a fine-tuning pipeline?",
          "a": "WHAT IT IS. Training a network on task B degrades its performance on task A, because the weights encoding A are simply reused for B - there is no mechanism protecting them. In the sequential-task setting this can be near-total; in LLM fine-tuning it is usually partial but substantial, and it hits general instruction-following, safety behaviour, and adjacent capabilities that nobody evaluated. WHY IT IS UNDER-DETECTED. Every metric in a fine-tuning pipeline is computed on the fine-tuning distribution. Forgetting happens by definition off that distribution. The pipeline is structurally incapable of seeing it, which is the module's spine again: the proxy improves, the thing you wanted does not. DETECTION - and this is the part I would insist on. Fix a CAPABILITY SUITE before you start: a handful of general benchmarks, the model's safety refusals, a sample of tasks the model is also expected to do in production, and a fixed set of prompts whose outputs you diff qualitatively. Run it on the base model, run it after each fine-tune, and put both columns in the same table as your target metric. If the target metric has a column and the capability suite does not, forgetting is not being managed, it is being ignored. MITIGATIONS, roughly by cost. (1) CONSTRAIN THE UPDATE. LoRA and other PEFT methods forget less than full fine-tuning, and this is measured, not folklore - Biderman et al. found LoRA both learns less and forgets less on the same tasks, which is one property, not two. If forgetting is your binding concern, that trade is on your side. (2) REPLAY. Mix a few percent of general pretraining-style or instruction data into the fine-tuning mixture. Cheap, effective, and the standard practice in production SFT. (3) KL OR L2 ANCHORING TO THE BASE. Penalize divergence from the original weights or the original output distribution. The KL-to-reference term in RLHF does exactly this job and is one of the reasons that stack does not collapse. (4) EWC AND ITS RELATIVES. Weight the L2 penalty by the Fisher information, so parameters that mattered for the old task are held harder. Principled, and in practice it needs the old task's data or a proxy for it, which is often the blocker. (5) POST-HOC WEIGHT INTERPOLATION. WiSE-FT: average base and fine-tuned weights. One weighted average, no retraining, gives you a dial between the two behaviours - and it is nearly free to try. THE THING I WOULD SAY LAST. Some forgetting is correct. If you fine-tune a model to always answer in JSON, it SHOULD lose the ability to answer in prose. The question is never 'did anything change' but 'did anything change that we were relying on', and only a pre-declared capability suite answers that."
        },
        {
          "q": "Your fine-tuned model beats the base model on your benchmark but users say it got worse. How do you investigate?",
          "a": "This is the most common shape of fine-tuning failure and the users are usually right, because their distribution is the real one and the benchmark is a proxy that you built. I would work through four hypotheses in order of frequency. HYPOTHESIS 1: THE BENCHMARK IS INSIDE THE FINE-TUNING DISTRIBUTION AND THE USERS ARE NOT. Check how the benchmark was constructed. If it was split off the same collection the fine-tuning data came from, it measures fit to that collection, and any way in which real traffic differs - longer inputs, different phrasing, topics that were rare in the corpus - is uncovered. Fix: build an evaluation set by SAMPLING PRODUCTION TRAFFIC and labelling it, which is the only evaluation whose distribution is guaranteed correct. HYPOTHESIS 2: FORGETTING. The model got better at the target and worse at everything adjacent that users also do. Diagnostic: run the base and the fine-tune side by side on a broad capability suite and on real user prompts, and diff. This usually shows up immediately and is usually the answer when 'it got worse' is vague rather than specific. HYPOTHESIS 3: A DISTRIBUTIONAL PROPERTY THE METRIC DOES NOT SCORE. Fine-tuning changes verbosity, hedging, refusal rate, format adherence, and calibration - and accuracy metrics are blind to all of them. A model that got 3 points more accurate and 40% more verbose is worse to use. Diagnostic: measure output length, refusal rate and format-violation rate before and after; they are one line each and they explain a surprising share of these complaints. HYPOTHESIS 4: THE COMPLAINTS ARE CONCENTRATED. 'Users say it got worse' is often a subpopulation - one language, one customer segment, one input format that collapsed. Aggregate accuracy hides this completely. Diagnostic: SLICE the evaluation by every dimension you have and look for a slice that moved the other way. HOW I WOULD RUN IT. Collect the actual complaints first and read fifty of them before touching a metric, because they will usually name the hypothesis for me. Then build the production-sampled evaluation set, because whatever the cause, I will need it to verify the fix, and its absence is the reason the problem shipped. WHAT I WOULD SAY ABOUT PROCESS. The deeper failure is that the benchmark was accepted as the arbiter without asking what distribution it was drawn from. That question is free at the start and expensive here."
        },
        {
          "q": "When would you deliberately choose full fine-tuning over any parameter-efficient method?",
          "a": "There are real cases, and being able to name them is what separates understanding the trade from repeating that PEFT is better. CASE 1: LARGE-SCALE DOMAIN ADAPTATION - genuinely new material. If you have billions of tokens of a domain the base model barely saw - a low-resource language, proprietary code in an unusual dialect, a scientific literature with its own notation - you are not adapting a readout, you are teaching the model things it does not know. Biderman et al.'s measurement is the relevant evidence: on continued pretraining in a new domain, LoRA underperformed full fine-tuning substantially, and the gap did not close by raising the rank into the hundreds. The low-rank constraint is a real constraint, and this is the regime where it binds. CASE 2: THE MODEL IS SMALL ENOUGH THAT THE MEMORY ARGUMENT EVAPORATES. PEFT exists because 16 bytes per parameter is fatal at 7B and above. At 100M parameters that is 1.6 GB and there is nothing to solve; adding an adapter buys complexity and a serving abstraction for no benefit. Most PEFT advocacy is implicitly about large models and gets copied down to small ones without the premise. CASE 3: MAXIMUM QUALITY AND ONE DEPLOYED MODEL. If you serve exactly one fine-tuned model, the multi-adapter serving story - which is much of LoRA's practical appeal - is worth nothing to you, and you should take whatever quality the unconstrained update gives. CASE 4: YOU NEED TO CHANGE SOMETHING STRUCTURAL. Extending the vocabulary, changing the positional encoding for longer context, altering the architecture. Adapters bolt onto an existing structure; they do not help you modify it. CASE 5: AS A CEILING MEASUREMENT. Even when you intend to ship PEFT, running the unconstrained fine-tune at small scale tells you what the constraint COST. Without it, 'LoRA matched full fine-tuning' is an assumption you inherited from a paper on a different task. THE HONEST FRAMING. The LoRA paper's claim was parity on a set of adaptation tasks, and it holds well there. It was never a claim about every use of fine-tuning, and the cases above are the ones where it was over-generalized. The trade is: constrained update, less learned and less forgotten, far less memory, trivial multi-task serving. Which side wins depends on whether your task needs the model to know something new or merely to behave differently."
        }
      ]
    },
    "flashcards": [
      {
        "type": "pitfall",
        "front": "Fine-tuning can underperform out-of-distribution",
        "back": "Kumar et al. 2022: full FT beat linear probing IN-distribution and LOST out-of-distribution. LP-FT (probe, then fine-tune) was about 1 pt better ID and 10 pts better OOD than full FT across ten shift benchmarks."
      },
      {
        "type": "intuition",
        "front": "Why fine-tuning from a random head distorts features",
        "back": "Random head -> large loss -> large gradients into the backbone BEFORE the head can read the features. The backbone is rewritten to compensate for a bad head, and drifts freely in the directions the fine-tuning data does not span - which is exactly where OOD lives."
      },
      {
        "type": "formula",
        "front": "Memory per parameter, mixed-precision Adam",
        "back": "16 bytes: 2 fp16 weights + 2 fp16 grads + 4 fp32 master + 8 Adam m,v. Only the first 2 apply to FROZEN params - which is the entire basis of PEFT. 7B model = ~112 GB."
      },
      {
        "type": "definition",
        "front": "The adaptation spectrum as one equation",
        "back": "theta = theta_0 + Delta, differing only in the constraint on Delta: backbone part = 0 (feature extraction), lower layers = 0 (partial unfreezing), rank <= r (LoRA), unconstrained (full FT)."
      },
      {
        "type": "formula",
        "front": "Discriminative / layer-wise LR decay (ULMFiT)",
        "back": "eta_l = eta_L * xi^(L-l), xi in [0.8, 0.95]. xi=0 recovers feature extraction, xi=1 recovers full FT - the whole spectrum in one hyperparameter. With xi=0.9 over 24 layers, layer 0 trains at ~8% of the top rate."
      },
      {
        "type": "pitfall",
        "front": "The frozen-BatchNorm bug",
        "back": "requires_grad=False stops gradients but NOT running-statistics updates. A 'frozen' backbone still drifts on every forward pass. You must also call .eval() on it. One of the most common silent bugs in transfer-learning code."
      },
      {
        "type": "definition",
        "front": "LP-FT",
        "back": "Linear-probe the head with the backbone frozen, then unfreeze and fine-tune everything. Two extra lines. Works because after probing, dL/df is small, so the gradient entering the backbone is a refinement rather than a repair."
      },
      {
        "type": "pitfall",
        "front": "PEFT does not make training FAST",
        "back": "It cuts MEMORY (grads + optimizer state), not compute. You still run the full forward pass and still backpropagate THROUGH the frozen layers to reach the trainable parts. Which is why QLoRA (weights) and gradient checkpointing (activations) attack the terms PEFT leaves alone."
      },
      {
        "type": "definition",
        "front": "WiSE-FT",
        "back": "Interpolate zero-shot and fine-tuned weights AFTER training: theta = (1-a)theta_0 + a*theta_ft. Recovers much of the robustness while keeping most of the target gain, for the cost of one weighted average. Almost never tried."
      },
      {
        "type": "intuition",
        "front": "Why in-distribution accuracy always recommends less constraint",
        "back": "It rises monotonically with trainable parameters, because more capacity fits the fine-tuning distribution better - and the ID test split IS that distribution. So selecting on it always picks the least constrained method, correctly measuring fit and telling you nothing about adaptation."
      },
      {
        "type": "pitfall",
        "front": "Catastrophic forgetting is structurally invisible",
        "back": "Every metric in a fine-tuning pipeline is computed on the fine-tuning distribution; forgetting happens off it. Fix a capability suite BEFORE training, run it on the base model, and put both columns beside the target metric."
      },
      {
        "type": "intuition",
        "front": "When full fine-tuning genuinely wins",
        "back": "When the model must LEARN SOMETHING NEW rather than behave differently: large-scale domain adaptation, new languages, structural changes (vocabulary, positional encoding). Biderman et al. found LoRA underperforms full FT on continued pretraining, and raising rank does not close it."
      }
    ],
    "refs": [
      {
        "title": "Kumar et al. (2022), Fine-Tuning can Distort Pretrained Features and Underperform Out-of-Distribution",
        "url": "https://arxiv.org/abs/2202.10054"
      },
      {
        "title": "Howard & Ruder (2018), Universal Language Model Fine-tuning for Text Classification (ULMFiT)",
        "url": "https://arxiv.org/abs/1801.06146"
      },
      {
        "title": "Yosinski et al. (2014), How transferable are features in deep neural networks?",
        "url": "https://arxiv.org/abs/1411.1792"
      },
      {
        "title": "Wortsman et al. (2022), Robust fine-tuning of zero-shot models (WiSE-FT)",
        "url": "https://arxiv.org/abs/2109.01903"
      },
      {
        "title": "Kirkpatrick et al. (2017), Overcoming catastrophic forgetting in neural networks (EWC)",
        "url": "https://arxiv.org/abs/1612.00796"
      }
    ],
    "demos": [
      "overfitting",
      "bias-variance-decomp",
      "lr-schedule",
      "drift-detection"
    ]
  },
  "lora": {
    "level": "core",
    "body": {
      "intuition": [
        "The previous lesson left a constraint table with one row unexplained: instead of choosing WHICH parameters may move, constrain the SHAPE of the update. LoRA's claim is that the update a fine-tune needs is intrinsically low-rank, so you can write it as a product of two thin matrices and train those instead. Freeze W, learn B and A with inner dimension r, and use W + BA. For a 4096 x 4096 projection at r = 8, that is 65,536 trainable numbers in place of 16.8 million - about 0.4%.",
        "The premise was not a guess. Aghajanyan et al. had already measured the INTRINSIC DIMENSION of fine-tuning by restricting the update to a random low-dimensional subspace and asking how few dimensions still reached 90% of full fine-tuning's performance. For RoBERTa on several tasks the answer was in the low hundreds, out of hundreds of millions of parameters. And the larger the pretrained model, the SMALLER the intrinsic dimension - which is the counterintuitive part, and the reason the technique gets better rather than worse as models grow. LoRA replaced the random subspace with a learned one and made the whole thing practical.",
        "Two properties make it the default rather than merely a good idea. First, B is initialized to ZERO, so BA = 0 at step 0 and the adapted model is EXACTLY the pretrained model - no shock from a random new module, which is the feature-distortion problem of the previous lesson solved by construction. Second, the update is a plain matrix, so after training you can ADD it into W and serve a model with identical architecture and identical latency. Adapters that insert layers cannot do that. Now name the proxy: LoRA's headline claim is parity with full fine-tuning on a set of ADAPTATION benchmarks - GLUE, WikiSQL, instruction tuning - and on those it holds up well. Biderman et al. later ran the same comparison on CONTINUED PRETRAINING in code and mathematics, where the model has to absorb material it does not already know, and found LoRA substantially behind, with the gap not closing as rank rose into the hundreds. They also found it forgot less. Those are not two findings. A constrained update learns less and destroys less, and which side of that you want is a property of your task, not of the method."
      ],
      "math": [
        {
          "h": "The low-rank update, and why it is free at inference",
          "paras": [
            "W0 is frozen. A is r x k, B is d x r, and only those two train. The forward pass is the original projection plus a detour through an r-dimensional bottleneck.",
            "The second line is the property adapters do not have. Because the update is a matrix of the same shape as W0, it can be folded in after training - the deployed model has the original architecture, the original parameter count, and the original latency."
          ],
          "tex": "h = W_0 x + \\tfrac{\\alpha}{r} B A x, \\qquad B \\in \\mathbb{R}^{d\\times r},\\; A \\in \\mathbb{R}^{r\\times k},\\; r \\ll \\min(d,k) \\\\[4pt] \\text{merge: } W' = W_0 + \\tfrac{\\alpha}{r} BA \\;\\Rightarrow\\; \\text{zero added latency}",
          "texNote": "A is initialized from a small random distribution and B is initialized to ZERO, so the product is zero and the model at step 0 is bit-for-bit the pretrained one. The gradient is still non-zero - dL/dA depends on B and dL/dB depends on A, and since A is non-zero the B gradient moves first - so training starts immediately but from an exact identity."
        },
        {
          "h": "The parameter count, which is the entire commercial case",
          "paras": [
            "Compare what you store and optimize. The saving is a ratio of a sum to a product, so it grows as the matrices do - which is why LoRA gets more compelling at larger scale rather than less."
          ],
          "tex": "\\frac{|\\Delta W_{\\text{LoRA}}|}{|W|} = \\frac{r(d+k)}{dk} \\;\\xrightarrow{\\;d=k\\;}\\; \\frac{2r}{d}",
          "texNote": "At d = k = 4096 and r = 8 this is 2(8)/4096, about 0.4%. Applied to a 7B model across all linear layers with r = 16, a typical adapter is tens of megabytes against 14 GB of weights. Combined with the 16-bytes-per-trainable-parameter accounting from the previous lesson, gradient and optimizer state effectively vanish - and that, not compute, is what LoRA buys."
        },
        {
          "h": "The scaling factor, and the reason rsLoRA exists",
          "paras": [
            "The alpha/r factor is what lets you change r without re-tuning the learning rate: as r grows, more terms contribute to each output, so the sum is divided down. Except that the original 1/r is too aggressive.",
            "Kalajdzievski's observation is that under 1/r the effective gradient scale COLLAPSES as rank rises, so higher-rank adapters silently learn less - which made the widely repeated 'higher rank does not help' result partly an artefact of the scaling rather than a fact about rank."
          ],
          "tex": "\\text{LoRA: } \\gamma_r = \\frac{\\alpha}{r} \\qquad\\text{vs}\\qquad \\text{rsLoRA: } \\gamma_r = \\frac{\\alpha}{\\sqrt{r}}",
          "texNote": "The practical consequence you should carry into any experiment: alpha and r are NOT independent knobs. Doubling r while holding alpha fixed halves the effective update scale under the original rule, so a rank sweep at fixed alpha is confounded with a learning-rate sweep. Either scale alpha with r, or use the sqrt(r) rule, or you are not measuring what you think you are."
        }
      ],
      "code": [
        {
          "h": "LoRALinear from scratch - the whole method is about twenty lines",
          "paras": [
            "There is no hidden machinery. A frozen linear layer, two small matrices, a scale, and a merge function. Writing it once removes most of the mystique and makes the failure modes obvious."
          ],
          "code": "class LoRALinear(nn.Module):\n    def __init__(self, base: nn.Linear, r: int = 8, alpha: int = 16, p: float = 0.0):\n        super().__init__()\n        self.base = base\n        for prm in self.base.parameters():\n            prm.requires_grad = False              # W0 is frozen, always\n        d, k = base.out_features, base.in_features\n        self.A = nn.Parameter(torch.empty(r, k))\n        self.B = nn.Parameter(torch.zeros(d, r))   # <- ZERO: BA = 0 at init\n        nn.init.kaiming_uniform_(self.A, a=math.sqrt(5))\n        self.scale = alpha / r\n        self.drop = nn.Dropout(p)\n        self.merged = False\n\n    def forward(self, x):\n        out = self.base(x)\n        if not self.merged:\n            out = out + self.drop(x) @ self.A.T @ self.B.T * self.scale\n        return out\n\n    @torch.no_grad()\n    def merge(self):\n        \"\"\"Fold the update into W0. After this the layer IS a plain nn.Linear.\"\"\"\n        self.base.weight += self.scale * (self.B @ self.A)\n        self.merged = True\n\n# WHY B = 0 AND NOT BOTH ZERO: if A and B were both zero, dL/dA ~ B = 0 and\n# dL/dB ~ A = 0, so nothing ever moves - a dead adapter. One of the two must\n# be non-zero to break the symmetry; zeroing B is the choice that also makes\n# the model at step 0 identical to the base.\n#\n# WHY THIS MATTERS: it is the feature-distortion problem from 13-01 solved by\n# construction. There is no random new module shocking the pretrained one.",
          "caption": "The whole method. B = 0 makes the adapted model identical to the base at step 0; A must be non-zero or no gradient flows at all. merge() folds the update into W0, which is why LoRA adds zero inference latency and adapters do not."
        },
        {
          "h": "Where to attach it, and how to sweep rank without fooling yourself",
          "paras": [
            "The two decisions that actually move results. The original paper attached LoRA to the attention query and value projections only - a choice made under a 2021 parameter budget - and much of the folklore about rank comes from that setting rather than from modern practice."
          ],
          "code": "# TARGET MODULES. In a transformer block the MLP holds about two thirds of\n# the parameters (8d^2 vs 4d^2 for attention), so attention-only LoRA leaves\n# most of the model unreachable.\n#\n#   q_proj, v_proj ................. the original paper's choice\n#   q,k,v,o ........................ all of attention\n#   q,k,v,o + gate,up,down ......... modern default; consistently better\n#                                    per trainable parameter on instruction\n#                                    tuning, and what QLoRA recommends\n#\n# RANK. The paper found r = 1 or 2 already competitive for q,v on GPT-3, and\n# its subspace-similarity analysis showed the top directions learned at r = 8\n# and r = 64 largely COINCIDE - the extra rank was mostly unused capacity.\n\n# THE CONFOUND that invalidates most casual rank sweeps:\nfor r in [4, 8, 16, 32, 64]:\n    cfg = LoraConfig(r=r, lora_alpha=16)     # <-- WRONG: alpha fixed\n    # effective scale = alpha/r, so r=64 trains at 1/16 the scale of r=4.\n    # You are sweeping the learning rate and calling it a rank sweep.\n\nfor r in [4, 8, 16, 32, 64]:\n    cfg = LoraConfig(r=r, lora_alpha=2 * r)  # hold alpha/r constant\n    # or use rsLoRA's alpha/sqrt(r), which keeps the gradient scale stable\n    # as r grows instead of collapsing it.\n\n# WHAT THE HONEST SWEEP SHOWS. On ADAPTATION tasks, rank saturates early -\n# the LoRA paper's finding survives. On CONTINUED PRETRAINING in a new\n# domain, Biderman et al. found LoRA behind full fine-tuning and the gap did\n# NOT close at ranks into the hundreds. Different regime, different answer.",
          "caption": "Two decisions do the work: attach to the MLP as well as attention (it holds two thirds of the parameters), and hold alpha/r fixed when sweeping rank - otherwise the sweep is confounded with a learning-rate sweep and you will conclude that rank does not matter."
        }
      ],
      "useCases": [
        "Serving many fine-tunes from one base model - the property that made LoRA a product rather than a technique. Adapters are tens of megabytes, so thousands can sit in memory beside one copy of the weights, and systems like S-LoRA batch requests for DIFFERENT adapters together, which is impossible with full fine-tunes.",
        "Fine-tuning a large model on a single consumer GPU, since the 14 of 16 bytes per parameter that are gradient and optimizer state apply only to the adapter. This is the ordinary path for anyone adapting a 7B-to-70B model outside a well-funded lab.",
        "Style, format and behaviour adaptation - instruction following, tone, structured output, persona - where the model already has the capability and the fine-tune is teaching it which behaviour to select. This is the regime where the low-rank constraint costs least, and it is most fine-tuning in practice.",
        "Rapid experimentation and rollback: adapters are small enough to version like configuration, compose or swap per request, and remove entirely by not loading them. Full fine-tunes are 14 GB artefacts with none of those properties."
      ],
      "pitfalls": [
        "Sweeping rank at fixed alpha. The effective scale is alpha/r, so raising r lowers the update magnitude proportionally - your rank sweep is a learning-rate sweep in disguise, and it will tell you rank does not help. Hold alpha/r constant or use rsLoRA's alpha/sqrt(r).",
        "Applying LoRA to attention only. That was a 2021 budget decision. The MLP holds roughly two thirds of a transformer block's parameters (8d^2 against 4d^2), so attention-only adapters leave most of the model untouched; targeting all linear layers is the modern default and generally better per trainable parameter.",
        "Initializing both A and B to zero. Then dL/dA is proportional to B and dL/dB to A, both zero, and the adapter never moves. Exactly one must be non-zero - conventionally A random, B zero, which also makes the step-0 model identical to the base.",
        "Merging an adapter into a quantized base and expecting it to be lossless. The merge is exact in the precision you do it in; folding a bf16 update into 4-bit weights requires dequantizing, adding, and requantizing, and the requantization error is not the training error you measured. Serve QLoRA adapters unmerged, or merge into the fp16 base.",
        "Assuming LoRA equals full fine-tuning because a paper said so. That parity claim was made on ADAPTATION benchmarks. On continued pretraining in code and mathematics, Biderman et al. measured a substantial gap that higher rank did not close. Ask which regime you are in before inheriting the conclusion.",
        "Losing track of which base a saved adapter belongs to. An adapter is meaningless without its exact base checkpoint, and the failure mode when they mismatch is degraded output rather than an error. Pin the base model revision in the adapter metadata.",
        "Treating LoRA's reduced forgetting as free. It is the same property as reduced learning - a constrained update changes less of the model in both the directions you wanted and the ones you did not. If your task genuinely requires new knowledge, that trade is working against you."
      ],
      "connections": [
        {
          "ref": "fine-tuning/full-fine-tuning",
          "text": "LoRA is one row of that lesson's constraint table - rank(Delta) <= r - and its memory case is that lesson's 16-bytes-per-trainable-parameter accounting applied to a 0.4% adapter."
        },
        {
          "ref": "unsupervised-learning/pca",
          "text": "Same underlying claim in a different setting: a high-dimensional object is well approximated in a few directions. The intrinsic-dimension measurement that motivated LoRA is the fine-tuning version of asking how many principal components you actually need."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "QLoRA is LoRA plus a 4-bit frozen base. It works precisely because the base is frozen and therefore never a gradient target, so its precision only has to suffice for a forward pass."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The other way to make a large model fit. Quantization compresses the weights you have; LoRA compresses the update you are learning - they attack different terms and compose, which is the whole of QLoRA."
        },
        {
          "ref": "fine-tuning/adapters",
          "text": "The direct comparison. Bottleneck adapters insert layers and therefore add sequential depth at inference; LoRA's update merges into W and adds none. That difference, not accuracy, is why LoRA won."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is LoRA in one sentence?",
          "a": "Freeze the pretrained weight W0 and learn a low-rank update BA with inner dimension r, so h = W0 x + (alpha/r) BA x and only B and A train."
        },
        {
          "q": "How many parameters does a LoRA layer add?",
          "a": "r(d + k) against dk for the full matrix. At d = k = 4096 and r = 8 that is about 0.4%."
        },
        {
          "q": "How are A and B initialized and why?",
          "a": "A random, B zero. So BA = 0 and the model at step 0 is exactly the base. Both zero would be a dead adapter, since each one's gradient is proportional to the other."
        },
        {
          "q": "Why does LoRA add no inference latency?",
          "a": "The update is a matrix of the same shape as W0, so after training you can fold it in: W' = W0 + (alpha/r)BA. The deployed model has the original architecture and latency."
        },
        {
          "q": "What is the intrinsic-dimension result behind LoRA?",
          "a": "Aghajanyan et al. showed fine-tuning restricted to a random subspace of a few hundred dimensions reaches ~90% of full fine-tuning, and that larger pretrained models have SMALLER intrinsic dimension."
        },
        {
          "q": "What does alpha do?",
          "a": "It sets the update scale through the factor alpha/r, which is what lets you change r without re-tuning the learning rate. It is not independent of r."
        },
        {
          "q": "What is rsLoRA?",
          "a": "Scale by alpha/sqrt(r) instead of alpha/r. Under the original rule the effective gradient scale collapses as rank rises, so high-rank adapters silently underperform."
        },
        {
          "q": "Which modules should LoRA target?",
          "a": "All linear layers, including the MLP. The original paper used only q and v projections, but the MLP holds about two thirds of a block's parameters."
        },
        {
          "q": "Does LoRA make training faster?",
          "a": "Barely. It cuts memory - gradients and optimizer state - but you still run the full forward pass and still backpropagate through the frozen layers to reach the adapter."
        },
        {
          "q": "What did Biderman et al. (2024) find?",
          "a": "LoRA learns less and forgets less. On continued pretraining in code and maths it trailed full fine-tuning substantially, and higher rank did not close the gap; on instruction tuning it was much closer."
        },
        {
          "q": "Why is LoRA good for serving many fine-tunes?",
          "a": "Adapters are tens of megabytes, so thousands fit beside one base model, and systems like S-LoRA can batch requests for different adapters together. Full fine-tunes are separate multi-gigabyte models."
        },
        {
          "q": "What breaks when you merge a LoRA into a quantized base?",
          "a": "You must dequantize, add, and requantize; the requantization error is not the error you measured during training. Serve unmerged, or merge into the fp16 base."
        }
      ],
      "standard": [
        {
          "q": "Explain LoRA end to end - the motivation, the mechanism, and what it costs.",
          "a": "THE MOTIVATION IS A MEASUREMENT, not an intuition. Aghajanyan et al. asked how many dimensions fine-tuning actually needs: restrict the update to a random d-dimensional subspace and find the smallest d reaching 90% of full fine-tuning. For RoBERTa the answer was in the low hundreds out of hundreds of millions of parameters, and - the striking part - the LARGER the pretrained model, the smaller that number. So the update a fine-tune needs is intrinsically tiny, and the only reason full fine-tuning materializes all of it is that nobody had a practical way to constrain it. LoRA's contribution is replacing the random subspace with a LEARNED one. THE MECHANISM. Freeze W0. Learn B (d x r) and A (r x k), and compute h = W0 x + (alpha/r) B A x. Only B and A carry gradients. A is initialized randomly, B to ZERO, so the product is zero and the model at step 0 is bit-for-bit the base model - which is not cosmetic: it solves the feature-distortion problem from the previous lesson by construction, because there is no randomly-initialized module shocking the pretrained one. Both zero would not work, since dL/dA is proportional to B and dL/dB to A, so the adapter would never move; exactly one must break the symmetry. WHAT IT COSTS AND SAVES. The parameter ratio is r(d+k)/dk, about 0.4% at d = k = 4096, r = 8. Combined with the sixteen-bytes-per-trainable-parameter accounting, gradients and optimizer state effectively disappear, which is what lets a 7B fine-tune fit on one consumer GPU. It does NOT make training much faster - the full forward pass still runs and gradients still flow back through every frozen layer to reach the adapters. Memory is the win; compute is roughly unchanged. THE PROPERTY THAT MADE IT WIN. The update has the same shape as W0, so you can MERGE it: W' = W0 + (alpha/r)BA, and serve a model with the original architecture and identical latency. Bottleneck adapters, which insert layers, cannot do this and pay a permanent latency cost. Equally, keeping adapters unmerged makes multi-tenant serving possible - thousands of small adapters beside one base, with systems like S-LoRA batching across different adapters in one pass. THE HONEST BOUNDARY. The parity-with-full-fine-tuning claim was measured on ADAPTATION benchmarks and holds there. Biderman et al. ran the same comparison on continued pretraining in code and mathematics and found LoRA clearly behind, with the gap not closing at ranks into the hundreds - while also forgetting less of the base model's other abilities. Those are one property seen twice: a constrained update changes less, in the directions you wanted and the ones you did not. Which side you want depends on whether the task needs the model to know something new or to behave differently, and most production fine-tuning is the latter.",
          "deepDive": {
            "q": "Someone reports that increasing LoRA rank from 8 to 64 made their results worse. What do you check first, and what does the answer imply?",
            "a": "FIRST CHECK, and it explains this most of the time: did they hold alpha fixed? The update is scaled by alpha/r. Going from r = 8 to r = 64 at constant alpha divides the effective update magnitude by eight. They did not run a rank sweep; they ran a learning-rate sweep with the rate falling as rank rose, and 'higher rank is worse' is the expected result of that experiment regardless of what rank does. THE FIX is to hold alpha/r constant - set alpha = 2r, say - or adopt rsLoRA's alpha/sqrt(r). Kalajdzievski's argument is that even a constant alpha/r is wrong: as r grows, the sum over r terms concentrates and the gradient scale that reaches the adapter collapses, so 1/r over-damps. The sqrt(r) rule keeps the update's scale stable in r, and under it higher ranks train properly rather than silently stalling. WHY THIS MATTERS BEYOND THE BUG. A large share of the received wisdom that 'rank barely matters, use 8' comes from sweeps with this confound. The LoRA paper's own subspace-similarity analysis is better evidence for the claim - it showed the top singular directions learned at r = 8 and r = 64 largely coincide, meaning the extra rank was genuinely unused rather than mis-scaled - but that was on adaptation tasks. SECOND CHECK: what is the task? If they are doing continued pretraining on a new domain rather than adaptation, the expected shape is the opposite - low rank should be the binding constraint - and if they still see no gain from rank, something else is wrong: probably that they are targeting attention only, so two thirds of the parameters are unreachable at any rank. THIRD CHECK: overfitting. Higher rank is more capacity; on a small dataset the extra capacity fits the training set and the validation number moves the wrong way. This is diagnosable in one look at the training-versus-validation curves and is a real cause rather than an artefact. WHAT I WOULD TAKE AWAY. The general lesson is that alpha and r are coupled, and any hyperparameter sweep over one member of a coupled pair, with the other held fixed, measures the coupling rather than the parameter. That pattern is not specific to LoRA - it is the same error as sweeping batch size at fixed learning rate - and noticing it is most of the skill."
          }
        },
        {
          "q": "When would you NOT use LoRA?",
          "a": "FOUR CASES, and they follow from what the constraint actually is. CASE 1: THE MODEL MUST LEARN GENUINELY NEW MATERIAL. Continued pretraining on a low-resource language, a proprietary code dialect, a scientific domain with its own notation. Biderman et al. measured this directly: on code and mathematics continued pretraining, LoRA trailed full fine-tuning substantially and raising rank into the hundreds did not close it. The low-rank constraint is a real constraint and this is where it binds. The distinction I would draw is between teaching the model to KNOW something and teaching it to DO something - LoRA is excellent at the second. CASE 2: THE MODEL IS SMALL. The entire case for PEFT is that 16 bytes per parameter is fatal at 7B and up. At 100M parameters full fine-tuning needs about 1.6 GB of state and there is nothing to solve; LoRA adds an abstraction, a merge step, and a hyperparameter pair for no benefit. Much PEFT advice is implicitly about large models and gets applied to small ones with the premise dropped. CASE 3: YOU NEED TO CHANGE STRUCTURE, not weights. Extending the vocabulary, resizing embeddings, changing positional encoding for longer context, adding a modality. LoRA modifies existing linear layers; it does not help you add or reshape them. In practice these fine-tunes are hybrids - full training of the new embedding rows, LoRA elsewhere. CASE 4: ONE MODEL, MAXIMUM QUALITY, NO MEMORY CONSTRAINT. Much of LoRA's practical value is multi-tenant serving and single-GPU training. If you deploy exactly one model and have the hardware, those are worth nothing to you and you should take whatever the unconstrained update gives. A FIFTH THING I WOULD MENTION. Even when I intend to ship LoRA, I want the unconstrained fine-tune run once at whatever scale I can afford, purely as a CEILING. Otherwise 'LoRA matched full fine-tuning' is a claim I inherited from a paper about a different task, and the whole point of this module is not doing that."
        },
        {
          "q": "How does LoRA change how you SERVE fine-tuned models?",
          "a": "This is where LoRA stopped being a training trick and became infrastructure, and it is the part interviewers most often find under-explained. THE PROBLEM IT SOLVES. With full fine-tuning, N customers means N complete models. At 14 GB each you fit one or two per GPU, you cannot batch across customers because they are different models, and utilization is terrible - most adapters serve occasional traffic while occupying a whole accelerator. THE LORA PICTURE. One copy of the base weights, plus N adapters at tens of megabytes. A thousand adapters is tens of gigabytes of adapter against 14 GB of base, so they all fit in host memory and the hot ones fit on device. THE KEY TRICK, and the reason this is not obvious: you must serve UNMERGED. If you merge, you are back to N models. Unmerged, the forward pass is h = W0 x + (alpha/r) B_i A_i x for request i, and the W0 x term is SHARED ACROSS THE WHOLE BATCH regardless of which adapter each request uses. Only the small BA detour is per-request. So you can batch requests for DIFFERENT fine-tunes into one forward pass - which is impossible with any other adaptation method. Systems like S-LoRA and Punica implement exactly this, with custom kernels for the batched heterogeneous low-rank term and paging of adapters between host and device. WHAT IT COSTS. Serving unmerged is slower per token than serving merged, because you pay the extra BA matmuls and they are small, awkwardly-shaped operations that use the accelerator poorly. So there is a genuine decision: merge for a single high-traffic adapter where latency dominates; keep unmerged for the long tail where utilization dominates. Many production systems do both. THE COMPARISON THAT MAKES THE POINT. Bottleneck adapters cannot be merged at all - they insert layers - so they pay the latency cost permanently AND, because their operation is sequential rather than an additive side path, they are harder to batch heterogeneously. Prompt tuning is even better on the serving axis (the per-task state is just some prefix embeddings, trivially batched) but worse on quality and stability. That three-way trade - merge-ability, batch-ability, quality - is the real comparison table for PEFT methods, and accuracy on a saturated benchmark is not.",
          "deepDive": {
            "q": "Walk through what actually happens in a batched heterogeneous-adapter forward pass. Where does the efficiency come from, and where does it go?",
            "a": "SETUP. A batch of B requests, each tagged with an adapter index. The base weight W0 is one shared tensor; adapters are stored as a stacked tensor of A's (B x r x k, gathered per request) and B's. THE SHARED PART. h_base = X W0^T is a single dense GEMM over the whole batch - the same operation you would run with no adapters at all, at full arithmetic intensity, and it is the overwhelming majority of the FLOPs. This is where the efficiency comes from: the expensive part of the model is adapter-independent, so heterogeneity costs nothing there. THE PER-REQUEST PART. Each request needs (alpha/r) B_i A_i x_i with its own matrices. Implemented naively that is a Python loop of B tiny matmuls - terrible. The systems work is in doing it as a single batched operation: gather the relevant A and B slices, and run a grouped or segmented GEMM (Punica's SGMV kernel is the well-known instance) that computes all B low-rank detours in one launch. WHERE THE EFFICIENCY GOES. Three places. (1) ARITHMETIC INTENSITY. These are r-dimensional operations with r around 8 to 64. They are memory-bound - you move the adapter weights and do almost no arithmetic per byte - so they run far below peak, and their cost is closer to their memory traffic than their FLOP count suggests. (2) ADAPTER RESIDENCY. With enough distinct adapters in flight, you page them from host memory, and PCIe transfer can dominate. Hence adapter caching and admission policies - the same shape of problem as KV-cache management. (3) RAGGED BATCHES. If the batch contains many distinct adapters with one request each, the grouped GEMM degenerates toward the naive loop. Throughput is best when a modest number of adapters are hot, and worst on a perfectly uniform long tail. THE DESIGN CONSEQUENCE. This is why r is a SERVING parameter as well as a quality one - it directly sets the per-request memory traffic - and why production systems often standardize on one rank across all tenants, so the batched kernel has a uniform shape. It is also why a merged single-tenant deployment can still be the right answer: if one adapter takes 90% of traffic, merge it and serve the tail unmerged. THE GENERAL POINT. The trick works because LoRA's update is an ADDITIVE SIDE PATH rather than a modification of the shared computation. Any adaptation method with that structure inherits the property; any method that changes the main path - bottleneck adapters, modified attention, extra layers - does not. Structure, not accuracy, decided which PEFT method became infrastructure."
          }
        },
        {
          "q": "Is LoRA a regularizer? Argue both sides.",
          "a": "It behaves like one and it is worth being precise about how, because the loose version of this claim leads people astray. THE CASE THAT IT IS. LoRA restricts the update to a rank-r subspace, which is a hard constraint on the hypothesis class - strictly smaller than full fine-tuning's. It keeps the adapted weights close to the pretrained ones, since the update's magnitude is bounded by what a thin product can express at the learning rates used. Empirically it shows all the signatures: better relative performance on small datasets, worse on large ones, and Biderman et al.'s direct measurement that it FORGETS LESS of the base model's other abilities than full fine-tuning does. They also report it maintains more diverse generations, which is the classic 'stayed nearer the prior' signature. Under the standard framing, the pretrained model is a prior and LoRA constrains you to a neighbourhood of it, which is exactly what a regularizer does. THE CASE THAT THE FRAMING MISLEADS. A regularizer usually implies a bias-variance trade you can tune toward the sweet spot: dial the strength, find the optimum. LoRA's constraint is not that. It is a constraint on the SHAPE of the update, not its magnitude, and rank is a poor proxy for strength - the paper's own subspace analysis found the directions learned at r = 8 and r = 64 largely coincide, so raising rank often adds nothing rather than smoothly relaxing the constraint. Meanwhile weight decay, dropout and early stopping are all still available and are actual strength knobs. More importantly, calling it a regularizer suggests the constraint costs nothing when the data is small and everything is fine - but the continued-pretraining result shows a regime where the constraint costs a lot and MORE DATA DOES NOT HELP, because the limitation is expressive rather than statistical. That is not what a regularizer does. WHAT I WOULD ACTUALLY SAY. LoRA has a regularizing EFFECT, arising from proximity to the pretrained weights rather than from rank per se - which is why the effect largely survives at high rank, and why methods that explicitly penalize distance from the base (KL anchoring in RLHF, L2-to-base, WiSE-FT's interpolation) produce a similar benefit without any rank constraint. The useful operational statement is Biderman's: learns less, forgets less, one property. If forgetting is your binding concern, that is a feature you can rely on. If capability acquisition is, it is the cost, and no amount of rank buys your way out."
        },
        {
          "q": "How would you set up an experiment to decide whether LoRA is good enough for your task?",
          "a": "The point of the experiment is to measure what the constraint COST, so it has to include the unconstrained run. Everything else follows from that. THE ARMS. (1) Base model, zero-shot and few-shot - the floor, and it decides whether fine-tuning is warranted at all. (2) Full fine-tuning, at whatever scale I can afford; if the target model is too large, run it on a smaller model of the same family and treat the LoRA-to-full gap there as an estimate. (3) LoRA at two or three ranks with alpha/r held constant, targeting all linear layers. (4) Optionally LP-FT-style staging, since the same random-head logic applies to any new head. THE EVALUATION, which matters more than the arms. Three columns, always. IN-DISTRIBUTION on a properly deduplicated, ideally time-based split of the fine-tuning data. OUT-OF-DISTRIBUTION on something the fine-tuning data did not generate - production traffic if I have it. And a PRE-DECLARED CAPABILITY SUITE run on the base model before anything, re-run on every arm, to price the forgetting. Without the third column I cannot see LoRA's main advantage, and without the second I will pick whichever arm has the most trainable parameters. THE HYPERPARAMETER DISCIPLINE. Tune the learning rate separately per arm - LoRA's optimum is typically an order of magnitude higher than full fine-tuning's (1e-4 versus 1e-5 is a common pairing), and comparing them at a shared rate is a very common way to make a method look bad. Hold alpha/r fixed across ranks. Fix the data, the number of epochs, and the seed across arms, and run more than one seed if the differences are small, because fine-tuning variance on modest datasets is routinely larger than the effects being compared. THE DECISION RULE, written down in advance. If LoRA is within a pre-stated tolerance in distribution, no worse out of distribution, and better on the capability suite, ship LoRA - and note that the third condition is where it usually wins outright. If it trails materially in distribution, the diagnostic question is which REGIME I am in: an adaptation task where I should check target modules and learning rate before blaming rank, or a knowledge-acquisition task where the constraint is genuinely binding and no LoRA configuration will fix it. THE COST OF SKIPPING THIS. Without the full-fine-tuning arm, 'LoRA was fine' is not a measurement, it is a transfer of a conclusion from a paper about a different task - and this module exists because that transfer fails often enough to be worth one extra training run."
        },
        {
          "q": "How do LoRA, bottleneck adapters, and prompt tuning compare?",
          "a": "They differ in WHERE the update lives, and every practical consequence follows from that one fact rather than from accuracy. WHERE THE UPDATE LIVES. LoRA: an additive low-rank term on existing weight matrices, h = W0 x + (alpha/r)BA x. Bottleneck adapters: new small down-project-nonlinearity-up-project modules inserted INSIDE each block, in the residual stream. Prompt and prefix tuning: learned continuous vectors prepended to the input or to the keys and values at every layer - the weights are untouched entirely. MERGE-ABILITY. LoRA merges into W0 and adds exactly zero inference latency. Adapters cannot - they are extra sequential operations in the forward path, and Houlsby-style adapters cost real latency, which matters most at small batch sizes where you are latency-bound rather than throughput-bound. Prompt tuning adds no parameters to the network but consumes CONTEXT LENGTH, which is its own cost and grows with sequence handling. BATCHING ACROSS TASKS. LoRA is an additive side path, so the expensive shared W0 x term is task-independent and requests using different adapters batch together in one pass - this is what S-LoRA exploits and it is LoRA's decisive practical advantage. Adapters modify the main path sequentially and are much harder to batch heterogeneously. Prompt tuning is trivially batchable, since different prefixes are just different tokens, which makes it the best of the three on this axis. PARAMETER COUNT. All three are small; prompt tuning is by far the smallest (thousands of parameters), adapters and LoRA are comparable at typical settings. SCALE DEPENDENCE, which is the one people miss. Prompt tuning is strongly scale-dependent - it is weak below roughly 1B parameters and reaches full-fine-tuning parity only around 10B and above - so a small-model experiment will tell you it does not work. LoRA and adapters work across scales. Prompt tuning is also the most optimization-unstable of the three. WHY LORA WON. Not accuracy. Unified benchmark comparisons find these methods broadly comparable on adaptation tasks once each is tuned, which is itself informative - the accuracy axis is saturated and therefore not the deciding one. LoRA won because it merges to zero latency, batches heterogeneously, has two comprehensible hyperparameters, and requires no architectural surgery. That is a systems argument, and recognizing that the deciding argument was a systems argument is the answer I would want to give."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The LoRA forward pass and merge",
        "back": "h = W0 x + (alpha/r) B A x, with B in R^(d x r), A in R^(r x k), r << min(d,k). Merge: W' = W0 + (alpha/r)BA - which is why LoRA adds zero inference latency."
      },
      {
        "type": "pitfall",
        "front": "A rank sweep at fixed alpha is a learning-rate sweep",
        "back": "The scale is alpha/r, so r: 8 -> 64 at constant alpha divides the update by 8. Hold alpha/r constant (alpha = 2r) or use rsLoRA's alpha/sqrt(r). Much of 'rank does not matter' folklore comes from this confound."
      },
      {
        "type": "intuition",
        "front": "Why B = 0 and A random",
        "back": "BA = 0 at init, so the step-0 model is bit-for-bit the base - the feature-distortion problem solved by construction. Both zero would be dead: dL/dA ~ B and dL/dB ~ A, so nothing moves. Exactly one must break the symmetry."
      },
      {
        "type": "definition",
        "front": "Intrinsic dimension of fine-tuning",
        "back": "Aghajanyan et al.: restricting the update to a random subspace of a few HUNDRED dimensions reaches ~90% of full fine-tuning on RoBERTa - and larger pretrained models have SMALLER intrinsic dimension. LoRA learns the subspace instead of sampling it."
      },
      {
        "type": "formula",
        "front": "LoRA parameter ratio",
        "back": "r(d+k)/dk, which for d=k is 2r/d. At d=4096, r=8: ~0.4%. The saving is a sum over a product, so it grows with model size - LoRA gets better at scale, not worse."
      },
      {
        "type": "pitfall",
        "front": "LoRA on attention only leaves most of the model unreachable",
        "back": "A transformer block's MLP is ~8d^2 parameters against attention's ~4d^2 - two thirds of the block. The original paper's q,v-only choice was a 2021 budget decision; target all linear layers."
      },
      {
        "type": "intuition",
        "front": "LoRA learns less and forgets less",
        "back": "Biderman et al. 2024: substantially behind full FT on continued pretraining in code/maths (gap does NOT close at high rank), closer on instruction tuning, and it preserves base capabilities better. One property, seen twice - a constrained update changes less in every direction."
      },
      {
        "type": "definition",
        "front": "Why LoRA enables multi-tenant serving",
        "back": "Serve UNMERGED: W0 x is shared across the whole batch and only the small BA detour is per-request, so requests for DIFFERENT adapters batch into one forward pass. Impossible for any method that modifies the main path. This is what S-LoRA/Punica exploit."
      },
      {
        "type": "pitfall",
        "front": "PEFT saves memory, not compute",
        "back": "The full forward pass still runs and gradients still flow back THROUGH every frozen layer to reach the adapters. Only the 14-of-16 bytes that are grads + optimizer state disappear. LoRA's headline is GPU memory, never training speed."
      },
      {
        "type": "formula",
        "front": "rsLoRA",
        "back": "Scale by alpha/sqrt(r), not alpha/r. Under 1/r the effective gradient scale collapses as rank grows, so high-rank adapters silently under-train - making 'higher rank does not help' partly an artefact of the scaling rule."
      },
      {
        "type": "pitfall",
        "front": "Merging into a quantized base is not lossless",
        "back": "You must dequantize, add, requantize - and the requantization error is not the error you measured in training. Serve QLoRA adapters unmerged, or merge into the fp16 base and requantize deliberately."
      },
      {
        "type": "intuition",
        "front": "Why LoRA beat adapters - it was a systems argument",
        "back": "Accuracy is comparable once each is tuned. LoRA won on structure: it merges to zero latency, it is an ADDITIVE SIDE PATH so heterogeneous requests batch, and it needs no architectural surgery. Adapters insert sequential layers and can do none of that."
      }
    ],
    "refs": [
      {
        "title": "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models",
        "url": "https://arxiv.org/abs/2106.09685"
      },
      {
        "title": "Aghajanyan et al. (2020), Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning",
        "url": "https://arxiv.org/abs/2012.13255"
      },
      {
        "title": "Biderman et al. (2024), LoRA Learns Less and Forgets Less",
        "url": "https://arxiv.org/abs/2405.09673"
      },
      {
        "title": "Kalajdzievski (2023), A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA (rsLoRA)",
        "url": "https://arxiv.org/abs/2312.03732"
      },
      {
        "title": "Sheng et al. (2023), S-LoRA: Serving Thousands of Concurrent LoRA Adapters",
        "url": "https://arxiv.org/abs/2311.03285"
      }
    ],
    "demos": [
      "lora",
      "pca",
      "quantization",
      "pruning"
    ]
  },
  "qlora": {
    "level": "advanced",
    "body": {
      "intuition": [
        "LoRA removed fourteen of the sixteen bytes per parameter. The two that remain are the frozen weights themselves, and at 65B parameters in fp16 that is still 130 GB - more than any single accelerator holds. QLoRA's observation is that a FROZEN weight has weaker precision requirements than a trainable one. It is never a gradient target and never accumulates small updates; it only has to be accurate enough to compute a forward pass and to pass gradients through to the adapter. So store it in 4 bits, dequantize on the fly for each matmul, and keep the LoRA adapters in bf16 where the actual learning happens. That took 65B fine-tuning from a multi-node job to a single 48 GB GPU.",
        "Three pieces make it work rather than merely compress. NF4, a 4-bit data type whose sixteen levels are the QUANTILES of a normal distribution rather than evenly spaced - which is the right choice because pretrained weights really are approximately zero-centred and normal, so equal-width bins waste most of their resolution on tails that are nearly empty. BLOCK-WISE quantization with a separate scale every 64 weights, so a single outlier corrupts 64 values instead of an entire tensor. And DOUBLE QUANTIZATION, which notices that those per-block scales are themselves stored in 32 bits - half a bit per parameter, which at 65B is real memory - and quantizes them too, bringing the total to about 4.13 bits per parameter.",
        "Now name the proxy, because QLoRA's headline claim is stronger than the usual one: that 4-bit fine-tuning MATCHES 16-bit full fine-tuning performance. The evidence was benchmark parity on MMLU plus automated and human preference judgments on a small chat benchmark - and the paper is unusually candid that these disagree, that its MMLU rankings and its chat-benchmark rankings do not correlate, and that GPT-4 as a judge shows order and self-preference biases. So the honest statement is: on those measurements, at that scale, on those tasks, no degradation was detectable. That is genuinely a strong result and it is not the same as lossless. The measurable cost is elsewhere and is not disputed - every forward pass now dequantizes, so QLoRA trades TIME for memory, typically running noticeably slower per step than plain LoRA in bf16."
      ],
      "math": [
        {
          "h": "Block-wise absmax quantization, and why the block size matters",
          "paras": [
            "Quantization needs a scale to map weights into the integer range. Using one scale for a whole tensor means a single large outlier stretches the range and crushes everything else into a handful of levels. QLoRA uses a scale per block of 64.",
            "The trade is explicit: smaller blocks are more robust to outliers but store more scale constants. 64 is the empirical settling point, and it is what makes double quantization worth doing."
          ],
          "tex": "c_b = \\frac{1}{\\max_{i \\in b} |w_i|}, \\qquad q_i = \\operatorname{round}\\!\\big(Q(c_b \\, w_i)\\big), \\qquad \\hat{w}_i = \\frac{Q^{-1}(q_i)}{c_b}",
          "texNote": "Each block b of 64 weights gets its own constant c_b. The quantization error is bounded relative to the block's own maximum, so an outlier damages only its own 64 neighbours. Note the storage consequence that motivates the next piece: one fp32 constant per 64 weights is 32/64 = 0.5 bits per parameter, which is 12.5% overhead on a 4-bit format."
        },
        {
          "h": "NF4: sixteen levels placed where the weights actually are",
          "paras": [
            "The insight is that pretrained weights are approximately zero-centred normal, so the optimal fixed codebook is not uniform - it is the one that gives each level equal PROBABILITY MASS. That is quantile quantization, and for a known distribution the quantiles can be computed once and hard-coded.",
            "One detail is load-bearing: the levels are arranged asymmetrically so that ZERO is exactly representable, which matters because exact zeros are common and a format that cannot represent zero adds bias to every padded or masked weight."
          ],
          "tex": "q_j = \\tfrac{1}{2}\\left[\\Phi^{-1}\\!\\left(\\tfrac{j + \\delta}{2^{k}+1}\\right) + \\Phi^{-1}\\!\\left(\\tfrac{j+1+\\delta}{2^{k}+1}\\right)\\right] \\Big/ \\max_j |q_j|, \\qquad k=4",
          "texNote": "Read it as: cut the standard normal into equal-probability intervals, take the midpoint of each, and normalize into [-1, 1]. Because the block scale already normalizes each block by its absmax, the incoming values are approximately standard normal and the fixed codebook fits them. This is why NF4 beats plain FP4 on real weights and would NOT beat it on uniformly distributed data - the gain comes entirely from the distribution being known."
        },
        {
          "h": "The full bits-per-parameter accounting",
          "paras": [
            "Double quantization applies the same trick one level up: quantize the block constants themselves to 8 bits, in blocks of 256, keeping one fp32 constant per 256 constants."
          ],
          "tex": "b_{\\text{eff}} = 4 + \\underbrace{\\frac{8}{64}}_{\\text{8-bit block consts}} + \\underbrace{\\frac{32}{64 \\cdot 256}}_{\\text{consts of consts}} \\approx 4.127 \\;\\text{bits/param}",
          "texNote": "Against the naive 4 + 32/64 = 4.5 bits without double quantization, the saving is about 0.37 bits per parameter - roughly 3 GB on a 65B model, which is the difference between fitting on a 48 GB card and not. Compare 16 bits for fp16: a 65B model goes from 130 GB to about 33 GB of weights, before adapters and activations."
        }
      ],
      "code": [
        {
          "h": "NF4 block-wise quantization from scratch",
          "paras": [
            "The whole storage format in about twenty lines. Writing it makes clear that quantization is a lookup table plus a per-block scale, and that dequantization is a gather - which is why it costs time on every forward pass."
          ],
          "code": "# The 16 NF4 levels: quantiles of a standard normal, normalized to [-1, 1],\n# arranged so that 0.0 is EXACTLY representable (8 negative, zero, 7 positive).\nNF4 = torch.tensor([-1.0, -0.6962, -0.5251, -0.3949, -0.2844, -0.1848, -0.0911,\n                     0.0, 0.0796, 0.1609, 0.2461, 0.3379, 0.4407, 0.5626,\n                     0.7230, 1.0])\n\ndef quantize_nf4(w: torch.Tensor, block: int = 64):\n    wb = w.reshape(-1, block)\n    absmax = wb.abs().amax(dim=1, keepdim=True)          # one scale per block\n    normed = wb / absmax                                  # -> approx N(0,1)-ish in [-1,1]\n    idx = (normed.unsqueeze(-1) - NF4).abs().argmin(-1)   # nearest codebook level\n    return idx.to(torch.uint8), absmax                     # 4 bits (packed) + fp32 scale\n\ndef dequantize_nf4(idx, absmax, shape):\n    return (NF4[idx.long()] * absmax).reshape(shape)\n\n# WHY NF4 BEATS UNIFORM FP4 HERE: pretrained weights are ~zero-centred normal,\n# so equal-WIDTH bins spend most of their resolution on nearly-empty tails.\n# Equal-PROBABILITY bins put resolution where the mass is. The gain is entirely\n# a property of the data distribution - on uniform data NF4 would lose.\n#\n# THE COST YOU CANNOT AVOID: every forward pass runs dequantize_nf4 before the\n# matmul. It is a gather plus a multiply, it is memory-bound, and it is why\n# QLoRA is slower per step than bf16 LoRA. You bought memory with time.",
          "caption": "Quantization is a codebook lookup plus a per-block scale. NF4's advantage comes entirely from pretrained weights being approximately normal - and the dequantize call on every forward pass is the time you paid for the memory."
        },
        {
          "h": "Putting it together, and the memory arithmetic that justifies it",
          "paras": [
            "In practice you configure it rather than implement it. The two settings people get wrong are the compute dtype - which is NOT the storage dtype - and which modules the adapters target."
          ],
          "code": "bnb = BitsAndBytesConfig(\n    load_in_4bit=True,\n    bnb_4bit_quant_type=\"nf4\",          # not \"fp4\"; NF4 fits normal weights\n    bnb_4bit_use_double_quant=True,     # quantize the block constants too\n    bnb_4bit_compute_dtype=torch.bfloat16,   # <-- STORAGE is 4-bit, COMPUTE is bf16\n)\nmodel = AutoModelForCausalLM.from_pretrained(name, quantization_config=bnb)\nmodel = prepare_model_for_kbit_training(model)   # casts norms/head to fp32, enables ckpt\nmodel = get_peft_model(model, LoraConfig(\n    r=16, lora_alpha=32, lora_dropout=0.05,\n    target_modules=[\"q_proj\",\"k_proj\",\"v_proj\",\"o_proj\",\n                    \"gate_proj\",\"up_proj\",\"down_proj\"],   # ALL linear layers\n))\n\n# MEMORY, 65B parameters:\n#   fp16 weights ......................... 130 GB   (no single GPU)\n#   + full-FT grads & optimizer state .... ~1040 GB\n#   NF4 weights, double-quantized ........ ~33 GB   (4.127 bits/param)\n#   + LoRA adapter state ................. <1 GB\n#   + activations w/ checkpointing ....... a few GB\n#   ----------------------------------------------\n#   fits one 48 GB card. That is the entire result.\n#\n# WHAT YOU PAY: dequantization on every forward pass makes each step slower\n# than bf16 LoRA - a real cost, routinely underestimated when people plan\n# a training budget from a memory figure alone.",
          "caption": "compute_dtype is the setting most often wrong: weights are STORED in 4 bits and every matmul happens in bf16 after dequantization. The memory column is the result; the slower step time is the price, and it is easy to forget when budgeting from memory alone."
        }
      ],
      "useCases": [
        "Fine-tuning a model far larger than your hardware nominally supports - the original demonstration was 65B on one 48 GB GPU, and the everyday version is 7B-to-13B on a 24 GB consumer card, which is what put open-model fine-tuning within reach of individuals.",
        "Instruction tuning and preference tuning of large open-weight models, where the fine-tune is teaching behaviour rather than knowledge, so the low-rank constraint costs little and the memory saving is decisive.",
        "Running many experiments in parallel on one machine, since each 4-bit base plus adapter occupies a fraction of a bf16 job - the practical effect is more hypotheses tested per week, which usually matters more than a few points of per-run quality.",
        "Serving the same 4-bit base with many adapters, combining QLoRA's memory saving with LoRA's multi-tenant batching - though note the adapters must stay unmerged, which is the natural configuration here anyway since merging into a 4-bit base is lossy."
      ],
      "pitfalls": [
        "Merging a QLoRA adapter into the 4-bit base and expecting the model you evaluated. The merge requires dequantize, add, requantize - and the requantization error is not the error present during training, because during training the base was quantized and the adapter was not. Serve unmerged, or merge into the fp16 base and requantize deliberately, then re-evaluate.",
        "Expecting QLoRA to be faster. It is strictly slower per step than bf16 LoRA, because every forward pass dequantizes before every matmul. It trades time for memory; if memory is not your binding constraint, it is a pure loss.",
        "Confusing storage dtype with compute dtype. bnb_4bit_compute_dtype is what the matmuls run in and should be bf16 or fp16; leaving it at the default fp32 silently costs speed, and thinking the arithmetic happens in 4 bits is a misunderstanding of what the format is.",
        "Choosing fp4 over nf4 without knowing why. NF4's advantage comes entirely from pretrained weights being approximately zero-centred normal - it is a fitted codebook. On data that is not normal it has no advantage, so the choice is a claim about the distribution.",
        "Reading 'matches 16-bit performance' as lossless. The evidence was MMLU parity plus preference judgments on a small chat benchmark, and the paper itself reports that those two evaluations do not agree with each other and that the automated judge shows order and self-preference bias. It means no degradation was DETECTED by those instruments at that scale.",
        "Quantizing everything. prepare_model_for_kbit_training exists because layer norms, the embedding layer and the output head are sensitive and are kept in higher precision. Blanket-quantizing them is a reliable way to get a model that trains but generates badly.",
        "Assuming a benchmark that survives quantization means generation does. Classification-style metrics are remarkably robust to 4-bit weights because they only need the argmax to survive; open-ended generation compounds small logit shifts over hundreds of tokens. Evaluate the thing you will actually do."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "QLoRA is LoRA with the frozen base compressed. It works only because that base is frozen - a quantized weight that had to accumulate small gradient updates would round them away entirely, which is exactly the problem the fp32 master copy solves in mixed-precision training."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The general treatment of post-training quantization, GPTQ and AWQ. Those target INFERENCE on a shipped model; QLoRA targets the frozen base during TRAINING, which is why it can accept a slower dequantize-per-matmul path that an inference method could not."
        },
        {
          "ref": "training-systems/mixed-precision",
          "text": "The same precision reasoning in the other direction: there, an fp32 master copy exists because small updates vanish in fp16. Here the base needs no master copy at all because it receives no updates - and that asymmetry is the whole idea."
        },
        {
          "ref": "fine-tuning/unsloth",
          "text": "The step-time cost introduced here is exactly what fused-kernel implementations attack, and it is why their speedup claims must be read against a stated baseline."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "QLoRA's parity claim rests on an LLM judge and a small preference benchmark, and the paper's own caveats about judge bias and benchmark disagreement are a good worked example of why that evaluation stack needs its own scrutiny."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is QLoRA?",
          "a": "Quantize the frozen base model to 4-bit NF4, keep LoRA adapters in bf16, and dequantize on the fly for each matmul. It fine-tunes models far larger than the GPU would otherwise hold."
        },
        {
          "q": "Why can the base be 4-bit when trainable weights cannot?",
          "a": "A frozen weight is never a gradient target and never accumulates small updates. It only has to be accurate enough for a forward pass and to pass gradients through to the adapter."
        },
        {
          "q": "What is NF4?",
          "a": "A 4-bit data type whose sixteen levels are the quantiles of a standard normal rather than evenly spaced, with zero exactly representable. It fits pretrained weights because they are approximately zero-centred normal."
        },
        {
          "q": "Why does NF4 beat FP4 on model weights?",
          "a": "Equal-width bins waste resolution on nearly-empty tails. Equal-probability bins put levels where the mass is. The gain is a property of the weight distribution - on uniform data NF4 would lose."
        },
        {
          "q": "What is block-wise quantization and why 64?",
          "a": "One scale constant per block of 64 weights, so an outlier damages only its own block instead of crushing a whole tensor. 64 balances outlier robustness against the cost of storing the constants."
        },
        {
          "q": "What is double quantization?",
          "a": "Quantizing the per-block scale constants themselves to 8 bits in blocks of 256. It cuts overhead from 0.5 to about 0.127 bits per parameter - roughly 3 GB on a 65B model."
        },
        {
          "q": "What is the effective bits per parameter?",
          "a": "About 4.127: 4 for the weight, 8/64 for the 8-bit block constants, and 32/(64*256) for the constants of the constants."
        },
        {
          "q": "What are paged optimizers?",
          "a": "Optimizer state placed in unified memory so it pages to CPU under pressure. It absorbs the memory SPIKES from gradient checkpointing rather than reducing steady-state usage."
        },
        {
          "q": "Is QLoRA faster than LoRA?",
          "a": "No - slower per step, because every forward pass dequantizes before every matmul. It trades time for memory, so if memory is not binding it is a pure loss."
        },
        {
          "q": "What does bnb_4bit_compute_dtype control?",
          "a": "The precision the matmuls run in after dequantization, typically bf16. Storage is 4-bit; the arithmetic is not."
        },
        {
          "q": "Why not quantize the layer norms and embeddings?",
          "a": "They are precision-sensitive and cheap in parameter count. prepare_model_for_kbit_training keeps them in higher precision; blanket quantization gives a model that trains but generates poorly."
        },
        {
          "q": "Can you merge a QLoRA adapter into the base?",
          "a": "Not losslessly. Merging requires dequantize, add, requantize, and that requantization error was not present in training. Serve unmerged or merge into the fp16 base and re-evaluate."
        }
      ],
      "standard": [
        {
          "q": "Explain QLoRA's three technical contributions and why each was necessary.",
          "a": "THE PROBLEM. LoRA removed fourteen of the sixteen bytes per parameter, leaving the frozen fp16 weights. At 65B that is still 130 GB, so the memory saving had gone as far as the adapter idea could take it. The remaining question was whether the FROZEN base needs 16 bits, and the answer is no - a frozen weight is never a gradient target and never has to accumulate an update small enough to round away, which is precisely the failure mode that forces mixed-precision training to keep an fp32 master copy. Frozen weights have no such requirement; they only feed a forward pass and pass gradients through. CONTRIBUTION 1: NF4. Quantizing to 4 bits with uniform levels wastes most of your sixteen levels, because pretrained weights are approximately zero-centred normal and equal-width bins put resolution in nearly-empty tails. NF4 uses the QUANTILES of a standard normal instead, so each level carries equal probability mass, and it arranges them asymmetrically so exact zero is representable - which matters because exact zeros are common. This is a fitted codebook: its advantage is entirely a claim about the weight distribution, and on non-normal data it would have none. CONTRIBUTION 2: BLOCK-WISE QUANTIZATION with block size 64. One scale for a whole tensor means a single outlier stretches the range and crushes everything else - and transformer weights do have outlier structure, which is the same phenomenon LLM.int8 had to handle. A scale per 64 weights confines the damage. CONTRIBUTION 3: DOUBLE QUANTIZATION. Those constants are not free - one fp32 per 64 weights is 0.5 bits per parameter, a 12.5% overhead on a 4-bit format. So quantize them too: 8 bits, in blocks of 256, with one fp32 per 256 constants. Total about 4.127 bits per parameter against 4.5 naive. That 0.37-bit saving is roughly 3 GB at 65B, which is exactly the margin between fitting on a 48 GB card and not - so it is not a rounding-off detail, it is what made the headline claim true. PLUS PAGED OPTIMIZERS, which I would mention as engineering rather than method: optimizer state in unified memory so it pages under pressure, absorbing the memory SPIKES that gradient checkpointing produces rather than lowering the average. THE RESULT AND ITS PRICE. 65B fine-tuning on one 48 GB GPU. The price is time: every matmul dequantizes first, so steps are meaningfully slower than bf16 LoRA. That trade is the honest summary - QLoRA buys memory with compute, and if memory is not your binding constraint you should not use it.",
          "deepDive": {
            "q": "QLoRA claims to match 16-bit fine-tuning. How much should you believe that, and what would you measure before relying on it?",
            "a": "I would believe it as a claim about specific instruments and be careful not to promote it to 'lossless'. WHAT THE EVIDENCE ACTUALLY WAS. Parity on MMLU across model scales, and preference judgments - both automated and human - on a small chat benchmark. That is a real result and it was replicated widely enough in practice that 4-bit fine-tuning became the default. WHAT THE PAPER ITSELF SAYS ABOUT IT, which is the part worth quoting because it is unusually honest: the MMLU rankings and the chat-benchmark rankings DO NOT CORRELATE, so the two evaluations disagree about which models are better; and the automated judge shows order effects and self-preference. A paper reporting that its two evaluations disagree is telling you the instruments are noisy, and the correct reading of 'matches' is 'no degradation was detectable by these instruments at these scales on these tasks'. WHERE I WOULD EXPECT IT TO BE WEAKEST. Multiple-choice benchmarks are remarkably robust to weight quantization, because they only require the ARGMAX to survive, and small logit perturbations rarely flip a confident argmax. Open-ended generation is different: errors compound over hundreds of autoregressive steps, and a small shift in the tail of the distribution changes sampling behaviour in ways no accuracy metric registers. So an evaluation stack made of multiple-choice benchmarks is systematically biased toward finding quantization harmless. I would also expect the gap to be larger for small models, where each weight carries more of the function - the k-bit scaling-law work found 4-bit to be near the accuracy-per-bit optimum at scale, but that framing is explicitly about the large-model regime. WHAT I WOULD MEASURE. (1) PERPLEXITY on held-out text from the target domain, in fp16 and 4-bit, with the same adapter - it is cheap, continuous, and sensitive to exactly the distribution shifts that accuracy hides. (2) A GENERATION-BASED task from my actual application, scored the way production scores it, not a multiple-choice proxy. (3) LONG-OUTPUT behaviour specifically - repetition rate, format-violation rate, degeneration at length - because that is where compounding shows. (4) The comparison at MY scale, since almost all published quantization evidence is on 7B and above. HOW I WOULD FRAME THE DECISION. The question is never 'is 4-bit lossless' but 'is the loss smaller than what the memory saving buys me'. QLoRA usually lets me train a MUCH larger model, and a 4-bit 70B beats a bf16 13B on essentially everything - so the trade is normally overwhelmingly favourable and the precision question is the wrong one to agonize over. It becomes the right question only when the model size is fixed and I am quantizing to save cost rather than to fit."
          }
        },
        {
          "q": "Derive the memory budget for fine-tuning a 70B model and show which techniques you would apply in what order.",
          "a": "START FROM THE ACCOUNTING. Under mixed precision with Adam, per trainable parameter: 2 bytes fp16 weights, 2 bytes fp16 gradients, 4 bytes fp32 master copy, 8 bytes Adam moments - 16 total. Plus activations, which scale with batch x sequence rather than parameter count and must be budgeted separately. STEP 0, THE BASELINE. 70B full fine-tuning: 1.12 TB of weights, gradients and optimizer state. That is a multi-node sharded job before you have allocated a single activation. This is the number that makes everything else worth doing. STEP 1: FREEZE THE BASE, TRAIN LORA. Fourteen of sixteen bytes apply only to trainable parameters, and the adapter is well under 1% of them. You are left with 140 GB of fp16 frozen weights plus a negligible adapter state. Still two to four GPUs, but no longer a distributed-training project. Biggest single lever, and it costs the low-rank constraint. STEP 2: QUANTIZE THE FROZEN BASE TO NF4. 140 GB becomes about 36 GB at 4.127 bits per parameter with double quantization. This is the step that changes the hardware class - one 48 GB card, or two 24 GB cards. Cost: some quantization error, and a slower step because every matmul dequantizes first. STEP 3: GRADIENT CHECKPOINTING FOR ACTIVATIONS. Nothing above touched the activation term, and at long sequence lengths it dominates whatever is left. Store activations only at segment boundaries and recompute within segments during the backward pass. Cost: roughly one extra forward pass, so about 30 to 40% more compute. The detail that matters: it must be SEGMENTED - checkpointing every layer individually stores a boundary per layer and saves almost nothing. STEP 4: MICRO-BATCH WITH GRADIENT ACCUMULATION. Activations scale with batch size, so split the effective batch and accumulate. Same effective batch, a fraction of the peak, at the cost of more steps and slightly worse hardware utilization. STEP 5: PAGED OPTIMIZER STATES. Checkpointing produces memory SPIKES during recomputation; paged states absorb them by falling back to host memory rather than raising an out-of-memory error. This is a robustness measure, not a capacity plan - if you rely on it steadily, PCIe becomes your bottleneck. STEP 6: SHARD, if you still do not fit. FSDP or ZeRO-3 divides what remains across devices, at the cost of parameter all-gathers in forward and backward - roughly 1.5x DDP's communication. THE ORDERING PRINCIPLE. Attack the largest term first, and prefer levers whose cost you can MEASURE - quantization error, recompute time, communication volume - over levers whose cost is invisible. The low-rank constraint in step 1 is the one whose cost you cannot see from inside the training run, which is why it is the one worth validating against an unconstrained baseline at smaller scale."
        },
        {
          "q": "How does QLoRA relate to inference quantization methods like GPTQ and AWQ?",
          "a": "They solve different problems and the difference explains most of their design choices. WHAT QLORA'S QUANTIZATION IS FOR. Compressing a frozen base so a TRAINING run fits in memory. The quantized weights are read, dequantized, used in a matmul, and discarded; the learning happens in bf16 adapters alongside. Crucially, gradients flow THROUGH the dequantized weights to reach the adapters, so the quantization must be differentiable-through - a straight-through path - but the weights themselves are never updated. WHAT GPTQ AND AWQ ARE FOR. Compressing a finished model so INFERENCE is cheap and fast. There is no training afterwards, so they can afford an expensive one-time calibration pass and they care intensely about the runtime cost of dequantization, since it is on the serving critical path forever. THE DESIGN CONSEQUENCES. QLoRA's NF4 is a FIXED codebook chosen from a distributional assumption - no calibration data, no per-model optimization, quantize in seconds. That is right for its use case: you are about to spend hours training, you do not want a preprocessing stage, and you have an adapter that can compensate for residual error. GPTQ instead does layer-wise error minimization against calibration data, solving for the quantized weights that best preserve each layer's OUTPUT rather than its weights - a second-order procedure that takes real time and produces a better model. AWQ observes that a small fraction of weight channels are salient because of their ACTIVATION magnitudes, and scales those channels to protect them - an activation-aware criterion QLoRA has no reason to compute. THE SHARED ANCESTRY worth naming. All of this traces to the outlier discovery in LLM.int8: transformer activations develop a few extremely large feature dimensions at scale, and naive per-tensor quantization is destroyed by them. Block-wise scaling in QLoRA, per-channel scaling in AWQ, and mixed-precision decomposition in LLM.int8 are three answers to that same observation. HOW THEY COMBINE IN PRACTICE. The normal pipeline is: QLoRA-train on an NF4 base, then merge the adapter into the FP16 base, then re-quantize with GPTQ or AWQ for serving. You do not deploy the NF4 training base, because it was optimized for quantize-quickly rather than dequantize-fast. Getting that ordering right is the practical payoff of understanding the distinction - and it also explains why merging into the 4-bit training base is a mistake rather than a shortcut.",
          "deepDive": {
            "q": "Why do outliers matter so much in transformer quantization, and what does each method do about them?",
            "a": "THE PHENOMENON. Dettmers et al. observed that beyond roughly 6.7B parameters, transformers develop a small number of feature dimensions - often a handful out of thousands - whose activation magnitudes are one to two orders of magnitude larger than everything else. They appear in the same dimensions across layers and tokens, they emerge abruptly with scale, and they are FUNCTIONALLY IMPORTANT: zeroing them collapses the model. So they are not noise to be clipped. WHY THEY BREAK QUANTIZATION. Quantization maps a range onto a small number of levels using a scale set by the maximum. One value 50x larger than the rest means the other values occupy the bottom 2% of the range, so with 16 levels almost all of them land on the same one or two codes. The information in the ordinary weights is destroyed to make room for one outlier. This is why per-tensor quantization degrades sharply exactly at the scale where the outliers emerge - the failure is not gradual. THE FOUR RESPONSES. (1) LLM.int8 - MIXED PRECISION DECOMPOSITION. Identify outlier feature dimensions at runtime, compute those in fp16, everything else in int8, and sum. Exact for the outliers, cheap for the rest; the cost is a scattered, irregular matmul. (2) QLORA - BLOCK-WISE SCALING. Do not identify anything; just make the blocks small enough (64) that an outlier's damage is confined to its own neighbours. Cheap, general, requires no calibration, and it is the right choice when you are about to train and can tolerate residual error. (3) AWQ - ACTIVATION-AWARE CHANNEL SCALING. The salient weights are the ones multiplied by large activations, so identify those channels from calibration statistics and scale them up before quantizing and down after, giving them effectively more resolution. It targets the outliers' CAUSE rather than containing their effect. (4) SMOOTHQUANT - MIGRATION. Mathematically shift difficulty from activations to weights by a per-channel scaling that cancels between the two, since weights are much easier to quantize than activations. Same total function, redistributed. THE UNIFYING VIEW. Every method is answering 'what do I do about a heavy-tailed distribution I must represent with few levels' and the answers are: isolate them, contain them, give them more resolution, or move them somewhere better. THE POINT I WOULD MAKE LAST. Notice that this whole subfield exists because of an EMPIRICAL OBSERVATION about trained transformers that nobody predicted from the architecture. It emerged with scale, it was found by people looking at why quantization broke, and it now shapes the design of every quantization method. That is worth remembering as a general pattern: the constraints that matter most in systems work are often discovered rather than derived."
          }
        },
        {
          "q": "You quantize a model to 4-bit and your benchmark accuracy is unchanged, but users report worse output. Explain.",
          "a": "This is the predictable result of evaluating a generative model with a discriminative instrument, and the mechanism is worth stating precisely. WHY THE BENCHMARK DID NOT MOVE. Most standard benchmarks are multiple-choice or classification: the model scores a small set of options and you take the argmax. Quantization perturbs logits by a small amount. If the correct option was ahead by a comfortable margin, a small perturbation does not change the argmax, so the accuracy is IDENTICAL even though the underlying distribution changed measurably. Accuracy is a step function of the logits; it is designed not to notice small changes. WHY GENERATION DEGRADED. Three compounding effects. (1) AUTOREGRESSIVE COMPOUNDING. Each token is conditioned on all previous ones. A small perturbation that changes one token in fifty changes the context for everything after it, and the trajectories diverge. Over a 500-token response, many small independent perturbations become one large difference. (2) THE TAIL MATTERS UNDER SAMPLING. With temperature sampling or nucleus sampling you are not taking the argmax - you are sampling from the distribution, so changes in the LOW-PROBABILITY tail directly change which tokens can be selected. Quantization error is proportionally largest exactly there. A token that had probability 0.001 and now has 0.004 will now appear. (3) CALIBRATION AND ENTROPY SHIFT. Quantization tends to flatten or sharpen the distribution slightly, and small entropy shifts change generation character - more repetition if sharpened, more drift if flattened. Neither shows up in argmax accuracy at all. WHAT USERS ARE ACTUALLY NOTICING. Usually not factual errors. It is repetition, degenerate loops in long outputs, format violations - a JSON response that stops being valid JSON - subtle register changes, and worse instruction adherence at the end of long generations. All of these are distributional properties. HOW I WOULD DIAGNOSE AND FIX. Measure PERPLEXITY on held-out domain text: continuous, sensitive, and it would have caught this before shipping. Then evaluate generation the way production uses it - long outputs, real prompts, scored on the actual criteria, including format-violation and repetition rates. If the degradation is confirmed, the options are a better quantization method (GPTQ or AWQ calibrated on domain data rather than a generic fixed codebook), keeping sensitive layers - embeddings, head, norms - in higher precision, or moving to 8-bit for the layers that turn out to matter. THE GENERALIZABLE LESSON, which is this module's spine: the metric did not lie, it answered the question it was asked. It was asked whether the argmax survived. Nobody asked whether the distribution did."
        },
        {
          "q": "Walk through what happens in a single QLoRA forward and backward pass.",
          "a": "FORWARD, for one quantized linear layer. (1) Read the 4-bit packed weight indices and the quantized block constants from memory. (2) Dequantize the constants - these were themselves quantized to 8 bits with their own fp32 scale per 256 - to recover the per-block absmax values. (3) Look up each 4-bit index in the NF4 codebook and multiply by its block's constant, producing a bf16 weight tile. (4) Matmul that tile against the activations in bf16. (5) Add the LoRA path: (alpha/r) * B(A x), computed entirely in bf16 from parameters that were never quantized. (6) Discard the dequantized weights - they are not cached, which is the point, since caching them would defeat the memory saving. WHAT THAT COSTS. Step 3 is a gather, which is memory-bound and does almost no arithmetic per byte moved. It happens on EVERY forward pass of every layer, and with gradient checkpointing enabled it happens again during recomputation in the backward pass. This is the entire source of QLoRA's step-time penalty, and it is why fused-kernel implementations target exactly this path. BACKWARD. The gradient with respect to the layer's input requires the weight matrix, so the same dequantization happens again - or is recomputed - and the gradient flows through. Critically, NO gradient is stored for the base weights: they have requires_grad False, so the backward pass computes dL/dx to keep propagating but never materializes dL/dW. That is the memory saving. The only gradients materialized are for A and B, which are tiny. THE SUBTLETY WORTH NAMING. Gradients flow THROUGH quantized weights but never TO them. The quantization sits inside the computation graph as a constant transformation, so there is no straight-through estimator needed and no quantization-aware training happening - this is fundamentally different from QAT, where the quantization is differentiated through because the weights being quantized are the ones being learned. QLoRA is not QAT; it is training in a lower-precision environment. THE CONSEQUENCE PEOPLE MISS. Because the adapter trains in the presence of the quantization error, it partly LEARNS TO COMPENSATE for it - the adapter's optimum is defined relative to the quantized base, not the fp16 one. That is a real benefit during training and it is exactly why merging the adapter into a differently-quantized or dequantized base is not a neutral operation: you would be pairing an adapter with a base it was not fitted to."
        },
        {
          "q": "Would you use QLoRA for a 1B model? Argue it through.",
          "a": "Almost certainly not, and the reasoning is the same shape as asking whether to use PEFT on a small model at all. THE MEMORY CASE EVAPORATES. 1B parameters full fine-tuned is 16 GB of weights, gradients and optimizer state - it fits on a single 24 GB consumer card with room for activations, and comfortably on anything datacentre-grade. Plain LoRA in bf16 brings it to about 2 GB. The problem QLoRA exists to solve does not exist here. WHAT YOU WOULD PAY. A slower step, because every matmul still dequantizes and that cost is proportional to the work, not to whether you needed the saving. A quantization error that, at this scale, is proportionally LARGER than at 70B - each weight carries more of the function in a small model, and the k-bit scaling-law work situates 4-bit near the optimum specifically in the large-model regime, not universally. And a more complex stack: bitsandbytes, kbit preparation, restrictions on merging, and a serving path that is not the obvious one. WHAT I WOULD DO INSTEAD. Full fine-tuning, honestly. At 1B, the low-rank constraint is also buying you less than it costs - the memory it saves you did not need saving, and the capability it constrains is proportionally more of the model. If I still wanted PEFT it would be for the SERVING reason (many tenants, one base) rather than the training one, and then bf16 LoRA gives me that with none of the quantization complications. THE PLACE I WOULD RECONSIDER. If I need to train many 1B models simultaneously on one GPU, or if the 1B model is one component of a pipeline that already occupies most of the memory, then the saving is real again - the criterion is always whether memory is the BINDING constraint, not whether the model is large. And if I am serving at extreme scale, quantization is worth doing for inference cost, but that is GPTQ or AWQ after training rather than QLoRA during it. THE GENERAL POINT I WOULD MAKE. Most of the techniques in this module were developed under a specific constraint - 16 bytes per parameter is fatal at 7B and above - and they propagate as best practice into settings where the constraint does not apply. Being able to state the premise of a technique, and check whether it holds for you, is more useful than knowing the technique. QLoRA on a 1B model is a technique applied without its premise."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "QLoRA in one line",
        "back": "4-bit NF4 frozen base + bf16 LoRA adapters, dequantizing on the fly per matmul. 65B fine-tuning on one 48 GB GPU. Works because a FROZEN weight is never a gradient target and never accumulates small updates."
      },
      {
        "type": "intuition",
        "front": "Why NF4 rather than FP4",
        "back": "Pretrained weights are ~zero-centred normal, so equal-WIDTH bins waste resolution on empty tails. NF4's 16 levels are the QUANTILES of N(0,1) - equal probability mass per level - with zero exactly representable. On uniform data NF4 would lose."
      },
      {
        "type": "formula",
        "front": "QLoRA effective bits per parameter",
        "back": "4 + 8/64 + 32/(64*256) ~= 4.127 bits. Without double quantization it is 4 + 32/64 = 4.5. That 0.37-bit saving is ~3 GB at 65B - the margin between fitting a 48 GB card and not."
      },
      {
        "type": "definition",
        "front": "Block-wise quantization",
        "back": "One absmax scale per block of 64 weights, so a single outlier corrupts 64 values rather than a whole tensor. Smaller blocks = more outlier-robust but more constants to store, which is what makes double quantization worth doing."
      },
      {
        "type": "pitfall",
        "front": "QLoRA is SLOWER than LoRA",
        "back": "Every forward pass dequantizes before every matmul - a memory-bound gather, repeated again during checkpointed recomputation. It trades TIME for MEMORY. If memory is not the binding constraint, it is a pure loss."
      },
      {
        "type": "pitfall",
        "front": "'Matches 16-bit' is a claim about instruments",
        "back": "Evidence was MMLU parity + preference judgments on a small chat benchmark - and the paper reports those two evaluations DO NOT correlate, and that the LLM judge shows order and self-preference bias. It means no degradation was DETECTED, not lossless."
      },
      {
        "type": "intuition",
        "front": "Why benchmarks survive quantization but generation does not",
        "back": "Accuracy is a step function of logits - small perturbations rarely flip a confident argmax. Generation compounds perturbations over hundreds of autoregressive steps, and sampling reads the LOW-PROBABILITY TAIL where quantization error is proportionally largest."
      },
      {
        "type": "pitfall",
        "front": "Merging a QLoRA adapter into the 4-bit base",
        "back": "Requires dequantize -> add -> requantize, and that requantization error was NOT present during training. Worse: the adapter's optimum was fitted relative to the quantized base. Serve unmerged, or merge into fp16 and re-evaluate."
      },
      {
        "type": "definition",
        "front": "Paged optimizers",
        "back": "Optimizer state in NVIDIA unified memory, paged to host under pressure. It absorbs the memory SPIKES that gradient checkpointing produces - a robustness measure against OOM, not a steady-state capacity plan (PCIe becomes the bottleneck if relied on)."
      },
      {
        "type": "intuition",
        "front": "Gradients flow THROUGH quantized weights, never TO them",
        "back": "The base has requires_grad=False, so dL/dx is computed to keep propagating but dL/dW is never materialized. Quantization is a constant in the graph - this is NOT quantization-aware training, it is training in a low-precision environment."
      },
      {
        "type": "definition",
        "front": "QLoRA vs GPTQ/AWQ",
        "back": "QLoRA compresses a frozen base for TRAINING - fixed codebook, no calibration, quantize in seconds. GPTQ/AWQ compress a finished model for INFERENCE - expensive one-time calibration, fast dequant forever. Normal pipeline: QLoRA-train -> merge into fp16 -> GPTQ/AWQ for serving."
      },
      {
        "type": "intuition",
        "front": "The transformer outlier phenomenon",
        "back": "Beyond ~6.7B, a handful of feature dimensions carry activations 10-100x larger than the rest - consistent across layers, functionally essential. They set the quantization scale and crush everything else. Every method is an answer: isolate (LLM.int8), contain (QLoRA blocks), rescale (AWQ), or migrate (SmoothQuant)."
      }
    ],
    "refs": [
      {
        "title": "Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs",
        "url": "https://arxiv.org/abs/2305.14314"
      },
      {
        "title": "Dettmers et al. (2022), LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
        "url": "https://arxiv.org/abs/2208.07339"
      },
      {
        "title": "Dettmers & Zettlemoyer (2023), The Case for 4-bit Precision: k-bit Inference Scaling Laws",
        "url": "https://arxiv.org/abs/2212.09720"
      },
      {
        "title": "Frantar et al. (2022), GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers",
        "url": "https://arxiv.org/abs/2210.17323"
      },
      {
        "title": "Lin et al. (2023), AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration",
        "url": "https://arxiv.org/abs/2306.00978"
      }
    ],
    "demos": [
      "quantization",
      "mixed-precision",
      "lora",
      "pruning"
    ]
  },
  "adapters": {
    "level": "core",
    "body": {
      "intuition": [
        "Adapters came first. Houlsby et al. inserted small bottleneck modules - down-project to a low dimension, nonlinearity, up-project back, add to the residual stream - into every transformer block, froze everything else, and reported GLUE performance within 0.4% of full fine-tuning while training 3.6% of the parameters per task. That result is two years older than LoRA and it made the same point. Since then the design space has been filled in: adapters after the FFN only rather than after both sublayers, adapters in PARALLEL to a sublayer rather than in series, learned rescaling vectors instead of matrices, and BitFit, which trains nothing but the bias terms - about 0.09% of parameters - and is still competitive on GLUE at small-to-medium data sizes.",
        "The temptation is to memorize this as a list. He et al.'s unified view is the better move: every one of these methods computes a small DELTA and adds it to some hidden state, and they differ along only three axes. WHICH representation they modify (attention output, FFN output, the keys and values). WHERE the module sits (in series inside the residual path, or in parallel beside the sublayer). And HOW the delta is composed (plain addition, scaled addition, gated). Under that view prefix tuning is a parallel adapter on attention, LoRA is a parallel adapter on a weight matrix with no nonlinearity, and the best variant the paper found was a SCALED PARALLEL ADAPTER on the FFN - a configuration nobody had proposed because it fell between the existing named methods.",
        "Now the proxy, and this lesson is where the module's discipline bites hardest. Every one of these papers reports accuracy parity with full fine-tuning on GLUE-style benchmarks. Careful head-to-head studies that tune each method properly find them broadly comparable, with reported gaps often inside hyperparameter-tuning variance. That is not a boring result - it is telling you the accuracy axis is SATURATED and therefore useless for choosing. The axes that actually separate these methods are the ones the papers mostly do not report: does the update MERGE back into the weights, or does it add sequential depth to every forward pass forever; can requests for different tasks be BATCHED into one pass; how does it behave at batch size 1, where you are latency-bound rather than throughput-bound. AdapterDrop was written because sequential adapters cost enough inference time to be worth engineering around, reporting speedups on the order of tens of percent from simply removing them from the lower layers. LoRA did not win this competition on accuracy. It won because its delta is an additive side path, and that is a structural property, not a quality one."
      ],
      "math": [
        {
          "h": "The bottleneck adapter",
          "paras": [
            "The original form. Down-project the hidden state to a bottleneck of size r, apply a nonlinearity, project back, and add to the residual - which means the module can be initialized near zero and start as the identity, the same trick LoRA uses.",
            "The parameter count is dominated by the two projections, so the bottleneck size r is the single capacity knob, exactly as rank is for LoRA."
          ],
          "tex": "h \\leftarrow h + W_{\\text{up}}\\, \\sigma\\!\\left(W_{\\text{down}}\\, h\\right), \\qquad W_{\\text{down}} \\in \\mathbb{R}^{r \\times d},\\; W_{\\text{up}} \\in \\mathbb{R}^{d \\times r} \\\\[4pt] |\\theta_{\\text{adapter}}| = 2rd + r + d \\;\\;\\text{per insertion point}",
          "texNote": "Zero-initialize W_up and the module is the identity at step 0 - the same near-identity start LoRA gets from B = 0, and for the same reason: a randomly-initialized new module attached to a pretrained one shocks it. Note what the sigma costs structurally: a nonlinearity between the projections means this delta CANNOT be folded into a linear layer, so unlike LoRA it is an extra operation in the forward pass forever."
        },
        {
          "h": "The unified view: three axes, not seven methods",
          "paras": [
            "He et al.'s reframing. Every parameter-efficient method computes a delta on some hidden representation, and the named methods are points in a three-way design space rather than distinct ideas.",
            "The payoff is predictive rather than taxonomic: once you can place a method, you can read off its serving properties. A delta computed in PARALLEL from the sublayer's input can be fused or batched; one computed in SERIES from the sublayer's output cannot, because it must wait."
          ],
          "tex": "\\Delta h = s \\cdot f\\big(\\,\\text{input}\\,\\big) \\quad\\text{parameterized by}\\quad \\begin{cases} \\textbf{target} & \\text{attn out} \\;/\\; \\text{FFN out} \\;/\\; K,V \\\\ \\textbf{position} & \\text{sequential} \\;/\\; \\text{parallel} \\\\ \\textbf{composition} & \\text{add} \\;/\\; \\text{scaled add} \\;/\\; \\text{gated} \\end{cases}",
          "texNote": "Read the named methods off the grid. Houlsby adapter: FFN and attention output, sequential, add. Prefix tuning: keys and values, parallel, gated add. LoRA: a weight matrix, parallel, scaled add, no nonlinearity. The paper's best-performing variant - scaled parallel adapter on the FFN - is a grid cell nobody had named, which is the argument for the framework."
        },
        {
          "h": "(IA)^3 and BitFit: how far down the parameter count goes",
          "paras": [
            "The extreme end of the design space, where the update is not a matrix at all. (IA)^3 learns three vectors per block that RESCALE the keys, the values, and the FFN's inner activations elementwise. BitFit learns nothing but the existing bias terms.",
            "Both are worth knowing because they bound the question: if 0.01% of parameters is competitive on a task, that task was not testing capacity, and any accuracy comparison you run on it is measuring something other than what you think."
          ],
          "tex": "\\text{(IA)}^3:\\;\\; K \\leftarrow l_k \\odot K, \\;\\; V \\leftarrow l_v \\odot V, \\;\\; h_{\\text{ffn}} \\leftarrow l_{ff} \\odot h_{\\text{ffn}} \\quad (\\sim 0.01\\% \\text{ of } \\theta) \\\\[4pt] \\text{BitFit:}\\;\\; \\text{train } \\{b\\} \\text{ only} \\quad (\\sim 0.09\\% \\text{ of } \\theta)",
          "texNote": "Both are elementwise, so like LoRA they merge: the (IA)^3 vectors fold into the adjacent weight matrices and the biases are already part of the model. That merge-ability is not a coincidence - it is what you get when the delta is a rescaling or an addition rather than a new nonlinear computation."
        }
      ],
      "code": [
        {
          "h": "Four methods, side by side, with the number each paper leads with",
          "paras": [
            "Written out together, the family resemblance is obvious and the differences are small. That is the point - the interesting variation is not in these thirty lines."
          ],
          "code": "class BottleneckAdapter(nn.Module):          # Houlsby / Pfeiffer\n    def __init__(self, d, r=64):\n        super().__init__()\n        self.down, self.up = nn.Linear(d, r), nn.Linear(r, d)\n        nn.init.zeros_(self.up.weight)        # near-identity at init, as LoRA does\n    def forward(self, h):\n        return h + self.up(F.gelu(self.down(h)))   # SEQUENTIAL: needs h first\n\nclass ParallelAdapter(nn.Module):            # He et al.'s scaled parallel adapter\n    def __init__(self, d, r=64, s=4.0):\n        super().__init__()\n        self.down, self.up, self.s = nn.Linear(d, r), nn.Linear(r, d), s\n        nn.init.zeros_(self.up.weight)\n    def forward(self, x, sublayer_out):\n        return sublayer_out + self.s * self.up(F.gelu(self.down(x)))  # reads the INPUT\n\nclass IA3(nn.Module):                        # three vectors per block\n    def __init__(self, d, d_ff):\n        super().__init__()\n        self.lk = nn.Parameter(torch.ones(d))\n        self.lv = nn.Parameter(torch.ones(d))\n        self.lff = nn.Parameter(torch.ones(d_ff))\n\ndef bitfit(model):                           # train the biases, nothing else\n    for n, p in model.named_parameters():\n        p.requires_grad = n.endswith(\".bias\")\n\n#  method              trainable %   headline claim\n#  Houlsby adapter ..... 3.6%        within 0.4% of full FT on GLUE\n#  Pfeiffer adapter .... ~1.8%       ~half the params, comparable\n#  LoRA (r=8) .......... ~0.4%       parity on adaptation tasks\n#  (IA)^3 .............. ~0.01%      strong in the few-shot regime\n#  BitFit .............. ~0.09%      competitive on GLUE at small/medium n\n#\n# READ THAT COLUMN AGAIN. If 0.09% is competitive, the benchmark is not\n# testing capacity - so it cannot rank methods BY capacity either.",
          "caption": "Note the single structural difference: BottleneckAdapter takes the sublayer's OUTPUT and must run after it; ParallelAdapter takes its INPUT and can run beside it. Everything downstream - latency, fusability, batchability - follows from that one line."
        },
        {
          "h": "The comparison that actually decides it",
          "paras": [
            "If accuracy is saturated, the evaluation has to measure the properties that are not. These four columns separate the methods cleanly where accuracy does not, and almost no paper reports them together."
          ],
          "code": "# THE TABLE I WOULD BUILD BEFORE CHOOSING:\n#\n#                    merges?  added latency  batch across   trainable\n#                             @ bs=1         tasks?         params\n#  ---------------------------------------------------------------------\n#  LoRA .............. YES     0 (merged)     YES (unmerged) ~0.4%\n#  (IA)^3 ............ YES     0 (merged)     yes            ~0.01%\n#  BitFit ............ n/a     0              no*            ~0.09%\n#  Parallel adapter .. no      small          partly         ~1-4%\n#  Houlsby adapter ... NO      NOTICEABLE     hard           ~3.6%\n#  Prefix tuning ..... no      context cost   YES            ~0.1%\n#\n#  * BitFit's biases are part of the model, so switching task means\n#    swapping weights - fine for one task, useless for multi-tenant.\n\n# WHY SEQUENTIAL ADAPTERS COST LATENCY: they add DEPTH. Two extra small\n# matmuls per block that cannot start until the sublayer finishes, so they\n# are pure serial time. At large batch this is amortized against a busy GPU;\n# at batch size 1 - interactive serving - you are latency-bound and it shows.\n# AdapterDrop removes adapters from the LOWER layers for exactly this reason\n# and reports inference speedups in the tens of percent for multi-task\n# serving, at little accuracy cost.\n\n# MEASURE IT YOURSELF, both regimes, because they disagree:\nfor bs in (1, 64):\n    t_base = time_forward(base_model, bs)\n    t_adpt = time_forward(adapted_model, bs)\n    print(bs, f\"{100 * (t_adpt / t_base - 1):.1f}% slower\")",
          "caption": "The four columns that are not saturated. Sequential adapters add serial depth that cannot overlap with anything, so the penalty is largest at batch size 1 - which is exactly the interactive-serving case, and exactly the regime papers benchmarking throughput do not report."
        }
      ],
      "useCases": [
        "Multi-task systems where each task needs a modest amount of capacity and the tasks are known in advance - the setting adapters were designed for, and where AdapterFusion-style composition lets you combine several trained adapters without retraining any of them.",
        "Research on the design space itself: adapters are the most flexible insertion point, so if you need a nonlinearity, a gate, or a module that reads something other than a weight matrix's input, LoRA's additive-matrix form cannot express it and an adapter can.",
        "Extreme few-shot adaptation, where (IA)^3-style rescaling with a few thousand parameters is more stable than a matrix update and was shown to beat in-context learning at far lower inference cost - because you pay once at training instead of on every prompt.",
        "Establishing how much capacity a task actually needs. Running BitFit first is a diagnostic: if training 0.09% of the parameters gets most of the way, the task is a readout problem and no amount of adapter capacity will be the deciding factor."
      ],
      "pitfalls": [
        "Choosing between PEFT methods on benchmark accuracy. Careful head-to-head comparisons find them broadly comparable once each is tuned, with reported gaps frequently inside hyperparameter variance. A saturated axis cannot rank anything; you are reading noise and attributing it to method design.",
        "Ignoring inference latency until deployment. Sequential adapters add serial depth to every forward pass, permanently, and the cost is worst at batch size 1 where interactive serving lives. Measure at batch 1 AND at your production batch size - they disagree, and papers usually report only the flattering one.",
        "Assuming any PEFT method supports multi-tenant serving. Only methods whose delta is an additive or multiplicative side path can be batched heterogeneously; anything that modifies the main computation sequentially cannot. This is the property that decided LoRA's adoption and it is not an accuracy property.",
        "Comparing methods at a shared learning rate. Optimal rates differ by an order of magnitude across these methods - prompt tuning in particular needs far higher rates than adapters - and a shared-rate comparison is a reliable way to make a method look bad while feeling rigorous.",
        "Reading 'within 0.4% of full fine-tuning' without asking what the benchmark was. GLUE-style tasks are largely solvable from a good frozen representation, which is why BitFit is competitive on them. That number is evidence about the task's difficulty at least as much as about the method.",
        "Forgetting that adapters must be initialized near the identity. Zero-init the up-projection so the module starts as a no-op; otherwise you reintroduce the random-new-module shock that distorts the pretrained features, which is the failure mode LoRA's zero-initialized B avoids by design.",
        "Stacking adapters from different training runs and expecting composition. AdapterFusion works because it LEARNS a combination; naively summing independently trained deltas is not a defined operation and the results are unpredictable."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "The direct comparison this lesson exists to make. Under the unified view LoRA is a parallel adapter on a weight matrix with no nonlinearity - and that structural choice, not its accuracy, is why it displaced the sequential adapters that preceded it by two years."
        },
        {
          "ref": "fine-tuning/prompt-tuning",
          "text": "The third branch of the design space, and the one the unified view reframes most usefully: prefix tuning turns out to be a parallel adapter acting on the attention keys and values, which explains both its serving advantages and its optimization difficulties."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Mixture-of-experts is the same modular-capacity idea taken to pretraining scale, with a learned router in place of a task label - and it inherits the same serving question about which computations can be shared across a heterogeneous batch."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The columns that actually decide between these methods - added latency at batch 1, batching across tenants, memory residency - are serving concerns, which is why a purely training-side comparison consistently picks the wrong method."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "A saturated benchmark cannot rank methods, and recognizing saturation before running the comparison is the skill. The same reasoning appears there in the context of models rather than adaptation methods."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a bottleneck adapter?",
          "a": "A small module inserted into each transformer block: down-project to size r, nonlinearity, up-project back, add to the residual. Everything else is frozen."
        },
        {
          "q": "What did Houlsby et al. report?",
          "a": "GLUE performance within 0.4% of full fine-tuning while training about 3.6% of the parameters per task. Two years before LoRA, making the same point."
        },
        {
          "q": "What is the difference between Houlsby and Pfeiffer adapters?",
          "a": "Houlsby inserts an adapter after both the attention and the FFN sublayers; Pfeiffer inserts one after the FFN only - roughly half the parameters, comparable results."
        },
        {
          "q": "What is BitFit?",
          "a": "Train only the existing bias terms, about 0.09% of parameters. Competitive with full fine-tuning on GLUE at small-to-medium data sizes."
        },
        {
          "q": "What is (IA)^3?",
          "a": "Three learned vectors per block that rescale the keys, the values, and the FFN inner activations elementwise - around 0.01% of parameters, and it merges into the adjacent matrices."
        },
        {
          "q": "What are the three axes of the unified view?",
          "a": "Which representation is modified (attention output, FFN output, keys and values), where the module sits (sequential or parallel), and how the delta is composed (add, scaled add, gated)."
        },
        {
          "q": "Where does LoRA sit in that grid?",
          "a": "A parallel adapter on a weight matrix, scaled addition, no nonlinearity. Prefix tuning is a parallel gated adapter on the keys and values."
        },
        {
          "q": "What was He et al.'s best-performing variant?",
          "a": "A scaled parallel adapter on the FFN - a cell of the design grid that no named method occupied, which is the argument for having the framework."
        },
        {
          "q": "Why do sequential adapters cost inference latency?",
          "a": "They add serial depth: extra matmuls that cannot start until the sublayer finishes. The cost is worst at batch size 1, where you are latency-bound rather than throughput-bound."
        },
        {
          "q": "What is AdapterDrop?",
          "a": "Removing adapters from the lower transformer layers to recover inference speed in multi-task serving, reported in the tens of percent, at little accuracy cost."
        },
        {
          "q": "Why can LoRA be batched across tasks but sequential adapters cannot?",
          "a": "LoRA's delta is an additive side path, so the expensive shared computation is task-independent. A sequential adapter modifies the main path, so different tasks need different main computations."
        },
        {
          "q": "Why is comparing PEFT methods on GLUE accuracy misleading?",
          "a": "The axis is saturated - BitFit at 0.09% of parameters is competitive - so differences are inside tuning variance. The unsaturated axes are latency, merge-ability, and batchability."
        }
      ],
      "standard": [
        {
          "q": "Compare the main PEFT method families and explain how you would choose between them.",
          "a": "I would start by refusing the list and using the unified view, because it makes the comparison predictive instead of memorized. THE FRAMEWORK. Every one of these methods computes a small delta and adds it to a hidden state. They differ on three axes: WHICH representation (attention output, FFN output, or the keys and values), WHERE the module sits (in series inside the residual path, or in parallel beside the sublayer), and HOW the delta composes (plain add, scaled add, gated). Houlsby adapters are sequential adapters on both sublayers. Pfeiffer is the same on the FFN only. LoRA is a parallel adapter on a weight matrix with no nonlinearity. Prefix tuning is a parallel gated adapter on the keys and values. (IA)^3 is an elementwise rescaling. BitFit trains the biases and nothing else. THE ACCURACY QUESTION, disposed of first. Every one of these papers reports near-parity with full fine-tuning on GLUE-style benchmarks, and careful head-to-head studies that tune each properly find them broadly comparable, with reported gaps often inside hyperparameter variance. That is not a disappointing result, it is a diagnostic: BitFit at 0.09% of parameters being competitive tells you these benchmarks are not testing capacity, so they cannot rank methods by capacity either. I would say explicitly that accuracy is the wrong axis and then move to the ones that are not saturated. THE AXES THAT DECIDE IT. (1) DOES IT MERGE? LoRA and (IA)^3 fold into the weights, so the deployed model has the original architecture and zero added latency. Sequential adapters cannot - they are extra operations forever. (2) CAN YOU BATCH ACROSS TASKS? Only if the delta is an additive or multiplicative side path, leaving the expensive shared computation task-independent. LoRA can; sequential adapters largely cannot. This is what makes multi-tenant serving possible and it is the single most consequential difference. (3) LATENCY AT YOUR BATCH SIZE. Sequential adapters add serial depth. At large batch it amortizes against a busy accelerator; at batch size 1 - interactive serving - it is visible, which is why AdapterDrop was written. (4) TRAINABLE PARAMETERS, which matters least of the four but is the one everyone reports. HOW I WOULD CHOOSE. Single model, offline batch inference: almost anything, take the simplest. Multi-tenant serving: LoRA, unmerged, no real competition. Extreme few-shot: (IA)^3, which is more stable than a matrix update at that data scale and beats in-context learning at far lower inference cost. Need a nonlinearity or a gate that LoRA's additive-matrix form cannot express: an adapter, because that is the flexible insertion point. And BitFit first as a DIAGNOSTIC - if training the biases gets most of the way, the task is a readout problem and the method choice barely matters. THE SUMMARY I WOULD GIVE. LoRA did not win on accuracy. It won because its delta is an additive side path that merges and batches, and that is a structural property. Knowing that is the difference between choosing a method and repeating a ranking.",
          "deepDive": {
            "q": "The unified view claims prefix tuning is a form of adapter. Reconstruct that argument.",
            "a": "It is a genuinely surprising equivalence and reconstructing it is the best test of whether the framework is real. THE SETUP. Prefix tuning prepends l learned key-value pairs to the attention keys and values at every layer. So attention over the augmented sequence is softmax over the concatenation of the prefix keys and the real keys, applied to the concatenation of the prefix values and the real values. THE ALGEBRA. Split the softmax normalizer into the part coming from the prefix and the part coming from the real tokens. Because softmax over a concatenation can be written as a convex combination of the two separately-normalized attentions, the output becomes: (1 - g) times standard attention over the real sequence, plus g times attention over the prefix alone - where g is the share of total attention mass falling on the prefix, and g depends on the query. THE READING. Rearrange to head = standard_attention + g * (prefix_attention - standard_attention). That is exactly the unified-view form: the original sublayer output, plus a GATED delta computed in PARALLEL from the same query. The gate is g, learned implicitly through the prefix keys; the delta's parameters are the prefix keys and values. So prefix tuning is a parallel adapter on the attention output with a gated composition, and the prefix length l plays the role that bottleneck size r plays elsewhere. WHY THIS IS USEFUL RATHER THAN CUTE. Three predictions fall out. (1) The GATED composition is the odd one out - every other method uses plain or scaled addition. Gating means the delta's influence is bounded by the attention mass it can capture, which explains prefix tuning's known optimization difficulty: to have a large effect the prefix must win attention mass, and the path to that is not a direct gradient on a magnitude. Replacing the gate with a scaled addition should help - and that is what the paper's scaled parallel adapter does, and it performs better. (2) Prefix tuning's serving properties follow from being parallel: different prefixes across a batch are just different tokens, so it batches trivially. (3) The framework predicts unnamed cells. The best variant found was a scaled parallel adapter on the FFN, which existed only as a grid coordinate before the paper. THE GENERAL LESSON. When several methods with different stories perform comparably, that is evidence they are the same method with different parameterizations, and finding the shared form usually explains their failure modes better than any of the individual papers do. That move - unify, then read the differences off the parameterization - is worth more than the specific result."
          }
        },
        {
          "q": "How would you design a fair benchmark comparing PEFT methods?",
          "a": "The main design decision is admitting that accuracy will probably not separate them, and building the study to measure what will. TUNING, which is where most comparisons fail. Each method gets its OWN hyperparameter search with the same budget - same number of trials, same search strategy - because optimal learning rates differ by an order of magnitude across these methods, and comparing them at a shared rate is a reliable way to make one look bad while feeling rigorous. For LoRA the search must couple alpha and r, since the scale is alpha/r and sweeping r at fixed alpha is a learning-rate sweep. I would report the search space and the budget, since 'we tuned each method' means nothing without them. MATCHING WHAT, EXACTLY. Not trainable parameters - that is the wrong control, because these methods place parameters in structurally different positions and equal counts do not mean equal capacity. I would match COMPUTE BUDGET for tuning and TRAINING STEPS, and report the parameter count as an outcome. SEEDS AND VARIANCE. Multiple seeds, and report the spread rather than the best run. Fine-tuning variance on modest datasets is routinely larger than the effects being compared, and a single-seed table showing a 0.3-point gap is not evidence of anything. If the spread overlaps, say so - that is the finding. TASKS THAT ARE NOT SATURATED. This is the substantive fix. If BitFit at 0.09% of parameters matches full fine-tuning on your benchmark, the benchmark is not testing capacity. I would include at least one task where full fine-tuning clearly beats a frozen linear probe, so there is headroom for methods to differ in, and I would report the frozen-probe and full-fine-tuning numbers as the floor and ceiling of the axis. THE NON-ACCURACY COLUMNS, which I would treat as primary rather than an appendix. Added inference latency at batch size 1 AND at production batch size, measured, since they disagree. Whether the method merges. Whether requests for different tasks can share a forward pass. Peak training memory. Adapter artefact size. Training throughput. THE OUT-OF-DISTRIBUTION COLUMN. Every method here constrains the update differently, and the constraint's effect on generalization is invisible in-distribution. LoRA forgets less than full fine-tuning; I would expect the more constrained methods to show more of that, and it is the kind of difference an in-distribution table structurally cannot show. WHAT I WOULD EXPECT TO FIND, stated in advance so the study is falsifiable: accuracy comparable within noise, latency and batching clearly separated, and the ranking on the second set stable across tasks while the ranking on the first is not. If accuracy rankings turn out to be stable across tasks and seeds, that would genuinely surprise me and would be the more interesting result."
        },
        {
          "q": "Why did LoRA displace adapters despite adapters coming first and performing comparably?",
          "a": "Because the deciding argument was a systems argument, and recognizing that is the substance of the answer. THE THREE STRUCTURAL ADVANTAGES. (1) IT MERGES. LoRA's delta is a matrix of the same shape as the weight it modifies, so W' = W0 + (alpha/r)BA and the deployed model is architecturally identical to the base with identical latency. A bottleneck adapter is a new nonlinear module in the residual path - there is no algebra that folds a nonlinearity into a linear layer, so the cost is permanent. In interactive serving at batch size 1 that is visible, and AdapterDrop exists as an entire paper about clawing it back. (2) IT BATCHES ACROSS TASKS. This is the decisive one. Serving unmerged, the forward pass is W0 x plus (alpha/r) B_i A_i x for request i. The first term - which is nearly all the FLOPs - is IDENTICAL regardless of which adapter each request uses, so a batch containing requests for a thousand different fine-tunes runs one shared GEMM plus a batched small low-rank term. Systems like S-LoRA are built on exactly that. A sequential adapter modifies the main path, so different tasks require different main computations and the shared GEMM is gone. LoRA turned per-customer fine-tuning into a viable product; adapters did not. (3) IT NEEDS NO SURGERY. LoRA wraps existing nn.Linear modules. Adapters require inserting modules into the block definition, which means library support per architecture, and it is why adapter tooling stayed a specialist ecosystem while LoRA became a two-line change in any codebase. THE ACCURACY POINT, stated carefully. Adapters were not worse. Houlsby reported within 0.4% of full fine-tuning on GLUE in 2019, and head-to-head studies find the families comparable once tuned. If accuracy had been the deciding axis, the two-year-older method would have won. It was not. THE WIDER LESSON I WOULD DRAW. The property that decided it - the delta is an additive side path rather than a modification of the shared computation - is a property nobody was optimizing for when LoRA was proposed. The paper argues from intrinsic dimension and reports benchmark parity; the merge and the multi-tenant batching are consequences of the form that turned out to matter more than the motivation. That is a common shape in systems: the winning design wins on a property that was incidental to its stated rationale, and you can only see it if you evaluate structure rather than scores.",
          "deepDive": {
            "q": "Are there settings where you would still choose a bottleneck adapter over LoRA today?",
            "a": "Yes, and being able to name them is the check on whether 'LoRA won' is understood or just repeated. CASE 1: YOU NEED A NONLINEARITY. LoRA's delta is BA - strictly a low-rank LINEAR map. A bottleneck adapter has a nonlinearity between its projections and can therefore express deltas LoRA cannot at any rank. On adaptation tasks this rarely binds, but if the fine-tune must implement something like a learned gate or a routing decision on the hidden state, the linear form is a genuine restriction rather than an efficient one. CASE 2: MODULAR COMPOSITION IS THE POINT. AdapterFusion trains a learned attention over several independently-trained adapters, so you can combine task modules without retraining any of them - a workflow that matters when tasks arrive over time and retraining is expensive. Composition of LoRA adapters is less well-defined: summing two independently trained low-rank deltas is not a principled operation and behaves unpredictably. If modularity is the requirement, the adapter ecosystem was built for it. CASE 3: THE INSERTION POINT ISN'T A WEIGHT MATRIX. LoRA modifies existing linear layers. If you want to intervene on the residual stream itself, between sublayers, or on something with no matrix to decompose, an adapter is the natural form. Much interpretability-adjacent and steering work sits here. CASE 4: OFFLINE BATCH INFERENCE, SINGLE TASK. If you run large batches offline, the latency argument is amortized to nothing and the multi-tenant argument is worth zero. Then the choice is free and you should pick whatever your codebase supports. CASE 5: PARALLEL ADAPTERS SPECIFICALLY. He et al.'s scaled parallel adapter on the FFN outperformed the alternatives in their comparison and keeps most of LoRA's structural advantages, since being parallel means it reads the sublayer's input and can be computed alongside rather than after. It is a genuinely good default that is under-used mostly because it lacks a memorable name and a tooling ecosystem. THE HONEST SUMMARY. In production, LoRA is right almost always, and the reason is serving structure rather than quality. The adapter family remains the more expressive and more composable design space, and it is where I would look if the constraint I hit is expressiveness or modularity rather than memory."
          }
        },
        {
          "q": "BitFit trains 0.09% of parameters and is competitive on GLUE. What should you conclude?",
          "a": "Mostly something about GLUE, and then something interesting about pretrained models - in that order, because the first conclusion is the one people skip. CONCLUSION 1: THE BENCHMARK IS NOT TESTING CAPACITY. If tuning only the bias terms - which cannot change any weight matrix, only shift each unit's threshold - reaches full-fine-tuning territory, then the pretrained representation already contains what the task needs and the fine-tune is selecting and rescaling existing features rather than building new ones. That is a statement about the difficulty of the task, and it immediately invalidates using that benchmark to rank methods BY capacity, which is what most PEFT comparison tables implicitly do. Notice this also explains why every PEFT method reports parity on GLUE: on a task where 0.09% suffices, everything above 0.09% will tie. CONCLUSION 2: PRETRAINED REPRESENTATIONS ARE EXTREMELY GENERAL. The positive reading, and it is real. The features are there; what varies between tasks is which ones matter and how strongly. Biases are exactly a per-feature threshold, so BitFit is close to a pure feature-SELECTION mechanism, and its success says most of what a downstream task needs is selection. That is the same finding as the intrinsic-dimension result behind LoRA, reached from a different direction. CONCLUSION 3, THE CAVEAT THE PAPER ITSELF MAKES. BitFit's competitiveness is reported for small-to-medium data. It degrades relative to full fine-tuning as data grows, which is the signature of a capacity constraint that binds once there is enough signal to exploit capacity. So the honest statement is regime-dependent rather than universal, and 'BitFit works' without the regime attached is a misquote. WHAT I WOULD DO WITH THIS OPERATIONALLY. Run BitFit, or a linear probe, FIRST on any new task, as a diagnostic rather than a candidate. It costs almost nothing and it tells me which problem I have. If it gets most of the way, my task is a readout problem: the method choice barely matters, I should spend my effort on data and evaluation, and any PEFT comparison I run will be measuring noise. If it fails badly and full fine-tuning succeeds, there is real headroom, methods will differ, and the comparison is worth running. THE META-POINT, which is this module's spine again. The most useful thing a cheap baseline gives you is not a number to beat - it is information about what your benchmark can and cannot distinguish. Skipping it is how people run careful comparisons on a saturated axis and draw confident conclusions from noise."
        },
        {
          "q": "You are building a platform where thousands of customers fine-tune the same base model. Which method and why?",
          "a": "LoRA, served unmerged, with a standardized rank across tenants. The reasoning is entirely about serving structure. THE CONSTRAINT THAT DOMINATES. Thousands of tenants means thousands of adapted models, most with sparse traffic. If each is a full fine-tune you need one accelerator per one or two models and utilization collapses. The problem is not training cost, it is serving a long tail of low-traffic customers economically, and that is what determines the method. WHY LORA SOLVES IT. Serving unmerged, the forward pass is W0 x + (alpha/r) B_i A_i x. The W0 x term is the overwhelming majority of the FLOPs and it is TENANT-INDEPENDENT, so a single batch can contain requests for many different customers, sharing one dense GEMM, with only the small low-rank detour differing per request. That is a batched gather plus a grouped small GEMM - what Punica's SGMV kernel and S-LoRA implement. No other family gives you this: sequential adapters change the main path, and BitFit's biases are part of the weights so switching tenants means swapping the model. THE DESIGN DECISIONS THAT FOLLOW. (1) STANDARDIZE THE RANK across tenants, so the grouped kernel has one uniform shape. Letting customers choose r is a serving liability disguised as flexibility. (2) TARGET ALL LINEAR LAYERS, since the MLP holds two thirds of the parameters and per-tenant quality is the product. (3) An ADAPTER CACHE with an admission policy - hot adapters resident on device, the tail paged from host memory. It is the same problem shape as KV-cache management and deserves the same attention. (4) A MERGE PATH for whales: if one customer is 40% of traffic, merge their adapter into a dedicated replica and serve it at zero adapter overhead, keeping the shared unmerged pool for the tail. (5) PIN THE BASE REVISION in every adapter's metadata, because an adapter paired with the wrong base degrades output silently rather than erroring. THE TRAINING SIDE. QLoRA if customers train on constrained hardware, but note that you should still serve from an fp16 or inference-quantized base rather than the 4-bit training base - and never merge a QLoRA adapter into the base it was trained against. WHAT I WOULD MEASURE ONCE LIVE. Throughput as a function of DISTINCT ADAPTERS PER BATCH, not just batch size. A batch of 64 requests across 64 different adapters behaves very differently from 64 requests across 4, because the grouped GEMM degenerates toward a loop as the batch becomes ragged. That curve is the real capacity model for this platform, and it is not something the LoRA paper tells you."
        },
        {
          "q": "Explain the unified view of PEFT and why it is more useful than a list of methods.",
          "a": "THE FRAMEWORK. He et al. observed that every parameter-efficient method computes a delta on a hidden representation and adds it, and that the named methods differ along only three axes. TARGET: which representation is modified - the attention output, the FFN output, or the attention keys and values. POSITION: whether the module sits sequentially in the residual path, reading the sublayer's OUTPUT, or in parallel beside it, reading the sublayer's INPUT. COMPOSITION: how the delta combines - plain addition, scaled addition, or a gate. Place the methods on that grid and Houlsby adapters are sequential-add on both sublayers, LoRA is parallel-scaled-add on a weight matrix without a nonlinearity, prefix tuning is parallel-gated-add on the keys and values, and (IA)^3 is a multiplicative rescaling. WHY IT BEATS A LIST - three concrete payoffs. (1) IT PREDICTS SERVING BEHAVIOUR. Position determines everything downstream. A parallel module reads the sublayer's input, so it can be computed alongside, fused, or batched heterogeneously; a sequential one must wait for the output, so it is pure added serial depth. That single distinction explains why LoRA merges and adapters do not, why LoRA supports multi-tenant batching and adapters do not, and why AdapterDrop had to exist. You can read those consequences off the grid coordinate without knowing anything else about the method. (2) IT EXPLAINS FAILURE MODES. Prefix tuning's composition is a GATE, and it is the only method in the family using one. A gated delta's influence is bounded by how much attention mass the prefix can capture, and there is no direct gradient path to 'have a larger effect' - which is a mechanistic account of prefix tuning's notorious optimization instability, and it predicts the fix: replace the gate with a scaled addition. (3) IT PRODUCES NEW METHODS. The best variant in the paper - a scaled parallel adapter on the FFN - was an empty cell of the grid. It was not proposed by anyone because it sat between the existing named methods, and the framework found it by enumeration rather than insight. That is the strongest possible evidence that a taxonomy is real: it generates. THE DERIVATION THAT MAKES IT NON-OBVIOUS. Prefix tuning does not look like an adapter at all - it prepends tokens. But splitting the attention softmax over the prefix and the real sequence rewrites the head output as standard attention plus a gated delta computed in parallel from the same query. That is a genuine equivalence, not an analogy. THE HABIT I WOULD TAKE FROM IT. When several methods with different motivating stories perform comparably on benchmarks, treat that as evidence they are the same method differently parameterized, and go looking for the shared form. The shared form usually explains their differences better than any of the original papers do."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Bottleneck adapter",
        "back": "h <- h + W_up * sigma(W_down * h) inserted per block; 2rd + r + d parameters per insertion point. Houlsby et al. 2019: within 0.4% of full FT on GLUE at 3.6% of parameters - two years before LoRA."
      },
      {
        "type": "intuition",
        "front": "The unified view: three axes",
        "back": "TARGET (attn out / FFN out / K,V) x POSITION (sequential / parallel) x COMPOSITION (add / scaled add / gated). Houlsby = seq-add; LoRA = parallel-scaled-add on a matrix, no nonlinearity; prefix tuning = parallel-GATED-add on K,V."
      },
      {
        "type": "pitfall",
        "front": "PEFT accuracy is a SATURATED axis",
        "back": "Head-to-head studies find these methods comparable once each is tuned, with gaps inside hyperparameter variance. BitFit at 0.09% is competitive on GLUE - so the benchmark is not testing capacity and cannot rank by it. Choose on latency, merge-ability, batchability."
      },
      {
        "type": "intuition",
        "front": "Why position determines everything",
        "back": "A PARALLEL module reads the sublayer's INPUT, so it can be fused, merged, or batched heterogeneously. A SEQUENTIAL one reads the OUTPUT and is pure added serial depth. That single line explains why LoRA merges and adapters do not."
      },
      {
        "type": "definition",
        "front": "BitFit",
        "back": "Train only the existing bias terms (~0.09% of parameters). Competitive with full FT on GLUE at SMALL-TO-MEDIUM data - it degrades as data grows, which is the signature of a capacity constraint that binds once there is signal to exploit."
      },
      {
        "type": "definition",
        "front": "(IA)^3",
        "back": "Three learned vectors per block rescaling K, V and the FFN inner activations elementwise (~0.01% of parameters). Merges into adjacent matrices. Beat in-context learning in the few-shot regime at far lower inference cost."
      },
      {
        "type": "intuition",
        "front": "Prefix tuning IS a parallel adapter",
        "back": "Split the attention softmax over prefix vs real keys: head = standard_attention + g*(prefix_attention - standard_attention), a GATED delta computed in parallel from the same query. The gate explains its optimization instability - no direct gradient path to 'have a larger effect'."
      },
      {
        "type": "pitfall",
        "front": "Measure adapter latency at batch size 1",
        "back": "Sequential adapters add serial depth that cannot overlap. At large batch it amortizes against a busy GPU; at bs=1 (interactive serving) it is visible. The two regimes disagree, and papers report the flattering one. AdapterDrop exists to claw this back."
      },
      {
        "type": "definition",
        "front": "AdapterDrop",
        "back": "Remove adapters from the LOWER transformer layers to recover multi-task inference speed - reported speedups in the tens of percent at little accuracy cost. Evidence that sequential-adapter latency is large enough to engineer around."
      },
      {
        "type": "pitfall",
        "front": "Never compare PEFT methods at a shared learning rate",
        "back": "Optimal rates differ by an order of magnitude across methods (prompt tuning needs far higher rates than adapters). Each method gets its own search with an equal budget - otherwise you are measuring the shared rate's suitability, not the method."
      },
      {
        "type": "intuition",
        "front": "The scaled parallel adapter",
        "back": "He et al.'s best variant: a scaled parallel adapter on the FFN - an EMPTY CELL of the design grid that no named method occupied. A taxonomy that generates new methods is a real taxonomy, not a filing system."
      },
      {
        "type": "intuition",
        "front": "Why LoRA displaced adapters despite arriving second",
        "back": "Not accuracy - adapters were within 0.4% of full FT in 2019. LoRA merges to zero latency, batches heterogeneously (shared W0 x term), and needs no architectural surgery. The deciding argument was a SYSTEMS argument, and it was incidental to the paper's stated motivation."
      }
    ],
    "refs": [
      {
        "title": "Houlsby et al. (2019), Parameter-Efficient Transfer Learning for NLP",
        "url": "https://arxiv.org/abs/1902.00751"
      },
      {
        "title": "He et al. (2021), Towards a Unified View of Parameter-Efficient Transfer Learning",
        "url": "https://arxiv.org/abs/2110.04366"
      },
      {
        "title": "Ben Zaken et al. (2021), BitFit: Simple Parameter-efficient Fine-tuning for Transformer-based Masked Language-models",
        "url": "https://arxiv.org/abs/2106.10199"
      },
      {
        "title": "Liu et al. (2022), Few-Shot PEFT is Better and Cheaper than In-Context Learning (T-Few, (IA)^3)",
        "url": "https://arxiv.org/abs/2205.05638"
      },
      {
        "title": "Ruckle et al. (2020), AdapterDrop: On the Efficiency of Adapters in Transformers",
        "url": "https://arxiv.org/abs/2010.11918"
      }
    ],
    "demos": [
      "lora",
      "batching",
      "moe",
      "pruning"
    ]
  },
  "prompt-tuning": {
    "level": "core",
    "body": {
      "intuition": [
        "Every method so far modified weights. This one does not touch them at all. A prompt is a sequence of token embeddings, and nothing requires those embeddings to correspond to real tokens - so learn some. Prepend k trainable vectors to the input embeddings, freeze the entire model, and backpropagate into the vectors only. For k = 20 on a model with d = 4096 that is 82,000 parameters, five orders of magnitude below the model, and the 'fine-tuned model' you ship is a small matrix.",
        "Lester et al.'s central result is not the method, it is the SCALE CURVE. At small model sizes prompt tuning trails full fine-tuning badly. The gap narrows monotonically as the model grows, and by around 10B parameters it closes - on their benchmarks a tuned soft prompt matched full fine-tuning of T5-XXL. This is the cleanest example in the module of a technique whose viability is a property of the regime rather than of the technique, and it has a practical consequence people repeatedly walk into: prototype prompt tuning on a small model and it will look broken, because it IS broken there. Prefix tuning, published slightly earlier, gives the method more room by learning prefix key-value vectors at EVERY layer rather than only at the input, and P-tuning v2 showed that this deeper variant works across scales - so the scale sensitivity belongs to the shallow input-only form specifically.",
        "Name the proxy. The claim is parity with full fine-tuning at scale, and it holds on the benchmarks measured. The costs sit somewhere the benchmark does not look. The soft prompt occupies k positions of CONTEXT on every single request, forever - it is not a one-time training cost but a permanent tax on sequence budget, KV-cache memory, and attention compute. And optimization is genuinely harder than for the other methods: the learning rates are an order of magnitude higher than adapters want, results vary substantially across seeds, and prefix tuning required a reparameterization trick - optimizing a smaller matrix through an MLP rather than the prefix directly - because the direct parameterization would not train stably. That instability is not incidental. Under the unified view, prefix tuning composes its update through a GATE rather than an addition, and a gated update has no direct gradient path toward simply having a larger effect."
      ],
      "math": [
        {
          "h": "Soft prompts: the input sequence, with a learned prefix",
          "paras": [
            "The model is untouched. The only change is that the embedding sequence it receives begins with k vectors that were learned rather than looked up.",
            "Because P lives in embedding space and nothing constrains it to the vocabulary's convex hull, it can express prompts no sequence of real tokens can - which is the source of both its power and its uninterpretability."
          ],
          "tex": "X = [\\,\\underbrace{P}_{k \\times d}\\;;\\; \\underbrace{E(x)}_{n \\times d}\\,], \\qquad \\theta_{\\text{train}} = \\{P\\}, \\quad |P| = k \\cdot d",
          "texNote": "At k = 20, d = 4096 that is 81,920 parameters - about 0.001% of a 7B model. The 'fine-tuned model' is a matrix you could email. Note the shape of the cost though: k is added to every sequence at inference, so the parameter saving is paid back in context."
        },
        {
          "h": "Prefix tuning: a learned prefix in every layer's attention",
          "paras": [
            "Rather than one prefix at the input, learn prefix keys and values injected at every layer's attention. The queries still come only from real tokens, so the prefix is something the sequence can attend TO but never attends FROM.",
            "The reparameterization in the second line is the load-bearing engineering detail. Optimizing the prefix directly was unstable; optimizing a smaller matrix through an MLP and discarding the MLP after training was not."
          ],
          "tex": "\\text{Attn}(Q, [P_K^{(\\ell)}; K], [P_V^{(\\ell)}; V]), \\qquad |\\theta| = 2 L k d \\\\[4pt] P^{(\\ell)} = \\mathrm{MLP}_{\\phi}\\big(P'\\big) \\quad \\text{during training; store } P^{(\\ell)} \\text{ after}",
          "texNote": "Depth is the difference: 2Lkd against kd, so prefix tuning has roughly 2L times the capacity and correspondingly less scale sensitivity - which is what P-tuning v2 exploited to make the family work below 10B. The reparameterization costs nothing at inference because the MLP is thrown away once the prefixes are materialized."
        },
        {
          "h": "What the prefix costs at inference, which no parameter count shows",
          "paras": [
            "The soft prompt is not free after training. It occupies positions in every forward pass, so it enters the attention cost and the KV cache exactly as real tokens do."
          ],
          "tex": "\\text{KV cache} \\;\\propto\\; (k+n), \\qquad \\text{attention FLOPs} \\;\\propto\\; (k+n)^2, \\qquad \\text{usable context} = C - k",
          "texNote": "For k = 20 against a 4k context this is negligible. For the k = 100 or more that prefix tuning sometimes wants, on short requests, it is a real fraction of both the sequence budget and the per-request cost - and it recurs on every request for the life of the deployment, unlike a training-time cost that is paid once."
        }
      ],
      "code": [
        {
          "h": "Soft prompt tuning from scratch, and the initialization that decides whether it trains",
          "paras": [
            "The method is a parameter and a concatenation. The interesting line is the initialization: random vectors in embedding space start nowhere useful, and initializing from real vocabulary embeddings - ideally the tokens of your class labels - is worth a large amount, especially at smaller scale."
          ],
          "code": "class SoftPrompt(nn.Module):\n    def __init__(self, model, k=20, init_tokens=None):\n        super().__init__()\n        self.model = model\n        for p in self.model.parameters():\n            p.requires_grad = False              # the ENTIRE model is frozen\n        emb = model.get_input_embeddings()\n        d = emb.embedding_dim\n        if init_tokens is not None:\n            # INITIALIZE FROM REAL VOCABULARY - e.g. the class-label tokens.\n            # Random init in embedding space starts far outside the region the\n            # model's representations occupy, and at small scale it often never\n            # recovers. This single choice moves results a lot.\n            init = emb.weight[init_tokens].clone().detach()\n        else:\n            init = emb.weight[torch.randint(0, 5000, (k,))].clone().detach()\n        self.P = nn.Parameter(init)              # k x d, the only trainable tensor\n\n    def forward(self, input_ids, attention_mask):\n        e = self.model.get_input_embeddings()(input_ids)\n        B = e.size(0)\n        e = torch.cat([self.P.unsqueeze(0).expand(B, -1, -1), e], dim=1)\n        m = torch.cat([torch.ones(B, self.P.size(0), device=e.device),\n                       attention_mask], dim=1)   # <- extend the mask, or the\n        return self.model(inputs_embeds=e, attention_mask=m)   # prefix is ignored\n\n# LEARNING RATE: prompt tuning wants ~0.3 to 0.03, orders of magnitude above\n# the 2e-5 an adapter wants. Comparing methods at a shared LR makes this one\n# look broken, and that comparison is made surprisingly often.",
          "caption": "Two lines matter. Initializing from real vocabulary embeddings rather than randomly, and extending the attention mask - forget the second and the model silently ignores the prefix you are training, with a loss curve that looks merely disappointing rather than broken."
        },
        {
          "h": "The scale curve, which is the actual finding",
          "paras": [
            "Lester et al.'s central figure. This is what you need to know before running the experiment, because prototyping at small scale gives an answer that is correct about the small model and wrong about the method."
          ],
          "code": "# PROMPT TUNING vs FULL FINE-TUNING, by model size (SuperGLUE, T5):\n#\n#   ~100M params ....... large gap, prompt tuning clearly worse\n#   ~1B   params ....... gap narrowing\n#   ~10B  params ....... gap nearly closed\n#   ~11B  (T5-XXL) ..... PARITY with full fine-tuning\n#\n# The technique's viability is a property of the REGIME, not of the technique.\n# Prototype it on a 250M model and you will conclude it does not work - a\n# conclusion that is correct about that model and wrong about the method.\n\n# WHY DEPTH HELPS: prefix tuning injects at EVERY layer (2Lkd params vs kd),\n# and P-tuning v2 showed that deeper variant works across scales. So the scale\n# sensitivity belongs to the SHALLOW input-only form, not to soft prompts.\n\n# TWO PROPERTIES WORTH KNOWING:\n#\n# 1. DOMAIN ROBUSTNESS. Lester et al. found prompt tuning degrades LESS under\n#    domain shift than full fine-tuning - unsurprising once you connect it to\n#    13-01: a frozen model cannot have its features distorted, because nothing\n#    is updating them. The most constrained method forgets the least.\n#\n# 2. PROMPT TRANSFER (SPoT). A prompt trained on a source task is a good\n#    INITIALIZATION for a related target task, which addresses the slow and\n#    unstable convergence directly - and gives a similarity measure between\n#    tasks as a side effect.",
          "caption": "The scale curve is the paper's result; the method is the vehicle. Note the connection back to 13-01: prompt tuning is the most constrained method here and it is correspondingly the most robust under domain shift, because a frozen model has no features to distort."
        }
      ],
      "useCases": [
        "Serving very large frozen models to many tasks, which is the setting the method was designed for: one copy of a 100B+ model, a matrix of a few thousand numbers per task, and different prefixes in the same batch are just different tokens - the best multi-tenant story of any method in this module.",
        "Adapting models you cannot modify. If the weights are behind an API or a compliance boundary, or the deployment forbids shipping a modified checkpoint, a learned prefix is an adaptation that lives entirely in the input.",
        "Task steering where robustness matters more than peak accuracy - the frozen model cannot be distorted, so the domain-shift degradation is smaller than fine-tuning's, and the base model's other capabilities are exactly preserved by construction.",
        "As a research instrument: soft prompts are a probe of what a frozen model can be induced to do without changing it, and prompt-transfer similarity between tasks - which prompts initialize well from which - is a usable measure of task relatedness."
      ],
      "pitfalls": [
        "Evaluating prompt tuning on a small model. The gap to full fine-tuning is large below roughly 1B parameters and closes only around 10B for the input-only form. A negative result at 250M is a fact about that model, not about the method - use prefix tuning or P-tuning v2 if you must work at small scale.",
        "Forgetting to extend the attention mask when you prepend the prefix. The model silently ignores the vectors you are training, and the failure looks like slow convergence rather than a bug, so it survives for a long time.",
        "Using an adapter's learning rate. Prompt tuning needs rates orders of magnitude higher - hundredths rather than 2e-5 - because the gradient reaches only k*d parameters through the whole frozen stack. A shared-rate comparison across PEFT methods makes this one look broken.",
        "Random initialization in embedding space. Random vectors start far outside the region the model's representations actually occupy. Initialize from real vocabulary embeddings, ideally the tokens of your class labels, which is worth a large amount at small and medium scale.",
        "Ignoring the permanent context cost. The prefix consumes k positions in every request for the life of the deployment - KV cache, attention compute, and usable context - which is a recurring inference cost that no parameter count reveals and that a training-time comparison never shows.",
        "Treating a single run as the result. Prompt tuning has substantially higher seed variance than adapters or LoRA, so a single-seed comparison is unreliable in both directions. Run several and report the spread.",
        "Expecting soft prompts to be interpretable. Nearest-neighbour decoding of learned prompt vectors into vocabulary tokens generally produces incoherent text, because P is not constrained to the region real embeddings occupy. It is an optimization result in embedding space, not a discovered instruction."
      ],
      "connections": [
        {
          "ref": "fine-tuning/adapters",
          "text": "The unified view places prefix tuning as a parallel GATED adapter on the attention keys and values - the only method in the family using a gate, which is a mechanistic explanation for its optimization difficulty rather than an empirical observation about it."
        },
        {
          "ref": "fine-tuning/full-fine-tuning",
          "text": "The domain-robustness result is that lesson's finding taken to its limit: prompt tuning is maximally constrained, so it cannot distort features at all, and it degrades least under shift. Constrain more, learn less, forget less - all the way down."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Where the permanent inference cost lives. Prefix keys and values sit in the cache like real tokens on every request, so a long prefix is a standing memory and compute charge that a parameter count never surfaces."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "The prefix competes with real content for the sequence budget, and the attention cost is quadratic in total length - which turns the choice of k into a serving decision rather than a modelling one at long context."
        },
        {
          "ref": "rag-agents/rag-pipeline",
          "text": "The discrete counterpart. In-context learning and retrieval put instructions in as real tokens - interpretable, editable, no training run - while soft prompts optimize the same positions continuously. The trade is interpretability against capacity per token."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is prompt tuning?",
          "a": "Prepend k trainable embedding vectors to the input, freeze the entire model, and train only those vectors. For k = 20 and d = 4096 that is about 82,000 parameters."
        },
        {
          "q": "How does prefix tuning differ?",
          "a": "It injects learned prefix keys and values at EVERY layer's attention rather than only at the input, giving 2Lkd parameters instead of kd - much more capacity and much less scale sensitivity."
        },
        {
          "q": "What is Lester et al.'s central finding?",
          "a": "Prompt tuning's viability scales with model size: a large gap to full fine-tuning at small scale, closing around 10B parameters, reaching parity at T5-XXL on their benchmarks."
        },
        {
          "q": "Why must you extend the attention mask?",
          "a": "Otherwise the prepended positions are masked out and the model ignores the vectors you are training. The failure looks like slow convergence rather than a bug."
        },
        {
          "q": "How should soft prompts be initialized?",
          "a": "From real vocabulary embeddings, ideally the tokens of your class labels. Random vectors start outside the region the model's representations occupy and often never recover at smaller scale."
        },
        {
          "q": "What learning rate does prompt tuning need?",
          "a": "Orders of magnitude higher than adapters - hundredths rather than 2e-5 - because the gradient reaches only k*d parameters through the entire frozen stack."
        },
        {
          "q": "What is the reparameterization trick in prefix tuning?",
          "a": "Optimize a smaller matrix through an MLP and materialize the prefixes afterwards, discarding the MLP. The direct parameterization would not train stably."
        },
        {
          "q": "What is P-tuning v2?",
          "a": "Prefix tuning applied to natural-language understanding, showing the deep per-layer variant works comparably to fine-tuning across scales - so the scale sensitivity belongs to the shallow input-only form."
        },
        {
          "q": "What does the prefix cost at inference?",
          "a": "k positions of context on every request, forever: KV-cache memory, quadratic attention cost, and usable context reduced from C to C - k. No parameter count shows it."
        },
        {
          "q": "Why is prompt tuning robust to domain shift?",
          "a": "The model is entirely frozen, so its features cannot be distorted by fine-tuning. It is the most constrained method here and correspondingly the one that forgets least."
        },
        {
          "q": "What is SPoT?",
          "a": "Soft prompt transfer: initialize a target task's prompt from a prompt trained on a related source task. It speeds up and stabilizes convergence, and yields a task-similarity measure as a by-product."
        },
        {
          "q": "Are soft prompts interpretable?",
          "a": "Generally not. Nearest-neighbour decoding into vocabulary tokens produces incoherent text, because the learned vectors are not constrained to the region real embeddings occupy."
        }
      ],
      "standard": [
        {
          "q": "Explain prompt tuning and prefix tuning, and when you would use them over LoRA.",
          "a": "THE IDEA. A prompt is a sequence of embedding vectors, and nothing requires those vectors to be lookups of real tokens. So learn them. Prompt tuning prepends k trainable vectors to the input embeddings, freezes the whole model, and backpropagates into those vectors alone - k*d parameters, about 82,000 at k = 20 and d = 4096, five orders of magnitude below the model. Prefix tuning does the same idea with depth: learned prefix keys and values injected at every layer's attention, 2Lkd parameters, which is far more capacity. The queries still come only from real tokens, so the prefix is something the sequence attends TO but never attends FROM. THE CENTRAL RESULT, which is about scale rather than about the method. Lester et al. showed the gap to full fine-tuning is large at small model sizes and closes monotonically as the model grows, reaching parity around 10B parameters. That has a direct practical consequence: prototyping prompt tuning on a 250M model gives you a negative result that is correct about that model and wrong about the method. Prefix tuning and P-tuning v2, being deep, are much less scale-sensitive - so the fragility belongs specifically to the shallow input-only form. WHEN I WOULD CHOOSE IT OVER LORA. Three cases. (1) THE MODEL IS ENORMOUS AND FROZEN AND SHARED. One copy of a very large model, thousands of tasks, a few kilobytes each. Different prefixes in one batch are just different tokens, so heterogeneous batching is trivial - better even than LoRA's, which needs a specialized grouped kernel. (2) I CANNOT MODIFY THE WEIGHTS - behind an API, a compliance boundary, or a deployment that forbids shipping modified checkpoints. A learned prefix is adaptation that lives entirely in the input. (3) ROBUSTNESS MATTERS MORE THAN PEAK ACCURACY. Because the model is entirely frozen, its features cannot be distorted and its other capabilities are preserved exactly. Lester et al. measured better domain-shift behaviour than full fine-tuning, which is 13-01's finding taken to its limit. WHEN I WOULD NOT. Below about 10B for shallow prompt tuning. When context budget is tight, since the prefix is a permanent per-request tax on KV cache and attention rather than a one-time training cost. And when I need reliable results without babysitting - prompt tuning has materially higher seed variance and needs learning rates orders of magnitude away from everything else in the stack, which makes it awkward to slot into a pipeline tuned for adapters. THE HONEST SUMMARY. It has the best parameter count and the best multi-tenant story in the module, and it pays for both with optimization difficulty and a permanent context cost. For most production work LoRA is the better trade; prompt tuning wins at the extreme end of scale and sharing.",
          "deepDive": {
            "q": "Why is prompt tuning harder to optimize than the other PEFT methods? Give a mechanistic account.",
            "a": "Four reasons, and they compound. (1) THE GRADIENT PATH IS LONG AND NARROW. The trainable parameters sit at the very bottom of the network and the loss is at the top, so every gradient traverses the entire frozen stack to reach k*d numbers. Adapters and LoRA have trainable parameters distributed at every depth, so most of their parameters are close to the loss. A long path means more opportunity for the signal to be attenuated or dominated by curvature, and it is a large part of why the required learning rate is orders of magnitude higher. (2) THE PARAMETERS LIVE IN AN UNUSUAL SPACE. P occupies the embedding space, but real embeddings occupy a small, structured region of it - roughly a shell, with strong anisotropy. Random initialization puts the prompt far outside that region, where the model's early layers have never operated and their behaviour is essentially undefined. This is why initializing from real vocabulary embeddings helps so much: it starts you inside the manifold the rest of the network was trained to consume. (3) THE COMPOSITION IS A GATE, not an addition - the unified view's diagnosis, and the deepest of the four. Rewriting attention over a prefixed sequence splits into standard attention plus a gated delta, where the gate is the share of attention mass the prefix captures. So the prefix's influence is BOUNDED by how much attention it wins, and there is no direct gradient on 'have a larger effect' - it must first win mass, which is a competitive, saturating process. Contrast LoRA, where the update is added with a fixed scale and its magnitude is directly optimizable. This predicts the fix, and the fix works: He et al.'s scaled parallel adapter replaces the gate with a scaled addition and trains better. (4) CAPACITY IS SMALL AND INDIRECT. k*d parameters must steer an entire frozen network, so the loss surface is a low-dimensional slice of a very high-dimensional function, and there is no reason for that slice to be well-conditioned. THE OBSERVED CONSEQUENCES, all of which follow. High seed variance. Slow convergence needing many more steps than adapters. Sensitivity to k, to initialization, and to learning rate. And the fact that prefix tuning NEEDED the MLP reparameterization to train at all - which is a preconditioning fix: optimizing through the MLP changes the effective geometry of the parameter space, and the MLP is discarded afterwards because it was only ever scaffolding for the optimizer. THE MITIGATIONS THAT FOLLOW FROM THE DIAGNOSIS. Vocabulary initialization for (2), SPoT prompt transfer for (2) and (4), depth via prefix tuning for (4), and scaled addition instead of gating for (3). Each targets a specific one, which is why they stack."
          }
        },
        {
          "q": "How do soft prompts compare with in-context learning and hard prompt engineering?",
          "a": "They occupy the same positions in the sequence and differ in whether those positions are optimized continuously or written discretely - and that one difference produces the whole comparison. CAPACITY PER POSITION. A hard prompt token must be one of ~50,000 vocabulary items, roughly 16 bits of information. A soft prompt vector is d free real numbers, unconstrained by the vocabulary. So a 20-vector soft prompt can express far more than 20 real tokens can, and empirically it does - which is why prompt tuning reaches full-fine-tuning parity at scale while prompt engineering generally does not. TRAINING DATA. In-context learning needs a handful of examples and no gradient step. Prompt tuning needs a training set and a training run. That is the fundamental trade: soft prompts buy capacity with a labelled dataset and a fitting procedure. INFERENCE COST, where soft prompts win decisively and it is under-appreciated. Few-shot in-context learning puts entire examples in the context on every request - often hundreds or thousands of tokens - and pays quadratic attention over them forever. A 20-vector soft prompt distils the same task specification into 20 positions. The T-Few work made this argument sharply for (IA)^3 and it applies here: pay once at training rather than on every request. INTERPRETABILITY AND EDITABILITY, where hard prompts win decisively. You can read a hard prompt, reason about it, edit one clause, version it in git, and explain it to a reviewer. Soft prompts are opaque - decoding them to nearest vocabulary neighbours produces incoherent text, because they are not constrained to the region real embeddings occupy. In any setting where someone must audit what the model was told, that is disqualifying. ROBUSTNESS. Soft prompts are fitted to a distribution and can overfit it. Hard prompts are written from intent and generalize in a different, often more predictable way. Neither is uniformly better, but a soft prompt's failure mode is a silent distribution-shift degradation, which is harder to notice. HOW I WOULD ACTUALLY DECIDE. Start with a hard prompt, always - it costs nothing, it is a baseline, and it frequently suffices. Move to few-shot if it does not. Move to soft prompts when the task is stable, high-volume, has training data, and the per-request context cost of few-shot examples has become a real expense - which is exactly the industrial setting the method was designed for. And notice the hybrid that people miss: initialize the soft prompt from the tokens of your best hard prompt. You get the good starting point AND the capacity, and it is strictly better than random initialization."
        },
        {
          "q": "Your prompt tuning run is not converging. Walk through your debugging.",
          "a": "In order of frequency, because this method has a small number of very common failures. CHECK 1: IS THE PREFIX ACTUALLY BEING ATTENDED TO? Extend the attention mask by k when you prepend the prefix. This is the single most common bug and its signature is a loss curve that decreases slightly - because the head can still fit something - rather than one that fails outright. Diagnostic: set the prefix to garbage and see whether the loss changes at all. If it does not, the model is not reading it. CHECK 2: LEARNING RATE. Prompt tuning wants hundredths, not 2e-5. If the pipeline was written for LoRA or adapters, the inherited rate is three orders of magnitude too small and the run will look like a very slow, very flat convergence. This is the second most common cause and it is a one-line fix. Sweep upward aggressively - much further than feels reasonable. CHECK 3: INITIALIZATION. If P was initialized randomly, restart from real vocabulary embeddings, ideally the tokens of the class labels or the best hard prompt you have. Random vectors sit outside the region the network was trained to consume, and at small and medium scale the optimizer frequently never finds its way in. CHECK 4: MODEL SCALE. Is this model large enough? Shallow prompt tuning has a large gap below ~1B parameters and closes it only around 10B. If I am on a 350M model, the run is not broken - the method does not work there. The fix is not more steps; it is prefix tuning or P-tuning v2, which inject at every layer and are far less scale-sensitive. CHECK 5: STEPS. Prompt tuning converges much more slowly than adapters - the gradient traverses the entire frozen stack to reach a small number of parameters. Runs that look stalled at the step count an adapter needs are often still moving. Plot to convergence before concluding. CHECK 6: SEED VARIANCE. This method has materially higher run-to-run variance than the alternatives. Before diagnosing a failure, run three seeds; if one works, the problem is stability rather than setup, and SPoT-style initialization from a related task's prompt is the standard remedy. CHECK 7: k. Too few vectors and there is no capacity; too many and the optimization gets harder and the context cost grows. Values in the tens are typical - sweep it, but late, after the above. THE ORDER MATTERS. The first three are bugs and take minutes. Four and five are regime questions that change the plan. Six and seven are tuning. Working in that order means I do not spend a day tuning k on a run whose attention mask was wrong.",
          "deepDive": {
            "q": "How would you decide the prefix length k, accounting for both quality and serving cost?",
            "a": "k is unusual among hyperparameters because it has a permanent per-request cost, so it is a serving decision as much as a modelling one. THE QUALITY SIDE. k is the capacity knob. Quality typically rises steeply from very small k and then flattens - the same saturating shape as LoRA's rank - with the flattening point depending on task complexity and model scale. Larger models need SMALLER k, which is worth noting: a bigger model needs less steering to reach a given behaviour, the same phenomenon as the shrinking intrinsic dimension behind LoRA. I would sweep k over something like 5, 10, 20, 50, 100 and find the knee. THE COST SIDE, which no parameter count shows. The prefix occupies k positions on every request forever. Three consequences: KV-cache memory grows with (k + n) per sequence, which at high concurrency is real device memory; attention cost grows with (k + n)^2, so k matters more on SHORT requests, where it is a large fraction of the total, than on long ones; and usable context drops to C - k. For k = 20 against a 4k context none of this matters. For k = 100 on a service whose median request is 200 tokens, the prefix is a third of the sequence and a substantial share of the per-request cost - and it recurs for the life of the deployment, unlike a training cost paid once. HOW I WOULD ACTUALLY DECIDE. Build the quality-versus-k curve, then overlay a cost curve computed from my own traffic distribution - not from an average, because the effect is dominated by short requests. Pick the knee of quality, then check whether the next smaller k is within tolerance, and prefer it if so, because the cost is recurring and the quality difference is not. THE ALTERNATIVE I WOULD CONSIDER FIRST. If k needs to be large for quality, that is evidence the shallow form lacks capacity, and the right response is usually DEPTH rather than LENGTH: prefix tuning injects at every layer, so it gets 2L times the parameters at the same k, which buys capacity without buying context cost. Trading sequence length for depth is strictly the better direction when serving cost matters, and it is the design insight that separates prefix tuning from prompt tuning in the first place. THE PRODUCTION DETAIL. The prefix's keys and values are identical for every request using that task, so they can be computed once and cached rather than recomputed - a prefix-cache, which is the same mechanism as system-prompt caching. That removes the compute cost while leaving the memory and context costs, and it is worth building before concluding k is too expensive."
          }
        },
        {
          "q": "Prompt tuning is more robust to domain shift than full fine-tuning. Why, and what does that tell you about the module as a whole?",
          "a": "THE MECHANISM IS ALMOST TRIVIAL ONCE STATED. Full fine-tuning updates the backbone, and 13-01's result is that those updates distort pretrained features - most severely in the directions the fine-tuning data does not constrain, which is exactly where out-of-distribution inputs live. Prompt tuning updates nothing in the backbone. The features are bit-for-bit what pretraining produced, so there is no distortion to suffer. The adaptation is confined to the input, which steers the frozen function rather than rewriting it. Lester et al. measured the consequence directly: smaller degradation under domain shift than full fine-tuning. Catastrophic forgetting is likewise not reduced but ELIMINATED - the base model is unchanged, so its other capabilities are exactly preserved and you can verify that by construction rather than by evaluation. WHAT THIS TELLS YOU ABOUT THE MODULE. It completes a monotone pattern that runs through every lesson so far, and seeing it as one pattern is the point. Full fine-tuning: unconstrained update, learns most, forgets most, worst out-of-distribution behaviour relative to its in-distribution gain. LoRA: rank-constrained, learns less, forgets less - Biderman et al. measured exactly that, and observed it is one property, not two. Adapters and BitFit: smaller still. Prompt tuning: no weight update at all, learns least, forgets nothing. The ordering is the same on both axes because it is the SAME AXIS. The amount you can change the model bounds both what it can acquire and what it can lose, and no method escapes that - the constraint is not a design flaw anyone is going to engineer around. THE PRACTICAL CONSEQUENCE. 'Which PEFT method is best' is malformed. The correct question is which side of the acquire-versus-preserve trade your task sits on. Teaching genuinely new knowledge - a new language, a new domain's facts - means you WANT an unconstrained update and every constraint is working against you. Teaching behaviour, format, tone, task selection - which is most production fine-tuning - means the capability is already present and the constraint costs nothing while buying you preserved capability and robustness for free. THE MODULE'S SPINE, restated. Every method optimizes a proxy. The proxy is always in-distribution performance on the fine-tuning task, which improves with less constraint. The thing you actually want usually includes preserved capability and robustness, which improve with MORE constraint. So the proxy is not merely an imperfect measure of the goal - on this axis it points in the opposite direction, which is why choosing on it goes wrong so reliably."
        },
        {
          "q": "How would you build a multi-task serving system on a single frozen large model using soft prompts?",
          "a": "THE ARCHITECTURE. One copy of the frozen model, resident. A store of per-task prefixes: for shallow prompt tuning, a k x d matrix per task, a few hundred kilobytes; for prefix tuning, per-layer keys and values, larger but still small. At request time, look up the task's prefix, prepend it, run. THE PROPERTY THAT MAKES THIS EASY. Different prefixes in one batch are just different token positions, so a batch containing requests for many tasks is a completely ordinary batched forward pass - no custom kernel, no grouped GEMM, none of the machinery S-LoRA needs for heterogeneous LoRA batching. This is the best multi-tenant story of any method in the module and it is the reason the technique was proposed at that scale in the first place. THE OPTIMIZATION THAT MATTERS MOST. The prefix's keys and values are IDENTICAL for every request using that task, so compute them once and cache them rather than recomputing per request. This is exactly system-prompt or prefix caching, and with it the prefix costs memory and context but almost no compute. Building this early removes most of the objection to larger k. THE COSTS I WOULD PLAN FOR. Context: usable length is C - k for every request. KV cache: (k + n) per sequence, so at high concurrency the prefix is a standing memory charge multiplied by concurrent sequences - though with the shared-prefix cache above, the task-prefix portion can be stored once per task rather than once per sequence, which is a large saving and worth the engineering. Attention: quadratic in (k + n), which bites on SHORT requests, so I would size k against my traffic's short tail rather than its mean. THE OPERATIONAL DESIGN. Prefixes are small enough to treat as configuration: version them, roll them out per tenant, A/B them, and roll back instantly by pointing at the previous matrix. That is a materially better deployment story than swapping model weights, and it is a genuine advantage over every weight-modifying method here. THE PART I WOULD BE HONEST ABOUT. This works well only if the base model is LARGE - shallow prompt tuning trails badly below about 10B. If the platform's model is 7B, I would use prefix tuning or P-tuning v2 for the per-layer capacity, or accept that LoRA is the better method and build the grouped-kernel serving path instead. Choosing prompt tuning for its serving elegance on a model too small to support it is the predictable way this design fails. I would also plan for a QUALITY FLOOR per task: some tasks will not reach acceptable quality with a prefix, and the system should be able to fall back to a LoRA adapter or a dedicated fine-tune for those, which means the serving layer should not assume a single adaptation mechanism from the start."
        },
        {
          "q": "What does it mean that soft prompts are not interpretable, and should it worry you?",
          "a": "WHAT IS ACTUALLY TRUE. If you take a learned prompt vector and find its nearest neighbours among the real vocabulary embeddings, you generally get incoherent text - not a hidden instruction written in English. The reason is geometric: real embeddings occupy a small, structured, anisotropic region of the d-dimensional space, and nothing in the optimization constrains P to stay inside it. The learned vectors are points in embedding space that produce useful behaviour when consumed by layer 1; they are not compressed sentences. Some work finds loosely related tokens for some prompts, but that is weak and not something to rely on. WHY IT MATTERS PRACTICALLY. Three places. (1) AUDITING. In a regulated or safety-sensitive deployment, someone may need to state what the model was instructed to do. 'A matrix we fitted' is a materially worse answer than a prompt someone can read, and in some settings it is not an acceptable answer at all. (2) DEBUGGING. When a hard prompt misbehaves you read it, spot the ambiguous clause, and edit it. When a soft prompt misbehaves your only tool is retraining, because there is nothing to inspect. That is a real reduction in operational leverage. (3) SECURITY. A soft prompt is an opaque artefact that alters model behaviour. If prefixes are supplied by tenants or fetched from a store, the supply chain deserves the same scrutiny as model weights - and unlike weights, there is no reading it to check. SHOULD IT WORRY ME? It should INFORM the choice rather than rule it out, and I would frame it as a trade rather than a defect. The uninterpretability is the same property as the capacity: a soft vector is unconstrained by the vocabulary, which is precisely why 20 of them outperform 20 real tokens. You cannot have the capacity and the readability, because the readability is the constraint. WHERE THAT LEAVES ME. For a stable, high-volume, well-specified task with an evaluation I trust, I would use soft prompts and treat the evaluation as the audit surface - what the artefact DOES is measurable even when what it SAYS is not. For anything requiring human review of instructions, anything low-volume enough that a hard prompt suffices, or anything where I will need to iterate quickly on behaviour, I would use a hard prompt and keep the readability. THE BROADER POINT. This is the same trade as learned features versus hand-engineered ones, one level up. We accepted opacity in representations decades ago because the capacity was worth it, and we manage it with evaluation rather than inspection. Soft prompts extend that bargain to instructions, and it deserves the same response: not refusal, but an insistence that the behavioural evaluation is strong enough to carry the weight the inspection used to."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Prompt tuning vs prefix tuning",
        "back": "Prompt tuning: k trainable vectors prepended at the INPUT, k*d parameters. Prefix tuning: learned K,V prefixes at EVERY layer, 2Lkd parameters. Depth is the difference - and it is why prefix tuning is far less scale-sensitive."
      },
      {
        "type": "intuition",
        "front": "The power of scale (Lester et al.)",
        "back": "Prompt tuning trails full FT badly at small scale, closes the gap monotonically, and reaches PARITY around 10B (T5-XXL). Prototyping on a 250M model gives a negative result that is correct about that model and wrong about the method."
      },
      {
        "type": "pitfall",
        "front": "Extend the attention mask",
        "back": "Prepending k vectors without extending the mask means the model IGNORES the parameters you are training. The signature is a loss that decreases slightly rather than failing outright - so the bug survives a long time. Test: set the prefix to garbage; if loss is unchanged, it is not being read."
      },
      {
        "type": "pitfall",
        "front": "Prompt tuning needs a huge learning rate",
        "back": "Hundredths, not 2e-5 - orders of magnitude above adapters. The gradient traverses the ENTIRE frozen stack to reach only k*d parameters. Inheriting an adapter pipeline's LR makes the method look broken."
      },
      {
        "type": "intuition",
        "front": "Initialize soft prompts from real vocabulary",
        "back": "Real embeddings occupy a small anisotropic shell of the d-dim space; random vectors start outside it, where early layers have never operated. Init from class-label tokens (or your best hard prompt) - worth a lot at small and medium scale."
      },
      {
        "type": "formula",
        "front": "The permanent inference cost of a prefix",
        "back": "KV cache ~ (k+n), attention FLOPs ~ (k+n)^2, usable context = C - k, on EVERY request forever. Bites hardest on SHORT requests, where k is a large fraction of the total. No parameter count shows this."
      },
      {
        "type": "definition",
        "front": "The prefix-tuning reparameterization",
        "back": "Optimize a smaller matrix through an MLP, materialize the prefixes afterwards, discard the MLP. The direct parameterization would not train stably - it is a PRECONDITIONER, scaffolding for the optimizer that costs nothing at inference."
      },
      {
        "type": "intuition",
        "front": "Why prompt tuning is hard to optimize",
        "back": "(1) long narrow gradient path through the whole frozen stack; (2) parameters live outside the embedding manifold; (3) the composition is a GATE - influence is bounded by attention mass won, with no direct gradient on 'have more effect'; (4) tiny indirect capacity."
      },
      {
        "type": "intuition",
        "front": "Prompt tuning is maximally robust to shift",
        "back": "The backbone is untouched, so features cannot be distorted and forgetting is ELIMINATED rather than reduced - verifiable by construction. It is 13-01's finding taken to the limit."
      },
      {
        "type": "definition",
        "front": "SPoT (soft prompt transfer)",
        "back": "Initialize a target task's prompt from one trained on a related source task. Speeds and stabilizes convergence, and gives a task-similarity measure as a by-product - which prompts initialize well from which."
      },
      {
        "type": "pitfall",
        "front": "Soft prompts are not compressed sentences",
        "back": "Nearest-neighbour decoding into vocabulary tokens gives incoherent text, because P is unconstrained by the vocabulary manifold. The uninterpretability IS the capacity - you cannot have both, because readability is the constraint."
      },
      {
        "type": "intuition",
        "front": "Soft prompts vs few-shot ICL",
        "back": "A hard token carries ~16 bits (one of ~50k); a soft vector carries d free reals. So 20 soft vectors beat 20 real tokens. And ICL pays hundreds of context tokens on EVERY request - soft prompts pay once at training. The hybrid: initialize the soft prompt from your best hard prompt."
      }
    ],
    "refs": [
      {
        "title": "Lester et al. (2021), The Power of Scale for Parameter-Efficient Prompt Tuning",
        "url": "https://arxiv.org/abs/2104.08691"
      },
      {
        "title": "Li & Liang (2021), Prefix-Tuning: Optimizing Continuous Prompts for Generation",
        "url": "https://arxiv.org/abs/2101.00190"
      },
      {
        "title": "Liu et al. (2021), P-Tuning v2: Prompt Tuning Can Be Comparable to Fine-tuning Universally Across Scales and Tasks",
        "url": "https://arxiv.org/abs/2110.07602"
      },
      {
        "title": "Vu et al. (2021), SPoT: Better Frozen Model Adaptation through Soft Prompt Transfer",
        "url": "https://arxiv.org/abs/2110.07904"
      },
      {
        "title": "Qin & Eisner (2021), Learning How to Ask: Querying LMs with Mixtures of Soft Prompts",
        "url": "https://arxiv.org/abs/2104.06599"
      }
    ],
    "demos": [
      "tokenizer",
      "embeddings",
      "attention",
      "scaling-laws"
    ]
  },
  "instruction-tuning": {
    "level": "core",
    "body": {
      "intuition": [
        "A pretrained language model predicts the next token. Ask it a question and a plausible continuation is another question, because that is what documents containing questions look like. Instruction tuning fixes this with the least exotic technique available: supervised next-token prediction on (instruction, response) pairs, with the loss computed only over the response. That is all supervised fine-tuning is. The interesting part was never the objective - it is what the data does.",
        "Two findings define the subject and they point in opposite directions. FLAN and T0 showed that instruction-tuning on a large MIXTURE of tasks produces zero-shot generalization to task types held out of training - the model learns 'follow the instruction' as a skill rather than learning the tasks. FLAN also found this was scale-dependent: below roughly 8B parameters, instruction tuning HURT held-out zero-shot performance, and the benefit emerged only at much larger scale. Then LIMA went the other way. One thousand carefully curated examples, no reinforcement learning at all, and the resulting model was competitive with heavily RLHF-trained systems in human preference comparisons. Its authors proposed the Superficial Alignment Hypothesis: essentially all knowledge and capability is acquired during pretraining, and alignment merely teaches the model which subdistribution of formats to use when interacting with users. If that is true - and a thousand examples being enough is strong evidence for it - then SFT is not teaching, it is SELECTING.",
        "Which sets up the finding that makes this lesson the module's spine in its sharpest form. Gudibande et al. fine-tuned open models on outputs from a much stronger proprietary model and evaluated two ways. Crowdworkers rated the imitation models as roughly competitive with the target - and targeted capability benchmarks showed little improvement. The models had learned the STYLE of the stronger model: its confident register, its formatting, its structure, its length. They had not acquired its capabilities, and human preference could not tell the difference, because style is what human preference measures on a short comparison. Name the proxy: for instruction tuning the proxy is a preference judgment, from a human or an LLM judge, and it is systematically confounded by exactly the surface properties that SFT is best at teaching. That is not a subtle bias. It means the standard evaluation for this method is most sensitive precisely where the method is most likely to be fooling you."
      ],
      "math": [
        {
          "h": "The SFT objective and the mask that decides what you trained",
          "paras": [
            "Standard cross-entropy over the response tokens only. Including the prompt tokens in the loss trains the model to GENERATE instructions, which is a different task and dilutes the signal you wanted.",
            "The end-of-sequence token being inside the sum is not a detail. If it is masked out or absent from the template, the model never learns to stop, and it will generate until it hits the length limit on every request."
          ],
          "tex": "\\mathcal{L}_{\\text{SFT}} = -\\sum_{t=1}^{|y|} \\log p_\\theta\\!\\left(y_t \\mid x,\\, y_{<t}\\right), \\qquad \\text{mask}_t = \\mathbb{1}[\\,t \\in \\text{response} \\cup \\{\\text{EOS}\\}\\,]",
          "texNote": "In multi-turn data the mask is per-turn: every assistant turn contributes, every user turn does not, and the whole conversation is one sequence so later turns condition on earlier ones. Getting this wrong is the most common silent bug in SFT pipelines - the loss looks reasonable either way, and the symptom appears only in generation."
        },
        {
          "h": "Why multi-task instruction tuning generalizes",
          "paras": [
            "The FLAN mechanism. Pretraining gives a model that continues documents. Instruction tuning on many task types makes the INSTRUCTION itself the variable being conditioned on, so the model learns a mapping from instruction to behaviour rather than a set of behaviours.",
            "The regime caveat is the interesting part: this only pays off at sufficient scale. Below roughly 8B, FLAN found instruction tuning DEGRADED held-out zero-shot performance - the model has enough capacity to fit the training tasks but not enough to abstract the skill from them."
          ],
          "tex": "\\mathbb{E}_{\\text{tasks } \\mathcal{T}} \\big[\\mathcal{L}(\\theta; \\mathcal{T})\\big] \\;\\longrightarrow\\; p_\\theta(y \\mid \\underbrace{i}_{\\text{instruction}}, x) \\quad \\text{generalizes to } i \\notin \\mathcal{T}_{\\text{train}}",
          "texNote": "Read it as meta-learning across task descriptions. The diversity of task TYPES matters more than the number of examples per type - which is why FLAN's ablations show adding task clusters helps and adding examples within a cluster saturates quickly, and why LIMA's thousand diverse examples can outperform tens of thousands of homogeneous ones."
        },
        {
          "h": "Length is a confound in every preference measurement you will make",
          "paras": [
            "Both human raters and LLM judges prefer longer responses at equal quality, and SFT readily learns to be longer. So any preference-based comparison of an instruction-tuned model against its base is measuring a mixture of quality and verbosity, with no way to separate them from the aggregate score."
          ],
          "tex": "\\Pr[\\,y_A \\succ y_B\\,] \\;=\\; f\\big(\\underbrace{q(y_A) - q(y_B)}_{\\text{quality}},\\; \\underbrace{|y_A| - |y_B|}_{\\text{length}},\\; \\underbrace{\\text{style}}_{\\text{register, format}}\\big)",
          "texNote": "The practical instruction: report the mean output length of every model in any preference table, and if the winner is substantially longer, the comparison is not yet interpretable. Length-controlled comparison - matching or regressing out length - is the minimum fix, and it routinely removes a large share of an apparent win."
        }
      ],
      "code": [
        {
          "h": "Building an SFT example, where the bugs live",
          "paras": [
            "Three things go wrong here and all of them are silent: the loss mask, the EOS token, and the chat template. None of them makes training fail; each of them makes the resulting model wrong in a specific way."
          ],
          "code": "def build_example(tokenizer, messages):\n    \"\"\"messages = [{'role': 'user'|'assistant', 'content': ...}, ...]\"\"\"\n    ids, labels = [], []\n    for m in messages:\n        # USE THE MODEL'S OWN TEMPLATE. Special tokens, role markers and\n        # whitespace must match pretraining/post-training exactly - a\n        # hand-rolled '### Assistant:' format on a model trained with ChatML\n        # is a distribution mismatch you will not see in the loss.\n        seg = tokenizer.apply_chat_template([m], tokenize=True,\n                                            add_generation_prompt=False)\n        ids += seg\n        if m[\"role\"] == \"assistant\":\n            labels += seg                      # train on assistant turns\n        else:\n            labels += [-100] * len(seg)        # MASK user/system turns\n    ids.append(tokenizer.eos_token_id)\n    labels.append(tokenizer.eos_token_id)      # <- TRAIN ON EOS, always\n    return {\"input_ids\": ids, \"labels\": labels}\n\n# THE THREE SILENT FAILURES:\n#\n# 1. NO MASK (loss over prompt tokens too). You are training the model to\n#    generate instructions as well as answer them. Training loss looks fine;\n#    quality is diluted, and on templated prompts the model wastes capacity\n#    learning boilerplate it will never need to produce.\n#\n# 2. EOS MASKED OR ABSENT. The model never learns to stop. It generates until\n#    the length cap on every single request. Extremely common, trivially\n#    fixed, and it will not show up until you generate.\n#\n# 3. WRONG TEMPLATE. Silent distribution mismatch. The model works, somewhat,\n#    and is worse than it should be for reasons no metric names.",
          "caption": "The objective is ordinary cross-entropy; the pipeline is where SFT goes wrong. All three failures leave the training loss looking healthy and only surface at generation time, which is why they survive into production."
        },
        {
          "h": "The evaluation that separates style from capability",
          "paras": [
            "Gudibande et al.'s design, and the single most useful experimental pattern in this lesson. Two evaluations of the same models that disagree, where the disagreement is the result."
          ],
          "code": "# TRAIN: fine-tune an open model on outputs sampled from a much stronger model.\n# EVALUATE TWICE:\n#\n#   (A) PREFERENCE - crowdworkers or an LLM judge compare responses.\n#       -> imitation models rated roughly COMPETITIVE with the target.\n#\n#   (B) TARGETED CAPABILITY - benchmarks with checkable answers.\n#       -> little improvement over the base model.\n#\n# THE READING: the imitation learned the target's STYLE - register, format,\n# confidence, structure, length - and not its capability. Preference judging\n# on short comparisons is largely a style measurement, so it could not tell.\n\n# THE MINIMUM DIAGNOSTIC SUITE I WOULD RUN ON ANY SFT MODEL:\nreport = {\n    \"preference_vs_base\":  win_rate(judge, sft, base),      # the flattering one\n    \"mean_output_tokens\":  mean_len(sft), mean_len(base),   # the confound\n    \"exact_answer_tasks\":  accuracy(sft, checkable_bench),  # capability\n    \"held_out_capability\": capability_suite(sft, base),     # forgetting\n    \"format_violations\":   invalid_rate(sft, schema_bench), # what SFT does teach\n    \"refusal_rate\":        refusals(sft, base),             # sycophancy drift\n}\n# If preference_vs_base is up, mean_output_tokens is up 40%, and\n# exact_answer_tasks is flat, you have reproduced the imitation result and\n# you should say so rather than ship it.",
          "caption": "Two evaluations that disagree, where the disagreement IS the finding. Preference win-rate rose while checkable capability did not, because a short preference comparison measures style - which is exactly what SFT is best at teaching."
        }
      ],
      "useCases": [
        "Turning a base model into an assistant at all - the first and largest behavioural change any deployed LLM undergoes, and the step without which the model answers a question with another question.",
        "Teaching format and protocol adherence: JSON schemas, tool-call syntax, citation style, a fixed response structure. This is where SFT is unambiguously the right tool, because the capability exists and only the output convention is missing.",
        "Domain specialization on top of a strong base - support responses, clinical note structure, legal drafting conventions - where a few thousand curated in-house examples teach the house style far more reliably than any prompt.",
        "Producing the starting policy for preference optimization. Every RLHF and DPO pipeline begins from an SFT checkpoint, because both need a policy that already produces plausible responses before preferences can meaningfully rank them."
      ],
      "pitfalls": [
        "Judging SFT by preference win-rate alone. Gudibande et al. showed imitation models rated competitive with a far stronger target while showing little gain on checkable benchmarks - preference judging on short comparisons measures style, and style is precisely what SFT teaches most readily.",
        "Not reporting output length. Human and LLM judges both prefer longer responses at equal quality, and SFT reliably makes models longer. A win-rate table without a length column is not yet interpretable; length-controlled comparison often removes much of the apparent gain.",
        "Computing the loss over prompt tokens. You are training the model to generate instructions alongside answering them, which dilutes the signal and wastes capacity on template boilerplate. Mask everything that is not an assistant turn.",
        "Masking or omitting the EOS token. The model never learns to stop and generates to the length cap on every request. It is the most common SFT bug, it is invisible in the training loss, and it takes one line to fix.",
        "Using a hand-rolled chat template. Special tokens, role markers and whitespace must match what the model was trained with; a plausible-looking custom format is a silent distribution mismatch that degrades quality for reasons no metric will name.",
        "Assuming more data is better. LIMA reached competitive human-preference results with 1,000 curated examples, and filtering work has repeatedly found that aggressively pruning a large instruction set to a small high-quality subset IMPROVES the result. Diversity of task type matters more than volume.",
        "Training on outputs from a stronger model and reporting the preference win as capability transfer. That is the imitation result exactly. If you distil, evaluate on checkable tasks and say plainly what did and did not move."
      ],
      "connections": [
        {
          "ref": "fine-tuning/reward-modeling",
          "text": "SFT is step one of the alignment stack and the reward model is step two. The reason to go further is that SFT can only imitate demonstrations, and there is no demonstration for 'this response is better than that one' - which is the information preferences carry and imitation cannot."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "Training on a stronger model's outputs is distillation, and the imitation result is a precise statement of when it fails: matching output distributions on the sampled distribution transfers surface behaviour reliably and capability only where the student already had the substrate."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "This lesson's failure is an evaluation failure. Judge length bias, position bias, and self-preference are the instruments' properties, and an instruction-tuning result is only as trustworthy as the scrutiny applied to them."
        },
        {
          "ref": "fine-tuning/full-fine-tuning",
          "text": "The forgetting question in its most consequential form: instruction tuning changes behaviour globally, so the capability suite from that lesson must be run before and after, and 'it got better at instructions' does not answer it."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "The Superficial Alignment Hypothesis is a claim about what alignment can and cannot do. If alignment selects a format distribution rather than installing values, then behavioural evaluation of a fine-tune is measuring the selected surface, not the underlying model."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is supervised fine-tuning?",
          "a": "Standard next-token cross-entropy on (instruction, response) pairs, with the loss masked to the response tokens. The objective is ordinary; the data is the interesting part."
        },
        {
          "q": "Why mask the prompt tokens out of the loss?",
          "a": "Otherwise you train the model to generate instructions as well as answer them, diluting the signal and spending capacity on template boilerplate it will never need to produce."
        },
        {
          "q": "What happens if you do not train on the EOS token?",
          "a": "The model never learns to stop and generates to the length cap on every request. Invisible in the training loss, obvious the first time you generate."
        },
        {
          "q": "What did FLAN show?",
          "a": "Instruction-tuning on a large mixture of task types produces zero-shot generalization to held-out task types - the model learns instruction-following as a skill rather than the individual tasks."
        },
        {
          "q": "What is FLAN's scale caveat?",
          "a": "Below roughly 8B parameters, instruction tuning HURT held-out zero-shot performance. The benefit emerged only at much larger scale."
        },
        {
          "q": "What is LIMA's result?",
          "a": "1,000 carefully curated examples with no reinforcement learning produced a model competitive with heavily RLHF-trained systems in human preference comparisons."
        },
        {
          "q": "What is the Superficial Alignment Hypothesis?",
          "a": "Knowledge and capability are acquired almost entirely in pretraining; alignment teaches the model which subdistribution of formats to use with users. SFT selects rather than teaches."
        },
        {
          "q": "What did Gudibande et al. find?",
          "a": "Models fine-tuned on a stronger model's outputs were rated competitive by crowdworkers but showed little gain on targeted capability benchmarks. They imitated style, not capability."
        },
        {
          "q": "Why is response length a problem in evaluation?",
          "a": "Human and LLM judges prefer longer responses at equal quality, and SFT reliably increases length. Any preference table without a length column is confounded."
        },
        {
          "q": "Why does the chat template matter?",
          "a": "Special tokens, role markers and whitespace must match what the model was trained with. A plausible-looking custom format is a silent distribution mismatch."
        },
        {
          "q": "How is the loss masked in multi-turn data?",
          "a": "Per turn: every assistant turn contributes to the loss, every user and system turn is masked, and the whole conversation is one sequence so later turns condition on earlier ones."
        },
        {
          "q": "Why does every RLHF pipeline start from an SFT checkpoint?",
          "a": "Preference methods rank responses, so the policy must already generate plausible ones. Preferences over incoherent samples carry almost no usable signal."
        }
      ],
      "standard": [
        {
          "q": "How do you handle multi-turn conversation data in SFT?",
          "a": "THE BASIC SETUP. A conversation is ONE training sequence, not a set of independent examples. Tokenize the whole thing with the model's chat template, and set the label mask per turn: every assistant turn contributes to the loss, every user and system turn is masked to -100. Because it is one sequence, later assistant turns are conditioned on all earlier context automatically, which is exactly the behaviour you want and is why you should not split a conversation into separate (context, response) rows. WHY SPLITTING IS WORSE, since people do it. Splitting an n-turn conversation into n examples means the shared prefix is re-encoded n times - so you pay roughly n times the compute for the same signal - and the earlier turns appear repeatedly across examples, which over-weights them relative to later ones. It is the same overfitting-from-repetition argument as batching K-way preference comparisons together rather than as independent pairs. THE DETAILS THAT MATTER. (1) PER-TURN TERMINATORS. Each assistant turn needs its end-of-turn token IN THE LABELS, not just one EOS at the end of the conversation. Otherwise the model learns to end conversations but not turns, and it will run on past where it should have stopped. This is the multi-turn version of the EOS bug and it is easy to miss because single-turn generation looks fine. (2) TRUNCATION. Long conversations exceed the context window, and naive right-truncation cuts off the last assistant turn - so your longest, richest examples contribute a truncated response and teach the model that responses do not end. Truncate from the LEFT, dropping the oldest turns, and keep the final assistant turn intact. (3) SYSTEM PROMPTS. Decide deliberately whether to vary them. Training with one fixed system prompt makes the model brittle to a different one at inference; varying them teaches the model to actually condition on the system prompt, which is usually what you want. (4) PACKING. If you concatenate multiple conversations into one sequence for efficiency, you must prevent cross-contamination - either block-diagonal attention masking, or accept the small leakage, but decide rather than discover. WHAT TO WATCH IN EVALUATION. Multi-turn models fail differently: they lose track of earlier constraints, they repeat themselves across turns, and they degrade as the conversation lengthens. Aggregate quality on single-turn prompts will not show any of this. I would evaluate by TURN INDEX - quality at turn 1 versus turn 5 - which is one grouping and immediately reveals whether the model degrades with depth. THE DATA POINT PEOPLE MISS. If your product is multi-turn, multi-turn data must be in the training set from the start. A model trained only on single turns handles follow-ups poorly, and retrofitting it later is harder than including them, because the single-turn behaviour is already well-established by then."
        },
        {
          "q": "Explain instruction tuning: what it does, what it cannot do, and how you would evaluate it.",
          "a": "WHAT IT IS. Supervised next-token prediction on (instruction, response) pairs with the loss masked to the response. Mechanically it is the most ordinary technique in this module; everything interesting is in the data and the evaluation. WHAT IT ACHIEVES. The base model continues documents, so it answers a question with another question. Instruction tuning changes the model's mode of interaction. FLAN and T0 showed the more surprising version: training on a large MIXTURE of task types produces zero-shot generalization to task types held out entirely, because the instruction becomes the variable being conditioned on and the model learns a mapping from instruction to behaviour rather than a set of behaviours. Diversity of task type turns out to matter more than volume per type. WHAT IT CANNOT DO, which is the substance. LIMA's result - one thousand curated examples, no RL, competitive with RLHF'd systems on human preference - motivated the Superficial Alignment Hypothesis: capability is acquired in pretraining, and alignment selects which format subdistribution the model uses. If a thousand examples suffice, the fine-tune cannot be installing much. Gudibande et al. then tested the sharp version: fine-tune an open model on a much stronger model's outputs, and evaluate two ways. Crowdworkers rated the imitations roughly competitive with the target; targeted capability benchmarks barely moved. The imitations acquired the target's register, formatting, structure and confidence - and none of its capability. HOW I WOULD EVALUATE IT, which follows directly from that. The default instrument is a preference win-rate, and it is confounded precisely where SFT is strongest, so I would never report it alone. My minimum table: (1) preference win-rate against the base, with (2) MEAN OUTPUT LENGTH for every model beside it, because judges prefer length and length-controlled comparison routinely removes much of an apparent win; (3) checkable-answer benchmarks, where style cannot help, as the capability column; (4) a pre-declared capability suite run on the base BEFORE fine-tuning, to price the forgetting; (5) format-violation and refusal rates, which measure what SFT actually teaches and which no accuracy metric registers. THE DECISION RULE. If preference is up, length is up 40%, and checkable accuracy is flat, I have reproduced the imitation result and should say so rather than ship it as a capability gain. If checkable accuracy moves, something real happened. THE ONE-LINE SUMMARY I WOULD GIVE. Instruction tuning reliably teaches behaviour and rarely teaches capability, and the standard evaluation is most sensitive to behaviour - so the method and its metric are aligned with each other rather than with what you wanted.",
          "deepDive": {
            "q": "How much do you believe the Superficial Alignment Hypothesis? What evidence would change your mind?",
            "a": "I believe a strong version of it for BEHAVIOUR and a weak version for capability, and the distinction is where the interesting evidence sits. THE CASE FOR. LIMA's headline is hard to explain otherwise: a thousand examples cannot install knowledge, and yet the resulting model is preferred comparably to systems trained with orders of magnitude more alignment data and a full RL stack. Data-filtering work points the same way - pruning a large instruction set to a small high-quality subset often IMPROVES results, which is the signature of a selection process rather than a learning one. The imitation result is the third leg: style transferred, capability did not. And mechanistically it is plausible, since pretraining sees trillions of tokens and SFT sees millions, so any account where SFT installs capability has to explain how six orders of magnitude less data does it. THE CASE AGAINST, and it is real. First, LIMA was evaluated primarily on human preference over open-ended prompts - which is precisely the instrument Gudibande showed is style-sensitive, so the two results are partly in tension: you cannot cite LIMA's preference win as evidence about alignment while discounting the imitation models' preference wins as style. Second, the scaling of RLHF and of large-scale post-training since then is evidence against the strong version. If alignment were purely superficial, spending enormous effort on post-training would not keep producing capability gains - and it does, particularly on reasoning, where RL with verifiable rewards demonstrably improves checkable performance rather than register. Third, LIMA is a claim about a strong base model; on a weaker base, more data plainly helps more. WHAT I ACTUALLY THINK. The hypothesis is close to true for the FORMAT-AND-REGISTER component of alignment, which is what SFT does, and false as a general claim about post-training, which now includes methods that optimize against checkable outcomes rather than imitating demonstrations. The distinction that resolves it is IMITATION versus OPTIMIZATION: imitating demonstrations can only select from what the base can already produce, because the target is a sample the base could have generated. Optimizing against a signal that is not a demonstration - a verifier, a reward model, a preference - can move the model somewhere it would not have gone, and that is not superficial. WHAT WOULD CHANGE MY MIND. Toward the strong version: a demonstration that RL post-training gains on checkable reasoning benchmarks are reproducible by SFT on a small curated set of the same tasks. Away from it: a careful study showing SFT alone, on a modest dataset, produces gains on tasks the base model provably fails at under any prompting or sampling budget - because the superficial reading predicts that heavy sampling from the base should surface the capability if it is there. That second experiment is cheap and I would want it run before accepting either version."
          }
        },
        {
          "q": "Design an instruction-tuning dataset for a domain assistant. What matters most?",
          "a": "DIVERSITY OF TASK TYPE FIRST, VOLUME LAST - that ordering is the substance of the answer and it inverts most people's instinct. WHY. FLAN's ablations show adding task CLUSTERS helps generalization while adding examples within a cluster saturates quickly, and LIMA showed a thousand diverse curated examples beating far larger homogeneous sets. The model is learning the instruction-to-behaviour mapping, and every new task type is a new data point about that mapping while every extra example within a type is a repeat. THE DESIGN, in order. (1) ENUMERATE THE TASK TYPES the assistant must handle, from real usage if it exists and from the product spec if it does not. Aim for breadth: question answering, summarization, extraction, refusal, clarification requests, multi-turn follow-ups, error handling. Cover the shapes, then fill them. (2) COVER THE HARD CASES DELIBERATELY, especially the ones with no good answer. Ambiguous requests that should trigger a clarifying question. Out-of-scope requests that should be declined. Requests where the honest answer is 'I do not know' - which the model will never learn unless it is demonstrated, because every other example in the set shows a confident answer, and that is a large part of where fine-tuning-induced hallucination comes from. (3) FIX THE RESPONSE CONVENTIONS and enforce them mechanically: length, structure, citation format, refusal wording. SFT learns surface conventions extremely reliably, so being inconsistent here wastes the method's main strength. (4) MULTI-TURN FROM THE START if the product is multi-turn. A model trained only on single turns handles follow-ups poorly, and retrofitting is harder than including them. (5) QUALITY OVER QUANTITY, enforced by review. A few hundred examples an expert has actually read beats tens of thousands scraped. If I generate synthetic data, I filter it hard and I have humans review a sample - and I remember that filtering a large set down usually improves results rather than merely saving compute. (6) MIX IN GENERAL DATA, a few percent, to limit forgetting. This is cheap and it is standard practice in production SFT for a reason. WHAT I WOULD NOT DO. Scrape a large set of model-generated responses from a stronger model and call it a domain dataset. That reproduces the imitation setup exactly: the style will transfer, the domain competence will not, and my preference-based evaluation will tell me it worked. THE EVALUATION BUILT ALONGSIDE, not after. A held-out set by TIME rather than at random, since near-duplicates are endemic in domain corpora and a random split inflates everything. Checkable tasks wherever the domain admits them. And the capability suite on the base model before I start, because after training it is too late to establish the baseline."
        },
        {
          "q": "What is the relationship between SFT, distillation, and the imitation problem?",
          "a": "THEY ARE THE SAME MECHANISM SEEN AT THREE DISTANCES, and the imitation result is what happens when you push the mechanism past what it can carry. SFT AS DISTILLATION. When the responses in your SFT set come from a stronger model, you are doing distillation: minimizing cross-entropy between the student and samples from the teacher. Classical distillation matches full output distributions with a temperature; sequence-level distillation on sampled outputs is the coarser version everyone actually runs. So SFT-on-model-outputs is not LIKE distillation, it IS distillation with hard targets. WHAT TRANSFERS AND WHAT DOES NOT. This is the crux. Matching the teacher's output distribution on a set of prompts transfers whatever is determined by that distribution's SURFACE: register, formatting, structure, hedging, length, the shape of a good answer. It transfers capability only where the student already has the underlying substrate and merely needed to be shown which mode to use - which is the Superficial Alignment Hypothesis restated from the distillation side. Where the teacher's answer is correct for reasons the student cannot represent, the student learns the FORM of a correct answer without the computation that produces it. The predictable result is a model that sounds like the teacher and is confidently wrong more often - because it has learned the teacher's confidence, which was calibrated to the teacher's competence. GUDIBANDE'S MEASUREMENT of exactly this. Imitation models rated competitive by crowdworkers; targeted benchmarks barely moved. And they observed that scaling the imitation DATA did not close the capability gap while scaling the base model did - which is the decisive detail, because it says the bottleneck is the student's capability rather than the amount of teaching. More imitation data buys more style. WHY CLASSICAL DISTILLATION WORKS BETTER THAN THIS SUGGESTS. Two differences. It matches full distributions rather than sampled hard targets, so the student gets the teacher's uncertainty structure - the dark knowledge - not just its argmax. And it is usually applied where teacher and student share an architecture and training distribution and differ only in size, so the substrate really is there. LLM imitation typically violates both. WHAT I TAKE FROM IT PRACTICALLY. Distil for behaviour, format and style, deliberately, and expect it to work well. Do not expect to distil reasoning into a model that cannot do it. If capability transfer is the goal, the things that actually work are different in kind: training on VERIFIED outputs rather than sampled ones - rejection sampling against a checker, which is what the strongest open reasoning models do - or distilling into a student large enough to have the substrate. And whichever I do, I evaluate on checkable tasks, because the preference metric will not distinguish these cases.",
          "deepDive": {
            "q": "If imitation transfers style but not capability, why do distilled reasoning models work as well as they do?",
            "a": "Because the strongest of them are not doing imitation in the sense Gudibande tested, and the difference is precise and worth stating. WHAT CHANGED. The successful reasoning-distillation recipes train on outputs that have been VERIFIED, not merely sampled. Generate many candidate chains of thought from a strong teacher, CHECK the final answers against ground truth, keep only the correct ones, and fine-tune on those. That is rejection sampling, and it changes the objective materially: the training distribution is now the teacher's correct-answer distribution rather than its output distribution. You are no longer imitating a model, you are imitating a filtered process. WHY THAT IS DIFFERENT IN KIND. Under plain imitation, the student's target includes the teacher's errors, and - more importantly - the student cannot tell which of the teacher's confident-sounding chains actually worked, so it learns confidence uniformly. Under verified imitation, every training example is a demonstration that a particular reasoning trajectory REACHES A CORRECT ANSWER. The supervision now carries information the surface does not: it selects trajectories by outcome. That is closer to reinforcement learning with a sparse verifier than to behavioural cloning, and it is exactly the imitation-versus-optimization distinction that resolves the Superficial Alignment Hypothesis. THE SECOND DIFFERENCE: THE TARGET IS INTERMEDIATE COMPUTATION. A chain of thought is not just an answer's surface, it is the intermediate steps. Training on it teaches the student to allocate serial computation - to externalize working into tokens - which is a capability the base model has the substrate for but does not deploy by default. So this is still selection rather than installation in one sense: the capability was latent and the fine-tune taught the model to USE it. That fits the superficial hypothesis better than it first appears, and it explains the scale dependence people observe - distilling reasoning into a very small model works far less well, because the substrate genuinely is not there. THE THIRD DIFFERENCE: MEASUREMENT. Reasoning distillation is evaluated on benchmarks with checkable answers, so the metric cannot be fooled by style. That is not a property of the method, it is a property of the domain, and it is why this literature has cleaner results than the general-assistant imitation literature. Whenever the answer is checkable, the whole set of problems in this lesson shrinks. WHAT I WOULD CONCLUDE. The rule is not 'distillation does not transfer capability'. It is: imitating a SAMPLE transfers surface; imitating a VERIFIED sample transfers whatever the verification selects for; and neither installs a substrate the student lacks. If I want capability transfer, I should be asking what my filter is, not how much teacher data I have - and if I have no filter, I should expect style and evaluate accordingly."
          }
        },
        {
          "q": "Your SFT model generates until the token limit on every request. Diagnose it.",
          "a": "This is the EOS bug and it is worth walking through carefully, because the diagnosis pattern generalizes to most SFT failures - the training loss is healthy and the problem exists only in generation. THE PRIMARY CAUSE. The end-of-sequence token was not in the loss. Either it was never appended to the training targets, or it was appended to input_ids but masked out of the labels, or the chat template's terminator differs from the token the generation config stops on. In all three cases the model never receives gradient signal for 'stop here', so at inference the EOS probability stays near its pretrained baseline and never becomes the argmax. Nothing about this is visible in the loss curve: you trained a valid objective, just not the one you needed. HOW I WOULD CONFIRM IT IN TWO MINUTES. Take a training example, run a forward pass, and inspect the model's probability for the EOS token at the position where the response ends. If it is small, that is the answer. Second check: print the decoded labels for one example with the -100 positions removed, and confirm the terminator is there. Third: compare tokenizer.eos_token_id against the model's generation_config.eos_token_id - a mismatch between the template's end-of-turn token and the configured stop token produces identical symptoms and is common with models using a distinct end-of-turn marker. THE OTHER CAUSES, in order. (1) TEMPLATE MISMATCH: training with one chat format and generating with another means the model is not in the state it learned to terminate from. (2) MULTI-TURN CONCATENATION without per-turn terminators: if the whole conversation was one sequence with a single EOS at the very end, the model learned to end conversations but not turns. (3) GENERATION CONFIG: stop tokens not set, or a repetition or length penalty configured such that EOS is suppressed. (4) TRAINING DATA WITH TRUNCATED RESPONSES: if long examples were cut at max_length, the responses in the data have no natural ending, and the model correctly learned that responses do not end. This one is nastier because the fix is in the data pipeline, and it shows up as 'sometimes stops, sometimes does not' correlated with length. THE FIX AND THE PREVENTION. Append EOS to both input_ids and labels, verify the ids match the generation config, and add an assertion in the data pipeline that every example's labels end with the terminator - a two-line check that makes this class of bug impossible. MORE GENERALLY. Every SFT failure in this lesson shares a shape: the loss is a valid objective computed correctly on data that encoded the wrong thing, so training-time metrics cannot see it. The countermeasure is to GENERATE from a checkpoint early and often, on real prompts, and read the output. A five-minute generation check after the first hundred steps catches the EOS bug, the mask bug, and the template bug together, and none of them are catchable any other way."
        },
        {
          "q": "How do you know whether your fine-tune taught capability or style?",
          "a": "You separate them by CHOOSING INSTRUMENTS THAT STYLE CANNOT MOVE, and the design is straightforward once stated - the difficulty is that the default instrument is the confounded one. THE CONFOUNDED DEFAULT. A preference comparison, from humans or an LLM judge, on open-ended prompts. It is sensitive to register, formatting, structure, confidence and length - exactly the properties SFT teaches most readily. Gudibande's imitation models won on it while gaining almost nothing in capability, so a preference win is compatible with zero capability change and cannot distinguish the cases. THE INSTRUMENTS THAT CAN. (1) CHECKABLE-ANSWER TASKS: mathematics, code that runs against tests, extraction with exact-match answers, closed-book questions with unique answers. Style cannot make a wrong answer right. This is the primary capability column and it should lead the table. (2) LENGTH-CONTROLLED PREFERENCE: match or regress out response length before comparing. It routinely removes a large share of an apparent win, and what remains is more likely to be real. (3) THE PASS-AT-K DIAGNOSTIC, which is the sharpest single test. Sample k responses from the BASE model and check whether any is correct. If the base solves it at k = 50 but not at k = 1, and the fine-tune solves it at k = 1, the fine-tune taught the model to SELECT a capability it already had - real and useful, but not new capability. If the base fails at large k and the fine-tune succeeds, something genuinely changed. This directly operationalizes the Superficial Alignment Hypothesis as an experiment rather than a belief. (4) ADVERSARIAL FORMAT CONTROL: force both models into an identical output format - same length limit, same structure - and re-run the preference comparison. If the win disappears, it was style. THE CONFIRMING SIGNALS, which I would report alongside. Mean output length before and after. Format-violation rate, which should improve if SFT worked as intended. Refusal-rate drift, which detects sycophancy. Calibration - fine-tuning often makes models more confident without making them more correct, and that shows up as worse calibration at equal accuracy, which is a specific and measurable harm. HOW I WOULD SUMMARIZE THE RESULT. Two columns, always, with the honest verdict attached: 'preference up 18 points, checkable accuracy flat, mean length up 42% - this fine-tune changed style'. That sentence is more useful than any single number, it is what the data supports, and it is the kind of statement this whole module exists to make possible."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The SFT objective and its mask",
        "back": "Cross-entropy over RESPONSE tokens only: mask_t = 1[t in response or t = EOS]. Multi-turn: every assistant turn contributes, user/system turns are masked, whole conversation is one sequence."
      },
      {
        "type": "pitfall",
        "front": "The EOS bug",
        "back": "If EOS is absent from the labels (or masked, or mismatched against generation_config), the model never learns to stop and generates to the length cap every time. Invisible in the loss. Confirm by checking p(EOS) at the response end on a training example."
      },
      {
        "type": "intuition",
        "front": "FLAN's finding, and its scale caveat",
        "back": "Instruction-tuning on a MIXTURE of task types generalizes zero-shot to HELD-OUT task types. But below ~8B it HURT held-out performance - the model fits the training tasks without abstracting the skill. Diversity of task type beats volume per type."
      },
      {
        "type": "definition",
        "front": "The Superficial Alignment Hypothesis (LIMA)",
        "back": "Knowledge and capability come almost entirely from pretraining; alignment teaches which subdistribution of FORMATS to use. Evidence: 1,000 curated examples, no RL, competitive with RLHF'd systems on human preference."
      },
      {
        "type": "pitfall",
        "front": "The imitation result (Gudibande et al.)",
        "back": "Fine-tuning on a stronger model's outputs: crowdworkers rated it COMPETITIVE; targeted capability benchmarks barely moved. And scaling imitation DATA did not close the gap while scaling the BASE model did - the bottleneck is the student, not the teaching."
      },
      {
        "type": "pitfall",
        "front": "Length confounds every preference table",
        "back": "Human and LLM judges prefer longer at equal quality, and SFT reliably lengthens output. Report mean output length beside every win-rate; length-controlled comparison routinely removes much of an apparent win."
      },
      {
        "type": "intuition",
        "front": "The pass-at-k diagnostic",
        "back": "The sharpest style-vs-capability test. If the BASE solves it at k=50 but not k=1, and the fine-tune solves it at k=1, the fine-tune taught SELECTION of an existing capability. If the base fails at large k and the fine-tune succeeds, something genuinely new happened."
      },
      {
        "type": "pitfall",
        "front": "Use the model's own chat template",
        "back": "Special tokens, role markers and whitespace must match training. A hand-rolled '### Assistant:' on a ChatML model is a silent distribution mismatch - the model works somewhat and is worse for reasons no metric names."
      },
      {
        "type": "intuition",
        "front": "Why more SFT data is often worse",
        "back": "LIMA: 1,000 curated examples beat far larger sets. Filtering work repeatedly finds that pruning a large instruction set IMPROVES results. The model learns an instruction-to-behaviour MAPPING, so each new task type is a data point and each extra within-type example is a repeat."
      },
      {
        "type": "intuition",
        "front": "Imitation vs optimization",
        "back": "Imitating a SAMPLE can only select from what the base can already produce - the target is something the base could have generated. Optimizing against a signal that is not a demonstration (verifier, reward model, preference) can move the model somewhere it would not have gone."
      },
      {
        "type": "pitfall",
        "front": "Demonstrate 'I do not know'",
        "back": "If every SFT example shows a confident answer, the model learns to always answer confidently - a large part of fine-tuning-induced hallucination. Ambiguity, out-of-scope refusal, and honest uncertainty must be IN the dataset or they will not exist."
      },
      {
        "type": "intuition",
        "front": "Why distilled reasoning models work when imitation fails",
        "back": "They train on VERIFIED outputs - sample many chains, CHECK the final answers, keep only correct ones. The training distribution becomes the teacher's correct-answer distribution. That is rejection sampling, closer to RL with a sparse verifier than to behavioural cloning."
      }
    ],
    "refs": [
      {
        "title": "Wei et al. (2021), Finetuned Language Models Are Zero-Shot Learners (FLAN)",
        "url": "https://arxiv.org/abs/2109.01652"
      },
      {
        "title": "Zhou et al. (2023), LIMA: Less Is More for Alignment",
        "url": "https://arxiv.org/abs/2305.11206"
      },
      {
        "title": "Gudibande et al. (2023), The False Promise of Imitating Proprietary LLMs",
        "url": "https://arxiv.org/abs/2305.15717"
      },
      {
        "title": "Ouyang et al. (2022), Training Language Models to Follow Instructions with Human Feedback (InstructGPT)",
        "url": "https://arxiv.org/abs/2203.02155"
      },
      {
        "title": "Sanh et al. (2021), Multitask Prompted Training Enables Zero-Shot Task Generalization (T0)",
        "url": "https://arxiv.org/abs/2110.08207"
      }
    ],
    "demos": [
      "distillation",
      "dataset-distillation",
      "decoding",
      "calibration"
    ]
  },
  "reward-modeling": {
    "level": "advanced",
    "body": {
      "intuition": [
        "SFT can only imitate demonstrations, and for most of what we want from a model there is no demonstration. Nobody can write the ideal response to an open-ended question, but almost anyone can look at two responses and say which is better. Preferences are cheap where demonstrations are expensive, and they carry information demonstrations cannot: a demonstration says 'this is good', a comparison says 'this is better than that', which is the only kind of statement that can rank the model's own outputs.",
        "The Bradley-Terry model is how you turn comparisons into a number. Assume each response has a latent scalar quality, and the probability of preferring one to another is the logistic function of their difference. Fit that by maximum likelihood and you have a reward model: a language model with the head replaced by a scalar, trained with what is exactly logistic regression on reward differences. Two structural facts follow immediately and are worth holding onto. Only DIFFERENCES are identified - adding a constant to every response's reward for a given prompt changes nothing - so reward scores are meaningful only within a prompt and are not comparable across prompts. And the accuracy ceiling is human agreement: annotators agree with each other roughly 70 to 75% of the time on preference data, so a reward model at 70% held-out accuracy is not obviously bad, it is near the noise floor of its supervision.",
        "This is the lesson where the module's spine stops being an analogy. The reward model IS the proxy - explicitly, by construction, and everyone involved knows it. Gao, Schulman and Hilton made the consequence precise by using a large 'gold' reward model as synthetic ground truth, training proxy reward models against its labels, and then optimizing policies against the proxies. The proxy score rises monotonically. The gold score rises, peaks, and then DECLINES, and they fit the whole curve as a function of the square root of the KL divergence from the initial policy - so the point at which optimization starts destroying value is predictable rather than mysterious, and it moves with the size of the reward model and the amount of preference data. Optimizing a learned proxy past a certain point makes the real thing worse. That is Goodhart's law with a functional form, measured, in the exact setting we deploy it in."
      ],
      "math": [
        {
          "h": "The Bradley-Terry model and its loss",
          "paras": [
            "Each response has a latent scalar reward; the probability of preferring the winner is the sigmoid of the reward gap. Maximizing the likelihood of the observed comparisons gives the training objective.",
            "Notice the second line is logistic regression where the 'feature' is the difference of two network outputs. Everything you know about logistic regression - calibration, separability, the behaviour when classes are easy - applies directly."
          ],
          "tex": "\\Pr[\\,y_w \\succ y_l \\mid x\\,] = \\sigma\\big(r_\\phi(x, y_w) - r_\\phi(x, y_l)\\big) \\\\[6pt] \\mathcal{L}(\\phi) = -\\,\\mathbb{E}_{(x, y_w, y_l)}\\Big[\\log \\sigma\\big(r_\\phi(x,y_w) - r_\\phi(x,y_l)\\big)\\Big]",
          "texNote": "The gradient pushes the winner's score up and the loser's down, weighted by how wrong the model currently is - so confidently-correct pairs contribute almost nothing and the model trains on the pairs it disagrees with. That is also why a dataset of easy pairs teaches very little: after a few epochs the margin saturates and there is no gradient left."
        },
        {
          "h": "Only differences are identified",
          "paras": [
            "The likelihood depends on r only through differences within a prompt, so the reward is determined up to an arbitrary per-prompt shift. This is not a technicality - it governs how you may use the scores."
          ],
          "tex": "r'(x,y) = r(x,y) + c(x) \\;\\Longrightarrow\\; \\mathcal{L}(\\phi') = \\mathcal{L}(\\phi) \\quad \\text{for any } c(x)",
          "texNote": "Consequences: a reward of 3.2 means nothing on its own; comparing rewards ACROSS prompts is meaningless unless you have deliberately constrained the shift; and in PPO you must standardize or whiten rewards per batch, or the value function spends its capacity modelling a per-prompt offset that carries no information. Most reward-scale confusion in practice traces to forgetting this line."
        },
        {
          "h": "Overoptimization: Goodhart with a functional form",
          "paras": [
            "Gao et al. used a large gold reward model as synthetic ground truth, trained proxy reward models on its labels, and optimized against the proxies while watching both scores. The gold score is not monotone in optimization pressure.",
            "The natural x-axis is not steps or reward but the square root of the KL divergence from the initial policy - a measure of how far you have moved, which is exactly the quantity the KL penalty in RLHF controls."
          ],
          "tex": "d = \\sqrt{\\mathrm{KL}(\\pi \\,\\|\\, \\pi_{\\text{init}})}, \\qquad R_{\\text{gold}}(d) \\approx \\begin{cases} d\\,(\\alpha - \\beta d) & \\text{best-of-}n \\\\ d\\,(\\alpha - \\beta \\log d) & \\text{RL} \\end{cases}",
          "texNote": "Both forms rise then fall, so there is an optimum distance to travel and going further is actively harmful. The coefficients improve with reward-model SIZE and with the amount of preference DATA, which is the actionable finding: a bigger, better-trained reward model does not remove overoptimization, it moves the peak further out. And the KL axis is why the KL penalty is a first-class part of the RLHF objective rather than a regularizer someone added for stability."
        }
      ],
      "code": [
        {
          "h": "The reward model, and the K-way batching detail that matters",
          "paras": [
            "The architecture is a language model with a scalar head reading the final token. The non-obvious part is how comparisons are batched: InstructGPT collects K responses per prompt and trains on ALL K-choose-2 pairs in a single forward pass, rather than treating each pair as an independent example."
          ],
          "code": "class RewardModel(nn.Module):\n    def __init__(self, base):          # usually initialized from the SFT model\n        super().__init__()\n        self.base = base\n        self.head = nn.Linear(base.config.hidden_size, 1, bias=False)\n\n    def forward(self, ids, mask):\n        h = self.base(ids, attention_mask=mask).last_hidden_state\n        last = mask.sum(1) - 1                       # index of the final real token\n        return self.head(h[torch.arange(len(ids)), last]).squeeze(-1)\n\n# PAIRWISE LOSS - literally logistic regression on the reward difference:\nloss = -F.logsigmoid(rm(x, y_w) - rm(x, y_l)).mean()\n\n# K-WAY COMPARISONS, and why the batching is not incidental.\n# Collect K responses per prompt, rank them, form all C(K,2) pairs.\n#   - Treating pairs as INDEPENDENT examples means each response appears in\n#     K-1 pairs across different batches, so the model sees it K-1 times and\n#     OVERFITS - InstructGPT reports exactly this.\n#   - Putting all C(K,2) pairs from one prompt in ONE forward pass means each\n#     response is encoded ONCE, so it is one gradient contribution, and it is\n#     also (K-1)x cheaper in compute.\nr = rm(x.repeat(K), ys)                    # K scores, one forward pass\nloss = -F.logsigmoid(r[i_win] - r[i_lose]).mean()   # all C(K,2) pairs from them\n\n# CEILING CHECK before despairing at 70% accuracy: human annotators agree\n# with each other roughly 70-75% of the time on this data. A reward model at\n# 70% is near the noise floor of its own supervision, not obviously broken.",
          "caption": "The K-way batching is a real result, not an optimization: independent pairs make each response appear K-1 times and the model overfits. One prompt, one forward pass, all pairs - cheaper and better."
        },
        {
          "h": "The overoptimization experiment, and the length check you should run first",
          "paras": [
            "Two diagnostics. The first is Gao et al.'s design, which is the only way to observe overoptimization directly since real ground truth is unavailable. The second takes two minutes and explains a surprising fraction of reward-model behaviour."
          ],
          "code": "# --- DIAGNOSTIC 1: does optimizing my proxy help the real thing? ---\n# You cannot measure this without ground truth, so MANUFACTURE it:\ngold = big_reward_model()                       # stand-in for true preference\nprefs = [(x, *label_by(gold, ys)) for x, ys in prompts]\nproxy = train_reward_model(prefs)               # what you would deploy\nfor kl in optimization_pressure:                # BoN with rising n, or RL steps\n    pi = optimize(policy, proxy, kl_budget=kl)\n    print(kl, score(proxy, pi), score(gold, pi))\n#   proxy score: rises monotonically, always.\n#   gold  score: rises, PEAKS, then DECLINES.\n# The gap between those two columns is the entire subject.\n\n# --- DIAGNOSTIC 2: is my reward model just measuring length? ---\nr = [rm(x, y) for x, y in val_pairs]\nprint(\"corr(reward, token_count) =\", pearson(r, [len(y) for _, y in val_pairs]))\nprint(\"accuracy on LENGTH-MATCHED pairs =\",\n      acc(rm, [p for p in val_pairs if abs(len_diff(p)) < 10]))\n#\n# Reward models routinely show strong positive length correlation, and much\n# of RLHF's apparent improvement can be reproduced by optimizing for length\n# alone (Singhal et al.). If accuracy collapses toward chance once pairs are\n# length-matched, the model learned a proxy for a proxy - and the policy will\n# find that out long before you do.",
          "caption": "The first diagnostic requires manufacturing ground truth because real ground truth does not exist - which is why overoptimization went unmeasured for so long. The second costs two minutes and frequently explains most of what a reward model is doing."
        }
      ],
      "useCases": [
        "The scoring component of every RLHF pipeline, where the policy needs a reward for arbitrary generated text and no human is in the loop at generation time - the reward model exists to make human judgment queryable millions of times.",
        "Best-of-n and rejection sampling at inference, which needs no reinforcement learning at all: generate n candidates, score them, return the best. It is the cheapest way to convert a reward model into quality, and it is trivially reversible.",
        "Filtering and curating training data - ranking synthetic instruction data, selecting which generated chains of thought to keep, pruning a corpus - where the reward model acts as a learned quality classifier rather than an RL signal.",
        "Automated evaluation and regression testing, scoring candidate model versions on a fixed prompt set. Useful and dangerous in the same way as any proxy: fine as a monitor, hazardous the moment it becomes the optimization target."
      ],
      "pitfalls": [
        "Optimizing against the reward model without a KL constraint. Gao et al. measured the gold score rising, peaking, and then declining as a function of KL distance from the initial policy - so unconstrained optimization of a learned proxy reliably destroys the thing it was proxying for.",
        "Not checking length correlation. Reward models routinely learn that longer is better, and much of RLHF's apparent improvement has been reproduced by optimizing for length alone. Report the reward-length correlation and accuracy on length-matched pairs before trusting anything else.",
        "Comparing reward scores across prompts. The likelihood identifies only differences within a prompt, so the reward is defined up to an arbitrary per-prompt shift. Cross-prompt comparisons and un-normalized rewards in PPO are both consequences of forgetting this.",
        "Panicking at 70% validation accuracy. Human annotators agree with each other roughly 70-75% of the time, so that figure is near the noise ceiling of the supervision rather than evidence of a broken model. Judge against inter-annotator agreement, not against 100%.",
        "Training on pairs as independent examples. With K-way comparisons, each response then appears in K-1 separate batches and the model overfits - InstructGPT reports exactly this. Put all C(K,2) pairs from one prompt in a single forward pass, which is both better and cheaper.",
        "Assuming a bigger reward model removes overoptimization. It does not; it moves the peak further out. More preference data does the same. The failure mode is structural, so the response is to bound the optimization, not to improve the proxy and then optimize harder.",
        "Ignoring the distribution the reward model was trained on. It scores responses from the SFT policy accurately and becomes unreliable exactly where the policy has moved away from that distribution - which is precisely where an optimizing policy will take it. The proxy degrades fastest where it is being pushed hardest."
      ],
      "connections": [
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "The Bradley-Terry loss IS logistic regression on the difference of two network outputs. Everything from that lesson transfers: calibration, the behaviour of the gradient on easy versus hard examples, and what happens when the classes become separable."
        },
        {
          "ref": "fine-tuning/rlhf-ppo",
          "text": "The consumer of this model, and where the KL penalty earns its place. The overoptimization curve is a function of KL distance from the initial policy, so that penalty is not a stability hack - it is the control on the axis along which the proxy fails."
        },
        {
          "ref": "fine-tuning/dpo-grpo",
          "text": "DPO starts from the same Bradley-Terry likelihood and shows that the optimal policy under a KL-regularized reward objective can be written in closed form, so the reward model can be skipped - which removes this lesson's failure mode and introduces different ones."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "A reward model is a probabilistic classifier over preferences, so it can be calibrated and usually is not. Its confidence is what best-of-n and rejection sampling implicitly rely on, which makes miscalibration a silent quality tax on both."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Overoptimization is the concrete, measured form of the specification-gaming concern. Here it has a functional form and a predictable peak, which makes it a rare case where an alignment worry is an engineering parameter."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why use preferences instead of demonstrations?",
          "a": "Comparing is far easier than demonstrating for open-ended tasks, and a comparison carries information a demonstration cannot: it ranks the model's own outputs, which is what you need to improve on them."
        },
        {
          "q": "What is the Bradley-Terry model?",
          "a": "Each item has a latent scalar quality and the probability of preferring one to another is the sigmoid of their difference. Fitting it by maximum likelihood gives the reward model."
        },
        {
          "q": "What is the reward-model loss?",
          "a": "-log sigma(r(x, y_win) - r(x, y_lose)), averaged over comparisons. It is logistic regression where the feature is a difference of network outputs."
        },
        {
          "q": "What is the reward model's architecture?",
          "a": "A language model with the LM head replaced by a scalar head reading the final token, usually initialized from the SFT checkpoint."
        },
        {
          "q": "Why are reward scores not comparable across prompts?",
          "a": "The likelihood depends only on differences within a prompt, so the reward is identified up to an arbitrary per-prompt shift. Only within-prompt comparisons are meaningful."
        },
        {
          "q": "What accuracy should a reward model reach?",
          "a": "Around 70% on held-out preferences is typical, and human annotators agree with each other only about 70-75% of the time - so that is near the noise ceiling, not a failure."
        },
        {
          "q": "What is reward-model overoptimization?",
          "a": "Optimizing a policy against a learned reward model makes the proxy score rise monotonically while the true objective rises, peaks, and then declines."
        },
        {
          "q": "How did Gao et al. measure it?",
          "a": "They used a large gold reward model as synthetic ground truth, trained proxy reward models on its labels, and tracked both scores as optimization pressure increased."
        },
        {
          "q": "What is the natural x-axis for overoptimization?",
          "a": "The square root of the KL divergence from the initial policy - which is exactly the quantity the KL penalty in RLHF controls."
        },
        {
          "q": "Does a bigger reward model fix overoptimization?",
          "a": "No - it moves the peak further out. More preference data does the same. The failure is structural, so you bound the optimization rather than improve the proxy and push harder."
        },
        {
          "q": "What is the length bias in reward models?",
          "a": "They routinely learn that longer responses are better, and much of RLHF's apparent gain has been reproduced by optimizing for length alone. Check the reward-length correlation early."
        },
        {
          "q": "Why batch all K-choose-2 pairs from one prompt together?",
          "a": "Treating pairs as independent examples makes each response appear in K-1 batches and the model overfits. One forward pass per prompt encodes each response once and is also cheaper."
        }
      ],
      "standard": [
        {
          "q": "Compare best-of-n sampling with RLHF as ways to spend a reward model.",
          "a": "They extract value from the same artefact at opposite ends of the pipeline, and best-of-n is systematically underrated. WHAT BEST-OF-N IS. Sample n responses from the policy, score them all with the reward model, return the highest. No training, no gradients, no RL infrastructure - it is a decoding-time procedure. WHY IT IS BETTER THAN IT SOUNDS. (1) It is REVERSIBLE. The policy is untouched, so a bad reward model costs you nothing permanent; turn n down to 1 and you are back to the base behaviour exactly. RLHF bakes the reward model's errors into the weights. (2) It is IMMUNE to the identifiability problem. Best-of-n compares responses to the SAME prompt, so the reward's arbitrary per-prompt shift cancels exactly - none of the normalization care that PPO needs applies. (3) It is a strong baseline. Gao et al. measured both against a gold reward model and best-of-n is competitive with RL at matched KL over a useful range - which is a striking result given how much less machinery it requires, and it means any RLHF result should be reported against a best-of-n baseline at comparable KL. (4) It is TUNABLE AT INFERENCE. n is a quality-versus-cost dial you can set per request, per customer, or per traffic tier, without retraining anything. WHAT IT COSTS. n times the generation compute, on every request, forever. That is the whole trade: best-of-n moves the cost from training to serving, and RLHF moves it from serving to training. At high volume, RLHF amortizes and best-of-n does not. THE OVEROPTIMIZATION COMPARISON, which is the interesting part. Both overoptimize; they just do it along different curves. Best-of-n's KL from the base policy grows roughly logarithmically in n, so pushing n from 4 to 64 moves you a bounded distance - you cannot easily run off the cliff. RL can travel arbitrarily far, which is why it needs an explicit KL penalty as a first-class part of the objective. Gao et al. fit different functional forms to the two for exactly this reason. So best-of-n is not immune to Goodhart; it is naturally rate-limited, which makes it much harder to get badly wrong. HOW I WOULD ACTUALLY USE THEM. Start with best-of-n, always. It tells me whether the reward model is worth anything before I build an RL pipeline, and the n-versus-quality curve is a direct measurement of how much signal the reward model contains. Then use RLHF if the serving cost of n is unaffordable and the quality gain justifies the pipeline. And there is a third option that gets the best of both: REJECTION-SAMPLING FINE-TUNING - run best-of-n offline, keep the winners, and fine-tune on them with plain SFT. That converts best-of-n's quality into the weights at a fraction of RL's complexity, and it is what several production pipelines actually do."
        },
        {
          "q": "Explain reward modeling end to end: why it exists, how it is trained, and how it fails.",
          "a": "WHY IT EXISTS. SFT imitates demonstrations, and for most of what we want there is no demonstration - nobody can write the ideal answer to an open-ended question. But almost anyone can compare two responses. Preferences are cheap where demonstrations are expensive, and they carry a different kind of information: a comparison ranks the model's OWN outputs, which is the only signal that can improve on them rather than merely reproduce a target. A reward model turns a finite set of human comparisons into a function you can query millions of times. HOW IT IS TRAINED. Assume each response has a latent scalar quality and that the probability of preferring one over another is the logistic function of their difference - that is Bradley-Terry. The loss is -log sigmoid(r_win - r_lose), which is exactly logistic regression on a difference of network outputs. Architecturally it is a language model with the LM head replaced by a scalar head reading the final token, usually initialized from the SFT checkpoint so it shares the policy's representation. One practical detail I would mention because it is a real result rather than an optimization: with K-way comparisons, put all C(K,2) pairs from a prompt in ONE forward pass. Treating them as independent examples makes each response appear in K-1 different batches, and InstructGPT reports overfitting from exactly that. TWO STRUCTURAL FACTS. Only DIFFERENCES are identified - the reward is defined up to a per-prompt shift - so cross-prompt comparisons are meaningless and rewards must be normalized before use in PPO. And the accuracy ceiling is inter-annotator agreement, roughly 70-75%, so a reward model at 70% held-out accuracy is near the noise floor of its supervision rather than broken. HOW IT FAILS - the substance of the answer. (1) OVEROPTIMIZATION, measured directly by Gao et al. using a gold reward model as synthetic ground truth: the proxy score rises monotonically while the gold score rises, PEAKS, and declines, fitted as a function of the square root of the KL from the initial policy. There is an optimal distance to move and going further actively destroys value. Crucially, larger reward models and more data move the peak out but do not remove the effect. (2) LENGTH BIAS. Reward models routinely learn that longer is better, and much of RLHF's apparent improvement has been reproduced by optimizing for length alone. (3) DISTRIBUTION SHIFT, which compounds the first. The reward model is accurate on responses resembling its training distribution, and an optimizing policy moves AWAY from that distribution by construction - so the proxy degrades fastest exactly where it is being pushed hardest. THE SUMMARY. The reward model is the module's theme made literal: it is a proxy by construction, everyone knows it, and the entire engineering discipline around it consists of bounding how far you are allowed to optimize against it.",
          "deepDive": {
            "q": "Why does overoptimization happen, mechanistically? Why does a better reward model not solve it?",
            "a": "THE MECHANISM, in three steps. (1) The reward model is fitted on a FINITE sample of comparisons drawn from the SFT policy's output distribution. Within that region it approximates true preference well. Outside it, its behaviour is determined by whatever the network extrapolates, which is arbitrary and unconstrained by any data. (2) Optimizing the policy against it means SEARCHING for high-reward outputs. That search is adversarial by construction, not by intent - the optimizer explores the space, and the highest-scoring points it finds are disproportionately points where the reward model is WRONG in the upward direction, because errors in that direction are exactly what an argmax selects for. This is the winner's-curse structure and it is the whole story: you are not sampling the reward model's error, you are maximizing over it. (3) So the policy drifts off the reward model's training distribution, into regions where the error is largest and positive, and the proxy score keeps climbing while true quality falls. The gold-score curve rising, peaking, and falling is the sum of a real improvement term and a growing exploitation term. WHY A BETTER REWARD MODEL DOES NOT SOLVE IT. Gao et al. measured this directly: scaling the reward model and the preference data improves the coefficients - the peak is higher and further out - but the SHAPE is unchanged. The reason is that the problem is not approximation error at a point, it is the existence of ANY region where the model over-scores, combined with an optimizer whose job is to find such regions. A better model shrinks those regions but cannot eliminate them with finite data, and a stronger optimizer searches harder for whatever remains. Improving the proxy and then optimizing correspondingly harder gets you back to the same place - which is why 'we will fix it with a bigger reward model' is not a plan. WHAT ACTUALLY HELPS, in order of how much. (1) BOUND THE DISTANCE. The KL penalty is not a stability hack; it constrains movement along the exact axis on which the failure is parameterized. Choosing the penalty is choosing where on the curve to stop, which is why it is the most important hyperparameter in the stack. (2) EARLY STOPPING on a held-out signal that is not the proxy - human evaluation, or a genuinely independent metric. If your only signal is the proxy, you cannot see the peak. (3) REWARD-MODEL ENSEMBLES and pessimism: score with several models and take a conservative aggregate, so the policy has to find a point where they all err upward. This helps and does not eliminate, since ensembles trained on the same data share error modes. (4) ITERATED DATA COLLECTION. Collect fresh preferences ON THE CURRENT POLICY'S OUTPUTS and retrain, which drags the reward model's training distribution along behind the policy. This is what production RLHF pipelines actually do, and it addresses the distribution-shift half of the mechanism directly. (5) VERIFIABLE REWARDS where available. If the reward is a checker rather than a learned model, there is no proxy to exploit - which is why RL on mathematics and code has scaled so much more cleanly than RL on open-ended preference. THE GENERALIZATION. This is Goodhart's law with a measured functional form, in the setting we care about. The lesson transfers to every learned metric used as an optimization target: click models, engagement predictors, LLM judges. Optimizing a learned proxy is safe only within the region where it was fitted, and the optimizer's job is to leave that region."
          }
        },
        {
          "q": "Your reward model gets 68% accuracy on held-out preferences. Is that good?",
          "a": "Probably close to as good as the data allows, and the answer is entirely about what the ceiling is. THE CEILING. Human annotators agree with each other roughly 70-75% of the time on preference data. Where two humans disagree, there is no fact for the model to be right about, so the achievable accuracy is bounded near that agreement rate. A model at 68% is therefore not obviously underperforming - it is close to the noise floor of its supervision. Reporting 68% against an implicit target of 100% is the mistake; the target is inter-annotator agreement, and if I have not measured that on MY data I should before drawing any conclusion. WHAT I WOULD CHECK INSTEAD OF THE HEADLINE NUMBER. (1) ACCURACY BY MARGIN. Split the validation set by how strongly annotators agreed - unanimous versus split decisions. A good reward model should be near-perfect on the pairs humans agree on unanimously and near chance where humans split. If it is at 68% uniformly across both, it is not modelling preference well; it has averaged into a mediocre middle. This single breakdown is far more informative than the aggregate. (2) LENGTH CORRELATION, always. Compute the correlation between reward and token count, and re-measure accuracy on LENGTH-MATCHED pairs. If accuracy falls toward chance once length is controlled, the 68% was substantially a length detector, and the policy will discover that faster than I will. (3) CALIBRATION. The model outputs a probability of preference through the sigmoid of the gap. Is it calibrated? Best-of-n and rejection sampling implicitly rely on the score ordering being trustworthy, and an overconfident reward model degrades both silently. (4) SLICES. Accuracy by prompt category, by response type, by whether a refusal is involved. Aggregate accuracy hides a subpopulation where the model is at chance, and if that subpopulation is where the policy will spend its time, the aggregate is not the relevant number. (5) BEHAVIOUR OUT OF DISTRIBUTION. Score some deliberately degenerate outputs - repetitive text, very long padding, confident nonsense - and check they score low. The reward model will be queried on exactly this kind of thing by an optimizing policy, and it was probably never trained on any of it. WHAT WOULD ACTUALLY WORRY ME. Not 68%. A high length correlation, uniform accuracy across agreement levels, or high scores on degenerate outputs - any of those means the model will fail in the way that matters even if I improved the headline accuracy. THE DECISION. The useful question is not 'is 68% good' but 'is this reward model good enough to optimize against, and how far'. Those are different questions, and the second is answered by the KL budget and by held-out human evaluation during training, not by validation accuracy at all."
        },
        {
          "q": "Someone proposes replacing pairwise preferences with 1-5 quality ratings. Evaluate.",
          "a": "I would push back, and the reasons are well-established from the human-judgment literature rather than specific to language models. WHY PAIRWISE IS BETTER. (1) NO SHARED SCALE IS NEEDED. Absolute ratings require every annotator to hold the same internal mapping from quality to numbers, and they do not. One rater's 4 is another's 3. Ratings drift over a session, anchor on whatever was seen first, and cluster in the middle. A comparison asks only 'which of these two', which requires no calibration between people at all. (2) IT MATCHES THE DECISION. Preference judgments are naturally comparative; asking someone to assign an absolute number forces an extra, harder cognitive step and the noise it adds is not random - it is systematic per annotator, which is worse. (3) THE MODEL ONLY NEEDS THE ORDERING. Bradley-Terry recovers a latent scalar from comparisons alone, so absolute ratings supply information the objective does not use, at the cost of the noise required to produce it. (4) FEWER TIES AND DEGENERATE RESPONSES. Rating scales produce heavy clustering at 3 and 4; comparisons force a decision. WHAT RATINGS DO BUY, honestly. They are more sample-efficient per judgment - N items rated gives N data points, whereas N items compared pairwise gives you as many pairs as you choose to form but each carries less information. They give absolute quality information, so you can answer 'is this good' and not only 'is this better', which comparisons genuinely cannot. And they let you filter data by an absolute threshold. THE DESIGN I WOULD ACTUALLY PROPOSE. K-way ranking, which is what InstructGPT used: show the annotator K responses to one prompt, have them rank all K, and derive all C(K,2) pairs. It is much more efficient than isolated pairs - one annotation session produces many comparisons - it keeps the comparative judgment that humans do reliably, and it makes the annotator's cognitive load reasonable at K of 4 to 9. Then batch all pairs from a prompt into one forward pass, which is both statistically necessary and cheaper. THE HYBRID, if absolute quality is genuinely needed. Collect comparisons for the reward model and a small separate set of absolute ratings for CALIBRATION and reporting - to answer 'is our model actually good' rather than 'did it beat the baseline'. Do not mix them into one objective. THE UNDERLYING POINT. The choice of annotation format is a measurement-design decision, and it determines the noise floor of everything downstream. A reward model cannot be better than its labels, and its labels cannot be better than the question the annotator was asked. Spending effort on the elicitation format is usually higher-leverage than spending it on the model.",
          "deepDive": {
            "q": "How would you improve the QUALITY of the preference data itself, given that the reward model cannot exceed it?",
            "a": "This is where the leverage is, and it gets far less attention than modelling. (1) MEASURE INTER-ANNOTATOR AGREEMENT FIRST, and keep measuring it. Without it I do not know my ceiling, cannot tell a model failure from a data failure, and cannot detect annotator drift. It should be a monitored metric, not a one-time study - and per-annotator, so I can see who diverges. (2) FIX THE INSTRUCTIONS BEFORE FIXING THE MODEL. Most disagreement is not irreducible human variation; it is annotators optimizing different unstated criteria. Is a longer, more thorough answer better, or is concision a virtue? Should a refusal beat a helpful but risky answer? If the guidelines do not say, annotators will each decide, and their disagreement enters the model as noise that no amount of data averages away - because it is not zero-mean, it is a mixture of different objectives. Writing the criteria down, with worked examples of hard cases, typically moves agreement more than any modelling change. (3) COLLECT ON-POLICY AND ITERATE. Preferences over old outputs become less relevant as the policy moves, and the reward model's failure mode is precisely off-distribution error. Production pipelines re-collect on the current policy's generations and retrain, which drags the training distribution along behind the policy. This is the single highest-value process change. (4) TARGET THE INFORMATIVE PAIRS. The Bradley-Terry gradient vanishes on confidently-correct pairs, so a dataset of easy comparisons teaches almost nothing after a few epochs. Actively select pairs where the current reward model is UNCERTAIN or where an ensemble disagrees, which is standard active learning and is well suited here because generating candidates is cheap and labelling is not. (5) DELIBERATELY COVER THE FAILURE MODES YOU FEAR. Include length-matched pairs so the model cannot use length as a shortcut. Include pairs where the longer answer is worse. Include degenerate outputs - repetition, padding, confident fabrication - scored low, because an optimizing policy will produce exactly these and the reward model has probably never seen them. This is constructing the data so the shortcut and the task DISAGREE, which is the same discipline as building an out-of-distribution evaluation. (6) MULTIPLE ANNOTATORS ON A SUBSET, so you can model annotator noise explicitly, weight examples by agreement, and detect systematic per-annotator bias rather than averaging it in. (7) CHECK WHO YOUR ANNOTATORS ARE. Preference data encodes the preferences of the people who produced it, including their expertise and their incentives. If they are paid per task, speed pressure shows up as a bias toward whatever is quick to judge - which is usually surface features, which is where length bias comes from. THE POINT I WOULD END ON. Every failure mode in this lesson - length bias, poor off-distribution behaviour, the accuracy ceiling - is a data property before it is a model property. The reward model faithfully learns what the labels encode, and the labels encode the question you asked and the incentives of whoever answered it."
          }
        },
        {
          "q": "How do you detect and prevent reward hacking in a production RLHF pipeline?",
          "a": "DETECTION, in the order I would build it. (1) TRACK PROXY AND NON-PROXY SIGNALS SEPARATELY, on the same axis. Reward-model score will rise; that tells you nothing. What you need beside it is at least one signal the policy is not optimizing: periodic human evaluation on a fixed prompt set, checkable-task accuracy, or a held-out reward model trained on different data. Divergence between the two curves is the definition of the failure, and if you only log the proxy you are structurally unable to see it. (2) PLOT AGAINST KL, not against steps. Overoptimization is parameterized by distance from the initial policy, so KL is the meaningful x-axis and it makes runs comparable across learning rates and batch sizes. (3) MONITOR THE SURFACE STATISTICS that are the usual hacks: mean output length, repetition rate, refusal rate, format-violation rate, the frequency of hedging phrases and of specific stock openings. Reward hacking is usually visible in these long before it is visible in an aggregate quality score, and they are nearly free to log. (4) READ SAMPLES, on a schedule, from the current policy. This is unglamorous and it catches things no metric names - a model that has learned to end every answer with a flattering question, or to restate the prompt at length. Every practitioner who has run RLHF has a story that starts with reading outputs. (5) SCORE DEGENERATE OUTPUTS with the reward model deliberately, as a canary: if repetitive padding starts scoring well, the reward model has drifted into a region where it is exploitable. PREVENTION. (1) THE KL PENALTY, chosen deliberately rather than inherited. It is the control on the axis along which the failure is parameterized, and choosing it is choosing where on the overoptimization curve to stop. This is the most important hyperparameter in the stack and it deserves a sweep with human evaluation at several points. (2) EARLY STOPPING on the non-proxy signal, which requires having built one. (3) REWARD ENSEMBLES with a pessimistic aggregate - minimum or mean-minus-variance - so the policy must find a point where every member errs upward. Partial help, since members trained on the same data share error modes, but cheap. (4) ITERATED PREFERENCE COLLECTION on current-policy outputs, retraining the reward model as the policy moves. This attacks the distribution-shift half of the mechanism and is what production pipelines actually do. (5) LENGTH CONTROL, explicitly - normalize reward by length, or include length-matched pairs in the preference data - given how reliably length is the hack that appears. (6) VERIFIABLE REWARDS WHEREVER POSSIBLE. If part of the objective can be checked rather than learned - tests pass, JSON parses, the arithmetic is right - that part cannot be hacked in the same way, and mixing verifiable and learned rewards limits the exposure. THE ORGANIZATIONAL POINT, which matters as much as the technical one. If the reward-model score is the number reported to leadership, it will become the target of the whole team and not merely the policy. Goodhart applies to the organization as well, and the countermeasure is the same: report the non-proxy signal in the same table, every time."
        },
        {
          "q": "What does it mean that the reward is identified only up to a per-prompt shift, and where does that bite?",
          "a": "THE FACT. The Bradley-Terry likelihood depends on the reward only through differences within a prompt: adding any function c(x) to every response's reward for prompt x leaves the loss exactly unchanged. So the fitted reward is determined only up to that shift, and nothing in training pins it down. What the model actually learns for the absolute level is arbitrary - whatever the optimization happened to land on, driven by initialization and regularization rather than by data. WHERE IT BITES. (1) CROSS-PROMPT COMPARISONS ARE MEANINGLESS. 'This response scored 3.2 and that one 1.8' says nothing if they are responses to different prompts. So you cannot rank prompts by difficulty using reward, cannot threshold reward globally to filter data, and cannot say a model is 'better on prompt A than prompt B'. People do all three routinely. (2) PPO NEEDS NORMALIZED REWARDS. If you feed raw rewards into the advantage computation, the per-prompt offset is a large, uninformative component of the signal. The value function will spend capacity modelling it - which is not wrong, since the baseline is supposed to absorb it, but it makes the value function's job harder and the advantage estimate noisier. Whitening rewards within a batch, or per prompt, removes the nuisance directly. Most reward-scale confusion in RLHF implementations traces to this. (3) REWARD SCALE INTERACTS WITH THE KL COEFFICIENT. The objective is reward minus beta times KL, so the meaning of beta depends on the reward's scale, which is arbitrary and can drift between reward-model training runs. A beta tuned for one reward model may be wildly wrong for its retrained successor even if the successor is better. Normalizing the reward makes beta transferable, and skipping that is a common source of 'the same hyperparameters stopped working'. (4) BEST-OF-N IS UNAFFECTED, which is a useful check on understanding: it compares responses to the SAME prompt, so the shift cancels exactly and none of this matters. That is one reason best-of-n is a more robust way to spend a reward model than RL. HOW TO HANDLE IT. Normalize per prompt where you can - subtract the mean reward over the sampled responses for that prompt, which is exactly what GRPO does as its core mechanism and one reason it is stable. Whiten within batch otherwise. If you genuinely need cross-prompt comparability, you have to add information the preference data does not contain: absolute ratings on a calibration set, or comparisons that deliberately span prompts, which annotators find much harder to make. THE WIDER LESSON. Identifiability is worth checking for any learned objective. Ask what transformations of the model's output leave the loss unchanged, because those are precisely the directions where the model's output carries no information - and any downstream use that reads those directions is reading noise with a confident-looking number attached."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Bradley-Terry preference model and loss",
        "back": "P(y_w > y_l | x) = sigma(r(x,y_w) - r(x,y_l)); loss = -E[log sigma(r_w - r_l)]. It is logistic regression on a difference of network outputs - all of logistic regression's properties transfer."
      },
      {
        "type": "intuition",
        "front": "Why preferences beat demonstrations",
        "back": "For open-ended tasks nobody can write the ideal answer, but anyone can compare two. And a comparison RANKS THE MODEL'S OWN OUTPUTS - the only kind of signal that can improve on them rather than reproduce a target."
      },
      {
        "type": "pitfall",
        "front": "Reward is identified only up to a per-prompt shift",
        "back": "r'(x,y) = r(x,y) + c(x) leaves the loss unchanged. So: no cross-prompt comparisons, whiten rewards before PPO, and beta in (reward - beta*KL) depends on an arbitrary scale. Best-of-n is unaffected - the shift cancels."
      },
      {
        "type": "pitfall",
        "front": "Reward-model overoptimization",
        "back": "Gao et al.: with a gold RM as ground truth, the PROXY score rises monotonically while the GOLD score rises, PEAKS, then declines - fitted against d = sqrt(KL from init). Goodhart's law with a functional form."
      },
      {
        "type": "intuition",
        "front": "Why a bigger reward model does not fix overoptimization",
        "back": "It moves the peak out; the shape is unchanged. The failure is not approximation error at a point - it is that an optimizer MAXIMIZES OVER the error, so it selects regions where the RM errs upward. Better proxy + harder optimization = same place."
      },
      {
        "type": "pitfall",
        "front": "Check length correlation before anything else",
        "back": "RMs routinely learn longer = better, and much of RLHF's apparent gain has been reproduced by optimizing for LENGTH ALONE (Singhal et al.). Report corr(reward, token_count) and accuracy on LENGTH-MATCHED pairs."
      },
      {
        "type": "intuition",
        "front": "70% RM accuracy is near the ceiling",
        "back": "Human annotators agree with each other only ~70-75% of the time. Where two humans disagree there is no fact to be right about. Judge against inter-annotator agreement, not against 100% - and measure it on YOUR data."
      },
      {
        "type": "pitfall",
        "front": "Batch all C(K,2) pairs from one prompt together",
        "back": "Treating pairs as independent examples makes each response appear in K-1 separate batches and the model OVERFITS (InstructGPT reports this). One forward pass per prompt encodes each response once - better AND (K-1)x cheaper."
      },
      {
        "type": "intuition",
        "front": "The proxy degrades fastest where it is pushed hardest",
        "back": "The RM is accurate on the SFT policy's distribution. An optimizing policy moves AWAY from that distribution by construction. So reward-model error grows exactly along the direction optimization travels - the two effects compound."
      },
      {
        "type": "definition",
        "front": "Accuracy by annotator-agreement level",
        "back": "The most informative RM diagnostic. A good RM is near-perfect where annotators were unanimous and near chance where they split. Uniform 68% across both means it averaged into a mediocre middle rather than modelling preference."
      },
      {
        "type": "intuition",
        "front": "Prefer K-way ranking to 1-5 ratings",
        "back": "Absolute ratings require a shared internal scale nobody has - they drift, anchor, and cluster at 3-4, and the noise is SYSTEMATIC per annotator. K-way ranking (K=4-9) keeps the comparative judgment humans do reliably and yields C(K,2) pairs per session."
      },
      {
        "type": "intuition",
        "front": "What actually bounds overoptimization",
        "back": "In order: the KL penalty (the control on the failure axis), early stopping on a NON-proxy signal, pessimistic RM ensembles, iterated preference collection on current-policy outputs, and verifiable rewards where the answer can be checked instead of learned."
      }
    ],
    "refs": [
      {
        "title": "Christiano et al. (2017), Deep Reinforcement Learning from Human Preferences",
        "url": "https://arxiv.org/abs/1706.03741"
      },
      {
        "title": "Gao, Schulman & Hilton (2022), Scaling Laws for Reward Model Overoptimization",
        "url": "https://arxiv.org/abs/2210.10760"
      },
      {
        "title": "Stiennon et al. (2020), Learning to Summarize from Human Feedback",
        "url": "https://arxiv.org/abs/2009.01325"
      },
      {
        "title": "Singhal et al. (2023), A Long Way to Go: Investigating Length Correlations in RLHF",
        "url": "https://arxiv.org/abs/2310.03716"
      },
      {
        "title": "Lambert et al. (2024), RewardBench: Evaluating Reward Models for Language Modeling",
        "url": "https://arxiv.org/abs/2403.13787"
      }
    ],
    "demos": [
      "reward-model",
      "roc",
      "calibration",
      "classification-metrics"
    ]
  },
  "dpo-grpo": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The RLHF stack is four models and two training loops: an SFT policy, a reward model, a value network, and a frozen reference, with PPO in the middle. DPO's observation is that most of that machinery is solving a problem that has a closed-form answer. The KL-regularized reward-maximization objective PPO approximates has a known optimum - the reference policy reweighted by the exponentiated reward - and that relation can be INVERTED to express the reward in terms of the policy. Substitute the inverted expression into the Bradley-Terry likelihood and the intractable partition function cancels, because it is a per-prompt constant and Bradley-Terry only ever sees differences within a prompt. What is left is a simple classification loss on the policy's own log-probability ratios. No reward model, no value network, no sampling loop.",
        "That cancellation is not a lucky algebraic accident - it is the identifiability fact from the previous lesson doing useful work. The reward was always defined only up to a per-prompt shift, so an objective built from within-prompt differences cannot depend on it, and the partition function is exactly such a shift. Recognizing that makes DPO feel inevitable rather than clever, and it also tells you where the method's assumptions live: everything DPO inherits from Bradley-Terry, it inherits completely.",
        "What DPO gives up is that the RL loop was ON-POLICY. PPO samples from the CURRENT policy, scores those samples, and updates - so the training distribution follows the policy wherever it goes. DPO trains on a FIXED preference dataset generated by some other policy, so as the policy moves away from that data its updates are increasingly extrapolations. The most-discussed symptom is that DPO frequently drives down the probability of BOTH the chosen and the rejected response: the loss only rewards the MARGIN between them, and widening the gap while lowering both is a perfectly good way to reduce it, with the displaced probability mass flowing to responses nobody labelled. Careful head-to-head studies have found PPO can outperform DPO, particularly where the preference data and the policy diverge. Name the proxy: DPO's proxy is the fixed preference dataset, and the implicit assumption is that it covers where the policy will end up. GRPO then attacks the problem from the other side - keep the on-policy loop, delete the value network, and compute advantages by normalizing rewards WITHIN a group of samples for the same prompt, which is the per-prompt shift-invariance turned into an algorithm."
      ],
      "math": [
        {
          "h": "The DPO derivation, in three steps",
          "paras": [
            "Step one: the KL-regularized objective has a closed-form optimum, obtainable by writing it as a KL to a Gibbs distribution. Step two: invert it to express the reward in terms of the optimal policy. Step three: substitute into Bradley-Terry, where the partition function cancels.",
            "The cancellation happens because log Z(x) is the same for both responses to a prompt and Bradley-Terry sees only their difference - which is precisely the per-prompt shift-invariance of the reward."
          ],
          "tex": "\\pi^{*}(y\\mid x) = \\tfrac{1}{Z(x)}\\,\\pi_{\\text{ref}}(y\\mid x)\\,e^{r(x,y)/\\beta} \\;\\Longrightarrow\\; r(x,y) = \\beta \\log \\frac{\\pi^{*}(y\\mid x)}{\\pi_{\\text{ref}}(y\\mid x)} + \\beta \\log Z(x) \\\\[6pt] r(x,y_w) - r(x,y_l) = \\beta \\log \\frac{\\pi(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w\\mid x)} - \\beta \\log \\frac{\\pi(y_l\\mid x)}{\\pi_{\\text{ref}}(y_l\\mid x)}",
          "texNote": "Z(x) is intractable - a sum over all sequences - and it is exactly what made this approach look impossible before. It disappears in the second line because it does not depend on y. The title of the paper is the punchline: the language model was always secretly a reward model, with the implicit reward being beta times the log-ratio against the reference."
        },
        {
          "h": "The DPO loss, and what its gradient actually does",
          "paras": [
            "Substituting into the Bradley-Terry loss gives a binary classification objective on the policy's own log-ratios. The gradient weight is the most informative part: it is large exactly when the implicit reward model currently gets the pair WRONG.",
            "And notice what the objective does NOT contain: any term pinning down the absolute probability of either response. Only the margin appears."
          ],
          "tex": "\\mathcal{L}_{\\text{DPO}} = -\\,\\mathbb{E}\\Big[\\log \\sigma\\big(\\hat{r}_w - \\hat{r}_l\\big)\\Big], \\qquad \\hat{r}_y = \\beta \\log \\tfrac{\\pi_\\theta(y\\mid x)}{\\pi_{\\text{ref}}(y\\mid x)} \\\\[6pt] \\nabla_\\theta \\mathcal{L} = -\\beta\\, \\underbrace{\\sigma(\\hat{r}_l - \\hat{r}_w)}_{\\text{weight: high when wrong}} \\Big[\\nabla \\log \\pi_\\theta(y_w) - \\nabla \\log \\pi_\\theta(y_l)\\Big]",
          "texNote": "The bracket raises the winner and lowers the loser; the weight is a self-correcting learning rate that vanishes on pairs already classified confidently. But since only the DIFFERENCE is optimized, lowering BOTH log-probabilities while widening the gap satisfies the objective perfectly - which is the mechanism behind the observed decrease in chosen-response probability, with the freed mass going to sequences the dataset never mentioned."
        },
        {
          "h": "GRPO: delete the critic, normalize within the group",
          "paras": [
            "PPO needs a value network to compute advantages, and that network is another model of comparable size to train and hold in memory. GRPO replaces it by sampling a GROUP of G responses per prompt and using the group's own statistics as the baseline.",
            "This is legitimate because the baseline in policy-gradient methods may be any function of the state alone, and the group mean for a prompt is exactly that - so the estimator stays unbiased while the variance reduction comes for free."
          ],
          "tex": "A_i = \\frac{r_i - \\operatorname{mean}(r_1,\\ldots,r_G)}{\\operatorname{std}(r_1,\\ldots,r_G)}, \\qquad \\mathcal{J} = \\mathbb{E}\\Big[\\min\\big(\\rho_i A_i,\\; \\operatorname{clip}(\\rho_i, 1\\pm\\epsilon) A_i\\big)\\Big] - \\beta\\,\\mathrm{KL}",
          "texNote": "The per-prompt normalization is the reward's arbitrary shift being removed by construction rather than by a learned value function - which is why GRPO is stable without a critic. rho is the usual importance ratio. The saving is large: no value model to train, roughly a whole model's worth of memory and compute freed, which is what made large-scale RL on reasoning practical."
        }
      ],
      "code": [
        {
          "h": "DPO in twenty lines, and the two things that go wrong",
          "paras": [
            "The implementation is short. The reference model is the part people get wrong - it must be the SFT checkpoint you started from, frozen, and it must be the same model the preference data was generated against if you want the off-policy assumption to hold even approximately."
          ],
          "code": "def dpo_loss(policy, ref, x, y_w, y_l, beta=0.1):\n    # sum of token log-probs of the RESPONSE only (mask the prompt, as in SFT)\n    lp_w,  lp_l  = seq_logprob(policy, x, y_w), seq_logprob(policy, x, y_l)\n    with torch.no_grad():\n        rp_w, rp_l = seq_logprob(ref, x, y_w), seq_logprob(ref, x, y_l)\n\n    r_w = beta * (lp_w - rp_w)          # implicit reward of the winner\n    r_l = beta * (lp_l - rp_l)          # implicit reward of the loser\n    loss = -F.logsigmoid(r_w - r_l).mean()\n\n    # LOG THESE. They are the diagnostic that catches DPO's failure mode:\n    #   margin  = (r_w - r_l).mean()          -> should rise (it always does)\n    #   chosen  = (lp_w - rp_w).mean()        -> should NOT collapse\n    #   rejected= (lp_l - rp_l).mean()        -> falls, as intended\n    return loss\n\n# FAILURE MODE: the loss only optimizes the MARGIN. Driving BOTH log-probs\n# down while widening the gap satisfies it perfectly, and the freed\n# probability mass goes to sequences no annotator ever saw. If `chosen` is\n# falling alongside `rejected`, the model is not learning to prefer the good\n# response - it is learning to avoid the labelled region entirely.\n#\n# TWO SETUP ERRORS THAT LOOK LIKE MODEL FAILURE:\n#   1. ref != the SFT checkpoint you initialized the policy from. Then the\n#      implicit reward is measured against the wrong baseline at step 0.\n#   2. Skipping SFT on the preference data's distribution first. DPO assumes\n#      the reference already assigns reasonable mass to the chosen responses;\n#      if it does not, the ratios start extreme and training is unstable.",
          "caption": "Log the chosen and rejected implicit rewards separately, not just the margin. The margin always rises - that is what the loss optimizes - and it is fully compatible with the chosen response's probability collapsing, which is the failure everyone hits."
        },
        {
          "h": "GRPO with a verifiable reward",
          "paras": [
            "The loop that made large-scale reasoning RL practical. Two changes from PPO: no value network, and - where the domain allows it - no learned reward model either, because the answer can simply be checked."
          ],
          "code": "for prompt, answer in dataset:\n    # 1. SAMPLE A GROUP from the CURRENT policy (this is on-policy)\n    outs = [policy.generate(prompt) for _ in range(G)]        # G = 8..64\n\n    # 2. SCORE. If the task is checkable, there is no proxy to hack:\n    r = [1.0 if extract(o) == answer else 0.0 for o in outs]  # verifiable\n    #   ... or r = [reward_model(prompt, o) for o in outs]     # learned proxy\n\n    # 3. ADVANTAGE = group normalization. No critic, no value loss.\n    A = (torch.tensor(r) - mean(r)) / (std(r) + 1e-4)\n\n    # 4. Clipped policy-gradient step with a KL term to the reference.\n    update(policy, outs, A, clip=0.2, kl_beta=0.04)\n\n# WHY THIS IS SOUND: a policy-gradient baseline may be ANY function of the\n# state alone. The group mean for a prompt is exactly that, so the estimator\n# stays unbiased - and it removes the reward's arbitrary per-prompt shift by\n# construction rather than by asking a value network to learn it.\n#\n# WHAT VERIFIABLE REWARDS CHANGE. The overoptimization curve from 13-07 was\n# a property of a LEARNED proxy: the optimizer finds regions where the reward\n# model errs upward. A checker has no such regions - it is correct by\n# definition. That is why RL on maths and code scaled so much more cleanly\n# than RL on open-ended preference.\n#\n# WHAT IT DOES NOT FIX. The reward is still a specification. Models learn to\n# produce the right final answer with degenerate reasoning, to exploit test\n# suites, or to drift in style and language - hacking the SPEC rather than\n# the model of the spec. Verifiability narrows the attack surface; it does\n# not remove it.",
          "caption": "Two deletions from PPO: the value network (replaced by group normalization) and, where the task is checkable, the reward model itself. The second is what changes the overoptimization story - a checker has no regions where it errs upward for an optimizer to find."
        }
      ],
      "useCases": [
        "Preference alignment on a fixed, already-collected dataset, which is DPO's natural home: one training loop, no sampling, no reward model, and a cost close to SFT - which is why it became the default for open-model post-training.",
        "Reasoning RL with verifiable rewards - mathematics, code against tests, structured extraction - where GRPO's on-policy loop plus a checker removes both the value network and the learned proxy, and is the recipe behind the strongest open reasoning models.",
        "Iterated alignment: generate on-policy responses, have them ranked, run DPO on the fresh pairs, repeat. This recovers much of what on-policy RL provides while keeping DPO's simple loop, and it directly attacks the off-policy distribution-shift problem.",
        "Settings with unpaired feedback - a thumbs-up/thumbs-down stream rather than curated comparisons - where KTO's prospect-theoretic objective learns from individual desirable and undesirable examples without needing matched pairs at all."
      ],
      "pitfalls": [
        "Logging only the margin. It always rises, because it is what the loss optimizes, and it is entirely compatible with the CHOSEN response's probability collapsing. Log the chosen and rejected implicit rewards separately - if both fall, the model is fleeing the labelled region rather than learning to prefer within it.",
        "Assuming DPO strictly dominates PPO because it is simpler. Careful head-to-head studies find PPO can outperform it, particularly where the preference data and the policy have diverged - which is the off-policy assumption failing, and it is not visible from inside the DPO loop.",
        "Using the wrong reference model. It must be the SFT checkpoint the policy was initialized from and it must be frozen. A mismatched reference means the implicit reward is measured against the wrong baseline from step 0, and the symptom is instability rather than an error.",
        "Skipping SFT on the preference data's distribution first. DPO assumes the reference already assigns reasonable probability to the chosen responses; when it does not, the log-ratios start extreme and training is unstable in a way that looks like a bad learning rate.",
        "Treating beta as a minor hyperparameter. It is the KL strength - the same control that sets where you stop on the overoptimization curve - and it is the most consequential knob in the method. Too small and the policy drifts far from the reference; too large and nothing moves.",
        "Overfitting to deterministic preferences. When the preference data is near-deterministic, Bradley-Terry's optimum drives the margin unboundedly and DPO can push the reference ratio to extremes. This is the failure IPO was designed to fix by bounding the objective rather than maximizing the margin.",
        "Believing verifiable rewards eliminate reward hacking. They eliminate proxy-model exploitation, not specification gaming. Models still learn to reach correct answers by degenerate routes, exploit weak test suites, or drift in language and format - hacking the spec rather than a model of the spec."
      ],
      "connections": [
        {
          "ref": "fine-tuning/reward-modeling",
          "text": "The partition function cancels in the DPO derivation for exactly the reason reward is identified only up to a per-prompt shift - the same fact, appearing once as a caveat and once as the step that makes a method possible."
        },
        {
          "ref": "fine-tuning/rlhf-ppo",
          "text": "The method DPO replaces and GRPO simplifies. The KL-regularized objective PPO optimizes numerically is the same one DPO solves in closed form, so beta in DPO and the KL coefficient in PPO are the same knob wearing different clothes."
        },
        {
          "ref": "reinforcement-learning/policy-gradient",
          "text": "GRPO's group-mean baseline is the standard variance-reduction result: any function of the state alone leaves the gradient estimator unbiased. The group mean for a prompt is such a function, which is why deleting the critic costs nothing in correctness."
        },
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "DPO is preference learning done offline, and it inherits offline RL's central difficulty: the data was generated by a different policy, so updates in regions the data does not cover are extrapolations. The both-probabilities-fall phenomenon is that difficulty surfacing."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "The move to verifiable rewards is the most consequential recent change in how alignment is done, and it narrows rather than closes the specification problem - which is the distinction that lesson is about."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is DPO in one sentence?",
          "a": "Rewrite the RLHF objective so the reward is expressed through the policy's own log-ratio against a frozen reference, turning preference optimization into a simple classification loss with no reward model and no RL loop."
        },
        {
          "q": "What is the closed-form optimum of the KL-regularized objective?",
          "a": "pi*(y|x) proportional to pi_ref(y|x) * exp(r(x,y)/beta) - the reference policy reweighted by the exponentiated reward."
        },
        {
          "q": "Why does the partition function cancel?",
          "a": "Z(x) does not depend on y, so it is the same for both responses to a prompt, and Bradley-Terry sees only their difference. It is the reward's per-prompt shift-invariance."
        },
        {
          "q": "What is DPO's implicit reward?",
          "a": "beta times the log-ratio of the policy to the reference for that response. The language model is secretly a reward model - which is the paper's title."
        },
        {
          "q": "What does the DPO gradient weight do?",
          "a": "It is sigmoid(r_lose - r_win), so it is large exactly when the implicit reward model currently gets the pair wrong and vanishes on pairs already classified confidently."
        },
        {
          "q": "What is DPO's most-discussed failure mode?",
          "a": "The probability of BOTH the chosen and rejected responses can fall. The loss optimizes only the margin, so widening the gap while lowering both satisfies it, and the mass flows to unlabelled sequences."
        },
        {
          "q": "Why is DPO off-policy and why does that matter?",
          "a": "It trains on a fixed preference set generated by some other policy, whereas PPO samples from the current one. As the policy moves away from that data, its updates become extrapolations."
        },
        {
          "q": "What is beta in DPO?",
          "a": "The KL strength against the reference - the same control as PPO's KL coefficient, and the most consequential hyperparameter in the method."
        },
        {
          "q": "What is GRPO?",
          "a": "Group Relative Policy Optimization: sample G responses per prompt, use the group's mean and standard deviation to compute advantages, and drop the value network entirely."
        },
        {
          "q": "Why is the group baseline valid?",
          "a": "A policy-gradient baseline may be any function of the state alone, and the group mean for a prompt is exactly that - so the estimator stays unbiased while variance falls."
        },
        {
          "q": "What is IPO fixing?",
          "a": "DPO's tendency to overfit near-deterministic preferences by driving the margin unboundedly. IPO bounds the objective instead of maximizing the margin."
        },
        {
          "q": "What is KTO?",
          "a": "A prospect-theory-based objective that learns from unpaired binary desirable/undesirable labels rather than matched preference pairs - useful when feedback is a thumbs-up stream."
        }
      ],
      "standard": [
        {
          "q": "What is the reference model doing in DPO, and what happens if you remove it?",
          "a": "WHAT IT DOES. The reference is the frozen SFT checkpoint the policy was initialized from, and it appears in the implicit reward: r_hat(y) = beta * log(pi(y)/pi_ref(y)). It plays three distinct roles that are worth separating. (1) IT IS THE KL ANCHOR. The whole derivation starts from a KL-regularized objective, and the reference is what the KL is measured against. Without it there is no closed form and no DPO. (2) IT NORMALIZES FOR THE LANGUAGE PRIOR. A fluent, common response has high probability under any language model; a rare one has low probability. Using raw log pi(y) as the reward would score responses largely by how ordinary they are. Dividing by the reference cancels that, so the implicit reward measures how much MORE probable this response is under the policy than under the base - which is the quantity that actually reflects learning. (3) IT DEFINES THE ZERO POINT. At initialization pi = pi_ref, so every implicit reward is exactly zero and every pair is at the decision boundary. That is a well-conditioned place to start, and it is why using a mismatched reference is destabilizing: the implicit rewards start at some arbitrary nonzero value and the early gradients are correspondingly arbitrary. WHAT REMOVING IT COSTS - and this is an active design space, not a hypothetical. Reference-free methods exist and they must replace role (2) with something, because the language-prior confound does not go away. SimPO drops the reference and uses the LENGTH-NORMALIZED average log-probability instead, plus a target margin - the length normalization is doing the job the reference division did, since sequence log-probability scales with length. ORPO drops it differently: it combines an SFT term with an ODDS-RATIO preference term in a single stage, so there is no separate reference because there is no separate SFT checkpoint - alignment and instruction tuning happen at once. WHAT YOU GAIN BY DROPPING IT. Memory and compute: the reference is a full model that must be resident and forward-passed on every batch, so removing it is close to halving the memory footprint of DPO training. And it removes a whole class of setup errors, since a mismatched or unfrozen reference is one of the most common ways DPO runs go wrong. WHAT YOU GIVE UP. The principled derivation. DPO's reference term comes out of the KL-regularized objective; reference-free objectives are constructed to behave well rather than derived, and their implicit regularization is whatever the surrogate provides. In practice that means their behaviour under heavy optimization is less predictable - you no longer have beta as a clean control on distance travelled. MY POSITION. Keep the reference unless memory is genuinely binding, because it is the thing that ties the method to an objective you can reason about. If I do drop it, I would be more careful about early stopping and about monitoring drift, since I have given up the knob that bounds it."
        },
        {
          "q": "Derive DPO from the RLHF objective and explain what it buys and what it costs.",
          "a": "THE STARTING POINT. RLHF maximizes expected reward minus beta times the KL divergence from a reference policy. That objective has a CLOSED-FORM optimum: rewrite it as a KL divergence to a Gibbs distribution and the minimizer is pi*(y|x) proportional to pi_ref(y|x) times exp(r(x,y)/beta), normalized by a partition function Z(x). Z(x) is a sum over all possible sequences, so it is intractable, and that intractability is why everyone assumed you had to solve this numerically with PPO. THE INVERSION. Take logs and rearrange for the reward: r(x,y) = beta * log(pi*(y|x)/pi_ref(y|x)) + beta * log Z(x). So ANY policy implicitly defines a reward function. The optimal policy for a reward is the reference reweighted by it, and this relation runs both ways. THE CANCELLATION. Substitute into the Bradley-Terry likelihood, which depends only on the DIFFERENCE of the two responses' rewards for the same prompt. Z(x) does not depend on y, so it appears in both terms identically and cancels. What remains is a loss over policy log-ratios only: -log sigmoid(beta*log(pi(y_w)/pi_ref(y_w)) - beta*log(pi(y_l)/pi_ref(y_l))). I would emphasize that this cancellation is the SAME FACT as the reward being identified only up to a per-prompt shift - it appears in reward modelling as a caveat and here as the step that makes the method exist. WHAT IT BUYS. You delete the reward model, the value network, and the sampling loop. Training cost drops to roughly SFT plus a frozen reference forward pass. There is no reward-model overoptimization in the Gao sense, because there is no separately-trained proxy for a policy to exploit. Implementation is twenty lines, and it is stable enough that it became the default for open-model post-training almost immediately. WHAT IT COSTS. The RL loop was ON-POLICY: PPO samples from the current policy, so the training distribution follows it. DPO trains on a FIXED dataset generated by some other policy, so as the policy moves, its updates in uncovered regions are extrapolations - this is offline RL's central difficulty, arriving here. The visible symptom is that the probability of BOTH the chosen and rejected responses often falls: the loss rewards only the MARGIN, and lowering both while widening the gap is a perfectly good solution, with the freed mass going to sequences nobody labelled. Head-to-head studies find PPO can beat DPO, particularly where preference data and policy have diverged. And DPO inherits every Bradley-Terry assumption completely, including the pathology that near-deterministic preferences drive the margin without bound - which is what IPO exists to fix. THE PRACTICAL SUMMARY. DPO is the right default when you have a fixed preference set and want a result quickly. If quality matters at the margin, the fix is not choosing PPO over DPO but making DPO less off-policy: generate on-policy responses, rank them, run DPO on the fresh pairs, iterate.",
          "deepDive": {
            "q": "Why do both chosen and rejected probabilities fall, and what would you do about it?",
            "a": "THE MECHANISM. The objective is -log sigmoid(r_w - r_l) where each implicit reward is beta times a log-ratio. Nothing in it constrains the ABSOLUTE level of either. The gradient raises log pi(y_w) and lowers log pi(y_l), but log-probabilities are coupled by normalization - the distribution must sum to one over all sequences - so pushing one down pushes mass somewhere. There is no term saying it must go to the chosen response. In practice the easiest descent direction is frequently to lower BOTH labelled responses and widen the gap between them, moving the displaced mass onto sequences the dataset never mentions, about which the objective is completely silent. WHY THE EASIEST DIRECTION IS THE BAD ONE. The chosen response is a specific sequence with meaningful probability under the reference. Raising it means concentrating mass on that exact string, which fights the language-modelling prior. Lowering the rejected response is easy - it is one string among astronomically many. So the optimizer finds it cheaper to suppress the rejected region than to promote the chosen one, and the margin grows from below. The effect is amplified when chosen and rejected are SIMILAR, since a gradient that lowers the rejected sequence lowers everything resembling it, including the winner. WHY IT MATTERS. A model whose probability mass has fled the labelled region generates from a distribution nobody evaluated. It can degrade in ways preference data cannot describe - degeneration, repetition, drifting into an unusual register - while the training margin looks excellent throughout. THE DIAGNOSTIC, which is one line. Log the chosen and rejected implicit rewards SEPARATELY, not just the margin. The margin always rises; that is what the loss does. If the chosen curve falls alongside the rejected one, you have this failure, and it is visible from the first few hundred steps. THE FIXES, roughly by how much they help. (1) ADD AN SFT TERM on the chosen responses - a small negative-log-likelihood term anchoring their absolute probability. This directly supplies what the objective lacks and is what several later methods incorporate; ORPO folds SFT and preference into one objective for exactly this reason. (2) RAISE BETA. Larger beta means a stronger KL tether, so the policy cannot travel as far from the reference and the drift is bounded. It is the same control as in the overoptimization curve. (3) GO ON-POLICY. Generate responses from the CURRENT policy, get them ranked, and run DPO on those - iterative DPO. If the data covers where the policy is, extrapolation is not required. This is the most principled fix because it treats the cause. (4) IPO, which bounds the objective instead of maximizing an unbounded margin, removing the incentive to keep separating once the preference is satisfied. (5) LENGTH NORMALIZATION, as SimPO does, since sequence log-probabilities scale with length and unnormalized ratios interact badly with length differences between chosen and rejected. THE GENERAL LESSON. When an objective depends only on a difference, ask what happens to the level - because the optimizer will exploit any direction the loss does not constrain, and the unconstrained direction is where the surprises live."
          }
        },
        {
          "q": "Explain GRPO and why it enabled large-scale reasoning RL.",
          "a": "WHAT IT CHANGES. PPO computes advantages using a learned value function - a second network of comparable size that must be trained alongside the policy, held in memory, and kept stable. GRPO deletes it. For each prompt, sample a GROUP of G responses from the current policy, score them, and compute each response's advantage by normalizing its reward against the group's own mean and standard deviation. Then take the usual clipped policy-gradient step with a KL term to the reference. WHY IT IS CORRECT. The baseline in a policy-gradient estimator may be any function of the STATE alone - subtracting it leaves the gradient unbiased because the expectation of the score function is zero. The mean reward over samples for a given prompt is exactly such a function. So the critic was never conceptually necessary; it was one way to estimate a baseline, and sampling a group is another, with the estimate coming from the same distribution you are updating on. I would also point out that the per-prompt normalization removes the reward's arbitrary per-prompt shift BY CONSTRUCTION - the thing a value function otherwise has to spend capacity learning - which is why the method is stable without a critic rather than merely cheaper. WHY IT MATTERED PRACTICALLY. Three things. (1) MEMORY AND COMPUTE. The value network is roughly another model. Removing it frees a large fraction of the training budget, which at frontier scale is the difference between an affordable experiment and an impossible one. (2) NO VALUE-FUNCTION INSTABILITY. Much of the difficulty in getting PPO to work on language models is the critic: value loss scaling, initialization, the fact that predicting the return of a long text generation is genuinely hard. Deleting a hard-to-train component removes a whole class of failures. (3) IT COMPOSES WITH VERIFIABLE REWARDS. Where the answer can be checked - mathematics, code against tests - the reward model disappears too. Now the loop is: sample a group, check them, normalize, update. No critic, no reward model, no human in the loop at training time. THE DEEPER SIGNIFICANCE, which is the part worth saying. The overoptimization curve from reward modelling was a property of a LEARNED proxy: the optimizer searches for regions where the reward model errs upward, and finds them. A checker has no such regions - it is correct by construction. So the single most reliable failure mode of RLHF simply does not apply, and you can optimize much harder for much longer. That is the actual reason reasoning RL scaled when preference RL plateaued, and it explains why the field moved toward verifiable domains rather than toward better reward models. WHAT IT DOES NOT FIX. The reward is still a specification. Models learn to reach correct answers by degenerate routes, to exploit weak test suites, to drift in language or format because nothing penalizes it. Verifiability narrows the attack surface; it does not close it, and the failures that remain are specification failures rather than proxy failures."
        },
        {
          "q": "How would you choose between DPO, PPO, and GRPO for a project?",
          "a": "THE FIRST QUESTION, which decides most of it: IS MY REWARD CHECKABLE? If the task has a verifiable answer - mathematics, code with tests, structured extraction, anything with a programmatic checker - then GRPO with a verifiable reward, without hesitation. No reward model to overoptimize, no critic to stabilize, and the optimization can run far harder than preference-based RL safely can. This is the strongest recipe currently available and the reason to prefer it is not a marginal quality gain, it is that the dominant failure mode is absent. SECOND QUESTION: DO I HAVE A FIXED PREFERENCE DATASET AND A TIGHT BUDGET? Then DPO. One loop, no sampling, no reward model, cost close to SFT, twenty lines of code. It became the open-model default for good reasons and it is the right starting point for almost any preference-alignment project. I would run it with beta swept properly and with the chosen and rejected implicit rewards logged separately from step one. THIRD QUESTION: CAN I AFFORD ON-POLICY SAMPLING, AND DOES QUALITY MATTER AT THE MARGIN? Then the answer is somewhere between iterated DPO and PPO. Iterated DPO - generate on-policy, rank, train, repeat - recovers much of the on-policy benefit at a fraction of PPO's complexity, and it directly addresses DPO's actual weakness rather than replacing the method wholesale. Full PPO with a reward model is worth it when you have the infrastructure and the evaluation to manage overoptimization, and head-to-head studies do find it can win. But it is four models and two loops, and most teams underestimate how much of the difficulty is operational rather than algorithmic. FOURTH: WHAT SHAPE IS MY FEEDBACK? If it is unpaired - thumbs up and down on individual responses rather than curated comparisons - KTO learns from that directly without forcing me to manufacture pairs. If preferences are near-deterministic and I see the margin exploding, IPO's bounded objective is the targeted fix. If I want to skip the reference model entirely and fold SFT and alignment into one stage, ORPO does that. THE ORDER I WOULD ACTUALLY WORK IN. SFT first, always - every one of these needs a policy that already produces plausible responses. Then DPO as the baseline, because it is cheap and it establishes what preference data buys me. Then, only if the evaluation says it is worth it, iterated DPO or full RL. And throughout, the same discipline as the rest of this module: whatever I optimize, I need a signal I am NOT optimizing to tell me when it stopped helping. THE THING I WOULD WARN ABOUT. The literature reads as a succession of methods each superseding the last, and it is not that. These occupy different points on a trade between simplicity, on-policy-ness, and what kind of feedback they consume. The method that dominates on a benchmark in one paper frequently loses in another with different data, which is itself the evidence that the choice is contextual.",
          "deepDive": {
            "q": "Verifiable rewards remove reward-model overoptimization. What failure modes remain?",
            "a": "The learned-proxy failure is genuinely gone: there is no model with regions of upward error for an optimizer to find. What remains is SPECIFICATION gaming, and it is a different shape. (1) THE CHECKER IS NOT THE GOAL. A test suite is a proxy for correct code; an exact-match answer is a proxy for correct reasoning. Models learn to satisfy the checker by routes the checker does not examine - passing tests by special-casing their inputs, producing the right final number after reasoning that does not support it, exploiting a lenient answer-extraction regex. The reward is correct about what it measures and it does not measure everything you wanted. (2) UNCONSTRAINED DIMENSIONS DRIFT. Nothing in a correctness reward penalizes length, language, readability, or format, so those drift freely under optimization pressure. The widely reported behaviours here are real: reasoning traces growing enormously, and language mixing when nothing rewards staying in one language. The general rule is that any dimension your reward is silent on will be sacrificed, because there is always some gain available from doing so. (3) DISTRIBUTION NARROWING. Heavy RL on a verifiable domain concentrates the policy on the strategies that pass. Output diversity falls, which shows up as pass-at-k degrading even while pass-at-1 improves - the model has become better at its single best attempt and worse at having many attempts. That is a real loss for anything using sampling, and it is invisible if you only measure greedy accuracy. (4) CAPABILITY REGRESSION ELSEWHERE. It is still fine-tuning, so the forgetting question from the start of this module applies unchanged: heavy optimization on mathematics can degrade instruction-following, safety behaviour, and general conversation. The capability suite is not optional here either. (5) THE VERIFIER ITSELF CAN BE ATTACKED. If the checker is software, it has bugs, and the optimizer is a search process pointed at it. Anything from exploiting floating-point comparison to finding malformed outputs the parser accepts. This is the classic specification-gaming literature arriving in a new setting. (6) THE DOMAIN BOUNDARY. Only some tasks are checkable. Optimizing hard on those shifts the model's overall behaviour toward them, and it does not follow that the gains generalize to the uncheckable majority of what the model does. WHAT I WOULD DO ABOUT IT. Keep the KL penalty even with a verifiable reward - it bounds drift on all the dimensions the reward is silent about, which is most of them. Add explicit penalties or constraints for the dimensions you care about - length, language consistency, format. Monitor pass-at-k alongside pass-at-1 to catch diversity collapse. Run the capability suite. And read samples, because degenerate-but-correct reasoning is obvious to a human and invisible to every metric. THE SUMMARY. Verifiable rewards convert a problem you cannot bound - a learned proxy with unknown error regions - into a problem you can enumerate: a specification with known gaps. That is a large improvement and it is not the end of the story, and the honest way to describe the shift is that the failures became legible rather than that they disappeared."
          }
        },
        {
          "q": "Your DPO run has a rising margin but the model got worse. What happened?",
          "a": "The margin rising means nothing - it is what the loss optimizes, and it can rise in several ways, most of which are bad. I would work through them in order. FIRST HYPOTHESIS: BOTH PROBABILITIES FELL. Log the chosen and rejected implicit rewards separately. If the chosen curve is falling alongside the rejected one, the model has widened the gap by suppressing both and the displaced probability mass has gone to sequences nobody labelled. The model is now generating from a distribution the preference data never described, which can degrade in any direction while the margin looks excellent. This is the most common cause and it is visible in one plot. SECOND: THE POLICY DRIFTED TOO FAR. Beta is the KL strength, the same control as in the overoptimization curve. If it is too small, the policy travels far from the reference and everything the reference was doing correctly is up for renegotiation. Check the actual KL to the reference over training - not just the loss - and compare it to where quality peaked. Fix: raise beta, or stop earlier. THIRD: OFF-POLICY SHIFT. The preference data was generated by some other policy. As my policy moves, the updates apply gradients computed on responses my model would no longer produce, which is extrapolation. The symptom is that the run looks fine early and degrades later. Fix: iterated DPO - generate on-policy, get fresh rankings, retrain. FOURTH: OVERFITTING TO NEAR-DETERMINISTIC PREFERENCES. If the preference labels are nearly always in one direction for similar pairs, Bradley-Terry's optimum drives the margin unboundedly and the policy pushes the log-ratio to extremes. Diagnostic: look at the distribution of implicit rewards - if they are enormous, this is it. Fix: IPO, which bounds the objective, or fewer epochs. DPO overfits quickly; one to two epochs is often correct and three is often too many. FIFTH: A LENGTH ARTEFACT. Sequence log-probabilities scale with length, so if chosen and rejected differ systematically in length the ratio is partly measuring that. Check the length difference distribution in the training pairs and the model's output length before and after. Fix: length-normalized variants, or length-matched data. SIXTH, AND CHECK IT EARLY BECAUSE IT IS FREE: SETUP ERRORS. Is the reference the exact SFT checkpoint the policy started from, and is it frozen? Was the prompt masked out of the sequence log-probability? Was SFT run on this distribution first? Each of these produces instability that looks like a modelling failure. HOW I WOULD PRIORITIZE. Plot chosen and rejected separately and plot KL to the reference. Those two charts identify the first two hypotheses in a minute, and they account for most cases. THE GENERAL POINT, which is this module's spine at the level of a training curve: I was monitoring the quantity being optimized. It went up, exactly as designed. To know whether the model improved I needed a signal that was not the objective - held-out generation quality, a capability suite, actual samples read by a person - and the absence of that signal is why the run got this far before anyone noticed."
        },
        {
          "q": "What does DPO's existence tell you about RLHF conceptually?",
          "a": "Several things, and they are more interesting than the method itself. FIRST: THE RL WAS NEVER ESSENTIAL. The RLHF objective is not a sequential decision problem in any deep sense - it is a KL-regularized reward maximization over a single output, and it has a closed-form solution. PPO was solving numerically something that could be solved analytically, once you noticed that the intractable partition function is a per-prompt constant and the preference likelihood only sees within-prompt differences. That reframes a lot of the apparatus - the value network, the rollouts, the clipping - as machinery for a numerical method rather than as anything conceptually necessary. SECOND: EVERY POLICY IS A REWARD MODEL. The inversion r = beta*log(pi/pi_ref) is not a trick, it is a bijection between policies and reward functions under this objective. That means the separation between 'the reward model' and 'the policy' was a modelling choice, not a fact about the problem. It also means you can EXTRACT an implicit reward from any aligned model by comparing it against its reference, which is a genuinely useful capability - you can rank responses with a policy you never trained as a reward model. THIRD: THE KL TERM IS THE OBJECTIVE, NOT A REGULARIZER. It is usually introduced as a stability hack to stop the policy collapsing. But it is what makes the closed form exist, it is the axis along which overoptimization is parameterized in Gao et al.'s measurement, and it is beta in DPO. Reward maximization without it is not a weaker version of the same thing - it is a different and ill-posed problem, whose solution puts all mass on the single highest-reward sequence. FOURTH, AND MOST IMPORTANTLY: THE HARD PART WAS NEVER THE OPTIMIZATION. DPO removed most of RLHF's algorithmic complexity and did not remove its difficulty, because the difficulty was always the preference data and the evaluation. What responses do you compare, who ranks them, against what criteria, and how do you know the result is better - none of that changed. The field spent years on the optimizer and the binding constraints turned out to be measurement constraints. That is this module's thesis stated at the level of a research programme. FIFTH, THE CAVEAT THAT KEEPS IT HONEST. DPO's simplification cost the on-policy loop, and that cost is real - PPO can outperform it where the data and policy diverge, and the both-probabilities-fall phenomenon is a direct consequence. So the closed form solves the objective exactly and the objective was an approximation of what you wanted, which is the same category of error the module keeps documenting. And the field's subsequent move - GRPO with verifiable rewards - went back toward on-policy RL while deleting a different component, which suggests the right reading is that these are trades rather than a progression."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The DPO derivation in one line",
        "back": "pi*(y|x) ~ pi_ref(y|x)e^{r/beta}  =>  r = beta*log(pi*/pi_ref) + beta*log Z(x). Substitute into Bradley-Terry: Z(x) CANCELS because it does not depend on y. Loss = -log sigma(beta*log(pi_w/pi_ref_w) - beta*log(pi_l/pi_ref_l))."
      },
      {
        "type": "intuition",
        "front": "Why the partition function cancels",
        "back": "It is the SAME FACT as reward being identified only up to a per-prompt shift (13-07). Z(x) does not depend on y, and Bradley-Terry sees only within-prompt differences. The caveat in one lesson is the enabling step in the next."
      },
      {
        "type": "pitfall",
        "front": "DPO drives BOTH probabilities down",
        "back": "The loss optimizes only the MARGIN, so widening the gap while lowering both satisfies it - and the freed mass goes to unlabelled sequences. Log chosen and rejected implicit rewards SEPARATELY; the margin always rises and tells you nothing."
      },
      {
        "type": "intuition",
        "front": "Why the chosen response is the one that falls",
        "back": "Raising a specific sequence's probability fights the LM prior and concentrates mass on one exact string; lowering the rejected one is easy since it is one string among astronomically many. So the optimizer grows the margin from below. Worse when chosen and rejected are similar."
      },
      {
        "type": "formula",
        "front": "GRPO advantage",
        "back": "A_i = (r_i - mean(r_1..r_G)) / std(r_1..r_G) over G samples for the SAME prompt. Valid because a policy-gradient baseline may be any function of the state alone. It removes the reward's per-prompt shift by construction - which is why no critic is needed."
      },
      {
        "type": "definition",
        "front": "What GRPO deletes",
        "back": "The VALUE NETWORK (replaced by group normalization) and - where the task is checkable - the REWARD MODEL too. Frees roughly a whole model's memory and removes a hard-to-train component, which is what made large-scale reasoning RL affordable."
      },
      {
        "type": "intuition",
        "front": "Why verifiable rewards changed everything",
        "back": "Overoptimization is a property of a LEARNED proxy: the optimizer searches for regions where the RM errs upward and finds them. A checker has no such regions. That is why RL on maths and code scaled while preference RL plateaued."
      },
      {
        "type": "pitfall",
        "front": "Verifiable rewards do not end reward hacking",
        "back": "They end PROXY exploitation, not SPECIFICATION gaming: degenerate reasoning reaching correct answers, exploiting weak tests, and drift on every dimension the reward is silent about (length, language, format). Keep the KL penalty even with a checker."
      },
      {
        "type": "pitfall",
        "front": "DPO is OFF-policy",
        "back": "It trains on a FIXED dataset from another policy; PPO samples from the current one. As the policy moves, updates become extrapolations - offline RL's central difficulty. Fix: ITERATED DPO (generate on-policy, rank, train, repeat)."
      },
      {
        "type": "definition",
        "front": "IPO, KTO, ORPO, SimPO",
        "back": "IPO bounds the objective so near-deterministic preferences cannot blow up the margin. KTO learns from UNPAIRED thumbs-up/down. ORPO folds SFT and alignment into one stage with no reference model. SimPO is reference-free and length-normalized."
      },
      {
        "type": "intuition",
        "front": "beta is the same knob everywhere",
        "back": "DPO's beta = PPO's KL coefficient = the axis of the overoptimization curve = the control on how far the policy may travel from the reference. It is the most consequential hyperparameter in preference optimization, not a stability detail."
      },
      {
        "type": "intuition",
        "front": "What DPO's existence reveals about RLHF",
        "back": "The RL was never essential (the objective has a closed form); every policy IS a reward model (the inversion is a bijection); the KL term is the objective, not a regularizer; and removing the algorithmic complexity did not remove the difficulty - which was always the DATA and the EVALUATION."
      }
    ],
    "refs": [
      {
        "title": "Rafailov et al. (2023), Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
        "url": "https://arxiv.org/abs/2305.18290"
      },
      {
        "title": "Shao et al. (2024), DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (GRPO)",
        "url": "https://arxiv.org/abs/2402.03300"
      },
      {
        "title": "Azar et al. (2023), A General Theoretical Paradigm to Understand Learning from Human Preferences (IPO)",
        "url": "https://arxiv.org/abs/2310.12036"
      },
      {
        "title": "Ethayarajh et al. (2024), KTO: Model Alignment as Prospect Theoretic Optimization",
        "url": "https://arxiv.org/abs/2402.01306"
      },
      {
        "title": "Xu et al. (2024), Is DPO Superior to PPO for LLM Alignment? A Comprehensive Study",
        "url": "https://arxiv.org/abs/2404.10719"
      }
    ],
    "demos": [
      "dpo",
      "ppo",
      "policy-gradient",
      "reward-model"
    ]
  },
  "unsloth": {
    "level": "core",
    "body": {
      "intuition": [
        "Everything in this module reduced a resource. LoRA removed fourteen of the sixteen bytes per parameter; QLoRA compressed the two that were left; gradient checkpointing attacks activations. What remains is the actual execution of the step, and there the constraint is not arithmetic - it is MEMORY TRAFFIC. A fine-tuning step on a modern accelerator spends much of its time moving tensors between high-bandwidth memory and the compute units, and the standard implementation moves them far more than necessary because each operation is a separate kernel that reads its inputs, writes its output, and hands off. Fusing a chain of operations into one kernel does the same arithmetic while reading and writing once. That is what Unsloth is: hand-written Triton kernels and hand-derived backward passes for the fine-tuning hot path.",
        "One example is worth more than the general principle because it is enormous and it is invisible until you look. Cross-entropy over a large vocabulary materializes a logits tensor of shape batch x sequence x vocabulary. At a batch of 8, a sequence of 2048, and a vocabulary of 128,000, that is roughly two billion entries - about four gigabytes in bf16, with another copy for the softmax and another for the gradient. The loss is a scalar. All of that memory exists only because the implementation computes the full logits before reducing them. A fused or chunked cross-entropy computes the loss in blocks and never materializes the whole thing, and on a long-context fine-tune it can be the single largest saving available - larger than anything the adapter method contributes.",
        "And this is the module's capstone, so the last move is to turn the discipline on the tooling itself. Efficiency claims are proxy claims: 'two times faster' and 'seventy percent less memory' are measurements of a specific configuration against a specific baseline, and neither number is meaningful without both. Faster than what - the library's defaults, or the same library with SDPA attention and a fused optimizer already enabled? At what batch size, sequence length, model, and GPU, given that fusion helps most exactly where memory traffic dominates and least where it does not? And 'no accuracy loss' is almost always evidenced by matching training loss on the same data, which is a proxy for the model being equivalent, not a demonstration of it. None of this means the claims are wrong - fused kernels genuinely work, the mechanism is sound, and the wins are real. It means that the correct response to a benchmark table is to reproduce it on your own configuration, which takes twenty minutes and is the only version of the number that applies to you."
      ],
      "math": [
        {
          "h": "Why fusion helps: arithmetic intensity, not FLOPs",
          "paras": [
            "A kernel is compute-bound if it does enough arithmetic per byte moved to keep the units busy, and memory-bound otherwise. Elementwise operations - normalization, activation functions, rotary embeddings, scaling - do almost no arithmetic per byte and are therefore memory-bound.",
            "Fusion does not reduce the arithmetic at all. It reduces the number of round trips to memory, which is what those operations were actually waiting on."
          ],
          "tex": "I = \\frac{\\text{FLOPs}}{\\text{bytes moved}}, \\qquad t \\;\\approx\\; \\max\\!\\left(\\frac{\\text{FLOPs}}{P_{\\text{peak}}},\\; \\frac{\\text{bytes}}{B_{\\text{mem}}}\\right)",
          "texNote": "For a chain of n elementwise ops on a tensor, the unfused version moves roughly 2n tensor-sized reads and writes; the fused version moves 2. The arithmetic is identical, so the speedup comes entirely from the second term of the max - which also tells you when fusion will NOT help: on a step already dominated by large dense matmuls, there is little traffic to remove."
        },
        {
          "h": "The logits tensor, which is usually the largest allocation in the step",
          "paras": [
            "The vocabulary projection produces a tensor proportional to the vocabulary size, and modern vocabularies are large. It exists only to be reduced to a scalar.",
            "Chunked cross-entropy splits the sequence dimension, computes the loss and gradient blockwise, and never holds the full tensor - the same idea as FlashAttention's tiling, applied to the output head."
          ],
          "tex": "M_{\\text{logits}} = B \\cdot T \\cdot V \\cdot b \\;\\times\\; \\{\\text{logits} + \\text{softmax} + \\text{grad}\\} \\\\[4pt] B{=}8,\\; T{=}2048,\\; V{=}128\\text{k},\\; b{=}2 \\;\\Rightarrow\\; \\approx 4\\,\\text{GB per copy}",
          "texNote": "Three copies of a 4 GB tensor to compute one scalar. This scales with sequence length and with vocabulary, both of which have grown, so it is a bigger problem now than when the standard implementation was written. On long-context fine-tuning it frequently dominates every other allocation - including the ones LoRA and QLoRA were introduced to remove."
        },
        {
          "h": "Gradient checkpointing must be segmented",
          "paras": [
            "Store activations only at segment boundaries and recompute within a segment during the backward pass. The detail that people get wrong: checkpointing EVERY layer stores a boundary per layer and therefore saves almost nothing.",
            "With L layers in segments of size s, you store L/s boundaries and recompute s layers at a time, which is minimized at s of about the square root of L."
          ],
          "tex": "M(s) \\;\\propto\\; \\frac{L}{s} + s \\;\\;\\Longrightarrow\\;\\; s^{*} = \\sqrt{L}, \\qquad M^{*} \\propto 2\\sqrt{L} \\quad\\text{vs}\\quad L",
          "texNote": "The classic sublinear-memory result: O(sqrt(L)) activation memory for roughly one extra forward pass, so about 30 to 40% more compute. The cost is real and it compounds with QLoRA, where the recomputed forward pass dequantizes the weights again - which is why the two techniques together are slower per step than either alone by more than you would guess."
        }
      ],
      "code": [
        {
          "h": "The budget, before any library",
          "paras": [
            "Compute what the step should cost before installing anything. Most 'I need a faster framework' problems are configuration problems, and the arithmetic tells you which term is actually binding."
          ],
          "code": "def budget(P, P_train, B, T, V, L, d, bytes_=2, ckpt=False):\n    weights   = P * bytes_                              # frozen or not\n    train_st  = P_train * 16                            # grad + fp32 master + Adam\n    acts      = B * T * L * d * bytes_ * (1 if not ckpt else 1 / L**0.5) * 12\n    logits    = B * T * V * bytes_ * 3                  # logits + softmax + grad\n    return {k: v / 2**30 for k, v in\n            dict(weights=weights, train_state=train_st,\n                 activations=acts, logits=logits).items()}\n\n# 7B, QLoRA (4-bit base, r=16), B=8, T=2048, V=128k:\n#   weights ......... ~3.5 GB   (4.127 bits/param)\n#   train_state ..... ~0.1 GB   (LoRA only - this is what PEFT bought)\n#   activations ..... several GB, or ~sqrt(L) less with checkpointing\n#   logits .......... ~4 GB     <- OFTEN THE LARGEST SINGLE TERM\n#\n# READ THAT LAST ROW. After LoRA and 4-bit quantization have done their work,\n# the biggest allocation left can be a tensor that exists only to be reduced\n# to one number. That is what fused/chunked cross-entropy removes, and it is\n# why kernel work matters even after the parameter-efficiency work is done.\n\n# WHICH TERM IS BINDING DECIDES WHAT TO DO:\n#   train_state dominates -> use LoRA           (13-02)\n#   weights dominate      -> quantize the base  (13-03)\n#   activations dominate  -> checkpoint, micro-batch\n#   logits dominate       -> chunked cross-entropy, shorter T",
          "caption": "Run the arithmetic first. After LoRA and QLoRA have removed the parameter terms, the logits tensor is frequently the largest allocation left - and no adapter method touches it."
        },
        {
          "h": "How to verify an efficiency claim - the capstone discipline",
          "paras": [
            "The library is a case study; this protocol is the transferable part. A speedup number without a stated baseline configuration is not a measurement, and reproducing it on your own setup takes about twenty minutes."
          ],
          "code": "# THE FOUR QUESTIONS ANY EFFICIENCY CLAIM MUST ANSWER:\n#   1. FASTER THAN WHAT? The library's defaults, or a TUNED baseline with\n#      SDPA/Flash attention, a fused optimizer, and bf16 already enabled?\n#      Those are very different denominators.\n#   2. AT WHAT CONFIGURATION? Model, batch size, sequence length, GPU.\n#      Fusion helps most where memory traffic dominates - small batches,\n#      long sequences, large vocabularies - and least where dense matmuls do.\n#   3. WHAT IS HELD FIXED? Same effective batch? Same number of optimizer\n#      steps, or same wall-clock? Same precision? Same seed?\n#   4. WHAT DOES 'NO ACCURACY LOSS' MEAN? Usually: matching training loss on\n#      the same data - a PROXY for equivalence, not a demonstration of it.\n\n# THE MEASUREMENT, on YOUR configuration:\nfor name, cfg in [(\"baseline-default\", plain),\n                  (\"baseline-tuned\",   plain_with_sdpa_and_fused_adam),\n                  (\"fused-kernels\",    optimized)]:\n    torch.cuda.reset_peak_memory_stats()\n    t = time_n_steps(cfg, n=50, warmup=10)          # WARM UP: kernel autotune\n    print(name, f\"{t:.2f}s/step\",                    # and compilation are not\n          f\"{torch.cuda.max_memory_allocated()/2**30:.1f} GB\")   # steady state\n\n# AND THE EQUIVALENCE CHECK, which is the part everyone skips:\n#   - same seed, same data order -> compare loss curves, not just final loss\n#   - generate from both checkpoints on the same prompts and diff\n#   - run the downstream eval, because 'the loss matched' is a proxy too\n\n# THE HONEST SUMMARY OF THIS CLASS OF TOOLS: the mechanism is sound, the\n# wins are real, and the size of the win is a property of YOUR configuration.\n# Reproduce, do not inherit.",
          "caption": "The protocol, not the library, is the transferable part. Note the tuned baseline in the middle row - a speedup measured against a library's defaults and one measured against an already-optimized configuration are different claims, and only the second one is about the kernels."
        }
      ],
      "useCases": [
        "Single-GPU fine-tuning of a 7B-to-70B model, which is where this class of tooling is aimed and where the memory savings decide whether the job runs at all rather than merely how fast it runs.",
        "Long-context fine-tuning, where the logits tensor and the activations both scale with sequence length and the fused cross-entropy is worth more than every parameter-efficiency technique combined.",
        "Rapid iteration on modest hardware - the practical effect of a genuine two-fold speedup is twice as many hypotheses tested per week, which usually matters more to a project than a few points on any single run.",
        "Learning where training time actually goes. Reading a fused kernel and its hand-derived backward pass is the most direct way to understand which parts of a transformer step are memory-bound, and that understanding transfers to every framework."
      ],
      "pitfalls": [
        "Inheriting a benchmark number instead of reproducing it. Fusion helps most where memory traffic dominates - small batches, long sequences, large vocabularies - and least on a step already dominated by dense matmuls. The published speedup is a property of the published configuration.",
        "Comparing against an untuned baseline. A speedup measured against library defaults includes whatever the defaults left on the table - SDPA or Flash attention, a fused optimizer, bf16, an appropriate batch size. Always benchmark a THIRD configuration: the plain library, tuned.",
        "Accepting matching training loss as proof of equivalence. It is a proxy. Fix the seed and the data order, compare loss CURVES rather than final values, generate from both checkpoints on the same prompts, and run the downstream evaluation.",
        "Checkpointing every layer. That stores a boundary per layer and saves almost nothing; checkpointing must be SEGMENTED, with segments of about sqrt(L), to get the sublinear-memory result for roughly one extra forward pass.",
        "Forgetting that checkpointing and QLoRA compound badly. The recomputed forward pass dequantizes the 4-bit weights again, so the combined step is slower than either technique alone would suggest. Budget for it rather than discovering it.",
        "Benchmarking without a warm-up. Kernel autotuning, compilation, and allocator warm-up all happen on the first steps, so timing from step zero measures startup rather than steady state - and the direction of the error favours whichever configuration compiles less.",
        "Assuming the open-source single-GPU story extends to your cluster. Several tools in this space are single-GPU in their free tier, with multi-GPU behind a commercial licence or simply unsupported. Check before designing a training plan around one."
      ],
      "connections": [
        {
          "ref": "fine-tuning/qlora",
          "text": "The step-time cost introduced there - dequantizing on every matmul, and again during checkpointed recomputation - is exactly what fused kernels attack, and it is why this tooling grew up around QLoRA specifically."
        },
        {
          "ref": "transformers/flash-attention",
          "text": "The canonical instance of the principle: identical arithmetic, tiled so the attention matrix is never materialized, giving a large speedup and a memory reduction from traffic alone. Chunked cross-entropy is the same idea applied to the output head."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The other lever on activations, and the one with an explicit compute price. The sqrt(L) segmentation result is there; the interaction with 4-bit weights - recomputation pays the dequantization twice - is what makes it expensive here."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The general-purpose alternative: a compiler that finds fusions automatically rather than a library of hand-written kernels. Hand-written wins where the author knew something the compiler cannot infer, and loses on coverage and on keeping up with new architectures."
        },
        {
          "ref": "frontier-frameworks/finetuning-stacks",
          "text": "Where this tool sits among TRL, PEFT, Axolotl, LLaMA-Factory and Liger Kernel - and the more durable question of how to evaluate a fast-moving tooling ecosystem without re-benchmarking it every quarter."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does Unsloth actually do?",
          "a": "Replaces hot-path operations in a fine-tuning step with hand-written Triton kernels and hand-derived backward passes, fusing chains of operations so tensors are read and written once instead of once per operation."
        },
        {
          "q": "Why does kernel fusion speed things up?",
          "a": "It removes memory traffic, not arithmetic. Elementwise operations are memory-bound - almost no FLOPs per byte moved - so their cost is round trips to memory, and fusing a chain does them in one."
        },
        {
          "q": "What is arithmetic intensity?",
          "a": "FLOPs per byte moved. Low intensity means memory-bound and fusion helps; high intensity means compute-bound and it does not."
        },
        {
          "q": "Why is the logits tensor a problem?",
          "a": "It is batch x sequence x vocabulary - about 4 GB at B=8, T=2048, V=128k in bf16, with copies for the softmax and gradient - and it exists only to be reduced to one scalar."
        },
        {
          "q": "What does chunked cross-entropy do?",
          "a": "Computes the loss and gradient in blocks along the sequence so the full logits tensor is never materialized - FlashAttention's tiling idea applied to the output head."
        },
        {
          "q": "Why must gradient checkpointing be segmented?",
          "a": "Checkpointing every layer stores a boundary per layer and saves almost nothing. Segments of about sqrt(L) give O(sqrt(L)) activation memory for roughly one extra forward pass."
        },
        {
          "q": "Why do checkpointing and QLoRA compound badly?",
          "a": "The recomputed forward pass dequantizes the 4-bit weights a second time, so the combined step is slower than either technique alone would suggest."
        },
        {
          "q": "What is the first question to ask about a speedup claim?",
          "a": "Faster than what. Against library defaults, or against a tuned baseline with SDPA attention, a fused optimizer, and bf16 already enabled - those are very different denominators."
        },
        {
          "q": "When does fusion help least?",
          "a": "When the step is already dominated by large dense matmuls, which are compute-bound. Large batches and short sequences move the balance that way."
        },
        {
          "q": "What does 'no accuracy loss' usually mean in these claims?",
          "a": "Matching training loss on the same data - a proxy for the models being equivalent, not a demonstration. Compare loss curves, generate from both, and run the downstream evaluation."
        },
        {
          "q": "Why warm up before benchmarking?",
          "a": "Kernel autotuning, compilation and allocator warm-up all happen on the first steps, so timing from step zero measures startup, and the error favours whichever configuration compiles less."
        },
        {
          "q": "What is the alternative to hand-written kernels?",
          "a": "A compiler like torch.compile, which finds fusions automatically. Hand-written wins where the author knew something the compiler cannot infer; it loses on coverage and on new architectures."
        }
      ],
      "standard": [
        {
          "q": "Where does time and memory actually go in a fine-tuning step, and how would you decide what to optimize?",
          "a": "I would enumerate the terms, measure which one binds, and only then choose a technique - because almost every 'I need a faster framework' problem is really a configuration problem. THE MEMORY TERMS. (1) WEIGHTS: P times bytes per parameter. 2 for fp16, about 0.5 for 4-bit NF4. Present regardless of what is trainable. (2) TRAINING STATE: 16 bytes per TRAINABLE parameter - fp16 gradients, the fp32 master copy, and Adam's two moments. This is what LoRA removes, and with an adapter it is negligible. (3) ACTIVATIONS: scales with batch times sequence times depth, not with parameter count. Attacked by gradient checkpointing and micro-batching. (4) LOGITS: batch times sequence times VOCABULARY, times three for the logits, softmax and gradient. At B=8, T=2048, V=128k that is about 4 GB per copy - and after LoRA and 4-bit quantization have done their work, it is frequently the LARGEST remaining allocation. It exists only to be reduced to one scalar. THE TIME TERMS. Dense matmuls in attention and the MLP, which are compute-bound and where the FLOPs are. Elementwise operations - normalization, activations, rotary embeddings, scaling - which are memory-bound and whose cost is round trips to HBM rather than arithmetic. Dequantization, if the base is 4-bit, on every matmul and again during checkpointed recomputation. And data loading, which is embarrassingly often the real answer and is checked last. THE DECISION RULE, which follows directly. If training state dominates, use LoRA. If weights dominate, quantize the base. If activations dominate, checkpoint with segments of about sqrt(L) and micro-batch. If logits dominate, use a chunked cross-entropy or shorten the sequence. If the step is memory-bandwidth-bound on elementwise work, fused kernels are the answer - and only then. HOW I WOULD MEASURE RATHER THAN GUESS. torch.cuda.max_memory_allocated for the peak, the PyTorch profiler for a per-kernel time breakdown, and a check of whether the GPU is actually saturated - if utilization is low, the problem is upstream in the data pipeline and no kernel work will help. I would also compute the arithmetic FIRST, from the formula, because a two-line calculation tells you which term is binding before you install anything. WHY THE ORDER MATTERS. These techniques attack disjoint terms, so applying the wrong one gives no benefit and people conclude the technique does not work. And they interact: checkpointing plus QLoRA pays the dequantization twice, so the combined step is slower than either suggests. Knowing which term you are attacking is most of the skill; the tools are the easy part.",
          "deepDive": {
            "q": "Walk through the fused cross-entropy in detail. Why is it such a large win now when it was not a concern historically?",
            "a": "THE STANDARD IMPLEMENTATION. Take the final hidden states, B x T x d. Multiply by the output embedding, d x V, producing logits B x T x V. Compute log-softmax over V, producing another B x T x V. Gather the target log-probabilities and reduce to a scalar. Backward needs the softmax probabilities, so a third tensor of that size exists or is recomputed. Three tensors proportional to B*T*V, to produce one number. THE FUSED VERSION. Process the B*T tokens in CHUNKS. For each chunk: compute its logits, compute its contribution to the loss, compute the gradient with respect to that chunk's hidden states immediately, accumulate, and free the chunk's logits before moving on. Peak memory is now proportional to chunk_size*V rather than B*T*V, and with a chunk of a few hundred tokens that is a reduction of one to two orders of magnitude. The arithmetic is identical - the same matmul and the same softmax - and the trick is only in never holding all of it at once. It is exactly FlashAttention's structure: tile, reduce online, never materialize the large intermediate. The online-softmax formulation is what makes it exact rather than approximate, since you can accumulate the max and the sum of exponentials across chunks and correct at the end. WHY IT MATTERS NOW AND NOT BEFORE - three changes, all in the same direction. (1) VOCABULARIES GREW. BERT had about 30,000 tokens; modern models have 128,000 to 256,000, and multilingual models more. The term is LINEAR in V, so it has grown four to eight times from this alone. (2) SEQUENCE LENGTHS GREW. Fine-tuning at 512 tokens was normal; now 4k, 8k, 32k are ordinary. Another linear factor, and a large one. (3) EVERYTHING ELSE SHRANK. This is the decisive one. When you were full-fine-tuning a 300M model, optimizer state was the dominant term by far and nobody looked at the logits. LoRA removed fourteen of sixteen bytes per parameter, QLoRA compressed the rest, and checkpointing cut activations - so a term that was once a small fraction of the budget is now, on a long-context QLoRA run, frequently the biggest single allocation. It did not become expensive; everything around it became cheap. THE GENERAL LESSON, and it is the one I would want to land. Optimizing a system re-orders its bottlenecks, and the term that binds after three rounds of optimization is usually not the one anybody was thinking about at the start. The habit that catches this is re-profiling after every significant change rather than carrying forward a mental model formed on the original configuration. Most of the surprising wins in systems work are of this shape: not a clever new technique, but noticing that an old assumption about where the cost lives stopped being true."
          }
        },
        {
          "q": "A tool claims 2x faster training and 70% less memory with no accuracy loss. How do you evaluate that?",
          "a": "I would treat it as a proxy claim - which is what it is - and ask what was measured, against what, and whether it applies to me. THE FOUR QUESTIONS. (1) FASTER THAN WHAT? This is the one that matters most. A speedup against a library's DEFAULTS includes whatever the defaults left on the table: eager attention instead of SDPA or Flash, an unfused optimizer, fp32 where bf16 would do, a badly chosen batch size. A speedup against an ALREADY-TUNED baseline is a claim about the kernels. These are very different numbers and the first is much easier to produce. (2) AT WHAT CONFIGURATION? Model, batch size, sequence length, GPU, precision. The mechanism is removing memory traffic, so the benefit is largest where memory traffic dominates - small batches, long sequences, large vocabularies - and smallest on a step dominated by big dense matmuls. The published configuration is usually, and understandably, one where the mechanism shines. (3) WHAT WAS HELD FIXED? Same effective batch size? Same number of optimizer steps, or the same wall-clock? Same precision? A memory reduction that comes partly from a smaller micro-batch is not the same claim as one at matched batch. (4) WHAT DOES 'NO ACCURACY LOSS' MEAN? Almost always: the training loss curve matched. That is a proxy for the resulting models being equivalent, and a reasonable one, but a hand-derived backward pass is exactly the kind of thing that can be subtly wrong in a way a loss curve absorbs. HOW I WOULD ACTUALLY TEST IT, in about twenty minutes. Three configurations, not two: the plain library at defaults, the plain library TUNED, and the tool. Same model, same data, my real sequence length and batch size. Warm up ten steps before timing fifty, because autotuning and compilation happen early and timing from step zero measures startup. Record seconds per step and peak allocated memory for each. The gap between rows two and three is the honest answer for my setup. THE EQUIVALENCE CHECK, which people skip. Fix the seed and the data order, and compare loss CURVES rather than final values - a divergence that closes by the end is still a bug. Generate from both checkpoints on the same prompts and diff the outputs. Run the downstream evaluation, because matching loss is a proxy too. WHAT I EXPECT TO FIND, and I want to be fair here. The mechanism is sound, fused kernels genuinely work, and the memory savings in particular tend to hold up well because they are structural rather than incidental - a tensor you never allocate is never allocated on anyone's hardware. The speedup is the number that varies most with configuration. So my prior is that the memory claim is roughly right for me and the speed claim needs measuring. THE TRANSFERABLE POINT. This is the module's discipline applied to its own tooling. Every lesson here has been about naming the proxy behind a number, and a benchmark table is a proxy for 'this will be faster for you'. The response is not scepticism, it is reproduction - and it is cheap enough that there is no excuse for inheriting the number instead."
        },
        {
          "q": "When would you use hand-written kernels versus torch.compile?",
          "a": "They are answers to the same question with different failure modes, and I would frame the choice around coverage versus peak performance. WHAT EACH IS. torch.compile captures the graph with Dynamo, lowers it through Inductor, and generates fused Triton kernels automatically. Hand-written libraries provide specific kernels an expert wrote for specific operations, often with the backward pass derived by hand rather than by autograd. WHERE HAND-WRITTEN WINS. (1) WHEN THE AUTHOR KNEW SOMETHING THE COMPILER CANNOT INFER. FlashAttention is the canonical case: the online-softmax reformulation is a mathematical restructuring of the computation, not a fusion of the graph as written. A compiler optimizes the graph it is given; it does not rewrite your algorithm. Chunked cross-entropy is the same kind of move. (2) MANUAL BACKWARD PASSES. Autograd composes the backward of each operation; a human can derive the backward of the whole fused block and often find cancellations and reuses autograd cannot. (3) MEMORY LAYOUT AND RECOMPUTE DECISIONS that depend on knowing the specific shapes and access patterns of a transformer block. WHERE torch.compile WINS. (1) COVERAGE. It works on your architecture, including the one you modified this morning. Hand-written kernels support a list of models, and a custom attention variant or a new normalization silently falls off the fast path - sometimes without telling you. (2) MAINTENANCE. Every new model architecture needs new hand-written kernels; the compiler adapts. In a fast-moving field that is a large difference over a year. (3) NO EXTRA DEPENDENCY, and no risk of a hand-derived backward being subtly wrong. (4) IT COMPOSES with the rest of the PyTorch ecosystem - FSDP, custom autograd functions, distributed training - where specialized libraries frequently have gaps, including the common one where the open-source tier is single-GPU only. THE PRACTICAL ANSWER. Use both: most of these libraries are implemented ON TOP of Triton and coexist with compilation, and the strong configuration is Flash or SDPA attention plus a fused cross-entropy plus torch.compile for everything else. The specialized library is worth it when it targets your exact model and your exact bottleneck, and it is a liability when it constrains which models you can use or which distributed strategy you can adopt. WHAT I WOULD ACTUALLY CHECK FIRST. Whether torch.compile works at all on my setup, because it frequently does not deliver on CPU or without a working Triton installation, and it can fall back to eager silently. And whether my model is on the library's supported list - if it is not, the comparison is moot. Then measure all of it on my configuration, because the ranking between these options is a property of the model, the shapes and the hardware, and nobody's benchmark table is about my job.",
          "deepDive": {
            "q": "What would make you distrust a hand-written fused kernel, and how would you validate one?",
            "a": "WHAT WOULD WORRY ME. (1) A HAND-DERIVED BACKWARD PASS. This is the highest-risk component in the whole category. Autograd is mechanically correct by construction; a human derivation can be subtly wrong - a missing term that only matters when a particular input is negative, a wrong reduction axis that cancels for square shapes, an incorrect treatment of a masked position. And the symptom is not a crash, it is a slightly wrong gradient, which training absorbs. The loss still goes down. (2) NUMERICAL SHORTCUTS. Fused kernels often skip intermediate upcasts to fp32 to save traffic. Usually fine, occasionally not - accumulating a softmax or a normalization statistic in bf16 changes results in ways that appear only at long sequence lengths or unusual value ranges. (3) SILENT FALLBACKS AND SILENT NON-FALLBACKS. Either the library quietly reverts to a slow path (you lose the speed, harmless) or it quietly applies a kernel to a case it was not validated for (you lose correctness, not harmless). (4) EDGE CASES: sequence lengths that are not nice multiples, padded batches, unusual head dimensions, and anything to do with masking. Tiled kernels have boundary conditions and boundaries are where kernel bugs live. HOW I WOULD VALIDATE, in order of cost. (1) GRADCHECK against the reference implementation on small tensors in float64. This is the single most valuable test and it directly targets the highest-risk component. Do it for the awkward shapes too - odd lengths, single-element batches, fully-masked rows - not only the round ones. (2) FORWARD EQUIVALENCE against the reference at the real dtype, checking max absolute and relative error, and confirming the error is at rounding scale rather than merely small. (3) A SHORT TRAINING-EQUIVALENCE RUN: same seed, same data order, both implementations, compare the loss curves step by step. A correct kernel gives curves that track closely from step one and diverge only slowly from floating-point non-determinism. A subtly wrong gradient shows as an early, systematic separation - which is why comparing curves beats comparing final loss. (4) GENERATE from both checkpoints on the same prompts and diff. (5) THE DOWNSTREAM EVALUATION, because everything above is still a proxy. WHAT I WOULD DO IN PRACTICE. Widely-used kernels - Flash attention, the well-established fused cross-entropies - have had this validation done by many people and I would trust them at the level of running a smoke test. A newer or less-used kernel, or one for an architecture the library recently added support for, gets the gradcheck. The asymmetry is deliberate: the cost of the check is minutes and the cost of a subtly wrong gradient is a training run whose result you cannot explain and whose loss curve looked fine throughout. THE PRINCIPLE. Performance work is the one area where a correctness bug is systematically likely to go unnoticed, because the artefact still trains, the loss still falls, and every metric you look at is downstream of the thing that broke. That is an argument for validating against a reference rather than against your expectations."
          }
        },
        {
          "q": "You are given a fine-tuning job that runs out of memory. Walk through your response.",
          "a": "MEASURE FIRST, in two minutes, because the fix depends entirely on which term is binding and guessing wastes hours. Run one step with torch.cuda.max_memory_allocated, and if it will not complete a step, compute the budget from the formula: weights = P times bytes per parameter; training state = 16 bytes per trainable parameter; activations proportional to batch times sequence times depth; logits proportional to batch times sequence times vocabulary, times three. Those four numbers tell me what to do. THEN, BY WHICH TERM DOMINATES. (1) TRAINING STATE DOMINATES - I am full-fine-tuning. Switch to LoRA. This is the largest single lever available, taking fourteen of sixteen bytes per parameter to nearly nothing, and it costs the low-rank constraint. (2) WEIGHTS DOMINATE - the model itself does not fit. Quantize the base to 4-bit NF4 with double quantization: roughly four times smaller, at the cost of a slower step and some quantization error. (3) ACTIVATIONS DOMINATE - long sequences or a large batch. Gradient checkpointing with segments of about sqrt(L), for roughly 30 to 40% more compute, plus micro-batching with gradient accumulation to keep the effective batch while cutting the peak. (4) LOGITS DOMINATE - and check this explicitly, because it is the one people do not think of and it is frequently the largest term after the others have been reduced. Batch times sequence times a 128k vocabulary, times three copies. Fix: a chunked or fused cross-entropy, which removes it almost entirely. THE CHEAP THINGS I WOULD TRY IN PARALLEL, since they cost nothing. Confirm the optimizer is not fp32 throughout. Check for anything accumulating across steps - a metrics list holding tensors that still carry graph references is a classic slow leak that presents as OOM after N steps rather than immediately, and the tell is that step one succeeds. Set expandable_segments in the allocator if the failure is fragmentation, which shows as an OOM while nvidia-smi reports free memory. Lower the sequence length if the data does not need it, since two terms scale with it. THE LAST RESORTS. Paged optimizer states, which absorb spikes by falling back to host memory - a robustness measure rather than a capacity plan, since PCIe becomes the bottleneck if it runs steadily. Then sharding across devices with FSDP or ZeRO-3, which divides everything at the cost of parameter all-gathers, roughly 1.5x DDP's communication. WHAT I WOULD NOT DO FIRST. Install a faster framework. It may well help - fused cross-entropy in particular is a real and large fix - but installing a dependency before knowing which term is binding is how people end up with a complex stack that did not address their actual problem. The arithmetic is two lines and it tells you the answer."
        },
        {
          "q": "How should a team evaluate fast-moving fine-tuning tooling without re-benchmarking every quarter?",
          "a": "By separating what changes from what does not, and only tracking the first. WHAT DOES NOT CHANGE - the principles worth investing in. The memory budget: 16 bytes per trainable parameter, weights times bytes, activations proportional to batch times sequence times depth, logits proportional to batch times sequence times vocabulary. The roofline distinction between memory-bound and compute-bound work, which tells you what fusion can and cannot buy. The sqrt(L) checkpointing result. These are arithmetic and they will be true in five years. A team that understands them can evaluate any new tool in an afternoon; a team that has memorized a tool's flags cannot. WHAT DOES CHANGE - and should be re-checked, but cheaply. Which library is fastest, which supports your architecture, which handles multi-GPU in its open tier, which has kept up with the current model families. THE INVESTMENT I WOULD MAKE. A REPRODUCIBLE INTERNAL BENCHMARK: your model, your sequence length, your batch size, your hardware, run as a script, producing seconds per step and peak memory for a set of configurations including a properly TUNED baseline. Build it once. Then evaluating a new tool is running one script, and the answer is about your job rather than someone's blog post. This is the highest-leverage thing a team can build here and it is a day of work. THE POLICY I WOULD ADOPT. Default to the mainstream stack - PyTorch, TRL, PEFT - because coverage and composability beat peak performance for most teams most of the time, and a specialized library that does not support your next model is a migration you did not budget for. Adopt a specialized tool when the internal benchmark shows a large win on your actual configuration AND the tool supports the architectures on your roadmap AND its licensing works for your deployment - noting that several tools in this space are single-GPU in their free tier. THE TRAP TO AVOID. Adopting on benchmark numbers and discovering the constraint later: the unsupported architecture, the missing multi-GPU path, the incompatibility with your distributed strategy, the hand-derived backward that has not been validated for your sequence lengths. Those are the costs that actually hurt, and none of them appear in a speed table. HOW I WOULD FRAME IT TO A TEAM. Efficiency claims are proxy claims, exactly like every other claim in this module. The proxy is 'faster on our benchmark' and the thing you want is 'faster on our job, correct, and still supported next year'. The response is not to distrust the numbers but to spend one day building the instrument that produces YOUR number - and then the question stops being contentious and becomes a measurement."
        },
        {
          "q": "What is the single most important idea from this module, and how does this lesson complete it?",
          "a": "THE IDEA. Every method here optimizes a PROXY for the thing you actually want, and the discipline is to name the proxy, then name the measurement that shows when optimizing it stopped helping. Run through it. Full fine-tuning's proxy is the fine-tuning set's own test split, which rises monotonically with trainable parameters - and Kumar et al. showed it ranks methods in the wrong order out of distribution. LoRA's proxy is parity on adaptation benchmarks, and Biderman et al. showed it does not hold for continued pretraining, where the constraint genuinely binds. QLoRA's proxy is benchmark parity, and the paper is candid that its two evaluations disagree with each other. The adapter comparison's proxy is GLUE accuracy - saturated, so it cannot rank anything, and the axes that decide the choice are latency and batchability, which nobody reports. Prompt tuning's proxy is parity at scale, which hides a permanent per-request context cost. Instruction tuning's proxy is a preference judgment, and Gudibande showed imitation models win it while gaining no capability. Reward modelling makes the proxy LITERAL - it is a model of the objective, by construction - and Gao et al. measured the gold score peaking and falling as you optimize it. DPO inherits the preference dataset as its proxy and pays for it with off-policy drift. That is nine lessons of the same structure. HOW THIS ONE COMPLETES IT. By turning the discipline on the tooling that implements all of it. 'Two times faster, seventy percent less memory, no accuracy loss' is three proxy claims: a speedup against an unstated baseline configuration, a memory reduction under unstated conditions, and an equivalence argument resting on matching training loss. The mechanism behind them is sound and the wins are real - I want to be clear that the answer is not scepticism. The answer is that the number applies to the configuration it was measured on, and reproducing it on yours takes twenty minutes. WHY THAT IS THE RIGHT ENDING. The module could have ended by saying 'be careful with metrics', which everyone already agrees with and nobody acts on. Ending on the tooling makes the point unavoidable, because the tooling is the layer people trust most reflexively - it is infrastructure, it is not making a scientific claim, and it comes with a benchmark table that looks like a fact. Applying the same question there as everywhere else is what makes it a habit rather than a caveat. THE ONE-SENTENCE VERSION I WOULD LEAVE SOMEONE WITH. Fine-tuning results are the most over-claimed in machine learning, because the evaluation is almost always drawn from the fine-tuning distribution - and the fix is never a better method, it is an evaluation the fine-tuning data did not define."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why kernel fusion helps",
        "back": "It removes MEMORY TRAFFIC, not FLOPs. Elementwise ops (norms, activations, RoPE, scaling) are memory-bound - almost no arithmetic per byte. A chain of n ops moves ~2n tensor round-trips unfused, 2 fused. Same arithmetic."
      },
      {
        "type": "formula",
        "front": "The logits memory bomb",
        "back": "B*T*V*bytes, times ~3 (logits + softmax + grad). At B=8, T=2048, V=128k, bf16: ~4 GB PER COPY - to produce one scalar. Often the LARGEST allocation left after LoRA and 4-bit quantization have done their work."
      },
      {
        "type": "definition",
        "front": "Chunked / fused cross-entropy",
        "back": "Process tokens in chunks: compute each chunk's logits, its loss contribution, and its input gradient, then free before the next. Peak drops from B*T*V to chunk*V. Exact via online softmax - FlashAttention's tiling applied to the output head."
      },
      {
        "type": "formula",
        "front": "Gradient checkpointing must be SEGMENTED",
        "back": "M(s) ~ L/s + s, minimized at s* = sqrt(L), giving O(sqrt(L)) activation memory for ~1 extra forward pass (30-40% more compute). Checkpointing EVERY layer stores a boundary per layer and saves almost nothing."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing + QLoRA compound badly",
        "back": "The recomputed forward pass DEQUANTIZES the 4-bit weights a second time. The combined step is slower than either technique alone would suggest - budget for it rather than discovering it."
      },
      {
        "type": "pitfall",
        "front": "'Faster than what?'",
        "back": "A speedup against library DEFAULTS includes whatever the defaults left on the table (eager attention, unfused optimizer, fp32). A speedup against a TUNED baseline is a claim about the kernels. Always benchmark three rows: default, tuned, tool."
      },
      {
        "type": "intuition",
        "front": "Which memory term binds decides the fix",
        "back": "train_state dominates -> LoRA. weights dominate -> quantize the base. activations dominate -> checkpoint + micro-batch. logits dominate -> chunked cross-entropy. They attack DISJOINT terms, so the wrong one gives zero benefit."
      },
      {
        "type": "pitfall",
        "front": "'No accuracy loss' is a proxy claim",
        "back": "It almost always means matching TRAINING LOSS on the same data. Fix the seed and data order and compare loss CURVES (an early systematic separation = wrong gradient), generate from both checkpoints, and run the downstream eval."
      },
      {
        "type": "intuition",
        "front": "Why the logits term matters NOW",
        "back": "Vocabularies grew (30k -> 128k+), sequences grew (512 -> 8k+), and EVERYTHING ELSE SHRANK (LoRA, QLoRA, checkpointing). It did not become expensive - the terms around it became cheap. Optimizing a system re-orders its bottlenecks."
      },
      {
        "type": "pitfall",
        "front": "Warm up before benchmarking",
        "back": "Kernel autotuning, compilation and allocator warm-up all happen on the first steps. Timing from step zero measures startup - and the error systematically favours whichever configuration compiles less."
      },
      {
        "type": "intuition",
        "front": "Hand-written kernels vs torch.compile",
        "back": "Hand-written wins when the author RESTRUCTURED THE ALGORITHM (FlashAttention's online softmax) - a compiler optimizes the graph it is given, it does not rewrite your maths. torch.compile wins on coverage, maintenance, and composing with FSDP."
      },
      {
        "type": "pitfall",
        "front": "Validate a hand-derived backward pass",
        "back": "The highest-risk component in this category: a subtly wrong gradient does not crash, the loss still falls, and every metric is downstream of what broke. Gradcheck in float64 against the reference, including awkward shapes (odd lengths, fully-masked rows)."
      }
    ],
    "refs": [
      {
        "title": "Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
        "url": "https://arxiv.org/abs/2205.14135"
      },
      {
        "title": "Hsu et al. (2024), Liger Kernel: Efficient Triton Kernels for LLM Training",
        "url": "https://arxiv.org/abs/2410.10989"
      },
      {
        "title": "Chen et al. (2016), Training Deep Nets with Sublinear Memory Cost (gradient checkpointing)",
        "url": "https://arxiv.org/abs/1604.06174"
      },
      {
        "title": "Unsloth documentation",
        "url": "https://docs.unsloth.ai/"
      },
      {
        "title": "Triton: an open-source language and compiler for GPU kernels",
        "url": "https://triton-lang.org/"
      }
    ],
    "demos": [
      "quantization",
      "mixed-precision",
      "paged-attention",
      "batching"
    ]
  }
};
