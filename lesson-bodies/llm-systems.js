// GENERATED from content/lessons/llm-systems/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "llm-systems". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
    ]
  },
  "scaling-laws": {
    "level": "core",
    "body": {
      "intuition": [
        "Scaling laws are the training regime's central result: language-model loss falls as a smooth POWER LAW in parameters, in data, and in compute, and it does so predictably across many orders of magnitude. That predictability is the practically important part and it is under-appreciated. It means you can run a handful of small models, fit a curve, and forecast what a run a thousand times larger will achieve - which turns the decision to spend millions of dollars of compute into an extrapolation you can check rather than a bet.",
        "The famous correction is a story about methodology. Kaplan et al. established the power laws and concluded that, given a compute budget, you should scale PARAMETERS much faster than data. The field followed that for two years, building very large models trained on comparatively few tokens. Then Chinchilla re-ran the analysis and found the opposite: parameters and data should scale roughly EQUALLY, at about twenty tokens per parameter. The reason for the discrepancy is instructive - Kaplan used a fixed learning-rate schedule across runs of different lengths, which systematically under-trains the shorter ones and therefore makes small models look worse than they are. Matching the schedule to the token count changed the conclusion. A 70B model trained on 1.4T tokens beat a 280B model trained on 300B tokens at the same compute: four times smaller, four times more data, better on essentially everything.",
        "And then modern practice moved past Chinchilla in a way that lands exactly on this module's theme. Compute-optimal means optimal for TRAINING compute - it minimizes the cost of producing the model. But a model you intend to SERVE incurs inference cost forever, and inference cost scales with parameter count, not with how many tokens you trained on. So if the model will be deployed, you want a SMALLER model trained LONGER: pay more once, pay less on every request for the model's life. That is why the widely-used open models are trained far past twenty tokens per parameter, and why quoting Chinchilla-optimal as the right answer is a training-regime answer to what is usually a two-regime question."
      ],
      "math": [
        {
          "h": "The power laws, and the parametric form",
          "paras": [
            "Loss falls as a power law in each of parameters and data, with an irreducible term representing the entropy of the data itself. The parametric fit is what lets you extrapolate rather than merely observe.",
            "The two exponents being close in magnitude is the finding: neither factor dominates, so neither should be scaled preferentially."
          ],
          "tex": "L(N, D) = \\underbrace{E}_{\\text{irreducible}} + \\frac{A}{N^{\\alpha}} + \\frac{B}{D^{\\beta}}, \\qquad \\alpha \\approx \\beta \\approx 0.34",
          "texNote": "E is the entropy floor - no amount of scale drives loss below it, because natural language is genuinely stochastic. The near-equality of alpha and beta is the Chinchilla result in one line: since the two terms fall at the same rate, a compute budget should be split so that neither is the bottleneck, which means scaling them together."
        },
        {
          "h": "The compute-optimal allocation",
          "paras": [
            "Compute is approximately six times parameters times tokens. Minimizing loss subject to that constraint, with the exponents roughly equal, gives both quantities scaling as the square root of compute.",
            "The ratio that falls out is the memorable number, and it is what the field means by Chinchilla-optimal."
          ],
          "tex": "C \\approx 6ND, \\quad \\min_{N,D} L \\;\\text{s.t.}\\; C \\Rightarrow N^{*} \\propto C^{1/2}, \\; D^{*} \\propto C^{1/2}, \\quad \\frac{D^{*}}{N^{*}} \\approx 20",
          "texNote": "Read the exponents: doubling your compute budget should mean about 1.4 times the parameters and 1.4 times the tokens, not 2 times the parameters. Kaplan's analysis gave roughly N proportional to C to the 0.73, which is why the field over-built models for two years - and the difference traces to a learning-rate schedule not matched to the token count."
        },
        {
          "h": "Accounting for inference: the objective changes",
          "paras": [
            "Training cost is paid once; inference cost is paid on every request forever and scales with parameter count. Adding it to the objective shifts the optimum toward smaller models trained on more data.",
            "How far it shifts depends on the expected serving volume, which makes the deployment plan an input to the architecture decision."
          ],
          "tex": "\\min_{N,D} \\Big[\\underbrace{6ND}_{\\text{train, once}} + \\underbrace{2N \\cdot D_{\\text{inf}}}_{\\text{serve, forever}}\\Big] \\;\\text{s.t.}\\; L(N,D) = L_{\\text{target}}",
          "texNote": "The inference term has no D in it - training longer costs nothing at serving time. So as the expected inference volume grows, the optimum moves monotonically toward smaller N and larger D, and at high volume it goes far past twenty tokens per parameter. That is the formal statement of why the widely-deployed open models are deliberately over-trained relative to Chinchilla."
        }
      ],
      "code": [
        {
          "h": "Fit a scaling law and extrapolate - the actual practical use",
          "paras": [
            "The underrated application is not choosing a ratio but FORECASTING. A handful of small runs predicts a large one, which lets you compare architectures and data mixtures before committing the budget."
          ],
          "code": "# Run a LADDER of small models - vary N over ~2 orders of magnitude, each\n# trained to a token count in the right proportion, each with its LR SCHEDULE\n# MATCHED to its token budget. That last point is what Kaplan got wrong and it\n# changes the conclusion, not just the constants.\nruns = [(n, d, final_loss) for n, d, final_loss in ladder]\n\ndef L(params, N, D):\n    E, A, B, alpha, beta = params\n    return E + A / N**alpha + B / D**beta\n\nfit = least_squares(lambda p: [L(p, n, d) - l for n, d, l in runs], x0)\n\n# NOW EXTRAPOLATE - the point of the exercise:\nprint(\"predicted loss at 70B / 1.4T:\", L(fit.x, 70e9, 1.4e12))\n\n# WHAT THIS IS FOR, and it is more useful than the ratio everyone quotes:\n#   * compare two DATA MIXTURES by fitting a curve to each - the better mixture\n#     shows a lower E or a better constant, visible at small scale\n#   * compare ARCHITECTURES before committing compute\n#   * decide whether a proposed run is worth doing AT ALL, by predicting\n#     whether it clears the target\n#   * detect that a large run is UNDERPERFORMING its own scaling curve, which\n#     is a bug signal you otherwise would not have\n\n# THE ISOFLOP METHOD, which is the most robust of Chinchilla's three:\n#   for each FIXED compute budget C, train several (N, D) pairs with 6ND = C\n#   and plot loss against N. Each budget gives a U-SHAPED curve whose minimum\n#   is the optimal N for that C. Fit those minima across budgets.\nfor C in budgets:\n    pairs = [(n, C / (6 * n)) for n in n_grid]        # 6ND = C\n    losses = [train(n, d) for n, d in pairs]\n    n_star = n_grid[argmin(losses)]                   # the U's minimum\n#   The U-shape is the whole argument made visible: too few parameters and the\n#   model cannot fit; too many and it is under-trained on the tokens the budget\n#   allows. The minimum sits near D/N ~ 20.",
          "caption": "The forecasting use is worth more than the ratio. And note the methodological point in the first comment: matching the learning-rate schedule to each run's token count is what separated Chinchilla's conclusion from Kaplan's."
        },
        {
          "h": "Compute-optimal versus inference-optimal",
          "paras": [
            "The calculation that decides real deployments, and the one that explains why the models you actually use are not Chinchilla-optimal."
          ],
          "code": "def total_cost(N, D, inference_tokens):\n    train = 6 * N * D                    # paid ONCE\n    serve = 2 * N * inference_tokens     # paid FOREVER - note: no D term\n    return train + serve\n\n# For a TARGET LOSS, sweep (N, D) pairs that achieve it and pick the cheapest:\ncandidates = [(n, d_for_target_loss(n)) for n in n_grid]\nfor inf_tokens in (0, 1e12, 1e14, 1e16):\n    best = min(candidates, key=lambda nd: total_cost(*nd, inf_tokens))\n    print(f\"{inf_tokens:.0e} inference tokens -> N={best[0]:.1e}, \"\n          f\"D/N={best[1]/best[0]:.0f}\")\n#\n#   inference tokens = 0      -> D/N ~ 20     (Chinchilla-optimal: TRAINING only)\n#   large serving volume      -> D/N >> 20    (smaller model, trained longer)\n#\n# THE INTUITION: the inference term contains N and NOT D. Training longer is\n# free at serving time. So the more you will serve, the more it pays to shrink\n# the model and compensate with tokens - which is exactly why the widely-\n# deployed open models are trained far past 20 tokens per parameter.\n\n# THE CONSTRAINT THAT EVENTUALLY BINDS: you run out of high-quality tokens.\n# Beyond that, repeating data has diminishing and eventually negative returns\n# - a few epochs are close to as good as fresh data, and many epochs are not.\n# Which turns DATA QUALITY and DEDUPLICATION into scaling-law concerns rather\n# than pipeline hygiene.",
          "caption": "The inference term contains N and not D, so training longer is free at serving time. That single asymmetry is why deployed models are deliberately over-trained and why quoting Chinchilla-optimal answers a training-only question."
        }
      ],
      "useCases": [
        "Deciding whether a proposed training run is worth its budget, by fitting a curve to a ladder of small runs and forecasting whether the large one will clear the target before any of the compute is committed.",
        "Comparing data mixtures or architectures cheaply, since a better mixture shows a better curve at small scale and the comparison costs a fraction of a real run.",
        "Choosing a model size for a product, where the expected serving volume enters the objective and typically pushes the answer well below Chinchilla-optimal in parameters and well above it in tokens.",
        "Detecting that a large run is underperforming, by comparing its loss against the curve fitted from smaller ones - a bug signal that is otherwise invisible because there is nothing to compare a single large run against."
      ],
      "pitfalls": [
        "Quoting twenty tokens per parameter as the right answer. It is the compute-optimal answer for TRAINING only. Any model you intend to serve should be smaller and trained longer, because inference cost scales with parameters and is paid forever.",
        "Fitting scaling laws with a fixed learning-rate schedule across runs of different lengths. This under-trains the shorter runs and biases the conclusion toward larger models - it is precisely the methodological difference between Kaplan's recommendation and Chinchilla's.",
        "Treating loss as capability. Scaling laws predict cross-entropy, which is smooth; downstream benchmark performance is what people care about and is measured with metrics that can be discontinuous, which is a large part of why abilities appear to emerge suddenly.",
        "Extrapolating across a change in architecture or data distribution. The fitted constants are properties of that setup, so a curve fitted on one mixture says little about another - which is exactly why comparing mixtures by their curves is useful and transferring a curve is not.",
        "Ignoring the irreducible term. Loss cannot fall below the data's entropy, so a fit that omits E will over-predict the returns to scale and forecast improvements that are not available.",
        "Assuming more data is always available. Beyond the supply of high-quality tokens you are repeating data, where a few epochs are nearly as good as fresh tokens and many epochs are not - which makes deduplication and quality filtering scaling concerns rather than hygiene.",
        "Applying dense-model scaling laws to a mixture of experts. FLOPs per token track ACTIVE parameters while capacity tracks total parameters, so the compute-optimal analysis has to be redone with that distinction or the recommendation is meaningless."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-data-pipelines",
          "text": "What Chinchilla made urgent. Once data is co-equal with parameters, the supply and quality of tokens becomes a first-order constraint, and deduplication and filtering move from hygiene to a determinant of the achievable loss."
        },
        {
          "ref": "training-systems/profiling",
          "text": "The other half of a training plan: scaling laws say how many FLOPs are worth buying and MFU says how long they take, so only the product is a schedule and a budget."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "The other route to the inference-optimal objective. Rather than training a small model longer, train a large one and distil it - both are ways of moving cost from the serving side to the training side."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Why the dense scaling laws need redoing there: MoE decouples FLOPs per token from total parameters, so the compute-optimal allocation is a different optimization with active parameters in the compute term and total parameters in the capacity term."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Where the loss-is-not-capability gap is confronted. Scaling laws predict a smooth quantity; the benchmarks people care about are measured with metrics whose discontinuity is a large part of why capabilities appear to emerge."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a scaling law?",
          "a": "Loss falls as a power law in parameters, data and compute, predictably across many orders of magnitude - which makes a large run's result forecastable from small ones."
        },
        {
          "q": "What is the parametric form?",
          "a": "L(N,D) = E + A/N^alpha + B/D^beta, where E is the irreducible entropy of the data and the two exponents are both around 0.34."
        },
        {
          "q": "What did Chinchilla find?",
          "a": "Parameters and data should scale roughly equally at about twenty tokens per parameter, rather than scaling parameters much faster as Kaplan had concluded."
        },
        {
          "q": "Why did Kaplan reach a different conclusion?",
          "a": "A fixed learning-rate schedule across runs of different lengths, which under-trains the shorter runs and makes smaller models look worse than they are."
        },
        {
          "q": "What was the headline comparison?",
          "a": "A 70B model on 1.4T tokens beat a 280B model on 300B tokens at the same compute - four times smaller, roughly four times more data, better on essentially everything."
        },
        {
          "q": "How does compute-optimal scale with budget?",
          "a": "Both parameters and tokens scale as the square root of compute, so doubling the budget means about 1.4 times each rather than 2 times the parameters."
        },
        {
          "q": "Why is Chinchilla-optimal not the right answer for a deployed model?",
          "a": "It minimizes training compute only. Inference cost scales with parameters and is paid forever, so a served model should be smaller and trained longer."
        },
        {
          "q": "Why does the inference term push toward more data?",
          "a": "Because it contains parameter count and not token count - training longer costs nothing at serving time, so it is the cheap way to buy quality."
        },
        {
          "q": "What is the IsoFLOP method?",
          "a": "For each fixed compute budget, train several parameter-token pairs satisfying 6ND = C and find the loss minimum. The U-shape's minimum gives the optimal size for that budget."
        },
        {
          "q": "What does the irreducible term represent?",
          "a": "The entropy of the data itself. No amount of scale drives loss below it, and omitting it from a fit over-predicts the returns to scale."
        },
        {
          "q": "What is the most under-rated use of scaling laws?",
          "a": "Forecasting. Fit a curve on a ladder of small runs and predict a large one, which lets you compare architectures and data mixtures before committing the budget."
        },
        {
          "q": "Why do dense scaling laws not transfer to mixture-of-experts models?",
          "a": "FLOPs per token track active parameters while capacity tracks total parameters, so the compute constraint and the loss model refer to different quantities."
        }
      ],
      "standard": [
        {
          "q": "Explain scaling laws and the Chinchilla result.",
          "a": "THE PHENOMENON. Language-model loss falls as a smooth POWER LAW in parameters, in data, and in compute, and it does so over many orders of magnitude with remarkably little noise. That predictability is the substantive finding - it means the outcome of a very large run can be forecast from a ladder of small ones. THE PARAMETRIC FORM. L(N, D) = E + A/N^alpha + B/D^beta. E is irreducible - the entropy of natural language, which no scale removes. The two exponents are both around 0.34, and their near-equality is the whole Chinchilla result in one line: since the parameter term and the data term fall at similar rates, neither should be scaled preferentially. THE ALLOCATION PROBLEM. Compute is about 6ND. Minimizing loss subject to a compute budget, with roughly equal exponents, gives both N and D scaling as the square root of C - so doubling your budget means about 1.4 times the parameters and 1.4 times the tokens. The ratio that falls out is about twenty tokens per parameter. THE HISTORY, which is a methodology story and is the instructive part. Kaplan et al. established the laws and concluded that parameters should be scaled much faster than data - roughly N proportional to C to the 0.73. The field followed that for two years and built very large, comparatively under-trained models. Chinchilla re-ran it and found the near-equal scaling. The discrepancy traces to a LEARNING-RATE SCHEDULE not matched to each run's token count: a fixed schedule under-trains the shorter runs, which makes small models look worse than they are and biases the conclusion toward size. The headline demonstration was a 70B model on 1.4T tokens beating a 280B model on 300B tokens at equal compute. I would emphasize that the correction was not a better theory but a better experiment, which is a useful thing to notice about empirical scaling work generally. THE MODERN POSITION, which goes past Chinchilla. Compute-optimal means optimal for TRAINING compute. But a served model incurs inference cost forever, and inference cost scales with PARAMETERS and not with the tokens you trained on. Adding it to the objective - minimize training plus expected inference cost subject to hitting a target loss - moves the optimum monotonically toward smaller models trained on more data as the serving volume grows. That is why the widely-deployed open models are trained far past twenty tokens per parameter, and it means quoting Chinchilla-optimal is a training-regime answer to what is usually a two-regime question. THE CAVEATS I WOULD ATTACH. The laws predict cross-entropy, which is smooth; downstream capability is measured differently and much of apparent emergence is a metric artefact. The constants are properties of a fixed architecture and data distribution, so curves do not transfer across mixtures - which is precisely why comparing mixtures by their curves is a good use and transferring one is not. And the data supply eventually binds, which turns quality and deduplication into scaling concerns.",
          "deepDive": {
            "q": "Derive the compute-optimal allocation, and show how adding inference changes it.",
            "a": "THE TRAINING-ONLY DERIVATION. Minimize L(N,D) = E + A/N^a + B/D^b subject to 6ND = C. Substitute D = C/(6N) and differentiate with respect to N. The derivative of A/N^a is -aA/N^(a+1); the data term becomes B(6N/C)^b, whose derivative is bB*6^b*N^(b-1)/C^b. Setting the sum to zero gives aA/N^(a+1) = bB*6^b*N^(b-1)/C^b, so N^(a+b) is proportional to C^b, giving N* proportional to C^(b/(a+b)). With a and b both about 0.34, that exponent is about one half - hence N* proportional to the square root of C, and by the constraint D* likewise. The ratio D*/N* is then a constant determined by A, B, a and b, and Chinchilla's fit puts it around twenty. THE KEY SENSITIVITY. Notice the exponent is b/(a+b). If a exceeds b - the parameter term falling faster - the exponent exceeds one half and you should scale parameters preferentially. Kaplan's fit effectively had that, giving roughly C^0.73. So the entire disagreement reduces to the relative size of two exponents, and those exponents are sensitive to whether each run was trained to convergence for its token budget. A fixed learning-rate schedule that does not decay fully by the end of a short run leaves it under-trained, inflating the measured loss at small D, which inflates b's apparent effect... and the fit moves. That is a remarkably delicate dependence for a conclusion the field acted on for two years, and it is the reason I would treat any scaling-law recommendation as contingent on its experimental protocol. ADDING INFERENCE. The objective becomes minimize 6ND + 2N*D_inf subject to L(N,D) = L_target, where D_inf is the expected total tokens generated over the model's life and the factor 2 is the forward-only cost per parameter per token. Two structural observations. First, the constraint is now a TARGET LOSS rather than a compute budget - you are asking for the cheapest way to reach a given quality, which is the question a product actually poses. Second, and decisively, the inference term contains N and NOT D. Training on more tokens is free at serving time. So the marginal cost of buying quality via D is only the training term, while buying it via N is charged twice - once in training and again on every future request. Differentiating, the optimum shifts toward smaller N and larger D, monotonically in D_inf, and at high serving volume it goes far past twenty tokens per parameter. WHAT THIS PREDICTS AND WHAT IS OBSERVED. It predicts that models built to be deployed widely should look over-trained by Chinchilla's standard, which is exactly what the popular open models look like - small parameter counts with token counts many times the compute-optimal ratio. And it predicts that a model trained purely to demonstrate a capability, with no serving plan, should sit at the Chinchilla point. Both hold. THE LIMIT WORTH NAMING. This assumes tokens are available. Once you exhaust high-quality data, increasing D means repeating it, and repeated data has diminishing returns - a few epochs are close to as good as fresh tokens, many epochs are not. So the inference-aware optimum is bounded by the data supply, which is why the data-constrained scaling work matters and why quality filtering and deduplication are now scaling-law concerns rather than pipeline hygiene."
          }
        },
        {
          "q": "How would you use scaling laws in practice on a real project?",
          "a": "THE HEADLINE RATIO IS THE LEAST USEFUL PART. What scaling laws actually buy you is FORECASTING, and I would use them in four ways. (1) DECIDE WHETHER A RUN IS WORTH DOING. Train a ladder of small models - parameters varying over about two orders of magnitude, each with a token count in proportion and, critically, each with its learning-rate schedule MATCHED to its own token budget. Fit the parametric form. Then extrapolate to the size you are considering and ask whether the predicted loss clears your target. If it does not, you have saved the entire budget; if it does, you have a prediction to check the run against. This is the highest-value use and it is skipped constantly. (2) COMPARE DATA MIXTURES AND ARCHITECTURES CHEAPLY. Fit a separate curve for each candidate at small scale. A better mixture shows a better curve - a lower irreducible term or better constants - and the comparison costs a fraction of a real run. This is far more reliable than comparing two small models at one size, because it separates a genuine advantage from a difference that would vanish at scale. (3) DETECT AN UNDERPERFORMING RUN. A large training run has nothing to be compared against, so a subtle bug that costs a few percent of quality is invisible. With a fitted curve you have an expectation, and a run that lands above its predicted loss is a signal to investigate. I would plot the running loss against the curve's prediction as a standard dashboard panel. (4) CHOOSE THE MODEL SIZE FOR A PRODUCT, using the inference-aware objective rather than the compute-optimal one. Estimate the expected serving volume, minimize training plus inference cost subject to a target loss, and accept that the answer will be a smaller model trained much longer than Chinchilla suggests. THE PRACTICAL CAUTIONS. Match the learning-rate schedule to each run's token count, or you reproduce Kaplan's bias. Include the irreducible term in the fit or you over-predict the returns to scale. Use the IsoFLOP method if you can afford it, since the U-shaped curve at each budget is the most robust of the three approaches and its minimum is directly the answer. And do not transfer constants across a change of architecture or data - refit. WHAT I WOULD ACTUALLY REPORT to a decision-maker. The predicted loss at the proposed scale, the compute and wall-clock it implies once combined with a measured MFU, the cost, and the sensitivity - how the answer moves if the fit is off by a plausible margin. That converts a scaling law from an interesting regularity into a project plan, which is the point."
        },
        {
          "q": "Do scaling laws predict capability? Discuss emergence.",
          "a": "THEY PREDICT LOSS, AND LOSS IS NOT CAPABILITY - the gap between those two is the substance here. WHAT IS SOLID. Cross-entropy on held-out text falls smoothly and predictably as a power law. That is well-established, replicated, and it is the quantity the laws are about. WHAT PEOPLE ACTUALLY WANT is downstream performance: accuracy on benchmarks, ability to follow instructions, arithmetic, code that runs. And there the observed picture looked different - a widely-reported phenomenon of EMERGENT ABILITIES, where a capability is at chance across many model scales and then rises sharply past some threshold. That looked like a qualitative change and it was interpreted as one. THE DEFLATIONARY ARGUMENT, which I find largely persuasive. Schaeffer et al. pointed out that emergence is substantially a property of the METRIC rather than of the model. Consider exact-match accuracy on a multi-step arithmetic problem: it requires every token to be right, so it is a step function of the underlying per-token probability. A model whose per-token accuracy improves smoothly will show exact-match accuracy that is zero, zero, zero, then suddenly non-trivial - not because anything discontinuous happened inside the model, but because a discontinuous metric was applied to a continuous improvement. Replace exact match with a continuous measure - token-level edit distance, log-likelihood of the correct answer, partial credit - and the smooth improvement is visible all along. That reframing explains a large share of reported emergence. WHERE I WOULD NOT OVERCLAIM. It does not follow that nothing interesting happens with scale. Some capabilities do appear to require a threshold of representational capacity, and in-context learning strengthening with scale is a real and non-trivial phenomenon. And even if the underlying improvement is smooth, the PRACTICAL consequence of crossing a usefulness threshold is genuinely discontinuous - a model that gets arithmetic right 5% of the time and one that gets it right 80% of the time are different products regardless of the smoothness of the curve between them. WHAT THIS MEANS FOR PLANNING, which is the actionable part. You can forecast LOSS reliably and you cannot forecast BENCHMARK performance from it reliably, because the mapping from loss to any particular downstream metric is unknown in advance and can be sharp. So a scaling-law extrapolation supports a statement like 'this run will reach a loss of X' and does not support 'this run will pass that benchmark'. If a capability threshold is what you need, the honest position is that you cannot predict where it is, and the useful mitigation is to evaluate with CONTINUOUS metrics during training so you can see the underlying improvement before the discontinuous metric registers it. THE METHODOLOGICAL LESSON I WOULD DRAW, which generalizes well past this topic: a sharp transition in a plot should always prompt the question of whether the sharpness is in the system or in the instrument. That is the same discipline as the rest of this curriculum - the measurement can manufacture the phenomenon."
        },
        {
          "q": "What happens when you run out of data?",
          "a": "THIS IS THE CONSTRAINT CHINCHILLA CREATED. Once data is co-equal with parameters, scaling requires more tokens, and the supply of high-quality text is finite - large but finite, and the largest current runs consume a substantial fraction of what is readily available. So the question is what happens when D cannot grow. WHAT THE EVIDENCE SAYS ABOUT REPEATING DATA. The data-constrained scaling work found that repetition degrades gracefully at first and then sharply. A few epochs over the same tokens is worth nearly as much as fresh data - the marginal value of a second or third pass is high. Beyond that the returns fall away quickly, and at many epochs additional passes are worth close to nothing and eventually hurt through memorization. So there is a usable regime of modest repetition and a wall past it. That reframes the constraint from a hard limit to a soft one with a known shape. THE RESPONSES, in rough order of how much they help. (1) BETTER DATA, which is the highest-leverage answer and is why deduplication and quality filtering are now scaling concerns rather than pipeline hygiene. Removing near-duplicates increases the EFFECTIVE token count for a given corpus, because a duplicated token was already a repeated epoch you did not know you were taking. And quality filtering raises the value of each token, which shows up as a better scaling curve rather than merely a cleaner corpus. (2) MULTIPLE EPOCHS, deliberately, within the regime where they still pay - which the data-constrained work quantifies rather than leaving to guesswork. (3) SYNTHETIC DATA, which works in domains with a verifier - mathematics, code, anything checkable - because you can generate and filter for correctness. Its limits outside those domains are real and the risk of degradation from training on model output is a genuine concern rather than a hypothetical. (4) MULTIMODAL AND MULTILINGUAL DATA, expanding what counts as the corpus. (5) SPEND THE COMPUTE ON PARAMETERS INSTEAD, accepting a departure from compute-optimal because the data leg cannot grow - which is a return to something closer to the pre-Chinchilla allocation, for a completely different reason. (6) SPEND IT ON POST-TRAINING rather than pretraining, which is a large part of where the field's effort has gone: reinforcement learning on verifiable rewards, and inference-time compute, both of which buy capability without needing more pretraining tokens. THE STRATEGIC OBSERVATION I WOULD MAKE. The data wall changes what the marginal dollar buys. When tokens were abundant, more compute meant a bigger better-trained model. When they are scarce, more compute has to go somewhere else - into repetition with diminishing returns, into synthetic generation, into post-training, or into inference-time search. That reallocation is visible in what the field has actually been working on, and reading it as a consequence of the data constraint rather than as independent trends makes the direction much easier to follow."
        },
        {
          "q": "How do scaling laws change for mixture-of-experts models?",
          "a": "THE DENSE ANALYSIS ASSUMES ONE PARAMETER COUNT DOES TWO JOBS - it determines both the model's capacity and its FLOPs per token, because every parameter participates in every token. MoE breaks that identity, and the scaling analysis has to be redone with the two separated. THE TWO QUANTITIES. TOTAL parameters determine capacity and memory residency: all experts must be held, even though most are idle for any given token. ACTIVE parameters determine FLOPs per token: only the routed experts run, so compute scales with the active count. A model with 8 experts routing to 2 has roughly four times the parameters at roughly the same FLOPs per token as a dense model of the active size. WHAT THAT DOES TO THE OPTIMIZATION. The compute constraint C is about 6 times ACTIVE parameters times tokens, while the loss depends on TOTAL parameters and tokens. So you are no longer trading a single N against D - you have a third axis, the sparsity ratio, and the compute-optimal frontier is a surface rather than a curve. The empirical finding is that at fixed compute, sparse models reach a lower loss than dense ones, which is the whole reason MoE is used - you buy capacity without buying FLOPs. THE COSTS THAT DO NOT APPEAR IN A FLOP-BASED LAW, and this is where the two-regime framing matters. (1) MEMORY RESIDENCY. All experts must be in memory whether or not they fire, so a sparse model with the FLOPs of a 7B dense model has the memory footprint of a much larger one. In the inference regime, where bytes read and bytes resident are the binding constraint, that is a serious cost that a compute-optimal analysis does not see at all. (2) COMMUNICATION. Expert parallelism needs all-to-all routing, which is the most demanding collective and is data-dependent in size. (3) LOAD IMBALANCE, requiring capacity factors and auxiliary losses, which cost either dropped tokens or gradient signal. THE PRACTICAL CONSEQUENCE. MoE's advantage is largest in the TRAINING regime, where FLOPs are the constraint, and smallest in the memory-bound INFERENCE regime, where total parameters must be resident and read. So a sparse model is an excellent way to spend a training budget and a more awkward thing to serve - which is exactly why the deployment discussion around MoE is about memory and routing rather than about arithmetic. HOW I WOULD DO THE ANALYSIS. Fit the scaling law with active parameters in the compute constraint and total parameters in the loss model, sweep the sparsity ratio as a third variable, and then apply the INFERENCE-AWARE objective with the memory footprint priced in - because the naive version will recommend far more sparsity than is servable. That combination is the honest calculation, and it explains why deployed sparse models use more modest expert counts than the compute-optimal frontier alone would suggest."
        },
        {
          "q": "Why is the predictability of scaling laws surprising, and how much should you trust it?",
          "a": "WHY IT IS SURPRISING. Nothing about deep learning theory predicts that loss should be a clean power law in parameters and data over many orders of magnitude. The optimization is non-convex, the architecture is complicated, the data is heterogeneous, and yet the curve is smooth enough to extrapolate across a factor of a thousand in scale with useful accuracy. That is an empirical regularity without a settled theoretical explanation, and it is worth being clear that it is an observation rather than a derivation. There are suggestive accounts - power laws arise naturally from data manifolds of a given intrinsic dimension, and from the statistics of natural language - but none that predicted the exponents in advance. HOW MUCH TO TRUST IT, and I would separate three claims. (1) THE FUNCTIONAL FORM WITHIN A REGIME: high confidence. Fit on a ladder and interpolate or modestly extrapolate, and it works well. This is what the practical uses depend on and it is reliable. (2) EXTRAPOLATION BY A LARGE FACTOR: moderate confidence, and it has held up historically for loss - the predictions made for very large runs were broadly borne out, which is a genuine track record. But the confidence should decay with the extrapolation distance, and I would always state the range the fit was made over. (3) TRANSFER ACROSS A CHANGE OF SETUP: low confidence, and this is where people go wrong. The constants encode the architecture, the data distribution, the tokenizer and the optimization recipe. A curve fitted on one mixture tells you almost nothing quantitative about another - which is exactly why FITTING a curve per candidate is a good comparison method and why REUSING published constants is not. THE FAILURE MODES I WOULD WATCH FOR. A fit that omits the irreducible term over-predicts returns and forecasts improvements that do not exist. A ladder whose runs are not each trained to convergence for their own token budget reproduces Kaplan's bias, which is a live risk because matching the schedule per run is extra work. A ladder spanning too narrow a range gives a fit dominated by noise. And any extrapolation into a regime where a different constraint binds - running out of data, hitting a numerical instability, changing the parallelism strategy - is outside what the curve models. THE POSITION I WOULD TAKE. Scaling laws are the most reliable quantitative tool in this area and they are an empirical regularity rather than a law of nature. Use them to forecast, to compare, and to detect underperformance; state the fitting range and the extrapolation distance; refit whenever the setup changes; and do not use them to predict downstream capability, which is a different quantity with a different and much sharper relationship to scale."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The scaling law's parametric form",
        "back": "L(N,D) = E + A/N^alpha + B/D^beta, with alpha ~ beta ~ 0.34. E is IRREDUCIBLE - the entropy of language - and omitting it from a fit over-predicts the returns to scale."
      },
      {
        "type": "formula",
        "front": "Compute-optimal allocation",
        "back": "C ~ 6ND; minimizing L subject to C with alpha ~ beta gives N* and D* both ~ C^(1/2), so D/N ~ 20. Doubling the budget means ~1.4x parameters AND ~1.4x tokens, not 2x parameters."
      },
      {
        "type": "intuition",
        "front": "Why Kaplan and Chinchilla disagreed",
        "back": "A LEARNING-RATE SCHEDULE not matched to each run's token count. A fixed schedule under-trains the SHORT runs, inflating small-model loss and biasing the fit toward size. The exponent is b/(a+b) - delicately sensitive to two numbers the field acted on for two years."
      },
      {
        "type": "intuition",
        "front": "The Chinchilla demonstration",
        "back": "70B on 1.4T tokens BEAT 280B on 300B tokens at equal compute - 4x smaller, ~4x more data, better on essentially everything. The correction was a better EXPERIMENT, not a better theory."
      },
      {
        "type": "formula",
        "front": "The inference-aware objective",
        "back": "min [6ND (once) + 2N*D_inf (forever)] s.t. L(N,D) = target. The inference term contains N and NOT D - training longer is FREE at serving time. So more expected serving volume pushes monotonically to smaller N, larger D."
      },
      {
        "type": "pitfall",
        "front": "20 tokens/param is a TRAINING-only answer",
        "back": "Compute-optimal minimizes the cost of PRODUCING the model. Anything you intend to SERVE should be smaller and trained longer, which is why the widely-deployed open models are deliberately over-trained far past the Chinchilla ratio."
      },
      {
        "type": "intuition",
        "front": "The most under-rated use: FORECASTING",
        "back": "Fit a ladder of small runs, extrapolate, and decide whether a large run is worth doing BEFORE committing the budget. Also: compare data mixtures by their CURVES, and detect a large run underperforming its own prediction - a bug signal you otherwise cannot get."
      },
      {
        "type": "definition",
        "front": "The IsoFLOP method",
        "back": "For each fixed budget C, train several (N, D) with 6ND = C and plot loss vs N. Each budget gives a U-SHAPED curve whose minimum is the optimal N. Too few parameters = cannot fit; too many = under-trained on the tokens the budget allows."
      },
      {
        "type": "intuition",
        "front": "Emergence is largely a METRIC artefact",
        "back": "Exact-match accuracy is a STEP FUNCTION of per-token probability, so smooth underlying improvement shows as a sudden jump. Continuous metrics (log-likelihood, partial credit, edit distance) reveal the improvement all along. Ask whether the sharpness is in the system or the instrument."
      },
      {
        "type": "pitfall",
        "front": "Loss is forecastable; CAPABILITY is not",
        "back": "A scaling extrapolation supports 'this run will reach loss X'. It does NOT support 'this run will pass that benchmark' - the mapping from loss to any downstream metric is unknown in advance and can be sharp."
      },
      {
        "type": "intuition",
        "front": "What happens at the data wall",
        "back": "Repetition degrades GRACEFULLY then sharply - a few epochs are nearly as good as fresh tokens, many are not. So DEDUPLICATION raises the EFFECTIVE token count (a duplicate was an epoch you did not know you took), and quality filtering shows up as a better CURVE."
      },
      {
        "type": "pitfall",
        "front": "MoE needs the analysis redone",
        "back": "Dense laws assume ONE parameter count sets both capacity and FLOPs. MoE splits them: compute ~ 6 x ACTIVE x D, loss depends on TOTAL. And the FLOP-based law cannot see MEMORY RESIDENCY - all experts must be resident, which is the binding cost in the inference regime."
      }
    ],
    "refs": [
      {
        "title": "Hoffmann et al. (2022), Training Compute-Optimal Large Language Models (Chinchilla)",
        "url": "https://arxiv.org/abs/2203.15556"
      },
      {
        "title": "Kaplan et al. (2020), Scaling Laws for Neural Language Models",
        "url": "https://arxiv.org/abs/2001.08361"
      },
      {
        "title": "Sardana et al. (2023), Beyond Chinchilla-Optimal: Accounting for Inference in Language Model Scaling Laws",
        "url": "https://arxiv.org/abs/2401.00448"
      },
      {
        "title": "Schaeffer, Miranda & Koyejo (2023), Are Emergent Abilities of Large Language Models a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      },
      {
        "title": "Muennighoff et al. (2023), Scaling Data-Constrained Language Models",
        "url": "https://arxiv.org/abs/2305.16264"
      }
    ],
    "demos": [
      "scaling-laws",
      "batching",
      "lr-schedule",
      "moe"
    ]
  },
  "moe": {
    "level": "advanced",
    "body": {
      "intuition": [
        "In a dense transformer one parameter count does two jobs: it sets the model's capacity AND its FLOPs per token, because every weight participates in every token. Mixture of experts breaks that identity. Replace the feed-forward network with N copies of it and a small router that sends each token to only k of them - usually one or two - and you get N times the parameters at roughly k over N times the compute. Capacity and arithmetic are now separate axes, which is the whole idea and the reason it is used at the frontier.",
        "It targets the FFN specifically, and that is not arbitrary: the FFN is two thirds of a transformer block's parameters, so it is where the capacity lives. Attention stays dense. What you buy is a better loss per FLOP - a sparse model reaches a lower loss than a dense one at the same compute budget, which is a genuine and repeated finding. What you pay is threefold: a load-balancing problem, because the router's assignment is learned and data-dependent and will collapse if you let it; an all-to-all communication pattern, which is the most demanding collective there is; and, decisively for anything you intend to serve, the requirement that EVERY expert be resident in memory even though only k of them fire.",
        "That last point is where this module's two-regime framing does the most work. In the compute-bound TRAINING regime, MoE is close to a free lunch - more capacity at the same FLOPs. In the memory-bandwidth-bound INFERENCE regime it is much less attractive: a sparse model with the FLOPs of a 7B dense model has the memory footprint of something far larger, and memory footprint is precisely what bounds the batch size, which bounds arithmetic intensity, which bounds throughput. So the same architecture is an excellent way to spend a training budget and an awkward thing to deploy, and reading MoE discussions is much easier once you know which regime the speaker is in."
      ],
      "math": [
        {
          "h": "Decoupling capacity from compute",
          "paras": [
            "The router produces a distribution over experts; the top k are run and their outputs combined, weighted by the gate. Parameters scale with the expert count and FLOPs with the number selected.",
            "The ratio of the two is the sparsity, and it is the new design axis that dense models do not have."
          ],
          "tex": "y = \\sum_{i \\in \\mathrm{TopK}(g(x))} g_i(x)\\, E_i(x), \\qquad P \\propto N, \\quad \\text{FLOPs} \\propto k",
          "texNote": "With N = 8 and k = 2 you have roughly four times the FFN parameters at the same arithmetic per token. Note the gate weight g_i multiplying the expert output is load-bearing: it is what makes the router DIFFERENTIABLE, since the top-k selection itself is not. The gradient reaches the router only through those weights, which is why a router whose gate values are near-uniform learns very slowly."
        },
        {
          "h": "The load-balancing loss",
          "paras": [
            "Nothing in the objective rewards using all the experts, and a router that discovers a good expert early will keep sending tokens there - a rich-get-richer collapse. The standard fix is an auxiliary loss that is minimized when routing is uniform.",
            "It multiplies the FRACTION OF TOKENS actually routed to each expert by the ROUTER'S AVERAGE PROBABILITY for it, which makes the term differentiable through the second factor even though the first is a hard count."
          ],
          "tex": "\\mathcal{L}_{\\text{aux}} = \\alpha \\, N \\sum_{i=1}^{N} f_i \\cdot p_i, \\qquad f_i = \\tfrac{1}{T}\\big|\\{t : i \\in \\mathrm{TopK}(x_t)\\}\\big|, \\;\\; p_i = \\tfrac{1}{T}\\textstyle\\sum_t g_i(x_t)",
          "texNote": "The product is the trick: f is a hard count with no gradient, p is soft and differentiable, and multiplying them gives a term whose gradient pushes the router's probability DOWN on experts that are already over-subscribed. It is minimized when both are uniform at 1/N. The coefficient alpha is a real hyperparameter - too small and experts collapse, too large and the router is forced to ignore the input, which throws away the specialization you wanted."
        },
        {
          "h": "The capacity factor, and what dropping costs",
          "paras": [
            "Communication and compute must be planned for a fixed buffer per expert, so each expert accepts a bounded number of tokens per batch. Tokens beyond that are DROPPED - they skip the FFN entirely and pass through on the residual.",
            "The factor trades wasted buffer against dropped tokens, and both are pure loss."
          ],
          "tex": "\\text{capacity} = C_f \\cdot \\frac{k \\cdot T}{N}, \\qquad C_f = 1 \\Rightarrow \\text{perfect balance assumed}, \\quad C_f > 1 \\Rightarrow \\text{slack}",
          "texNote": "At C_f = 1.25 you have allocated 25% headroom and you still drop whatever exceeds it. A dropped token is not an error - it simply gets no expert computation at that layer - but it is a token that received less processing than its neighbours, which is a strange and rarely-discussed property of MoE training. Note that dropping is a TRAINING-time device; at inference you generally cannot drop, which is one of several ways the two regimes diverge here."
        }
      ],
      "code": [
        {
          "h": "A top-k router with balancing, and where each piece is needed",
          "paras": [
            "The routing itself is a few lines. Everything around it exists because the assignment is learned, dynamic and data-dependent - which is the source of every difficulty in this lesson."
          ],
          "code": "class MoELayer(nn.Module):\n    def __init__(self, d, n_experts, k=2, cap_factor=1.25):\n        super().__init__()\n        self.router  = nn.Linear(d, n_experts, bias=False)\n        self.experts = nn.ModuleList(FFN(d) for _ in range(n_experts))\n        self.k, self.cf, self.N = k, cap_factor, n_experts\n\n    def forward(self, x):                       # x: (T, d), T tokens\n        logits = self.router(x)                 # (T, N)\n        probs  = logits.softmax(-1)\n        topv, topi = probs.topk(self.k, dim=-1) # hard selection - NOT\n                                                # differentiable...\n        topv = topv / topv.sum(-1, keepdim=True)\n\n        cap = int(self.cf * self.k * x.size(0) / self.N)\n        out = torch.zeros_like(x)\n        for i, expert in enumerate(self.experts):\n            idx = (topi == i).nonzero()[:cap]   # <-- OVERFLOW IS DROPPED. Those\n                                                # tokens get NO expert compute\n                                                # at this layer; they pass\n                                                # through on the residual.\n            if idx.numel():\n                tok, slot = idx[:, 0], idx[:, 1]\n                out[tok] += topv[tok, slot, None] * expert(x[tok])\n                #          ^^^^ ...but the GATE WEIGHT is, which is the ONLY\n                #          path by which gradient reaches the router. A router\n                #          whose gates are near-uniform learns very slowly.\n\n        # LOAD BALANCING - without this the router COLLAPSES onto a few experts,\n        # because nothing in the main objective rewards using all of them.\n        f = torch.zeros(self.N).index_add_(0, topi.flatten(),\n                                           torch.ones(topi.numel())) / x.size(0)\n        p = probs.mean(0)\n        aux = self.N * (f * p).sum()            # hard count x soft prob\n        return out, aux                          # add alpha * aux to the loss\n\n# WHY THE PRODUCT f*p: f is a COUNT with no gradient; p is SOFT. Multiplying\n# gives a term whose gradient pushes router probability DOWN on experts that\n# are already over-subscribed. Minimized when both are uniform at 1/N.\n# alpha matters: too small -> collapse; too large -> the router ignores the\n# input and you lose the specialization you were buying.",
          "caption": "Two lines carry the design. The gate weight is the only differentiable path to the router, so the top-k selection can be hard; and the auxiliary loss multiplies a non-differentiable count by a differentiable probability, which is how you get a gradient out of a balance constraint."
        },
        {
          "h": "Expert choice, and the two costs that decide deployment",
          "paras": [
            "Inverting the routing removes load balancing by construction. And then the two costs that a FLOP-based comparison completely hides."
          ],
          "code": "# EXPERT CHOICE ROUTING - invert the assignment. Instead of each TOKEN picking\n# its top-k experts, each EXPERT picks its top-c tokens:\ntopv, topi = probs.t().topk(capacity, dim=-1)   # (N, capacity) over TOKENS\n#   -> PERFECT BALANCE BY CONSTRUCTION. No auxiliary loss, no dropping, no\n#      capacity factor to tune.\n#   -> BUT the semantics change: a token may receive ZERO experts or MANY.\n#      Variable compute per token, which is arguably a feature (hard tokens\n#      get more) and is awkward for autoregressive decoding, where it leaks\n#      information across positions unless handled carefully.\n\n# ---- COST 1: COMMUNICATION ----\n# Experts live on different devices, so per MoE layer:\n#   all-to-all  -> send each token to the rank holding its expert\n#   compute     -> each rank runs its expert on whatever arrived\n#   all-to-all  -> send the results back\n# Twice per layer, forward AND backward. all-to-all is ALL-PAIRS, so it stresses\n# bisection bandwidth and MUST cross the slow inter-node link - unlike an\n# all-reduce, which can be arranged hierarchically. And the message sizes are\n# DATA-DEPENDENT, so they are unpredictable and unbalanced.\n\n# ---- COST 2: MEMORY RESIDENCY - the one that decides serving ----\n#   FLOPs per token   ~  ACTIVE parameters   (k of N experts)\n#   MEMORY resident   ~  TOTAL parameters    (ALL N experts)\n#\n#   e.g. 8 experts, top-2:  compute of a ~7B dense model\n#                           memory of a ~40B+ dense model\n#\n# In the BANDWIDTH-BOUND decode regime this is decisive: memory bounds the\n# batch, the batch bounds arithmetic intensity, and intensity bounds throughput.\n# So MoE's advantage is LARGEST in compute-bound TRAINING and SMALLEST in\n# memory-bound INFERENCE - the same architecture, opposite verdicts.\n\n# THE MODERN REFINEMENT (DeepSeekMoE style): many FINE-GRAINED experts plus a\n# few always-on SHARED experts. Fine granularity gives the router more precise\n# choices; shared experts absorb the common computation so the specialists do\n# not each have to relearn it.",
          "caption": "Expert choice removes the balance problem by inverting who selects whom, at the cost of variable compute per token. And the memory line is the one that decides deployments: FLOPs track active parameters, residency tracks total."
        }
      ],
      "useCases": [
        "Frontier-scale pretraining, where the compute budget is the binding constraint and MoE reliably reaches a lower loss per FLOP than a dense model - which is why most of the largest models are sparse.",
        "Getting more capacity onto a fixed training cluster, since the FLOPs per token are what the accelerators are spending and the extra parameters are comparatively cheap to hold across many devices.",
        "Multilingual and multi-domain models, where the intuition that different experts specialize has some empirical support and where the capacity is genuinely being used for distinct kinds of input.",
        "Settings where memory is plentiful relative to compute - large-batch offline inference, or serving on hardware with substantial memory per accelerator - which is where a sparse model's residency cost is least damaging."
      ],
      "pitfalls": [
        "Omitting the load-balancing loss. The router collapses onto a few experts because nothing in the main objective rewards using all of them, and the unused experts are dead parameters you paid for in memory and communication.",
        "Setting the balancing coefficient by feel. Too small and experts collapse; too large and the router is forced toward uniform routing, which discards the specialization that was the point of the architecture.",
        "Ignoring dropped tokens. At a capacity factor of 1.25 anything beyond the buffer skips the FFN entirely and passes through on the residual - a token that received strictly less processing than its neighbours, which is a strange property to have without knowing it.",
        "Comparing a sparse and a dense model on FLOPs alone. That comparison hides memory residency and all-to-all communication, which are the two costs that determine whether the model can be served - and both are invisible in a compute-optimal analysis.",
        "Applying dense scaling laws unchanged. FLOPs track ACTIVE parameters while capacity tracks TOTAL, so the compute-optimal allocation is a different optimization with a third axis, and the naive version recommends far more sparsity than is servable.",
        "Placing expert parallelism across a slow interconnect. All-to-all is all-pairs and must cross the inter-node link - unlike an all-reduce, which can be arranged hierarchically - so it stresses bisection bandwidth and is the least forgiving collective to misplace.",
        "Expecting MoE to be stable out of the box. Sparse models are known to be more prone to training instability, which is why router z-losses and careful initialization appear in essentially every production recipe."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why MoE routes at the FFN and leaves attention dense: the FFN is two thirds of a block's parameters, so it is where capacity lives. The design follows from the parameter distribution rather than being a free choice."
        },
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Where all-to-all is developed as a primitive. It is the most demanding collective - all-pairs, so it stresses bisection bandwidth and cannot be arranged hierarchically the way an all-reduce can - and MoE is essentially the only place it is central."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Why the dense analysis has to be redone: the compute constraint refers to active parameters and the loss model to total parameters, which turns a curve into a surface with sparsity as a third axis."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "The inference-regime consequence. Decoding is bandwidth-bound, and a sparse model's total parameters must be resident and largely read, so the technique that helps most there is the one that amortizes reads over more tokens."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "Expert parallelism is a fifth parallelism axis that must be placed alongside data, tensor and pipeline - and its all-to-all pattern is more demanding than any of them, which constrains where it can sit in the hierarchy."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a mixture of experts change?",
          "a": "It decouples capacity from compute. Parameters scale with the number of experts while FLOPs per token scale with how many are selected."
        },
        {
          "q": "Why does MoE replace the FFN rather than attention?",
          "a": "The FFN is two thirds of a transformer block's parameters, so that is where the capacity lives. Attention stays dense."
        },
        {
          "q": "How does gradient reach the router if top-k is not differentiable?",
          "a": "Through the gate weights multiplying the expert outputs. The hard selection carries no gradient; the soft weight does."
        },
        {
          "q": "What is the load-balancing loss?",
          "a": "The expert count times the sum over experts of the token fraction times the mean router probability. It is minimized when both are uniform."
        },
        {
          "q": "Why multiply a count by a probability?",
          "a": "The count is hard and has no gradient; the probability is soft. Their product gives a differentiable term whose gradient pushes probability off over-subscribed experts."
        },
        {
          "q": "What is the capacity factor?",
          "a": "A multiplier on the expected tokens per expert, setting a fixed buffer. Tokens beyond it are dropped - they skip the FFN and pass through on the residual."
        },
        {
          "q": "What is expert choice routing?",
          "a": "Inverting the assignment so each expert picks its top tokens rather than each token picking experts. Perfectly balanced by construction, with variable compute per token."
        },
        {
          "q": "What communication pattern does MoE need?",
          "a": "All-to-all, twice per layer in forward and again in backward - to send tokens to their expert's rank and the results back."
        },
        {
          "q": "Why is all-to-all harder than all-reduce?",
          "a": "It is all-pairs, so it stresses bisection bandwidth and must cross the inter-node link, where an all-reduce can be arranged hierarchically to cross it once."
        },
        {
          "q": "What is MoE's memory cost?",
          "a": "Every expert must be resident even though only k fire, so FLOPs track active parameters while memory tracks total parameters."
        },
        {
          "q": "In which regime is MoE most attractive?",
          "a": "The compute-bound training regime. It is least attractive in memory-bandwidth-bound inference, where residency bounds the batch and therefore throughput."
        },
        {
          "q": "What are shared experts?",
          "a": "Always-on experts alongside the routed ones, absorbing common computation so the specialists do not each have to relearn it. Paired with finer-grained experts."
        }
      ],
      "standard": [
        {
          "q": "How would you serve a mixture-of-experts model efficiently?",
          "a": "THE CONSTRAINT THAT SHAPES EVERYTHING: all experts must be RESIDENT while only k fire per token. So the memory footprint is that of the total parameter count and the arithmetic is that of the active count - and in the bandwidth-bound decode regime, memory is what bounds the batch and therefore the throughput. Serving MoE well is mostly about managing that gap. WHAT MAKES IT HARDER THAN A DENSE MODEL. (1) THE WEIGHTS READ PER TOKEN ARE DATA-DEPENDENT. In a dense model every token reads the same weights, so batching amortizes them perfectly. In an MoE model, tokens in a batch route to DIFFERENT experts, so the union of experts touched grows with the batch - and at large batch you end up reading most experts anyway, which erodes the FLOP advantage in exactly the regime where you needed the batch. That is an unpleasant interaction and it is under-discussed. (2) ROUTING IS PER-TOKEN AT DECODE, so each generated token may need a different expert set than the last, and there is no locality to exploit across steps. (3) THE ALL-TO-ALL IS STILL THERE if experts are distributed, and at batch sizes typical of interactive serving the messages are tiny and latency-bound. THE TECHNIQUES, roughly in order of how much they help. (1) KEEP EXPERTS ON ONE DEVICE if they fit, eliminating the all-to-all entirely. This is the single biggest simplification and it bounds how many experts you can have - which is a serving constraint feeding back into the architecture. (2) EXPERT PARALLELISM WITHIN A NODE if they do not, so the all-to-all is over the fast interconnect. Never across nodes for an interactive path. (3) BATCH BY ROUTE where the workload permits - grouping requests likely to use similar experts raises locality. Limited applicability, but real for domain-partitioned traffic. (4) EXPERT OFFLOADING AND CACHING: keep hot experts resident and page cold ones from host memory. This works because expert usage is typically skewed even after balancing, and it is the direct analogue of KV-cache paging. The risk is a request that misses, so it needs an admission policy and it degrades tail latency. (5) QUANTIZE THE EXPERTS more aggressively than the dense parts. Experts are the bulk of the parameters and are used sparsely, so they are the highest-leverage target and some evidence suggests they tolerate it well. (6) PRUNE REDUNDANT EXPERTS, which the specialization analysis makes plausible - if some experts are functionally similar, dropping them costs little and directly attacks residency. WHAT I WOULD MEASURE. Achieved batch size against the theoretical one, which quantifies how much memory the experts are costing you in throughput terms. The distinct-experts-touched per batch as a function of batch size, which tells you where the FLOP advantage erodes. And the tail latency, because expert offloading and imbalanced routing both hurt the tail specifically while leaving the mean acceptable. THE HONEST SUMMARY. Sparse models are considerably harder to serve than dense ones of the same quality, and the right answer is often to train sparse and DISTIL to dense for deployment - putting the FLOP advantage where it helps and the memory advantage where it helps."
        },
        {
          "q": "Explain mixture of experts - what it buys and what it costs.",
          "a": "THE CORE IDEA. In a dense transformer one parameter count does two jobs: it sets capacity AND FLOPs per token, because every weight participates in every token. MoE breaks that identity. Replace the FFN with N copies plus a small router, send each token to only k of them - typically one or two - and you get N times the parameters at roughly k over N times the arithmetic. Capacity and compute become separate axes. WHY THE FFN. Because it is two thirds of a transformer block's parameters, so that is where capacity lives. Attention stays dense. That is not an arbitrary choice; it follows from the parameter distribution. THE MECHANISM. A linear router produces logits over experts, softmax, take the top k, run those experts, and combine their outputs weighted by the gate values. The gate weight is load-bearing: the top-k SELECTION is not differentiable, so the only path by which gradient reaches the router is through those multiplicative weights. A router whose gates are near-uniform therefore learns very slowly, which is worth knowing when one appears not to be learning. WHAT IT BUYS. A better loss per FLOP. At a fixed compute budget a sparse model reaches a lower loss than a dense one - a repeated finding and the reason most frontier models are sparse. THE THREE COSTS, and they are the substance. (1) LOAD BALANCING. Nothing in the main objective rewards using all the experts, so the router collapses onto a few - rich-get-richer, since an expert that gets more tokens gets better and attracts more. The standard fix is an auxiliary loss equal to N times the sum over experts of the token FRACTION times the mean router PROBABILITY. The product is the trick: the fraction is a hard count with no gradient, the probability is soft, and multiplying gives a differentiable term that pushes probability off over-subscribed experts. Its coefficient is a genuine hyperparameter - too small and experts collapse, too large and the router is forced toward uniform routing, discarding the specialization you were buying. (2) CAPACITY AND DROPPING. Buffers must be fixed for communication and compute planning, so each expert accepts a bounded number of tokens and the overflow is DROPPED - those tokens skip the FFN entirely and pass through on the residual. They are not errors, but they received strictly less processing than their neighbours, which is a strange property to have unknowingly. (3) COMMUNICATION AND MEMORY. Experts live on different devices, so each MoE layer needs two all-to-all operations, in forward and again in backward. All-to-all is all-pairs, stresses bisection bandwidth, must cross the slow inter-node link where an all-reduce could be hierarchical, and its message sizes are data-dependent and therefore unbalanced. And every expert must be RESIDENT even though only k fire. THE REGIME POINT I WOULD END ON. FLOPs track ACTIVE parameters; memory tracks TOTAL. So in the compute-bound training regime MoE is close to a free lunch, and in the bandwidth-bound inference regime it is much less attractive - residency bounds the batch, the batch bounds arithmetic intensity, and intensity bounds throughput. Same architecture, opposite verdicts, and knowing which regime someone is arguing from resolves most disagreements about whether MoE is worth it.",
          "deepDive": {
            "q": "Walk through the load-balancing problem in detail and compare the available fixes.",
            "a": "WHY COLLAPSE HAPPENS. The router is trained only through the main loss, and the main loss rewards routing a token to whichever expert handles it best. Early in training the experts are nearly identical, so small random differences decide the routing. An expert that receives slightly more tokens gets slightly more gradient, becomes slightly better, and attracts more tokens. That is a positive feedback loop with no opposing force, and the equilibrium is a small number of used experts with the rest dead - parameters you paid for in memory and communication and are not using. FIX 1: THE AUXILIARY LOSS. Add alpha times N times the sum over experts of f_i times p_i, where f is the fraction of tokens routed to expert i and p is the router's mean probability for it. Both are uniform at 1/N when balanced, and the sum is minimized there. The construction is clever: f is a hard count and carries no gradient, but multiplying by the differentiable p gives a term whose gradient reduces the router's probability on experts with high f. So the load imbalance you measure becomes a force on the thing you can differentiate. Its weakness is the coefficient. Too small and collapse proceeds; too large and the router is pushed toward uniform routing regardless of input, which is the degenerate case where you have paid for N experts and are using them as an expensive average. Tuning it is real work and it interacts with the number of experts and the batch size. FIX 2: THE CAPACITY FACTOR. Cap the tokens per expert and drop the overflow. This is not really a balancing mechanism - it is a mechanism for BOUNDING THE DAMAGE of imbalance so the buffers and the all-to-all can be sized statically. It converts imbalance from a correctness problem into a dropped-token problem. The cost is that dropping is unevenly distributed over the data: tokens that route to popular experts are the ones dropped, so you are systematically under-processing a particular kind of input. FIX 3: EXPERT CHOICE ROUTING, which I find the most elegant. Invert the assignment: instead of each token picking its top-k experts, each EXPERT picks its top-c tokens. Balance is then perfect BY CONSTRUCTION - every expert gets exactly c tokens - so there is no auxiliary loss, no coefficient to tune, no capacity factor, and no dropping. What changes is the semantics: a token may be selected by zero experts or by many, so compute per token becomes variable. That is arguably a feature - difficult tokens attract more experts - and it is awkward for autoregressive decoding, because an expert choosing among tokens couples positions in a way that can leak information from later tokens to earlier ones unless carefully constrained. That restriction is why it is more common in encoder or training-time settings. FIX 4: NOISE AND REGULARIZATION on the router logits, which was in the original sparsely-gated formulation - adding noise before the top-k makes the assignment stochastic and prevents early lock-in. Simple, and it addresses the feedback loop at its source rather than penalizing its outcome. FIX 5: MANY FINE-GRAINED EXPERTS PLUS SHARED ONES. More, smaller experts give the router finer choices and make any single expert less dominant; always-on shared experts absorb the computation every token needs, so the specialists are not each forced to relearn the common case. This changes the problem's shape rather than adding a penalty, and it is where recent production designs have gone. WHAT I WOULD USE. Auxiliary loss plus a modest capacity factor as the reliable default, with the coefficient tuned by monitoring the actual expert utilization histogram rather than by feel - that histogram is the diagnostic and it is rarely plotted. Fine-grained plus shared experts if designing from scratch. And expert choice where the setting permits it, because removing a hyperparameter by construction is worth more than tuning it well."
          }
        },
        {
          "q": "When would you choose a sparse model over a dense one?",
          "a": "THE DECISION TURNS ON WHICH REGIME DOMINATES YOUR COSTS, and I would work through it in that frame. CHOOSE SPARSE WHEN TRAINING COMPUTE IS THE BINDING CONSTRAINT. At a fixed FLOP budget a sparse model reaches a lower loss than a dense one - repeatedly demonstrated and the reason frontier pretraining is largely sparse. If you have a cluster, a compute budget, and the goal is the best model you can train with it, MoE is the right answer and the memory cost is spread across many devices where it is comparatively cheap. CHOOSE SPARSE WHEN MEMORY IS PLENTIFUL RELATIVE TO COMPUTE. Large-batch offline inference, batch scoring, anything where you are already compute-bound at serving time because the batch is large. In that regime the residency cost is absorbed and the FLOP saving is real. CHOOSE DENSE WHEN YOU ARE SERVING INTERACTIVELY. Decoding is memory-bandwidth-bound: memory bounds the batch, the batch bounds arithmetic intensity, and intensity bounds throughput. A sparse model with the FLOPs of a 7B dense model has the footprint of something much larger, so it occupies the memory that would otherwise hold KV cache for more concurrent requests. You are trading the thing that determines your throughput for a FLOP saving in a regime where FLOPs were not the constraint. That is the wrong trade, and it is the single most common misapplication. CHOOSE DENSE WHEN THE DEPLOYMENT IS MEMORY-CONSTRAINED - edge, single-GPU, anything where total parameters must fit somewhere small. The active-parameter count is irrelevant if the total does not fit. CHOOSE DENSE WHEN THE INFRASTRUCTURE IS NOT THERE. Expert parallelism needs all-to-all across devices, load-balancing monitoring, capacity tuning, and a serving stack that handles routing. That is substantial engineering, and a dense model of the same quality - if you can afford to train one - is far simpler to operate. THE INTERMEDIATE OPTION people forget. Train sparse and DISTIL to dense for serving. That puts the FLOP advantage where it helps - training - and the memory advantage where it helps - inference. It is the explicit two-regime answer and it is used in practice. THE NUMBERS I WOULD ACTUALLY COMPUTE before deciding. Total parameters times bytes, to see whether it fits alongside the KV cache I need. The resulting servable batch, and therefore the arithmetic intensity and the throughput, compared against a dense model of the same quality. And the all-to-all volume against my interconnect. Those three turn the question from an architectural preference into an arithmetic comparison, and in my experience they frequently point the opposite way to the FLOP comparison that motivated the choice."
        },
        {
          "q": "Why is MoE communication so difficult, and what can be done about it?",
          "a": "THE PATTERN. Experts are distributed across devices, so each MoE layer requires: route tokens locally, ALL-TO-ALL to send each token to the rank holding its expert, compute, ALL-TO-ALL to send results back. Twice per layer in the forward pass and again in backward. WHY ALL-TO-ALL IS THE HARDEST COLLECTIVE. (1) IT IS ALL-PAIRS. Every rank sends to and receives from every other rank, so the traffic stresses BISECTION BANDWIDTH rather than any single link. Contrast an all-reduce, which can be arranged hierarchically - reduce within a node over the fast interconnect, then across nodes once, then broadcast back down - so the slow inter-node link carries the data once. All-to-all has no such structure; the data genuinely must cross. (2) THE SIZES ARE DATA-DEPENDENT. How many tokens go to each expert depends on the router's decisions, which vary per batch. So message sizes are irregular and unpredictable, some ranks receive far more than others, and every rank waits for the slowest. This is the central practical problem and it is why capacity factors exist - they bound the imbalance at the cost of dropping tokens. (3) IT DOES NOT OVERLAP EASILY. A gradient all-reduce overlaps with the backward pass because gradients become ready progressively. An MoE all-to-all sits in the MIDDLE of the forward pass and everything after it depends on it, so there is far less to hide it behind. WHAT CAN BE DONE, roughly in order of effect. (1) PLACEMENT. Keep expert parallelism within the fastest available domain. If experts fit within a node, the all-to-all is over NVLink and the problem largely disappears; across nodes it is the dominant cost. This is the single biggest lever and it constrains how many experts you can have. (2) CAPACITY FACTORS AND BALANCING, which make the message sizes predictable enough to plan buffers and reduce the straggler effect. The auxiliary loss is a communication optimization as much as a modelling one, which is a useful way to see it. (3) OVERLAPPING WITH OTHER LAYERS. Implementations work hard to overlap one MoE layer's all-to-all with another layer's expert computation, which requires restructuring the schedule and is where much of the systems effort in MoE goes. (4) HIERARCHICAL ALL-TO-ALL: aggregate within a node first, then exchange between nodes, then distribute - which reduces inter-node messages at the cost of extra local work, and is the standard optimization. (5) FEWER, LARGER EXPERTS reduce the message count; more, finer experts improve routing quality. That is a direct tension between modelling and systems, and it is resolved differently depending on the interconnect. THE OBSERVATION I WOULD MAKE. MoE's practical scaling is determined by NETWORK TOPOLOGY more than by arithmetic, which is unusual - most of the techniques in this curriculum are limited by compute or memory. That is why MoE is a systems achievement as much as a modelling one, and why the same architecture performs very differently on two clusters with the same aggregate FLOPs."
        },
        {
          "q": "What happens to a dropped token, and is that acceptable?",
          "a": "WHAT HAPPENS MECHANICALLY. Each expert has a fixed capacity - a buffer sized as the capacity factor times the expected tokens per expert. Tokens routed to an expert beyond its capacity are not processed by it. In the standard implementation they simply pass through on the RESIDUAL connection: the MoE layer contributes nothing for them, and they proceed to the next layer unchanged by that FFN. WHY IT IS DONE. Communication buffers and compute must be sized statically for the all-to-all and for efficient batched expert computation. Without a cap, a batch where many tokens route to one expert would need an unbounded buffer, and the imbalance would stall every rank. Dropping converts an unbounded, unpredictable problem into a bounded one at a known cost. IS IT ACCEPTABLE - three considerations, and I think the honest answer is a qualified yes with a caveat people rarely state. (1) IT IS NOT AN ERROR. A residual connection means the token still carries its representation forward; it has just received one fewer FFN application. In a deep model with many layers, missing one expert application at one layer is a small perturbation, and empirically models train fine with modest drop rates. (2) BUT IT IS NOT RANDOM. Dropped tokens are those routed to POPULAR experts, so you are systematically under-processing a particular kind of input - whatever the over-subscribed experts specialize in. That is a structured bias, not noise, and it is invisible in aggregate loss. I have not seen it well characterized and I would treat it as an open concern rather than a solved one. (3) IT DIFFERS BETWEEN TRAINING AND INFERENCE, which is the part that matters most. At training time dropping is tolerable and is standard. At inference you generally CANNOT drop - a user's token receiving less computation than another's is a correctness and fairness problem, and the capacity factor is usually raised or the constraint removed entirely. So the model is being evaluated under a different routing regime than it was trained under, which is a train-test mismatch that is rarely discussed. WHAT I WOULD MONITOR. The drop RATE, per layer, as a standard metric. A rising drop rate means balance is degrading. And the expert utilization histogram, which is the underlying quantity and which is almost never plotted despite being one line. If drops are concentrated in a few layers, that suggests those layers' routers have collapsed and the balancing coefficient needs attention there specifically. THE ALTERNATIVE THAT REMOVES THE QUESTION. Expert choice routing has no dropping at all, because each expert takes exactly its capacity in tokens - balance is by construction. The cost is variable compute per token and the autoregressive complication. That trade - a strange training-time artefact versus a strange decoding-time constraint - is a fair summary of where MoE routing design currently sits.",
          "deepDive": {
            "q": "How would you evaluate whether the experts have actually specialized?",
            "a": "THE QUESTION MATTERS because the intuitive story - experts specialize by topic or language, and the router learns to dispatch - is largely folklore, and the measured picture is messier. Establishing what is actually happening changes how you interpret the architecture. THE MEASUREMENTS I WOULD RUN. (1) THE UTILIZATION HISTOGRAM, first and always. Fraction of tokens routed to each expert, per layer. This is one line of code and it is the basic health check - a collapsed router shows immediately, and a perfectly uniform one under a strong auxiliary loss tells you the router may be ignoring the input. (2) ROUTING CONSISTENCY. For a fixed token type - a particular word, a particular part of speech, a particular language - what is the distribution over experts? If routing were topic-based you would expect concentration. The published analyses generally find LESS specialization than expected: routing often correlates with shallow features like the token identity itself rather than with semantic category, particularly in early layers. (3) LAYER DEPENDENCE. Specialization patterns differ by depth, and early-layer routing looks more lexical while deeper layers look more contextual. Worth measuring per layer rather than in aggregate, because an aggregate hides it. (4) ABLATION, which is the strongest test. Disable an expert - route its tokens elsewhere - and measure the loss change, overall and by input category. If expert 5 is the mathematics expert, ablating it should hurt mathematics specifically. If the damage is uniform, the expert is not specialized in any interpretable way. This is the experiment that distinguishes the story from the reality and it is cheap. (5) REDUNDANCY. Compare experts' weights or their functional behaviour on the same inputs. High similarity means you are paying for capacity you are not using distinctly - and there is evidence that some experts are substantially redundant, which is what expert-pruning work exploits. WHAT THE EVIDENCE ROUGHLY SHOWS, stated carefully because it is an area where confident claims outrun the measurements. Routing is often less semantically interpretable than the name suggests. Some specialization by surface features is real. Specialization by language has been observed in multilingual models. And the performance benefit does not obviously depend on interpretable specialization - the model gains from having more parameters with sparse access, whether or not the partition means anything to us. WHY THIS MATTERS PRACTICALLY. If experts are substantially redundant, you can PRUNE them - dropping the least-used experts with modest quality loss, which directly addresses the residency problem that makes MoE hard to serve. If routing is dominated by token identity, a cheaper router might suffice. And if specialization is genuinely weak, the intuitive argument for MoE - a mixture of specialists - is the wrong story even though the empirical result stands, and reasoning from the wrong story will lead you to wrong predictions about when it will help. THE HABIT I WOULD RECOMMEND. Plot the utilization histogram and run the ablation before believing any specialization narrative, including your own. It is an afternoon, and the result is frequently not what the architecture's name suggests."
          }
        },
        {
          "q": "How does MoE interact with the parallelism strategies?",
          "a": "IT ADDS A FIFTH AXIS - EXPERT PARALLELISM - and it is the most demanding one, so its placement constrains everything else. WHAT EXPERT PARALLELISM IS. Distribute the experts of a layer across devices; each device holds a subset and processes whatever tokens are routed to it. The communication is all-to-all, twice per layer, in forward and backward. HOW IT COMPOSES WITH THE OTHERS. With DATA parallelism: straightforward - each expert-parallel group processes a different batch shard and gradients are all-reduced as usual, with the subtlety that experts see different numbers of tokens so their gradient scales differ, which the balancing loss partly addresses. With TENSOR parallelism: each expert can itself be tensor-parallel, which is standard for large experts and means you have a two-dimensional device grid with expert index on one axis and tensor shard on the other. With PIPELINE parallelism: compatible, and the all-to-all within a stage adds to that stage's time, which affects the bubble balance across stages - a stage containing MoE layers is slower, so the pipeline must be partitioned by TIME rather than by layer count. With FSDP: the experts are the bulk of the parameters, so sharding them is where the memory saving is - and this interacts awkwardly, because expert parallelism already distributes them, so applying both means deciding which axis owns the distribution. THE PLACEMENT RULE, extending the one from the sharding lesson. Tensor parallelism communicates most frequently and belongs within a node. Expert parallelism's all-to-all is all-pairs and cannot be arranged hierarchically, so it too wants the fastest domain - which puts it in direct competition with tensor parallelism for the same fast links. That competition is the central difficulty in a large MoE deployment, and the usual resolution is to keep the expert group within a node where possible, which bounds the number of experts to what fits. Pipeline parallelism, with the lowest volume, goes across nodes. Data parallelism outermost. THE LOAD-IMBALANCE INTERACTION, which compounds. Expert parallelism's message sizes are data-dependent, so ranks receive different amounts of work and every collective waits for the slowest. In a pipeline that straggler propagates into the bubble. So MoE makes the straggler problem worse in a way that is intrinsic rather than incidental - it is not a bad node, it is the routing. Capacity factors are as much a systems device for bounding this as a modelling one. WHAT I WOULD MEASURE. The all-to-all time as a fraction of step time, the per-rank token-count distribution, and the drop rate - those three characterize the expert-parallel cost completely. And the scaling curve as a function of expert count, which is what tells you where the interconnect stops supporting more experts. THE SUMMARY. MoE is the parallelism axis whose cost is set by network topology rather than by arithmetic, which is why the same sparse architecture performs very differently on two clusters with identical aggregate FLOPs, and why expert count is as much an infrastructure decision as a modelling one."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "What MoE decouples",
        "back": "y = sum over TopK(g(x)) of g_i(x) * E_i(x). PARAMETERS ~ N (expert count), FLOPs ~ k (experts selected). With N=8, k=2: ~4x the FFN parameters at the same arithmetic per token."
      },
      {
        "type": "intuition",
        "front": "Why the gate weight is load-bearing",
        "back": "Top-k SELECTION is not differentiable. The gate value multiplying each expert's output is the ONLY path by which gradient reaches the router - so a router whose gates are near-uniform learns very slowly."
      },
      {
        "type": "formula",
        "front": "The load-balancing auxiliary loss",
        "back": "alpha * N * sum_i (f_i * p_i), where f = token FRACTION (hard count, no gradient) and p = mean router PROBABILITY (soft). The PRODUCT makes a non-differentiable balance constraint differentiable. Minimized when both are uniform at 1/N."
      },
      {
        "type": "intuition",
        "front": "Why routers collapse",
        "back": "An expert that gets slightly more tokens gets more gradient, becomes better, and attracts more - positive feedback with no opposing force in the main objective. The equilibrium is a few used experts and the rest DEAD parameters you paid for."
      },
      {
        "type": "pitfall",
        "front": "The balancing coefficient has two failure modes",
        "back": "Too SMALL: experts collapse. Too LARGE: the router is forced toward uniform routing regardless of input - you have paid for N experts and are using them as an expensive average. Tune it against the utilization HISTOGRAM, which is one line and rarely plotted."
      },
      {
        "type": "definition",
        "front": "Capacity factor and dropped tokens",
        "back": "capacity = C_f * kT/N. Overflow tokens SKIP the FFN and pass through on the residual. Not an error - but not random either: drops concentrate on POPULAR experts, so you systematically under-process a particular kind of input."
      },
      {
        "type": "pitfall",
        "front": "Dropping is a TRAINING-time device",
        "back": "At inference you generally cannot drop - a user's token getting less computation than another's is a fairness problem - so the capacity factor is raised or removed. The model is then evaluated under a DIFFERENT routing regime than it trained under."
      },
      {
        "type": "definition",
        "front": "Expert choice routing",
        "back": "Invert it: each EXPERT picks its top-c TOKENS. Perfect balance BY CONSTRUCTION - no aux loss, no capacity factor, no dropping. Cost: a token may get ZERO or MANY experts (variable compute), and it couples positions, which is awkward for autoregressive decoding."
      },
      {
        "type": "intuition",
        "front": "The line that decides deployment",
        "back": "FLOPs ~ ACTIVE parameters; MEMORY RESIDENT ~ TOTAL parameters. 8 experts top-2 = compute of a ~7B dense model, memory of a ~40B+ one. In bandwidth-bound decode, memory bounds the batch -> intensity -> throughput."
      },
      {
        "type": "intuition",
        "front": "MoE's verdict flips between regimes",
        "back": "LARGEST advantage in compute-bound TRAINING (better loss per FLOP). SMALLEST in memory-bound INFERENCE (residency bounds the batch). Same architecture, opposite verdicts - which resolves most arguments about whether MoE is worth it."
      },
      {
        "type": "pitfall",
        "front": "Why all-to-all is the hardest collective",
        "back": "ALL-PAIRS, so it stresses bisection bandwidth and MUST cross the inter-node link - unlike an all-reduce, which can be hierarchical and cross it once. And message sizes are DATA-DEPENDENT, so they are unbalanced and every rank waits for the slowest."
      },
      {
        "type": "intuition",
        "front": "Specialization is largely folklore - measure it",
        "back": "Routing often correlates with shallow features (token identity) more than semantics, especially in early layers. The strong test is ABLATION: disable an expert and see whether the damage is CATEGORY-SPECIFIC or uniform. Redundant experts can be PRUNED, which directly helps residency."
      }
    ],
    "refs": [
      {
        "title": "Shazeer et al. (2017), Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer",
        "url": "https://arxiv.org/abs/1701.06538"
      },
      {
        "title": "Fedus, Zoph & Shazeer (2021), Switch Transformers: Scaling to Trillion Parameter Models",
        "url": "https://arxiv.org/abs/2101.03961"
      },
      {
        "title": "Lepikhin et al. (2020), GShard: Scaling Giant Models with Conditional Computation",
        "url": "https://arxiv.org/abs/2006.16668"
      },
      {
        "title": "Zhou et al. (2022), Mixture-of-Experts with Expert Choice Routing",
        "url": "https://arxiv.org/abs/2202.09368"
      },
      {
        "title": "Dai et al. (2024), DeepSeekMoE: Towards Ultimate Expert Specialization",
        "url": "https://arxiv.org/abs/2401.06066"
      }
    ],
    "demos": [
      "moe",
      "mixture-of-depths",
      "batching",
      "model-cascade"
    ]
  },
  "llm-data-pipelines": {
    "level": "core",
    "body": {
      "intuition": [
        "Chinchilla made this lesson urgent. Once tokens are co-equal with parameters in the compute-optimal allocation, the supply and quality of data becomes a first-order constraint rather than plumbing - and the supply of high-quality text is finite. That reframes everything here: deduplication is not hygiene, it is a way of increasing the EFFECTIVE token count of a corpus you already have, because a duplicate is an extra epoch you took without knowing it. Quality filtering is not tidiness, it shows up as a better scaling curve.",
        "The pipeline is a funnel with four stages and each has a characteristic technique. QUALITY FILTERING removes documents that are not worth training on, and the most interesting signal is not a language model but COMPRESSION RATIO - repetitive machine-generated junk compresses far better than natural prose, so zlib's ratio separates them cheaply and without a learned classifier. DEDUPLICATION removes exact and near-duplicates, which needs MinHash with LSH banding because comparing every pair is quadratic and the corpora are enormous. PACKING concatenates documents and chunks them to the context length, which sounds trivial and recovers an enormous amount of wasted compute. MIXING decides how much of each source to sample, usually with a temperature that interpolates between proportional and uniform.",
        "The packing number is the one that surprises people, so it is worth stating plainly. Padding each document to the context length wastes roughly 40% of the token slots on padding for a typical document-length distribution; concatenating everything into one stream and chunking wastes under 1%. That is about thirty times fewer wasted slots - a large fraction of your training compute, recovered by a change that is a few lines and no modelling decision at all. It is the clearest example in this module of a systems detail dominating a modelling one."
      ],
      "math": [
        {
          "h": "MinHash estimates Jaccard similarity",
          "paras": [
            "Represent each document as a set of word k-shingles. For a random permutation of the universe, the probability that two sets share a minimum element is exactly their Jaccard similarity - which is the whole trick.",
            "Using P independent hash permutations turns that into an estimator: the fraction of signature positions that agree is an unbiased estimate of the Jaccard, with error falling as one over the square root of P."
          ],
          "tex": "\\Pr[\\,h_{\\min}(A) = h_{\\min}(B)\\,] = \\frac{|A \\cap B|}{|A \\cup B|} = J(A,B), \\qquad \\hat{J} = \\frac{1}{P}\\sum_{i=1}^{P} \\mathbb{1}[h_i(A)=h_i(B)]",
          "texNote": "So a signature of a few hundred integers stands in for a document of any length, and comparing signatures estimates similarity without touching the text. That is the compression that makes corpus-scale deduplication possible - the error at P = 128 is on the order of a few percent, which is ample for a similarity threshold."
        },
        {
          "h": "LSH banding: the S-curve that avoids the quadratic",
          "paras": [
            "Comparing all pairs of signatures is still quadratic. Split each signature into b bands of r rows, hash each band, and call two documents CANDIDATES if any band matches exactly.",
            "The probability of becoming a candidate as a function of true similarity is a sharp S-curve, and b and r place its threshold."
          ],
          "tex": "\\Pr[\\text{candidate}] = 1 - \\big(1 - s^{\\,r}\\big)^{b}, \\qquad \\text{threshold} \\approx \\left(\\tfrac{1}{b}\\right)^{1/r}",
          "texNote": "The S-curve is what makes this practical: below the threshold almost nothing becomes a candidate, above it almost everything does, so you compare a tiny fraction of pairs. Choosing b and r sets where the transition sits - more rows per band sharpens and raises the threshold, more bands lowers it. This is the same banding idea as any LSH scheme and it is what turns an intractable comparison into a hash-table lookup."
        },
        {
          "h": "Packing efficiency, and temperature mixing",
          "paras": [
            "Padding each document to the context length wastes everything between the document's length and the window. Concatenating and chunking wastes only the final partial chunk.",
            "And the mixture weights: sampling each source in proportion to its size lets the largest source dominate, while a temperature interpolates toward uniform."
          ],
          "tex": "\\eta_{\\text{pad}} = \\frac{\\mathbb{E}[\\ell]}{L_{\\text{ctx}}} \\;\\;\\text{vs}\\;\\; \\eta_{\\text{pack}} \\approx 1, \\qquad p_d \\propto \\Big(\\frac{n_d}{\\sum_j n_j}\\Big)^{1/\\tau}",
          "texNote": "For a typical web-document length distribution against a multi-thousand-token window, padding efficiency lands around 60% - roughly 40% of slots wasted - against over 99% for packing. On the mixing side, tau = 1 is proportional sampling and web text swamps everything; larger tau flattens the distribution and up-samples the small high-quality sources such as books and academic text, which is why temperature is the standard knob."
        }
      ],
      "code": [
        {
          "h": "Quality filtering, and the signal that needs no model",
          "paras": [
            "A handful of cheap heuristics remove most of what is not worth training on. The compression-ratio test is the one worth knowing because it catches a failure mode word-count rules miss entirely."
          ],
          "code": "def quality_ok(doc: str) -> bool:\n    words = doc.split()\n    if len(words) < 50:                      return False   # too short\n    if mean(len(w) for w in words) > 10:     return False   # not prose\n    if symbol_ratio(doc) > 0.1:              return False   # markup/code spam\n    if doc.count(\"\\n\") / max(len(words), 1) > 0.3: return False  # list dumps\n    # THE INTERESTING ONE - compression ratio. Repetitive machine-generated\n    # text compresses FAR better than natural prose, so zlib separates them\n    # with no learned classifier and no vocabulary assumptions:\n    ratio = len(zlib.compress(doc.encode())) / len(doc.encode())\n    if ratio < 0.25:                         return False   # too compressible\n    return True\n\n# Measured on a labelled synthetic corpus (clean prose vs short / symbol-spam /\n# repetitive junk), these heuristics reached precision and recall of about 1.0\n# on junk removal - and the compression ratio was what separated the REPETITIVE\n# class, which the length and symbol rules pass straight through.\n# HONEST: those numbers depend on the junk mix. Real pipelines add a LEARNED\n# quality classifier (often trained to distinguish web text from a curated\n# reference corpus), PII removal, and safety filtering on top.\n\n# THE FUNNEL, and roughly what each stage removes:\n#   raw crawl\n#     -> language ID + heuristics       (the bulk of it)\n#     -> EXACT dedup by content hash    (cheap, and there is more than you think)\n#     -> NEAR dedup by MinHash + LSH    (the expensive, high-value stage)\n#     -> quality classifier / safety\n#     -> tokenize + PACK\n#\n# WHY DEDUP IS A SCALING CONCERN, not hygiene: a duplicated document is an\n# extra EPOCH you took without deciding to. Since repeated data has sharply\n# diminishing returns past a few passes, removing duplicates INCREASES the\n# effective token count of a corpus you already have - which is the cheapest\n# response available to the data wall.",
          "caption": "The compression-ratio test catches repetitive machine-generated text that length and symbol heuristics pass through, and it needs no model. And dedup belongs in the scaling conversation: a duplicate is an unplanned epoch."
        },
        {
          "h": "MinHash with LSH, packing, and the mixture",
          "paras": [
            "Near-duplicate detection at corpus scale, then the two cheapest wins in the whole pipeline."
          ],
          "code": "def minhash(doc, P=128, k=5):\n    shingles = {hash(tuple(w[i:i+k])) for i in range(len(w := doc.split()) - k)}\n    return [min((a * s + b) % PRIME for s in shingles) for a, b in HASHES[:P]]\n#   P(signature position matches) == Jaccard, so the FRACTION matching is an\n#   unbiased Jaccard estimate with error ~ 1/sqrt(P). A few hundred integers\n#   stand in for a document of any length.\n\ndef lsh_candidates(sigs, b=16, r=8):        # b*r must equal P\n    buckets = defaultdict(list)\n    for doc_id, sig in enumerate(sigs):\n        for band in range(b):\n            key = (band, tuple(sig[band*r:(band+1)*r]))\n            buckets[key].append(doc_id)     # share a WHOLE band -> candidate\n    return {tuple(sorted(p)) for v in buckets.values()\n            for p in combinations(v, 2)}\n#   P(candidate) = 1 - (1 - s^r)^b, an S-CURVE with threshold ~ (1/b)^(1/r).\n#   Below it almost nothing is a candidate; above it almost everything is - so\n#   you compare a tiny fraction of pairs instead of all O(n^2) of them.\n\n# ---- PACKING: the cheapest large win in the pipeline ----\n# PAD each document to the context length:  ~60% of slots useful  (~40% wasted)\n# CONCATENATE all documents and CHUNK:      >99% of slots useful  (<1% wasted)\n#   -> about 30x fewer wasted slots, for a few lines and no modelling decision.\nstream = chain.from_iterable(tokenize(d) + [EOS] for d in docs)\nbatches = [list(islice(stream, L)) for _ in range(n)]      # chunk to context\n#   THE CAVEAT: chunks now cross document boundaries, so a sequence can contain\n#   the tail of one document and the head of another. Either accept it (common,\n#   and the EOS token marks the seam) or use a block-diagonal attention mask so\n#   documents cannot attend across the boundary - which is more correct and\n#   costs a mask.\n\n# ---- MIXING: temperature over source sizes ----\np = (counts / counts.sum()) ** (1 / tau)\np = p / p.sum()\n#   tau = 1  -> proportional; web text swamps books and academic sources\n#   tau > 1  -> flattens toward uniform, UP-SAMPLING the small high-quality\n#               sources. This is the standard knob and it is where most of the\n#               judgement in a data mixture lives.",
          "caption": "The S-curve is what makes corpus-scale dedup tractable - it turns an all-pairs comparison into a hash-table lookup. And packing recovers about 40% of your token slots for a few lines, which is the largest cheap win in the pipeline."
        }
      ],
      "useCases": [
        "Building a pretraining corpus, where the funnel from raw crawl through filtering, deduplication and packing determines both the token count and the quality of every downstream model trained on it.",
        "Extending the effective size of a corpus you already have, since deduplication removes epochs you were taking unknowingly and quality filtering raises the value of each remaining token - both showing up as a better scaling curve rather than merely a cleaner dataset.",
        "Recovering wasted training compute through sequence packing, which is a few lines and typically returns a large fraction of the token slots that padding was consuming.",
        "Auditing a corpus for benchmark contamination, using the same near-duplicate machinery against evaluation sets - which is the only way to know whether a reported benchmark number reflects capability or memorization."
      ],
      "pitfalls": [
        "Treating deduplication as hygiene. A duplicated document is an extra epoch you did not decide to take, and repeated data has sharply diminishing returns - so dedup increases the EFFECTIVE token count of a fixed corpus, which is a scaling concern.",
        "Padding each document to the context length. For typical document lengths that wastes around 40% of token slots, against under 1% for concatenate-and-chunk - roughly thirty times more waste, for no modelling benefit.",
        "Packing without deciding about document boundaries. Chunks cross documents, so a sequence can contain the end of one and the start of another. Either accept it with an EOS marker or use a block-diagonal mask, but decide rather than discover.",
        "Comparing all pairs for near-duplicates. That is quadratic in corpus size and infeasible at scale. MinHash compresses documents to short signatures and LSH banding turns the comparison into a hash-table lookup with a tunable similarity threshold.",
        "Relying only on length and symbol heuristics for quality. They pass repetitive machine-generated text straight through; a compression ratio catches it cheaply and with no learned model, and it is the signal that distinguishes that class.",
        "Sampling sources in proportion to their size. Web text then swamps the smaller high-quality sources, so a temperature above one is the standard correction - and choosing it is where most of the judgement in a data mixture actually lives.",
        "Not checking for benchmark contamination. Evaluation sets appear in web crawls, so a model can score well by memorization, and the same near-duplicate machinery used for deduplication is what detects it."
      ],
      "connections": [
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Why this lesson exists in its current form. Once Chinchilla made data co-equal with parameters, the token supply became a binding constraint - and deduplication and filtering became ways of increasing the effective supply rather than tidying it."
        },
        {
          "ref": "training-systems/data-loading-scale",
          "text": "The delivery side of the same problem. That lesson gets bytes to the accelerators at rate; this one decides which bytes are worth delivering, and the shard-building stage is where the two meet."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Contamination is a data-pipeline problem with an evaluation consequence, and the near-duplicate machinery here is exactly the tool for detecting it. A benchmark number from a contaminated corpus measures memorization."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The same quality-over-quantity finding at a much smaller scale: a thousand curated examples outperforming far larger sets is the fine-tuning analogue of filtering being worth more than volume."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "MinHash is a sketching technique, and the family - Bloom filters for membership, count-min for frequency - is the standard toolkit whenever a corpus is too large to hold exactly and an approximate answer with bounded error suffices."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why did Chinchilla make data pipelines urgent?",
          "a": "It made tokens co-equal with parameters in the compute-optimal allocation, so the finite supply of high-quality text became a first-order constraint rather than plumbing."
        },
        {
          "q": "Why is deduplication a scaling concern?",
          "a": "A duplicated document is an extra epoch taken unknowingly, and repeated data has sharply diminishing returns - so dedup increases the effective token count of a fixed corpus."
        },
        {
          "q": "What does MinHash estimate?",
          "a": "Jaccard similarity. The probability that two sets share a minimum under a random hash permutation is exactly their Jaccard, so the fraction of matching signature positions is an unbiased estimate."
        },
        {
          "q": "How accurate is a MinHash signature?",
          "a": "The error falls as one over the square root of the number of permutations, so a few hundred integers give a few percent error - ample for a similarity threshold."
        },
        {
          "q": "What is LSH banding for?",
          "a": "Avoiding the quadratic all-pairs comparison. Split signatures into bands, hash each, and treat a whole-band match as a candidate pair."
        },
        {
          "q": "What shape is the LSH candidate probability?",
          "a": "An S-curve: 1 minus (1 minus s to the r) to the b, with the threshold around (1/b) to the power 1/r. Below it almost nothing is a candidate, above it almost everything is."
        },
        {
          "q": "How much does packing save?",
          "a": "Padding each document to the context length wastes about 40% of token slots for typical lengths; concatenate-and-chunk wastes under 1% - roughly thirty times less waste."
        },
        {
          "q": "What does packing cost?",
          "a": "Chunks cross document boundaries, so a sequence can span two documents. Either accept it with an EOS marker or use a block-diagonal attention mask."
        },
        {
          "q": "What is the compression-ratio quality signal?",
          "a": "Repetitive machine-generated text compresses far better than natural prose, so a low zlib ratio flags it - a cheap filter needing no learned model."
        },
        {
          "q": "What is temperature mixing?",
          "a": "Sampling source d with probability proportional to its size raised to 1/tau. Tau of one is proportional; larger values flatten toward uniform and up-sample small high-quality sources."
        },
        {
          "q": "Why is proportional sampling usually wrong?",
          "a": "Web text swamps the smaller curated sources like books and academic text, which are typically the higher-quality part of the mixture."
        },
        {
          "q": "What is benchmark contamination?",
          "a": "Evaluation data appearing in the training corpus, so a model scores by memorization. The same near-duplicate machinery used for dedup is what detects it."
        }
      ],
      "standard": [
        {
          "q": "Walk through building a pretraining corpus from a raw web crawl.",
          "a": "THE FUNNEL HAS FIVE STAGES and each removes a different kind of problem. STAGE 1: LANGUAGE IDENTIFICATION AND HEURISTIC FILTERING. Cheap rules that remove the bulk: minimum word count, mean word length, symbol ratio, line structure. The one worth highlighting is the COMPRESSION RATIO - repetitive machine-generated text compresses far better than natural prose, so zlib's ratio flags it with no learned model and no vocabulary assumption. It catches a class that length and symbol rules pass straight through, which is why it appears in the major public pipelines. STAGE 2: EXACT DEDUPLICATION by content hash. Cheap, and there is far more exact duplication in a crawl than people expect - the same article syndicated, boilerplate pages, mirrored sites. STAGE 3: NEAR DEDUPLICATION, which is the expensive and high-value stage. All-pairs comparison is quadratic and infeasible, so: represent each document as a set of word k-shingles, compute a MinHash signature of a few hundred integers - which works because the probability two sets share a minimum under a random permutation is exactly their Jaccard similarity - and then use LSH BANDING to find candidates. Split the signature into b bands of r rows, hash each band, and treat a whole-band match as a candidate. The candidate probability is an S-curve with a threshold near (1/b)^(1/r), so you compare a tiny fraction of pairs. STAGE 4: QUALITY CLASSIFICATION AND SAFETY. A learned classifier, often trained to distinguish web text from a curated reference corpus, plus PII removal and safety filtering. STAGE 5: TOKENIZE AND PACK. WHY DEDUP MATTERS MORE THAN IT LOOKS, and this is the connection I would make explicitly. A duplicated document is an extra EPOCH you took without deciding to. Since repeated data has sharply diminishing returns past a few passes, removing duplicates INCREASES the effective token count of a corpus you already have. In a world where Chinchilla made tokens co-equal with parameters and the supply is finite, that is the cheapest available response to the data wall - and it reframes dedup from hygiene into a scaling intervention. THE PACKING NUMBER, which is the biggest cheap win. Padding each document to the context length wastes roughly 40% of token slots for a typical document-length distribution. Concatenating everything into one stream and chunking wastes under 1%. That is about thirty times fewer wasted slots, recovered by a few lines with no modelling decision - the clearest case in this module of a systems detail dominating a modelling one. The caveat is that chunks cross document boundaries, so either accept the seam with an EOS marker or use a block-diagonal attention mask. THE MIXTURE. Sampling sources proportionally lets web text swamp books and academic material, so a temperature above one flattens the distribution and up-samples the small high-quality sources. That temperature is where most of the judgement in a corpus actually lives, and it is worth evaluating by fitting scaling curves per mixture rather than by intuition. AND THE STEP PEOPLE OMIT: check for BENCHMARK CONTAMINATION with the same near-duplicate machinery, against your evaluation sets. Without it, a benchmark number may be measuring memorization.",
          "deepDive": {
            "q": "Derive the LSH banding S-curve and explain how you would choose b and r.",
            "a": "THE SETUP. Two documents have true Jaccard similarity s. Their MinHash signatures agree at each position independently with probability s - that is the MinHash property. The signature has P = b*r positions, split into b bands of r rows each. THE DERIVATION, four short steps. (1) A single BAND matches entirely when all r of its positions agree, which has probability s^r. (2) A band FAILS to match with probability 1 - s^r. (3) ALL b bands fail with probability (1 - s^r)^b, since the bands are independent given the signature. (4) So at least one band matches - the pair becomes a CANDIDATE - with probability 1 - (1 - s^r)^b. WHY IT IS AN S-CURVE. Consider the two regimes. For small s, s^r is very small because r is a power, so (1 - s^r)^b is close to one and the candidate probability is near zero. For s near one, s^r is close to one, so (1 - s^r) is near zero and raising it to the b makes it vanish - candidate probability near one. Between them the transition is sharp, and it sharpens as r grows. The inflection is approximately at s = (1/b)^(1/r), which is the standard rule for the threshold. HOW b AND r TRADE. Their product is fixed by the signature length P, so choosing one determines the other. LARGER r means each band is harder to match, which RAISES the threshold and SHARPENS the curve - you catch fewer false positives and risk missing true near-duplicates just below the threshold. LARGER b means more chances to match, which LOWERS the threshold and catches more - at the cost of more candidate pairs to verify and more false positives. HOW I WOULD ACTUALLY CHOOSE. Start from the SIMILARITY THRESHOLD you want, which is a corpus decision - typically something like 0.8 Jaccard for near-duplicate documents. Then solve (1/b)^(1/r) = threshold subject to b*r = P for an integer pair, and plot the resulting curve to check its sharpness at your threshold. With P = 128 and a target near 0.8, something like b = 16 and r = 8 lands close. Then VALIDATE on a labelled sample: take pairs you know to be duplicates and pairs you know are not, and measure the recall and the candidate-set size. WHAT THE ASYMMETRY OF COSTS IMPLIES. A false positive is cheap - it becomes a candidate and you verify it exactly, discarding it. A false negative is a duplicate that survives into the corpus, taking an epoch you did not intend. So I would bias toward a LOWER threshold and more candidates, accepting more verification work, because the verification is a linear pass and the missed duplicate is permanent. That asymmetry is the practical reason production pipelines run fairly generous banding. THE SCALING PROPERTY THAT MAKES IT WORK. Without LSH the comparison is O(n^2) - for a billion documents that is 10^18 pairs, which is not happening. With banding it is O(n*b) hash-table insertions plus verification of the candidate set, which is close to linear when the threshold is set so the candidate set is small. That transformation from quadratic to near-linear is the entire reason corpus-scale deduplication is feasible, and it is the same banding idea used in every other LSH application."
          }
        },
        {
          "q": "How would you evaluate a data mixture?",
          "a": "THE WRONG WAY, which is the common one: train one model on each candidate mixture at whatever scale you can afford and compare final loss or a benchmark. That comparison is confounded, because a difference at small scale may not survive scaling and because you have one point per mixture with no way to separate a genuine advantage from noise. THE RIGHT WAY: FIT A SCALING CURVE PER MIXTURE. Train a ladder of small models on each candidate - parameters over a couple of orders of magnitude, tokens in proportion, learning-rate schedule matched to each run's token count - and fit L(N,D) = E + A/N^a + B/D^b for each. Then compare the CURVES rather than the points. A better mixture shows a lower irreducible term or better constants, and crucially you can extrapolate to the scale you actually intend to train at, where the ranking may differ from the small-scale ranking. This costs a fraction of a real run and it is the only method that answers the question you are actually asking. WHAT TO MEASURE BESIDES LOSS. (1) DOMAIN-SPECIFIC HELD-OUT LOSS, per source, because a mixture that improves aggregate loss by up-weighting web text may be degrading code or mathematics. The aggregate hides exactly the trade you are trying to make. (2) DOWNSTREAM TASK PERFORMANCE on a small suite, remembering that loss is not capability and the mapping can be sharp. (3) CONTAMINATION, checked against every evaluation set with the same near-duplicate machinery used for dedup - because a mixture that happens to include more of a benchmark's source will look better for the wrong reason, and this is a live risk when comparing mixtures specifically. THE TEMPERATURE SWEEP, which is where most of the value is. Rather than comparing hand-designed mixtures, sweep the temperature that interpolates between proportional and uniform sampling and fit a curve at several values. That gives you a one-dimensional family with a principled parameterization instead of an unstructured comparison, and the optimum is usually interior - proportional lets web text dominate, uniform over-samples small sources into repetition. WHAT MAKES THIS HARD AND IS WORTH SAYING. The optimal mixture depends on the model scale and on the token budget, because up-sampling a small source means repeating it, and repetition's cost depends on how many total tokens you are consuming. So a mixture tuned at small scale can be wrong at large scale for a structural reason rather than a noise reason - the small source that was seen twice at 10B tokens is seen forty times at 200B. That interaction is the strongest argument for the curve-fitting method over point comparisons, since it is exactly what the curve extrapolates. WHAT I WOULD REPORT. The fitted curve per mixture, the extrapolated loss at the target scale with the fitting range stated, per-domain held-out losses, and the contamination check. That is a defensible basis for a decision that will otherwise be made on intuition about which sources feel higher quality."
        },
        {
          "q": "Explain sequence packing and its consequences.",
          "a": "THE PROBLEM. Documents vary in length and the model consumes fixed-size sequences. The naive approach pads each document to the context length, which wastes every slot between the document's actual length and the window. For a typical web-document length distribution against a multi-thousand-token context, that is roughly 40% of slots consumed by padding - and padding contributes nothing to learning while costing full compute and memory. THE FIX. Concatenate all tokenized documents into one long stream with a separator, then chunk it at the context length. Now the only waste is the final partial chunk, which is under 1% of the corpus. That is about thirty times fewer wasted slots, and it is a few lines with no modelling decision - which makes it the largest cheap win in the pipeline and the clearest case of a systems detail dominating a modelling one. THE CONSEQUENCE THAT NEEDS A DECISION. Chunks now cross document boundaries, so a sequence can contain the tail of one document and the head of an unrelated one. Two options and you should pick deliberately. (1) ACCEPT IT, with an EOS token marking the seam. The model attends across the boundary, learns that content after an EOS is unrelated, and this is what most pretraining does. The cost is a small amount of attention spent relating unrelated text, and some argument that it teaches the model to handle topic shifts. (2) BLOCK-DIAGONAL MASKING, so attention cannot cross a document boundary within a sequence. More correct - each document is processed as if alone - at the cost of constructing and applying the mask, and of the model never seeing a cross-document transition. Both are defensible; the failure is doing (1) without knowing you did. THE SECOND-ORDER EFFECTS worth knowing. (a) LOSS NORMALIZATION. With packing, every slot is a real token, so the per-token normalization is trivially correct. With padding you must mask and divide by the real count - which is the bug from the custom-loss lesson, and packing removes the opportunity to make it. (b) POSITION IDS. If documents are masked block-diagonally you generally want positions to RESET per document rather than running across the whole chunk, or the second document in a sequence is presented at positions it would never see alone. Forgetting this is a real and subtle bug. (c) BATCH COMPOSITION. Packed sequences are homogeneous in length by construction, which removes the length-bucketing question entirely and makes throughput predictable. (d) VERY LONG DOCUMENTS are split across chunks, so their later portions are seen without their beginning - which is unavoidable and worth being aware of for long-form data. WHERE PACKING IS NOT USED. Fine-tuning on instruction data, where each example is a coherent unit and mixing two instructions in one sequence is genuinely wrong - though even there, packing WITH block-diagonal masking is increasingly common because the efficiency argument does not go away and the masking makes it correct."
        },
        {
          "q": "Why does deduplication improve models, beyond saving compute?",
          "a": "THREE DISTINCT MECHANISMS, and separating them explains why the effect is larger than a compute-saving argument would suggest. (1) IT REMOVES UNPLANNED EPOCHS. A document appearing ten times in the corpus is trained on ten times, which is ten epochs over that content while everything else gets one. Repeated data has sharply diminishing and eventually negative returns, so those extra passes are worth little and consume budget. Removing them means the same compute covers more distinct content, which raises the EFFECTIVE token count of a fixed corpus. In a data-constrained regime that is the cheapest available intervention, and it is why dedup belongs in the scaling conversation rather than the hygiene one. (2) IT REDUCES MEMORIZATION. Content seen many times is memorized rather than generalized from, and memorization is a problem in several directions at once: verbatim regurgitation of training data is a privacy and licensing exposure; memorized text inflates evaluation numbers on anything that overlaps; and capacity spent on memorizing a duplicated document is capacity not spent on generalizing. The published deduplication work found measurable reductions in verbatim emission alongside the quality improvement, which is the strongest form of this argument because it is a direct measurement rather than an inference. (3) IT DE-BIASES THE DISTRIBUTION. Duplication is not uniform across content types - boilerplate, syndicated news, SEO-generated pages and licence texts duplicate far more than original writing. So a duplicated corpus is a distorted sample of the intended distribution, over-weighting exactly the least informative material. Deduplicating moves the training distribution toward the one you meant to sample. THE MEASURED RESULT. The deduplication literature reports better models at equal compute and reduced memorization, from removing duplicates alone - no other change. That is an unusually clean finding for a data intervention, and it is the reason near-duplicate removal became standard in every serious public pipeline. THE VARIANT THAT MATTERS AND IS HARDER. Document-level dedup catches whole duplicates; SUBSTRING dedup catches a paragraph repeated across many otherwise-different documents, which is extremely common with boilerplate and quoted material. That needs suffix arrays rather than MinHash, is more expensive, and catches a class the document-level method misses entirely. Whether it is worth it depends on the corpus, and it is a decision worth making explicitly rather than defaulting to document level because it is easier. THE ONE I WOULD FLAG AS UNDER-DONE. Deduplicating the training corpus AGAINST THE EVALUATION SETS - contamination checking. It uses the same machinery, it is cheap once the pipeline exists, and without it a benchmark number may be measuring memorization of the test set rather than capability. That is not a data-quality issue, it is a validity issue, and it undermines everything downstream of the evaluation.",
          "deepDive": {
            "q": "How would you detect and quantify benchmark contamination?",
            "a": "THE PROBLEM. Evaluation sets are published on the web, so they end up in crawls. A model that has seen the test set scores well by memorization, and the number then measures nothing you care about. This is a validity failure rather than a quality one, and it invalidates comparisons rather than merely degrading them. DETECTION METHOD 1: N-GRAM OVERLAP, the standard approach. For each evaluation example, check whether a sufficiently long n-gram from it - typically something in the range of 8 to 13 tokens - appears anywhere in the training corpus. Long n-grams essentially never collide by chance in natural text, so a match is strong evidence. Implementation is a hash set or a Bloom filter over the corpus's n-grams, which makes the lookup constant-time at the cost of a small false-positive rate that you can bound by sizing the filter. This is what most public reporting uses. DETECTION METHOD 2: NEAR-DUPLICATE MATCHING with the MinHash and LSH machinery already built for deduplication. It catches paraphrased or reformatted versions that exact n-gram matching misses - a benchmark question reproduced with different whitespace or a slightly different preamble. Cheap once the dedup pipeline exists. DETECTION METHOD 3: BEHAVIOURAL, when you cannot inspect the training data - which is the usual situation with a model someone else trained. Compare the model's likelihood on the exact benchmark text against its likelihood on trivially perturbed versions: reorder the multiple-choice options, rephrase the question, change names or numbers. A model that has memorized shows an anomalous preference for the canonical form. Alternatively, compare performance on a benchmark against performance on a freshly-constructed equivalent set created after the model's training cutoff - a large gap is the signature. QUANTIFICATION. Report the FRACTION of evaluation examples with a training-set match, and report the benchmark score BOTH ways: on the full set and on the contamination-free subset. The difference between those two numbers is the contamination's effect, and it is the number that should be quoted. If removing contaminated examples drops the score substantially, the original figure was measuring memorization. WHAT MAKES THIS GENUINELY HARD. (1) You often cannot see the training data - most reported model evaluations are on models whose corpora are undisclosed, so only the behavioural methods apply. (2) Contamination is a spectrum: the exact test item, a paraphrase, a discussion of the benchmark, a solution posted in a forum, or merely the source document the question was written from. Where to draw the line is a judgement, and different papers draw it differently, which makes cross-paper comparisons of contamination rates unreliable. (3) NEW BENCHMARKS DECAY. A benchmark released today is clean today and contaminated in two years, so a model's score is partly a function of when it was trained relative to the benchmark's publication. THE PRACTICE I WOULD ADOPT. Run n-gram contamination checking against every evaluation set as a standard pipeline stage, report the contaminated fraction alongside every benchmark number, and prefer held-out sets constructed after the training cutoff where the question is important. And treat a benchmark score reported without a contamination check as an upper bound rather than a measurement - which is the honest reading of most published numbers."
          }
        },
        {
          "q": "How do you decide what quality filtering to apply?",
          "a": "THE TENSION IS THAT FILTERING REMOVES TOKENS, and in a data-constrained regime tokens are the scarce resource. So every filter has to justify itself against the loss of volume, and the right criterion is whether it improves the SCALING CURVE rather than whether the surviving documents look nicer. THE LADDER OF FILTERS, roughly by cost and by how well-established they are. (1) LANGUAGE IDENTIFICATION, if you want a monolingual or a controlled-mixture corpus. Cheap, unambiguous. (2) LENGTH AND STRUCTURE HEURISTICS: minimum words, mean word length, symbol ratio, fraction of lines that are bullets or navigation. These remove the obvious bulk and are essentially free. (3) THE COMPRESSION-RATIO TEST, which I would highlight because it catches a class the others miss. Repetitive machine-generated text - SEO spam, templated pages, keyword stuffing - compresses far better than natural prose, so a low zlib ratio flags it. No model, no vocabulary assumption, and it is the signal that separates the repetitive class after length and symbol rules have passed it through. (4) REPETITION-WITHIN-DOCUMENT metrics: the fraction of duplicate lines or paragraphs, which the Gopher-style rules use and which catch a related failure. (5) A LEARNED QUALITY CLASSIFIER, typically trained to distinguish crawl text from a curated reference corpus. More powerful and more opaque, and it imports whatever biases the reference corpus has - a classifier trained against a formal reference will down-weight informal but perfectly good text, which is a real and under-examined cost. (6) SAFETY AND PII filtering, which is a requirement rather than a quality decision. HOW I WOULD DECIDE WHAT TO KEEP. Fit a scaling curve for the corpus with and without each filter. A filter that improves the curve is worth its volume loss; one that does not is removing tokens for nothing. This is the same method as evaluating a mixture and it is the only way to answer the question empirically rather than aesthetically. I would also measure the volume removed per filter, so the cost side of the trade is explicit. WHAT I WOULD BE CAUTIOUS ABOUT. Aggressive filtering has a documented failure mode: it removes dialects, non-standard registers, and the writing of under-represented groups at a higher rate, because those look further from a curated reference. That is a quality decision with a fairness consequence and it should be made knowingly. And filtering interacts with the mixture - if a filter removes 60% of one source and 5% of another, you have silently changed the mixture weights, which is a common and invisible side effect. THE ORDER THAT MATTERS. Deduplicate BEFORE running expensive filters, so you are not classifying the same document repeatedly. And do contamination checking last, against the final corpus, since earlier stages change what is in it. THE JUDGEMENT I WOULD OFFER. The heuristic filters are well-established and cheap and I would apply them by default. The learned classifier is where the real decisions are, and I would treat its reference corpus as a modelling choice deserving the same scrutiny as an architecture - because it determines what the model considers normal text."
        },
        {
          "q": "How does this lesson fit the module's two-regime framing?",
          "a": "IT IS ENTIRELY A TRAINING-REGIME LESSON, and saying so precisely is useful because it clarifies what these techniques can and cannot buy. THE TRAINING REGIME'S QUESTION is how to allocate a compute budget, and Chinchilla answered it: split it roughly equally between parameters and tokens, around twenty tokens per parameter. That answer makes the TOKEN SUPPLY a first-order constraint, and everything in this lesson is a response to that constraint. WHAT EACH TECHNIQUE BUYS, in those terms. DEDUPLICATION increases the effective token count of a fixed corpus, because a duplicate was an unplanned epoch and repeated data has diminishing returns. QUALITY FILTERING raises the value of each remaining token, visible as a better scaling curve. PACKING recovers the roughly 40% of token slots that padding was consuming, which is compute rather than data but is spent on the same axis. MIXING decides which tokens you spend the budget on. All four are ways of getting more out of the D term in the scaling law, and none of them touches inference at all. THE CONTRAST WITH THE INFERENCE REGIME, which nothing here addresses. Quantization, grouped-query attention, speculative decoding and paged attention are all about bytes read per generated token, and no amount of data-pipeline work changes any of them. A model trained on a beautifully curated corpus decodes at exactly the same speed as one trained on a filthy one. That sounds obvious stated plainly and it is worth stating, because data-quality arguments sometimes get invoked in efficiency discussions where they are simply irrelevant. WHERE THE TWO REGIMES MEET, and there are two places. (1) THE INFERENCE-AWARE SCALING OBJECTIVE from the scaling-laws lesson says a served model should be smaller and trained on MORE tokens - which increases the demand on this pipeline. So the deployment plan raises the token requirement, and data-pipeline work is what makes that possible. The pipeline is therefore doing work in service of an inference-regime decision, which is the connection worth drawing. (2) CONTAMINATION, which is a data-pipeline problem whose consequence is an evaluation problem - and evaluation spans both regimes because it is how you decide anything at all. THE STRATEGIC READING. Chinchilla shifted the marginal value of effort from architecture toward data, and the data wall shifted it further - toward deduplication, quality, synthetic generation, and post-training. This lesson is where the first two of those live, and its techniques went from unglamorous plumbing to a determinant of frontier model quality in about two years, entirely because the binding constraint moved. That is a good illustration of the module's general claim: the technique that matters is the one addressing whatever currently binds, and which one that is changes."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "MinHash estimates Jaccard",
        "back": "P[h_min(A) = h_min(B)] = J(A,B) EXACTLY. So the fraction of matching signature positions is an UNBIASED Jaccard estimate, error ~ 1/sqrt(P). A few hundred integers stand in for a document of any length."
      },
      {
        "type": "formula",
        "front": "The LSH banding S-curve",
        "back": "P(candidate) = 1 - (1 - s^r)^b, threshold ~ (1/b)^(1/r), with b*r = P. Below the threshold almost nothing is a candidate, above it almost everything is - turning O(n^2) all-pairs into a hash-table lookup."
      },
      {
        "type": "intuition",
        "front": "Bias LSH toward MORE candidates",
        "back": "A false POSITIVE is cheap - you verify it exactly and discard it. A false NEGATIVE is a duplicate that survives, taking an epoch you did not intend. Asymmetric costs, so run generous banding and accept the verification pass."
      },
      {
        "type": "intuition",
        "front": "Sequence packing: the biggest cheap win",
        "back": "PAD each document to context: ~40% of slots wasted. CONCATENATE and CHUNK: <1%. About 30x fewer wasted slots, for a few lines and no modelling decision. The clearest case of a systems detail dominating a modelling one."
      },
      {
        "type": "pitfall",
        "front": "Packing crosses document boundaries",
        "back": "A sequence can hold the tail of one document and the head of another. Either ACCEPT it with an EOS marker (what most pretraining does) or use a BLOCK-DIAGONAL mask - and if you mask, RESET position ids per document. The failure is doing it unknowingly."
      },
      {
        "type": "intuition",
        "front": "Dedup is a SCALING intervention, not hygiene",
        "back": "A duplicated document is an extra EPOCH you took without deciding to - and repeated data has sharply diminishing returns. So dedup raises the EFFECTIVE token count of a corpus you already have: the cheapest response to the data wall."
      },
      {
        "type": "intuition",
        "front": "Three mechanisms by which dedup improves models",
        "back": "(1) removes unplanned epochs -> more distinct content per unit compute; (2) reduces MEMORIZATION (privacy, licensing, inflated evals, wasted capacity); (3) DE-BIASES the distribution, since boilerplate/syndicated/SEO text duplicates far more than original writing."
      },
      {
        "type": "definition",
        "front": "The compression-ratio quality signal",
        "back": "Repetitive machine-generated text compresses FAR better than natural prose, so a low zlib ratio flags it - no learned model, no vocabulary assumption. It catches the class that length and symbol heuristics pass straight through."
      },
      {
        "type": "formula",
        "front": "Temperature mixing",
        "back": "p_d ~ (n_d / sum n)^(1/tau). tau=1 is PROPORTIONAL and web text swamps everything; tau>1 flattens toward uniform, UP-SAMPLING small high-quality sources. Sweep tau and fit a scaling curve at each value rather than hand-designing mixtures."
      },
      {
        "type": "intuition",
        "front": "Evaluate a mixture by its CURVE, not a point",
        "back": "Train a LADDER per candidate and fit L(N,D) = E + A/N^a + B/D^b. Compare curves and extrapolate. A point comparison at small scale cannot separate a real advantage from noise, and the ranking can INVERT at scale because up-sampling a small source means more repetition as D grows."
      },
      {
        "type": "pitfall",
        "front": "Check benchmark CONTAMINATION",
        "back": "Evaluation sets are on the web. Use the same MinHash/LSH machinery, or n-gram (8-13 token) matching via a Bloom filter. Report the score on the FULL set AND the clean subset - the difference is the contamination's effect. A score without this check is an upper bound."
      },
      {
        "type": "pitfall",
        "front": "Filtering silently changes the MIXTURE",
        "back": "A filter removing 60% of one source and 5% of another has reweighted your corpus. And aggressive filtering removes dialects and non-standard registers at a higher rate, because they look further from a curated reference - a quality decision with a fairness consequence."
      }
    ],
    "refs": [
      {
        "title": "Lee et al. (2022), Deduplicating Training Data Makes Language Models Better",
        "url": "https://arxiv.org/abs/2107.06499"
      },
      {
        "title": "Penedo et al. (2023), The RefinedWeb Dataset for Falcon LLM",
        "url": "https://arxiv.org/abs/2306.01116"
      },
      {
        "title": "Rae et al. (2021), Scaling Language Models: Methods, Analysis & Insights from Training Gopher",
        "url": "https://arxiv.org/abs/2112.11446"
      },
      {
        "title": "Soldaini et al. (2024), Dolma: an Open Corpus of Three Trillion Tokens",
        "url": "https://arxiv.org/abs/2402.00159"
      },
      {
        "title": "Raffel et al. (2020), Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (C4)",
        "url": "https://arxiv.org/abs/1910.10683"
      }
    ],
    "demos": [
      "bloom-filter",
      "count-min-sketch",
      "reservoir-sampling",
      "importance-sampling"
    ]
  },
  "distillation": {
    "level": "core",
    "body": {
      "intuition": [
        "Distillation is the module's explicit cross-regime technique: it converts TRAINING compute into INFERENCE savings. You spend a large teacher's compute once - training it, and generating from it - and receive a smaller model that is cheaper to serve for the rest of its life. That is the same objective as the inference-aware scaling result, reached by a different route: rather than training a small model longer on raw data, you train it on a large model's outputs.",
        "The mechanism is that a soft distribution carries more information than a label. A one-hot target says the answer is class seven. The teacher's distribution says it is class seven with probability 0.8, class three with 0.15, and everything else negligible - which additionally tells the student that three resembles seven and the rest do not. Hinton called those relative probabilities among the wrong answers the dark knowledge, and they are why a student trained on soft targets can outperform the same student trained on the hard labels the teacher itself learned from. Temperature is the knob that exposes them: dividing the logits by T before the softmax flattens the distribution and makes the small probabilities visible, and the loss must then be multiplied by T squared because the soft-target gradient scales as one over T squared.",
        "And then the honest limit, which this curriculum has already established from the fine-tuning side. Imitating a teacher's SAMPLED OUTPUTS transfers surface behaviour reliably and capability only where the student already has the substrate - Gudibande et al. measured imitation models rated competitive by human judges while barely moving on checkable benchmarks, and found that scaling the imitation DATA did not close the gap while scaling the STUDENT did. So the bottleneck is the student, not the teaching. What changed the picture for reasoning is not more imitation but VERIFIED imitation: generate many candidate solutions, check the answers, and train only on the correct ones. That converts the target from the teacher's output distribution into the teacher's CORRECT-ANSWER distribution, which is rejection sampling and is closer to reinforcement learning with a sparse verifier than to behavioural cloning."
      ],
      "math": [
        {
          "h": "The distillation loss, and why T squared",
          "paras": [
            "Soften both teacher and student with a temperature, take the KL divergence between them, and mix with the ordinary hard-label loss. The temperature makes the small probabilities - the dark knowledge - large enough to supply gradient.",
            "The T squared factor is necessary rather than cosmetic: the gradient of the softened cross-entropy scales as one over T squared, so without it the soft term's contribution shrinks as you raise the temperature and the mixing coefficient stops meaning anything."
          ],
          "tex": "\\mathcal{L} = \\alpha\\,T^2\\, \\mathrm{KL}\\!\\Big(\\sigma\\big(\\tfrac{z_t}{T}\\big) \\,\\Big\\|\\, \\sigma\\big(\\tfrac{z_s}{T}\\big)\\Big) \\;+\\; (1-\\alpha)\\, \\mathrm{CE}(z_s, y)",
          "texNote": "Read the T squared as restoring scale: differentiate the softened cross-entropy and a factor of 1/T appears from each of the softmax argument and the chain rule, so multiplying by T squared keeps the soft term's gradient magnitude comparable across temperatures. Omit it and raising T silently reduces the distillation signal, which is the most common implementation error here."
        },
        {
          "h": "Why a soft target carries more than a label",
          "paras": [
            "A one-hot label over C classes carries at most log C bits and says nothing about the relationships among the alternatives. A full distribution specifies the teacher's relative confidences.",
            "The gap is largest exactly where the teacher is uncertain, which is where the label is least informative about the underlying structure."
          ],
          "tex": "H(y_{\\text{hard}}) = 0 \\;\\;\\text{vs}\\;\\; H\\big(\\sigma(z_t/T)\\big) > 0, \\qquad \\text{information per example} \\;\\uparrow\\; \\text{with } T",
          "texNote": "This is why distillation can beat training the student directly on the same labels: the student is receiving a richer supervision signal per example, encoding which classes the teacher considers similar. It also explains why distillation helps most in the low-data regime - each example is doing more work - and why it helps less when the student already has abundant labelled data."
        },
        {
          "h": "The regime trade this technique makes",
          "paras": [
            "Teacher training and generation are paid once; the smaller student's inference saving is paid on every request. The break-even is a straightforward comparison and it is what justifies the technique commercially.",
            "Note the structure is identical to the inference-aware scaling objective - both move cost from serving to training."
          ],
          "tex": "\\underbrace{C_{\\text{teacher}} + C_{\\text{gen}}}_{\\text{once}} \\;<\\; \\underbrace{2\\,(N_{\\text{big}} - N_{\\text{small}})\\, D_{\\text{inf}}}_{\\text{saved on every token, forever}}",
          "texNote": "At any substantial serving volume the right-hand side dominates easily, which is why distillation is standard for anything deployed at scale. The interesting cases are the ones where it does not: low-volume deployments, or where the teacher's generation cost is large because the task needs many samples per example - which is exactly the verified-imitation recipe, where you generate many candidates and keep few."
        }
      ],
      "code": [
        {
          "h": "The loss, and the three details people get wrong",
          "paras": [
            "Short, and each of the three annotations below is an error I have seen produce a distillation that silently does almost nothing."
          ],
          "code": "def kd_loss(student_logits, teacher_logits, targets, T=4.0, alpha=0.9):\n    # 1. SOFTEN BOTH. The teacher's small probabilities are the dark knowledge\n    #    and they are invisible at T = 1.\n    s = F.log_softmax(student_logits / T, dim=-1)\n    t = F.softmax(teacher_logits / T, dim=-1)\n\n    # 2. reduction='batchmean', NOT 'mean'. PyTorch's kl_div with 'mean'\n    #    averages over EVERY ELEMENT including the class dimension, which\n    #    divides the loss by the vocabulary size - so the distillation term is\n    #    thousands of times too small and appears to do nothing.\n    soft = F.kl_div(s, t, reduction=\"batchmean\")\n\n    # 3. MULTIPLY BY T^2. The softened gradient scales as 1/T^2, so without\n    #    this, raising the temperature silently WEAKENS the signal and alpha\n    #    stops meaning what you think.\n    hard = F.cross_entropy(student_logits, targets)\n    return alpha * T * T * soft + (1 - alpha) * hard\n\n# TEMPERATURE: T = 1 gives the teacher's actual distribution, which is usually\n# too peaked to reveal much. T in the 2-10 range exposes the relative ordering\n# of the wrong classes. Very high T flattens toward uniform and the signal\n# degrades again - so it is an interior optimum, worth sweeping.\n#\n# WHY IT CAN BEAT TRAINING ON THE LABELS DIRECTLY: the student receives a\n# DISTRIBUTION per example rather than a single index - strictly more\n# information, encoding which classes the teacher considers similar. That is\n# also why the benefit is largest in the LOW-DATA regime and smallest when the\n# student already has abundant labels.",
          "caption": "Three details, each of which silently disables the technique: forgetting to soften, using the wrong KL reduction so the term is divided by the vocabulary size, and omitting T squared so raising the temperature weakens rather than strengthens the signal."
        },
        {
          "h": "Distilling a language model, and where imitation stops working",
          "paras": [
            "Token-level matching is the direct translation and is often impractical. What the field actually does - and its documented limit - is the more useful content."
          ],
          "code": "# TOKEN-LEVEL KD: match the teacher's next-token distribution at every\n# position. Highest-information signal, and it needs the teacher's FULL LOGITS\n# over the vocabulary - which is a large tensor per position and is usually\n# unavailable if the teacher is behind an API.\nloss = kd_loss(student(x).logits, teacher(x).logits, targets, T=2.0)\n\n# SEQUENCE-LEVEL KD: generate from the teacher and train the student on those\n# sequences with ordinary cross-entropy. Cheap, needs only sampled text, and\n# it is what almost everyone actually does.\nsynthetic = [teacher.generate(p) for p in prompts]\nloss = F.cross_entropy(student(synthetic).logits, synthetic_targets)\n\n# ---- THE DOCUMENTED LIMIT, and it is the important part ----\n# Fine-tuning an open model on a much stronger model's SAMPLED outputs:\n#   crowdworkers rated the imitations COMPETITIVE with the target\n#   targeted capability benchmarks barely moved\n#   scaling the imitation DATA did not close the gap - scaling the STUDENT did\n# So sequence-level imitation transfers STYLE reliably and CAPABILITY only\n# where the student already has the substrate. The bottleneck is the student,\n# not the amount of teaching.\n\n# ---- WHAT CHANGED FOR REASONING: VERIFIED imitation ----\ncandidates = [teacher.generate(p) for _ in range(k)]      # sample MANY\nkept = [c for c in candidates if check(extract(c), answer)] # CHECK them\ntrain_on(kept)                                             # keep only correct\n#\n# This is REJECTION SAMPLING. The target distribution is no longer the\n# teacher's OUTPUT distribution but its CORRECT-ANSWER distribution, so the\n# supervision now selects trajectories by OUTCOME rather than by surface. That\n# is closer to RL with a sparse verifier than to behavioural cloning, and it is\n# why reasoning distillation works where plain imitation did not.\n#\n# HOW TO TELL WHICH YOU GOT: evaluate on CHECKABLE tasks, not preference.\n# Preference judging on short comparisons largely measures style, which is\n# exactly what imitation transfers - so it cannot distinguish the two cases.",
          "caption": "Sequence-level imitation transfers style and not capability - measured. Verified imitation changes the target from the teacher's output distribution to its correct-answer distribution, which is why reasoning distillation works where plain imitation did not."
        }
      ],
      "useCases": [
        "Producing a servable model from a large one, which is the primary use and the explicit cross-regime trade - spend teacher compute once and save on every request for the model's life.",
        "Reasoning models, where the recipe is generate-many, verify, and train on the correct trajectories - which is what makes small models capable at mathematics and code where plain imitation fails.",
        "Low-data supervised settings, where the teacher's soft targets carry more information per example than the labels and the benefit is largest precisely because examples are scarce.",
        "Compressing an ensemble into a single model, which is distillation's original framing: the ensemble's averaged distribution is the teacher, and the student recovers most of its quality at one model's inference cost."
      ],
      "pitfalls": [
        "Using kl_div with reduction='mean'. It averages over every element including the class dimension, dividing the loss by the vocabulary size - so the distillation term is thousands of times too small and the technique appears to do nothing. Use batchmean.",
        "Omitting the T squared factor. The softened gradient scales as one over T squared, so without it raising the temperature silently weakens the distillation signal and the mixing coefficient stops meaning what you intended.",
        "Expecting sequence-level imitation to transfer capability. It transfers style reliably and capability only where the student has the substrate - and scaling the imitation data does not close the gap, while scaling the student does.",
        "Evaluating a distilled model by preference judging. Short preference comparisons largely measure style, which is exactly what imitation transfers, so that instrument cannot distinguish a capability gain from a surface one. Use checkable tasks.",
        "Distilling into a student far too small for the task. There is a floor: below some capacity the student cannot represent the teacher's function regardless of how much data you generate, and reasoning distillation in particular degrades sharply at small scale.",
        "Using a single temperature without sweeping. Too low and the dark knowledge is invisible; too high and the distribution flattens toward uniform and the signal degrades again. The optimum is interior.",
        "Training on unfiltered teacher outputs for a checkable task. Verification is what turned reasoning distillation from ineffective to effective, and it costs only the generation of extra candidates - skipping it discards the whole advantage."
      ],
      "connections": [
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "Where the imitation limit is established from the other side: style transfers, capability does not, and the resolution is that imitating a SAMPLE can only select what the base can already produce while optimizing against a verifier can move it."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The same cross-regime objective by a different route. Both distillation and inference-aware scaling move cost from serving to training, and the choice between training a small model longer and distilling a large one is an empirical comparison."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The other way to make a model cheaper to serve, attacking a different term: distillation reduces the parameter count, quantization reduces the bytes per parameter, and they compose."
        },
        {
          "ref": "fine-tuning/dpo-grpo",
          "text": "Why verified imitation works: filtering by outcome makes the supervision select trajectories rather than reproduce a surface, which is the imitation-versus-optimization distinction and puts rejection-sampling distillation closer to RL than to cloning."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Where the saving is realized. A distilled model reduces parameters, which reduces bytes read per token in the bandwidth-bound decode regime - and therefore raises the servable batch and lowers cost per token."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is knowledge distillation?",
          "a": "Training a small student to match a large teacher's output distribution rather than only the hard labels, so it receives the teacher's relative confidences as supervision."
        },
        {
          "q": "What is dark knowledge?",
          "a": "The relative probabilities the teacher assigns to the WRONG classes, which encode which classes it considers similar - information a one-hot label does not contain."
        },
        {
          "q": "What does temperature do?",
          "a": "Dividing logits by T before the softmax flattens the distribution, making the small probabilities large enough to supply gradient. T of 2 to 10 is typical."
        },
        {
          "q": "Why multiply the soft loss by T squared?",
          "a": "The softened cross-entropy's gradient scales as one over T squared, so without the factor, raising the temperature silently weakens the distillation signal."
        },
        {
          "q": "Why is reduction='batchmean' required?",
          "a": "PyTorch's kl_div with 'mean' averages over every element including the class dimension, dividing the loss by the vocabulary size so the term is thousands of times too small."
        },
        {
          "q": "Why can a student beat training on the same labels directly?",
          "a": "A distribution carries more information per example than an index, encoding the teacher's similarity structure. The gap is largest in the low-data regime."
        },
        {
          "q": "What is sequence-level distillation?",
          "a": "Generating text from the teacher and training the student on it with ordinary cross-entropy - cheap, needs only sampled outputs, and is what most people actually do."
        },
        {
          "q": "What does token-level distillation need that sequence-level does not?",
          "a": "The teacher's full logits over the vocabulary at every position, which is a large tensor and is unavailable if the teacher is behind an API."
        },
        {
          "q": "What is the documented limit of imitation?",
          "a": "It transfers style reliably and capability only where the student has the substrate. Scaling imitation data does not close the gap; scaling the student does."
        },
        {
          "q": "What changed for reasoning distillation?",
          "a": "Verification. Generate many candidates, check the answers, and train only on correct ones - which makes the target the teacher's correct-answer distribution."
        },
        {
          "q": "Why is that different in kind?",
          "a": "It selects trajectories by outcome rather than reproducing a surface, which is closer to reinforcement learning with a sparse verifier than to behavioural cloning."
        },
        {
          "q": "How should a distilled model be evaluated?",
          "a": "On checkable tasks. Preference judging largely measures style, which is exactly what imitation transfers, so it cannot distinguish a capability gain from a surface one."
        }
      ],
      "standard": [
        {
          "q": "How would you build a distillation pipeline for a production model?",
          "a": "THE STAGES, and the decisions in each. (1) CHOOSE THE STUDENT SIZE FIRST, from the serving constraint rather than from what seems reasonable. Compute the KV cache and weight memory at your target context and concurrency, and pick the largest student that leaves room for the batch you need. That number is what determines cost per token, and choosing it last means retrofitting. (2) DECIDE WHAT SUPERVISION YOU CAN ACTUALLY GET. If you control the teacher you can use token-level logits, which is the richest signal - but the full vocabulary distribution per position is a very large tensor, so in practice you store top-k logits plus a residual, which recovers most of the information at a fraction of the storage. If the teacher is behind an API you get sampled text only, and you are in the sequence-level regime with its documented limits. This decision determines everything downstream. (3) CHOOSE THE PROMPT DISTRIBUTION, which is where most of the quality lives and gets the least attention. The student learns the teacher's behaviour ON THE PROMPTS YOU GENERATE FROM. If those come from a different distribution than production traffic, you have distilled the wrong function. I would sample real traffic where possible and cover the task types deliberately, including the hard cases and the ones where the right answer is a refusal or a clarifying question. (4) VERIFY WHERE YOU CAN. For any checkable subset - code that runs, mathematics with an answer, structured output that parses - generate many candidates, filter to correct ones, and train on those. This is the difference between transferring style and transferring capability, and it costs only extra generation. For the unverifiable remainder, accept that you are transferring behaviour. (5) MIX IN REAL DATA. Training exclusively on model output risks distribution narrowing, and keeping a real-data component is the cheap mitigation. (6) TRAIN, with the temperature and alpha swept, batchmean reduction, and the T squared factor. WHAT I WOULD MEASURE, and the design is the substance. Checkable-task accuracy as the primary metric, never preference win-rate, since preference measures style and style is what imitation transfers regardless. Pass-at-k on the student before and after, which distinguishes teaching selection from teaching capability. Agreement with the teacher on held-out prompts, as a direct measure of what transferred. And the capability suite from before distillation, because the student may have lost things the teacher never had to demonstrate. THE OPERATIONAL PART people skip. Version the teacher and pin it, because a teacher upgrade silently changes your training distribution. Store the generated corpus rather than regenerating, so runs are reproducible and the expensive part is paid once. And keep the verification results, since the filtered-out candidates are useful negative data for later work."
        },
        {
          "q": "Explain knowledge distillation and when it works.",
          "a": "THE MECHANISM. Train a small student to match a large teacher's output DISTRIBUTION rather than the hard labels. The loss is a temperature-softened KL between the two distributions, mixed with an ordinary cross-entropy on the true labels. WHY IT WORKS - the information argument. A one-hot label says the answer is class seven and nothing else. The teacher's distribution says class seven with probability 0.8, class three with 0.15, and the rest negligible - which additionally tells the student that three RESEMBLES seven. Hinton called those relative probabilities among wrong answers the dark knowledge, and they are why a student trained on soft targets can outperform the same student trained on the hard labels the teacher itself learned from. The student is receiving strictly more information per example. THE TEMPERATURE AND ITS SUBTLETY. At T = 1 the teacher's distribution is usually too peaked for the small probabilities to matter. Dividing logits by T flattens it and exposes the ordering. But you must then multiply the soft loss by T SQUARED, because the softened cross-entropy's gradient scales as one over T squared - omit it and raising the temperature silently weakens the very signal you were trying to strengthen. That, plus using batchmean rather than mean for the KL reduction, are the two implementation errors that make distillation appear not to work. WHEN IT WORKS BEST. Low-data regimes, since each example carries more information. Compressing an ensemble, which was the original framing - the ensemble's averaged distribution is the teacher. And any case where the student has the CAPACITY to represent the teacher's function and merely needs a better training signal. THE LIMIT, which is the substance for language models. Sequence-level imitation - generating from the teacher and training on the text - transfers style reliably and capability only where the student already has the substrate. Gudibande et al. measured this directly: imitation models were rated competitive by crowdworkers while targeted capability benchmarks barely moved, and crucially, scaling the imitation DATA did not close the gap while scaling the STUDENT did. That last detail is decisive - it says the bottleneck is the student's capacity, not the amount of teaching, so more generation is the wrong lever. WHAT CHANGED FOR REASONING. Not more imitation but VERIFIED imitation: sample many candidate solutions from the teacher, CHECK the final answers against ground truth, and train only on the correct ones. That changes the target from the teacher's output distribution to its CORRECT-ANSWER distribution. It is rejection sampling, and it selects trajectories by outcome rather than reproducing a surface - which puts it closer to reinforcement learning with a sparse verifier than to behavioural cloning. It is also why this recipe works in mathematics and code and is harder to apply where nothing is checkable. HOW I WOULD EVALUATE. On checkable tasks, never on preference judging - because short preference comparisons largely measure style, which is precisely what imitation transfers, so that instrument is structurally unable to distinguish the two cases.",
          "deepDive": {
            "q": "Derive why the soft loss needs a T squared factor.",
            "a": "THE SETUP. Let z be logits, and define the softened distribution p_i = softmax(z/T)_i. The distillation loss is the cross-entropy between the teacher's softened distribution q and the student's p. THE GRADIENT. For cross-entropy with softmax, the gradient with respect to the LOGIT is the familiar difference between prediction and target - but here the softmax argument is z/T, so the chain rule brings a factor of 1/T. Specifically, d/dz_i of the cross-entropy H(q, softmax(z/T)) equals (1/T)(p_i - q_i). WHERE THE SECOND FACTOR COMES FROM. That is only one 1/T. The second appears because the DIFFERENCE p_i - q_i itself shrinks with temperature. Expand the softmax for large T: softmax(z/T)_i is approximately 1/C times (1 + (z_i - z_bar)/T) to first order, since z/T becomes small and the exponential linearizes. So the deviation of p from uniform is itself of order 1/T, and likewise for q, which means p_i - q_i is of order 1/T. Combining, the gradient is of order 1/T times 1/T, which is 1/T squared. THE CONSEQUENCE. Without correction, raising the temperature from 1 to 4 divides the distillation gradient by about sixteen, so the soft term contributes proportionally less to the total gradient. Since you raised T precisely to expose more information, the uncorrected version undoes the intervention - which is why the symptom is that increasing the temperature makes distillation weaker rather than stronger, and it is a genuinely confusing symptom because it inverts the expectation. Multiplying by T squared restores the soft term's gradient magnitude to be comparable across temperatures, so alpha means the same thing at every T and the temperature sweep measures what you think. THE SUBTLETY WORTH ADDING. In the high-temperature limit, with the linearization above, the softened KL becomes approximately proportional to the squared difference of the MEAN-CENTRED LOGITS - so distillation at high temperature reduces to logit matching, which is a nice connection: it says the technique's high-T limit is regression on logits rather than anything distributional. And at T = 1 you get the teacher's true distribution, which is the low-T limit. The interesting regime is between them, which is why the optimum is interior and why sweeping T is worth doing. WHAT THIS PREDICTS about hyperparameter interaction. Because T squared restores the scale, alpha and T become approximately independent knobs - alpha controls the mix between soft and hard supervision, T controls how much of the distribution's tail is exposed. Without the factor they are entangled, so someone tuning both without the correction is searching a badly-conditioned space and will find a result that does not transfer. That is a good example of why a scaling factor that looks cosmetic is worth deriving."
          }
        },
        {
          "q": "Would you distil a large model or train a small one longer?",
          "a": "THEY ARE THE SAME OBJECTIVE BY DIFFERENT ROUTES, which is the first thing to say. Both move cost from serving to training: the inference-aware scaling result says train a smaller model on more raw tokens; distillation says train a smaller model on a larger model's outputs. Both end with a cheap-to-serve model and a large one-time training bill. THE ARGUMENTS FOR DISTILLATION. (1) A RICHER SIGNAL PER TOKEN. The teacher's distribution carries more information than a one-hot next-token target, so each training token does more work. In principle that means fewer tokens for the same quality. (2) YOU MAY ALREADY HAVE THE TEACHER. If the large model exists, its training cost is sunk and only generation remains - which changes the arithmetic entirely. (3) IT WORKS WHERE DATA IS EXHAUSTED. If you are at the data wall, more raw tokens are not available but teacher-generated tokens are, which makes distillation a direct response to the constraint that limits the alternative. (4) VERIFIED GENERATION can produce supervision that does not exist in raw data at all - correct reasoning chains for problems whose solutions were never written down. THE ARGUMENTS FOR TRAINING LONGER ON RAW DATA. (1) NO TEACHER CEILING. A distilled student is bounded by its teacher; a model trained on raw data is bounded only by the data and its own capacity. (2) NO IMITATION LIMIT. Sequence-level imitation transfers style and not capability, and scaling imitation data does not close that gap - so if the student lacks the substrate, generation is the wrong lever and more raw tokens may be the right one. (3) SIMPLICITY - no generation pipeline, no filtering, no teacher to maintain. (4) MODEL-COLLAPSE CONCERNS if a large fraction of training data is model-generated, which is a real risk with evidence behind it. WHAT I WOULD ACTUALLY DO, and the honest answer is both. The strong recipes combine them: pretrain on raw data at a compute-optimal-or-beyond token count, then use VERIFIED teacher generation for post-training on the capabilities where a verifier exists. That puts raw data where it is irreplaceable - broad knowledge - and distillation where it is uniquely good - specific capabilities with checkable outputs. THE COMPARISON I WOULD RUN if forced to choose. Fit a scaling curve for the student on raw data and measure the distilled student at matched compute, on CHECKABLE tasks rather than preference. And I would attend to the failure signature: if the distilled student matches on style and not on checkable performance, that is the imitation limit and more generation will not help - which is a diagnosis the preference-based comparison cannot produce."
        },
        {
          "q": "Explain the different types of distillation.",
          "a": "THREE FAMILIES, distinguished by WHAT is being matched. (1) RESPONSE OR LOGIT-BASED, which is the classical form. Match the teacher's output distribution, softened by temperature. Simplest, needs only the teacher's outputs, and it is what people mean by distillation unqualified. Its limitation is that it supervises only the final layer - the student is free to reach the same answer by any internal route, which is fine for capacity-matched students and less so when the student is much smaller. (2) FEATURE-BASED, which matches INTERMEDIATE representations. FitNets introduced this: pick layers in the teacher and student, add a projection to reconcile their dimensions, and penalize the difference. It supervises the internal computation rather than just the output, which gives a much denser signal and helps when the student is deep enough to have comparable structure. The difficulties are real: which layers to pair is a design choice with no principled answer, the projection adds parameters used only during training, and the representations may be in genuinely different bases so matching them exactly is over-constraining. (3) RELATION-BASED, which matches the RELATIONSHIPS between examples rather than the examples themselves - the pairwise distances or angles in the representation space. The argument is that what matters is the geometry, not the coordinates, so requiring the student to reproduce the teacher's similarity structure is a weaker and more appropriate constraint than requiring identical activations. This side-steps the different-bases problem. FOR LANGUAGE MODELS SPECIFICALLY, the axis that matters more is TOKEN-LEVEL versus SEQUENCE-LEVEL. Token-level matches the next-token distribution at every position - the highest-information signal, and it requires the teacher's full vocabulary logits per position, which is a very large tensor and is simply unavailable if the teacher is an API. Sequence-level generates text from the teacher and trains on it with ordinary cross-entropy: far cheaper, needs only samples, and is what almost everyone does. The trade is information density against practicality, and sequence-level is where the imitation limit bites. THE VARIANTS WORTH KNOWING BEYOND THAT. SELF-DISTILLATION, where teacher and student are the same architecture - which improves results for reasons that are still debated and is a genuinely odd result. ONLINE or MUTUAL distillation, where several models train together and teach each other, removing the need for a pretrained teacher. And DISTILLATION DURING PRETRAINING rather than after, which some recent large-model recipes use. WHICH I WOULD CHOOSE. For language models, sequence-level with VERIFICATION where the task is checkable, because that is what has been shown to transfer capability. Token-level if I control the teacher and can afford the logits, because the signal is strictly richer. Feature-based when the student is much smaller and needs the internal guidance, accepting the layer-pairing design cost. And I would always evaluate on checkable tasks rather than preference, since the choice of distillation type does not change the fact that preference judging measures style.",
          "deepDive": {
            "q": "Why does self-distillation - teaching a model of identical architecture - improve results at all?",
            "a": "IT IS GENUINELY ODD, and worth taking seriously because the obvious explanations do not work. The student has the same capacity as the teacher and is trained on the same data, so no capacity argument applies and no information is being compressed. Yet the student frequently outperforms the teacher, and repeating the procedure gives further gains for a few rounds before plateauing. THE EXPLANATIONS THAT HAVE BEEN OFFERED, and I would present them as candidates rather than a settled account. (1) LABEL SMOOTHING AND REGULARIZATION. The teacher's soft distribution is a smoothed version of the hard label, and smoothing is a known regularizer. This explains part of the effect and it is not the whole story, because self-distillation typically beats plain label smoothing. (2) THE DARK KNOWLEDGE IS REAL EVEN FROM AN EQUAL MODEL. The teacher's relative confidences encode genuine information about class similarity that the hard labels do not - and that information came from the teacher's own training, so it is a way of feeding the model's learned structure back as supervision. The student gets the labels PLUS a summary of what the teacher learned about their relationships. (3) A MULTI-VIEW ARGUMENT. One account holds that data has multiple predictive features per class, that a single model learns a random subset of them, and that distillation transfers the teacher's subset to the student in addition to whatever the student would have learned - so the student ends with a union. This predicts diminishing returns over rounds, which is observed, and it is the most satisfying account I know of. (4) AN IMPLICIT ENSEMBLE EFFECT. The teacher's distribution reflects an average over its training trajectory in some sense, so the student is fitting something smoother than any single snapshot. (5) OPTIMIZATION. The soft targets may simply present an easier loss landscape - a smoother objective that the student descends more effectively than the sharp one-hot objective. WHAT THE PHENOMENON IMPLIES PRACTICALLY. Self-distillation is a cheap and reliable few-percent improvement in the classification setting, it requires no additional data and no larger model, and it plateaus after a few rounds. In the language-model setting the analogous practice is training on your own model's VERIFIED outputs, which is a different mechanism - there the filter is doing the work, selecting the model's correct trajectories - and conflating the two is a mistake worth avoiding. WHY I WOULD FLAG THE UNCERTAINTY. This is one of the places where a reliable empirical result outruns its explanation, and several plausible mechanisms are consistent with the evidence. I would rather say that clearly than pick one and present it as established - and I would note that the multi-view account makes the sharpest testable prediction, which is the right reason to prefer it if forced to choose."
          }
        },
        {
          "q": "When does distillation fail?",
          "a": "FIVE FAILURE MODES, and the first is the one that matters most for language models. (1) THE STUDENT LACKS THE SUBSTRATE. Sequence-level imitation transfers surface behaviour and only transfers capability where the student can already represent the underlying computation. The decisive evidence is that scaling the imitation DATA did not close the capability gap while scaling the STUDENT did - which localizes the bottleneck to capacity rather than teaching. The practical signature is a model that sounds like the teacher and is confidently wrong more often, because it learned the teacher's register including its confidence, which was calibrated to competence the student does not have. (2) THE EVALUATION CANNOT SEE THE FAILURE. Preference judging on short comparisons largely measures style, so it rates an imitation as competitive when nothing has transferred. This is not really a failure of distillation but a failure to detect one, and it is why I would insist on checkable tasks. (3) THE CAPACITY GAP IS TOO LARGE. Distilling a very large teacher into a very small student degrades sharply rather than gracefully - there is a floor below which the function simply is not representable. Reasoning distillation in particular falls off at small scale, and the usual response is an intermediate teaching assistant model to bridge the gap in stages. (4) THE TASK IS NOT CHECKABLE. Verified imitation is what made reasoning distillation work, and it requires a verifier. Where nothing can be checked - open-ended writing, judgement, tone - you are back to plain imitation with its limits, and the honest expectation is style transfer. (5) IMPLEMENTATION ERRORS THAT SILENTLY DISABLE IT. The KL reduction dividing by the vocabulary size, the missing T squared, a temperature that is too low to expose anything. Each produces a run that trains fine and distils almost nothing, and none raises an error. THE SIXTH ONE I WOULD RAISE AS A CONCERN RATHER THAN A FINDING. Training extensively on model-generated data risks distribution narrowing - the student inherits the teacher's modes and loses the tails, and iterating that across generations is the model-collapse concern. The evidence suggests it is a real risk when synthetic data dominates and much less of one when it supplements real data, so the mitigation is to keep real data in the mixture rather than to avoid synthetic entirely. HOW I WOULD DIAGNOSE which failure I have. Run the pass-at-k test on the STUDENT: if it solves a problem at k = 50 but not k = 1, the capability is present and distillation taught selection - a real gain. If it fails at large k, the substrate is absent and no amount of teacher data will help. That single experiment separates the capacity failure from the teaching failure, and it is the same diagnostic that separates style from capability in the fine-tuning setting."
        },
        {
          "q": "How does distillation fit this module's two-regime framing?",
          "a": "IT IS THE EXPLICIT CROSS-REGIME TECHNIQUE, and that is the cleanest way to place it. THE TRADE. You spend TRAINING-regime resources - the teacher's training compute if it does not already exist, plus the generation compute to produce the supervision - and you receive an INFERENCE-regime saving: a model with fewer parameters, which in the bandwidth-bound decode regime means fewer bytes read per token, which means a higher servable batch, which means lower cost per token, forever. The break-even is a straightforward comparison and at any substantial serving volume the inference side dominates easily. WHY THAT MATTERS STRUCTURALLY. Most techniques in this module live in one regime. Scaling laws and data pipelines are training-side. Quantization, grouped-query attention and speculative decoding are inference-side. Distillation is one of the few that deliberately moves cost across the boundary, which makes it a natural companion to the inference-aware scaling objective - both are answers to the same question of how to buy a cheap-to-serve model with expensive-to-buy training. THE COMPARISON THAT FOLLOWS. Given a serving target, you can reach it by training a small model longer on raw data or by distilling a large one, and the choice is empirical. The scaling-law route has no teacher ceiling and no imitation limit; the distillation route has a richer per-token signal and works when raw data is exhausted. In practice strong recipes use both: raw data for broad knowledge, verified teacher generation for specific checkable capabilities. THE COMPOSITION WITH THE OTHER INFERENCE TECHNIQUES. Distillation reduces the parameter COUNT; quantization reduces the bytes PER parameter; both reduce bytes read per token and they compose multiplicatively. Speculative decoding is different in kind - it amortizes the read over more tokens rather than shrinking it - and it composes with both. So the inference toolkit has three distinct mechanisms against one bottleneck, and knowing that they attack the same quantity by different means is what lets you predict that they stack. THE OBSERVATION I WOULD END ON. The reason distillation has become central to how capable small models are produced is exactly the inference-aware argument: serving cost is paid forever and training cost is paid once, so any technique that shifts work across that boundary is favourable at scale. That is a systems argument, not a modelling one, and it explains why the most capable small models are distilled rather than trained from scratch - which looks surprising until you price the two regimes separately."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The distillation loss",
        "back": "L = alpha * T^2 * KL(softmax(z_t/T) || softmax(z_s/T)) + (1-alpha) * CE(z_s, y). Soften BOTH, use reduction='batchmean', and do NOT omit the T^2."
      },
      {
        "type": "intuition",
        "front": "Why T^2 is necessary, not cosmetic",
        "back": "The softened gradient scales as 1/T^2 - one factor from the chain rule on z/T, one because (p - q) itself shrinks like 1/T as the softmax linearizes. Without it, RAISING the temperature WEAKENS the signal, which inverts the expectation and is confusing."
      },
      {
        "type": "pitfall",
        "front": "kl_div reduction='mean' silently kills distillation",
        "back": "It averages over EVERY element INCLUDING the class dimension, so the loss is divided by the VOCABULARY SIZE - thousands of times too small. Use 'batchmean'. This and the missing T^2 are why distillation 'does nothing'."
      },
      {
        "type": "definition",
        "front": "Dark knowledge",
        "back": "The teacher's relative probabilities on the WRONG classes, encoding which classes it considers similar. A one-hot label carries none of it. This is why a student on soft targets can beat the same student on the hard labels the teacher learned from."
      },
      {
        "type": "intuition",
        "front": "Distillation helps most in the LOW-DATA regime",
        "back": "The advantage is more INFORMATION PER EXAMPLE - a distribution instead of an index. So the benefit shrinks as labelled data becomes abundant, and it is largest when examples are scarce."
      },
      {
        "type": "intuition",
        "front": "Token-level vs sequence-level KD",
        "back": "TOKEN-LEVEL matches the next-token distribution at every position - richest signal, needs the teacher's FULL vocabulary logits (unavailable behind an API). SEQUENCE-LEVEL generates text and trains with ordinary CE - cheap, and where the imitation limit bites."
      },
      {
        "type": "pitfall",
        "front": "The imitation limit",
        "back": "Sequence-level imitation transfers STYLE reliably, CAPABILITY only where the student has the substrate. Decisive detail: scaling the imitation DATA did not close the gap while scaling the STUDENT did - so the bottleneck is capacity, not teaching."
      },
      {
        "type": "intuition",
        "front": "VERIFIED imitation is different in kind",
        "back": "Sample many candidates, CHECK the answers, train only on correct ones. The target becomes the teacher's CORRECT-ANSWER distribution, selecting trajectories by OUTCOME rather than reproducing a surface. Rejection sampling - closer to RL with a sparse verifier than to cloning."
      },
      {
        "type": "pitfall",
        "front": "Never evaluate a distilled model by preference",
        "back": "Short preference comparisons largely measure STYLE - exactly what imitation transfers - so the instrument is structurally unable to distinguish a capability gain from a surface one. Use CHECKABLE tasks."
      },
      {
        "type": "intuition",
        "front": "The pass-at-k diagnostic for distillation",
        "back": "If the STUDENT solves a problem at k=50 but not k=1, the capability is present and distillation taught SELECTION - a real gain. If it fails at large k, the substrate is ABSENT and no amount of teacher data will help."
      },
      {
        "type": "formula",
        "front": "Distillation's regime trade",
        "back": "(C_teacher + C_generation), paid ONCE, versus 2*(N_big - N_small)*D_inference, saved on EVERY token FOREVER. The explicit cross-regime technique - and the same objective as inference-aware scaling, reached by a different route."
      },
      {
        "type": "intuition",
        "front": "Three mechanisms, one bottleneck",
        "back": "Decode is bandwidth-bound. DISTILLATION cuts the parameter COUNT; QUANTIZATION cuts bytes PER parameter (they compose multiplicatively); SPECULATIVE DECODING amortizes the read over MORE TOKENS. Different means, same quantity - which is why they stack."
      }
    ],
    "refs": [
      {
        "title": "Hinton, Vinyals & Dean (2015), Distilling the Knowledge in a Neural Network",
        "url": "https://arxiv.org/abs/1503.02531"
      },
      {
        "title": "Kim & Rush (2016), Sequence-Level Knowledge Distillation",
        "url": "https://arxiv.org/abs/1606.07947"
      },
      {
        "title": "Sanh et al. (2019), DistilBERT, a distilled version of BERT",
        "url": "https://arxiv.org/abs/1910.01108"
      },
      {
        "title": "Gudibande et al. (2023), The False Promise of Imitating Proprietary LLMs",
        "url": "https://arxiv.org/abs/2305.15717"
      },
      {
        "title": "Gu et al. (2023), MiniLLM: Knowledge Distillation of Large Language Models",
        "url": "https://arxiv.org/abs/2306.08543"
      }
    ],
    "demos": [
      "distillation",
      "model-cascade",
      "pruning",
      "quantization"
    ]
  },
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
  },
  "speculative-decoding": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This technique is unintelligible without the module's central fact and obvious with it. Generating one token requires READING every weight in the model and the entire KV cache to perform one token's worth of arithmetic - arithmetic intensity of about one, against hardware whose ratio of compute to bandwidth is in the hundreds. So the accelerator is idle almost the whole time, waiting on memory. And crucially, a forward pass over k tokens costs almost exactly what a forward pass over one token costs, because you read the same weights either way and the extra arithmetic is free capacity you were not using.",
        "That is the entire opportunity. If you can GUESS the next k tokens cheaply and VERIFY them in a single forward pass of the big model, the verification is nearly free and any tokens you guessed correctly are pure profit. The standard construction uses a small DRAFT model - the same family, much smaller - to generate k tokens autoregressively, which is cheap because the draft is small, and then runs the target model once over all of them to check.",
        "The part that makes it more than a heuristic is that it is EXACT. With the right acceptance rule - accept token i with probability equal to the ratio of the target's probability to the draft's, capped at one, and on rejection sample from the normalized positive residual between the two distributions - the sequence produced has EXACTLY the target model's distribution. Not approximately: the same distribution, provably. So you are not trading quality for speed, which is unusual and is why the technique was adopted so quickly. What you are trading is compute you were not using anyway, and the honest caveat is that this stops being true at large batch, where you are already compute-bound and the free capacity has been spent - which makes speculation a latency technique more than a throughput one."
      ],
      "math": [
        {
          "h": "Why k tokens cost the same as one",
          "paras": [
            "The forward pass reads the parameters once regardless of how many positions it processes. With one position the arithmetic is negligible against that read; with k positions it is k times negligible.",
            "So the cost is flat in k until k grows large enough that the arithmetic starts to matter - which for the small k speculation uses, it does not."
          ],
          "tex": "t(k) \\approx \\max\\!\\Big(\\underbrace{\\tfrac{2P}{\\beta_{\\text{mem}}}}_{\\text{read the weights}},\\; \\underbrace{\\tfrac{2Pk}{P_{\\text{peak}}}}_{\\text{arithmetic}}\\Big) \\;\\approx\\; t(1) \\quad \\text{for } k \\ll \\tfrac{P_{\\text{peak}}}{\\beta_{\\text{mem}}}",
          "texNote": "The crossover is at k of order the hardware's FLOP-to-bandwidth ratio, which is in the hundreds - so for the k of four to eight that speculation uses, verification of k tokens genuinely costs about one token's time. This is the same fact that makes batching effective, applied along the sequence dimension instead of the batch dimension."
        },
        {
          "h": "The acceptance rule, and why the output is exact",
          "paras": [
            "Accept the draft's token with probability equal to the ratio of target to draft probability, capped at one. If rejected, resample from the difference between the two distributions, clipped at zero and renormalized.",
            "That construction is modified rejection sampling, and it makes the resulting token's distribution exactly the target's - which is the property that makes this lossless rather than an approximation."
          ],
          "tex": "\\text{accept } x \\text{ w.p. } \\min\\!\\Big(1, \\tfrac{p(x)}{q(x)}\\Big); \\;\\text{else draw from}\\; p'(x) = \\frac{\\max\\big(0,\\, p(x)-q(x)\\big)}{\\sum_{x'} \\max\\big(0,\\, p(x')-q(x')\\big)}",
          "texNote": "p is the target, q is the draft. The proof is a short case analysis: summing the probability of accepting x with the probability of rejecting and then drawing x from the residual gives exactly p(x). Note that the draft's quality affects only the ACCEPTANCE RATE and never the output distribution - a terrible draft makes the technique slow, never wrong, which is a very forgiving property."
        },
        {
          "h": "Expected tokens per step, and the speedup",
          "paras": [
            "With per-token acceptance probability alpha, the run of accepted tokens is geometric and truncated at k, plus one token always produced by the target itself.",
            "The speedup is that expected yield divided by the cost of one target pass plus k draft passes."
          ],
          "tex": "\\mathbb{E}[\\text{tokens}] = \\frac{1 - \\alpha^{k+1}}{1 - \\alpha}, \\qquad \\text{speedup} \\approx \\frac{\\mathbb{E}[\\text{tokens}]}{1 + k\\,c}, \\quad c = \\tfrac{t_{\\text{draft}}}{t_{\\text{target}}}",
          "texNote": "Read the trade in k: larger k raises the ceiling on tokens per step and costs more draft passes, so there is an interior optimum that depends on alpha and on the draft-to-target cost ratio. At alpha around 0.8 and a draft costing a twentieth of the target, k of four to six is typically near-optimal and yields something like a two-to-three-fold speedup - and note the yield saturates as alpha^(k+1) vanishes, so pushing k further only adds draft cost."
        }
      ],
      "code": [
        {
          "h": "The draft-verify loop, with the acceptance rule that makes it exact",
          "paras": [
            "The whole algorithm. The rejection branch is the part that must be right - a simpler rule that merely accepts on argmax match would change the output distribution and forfeit the technique's main property."
          ],
          "code": "def speculative_step(target, draft, ctx, k=5):\n    # 1. DRAFT k tokens autoregressively. Cheap - the draft is small.\n    drafted, q_probs = [], []\n    cur = ctx\n    for _ in range(k):\n        q = draft(cur).softmax(-1)\n        x = torch.multinomial(q, 1)\n        drafted.append(x); q_probs.append(q[x])\n        cur = torch.cat([cur, x])\n\n    # 2. VERIFY all k in ONE target forward pass. This costs about what ONE\n    #    token costs, because the pass is BANDWIDTH-bound: you read the same\n    #    weights whether you score 1 position or k.\n    p_all = target(torch.cat([ctx] + drafted)).softmax(-1)   # k+1 distributions\n\n    # 3. ACCEPT / REJECT, left to right.\n    accepted = []\n    for i, x in enumerate(drafted):\n        p, q = p_all[i][x], q_probs[i]\n        if torch.rand(1) < min(1.0, p / q):\n            accepted.append(x)                    # accept and continue\n        else:\n            # REJECT: resample from the normalized POSITIVE RESIDUAL.\n            resid = (p_all[i] - q_dist[i]).clamp(min=0)\n            accepted.append(torch.multinomial(resid / resid.sum(), 1))\n            return accepted                       # stop - the rest are invalid\n\n    # 4. All k accepted -> the target's own next token is FREE, since its\n    #    distribution at position k+1 was already computed in the same pass.\n    accepted.append(torch.multinomial(p_all[k], 1))\n    return accepted\n\n# THE EXACTNESS PROPERTY: P(output = x) works out to exactly p(x) - accept x\n# with probability min(1, p/q) times q(x), plus reject-then-draw-x-from-residual.\n# So the DRAFT'S QUALITY AFFECTS ONLY THE SPEED, never the distribution. A bad\n# draft makes this slow; it can never make it wrong. Unusually forgiving.\n#\n# THE COMMON WRONG IMPLEMENTATION: accepting when the draft's argmax equals the\n# target's argmax. Simple, and it CHANGES THE OUTPUT DISTRIBUTION - you have\n# silently switched to greedy-ish decoding and forfeited the property that made\n# the technique worth using.",
          "caption": "The rejection branch is what makes this lossless: resampling from the positive residual rather than from the target directly is what makes the total probability come out to exactly p(x). Accepting on argmax match is simpler and quietly changes what you are sampling from."
        },
        {
          "h": "What determines the speedup, and when it stops working",
          "paras": [
            "The acceptance rate is everything, and the batch-size interaction is the caveat that decides whether this belongs in your serving stack at all."
          ],
          "code": "# EXPECTED TOKENS PER STEP = (1 - alpha^(k+1)) / (1 - alpha)\n#   alpha = 0.6, k = 5  ->  ~2.3 tokens/step\n#   alpha = 0.8, k = 5  ->  ~3.4\n#   alpha = 0.9, k = 5  ->  ~4.1     (saturating - larger k adds little)\n# SPEEDUP ~ E[tokens] / (1 + k * draft_cost_ratio)\n\n# WHAT RAISES ALPHA - it is all about draft-target agreement:\n#   SAME FAMILY and SAME TOKENIZER          <- essential; a mismatched\n#                                              tokenizer makes this unworkable\n#   draft ~10-20x smaller                   <- big enough to agree, small\n#                                              enough to be cheap\n#   draft trained/distilled ON the target   <- the strongest single lever\n#   easy, predictable text                  <- alpha varies enormously by\n#                                              content: boilerplate and code\n#                                              accept far better than novel prose\n\n# ---- THE HONEST CAVEAT: THE BATCH INTERACTION ----\n# Speculation spends SPARE COMPUTE. At batch 1 there is a great deal of it and\n# the extra tokens are nearly free. As batch size grows, arithmetic intensity\n# rises toward compute-bound and the spare capacity DISAPPEARS - the verify\n# pass now genuinely costs k times as much, and the draft passes cost real time.\n#\n#   small batch (interactive)  -> large speedup; this is a LATENCY technique\n#   large batch (throughput)   -> gains shrink and can go NEGATIVE\n#\n# So it is not a throughput technique, and a serving system may reasonably\n# enable it under low load and disable it under high load.\n\n# VARIANTS THAT REMOVE THE SEPARATE DRAFT MODEL:\n#   MEDUSA        extra heads on the target predicting several future tokens,\n#                 verified as a tree - no second model to serve or align\n#   EAGLE         draft at the FEATURE level rather than the token level, which\n#                 raises alpha substantially for a small extra head\n#   LOOKAHEAD     n-gram guesses from the generation so far - no draft at all\n#   PROMPT LOOKUP copy candidate continuations FROM THE PROMPT. Free, trivial,\n#                 and very effective for summarization, editing and RAG, where\n#                 the output overlaps the input heavily.",
          "caption": "Prompt lookup is worth knowing because it costs nothing: when the output overlaps the input - summarization, editing, retrieval-augmented answering - copying candidate spans from the prompt gives a high acceptance rate with no draft model at all."
        }
      ],
      "useCases": [
        "Interactive serving at low batch size, where latency is the metric and the accelerator has abundant spare arithmetic - the regime this technique was designed for and where the gains are largest.",
        "Summarization, editing and retrieval-augmented generation, where the output overlaps the input heavily and prompt lookup gives a high acceptance rate with no draft model and no additional memory.",
        "Code completion, where the text is highly predictable and a small draft agrees with the target often, pushing the acceptance rate and therefore the speedup well above the general-text case.",
        "Any deployment where a small model of the same family already exists, since draft-target agreement is the dominant factor and a same-family, same-tokenizer draft is most of the work."
      ],
      "pitfalls": [
        "Accepting when the draft and target argmaxes agree. It is the obvious simplification and it changes the output distribution - you have silently switched to a different decoding scheme and forfeited the exactness that justified the technique.",
        "Resampling from the target on rejection rather than from the positive residual. That also breaks exactness; the residual construction is precisely what makes the total probability come out to the target's.",
        "Using a draft with a different tokenizer. The verification compares distributions over the same vocabulary, so a mismatch makes the scheme unworkable rather than merely inefficient. Same family and same tokenizer is close to a precondition.",
        "Expecting a throughput gain at high batch. Speculation spends spare arithmetic, and at large batch you are already compute-bound so there is none - the gains shrink and can turn negative. It is a latency technique.",
        "Tuning k upward indefinitely. Expected tokens saturate as the acceptance rate to the k-th power vanishes, so beyond the knee you are paying more draft passes for almost nothing. The optimum is interior and depends on the acceptance rate.",
        "Ignoring the draft's memory cost. A second model must be resident, which competes with the KV cache for the memory that determines your batch size - so the technique's benefit has to be weighed against a smaller servable batch.",
        "Measuring the speedup on easy text only. The acceptance rate varies enormously with content - boilerplate and code accept far better than novel prose - so a benchmark on predictable text overstates what production will see."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Where the bandwidth-bound argument is established. Speculative decoding is unintelligible without it and obvious with it: a k-token forward pass costs what a one-token pass costs because the weight read dominates either way."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The other attack on the same bottleneck. Quantization reduces bytes read per token; speculation amortizes the read over more tokens. Orthogonal mechanisms, and they compose."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "Where a good draft model comes from. Draft-target agreement is what determines the acceptance rate, and distilling the draft from the target is the strongest single lever on it."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Where the batch-size interaction is resolved operationally - continuous batching, paged attention and admission control decide the batch, and the batch decides whether speculation is helping or hurting."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "The cache complication: rejected tokens' entries must be discarded and the cache truncated to the accepted prefix, which is straightforward with paged allocation and fiddly without it."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does speculative decoding work at all?",
          "a": "Decoding is memory-bandwidth-bound, so a forward pass over k tokens costs about what a pass over one token costs - you read the same weights either way."
        },
        {
          "q": "What is the algorithm?",
          "a": "A small draft model generates k tokens autoregressively, the target model scores all of them in one pass, and you accept the longest valid prefix."
        },
        {
          "q": "What is the acceptance rule?",
          "a": "Accept the drafted token with probability min(1, target probability over draft probability); on rejection, sample from the normalized positive residual between the distributions."
        },
        {
          "q": "Why is the output exact?",
          "a": "The accept-or-resample-from-residual construction is modified rejection sampling, so the resulting token's distribution is exactly the target's - not an approximation."
        },
        {
          "q": "What does a bad draft model cost you?",
          "a": "Speed only. Draft quality affects the acceptance rate and never the output distribution, so a poor draft makes it slow and can never make it wrong."
        },
        {
          "q": "What is the common wrong implementation?",
          "a": "Accepting when the draft and target argmaxes agree. Simpler, and it changes the output distribution - you have silently switched to a different decoding scheme."
        },
        {
          "q": "What is the expected tokens per step?",
          "a": "(1 - alpha^(k+1)) / (1 - alpha) for per-token acceptance probability alpha. At alpha 0.8 and k 5 that is about 3.4 tokens."
        },
        {
          "q": "What raises the acceptance rate?",
          "a": "Draft-target agreement: same family, same tokenizer, a draft ten to twenty times smaller, and ideally one distilled from the target."
        },
        {
          "q": "Why does speculation stop helping at large batch?",
          "a": "It spends spare arithmetic, and at large batch you are already compute-bound with none spare - so the gains shrink and can turn negative. It is a latency technique."
        },
        {
          "q": "Why is there an optimal k?",
          "a": "Expected tokens saturate as alpha to the k-th power vanishes, while each additional draft token costs a draft pass. So the yield plateaus and the cost does not."
        },
        {
          "q": "What is prompt lookup decoding?",
          "a": "Drafting by copying candidate continuations from the prompt. Free, needs no model, and very effective where the output overlaps the input - summarization, editing, RAG."
        },
        {
          "q": "What is Medusa?",
          "a": "Extra prediction heads on the target model itself, guessing several future tokens and verified as a tree - removing the need for a separate draft model to serve and align."
        }
      ],
      "standard": [
        {
          "q": "Explain speculative decoding and prove that it is exact.",
          "a": "THE PREMISE, which makes the whole thing legible. Autoregressive decoding is MEMORY-BANDWIDTH-BOUND: producing one token requires reading every weight and the entire KV cache, to do one token's worth of arithmetic. Arithmetic intensity is about one against hardware ratios in the hundreds, so the accelerator is mostly idle. And the consequence that matters: a forward pass over k positions costs about what a pass over one position costs, because the weight read dominates and the extra arithmetic uses capacity you were not using. THE ALGORITHM. A small DRAFT model generates k tokens autoregressively - cheap, because it is small. The TARGET model then scores all k+1 positions in a SINGLE forward pass, which costs roughly one token's time. Then you walk the drafted tokens left to right and accept or reject each. THE ACCEPTANCE RULE. For a drafted token x with target probability p(x) and draft probability q(x): accept with probability min(1, p(x)/q(x)). If rejected, stop and sample the replacement from the normalized POSITIVE RESIDUAL, max(0, p - q) divided by its sum - then discard the remaining drafted tokens. If all k are accepted, the target's own distribution at position k+1 was already computed in the same pass, so that token is free too. THE EXACTNESS PROOF, which is short. Consider the probability that the final token is x. Two disjoint routes. FIRST, the draft proposed x and it was accepted: probability q(x) times min(1, p(x)/q(x)), which equals min(q(x), p(x)). SECOND, the draft proposed something else and it was rejected, and then x was drawn from the residual. The total rejection probability is the sum over y of q(y) times (1 - min(1, p(y)/q(y))), which simplifies to the sum over y of max(0, q(y) - p(y)) - and that equals the residual's normalizer, since the two distributions both sum to one so the positive and negative discrepancies are equal in total mass. Multiplying by the residual's probability of x, max(0, p(x) - q(x)) over that normalizer, gives simply max(0, p(x) - q(x)). Adding the two routes: min(q, p) plus max(0, p - q) equals p, in both cases - if p is less than q the first term is p and the second is zero; if p exceeds q the first is q and the second is p - q. So the total is exactly p(x). THE CONSEQUENCE, which is the technique's most attractive property: THE DRAFT'S QUALITY AFFECTS ONLY THE SPEED. A poor draft gives a low acceptance rate and therefore a small speedup, and it can never change the output distribution. That is unusually forgiving and it means you can deploy speculation without any quality validation of the draft. THE PERFORMANCE MODEL. Expected tokens per step is (1 - alpha^(k+1))/(1 - alpha), and the speedup is that divided by one plus k times the draft-to-target cost ratio. At an acceptance rate around 0.8 with k of five, that is about 3.4 tokens per target pass, giving a two-to-three-fold speedup in practice. THE CAVEAT I WOULD RAISE UNPROMPTED. This spends SPARE COMPUTE, and spare compute exists only at small batch. As batching pushes you toward compute-bound, the verification genuinely costs k times as much and the draft passes cost real time - so the gain shrinks and can go negative. Speculative decoding is a LATENCY technique, not a throughput one, and a serving system may reasonably enable it under low load and disable it under high load.",
          "deepDive": {
            "q": "How would you choose and build a draft model?",
            "a": "THE OBJECTIVE IS AGREEMENT, NOT QUALITY, and separating those is the key insight. The acceptance rate is determined by how often the draft's distribution resembles the target's, not by how good the draft is in absolute terms. A draft that is excellent but disagrees with the target is worse than a mediocre one that agrees. THE HARD REQUIREMENTS. (1) THE SAME TOKENIZER. Verification compares probabilities over the same vocabulary at the same positions, so a mismatch makes the scheme unworkable rather than merely inefficient. There is work on cross-tokenizer speculation but it is substantially more complicated and lossier. (2) The same context handling and position scheme, so the draft is conditioned equivalently. THE SIZE CHOICE, which is a genuine optimization. The draft's cost enters the speedup as k times the cost ratio, so it must be much smaller - typically ten to twenty times. But smaller drafts agree less, lowering alpha. Since expected tokens rise sublinearly in alpha while cost rises linearly in the draft size, there is an interior optimum, and in practice something in the range of a twentieth to a tenth of the target is where people land. I would sweep it rather than assume. HOW TO GET A GOOD DRAFT, in order of effect. (1) DISTIL IT FROM THE TARGET. This is the strongest single lever, and it is a different objective from ordinary distillation: you are optimizing for AGREEMENT with the target's distribution, which is exactly what token-level KD does. A draft distilled on the target's outputs on production-like prompts will have a much higher acceptance rate than an off-the-shelf small model of the same size. (2) USE THE SAME FAMILY, since a smaller model from the same pretraining run shares the tokenizer, the data distribution and much of the learned structure. Many model families ship small variants precisely for this. (3) TRAIN IT ON THE PRODUCTION PROMPT DISTRIBUTION, because acceptance varies enormously by content and you want agreement where your traffic lives. THE ALTERNATIVES THAT AVOID A SEPARATE MODEL, and they are increasingly the practical answer. MEDUSA adds extra prediction heads to the target itself, each guessing a further-ahead token, verified as a tree of candidates. No second model to serve, align or keep in memory - and that memory matters, since a resident draft competes with the KV cache for the space that determines your batch size. EAGLE drafts at the FEATURE level rather than the token level, predicting the target's next hidden state, which raises the acceptance rate substantially for a small head. LOOKAHEAD generates n-gram candidates from the generation so far with no model at all. And PROMPT LOOKUP simply copies candidate spans from the prompt, which is free and remarkably effective wherever output overlaps input - summarization, editing, retrieval-augmented answering - because in those tasks large stretches of the output are literally present in the input. HOW I WOULD EVALUATE A DRAFT. Measure the acceptance rate on REAL traffic, broken down by request type, because the variance is large - code and boilerplate accept far better than novel prose, and an average over a mixed workload hides that. Then compute the expected speedup from the formula and check it against measured end-to-end latency, since the formula ignores the overhead of the accept-reject bookkeeping and the KV-cache truncation on rejection. If measured falls well short of predicted, that overhead is where to look."
          }
        },
        {
          "q": "Why does speculative decoding interact badly with batching?",
          "a": "BECAUSE IT SPENDS A RESOURCE THAT BATCHING ALSO SPENDS, and once batching has spent it there is none left. THE MECHANISM. At batch one, decoding has arithmetic intensity of about one - you read all the weights to do one token's arithmetic - so the accelerator's arithmetic units are almost entirely idle. Verifying k tokens uses some of that idle capacity, so it is nearly free. That is the whole basis of the technique. Batching raises arithmetic intensity roughly linearly: with b sequences you read the weights once and do b times the arithmetic. Somewhere around a batch in the hundreds, depending on the hardware's FLOP-to-bandwidth ratio, you cross into compute-bound. At that point the arithmetic units are busy, there is no spare capacity, and verifying k tokens genuinely costs about k times as much as verifying one - while the draft passes cost real time on top. THE CONSEQUENCE. The speedup is largest at batch one and decays as batch grows, and past the compute-bound crossover it can go NEGATIVE - you are doing strictly more arithmetic for the same output. So speculative decoding is a LATENCY technique. It reduces time to produce a token for a single request; it does not increase the total tokens per second a server can produce under load, and it can reduce it. THE OPERATIONAL CONSEQUENCE, which is how real systems handle it. Make it load-dependent: enable speculation when the batch is small and disable it when the server is busy. That is a scheduler policy rather than a model configuration, and it recognizes that the technique's value is a function of the current load rather than of the model. Some systems do this dynamically per step. THE SECOND INTERACTION, on memory. The draft model must be RESIDENT, and memory is what bounds the batch size in serving - so the draft is competing for the space that would otherwise hold KV cache for more concurrent requests. A draft that is a twentieth of the target is a modest cost, but it is a cost paid against the quantity that determines throughput. This is a further argument for the draft-free variants - Medusa's extra heads, prompt lookup - which add little or no resident memory. THE THIRD INTERACTION, which is a systems detail. Different sequences in a batch accept different numbers of tokens, so after a speculative step the sequences are at different lengths and the batch becomes ragged. Handling that efficiently requires the scheduler to cope with variable per-step progress, which continuous batching already does but which adds complexity. THE WAY I WOULD FRAME THE DECISION. Ask what your service is optimizing. If it is interactive latency at modest concurrency - a coding assistant, a chat interface with few simultaneous users - speculation is excellent. If it is throughput under heavy load - batch processing, a high-traffic API - it is at best neutral and possibly harmful, and the same engineering effort spent on batching, paged attention and quantization will do more. That is the module's framing applied: know which resource binds before spending anything."
        },
        {
          "q": "What other techniques make LLM inference faster, and how do they relate?",
          "a": "I WOULD ORGANIZE THEM BY WHICH TERM THEY ATTACK, since decoding's constraint is bytes read per generated token and everything is an assault on some part of that. REDUCE BYTES PER PARAMETER: quantization. Four-bit weights are four times fewer bytes to stream, which is a near-proportional decode speedup. Mature, post-hoc, composes with everything. REDUCE THE NUMBER OF PARAMETERS: distillation, and structured pruning. Both require training or fine-tuning and both change the model. REDUCE THE CACHE READ PER TOKEN: grouped-query attention, decided at pretraining time and unchangeable afterwards; KV-cache quantization, which is post-hoc and increasingly important at long context; and cache eviction or sliding-window attention, which bound what is read. AMORTIZE THE READ OVER MORE TOKENS: two ways, and they are the interesting ones. BATCHING amortizes over more SEQUENCES and is the single highest-leverage serving technique - continuous batching, admitting new requests as others finish rather than waiting for a whole batch, is what makes it work with variable-length generation. SPECULATIVE DECODING amortizes over more POSITIONS within one sequence. They spend the same resource, which is why they interact as they do. RECOVER WASTED MEMORY: paged attention, which is not a speedup mechanism directly but removes the fragmentation that was wasting a large share of KV-cache memory - and since memory bounds the batch and the batch bounds throughput, it converts into throughput. It is this curriculum's caching-allocator problem rediscovered one level up, with the same fix operating systems reached: fixed-size pages plus an indirection table. AVOID THE WORK ENTIRELY: prefix caching, so a shared system prompt is prefilled once and reused across requests; semantic caching for repeated queries; and model cascades, routing easy requests to a small model and escalating only when needed. These are often the largest wins available and they are architectural rather than kernel-level. HOW THEY COMPOSE. Quantization, distillation and GQA all reduce bytes and stack multiplicatively. Batching and speculation both amortize and therefore COMPETE - they draw on the same spare capacity. Paged attention enables larger batches, which strengthens batching and weakens speculation. So the composition is not simply additive and the interactions have signs. WHAT I WOULD DO FIRST on a real deployment. Batching with paged attention, because it is the largest single lever and it addresses the throughput metric that usually matters. Then quantization, because it is post-hoc and mature. Then prefix caching if there is a shared prompt, which is often free and substantial. Then speculation, only if the workload is latency-sensitive at low concurrency. That ordering follows from asking which resource binds - which is the same discipline as everywhere in this curriculum, applied to serving.",
          "deepDive": {
            "q": "Explain the prefill and decode distinction and why serving systems separate them.",
            "a": "TWO PHASES WITH OPPOSITE CHARACTERISTICS, in the same request. PREFILL processes the entire prompt at once. All prompt positions go through the model in parallel, so the weights are amortized over the prompt length exactly as training amortizes over batch times sequence. Arithmetic intensity is high, the matmuls are large, and prefill is COMPUTE-BOUND - it behaves like training. Its cost scales with prompt length, and its latency determines TIME TO FIRST TOKEN. DECODE produces one token at a time, each conditioned on everything before it. One position per forward pass, so the weights are read for one token's arithmetic. Arithmetic intensity is about one and decode is MEMORY-BANDWIDTH-BOUND. Its cost scales with the number of generated tokens, and it determines INTER-TOKEN LATENCY. WHY THAT MATTERS OPERATIONALLY - four consequences. (1) THEY HAVE DIFFERENT OPTIMAL BATCH SIZES. Prefill is already compute-bound, so batching it adds little and mainly increases memory pressure. Decode is bandwidth-bound and batching is transformative. A scheduler that batches them identically is wrong for one of them. (2) MIXING THEM IN ONE BATCH IS AWKWARD. A batch containing one prefill of two thousand tokens and thirty decodes of one token each has wildly heterogeneous work per sequence, and the whole batch waits for the prefill. That is why a long prompt arriving mid-stream causes a latency spike for every other in-flight request - a real and commonly-observed production symptom. The fix is CHUNKED PREFILL: split the prompt into pieces and interleave them with decode steps, so no single prefill monopolizes a step. (3) THEY HAVE DIFFERENT SERVICE-LEVEL OBJECTIVES. Time to first token is a prefill metric; inter-token latency is a decode metric. Optimizing one can hurt the other, and a system reporting only end-to-end latency cannot see the trade. Both should be measured and targeted separately. (4) DISAGGREGATED SERVING, which is the logical endpoint: run prefill and decode on SEPARATE hardware pools, sized and configured differently, passing the KV cache between them. Prefill wants compute; decode wants bandwidth and memory. Separating them lets each pool be tuned and scaled independently, and it is increasingly done at scale. THE INTERACTION WITH SPECULATION, since that is this lesson's subject. Speculation applies only to DECODE - prefill is already processing many positions in parallel and is compute-bound, so there is no spare capacity to speculate into. That is a clean statement of when the technique is applicable and it follows directly from the regime distinction. THE INTERACTION WITH CACHING. Prefill's output is the KV cache for the prompt, so if the prompt has a shared prefix - a system prompt, a retrieved document reused across queries - that prefill can be done ONCE and reused. Prefix caching is therefore a prefill optimization specifically, and for workloads with long shared prompts it is often the single largest available win, larger than anything on the decode side. WHY I FIND THIS THE MOST USEFUL FRAME for serving. The two phases have opposite bottlenecks, and almost every serving technique targets exactly one of them. Knowing which phase a technique addresses tells you immediately whether it applies to your workload - a long-prompt short-output workload is prefill-dominated and speculation will do nothing for it, while a short-prompt long-output workload is the reverse."
          }
        },
        {
          "q": "How would you measure whether speculative decoding is helping?",
          "a": "THE METRICS, and the choice matters because the wrong one gives a confident wrong answer. (1) ACCEPTANCE RATE, per position and overall. This is the fundamental quantity - everything else follows from it - and it should be logged continuously, not measured once. Break it down BY REQUEST TYPE, because the variance is large: code and boilerplate accept far better than novel prose, so an average over mixed traffic hides which workloads are benefiting. (2) MEAN TOKENS PER TARGET FORWARD PASS, which is the direct efficiency measure and can be compared against the theoretical (1 - alpha^(k+1))/(1 - alpha). A gap between measured and predicted means the acceptance is position-dependent - later drafted tokens accept less often, because errors compound in the draft's own autoregressive generation - which the geometric model does not capture. (3) END-TO-END LATENCY, which is the thing you actually care about: time to first token and inter-token latency, reported separately, since speculation affects only the second. (4) THROUGHPUT UNDER LOAD, measured at your actual concurrency - because this is where speculation can be NEGATIVE and where a batch-one benchmark is actively misleading. THE MEASUREMENT DESIGN, which is where this goes wrong. Benchmark at YOUR batch size and YOUR request mix, not at batch one on curated prompts. Speculation's benefit is a strong function of both, so a benchmark that fixes them at the favourable end produces a number that will not survive production. I would sweep batch size and plot speedup against it, which shows the crossover directly and tells the scheduler where to switch the feature off. THE CORRECTNESS CHECK, which is separate and should not be skipped despite the exactness proof. Generate with and without speculation from the same seed and compare the output DISTRIBUTIONS - not the exact strings, since the sampling paths differ, but statistics over many generations: mean length, token-frequency distribution, and downstream task performance. The theory says these should match; an implementation bug in the acceptance rule would show as a systematic difference, and the argmax-matching mistake in particular would show as noticeably less diverse output. That is a cheap test for a bug whose symptom is otherwise invisible. WHAT I WOULD TUNE FROM THE MEASUREMENTS. k, against the measured acceptance rate, remembering the yield saturates. The draft size, against the cost ratio. And the load threshold at which to disable it. All three are read off the curves rather than guessed. THE THING I WOULD WATCH FOR IN PRODUCTION. Acceptance rate DRIFTING - if the traffic mix changes, or the target model is updated without updating the draft, agreement falls and the speedup quietly evaporates while the draft's cost remains. That is a slow degradation with no error, so it needs a monitored metric rather than a one-time validation. Pairing a target-model deployment with a draft-model check is the operational discipline that prevents it."
        },
        {
          "q": "How would you choose and obtain a draft model?",
          "a": "THE DRAFT MODEL IS THE ENTIRE DESIGN DECISION, because the speedup is a product of two quantities the draft controls in opposite directions: the ACCEPTANCE RATE, which wants the draft to be as close to the target as possible, and the DRAFT COST, which wants it to be as cheap as possible. Make the draft too weak and few tokens are accepted; make it too strong and you have paid a large fraction of the target's cost to save it. THE RULE OF THUMB is a draft roughly an order of magnitude smaller than the target - a 7B target with a 1B or smaller draft, or a 70B target with a 7B draft. At that ratio the draft's forward pass is small relative to the target's, so even a moderate acceptance rate wins. THE OPTIONS, in increasing order of effort. (1) A SMALLER MODEL FROM THE SAME FAMILY, trained on the same data with the same tokenizer. This is the easiest and often the best, because acceptance depends on distributional agreement and same-family models agree. THE TOKENIZER MUST MATCH EXACTLY - the algorithm compares probabilities over a shared vocabulary, so a different tokenizer is not a smaller detail, it is disqualifying. (2) A DISTILLED DRAFT, trained specifically to match the target's output distribution. Distillation's objective is exactly acceptance rate, so this is the principled choice and it measurably raises acceptance over an off-the-shelf small model. It costs a training run. (3) SELF-SPECULATION - use the target itself with layers skipped, or with early-exit, as its own draft. No separate model to maintain and the tokenizer matches by construction. (4) N-GRAM OR RETRIEVAL DRAFTING - no model at all, just propose continuations from the prompt or a cache. Nearly free, and it works surprisingly well on tasks with heavy copying, such as summarization, editing and code completion where much of the output is present in the input. (5) MEDUSA-STYLE MULTIPLE HEADS on the target, predicting several positions ahead. HOW I WOULD ACTUALLY DECIDE. Measure the acceptance rate on REAL traffic for each candidate - it is workload-dependent and the ordering changes by task, with copy-heavy workloads favouring the cheap retrieval approach and open-ended generation favouring a trained draft. Then compute the expected speedup with the draft's cost included and pick the maximum. THE DETAIL PEOPLE MISS: k, the number of speculated tokens, should be TUNED per workload too, and it interacts with acceptance - a high acceptance rate justifies a larger k, while a low one wastes target compute on tokens that will be rejected. The expected accepted length is roughly geometric in the acceptance rate, so k past a few times that expectation buys nothing."
        },
        {
          "q": "Why is this the purest illustration of the module's framing?",
          "a": "BECAUSE THE TECHNIQUE IS UNINTELLIGIBLE WITHOUT THE FRAMING AND OBVIOUS WITH IT, which is a strong test of whether a framing is doing real work. WITHOUT IT, the proposal sounds absurd. You are going to run a SECOND model to guess tokens, then run the big model anyway to check them, and this will be FASTER? That is strictly more computation for the same output. Every instinct trained on compute-bound thinking says this cannot help. WITH IT, it is immediate. Decoding is memory-bandwidth-bound with arithmetic intensity around one: you read every weight to produce one token, and the arithmetic units are idle almost the entire time. A forward pass over k positions costs the same as over one, because the weight read dominates. So the verification is nearly free, the draft is small and therefore cheap, and any correctly-guessed tokens are pure profit. The technique is not doing more work in any sense that costs you - it is using capacity that was being wasted. WHAT THIS DEMONSTRATES ABOUT THE TWO REGIMES. The same operation - a forward pass - has completely different economics depending on regime. In training, processing k times as many positions costs k times as much, because you are compute-bound and the arithmetic is what you pay for. In single-stream decoding it costs the same, because you are bandwidth-bound. Someone carrying training intuition into inference would never invent speculative decoding, and someone with the regime distinction would find it natural. THE PREDICTIONS THE FRAMING MAKES, which is the stronger evidence that it is right. It predicts that speculation helps at SMALL batch and stops helping at large batch - because batching is the other way to raise arithmetic intensity, and once it has been raised there is no spare capacity. That is exactly what is observed. It predicts that speculation is a LATENCY technique rather than a throughput one, which is how serving systems treat it. It predicts that speculation does not apply to PREFILL, since prefill already processes many positions in parallel and is compute-bound. And it predicts that quantization and speculation COMPOSE, since one reduces bytes read and the other amortizes the read - different terms. All four fall out of the framing rather than needing separate discovery. THE GENERAL LESSON I WOULD DRAW. A good systems framing does not merely organize what you already know; it makes techniques derivable and their limits predictable. Knowing that decoding is bandwidth-bound with intensity one lets you estimate decode latency from parameter count and memory bandwidth, predict which optimizations will help, and recognize when someone's proposal is a training-regime intuition misapplied. That is worth more than any individual technique in this module."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why speculative decoding works at all",
        "back": "Decode is BANDWIDTH-bound (intensity ~1), so a forward pass over k positions costs about what a pass over ONE costs - you read the same weights either way. Verification is nearly free; correctly-guessed tokens are pure profit."
      },
      {
        "type": "formula",
        "front": "The acceptance rule",
        "back": "Accept drafted x with probability min(1, p(x)/q(x)) where p = target, q = draft. On REJECTION, sample from the normalized POSITIVE RESIDUAL max(0, p - q), then discard the remaining drafts."
      },
      {
        "type": "formula",
        "front": "Why the output is EXACT",
        "back": "P(x) = min(q,p) [accepted] + max(0, p-q) [rejected then drawn from residual] = p(x), in both cases. So the DRAFT'S QUALITY AFFECTS ONLY SPEED - a bad draft is slow, never wrong. Unusually forgiving."
      },
      {
        "type": "pitfall",
        "front": "The common wrong implementation",
        "back": "Accepting when draft and target ARGMAXES agree. Simpler, and it CHANGES the output distribution - you have silently switched to a different decoding scheme and forfeited exactness. Same for resampling from p rather than the residual."
      },
      {
        "type": "formula",
        "front": "Expected tokens per step",
        "back": "(1 - alpha^(k+1))/(1 - alpha). alpha=0.8, k=5 -> ~3.4 tokens. Speedup ~ that / (1 + k*draft_cost_ratio). The yield SATURATES as alpha^(k+1) vanishes, so there is an interior optimal k."
      },
      {
        "type": "intuition",
        "front": "The objective for a draft is AGREEMENT, not quality",
        "back": "Acceptance depends on how often the draft's distribution resembles the target's. An excellent draft that disagrees is worse than a mediocre one that agrees. Same tokenizer is a PRECONDITION; distilling the draft FROM the target is the strongest lever."
      },
      {
        "type": "pitfall",
        "front": "Speculation is a LATENCY technique, not throughput",
        "back": "It spends SPARE arithmetic, which exists only at small batch. Batching raises intensity toward compute-bound, and past the crossover verification genuinely costs k times as much - gains shrink and can go NEGATIVE. Make it load-dependent."
      },
      {
        "type": "intuition",
        "front": "The draft competes for the memory that sets your batch",
        "back": "A resident draft model occupies space that would otherwise hold KV cache - and cache bounds concurrent sequences, which bounds throughput. A further argument for the draft-FREE variants."
      },
      {
        "type": "definition",
        "front": "The draft-free variants",
        "back": "MEDUSA: extra heads on the target predicting several future tokens, verified as a tree. EAGLE: draft at the FEATURE level, raising alpha for a small head. LOOKAHEAD: n-gram guesses, no model. PROMPT LOOKUP: copy spans FROM THE PROMPT - free, and excellent for summarization/editing/RAG."
      },
      {
        "type": "intuition",
        "front": "Prefill vs decode have OPPOSITE bottlenecks",
        "back": "PREFILL processes all prompt positions in parallel - COMPUTE-bound, like training, sets time-to-first-token. DECODE is one position at a time - BANDWIDTH-bound, sets inter-token latency. Speculation applies only to DECODE. Chunked prefill stops a long prompt stalling every in-flight request."
      },
      {
        "type": "intuition",
        "front": "Batching and speculation COMPETE",
        "back": "Both amortize the weight read - batching over more SEQUENCES, speculation over more POSITIONS. They draw on the same spare capacity, so their composition has a NEGATIVE sign. Quantization is orthogonal (bytes per parameter) and composes cleanly."
      },
      {
        "type": "pitfall",
        "front": "Watch for acceptance-rate DRIFT",
        "back": "If the traffic mix changes, or the target is updated without updating the draft, agreement falls - the speedup evaporates while the draft's cost remains. Slow degradation, no error. Pair every target deployment with a draft check."
      }
    ],
    "refs": [
      {
        "title": "Leviathan, Kalman & Matias (2023), Fast Inference from Transformers via Speculative Decoding",
        "url": "https://arxiv.org/abs/2211.17192"
      },
      {
        "title": "Chen et al. (2023), Accelerating Large Language Model Decoding with Speculative Sampling",
        "url": "https://arxiv.org/abs/2302.01318"
      },
      {
        "title": "Cai et al. (2024), Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads",
        "url": "https://arxiv.org/abs/2401.10774"
      },
      {
        "title": "Li et al. (2024), EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty",
        "url": "https://arxiv.org/abs/2401.15077"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention",
        "url": "https://arxiv.org/abs/2309.06180"
      }
    ],
    "demos": [
      "speculative-decoding",
      "kv-cache",
      "paged-attention",
      "batching"
    ]
  },
  "structured-output": {
    "level": "core",
    "body": {
      "intuition": [
        "A program consuming a model's output needs it to parse. Prompting for JSON works most of the time, and most of the time is a failure rate - at scale, a percent of malformed responses is a percent of your requests erroring, and the failures cluster on exactly the long or unusual inputs you care about. There are three levels of answer: ask nicely and retry, fine-tune the format in, or make invalid output IMPOSSIBLE by masking the logits at every decoding step so that only tokens which can continue a valid string are available.",
        "Constrained decoding is the guaranteed one and the mechanism is simple: maintain a parser state, compute the set of tokens that could legally come next, set every other logit to negative infinity, sample. The engineering difficulty is a mismatch - the grammar is defined over CHARACTERS and decoding happens over TOKENS, so a single token may span a legal boundary or advance the parser through several states. Efficient implementations precompute, for each parser state, the set of allowed tokens, which turns a per-step parse into a table lookup and is what makes the technique fast enough to use.",
        "And then the caveat that makes this lesson worth having rather than a recipe. Masking guarantees the FORM and can damage the CONTENT. When you zero out tokens the model wanted and renormalize over what remains, you are not sampling the model's conditional distribution given that the output will be valid - you are sampling a different, restricted distribution, and you can force the model down a path it assigned low probability, which puts it off-distribution for everything that follows. The evidence is genuinely mixed: some studies report constrained decoding degrading reasoning tasks, others attribute much of that to the prompt formatting rather than the constraint. My reading is that the mechanism is real, the magnitude is task-dependent, and the reliable mitigation is structural - let the model reason in free text first and constrain only the final answer, which gets you both properties."
      ],
      "math": [
        {
          "h": "Masking is not conditioning",
          "paras": [
            "Constrained decoding renormalizes the distribution over the allowed tokens at each step. That is a per-step restriction, and it is not the same object as conditioning the whole sequence on being valid.",
            "The difference is that a greedy per-step restriction can commit you to a prefix from which the valid continuations are all poor, which conditioning on the full sequence would have avoided."
          ],
          "tex": "p_{\\text{masked}}(x_t \\mid x_{<t}) = \\frac{p(x_t \\mid x_{<t})\\,\\mathbb{1}[x_t \\in A_t]}{\\sum_{x \\in A_t} p(x \\mid x_{<t})} \\;\\;\\neq\\;\\; p\\big(x_t \\mid x_{<t},\\, \\text{sequence valid}\\big)",
          "texNote": "The right-hand side would require knowing which prefixes lead to good valid completions - a lookahead the greedy mask does not perform. So the technique can force a token the model assigned very low probability, and everything generated afterwards is conditioned on a prefix the model considers unlikely, which is exactly the off-distribution regime where quality degrades."
        },
        {
          "h": "The token-character mismatch",
          "paras": [
            "The grammar accepts strings of characters; the decoder emits tokens, which are multi-character and may straddle grammatical boundaries. So the allowed-token set for a parser state must be computed by asking which tokens keep the parse alive.",
            "Precomputing that map per state is what turns an expensive per-step parse into a lookup."
          ],
          "tex": "A(s) = \\{\\, \\tau \\in V : \\delta^{*}(s, \\mathrm{chars}(\\tau)) \\neq \\varnothing \\,\\}",
          "texNote": "For each parser state s, run the automaton's transition function over each token's characters and keep the tokens that do not lead to a dead end. With a vocabulary of a hundred thousand and many states this is expensive to do naively and cheap once cached - which is the core engineering contribution of the practical libraries. Note it also means the constraint is tokenizer-dependent: the same grammar gives different allowed sets under a different tokenization."
        },
        {
          "h": "Validity and correctness are different measurements",
          "paras": [
            "Constraining guarantees that the output parses. It says nothing about whether the values are right, and conflating the two is the standard evaluation error here.",
            "The interesting quantity is correctness conditional on validity, because that is what the constraint might be damaging."
          ],
          "tex": "\\Pr[\\text{valid}] \\;=\\; 1 \\;\\text{ by construction}, \\qquad \\Pr[\\text{correct}] = \\Pr[\\text{correct} \\mid \\text{valid}] \\cdot \\underbrace{\\Pr[\\text{valid}]}_{=1}",
          "texNote": "So the only number that moved is the conditional, and it is the one to measure. Comparing a constrained system against an unconstrained one on end-to-end success conflates the validity gain with any correctness loss - the honest comparison reports both terms separately, and on the unconstrained side you must decide whether an unparseable response counts as incorrect or is excluded."
        }
      ],
      "code": [
        {
          "h": "Logit masking, and the precomputation that makes it fast",
          "paras": [
            "The mechanism is four lines. The cost is in computing the allowed set, which is why the practical libraries precompute it per parser state."
          ],
          "code": "def constrained_step(logits, parser_state, allowed_cache):\n    allowed = allowed_cache[parser_state]           # precomputed token id set\n    mask = torch.full_like(logits, float(\"-inf\"))\n    mask[allowed] = 0.0\n    return logits + mask                            # invalid tokens: p = 0\n\n# BUILDING THE CACHE - the actual engineering. The grammar is over CHARACTERS,\n# decoding is over TOKENS, and a token may span a grammatical boundary or\n# advance the parser through several states:\ndef allowed_tokens(state, automaton, vocab):\n    out = []\n    for tok_id, tok_str in vocab.items():\n        s = state\n        for ch in tok_str:\n            s = automaton.step(s, ch)\n            if s is DEAD: break\n        else:\n            out.append(tok_id)                       # the whole token survives\n    return out\n#   Naive, this is |V| x |token| work PER STEP with a 100k vocabulary. Cached\n#   per parser state it is a lookup - which is the core contribution of the\n#   practical libraries and what makes the technique usable.\n#   NOTE it is TOKENIZER-DEPENDENT: the same grammar gives different allowed\n#   sets under a different tokenization.\n\n# WHAT YOU CAN CONSTRAIN, by grammar power:\n#   REGEX / finite automaton  -> dates, enums, identifiers, fixed formats\n#   JSON SCHEMA -> pushdown   -> nesting requires a stack (matched braces)\n#   full CFG                  -> SQL, code, arbitrary structured languages\n#\n# WHAT A GRAMMAR CANNOT ENFORCE, and this is the boundary worth knowing:\n#   - that a number is in a valid RANGE for the field's meaning\n#   - that an id REFERS to something that exists\n#   - that the values are TRUE\n# Grammar gives you syntax. Semantics still needs validation after parsing.",
          "caption": "The masking is trivial; the allowed-token computation is the engineering. And the boundary at the bottom is the one people misjudge - a grammar guarantees the output parses and cannot make it correct."
        },
        {
          "h": "The two-phase pattern, and how to evaluate honestly",
          "paras": [
            "The reliable mitigation for the quality concern, and the evaluation that separates the two things constraining affects."
          ],
          "code": "# THE PROBLEM: masking can force a token the model gave low probability, and\n# everything after is conditioned on a prefix the model considers unlikely -\n# off-distribution, which is where quality degrades. The evidence on how much\n# is MIXED: some studies report degraded reasoning under format constraints,\n# others attribute much of it to the PROMPT formatting rather than the\n# constraint itself. The mechanism is real; the magnitude is task-dependent.\n\n# THE FIX THAT SIDESTEPS THE ARGUMENT - two phases, one call:\n#   PHASE 1: generate reasoning FREELY, no constraint\n#   PHASE 2: constrain only the final structured answer\nout = model.generate(prompt + \"Think step by step, then answer in JSON.\\n\")\n#   ... free text reasoning ...\n#   then switch the constraint ON at the delimiter:\nout += model.generate(out, grammar=json_schema_grammar)\n#   The model reasons in the distribution it was trained on, and only the\n#   short final span is constrained - where there is little left to get wrong.\n#   This is the standard mitigation and it works.\n\n# ---- EVALUATION: measure BOTH things, separately ----\nmetrics = {\n  \"parse_rate\":       fraction_that_parse(outputs),        # 1.0 if constrained\n  \"schema_valid\":     fraction_matching_schema(outputs),   # types, required\n  \"semantically_ok\":  fraction_correct(outputs),           # <- THE REAL ONE\n  \"correct_given_valid\": correct_and_valid / valid,        # what the constraint\n                                                            # might have damaged\n}\n# CONSTRAINING SETS parse_rate TO 1 BY CONSTRUCTION. That is not a result - it\n# is the definition. The only number that can move is semantic correctness, so\n# an evaluation reporting only validity has measured nothing about the trade.\n#\n# AND ON THE UNCONSTRAINED SIDE, decide explicitly whether an unparseable\n# response counts as INCORRECT or is EXCLUDED - the two give very different\n# comparisons and the choice is usually left implicit.",
          "caption": "Reporting a parse rate of 100% under constrained decoding is reporting the definition, not a finding. The only number that can move is correctness given validity, and the two-phase pattern is what protects it."
        }
      ],
      "useCases": [
        "Any programmatic consumer of model output - extraction into a database, populating a UI, driving a workflow - where a percent of unparseable responses is a percent of your requests erroring, concentrated on the unusual inputs.",
        "Tool and function calling, where the model must emit a call with a valid name and arguments matching that tool's schema, and where an invalid call is an exception rather than a degraded answer.",
        "Generating code or queries in a formal language, where a full context-free grammar can guarantee syntactic validity - though not that the query does what was asked.",
        "Classification and enumerated outputs, where constraining to the label set removes an entire class of parsing and normalization work and costs essentially nothing, since there is no reasoning to disturb."
      ],
      "pitfalls": [
        "Reporting a parse rate of 100% as a result. Constrained decoding sets it to one by construction - that is the definition, not a finding. The only quantity that can move is semantic correctness given validity, and that is what should be measured.",
        "Assuming a valid output is a correct one. A grammar guarantees syntax: it cannot enforce that a number is in a sensible range, that an identifier refers to something real, or that the values are true. Semantic validation after parsing is still required.",
        "Constraining the whole generation on a reasoning task. Masking can force a low-probability token, putting everything after it off-distribution. Let the model reason freely and constrain only the final answer - the two-phase pattern gets both properties.",
        "Treating the quality concern as settled in either direction. Some studies report format constraints degrading reasoning; others attribute much of that to prompt formatting rather than the constraint. The mechanism is real and the magnitude is task-dependent, so measure it on your task.",
        "Forgetting that the constraint is tokenizer-dependent. The allowed-token set is computed by running each token's characters through the automaton, so the same grammar behaves differently under a different tokenization - and a cache built for one tokenizer is wrong for another.",
        "Computing the allowed set per step naively. With a hundred-thousand-token vocabulary that is expensive enough to dominate decoding; the practical libraries precompute it per parser state, turning it into a lookup.",
        "Comparing against an unconstrained baseline without stating how unparseable responses are scored. Counting them as incorrect and excluding them give very different comparisons, and the choice is usually left implicit."
      ],
      "connections": [
        {
          "ref": "agentic-ai/tool-calling",
          "text": "The application that makes this load-bearing: an agent's tool call must parse and must match the tool's schema, and an invalid call is an exception in a loop rather than a degraded sentence."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The alternative level of the answer. Fine-tuning teaches format conventions reliably - it is what SFT is unambiguously good at - and it reduces the failure rate without guaranteeing anything, which is why the two are complementary rather than competing."
        },
        {
          "ref": "rnn-nlp/text-generation",
          "text": "Where the decoding machinery this modifies is developed. Constrained decoding is a mask applied to the logits before whatever sampling strategy you were already using, so it composes with temperature, top-p and beam search."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "The same idea applied to content rather than form. Both constrain what the model may emit, and both face the same question of whether restricting the distribution degrades what remains."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Why the evaluation design matters here specifically: constraining moves one metric to its ceiling by construction, so an evaluation that reports it has measured the definition rather than the effect."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is constrained decoding?",
          "a": "Masking the logits at every step so only tokens that can continue a valid string under a grammar are available, making invalid output impossible rather than unlikely."
        },
        {
          "q": "What are the three levels of answer for structured output?",
          "a": "Prompt and retry, fine-tune the format in, or constrain the decoding. Only the third guarantees validity."
        },
        {
          "q": "Why is masking not the same as conditioning?",
          "a": "It restricts per step and renormalizes, without lookahead. So it can commit to a prefix from which all valid completions are poor - which conditioning on the whole sequence would avoid."
        },
        {
          "q": "What is the token-character mismatch?",
          "a": "Grammars accept characters and decoders emit tokens, which are multi-character and may straddle grammatical boundaries. The allowed set must be computed by running each token's characters through the automaton."
        },
        {
          "q": "Why precompute the allowed-token sets?",
          "a": "Computing them per step over a hundred-thousand-token vocabulary would dominate decoding. Cached per parser state it becomes a lookup, which is what makes the technique practical."
        },
        {
          "q": "Is the constraint tokenizer-dependent?",
          "a": "Yes. The allowed sets are derived from token strings, so the same grammar behaves differently under a different tokenization and a cache built for one is wrong for another."
        },
        {
          "q": "What grammar power does JSON schema need?",
          "a": "A pushdown automaton, because nesting requires a stack to match braces. Regular expressions suffice for flat formats; a full CFG is needed for languages like SQL."
        },
        {
          "q": "What can a grammar not enforce?",
          "a": "Semantics: that a number is in a sensible range, that an identifier refers to something real, or that the values are true. It guarantees syntax only."
        },
        {
          "q": "Why can constraining degrade quality?",
          "a": "Masking can force a token the model gave low probability, so everything after is conditioned on a prefix it considers unlikely - off-distribution, where quality degrades."
        },
        {
          "q": "What is the two-phase pattern?",
          "a": "Generate reasoning freely with no constraint, then constrain only the final structured answer - so the model reasons in its own distribution and only a short span is restricted."
        },
        {
          "q": "Why is a 100% parse rate not a result?",
          "a": "Constrained decoding sets it to one by construction. That is the definition of the technique, and the only quantity that can move is correctness given validity."
        },
        {
          "q": "What is the state of evidence on quality degradation?",
          "a": "Mixed. Some studies report format constraints hurting reasoning; others attribute much of it to prompt formatting rather than the constraint. The mechanism is real and the magnitude is task-dependent."
        }
      ],
      "standard": [
        {
          "q": "How would you guarantee that a model's output matches a schema?",
          "a": "THERE ARE THREE LEVELS AND THEY ARE COMPLEMENTARY, so I would describe the ladder rather than pick one. LEVEL 1: PROMPT AND VALIDATE. Ask for the format, parse the result, retry on failure with the error message appended. Simple, no infrastructure, works with any provider. Its problem is that it works MOST of the time, and most of the time is a failure rate - at scale a percent of malformed responses is a percent of requests erroring, concentrated on the long or unusual inputs, which are the ones you care about. Retries also cost latency and money, and a persistent failure loops. LEVEL 2: FINE-TUNE THE FORMAT IN. This is what supervised fine-tuning is unambiguously good at - surface conventions transfer reliably, which is exactly the finding from the instruction-tuning literature. It substantially reduces the failure rate and guarantees nothing, so it is a complement rather than a substitute. LEVEL 3: CONSTRAINED DECODING, which is the guarantee. At each step, maintain a parser state, compute the set of tokens that could continue a valid string, set every other logit to negative infinity, and sample from what remains. Invalid output becomes impossible rather than unlikely. THE ENGINEERING, which is the interesting part. The grammar is defined over CHARACTERS and decoding happens over TOKENS, which are multi-character and may straddle grammatical boundaries or advance the parser through several states. So the allowed-token set for a parser state has to be computed by running each token's characters through the automaton and keeping the ones that do not hit a dead end. Done naively per step over a large vocabulary that dominates decoding; precomputed per parser state it is a table lookup, and that caching is the core contribution of the practical libraries. Note it makes the constraint tokenizer-dependent, so a cache is not portable across tokenizations. GRAMMAR POWER, by what you need: a regular expression or finite automaton for flat formats, dates and enums; a pushdown automaton for JSON, because nesting needs a stack to match braces; a full context-free grammar for SQL or code. THE CAVEAT I WOULD RAISE UNPROMPTED, because it is what separates understanding this from using it. Masking is NOT conditioning. Renormalizing over the allowed tokens at each step, greedily and without lookahead, is a different object from the model's conditional distribution given that the whole output will be valid. It can force a token the model assigned very low probability, and everything generated afterwards is conditioned on a prefix the model considers unlikely - which is off-distribution and is where quality degrades. The evidence on magnitude is genuinely mixed: some studies report format constraints hurting reasoning tasks, others attribute much of that to the prompt formatting rather than the constraint. My reading is that the mechanism is real and the size is task-dependent. THE MITIGATION THAT SIDESTEPS THE ARGUMENT: two phases. Let the model reason in free text with no constraint, then constrain only the final structured answer. The reasoning happens in the distribution the model was trained on, and the constrained span is short and has little left to get wrong. That is the standard pattern and I would use it by default on anything requiring reasoning. AND THE THING TO REMEMBER ABOUT VALIDATION: a grammar guarantees syntax and cannot enforce semantics - that a number is in range, that an identifier exists, that the values are true. Post-parse validation is still required.",
          "deepDive": {
            "q": "Explain precisely how masking differs from conditioning, and construct a case where it hurts.",
            "a": "THE TWO OBJECTS. What we WANT is p(x | prefix, the full sequence will be valid) - the model's belief about the next token given that the completed output satisfies the grammar. What masking COMPUTES is p(x | prefix) restricted to the tokens that keep the parse alive right now, renormalized. Those differ because the first involves a lookahead over all completions and the second is greedy. A CONSTRUCTED CASE. Suppose the schema requires a field whose value is one of two enums, and the model's belief is that neither applies well but one continuation would let it express uncertainty in a later free-text field while the other would not. The correct conditional would account for what each choice makes possible downstream. The greedy mask cannot: it picks between the two on their immediate probabilities, and may commit to the branch from which every valid completion is poor. A SIMPLER AND MORE COMMON CASE. The model wants to begin with a brief clarification - 'Based on the document, ' - before the JSON. Under a constraint requiring the output to start with an opening brace, that token is masked to zero probability and the model emits the brace instead, having assigned it low probability. Everything after is now conditioned on a prefix that, from the model's perspective, is unusual - and the standard finding about off-distribution prefixes is that quality degrades. This is the mechanism, and it is why the effect is most visible on tasks where the model would naturally reason before answering. THE FORMAL STATEMENT of what would be correct. You would need, for each candidate token, the total probability mass of valid completions following it - a quantity requiring you to marginalize over all continuations, which is intractable for anything but a trivial grammar. So the greedy mask is an approximation nobody knows how to remove cheaply, and that is worth stating plainly rather than treating the technique as exact. WHAT MITIGATES IT, in order of practicality. (1) THE TWO-PHASE PATTERN, which sidesteps the problem for the case that matters most - reasoning - by constraining only a short final span where there is little left to get wrong. (2) A MORE PERMISSIVE GRAMMAR: allow leading whitespace, allow an optional preamble field, allow the model's natural phrasings where the schema does not care. Every unnecessary restriction is an opportunity to force a low-probability token. (3) BEAM SEARCH OR SAMPLING WITH RESTARTS under the constraint, which recovers some lookahead at a cost. (4) FINE-TUNING ON THE FORMAT, so the model's unconstrained distribution already puts mass where the grammar allows - at which point the mask rarely binds and the whole concern evaporates. That last one is the most satisfying answer: the constraint hurts in proportion to how often it actually fires, and a model trained on the format triggers it seldom. HOW I WOULD MEASURE IT on my own task. Log the KL divergence between the masked and unmasked distributions at each step, or more simply the probability mass the model assigned to the tokens that were masked away. If that mass is consistently near zero the constraint is inert and there is nothing to worry about; if it is frequently large, the constraint is doing real work to the distribution and the quality question is live. That single measurement turns an unresolved literature debate into a fact about your deployment, and it is a few lines."
          }
        },
        {
          "q": "How does function calling work, and what makes it hard?",
          "a": "THE MECHANICS. You give the model a set of tool definitions - a name, a description, and a JSON schema for the arguments - and it emits a call: which tool, with what arguments. Structurally it is two problems: a SELECTION problem, choosing among tools or choosing to answer directly, and a GENERATION problem, producing arguments matching that tool's schema. Constrained decoding handles the second cleanly, since once the tool is chosen its schema is a grammar. THE SELECTION PROBLEM IS THE HARDER ONE and it gets less attention. It is effectively classification over the tool set plus a null option, driven only by the tool descriptions and the user's request. It degrades in predictable ways: with many tools, since the descriptions compete for attention and the model's discrimination falls; with SIMILAR tools, where two overlapping descriptions are genuinely ambiguous; and at the boundary of when to call anything at all, where models tend toward over-calling because the tools are salient in the context. The practical responses are to keep the tool set small per request - retrieving a relevant subset rather than presenting all of them - to write descriptions that state when NOT to use the tool as well as when to, and to make the descriptions maximally distinguishing rather than maximally complete. WHAT MAKES ARGUMENT GENERATION HARD BEYOND SYNTAX. A grammar guarantees the JSON parses and the types match. It cannot enforce that the identifier refers to a real record, that a date is in a plausible range, that units are right, or that the value answers the user's question. Those are semantic and they need post-parse validation with a clear error path back to the model. In my experience the failure distribution is heavily weighted toward valid-but-wrong once constrained decoding is in place, which is exactly what the validity-versus-correctness distinction predicts. THE MULTI-CALL COMPLICATIONS. Parallel calls - emitting several independent calls in one turn - need a grammar admitting a list and a runtime that can execute them concurrently, and they raise the question of what to do when one fails. Sequential calls, where the second depends on the first's result, are an agent loop rather than a single generation and belong to that machinery. And in either case results must be fed back in a format the model was trained to consume, which is a template question that is easy to get subtly wrong. THE EVALUATION I WOULD RUN, which mirrors the validity-correctness split. Tool selection accuracy, including the decision not to call. Argument validity, which constrained decoding sets to one. Argument SEMANTIC correctness, which is the number that matters. And end-to-end task success, which is the only one a user experiences. Reporting only the first two is the common mistake and it describes a system that reliably calls the right tool with well-formed nonsense. THE DESIGN POINT I WOULD MAKE. Constrained decoding solves the syntactic half completely and cheaply, which is genuinely valuable because it removes a whole class of production errors. It leaves the two hard parts - which tool, and are the arguments right - exactly where they were, and those are where the engineering effort should go once the syntax is guaranteed."
        },
        {
          "q": "How would you evaluate a structured-output system?",
          "a": "THE CENTRAL DISCIPLINE IS SEPARATING VALIDITY FROM CORRECTNESS, because constrained decoding moves the first to its ceiling by construction and can only affect the second. THE METRICS, in layers. (1) PARSE RATE - does the output parse at all. Under constrained decoding this is one, by definition. Reporting it as a result is reporting the definition of the technique, which is a surprisingly common error in write-ups. (2) SCHEMA VALIDITY - do the types match, are required fields present, are enums from the allowed set. A grammar covers most of this, and if you are not constraining, this is the meaningful reliability number. (3) SEMANTIC CORRECTNESS - are the values right. This is the metric that matters and it is the only one that can move when you introduce a constraint. (4) CORRECTNESS GIVEN VALIDITY - the conditional, which isolates what the constraint might have damaged from what it fixed. (5) END-TO-END TASK SUCCESS, which is what a user experiences and which folds in everything downstream. THE COMPARISON DESIGN, which is where this usually goes wrong. Comparing constrained against unconstrained requires deciding how to score an unparseable response on the unconstrained side. Counting it as incorrect makes the constrained system look better by exactly the parse-rate gain. Excluding it makes the unconstrained system look better, because you have discarded its failures. Both are defensible and they give different answers, so the choice must be stated - and the honest report gives both numbers, or better, reports parse rate and conditional correctness separately so the reader can combine them however they wish. WHAT ELSE I WOULD MEASURE. The MASKED PROBABILITY MASS - how much probability the model assigned to tokens the constraint removed, per step. If that is consistently near zero the constraint is inert and the quality concern is moot for your task; if it is frequently large, the constraint is materially reshaping the distribution and the correctness comparison deserves attention. This turns an unresolved debate in the literature into a measured fact about your deployment, and it is a few lines. Also: latency, since constrained decoding adds per-step work even when cached, and the retry-based alternative adds whole extra generations. THE TEST SET DESIGN. Include the cases where format failures actually occur, which are the long inputs, the unusual ones, the ones with characters that need escaping, and the ones where the correct answer is empty or null. A test set of well-behaved examples shows a high parse rate for both approaches and measures nothing - the whole value of constraining is on the tail, so the evaluation has to contain the tail. AND FOR REASONING TASKS SPECIFICALLY, evaluate the two-phase pattern as a third arm alongside fully-constrained and unconstrained. If it matches unconstrained on correctness and constrained on validity - which is what it is designed to do and usually achieves - that is the answer and the fully-constrained arm was a false choice.",
          "deepDive": {
            "q": "The literature disagrees about whether constrained decoding degrades quality. How would you resolve it for your own system?",
            "a": "I WOULD TREAT IT AS A MEASURABLE PROPERTY OF MY DEPLOYMENT rather than a question with a universal answer, because the mechanism is clear and its magnitude obviously depends on the task and the model. WHY THE LITERATURE DISAGREES, which is worth understanding before designing the experiment. The studies reporting degradation typically compare free-form generation against fully-constrained generation on reasoning benchmarks. The rebuttals argue that much of the observed gap comes from the PROMPT changing - asking for JSON alters the instruction, and the model may reason less because it was told to produce a compact structured answer, not because tokens were masked. That is a genuine confound: the constraint and the instruction were varied together. So a large part of the disagreement is about experimental design rather than about the mechanism, which means my experiment has to separate them. THE EXPERIMENT I WOULD RUN, four arms, holding everything else fixed. (A) FREE-FORM with a natural prompt - the baseline for reasoning quality. (B) SAME PROMPT AS (A), asking for reasoning then a JSON answer, with NO constraint - this isolates the prompt effect. (C) SAME PROMPT AS (B), WITH the constraint applied throughout - this isolates the masking effect, since (B) and (C) differ only in the mask. (D) TWO-PHASE: same prompt, constraint applied only to the final answer span. Comparing (A) to (B) measures the prompt's effect. Comparing (B) to (C) measures the constraint's effect, which is the actual question. And (D) tells you whether the mitigation works. Without arm (B) you cannot separate the two, which is precisely the flaw in much of the published comparison. THE DIRECT MEASUREMENT that supplements the experiment. Log, at each constrained step, the probability mass the model assigned to the tokens that were masked away. This is the mechanism made visible: if that mass is near zero throughout, the constraint is inert - the model was going to produce valid output anyway - and no quality effect is possible. If it is frequently large, the constraint is actively redirecting generation and the effect is plausible. I find this more informative than the benchmark comparison because it explains rather than merely detects, and it localizes WHERE in the output the constraint binds. WHAT I WOULD EXPECT TO FIND, stated in advance so the experiment is falsifiable. On extraction and classification tasks, where there is no reasoning to disturb and the model's natural output is already close to the schema, essentially no degradation - the masked mass should be tiny. On multi-step reasoning with the constraint applied throughout, a real degradation, because the model is prevented from thinking in text. And the two-phase arm matching free-form on correctness while retaining perfect validity. If that pattern holds, the practical conclusion is simple: constrain freely on extraction, use two phases on anything requiring reasoning, and stop worrying about the debate. THE BROADER METHODOLOGICAL POINT. A disagreement in the literature that turns on a confound is resolved by an experiment that breaks the confound, not by weighing the papers. And a mechanism you can measure directly - the masked probability mass - beats an outcome comparison, because it tells you whether the mechanism is even active in your case. That is the same discipline as everywhere in this curriculum: measure the thing, not a downstream consequence of it."
          }
        },
        {
          "q": "When would you not use constrained decoding?",
          "a": "FOUR CASES, and naming them is what distinguishes understanding the technique from applying it reflexively. (1) WHEN THE OUTPUT IS PROSE. If a human reads the result, there is no schema to enforce and constraining buys nothing while risking the quality effect. This is obvious and it is worth stating because the tooling makes it easy to constrain things that did not need it. (2) DURING REASONING. Masking can force low-probability tokens and put the model off-distribution for everything after, and reasoning is where that costs most. The two-phase pattern - reason freely, constrain the answer - is strictly better than constraining throughout, so the case for full constraint on a reasoning task is weak. (3) WHEN THE PROVIDER DOES NOT EXPOSE LOGITS. Constrained decoding requires modifying the distribution at each step, which needs logit access or a provider-side implementation. With a hosted API that offers only a schema-conformance mode you are using their implementation, and with one that offers neither you are back to prompt-and-retry. This is a practical constraint that decides the matter more often than the theoretical arguments do. (4) WHEN THE FAILURE RATE IS ALREADY ACCEPTABLE AND THE COST IS NOT. Constrained decoding adds per-step work, requires grammar infrastructure, ties you to a tokenizer, and adds a component that can itself be wrong. If a fine-tuned model produces valid JSON 99.9% of the time and a retry handles the rest, the marginal value of a guarantee may not justify the machinery - though I would note the guarantee is worth more than the rate suggests when failures cluster on important inputs. THE ALTERNATIVES WORTH CONSIDERING FIRST. FINE-TUNING on the format, which is what SFT is best at and which reduces the failure rate substantially - and has the additional benefit of making any constraint you later add rarely bind, which removes the quality concern. PROMPT-AND-RETRY with the parse error fed back, which is simple and often sufficient. And SIMPLIFYING THE SCHEMA, which is under-used: a flat schema with short field names and no deep nesting is far easier for a model to produce correctly than an elaborate one, and much of the reliability problem is self-inflicted by schema design. WHERE I WOULD ALWAYS USE IT. Enumerated outputs and classification, where constraining to the label set is free - there is no reasoning to disturb and it removes an entire class of normalization work. And tool-call arguments once the tool is selected, where the schema is known and an invalid call is an exception in a loop. Those two are close to unconditional. THE FRAMING I WOULD OFFER. Constrained decoding solves one problem completely - syntactic validity - and its cost is a possible distributional effect whose size depends on how often the mask actually binds. So the question is not whether to use it but where, and the answer follows from where the mask would fire and whether reasoning is happening there."
        },
        {
          "q": "How would you design the schema itself?",
          "a": "THE SCHEMA IS PART OF THE PROMPT, which is the point people miss. Constrained decoding forces the output into the schema's shape, so whatever the schema makes easy to express is what you will get - a badly designed schema produces valid, useless output and the parse rate will not tell you. THE DESIGN RULES I WOULD APPLY. (1) MAKE THE FIELD NAMES DESCRIPTIVE. The model conditions on them, so `estimated_delivery_date` elicits better values than `d2`. This is free and it measurably matters. (2) PREFER ENUMS OVER FREE STRINGS wherever the value set is closed. An enum turns a generation problem into a selection problem, the grammar enforces it exactly, and downstream code stops needing normalization. This is the single highest-value schema decision. (3) ORDER THE FIELDS SO REASONING COMES FIRST. Generation is left-to-right and every field conditions on the ones before it, so a `reasoning` or `evidence` field placed before `answer` gives the model somewhere to compute; the same field placed after is decoration, because the answer is already committed. This is the two-phase idea expressed inside a single schema and it costs one line. (4) MAKE ABSENCE AND UNCERTAINTY EXPRESSIBLE. If the schema requires a value the model does not have, the constraint guarantees it will invent one - the grammar leaves no other legal path. So include nullable fields, an explicit `unknown` enum member, or a `confidence` field. THE ALTERNATIVE IS NOT ABSTENTION, IT IS FABRICATION, which is a direct consequence of masking rather than a model failing. (5) KEEP NESTING SHALLOW. Deep nesting costs stack depth in the parser, costs tokens, and gives more places for the model to lose track. Flat structures with enums outperform elaborate hierarchies in my experience. (6) AVOID CONSTRAINTS THE GRAMMAR CANNOT EXPRESS. A regex can enforce a date's SHAPE but not that it is in the future or that February has fewer than thirty days. Anything cross-field or semantic is validation, not grammar, and it belongs in code after parsing. THE PROCESS. Draft the schema, run it unconstrained first to see what the model naturally produces - that tells you where the schema fights the model - then constrain. And treat a schema change as invalidating your evaluation, because it changes the task."
        },
        {
          "q": "How does this lesson relate to the module's framing?",
          "a": "IT SITS SLIGHTLY APART FROM THE TWO-REGIME SPINE, and being honest about that is more useful than forcing it. Most of this module is about compute-bound training and bandwidth-bound inference. Structured output is not primarily a resource question - it is a CORRECTNESS-AND-INTERFACE question about what the model is allowed to emit. WHERE IT DOES CONNECT, and there are three genuine links. (1) IT IS AN INFERENCE-TIME INTERVENTION, applied in the decode loop, so it inherits that loop's economics. It adds per-step work - even cached, there is a mask to apply - and any technique operating per token is charged on every token forever, which is the inference regime's characteristic cost structure. The two-phase pattern is partly motivated by that: constrain a short span rather than the whole generation. (2) IT INTERACTS WITH THE DECODE PATH's other techniques. Masking composes with temperature and top-p because it applies before them. It interacts awkwardly with speculative decoding, since the draft must also respect the grammar or its proposals are wasted - and a draft that does not know the constraint has a much lower acceptance rate wherever the mask binds, which is a real and under-discussed interaction. And it has to survive batching, since different sequences in a batch are at different parser states, which means the allowed-set lookup is per sequence. (3) IT IS AN ALTERNATIVE TO SPENDING TRAINING COMPUTE. Fine-tuning the format in is a training-regime answer; constrained decoding is an inference-regime answer to the same requirement. That is the same cross-regime choice as distillation - pay once in training or pay per request at inference - and the analysis has the same shape: fine-tuning costs a run and makes the constraint rarely bind; constraining costs per-token work forever and guarantees the outcome. Doing both is usually right, and knowing they are substitutes for one requirement clarifies why. WHERE ITS OWN FRAMING IS BETTER. The distinction this lesson actually turns on is VALIDITY versus CORRECTNESS - the constraint moves one to its ceiling by construction and can only affect the other. That is the evaluation discipline the lesson exists to teach, and it is closer to the curriculum's recurring theme about measurement than to the resource framing. So I would present it as the module's interface lesson: everything else here is about making the model cheaper to train or serve, and this is about making its output usable by a program - which is a different kind of requirement that the module would be incomplete without."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Constrained decoding",
        "back": "At each step, maintain a parser state, compute the tokens that could continue a valid string, set every other logit to -inf, sample. Invalid output becomes IMPOSSIBLE rather than unlikely. The three levels: prompt+retry, fine-tune the format, constrain."
      },
      {
        "type": "formula",
        "front": "Masking is NOT conditioning",
        "back": "p_masked(x_t | x_<t) renormalizes over allowed tokens GREEDILY, with no lookahead. p(x_t | x_<t, sequence valid) would require marginalizing over all completions - intractable. So the mask can commit to a prefix from which every valid completion is poor."
      },
      {
        "type": "intuition",
        "front": "The mechanism by which constraining hurts",
        "back": "It can force a token the model gave LOW probability, so everything after is conditioned on a prefix the model considers unlikely - off-distribution, where quality degrades. Most visible on tasks where the model would naturally reason in text first."
      },
      {
        "type": "definition",
        "front": "The token-character mismatch",
        "back": "Grammars accept CHARACTERS, decoders emit TOKENS (multi-character, may straddle boundaries). A(s) = tokens whose characters keep the parse alive from state s. Naive = |V| x |token| work PER STEP; cached per state = a lookup. Also makes it TOKENIZER-dependent."
      },
      {
        "type": "pitfall",
        "front": "A 100% parse rate is the DEFINITION, not a result",
        "back": "Constraining sets validity to 1 by construction. The only quantity that can MOVE is semantic correctness given validity - so an evaluation reporting only parse rate has measured nothing about the trade."
      },
      {
        "type": "intuition",
        "front": "The two-phase pattern",
        "back": "Reason FREELY with no constraint, then constrain ONLY the final structured answer. The model reasons in the distribution it was trained on and the constrained span is short. Standard mitigation, and it sidesteps the whole quality debate."
      },
      {
        "type": "pitfall",
        "front": "A grammar cannot enforce SEMANTICS",
        "back": "It guarantees the output parses and types match. It cannot enforce that a number is in a sensible RANGE, that an identifier REFERS to something real, or that the values are TRUE. Post-parse validation is still required."
      },
      {
        "type": "intuition",
        "front": "The measurement that settles the quality debate for YOU",
        "back": "Log the PROBABILITY MASS the model assigned to tokens the constraint masked away. Near zero throughout = the constraint is INERT and no quality effect is possible. Frequently large = it is actively redirecting generation. A few lines, and it explains rather than detects."
      },
      {
        "type": "pitfall",
        "front": "The confound in the published comparisons",
        "back": "Studies vary the CONSTRAINT and the PROMPT together - asking for JSON changes the instruction, so the model may reason less because it was told to be compact. The fix is a four-arm design: free-form, JSON-prompted-unconstrained, JSON-prompted-CONSTRAINED, and two-phase."
      },
      {
        "type": "definition",
        "front": "Grammar power by format",
        "back": "REGEX / finite automaton: dates, enums, identifiers, flat formats. PUSHDOWN: JSON, because nesting needs a stack for matched braces. Full CFG: SQL, code, arbitrary structured languages."
      },
      {
        "type": "intuition",
        "front": "Tool calling is TWO problems",
        "back": "SELECTION (which tool, or none - effectively classification, and the harder one) and GENERATION (arguments matching that tool's schema - which constraining solves cleanly). Selection degrades with MANY tools and SIMILAR tools, and models tend to OVER-call."
      },
      {
        "type": "intuition",
        "front": "Fine-tuning makes the constraint rarely bind",
        "back": "If the model's unconstrained distribution already puts mass where the grammar allows, the mask seldom fires and the quality concern evaporates. The two are COMPLEMENTARY - a training-regime and an inference-regime answer to one requirement."
      }
    ],
    "refs": [
      {
        "title": "Willard & Louf (2023), Efficient Guided Generation for Large Language Models (Outlines)",
        "url": "https://arxiv.org/abs/2307.09702"
      },
      {
        "title": "Geng et al. (2023), Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning",
        "url": "https://arxiv.org/abs/2305.13971"
      },
      {
        "title": "Tam et al. (2024), Let Me Speak Freely? A Study on the Impact of Format Restrictions on LLM Performance",
        "url": "https://arxiv.org/abs/2408.02442"
      },
      {
        "title": "Beurer-Kellner et al. (2024), Guiding LLMs The Right Way: Fast, Non-Invasive Constrained Generation",
        "url": "https://arxiv.org/abs/2403.06988"
      },
      {
        "title": "Schick et al. (2023), Toolformer: Language Models Can Teach Themselves to Use Tools",
        "url": "https://arxiv.org/abs/2302.04761"
      }
    ],
    "demos": [
      "constrained-decoding",
      "guardrails",
      "decoding",
      "beam-search"
    ]
  },
  "llm-eval": {
    "level": "core",
    "body": {
      "intuition": [
        "This is the module's capstone and it is about the instruments rather than the systems, because every decision in the preceding lessons was justified by a measurement. Quantization is lossless - measured how? A distilled student matches its teacher - on what? A scaling law predicts a large run - of which quantity? The answer changes the conclusion in each case, and the module's recurring finding is that the metric people reach for is frequently structurally unable to see the effect they are asking about.",
        "The sharpest instance recurs three times in this module and is worth naming as one pattern. MULTIPLE-CHOICE ACCURACY IS A STEP FUNCTION OF THE LOGITS. A small perturbation rarely flips a confident argmax, so quantization can degrade a model's output distribution measurably while accuracy does not move at all. The same blindness explains why constrained decoding's parse rate is not a result, why preference judging cannot distinguish style from capability, and why emergent abilities looked discontinuous. In each case the instrument was answering a different question from the one being asked - and it answered it correctly, which is why the error is so persistent.",
        "So the discipline is to choose an instrument that can actually move in response to what you are testing, and to know each instrument's blind spot. Perplexity is continuous and sensitive and does not measure capability. Benchmarks are comparable and contaminated. LLM judges are cheap and scale, and carry position, length and self-preference biases. Human preference is the ground truth for helpfulness and measures style heavily. Checkable tasks are unfoolable and cover only what can be checked. None of these is the right answer; the right answer is a portfolio chosen so that the failure modes do not overlap, plus an honest statement of what remains unmeasured."
      ],
      "math": [
        {
          "h": "Why accuracy cannot see a distributional change",
          "paras": [
            "Accuracy depends on the logits only through which is largest. That makes it a step function, insensitive to any perturbation smaller than the margin.",
            "Perplexity depends on the probability assigned to the observed token, so it responds continuously to the same perturbation."
          ],
          "tex": "\\mathrm{acc} = \\mathbb{1}\\big[\\arg\\max_i z_i = y\\big] \\quad\\text{vs}\\quad \\mathrm{PPL} = \\exp\\!\\Big(-\\tfrac{1}{N}\\textstyle\\sum_t \\log p(x_t \\mid x_{<t})\\Big)",
          "texNote": "So a change that shifts every logit by a small amount leaves accuracy exactly unchanged and moves perplexity immediately. That single difference explains why quantization passes benchmarks and degrades generation, and why a continuous metric is the right first instrument for any change that perturbs the distribution rather than the ranking."
        },
        {
          "h": "The judge's biases, as a model of what it measures",
          "paras": [
            "An LLM or human judge's preference is a function of several things, only one of which is quality. Writing it out makes clear why a win-rate is not a quality measurement.",
            "Length is the best-documented of these and it is the one that most often explains an apparent improvement."
          ],
          "tex": "\\Pr[A \\succ B] = f\\big(\\underbrace{q_A - q_B}_{\\text{quality}},\\; \\underbrace{|A| - |B|}_{\\text{length}},\\; \\underbrace{\\text{style}}_{\\text{register, format}},\\; \\underbrace{\\text{position}}_{\\text{order shown}}\\big)",
          "texNote": "The practical consequences: report mean output length beside every win-rate, since length-controlled comparison routinely removes a large share of an apparent win; randomize and average over presentation order, because position bias is real in both human and model judges; and be wary of a model judging its own family, where self-preference has been measured."
        },
        {
          "h": "Contamination as a validity threat, not a quality one",
          "paras": [
            "A benchmark score decomposes into performance on items the model has seen and items it has not. Only the second is measuring capability.",
            "Reporting both, rather than the aggregate, is what makes a number interpretable."
          ],
          "tex": "\\text{score} = \\rho \\cdot s_{\\text{seen}} + (1-\\rho)\\cdot s_{\\text{unseen}}, \\qquad s_{\\text{seen}} \\to 1 \\text{ under memorization}",
          "texNote": "So the contaminated fraction rho inflates the score toward one, and the honest report gives the score on the clean subset alongside the full figure - the difference between them IS the contamination's effect. Note this is a validity failure rather than a quality one: it does not make the model worse, it makes the number mean something other than what it appears to."
        }
      ],
      "code": [
        {
          "h": "The instruments, and what each is blind to",
          "paras": [
            "There is no single right metric. The design decision is choosing a set whose blind spots do not overlap, and stating what remains uncovered."
          ],
          "code": "# INSTRUMENT              SEES                        BLIND TO\n# ------------------------------------------------------------------------\n# perplexity              distributional change,      capability; comparable\n#                         continuous, cheap           only within a tokenizer\n# multiple-choice acc.    ranking of options          ANY change smaller than\n#                                                     the margin - a STEP FN\n# checkable tasks         genuine capability          only what is checkable\n#   (code runs, maths)    (style cannot fake it)\n# LLM judge               open-ended quality, cheap,  length, position, self-\n#                         scalable                    preference bias\n# human preference        helpfulness (the target)    style/length heavily;\n#                                                     expensive, ~70% agreement\n# production A/B          the thing you actually      slow, confounded, only\n#                         care about                  post-deployment\n\n# THE PATTERN THIS MODULE KEEPS HITTING - one blindness, three symptoms:\n#   QUANTIZATION passes benchmarks and degrades generation (accuracy is a\n#     step function; generation compounds and samples the TAIL)\n#   CONSTRAINED DECODING reports 100% parse rate (that is the DEFINITION)\n#   IMITATION models win preference and gain no capability (preference on\n#     short comparisons largely measures STYLE)\n# In each case the instrument answered a DIFFERENT question - correctly.\n\n# THE MINIMUM PORTFOLIO I would run on any model change:\nreport = {\n  \"ppl_in_domain\":     perplexity(model, held_out),        # continuous, sensitive\n  \"checkable_acc\":     exact_match(model, verifiable_set), # style cannot fake it\n  \"judge_winrate\":     judge(model, baseline),             # ...and beside it:\n  \"mean_output_len\":   mean_len(model), mean_len(baseline),# THE confound\n  \"contaminated_frac\": ngram_overlap(evalset, corpus),     # validity check\n  \"capability_suite\":  before_after(base_model, model),    # what was LOST\n}",
          "caption": "The table is the lesson: no instrument is right, and the design decision is choosing a set whose blind spots do not overlap. The three symptoms below it are one blindness seen three times in this module."
        },
        {
          "h": "Judges, contamination, and the statistics people skip",
          "paras": [
            "Three practical corrections, each of which changes conclusions and each of which is routinely omitted."
          ],
          "code": "# 1. LENGTH-CONTROL EVERY PREFERENCE COMPARISON.\nprint(\"win rate\", wr, \"| lengths\", mean_len(a), mean_len(b))\n#   Judges prefer longer at equal quality, and almost every intervention makes\n#   models longer. If the winner is 40% longer, the comparison is not yet\n#   interpretable - regress out length or match it, which routinely removes a\n#   large share of an apparent win.\n\n# 2. DEBIAS THE JUDGE.\nscores = [judge(a, b), judge(b, a)]        # BOTH orders, then average -\n                                            # position bias is real in human\n                                            # AND model judges\n#   And avoid a judge from the same family as a candidate: SELF-PREFERENCE has\n#   been measured. Validate the judge against human labels on a subset and\n#   report that agreement - a judge nobody has validated is an unknown\n#   instrument, and its agreement ceiling is the human-human rate of ~70-75%.\n\n# 3. REPORT UNCERTAINTY. A 3-point difference on 200 examples is noise.\nse = sqrt(p * (1 - p) / n)                  # +- ~3.5 points at n=200, p=0.5\n#   Bootstrap the confidence interval, and for A-vs-B use the PAIRED test on\n#   per-item outcomes - far more powerful than comparing two independent means,\n#   because item difficulty is the dominant variance component.\n\n# 4. CONTAMINATION - a VALIDITY check, not a quality one.\nseen = [ex for ex in evalset if any(ng in corpus_ngrams\n                                    for ng in ngrams(ex, n=13))]\nprint(\"contaminated:\", len(seen)/len(evalset))\nprint(\"score full:\", score(evalset), \"| score CLEAN:\", score(evalset - seen))\n#   The DIFFERENCE between those two is the contamination's effect. A benchmark\n#   number reported without this is an upper bound, not a measurement.\n\n# 5. THE ONE PEOPLE FORGET ENTIRELY: what did the change BREAK? Fix a\n#    capability suite BEFORE the change, run it on the base model, and re-run\n#    after. Every metric above is computed on the thing you were optimizing;\n#    regressions happen off it, by construction.",
          "caption": "Four corrections that change conclusions and are routinely omitted, plus the fifth that is skipped entirely: every metric here measures what you optimized, so regressions occur off it by construction and need a pre-declared suite."
        }
      ],
      "useCases": [
        "Deciding whether a systems change - quantization, distillation, a new serving path - preserved quality, which requires an instrument sensitive to distributional change rather than one that only sees the ranking.",
        "Comparing model candidates for a deployment, where the portfolio approach plus contamination checking plus paired statistics is what separates a real difference from noise or memorization.",
        "Monitoring a deployed model, where production A/B on the metric you actually care about is the ground truth and everything else is a cheap proxy run beforehand.",
        "Reading published results critically: knowing what each instrument is blind to lets you infer what a reported number can and cannot support, which is most of the skill in evaluating claims about models."
      ],
      "pitfalls": [
        "Using multiple-choice accuracy to evaluate a distributional change. It is a step function of the logits and rarely moves when a perturbation is smaller than the margin, so it is structurally unable to detect quantization damage. Use perplexity and long-output generation.",
        "Reporting a preference win-rate without output length. Judges prefer longer responses at equal quality and almost every intervention lengthens output, so an uncontrolled win-rate conflates verbosity with quality - and length control routinely removes much of the apparent gain.",
        "Trusting an unvalidated LLM judge. Position bias, length bias and self-preference are all measured effects. Present both orders and average, avoid judging a model with one from its own family, and report agreement with human labels on a subset.",
        "Comparing two scores without uncertainty. A three-point difference on two hundred examples is inside the noise, and the standard error is one line. For A-versus-B use a paired test on per-item outcomes, since item difficulty dominates the variance.",
        "Reporting a benchmark score without a contamination check. Evaluation sets appear in web crawls, so the number may reflect memorization - which is a validity failure rather than a quality one, and it makes the figure an upper bound rather than a measurement.",
        "Measuring only what you optimized. Every metric in a training or tuning loop is computed on the target, so regressions happen off it by construction. A capability suite fixed before the change and run on the base model is the only way to see them.",
        "Treating any single number as the evaluation. Each instrument answers a different question, and the design decision is a portfolio whose blind spots do not overlap - plus an explicit statement of what remains unmeasured."
      ],
      "connections": [
        {
          "ref": "llm-systems/quantization",
          "text": "The clearest instance of the module's evaluation failure: accuracy is a step function and cannot see a distributional change, while generation compounds perturbations and samples the tail where quantization error is largest."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Where loss and capability come apart. Scaling predicts cross-entropy smoothly; benchmark performance is measured with metrics that can be discontinuous, which is much of why emergence looked like a qualitative change."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The same instrument failure in the fine-tuning setting - imitation models winning preference while gaining no checkable capability, because short preference comparisons largely measure style."
        },
        {
          "ref": "llm-systems/llm-data-pipelines",
          "text": "Contamination is a data-pipeline problem with an evaluation consequence, and the near-duplicate machinery built for deduplication is exactly the tool for detecting it."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general treatment of what a metric can and cannot express. The failures here are that framework applied to generative models, where the output is a distribution over sequences rather than a label."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does accuracy miss quantization damage?",
          "a": "It is a step function of the logits - only the argmax matters - so a perturbation smaller than the margin leaves it exactly unchanged while the distribution has measurably shifted."
        },
        {
          "q": "What should you use instead?",
          "a": "Perplexity on in-domain held-out text, which is continuous and responds immediately, plus long-output generation where errors compound and sampling reads the tail."
        },
        {
          "q": "Why is perplexity not sufficient on its own?",
          "a": "It measures distributional fit, not capability, and it is comparable only within a fixed tokenizer and data distribution."
        },
        {
          "q": "What is the main bias in preference judging?",
          "a": "Length - judges prefer longer responses at equal quality, and almost every intervention lengthens output, so an uncontrolled win-rate conflates verbosity with quality."
        },
        {
          "q": "How do you correct for position bias?",
          "a": "Present both orders and average. It is a measured effect in both human and LLM judges."
        },
        {
          "q": "What is self-preference?",
          "a": "A model judge rating outputs from its own family more favourably. It is measured, and it is why a judge should not come from the same family as a candidate."
        },
        {
          "q": "How do you validate a judge?",
          "a": "Compare it against human labels on a subset and report the agreement. Its ceiling is the human-human agreement rate, around 70 to 75%."
        },
        {
          "q": "What is contamination?",
          "a": "Evaluation data appearing in the training corpus, so the score reflects memorization. It is a validity failure rather than a quality one."
        },
        {
          "q": "How do you report a contaminated benchmark honestly?",
          "a": "Give the score on the full set and on the contamination-free subset. The difference between them is the contamination's effect."
        },
        {
          "q": "Why use a paired test for A versus B?",
          "a": "Item difficulty dominates the variance, so comparing per-item outcomes is far more powerful than comparing two independent means."
        },
        {
          "q": "What does a three-point difference on 200 examples mean?",
          "a": "Nothing on its own - the standard error at p of 0.5 and n of 200 is about 3.5 points, so the difference is inside the noise."
        },
        {
          "q": "What does every metric in a tuning loop miss?",
          "a": "Regressions, because it is computed on what you were optimizing and regressions happen off it. A pre-declared capability suite on the base model is the only way to see them."
        }
      ],
      "standard": [
        {
          "q": "How would you evaluate whether a systems change preserved model quality?",
          "a": "THE FIRST QUESTION IS WHAT KIND OF CHANGE IT IS, because that determines which instruments can see it. A change that perturbs the output DISTRIBUTION - quantization, a different kernel, a fused attention implementation - needs a continuous metric. A change that alters CAPABILITY - distillation, fine-tuning - needs checkable tasks. A change that alters FORMAT - constrained decoding - needs the validity and correctness terms reported separately. THE INSTRUMENT THAT FAILS MOST OFTEN, and it is worth leading with because it recurs three times in this module. Multiple-choice accuracy is a STEP FUNCTION of the logits: only the argmax matters, so any perturbation smaller than the margin leaves it exactly unchanged. Quantization can shift every logit measurably and accuracy will not move, which is why quantized models pass benchmarks and produce worse generations. The same blindness explains why constrained decoding's 100% parse rate is the definition rather than a result, and why imitation models win preference comparisons while gaining no capability. One blindness, three symptoms - and in each case the metric answered a different question correctly, which is why the error persists. WHAT I WOULD ACTUALLY RUN, as a portfolio chosen so the blind spots do not overlap. (1) PERPLEXITY on in-domain held-out text. Continuous, cheap, and sensitive to exactly the distributional shifts that accuracy hides. This is the first thing I would measure for any systems change and it would have caught most of the failures in this module. (2) CHECKABLE TASKS - code that runs against tests, mathematics with exact answers, extraction with unique targets. Style cannot fake these, so they are the honest capability column. (3) LONG-OUTPUT GENERATION scored the way production scores it, because autoregressive errors compound over hundreds of steps and sampling reads the low-probability tail where perturbation is proportionally largest. Repetition rate and format-violation rate belong here. (4) A PREFERENCE COMPARISON if the task is open-ended - with mean output length reported beside it, both presentation orders averaged, and the judge validated against human labels on a subset. (5) THE CAPABILITY SUITE, fixed before the change and run on the base model, because every other metric is computed on what I was optimizing and regressions happen off it by construction. THE STATISTICS, which are routinely skipped. Report uncertainty: a three-point difference on two hundred examples is inside the noise. Use a PAIRED test on per-item outcomes for A-versus-B, since item difficulty is the dominant variance component and pairing removes it. And bootstrap rather than assuming normality on a bounded score. AND THE VALIDITY CHECK: contamination. Evaluation sets appear in web crawls, so I would check n-gram overlap against the training corpus where I can see it, and report the score on the clean subset alongside the full one. Without it a benchmark figure is an upper bound rather than a measurement. THE PRINCIPLE I WOULD STATE. Choose an instrument that CAN MOVE in response to the thing you are testing, know what each one is blind to, and say explicitly what remains unmeasured. That last part is what makes an evaluation honest rather than merely thorough.",
          "deepDive": {
            "q": "Design an evaluation for a quantized model that would actually catch the problems.",
            "a": "I WOULD DESIGN IT AROUND WHAT QUANTIZATION ACTUALLY DOES: it perturbs the logits slightly and everywhere. So the evaluation has to be sensitive to small distributional changes and to their compounding, which is a specific requirement. TIER 1 - DIRECT DISTRIBUTIONAL MEASUREMENT, the most informative and the cheapest. (a) PERPLEXITY on held-out in-domain text, full precision versus quantized. Continuous, sensitive, one number. (b) KL DIVERGENCE between the two models' output distributions at each position on a sample of real prompts - this measures the thing that changed rather than a downstream consequence of it, and it localizes WHERE the divergence is largest, which no benchmark does. (c) The distribution of that divergence, not just its mean, because a small mean with a heavy tail is a different situation from a uniform small shift. TIER 2 - COMPOUNDING, which is where the practical damage lives. Generate long outputs from both models on the same prompts with the same seed and measure: length distribution, repetition rate - n-gram repetition within a response - format-violation rate on structured tasks, and degeneration onset, meaning at what token position the outputs start diverging qualitatively rather than merely differing. The mechanism is that each token conditions on all previous ones, so a perturbation that changes one token in fifty changes the context for everything after; a 500-token response amplifies what a 20-token one hides. So the evaluation must use LONG outputs, and a benchmark of short answers is structurally unable to show this. TIER 3 - SAMPLING BEHAVIOUR, which is the second mechanism and is usually omitted entirely. Under temperature or nucleus sampling you are not taking the argmax - you are sampling, so changes in the LOW-PROBABILITY TAIL directly change which tokens can appear, and quantization error is proportionally largest exactly there. So: measure at the sampling parameters you actually deploy, not greedily. Compare the entropy of the output distributions. And measure diversity across multiple samples from the same prompt, since a shift in the tail shows up as reduced or altered diversity before it shows as wrong answers. TIER 4 - CAPABILITY, on checkable tasks, as the backstop. Style cannot fake code that runs, and if these move you have a serious problem rather than a subtle one. TIER 5 - THE PRODUCTION PROXY. Real prompts sampled from traffic, scored the way production scores them. This is the only evaluation whose distribution is guaranteed correct, and its absence is why the problem shipped in the first place. WHAT I WOULD DELIBERATELY NOT RELY ON. Multiple-choice benchmarks, which are step functions of the logits and will show no change while the model degrades - and which are, unfortunately, what most published quantization evaluations use. I would include them only to demonstrate that they do not move, which is itself a useful thing to show a stakeholder. THE ACCEPTANCE CRITERION I WOULD SET IN ADVANCE. Perplexity within a stated tolerance, repetition and format-violation rates unchanged, checkable accuracy unchanged, and the production-proxy score within tolerance. Stating these before running is what makes the evaluation a test rather than a search for a favourable number - which is the discipline the whole curriculum keeps returning to."
          }
        },
        {
          "q": "How would you use an LLM as a judge, and what are its failure modes?",
          "a": "WHY IT IS ATTRACTIVE: it scales. Human evaluation is expensive, slow, and has its own agreement ceiling around 70 to 75%, so for anything requiring thousands of comparisons a model judge is the only practical instrument. It also correlates reasonably well with human preference on many tasks, which is what made it standard. THE FAILURE MODES, and each has a correction. (1) POSITION BIAS. Judges systematically favour one presentation position, and the effect is large enough to flip conclusions. CORRECTION: present both orders and average, or randomize and report over enough samples that it washes out. This is cheap and it is skipped constantly. (2) LENGTH BIAS. Longer responses are preferred at equal quality, and almost every intervention makes models longer - so an uncontrolled win-rate conflates verbosity with quality. CORRECTION: report mean output length beside every win-rate, and length-control the comparison by matching or regressing out. This routinely removes a large share of an apparent win, which tells you how much of the effect was verbosity. (3) SELF-PREFERENCE. A judge rates outputs from its own family more favourably, which is a measured effect. CORRECTION: never use a judge from the same family as a candidate, and if unavoidable, report it as a limitation. (4) STYLE OVER SUBSTANCE. This is the deepest one. Short preference comparisons largely measure register, formatting and confidence - precisely what fine-tuning and imitation transfer most readily - which is why imitation models win preference comparisons while gaining no checkable capability. CORRECTION: pair every judge evaluation with a checkable-task column. The judge cannot substitute for it. (5) SENSITIVITY TO THE RUBRIC. Judge scores move substantially with the prompt, the scale, and whether reasoning is requested before the verdict. CORRECTION: fix the rubric, version it, and treat a rubric change as invalidating comparisons across it. HOW I WOULD VALIDATE THE JUDGE, which is the step that turns it from an unknown instrument into a measured one. Collect human labels on a subset - a few hundred comparisons - and report the judge's agreement with them, broken down by task type. Its ceiling is the human-human agreement rate, so a judge agreeing 70% with humans who agree 72% with each other is close to as good as the format allows. Reporting that agreement is what lets a reader calibrate everything else. WHAT I WOULD USE IT FOR AND NOT FOR. Good for: relative comparisons at scale, regression detection between model versions, and filtering candidates before human review. Bad for: absolute quality claims, anything where style and substance can diverge, and any comparison where the two candidates differ systematically in length or format. THE FRAMING I WOULD OFFER. An LLM judge is a cheap, biased, high-variance instrument with a measurable relationship to the thing you care about. Used with its corrections and alongside an unfoolable metric, it is extremely useful. Used alone as the arbiter, it optimizes for what it measures - which is a reward-model overoptimization problem wearing evaluation clothes."
        },
        {
          "q": "What makes a good benchmark, and why do benchmarks stop working?",
          "a": "WHAT MAKES ONE GOOD, in rough order of importance. (1) IT MEASURES SOMETHING THAT MATTERS and that transfers - performance on it should predict performance on the real task. Surprisingly many do not, and the transfer is rarely validated. (2) IT IS HARD ENOUGH TO HAVE HEADROOM. A benchmark where the frontier is at 95% cannot distinguish models, and its remaining 5% is often mislabelled items rather than genuine difficulty - so improvements past that point are fitting annotation noise. (3) THE METRIC IS SENSITIVE to the differences you care about, which is this lesson's theme: a step-function metric on a task where the interesting variation is distributional measures nothing. (4) IT IS RESISTANT TO SHORTCUTS. The best benchmarks are constructed so the shortcut and the task DISAGREE - which is the discipline behind counterfactual and adversarial splits, and it requires knowing what the shortcut would be. (5) IT IS CHEAP AND REPRODUCIBLE, so people actually run it identically. WHY THEY STOP WORKING - four mechanisms. (1) CONTAMINATION. Published benchmarks enter web crawls, so newer models have seen them. This is time-dependent: the same benchmark is clean for a model trained before publication and contaminated after, so a score is partly a function of training date rather than capability. And it is a validity failure - the number stops meaning what it appears to. (2) SATURATION. Once the frontier reaches the ceiling, the benchmark cannot discriminate, and the remaining errors are frequently label noise. (3) OPTIMIZATION PRESSURE - Goodhart. Once a benchmark becomes a target, effort goes into it specifically, and the correlation with the underlying capability weakens. This is the same overoptimization structure as a reward model: the measure was informative until it became the objective. (4) SHORTCUTS BEING FOUND. Benchmarks constructed procedurally often contain artefacts, and the field's history is full of cases where a model exploiting an artefact scored well - a text-only baseline on a multimodal benchmark, a hypothesis-only baseline on inference. Those discoveries are how you learn a benchmark was measuring something else. WHAT FOLLOWS PRACTICALLY. Prefer benchmarks constructed AFTER your model's training cutoff, or construct your own held-out set from production data, which is the only one whose distribution is guaranteed correct. Report a contamination check with every number. Treat a benchmark as informative until it becomes a target, and expect its informativeness to decay once it does. And run the shortcut baseline yourself - a blind or ablated model on the benchmark - because if a degenerate baseline scores well, the benchmark is not measuring what it claims and you have learned that cheaply. THE HABIT I WOULD RECOMMEND. When you see a strong benchmark result, ask three questions: could it be contaminated, could a shortcut baseline achieve it, and does the metric have headroom. Those three account for most of the reported results that fail to reproduce as capability.",
          "deepDive": {
            "q": "You need to evaluate a model for a specific product. How would you build the evaluation?",
            "a": "I WOULD BUILD IT FROM PRODUCTION TRAFFIC AND WORK BACKWARDS, because the only evaluation set whose distribution is guaranteed correct is one sampled from the distribution you serve. Public benchmarks are for comparing models in general; a product needs an instrument aimed at its own task. STEP 1: SAMPLE REAL TRAFFIC, or the closest available proxy if the product is not live - a pilot, an internal dogfood period, or a carefully constructed simulation of expected use. Stratify it: by request type, by length, by user segment, by anything you suspect matters. A few hundred examples is enough to start and the stratification matters more than the size. STEP 2: LABEL IT, which is where the real work is. Decide what correct means for each request type and write it down as a rubric with worked examples of the hard cases, because most annotator disagreement is not irreducible variation - it is annotators optimizing different unstated criteria. Measure inter-annotator agreement and treat it as the ceiling on everything downstream. STEP 3: SEPARATE THE CHECKABLE FROM THE JUDGED. Whatever can be verified programmatically - a structured field, a retrieved citation that exists, an arithmetic result, code that runs - should be, because those are unfoolable and cheap to re-run. Everything else needs a judge, human or model, with the corrections from earlier. Report them as separate columns; do not blend them into one score. STEP 4: BUILD THE ADVERSARIAL AND EDGE SLICES DELIBERATELY. The cases where the right answer is a refusal, or an admission of uncertainty, or a clarifying question. Ambiguous inputs. Very long inputs. Inputs in the second-most-common language. These are where models fail and where an average over typical traffic will not look. STEP 5: FIX A CAPABILITY SUITE from before any change, so regressions off the optimization target are visible. STEP 6: DEFINE THE DECISION RULE IN ADVANCE - what result would cause you to ship, and what would cause you not to. Without it the evaluation becomes a search for a favourable framing. THE THINGS I WOULD MEASURE BESIDES CORRECTNESS, because a product is not only accurate. Latency at the percentiles that matter, not the mean. Cost per request. Refusal rate and format-violation rate. Output length, since it affects both cost and user experience. And the failure MODE distribution - what kinds of wrong, not just how often - because a system that fails by declining is very different from one that fails by confabulating. THE PROCESS POINT I WOULD MAKE MOST FIRMLY. Build this BEFORE you need it. The common sequence is to ship on public benchmarks, discover a problem in production, and then construct the evaluation that would have caught it - by which point you are building the instrument and diagnosing the failure simultaneously, which is the worst time for both. And once built, run it on every candidate and every systems change, so it accumulates history and a regression is visible as a deviation from a trend rather than an isolated number nobody can calibrate."
          }
        },
        {
          "q": "What is the single most common evaluation mistake in this module's material?",
          "a": "USING AN INSTRUMENT THAT IS STRUCTURALLY UNABLE TO MOVE IN RESPONSE TO THE THING BEING TESTED. It appears three times in this module and once more in the fine-tuning material, and each time it looks like a different problem. INSTANCE ONE: QUANTIZATION PASSING BENCHMARKS. Multiple-choice accuracy is a step function of the logits - only the argmax matters. Quantization shifts every logit slightly. If the correct option led comfortably, a small shift does not change which is largest, so accuracy is IDENTICAL while the distribution has measurably changed. The damage appears in generation, where errors compound over hundreds of autoregressive steps and sampling reads the low-probability tail. INSTANCE TWO: CONSTRAINED DECODING REPORTING A 100% PARSE RATE. That is the definition of the technique, not a result. Constraining sets validity to one by construction, so the only quantity that can move is correctness given validity - and an evaluation reporting the parse rate has measured the definition. INSTANCE THREE: IMITATION MODELS WINNING PREFERENCE COMPARISONS. Short preference judging largely measures register, formatting and confidence - exactly what imitation transfers most readily - so the instrument is structurally unable to distinguish a style gain from a capability gain. The measured finding was crowdworkers rating imitations competitive while checkable benchmarks barely moved. INSTANCE FOUR, one level up: EMERGENT ABILITIES. Exact-match accuracy on a multi-step task is a step function of the underlying per-token probability, so smooth improvement shows as a sudden jump. Replace it with a continuous measure and the improvement is visible all along. WHAT THEY HAVE IN COMMON. In every case the metric answered a question CORRECTLY - it answered whether the argmax survived, whether the output parses, which response reads better, whether every token was right. Nobody asked whether the distribution changed, whether the values are correct, whether capability improved, or whether the underlying probability rose. The instrument was not broken; it was pointed at a different question, and the error is durable precisely because the number is trustworthy. THE DIAGNOSTIC QUESTION that catches all four. Before running an evaluation, ask: what change in the system would this metric FAIL to detect? If the answer includes the change you are testing, you have the wrong instrument. That question takes seconds and it would have prevented every instance above. THE CORRECTIVE HABIT. Match the metric's sensitivity to the change's nature. Distributional change needs a continuous metric - perplexity, KL divergence. Capability change needs checkable tasks. Format change needs validity and correctness reported separately. And when you cannot find an instrument that can see it, say so explicitly rather than reporting the one that cannot."
        },
        {
          "q": "How do you evaluate long-context capability?",
          "a": "IT IS A GOOD CASE STUDY IN INSTRUMENT DESIGN, because the obvious test is nearly useless and the field learned that publicly. THE OBVIOUS TEST: NEEDLE IN A HAYSTACK. Insert a specific fact at some position in a long context and ask for it. It measures retrieval of a verbatim string, which models became very good at quickly - and a model can pass it comprehensively while being unable to use long context for anything real. It is close to saturated and it is still widely reported, which makes it a good example of a benchmark surviving past its usefulness. WHAT IT MISSES. (1) MULTIPLE needles, and reasoning that requires combining them - retrieval of one fact is a much easier problem than aggregation over several. (2) The POSITION EFFECT: performance is systematically worse for information in the MIDDLE of a long context than at either end, which is a real and well-documented finding and which a single-needle test at a random position averages away. (3) Whether the model can use the context for anything other than copying - summarizing it, reasoning over it, noticing a contradiction within it. (4) Whether long context DEGRADES ordinary performance, which is the regression question. WHAT I WOULD ACTUALLY BUILD. (a) POSITION-STRATIFIED retrieval, reporting accuracy as a function of where in the context the information sits, because the aggregate hides exactly the effect that matters. (b) MULTI-HOP tasks requiring information from several widely-separated positions. (c) AGGREGATION tasks - count, compare, summarize across the whole context - which cannot be solved by retrieval. (d) A CONTRADICTION test: place conflicting statements and see whether the model notices, which tests whether it is integrating rather than sampling. (e) A NEGATIVE control: ask about something NOT present, to measure whether the model confabulates rather than declining. That last one is skipped almost universally and it is where long-context systems fail most expensively. (f) LENGTH SCALING: the same task at 4k, 16k, 64k, 128k, so degradation with length is visible as a curve rather than a point. THE MEASUREMENT DETAIL THAT MATTERS. Distinguish what the model CAN do from what the context window ADVERTISES. A model with a 128k window whose performance collapses past 32k has a 128k window and a 32k capability, and only the length-scaling curve shows that. Advertised context length is a configuration, not a measurement. AND THE SYSTEMS CONNECTION, since this is the module's last lesson. Long context is expensive in exactly the way this module cares about: the KV cache scales linearly with sequence length, so it bounds the servable batch and therefore the throughput and the cost per token. So the evaluation should report not only capability at length but COST at length - because a model that is capable at 128k and can serve two concurrent requests there is a different product from one capable at 32k serving thirty. That pairing of a capability curve with a cost curve is the honest way to characterize long context, and it is what the two-regime framing recommends."
        },
        {
          "q": "Summarize what this module has been about.",
          "a": "THAT LLM SYSTEMS LIVE IN TWO REGIMES WITH OPPOSITE BOTTLENECKS, and that almost every technique is legible once you know which one it targets. TRAINING IS COMPUTE-BOUND. Weights are amortized over batch times sequence positions, so arithmetic intensity is high and the constraint is the compute budget. The question is how to ALLOCATE it, and the scaling laws answer: roughly equally between parameters and tokens, which made the token supply a first-order constraint and turned deduplication, quality filtering and packing from plumbing into determinants of model quality. Mixture of experts belongs here too - it decouples capacity from FLOPs, which is a compute-regime win. GENERATION IS MEMORY-BANDWIDTH-BOUND. Producing one token requires reading every weight and the entire KV cache to do one token's arithmetic - intensity about one, against hardware ratios in the hundreds, so the accelerator idles. The constraint is BYTES READ PER TOKEN, and every inference technique is an attack on it. Quantization reduces bytes per parameter. Distillation reduces the number of parameters. Grouped-query attention reduces the cache read - and the KV-cache formula's omission of query heads is why that works. Speculative decoding amortizes the read over more tokens, which is only possible because a k-token pass costs what a one-token pass costs. Batching amortizes over more sequences. THE ERRORS THE FRAMING PREVENTS. Expecting quantization to speed up training proportionally - it does not, because training is compute-bound. Expecting MoE to be as attractive to serve as to train - it is not, because all experts must be resident and residency bounds the batch. Quoting Chinchilla-optimal for a model you intend to deploy - that is a training-only answer, and the inference-aware objective pushes toward smaller models trained longer. Each of those is a training intuition carried into inference or the reverse. THE CAPSTONE'S ADDITION. Every claim in the module rests on a measurement, and the module's recurring failure is an instrument structurally unable to see the effect being tested. Accuracy is a step function and cannot detect a distributional change - which is why quantization passes benchmarks and degrades generation. A parse rate under constrained decoding is the definition, not a result. Preference judging measures style, which is what imitation transfers. Each time, the metric answered a different question correctly. THE ONE-SENTENCE VERSION. Know which regime you are in, because the same operation has opposite economics in each - and know what your instrument is blind to, because the technique that appears to be free is often one whose cost your metric cannot see."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why accuracy cannot see a distributional change",
        "back": "acc = 1[argmax z = y] is a STEP FUNCTION - only the ranking matters, so any perturbation smaller than the margin leaves it EXACTLY unchanged. Perplexity depends on p(observed token) and responds continuously. That difference is why quantization passes benchmarks and degrades generation."
      },
      {
        "type": "intuition",
        "front": "One blindness, three symptoms",
        "back": "QUANTIZATION passes benchmarks but degrades generation. CONSTRAINED DECODING reports 100% parse rate (the DEFINITION). IMITATION models win preference and gain no capability. Each time the metric answered a DIFFERENT question - correctly. That is why the error is durable."
      },
      {
        "type": "formula",
        "front": "What a preference judge actually measures",
        "back": "P(A > B) = f(quality gap, LENGTH gap, style, POSITION). Report mean output length beside every win-rate; average over BOTH orders; never judge with a model from a candidate's own family (self-preference is measured)."
      },
      {
        "type": "intuition",
        "front": "Validate the judge, and know its ceiling",
        "back": "Compare against human labels on a subset and REPORT the agreement. The ceiling is human-human agreement, ~70-75% - so a judge agreeing 70% with humans who agree 72% with each other is near the format's limit. An unvalidated judge is an unknown instrument."
      },
      {
        "type": "formula",
        "front": "Contamination is a VALIDITY failure",
        "back": "score = rho * s_seen + (1-rho) * s_unseen, with s_seen -> 1 under memorization. Report the score on the FULL set AND the CLEAN subset - the difference IS the effect. A benchmark number without this check is an upper bound, not a measurement."
      },
      {
        "type": "pitfall",
        "front": "Report uncertainty, and use a PAIRED test",
        "back": "SE = sqrt(p(1-p)/n) is ~3.5 points at n=200 - so a 3-point difference is noise. For A-vs-B, compare PER-ITEM outcomes: item difficulty is the dominant variance component, and pairing removes it."
      },
      {
        "type": "intuition",
        "front": "The instrument portfolio",
        "back": "PERPLEXITY sees distributional change, not capability. ACCURACY sees ranking only. CHECKABLE TASKS see capability, cover only the checkable. JUDGES scale, are biased. HUMANS are ground truth for helpfulness, measure style. Choose a set whose BLIND SPOTS DO NOT OVERLAP."
      },
      {
        "type": "intuition",
        "front": "The diagnostic question before any evaluation",
        "back": "What change in the system would this metric FAIL to detect? If the answer includes the change you are testing, you have the wrong instrument. Seconds to ask, and it would have prevented every failure in this module."
      },
      {
        "type": "pitfall",
        "front": "Every metric misses regressions BY CONSTRUCTION",
        "back": "They are all computed on what you were OPTIMIZING; regressions happen OFF it. Fix a capability suite BEFORE the change, run it on the BASE model, and put both columns in the same table. This is the step skipped entirely."
      },
      {
        "type": "intuition",
        "front": "Why benchmarks stop working",
        "back": "CONTAMINATION (time-dependent - clean before publication, dirty after), SATURATION (remaining errors are label noise), GOODHART (informative until it becomes a target), and SHORTCUTS being found. Run the degenerate baseline yourself - if it scores well, you have learned that cheaply."
      },
      {
        "type": "intuition",
        "front": "Long context: needle-in-a-haystack is nearly useless",
        "back": "It tests verbatim retrieval, which saturated. Build instead: POSITION-STRATIFIED accuracy (middle is worse), multi-hop, aggregation, contradiction detection, a NEGATIVE control (ask for what is absent), and a LENGTH-SCALING curve. Advertised window is a configuration, not a measurement."
      },
      {
        "type": "intuition",
        "front": "The module in one sentence",
        "back": "TRAINING is compute-bound (allocate the budget); GENERATION is memory-bandwidth-bound (read fewer bytes per token). The same operation has OPPOSITE economics in each - and the technique that appears free is often one whose cost your metric cannot see."
      }
    ],
    "refs": [
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      },
      {
        "title": "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)",
        "url": "https://arxiv.org/abs/2211.09110"
      },
      {
        "title": "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      },
      {
        "title": "Schaeffer, Miranda & Koyejo (2023), Are Emergent Abilities of Large Language Models a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      },
      {
        "title": "Dubois et al. (2024), Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators",
        "url": "https://arxiv.org/abs/2404.04475"
      }
    ],
    "demos": [
      "calibration",
      "classification-metrics",
      "conformal",
      "lost-in-the-middle"
    ]
  }
};
