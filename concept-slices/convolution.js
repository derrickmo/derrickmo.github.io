// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/convolution/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "morphological-operations": {
    "id": "morphological-operations",
    "name": "Morphological Operations",
    "area": "Computer Vision",
    "summary": "Set-based reshaping of binary (or grayscale) images by probing with a structuring element. Erosion/dilation are min/max neighborhood filters; opening removes specks, closing fills holes, gradient extracts boundaries. The cleanup stage after thresholding/segmentation.",
    "tex": "(A \\ominus B),\\ (A \\oplus B),\\ A\\circ B = (A\\ominus B)\\oplus B",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": []
  },
  "template-matching": {
    "id": "template-matching",
    "name": "Template Matching (Cross-Correlation)",
    "area": "Computer Vision",
    "summary": "Find a known patch by sliding it over an image and scoring each position. SSD is brightness-sensitive; normalized cross-correlation (NCC) subtracts the mean and divides by the norm to match the pattern invariant to brightness/contrast. It IS convolution with the template as the kernel — but fails under scale/rotation.",
    "tex": "\\mathrm{NCC} = \\frac{\\sum (I-\\bar I)(T-\\bar T)}{\\sqrt{\\sum (I-\\bar I)^2 \\sum (T-\\bar T)^2}}",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": []
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
  "edge-detection": {
    "id": "edge-detection",
    "name": "Edge Detection (Canny)",
    "area": "Computer Vision",
    "summary": "Find where image brightness changes sharply. The Canny pipeline: Gaussian blur (denoise) -> Sobel gradient (magnitude + direction) -> non-maximum suppression (thin ridges to 1px along the gradient) -> double threshold (strong vs weak pixels) -> hysteresis (keep weak pixels connected to strong ones). The high-bar-to-start / low-bar-to-continue hysteresis rule links broken contours while rejecting isolated noise. Still a standard preprocessor before Hough line/circle detection and a building block of HOG/SIFT-style features.",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": [
      "hough-transform",
      "harris-corners",
      "optical-flow",
      "hog",
      "image-segmentation"
    ]
  },
  "hog": {
    "id": "hog",
    "name": "Histogram of Oriented Gradients",
    "area": "Computer Vision",
    "summary": "A hand-designed image descriptor that keeps where edges point and discards exact intensities. Compute gradient magnitude + orientation per pixel, split the image into small cells, and build a magnitude-weighted histogram of unsigned orientations (0-180, typically 9 bins) in each cell. Then block-normalize (L2 over overlapping cell blocks) so only the SHAPE of the orientation distribution survives — giving robustness to lighting and contrast. The concatenated cell histograms form a fixed-length feature vector. HOG + a linear SVM (Dalal-Triggs 2005) was the leading pedestrian/object detector before deep learning, and is the explicit ancestor of the oriented-edge filters a CNN learns in its first layers.",
    "prereqs": [
      "edge-detection",
      "convolution"
    ],
    "leadsTo": []
  },
  "data-augmentation": {
    "id": "data-augmentation",
    "name": "Data Augmentation",
    "area": "Data-Centric",
    "summary": "Synthesize new training examples by applying random transforms that change the input but not the label — horizontal flip, rotation, random-resized-crop, color/brightness jitter, and cutout/random-erasing for images. This enlarges and diversifies a finite dataset for free and bakes in known invariances, so the model learns features that survive the nuisances rather than memorizing exact pixels — one of the most reliable regularizers in deep learning. Each transform encodes a domain assumption (flipping a digit can change its label), so the augmentation set is task-specific. The idea generalizes to token masking/synonym swaps in NLP and time/frequency masking on audio, and the two-view scheme is the engine of contrastive self-supervised learning.",
    "prereqs": [
      "convolution",
      "regularization"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "convolution": [
    {
      "kind": "demo",
      "slug": "morphological-ops"
    },
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "convolution"
    },
    {
      "kind": "demo",
      "slug": "edge-detection"
    },
    {
      "kind": "demo",
      "slug": "image-augmentation"
    },
    {
      "kind": "module",
      "slug": "cnn"
    },
    {
      "kind": "hf",
      "slug": "vision"
    }
  ]
};
