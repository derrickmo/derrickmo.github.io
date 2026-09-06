// GENERATED from content/lessons/transformers/flash-attention.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/flash-attention/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "flash-attention": {
    "level": "advanced",
    "body": {
      "intuition": [
        "FlashAttention (Dao et al., 2022) computes EXACTLY the same function as standard attention - same output, same gradients, no approximation - and is several times faster while using O(T) memory instead of O(T^2). That combination sounds impossible until you notice what the standard implementation actually spends its time on. It is not the matmuls: attention as usually written materializes the full T x T score matrix in GPU high-bandwidth memory, writes it, reads it back for the softmax, writes the result, reads it again for the value multiply. For a 4K sequence with 16 heads that is hundreds of megabytes moved per layer to do a comparatively small amount of arithmetic. The operation is MEMORY-BANDWIDTH-BOUND, and the fix is to stop moving data, not to do less math.",
        "The technique is TILING plus ONLINE SOFTMAX. Load a block of queries and a block of keys/values into the GPU's fast on-chip SRAM, compute that tile's scores, and immediately fold them into a running output - never writing the score tile back to main memory. The obstacle is that softmax needs a normalizer over the WHOLE row, which you do not have until you have seen every key. The resolution is the online-softmax recurrence: keep a running maximum and a running sum of exponentials, and when a new block arrives with a larger maximum, RESCALE what you have accumulated so far. This is numerically identical to computing the softmax at the end, which is why the result is exact rather than approximate.",
        "The backward pass adds one more idea: rather than storing the attention matrix for gradient computation, RECOMPUTE the tiles on the fly from the saved q, k, v. Recomputation costs extra FLOPs and still comes out ahead, because FLOPs were never the constraint. That is the lesson to carry away, and it generalizes far past attention: on modern accelerators, arithmetic is cheap and memory movement is expensive, so an algorithm that does MORE arithmetic to move LESS data usually wins. FlashAttention is the reason long-context training became affordable, and it is now the default path in PyTorch's scaled_dot_product_attention."
      ],
      "math": [
        {
          "h": "Online softmax: the recurrence that makes tiling exact",
          "paras": [
            "Process keys in blocks. Maintain a running max m and running sum l. When block j arrives, update the max, rescale the previously-accumulated sum and output by exp(m_old - m_new), then add the new block's contribution. The rescaling is what preserves exactness - the final result is bit-comparable to computing softmax over the whole row at once (up to floating-point reassociation)."
          ],
          "tex": "m^{(j)} = \\max\\big(m^{(j-1)},\\, \\tilde{m}_j\\big), \\quad \\ell^{(j)} = e^{\\,m^{(j-1)} - m^{(j)}}\\ell^{(j-1)} + e^{\\,\\tilde{m}_j - m^{(j)}}\\tilde{\\ell}_j, \\quad O^{(j)} = e^{\\,m^{(j-1)} - m^{(j)}}O^{(j-1)} + \\tilde{P}_j V_j",
          "texNote": "m = running row max (for numerical stability), l = running sum of exponentials, O = running unnormalized output; tilde-quantities are the current block's local values. Divide O by l at the end. Milakov & Gimelshein (2018) introduced this recurrence; FlashAttention applies it to make attention tiling possible."
        },
        {
          "h": "The memory accounting - why it is a bandwidth win",
          "paras": [
            "Standard attention's HBM traffic is dominated by the T x T score matrix, read and written several times. FlashAttention's traffic is dominated by re-reading K and V blocks once per query block. With a block size chosen so a tile fits in SRAM, the asymptotics change from quadratic to (essentially) linear in T for a fixed head dimension."
          ],
          "tex": "\\underbrace{\\Theta\\!\\left(T^2 + T d\\right)}_{\\text{standard HBM accesses}} \\qquad\\longrightarrow\\qquad \\underbrace{\\Theta\\!\\left(\\frac{T^2 d^2}{M}\\right)}_{\\text{FlashAttention, } M = \\text{SRAM size}}",
          "texNote": "d = head dimension, M = on-chip SRAM capacity. Since M is large relative to d^2, the ratio is a large constant factor reduction in memory traffic - and crucially the T x T matrix is never MATERIALIZED, so peak memory falls from O(T^2) to O(T)."
        }
      ],
      "code": [
        {
          "h": "The tiled algorithm, written out",
          "paras": [
            "A readable (not fast) transcription of the forward pass. The real kernel is CUDA/Triton with the inner loop resident in SRAM, but the arithmetic is exactly this - and running it against the reference implementation confirms exactness."
          ],
          "code": "import torch, math\n\ndef flash_forward(Q, K, V, block=128):\n    \"\"\"Exact attention with O(T) memory - never materializes the T x T matrix.\"\"\"\n    T, d = Q.shape\n    O = torch.zeros_like(Q)\n    l = torch.zeros(T, 1)                     # running sum of exponentials\n    m = torch.full((T, 1), float('-inf'))     # running row max\n\n    for j in range(0, T, block):              # loop over KEY blocks\n        Kj, Vj = K[j:j+block], V[j:j+block]\n        Sj = (Q @ Kj.T) / math.sqrt(d)        # this tile only - stays in fast memory\n        m_new = torch.maximum(m, Sj.max(dim=-1, keepdim=True).values)\n        Pj = torch.exp(Sj - m_new)            # rescaled to the NEW max\n        scale = torch.exp(m - m_new)          # correction for what we already have\n        l = scale * l + Pj.sum(dim=-1, keepdim=True)\n        O = scale * O + Pj @ Vj               # fold this block into the running output\n        m = m_new\n    return O / l                              # normalize once, at the end\n\ntorch.manual_seed(0)\nQ, K, V = (torch.randn(1024, 64, dtype=torch.float64) for _ in range(3))\nref = torch.softmax(Q @ K.T / math.sqrt(64), dim=-1) @ V\nout = flash_forward(Q, K, V)\nprint('max abs diff vs reference:', (out - ref).abs().max().item())   # ~1e-15  EXACT",
          "caption": "The tiled forward pass with online softmax, verified against the reference to floating-point precision. The rescaling by exp(m_old - m_new) whenever a block raises the running maximum is what makes tiling exact rather than approximate."
        },
        {
          "h": "What it buys, and how to use it",
          "paras": [
            "In practice you never write this yourself - PyTorch dispatches to a FlashAttention kernel automatically through scaled_dot_product_attention when the shapes and dtype qualify. The numbers are why it matters: memory falls from quadratic to linear, which is what makes long-context training possible at all."
          ],
          "code": "import torch.nn.functional as F\n\n# PyTorch picks the FlashAttention kernel automatically when eligible:\nout = F.scaled_dot_product_attention(q, k, v, is_causal=True)   # (B, h, T, d_k)\n\n# attention-matrix memory per layer, batch 8, 16 heads, fp16:\n#   T       standard (materialized)      flash (never materialized)\n#   1024              256 MB                        ~0\n#   4096            4,096 MB                        ~0\n#  16384           65,536 MB  <- impossible         ~0\n#\n# measured speedup (A100, fp16, forward+backward), typical published figures:\n#   T=512   ~2x     T=1024  ~2.5x     T=4096  ~3-4x     (grows with T)\n#\n# Flash-2 improved work partitioning across warps (~2x over Flash-1);\n# Flash-3 targets Hopper's async copies and FP8. Same math, better scheduling.",
          "caption": "Use it through scaled_dot_product_attention rather than hand-rolling it. The decisive column is memory: the attention matrix is never materialized, so a 16K-token sequence stops being impossible - speed is the secondary benefit."
        }
      ],
      "useCases": [
        "Long-context training and inference: the O(T^2) attention matrix is what made 8K+ sequences infeasible, so FlashAttention is a precondition for essentially every long-context model shipped since 2022.",
        "Everyday training speedups: it is the default kernel behind PyTorch's scaled_dot_product_attention and is used by every major training framework, giving 2-4x end-to-end attention speedups with no accuracy change and no code change.",
        "Larger batch sizes at fixed memory: because activation memory for attention drops from quadratic to linear, the freed memory converts directly into batch size, which raises throughput independently of the kernel's own speedup.",
        "A template for kernel-level thinking: the same IO-aware pattern - tile, keep the working set in fast memory, recompute rather than store - reappears in fused MLP kernels, quantized inference kernels, and paged-attention implementations."
      ],
      "pitfalls": [
        "Calling it an approximation: FlashAttention computes exact attention. Confusing it with sparse or linear attention (which change the function) is the most common misunderstanding, and it matters because exactness is why adoption was frictionless.",
        "Expecting the speedup to come from fewer FLOPs: it does MORE arithmetic (recomputation in the backward pass) and wins by moving less data. If you reason about it in FLOPs, the result looks impossible.",
        "Assuming it always applies: kernels support specific head dimensions (commonly up to 128 or 256), dtypes (fp16/bf16, not fp32 on most versions), and attention-bias patterns. A custom additive bias (T5-style relative bias, ALiBi in some implementations, logit soft-capping) can silently disqualify the fast path and fall back to the slow one.",
        "Ignoring the fallback silently: PyTorch will quietly use the math backend if the flash path is ineligible, so a model can be far slower than expected with no error. Check with the SDPA kernel-selection context manager or profile it.",
        "Thinking it fixes long-context serving: it removes the attention-matrix memory during compute, but the KV CACHE is a separate, still-linear-in-T cost. Long-context inference needs GQA, paged attention, and cache quantization as well."
      ],
      "connections": [
        {
          "ref": "transformers/multi-head-attention",
          "text": "This computes exactly that operator - the T x T matrix it avoids materializing is the one derived there, which is why the memory accounting matters."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Complementary bottlenecks: FlashAttention addresses the attention matrix during compute; the KV cache is a separate memory cost that dominates decoding."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The same trade in a different place - recompute activations instead of storing them, because compute is cheaper than memory traffic. FlashAttention applies it inside a single operator."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Removing the quadratic memory term is what made long-context training viable; the positional-scaling methods handle the other half of the problem."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is FlashAttention?",
          "a": "An IO-aware exact attention algorithm: tile the computation so the T x T score matrix is never written to HBM, using an online-softmax recurrence to keep it exact."
        },
        {
          "q": "Is it an approximation?",
          "a": "No - identical outputs and gradients to standard attention (up to floating-point reassociation). That exactness is why it could be adopted as a drop-in default."
        },
        {
          "q": "What is the actual bottleneck it addresses?",
          "a": "Memory bandwidth. Standard attention writes and re-reads the T x T matrix several times; the operation is bandwidth-bound, not compute-bound."
        },
        {
          "q": "What is online softmax?",
          "a": "A recurrence maintaining a running max and running sum of exponentials, rescaling accumulated results by exp(m_old - m_new) when a new block raises the max - so softmax can be computed blockwise, exactly."
        },
        {
          "q": "Why is the running max needed?",
          "a": "Numerical stability - subtracting the max before exponentiating prevents overflow. Tiling means the max is only known incrementally, hence the rescaling."
        },
        {
          "q": "What does the backward pass do differently?",
          "a": "It RECOMPUTES the attention tiles from saved q, k, v rather than storing the T x T matrix - extra FLOPs, far less memory traffic, net win."
        },
        {
          "q": "What is the memory complexity?",
          "a": "O(T) instead of O(T^2) for the attention matrix, because the matrix is never materialized. This is the change that made long-context training possible."
        },
        {
          "q": "What speedup is typical?",
          "a": "Roughly 2-4x on attention, growing with sequence length. End-to-end model speedup is smaller, since attention is only part of the block."
        },
        {
          "q": "How do you use it in PyTorch?",
          "a": "F.scaled_dot_product_attention dispatches to a FlashAttention kernel automatically when shapes, dtype, and bias pattern qualify."
        },
        {
          "q": "When does it NOT apply?",
          "a": "Unsupported head dimensions, fp32 on most versions, or custom additive attention biases (T5 relative bias, logit soft-capping) - these silently fall back to the slow math backend."
        },
        {
          "q": "What changed in FlashAttention-2 and -3?",
          "a": "Same math, better scheduling: FA-2 improved work partitioning across warps/thread blocks (~2x); FA-3 exploits Hopper's asynchronous copies and FP8."
        },
        {
          "q": "Does it help inference decoding?",
          "a": "Partly - it helps prefill (long prompts). Decode is dominated by KV-cache and weight reads, which need GQA, paged attention, and quantization instead."
        }
      ],
      "standard": [
        {
          "q": "Explain FlashAttention: what problem it solves, how tiling plus online softmax works, and why the result is exact.",
          "a": "THE PROBLEM. Write standard attention as it appears in textbooks: S = QK^T/sqrt(d), P = softmax(S), O = PV. Each of those lines materializes a T x T matrix in GPU high-bandwidth memory. So the sequence of memory operations is: write S (T^2 values), read S, write P, read P, write O. For batch 8, 16 heads, T = 4096 in fp16, one attention matrix is ~4 GB, and it is traversed several times per layer, per forward pass, and again in the backward pass. Meanwhile the arithmetic - two matmuls of order T^2*d - is modest by GPU standards. The consequence is that attention is MEMORY-BANDWIDTH-BOUND: the GPU is idle waiting on HBM. And separately, the O(T^2) peak memory is what makes long sequences impossible regardless of speed. THE INSIGHT. GPUs have a small amount of extremely fast on-chip SRAM (tens of KB to a few hundred KB per streaming multiprocessor, with bandwidth an order of magnitude above HBM). If you can arrange the computation so that each piece of work fits in SRAM and produces its final contribution before being evicted, you never write the intermediate to HBM at all. That is TILING, and it is standard practice for matmuls. The obstacle specific to attention is the SOFTMAX, which normalizes over an entire row - so you seemingly cannot finish any part of the output until you have seen every key. THE RESOLUTION - ONLINE SOFTMAX (Milakov and Gimelshein, 2018). Maintain, for each query row, a running maximum m and a running sum of exponentials l, plus a running unnormalized output O. Process keys in blocks. For a new block: compute its local scores, take m_new = max(m_old, block max), exponentiate the block's scores relative to m_new, and RESCALE the previously accumulated l and O by exp(m_old - m_new) before adding the new contributions. At the end, divide O by l. The rescaling corrects the earlier terms for the fact that they were exponentiated relative to a smaller maximum - so the result is algebraically identical to computing the softmax over the whole row at once. THE ALGORITHM. Outer loop over query blocks, inner loop over key/value blocks; load Q_i, K_j, V_j into SRAM; compute the tile's scores; update m, l, O in place; move on. The T x T matrix exists only one tile at a time, in fast memory, and is never written to HBM. THE BACKWARD PASS. Gradients normally need the attention matrix P, which we did not store. FlashAttention RECOMPUTES the tiles from the saved Q, K, V (which are O(T*d), not O(T^2)) during the backward pass. This costs extra FLOPs - and still wins, because those FLOPs were never the bottleneck while the memory traffic was. It is the same trade as gradient checkpointing, applied inside a single operator. WHY IT IS EXACT, which is the part people doubt. Every step is an algebraic identity: the rescaling exactly compensates for the changing maximum, and the final division by l normalizes correctly. There is no dropped term, no approximation, no sparsity assumption. Numerically the result differs from the reference only by floating-point REASSOCIATION (a different summation order), which is the same magnitude of difference you get from changing batch size or using a different matmul algorithm. Verify it by running the tiled version in float64 against the reference - the difference is ~1e-15. THE RESULTS AND WHY THEY MATTER: 2-4x faster attention (growing with T) and, more importantly, O(T) memory instead of O(T^2), which is what turned 8K-64K training from impossible into routine. FlashAttention-2 rewrote the work partitioning across warps and thread blocks for roughly another 2x; FlashAttention-3 targets Hopper's asynchronous copy engines and FP8. Same mathematics throughout - the improvements are entirely in scheduling. THE GENERALIZABLE LESSON, and the thing to say last: on modern accelerators, arithmetic is cheap and data movement is expensive. An algorithm that performs MORE FLOPs to move LESS data usually wins, and FLOPs are therefore a poor proxy for speed. That reframing is the paper's real contribution - it is titled 'IO-Awareness' for a reason.",
          "deepDive": {
            "q": "Derive the online softmax recurrence and prove the rescaling makes it exact.",
            "a": "SETUP. We want softmax(x_1, ..., x_N) computed in blocks, where the standard stable formulation is p_i = exp(x_i - m) / sum_j exp(x_j - m) with m = max_j x_j (the max subtraction prevents overflow). The difficulty is that m depends on all N values. STATE. After processing the first k elements, maintain: m^(k) = max over the first k of x, and l^(k) = sum over the first k of exp(x_i - m^(k)). Note the crucial detail - l is defined relative to the CURRENT max, so it must be corrected whenever the max changes. THE RECURRENCE. Suppose we now see element x_{k+1}. The new max is m^(k+1) = max(m^(k), x_{k+1}). We need l^(k+1) = sum over the first k+1 of exp(x_i - m^(k+1)). Split the sum: the new term is exp(x_{k+1} - m^(k+1)). For the old terms, sum over the first k of exp(x_i - m^(k+1)) = sum over the first k of exp(x_i - m^(k)) * exp(m^(k) - m^(k+1)) = exp(m^(k) - m^(k+1)) * l^(k), because the exponent difference factors out of every term identically. So l^(k+1) = exp(m^(k) - m^(k+1)) * l^(k) + exp(x_{k+1} - m^(k+1)). That is the recurrence, and the derivation IS the proof - each step is an exact factorization, not an approximation. Note that exp(m^(k) - m^(k+1)) <= 1 always, so the rescaling never amplifies, which is why the scheme is numerically well-behaved. EXTENDING TO THE ATTENTION OUTPUT. We do not just want the softmax weights; we want O = sum_i p_i v_i. Maintain an UNNORMALIZED running output O^(k) = sum over the first k of exp(x_i - m^(k)) * v_i. The same factorization applies: when the max updates, every previously accumulated term must be multiplied by exp(m^(k) - m^(k+1)), giving O^(k+1) = exp(m^(k) - m^(k+1)) * O^(k) + exp(x_{k+1} - m^(k+1)) * v_{k+1}. At the very end, divide: O = O^(N) / l^(N). Again exact. BLOCK VERSION. Nothing changes if you process B elements at a time - compute the block's local max, take the running max against it, rescale, and add the block's contributions. This is what makes it useful: the inner loop is a matmul over a tile, not a scalar loop. THE FLOATING-POINT CAVEAT, which is worth stating precisely because 'exact' invites scepticism: the recurrence is exact in REAL arithmetic. In floating point, the result differs from the one-shot computation by REASSOCIATION error - you are summing the same terms in a different order, and floating-point addition is not associative. The magnitude is the ordinary accumulation error of the summation, comparable to what you already accept when a matmul library chooses a different tiling, or when you change batch size. It is emphatically NOT the kind of error an approximation introduces (dropped terms, sparsity assumptions), and it does not grow with sequence length in any problematic way, since the rescaling keeps all accumulated quantities bounded. WHERE ELSE THIS PATTERN APPEARS, which shows it is a general technique rather than an attention trick: streaming/one-pass computation of any normalized quantity - log-sum-exp in HMM forward algorithms, streaming statistics (Welford's algorithm for running variance is the same idea), and split-K reductions in matmul kernels. The unifying principle is: if your reduction has a normalizer that depends on all elements, keep the normalizer as running state and rescale the accumulator whenever it changes. Being able to derive that on the spot is a much better answer than citing the paper."
          }
        },
        {
          "q": "Why does an algorithm that does MORE arithmetic run faster? Explain the roofline reasoning.",
          "a": "THE ROOFLINE MODEL, which is the frame for the whole answer. A kernel's achievable performance is min(peak compute, arithmetic_intensity * memory_bandwidth), where arithmetic intensity is FLOPs performed per BYTE moved between HBM and the chip. Every kernel sits somewhere on that curve: below the 'knee' it is MEMORY-BOUND (adding FLOPs is free, reducing bytes is what helps), above it is COMPUTE-BOUND (the reverse). Modern accelerators have pushed the knee far to the right - an A100 does ~312 TFLOP/s in fp16 against ~2 TB/s of HBM bandwidth, so you need roughly 150 FLOPs per byte to saturate compute. Very few operations achieve that. WHERE ATTENTION SITS. Standard attention writes and re-reads a T x T matrix multiple times while doing O(T^2 d) arithmetic, so its intensity is roughly d FLOPs per element moved, i.e. ~64-128 - below the knee, and worse in practice because of the multiple passes. It is memory-bound, which means the GPU's arithmetic units are idle much of the time, waiting on HBM. So the operation is not limited by how much math it does. THE CONSEQUENCE. If you are memory-bound, doing MORE arithmetic costs nothing (the units were idle anyway) while moving FEWER bytes buys time proportionally. FlashAttention's backward pass recomputes attention tiles instead of reading a stored matrix: it adds real FLOPs and removes a huge amount of HBM traffic, and the net effect is a speedup. Stated as a rule: when memory-bound, trade compute for memory traffic; when compute-bound, do the opposite. THE SAME TRADE ELSEWHERE, which shows it is a principle rather than a trick. (a) GRADIENT CHECKPOINTING - store a subset of activations and recompute the rest during backward, roughly 30% more compute for a large memory saving; the same reasoning, applied across layers rather than within an operator. (b) OPERATOR FUSION generally - fusing conv+BN+ReLU, or the elementwise chain after a matmul, avoids round-tripping intermediates through HBM and is one of the highest-value compiler optimizations precisely because those elementwise ops are pure bandwidth. (c) QUANTIZATION for LLM decoding - int4 weights do not reduce the number of multiply-accumulates meaningfully, but they quarter the bytes read, and decode is bandwidth-bound on weight reads, so it is nearly a 4x speedup. (d) RECOMPUTATION IN MEMORY-EFFICIENT ATTENTION variants and in some distributed-training schedules. WHY 'FLOPs' PERSISTS AS A METRIC DESPITE THIS: it is hardware-independent, easy to compute analytically, and correlates with cost when comparing architectures in the same regime. But it becomes actively misleading exactly when you optimize hard against it - MobileNet's depthwise convolutions cut FLOPs ~9x and deliver 2-3x wall-clock, EfficientNets have excellent FLOP counts and are often slower than ResNets of equal accuracy on GPUs, and FlashAttention increases FLOPs while being faster. The pattern is consistent: FLOP-optimal designs tend to have low arithmetic intensity, and low intensity means bandwidth-bound. HOW I WOULD APPLY THIS IN PRACTICE. Profile first and classify each hot kernel as compute-bound or memory-bound (most profilers report achieved bandwidth and achieved FLOP/s, so you can place it on the roofline directly). For memory-bound kernels: fuse, tile, recompute, quantize, and fix memory layouts. For compute-bound kernels: reduce work, use lower precision to hit faster tensor-core paths, improve parallelism. Choosing the wrong category wastes effort - optimizing FLOPs in a bandwidth-bound kernel produces no speedup at all, which is the single most common wasted-optimization story in ML engineering."
        },
        {
          "q": "How does FlashAttention differ from sparse or linear attention methods?",
          "a": "THE FUNDAMENTAL DISTINCTION: FlashAttention changes HOW attention is computed; sparse and linear attention change WHAT is computed. FlashAttention is exact - identical outputs and gradients. Sparse and linear methods are approximations that alter the function the model computes. That difference explains essentially everything about their relative adoption. FLASHATTENTION: an IO-aware exact algorithm. Complexity in FLOPs remains O(T^2 d) - it does not beat the quadratic bound - but memory traffic and peak memory fall dramatically, giving 2-4x speed and O(T) memory. Because it is exact, it is a DROP-IN REPLACEMENT: you can swap it into an existing trained model, or into a training run mid-flight, with zero accuracy consequences and no retraining. That frictionlessness is why it became the default in PyTorch within about a year. SPARSE ATTENTION (Longformer, BigBird, Sparse Transformer, sliding-window as in Mistral): restrict which query-key pairs are computed at all - local windows, strided patterns, a few global tokens, or random connections. Complexity becomes O(T * w) for window size w, i.e. linear in T. The cost is that the model genuinely cannot attend to what you excluded, so it must be TRAINED with the pattern (retrofitting a dense-trained model works poorly), and the pattern encodes an assumption about which interactions matter. BigBird's theoretical result that its pattern preserves universal-approximation properties is reassuring but does not mean a specific model trained with it will match dense attention on a specific task. LINEAR ATTENTION (Performer, Linear Transformer, and the kernel-feature family): rewrite softmax(QK^T)V using a feature map so that you can compute (phi(K)^T V) first and then multiply by phi(Q), turning O(T^2 d) into O(T d^2). Elegant and genuinely linear, but the softmax kernel must be approximated (random features in Performer, or replaced by a different similarity), and empirically these have consistently underperformed dense attention on language modelling at scale, with the gap attributed to losing the sharp, selective attention distributions that softmax provides. STATE-SPACE MODELS (Mamba and successors) are the modern successor to this line - not attention approximations but a different sequence-mixing primitive with linear scaling and a recurrent inference form; Mamba's key move was making the state transitions INPUT-DEPENDENT, which recovers the content-based selectivity that earlier linear methods lost. They are competitive, and current strong models are often HYBRIDS that keep some full-attention layers (for retrieval-like behaviour) and use cheaper mixing elsewhere. WHY EXACTNESS MATTERED SO MUCH, and the strategic point: FlashAttention required no research risk. A lab could adopt it and know with certainty that model quality was unchanged - the only question was engineering. Sparse and linear methods require retraining, carry quality risk, need per-task validation, and interact with everything else in the stack. So even where an approximation might be better on paper, the exact method wins on adoption. This is a recurring dynamic worth naming: drop-in improvements diffuse orders of magnitude faster than improvements that require retraining. HOW THEY COMBINE, since they are not exclusive: FlashAttention kernels support causal masking and sliding-window patterns, so you can have an exact fast kernel computing a sparse pattern - Mistral does exactly this. The right mental model is that FlashAttention is a better implementation of whatever attention pattern you choose, while sparsity/linearity choose the pattern. THE ONE-LINE ANSWER: FlashAttention is an exact IO-aware implementation that does not reduce asymptotic FLOPs but removes the memory bottleneck; sparse and linear attention reduce asymptotic complexity by approximating the function, requiring retraining and accepting quality risk. Use FlashAttention always; use sparsity when your sequences are long enough that even exact attention is unaffordable and your task tolerates the pattern."
        },
        {
          "q": "Your model is not getting the expected FlashAttention speedup. How would you debug it?",
          "a": "The most common cause is that the fast kernel is not actually running, and the second most common is that attention was not your bottleneck. I would check in that order. (1) VERIFY THE KERNEL IS BEING USED. PyTorch's scaled_dot_product_attention silently falls back to a slower math backend when the flash path is ineligible - no warning, just slow. Use the SDPA kernel-selection context manager (enabling only the flash backend will raise an error instead of falling back, which is the fastest way to find out) or profile and look for the kernel name in the trace. Common disqualifiers: an unsupported HEAD DIMENSION (kernels support specific sizes, commonly up to 128 or 256); DTYPE (most flash kernels are fp16/bf16 only - fp32 falls back); an ARBITRARY ADDITIVE ATTENTION BIAS (T5-style relative position bias, ALiBi in some implementations, logit soft-capping as in Gemma-2) which the fused kernel cannot express; unusual masking that is neither pure-causal nor a supported pattern; non-contiguous tensors or an unexpected memory layout; and dropout in some configurations. Fixing a head dimension from 96 to 128, or expressing a mask as is_causal=True rather than an explicit additive mask, is frequently the entire fix. (2) CHECK WHETHER ATTENTION IS ACTUALLY THE BOTTLENECK. Attention's share of runtime depends on the ratio of sequence length to model width. Recall the crossover: projections and the FFN cost O(T*d^2) while attention costs O(T^2*d), so attention dominates only once T > d_model. For a 4096-wide model at T=1024, attention is a minority of the block's time, so even a 4x attention speedup is maybe a 15% end-to-end gain - Amdahl's law, and exactly what you would expect. Profile per-operator and compute attention's share before concluding anything is wrong. (3) LOOK AT WHAT ELSE THE FREED MEMORY SHOULD HAVE BOUGHT. A major part of FlashAttention's value is memory, not speed: if you did not INCREASE BATCH SIZE after adopting it, you left most of the benefit on the table. The memory saving converts to throughput only if you use it. (4) CHECK THE VERSION AND HARDWARE. FlashAttention-2 is roughly 2x FA-1 through better work partitioning; FA-3 needs Hopper. Running FA-1 on an H100 leaves a lot unclaimed. Also confirm the installed package actually built its CUDA extensions - a silent fallback to a pure-PyTorch path is common in misconfigured environments. (5) CHECK FOR SURROUNDING OVERHEAD. If RoPE, masking, or reshapes around the attention call are unfused and materializing large intermediates, they can dominate what you saved. Look for unnecessary .contiguous() calls, permutes, and mask tensors being broadcast to full (B, h, T, T) shape - the last one re-creates the very O(T^2) allocation you were trying to avoid, and it is a surprisingly frequent bug. (6) MEASURE PROPERLY. Warm up before timing (kernel autotuning and cudagraph capture happen on first calls), synchronize CUDA before taking timestamps, and time steady-state steps rather than the first few. A large fraction of 'no speedup' reports are measurement artifacts. THE ORDER I WOULD RUN IT: force the flash-only backend and see whether it errors (30 seconds, catches most cases) -> profile per-operator to get attention's true share -> check batch size and memory headroom -> check versions and hardware -> inspect the surrounding ops for accidental T^2 allocations. And the framing I would state up front: 'no speedup' is usually 'the kernel is not running' or 'attention was 15% of runtime', and both are answerable with a profile rather than with guesses."
        },
        {
          "q": "What did FlashAttention change about how the field thinks about efficiency?",
          "a": "Three shifts, and they are worth separating because each has independent consequences. (1) IT MOVED THE UNIT OF OPTIMIZATION FROM ASYMPTOTICS TO MEMORY HIERARCHY. Before it, the accepted way to make attention cheaper was to reduce the O(T^2) FLOP count - hence years of work on sparse patterns, low-rank approximations, and linear attention, all of which changed the FUNCTION and required retraining, and most of which underperformed dense attention at scale. FlashAttention showed the practical bottleneck was never the FLOPs; it was the round trips to HBM. Keeping the same asymptotic complexity but restructuring the data movement produced a larger practical win than any of the approximations, with no quality cost. The lesson generalized quickly: several 'efficient transformer' research lines lost relevance not because their math was wrong but because the baseline got much faster without approximating anything. (2) IT MADE IO-AWARENESS AND CUSTOM KERNELS A MAINSTREAM ML SKILL. Before, most ML researchers composed framework operators and left kernels to vendors. FlashAttention demonstrated that a hand-written, hierarchy-aware kernel could beat the standard composition by several times on the single most important operator in the field - and that the win came from reasoning about SRAM capacity and HBM traffic, not from a new model idea. The downstream effects are visible: Triton became a widely-used tool so that researchers can write fused kernels in Python; torch.compile invests heavily in automatic fusion; 'what is this kernel's arithmetic intensity?' became a normal question in ML engineering discussions; and a genre of ML-systems work (paged attention, fused MoE kernels, quantized inference kernels) grew directly out of the same style of reasoning. (3) IT ESTABLISHED THAT EXACT DROP-IN IMPROVEMENTS DIFFUSE FAR FASTER THAN APPROXIMATE ONES. Because the output is bit-comparable, adoption carried zero research risk - a lab could switch mid-training-run. Within about a year it was the default path in PyTorch. Compare that to sparse attention variants, which after years remain niche because each requires retraining, per-task validation, and a quality bet. The strategic lesson for anyone proposing an efficiency method is that 'requires retraining' is an enormous adoption tax, and methods that avoid it can be worth far more in practice than methods that are better on paper. THE SECOND-ORDER EFFECT, which is the most important one: by removing the memory wall, FlashAttention made long-context training economically feasible, which enabled the 32K-128K+ context models that followed and, with them, a wave of applications (long-document analysis, large-codebase reasoning, retrieval-augmented systems with big prompts). A kernel optimization changed what products were possible - which is a useful counterweight to the assumption that capability gains come only from model or data scale. THE HONEST LIMITS to state alongside all this: it does not change the quadratic FLOP complexity, so at extreme lengths attention still dominates; it addresses the attention matrix but not the KV cache, so long-context INFERENCE still needs GQA, paged attention, and quantization; and it is hardware-specific, requiring a rewrite per architecture generation (FA-2, FA-3), which is a real maintenance cost and a reason the field also wants compilers that can generate such kernels automatically. The most durable takeaway is the mental model rather than the kernel: profile, find whether you are compute- or memory-bound, and optimize the resource that is actually binding - which is advice that outlives any particular GPU."
        },
        {
          "q": "Could you apply the FlashAttention idea to other operations? Give an example.",
          "a": "Yes - the pattern is general, and stating it abstractly is the useful part: (a) identify an operation that materializes a large intermediate in slow memory, (b) restructure it into TILES whose working set fits in fast memory, (c) if there is a global reduction blocking tiling (like softmax's normalizer), find a RUNNING-STATE recurrence that makes it exact, and (d) in the backward pass, RECOMPUTE the intermediate rather than storing it. Several places this applies. (1) FUSED CROSS-ENTROPY OVER A LARGE VOCABULARY - the clearest analogue, and a real production problem. Computing logits for a 128K-token vocabulary at batch*seq positions materializes an enormous logits tensor (for 8x4096 positions and 128K vocab in fp16, ~8 GB) just to compute a loss that is a scalar. A fused kernel tiles over the vocabulary, maintains the same running max and running sum-of-exponentials as online softmax, accumulates the loss, and recomputes in the backward pass - never materializing the logits. This is now implemented in several libraries (Liger, cut-cross-entropy) and can free enough memory to meaningfully raise batch size for large-vocabulary models. Same recurrence, different operator. (2) FUSED MLP / ACTIVATION CHAINS. An FFN in a transformer materializes a d_ff-wide intermediate (4x or 8/3x the model width) purely to pass it to the next matmul. Fusing the up-projection, activation, and down-projection over tiles avoids writing it to HBM. This is what torch.compile's inductor does automatically for elementwise chains, and what hand-written fused SwiGLU kernels do explicitly. (3) FUSED SOFTMAX AND NORMALIZATION generally. Any operation whose cost is dominated by reading and writing the tensor (LayerNorm, RMSNorm, softmax, dropout) benefits from being fused into its neighbours - this is the bulk of what a compiler's fusion pass buys, and it is why RMSNorm's saving of one reduction pass is measurable. (4) ATTENTION VARIANTS: paged attention (vLLM) applies the same tiling to a cache stored in non-contiguous blocks; ring attention distributes the key/value blocks across devices and rotates them, applying the online-softmax recurrence ACROSS devices to handle sequences longer than one GPU's memory - a direct extension of exactly this algorithm. (5) K-NEAREST-NEIGHBOUR AND SIMILARITY SEARCH: computing an N x M distance matrix to take a top-k is the same anti-pattern; tiled kernels maintain a running top-k per query and never materialize the full matrix - and this predates FlashAttention (it is what FAISS and similar libraries do), which is a nice reminder that the idea is a classic HPC technique. WHERE IT DOES NOT APPLY, which is the discriminating part of the answer: (a) when the operation is already COMPUTE-BOUND (a large dense matmul with high arithmetic intensity is already tiled and near roofline - there is nothing to reclaim); (b) when the large intermediate is genuinely NEEDED downstream in full (you cannot avoid materializing something a later op reads in its entirety, unless you can fuse that op too); (c) when the reduction has no exact running form - some operations cannot be tiled without approximation, in which case you are back to trading accuracy; (d) when the intermediate is small relative to the inputs, so there is nothing to save. HOW I WOULD IDENTIFY A CANDIDATE in a real codebase: profile for kernels with high memory traffic and low achieved FLOP/s (the memory-bound quadrant of the roofline), then look for ones that write a large tensor which is consumed immediately by the next kernel and never used again. That pattern - big intermediate, single consumer, low intensity - is exactly what fusion or a FlashAttention-style rewrite targets, and it is usually where the easy wins are."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "FlashAttention",
        "back": "An IO-aware EXACT attention algorithm: tile the computation into SRAM so the T x T score matrix is never written to HBM, using online softmax to keep it exact. 2-4x faster, O(T) memory instead of O(T^2)."
      },
      {
        "type": "pitfall",
        "front": "It is not an approximation",
        "back": "Identical outputs and gradients (differing only by floating-point reassociation). That exactness is why it became a zero-risk drop-in default - unlike sparse/linear attention, which change the function and need retraining."
      },
      {
        "type": "formula",
        "front": "Online softmax recurrence",
        "back": "m_new = max(m_old, block_max); l = exp(m_old-m_new)*l + block_sum; O = exp(m_old-m_new)*O + P_block @ V_block; divide by l at the end. The rescaling exactly corrects earlier terms for the changed max."
      },
      {
        "type": "intuition",
        "front": "Why more FLOPs can be faster",
        "back": "Attention is MEMORY-BANDWIDTH-BOUND, so the arithmetic units are idle. Recomputing tiles in the backward pass adds free FLOPs and removes HBM traffic. Roofline: perf = min(peak compute, intensity x bandwidth)."
      },
      {
        "type": "definition",
        "front": "Backward-pass recomputation",
        "back": "Rather than storing the T x T attention matrix for gradients, recompute tiles from the saved q,k,v (which are only O(T*d)). Same trade as gradient checkpointing, applied inside one operator."
      },
      {
        "type": "pitfall",
        "front": "Silent fallback in PyTorch",
        "back": "scaled_dot_product_attention quietly uses the slow math backend when ineligible: unsupported head dim, fp32, or a custom additive bias (T5 relative bias, logit soft-capping). Force the flash-only backend to make it error instead."
      },
      {
        "type": "intuition",
        "front": "Attention's share of runtime",
        "back": "Projections+FFN are O(T*d^2), attention is O(T^2*d) - attention dominates only once T > d_model. At T=1024, d=4096, a 4x attention speedup is maybe 15% end-to-end. Profile before concluding the kernel is broken."
      },
      {
        "type": "definition",
        "front": "FA-1 vs FA-2 vs FA-3",
        "back": "Same mathematics, better scheduling: FA-2 improved work partitioning across warps/thread blocks (~2x); FA-3 exploits Hopper async copies and FP8. Version and hardware mismatches leave large gains unclaimed."
      },
      {
        "type": "pitfall",
        "front": "It does not fix long-context serving",
        "back": "It removes the attention-MATRIX memory during compute, but the KV CACHE is a separate cost that is still linear in T and dominates decode. Long context also needs GQA, paged attention, and cache quantization."
      },
      {
        "type": "intuition",
        "front": "The transferable pattern",
        "back": "Tile so the working set fits fast memory; use a running-state recurrence for any global reduction; recompute instead of storing in backward. Applies to fused large-vocabulary cross-entropy, fused MLPs, ring attention, and top-k search."
      }
    ],
    "refs": [
      {
        "title": "Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
        "url": "https://arxiv.org/abs/2205.14135"
      },
      {
        "title": "Dao (2023), FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning",
        "url": "https://arxiv.org/abs/2307.08691"
      },
      {
        "title": "Milakov & Gimelshein (2018), Online normalizer calculation for softmax",
        "url": "https://arxiv.org/abs/1805.02867"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      }
    ],
    "demos": [
      "attention",
      "paged-attention",
      "kv-cache"
    ],
    "demoTitles": {
      "attention": "Attention Heatmap",
      "paged-attention": "PagedAttention",
      "kv-cache": "KV Cache"
    }
  }
};
