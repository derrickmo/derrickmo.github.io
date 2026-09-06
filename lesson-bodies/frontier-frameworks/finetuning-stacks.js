// GENERATED from content/lessons/frontier-frameworks/finetuning-stacks.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/finetuning-stacks/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "finetuning-stacks": {
    "level": "advanced",
    "body": {
      "intuition": [
        "LoRA's claim is that the update a fine-tuning task needs has low intrinsic rank, so you can represent it with two thin matrices instead of a full one. That is an empirical claim about tasks, and the usual evidence for it is a table of benchmark scores - which cannot separate 'the update really is low rank' from 'the benchmark could not tell the difference'. The way to settle it is to construct a task whose update is EXACTLY rank two by design, and then sweep the adapter rank against a known answer.",
        "That sweep produces the cleanest result in the module. At rank one, the mean squared error was 0.96 - the adapter LITERALLY CANNOT represent a rank-two update, so this is a representational limit rather than an optimization failure and no amount of training fixes it. At rank two it snapped to 0.0000, matching full fine-tuning exactly, at 12% of the parameters. At ranks four, eight and sixteen it plateaued. So the rule the elbow encodes is: pay until you reach the task's intrinsic rank, then stop - extra rank buys nothing.",
        "The other thing worth correcting is where the memory saving comes from. It is not primarily that the adapter is small. It is that the base weights are a FROZEN BUFFER - no gradient, and crucially no optimizer state, which for Adam is twice the parameter count in floats. Freezing removes the largest allocation in a training step, and the adapter's own size is almost incidental by comparison. QLoRA then goes further and stores that frozen base in four bits, 7.9 times smaller, with the adapters trained on top absorbing most of the quantization damage."
      ],
      "math": [
        {
          "h": "Rank is a hard representational limit",
          "paras": [
            "A product of a d-by-r and an r-by-d matrix has rank at most r, so an update of higher rank is unreachable.",
            "That is a fact about matrices, not about training."
          ],
          "tex": "\\Delta W = BA, \\;\\; B \\in \\mathbb{R}^{d\\times r}, A \\in \\mathbb{R}^{r\\times d} \\;\\Rightarrow\\; \\mathrm{rank}(\\Delta W) \\le r, \\qquad r{=}1 \\text{ on a rank-2 task}: \\text{MSE } 0.96",
          "texNote": "The r equals one failure is therefore not a tuning problem - the target is outside the representable set and the best achievable error is bounded below by the discarded singular value, which is the Eckart-Young statement. That distinction matters diagnostically: an underfitting adapter that will not improve with more steps or a better learning rate is telling you the rank is too low, and no other symptom looks quite like it."
        },
        {
          "h": "The elbow - pay until the task's rank, then stop",
          "paras": [
            "Once r reaches the intrinsic rank, the adapter can represent the update exactly and further rank adds nothing.",
            "Measured against a task constructed to be rank two, the elbow is sharp."
          ],
          "tex": "r=1:\\;0.96 \\quad\\Longrightarrow\\quad r=2:\\;\\mathbf{0.0000} \\;(\\text{= full FT}) \\quad\\Longrightarrow\\quad r=4,8,16:\\;\\text{plateau}",
          "texNote": "The snap to exactly full-fine-tuning quality at r equal to the true rank, at 12% of the parameters, is what LoRA's thesis predicts and it is rarely shown this cleanly because real tasks have no known intrinsic rank. The practical consequence is that rank is a parameter to SWEEP rather than to default: too low is a hard ceiling, too high is wasted parameters and no gain."
        },
        {
          "h": "Where the memory actually goes",
          "paras": [
            "Trainable parameter count is the visible saving; optimizer state is the large one.",
            "And the ratio looks unimpressive at toy widths and shrinks fast at real ones."
          ],
          "tex": "\\frac{2rd}{d^2} = \\frac{2r}{d}: \\;\\; \\frac{2\\cdot4}{32} = 25\\% \\;\\;(\\text{toy}) \\quad\\text{vs}\\quad \\frac{2\\cdot8}{4096} = 0.4\\% \\;\\;(\\text{real width})",
          "texNote": "The toy at 32 by 32 UNDERSTATES the benefit badly, and saying so matters - the ratio is linear in r and inverse in d, so it collapses as models get wide. But the dominant saving is elsewhere: a frozen base carries no gradient and no optimizer state, and Adam's state alone is twice the parameter count in floats. Removing that is the reason LoRA fits on hardware full fine-tuning does not."
        }
      ],
      "code": [
        {
          "h": "What LoRA actually does, and why B is zero-initialized",
          "paras": [
            "Two structural decisions carry almost all of the benefit."
          ],
          "code": "class LoRALinear(nn.Module):\n    def __init__(self, d, r):\n        self.register_buffer(\"W\", pretrained)   # ★ BUFFER, not Parameter:\n                                                #   no grad, and no\n                                                #   OPTIMIZER STATE\n        self.A = nn.Parameter(randn(r, d) * 0.01)\n        self.B = nn.Parameter(zeros(d, r))      # ★ ZERO init\n\n    def forward(self, x):\n        return x @ self.W.T + (x @ self.A.T) @ self.B.T\n\n# ★ WHY B IS ZERO: BA = 0 at step 0, so the adapter is an exact NO-OP\n#   and training starts from the PRETRAINED function. Not a detail -\n#   it is what makes attaching an adapter safe rather than a\n#   perturbation you have to recover from.\n\n# ★ WHERE THE MEMORY SAVING REALLY COMES FROM - not the adapter size:\n#   full FT:  weights + GRADIENTS + OPTIMIZER STATE (Adam = 2x params)\n#   LoRA:     weights (frozen buffer) + tiny adapter grads + tiny state\n#   Freezing removes the LARGEST allocation in a training step. The\n#   adapter being small is almost incidental next to that.\n\n# THE PARAMETER RATIO, and an honest note about the toy:\n#   2rd/d^2 = 2r/d\n#     32x32, r=4    -> 25%     <- the toy UNDERSTATES it badly\n#     4096, r=8     -> 0.4%    <- real widths\n#   Linear in r, inverse in d - so it collapses as models get wide.\n\n# AND THE SERVING PROPERTY that drove adoption as much as the memory:\n#   the adapter is an ADDITIVE side path, so it can be MERGED into W\n#   for zero-overhead inference, or kept separate so one base serves\n#   many tasks with per-request adapters.",
          "caption": "The frozen buffer removes gradients and optimizer state — the largest allocation in a training step — which is the saving, not the adapter's size."
        },
        {
          "h": "★ The rank sweep on a task with a KNOWN answer",
          "paras": [
            "Constructing the task to be exactly rank two is what makes the elbow verifiable rather than folklore."
          ],
          "code": "# THE SETUP: a regression task whose true update is EXACTLY RANK 2 by\n# construction. So the right answer is known, and the sweep is graded\n# rather than interpreted.\n#\n#   r = 1   MSE 0.96      ★ CANNOT represent a rank-2 update.\n#                           rank(BA) <= r is a MATRIX fact, so this is\n#                           a REPRESENTATIONAL limit - more steps, a\n#                           better LR, more data: none of it helps.\n#   r = 2   MSE 0.0000    ★ SNAPS to full-fine-tuning quality, at 12%\n#                           of the parameters.\n#   r = 4   plateau\n#   r = 8   plateau\n#   r = 16  plateau       -> extra rank buys NOTHING\n#\n# ★ THE ELBOW RULE: pay until you reach the task's intrinsic rank,\n#   then stop.\n#\n# ⚠ AND THE HONEST LIMIT: you do NOT know a real task's intrinsic rank.\n#   So rank is a parameter to SWEEP, not to default - and the two\n#   failure directions look completely different:\n#     too LOW  -> a hard ceiling that more training cannot move\n#                 (the diagnostic: loss plateaus far from full-FT and\n#                  is insensitive to LR and steps)\n#     too HIGH -> wasted parameters, no gain, slightly more overfitting\n\n# QLoRA - the frozen base stored in int4:\n#   base size            7.9x smaller\n#   base alone, int4     MSE 2.11    <- the quantization damage\n#   QLoRA (adapters on top of it)    MSE 0.024\n#   fp32 LoRA                        MSE 0.000\n# ★ The fp adapters, trained ON TOP of the quantized base, ABSORB most\n#   of the quantization error - 2.11 down to 0.024. Not free (0.024 vs\n#   0.000), and it recovers ~99% of the damage for a 7.9x smaller base.",
          "caption": "A task built to be exactly rank two turns LoRA's central claim into a graded measurement — and the r=1 failure is a matrix fact, not a training problem."
        }
      ],
      "useCases": [
        "Fine-tuning a model that will not fit in memory under full fine-tuning, where freezing the base removes gradients and optimizer state rather than merely shrinking the trainable set.",
        "Serving many task-specific variants from one base model, which the additive side-path structure makes possible without duplicating weights.",
        "Choosing an adapter rank, which the elbow makes a sweep with a clear stopping rule rather than a guess.",
        "Diagnosing an adapter that underfits, where insensitivity to learning rate and step count points at a representational ceiling rather than an optimization problem."
      ],
      "pitfalls": [
        "Treating a rank-too-low failure as a tuning problem. The product of a d-by-r and r-by-d matrix has rank at most r, so a higher-rank update is outside the representable set and no training fixes it.",
        "Defaulting the rank instead of sweeping it. Too low is a hard ceiling and too high is wasted parameters, and the intrinsic rank of a real task is unknown.",
        "Believing the adapter's small size is the memory saving. The dominant saving is that a frozen base carries no gradients and no optimizer state, and Adam's state alone is twice the parameter count.",
        "Reading the toy parameter ratio as representative. Twenty-five percent at 32 by 32 understates it badly - the ratio is 2r over d, so it collapses to well under one percent at real widths.",
        "Initializing B randomly. Zero initialization makes the adapter an exact no-op at step zero so training starts from the pretrained function rather than from a perturbation.",
        "Assuming QLoRA is free. The adapters absorbed most of the quantization damage - 2.11 down to 0.024 - but full-precision LoRA reached 0.000, so there is a real if small cost.",
        "Comparing quality without stating the base precision. A QLoRA result and an fp16 LoRA result are different experiments, and the difference is the quantization the adapters had to absorb."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "The full treatment, including the argument that LoRA won on serving structure rather than accuracy, and why PEFT accuracy is a saturated axis."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "The quantized-base variant in depth - NF4, double quantization and paged optimizers - and what each contributes to the memory budget."
        },
        {
          "ref": "frontier-frameworks/open-weight-models",
          "text": "Where the int4 base sits in the memory arithmetic, and why quantization is a capability decision rather than only a cost one."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "The other way to make optimizer state affordable - sharding it rather than eliminating it - and why Adam being elementwise is what permits that."
        },
        {
          "ref": "ml-theory/learning-theory",
          "text": "The intrinsic-dimension framing behind the low-rank claim: why a task can require far fewer effective parameters than the model has."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why can't a rank-1 adapter fit a rank-2 update?",
          "a": "The product of a d-by-r and an r-by-d matrix has rank at most r. It is a matrix fact, so more steps or a better learning rate cannot help."
        },
        {
          "q": "What did the sweep measure?",
          "a": "On a task built to be exactly rank two: r equals 1 gave MSE 0.96, r equals 2 gave 0.0000 matching full fine-tuning, and 4, 8 and 16 plateaued."
        },
        {
          "q": "What rule does the elbow encode?",
          "a": "Pay until you reach the task's intrinsic rank, then stop - extra rank buys nothing."
        },
        {
          "q": "Why is that hard to apply directly?",
          "a": "You do not know a real task's intrinsic rank, so rank is a parameter to sweep rather than to default."
        },
        {
          "q": "How do the two rank failures look different?",
          "a": "Too low is a hard ceiling insensitive to learning rate and steps; too high is wasted parameters with no gain."
        },
        {
          "q": "Where does the memory saving actually come from?",
          "a": "The frozen base is a buffer with no gradient and no optimizer state - and Adam's state alone is twice the parameter count in floats."
        },
        {
          "q": "So the adapter's size is not the point?",
          "a": "Largely not. Removing gradients and optimizer state is the dominant saving; the adapter being small is almost incidental next to that."
        },
        {
          "q": "Why is B initialized to zero?",
          "a": "So the product BA is zero at step zero and the adapter is an exact no-op - training starts from the pretrained function rather than a perturbation."
        },
        {
          "q": "What is the parameter ratio?",
          "a": "2r over d. At 32 by 32 with r equals 4 that is 25%, which understates it - at width 4096 with r equals 8 it is about 0.4%."
        },
        {
          "q": "What did QLoRA measure?",
          "a": "An int4 base 7.9 times smaller, with the base alone at MSE 2.11 and QLoRA at 0.024 - the adapters absorbed most of the quantization damage."
        },
        {
          "q": "Is QLoRA free then?",
          "a": "No. Full-precision LoRA reached 0.000 against QLoRA's 0.024, so there is a real if small cost for a 7.9 times smaller base."
        },
        {
          "q": "What serving property drove adoption?",
          "a": "The adapter is an additive side path, so it can be merged for zero-overhead inference or kept separate so one base serves many tasks."
        }
      ],
      "standard": [
        {
          "q": "How would you choose the LoRA rank?",
          "a": "BY SWEEPING IT, AND THE ELBOW TELLS YOU WHEN TO STOP - which is a much sharper rule than the usual advice to try 8 or 16. THE MEASUREMENT THAT ESTABLISHES THE RULE. On a task constructed so the true update is EXACTLY rank two, rank one gave MSE 0.96, rank two gave 0.0000 - snapping to full fine-tuning quality at 12% of the parameters - and ranks four, eight and sixteen plateaued. Constructing the task with a known intrinsic rank is what makes this a graded measurement rather than an interpretation of benchmark scores, which is how the claim is usually supported and which cannot distinguish 'the update is low rank' from 'the benchmark could not tell'. WHY RANK ONE FAILED, and it matters diagnostically: the product of a d-by-r and an r-by-d matrix has rank at most r, so a rank-two target is outside the representable set. That is a REPRESENTATIONAL limit, not an optimization one - more steps, a better learning rate, more data, none of them move it. The best achievable error is bounded below by the singular value you cannot represent. THE PRACTICAL RULE: pay until you reach the task's intrinsic rank, then stop. Extra rank buys nothing but parameters. THE HONEST DIFFICULTY: you do not know a real task's intrinsic rank. So the rule becomes a procedure rather than a number - sweep the rank and look for where the validation metric stops improving. The good news is that the two failure directions have DIFFERENT SIGNATURES, so the sweep is interpretable. Too low shows as a hard ceiling: the loss plateaus well short of full fine-tuning and is insensitive to learning rate and step count, which is unusual and distinctive. Too high shows as no further gain, more parameters, and slightly more overfitting risk on small data. HOW I WOULD RUN IT: a geometric sweep - 2, 4, 8, 16, 32 - on a validation set, comparing against a full fine-tuning reference if it fits, because the reference tells you whether the plateau you found is the task's ceiling or the adapter's. That reference is the part people skip, and without it a plateau is ambiguous. WHAT ELSE INTERACTS WITH RANK. The alpha scaling, which interacts with the effective learning rate, so changing rank without adjusting it changes two things at once. And WHICH modules get adapters - attention projections only, or the feed-forward layers too - which is often a larger decision than the rank itself, and worth sweeping first because the FFN holds roughly two thirds of a transformer block's parameters. AND THE FRAMING I would keep: rank is a capacity dial with a hard floor and a flat ceiling. That shape is unusual - most hyperparameters degrade gracefully in both directions - and it is why the sweep is cheap and the default is risky.",
          "deepDive": {
            "q": "Explain where LoRA's memory saving actually comes from.",
            "a": "NOT PRIMARILY FROM THE ADAPTER BEING SMALL, which is the usual explanation and the less important half. THE FULL FINE-TUNING BUDGET, per parameter, in a mixed-precision setup: the weight itself, a gradient, and optimizer state - which for Adam is two moment estimates, so twice the parameter count in floats. Plus a master copy of the weights in fp32 if you are doing mixed precision properly. The optimizer state and the master weights dominate: of roughly 16 bytes per parameter, about 12 are optimizer-related. THE LoRA BUDGET: the base weights are a frozen BUFFER - registered as a buffer rather than a Parameter, so autograd does not track them, no gradient is allocated for them, and the optimizer never sees them. So the 12 bytes per parameter of optimizer state disappear for the base, which is essentially all of the model. What remains is the base weights themselves, plus gradients and optimizer state for the adapter, which is 2rd parameters against d squared. SO THE DOMINANT TERM REMOVED IS OPTIMIZER STATE, not parameters. That is why LoRA fits on hardware where full fine-tuning does not by a much larger factor than the trainable-parameter ratio suggests - the trainable ratio is what people quote, and the memory ratio is better than it. WHAT ELSE CONTRIBUTES. Activations for the backward pass still have to be stored, and they scale with batch and sequence rather than with parameters - so LoRA does not remove them, which is why gradient checkpointing remains relevant and why very long sequences are still expensive. This is a common surprise: someone expects LoRA to make memory a non-issue and finds activations binding. QLoRA GOES FURTHER by storing the frozen base in four bits - 7.9 times smaller in the measurement - which attacks the one term LoRA left alone. The adapters are trained in full precision on top of that quantized base, and the measured result is the interesting part: the base alone had MSE 2.11 from quantization damage, and QLoRA reached 0.024. The adapters ABSORBED most of the error, because they are trained against the quantized base and learn to compensate for it. Not free - fp32 LoRA reached 0.000 - but recovering roughly 99% of the damage for a base nearly eight times smaller. THE COMPARISON WORTH DRAWING is with FSDP and ZeRO, which attack the same term differently: rather than eliminating optimizer state by freezing, they SHARD it across devices, which works because Adam is elementwise so each shard can be updated independently. Same observation about where the memory is - the frozen-base approach removes it and the sharding approach distributes it, and they compose. AND THE DIAGNOSTIC I would take from this: when someone says a method saves memory, ask WHICH term. Parameters, gradients, optimizer state and activations are four different budgets with different scaling, and a method that addresses one may leave you bound by another - which is exactly what happens when LoRA users discover activations."
          }
        },
        {
          "q": "Why does QLoRA work at all, given the base is damaged?",
          "a": "BECAUSE THE ADAPTERS ARE TRAINED ON TOP OF THE DAMAGED BASE AND LEARN TO COMPENSATE FOR IT - which is a genuinely non-obvious mechanism and the measurement makes it concrete. THE NUMBERS. Storing the frozen base in int4 made it 7.9 times smaller. The quantized base ALONE, evaluated without adaptation, had MSE 2.11 - that is the quantization damage, and it is large. Training full-precision LoRA adapters on top of that quantized base gave 0.024. Full-precision LoRA on an undamaged base gave 0.000. So the adapters recovered roughly 99% of the damage. WHY THAT HAPPENS. The adapters are not trained against the original model and then bolted onto a quantized one - they are trained with the quantized base in the forward pass. So the optimization sees the quantization error as part of the function it is adapting, and the low-rank update it learns includes whatever correction reduces the loss. The quantization error is not adversarial; it is a fixed, structured perturbation, and a trainable component in the same computation can partially cancel it. THE HONEST READING, which I would give rather than the enthusiastic one: it is NOT free. 0.024 against 0.000 is a real gap, small in this setting and not guaranteed to be small in another. What QLoRA buys is that a model which would not fit at all becomes trainable, and the quality cost is a fraction of the quantization damage rather than the whole of it. That is a much better trade than 'quantize and hope', and it is a worse trade than full precision. WHAT DECIDES WHETHER IT IS ACCEPTABLE. The same question as any quantization decision: what consumes the output. For a classifier where the argmax is what ships, a small logit drift is invisible. For a generative model where you sample and errors compound, the same drift is not, and the check has to be perplexity and long-output generation rather than accuracy - the blind spot from 17-06. So a QLoRA result on a classification benchmark does not license the same confidence for a generation task. WHAT ELSE IS IN REAL QLoRA beyond int4 storage, since the measurement isolated one part: a data type chosen for the weight distribution rather than a uniform integer grid, double quantization of the quantization constants themselves, and paged optimizer state to survive memory spikes. Each addresses a specific term, and the memory arithmetic from 22-03 is how you would evaluate whether each is worth its complexity. AND THE COMPARISON THAT MATTERS FOR A DECISION: QLoRA against LoRA on a smaller model at full precision, under the same memory budget. That is the frontier question again - a bigger model quantized harder versus a smaller one intact - and it is measurable rather than a matter of taste."
        },
        {
          "q": "What makes this measurement more convincing than a benchmark table?",
          "a": "THE TASK HAS A KNOWN ANSWER BY CONSTRUCTION, so the sweep is graded rather than interpreted. That is the methodological point and it generalizes well past LoRA. THE PROBLEM WITH THE USUAL EVIDENCE. LoRA's claim is that fine-tuning updates have low intrinsic rank. The standard support is a table showing that rank 8 or 16 matches full fine-tuning on a set of benchmarks. That is consistent with the claim and it is also consistent with something else entirely: that the benchmarks could not distinguish the two. PEFT accuracy is a saturated axis - even very small adapters are competitive on standard suites - so a table of near-identical scores has low power to separate hypotheses. You cannot tell 'the update was low rank' from 'the metric was insensitive'. WHAT THE CONSTRUCTED TASK DOES. Build a regression problem whose true update is exactly rank two. Now the right answer is known, the error is continuous and unbounded rather than a saturating accuracy, and each rank's result is a graded measurement against ground truth. Rank one gives 0.96 - and you know exactly why, because rank(BA) is at most r and the target is not in that set. Rank two gives 0.0000 - it recovers the update exactly. Four, eight and sixteen plateau - no further gain because there is nothing left to represent. The prediction and the observation match precisely, which is what makes it evidence rather than illustration. WHY THE FAILURE DIRECTION MATTERS. The r equals one result is the informative one, because it shows the mechanism failing in the predicted WAY. A theory that only ever succeeds is weakly supported; one that fails exactly where it says it will is much better supported. And the failure is diagnostically distinctive - insensitive to learning rate and step count, because it is representational - which gives a practitioner something to recognize in the wild. THE LIMIT, stated so the result is not over-read: this is a toy. The parameter ratio at 32 by 32 understates the real benefit badly, real tasks have no known intrinsic rank, and the interaction with pretrained representations is not modelled at all. What the toy establishes is the MECHANISM and the SHAPE of the rank-quality curve - a hard floor, a sharp elbow, a flat plateau - and that shape is what tells you how to sweep. AND THE GENERAL PRACTICE worth taking: when a claim is about a mechanism, construct a case where the mechanism's prediction is checkable, rather than reaching for a benchmark that averages over cases where you cannot tell. That is the same move as the deterministic agent environments in module 21 and the simulated allocator in 22-04, and it is what makes those results reproducible by anyone with an afternoon."
        },
        {
          "q": "When would you not use LoRA?",
          "a": "WHEN THE UPDATE YOU NEED IS NOT LOW RANK, OR WHEN THE CONSTRAINT IT SOLVES IS NOT YOUR CONSTRAINT. WHERE IT IS THE WRONG TOOL. Large distribution shifts - adapting a model to a domain or a language genuinely unlike its pretraining - where the required change is not a small correction to the existing function. The rank sweep gives the diagnostic: if quality keeps improving as rank rises well past typical values, you are being told the update is not low rank, and at that point full fine-tuning is the honest answer. Continued PRETRAINING on a large corpus, where you are not adapting a behaviour but adding knowledge, which is not what a low-rank correction is shaped for. And any case where the plateau you reach is well short of a full fine-tuning reference - which is why running that reference matters when it fits. WHERE THE CONSTRAINT IS DIFFERENT. If memory is not binding, LoRA's main benefit is unnecessary and full fine-tuning is simpler with one less hyperparameter family. If you are serving a single task, the multi-adapter serving advantage does not apply, and you would merge the adapter anyway. And if ACTIVATIONS are what is binding rather than optimizer state, LoRA does not help - activations scale with batch and sequence, not with trainable parameters, and this is a common surprise for people who expected LoRA to make memory a non-issue. Gradient checkpointing is the lever there. WHERE SOMETHING ELSE IS BETTER. If the task is really about output FORMAT or a narrow behaviour, prompting or constrained decoding may get there with no training at all - and that comparison should be run first because it is nearly free. If you need many tasks and they are small, prompt tuning or a shared adapter may be more efficient. If you have very little data, full fine-tuning risks overfitting and a LOW rank is actually an advantage as a regularizer, which is an argument FOR LoRA that gets missed. WHAT I WOULD CHECK BEFORE COMMITTING: run the rank sweep with a full fine-tuning reference on a subset, and look at the shape. A sharp elbow well below the maximum rank says LoRA is appropriate and tells you where to set it. A curve still climbing at high rank says the update is not low rank and you should reconsider. That is a few hours and it converts a default into a decision. AND THE POINT THIS MODULE WOULD ADD: the specific stack - which library, which flags, which quantization data type - will turn over. The mechanism will not. The update is either low rank or it is not, the frozen base either removes your binding memory term or it does not, and the rank sweep answers both. Those questions survive the tooling."
        },
        {
          "q": "How does adapter design affect serving?",
          "a": "IT IS ARGUABLY WHY LoRA WON, and the property is structural rather than about quality. THE STRUCTURE: the adapter is an ADDITIVE side path. The forward pass is x times W plus x times A times B, and because addition is associative you have two options that other parameter-efficient methods do not. OPTION 1 - MERGE. Compute W plus BA once and store it as a single matrix. The served model is then indistinguishable from a fully fine-tuned one, with zero inference overhead, no extra kernels and no changes to the serving path. That means adopting LoRA costs nothing at serving time if you serve one task, which removes the usual objection to parameter-efficient methods. OPTION 2 - KEEP SEPARATE. One base model in memory, many small adapters, and the adapter selected per request. That is the property that makes multi-tenant serving economical: a hundred customer-specific variants become one base plus a hundred small matrices instead of a hundred full models. Batching requests with DIFFERENT adapters in the same batch is more involved and is exactly what specialized serving support exists to do. WHY THIS BEATS THE ALTERNATIVES STRUCTURALLY. Prompt tuning prepends learned vectors, which occupies context on every request - a permanent tax on the sequence length, paid forever, and it cannot be merged away. Adapter layers inserted between blocks add sequential depth, which adds latency that cannot be merged either. LoRA's additive form is the only one of the three that can collapse into the base weights, and that is a consequence of where it sits in the computation rather than of anything about its quality. WHAT IT COSTS. Unmerged, you pay an extra small matrix multiplication per adapted layer - modest but not free, and it interacts with kernel fusion since the side path is an extra operation the compiler must handle. Merged, you lose the ability to switch tasks without recomputing, and you can no longer serve multiple adapters from one copy. So the choice is per-deployment: merge for a single-task high-throughput service, keep separate for multi-tenant. THE MEMORY ARITHMETIC AT SERVING, which follows the pattern from 22-03: an adapter at rank 8 on width 4096 is 2rd equals 65k parameters per adapted matrix, which is negligible against the base. So the number of adapters you can hold is effectively unlimited relative to the base, and the binding constraint is the base plus the KV cache as usual. AND THE POINT FOR THIS MODULE: this is a case where the DEPLOYMENT structure, not the training benefit, explains adoption. A method that trains efficiently and serves awkwardly loses to one that does both, and recognizing that shape - asking what a method implies for serving, not just for training - is a durable habit worth more than the specific method."
        },
        {
          "q": "How does this lesson relate to the module's thesis?",
          "a": "IT SEPARATES A MECHANISM WITH A LONG HALF-LIFE FROM A STACK WITH A SHORT ONE. The fine-tuning tooling in this area turns over fast - libraries, flags, quantization data types, and a steady stream of variants each claiming an improvement. What does not turn over is the mechanism: an update is either representable in low rank or it is not, freezing a base removes gradients and optimizer state, and a fixed perturbation in the forward pass can be partially absorbed by a trainable component trained against it. Those three facts explain LoRA, QLoRA and most of what will replace them. THE MEASUREMENT DISCIPLINE is the other contribution, and I think it is the more transferable one. LoRA's central claim is usually supported by benchmark tables that CANNOT distinguish 'the update is low rank' from 'the benchmark is insensitive' - because PEFT accuracy is a saturated axis where even tiny adapters look competitive. Constructing a task whose update is exactly rank two turns the claim into something graded: rank one fails at 0.96 for a reason you can state from linear algebra, rank two snaps to 0.0000, higher ranks plateau. The theory predicts the failure and the failure occurs where predicted, which is much stronger evidence than a table of similar scores. THE HONEST CAVEATS carry the module's habit. The toy's 25% parameter ratio UNDERSTATES the real benefit, because the ratio is 2r over d and collapses at real widths - saying so matters, since a reader could otherwise conclude LoRA is less impressive than it is. QLoRA is NOT free: 0.024 against full-precision LoRA's 0.000, recovering about 99% of a large quantization damage rather than all of it. And you do not know a real task's intrinsic rank, so the elbow is a procedure rather than a number. AND THE STRUCTURAL OBSERVATION worth carrying furthest: LoRA's additive form is what lets it merge for zero-overhead serving or stay separate for multi-tenant serving, and that deployment property arguably explains its adoption better than any accuracy comparison does. Asking what a method implies for SERVING, not just for training, is a habit that keeps paying - and it is the same instinct as asking which memory term a technique actually removes."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Rank is a HARD representational limit",
        "back": "ΔW = BA with B∈ℝ^{d×r}, A∈ℝ^{r×d} ⇒ rank(ΔW) ≤ r. So r=1 on a rank-2 task gave MSE 0.96 — a MATRIX fact, not a tuning problem. More steps, better LR, more data: none of it moves it."
      },
      {
        "type": "formula",
        "front": "★ The elbow, on a task with a KNOWN answer",
        "back": "r=1 → 0.96 · **r=2 → 0.0000 (= full FT) at 12% of params** · r=4/8/16 → plateau. The rule: pay until you reach the task's intrinsic rank, then stop. Extra rank buys nothing."
      },
      {
        "type": "intuition",
        "front": "The two rank failures look DIFFERENT",
        "back": "Too LOW = a hard ceiling, insensitive to LR and step count (distinctive — most hyperparameters degrade gracefully). Too HIGH = wasted params, no gain, slightly more overfitting. That asymmetry is what makes a sweep interpretable."
      },
      {
        "type": "formula",
        "front": "★ Where the memory saving REALLY comes from",
        "back": "NOT the adapter's size — the frozen base is a BUFFER: no gradient, and no OPTIMIZER STATE (Adam = 2× params; ~12 of 16 bytes/param are optimizer-related). Freezing removes the largest allocation in a training step."
      },
      {
        "type": "pitfall",
        "front": "LoRA does NOT remove activations",
        "back": "Activations for the backward pass scale with batch and sequence, not with trainable parameters. A common surprise: people expect LoRA to make memory a non-issue and find activations binding. Gradient checkpointing is the lever there."
      },
      {
        "type": "formula",
        "front": "The ratio — and an honest note about the toy",
        "back": "2rd/d² = 2r/d. 32×32 with r=4 → 25% (**the toy UNDERSTATES it badly**); width 4096 with r=8 → 0.4%. Linear in r, inverse in d, so it collapses as models get wide."
      },
      {
        "type": "intuition",
        "front": "Why B is zero-initialized",
        "back": "BA = 0 at step 0, so the adapter is an exact NO-OP and training starts from the PRETRAINED function — not a perturbation you must recover from. That's what makes attaching an adapter safe."
      },
      {
        "type": "formula",
        "front": "★ QLoRA: the adapters ABSORB the damage",
        "back": "int4 base 7.9× smaller · base alone MSE **2.11** (the quantization damage) · QLoRA **0.024** · fp32 LoRA **0.000**. The adapters are trained WITH the quantized base in the forward pass, so they learn to compensate. ~99% recovered — not free."
      },
      {
        "type": "intuition",
        "front": "Why a constructed task beats a benchmark table",
        "back": "PEFT accuracy is a SATURATED axis, so near-identical scores can't distinguish \"the update is low rank\" from \"the benchmark is insensitive\". A task built to be rank-2 makes each rank a GRADED measurement — and the theory fails exactly where predicted."
      },
      {
        "type": "intuition",
        "front": "★ The serving property that arguably won it",
        "back": "The adapter is an ADDITIVE side path, so it can MERGE into W (zero inference overhead, indistinguishable from full FT) or stay SEPARATE (one base, many per-request adapters). Prompt tuning taxes context forever; adapter layers add depth. Neither can merge."
      },
      {
        "type": "intuition",
        "front": "When LoRA is the wrong tool",
        "back": "Large distribution shifts or continued pretraining (the sweep tells you: quality still climbing at high rank = the update isn't low rank) · memory not binding · ACTIVATIONS binding instead · or the task is really format, where prompting/constrained decoding is nearly free."
      },
      {
        "type": "intuition",
        "front": "Ask WHICH memory term a method removes",
        "back": "Parameters, gradients, optimizer state, activations — four budgets with different scaling. LoRA eliminates optimizer state by freezing; FSDP/ZeRO SHARDS it (Adam is elementwise, so shards update independently). They compose."
      }
    ],
    "refs": [
      {
        "title": "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models",
        "url": "https://arxiv.org/abs/2106.09685"
      },
      {
        "title": "Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs",
        "url": "https://arxiv.org/abs/2305.14314"
      },
      {
        "title": "Aghajanyan, Zettlemoyer & Gupta (2020), Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning",
        "url": "https://arxiv.org/abs/2012.13255"
      },
      {
        "title": "Zhang et al. (2023), AdaLoRA: Adaptive Budget Allocation for Parameter-Efficient Fine-Tuning",
        "url": "https://arxiv.org/abs/2303.10512"
      },
      {
        "title": "Liu et al. (2024), DoRA: Weight-Decomposed Low-Rank Adaptation",
        "url": "https://arxiv.org/abs/2402.09353"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "distillation",
      "optimizers"
    ],
    "demoTitles": {
      "quantization": "Quantization",
      "pruning": "Pruning & Sparsity",
      "distillation": "Knowledge Distillation",
      "optimizers": "Optimizer Shootout"
    }
  }
};
