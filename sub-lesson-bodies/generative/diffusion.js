// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/generative/diffusion/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Generative Models",
    "lessons": {
      "diffusion": {
        "title": "Diffusion Models"
      },
      "variational-inference": {
        "title": "Variational Inference & the ELBO"
      }
    }
  },
  "moduleSlug": "generative",
  "conceptId": "diffusion",
  "lesson": {
    "title": "Diffusion Models",
    "oneLine": "Add noise to data, then train a network to reverse it step by step.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A diffusion model learns to denoise. The forward process gradually corrupts data into pure noise; the model learns the reverse, removing a little noise at each step. To generate, start from random noise and run the learned denoiser repeatedly until a clean sample emerges. It is the engine behind modern image generators."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The network predicts the noise added at each step, trained by a simple regression:"
        ],
        "tex": "\\mathcal{L} = \\mathbb{E}_{t,\\epsilon}\\big[\\,\\|\\epsilon - \\epsilon_\\theta(x_t, t)\\|^2\\,\\big]",
        "texNote": "Sampling reverses the chain: subtract the predicted noise, repeat over many steps."
      },
      {
        "h": "In code",
        "code": "# training step: predict the noise you added\nt = np.random.randint(T)\nnoise = np.random.randn(*x.shape)\nx_t = sqrt_acp[t]*x + sqrt_1macp[t]*noise\nloss = ((noise - model(x_t, t))**2).mean()",
        "caption": "Learn to predict the noise; sampling denoises from scratch."
      },
      {
        "h": "Quality is bought one network evaluation at a time",
        "paras": [
          "Sampling from a diffusion model is an iterative solve, so quality is a function of step count and every step is a full forward pass. Running a deterministic DDIM sampler against a Gaussian mixture with the score computed exactly — so that discretisation is the only error present — the Kolmogorov-Smirnov distance from the true distribution is 0.4999 at one step, 0.1041 at five, 0.0227 at twenty-five, 0.0071 at one hundred and 0.0024 at a thousand.",
          "The returns diminish sharply: going from 25 steps to 1,000 is forty times the compute for about ten times the accuracy, and the sampled standard deviation is already 2.004 against a true 2.062 by step 25. The structural point is that this cost is paid per sample at inference, unlike a GAN's single forward pass, which is why so much work targets the step count itself rather than the model — DDIM's subsequence sampling, higher-order solvers, progressive distillation and consistency models all buy back the same axis."
        ]
      }
    ],
    "takeaways": [
      "Diffusion learns to reverse a gradual noising process.",
      "The objective is simple noise-prediction regression.",
      "Generation iteratively denoises from pure noise."
    ],
    "demo": "diffusion"
  },
  "order": [
    "diffusion",
    "variational-inference"
  ],
  "index": 0,
  "prev": null,
  "next": "variational-inference"
};
