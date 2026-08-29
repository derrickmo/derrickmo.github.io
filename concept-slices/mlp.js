// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/mlp/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "mlp": {
    "id": "mlp",
    "name": "Multilayer Perceptron",
    "area": "Neural Networks",
    "summary": "Stack linear layers and nonlinearities — the universal approximator that backprop trains.",
    "prereqs": [
      "perceptron",
      "activations",
      "backprop"
    ],
    "leadsTo": [
      "cnn",
      "rnn",
      "transformer-block",
      "probing-classifier",
      "activation-patching",
      "batch-norm",
      "weight-init",
      "convolution",
      "diffusion",
      "lora",
      "neuroevolution",
      "gan",
      "gnn"
    ],
    "animation": "viz/feedforward.html"
  },
  "perceptron": {
    "id": "perceptron",
    "name": "The Perceptron",
    "area": "Neural Networks",
    "summary": "A single linear threshold unit, ŷ=sign(w·x+b), trained online by the first mistake-driven learning rule: do nothing when right, nudge w←w+η·y·x when wrong. The Perceptron Convergence Theorem guarantees a separating hyperplane in finite updates IF the data is linearly separable; on non-separable data it never halts (Minsky & Papert's XOR critique). The historical seed of neural nets — smooth the step activation and train by gradient descent to get the MLP; add a max margin to get the SVM.",
    "tex": "\\text{if } y(w\\cdot x + b) \\le 0:\\; w \\leftarrow w + \\eta\\, y\\, x",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": [
      "mlp",
      "svm",
      "activations"
    ]
  },
  "linear-regression": {
    "id": "linear-regression",
    "name": "Linear Regression",
    "area": "Classical ML",
    "summary": "Fit a line by minimizing squared error — convex, with a closed-form OLS solution. The simplest supervised model and the algebraic backbone of half of statistics.",
    "tex": "\\hat{w} = (X^\\top X)^{-1} X^\\top y",
    "leadsTo": [
      "logistic-regression",
      "pca",
      "bayesian-linear-regression",
      "bias-variance",
      "svm",
      "perceptron",
      "forecasting",
      "conformal-regression",
      "simpsons-paradox",
      "instrumental-variables"
    ],
    "prereqs": []
  },
  "activations": {
    "id": "activations",
    "name": "Activation Functions",
    "area": "Neural Networks",
    "summary": "The per-neuron nonlinearity that lets a stack of linear maps approximate any function.",
    "prereqs": [
      "perceptron"
    ],
    "tex": "\\mathrm{ReLU}(x) = \\max(0, x)",
    "leadsTo": [
      "sparse-autoencoder",
      "superposition",
      "batch-norm",
      "weight-init",
      "mlp"
    ]
  },
  "backprop": {
    "id": "backprop",
    "name": "Backpropagation",
    "area": "Neural Networks",
    "summary": "Apply the chain rule through a computational graph to get gradients for every parameter at once.",
    "prereqs": [
      "chain-rule",
      "gradient-descent"
    ],
    "leadsTo": [
      "activations",
      "mlp",
      "dqn",
      "pruning",
      "saliency",
      "mixed-precision"
    ]
  },
  "chain-rule": {
    "id": "chain-rule",
    "name": "Chain Rule",
    "area": "Optimization",
    "summary": "Compose derivatives through a graph — the calculus identity that makes backprop possible.",
    "tex": "\\frac{\\partial L}{\\partial x} = \\frac{\\partial L}{\\partial y}\\, \\frac{\\partial y}{\\partial x}",
    "leadsTo": [
      "gradient-descent",
      "backprop"
    ],
    "prereqs": []
  },
  "gradient-descent": {
    "id": "gradient-descent",
    "name": "Gradient Descent",
    "area": "Optimization",
    "summary": "Follow the negative loss gradient downhill — the engine of essentially all neural-network training.",
    "tex": "\\theta_{t+1} = \\theta_t - \\eta\\, \\nabla_\\theta \\mathcal{L}(\\theta_t)",
    "prereqs": [
      "chain-rule"
    ],
    "leadsTo": [
      "backprop",
      "lr-schedule",
      "adam",
      "newtons-method",
      "coordinate-descent",
      "proximal-gradient",
      "quasi-newton",
      "variational-inference",
      "adversarial-examples",
      "optimizers",
      "gradient-clipping",
      "policy-gradient"
    ],
    "animation": "viz/gradient.html"
  },
  "cnn": {
    "id": "cnn",
    "name": "Convolutional Neural Network",
    "area": "Computer Vision",
    "summary": "Stacks of convolutions and pooling that build a feature hierarchy from edges to objects.",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": []
  },
  "rnn": {
    "id": "rnn",
    "name": "Recurrent Neural Network",
    "area": "NLP",
    "summary": "A neural net with a hidden state that carries information across a sequence — the pre-transformer way to model order.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": [
      "attention",
      "gradient-clipping",
      "lstm-gates"
    ],
    "animation": "viz/recurrence.html"
  },
  "transformer-block": {
    "id": "transformer-block",
    "name": "Transformer Block",
    "area": "Transformers",
    "summary": "Attention + feed-forward + residual + layer-norm — the basic stacked unit of GPT/BERT/Llama.",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "animation": "viz/transformer.html",
    "leadsTo": [
      "mixture-of-depths"
    ]
  },
  "probing-classifier": {
    "id": "probing-classifier",
    "name": "Linear Probing",
    "area": "Trustworthy ML",
    "summary": "Test what a layer represents by fitting the simplest possible readout — a linear classifier — to its frozen activations. Accuracy rises with depth as the network reformats data into a linearly separable geometry. Shows decodability, not causal use.",
    "tex": "\\hat y = \\mathrm{softmax}(W\\,h^{(\\ell)} + b),\\ \\ h^{(\\ell)}\\ \\text{frozen}",
    "prereqs": [
      "mlp",
      "logistic-regression"
    ],
    "leadsTo": [
      "activation-patching"
    ]
  },
  "activation-patching": {
    "id": "activation-patching",
    "name": "Activation Patching (Causal Tracing)",
    "area": "Trustworthy ML",
    "summary": "Localize what a network uses by intervention: copy an activation from a clean run into a corrupted run and measure how much the output is restored. Unlike probing or saliency it makes a causal claim — the basis of circuit-level mechanistic interpretability (ROME, IOI, induction heads).",
    "tex": "\\Delta_c = \\frac{m(\\text{patch}_c) - m(\\text{corrupt})}{m(\\text{clean}) - m(\\text{corrupt})}",
    "prereqs": [
      "mlp",
      "probing-classifier"
    ],
    "leadsTo": []
  },
  "batch-norm": {
    "id": "batch-norm",
    "name": "Batch Normalization",
    "area": "Neural Networks",
    "summary": "Re-standardizes each feature across the mini-batch before the nonlinearity, then rescales/shifts with learnable γ, β. Keeps activation distributions stable across depth regardless of the weights above, which smooths the loss landscape and lets you train deeper nets at higher learning rates. Behaves differently at train (batch stats) vs inference (running averages) and degrades with small batches — motivating LayerNorm/RMSNorm in sequence models and large transformers.",
    "tex": "\\hat z = \\frac{z - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\quad y = \\gamma\\hat z + \\beta",
    "prereqs": [
      "activations",
      "mlp"
    ],
    "leadsTo": []
  },
  "weight-init": {
    "id": "weight-init",
    "name": "Weight Initialization",
    "area": "Neural Networks",
    "summary": "The variance weights are drawn from controls whether the forward signal (and backward gradient) stays at unit scale through depth or diverges exponentially. Xavier/Glorot uses Var(W)=1/fan_in (correct for linear/tanh); He/Kaiming uses 2/fan_in to compensate for ReLU zeroing half the variance. Wrong scale → exploding (saturation/NaN) or vanishing (dead) signal. The matching scheme keeps std≈1 across all layers, which is what makes deep nets trainable from scratch.",
    "tex": "\\mathrm{Var}(W) = \\frac{1}{\\text{fan\\_in}}\\ (\\text{Xavier}), \\quad \\frac{2}{\\text{fan\\_in}}\\ (\\text{He})",
    "prereqs": [
      "activations",
      "mlp"
    ],
    "leadsTo": []
  },
  "convolution": {
    "id": "convolution",
    "name": "Convolution (CNN)",
    "area": "Computer Vision",
    "summary": "Slide a small learned kernel across an image — weight sharing + translation invariance.",
    "prereqs": [
      "mlp"
    ],
    "animation": "viz/convolution.html",
    "leadsTo": [
      "morphological-operations",
      "template-matching",
      "cnn",
      "edge-detection",
      "hog",
      "data-augmentation"
    ]
  },
  "diffusion": {
    "id": "diffusion",
    "name": "Diffusion Models",
    "area": "Generative",
    "summary": "Add noise to data step by step, then learn to reverse it — the engine behind modern image/video generators.",
    "prereqs": [
      "mlp",
      "vae"
    ],
    "leadsTo": []
  },
  "lora": {
    "id": "lora",
    "name": "LoRA (Low-Rank Adaptation)",
    "area": "Fine-Tuning",
    "summary": "Freeze the base model and learn a thin rank-r product B·A per layer — adapt big models on a budget.",
    "prereqs": [
      "pca",
      "mlp",
      "attention"
    ],
    "leadsTo": [
      "quantization"
    ]
  },
  "neuroevolution": {
    "id": "neuroevolution",
    "name": "Neuroevolution",
    "area": "Reinforcement Learning",
    "summary": "Improve a neural-net policy by selection + crossover + mutation, no gradients required.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": []
  },
  "gan": {
    "id": "gan",
    "name": "Generative Adversarial Network",
    "area": "Generative",
    "summary": "Two networks duel — a generator fabricates samples, a discriminator scores them as real or fake. The game's equilibrium is a generator that matches the real distribution.",
    "tex": "\\min_G \\max_D \\; \\mathbb{E}_x[\\log D(x)] + \\mathbb{E}_z[\\log(1 - D(G(z)))]",
    "prereqs": [
      "mlp",
      "cross-entropy"
    ],
    "leadsTo": [
      "diffusion"
    ]
  },
  "gnn": {
    "id": "gnn",
    "name": "Graph Neural Network",
    "area": "Graphs",
    "summary": "Update each node's feature by aggregating from its neighbors. Stack a few layers and the network smooths cluster structure; stack too many and features over-smooth.",
    "tex": "h_v^{(\\ell+1)} = \\sigma\\!\\left(W \\cdot \\mathrm{mean}_{u \\in N(v) \\cup \\{v\\}} h_u^{(\\ell)}\\right)",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "mlp": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "demo",
      "slug": "batch-norm"
    },
    {
      "kind": "demo",
      "slug": "weight-init"
    },
    {
      "kind": "demo",
      "slug": "neural-playground"
    },
    {
      "kind": "demo",
      "slug": "gnn"
    },
    {
      "kind": "demo",
      "slug": "dqn"
    },
    {
      "kind": "game",
      "slug": "neuroevolution"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    }
  ]
};
