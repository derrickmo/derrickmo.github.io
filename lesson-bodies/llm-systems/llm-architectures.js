// GENERATED from content/lessons/llm-systems/llm-architectures.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/llm-architectures/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "llm-architectures": {
    "level": "core",
    "body": {
      "intuition": [
        "The transformer block's mechanisms - attention, normalization, position - belong to the architecture lessons. What belongs here is the SYSTEMS reading of the same block: which choices are driven by parameter count, which by training stability, and which by what has to be read from memory during generation. Those are three different pressures and they point in different directions, which is why a modern LLM's design looks arbitrary until you know which pressure each decision is answering.",
        "Start with where the parameters are, because it is not where people guess. A transformer layer is about 12d squared: attention's four projections contribute 4d squared, and the feed-forward network contributes 8d squared. So the FFN is TWO THIRDS of the block - measured at 67% on a real configuration - and attention is one third. That is a fact about training memory and about where LoRA should be applied, and it is the reason attention-only adapters leave most of the model untouched.",
        "Now the inference pressure, which points somewhere completely different. During generation the KV cache is read for every token, and its size is 2 times layers times KV-HEADS times head-dimension times sequence times batch. Look at what is absent: the number of QUERY heads. So you can cut the cache by a large factor while keeping every query head, which is exactly what grouped-query attention does - LLaMA-2-70B uses 64 query heads and 8 KV heads, an eightfold cache reduction with the query capacity untouched. That single asymmetry is why GQA is now standard, and it is a decision no parameter count would ever have suggested. The module's theme in miniature: the FFN dominates the parameters and the KV cache dominates inference, and they are different bottlenecks living in the same block."
      ],
      "math": [
        {
          "h": "Where the parameters are",
          "paras": [
            "Four square projections in attention, and a feed-forward network that expands by roughly four and contracts back. Counting them shows the FFN carries twice what attention does.",
            "The embedding term is separate and scales with vocabulary rather than depth, which is why it dominates small models and is negligible in large ones."
          ],
          "tex": "P_{\\text{layer}} = \\underbrace{4d^2}_{W_Q,W_K,W_V,W_O} + \\underbrace{8d^2}_{\\text{FFN }(d\\to 4d\\to d)} = 12d^2, \\qquad P_{\\text{embed}} = V d",
          "texNote": "So attention is one third of a block and the FFN is two thirds - measured at 67% on a real configuration. Two consequences: LoRA applied only to attention leaves most of the model unreachable at any rank, and at fixed parameter budget the depth-versus-width choice is really a choice about how many 12d-squared units you buy. Note SwiGLU changes the FFN's constant - a gated FFN has three matrices, so the expansion factor is reduced to about 8/3 d to keep the parameter count equal."
        },
        {
          "h": "The KV cache, and what is missing from it",
          "paras": [
            "Every generated token attends to all previous ones, so the keys and values are cached rather than recomputed. The cache is read in full for every single token produced.",
            "The formula contains the number of KV heads and NOT the number of query heads, which is the entire basis of grouped-query attention."
          ],
          "tex": "M_{\\text{KV}} = 2 \\cdot L \\cdot n_{kv} \\cdot d_{\\text{head}} \\cdot s \\cdot b \\cdot \\text{bytes}",
          "texNote": "Absent: n_query. So reducing KV heads from 64 to 8 shrinks the cache eightfold while every query head still attends independently - which is why LLaMA-2-70B is configured that way. Put numbers in: a 70B model at 4k context and batch 32 in fp16 needs hundreds of gigabytes of cache under full multi-head attention and tens under GQA. That difference is the difference between a servable model and an unservable one."
        },
        {
          "h": "Pre-norm versus post-norm, measured",
          "paras": [
            "Post-norm applies normalization after the residual addition, so every layer's output passes through a normalization before continuing. Pre-norm normalizes the branch input and leaves the residual stream untouched.",
            "The consequence is a clean additive path from the loss to every layer, and it is why every modern LLM is pre-norm."
          ],
          "tex": "\\text{post: } x \\leftarrow \\mathrm{Norm}(x + F(x)) \\qquad \\text{pre: } x \\leftarrow x + F(\\mathrm{Norm}(x))",
          "texNote": "Measured on a 24-layer stack with a unit loss: the gradient reaching layer 0 is on the order of 110 under pre-norm and 3.7e-7 under post-norm. That is not a small difference - post-norm at depth simply does not train without warmup and careful initialization. The cost of pre-norm is that the residual stream's magnitude grows with depth, which is why a final normalization before the output head is required."
        }
      ],
      "code": [
        {
          "h": "One attention implementation, parameterized by KV heads",
          "paras": [
            "MHA, GQA and MQA are not three mechanisms - they are one, with a single parameter controlling how many KV heads the query heads share. Writing it once makes the cache argument concrete."
          ],
          "code": "class GroupedQueryAttention(nn.Module):\n    def __init__(self, d, n_heads, n_kv):        # n_kv == n_heads -> MHA\n        super().__init__()                        # n_kv == 1        -> MQA\n        self.h, self.kv = n_heads, n_kv           # 1 < n_kv < n_heads -> GQA\n        self.dh = d // n_heads\n        self.q  = nn.Linear(d, n_heads * self.dh, bias=False)\n        self.k  = nn.Linear(d, n_kv     * self.dh, bias=False)   # <- shrinks\n        self.v  = nn.Linear(d, n_kv     * self.dh, bias=False)   # <- with n_kv\n        self.o  = nn.Linear(d, d, bias=False)\n\n    def forward(self, x, cache=None):\n        B, S, _ = x.shape\n        q = self.q(x).view(B, S, self.h,  self.dh).transpose(1, 2)\n        k = self.k(x).view(B, S, self.kv, self.dh).transpose(1, 2)\n        v = self.v(x).view(B, S, self.kv, self.dh).transpose(1, 2)\n        if cache is not None:\n            k, v = cache.append(k, v)             # THE cache - read every token\n        rep = self.h // self.kv                   # each KV head serves `rep`\n        k = k.repeat_interleave(rep, dim=1)       # query heads\n        v = v.repeat_interleave(rep, dim=1)\n        out = F.scaled_dot_product_attention(q, k, v, is_causal=cache is None)\n        return self.o(out.transpose(1, 2).reshape(B, S, -1))\n\n# THE TABLE THAT DECIDES THE DESIGN (d=8192, 80 layers, 64 heads):\n#   n_kv   KV-proj params   KV cache @ 4k ctx, batch 32, fp16\n#   64     100%             ~336 GB      MHA  - unservable\n#    8      ~53%            ~ 42 GB      GQA  - LLaMA-2-70B's choice\n#    1      ~50%            ~  5 GB      MQA  - smallest, some quality cost\n#\n# NOTE WHAT DID NOT CHANGE: the number of QUERY heads. Every query head still\n# attends independently; they just share keys and values. That is why GQA costs\n# so little quality for so much memory - and it is a decision that no parameter\n# count would have suggested, because the KV projections are a small share of\n# the weights.",
          "caption": "One class, one parameter. The table is the argument: cutting KV heads from 64 to 8 takes the cache from unservable to routine while leaving every query head intact - and the parameter saving is almost incidental."
        },
        {
          "h": "The modern block, and why each choice is there",
          "paras": [
            "A current LLM block differs from the original transformer in five specific ways, and each has a stated reason. Knowing the reason is what lets you evaluate a new proposal rather than copy a configuration."
          ],
          "code": "class Block(nn.Module):\n    def forward(self, x, cache):\n        # 1. PRE-NORM: normalize the BRANCH INPUT, leave the residual alone.\n        #    Measured at depth 24: gradient reaching layer 0 is ~110 pre-norm\n        #    vs 3.7e-7 post-norm. Post-norm at depth does not train without\n        #    heavy warmup. Cost: the residual stream grows, hence a final norm.\n        x = x + self.attn(self.norm1(x), cache)\n        x = x + self.ffn(self.norm2(x))\n        return x\n\n# 2. RMSNorm instead of LayerNorm: drop the mean subtraction and the bias.\n#      rms(x) = x / sqrt(mean(x^2) + eps) * g\n#    Fewer operations, one fewer reduction, and empirically no quality cost -\n#    a pure efficiency win on an op that is memory-bound and runs every layer.\n#\n# 3. SwiGLU instead of GELU: FFN(x) = (Swish(xW1) * xW3) W2 - a GATED unit, so\n#    THREE matrices instead of two. To keep the parameter count equal the\n#    expansion is reduced from 4d to about 8/3 d. Consistently better per\n#    parameter, which is why it displaced the plain MLP.\n#\n# 4. RoPE instead of learned absolute positions: rotates q and k by a\n#    position-dependent angle, so attention scores depend on RELATIVE position.\n#    Extrapolates better and needs no position embedding table.\n#\n# 5. NO BIASES anywhere. Removing them costs nothing measurable and simplifies\n#    tensor-parallel sharding and fusion.\n\n# THE HONEST CAVEAT on comparing these at small scale: on an easy task with\n# tiny models, MHA / GQA / MQA all reach comparable accuracy. The KV-cache\n# difference is EXACT and immediate; the quality difference needs hard\n# benchmarks at real scale to resolve, where GQA lands within about a point of\n# MHA. Do not conclude from a small experiment that the choice does not matter.",
          "caption": "Five changes, five stated reasons - stability, efficiency, quality per parameter, extrapolation, and simplicity. And the caveat that matters for anyone benchmarking these: the memory difference is exact and immediate, the quality difference is not resolvable at small scale."
        }
      ],
      "useCases": [
        "Choosing an architecture for a model you intend to SERVE, where the KV-cache formula determines how many concurrent requests fit and therefore the cost per token - a constraint that parameter count alone completely hides.",
        "Reading a new model release and understanding its configuration: the ratio of query heads to KV heads, the normalization placement, the FFN's gating and expansion factor are the fields that tell you what the designers were optimizing.",
        "Deciding where to apply parameter-efficient fine-tuning, since the FFN holds two thirds of a block and attention-only adapters leave most of the model unreachable at any rank.",
        "Capacity planning for long context, where the cache grows linearly with sequence length and the choice of KV heads made at design time bounds what context length is economically servable years later."
      ],
      "pitfalls": [
        "Assuming attention holds most of the parameters. A block is about 12d squared, of which the FFN is 8 - two thirds. This is why attention-only LoRA leaves most of the model untouched, and it surprises people who think of transformers as attention machines.",
        "Forgetting that the KV cache does not contain query heads. Its size scales with KV heads only, which is the entire reason grouped-query attention works - you keep all the query capacity and pay a fraction of the memory.",
        "Using post-norm at depth. The gradient reaching the first layer is smaller by many orders of magnitude - measured at 3.7e-7 against 110 for pre-norm on a 24-layer stack - so deep post-norm models simply do not train without heavy warmup and careful initialization.",
        "Comparing MHA, GQA and MQA on a small model and an easy task. They will look identical, because the quality difference needs hard benchmarks at real scale to resolve. The memory difference is exact and immediate; do not conclude the choice is free from a toy experiment.",
        "Swapping GELU for SwiGLU without adjusting the expansion factor. A gated FFN has three matrices rather than two, so keeping 4d expansion increases the parameter count by half - which makes any comparison against the ungated version meaningless.",
        "Treating the residual stream as neutral under pre-norm. Its magnitude grows with depth because nothing normalizes it, which is why a final normalization before the output head is required and why activation magnitudes are worth monitoring in deep pre-norm models.",
        "Choosing depth versus width from parameter count alone. They cost the same per 12d-squared unit and behave differently - depth affects the gradient path and the pipeline-parallel schedule, width affects matmul shapes and tensor-parallel efficiency."
      ],
      "connections": [
        {
          "ref": "transformers/gqa-mqa",
          "text": "The mechanism developed properly. What this lesson adds is the systems reading: the cache formula's omission of query heads is why the technique exists, and it is a decision driven entirely by inference memory rather than by modelling."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "The clearest consequence of the inference regime. Decoding reads the whole model and the whole cache to produce one token, which is why it is bandwidth-bound and why verifying several tokens in one pass costs almost nothing extra."
        },
        {
          "ref": "llm-systems/moe",
          "text": "The next step in decoupling: MoE breaks the link between parameter count and FLOPs per token, buying capacity without buying compute - and paying in memory residency and all-to-all communication instead."
        },
        {
          "ref": "fine-tuning/lora",
          "text": "Why targeting attention only is a mistake: the FFN is two thirds of each block, so an attention-only adapter cannot reach most of the model at any rank. The parameter distribution here is the reason for that recommendation."
        },
        {
          "ref": "training-systems/training-stability",
          "text": "Pre-norm is a stability decision before it is anything else, and the architectural fixes for large-scale loss spikes - qk-layernorm, z-loss - belong to the same family of design choices made to keep training from diverging."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Where are a transformer block's parameters?",
          "a": "About 12d squared per layer: 4d squared in attention's four projections and 8d squared in the feed-forward network. The FFN is two thirds."
        },
        {
          "q": "What is the KV cache size?",
          "a": "2 times layers times KV heads times head dimension times sequence times batch times bytes. Note that the number of query heads does not appear."
        },
        {
          "q": "Why does grouped-query attention work so well?",
          "a": "Because the cache scales with KV heads only. You can cut KV heads eightfold and keep every query head attending independently, paying a fraction of the memory."
        },
        {
          "q": "What configuration does LLaMA-2-70B use?",
          "a": "64 query heads with 8 KV heads - an eightfold cache reduction with the query capacity untouched."
        },
        {
          "q": "What is the difference between MHA, GQA and MQA?",
          "a": "One parameter: the number of KV heads. Equal to the head count is MHA, one is MQA, anything between is GQA."
        },
        {
          "q": "Why is pre-norm used instead of post-norm?",
          "a": "It leaves a clean additive residual path. Measured at depth 24, the gradient reaching layer 0 is about 110 under pre-norm and 3.7e-7 under post-norm."
        },
        {
          "q": "What does pre-norm cost?",
          "a": "The residual stream's magnitude grows with depth because nothing normalizes it, which is why a final normalization before the output head is required."
        },
        {
          "q": "What is RMSNorm and why is it used?",
          "a": "Normalization by the root mean square with no mean subtraction and no bias. Fewer operations and one fewer reduction, with no measured quality cost."
        },
        {
          "q": "Why does SwiGLU change the expansion factor?",
          "a": "A gated FFN has three matrices instead of two, so the expansion is reduced from 4d to about 8/3 d to keep the parameter count equal."
        },
        {
          "q": "Why RoPE rather than learned positional embeddings?",
          "a": "It rotates queries and keys by a position-dependent angle, so scores depend on relative position - which extrapolates better and needs no embedding table."
        },
        {
          "q": "Why do modern LLMs drop biases?",
          "a": "They cost nothing measurable in quality and their removal simplifies tensor-parallel sharding and kernel fusion."
        },
        {
          "q": "Why can you not compare GQA against MHA on a small model?",
          "a": "On easy tasks at small scale they perform identically. The memory difference is exact and immediate; the quality difference needs hard benchmarks at real scale."
        }
      ],
      "standard": [
        {
          "q": "Walk through a modern LLM block and justify each design choice.",
          "a": "I WOULD ORGANIZE IT BY WHICH PRESSURE EACH CHOICE ANSWERS, because that is what makes the design legible rather than a list. Three pressures: parameter count, training stability, and inference memory bandwidth - and they point in different directions. PARAMETER ALLOCATION. A block is about 12d squared: attention's four projections are 4d squared, the FFN is 8d squared. So the FFN is TWO THIRDS, which surprises people who think of transformers as attention machines. Two consequences follow immediately: attention-only LoRA leaves most of the model unreachable at any rank, and the depth-versus-width choice at fixed budget is a choice about how many 12d-squared units you buy. STABILITY: PRE-NORM. Normalize the branch input rather than the sum, so the residual stream is a clean additive path from the loss to every layer. The measurement is stark - on a 24-layer stack the gradient reaching layer 0 is about 110 under pre-norm and 3.7e-7 under post-norm. Deep post-norm models do not train without heavy warmup and careful initialization. The cost is that the residual stream's magnitude grows with depth, which is why a final normalization before the output head is required. INFERENCE MEMORY: GROUPED-QUERY ATTENTION. This is the one that shows the systems reasoning most clearly. During generation the KV cache is read in full for every token, and its size is 2 times layers times KV HEADS times head dimension times sequence times batch. The number of QUERY heads does not appear. So you can cut KV heads from 64 to 8 - an eightfold cache reduction - while every query head still attends independently. That is LLaMA-2-70B's configuration, and it takes the cache at realistic context and batch from hundreds of gigabytes to tens. No parameter count would ever have suggested it, because the KV projections are a small share of the weights. EFFICIENCY: RMSNorm AND NO BIASES. RMSNorm drops the mean subtraction and the bias, so fewer operations and one fewer reduction on an op that is memory-bound and runs twice per layer. Dropping biases costs nothing measurable and simplifies tensor-parallel sharding and fusion. QUALITY PER PARAMETER: SwiGLU. A gated FFN, three matrices rather than two, with the expansion reduced to about 8/3 d so the parameter count is unchanged. Consistently better per parameter, which is why it displaced the plain MLP - and the expansion adjustment is the detail people omit, which makes any comparison meaningless. POSITION: RoPE. Rotating queries and keys by a position-dependent angle makes scores depend on relative position, which extrapolates better than learned absolute embeddings and removes the embedding table. THE FRAMING I WOULD END ON. The FFN dominates the PARAMETERS and the KV cache dominates INFERENCE memory - two different bottlenecks in the same block, answered by different techniques. Knowing which pressure a choice answers is what lets you evaluate a new proposal rather than copy a configuration.",
          "deepDive": {
            "q": "Derive the KV cache size and use it to explain the design of a servable model.",
            "a": "THE DERIVATION. During autoregressive generation, each new token attends to all previous positions. Recomputing every previous key and value at each step would be quadratic in total work, so they are cached. What must be stored: for each LAYER, for each KV HEAD, for each POSITION, one key vector and one value vector of dimension d_head, for each sequence in the batch. That gives 2 (keys and values) times L (layers) times n_kv (KV heads) times d_head times s (sequence length) times b (batch) times the bytes per element. THE ABSENCE THAT MATTERS. The number of QUERY heads is not in that expression. Queries are computed fresh for the current token and discarded; only keys and values persist. So query capacity and cache size are decoupled, and that decoupling is the entire opportunity. PUTTING NUMBERS IN, for a 70B-class model: 80 layers, d_head 128, fp16. Under full multi-head attention with 64 KV heads, at 4k context and batch 32, the cache is on the order of hundreds of gigabytes - larger than the model weights and unservable on any reasonable node. With 8 KV heads it is tens of gigabytes, which fits alongside the weights. That is not an optimization, it is the difference between a model you can serve and one you cannot. WHAT THIS IMPLIES FOR DESIGN, and this is the systems reasoning. (1) KV HEADS ARE A SERVING PARAMETER decided at pretraining time and unchangeable afterwards. Choosing 64 KV heads bakes in a serving cost for the model's entire life. This is a rare case where an architecture decision made once has an irreversible operational consequence. (2) CONTEXT LENGTH IS BOUNDED BY THIS, linearly. A model advertised at 128k context needs 32 times the cache of the same model at 4k, per sequence - so the maximum concurrent requests falls by the same factor, and the economics of long context are set here rather than by the attention mechanism. (3) BATCH SIZE AND CONTEXT TRADE DIRECTLY, since the product s times b is what appears. A serving system is choosing a point on that curve every time it admits a request. (4) THE CACHE GROWS DURING A REQUEST, so a request's memory footprint increases over its lifetime - which is unlike almost anything in training and is why serving capacity planning is genuinely harder. THE TECHNIQUES THAT FOLLOW, all attacking this one term. GQA and MQA reduce n_kv. Quantizing the cache to 8 or 4 bits reduces the bytes. Sliding-window and local attention bound s. Paged attention fixes the FRAGMENTATION of this allocation rather than its size. And cross-layer KV sharing reduces L's contribution. Every one of them is a response to the same formula, which is a good sign that the formula is the right object to understand."
          }
        },
        {
          "q": "How would you choose between depth and width at a fixed parameter budget?",
          "a": "THE COST IS SYMMETRIC AND THE CONSEQUENCES ARE NOT. A layer is about 12d squared parameters, so at fixed budget you are trading L against d squared - halving the width lets you afford four times the layers. Parameter count alone cannot distinguish them, which means the decision is made on other grounds entirely. WHAT DEPTH BUYS. More sequential composition - each layer can build on the last, which is what lets a model perform multi-step transformations. Empirically, deeper models tend to be better at tasks requiring composition, and the scaling literature generally finds that quality is remarkably insensitive to the aspect ratio over a broad range, with a mild preference for going deeper than intuition suggests. WHAT DEPTH COSTS. (1) A LONGER GRADIENT PATH, which is a training-stability question and is why pre-norm matters more as depth grows. (2) MORE SEQUENTIAL WORK at inference - depth is on the critical path of every token, so a deeper model has higher latency at the same parameter count even with identical FLOPs. For interactive serving that is a real cost. (3) MORE KV CACHE, since the cache scales with L - so a deeper, narrower model at the same parameter count has a LARGER cache, which is a genuine and often-missed consequence. (4) PIPELINE PARALLELISM likes depth (more stages) while tensor parallelism likes width (bigger matmuls to split). WHAT WIDTH BUYS. Better hardware utilization: larger matrices have higher arithmetic intensity and tile better onto tensor cores, so a wide model achieves higher MFU at the same FLOP count. Fewer sequential steps, hence lower latency. And better tensor-parallel efficiency, since you are splitting bigger operations. WHAT WIDTH COSTS. Attention head dimension and head count interact with width, and very wide models can end up with awkward head configurations. And the FFN's memory traffic grows. HOW I WOULD ACTUALLY DECIDE. Start from the established aspect ratios for the model class, because the quality surface is flat enough that deviating buys little and the operational consequences of deviating are real. Then adjust for the DEPLOYMENT: if latency matters, favour width, because depth is on the critical path and width is not. If long context matters, favour width, because the cache scales with depth. If you will use pipeline parallelism, some depth is required to have stages to pipeline. THE POINT I WOULD MAKE. This is a case where the modelling literature says the choice barely matters and the systems consequences say it matters a lot - latency, cache size, and parallelism strategy all move. So the right framing is that quality gives you a wide feasible region and the systems constraints pick the point inside it, which is the opposite of how the decision is usually presented."
        },
        {
          "q": "Explain the difference between the training and inference regimes for an LLM.",
          "a": "THEY HAVE OPPOSITE BOTTLENECKS, and almost every technique in this area is legible once you know which regime it targets. TRAINING IS COMPUTE-BOUND. A training step processes many tokens in parallel - batch times sequence - so every weight read from memory is amortized over thousands of token-positions. Arithmetic intensity is high, the matmuls are large and tile well, and a well-tuned run achieves a substantial fraction of the hardware's peak FLOPs. The binding constraint is the compute budget, and the interesting question is how to ALLOCATE it - between parameters and tokens, which is what the scaling laws answer. GENERATION IS MEMORY-BANDWIDTH-BOUND, and this is the fact that reorganizes everything. To produce ONE token you must read every weight in the model and the entire KV cache, and then do one token's worth of arithmetic with them. Arithmetic intensity is approximately one - you move a byte and do about one operation with it. So the accelerator sits idle waiting on memory, and typical single-stream decoding achieves a small percentage of peak FLOPs. The binding constraint is BYTES READ PER TOKEN. WHAT FOLLOWS FROM THAT, and it explains the whole inference toolkit. QUANTIZATION helps because 4-bit weights are four times fewer bytes to read - the win is bandwidth, not arithmetic, which is why it speeds up decoding far more than it speeds up training. GQA helps because the cache is read every token. BATCHING is the fundamental fix, because it amortizes the weight read over many sequences - which is why continuous batching is the single most important serving technique and why throughput and latency trade so sharply. SPECULATIVE DECODING works because verifying several tokens in ONE forward pass costs almost the same as one token, since the pass is bandwidth-bound - you get the extra tokens nearly free. That technique is unintelligible without this framing and obvious with it. THE ERROR THIS PREVENTS. Carrying intuition across the regimes. People expect quantization to speed up training proportionally - it does not, because training is compute-bound and the arithmetic is what matters. People expect a model with half the FLOPs to decode twice as fast - it does not, unless it also has half the parameters to read. And people optimize decode-time FLOPs when the machine is idle waiting on memory. THE MIXED CASE worth noting: PREFILL, processing the prompt, is compute-bound like training, because all prompt positions are processed in parallel. So a single request has a compute-bound phase and a bandwidth-bound phase with completely different characteristics, which is why serving systems schedule them separately and why time-to-first-token and inter-token latency are separate metrics with separate fixes.",
          "deepDive": {
            "q": "Quantify the arithmetic intensity of a decode step and explain what it implies for batching.",
            "a": "THE CALCULATION for a single-sequence decode step. BYTES READ: essentially the entire parameter set, since every weight participates in producing the token. For a model with P parameters at 2 bytes each that is 2P bytes, plus the KV cache. FLOPS PERFORMED: about 2P, since each parameter contributes one multiply-accumulate for the single token position. So arithmetic intensity is roughly 2P FLOPs over 2P bytes, which is about ONE FLOP PER BYTE. WHAT THAT MEANS AGAINST THE HARDWARE. A modern accelerator has a ratio of peak FLOPs to memory bandwidth in the hundreds - it can perform hundreds of operations in the time it takes to read one byte. An operation with intensity one therefore uses a small fraction of the arithmetic units, and the step time is set entirely by how fast you can stream the weights. A useful way to state it: single-stream decoding time is approximately the model size divided by the memory bandwidth, and you can predict decode speed from those two numbers alone with surprising accuracy. WHAT BATCHING DOES TO THIS. Process b sequences together and you read the weights ONCE while performing b times the arithmetic. Bytes stay at 2P plus b times the cache; FLOPs become 2Pb. So arithmetic intensity is roughly b - it scales linearly with batch size. Somewhere around a batch of a hundred or more, depending on the hardware ratio, you cross from memory-bound into compute-bound, and beyond that point additional batch buys throughput only at the cost of latency. THE CONSEQUENCES FOR SERVING DESIGN, which all follow from that one curve. (1) THROUGHPUT AND LATENCY TRADE SHARPLY. At batch one you have the best latency and terrible utilization; at large batch you have excellent throughput and worse per-request latency. There is no configuration that is good at both, which is why serving systems expose it as a policy decision. (2) BATCHING IS THE HIGHEST-LEVERAGE SERVING TECHNIQUE, and CONTINUOUS batching - admitting new requests as others finish rather than waiting for a whole batch - is what makes it practical with variable-length generation. (3) THE KV CACHE LIMITS THE BATCH, and therefore limits throughput. This is the chain that makes cache size an economic quantity: cache per sequence bounds concurrent sequences, which bounds arithmetic intensity, which bounds achieved FLOPs. Everything that shrinks the cache - GQA, quantized cache, paged allocation - raises the throughput ceiling. (4) PREFILL IS ALREADY COMPUTE-BOUND, since all prompt positions are processed in parallel, which is why mixing prefill and decode in one batch is awkward and why systems either chunk prefill or schedule the two phases separately. THE PREDICTION THIS ENABLES, which I find the most useful part: you can estimate decode latency for a model on hardware you have never used, from parameter count, precision and memory bandwidth, before running anything. And when the measurement disagrees with that estimate by a large factor, the gap is the finding - usually batching, or an implementation not streaming weights efficiently."
          }
        },
        {
          "q": "A new model release lists its configuration. What do you read from it?",
          "a": "I WOULD READ IT AS A SET OF DECISIONS ABOUT WHAT THE DESIGNERS WERE OPTIMIZING, and there are about six fields that carry most of the information. (1) THE RATIO OF QUERY HEADS TO KV HEADS. This is the first thing I look at, because it tells me whether serving cost was a design consideration. 64 query heads with 8 KV heads says they intended this to be served at scale and accepted a small quality cost for an eightfold cache reduction. Equal counts say either it is an older design or serving was not the priority. (2) THE FFN EXPANSION AND WHETHER IT IS GATED. An expansion near 8/3 with three matrices means SwiGLU with the parameter count held constant, which is the modern default and tells me they are following current practice. A 4x ungated expansion is older. If I see a gated FFN at 4x expansion, the parameter count is half again larger than the ungated equivalent and any comparison needs care. (3) NORMALIZATION TYPE AND PLACEMENT. RMSNorm and pre-norm are near-universal now; anything else is a signal worth investigating. And a final norm before the head confirms pre-norm, since the residual stream needs it. (4) THE POSITION SCHEME AND ITS PARAMETERS. RoPE with a stated base frequency, and whether that base has been increased - a large base is the signature of context extension, and it tells me the advertised context length was achieved by scaling rather than by pretraining at that length. That distinction matters for how the model actually behaves at long context. (5) VOCABULARY SIZE, which sets the embedding and output-head parameters and, more practically, the size of the logits tensor - which is a real memory term at training time and affects the tokenizer's efficiency on non-English text. (6) DEPTH VERSUS WIDTH, from which I can compute the parameter count as roughly 12 times layers times d squared and check it against the advertised size - a useful sanity check that also reveals whether embeddings are being counted. WHAT I WOULD COMPUTE IMMEDIATELY. The KV cache per token per sequence, from 2 times layers times KV heads times head dimension times bytes. That single number, multiplied by the context length and the batch I intend to serve, tells me whether this model is deployable on my hardware - and it is the calculation nobody publishes and everyone needs. WHAT IS NOT IN THE CONFIG AND MATTERS AS MUCH. The training token count, which the scaling literature says is the other half of the story and which determines whether the model is compute-optimal or deliberately over-trained for inference efficiency. The data mixture. And whether the context length was pretrained or extended. A configuration tells you the shape of the model; it does not tell you how well it was trained, and the second is at least as important."
        },
        {
          "q": "Why is the FFN two thirds of the parameters, and what follows from that?",
          "a": "THE ARITHMETIC. Attention has four square projections - query, key, value and output - each d by d, so 4d squared. The feed-forward network expands to 4d and contracts back, so two matrices of d by 4d, which is 8d squared. Total 12d squared per layer, with the FFN at 8 of the 12 - two thirds. Measured on a real configuration it comes out at about 67%, which matches. WHAT FOLLOWS, and there are four consequences worth knowing. (1) PARAMETER-EFFICIENT FINE-TUNING MUST TARGET THE FFN. LoRA applied only to attention's query and value projections - the original paper's choice, made under a 2021 parameter budget - can reach at most a third of the block, and in practice a small part of that. At any rank. This is the concrete reason the modern recommendation is to target all linear layers, and it is an arithmetic fact rather than an empirical finding. (2) MoE TARGETS THE FFN, not attention. Since the FFN is where the parameters are, replacing it with a set of experts is how you multiply parameter count without multiplying attention cost - which is why every mixture-of-experts transformer routes at the FFN and leaves attention dense. That design is not arbitrary; it follows from this distribution. (3) THE FFN IS WHERE THE COMPUTE IS TOO, at least for short sequences, since FLOPs track parameters when every parameter participates once per token. So both memory and arithmetic concentrate there, which makes it the right target for structured pruning and for quantization effort. (4) INTERPRETABILITY WORK CONCENTRATES ON THE FFN for the same reason - the key-value memory interpretation of the FFN, and the observation that factual associations live there, are downstream of it holding most of the capacity. WHAT DOES NOT FOLLOW, and this is the interesting part. The FFN holding most of the PARAMETERS does not mean it dominates INFERENCE memory - that is the KV cache, which comes from attention and scales with sequence length rather than with parameter count. So the two thirds figure is the right guide for training memory, adapter placement and pruning, and the wrong guide entirely for serving capacity. Those are the two regimes, and confusing them is exactly the error this module is about. THE CAVEAT ON THE ARITHMETIC. Gated FFNs change the constant: SwiGLU has three matrices, and the expansion is reduced to about 8/3 d to hold the parameter count equal - so the two thirds figure survives, but the naive calculation with a 4x expansion and three matrices does not. And at small model sizes the embedding term, which scales with vocabulary times width rather than with depth, can rival the layers entirely, so the two thirds rule is a large-model statement."
        },
        {
          "q": "How does this lesson's framing apply to a serving cost estimate?",
          "a": "THE CHAIN, and every link is computable from the configuration. (1) WEIGHTS: parameter count times bytes per parameter. This is fixed per replica and shared across all requests, so it is amortized. (2) KV CACHE PER SEQUENCE: 2 times layers times KV heads times head dimension times bytes, per token, times the sequence length. This is PER REQUEST and it grows as the request generates. (3) CONCURRENT SEQUENCES: whatever memory remains after the weights, divided by the cache per sequence. This is the batch size you can actually serve. (4) ARITHMETIC INTENSITY equals roughly that batch size, since batching amortizes the weight read. (5) ACHIEVED THROUGHPUT follows from where that intensity sits relative to the hardware's FLOP-to-bandwidth ratio - below it you are bandwidth-bound and throughput scales with batch; above it you are compute-bound and it does not. (6) COST PER TOKEN is the hourly device cost divided by tokens per second. WHAT THE CHAIN REVEALS. The KV cache is the pivot. It bounds the batch, which bounds arithmetic intensity, which bounds achieved FLOPs, which bounds throughput, which sets the cost. So a technique that halves the cache does not halve a memory number - it roughly doubles the servable batch and therefore the throughput, and halves the cost per token. That is why GQA is worth so much more than its parameter saving suggests, and it is the argument I would make to justify the quality cost. WHERE THE ESTIMATE GOES WRONG IN PRACTICE. (1) FRAGMENTATION. Naive per-request contiguous cache allocation must reserve for the maximum possible length, and most requests do not reach it - so the effective batch is far below the arithmetic. Paged attention exists to recover that, and without it the estimate is optimistic by a large factor. (2) VARIABLE LENGTHS. The cache grows during a request, so a burst of long requests can exceed capacity even when the average fits. Admission control and preemption are required, and the estimate needs to be against a percentile rather than a mean. (3) PREFILL. Processing the prompt is compute-bound and can dominate for short generations with long prompts, so the decode-only model understates cost for retrieval-augmented workloads specifically. THE PRACTICAL VERSION. Compute the capacity as a two-dimensional surface over concurrent requests and context length rather than a single number, measure the achieved batch against the theoretical one to quantify fragmentation, and price against your traffic's percentile rather than its mean. That is the difference between an estimate that survives contact with production and one that is off by a factor."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Where a transformer block's parameters are",
        "back": "12d^2 per layer: 4d^2 in attention's four projections, 8d^2 in the FFN. The FFN is TWO THIRDS (measured 67%). Embeddings are Vd, separate - they dominate small models and are negligible in large ones."
      },
      {
        "type": "formula",
        "front": "KV cache size - and what is missing",
        "back": "2 x L x n_KV x d_head x seq x batch x bytes. The number of QUERY heads does NOT appear. That single absence is the entire basis of GQA: cut KV heads 64->8 for an 8x cache reduction with every query head still attending independently."
      },
      {
        "type": "intuition",
        "front": "MHA, GQA and MQA are ONE mechanism",
        "back": "Parameterized by n_kv: equal to n_heads = MHA, 1 = MQA, between = GQA. LLaMA-2-70B uses 64 query heads / 8 KV heads. At 4k context, batch 32, a 70B model's cache goes from hundreds of GB (MHA) to tens (GQA) - servable vs not."
      },
      {
        "type": "intuition",
        "front": "Pre-norm vs post-norm, measured",
        "back": "At depth 24 the gradient reaching layer 0 is ~110 (pre-norm) vs 3.7e-7 (post-norm). Deep post-norm does not train without heavy warmup. The COST of pre-norm: the residual stream's magnitude grows with depth, hence a final norm before the head."
      },
      {
        "type": "intuition",
        "front": "The two regimes",
        "back": "TRAINING is COMPUTE-bound - weights are amortized over batch x sequence positions, so intensity is high. GENERATION is MEMORY-BANDWIDTH-bound - you read EVERY weight and the WHOLE cache to make ONE token, so intensity is ~1 and the GPU idles."
      },
      {
        "type": "formula",
        "front": "Decode arithmetic intensity",
        "back": "~2P FLOPs over ~2P bytes = about ONE FLOP PER BYTE, against hardware ratios in the hundreds. So single-stream decode time ~ model size / memory bandwidth - you can predict it from two numbers. Batching raises intensity to ~b."
      },
      {
        "type": "intuition",
        "front": "Why the FFN is the right PEFT and MoE target",
        "back": "It holds two thirds of each block. Attention-only LoRA cannot reach most of the model at ANY rank - an arithmetic fact, not an empirical finding. And MoE routes at the FFN because that is where the parameters are; attention stays dense."
      },
      {
        "type": "pitfall",
        "front": "SwiGLU changes the expansion factor",
        "back": "A gated FFN has THREE matrices, not two - so the expansion drops from 4d to ~8/3 d to hold the parameter count equal. Keeping 4x with gating inflates the block by half and makes any comparison against the ungated version meaningless."
      },
      {
        "type": "pitfall",
        "front": "You cannot compare GQA vs MHA at small scale",
        "back": "On easy tasks with tiny models they perform identically. The MEMORY difference is exact and immediate; the QUALITY difference needs hard benchmarks at real scale (GQA lands within ~1 point). Do not conclude the choice is free from a toy run."
      },
      {
        "type": "intuition",
        "front": "KV heads are an irreversible SERVING decision",
        "back": "Chosen at pretraining time and unchangeable afterwards, they bound the servable context length and batch for the model's entire life. A rare case where one architecture choice has a permanent operational consequence."
      },
      {
        "type": "intuition",
        "front": "The cache is the pivot in a cost estimate",
        "back": "cache/sequence -> concurrent sequences -> arithmetic intensity -> achieved FLOPs -> throughput -> cost per token. So HALVING the cache roughly DOUBLES throughput and halves cost - which is why GQA is worth far more than its parameter saving suggests."
      },
      {
        "type": "intuition",
        "front": "Depth vs width: quality is flat, systems are not",
        "back": "12d^2 per layer, so the parameter cost is symmetric and quality is insensitive over a broad range. But depth is on the CRITICAL PATH (latency), scales the KV CACHE, and suits pipeline parallelism; width tiles better (MFU) and suits tensor parallelism."
      }
    ],
    "refs": [
      {
        "title": "Ainslie et al. (2023), GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
        "url": "https://arxiv.org/abs/2305.13245"
      },
      {
        "title": "Shazeer (2019), Fast Transformer Decoding: One Write-Head is All You Need (MQA)",
        "url": "https://arxiv.org/abs/1911.02150"
      },
      {
        "title": "Xiong et al. (2020), On Layer Normalization in the Transformer Architecture (pre-norm vs post-norm)",
        "url": "https://arxiv.org/abs/2002.04745"
      },
      {
        "title": "Shazeer (2020), GLU Variants Improve Transformer (SwiGLU)",
        "url": "https://arxiv.org/abs/2002.05202"
      },
      {
        "title": "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models",
        "url": "https://arxiv.org/abs/2307.09288"
      }
    ],
    "demos": [
      "kv-cache",
      "rope",
      "multi-head-attention",
      "moe"
    ],
    "demoTitles": {
      "kv-cache": "KV Cache",
      "rope": "RoPE Explorer",
      "multi-head-attention": "Multi-Head Attention",
      "moe": "Mixture of Experts (MoE)"
    }
  }
};
