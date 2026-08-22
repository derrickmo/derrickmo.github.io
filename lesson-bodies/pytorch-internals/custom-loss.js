// GENERATED from content/lessons/pytorch-internals/custom-loss.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/pytorch-internals/custom-loss/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "custom-loss": {
    "level": "core",
    "body": {
      "intuition": [
        "Writing a loss function in PyTorch is writing a differentiable expression - autograd supplies the backward pass for free. That freedom is real, and it hides three things that bite. The composed backward may be numerically unstable even when the forward looks fine. The reduction you chose may be dividing by the wrong number. And some operations you want are not differentiable at all, so autograd will silently hand you a zero gradient rather than an error.",
        "Numerical stability is the one that produces NaN at three in the morning. The pattern is always the same: an expression that is mathematically fine has a derivative that is not. sqrt(x) is perfectly well behaved at zero and its derivative is infinite there, so a distance computed as sqrt of a sum of squares gives NaN the moment two points coincide - which happens the instant your model learns anything. log(p) is fine until p underflows. softmax followed by log overflows on large logits, while the fused log_softmax does not, because it subtracts the max first. The library's fused losses exist precisely because someone already hit each of these, and reaching for the composed version is how you rediscover them.",
        "The reduction question is subtler and more common than it should be. Almost every sequence model computes a masked loss, and almost every first implementation writes loss.mean() over a padded tensor - which divides by the padded length rather than the number of real tokens. The result is a loss that depends on how much padding happened to be in the batch, so an unusually short batch produces a spuriously small loss and a correspondingly small gradient. Nothing errors, training works, and the effective learning rate silently varies with batch composition. That is this module's theme again: the reduction abstraction did something reasonable and the mechanism it hid - what exactly it divided by - is where the bug lives."
      ],
      "math": [
        {
          "h": "The log-sum-exp trick, and why fused losses exist",
          "paras": [
            "Softmax exponentiates, which overflows for logits above about 88 in float32. Subtracting the maximum first is mathematically an identity and numerically the difference between a finite answer and an infinity.",
            "The fused log_softmax also avoids the second problem: taking log of a probability that has underflowed to zero. Computing the two steps separately loses both protections."
          ],
          "tex": "\\log \\sum_i e^{x_i} = m + \\log \\sum_i e^{x_i - m}, \\qquad m = \\max_i x_i \\\\[4pt] \\log \\text{softmax}(x)_j = x_j - m - \\log\\textstyle\\sum_i e^{x_i - m}",
          "texNote": "Read the second line: the fused form never computes a probability at all, so it never underflows to zero and never takes log of it. This is why cross_entropy takes LOGITS rather than probabilities, and why binary_cross_entropy_with_logits exists alongside binary_cross_entropy - passing a sigmoid output to the non-fused version reintroduces exactly the overflow the fused one was written to avoid."
        },
        {
          "h": "Where infinite gradients come from",
          "paras": [
            "The recurring trap: a function that is finite and continuous at a point while its derivative is not. sqrt is the canonical case and norms are how you meet it, because the moment two vectors coincide you differentiate sqrt at zero.",
            "The fix is to move the singularity out of reach with an epsilon INSIDE the square root, not to clamp the result afterwards - clamping the output does nothing to the gradient that produced it."
          ],
          "tex": "\\frac{d}{dx}\\sqrt{x} = \\frac{1}{2\\sqrt{x}} \\;\\xrightarrow{\\;x\\to 0\\;}\\; \\infty, \\qquad \\frac{\\partial}{\\partial u_k}\\lVert u - v\\rVert_2 = \\frac{u_k - v_k}{\\lVert u-v\\rVert_2}",
          "texNote": "So a Euclidean distance loss produces NaN exactly when two points become identical, which is what a metric-learning objective is actively trying to achieve for positive pairs. Use sqrt(x + eps), or work with squared distances and avoid the root entirely - the squared form has a bounded derivative everywhere and usually optimizes the same ordering."
        },
        {
          "h": "Masked reduction: divide by what is real",
          "paras": [
            "The per-element loss is computed with reduction none, multiplied by the mask, and then divided by the number of unmasked elements. Using mean() instead divides by the padded count.",
            "The consequence is that the gradient magnitude depends on the padding fraction, so the effective learning rate varies with batch composition - invisibly."
          ],
          "tex": "\\mathcal{L} = \\frac{\\sum_{i} m_i \\, \\ell_i}{\\sum_i m_i} \\qquad\\text{not}\\qquad \\frac{1}{N}\\sum_i m_i \\, \\ell_i",
          "texNote": "The two agree only when nothing is masked. Note also the interaction with GRADIENT ACCUMULATION: if you accumulate over k micro-batches you must divide by k, and if the micro-batches have different numbers of real tokens then dividing each by its own token count and then by k is subtly not the same as dividing the total loss by the total tokens. For token-level objectives the second is what you want."
        }
      ],
      "code": [
        {
          "h": "The stability rules, as a table you can apply",
          "paras": [
            "Each row is a composed expression that is mathematically correct and numerically wrong, next to the fused operation that exists because of it. Learning the pattern matters more than the list: the danger is always an exp that can overflow or a log that can see zero."
          ],
          "code": "# COMPOSED (unstable)                    FUSED (use this)\n# ---------------------------------------------------------------------\n# log(softmax(x))                         F.log_softmax(x)\n# nll_loss(log(softmax(x)), y)            F.cross_entropy(x, y)       <- LOGITS\n# bce(sigmoid(x), y)                      F.binary_cross_entropy_with_logits\n# log(sigmoid(x))                         F.logsigmoid(x)\n# log(sum(exp(x)))                        torch.logsumexp(x, dim)\n# log(1 + x)  for small x                 torch.log1p(x)\n# exp(x) - 1  for small x                 torch.expm1(x)\n\n# THE SQRT TRAP - the most common NaN in metric learning:\nd = torch.sqrt(((u - v) ** 2).sum(-1))        # NaN when u == v: d/dx sqrt -> inf\nd = torch.sqrt(((u - v) ** 2).sum(-1) + 1e-8) # eps INSIDE the root\nd2 = ((u - v) ** 2).sum(-1)                   # or avoid the root entirely -\n                                              # squared distance is smooth\n                                              # everywhere and usually preserves\n                                              # the ordering you cared about.\n#\n# NOTE: clamping the OUTPUT does nothing. d.clamp(min=1e-8) leaves the\n# gradient of the sqrt that produced it untouched, and that gradient is what\n# is infinite. The epsilon has to be inside.\n\n# DIVISION BY A NORM has the same shape:\nx = x / x.norm(dim=-1, keepdim=True)                     # NaN on a zero vector\nx = x / x.norm(dim=-1, keepdim=True).clamp_min(1e-6)     # bounded\nx = F.normalize(x, dim=-1, eps=1e-12)                    # or just use this",
          "caption": "The pattern beneath the table: every unstable form contains an exp that can overflow or a log that can see zero, and the fused op restructures the algebra so neither happens. The sqrt trap is separate - a finite function with an infinite derivative, and clamping the output cannot fix it."
        },
        {
          "h": "Masked loss, accumulation, and clipping in the right order",
          "paras": [
            "Three things that interact, and the interactions are where the silent bugs are. The order of unscale, clip, and step matters under mixed precision, and the clip function returns a number worth logging."
          ],
          "code": "# MASKED LOSS - divide by real tokens, not padded length.\nper_tok = F.cross_entropy(logits.transpose(1, 2), targets, reduction=\"none\")\nloss = (per_tok * mask).sum() / mask.sum().clamp_min(1)\n#      NOT (per_tok * mask).mean(), which divides by the PADDED count, making\n#      the loss - and hence the gradient scale - depend on how much padding\n#      happened to be in this batch. Nothing errors; your effective learning\n#      rate just varies with batch composition.\n#\n# (Or simply use ignore_index=PAD, which does this correctly for you.)\n\n# GRADIENT ACCUMULATION + CLIPPING + AMP, in the only correct order:\nfor i, batch in enumerate(loader):\n    with torch.autocast(\"cuda\", dtype=torch.bfloat16):\n        loss = compute_loss(batch) / ACCUM        # <-- divide, or the effective\n    scaler.scale(loss).backward()                 #     LR is ACCUM times larger\n    if (i + 1) % ACCUM == 0:\n        scaler.unscale_(opt)                      # 1. UNSCALE first, or you\n                                                  #    clip the scaled gradients\n                                                  #    (i.e. a random threshold)\n        gn = nn.utils.clip_grad_norm_(model.parameters(), 1.0)   # 2. clip\n        scaler.step(opt); scaler.update()         # 3. step\n        opt.zero_grad(set_to_none=True)\n        log(\"grad_norm\", gn)   # <-- clip_grad_norm_ RETURNS the PRE-CLIP norm.\n                               # Log it. It is the single best early-warning\n                               # signal for instability, and it is free.\n\n# WHEN YOU NEED A CUSTOM autograd.Function - and how to know it is right:\nclass STE(torch.autograd.Function):           # straight-through estimator\n    @staticmethod\n    def forward(ctx, x): return (x > 0).float()   # not differentiable\n    @staticmethod\n    def backward(ctx, g): return g                # pretend it was the identity\n\n# ALWAYS gradcheck a hand-written backward, in float64:\ntorch.autograd.gradcheck(MyFn.apply, (x.double().requires_grad_(),))\n# A wrong backward does not crash. The loss still falls, slightly worse, and\n# you will never find it from a training curve.",
          "caption": "Unscale before clipping or you are clipping scaled gradients against a threshold that means nothing. And clip_grad_norm_ returns the pre-clip norm - logging that one number is the cheapest instability warning available."
        }
      ],
      "useCases": [
        "Sequence models with padding, where a correctly masked and correctly normalized loss is the difference between a stable objective and one whose gradient scale drifts with batch composition.",
        "Metric learning, contrastive objectives and anything computing distances, where the sqrt-at-zero trap appears the moment the model succeeds at pulling positive pairs together - the failure arrives precisely when training starts working.",
        "Custom objectives that mix terms - a reconstruction loss plus a KL term plus a regularizer - where relative scaling, per-term logging, and stable formulations for each piece decide whether the combination trains at all.",
        "Quantization-aware training and discrete latent models, where the forward pass is deliberately non-differentiable and a straight-through estimator supplies a surrogate gradient that autograd cannot derive for you."
      ],
      "pitfalls": [
        "Computing log(softmax(x)) or bce(sigmoid(x), y) instead of the fused versions. The composed forms overflow on large logits and take log of underflowed zeros; cross_entropy and binary_cross_entropy_with_logits exist because someone already hit both.",
        "Taking sqrt of something that can be zero. The derivative is infinite there, so a Euclidean distance produces NaN exactly when two points coincide - which is what a contrastive objective is trying to achieve. Put the epsilon INSIDE the root, or use squared distances.",
        "Clamping the output to fix a gradient problem. d.clamp(min=eps) leaves the gradient of the operation that produced d untouched, and that gradient is the infinite one. The stabilizer has to be upstream of the singularity.",
        "Using .mean() on a masked loss. It divides by the padded length rather than the real token count, so the loss and its gradient scale depend on how much padding was in the batch - a silently varying effective learning rate. Divide by mask.sum().",
        "Clipping gradients before unscaling under mixed precision. The gradients still carry the loss scaler's factor, so your clip threshold is being compared against a number that is thousands of times too large and the clip effectively never fires.",
        "Forgetting to divide the loss by the accumulation count. Accumulating k micro-batches without dividing makes the effective learning rate k times larger, which usually presents as divergence a few hundred steps in rather than as an obvious error.",
        "Writing a custom autograd.Function without gradcheck. A wrong backward does not crash - training still proceeds and converges slightly worse, and no training curve will ever reveal it. Check in float64, including at awkward inputs like zeros and boundaries."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/custom-autograd",
          "text": "Where the Function API and the graph mechanics are developed properly. This lesson is the applied side: when the composed backward is not good enough, and how to verify the one you wrote by hand."
        },
        {
          "ref": "training-systems/training-stability",
          "text": "The systems-level treatment of the same failures - loss spikes, NaN recovery, skip-step guards and dynamic loss scaling. The numerical rules here are what stop those failures from being generated in the first place."
        },
        {
          "ref": "training-systems/mixed-precision",
          "text": "Why unscale must precede clipping, and why fp16 makes every stability question in this lesson sharper - a formulation that survives in float32 can underflow in half precision, which is why bf16 is preferred where available."
        },
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "Where anomaly detection and gradient-flow inspection live. The single most useful habit from this lesson - logging the pre-clip gradient norm every step - is a diagnostic that costs nothing and warns before the loss does."
        },
        {
          "ref": "generative/vae",
          "text": "A worked example of a multi-term objective: reconstruction plus KL, with the log-variance parameterization chosen specifically so that exponentiating cannot produce a negative variance and the KL term stays finite."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does cross_entropy take logits rather than probabilities?",
          "a": "So it can fuse log and softmax and use the log-sum-exp trick. Computing softmax then log overflows on large logits and takes log of underflowed zeros."
        },
        {
          "q": "What is the log-sum-exp trick?",
          "a": "log(sum(exp(x))) = m + log(sum(exp(x - m))) with m the maximum. Subtracting the max before exponentiating prevents overflow and is mathematically an identity."
        },
        {
          "q": "Why does sqrt cause NaN?",
          "a": "Its derivative is 1/(2*sqrt(x)), which is infinite at zero. So a Euclidean distance produces NaN exactly when two points coincide."
        },
        {
          "q": "How do you fix the sqrt trap?",
          "a": "Put the epsilon inside the root - sqrt(x + eps) - or use squared distances. Clamping the output does nothing, because the infinite gradient came from the operation upstream."
        },
        {
          "q": "What is wrong with .mean() on a masked loss?",
          "a": "It divides by the padded length instead of the real token count, so the loss and gradient scale depend on how much padding is in the batch. Divide by mask.sum()."
        },
        {
          "q": "Why divide the loss by the accumulation count?",
          "a": "Because gradients accumulate additively. Without it the effective learning rate is k times larger, which usually shows up as divergence a few hundred steps in."
        },
        {
          "q": "Why must you unscale before clipping under AMP?",
          "a": "The gradients still carry the loss scaler's factor, so comparing them against your clip threshold is meaningless and the clip effectively never fires."
        },
        {
          "q": "What does clip_grad_norm_ return?",
          "a": "The total gradient norm BEFORE clipping. Logging it is the cheapest early-warning signal for instability available."
        },
        {
          "q": "What is the difference between clip_grad_norm_ and clip_grad_value_?",
          "a": "Norm clipping rescales all gradients together, preserving their direction. Value clipping clamps each element independently, which changes the direction."
        },
        {
          "q": "When do you need a custom autograd.Function?",
          "a": "When the operation is not differentiable and you want a surrogate gradient, when you can write a numerically better backward than the composed one, or when you want to trade recompute for memory."
        },
        {
          "q": "What is a straight-through estimator?",
          "a": "Use a non-differentiable operation in the forward pass and pretend it was the identity in the backward, so gradients flow through a threshold or a quantizer."
        },
        {
          "q": "Why gradcheck a custom backward?",
          "a": "Because a wrong backward does not crash. Training proceeds, converges slightly worse, and no training curve will reveal it. Check in float64."
        }
      ],
      "standard": [
        {
          "q": "Your loss becomes NaN partway through training. How do you find the cause?",
          "a": "I would localize before theorizing, because there are only a handful of causes and they are quickly distinguished. STEP 1: WHEN AND WHERE. Is it at a specific step, or after a specific batch? Log the loss every step and check whether it spiked before going NaN or jumped straight to it. A spike then NaN suggests instability - an exploding gradient or a bad batch. Immediate NaN suggests a singularity in the loss expression itself. STEP 2: FIND THE FIRST NaN. torch.autograd.set_detect_anomaly(True) makes the backward pass raise at the operation that produced the NaN, with a traceback to where that operation was created in the forward. It is extremely slow, so I would enable it only for a targeted rerun, but it names the culprit directly rather than leaving me to guess. STEP 3: THE USUAL CAUSES, roughly in order. (a) SQRT OR NORM AT ZERO - the derivative is infinite there, so any distance computation NaNs the moment two vectors coincide. This is the most common one in metric learning and it appears exactly when the model starts working. (b) LOG OF ZERO - a probability that underflowed, usually from a hand-composed softmax-then-log rather than the fused log_softmax. (c) DIVISION BY A NORM or a count that can be zero, including a mask that is all-zero for some sequence in the batch. (d) EXPLODING GRADIENTS - the loss was rising before it went NaN, and gradient norm was climbing. (e) fp16 OVERFLOW - values above about 65,000 become inf, then inf minus inf is NaN. Very common in attention logits and in loss terms with large scale. (f) A BAD BATCH - a sample with a NaN or an extreme value in the input. STEP 4: THE CHEAP CHECKS that distinguish them. Log the gradient norm every step - clip_grad_norm_ returns it for free - and look at its trajectory before the failure. If it was climbing, the cause is (d) or (e). If it was flat and then NaN appeared instantly, the cause is a singularity, (a) to (c). Check the inputs with torch.isfinite on the batch. And check whether it reproduces with the same seed and the same batch, which distinguishes a data problem from an accumulation problem. STEP 5: THE FIXES, matched to the cause. Epsilon inside the sqrt rather than clamping the output; fused losses instead of composed ones; clamp_min on any denominator; gradient clipping with the unscale-then-clip order under AMP; and a skip-step guard that checks torch.isfinite on the gradients before opt.step, so one bad batch does not poison every weight. THE PREVENTION I WOULD ARGUE FOR. Most of this is avoidable by construction: use the fused losses, never take a bare sqrt, and log the gradient norm from the first day. The gradient-norm log in particular converts this whole investigation into a glance at a chart, because instability is visible in it many steps before the loss shows anything.",
          "deepDive": {
            "q": "Explain what makes fp16 so much more fragile than bf16 here, and what changes.",
            "a": "THE FORMATS. Both are 16 bits. fp16 spends 5 bits on the exponent and 10 on the mantissa; bf16 spends 8 on the exponent and 7 on the mantissa. bf16's exponent field is the SAME WIDTH as fp32's, so it has the same dynamic range - roughly 1e-38 to 3e38 - with less precision. fp16's range is roughly 6e-8 to 65504. THE CONSEQUENCE FOR OVERFLOW. In fp16, anything above 65504 becomes inf. Attention logits before the softmax, a squared-error loss on unnormalized targets, a sum over a long sequence - all of these routinely exceed that. And once you have an inf, the next subtraction produces NaN, which then propagates through every parameter it touches on the backward pass. In bf16 this simply does not happen, because the range matches fp32. THE CONSEQUENCE FOR UNDERFLOW, which is the subtler half. Gradients in fp16 that fall below about 6e-8 flush to zero, and a large fraction of gradients in a trained network are that small. Those parameters then receive no update at all. This is why fp16 training REQUIRES loss scaling: multiply the loss by a large factor so the gradients land in representable range, then unscale before the optimizer step. bf16 has enough range that loss scaling is unnecessary, which removes an entire subsystem - the scaler, its dynamic adjustment, the skipped steps when it overflows, and the unscale-before-clip ordering requirement. WHAT bf16 COSTS. Precision: 7 mantissa bits versus 10, so roughly 3 fewer bits of relative accuracy per value. In practice this matters far less than the range does, because neural network training is remarkably tolerant of noise in individual values and intolerant of infinities. The one place it does matter is accumulation: summing many bf16 values loses precision quickly, which is why reductions and the master weights are kept in fp32 regardless of the compute dtype. THE PRACTICAL RULES THAT FOLLOW. On hardware supporting bf16 - Ampere and later, and TPUs - use bf16 and delete the GradScaler. On older hardware you are stuck with fp16 and need loss scaling, and then the ordering discipline in this lesson becomes load-bearing: unscale before clipping, check for inf before stepping, and expect the scaler to skip steps occasionally, which is normal behaviour rather than a bug. AND THE PART PEOPLE MISS: autocast does not cast everything. It keeps a list of operations that must stay in fp32 - softmax, layer norm, reductions, and the loss functions - precisely because those are where the range and accumulation problems concentrate. So a hand-written loss inside an autocast region may run in a dtype you did not intend, and if you have written your own numerically delicate operation you may need to force it to fp32 explicitly. That is a real and under-documented source of instability in custom objectives."
          }
        },
        {
          "q": "Explain gradient clipping - the variants, where it goes, and how you would tune it.",
          "a": "WHY IT EXISTS. Gradient magnitudes in deep networks are heavy-tailed: most steps are ordinary and occasionally one batch produces a gradient orders of magnitude larger, which takes a step so large it destroys the parameters. Pascanu et al. introduced clipping for exactly this in RNNs, where the recurrent Jacobian's repeated multiplication makes the tail especially heavy. It is a simple, effective guard and it is standard in essentially all transformer training. THE TWO VARIANTS, and the difference matters. NORM CLIPPING computes the global L2 norm across all parameters and, if it exceeds a threshold, rescales EVERY gradient by the same factor. The direction is preserved exactly; only the step length is capped. VALUE CLIPPING clamps each element independently to a range, which CHANGES THE DIRECTION - a gradient with one huge component and many small ones becomes a different direction after clamping. Norm clipping is almost always what you want, and it is what people mean by gradient clipping without qualification. Value clipping is occasionally used as a crude safety net. THE ORDERING, which is where the bugs are. The sequence is backward, then unscale if using a GradScaler, then clip, then step. Two mistakes are common. Clipping before unscaling means your threshold is compared against gradients still multiplied by the loss scale - typically tens of thousands - so the clip never fires and you have silently disabled it. And clipping after the optimizer step obviously does nothing, but it is easy to write in a refactor and produces no error. Under gradient accumulation, clip once before the step, not per micro-batch. HOW I WOULD TUNE THE THRESHOLD. Not by guessing - by measuring. clip_grad_norm_ RETURNS the pre-clip norm, so log it from the first run and look at its distribution. Then set the threshold somewhere around the high percentile of the normal range, so it clips the tail and leaves the body alone. A threshold of 1.0 is the common default and it is a default rather than a principle: if your typical gradient norm is 0.05, a threshold of 1.0 never fires and you have no protection; if it is 40, a threshold of 1.0 clips every step and you have effectively replaced your optimizer with sign-like normalized steps. I would also log the CLIP FRACTION - what proportion of steps are being clipped. Near zero means it is doing nothing; near one means it is dominating your update rule. Somewhere in the low percentage range is the intent. WHAT CLIPPING DOES NOT FIX. It bounds the damage from an exploding gradient; it does not address the cause. If gradients are exploding every step, the problem is a learning rate that is too high, a bad initialization, a missing normalization layer, or a numerically unstable loss - and clipping will mask that while training slowly and badly. So a rising clip fraction is a signal to investigate rather than a sign the guard is working. THE HABIT I WOULD RECOMMEND. Log gradient norm and clip fraction every step, permanently. They cost nothing, they are the earliest visible symptom of most training instabilities, and they turn 'the loss went NaN' into 'the gradient norm had been climbing for two hundred steps'."
        },
        {
          "q": "When should you write a custom autograd.Function rather than composing operations?",
          "a": "Autograd composes backwards automatically and correctly, so the default answer is do not. There are four real reasons to override it. REASON 1: THE FORWARD IS NOT DIFFERENTIABLE and you want a surrogate gradient. Thresholding, argmax, rounding, quantization, sampling from a discrete distribution - autograd will give you zero or nothing. A straight-through estimator does the discrete thing forward and passes the gradient through as if it were the identity, which is what makes quantization-aware training and discrete latent variable models trainable. This is the most common legitimate reason. REASON 2: A NUMERICALLY BETTER BACKWARD EXISTS. The composed backward differentiates each primitive and multiplies, which can be less stable than the analytic derivative of the whole expression. The library's fused losses are exactly this - log_softmax's backward is a clean subtraction rather than a chain through an exp that may have overflowed. If you have derived a closed form that avoids a cancellation or a singularity the composition hits, that is worth implementing. REASON 3: MEMORY. Autograd saves whatever the backward needs, which for a long chain of cheap operations can be many intermediate tensors. A custom Function can save only the inputs and RECOMPUTE the intermediates in backward, trading compute for memory. That is exactly what gradient checkpointing does, generalized. Also useful when you can express the backward in terms of the OUTPUT rather than the intermediates - a common trick that halves what needs saving. REASON 4: WRAPPING A NON-PYTORCH OPERATION - a custom CUDA kernel, a call into another library, a numerical solver - where there is no graph to compose and you must supply the derivative yourself. Implicit differentiation of an optimization problem's solution lives here too. WHAT IT COSTS, and why the default should be no. You now own correctness. A wrong backward does not crash: training proceeds, converges a little worse, and no training curve will ever tell you. You also lose composability with some parts of the stack - fx tracing, torch.compile, and some vmap and functorch transforms need extra work or setup_context to handle a custom Function. THE DISCIPLINE IF YOU DO IT. gradcheck in float64, always, and at awkward inputs - zeros, boundaries, values where a branch changes - not just at a random point where any smooth wrong function might pass. gradgradcheck if second derivatives will be taken. Save only what you need with ctx.save_for_backward, since saving the output and the input both is a common way to double memory unnecessarily. And return exactly one gradient per forward input, with None for the ones that do not need it - a shape mismatch here is a confusing error. THE ONE-LINE SUMMARY. Write a custom Function when autograd cannot express what you need or expresses it badly, and treat the hand-written backward as code that requires a test, because it is the one part of a training pipeline whose failure is completely invisible.",
          "deepDive": {
            "q": "Walk through implementing a straight-through estimator for quantization, and what its gradient is actually doing.",
            "a": "THE SETUP. Quantization-aware training wants the forward pass to use quantized weights - so the network experiences the error it will experience at deployment - while the optimizer updates full-precision weights. The quantizer is a rounding operation, whose derivative is zero almost everywhere and undefined at the step boundaries. Backpropagating through it honestly gives zero gradient everywhere, and nothing learns. THE IMPLEMENTATION. Forward: q = round(clamp(x / s, qmin, qmax)) * s for a scale s. Backward: return the incoming gradient unchanged for inputs inside the clamp range, and ZERO for inputs outside it. That second part is important and is often omitted. The naive straight-through estimator passes the gradient through unconditionally; the clipped version - sometimes called the clipped STE - zeroes the gradient where the input was saturated, which is correct in the sense that moving a weight further into the saturated region genuinely changes nothing in the forward pass. Omitting it means saturated weights keep receiving gradient telling them to move further out, and they drift arbitrarily far while having no effect. WHAT THE GRADIENT ACTUALLY IS. It is not the derivative of anything. Pretending round is the identity means we are computing the gradient of a DIFFERENT function - the one without quantization - and applying it to update the parameters of the one with it. So the STE is a biased estimator, deliberately. The justification is empirical and partly theoretical: the quantization error behaves somewhat like noise, and the gradient of the un-quantized function is a reasonable descent direction for the quantized one when the quantization is fine enough. The bias grows as the bit width falls, which is exactly why very low-bit training is harder and needs additional tricks. Bengio et al. introduced it for stochastic neurons and it has been reinvented in every discrete-latent setting since. THE VARIANTS WORTH KNOWING. The scale s can itself be learned, which requires a gradient through the quantizer with respect to the scale - LSQ derives this properly and it is a genuine improvement over a fixed or calibrated scale. And Gumbel-softmax is the alternative philosophy: instead of a biased gradient through a hard operation, relax the operation to a continuous one, get an unbiased gradient of the relaxed objective, and anneal the temperature. Bias in the gradient versus bias in the objective - that is the real choice, and it is the same trade as score-function versus reparameterized estimators. HOW I WOULD VERIFY IT. gradcheck will FAIL, correctly, because the implemented backward is deliberately not the true derivative. So the test is different: assert that the forward output is exactly the quantized value, that the backward returns the incoming gradient unchanged inside the range and zero outside, and that a small training run on a toy problem converges to something close to the full-precision result. That is a case where the usual verification tool does not apply and you have to state what correctness means for yourself - which is worth recognizing, because reaching for gradcheck and being confused when it fails is the common experience here."
          }
        },
        {
          "q": "How do you correctly implement a masked loss for variable-length sequences?",
          "a": "THE REQUIREMENT. Padded positions must contribute nothing to the loss and nothing to the gradient, and the normalization must be by the number of REAL elements. Both halves matter and the second is the one usually got wrong. THE TWO CORRECT APPROACHES. (1) IGNORE_INDEX, which is the simplest and what I would use by default. Set padded target positions to a sentinel and pass ignore_index to cross_entropy. It excludes them from both the sum and the count, so the normalization is automatically by real tokens. Fewer moving parts, harder to get wrong. (2) EXPLICIT MASKING: compute per-element loss with reduction='none', multiply by the mask, sum, and divide by mask.sum(). Necessary when the loss is custom or when you need per-sequence weighting. THE MISTAKE, which is extremely common: (per_token_loss * mask).mean(). That sums the masked losses and divides by the TOTAL number of elements including padding. So a batch that happens to contain short sequences has a lot of padding, the divisor is too large, and the loss - and therefore the gradient magnitude - is spuriously small. The effective learning rate now varies with batch composition, invisibly. Nothing errors and training works; it just works worse and inconsistently. THE SECOND-ORDER QUESTION, which is a genuine design decision rather than a bug: normalize per TOKEN or per SEQUENCE? Dividing the whole batch's masked sum by the total real token count weights every token equally, so long sequences contribute more to the update. Computing a per-sequence mean first and then averaging over sequences weights every sequence equally regardless of length. These give different models. For language modelling, per-token is standard and correct, because the objective is per-token likelihood. For a classification-like task with one label per sequence, per-sequence is right. State which one you intend, because both are defensible and the difference is invisible in the loss value. THE INTERACTION WITH GRADIENT ACCUMULATION, which is subtle. If you accumulate k micro-batches, each normalized by its own token count, and then divide by k, you have computed the average of per-micro-batch averages - which is NOT the same as the average over all tokens unless every micro-batch has the same real-token count. For token-level objectives the correct thing is to accumulate the SUM of losses and the SUM of token counts across micro-batches and divide once at the end. Most implementations do the approximate version and it is usually fine, but it is worth knowing it is an approximation, and it matters more when sequence lengths vary a lot. THE OTHER MASKING that must match: the ATTENTION mask. A loss mask without a matching attention mask means the model attends to padding - it learns to use garbage positions, and the failure is a quality degradation with no error. The two masks are related but not identical, since causal masking and padding masking compose. THE CHECK I WOULD WRITE. Construct a batch, compute the loss, then compute it again with different amounts of padding on the same real content and assert the values match to floating-point tolerance. That single test catches every normalization error in this answer, and it takes ten lines."
        },
        {
          "q": "What is the difference between detach, no_grad, and .data - and when do you use each?",
          "a": "detach() RETURNS A NEW TENSOR sharing the same storage but disconnected from the graph. Operations on the original still record; the detached one is a leaf with requires_grad False. Use it when you want a VALUE from the graph without the gradient path: logging a loss, storing an activation, computing a target for a self-supervised objective, or stopping gradient in one branch of a two-branch architecture. The stop-gradient in BYOL and in SimSiam is literally a detach, and it is load-bearing there rather than incidental - removing it collapses the model. torch.no_grad() IS A CONTEXT that disables graph construction entirely for everything inside it. Use it for inference, for validation, and for any computation whose result will never need gradients - updating an EMA teacher, computing a metric, or modifying parameters in place. The difference from detach is scope: detach is per-tensor and surgical, no_grad is per-region and wholesale. .data IS LEGACY AND SHOULD NOT BE USED. It returns a tensor sharing storage with requires_grad stripped, similar to detach, but it BYPASSES autograd's version counter - the mechanism that detects when a tensor needed for backward has been modified in place. So mutating through .data can silently produce wrong gradients, where the same mutation through detach would raise a clear error telling you the tensor was modified. It exists for backward compatibility, it is a footgun, and detach does the same job safely. If you see .data in code, it is either very old or a bug waiting. THE ONES PEOPLE CONFUSE. detach() versus no_grad(): if you want the whole block cheap, use no_grad, because detach still builds the graph up to the point you detach and pays the memory for it. Conversely, no_grad inside a training step disables gradients for everything, including things you needed. requires_grad_(False) versus detach(): the first FREEZES a parameter permanently for the optimizer, the second cuts a single tensor out of one graph. Freezing a backbone is requires_grad_(False); stopping gradient flow through one path in the forward is detach. inference_mode() versus no_grad(): the former is faster and marks its outputs so they can never re-enter autograd at all, which is right for serving and wrong if the results feed anything differentiable. THE PLACES THIS MATTERS MOST. Accumulating metrics: appending loss rather than loss.item() or loss.detach() to a list keeps the entire graph alive for every step, which is the classic memory leak in training loops and presents as steadily growing memory with no other symptom. EMA teacher updates: must be under no_grad, and the update is in-place on parameters. Two-branch self-supervised architectures: the detach is the method, not an optimization. And target networks in reinforcement learning: the bootstrap target must be detached, or you are differentiating through your own target, which is the moving-target instability."
        },
        {
          "q": "You have a loss with three terms. How do you weight and monitor them?",
          "a": "THE FIRST THING I WOULD DO IS LOG THEM SEPARATELY, before touching any weights. A combined loss tells you almost nothing: it can fall while one term rises, one term can be three orders of magnitude larger and dominate everything, and a term can be silently zero because of a bug. Logging each term - and each term's contribution AFTER weighting - takes three lines and it is the difference between tuning and guessing. I have seen a great deal of time spent tuning weights on a term that was zero because a mask was wrong. THE SCALE PROBLEM. Terms usually have wildly different natural magnitudes: a reconstruction MSE over many pixels versus a KL over a few latent dimensions versus a regularizer. The weight you choose is doing two jobs at once - correcting for scale, and expressing a genuine preference about the trade-off - and conflating them makes the hyperparameter uninterpretable and non-transferable. I would normalize each term to a comparable scale first, for example by dividing by its number of elements or by its value at initialization, and only then apply preference weights. Then a weight of 1.0 means something. HOW I WOULD SET THE WEIGHTS. (1) Start from the scale-normalized version with all weights at one and look at what happens. (2) Sweep the most important weight over a log grid, since these are scale parameters and a linear sweep wastes most of its points. (3) Check the PARETO behaviour rather than only the combined number - plot term A against term B across the sweep, because the combined loss hides whether you are trading or improving both. (4) Be suspicious of weights tuned to three significant figures; if performance is that sensitive, something else is wrong. THE ALTERNATIVES TO HAND-TUNING, worth knowing. Uncertainty weighting learns a per-task weight parameterized as a log-variance, so the model down-weights terms it cannot fit - principled, one extra parameter per term, and it works well for genuinely multi-task losses. GradNorm balances weights so each term's gradient magnitude is comparable. And for a constrained problem - minimize A subject to B below a threshold - a Lagrangian formulation with a learned multiplier is often much better than a fixed weight, because the multiplier adapts to keep the constraint satisfied rather than requiring you to know the right trade-off in advance. Beta-VAE's KL weighting and the KL-constrained RLHF objective are both instances of this. WHAT I WOULD MONITOR THROUGHOUT. Each term's raw value, each term's weighted contribution, and the GRADIENT NORM CONTRIBUTED BY EACH TERM - which is the one people never log and is the most informative, because a term can have a small value and a large gradient. Computing it costs one backward per term, so I would do it occasionally rather than every step. If one term supplies 95% of the gradient, that term is your objective and the others are decoration, regardless of what the weights say. THE FAILURE MODE TO WATCH FOR. A term that gets driven to zero early and then contributes nothing - posterior collapse in a VAE is exactly this, and the standard responses are KL annealing or a free-bits floor. If a term's value flatlines at its minimum, the optimization has found a degenerate solution to it and the weight will not fix that."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Log-sum-exp trick",
        "back": "log(sum(exp(x))) = m + log(sum(exp(x-m))), m = max(x). Mathematically an identity, numerically the difference between finite and inf. It is why cross_entropy takes LOGITS - the fused form never materializes a probability, so it never takes log of an underflowed zero."
      },
      {
        "type": "pitfall",
        "front": "The sqrt trap",
        "back": "d/dx sqrt(x) = 1/(2 sqrt(x)) -> INFINITE at 0. A Euclidean distance NaNs exactly when two points coincide - which is what contrastive learning is trying to achieve. Fix: eps INSIDE the root, or use squared distances."
      },
      {
        "type": "pitfall",
        "front": "Clamping the output cannot fix a gradient",
        "back": "d.clamp(min=eps) leaves untouched the gradient of the operation that PRODUCED d - and that is the infinite one. The stabilizer must be UPSTREAM of the singularity."
      },
      {
        "type": "formula",
        "front": "Masked loss normalization",
        "back": "L = sum(m*l) / sum(m), NOT (m*l).mean(). The wrong version divides by the PADDED count, so loss and gradient scale depend on how much padding was in the batch - a silently varying effective learning rate. Or just use ignore_index."
      },
      {
        "type": "intuition",
        "front": "Per-token vs per-sequence normalization",
        "back": "Dividing by total real tokens weights every TOKEN equally (long sequences contribute more). Per-sequence mean then averaged weights every SEQUENCE equally. Both defensible, they give different models, and the difference is invisible in the loss value. State which you intend."
      },
      {
        "type": "pitfall",
        "front": "AMP ordering: unscale -> clip -> step",
        "back": "Clip before unscaling and your threshold is compared against gradients still carrying the loss scale (tens of thousands), so the clip NEVER FIRES and you have silently disabled it. Under accumulation, clip once before the step, not per micro-batch."
      },
      {
        "type": "intuition",
        "front": "clip_grad_norm_ returns the PRE-CLIP norm",
        "back": "Log it every step - the cheapest early-warning signal for instability, visible hundreds of steps before the loss moves. Also log the CLIP FRACTION: ~0 means the guard does nothing; ~1 means clipping has replaced your optimizer with normalized steps."
      },
      {
        "type": "definition",
        "front": "Norm clipping vs value clipping",
        "back": "NORM: rescales all gradients by one factor, so DIRECTION IS PRESERVED and only step length is capped. VALUE: clamps elements independently, which CHANGES the direction. Norm clipping is what people mean by 'gradient clipping' unqualified."
      },
      {
        "type": "intuition",
        "front": "fp16 vs bf16",
        "back": "bf16 has fp32's EXPONENT WIDTH, so the same range with less precision - no overflow above 65504, and NO LOSS SCALING NEEDED. fp16 needs a GradScaler because gradients below ~6e-8 flush to zero. Range matters far more than precision in training."
      },
      {
        "type": "pitfall",
        "front": "gradcheck any hand-written backward",
        "back": "A wrong backward does NOT crash - training proceeds, converges slightly worse, and no curve reveals it. Check in float64 at AWKWARD inputs (zeros, boundaries), not a random smooth point. Note a straight-through estimator will fail gradcheck BY DESIGN."
      },
      {
        "type": "definition",
        "front": "detach vs no_grad vs .data",
        "back": "detach(): per-tensor, surgical, cuts one path (BYOL/SimSiam's stop-grad IS this). no_grad(): per-region, no graph built at all. .data: LEGACY - bypasses the version counter, so in-place mutation through it silently corrupts gradients. Never use it."
      },
      {
        "type": "intuition",
        "front": "Log each loss term's GRADIENT norm, not just its value",
        "back": "A term can have a small value and a large gradient. If one term supplies 95% of the gradient, that term IS your objective regardless of what the weights say. Also normalize terms to comparable scale BEFORE applying preference weights, or the weight is doing two jobs."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Autograd mechanics",
        "url": "https://pytorch.org/docs/stable/notes/autograd.html"
      },
      {
        "title": "PyTorch: Extending PyTorch - custom autograd Functions",
        "url": "https://pytorch.org/docs/stable/notes/extending.html"
      },
      {
        "title": "Pascanu, Mikolov & Bengio (2013), On the Difficulty of Training Recurrent Neural Networks",
        "url": "https://arxiv.org/abs/1211.5063"
      },
      {
        "title": "Bengio, Leonard & Courville (2013), Estimating or Propagating Gradients Through Stochastic Neurons",
        "url": "https://arxiv.org/abs/1308.3432"
      },
      {
        "title": "Gulrajani et al. (2017), Improved Training of Wasserstein GANs (gradient penalty)",
        "url": "https://arxiv.org/abs/1704.00028"
      }
    ],
    "demos": [
      "backprop",
      "gradient-clipping",
      "optimizers",
      "activations"
    ]
  }
};
