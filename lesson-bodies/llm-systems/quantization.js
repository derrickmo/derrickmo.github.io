// GENERATED from content/lessons/llm-systems/quantization.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/quantization/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "quantization": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Quantization is the inference regime's central technique, and the reason it works so well is the one this module keeps returning to: generating a token requires READING every weight to perform one token's worth of arithmetic, so decoding is memory-bandwidth-bound with an arithmetic intensity near one. Four-bit weights are four times fewer bytes to stream, so decoding is roughly four times faster - and the speedup is BANDWIDTH, not arithmetic. That is why quantization transforms inference and barely helps training, which is compute-bound and where the arithmetic is what you are paying for.",
        "The technical problem is a distributional one. Quantizing means mapping a continuous range onto a small set of levels using a scale set by the extremes, and transformers have OUTLIERS: beyond roughly 6.7B parameters a small number of activation feature dimensions carry magnitudes one to two orders larger than everything else, consistently across layers and tokens, and they are functionally essential rather than noise. One such value stretches the range so the ordinary weights land on one or two levels, and the information in them is destroyed. Every method in this lesson is an answer to that single observation: isolate the outliers, contain them with fine-grained scales, give them more resolution, or migrate the difficulty somewhere it hurts less.",
        "The methods then differ in how much work they do at quantization time. Naive round-to-nearest is instant and degrades badly at four bits. GPTQ spends a calibration pass solving, layer by layer, for the quantized weights that best preserve each layer's OUTPUT rather than its weights - a second-order procedure. AWQ observes that salience is determined by ACTIVATION magnitude rather than weight magnitude, and scales the important channels up before quantizing so they get effectively more resolution. And quantization-aware training goes further, simulating quantization during training so the weights adapt to it - the most accurate and by far the most expensive. Which you want depends on how much accuracy you need and whether you can afford to train."
      ],
      "math": [
        {
          "h": "Affine quantization, and where the scale comes from",
          "paras": [
            "Map a floating-point range onto b-bit integers with a scale and a zero point. The scale is set by the extremes of whatever group you quantize together, which is why outliers are so damaging.",
            "The granularity of that group - per tensor, per channel, or per small block - is the first and most consequential design choice."
          ],
          "tex": "q = \\mathrm{round}\\!\\Big(\\frac{x}{s}\\Big) + z, \\quad \\hat{x} = s\\,(q - z), \\qquad s = \\frac{\\max(x) - \\min(x)}{2^{b} - 1}",
          "texNote": "The scale is a function of the MAXIMUM. So one value fifty times larger than the rest means the others occupy the bottom 2% of the range and, with sixteen levels, nearly all land on the same one or two codes. Per-tensor quantization is therefore fragile and per-channel or per-block is standard - a block of 64 or 128 weights sharing a scale bounds the damage an outlier can do to its own neighbourhood."
        },
        {
          "h": "GPTQ: minimize the layer's OUTPUT error, not its weight error",
          "paras": [
            "Rounding each weight to its nearest level minimizes weight error, which is not what you care about. What matters is the layer's output on real activations, and the two are different objectives.",
            "GPTQ quantizes weights one at a time and, after each, updates the remaining unquantized weights to compensate for the error just introduced - using the Hessian of the layer's reconstruction objective."
          ],
          "tex": "\\min_{\\hat{W}} \\; \\big\\lVert WX - \\hat{W}X \\big\\rVert_2^2, \\qquad H = 2XX^{\\top} \\;\\;(\\text{from calibration data})",
          "texNote": "The X is why calibration data is needed: the objective is defined on the activations the layer actually sees. The compensation step is the substance - having rounded one weight down, the others are adjusted to absorb the resulting output error, so the errors do not simply accumulate. That is what makes second-order methods substantially better than round-to-nearest at four bits and below."
        },
        {
          "h": "AWQ: salience comes from activations, not weights",
          "paras": [
            "A weight matters in proportion to the magnitude of the activation it multiplies, not to its own magnitude. So the channels worth protecting are identified from calibration statistics on the inputs.",
            "Scaling a salient channel up before quantizing gives it effectively more resolution, with the inverse scale folded into the preceding operation so the function is unchanged."
          ],
          "tex": "\\hat{y} = Q(W \\cdot \\mathrm{diag}(s)) \\cdot \\mathrm{diag}(s)^{-1} x, \\qquad s_j \\propto \\big(\\overline{|x_j|}\\big)^{\\alpha}",
          "texNote": "Note it is mathematically the identity before quantization - the scale and its inverse cancel - so this changes nothing about the function and everything about where the quantization error lands. Protecting even a small percentage of channels by activation salience recovers most of the loss from four-bit quantization, which is a striking result and the reason AWQ needs no weight updates at all."
        }
      ],
      "code": [
        {
          "h": "The outlier problem, and the granularity that contains it",
          "paras": [
            "Worth reproducing once, because the failure is dramatic and it explains why every method in this lesson exists."
          ],
          "code": "def quantize_int8(x, bits=8):\n    s = (x.max() - x.min()) / (2**bits - 1)\n    return torch.round(x / s) * s\n\n# THE OUTLIER FAILURE, in three lines:\nw = torch.randn(1024)\nprint((w - quantize_int8(w)).abs().mean())          # small - fine\nw[0] = 50.0                                          # ONE outlier\nprint((w - quantize_int8(w)).abs().mean())          # MUCH worse - the other\n                                                     # 1023 weights now occupy\n                                                     # the bottom 2% of the range\n\n# WHY THIS MATTERS AT SCALE. Beyond roughly 6.7B parameters, transformers\n# develop a handful of ACTIVATION feature dimensions with magnitudes 10-100x\n# the rest. They appear in the SAME dimensions across layers and tokens, they\n# emerge abruptly with scale, and zeroing them COLLAPSES the model - so they\n# are functionally essential, not noise. Naive per-tensor quantization degrades\n# sharply at exactly the scale where you most want it.\n\n# THE FOUR RESPONSES, all to that one observation:\n#   LLM.int8()   ISOLATE  - compute outlier dimensions in fp16, the rest int8\n#   block-wise   CONTAIN  - a scale per 64/128 weights, so damage is local\n#                           (this is QLoRA's NF4 approach)\n#   AWQ          RESCALE  - give salient channels more effective resolution\n#   SmoothQuant  MIGRATE  - shift difficulty from activations to weights via a\n#                           per-channel scaling that cancels between them\n\n# GRANULARITY is the first and most consequential choice:\n#   per-TENSOR    one scale for everything - fragile, but one number to store\n#   per-CHANNEL   one per output channel - the practical default\n#   per-BLOCK     one per 64-128 weights - most robust; the scales themselves\n#                 become a memory cost (0.5 bits/param at fp32 per 64), which\n#                 is why QLoRA quantizes the scales too",
          "caption": "One outlier in a thousand weights, and the other 999 collapse onto a couple of codes. Every method in this lesson is a different answer to that - isolate, contain, rescale, or migrate."
        },
        {
          "h": "The four methods, and how to choose",
          "paras": [
            "They differ in how much work happens at quantization time and whether they need training. That is the axis to decide on."
          ],
          "code": "# 1. ROUND-TO-NEAREST (naive PTQ). Instant, no data. Acceptable at 8 bits,\n#    degrades badly at 4.\n\n# 2. GPTQ - second-order, layer-by-layer, with a calibration set.\n#    Objective: minimize ||WX - W_hat X||^2, NOT ||W - W_hat||^2. The layer's\n#    OUTPUT is what matters, and X is why calibration data is required.\n#    Quantize weights one at a time; after each, UPDATE the remaining\n#    unquantized weights to absorb the error just introduced, using H = 2XX^T.\n#    -> errors compensate instead of accumulating. Minutes to hours per model.\n\n# 3. AWQ - the insight is that SALIENCE COMES FROM ACTIVATIONS, not weights.\n#    A weight matters in proportion to the activation it multiplies.\ns = (act_abs_mean ** alpha)              # per-channel, from calibration stats\nWq = quantize(W * s); y = (Wq @ (x / s)) # the scale CANCELS mathematically -\n                                          # identical function, different error\n#    Protecting even ~1% of channels by activation salience recovers most of\n#    the 4-bit loss, and it needs NO weight updates at all.\n\n# 4. QAT - simulate quantization DURING training with a straight-through\n#    estimator, so the weights ADAPT to it.\nw_q = w + (quantize(w) - w).detach()     # forward quantized, backward identity\n#    Most accurate, especially below 4 bits. Requires a training run, which is\n#    why it is reserved for cases where PTQ is not good enough.\n\n# THE SELECTION LADDER:\n#   8-bit weights          -> round-to-nearest is usually fine\n#   4-bit weights, serving -> AWQ or GPTQ (calibrate on IN-DOMAIN data)\n#   below 4 bits, or a\n#     hard accuracy target -> QAT\n#   training a 4-bit base  -> QLoRA's NF4 (fixed codebook, no calibration -\n#                             right when you are about to train anyway)\n\n# AND THE THING PEOPLE MEASURE WRONG: multiple-choice ACCURACY is a step\n# function of logits and barely moves under quantization, while GENERATION\n# compounds small perturbations over hundreds of autoregressive steps and\n# samples from the TAIL, where the error is proportionally largest. Evaluate\n# with PERPLEXITY on in-domain text and with long-output generation, not with\n# a benchmark whose metric cannot see the difference.",
          "caption": "The methods are ordered by how much work they do at quantization time. And the evaluation note is the one that decides whether you ship a broken model: accuracy metrics are structurally unable to see quantization damage that generation reveals immediately."
        }
      ],
      "useCases": [
        "Serving a model that does not otherwise fit, which is the primary use - four-bit weights make a 70B model deployable on hardware that could not hold it in half precision, and the memory freed becomes KV cache and therefore batch size.",
        "Reducing decode latency, since generation is bandwidth-bound and fewer bytes per weight is a near-proportional speedup - a much larger effect than the same technique has on training.",
        "Fitting a frozen base for parameter-efficient fine-tuning, where the weights never accumulate updates so their precision only has to suffice for a forward pass and to pass gradients through.",
        "Quantizing the KV cache rather than the weights, which is the right target for long-context serving where the cache rather than the parameters dominates memory."
      ],
      "pitfalls": [
        "Using per-tensor quantization on a transformer. The scale is set by the maximum, and transformer activations have outlier dimensions one to two orders larger than the rest - so the ordinary weights collapse onto a couple of codes. Per-channel or per-block is standard.",
        "Evaluating with multiple-choice accuracy. It is a step function of the logits and rarely moves under quantization, so it is structurally unable to detect damage. Use perplexity on in-domain text and long-output generation, where errors compound and sampling reads the tail.",
        "Calibrating on out-of-domain data. GPTQ and AWQ both fit to the activations the layer actually sees, so a calibration set unlike your traffic optimizes the wrong objective - and the failure appears only in production.",
        "Minimizing weight error rather than output error. Round-to-nearest minimizes the wrong quantity; what matters is the layer's output on real activations, which is why second-order methods substantially outperform it at four bits.",
        "Expecting quantization to speed up training. Training is compute-bound and the arithmetic is what you are paying for; quantization reduces bytes read, which is the inference regime's constraint. The two regimes give very different answers here.",
        "Forgetting the scales are a memory cost. One fp32 scale per 64 weights is half a bit per parameter, which is 12.5% overhead on a four-bit format - which is why QLoRA quantizes the scales themselves and lands at about 4.13 bits.",
        "Quantizing the sensitive layers. Embeddings, the output head and normalization are cheap in parameters and disproportionately sensitive, so blanket quantization gives a model that runs and generates badly."
      ],
      "connections": [
        {
          "ref": "training-systems/mixed-precision",
          "text": "The training-side counterpart, and the asymmetry that explains both: a trainable weight needs enough precision to accumulate small updates, which is why an fp32 master copy exists; a frozen weight does not, which is why four bits suffice."
        },
        {
          "ref": "fine-tuning/qlora",
          "text": "Quantization applied to a frozen base during training, using a fixed NF4 codebook rather than calibration - the right choice when you are about to train anyway and want to quantize in seconds rather than hours."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why the memory freed matters: it becomes KV cache, which bounds the batch, which bounds arithmetic intensity, which bounds throughput. Quantization's benefit is realized through that chain rather than directly."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "The other side of the same bottleneck. Quantization reduces bytes read per token; speculation amortizes the read over more tokens. Different mechanisms against one constraint, and they compose."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Why the evaluation choice decides whether you ship a broken model. A benchmark whose metric is a step function cannot see distributional damage, and quantization is precisely a distributional change."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does quantization speed up LLM inference so much?",
          "a": "Decoding is memory-bandwidth-bound - you read every weight to produce one token - so four-bit weights are four times fewer bytes to stream. The win is bandwidth, not arithmetic."
        },
        {
          "q": "Why does it help training much less?",
          "a": "Training is compute-bound. Weights are amortized over many token-positions, so the arithmetic is what you are paying for and reducing bytes read helps far less."
        },
        {
          "q": "What is affine quantization?",
          "a": "Map a float range onto b-bit integers with a scale and zero point, where the scale is the range divided by the number of levels."
        },
        {
          "q": "Why are outliers so damaging?",
          "a": "The scale is set by the maximum, so one value much larger than the rest compresses everything else into a few codes and destroys the information in them."
        },
        {
          "q": "What is the transformer outlier phenomenon?",
          "a": "Beyond roughly 6.7B parameters, a handful of activation dimensions carry magnitudes 10 to 100 times the rest, consistently across layers and tokens, and they are functionally essential."
        },
        {
          "q": "What are the four responses to outliers?",
          "a": "Isolate them in higher precision (LLM.int8), contain them with block-wise scales (QLoRA), rescale salient channels (AWQ), or migrate difficulty from activations to weights (SmoothQuant)."
        },
        {
          "q": "What does GPTQ minimize?",
          "a": "The layer's OUTPUT error on calibration activations, not its weight error - and it updates the remaining unquantized weights after each step to absorb the error introduced."
        },
        {
          "q": "What is AWQ's insight?",
          "a": "Salience comes from ACTIVATION magnitude, not weight magnitude. Scaling salient channels up before quantizing gives them more effective resolution, with the inverse folded in so the function is unchanged."
        },
        {
          "q": "What is QAT?",
          "a": "Simulating quantization during training with a straight-through estimator, so the weights adapt to it. Most accurate, and it requires a training run."
        },
        {
          "q": "Why does calibration data matter?",
          "a": "Both GPTQ and AWQ fit to the activations the layer actually sees, so calibrating on data unlike your traffic optimizes the wrong objective."
        },
        {
          "q": "Why do accuracy benchmarks miss quantization damage?",
          "a": "Accuracy is a step function of logits and a small perturbation rarely flips a confident argmax. Generation compounds errors over hundreds of steps and samples from the tail."
        },
        {
          "q": "What is the memory cost of the scales?",
          "a": "One fp32 scale per 64 weights is half a bit per parameter - 12.5% overhead on four bits, which is why QLoRA quantizes the scales too and lands at about 4.13 bits."
        }
      ],
      "standard": [
        {
          "q": "How does quantization relate to pruning and other compression techniques?",
          "a": "THEY ATTACK THE SAME BOTTLENECK BY DIFFERENT MEANS, and organizing them that way makes the comparison useful rather than a list. THE BOTTLENECK, in the inference regime: bytes read per generated token. Anything that reduces it speeds up decoding roughly proportionally. QUANTIZATION reduces bytes PER PARAMETER. Four bits instead of sixteen is four times fewer bytes, and it keeps every parameter - the model's structure is unchanged and every weight still participates. That structural preservation is why it composes with everything and why it is the most widely deployed compression technique. PRUNING reduces the NUMBER of parameters, and it splits into two very different things. UNSTRUCTURED pruning zeroes individual weights, which achieves high sparsity with little quality loss and delivers almost no speedup on standard hardware, because a sparse matmul with irregular structure runs worse than a dense one - you have removed FLOPs the hardware was not charging you for and kept the memory access pattern that it was. It is a compression-on-disk technique unless you have hardware support for the specific sparsity pattern. STRUCTURED pruning removes whole channels, heads or layers, which genuinely shrinks the tensors and does speed things up - at a much larger quality cost, because you are removing capacity rather than redundancy. The gap between those two is the single most important thing to know about pruning and it is frequently elided. DISTILLATION also reduces the number of parameters, but by TRAINING a smaller model rather than deleting parts of a large one - so it recovers quality that structured pruning loses, at the cost of a training run. In practice structured pruning followed by a distillation-style recovery fine-tune is the strong recipe, and each part is doing what it is good at. LOW-RANK FACTORIZATION replaces a weight matrix with a product of two thinner ones, reducing both parameters and FLOPs. It works less well than one would hope on transformers, because the weight matrices are not especially low-rank - which is interesting given that LoRA shows the UPDATE is low-rank even though the weights are not. SPECULATIVE DECODING is the odd one out and worth naming as such: it does not reduce bytes read at all, it AMORTIZES the read over more tokens by verifying several per forward pass. So it composes with all of the above rather than competing. HOW THEY COMPOSE. Quantization and structured pruning stack multiplicatively on memory. Quantization and distillation stack - fewer parameters, fewer bytes each. Speculative decoding multiplies whatever you have. The practical stack is distil or prune to the right size, quantize the result, and speculate at serving time. WHICH I WOULD REACH FOR FIRST. Quantization, always - it is post-hoc, needs no training, preserves structure, has mature tooling, and delivers most of the available win. Pruning and distillation are for when quantization alone is insufficient, and they cost a training run. That ordering is not about which is most interesting; it is about cost per unit of benefit."
        },
        {
          "q": "Explain quantization for LLM inference - why it works and what makes it hard.",
          "a": "WHY IT WORKS SO WELL, and this is the regime argument. Generating one token requires reading EVERY weight in the model and the entire KV cache, to perform one token's worth of arithmetic. Arithmetic intensity is about one FLOP per byte against hardware ratios in the hundreds, so decoding is memory-bandwidth-bound and the accelerator idles waiting on memory. Four-bit weights are four times fewer bytes to stream, so decoding is roughly four times faster - and the speedup is BANDWIDTH, not arithmetic. That is why quantization transforms inference and helps training relatively little: training amortizes each weight read over batch times sequence positions, so it is compute-bound and the arithmetic is what you are paying for. Same technique, two regimes, very different value. WHAT MAKES IT HARD - the outlier phenomenon. Quantization maps a range onto a small set of levels, with the scale set by the extremes. Transformers beyond roughly 6.7B parameters develop a handful of ACTIVATION feature dimensions whose magnitudes are one to two orders larger than everything else. They appear in the same dimensions across layers and tokens, they emerge abruptly with scale, and zeroing them collapses the model - so they are functionally essential rather than noise to be clipped. One such value stretches the range so the ordinary weights occupy the bottom couple of percent, and with sixteen levels nearly all land on the same code. The information in them is destroyed. So naive quantization degrades sharply at exactly the scale where you most want it. THE FOUR RESPONSES, all to that one observation. ISOLATE - LLM.int8 detects outlier dimensions at runtime and computes those in fp16 while everything else is int8, exact for the outliers and cheap for the rest, at the cost of an irregular matmul. CONTAIN - block-wise scaling with a scale per 64 or 128 weights, so an outlier damages only its own neighbourhood. This is QLoRA's approach and it needs no calibration. RESCALE - AWQ identifies salient channels by ACTIVATION magnitude and scales them up before quantizing so they get more effective resolution, with the inverse scale folded into the adjacent operation so the function is mathematically unchanged. MIGRATE - SmoothQuant shifts difficulty from activations to weights with a per-channel scaling that cancels between them, since weights are much easier to quantize. THE METHODS BY EFFORT. Round-to-nearest is instant and fine at 8 bits, poor at 4. GPTQ spends a calibration pass minimizing each layer's OUTPUT error rather than its weight error, quantizing weights one at a time and updating the remaining ones to absorb the error just introduced - so errors compensate instead of accumulating. AWQ needs calibration statistics but no weight updates. QAT simulates quantization during training with a straight-through estimator so the weights adapt, which is most accurate and requires a training run. THE EVALUATION POINT I WOULD END ON, because it is what decides whether you ship a broken model. Multiple-choice accuracy is a step function of the logits and rarely moves under quantization, so it is structurally blind to the damage. Generation compounds small perturbations over hundreds of autoregressive steps and, under sampling, reads the low-probability tail where the error is proportionally largest. Evaluate with perplexity on in-domain text and with long-output generation.",
          "deepDive": {
            "q": "Why do outliers exist, and what does each mitigation actually do about them?",
            "a": "THE PHENOMENON, stated carefully. Dettmers et al. observed that beyond roughly 6.7B parameters, transformer activations develop a small number of feature dimensions - often a handful out of thousands - with magnitudes one to two orders larger than the rest. Three properties make them interesting. They are CONSISTENT: the same dimensions across layers and across tokens, not random spikes. They EMERGE ABRUPTLY with scale rather than growing gradually. And they are FUNCTIONALLY ESSENTIAL: zeroing them collapses the model's performance, so they are not noise. WHY THEY BREAK QUANTIZATION, precisely. The scale is range over levels. With one value fifty times the others and sixteen levels available at four bits, the ordinary weights span the bottom 2% of the range - so essentially all of them round to the same one or two codes. You have spent your entire representational budget on one value. This is why the degradation is a CLIFF at the scale where outliers emerge rather than a gradual decline, which is itself diagnostic. WHAT EACH MITIGATION DOES, and they are genuinely different strategies rather than variations. (1) ISOLATION - LLM.int8. Identify outlier feature dimensions at runtime by magnitude threshold, split the matmul into an int8 part for the ordinary dimensions and an fp16 part for the outlier ones, and sum. The outliers are computed EXACTLY, so nothing is lost, and the ordinary weights get the full int8 range because the outliers are no longer in it. The cost is a scattered, irregular matmul that uses the hardware poorly, so the throughput gain is less than the memory gain. (2) CONTAINMENT - block-wise scales. Do not identify anything; just make the groups small enough - 64 or 128 weights - that an outlier's damage is confined to its own block. Cheap, general, requires no calibration and no runtime detection, which is why it is the right choice when you are about to train and can tolerate residual error. The cost is storing the scales, which is half a bit per parameter at fp32 per 64 - hence quantizing the scales themselves. (3) RESCALING - AWQ. The key reframe is that salience is determined by the ACTIVATION a weight multiplies, not by the weight's own magnitude. So use calibration statistics to find channels with large mean activation, multiply those weight channels by a scale before quantizing - giving them more effective resolution - and divide the input by the same scale so the product is unchanged. It is mathematically the identity before quantization and it moves where the error lands. Remarkably, protecting a small percentage of channels this way recovers most of the four-bit loss, with no weight updates at all. (4) MIGRATION - SmoothQuant. Activations are hard to quantize and weights are easy. A per-channel scaling applied to the activations and its inverse folded into the weights leaves the product identical while moving difficulty from the hard side to the easy side. Same total function, redistributed. THE UNIFYING VIEW WORTH STATING. Every one of these answers the question of what to do about a heavy-tailed distribution you must represent with few levels, and the answers are: isolate the tail, contain it, give it more resolution, or move it somewhere better. That taxonomy is more useful than the four names. AND THE OBSERVATION I WOULD END ON. This entire subfield exists because of an EMPIRICAL discovery about trained transformers that nobody predicted from the architecture. It was found by people investigating why quantization broke, and it now shapes the design of every method here. That is a good general lesson: in systems work the constraints that matter most are frequently discovered rather than derived."
          }
        },
        {
          "q": "How would you choose a quantization method for a deployment?",
          "a": "THE DECISION HAS THREE INPUTS: the bit width you need, whether you can afford a training run, and what your calibration data looks like. THE LADDER, in the order I would work through it. (1) EIGHT-BIT WEIGHTS. Round-to-nearest per-channel is usually sufficient and takes seconds. If you see degradation, it is almost certainly outliers, and LLM.int8-style isolation or SmoothQuant fixes it. This is the low-risk option and I would start here to establish a baseline. (2) FOUR-BIT WEIGHTS FOR SERVING, which is where the interesting decisions are. AWQ or GPTQ, both of which need a calibration set. AWQ is simpler - it computes activation statistics and applies a per-channel scaling, with no weight updates - and it is fast. GPTQ does more work, solving layer by layer for the quantized weights that best preserve each layer's output and compensating as it goes, which typically gives slightly better results at more quantization time. I would try AWQ first because it is cheaper and often within noise of GPTQ, and reach for GPTQ if the accuracy gap matters. (3) BELOW FOUR BITS, OR A HARD ACCURACY REQUIREMENT. Quantization-aware training, accepting the cost of a training run. This is where post-training methods stop being sufficient and the weights genuinely need to adapt. (4) QUANTIZING A FROZEN BASE FOR FINE-TUNING. QLoRA's NF4 - a fixed codebook fitted to the normal distribution of pretrained weights, no calibration, quantize in seconds. Right precisely because you are about to spend hours training and do not want a preprocessing stage, and because the adapter can compensate for residual error. THE INPUT THAT DECIDES MORE THAN THE METHOD: CALIBRATION DATA. Both GPTQ and AWQ fit to the activations the layer actually sees, so the calibration set should look like your production traffic. Calibrating a code model on general web text, or a multilingual deployment on English, optimizes the wrong objective - and the failure appears only in production, on the distribution you did not calibrate for. A few hundred representative sequences is usually enough, and getting them right matters more than the choice between AWQ and GPTQ. WHAT ELSE TO CONSIDER. Which layers to EXCLUDE - embeddings, the output head and normalization are cheap in parameters and disproportionately sensitive, and blanket quantization is a reliable way to get a model that runs and generates badly. Whether to quantize the KV CACHE rather than or as well as the weights, which is the right target for long-context serving where the cache dominates. And the RUNTIME: a quantization format is only useful if your serving stack has fast kernels for it, and the fastest format on paper is worthless without them. HOW I WOULD VALIDATE. Perplexity on in-domain held-out text, which is continuous and sensitive. Long-output generation scored the way production scores it. Format-violation and repetition rates. And explicitly NOT a multiple-choice benchmark, which is a step function of the logits and structurally unable to see the damage."
        },
        {
          "q": "Why do quantized models pass benchmarks but produce worse output?",
          "a": "THIS IS THE PREDICTABLE RESULT OF EVALUATING A GENERATIVE MODEL WITH A DISCRIMINATIVE INSTRUMENT, and the mechanism is worth stating precisely. WHY THE BENCHMARK DOES NOT MOVE. Most standard benchmarks are multiple-choice or classification: the model scores a small set of options and you take the argmax. Quantization perturbs the logits slightly. If the correct option was ahead by a comfortable margin, a small perturbation does not change which is largest, so accuracy is IDENTICAL even though the underlying distribution changed measurably. Accuracy is a step function of the logits; it is designed not to notice small changes. WHY GENERATION DEGRADES - three compounding effects. (1) AUTOREGRESSIVE COMPOUNDING. Each token conditions on all previous ones, so a perturbation that changes one token in fifty changes the context for everything after it, and the trajectories diverge. Over a 500-token response, many small independent perturbations become one large difference. (2) THE TAIL MATTERS UNDER SAMPLING. With temperature or nucleus sampling you are not taking the argmax - you are sampling, so changes in the LOW-PROBABILITY tail directly change which tokens can be selected. Quantization error is proportionally largest exactly there, because the small probabilities have the least absolute resolution. A token that had probability 0.001 and now has 0.004 will start appearing. (3) CALIBRATION AND ENTROPY SHIFTS. Quantization tends to slightly flatten or sharpen the distribution, and small entropy changes alter generation character - more repetition if sharpened, more drift if flattened. Neither is visible in argmax accuracy at all. WHAT USERS ACTUALLY NOTICE, which is diagnostic. Rarely factual errors. It is repetition, degenerate loops in long outputs, format violations - JSON that stops being valid JSON - subtle register changes, and worse instruction adherence toward the end of long generations. All distributional properties. HOW I WOULD DETECT IT BEFORE SHIPPING. PERPLEXITY on held-out in-domain text: continuous, sensitive, cheap, and it would have caught this. Then generation evaluated the way production uses it - long outputs, real prompts, scored on the actual criteria including format-violation and repetition rates. And KL divergence between the full-precision and quantized output distributions on a sample of prompts, which measures the thing that actually changed rather than a downstream consequence of it. HOW I WOULD FIX IT if confirmed. Better calibration data matching the production distribution. A better method - GPTQ or AWQ rather than round-to-nearest. Keeping sensitive layers in higher precision. Or moving to 8 bits for the layers that turn out to matter, which is a targeted retreat rather than an all-or-nothing decision. THE GENERALIZABLE LESSON, which is this curriculum's recurring one: the metric did not lie, it answered the question it was asked. It was asked whether the argmax survived. Nobody asked whether the distribution did.",
          "deepDive": {
            "q": "Should you quantize the KV cache, and how does that differ from quantizing weights?",
            "a": "WHY IT IS A SEPARATE DECISION. Weights are a FIXED cost shared across all requests; the KV cache is a PER-REQUEST cost that grows with sequence length. So which dominates depends entirely on your workload. At short context with many concurrent requests, weights dominate. At long context, the cache does - and for a 70B-class model at tens of thousands of tokens the cache can exceed the weights. In that regime quantizing weights and leaving the cache in fp16 optimizes the wrong term. THE ARITHMETIC. Cache size is 2 times layers times KV heads times head dimension times sequence times batch times bytes. Halving the bytes by going to int8 halves it directly, and the memory freed becomes MORE CONCURRENT SEQUENCES - which raises arithmetic intensity, which raises throughput. So the benefit is realized through the same chain as any memory saving in serving, and it can be substantial. WHY IT IS HARDER THAN QUANTIZING WEIGHTS. (1) THE CACHE IS ACTIVATIONS, and activations are where the outliers live. Weights are comparatively well-behaved - roughly normal, no extreme tail - which is why NF4's fixed codebook works. Keys and values inherit the outlier structure of the activations that produced them, so per-tensor quantization of the cache is worse than per-tensor quantization of weights. (2) IT IS QUANTIZED ONCE AND READ MANY TIMES. A key written at position 10 is read for every subsequent token, so its error affects every future attention computation for that sequence - the error does not average out, it persists and compounds over the generation. (3) KEYS AND VALUES BEHAVE DIFFERENTLY. Keys go through a dot product with queries and then a softmax, which is sensitive to the differences between scores; values are averaged with attention weights, which is more forgiving. The empirical finding is that keys are more sensitive than values, so asymmetric treatment - keys at higher precision than values - is a reasonable design and is used. (4) GRANULARITY IS AWKWARD. Per-channel quantization along the head dimension works reasonably; per-token is also possible and interacts with the paged allocation. WHAT WORKS IN PRACTICE. Int8 cache is fairly routine and close to lossless with per-channel scaling. Four-bit cache is possible with care and asymmetric key-value treatment, and it is where the interesting recent work is. Below that the degradation becomes visible in long generations specifically, which is exactly where you were trying to save memory - an unfortunate interaction. THE ALTERNATIVES TO COMPARE IT AGAINST, because quantization is not the only lever on this term. Grouped-query attention reduces the KV head count and is decided at pretraining time. Sliding-window or local attention bounds the sequence contribution. Cache eviction discards positions judged unimportant. And cross-layer sharing reduces the layer factor. Cache quantization composes with all of them and is the easiest to apply after the fact, which is its practical advantage. HOW I WOULD DECIDE. Measure which term dominates at your actual context length and batch - weights or cache - and quantize the larger one first. That is a two-minute calculation and it frequently points at the cache for long-context workloads, where teams have quantized the weights and left the dominant term untouched."
          }
        },
        {
          "q": "Compare PTQ and QAT.",
          "a": "THE DISTINCTION. Post-training quantization takes a trained model and quantizes it, optionally using a small calibration set. Quantization-aware training simulates quantization DURING training so the weights adapt to it, using a straight-through estimator to get gradients through the non-differentiable rounding. WHAT PTQ BUYS. Speed - minutes to hours rather than a training run. No training infrastructure, no data beyond a small calibration set, and it works on a model you did not train and cannot retrain, which is the common situation with open weights. At eight bits it is essentially free in quality, and modern methods make four bits workable. WHAT QAT BUYS. Accuracy, and the gap widens as bits fall. Below four bits PTQ degrades substantially and QAT remains usable, because the weights have moved to positions where the quantization grid represents them well rather than being rounded onto a grid they were never fitted to. It also handles activation quantization better, since the network learns to keep activations in a representable range. THE MECHANISM THAT MAKES QAT WORK. The forward pass uses quantized weights so the network experiences the error it will experience at deployment; the backward pass pretends the quantizer was the identity, which is the straight-through estimator. That gradient is deliberately BIASED - it is the gradient of a different function - and the justification is empirical plus the argument that quantization error behaves somewhat like noise. The bias grows as bits fall, which is why very low-bit training needs additional tricks such as learned step sizes. HOW I WOULD CHOOSE. Eight bits: PTQ, always. Four bits for serving: PTQ with AWQ or GPTQ, which is the mainstream choice and is usually sufficient. Below four bits, or a hard accuracy requirement you cannot meet: QAT. And a frozen base for fine-tuning: neither of these exactly - QLoRA's fixed NF4 codebook, which needs no calibration and no training because the adapter compensates. THE MIDDLE GROUND WORTH KNOWING. There is a spectrum between them. Layer-wise reconstruction methods like GPTQ are already doing a limited optimization at quantization time. Beyond that, brief QAT fine-tuning - a small number of steps rather than a full run - recovers much of QAT's advantage at a fraction of the cost, and is under-used. And QLoRA is arguably the most practical hybrid: quantize the base, train an adapter in higher precision, and let the adapter absorb the quantization error, which gets QAT-like adaptation without touching the base weights. THE PRACTICAL CONSTRAINT THAT OFTEN DECIDES IT. You usually do not have the ability to retrain. Open weights come as weights; the training data and infrastructure are someone else's. That single fact is why PTQ methods receive most of the research attention and why AWQ and GPTQ are the names people know - they solve the problem as it actually presents itself."
        },
        {
          "q": "How does quantization fit this module's two-regime framing?",
          "a": "IT IS THE PUREST INFERENCE-REGIME TECHNIQUE, and the asymmetry is worth spelling out because it is genuinely large. IN THE INFERENCE REGIME it is transformative. Decoding reads every weight to produce one token, arithmetic intensity is about one, and the accelerator idles waiting on memory. Four-bit weights are four times fewer bytes, so decoding is roughly four times faster - and the memory freed becomes KV cache, which raises the servable batch, which raises arithmetic intensity, which raises throughput again. The benefit arrives twice, through latency and through capacity. IN THE TRAINING REGIME it helps far less. Training amortizes each weight read across batch times sequence positions, so it is compute-bound; reducing bytes read does not touch the constraint. And a TRAINABLE weight has a further requirement that a frozen one does not: it must accumulate small gradient updates, and a small update added to a low-precision weight rounds away entirely. That is why mixed-precision training keeps an fp32 master copy, and it is why you cannot simply train in four bits. THE ASYMMETRY THAT FOLLOWS, and it is the cleanest statement of the two-regime idea in this module: a FROZEN weight needs only enough precision to compute a forward pass and pass gradients through, so four bits suffice; a TRAINABLE weight needs enough precision to accumulate updates, so it does not. Same tensor, same model, different precision requirement depending on whether it is being updated. That single line explains QLoRA entirely - quantize the frozen base, keep the trainable adapter in bf16 - and it is derivable rather than a recipe. HOW IT COMPOSES WITH THE OTHER INFERENCE TECHNIQUES. All three attack bytes read per token by different mechanisms. Quantization reduces bytes PER PARAMETER. Distillation reduces the NUMBER of parameters. Speculative decoding AMORTIZES the read over more tokens. They are orthogonal and they stack, which is predictable once you see them as three attacks on one quantity rather than three unrelated tricks. And grouped-query attention plus cache quantization do the same for the other term that is read every token. THE EVALUATION CONSEQUENCE, which the regime framing also explains. Quantization is a DISTRIBUTIONAL change, and the inference regime is where distributions matter - sampling reads the tail, autoregressive generation compounds perturbations. Training-regime metrics like a benchmark accuracy are step functions that cannot see it. So the framing predicts not only where the technique helps but which instrument will fail to measure it, which is the more useful half."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why quantization transforms inference and not training",
        "back": "Decode is MEMORY-BANDWIDTH-bound (intensity ~1): you read every weight to make one token, so 4-bit is 4x fewer bytes to stream. Training amortizes each read over batch x sequence positions, so it is COMPUTE-bound and the arithmetic is what you pay for."
      },
      {
        "type": "formula",
        "front": "Affine quantization",
        "back": "q = round(x/s) + z, x_hat = s(q - z), s = (max - min)/(2^b - 1). The scale is set by the MAXIMUM - which is exactly why one outlier destroys everything else in the group."
      },
      {
        "type": "intuition",
        "front": "The transformer outlier phenomenon",
        "back": "Beyond ~6.7B, a handful of ACTIVATION dimensions carry 10-100x the magnitude of the rest - the SAME dimensions across layers and tokens, emerging ABRUPTLY, and functionally ESSENTIAL (zeroing them collapses the model). Not noise to be clipped."
      },
      {
        "type": "definition",
        "front": "The four responses to outliers",
        "back": "ISOLATE (LLM.int8: outlier dims in fp16, rest in int8). CONTAIN (block-wise scales per 64-128, QLoRA's approach). RESCALE (AWQ: salient channels get more resolution). MIGRATE (SmoothQuant: shift difficulty from activations to weights)."
      },
      {
        "type": "formula",
        "front": "GPTQ's objective",
        "back": "min ||WX - W_hat X||^2 - the layer's OUTPUT error on calibration activations, NOT its weight error. Quantize one weight at a time and UPDATE the remaining ones to absorb the error introduced, using H = 2XX^T. Errors compensate instead of accumulating."
      },
      {
        "type": "intuition",
        "front": "AWQ's insight",
        "back": "SALIENCE COMES FROM ACTIVATIONS, not weights - a weight matters in proportion to the activation it multiplies. Scale salient channels up before quantizing, fold the inverse into the input: mathematically the IDENTITY, but the error lands elsewhere. No weight updates at all."
      },
      {
        "type": "pitfall",
        "front": "Accuracy benchmarks cannot see quantization damage",
        "back": "Accuracy is a STEP FUNCTION of logits - a small perturbation rarely flips a confident argmax. Generation COMPOUNDS perturbations over hundreds of steps and SAMPLES FROM THE TAIL, where the error is proportionally largest. Use perplexity + long-output generation."
      },
      {
        "type": "pitfall",
        "front": "Calibration data must match your traffic",
        "back": "GPTQ and AWQ both fit to the activations the layer ACTUALLY SEES. Calibrating a code model on web text, or a multilingual deployment on English, optimizes the wrong objective - and the failure appears only in production."
      },
      {
        "type": "intuition",
        "front": "The frozen-vs-trainable precision asymmetry",
        "back": "A TRAINABLE weight must accumulate SMALL UPDATES, which round away in low precision - hence the fp32 master copy. A FROZEN weight only needs enough precision for a forward pass and to pass gradients THROUGH. Same tensor, different requirement. That IS QLoRA."
      },
      {
        "type": "pitfall",
        "front": "The scales are a real memory cost",
        "back": "One fp32 scale per 64 weights is 0.5 bits/param - 12.5% overhead on a 4-bit format. Which is why QLoRA quantizes the scales THEMSELVES (double quantization) and lands at ~4.13 bits rather than 4.5."
      },
      {
        "type": "intuition",
        "front": "Quantize the KV cache, not just the weights",
        "back": "Weights are a FIXED shared cost; the cache is PER-REQUEST and grows with sequence. At long context the cache can EXCEED the weights - so quantizing weights and leaving the cache in fp16 optimizes the wrong term. Keys are more sensitive than values (softmax vs averaging)."
      },
      {
        "type": "intuition",
        "front": "Three mechanisms against one bottleneck",
        "back": "Bytes read per token: QUANTIZATION cuts bytes PER PARAMETER, DISTILLATION cuts the NUMBER of parameters, SPECULATIVE DECODING amortizes the read over MORE TOKENS. Orthogonal, and they stack - predictable once you see them as three attacks on one quantity."
      }
    ],
    "refs": [
      {
        "title": "Dettmers et al. (2022), LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
        "url": "https://arxiv.org/abs/2208.07339"
      },
      {
        "title": "Frantar et al. (2022), GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers",
        "url": "https://arxiv.org/abs/2210.17323"
      },
      {
        "title": "Lin et al. (2023), AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration",
        "url": "https://arxiv.org/abs/2306.00978"
      },
      {
        "title": "Xiao et al. (2023), SmoothQuant: Accurate and Efficient Post-Training Quantization for LLMs",
        "url": "https://arxiv.org/abs/2211.10438"
      },
      {
        "title": "Jacob et al. (2018), Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference (QAT)",
        "url": "https://arxiv.org/abs/1712.05877"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "mixed-precision",
      "kv-cache"
    ]
  }
};
