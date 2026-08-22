// GENERATED from content/lessons/llm-systems/long-context.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/long-context/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "long-context": {
    "interview": {
      "quickGrind": [
        {
          "q": "Why is long context hard, in two sentences?",
          "a": "Attention is quadratic in sequence length for compute and the KV cache is linear in memory, so both grow past what a device holds. And the model was trained on shorter sequences, so positions beyond that range are out of distribution."
        },
        {
          "q": "Which of those two binds first in practice?",
          "a": "Memory, usually. Flash Attention already made the compute manageable by never materializing the attention matrix; it is the KV cache that hits the wall."
        },
        {
          "q": "Give the KV cache formula.",
          "a": "2 * layers * n_kv_heads * head_dim * seq_len * batch * bytes. Note there is no query-head term — only the KV heads count, which is why GQA helps so much."
        },
        {
          "q": "Why does a model degrade past its training length even with enough memory?",
          "a": "Position encodings are out of distribution. The model never saw those relative distances, so attention scores at those offsets are unreliable."
        },
        {
          "q": "What is position interpolation?",
          "a": "Scale positions down so the extended range maps into the trained range — index 8000 is treated like 4000. Interpolating inside the trained region beats extrapolating outside it, and it needs a little fine-tuning."
        },
        {
          "q": "How does NTK-aware scaling differ?",
          "a": "It scales the RoPE base rather than the positions, stretching low-frequency dimensions more than high-frequency ones. High frequencies carry local ordering, so leaving them alone preserves short-range precision."
        },
        {
          "q": "What is YaRN?",
          "a": "A refinement that applies different treatment per frequency band and adds an attention-temperature correction, giving better extension with less fine-tuning than plain interpolation."
        },
        {
          "q": "What is a sliding window?",
          "a": "Each token attends only to the last W tokens, making cost linear in length. Stacking layers gives an effective receptive field of W times depth."
        },
        {
          "q": "What are attention sinks?",
          "a": "The first few tokens absorb a large share of attention regardless of content. Evict them from a sliding-window cache and quality collapses — keeping four of them restores it."
        },
        {
          "q": "Why do sinks exist?",
          "a": "Softmax must sum to one, so when a head has nothing it wants to attend to it needs somewhere to dump the mass. Early tokens are visible to every position, so they become the default dump."
        },
        {
          "q": "What is 'lost in the middle'?",
          "a": "Retrieval accuracy is high for information at the start and end of a long context and sags in the middle — a U-shape, so a large context window is not uniformly usable."
        },
        {
          "q": "Long context or RAG?",
          "a": "Not exclusive. RAG cuts cost by putting less in the window and gives provenance; long context handles material that resists chunking. Most production systems retrieve, then use a long window for what was retrieved."
        }
      ],
      "standard": [
        {
          "q": "Walk through what actually breaks as you extend context, in order.",
          "a": "Three distinct walls that people tend to blur together. First COMPUTE: attention is O(n^2 d), so a 4x longer sequence is 16x the attention work. This was the famous barrier and it is the one that has been most thoroughly addressed — Flash Attention does not reduce the asymptotic work but never materializes the n x n matrix, tiling the computation and recomputing in the backward pass, which turns a memory-bound quadratic into a compute-bound one that fits. So quadratic compute is now rarely what stops you. Second MEMORY, which is what usually stops you: the KV cache is 2 * L * n_kv * d_head * seq * batch * bytes, it is linear in length and it must be RE-READ every decode step, so it is both a capacity problem and a bandwidth problem. At long context and reasonable batch it can exceed the weights themselves — the measured example in this curriculum is a 32k context at batch 8 needing around 137 GB of cache against 35 GB of int4 weights, so the model fits and the workload does not. Third QUALITY, which is the one people forget because it is invisible in a memory calculation: positions beyond the training length are out of distribution and attention scores there are unreliable, and even after extension the usable quality is not uniform across the window. The practical consequence is that these need different fixes — kernels for the first, GQA and cache compression and offload for the second, position-encoding surgery plus fine-tuning for the third — and a system that solves only one of them will still fail.",
          "deepDive": {
            "q": "Why does GQA help the memory wall so much?",
            "a": "Because the cache formula has no query-head term. Sharing one key-value head across a group of query heads divides the cache by the group size while leaving the number of query heads — and therefore most of the model's expressiveness — untouched. Going from 64 KV heads to 8 is an 8x cache reduction for a small quality cost, which is why essentially every modern model does it. It is the highest-leverage single change available on this axis."
          }
        },
        {
          "q": "Explain position interpolation and NTK-aware scaling, and why the second is better.",
          "a": "RoPE encodes position by rotating query and key vectors, with each dimension pair rotating at its own frequency — high frequencies for fine local distinctions, low frequencies for coarse long-range ones. A model trained to 4k has only ever seen rotation angles in that range, so at position 8000 the low-frequency dimensions have rotated past anything in training and the scores are unreliable. Position interpolation's move is to divide the position index by the extension factor, so index 8000 becomes 4000 and every angle stays inside the trained range. Interpolating within a region the model understands is far safer than extrapolating beyond it, and this works with a modest amount of fine-tuning. The problem is that it compresses ALL frequencies equally, including the high-frequency dimensions that encode whether one token is immediately before another — so adjacent positions become harder to distinguish and short-range precision degrades, which is a real cost on tasks that need local ordering. NTK-aware scaling fixes that by changing the RoPE base instead of the index, which stretches the low-frequency dimensions substantially while barely touching the high-frequency ones. The reasoning is that the long-range dimensions are the ones that ran out of trained range, and the local ones did not, so treat them differently. YaRN takes this further with explicit per-band treatment — interpolate the low bands, leave the high ones, blend in between — plus a temperature correction to attention logits, and achieves better extension with less fine-tuning. The shared insight worth stating is that position encoding is not one thing but a spectrum of frequencies, and extension should act on the part that actually broke.",
          "deepDive": {
            "q": "Can you extend without any fine-tuning?",
            "a": "Partially. NTK-aware scaling and YaRN degrade much more gracefully than naive extrapolation with zero fine-tuning, which is why they became popular for community model extensions where retraining was not an option. But quality still improves substantially with even a small amount of fine-tuning on long sequences, and there is no method that gives you a genuinely usable 4x extension for free. The honest framing is that these methods reduce the fine-tuning required from a lot to a little rather than to none."
          }
        },
        {
          "q": "Explain attention sinks and what they tell you about the architecture.",
          "a": "The observation is concrete: if you run a sliding-window cache that evicts old tokens, quality collapses far more than the window size explains — and if you keep just the first four tokens permanently, alongside the sliding window, quality is restored. Those first tokens are the attention sinks. The mechanism is a consequence of the softmax: the attention weights must sum to one, so a head that has nothing relevant to attend to at this position cannot simply attend weakly to everything — it has to put its mass somewhere. Early tokens are visible from every subsequent position and are semantically unremarkable, so the model learns to use them as the default dump for unneeded attention mass. Evicting them forces that mass onto tokens that actually matter, distorting every head that was using the sink, which is why the failure is so much larger than an information-loss argument would predict. Two things follow that are worth saying. First, it is a KV-cache-eviction rule with real practical value — StreamingLLM keeps the sinks plus a recent window and gets effectively unbounded streaming at fixed memory, without any retraining. Second, it is a diagnosis of a design detail rather than of a bug: the softmax's normalization constraint has no 'attend to nothing' option, and proposals like adding a learned no-op slot or an off-by-one softmax exist precisely to give heads a legitimate place to put the mass. It is a good example of an emergent behaviour that looks arbitrary until you notice the constraint forcing it."
        },
        {
          "q": "How would you evaluate whether a long-context model actually works?",
          "a": "Not with perplexity, which is the standard mistake. Perplexity averages over all tokens, and most tokens in a long document are predictable from local context, so a model can post excellent perplexity at 100k while being unable to use anything beyond a few thousand tokens back — the metric is dominated by exactly the part that was never in question. Needle-in-a-haystack is the next step and is necessary but weak: place a fact at varying depths and ask for it. It reveals the U-shaped 'lost in the middle' profile and it is easy to run, but retrieving one verbatim string is far easier than using long context, and models are now explicitly trained on it, so a clean needle result establishes very little on its own. The evaluations that carry weight require AGGREGATION over the context — multi-hop questions whose supporting facts sit at different depths, counting or summarizing across the whole document, or tracking an entity's state through a long narrative — because those cannot be satisfied by a single retrieval. RULER and similar suites are built around exactly this and consistently find that a model's EFFECTIVE context is well below its advertised one. The reporting practice that follows: state accuracy as a function of position and of context length rather than as a single number, and report the length at which accuracy falls below your threshold, since that is the number a system designer actually needs."
        },
        {
          "q": "Long context or retrieval? Argue both sides and then decide.",
          "a": "The case for long context is that it removes a lossy step. Chunking imposes an arbitrary boundary on documents, and any question whose answer spans chunks is bounded by whether the retriever happened to fetch both — retrieval recall is a hard ceiling on the whole system, since a generator cannot use what it was not given. Long context also handles material that resists chunking at all: a codebase where the relevant definition is three files away, a contract where a later clause modifies an earlier one, a conversation whose meaning depends on its whole history. The case for RAG is cost and provenance. Attention over 100k tokens is expensive per query and the KV cache is large, whereas retrieving 4k relevant tokens is cheap and stays cheap as the corpus grows — and corpus size is the axis RAG scales on, since no context window holds a company's document store. RAG also gives citations, which is often a hard requirement rather than a nicety, and it lets you update knowledge by re-indexing instead of re-prompting or retraining. The decision is that these are not competitors and the framing 'long context kills RAG' is wrong: production systems retrieve to reduce what goes in the window, then use a long window so that retrieval can be generous — top-50 instead of top-5 — which directly raises the recall ceiling that bounds everything downstream. Long context makes RAG better by making the retriever's precision matter less."
        },
        {
          "q": "What would you actually build to serve a 128k-context model?",
          "a": "Start from the observation that prefill and decode are different problems and should be engineered separately. Prefill processes the whole prompt at once and is compute-bound, so it benefits from Flash Attention and from chunked prefill that breaks a huge prompt into pieces which can be interleaved with other requests' decode steps — otherwise one 128k prompt blocks every other user for seconds. Decode is memory-bandwidth-bound and dominated by the KV cache, so the levers are GQA in the model, paged attention so cache blocks are allocated on demand rather than reserving max length per request, and quantizing the cache to int8 or int4, which is usually a better trade than quantizing weights because the cache is the larger object at this length. Prefix caching is the highest-value system feature for long context specifically: workloads with a long shared prefix — a system prompt, a document being asked about repeatedly — can reuse the cache across requests instead of recomputing it, and that is often an order-of-magnitude saving on real traffic. Offloading cold cache blocks to host memory buys capacity at a bandwidth cost and is worth it for long idle conversations. On the admission side, cap context length per tier and be explicit that a request at 128k costs vastly more than one at 4k, because pricing and rate-limiting that ignore length will be exploited immediately. And measure TTFT and TPOT separately, since long context ruins the first and barely affects the second, and a single latency SLO hides that entirely."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "KV cache size",
        "back": "2 * layers * n_kv_heads * head_dim * seq * batch * bytes. No query-head term — which is exactly why GQA is the highest-leverage fix."
      },
      {
        "type": "intuition",
        "front": "Three separate walls",
        "back": "Compute (largely solved by Flash Attention), memory (the KV cache, usually what stops you), and quality (positions out of distribution). Different fixes."
      },
      {
        "type": "definition",
        "front": "Position interpolation",
        "back": "Divide the position index so the extended range maps inside the trained one. Interpolating beats extrapolating — but it compresses high frequencies too."
      },
      {
        "type": "intuition",
        "front": "Why NTK-aware is better",
        "back": "It scales the RoPE base, stretching low frequencies while leaving high ones alone. Only the long-range dimensions ran out of trained range."
      },
      {
        "type": "definition",
        "front": "Attention sinks",
        "back": "The first few tokens absorb attention mass regardless of content. Keep ~4 alongside a sliding window and streaming quality is restored."
      },
      {
        "type": "intuition",
        "front": "Why sinks exist",
        "back": "Softmax must sum to one, so a head with nothing to attend to must dump the mass somewhere. Early tokens are visible to everyone and semantically neutral."
      },
      {
        "type": "definition",
        "front": "Lost in the middle",
        "back": "Retrieval accuracy is U-shaped in position — good at the start and end, sagging in the middle. A large window is not uniformly usable."
      },
      {
        "type": "intuition",
        "front": "Prefill vs decode",
        "back": "Prefill is compute-bound and needs chunking so one long prompt does not block everyone; decode is bandwidth-bound and needs cache reduction."
      },
      {
        "type": "pitfall",
        "front": "Perplexity as a long-context metric",
        "back": "Most tokens are predictable locally, so perplexity stays excellent while long-range ability is absent. It measures the part nobody doubted."
      },
      {
        "type": "pitfall",
        "front": "Needle-in-a-haystack as sufficient",
        "back": "Retrieving one verbatim string is far easier than USING long context, and models are trained on it now. Test aggregation across positions instead."
      },
      {
        "type": "pitfall",
        "front": "Length-blind pricing and rate limits",
        "back": "A 128k request costs vastly more than a 4k one. Rate-limiting by request count rather than tokens will be exploited immediately."
      },
      {
        "type": "pitfall",
        "front": "'Long context kills RAG'",
        "back": "They compose: retrieve to reduce what enters the window, then use a long window to retrieve generously, which raises the recall ceiling bounding everything downstream."
      }
    ],
    "refs": [
      {
        "title": "Chen et al. (2023) — Extending Context Window of Large Language Models via Position Interpolation",
        "url": "https://arxiv.org/abs/2306.15595"
      },
      {
        "title": "Peng et al. (2023) — YaRN: Efficient Context Window Extension of Large Language Models",
        "url": "https://arxiv.org/abs/2309.00071"
      },
      {
        "title": "Xiao et al. (2023) — Efficient Streaming Language Models with Attention Sinks",
        "url": "https://arxiv.org/abs/2309.17453"
      },
      {
        "title": "Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      },
      {
        "title": "Hsieh et al. (2024) — RULER: What's the Real Context Size of Your Long-Context Language Models?",
        "url": "https://arxiv.org/abs/2404.06654"
      }
    ],
    "demos": []
  }
};
