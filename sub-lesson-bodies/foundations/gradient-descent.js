// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/gradient-descent/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Mathematical and Programming Foundations",
    "lessons": {
      "chain-rule": {
        "title": "The Chain Rule"
      },
      "gradient-descent": {
        "title": "Gradient Descent"
      },
      "softmax": {
        "title": "Softmax"
      },
      "cross-entropy": {
        "title": "Cross-Entropy Loss"
      },
      "bayes": {
        "title": "Bayes' Rule"
      },
      "entropy": {
        "title": "Entropy and Information"
      },
      "clt": {
        "title": "The Central Limit Theorem"
      },
      "fourier": {
        "title": "Fourier Series"
      },
      "mutual-information": {
        "title": "Mutual Information"
      },
      "importance-sampling": {
        "title": "Importance Sampling"
      },
      "reservoir-sampling": {
        "title": "Reservoir Sampling"
      },
      "huffman-coding": {
        "title": "Huffman Coding"
      },
      "aliasing": {
        "title": "Aliasing & the Nyquist Limit"
      },
      "channel-capacity": {
        "title": "Channel Capacity"
      }
    }
  },
  "moduleSlug": "foundations",
  "conceptId": "gradient-descent",
  "lesson": {
    "title": "Gradient Descent",
    "oneLine": "Follow the negative gradient downhill to minimize a loss.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Most models are trained by minimizing a loss function you cannot solve in closed form. Gradient descent is the universal fallback: stand on the loss surface, look at the slope, and take a small step in the steepest downhill direction. Repeat until you stop improving."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Each step moves the parameters against the gradient, scaled by a learning rate eta:"
        ],
        "tex": "\\theta_{t+1} = \\theta_t - \\eta\\,\\nabla_\\theta\\,\\mathcal{L}(\\theta_t)",
        "texNote": "Too large an eta overshoots; too small crawls. The learning-rate schedule manages this."
      },
      {
        "h": "In code",
        "code": "def gradient_descent(grad, theta, eta=0.1, steps=100):\n    for _ in range(steps):\n        theta = theta - eta * grad(theta)\n    return theta",
        "caption": "The same three lines train a line fit or a billion-parameter model."
      },
      {
        "h": "The condition number sets the price",
        "paras": [
          "The convergence rate is set by the shape of the surface, not by the learning rate. On a quadratic with eigenvalues 1 and kappa, using the optimal fixed step of 2/(1+kappa), reaching a gradient norm of 1e-6 takes 70 iterations at kappa = 10, 708 at kappa = 100 and 7,081 at kappa = 1,000 — linear in the condition number. Ten times the anisotropy costs ten times the steps.",
          "No choice of step size escapes it, because the step that stays stable along the steep direction is far too small for the shallow one; that single scalar has to serve both. This is why so much of practical optimisation is really preconditioning. Feature scaling, normalisation layers, and the per-parameter step sizes in Adam and its relatives all earn their keep by shrinking kappa rather than by making the descent itself cleverer."
        ]
      }
    ],
    "takeaways": [
      "Gradient descent turns 'minimize this loss' into a simple iterative rule.",
      "The learning rate is the single most important knob.",
      "Adam and friends are gradient descent with adaptive per-parameter steps."
    ],
    "demo": "gradient-descent"
  },
  "order": [
    "chain-rule",
    "gradient-descent",
    "softmax",
    "cross-entropy",
    "bayes",
    "entropy",
    "clt",
    "fourier",
    "mutual-information",
    "importance-sampling",
    "reservoir-sampling",
    "huffman-coding",
    "aliasing",
    "channel-capacity"
  ],
  "index": 1,
  "prev": "chain-rule",
  "next": "softmax"
};
