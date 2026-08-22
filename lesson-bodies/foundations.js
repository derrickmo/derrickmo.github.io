// GENERATED from content/lessons/foundations/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "foundations". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
  },
  "advanced-numpy-pytorch": {
    "level": "intro",
    "body": {
      "intuition": [
        "A tensor is not really 'a grid of numbers' - it is a flat 1-D buffer in memory plus a shape and a set of strides that tell you how to walk that buffer to read it as an n-D array. Once that clicks, half of PyTorch's API stops looking like a spell-book: reshape, transpose, view, and broadcasting are all just different ways of reinterpreting the same bytes without touching them.",
        "That distinction - metadata edit vs data copy - is the single most useful mental model in this lesson. .view()/.reshape()/.transpose()/.permute() are (almost) free because they only rewrite strides. .contiguous(), fancy indexing, and most reductions actually move or reduce bytes. Knowing which camp an operation is in tells you whether it is O(1) or O(n) before you ever profile it.",
        "einsum and gather/scatter round out the toolkit: einsum lets you *name* the axes of a contraction instead of memorizing argument order (bmm, matmul, outer, trace are all one function in disguise), and gather/scatter let you do indexed reads/writes - 'look up value at this index per row' - without a Python loop. Together with broadcasting from the last lesson, these four ideas (strides, views, einsum, gather/scatter) cover the operations you will reach for in every model you build."
      ],
      "math": [
        {
          "h": "Strides: the formula behind every 'free' reshape",
          "paras": [
            "A tensor with shape (d0, d1, ..., dk) stores strides (s0, s1, ..., sk): the number of elements to skip in the flat buffer to move one step along that axis. The element at multi-index (i0, ..., ik) lives at flat offset sum(i_j * s_j). Row-major ('C') contiguous storage sets s_j = product of all dimensions after j - which is exactly why row-major arrays iterate fastest over the last axis.",
            "Transpose swaps strides without moving data: transposing a (m,n) matrix turns strides (n,1) into (1,n) - same buffer, different walk order. That is also why a transposed array is *not* contiguous, and why some kernels then demand .contiguous() to force a real copy back into row-major order before they will run."
          ],
          "tex": "\\text{offset}(i_0, \\dots, i_k) = \\sum_{j=0}^{k} i_j \\cdot s_j \\qquad s_j^{\\text{(C-order)}} = \\prod_{l=j+1}^{k} d_l",
          "texNote": "Any index tuple maps to one flat-buffer position via a dot product with the stride vector - reshape/transpose/broadcast just edit this vector."
        },
        {
          "h": "einsum as one notation for every contraction",
          "paras": [
            "Einstein summation notation says: repeated indices across inputs are summed over, indices that appear in the output are kept. 'ij,jk->ik' is exactly matrix multiplication (sum over the shared j); dropping the output index entirely ('ij,ij->' ) sums everything down to a scalar - the Frobenius inner product. The same one-liner covers batched matmul, outer products, traces, and diagonals just by changing the index string."
          ],
          "tex": "C_{ik} = \\sum_j A_{ij} B_{jk} \\quad \\Longleftrightarrow \\quad \\text{einsum(\"ij,jk->ik\", A, B)} \\qquad \\text{tr}(A) = \\sum_i A_{ii} \\Longleftrightarrow \\text{einsum(\"ii->\", A)}",
          "texNote": "Indices repeated across operands and absent from the output are the ones being summed - that's the entire rule."
        }
      ],
      "code": [
        {
          "h": "Views are free, copies are not",
          "paras": [
            "Reshape and transpose share memory with the original; mutating one mutates the other. .contiguous() is the escape hatch when a downstream op needs sequential layout."
          ],
          "code": "import torch\n\nx = torch.arange(12).reshape(3, 4)      # view of a fresh buffer\ny = x.t()                                 # transpose: strides swapped, NO copy\nprint(y.is_contiguous())                  # False - walking y sequentially skips around x's buffer\n\nx[0, 0] = 999\nprint(y[0, 0])                            # 999 - y shares x's storage\n\nz = y.contiguous()                        # forces an actual copy into row-major order\nprint(z.data_ptr() == x.data_ptr())       # False - z owns new memory\nprint(x.storage().data_ptr() == y.storage().data_ptr())  # True - view confirmed",
          "caption": "reshape/transpose/permute edit strides only; contiguous()/fancy-indexing/clone() move bytes."
        },
        {
          "h": "einsum and gather replace index-juggling loops",
          "paras": [
            "Batched attention-style matmuls and per-row lookups are both one call - no Python loop over the batch or row dimension."
          ],
          "code": "import torch\n\n# batched matmul: (batch, n, d) x (batch, d, m) -> (batch, n, m)\nA = torch.randn(8, 5, 16)\nB = torch.randn(8, 16, 3)\nC = torch.einsum('bnd,bdm->bnm', A, B)     # identical to torch.bmm(A, B)\nprint(C.shape)                              # torch.Size([8, 5, 3])\n\n# gather: pick one value per row by a per-row index (no loop)\nscores = torch.tensor([[0.1, 0.9, 0.3], [0.7, 0.2, 0.5]])\nidx = torch.tensor([[1], [0]])              # 'take the argmax column of each row'\npicked = scores.gather(dim=1, index=idx)    # -> [[0.9], [0.7]]\n\n# scatter: the inverse - write values at per-row positions\nout = torch.zeros_like(scores)\nout.scatter_(dim=1, index=idx, src=torch.ones_like(idx, dtype=torch.float))",
          "caption": "einsum names axes instead of memorizing argument order; gather/scatter are the vectorized form of `for i: out[i] = x[i, idx[i]]`."
        }
      ],
      "useCases": [
        "einsum('bqd,bkd->bqk', Q, K) is literally the attention score computation in every transformer (Module 08) - one line, no loop over batch or heads.",
        "gather is how cross-entropy loss picks out 'the logit at the true class' per row, and how beam search collects the tokens along each surviving path.",
        "Strides/views explain why .permute(0,2,1,3).reshape(...) on attention heads sometimes needs a .contiguous() first - the reshape after a permute is not always expressible as a stride edit.",
        "Reduction axis choice (dim=0 vs dim=-1) is the single most common shape bug when computing per-sample vs per-feature statistics in normalization layers (Module 04+)."
      ],
      "pitfalls": [
        "reshape() silently falls back to a copy when the requested shape isn't expressible as a stride edit (e.g., after a non-trivial permute) - view() instead raises, which is the safer choice when you want to *know* you're getting a view.",
        "In-place ops (add_, mul_, scatter_) mutate shared storage - if two tensors are views of each other, an in-place op on one silently changes the other, and can break autograd ('a leaf Variable that requires grad is being used in an in-place operation').",
        "einsum with a typo'd index string fails loudly (dimension mismatch) but a *valid-looking wrong* string (swapping which axis is summed) fails silently with a wrong-shaped, wrong-valued answer - always sanity-check one small case against a loop or torch.matmul.",
        "gather/scatter require the index tensor's shape to match the source except along dim, and its dtype must be int64 (long) - a float or int32 index tensor raises a cryptic error.",
        "Reducing over the wrong axis (dim=0 instead of dim=-1, or forgetting keepdim=True before a broadcast) is the single most common silent shape bug in this entire curriculum - print .shape after every reduction until it's automatic."
      ],
      "connections": [
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Builds directly on broadcasting - strides are the mechanism that makes broadcasting (and views) free."
        },
        {
          "ref": "transformers/self-attention",
          "text": "Attention's Q·K^T and the softmax-weighted sum over V are both einsum contractions at scale."
        },
        {
          "ref": "foundations/linear-algebra",
          "text": "Matrix multiplication, trace, and outer products - explained here as einsum patterns - get their full mathematical treatment next."
        },
        {
          "text": "Module 15 (PyTorch internals) goes one level deeper: storage objects, custom autograd Functions, and how .backward() walks the computation graph built from these same tensor ops."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What two things does a stride vector let you compute?",
          "a": "The flat-buffer offset of any multi-index, via offset = sum(index_j * stride_j)."
        },
        {
          "q": "Is torch's .t() (transpose) a copy or a view?",
          "a": "A view - it only swaps strides; no data moves, which is also why the result isn't contiguous."
        },
        {
          "q": "When does .reshape() silently copy instead of viewing?",
          "a": "When the target shape can't be expressed as a stride edit on the current layout (e.g., after certain permutes) - .view() would raise instead."
        },
        {
          "q": "What does einsum('ij,jk->ik', A, B) compute?",
          "a": "Matrix multiplication A @ B - j is repeated across inputs and absent from the output, so it's summed."
        },
        {
          "q": "What does einsum('ii->', A) compute?",
          "a": "The trace of A - the sum of diagonal elements."
        },
        {
          "q": "What is gather used for?",
          "a": "Vectorized per-row (or per-axis) indexed lookup - e.g., picking each sample's logit at its true class for cross-entropy."
        },
        {
          "q": "Required dtype for a gather/scatter index tensor?",
          "a": "int64 (long) - a float or int32 index raises an error."
        },
        {
          "q": "Why can an in-place op break autograd?",
          "a": "It overwrites a leaf tensor's data (or a value needed for the backward pass) in memory that a view shares, corrupting the recorded computation graph."
        },
        {
          "q": "Name a reduction bug that's purely a shape mistake.",
          "a": "Reducing over dim=0 (batch) when you meant dim=-1 (features), or forgetting keepdim=True before broadcasting the result back."
        },
        {
          "q": "What does .contiguous() actually do?",
          "a": "Copies the tensor's data into a new buffer laid out in standard row-major order, matching its logical shape."
        },
        {
          "q": "How do you check if two tensors share memory?",
          "a": "torch.Tensor.storage().data_ptr() equality, or np.shares_memory(a, b) in NumPy."
        }
      ],
      "standard": [
        {
          "q": "Explain, in terms of strides, why transposing a matrix is free but iterating over the transposed result is slower.",
          "a": "Transpose swaps the stride vector - for a (m,n) row-major matrix with strides (n,1), the transpose reports shape (n,m) with strides (1,n) over the *same* buffer, so no data moves: O(1). But sequential access along the new last axis now jumps n elements in memory each step instead of 1, breaking cache-line locality and defeating the prefetcher - so a downstream op that streams the array sequentially (a reduction, a copy, a compiled kernel expecting row-major input) runs slower, or first pays for a .contiguous() copy.",
          "deepDive": {
            "q": "Why do BLAS matmul kernels care about contiguity at all if they can index with strides?",
            "a": "Because peak throughput comes from cache-blocked/tiled inner loops that assume predictable sequential access to pack small tiles into registers and L1/L2 cache; arbitrary strides break that packing pattern and either force a slow fallback path or an internal copy - so libraries frequently special-case or require contiguous (or at least well-strided) inputs for the fast path."
          }
        },
        {
          "q": "Rewrite a naive double loop that computes, for each of B batches, C[b] = A[b] @ B_mat[b] for (n,d) x (d,m) matrices, as a single vectorized call - and explain the complexity difference.",
          "a": "torch.einsum('bnd,bdm->bnm', A, B_mat) (equivalently torch.bmm). The loop version still does the same O(B*n*d*m) floating point operations, but pays Python-level dispatch overhead B times and can't share the batched kernel launch; the vectorized call issues one kernel that a GPU can parallelize across the batch dimension and a CPU BLAS can pipeline, so wall-clock drops even though asymptotic flop count is identical - the lesson from 01-01 about constant factors, not big-O, generalizes to batching.",
          "deepDive": {
            "q": "When would the loop version actually be preferable?",
            "a": "When each batch element has a different shape (ragged batches) - einsum/bmm require uniform shapes, so you'd either pad (wasting compute) or fall back to a loop/list comprehension, trading vectorization speed for shape flexibility."
          }
        },
        {
          "q": "You call x.view(2, 6) on a tensor and get a RuntimeError about the tensor not being contiguous. What's happening, and what are your two fixes?",
          "a": "view() insists the new shape be reachable by reinterpreting the existing stride vector alone - it never copies data. If x was produced by an operation like transpose() or a non-trivial slice, its memory layout may not admit that reinterpretation for the requested shape. Fix 1: call x.contiguous().view(2, 6), paying for one copy that restores row-major order. Fix 2: call x.reshape(2, 6) directly - reshape() tries view() first and transparently falls back to a copy when needed, trading a hidden performance cost for convenience.",
          "deepDive": {
            "q": "Why does PyTorch even distinguish view() and reshape() instead of just always doing what reshape() does?",
            "a": "So performance-sensitive code can assert 'this must be free' - view() failing loudly is a signal that a copy would have silently crept in, which matters in hot training loops where an unexpected O(n) copy per step can dominate runtime at scale."
          }
        },
        {
          "q": "How would you implement cross-entropy loss's 'pick the logit at the true class per sample' step without a Python loop, for a (batch, num_classes) logits tensor and a (batch,) labels tensor?",
          "a": "logits.gather(dim=1, index=labels.unsqueeze(1)).squeeze(1) - unsqueeze makes labels shape (batch,1) to match gather's dimensionality requirement along dim=1, gather pulls one value per row at the given column index, and squeeze removes the now-unneeded size-1 axis back to (batch,).",
          "deepDive": {
            "q": "How does scatter_ implement the reverse operation - building a one-hot matrix from label indices?",
            "a": "torch.zeros(batch, num_classes).scatter_(1, labels.unsqueeze(1), 1.0) writes a 1.0 into column labels[i] of row i for every i - the vectorized form of a one-hot encoding loop, and the same primitive that back-propagates gradients through gather in reverse."
          }
        },
        {
          "q": "Two tensors a and b are views of the same storage. You run b.add_(1) inside a training loop. What can go wrong, and how do you avoid it?",
          "a": "Because a and b share memory, b.add_(1) also changes every value visible through a - if a is a parameter, an activation autograd needs for the backward pass, or something you assumed was untouched elsewhere in the loop, you get silently wrong gradients or a RuntimeError about a leaf/in-place-modified tensor needed for backward. Avoid it by using out-of-place ops (b = b + 1) whenever a tensor might be shared, or by explicitly cloning (b = a.clone()) when you need an independent copy to mutate.",
          "deepDive": {
            "q": "Why does autograd specifically complain about in-place ops on tensors 'needed for backward'?",
            "a": "Some backward formulas require the *original* forward values (e.g., d(tanh(x))/dx = 1 - tanh(x)^2 needs tanh(x)'s output); if that output tensor is overwritten in place before backward() runs, the saved reference now points at the wrong numbers, so PyTorch tracks a version counter per tensor and raises the moment it detects a mismatch, rather than silently returning a wrong gradient."
          }
        },
        {
          "q": "Given a (batch, seq, heads, head_dim) tensor produced by splitting embeddings into attention heads, you call .permute(0,2,1,3) to get (batch, heads, seq, head_dim) and then .reshape(batch, heads, seq*head_dim). Why might this need a .contiguous() in between, and what's the fix?",
          "a": "permute reorders strides (a view, O(1)) but reshape after a permute often can't express the merge of the (seq, head_dim) axes as a pure stride edit anymore, because those axes are no longer adjacent in the underlying buffer's stride order - so PyTorch either raises (view) or silently copies (reshape). The idiomatic fix is .permute(0,2,1,3).contiguous().view(batch, heads, seq*head_dim): pay for one explicit copy that restores row-major order, then the merge becomes a free stride edit.",
          "deepDive": {
            "q": "Is there a way to avoid the copy entirely?",
            "a": "Sometimes - if the downstream kernel accepts strided input directly (many attention/matmul kernels do, since they index with strides internally), you can skip contiguous() and pass the permuted view straight through; whether that's faster depends on whether the kernel's strided access pattern still hits cache efficiently, which is exactly why flash-attention-style kernels are written to fuse these steps rather than materialize the reshaped tensor at all."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Stride vector",
        "back": "Per-axis number of elements to skip in the flat buffer to move one step along that axis; offset = sum(index_j * stride_j)."
      },
      {
        "type": "intuition",
        "front": "View vs copy, the one-line test",
        "back": "Does the op only rewrite the stride vector (view, O(1)) or does it move/reduce bytes (copy, O(n))? transpose/permute/most reshapes = view; contiguous/fancy-index/clone = copy."
      },
      {
        "type": "formula",
        "front": "einsum('ij,jk->ik', A, B)",
        "back": "Matrix multiplication - j is repeated across inputs and dropped from the output, so it's summed over."
      },
      {
        "type": "formula",
        "front": "einsum('ii->', A)",
        "back": "The trace of A (sum of diagonal elements) - i appears twice with no output index."
      },
      {
        "type": "definition",
        "front": "gather",
        "back": "Vectorized per-row/axis indexed lookup: out[i] = x[i, idx[i]] without a Python loop; index dtype must be int64."
      },
      {
        "type": "definition",
        "front": "scatter_",
        "back": "The inverse of gather - writes values at per-row/axis index positions in place; builds one-hot encodings vectorized."
      },
      {
        "type": "pitfall",
        "front": "view() raises, reshape() copies",
        "back": "view() insists the new shape is a pure stride edit and errors if not; reshape() silently falls back to a copy - use view() when you need to *know* it's free."
      },
      {
        "type": "pitfall",
        "front": "In-place op on a shared view",
        "back": "add_/mul_/scatter_ mutate shared storage - can silently corrupt an aliased tensor or break autograd's saved values needed for backward."
      },
      {
        "type": "pitfall",
        "front": "Wrong reduction axis",
        "back": "The most common silent shape bug: dim=0 (batch) vs dim=-1 (features), and forgetting keepdim=True before broadcasting back."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Tensor Views (official docs)",
        "url": "https://pytorch.org/docs/stable/tensor_view.html"
      },
      {
        "title": "PyTorch: torch.einsum",
        "url": "https://pytorch.org/docs/stable/generated/torch.einsum.html"
      },
      {
        "title": "PyTorch: torch.gather / torch.scatter_",
        "url": "https://pytorch.org/docs/stable/generated/torch.gather.html"
      },
      {
        "title": "NumPy: Internal memory layout of an ndarray",
        "url": "https://numpy.org/doc/stable/reference/arrays.ndarray.html#internal-memory-layout-of-an-ndarray"
      }
    ],
    "demos": []
  },
  "pandas": {
    "level": "intro",
    "body": {
      "intuition": [
        "Real data rarely arrives as a clean tensor - it arrives as a table with mixed types, missing values, and columns that need to be joined, filtered, and reshaped before a model can see them. Pandas is NumPy's answer for that layer: a DataFrame is a collection of labeled, possibly-different-dtype columns, each backed by a contiguous NumPy array, with an index that lets you align, join, and filter by label instead of by raw position.",
        "The mental model that keeps pandas from feeling arbitrary is: columns are Series (labeled 1-D arrays), operations broadcast and vectorize exactly like NumPy underneath, and groupby is 'split the rows into groups, apply a function to each group's columns, combine the results back into one table' - the same split-apply-combine pattern shows up constantly in data science, from computing per-class statistics to building the leaderboards in Module 20's experiment tracking.",
        "The California Housing dataset used in this lesson is a good stand-in for the tabular problems you'll hit constantly outside of pure deep learning: predicting a continuous target (median house value) from a mix of geographic, demographic, and structural features - exactly the shape of data that gradient boosting and simple neural nets (Module 02) both compete on."
      ],
      "math": [
        {
          "h": "Split-apply-combine",
          "paras": [
            "groupby(key).agg(f) partitions rows into groups sharing a key value, applies an aggregation f independently to each group, then concatenates the per-group results back into one table indexed by the group keys. It is the tabular analogue of a reduction: instead of reducing an entire array to one number, you reduce each group to one row."
          ],
          "tex": "\\text{groupby}(k).\\text{agg}(f)\\big(X\\big) = \\Big\\{\\, f\\big(X_{[X_k = v]}\\big) \\;\\Big|\\; v \\in \\text{unique}(X_k) \\,\\Big\\}",
          "texNote": "For each distinct key value v, select the rows where the key column equals v, apply f to that subset, and stack the results - one output row per distinct key."
        },
        {
          "h": "Join cardinality",
          "paras": [
            "Merging two tables on a key produces rows equal to, for each matching key value, the *product* of how many times that value appears on each side - a one-to-many join multiplies rows on the 'many' side, and a many-to-many join can blow up row count unexpectedly if a key isn't actually unique where you assumed it was."
          ],
          "tex": "|\\text{merge}(A, B, \\text{on}=k)| = \\sum_{v} \\text{count}_A(k{=}v) \\cdot \\text{count}_B(k{=}v)",
          "texNote": "If key v appears 3 times in A and 2 times in B, the merge produces 6 rows for that key - always check for unexpected row-count growth after a join."
        }
      ],
      "code": [
        {
          "h": "Loading, inspecting, and filtering",
          "paras": [
            "The first five minutes with any new dataset: shape, dtypes, missing values, then a boolean-mask filter - the tabular equivalent of NumPy boolean indexing from the previous lesson."
          ],
          "code": "import pandas as pd\nfrom sklearn.datasets import fetch_california_housing\n\ndata = fetch_california_housing(as_frame=True)\ndf = data.frame\n\nprint(df.shape)                 # (20640, 9)\nprint(df.dtypes)                # all float64 here; real data mixes int/float/object/datetime\nprint(df.isna().sum())          # per-column missing-value counts\n\n# boolean-mask filter: expensive coastal-ish houses with few rooms per household\nmask = (df['MedHouseVal'] > 3.0) & (df['AveRooms'] < 5)\nsubset = df[mask]\nprint(subset.shape)",
          "caption": "df[boolean_series] is the same masking idea as NumPy - pandas just carries column labels and dtypes along for the ride."
        },
        {
          "h": "groupby and merge",
          "paras": [
            "Bucket a continuous feature, then aggregate the target per bucket - a one-line sanity check that a feature actually correlates with the label before building any model."
          ],
          "code": "import pandas as pd\n\n# split-apply-combine: median house value by income quartile\ndf['income_bin'] = pd.qcut(df['MedInc'], q=4, labels=['low', 'mid-low', 'mid-high', 'high'])\nsummary = df.groupby('income_bin', observed=True)['MedHouseVal'].agg(['mean', 'median', 'count'])\nprint(summary)\n\n# merge: attach a lookup table by key (illustrative - not part of California Housing)\nregion_lookup = pd.DataFrame({'income_bin': ['low', 'mid-low', 'mid-high', 'high'],\n                               'typical_buyer': ['first-time', 'starter', 'move-up', 'luxury']})\nenriched = df.merge(region_lookup, on='income_bin', how='left')",
          "caption": "groupby().agg() is split-apply-combine in one line; merge() is a SQL-style join with an explicit how= to control unmatched rows."
        }
      ],
      "useCases": [
        "Exploratory data analysis before any modeling: shape, dtypes, missingness, and per-group summaries are the first thing you run on a new dataset, in interviews and in practice alike.",
        "Feature engineering pipelines - binning, one-hot encoding categorical columns, merging auxiliary tables - happen in pandas before tensors ever enter a model.",
        "Every classical-ML tabular problem (Module 02's linear/logistic regression, Module 03's trees/boosting) is fed by a pandas DataFrame, not a raw tensor.",
        "Logging and experiment tracking (Module 20) commonly land results in a DataFrame for groupby-based leaderboards and pivot tables."
      ],
      "pitfalls": [
        "SettingWithCopyWarning: chained indexing like df[df.x > 0]['y'] = 1 may write to a temporary copy, not the original - use .loc[df.x > 0, 'y'] = 1 instead.",
        "merge() silently changes row count on unexpected duplicate keys - a 'one-to-one' join that's actually one-to-many multiplies rows without an error; check len() before and after.",
        "Mixed dtypes coerce to object (Python-level, slow, no vectorization) the moment one value in a numeric column is a string or NaN-of-the-wrong-kind - dtype='object' columns lose all of pandas' speed advantage.",
        "groupby drops NaN keys silently by default - rows whose group key is missing vanish from the result unless you handle them explicitly (dropna=False).",
        ".iloc (position-based) vs .loc (label-based) confusion: after filtering or sorting, the index labels no longer match row position, so iloc[0] and loc[0] can return different rows entirely."
      ],
      "connections": [
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Every pandas column is backed by a NumPy array underneath - the vectorization and broadcasting rules from the first lesson still apply."
        },
        {
          "ref": "foundations/matplotlib",
          "text": "The next lesson plots exactly this kind of grouped/aggregated DataFrame output - .plot() calls into matplotlib directly."
        },
        {
          "ref": "foundations/pytorch-data-loading",
          "text": "A cleaned pandas DataFrame is the typical bridge into a custom torch Dataset - .values or .to_numpy() hands off to tensors."
        },
        {
          "text": "Module 02's classical regression/classification models and Module 03's tree ensembles both consume tabular features assembled exactly this way."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a pandas Series?",
          "a": "A labeled 1-D array - one column of a DataFrame, backed by a NumPy array with an index."
        },
        {
          "q": "How do you filter rows by a boolean condition safely for later assignment?",
          "a": "df.loc[condition, 'col'] = value - avoids the SettingWithCopyWarning from chained indexing."
        },
        {
          "q": "What does groupby().agg() implement conceptually?",
          "a": "Split-apply-combine: partition rows by key, apply a function to each group, concatenate results into one table."
        },
        {
          "q": "What happens to row count when you merge on a key that isn't unique on one side?",
          "a": "It multiplies - a one-to-many join duplicates rows on the 'one' side to match every row on the 'many' side."
        },
        {
          "q": "iloc vs loc - what's the difference?",
          "a": "iloc is purely position-based (0-indexed); loc is label-based (uses the index/column labels), which can diverge from position after filtering or sorting."
        },
        {
          "q": "How do you check for missing values per column?",
          "a": "df.isna().sum() - counts NaN/null entries column by column."
        },
        {
          "q": "What does pd.qcut do?",
          "a": "Bins a continuous column into quantile-based buckets (equal counts per bucket) rather than equal-width bins."
        },
        {
          "q": "Why does a numeric column silently become dtype object?",
          "a": "One non-numeric value (a stray string, or the wrong NaN representation) forces pandas to fall back to Python-object storage, losing vectorized speed."
        },
        {
          "q": "Default behavior of groupby on NaN keys?",
          "a": "Rows with a missing group key are dropped from the result unless dropna=False is passed."
        },
        {
          "q": "How do you convert a DataFrame to a NumPy array / torch tensor?",
          "a": "df.to_numpy() (or .values), then torch.from_numpy() or torch.tensor() to hand off to a model."
        }
      ],
      "standard": [
        {
          "q": "Explain why df[df.x > 0]['y'] = 1 can silently fail to modify df, and give the fix.",
          "a": "df[df.x > 0] first creates a new (possibly a view, possibly a copy - pandas doesn't guarantee which) intermediate DataFrame; the second [...] = 1 then assigns into that intermediate, which may or may not be backed by the same memory as df. When it's a copy, the assignment is silently lost and df is unchanged - pandas raises SettingWithCopyWarning as a heads-up, but it's easy to miss. The fix is a single .loc call that expresses both the row filter and the column selection at once: df.loc[df.x > 0, 'y'] = 1, which pandas guarantees operates on df directly.",
          "deepDive": {
            "q": "Why doesn't pandas just always guarantee a view or always guarantee a copy?",
            "a": "Whether df[mask] can be a view depends on whether the underlying block manager can express the filtered rows as a contiguous slice of the original memory - for a boolean mask that selects non-contiguous rows, it generally can't, so it must copy; for a contiguous slice (df[10:20]) a view is possible. Because this is an implementation detail that can change between pandas versions, the library refuses to promise either and instead warns you to be explicit."
          }
        },
        {
          "q": "You merge two DataFrames on a customer_id key and the result has more rows than either input. What happened, and how do you defend against it?",
          "a": "The key wasn't unique on at least one side - a 'many-to-many' or unexpected 'one-to-many' relationship means merge produces, for each key value, the cross-product of matching rows from both sides (count_A(v) * count_B(v)), which can be far larger than either input. Defend against it by checking df['customer_id'].is_unique before merging when you expect one-to-one, or by asserting len(merged) == len(left) after a left join that should be one-to-one, and by passing validate='one_to_one' (or the appropriate variant) to merge(), which raises immediately if the assumption is violated.",
          "deepDive": {
            "q": "What's the difference between how='left' and how='inner' here, and when does that distinction matter most?",
            "a": "how='inner' keeps only keys present on both sides (rows with no match vanish silently); how='left' keeps every row of the left table, filling unmatched right-side columns with NaN. The distinction matters most when you need to know your row count is preserved (audit trails, joining features onto a fixed label set) - inner joins can silently drop labeled examples, which is a subtle form of data leakage/bias if the missingness isn't random."
          }
        },
        {
          "q": "How would you compute, for each of 4 income quartiles, the mean and standard deviation of house value, and explain what groupby is doing under the hood?",
          "a": "df.groupby(pd.qcut(df['MedInc'], 4))['MedHouseVal'].agg(['mean', 'std']). Under the hood groupby builds a mapping from each distinct bin label to the integer row positions belonging to that bin (the 'split'), then for each bin slices out those rows' MedHouseVal values and calls the aggregation function on that 1-D array (the 'apply' - this is just a NumPy reduction per group), then stacks the per-group scalars back into a DataFrame indexed by bin label (the 'combine'). It's conceptually a for-loop over groups, but pandas implements the split step with sorted/hashed row-position arrays so it avoids a literal Python loop over rows.",
          "deepDive": {
            "q": "How does this generalize to a custom aggregation that isn't a built-in string like 'mean'?",
            "a": "df.groupby(...)['col'].apply(custom_fn) calls custom_fn on each group's Series and concatenates whatever it returns - if custom_fn returns a scalar you get one row per group (like agg); if it returns a Series or DataFrame you get a result with a hierarchical index, which is how you'd implement something like 'the top-3 rows by value within each group'."
          }
        },
        {
          "q": "A DataFrame column that should be all floats keeps showing dtype object, and .mean() on it raises a TypeError. Diagnose and fix.",
          "a": "dtype object almost always means at least one entry isn't a native numeric type - commonly a stray string ('N/A', '-', an empty string) used as a missing-value placeholder instead of NaN, or numbers that were read in as strings from a CSV with inconsistent formatting. Diagnose with df['col'].apply(type).value_counts() to see which rows carry a non-numeric Python type, or pd.to_numeric(df['col'], errors='coerce') to attempt conversion and see which entries become NaN. Fix by cleaning those placeholder values (replace them with actual NaN) and then casting explicitly with pd.to_numeric or .astype(float).",
          "deepDive": {
            "q": "Why does this matter for performance, not just correctness?",
            "a": "An object-dtype column stores boxed Python objects with per-element type dispatch, exactly like the interpreted loop from 01-01 - every arithmetic op on it falls back to slow, unvectorized Python-level iteration instead of a compiled NumPy loop, so a single contaminating string can silently make an entire column's operations 10-100x slower even after the immediate error is worked around with errors='coerce'."
          }
        },
        {
          "q": "Design a pandas pipeline to go from a raw California Housing CSV to a clean (X, y) pair ready for torch.tensor(), handling missing values and a categorical column.",
          "a": "1) pd.read_csv, then df.isna().sum() to audit missingness; 2) impute or drop - e.g. df['col'].fillna(df['col'].median()) for a numeric column with a small missing fraction, or df.dropna(subset=['critical_col']) when imputation would be misleading; 3) encode any categorical column with pd.get_dummies(df, columns=['cat_col']) (one-hot) or an explicit ordinal mapping if there's a natural order; 4) split off the target: y = df.pop('MedHouseVal'), X = df; 5) convert with X_t = torch.tensor(X.to_numpy(dtype='float32')) and y_t = torch.tensor(y.to_numpy(dtype='float32')) - float32 explicitly, since pandas/NumPy default to float64 and torch's default is float32 (the dtype pitfall from 01-01).",
          "deepDive": {
            "q": "Where in this pipeline does data leakage most commonly sneak in, and how do you prevent it?",
            "a": "Computing the imputation value (e.g., df['col'].median()) or any normalization statistic on the *full* dataset before the train/test split leaks test-set information into training - the fix is to split first, fit the imputer/scaler on the training set only, then apply those same fitted values to transform the test set, never recomputing statistics on test data (the same principle 25-10's leakage trap makes explicit for feature selection)."
          }
        },
        {
          "q": "You call df.groupby('category').transform('mean') instead of df.groupby('category').agg('mean'). What's the difference in output shape, and when would you reach for transform instead of agg?",
          "a": "agg collapses each group down to one row per distinct key, producing a smaller result indexed by the group key. transform instead returns a result with the SAME shape (same length, same index) as the original DataFrame - it broadcasts the aggregated value back out to every row belonging to that group. You reach for transform when you need the group statistic aligned back onto the original rows for a further row-wise computation, e.g. df['deviation'] = df['value'] - df.groupby('category')['value'].transform('mean') computes each row's deviation from its own group's mean in one vectorized expression, without a separate merge step to rejoin a smaller agg result back onto the original table.",
          "deepDive": {
            "q": "How would you implement the same 'deviation from group mean' feature using agg + merge instead, and why is transform usually preferred?",
            "a": "group_means = df.groupby('category')['value'].agg('mean').reset_index(name='group_mean'); df = df.merge(group_means, on='category'); df['deviation'] = df['value'] - df['group_mean'] - functionally equivalent, but it requires an explicit merge (with its own row-count and key-matching considerations from the earlier merge discussion) and a temporary column cleanup; transform is preferred because it's a single expression with no merge-key bookkeeping, guarantees the output aligns row-for-row with the input by construction, and is typically faster since it avoids materializing an intermediate reduced table and rejoining it."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "pandas Series",
        "back": "A labeled 1-D array - one DataFrame column, backed by a NumPy array plus an index."
      },
      {
        "type": "intuition",
        "front": "groupby().agg() in one sentence",
        "back": "Split-apply-combine: partition rows by key, apply a function per group, stack results into one table."
      },
      {
        "type": "pitfall",
        "front": "SettingWithCopyWarning cause",
        "back": "Chained indexing df[mask]['col']=v may write to a temporary copy - use df.loc[mask,'col']=v instead."
      },
      {
        "type": "pitfall",
        "front": "Merge row-count surprise",
        "back": "A join on a non-unique key multiplies rows (count_A(v)*count_B(v) per key value) - check len() or pass validate=."
      },
      {
        "type": "definition",
        "front": "iloc vs loc",
        "back": "iloc = position-based (0-indexed); loc = label-based - they diverge once the index no longer matches row position."
      },
      {
        "type": "pitfall",
        "front": "Numeric column becomes dtype object",
        "back": "One stray non-numeric value (placeholder string, bad NaN) forces slow, unvectorized Python-object storage."
      },
      {
        "type": "pitfall",
        "front": "groupby drops NaN keys by default",
        "back": "Rows whose group key is missing vanish from the result unless dropna=False is passed."
      },
      {
        "type": "formula",
        "front": "Merge output row count",
        "back": "sum over key values v of count_A(v) * count_B(v) - a one-to-many or many-to-many join multiplies, doesn't just union."
      }
    ],
    "refs": [
      {
        "title": "pandas: User Guide - Indexing and selecting data",
        "url": "https://pandas.pydata.org/docs/user_guide/indexing.html"
      },
      {
        "title": "pandas: Group by: split-apply-combine",
        "url": "https://pandas.pydata.org/docs/user_guide/groupby.html"
      },
      {
        "title": "pandas: Merge, join, concatenate and compare",
        "url": "https://pandas.pydata.org/docs/user_guide/merging.html"
      },
      {
        "title": "scikit-learn: California Housing dataset",
        "url": "https://scikit-learn.org/stable/datasets/real_world.html#california-housing-dataset"
      }
    ],
    "demos": []
  },
  "matplotlib": {
    "level": "intro",
    "body": {
      "intuition": [
        "A model's numbers lie to you far less often than its numbers *summarized wrong* do. A loss curve, a confusion matrix, a scatter of predicted-vs-actual - these are how you catch overfitting, class imbalance, and outliers before they cost you a week of debugging. Visualization isn't decoration on top of ML; for most practitioners it's the primary debugging tool, used more often than a debugger.",
        "Matplotlib's object model is two layers: a Figure (the canvas/window) contains one or more Axes (an individual plot with its own x/y scales, ticks, and data). Almost every confusing matplotlib snippet becomes clear once you stop calling top-level plt.plot()/plt.title() functions (which implicitly act on 'whatever the current axes is') and instead grab fig, ax = plt.subplots() explicitly and call ax.plot()/ax.set_title() - the explicit form is more verbose but never ambiguous about which subplot you're drawing into.",
        "The habit worth building here is: never trust a summary statistic you haven't plotted. A dataset can have identical mean, variance, and correlation to another while looking completely different (Anscombe's quartet is the classic demonstration) - a histogram, scatter plot, or loss curve surfaces problems that a printed number hides."
      ],
      "math": [
        {
          "h": "Why identical statistics can hide different distributions",
          "paras": [
            "Anscombe's quartet: four datasets share the same mean, variance, correlation, and linear regression line to two decimal places, yet one is linear, one is a clean curve, one has a single outlier driving the whole fit, and one is a vertical line with one outlier. Summary statistics are lossy projections of a distribution - a scatter plot preserves the information they discard."
          ],
          "tex": "\\bar{x}, \\bar{y}, \\; s_x^2, s_y^2, \\; r_{xy}, \\; \\hat{\\beta}_0, \\hat{\\beta}_1 \\;\\; \\text{identical} \\;\\; \\centernot\\Longrightarrow \\;\\; p(x,y) \\;\\; \\text{identical}",
          "texNote": "Matching every low-order statistic does not imply matching distributions - always look at the data, not just its summary."
        },
        {
          "h": "Reading a log-scale loss curve",
          "paras": [
            "Training loss typically decays roughly geometrically early in training; on a linear y-axis that looks like a curve that flattens out and hides late-training progress, while on a log y-axis a geometric decay renders as a straight line - deviations from that line (plateaus, sudden drops, divergence) become visually obvious instead of buried in a shrinking y-range."
          ],
          "tex": "L_t \\approx L_0 \\cdot \\rho^t \\;\\Longrightarrow\\; \\log L_t \\approx \\log L_0 + t \\log \\rho",
          "texNote": "A geometrically-decaying loss is a straight line on a log(y) vs t plot - that's why loss curves are almost always shown log-scale."
        }
      ],
      "code": [
        {
          "h": "The explicit Figure/Axes pattern",
          "paras": [
            "Building any plot with the object-oriented API, which stays unambiguous even with multiple subplots - the pattern you should default to over bare plt.plot()."
          ],
          "code": "import matplotlib.pyplot as plt\nimport numpy as np\n\nepochs = np.arange(1, 51)\ntrain_loss = 2.0 * 0.92 ** epochs + 0.05 * np.random.randn(50)\nval_loss = 2.0 * 0.90 ** epochs + 0.15 + 0.08 * np.random.randn(50)\n\nfig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))\n\nax1.plot(epochs, train_loss, label='train')\nax1.plot(epochs, val_loss, label='val')\nax1.set_yscale('log')                     # geometric decay -> straight line\nax1.set_xlabel('epoch'); ax1.set_ylabel('loss'); ax1.legend()\nax1.set_title('Loss (log scale)')\n\nax2.scatter(train_loss, val_loss, alpha=0.6, s=15)\nax2.set_xlabel('train loss'); ax2.set_ylabel('val loss')\nax2.set_title('Overfitting check: val should track train')\n\nfig.tight_layout()\nfig.savefig('training_curves.png', dpi=150)",
          "caption": "fig.subplots() returns explicit Axes objects - every call targets exactly one subplot, no ambiguity about 'current axes'."
        },
        {
          "h": "Diagnostic plots every practitioner reaches for",
          "paras": [
            "A confusion matrix and a predicted-vs-actual scatter are the two fastest ways to see *how* a model is wrong, not just *that* it's wrong."
          ],
          "code": "import matplotlib.pyplot as plt\nimport numpy as np\n\n# confusion matrix as a heatmap\ncm = np.array([[85, 5, 2], [7, 78, 6], [3, 9, 80]])  # rows=true, cols=predicted\nfig, ax = plt.subplots(figsize=(4, 4))\nim = ax.imshow(cm, cmap='Blues')\nax.set_xticks(range(3)); ax.set_yticks(range(3))\nax.set_xlabel('predicted'); ax.set_ylabel('true')\nfor i in range(3):\n    for j in range(3):\n        ax.text(j, i, cm[i, j], ha='center', va='center',\n                 color='white' if cm[i, j] > cm.max()/2 else 'black')\nfig.colorbar(im, ax=ax, label='count')\n\n# predicted vs actual, with the y=x reference line\ny_true = np.random.randn(200) * 2 + 5\ny_pred = y_true + np.random.randn(200) * 0.8\nfig2, ax2 = plt.subplots()\nax2.scatter(y_true, y_pred, alpha=0.5, s=12)\nlims = [min(y_true.min(), y_pred.min()), max(y_true.max(), y_pred.max())]\nax2.plot(lims, lims, 'r--', label='perfect prediction')  # y = x\nax2.set_xlabel('actual'); ax2.set_ylabel('predicted'); ax2.legend()",
          "caption": "A confusion matrix shows which classes get confused for which; a y=x reference line on predicted-vs-actual makes bias instantly visible."
        }
      ],
      "useCases": [
        "Loss/metric curves during training are the primary tool for spotting overfitting (train and val diverging), underfitting (both plateau high), and instability (loss spikes/NaNs).",
        "Confusion matrices and per-class precision/recall bar charts diagnose *which* classes a classifier struggles with, not just an aggregate accuracy number.",
        "Every subsequent module's demos and this site's Visualize section (179 interactive demos) build on exactly these plotting primitives, just animated.",
        "Exploratory data analysis - histograms of feature distributions, scatter matrices of feature pairs - catches data quality issues (outliers, skew, leakage) before any model is trained."
      ],
      "pitfalls": [
        "Mixing the implicit pyplot state-machine API (plt.plot, plt.title) with the explicit object-oriented API (ax.plot, ax.set_title) in the same script - plt.title() after creating multiple subplots titles whichever axes matplotlib currently considers 'active', which is easy to get wrong.",
        "Forgetting fig.tight_layout() (or constrained_layout=True) with multiple subplots - labels and titles overlap or get clipped at the figure edge.",
        "A linear y-axis on a loss curve that decays over orders of magnitude hides all the late-training signal in a flat-looking tail - use ax.set_yscale('log').",
        "Comparing two curves on axes with different y-limits when eyeballing 'which is better' - matplotlib auto-scales each subplot independently unless you explicitly call sharey=True or set the same ylim on both.",
        "Plotting a huge scatter (100k+ points) with the default opaque markers - overplotting hides density entirely; use alpha= transparency or a 2-D histogram/hexbin instead."
      ],
      "connections": [
        {
          "ref": "foundations/pandas",
          "text": "DataFrame.plot() is a thin wrapper that calls into matplotlib directly - everything learned here explains what that convenience method is doing."
        },
        {
          "ref": "foundations/probability",
          "text": "Histograms and density plots in the next lessons are how you visually check whether sampled data matches an assumed distribution."
        },
        {
          "text": "Module 20 (MLOps/experiment tracking) automates exactly these plots - loss curves, confusion matrices - into dashboards logged per run."
        },
        {
          "text": "The site's own Visualize section (/visualize/, 179 interactive demos) is this lesson's ideas taken further: matplotlib static plots become canvas + requestAnimationFrame animations."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What's the difference between a Figure and an Axes in matplotlib?",
          "a": "Figure is the whole canvas/window; Axes is one individual plot (its own x/y scales, ticks, data) - a Figure can contain multiple Axes."
        },
        {
          "q": "Why prefer fig, ax = plt.subplots() over bare plt.plot()?",
          "a": "It's explicit about which subplot you're drawing into - bare plt.* calls act on an implicit 'current axes', which gets ambiguous with multiple subplots."
        },
        {
          "q": "Why plot loss curves on a log y-axis?",
          "a": "Loss typically decays geometrically; log-scale renders that as a straight line, making late-training plateaus/drops visible instead of compressed near zero."
        },
        {
          "q": "What does a confusion matrix show that accuracy doesn't?",
          "a": "Which specific classes get mistaken for which - accuracy is one aggregate number that hides per-class failure patterns."
        },
        {
          "q": "Fix for overlapping subplot titles/labels?",
          "a": "fig.tight_layout() or constrained_layout=True when creating the figure."
        },
        {
          "q": "What's overplotting, and one fix?",
          "a": "Too many overlapping opaque points hide density; fix with alpha= transparency or switch to a 2-D histogram/hexbin."
        },
        {
          "q": "What does Anscombe's quartet demonstrate?",
          "a": "Four datasets with identical mean/variance/correlation/regression line can look completely different when plotted - summary stats are lossy."
        },
        {
          "q": "How do you save a figure to a file?",
          "a": "fig.savefig('name.png', dpi=150) - dpi controls resolution for raster formats."
        },
        {
          "q": "Why add a y=x reference line to a predicted-vs-actual scatter?",
          "a": "It makes systematic bias instantly visible - points consistently above/below the line show over/under-prediction."
        },
        {
          "q": "How do you make two subplots share the same y-axis scale for fair comparison?",
          "a": "Pass sharey=True to plt.subplots(), or set the same ylim explicitly on both Axes."
        }
      ],
      "standard": [
        {
          "q": "You have a script that creates two subplots with plt.subplots(1,2) and then calls plt.title('My Plot') once. Why might the title end up on the wrong subplot, or only one subplot?",
          "a": "plt.title() is part of the implicit pyplot state-machine API - it doesn't take an axes argument, so it applies to whichever Axes matplotlib currently considers 'active' (generally the most recently created or most recently drawn-into one), not necessarily the one you intended. With two subplots this is ambiguous the moment you've called anything on the second axes. The fix is to use the explicit object-oriented API throughout: ax1.set_title(...) and ax2.set_title(...) on the specific Axes objects returned by subplots(), removing any ambiguity about which plot is being labeled.",
          "deepDive": {
            "q": "Why does matplotlib even offer both APIs instead of just one?",
            "a": "The pyplot state-machine API (plt.plot, plt.title, ...) is a MATLAB-style convenience layer designed for quick, single-plot interactive use (a REPL or a notebook cell with one figure); the object-oriented API (fig, ax = plt.subplots(); ax.plot(...)) is what pyplot itself calls under the hood and is the recommended approach for anything programmatic, reusable, or with multiple subplots, precisely because it removes the hidden 'current axes' state."
          }
        },
        {
          "q": "A training loss curve looks like it's flattened out completely after epoch 20 on a linear y-axis, but the model keeps improving on the validation metric. What's going on, and how do you fix the plot?",
          "a": "Loss usually decays roughly geometrically (each epoch multiplies remaining loss by some factor < 1), so on a linear axis the early large drops compress the y-range and all the smaller-but-still-real late-training improvements become invisible near the x-axis. Switching to ax.set_yscale('log') turns a geometric decay into a straight line and rescales so late-training changes - which might be a 5% relative improvement, just as meaningful as an early 50% drop - become visually proportionate to their relative size rather than their absolute size.",
          "deepDive": {
            "q": "When would a linear scale actually be the right choice instead?",
            "a": "When the quantity you're plotting doesn't decay multiplicatively - e.g., a metric bounded in [0,1] like accuracy, or a loss that's expected to plateau near a genuine floor (irreducible noise) rather than keep shrinking - a log scale on a metric that isn't behaving geometrically can visually exaggerate noise near a low value, since equal-looking gaps near zero on a log scale represent huge relative swings."
          }
        },
        {
          "q": "Design a single figure that would help you diagnose whether a regression model is overfitting, and walk through what each panel tells you.",
          "a": "A 1x2 figure: left panel plots train and validation loss vs epoch on a log y-axis - overfitting shows as train loss continuing to fall while val loss flattens or rises (the classic diverging-curves signature); right panel is a scatter of predicted vs actual values on the validation set with a y=x reference line - overfitting to specific training examples (rather than the underlying function) often shows as a *good* fit on a train-set version of this plot but a scattered, biased cloud on the val-set version, and the reference line makes any systematic over/under-prediction pattern visible at a glance rather than buried in an aggregate R^2 number.",
          "deepDive": {
            "q": "What would each panel look like under underfitting instead, and how would you tell the two failure modes apart from the plots alone?",
            "a": "Underfitting shows both train and val loss curves plateauing together at a high value (never diverging, because the model is too simple to fit even the training data) - the left panel's tell is 'both curves flat and close together but high', versus overfitting's 'curves clearly diverging with val above train'. On the right panel, underfitting typically shows a systematic pattern in the residuals (e.g., points curving away from y=x in one direction) because the model's functional form is too limited, whereas overfitting's scatter looks noisier/wider but without a systematic curved pattern."
          }
        },
        {
          "q": "You're plotting a scatter of 500,000 data points and the resulting figure is just a solid block of color with no visible structure. What's happening and what are two fixes?",
          "a": "This is overplotting: at that density, opaque markers stack on top of each other and the plot only shows 'point present or not', losing all information about relative density. Fix 1: set alpha=0.02-0.1 on the scatter so overlapping points visually accumulate into darker regions, recovering a density signal. Fix 2: abandon the scatter entirely for a 2-D histogram (ax.hist2d) or hexbin (ax.hexbin), which bins the plane and colors each cell by count - both are designed for exactly this data volume and render in roughly the same time regardless of point count.",
          "deepDive": {
            "q": "Why might hexbin be preferred over a rectangular 2-D histogram for this?",
            "a": "Hexagonal binning has more uniform neighbor-distance properties than square binning (every hexagon's neighbors are equidistant, unlike a square grid where diagonal neighbors are farther), which tends to produce a visually less grid-artifacted density estimate - it's a minor aesthetic/perceptual advantage rather than a fundamental statistical one."
          }
        },
        {
          "q": "Explain Anscombe's quartet as an interview-ready argument for why you should always plot data, not just compute summary statistics.",
          "a": "Anscombe's quartet is four (x,y) datasets constructed so that the mean of x, mean of y, variance of both, Pearson correlation, and the fitted linear regression line are identical (to two decimal places) across all four - yet plotted, they look nothing alike: one is a clean linear relationship, one is a clear nonlinear curve that a linear fit misses entirely, one is a perfect line except for a single outlier that drags the fit off course, and one is a vertical cluster of x-values plus one high-leverage outlier that manufactures a fake correlation. It's the canonical demonstration that any fixed set of summary statistics is a lossy projection of a distribution - two datasets can agree on every number you'd normally report and still require completely different modeling decisions, which is why EDA always includes plots, not just a stats table.",
          "deepDive": {
            "q": "What's a modern, higher-dimensional analogue of this same lesson?",
            "a": "The Datasaurus Dozen extends the idea to a dozen wildly different 2-D shapes (including a dinosaur silhouette) all sharing the same summary statistics to two decimals; in higher dimensions, the analogous caution is that PCA/UMAP/t-SNE visualizations of feature spaces (Module 11+) can reveal cluster structure, outliers, or leakage patterns that column-wise summary statistics alone never would."
          }
        },
        {
          "q": "You need to compare four models' training curves on one figure, but the lines are hard to tell apart in grayscale printouts and for colorblind viewers. How would you fix this without just picking 'nicer' colors?",
          "a": "Don't rely on color alone to encode a categorical distinction that needs to survive grayscale or colorblind viewing - pair color with a redundant visual channel: a different linestyle per series (solid/dashed/dotted/dash-dot via the linestyle= argument), different marker shapes at intervals (marker='o','s','^','x'), and direct end-of-line labels (annotating each curve's final point with its name) instead of relying solely on a color-keyed legend. This is the same 'don't encode information in a single fragile channel' principle as accessible web design - redundant encoding degrades gracefully instead of failing completely when one channel (color) is unavailable.",
          "deepDive": {
            "q": "Beyond linestyle/markers, what's a colormap-level choice that specifically helps colorblind viewers when color IS necessary (e.g., a continuous heatmap)?",
            "a": "Use a perceptually uniform, colorblind-safe colormap such as matplotlib's 'viridis' (the default since matplotlib 2.0) instead of 'jet' or 'rainbow' - viridis is designed so perceived brightness changes monotonically with the data value (so it still reads correctly when converted to grayscale) and remains distinguishable under the most common forms of color vision deficiency, whereas 'jet' has non-monotonic luminance and creates false visual boundaries/artifacts that don't correspond to real jumps in the underlying data."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Figure vs Axes",
        "back": "Figure = the whole canvas/window; Axes = one individual plot (own x/y scales, ticks, data) - a Figure can hold multiple Axes."
      },
      {
        "type": "intuition",
        "front": "Why the explicit fig, ax = plt.subplots() pattern",
        "back": "Every call targets a specific Axes object - no ambiguity about 'current axes' the way bare plt.plot()/plt.title() have."
      },
      {
        "type": "pitfall",
        "front": "Linear-scale loss curve",
        "back": "Geometric decay compresses late-training signal near zero on a linear axis - use ax.set_yscale('log') to see it as a straight line."
      },
      {
        "type": "intuition",
        "front": "Confusion matrix vs accuracy",
        "back": "Accuracy is one number; a confusion matrix shows which specific classes get confused for which - the diagnostic detail accuracy hides."
      },
      {
        "type": "pitfall",
        "front": "Overplotting",
        "back": "Too many opaque points stack into a solid block, hiding density - fix with alpha= transparency or hist2d/hexbin."
      },
      {
        "type": "definition",
        "front": "Anscombe's quartet",
        "back": "Four datasets with identical mean/variance/correlation/regression line that look completely different plotted - proof summary stats are lossy."
      },
      {
        "type": "pitfall",
        "front": "Overlapping subplot labels/titles",
        "back": "Fix with fig.tight_layout() or constrained_layout=True when creating the figure."
      },
      {
        "type": "intuition",
        "front": "y=x reference line on predicted-vs-actual",
        "back": "Makes systematic prediction bias (over/under-prediction) instantly visible instead of buried in an aggregate error metric."
      }
    ],
    "refs": [
      {
        "title": "Matplotlib: Quick start guide (Figure/Axes anatomy)",
        "url": "https://matplotlib.org/stable/users/explain/quick_start.html"
      },
      {
        "title": "Matplotlib: pyplot vs object-oriented interface",
        "url": "https://matplotlib.org/stable/users/explain/figure/api_interfaces.html"
      },
      {
        "title": "Anscombe, Graphs in Statistical Analysis (1973)",
        "url": "https://www.tandfonline.com/doi/abs/10.1080/00031305.1973.10478966"
      },
      {
        "title": "Matplotlib: hexbin / hist2d for large scatter",
        "url": "https://matplotlib.org/stable/gallery/statistics/hexbin_demo.html"
      }
    ],
    "demos": []
  },
  "pytorch-data-loading": {
    "level": "intro",
    "body": {
      "intuition": [
        "A model only ever sees batches of tensors, but real datasets live as files on disk, rows in a DataFrame, or images in a folder. PyTorch's Dataset/DataLoader pair is the bridge: a Dataset answers two questions - 'how many examples are there' (__len__) and 'give me example i' (__getitem__) - and a DataLoader wraps any Dataset with batching, shuffling, and (critically) parallel loading, so the GPU never sits idle waiting for the next batch to be read and preprocessed on CPU.",
        "The reason this is worth a dedicated lesson rather than 'just write a for loop' is throughput: if loading and augmenting one example takes 5ms and your model consumes a batch of 64 in 10ms, a single-process loader spends 320ms preparing what the GPU consumes in 10ms - the GPU is idle 97% of the time. num_workers>0 spins up separate processes to prepare future batches while the current one trains, and pin_memory + non_blocking transfers overlap the CPU-to-GPU copy with computation too.",
        "FashionMNIST (used in this lesson) is a good stand-in for the general image-pipeline shape: fixed-size inputs, an integer label per example, and a torchvision transform pipeline that converts raw images to normalized tensors - the same shape of pipeline scales up to ImageNet-sized datasets in Module 06, just with heavier decoding and augmentation per item."
      ],
      "math": [
        {
          "h": "Idle-GPU time as a queueing problem",
          "paras": [
            "If preparing one batch takes t_load and consuming it takes t_compute, a single-process (synchronous) pipeline pays t_load + t_compute per step - GPU idle for the whole t_load. With enough parallel workers overlapping load with the *previous* batch's compute, the per-step wall time approaches max(t_load / W, t_compute) for W workers, until compute itself becomes the bottleneck."
          ],
          "tex": "T_{\\text{sync}} = t_{\\text{load}} + t_{\\text{compute}} \\qquad T_{\\text{overlapped}} \\approx \\max\\!\\left(\\frac{t_{\\text{load}}}{W},\\; t_{\\text{compute}}\\right)",
          "texNote": "Enough workers hide loading time behind compute entirely - the pipeline becomes as fast as the GPU alone, up to the point where CPU work saturates all cores."
        },
        {
          "h": "Sampling without vs with replacement",
          "paras": [
            "Shuffling for an epoch is sampling a permutation of all N indices without replacement - every example seen exactly once. WeightedRandomSampler instead samples *with* replacement according to per-example weights, which is how class imbalance gets corrected: an under-represented class's examples get sampled more often per epoch than their raw count in the dataset would give them."
          ],
          "tex": "P(\\text{class } c \\text{ sampled}) \\propto \\sum_{i \\in c} w_i \\qquad w_i = \\frac{1}{\\text{count}(\\text{class of } i)} \\;\\text{(inverse-frequency weighting)}",
          "texNote": "Weighting each example by the inverse of its class frequency flattens the sampled class distribution toward uniform, regardless of the raw imbalance in the dataset."
        }
      ],
      "code": [
        {
          "h": "A custom Dataset and DataLoader",
          "paras": [
            "The minimum contract: __len__ and __getitem__. Everything else - batching, shuffling, parallelism - is the DataLoader's job, not the Dataset's."
          ],
          "code": "import torch\nfrom torch.utils.data import Dataset, DataLoader\nfrom torchvision import datasets, transforms\n\ntransform = transforms.Compose([\n    transforms.ToTensor(),                          # PIL image -> float32 tensor in [0,1]\n    transforms.Normalize((0.2860,), (0.3530,)),      # FashionMNIST channel mean/std\n])\n\ntrain_ds = datasets.FashionMNIST(root='./data', train=True, download=True, transform=transform)\nprint(len(train_ds))                # __len__: 60000\nimage, label = train_ds[0]          # __getitem__: (1, 28, 28) tensor, int label\nprint(image.shape, label)\n\ntrain_loader = DataLoader(\n    train_ds, batch_size=64, shuffle=True,\n    num_workers=4, pin_memory=True, drop_last=True,\n)\nfor images, labels in train_loader:              # (64, 1, 28, 28), (64,)\n    images = images.to('cuda', non_blocking=True)  # overlaps with pin_memory'd CPU tensor\n    labels = labels.to('cuda', non_blocking=True)\n    break",
          "caption": "shuffle=True re-permutes indices every epoch; num_workers parallelizes __getitem__ + transform across processes; pin_memory + non_blocking overlap the H2D copy with compute."
        },
        {
          "h": "A from-scratch Dataset over a pandas DataFrame",
          "paras": [
            "Wiring the previous lesson's cleaned DataFrame into the Dataset contract - the typical bridge from tabular data to a training loop."
          ],
          "code": "import torch\nfrom torch.utils.data import Dataset\n\nclass TabularDataset(Dataset):\n    def __init__(self, df, feature_cols, target_col):\n        self.X = torch.tensor(df[feature_cols].to_numpy(dtype='float32'))\n        self.y = torch.tensor(df[target_col].to_numpy(dtype='float32'))\n\n    def __len__(self):\n        return len(self.X)                       # required\n\n    def __getitem__(self, idx):\n        return self.X[idx], self.y[idx]          # required: one example by index\n\n# ds = TabularDataset(df, feature_cols=['MedInc', 'AveRooms'], target_col='MedHouseVal')\n# loader = DataLoader(ds, batch_size=32, shuffle=True)",
          "caption": "Any object with __len__ and __getitem__ can be batched, shuffled, and parallelized by DataLoader - no torchvision-specific magic required."
        }
      ],
      "useCases": [
        "Every training loop in every later module starts with a DataLoader - it is the universal interface between 'data on disk' and 'batches on the GPU'.",
        "WeightedRandomSampler corrects class imbalance at the sampling stage, an alternative to loss re-weighting used throughout classification modules.",
        "IterableDataset (the streaming alternative to map-style Dataset) is how you handle datasets too large to index randomly - sharded files, streamed web-scale text/image corpora in Modules 08-10.",
        "num_workers/pin_memory tuning is one of the first things to check when a training run's GPU utilization is unexpectedly low - a data-loading bottleneck, not a model problem."
      ],
      "pitfalls": [
        "Setting num_workers too high on a small machine causes worker-process startup/IPC overhead to exceed the time saved - benchmark, don't assume more is always faster.",
        "Applying a random augmentation transform without accounting for worker-process random seeding: each DataLoader worker is a separate process, and without correct seeding via worker_init_fn, all workers can produce the *same* 'random' augmentations - silently reducing effective data diversity.",
        "Forgetting drop_last=True with batch normalization: a final partial batch of size 1 makes BatchNorm's per-batch statistics undefined/degenerate.",
        "Computing dataset-wide normalization statistics (mean/std) on the full dataset including validation/test data - the same leakage pitfall as fitting a scaler on the full DataFrame before splitting.",
        "Doing heavy CPU work (large-image decode, complex augmentation) inside __getitem__ with num_workers=0 - it runs synchronously in the main process, blocking the GPU exactly as if there were no DataLoader abstraction at all."
      ],
      "connections": [
        {
          "ref": "foundations/pandas",
          "text": "A cleaned pandas DataFrame is the most common source of examples for a custom Dataset - .to_numpy() bridges directly to tensors."
        },
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Batching is broadcasting a model over a leading batch dimension - the vectorization ideas from the first lesson are why batches, not single examples, are efficient."
        },
        {
          "text": "Module 04's training-loop lessons build directly on the DataLoader introduced here - forward pass, loss, backward pass, optimizer step, repeat per batch."
        },
        {
          "text": "Module 06's image pipelines and Module 09's text pipelines extend this exact Dataset/DataLoader contract with heavier augmentation and tokenization inside __getitem__."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What two methods must a map-style PyTorch Dataset implement?",
          "a": "__len__ (number of examples) and __getitem__ (return one example given an index)."
        },
        {
          "q": "What does a DataLoader add on top of a Dataset?",
          "a": "Batching, shuffling, and parallel loading (num_workers) - the Dataset only knows how to fetch one example."
        },
        {
          "q": "Why does num_workers>0 speed up training?",
          "a": "It parallelizes data loading/preprocessing across separate processes so the next batch is ready while the GPU trains on the current one, instead of the GPU sitting idle during loading."
        },
        {
          "q": "What does pin_memory=True do?",
          "a": "Allocates batch tensors in page-locked host memory, enabling faster and asynchronous (non_blocking) transfer to the GPU."
        },
        {
          "q": "Why use drop_last=True with BatchNorm?",
          "a": "A final partial batch (possibly size 1) makes per-batch mean/variance statistics degenerate or undefined."
        },
        {
          "q": "Map-style vs iterable-style Dataset?",
          "a": "Map-style supports random access via __getitem__/index; IterableDataset only supports sequential iteration - used for streamed or too-large-to-index data."
        },
        {
          "q": "What does WeightedRandomSampler correct for?",
          "a": "Class imbalance - it samples with replacement according to per-example weights so under-represented classes appear more often per epoch."
        },
        {
          "q": "Where should dataset normalization statistics (mean/std) be computed from?",
          "a": "The training split only, then applied to validation/test - computing them on the full dataset leaks test information."
        },
        {
          "q": "What bug can multi-worker random augmentation cause if unseeded?",
          "a": "All worker processes can produce identical 'random' augmentations, silently reducing effective data diversity, unless worker_init_fn seeds them differently."
        },
        {
          "q": "What does shuffle=True change between epochs?",
          "a": "It re-samples a fresh random permutation of dataset indices each epoch, so batches contain a different mix of examples every pass."
        }
      ],
      "standard": [
        {
          "q": "You profile a training run and find GPU utilization is only 40%. Walk through how you'd diagnose and fix a data-loading bottleneck.",
          "a": "First confirm it's data-bound: time a few steps with the data pipeline replaced by pre-generated random tensors of the same shape - if GPU util jumps near 100%, loading is the bottleneck. Then increase num_workers incrementally (bench each setting; more isn't always better past core count), add pin_memory=True with .to(device, non_blocking=True), and move any CPU-heavy augmentation to be as cheap as possible per item (or precompute/cache what doesn't need to be randomized per epoch). If __getitem__ itself is inherently slow (large image decode), consider prefetching further ahead (prefetch_factor) or persistent_workers=True to avoid worker respawn overhead between epochs.",
          "deepDive": {
            "q": "Why might adding more workers eventually make throughput *worse*?",
            "a": "Beyond the number of physical CPU cores, additional worker processes compete for the same cores and add inter-process communication (IPC) overhead to shuttle batches back to the main process via shared memory - past the saturation point you're paying context-switch and serialization cost without any additional parallel throughput, so the sweet spot is usually near (but not exceeding) the core count minus what the main process itself needs."
          }
        },
        {
          "q": "Explain concretely why applying a random crop/flip augmentation inside __getitem__ can produce identical augmentations across all workers if you're not careful, and how to fix it.",
          "a": "Each DataLoader worker is a forked/spawned separate Python process; by default they may inherit or independently seed the global random state in a way that isn't automatically diversified per worker (this is especially true with the 'fork' start method, where all workers can start from the same seeded RNG state at fork time). If every worker's RNG produces the same sequence, every image processed by worker 0 gets the same augmentation draw as the corresponding image would on worker 1, silently reducing the effective diversity of augmented data across an epoch. Fix: pass a worker_init_fn to DataLoader that seeds each worker's RNG (Python's random, NumPy's, and torch's) using a value derived from torch.utils.data.get_worker_info().id, ensuring independent streams per worker.",
          "deepDive": {
            "q": "Does this issue also affect NumPy's RNG specifically, and why is that a common gotcha?",
            "a": "Yes - NumPy's legacy global RNG state (np.random.seed/np.random.rand) is a classic case where forked worker processes inherit the exact same internal state at fork time and then advance identically if no worker-specific reseeding happens, whereas torch's per-worker seeding is handled somewhat more automatically by DataLoader's default worker_init_fn for torch's own RNG - so bugs specifically surface in augmentation code that calls np.random directly instead of torch's generator, which is why explicit worker_init_fn seeding of all three RNGs (random, numpy, torch) is the robust fix."
          }
        },
        {
          "q": "You're building a Dataset for a corpus too large to fit in memory or index randomly (e.g., a sharded text corpus streamed from disk). What Dataset variant do you use, and what capability do you give up?",
          "a": "IterableDataset - you implement __iter__ instead of __len__/__getitem__, yielding examples sequentially (e.g., streaming through shard files one line at a time). You give up random access and, by extension, DataLoader's built-in shuffle=True (which requires indexing into the dataset) - shuffling instead has to be approximated with a fixed-size shuffle buffer that holds N examples in memory and randomly emits from that buffer while refilling from the stream, trading perfect epoch-level shuffling for a bounded-memory approximation.",
          "deepDive": {
            "q": "How do you correctly split work across multiple workers with an IterableDataset, given there's no index to partition?",
            "a": "You must manually partition the stream inside __iter__ using torch.utils.data.get_worker_info() to learn the current worker's id and total worker count, then have each worker skip/select a disjoint subset of shards or records (e.g., shard_id % num_workers == worker_id) - unlike map-style Datasets, DataLoader cannot automatically split an IterableDataset's work across workers, so getting this wrong silently duplicates every example num_workers times instead of partitioning them."
          }
        },
        {
          "q": "A classification dataset has 95% class A and 5% class B. Compare correcting this via WeightedRandomSampler vs via a weighted loss function, and when you'd prefer one over the other.",
          "a": "WeightedRandomSampler changes what the model *sees* - each epoch, class B examples are drawn with replacement more often (weight inversely proportional to class frequency), so the model is trained on a roughly balanced stream, which also means class B examples get reused (duplicated) within an epoch, increasing memorization risk for a small minority class. A weighted loss function (e.g., higher weight on class B's loss term in cross-entropy) instead sees the true unweighted data distribution once per epoch but scales the *gradient contribution* of minority-class errors, avoiding duplication but leaving the model less exposed to minority-class examples overall. Prefer sampling when the minority class has enough distinct examples to reuse safely and you want simpler, unweighted downstream metrics; prefer loss weighting when the minority class is very small (duplication risk high) or you're already using an imbalance-aware metric.",
          "deepDive": {
            "q": "Can you combine both, and is there a risk in doing so?",
            "a": "Yes, they're not mutually exclusive - but combining them double-corrects for the same imbalance (sampling already flattens the class distribution seen by the loss, then loss weighting flattens it again), which can overcorrect and hurt majority-class performance more than necessary; if combining, tune the loss weights down from the 'as if unweighted sampling' values, or pick one mechanism and validate against a held-out set rather than applying both at full strength by default."
          }
        },
        {
          "q": "Design the Dataset/DataLoader setup for a training script that must produce bit-for-bit reproducible batches across runs, given a fixed random seed.",
          "a": "Seed all relevant RNGs before creating the DataLoader: torch.manual_seed(seed), plus Python's random.seed(seed) and numpy.random.seed(seed) if __getitem__ or transforms use them. Pass a generator=torch.Generator().manual_seed(seed) to DataLoader so its internal shuffling permutation is deterministic. Set num_workers=0, or if using workers, pass a worker_init_fn that deterministically seeds each worker as a function of the base seed and worker id (not the wall-clock or an unseeded default) - and set persistent_workers based on run-to-run consistency needs. Also disable any nondeterministic backend kernels if bit-exactness matters beyond just the data pipeline (torch.use_deterministic_algorithms(True)).",
          "deepDive": {
            "q": "Why can num_workers>0 threaten reproducibility even with every RNG correctly seeded?",
            "a": "With multiple worker processes, the *order* in which prepared batches arrive back at the main process can vary run-to-run due to OS scheduling nondeterminism in how quickly each worker process completes its work - even though each individual worker's random augmentations are seeded deterministically, if the DataLoader interleaves results from multiple workers' queues, the exact sequence of batches consumed by the training loop can differ; num_workers=0 (single-process, fully synchronous) is the only setting that guarantees a fully deterministic batch order without additional safeguards."
          }
        },
        {
          "q": "Your Dataset's __getitem__ loads a large image from disk and applies a heavy augmentation pipeline (random crop, color jitter, blur) every epoch. Training is I/O and CPU bound even with num_workers maxed out. What are two architectural changes (not just more workers) that would help?",
          "a": "First, separate the parts of preprocessing that are the SAME every epoch from the parts that must be random: if resizing to a fixed base resolution or decoding the raw file format doesn't need to vary per epoch, do it once as an offline preprocessing pass (write out resized/decoded images or even pre-tokenized tensors to a fast format like a memory-mapped array or WebDataset shards) so __getitem__ only re-does the genuinely random augmentation steps at train time, not the expensive fixed decode. Second, if the augmentations themselves are the bottleneck, move image augmentation onto the GPU as a batched operation *after* the DataLoader hands off a batch of raw-ish tensors (e.g., using torchvision's GPU-accelerated transforms or a library like Kornia), trading CPU-per-item work for one vectorized GPU op per batch - the same 01-01 vectorization principle applied to the data pipeline instead of the model.",
          "deepDive": {
            "q": "What's the tradeoff of doing augmentation on GPU instead of CPU workers?",
            "a": "GPU augmentation competes for the same GPU compute/memory the model training itself needs, so if the GPU is already near saturation from the model's forward/backward pass, adding augmentation work there can slow down training even though it 'frees up' the CPU - whereas CPU-worker augmentation runs on otherwise-idle CPU cores in parallel with GPU compute; the right choice depends on which resource (CPU throughput vs GPU headroom) is actually the bottleneck, which is why profiling (comparing GPU utilization with a dummy-data pipeline vs the real one) should precede this architectural decision rather than guessing."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Map-style Dataset contract",
        "back": "Implement __len__ (count) and __getitem__ (fetch example by index) - DataLoader handles batching/shuffling/parallelism on top."
      },
      {
        "type": "intuition",
        "front": "Why num_workers>0 helps",
        "back": "Parallel processes prepare future batches while the GPU trains on the current one - overlaps loading with compute instead of stalling on it."
      },
      {
        "type": "definition",
        "front": "pin_memory + non_blocking",
        "back": "Page-locked host memory + async transfer - overlaps the CPU-to-GPU copy with computation instead of blocking on it."
      },
      {
        "type": "pitfall",
        "front": "Partial final batch + BatchNorm",
        "back": "A size-1 last batch makes per-batch mean/variance degenerate - use drop_last=True."
      },
      {
        "type": "pitfall",
        "front": "Unseeded multi-worker augmentation",
        "back": "Worker processes can share RNG state at fork time and produce identical 'random' augmentations - seed each worker independently via worker_init_fn."
      },
      {
        "type": "definition",
        "front": "Map-style vs IterableDataset",
        "back": "Map-style = random access (__getitem__); IterableDataset = sequential only (__iter__) - for data too large/streamed to index."
      },
      {
        "type": "formula",
        "front": "Inverse-frequency sampling weight",
        "back": "w_i = 1 / count(class of i) - used by WeightedRandomSampler to flatten a sampled class distribution toward uniform."
      },
      {
        "type": "pitfall",
        "front": "Normalization stats leakage",
        "back": "Computing mean/std for normalization on the full dataset (not just train split) leaks validation/test information."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Datasets & DataLoaders tutorial",
        "url": "https://pytorch.org/tutorials/beginner/basics/data_tutorial.html"
      },
      {
        "title": "PyTorch: torch.utils.data documentation",
        "url": "https://pytorch.org/docs/stable/data.html"
      },
      {
        "title": "PyTorch: Reproducibility notes",
        "url": "https://pytorch.org/docs/stable/notes/randomness.html"
      },
      {
        "title": "torchvision: FashionMNIST dataset",
        "url": "https://pytorch.org/vision/stable/generated/torchvision.datasets.FashionMNIST.html"
      }
    ],
    "demos": []
  },
  "probability": {
    "level": "intro",
    "body": {
      "intuition": [
        "Almost every model you'll build is, under the hood, a statement about probability: a classifier outputs P(class | input), a language model outputs P(next token | context), a generative model outputs P(data). The loss functions used to train them - cross-entropy, MSE, negative log-likelihood - are not arbitrary choices; they fall out of maximum likelihood estimation once you decide what probability distribution your outputs should follow (25-09 makes this identity exact).",
        "The two ideas worth internalizing before anything else: a random variable's *expectation* is a weighted average over its possible outcomes, and Bayes' theorem is just algebra on the definition of conditional probability - but that algebra is the engine behind everything from spam filters to how a model should update its beliefs given new evidence. Getting comfortable manipulating P(A|B), P(B|A), and P(A,B) interchangeably is a skill you will use in every remaining module.",
        "The Central Limit Theorem explains a fact you'll rely on constantly without naming it: averages of many roughly-independent things look approximately Gaussian, regardless of the shape of the underlying distribution - this is why mini-batch gradient noise, sample means, and many aggregate model behaviors are well-approximated by a normal distribution even when individual data points are not."
      ],
      "math": [
        {
          "h": "Bayes' theorem, and why it's just conditional-probability algebra",
          "paras": [
            "The definition of conditional probability, P(A|B) = P(A,B)/P(B), is symmetric in a way that's easy to miss: P(A,B) = P(B,A) also equals P(B|A)P(A). Setting those two expressions for the joint equal and dividing by P(B) gives Bayes' theorem - it isn't a separate law of probability, it's the same joint probability written two ways."
          ],
          "tex": "P(A \\mid B) = \\frac{P(B \\mid A)\\, P(A)}{P(B)} \\qquad P(B) = \\sum_{a} P(B \\mid A{=}a)\\, P(A{=}a)",
          "texNote": "Posterior = likelihood times prior, divided by a normalizing constant (the marginal, obtained by summing/integrating over every value the hidden variable could take)."
        },
        {
          "h": "Expectation and variance as weighted averages",
          "paras": [
            "Expectation is a probability-weighted average of outcomes; variance measures the average squared distance from that average - both are properties of a distribution, not of any single sample, and both are what a model's loss function is implicitly trying to control (minimize expected loss; a high-variance estimator is unreliable even if unbiased on average)."
          ],
          "tex": "\\mathbb{E}[X] = \\sum_x x \\cdot P(X{=}x) \\qquad \\text{Var}(X) = \\mathbb{E}\\big[(X - \\mathbb{E}[X])^2\\big] = \\mathbb{E}[X^2] - \\mathbb{E}[X]^2",
          "texNote": "The 'computational' variance formula (right-hand side) avoids a second pass over the data but can lose precision via catastrophic cancellation when E[X^2] and E[X]^2 are close."
        }
      ],
      "code": [
        {
          "h": "Bayes' theorem as a diagnostic-test problem",
          "paras": [
            "The classic counter-intuitive result: even an accurate test can produce mostly-false positives when the condition is rare - base rates dominate."
          ],
          "code": "import numpy as np\n\n# a disease with 1% prevalence; a test that's 95% sensitive, 90% specific\np_disease = 0.01\np_pos_given_disease = 0.95        # sensitivity\np_pos_given_healthy = 1 - 0.90    # 1 - specificity = false-positive rate\n\np_pos = (p_pos_given_disease * p_disease +\n         p_pos_given_healthy * (1 - p_disease))          # law of total probability\n\np_disease_given_pos = (p_pos_given_disease * p_disease) / p_pos   # Bayes\nprint(f\"P(disease | positive test) = {p_disease_given_pos:.3f}\")  # ~0.088 - mostly false positives!\n\n# verify by simulation\nrng = np.random.default_rng(0)\nn = 2_000_000\nhas_disease = rng.random(n) < p_disease\ntest_pos = np.where(has_disease, rng.random(n) < p_pos_given_disease,\n                                    rng.random(n) < p_pos_given_healthy)\nprint(f\"simulated: {has_disease[test_pos].mean():.3f}\")   # matches the closed form",
          "caption": "Low base rate + imperfect specificity = most positives are false positives - the reason screening-test results always need the prevalence, not just sensitivity/specificity."
        },
        {
          "h": "The Central Limit Theorem, shown not told",
          "paras": [
            "Averaging many samples from a wildly non-Gaussian distribution still produces something visibly bell-shaped - the mechanism behind why sample means and mini-batch statistics behave predictably."
          ],
          "code": "import numpy as np\n\nrng = np.random.default_rng(0)\nn_trials, batch_size = 20_000, 30\n\n# start from a heavily skewed exponential distribution, not remotely Gaussian\nraw = rng.exponential(scale=1.0, size=(n_trials, batch_size))\nbatch_means = raw.mean(axis=1)                    # 20,000 sample means of size 30\n\nprint(f\"population mean/std: {1.0:.3f} / {1.0:.3f}\")               # exponential(1): mean=std=1\nprint(f\"batch-mean mean/std: {batch_means.mean():.3f} / {batch_means.std():.3f}\")\n# std shrinks by ~1/sqrt(batch_size), and a histogram of batch_means looks Gaussian\n# even though `raw` itself is exponential, not Gaussian at all",
          "caption": "The individual samples are exponential (skewed, non-negative); their batch means are approximately Normal(mu, sigma/sqrt(n)) - the CLT in one snippet."
        }
      ],
      "useCases": [
        "Cross-entropy loss is exactly negative log-likelihood under a categorical distribution assumption - every classifier's training objective is a probability statement (tied to 25-09's MLE=CE identity).",
        "A/B testing and experimentation (Module 23) is applied probability: is an observed difference likely to be real or explainable by sampling noise alone?",
        "Bayesian updating (Module 23's Bayesian workflow) is how models incorporate prior knowledge with new evidence - the same algebra as the diagnostic-test example, at scale.",
        "Uncertainty quantification and calibration (Module 24) both start from 'what does it even mean for a model's output to BE a probability, and is it a well-calibrated one'."
      ],
      "pitfalls": [
        "Confusing P(A|B) with P(B|A) - the 'prosecutor's fallacy' (treating the probability of evidence given innocence as if it were the probability of innocence given evidence) is a real, high-stakes version of this exact mix-up.",
        "Ignoring the base rate (prior) when interpreting a conditional probability - a highly 'accurate' test can still produce mostly false positives when the condition being tested for is rare, as the code example shows.",
        "Treating independence as a default assumption rather than something to check - P(A,B) = P(A)P(B) only holds when A and B are actually independent; correlated features violate it constantly in real data.",
        "Using the 'computational' variance formula (E[X^2] - E[X]^2) naively on large-magnitude data - subtracting two large nearly-equal numbers loses floating-point precision; prefer a numerically stable one-pass algorithm (Welford's) when it matters.",
        "Assuming the Central Limit Theorem kicks in at any sample size - convergence to Gaussian can be slow for heavily skewed or heavy-tailed distributions, and 'n=30 is enough' is a rule of thumb, not a guarantee."
      ],
      "connections": [
        {
          "ref": "foundations/linear-algebra",
          "text": "Multivariate Gaussians and covariance matrices - the vector/matrix generalization of these ideas - build directly on the linear algebra from the previous lesson."
        },
        {
          "ref": "foundations/information-theory",
          "text": "The next lesson's entropy, cross-entropy, and KL divergence are all expectations of a log-probability - a direct extension of the expectation operator introduced here."
        },
        {
          "text": "Module 23 (Causal Inference) is this lesson's ideas taken to their limit: potential outcomes, Bayesian workflows, and hypothesis testing at scale."
        },
        {
          "text": "Module 24's calibration and conformal prediction lessons ask, rigorously, whether a model's stated probabilities mean what they claim to mean."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State Bayes' theorem.",
          "a": "P(A|B) = P(B|A) P(A) / P(B) - posterior proportional to likelihood times prior."
        },
        {
          "q": "Where does Bayes' theorem come from?",
          "a": "It's algebra on the definition of conditional probability: P(A,B) = P(A|B)P(B) = P(B|A)P(A), rearranged."
        },
        {
          "q": "Definition of expectation for a discrete random variable.",
          "a": "E[X] = sum over x of x * P(X=x) - a probability-weighted average of outcomes."
        },
        {
          "q": "Two formulas for variance.",
          "a": "Var(X) = E[(X-E[X])^2] (definitional) = E[X^2] - E[X]^2 (computational, less numerically stable)."
        },
        {
          "q": "What does independence mean mathematically?",
          "a": "P(A,B) = P(A)P(B) - knowing one event tells you nothing about the other's probability."
        },
        {
          "q": "What does the Central Limit Theorem say?",
          "a": "The sum/mean of many independent (or weakly dependent) random variables is approximately Gaussian, regardless of the individual variables' distribution."
        },
        {
          "q": "Why is a 95%-sensitive test's positive result not 95% reliable for a rare condition?",
          "a": "The base rate matters - Bayes' theorem shows P(condition|positive) depends heavily on the prior prevalence, not just sensitivity/specificity."
        },
        {
          "q": "Law of total probability, in one line.",
          "a": "P(B) = sum over a of P(B|A=a) P(A=a) - marginalize a joint distribution by summing out the other variable."
        },
        {
          "q": "What's the 'prosecutor's fallacy'?",
          "a": "Confusing P(evidence|innocent) with P(innocent|evidence) - treating a conditional probability as if it applied in the reverse direction."
        },
        {
          "q": "How does sample-mean standard deviation scale with sample size n?",
          "a": "By 1/sqrt(n) - the standard error shrinks with the square root of the number of samples, not linearly."
        },
        {
          "q": "Why is Welford's algorithm preferred over E[X^2]-E[X]^2 for variance?",
          "a": "It's numerically stable (avoids subtracting two large nearly-equal numbers) and computes variance in one streaming pass."
        }
      ],
      "standard": [
        {
          "q": "Derive Bayes' theorem from the definition of conditional probability, and explain what each term (prior, likelihood, posterior, marginal) means in a concrete classification context.",
          "a": "Start from the definition P(A|B) = P(A,B)/P(B). The joint P(A,B) is symmetric: it also equals P(B|A)P(A) by the same definition applied the other way. Substituting gives P(A|B) = P(B|A)P(A)/P(B). In a classification context with class C and features X: the prior P(C) is your belief about class frequency before seeing any features; the likelihood P(X|C) is how probable the observed features are under each class (what a generative classifier models directly); the posterior P(C|X) is what you actually want - the class probability given the observed features; and the marginal P(X) = sum_c P(X|C=c)P(C=c) is a normalizing constant ensuring the posterior sums to 1 across classes.",
          "deepDive": {
            "q": "How does this connect to the difference between generative and discriminative classifiers?",
            "a": "A generative classifier (e.g., naive Bayes, Gaussian discriminant analysis) explicitly models the likelihood P(X|C) and prior P(C), then applies Bayes' theorem to get P(C|X) at inference time - it can also generate new X samples per class. A discriminative classifier (logistic regression, most neural nets) skips straight to modeling P(C|X) directly, never explicitly representing P(X|C) or P(C) - usually more accurate for classification alone since it doesn't need to correctly model the (often harder) distribution of X itself, but it can't generate new data or easily handle missing features the way a generative model can."
          }
        },
        {
          "q": "A company reports their fraud-detection model has 99% recall and 99% specificity on a dataset where fraud is 0.1% of transactions. A user asks 'if the model flags my transaction, what's the chance it's actually fraud?' Walk through the calculation.",
          "a": "Let F = fraud (prior 0.001), Flag = model flags. P(Flag|F) = 0.99 (recall/sensitivity), P(Flag|not F) = 1 - 0.99 = 0.01 (false positive rate = 1 - specificity). By the law of total probability, P(Flag) = 0.99*0.001 + 0.01*0.999 = 0.00099 + 0.00999 = 0.01098. Bayes: P(F|Flag) = (0.99*0.001)/0.01098 ~ 0.090 - only about 9% of flagged transactions are actually fraud, even with a model that sounds highly accurate on both axes, because genuine fraud is so rare that the much larger pool of legitimate transactions produces more false positives in absolute count than true positives from the small fraud pool.",
          "deepDive": {
            "q": "What does this imply about how such a system should be deployed in practice?",
            "a": "The raw flag shouldn't trigger an automatic block - it should route to a review queue or a second-stage check, exactly the precision@K framing in 25-05's fraud lesson; and improving the *precision* at a fixed recall (often via a better threshold choice or a second, more expensive model on the flagged subset) matters more for user experience than pushing recall or specificity higher in isolation, since the base-rate imbalance dominates the naive-looking metrics."
          }
        },
        {
          "q": "Explain why mini-batch gradient estimates in SGD are often treated as approximately Gaussian-distributed noise around the true gradient, using the Central Limit Theorem.",
          "a": "A mini-batch gradient is itself a sample mean: it averages the per-example gradient contributions of B examples drawn (roughly) independently from the training distribution. Each individual example's gradient can have a complicated, non-Gaussian distribution, but by the CLT, the *average* of B such roughly-independent quantities converges toward a Gaussian distribution centered at the true (full-dataset) gradient, with variance shrinking as 1/B. This is why SGD noise is commonly modeled as additive Gaussian noise on the gradient in theoretical analyses (e.g., relating SGD to Langevin dynamics) - it's not an arbitrary modeling choice, it follows from treating the mini-batch as a sample mean.",
          "deepDive": {
            "q": "What breaks this approximation, and when does it matter in practice?",
            "a": "The CLT's convergence rate depends on how skewed/heavy-tailed the per-example gradient distribution is and how large B is; with very small batch sizes, heavily imbalanced data, or gradient distributions with heavy outlier tails (common early in training or near loss spikes), the Gaussian approximation is poor - this is part of why gradient clipping exists (bound the influence of rare extreme per-example gradients) and why very small-batch training can show qualitatively different, less Gaussian-looking noise behavior than the large-batch regime the theory is often derived for."
          }
        },
        {
          "q": "You compute variance using the formula Var(X) = E[X^2] - E[X]^2 on a dataset of numbers around 1,000,000 with a true standard deviation of about 5. What can go wrong numerically, and what's the fix?",
          "a": "E[X^2] and E[X]^2 are both approximately 10^12, while their true difference (the variance) is only about 25 - in float32/float64 arithmetic, subtracting two numbers that agree in their leading many significant digits loses most of the precision in the result (catastrophic cancellation), potentially producing a negative 'variance' or one accurate to only 1-2 significant digits. The fix is either to center the data first (subtract the mean, then compute mean of squared deviations directly - the definitional formula, which doesn't cancel large numbers) or to use a numerically stable streaming algorithm like Welford's, which updates a running mean and sum-of-squared-deviations incrementally without ever computing E[X^2] as a separate large quantity.",
          "deepDive": {
            "q": "Why would anyone use the E[X^2]-E[X]^2 formula at all, given this risk?",
            "a": "It's the natural one-pass formula when you're accumulating sum(x) and sum(x^2) simultaneously as data streams in and don't want to store all values for a second centering pass - useful for extremely large or truly streaming datasets where memory, not precision, is the binding constraint; Welford's algorithm gets both properties (one-pass, numerically stable) by updating mean and M2 (sum of squared deviations from the running mean) together, which is why most production statistics libraries use it instead of the naive two-moment formula."
          }
        },
        {
          "q": "How would you test whether two features in your dataset are actually independent, rather than assuming it?",
          "a": "Independence requires P(A,B) = P(A)P(B) for every combination of values, which is stronger than just zero linear correlation (uncorrelated does not imply independent - e.g., Y = X^2 for X symmetric around 0 has zero Pearson correlation with X but is completely dependent). For categorical features, a chi-squared test of independence on the contingency table checks whether observed joint counts differ significantly from the counts expected under independence. For continuous features, mutual information (an expectation of a log-ratio of joint to marginal densities - closely related to the KL divergence introduced in the next lesson) captures nonlinear dependence that correlation misses, or a permutation test comparing the observed joint statistic to its distribution under independently shuffled columns.",
          "deepDive": {
            "q": "Why does 'zero correlation does not imply independence' matter practically in feature engineering?",
            "a": "A linear model or a correlation-based feature-selection step can discard a feature with strong nonlinear predictive power simply because its linear correlation with the target happens to be near zero (the Y=X^2 example) - which is exactly the trap 24-04's saturated-gradient saliency example and 19-05's correlated-feature attribution pitfall both illustrate from different angles: a feature can matter a great deal without any linear signal being visible to a method that only checks for linear relationships."
          }
        },
        {
          "q": "Explain the difference between a frequentist confidence interval and a Bayesian credible interval for the same quantity, using the language of this lesson.",
          "a": "A frequentist 95% confidence interval is a statement about the PROCEDURE, not about any one realized interval: if you repeated the sampling-and-interval-construction process many times, 95% of the resulting intervals would contain the true (fixed, non-random) parameter - the parameter isn't treated as a random variable, so it's technically incorrect to say 'there's a 95% probability the true value is in this specific interval' once the interval is already computed. A Bayesian 95% credible interval instead treats the parameter itself as a random variable with a posterior distribution P(parameter | data), constructed via Bayes' theorem from a prior and the observed data's likelihood - it directly supports the statement 'given this prior and this data, there's a 95% probability the true parameter lies in this interval', because the probability statement is about the parameter's posterior distribution, not about a hypothetical repetition of the sampling procedure.",
          "deepDive": {
            "q": "Under what conditions do the two intervals tend to numerically coincide, and why does that make the distinction easy to blur in practice?",
            "a": "With a weak/uninformative (flat) prior and enough data that the likelihood dominates the posterior, a Bayesian credible interval often numerically converges toward the same bounds as the corresponding frequentist confidence interval - the posterior becomes shaped almost entirely by the data, mimicking the frequentist sampling distribution. This convergence is exactly why practitioners often (loosely, and technically incorrectly in the frequentist case) interpret a 95% CI as '95% probability the true value is in here' - the Bayesian interpretation IS valid under a matching-prior setup, so the intuitive reading happens to be numerically justified in that regime even though it isn't the frequentist interval's actual defined meaning."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Bayes' theorem",
        "back": "P(A|B) = P(B|A)P(A) / P(B) - posterior proportional to likelihood times prior, normalized by the marginal."
      },
      {
        "type": "definition",
        "front": "Expectation",
        "back": "E[X] = sum_x x * P(X=x) - a probability-weighted average of outcomes."
      },
      {
        "type": "formula",
        "front": "Variance, two forms",
        "back": "E[(X-E[X])^2] (definitional, stable) = E[X^2]-E[X]^2 (computational, can lose precision via cancellation)."
      },
      {
        "type": "definition",
        "front": "Independence",
        "back": "P(A,B) = P(A)P(B) for all values - stronger than zero correlation (Y=X^2 is dependent but can be uncorrelated with X)."
      },
      {
        "type": "intuition",
        "front": "Central Limit Theorem",
        "back": "Averages of many roughly-independent variables look approximately Gaussian, regardless of the individual variables' distribution; std shrinks as 1/sqrt(n)."
      },
      {
        "type": "pitfall",
        "front": "Base-rate neglect",
        "back": "An 'accurate' test on a rare condition can still be mostly false positives - P(condition|positive) depends heavily on the prior, not just sensitivity/specificity."
      },
      {
        "type": "pitfall",
        "front": "Prosecutor's fallacy",
        "back": "Confusing P(evidence|hypothesis) with P(hypothesis|evidence) - they're related by Bayes' theorem, not interchangeable."
      },
      {
        "type": "pitfall",
        "front": "Naive variance formula precision loss",
        "back": "E[X^2]-E[X]^2 subtracts two large nearly-equal numbers on large-magnitude data - use Welford's algorithm or center first."
      },
      {
        "type": "definition",
        "front": "Law of total probability",
        "back": "P(B) = sum_a P(B|A=a) P(A=a) - marginalize a joint distribution by summing out the other variable."
      }
    ],
    "refs": [
      {
        "title": "Wasserman, All of Statistics (Ch. 1-3, probability foundations)",
        "url": "https://link.springer.com/book/10.1007/978-0-387-21736-9"
      },
      {
        "title": "Welford's online algorithm for variance",
        "url": "https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm"
      },
      {
        "title": "3Blue1Brown: Bayes theorem visualized",
        "url": "https://www.3blue1brown.com/lessons/bayes-theorem"
      },
      {
        "title": "NumPy: Generator (random sampling API)",
        "url": "https://numpy.org/doc/stable/reference/random/generator.html"
      }
    ],
    "demos": []
  },
  "information-theory": {
    "level": "intro",
    "body": {
      "intuition": [
        "Entropy answers a deceptively simple question: on average, how many bits does it take to describe an outcome drawn from a given distribution? A fair coin flip needs exactly 1 bit; a coin that lands heads 99% of the time needs far less, because 'heads' is barely surprising and can be encoded cheaply - entropy is the theoretical floor on average encoding length, and it doubles as a measure of uncertainty: a uniform distribution (maximally unpredictable) has the highest entropy of any distribution over the same outcomes.",
        "Cross-entropy is what happens when your encoding scheme is built for the *wrong* distribution: if you design your code assuming distribution Q but the true distribution is P, you pay more bits on average than entropy's floor - and that gap is exactly the KL divergence. This is not a coincidence chosen for teaching purposes; it is why cross-entropy is the standard classification loss. Training a classifier by minimizing cross-entropy between predicted probabilities Q and true labels P is, bit for bit, minimizing the extra encoding cost of using your model's beliefs instead of the truth.",
        "Mutual information closes the loop: it measures how many bits knowing one variable saves you when describing another - zero if they're independent, and it captures nonlinear dependence that plain correlation misses entirely (the Y=X^2 example from the previous lesson has zero correlation but strictly positive mutual information). These three quantities - entropy, cross-entropy, KL divergence - are the vocabulary you'll use to talk about loss functions, calibration, and information flow through a network for the rest of this curriculum."
      ],
      "math": [
        {
          "h": "Entropy, cross-entropy, and KL divergence - one family of formulas",
          "paras": [
            "Entropy H(P) is the expected 'surprise' (-log P(x)) of outcomes drawn from P itself. Cross-entropy H(P,Q) is the expected surprise of outcomes drawn from P but measured using Q's log-probabilities - it's always at least H(P), and the gap is the KL divergence D_KL(P||Q), which is zero exactly when P=Q and strictly positive otherwise (Gibbs' inequality)."
          ],
          "tex": "H(P) = -\\sum_x P(x)\\log P(x) \\quad H(P,Q) = -\\sum_x P(x)\\log Q(x) \\quad D_{KL}(P\\Vert Q) = H(P,Q) - H(P) = \\sum_x P(x)\\log\\frac{P(x)}{Q(x)} \\ge 0",
          "texNote": "Cross-entropy = entropy + KL divergence. Minimizing cross-entropy against a fixed true label distribution P is exactly minimizing KL divergence, since H(P) doesn't depend on the model's parameters."
        },
        {
          "h": "Mutual information as a difference of entropies",
          "paras": [
            "Mutual information I(X;Y) measures how much uncertainty about X is removed by observing Y - equivalently, it's the KL divergence between the true joint distribution and the (independence-assuming) product of marginals, which is exactly zero when X and Y are independent."
          ],
          "tex": "I(X;Y) = H(X) - H(X\\mid Y) = D_{KL}\\big(P(X,Y) \\;\\Vert\\; P(X)P(Y)\\big) \\ge 0",
          "texNote": "I(X;Y)=0 if and only if X and Y are independent - unlike correlation, mutual information captures any kind of statistical dependence, linear or not."
        }
      ],
      "code": [
        {
          "h": "Entropy, cross-entropy, and KL from scratch",
          "paras": [
            "The three quantities computed directly from their definitions, showing the H(P,Q) = H(P) + D_KL(P||Q) identity holds numerically."
          ],
          "code": "import numpy as np\n\ndef entropy(p, eps=1e-12):\n    p = np.clip(p, eps, 1)\n    return -np.sum(p * np.log2(p))\n\ndef cross_entropy(p, q, eps=1e-12):\n    q = np.clip(q, eps, 1)\n    return -np.sum(p * np.log2(q))\n\ndef kl_divergence(p, q, eps=1e-12):\n    p, q = np.clip(p, eps, 1), np.clip(q, eps, 1)\n    return np.sum(p * np.log2(p / q))\n\ntrue_dist = np.array([0.7, 0.2, 0.1])          # true label distribution (or one-hot in practice)\nmodel_a   = np.array([0.6, 0.3, 0.1])          # a decent model\nmodel_b   = np.array([0.33, 0.33, 0.34])       # a poorly-calibrated (near-uniform) model\n\nfor name, q in [('model_a', model_a), ('model_b', model_b)]:\n    ce, kl = cross_entropy(true_dist, q), kl_divergence(true_dist, q)\n    print(f\"{name}: H(P,Q)={ce:.3f} bits, D_KL={kl:.3f} bits, H(P)+D_KL={entropy(true_dist)+kl:.3f}\")\n    # confirms H(P,Q) == H(P) + D_KL(P||Q) to floating-point precision",
          "caption": "Cross-entropy always equals entropy plus KL divergence - a worse model (model_b) pays a larger KL 'penalty' on top of the same irreducible entropy floor."
        },
        {
          "h": "Mutual information catches what correlation misses",
          "paras": [
            "The classic case: Y = X^2 for X symmetric around 0 has zero linear correlation with X, but mutual information correctly flags them as dependent."
          ],
          "code": "import numpy as np\nfrom sklearn.feature_selection import mutual_info_regression\n\nrng = np.random.default_rng(0)\nx = rng.uniform(-1, 1, 5000)\ny = x ** 2 + 0.01 * rng.standard_normal(5000)   # perfectly (nonlinearly) dependent\n\ncorr = np.corrcoef(x, y)[0, 1]\nmi = mutual_info_regression(x.reshape(-1, 1), y, random_state=0)[0]\nprint(f\"Pearson correlation: {corr:.4f}\")   # ~0.00 - looks independent!\nprint(f\"Mutual information: {mi:.4f} nats\") # clearly > 0 - correctly detects dependence",
          "caption": "Correlation only sees linear relationships; mutual information sees any statistical dependence, which is why it shows up in feature selection and information bottleneck analyses (Module 24)."
        }
      ],
      "useCases": [
        "Cross-entropy IS the standard classification loss - every softmax classifier in this curriculum trains by minimizing it, from Module 02's logistic regression through Module 08's transformers.",
        "KL divergence appears throughout: as a regularizer in VAEs (Module 11), as the trust-region constraint in RLHF/PPO (Module 24's overoptimization lesson), and as the basis of temperature scaling's calibration objective.",
        "Mutual information motivates representation learning objectives (maximize I between a representation and the signal you care about, InfoNCE-style contrastive losses in Module 12) and feature-selection methods that need to catch nonlinear dependence.",
        "Perplexity, the standard language-model evaluation metric, is just 2^(cross-entropy) - a transformation of the same quantity into an interpretable 'effective vocabulary size'."
      ],
      "pitfalls": [
        "Confusing entropy (a property of one distribution) with cross-entropy (a property of two distributions being compared) - they coincide only when the two distributions are identical.",
        "Computing log(0) when a predicted probability is exactly 0 for the true class - always clip probabilities away from the boundary (or use a numerically stable log-softmax + NLL formulation) before taking a log.",
        "KL divergence is NOT symmetric: D_KL(P||Q) != D_KL(Q||P) in general - which direction you minimize changes the character of the fit (mode-covering vs mode-seeking behavior), a distinction that matters in variational inference and distillation.",
        "Assuming mutual information is on a fixed, easily-interpretable scale like correlation's [-1,1] - MI is nonnegative and unbounded above, and its magnitude depends on the base of the logarithm (bits vs nats) and estimator used.",
        "Interpreting a lower cross-entropy loss number as automatically meaning better-calibrated probabilities - a model can achieve low average cross-entropy while still being poorly calibrated on specific subgroups or confidence ranges (Module 24's calibration lesson makes this precise)."
      ],
      "connections": [
        {
          "ref": "foundations/probability",
          "text": "Entropy, cross-entropy, and KL divergence are all expectations of a log-probability - a direct application of the expectation operator from the previous lesson."
        },
        {
          "ref": "foundations/calculus",
          "text": "The next lesson covers the gradients of cross-entropy loss with respect to model outputs - the derivative that actually drives every classifier's training."
        },
        {
          "text": "24-01's calibration lesson and 24-10's KL-regularized RLHF objective both build directly on the cross-entropy/KL vocabulary introduced here."
        },
        {
          "text": "25-09's MLE = cross-entropy derivation makes the training-objective connection exact, with a from-scratch numerical proof."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Definition of entropy H(P).",
          "a": "H(P) = -sum_x P(x) log P(x) - the expected 'surprise', and the theoretical minimum average bits to encode outcomes from P."
        },
        {
          "q": "Definition of cross-entropy H(P,Q).",
          "a": "H(P,Q) = -sum_x P(x) log Q(x) - expected surprise of outcomes from P, measured using Q's log-probabilities."
        },
        {
          "q": "Relationship between cross-entropy, entropy, and KL divergence.",
          "a": "H(P,Q) = H(P) + D_KL(P||Q) - cross-entropy is entropy plus the extra cost of using the wrong distribution."
        },
        {
          "q": "Is KL divergence symmetric?",
          "a": "No - D_KL(P||Q) != D_KL(Q||P) in general; it's a divergence, not a distance metric."
        },
        {
          "q": "Why is minimizing cross-entropy loss equivalent to minimizing KL divergence during training?",
          "a": "H(P) (the true label distribution's entropy) doesn't depend on model parameters, so minimizing H(P,Q) over the model's Q is the same optimization as minimizing D_KL(P||Q)."
        },
        {
          "q": "What does mutual information measure?",
          "a": "How much uncertainty about one variable is removed by observing another - zero iff the variables are independent, captures nonlinear dependence unlike correlation."
        },
        {
          "q": "What is perplexity, in terms of cross-entropy?",
          "a": "2^(cross-entropy in bits), or e^(cross-entropy in nats) - an interpretable 'effective vocabulary size' transform of the same loss."
        },
        {
          "q": "What's the entropy of a fair coin flip, in bits?",
          "a": "1 bit - H = -(0.5 log2 0.5 + 0.5 log2 0.5) = 1."
        },
        {
          "q": "Why must predicted probabilities be clipped away from 0 before taking a log for cross-entropy?",
          "a": "log(0) is -infinity - a numerically stable implementation clips or works in log-space (log-softmax) throughout."
        },
        {
          "q": "Which distribution over a fixed support has maximum entropy?",
          "a": "The uniform distribution - maximum uncertainty/unpredictability among all distributions over the same outcomes."
        },
        {
          "q": "Is D_KL(P||Q) ever negative?",
          "a": "No - it's always >= 0 (Gibbs' inequality), equal to zero exactly when P=Q almost everywhere."
        }
      ],
      "standard": [
        {
          "q": "Prove (or derive) that D_KL(P||Q) >= 0 for any two distributions P and Q, and explain the intuition.",
          "a": "By Jensen's inequality applied to the concave log function: D_KL(P||Q) = sum_x P(x) log(P(x)/Q(x)) = -sum_x P(x) log(Q(x)/P(x)) >= -log(sum_x P(x) * Q(x)/P(x)) = -log(sum_x Q(x)) = -log(1) = 0, since -log is convex so Jensen's flips the direction into a lower bound. Intuitively: you can never encode outcomes from P *more* efficiently by pretending they came from a different distribution Q than by using P's own optimal code - any mismatch between your assumed distribution and the true one can only cost extra bits, never save them, which is exactly Gibbs' inequality in information-theoretic language.",
          "deepDive": {
            "q": "Under what condition does equality D_KL(P||Q)=0 hold, and why does that matter for training?",
            "a": "Equality holds if and only if P(x)=Q(x) for every x where P(x)>0 (i.e., P and Q are identical wherever P has support) - which is why minimizing cross-entropy loss to its theoretical floor (H(P)) during training is only possible if the model can represent the true label distribution exactly; in practice with one-hot labels, P is a point mass, so the KL term vanishes only when the model assigns probability 1 to the correct class and 0 to everything else, an unreachable limit that's part of why cross-entropy loss decreases but never truly reaches zero in real training."
          }
        },
        {
          "q": "Explain why D_KL(P||Q) != D_KL(Q||P) with a concrete example, and describe the practically different behavior this asymmetry produces in variational inference.",
          "a": "D_KL(P||Q) = sum_x P(x) log(P(x)/Q(x)) weights the log-ratio by P(x) - if Q(x)=0 somewhere P(x)>0, the term blows up to infinity, so minimizing this direction over Q strongly penalizes Q assigning near-zero probability anywhere P has mass, forcing Q to 'cover' all of P's modes (mode-covering, can result in an overly spread-out Q). D_KL(Q||P) instead weights by Q(x) - it's cheap for Q to simply not place mass where P is near zero, so minimizing this direction lets Q concentrate on just one of P's modes and ignore the rest (mode-seeking). Concretely, if P is a bimodal mixture of two well-separated Gaussians and Q is constrained to be a single Gaussian, minimizing D_KL(P||Q) over Q tends to produce a wide Q straddling both modes (bad fit to either), while minimizing D_KL(Q||P) tends to produce a narrow Q that locks onto just one mode.",
          "deepDive": {
            "q": "Which direction does standard variational inference (e.g., a VAE's ELBO) actually minimize, and what's the practical consequence?",
            "a": "Variational inference typically minimizes D_KL(Q||P) (approximate posterior Q vs true posterior P) because that direction is the one that's tractable to optimize with the evidence lower bound (ELBO) - the practical consequence is that VI-fit approximate posteriors tend to be mode-seeking/underdispersed relative to the true posterior, systematically underestimating uncertainty, which is a well-known limitation motivating alternative approaches (MCMC, normalizing flows) when calibrated uncertainty matters more than a fast point estimate."
          }
        },
        {
          "q": "You train two models to the same cross-entropy loss value on a held-out set. Does that guarantee they have the same accuracy? The same calibration? Explain with the entropy decomposition.",
          "a": "Neither is guaranteed. Cross-entropy H(P,Q) = H(P) + D_KL(P||Q) is a single scalar aggregating errors across the entire predicted distribution and every example; two models can reach the same total KL divergence via completely different error patterns - one might be well-calibrated but occasionally very wrong on hard examples (contributing large per-example KL spikes on a few points), while the other is mildly overconfident everywhere (many small KL contributions spread evenly) - both averaging to the same number. Accuracy only depends on whether argmax(Q) matches the true label, which is invariant to how confident the correct-argmax predictions are, so a model can lose cross-entropy 'points' by being underconfident on already-correct predictions while matching another model's accuracy exactly; calibration (whether stated confidence matches empirical correctness frequency, per 24-01) is an entirely separate axis that a single aggregate loss number cannot certify.",
          "deepDive": {
            "q": "What diagnostic would distinguish these cases in practice?",
            "a": "Break the aggregate cross-entropy down per-example or per-confidence-bin: a reliability diagram (24-01) bins predictions by stated confidence and plots empirical accuracy against confidence - two models with identical average cross-entropy can show very different reliability curves, one hugging the diagonal (well-calibrated) and the other systematically above or below it, revealing the aggregate-vs-per-instance blind spot that a single loss scalar can't."
          }
        },
        {
          "q": "You want to select the top-K most predictive features for a target variable that has a nonlinear relationship with several candidate features. Why might ranking by Pearson correlation choose badly, and how would mutual information fix it - and what's the catch?",
          "a": "Pearson correlation only measures the strength of a *linear* relationship; a feature that's strongly predictive but nonlinearly related to the target (e.g., a U-shaped or periodic relationship) can have correlation near zero and get ranked low or discarded entirely, even though a downstream nonlinear model could exploit it perfectly - the Y=X^2 example is the canonical case. Mutual information I(X;Y) is nonnegative and equals zero only under true statistical independence, so it correctly assigns high MI to the U-shaped feature. The catch: MI is harder to estimate reliably from finite samples, especially for continuous variables (it requires density estimation or a k-nearest-neighbor-based estimator like the Kraskov-Stogbauer-Grassberger method), it has no natural upper bound for comparing 'how predictive' one feature is versus another the way a correlation coefficient in [-1,1] does, and estimator bias/variance can itself rank noisy features artificially high with small sample sizes.",
          "deepDive": {
            "q": "In a high-dimensional feature-selection setting, what's a practical middle ground between correlation and full mutual information?",
            "a": "Tree-based feature importance (e.g., from a gradient-boosted tree ensemble, Module 03) implicitly captures nonlinear and even interaction effects without needing explicit density estimation, since trees split on whatever threshold best reduces impurity regardless of the relationship's shape - it's a common practical substitute when MI estimation is too noisy or slow at scale, though it inherits its own biases (favoring high-cardinality features) that need separate correction."
          }
        },
        {
          "q": "Derive why perplexity = 2^(cross-entropy in bits) is interpreted as an 'effective vocabulary size', and explain what a perplexity of 50 means concretely for a language model.",
          "a": "If a model assigned uniform probability 1/V to every one of V possible next tokens (total ignorance among V equally likely choices), its cross-entropy per token would be -log2(1/V) = log2(V) bits, and perplexity would be 2^(log2 V) = V exactly - perplexity recovers the vocabulary size in this maximally-uncertain baseline case. For a real model with cross-entropy c bits per token, perplexity 2^c is interpreted as 'the model's uncertainty at each step is as if it were choosing uniformly among this many options', even though the model isn't actually restricting itself to a smaller vocabulary - it's a re-scaling of the same information-theoretic quantity into a more intuitive unit. A perplexity of 50 means the model's average per-token uncertainty is comparable to guessing uniformly among 50 equally-likely next tokens, substantially better than guessing among the full vocabulary (often 30,000+ tokens) but still leaving real uncertainty at each step.",
          "deepDive": {
            "q": "Why is perplexity comparison only valid between models sharing the same tokenizer/vocabulary?",
            "a": "Cross-entropy per token is computed relative to a specific tokenization scheme - a model with a coarser tokenizer (fewer, longer tokens covering more text per token) will naturally show higher per-token uncertainty (harder prediction task per step) even if it's equally or more capable overall, while a finer tokenizer artificially lowers per-token perplexity by making each individual prediction easier (more predictable sub-word continuations); comparing raw perplexity across models with different vocabularies conflates genuine capability differences with tokenization-scheme differences, which is why cross-tokenizer comparisons normalize to bits-per-byte or bits-per-character instead."
          }
        },
        {
          "q": "Explain what 'label smoothing' does to a classification loss in terms of cross-entropy and KL divergence, and why it might improve calibration.",
          "a": "Standard cross-entropy training uses a one-hot true distribution P (probability 1 on the correct class, 0 elsewhere) - minimizing H(P,Q) then pushes the model to drive Q(correct class) toward 1 and every other class toward exactly 0, which requires logits to diverge toward infinity to hit an unreachable target, encouraging overconfidence. Label smoothing replaces the one-hot P with a softened distribution - e.g., (1-epsilon) on the true class and epsilon/(K-1) spread over the other K-1 classes - so the target the model is asked to match is no longer a degenerate point mass; minimizing D_KL(P_smoothed || Q) now has a genuinely achievable zero (Q can actually equal P_smoothed with finite logits), which caps how extreme the logits need to become and empirically tends to produce better-calibrated, less overconfident predicted probabilities.",
          "deepDive": {
            "q": "How does label smoothing's effect connect to temperature scaling (24-01) as two different ways of addressing the same overconfidence problem?",
            "a": "They intervene at different points in the pipeline: label smoothing changes the TRAINING objective itself (the target distribution P the model is trained to match), producing a model whose logits are inherently less extreme from the start, while temperature scaling is a POST-HOC fix applied after training - it rescales an already-trained (possibly overconfident) model's logits by dividing by a fitted temperature T* before the softmax, without retraining anything; label smoothing tries to prevent overconfidence from arising during optimization, whereas temperature scaling corrects it after the fact, and the two are complementary rather than redundant - a label-smoothed model can still benefit from a (typically smaller) temperature-scaling correction on top."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Entropy H(P)",
        "back": "-sum_x P(x) log P(x) - expected surprise; the theoretical floor on average encoding length for outcomes from P."
      },
      {
        "type": "formula",
        "front": "Cross-entropy H(P,Q)",
        "back": "-sum_x P(x) log Q(x) - expected surprise of P-outcomes measured with Q's log-probabilities; always >= H(P)."
      },
      {
        "type": "formula",
        "front": "KL divergence decomposition",
        "back": "H(P,Q) = H(P) + D_KL(P||Q) - cross-entropy is entropy plus the extra cost of a wrong distribution."
      },
      {
        "type": "pitfall",
        "front": "KL divergence is asymmetric",
        "back": "D_KL(P||Q) != D_KL(Q||P) - direction changes mode-covering vs mode-seeking behavior in variational inference."
      },
      {
        "type": "intuition",
        "front": "Why cross-entropy is the classification loss",
        "back": "Minimizing H(P,Q) over model params Q = minimizing D_KL(P||Q), since H(P) is constant w.r.t. the model."
      },
      {
        "type": "definition",
        "front": "Mutual information I(X;Y)",
        "back": "How much uncertainty about X is removed by observing Y; zero iff independent - catches nonlinear dependence correlation misses."
      },
      {
        "type": "formula",
        "front": "Perplexity",
        "back": "2^(cross-entropy in bits) - 'effective vocabulary size' the model's uncertainty is comparable to guessing uniformly among."
      },
      {
        "type": "pitfall",
        "front": "Same loss != same calibration",
        "back": "Cross-entropy is a single aggregate number - two models can hit the same value via very different, unequally-calibrated error patterns."
      },
      {
        "type": "pitfall",
        "front": "log(0) in cross-entropy",
        "back": "A predicted probability of exactly 0 for the true class gives -infinity loss - clip probabilities or use a stable log-softmax formulation."
      }
    ],
    "refs": [
      {
        "title": "Cover & Thomas, Elements of Information Theory (Ch. 2)",
        "url": "https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X"
      },
      {
        "title": "Shannon, A Mathematical Theory of Communication (1948)",
        "url": "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf"
      },
      {
        "title": "PyTorch: torch.nn.functional.cross_entropy",
        "url": "https://pytorch.org/docs/stable/generated/torch.nn.functional.cross_entropy.html"
      },
      {
        "title": "Kraskov, Stogbauer, Grassberger - Estimating Mutual Information",
        "url": "https://arxiv.org/abs/cond-mat/0305641"
      }
    ],
    "demos": []
  },
  "calculus": {
    "level": "intro",
    "body": {
      "intuition": [
        "Every model in this curriculum learns the same way: compute how much a small nudge to each parameter would change the loss (the gradient), then step the parameters in the direction that decreases loss the fastest. That's it - that's gradient descent, and it's the engine behind every training loop from a two-parameter linear regression to a 70-billion-parameter language model. The gradient is nothing mysterious: it's just the vector of partial derivatives, each one answering 'if I nudge this one parameter and freeze everything else, how does the output change?'",
        "The chain rule is the reason backpropagation works at all: a deep network is a composition of many simple functions (linear layer, then activation, then linear layer, ...), and the chain rule says the derivative of a composition is the product of the derivatives of its pieces. Backprop (Module 04) is literally the chain rule applied systematically, layer by layer, computed efficiently in one backward pass instead of once per parameter.",
        "The optimization landscape ideas here - convexity, local vs global minima, saddle points, learning rate - explain *why* training sometimes struggles: a badly-chosen learning rate can overshoot or crawl, a saddle point can look locally like 'no direction improves things' even though far-away regions do better, and second-order curvature (how the gradient itself is changing) is what separates a well-conditioned optimization problem from an ill-conditioned one that zig-zags for thousands of steps."
      ],
      "math": [
        {
          "h": "Gradient descent as repeated first-order improvement",
          "paras": [
            "The gradient of a scalar loss with respect to a parameter vector points in the direction of steepest *increase*; stepping in the opposite direction, scaled by a learning rate, is guaranteed (for small enough steps, on a smooth-enough function) to decrease the loss - this simple update rule, applied millions of times, is the entirety of how neural networks learn."
          ],
          "tex": "\\theta_{t+1} = \\theta_t - \\eta \\nabla_\\theta \\mathcal{L}(\\theta_t) \\qquad \\nabla_\\theta \\mathcal{L} = \\left[\\frac{\\partial \\mathcal{L}}{\\partial \\theta_1}, \\dots, \\frac{\\partial \\mathcal{L}}{\\partial \\theta_n}\\right]^\\top",
          "texNote": "Each parameter moves opposite its own partial derivative, scaled by the learning rate eta - a small enough eta guarantees the loss doesn't increase on a smooth function."
        },
        {
          "h": "The chain rule: why backprop is possible",
          "paras": [
            "For a composed function L(f(g(x))), the derivative with respect to x is the product of each stage's local derivative - this is what lets a deep network's loss gradient with respect to an early layer's weights be computed by multiplying local Jacobians backward through the network, rather than re-deriving a new formula for every layer depth."
          ],
          "tex": "\\frac{d}{dx}\\, L(f(g(x))) = L'(f(g(x))) \\cdot f'(g(x)) \\cdot g'(x)",
          "texNote": "Each factor is a 'local' derivative of one stage evaluated at that stage's input - backprop computes these left-to-right in the forward pass, then multiplies right-to-left in the backward pass."
        }
      ],
      "code": [
        {
          "h": "Gradient descent on a 2-D loss surface, from scratch",
          "paras": [
            "Minimizing a simple quadratic bowl by hand, comparing a well-chosen learning rate to one that's too large - the exact failure mode that motivates learning-rate schedules and adaptive optimizers."
          ],
          "code": "import numpy as np\n\n# L(w) = 0.5 * (a*w1^2 + b*w2^2)  -- an ill-conditioned bowl if a >> b\na, b = 10.0, 1.0\ngrad = lambda w: np.array([a * w[0], b * w[1]])\nloss = lambda w: 0.5 * (a * w[0]**2 + b * w[1]**2)\n\ndef run_gd(lr, steps=30, w0=np.array([1.0, 1.0])):\n    w = w0.copy()\n    history = [loss(w)]\n    for _ in range(steps):\n        w = w - lr * grad(w)\n        history.append(loss(w))\n    return history\n\ngood = run_gd(lr=0.15)     # converges steadily\ntoo_big = run_gd(lr=0.25)  # 1/a = 0.1 is the stability boundary along the steep axis -> diverges\nprint(f\"good lr final loss: {good[-1]:.6f}\")\nprint(f\"too-big lr final loss: {too_big[-1]:.2e}\")  # blows up",
          "caption": "Along the steep axis (curvature a=10), the stable learning-rate ceiling is roughly 2/a - overshoot it and the loss diverges instead of converging, the textbook 'zig-zag then explode' failure mode."
        },
        {
          "h": "Autograd computes the chain rule for you",
          "paras": [
            "The same gradient computed by hand above, now via PyTorch's autograd - the mechanism every model in this curriculum relies on instead of hand-deriving derivatives."
          ],
          "code": "import torch\n\nw = torch.tensor([1.0, 1.0], requires_grad=True)\na, b = 10.0, 1.0\nloss = 0.5 * (a * w[0]**2 + b * w[1]**2)\n\nloss.backward()             # walks the computation graph backward via the chain rule\nprint(w.grad)                # tensor([10., 1.]) - matches grad(w) above exactly\n\n# verify against finite differences (the numerical ground truth)\neps = 1e-4\nw_np = w.detach().numpy()\nnumerical = np.array([\n    (loss_fn := lambda v: 0.5*(a*v[0]**2 + b*v[1]**2))(w_np + eps*np.array([1,0])) - loss_fn(w_np - eps*np.array([1,0])),\n    loss_fn(w_np + eps*np.array([0,1])) - loss_fn(w_np - eps*np.array([0,1])),\n]) / (2 * eps)\nprint(numerical)             # [10. 1.] - agrees with autograd to floating-point precision",
          "caption": "Autograd IS the chain rule, applied automatically to whatever computation graph .backward() walks - central finite differences confirm it's correct, not approximate."
        }
      ],
      "useCases": [
        "Every training loop in this curriculum - from Module 02's linear regression through Module 08's transformers - is gradient descent (or a variant) driven entirely by the chain rule computing gradients through composed functions.",
        "Learning rate schedules (warmup, cosine decay, seen in 22-02) exist precisely to navigate the stability-vs-speed tradeoff the ill-conditioned bowl example shows: too small wastes steps, too large diverges.",
        "Second-order curvature reasoning motivates adaptive optimizers (Adam, RMSprop) that effectively rescale each parameter's learning rate by its own local curvature, avoiding the single-global-learning-rate ill-conditioning problem.",
        "25-09's from-scratch backprop derivation is this lesson's chain rule applied explicitly through a full 2-layer network, matching autograd to machine precision."
      ],
      "pitfalls": [
        "Choosing a learning rate that's too large for the steepest direction in the loss landscape causes divergence, not just slow convergence - the failure mode isn't always subtle, it can blow up to NaN within a few steps.",
        "Confusing a local minimum with the global minimum - gradient descent only guarantees convergence to a point where the gradient is zero (a critical point), which could be a local minimum, a saddle point, or (rarely, for a maximization framed as minimization) a local maximum.",
        "Ill-conditioned loss surfaces (very different curvature along different directions, like the a=10,b=1 example) cause zig-zagging: a learning rate safe for the steep direction is far too small for the shallow one, wasting many steps.",
        "Vanishing/exploding gradients in deep networks are a direct consequence of the chain rule multiplying many factors together - if each layer's local derivative is consistently <1 or >1, the product shrinks or grows exponentially with depth (this is why residual connections and careful initialization exist, Module 04+).",
        "Forgetting to zero gradients between optimizer steps (optimizer.zero_grad() in PyTorch) causes gradients to accumulate across steps rather than reflect only the current batch - a common and confusing bug that looks like 'training is unstable' but is actually 'gradients are wrong'."
      ],
      "connections": [
        {
          "ref": "foundations/information-theory",
          "text": "Cross-entropy's gradient with respect to model logits (the softmax-minus-one-hot identity, derived exactly in 25-09) is the concrete derivative every classifier's training loop computes."
        },
        {
          "ref": "foundations/complexity",
          "text": "The next lesson asks how expensive one gradient-descent step actually is - the computational-complexity lens on the same training loop."
        },
        {
          "text": "Module 04's backpropagation lessons are this lesson's chain rule made systematic across an entire network, computed by autograd in one backward pass."
        },
        {
          "text": "22-02's optimizer lessons (SGD, Adam, gradient clipping, LR schedules) are all direct engineering responses to the ill-conditioning and stability issues introduced here."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State the gradient descent update rule.",
          "a": "theta_{t+1} = theta_t - eta * gradient(L(theta_t)) - step opposite the gradient, scaled by the learning rate."
        },
        {
          "q": "What does the gradient of a loss point toward?",
          "a": "The direction of steepest INCREASE - gradient descent steps in the opposite direction to decrease the loss."
        },
        {
          "q": "State the chain rule for a composition L(f(g(x))).",
          "a": "dL/dx = L'(f(g(x))) * f'(g(x)) * g'(x) - the product of each stage's local derivative."
        },
        {
          "q": "Why does backpropagation work?",
          "a": "It's the chain rule applied systematically through a network's layers, computing all parameter gradients in one backward pass instead of one derivation per parameter."
        },
        {
          "q": "What happens if the learning rate is too large?",
          "a": "The update can overshoot and diverge - loss increases or blows up instead of decreasing, especially along high-curvature directions."
        },
        {
          "q": "What's a saddle point?",
          "a": "A critical point (zero gradient) that's a local minimum along some directions and a local maximum along others - not a true minimum, but gradient descent can slow dramatically near one."
        },
        {
          "q": "What causes zig-zagging during gradient descent?",
          "a": "An ill-conditioned loss surface - very different curvature along different directions - forces a learning rate small enough for the steep direction, which is too small for the shallow one."
        },
        {
          "q": "What's the mechanism behind vanishing gradients in deep networks?",
          "a": "The chain rule multiplies many layers' local derivatives together - if each is consistently less than 1, the product shrinks exponentially with depth."
        },
        {
          "q": "What does optimizer.zero_grad() do, and why is forgetting it a bug?",
          "a": "Resets accumulated gradients to zero before the next backward pass - without it, gradients from multiple batches sum together instead of reflecting only the current batch."
        },
        {
          "q": "How do you numerically verify an analytic gradient?",
          "a": "Central finite differences: (f(x+eps) - f(x-eps)) / (2*eps), compared against the analytic/autograd gradient."
        },
        {
          "q": "What's the difference between a local and a global minimum for gradient descent's guarantee?",
          "a": "Gradient descent only guarantees reaching a critical point (zero gradient); it makes no guarantee that point is the global minimum on a non-convex loss surface."
        }
      ],
      "standard": [
        {
          "q": "Derive the stability condition for gradient descent on a 1-D quadratic loss L(w) = 0.5*a*w^2, and explain what it predicts about the ill-conditioned 2-D example in this lesson.",
          "a": "The gradient is grad(w) = a*w, so the update is w_{t+1} = w_t - eta*a*w_t = (1 - eta*a)*w_t. This is a linear recurrence: w_t = (1-eta*a)^t * w_0, which converges to 0 (the minimum) if and only if |1 - eta*a| < 1, i.e., 0 < eta < 2/a. For the 2-D bowl L(w) = 0.5*(a*w1^2 + b*w2^2) with a=10, b=1, each coordinate behaves independently with its own stability ceiling: eta < 2/10 = 0.2 for w1, and eta < 2/1 = 2.0 for w2. A single shared learning rate must satisfy the tighter constraint (eta < 0.2) to avoid diverging along w1, which is exactly why lr=0.25 in the code example blows up - it exceeds w1's stability ceiling even though it would be extremely conservative (and slow) for w2 alone.",
          "deepDive": {
            "q": "How does this generalize to explain why Adam-style per-parameter learning rates help on ill-conditioned problems?",
            "a": "Adam maintains a running estimate of each parameter's gradient magnitude (via the second moment) and divides that parameter's update by (roughly) its own typical gradient scale - effectively giving each coordinate its own adaptive learning rate close to its own stability-appropriate value, rather than being bottlenecked by whichever coordinate has the steepest curvature; this is why Adam often converges faster than plain SGD on the kind of ill-conditioned landscape the a=10,b=1 example represents, though it isn't a free lunch (it can generalize differently, and its adaptive scaling has its own failure modes)."
          }
        },
        {
          "q": "Walk through backpropagation for a 1-hidden-layer network L = CE(softmax(W2 * tanh(W1*x)), y) using only the chain rule, identifying each local derivative.",
          "a": "Define z1 = W1*x (pre-activation), a1 = tanh(z1) (hidden activation), z2 = W2*a1 (logits), p = softmax(z2), L = CE(p, y). Backprop computes, right to left: dL/dz2 = p - y (the softmax+cross-entropy combined gradient, derived exactly in 25-09) - this is the 'local derivative' of the loss+softmax stage. Then dL/dW2 = dL/dz2 * a1^T (chain rule: how z2 depends on W2, times how L depends on z2). Then dL/da1 = W2^T * dL/dz2 (how z2 depends on a1, propagated backward). Then dL/dz1 = dL/da1 * (1 - a1^2) (tanh's local derivative, elementwise). Finally dL/dW1 = dL/dz1 * x^T. Each step multiplies the accumulated upstream gradient by that layer's own local derivative - exactly the chain rule, applied once per layer, reusing the same upstream gradient value rather than recomputing anything from scratch.",
          "deepDive": {
            "q": "Why is this 'backward' order more efficient than computing dL/dW1 and dL/dW2 independently from first principles?",
            "a": "Computing gradients backward lets every layer reuse the single upstream gradient signal (dL/dz2, then dL/da1, then dL/dz1) computed by the layer after it - this is reverse-mode automatic differentiation, and its cost is proportional to one forward pass plus one backward pass regardless of how many parameters exist, whereas computing each parameter's gradient independently via, say, finite differences would cost one extra forward pass PER PARAMETER, making it computationally infeasible for networks with millions or billions of parameters."
          }
        },
        {
          "q": "A training run's loss suddenly jumps to NaN after training stably for many steps. List the calculus-level causes you'd investigate, in order of likelihood.",
          "a": "1) Exploding gradients: check gradient norms over recent steps - if they're growing before the NaN, the chain rule's repeated multiplication through many layers (or through a numerically unstable operation like an unclipped exponential in softmax/attention) has compounded past float range; fix with gradient clipping or a lower learning rate. 2) A learning rate that's locally too large for the current curvature - even a previously-stable LR can become unstable if training has moved into a sharper region of the loss surface; a warmup+decay schedule or an adaptive optimizer mitigates this. 3) A numerically unstable operation upstream - unclipped exp() in a custom softmax, division by a near-zero variance in a custom normalization, or log(0) from a probability that hit exactly zero (the information-theory lesson's pitfall) - these produce inf/NaN locally that then poisons every downstream gradient via the chain rule. 4) Data issue: an extreme outlier input producing an extreme loss value on one batch, which then produces an extreme gradient.",
          "deepDive": {
            "q": "Why does gradient clipping specifically address cause #1 without changing the direction of the update?",
            "a": "Gradient clipping by global norm rescales the entire gradient vector by a single scalar factor (min(1, max_norm/||g||)) when its norm exceeds a threshold - this preserves the gradient's *direction* (the relative proportions between parameters) while capping its *magnitude*, so the optimizer still moves toward decreasing loss, just with a bounded step size regardless of how extreme an individual batch's gradient happened to be; it directly targets the exponential-growth failure mode of exploding gradients without altering what direction 'improvement' points in."
          }
        },
        {
          "q": "Explain the difference between a convex and a non-convex loss surface, and why this distinction matters for what gradient descent can guarantee about neural network training.",
          "a": "A function is convex if the line segment between any two points on its graph lies on or above the graph - equivalently, its second derivative (curvature) is nonnegative everywhere in 1-D, or its Hessian is positive semi-definite in higher dimensions. For a convex loss, any local minimum is automatically the global minimum, so gradient descent converging to a critical point guarantees a globally optimal solution (this is why linear/logistic regression's loss surfaces, which are convex, have theoretical convergence guarantees). Neural network loss surfaces are generally non-convex - they can have many local minima, saddle points, and flat regions - so gradient descent converging to a critical point offers no guarantee it's the best possible solution; it might be a mediocre local minimum. In practice, deep learning works well anyway partly because empirical evidence suggests most local minima found by SGD on large, overparameterized networks tend to have similar loss values to each other (the 'flat local minima are common and good enough' observation), and because saddle points, not bad local minima, appear to be the more common obstacle in high dimensions.",
          "deepDive": {
            "q": "Why are saddle points argued to be more common than bad local minima in high-dimensional non-convex optimization?",
            "a": "At a critical point in d dimensions, whether it's a local min, local max, or saddle depends on the signs of the Hessian's d eigenvalues - a local minimum requires ALL d eigenvalues to be positive, a local max requires all negative, and anything else (a mix of signs) is a saddle; as d grows, the probability that a random critical point happens to have all-same-sign curvature in every one of d independent directions shrinks rapidly (roughly like 2^{-d} under simplifying independence assumptions), so in the very high dimensions of a neural network's parameter space, saddle points vastly outnumber true local minima among critical points - which is why 'is the gradient near zero because we're stuck at a bad local min or just slowly crossing a saddle' is a live practical question, and why momentum-based optimizers (which don't stop the instant the gradient is small) help escape saddle regions."
          }
        },
        {
          "q": "Design a finite-difference gradient checker for a custom loss function you've hand-derived the analytic gradient for. Walk through the implementation and explain why you'd use central differences rather than forward differences.",
          "a": "For each parameter w_i, perturb it by +eps and -eps (holding every other parameter fixed), evaluate the loss at both perturbed points, and estimate the partial derivative as (L(w + eps*e_i) - L(w - eps*e_i)) / (2*eps), where e_i is the i-th standard basis vector; compare this numerical estimate to the analytic gradient's i-th component, typically checking that their relative difference is below a small threshold (e.g., 1e-5) across all parameters. Central differences (using both +eps and -eps) are preferred over forward differences (only L(w+eps) vs L(w)) because central differences have error that scales as O(eps^2) (from a Taylor expansion, the odd-order error terms cancel by symmetry), while forward differences have error scaling as O(eps) - central differences are quadratically more accurate for the same eps, which matters because eps itself is a tradeoff: too large introduces truncation error (the linear approximation breaks down), too small introduces floating-point cancellation error from subtracting two very close numbers.",
          "deepDive": {
            "q": "Why does gradient checking become impractical for a full-scale neural network with millions of parameters, and what's used instead?",
            "a": "Checking every parameter requires two full forward passes per parameter (one for +eps, one for -eps), so the total cost is O(2 * num_params) forward passes - for a network with millions of parameters this is computationally infeasible to run regularly, versus one backward pass computing all gradients simultaneously via autograd; in practice, gradient checking is used sparingly - on a small subset of parameters, a tiny toy version of the architecture, or only when implementing a new custom autograd operation - rather than as a routine check during normal training, precisely because its cost doesn't scale the way backprop's does."
          }
        },
        {
          "q": "Explain what a second-order (Newton's method) optimization step does differently from gradient descent, and why it's rarely used directly to train large neural networks despite converging in fewer iterations.",
          "a": "Gradient descent uses only first-order information (the gradient) and takes a step of fixed direction magnitude eta in the steepest-descent direction. Newton's method additionally uses the Hessian (the matrix of second derivatives, capturing local curvature) to take a step that accounts for how the gradient itself is changing: theta_{t+1} = theta_t - H^{-1} grad(L(theta_t)) - this automatically rescales the step size per-direction according to local curvature (large step where the surface is flat, small step where it's steep), which is exactly the ill-conditioning problem this lesson's a=10,b=1 example suffers from, and it converges quadratically near a minimum versus gradient descent's linear convergence. It's rarely used directly on large networks because computing and inverting the Hessian costs O(n^2) memory and O(n^3) time for n parameters - for a network with even a few million parameters this is completely infeasible, versus gradient descent's O(n) cost per step.",
          "deepDive": {
            "q": "How do practical optimizers like Adam approximate second-order benefits without paying the full Hessian cost?",
            "a": "Adam maintains per-parameter running estimates of the first moment (mean of recent gradients, like momentum) and second moment (mean of recent squared gradients) and divides each parameter's update by the square root of its own second-moment estimate - this is a diagonal (per-parameter-only, ignoring cross-parameter curvature) and cheap-to-compute approximation to what a full Newton step would do, capturing the 'give each parameter its own effective learning rate based on how large its gradients typically are' benefit at O(n) cost instead of the full Hessian's O(n^2)-O(n^3), trading exactness (it ignores how parameters' curvatures interact with each other) for tractability at scale."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Gradient descent update",
        "back": "theta_{t+1} = theta_t - eta * grad(L(theta_t)) - step opposite the gradient, scaled by the learning rate."
      },
      {
        "type": "formula",
        "front": "Chain rule for L(f(g(x)))",
        "back": "dL/dx = L'(f(g(x))) * f'(g(x)) * g'(x) - product of each stage's local derivative."
      },
      {
        "type": "intuition",
        "front": "Why backprop is efficient",
        "back": "Reverse-mode chain rule reuses one upstream gradient per layer - cost is one backward pass total, not one pass per parameter (unlike finite differences)."
      },
      {
        "type": "formula",
        "front": "1-D GD stability ceiling",
        "back": "For L(w)=0.5*a*w^2, converges iff 0 < eta < 2/a - exceeding it diverges instead of just converging slowly."
      },
      {
        "type": "intuition",
        "front": "Ill-conditioning / zig-zagging",
        "back": "Very different curvature along different directions forces a shared LR small enough for the steepest direction - wastes steps on shallow ones."
      },
      {
        "type": "definition",
        "front": "Saddle point",
        "back": "A zero-gradient critical point that's a min along some directions, max along others - not a true minimum, but slows GD near it."
      },
      {
        "type": "pitfall",
        "front": "Vanishing/exploding gradients",
        "back": "Chain rule multiplies many layers' local derivatives - consistently <1 or >1 factors shrink/grow the product exponentially with depth."
      },
      {
        "type": "pitfall",
        "front": "Forgetting zero_grad()",
        "back": "Gradients accumulate across steps instead of reflecting only the current batch - looks like instability, is actually wrong gradients."
      },
      {
        "type": "definition",
        "front": "Convex vs non-convex loss",
        "back": "Convex: any local min is the global min (GD guarantee). Non-convex (typical for NNs): GD only guarantees a critical point, could be local min or saddle."
      }
    ],
    "refs": [
      {
        "title": "Boyd & Vandenberghe, Convex Optimization (free PDF)",
        "url": "https://web.stanford.edu/~boyd/cvxbook/"
      },
      {
        "title": "PyTorch: Autograd mechanics",
        "url": "https://pytorch.org/docs/stable/notes/autograd.html"
      },
      {
        "title": "Dauphin et al., Identifying and attacking the saddle point problem (NeurIPS 2014)",
        "url": "https://arxiv.org/abs/1406.2572"
      },
      {
        "title": "PyTorch: torch.nn.utils.clip_grad_norm_",
        "url": "https://pytorch.org/docs/stable/generated/torch.nn.utils.clip_grad_norm_.html"
      }
    ],
    "demos": []
  },
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
    "demos": []
  },
  "linear-algebra": {
    "interview": {
      "quickGrind": [
        {
          "q": "What does a matrix multiplication mean geometrically?",
          "a": "A linear map: it sends the basis vectors somewhere and everything else follows by linearity. The columns of A are the images of the basis vectors."
        },
        {
          "q": "What is rank, in one line?",
          "a": "The dimension of the column space — how many independent directions the map can actually produce. It bounds how much information can survive the transformation."
        },
        {
          "q": "Why do singular values matter more than eigenvalues in ML?",
          "a": "SVD exists for every matrix, including rectangular ones, while eigendecomposition needs square and (for a stable real one) symmetric. Data matrices are rarely square."
        },
        {
          "q": "What is the condition number and why should you care?",
          "a": "The ratio of largest to smallest singular value. It bounds how much relative input error is amplified — a large one means the solution is unstable and gradients are badly scaled."
        },
        {
          "q": "What does PCA actually compute?",
          "a": "The eigenvectors of the covariance matrix, equivalently the right singular vectors of the centred data matrix. Centring is not optional — without it you find the mean direction."
        },
        {
          "q": "Why is A^T A important?",
          "a": "It is symmetric positive semi-definite, its eigenvalues are the squared singular values of A, and it is what appears in the normal equations for least squares."
        },
        {
          "q": "Why avoid solving least squares by inverting A^T A?",
          "a": "Forming A^T A squares the condition number, so it destroys precision. Use a QR or SVD-based solver instead."
        },
        {
          "q": "What is a positive definite matrix and where does it show up?",
          "a": "Symmetric with all eigenvalues positive, so x^T A x > 0 for nonzero x. It is the Hessian of a strictly convex function and the requirement for a valid covariance."
        },
        {
          "q": "What does the determinant tell you?",
          "a": "The signed volume scaling of the map. Zero means the map collapses a dimension and is not invertible; it is numerically useless as a singularity test, though."
        },
        {
          "q": "Row-major vs column-major — why does it matter?",
          "a": "It determines which axis is contiguous in memory, so the same mathematical operation can be cache-friendly or not. It is why transposes can be surprisingly expensive."
        },
        {
          "q": "What is the point of an orthogonal matrix?",
          "a": "It preserves lengths and angles, so its condition number is 1 and it never amplifies error. That is why numerically stable algorithms are built from them."
        },
        {
          "q": "How does a low-rank factorization save you anything?",
          "a": "Replacing an m-by-n matrix by rank r costs r(m+n) instead of mn parameters. That is exactly the arithmetic behind LoRA and embedding factorization."
        }
      ],
      "standard": [
        {
          "q": "Explain the SVD and why it is the workhorse decomposition in ML.",
          "a": "Every real matrix A factors as U S V^T, where U and V are orthogonal and S is diagonal with non-negative entries in decreasing order. Read geometrically, any linear map is a rotation, then an axis-aligned scaling, then another rotation — there are no other behaviours. This matters practically for several reasons. The singular values quantify how much each direction is stretched, so their ratio is the condition number and their decay tells you the effective rank. Truncating to the top k gives provably the best rank-k approximation in both Frobenius and spectral norm, which is the Eckart-Young theorem and the justification for PCA, latent factor models and low-rank compression. It exists unconditionally, unlike eigendecomposition, so it applies to the rectangular data matrices we actually have. And it gives the pseudo-inverse, hence the minimum-norm least-squares solution, which is what makes it the numerically safe way to solve underdetermined systems.",
          "deepDive": {
            "q": "How does SVD relate to eigendecomposition exactly?",
            "a": "The right singular vectors V are eigenvectors of A^T A, the left singular vectors U are eigenvectors of A A^T, and the singular values are the square roots of the shared eigenvalues. This is also why you should not compute an SVD by forming A^T A: squaring the matrix squares the condition number and loses about half your significant digits."
          }
        },
        {
          "q": "What is the condition number and how does it show up in training?",
          "a": "For a matrix it is sigma_max over sigma_min, and it bounds the factor by which relative error in the input can be amplified in the output. In optimization the relevant object is the Hessian's condition number, which is the ratio of largest to smallest curvature. Gradient descent's convergence rate depends on it directly: a badly conditioned problem has a loss surface shaped like a narrow valley, so the step size is limited by the steepest direction while progress is dictated by the shallowest, and the number of iterations scales with the condition number. This is why input normalization is not cosmetic — features on wildly different scales produce a badly conditioned Hessian and therefore slow training. It is also what second-order and adaptive methods address: preconditioning is precisely the attempt to make the effective condition number closer to 1, and Adam's per-parameter scaling is a crude diagonal version of that.",
          "deepDive": {
            "q": "Why is batch normalization sometimes described as a conditioning fix?",
            "a": "By keeping activations at a controlled scale it prevents the layer-wise curvature disparities that make the Hessian badly conditioned, which lets larger learning rates be stable. That is a better-supported explanation of its benefit than the original internal-covariate-shift story, which later work challenged directly."
          }
        },
        {
          "q": "Why is a low-rank approximation such a recurring tool?",
          "a": "Because real data matrices are usually close to low rank while being formally full rank: the singular values decay quickly, so most of the Frobenius norm sits in a few directions and the rest is close to noise. Eckart-Young says truncating the SVD is optimal for a given rank, so the compression is not a heuristic. Three consequences recur across ML. Storage and compute drop from mn to r(m+n), which is what makes LoRA practical — adapting a weight matrix by a rank-r update instead of a full one. Truncation acts as a regularizer, since discarding small singular directions removes exactly the components most sensitive to noise, which is the connection between PCA and denoising. And a rank constraint is a modelling assumption: matrix factorization for recommenders asserts that user-item preference is explained by r latent factors, so the rank is a statement about the world rather than a computational trick."
        },
        {
          "q": "How do you actually solve least squares, and why not with the normal equations?",
          "a": "The normal equations A^T A x = A^T b are correct mathematically and a poor algorithm. Forming A^T A squares the condition number, so if A has condition number 10^6 — unremarkable for real design matrices — the normal-equations system has 10^12 and you lose roughly twice as many digits, potentially all of them in double precision. The standard approach is a QR factorization of A, solving R x = Q^T b, which works with A's own condition number. When A is rank-deficient or nearly so, use the SVD: it gives the pseudo-inverse and the minimum-norm solution, and it lets you truncate small singular values explicitly, which is regularization made visible. Ridge regression is the same idea from the other direction — adding lambda to the diagonal shifts every singular value away from zero, which is why it both stabilizes the solve and shrinks the coefficients."
        },
        {
          "q": "What breaks when a covariance matrix is not positive definite?",
          "a": "A covariance must be positive semi-definite by construction, so a non-PSD one means an estimation or numerical problem, and everything downstream assumes PSD. A Cholesky factorization fails outright, which is usually the first symptom, since Cholesky is the standard way to sample from a Gaussian or to evaluate its density. A negative eigenvalue implies a direction with negative variance, which is meaningless, and any Mahalanobis distance using it can come out negative. The usual causes are having fewer samples than dimensions, so the sample covariance is singular by construction, or floating-point error producing tiny negative eigenvalues in a matrix that is mathematically PSD. The standard remedies are shrinkage toward a diagonal target, adding a small ridge to the diagonal, or clipping negative eigenvalues to zero — all of which trade a little bias for a matrix you can actually use."
        },
        {
          "q": "Why do orthogonal matrices keep appearing in numerical algorithms?",
          "a": "Because they are perfectly conditioned. An orthogonal Q satisfies Q^T Q = I, preserves the 2-norm exactly, and therefore has condition number 1, so multiplying by it never amplifies error. That property makes them the safe building block: QR factorization solves least squares stably because Q contributes no error growth, Householder reflections and Givens rotations are the standard tools for introducing zeros without losing precision, and the U and V of an SVD are orthogonal for the same reason. The idea recurs in deep learning too — orthogonal initialization keeps the norm of a signal constant through a layer, which is exactly the r = 1 condition that prevents activations exploding or vanishing with depth, and orthogonality constraints on recurrent weights were an early answer to the vanishing-gradient problem."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Rank",
        "back": "Dimension of the column space — how many independent directions the map can produce. It bounds what information survives."
      },
      {
        "type": "formula",
        "front": "SVD",
        "back": "A = U S V^T with U, V orthogonal and S diagonal non-negative. Any linear map is rotate, scale, rotate."
      },
      {
        "type": "formula",
        "front": "Condition number",
        "back": "sigma_max / sigma_min. Bounds error amplification; for a Hessian it sets how slowly gradient descent converges."
      },
      {
        "type": "definition",
        "front": "Eckart-Young",
        "back": "Truncating the SVD to rank k is the optimal rank-k approximation in Frobenius and spectral norm — so PCA is not a heuristic."
      },
      {
        "type": "definition",
        "front": "Positive definite",
        "back": "Symmetric with all eigenvalues positive, so x^T A x > 0. Required of a covariance and of a strictly convex Hessian."
      },
      {
        "type": "intuition",
        "front": "Why SVD over eigendecomposition",
        "back": "SVD exists for every matrix including rectangular ones; eigendecomposition needs square. Data matrices are rarely square."
      },
      {
        "type": "intuition",
        "front": "Why low rank recurs",
        "back": "Singular values of real data decay fast, so r(m+n) parameters replace mn. It is LoRA, PCA and matrix factorization alike."
      },
      {
        "type": "intuition",
        "front": "Why orthogonal matrices are everywhere",
        "back": "Condition number exactly 1, so they never amplify error — the safe building block for stable algorithms."
      },
      {
        "type": "pitfall",
        "front": "Solving least squares via A^T A",
        "back": "Squares the condition number and loses about half your digits. Use QR, or SVD when rank-deficient."
      },
      {
        "type": "pitfall",
        "front": "PCA without centring",
        "back": "Uncentred data makes the first component point at the mean, so you recover location rather than variance structure."
      },
      {
        "type": "pitfall",
        "front": "det(A) as a singularity test",
        "back": "Numerically useless — it scales with dimension and magnitude. Use the smallest singular value or the condition number."
      },
      {
        "type": "pitfall",
        "front": "Non-PSD covariance",
        "back": "Cholesky fails and Mahalanobis distances can go negative. Cause is usually n < d or float error; fix with shrinkage or a ridge."
      }
    ],
    "refs": [
      {
        "title": "Strang — Linear Algebra and Learning from Data",
        "url": "https://math.mit.edu/~gs/learningfromdata/"
      },
      {
        "title": "Trefethen & Bau — Numerical Linear Algebra",
        "url": "https://people.maths.ox.ac.uk/trefethen/text.html"
      },
      {
        "title": "Eckart & Young (1936) — The Approximation of One Matrix by Another of Lower Rank",
        "url": "https://link.springer.com/article/10.1007/BF02288367"
      },
      {
        "title": "Hu et al. (2021) — LoRA: Low-Rank Adaptation of Large Language Models",
        "url": "https://arxiv.org/abs/2106.09685"
      },
      {
        "title": "Santurkar et al. (2018) — How Does Batch Normalization Help Optimization?",
        "url": "https://arxiv.org/abs/1805.11604"
      }
    ],
    "demos": []
  }
};
