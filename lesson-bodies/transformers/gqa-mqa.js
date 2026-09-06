// GENERATED from content/lessons/transformers/gqa-mqa.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/gqa-mqa/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "gqa-mqa": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This is an architecture change made entirely for INFERENCE ECONOMICS, which makes it unusual and worth understanding as a case study. During autoregressive generation, every previously-computed key and value must be kept in a KV CACHE so each new token can attend to the whole history. That cache is proportional to layers x heads x head_dim x sequence length x batch - and at long context or high batch it does not merely add to memory pressure, it EXCEEDS THE MODEL WEIGHTS. Worse, decoding is memory-bandwidth-bound: generating one token requires reading the entire cache, so cache size translates almost directly into tokens-per-second.",
        "MULTI-QUERY ATTENTION (Shazeer, 2019) takes the extreme position: keep all h QUERY heads, but use a SINGLE shared key head and value head that every query head attends against. The cache shrinks by a factor of h - for a 32-head model, 32x smaller. The cost is a measurable quality drop and, in practice, training instability. GROUPED-QUERY ATTENTION (Ainslie et al., 2023) is the compromise that won: partition the query heads into g groups, each group sharing one key/value head. g = h recovers standard multi-head attention, g = 1 is MQA, and intermediate values give a tunable dial. LLaMA-2 70B uses 64 query heads with 8 KV groups: an 8x cache reduction at essentially no quality loss.",
        "The reason this works is worth stating because it is not obvious. Query heads are where the DIVERSITY of attention patterns lives - each head asks a different question. Keys and values are closer to a shared representation of 'what is at each position', which multiple query heads can reasonably read from with different questions. So sharing K and V costs less than the parameter count suggests. And there is a practical bonus that made adoption easy: GQA can be UPTRAINED - take an existing multi-head checkpoint, mean-pool the key/value heads within each group, and continue training on ~5% of the original tokens to recover quality, so you do not need to pretrain from scratch to convert a model."
      ],
      "math": [
        {
          "h": "KV cache size - the quantity being optimized",
          "paras": [
            "Everything about this topic follows from one formula. Note what it does NOT contain: the number of QUERY heads. Only the key/value head count enters, which is exactly the lever GQA pulls."
          ],
          "tex": "\\text{KV bytes} = 2 \\times n_{\\text{layers}} \\times n_{\\text{kv\\_heads}} \\times d_k \\times T \\times B \\times \\text{bytes/elt}",
          "texNote": "The leading 2 is for K and V. Example - LLaMA-2 70B (80 layers, d_k=128) at T=4096, B=1, fp16: with 64 KV heads that is 2*80*64*128*4096*2 = 21.5 GB; with 8 KV groups, 2.7 GB. The model weights are ~140 GB in fp16, so at batch 32 the un-grouped cache would dwarf them."
        },
        {
          "h": "The GQA interpolation",
          "paras": [
            "GQA is a single parameter g between the two extremes. Query heads within a group all attend against the same K and V, so the attention computation is unchanged - only the number of distinct K/V projections shrinks, which shrinks both the projection parameters and, decisively, the cache."
          ],
          "tex": "\\mathrm{head}_i = \\mathrm{Attn}\\big(Q_i,\\; K_{\\lceil i/(h/g) \\rceil},\\; V_{\\lceil i/(h/g) \\rceil}\\big), \\qquad g=h \\Rightarrow \\text{MHA}, \\quad g=1 \\Rightarrow \\text{MQA}",
          "texNote": "h = query heads, g = KV groups, so h/g query heads share each KV head. Cache reduction is exactly h/g. LLaMA-2 70B: h=64, g=8, so 8 query heads per KV head and an 8x smaller cache."
        }
      ],
      "code": [
        {
          "h": "Grouped-query attention, with the repeat_kv trick",
          "paras": [
            "The implementation is standard multi-head attention with one extra step: expand the g KV heads to h by repeating each one h/g times, so the attention math is unchanged. Note that the repeat is a VIEW-style expansion for the compute - the CACHE only ever stores g heads, which is the entire point."
          ],
          "code": "import torch, torch.nn as nn, math\n\ndef repeat_kv(x, n_rep):                       # (B, g, T, d_k) -> (B, g*n_rep, T, d_k)\n    B, g, T, d = x.shape\n    if n_rep == 1: return x\n    return x[:, :, None].expand(B, g, n_rep, T, d).reshape(B, g * n_rep, T, d)\n\nclass GroupedQueryAttention(nn.Module):\n    def __init__(self, d_model=4096, n_heads=32, n_kv_heads=8):\n        super().__init__()\n        assert n_heads % n_kv_heads == 0\n        self.h, self.g, self.d_k = n_heads, n_kv_heads, d_model // n_heads\n        self.n_rep = n_heads // n_kv_heads\n        self.wq = nn.Linear(d_model, n_heads    * self.d_k, bias=False)\n        self.wk = nn.Linear(d_model, n_kv_heads * self.d_k, bias=False)   # SMALLER\n        self.wv = nn.Linear(d_model, n_kv_heads * self.d_k, bias=False)   # SMALLER\n        self.wo = nn.Linear(n_heads * self.d_k, d_model, bias=False)\n\n    def forward(self, x, cache=None):\n        B, T, _ = x.shape\n        q = self.wq(x).view(B, T, self.h, self.d_k).transpose(1, 2)\n        k = self.wk(x).view(B, T, self.g, self.d_k).transpose(1, 2)\n        v = self.wv(x).view(B, T, self.g, self.d_k).transpose(1, 2)\n        if cache is not None:\n            k, v = cache.append(k, v)              # the cache stores only g heads\n        k, v = repeat_kv(k, self.n_rep), repeat_kv(v, self.n_rep)   # expand for compute\n        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_k)\n        out = (att.softmax(-1) @ v).transpose(1, 2).reshape(B, T, -1)\n        return self.wo(out)",
          "caption": "GQA is standard attention plus repeat_kv: the cache holds g key/value heads and they are expanded to h only for the matmul. Query projections stay full-size - the diversity of attention patterns is preserved, only the shared representation is compressed."
        },
        {
          "h": "What the cache reduction actually buys",
          "paras": [
            "The numbers are the argument. Cache size falls linearly with the grouping factor, which raises the batch size that fits in memory, which raises throughput - and separately raises decode speed because fewer cache bytes must be read per token."
          ],
          "code": "def kv_gb(n_layers, n_kv, d_k, T, batch, bytes_per=2):\n    return 2 * n_layers * n_kv * d_k * T * batch / 1e9 * bytes_per\n\n# LLaMA-2 70B geometry: 80 layers, 64 query heads, d_k=128, fp16 cache\nfor n_kv, label in [(64, 'MHA'), (8, 'GQA-8'), (1, 'MQA')]:\n    for T in (4096, 32768):\n        print(f'{label:6s} T={T:6d}  B=1: {kv_gb(80,n_kv,128,T,1):6.2f} GB'\n              f'   B=32: {kv_gb(80,n_kv,128,T,32):7.1f} GB')\n# MHA    T=  4096  B=1:  21.47 GB   B=32:   687.2 GB   <- impossible\n# GQA-8  T=  4096  B=1:   2.68 GB   B=32:    85.9 GB\n# MQA    T=  4096  B=1:   0.34 GB   B=32:    10.7 GB\n# GQA-8  T= 32768  B=1:  21.47 GB   B=32:   687.2 GB   <- long context re-creates it\n#\n# quality (Ainslie et al., uptrained T5-XXL, average over benchmarks):\n#   MHA 47.2  |  GQA-8 47.1  |  MQA 46.6   -> GQA is ~free, MQA costs real quality",
          "caption": "The cache reduction is linear in the grouping factor and decides what batch size fits. GQA-8 gives 8x with essentially no quality cost; MQA gives 64x but a measurable drop - which is why GQA became the default. Note long context re-creates the problem at any grouping."
        }
      ],
      "useCases": [
        "Essentially every modern LLM: LLaMA-2 70B and LLaMA-3, Mistral, Qwen, Gemma and most recent open models ship GQA, because serving cost rather than benchmark score is what determines whether a model is deployable.",
        "High-throughput serving: the cache determines how many concurrent sequences fit in memory, so an 8x reduction translates roughly into 8x the batch size, and throughput in a continuous-batching server scales with batch - the single largest lever after quantization.",
        "Long-context deployment: cache grows linearly with sequence length, so a 128K-context model is unserveable with full multi-head attention; GQA is a prerequisite for long context, alongside paged attention and cache quantization.",
        "Converting existing models: uptraining lets you take a trained multi-head checkpoint, mean-pool its KV heads into groups, and recover quality with ~5% of the original pretraining compute - so GQA is available retroactively, not only at design time."
      ],
      "pitfalls": [
        "Expecting GQA to speed up TRAINING: during training the whole sequence is processed in parallel with no cache, so GQA saves only the small KV projection parameters. Its benefit is almost entirely at inference - a distinction interviewers probe.",
        "Confusing head-count reduction with FLOP reduction: after repeat_kv the attention matmuls are the same size as standard multi-head attention. What shrinks is the CACHE (memory and bandwidth), not the arithmetic.",
        "Going straight to MQA because the reduction is bigger: MQA's quality drop is real and it was reported to be less stable to train. GQA-8 captures most of the benefit for almost none of the cost, which is why it, not MQA, became standard.",
        "Assuming GQA solves long context: cache size is linear in sequence length, so an 8x reduction buys 8x the length at the same memory - a 32K context with GQA-8 costs what 4K cost with MHA. You still need paged attention, cache quantization, or a windowed scheme.",
        "Naively averaging KV heads when converting a checkpoint without any uptraining: mean-pooling is the right initialization but quality does not fully recover without continued training on a small token budget."
      ],
      "connections": [
        {
          "ref": "transformers/kv-cache",
          "text": "The cache is what GQA exists to shrink - that lesson derives why the cache is necessary and how its size and bandwidth dominate decode latency."
        },
        {
          "ref": "transformers/multi-head-attention",
          "text": "GQA is a direct modification of that operator: keep the query heads, share the key/value heads. Understanding why heads specialize is what makes the asymmetry sensible."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Cache size scales linearly with context length, so GQA is one component of long-context serving alongside paged attention, cache quantization, and windowed attention."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The whole justification is serving economics - batch size, throughput, and tokens-per-second - which is where the architectural decision is actually evaluated."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is multi-query attention (MQA)?",
          "a": "All query heads share a SINGLE key head and value head. Cache shrinks by a factor of h (the head count), at a measurable quality cost."
        },
        {
          "q": "What is grouped-query attention (GQA)?",
          "a": "Query heads are partitioned into g groups, each group sharing one KV head. g=h is standard MHA, g=1 is MQA; intermediate g interpolates."
        },
        {
          "q": "What problem do they solve?",
          "a": "KV cache size at inference. The cache is proportional to n_kv_heads, and at long context or high batch it exceeds the model weights and dominates decode bandwidth."
        },
        {
          "q": "What is the KV cache formula?",
          "a": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. The 2 is for K and V. Note query head count does NOT appear."
        },
        {
          "q": "How much does LLaMA-2 70B save?",
          "a": "64 query heads with 8 KV groups = 8x smaller cache: ~21.5 GB down to ~2.7 GB at 4K context, batch 1, fp16."
        },
        {
          "q": "Does GQA reduce FLOPs?",
          "a": "Barely. After repeat_kv the attention matmuls are full-size; only the KV projection parameters shrink. The win is cache memory and bandwidth."
        },
        {
          "q": "Does GQA speed up training?",
          "a": "Essentially no - training processes the sequence in parallel with no cache. The benefit is at inference."
        },
        {
          "q": "Why is sharing K and V acceptable but sharing Q is not?",
          "a": "Query heads carry the DIVERSITY of attention patterns (each asks a different question); K/V are closer to a shared representation of what is at each position, which several queries can read differently."
        },
        {
          "q": "What is uptraining?",
          "a": "Converting an existing MHA checkpoint to GQA by mean-pooling KV heads within each group, then continuing training on ~5% of the original tokens to recover quality."
        },
        {
          "q": "Why did GQA beat MQA?",
          "a": "MQA's quality drop is real and it trained less stably; GQA-8 captures nearly all of the memory benefit with essentially no quality cost."
        },
        {
          "q": "Does GQA solve long context?",
          "a": "No - it divides the cache by a constant, but the cache still grows linearly with T. It is one component alongside paged attention, cache quantization, and windowed attention."
        },
        {
          "q": "What is repeat_kv?",
          "a": "The implementation step that expands g cached KV heads to h for the attention matmul, so the math matches standard multi-head attention while the cache stores only g."
        }
      ],
      "standard": [
        {
          "q": "Explain the KV cache problem and how MQA and GQA address it.",
          "a": "WHY THE CACHE EXISTS. In autoregressive generation you produce one token at a time. Naively, generating token t would require re-running attention over the whole prefix, recomputing keys and values for every earlier position - O(T^2) work per token and O(T^3) for the sequence. But keys and values for past positions do not change (they depend only on those positions' hidden states), so you CACHE them: each step computes K and V only for the new token, appends them, and attends against the whole cache. That takes per-token cost from O(T^2) to O(T) and is non-negotiable for practical generation. THE PROBLEM THE CACHE CREATES. Its size is 2 * n_layers * n_kv_heads * d_k * T * batch * bytes_per_element. Two consequences. (1) MEMORY: for LLaMA-2 70B (80 layers, 64 heads, d_k=128) at 4K context in fp16, that is ~21.5 GB per SEQUENCE. At batch 32 it would be ~690 GB - far beyond any node, while the model weights are ~140 GB. So the cache, not the weights, is what limits batch size, and batch size is what determines serving throughput. (2) BANDWIDTH: decoding is memory-bandwidth-bound. Generating one token requires reading the entire cache (plus all the weights) to do a small amount of arithmetic, so tokens-per-second is roughly bounded by (bytes to read) / (memory bandwidth). Halving the cache nearly halves the read volume at long context. THE FIX - SHARE KEY/VALUE HEADS. Notice the formula contains n_kv_heads but NOT the number of query heads. So you can keep all the query heads (where the diversity of attention patterns lives) and reduce only the K/V heads. MQA (Shazeer, 2019) takes this to the limit: ONE key head and one value head shared by all query heads, an h-fold reduction. GQA (Ainslie et al., 2023) generalizes: g groups of query heads, each sharing one KV head, giving an h/g reduction with g as a tunable dial. WHY SHARING K/V IS ACCEPTABLE. The intuition is asymmetry: each query head asks a different QUESTION ('what is the subject of this verb?', 'what token preceded this one?'), so query diversity is where the representational value is. Keys and values are closer to a shared description of what exists at each position, which several different questions can reasonably read from. Empirically this holds up - Ainslie et al.'s uptrained T5-XXL results show MHA at 47.2 average, GQA-8 at 47.1 (a rounding error), and MQA at 46.6 (a real drop). So GQA-8 is close to free while MQA is not. THE PRACTICAL DETAILS THAT MATTER. (a) It does NOT reduce FLOPs meaningfully - after repeat_kv the attention matmuls are full size. The win is memory and bandwidth, which is exactly what decode is limited by. (b) It does NOT help training, where the sequence is processed in parallel with no cache. (c) UPTRAINING makes it retrofittable: mean-pool an existing model's KV heads within each group as initialization, then continue training on ~5% of the original token budget to recover quality - which is why GQA spread so quickly, since labs did not have to pretrain from scratch. (d) It does not solve long context on its own, since the cache is still linear in T - an 8x reduction buys 8x the length at fixed memory, so a 32K GQA-8 model costs what 4K MHA cost. WHERE THIS SITS IN THE STACK: GQA is one of four standard cache optimizations, alongside PAGED ATTENTION (vLLM - eliminate the fragmentation from pre-allocating max-length caches, typically a several-fold effective batch improvement), CACHE QUANTIZATION (int8 KV, another 2x), and WINDOWED or evicting caches for very long contexts. They compose, and a production system uses all of them.",
          "deepDive": {
            "q": "Multi-head latent attention (MLA) claims to beat GQA. How does it work, and what is the trade-off?",
            "a": "THE IDEA. MLA (introduced in DeepSeek-V2, refined in V3) attacks the same problem from a different angle: instead of REDUCING THE NUMBER of key/value heads, it COMPRESSES what is cached. Keys and values are projected down into a shared low-rank LATENT vector, and only that latent is stored in the cache; the full per-head keys and values are RECONSTRUCTED on the fly by up-projection during attention. So the cache holds a compressed representation rather than fewer heads. WHY THAT IS BETTER IN PRINCIPLE. GQA is a crude form of compression - it forces groups of heads to share exactly the same K/V, which is a hard structural constraint. MLA lets the model LEARN what to keep, using a low-rank bottleneck that can retain the components that matter most across all heads. So for the same cache budget you can preserve more information, or for the same quality you can use a smaller cache. DeepSeek reports MLA achieving a cache smaller than GQA's while matching or exceeding full multi-head attention quality - which is the claim that made it notable, since GQA at best matches MHA. THE KEY IMPLEMENTATION TRICK, which is where the cleverness lies: naively you would decompress the latent into full K and V at every step, which costs extra compute per token and could erase the bandwidth win. Instead, the up-projection matrices can be ABSORBED into the query and output projections (matrix associativity: (W_up^K)^T inside the q-k dot product can be folded into W_Q), so at inference you never materialize the full K/V - you compute attention directly against the compressed latent with modified query projections. That is what makes it cheap rather than a compute-for-memory trade. THE COMPLICATION - RoPE. Rotary embeddings are applied to keys and queries in a position-dependent way, which breaks the absorption trick: you cannot fold a position-dependent rotation into a static matrix. DeepSeek's solution is DECOUPLED RoPE - split the head dimension into a compressed part (no RoPE, absorbed) and a small separate part that carries RoPE and is cached uncompressed. It works but it is genuinely fiddly, and this interaction is the main reason MLA is harder to implement than GQA. THE TRADE-OFFS, stated honestly. (a) COMPLEXITY: GQA is a five-line change to an attention implementation; MLA requires the low-rank projections, the absorption arithmetic, and the decoupled-RoPE handling. That matters enormously for ecosystem adoption - every inference framework supports GQA, whereas MLA needs bespoke kernels. (b) COMPUTE: MLA adds projection work, so it trades a little arithmetic for memory - usually a good trade in a bandwidth-bound decode regime, but it means MLA can be slower in compute-bound prefill. (c) EVIDENCE BASE: GQA has been validated by many labs across many models; MLA's evidence is strong but concentrated in DeepSeek's models, so the independent replication base is thinner. (d) NOT RETROFITTABLE the way GQA is - you cannot mean-pool your way to MLA from an existing checkpoint as easily, so it is a pretraining-time decision. WHAT I WOULD CONCLUDE: MLA is the more principled solution - learned low-rank compression strictly generalizes 'force heads to share' - and its results are genuinely impressive. GQA remains the pragmatic default because it is trivial to implement, universally supported by serving frameworks, retrofittable by uptraining, and already captures most of the available win. This is a good example of the recurring pattern where the better idea loses on ecosystem effects until the tooling catches up, and it is worth watching whether MLA (or something like it) becomes standard as kernel support matures."
          }
        },
        {
          "q": "Why can you share keys and values across heads but not queries? What does that tell you about attention?",
          "a": "THE ASYMMETRY, stated first: query heads carry the DIVERSITY of the operation; key and value heads carry a shared description of the content. Sharing the latter costs little; sharing the former would collapse the whole point of multi-head attention. WHY QUERIES MUST STAY DISTINCT. Each query head defines what the position is LOOKING FOR - its own projection into a subspace, i.e. its own notion of 'relevant'. If all heads shared one query projection, every head would compute the SAME attention distribution (given shared K), and multi-head attention would degenerate to single-head attention with a wider value space. The entire motivation - one head tracks syntactic subjects, another tracks the previous token, another does coreference - depends on the queries differing. So query diversity is the mechanism, not an incidental detail. WHY KEYS AND VALUES CAN BE SHARED. Keys and values describe WHAT IS AT each position - a representation of that token's content in a form other positions can match against and retrieve. There is a plausible sense in which one good content representation can serve many different questions: the key vector says 'this position contains a noun phrase referring to a person', and different query heads can match against different aspects of that same description. The empirical result supports this - Ainslie et al. found GQA-8 essentially matching full multi-head attention (47.1 vs 47.2 on their benchmark average), so eight KV heads suffice for sixty-four query heads. WHAT IT TELLS YOU ABOUT ATTENTION - three inferences. (1) THE INFORMATION IN K/V IS LOWER-RANK THAN THE HEAD COUNT SUGGESTS. If sixty-four distinct key/value projections can be compressed to eight with no measured loss, then the per-head K/V projections in a trained MHA model were substantially redundant. That is consistent with the head-pruning literature (most heads are removable) and with MLA's success at low-rank cache compression - all three point at the same conclusion, that the K/V side of attention is over-parameterized. (2) THE 'RETRIEVAL' FRAMING IS APT. Attention behaves like a soft dictionary lookup: keys index content, values are the content, queries are the lookup requests. In a database you do not need a separate index per query type - you need a good index and many query patterns. GQA is exactly that intuition made architectural. (3) IT LOCATES WHERE CAPACITY MATTERS. If you have a fixed budget, spend it on query diversity (many heads asking different questions) rather than on K/V capacity. That is a non-obvious design principle, and it is the actionable content of the result. THE LIMITS OF THE ASYMMETRY, for honesty: it is not free. MQA (g=1) does show a real quality drop, so there IS information in having multiple K/V heads - just less than in having multiple query heads. And the tolerable grouping factor likely depends on scale and task; GQA-8 is a convention validated at particular model sizes, not a proven optimum. A GOOD FOLLOW-UP TO ANTICIPATE: 'could you share queries instead and keep K/V distinct?' The answer is that it would not help - the cache stores K and V, not Q (queries are computed fresh for each new token and discarded), so sharing queries would save nothing at inference while destroying the head diversity that makes attention work. That the optimization targets exactly the tensors that get cached, and leaves the others alone, is what makes GQA an elegant fit to the actual constraint rather than a generic compression."
        },
        {
          "q": "You are deploying a 70B model with 32K context for many concurrent users. Walk through the memory budget.",
          "a": "I would lay out the three consumers of GPU memory, then optimize the one that binds. THE BUDGET. (1) WEIGHTS: 70B parameters at fp16 is 140 GB; at int8 ~70 GB; at int4 ~35 GB. This is FIXED cost, paid once regardless of how many users you serve - so it amortizes with batch size. (2) KV CACHE: 2 * n_layers * n_kv_heads * d_k * T * batch * bytes. For LLaMA-2-70B geometry (80 layers, d_k 128) with GQA-8 at 32K context in fp16: 2*80*8*128*32768*2 bytes = ~21.5 GB PER SEQUENCE. With full MHA (64 KV heads) it would be ~172 GB per sequence - a single user would not fit on an 8xA100 node. This scales with BOTH context length and batch, and it is the variable cost. (3) ACTIVATIONS: transient per-token working memory during the forward pass, modest for decode (a few hundred MB) but significant during PREFILL of a long prompt, where you process many tokens at once. THE ARITHMETIC ON A CONCRETE NODE. Take 8xA100-80GB = 640 GB total. Weights at fp16: 140 GB, leaving ~500 GB minus framework overhead, say ~450 GB usable for cache. At 21.5 GB per sequence at full 32K, that is about 20 concurrent sequences. That number is the entire answer to 'how many users can I serve', and it is set by the cache, not the weights. THE OPTIMIZATIONS, in order of impact. (a) QUANTIZE THE WEIGHTS to int8 or int4: frees 70-105 GB for cache, taking us to ~25-30 concurrent sequences, and speeds decode (bandwidth-bound on weight reads). Usually the first move. (b) PAGED ATTENTION (vLLM): the naive implementation pre-allocates the full max-length cache per sequence, so a user who sends a 2K prompt and generates 500 tokens still occupies 32K worth of cache. Paged attention allocates in blocks on demand, eliminating that internal fragmentation - typically a 2-4x improvement in effective batch size, and it is nearly free. Usually the largest single win. (c) QUANTIZE THE KV CACHE to int8: another 2x on the dominant term, with small quality cost (per-channel or per-token scaling matters here). (d) CONTINUOUS BATCHING: schedule at the token level so finished sequences release memory immediately and new requests join without waiting for a batch boundary - large throughput gains under real traffic patterns. (e) PREFIX CACHING: if many requests share a system prompt, compute its KV once and share it - can be a huge win for chat products with a long shared preamble. (f) EXPLOIT THE ACTUAL LENGTH DISTRIBUTION: most requests do not use the full 32K. Provisioning for the P95 rather than the maximum, with admission control for the rare long ones, is often worth more than any technical optimization. THE ARCHITECTURAL DECISION IF I OWNED THE MODEL: GQA is already assumed above and is non-negotiable at this context length - without it, one user needs 172 GB and the deployment is impossible. If designing from scratch I would also evaluate MLA for a further cache reduction, and consider a sliding-window or hybrid attention pattern if the workload does not genuinely need full 32K attention. WHAT I WOULD MEASURE, because a memory budget is a means not an end: tokens/second per user (latency, driven by bandwidth), total tokens/second across the node (throughput, driven by batch size), time-to-first-token (prefill, driven by compute and by prompt length), and the P95 of each under realistic traffic. The tension to name explicitly is that larger batches raise throughput but also raise per-user latency, so the operating point is a product decision - a chat UI needs low TTFT and steady streaming, while a batch summarization job wants maximum throughput and does not care about latency at all."
        },
        {
          "q": "What is uptraining, and why does it matter for GQA adoption?",
          "a": "THE PROBLEM IT SOLVES. GQA is an architectural change, and normally that means pretraining from scratch - which for a 70B model is millions of dollars and months of compute. If the only way to get GQA were to retrain, adoption would have been slow and limited to labs starting new models. Uptraining removes that barrier. THE PROCEDURE (Ainslie et al., 2023). (1) CONVERT: take an existing multi-head checkpoint with h key/value heads. Partition them into g groups. For each group, MEAN-POOL the key projection matrices and, separately, the value projection matrices, producing one K and one V projection per group. Mean pooling (rather than picking one head, or random initialization) is the important detail - it preserves the average behaviour of the group and gives a much better starting point. (2) UPTRAIN: continue pretraining the converted model on the ORIGINAL pretraining distribution for a small fraction of the original token budget - the paper used about 5%. Quality recovers to near the original model's level. So for roughly 5% of the pretraining cost, you convert an MHA model into a GQA model with an 8x smaller cache. WHY MEAN POOLING WORKS. The converted model must produce sensible attention immediately or the continued training would be closer to retraining. Mean-pooling the KV projections means each group's shared key is the average of what those heads previously computed, so query heads in that group see a blurred but structurally correct version of what they expect. Since (per the previous question) the K/V side is substantially redundant across heads, the averaged version loses less than you would fear, and a small amount of training lets the query heads adapt to it. WHY IT MATTERED FOR ADOPTION - the practical significance. (a) It let labs ship GQA versions of models they had ALREADY trained, so the technique spread within months rather than model generations. (b) It made the quality claim credible: because you can convert the SAME checkpoint and compare, the MHA-vs-GQA-vs-MQA comparison is controlled - same data, same pretraining, only the attention structure differs. That is a much stronger experimental design than comparing separately-pretrained models, and it is why the 47.2 / 47.1 / 46.6 numbers are persuasive. (c) It reduced the risk of adopting GQA for a new pretraining run, since the technique had been validated cheaply first. THE GENERAL PATTERN worth naming, because it transfers: 'convert an existing checkpoint with a sensible initialization, then briefly continue training' is a broadly applicable recipe for architectural changes, and you see the same move elsewhere - I3D's inflation of 2D ImageNet weights into a 3D video network (copy kernels across time, divide by the temporal extent), position-interpolation for extending RoPE context (rescale positions, fine-tune briefly), and depth/width expansion techniques like Net2Net that grow a trained model. In each case the trick is finding an initialization under which the new architecture initially COMPUTES SOMETHING CLOSE TO the old one, so training only has to repair rather than relearn. If asked to design a conversion for some other architectural change, that is the principle to apply: find the initialization that makes the new model a near-identity transformation of the old, then train briefly."
        },
        {
          "q": "GQA reduces the KV cache by a constant factor. What do you do when that is not enough?",
          "a": "GQA divides the cache by h/g, but the cache is still LINEAR in sequence length and batch - so at 128K context or high concurrency the problem returns. There are five further families of answers, and a production system usually combines several. (1) COMPRESS THE CACHE'S REPRESENTATION. KV QUANTIZATION to int8 or int4 gives another 2-4x with modest quality cost; the practical details matter (per-token or per-channel scaling, and keys are typically more sensitive than values, so asymmetric precision - int8 keys, int4 values - is common). MLA (DeepSeek) compresses K/V into a learned low-rank latent and caches only that, achieving a smaller cache than GQA while matching full-attention quality; it is more principled than head-sharing but requires bespoke kernels and careful RoPE handling. (2) MANAGE THE MEMORY BETTER RATHER THAN SHRINKING IT. PAGED ATTENTION (vLLM) is the biggest practical win in this category: allocating cache in fixed-size blocks on demand eliminates the internal fragmentation of pre-allocating max-length caches per sequence, typically improving effective batch size several-fold with no quality cost at all. Prefix sharing (one copy of a shared system prompt's cache across requests) is similarly free when the workload has a common preamble. (3) STORE LESS OF THE SEQUENCE. SLIDING-WINDOW attention (Mistral) keeps only the last W tokens per layer, making the cache constant-size regardless of length, with information propagating further through depth. ATTENTION SINKS / StreamingLLM adds the crucial fix that you must retain the first few tokens - models dump attention mass onto initial tokens, and evicting them destroys the distribution. EVICTION policies (H2O and similar) keep the tokens that have historically received the most attention and drop the rest. All of these are LOSSY: you are betting that distant detail is not needed, which is fine for streaming chat and wrong for long-document retrieval. (4) CHANGE WHERE THE MEMORY LIVES. Offload cold parts of the cache to CPU memory or NVMe and stream them back (with the obvious bandwidth cost), or recompute rather than store - trading compute for memory by dropping cache for some layers and recomputing on demand. Both are last resorts, used when a request must be served at all rather than served fast. (5) AVOID THE LONG CONTEXT ENTIRELY - frequently the correct engineering answer. RETRIEVAL (chunk the corpus, retrieve the relevant pieces, keep the prompt short) is usually cheaper AND more accurate than stuffing a huge context, because models exhibit the 'lost in the middle' degradation and long-context accuracy is often far below nominal support. Summarize-and-carry-forward for long conversations does the same thing for chat. HOW I WOULD SEQUENCE IT for a real deployment: paged attention and continuous batching first (largest win, zero quality cost), then weight quantization, then KV quantization, then evaluate whether the workload genuinely needs full-context attention - and if it does not, move to retrieval or a windowed scheme rather than paying for capability nobody uses. The architectural options (MLA, different attention patterns) only apply if you control pretraining. THE MEASUREMENT that should drive the decision: profile the actual context-length distribution of your traffic. Provisioning for a 128K worst case when P95 is 8K is the most common and most expensive mistake in this area, and fixing it requires no technology at all."
        },
        {
          "q": "This architecture change was driven by inference cost rather than model quality. Is that unusual, and what does it signal?",
          "a": "It IS somewhat unusual historically, and it signals a real shift in where the field's constraints live - which makes it a good question to think about carefully. THE HISTORICAL PATTERN. Most architectural innovations were justified by QUALITY or by TRAINABILITY: residual connections made depth trainable, attention beat recurrence on translation quality, BatchNorm and pre-norm made optimization stable, transformers replaced RNNs partly for quality and partly for training parallelism. Inference cost was a downstream concern handled by compression - quantize, prune, distill - AFTER the architecture was fixed. WHAT IS DIFFERENT ABOUT GQA. It makes the model slightly WORSE (or at best equal) in quality and is adopted anyway, because the serving economics dominate. That inverts the usual ordering: the architecture is being designed around deployment constraints at pretraining time, accepting a quality cost to get a memory win. MQA's larger quality drop being rejected while GQA's negligible one was accepted shows the field pricing the trade-off explicitly. WHY THE SHIFT HAPPENED - three causes. (1) INFERENCE NOW DOMINATES LIFETIME COST. A frontier model is trained once and then serves billions of requests; at scale, cumulative inference compute exceeds training compute, often by a lot. A 10% serving cost reduction is worth more than a 1% quality gain for most deployed products. (2) THE BOTTLENECK MOVED TO MEMORY BANDWIDTH. Decode is bandwidth-bound, not compute-bound, so the levers that matter are ones that move fewer bytes - which is exactly what GQA, quantization, and MLA do, and NOT what more FLOPs-efficient architectures do. Architecture design has had to follow the actual hardware constraint. (3) LONG CONTEXT BECAME A PRODUCT REQUIREMENT. Cache size scales linearly with context, so supporting 128K context is not achievable by tuning a serving stack alone - it forces an architectural response. WHAT ELSE THIS EXPLAINS, which shows the pattern is broad rather than a one-off: MoE (parameters that are not read per token - a serving-driven design), speculative decoding (an inference-time algorithm that changes nothing about the model), quantization-aware architecture choices (EfficientNet-Lite removing squeeze-and-excitation and h-swish because they quantize badly on mobile accelerators; modern LLMs avoiding operations that break int8 kernels), and hardware-aware NAS optimizing measured latency rather than FLOPs. In vision the same shift happened earlier, when mobile deployment forced MobileNet-style design. WHAT IT SIGNALS ABOUT THE FIELD, and the framing I would offer: machine learning architecture is becoming a SYSTEMS discipline, where the design objective is quality-per-dollar-served rather than quality alone. The practical implication for anyone building models is that 'what does this cost to serve?' belongs in the design conversation from the start, not after the model works - and the interview-relevant version is that a candidate who can only discuss benchmark quality is missing half of what determines whether a model ships. THE COUNTERWEIGHT, for balance: this can go too far. Optimizing hard for current hardware risks overfitting the architecture to a transient constraint - if memory bandwidth improves dramatically, or if a different accelerator design becomes dominant, some of these choices become unnecessary baggage. The components with PRINCIPLED justifications (pre-norm, RoPE) will likely outlast the ones with purely economic ones (GQA), and it is worth being clear-eyed about which is which."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "KV cache size",
        "back": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. The 2 = K and V. Query head count does NOT appear - which is exactly the asymmetry GQA exploits."
      },
      {
        "type": "definition",
        "front": "MQA vs GQA",
        "back": "MQA: ALL query heads share ONE K/V head (h-fold cache reduction, real quality drop). GQA: g groups of query heads each share one K/V head (h/g reduction). g=h is MHA, g=1 is MQA."
      },
      {
        "type": "intuition",
        "front": "Why share K/V but not Q",
        "back": "Query heads carry the DIVERSITY (each asks a different question); K/V are a shared description of what is at each position. Also: the cache stores K and V, not Q - sharing queries would save nothing."
      },
      {
        "type": "formula",
        "front": "LLaMA-2 70B GQA numbers",
        "back": "64 query heads, 8 KV groups = 8x cache reduction: ~21.5 GB -> ~2.7 GB at 4K context, batch 1, fp16 (80 layers, d_k=128). Weights are ~140 GB, so at batch 32 the un-grouped cache would dwarf them."
      },
      {
        "type": "pitfall",
        "front": "GQA does not reduce FLOPs or help training",
        "back": "After repeat_kv the attention matmuls are full-size, and training has no cache at all. The win is inference MEMORY and BANDWIDTH - which is what decode is limited by."
      },
      {
        "type": "definition",
        "front": "Uptraining",
        "back": "Convert an MHA checkpoint to GQA by MEAN-POOLING the K/V heads within each group, then continue pretraining on ~5% of the original tokens. Makes GQA retrofittable and gives a controlled MHA/GQA/MQA comparison."
      },
      {
        "type": "intuition",
        "front": "Measured quality cost",
        "back": "Ainslie et al. (uptrained T5-XXL): MHA 47.2, GQA-8 47.1, MQA 46.6. GQA is essentially free; MQA costs real quality and trained less stably - which is why GQA, not MQA, became standard."
      },
      {
        "type": "pitfall",
        "front": "GQA does not solve long context",
        "back": "The cache is still LINEAR in T - an 8x reduction buys 8x the length at fixed memory. 32K with GQA-8 costs what 4K cost with MHA. Combine with paged attention, KV quantization, or windowed attention."
      },
      {
        "type": "definition",
        "front": "MLA (multi-head latent attention)",
        "back": "DeepSeek's alternative: compress K/V into a learned LOW-RANK latent and cache only that, with up-projections absorbed into W_Q/W_O. Smaller cache than GQA at MHA quality; costs implementation complexity and needs decoupled RoPE."
      },
      {
        "type": "intuition",
        "front": "What GQA signals",
        "back": "An architecture change adopted for INFERENCE ECONOMICS at a small quality cost - inference now dominates lifetime compute, and decode is bandwidth-bound. Same force behind MoE, speculative decoding, and quantization-aware design."
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
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention (vLLM)",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "DeepSeek-AI (2024), DeepSeek-V2 (multi-head latent attention)",
        "url": "https://arxiv.org/abs/2405.04434"
      }
    ],
    "demos": [
      "kv-cache",
      "multi-head-attention",
      "paged-attention"
    ],
    "demoTitles": {
      "kv-cache": "KV Cache",
      "multi-head-attention": "Multi-Head Attention",
      "paged-attention": "PagedAttention"
    }
  }
};
