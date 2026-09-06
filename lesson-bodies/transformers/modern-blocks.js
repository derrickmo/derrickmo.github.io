// GENERATED from content/lessons/transformers/modern-blocks.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/modern-blocks/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "modern-blocks": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The 2017 transformer block and a 2024 LLaMA block have the same skeleton - attend, then feed-forward, each with a residual and a normalization - but almost every component inside has been replaced. LayerNorm became RMSNorm. The ReLU/GELU feed-forward became SwiGLU. Absolute positional encodings became RoPE. Multi-head attention became grouped-query attention. Biases were deleted. None of these changes is individually dramatic; together they are the difference between the original architecture and what every modern open model actually ships, and each one has a specific, checkable justification.",
        "Two of them are the subject of this lesson. RMSNorm (Zhang and Sennrich, 2019) drops LayerNorm's mean-subtraction and its learned bias, keeping only a root-mean-square rescale and a learned gain. It is cheaper - normalization is memory-bandwidth-bound, so removing a reduction pass and a subtraction is a real saving at scale - and it works just as well, which is itself informative: it says the RE-CENTERING was never the part that mattered, only the RE-SCALING. SwiGLU (Shazeer, 2020) replaces the FFN's single expansion matrix with a GATED pair: one branch produces values, another produces a multiplicative gate through a Swish nonlinearity. That is three matrices instead of two, so d_ff is reduced to about 8/3 * d_model to hold the parameter count constant, and the result is a consistent quality gain at equal cost.",
        "The honest framing for these is important, and it is what a good interview answer contains. Shazeer's own paper on GLU variants ends by saying the architectures 'seem to produce better perplexities' and offers no explanation, closing with a line about divine benevolence - a rare and admirable admission that the result is empirical. So the correct posture is: these are well-replicated empirical wins with plausible but unproven mechanisms (gating gives multiplicative interactions and data-dependent information flow), adopted because they survived scrutiny at scale, not because anyone derived them. Being able to say that - and to distinguish 'we measured it repeatedly' from 'we understand it' - is more valuable than a confident story about why gating works."
      ],
      "math": [
        {
          "h": "LayerNorm vs RMSNorm",
          "paras": [
            "LayerNorm centres and scales, with a learned gain and bias. RMSNorm skips the mean entirely: divide by the root mean square and apply a learned gain. Fewer operations, one fewer reduction over the feature vector, and no bias parameters - and empirically equal quality, which is the evidence that re-centering was doing little work."
          ],
          "tex": "\\mathrm{LN}(x) = \\gamma \\odot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta \\qquad\\qquad \\mathrm{RMSNorm}(x) = \\gamma \\odot \\frac{x}{\\sqrt{\\tfrac{1}{d}\\sum_i x_i^2 + \\epsilon}}",
          "texNote": "mu and sigma^2 are the mean and variance over the d feature dimensions of ONE token. RMSNorm drops mu, drops beta, and needs only one pass to accumulate the sum of squares - typically 10-30% faster for the normalization op, which matters because it is bandwidth-bound and runs 2N times per forward pass."
        },
        {
          "h": "SwiGLU: a gated feed-forward network",
          "paras": [
            "A GLU-family FFN splits the expansion into two projections: one passed through an activation to form a GATE, one linear to form the VALUES, combined by an elementwise product before the down-projection. With Swish (SiLU) as the activation this is SwiGLU. Because there are now three matrices, d_ff is set to about 8/3 * d_model so total parameters match the classic 4x two-matrix FFN."
          ],
          "tex": "\\mathrm{SwiGLU}(x) = \\Big(\\underbrace{\\mathrm{Swish}(xW_{\\text{gate}})}_{\\text{gate}} \\;\\odot\\; \\underbrace{xW_{\\text{up}}}_{\\text{values}}\\Big) W_{\\text{down}}, \\qquad \\mathrm{Swish}(z) = z\\,\\sigma(z)",
          "texNote": "Elementwise product = multiplicative interaction, which a plain FFN cannot express in one layer. Parameter count is 3 * d_model * d_ff, so d_ff = (8/3) d_model gives 8*d_model^2 - identical to the classic two-matrix FFN at 4x expansion."
        }
      ],
      "code": [
        {
          "h": "RMSNorm and SwiGLU, and the parameter-matching detail",
          "paras": [
            "Both are short. The detail worth internalizing is the d_ff choice: a naive swap to SwiGLU at 4x expansion silently adds 50% more FFN parameters, so any 'SwiGLU is better' comparison that skips the 8/3 adjustment is measuring extra capacity, not the gating."
          ],
          "code": "import torch, torch.nn as nn, torch.nn.functional as F\n\nclass RMSNorm(nn.Module):\n    def __init__(self, d, eps=1e-6):\n        super().__init__()\n        self.gain, self.eps = nn.Parameter(torch.ones(d)), eps    # no bias\n    def forward(self, x):\n        rms = x.pow(2).mean(-1, keepdim=True).add(self.eps).rsqrt()\n        return self.gain * (x * rms)                              # no mean subtraction\n\nclass SwiGLU(nn.Module):\n    def __init__(self, d_model, d_ff=None):\n        super().__init__()\n        d_ff = d_ff or int(8 * d_model / 3)        # 8/3, NOT 4x - three matrices now\n        d_ff = 64 * ((d_ff + 63) // 64)            # round to a hardware-friendly multiple\n        self.gate = nn.Linear(d_model, d_ff, bias=False)\n        self.up   = nn.Linear(d_model, d_ff, bias=False)\n        self.down = nn.Linear(d_ff, d_model, bias=False)\n    def forward(self, x):\n        return self.down(F.silu(self.gate(x)) * self.up(x))       # gate * values\n\nd = 4096\nclassic = nn.Sequential(nn.Linear(d, 4*d, bias=False), nn.GELU(), nn.Linear(4*d, d, bias=False))\nswiglu  = SwiGLU(d)\nn = lambda m: sum(p.numel() for p in m.parameters())\nprint(f'classic 4x GELU : {n(classic):,}')     # 134,217,728\nprint(f'SwiGLU  8/3     : {n(swiglu):,}')      # 134,217,728  <- matched, on purpose\nprint(f'SwiGLU  4x (bug): {n(SwiGLU(d, 4*d)):,}')   # 201,326,592  <- 50% MORE params",
          "caption": "SwiGLU uses three matrices, so d_ff must drop to ~8/3*d_model to match the classic FFN's parameter count. Comparing SwiGLU at 4x against GELU at 4x measures 50% extra capacity, not the gating mechanism - the most common error in reproducing this result."
        },
        {
          "h": "The modern block, assembled",
          "paras": [
            "Every change in one place: pre-norm with RMSNorm, no biases anywhere, RoPE applied inside attention, grouped-query KV heads, and a SwiGLU feed-forward. This is, component for component, a LLaMA-style block."
          ],
          "code": "class ModernBlock(nn.Module):\n    \"\"\"LLaMA-style: pre-RMSNorm, no biases, RoPE inside attention, GQA, SwiGLU FFN.\"\"\"\n    def __init__(self, d_model=4096, n_heads=32, n_kv_heads=8):\n        super().__init__()\n        self.norm1, self.norm2 = RMSNorm(d_model), RMSNorm(d_model)\n        self.attn = GroupedQueryAttention(d_model, n_heads, n_kv_heads, rope=True)\n        self.ffn = SwiGLU(d_model)\n    def forward(self, x, freqs_cis, mask=None):\n        x = x + self.attn(self.norm1(x), freqs_cis, mask)\n        x = x + self.ffn(self.norm2(x))\n        return x\n\n# what changed since 2017, and why:\n#   LayerNorm      -> RMSNorm      cheaper (bandwidth-bound op), equal quality\n#   post-norm      -> pre-norm     trains at depth without warmup\n#   ReLU/GELU FFN  -> SwiGLU       consistent perplexity gain at matched params\n#   sinusoidal PE  -> RoPE         relative position by construction, extendable\n#   MHA            -> GQA          8x smaller KV cache at ~equal quality\n#   biases         -> removed      no measurable loss, slightly better stability",
          "caption": "A LLaMA-style block: the 2017 skeleton with every component replaced. Each substitution is individually small and empirically justified; together they define what a modern LLM block looks like."
        }
      ],
      "useCases": [
        "Reading and reimplementing any modern open model: LLaMA, Mistral, Qwen, Gemma, DeepSeek and their derivatives all use pre-RMSNorm + RoPE + GQA + SwiGLU with no biases, so recognizing this component set is what makes their code legible at a glance.",
        "Training-efficiency work at scale: RMSNorm and bias removal are small per-op wins that matter because normalization runs 2N times per forward pass and is memory-bandwidth-bound - the kind of change that only pays off when multiplied by billions of tokens.",
        "Designing an architecture rather than copying one: the SwiGLU parameter-matching detail (8/3 rather than 4x) is the canonical example of how to compare architectural variants honestly - hold parameters and compute fixed, or you are measuring capacity.",
        "Interpreting ablation literature: this component set is the product of many published one-change-at-a-time studies, so it is the standard reference point for 'has anyone actually tested this?' when someone proposes a new block variant."
      ],
      "pitfalls": [
        "Swapping GELU for SwiGLU at the same d_ff: three matrices instead of two means 50% more FFN parameters, so the 'improvement' is mostly extra capacity. Use d_ff ~ 8/3 * d_model to compare honestly - this is the single most common reproduction error.",
        "Assuming these changes are large individually: each is worth a small perplexity improvement or a modest speedup. They are adopted because they compose and because they were validated at scale, not because any one of them transforms a model.",
        "Claiming a mechanism you cannot support: Shazeer's GLU paper explicitly declines to explain why gating helps. 'Multiplicative interactions and data-dependent gating' is a plausible hypothesis, not an established result - say so.",
        "Forgetting that RMSNorm has no bias and no mean-centering: porting weights between a LayerNorm model and an RMSNorm model is not a rename, and reimplementations that keep the beta parameter are silently a different architecture.",
        "Ignoring hardware alignment when choosing d_ff: 8/3 * d_model is rarely a nice number, so implementations round it to a multiple of 64 or 256. Skipping the rounding costs real throughput on tensor cores."
      ],
      "connections": [
        {
          "ref": "transformers/transformer-block",
          "text": "This is the same block with modernized components - the skeleton (attend, feed-forward, residual, normalize) is unchanged, which is why the 2017 paper still reads as current."
        },
        {
          "ref": "neural-nets/activation-functions",
          "text": "Swish/SiLU and GELU come from that lesson's family of smooth activations; SwiGLU is the gated combination of one of them with a linear branch."
        },
        {
          "ref": "transformers/rope",
          "text": "RoPE is the positional half of the same modernization, and the one change with a genuine mathematical justification rather than a purely empirical one."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "The systems view of these choices - how component selection interacts with serving cost, quantization, and kernel support."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is RMSNorm?",
          "a": "LayerNorm without the mean-subtraction and without the learned bias: divide by the root mean square of the features and apply a learned gain."
        },
        {
          "q": "Why is RMSNorm faster?",
          "a": "One fewer reduction over the feature vector and no subtraction. Normalization is memory-bandwidth-bound and runs 2N times per forward pass, so the saving is real at scale (typically 10-30% of the norm op)."
        },
        {
          "q": "What does RMSNorm's success tell us?",
          "a": "That the re-CENTERING in LayerNorm was doing little work - only the re-SCALING mattered. An informative negative result."
        },
        {
          "q": "What is SwiGLU?",
          "a": "A gated FFN: Swish(x W_gate) * (x W_up), then down-projected. Three matrices instead of two, with an elementwise product providing multiplicative interaction."
        },
        {
          "q": "Why is d_ff 8/3*d_model in SwiGLU models?",
          "a": "To keep parameters equal to the classic two-matrix 4x FFN. Three matrices of size d x d_ff means d_ff = 8/3 * d gives 8*d^2, matching."
        },
        {
          "q": "What is Swish/SiLU?",
          "a": "z * sigmoid(z) - a smooth, non-monotonic activation. Smooth like GELU, and used as the gate nonlinearity in SwiGLU."
        },
        {
          "q": "Why does gating help?",
          "a": "The honest answer: nobody has established why. The plausible hypothesis is multiplicative interactions and data-dependent information flow. Shazeer's paper explicitly declines to explain it."
        },
        {
          "q": "Why remove biases from linear layers?",
          "a": "No measurable quality loss, slightly better training stability at scale, and fewer parameters/ops. Modern LLMs (LLaMA, PaLM) drop them from attention and FFN projections."
        },
        {
          "q": "What is the full modern component set?",
          "a": "Pre-norm RMSNorm, no biases, RoPE, grouped-query attention, SwiGLU FFN. That is a LLaMA block, and essentially every current open model uses it."
        },
        {
          "q": "Are these changes individually large?",
          "a": "No - each is worth a small perplexity gain or a modest speedup. They matter because they compose and because they were validated repeatedly at scale."
        },
        {
          "q": "What is GeGLU?",
          "a": "The same gated FFN with GELU as the gate activation instead of Swish. Comparable to SwiGLU; both beat the ungated baseline, and the choice between them is largely convention."
        },
        {
          "q": "Where does normalization time actually go?",
          "a": "Memory bandwidth, not arithmetic - reading and writing the activation tensor. That is why removing one reduction pass (RMSNorm) is worth measurable wall-clock time."
        }
      ],
      "standard": [
        {
          "q": "What is RMSNorm, why did it replace LayerNorm, and what does its success imply?",
          "a": "THE DEFINITION. LayerNorm computes, per token, the mean and variance across its d_model features, subtracts the mean, divides by the standard deviation, then applies a learned per-feature gain (gamma) and bias (beta). RMSNorm (Zhang and Sennrich, 2019) keeps only the scaling: divide each token's feature vector by its root mean square (sqrt of the mean of squares) and apply a learned gain. No mean subtraction, no bias parameter. WHY IT REPLACED LayerNorm - three reasons. (1) IT IS CHEAPER, and the saving is larger than it looks. LayerNorm requires two reduction passes over the feature vector (one for the mean, one for the variance given the mean) or a fused two-moment pass, plus the subtraction; RMSNorm needs one accumulation of squares. More importantly, normalization is MEMORY-BANDWIDTH-BOUND, not compute-bound - the cost is dominated by reading and writing the activation tensor - so reducing the work per element and the number of passes translates fairly directly into wall-clock time. And it runs 2N times per forward pass (twice per block), so a 10-30% saving on that op is a measurable fraction of training and inference time at scale. (2) IT IS EQUALLY GOOD. Across many replications - and now across essentially every major open model - swapping LayerNorm for RMSNorm costs no measurable quality. That is the empirical basis for the switch. (3) FEWER PARAMETERS AND SIMPLER KERNELS: no beta, and a simpler fused kernel, which also helps quantization and export. WHAT ITS SUCCESS IMPLIES - the more interesting part of the question. LayerNorm was introduced with a story about reducing 'internal covariate shift' by re-centering AND re-scaling activations. If removing the re-centering costs nothing, then the re-centering was not doing the work the story attributed to it. That fits a broader re-evaluation: Santurkar et al. (2018) argued BatchNorm's benefit comes from SMOOTHING THE OPTIMIZATION LANDSCAPE (making the loss surface better conditioned and gradients more predictable) rather than from covariate-shift correction, and the RMSNorm result points the same way - what matters is keeping activation MAGNITUDES in a stable range so that gradients through the layer are well-behaved, and the mean is largely irrelevant to that. A second implication is methodological and worth stating: this is a case where the field's stated justification for a component was wrong, and the way that was discovered was by ablating the component into pieces and measuring. That is a good template - when a technique has several parts bundled with one explanation, test the parts separately. THE CAVEATS, for completeness. RMSNorm is not universally better - it is equal-and-cheaper, which is enough. Some architectures still use LayerNorm (BERT-family, ViT variants) simply because they predate the switch or inherit pretrained weights. And porting weights between the two is not a rename: an RMSNorm model has no beta, and its gamma is fitting a different function, so conversion requires care. Also note that normalization PLACEMENT (pre vs post) is a separate and larger effect than the choice of normalizer - if asked what matters more, placement does. THE CURRENT PICTURE: essentially every modern LLM (LLaMA, Mistral, Qwen, Gemma, DeepSeek) uses pre-norm RMSNorm, and the remaining research activity in this area is about additional normalization for stability - QK-norm on queries and keys to prevent attention logit growth, and Gemma-2-style norms both before and after each sublayer.",
          "deepDive": {
            "q": "Normalization layers are usually explained as fixing 'internal covariate shift'. Is that right, and what is actually going on?",
            "a": "THE ORIGINAL CLAIM. Ioffe and Szegedy (2015) introduced BatchNorm with the argument that as earlier layers' parameters change during training, the DISTRIBUTION of inputs to later layers shifts ('internal covariate shift'), forcing later layers to continually re-adapt; normalizing each layer's inputs removes that shift and so speeds training. It is an intuitive story and it dominated textbook explanations for years. THE EVIDENCE AGAINST IT. Santurkar et al. (2018), 'How Does Batch Normalization Help Optimization?', ran the decisive experiment: they DELIBERATELY INJECTED covariate shift after the BatchNorm layer - adding time-varying random noise to the normalized activations, so the distributions fed to later layers were explicitly unstable - and training was still fast. If BatchNorm's benefit came from removing distribution shift, reintroducing shift should have destroyed the benefit. It did not. They also measured the actual distributional shift with and without BatchNorm and found the relationship to training speed weak. So the stated mechanism does not survive testing. WHAT THEY PROPOSED INSTEAD: normalization SMOOTHS THE OPTIMIZATION LANDSCAPE. Concretely, they showed BatchNorm improves the Lipschitz constants of both the loss and its gradient - the loss surface changes less abruptly, gradients are more predictive of what happens after a step, and therefore larger learning rates are stable and training is faster and less sensitive to initialization. The benefit is about CONDITIONING, not about distributions per se. OTHER THREADS THAT FIT. (a) SCALE INVARIANCE: normalization makes a layer's output invariant to the scale of its weights, which means the effective learning rate adapts automatically - a weight-norm-growth argument that explains why normalized networks tolerate a much wider range of learning rates. (b) IMPLICIT REGULARIZATION in BatchNorm's case, from the noise in mini-batch statistics (which LayerNorm and RMSNorm do NOT have - hence transformers relying more on dropout and weight decay). (c) LENGTH-DIRECTION DECOUPLING: normalization separates the magnitude and direction of the weight vector, making the direction easier to optimize (the WeightNorm view). (d) At the extreme, several lines of work (Fixup, NFNets, and careful-initialization schemes) train deep networks WITHOUT normalization at all by controlling initialization and residual scaling directly - which is strong evidence that normalization is one convenient way to achieve well-conditioned signal propagation, not a uniquely necessary mechanism. WHAT THE RMSNorm RESULT ADDS to this picture: if re-centering can be dropped with no cost, then the mean was not the operative quantity - only the SCALE was. That is exactly what the conditioning story predicts (keeping activation magnitudes bounded is what stabilizes gradient magnitudes) and hard to explain under the covariate-shift story, which treats the whole distribution as the problem. So RMSNorm is a small piece of corroborating evidence for the modern explanation. WHAT I WOULD SAY IN AN INTERVIEW: internal covariate shift is the historical motivation and is largely discredited as the mechanism; the better-supported account is that normalization improves the conditioning of the optimization problem - smoother loss landscape, more predictive gradients, scale-invariance that stabilizes effective learning rates - which is why it permits higher learning rates and reduces initialization sensitivity. And I would add the honest caveat that this is still an area of active debate rather than a settled theory, and that the practical rules (normalize, use pre-norm, use RMSNorm because it is cheaper) are all empirically rather than theoretically grounded."
          }
        },
        {
          "q": "Explain SwiGLU. Why do gated FFNs beat plain ones, and how do you compare them fairly?",
          "a": "THE CONSTRUCTION. A classic transformer FFN is: expand with W_1 (d_model -> d_ff), apply a nonlinearity, project back with W_2. A GLU-family FFN splits the expansion into TWO parallel projections of the same width: one, passed through an activation, produces a GATE; the other, linear, produces VALUES. The two are combined by an ELEMENTWISE PRODUCT, then down-projected. With Swish (SiLU: z * sigmoid(z)) as the gate activation, this is SwiGLU; with GELU it is GeGLU; with no activation, plain GLU. So the FFN goes from two matrices to three. WHY IT MIGHT HELP - hypotheses, clearly labelled as such. (1) MULTIPLICATIVE INTERACTIONS. A standard FFN computes an additive combination of features passed through a pointwise nonlinearity; it cannot form a product of two learned projections in a single layer. Gating introduces exactly that, and multiplicative interactions are a genuinely different (and in some senses more expressive) primitive - the same argument used for LSTM gates, attention itself (which is multiplicative), and feature-wise modulation (FiLM). (2) DATA-DEPENDENT INFORMATION FLOW. The gate can suppress or pass each hidden unit depending on the input, giving a soft, input-conditional routing that a fixed nonlinearity cannot. (3) BETTER-CONDITIONED GRADIENTS. Some analyses argue the gated form gives more stable gradient flow than a saturating pointwise nonlinearity, though this is weaker evidence. THE HONEST CAVEAT, and I would state it explicitly: Shazeer's 'GLU Variants Improve Transformer' (2020) reports the empirical gains and then declines to explain them, ending with a much-quoted line attributing the result to divine benevolence. The mechanism is NOT established. What IS established is that the improvement replicates - across model scales, across labs, and across GLU variants - which is why LLaMA, PaLM, Mistral, Qwen and Gemma all adopted it. Distinguishing 'reliably measured' from 'understood' is the substance of this answer. HOW TO COMPARE FAIRLY - the part that actually matters in practice. Because SwiGLU uses three matrices instead of two, a naive swap at the same d_ff increases FFN parameters by 50% (3*d*d_ff versus 2*d*d_ff). Any comparison done that way is measuring EXTRA CAPACITY, not the gating mechanism, and it will flatter SwiGLU for the wrong reason. The correct procedure is to hold parameters (and ideally FLOPs) constant by setting d_ff to about 8/3 * d_model, so 3 * d * (8/3)d = 8*d^2, exactly matching the classic 4x two-matrix FFN. Shazeer's paper does this, and the gain survives - which is what makes the result credible. In practice implementations then round d_ff to a hardware-friendly multiple (64 or 256), which is why real models show numbers like 11008 for d_model 4096 rather than a clean 10922. THE GENERAL LESSON about architecture comparison, which I would emphasize because it transfers: whenever you compare two architectural variants, fix the resource that matters - parameters, FLOPs, wall-clock training time, or all three - and state which one you fixed. A great many published architectural 'improvements' are capacity increases in disguise, and the ResNet-Strikes-Back and ConvNeXt papers made the parallel point for vision, that much of the reported gap between architectures was training recipes rather than architecture. THE COSTS OF SwiGLU worth mentioning: three matmuls instead of two means slightly more kernel launches and a less trivial fusion pattern, and the odd d_ff values complicate tensor-parallel sharding. Both are minor, which is why the trade was accepted."
        },
        {
          "q": "Walk through everything that changed between the 2017 transformer block and a modern LLaMA-style block.",
          "a": "The SKELETON is unchanged - attention sublayer, feed-forward sublayer, residual connection around each, normalization - which is why the original paper still reads as current. Every COMPONENT inside has been replaced. Taking them one at a time, with the justification for each: (1) POST-NORM -> PRE-NORM. Original: x <- LN(x + Sublayer(x)). Modern: x <- x + Sublayer(LN(x)). Reason: pre-norm leaves a clean identity residual path, so gradients reach early layers undisturbed and deep stacks train without a learning-rate warmup and tolerate higher learning rates. This is the change with the clearest optimization justification (Xiong et al., 2020), and it is what made 100-layer models routine. Requires a final LayerNorm after the last block. (2) LayerNorm -> RMSNorm. Drop the mean-subtraction and the bias, keep the RMS rescale and gain. Reason: cheaper (normalization is bandwidth-bound and runs 2N times per pass), equal quality. Implication: re-centering was never the important part. (3) SINUSOIDAL/LEARNED ABSOLUTE POSITION -> RoPE. Rotate queries and keys by an angle proportional to position so their dot product depends only on relative offset. Reason: relative position by construction rather than by learning, no added parameters, compatible with FlashAttention, and - decisively - EXTENSIBLE, since position enters as a frequency you can rescale (position interpolation, NTK-aware scaling, YaRN) to stretch context. This is the change with a real mathematical justification. (4) MULTI-HEAD ATTENTION -> GROUPED-QUERY ATTENTION. Keep many query heads but share key/value heads across groups. Reason: the KV cache dominates inference memory at long context and high batch, and GQA cuts it by the grouping factor (LLaMA-2 70B: 64 query heads, 8 KV groups, 8x reduction) at near-parity quality. Purely a serving-economics change - it does not help training. (5) ReLU/GELU FFN -> SwiGLU. Gated FFN with three matrices and d_ff ~ 8/3*d_model to match parameters. Reason: consistent perplexity improvement at matched cost, mechanism not established. (6) BIASES REMOVED from attention and FFN projections (and from the norms). Reason: no measurable quality loss, marginally better training stability at scale, fewer parameters and ops. PaLM's paper reported improved stability; it is now standard. (7) SMALLER CHANGES worth knowing: weight tying between embedding and unembedding is now often dropped in large models; dropout is frequently set to zero for large-scale pretraining (there is more than enough data, so the regularization is unnecessary and costs throughput); vocabulary and tokenizer choices got a lot of attention; and attention logit stabilization (QK-norm, logit soft-capping) appears in several recent models. WHAT THIS TELLS YOU, and the framing I would end on: the transformer's SKELETON has proven remarkably durable - eight years of intense scrutiny and the fundamental structure (alternate communication and computation, with residuals) survived unchanged. What changed is every component, each replaced after one-change-at-a-time ablation at scale. Two of the changes (pre-norm, RoPE) have principled justifications; three (RMSNorm, SwiGLU, no-bias) are empirical wins whose mechanisms are not established; and one (GQA) is driven entirely by inference economics rather than quality. Being able to sort them into those categories - principled, empirical, economic - is a better answer than listing them."
        },
        {
          "q": "Why do modern LLMs remove bias terms from their linear layers?",
          "a": "THE CHANGE. In a classic transformer, the Q/K/V/O projections, both FFN matrices, and the LayerNorms all carry bias terms. Modern models (PaLM, LLaMA and successors) drop them - linear layers are pure matmuls, and RMSNorm has a gain but no bias. THE REASONS, in order of how well-supported they are. (1) NO MEASURED QUALITY LOSS - the empirical basis. Ablations at scale show removing biases costs nothing detectable in loss or downstream performance. Since they cost something (parameters, memory traffic, an extra kernel or a fused add), removing something free is straightforward. (2) TRAINING STABILITY. The PaLM paper reported that removing biases from the dense layers improved training stability for large models. The mechanism is not rigorously established, but a plausible account: biases add a constant offset that interacts awkwardly with normalization (which will re-centre or re-scale anyway, partially undoing the bias), and they add parameters that can drift without a strong gradient signal, contributing to loss spikes. Note that the interaction with normalization is the key intuition - if a normalization immediately follows, an additive bias before it is at least partly redundant. (3) EFFICIENCY, though it is minor. Biases are a negligible fraction of parameters (d per matrix versus d^2), so memory savings are trivial; the real (small) win is one fewer elementwise op and simpler fused kernels, plus slightly simpler tensor-parallel sharding. (4) QUANTIZATION AND EXPORT are marginally simpler without biases in different numeric ranges than the weights. THE HONEST FRAMING - and this is the answer's substance: this is a case where the field removed something because it was NOT DOING ANYTHING, and the interesting question is why it was ever there. Biases are essential in a plain MLP - they let a unit shift its activation threshold. In a transformer, every linear layer is followed (or preceded) by a normalization with its own learned gain, and the residual stream carries an accumulated signal, so the network has other ways to realize offsets. The bias's function is largely absorbed elsewhere, which is exactly what you would predict from the fact that removing it costs nothing. WHERE BIASES REMAIN: the final unembedding/output layer sometimes keeps one, and some architectures keep biases in specific places. BERT-family and older models have them throughout. And in fine-tuning, BitFit showed you can fine-tune ONLY the biases and recover a surprising amount of full fine-tuning performance on smaller models - a nice counterpoint that biases are not useless, just redundant in the presence of everything else in a modern block, and a good detail to raise if the interviewer pushes. THE META-POINT worth making: 'we removed it and nothing happened' is a genuinely valuable experimental result, and a field that only ever adds components accumulates cruft. The modern block is notable as much for what was deleted (biases, mean-centering, dropout during large-scale pretraining, absolute position embeddings) as for what was added."
        },
        {
          "q": "How would you evaluate whether a proposed new block component is actually an improvement?",
          "a": "This is a methodology question, and the trap is that most claimed architectural improvements are confounded. I would insist on five things. (1) CONTROL THE RESOURCE, AND SAY WHICH ONE. Match PARAMETERS, FLOPs, and ideally wall-clock training time between the baseline and the variant - and state explicitly which you held fixed, because they can conflict. The SwiGLU case is the canonical example: three matrices instead of two means a naive same-d_ff comparison hands the variant 50% more FFN parameters, so the honest comparison sets d_ff to 8/3*d_model. A large fraction of published 'improvements' evaporate under matched-resource comparison, and the ResNet-Strikes-Back and ConvNeXt papers made exactly this point for vision - much of the reported CNN-vs-transformer gap was training recipe, not architecture. (2) TUNE BOTH ARMS EQUALLY. A new component often comes with hyperparameters tuned for it while the baseline uses defaults from a paper written years ago. Give the baseline the same tuning budget (learning rate, warmup, weight decay, initialization) - a new component that only wins at its own tuned learning rate is a learning-rate result, not an architecture result. (3) TEST AT MULTIPLE SCALES AND REPORT THE TREND. Small-scale results frequently do not transfer: components that help at 100M parameters can be neutral or harmful at 10B, and vice versa. Run at least three sizes and check whether the gap widens, holds, or closes - a gap that CLOSES with scale means the component is compensating for something scale fixes anyway, which is the most common failure mode for architecture proposals. Where possible, express the result as a shift in the scaling curve (equivalent compute multiplier) rather than a single delta. (4) REPORT VARIANCE, NOT A SINGLE RUN. Seed-to-seed variation in final loss is often comparable to the claimed improvement. Multiple seeds with a confidence interval, or at minimum the seed variance of the baseline, is the difference between a result and an anecdote. This is the same max-over-noise problem that inflates any best-of-N comparison. (5) MEASURE THE THINGS THAT ARE NOT PERPLEXITY. Wall-clock time per step (a component with better loss-per-step but worse loss-per-second is a loss); memory footprint; kernel support and whether it composes with FlashAttention, tensor parallelism, and quantization; inference cost, since training-time neutrality with worse serving economics is a bad trade; and downstream task performance, since perplexity and downstream quality can diverge. THE ORDER I WOULD ACTUALLY RUN IT: start with a small-scale matched-parameter A/B across 3 seeds and 2 learning rates each; if the effect survives with a gap larger than seed variance, scale up one step and check the trend; if it holds, measure throughput and memory and check kernel compatibility before recommending adoption. AND THE PRIOR I WOULD BRING: most proposed changes do not survive this. The modern component set is small precisely because it is the residue of many such tests - which is also why 'has this been ablated at scale, with matched parameters, at more than one size?' is the right first question to ask about any new block variant, including one's own."
        },
        {
          "q": "Why has the transformer's overall structure survived so long when every component was replaced?",
          "a": "This is worth answering because it separates 'what is essential' from 'what is incidental', which is the real content of the module. WHAT SURVIVED, and why each piece is load-bearing. (1) THE ALTERNATION OF COMMUNICATION AND COMPUTATION. Attention mixes information across positions; the FFN transforms each position independently. That factorization is both expressive and PARALLELIZABLE - which is the decisive property. An RNN's sequential dependency makes it impossible to use a GPU efficiently during training; the transformer's factorization means the whole sequence is processed at once, so the architecture can absorb arbitrarily more compute. The transformer won not because attention is uniquely good at modelling language but because it was the first sequence architecture that could USE modern hardware, and every subsequent scaling result depended on that. (2) RESIDUAL CONNECTIONS. They make depth trainable and, in the residual-stream framing, provide a shared communication channel every component reads and writes - which is what allows layers to compose into circuits rather than forming a brittle pipeline. (3) NORMALIZATION SOMEWHERE. The specific normalizer changed twice; having one is non-negotiable for stable optimization at depth (and even the normalization-free alternatives - Fixup, NFNets - work by achieving the same conditioning through initialization and scaling). (4) CONTENT-BASED, DATA-DEPENDENT ROUTING. Attention weights depend on the input, which is qualitatively different from a fixed convolution kernel. This is what gives in-context flexibility, and it is the property that state-space models had to work hardest to recover - Mamba's key innovation over earlier SSMs was making the state transitions INPUT-DEPENDENT (selective), i.e. reintroducing exactly this property. WHAT CHANGED, and why it was always going to: normalizer, activation and gating, positional scheme, head-sharing pattern, biases. All of these are LOCAL choices - swappable components that do not alter the information flow of the architecture. That is precisely why they could be optimized independently by one-change-at-a-time ablation, and why the changes compose without interacting badly. THE DEEPER READING, which I think is the real answer: the transformer is better understood as a FRAMEWORK than as a specific model - 'alternate parallel content-based routing with per-position computation, on a residual stream' - and the components are implementation details of that framework. The framework survived because it matches the hardware (dense matmuls, massive parallelism) and because it imposes minimal inductive bias, so it scales with data rather than being limited by built-in assumptions. The Bitter Lesson framing applies directly: architectures that impose fewer assumptions and absorb more compute win as compute grows, and the transformer is unusually good at absorbing compute. THE HONEST CAVEATS. (a) The framework has a real weakness - the O(T^2) attention cost - and the challengers (Mamba and state-space models, linear attention, hybrid designs) attack exactly that, with the current state of the art being hybrids that keep some full attention layers for retrieval-style behaviour and use cheaper mixing elsewhere. (b) 'It survived' is partly path dependence and ecosystem lock-in: the tooling, kernels (FlashAttention), and hardware co-design are all transformer-shaped, which raises the bar for any replacement well above 'slightly better on a benchmark'. (c) Some of the survival is that we scaled data and compute enormously, which flatters low-bias architectures - in a data-limited regime, more structured models can win, as CNNs still do in small-data vision. So the accurate statement is: the transformer's information-flow structure is well-matched to parallel hardware and to scale, its components were always incidental and were duly replaced, and its one structural weakness (quadratic attention) is where all the serious architectural competition is concentrated."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "RMSNorm",
        "back": "x / sqrt(mean(x^2) + eps) * gain. LayerNorm without the mean-subtraction and without the bias. Cheaper (one reduction, bandwidth-bound op run 2N times per pass), equal quality."
      },
      {
        "type": "intuition",
        "front": "What RMSNorm's success implies",
        "back": "Re-CENTERING was doing little work; only re-SCALING mattered. Consistent with the modern view that normalization helps by improving optimization conditioning, not by fixing 'internal covariate shift'."
      },
      {
        "type": "formula",
        "front": "SwiGLU",
        "back": "(Swish(x W_gate) * (x W_up)) W_down - three matrices, an elementwise product giving multiplicative interaction. Swish(z) = z*sigmoid(z)."
      },
      {
        "type": "pitfall",
        "front": "SwiGLU needs d_ff = 8/3 * d_model",
        "back": "Three matrices instead of two: at 4x expansion SwiGLU has 50% MORE FFN parameters. Use 8/3*d_model (rounded to a multiple of 64) to match the classic FFN's 8*d^2 - otherwise you are measuring capacity, not gating."
      },
      {
        "type": "intuition",
        "front": "Why gating helps - the honest answer",
        "back": "Not established. Shazeer's GLU paper reports the gain and explicitly declines to explain it. Plausible: multiplicative interactions + data-dependent information flow. Say 'reliably measured, not understood'."
      },
      {
        "type": "definition",
        "front": "The modern (LLaMA) block",
        "back": "Pre-norm RMSNorm + no biases + RoPE + grouped-query attention + SwiGLU FFN. Same 2017 skeleton, every component replaced. LLaMA, Mistral, Qwen, Gemma, DeepSeek all use this set."
      },
      {
        "type": "intuition",
        "front": "Why biases were removed",
        "back": "No measured quality loss + better stability at scale (PaLM). Their function is largely absorbed by the normalization's gain and the residual stream. Counterpoint: BitFit shows bias-only fine-tuning works, so they are redundant, not useless."
      },
      {
        "type": "intuition",
        "front": "Sorting the modern changes",
        "back": "PRINCIPLED: pre-norm (gradient path), RoPE (relative position by construction). EMPIRICAL: RMSNorm, SwiGLU, no-bias. ECONOMIC: GQA (KV-cache size, not quality). Knowing which is which beats listing them."
      },
      {
        "type": "pitfall",
        "front": "Evaluating a new component",
        "back": "Match parameters AND FLOPs; tune both arms equally; test at 3+ scales and check whether the gap widens or closes; report seed variance; measure wall-clock, memory, and kernel compatibility - not just perplexity."
      },
      {
        "type": "intuition",
        "front": "Why the skeleton survived",
        "back": "Alternating content-based routing with per-position computation is PARALLELIZABLE - it can absorb arbitrary compute, unlike an RNN. Components are local, swappable details. The one structural weakness, O(T^2) attention, is where all serious competition sits."
      }
    ],
    "refs": [
      {
        "title": "Zhang & Sennrich (2019), Root Mean Square Layer Normalization",
        "url": "https://arxiv.org/abs/1910.07467"
      },
      {
        "title": "Shazeer (2020), GLU Variants Improve Transformer",
        "url": "https://arxiv.org/abs/2002.05202"
      },
      {
        "title": "Touvron et al. (2023), LLaMA: Open and Efficient Foundation Language Models",
        "url": "https://arxiv.org/abs/2302.13971"
      },
      {
        "title": "Santurkar et al. (2018), How Does Batch Normalization Help Optimization?",
        "url": "https://arxiv.org/abs/1805.11604"
      }
    ],
    "demos": [
      "activations",
      "batch-norm",
      "attention"
    ],
    "demoTitles": {
      "activations": "Activation Functions",
      "batch-norm": "Batch Normalization",
      "attention": "Attention Heatmap"
    }
  }
};
