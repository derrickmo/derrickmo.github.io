// GENERATED from content/lessons/foundations/python-numpy-tensor-speed.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/python-numpy-tensor-speed/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "python-numpy-tensor-speed": {
    "level": "intro",
    "body": {
      "intuition": [
        "Python is slow at exactly the thing machine learning does most: arithmetic over millions of numbers. A plain Python loop pays interpreter overhead on every single element - type checks, object boxing, dispatch - so summing a million floats one-by-one costs orders of magnitude more than the raw additions require.",
        "NumPy's answer is vectorization: express the whole operation on the whole array at once, and let compiled C (backed by SIMD instructions and tuned BLAS libraries) do the loop. The Python you write becomes a thin description of the computation; the actual work happens below the interpreter. One line like x.sum() is not just shorter than the loop - it is typically 50-500x faster.",
        "PyTorch tensors take the same idea two steps further: the same vectorized interface, plus a record of how values were computed (for autograd, later in this module) and the ability to run on a GPU. Getting fluent in array thinking - shapes, broadcasting, elementwise ops, reductions - is the single most transferable skill in this curriculum, because every model you will ever write is built from exactly these operations."
      ],
      "math": [
        {
          "h": "Why the loop is slow: constant factors, not big-O",
          "paras": [
            "Summing n numbers is O(n) no matter how you write it - the asymptotic complexity does not change. What changes is the constant factor per element: an interpreted iteration costs on the order of 100ns (bytecode dispatch, PyObject unboxing, refcounting), while a compiled, SIMD-vectorized iteration costs a fraction of a nanosecond per element. Same big-O, a 100-1000x different constant."
          ],
          "tex": "T_{\\text{loop}}(n) \\approx c_{\\text{interp}} \\cdot n \\qquad T_{\\text{vec}}(n) \\approx c_{\\text{simd}} \\cdot n \\qquad \\frac{c_{\\text{interp}}}{c_{\\text{simd}}} \\sim 10^2\\text{--}10^3",
          "texNote": "Both are linear in n - vectorization wins by shrinking the per-element constant, not by changing the complexity class."
        },
        {
          "h": "Broadcasting: the shape algebra",
          "paras": [
            "Broadcasting lets arrays of different shapes combine without copying data. Align the shapes from the right; two dimensions are compatible if they are equal or one of them is 1, and the size-1 dimension is (virtually) stretched to match. A (3,1) column combined with a (1,4) row therefore produces a (3,4) grid - the outer pattern - with no loop and no materialized copies."
          ],
          "tex": "(3,1) \\oplus (1,4) \\rightarrow (3,4) \\qquad (m,n) \\oplus (n,) \\rightarrow (m,n)",
          "texNote": "Align shapes from the right; a 1 stretches to match. Most shape-mismatch bugs are a violated broadcasting rule."
        }
      ],
      "code": [
        {
          "h": "The 100x that motivates everything",
          "paras": [
            "The same reduction three ways. On a typical machine the Python loop takes ~50ms for a million floats, NumPy well under a millisecond, and a torch tensor about the same on CPU - with a GPU option one .to() away."
          ],
          "code": "import numpy as np, torch, time\n\nx_list = list(range(1_000_000))\nx_np = np.arange(1_000_000, dtype=np.float64)\nx_t = torch.arange(1_000_000, dtype=torch.float64)\n\nt0 = time.perf_counter(); total = 0.0\nfor v in x_list:                      # interpreted: pays overhead per element\n    total += v\nt_loop = time.perf_counter() - t0\n\nt0 = time.perf_counter(); x_np.sum() # compiled C + SIMD does the loop\nt_np = time.perf_counter() - t0\n\nt0 = time.perf_counter(); x_t.sum()  # same idea, GPU/autograd-ready\nt_torch = time.perf_counter() - t0\n\nprint(f\"loop {t_loop*1e3:.1f}ms | numpy {t_np*1e3:.3f}ms | torch {t_torch*1e3:.3f}ms\")",
          "caption": "Vectorize the description, compile the work: the speedup is 2-3 orders of magnitude."
        },
        {
          "h": "Broadcasting in place of nested loops",
          "paras": [
            "Anything you would write as nested loops over indices is usually one broadcast expression. The classic example: all pairwise differences between two vectors."
          ],
          "code": "a = np.array([1.0, 2.0, 3.0])          # shape (3,)\nb = np.array([10.0, 20.0, 30.0, 40.0]) # shape (4,)\n\npairwise = a[:, None] - b[None, :]      # (3,1) - (1,4) -> (3,4)\nprint(pairwise.shape)                   # (3, 4): every a_i minus every b_j\n\n# the same trick powers distance matrices, attention scores, kernels...\nX = np.random.randn(5, 2)\nd2 = ((X[:, None, :] - X[None, :, :]) ** 2).sum(-1)  # (5,5) squared distances",
          "caption": "Insert axes with None, let broadcasting build the grid - the pattern behind distance matrices and attention."
        }
      ],
      "useCases": [
        "Every forward and backward pass in deep learning is vectorized tensor arithmetic - this lesson is the substrate for all 25 modules.",
        "Distance matrices for k-NN and k-means (Modules 02/03) are a single broadcast expression.",
        "Attention scores in transformers (Module 08) are batched matrix products of exactly this kind.",
        "Data preprocessing at scale - normalization, one-hot encoding, batching - is reductions and broadcasting, never Python loops."
      ],
      "pitfalls": [
        "Broadcasting silently 'works' when you did not want it to: a (n,) vector plus a (n,1) column gives an (n,n) matrix, not an elementwise sum - check shapes when results look absurdly large.",
        "Views vs copies: slicing gives a view (mutating it mutates the original); fancy indexing gives a copy. Mixing them up causes action-at-a-distance bugs.",
        "dtype surprises: integer division, silent overflow in int32, and float64 (NumPy default) vs float32 (torch default) precision mismatches.",
        "Timing traps: the first call includes allocation/warmup, and GPU ops are asynchronous - synchronize before you trust a timer.",
        "Vectorizing at any cost: a broadcast that materializes a (100k,100k,d) intermediate is worse than a loop - watch peak memory, chunk when needed."
      ],
      "connections": [
        {
          "ref": "foundations/advanced-numpy-pytorch",
          "text": "The next lesson goes deeper into the ops themselves: einsum, gather/scatter, memory layout and contiguity."
        },
        {
          "ref": "foundations/linear-algebra",
          "text": "Matrix multiplication - the op BLAS optimizes hardest - gets its mathematical treatment in the linear-algebra lesson."
        },
        {
          "ref": "transformers/self-attention",
          "text": "Attention is batched broadcast-and-matmul at scale: the same shape algebra, run billions of times."
        },
        {
          "text": "Module 15 (PyTorch internals) opens with what a tensor actually is under the hood: storage, strides, and views."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is a Python loop over a million floats so much slower than x.sum() in NumPy?",
          "a": "Interpreter overhead per element (dispatch, boxing) vs one compiled C/SIMD loop - same O(n), a 100-1000x constant factor."
        },
        {
          "q": "State the broadcasting rule.",
          "a": "Align shapes from the right; dimensions are compatible if equal or one is 1, and the 1 stretches to match."
        },
        {
          "q": "What shape is (3,1) + (1,4)?",
          "a": "(3,4) - each size-1 axis stretches against the other array's size."
        },
        {
          "q": "View vs copy in NumPy - which does slicing give?",
          "a": "Basic slicing returns a view (shares memory); fancy/boolean indexing returns a copy."
        },
        {
          "q": "Does vectorization change the big-O of a computation?",
          "a": "No - it shrinks the per-element constant factor, not the complexity class."
        },
        {
          "q": "Why can timing the first call of a GPU op mislead you?",
          "a": "Warmup (allocation/compilation) and asynchronous execution - synchronize and time steady-state calls."
        },
        {
          "q": "What does a torch tensor add over a NumPy array?",
          "a": "Autograd tracking and device (GPU) support behind the same vectorized interface."
        },
        {
          "q": "Pairwise squared distances between rows of X without a loop?",
          "a": "((X[:,None,:] - X[None,:,:])**2).sum(-1)."
        },
        {
          "q": "Name a case where vectorizing is the wrong move.",
          "a": "When the broadcast materializes a huge intermediate (memory blow-up) - chunk or use an algebraic identity instead."
        },
        {
          "q": "Default float dtype in NumPy vs PyTorch?",
          "a": "NumPy float64, PyTorch float32 - a common source of silent precision/type mismatches."
        },
        {
          "q": "What actually executes NumPy's heavy math?",
          "a": "Compiled C loops and tuned BLAS/LAPACK backends (OpenBLAS/MKL) using SIMD instructions."
        }
      ],
      "standard": [
        {
          "q": "Explain why NumPy can be ~100x faster than a Python loop for elementwise arithmetic even though both are O(n).",
          "a": "Big-O counts operations, not their cost. A Python loop executes bytecode per element: fetch the PyObject, type-check, unbox, add, box, refcount - roughly 100ns each. NumPy performs one dispatch for the whole array, then runs a compiled C loop over a contiguous typed buffer, which SIMD units process several elements per cycle and BLAS further blocks for cache. The complexity class is unchanged; the per-element constant drops by 2-3 orders of magnitude.",
          "deepDive": {
            "q": "Why does memory layout (contiguity) matter for that speed?",
            "a": "The compiled loop streams a contiguous buffer through the cache hierarchy: sequential access maximizes cache-line utilization and lets the prefetcher hide latency. A strided or transposed view breaks that pattern - same arithmetic, more cache misses - which is why .contiguous()/copies sometimes speed things up and why matmul libraries tile into cache-sized blocks."
          }
        },
        {
          "q": "Walk through how broadcasting evaluates (m,n) array + (n,) vector, and give a bug it can silently cause.",
          "a": "Align right: (m,n) vs (n,) -> the vector is treated as (1,n); the 1 stretches to m, so the vector is added to every row. No copy is materialized - the stretched axis just gets stride 0. Classic silent bug: intending elementwise addition of two (n,) vectors when one is accidentally (n,1); broadcasting happily produces an (n,n) outer sum, and downstream code sees an absurdly large but 'valid' array.",
          "deepDive": {
            "q": "How would you add a vector row-wise instead (one value per row)?",
            "a": "Insert an axis so shapes align as intended: A + v[:, None] makes v shape (m,1), which stretches across columns. Axis insertion with None/np.newaxis is the standard control knob for which way a vector broadcasts."
          }
        },
        {
          "q": "How would you benchmark a tensor operation honestly?",
          "a": "Warm up first (first calls pay allocation/JIT/kernel-selection costs), repeat the op many times and take the median or minimum, keep inputs fixed to isolate the op, and on GPU synchronize before stopping the timer because kernel launches are asynchronous. Report input sizes and dtype - implementations can rank differently at n=1e3 vs n=1e8.",
          "deepDive": {
            "q": "Why can the same op be memory-bound at one size and compute-bound at another?",
            "a": "Arithmetic intensity: elementwise ops do O(n) flops on O(n) bytes, so memory bandwidth is always the ceiling. Matmul does O(n^3) flops on O(n^2) data, so small matrices are launch/bandwidth dominated while large ones saturate the ALUs - which is why fusing elementwise chains (fewer memory passes) matters more than micro-optimizing their arithmetic."
          }
        },
        {
          "q": "When is a view returned vs a copy in NumPy, and why should you care?",
          "a": "Basic slicing (start:stop:step) returns a view sharing the original buffer - writes propagate to the parent. Fancy indexing (integer arrays) and boolean masking return copies - writes do not propagate. It matters for correctness (mutating a view mutates the source) and performance (views are free; copies cost time and memory).",
          "deepDive": {
            "q": "How can you check, and force, one or the other?",
            "a": "arr.base tells you whether an array owns its data (None) or views another; np.shares_memory(a,b) checks overlap. Force a copy with .copy(); force sequential layout with np.ascontiguousarray. In torch the analogues are .data_ptr(), .clone(), and .contiguous()."
          }
        },
        {
          "q": "You need all pairwise distances between 100k points in 512-d. The broadcast (X[:,None]-X[None,:]) blows up memory. What do you do?",
          "a": "The naive broadcast materializes a (1e5,1e5,512) intermediate - impossible. Use the identity ||a-b||^2 = ||a||^2 + ||b||^2 - 2ab: compute row norms once plus one (1e5,1e5) matmul - the same answer with no 3-D intermediate. If even the (1e5,1e5) output is too big, chunk over blocks of rows.",
          "deepDive": {
            "q": "What numerical issue does the expanded identity introduce?",
            "a": "Catastrophic cancellation: for nearby points, ||a||^2+||b||^2 and 2ab are large and nearly equal, so their float difference loses precision and can even go slightly negative - clamp at zero, and prefer float64 (or the direct difference on small blocks) when tiny distances matter."
          }
        },
        {
          "q": "Why do ML frameworks standardize on tensors rather than nested Python lists?",
          "a": "A tensor is a typed, contiguous buffer plus shape/stride metadata: it gives O(1) shape manipulation (reshape/transpose are metadata edits), vectorized kernels, predictable memory, dtype control, device placement, and a uniform object for autograd to track. Nested lists have per-element object overhead, no dtype guarantee, no device story, and force interpreted iteration.",
          "deepDive": {
            "q": "What do strides let you do without copying?",
            "a": "Transpose, slice, flip, and broadcast are all stride manipulations on the same buffer - transpose swaps strides, broadcasting sets a stride to 0. That is why these ops are free, and why some kernels then demand .contiguous() to restore sequential layout."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why vectorize?",
        "back": "Same O(n), but the per-element cost drops from interpreted (~100ns) to compiled+SIMD (<1ns): 100-1000x from the constant factor alone."
      },
      {
        "type": "definition",
        "front": "Broadcasting rule",
        "back": "Align shapes from the right; dims compatible if equal or 1; the 1 stretches (stride 0, no copy)."
      },
      {
        "type": "formula",
        "front": "(3,1) op (1,4) -> ?",
        "back": "(3,4) - each size-1 axis stretches against the other; the outer-product pattern."
      },
      {
        "type": "definition",
        "front": "View vs copy",
        "back": "Basic slicing -> view (shared memory); fancy/boolean indexing -> copy. Check with arr.base / np.shares_memory."
      },
      {
        "type": "formula",
        "front": "Pairwise squared distances, no loop",
        "back": "((X[:,None,:] - X[None,:,:])**2).sum(-1); at scale use ||a||^2+||b||^2-2ab with one matmul."
      },
      {
        "type": "pitfall",
        "front": "(n,) + (n,1) = ?",
        "back": "An (n,n) outer sum, not elementwise - broadcasting 'succeeds' silently; check shapes when outputs balloon."
      },
      {
        "type": "pitfall",
        "front": "Trusting a GPU timer naively",
        "back": "Kernels launch asynchronously and first calls pay warmup - synchronize, warm up, take the median of many runs."
      },
      {
        "type": "definition",
        "front": "What a tensor adds over a list",
        "back": "Typed contiguous buffer + shape/strides (free reshapes), vectorized kernels, dtype/device control, autograd hooks."
      },
      {
        "type": "pitfall",
        "front": "Default dtypes: NumPy vs torch",
        "back": "float64 vs float32 - silent precision/type mismatches when mixing; set dtypes explicitly at the boundary."
      }
    ],
    "refs": [
      {
        "title": "NumPy: Broadcasting (official docs)",
        "url": "https://numpy.org/doc/stable/user/basics.broadcasting.html"
      },
      {
        "title": "NumPy: Indexing - views vs copies",
        "url": "https://numpy.org/doc/stable/user/basics.indexing.html"
      },
      {
        "title": "PyTorch: Tensors tutorial",
        "url": "https://pytorch.org/tutorials/beginner/basics/tensorqs_tutorial.html"
      },
      {
        "title": "Harris et al., Array programming with NumPy (Nature 2020)",
        "url": "https://www.nature.com/articles/s41586-020-2649-2"
      }
    ],
    "demos": []
  }
};
