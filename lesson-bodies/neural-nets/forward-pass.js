// GENERATED from content/lessons/neural-nets/forward-pass.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/neural-nets/forward-pass/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "forward-pass": {
    "interview": {
      "quickGrind": [
        {
          "q": "Write the forward pass of one dense layer.",
          "a": "z = xW + b then a = f(z), with x of shape (B, d_in), W of shape (d_in, d_out) and b broadcast over the batch."
        },
        {
          "q": "Why does the nonlinearity matter?",
          "a": "Without it, any stack of linear layers collapses to a single linear map — depth would buy no expressiveness at all."
        },
        {
          "q": "Why is a batched matmul faster than looping over examples?",
          "a": "It becomes one GEMM, which is cache-efficient and saturates the hardware. Looping is memory-bound and leaves most of the machine idle."
        },
        {
          "q": "What is the role of the bias term?",
          "a": "It shifts the pre-activation so the decision boundary need not pass through the origin. It is redundant when the next op is a normalization layer with its own shift."
        },
        {
          "q": "Why does initialization scale matter in the forward pass?",
          "a": "Activation variance compounds multiplicatively with depth. Slightly too large and deep activations explode; slightly too small and they vanish, before a single gradient is computed."
        },
        {
          "q": "What does He initialization correct for?",
          "a": "ReLU zeroes about half the units, halving the variance, so the weight variance is set to 2/fan_in to compensate. Xavier assumes a symmetric activation and uses 1/fan_in."
        },
        {
          "q": "What is a dead ReLU?",
          "a": "A unit whose pre-activation is negative for every input, so it outputs zero and receives zero gradient forever. Usually caused by too large a learning rate or a bad bias."
        },
        {
          "q": "Why is broadcasting dangerous?",
          "a": "Shapes that should be incompatible silently align, so a (B,1) versus (1,B) mistake produces a (B,B) tensor and a plausible-looking loss instead of an error."
        },
        {
          "q": "Where does the forward pass store things for the backward pass?",
          "a": "Activations. Memory is roughly proportional to batch size times total activation width, which is why activation memory, not parameters, usually limits batch size."
        },
        {
          "q": "What is the effect of layer width versus depth on the forward pass?",
          "a": "Width costs quadratically in FLOPs per layer and parallelizes well; depth adds sequential dependency, so it costs latency that cannot be parallelized away."
        },
        {
          "q": "Why do we normalize inputs?",
          "a": "So features share a scale and no single feature dominates the pre-activations. Unnormalized inputs make the loss surface badly conditioned and effectively give each feature a different learning rate."
        },
        {
          "q": "What does it mean that the forward pass is a computational graph?",
          "a": "Each op records its inputs and how to compute its local derivative, so the same traversal that produced the output can be reversed to produce gradients."
        }
      ],
      "standard": [
        {
          "q": "Walk through the shapes and cost of a forward pass through an MLP.",
          "a": "Take input (B, d0) and layers of widths d1 to dL. Layer i computes (B, d_{i-1}) times (d_{i-1}, d_i), giving (B, d_i), plus a broadcast bias and an elementwise activation. That matmul costs about 2 * B * d_{i-1} * d_i FLOPs — the factor of two counting one multiply and one add — and it dominates, since the activation is O(B * d_i). Parameters are sum of d_{i-1} * d_i, independent of B, while activation memory is B times sum of d_i and therefore scales with the batch. Two consequences follow. First, doubling width roughly quadruples per-layer compute while doubling activation memory, so width is compute-bound and batch size is memory-bound. Second, all layers must be traversed in order, so depth adds latency you cannot parallelize away — which is exactly why inference latency scales with depth while throughput scales with width.",
          "deepDive": {
            "q": "Why is activation memory usually the binding constraint rather than parameters?",
            "a": "Parameters are stored once; activations are stored per example in the batch, for every layer, because the backward pass needs them. So memory grows with B times depth times width, and it is normal for activations to dwarf the parameters at moderate batch size. That is what gradient checkpointing trades against: recompute activations in the backward pass to cut memory at the cost of extra FLOPs."
          }
        },
        {
          "q": "Why does initialization scale determine whether a deep network trains at all?",
          "a": "Treat each layer as multiplying activation variance by a factor that depends on the weight variance and the activation function. If that factor is r, then after L layers the variance scales like r^L — an exponential in depth. With r slightly above 1, activations at layer 50 overflow; slightly below, they collapse to zero and every unit outputs the same thing, so the network cannot break symmetry. The fix is to choose the weight variance so r is approximately 1 for the activation in use: Xavier uses 1/fan_in for symmetric activations like tanh, and He uses 2/fan_in for ReLU because ReLU zeroes about half the pre-activations and halves the variance. This is a pure forward-pass argument, which is the striking part — the network can be broken before any gradient is ever computed. Normalization layers make the network far more robust to getting this wrong, which is one of the main practical reasons they are used.",
          "deepDive": {
            "q": "Does this argument still matter now that everything uses normalization?",
            "a": "Less for trainability, still for behaviour. Normalization rescales activations so the exponential blow-up is corrected each layer, but initialization still sets the effective scale of the residual branches, and in very deep residual stacks a scaled-down initialization of the branch (or a learned gate initialized near zero) is what keeps early training stable. So the concern migrated from every layer to the residual branches."
          }
        },
        {
          "q": "How do you debug a forward pass that produces NaN?",
          "a": "Localize before theorizing. Register a forward hook on every module that checks for non-finite outputs, run one batch, and take the FIRST layer that reports — a NaN propagates, so the last layer to show it is almost never the cause. Then check the usual generators in order: division by a quantity that can be zero (a normalization with zero variance, an empty mask), log or sqrt of a non-positive number, exp overflowing when logits are unbounded, and a loss that produces inf from a probability of exactly zero. Also check the inputs themselves, since a NaN in the data reproduces perfectly on the same batch and looks like a model bug. Distinguish deterministic from stochastic: if the same batch always NaNs, it is data or a boundary case; if it appears after N steps, it is usually divergence, so inspect whether activations or gradients were growing beforehand and reduce the learning rate."
        },
        {
          "q": "What actually happens numerically in a forward pass under mixed precision?",
          "a": "Weights and activations are cast to fp16 or bf16 so the matmuls run on tensor cores at much higher throughput and half the activation memory, while a master copy of the weights stays in fp32 for the update. The formats differ in the way that matters: fp16 has more mantissa but a narrow exponent range, so intermediate values can overflow to inf or underflow to zero, which is why fp16 needs loss scaling; bf16 keeps fp32's exponent range with fewer mantissa bits, so it rarely overflows and needs no loss scaling but is less precise per value. Reductions — sums, norms, softmax denominators — are the accuracy-critical parts and are typically accumulated in fp32 even when the inputs are half, because adding many small numbers in low precision loses them entirely. The practical rule is that matmuls tolerate low precision and reductions do not."
        },
        {
          "q": "Why is a batched forward pass so much faster than a loop, in hardware terms?",
          "a": "A single example's forward pass is a matrix-vector product, which reads the entire weight matrix to do O(d^2) work with O(d^2) memory traffic — arithmetic intensity of about one, so it is memory-bandwidth-bound and the arithmetic units idle. Batching turns it into a matrix-matrix product: the same weight matrix is read once and reused across all B examples, so work rises to O(B * d^2) while traffic stays near O(d^2), and arithmetic intensity rises with B until the machine becomes compute-bound. That is why throughput improves dramatically with batch size while per-example latency does not, and it is the same reason generation with a KV cache is slow: producing one token at a time is exactly the memory-bound matrix-vector regime, which is what batching requests together at serving time is meant to fix."
        },
        {
          "q": "How do you verify a hand-written forward pass is correct?",
          "a": "Check it against properties rather than against intuition. Compare layer by layer with a reference implementation on the same input and weights, using an explicit tolerance, since a full-network comparison only tells you that something differs. Verify shapes symbolically with a non-square batch and non-square widths, because square shapes hide transpose errors. Test invariances the layer should have: a permutation of the batch should permute the outputs identically and nothing else, and padding an input should not change the result for real positions. Feed a zero input and confirm the output equals the bias path. Finally, gradient-check the composition with finite differences on a small random case — if the forward pass is wrong, the analytic and numerical gradients will disagree, which catches errors that shape checks cannot."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Dense layer forward",
        "back": "z = xW + b, a = f(z), with x (B, d_in), W (d_in, d_out), b broadcast over the batch."
      },
      {
        "type": "formula",
        "front": "Matmul FLOPs",
        "back": "About 2 * B * d_in * d_out per layer — one multiply plus one add. It dominates the elementwise activation cost."
      },
      {
        "type": "formula",
        "front": "He vs Xavier init",
        "back": "He: Var(W) = 2/fan_in for ReLU (it zeroes half the units). Xavier: 1/fan_in for symmetric activations."
      },
      {
        "type": "definition",
        "front": "Arithmetic intensity",
        "back": "FLOPs per byte moved. Matrix-vector is about 1 (memory-bound); matrix-matrix rises with batch size until compute-bound."
      },
      {
        "type": "definition",
        "front": "Dead ReLU",
        "back": "A unit negative for every input: outputs zero, receives zero gradient, never recovers. Usually too high a learning rate."
      },
      {
        "type": "intuition",
        "front": "Why depth needs nonlinearity",
        "back": "Stacked linear maps compose to one linear map. Without a nonlinearity, depth adds parameters and no expressiveness."
      },
      {
        "type": "intuition",
        "front": "Variance compounds as r^L",
        "back": "Each layer multiplies activation variance by r, so depth makes it exponential — a network can be broken before any gradient exists."
      },
      {
        "type": "intuition",
        "front": "Width vs depth cost",
        "back": "Width is quadratic FLOPs but parallelizes; depth is sequential, so it costs latency you cannot parallelize away."
      },
      {
        "type": "pitfall",
        "front": "Silent broadcasting",
        "back": "(B,1) against (1,B) yields (B,B) and a plausible loss instead of an error. Assert shapes rather than trusting them."
      },
      {
        "type": "pitfall",
        "front": "Activation memory, not parameters",
        "back": "Activations are stored per example per layer for the backward pass, so they usually bind batch size. Checkpointing trades FLOPs for this."
      },
      {
        "type": "pitfall",
        "front": "Chasing the last NaN",
        "back": "NaN propagates, so the layer that reports it is rarely the cause. Hook every module and take the FIRST one."
      },
      {
        "type": "pitfall",
        "front": "Low-precision reductions",
        "back": "Matmuls tolerate fp16/bf16; sums, norms and softmax denominators need fp32 accumulation or small terms vanish."
      }
    ],
    "refs": [
      {
        "title": "He et al. (2015) — Delving Deep into Rectifiers (He initialization)",
        "url": "https://arxiv.org/abs/1502.01852"
      },
      {
        "title": "Glorot & Bengio (2010) — Understanding the Difficulty of Training Deep Feedforward Networks",
        "url": "https://proceedings.mlr.press/v9/glorot10a.html"
      },
      {
        "title": "Micikevicius et al. (2018) — Mixed Precision Training",
        "url": "https://arxiv.org/abs/1710.03740"
      },
      {
        "title": "Chen et al. (2016) — Training Deep Nets with Sublinear Memory Cost (gradient checkpointing)",
        "url": "https://arxiv.org/abs/1604.06174"
      },
      {
        "title": "Williams, Waterman & Patterson (2009) — Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
