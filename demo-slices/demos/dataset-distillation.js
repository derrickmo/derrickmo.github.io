// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "dataset-distillation" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dataset-distillation": [
      "dataset-distillation",
      "coreset",
      "distillation"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "dataset-distillation": {
    "id": "dataset-distillation",
    "name": "Dataset Distillation",
    "area": "Data-Centric",
    "summary": "Synthesize a tiny set of training examples on which a model trained from scratch generalizes almost as well as on the full data. Unlike coresets (which select real points), the synthetic points are learned by differentiating the downstream loss back into the data — via a closed-form inner learner (KIP / kernel ridge), unrolled training, or gradient/trajectory matching. The learned points rarely look realistic; they're optimized to teach. Used for fast NAS, continual-learning replay, and privacy-preserving release.",
    "tex": "S^\\star = \\arg\\min_S \\; \\mathcal{L}_{\\text{real}}\\bigl(\\theta^\\star(S)\\bigr), \\quad \\theta^\\star(S) = \\arg\\min_\\theta \\mathcal{L}(\\theta; S)",
    "prereqs": [
      "coreset",
      "distillation"
    ],
    "leadsTo": []
  },
  "coreset": {
    "id": "coreset",
    "name": "Coresets",
    "area": "Data-Centric",
    "summary": "A small, weighted subset S of the data on which the objective (e.g. k-means cost) for ANY candidate solution approximates the full-data objective within (1±ε). Train on S to get nearly the full answer at a fraction of the cost. Importance/sensitivity sampling picks points proportional to how much they can influence the cost and reweights by 1/(m·q) to stay unbiased — far better than uniform at tiny sizes. Foundational to scalable ML and data selection/pruning.",
    "tex": "q_i = \\tfrac{1}{2N} + \\tfrac{1}{2}\\,\\frac{d(x_i,\\mu)^2}{\\sum_j d(x_j,\\mu)^2}, \\quad w_i = \\tfrac{1}{m\\,q_i}",
    "prereqs": [
      "kmeans",
      "active-learning"
    ],
    "leadsTo": [
      "dataset-distillation"
    ]
  },
  "distillation": {
    "id": "distillation",
    "name": "Knowledge Distillation",
    "area": "Fine-Tuning",
    "summary": "Train a small student to reproduce a large teacher's softened output distribution, not just its hard labels. The teacher's 'dark knowledge' — the relative probabilities of runner-up classes, exposed by a temperature on the softmax — is a richer training signal that lets the student generalize beyond its size. Powers DistilBERT, on-device LLMs, and training on a big model's generated data.",
    "tex": "L = (1-\\alpha)\\,\\mathrm{CE}(p, y) + \\alpha\\,T^2\\,\\mathrm{KL}\\!\\left( p^{(T)}_{\\text{teacher}} \\,\\|\\, p^{(T)}_{\\text{student}} \\right)",
    "prereqs": [
      "calibration",
      "quantization"
    ],
    "leadsTo": [
      "dataset-distillation"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "dataset-distillation": [
    {
      "kind": "demo",
      "slug": "dataset-distillation"
    }
  ],
  "coreset": [
    {
      "kind": "demo",
      "slug": "coreset"
    },
    {
      "kind": "demo",
      "slug": "dataset-distillation"
    }
  ],
  "distillation": [
    {
      "kind": "demo",
      "slug": "dataset-distillation"
    },
    {
      "kind": "demo",
      "slug": "distillation"
    }
  ]
};
