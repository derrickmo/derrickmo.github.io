// GENERATED from content/lessons/fine-tuning/qlora.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/fine-tuning/qlora/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "quantization": "Quantization",
      "mixed-precision": "Mixed Precision",
      "lora": "LoRA - Low-Rank Adaptation",
      "pruning": "Pruning & Sparsity"
    }
  }
};
