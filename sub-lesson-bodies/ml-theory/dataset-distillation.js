// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/dataset-distillation/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Machine Learning Theory",
    "lessons": {
      "regularization": {
        "title": "Regularization"
      },
      "double-descent": {
        "title": "Double Descent"
      },
      "overfitting": {
        "title": "Overfitting & Generalization"
      },
      "newtons-method": {
        "title": "Newton's Method & Second-Order Optimization"
      },
      "active-learning": {
        "title": "Active Learning"
      },
      "coordinate-descent": {
        "title": "Coordinate Descent"
      },
      "proximal-gradient": {
        "title": "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)"
      },
      "quasi-newton": {
        "title": "Quasi-Newton Methods (BFGS / L-BFGS)"
      },
      "coreset": {
        "title": "Coresets"
      },
      "dataset-distillation": {
        "title": "Dataset Distillation"
      }
    }
  },
  "moduleSlug": "ml-theory",
  "conceptId": "dataset-distillation",
  "lesson": {
    "title": "Dataset Distillation",
    "oneLine": "Synthesise a handful of examples that train a model as well as the whole dataset — for a linear model you can construct them in closed form and prove it.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A coreset selects real examples. Dataset distillation gives up that constraint and SYNTHESISES new ones, optimising the pixels themselves so that a model trained on the synthetic set behaves like a model trained on everything. The synthetic examples need not look like data — distilled MNIST images look like overlapping ghosts of several digits, which is the point: one synthetic example can carry information that was spread across thousands of real ones.",
          "The results are striking at small scale. Ten synthetic images, one per class, can train a network to a substantial fraction of full-dataset accuracy on MNIST and CIFAR-10, against dramatically worse performance from ten real images.",
          "The optimisation is bilevel and that is what makes it hard: the inner problem trains a model on the synthetic data, the outer problem adjusts the synthetic data to improve the trained model's performance on real data, and the outer gradient has to flow back through the inner training run."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The bilevel objective, and the gradient-matching surrogate that made it practical:"
        ],
        "tex": "\\min_{\\mathcal{S}}\\ \\mathcal{L}_{\\mathcal{T}}\\bigl(\\theta^*(\\mathcal{S})\\bigr) \\ \\ \\text{s.t.}\\ \\ \\theta^*(\\mathcal{S}) = \\arg\\min_\\theta \\mathcal{L}_{\\mathcal{S}}(\\theta), \\qquad \\min_{\\mathcal{S}} \\sum_t \\mathcal{D}\\Bigl(\\nabla_\\theta \\mathcal{L}_{\\mathcal{S}}(\\theta_t),\\ \\nabla_\\theta \\mathcal{L}_{\\mathcal{T}}(\\theta_t)\\Bigr)",
        "texNote": "Differentiating through the inner argmin means unrolling the training loop and backpropagating through every step — memory-prohibitive beyond a few steps. Gradient matching sidesteps it: ask only that the synthetic data produce the same GRADIENTS as the real data at each point along the trajectory, which needs no unrolling."
      },
      {
        "h": "In code",
        "code": "import torch\n\ndef distill_step(syn_x, syn_y, real_loader, net_fn, opt_syn, device):\n    net = net_fn().to(device)                 # fresh random init every outer step:\n                                              # the synthetic set must work for ANY init,\n                                              # not one it has overfitted to\n    real_x, real_y = next(iter(real_loader))\n    g_real = torch.autograd.grad(loss(net(real_x), real_y), net.parameters())\n    g_syn = torch.autograd.grad(loss(net(syn_x), syn_y), net.parameters(),\n                                create_graph=True)   # keep the graph: syn_x needs grad\n\n    # cosine distance per layer, summed - scale-invariant, which matters because\n    # gradient magnitudes vary enormously across layers\n    match = sum(1 - torch.nn.functional.cosine_similarity(a.flatten(), b.flatten(), dim=0)\n                for a, b in zip(g_syn, g_real))\n    opt_syn.zero_grad(); match.backward(); opt_syn.step()\n    return match.item()",
        "caption": "Re-initialising the network each outer step is essential. Optimise against a single fixed initialisation and the synthetic set becomes a key that only fits that one lock."
      },
      {
        "h": "The linear case, where it is provable",
        "paras": [
          "For ridge regression the whole thing has a closed form, so the claim can be settled rather than optimised. Choose the synthetic inputs to be a scaled identity basis — d points, the i-th having a single non-zero coordinate c in position i. Then the synthetic Gram matrix is c-squared times the identity, and the ridge solution is simply the synthetic targets scaled. Invert that and you have targets that produce any weight vector you want.",
          "Verified: 8 synthetic points constructed this way reproduced the model trained on 4,000 real points to a maximum weight difference of 2.22e-16 — machine epsilon — with test MSE identical to five decimals at 0.09198. Not an approximation; the same model.",
          "The same argument says exactly where it stops. The ridge solution always lies in the span of the training rows, so m synthetic points can only reach an m-dimensional subspace of weight space. With m below the dimension d you provably cannot match a general target, and the best possible is the projection. Measured against random real subsets of the same size, the distilled set still wins by a wide margin — test MSE 1.53 against 5.21 at two points, and 0.24 against 1.57 at six — and becomes exact at m equal to d.",
          "Carrying that intuition to deep networks is where the caveats live. Distilled sets are architecture-sensitive: a set distilled against one network family transfers poorly to another, because it was optimised against that family's gradients. Scaling is the bigger issue — results are strong on small images and degrade on larger datasets, and the distillation itself costs far more compute than ordinary training, so this is a technique for when the SET must be small (continual learning, privacy-constrained sharing, rapid architecture search) rather than a way to train more cheaply."
        ]
      }
    ],
    "takeaways": [
      "Synthesise examples rather than select them; the synthetic points need not resemble data, which is what lets one carry information spread across thousands of real ones.",
      "For ridge it is exact and constructible: 8 synthetic points reproduced a 4,000-point model to 2.22e-16, and with fewer than d points it provably cannot, since the solution lies in the span of the synthetic rows.",
      "Gradient matching avoids unrolling the inner loop, re-initialising each outer step is essential, and distilled sets are architecture-specific and expensive to produce."
    ],
    "demo": "dataset-distillation"
  },
  "order": [
    "regularization",
    "double-descent",
    "overfitting",
    "newtons-method",
    "active-learning",
    "coordinate-descent",
    "proximal-gradient",
    "quasi-newton",
    "coreset",
    "dataset-distillation"
  ],
  "index": 9,
  "prev": "coreset",
  "next": null
};
