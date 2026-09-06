// GENERATED from content/lessons/transformers/kv-cache.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/kv-cache/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "kv-cache": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Training and generation look like the same computation and are not. In TRAINING, the whole sequence is available, so every position is processed in parallel in one forward pass - which is the property that made transformers scalable in the first place. In GENERATION you have only what you have produced so far, so tokens come out one at a time, each requiring its own forward pass. Done naively, generating token t re-runs the model over the entire prefix, recomputing keys and values for every earlier position - and since those recomputations are identical every step, producing a sequence of length T costs O(T^3) work instead of O(T^2).",
        "The KV CACHE removes the redundancy with one observation: a token's key and value depend only on that token's hidden state, which never changes once computed. So store them. Each new step computes K and V for the new token only, appends them to the cache, and attends against everything stored. Per-token cost drops from O(T^2) to O(T), and generation becomes practical. Every inference stack does this; it is not an optimization so much as a precondition.",
        "The cache then becomes the dominant engineering problem, and this is where the topic gets interesting. Its size is 2 x layers x kv_heads x head_dim x sequence_length x batch, which at long context or high concurrency EXCEEDS the model weights - and because decoding reads the whole cache to produce each token, cache size translates almost directly into tokens-per-second. That single fact drives an entire architectural and systems agenda: GQA and MLA shrink it, paged attention stops wasting it, quantization compresses it, eviction and sliding windows bound it, and prefix caching shares it. It also explains the sharp asymmetry between PREFILL (processing the prompt - parallel, compute-bound) and DECODE (one token at a time - sequential, memory-bandwidth-bound), which is the single most important distinction in LLM serving."
      ],
      "math": [
        {
          "h": "Cost with and without the cache",
          "paras": [
            "Without a cache, step t redoes the whole prefix, so the total is the sum of t^2 over all steps. With a cache, step t attends against t cached positions and computes only one new key/value, so the total is the sum of t. The cache turns a cubic into a quadratic - and per token, a quadratic into a linear."
          ],
          "tex": "\\underbrace{\\sum_{t=1}^{T} \\Theta(t^2 d) = \\Theta(T^3 d)}_{\\text{no cache}} \\qquad\\longrightarrow\\qquad \\underbrace{\\sum_{t=1}^{T} \\Theta(t d) = \\Theta(T^2 d)}_{\\text{with cache}}",
          "texNote": "Per-token: O(T^2 d) without the cache versus O(T d) with it. The quadratic total remains because attending to a growing prefix is inherently linear per token - the cache removes the redundant RECOMPUTATION, not the attention itself."
        },
        {
          "h": "Cache size, and why it decides throughput",
          "paras": [
            "The cache stores K and V for every layer, every KV head, and every position, for each sequence in the batch. Because decoding must READ all of it to emit one token, and decode is bandwidth-bound, tokens-per-second is roughly bounded by (bytes read) / (memory bandwidth) - so this formula is simultaneously a memory budget and a latency model."
          ],
          "tex": "\\text{bytes} = 2 \\cdot n_{\\text{layers}} \\cdot n_{\\text{kv heads}} \\cdot d_k \\cdot T \\cdot B \\cdot s, \\qquad \\text{tokens/s} \\lesssim \\frac{\\text{bandwidth}}{\\text{weights} + \\text{cache bytes read}}",
          "texNote": "s = bytes per element (2 for fp16, 1 for int8). Note n_kv_heads, not n_query_heads - the asymmetry GQA exploits. LLaMA-2 70B at 4K context, fp16, batch 1: ~21.5 GB with 64 KV heads, ~2.7 GB with 8 GQA groups."
        }
      ],
      "code": [
        {
          "h": "A cached generation loop, and the test that validates it",
          "paras": [
            "The structure every inference stack has: a PREFILL pass over the whole prompt, then a DECODE loop feeding one token at a time. The assertion at the end is the invariant worth building every cache implementation against - cached incremental generation must match a single full-sequence forward pass."
          ],
          "code": "import torch\n\nclass KVCache:\n    def __init__(self, n_layers):\n        self.k = [None] * n_layers\n        self.v = [None] * n_layers\n    def update(self, layer, k_new, v_new):        # k_new: (B, n_kv, 1, d_k) at decode\n        if self.k[layer] is None:\n            self.k[layer], self.v[layer] = k_new, v_new\n        else:\n            self.k[layer] = torch.cat([self.k[layer], k_new], dim=2)\n            self.v[layer] = torch.cat([self.v[layer], v_new], dim=2)\n        return self.k[layer], self.v[layer]\n\n@torch.no_grad()\ndef generate(model, prompt_ids, max_new=64):\n    cache = KVCache(model.n_layers)\n    logits = model(prompt_ids, cache=cache)            # PREFILL: all prompt tokens at once\n    out = [logits[:, -1].argmax(-1, keepdim=True)]\n    for _ in range(max_new - 1):                       # DECODE: one token per pass\n        logits = model(out[-1], cache=cache)           # feed ONLY the newest token\n        out.append(logits[:, -1].argmax(-1, keepdim=True))\n    return torch.cat(out, dim=1)\n\n# THE INVARIANT: cached incremental generation == one full-sequence forward pass.\nseq = torch.cat([prompt_ids, generated], dim=1)\nfull = model(seq).logits                               # no cache, whole sequence\nassert torch.allclose(full[:, -1], cached_last_logits, atol=1e-4)\n# This single test catches nearly every cache bug: wrong positions, re-applied RoPE,\n# off-by-one between prefill and decode, and mask misalignment.",
          "caption": "Prefill processes the prompt in one parallel pass; decode feeds one token at a time and appends to the cache. The equivalence assertion - cached generation must match a full-sequence forward - is the test that catches virtually every cache implementation bug."
        },
        {
          "h": "The two phases have completely different bottlenecks",
          "paras": [
            "This table is the practical core of the topic. Prefill is compute-bound and parallel; decode is bandwidth-bound and sequential. Optimizations that help one frequently do nothing for the other, which is why serving systems treat them as separate problems."
          ],
          "code": "# 7B model, fp16, A100 (80GB, ~2 TB/s bandwidth, ~312 TFLOP/s):\n#\n#              PREFILL (2000-token prompt)      DECODE (per token)\n#   parallel?   all 2000 tokens at once          strictly sequential\n#   bound by    COMPUTE (~2*7e9*2000 FLOPs)      BANDWIDTH (read 14 GB of weights)\n#   utilization high (~50-70% of peak)           terrible (~1-3% of peak FLOPs)\n#   latency     ~200 ms (time-to-first-token)    ~7 ms/token (~140 tok/s)\n#   fix with    FlashAttention, more FLOPs       quantization, batching, speculation\n#\n# Why decode is so inefficient at batch 1: reading 14 GB of weights to do ~14 GFLOPs\n# is ~1 FLOP per byte - two orders of magnitude below the roofline knee. The fix is\n# BATCHING (amortize the weight read over many sequences) - which is why throughput\n# and per-user latency are in tension, and why continuous batching matters so much.\n\n# arithmetic intensity, decode, batch B:  ~B FLOPs per byte of weights\n#   B=1   -> hopeless   B=32  -> better   B=128 -> approaching compute-bound",
          "caption": "Prefill is compute-bound and parallel; decode is bandwidth-bound and sequential, running at a tiny fraction of peak FLOPs at batch 1. Batching is what fixes decode's arithmetic intensity - hence the throughput-versus-latency tension at the heart of LLM serving."
        }
      ],
      "useCases": [
        "Every deployed LLM: the cache is what makes autoregressive generation tractable at all, so every inference stack (vLLM, TensorRT-LLM, llama.cpp, SGLang) is organized around managing it.",
        "Capacity planning: the cache formula tells you how many concurrent sequences fit in a given amount of GPU memory, which is the number that determines serving cost per token - usually the first calculation in an LLM system-design interview.",
        "Prefix caching in products: chat applications with a long shared system prompt, few-shot prompts reused across requests, and agent loops that replay a growing history can compute the shared prefix's cache once and reuse it, often the single largest latency win available.",
        "Explaining why decoding is slow: the prefill/decode asymmetry is why time-to-first-token and tokens-per-second have different causes and different fixes, and why speculative decoding (which converts sequential decode into a parallel verify) works at all."
      ],
      "pitfalls": [
        "Re-applying position information to cached entries: keys are cached already carrying their original positional rotation or encoding, and re-rotating the whole cache each step silently destroys long-range behaviour. Test with the full-sequence equivalence assertion.",
        "Off-by-one between prefill and decode: the first generated token is at position T, not T-1. Getting this wrong usually still produces fluent text, so it can go unnoticed while quietly degrading quality.",
        "Pre-allocating the cache at maximum sequence length: a request with a 200-token prompt then occupies 32K worth of cache, wasting most of the memory. This internal fragmentation is exactly what paged attention eliminates, typically several-fold effective batch improvement.",
        "Assuming FlashAttention solves cache memory: it removes the attention MATRIX during compute, which is a separate quantity. The cache is untouched by it and remains linear in sequence length and batch.",
        "Optimizing throughput and latency as if they were one goal: batching raises tokens-per-second for the system while raising time-per-token for each user. The operating point is a product decision, and reporting a single 'speed' number hides it."
      ],
      "connections": [
        {
          "ref": "transformers/gqa-mqa",
          "text": "Grouped-query attention exists specifically to shrink this cache - the formula's n_kv_heads term is the lever, and an 8x reduction is what makes long-context serving feasible."
        },
        {
          "ref": "transformers/rope",
          "text": "Cached keys carry the rotation for their original positions, which is why the most common cache bug is re-applying RoPE to the whole cache each step."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "Speculative decoding attacks the other side of the same asymmetry: it turns several sequential decode steps into one parallel verification pass, with identical output distribution."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Continuous batching, paged attention, and prefix sharing are serving-layer solutions to cache management, and usually give larger wins than any model-level change."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the KV cache?",
          "a": "Stored keys and values for all previously-processed tokens, so each new token computes only its own K and V and attends against the cache instead of recomputing the prefix."
        },
        {
          "q": "Why is it valid to cache them?",
          "a": "A token's key and value depend only on that token's hidden state, which does not change as later tokens are generated (guaranteed by causal masking)."
        },
        {
          "q": "What does it save?",
          "a": "Per-token cost drops from O(T^2) to O(T); total generation cost from O(T^3) to O(T^2)."
        },
        {
          "q": "Why are queries not cached?",
          "a": "A query is used once, at the step that creates it - only keys and values are consulted by FUTURE tokens."
        },
        {
          "q": "What is the cache size formula?",
          "a": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes_per_element. The 2 is K and V; note it uses KV heads, not query heads."
        },
        {
          "q": "What is prefill vs decode?",
          "a": "Prefill processes the whole prompt in one parallel pass (compute-bound). Decode generates one token per forward pass (sequential, memory-bandwidth-bound)."
        },
        {
          "q": "Why is decode so inefficient at batch 1?",
          "a": "It reads every weight to do a tiny amount of arithmetic - roughly 1 FLOP per byte, far below the roofline knee, so the GPU runs at a few percent of peak FLOPs."
        },
        {
          "q": "What fixes decode's inefficiency?",
          "a": "Batching (amortize weight reads over many sequences), quantization (fewer bytes to read), MoE (read only routed experts), and speculative decoding."
        },
        {
          "q": "What is paged attention?",
          "a": "vLLM's technique of allocating the cache in fixed-size blocks on demand rather than pre-allocating max length per sequence, eliminating internal fragmentation - typically several-fold more effective batch."
        },
        {
          "q": "What is prefix caching?",
          "a": "Computing the KV cache for a shared prompt prefix once and reusing it across requests - a large win for chat systems with a long common system prompt."
        },
        {
          "q": "What is time-to-first-token driven by?",
          "a": "Prefill: prompt length and compute. Tokens-per-second afterwards is driven by decode: weight and cache bandwidth. Different causes, different fixes."
        },
        {
          "q": "What is the single best test for a cache implementation?",
          "a": "Cached incremental generation must produce the same logits as one full-sequence forward pass over the same tokens."
        }
      ],
      "standard": [
        {
          "q": "Explain the KV cache: why it is necessary, what it costs, and how prefill differs from decode.",
          "a": "WHY IT IS NECESSARY. A transformer processes a whole sequence in parallel during training, which is what makes it efficient to train. Generation cannot work that way: token t+1 depends on token t, so you produce one token per forward pass. Naively, each pass runs the model over the entire sequence so far, recomputing the keys and values of every previous token. But those keys and values are IDENTICAL every time - a token's K and V depend only on its own hidden state, and because of causal masking that hidden state never changes when later tokens arrive. So the naive loop redoes the same work T times: total cost O(T^3) instead of O(T^2). The KV cache stores K and V per layer per position; each step computes them only for the NEW token, appends, and attends against the whole cache. Per-token cost falls from O(T^2) to O(T). Note queries are NOT cached, because a query is consumed at the step that creates it - only keys and values are read by future tokens. WHAT IT COSTS. Size = 2 * n_layers * n_kv_heads * d_k * T * batch * bytes. For LLaMA-2 70B (80 layers, d_k 128, 8 GQA groups) at 4K context in fp16: ~2.7 GB per sequence; with full multi-head attention it would be ~21.5 GB. At batch 32 and 32K context, even the GQA version is hundreds of gigabytes. Two consequences: (1) the cache, not the weights, usually limits BATCH SIZE, and batch size determines serving throughput; (2) since decoding must READ the whole cache to produce each token, and decode is bandwidth-bound, cache size directly limits tokens-per-second. PREFILL VERSUS DECODE - the most important distinction in LLM serving. PREFILL processes the entire prompt in ONE forward pass with all tokens in parallel. It is COMPUTE-BOUND: a 2000-token prompt through a 7B model is ~28 TFLOPs, which a modern GPU does at high utilization. It determines TIME-TO-FIRST-TOKEN. It benefits from FlashAttention, from more FLOPs, and from chunking to overlap with other work. DECODE generates one token per pass. It is MEMORY-BANDWIDTH-BOUND: to produce a single token you must read all 14 GB of a 7B model's fp16 weights plus the relevant cache, to perform roughly 14 GFLOPs - about 1 FLOP per byte, two orders of magnitude below the roofline knee. The GPU runs at a few percent of peak. It determines TOKENS-PER-SECOND. It benefits from quantization (fewer bytes), batching (amortize the weight read across sequences), MoE (read only routed experts), and speculative decoding (verify several tokens in one pass). THE KEY IMPLICATION: because decode's arithmetic intensity is roughly proportional to BATCH SIZE, batching is the primary fix - at batch 1 you are hopelessly bandwidth-bound, at batch 64-128 you approach compute-bound. But larger batches raise per-user latency while raising system throughput, so throughput and latency are in direct tension, and where you sit is a product decision. This is why modern serving uses CONTINUOUS BATCHING (schedule at the token level, letting sequences join and leave mid-flight) rather than static batches. THE ENGINEERING AGENDA that follows from all this, which is what a strong answer ends with: shrink the cache (GQA, MLA, quantization), stop wasting it (paged attention eliminates the fragmentation from pre-allocating max length), share it (prefix caching for common system prompts), bound it (sliding windows, eviction), and work around the sequential nature of decode (speculative decoding). Nearly every LLM inference optimization of the last three years is one of those five things.",
          "deepDive": {
            "q": "Walk through the memory and bandwidth arithmetic that determines how many users a node can serve and at what speed.",
            "a": "Let me do it concretely for a 70B model on an 8xA100-80GB node (640 GB, ~2 TB/s per GPU). STEP 1 - WEIGHTS. 70B parameters at fp16 = 140 GB. This is a fixed cost paid once, and it AMORTIZES over concurrent users, so serving one user and serving fifty both pay it. Quantized to int8 it is 70 GB; int4, 35 GB. STEP 2 - CACHE PER SEQUENCE. With LLaMA-2-70B geometry (80 layers, 8 GQA KV heads, d_k 128) at fp16: per token, 2 * 80 * 8 * 128 * 2 bytes = 327 KB. At 4K context that is ~1.3 GB per sequence; at 32K, ~10.7 GB. (Note the useful intermediate quantity - bytes per token - since it makes the length scaling obvious.) STEP 3 - HOW MANY SEQUENCES FIT. 640 GB total, minus 140 GB weights, minus ~40 GB for activations, framework overhead, and fragmentation, leaves ~460 GB for cache. At 4K context: ~350 sequences. At 32K: ~43 sequences. Quantize weights to int8 and you free another 70 GB: ~400 and ~50 respectively. That number IS your concurrency limit, and it is set by the cache, not the model. STEP 4 - DECODE SPEED. Per generated token, per sequence, the GPU must read: all the weights (140 GB, but amortized across the batch since one weight read serves every sequence in the batch) plus that sequence's cache (1.3 GB at 4K). For a batch of B sequences, bytes read per DECODE STEP = 140 GB + B * 1.3 GB, and that step produces B tokens. At 2 TB/s aggregate: B=1 gives (140+1.3)/2000 = ~71 ms per token = ~14 tokens/s. B=32 gives (140 + 42)/2000 = ~91 ms per step but produces 32 tokens = ~350 tokens/s aggregate, i.e. ~11 tokens/s per user. B=128 gives (140+166)/2000 = ~153 ms for 128 tokens = ~836 tokens/s aggregate, ~6.5 tokens/s per user. THE TENSION, made numeric: going from batch 1 to batch 128 multiplies system throughput ~60x while cutting per-user speed roughly in half. That is the whole throughput-versus-latency trade, and it is why the right batch size depends entirely on the product - a chat UI needs maybe 20+ tokens/s per user to feel responsive (so a moderate batch), while an offline summarization job wants maximum throughput and does not care. STEP 5 - PREFILL AND TTFT. A 2000-token prompt through 70B is roughly 2 * 70e9 * 2000 = 280 TFLOPs. At an achieved ~150 TFLOP/s (realistic fraction of peak across the node) that is ~2 seconds - and note prefill competes with decode for the GPU, so a long prompt arriving mid-stream stalls other users' token generation unless the scheduler CHUNKS the prefill and interleaves it. That is a real production issue and the reason chunked prefill exists. STEP 6 - WHAT MOVES THE NUMBERS MOST, in order: (a) paged attention, because without it you allocate max-length cache per sequence and at a realistic length distribution you waste most of your cache memory - often a 2-4x effective concurrency gain for free; (b) weight quantization, which both frees cache memory and speeds decode by reducing the dominant bandwidth term; (c) KV quantization to int8, halving the per-sequence term; (d) prefix caching if requests share a system prompt; (e) speculative decoding, which improves per-user latency without needing more batch. THE CHECK I WOULD ALWAYS DO: profile the ACTUAL distribution of prompt and generation lengths in production traffic. Provisioning for 32K when P95 is 3K is the most expensive mistake in this area and requires no technology to fix - just measurement."
          }
        },
        {
          "q": "What are the main techniques for managing KV cache memory, and how do they compose?",
          "a": "They fall into five families, and a production system uses several simultaneously. (1) SHRINK IT ARCHITECTURALLY. GQA/MQA reduce the n_kv_heads term - LLaMA-2 70B's 8 groups for 64 query heads is an 8x reduction at essentially no quality cost, and it is now standard. MLA (DeepSeek) compresses K/V into a learned low-rank latent and caches only that, achieving a smaller cache than GQA at full-attention quality, at the price of implementation complexity and awkward RoPE interaction. Both are PRETRAINING-TIME decisions (though GQA is retrofittable by uptraining on ~5% of the original tokens). (2) COMPRESS IT NUMERICALLY. KV quantization to int8 gives ~2x, int4 up to 4x, with modest quality cost. Details matter: per-token or per-channel scaling rather than per-tensor, and keys are typically more sensitive than values, so asymmetric precision (int8 keys, int4 values) is a common configuration. This is a deployment-time choice requiring no retraining, which makes it easy to adopt. (3) STOP WASTING IT - the biggest practical win. Naive implementations PRE-ALLOCATE the cache at max sequence length per sequence, so a request with a 200-token prompt that generates 300 tokens occupies 32K worth of memory. PagedAttention (vLLM) allocates in fixed-size blocks on demand, with a block table per sequence, eliminating internal fragmentation and enabling copy-on-write sharing between sequences that share a prefix (e.g. parallel samples from one prompt). Reported effective batch improvements are typically 2-4x, at zero quality cost - which is why it is the first thing to adopt. (4) STORE LESS OF THE SEQUENCE - lossy, use with care. Sliding-window attention (Mistral) keeps only the last W tokens per layer, making the cache constant-size; StreamingLLM adds the crucial ATTENTION SINK fix - retain the first few tokens, because models dump attention mass onto initial positions and evicting them destroys the distribution. H2O-style eviction keeps the tokens that have historically received the most attention. All of these bet that distant detail is unneeded: fine for streaming chat, wrong for long-document retrieval, so they must be validated against the actual task. (5) SHARE OR OFFLOAD IT. Prefix caching computes a shared system prompt's cache once and reuses it across requests - potentially a very large win in chat products, and it composes with paged attention's block sharing. Offloading cold cache blocks to CPU memory or NVMe trades bandwidth for capacity and is a last resort for serving very long contexts at all. HOW THEY COMPOSE - the important part. They are largely MULTIPLICATIVE and independent: GQA-8 (8x) times int8 KV quantization (2x) times paged attention's fragmentation recovery (2-4x effective) is a large combined factor, and prefix caching is orthogonal on top. The constraints are that GQA and MLA are architectural (decide at pretraining), quantization and paging are deployment-time, and the lossy methods (windows, eviction) should be adopted last and validated per task. A REASONABLE DEFAULT STACK for a new deployment: use a GQA model, serve with vLLM or TensorRT-LLM (paged attention plus continuous batching), quantize weights to int8/int4, quantize the KV cache to int8 if memory-bound, enable prefix caching if your prompts share a preamble, and only consider windowing or eviction if you still cannot fit the required context - at which point seriously reconsider whether retrieval with a short context solves the problem better and more cheaply."
        },
        {
          "q": "Why is decoding so much slower than prefill per token, and what can actually be done about it?",
          "a": "THE ARITHMETIC-INTENSITY EXPLANATION. Prefill processes N prompt tokens in one pass: it reads the weights ONCE and performs N tokens' worth of arithmetic, so arithmetic intensity is roughly N FLOPs per byte of weights - high enough to be compute-bound, and the GPU runs at good utilization. Decode processes ONE token per pass: it reads the SAME weights and performs one token's worth of arithmetic. For a 7B model that is reading 14 GB to do ~14 GFLOPs - about 1 FLOP per byte, when the roofline knee on an A100 is around 150. So the GPU spends essentially all its time waiting on memory and achieves a few percent of peak FLOPs. Decode is not slow because it does more work; it is slow because it does almost no work per byte moved. THE SECOND FACTOR: decode is inherently SEQUENTIAL. Token t+1 requires token t, so you cannot parallelize across the time axis within one sequence - which means you cannot fix decode by adding more compute, only by moving fewer bytes or by finding parallelism elsewhere. WHAT ACTUALLY HELPS, in order of impact. (1) BATCHING - the fundamental fix. With batch B, one weight read serves B sequences, so arithmetic intensity scales with B. Batch 1 is hopeless; batch 64-128 approaches compute-bound. CONTINUOUS BATCHING (schedule at the token level so finished sequences leave and new requests join without waiting for a batch boundary) is what makes this practical under real traffic, and it is typically the single largest throughput win in a serving stack. The cost is per-user latency, which is the tension to name. (2) QUANTIZATION - reduce the bytes. int8 or int4 weight-only quantization gives close to a linear speedup for decode because the time is dominated by reading weights. This is why weight-only quantization is so much more valuable for LLM inference than for training. (3) SPECULATIVE DECODING - manufacture parallelism. A small draft model proposes k tokens; the large model verifies all k in ONE forward pass (which it can, because verification is parallel over positions); accepted tokens are kept using a rejection-sampling scheme that leaves the output distribution EXACTLY unchanged. Typical speedups are 2-3x, and the guarantee of identical distribution is what makes it safe to deploy. Variants (Medusa's extra heads, EAGLE, n-gram/prompt lookup drafting) avoid needing a separate draft model. (4) MoE - read fewer weights per token. Only the routed experts' parameters are read, so a model with far more total parameters can decode at the speed of a much smaller dense one. This is an architectural decision driven substantially by decode economics. (5) BETTER KERNELS AND SMALLER CACHES - fused decode kernels, CUDA graphs to remove launch overhead (which is a real fraction of a 7 ms step), GQA and KV quantization to shrink the cache term. WHAT DOES NOT HELP, worth stating because it is a common error: adding FLOPs-oriented optimizations to decode. FlashAttention barely helps decode (it targets the attention matrix, which is tiny when the query is one token); more compute-efficient architectures do not address bandwidth; and tensor parallelism helps decode less than you would hope because it adds communication to an already latency-sensitive path (though it does split the weight read across devices, which is why it is still used). THE FRAMING I WOULD END ON: prefill and decode are different problems. Prefill is a compute problem - optimize FLOPs, use FlashAttention, chunk it so it does not starve decode. Decode is a bandwidth-and-parallelism problem - batch it, quantize it, speculate. Reporting one 'inference speed' number conflates two things with different fixes, and asking 'is your bottleneck TTFT or tokens-per-second?' is the question that sorts out most LLM performance discussions."
        },
        {
          "q": "Explain speculative decoding. Why does it not change the output distribution?",
          "a": "THE PROBLEM IT ATTACKS. Decode is bandwidth-bound and sequential: each token requires a full pass reading all the weights to do a tiny amount of arithmetic, so the hardware is almost idle. But VERIFYING several tokens is parallel - the model can score k proposed tokens in a single forward pass at nearly the cost of scoring one, because that pass is bandwidth-bound and the extra tokens add arithmetic, not bytes. Speculative decoding exploits exactly that asymmetry. THE ALGORITHM (Leviathan et al., Chen et al., 2023). (1) A cheap DRAFT model (a much smaller LM, or extra prediction heads on the target model, or even an n-gram/prompt-lookup heuristic) autoregressively proposes k candidate tokens - cheap because the draft model is small. (2) The TARGET model runs ONE forward pass over the prompt plus all k drafted tokens, obtaining its own probability distribution at each of those k+1 positions. (3) ACCEPT/REJECT: walk the drafted tokens left to right. For draft token x_i with draft probability q(x_i) and target probability p(x_i), accept with probability min(1, p(x_i)/q(x_i)). On the first rejection, sample a replacement token from the RESIDUAL distribution proportional to max(0, p(x) - q(x)), normalized, and discard the rest of the draft. If all k are accepted, you additionally get a free token from the target's distribution at position k+1. So each target-model pass yields between 1 and k+1 tokens. WHY THE DISTRIBUTION IS UNCHANGED - the proof sketch, which is the substance of the question. This is MODIFIED REJECTION SAMPLING. For a token x: P(x is proposed and accepted) = q(x) * min(1, p(x)/q(x)) = min(q(x), p(x)). The probability that we reach the rejection branch is 1 - sum_x min(q(x), p(x)), and in that branch we sample from the normalized residual max(0, p(x) - q(x)) / sum_y max(0, p(y) - q(y)). Note that sum_y max(0, p(y)-q(y)) equals exactly 1 - sum_y min(p(y), q(y)), so the normalizer cancels the branch probability. Adding the two paths: P(output x) = min(q(x), p(x)) + max(0, p(x) - q(x)) = p(x), for every x. So the marginal distribution of each emitted token is EXACTLY the target model's - not approximately, exactly. The result holds for any draft distribution q, which is why a bad draft model costs speed but never correctness. WHAT DETERMINES THE SPEEDUP: the ACCEPTANCE RATE, which is how often the draft agrees with the target. A well-matched draft (same tokenizer, same family, trained on similar data) accepts most tokens and gives 2-3x; a poorly matched one accepts rarely and you pay for the draft passes without benefit. Speedup also depends on the draft being genuinely cheap - if the draft model is 1/10 the size, the overhead is small. And it depends on the target pass being bandwidth-bound: at very large batch sizes decode becomes compute-bound and the free-lunch property disappears, which is why speculative decoding helps LOW-LATENCY, low-batch serving much more than high-throughput batch serving. THE VARIANTS worth naming: MEDUSA adds extra prediction heads to the target model to draft without a separate model; EAGLE drafts in feature space for higher acceptance; PROMPT LOOKUP / n-gram drafting copies from the prompt, which is remarkably effective for summarization and code editing where output repeats input; and tree-structured speculation verifies multiple candidate continuations in one pass. WHY IT MATTERS CONCEPTUALLY, and the point I would end on: it is a rare optimization that improves latency with a mathematical guarantee of identical output - no quality/speed trade-off to negotiate, no evaluation needed to justify adoption. That property, exactness, is the same reason FlashAttention diffused so fast, and it is worth recognizing as a pattern: exact optimizations get adopted, approximate ones get argued about."
        },
        {
          "q": "You are building a chat product. Walk through the inference architecture decisions the KV cache forces.",
          "a": "I would work from the product requirements back to the serving configuration, because the cache trade-offs only have answers once you know what the product needs. STEP 0 - GET THE REQUIREMENTS AS NUMBERS. Time-to-first-token target (for chat, under ~500 ms feels responsive); tokens-per-second per user (~20+ to outpace reading speed); expected concurrency; and the length distribution of prompts and conversations. That last one is the most commonly skipped and most consequential - provisioning for a 128K context when P95 is 4K wastes most of your hardware. STEP 1 - MODEL AND ARCHITECTURE CHOICE. Use a GQA model; without it, cache per sequence is 8x larger and concurrency collapses. Choose the smallest model that meets quality requirements, because both weight bandwidth (decode speed) and cache size scale with model dimensions. Consider whether an MoE model is appropriate - it decodes faster per token for a given quality, at the cost of more total memory for weights. STEP 2 - SERVING STACK. Use a stack with PAGED ATTENTION and CONTINUOUS BATCHING (vLLM, TensorRT-LLM, SGLang). This is not optional: pre-allocated caches waste most of your memory under a realistic length distribution, and static batching wastes GPU time waiting for the slowest sequence in a batch. This one decision typically dominates every model-level optimization. STEP 3 - PREFIX CACHING, which chat products benefit from more than almost any other workload. Chat has a long shared system prompt, and within a conversation each turn re-sends the entire history. Both are cacheable: compute the system prompt's KV once and share it across all users (copy-on-write via the paging block table), and retain each conversation's cache between turns so turn N+1 only prefills the new user message rather than the whole transcript. That second one converts TTFT from 'grows with conversation length' to 'roughly constant', which is a large and very visible user-experience win. The cost is memory held between turns, so you need an eviction policy for idle conversations (LRU, with re-prefill on a miss). STEP 4 - QUANTIZATION. Weight quantization to int8 (or int4 if quality allows) speeds decode nearly linearly and frees memory for more cache. KV cache quantization to int8 doubles concurrency at long context. Validate quality on your actual task, not just perplexity. STEP 5 - LATENCY OPTIMIZATIONS FOR THE CHAT FEEL. Speculative decoding gives 2-3x tokens-per-second at low batch with identical output distribution - well suited to chat's latency sensitivity. Stream tokens to the client as they are produced so perceived latency is TTFT, not total generation time. Chunk long prefills so one user's 8K-token paste does not stall everyone else's token stream - this is a real and commonly-hit production issue. STEP 6 - THE OPERATING POINT. Batch size is the throughput/latency dial. I would set it from the per-user tokens-per-second requirement, then scale horizontally for concurrency rather than pushing batch size past the latency budget. Admission control and a queue with a max wait are needed so that load spikes degrade gracefully instead of blowing the cache budget. STEP 7 - CONTEXT POLICY, which is a product decision the cache forces you to make explicitly. Conversations grow without bound; cache grows linearly with them. You need a policy: a hard context limit with truncation, a sliding window over recent turns, summarize-and-carry-forward, or retrieval over the conversation history. Retrieval or summarization is usually better than a very long context - cheaper, and often more accurate given the well-documented degradation of long-context retrieval in the middle of a window. WHAT I WOULD MONITOR: TTFT and inter-token latency at P50/P95/P99, cache utilization and eviction rate, batch size distribution, prefix cache hit rate, and the length distributions. The most common production surprise is that a small fraction of very long conversations consumes a disproportionate share of cache and degrades everyone else - which is an argument for per-conversation context limits, and it is the kind of thing you only see if you are measuring the distribution rather than the mean."
        },
        {
          "q": "The KV cache is a consequence of the transformer's design. Do other architectures have this problem?",
          "a": "This is a good question because the answer illuminates what the cache actually IS - the price transformers pay for their training parallelism. TRANSFORMERS: the cache exists because attention at step t needs the keys and values of ALL previous tokens, so the model's 'memory' of the past is stored EXPLICITLY and grows LINEARLY with sequence length. That is the trade: transformers get perfect, random-access recall of every previous token (which is why they excel at retrieval-like tasks) at the cost of state that grows without bound. RNNs and LSTMs: NO cache problem. Their state is a FIXED-SIZE hidden vector, so inference memory is O(1) in sequence length regardless of how long the sequence gets - a genuine advantage that was forgotten during the transformer era and is now being rediscovered. The cost is the reason they lost: training is SEQUENTIAL (you must unroll step by step, so you cannot use a GPU efficiently), and the fixed-size state is a lossy bottleneck - information must be compressed into a fixed vector, so distant details are irrecoverably lost. Transformers traded O(1) inference state for O(T) inference state in exchange for parallel training and perfect recall, and given that training compute was the binding constraint, that was the right trade for a decade. STATE-SPACE MODELS (Mamba, S4 and successors): explicitly designed to get both. They have a fixed-size recurrent state (so O(1) inference memory, like an RNN) but can be trained in PARALLEL via a scan/convolutional formulation (like a transformer). Mamba's key contribution over earlier SSMs was making the state transitions INPUT-DEPENDENT (selective), which recovers the content-based selectivity that fixed-dynamics SSMs lacked. The honest assessment: they are competitive and dramatically cheaper for long-sequence inference, but they underperform transformers on tasks requiring precise recall of arbitrary earlier content - exactly what you would predict from a fixed-size state, and confirmed by evaluations on associative-recall and needle-style tasks. LINEAR ATTENTION variants have a similar profile - they can be written recurrently with fixed state, and they lose the sharp selective retrieval that softmax attention provides. HYBRIDS are where the field has landed: interleave a few full-attention layers (for exact retrieval) with many cheap fixed-state layers (for everything else), e.g. Jamba and several recent models. The reasoning is that most of what a model does at each position is local or diffuse, and only a minority of computations need precise long-range lookup - so pay for full attention only where it earns its keep. This gets most of the cache savings while retaining retrieval ability, and it is the most promising direction. THE UNIFYING PRINCIPLE worth stating: there is a real trade-off between STATE SIZE and RECALL FIDELITY. A fixed-size state must compress history lossily; perfect recall requires state proportional to history. No architecture escapes that; they only choose where to sit. The KV cache is not a transformer bug - it IS the mechanism by which transformers achieve perfect recall, and its cost is the honest price of that capability. THE PRACTICAL COROLLARY: the right architecture depends on whether your task needs exact recall of arbitrary earlier content. Long-document QA and code understanding do; streaming summarization, many time-series tasks, and much of dialogue largely do not. And note that the pressure driving interest in SSMs is precisely the serving economics described in this lesson - which is another instance of inference cost, not training quality, driving architecture research."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "KV cache",
        "back": "Stored keys and values for all previous tokens, so each step computes K/V only for the new token. Valid because a token's K/V depend only on its own hidden state, which causal masking keeps fixed."
      },
      {
        "type": "formula",
        "front": "What the cache saves",
        "back": "Per-token cost O(T^2) -> O(T); total generation O(T^3) -> O(T^2). Queries are NOT cached - a query is used once, at the step that creates it."
      },
      {
        "type": "formula",
        "front": "Cache size",
        "back": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. LLaMA-2 70B at 4K, fp16, batch 1: ~2.7 GB with GQA-8, ~21.5 GB with full MHA. It usually limits batch size, not the weights."
      },
      {
        "type": "intuition",
        "front": "Prefill vs decode",
        "back": "Prefill: whole prompt in one parallel pass, COMPUTE-bound, sets time-to-first-token. Decode: one token per pass, sequential, BANDWIDTH-bound, sets tokens/second. Different bottlenecks, different fixes."
      },
      {
        "type": "intuition",
        "front": "Why decode runs at ~1-3% of peak",
        "back": "It reads all the weights (14 GB for a 7B fp16 model) to do ~14 GFLOPs - about 1 FLOP per byte against a roofline knee near 150. Batching raises intensity roughly proportionally to B."
      },
      {
        "type": "definition",
        "front": "Paged attention",
        "back": "Allocate the cache in fixed-size blocks on demand (vLLM) instead of pre-allocating max length per sequence. Removes internal fragmentation and enables copy-on-write prefix sharing - typically 2-4x effective batch, free."
      },
      {
        "type": "definition",
        "front": "Speculative decoding",
        "back": "A cheap draft model proposes k tokens; the target verifies all k in ONE pass; accept with prob min(1, p/q), else sample from the normalized residual max(0, p-q). Output distribution is EXACTLY the target's. 2-3x at low batch."
      },
      {
        "type": "pitfall",
        "front": "The cache-implementation invariant",
        "back": "Cached incremental generation must produce the same logits as one full-sequence forward pass. This single test catches wrong position ids, re-applied RoPE, prefill/decode off-by-one, and mask misalignment."
      },
      {
        "type": "intuition",
        "front": "The five ways to manage the cache",
        "back": "Shrink it (GQA, MLA), compress it (int8 KV), stop wasting it (paged attention), bound it (windows, eviction, sinks), share it (prefix caching). Largely multiplicative; paging and quantization need no retraining."
      },
      {
        "type": "intuition",
        "front": "State size vs recall fidelity",
        "back": "RNNs/SSMs have O(1) state but lossy recall; transformers have O(T) state and perfect recall. The cache IS the price of exact retrieval. Hybrids keep a few attention layers for lookup and cheap fixed-state layers elsewhere."
      }
    ],
    "refs": [
      {
        "title": "Pope et al. (2022), Efficiently Scaling Transformer Inference",
        "url": "https://arxiv.org/abs/2211.05102"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention (vLLM)",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "Leviathan, Kalman & Matias (2023), Fast Inference from Transformers via Speculative Decoding",
        "url": "https://arxiv.org/abs/2211.17192"
      },
      {
        "title": "Xiao et al. (2023), Efficient Streaming Language Models with Attention Sinks",
        "url": "https://arxiv.org/abs/2309.17453"
      }
    ],
    "demos": [
      "kv-cache",
      "kv-cache-eviction",
      "speculative-decoding",
      "paged-attention"
    ],
    "demoTitles": {
      "kv-cache": "KV Cache",
      "kv-cache-eviction": "KV-Cache Eviction",
      "speculative-decoding": "Speculative Decoding",
      "paged-attention": "PagedAttention"
    }
  }
};
