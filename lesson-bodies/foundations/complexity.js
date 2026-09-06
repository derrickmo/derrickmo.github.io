// GENERATED from content/lessons/foundations/complexity.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/complexity/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "complexity": {
    "level": "intro",
    "body": {
      "intuition": [
        "Big-O notation answers one question: as the input gets large, how does the *cost* (time or memory) grow? It deliberately throws away constant factors and lower-order terms to isolate the growth *shape* - O(n) vs O(n log n) vs O(n^2) - because that shape is what determines whether an algorithm scales to real ML data sizes or becomes unusable, while constant factors (the actual focus of 01-01's vectorization lesson) matter for a fixed size but don't change which algorithm wins as data grows without bound.",
        "This module closes the loop between the two lenses this curriculum uses constantly: 01-01 taught you that vectorization changes the *constant factor*, not the complexity class - this lesson gives you the vocabulary to reason about the complexity class itself, so you can tell 'this is fundamentally slow at scale' apart from 'this just has interpreter overhead I can vectorize away'.",
        "Complexity thinking matters immediately and concretely in ML: a naive pairwise-distance computation is O(n^2) in the number of points, which is fine for n=1,000 and completely infeasible for n=100,000,000 - the retrieve-then-rank funnel architecture in recommender systems (25-02, 25-03) exists specifically because O(n) retrieval over millions of candidates followed by O(k^2) or O(k log k) ranking over a small shortlist is tractable where a single O(n^2) or O(n log n) pass over everything is not."
      ],
      "math": [
        {
          "h": "Big-O, Big-Omega, Big-Theta",
          "paras": [
            "Big-O gives an asymptotic *upper bound* on growth (an algorithm is 'at most this bad'); Big-Omega gives a *lower bound* ('at least this expensive'); Big-Theta means both bounds coincide - a tight characterization. In casual ML usage 'O(n)' almost always really means Theta(n) (tight), but formally O only promises an upper bound."
          ],
          "tex": "f(n) = O(g(n)) \\iff \\exists\\, c, n_0 : f(n) \\le c \\cdot g(n) \\;\\; \\forall n \\ge n_0 \\qquad f(n) = \\Theta(g(n)) \\iff f = O(g) \\text{ and } f = \\Omega(g)",
          "texNote": "O(g) says f eventually never exceeds a constant multiple of g; it says nothing about a lower bound. Theta pins down the growth rate exactly, up to a constant factor."
        },
        {
          "h": "The complexity ladder that matters for ML",
          "paras": [
            "From cheapest to most expensive at scale: O(1) constant, O(log n) logarithmic (binary search, balanced-tree operations), O(n) linear (a single pass over data), O(n log n) (comparison sorting, FFT), O(n^2) quadratic (naive pairwise operations, dense attention over sequence length), O(2^n) exponential (naive recursive search without memoization, 25-07's exact edit-distance recursion). The gap between O(n) and O(n^2) is what makes the retrieval/ranking funnel architecture (25-02/25-03) necessary at web scale."
          ],
          "tex": "O(1) \\prec O(\\log n) \\prec O(n) \\prec O(n\\log n) \\prec O(n^2) \\prec O(2^n) \\prec O(n!)",
          "texNote": "Each class eventually dominates every class to its left for large enough n, no matter how favorable the constant factors are on the left-hand class."
        }
      ],
      "code": [
        {
          "h": "Measuring complexity empirically via log-log slope",
          "paras": [
            "You don't have to trust a claimed complexity - time it across growing input sizes and fit a slope on a log-log plot; the slope IS the polynomial exponent, exactly the technique 25-07 uses to confirm merge sort's n log n behavior."
          ],
          "code": "import numpy as np, time\n\ndef naive_pairwise_distances(X):\n    n = len(X)\n    D = np.zeros((n, n))\n    for i in range(n):               # O(n^2) - the naive way\n        for j in range(n):\n            D[i, j] = np.linalg.norm(X[i] - X[j])\n    return D\n\nsizes = [50, 100, 200, 400]\ntimes = []\nfor n in sizes:\n    X = np.random.randn(n, 8)\n    t0 = time.perf_counter()\n    naive_pairwise_distances(X)\n    times.append(time.perf_counter() - t0)\n\nlog_sizes, log_times = np.log(sizes), np.log(times)\nslope, intercept = np.polyfit(log_sizes, log_times, 1)\nprint(f\"fitted exponent: {slope:.2f}\")   # ~2.0, confirming O(n^2)",
          "caption": "A fitted log-log slope near 2.0 confirms quadratic growth empirically - the same diagnostic that catches an accidentally-quadratic implementation before it melts down in production."
        },
        {
          "h": "The vectorized identity that turns O(n^2) work into an O(n^2) matmul (with a much smaller constant)",
          "paras": [
            "The complexity class doesn't change here - it's still fundamentally quadratic in the number of points - but expressing it as one matmul instead of nested Python loops shrinks the constant factor enormously, exactly the 01-01/01-02 lesson applied to a concrete complexity-sensitive operation."
          ],
          "code": "import numpy as np, time\n\ndef vectorized_pairwise_distances(X):\n    sq_norms = (X ** 2).sum(axis=1)                      # O(n) work\n    # ||a-b||^2 = ||a||^2 + ||b||^2 - 2 a.b  -- still O(n^2) entries, but ONE matmul\n    D2 = sq_norms[:, None] + sq_norms[None, :] - 2 * X @ X.T\n    return np.sqrt(np.maximum(D2, 0))\n\nX = np.random.randn(400, 8)\nt0 = time.perf_counter(); vectorized_pairwise_distances(X); t_vec = time.perf_counter() - t0\nprint(f\"vectorized n=400: {t_vec*1e3:.2f}ms\")   # orders of magnitude faster than the loop\n# same O(n^2) OUTPUT SIZE and asymptotic complexity class -- the constant factor collapsed",
          "caption": "Same Theta(n^2) complexity class as the loop version - the algorithm fundamentally must produce n^2 numbers - but a ~100x-1000x smaller constant, illustrating why complexity class and wall-clock speed are related but distinct questions."
        }
      ],
      "useCases": [
        "Retrieval funnels in recommenders and search (25-02, 25-03) exist because O(n) or better retrieval over millions of candidates, followed by expensive ranking on only a short list, avoids an infeasible O(n^2)+ pass over everything.",
        "Attention's O(n^2) cost in sequence length is the direct motivator for flash attention, sparse attention, and linear-attention variants (Module 08) that trade exactness for a better complexity class at long context lengths.",
        "Data structure choice in a training pipeline - a hash map for O(1) average lookup vs a list requiring O(n) linear scan - routinely separates a preprocessing step that finishes in seconds from one that takes hours at scale.",
        "Understanding why a naive recursive algorithm (e.g., uncached Fibonacci, or 25-07's exponential edit-distance recursion) blows up exponentially, and why dynamic programming/memoization collapses it to polynomial, is a staple ML/general-SWE interview question."
      ],
      "pitfalls": [
        "Confusing 'vectorized' with 'faster complexity class' - 01-01/01-02's lesson that vectorization shrinks constants, not big-O, applies here too: a vectorized O(n^2) operation is still O(n^2), just with a smaller constant (as the pairwise-distance example shows explicitly).",
        "Ignoring memory complexity while optimizing time complexity - an O(n) algorithm that materializes an O(n^2) intermediate array can run out of memory long before it becomes slow, a very literal version of the pairwise-distance memory-blowup pitfall from 01-01.",
        "Assuming average-case complexity always applies - a hash map is O(1) average lookup but O(n) worst case under adversarial collisions; quicksort is O(n log n) average but O(n^2) worst case on already-sorted or adversarial input.",
        "Big-O hides constant factors that dominate at realistic sizes - an O(n log n) algorithm with a huge constant factor can be slower than an O(n^2) algorithm with a tiny one, for every n you'll actually encounter; asymptotic analysis answers 'which wins eventually', not 'which wins at n=1000'.",
        "Treating complexity analysis as purely academic - in an ML system, an accidentally-quadratic step in a data pipeline (e.g., repeated list concatenation in a loop, or a naive O(n^2) deduplication) is one of the most common real causes of a pipeline that 'used to work' suddenly becoming unusably slow as a dataset grows."
      ],
      "connections": [
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "That lesson's core claim - vectorization changes the constant factor, not the complexity class - is exactly the distinction this lesson formalizes with big-O notation."
        },
        {
          "ref": "foundations/calculus",
          "text": "One gradient-descent step's cost (a forward pass plus a backward pass) is itself a complexity question - this lesson gives the vocabulary to reason about how that cost scales with model size and data size."
        },
        {
          "text": "25-07's Classical CS Algorithms Review measures these exact complexity classes empirically via timing (merge sort's n log n slope, DP's polynomial collapse of an exponential recursion)."
        },
        {
          "text": "Module 08's attention-efficiency lessons and 25-02's system-design framework both center on this lesson's central tension: correctness/expressiveness vs the complexity class you can actually afford at production scale."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does O(g(n)) formally guarantee?",
          "a": "An asymptotic UPPER bound: f(n) <= c*g(n) for all n beyond some n0, for some constant c - it says nothing about a lower bound."
        },
        {
          "q": "What's the difference between Big-O and Big-Theta?",
          "a": "Big-O is an upper bound only; Big-Theta is a tight bound (both upper AND lower) - casual 'O(n)' in ML usage usually means Theta(n) informally."
        },
        {
          "q": "Order the following from cheapest to most expensive: O(n^2), O(log n), O(n), O(n log n), O(1).",
          "a": "O(1) < O(log n) < O(n) < O(n log n) < O(n^2)."
        },
        {
          "q": "Does vectorizing an algorithm change its big-O complexity class?",
          "a": "No - it shrinks the constant factor (compiled/SIMD vs interpreted), not the asymptotic growth shape."
        },
        {
          "q": "Why is naive pairwise distance computation O(n^2)?",
          "a": "It computes a distance for every one of n^2 point pairs - the output itself has n^2 entries, so the algorithm can't be faster than quadratic."
        },
        {
          "q": "What's the complexity of a hash map lookup, average vs worst case?",
          "a": "O(1) average case; O(n) worst case under adversarial hash collisions."
        },
        {
          "q": "What complexity class does naive uncached recursive Fibonacci have, and why?",
          "a": "O(2^n) (exponential) - it recomputes the same overlapping subproblems repeatedly without memoization."
        },
        {
          "q": "How does memoization/dynamic programming fix exponential recursion?",
          "a": "It caches results for subproblems already solved, collapsing repeated exponential recomputation into polynomial time (each distinct subproblem solved once)."
        },
        {
          "q": "Why does standard (dense) attention cost O(n^2) in sequence length?",
          "a": "Every token attends to every other token - n^2 pairwise attention scores must be computed and stored."
        },
        {
          "q": "How would you empirically verify a claimed complexity class?",
          "a": "Time the algorithm across growing input sizes and fit a slope on a log-log plot - the slope estimates the polynomial exponent."
        },
        {
          "q": "Give an example where a worse complexity class can still be faster in practice.",
          "a": "An O(n log n) algorithm with a large constant factor can be slower than an O(n^2) algorithm with a tiny constant, at every realistic n - asymptotic analysis only tells you which wins eventually."
        }
      ],
      "standard": [
        {
          "q": "Explain, with the pairwise-distance example, why vectorizing an O(n^2) algorithm doesn't change its complexity class - and why that distinction matters when choosing between a quadratic algorithm and a fundamentally different, sub-quadratic one.",
          "a": "The naive Python-loop pairwise-distance function and the vectorized ||a||^2+||b||^2-2ab matmul version both compute the exact same n^2 distance values - the output size alone lower-bounds the work at Omega(n^2), so no amount of vectorization can make either version sub-quadratic; vectorization only changes the constant factor multiplying that n^2 (compiled BLAS matmul vs interpreted nested loops), often by 100-1000x. This matters because at large enough n, even the fastest-constant-factor O(n^2) implementation eventually loses to a genuinely sub-quadratic algorithm (e.g., approximate nearest-neighbor structures like locality-sensitive hashing or an HNSW graph, used in vector search) with a worse constant factor - the crossover point is exactly where 'a smaller constant' stops being able to compensate for 'a worse growth rate', and production retrieval systems (25-02/25-03) are built around picking the sub-quadratic approach specifically because their n is large enough that this crossover has been passed.",
          "deepDive": {
            "q": "How would you empirically find that crossover point for a specific pair of implementations?",
            "a": "Time both implementations across a range of n spanning several orders of magnitude, fit each to its own growth curve (or just plot both on the same axes), and read off the n where the sub-quadratic curve drops below the quadratic one - in practice this is also how you'd justify an engineering decision to switch algorithms, since below the crossover the 'asymptotically worse' algorithm is legitimately the better choice given its smaller constant factor."
          }
        },
        {
          "q": "A hash map is described as O(1) average-case lookup. Explain the conditions under which this breaks down to O(n), and why this matters for a security-sensitive or adversarial ML system.",
          "a": "A hash map's O(1) average case relies on the hash function distributing keys roughly uniformly across buckets, so each bucket holds a small, roughly constant number of entries and a lookup only has to scan that small bucket. If many keys hash to the same bucket (a hash collision cluster), lookups degrade to scanning a long chain - in the worst case (all n keys colliding into one bucket), lookup becomes O(n), identical to a naive linear scan. This is a real concern, not just theoretical, when an adversary can choose or influence the input keys (a classic 'hash flooding' denial-of-service attack against naively-hashed web request parameters or, in an ML context, adversarially crafted feature-store keys) - which is why production hash map implementations use randomized/keyed hash functions (SipHash and similar) so an attacker without knowledge of the random seed can't predict which keys will collide.",
          "deepDive": {
            "q": "How does this connect to the security-review mindset in a red-teaming/auditing context (Module 24)?",
            "a": "It's a concrete instance of the general lesson that a system's advertised 'average case' complexity or behavior can be worst-cased by an adversary who controls some of the inputs - exactly the mindset 24-09's red-teaming lesson applies to model behavior (a model's benign-looking aggregate accuracy can hide an adversarially-exploitable worst-case subgroup or trigger), and it's why complexity claims in a threat model always need to specify whether they hold against an adversarial or a benign input distribution."
          }
        },
        {
          "q": "You inherit a data preprocessing pipeline that used to run in seconds on a small dataset but now takes hours on a larger one. Walk through how you'd diagnose whether this is an algorithmic-complexity problem versus a constant-factor problem, and what you'd do differently for each.",
          "a": "First, empirically fit the growth curve: time the pipeline (or its suspect stage) at several input sizes spanning at least an order of magnitude and fit a log-log slope. A slope near 1 with a large absolute runtime suggests a constant-factor problem (e.g., unvectorized Python loops, redundant I/O, an unnecessarily large per-item overhead) - the fix is profiling to find the hot loop and applying the 01-01/01-02 toolkit (vectorize, use compiled/BLAS-backed ops, batch I/O). A slope near 2 (or worse) reveals a genuinely quadratic-or-worse algorithmic step - common culprits are repeated list/string concatenation in a loop (each concatenation copies, making n concatenations O(n^2) total), a nested loop performing a lookup that should be a hash-map O(1) operation but is instead a linear scan through a list (making the whole loop O(n^2)), or an accidental cross-join in a pandas merge (the join-cardinality pitfall from the pandas lesson) - the fix here isn't 'optimize the constant', it's 'replace the algorithm or data structure', since no amount of vectorization rescues a fundamentally worse growth rate at large enough n.",
          "deepDive": {
            "q": "Give a concrete example of the 'nested loop with a list lookup that should be a hash map' pattern, and show the complexity difference explicitly.",
            "a": "Deduplicating a list by checking membership: `seen = []; for x in items: if x not in seen: seen.append(x)` performs an O(len(seen)) linear scan on every `in` check, making the whole loop O(n^2) in the worst case (all-unique items, seen grows to size n); replacing `seen = []` with `seen = set()` makes each `in` check O(1) average case via hashing, collapsing the whole deduplication to O(n) average case - identical output, identical-looking code structure, a completely different complexity class purely from the data structure choice."
          }
        },
        {
          "q": "Explain why dense self-attention's O(n^2) cost in sequence length becomes a practical bottleneck, and describe at a conceptual level how flash attention improves wall-clock speed WITHOUT changing this complexity class.",
          "a": "Dense attention computes and materializes a full n x n score matrix (every query attends to every key) - both the compute (n^2 dot products) and, critically, the memory to store the n x n matrix scale quadratically with sequence length, which becomes prohibitive well before compute alone would (a 100k-token sequence needs a 100k x 100k score matrix, tens of gigabytes even in low precision, just for one attention head in one layer). Flash attention does NOT reduce the O(n^2) compute - it still, in principle, computes every pairwise score - but it restructures the computation to never materialize the full n x n matrix in slow GPU high-bandwidth memory at once, instead computing attention in blocks that fit in fast on-chip SRAM and accumulating the softmax normalization incrementally (an online softmax), which is a constant-factor (specifically, a memory-bandwidth-bound-to-compute-bound) improvement, exactly analogous to how 01-02's contiguous-memory-access argument explains cache-friendly kernels - same complexity class, dramatically better realized throughput.",
          "deepDive": {
            "q": "What approach WOULD change the complexity class itself, rather than just the constant factor, and what does it trade away?",
            "a": "Sparse attention patterns (only attending to a subset of positions - local windows, strided patterns, or learned/routed sparsity) and linear-attention reformulations (approximating the softmax kernel so the computation can be reordered to avoid ever forming the n x n matrix, achieving genuine O(n) or O(n log n) scaling) both change the actual complexity class - but they trade away the ability to model arbitrary full-sequence pairwise interactions exactly, accepting an approximation or a restricted attention pattern in exchange for scaling to sequence lengths where even a constant-factor-optimized O(n^2) approach becomes infeasible."
          }
        },
        {
          "q": "In a live coding interview, you're asked to find whether two large unsorted arrays of size n and m share any common element. Compare the O(n*m) nested-loop approach, an O((n+m) log(n+m)) sort-based approach, and an O(n+m) hash-set approach - including their space complexity tradeoffs.",
          "a": "Nested loop: for each of n elements in the first array, scan all m elements of the second array checking equality - O(n*m) time, O(1) extra space; simplest to write, worst asymptotic behavior. Sort-based: sort both arrays (O(n log n) and O(m log m)), then merge-walk two pointers through both sorted arrays simultaneously looking for a match - O((n+m) log(n+m)) time overall (dominated by the sorts), O(1) extra space if in-place sorting is used (or O(n+m) if not) - better than nested-loop, and doesn't require extra memory beyond the sort itself. Hash-set: insert every element of the smaller array into a hash set (O(min(n,m)) average time and space), then scan the other array checking set membership for each element (O(max(n,m)) average time) - O(n+m) average time overall, but O(min(n,m)) extra space, the best average-case time at the cost of using additional memory (and a worst-case O(n*m) if hash collisions degrade badly, per the earlier discussion).",
          "deepDive": {
            "q": "When would you deliberately choose the sort-based approach over the asymptotically-faster hash-set approach in a real system?",
            "a": "When memory is the binding constraint rather than time (the hash-set approach needs O(min(n,m)) additional memory, which can matter at genuinely large scale or in memory-constrained environments), when the arrays are already sorted or need to be sorted for other reasons anyway (amortizing the sort cost across multiple uses), when you need a worst-case time guarantee rather than an average-case one (sorting's O(n log n) worst case is more predictable than a hash table's rare-but-possible O(n*m) collision blowup), or when the elements aren't reliably hashable but do have a well-defined ordering (making sorting applicable where hashing isn't)."
          }
        },
        {
          "q": "Explain the difference between time complexity and space complexity using a concrete ML example, and describe a scenario where an algorithm with worse time complexity is preferred because of its space complexity.",
          "a": "Time complexity measures how the number of operations (roughly, wall-clock cost) grows with input size; space complexity measures how the amount of memory used grows with input size - the two are often, but not always, in tension. The vectorized pairwise-distance identity in this lesson is a case where an alternative approach could trade space for time: computing full O(n^2) attention scores for a very long sequence is fast per-step but requires O(n^2) memory to store the score matrix, which can simply run out of GPU memory before it becomes too slow to be useful - in that regime, a chunked/blockwise attention computation (compute and discard one block of the n x n matrix at a time, accumulating a running softmax) has the SAME O(n^2) time complexity but only O(n) or O(block_size * n) space complexity, and is preferred specifically because the O(n^2)-memory version can't even run on a long-enough sequence, regardless of how fast it would be if it could.",
          "deepDive": {
            "q": "How does this time-space tradeoff show up in the choice between storing a full precomputed distance/similarity matrix versus computing distances on the fly during a nearest-neighbor search?",
            "a": "Precomputing and storing a full n x n similarity matrix makes each subsequent nearest-neighbor query O(1) (just look up a row) at the cost of O(n^2) memory paid once upfront; computing distances on the fly for each query costs O(n) time per query (compare against every point) but only O(n) memory (just the dataset itself) - for a fixed, small, frequently-queried dataset the precomputed matrix wins on repeated-query throughput, but for a dataset large enough that n^2 memory is infeasible (or one that changes frequently, making precomputation stale), on-the-fly computation - or an approximate structure like an HNSW graph that sits between these extremes with sub-linear query time and sub-quadratic memory - becomes the only viable choice."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Big-O",
        "back": "An asymptotic UPPER bound on growth: f(n) <= c*g(n) for large enough n - says nothing about a lower bound (that's Big-Omega)."
      },
      {
        "type": "definition",
        "front": "Big-Theta",
        "back": "A TIGHT bound - both Big-O and Big-Omega hold; informal 'O(n)' usage in ML usually really means Theta(n)."
      },
      {
        "type": "formula",
        "front": "The ML complexity ladder",
        "back": "O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n) - each class eventually dominates classes to its left for large enough n."
      },
      {
        "type": "intuition",
        "front": "Vectorization vs complexity class",
        "back": "Vectorizing shrinks the CONSTANT factor (compiled/SIMD vs interpreted), never the asymptotic growth shape - an O(n^2) loop is still O(n^2) vectorized."
      },
      {
        "type": "pitfall",
        "front": "Hash map worst case",
        "back": "O(1) is the AVERAGE case; adversarial hash collisions degrade lookup to O(n) worst case - a real DoS vector if keys are attacker-controlled."
      },
      {
        "type": "pitfall",
        "front": "List membership check in a loop",
        "back": "`x in a_list` inside a loop is O(n) per check, making the whole loop O(n^2) - swap the list for a set/dict for O(1) average lookup."
      },
      {
        "type": "intuition",
        "front": "Why dense attention is O(n^2)",
        "back": "Every token attends to every other token - n^2 pairwise scores must be computed AND stored, the memory cost as much as the compute cost."
      },
      {
        "type": "intuition",
        "front": "Flash attention's speedup mechanism",
        "back": "Same O(n^2) compute, but never materializes the full n x n matrix in slow memory - a constant-factor/memory-bandwidth win, not a complexity-class change."
      },
      {
        "type": "formula",
        "front": "Empirical complexity measurement",
        "back": "Time across growing input sizes, fit a log-log slope - the slope estimates the polynomial exponent (e.g., ~2.0 confirms O(n^2))."
      }
    ],
    "refs": [
      {
        "title": "Cormen, Leiserson, Rivest, Stein - Introduction to Algorithms (Ch. 3, growth of functions)",
        "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"
      },
      {
        "title": "Dao et al., FlashAttention: Fast and Memory-Efficient Exact Attention (2022)",
        "url": "https://arxiv.org/abs/2205.14135"
      },
      {
        "title": "Big-O Cheat Sheet (common data structure/algorithm complexities)",
        "url": "https://www.bigocheatsheet.com/"
      },
      {
        "title": "Python: time complexity of built-in operations (wiki)",
        "url": "https://wiki.python.org/moin/TimeComplexity"
      }
    ],
    "demos": [
      "complexity-growth",
      "float-precision",
      "count-min-sketch",
      "bloom-filter"
    ],
    "demoTitles": {
      "complexity-growth": "Complexity Growth",
      "float-precision": "Floating-Point Precision",
      "count-min-sketch": "Count-Min Sketch",
      "bloom-filter": "Bloom Filter"
    }
  }
};
