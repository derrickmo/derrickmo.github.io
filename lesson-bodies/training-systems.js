// GENERATED from content/lessons/training-systems/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "training-systems". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
    ]
  },
  "torch-compile": {
    "level": "core",
    "body": {
      "intuition": [
        "torch.compile is three components. DYNAMO analyses Python bytecode at runtime and captures what it can into an FX graph, recording GUARDS - the conditions under which that capture is valid. AOTAUTOGRAD then traces the backward pass ahead of time, so the compiler sees forward and backward together, which is why it can fuse the backward at all - something TorchScript never did. INDUCTOR generates the actual kernels: Triton for GPU, C++ with OpenMP for CPU. The exchange is compile time and debuggability for throughput, and as always the rate depends on your configuration.",
        "The design decision that made it work is that Dynamo is allowed to GIVE UP LOCALLY. TorchScript's two paths were both all-or-nothing on a whole function: scripting must compile everything or it errors, tracing must record everything or it silently omits it. Dynamo inserts a GRAPH BREAK at anything it cannot handle - a data-dependent branch, a print, a call into arbitrary Python - falls back to the interpreter there, then resumes capturing after. So a function becomes several graphs with Python between them rather than one graph or a failure. That single choice is why it works on real research code, and it is why the model that raises TraceError under fx.symbolic_trace runs correctly under torch.compile.",
        "The gains come from two mechanisms and knowing which one applies tells you in advance whether compiling will help. FUSION: a chain of elementwise operations each reads and writes the whole tensor, so fusing n of them into one kernel turns 2n memory round trips into 2. That is enormous for memory-bound work - normalizations, activations, residual adds, the whole non-matmul half of a transformer block - and worth nothing for a large matrix multiply already running near peak. LAUNCH REDUCTION: fewer kernels means less fixed overhead, which matters most at small batch sizes. So a model dominated by big matmuls gains little; a model with many small elementwise operations gains a lot. That is a prediction you can make from a profile before you spend a minute on compilation."
      ],
      "math": [
        {
          "h": "What fusion actually saves",
          "paras": [
            "An elementwise operation on a tensor of N elements reads N and writes N. A chain of n such operations, each launched separately, moves 2nN elements. Fused into one kernel, it moves 2N.",
            "The arithmetic is identical - fusion changes traffic, not FLOPs - which is why it helps memory-bound work and does nothing for compute-bound work."
          ],
          "tex": "\\text{unfused: } 2nN \\text{ elements moved} \\;\\longrightarrow\\; \\text{fused: } 2N, \\qquad \\text{speedup} \\approx n \\;\\text{ when memory-bound}",
          "texNote": "For a residual block's tail - add, layer-norm, activation, scale - n is four or five, so the fused version moves a quarter to a fifth of the bytes. That is the single largest source of torch.compile's gains on transformers, and it explains why the benefit concentrates in exactly the operations people think of as cheap."
        },
        {
          "h": "Guards, specialization, and the recompilation cliff",
          "paras": [
            "A captured graph is valid only under the conditions that held at capture: input shapes, dtypes, the values of Python variables that affected the trace, the types of arguments. Dynamo records those as guards and checks them on every call.",
            "A guard miss triggers recompilation for the new conditions. Past a cache limit, Dynamo stops compiling and falls back to eager - permanently and quietly."
          ],
          "tex": "\\text{call} \\to \\begin{cases} \\text{run cached graph} & \\text{guards hold} \\\\ \\text{recompile, cache} & \\text{miss, cache} < L \\\\ \\textbf{fall back to eager} & \\text{miss, cache} \\ge L \\end{cases}",
          "texNote": "The third row is the trap. A model called with many distinct input shapes recompiles repeatedly, hits the cache size limit, and then runs in EAGER MODE for the rest of the job - slower than if you had never compiled, with no error. This is what dynamic=True prevents, by capturing a graph with symbolic shapes that covers a range instead of one shape each."
        },
        {
          "h": "When compilation pays for itself",
          "paras": [
            "Compilation is a one-time cost per graph and per guard configuration, and the saving is per step. The break-even is straightforward, and it is why compile is right for training runs and often wrong for short scripts.",
            "Recompilations reset the calculation, which is why an uncontrolled recompile loop can make a job slower overall."
          ],
          "tex": "\\text{worth it} \\iff n_{\\text{steps}} \\cdot \\Delta t_{\\text{step}} \\;>\\; k_{\\text{compiles}} \\cdot t_{\\text{compile}}",
          "texNote": "With compilation on the order of tens of seconds and a saving of a few milliseconds per step, break-even is in the thousands of steps - trivially met by any real training run and easily missed by a short evaluation script or an interactive session. Note that k, the number of compilations, is the term you control by managing shapes."
        }
      ],
      "code": [
        {
          "h": "See the graphs, find the breaks, fix them",
          "paras": [
            "The most useful thing you can do with torch.compile is count its graphs. A custom backend that returns the graph unchanged compiles nothing and reveals everything."
          ],
          "code": "graphs = []\ndef counting_backend(gm, example_inputs):\n    graphs.append(gm)          # capture, compile NOTHING, run eager\n    return gm.forward\n\n# A straight-line MLP: ONE graph, and numerically identical to eager.\ncompiled = torch.compile(mlp, backend=counting_backend)\ncompiled(x); print(len(graphs))            # 1\n\n# NOW A GRAPH BREAK - the canonical cause:\ndef broken(x):\n    s = x.sum().item()         # <-- .item() forces a device->host SYNC and\n    if s > 0:                  #     produces a PYTHON float, so the branch is\n        return x * 2           #     data-dependent in a way Dynamo cannot\n    return x - 1               #     capture. BREAK.\n\ngraphs.clear(); torch.compile(broken, backend=counting_backend)(x)\nprint(len(graphs))                          # 3  (break splits it in three)\nprint(torch._dynamo.explain(broken)(x))     # graph_break_count = 2, WITH the\n                                            # reason and the source line\n\n# THE FIX - keep it tensor-only so there is nothing to break on:\ndef fixed(x):\n    return torch.where(x.sum() > 0, x * 2, x - 1)   # no .item(), no Python if\ngraphs.clear(); torch.compile(fixed, backend=counting_backend)(x)\nprint(len(graphs))                          # 1  - back to a single graph\n\n# THE CONTRAST WITH fx, which is the whole design argument:\n#   fx.symbolic_trace(broken)  -> raises TraceError (Proxy has no bool)\n#   torch.jit.trace(broken)    -> silently BAKES IN one branch\n#   torch.compile(broken)      -> runs BOTH branches correctly, via a break\n# Dynamo is the only one of the three that is never wrong.\n\n# FIND BREAKS IN A REAL MODEL:\n#   TORCH_LOGS=graph_breaks python train.py\n#   torch._dynamo.explain(model)(*inputs)     # count + reasons + source lines",
          "caption": "Counting graphs is the highest-value diagnostic here. Three graphs where you expected one means two breaks, and dynamo.explain names the reason and the line - which is the difference between compile helping and compile doing almost nothing."
        },
        {
          "h": "Guards, recompilation, and the silent fallback",
          "paras": [
            "The failure that costs the most is not a crash - it is compiling repeatedly, exhausting the cache, and running eager for the rest of the job while you believe it is compiled."
          ],
          "code": "# SHAPE SPECIALIZATION: each distinct shape is a separate compilation.\nm = torch.compile(model)                      # dynamic=False by default-ish\nfor n in (16, 32, 64, 16, 32):\n    m(torch.randn(n, 128))\n#   -> 3 compilations (one per DISTINCT shape); the repeats are cache hits.\n\nm = torch.compile(model, dynamic=True)\n#   -> fewer compilations: one symbolic-shape graph covering a range. Note it\n#      is often 2 rather than 1 - some residual specialization remains - so\n#      do not expect a single graph and be suspicious of claims that you get one.\n\n# THE TRAP - the recompile cliff:\n#   Many distinct shapes -> repeated recompilation -> the cache size limit is\n#   reached -> Dynamo STOPS COMPILING and falls back to EAGER for the rest of\n#   the run. Slower than never compiling, and there is NO ERROR.\n#   Watch for it:  TORCH_LOGS=recompiles python train.py\n#   Fixes: dynamic=True, or PAD/BUCKET your shapes so there are few distinct\n#   ones - the same bucketing that fixes allocator fragmentation.\n\n# MODES, and what each trades:\ntorch.compile(model)                             # default: fusion, safe\ntorch.compile(model, mode=\"reduce-overhead\")     # + CUDA graphs: removes launch\n                                                 # overhead entirely. Requires\n                                                 # STATIC shapes and stable input\n                                                 # addresses; best at small batch\ntorch.compile(model, mode=\"max-autotune\")        # benchmarks kernel variants at\n                                                 # compile time: much slower to\n                                                 # compile, faster to run\n\n# VERIFY NUMERICS. Fusion changes the ORDER of floating-point operations, so\n# small differences are expected and large ones are a bug:\nwith torch.no_grad():\n    d = (model(x) - compiled(x)).abs().max()\nassert d < 1e-4, d      # and check the DISTRIBUTION, not only the max",
          "caption": "The recompile cliff is the expensive failure: past the cache limit Dynamo silently reverts to eager for the rest of the run, so you are slower than if you had never compiled. TORCH_LOGS=recompiles is how you see it."
        }
      ],
      "useCases": [
        "Transformer training, where the non-matmul half of each block is a chain of memory-bound elementwise operations and fusing them is the single largest available speedup short of better attention kernels.",
        "Any model with many small operations, where launch overhead is a large fraction of step time - which includes most models at small batch sizes and anything with a deep stack of cheap layers.",
        "Inference serving with reduce-overhead mode and CUDA graphs, where shapes are fixed and eliminating launch overhead entirely matters most at the batch size of one that interactive serving actually runs at.",
        "As a free first experiment: it is one line, it is reversible, and the profile before and after tells you whether your model was memory-bound in a way you had not measured."
      ],
      "pitfalls": [
        "Assuming it is compiled when it has fallen back. Repeated recompilation from varying shapes exhausts the cache size limit, after which Dynamo runs eager for the rest of the job with no error - slower than never compiling. Check TORCH_LOGS=recompiles.",
        "Ignoring graph breaks. Fusion only happens WITHIN a graph, so a function split into forty graphs gets almost none of the benefit. torch._dynamo.explain reports the count and the reason, and fixing the cheap breaks is usually where the gain is.",
        "Calling .item() inside the compiled region. It forces a device-to-host synchronization and produces a Python value, which is both a graph break and a pipeline stall. Keep the hot path tensor-only, using torch.where rather than a Python if.",
        "Benchmarking the first iteration. It includes compilation, which can be tens of seconds. Warm up generously, then measure steady state with synchronization - otherwise you are timing the compiler.",
        "Expecting a speedup on a matmul-dominated model. Fusion reduces bytes moved, not FLOPs, so a model already near peak on large matrix multiplies has almost nothing to gain. Profile first and predict.",
        "Skipping the numerical check. Fusion changes the order of floating-point operations, so outputs differ slightly by design - but a large difference means a real problem, and only comparing against eager on real inputs distinguishes the two.",
        "Compiling a short-lived script. The break-even is thousands of steps at typical compile costs, so an evaluation script or an interactive session can easily spend more time compiling than it saves."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "Dynamo emits FX graphs to its backend, so fx did not lose to torch.compile - it became the intermediate representation underneath it. The difference is the capture mechanism, not the graph."
        },
        {
          "ref": "pytorch-internals/torchscript",
          "text": "The predecessor and the contrast that explains the design. Tracing silently bakes in a branch, scripting refuses to compile, and Dynamo breaks the graph and guards its assumptions - which is why it is the only one that is never wrong."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How to predict whether compiling will help and confirm that it did. A profile showing many small memory-bound kernels predicts a large gain; one showing few large matmuls predicts almost none."
        },
        {
          "ref": "training-systems/mixed-precision",
          "text": "Additive, and for the same reason: both attack memory traffic. Mixed precision halves the bytes per element and fusion reduces the number of round trips, so the combination multiplies rather than overlapping."
        },
        {
          "ref": "transformers/flash-attention",
          "text": "The hand-written version of the same idea, and the limit of what a compiler can do - flash attention is an algorithmic restructuring using the online-softmax identity, not a fusion of the graph as written, which is why a compiler could not have found it."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are torch.compile's three components?",
          "a": "Dynamo captures graphs from Python bytecode with guards, AOTAutograd traces the backward ahead of time, and Inductor generates kernels - Triton for GPU, C++ with OpenMP for CPU."
        },
        {
          "q": "What is a graph break?",
          "a": "A point where Dynamo cannot capture, so it falls back to the interpreter and resumes capturing after. The function becomes several graphs with Python between them."
        },
        {
          "q": "Why is breaking better than failing or tracing?",
          "a": "Scripting refuses to compile and tracing silently bakes in one branch. Breaking always produces correct results, which is why Dynamo works on real research code."
        },
        {
          "q": "What are guards?",
          "a": "The conditions under which a captured graph is valid - shapes, dtypes, the values of Python variables that affected the trace. Dynamo checks them on every call."
        },
        {
          "q": "What happens on a guard miss?",
          "a": "Recompilation for the new conditions, cached alongside the old. Past a cache size limit, Dynamo stops compiling and falls back to eager permanently."
        },
        {
          "q": "Why is the eager fallback dangerous?",
          "a": "It is silent. You believe the model is compiled while it runs slower than if you had never compiled it. TORCH_LOGS=recompiles reveals it."
        },
        {
          "q": "What does fusion save?",
          "a": "Memory traffic, not FLOPs. A chain of n elementwise operations moves 2nN elements unfused and 2N fused, so it helps memory-bound work and not compute-bound work."
        },
        {
          "q": "Why does AOTAutograd matter?",
          "a": "It traces the backward ahead of time, so the compiler sees forward and backward together and can fuse the backward - which TorchScript never did."
        },
        {
          "q": "What does dynamic=True do?",
          "a": "Captures a graph with symbolic shapes covering a range rather than compiling one per distinct shape. Often gives two graphs rather than one, since some specialization remains."
        },
        {
          "q": "What does reduce-overhead mode do?",
          "a": "Adds CUDA graphs, eliminating launch overhead entirely. It requires static shapes and stable input addresses, and it helps most at small batch sizes."
        },
        {
          "q": "How do you find graph breaks?",
          "a": "torch._dynamo.explain reports the count, the reasons and the source lines, and TORCH_LOGS=graph_breaks logs them during a run."
        },
        {
          "q": "Why must you verify numerics after compiling?",
          "a": "Fusion changes the order of floating-point operations, so small differences are expected by design. Only comparing against eager distinguishes those from a real bug."
        }
      ],
      "standard": [
        {
          "q": "How would you use torch.compile in a serving deployment rather than in training?",
          "a": "THE CONSTRAINTS ARE DIFFERENT, and they change which mode and which concerns matter. In training you have thousands of steps to amortize compilation and shapes are usually stable. In serving you have variable request shapes, latency targets rather than throughput targets, and a process that must start quickly. WHAT CHANGES IN YOUR FAVOUR. (1) SHAPES CAN BE CONTROLLED. Serving typically batches requests, and you choose the batch sizes - so you can BUCKET to a small set, say 1, 2, 4, 8, 16, padding up to the nearest. That turns an unbounded shape space into a handful of compilations, which is exactly what the recompile cliff needs. (2) reduce-overhead MODE BECOMES THE RIGHT CHOICE. It adds CUDA graphs, which capture the entire kernel launch sequence once and replay it, eliminating launch overhead completely. Launch overhead is a large fraction of latency at batch one - which is precisely the interactive-serving case - so this is where the mode earns its keep. Its requirements are static shapes and stable input addresses, both of which a bucketed serving path can guarantee. (3) COMPILATION CAN BE MOVED OFF THE CRITICAL PATH. Warm up at startup by running each bucket shape before accepting traffic. Otherwise your first request of each shape pays tens of seconds, which is a terrible tail latency and a classic production surprise. WHAT CHANGES AGAINST YOU. (1) STARTUP TIME. Compiling every bucket at boot delays readiness, which matters for autoscaling - a replica that takes two minutes to become useful is a scaling problem. Compilation caching helps and is worth configuring. (2) MEMORY. Each compiled shape variant holds its own artifacts, and CUDA graphs additionally pin their memory pool, so many buckets cost real memory that competes with the KV cache. (3) DEBUGGABILITY in production is worse, and a numerical difference discovered in production is expensive. WHAT I WOULD ACTUALLY BUILD. Bucket the batch dimension to a small fixed set and pad. Compile with reduce-overhead. Warm every bucket at startup, before the readiness probe passes. Verify numerics against eager on a golden set as part of the deployment, since fusion reorders floating-point operations and a difference outside tolerance is a correctness issue no latency measurement reveals. And keep an eager fallback path behind a flag, so a compilation problem in production is a config change rather than a rollback. THE HONEST CAVEAT. For LLM serving specifically, the dominant costs are attention and the KV cache, and a dedicated inference engine will generally beat torch.compile on a stock model - paged attention, continuous batching and speculative decoding are systems-level wins that a compiler cannot find. So I would use torch.compile for serving models where no specialized runtime exists, and reach for the specialized runtime where one does. That is the same reasoning as everywhere in this module: know which resource binds, and choose the tool that targets it."
        },
        {
          "q": "Explain how torch.compile works and why it succeeded where TorchScript did not.",
          "a": "THE STACK. Three components. DYNAMO hooks Python's frame evaluation and analyses BYTECODE at runtime, capturing tensor operations into an FX graph and recording GUARDS - the conditions under which that capture is valid, such as input shapes, dtypes, and the values of Python variables that influenced the trace. AOTAUTOGRAD traces the backward pass ahead of time, so the compiler sees the forward and backward graphs together. INDUCTOR is the code generator: it fuses operations and emits Triton kernels for GPU or C++ with OpenMP for CPU. WHAT IT BUYS. Two mechanisms. FUSION: a chain of elementwise operations each reads and writes the entire tensor, so fusing n of them turns 2n memory round trips into 2. For a residual block's tail - add, norm, activation, scale - that is a factor of four or five on the bytes moved, and since those operations are memory-bound, it is close to a factor of four or five on their time. LAUNCH REDUCTION: fewer kernels means less fixed per-launch overhead, which dominates at small batch sizes. Note that AOTAutograd means both apply to the BACKWARD pass too, which is roughly two thirds of training time and which TorchScript never touched. WHY IT SUCCEEDED - the design decision. TorchScript had two paths and both were all-or-nothing on a whole function. Scripting compiles your source but only accepts a typed subset of Python, so it REFUSES real code. Tracing records the operations that executed, so it silently BAKES IN whichever branch the example took and produces an artifact that is wrong for other inputs. Dynamo instead is allowed to GIVE UP LOCALLY: at anything it cannot capture, it inserts a GRAPH BREAK, falls back to the interpreter, and resumes capturing after. A function becomes several graphs with Python between them rather than one graph or a failure. THE SECOND HALF OF WHY: GUARDS. Tracing ASSUMES its specialization remains valid forever. Dynamo CHECKS, on every call, and recompiles on a miss. So the correctness problem that made tracing dangerous simply does not arise - a data-dependent branch becomes either a guard that triggers recompilation or a graph break, and in both cases the answer is right. The concrete illustration: a model with an if on a tensor value raises TraceError under fx, is silently corrupted by torch.jit.trace, and runs correctly under torch.compile. THE COSTS, since this is an exchange. Compilation time, tens of seconds, paid per graph and per guard configuration - so break-even is thousands of steps and a short script can lose. Reduced debuggability inside compiled regions. Graph breaks limiting the fusion opportunity, since the compiler only sees within a graph. And the recompilation cliff: many distinct shapes cause repeated recompilation until the cache limit is hit, after which Dynamo runs EAGER for the rest of the job, silently, slower than never compiling.",
          "deepDive": {
            "q": "Walk through what happens on the first call to a compiled function, and on a call that misses its guards.",
            "a": "FIRST CALL. (1) Dynamo intercepts the Python frame before it executes. It symbolically evaluates the BYTECODE, maintaining a representation of the stack and locals where tensors are tracked symbolically and other values are tracked as concrete Python objects. (2) Tensor operations are appended to an FX graph. Non-tensor operations - a Python integer computation, an attribute access - are evaluated concretely, and if their result affects the graph, a GUARD is recorded so that a future call with a different value recompiles. (3) At any bytecode it cannot handle - a call into an untraceable library, a data-dependent branch on a tensor value, a print - Dynamo stops, emits the graph captured so far, generates bytecode that calls that compiled graph, executes the problematic operation in the interpreter, and starts a NEW capture after it. That is the graph break. (4) Each captured graph goes to AOTAutograd, which traces the backward by running the forward with tensors that record their autograd operations, producing a joint forward-backward graph and then partitioning it into a forward graph, the saved tensors, and a backward graph. The partitioning is itself an optimization: it chooses what to save versus recompute, which is a min-cut problem and is why AOTAutograd sometimes recomputes cheap operations in the backward rather than storing their outputs. (5) Inductor lowers each graph, fuses what it can, and generates Triton or C++ source, which is compiled and cached. (6) The compiled artifact is stored keyed by the guards. THE GUARD SET is worth being concrete about. It includes tensor shapes, dtypes, devices, whether tensors require grad, whether they are contiguous, the types of Python arguments, the values of Python scalars that were used in a way affecting the graph, and the identities of certain objects. That is a lot of conditions, which is why guard misses are more common than people expect. A GUARD MISS. (1) On entry, Dynamo evaluates the guards for each cached entry - this check is fast, it is generated code rather than interpretation. (2) If none match, it recompiles from step 1 with the new conditions and adds another cache entry. (3) If the number of cache entries for that code object exceeds a limit, Dynamo marks the frame as unsuitable and STOPS COMPILING IT - permanently, for the rest of the process, falling back to eager. WHY THE CLIFF EXISTS AND WHY IT IS THE EXPENSIVE FAILURE. The limit is there because unbounded recompilation would be worse - each compile is tens of seconds. But the fallback is silent, so a job with varying sequence lengths can spend two minutes recompiling and then run the remaining ten hours in eager mode while the operator believes it is compiled. The diagnosis is TORCH_LOGS=recompiles, which reports each recompilation with the guard that failed - and that guard names the fix. THE FIXES, in order. dynamic=True, so shapes are symbolic and one graph covers a range. Bucketing or padding inputs so there are few distinct shapes - the same bucketing that fixes allocator fragmentation, which is a nice convergence. Marking specific dimensions dynamic with mark_dynamic rather than making everything symbolic, which keeps specialization where it is valuable. And raising the cache limit, which is a last resort and usually the wrong answer since it treats the symptom."
          }
        },
        {
          "q": "You compiled your model and saw no speedup. What do you check?",
          "a": "IN ORDER, because each check is cheap and eliminates a category. CHECK 1: DID IT ACTUALLY COMPILE, or did it fall back? Run with TORCH_LOGS=recompiles. If you see repeated recompilation, and especially if you see the cache limit being hit, Dynamo has reverted to eager for the rest of the run - and you are now SLOWER than if you had never compiled. This is the most consequential possibility and it is silent, which is why it goes first. The cause is varying input shapes, and the fixes are dynamic=True, bucketing shapes, or marking specific dimensions dynamic. CHECK 2: HOW MANY GRAPHS? torch._dynamo.explain reports the graph count, the break count, and the reason and source line for each break. Fusion only happens WITHIN a graph, so a function split into forty graphs gets almost no benefit. The common causes are .item() calls, data-dependent Python branches, prints, and calls into libraries Dynamo cannot trace. Fixing two or three cheap breaks - replacing an if on a tensor value with torch.where, moving a logging call out of the hot path - often recovers most of the benefit. CHECK 3: WAS THE MODEL EVER MEMORY-BOUND? This is the check that determines whether compiling COULD have helped. Fusion reduces bytes moved and not FLOPs, so a model dominated by large matrix multiplies already running near peak has almost nothing to gain. Profile and look at the split between matmul kernels and everything else; if the elementwise and normalization kernels are a small fraction of the time, the ceiling on compile's benefit is that fraction, by Amdahl. This is a prediction you can make BEFORE compiling. CHECK 4: WAS THE JOB INPUT-BOUND? If the GPU was idle waiting for data, making the compute faster changes nothing. Look at device utilization. This is a common and frustrating discovery and it is not a compile problem. CHECK 5: WAS THE BENCHMARK CORRECT? Timing the first iterations includes compilation, which can be tens of seconds and swamps everything. Warm up generously, synchronize around the timing, and measure steady state over many steps. An improperly warmed benchmark can show compilation making the model dramatically slower, which is true and irrelevant. CHECK 6: BATCH SIZE. Launch overhead is a large fraction at small batch and negligible at large, so the launch-reduction half of the benefit varies enormously. If you benchmarked at a large batch and deploy at batch one, or vice versa, the numbers do not transfer. CHECK 7: MODE. The default mode is conservative. reduce-overhead adds CUDA graphs, which eliminates launch overhead entirely and can be a large additional win at small batch - though it requires static shapes. max-autotune benchmarks kernel variants at compile time, costing much more compile time for a faster result. WHAT I WOULD DO WITH THE ANSWERS. If it fell back, fix the shapes. If there are many breaks, fix the cheap ones. If the model was never memory-bound or the job was input-bound, stop - compile is not the lever and the profile has told you which one is. That last outcome is a success, not a failure: you spent ten minutes and learned where the time actually goes."
        },
        {
          "q": "How do graph breaks affect performance, and how do you eliminate them?",
          "a": "WHY THEY COST. The compiler can only optimize WITHIN a graph. Fusion combines adjacent operations, so a break in the middle of a chain means the operations before and after cannot be fused together and each side pays its own memory round trips. Beyond that, each break has direct overhead: the compiled region must return control to the interpreter, the interpreter executes the problematic operation, and a new compiled region is entered - which involves guard checks and, on GPU, potentially synchronization. And crucially, a break involving .item() or any device-to-host transfer forces a SYNCHRONIZATION, draining the pipeline the CPU had built by running ahead, which costs far more than the operation itself. THE COMMON CAUSES, in the order I meet them. (1) .item(), .cpu(), .tolist(), or printing a tensor - anything that converts a tensor to a Python value. (2) A Python if or while whose condition depends on a tensor value. (3) Calls into libraries Dynamo cannot trace - numpy in some forms, arbitrary third-party code, some custom operations. (4) Certain data structure manipulations and dynamic attribute access. (5) Exceptions and try/except in the hot path. HOW TO FIND THEM. torch._dynamo.explain on your model with real inputs gives the count, the reason for each break, and the source line - this is the tool and it is precise. TORCH_LOGS=graph_breaks logs them during a real run, which catches breaks that only occur on some inputs. HOW TO ELIMINATE THEM. (1) KEEP THE HOT PATH TENSOR-ONLY. Replace an if on a tensor value with torch.where, so the computation stays in the graph. Replace a Python accumulator with a tensor accumulator. This is usually the single most effective change and it also removes the synchronization. (2) MOVE LOGGING AND METRICS OUT of the compiled region, or accumulate on the device and transfer once per interval rather than per step. (3) MARK BOUNDARIES DELIBERATELY. If a section genuinely cannot be compiled, wrap it with torch._dynamo.disable so the break is explicit and where you chose it, rather than discovered. Compiling the sub-modules that are clean rather than the whole model is often better than fighting one untraceable piece. (4) USE torch.cond FOR GENUINE DATA-DEPENDENT CONTROL FLOW that must stay in the graph - it is the supported way to express a branch on a tensor value. (5) SOME BREAKS ARE FINE. A break at the very start or end of a step costs almost nothing, since there is nothing to fuse across it. The ones worth fixing are those in the middle of a chain of elementwise work. THE JUDGEMENT I WOULD APPLY. Count the breaks, look at where they are, and fix the two or three that sit in the middle of the hot path. Chasing every break to zero is usually not worth it - the distribution of benefit is very uneven, and the profile tells you which region has the fusable work. That is the same Amdahl reasoning as everywhere else in this module.",
          "deepDive": {
            "q": "What does AOTAutograd do, and why does compiling the backward matter so much?",
            "a": "THE PROBLEM IT SOLVES. Dynamo captures the FORWARD pass. But in training, the backward pass is roughly twice the forward's cost, so a compiler that only sees the forward can address at most a third of the work. Worse, the backward is generated dynamically by autograd at runtime from the graph the forward built, so there is no static backward function to capture in the ordinary way. WHAT IT DOES. AOTAutograd runs the captured forward graph with special tensors that record autograd operations, producing a JOINT forward-and-backward graph ahead of time. Then it PARTITIONS that joint graph into three things: a forward graph, the set of intermediate tensors that must be saved, and a backward graph consuming them. Both graphs then go to Inductor for fusion and code generation. WHY THE PARTITION IS INTERESTING, and this is the part worth knowing. Choosing what to SAVE versus what to RECOMPUTE in the backward is a genuine optimization, and AOTAutograd solves it as a min-cut problem on the joint graph. Eager autograd saves whatever each operation's backward declares it needs. The partitioner can instead decide that recomputing a cheap elementwise operation in the backward is better than storing its output - trading a little compute for less memory traffic and less memory. That is gradient checkpointing's trade, applied automatically and at fine granularity rather than at segment boundaries. It is a real reason compiled training can use less activation memory than eager, which surprises people who expect a compiler to only change speed. WHY COMPILING THE BACKWARD MATTERS SO MUCH IN PRACTICE. The backward of a fused elementwise chain is itself a chain of elementwise operations, and it is memory-bound for the same reason. Fusing it gives the same factor-of-n reduction in traffic. Since the backward is about two thirds of training time, this is where the majority of torch.compile's training speedup comes from - and it is precisely what TorchScript never provided, which is a large part of why TorchScript was never much use for training. THE COMPLICATION IT INTRODUCES. Because the backward is compiled ahead of time from the joint graph, anything that changes the backward's structure at runtime is a problem - a custom autograd Function historically needed care, hooks may not run where you expect, and double backward has its own handling. These are the places where compiled training has rough edges, and they are all consequences of having decided the backward's shape in advance. THE MENTAL MODEL I WOULD OFFER. Dynamo answers 'what is the program', AOTAutograd answers 'what is the program including its derivative, and what should be stored versus recomputed', and Inductor answers 'what kernels should run'. Three separate questions, three separate components, and the middle one is the reason this stack helps training rather than only inference."
          }
        },
        {
          "q": "When is torch.compile NOT worth using?",
          "a": "FIVE CASES, and being able to name them is what distinguishes understanding the trade from enabling it reflexively. CASE 1: THE JOB IS SHORT. Compilation is tens of seconds per graph and per guard configuration, and the saving is a few milliseconds per step, so break-even is in the thousands of steps. An evaluation script, a quick experiment, a unit test, or an interactive session can easily spend more time compiling than it saves. For a long training run the compile cost is noise; for a five-minute job it is the dominant term. CASE 2: THE MODEL IS ALREADY COMPUTE-BOUND ON LARGE MATMULS. Fusion reduces bytes moved, not FLOPs. A model whose time is dominated by big matrix multiplies running near peak has essentially nothing for the compiler to take, and by Amdahl your ceiling is the small fraction spent elsewhere. This is predictable from a profile before you try. CASE 3: THE JOB IS INPUT-BOUND OR COMMUNICATION-BOUND. If the GPU is idle waiting for the data pipeline, or the step is dominated by an all-reduce, making the compute faster changes nothing at all. Again predictable from a profile, and again the finding redirects you to the real bottleneck. CASE 4: SHAPES VARY WIDELY AND CANNOT BE BUCKETED. Then you are in recompilation territory, and past the cache limit Dynamo falls back to eager silently - so you get compile-time cost, no benefit, and a false belief that the model is optimized. dynamic=True mitigates this, and if the variation is extreme it may not be enough. CASE 5: YOU ARE ACTIVELY DEBUGGING. Compiled regions are harder to inspect - print behaves differently, breakpoints do not work as expected, and stack traces are less useful. During development the faster feedback loop of eager mode is usually worth more than the throughput. THE CASES WHERE I WOULD BE CAUTIOUS RATHER THAN NEGATIVE. Custom autograd Functions and hooks have historically had rough edges under compilation, so if your model relies on them heavily, verify carefully. Numerics change slightly because fusion reorders floating-point operations - usually within tolerance, and worth checking rather than assuming, particularly for anything numerically delicate. And in a production deployment I would want the compiled path verified against eager on a golden set, because a fusion that changes results outside tolerance is a correctness issue no speed measurement would reveal. THE DECISION PROCEDURE I WOULD ACTUALLY USE. Profile first and ask whether the signature is one compile can address - many small memory-bound kernels, or a picket fence of launches. If yes, try it; it is one line. Measure steady-state throughput properly with warm-up. Check the graph-break count and fix the cheap ones. Verify numerics. If the profile said the model was matmul-bound or the job was input-bound, skip it and go fix the actual bottleneck. That is the module's discipline applied: know which resource binds before spending anything."
        },
        {
          "q": "How does torch.compile relate to the other capture mechanisms you have seen?",
          "a": "ALL OF THEM ANSWER THE SAME QUESTION - how do you get a graph out of a Python program - and they differ in what they do when the program is not a graph. That framing organizes the whole comparison. TORCHSCRIPT TRACING runs the model with real tensors and records what executed. It sees actual values, so a data-dependent branch is resolved once and BAKED IN, silently, and shape specialization is often silent too. Failure mode: WRONG. TORCHSCRIPT SCRIPTING compiles the source into a typed IR, so control flow survives - at the cost of accepting only a statically-typed subset of Python. Failure mode: REFUSES. TORCH.FX traces symbolically with Proxy objects. A proxy has no value, so branching on it raises TraceError rather than picking a branch. It produces a Python-level graph designed for TRANSFORMATION - fusing, quantizing, pruning - rather than deployment. Failure mode: LOUDLY INCAPABLE, which is a genuine improvement over tracing. DYNAMO analyses bytecode, captures what it can, inserts a graph break at what it cannot, and GUARDS its specializations, rechecking them per call. Failure mode: LOCALLY INCAPABLE, GLOBALLY CORRECT. TORCH.EXPORT is the deployment-side successor to TorchScript, producing a full-graph ahead-of-time representation with EXPLICIT dynamic shapes - you declare which dimensions vary rather than hoping the trace generalizes - and it FAILS LOUDLY rather than baking in. THE PROGRESSION READ AS A STORY ABOUT FAILURE MODES. The industry converged on the last two because the failure of the first - a silently incorrect deployed artifact - is the worst one available, and being told what your model cannot do is far better than being given something that quietly does the wrong thing. That is the sentence I would want to land. THE RELATIONSHIPS THAT ARE NOT COMPETITION. Dynamo EMITS FX GRAPHS to its backend, so fx was not replaced - it was promoted to being the IR underneath the thing that succeeded it, and demoted from being a capture mechanism, where its static-graph limit was a real problem. And torch.export and torch.compile share machinery: export is essentially Dynamo capture with the requirement that there be no graph breaks, plus explicit dynamic-shape declarations. HOW I WOULD CHOOSE. Speed during training, staying in Python: torch.compile. Rewriting a model - quantization, pruning, feature extraction: fx, because its graph is meant to be edited. Deploying without Python, new project: torch.export then AOTInductor or ExecuTorch. Deploying without Python, existing system: TorchScript, because rewriting has no payoff. A non-PyTorch runtime: ONNX. THE THING THAT MAKES THE COMPARISON USEFUL rather than a list: once you know that the distinguishing question is what happens at the boundary of what is capturable, you can predict a mechanism's failure mode from its design without having used it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The torch.compile stack",
        "back": "DYNAMO: captures graphs from Python BYTECODE + records GUARDS. AOTAUTOGRAD: traces the BACKWARD ahead of time and partitions save-vs-recompute. INDUCTOR: generates kernels (Triton on GPU, C++/OpenMP on CPU)."
      },
      {
        "type": "intuition",
        "front": "Why Dynamo succeeded where TorchScript did not",
        "back": "It is allowed to GIVE UP LOCALLY - a graph BREAK rather than failing (scripting) or lying (tracing) - and it GUARDS its specializations, rechecking per call instead of assuming. It is the only one of the three that is never WRONG."
      },
      {
        "type": "formula",
        "front": "What fusion saves",
        "back": "n elementwise ops on N elements: 2nN moved unfused -> 2N fused. Speedup ~n when memory-bound. It changes TRAFFIC, not FLOPs - so it helps norms/activations/residual adds and does nothing for a big matmul near peak."
      },
      {
        "type": "pitfall",
        "front": "The recompile cliff - the expensive silent failure",
        "back": "Many distinct shapes -> repeated recompilation -> the cache size limit is hit -> Dynamo STOPS COMPILING and runs EAGER for the rest of the job. Slower than never compiling, no error. Check TORCH_LOGS=recompiles."
      },
      {
        "type": "intuition",
        "front": "Count the graphs first",
        "back": "A custom backend `(gm, ex) -> gm.forward` captures and compiles NOTHING, so you can count. Or torch._dynamo.explain: graph count, break count, REASON and SOURCE LINE. Fusion only happens WITHIN a graph, so 40 graphs = almost no benefit."
      },
      {
        "type": "pitfall",
        "front": ".item() is a graph break AND a sync",
        "back": "It converts a tensor to a Python value, so Dynamo cannot capture the branch that follows - and it drains the pipeline. Fix: keep the hot path tensor-only, `torch.where(x.sum()>0, a, b)` instead of a Python `if`."
      },
      {
        "type": "definition",
        "front": "Guards",
        "back": "The conditions a captured graph is valid under: shapes, dtypes, devices, requires_grad, contiguity, argument types, and Python scalar VALUES that affected the trace. Checked every call - which is why guard misses are more common than expected."
      },
      {
        "type": "intuition",
        "front": "Why AOTAutograd matters most for training",
        "back": "The backward is ~2/3 of training time and is generated dynamically, so a forward-only compiler addresses at most a third. AOTAutograd traces it ahead of time - and its save-vs-recompute PARTITION is a min-cut that can lower activation memory too."
      },
      {
        "type": "formula",
        "front": "When compiling pays for itself",
        "back": "n_steps * delta_t_step > k_compiles * t_compile. At ~tens of seconds to compile and ~ms saved per step, break-even is THOUSANDS of steps - trivial for a training run, easily lost by an eval script. You control k by managing shapes."
      },
      {
        "type": "definition",
        "front": "The three modes",
        "back": "default: fusion, safe. reduce-overhead: + CUDA GRAPHS, removing launch overhead entirely - needs STATIC shapes, best at small batch. max-autotune: benchmarks kernel variants at compile time - much slower to compile, faster to run."
      },
      {
        "type": "pitfall",
        "front": "Verify numerics after compiling",
        "back": "Fusion REORDERS floating-point operations, so small differences are expected BY DESIGN and a large one is a bug. Compare against eager on real inputs and look at the DISTRIBUTION of differences, not only the max."
      },
      {
        "type": "intuition",
        "front": "The capture mechanisms, as failure modes",
        "back": "jit.trace: silently WRONG. jit.script: REFUSES. fx: loudly incapable (TraceError). Dynamo: locally incapable (break), globally correct, guards checked. torch.export: fails loudly, dynamic shapes DECLARED. The field converged on never being wrong."
      }
    ],
    "refs": [
      {
        "title": "Ansel et al. (2024), PyTorch 2: Faster Machine Learning Through Dynamic Python Bytecode Transformation and Graph Compilation",
        "url": "https://dl.acm.org/doi/10.1145/3620665.3640366"
      },
      {
        "title": "PyTorch: torch.compiler documentation",
        "url": "https://pytorch.org/docs/stable/torch.compiler.html"
      },
      {
        "title": "PyTorch: TorchDynamo deep dive - guards, graph breaks and recompilation",
        "url": "https://pytorch.org/docs/stable/torch.compiler_deepdive.html"
      },
      {
        "title": "PyTorch: torch.compile troubleshooting",
        "url": "https://pytorch.org/docs/stable/torch.compiler_troubleshooting.html"
      },
      {
        "title": "Triton: an open-source language and compiler for GPU kernels",
        "url": "https://triton-lang.org/"
      }
    ],
    "demos": [
      "batching",
      "kv-cache",
      "quantization",
      "moe"
    ]
  },
  "gradient-checkpointing": {
    "level": "core",
    "body": {
      "intuition": [
        "This is the module's theme in its purest form, because it is the one technique whose exchange rate you can write down exactly. Reverse-mode autodiff must keep the intermediate activations the backward pass needs, which is why activations dominate the training memory budget. Gradient checkpointing declines to store most of them: it saves only the values at a few SEGMENT BOUNDARIES, and when the backward pass reaches a segment it re-runs that segment's forward to rebuild the intermediates, uses them, and frees them again. You pay roughly one extra forward pass and receive a large reduction in activation memory.",
        "The detail that decides whether it works at all is SEGMENTATION, and it is the thing people get wrong. If you wrap every individual layer in a checkpoint, you store a boundary tensor for every layer - which is approximately what you were storing anyway - and the saving is negligible while you pay the full recompute cost. The memory is proportional to the number of boundaries plus the size of one segment, so with L layers in segments of size s it goes like L/s + s, minimized at s of about the square root of L. That is Chen et al.'s sublinear-memory result, and the whole content of it is in choosing s.",
        "Two correctness traps come with the recomputation and both are silent. If the segment contains DROPOUT, the recomputed forward must produce the same random values as the original, or you are computing gradients for a different function than the one that produced the output - PyTorch's implementation saves and restores the RNG state for exactly this reason, and a hand-rolled version that forgets is subtly wrong while still training. And if the segment contains BATCHNORM, the recomputed forward updates the running statistics a SECOND time, so they advance at twice the intended rate. Neither produces an error. Which is why the modern refinement - selective recomputation, recomputing only the operations with a high memory-to-FLOP ratio - is attractive: it gets most of the memory saving for a fraction of the compute, and touches fewer operations that can go wrong."
      ],
      "math": [
        {
          "h": "The segment optimization, and why per-layer checkpointing fails",
          "paras": [
            "Peak activation memory under checkpointing has two terms: the boundaries you keep for the whole forward, and the intermediates of the one segment currently being recomputed. The first falls with segment size and the second rises.",
            "Minimizing the sum gives the classic square-root result. Setting s = 1 - checkpointing every layer - makes the first term L, which is what you started with."
          ],
          "tex": "M(s) \\;\\propto\\; \\underbrace{\\frac{L}{s}}_{\\text{boundaries kept}} + \\underbrace{s}_{\\text{one segment recomputed}} \\;\\Longrightarrow\\; s^{*} = \\sqrt{L}, \\quad M^{*} \\propto 2\\sqrt{L}",
          "texNote": "Read the failure case off the formula: at s = 1 you keep L boundaries and recompute a segment of size 1, so M is proportional to L + 1 - no better than storing everything, and you have paid the recompute anyway. At s = L you keep one boundary and recompute the whole network, which is minimal memory and maximal recompute depth. The interior optimum is the point."
        },
        {
          "h": "What the recomputation costs",
          "paras": [
            "A backward pass costs roughly twice a forward, so a training step is about three forward-equivalents. Checkpointing adds one more forward for the recomputed segments.",
            "That gives the commonly quoted 30 to 40% overhead, and it is an upper bound - selective schemes recompute only part of the network."
          ],
          "tex": "\\frac{T_{\\text{ckpt}}}{T_{\\text{base}}} \\approx \\frac{F + 2F + F}{F + 2F} = \\frac{4}{3} \\approx 1.33",
          "texNote": "Measured on a real model the figure lands close to this - around 1.4x compute for roughly a two-thirds reduction in peak activation memory in one representative measurement. The number to hold is that you are buying a large memory factor for a modest compute factor, which is why checkpointing is usually worth it the moment activations are the binding term."
        },
        {
          "h": "Selective recomputation: pick by memory per FLOP",
          "paras": [
            "Not all operations are equally worth recomputing. The ones to drop are those that store a lot and cost little to recreate - the attention softmax output, elementwise activations, dropout masks - while genuinely expensive operations are better stored.",
            "Ranking by stored bytes per FLOP of recomputation gives most of the memory saving for a small fraction of the compute."
          ],
          "tex": "\\text{recompute } o \\text{ first when } \\frac{\\text{bytes stored}(o)}{\\text{FLOPs}(o)} \\text{ is large}",
          "texNote": "This is the insight behind selective activation recomputation: in a transformer, the attention-related intermediates are large and cheap to recreate, while the matrix multiplications are the opposite. Recomputing only the former recovers most of the memory at a small compute cost, rather than the uniform one-third of full checkpointing. Note that torch.compile's AOTAutograd partitioner solves a version of this problem automatically as a min-cut."
        }
      ],
      "code": [
        {
          "h": "Segmented checkpointing, and the measurement that proves the point",
          "paras": [
            "The API is one call. The configuration that matters is the segment size, and comparing per-layer against segmented is worth running once because the difference is stark."
          ],
          "code": "from torch.utils.checkpoint import checkpoint, checkpoint_sequential\n\n# WRONG - a boundary stored per layer, so almost nothing is saved, and you pay\n# the recompute anyway:\nfor layer in self.layers:\n    x = checkpoint(layer, x, use_reentrant=False)\n\n# RIGHT - segments of about sqrt(L):\nx = checkpoint_sequential(self.layers, segments=int(len(self.layers) ** 0.5),\n                          input=x, use_reentrant=False)\n\n# ...or by hand, which is what you need for a non-Sequential model:\ns = int(len(self.layers) ** 0.5)\nfor i in range(0, len(self.layers), s):\n    chunk = self.layers[i:i + s]\n    x = checkpoint(lambda inp, c=chunk: run_chunk(c, inp), x,\n                   use_reentrant=False)\n\n# MEASURE IT, because the difference between the two is the whole lesson:\ntorch.cuda.reset_peak_memory_stats()\ntrain_step()\nprint(torch.cuda.max_memory_allocated() / 2**20, \"MiB\")\n#\n#   no checkpointing ........ ~693 MiB   1.00x time\n#   per-layer checkpointing . ~ barely better, SAME recompute cost paid\n#   segmented (sqrt(L)) ..... ~224 MiB   ~1.4x time      <- 68% less peak\n#\n# USE use_reentrant=False. The older reentrant implementation has real\n# limitations - it needs at least one input requiring grad, it interacts badly\n# with some hooks, and it does not support all backward patterns. The\n# non-reentrant version is the supported path.",
          "caption": "Per-layer checkpointing stores a boundary per layer, so it pays the full recompute cost for almost no saving. Segmenting at about the square root of the depth is what turns the technique from useless into a two-thirds memory reduction."
        },
        {
          "h": "The two silent correctness traps, and the selective alternative",
          "paras": [
            "Recomputation assumes the forward is a pure function of its inputs. Where it is not, the recomputed pass differs from the original and the gradients are wrong - quietly."
          ],
          "code": "# TRAP 1: RANDOMNESS. If the segment contains dropout, the recomputed forward\n# must produce the SAME mask, or the gradients correspond to a different\n# function than the one that produced the output.\n#   torch.utils.checkpoint SAVES AND RESTORES the RNG state by default -\n#   preserve_rng_state=True. A hand-rolled recompute that forgets this is\n#   SUBTLY WRONG and still trains, converging slightly worse forever.\n\n# TRAP 2: SIDE EFFECTS. If the segment contains BatchNorm in training mode,\n# the recomputed forward updates the running statistics a SECOND time, so they\n# advance at twice the intended rate. No error, slightly wrong statistics at\n# eval. LayerNorm has no running state and is unaffected - one more reason\n# transformers are easier to checkpoint than convnets.\n\n# TRAP 3: INTERACTIONS.\n#   + QLoRA  -> the recomputed forward DEQUANTIZES the 4-bit weights again, so\n#               the combined step is slower than either technique suggests\n#   + DDP    -> the recompute happens inside backward; use_reentrant=False is\n#               required for this to compose correctly\n#   + compile-> AOTAutograd already chooses save-vs-recompute as a min-cut, at\n#               finer granularity. Layering manual checkpointing on top can\n#                fight it - measure both rather than assuming they add.\n\n# THE MODERN REFINEMENT - selective recomputation. Recompute only the ops with\n# a high bytes-stored-per-FLOP ratio and STORE the expensive ones:\nfrom torch.utils.checkpoint import create_selective_checkpoint_contexts\n#   In a transformer: attention softmax output, dropout masks and elementwise\n#   activations are LARGE and CHEAP to recreate; the matmuls are the reverse.\n#   Recomputing only the former recovers most of the memory for a fraction of\n#   the ~33% uniform cost - and touches fewer operations that can go wrong.",
          "caption": "Recomputation assumes purity. Dropout breaks it unless the RNG state is restored - which the library does and a hand-rolled version forgets - and BatchNorm breaks it by updating its running statistics twice, silently."
        }
      ],
      "useCases": [
        "Training a model whose activations do not fit, which is the primary case - long sequences, large batches, or deep networks, where checkpointing is often the difference between a job that runs and one that does not.",
        "Raising the batch size to improve throughput or gradient quality, since trading a third more compute for a much larger batch is frequently a net win in wall-clock time to a target loss rather than a pure cost.",
        "Long-context training, where activation memory scales with sequence length and is the dominant term - and where selective recomputation of the attention intermediates specifically targets the largest and cheapest-to-recreate tensors.",
        "Combining with sharding, where FSDP reduces the parameter terms and checkpointing reduces the activation term - they attack disjoint parts of the budget and are routinely used together at large scale."
      ],
      "pitfalls": [
        "Checkpointing every layer individually. You store a boundary per layer, which is roughly what you were storing anyway, so the saving is negligible while you pay the full recompute cost. Segment at about the square root of the depth.",
        "Hand-rolling recomputation without restoring the RNG state. A segment containing dropout will recompute with different masks, so the gradients correspond to a different function than the one that produced the output - silently wrong, and it still trains.",
        "Checkpointing a segment containing BatchNorm in training mode. The recomputed forward updates the running statistics a second time, so they advance at twice the intended rate with no error and a slightly wrong model at evaluation.",
        "Using the reentrant implementation. use_reentrant=False is the supported path; the older version requires at least one input to require grad, interacts badly with some hooks, and does not support all backward patterns.",
        "Applying it when activations are not the binding term. If parameters and optimizer state dominate - a large model with a small batch - checkpointing buys almost nothing and costs a third of your compute. Compute the budget first.",
        "Forgetting it compounds badly with quantized weights. Under QLoRA the recomputed forward dequantizes the base weights a second time, so the combined step is slower than either technique alone would suggest.",
        "Layering manual checkpointing on top of torch.compile without measuring. AOTAutograd already chooses save-versus-recompute as a min-cut at finer granularity, so the two can fight rather than compose."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Where the budget is decomposed. Checkpointing attacks exactly one term - activations - and the discipline of computing which term binds before choosing a technique is what stops you spending a third of your compute for nothing."
        },
        {
          "ref": "pytorch-internals/mini-framework",
          "text": "Why activations exist at all: reverse-mode autodiff must retain what the backward closures need, which is the cost of getting all partial derivatives in one pass. Checkpointing is the lever on that specific cost."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "The complementary technique. Sharding divides the parameter, gradient and optimizer terms across devices; checkpointing reduces the activation term on each. They attack disjoint parts of the budget and are used together at scale."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "AOTAutograd's partitioner already solves a fine-grained version of this as a min-cut on the joint forward-backward graph, which is why compiled training can use less activation memory than eager - and why layering manual checkpointing on top needs measuring."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "The interaction that surprises people: the recomputed forward pays the dequantization a second time, so the two memory techniques together are slower per step than their individual costs suggest."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is gradient checkpointing?",
          "a": "Store activations only at segment boundaries and recompute each segment's forward during the backward pass, trading compute for activation memory."
        },
        {
          "q": "Why do activations need storing at all?",
          "a": "Reverse-mode autodiff's backward closures need the intermediate values, which is the memory cost of getting every partial derivative in a single pass."
        },
        {
          "q": "What is the memory result?",
          "a": "With L layers in segments of size s, memory goes like L/s + s, minimized at s = sqrt(L), giving O(sqrt(L)) activation memory."
        },
        {
          "q": "Why does checkpointing every layer fail?",
          "a": "At s = 1 you store L boundaries, which is roughly what you stored before - so the saving is negligible and you pay the recompute anyway."
        },
        {
          "q": "What does it cost in compute?",
          "a": "About one extra forward pass. Since a step is roughly three forward-equivalents, that is about 33% more, and measured figures land near 1.4x."
        },
        {
          "q": "Why must the RNG state be restored?",
          "a": "If the segment contains dropout, the recomputed forward must produce the same masks or the gradients correspond to a different function than the one that produced the output."
        },
        {
          "q": "What goes wrong with BatchNorm in a checkpointed segment?",
          "a": "The recomputed forward updates the running statistics a second time, so they advance at twice the intended rate - with no error."
        },
        {
          "q": "Why does LayerNorm avoid that problem?",
          "a": "It has no running state, so recomputation has no side effect. This is one reason transformers are easier to checkpoint than convnets."
        },
        {
          "q": "What is use_reentrant=False?",
          "a": "The modern non-reentrant implementation, which is the supported path. The older one needs an input requiring grad and interacts badly with some hooks."
        },
        {
          "q": "What is selective recomputation?",
          "a": "Recomputing only operations with a high stored-bytes-per-FLOP ratio - attention intermediates, dropout masks, activations - while storing the expensive matmuls."
        },
        {
          "q": "How does it interact with QLoRA?",
          "a": "Badly for speed: the recomputed forward dequantizes the 4-bit weights a second time, so the combined step is slower than either technique suggests."
        },
        {
          "q": "When should you not use it?",
          "a": "When activations are not the binding term - a large model with a small batch is dominated by parameters and optimizer state, so you would pay a third of your compute for nothing."
        }
      ],
      "standard": [
        {
          "q": "Is trading a third of your compute for memory ever a net win in wall-clock time?",
          "a": "Frequently, and the reasoning is the point of this module's framing - you are not spending compute to save memory as an end, you are spending it to relieve whatever the memory constraint was preventing. THE FOUR WAYS IT PAYS BACK. (1) IT LETS YOU RAISE THE BATCH SIZE, which improves hardware utilization. A GPU at batch 4 is often running its matmuls at a fraction of peak because the shapes are too small to fill the device and launch overhead is a large fraction. Checkpointing to afford batch 32 can more than recover the 33% - the arithmetic gets more efficient faster than the recompute costs. So the comparison is not checkpointed-versus-not at the same batch, which is the comparison people run; it is checkpointed-at-large-batch versus not-checkpointed-at-small-batch, which is the choice you actually face. (2) IT AVOIDS A WORSE ALTERNATIVE. If the model does not fit at all, the alternatives are sharding across more devices - which costs communication and hardware - or not training. A third more compute on one device beats an all-gather on every layer across four. (3) IT REMOVES GRADIENT-ACCUMULATION OVERHEAD. If you were micro-batching to a tiny batch and accumulating over many steps, you were already paying poor utilization plus the accumulation bookkeeping. Checkpointing may let you use a larger micro-batch and fewer accumulation steps, which is faster overall. (4) IN DISTRIBUTED TRAINING, a larger per-device batch means fewer optimizer steps for the same number of tokens, and therefore fewer gradient all-reduces - so it reduces communication as a side effect. That one is easy to miss and can be substantial. WHEN IT DOES NOT PAY BACK. If you were already compute-bound at a well-utilized batch size, and you checkpoint without raising the batch, you have simply paid 33% for headroom you are not spending. This is the common failure and it is a bookkeeping error rather than a technical one - people enable checkpointing to fix an out-of-memory, the job now fits, and nobody revisits the batch size. HOW I WOULD DECIDE. Measure the metric that actually matters, which is TIME TO A TARGET LOSS or tokens per second, not step time. Step time gets worse by construction; throughput may improve. Run three configurations - no checkpointing at the largest batch that fits, checkpointing at a larger batch, and checkpointing at the largest batch that fits - and compare tokens per second. That takes an hour and it is the only way to know, because the exchange rate depends on where your model sits on the utilization curve. THE FRAMING I WOULD LEAVE. This module's techniques are exchanges, and an exchange is only favourable relative to what you do with the proceeds. Buying memory and not spending it is a loss; buying memory and converting it into utilization is usually a gain."
        },
        {
          "q": "Explain gradient checkpointing - the mechanism, the maths, and the traps.",
          "a": "THE PROBLEM. Reverse-mode autodiff gives every partial derivative in one backward pass, and the price is that it must RETAIN the intermediate values the backward needs. For most training jobs those activations dominate the memory budget, scaling with batch times sequence times depth rather than with parameter count. THE MECHANISM. Run a segment of the network with graph recording disabled, saving only its INPUT. When the backward pass reaches that segment, re-run its forward with recording enabled to rebuild the local graph, backpropagate through it, and free the intermediates immediately. So the segment's activations exist only during its own backward rather than for the whole step. THE MATHS, which is where the practical content is. Peak memory has two terms: the boundaries you keep for the entire forward pass, and the intermediates of the one segment currently being recomputed. With L layers in segments of size s that is proportional to L/s plus s, minimized at s equal to the square root of L, giving O(sqrt(L)) activation memory. This is Chen et al.'s sublinear-memory result. THE FAILURE THAT FOLLOWS DIRECTLY, and it is the thing people get wrong: setting s = 1, checkpointing every individual layer, makes the first term L - which is approximately what you were storing anyway. So you get a negligible saving AND pay the full recompute cost. Segmenting is not a refinement, it is the technique. THE COMPUTE COST. One extra forward. A backward is roughly twice a forward, so a step is about three forward-equivalents and checkpointing makes it four - about 33% more, and measured figures land near 1.4x. Against that, a representative measurement showed peak activation memory falling by about two thirds. That is the exchange rate, and it is favourable whenever activations are the binding term. THE TWO CORRECTNESS TRAPS, both silent. RANDOMNESS: if the segment contains dropout, the recomputed forward must produce the SAME masks, or the gradients correspond to a different function than the one that produced the output. PyTorch's implementation saves and restores the RNG state for exactly this reason; a hand-rolled version that forgets is subtly wrong and still trains. SIDE EFFECTS: a BatchNorm in the segment updates its running statistics a second time during recomputation, so they advance at twice the intended rate. LayerNorm has no running state and is unaffected, which is one reason transformers are easier to checkpoint than convnets. THE MODERN REFINEMENT. Selective recomputation: rank operations by stored bytes per FLOP of recomputation and recompute only the top of that list. In a transformer the attention intermediates and elementwise activations are large and cheap to recreate while the matmuls are the reverse, so recomputing only the former recovers most of the memory for a fraction of the uniform cost. And note that torch.compile's AOTAutograd partitioner already solves a version of this automatically as a min-cut on the joint graph.",
          "deepDive": {
            "q": "Derive the sqrt(L) result properly, and say when the optimum is not sqrt(L).",
            "a": "THE SETUP. A network of L layers, each producing activations of roughly equal size a. Without checkpointing, peak activation memory is L*a - everything is stored until backward consumes it. WITH SEGMENTS OF SIZE s. During the forward pass you keep only the segment boundaries: there are L/s of them, costing (L/s)*a, and these persist for the entire step. During the backward pass, when you recompute segment i, you materialize its s internal activations, costing s*a, and free them before moving to the next segment. So peak is (L/s)*a + s*a, since only one segment is materialized at a time. MINIMIZING. Differentiate L/s + s with respect to s: -L/s^2 + 1 = 0, so s = sqrt(L). Substituting gives 2*sqrt(L)*a. Compare against L*a: for L = 100, that is 20a rather than 100a, a factor of five; for L = 1000, 63a rather than 1000a, a factor of sixteen. The benefit grows with depth, which is the point of the result. THE COMPUTE COST is independent of s to first order: every layer is recomputed exactly once regardless of segment size, so the extra work is one forward pass whatever s you choose. That is what makes the memory optimization free to tune - you are choosing a point on a memory curve, not a memory-compute curve. WHEN THE OPTIMUM IS NOT sqrt(L) - four cases, and each is a real one. (1) UNEQUAL LAYER SIZES. The derivation assumed equal activation sizes. In a real transformer, attention and MLP sublayers differ, and in a U-Net or a convnet with changing resolution the sizes vary by more than an order of magnitude. Then you want boundaries placed where the activations are SMALL, not at uniform intervals - a boundary after a downsampling layer is much cheaper than one before it. The general problem is optimal placement given per-layer costs, which is what Griewank and Walther's Revolve solves for the equal-cost case and what Checkmate solves as an integer program for the general case. (2) A MEMORY BUDGET RATHER THAN A MINIMUM. Usually you do not want minimum memory - you want to FIT, and then spend nothing more. If s = sqrt(L) fits with room to spare, a larger s means fewer boundaries recomputed at a time and, with selective schemes, less recompute. The right formulation is minimize compute subject to memory below the budget, not minimize memory. (3) NON-UNIFORM RECOMPUTE COSTS. If some layers are much more expensive to recompute than others - a large matmul versus an activation function - you want to avoid recomputing those, which is exactly the selective-recomputation criterion of bytes stored per FLOP. That breaks the uniform-segment assumption entirely. (4) NESTED OR HIERARCHICAL CHECKPOINTING. You can checkpoint recursively, which gives O(log L) memory for O(log L) recompute passes - a different point on the curve that is rarely used in practice because the constant factors and the implementation complexity are unfavourable, but it is the theoretical end of the trade. WHAT I WOULD DO PRACTICALLY. Start at sqrt(L), then treat s as a knob tuned against the actual memory budget and measured throughput, because the equal-size assumption rarely holds and the real objective is fitting rather than minimizing. And if the model is a transformer, look at selective recomputation before uniform segmenting, since the memory-per-FLOP distribution there is very skewed and exploiting it is strictly better."
          }
        },
        {
          "q": "When would you use checkpointing, and what would you try first?",
          "a": "THE PRECONDITION: ACTIVATIONS MUST BE THE BINDING TERM. Compute the budget first - weights at bytes per parameter, gradients and optimizer state at about fourteen more bytes per TRAINABLE parameter under mixed-precision Adam, activations proportional to batch times sequence times depth. If parameters dominate, which is the case for a large model with a small batch, checkpointing buys almost nothing and costs a third of your compute. That calculation takes two minutes and it is the difference between the technique helping and being a pure loss. WHAT I WOULD TRY FIRST, cheapest and least invasive. (1) MIXED PRECISION, which halves the activation bytes for essentially free and is the default anyway. (2) A SMALLER MICRO-BATCH WITH GRADIENT ACCUMULATION. This reduces peak activation memory linearly, keeps the effective batch, and costs only slightly worse hardware utilization - no recompute at all. If the goal is simply to fit, this is often sufficient and it is strictly cheaper than checkpointing. (3) SHORTER SEQUENCES if the task permits, since two terms scale with length. (4) MEMORY-EFFICIENT ATTENTION, which avoids materializing the attention matrix - the single largest activation in a transformer - and is a better-targeted fix than recomputing everything. WHEN CHECKPOINTING BECOMES THE RIGHT ANSWER. When micro-batching has been pushed to one and it still does not fit. When you want a LARGER batch than memory allows for throughput or gradient-quality reasons, and trading a third more compute for four times the batch is a net win in wall-clock time to a target loss. And when training long-context models, where activation memory scales with sequence length and dominates everything - which is the case where it is not optional. HOW I WOULD APPLY IT. Segment at about sqrt(L) as a starting point, then tune s against the actual budget rather than minimizing memory, because the real objective is to fit with the least compute rather than to minimize. For a transformer, look at SELECTIVE recomputation first - the attention intermediates and elementwise activations have a very high stored-bytes-per-FLOP ratio and recomputing only those gets most of the memory for a fraction of the cost. Use use_reentrant=False. And verify: measure peak memory and throughput before and after, because both numbers matter and people usually only check the first. WHAT I WOULD WATCH FOR AFTERWARDS. Whether the model contains BatchNorm in a checkpointed segment, since its running statistics will advance twice. Whether the throughput cost matches the expected 1.3 to 1.4x, since a much larger figure suggests an interaction - with quantized weights, which pay dequantization twice, or with a compiled region whose partitioner is already doing this. And whether the extra memory actually bought anything: if you checkpointed and did not raise the batch size, you paid a third of your compute for headroom you are not using."
        },
        {
          "q": "Explain the correctness requirements of recomputation and how they are enforced.",
          "a": "THE UNDERLYING ASSUMPTION. Recomputation is valid only if the segment's forward is a PURE FUNCTION of its saved inputs - same inputs, same outputs, no side effects. If that fails, the gradients you compute correspond to a different function than the one that produced the output you are differentiating, and the result is wrong in a way that still trains. THREE WAYS PURITY FAILS. (1) RANDOMNESS. Dropout is the obvious case, and any stochastic layer or augmentation inside the segment. The recomputed forward draws new random numbers, so the dropout masks differ, so the recomputed graph is not the graph that produced the output. The gradients are then a mixture: an incoming gradient computed for one mask, propagated through a network with a different mask. It is not catastrophic - it is a form of gradient noise - which is exactly why it is dangerous, since the run converges slightly worse and nothing indicates why. THE FIX: save the RNG state before the original forward and restore it before the recomputation. PyTorch's checkpoint does this by default via preserve_rng_state, for both CPU and CUDA generators. A hand-rolled implementation almost always forgets. (2) SIDE EFFECTS ON MODULE STATE. BatchNorm in training mode updates running_mean and running_var on every forward, so the recomputation updates them again - the statistics advance at twice the intended rate and end up weighted differently across the run. No error, and a slightly wrong model at evaluation time. There is no clean automatic fix; the practical answers are to avoid checkpointing across BatchNorm, to use SyncBatchNorm's or a custom module's momentum accounting deliberately, or - most commonly in practice - to use LayerNorm, which has no running state. This is a real reason transformers are more checkpoint-friendly than convnets. (3) SIDE EFFECTS ON EXTERNAL STATE. Anything in the segment that writes to a list, increments a counter, logs, or mutates a global will do it twice. Uncommon but genuinely confusing when it happens, because the symptom is a metric that is exactly double. HOW THE LIBRARY ENFORCES WHAT IT CAN. The non-reentrant implementation saves and restores RNG state, handles the autograd bookkeeping so the recomputed graph splices correctly into the outer backward, and supports the patterns the older reentrant version could not - inputs that do not require grad, some hook interactions, and more of the backward surface. That is why use_reentrant=False is the supported path and the older one is deprecated. WHAT IT CANNOT ENFORCE is module-state side effects, because it has no way to know which state updates are intended. THE TEST I WOULD WRITE. Run one training step with checkpointing and one without, with the same seed and the same data, and compare the resulting gradients elementwise. They should match to floating-point tolerance. That single test catches the RNG problem immediately and catches BatchNorm indirectly, and it is the only way to verify a hand-rolled implementation - because everything about this failure mode is silent."
        },
        {
          "q": "How does checkpointing interact with the other techniques in this module?",
          "a": "WITH MIXED PRECISION - COMPLEMENTARY AND MULTIPLICATIVE. Mixed precision halves the bytes per activation; checkpointing reduces the NUMBER of activations stored. They attack the same term by different mechanisms and the savings compound. One interaction worth naming: the recomputed forward also runs in low precision, so it is faster than a fp32 recompute would be, which improves the exchange rate slightly. WITH GRADIENT ACCUMULATION - COMPLEMENTARY, AND USUALLY TRY ACCUMULATION FIRST. Micro-batching reduces peak activation memory LINEARLY with no recompute cost at all, so if the goal is simply to fit, it is strictly cheaper. Checkpointing becomes the answer when the micro-batch is already one. Combining them is standard at scale. WITH FSDP - COMPLEMENTARY, ATTACKING DISJOINT TERMS. Sharding divides parameters, gradients and optimizer state across devices; checkpointing reduces activations on each device. Neither helps with the other's term, which is why large-scale training uses both. One detail: FSDP's activation checkpointing must be applied with the wrapping in mind, since the checkpoint boundaries and the FSDP unit boundaries interact - a checkpointed region spanning several FSDP units forces parameter all-gathers during the recomputation as well. WITH QLoRA - THIS ONE IS UNFAVOURABLE AND SURPRISES PEOPLE. The base weights are 4-bit and must be dequantized on every matmul. The recomputed forward pays that dequantization a SECOND time, so the combined step is slower than the two techniques' individual costs would suggest. It is still usually the right combination, because both are memory techniques and memory is the binding constraint in that setting - but budget for the interaction rather than discovering it. WITH torch.compile - THE MOST INTERESTING INTERACTION. AOTAutograd's partitioner already decides save-versus-recompute as a MIN-CUT on the joint forward-backward graph, at operation granularity rather than segment granularity. So compiled training already does a fine-grained, automatically-optimized version of this. Layering manual segment checkpointing on top can help - it operates at a coarser granularity the partitioner does not consider - or can fight it. The honest answer is to measure both, and to be aware that a compiled model may already be using less activation memory than eager for this reason. WITH DDP - one correctness note: the recomputation happens inside the backward pass, and use_reentrant=False is required for it to compose correctly with DDP's gradient bucketing and hooks. The older implementation had genuine problems here. THE PATTERN ACROSS ALL OF THESE, which is the module's theme: the techniques target different terms of one budget, and their interactions are mostly about ordering and about which term each leaves untouched. The failures come from applying two techniques to the same term and expecting them to add, or from missing an interaction cost like the double dequantization.",
          "deepDive": {
            "q": "AOTAutograd chooses save-versus-recompute automatically. Does manual checkpointing still have a role?",
            "a": "YES, AND THE REASONS ARE ABOUT GRANULARITY AND CONTROL. WHAT THE PARTITIONER DOES. AOTAutograd builds a joint forward-backward graph and partitions it, choosing which intermediate tensors to save and which to recompute in the backward. It formulates this as a min-cut: the cut separates forward from backward, the cut edges are the saved tensors, and minimizing the cut minimizes what must be stored, subject to a cost model for recomputation. It works at OPERATION granularity, so it can decide to recompute a single cheap elementwise operation rather than storing its output - a level of detail no manual scheme reaches. This is genuinely good and it is why compiled training can use less activation memory than eager, which surprises people expecting a compiler to change only speed. WHERE MANUAL CHECKPOINTING STILL WINS. (1) COARSE GRANULARITY. The partitioner works within a graph and its cost model is local. Manual checkpointing can declare that an entire transformer block should be recomputed wholesale, which is a much larger structural decision than the min-cut considers - and at very long sequence lengths that block-level decision is where the memory is. (2) GRAPH BREAKS LIMIT IT. The partitioner only sees within a graph, so a model with breaks gets partitioning per-fragment rather than globally. Manual checkpointing spans breaks because it is a runtime construct. (3) IT WORKS IN EAGER MODE, which matters when you are not compiling - during development, on unsupported hardware, or when compilation is not viable for other reasons. (4) EXPLICIT CONTROL over a memory budget. The partitioner optimizes its cost model; if you need to fit within a specific limit, an explicit checkpointing policy is a more direct instrument than hoping the partitioner's objective aligns with yours. (5) SELECTIVE CHECKPOINTING APIs let you specify a policy - recompute these operation types, store those - which encodes domain knowledge about the memory-per-FLOP distribution that a generic cost model may not capture. HOW THEY COMBINE IN PRACTICE. A checkpointed region under compilation is compiled as two graphs - the no-grad forward and the recomputed one - and the partitioner operates within each. So they layer rather than conflict, but the total recompute can end up higher than either alone would suggest, because the partitioner may additionally recompute inside a region you already declared recomputable. THAT is the case to measure rather than assume. WHAT I WOULD ACTUALLY DO. Compile first and measure peak memory, since you may find you no longer need manual checkpointing at all. If you still need it, apply it at block granularity with selective policies, and measure both memory and throughput - because the interaction is not predictable from first principles and the whole module's discipline is that the exchange rate is a property of your configuration."
          }
        },
        {
          "q": "You enabled checkpointing and throughput dropped much more than 33%. What is happening?",
          "a": "The theoretical cost is one extra forward pass, so about a third. A much larger figure means something beyond plain recomputation, and there are five candidates I would check in order. CANDIDATE 1: PER-LAYER CHECKPOINTING. If you wrapped every layer individually, you pay the full recompute cost AND get almost no memory saving - so the throughput drop is real and the benefit is not there. Check peak memory: if it barely moved, this is the answer, and segmenting fixes both halves at once. CANDIDATE 2: AN EXPENSIVE OPERATION INSIDE THE RECOMPUTED SEGMENT. The one-third figure assumes recompute cost is proportional to forward cost. If the segment contains something whose recomputation is disproportionately expensive - a dequantization, an all-gather, a data-dependent operation - you pay more than a forward. The QLoRA case is the standard one: the recomputed forward dequantizes the 4-bit base weights a second time, and dequantization is memory-bound and slow. FSDP is another: if a checkpointed region spans FSDP unit boundaries, the recomputation triggers parameter ALL-GATHERS again, which is communication rather than compute and can dominate. CANDIDATE 3: THE RECOMPUTE IS SERIALIZED AGAINST SOMETHING. In DDP, the backward's gradient all-reduces are overlapped with backward computation. Inserting recomputation changes the timing of when gradients become ready, which can break that overlap - so you lose not only the recompute time but the communication that was previously hidden. Diagnosis is a profile timeline showing communication no longer overlapping. CANDIDATE 4: MEMORY PRESSURE ELSEWHERE. If checkpointing let you raise the batch size and you did, the comparison is no longer like-for-like. And if peak memory is now close to capacity, the caching allocator may be thrashing - freeing and re-reserving segments - which shows as rising reserved memory and erratic step times. CANDIDATE 5: THE BENCHMARK. Did you warm up and synchronize? Did you compare at the same batch size? Recomputation adds kernel launches, so at very small batch sizes the launch overhead is a larger fraction and the relative cost is higher than the FLOP argument suggests. HOW I WOULD DIAGNOSE. Profile with and without, and compare the timelines rather than only the totals. The recomputation appears as a duplicate of the forward kernels inside the backward region, and its duration tells you immediately whether it costs what it should. If the extra time is NOT in those kernels, it is communication or allocator behaviour, and the timeline shows which. WHAT I WOULD DO ABOUT IT. If it is per-layer, segment. If it is an expensive operation in the segment, move the segment boundary so that operation falls outside it, or use selective recomputation to exclude it explicitly. If it is broken overlap in DDP, check that use_reentrant=False is set, since the reentrant version composes badly with DDP's hooks. And in all cases, re-ask whether you needed the memory: if you checkpointed and did not raise the batch size, you have paid a third or more of your compute for headroom you are not spending."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The sqrt(L) result",
        "back": "M(s) ~ L/s (boundaries kept) + s (one segment recomputed), minimized at s* = sqrt(L) giving M* ~ 2*sqrt(L). At L=1000 that is 63a instead of 1000a. The compute cost is ONE extra forward regardless of s."
      },
      {
        "type": "pitfall",
        "front": "Per-layer checkpointing saves NOTHING",
        "back": "At s=1 you keep L boundaries - roughly what you stored anyway - and pay the full recompute cost. Segmentation is not a refinement, it IS the technique. Measured: ~693 MiB -> ~224 MiB (68% less) at ~1.4x time, only when segmented."
      },
      {
        "type": "formula",
        "front": "Why the overhead is ~33%",
        "back": "A backward is ~2 forwards, so a step is ~3 forward-equivalents; checkpointing makes it 4. 4/3 ~ 1.33, and measured figures land near 1.4x. A MUCH larger drop means something else - see the interaction traps."
      },
      {
        "type": "pitfall",
        "front": "Recomputation assumes PURITY - dropout breaks it",
        "back": "The recomputed forward must draw the SAME random masks or the gradients correspond to a different function than the one that produced the output. torch.utils.checkpoint saves/restores RNG state by default; a hand-rolled version forgets, and it still trains."
      },
      {
        "type": "pitfall",
        "front": "BatchNorm updates its running stats TWICE",
        "back": "The recomputed forward is a second training-mode forward, so running_mean/var advance at twice the intended rate - no error, slightly wrong model at eval. LayerNorm has no running state, which is one reason transformers checkpoint more easily than convnets."
      },
      {
        "type": "definition",
        "front": "Selective recomputation",
        "back": "Rank ops by STORED BYTES PER FLOP and recompute only the top. In a transformer, attention intermediates / dropout masks / activations are large and cheap to recreate; matmuls are the reverse. Most of the memory for a fraction of the uniform ~33%."
      },
      {
        "type": "pitfall",
        "front": "use_reentrant=False",
        "back": "The supported path. The older reentrant implementation needs at least one input requiring grad, interacts badly with some hooks, does not support all backward patterns, and composes poorly with DDP's gradient bucketing."
      },
      {
        "type": "intuition",
        "front": "Try micro-batching BEFORE checkpointing",
        "back": "Gradient accumulation reduces peak activation memory LINEARLY with NO recompute cost - so if the goal is just to fit, it is strictly cheaper. Checkpointing is the answer once the micro-batch is already 1, or when you want a LARGER batch than memory allows."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing + QLoRA compounds badly",
        "back": "The recomputed forward DEQUANTIZES the 4-bit base weights a second time, and dequantization is memory-bound and slow. Still usually the right combination (both are memory techniques) - but budget for it rather than discovering it."
      },
      {
        "type": "intuition",
        "front": "AOTAutograd already does a fine-grained version",
        "back": "The compile partitioner chooses save-vs-recompute as a MIN-CUT on the joint graph, at OPERATION granularity - which is why compiled training can use less activation memory than eager. Manual checkpointing still wins on coarse (block-level) decisions and in eager mode."
      },
      {
        "type": "intuition",
        "front": "sqrt(L) is not always the right s",
        "back": "The derivation assumes EQUAL layer sizes. With varying activation sizes, place boundaries where activations are SMALL. And the real objective is usually 'minimize compute subject to fitting', not 'minimize memory' - so tune s against the budget."
      },
      {
        "type": "intuition",
        "front": "The test that catches every silent checkpointing bug",
        "back": "Run one step with and one without checkpointing, same seed, same data, and compare gradients elementwise - they must match to float tolerance. Catches the RNG problem immediately and BatchNorm indirectly. It is the only verification for a hand-rolled implementation."
      }
    ],
    "refs": [
      {
        "title": "Chen et al. (2016), Training Deep Nets with Sublinear Memory Cost",
        "url": "https://arxiv.org/abs/1604.06174"
      },
      {
        "title": "Korthikanti et al. (2022), Reducing Activation Recomputation in Large Transformer Models",
        "url": "https://arxiv.org/abs/2205.05198"
      },
      {
        "title": "Jain et al. (2020), Checkmate: Breaking the Memory Wall with Optimal Tensor Rematerialization",
        "url": "https://arxiv.org/abs/1910.02653"
      },
      {
        "title": "Griewank & Walther (2000), Revolve: An Implementation of Checkpointing for the Reverse Mode of Automatic Differentiation",
        "url": "https://dl.acm.org/doi/10.1145/347837.347846"
      },
      {
        "title": "PyTorch: torch.utils.checkpoint",
        "url": "https://pytorch.org/docs/stable/checkpoint.html"
      }
    ],
    "demos": [
      "mixed-precision",
      "quantization",
      "batching",
      "backprop"
    ]
  },
  "gradient-accumulation": {
    "level": "core",
    "body": {
      "intuition": [
        "Gradient accumulation needs no special support because backward already accumulates into .grad - a value used in several places receives a contribution from each, which is the multivariable chain rule. So running k micro-batches without calling zero_grad between them, and dividing each loss by k, gives exactly the gradient of the concatenated batch. Two lines. The exchange is wall-clock time for effective batch size: you get the large-batch gradient on hardware that cannot hold a large batch, and you pay k forward-backward passes per optimizer step.",
        "The equivalence is exact, and the conditions matter. It holds because the loss is a MEAN over examples, so the mean of per-micro-batch means equals the overall mean - provided the micro-batches are the same size. It fails in three ways that are all silent. BatchNorm computes statistics over the micro-batch, so a model with BatchNorm accumulated over k steps is genuinely not the same function as one trained at the full batch. A loss with IN-BATCH INTERACTIONS - a contrastive objective whose denominator contains the other examples - is not a mean over examples at all, so its per-micro-batch value is not a shard of the global loss and accumulating it optimizes something different. And a per-batch normalizer such as a real-token count differs per micro-batch, so averaging the normalized losses is not the globally normalized loss.",
        "The question underneath all of this is why you want a large batch, and the honest answer is that the benefit saturates at a point you can estimate. Large batches use hardware efficiently and reduce communication per token, and they were once thought to generalize worse - the sharp-minima story - until the linear scaling rule with warmup showed that much of that gap was a tuning artefact. What survived is the CRITICAL BATCH SIZE: below it, doubling the batch roughly halves the number of steps to a target loss; above it, you burn compute for almost no reduction in steps. McCandlish et al. showed this is predicted by the gradient NOISE SCALE, which you can measure. That makes this lesson's exchange rate something you can compute rather than guess, which is unusual and worth exploiting."
      ],
      "math": [
        {
          "h": "Why accumulation is exactly equivalent, and when it is not",
          "paras": [
            "The loss is a mean over examples, so the gradient is a mean of per-example gradients. Splitting into k equal micro-batches and averaging their means recovers the same quantity exactly - no approximation.",
            "The condition is equal micro-batch sizes. With unequal sizes the unweighted average over-weights examples in the smaller micro-batches."
          ],
          "tex": "\\nabla \\Big[\\tfrac{1}{B}\\textstyle\\sum_{i=1}^{B} \\ell_i\\Big] = \\frac{1}{k}\\sum_{j=1}^{k} \\nabla\\Big[\\tfrac{k}{B}\\textstyle\\sum_{i \\in \\mathcal{B}_j} \\ell_i\\Big] \\qquad \\text{iff } |\\mathcal{B}_j| = B/k \\;\\forall j",
          "texNote": "The 1/k on the right is why you divide the loss by the accumulation count - omit it and the effective learning rate is k times larger, which usually presents as divergence a few hundred steps in rather than as an obvious error. Note this argument requires the loss to be a per-example mean; a contrastive objective with in-batch negatives is not, and the equivalence simply does not apply to it."
        },
        {
          "h": "The gradient noise scale and the critical batch size",
          "paras": [
            "A minibatch gradient is a noisy estimate of the true gradient. The noise scale compares the gradient's variance against its magnitude - roughly, how many examples you need before the estimate is dominated by signal rather than noise.",
            "Below the critical batch size, more examples buy a proportionally better gradient and therefore fewer steps. Above it, the gradient is already accurate and extra examples buy almost nothing."
          ],
          "tex": "B_{\\text{noise}} = \\frac{\\operatorname{tr}(\\Sigma)}{|\\nabla L|^2}, \\qquad \\frac{S}{S_{\\min}} = 1 + \\frac{B_{\\text{noise}}}{B} \\;\\;\\Longrightarrow\\;\\; \\text{steps} \\times \\text{examples} \\text{ trade hyperbolically}",
          "texNote": "Read the second relation as a hyperbola: at B far below B_noise, doubling the batch roughly halves the steps, so total compute is unchanged and wall-clock halves. At B far above it, steps barely fall and total compute doubles. The knee is the critical batch size, and it GROWS during training as the gradient gets smaller - which is why large runs increase the batch size over the course of training rather than fixing it."
        },
        {
          "h": "The linear scaling rule, and why warmup is needed",
          "paras": [
            "Scaling the batch by a factor scales the gradient estimate's precision but not its magnitude, so to make the same progress per example you scale the learning rate by the same factor. This holds well over a wide range and it is what dissolved much of the supposed large-batch generalization gap.",
            "It breaks at the start of training, when the weights move fast and the linearization the rule relies on is invalid - hence a warmup period."
          ],
          "tex": "B \\to \\kappa B \\;\\Longrightarrow\\; \\eta \\to \\kappa \\eta, \\qquad \\text{with } \\eta \\text{ ramped from } 0 \\text{ over the first few epochs}",
          "texNote": "Goyal et al. used this to train ImageNet at batch 8192 with no accuracy loss, which reframed the earlier sharp-minima result as substantially a tuning artefact rather than a property of large batches. Note the rule is derived for SGD; for Adam the empirical picture is muddier and square-root scaling is sometimes better, which is a reason to sweep rather than to apply the formula blindly."
        }
      ],
      "code": [
        {
          "h": "The loop, and the four places it goes wrong",
          "paras": [
            "Two lines of mechanism and four ordering constraints. Every one of the mistakes below is silent - the run trains and converges differently."
          ],
          "code": "for i, batch in enumerate(loader):\n    is_last = (i + 1) % ACCUM == 0\n\n    # DDP: suppress the all-reduce on every micro-step but the last, or you\n    # communicate ACCUM times per optimizer step instead of once. Large,\n    # common, easily-fixed waste.\n    ctx = nullcontext() if is_last else model.no_sync()\n    with ctx:\n        with torch.autocast(\"cuda\", dtype=torch.bfloat16):\n            loss = criterion(model(batch.x), batch.y) / ACCUM   # <-- DIVIDE.\n        loss.backward()          # accumulates into .grad - this is the whole\n                                 # mechanism, inherited from autograd's '+='\n\n    if is_last:\n        clip_grad_norm_(model.parameters(), 1.0)   # ONCE, before the step\n        opt.step()\n        scheduler.step()         # <-- PER OPTIMIZER STEP, not per micro-batch,\n                                 #     or your schedule runs ACCUM times fast\n        opt.zero_grad(set_to_none=True)\n\n# THE FOUR SILENT MISTAKES:\n#   1. no division by ACCUM  -> effective LR is ACCUM x larger. Usually shows\n#                               as divergence a few hundred steps in.\n#   2. zero_grad inside the loop -> defeats accumulation entirely; you get a\n#                               small batch and believe you have a large one.\n#   3. scheduler per micro-step -> the LR schedule completes ACCUM times too\n#                               early; warmup ends before it has done anything.\n#   4. no no_sync under DDP  -> ACCUM all-reduces per step. Correct results,\n#                               badly wasted bandwidth.\n#\n# EFFECTIVE BATCH = micro_batch x ACCUM x world_size. Write it down and log it:\n# comparing two runs at different effective batch without adjusting the\n# learning rate is comparing two different optimization problems.",
          "caption": "The mechanism is one division and one skipped zero_grad. The four mistakes are all silent - the scheduler one is especially nasty, since warmup finishing early looks like an unstable model rather than a configuration error."
        },
        {
          "h": "Where the equivalence breaks, and how to find your critical batch size",
          "paras": [
            "The exactness argument assumed a per-example mean over equal micro-batches. Three common situations violate it, and the noise-scale measurement is what turns the batch-size decision into a calculation."
          ],
          "code": "# BREAK 1: BATCHNORM. Statistics are computed over the MICRO-batch, so\n# accumulating k micro-batches of size m is NOT the same function as one batch\n# of size k*m - it is k separate normalizations. The model is genuinely\n# different, and at small m the statistics are noisy. Use LayerNorm, GroupNorm,\n# or SyncBatchNorm; or accept it and know that you have.\n\n# BREAK 2: IN-BATCH INTERACTIONS. A contrastive loss's denominator contains\n# the OTHER examples in the batch:\n#     L_i = -log( exp(s_ii/T) / sum_j exp(s_ij/T) )\n# With accumulation, j ranges only over the MICRO-batch, so you have far fewer\n# negatives and are optimizing a different objective. Accumulation does not\n# give you a large-batch contrastive loss. The fixes are a memory bank, a\n# momentum queue (MoCo), or gathering embeddings across ranks before the loss.\n\n# BREAK 3: PER-BATCH NORMALIZERS. If you divide by the real-token count and\n# the micro-batches have different counts, averaging the normalized losses is\n# not the globally normalized loss. Accumulate the SUM of losses and the SUM of\n# token counts, and divide once at the end.\n\n# ---- MEASURE THE CRITICAL BATCH SIZE instead of guessing ----\n# The gradient noise scale: variance of the gradient over its squared norm.\n# Estimate it from two batch sizes (McCandlish et al.'s simple estimator):\ng_small = grad_at(batch_size=b_small)      # noisier\ng_big   = grad_at(batch_size=b_big)        # less noisy\n# |g_B|^2 estimates |G|^2 + tr(Sigma)/B, so two sizes give two equations:\nG2    = (b_big * g_big.norm()**2 - b_small * g_small.norm()**2) / (b_big - b_small)\ntrSig = (g_small.norm()**2 - g_big.norm()**2) / (1/b_small - 1/b_big)\nB_noise = trSig / G2\n#\n#   B << B_noise -> doubling the batch roughly HALVES the steps: same total\n#                   compute, half the wall-clock. Scale up.\n#   B >> B_noise -> steps barely fall: you are DOUBLING COMPUTE FOR NOTHING.\n#\n# B_noise GROWS during training as the gradient shrinks - which is why large\n# runs RAMP the batch size rather than fixing it.",
          "caption": "Contrastive losses are the break people miss: accumulation gives you fewer negatives, not a larger effective batch, so it optimizes a different objective. And the noise scale turns 'how big should the batch be' from a sweep into a two-measurement calculation."
        }
      ],
      "useCases": [
        "Training a model whose desired batch size does not fit in memory, which is the everyday case - accumulation is the cheapest way to decouple the statistical batch size from the hardware's capacity, and it costs no extra compute.",
        "Reproducing a published result on smaller hardware, where matching the effective batch size is necessary for the reported hyperparameters to mean anything.",
        "Large-scale pretraining, where effective batches in the millions of tokens are standard and are assembled from micro-batch times accumulation times world size - and where the critical batch size determines how far that is worth pushing.",
        "Stabilizing a noisy objective: reinforcement learning and preference optimization often have high gradient variance, and a larger effective batch is a direct variance reduction that is frequently cheaper than algorithmic alternatives."
      ],
      "pitfalls": [
        "Forgetting to divide the loss by the accumulation count. Gradients add, so the effective learning rate becomes k times larger - which typically shows as divergence a few hundred steps in rather than as an obvious error.",
        "Calling zero_grad inside the accumulation loop. It defeats the mechanism entirely, so you train at the micro-batch size while believing you have a large effective batch - and the run works, just differently from what you intended.",
        "Stepping the scheduler per micro-batch. The learning-rate schedule then completes k times too early, so warmup finishes before it has done anything and the decay is over long before training is. Step per OPTIMIZER step.",
        "Using DDP without no_sync on the non-final micro-steps. You perform k all-reduces per optimizer step instead of one. The results are correct and the bandwidth is badly wasted, which is why it is easy to miss.",
        "Accumulating a model containing BatchNorm and expecting large-batch behaviour. Statistics are computed per micro-batch, so it is k separate normalizations rather than one over the full batch - a genuinely different function, and noisier at small micro-batch.",
        "Accumulating a contrastive loss. The in-batch negatives come only from the micro-batch, so you get fewer negatives rather than a larger effective batch, and you are optimizing a different objective. Use a memory bank or gather embeddings across ranks.",
        "Raising the effective batch without adjusting the learning rate. The linear scaling rule with warmup exists for a reason, and comparing two runs at different effective batch with the same schedule is comparing two different optimization problems."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/mini-framework",
          "text": "Why this needs no special support: backward accumulates into .grad because a value used in several places receives a contribution from each. Skipping zero_grad is the entire implementation, which is obvious once you have written the engine."
        },
        {
          "ref": "training-systems/ddp",
          "text": "Where no_sync lives, and why it matters - DDP all-reduces on every backward by default, so accumulation without it multiplies your communication by k for identical results."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The critical batch size is the batch-dimension counterpart of the scaling literature: both are about where an axis stops paying, and both turn a tuning question into a measurement."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The other lever on the same constraint. Accumulation reduces peak activation memory linearly with no recompute cost, so it is usually worth trying first; checkpointing takes over once the micro-batch is already one."
        },
        {
          "ref": "neural-nets/adam-lr-scheduling",
          "text": "Where the linear scaling rule and warmup are developed properly. The rule is derived for SGD, and the Adam picture is muddier - which is a reason to sweep the learning rate at a new batch size rather than applying a formula."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How does gradient accumulation work?",
          "a": "Run k micro-batches without calling zero_grad between them, dividing each loss by k. Backward already accumulates into .grad, so that is the whole implementation."
        },
        {
          "q": "Why divide the loss by k?",
          "a": "Gradients add, so without the division the accumulated gradient is k times too large and the effective learning rate is k times higher."
        },
        {
          "q": "Is accumulation exactly equivalent to a large batch?",
          "a": "Yes, provided the loss is a per-example mean and the micro-batches are equal in size - the mean of means is then the overall mean, exactly."
        },
        {
          "q": "What is the effective batch size?",
          "a": "Micro-batch times accumulation steps times world size. Worth logging, because comparing runs at different effective batch without adjusting the learning rate compares different problems."
        },
        {
          "q": "Why does BatchNorm break the equivalence?",
          "a": "Its statistics are computed over the micro-batch, so accumulation gives k separate normalizations rather than one over the full batch - a genuinely different function."
        },
        {
          "q": "Why does a contrastive loss break it?",
          "a": "The denominator contains the other examples in the batch, so with accumulation the negatives come only from the micro-batch. You get fewer negatives, not a larger effective batch."
        },
        {
          "q": "What is no_sync for?",
          "a": "Suppressing DDP's gradient all-reduce on the non-final micro-steps. Without it you communicate k times per optimizer step instead of once."
        },
        {
          "q": "How often should the scheduler step?",
          "a": "Once per optimizer step, not per micro-batch. Otherwise the schedule completes k times too early and warmup ends before it has done anything."
        },
        {
          "q": "What is the gradient noise scale?",
          "a": "The trace of the gradient covariance divided by the squared gradient norm - roughly how many examples you need before the estimate is signal-dominated."
        },
        {
          "q": "What is the critical batch size?",
          "a": "The knee where more examples stop reducing the number of steps. Below it, doubling the batch roughly halves the steps; above it, you double compute for almost nothing."
        },
        {
          "q": "Does the critical batch size change during training?",
          "a": "Yes, it grows as the gradient shrinks - which is why large runs ramp the batch size over the course of training rather than fixing it."
        },
        {
          "q": "What is the linear scaling rule?",
          "a": "Scale the learning rate by the same factor as the batch size, with a warmup period because the rule breaks early in training when the weights move fast."
        }
      ],
      "standard": [
        {
          "q": "Explain gradient accumulation, and prove when it is exactly equivalent to a large batch.",
          "a": "THE MECHANISM, which needs no framework support. Backward ACCUMULATES into .grad rather than overwriting - because a value used in several places receives a gradient contribution from each path, which is just the multivariable chain rule. So running k micro-batches without zero_grad between them leaves the sum of their gradients in .grad. Divide each loss by k and you have the average. Two lines. THE PROOF OF EQUIVALENCE. The loss over a batch B is a MEAN over examples: L = (1/B) sum of per-example losses. Split into k micro-batches of equal size B/k. Micro-batch j's loss is (k/B) times the sum over its examples. Its gradient is therefore (k/B) times the sum of per-example gradients in that micro-batch. Average over the k micro-batches: (1/k) times sum over j of (k/B) times sum over its examples, which is (1/B) times the sum over ALL examples - exactly the full-batch gradient. Not an approximation, an identity. THE CONDITIONS, and each failure is a real and silent bug. (1) EQUAL MICRO-BATCH SIZES. With unequal sizes the unweighted average over-weights examples in the smaller micro-batches. The last micro-batch of an epoch is the usual culprit. (2) THE LOSS MUST BE A PER-EXAMPLE MEAN. This is where it most often fails in practice. A CONTRASTIVE loss with in-batch negatives is not a sum over independent examples at all - each example's loss depends on the others through the denominator - so a micro-batch's loss is not a shard of the global loss, and accumulating gives you fewer negatives rather than a larger effective batch. That is a different objective, and the fixes are a memory bank, a momentum queue, or gathering embeddings across the batch before computing the loss. (3) NO BATCH-DEPENDENT LAYERS. BatchNorm computes statistics over the micro-batch, so accumulation produces k separate normalizations rather than one - a genuinely different function, and noisier when the micro-batch is small. LayerNorm has no such dependence. (4) NO PER-BATCH NORMALIZERS THAT VARY. If you divide by a real-token count that differs per micro-batch, averaging the normalized losses is not the globally normalized loss; accumulate the summed loss and the summed token count and divide once. WHAT THE EXCHANGE IS. You buy a large effective batch on hardware that cannot hold one, and you pay wall-clock: k forward-backward passes per optimizer step. Note it does not increase TOTAL compute - the same examples are processed - but per-step utilization can be slightly worse because the micro-batches are smaller, and there is scheduler and optimizer overhead per step amortized over more work. THE FOUR IMPLEMENTATION MISTAKES, all silent: forgetting the division, which multiplies the effective learning rate by k; calling zero_grad inside the loop, which defeats the mechanism; stepping the scheduler per micro-batch, so the schedule completes k times too early; and omitting no_sync under DDP, which performs k all-reduces per step for identical results.",
          "deepDive": {
            "q": "Derive the gradient noise scale and explain what it tells you about batch size.",
            "a": "THE SETUP. The true gradient is G, the gradient over the full data distribution. A minibatch of size B gives an estimate g_B whose expectation is G and whose covariance is Sigma/B, where Sigma is the per-example gradient covariance. So the estimate's squared norm has expectation |g_B|^2 = |G|^2 + tr(Sigma)/B - the true signal plus a noise term falling as 1/B. THE NOISE SCALE. Define B_noise = tr(Sigma) / |G|^2. This is the batch size at which the noise term equals the signal term. Below it, your gradient estimate is noise-dominated and more examples materially improve the direction; above it, the estimate is already close to G and more examples change the direction very little. WHAT IT PREDICTS. McCandlish et al. derive that the number of optimization steps S to reach a target scales as S/S_min = 1 + B_noise/B, where S_min is the minimum achievable steps. Read the consequences off it. At B much less than B_noise, S is proportional to 1/B, so DOUBLING THE BATCH HALVES THE STEPS - total examples processed is unchanged, and wall-clock halves if you have the parallelism. That is a free win and it is why data parallelism works at all. At B much greater than B_noise, S approaches S_min and stops falling, so doubling the batch DOUBLES TOTAL COMPUTE for almost no reduction in steps. The knee - the critical batch size - is around B_noise, and it is where you should stop scaling. HOW TO MEASURE IT, which is the practical payoff. You do not need the full covariance. Estimate |g_B|^2 at two different batch sizes; each satisfies |g_B|^2 = |G|^2 + tr(Sigma)/B, giving two equations in two unknowns. Solve for |G|^2 and tr(Sigma), take the ratio. In distributed training this is nearly free, because you already have per-rank gradients - the per-rank gradient is a small-batch estimate and the all-reduced one is a large-batch estimate, so you can compute the noise scale from quantities you already have. THE PROPERTY THAT MATTERS MOST OPERATIONALLY. B_noise GROWS DURING TRAINING. Early on, the gradient is large and consistent across examples, so the signal dominates and a small batch suffices. Late in training the gradient is small and examples disagree more, so the noise term is relatively larger and bigger batches pay off. This is the justification for BATCH SIZE RAMPS - starting small and increasing - which large-scale runs use and which looks arbitrary until you know this result. It also explains why a batch size that was clearly too large at the start can become appropriate later. THE CAVEATS I WOULD STATE. The derivation assumes SGD-like dynamics and a locally quadratic objective; with Adam the picture is muddier because the preconditioner changes the effective geometry. The estimator is noisy and needs averaging over steps. And S_min itself depends on the learning rate being tuned appropriately at each batch size, so a measured curve that flattens early may reflect an untuned learning rate rather than the noise floor - which is exactly the confound the linear scaling rule addresses. So I would treat B_noise as an order-of-magnitude guide that turns an unbounded sweep into a bounded one, rather than as a precise target."
          }
        },
        {
          "q": "Why would you want a large batch at all, and when does it stop helping?",
          "a": "THREE REASONS TO WANT ONE, and they are different in kind. (1) HARDWARE UTILIZATION. Small batches under-fill the device: matmul shapes are too small to keep the streaming multiprocessors busy, and kernel launch overhead is a larger fraction of step time. Throughput in examples per second rises with batch size until the device saturates. This is a systems argument and it saturates early. (2) LESS COMMUNICATION PER EXAMPLE. In data-parallel training, one all-reduce happens per optimizer step regardless of batch size, so a larger per-step batch means fewer optimizer steps for the same number of examples and therefore proportionally less communication. At scale this is often the dominant argument. (3) A BETTER GRADIENT ESTIMATE, which is the statistical argument and the interesting one. A minibatch gradient has variance proportional to 1/B, so more examples give a direction closer to the true gradient, allowing larger steps and fewer of them. WHEN IT STOPS HELPING - the critical batch size. The number of steps to a target scales as 1 + B_noise/B. Below B_noise, doubling the batch roughly halves the steps, so you process the same total examples in half the wall-clock: a genuine free win. Above B_noise, the steps barely fall while the compute per step doubles, so you are burning compute for nothing. The knee is estimable from the gradient noise scale, which makes this one of the few tuning questions in deep learning with a principled answer. THE HISTORY WORTH KNOWING, because it is often misremembered. Keskar et al. reported that large-batch training generalizes worse and attributed it to convergence toward sharp minima. Goyal et al. then trained ImageNet at batch 8192 with no accuracy loss using the LINEAR SCALING RULE - scale the learning rate with the batch - plus a WARMUP period, because the rule's linearization is invalid early when the weights move fast. That reframed much of the supposed generalization gap as a TUNING ARTEFACT: the large-batch runs had been under-tuned. Shallue et al. then measured the steps-versus-batch curve carefully across models and optimizers and found the hyperbolic shape with a model-dependent knee, which is the modern picture. So the honest summary is that large batches are fine if you re-tune, and they stop paying at a measurable point. THE PRACTICAL CONSEQUENCE FOR THIS LESSON. Accumulation lets you reach any effective batch size regardless of memory - so the constraint becomes statistical rather than physical, and the right question is not how large a batch can I fit but how large a batch is worth having. Those are different questions and the second one has an answer. AND THE DETAIL PEOPLE MISS: B_noise grows during training, which is why large runs ramp the batch size rather than fixing it. A batch that was wastefully large at step zero can be appropriate at step 100,000."
        },
        {
          "q": "Walk through the interaction between accumulation, DDP, and the learning-rate schedule.",
          "a": "THESE THREE INTERACT IN WAYS THAT ARE EACH INDIVIDUALLY SILENT, so I would take them one at a time and then state the combined loop. ACCUMULATION AND DDP. DDP registers autograd hooks that launch a gradient all-reduce as each bucket fills during the backward pass - that is what gives it communication-computation overlap. With accumulation, that means an all-reduce on EVERY micro-batch's backward, so k all-reduces per optimizer step instead of one. The results are identical, because averaging k times then stepping is the same as averaging once, but you have multiplied your communication by k. model.no_sync() is a context manager that suppresses the hooks, so you wrap every micro-step except the last. The gradients accumulate locally, and the final micro-step's backward triggers one all-reduce of the accumulated total. On a communication-bound job this is a large and easily-missed waste. ACCUMULATION AND THE SCHEDULER. The scheduler must step once per OPTIMIZER step. If it steps per micro-batch, the schedule advances k times too fast: a 2000-step warmup completes in 2000/k optimizer steps, so the learning rate reaches its peak long before the model is ready and the run looks unstable for reasons that appear to be about the model. The same error compresses the decay, so the learning rate is near zero while most of training remains. This is a configuration bug that presents as a modelling problem, which is why it is worth naming explicitly. DDP AND THE EFFECTIVE BATCH. DDP averages gradients across ranks, so the effective batch is micro_batch times ACCUM times world_size. Changing the number of GPUs changes the effective batch and therefore requires a learning-rate change under the linear scaling rule - so a run that worked on 8 GPUs and diverges on 32 is usually not a distributed bug, it is a four-times-larger batch at the same learning rate. This is one of the most common confusions when scaling out, and logging the effective batch size makes it visible immediately. THE COMBINED LOOP, with every placement derivable. Divide the loss by ACCUM. Wrap the non-final micro-steps in no_sync. Backward, which accumulates. On the accumulation boundary: unscale if using an fp16 scaler, clip once, step the optimizer, step the scheduler, zero the gradients. THE ONE MORE INTERACTION worth knowing: with an fp16 GradScaler, an overflow detected at the step boundary discards the WHOLE accumulated gradient, not just the offending micro-batch - so a single bad micro-batch costs you k micro-batches of work. That is an argument against very large k when using fp16, and a further argument for bf16, which has no scaler. WHAT I WOULD LOG to make all of this visible: effective batch size, learning rate read from the optimizer rather than from your schedule's intent, the number of optimizer steps as distinct from micro-steps, and the gradient norm. Those four make every failure above diagnosable at a glance.",
          "deepDive": {
            "q": "Someone reports that moving from 8 GPUs to 64 made training diverge. Diagnose it.",
            "a": "THE FIRST HYPOTHESIS, and it is right most of the time: THE EFFECTIVE BATCH SIZE WENT UP EIGHTFOLD and the learning rate did not. Effective batch is micro_batch times accumulation times world_size, so eight times the ranks is eight times the batch. Under the linear scaling rule the learning rate should rise by roughly the same factor to make equivalent progress per example - and if it did not, the run is now taking steps that are eight times too small relative to the gradient's precision, which usually shows as very slow progress rather than divergence. So if it DIVERGED rather than stalled, the more likely story is that someone DID scale the learning rate and did so without WARMUP. The linear scaling rule's linearization is invalid at the start of training when the weights are moving fast, which is exactly when a large learning rate does the most damage. Goyal et al.'s recipe is the rule PLUS a gradual warmup for precisely this reason, and omitting the warmup is the classic way a scaled-up run diverges in the first few hundred steps. Diagnostic: look at when it diverged. Within the first few hundred steps points at warmup; much later points elsewhere. HYPOTHESIS 2: THE SCHEDULE IS NOW WRONG IN LENGTH. If the schedule is specified in optimizer steps and the number of steps per epoch fell by eight, then warmup and decay both complete eight times sooner in terms of data seen. A schedule specified in TOKENS or examples rather than steps is robust to this; one specified in steps is not, and rescaling the number of GPUs silently rescales the schedule. HYPOTHESIS 3: BATCHNORM. If the model has BatchNorm, the per-device batch may have shrunk if the total batch was held fixed - and BatchNorm at small per-device batch has noisy statistics and can destabilize. SyncBatchNorm fixes it at a communication cost. HYPOTHESIS 4: A GENUINE DISTRIBUTED BUG rather than an optimization one. Did the model parameters get broadcast at startup, so all ranks began identical? If not, the ranks are averaging gradients of different models, which trains badly and can diverge. Are the data shards disjoint and equal in count? Uneven shards cause a hang rather than divergence, so that is probably not it here, but the identical-initialization check is worth confirming - all-reduce a parameter hash and assert agreement. HYPOTHESIS 5: THE fp16 SCALER at larger scale. More ranks means more gradients participating in each all-reduce, and an overflow anywhere discards the step. If the scale is collapsing, that is visible in the log. HOW I WOULD ORDER THE INVESTIGATION. Log the effective batch size and the actual learning rate from the optimizer for both runs and put them side by side - that single comparison resolves hypotheses 1 and 2 immediately and costs nothing. Then check whether warmup is present and long enough. Then verify identical initialization. Then look at the loss curve's shape: divergence within a few hundred steps is warmup or learning rate, divergence much later is more likely instability or data. THE PREVENTIVE MEASURE. Specify the schedule in TOKENS, log the effective batch, and re-tune the learning rate whenever the world size changes. Scaling out is not a transparent operation - it changes the optimization problem - and treating it as pure infrastructure is why this failure is so common."
          }
        },
        {
          "q": "How would you choose the accumulation count and micro-batch size?",
          "a": "TWO SEPARATE DECISIONS that people conflate, and separating them is most of the answer. THE MICRO-BATCH SIZE is a HARDWARE decision: the largest that fits comfortably, because larger micro-batches use the device better - bigger matmul shapes, less launch overhead per example, better memory-bandwidth utilization. THE ACCUMULATION COUNT is a STATISTICAL decision: whatever multiplies up to the effective batch size you want. So the procedure is to find the largest micro-batch that fits, then set k to reach the target effective batch, rather than choosing them together. HOW I WOULD FIND THE MICRO-BATCH SIZE. Sweep upward until it no longer fits, then back off for headroom - and note that the largest that fits is not always the fastest, because at very large micro-batch you may hit memory pressure that makes the allocator thrash. Measure throughput in examples per second at each size, not just whether it fits. There is usually a plateau: beyond some point the device is saturated and larger micro-batches buy nothing, and if you are already on that plateau there is no reason to push further. HOW I WOULD FIND THE TARGET EFFECTIVE BATCH. This is where the critical batch size comes in. Below B_noise, more examples per step means proportionally fewer steps, so scaling up is close to free in total compute and halves wall-clock. Above it, you are paying compute for nothing. Estimate B_noise from the gradient noise scale - and in distributed training that is nearly free, since per-rank gradients are small-batch estimates and the all-reduced gradient is a large-batch one. If measuring is impractical, use the literature for your model class as a starting point and sweep around it, remembering that the answer GROWS during training. THE INTERACTION WITH WALL-CLOCK, which decides in practice. Accumulation does not reduce total compute - the same examples are processed - so a larger k means the same work in more sequential steps per update. What it buys is a better gradient per update. If you are NOT communication-bound and NOT at the critical batch size, there may be no reason for a large k at all: just use the largest micro-batch that fits and step every time. Accumulation earns its place when the desired statistical batch exceeds what memory allows, and when communication cost per step is high enough that fewer, larger steps is a win. THE CONSTRAINTS THAT OVERRIDE ALL OF THIS. If the model has BatchNorm, small micro-batches are bad regardless of the arithmetic, and you need SyncBatchNorm or a different normalization. If the loss has in-batch interactions, accumulation does not give you the effective batch you think and the whole calculation is moot. And with an fp16 scaler, a large k means an overflow discards more work, which argues for smaller k or for bf16. WHAT I WOULD ACTUALLY REPORT. Micro-batch, accumulation, world size, and the resulting effective batch, logged every run. That last number is the one that determines the optimization problem, and it is the one that silently changes when someone adds GPUs."
        },
        {
          "q": "Explain the exchange this technique makes, in the module's terms.",
          "a": "WHAT IT SPENDS: sequential wall-clock time. You perform k forward-backward passes per optimizer step instead of one, so a step takes roughly k times as long. WHAT IT BUYS: an effective batch size decoupled from memory capacity. WHY THE RATE IS UNUSUALLY GOOD. Unlike checkpointing, accumulation does NOT increase total compute - the same examples are processed either way, and the FLOPs are identical. What you lose is only the mild inefficiency of running smaller micro-batches: slightly worse device utilization and the per-step overheads amortized over more work. So the exchange is nearly free in the resource that usually matters, which makes accumulation the first thing to try when memory is the constraint and a large batch is the goal. WHY THE RATE IS STILL CONFIGURATION-DEPENDENT, which is this module's recurring point. If you are already above the CRITICAL BATCH SIZE, the effective batch you are buying is worth nothing - more examples per step barely reduce the number of steps, so you have spent wall-clock for no statistical benefit. If your micro-batch is already saturating the device, the utilization loss is zero and the trade is nearly perfect. If you are communication-bound in distributed training, accumulation additionally REDUCES communication per example, since one all-reduce covers k micro-batches - so the exchange has a second payoff and the rate improves. And if your loss has in-batch interactions, you are not buying an effective batch at all and the exchange is a pure loss. Four situations, four different rates, and the only way to know which you are in is to measure the noise scale and profile the step. WHAT MAKES THIS LESSON UNUSUAL IN THE MODULE. Most of these techniques require you to measure the exchange rate empirically. Here you can CALCULATE it: the gradient noise scale predicts where more batch stops helping, and the linear scaling rule tells you how to adjust when you change it. That is a rare case of the systems literature giving you a formula rather than a heuristic, and it converts an unbounded hyperparameter sweep into a bounded one. THE COMPARISON WITH CHECKPOINTING that clarifies both. Both attack the activation memory term. Accumulation reduces peak memory LINEARLY at no compute cost; checkpointing reduces it to O(sqrt(L)) at about a third more compute. So accumulation should be tried first, and checkpointing becomes the answer when the micro-batch is already one and it still does not fit - or when you want a larger micro-batch than memory allows for utilization reasons. Knowing the ordering between two techniques that target the same resource is exactly the kind of thing this module is for."
        },
        {
          "q": "How does gradient accumulation interact with data ordering and reproducibility?",
          "a": "SEVERAL WAYS THAT ARE EASY TO MISS, and they matter most when comparing runs or resuming. THE COMPOSITION OF THE EFFECTIVE BATCH. Accumulating k micro-batches means the effective batch is k CONSECUTIVE micro-batches from the loader. If the loader is shuffled properly this is a random sample and equivalent to a large batch. If it is NOT - if the data is ordered by class, by length, by source, or by time - then each effective batch is a correlated block, which is a genuinely different training signal from a randomly sampled batch of the same size. This bites particularly with streaming datasets whose shuffle buffer is smaller than the effective batch, where consecutive micro-batches can come from the same shard. The check is to look at the label or source distribution within an effective batch, not within a micro-batch. LENGTH BUCKETING makes this worse in a way that is usually intentional and worth being aware of. Sorting by sequence length to reduce padding means consecutive micro-batches have similar lengths, so an effective batch is homogeneous in length - and if length correlates with anything else in your data, which it usually does, the batch is correlated in that too. The trade is real: bucketing saves substantial compute on padding and costs some batch diversity. THE LAST BATCH OF AN EPOCH. If the number of micro-batches is not divisible by k, the final optimizer step accumulates fewer than k micro-batches - so its effective batch is smaller and, if you divided by k unconditionally, its gradient is scaled down. Small effect, but it means the last step of every epoch is systematically different. Either drop the remainder or divide by the actual count accumulated. REPRODUCIBILITY AND RESUME. The state you must checkpoint now includes where you are WITHIN an accumulation cycle, not just which optimizer step you are on. Resuming mid-cycle without that either drops a partial gradient or double-counts micro-batches. Most implementations checkpoint only at optimizer-step boundaries, which sidesteps this - and is worth doing deliberately rather than by accident. DETERMINISM. Accumulation changes the ORDER of floating-point additions into .grad compared with a single large batch, so even in the exact-equivalence case the results differ in the last bits. That is expected and it means bitwise comparison between an accumulated run and a large-batch run is not the right test; comparing to a tolerance is. THE THING I WOULD CHECK when comparing an accumulated run against a large-batch baseline. Same effective batch, same effective data order, same learning rate, and gradients compared to floating-point tolerance rather than exactly. If the gradients match and the training curves diverge, the difference is in something batch-dependent - BatchNorm, a contrastive term, a per-batch normalizer - which is the diagnostic that localizes it immediately."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Why accumulation is EXACTLY equivalent",
        "back": "The loss is a per-example MEAN, so the mean of per-micro-batch means is the overall mean - an identity, not an approximation. Condition: EQUAL micro-batch sizes. The 1/k on the loss is why you divide by ACCUM."
      },
      {
        "type": "pitfall",
        "front": "The four silent accumulation mistakes",
        "back": "(1) no divide by k -> effective LR is k x larger; (2) zero_grad INSIDE the loop -> defeats it entirely; (3) scheduler per micro-batch -> the schedule completes k times too early; (4) no no_sync under DDP -> k all-reduces per step for identical results."
      },
      {
        "type": "pitfall",
        "front": "Contrastive losses break the equivalence",
        "back": "The denominator contains the OTHER examples, so with accumulation the negatives come only from the MICRO-batch. You get fewer negatives, not a bigger effective batch - a different objective. Fix: memory bank, momentum queue, or gather embeddings across ranks."
      },
      {
        "type": "pitfall",
        "front": "BatchNorm breaks it too",
        "back": "Statistics are computed over the MICRO-batch, so accumulating k micro-batches is k SEPARATE normalizations, not one over the full batch - a genuinely different function, and noisier at small micro-batch. LayerNorm is unaffected."
      },
      {
        "type": "formula",
        "front": "Gradient noise scale and the critical batch size",
        "back": "B_noise = tr(Sigma)/|G|^2, and steps S/S_min = 1 + B_noise/B. B << B_noise: doubling the batch HALVES the steps (free). B >> B_noise: steps barely fall, compute doubles for nothing. The knee is where you stop scaling."
      },
      {
        "type": "intuition",
        "front": "B_noise GROWS during training",
        "back": "Early on the gradient is large and consistent, so a small batch suffices; late on it is small and examples disagree more, so bigger batches pay. This is why large runs RAMP the batch size - a practice that looks arbitrary until you know the result."
      },
      {
        "type": "intuition",
        "front": "Estimate B_noise nearly free in DDP",
        "back": "|g_B|^2 = |G|^2 + tr(Sigma)/B, so two batch sizes give two equations. In distributed training you already have both: the PER-RANK gradient is a small-batch estimate and the ALL-REDUCED one is a large-batch estimate."
      },
      {
        "type": "definition",
        "front": "The linear scaling rule + warmup",
        "back": "B -> kB implies eta -> k*eta, with the LR ramped from 0 over the first epochs because the linearization fails early when weights move fast. Goyal et al. trained ImageNet at batch 8192 with no accuracy loss - reframing Keskar's 'sharp minima' gap as largely a TUNING artefact."
      },
      {
        "type": "pitfall",
        "front": "Adding GPUs changes the optimization problem",
        "back": "Effective batch = micro_batch x ACCUM x WORLD_SIZE. 8 -> 64 GPUs is an 8x batch increase, so it needs a LR change. A run that diverges after scaling out is usually the linear scaling rule applied WITHOUT warmup, not a distributed bug. Log the effective batch."
      },
      {
        "type": "intuition",
        "front": "Micro-batch and ACCUM are separate decisions",
        "back": "MICRO-BATCH is a HARDWARE decision - the largest that fits, since bigger shapes use the device better. ACCUM is a STATISTICAL decision - whatever multiplies up to the target effective batch. Choose them in that order, not together."
      },
      {
        "type": "intuition",
        "front": "Accumulation vs checkpointing on the same term",
        "back": "Both reduce peak activation memory. ACCUMULATION: linear reduction, NO extra compute. CHECKPOINTING: O(sqrt(L)) reduction, ~33% more compute. So try accumulation FIRST; checkpointing takes over once the micro-batch is already 1."
      },
      {
        "type": "pitfall",
        "front": "An effective batch is k CONSECUTIVE micro-batches",
        "back": "If the loader is not shuffled well - or the shuffle buffer is smaller than the effective batch, or you bucket by length - each effective batch is a CORRELATED block, not a random sample. Check the label/source distribution across the effective batch, not the micro-batch."
      }
    ],
    "refs": [
      {
        "title": "Goyal et al. (2017), Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour",
        "url": "https://arxiv.org/abs/1706.02677"
      },
      {
        "title": "McCandlish et al. (2018), An Empirical Model of Large-Batch Training",
        "url": "https://arxiv.org/abs/1812.06162"
      },
      {
        "title": "Keskar et al. (2017), On Large-Batch Training for Deep Learning: Generalization Gap and Sharp Minima",
        "url": "https://arxiv.org/abs/1609.04836"
      },
      {
        "title": "Shallue et al. (2019), Measuring the Effects of Data Parallelism on Neural Network Training",
        "url": "https://arxiv.org/abs/1811.03600"
      },
      {
        "title": "You et al. (2020), Large Batch Optimization for Deep Learning (LAMB)",
        "url": "https://arxiv.org/abs/1904.00962"
      }
    ],
    "demos": [
      "lr-schedule",
      "scaling-laws",
      "optimizers",
      "batching"
    ]
  },
  "data-loading-scale": {
    "level": "core",
    "body": {
      "intuition": [
        "At single-machine scale the data pipeline is a tuning question. At cluster scale it is a capacity-planning question, and the first thing to do is arithmetic: how many bytes per second must reach the accelerators to keep them busy? Multiply the samples per second the devices can consume by the bytes per sample, times the number of devices. For a vision job on decoded images that is often gigabytes per second; for language-model pretraining on pre-tokenized data it is far less. That single number tells you whether your storage can possibly work, and it is computable before you write any code.",
        "The design decision that follows dominates everything else: RANDOM ACCESS TO REMOTE STORAGE IS FATAL. A random read from object storage has latency in the tens of milliseconds, and a small file on a network filesystem is not much better, because the metadata operation costs as much as the data. If your Dataset performs one remote read per sample, no number of workers rescues you - you are bounded by latency times concurrency, not by bandwidth. The fix is to convert random access into SEQUENTIAL access by packing samples into shards of a few hundred megabytes and streaming them. That one change is routinely worth an order of magnitude and it is the difference between a pipeline that scales and one that does not.",
        "Sequential streaming then costs you the ability to shuffle by index, which you replace with two levels: permute the SHARD LIST each epoch, and maintain a SHUFFLE BUFFER within the stream. The buffer size is a quality knob and it is under-examined - if consecutive samples in a shard are correlated, which they usually are because shards are built from ordered sources, a small buffer gives you correlated batches and a training signal that is not what you think. The honest framing for the whole lesson is that this is an exchange like every other in the module: you are buying throughput with randomness, with preprocessing done ahead of time, and sometimes - in data echoing - with sample freshness. Each of those has a measurable cost and the rates depend on your data."
      ],
      "math": [
        {
          "h": "The throughput budget, computed before anything is built",
          "paras": [
            "The pipeline must deliver bytes at least as fast as the accelerators consume samples. Everything else - format, caching, worker count - is in service of this one inequality.",
            "Computing it first tells you immediately whether the storage tier you are planning to use is viable at all."
          ],
          "tex": "R_{\\text{required}} = \\underbrace{N_{\\text{dev}}}_{\\text{devices}} \\times \\underbrace{\\frac{B}{t_{\\text{step}}}}_{\\text{samples/s per device}} \\times \\underbrace{s_{\\text{bytes}}}_{\\text{bytes/sample}}",
          "texNote": "Worked example: 64 devices at 8 steps per second with batch 32 and 150 KB per decoded image is about 2.5 GB/s sustained. That is beyond a single network filesystem mount and comfortably within aggregate object-storage bandwidth IF the access pattern is sequential. Note what the formula makes obvious: storing pre-decoded images multiplies s_bytes by an order of magnitude versus storing JPEGs, trading network bandwidth for CPU decode - which is the first exchange in this lesson."
        },
        {
          "h": "Why random access loses, in one comparison",
          "paras": [
            "Remote storage has high latency and high bandwidth. A random-read pipeline is bounded by latency divided by concurrency; a sequential-read pipeline is bounded by bandwidth. Those are different regimes by orders of magnitude.",
            "The consequence is that the fix is structural - change the access pattern - rather than a matter of adding workers."
          ],
          "tex": "R_{\\text{random}} \\approx \\frac{c \\cdot s_{\\text{bytes}}}{\\ell}, \\qquad R_{\\text{seq}} \\approx \\beta_{\\text{net}} \\qquad (\\ell \\sim 10\\text{--}100\\,\\text{ms})",
          "texNote": "With c concurrent requests, latency l of 20 ms and 150 KB samples, you need hundreds of concurrent requests to reach even 1 GB/s - and each is a separate connection with its own overhead. Streaming a 500 MB shard reaches the same rate with one request. This is why every large-scale pipeline is shard-based, and why the number of FILES matters more than the number of bytes."
        },
        {
          "h": "Shuffle quality from a buffer",
          "paras": [
            "With a buffer of size M over a stream, two samples that were adjacent in the shard can only be separated by about M positions. So the buffer bounds how far correlation can be broken.",
            "The practical requirement is that the buffer must be large compared with the correlation length in the source ordering, not merely large compared with the batch."
          ],
          "tex": "\\Pr[\\text{two source-adjacent samples land in the same batch}] \\;\\approx\\; \\frac{B}{M} \\quad (M \\gg B)",
          "texNote": "So a buffer of 10,000 with batch 256 still puts source-adjacent samples in the same batch about 2.5% of the time - fine if the source order is arbitrary, and a real problem if shards are ordered by class, by document, or by time. The measurement that settles it is the label or source distribution WITHIN consecutive batches, which is one histogram and is almost never checked."
        }
      ],
      "code": [
        {
          "h": "Compute the budget, then shard correctly across ranks and workers",
          "paras": [
            "The budget is arithmetic you should do before choosing a format. The sharding is where correctness bugs live, and the rule is to assign shards rather than samples so sequential reading survives."
          ],
          "code": "def budget(n_dev, batch, step_s, bytes_per_sample):\n    r = n_dev * (batch / step_s) * bytes_per_sample\n    print(f\"{r/2**30:.2f} GiB/s sustained required\")\n#  64 devices, batch 32, 8 steps/s, 150 KB decoded images -> ~2.5 GiB/s.\n#  Beyond one NFS mount; fine for object storage IF reads are SEQUENTIAL.\n\nclass ShardStream(IterableDataset):\n    def __init__(self, shards, seed=0):\n        self.shards, self.seed = shards, seed\n        self.epoch = 0\n\n    def __iter__(self):\n        info = get_worker_info()\n        w, W = (info.id, info.num_workers) if info else (0, 1)\n        r, R = dist.get_rank(), dist.get_world_size()\n        k, K = r * W + w, R * W                 # this reader's index of K total\n\n        # SHUFFLE THE SHARD LIST, seeded on (base, epoch) so every reader\n        # agrees and it is reproducible:\n        g = random.Random((self.seed, self.epoch))\n        shards = self.shards[:]; g.shuffle(shards)\n\n        # ASSIGN SHARDS, NOT SAMPLES. Each shard is read by exactly ONE reader,\n        # so the sequential access pattern - the whole point - survives.\n        # Sharding by sample would make every reader touch every shard.\n        for s in shards[k::K]:\n            yield from read_sequentially(s)\n\n# UNEVEN SHARDS HANG A DDP JOB: every rank must join every all-reduce, so a\n# rank that runs out early blocks the others forever.\n#   TRAINING   -> PAD by repeating shards so all readers get the same count\n#   EVALUATION -> DROP the remainder; duplicates would corrupt the metric\n# Assert it at startup: all-reduce the local shard count with MIN and MAX and\n# require them equal. One line, prevents the most common distributed hang.",
          "caption": "Assign shards, not samples - sharding by sample makes every reader touch every shard and destroys the sequential access the format was chosen for. And assert equal shard counts at startup, because unequal counts hang rather than error."
        },
        {
          "h": "Two-level shuffling, and the exchange you can make when still input-bound",
          "paras": [
            "Streaming costs you index-based shuffling. The replacement has a quality knob that needs measuring rather than assuming, and if the pipeline still cannot keep up there is one more exchange available."
          ],
          "code": "def shuffle_buffer(stream, M=10_000, rng=random):\n    buf = []\n    for item in stream:\n        buf.append(item)\n        if len(buf) >= M:\n            i = rng.randrange(len(buf))\n            buf[i], buf[-1] = buf[-1], buf[i]\n            yield buf.pop()\n    rng.shuffle(buf); yield from buf\n\n# THE DIAGNOSTIC nobody runs: is the shuffle actually working?\nfor batch in islice(loader, 20):\n    print(Counter(batch.labels).most_common(3))\n#   If a batch is mostly one class, the buffer is too small RELATIVE TO THE\n#   CORRELATION LENGTH in the source order. Shards built from ordered sources -\n#   by class, by document, by date - need a buffer spanning several shards'\n#   worth of samples, not merely several batches' worth.\n\n# THE CACHE TIERS, in the order they pay off:\n#   object store  -> epoch 1 only, if the local cache holds the dataset\n#   local NVMe    -> epoch 2+; often the single biggest win available\n#   page cache    -> free, and why a second epoch is faster than the first\n#   GPU decode    -> when CPU decode is the bottleneck (nvJPEG / DALI)\n\n# PREPROCESSING PLACEMENT is an exchange between storage and CPU:\n#   OFFLINE  (tokenize once, store token ids)   -> more storage, no per-epoch\n#                                                  CPU. Right for LLM text.\n#   ONLINE   (decode + augment every epoch)     -> less storage, CPU every\n#                                                  epoch. Required when the\n#                                                  augmentation must be random.\n\n# STILL INPUT-BOUND? DATA ECHOING: reuse each loaded batch e times before\n# fetching the next. You trade sample FRESHNESS for utilization - and if the\n# GPU was idle, repeated data beats no data. Measure in epochs-to-target, not\n# steps: echoing needs more steps and can still finish sooner in wall-clock.",
          "caption": "The shuffle diagnostic is a single Counter over consecutive batches and it is almost never run - a buffer sized against the batch rather than against the source's correlation length produces correlated batches silently."
        }
      ],
      "useCases": [
        "Large-scale pretraining, where the corpus lives in object storage and the pipeline must sustain gigabytes per second across many nodes - the setting where shard-based streaming is not an optimization but the only design that works.",
        "Multi-node vision training, where JPEG decoding is frequently the true bottleneck and the decision is between pre-decoding to storage, decoding on the GPU, or accepting a lower device utilization.",
        "Any job where nvidia-smi shows sustained low utilization, which is more common than teams expect and where the input pipeline is the most frequently overlooked cause and the cheapest to fix once identified.",
        "Single-pass training over a corpus larger than one epoch, where checkpointing the data position per reader is a correctness requirement rather than a convenience - without it, a resume silently re-trains on data already seen."
      ],
      "pitfalls": [
        "One remote read per sample. Object-storage latency is tens of milliseconds, so a random-access pipeline is bounded by latency and concurrency rather than bandwidth, and no number of workers fixes it. Pack into sequential shards of a few hundred megabytes.",
        "Sharding by sample rather than by shard. Every reader then touches every shard, destroying the sequential access pattern the format exists to provide - which converts a bandwidth-bound pipeline back into a latency-bound one.",
        "Unequal shard counts across readers. A rank that runs out early stops joining the gradient all-reduce and the job HANGS rather than erroring. Pad by repeating for training, drop the remainder for evaluation, and assert equality at startup.",
        "Sizing the shuffle buffer against the batch rather than against the correlation length in the source order. Shards built from ordered data need a buffer spanning several shards' worth of samples, or consecutive batches are correlated and the training signal is not what you think.",
        "Never measuring the shuffle. One Counter over the labels of twenty consecutive batches settles it, and it is almost never run - so correlated batches go undetected and present as a mysterious quality difference.",
        "Ignoring the file count. Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones even at identical total bytes - and the small-file case can be slower by an order of magnitude.",
        "Not checkpointing the data position. Resuming restarts the epoch, so the model re-trains on data already seen and never reaches the tail - which is a minor distortion for epoch-based training and a serious correctness problem for single-pass training on a very large corpus."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/data-pipelines",
          "text": "The single-machine mechanics this builds on - worker processes, collation, pinning, and the sharding of an IterableDataset. That lesson is about the DataLoader's internals; this one is about the storage and network above it."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How you establish that you are input-bound in the first place, which is the precondition for any of this. The GPU-idle question is answered in seconds and it determines whether this lesson is relevant to your job at all."
        },
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Why unequal shards hang rather than error: every rank must participate in every collective, so a rank that finishes early blocks the rest until the timeout. The data-side fix is padding or dropping; the symptom is on the collective."
        },
        {
          "ref": "llm-systems/llm-data-pipelines",
          "text": "The content side of the same problem - quality filtering, deduplication with MinHash and LSH, sequence packing and mixture weighting. This lesson delivers bytes; that one decides which bytes are worth delivering."
        },
        {
          "ref": "training-systems/optimized-pipeline",
          "text": "Where the input pipeline is placed against the other techniques, since a job that is input-bound gains nothing from mixed precision, compilation or checkpointing - and knowing that ordering is the point of the capstone."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the first calculation for a large-scale data pipeline?",
          "a": "The required throughput: devices times samples per second per device times bytes per sample. It tells you immediately whether the storage tier is viable."
        },
        {
          "q": "Why is random access to remote storage fatal?",
          "a": "Latency is tens of milliseconds per read, so throughput is bounded by latency divided by concurrency rather than by bandwidth. No number of workers fixes it."
        },
        {
          "q": "What is the standard fix?",
          "a": "Pack samples into sequential shards of a few hundred megabytes and stream them, converting random access into sequential access. Routinely worth an order of magnitude."
        },
        {
          "q": "Why assign shards rather than samples to readers?",
          "a": "So each shard is read by exactly one reader and the sequential access pattern survives. Sharding by sample makes every reader touch every shard."
        },
        {
          "q": "What happens if readers get unequal shard counts?",
          "a": "A rank runs out early and stops joining the gradient all-reduce, so the job hangs rather than erroring. Pad for training, drop for evaluation."
        },
        {
          "q": "How do you shuffle a stream?",
          "a": "Two levels: permute the shard list each epoch, and maintain a shuffle buffer within the stream. The buffer size is the quality knob."
        },
        {
          "q": "How large should the shuffle buffer be?",
          "a": "Large relative to the correlation length in the source ordering, not merely relative to the batch. Shards built from ordered sources need several shards' worth."
        },
        {
          "q": "How do you check the shuffle is working?",
          "a": "Print the label or source distribution within twenty consecutive batches. If a batch is dominated by one class, the buffer is too small."
        },
        {
          "q": "Why does the number of files matter, not just the bytes?",
          "a": "Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones at the same total size."
        },
        {
          "q": "What is data echoing?",
          "a": "Reusing each loaded batch several times before fetching the next, trading sample freshness for device utilization when the pipeline cannot keep up."
        },
        {
          "q": "When should preprocessing be offline versus online?",
          "a": "Offline when it is deterministic - tokenization - trading storage for CPU. Online when it must be random per epoch, as with most augmentation."
        },
        {
          "q": "Why checkpoint the data position?",
          "a": "Without it a resume restarts the epoch, so the model re-trains on seen data and never reaches the tail - a serious problem for single-pass training on a large corpus."
        }
      ],
      "standard": [
        {
          "q": "How would you build the shards in the first place, and what decisions does that involve?",
          "a": "SHARD CONSTRUCTION IS AN OFFLINE JOB that determines most of your runtime pipeline's behaviour, and it is worth treating as a designed artefact rather than a conversion script. DECISION 1: SHARD SIZE. Too small and you are back toward the small-file problem, paying metadata and connection overhead per shard. Too large and you lose granularity - a reader that must finish a shard before rebalancing, a longer replay on resume, and coarser sharding across readers. A few hundred megabytes to a gigabyte is the usual range, and the binding constraint is usually that the number of shards must be comfortably larger than ranks times workers so the assignment divides reasonably. I would target at least a few shards per reader. DECISION 2: SHUFFLE AT BUILD TIME. This is the single highest-value decision and it is often skipped. If each shard is a RANDOM SAMPLE of the corpus rather than a contiguous slice of the source, then streaming order barely matters, the runtime shuffle buffer only has to break local structure, and every downstream shuffling problem shrinks. It costs one full pass at build time. Skipping it means every training run pays for it forever in buffer size and batch correlation. DECISION 3: WHAT TO STORE - the preprocessing split. Everything deterministic goes in: tokenization for text, resizing to the training resolution for images, any fixed normalization. Everything that must be random per epoch stays out. The rule is to split the transform chain at the first random operation and precompute the prefix. Pre-resizing in particular is frequently the largest single win and is skipped because the original data is what arrived. DECISION 4: THE MANIFEST. Record, per shard, the number of samples, the byte size, a checksum, and enough metadata to filter - source, language, date, label distribution. This is what lets you construct a weighted mixture without opening shards, verify integrity, and compute the exact epoch length in advance. A pipeline without a manifest cannot answer basic questions cheaply. DECISION 5: DEDUPLICATION, which belongs at build time because it is a global operation. Exact duplicates by content hash are cheap. Near-duplicates need MinHash with LSH banding to avoid the quadratic comparison, and a Bloom filter is the practical structure for membership at corpus scale. Doing this once offline is far better than any runtime filtering. DECISION 6: HOW SHARDS ARE GROUPED. If shards are homogeneous by source - all one language, all one class - then a reader assigned to a subset sees a biased sample for a whole shard's duration, which no runtime buffer fully fixes. Interleaving sources within each shard at build time solves it properly, and it is a build-time decision that cannot be recovered later. THE VALIDATION I WOULD RUN before trusting a new shard set. Read every shard, count the samples, and compare against the manifest. Sample from several shards and check the label distribution matches the corpus. And verify the total sample count matches the source, because a silent drop during a long build job is common and is invisible afterwards."
        },
        {
          "q": "Design a data pipeline for training on a corpus that does not fit on local disk.",
          "a": "START WITH THE ARITHMETIC, because it determines whether the design is possible before any of it is built. Required throughput is devices times samples-per-second-per-device times bytes-per-sample. Sixty-four devices at eight steps per second with batch 32 and 150 KB decoded images is about 2.5 GB/s sustained - beyond a single network filesystem mount, comfortably within aggregate object-storage bandwidth IF the access pattern is right. That last clause is the whole design. THE CONSTRAINT THAT DRIVES EVERYTHING: RANDOM ACCESS IS FATAL. A random read from object storage has latency in the tens of milliseconds, and a small file on a network filesystem is barely better because the metadata operation costs as much as the payload. A pipeline doing one remote read per sample is bounded by latency divided by concurrency, so you would need hundreds of concurrent requests to reach even a fraction of the needed rate, each with its own connection overhead. Adding workers does not fix a latency bound. THE DESIGN: SHARDED SEQUENTIAL STREAMING. Pack samples into shards of a few hundred megabytes - tar files in the WebDataset style, or a columnar format such as parquet. Each reader streams whole shards sequentially, which is what object storage is fast at, and one request now covers thousands of samples. This single change is routinely worth an order of magnitude and it is the difference between a pipeline that scales and one that does not. SHARDING ACROSS READERS, where the correctness bugs are. With R ranks and W workers each you have R times W independent readers. Assign SHARDS to readers, not samples: reader k takes shards k, k+RW, k+2RW and so on. Assigning by sample would make every reader touch every shard, destroying the sequential pattern you designed for. And the shard counts must be EQUAL, because a rank that runs out early stops joining the gradient all-reduce and the job hangs rather than errors - pad by repeating for training, drop the remainder for evaluation where duplicates would corrupt the metric, and assert equality at startup with a min and max all-reduce. SHUFFLING WITHOUT INDICES, at two levels. Permute the shard list each epoch, seeded on the base seed plus the epoch so every reader agrees and it is reproducible. Then a shuffle buffer within the stream: hold M samples, emit a random one, refill. The buffer size is the quality knob and it must be sized against the CORRELATION LENGTH of the source ordering rather than against the batch - shards built from ordered data need a buffer spanning several shards' worth. CACHING TIERS, which is often the single biggest win after the format. Cache decoded shards on local NVMe if there is room, so epoch one pays the network and epoch two onward is local. The page cache does some of this for free, which is why a second epoch is faster. IF STILL INPUT-BOUND. Move decoding to the GPU with nvJPEG or DALI when CPU decode is the bottleneck; pre-decode to a raw format, trading storage bandwidth for CPU; or use data echoing, reusing each batch several times, which trades sample freshness for utilization and is worth it when the alternative is an idle accelerator. WHAT I WOULD MEASURE. Loader-only throughput with the model removed, device utilization, and the shuffle diagnostic - a label histogram over consecutive batches, which nobody runs and which catches a correlated-batch problem no throughput number reveals.",
          "deepDive": {
            "q": "How do you guarantee that a streaming distributed pipeline reads the dataset exactly once, reproducibly, and can resume?",
            "a": "EXACTLY ONCE. With R ranks and W workers each, there are R*W readers, and the requirement is that the union of what they read is the dataset exactly once with no overlap. Assign shards by index modulo R*W, which is disjoint and covering by construction, and crucially keeps each shard read by exactly one reader so sequential access survives. Then the only remaining question is divisibility. THE UNEVEN-DIVISION PROBLEM, which is the one that bites. If the shard count is not divisible by R*W, readers get different counts. In DDP that means some ranks run out first, and since every rank must participate in every all-reduce, the fast ranks block forever - the job HANGS rather than erroring, which is the worst failure mode because there is nothing to read. Three options: drop the remainder shards so division is exact, which loses a little data; pad by repeating shards so all readers get the same count, which slightly over-samples some; or use a join context so ranks that finish early participate in dummy collectives. I would pad for training and drop for evaluation, where duplicates would corrupt the metric. And I would assert it at startup: all-reduce the local shard count with MIN and with MAX and require them equal. One line, and it converts the most common distributed hang into an immediate error. EVALUATION IS THE SUBTLE CASE and it is frequently got wrong. You must not duplicate samples or the metric is inflated, and you must not drop them or it is computed on a subset. The standard treatment is to pad the last batch and carry a mask, then all-gather both predictions and the mask so duplicates can be removed before reducing. Many pipelines report a slightly incorrect validation number for exactly this reason and nobody notices, because a slightly wrong number looks like a right one. REPRODUCIBILITY. Seed the shard permutation from (base_seed, epoch) so every reader computes the SAME permutation - they must agree, or the disjointness argument breaks. Seed per-reader randomness, including the shuffle buffer and any augmentation, from (base_seed, epoch, rank, worker_id) so readers differ from each other but reproduce across runs. And note that torch seeds workers automatically but a dataset using Python's random or numpy's global state inherits the parent's under fork, so every worker produces identical randomness unless you seed explicitly in a worker_init_fn - which silently divides augmentation diversity by the worker count. CHECKPOINT-RESUME, which is the hardest part and is usually ignored. To resume mid-epoch you must record, per reader, which shard it was on and the offset within it. Without that, a resume restarts the epoch: the model re-trains on data it has already seen and never reaches the tail. For epoch-based training on a modest dataset that is a minor distortion. For SINGLE-PASS training on a corpus larger than one epoch - which is how large language models are trained - it is a serious correctness problem, and a job that has been resumed five times may never have seen the last portion of its data. The practical simplification is to checkpoint only at shard boundaries, which makes the state small and the logic simple at the cost of replaying at most one shard. THE TEST I WOULD WRITE, because none of this is verifiable by inspection. Run the pipeline with tiny synthetic shards containing unique integer ids, collect everything every reader yields, and assert the multiset equals the expected one exactly. An hour to write, and it is the only thing that catches a duplication or drop bug - because in production the symptom is a model that is slightly worse than expected and nobody attributes that to the loader."
          }
        },
        {
          "q": "How would you decide between storing decoded data and decoding at load time?",
          "a": "IT IS AN EXCHANGE BETWEEN STORAGE BANDWIDTH AND CPU, and the right answer depends on which one you have. THE TWO OPTIONS. Store COMPRESSED - JPEGs, encoded audio, raw text - and decode per epoch. Storage is small and cheap to move; CPU pays every epoch. Or store DECODED - raw tensors, pre-tokenized ids - and read directly. CPU is free at load time; storage grows by roughly an order of magnitude for images and the network must carry it. THE ARITHMETIC THAT DECIDES IT. Compute both required rates. A 150 KB decoded image versus a 15 KB JPEG is a tenfold difference in required network throughput. If the decoded rate exceeds what your storage can sustain, the decision is made for you. If the compressed rate is within budget, the question becomes whether you have CPU to spare - which is measurable by watching whether the workers saturate their cores. WHERE THE ANSWERS DIFFER BY DOMAIN. LANGUAGE MODELS: tokenize offline, always. Tokenization is deterministic, so there is nothing gained by redoing it, token ids are compact, and it removes a substantial CPU cost from every epoch. This is universal practice and it is not really a trade-off. VISION: usually keep JPEGs and decode online, because decoded images are large and because augmentation has to happen per epoch anyway, so the CPU is already engaged. The exception is when decode is measurably the bottleneck, at which point the options are GPU decoding - nvJPEG or DALI, which moves the work to hardware that is otherwise waiting - or pre-decoding to a raw format if storage permits. AUDIO: usually decode online, since compressed audio is small and decoding is comparatively cheap. THE THIRD OPTION people forget: PARTIAL PRECOMPUTATION. Store at the resolution you actually train at rather than the original. Pre-resizing to 256 pixels rather than storing 4K originals cuts both storage and decode cost enormously, and the only thing lost is the ability to train at a higher resolution later without reprocessing. In practice this is often the single largest win available and it is skipped because the original data is what arrived. THE CONSTRAINT THAT OVERRIDES THE ARITHMETIC. Anything that must be RANDOM per epoch cannot be precomputed - random crops, random augmentation, random masking. You can precompute the deterministic prefix of the pipeline and leave the random suffix online, which is the general answer: split the transform chain at the first random operation, precompute everything before it. HOW I WOULD DECIDE IN PRACTICE. Measure the loader-only throughput and profile inside __getitem__ to see where the time actually goes - the distribution is usually surprising, and decode is often a larger share than expected. Then compute both throughput budgets. Then pick the option whose bottleneck you have headroom in. And re-measure afterwards, because moving the bottleneck from CPU to network means the next constraint is a different one - which is this module's recurring point."
        },
        {
          "q": "Your GPUs are at 40% utilization on a 64-node job. Walk through the investigation.",
          "a": "LOW UTILIZATION MEANS THE DEVICES ARE WAITING, and there are four things they can be waiting for. I would distinguish them before optimizing anything. STEP 1: IS IT INPUT OR COMMUNICATION? Run the training loop with SYNTHETIC data - a fixed tensor in a loop, no loader at all. If utilization jumps, you are input-bound. If it stays at 40%, the problem is communication, synchronization, or the model itself, and the data pipeline is innocent. This experiment takes ten minutes and it splits the investigation in half, which is why it goes first. STEP 2, IF INPUT-BOUND: WHERE IN THE PIPELINE? Time the loader alone with the model removed, per rank. Then look at whether the bottleneck is storage, network, or CPU. Storage and network show as low CPU utilization in the workers with the loader still slow. CPU shows as workers pegged at 100%. The distinction determines everything downstream. STEP 3: THE COMMON CAUSES AT SCALE, in order. (a) RANDOM ACCESS - one remote read per sample. Latency-bound, unfixable by adding workers, and the fix is repacking into sequential shards. This is the big one and the symptom is that throughput does not improve with more workers. (b) TOO MANY SMALL FILES - metadata operations dominating, which is the same problem wearing different clothes. (c) DECODE-BOUND - workers at 100% CPU. Fix by moving decode to the GPU, pre-decoding, or storing at the training resolution. (d) INSUFFICIENT WORKERS OR PREFETCH - the cheapest to test and worth ruling out early, remembering the count is an inverted V rather than monotone. (e) SHARED FILESYSTEM CONTENTION - 64 nodes hitting one mount is a different workload from one node, and per-node caching is the fix. STEP 4: THE STRAGGLER CHECK, which is specific to distributed training and often missed. Utilization is an average. If one rank is slow, every rank waits at the all-reduce, so all of them show low utilization while only one has a problem. Log per-rank step times and look at the distribution rather than the mean. A single slow node - a bad disk, a thermal issue, a noisy neighbour - presents exactly as a global slowdown, and no amount of pipeline optimization fixes it. STEP 5: IF NOT INPUT-BOUND. Profile and look at the timeline. Communication not overlapping with computation, a per-step synchronization from logging, or a small model that simply cannot fill the device are the candidates - and they are diagnosed by the timeline's shape rather than by aggregates. WHAT I WOULD FIX FIRST given the finding. Format before workers, caching before format changes if a local cache is available, and the straggler before anything if the per-rank distribution is skewed. THE MEASUREMENT I WOULD ADD PERMANENTLY. Per-rank data time and compute time, logged separately, so the next occurrence is diagnosed from a dashboard rather than from an investigation. That is cheap and it turns a recurring multi-day question into a glance.",
          "deepDive": {
            "q": "Explain data echoing - what it trades, and how you would evaluate whether it helped.",
            "a": "WHAT IT IS. When the input pipeline cannot keep up, reuse each loaded batch e times before fetching the next - either by repeating the whole batch, or by re-shuffling and re-augmenting the buffered examples between uses. The accelerator is then fed from memory rather than waiting on storage. Choi et al. formalized and measured this. WHAT IT TRADES. Sample FRESHNESS for device UTILIZATION. Each optimizer step now uses data that is partly repeated, so a step carries less new information than a step on fresh data. In exchange, you take steps at the rate the device can sustain rather than the rate the pipeline can supply. THE ARGUMENT FOR IT is blunt and correct: if the GPU would otherwise be IDLE, repeated data beats no data. A step on echoed data is worth less than a step on fresh data, and it is worth more than zero. WHERE ON THE PIPELINE YOU ECHO MATTERS, which is the part people miss. You can echo after reading but before augmentation, in which case each repeat gets different random augmentation and is meaningfully different - this is the good case, and for vision it recovers most of the value of fresh data. Or you can echo after the full transform, in which case the repeats are identical and the marginal value is lower. Echoing as EARLY as possible in the pipeline, subject to the bottleneck being upstream of that point, is the rule. HOW I WOULD EVALUATE IT, and the measurement design is the substance of the answer. The wrong metric is STEPS to a target loss - echoing needs more steps by construction, so it always looks worse. The wrong metric is also steps per second, which always looks better. The right metric is WALL-CLOCK TIME to a target loss, or equivalently to a target validation metric. That is the only comparison that reflects the actual trade. I would run three configurations - no echoing, echo 2, echo 4 - to the same target metric and compare elapsed time, with the learning rate re-tuned per configuration since the effective data distribution has changed. WHAT I WOULD EXPECT. A benefit that grows with how input-bound you are and shrinks as e increases, since the marginal value of each repeat falls. Choi et al. found meaningful wall-clock improvements when the pipeline was the bottleneck and, importantly, that the benefit depends on where in the pipeline the echoing happens. THE RISKS TO WATCH. Repeated data increases the effective number of passes over each example, so OVERFITTING arrives sooner in terms of unique data seen - which matters for small datasets and barely at all for a corpus you will not finish one pass of. And the gradient becomes more correlated between consecutive steps, which interacts with momentum in ways that may need the learning rate adjusting. WHEN I WOULD USE IT AT ALL. Only after the structural fixes - sharding, caching, format, GPU decode - have been applied and the pipeline still cannot keep up. Echoing is the last resort in that list because it is the only one that degrades the training signal rather than merely moving work around. But it is a legitimate and under-used tool when the alternative is an accelerator sitting idle, and framing it as an explicit exchange rather than a hack is what makes it defensible."
          }
        },
        {
          "q": "How would you verify that shuffling is adequate?",
          "a": "THIS IS THE MEASUREMENT NOBODY RUNS, and it is one histogram. THE DIRECT CHECK. Take twenty consecutive batches from the loader and print the distribution of labels, or of source shard, or of any categorical attribute you have. If batches are dominated by one value, the shuffle is not breaking the source ordering. That is it - it takes five minutes and it settles the question definitively. WHY IT MATTERS. A correlated batch is a biased gradient estimate. If a batch is mostly one class, the update pushes toward that class and the next batch pushes back, so the trajectory oscillates and the effective learning rate is behaving differently from what you set. With batch normalization it is worse: the statistics are computed over a batch that is not representative of the data distribution, so the normalization itself is wrong. And none of this produces an error - it produces slightly worse convergence that gets attributed to hyperparameters. WHY IT HAPPENS AT SCALE SPECIFICALLY. Shards are built from ordered sources: a crawl in date order, a dataset grouped by class, documents from one site. Streaming reads them sequentially, so consecutive samples are correlated. The shuffle buffer is the only thing breaking that, and its size is usually chosen against the batch size rather than against the CORRELATION LENGTH in the source - which is the wrong comparison and is why the default is often too small. THE ARITHMETIC. With a buffer of M and batch B, two source-adjacent samples land in the same batch with probability roughly B/M. At M = 10,000 and B = 256 that is about 2.5% - fine if the source order is arbitrary, and a real problem if a shard is entirely one class, because then it is not two adjacent samples but the whole shard that needs breaking up. THE MORE ROBUST FIXES, in order. (1) SHUFFLE THE DATA ONCE WHEN BUILDING THE SHARDS. If each shard is already a random sample of the corpus, the streaming order barely matters and the buffer only needs to break local structure. This is by far the best fix, it is a one-time offline cost, and it is the reason well-built datasets do not need heroic buffers. (2) INTERLEAVE MULTIPLE SHARDS per reader, drawing round-robin from several open shards, so the buffer sees a mixture rather than a single source. (3) SIZE THE BUFFER against the correlation length, which means measuring it rather than guessing. (4) Permute the shard LIST each epoch, which is necessary but not sufficient - it changes which shards are adjacent, not what is inside them. WHAT I WOULD CHECK BEYOND LABELS. The distribution of sequence length within a batch, if you bucket by length, since that is deliberately correlated and you should know how much. And the source or domain mixture if you are training on a weighted mixture of corpora - a batch drawn entirely from one source is a different training signal from a proportionally mixed one, and the mixture weights you carefully chose only apply in expectation over batches, not within them."
        },
        {
          "q": "What is the exchange this lesson makes, and how does it fit the module?",
          "a": "SEVERAL EXCHANGES, and naming them individually is more useful than a single summary. EXCHANGE 1: RANDOMNESS FOR THROUGHPUT. Sequential shard streaming is orders of magnitude faster than random access, and it costs you the ability to shuffle by index. You buy that back approximately with a shuffle buffer, and the approximation is the cost - measurable as the correlation within consecutive batches, and almost never measured. EXCHANGE 2: STORAGE FOR CPU. Precomputing a transform - tokenizing, pre-decoding, pre-resizing - means storing more bytes and moving them over the network, in return for not spending CPU every epoch. The rate depends entirely on which of storage bandwidth and CPU you have spare, which is why the answer differs between language models (tokenize offline, always) and vision (usually decode online). EXCHANGE 3: FRESHNESS FOR UTILIZATION. Data echoing reuses batches, so each step carries less new information and you take more steps per second. Worth it precisely when the alternative is an idle accelerator, and the evaluation must be in wall-clock to a target rather than in steps. EXCHANGE 4: LOCAL DISK FOR NETWORK. Caching shards locally makes epoch one expensive and every subsequent epoch cheap. Free if you have the disk, useless for single-pass training where there is no second epoch - which is a good example of the rate depending on your regime rather than the technique. HOW IT FITS THE MODULE. This lesson is unusual in one respect: it is the only one where the resource being bought is not on the accelerator. Everything else in the module trades compute, memory and communication ON the device; this trades storage, network and host CPU. And that matters because those resources are frequently the binding ones and are the least likely to be measured - a job can be 60% input-bound while the whole team optimizes the model. THE ORDERING CLAIM I WOULD MAKE, which is the capstone's argument in miniature. If you are input-bound, every other technique in this module is worthless to you. Mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more on it, and the accelerator is idle. So the profiling question - is the GPU even busy - is not merely the first step of a performance investigation; it determines whether the rest of the module applies at all. That is why this lesson sits before the capstone and why the capstone's first move is to establish which resource binds."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The throughput budget",
        "back": "R = devices x (batch / step_time) x bytes_per_sample. 64 devices, batch 32, 8 steps/s, 150 KB images = ~2.5 GiB/s sustained. Compute this BEFORE choosing a format - it tells you whether the storage tier is viable at all."
      },
      {
        "type": "intuition",
        "front": "Random access to remote storage is FATAL",
        "back": "Latency is tens of ms per read, so throughput is bounded by latency/concurrency, NOT bandwidth - no number of workers fixes it. Streaming one 500 MB shard reaches the same rate as hundreds of concurrent random reads. This is why every large pipeline is shard-based."
      },
      {
        "type": "pitfall",
        "front": "Assign SHARDS to readers, not samples",
        "back": "Sharding by sample makes every reader touch every shard, destroying the sequential access the format exists to provide. Reader k takes shards k, k+RW, k+2RW... where RW = ranks x workers."
      },
      {
        "type": "pitfall",
        "front": "Unequal shard counts HANG a DDP job",
        "back": "A rank that runs out stops joining the all-reduce and the others block forever. PAD by repeating (training) or DROP the remainder (evaluation, where duplicates corrupt the metric). Assert it: all-reduce the count with MIN and MAX and require equality."
      },
      {
        "type": "formula",
        "front": "Shuffle-buffer quality",
        "back": "P(two source-adjacent samples in the same batch) ~ B/M. At M=10k, B=256 that is ~2.5%. Size M against the CORRELATION LENGTH of the source ordering, not against the batch - shards built from ordered data need several shards' worth."
      },
      {
        "type": "intuition",
        "front": "The shuffle diagnostic nobody runs",
        "back": "Print Counter(labels) over 20 consecutive batches. If a batch is dominated by one class, the buffer is too small. Correlated batches are a BIASED gradient estimate - and with BatchNorm the statistics are wrong too. No error, just worse convergence blamed on hyperparameters."
      },
      {
        "type": "intuition",
        "front": "The best shuffle fix is offline",
        "back": "SHUFFLE ONCE WHEN BUILDING THE SHARDS. If each shard is already a random sample of the corpus, streaming order barely matters and the buffer only breaks local structure. One-time cost, and it is why well-built datasets need no heroic buffers."
      },
      {
        "type": "pitfall",
        "front": "File COUNT matters, not just bytes",
        "back": "Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones at identical total size - and can be an order of magnitude slower."
      },
      {
        "type": "intuition",
        "front": "Split the transform chain at the first RANDOM op",
        "back": "Everything before it can be precomputed offline (tokenize, pre-decode, pre-RESIZE to the training resolution - often the biggest win and usually skipped). Everything after must stay online because it must differ per epoch."
      },
      {
        "type": "definition",
        "front": "Data echoing",
        "back": "Reuse each loaded batch e times before fetching the next: trade sample FRESHNESS for utilization. Echo as EARLY in the pipeline as possible so each repeat gets different augmentation. Evaluate in WALL-CLOCK to a target - steps-to-target always looks worse by construction."
      },
      {
        "type": "pitfall",
        "front": "Low utilization on many nodes? Check for a STRAGGLER",
        "back": "Utilization is an AVERAGE. One slow rank makes every rank wait at the all-reduce, so all show low utilization while only one has a problem. Log per-rank step times and look at the DISTRIBUTION - no pipeline work fixes a bad disk on node 37."
      },
      {
        "type": "intuition",
        "front": "Input-bound makes the rest of the module irrelevant",
        "back": "Mixed precision, compile, checkpointing and sharding all make the accelerator faster or fit more on it - and the accelerator is IDLE. The synthetic-data test (run the loop on a fixed tensor) splits input-bound from everything else in ten minutes."
      }
    ],
    "refs": [
      {
        "title": "Aizman, Maltby & Breuel (2019), High Performance I/O For Large Scale Deep Learning (WebDataset)",
        "url": "https://arxiv.org/abs/2001.01858"
      },
      {
        "title": "Choi et al. (2019), Faster Neural Network Training with Data Echoing",
        "url": "https://arxiv.org/abs/1907.05550"
      },
      {
        "title": "Mohan et al. (2020), Analyzing and Mitigating Data Stalls in DNN Training",
        "url": "https://arxiv.org/abs/2007.06775"
      },
      {
        "title": "Murray et al. (2021), tf.data: A Machine Learning Data Processing Framework",
        "url": "https://arxiv.org/abs/2101.12127"
      },
      {
        "title": "NVIDIA DALI: GPU-accelerated data loading and augmentation",
        "url": "https://docs.nvidia.com/deeplearning/dali/user-guide/docs/index.html"
      }
    ],
    "demos": [
      "reservoir-sampling",
      "importance-sampling",
      "batching",
      "bloom-filter"
    ]
  },
  "training-stability": {
    "level": "core",
    "body": {
      "intuition": [
        "Stability is the exchange in this module whose value depends most sharply on context. Every guard - clipping, finite checks, skip-steps, warmup, a lower learning rate - costs a little throughput and a little complexity, and buys protection against events that may never happen. On a job you can restart in ten minutes, that is a bad trade. On a three-week run across a thousand accelerators, where a single poisoned step can silently destroy days of work and where nobody is watching at three in the morning, it is the best trade in the module.",
        "The failures come in four kinds and each has a signature. NUMERICAL: an overflow to infinity, then a subtraction giving NaN, then propagation through every parameter it touches - the fix is stable formulations and keeping sensitive operations in fp32, which mostly happens upstream of this lesson. OPTIMIZATION: gradients explode and a step destroys the parameters, usually from a learning rate that is too high or a missing warmup. DATA: one corrupted batch, and the measured consequence is stark - injecting corrupted inputs into 12% of batches left an unguarded run with ZERO percent finite weights, a completely dead model, while the same run with a finite check before the optimizer step kept 100% finite weights, converged, and simply skipped about seven steps. INSTABILITY AT SCALE: the loss spikes that appear in large language-model training and that the public training logbooks document in detail.",
        "The single highest-value habit is the cheapest one: CHECK THAT THE GRADIENTS ARE FINITE BEFORE YOU STEP, and skip if they are not. It costs one reduction per step and it converts a fatal, unrecoverable poisoning into a logged anomaly. Everything else is a matter of degree - how much clipping, how long a warmup, how often to checkpoint - and those are calibrated against how expensive a failure is. The second habit is monitoring the leading indicators rather than the loss, because gradient norm, loss scale and clip fraction all move hundreds of steps before the loss does, and by the time the loss shows a problem the parameters are already damaged."
      ],
      "math": [
        {
          "h": "Global-norm clipping preserves direction",
          "paras": [
            "Compute one norm across all parameters, and if it exceeds the threshold, scale every gradient by the same factor. The direction of the update is unchanged and only its length is capped.",
            "Per-element value clipping does not have this property - it clamps components independently and therefore rotates the update, which is why norm clipping is what people mean by gradient clipping unqualified."
          ],
          "tex": "g \\leftarrow g \\cdot \\min\\!\\left(1, \\frac{\\tau}{\\lVert g \\rVert_2}\\right), \\qquad \\lVert g \\rVert_2 = \\sqrt{\\textstyle\\sum_p \\lVert g_p \\rVert_2^2}",
          "texNote": "Note the norm is GLOBAL across all parameters, not per-tensor - a per-tensor clip would change the relative scale between layers, which is information the gradient carried. And the returned pre-clip norm is the most useful free metric in training: it rises hundreds of steps before a loss spike, which makes it a leading indicator rather than a lagging one."
        },
        {
          "h": "The dynamic loss scaler as a control loop",
          "paras": [
            "The scaler is searching for the largest factor that does not overflow, and the search is the same shape as network congestion control: multiplicative decrease on failure, multiplicative increase after a run of successes.",
            "The asymmetry is deliberate. Backing off must be immediate because an overflow costs a step; probing upward can be gradual because being conservative only costs precision."
          ],
          "tex": "S \\leftarrow \\begin{cases} S/2 \\;\\text{and skip the step} & \\exists\\, g_i \\notin \\mathbb{R} \\\\ 2S & \\text{after } N \\text{ consecutive clean steps} \\end{cases}",
          "texNote": "So a healthy run shows the scale sawtoothing - climbing, overshooting, halving - and skipping the occasional step. That is the control loop working. What is NOT healthy is the scale collapsing toward zero and staying there, which means gradients genuinely overflow at any usable scale and points at a real instability rather than an over-eager probe."
        },
        {
          "h": "When a guard is worth its cost",
          "paras": [
            "A guard costs a small fraction of throughput on every step and saves the expected cost of a failure. Comparing the two is what makes this a decision rather than a habit.",
            "The asymmetry that decides most real cases is that an unguarded numerical failure is not merely a lost step - it poisons every parameter and destroys everything since the last checkpoint."
          ],
          "tex": "\\text{guard if } \\underbrace{c_{\\text{guard}} \\cdot T}_{\\text{throughput tax}} \\;<\\; \\underbrace{p_{\\text{fail}} \\cdot T \\cdot \\big(t_{\\text{ckpt interval}} + t_{\\text{detect}}\\big)}_{\\text{expected work lost}}",
          "texNote": "Put numbers in: a finite check costs well under one percent of step time. If a poisoning event has even a one-in-a-million chance per step and would cost the hours since the last checkpoint plus however long before a human notices, the guard pays for itself many times over on any long run. On a ten-minute job it does not, which is the honest reason short experiments skip all of this."
        }
      ],
      "code": [
        {
          "h": "The guard, and what it is worth measured",
          "paras": [
            "One reduction per step, and it is the difference between a dead run and a logged anomaly. The measurement is worth reproducing because the outcome is not marginal."
          ],
          "code": "def finite_grads(model):\n    return all(p.grad is None or torch.isfinite(p.grad).all()\n               for p in model.parameters())\n\n# ... after backward, after unscale, after clip:\nif finite_grads(model):\n    opt.step()\nelse:\n    skipped += 1\n    log.warning(\"non-finite gradients at step %d - SKIPPING\", step)\nopt.zero_grad(set_to_none=True)      # zero either way, or the bad gradient\n                                     # persists into the next accumulation\n\n# MEASURED, injecting NaN/Inf into the inputs of 12% of batches:\n#   NO GUARD  -> 0% of weights finite. The model is DEAD - one poisoned step\n#                propagates NaN through every parameter it touches, and every\n#                subsequent step multiplies NaN by NaN. Unrecoverable.\n#   GUARDED   -> 100% of weights finite, run converges, ~7 steps skipped.\n#\n# THAT is the asymmetry. The guard costs one reduction per step; the failure\n# costs everything since the last checkpoint. And note the failure is SILENT\n# in the sense that nothing raises - the loss simply becomes NaN and stays.\n\n# THE SAME LOGIC IS INSIDE THE fp16 SCALER, which skips on overflow. If you\n# use bf16 - no scaler - you must add this check yourself. It is the most\n# commonly missing guard in a bf16 training loop, precisely because deleting\n# the scaler also deleted the skip logic people had been getting for free.\n\n# GO FURTHER ON A LONG RUN: also check the LOSS before backward, so a bad\n# batch is caught before it produces gradients at all.\nif not torch.isfinite(loss):\n    log.warning(\"non-finite LOSS at step %d - skipping batch\", step)\n    opt.zero_grad(set_to_none=True); continue",
          "caption": "Zero-percent finite weights against one hundred percent, from a single reduction per step. And the trap for bf16 users: deleting the GradScaler also deletes the skip-on-overflow logic it was providing, so the check must be added explicitly."
        },
        {
          "h": "Clipping, and the metrics that warn before the loss does",
          "paras": [
            "Clipping bounds the damage from a rare large gradient. The monitoring is what tells you the damage was coming, and every metric here is nearly free."
          ],
          "code": "# MEASURED on a deep MLP: at lr=3.0 the run diverges - gradient norm explodes\n# and the first NaN appears around step 5. With global-norm clipping at tau=1.0\n# the same configuration stays finite and converges. Clipping did not fix the\n# learning rate; it bounded the damage while the schedule caught up.\ngn = clip_grad_norm_(model.parameters(), max_norm=1.0)   # returns PRE-clip norm\n\n# THE MONITORING SET - all cheap, all LEADING indicators:\nlog({\n  \"grad_norm\":    gn,                       # rises hundreds of steps before a\n                                             # loss spike. The single best signal.\n  \"clip_frac\":    float(gn > 1.0),          # ~0 = the guard does nothing;\n                                             # ~1 = clipping has REPLACED your\n                                             # update rule with normalized steps\n  \"loss_scale\":   scaler.get_scale(),       # sawtooth = healthy control loop;\n                                             # collapsing and staying low = real\n                                             # overflow, not an over-eager probe\n  \"param_norm\":   total_param_norm(model),  # unbounded growth is a problem in\n                                             # progress\n  \"act_max\":      max_activation,           # approaching fp16's 65504 is the\n                                             # forward-pass overflow warning\n  \"skipped\":      skipped,                  # a RISING skip rate is instability\n})\n\n# WHAT TO DO WHEN A SPIKE HAPPENS ANYWAY, which at scale it will. The\n# operational answer from the public LLM training logbooks:\n#   1. CHECKPOINT OFTEN, so a rollback is cheap.\n#   2. On a spike: ROLL BACK to the last good checkpoint and SKIP the data\n#      batches that preceded it. This is standard practice in large runs,\n#      and it works - the spike is frequently reproducible from that data.\n#   3. If spikes recur: lower the LR, lengthen warmup, or apply an\n#      architectural fix (qk-layernorm, a z-loss on the logits, embedding\n#      normalization) rather than fighting each one individually.\n#\n# HONEST NOTE: the exact divergence step and the corrupted-batch fraction that\n# kills a run shift with seed, learning rate and depth. The QUALITATIVE result\n# - unguarded poisoning is total, guarded is a logged skip - is robust; the\n# specific numbers above are one measured configuration.",
          "caption": "Gradient norm is the single best leading indicator and it is returned for free by the clipping call. The clip fraction matters too: near zero means the guard is inert, near one means clipping has quietly replaced your optimizer with normalized steps."
        }
      ],
      "useCases": [
        "Long pretraining runs, where a single unguarded poisoned step destroys everything since the last checkpoint and where nobody is watching - the setting in which every guard in this lesson pays for itself many times over.",
        "Mixed-precision training in fp16, where the loss scaler's skip-on-overflow logic is doing exactly this job already, and where switching to bf16 removes the scaler and therefore removes the skip unless you add it back explicitly.",
        "Any pipeline consuming data you do not fully control - scraped corpora, user uploads, sensor streams - where a corrupted sample is a matter of when rather than whether, and detect-and-skip is the difference between an anomaly and a dead run.",
        "Reinforcement learning and preference optimization, where the objective is non-stationary and gradient magnitudes vary enormously, making clipping and finite checks load-bearing rather than precautionary."
      ],
      "pitfalls": [
        "Stepping the optimizer without checking that the gradients are finite. One poisoned step propagates NaN through every parameter it touches and every subsequent step multiplies NaN by NaN - measured at zero percent finite weights against one hundred percent for the guarded run.",
        "Switching from fp16 to bf16 and losing the skip logic. The GradScaler was checking for non-finite gradients and skipping; deleting it deletes that, so the explicit check must be added. This is the most commonly missing guard in a bf16 loop.",
        "Treating occasional skipped steps or a sawtoothing loss scale as a bug. That is the control loop probing for the largest usable factor. A scale that collapses and STAYS low is the real signal, and it means genuine overflow.",
        "Clipping without logging the pre-clip norm. clip_grad_norm_ returns it for free, and it is the best leading indicator available - rising hundreds of steps before the loss shows anything. Not logging it wastes the most valuable free metric in training.",
        "Setting the clip threshold without measuring. A threshold far above your typical gradient norm never fires and provides no protection; one far below it clips every step and has replaced your optimizer with normalized steps. Log the clip fraction and aim for it to bite on the tail only.",
        "Using clipping to mask a bad learning rate. It bounds the damage from a rare large gradient; if the clip fraction is near one, gradients are exploding every step and the cause is the learning rate, the initialization, or a missing normalization.",
        "Not checkpointing often enough to make a rollback cheap. The operational answer to a loss spike at scale is to roll back and skip the offending data, and that is only available if the checkpoint interval is short relative to how long a failure takes to notice."
      ],
      "connections": [
        {
          "ref": "training-systems/mixed-precision",
          "text": "Where most of these failures come from. fp16's narrow range creates the overflow and underflow this lesson manages, and the dynamic loss scaler is already implementing the skip-step guard - which is why moving to bf16 removes both the problem and, inadvertently, the protection."
        },
        {
          "ref": "pytorch-internals/custom-loss",
          "text": "The upstream fixes: stable formulations, fused losses, epsilon inside the square root rather than clamping the output. Numerical stability is best achieved by not generating the failure, and this lesson is what remains after that."
        },
        {
          "ref": "training-systems/profiling",
          "text": "The same instrument-first discipline applied to correctness rather than speed. Gradient norm, loss scale and clip fraction are to stability what the profiler timeline is to throughput - and all three are leading rather than lagging."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "The architectural answers to recurring instability at scale - qk-layernorm, z-loss on the logits, embedding normalization - which are preferable to fighting individual spikes because they remove the cause rather than the symptom."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The production continuation. Everything here is a leading indicator logged during a run someone can watch; monitoring applies the same thinking to systems nobody is watching, where the alert threshold is the design decision."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the cheapest high-value stability guard?",
          "a": "Check that all gradients are finite before calling optimizer.step, and skip the step if not. One reduction per step, and it converts a fatal poisoning into a logged anomaly."
        },
        {
          "q": "What happens without that guard?",
          "a": "One poisoned step propagates NaN through every parameter it touches, and every subsequent step multiplies NaN by NaN. Measured: zero percent finite weights against one hundred percent guarded."
        },
        {
          "q": "Why does switching to bf16 lose protection?",
          "a": "The fp16 GradScaler was checking for non-finite gradients and skipping the step. Deleting the scaler deletes that logic, so the explicit check must be added back."
        },
        {
          "q": "What is global-norm gradient clipping?",
          "a": "Compute one L2 norm across all parameters and scale every gradient by min(1, tau/norm) if it exceeds tau. The direction is preserved and only the length is capped."
        },
        {
          "q": "Why not clip per-element?",
          "a": "Clamping components independently rotates the update, changing its direction. Norm clipping caps the step length while preserving the direction the gradient indicated."
        },
        {
          "q": "Why is the pre-clip gradient norm the best free metric?",
          "a": "clip_grad_norm_ returns it, and it rises hundreds of steps before a loss spike - a leading indicator where the loss is a lagging one."
        },
        {
          "q": "What does the clip fraction tell you?",
          "a": "Near zero, the guard never fires and provides no protection. Near one, clipping has replaced your update rule with normalized steps. You want it biting on the tail only."
        },
        {
          "q": "Is a sawtoothing loss scale a problem?",
          "a": "No - that is the control loop probing for the largest usable factor and occasionally overshooting. A scale that collapses and stays low is the real warning."
        },
        {
          "q": "What is the operational response to a loss spike at scale?",
          "a": "Roll back to the last good checkpoint and skip the data batches that preceded the spike. It is standard practice in large runs and it usually works."
        },
        {
          "q": "Why does checkpoint frequency matter for stability?",
          "a": "Because rollback is the recovery mechanism, and its cost is however much work happened since the last checkpoint plus the time before anyone noticed."
        },
        {
          "q": "When is all this machinery not worth it?",
          "a": "On short jobs you can simply restart. The guards cost throughput and complexity to protect against rare events, so the trade depends on what a failure costs."
        },
        {
          "q": "What architectural fixes address recurring instability?",
          "a": "qk-layernorm, a z-loss penalizing large logits, and embedding normalization - which remove the cause rather than fighting each spike individually."
        }
      ],
      "standard": [
        {
          "q": "Your large training run produces NaN after two days. Walk through the response and the prevention.",
          "a": "THE IMMEDIATE RESPONSE, in order. (1) STOP AND PRESERVE STATE. Do not restart blindly - the checkpoint, the logs and the data ordering are the evidence, and a restart from the same point often reproduces the failure, which is useful. (2) ROLL BACK to the last checkpoint whose metrics were healthy, not merely the last checkpoint - if the loss had been degrading for a while, the most recent one may already be damaged. (3) IDENTIFY THE DATA. If your loader is deterministic and checkpointed, you know exactly which batches preceded the failure. The standard operational move from the public large-run logbooks is to roll back and SKIP those batches, and it frequently works, which tells you something: the spike is often reproducible from specific data rather than being purely stochastic. (4) RESTART with the guards on if they were not. THE DIAGNOSIS, from the logs you should already have. Look at the gradient norm trajectory - if it was climbing for hundreds of steps, this was an optimization instability building, and the loss was the last thing to show it. If it was flat and then NaN appeared instantly, the cause is a singularity or a corrupted input rather than a gradual divergence. Look at the loss scale if using fp16: repeated halving before the failure means gradients were overflowing. Look at the maximum activation if you logged it: approaching fp16's ceiling is the forward-pass overflow warning. THE FOUR CAUSES, matched to those signatures. NUMERICAL - an overflow in a loss or attention computation, fixed upstream with stable formulations and fp32 for sensitive operations. OPTIMIZATION - the learning rate is too high or warmup too short, and the gradient norm was rising. DATA - a corrupted sample, which the finite check would have turned into a skipped step. SCALE INSTABILITY - the loss spikes that large language-model training exhibits, where the answer is rollback plus an architectural fix if they recur. THE PREVENTION, which is the substance of a good answer. (1) THE FINITE CHECK BEFORE step. Measured: injecting corruption into 12% of batches left an unguarded run with zero percent finite weights - completely dead - while the guarded run kept 100% finite, converged, and skipped about seven steps. One reduction per step. If you use bf16 you must add this yourself, because deleting the GradScaler deleted the skip logic. (2) GRADIENT CLIPPING with a threshold set from the measured distribution, plus logging the pre-clip norm and the clip fraction. (3) FREQUENT CHECKPOINTS, because rollback is the recovery mechanism and its cost is bounded by the interval. (4) THE LEADING-INDICATOR DASHBOARD: gradient norm, clip fraction, loss scale, parameter norm, maximum activation, skip count. Every one is nearly free and every one moves before the loss. (5) DETERMINISTIC DATA ORDERING with the position checkpointed, so you can identify and skip the offending batches - without it, the rollback-and-skip recovery is not available to you. THE FRAMING I WOULD END ON. Two days of a large run is expensive enough that the guards are obviously worth their cost, and the reason they were absent is almost always that the pipeline was developed on short jobs where they were not. That is a defensible origin and a bad reason to still be there.",
          "deepDive": {
            "q": "Why do loss spikes happen in large language-model training specifically, and what actually fixes them?",
            "a": "THE PHENOMENON. Large transformer pretraining runs exhibit sudden loss spikes - the loss jumps by a large factor over a few steps and then either recovers over hundreds of steps or diverges permanently. They are documented in detail in the public training logbooks, and they are common enough that rollback-and-skip is a standard operational procedure rather than an exceptional response. WHAT IS KNOWN ABOUT THE MECHANISM, and I would be honest that it is not fully settled. Several contributing factors are well established. (1) ATTENTION LOGIT GROWTH. The query-key dot products can grow large during training, pushing the softmax toward saturation - a near-one-hot attention distribution. That produces very small gradients through the softmax and a sharp loss surface, and small perturbations then cause large changes. This is the best-characterized cause and it has the clearest fix. (2) OUTPUT LOGIT MAGNITUDE. Unbounded growth in the final logits makes the softmax numerically delicate and the loss landscape sharp. (3) THE ADAM SECOND MOMENT going stale. If a parameter receives near-zero gradients for a long stretch, v decays and the effective step size for that parameter grows; a subsequent ordinary gradient then produces an enormous update. This is a genuine mechanism and it explains why spikes can appear after long quiet periods. (4) SPECIFIC DATA - some batches genuinely trigger them, which is why skipping the batch on rollback often works. THE FIXES, in order of how well they address the cause rather than the symptom. (a) QK-LAYERNORM: normalize the queries and keys before the dot product, which bounds the attention logits directly. This is the targeted fix for cause (1), it was adopted after being demonstrated at scale, and it is now common in large models. (b) Z-LOSS: add a small penalty on the log-partition-function of the output softmax, which keeps the logits from drifting large without changing the argmax. Targets cause (2), and it is cheap. (c) EMBEDDING NORMALIZATION and careful initialization scaling, which address the same growth from the other end. (d) LOWER LEARNING RATE OR LONGER WARMUP, which works and costs training efficiency - the blunt instrument. (e) EPSILON IN ADAM raised, which mitigates cause (3) by bounding how large the effective step can get. WHAT DOES NOT FIX IT. Gradient clipping alone bounds the damage from a spike without preventing it, and if spikes recur you are riding the clip rather than training. And simply rolling back repeatedly is an operational treadmill rather than a solution - if you have skipped data three times, the architecture or the schedule is the problem. THE METHODOLOGICAL POINT worth making, because it is the most useful part. Wortsman et al. showed that these instabilities can be REPRODUCED AT SMALL SCALE by using high learning rates, which turns a phenomenon you could previously only study on a thousand-GPU run into something you can study on one machine. That is a genuinely important result: it means the fixes can be developed and validated cheaply, and it is why the architectural mitigations above have reasonable evidence behind them rather than being folklore from a handful of expensive runs. If I were responsible for a large run, I would develop the stability configuration on small-scale proxies with elevated learning rates before committing the compute."
          }
        },
        {
          "q": "How would you set the gradient-clipping threshold?",
          "a": "BY MEASUREMENT, not by convention, and the measurement is free because clip_grad_norm_ returns the pre-clip norm. THE PROCEDURE. Run a few hundred steps with a very large threshold so nothing is clipped, and log the gradient norm. Look at its distribution - not just the mean, because gradient norms are heavy-tailed and the mean is not the interesting statistic. You want to see the body of the distribution and the tail. Then set the threshold somewhere above the body and below the tail, so it clips the rare large gradient and leaves ordinary steps untouched. WHY THE DEFAULT OF 1.0 IS A DEFAULT AND NOT A PRINCIPLE. If your typical gradient norm is 0.05, a threshold of 1.0 never fires and you have no protection at all - you have the illusion of a guard. If your typical norm is 40, a threshold of 1.0 clips every single step, which means every update has the same length and only the direction varies. That is not gradient clipping, it is normalized gradient descent, which is a different optimizer with different behaviour that you did not choose. Both failure modes are common and both are invisible unless you log the clip fraction. THE METRIC THAT SETTLES IT: CLIP FRACTION - what proportion of steps are being clipped. Near zero means inert. Near one means you have replaced your update rule. Somewhere in the low single-digit percent is the intent: the guard bites on the tail only. I would log it permanently and treat a rising clip fraction as a signal to investigate rather than as the guard working. WHAT THE THRESHOLD INTERACTS WITH. The LEARNING RATE, obviously - clipping bounds the step length, so a high learning rate with aggressive clipping is a normalized-step optimizer. The BATCH SIZE, since larger batches give smaller-variance gradients and therefore a tighter distribution, so a threshold tuned at one batch size may not transfer. And LOSS SCALING under fp16: you must unscale before clipping or the threshold is compared against numbers tens of thousands of times too large and the clip never fires - which is the silent-disable failure. WHAT CLIPPING DOES NOT DO, and I would state this clearly. It bounds the damage from a rare large gradient; it does not address why gradients are large. If the clip fraction is high, the cause is upstream - a learning rate that is too high, a missing warmup, a bad initialization, an unstable loss formulation, or a missing normalization layer - and clipping is masking it while training slowly and badly. So a high clip fraction is a diagnosis to pursue, not a configuration to accept. THE PRACTICAL DEFAULT I WOULD GIVE. Start at 1.0 because it is the convention and many recipes assume it, log the norm and the clip fraction from step one, and adjust once you have seen the distribution. That takes one run and it converts an inherited number into a measured one."
        },
        {
          "q": "Explain the skip-step guard and why it matters more than it appears to.",
          "a": "THE MECHANISM. After backward and after unscaling, check that every gradient is finite. If any is not, skip the optimizer step, zero the gradients, log it, and continue. Roughly five lines. WHY IT MATTERS SO MUCH - the asymmetry. A non-finite gradient applied to a parameter makes that parameter non-finite. On the next forward pass that parameter produces non-finite activations, which produce non-finite gradients for other parameters, and within a step or two the entire model is NaN. Every subsequent step multiplies NaN by NaN. There is no recovery: the loss is NaN forever and the run is dead. So the cost of NOT guarding is not one bad step, it is everything since the last checkpoint plus however long before someone notices. THE MEASUREMENT that makes this concrete. Injecting NaN or Inf into the inputs of 12% of batches: the unguarded run ended with ZERO percent of weights finite - completely dead - while the same configuration with the check kept 100% finite, converged normally, and skipped about seven steps. That is not a marginal improvement, it is the difference between a result and nothing. THE COST. One reduction over the gradients per step, which is well under a percent of step time, and which can be folded into the clipping pass since that already computes a global norm - a non-finite gradient makes the norm non-finite, so checking the returned norm is finite is nearly free. WHERE PEOPLE ALREADY HAVE IT WITHOUT KNOWING. The fp16 GradScaler does exactly this: it checks for non-finite gradients, skips the step, and halves the scale. So an fp16 training loop has the guard for free. THE TRAP IS MOVING TO bf16, which is otherwise strictly better - deleting the scaler also deletes the skip logic, and the loop that was protected is now not. This is the single most commonly missing guard in a bf16 training loop and the reason is precisely that it was previously invisible. GOING FURTHER ON A LONG RUN. Check the LOSS before backward, so a bad batch is caught before it generates gradients at all - cheaper and it localizes the problem to the data rather than the optimization. Track the skip RATE, because occasional skips are fine and a rising rate is instability. And decide what happens if skips become frequent: at some threshold the right response is to halt rather than to keep skipping, because a run that is skipping a quarter of its steps is not training. THE JUDGEMENT ABOUT WHEN IT IS WORTH IT, which is this module's framing. The guard costs a fraction of a percent of throughput to protect against an event that destroys everything since the last checkpoint. On a ten-minute job that is a bad trade and you should just restart. On a three-week thousand-GPU run it is the best trade available, and the reason it is often missing is that the code was developed on short jobs and nobody revisited the assumption when the scale changed."
        },
        {
          "q": "What would you monitor to catch instability before it becomes a failure?",
          "a": "THE PRINCIPLE: the loss is a LAGGING indicator of nearly every failure in this lesson. By the time it moves, the parameters are already damaged. So the metrics worth logging are the ones that move first, and they are all nearly free. THE LEADING SET, in order of value. (1) GRADIENT NORM, pre-clip. Returned for free by clip_grad_norm_. It typically rises for hundreds of steps before a loss spike, which makes it the single best early signal available. Plot it on a log scale, since the interesting behaviour spans orders of magnitude. (2) CLIP FRACTION. Near zero means the guard is inert; near one means clipping has replaced the update rule; a RISING fraction means gradients are growing and something upstream is wrong. (3) LOSS SCALE, if using fp16. A sawtooth is the control loop working. A collapse that persists means gradients genuinely overflow at any usable scale, which is a real instability rather than an over-eager probe. (4) SKIP COUNT AND RATE. Occasional skips are normal; a rising rate is the run degrading. (5) PARAMETER NORM, or its change per step. Unbounded growth is a problem in progress, and the ratio of update magnitude to parameter magnitude is a useful scale-free version. (6) MAXIMUM ACTIVATION from a couple of representative layers. Approaching fp16's ceiling of about 65,504 is the forward-pass overflow warning, and the forward is where the loss scaler does not protect you. THE PERIODIC SET, too expensive for every step. Per-layer gradient norms, which localize a vanishing or exploding gradient to a depth rather than leaving you with an aggregate. Activation statistics - mean, standard deviation, dead-unit fraction. Attention logit magnitudes for a transformer, since attention-logit growth is a well-characterized cause of large-scale instability. Every few hundred steps is enough. THE IMPLEMENTATION CONSTRAINT that decides whether this is practical. Every .item() is a device-to-host synchronization that drains the pipeline the CPU had built by running ahead - so naively logging six scalars every step can measurably slow training. Accumulate them on the DEVICE and transfer once per logging interval. That gives you every step's value at one synchronization per interval, and it is what well-optimized loops do. THE ALERTING, since a long run has nobody watching. Alert on gradient norm exceeding a multiple of its recent median, on the skip rate crossing a threshold, on the loss scale staying below a floor, and on peak memory trending upward. Those four catch most of what this module's failures look like in progress. WHAT I WOULD SAY ABOUT WHY THIS IS SKIPPED. It is skipped because on a short run you watch the loss and restart if it breaks, which works. The habit does not transfer when the run gets long, and the cost of not having the metrics is that the post-mortem has nothing to go on - which is the situation people are usually in when they ask why their run diverged."
        },
        {
          "q": "How do stability techniques interact with the rest of this module?",
          "a": "WITH MIXED PRECISION - the tightest coupling, and it runs in an uncomfortable direction: mixed precision CREATES most of what this lesson manages. fp16's narrow range produces the overflow and underflow, and the dynamic loss scaler is itself a stability mechanism - a control loop searching for the largest factor that does not overflow, with a skip-step guard built in. Moving to bf16 removes the cause AND removes the protection, so the finite check must be added explicitly. That is a genuine systems argument that gets lost in the usual bf16-is-better summary. WITH GRADIENT ACCUMULATION. An overflow detected at the step boundary discards the WHOLE accumulated gradient, not just the offending micro-batch - so a bad micro-batch costs k micro-batches of work. That argues for smaller accumulation counts under fp16, and it is another point in bf16's favour. Also: clipping must happen once, at the boundary, on the accumulated gradient, not per micro-step. WITH DDP AND FSDP. Two interactions. The finite check should be consistent ACROSS RANKS - if rank 3 sees a non-finite gradient and skips while the others step, the replicas diverge and you now have a silent correctness problem on top of the original one. The correct pattern is to all-reduce the finite flag so every rank makes the same decision, which costs one small collective. And note that the gradient all-reduce itself will propagate a NaN from one rank to all of them, so a corrupted sample on any rank poisons the whole job - which raises the value of the guard considerably at scale. WITH CHECKPOINTING. Checkpoint frequency IS the stability budget, because rollback is the recovery mechanism. The interval should be set from how much work you are willing to lose, and it should include the data-loader position or the rollback-and-skip recovery is unavailable. WITH torch.compile. Compiled regions are harder to instrument, and a NaN inside one is harder to localize - so when debugging an instability, disabling compilation is a reasonable early step, accepting the slowdown for the visibility. WITH THE LEARNING-RATE SCHEDULE. Warmup is a stability mechanism, not a formality: it exists because the linearization behind the linear scaling rule is invalid early when weights move fast, and skipping it is a leading cause of divergence in the first few hundred steps of a scaled-up run. THE PATTERN ACROSS ALL OF THESE. Stability is not a separate concern layered on top - it is a property of how the other techniques are configured and ordered. Most of the failures in this lesson are produced by another technique in the module, which is why the capstone treats the pipeline as one system rather than a list of independent optimizations.",
          "deepDive": {
            "q": "Why must the skip decision be consistent across ranks, and how would you implement that?",
            "a": "THE PROBLEM. In data-parallel training, every rank holds a replica of the model and they must stay IDENTICAL - that is the invariant the whole scheme rests on. Ranks start identical, receive the same averaged gradient, and apply the same update, so they remain identical. If rank 3 decides to skip a step because it saw a non-finite gradient while the other ranks step, that invariant is broken: rank 3's parameters now differ from everyone else's, permanently. FROM THAT POINT ON the ranks are averaging gradients computed from DIFFERENT models. Training continues and converges worse, with no error anywhere - it is exactly the failure mode of forgetting to broadcast parameters at startup, arriving later. And it compounds, because every subsequent skip on any rank widens the divergence. WHY IT IS EASY TO GET WRONG. The natural implementation is a local check: look at my gradients, skip if bad. Locally correct, globally wrong. And it is easy to believe the check is redundant because the all-reduce already averaged the gradients - which is where the second subtlety comes in. WHAT THE ALL-REDUCE ACTUALLY DOES TO A NaN. It PROPAGATES it. A NaN in one rank's gradient makes the sum NaN, so after the all-reduce EVERY rank has a non-finite gradient. So in the common case all ranks see the same thing and would make the same decision anyway. The divergence risk arises where the check is done BEFORE the all-reduce, or where a rank's check is on a different quantity - and in FSDP, where each rank only holds a shard of the gradient, a rank can genuinely see finite values in its shard while another sees a NaN in a different shard. That case is real and it is the one to design for. THE CORRECT IMPLEMENTATION. Compute a local flag - one if all my gradients are finite, zero otherwise - and all-reduce it with a MIN or a product. Every rank then has the same global flag and makes the same decision. It is one collective on a single scalar, so the cost is a fraction of the gradient all-reduce you are already doing. In practice you can fold it in: the gradient norm computation for clipping already produces a global reduction, and a NaN anywhere makes that norm non-finite, so checking that the reduced norm is finite gives you a globally-consistent decision for free. That is the implementation I would use. WHAT PYTORCH'S OWN MACHINERY DOES. The GradScaler's step method checks for non-finite gradients and skips, and in a distributed setting the standard usage relies on the fact that the all-reduce has already propagated any NaN to all ranks, so the decisions agree. FSDP's mixed-precision handling is more careful about this because of the sharding case. The lesson is to know WHY it agrees rather than to assume it does - because the moment you write your own check, or place it before the collective, or shard the gradients, the assumption stops holding. THE GENERAL PRINCIPLE. In data-parallel training, any DECISION that affects the parameters must be made identically on every rank. Skips, clipping thresholds if adaptive, learning-rate changes triggered by a condition, early stopping - all of them. The safe pattern is to compute the decision on the reduced quantity, or to compute it locally and broadcast it. Rank-dependent decisions that touch the parameters are a class of bug worth recognizing by shape."
          }
        },
        {
          "q": "When would you deliberately skip these guards?",
          "a": "THIS DESERVES A STRAIGHT ANSWER, because the guards are not free and reflexively adding all of them is its own error. CASE 1: SHORT EXPERIMENTS. A ten-minute run that you can restart costs less to rerun than the guards cost to maintain and reason about. During exploratory work, a run that dies is information and restarting is cheap. The guards matter when a failure is expensive, and on a short job it is not. This is the honest reason most research code lacks them, and it is defensible until the run gets long - which is exactly when nobody revisits it. CASE 2: WHEN THE GUARD IS MASKING SOMETHING YOU NEED TO SEE. If I am debugging why a model diverges, I might deliberately remove clipping so the divergence happens promptly and visibly rather than being bounded into a slow degradation. Clipping makes a broken configuration look like a working-but-poor one, which is worse for diagnosis. Same for the skip guard: during a bisection, letting the NaN propagate tells me the step at which it originated. CASE 3: WHEN THE COST IS ACTUALLY MEASURABLE. Most guards are well under a percent, but not all. Logging six scalars per step with .item() is a synchronization per scalar per step and can be several percent - so the fix is to accumulate on device and log per interval, not to stop logging. And per-layer gradient norms every step are genuinely expensive; every few hundred steps is enough. The judgement is about the frequency, not the metric. CASE 4: WHEN A GUARD CHANGES THE OPTIMIZATION. This is the one people miss. Aggressive clipping at a high clip fraction is not a safety net, it is a different optimizer - normalized gradient descent - and if I am trying to reproduce a published result I need to know whether their clipping was inert or load-bearing. So I would not add clipping to a reproduction without checking whether the original had it. WHAT I WOULD NEVER SKIP ON A LONG RUN. The finite check before the step, because the failure it prevents is total and unrecoverable and the cost is one reduction. And logging the gradient norm, because it is returned for free by a call you are already making and it is the only leading indicator you get for nothing. Those two are close to unconditional above some run length. THE DECISION RULE I WOULD STATE. Compare the guard's throughput cost against the expected work lost - the failure probability times the checkpoint interval plus the detection delay. On a short run the second term is small and the guards lose. On a long run the second term is enormous because the detection delay alone can be hours, and they win by orders of magnitude. That calculation is the module's framing applied to robustness, and it is why the same code can be right for one job and wrong for another."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The finite check before opt.step",
        "back": "MEASURED with 12% corrupted batches: UNGUARDED -> 0% of weights finite (dead, unrecoverable - every step multiplies NaN by NaN). GUARDED -> 100% finite, converged, ~7 steps skipped. Cost: one reduction per step."
      },
      {
        "type": "pitfall",
        "front": "Moving to bf16 silently removes your skip guard",
        "back": "The fp16 GradScaler was checking for non-finite gradients and SKIPPING the step. Deleting the scaler deletes that logic. This is the most commonly missing guard in a bf16 loop, precisely because it was previously invisible."
      },
      {
        "type": "formula",
        "front": "Global-norm clipping",
        "back": "g <- g * min(1, tau/||g||_2) with the norm taken GLOBALLY across all parameters. Direction preserved, only length capped. Per-element clipping ROTATES the update - which is why norm clipping is what 'gradient clipping' means unqualified."
      },
      {
        "type": "intuition",
        "front": "Gradient norm is the best free leading indicator",
        "back": "clip_grad_norm_ RETURNS the pre-clip norm. It typically rises for HUNDREDS of steps before a loss spike - the loss is a lagging indicator of nearly every failure here. Plot it on a log scale."
      },
      {
        "type": "pitfall",
        "front": "The clip threshold must be measured, not inherited",
        "back": "Typical norm 0.05 with tau=1.0 -> never fires, no protection. Typical norm 40 with tau=1.0 -> clips EVERY step, so you have silently switched to normalized gradient descent. Log the CLIP FRACTION; you want it biting the tail only (low single-digit %)."
      },
      {
        "type": "definition",
        "front": "The loss scaler is a control loop",
        "back": "Multiplicative decrease on failure (halve + SKIP), multiplicative increase after N clean steps - the same shape as congestion control. A SAWTOOTH is healthy. A collapse that PERSISTS means genuine overflow, not an over-eager probe."
      },
      {
        "type": "formula",
        "front": "When a guard is worth its cost",
        "back": "guard if c_guard * T < p_fail * T * (checkpoint_interval + detection_delay). On a 10-minute job the right side is tiny and guards lose. On a 3-week run the DETECTION DELAY alone is hours, and they win by orders of magnitude."
      },
      {
        "type": "pitfall",
        "front": "The skip decision must be IDENTICAL across ranks",
        "back": "If rank 3 skips while others step, the replicas DIVERGE permanently and then average gradients of different models - no error, worse convergence. Fix: all-reduce the finite flag (MIN), or check the already-reduced global gradient norm, which is free."
      },
      {
        "type": "intuition",
        "front": "Why loss spikes happen at LLM scale",
        "back": "Attention LOGIT GROWTH saturating the softmax; unbounded output logits; Adam's second moment going stale after quiet stretches so a normal gradient produces a huge update; and specific data. Fixes: qk-layernorm, z-loss, embedding norm - not just a lower LR."
      },
      {
        "type": "definition",
        "front": "Rollback-and-skip",
        "back": "The standard operational response to a loss spike at scale: roll back to the last HEALTHY checkpoint (not merely the last one) and SKIP the data batches that preceded it. It works often, which tells you spikes are frequently data-triggered. Needs a checkpointed loader position."
      },
      {
        "type": "intuition",
        "front": "Instabilities reproduce at small scale",
        "back": "Wortsman et al.: large-run instabilities can be reproduced on one machine by using HIGH LEARNING RATES. That turns a phenomenon you could only study on 1000 GPUs into something you can develop fixes against cheaply - which is why the architectural mitigations have real evidence."
      },
      {
        "type": "pitfall",
        "front": "A high clip fraction is a diagnosis, not a guard working",
        "back": "Clipping bounds the DAMAGE from a rare large gradient; it does not address why gradients are large. If it fires every step, the cause is upstream - learning rate, missing warmup, bad init, unstable loss, missing normalization - and clipping is masking it."
      }
    ],
    "refs": [
      {
        "title": "Wortsman et al. (2023), Small-scale Proxies for Large-scale Transformer Training Instabilities",
        "url": "https://arxiv.org/abs/2309.14322"
      },
      {
        "title": "Pascanu, Mikolov & Bengio (2013), On the Difficulty of Training Recurrent Neural Networks",
        "url": "https://arxiv.org/abs/1211.5063"
      },
      {
        "title": "Chowdhery et al. (2022), PaLM: Scaling Language Modeling with Pathways (loss spikes and rewind)",
        "url": "https://arxiv.org/abs/2204.02311"
      },
      {
        "title": "Zhang et al. (2022), OPT: Open Pre-trained Transformer Language Models (training logbook)",
        "url": "https://arxiv.org/abs/2205.01068"
      },
      {
        "title": "Dehghani et al. (2023), Scaling Vision Transformers to 22 Billion Parameters (qk-layernorm)",
        "url": "https://arxiv.org/abs/2302.05442"
      }
    ],
    "demos": [
      "gradient-clipping",
      "mixed-precision",
      "optimizers",
      "weight-init"
    ]
  },
  "profiling": {
    "level": "core",
    "body": {
      "intuition": [
        "This lesson is the instrument the rest of the module depends on. Every other technique here is an exchange whose rate depends on your configuration, so applying any of them without knowing which resource binds is guessing - and Amdahl's law makes that quantitative rather than advisory: optimizing a component that is a fifth of your time caps your gain at 25% no matter how well you do it. The measurement that would have told you takes minutes.",
        "The metric that organizes performance work at scale is MODEL FLOPS UTILIZATION - the fraction of the hardware's theoretical peak arithmetic throughput you are actually achieving. It is powerful because it is ABSOLUTE. A throughput number tells you nothing without a reference; MFU tells you how much of the machine you are using and therefore how much is left. For large transformer training, something in the 30 to 50% range is respectable, above 50% is very good, and below 20% means something is structurally wrong rather than merely untuned. And it is computable from a FLOP model you can write down: roughly six times parameters times tokens for a transformer's training step, which turns 'is this fast' into arithmetic.",
        "The discipline that follows is a PERFORMANCE BUDGET that accounts for one hundred percent of step time. Every millisecond is compute, communication, data, or idle - and idle is the interesting category, because it is where the unexplained time hides. Starting from the theoretical time implied by the FLOP count and the device's peak, you explain each gap: this much lost to memory-bound operations, this much to communication that did not overlap, this much to a straggler rank, this much to a synchronization from logging. When the budget balances you know what to optimize and by how much. When it does not, the unexplained residual is the most valuable thing in the analysis."
      ],
      "math": [
        {
          "h": "The transformer FLOP model",
          "paras": [
            "Each parameter participates in one multiply-accumulate per token in the forward pass, which is two FLOPs. The backward pass costs roughly twice the forward, because it computes gradients with respect to both inputs and weights.",
            "That gives the standard six-times rule, which is accurate enough to budget with and is why it is used throughout the scaling literature."
          ],
          "tex": "C \\approx 6 N D \\;+\\; \\underbrace{12\\,L\\,H\\,D\\,S}_{\\text{attention, }O(S^2)\\text{ term}} \\qquad (N \\text{ params},\\; D \\text{ tokens},\\; S \\text{ seq len})",
          "texNote": "The 6 decomposes as 2 for the forward and 4 for the backward. The attention term is separate because it scales with sequence length rather than with parameters, and it is negligible at short context and dominant at long context - which is why the six-times rule is a good approximation for typical settings and a bad one at 32k tokens. Knowing where the crossover is for your configuration is worth the five minutes."
        },
        {
          "h": "Model FLOPs Utilization",
          "paras": [
            "Divide the useful arithmetic your model requires by the time taken and by the hardware's theoretical peak. It is a fraction, so it is comparable across models, hardware and scales.",
            "The definition uses the FLOPs the model logically needs, not the FLOPs actually executed - so recomputation from gradient checkpointing counts against you, which is correct, because it is overhead rather than useful work."
          ],
          "tex": "\\mathrm{MFU} = \\frac{6ND / t_{\\text{step}}}{N_{\\text{dev}} \\cdot P_{\\text{peak}}}",
          "texNote": "Two conventions worth distinguishing. MODEL FLOPs utilization counts only the arithmetic the model requires; HARDWARE FLOPs utilization also counts recomputation, so a checkpointed run has a higher HFU than MFU and the gap is exactly the recompute overhead. Report which one you mean. And use the peak for the PRECISION you are running - quoting bf16 tensor-core peak while running fp32 makes your MFU look terrible for the wrong reason."
        },
        {
          "h": "Scaling efficiency, and where it goes",
          "paras": [
            "Perfect scaling means per-device throughput is independent of device count. The shortfall is communication that did not overlap, stragglers, and any serial fraction.",
            "The straggler term is the one people forget and it is not an average - a single slow rank sets the pace for everyone, because every rank waits at the collective."
          ],
          "tex": "E(N) = \\frac{T_1}{N \\cdot T_N}, \\qquad T_N \\ge \\max_{i \\le N} t_i \\;+\\; t_{\\text{comm, exposed}}",
          "texNote": "Read the max: the step time is bounded below by the SLOWEST rank, so a distribution of per-rank times matters more than their mean. On a large cluster one bad disk, one thermally throttled device or one noisy neighbour presents as a uniform global slowdown, and no amount of pipeline or model optimization will touch it. Logging per-rank step times is how you tell."
        }
      ],
      "code": [
        {
          "h": "Compute MFU, and decide from it",
          "paras": [
            "Twenty lines that convert a throughput number into a statement about how much of the machine you are using - and therefore about how much is available."
          ],
          "code": "def transformer_flops(n_params, n_layers, n_heads, d_model, seq_len, tokens):\n    dense = 6 * n_params * tokens                       # fwd 2N + bwd 4N per token\n    attn  = 12 * n_layers * d_model * seq_len * tokens  # the O(S^2) term\n    return dense + attn\n\ndef mfu(flops, step_time_s, n_dev, peak_flops_per_dev):\n    return flops / step_time_s / (n_dev * peak_flops_per_dev)\n\n#  USE THE PEAK FOR THE PRECISION YOU ARE RUNNING. Quoting bf16 tensor-core\n#  peak while running fp32 makes your MFU look terrible for the wrong reason.\n\n#  READ THE RESULT:\n#    > 50%   excellent - you are near the practical ceiling; remaining wins are\n#            algorithmic (better attention kernels) or precision\n#    30-50%  respectable for large-scale training; incremental work pays\n#    20-30%  something is leaking - check overlap, data, and small-kernel time\n#    < 20%   STRUCTURALLY wrong. Not a tuning problem. Look for an idle GPU, a\n#            straggler, unoverlapped communication, or a model whose shapes do\n#            not use tensor cores at all.\n\n# MFU vs HFU - report which you mean:\n#   MODEL FLOPs util    counts only the arithmetic the MODEL requires\n#   HARDWARE FLOPs util also counts RECOMPUTATION (checkpointing)\n#   The gap between them IS your recompute overhead, which is a useful number\n#   in its own right - it tells you what checkpointing is costing.\n\n# THE ATTENTION CROSSOVER, worth computing once for your config:\nfor S in (512, 2048, 8192, 32768):\n    d, a = transformer_flops(N, L, H, d_model, S, tokens=S)\n    print(S, f\"attention is {100*a/(d+a):.0f}% of FLOPs\")\n#   Short context: the 6ND rule is a good approximation. Long context: the\n#   quadratic term dominates and budgeting with 6ND alone is badly wrong.",
          "caption": "MFU is absolute where throughput is relative - it says how much of the machine you are using and therefore how much is left. Below 20% is a structural problem rather than a tuning one, which redirects the whole investigation."
        },
        {
          "h": "A performance budget that accounts for 100% of step time",
          "paras": [
            "The discipline that makes the analysis terminate. Start from the theoretical time, explain every gap, and treat the unexplained residual as the finding."
          ],
          "code": "# 1. THE FLOOR: what the arithmetic alone would take at peak.\nt_ideal = flops / (n_dev * peak_flops)\n\n# 2. THE ACTUAL, measured with warm-up and synchronization.\nt_actual = measure_steady_state()\n\n# 3. ATTRIBUTE EVERY MILLISECOND. From the profiler timeline:\nbudget = {\n  \"matmul kernels\":        t_matmul,      # useful arithmetic, near peak\n  \"memory-bound kernels\":  t_elementwise, # norms, activations, adds -> fuse\n  \"communication EXPOSED\": t_comm_gap,    # all-reduce NOT hidden behind compute\n  \"data stalls\":           t_input_wait,  # GPU idle waiting on the loader\n  \"launch gaps\":           t_launch,      # picket fence -> compile / CUDA graphs\n  \"synchronization\":       t_sync,        # .item(), prints, tensor-valued ifs\n  \"recompute\":             t_ckpt,        # gradient checkpointing overhead\n}\nresidual = t_actual - t_ideal - sum(budget.values())\n#   THE RESIDUAL IS THE MOST VALUABLE NUMBER HERE. If it is large, your model\n#   of where time goes is wrong, and everything you plan from it is guesswork.\n\n# 4. THE STRAGGLER CHECK - specific to distributed and routinely missed.\n#    Step time is bounded below by the SLOWEST rank, so an average hides it.\nts = [None] * world; dist.all_gather_object(ts, local_step_time)\nif max(ts) > 1.15 * median(ts):\n    print(\"STRAGGLER: rank\", ts.index(max(ts)), max(ts), \"vs median\", median(ts))\n#   One bad disk, one throttled device or one noisy neighbour presents as a\n#   UNIFORM global slowdown. No model or pipeline work will touch it.\n\n# 5. THE SCALING CURVE, which tells you where the ceiling is:\n#    run at 1, 2, 4, 8, ... devices with the SAME per-device batch and plot\n#    per-device throughput. Flat = perfect scaling. A cliff at the node\n#    boundary = the inter-node interconnect. A gentle decline = growing\n#    communication overhead. Twenty minutes, and it bounds every later claim.",
          "caption": "The residual is the finding. A budget that leaves 40% unexplained means your model of where the time goes is wrong, and every optimization planned from it is guesswork."
        }
      ],
      "useCases": [
        "Deciding what to optimize on a large training job, where Amdahl's law makes the profile the only defensible basis - and where discovering that the data pipeline is 60% of step time invalidates every model-side change you were considering.",
        "Capacity planning and cost estimation: MFU plus the FLOP model gives GPU-hours to a target and therefore a dollar figure, before the run starts and in a form that can be checked against the invoice afterwards.",
        "Justifying hardware or configuration changes, since MFU is absolute and comparable - a claim that a change improved throughput 20% is much stronger when it is stated as MFU rising from 32% to 38% against a known ceiling.",
        "Diagnosing poor scaling on a cluster, where the scaling curve's shape distinguishes communication overhead from stragglers from an input pipeline that cannot feed more devices - three problems with unrelated fixes."
      ],
      "pitfalls": [
        "Optimizing before profiling. Amdahl bounds your gain by the fraction you are improving, so effort on an unmeasured component has an expected payoff near zero - and a 60% data pipeline makes every model-side change nearly worthless.",
        "Quoting MFU against the wrong peak. Use the theoretical peak for the precision you are actually running; comparing bf16 throughput against fp32 peak, or against a sparse-tensor-core figure you are not using, produces numbers that are meaningless in either direction.",
        "Confusing model FLOPs utilization with hardware FLOPs utilization. HFU counts recomputation from gradient checkpointing and MFU does not, so a checkpointed run reports a higher HFU. State which you mean - the gap between them is exactly your recompute overhead.",
        "Using the six-times rule at long context. The attention term scales with sequence length and is negligible at 2k tokens and dominant at 32k, so budgeting with 6ND alone at long context understates the work badly.",
        "Reading average utilization on a multi-node job. One slow rank makes every rank wait at the collective, so all of them show low utilization while only one has a problem. Log per-rank step times and look at the distribution.",
        "Timing without warm-up and synchronization. Early iterations include autotuning, allocator growth and possibly compilation, and CUDA launches are asynchronous - so timing without both measures the wrong thing and the error always flatters the device.",
        "Accepting a performance budget with a large unexplained residual. If 40% of step time is unaccounted for, your model of the system is wrong and every optimization planned from it is guesswork. The residual is the finding, not a rounding error."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "The single-machine version of the same discipline - timeline signatures, the roofline, and finding a stall. This lesson adds the absolute framing: MFU against a theoretical ceiling, and a budget that must account for all of the time."
        },
        {
          "ref": "training-systems/optimized-pipeline",
          "text": "Where the measurements become decisions. The capstone's first move is to establish which resource binds, because every technique in the module targets a different one and applying the wrong one gives nothing."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The six-times FLOP rule is the same accounting used to state compute budgets in the scaling literature, which is why MFU converts directly into a position on those curves and into a cost estimate."
        },
        {
          "ref": "training-systems/data-loading-scale",
          "text": "The most common finding a profile produces at scale, and the one that invalidates the rest of the module - an idle accelerator cannot be helped by making it faster."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "Where the communication term in the budget comes from, and why the scaling curve's shape - a cliff at the node boundary versus a gentle decline - identifies which collective is exposed."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is MFU?",
          "a": "Model FLOPs Utilization - the fraction of the hardware's theoretical peak arithmetic throughput that your model's required FLOPs actually achieve."
        },
        {
          "q": "Why is MFU better than a throughput number?",
          "a": "It is absolute. Throughput means nothing without a reference; MFU says how much of the machine you are using and therefore how much is left."
        },
        {
          "q": "What is the transformer FLOP rule?",
          "a": "About 6ND for training - two per parameter per token forward, four backward - plus a separate attention term that scales with sequence length."
        },
        {
          "q": "When does the six-times rule break down?",
          "a": "At long context, where the quadratic attention term dominates. It is a good approximation at 2k tokens and badly wrong at 32k."
        },
        {
          "q": "What MFU should you expect?",
          "a": "Roughly 30 to 50% is respectable for large transformer training, above 50% is very good, and below 20% indicates something structurally wrong rather than untuned."
        },
        {
          "q": "What is the difference between MFU and HFU?",
          "a": "Hardware FLOPs utilization counts recomputation from gradient checkpointing; model FLOPs utilization does not. The gap between them is exactly your recompute overhead."
        },
        {
          "q": "Which peak should you divide by?",
          "a": "The theoretical peak for the precision you are actually running. Comparing bf16 throughput against fp32 peak produces a meaningless number."
        },
        {
          "q": "What is a performance budget?",
          "a": "An accounting that attributes one hundred percent of step time - compute, communication, data, launch gaps, synchronization, recompute - starting from the theoretical floor."
        },
        {
          "q": "Why does the residual matter?",
          "a": "A large unexplained residual means your model of where the time goes is wrong, so every optimization planned from it is guesswork. It is the finding, not a rounding error."
        },
        {
          "q": "What does Amdahl's law say about optimization order?",
          "a": "Improving a component that is fraction p of the time caps your total gain at 1/(1-p). Work on an unmeasured component has an expected payoff near zero."
        },
        {
          "q": "Why is a single straggler so damaging?",
          "a": "Step time is bounded below by the slowest rank, because every rank waits at the collective. One bad node presents as a uniform global slowdown."
        },
        {
          "q": "What does a scaling curve tell you?",
          "a": "Flat per-device throughput means perfect scaling; a cliff at the node boundary points at the interconnect; a gentle decline points at growing communication overhead."
        }
      ],
      "standard": [
        {
          "q": "Explain MFU and how you would use it to decide what to optimize.",
          "a": "WHAT IT IS. Model FLOPs Utilization is the arithmetic your model logically requires, divided by the time taken and by the hardware's theoretical peak. For a transformer the numerator is about six times parameters times tokens - two FLOPs per parameter per token in the forward pass, four in the backward - plus a separate attention term scaling with sequence length. WHY IT IS THE RIGHT HEADLINE METRIC. It is ABSOLUTE. Tokens per second is meaningless without knowing the model and the hardware; MFU is a fraction, so it is comparable across models, precisions and cluster sizes, and it tells you how much headroom remains. If you are at 45%, the most a perfect optimization could buy is roughly a factor of two, which bounds every claim anyone makes about a proposed change. If you are at 12%, most of the machine is idle and the problem is structural rather than a matter of tuning. HOW I WOULD READ IT. Above 50% is very good and the remaining wins are algorithmic - better attention kernels, lower precision - rather than configuration. Thirty to fifty percent is respectable for large-scale training and incremental work pays. Twenty to thirty means something is leaking. Below twenty means look for an idle accelerator, a straggler, unoverlapped communication, or shapes that do not use tensor cores at all - and no amount of hyperparameter work will touch it. THE CONVENTIONS TO STATE, because they change the number. Use the peak for the PRECISION you are running. And distinguish MODEL from HARDWARE FLOPs utilization: HFU also counts recomputation from gradient checkpointing, so a checkpointed run reports a higher HFU, and the gap between the two is exactly what checkpointing is costing you - which is a useful number in itself. HOW I WOULD USE IT TO DECIDE. MFU tells you HOW MUCH is available; the profile tells you WHERE it went. So I would compute MFU first to size the opportunity, then build a PERFORMANCE BUDGET that accounts for one hundred percent of step time: matmul kernels, memory-bound kernels, exposed communication, data stalls, launch gaps, synchronization, recompute. Every millisecond gets a category. Then the optimization follows mechanically - large memory-bound fraction means fusion and compile; large exposed communication means overlap or a different sharding strategy; large data stalls mean the input pipeline and nothing else matters; large launch gaps mean CUDA graphs or a bigger batch. AND THE RESIDUAL IS THE MOST VALUABLE PART. If forty percent of step time is unexplained, my model of the system is wrong and everything I plan is guesswork. Chasing the residual until the budget balances is what makes the analysis terminate rather than continue indefinitely. THE ONE THING I WOULD ADD AT SCALE. Check per-rank step times, not the average. A single slow rank sets the pace for everyone because every rank waits at the collective, so it presents as a uniform global slowdown that no model or pipeline work will fix.",
          "deepDive": {
            "q": "Derive the 6ND rule and say precisely where it is inaccurate.",
            "a": "THE FORWARD PASS. Consider a weight matrix of shape (in, out) applied to one token. That is a matrix-vector product: in times out multiply-accumulate operations. A multiply-accumulate is conventionally counted as TWO FLOPs, one multiply and one add. So the cost is 2 times the number of parameters in that matrix, per token. Summing over all weight matrices, the forward pass costs about 2N FLOPs per token, where N is the parameter count. THE BACKWARD PASS. It computes two things: the gradient with respect to the layer's INPUT, which is needed to continue propagating, and the gradient with respect to the WEIGHTS. Each is a matrix product of the same shape as the forward, so each costs about 2N per token, giving 4N total. Hence 6N per token for a full training step, and 6ND for D tokens. That is the rule, and its derivation is short enough to reconstruct in an interview, which is worth being able to do. WHERE IT IS INACCURATE, in order of how much it matters. (1) ATTENTION IS NOT COUNTED. The query-key product and the attention-value product are not parameter multiplications - their cost scales with sequence length, not parameter count. The extra term goes like 12 times layers times model dimension times sequence length, per token, so it is QUADRATIC in sequence length overall. At 2k context on a large model it is a small percentage and ignorable. At 32k it can dominate. So the rule's accuracy is a function of your context length, and computing the crossover for your configuration takes five minutes and prevents a badly wrong budget. (2) IT COUNTS ONLY MATRIX MULTIPLICATIONS. Layer norms, activations, softmaxes, residual adds and dropout are all excluded. Their FLOP count is genuinely small - which is why the rule works - but their TIME is not, because they are memory-bound. This is the crucial subtlety: the rule is a good model of the ARITHMETIC and a poor model of the TIME, and the gap between them is precisely what MFU measures. A model spending half its time on elementwise operations has a low MFU even though its matmuls are running at peak. (3) EMBEDDINGS. The input embedding is a lookup, not a matmul, so it should not be counted; the output projection to vocabulary IS a matmul and should be. Whether N includes the embedding parameters changes the number, and different papers make different choices - which is a real source of confusion when comparing MFU figures across sources. (4) RECOMPUTATION. Gradient checkpointing performs extra forward passes, which are real FLOPs executed but not FLOPs the model requires. MFU excludes them by convention, HFU includes them - hence the two metrics. (5) MoE MODELS break the rule entirely, because only a fraction of parameters are active per token; you must count ACTIVE parameters, and this is a common error when comparing a mixture-of-experts model against a dense one. WHY THE RULE SURVIVES DESPITE ALL THAT. Because for a standard dense transformer at typical context lengths, matrix multiplications are the overwhelming majority of the arithmetic, and the corrections are small or accountable. It gives you a number good to within a few percent for the case it was designed for, which is exactly what a budget needs - and knowing the five cases above tells you when to stop trusting it."
          }
        },
        {
          "q": "Your job scales poorly from 8 to 64 GPUs. How do you find out why?",
          "a": "BUILD THE SCALING CURVE FIRST, because its SHAPE identifies the cause before any profiling. Run at 1, 2, 4, 8, 16, 32, 64 devices with the SAME per-device batch, and plot per-device throughput. Flat means perfect scaling. A GENTLE DECLINE points at communication overhead growing. A CLIFF AT THE NODE BOUNDARY - typically at 8 or 16 devices - points at the inter-node interconnect, since within a node you have fast links and between nodes you do not. NO SCALING AT ALL from one to two suggests something is serializing entirely. This takes twenty minutes and it bounds every subsequent claim. THEN SEPARATE THE FOUR CANDIDATES. (1) COMMUNICATION NOT OVERLAPPING. DDP launches a bucket's all-reduce as it fills during backward, so most communication should hide behind computation. Check the profiler timeline for NCCL kernels running concurrently with compute; visible gaps aligned with communication is the diagnosis. Common causes: gradient accumulation without no_sync, so you all-reduce every micro-step instead of once; find_unused_parameters delaying bucket readiness; or a model whose backward finishes too fast relative to the communication volume. (2) A STRAGGLER, which is the one people miss because utilization is an average. Log per-rank step times and look at the DISTRIBUTION - if one rank is consistently 20% slower, every rank waits at the collective and the whole job runs at that pace. Causes are mundane: a degraded disk, a thermally throttled device, a noisy co-tenant, an unbalanced data shard. Nothing about the model or the pipeline will fix it, and identifying it saves you from optimizing the wrong layer entirely. (3) THE INPUT PIPELINE NOT SCALING. Eight nodes hitting one shared filesystem mount is a different workload from one node, and it can hit a hard ceiling. The test is to run with SYNTHETIC data - a fixed tensor in a loop - and see whether scaling recovers. If it does, the pipeline is the constraint and this is a storage problem rather than a training one. (4) THE EFFECTIVE BATCH CHANGED. This is not a performance issue but it is the most common confusion: eight times the ranks is eight times the effective batch, which changes the optimization problem and requires a learning-rate adjustment. A run that appears to scale but converges worse is this, not a systems problem. THE MEASUREMENT DISCIPLINE. Use the same per-device batch across the sweep or you are measuring two things at once. Warm up and synchronize. And bypass the data loader with synthetic data for the pure scaling measurement, then re-introduce it - the difference between the two curves is the pipeline's contribution, isolated. WHAT I WOULD REPORT. Scaling efficiency at each size, the per-rank step-time distribution, and the fraction of step time that is exposed communication. Those three explain essentially every poor-scaling case, and only the first is usually collected."
        },
        {
          "q": "How do you build a performance budget, and what do you do with the residual?",
          "a": "THE STRUCTURE. Start from the theoretical floor - the FLOPs your model requires divided by the aggregate peak - and then attribute every millisecond of the gap between that and the measured step time. The categories are: matmul kernels, which is useful work; memory-bound kernels, which is real work running below peak; exposed communication, meaning collectives not hidden behind compute; data stalls, meaning the device idle waiting on input; launch gaps, meaning too many small kernels; synchronization, meaning host-device round trips from logging or tensor-valued control flow; and recompute, if checkpointing is on. The rule is that the categories must sum to the measured time. WHERE THE NUMBERS COME FROM. The profiler timeline gives kernel time by category and shows the gaps directly. Per-rank timing gives the straggler component. Running with synthetic data isolates the input contribution. Running single-device isolates the communication contribution. Each is a separate short experiment and together they populate the budget. WHAT THE BUDGET IS FOR. It converts optimization from a list of things one could try into a ranked list with expected values. If memory-bound kernels are 35% of step time, fusing them with torch.compile has a ceiling of 35% and a realistic gain of maybe half that. If exposed communication is 5%, perfecting the overlap is worth at most 5% and should not be the priority regardless of how interesting it is. That is Amdahl applied per category, and it stops the common pattern of optimizing whatever is most familiar. WHAT TO DO WITH THE RESIDUAL, which is the substance of the question. A residual is time you cannot explain, and it means your model of the system is WRONG. That matters more than its size, because every plan you make from an incorrect model is guesswork. So I would chase it rather than round it away. The usual culprits: kernels you did not attribute because they had unfamiliar names, often a fallback implementation running because a shape or dtype missed a fast path; memory allocation and caching-allocator behaviour, visible as gaps that do not correspond to any kernel; CPU-side overhead in the training loop itself, which is invisible on the device timeline and requires looking at the host row; and time inside collectives that is actually WAITING for a straggler rather than communicating, which is a common misattribution because it appears as NCCL kernel time. HOW I WOULD KNOW WHEN TO STOP. When the residual is small enough that it cannot change the ranking of the categories. If it is 3% you are done; if it is 40% you have not started. And I would state the residual explicitly in any performance report, because a budget that quietly omits it is claiming more understanding than it has. THE HABIT THIS BUILDS. Accounting for all of the time, rather than for the parts you can name, is what turns performance work from a sequence of experiments into an analysis with a conclusion.",
          "deepDive": {
            "q": "How would you turn MFU into a cost estimate and a capacity plan?",
            "a": "THE CHAIN OF ARITHMETIC, and each step is checkable. (1) TOTAL COMPUTE REQUIRED. From the FLOP model: about 6ND for a dense transformer, where N is parameters and D is total training tokens. Add the attention term if the context is long. For a 7B model on 1T tokens that is about 4.2e22 FLOPs. (2) EFFECTIVE THROUGHPUT. Aggregate peak times MFU. If a device gives about 1e15 bf16 FLOPs per second and you achieve 40% MFU on 64 devices, that is 2.56e16 effective FLOPs per second. (3) WALL-CLOCK. Divide: 4.2e22 over 2.56e16 is about 1.6e6 seconds, roughly 19 days. (4) COST. Multiply device-hours by the hourly rate. 64 devices for 19 days is about 29,000 device-hours; at a given rate that is a number you can put in a proposal and check against an invoice. WHAT THIS IS ACTUALLY FOR, beyond a number. It makes the MFU improvement CONCRETE. Going from 30% to 40% MFU on that job saves about six days and a quarter of the budget, which is a far more persuasive case for a week of performance work than 'the profile looks bad'. It also tells you whether a proposed configuration is feasible at all before you commission the cluster. THE PLANNING QUESTIONS IT ANSWERS. Given a deadline and a budget, what model size and token count are reachable - which is the same arithmetic solved for a different variable, and it connects directly to the compute-optimal scaling results, since those tell you how to SPLIT a fixed compute budget between parameters and tokens. Given a fixed cluster, how long. Given a fixed deadline, how many devices - remembering that scaling efficiency falls, so twice the devices is not half the time, and the scaling curve is what tells you the real factor. THE ADJUSTMENTS THAT MATTER IN PRACTICE. Add checkpoint overhead and evaluation time, which are real and are omitted from every naive estimate. Add an allowance for restarts - at scale, node failures are routine, and a plan with no failure budget is wrong. Distinguish MFU from HFU if you are checkpointing, since the extra recomputation is real wall-clock even though it is not useful FLOPs. And use the achieved MFU from a short pilot run rather than an aspirational one, because the difference between assumed and measured MFU is usually the largest error in the whole estimate. WHAT I WOULD PRESENT. The estimate, the MFU it assumes, the source of that MFU (measured on a pilot, or assumed from literature), and the sensitivity - how the answer moves if MFU is 30% instead of 40%. That last one is what makes it an engineering estimate rather than a number, and it also makes the case for the performance work self-evident."
          }
        },
        {
          "q": "What are the most common causes of low MFU, and how do you distinguish them?",
          "a": "SIX CAUSES, each with a distinguishing signature, and I would work through them in this order because it is roughly the order of frequency. (1) THE DEVICE IS IDLE - input-bound. Signature: low utilization, long empty stretches on the GPU timeline. Test: run with synthetic data; if MFU jumps, the pipeline is the constraint. This is the most common cause at scale and it is under-diagnosed because the DataLoader hides the pipeline so thoroughly. (2) A LARGE MEMORY-BOUND FRACTION. Signature: the device is busy, but the time is dominated by elementwise kernels, normalizations, activations - operations with low arithmetic intensity that run far below peak by construction. Test: split kernel time into matmul versus everything else; if the second exceeds the first, this is it. Fix: fusion via torch.compile, lower precision to halve the traffic, better attention kernels. (3) EXPOSED COMMUNICATION. Signature: NCCL kernels visible on the timeline with compute idle alongside. Test: compare single-device MFU against multi-device; the difference is the communication cost. Fix: overlap, bucketing, no_sync under accumulation, or a different sharding strategy. (4) LAUNCH-BOUND. Signature: a dense picket fence of very short kernels with gaps between them. Test: count kernels per step and compare their total duration against step time. Fix: CUDA graphs via reduce-overhead mode, a larger batch, or fusion. Most severe at small batch sizes. (5) SHAPES THAT MISS THE FAST PATH. Signature: MFU low even though the model is matmul-dominated and the device is busy. Cause: dimensions that are not multiples of 8 or 16 fall off tensor-core paths; an unusual dtype combination selects a generic kernel; a non-contiguous tensor forces a strided access or a copy. Test: look at kernel NAMES in the profile - a generic or fallback kernel where you expected a tensor-core one is an immediate finding. Fix: pad dimensions, check memory format. (6) A STRAGGLER, in distributed jobs. Signature: every rank shows low utilization while per-rank step times are skewed. Test: log per-rank times and compare max against median. Fix: find the bad node; nothing else helps. HOW I WOULD SEQUENCE THE INVESTIGATION. Utilization first, because it separates idle from busy in seconds. Then synthetic data, because it separates input-bound from everything else in ten minutes. Then single-device versus multi-device, which isolates communication. Then the kernel breakdown, which separates memory-bound from launch-bound from fast-path problems. Four experiments, each cheap, and together they identify all six. THE POINT I WOULD MAKE ABOUT ORDER. Each test eliminates a category rather than confirming one, which is what makes the sequence terminate. Starting with the profiler's operator table instead - which is where people usually start - gives you a ranking of kernels without telling you whether kernels are the problem at all."
        },
        {
          "q": "How does this lesson relate to the rest of the module?",
          "a": "IT IS THE INSTRUMENT THE MODULE DEPENDS ON, and stating that relationship precisely is the point. Every other technique here is an EXCHANGE - it buys one scarce resource by spending another - and the exchange rate is a property of your configuration rather than of the technique. Mixed precision buys memory and speed with numerical headroom, and buys nothing if you are input-bound. Compilation buys throughput with compile time, and buys nothing if you are matmul-dominated. Checkpointing buys memory with a third of your compute, and buys nothing if parameters rather than activations dominate. Accumulation buys effective batch with wall-clock, and buys nothing above the critical batch size. Sharding buys memory with communication, and hurts if you were already communication-bound. In every case the question is which resource currently binds, and that is a measurement. WHAT AMDAHL ADDS. It makes the argument quantitative rather than advisory. Optimizing a component that is 20% of your time caps your gain at 25% no matter how well you execute. So the ORDER of the work is fully determined by the profile, and the expected value of working without one is close to zero. That is a stronger claim than 'measure first' as a slogan, and it is why I would treat the profile as a prerequisite rather than a diagnostic. WHAT MFU ADDS ON TOP. It gives an ABSOLUTE reference. A profile tells you where the time went; MFU tells you how much time there was to save. At 45% MFU the total available improvement is bounded by roughly a factor of two, which caps every proposal anyone makes. At 12% the problem is structural and the module's techniques are mostly irrelevant until it is fixed. Knowing which regime you are in determines whether you are tuning or debugging. THE ORDERING CLAIM THIS ESTABLISHES, which the capstone then applies. If you are input-bound, nothing else in this module matters - mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more on it, and the accelerator is idle. So the very first question is whether the device is busy, and only after that does the rest of the module become relevant. That is not an ordering of convenience, it is a logical dependency. THE CONTRAST WITH MODULE 15, which sharpens both. There, the discipline was to build diagnostics because failures are SILENT - a wrong model still trains. Here, the discipline is to measure because benefits are INVISIBLE - a technique that bought nothing looks exactly like one that bought a lot until you measure. Both demand instruments, for opposite reasons: there because the failure hides, here because the gain does."
        },
        {
          "q": "What would you monitor continuously on a long training run, as opposed to profiling once?",
          "a": "THE DISTINCTION MATTERS: profiling is an investigation you run deliberately, monitoring is what tells you an investigation is needed. They collect different things. THE CONTINUOUS SET, all cheap enough for every step or every few steps. (1) MFU, computed from step time and the known FLOP count. One line, and it is the single number that says whether the job is healthy in performance terms. A drop in MFU is the alert that starts everything else. (2) STEP TIME, and separately DATA TIME and COMPUTE TIME, so a pipeline regression is distinguishable from a compute regression without profiling. (3) PER-RANK STEP TIME, or at minimum the max-to-median ratio, because a straggler appearing mid-run - a node degrading, a disk failing - is common on long jobs and presents as a global slowdown. (4) TOKENS PER SECOND, which is what the budget and the deadline are actually denominated in. (5) PEAK MEMORY, with an alert on the trend, because a slow leak found on day one is a five-minute fix and the same leak found when a two-week run dies at hour 300 has cost the run. (6) GPU UTILIZATION, as a coarse cross-check on the rest. THE STABILITY METRICS ALONGSIDE, since they share the same dashboard: gradient norm, clip fraction, loss scale, skip count. Those are leading indicators of a different kind of failure and they cost nothing. WHAT I WOULD ALERT ON rather than merely plot. MFU dropping more than some percentage below its recent median, which catches a straggler, a storage degradation, or a thermal problem. The max-to-median rank ratio exceeding a threshold. Peak memory trending upward. And the job producing no steps for some interval, which catches a hang - and a hang is the characteristic distributed failure, so it needs an explicit detector rather than being noticed by a human. WHAT I WOULD NOT COLLECT CONTINUOUSLY. Full profiler traces, which are expensive and enormous - instead I would capture a short trace on a schedule, say a few steps every hour, so there is a recent one available when something changes and I do not have to reproduce the condition. Per-layer statistics, likewise on a cadence rather than every step. THE IMPLEMENTATION CONSTRAINT that decides whether this is practical. Every .item() is a device-to-host synchronization that drains the pipeline, so naively logging ten scalars per step measurably slows training - which is a genuinely absurd outcome for a monitoring system. Accumulate on the device and transfer once per interval. THE PRINCIPLE. Profiling answers where the time goes; monitoring answers whether that changed. On a long run the second question is the one you cannot afford to answer only retrospectively, because by then the run is over and the conditions are gone."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "MFU",
        "back": "MFU = (6ND / t_step) / (n_dev * peak_flops). ABSOLUTE, unlike throughput - it says how much of the machine you use and therefore how much is LEFT. Use the peak for the PRECISION you are running."
      },
      {
        "type": "formula",
        "front": "The 6ND rule, derived",
        "back": "Forward: 2 FLOPs per parameter per token (one multiply-accumulate). Backward: 4N - it computes gradients w.r.t. INPUTS and w.r.t. WEIGHTS, each a same-shaped matmul. Total 6N per token. Plus a separate O(S^2) attention term."
      },
      {
        "type": "intuition",
        "front": "How to read an MFU number",
        "back": ">50% excellent (remaining wins are algorithmic). 30-50% respectable for large training. 20-30% something is leaking. <20% STRUCTURALLY wrong - idle GPU, straggler, unoverlapped comms, or shapes missing tensor cores. Not a tuning problem."
      },
      {
        "type": "definition",
        "front": "MFU vs HFU",
        "back": "MODEL FLOPs util counts only arithmetic the model REQUIRES. HARDWARE FLOPs util also counts RECOMPUTATION. So a checkpointed run has higher HFU, and the GAP between them is exactly your recompute overhead. Always state which you mean."
      },
      {
        "type": "pitfall",
        "front": "The 6ND rule breaks at long context",
        "back": "The attention term scales with SEQUENCE LENGTH, not parameters - negligible at 2k, dominant at 32k. Also excluded: layer norms, activations, softmax - small in FLOPs, large in TIME because they are memory-bound. The rule models ARITHMETIC, not time."
      },
      {
        "type": "intuition",
        "front": "The performance budget must sum to 100%",
        "back": "matmul + memory-bound + exposed comms + data stalls + launch gaps + synchronization + recompute = measured step time. THE RESIDUAL IS THE FINDING: 40% unexplained means your model of the system is wrong and every plan from it is guesswork."
      },
      {
        "type": "formula",
        "front": "Amdahl, applied per category",
        "back": "Improving a component that is fraction p of time caps the total gain at 1/(1-p). So a budget converts 'things to try' into a RANKED list with expected values - and stops the pattern of optimizing whatever is most familiar."
      },
      {
        "type": "pitfall",
        "front": "A single straggler sets the pace for everyone",
        "back": "T_N >= max_i(t_i) + exposed comms. Every rank waits at the collective, so ONE bad disk or throttled device presents as a UNIFORM global slowdown. Utilization is an AVERAGE - log per-rank step times and compare max to median."
      },
      {
        "type": "intuition",
        "front": "The scaling curve's SHAPE names the cause",
        "back": "FLAT = perfect. GENTLE DECLINE = growing communication overhead. CLIFF at the node boundary = the inter-node interconnect. NO scaling from 1->2 = something serializes. Same per-device batch throughout, or you measure two things at once."
      },
      {
        "type": "intuition",
        "front": "Four experiments identify every low-MFU cause",
        "back": "(1) utilization -> idle vs busy. (2) SYNTHETIC data -> input-bound vs not. (3) single vs multi device -> communication cost. (4) kernel breakdown + NAMES -> memory-bound vs launch-bound vs missed fast path. Each ELIMINATES a category."
      },
      {
        "type": "formula",
        "front": "MFU to a cost estimate",
        "back": "FLOPs = 6ND; effective rate = n_dev * peak * MFU; wall-clock = FLOPs/rate; cost = device-hours x rate. 30% -> 40% MFU on a 19-day job saves ~6 days and a quarter of the budget - a far better case for a week of perf work than 'the profile looks bad'."
      },
      {
        "type": "intuition",
        "front": "Profiling vs monitoring",
        "back": "Profiling answers WHERE the time goes; monitoring answers whether that CHANGED. Monitor MFU, step/data/compute time, per-rank max-to-median, peak memory trend, and alert on no-steps-for-N-minutes - because a HANG is the characteristic distributed failure."
      }
    ],
    "refs": [
      {
        "title": "Chowdhery et al. (2022), PaLM: Scaling Language Modeling with Pathways (MFU)",
        "url": "https://arxiv.org/abs/2204.02311"
      },
      {
        "title": "Kaplan et al. (2020), Scaling Laws for Neural Language Models (the 6ND accounting)",
        "url": "https://arxiv.org/abs/2001.08361"
      },
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      },
      {
        "title": "PyTorch: Holistic Trace Analysis for distributed training",
        "url": "https://pytorch.org/blog/trace-analysis-for-masses/"
      }
    ],
    "demos": [
      "batching",
      "scaling-laws",
      "autoscaling",
      "mixed-precision"
    ]
  },
  "fsdp": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Data parallelism replicates the model on every device, so per-device memory is sixteen bytes per parameter regardless of how many devices you add. That is the number to hold: under mixed-precision Adam it is 2 for the fp16 weights, 2 for the fp16 gradients, 4 for the fp32 master copy, and 8 for Adam's two moments. Adding accelerators buys you throughput and never buys you capacity. A 7.5B model needs about 120 GB per device under DDP, which fits nothing - so at some scale replication stops being an option and the state has to be divided.",
        "ZeRO divides it in stages, and the stages are choices about where to stop in the identity that all-reduce equals reduce-scatter followed by all-gather. Stage 1 shards the OPTIMIZER STATE, leaving 4P plus 12P over N. Stage 2 additionally shards the GRADIENTS, replacing the all-reduce with a reduce-scatter and leaving 2P plus 14P over N. Stage 3 - which is what FSDP implements - shards the PARAMETERS too, giving 16P over N: memory genuinely divided by the device count, so a model larger than any single device becomes trainable. The price is communication: stages 1 and 2 keep DDP's traffic of roughly 2D, while stage 3 adds parameter all-gathers in both forward and backward, taking it to about 3D or 1.5 times DDP.",
        "The reassuring fact, and the one worth verifying yourself, is that sharding is MATHEMATICALLY NEUTRAL. Reconstructing the parameters by all-gather gives bit-identical forward outputs. A sharded Adam step equals an unsharded one exactly - and the reason is that Adam is ELEMENTWISE, so each parameter's update uses only its own gradient and its own two moments, which is precisely why you can split them across devices and nothing is lost. Run twenty-five steps sharded and unsharded from the same seed and the weights match bit for bit. So the entire question is systems engineering: what does the communication cost, does it overlap, and how do you place it on the hardware."
      ],
      "math": [
        {
          "h": "Per-device memory by ZeRO stage",
          "paras": [
            "Sixteen bytes per parameter under mixed-precision Adam, allocated to four things. Each stage moves one more of them from replicated to sharded.",
            "Only stage 3 makes per-device memory fall with the device count for ALL terms, which is what makes an otherwise-unfittable model trainable."
          ],
          "tex": "\\begin{aligned} \\text{DDP} &: 16P \\;\\text{(flat in } N\\text{)} \\\\ \\text{ZeRO-1} &: 4P + 12P/N \\\\ \\text{ZeRO-2} &: 2P + 14P/N \\\\ \\text{ZeRO-3 / FSDP} &: 16P/N \\end{aligned}",
          "texNote": "Put a number in: a 7.5B model is about 120 GB per device under DDP, which fits nothing you are likely to have; ZeRO-3 crosses an 80 GB budget at a modest device count. Note that ZeRO-1 alone removes three quarters of the memory and costs essentially no extra communication - which makes it the most under-used option in this list, because people jump to full sharding when the optimizer state was the whole problem."
        },
        {
          "h": "What each stage costs in communication",
          "paras": [
            "DDP performs one all-reduce of the gradients per step, about 2D bytes per rank with a ring algorithm. Stage 2 replaces it with a reduce-scatter, which is half of that. Stage 3 adds parameter all-gathers in forward and backward.",
            "So the memory reduction of stage 3 is paid for in traffic, and whether that matters depends entirely on whether the communication overlaps with computation."
          ],
          "tex": "\\text{DDP, ZeRO-1} \\approx 2D, \\qquad \\text{ZeRO-2} \\approx 2D, \\qquad \\text{ZeRO-3} \\approx 3D \\;\\; (1.5\\times)",
          "texNote": "The 1.5x is the standard ZeRO-paper accounting and it is an upper bound on the wall-clock cost rather than a prediction of it, because the all-gathers can be PREFETCHED - gathering layer i+1's parameters while layer i computes. A well-configured FSDP run hides most of that traffic; a badly-wrapped one exposes it, and the difference between those two is usually larger than the difference between stages."
        },
        {
          "h": "The pipeline bubble, and why micro-batches exist",
          "paras": [
            "Pipeline parallelism splits layers across devices, so a single batch leaves most stages idle while it traverses the pipe. Splitting the batch into micro-batches fills it.",
            "The bubble fraction falls as the number of micro-batches grows relative to the number of stages, which is why pipeline parallelism needs a large batch to be efficient at all."
          ],
          "tex": "\\text{bubble fraction} = \\frac{p - 1}{m + p - 1} \\qquad (p \\text{ stages}, \\; m \\text{ micro-batches})",
          "texNote": "With 4 stages and 4 micro-batches, 43% of the time is bubble - unusable. With 4 stages and 32 micro-batches it is under 9%. That is why pipeline parallelism is only viable at large batch, and why interleaved and one-forward-one-backward schedules exist to shrink it further. It is also the reason pipeline parallelism is the LAST axis people add rather than the first."
        }
      ],
      "code": [
        {
          "h": "Verify that sharding is exact, then configure it",
          "paras": [
            "Three checks worth running once, because they convert sharding from something you trust into something you have confirmed - and the middle one explains why it works at all."
          ],
          "code": "# PROOF 1: reconstructing parameters gives an IDENTICAL forward.\nfull = torch.cat([shard_i for shard_i in all_gather(param_shards)])\nassert (model_full(x) - model_from(full)(x)).abs().max() == 0\n\n# PROOF 2: a SHARDED Adam step equals an unsharded one - exactly.\n#   WHY: Adam is ELEMENTWISE. Each parameter's update uses only its OWN\n#   gradient and its OWN m and v. There is no cross-parameter term, so\n#   splitting the state across devices loses nothing. That single property is\n#   what makes optimizer-state sharding exact rather than approximate.\nassert (adam_sharded(p, g) - adam_full(p, g)).abs().max() == 0\n\n# PROOF 3: 25 steps sharded == 25 steps unsharded, bit for bit, same seed.\nassert (w_sharded - w_full).abs().max() == 0\n#   Sharding is a SYSTEMS change, not a numerical one. Everything that remains\n#   is about communication cost and placement.\n\n# ---- CONFIGURING FSDP ----\nmodel = FSDP(\n    model,\n    auto_wrap_policy=transformer_auto_wrap_policy(     # WRAP PER BLOCK.\n        transformer_layer_cls={TransformerBlock}),      # Too COARSE: huge\n                                                        # all-gathers, poor\n                                                        # overlap, high peak.\n                                                        # Too FINE: many small\n                                                        # collectives, latency-\n                                                        # bound. Per block is\n                                                        # the usual right answer.\n    sharding_strategy=ShardingStrategy.FULL_SHARD,      # = ZeRO-3\n    #                 SHARD_GRAD_OP  = ZeRO-2 (less comm, more memory)\n    #                 HYBRID_SHARD   = shard WITHIN a node, replicate ACROSS -\n    #                                  the right default on multi-node clusters\n    mixed_precision=MixedPrecision(param_dtype=torch.bfloat16,\n                                   reduce_dtype=torch.float32),  # reduce in\n                                                        # fp32 for stability,\n                                                        # compute in bf16\n    backward_prefetch=BackwardPrefetch.BACKWARD_PRE,    # gather layer i-1's\n                                                        # params while layer i's\n                                                        # backward runs - this is\n                                                        # what hides the 1.5x\n    limit_all_gathers=True,\n)\n# PEAK PARAMETER MEMORY under just-in-time gather-then-free is\n#   P/N (your shard)  +  the LARGEST SINGLE unit you gather\n# which is why wrapping granularity sets the peak, not just the throughput.",
          "caption": "Adam being elementwise is why optimizer-state sharding is exact - each parameter's update touches only its own moments, so splitting them loses nothing. And peak parameter memory is your shard plus the largest unit you gather, which makes wrapping granularity a memory decision as well as a throughput one."
        },
        {
          "h": "The other axes, and where each belongs on the hardware",
          "paras": [
            "Sharding is one of four ways to split a model. The placement rule matters more than the individual techniques, because each axis has a different communication pattern and the interconnect is hierarchical."
          ],
          "code": "# THE FOUR AXES:\n#\n#  DATA parallel      replicate the model, split the BATCH.\n#                     Comm: one gradient all-reduce per step (~2D).\n#                     Memory: FLAT in N. Use whenever the model fits.\n#\n#  SHARDED data (ZeRO/FSDP)  split the STATE, still split the batch.\n#                     Comm: +param all-gathers in fwd and bwd (~1.5x DDP).\n#                     Memory: 16P/N. Use when the model does not fit.\n#\n#  TENSOR parallel    split each MATMUL across devices (column/row split).\n#                     Comm: an all-reduce INSIDE every layer, twice per block.\n#                     Very high frequency -> needs NVLink-class bandwidth.\n#\n#  PIPELINE parallel  split LAYERS across devices, micro-batch to fill.\n#                     Comm: point-to-point activations between stages only -\n#                     the LOWEST volume of any axis.\n#                     Cost: the bubble, (p-1)/(m+p-1).\n#\n# THE PLACEMENT RULE, which follows from the comm patterns and the hierarchy:\n#   TENSOR parallel   WITHIN a node   (highest frequency -> fastest links)\n#   PIPELINE parallel ACROSS nodes    (lowest volume -> tolerates slow links)\n#   DATA parallel     OUTERMOST       (one collective per step)\n# Getting this backwards - tensor parallel across nodes - is the classic way\n# to build a cluster job that runs at a fraction of its potential.\n\n# THE SELECTION LADDER:\n#   fits comfortably              -> DDP. Simplest and fastest. Always first.\n#   optimizer state is the issue  -> ZeRO-1 or -2. Removes 3/4 of the memory at\n#                                    ~DDP communication. MOST UNDER-USED OPTION.\n#   model does not fit            -> FSDP / ZeRO-3.\n#   still does not fit            -> + tensor parallel within the node.\n#   still does not fit            -> + pipeline across nodes (needs big batch).\n#   long sequences dominate       -> + sequence/context parallelism.\n# Each step adds real complexity. Stop at the first one that works.",
          "caption": "The placement rule is the part that decides cluster performance: tensor parallelism communicates twice per block and must live on the fastest links, pipeline parallelism sends only activations between stages and tolerates slow ones. Reversing them is the classic expensive mistake."
        }
      ],
      "useCases": [
        "Training a model too large for one device, which is FSDP's defining purpose - stage 3 is the only configuration whose per-device memory falls with the device count for every term.",
        "Relieving optimizer-state pressure without full sharding, using ZeRO stage 1 or 2 - which removes three quarters of the memory at essentially DDP-level communication and is the most under-used option in the list.",
        "Multi-node clusters with a bandwidth hierarchy, where hybrid sharding - shard within a node, replicate across nodes - keeps the frequent parameter traffic on the fast intra-node links and reduces the inter-node collective to one all-reduce.",
        "Frontier-scale pretraining, where no single axis suffices and three-dimensional parallelism combines tensor parallelism inside a node, pipeline across nodes, and data parallelism outermost."
      ],
      "pitfalls": [
        "Reaching for FSDP when the model fits. DDP is simpler, faster and has fewer failure modes, and full sharding costs about 1.5 times the communication for capacity you did not need. Compute the memory budget before choosing a strategy.",
        "Skipping ZeRO stages 1 and 2. If the optimizer state is what does not fit, stage 1 removes three quarters of the memory at essentially unchanged communication - a much better trade than full sharding, and it is routinely overlooked.",
        "Wrapping at the wrong granularity. Too coarse means huge all-gathers, a high peak from the largest unit, and little room to overlap; too fine means many small collectives that are latency-bound. Per transformer block is the usual right answer.",
        "Not enabling prefetching. The 1.5x communication figure is an upper bound that assumes nothing overlaps; gathering the next unit's parameters while the current one computes is what hides most of it, and a run without it is far slower than the accounting suggests.",
        "Using full sharding across nodes when hybrid would do. Parameter all-gathers happen per layer per step, so putting them on a slow inter-node link is the most expensive placement available. Shard within the node and replicate across.",
        "Placing tensor parallelism across node boundaries. It performs an all-reduce inside every layer, twice per transformer block, so it needs the fastest interconnect available. This single placement error can cost most of a cluster's throughput.",
        "Using pipeline parallelism at small batch. The bubble fraction is (p-1)/(m+p-1), so with four stages and four micro-batches you waste 43% of the time. It needs many micro-batches, which means a large batch, which is a precondition rather than a tuning detail."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Where the collectives come from, and the identity that organizes the stages: all-reduce equals reduce-scatter followed by all-gather, so ZeRO's stages are choices about where to stop between the two halves."
        },
        {
          "ref": "training-systems/ddp",
          "text": "The baseline this departs from, and the right answer whenever the model fits. Its per-device memory is flat in the device count, which is exactly the property sharding exists to break."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The complementary technique attacking a disjoint term. Sharding divides the parameter, gradient and optimizer terms; checkpointing reduces the activation term on each device. Large-scale training uses both, and their wrapping boundaries interact."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Expert parallelism as a fifth axis, with an all-to-all communication pattern that is more demanding than any of these - all-pairs, data-dependent in size, and hard to overlap because it sits mid-forward."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How you tell whether the communication is actually overlapping. The 1.5x figure is accounting; the exposed fraction is a measurement, and the gap between them is the whole difference between a good and a bad FSDP configuration."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does DDP not help you fit a larger model?",
          "a": "It replicates the model on every device, so per-device memory is sixteen bytes per parameter regardless of device count. Adding accelerators buys throughput, never capacity."
        },
        {
          "q": "Where do the sixteen bytes go?",
          "a": "Two for fp16 weights, two for fp16 gradients, four for the fp32 master copy, and eight for Adam's two moments - under mixed-precision Adam."
        },
        {
          "q": "What does each ZeRO stage shard?",
          "a": "Stage 1 the optimizer state (4P + 12P/N), stage 2 also the gradients (2P + 14P/N), stage 3 also the parameters (16P/N)."
        },
        {
          "q": "What does each stage cost in communication?",
          "a": "Stages 1 and 2 keep DDP's roughly 2D; stage 3 adds parameter all-gathers in forward and backward, taking it to about 3D or 1.5 times DDP."
        },
        {
          "q": "Why is sharding the optimizer state exact?",
          "a": "Adam is elementwise - each parameter's update uses only its own gradient and its own two moments - so splitting the state across devices loses nothing."
        },
        {
          "q": "What is peak parameter memory under FSDP?",
          "a": "Your shard, P/N, plus the largest single unit you gather just in time. That is why wrapping granularity is a memory decision, not only a throughput one."
        },
        {
          "q": "What is the right FSDP wrapping granularity?",
          "a": "Usually per transformer block. Too coarse gives huge all-gathers and a high peak; too fine gives many small latency-bound collectives."
        },
        {
          "q": "What does prefetching do?",
          "a": "Gathers the next unit's parameters while the current one computes, hiding most of the extra communication. Without it the 1.5x figure is realized rather than avoided."
        },
        {
          "q": "What is hybrid sharding?",
          "a": "Shard within a node and replicate across nodes, keeping the frequent parameter traffic on fast intra-node links and reducing inter-node traffic to one all-reduce."
        },
        {
          "q": "Where should tensor parallelism live?",
          "a": "Within a node. It performs an all-reduce inside every layer, twice per transformer block, so it needs the highest-bandwidth interconnect available."
        },
        {
          "q": "What is the pipeline bubble fraction?",
          "a": "(p-1)/(m+p-1) for p stages and m micro-batches. Four stages with four micro-batches wastes 43% of the time; with 32 it is under 9%."
        },
        {
          "q": "Which parallelism axis has the lowest communication volume?",
          "a": "Pipeline - it sends only activations point-to-point between adjacent stages, which is why it belongs on the slowest links."
        }
      ],
      "standard": [
        {
          "q": "Explain the ZeRO stages and how you would choose between them.",
          "a": "THE STARTING POINT. Under mixed-precision Adam, per-device memory is sixteen bytes per parameter: two for fp16 weights, two for fp16 gradients, four for the fp32 master copy, eight for Adam's two moments. In DDP all of that is REPLICATED on every device, so the per-device figure is FLAT in the device count - adding accelerators buys throughput and never buys capacity. A 7.5B model needs about 120 GB per device, which fits nothing. THE STAGES, each moving one more term from replicated to sharded. ZeRO-1 shards the OPTIMIZER STATE: the fp32 master copy and the two moments, which is twelve of the sixteen bytes. Memory becomes 4P plus 12P over N. Gradients are still all-reduced as in DDP, each rank updates only its slice of parameters, and the updated parameters are all-gathered. Communication is essentially unchanged. ZeRO-2 additionally shards the GRADIENTS. Instead of an all-reduce you use a REDUCE-SCATTER, so each rank receives only the summed gradient slice it needs - which is the first half of the identity that all-reduce equals reduce-scatter followed by all-gather, and it costs about half an all-reduce. Memory becomes 2P plus 14P over N. ZeRO-3, which is what FSDP implements, shards the PARAMETERS too. Now a layer's weights are not resident, so you must ALL-GATHER them just in time before its forward, use them, and free them - and again in backward. Memory becomes 16P over N: genuinely divided by the device count, which is what makes an otherwise-unfittable model trainable. Communication rises to about 3D, or 1.5 times DDP. HOW I WOULD CHOOSE - and the ladder matters because each step adds real complexity. Compute the budget first. If the model FITS comfortably under DDP, use DDP: simplest, fastest, fewest failure modes. If the OPTIMIZER STATE is what does not fit - which is common, since it is twelve of the sixteen bytes - use ZeRO-1 or 2, which removes three quarters of the memory at essentially DDP communication. This is the most under-used option in the list; people jump to full sharding when a stage that costs nothing would have done. If the MODEL ITSELF does not fit, ZeRO-3 or FSDP. If that is still not enough, add tensor parallelism within the node, then pipeline across nodes. Stop at the first that works. THE REASSURING PART, worth verifying once. Sharding is MATHEMATICALLY NEUTRAL. Reconstructing parameters by all-gather gives bit-identical forward outputs; a sharded Adam step equals an unsharded one exactly; twenty-five steps sharded from the same seed match unsharded bit for bit. The reason the optimizer sharding is exact is that ADAM IS ELEMENTWISE - each parameter's update uses only its own gradient and its own two moments, with no cross-parameter term. So there is nothing to lose by splitting them. Everything that remains is systems engineering: does the communication overlap, and where does it sit on the hardware.",
          "deepDive": {
            "q": "Walk through what happens in an FSDP forward and backward pass, and what determines whether it is fast.",
            "a": "THE FORWARD, per FSDP unit - typically a transformer block. (1) ALL-GATHER the unit's parameters from all ranks, reconstructing the full weights in a temporary buffer. (2) Run the unit's forward computation with those full weights. (3) FREE the gathered buffer immediately, keeping only your own shard. (4) Move to the next unit and repeat. So at any moment you hold your P/N shard of everything plus the full parameters of ONE unit - which is why peak parameter memory is P/N plus the largest single unit, and why wrapping granularity is a memory decision rather than only a throughput one. THE BACKWARD, per unit in reverse. (1) ALL-GATHER the unit's parameters again, because you freed them - this is the second of the two extra all-gathers that take communication from 2D to 3D. (2) Compute gradients. (3) REDUCE-SCATTER the gradients so each rank keeps only its slice, which is what makes gradient memory P/N. (4) Free the gathered parameters and the full gradients. WHAT DETERMINES SPEED - and this is where a good and a bad configuration differ by more than the choice of stage. (1) PREFETCHING. If unit i+1's all-gather is issued while unit i is still computing, the communication hides behind computation and the 1.5x is largely notional. If it is issued when unit i+1 is needed, every unit stalls on its gather and you realize the full cost. Forward prefetch and backward prefetch are separate settings and both matter; backward prefetch is the one more often left off. (2) WRAPPING GRANULARITY, which controls both the gather size and the overlap opportunity. Too COARSE - wrapping the whole model as one unit - means one enormous all-gather with nothing to overlap it against, and a peak equal to the full parameter set, which defeats the purpose. Too FINE - wrapping every linear layer - means many small collectives, each paying fixed latency, and the aggregate latency dominates. Per transformer block is the usual answer because it gives collectives large enough to be bandwidth-efficient and numerous enough to pipeline. (3) THE INTERCONNECT. Parameter all-gathers happen per unit per step in both directions, so their frequency is high. On NVLink within a node that is cheap; across a slower inter-node fabric it is not, which is the entire argument for HYBRID sharding - shard within the node where bandwidth is plentiful, replicate across nodes so the inter-node traffic is one all-reduce per step rather than many all-gathers. (4) THE INTERACTION WITH ACTIVATION CHECKPOINTING. If a checkpointed region spans several FSDP units, the recomputation during backward triggers those units' all-gathers AGAIN - so the recompute costs communication as well as compute, which is a real and surprising interaction. Aligning checkpoint boundaries with FSDP unit boundaries avoids it. HOW I WOULD DIAGNOSE A SLOW FSDP RUN. Profile and look at whether the all-gather kernels overlap with compute on the timeline. If there are visible gaps aligned with collectives, prefetching is not working - check the prefetch settings and the wrapping. If the collectives themselves are slow, check the interconnect and consider hybrid sharding. And compare against a DDP run at a batch size that fits, because if FSDP is much slower than DDP and the model would have fitted, the answer is to use DDP."
          }
        },
        {
          "q": "Compare data, tensor, pipeline and sharded parallelism. When would you combine them?",
          "a": "FOUR AXES, distinguished by WHAT they split and therefore by their communication pattern. DATA PARALLEL splits the BATCH and replicates the model. One gradient all-reduce per step, about 2D bytes per rank. Per-device memory is flat in N, so it never helps you fit a model. It is the simplest and it is right whenever the model fits. SHARDED DATA PARALLEL - ZeRO and FSDP - also splits the STATE. Adds parameter all-gathers in forward and backward, taking communication to about 1.5 times DDP, and makes memory 16P over N. Right when the model does not fit but a single layer does. TENSOR PARALLEL splits each MATMUL across devices - a column split on one weight matrix and a row split on the next, so the pair needs only one all-reduce between them. That is an all-reduce INSIDE every layer, twice per transformer block, at very high frequency. It divides both parameters and ACTIVATIONS, which is its distinctive advantage. Its cost is that the communication is on the critical path of every layer, so it demands NVLink-class bandwidth. PIPELINE PARALLEL splits LAYERS across devices, with only activations sent point-to-point between adjacent stages. That is the LOWEST communication volume of any axis by a wide margin, and its cost is different in kind: the BUBBLE, since a stage is idle while it waits for work, at fraction (p-1)/(m+p-1). Splitting the batch into many micro-batches shrinks it, which is why pipeline parallelism requires a large batch to be efficient at all. THE PLACEMENT RULE, which follows directly and which matters more than any individual choice. Communication frequency and volume determine which link each axis belongs on. TENSOR PARALLEL WITHIN A NODE, because it communicates twice per block on the critical path and must have the fastest links. PIPELINE PARALLEL ACROSS NODES, because it sends only activations at stage boundaries and tolerates slower links. DATA OR SHARDED-DATA PARALLEL OUTERMOST, since it is one collective per step. Getting this backwards - tensor parallelism across node boundaries - is the classic way to build a cluster job that runs at a fraction of its potential, and it is a placement error rather than a code error. WHEN TO COMBINE. Only when a single axis is insufficient, because each adds real complexity. The frontier-scale recipe is three-dimensional: tensor parallel inside a node to fit the layers and divide activations, pipeline across nodes to fit the depth, data parallel outermost to use the remaining devices - and sequence or context parallelism as a fourth axis when long sequences make activations dominant. THE SELECTION DISCIPLINE I would state. Compute the memory budget, choose the cheapest axis that makes it fit, and stop. Every additional axis costs configuration complexity, more failure modes, and a harder debugging story - and the most common mistake is adding parallelism because the model is large rather than because the arithmetic said it was necessary."
        },
        {
          "q": "How would you verify a sharded training setup is correct?",
          "a": "SHARDING IS SUPPOSED TO BE MATHEMATICALLY NEUTRAL, which gives you an unusually strong test: the sharded run should match the unsharded one, and any deviation is a bug rather than an approximation. THE THREE EXACTNESS CHECKS, run once on a small model. (1) PARAMETER RECONSTRUCTION. All-gather the shards and compare the forward output against the unsharded model on the same input. Difference should be exactly zero. This checks the gather logic and the shard boundaries. (2) THE OPTIMIZER STEP. Apply one Adam step sharded and unsharded from the same gradients and compare. Exactly zero, and the reason it must be is that ADAM IS ELEMENTWISE - each parameter's update touches only its own gradient and its own two moments. If this test fails, either the sharding is wrong or you are using an optimizer with cross-parameter coupling, and knowing which is the whole diagnosis. (3) A MULTI-STEP RUN. Twenty-five steps, same seed, same data order, sharded versus unsharded, comparing weights bit for bit. This catches errors in the gradient reduce-scatter, in the state's shard alignment across steps, and in anything that accumulates. THE STARTUP ASSERTIONS I would add permanently, because they catch the distributed failures that are otherwise silent. All-reduce a hash of the parameters at initialization and assert every rank agrees - if replicas start different they optimize different models while averaging gradients, which trains and converges worse with no error. Assert the data-shard counts are identical across ranks with a min and max all-reduce, because unequal counts HANG rather than error. And assert each rank is on a distinct device. THE CHECKPOINT ROUND TRIP, which is the FSDP-specific one people get wrong. FSDP offers different state_dict types - a FULL state dict gathered on rank zero, and a SHARDED one written per rank. Save and reload with each and assert identical outputs on a fixed input. The full form is convenient and can exhaust rank zero's memory for a large model; the sharded form scales but ties the checkpoint to the world size unless you use a resharding-capable format. Getting this wrong means discovering at resume time that your checkpoint cannot be loaded on a different number of devices, which is an expensive discovery. THE THING TO WATCH THAT IS NOT A CORRECTNESS BUG. Bitwise equality across DIFFERENT world sizes is not achievable, because the reduction order within a collective changes and floating-point addition is not associative. So the multi-step test compares sharded against unsharded at the SAME effective configuration; across configurations, compare to a tolerance and compare the loss trajectory rather than the bits. WHY THIS IS WORTH THE HOUR. Sharding bugs are silent - a misaligned shard boundary or a wrong reduction gives you a model that trains, converges worse, and never errors. And the exactness property means you have a much sharper test available here than for most systems changes, so not using it is leaving the strongest available verification on the table.",
          "deepDive": {
            "q": "FSDP offers full and sharded state dicts. What are the trade-offs, and what breaks?",
            "a": "THE TWO FORMS. A FULL state dict all-gathers every parameter and materializes the complete model on rank zero - the same format an unsharded model produces, loadable anywhere. A SHARDED state dict has each rank write its own shard, so no rank ever holds the whole model. WHAT BREAKS WITH FULL. MEMORY. Rank zero must hold the entire model in one place, which for a model that needed sharding to train is precisely the thing that does not fit. Options are CPU offloading during the gather, which works and is slow, or accepting that you cannot save this way at all above some size. It also SERIALIZES: every rank participates in the gather and then waits while rank zero writes, so checkpointing time grows and the whole job stalls. On a large model that can be minutes per checkpoint, which interacts badly with wanting frequent checkpoints for stability. WHAT BREAKS WITH SHARDED. PORTABILITY. A naive sharded checkpoint records rank i's slice, so reloading requires the same world size and the same sharding layout. Change the number of devices - which happens constantly, for a restart on different hardware, for a scaling experiment, or for fine-tuning a model that was pretrained at a different scale - and the checkpoint cannot be loaded. That is the failure that costs the most, because it is discovered at the worst moment. THE RESOLUTION, which is what modern tooling provides: a DISTRIBUTED CHECKPOINT format that stores logical tensor coordinates rather than rank-indexed slices, plus a plan for reading them back into whatever layout the loading job wants. Each rank writes in parallel, nothing is gathered, and RESHARDING on load is supported. That is the right default for large-scale training and it is worth adopting before you need it. WHAT ELSE MUST BE IN THE CHECKPOINT, and this is where sharded setups add requirements. The OPTIMIZER STATE, which under ZeRO is itself sharded and must be saved and resharded consistently with the parameters - and it is twelve of the sixteen bytes, so it dominates the checkpoint size. The learning-rate scheduler, the GradScaler if using fp16, the step count, and the DATA LOADER POSITION per rank, without which a resume re-trains on data already seen. THE PRACTICAL POLICY I WOULD ADOPT. Use the distributed sharded format for routine training checkpoints, because they are frequent and must be fast. Export a consolidated full checkpoint occasionally - at the end, and at milestones - for portability, evaluation, and handing to anyone who is not running your exact configuration. And TEST THE RESUME, by checkpointing, restarting the process, loading, and confirming the loss trajectory continues smoothly rather than showing a discontinuity. That test is the only thing that catches a missing piece of state, and a discontinuity at the resume point usually identifies which piece by its size and shape."
          }
        },
        {
          "q": "Your FSDP job is much slower than the 1.5x communication figure suggests. Diagnose it.",
          "a": "THE 1.5x IS AN UPPER BOUND ON TRAFFIC, not a prediction of wall-clock, because the all-gathers can be hidden behind computation. A run that is much slower has failed to hide them, and there are five candidates. CANDIDATE 1: PREFETCHING IS OFF OR INEFFECTIVE. The point of prefetch is to issue unit i+1's all-gather while unit i computes. Without it every unit stalls waiting for its parameters and you realize the full communication cost serially. Forward and backward prefetch are separate settings and the backward one is more often left off. Diagnostic: the profiler timeline shows all-gather kernels with compute IDLE alongside them, in a regular pattern per layer. CANDIDATE 2: WRAPPING GRANULARITY. Too COARSE and there is nothing to overlap against - one giant all-gather at the start of forward, with the whole model's parameters materialized, which also blows up peak memory. Too FINE and you have hundreds of small collectives each paying fixed latency, so you are latency-bound rather than bandwidth-bound. Diagnostic: count the collectives per step and look at their individual durations. Many very short ones means too fine; a few enormous ones means too coarse. Per transformer block is the usual right answer. CANDIDATE 3: THE INTERCONNECT AND THE SHARDING TOPOLOGY. Parameter all-gathers happen per unit per step in both directions, so their frequency is high. Full sharding across a slow inter-node fabric puts that high-frequency traffic on the worst link available. HYBRID sharding - shard within the node, replicate across - moves it onto NVLink and reduces inter-node traffic to one all-reduce per step. On a multi-node cluster this is often the single largest fix, and the default is frequently wrong for the hardware. CANDIDATE 4: ACTIVATION CHECKPOINTING SPANNING FSDP UNITS. If a checkpointed region covers several units, the recomputation during backward triggers those units' all-gathers AGAIN - so the recompute costs communication as well as compute. That is a genuinely surprising interaction and it can be large. Fix: align checkpoint boundaries with FSDP unit boundaries. CANDIDATE 5: A STRAGGLER. Every rank waits at every collective, so one slow rank sets the pace and presents as uniformly poor performance. Diagnostic: per-rank step times, max versus median. Nothing about FSDP configuration fixes this. THE FIRST THING I WOULD ACTUALLY CHECK, before any of the above: DOES THE MODEL FIT UNDER DDP? If it does, use DDP. FSDP is paying communication for capacity you did not need, and this is a surprisingly common situation - someone reaches for sharding because the model is large rather than because the memory arithmetic said it was necessary. Computing the budget takes two minutes and can eliminate the entire investigation. AND THE MEASUREMENT THAT BOUNDS EVERYTHING. Run single-device and multi-device MFU. The difference is the total distributed overhead, and comparing it against the theoretical 1.5x tells you how much of the gap is unexplained - which is the residual that this module keeps insisting is the most valuable number in a performance analysis."
        },
        {
          "q": "Explain the memory-versus-communication trade in this lesson's terms.",
          "a": "THE EXCHANGE. Sharding buys per-device memory by spending communication, and each ZeRO stage is a different point on that curve. Stage 1 is the bargain: it moves twelve of the sixteen bytes per parameter off each device and costs essentially nothing extra in traffic, because the gradient all-reduce is unchanged and the only addition is a parameter all-gather after the step. Stage 2 replaces the all-reduce with a reduce-scatter, which is actually LESS traffic, while sharding another two bytes - so it is arguably free as well. Stage 3 is where you start paying: parameter all-gathers in both forward and backward take traffic to about 1.5 times DDP, in exchange for memory that finally divides by the device count. WHY THE RATE IS CONFIGURATION-DEPENDENT, which is this module's recurring point. The 1.5x is an upper bound on BYTES, and the wall-clock cost depends entirely on whether those bytes overlap with computation. With good prefetching and per-block wrapping on NVLink, the exposed fraction can be small and the effective rate is excellent. With coarse wrapping across a slow inter-node fabric and no prefetch, you realize the full cost serially and the effective rate is terrible. The SAME configuration on different hardware, or the same hardware with different wrapping, gives you materially different exchange rates - which is why the placement rule and the wrapping granularity matter more than the choice of stage. THE SECOND AXIS THIS OPENS. Tensor and pipeline parallelism are further exchanges of the same kind but with different currencies. Tensor parallelism buys memory - including ACTIVATION memory, which sharding does not touch - by spending very high-frequency communication on the critical path. Pipeline parallelism buys memory by spending IDLE TIME in the bubble, and its communication cost is the lowest of any axis. So you have three different things to spend - bandwidth, latency-sensitive bandwidth, and utilization - and the right combination depends on which your hardware has spare. THE ORDERING PRINCIPLE THAT FOLLOWS. Compute the memory budget, identify which term does not fit, and choose the cheapest axis that fixes THAT term. Optimizer state too large: stage 1 or 2, nearly free. Parameters too large: stage 3. A single layer too large: tensor parallelism. Depth too large: pipeline. Activations too large: checkpointing or sequence parallelism, neither of which is on this page. Applying the wrong axis costs its communication and fixes nothing, which is the failure this ordering prevents. WHAT MAKES THIS LESSON DIFFERENT FROM THE OTHERS IN THE MODULE. Here the exchange is provably lossless in the mathematical sense - sharding gives bit-identical results, verified three ways - so unlike quantization or checkpointing there is no quality question at all. The entire decision is systems engineering. That is unusually clean, and it means the only way to get it wrong is to pay communication you did not need, or to place it on hardware that cannot carry it."
        },
        {
          "q": "How does sharding interact with the other techniques in this module?",
          "a": "WITH GRADIENT CHECKPOINTING - complementary, attacking disjoint terms, and with one real interaction. Sharding divides the parameter, gradient and optimizer terms across devices; checkpointing reduces the ACTIVATION term on each device. Neither helps with the other's term, which is why large-scale training uses both. The interaction: if a checkpointed region spans several FSDP units, the recomputation during backward triggers those units' parameter all-gathers AGAIN, so recompute costs communication as well as compute. Aligning checkpoint boundaries with FSDP wrapping boundaries avoids it, and this is a genuinely surprising cost that shows up as FSDP being slower than the accounting predicts. WITH MIXED PRECISION - tightly integrated, and FSDP exposes it more explicitly than autocast does. Its MixedPrecision policy sets separate dtypes for parameters, for gradient reduction, and for buffers. The useful configuration is computing in bf16 while REDUCING in fp32, because summing many bf16 gradients across ranks loses precision in a way that matters more than the compute precision does. That is a knob autocast alone does not give you and it is worth setting deliberately. Also: bf16 parameters halve the all-gather traffic, which directly reduces the 1.5x. WITH GRADIENT ACCUMULATION - the same no_sync concern as DDP, and it is more consequential here. Without it you perform the full gather-reduce-scatter cycle on every micro-step instead of once per optimizer step, multiplying the dominant cost by the accumulation count. FSDP provides its own no_sync, and it changes the memory profile too, since gradients must be held unsharded between micro-steps. WITH torch.compile - they compose, and the composition needs care. Compiling FSDP-wrapped modules works, and the interaction between graph boundaries and FSDP unit boundaries affects how well the collectives can be scheduled. I would measure rather than assume additivity here. WITH DATA LOADING - the requirement that shard counts be equal across ranks is sharper under FSDP because a hang is even more expensive when you have more devices idle. And the effective batch is micro-batch times accumulation times world size, so a change in sharding strategy that changes the world size changes the optimization problem. WITH PROFILING - the essential pairing, because the difference between a good and bad FSDP configuration is measured in exposed communication, and that is only visible on a timeline. Single-device versus multi-device MFU bounds the total distributed overhead, and comparing it against the theoretical 1.5x tells you how much is unexplained. THE PATTERN. Sharding is the technique with the most interactions in the module, because it touches memory, communication, precision and the training loop's structure simultaneously. That is a reason to reach for it only when the budget says you must - which is the capstone's argument and the reason this lesson sits immediately before it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Per-device memory by ZeRO stage",
        "back": "DDP: 16P, FLAT in N (adding devices never buys capacity). ZeRO-1: 4P + 12P/N. ZeRO-2: 2P + 14P/N. ZeRO-3/FSDP: 16P/N. The 16 = 2 fp16 weights + 2 fp16 grads + 4 fp32 master + 8 Adam m,v."
      },
      {
        "type": "intuition",
        "front": "ZeRO-1 is the most under-used option",
        "back": "The optimizer state is TWELVE of the sixteen bytes, so stage 1 removes three quarters of the memory at essentially UNCHANGED communication. People jump to full sharding when the free stage would have done."
      },
      {
        "type": "formula",
        "front": "Communication by stage",
        "back": "DDP and ZeRO-1 ~2D. ZeRO-2 ~2D (reduce-scatter is HALF an all-reduce). ZeRO-3 ~3D = 1.5x DDP, from parameter all-gathers in BOTH forward and backward. The 1.5x is an upper bound on BYTES, not a prediction of wall-clock."
      },
      {
        "type": "intuition",
        "front": "Why optimizer-state sharding is EXACT",
        "back": "ADAM IS ELEMENTWISE - each parameter's update uses only its OWN gradient and its OWN m and v, with no cross-parameter term. So splitting the state across devices loses nothing. Verified: sharded step == unsharded step, difference exactly 0."
      },
      {
        "type": "intuition",
        "front": "Sharding is mathematically NEUTRAL - verify it",
        "back": "Three checks: (1) all-gathered params give an identical forward (diff 0); (2) sharded Adam step == unsharded (0); (3) 25 steps, same seed, bit-for-bit identical. So the entire question is systems engineering, not numerics."
      },
      {
        "type": "formula",
        "front": "FSDP peak parameter memory",
        "back": "P/N (your shard) + the LARGEST SINGLE UNIT you gather just-in-time. That is why WRAPPING GRANULARITY is a memory decision, not only a throughput one - wrapping the whole model as one unit defeats the purpose entirely."
      },
      {
        "type": "pitfall",
        "front": "Wrapping granularity: too coarse vs too fine",
        "back": "TOO COARSE: one huge all-gather with nothing to overlap against, and peak = the full model. TOO FINE: hundreds of small collectives, each paying fixed latency, so you are latency-bound. Per TRANSFORMER BLOCK is the usual right answer."
      },
      {
        "type": "intuition",
        "front": "Prefetching is what hides the 1.5x",
        "back": "Gather unit i+1's parameters while unit i computes. Without it every unit STALLS on its gather and you realize the full cost serially. Forward and BACKWARD prefetch are separate settings, and the backward one is more often left off."
      },
      {
        "type": "definition",
        "front": "The parallelism placement rule",
        "back": "TENSOR parallel WITHIN a node (an all-reduce inside every layer, twice per block - needs NVLink). PIPELINE ACROSS nodes (only activations point-to-point - lowest volume). DATA parallel OUTERMOST (one collective per step). Reversing it costs most of a cluster's throughput."
      },
      {
        "type": "formula",
        "front": "Pipeline bubble fraction",
        "back": "(p-1)/(m+p-1) for p stages, m micro-batches. 4 stages x 4 micro-batches = 43% WASTED. 4 x 32 = under 9%. Pipeline parallelism REQUIRES a large batch to be viable - that is a precondition, not a tuning detail."
      },
      {
        "type": "definition",
        "front": "Hybrid sharding",
        "back": "Shard WITHIN a node, replicate ACROSS nodes. Keeps the high-frequency parameter all-gathers on fast intra-node links and reduces inter-node traffic to ONE all-reduce per step. Often the single largest fix on a multi-node cluster."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing spanning FSDP units costs COMMUNICATION",
        "back": "The recomputation during backward triggers those units' parameter all-gathers AGAIN - so recompute costs bandwidth as well as compute. Align checkpoint boundaries with FSDP wrapping boundaries. A surprising interaction that shows as FSDP being slower than the accounting predicts."
      }
    ],
    "refs": [
      {
        "title": "Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "Zhao et al. (2023), PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel",
        "url": "https://arxiv.org/abs/2304.11277"
      },
      {
        "title": "Shoeybi et al. (2019), Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism",
        "url": "https://arxiv.org/abs/1909.08053"
      },
      {
        "title": "Huang et al. (2019), GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism",
        "url": "https://arxiv.org/abs/1811.06965"
      },
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      }
    ],
    "demos": [
      "moe",
      "batching",
      "mixed-precision",
      "autoscaling"
    ]
  },
  "optimized-pipeline": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Nine techniques, each an exchange: mixed precision spends numerical headroom, compilation spends compile time and debuggability, checkpointing spends a third of your compute, accumulation spends wall-clock, sharding spends communication, stability guards spend throughput, and the data-pipeline choices spend storage, randomness or sample freshness. The capstone is not a longer list. It is the claim that these do not compose freely - their exchange rates depend on each other, and applying them in the wrong order or the wrong combination gives you a system that is slower than the sum of its parts suggests.",
        "The organizing discipline is a decision procedure rather than a checklist. Establish which resource binds. Apply the technique that targets THAT resource. Re-measure - because optimizing a system RE-ORDERS its bottlenecks, and the term that binds after you have halved the activations is usually not the one that bound before. The most memorable instance is that after LoRA, quantization and mixed precision have done their work on a large fine-tune, the biggest remaining allocation can be the logits tensor: something nobody was thinking about, which did not become expensive but simply stopped being dwarfed.",
        "And the ordering has a hard dependency at the top that people skip. If the accelerator is idle waiting for data, then mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more onto it, and the accelerator is not the constraint. So the first question - is the GPU busy - is not the first step of a performance investigation, it determines whether the rest of the module applies at all. That is why this lesson comes after profiling rather than before it, and why the first thing the assembled pipeline does is measure."
      ],
      "math": [
        {
          "h": "The decision procedure, as a budget",
          "paras": [
            "Both budgets must be computed, because they select different techniques. The memory budget says what fits; the time budget says what is slow. A technique that targets a term which is not binding buys nothing at all.",
            "Writing them down first is what converts a list of options into a ranked plan."
          ],
          "tex": "M = \\underbrace{2P}_{\\text{wts}} + \\underbrace{14P_t}_{\\text{grad}+\\text{opt}} + \\underbrace{A}_{\\text{acts}} + \\underbrace{L}_{\\text{logits}}, \\qquad T = t_{\\text{compute}} + t_{\\text{comm}}^{\\text{exposed}} + t_{\\text{data}} + t_{\\text{idle}}",
          "texNote": "Map each term to its lever and the plan writes itself. Training state: LoRA or ZeRO-1. Weights: quantization or full sharding. Activations: checkpointing, micro-batching, mixed precision. Logits: chunked cross-entropy. Compute time: compilation, better kernels, precision. Exposed communication: overlap, hybrid sharding, bucketing. Data time: the pipeline. Idle: find the straggler or the synchronization."
        },
        {
          "h": "Why the order matters: optimization re-orders bottlenecks",
          "paras": [
            "Amdahl bounds each step's gain by the fraction it addresses, and that fraction changes after every change. So the correct procedure is iterative, and a plan fixed in advance is wrong by the second step.",
            "The practical consequence is that you re-profile after each significant change rather than applying a prepared list."
          ],
          "tex": "S_k = \\frac{1}{(1-p_k) + p_k/s_k}, \\qquad p_{k+1} = \\frac{p_{k+1}^{\\text{old}}}{S_k} \\;\\; \\text{(every other fraction grows)}",
          "texNote": "Halving the time of a component that was 50% makes everything else 67% of the new total, so the next-largest term is now worth proportionally more and the one you just fixed is worth much less. That is why a list applied top to bottom without re-measuring converges to spending effort on things that stopped mattering three changes ago."
        },
        {
          "h": "The metric that should decide, and the ones that mislead",
          "paras": [
            "Step time gets worse under several of these techniques by construction, so optimizing it selects against checkpointing and accumulation regardless of whether they helped. The right objective is time to a target quality.",
            "Throughput is a reasonable proxy only when the effective batch and the optimization are held fixed, which most of these changes do not do."
          ],
          "tex": "\\text{minimize } T_{\\text{target}} = \\underbrace{n_{\\text{steps}}(B_{\\text{eff}})}_{\\text{optimization}} \\times \\underbrace{t_{\\text{step}}}_{\\text{systems}} \\quad\\text{not}\\quad \\min t_{\\text{step}}",
          "texNote": "The two factors pull against each other, which is the whole reason this is a capstone. Checkpointing raises t_step and can lower n_steps by permitting a larger batch. Accumulation raises t_step per optimizer step and lowers n_steps. Only the product is the thing you care about, and it is why every comparison in this lesson is run to a target loss rather than for a fixed number of steps."
        }
      ],
      "code": [
        {
          "h": "The decision procedure, applied",
          "paras": [
            "Measure, identify the binding term, apply its lever, re-measure. The ordering is not a preference - each step's value depends on the previous step's outcome."
          ],
          "code": "# STEP 0 - IS THE ACCELERATOR EVEN BUSY? This gates everything else.\n#   Run the loop on SYNTHETIC data (a fixed tensor). If throughput jumps, you\n#   are INPUT-BOUND and nothing else in this module applies until it is fixed.\n#   Ten minutes, and it is the only step with a hard dependency on it.\n\n# STEP 1 - COMPUTE BOTH BUDGETS before touching anything.\n#   MEMORY: weights 2P | grad+opt 14P_trainable | activations | LOGITS (B*T*V*3)\n#   TIME:   from the profiler - matmul | memory-bound | exposed comm | data | idle\n\n# STEP 2 - APPLY THE LEVER FOR THE BINDING TERM. One at a time.\n#   grad+opt dominates ....... LoRA, or ZeRO-1  (removes 12 of 16 bytes, ~free)\n#   weights dominate ......... quantize the base, or ZeRO-3\n#   activations dominate ..... micro-batch FIRST (linear, no recompute), then\n#                              checkpoint SEGMENTED at ~sqrt(L)\n#   LOGITS dominate .......... chunked cross-entropy - and check this, because\n#                              after the others it is often the largest term\n#   memory-bound kernels ..... torch.compile (fusion), lower precision\n#   exposed communication .... prefetch, bucket, HYBRID shard, no_sync\n#   data time ................ sequential shards, local cache, GPU decode\n#   idle ..................... find the STRAGGLER or the .item() sync\n\n# STEP 3 - RE-MEASURE. Optimization RE-ORDERS bottlenecks: the term that binds\n#   after halving the activations is usually not the one that bound before.\n#   Applying a prepared list top-to-bottom without re-profiling converges to\n#   optimizing things that stopped mattering three changes ago.\n\n# STEP 4 - JUDGE BY TIME TO A TARGET LOSS, not step time. Checkpointing and\n#   accumulation make step time WORSE by construction, so optimizing step time\n#   selects against them regardless of whether they helped.\n\n# ALWAYS ON, regardless of the above - these are not optimizations:\n#   bf16 autocast (no GradScaler)      finite-gradient check before step\n#   gradient clipping + LOG the norm   frequent checkpoints incl. loader state\n#   log MFU, per-rank step time, peak memory, effective batch size",
          "caption": "Step 0 is a hard dependency, not a preference: an idle accelerator cannot be helped by making it faster. And step 3 is what people skip - a prepared list applied without re-measuring optimizes things that stopped mattering several changes ago."
        },
        {
          "h": "The interactions, which are where assembled pipelines go wrong",
          "paras": [
            "Every pair below costs more than the two techniques individually suggest, and each is silent. These are the reason the module ends with a capstone rather than a summary."
          ],
          "code": "# CHECKPOINTING x QLoRA -> the recomputed forward DEQUANTIZES the 4-bit base\n#   weights a SECOND time. Both are memory techniques and the combination is\n#   right, but the step cost is worse than either alone implies. Budget for it.\n\n# CHECKPOINTING x FSDP -> if a checkpointed region spans several FSDP units,\n#   the recomputation triggers those units' parameter ALL-GATHERS again. The\n#   recompute now costs BANDWIDTH as well as compute. Align the boundaries.\n\n# ACCUMULATION x DDP/FSDP -> without no_sync you perform the full communication\n#   cycle on EVERY micro-step instead of once. Identical results, k times the\n#   traffic. Large, common, one line to fix.\n\n# ACCUMULATION x fp16 SCALER -> an overflow at the step boundary discards the\n#   WHOLE accumulated gradient, so one bad micro-batch costs k micro-batches.\n#   Another argument for bf16.\n\n# fp16 -> bf16 -> you deleted the GradScaler, which was ALSO doing your\n#   skip-on-non-finite. Add the finite check back explicitly. This is the most\n#   commonly missing guard in a bf16 loop.\n\n# COMPILE x CHECKPOINTING -> AOTAutograd's partitioner ALREADY chooses\n#   save-vs-recompute as a min-cut at operation granularity. Manual segment\n#   checkpointing on top can help (coarser decisions) or fight it. Measure both.\n\n# WORLD SIZE x LEARNING RATE -> effective batch = micro x accum x world_size.\n#   Adding GPUs changes the OPTIMIZATION PROBLEM. A run that diverges after\n#   scaling out is usually the linear scaling rule applied WITHOUT warmup, not\n#   a distributed bug.\n\n# CLIPPING x AMP -> unscale BEFORE clipping, or the threshold meets gradients\n#   still carrying a factor of ~2^16 and the clip never fires.\n\n# THE PATTERN: most failures come from two techniques touching the SAME term\n# and being expected to add, or from an interaction cost nobody budgeted.",
          "caption": "Eight interactions, all silent, and each costs more than the two techniques individually suggest. This list is the reason a pipeline assembled from correct parts can still be slower than expected."
        }
      ],
      "useCases": [
        "Standing up a new large training run, where the order of decisions determines the cost of the whole project and where the memory budget computed in ten minutes decides which techniques are even relevant.",
        "Auditing an existing pipeline that is slower or more expensive than expected, where the performance budget and the interaction list between them explain most cases without any new tooling.",
        "Making the case for engineering time, since MFU plus the FLOP model converts a proposed improvement into days and dollars - a far stronger argument than a profile that looks unsatisfying.",
        "Scaling an established recipe to more devices or a larger model, where the effective batch changes the optimization problem and the binding memory term usually changes too, so the previous configuration is not simply reusable."
      ],
      "pitfalls": [
        "Applying techniques from a list without measuring. Each targets a different term, and one that addresses a term which is not binding buys exactly nothing - while still costing its price in compute, complexity or communication.",
        "Not re-profiling after each change. Optimization re-orders bottlenecks, so a plan fixed in advance is wrong by its second step and converges to optimizing things that stopped mattering several changes ago.",
        "Optimizing step time. Checkpointing and accumulation make step time worse by construction, so that objective selects against them regardless of whether they helped. Judge by time to a target loss.",
        "Skipping the is-the-GPU-busy question. If the job is input-bound, every other technique in this module makes the accelerator faster or fit more onto it, and the accelerator is idle. This is a hard dependency rather than a preference.",
        "Enabling checkpointing to fix an out-of-memory and never raising the batch size. You have paid a third of your compute for headroom you are not spending, which is a bookkeeping error rather than a technical one and it is extremely common.",
        "Assuming techniques compose additively. Checkpointing plus quantized weights pays dequantization twice; checkpointing across FSDP units pays extra all-gathers; accumulation without no_sync multiplies communication. Every one of these is silent.",
        "Adding devices without adjusting the learning rate. The effective batch is micro-batch times accumulation times world size, so scaling out changes the optimization problem - and a run that diverges afterwards is usually the linear scaling rule applied without warmup rather than a distributed bug."
      ],
      "connections": [
        {
          "ref": "training-systems/profiling",
          "text": "The prerequisite instrument. MFU sizes the opportunity absolutely and the performance budget ranks the work, which is what turns this lesson's decision procedure from advice into arithmetic."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Where the memory budget's terms are established, including the logits allocation that becomes the largest remaining term once the parameter-side techniques have done their work."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The other half of the cost question. Systems work sets the time per token; the scaling literature sets how many tokens and parameters are worth buying, and only the product is the training plan."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Where the engineering-time question belongs. MFU converts a proposed optimization into days and dollars, which is what makes the decision to spend a week on performance work defensible rather than aesthetic."
        },
        {
          "ref": "fine-tuning/unsloth",
          "text": "The same discipline applied to tooling claims. A speedup figure is a measurement of someone else's configuration, and reproducing it on yours is the only version of the number that applies."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the first question in any training-performance investigation?",
          "a": "Is the accelerator busy. If the job is input-bound, every other technique makes the accelerator faster or fit more onto it, and the accelerator is idle."
        },
        {
          "q": "How do you test for input-bound quickly?",
          "a": "Run the training loop on synthetic data - a fixed tensor - with the loader removed. If throughput jumps, the pipeline is the constraint."
        },
        {
          "q": "Which two budgets should you compute first?",
          "a": "Memory - weights, training state, activations, logits - and time, from the profiler: matmul, memory-bound, exposed communication, data, idle."
        },
        {
          "q": "Why re-profile after each change?",
          "a": "Optimization re-orders bottlenecks. The term that binds after halving the activations is usually not the one that bound before, so a fixed plan is wrong by its second step."
        },
        {
          "q": "Why is step time the wrong objective?",
          "a": "Checkpointing and accumulation make it worse by construction, so optimizing it selects against them regardless of whether they helped. Use time to a target loss."
        },
        {
          "q": "What lever targets the training-state term?",
          "a": "LoRA or ZeRO stage 1 - the optimizer state and master copy are twelve of the sixteen bytes per trainable parameter."
        },
        {
          "q": "What should you try before gradient checkpointing?",
          "a": "Micro-batching with accumulation, which reduces peak activation memory linearly with no recompute cost at all."
        },
        {
          "q": "Which memory term surprises people after the others are optimized?",
          "a": "The logits tensor - batch times sequence times vocabulary, times three - which did not get more expensive but stopped being dwarfed."
        },
        {
          "q": "Why does checkpointing plus QLoRA cost more than expected?",
          "a": "The recomputed forward dequantizes the 4-bit base weights a second time, so the combined step is slower than either technique alone suggests."
        },
        {
          "q": "Why does checkpointing across FSDP units cost communication?",
          "a": "The recomputation triggers those units' parameter all-gathers again, so recompute costs bandwidth as well as compute. Align the boundaries."
        },
        {
          "q": "What breaks when you move from fp16 to bf16?",
          "a": "You delete the GradScaler, which was also performing the skip-on-non-finite guard. That check must be added back explicitly."
        },
        {
          "q": "What changes when you add GPUs?",
          "a": "The effective batch, which is micro-batch times accumulation times world size - so the optimization problem changes and the learning rate needs adjusting."
        }
      ],
      "standard": [
        {
          "q": "Walk through how you would optimize a large training job from scratch.",
          "a": "I WOULD FOLLOW A DECISION PROCEDURE RATHER THAN A CHECKLIST, because each technique targets a different resource and one applied to a term that is not binding buys nothing while still costing its price. STEP 0 - IS THE ACCELERATOR BUSY? Run the loop on synthetic data with the loader removed. If throughput jumps, the job is input-bound and NOTHING else in the module applies until that is fixed - mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more onto it, and the accelerator is idle. This is a hard dependency, it takes ten minutes, and it is skipped constantly. STEP 1 - COMPUTE BOTH BUDGETS. Memory: 2 bytes per parameter for weights, about 14 more per TRAINABLE parameter for gradients and optimizer state, activations scaling with batch times sequence times depth, and the logits tensor at batch times sequence times vocabulary times three. Time: from the profiler, split into matmul kernels, memory-bound kernels, exposed communication, data stalls, and idle. Both are needed because they select different techniques. STEP 2 - APPLY THE LEVER FOR THE BINDING TERM, one at a time. Training state dominating means LoRA or ZeRO-1, which removes twelve of sixteen bytes at essentially no communication cost. Weights dominating means quantization or full sharding. Activations dominating means micro-batching FIRST, since it is linear and free, then segmented checkpointing at about the square root of the depth. The logits dominating - which is common once the others are done - means a chunked cross-entropy. Memory-bound kernels mean compilation and lower precision. Exposed communication means prefetching, bucketing, hybrid sharding, and no_sync under accumulation. Data time means the pipeline. Idle means a straggler or a synchronization from logging. STEP 3 - RE-MEASURE, which is what people skip. Optimization RE-ORDERS bottlenecks: halving a component that was half your time makes everything else two thirds of the new total, so the next-largest term is now worth proportionally more. A prepared list applied top to bottom converges to optimizing things that stopped mattering three changes ago. STEP 4 - JUDGE BY TIME TO A TARGET LOSS. Step time gets worse under checkpointing and accumulation by construction, so optimizing step time selects against them regardless of whether they helped. The objective is the product of steps-to-target, which the optimization determines, and time-per-step, which the systems work determines - and those two pull against each other, which is the whole reason this is a capstone. WHAT I WOULD TURN ON REGARDLESS, because these are not optimizations. bf16 autocast with no GradScaler. The finite-gradient check before the step - and note that deleting the scaler deleted the skip logic it was providing. Gradient clipping with the pre-clip norm logged. Frequent checkpoints including the data-loader position. And a metrics set covering MFU, per-rank step time, peak memory and effective batch size, so the next investigation starts from a dashboard rather than from scratch.",
          "deepDive": {
            "q": "Work a concrete example: a 7B model, 8 GPUs, currently out of memory. What do you do and in what order?",
            "a": "COMPUTE THE BUDGET FIRST, because it determines everything and takes two minutes. 7B parameters at 2 bytes is 14 GB of weights. Gradients plus the fp32 master copy plus Adam's two moments is about 14 bytes per trainable parameter, so 98 GB more if everything is trainable. That is 112 GB per device before a single activation, against perhaps 80 GB available. So the TRAINING STATE is the binding term by a wide margin - not activations, not the model. That single observation eliminates half the techniques. DECISION 1: IS THIS FULL FINE-TUNING OR ADAPTATION? If adaptation, LoRA removes the 98 GB almost entirely - the fourteen bytes apply only to TRAINABLE parameters and the adapter is under one percent of them. You are left with 14 GB of frozen weights plus activations, which fits comfortably on one device and the problem is solved without any distributed machinery. This is the answer most of the time and it is worth establishing before reaching for sharding. DECISION 2: IF FULL FINE-TUNING IS REQUIRED, shard the state. ZeRO-1 across 8 devices gives 4P plus 12P over 8, which is about 14 GB plus 10.5 GB, roughly 25 GB per device - and it costs essentially no extra communication. That fits, and I would stop there rather than going to full sharding, because ZeRO-3's parameter all-gathers cost about 1.5 times DDP's traffic for capacity I no longer need. This is the under-used option and this example is exactly its case. DECISION 3: NOW RE-MEASURE, because the binding term has changed. With the state sharded, activations and the logits tensor are what remain. At a long sequence length the logits - batch times sequence times vocabulary times three copies - can be several gigabytes, which is often the largest single remaining allocation and is fixed by a chunked cross-entropy rather than by anything on the parameter side. Activations are addressed first by micro-batching, which is linear and costs no recompute, and only then by segmented checkpointing. DECISION 4: MIXED PRECISION throughout, bf16 if the hardware supports it, which halves activations and the gradient term and deletes the loss-scaling machinery. This should have been on from the start rather than being a step. THEN THE TIME QUESTION, which is separate. Once it fits, profile. If the model is memory-bound on elementwise work, compile it. If communication is exposed, check prefetching and no_sync. If the GPU is idle, the data pipeline is the constraint and none of the above matters. WHAT I WOULD NOT DO. Reach for FSDP first because the model is large - the arithmetic said the optimizer state was the problem, and stage 1 solves it more cheaply. Enable checkpointing to fix the out-of-memory and then not raise the batch size, which pays a third of the compute for headroom nobody spends. Or apply several techniques at once, which makes it impossible to attribute the result and guarantees some of them are unnecessary. THE GENERALIZABLE PART. The budget told me the binding term was the optimizer state, which pointed at exactly two techniques and eliminated the rest. Without it, the natural instinct is checkpointing - because the model is large and checkpointing is what you do for memory - and it would have cost a third of the compute while addressing a term that was a small fraction of the problem."
          }
        },
        {
          "q": "Which techniques in this module interact badly, and why?",
          "a": "SEVEN PAIRS, and every one of them is silent - the pipeline works and is slower or more fragile than the sum of its parts implies. (1) CHECKPOINTING AND QUANTIZED WEIGHTS. The recomputed forward pass dequantizes the 4-bit base a SECOND time, and dequantization is memory-bound and slow. Both are memory techniques and the combination is usually right, but the step cost exceeds what either suggests and it should be budgeted rather than discovered. (2) CHECKPOINTING AND FSDP. If a checkpointed region spans several FSDP units, the recomputation triggers those units' parameter ALL-GATHERS again - so recompute now costs bandwidth as well as compute. Aligning checkpoint boundaries with wrapping boundaries fixes it, and this is a common reason FSDP appears slower than its accounting predicts. (3) ACCUMULATION AND DATA-PARALLEL COMMUNICATION. Without no_sync you perform the full gradient communication on every micro-step instead of once per optimizer step - identical results, k times the traffic. One line, large waste, and easy to miss because nothing is wrong with the output. (4) ACCUMULATION AND THE fp16 SCALER. An overflow detected at the step boundary discards the WHOLE accumulated gradient, so a single bad micro-batch costs k micro-batches of work. An argument against large accumulation counts under fp16, and another point for bf16. (5) fp16 TO bf16. Switching is strictly better numerically and it DELETES the GradScaler, which was also performing the skip-on-non-finite guard. The loop that was protected is now not, and this is the most commonly missing guard in a bf16 training loop precisely because the protection was previously invisible. (6) COMPILATION AND CHECKPOINTING. AOTAutograd's partitioner already chooses save-versus-recompute as a min-cut at operation granularity, so compiled training may already use less activation memory than eager. Manual segment checkpointing on top can add coarse decisions the partitioner does not make, or can fight it. Measure both rather than assuming they compose. (7) WORLD SIZE AND LEARNING RATE. The effective batch is micro-batch times accumulation times world size, so adding devices changes the OPTIMIZATION problem rather than only the infrastructure. A run that diverges after scaling out is usually the linear scaling rule applied without warmup, not a distributed bug - and the diagnosis is a glance at two logged numbers. THE PATTERN ACROSS ALL OF THEM. Most failures come from two techniques touching the SAME budget term and being expected to add - checkpointing and micro-batching both reduce activations, so applying both does not halve twice - or from an interaction cost nobody budgeted, which is the dequantization and the extra all-gathers. WHAT I WOULD DO ABOUT IT. Apply one technique at a time and re-measure, which attributes the effect and surfaces the interaction. And write down which term each is addressing, because that single note makes the same-term overlaps obvious in advance rather than after."
        },
        {
          "q": "How do you decide whether an optimization is worth the engineering time?",
          "a": "CONVERT IT TO DAYS AND DOLLARS, which MFU and the FLOP model make straightforward and which is a far stronger argument than a profile that looks unsatisfying. THE ARITHMETIC. Total compute is about 6ND for a dense transformer. Effective throughput is aggregate peak times MFU. Wall-clock is the ratio, and cost is device-hours times the rate. So an MFU improvement from 30% to 40% on a job that was going to take nineteen days saves about six days and a quarter of the budget - a number you can put in front of a decision-maker and check against an invoice afterwards. THE COMPARISON THAT DECIDES IT. Estimated saving against estimated engineering time, including the cost of the added complexity forever. A week of work to save six days of compute on one run is marginal; the same week to save six days on every run for the next year is obvious. So the question is not only how much it saves but how many times it saves it, and that is usually the deciding factor rather than the size of the improvement. WHAT AMDAHL CONTRIBUTES. It bounds the payoff before you start. If the component you are proposing to optimize is 15% of step time, your ceiling is a 17% improvement - so a proposal to spend two weeks on it is answerable with arithmetic rather than opinion. This is the most useful thing a performance budget provides: it lets you decline work with a number. WHAT MFU CONTRIBUTES ON TOP. It bounds the TOTAL available. At 45% MFU the most any optimization could ever buy is roughly a factor of two, which caps every proposal anyone makes. At 12% the problem is structural and the available gain is large, which changes the calculus entirely. Knowing which regime you are in determines whether to invest at all. THE COSTS PEOPLE UNDER-COUNT. Complexity is permanent: every technique adds configuration, failure modes, and debugging surface for everyone who touches the pipeline afterwards. Some optimizations constrain future choices - a heavily tuned sharding configuration is harder to change when the model does. And the risk of introducing a subtle correctness problem is real, particularly with hand-written kernels or custom backward passes, where the failure is silent. THE ASYMMETRY I WOULD FLAG. Optimizations that are one line and reversible - bf16, torch.compile, a larger micro-batch - should be tried immediately, because measuring costs more than trying. Optimizations that restructure the pipeline should be justified by the budget first. Those two categories deserve completely different thresholds and treating them the same is why teams either over-optimize or never start. WHAT I WOULD ACTUALLY PRESENT. The measured MFU, the budget showing which term binds, the estimated saving in days and dollars with the assumption stated, and the sensitivity - how the answer changes if the improvement is half what I expect. That makes it an engineering estimate rather than a pitch, and it also makes it checkable afterwards, which is what builds the credibility to do it again.",
          "deepDive": {
            "q": "Your job is at 18% MFU. Walk through the investigation and what you would expect to find.",
            "a": "EIGHTEEN PERCENT IS THE STRUCTURAL REGIME, not the tuning regime. Something is wrong in kind, and the available gain is large - potentially a factor of two or more - which justifies real investigation. I would run four experiments, each eliminating a category. EXPERIMENT 1: SYNTHETIC DATA. Replace the loader with a fixed tensor. If MFU jumps, the job is INPUT-BOUND and everything else is moot. At 18% this is the single most likely finding on a multi-node job, because feeding many accelerators from shared storage is genuinely hard and the DataLoader hides the pipeline so thoroughly that nobody suspects it. Ten minutes. EXPERIMENT 2: SINGLE DEVICE VERSUS MULTI. Measure MFU on one device and on the full job. If single-device MFU is also 18%, the problem is local - kernels, shapes, precision - and distribution is innocent. If single-device is 45% and the full job is 18%, you have lost most of it to distribution, which points at exposed communication or a straggler. This cleanly splits local from distributed and it is the experiment people skip. EXPERIMENT 3: PER-RANK STEP TIMES. If the distribution is skewed - one rank consistently slower - you have a STRAGGLER, and every rank waits at every collective so the whole job runs at that pace. Causes are mundane: a degraded disk, a thermally throttled device, an unbalanced data shard, a noisy co-tenant. Nothing about the model or the configuration fixes it, and identifying it saves you from a week of optimizing the wrong thing. EXPERIMENT 4: THE KERNEL BREAKDOWN, and specifically the kernel NAMES. If matmul time is a small fraction of a busy timeline, you are memory-bound and compilation is the lever. If you see generic or fallback kernels where tensor-core kernels should be, the shapes are missing the fast path - dimensions not multiples of eight or sixteen, an unusual dtype combination, a non-contiguous tensor forcing a copy. That last one produces exactly this symptom: a busy GPU at very low MFU, and padding a dimension can be a large fix. WHAT I WOULD EXPECT TO FIND, in rough order of likelihood at 18%. Input-bound, most often. A straggler, on a large cluster. Exposed communication, if the model is small relative to the device count so there is little compute to hide it behind. Shapes missing the fast path, which is under-diagnosed because the GPU looks busy. And a model that is simply too small for the hardware, where the matmuls cannot fill the device - in which case a larger batch or fewer devices is the answer rather than any optimization. THE ONE THAT WOULD SURPRISE ME. A correctly-shaped, compute-bound, well-fed transformer sitting at 18%. If all four experiments come back clean I would suspect the MFU calculation itself - the wrong peak for the precision, embeddings counted inconsistently in the parameter count, or the attention term omitted at long context, which understates the FLOPs and therefore the MFU. Verifying the denominator is worth doing before concluding the system is broken, and it takes five minutes."
          }
        },
        {
          "q": "What should be on by default in any training pipeline, regardless of profiling?",
          "a": "I WOULD SEPARATE THESE FROM OPTIMIZATIONS, because they are not exchanges - they cost essentially nothing and protect against outcomes that are expensive. NUMERICAL AND PRECISION. bf16 autocast where the hardware supports it, with NO GradScaler. It halves activation memory, speeds memory-bound work, and removes the loss-scaling subsystem entirely. On older hardware, fp16 with a scaler and the unscale-clip-step ordering. TF32 for matmuls, which is nearly free. STABILITY. A finite-gradient check before the optimizer step, which converts an unrecoverable poisoning into a logged skip for the cost of one reduction - and note this is the thing you lose when you delete the fp16 scaler, so bf16 users must add it explicitly. Gradient clipping with a threshold measured from your own gradient-norm distribution rather than inherited. And zero_grad with set_to_none. CORRECTNESS UNDER DISTRIBUTION. Broadcast or verify identical parameters at startup, because ranks that begin differently optimize different models while averaging gradients - which trains, converges worse, and never errors. Assert equal data-shard counts, because unequal counts hang rather than error. And ensure the skip decision is consistent across ranks, or replicas diverge permanently. CHECKPOINTING. Frequent enough that a rollback is cheap, and including the optimizer state, scheduler, scaler, RNG state and the DATA LOADER POSITION - that last one is routinely omitted and means a resume silently re-trains on data already seen, which matters enormously for single-pass training. OBSERVABILITY, which is the part most often missing and the cheapest to add. MFU, because it is the one absolute number. Step time split into data and compute. Per-rank step time, or at least the max-to-median ratio, so a straggler is visible. Peak memory with an alert on the trend. Gradient norm and clip fraction. The effective batch size, which silently changes when someone adds GPUs. Loss scale if using fp16. Accumulate these on the device and transfer once per interval, because a .item() per metric per step is a synchronization that measurably slows training - which would be an absurd way for a monitoring system to fail. AND ONE ALERT: no completed steps for some interval, because a HANG is the characteristic distributed failure and it needs an explicit detector rather than a human noticing. WHY THIS LIST IS DEFENSIBLE WITHOUT PROFILING. Every item either costs under a percent or costs nothing at all, and each protects against a failure that is silent and expensive - a dead run, a corrupted resume, a straggler nobody noticed for a week, a divergence with no diagnostic data. That is a different calculation from an optimization, whose value depends on which resource binds. Conflating the two is why pipelines often have neither: the guards get treated as optimizations and deferred until there is time to measure."
        },
        {
          "q": "Summarize what this module has been about.",
          "a": "THAT EVERY TECHNIQUE HERE IS AN EXCHANGE - it buys one scarce resource by spending another - and that THE EXCHANGE RATE IS A PROPERTY OF YOUR CONFIGURATION rather than of the technique. Mixed precision spends numerical headroom for memory, bandwidth and arithmetic, and buys nothing if you are input-bound. Compilation spends compile time and debuggability for fusion and fewer launches, and buys almost nothing if you are matmul-dominated. Checkpointing spends about a third of your compute for O(sqrt(L)) activation memory, and buys nothing if parameters rather than activations dominate. Accumulation spends wall-clock for effective batch, and buys nothing above the critical batch size. Sharding spends communication for capacity, and hurts if you were already communication-bound. Stability guards spend a fraction of throughput for protection against events that cost everything since the last checkpoint. And the data-pipeline choices spend storage, randomness or sample freshness for the ability to keep the accelerators fed at all. THE DISCIPLINE THAT FOLLOWS. Measure which resource binds, apply the lever that targets that resource, and re-measure - because optimizing a system RE-ORDERS its bottlenecks. The most memorable illustration is that after the parameter-side techniques have all done their work on a large fine-tune, the biggest remaining allocation can be the logits tensor: a term that did not become expensive, but stopped being dwarfed. A plan fixed in advance is wrong by its second step. THE HARD DEPENDENCY AT THE TOP. If the accelerator is idle, every technique in the module makes the accelerator faster or fit more onto it, and the accelerator is not the constraint. So the is-the-GPU-busy question is not the first step of an investigation, it determines whether the investigation applies. THE OBJECTIVE THAT SHOULD DECIDE. Time to a target loss, not step time - because checkpointing and accumulation make step time worse by construction and would be rejected by any procedure that optimizes it. That objective is the product of a statistical factor, how many steps the optimization needs, and a systems factor, how long each takes. Those pull against each other, which is why this cannot be reduced to a list. THE CONTRAST WITH THE PREVIOUS MODULE, which sharpens both. Module 15 was about abstractions hiding mechanisms that fail SILENTLY, so its discipline was to build diagnostics - the failure hides. This module is about deliberate trades whose benefits are INVISIBLE without measurement - the gain hides. Both demand instruments, for opposite reasons, and the profiler and the memory budget serve both. THE ONE-SENTENCE VERSION. Performance work in machine learning is not a list of techniques to apply but a sequence of measurements that tell you which single technique to apply next, and the most expensive mistake is spending a technique's price on a resource that was not the constraint."
        },
        {
          "q": "How would you hand this pipeline over to a team that did not build it?",
          "a": "THE PROBLEM WITH AN OPTIMIZED PIPELINE is that every technique in it encodes a decision made against a measurement that is no longer visible. Someone inheriting it sees checkpointing enabled and cannot tell whether activations were the binding term or whether it was added in a panic two years ago - and the cost of the wrong assumption is either a third of the compute or an out-of-memory. So the handover is mostly about restoring the reasoning. WHAT I WOULD DOCUMENT. (1) THE BUDGET AS MEASURED: which memory term bound and which time term bound, with the numbers and the date. This is the single most valuable artefact because it is what every configuration choice was derived from. (2) WHY EACH TECHNIQUE IS ON, in one line each, naming the term it addresses. Checkpointing because activations were 60% of peak. ZeRO-1 because optimizer state did not fit. Compile because 40% of step time was memory-bound kernels. That converts a configuration into a chain of reasoning. (3) THE MEASURED MFU and what it was before the work, which tells the next person how much headroom remains and therefore whether further optimization is worth their time. (4) THE INTERACTIONS THAT WERE DISCOVERED - the checkpoint boundaries aligned with FSDP units, the no_sync placement, the reason bf16 rather than fp16 - because these are precisely the things that look arbitrary and get tidied away by someone cleaning up the code. (5) THE THINGS DELIBERATELY NOT DONE, and why. That is as valuable as what was done, because it stops the next person repeating an experiment that failed. WHAT I WOULD LEAVE AS RUNNABLE ARTEFACTS rather than prose, since documentation drifts. A benchmark script that reproduces the key measurements - loader-only throughput, step-only time, MFU, per-rank distribution - so the budget can be re-derived in an afternoon rather than reconstructed. A structural test suite: parameter count, checkpoint round trip, gradient-flow check, and the sharded-versus-unsharded equivalence check if applicable. And the golden-output test, so a library upgrade that changes numerics is caught rather than discovered. WHAT I WOULD FLAG AS FRAGILE. Anything tuned to a specific hardware configuration - the wrapping granularity, the bucket sizes, the micro-batch - because those will need re-measuring on different hardware and will silently underperform if not. Anything that depends on shapes, because the recompile cliff is silent. And the effective batch size, because it changes when someone changes the device count and it changes the optimization problem rather than only the infrastructure. THE PRINCIPLE I WOULD STATE TO THEM. Every setting here was an exchange chosen against a measured constraint. If the model, the data, the batch size or the hardware changes, the constraint probably changed too, and the right response is to re-run the budget rather than to preserve the configuration. A pipeline is not a recipe; it is the output of a procedure, and the procedure is the thing worth inheriting."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The module's thesis",
        "back": "Every technique is an EXCHANGE - it buys one scarce resource by spending another - and the exchange RATE is a property of YOUR configuration, not of the technique. So the discipline is: measure which resource binds, apply that lever, RE-MEASURE."
      },
      {
        "type": "intuition",
        "front": "Step 0 is a hard dependency",
        "back": "IS THE ACCELERATOR BUSY? Run the loop on SYNTHETIC data. If the job is input-bound, mixed precision / compile / checkpointing / sharding all make the accelerator faster or fit more onto it - and it is IDLE. Nothing else applies until this is fixed."
      },
      {
        "type": "formula",
        "front": "Map each budget term to its lever",
        "back": "grad+opt (14P_t) -> LoRA or ZeRO-1. weights (2P) -> quantize or ZeRO-3. activations -> micro-batch FIRST, then segmented checkpointing. LOGITS (B*T*V*3) -> chunked cross-entropy. memory-bound kernels -> compile. exposed comms -> prefetch/hybrid/no_sync. idle -> straggler or .item()."
      },
      {
        "type": "pitfall",
        "front": "Optimization RE-ORDERS bottlenecks",
        "back": "Halving a component that was 50% makes everything else 67% of the new total. A prepared list applied top-to-bottom without re-profiling converges to optimizing things that stopped mattering three changes ago."
      },
      {
        "type": "pitfall",
        "front": "Do NOT optimize step time",
        "back": "Checkpointing and accumulation make step time worse BY CONSTRUCTION, so that objective rejects them regardless of whether they helped. Minimize n_steps(B_eff) x t_step - the product - which means running to a TARGET LOSS."
      },
      {
        "type": "intuition",
        "front": "The logits term stops being dwarfed",
        "back": "After LoRA, quantization and mixed precision have done their work, B*T*V*3 can be the LARGEST remaining allocation. It did not get more expensive - everything around it got cheap. The clearest instance of bottleneck re-ordering."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing x QLoRA, and x FSDP",
        "back": "QLoRA: the recomputed forward DEQUANTIZES the 4-bit base a second time. FSDP: if a checkpointed region spans FSDP units, recomputation triggers their parameter ALL-GATHERS again - recompute now costs BANDWIDTH. Align the boundaries."
      },
      {
        "type": "pitfall",
        "front": "fp16 -> bf16 deletes your skip guard",
        "back": "The GradScaler was ALSO doing skip-on-non-finite. Deleting it removes that protection, and the loop that was guarded now is not. The most commonly missing guard in a bf16 training loop - precisely because it was previously invisible."
      },
      {
        "type": "pitfall",
        "front": "Adding GPUs changes the OPTIMIZATION problem",
        "back": "effective batch = micro x accum x world_size. 8 -> 64 devices is an 8x batch increase needing a LR change. A run that diverges after scaling out is usually the linear scaling rule WITHOUT warmup, not a distributed bug. Log the effective batch."
      },
      {
        "type": "intuition",
        "front": "Guards are not optimizations",
        "back": "bf16 autocast, the finite-gradient check, clipping with a MEASURED threshold, frequent checkpoints including the LOADER POSITION, and the metrics set - each costs ~0 and protects against a silent, expensive failure. Different calculation from an exchange, so different threshold."
      },
      {
        "type": "intuition",
        "front": "Convert an optimization to days and dollars",
        "back": "FLOPs = 6ND; rate = n_dev x peak x MFU; time = ratio. 30% -> 40% MFU on a 19-day job saves ~6 days and a quarter of the budget. And Amdahl lets you DECLINE work with a number: a 15% component caps the gain at 17%."
      },
      {
        "type": "intuition",
        "front": "Module 15 vs Module 16",
        "back": "15: abstractions hide mechanisms that fail SILENTLY - build diagnostics, because the FAILURE hides. 16: deliberate trades whose benefits are INVISIBLE without measurement - profile, because the GAIN hides. Both demand instruments, for opposite reasons."
      }
    ],
    "refs": [
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      },
      {
        "title": "Chowdhery et al. (2022), PaLM: Scaling Language Modeling with Pathways",
        "url": "https://arxiv.org/abs/2204.02311"
      },
      {
        "title": "Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "Hoffmann et al. (2022), Training Compute-Optimal Large Language Models (Chinchilla)",
        "url": "https://arxiv.org/abs/2203.15556"
      },
      {
        "title": "PyTorch: Performance tuning guide",
        "url": "https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html"
      }
    ],
    "demos": [
      "scaling-laws",
      "batching",
      "mixed-precision",
      "lr-schedule"
    ]
  },
  "ddp": {
    "interview": {
      "quickGrind": [
        {
          "q": "What does data parallelism replicate and what does it split?",
          "a": "It replicates the model on every device and splits the batch. Each device computes gradients on its shard, and the gradients are averaged so all replicas stay identical."
        },
        {
          "q": "Why is averaging the shard gradients correct?",
          "a": "Because the loss is a mean over examples, so the gradient of the full-batch mean is the mean of the per-shard gradients. Exact, not an approximation — each shard's gradient alone is wrong, and their average is exactly right."
        },
        {
          "q": "Why communicate gradients rather than weights?",
          "a": "If every replica starts identical and applies the same averaged gradient with the same optimizer state, the weights stay identical by construction. Syncing gradients is sufficient."
        },
        {
          "q": "What is all-reduce?",
          "a": "A collective where every rank contributes a tensor and every rank ends up with the reduction — here the sum or mean — of all contributions."
        },
        {
          "q": "Why ring all-reduce rather than a parameter server?",
          "a": "A server is a bandwidth bottleneck scaling with N. The ring moves about 2(N-1)/N times the data per rank, which is essentially 2D and FLAT in N."
        },
        {
          "q": "What are the ring's two phases?",
          "a": "Reduce-scatter, after which each rank holds one fully-reduced chunk, then all-gather to distribute those chunks. N-1 steps each."
        },
        {
          "q": "What is gradient bucketing?",
          "a": "Grouping gradients into buckets and launching the all-reduce for a bucket as soon as it is full, so communication overlaps with the rest of the backward pass instead of waiting for it."
        },
        {
          "q": "What does DistributedSampler do?",
          "a": "Gives each rank a disjoint shard of the indices, reshuffled per epoch from a shared seed. Forget to call set_epoch and every epoch sees the same order."
        },
        {
          "q": "Why does DDP use one process per GPU?",
          "a": "To avoid the GIL. The older single-process multi-GPU DataParallel serializes on Python and adds a scatter-gather every step, which is why it is deprecated."
        },
        {
          "q": "What is the linear scaling rule?",
          "a": "Multiply the learning rate by the number of workers when you multiply the batch, with a warmup. A heuristic that holds over a useful range and breaks at very large batch."
        },
        {
          "q": "When does data parallelism stop being enough?",
          "a": "When one replica does not fit on one device. Then you shard the model state — ZeRO stages, FSDP — or partition the model itself with tensor or pipeline parallelism."
        },
        {
          "q": "What does batch norm do across ranks?",
          "a": "By default it normalizes over the LOCAL batch only, so statistics differ per rank. With small per-device batches that is a real accuracy difference; SyncBatchNorm computes them across ranks at a communication cost."
        }
      ],
      "standard": [
        {
          "q": "Explain why averaging per-shard gradients is exactly right, and what that fact does and does not license.",
          "a": "The training loss is a mean over the batch, L = (1/B) sum_i l_i. Split the batch into N shards of equal size; each rank computes the mean loss over its shard, so its gradient is the mean of its own l_i terms. Averaging those N gradients gives (1/N) sum_ranks (N/B) sum_{i in rank} grad l_i = (1/B) sum_i grad l_i, which is exactly the full-batch gradient. So it is an identity, not an approximation — and this is the entire correctness basis of data-parallel training. Each individual shard gradient is WRONG in the sense that it saw a fraction of the data, and their average is exactly right, which is a nice thing to be able to state cleanly. What it licenses: a data-parallel run is mathematically identical to a single-device run at the larger batch size, so you can reason about it as one big batch and the trajectories match to numerical precision. What it does NOT license is the assumption that any loss decomposes this way. The identity requires the loss to be a per-example MEAN, so it fails for anything computing statistics across the batch — a contrastive loss whose denominator ranges over the whole batch is not a per-example mean, and naively data-paralleling it changes the objective, because each rank's in-batch negatives are only its own shard. That is why contrastive training gathers embeddings across ranks before computing the loss, and it is also why gradient accumulation, which relies on the same identity, silently breaks for those losses.",
          "deepDive": {
            "q": "What about unequal shard sizes?",
            "a": "Then the plain average is wrong, because it weights each rank equally rather than each example. The last batch of an epoch is the usual culprit when the dataset does not divide evenly, and DistributedSampler pads by default precisely to avoid this. If you must handle ragged shards, weight each rank's contribution by its example count rather than taking a plain mean — and note that a rank that finishes early and stops participating will hang the collective, which is the other failure this creates."
          }
        },
        {
          "q": "Derive the ring all-reduce cost and say why it beats the obvious alternatives.",
          "a": "Take N ranks each holding a gradient vector of D elements, and split each into N chunks. Reduce-scatter runs N-1 steps; in each, every rank sends one chunk to its neighbour and adds the chunk it receives, and after N-1 steps each rank holds one chunk that is the fully-reduced sum for that slice. All-gather then runs another N-1 steps passing those completed chunks around the ring until everyone has all of them. Each rank therefore sends 2(N-1) chunks of size D/N, so 2(N-1)D/N elements — which approaches 2D as N grows and is INDEPENDENT of N. That flatness is the whole point. Compare the alternatives. A parameter server receives D from each of N-1 ranks and sends D back, so its traffic is O(ND) and it becomes the bottleneck as you scale — the algorithm is fine, the topology is not. A naive all-gather where everyone broadcasts their full gradient moves (N-1)D per rank, linear in N. The ring is also bandwidth-optimal in the sense that 2D(N-1)/N is a lower bound for this collective under a bandwidth model, so it is not merely a good heuristic. The practical caveats: latency scales with N since there are 2(N-1) sequential steps, so for small tensors on many ranks a tree or hierarchical algorithm wins, which is why NCCL picks an algorithm based on message size and topology rather than always using a ring. And the ring assumes roughly uniform link bandwidth, so real multi-node clusters use hierarchical variants that reduce within a node over fast interconnect first, then across nodes.",
          "deepDive": {
            "q": "So why does NCCL not always use a ring?",
            "a": "Because the ring optimizes bandwidth and pays in latency: it takes 2(N-1) sequential steps, and for a small tensor across many ranks that latency dominates while the bandwidth saving is irrelevant. Tree algorithms finish in O(log N) steps and win there. NCCL therefore selects an algorithm from message size and topology rather than committing to one, and on real multi-node clusters it goes hierarchical - reduce within a node over NVLink first, then across nodes over the slower fabric, then broadcast back down - because the ring assumes roughly uniform link bandwidth and a real cluster is not uniform at all."
          }
        },
        {
          "q": "How does DDP overlap communication with computation, and why does it matter?",
          "a": "Naively you would run the whole backward pass, then all-reduce all the gradients — a compute phase followed by a communication phase, with the devices idle during each other's turn. Since the gradients for the LAST layers are ready first and the backward pass continues for a while afterwards, that idle time is avoidable. DDP registers an autograd hook on every parameter and groups parameters into buckets, typically around 25 MB. When every gradient in a bucket has been produced, that bucket's all-reduce launches immediately on a separate stream while the backward pass continues computing earlier layers. By the time backward finishes, most of the communication has already happened underneath it. This is why the practical scaling efficiency is far better than a naive model predicts — the useful mental model is speedup = N * t_compute / (t_compute + t_exposed_comm), where the exposed communication is only the part that could not be hidden, often 20% or less of the total. Two consequences worth knowing. First, bucket size is a real tuning knob: too small and you pay per-collective launch overhead many times, too large and the first bucket waits a long time before it can start. Second, this is why parameter ORDER matters — DDP assumes the backward produces gradients in roughly reverse construction order, and a model whose forward uses parameters in an unusual order can produce buckets that fill late, which shows up as worse scaling for no obvious reason. It is also why unused parameters need find_unused_parameters, since a bucket waiting on a gradient that never arrives will hang."
        },
        {
          "q": "You scale from 1 GPU to 8 and get 5x. Where did the other 3x go?",
          "a": "Work through the candidates in order of how often they are the answer. First, the data pipeline: at 8x the throughput you need 8x the input rate, and a loader that was comfortably ahead on one GPU is now the bottleneck — the tell is that GPU utilization is low and roughly equal on all ranks, and the fix is more workers, prefetching, or a faster storage path rather than anything to do with distribution. Second, exposed communication: check whether the gradients are large relative to compute, which is the usual case for a small model on fast GPUs, since the ratio that matters is bytes-per-step over FLOPs-per-step and a small model has a bad one. Gradient compression or a larger per-device batch both improve it. Third, load imbalance: with variable-length inputs, every step is as slow as the slowest rank because the collective is a synchronization barrier, so a long-tail sequence length distribution silently costs you the tail on every single step — length-grouped batching is the standard fix and often recovers a surprising amount. Fourth, the last-batch and validation phases, which are often not parallelized at all and quietly eat into Amdahl's fraction. Fifth, per-step fixed costs — optimizer overhead, logging, checkpointing every N steps — which do not shrink with more devices. The diagnostic discipline is to measure a step's breakdown rather than guess: time the forward, backward, communication and data wait separately, on every rank, and the profile usually names the answer immediately."
        },
        {
          "q": "When do you move beyond data parallelism, and to what?",
          "a": "The trigger is capacity rather than speed: data parallelism replicates the whole model on every device, so the moment one replica's parameters plus gradients plus optimizer state exceed one device's memory, adding devices does not help at all. With Adam in mixed precision the per-parameter cost is about 16 bytes — fp16 weights, fp16 gradients, fp32 master weights, and Adam's two moments — so a 7B model needs roughly 112 GB of state, which fits nothing, and data parallelism is FLAT in N for this quantity. The response is to shard that state. ZeRO stage 1 shards the optimizer state, taking per-device cost to 4P + 12P/N; stage 2 adds gradients at 2P + 14P/N; stage 3, which is FSDP, shards the parameters too and reaches 16P/N. Stage 3 gathers each layer's parameters just before it is needed and frees them after, so peak parameter memory is the shard plus the largest single layer rather than the whole model. The cost is communication: stages 1 and 2 keep DDP's roughly 2D volume, while stage 3 adds parameter all-gathers in both forward and backward for about 1.5x DDP. Beyond that, when a single LAYER does not fit, you need tensor parallelism, which splits individual matrices across devices and communicates within each layer, so it wants very fast interconnect and is normally kept within a node. Pipeline parallelism splits by layer across nodes and trades a bubble for much lower communication. Real large-scale training composes all three, and the composition order follows the interconnect hierarchy."
        },
        {
          "q": "What silently breaks when you move a working single-GPU script to DDP?",
          "a": "A specific and well-known list, and most of them fail quietly rather than loudly. The sampler: without DistributedSampler every rank iterates the whole dataset, so you are training on N copies of everything and the epoch means something different — and with it, forgetting set_epoch(epoch) means the shuffle is identical every epoch, which degrades training in a way that looks like a learning-rate problem. Batch norm normalizes over the local batch, so at a small per-device batch the statistics are noisy and differ per rank; that is a real accuracy gap and SyncBatchNorm is the fix if you can afford the communication. Metrics and logging: every rank computes its own, so unless you reduce them you are logging rank 0's shard rather than the epoch, and validation numbers are quietly computed on 1/N of the data. Checkpointing from all ranks races on the file; save from rank 0 and barrier. Random seeds that are identical across ranks make every rank apply the same dropout mask and the same augmentation, which reduces effective diversity — seed by rank. And anything conditional that differs between ranks will deadlock, because a collective is a barrier: if one rank takes an early-exit branch, or has a different number of batches, or hits an exception, the others wait forever, which is why a DDP job that hangs with no error is usually a control-flow divergence rather than a network problem."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Why gradient averaging is exact",
        "back": "The loss is a per-example mean, so the mean of shard gradients IS the full-batch gradient. Each shard alone is wrong; the average is exactly right."
      },
      {
        "type": "pitfall",
        "front": "Losses that are not per-example means",
        "back": "A contrastive loss's denominator ranges over the batch, so data-paralleling it changes the objective. Gather embeddings across ranks first — and the same breaks gradient accumulation."
      },
      {
        "type": "formula",
        "front": "Ring all-reduce volume",
        "back": "2(N-1)D/N per rank, approaching 2D and FLAT in N. Parameter server is O(ND); naive all-gather is (N-1)D."
      },
      {
        "type": "definition",
        "front": "Ring's two phases",
        "back": "Reduce-scatter (N-1 steps, each rank ends with one fully-reduced chunk), then all-gather (N-1 steps to distribute them)."
      },
      {
        "type": "intuition",
        "front": "Why bucketing matters",
        "back": "Last layers' gradients are ready first, so launching a bucket's all-reduce immediately hides most communication under the remaining backward pass."
      },
      {
        "type": "formula",
        "front": "Realistic scaling model",
        "back": "speedup = N * t_compute / (t_compute + t_exposed_comm), where exposed comm is only the part bucketing could not hide — often under 20%."
      },
      {
        "type": "formula",
        "front": "ZeRO stage memory",
        "back": "~16 bytes/param for Adam mixed precision. DDP 16P flat; ZeRO-1 4P+12P/N; ZeRO-2 2P+14P/N; ZeRO-3/FSDP 16P/N."
      },
      {
        "type": "intuition",
        "front": "Why DDP is flat in N for capacity",
        "back": "Every device holds a full replica, so adding devices never helps if one replica does not fit. Capacity, not speed, is the trigger to shard."
      },
      {
        "type": "pitfall",
        "front": "Forgetting set_epoch",
        "back": "The shuffle is then identical every epoch. Degrades training in a way that reads like a learning-rate problem."
      },
      {
        "type": "pitfall",
        "front": "Local batch norm statistics",
        "back": "BN normalizes over the LOCAL batch, so ranks differ and small per-device batches give noisy statistics. A real accuracy gap, not a rounding issue."
      },
      {
        "type": "pitfall",
        "front": "Load imbalance with variable lengths",
        "back": "A collective is a barrier, so every step costs the slowest rank. Length-grouped batching often recovers a surprising amount."
      },
      {
        "type": "pitfall",
        "front": "A DDP job that hangs with no error",
        "back": "Usually control-flow divergence — one rank took a different branch, had fewer batches, or raised. The others wait on the collective forever."
      }
    ],
    "refs": [
      {
        "title": "Li et al. (2020) — PyTorch Distributed: Experiences on Accelerating Data Parallel Training",
        "url": "https://arxiv.org/abs/2006.15704"
      },
      {
        "title": "Rajbhandari et al. (2019) — ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "Goyal et al. (2017) — Accurate, Large Minibatch SGD (linear scaling rule and warmup)",
        "url": "https://arxiv.org/abs/1706.02677"
      },
      {
        "title": "Zhao et al. (2023) — PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel",
        "url": "https://arxiv.org/abs/2304.11277"
      },
      {
        "title": "Patarasuk & Yuan (2009) — Bandwidth Optimal All-reduce Algorithms for Clusters of Workstations",
        "url": "https://www.sciencedirect.com/science/article/pii/S0743731508001767"
      }
    ],
    "demos": []
  }
};
