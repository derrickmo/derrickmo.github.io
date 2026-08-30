// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "grad-cam" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "grad-cam": [
      "saliency",
      "cnn",
      "shap"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "saliency": {
    "id": "saliency",
    "name": "Saliency Maps",
    "area": "Computer Vision",
    "summary": "Explain a prediction by the gradient of the output with respect to each input pixel: bright = the model is most sensitive there. One backward pass; the image-space, gradient-based branch of explainability (vs SHAP's game-theoretic attributions). Refined by Grad-CAM, Integrated Gradients, and SmoothGrad — but raw gradients are noisy and show sensitivity, not correctness.",
    "tex": "\\mathrm{saliency}_k = \\left| \\frac{\\partial\\, z}{\\partial\\, x_k} \\right|",
    "prereqs": [
      "backprop",
      "shap"
    ],
    "leadsTo": [
      "adversarial-examples"
    ]
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
  "shap": {
    "id": "shap",
    "name": "Feature Attribution (SHAP)",
    "area": "Trustworthy ML",
    "summary": "Explain a single prediction by crediting each feature its Shapley value — its average marginal contribution over all orderings of adding features in. The unique attribution satisfying efficiency, symmetry, and dummy; the contributions sum exactly to the gap between the base value and the prediction, and split interactions fairly.",
    "tex": "\\phi_i = \\sum_{S \\subseteq F \\setminus \\{i\\}} \\frac{|S|!\\,(k-|S|-1)!}{k!}\\,\\bigl( f(S \\cup \\{i\\}) - f(S) \\bigr)",
    "prereqs": [
      "logistic-regression"
    ],
    "leadsTo": [
      "saliency"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "saliency": [
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "cnn": [
    {
      "kind": "demo",
      "slug": "convolution"
    },
    {
      "kind": "demo",
      "slug": "nms"
    },
    {
      "kind": "demo",
      "slug": "receptive-field"
    },
    {
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "cnn"
    },
    {
      "kind": "hf",
      "slug": "vision"
    }
  ],
  "shap": [
    {
      "kind": "demo",
      "slug": "shap"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
