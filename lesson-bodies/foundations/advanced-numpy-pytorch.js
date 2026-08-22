// GENERATED from content/lessons/foundations/advanced-numpy-pytorch.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/advanced-numpy-pytorch/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
  }
};
