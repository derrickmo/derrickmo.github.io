// GENERATED from content/lessons/training-systems/mixed-precision.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/mixed-precision/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "mixed-precision": {
    "level": "core",
    "body": {
      "intuition": [
        "Mixed precision is the first exchange in this module and the one with the best rate: you give up numerical headroom and receive memory, bandwidth and arithmetic throughput. Half-precision activations are half the bytes, so every memory-bound operation runs about twice as fast; tensor cores execute half-precision matrix multiplies several times faster than fp32. On modern hardware it is close to free, which is why it is the default rather than an optimization.",
        "The thing to internalize is that RANGE matters more than PRECISION in training. fp16 and bf16 are both sixteen bits and they split them differently: fp16 spends five on the exponent and ten on the mantissa, bf16 spends eight and seven. Eight exponent bits is exactly what fp32 has, so bf16 covers the same dynamic range with less precision - and neural network training turns out to be remarkably tolerant of noise in individual values and completely intolerant of infinities. fp16's narrower range is why it overflows above about 65,000 and flushes gradients below about 6e-8 to zero, and it is why the entire apparatus of loss scaling exists. bf16 needs none of it.",
        "Two pieces of machinery follow from fp16's range, and both are worth understanding rather than copying. LOSS SCALING multiplies the loss by a large factor so gradients land in representable range, then unscales before the optimizer step; a dynamic scaler halves the factor and SKIPS the step whenever it detects a non-finite gradient, and grows it again after a run of clean steps - so occasional skipped steps are normal operation, not a bug. And the FP32 MASTER COPY exists because a small update added to a large half-precision weight rounds away entirely: with ten mantissa bits, adding 1e-5 to 1.0 gives back exactly 1.0, so the parameter would never move. Those two mechanisms are where twelve of the sixteen bytes per parameter in this module's memory accounting come from."
      ],
      "math": [
        {
          "h": "Where the bits go, and why range beats precision",
          "paras": [
            "A floating-point format splits its bits between an exponent, which sets the dynamic range, and a mantissa, which sets the relative precision. The two sixteen-bit formats make opposite choices.",
            "bf16's exponent field is the same width as fp32's, so it represents the same range of magnitudes with coarser steps. fp16 trades range for precision, and training cares about the wrong one of those."
          ],
          "tex": "\\text{fp32: } 1{+}8{+}23 \\quad \\text{fp16: } 1{+}5{+}10 \\quad \\text{bf16: } 1{+}8{+}7 \\\\[4pt] \\text{fp16 range} \\approx [6\\times10^{-8},\\; 6.5\\times10^{4}], \\qquad \\text{bf16 range} \\approx \\text{fp32 range}",
          "texNote": "The practical consequence: in fp16 an attention logit or an unnormalized loss above 65,504 becomes inf, and the next subtraction gives NaN which then propagates through every parameter it touches. In bf16 that cannot happen. The cost of bf16 is three fewer mantissa bits, which matters for ACCUMULATION - which is why reductions and the master weights stay in fp32 regardless of the compute dtype."
        },
        {
          "h": "Loss scaling, and why steps get skipped",
          "paras": [
            "Multiply the loss by S before backward. By linearity every gradient is scaled by S, moving small values above fp16's subnormal floor. Divide by S before the optimizer step so the update is unchanged.",
            "The scaler adapts S because the right value depends on the gradient magnitudes, which change during training. Detecting a non-finite gradient means S was too large, so halve it and discard that step."
          ],
          "tex": "\\nabla_\\theta (S \\cdot L) = S \\cdot \\nabla_\\theta L \\;\\Longrightarrow\\; \\text{unscale by } 1/S \\text{ before the step} \\\\[4pt] S \\leftarrow \\begin{cases} S/2 \\;\\text{and SKIP the step} & \\text{any gradient non-finite} \\\\ 2S & \\text{after } N \\text{ clean steps} \\end{cases}",
          "texNote": "Skipped steps are normal - the scaler is probing upward for the largest usable factor and occasionally overshooting. What is NOT normal is the scale collapsing toward zero and staying there, which means gradients are genuinely overflowing rather than the probe being too aggressive, and points at a real instability. Logging the scale is therefore a free diagnostic."
        },
        {
          "h": "Why an fp32 master copy is required",
          "paras": [
            "A floating-point addition can only resolve a change larger than the value's own precision step. With ten mantissa bits, a small update added to a weight near one is lost entirely.",
            "So the optimizer keeps an fp32 copy of the parameters, applies updates to that, and casts down for the forward pass."
          ],
          "tex": "\\text{fp16: } 1.0 + 10^{-5} = 1.0 \\qquad \\text{since } \\epsilon_{\\text{fp16}} \\approx 9.8\\times10^{-4}",
          "texNote": "This is the stale-weight problem and it is why mixed precision is MIXED rather than simply half. Note the connection to QLoRA: a FROZEN weight never accumulates small updates, so it needs no master copy and can go to four bits - the asymmetry between trainable and frozen parameters comes entirely from this line."
        }
      ],
      "code": [
        {
          "h": "The correct setup, and the ordering that is load-bearing",
          "paras": [
            "Two lines to enable and one ordering constraint that silently disables your gradient clipping if you get it wrong."
          ],
          "code": "scaler = torch.amp.GradScaler(\"cuda\")     # fp16 ONLY - bf16 does not need it\n\nfor batch in loader:\n    with torch.autocast(\"cuda\", dtype=torch.bfloat16):   # prefer bf16\n        loss = criterion(model(batch.x), batch.y)\n        #  autocast is an ALLOWLIST per operation, not a blanket cast:\n        #    matmul / conv / linear .......... low precision (tensor cores)\n        #    softmax / layernorm / reductions  fp32 - these are where range and\n        #    loss functions ................... accumulation problems concentrate\n\n    scaler.scale(loss).backward()\n    scaler.unscale_(opt)                     # 1. UNSCALE FIRST. Clipping before\n                                             #    this compares gradients still\n                                             #    carrying a factor of ~2^16\n                                             #    against a threshold of 1.0 -\n                                             #    the clip NEVER FIRES and you\n                                             #    have silently disabled it.\n    gn = clip_grad_norm_(model.parameters(), 1.0)    # 2. clip\n    scaler.step(opt)                         # 3. step - internally SKIPS if any\n    scaler.update()                          #    gradient is non-finite\n    opt.zero_grad(set_to_none=True)\n\n    log(\"grad_norm\", gn, \"scale\", scaler.get_scale())\n    #   LOG THE SCALE. Occasional halving is normal probing. A scale that\n    #   collapses toward zero and STAYS there means genuine overflow, not an\n    #   over-eager probe - and it is the earliest warning you will get.\n\n# WITH bf16, DELETE THE SCALER ENTIRELY:\nwith torch.autocast(\"cuda\", dtype=torch.bfloat16):\n    loss = criterion(model(x), y)\nloss.backward()                              # no scaling, no skipped steps, no\nclip_grad_norm_(model.parameters(), 1.0)     # unscale ordering to get wrong\nopt.step(); opt.zero_grad(set_to_none=True)",
          "caption": "Unscale before clip, or the threshold is compared against gradients still carrying a factor of tens of thousands and the clip never fires. Choosing bf16 deletes the scaler, the skipped steps, and this entire ordering hazard."
        },
        {
          "h": "The two failures, measured",
          "paras": [
            "Worth reproducing once so the range argument is a number rather than an assertion. Both are properties of the format, not of any model."
          ],
          "code": "# ---- UNDERFLOW: why fp16 needs loss scaling ----\ng = torch.randn(100_000) * 1e-7                      # a realistic small gradient\nprint((g.half() == 0).float().mean())                # ~24% FLUSHED TO ZERO\nprint(((g * 1024).half() == 0).float().mean())       # ~0% - rescued by scaling\n#\n# NOTE THE SENSITIVITY: at 1e-6 only about 2% underflows, at 1e-7 about 24%.\n# The magnitude of the effect depends entirely on where your gradients sit\n# relative to fp16's subnormal floor of ~6e-8 - which is why loss scaling is\n# adaptive rather than a fixed constant.\n\n# ---- OVERFLOW: why fp16 produces NaN and bf16 does not ----\nx = torch.tensor([100.0, 1000.0, 89.0])\nprint(torch.exp(x.half()))          # inf, inf, inf  -> next subtraction = NaN\nprint(torch.exp(x.bfloat16()))      # inf, inf, finite-ish: same overflow point\n                                    # in EXP, but bf16 tolerates far larger\n                                    # intermediate MAGNITUDES before that\nprint(torch.logsumexp(x, 0))        # 1000.0 - the stable form never exponentiates\n                                    # the raw values at all\n#\n# THIS IS WHY autocast KEEPS SOFTMAX AND REDUCTIONS IN fp32. A custom loss\n# written inside an autocast region may run in a dtype you did not intend -\n# if you have written something numerically delicate by hand, force it to\n# fp32 explicitly rather than trusting the allowlist to know about it.\n\n# ---- THE MASTER COPY, in one line ----\nprint(torch.tensor(1.0).half() + torch.tensor(1e-5).half())   # 1.0 exactly\n#   The update vanished. This is why the optimizer keeps fp32 parameters and\n#   casts down for the forward pass - and why a FROZEN weight, which never\n#   accumulates updates, can safely go to 4 bits (QLoRA).",
          "caption": "The underflow fraction swings from 2% to 24% between gradients at 1e-6 and 1e-7, which is why loss scaling is adaptive rather than a fixed constant. And the master-copy line shows the update vanishing entirely."
        }
      ],
      "useCases": [
        "Essentially all modern training, where mixed precision is the default rather than an optimization - the memory and throughput gains are large and the quality cost on suitable hardware is negligible.",
        "Fitting a larger model or batch, since halving activation bytes is one of the cheapest levers in the memory budget and it composes with checkpointing and sharding rather than competing with them.",
        "Speeding up memory-bound operations, which is under-appreciated: halving the bytes moved speeds up normalizations, activations and elementwise chains, not only the tensor-core matmuls people associate with the technique.",
        "Inference and serving, where the same range considerations apply and where lower precision translates directly into more concurrent requests per device - though there the next step is usually integer quantization rather than half-precision floats."
      ],
      "pitfalls": [
        "Using a GradScaler with bf16. It is unnecessary - bf16 has fp32's exponent range, so gradients do not underflow the way fp16's do - and it adds skipped steps and an ordering hazard for no benefit.",
        "Clipping before unscaling. The gradients still carry the loss scaler's factor, so your threshold is compared against numbers tens of thousands of times too large and the clip effectively never fires. Unscale, then clip, then step.",
        "Treating skipped steps as a bug. The dynamic scaler probes upward for the largest usable factor and occasionally overshoots, halving and discarding a step. Occasional skips are normal; a scale that collapses and stays low is the real warning.",
        "Assuming autocast casts everything. It is an allowlist per operation, deliberately keeping softmax, normalization, reductions and loss functions in fp32 because that is where range and accumulation problems concentrate. A hand-written numerically delicate operation may run in a dtype you did not intend.",
        "Accumulating in low precision. Summing many bf16 values loses precision quickly because there are only seven mantissa bits, which is why reductions and the master weights stay fp32 regardless of the compute dtype.",
        "Comparing loss curves across precisions without accounting for skipped steps. An fp16 run that skipped 3% of its steps has taken fewer optimizer updates than the step counter suggests, which shifts the curve in a way that looks like a quality difference.",
        "Expecting a speedup on hardware without tensor cores, or on a model dominated by operations the allowlist keeps in fp32. The memory saving is nearly universal; the arithmetic speedup is a property of the hardware and the operation mix."
      ],
      "connections": [
        {
          "ref": "training-systems/training-stability",
          "text": "The failure modes this lesson creates get their systematic treatment there - NaN detection, skip-step guards, and the dynamic loss scaler implemented from scratch rather than used as a black box."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Where the memory budget this halves is decomposed. The fp32 master copy plus Adam's two moments are twelve of the sixteen bytes per trainable parameter, which is the accounting every other technique in this module is fighting."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "The asymmetry that follows from the master-copy argument: a FROZEN weight never accumulates a small update, so it needs no full-precision copy and can go to four bits. Trainable and frozen parameters have genuinely different precision requirements."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The integer counterpart for inference. Both are precision reductions, but training must preserve the ability to accumulate tiny updates while inference need only preserve a forward pass - which is why inference can go much lower."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How to confirm mixed precision actually helped. The arithmetic speedup depends on tensor-core utilization and the operation mix, so it is a measurement rather than a guarantee."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is mixed precision training?",
          "a": "Running most operations in sixteen-bit floating point for speed and memory while keeping numerically sensitive parts - reductions, normalization, the master weights - in fp32."
        },
        {
          "q": "How do fp16 and bf16 differ?",
          "a": "fp16 is 1+5+10 bits, bf16 is 1+8+7. bf16 has fp32's exponent width, so the same dynamic range with less precision."
        },
        {
          "q": "Why does range matter more than precision in training?",
          "a": "Networks tolerate noise in individual values well and tolerate infinities not at all. An overflow becomes inf, then NaN, and propagates through every parameter it touches."
        },
        {
          "q": "What is fp16's range?",
          "a": "Roughly 6e-8 to 65,504. Above that you get inf; below it gradients flush to zero."
        },
        {
          "q": "Why does fp16 need loss scaling?",
          "a": "A large fraction of gradients fall below the subnormal floor and flush to zero. Multiplying the loss by a large factor moves them into representable range."
        },
        {
          "q": "How does a dynamic loss scaler work?",
          "a": "Halve the scale and skip the step whenever a gradient is non-finite; double it after a run of clean steps. It probes upward for the largest usable factor."
        },
        {
          "q": "Are skipped steps a bug?",
          "a": "No - occasional skips are the scaler overshooting while probing. A scale that collapses toward zero and stays there is the real warning sign."
        },
        {
          "q": "Why is an fp32 master copy needed?",
          "a": "With ten mantissa bits, adding 1e-5 to 1.0 gives exactly 1.0 - the update rounds away. The optimizer updates an fp32 copy and casts down for the forward pass."
        },
        {
          "q": "Why can QLoRA quantize weights to four bits then?",
          "a": "Because those weights are FROZEN. They never accumulate a small update, so the stale-weight problem does not apply and they need only enough precision for a forward pass."
        },
        {
          "q": "What does autocast actually do?",
          "a": "Applies an allowlist per operation - matmuls and convolutions in low precision, softmax, normalization, reductions and losses in fp32. It is not a blanket cast."
        },
        {
          "q": "Why must you unscale before clipping?",
          "a": "The gradients still carry the scaler's factor, so comparing them against a clip threshold is meaningless and the clip never fires."
        },
        {
          "q": "Do you need a GradScaler with bf16?",
          "a": "No. bf16 has fp32's exponent range so gradients do not underflow, and adding a scaler brings skipped steps and an ordering hazard for no benefit."
        }
      ],
      "standard": [
        {
          "q": "Explain mixed precision training end to end - what it buys, what it costs, and what machinery it needs.",
          "a": "WHAT IT BUYS. Three things, and they are worth separating. MEMORY: half-precision activations are half the bytes, and activations dominate the training budget for most models. BANDWIDTH: memory-bound operations - normalizations, activations, elementwise chains - are limited by bytes moved, so halving the bytes roughly doubles their speed. This is under-appreciated, because people associate mixed precision with matmuls. ARITHMETIC: tensor cores execute half-precision matrix multiplies several times faster than fp32. THE FORMATS, and the central insight. fp32 is 1+8+23 bits; fp16 is 1+5+10; bf16 is 1+8+7. bf16's exponent field is the SAME WIDTH as fp32's, so it covers the same dynamic range with coarser steps. And the key fact is that training cares far more about RANGE than about PRECISION - networks are remarkably tolerant of noise in individual values and completely intolerant of infinities, because one inf becomes a NaN on the next subtraction and propagates through every parameter it touches. fp16's narrow range means attention logits, unnormalized losses, and long-sequence sums can exceed 65,504, and gradients below about 6e-8 flush to zero. THE MACHINERY fp16 NEEDS, and neither piece is arbitrary. (1) LOSS SCALING. Multiply the loss by a factor S before backward; by linearity every gradient is scaled by S, lifting small values above the subnormal floor. Unscale before the optimizer step so the update is unchanged. A dynamic scaler adapts S: halve it and SKIP the step when any gradient is non-finite, double it after a run of clean steps. Occasional skipped steps are normal probing behaviour. (2) THE FP32 MASTER COPY. With ten mantissa bits, 1.0 + 1e-5 is exactly 1.0 - a small update added to a weight near unity rounds away entirely and the parameter never moves. So the optimizer maintains fp32 parameters, updates those, and casts down for the forward pass. This is why it is MIXED precision rather than half precision, and it is where a good chunk of the sixteen-bytes-per-parameter accounting comes from. WHAT bf16 CHANGES. It deletes all of that. No scaler, no skipped steps, no unscale-before-clip ordering hazard. The cost is three fewer mantissa bits, which matters for ACCUMULATION - so reductions and master weights stay fp32 either way. On hardware supporting bf16 there is essentially no reason to choose fp16. THE PART PEOPLE GET WRONG. autocast is an ALLOWLIST, not a blanket cast: it deliberately keeps softmax, normalization, reductions and loss functions in fp32 because that is where range and accumulation problems concentrate. So a numerically delicate operation you wrote yourself may run in a dtype you did not intend, and if you have a hand-written loss it is worth forcing its precision explicitly rather than trusting the list to know about it.",
          "deepDive": {
            "q": "Walk through what happens to a single parameter over one mixed-precision step, in every dtype involved.",
            "a": "SETUP: fp16 with a GradScaler, Adam, one parameter w. The optimizer holds an fp32 master copy w32; the model holds an fp16 copy w16 that is a cast of it. STEP 1 - FORWARD. The forward pass uses w16 in the matmul, on tensor cores. Note that the matmul ACCUMULATES in fp32 internally even though its inputs are fp16 - that is a hardware property of tensor cores and it matters, because summing thousands of fp16 products in fp16 would lose a great deal. Activations are stored in fp16, which is where the memory saving lives. Operations on the autocast allowlist stay fp32: the softmax, the layer norms, the loss. STEP 2 - LOSS SCALING. The scalar loss is multiplied by S, currently something like 2^16. This is one multiply and it is done in fp32. STEP 3 - BACKWARD. Gradients flow, computed in the dtype the forward used, so mostly fp16. Every gradient carries the factor S. This is exactly the point: without S, a gradient of 1e-7 would flush to zero in fp16; with S = 65536 it is about 6.5e-3, comfortably representable. Note the risk on the other side - a gradient of 1.0 becomes 65536, which is nearly at fp16's ceiling, which is why S must adapt rather than being fixed. STEP 4 - UNSCALE. The gradients are divided by S, and this happens IN FP32 into the master gradient buffers. The scaler simultaneously checks for inf or NaN across all gradients. STEP 5 - THE DECISION. If any gradient is non-finite, S was too large: halve it, DISCARD this step entirely - no optimizer update at all - and continue. If all are finite, proceed, and after a run of clean steps double S. STEP 6 - CLIP, which must happen after unscaling for the reason discussed, and operates on the fp32 gradients. STEP 7 - THE ADAM UPDATE, entirely in fp32: the moments m and v are fp32 buffers, the update is computed in fp32, and it is applied to w32. This is where the master copy earns its existence - the update might be 1e-6 relative to a weight of 1.0, which fp16 cannot resolve. STEP 8 - CAST DOWN. w16 is refreshed from w32 for the next forward pass. THE MEMORY LEDGER for this one parameter: 2 bytes for w16, 2 for its gradient, 4 for w32, and 8 for Adam's two fp32 moments - sixteen bytes, of which only two are the weight actually used in the forward pass. That is the number every other technique in this module attacks. THE SUBTLETY WORTH NAMING. People sometimes ask why, if the master copy is fp32 and the update is fp32, we bother with fp16 weights at all. The answer is that the FORWARD and BACKWARD passes are where the compute and the activation memory are, and those are what fp16 accelerates. The optimizer step touches each parameter once and is a negligible fraction of step time; the forward pass touches them for every example in the batch. So you pay 4 extra bytes per parameter to make the dominant cost twice as fast, which is an excellent trade and is the whole design."
          }
        },
        {
          "q": "When would you choose fp16 over bf16, or neither?",
          "a": "CHOOSE bf16 BY DEFAULT on hardware that supports it, which means Ampere and later on NVIDIA, and TPUs. The reasoning is that its exponent range matches fp32, so gradients do not underflow and activations do not overflow, which deletes an entire subsystem: the GradScaler, its dynamic adjustment, the skipped steps, and the unscale-before-clip ordering requirement that is so easy to get wrong. Fewer moving parts and fewer failure modes for a quality difference that is generally not detectable. CHOOSE fp16 when the hardware does not support bf16 - which is anything before Ampere, so V100-class GPUs and a lot of consumer hardware from that era. In that case you accept the loss-scaling machinery and follow the ordering discipline carefully. There is also a narrow argument for fp16 in INFERENCE on models where the extra three mantissa bits are measurably better and the range is known to be safe, since inference has no gradients to underflow and the activation ranges can be checked in advance. CHOOSE NEITHER - stay in fp32 - in a few genuine cases. When the model is small enough that memory and throughput are not constraints, and the added complexity buys nothing. When you are debugging a numerical problem and want to eliminate precision as a variable. And in scientific or simulation workloads where the accumulated error over many steps genuinely matters in a way it does not for neural network training. CONSIDER TF32, which is the option people forget. On Ampere and later, matmuls can run in TensorFloat-32 - fp32's exponent range with a 10-bit mantissa - which gives a substantial matmul speedup with no code changes and no range concerns at all, because inputs and outputs remain fp32. It is a smaller win than full mixed precision and it is essentially free, so it is worth having on unless you have verified a specific sensitivity. It is controlled by a backend flag and the default has changed across versions, which is worth checking rather than assuming. AND FP8, which is the current frontier. The e4m3 format for forward activations and e5m2 for gradients - note the gradient format gets MORE exponent bits, because gradients span a wider dynamic range, which is the same range-over-precision reasoning one level down. It requires per-tensor scaling factors and hardware support, and it is genuinely in production for large-scale training. I would treat it as something to evaluate when training cost is the dominant concern rather than as a default. THE DECISION RULE I WOULD STATE. bf16 if available; fp16 with a scaler if not; TF32 for matmuls regardless; fp32 only when you are debugging or when the model is small enough not to care. And whichever you choose, measure - the arithmetic speedup depends on tensor-core utilization and the operation mix, so it is a measurement rather than a guarantee."
        },
        {
          "q": "Your fp16 training run produces NaN. How do you diagnose it?",
          "a": "FIRST, THE OBSERVATION THAT NARROWS IT FASTEST: log the GradScaler's scale. If it has been halving repeatedly and collapsed toward a very small value, gradients are genuinely overflowing rather than the scaler over-probing - and the collapse would have been visible many steps before the NaN. If the scale is healthy and a NaN appeared anyway, the overflow happened in the FORWARD pass, which the scaler does not protect against at all. That distinction splits the investigation immediately and it is a free metric. CASE A - THE SCALE COLLAPSED. Gradients are exceeding fp16's range even at small scale factors. Causes: a learning rate too high so the model is diverging, an unstable loss formulation, an attention or normalization layer producing large intermediate values, or a genuinely bad batch. The fix ladder: gradient clipping if not already present, a lower learning rate, warmup, and checking the loss formulation for the numerical hazards from the custom-loss lesson - a bare sqrt, a division by something that can be zero, a hand-composed softmax-then-log. CASE B - THE SCALE IS FINE, so the NaN came from the forward pass. The scaler only inspects gradients. An activation that overflows to inf during forward produces NaN before any gradient exists. Where this happens: attention logits before the softmax on long sequences, an unnormalized loss term, a sum over a long sequence, or an exponential. Diagnostic: run the forward with hooks recording the max absolute value per layer and find where it approaches 65,504. That gives you the layer directly. THE SPECIFIC FIXES for case B. Ensure softmax and normalization are running in fp32 - autocast should be doing this, but a hand-written attention or a custom module may not be on the allowlist, and forcing the dtype explicitly is the fix. Use the stable formulations: logsumexp rather than log-of-sum-of-exp, the fused cross-entropy rather than softmax then log. And check for anything that computes a large intermediate that is subsequently normalized away - the normalization does not help if the intermediate already overflowed. THE STRUCTURAL ANSWER, which I would lead with if bf16 is available: SWITCH TO bf16. Both cases above are consequences of fp16's narrow exponent range, and bf16 has fp32's. That is not a workaround, it is removing the cause, and it also deletes the scaler and its ordering hazards. If someone is fighting fp16 NaN on Ampere-or-later hardware, that is the answer. THE TOOLS if it is still not localized. torch.autograd.set_detect_anomaly(True) for one run raises at the operation that produced the NaN, with a traceback to where it was created in the forward - very slow, but it names the culprit. And a skip-step guard checking torch.isfinite on the gradients before opt.step means one bad batch does not poison every parameter, which converts a fatal run into a logged anomaly. WHAT I WOULD ADD PERMANENTLY. Log the scale, the gradient norm, and the maximum absolute activation from a couple of representative layers. All three are cheap and all three move before the loss does.",
          "deepDive": {
            "q": "Why does autocast keep some operations in fp32, and how do you decide for a custom operation?",
            "a": "THE THREE REASONS AN OPERATION STAYS IN FP32, and they are the criteria you apply to your own code. (1) IT EXPONENTIATES OR TAKES A LOG. softmax, log_softmax, cross_entropy, logsumexp, anything with an exp. These are the classic overflow and underflow sites: exp of a large logit overflows, and log of an underflowed probability is negative infinity. Running them in fp32 gives four extra exponent bits of headroom and, in fp16's case, is the difference between working and not. (2) IT ACCUMULATES OVER MANY ELEMENTS. Reductions - sum, mean, norm, variance - and normalization layers which compute them. Summing thousands of values in a format with ten or seven mantissa bits loses precision rapidly, because each addition rounds and the errors compound. The variance computation in a layer norm is especially sensitive since it involves a difference of large numbers. (3) IT IS CHEAP RELATIVE TO ITS RISK. A softmax over a sequence is a small fraction of a transformer block's FLOPs, so running it in fp32 costs almost nothing and removes a whole class of failure. The allowlist is a cost-benefit judgement, not a purity rule - which is why matmuls, which are expensive and numerically benign because tensor cores accumulate in fp32 internally, are on the low-precision side. HOW I WOULD DECIDE FOR A CUSTOM OPERATION. Ask the three questions above. Does it exponentiate? Does it reduce over many elements? Is it cheap? If yes to any of the first two, force fp32. The mechanism is either a decorator on the custom autograd Function, or an explicit autocast(enabled=False) region with the inputs cast to fp32 inside. THE FAILURE THIS PREVENTS, and it is a real and under-documented one: a custom loss or a hand-written attention written inside an autocast region runs in whatever dtype its inputs happen to be, which is usually the low-precision one. The library's own losses are protected; yours is not. So someone who writes a careful numerically-stable loss and then wraps their training step in autocast can silently lose the stability they engineered, and the symptom is an intermittent NaN that appears to come from nowhere. THE VERIFICATION I WOULD RUN. Inside the region, print the dtype of your operation's intermediates. It takes one line and it answers the question definitively rather than by reasoning about the allowlist. And for anything you have forced to fp32, confirm the cast is actually happening - a common error is casting the inputs but leaving a constant or a buffer in the original dtype, so the operation promotes back down. THE BROADER PRINCIPLE, which connects to the module's theme. Mixed precision is an exchange - numerical headroom for speed and memory - and autocast's allowlist is someone else's judgement about where that exchange is favourable. For the operations they know about, that judgement is good. For yours, you have to make it, and the default if you do not is the unfavourable side."
          }
        },
        {
          "q": "How much speedup should mixed precision give, and how would you verify you got it?",
          "a": "WHAT TO EXPECT, decomposed, because a single number is not meaningful. MEMORY: close to a 2x reduction in activation memory, reliably, on essentially any hardware. This is the most predictable benefit and it often matters more than speed, because it lets you raise the batch size which then improves throughput separately. MEMORY-BOUND OPERATIONS: roughly 2x, since their cost is bytes moved and you halved the bytes. This covers normalizations, activations, elementwise chains and most of what is not a matmul. MATMULS: this is where the headline numbers come from and it depends entirely on hardware. Tensor cores give a large multiple over fp32 on paper - the spec sheets say several times - but the achieved figure depends on shapes tiling well, on the operation being large enough to amortize overheads, and on whether the model is actually matmul-dominated. OVERALL, on a transformer with good shapes on modern hardware, something in the range of 1.5x to 3x end-to-end is a reasonable expectation, and I would be suspicious of anyone quoting a precise number without stating the model and the device. WHEN YOU GET MUCH LESS, and the reasons are diagnosable. The model is INPUT-BOUND, so the GPU was waiting anyway and making it faster changes nothing - this is the most common disappointment and it is not a mixed-precision problem. The shapes do not tile well onto tensor cores; dimensions that are not multiples of 8 or 16 can fall off the fast path entirely, and padding a dimension to a friendly multiple is sometimes a large win. The model is dominated by operations the allowlist keeps in fp32. The batch is too small for the matmuls to amortize launch overhead. Or the hardware has no tensor cores, in which case you get the memory and bandwidth benefits and none of the arithmetic one. HOW I WOULD VERIFY. (1) MEASURE STEADY-STATE THROUGHPUT properly - warm up, synchronize around the timing, and average over many steps. Comparing a single step, or timing without synchronize, measures Python's enqueue rate and always flatters the change. (2) MEASURE PEAK MEMORY with max_memory_allocated before and after; this should drop substantially and if it does not, autocast is probably not applying where you think. (3) PROFILE AND CHECK THE KERNEL NAMES. This is the decisive check: tensor-core kernels have recognizable names, and if the profile shows fp32 kernels where you expected half-precision ones, the cast is not happening - which can be a dtype mismatch on an input, a module outside the autocast region, or an operation with no low-precision implementation. (4) COMPUTE ACHIEVED FLOPS against the device's specification. If you were at 20% of peak before and 25% after, you got a small fraction of what was available and the limiting factor is elsewhere. THE MISTAKE I WOULD WARN AGAINST. Enabling mixed precision, seeing no improvement, and concluding it does not work - when the actual finding is that the job was input-bound or the shapes were unfriendly. The profile distinguishes those in minutes, and this module's theme is exactly that: the exchange rate is a property of YOUR configuration, so it has to be measured rather than inherited."
        },
        {
          "q": "How does mixed precision interact with the other techniques in this module?",
          "a": "IT COMPOSES WELL WITH MOST OF THEM, and the interactions worth knowing are mostly about ordering and about which memory term each attacks. WITH GRADIENT CHECKPOINTING. Complementary - mixed precision halves the bytes per activation, checkpointing reduces the NUMBER of activations stored. Both attack the activation term and they multiply. The interaction to know is that the recomputed forward pass runs in the same precision, so it is also faster, and if the recomputation is not deterministic - dropout with an unrestored RNG state - the gradients correspond to a different function, which is a correctness issue independent of precision. WITH GRADIENT ACCUMULATION. The interaction is the loss scaler: you scale, accumulate over k micro-batches, then unscale once before the step. If the scaler detects an overflow it discards the WHOLE accumulated gradient, not just the offending micro-batch - so a single bad micro-batch costs you k micro-batches of work. Worth knowing when tuning k. And the divide-by-k must happen on the loss, before scaling, or the arithmetic gets confusing. WITH DDP AND FSDP. Two things. Gradients are all-reduced in the compute dtype by default, so bf16 gradients halve the communication volume - a real and often-forgotten benefit of mixed precision in distributed training. And FSDP has its own MixedPrecision policy specifying separate dtypes for parameters, gradients and the reduction, which is more expressive than autocast alone and is where you would choose to reduce in fp32 for stability while computing in bf16. WITH torch.compile. Generally additive - compile fuses the elementwise chains and mixed precision halves their traffic. One interaction to watch: compile may change where casts happen, so verifying numerics against eager after enabling both is worth doing rather than assuming. WITH TRAINING STABILITY. This is the tightest coupling, and it runs in the wrong direction: mixed precision CREATES the instability that the stability lesson manages. fp16's range is why NaN guards, skip-step logic and the dynamic scaler exist. Choosing bf16 removes most of that coupling, which is a systems argument for bf16 beyond the convenience one. WITH THE OPTIMIZER. The fp32 master copy is part of the optimizer's state, and 8-bit optimizers quantize the Adam moments further - so precision reduction is applied independently to weights, gradients, activations and optimizer state, and they are four separate decisions. People often think of precision as one global setting when it is four. THE ORDERING RULE THAT TIES SEVERAL TOGETHER, and which I would state as the practical takeaway: divide the loss by the accumulation count, scale, backward, then on the accumulation boundary unscale, clip, step, update the scaler, zero the gradients - and in DDP, wrap the non-final micro-steps in no_sync. Every one of those placements is a consequence of something mechanical, and getting any of them wrong is silent."
        },
        {
          "q": "Explain the exchange this module is about, using mixed precision as the example.",
          "a": "THE FRAME. Every technique in this module buys one scarce resource by spending another, and the exchange rate is a property of YOUR configuration rather than of the technique. Mixed precision is the first instance and it has the best rate, which makes it a good place to see the structure. WHAT IT SPENDS: numerical headroom. Specifically, it gives up either dynamic range (fp16) or mantissa precision (bf16), and in exchange for that you accept a class of failures - overflow to inf, underflow to zero, accumulated rounding error - that did not exist in fp32. WHAT IT BUYS: memory, roughly halving the activation term; bandwidth, roughly doubling the speed of memory-bound operations; and arithmetic, several times faster matmuls on tensor cores. WHY THE RATE IS SO GOOD HERE. The thing spent - precision in individual values - turns out to be something neural network training barely uses. Gradient descent is a noisy process already; a few bits of additional noise per value is absorbed. Whereas the things bought are exactly the binding constraints in most training jobs. That asymmetry is why mixed precision moved from an optimization to a default in a few years. WHY THE RATE IS STILL CONFIGURATION-DEPENDENT, which is the module's actual point. If your job is INPUT-BOUND, you buy nothing - the GPU was idle and making it faster changes nothing. If your shapes do not tile onto tensor cores, you buy the memory and bandwidth and not the arithmetic. If your hardware has no bf16, you also pay the loss-scaling machinery, the skipped steps, and an ordering hazard. If your model is dominated by operations the allowlist keeps in fp32, the arithmetic gain is small. Same technique, four different exchange rates, and the only way to know which one you are on is to measure. THE DISCIPLINE THAT FOLLOWS, and it is what the rest of the module applies. Measure which resource is binding. Apply the technique that targets THAT resource. Re-measure - because optimizing a system RE-ORDERS its bottlenecks, and the term that binds after you halve the activations is usually not the one that bound before. The clearest illustration of the re-ordering is that after mixed precision, LoRA and quantization have all done their work on a large-model fine-tune, the biggest remaining allocation can be the logits tensor - a term nobody was thinking about, which did not get more expensive but simply stopped being dwarfed. THE CONTRAST WORTH DRAWING with the previous module. Module 15 was about abstractions hiding mechanisms that fail silently, so its discipline was to build diagnostics. This module is about deliberate trades, so its discipline is to know the current exchange rate. Both require measurement, and for different reasons: there because the failure is invisible, here because the benefit is."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "fp32 vs fp16 vs bf16, in bits",
        "back": "fp32 = 1+8+23, fp16 = 1+5+10, bf16 = 1+8+7. bf16 has fp32's EXPONENT WIDTH, so the same dynamic range with coarser steps. fp16 range is ~[6e-8, 65504]."
      },
      {
        "type": "intuition",
        "front": "Range matters more than precision in training",
        "back": "Networks tolerate NOISE in individual values well and tolerate INFINITIES not at all - one inf becomes NaN on the next subtraction and propagates through every parameter it touches. That single asymmetry is why bf16 beats fp16."
      },
      {
        "type": "formula",
        "front": "Loss scaling",
        "back": "grad(S*L) = S*grad(L), so scale the loss, then UNSCALE before the step. Dynamic: halve S and SKIP the step on any non-finite gradient, double after N clean steps. Occasional skips are NORMAL probing."
      },
      {
        "type": "pitfall",
        "front": "A collapsing loss scale is the real warning",
        "back": "Occasional halving = the scaler overshooting while probing upward. A scale that collapses toward zero and STAYS there means genuine overflow. Log scaler.get_scale() - it is free and it moves long before the loss does."
      },
      {
        "type": "formula",
        "front": "Why the fp32 master copy is required",
        "back": "In fp16, 1.0 + 1e-5 = 1.0 EXACTLY (eps ~ 9.8e-4). The update rounds away and the parameter never moves. So the optimizer updates an fp32 copy and casts down for the forward pass - which is why it is MIXED precision, not half."
      },
      {
        "type": "intuition",
        "front": "Why QLoRA can use 4 bits when training cannot",
        "back": "The stale-weight problem applies only to weights that ACCUMULATE small updates. A FROZEN weight never does - it needs only enough precision for a forward pass and to pass gradients through. Trainable and frozen parameters have genuinely different precision requirements."
      },
      {
        "type": "pitfall",
        "front": "Unscale BEFORE clipping",
        "back": "Gradients still carry the scaler's factor (~2^16), so comparing them against a threshold of 1.0 means the clip NEVER FIRES - you have silently disabled your instability guard. Order: unscale -> clip -> step -> update."
      },
      {
        "type": "intuition",
        "front": "autocast is an ALLOWLIST, not a blanket cast",
        "back": "Low precision: matmul/conv/linear (tensor cores accumulate in fp32 internally anyway). fp32: softmax, layernorm, reductions, losses - where exp/log overflow and many-element accumulation concentrate. Your CUSTOM op is not on the list."
      },
      {
        "type": "pitfall",
        "front": "Do not use a GradScaler with bf16",
        "back": "bf16 has fp32's exponent range, so gradients do not underflow. Adding a scaler brings skipped steps and the unscale ordering hazard for zero benefit. On Ampere+ the right choice is bf16 and DELETE the scaler."
      },
      {
        "type": "intuition",
        "front": "Measured underflow is very sensitive to gradient scale",
        "back": "randn*1e-6 -> ~2% of values flush to zero in fp16; randn*1e-7 -> ~24%. It depends entirely on where your gradients sit relative to the ~6e-8 subnormal floor - which is exactly why loss scaling must be ADAPTIVE rather than a fixed constant."
      },
      {
        "type": "intuition",
        "front": "Precision is FOUR decisions, not one",
        "back": "Weights, gradients, activations, and optimizer state can each be reduced independently - autocast handles compute, the master copy is fp32, FSDP's MixedPrecision policy sets the reduction dtype separately, and 8-bit optimizers quantize the Adam moments."
      },
      {
        "type": "pitfall",
        "front": "No speedup? It may not be a precision problem",
        "back": "Input-bound (the GPU was idle anyway), shapes not tiling onto tensor cores (pad dims to multiples of 8/16), a model dominated by fp32-allowlist ops, or no tensor cores at all. Check kernel NAMES in the profile - fp32 kernels where you expected half means the cast is not happening."
      }
    ],
    "refs": [
      {
        "title": "Micikevicius et al. (2018), Mixed Precision Training",
        "url": "https://arxiv.org/abs/1710.03740"
      },
      {
        "title": "Kalamkar et al. (2019), A Study of BFLOAT16 for Deep Learning Training",
        "url": "https://arxiv.org/abs/1905.12322"
      },
      {
        "title": "Micikevicius et al. (2022), FP8 Formats for Deep Learning",
        "url": "https://arxiv.org/abs/2209.05433"
      },
      {
        "title": "PyTorch: Automatic Mixed Precision package (torch.amp)",
        "url": "https://pytorch.org/docs/stable/amp.html"
      },
      {
        "title": "NVIDIA: Train With Mixed Precision",
        "url": "https://docs.nvidia.com/deeplearning/performance/mixed-precision-training/index.html"
      }
    ],
    "demos": [
      "mixed-precision",
      "quantization",
      "gradient-clipping",
      "optimizers"
    ],
    "demoTitles": {
      "mixed-precision": "Mixed Precision",
      "quantization": "Quantization",
      "gradient-clipping": "Gradient Clipping",
      "optimizers": "Optimizer Shootout"
    }
  }
};
