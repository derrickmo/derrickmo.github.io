// GENERATED from content/lessons/training-systems/gradient-checkpointing.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/gradient-checkpointing/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "mixed-precision": "Mixed Precision",
      "quantization": "Quantization",
      "batching": "Dynamic Batching",
      "backprop": "Backprop Graph"
    }
  }
};
