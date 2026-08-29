// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/unsupervised-learning/kernel-density/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Unsupervised Learning",
    "lessons": {
      "dbscan": {
        "title": "DBSCAN"
      },
      "hierarchical-clustering": {
        "title": "Hierarchical Clustering"
      },
      "tsne": {
        "title": "t-SNE"
      },
      "spectral-clustering": {
        "title": "Spectral Clustering"
      },
      "kernel-density": {
        "title": "Kernel Density Estimation"
      }
    }
  },
  "moduleSlug": "unsupervised-learning",
  "conceptId": "kernel-density",
  "lesson": {
    "title": "Kernel Density Estimation",
    "oneLine": "Estimate a density by putting a bump on every point — where the bump's WIDTH matters about ten times more than its shape.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A histogram estimates a density but depends on where you put the bin edges, and it is discontinuous for no reason related to the data. Kernel density estimation removes both problems: centre a smooth kernel on every observation and add them up. The result is smooth, does not depend on an arbitrary origin, and integrates to one.",
          "The only real parameter is the bandwidth, which sets how wide each bump is. It is a bias-variance dial in the most literal form. Too narrow and the estimate is a spike at every observation — no bias, enormous variance, and it generalises to nothing. Too wide and everything blurs into a single mound — low variance, and a bias that erases the structure you were looking for.",
          "The kernel's shape, by contrast, barely matters. Measured on a bimodal density with 200 samples, comparing four kernels each at its own optimal bandwidth: integrated squared error of 0.01427 for Epanechnikov, 0.01443 triangular, 0.01494 Gaussian, 0.01542 uniform. An eight percent spread. Sweeping the bandwidth for a single kernel spanned 0.01494 to 0.14803 — a factor of ten. The bandwidth is the model; the kernel is a preference."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The estimator, and the asymptotically optimal bandwidth that shows why it is hard to choose:"
        ],
        "tex": "\\hat{f}_h(x) = \\frac{1}{nh}\\sum_{i=1}^{n} K\\!\\left(\\frac{x - x_i}{h}\\right), \\qquad h_{\\text{opt}} \\propto \\left(\\frac{R(K)}{n\\,\\sigma_K^4\\,R(f'')}\\right)^{1/5}",
        "texNote": "The optimal bandwidth depends on the second derivative of the true density — the thing being estimated. That circularity is why every practical rule either assumes a shape (Silverman) or estimates it by resampling (cross-validation). The n^(-1/5) rate is also slow, which is the seed of the problem in high dimensions."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nfrom sklearn.neighbors import KernelDensity\nfrom sklearn.model_selection import GridSearchCV\n\n# Do NOT trust a rule of thumb on data you have not looked at - cross-validate the\n# bandwidth against held-out log-likelihood, which makes no assumption about the shape.\ngrid = GridSearchCV(KernelDensity(kernel=\"gaussian\"),\n                    {\"bandwidth\": np.logspace(-2, 0.5, 60)}, cv=5)\ngrid.fit(X)\nkde = grid.best_estimator_\nlog_dens = kde.score_samples(X_query)     # note: LOG density, and it is not a probability\n\n# For strictly positive data (durations, prices) the kernel leaks mass below zero.\n# Fit in log space and correct by the Jacobian, or use a boundary-corrected kernel.\nkde_log = KernelDensity().fit(np.log(X)[:, None])\ndensity = np.exp(kde_log.score_samples(np.log(q)[:, None])) / q",
        "caption": "Boundary bias is the most common silent error. On duration or price data the estimate spreads mass onto impossible negative values and correspondingly under-estimates the density near zero, where the interesting behaviour usually is."
      },
      {
        "h": "Where the rules of thumb fail",
        "paras": [
          "Silverman's rule is derived assuming the underlying density is roughly normal. On the bimodal test density it prescribed a bandwidth of 0.474 when the error-optimal value was 0.180, giving an integrated squared error 3.3 times worse. The failure is systematic and in a predictable direction: the rule reads the wide overall spread of a bimodal sample as a wide single distribution and over-smooths, which merges the two modes — erasing the one feature anybody was looking for.",
          "So use it as a starting point and cross-validate. Held-out log-likelihood makes no assumption about the shape of the density and is cheap for one parameter.",
          "The deeper limitation is dimensional. The convergence rate degrades as the dimension rises, and the sample size needed for a fixed accuracy grows exponentially — in high dimensions almost all of the volume is far from every observation, so almost everywhere the estimate is built from the tails of distant kernels. Kernel density estimation is a good tool up to about three or four dimensions and misleading well before ten, which is why high-dimensional density estimation uses normalising flows or autoregressive models instead.",
          "Where it earns its place: one-dimensional diagnostics, where a KDE plot beats a histogram for judging modality and skew; anomaly detection in low dimensions, thresholding on estimated density; and as the smoothing step inside mean-shift clustering, which is gradient ascent on exactly this estimate."
        ]
      }
    ],
    "takeaways": [
      "Bandwidth dominates: sweeping it moved integrated squared error by a factor of ten, while four different kernels at their own best bandwidths differed by eight percent.",
      "Silverman's rule assumes near-normality and over-smoothed a bimodal density by 2.6x, merging the modes — cross-validate on held-out log-likelihood instead.",
      "Watch the boundary on positive-only data, and do not use it above three or four dimensions, where almost every query point sits in the tails of every kernel."
    ],
    "demo": "kernel-density"
  },
  "order": [
    "dbscan",
    "hierarchical-clustering",
    "tsne",
    "spectral-clustering",
    "kernel-density"
  ],
  "index": 4,
  "prev": "spectral-clustering",
  "next": null
};
