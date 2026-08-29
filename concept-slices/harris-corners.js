// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/harris-corners/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "harris-corners": {
    "id": "harris-corners",
    "name": "Harris Corner Detector",
    "area": "Computer Vision",
    "summary": "Find corner keypoints — points where image intensity changes in two directions at once. Build the structure tensor M by summing gradient products (Ix^2, Iy^2, IxIy) over a Gaussian window; its two eigenvalues describe how intensity varies in the two principal directions. Flat = both small, edge = one large, corner = both large. The response R = det(M) - k*trace(M)^2 detects the both-large case cheaply (positive at corners, negative at edges), then threshold + non-max suppression localize them. Foundation of feature tracking, image matching, panorama stitching, camera calibration, and SLAM.",
    "prereqs": [
      "edge-detection",
      "pca"
    ],
    "leadsTo": [
      "optical-flow"
    ]
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
  "pca": {
    "id": "pca",
    "name": "PCA / SVD",
    "area": "Classical ML",
    "summary": "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    "leadsTo": [
      "embeddings",
      "lora",
      "tsne",
      "ica",
      "manifold-learning",
      "harris-corners",
      "spectral-clustering"
    ],
    "prereqs": []
  },
  "optical-flow": {
    "id": "optical-flow",
    "name": "Optical Flow (Lucas-Kanade)",
    "area": "Computer Vision",
    "summary": "Estimate the per-pixel motion field between two frames. Assume brightness constancy — a moving point keeps its intensity — and linearize to the optical-flow constraint Ix*u + Iy*v + It = 0: one equation, two unknowns, so a single pixel is ambiguous (the aperture problem, where you only recover motion normal to an edge). Lucas-Kanade assumes a small window shares one motion, stacks the constraints, and solves the 2x2 least-squares system (the same structure-tensor matrix as Harris, now with a temporal term). Only valid for small motion because brightness is linearized; coarse-to-fine image pyramids extend the range. Powers video stabilization, frame interpolation, visual odometry/SLAM, and action recognition.",
    "prereqs": [
      "harris-corners",
      "edge-detection"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "harris-corners": [
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "harris-corners"
    },
    {
      "kind": "demo",
      "slug": "optical-flow"
    }
  ]
};
