// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "ransac" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "ransac": [
      "linear-regression",
      "hough-transform"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "hough-transform": {
    "id": "hough-transform",
    "name": "Hough Transform",
    "area": "Computer Vision",
    "summary": "Detect parametric shapes (lines, circles) by voting in parameter space. Each edge point votes for every shape that could pass through it — a line point traces a sinusoid in (rho, theta) space via rho = x*cos(theta) + y*sin(theta). Collinear points vote for the same cell, so a real line is a bright accumulator peak; reading peaks back out recovers the lines. Robust to noise and gaps because scattered points rarely conspire into a false peak. Generalizes to circles (a,b,r) and arbitrary shapes; the voting-for-consensus idea is shared with RANSAC.",
    "prereqs": [
      "edge-detection"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "linear-regression": [
    {
      "kind": "demo",
      "slug": "ista"
    },
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "perceptron"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "demo",
      "slug": "simpsons-paradox"
    },
    {
      "kind": "demo",
      "slug": "instrumental-variables"
    },
    {
      "kind": "demo",
      "slug": "ransac"
    }
  ],
  "hough-transform": [
    {
      "kind": "demo",
      "slug": "hough-transform"
    },
    {
      "kind": "demo",
      "slug": "ransac"
    }
  ]
};
