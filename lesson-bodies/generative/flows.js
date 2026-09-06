// GENERATED from content/lessons/generative/flows.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/generative/flows/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "flows": {
    "interview": {
      "quickGrind": [
        {
          "q": "What is a normalizing flow?",
          "a": "An invertible map between a simple base distribution and the data, so densities transfer exactly via the change of variables. Sampling and exact likelihood both come from the same network."
        },
        {
          "q": "State the change of variables formula.",
          "a": "log p_X(x) = log p_Z(f(x)) + log |det J_f(x)|. The Jacobian determinant accounts for how the map stretches or compresses volume."
        },
        {
          "q": "Why is the Jacobian the whole difficulty?",
          "a": "A general d x d determinant costs O(d^3) per sample, which is hopeless for images. Every flow architecture is a way of making that determinant cheap."
        },
        {
          "q": "How does affine coupling solve it?",
          "a": "Split the input; pass one half through unchanged; scale and shift the other half using a network applied to the first. The Jacobian is triangular, so its determinant is the product of the scale terms."
        },
        {
          "q": "Why alternate the mask between layers?",
          "a": "Because the identity half is untouched by that layer. Without alternating, half the dimensions would never be transformed at all."
        },
        {
          "q": "How expressive is a single coupling layer?",
          "a": "Barely — it is an elementwise affine map conditioned on the other half. Expressiveness comes from stacking many of them with different masks."
        },
        {
          "q": "What do flows give that VAEs and GANs do not?",
          "a": "Exact likelihood. Not a bound, not an implicit model — an evaluable density, which is what makes them useful for anomaly detection, compression and importance sampling."
        },
        {
          "q": "What is the main structural cost?",
          "a": "The latent must have the same dimension as the data, since the map is a bijection. No bottleneck, so no compression, and parameter counts are large for the quality achieved."
        },
        {
          "q": "What is a 1x1 invertible convolution?",
          "a": "Glow's learned generalization of the channel permutation between coupling layers. Its determinant is cheap because it acts per-pixel on channels only."
        },
        {
          "q": "What are autoregressive flows?",
          "a": "MAF and IAF, where each dimension is transformed conditional on previous ones. Triangular Jacobian again, but one direction is fast and the other is sequential — MAF is fast to evaluate, IAF fast to sample."
        },
        {
          "q": "What is continuous normalizing flow?",
          "a": "Define the transform as an ODE and the log-density change becomes an integral of the trace of the Jacobian, which is far cheaper than a determinant and removes the architectural constraints."
        },
        {
          "q": "What is flow matching?",
          "a": "Train a velocity field to transport noise to data along a prescribed path, regressing on the target velocity instead of simulating the ODE. It is the modern cousin and it is what several current image models actually use."
        }
      ],
      "standard": [
        {
          "q": "Derive the change of variables and explain what constrains flow architectures.",
          "a": "If z = f(x) is a diffeomorphism and z has density p_Z, then probability mass must be conserved: p_X(x)|dx| = p_Z(z)|dz|, so p_X(x) = p_Z(f(x)) |det J_f(x)| where J is the Jacobian of f. In log space, log p_X(x) = log p_Z(f(x)) + log|det J_f(x)|. That is exact — no bound, no approximation — which is the entire appeal, and it immediately produces the constraints that define the field. The map must be INVERTIBLE, so no layer can lose information: no pooling, no ReLU, no dimensionality change, and the latent must be the same size as the data. The Jacobian determinant must be CHEAP, because it appears in the loss for every sample, and a general determinant is O(d^3) — for a 256x256x3 image d is around 200,000, so that is not a constant-factor problem. Every architecture in the literature is an answer to the second constraint. Coupling layers make the Jacobian triangular by construction, so the determinant is the product of the diagonal, which is a sum of the scale outputs in log space. Autoregressive flows do the same via ordering. Continuous flows sidestep determinants entirely by moving to an ODE, where the density change involves a trace rather than a determinant, and the trace can be estimated with a Hutchinson estimator in one matrix-vector product. The through-line is that flows are unusually architecture-constrained compared to other generative models, and that is a direct consequence of wanting the likelihood to be exact.",
          "deepDive": {
            "q": "What does the invertibility constraint cost in practice?",
            "a": "Two things. Parameter efficiency: because there is no bottleneck and every layer must preserve dimension, flows need a lot of parameters to reach image quality that a VAE or diffusion model achieves with fewer, which is the main reason they lost the image-generation race. And topology: a diffeomorphism cannot change the topology of the support, so mapping a unimodal Gaussian onto genuinely disconnected data requires the map to become extremely ill-conditioned in the gaps rather than genuinely separating them. That shows up as pathological Jacobians and is a real limitation, not a tuning problem."
          }
        },
        {
          "q": "Walk through affine coupling in detail.",
          "a": "Split x into two parts, x_a and x_b. The layer leaves x_a alone and transforms x_b conditioned on it: y_a = x_a, and y_b = x_b * exp(s(x_a)) + t(x_a), where s and t are outputs of an arbitrary neural network. Three properties make this work. It is trivially invertible: given y, you have y_a = x_a directly, so you can compute s and t and recover x_b = (y_b - t) * exp(-s). Note that s and t are never inverted — the network can be arbitrarily complex, a full ResNet if you like, because inversion only ever runs it forward. The Jacobian is lower triangular, since y_a depends only on x_a and y_b depends on x_b elementwise plus a term in x_a, so its determinant is the product of exp(s), and the log-determinant is simply the sum of s. That is O(d) instead of O(d^3), which is the whole trick. And it is cheap in both directions, unlike autoregressive flows which are fast one way and sequential the other. The costs are equally clear. A single layer transforms only half the dimensions, so masks must alternate — checkerboard and channel-wise patterns in image flows — and expressiveness per layer is low, since conditioned on x_a the map on x_b is elementwise affine. Depth is how you buy expressiveness, which is why Glow-scale models are very deep and very large.",
          "deepDive": {
            "q": "Why exp(s) rather than s directly?",
            "a": "Because the scale must be strictly positive for invertibility — a zero or negative scale is not invertible, and the log-determinant would be undefined or complex. Exponentiating guarantees positivity and makes the log-determinant just the sum of s, with no logarithm needed. In practice implementations still clamp or tanh-bound s before exponentiating, because an unbounded s makes exp(s) overflow and destabilizes training early."
          }
        },
        {
          "q": "When would you actually use a normalizing flow today?",
          "a": "When you need the exact likelihood, which is the one thing no competitor provides. Diffusion models give better samples, VAEs give better compression, GANs sample faster — but none gives an evaluable normalized density, and there are applications where that is the requirement rather than a nicety. Anomaly and out-of-distribution detection is the canonical one: you want p(x) for a new point, and a flow provides it directly. Simulation-based inference in the physical sciences is arguably where flows are most used in earnest — a flow can represent a posterior over simulator parameters and be evaluated and sampled, which is exactly what the method needs. Variational inference uses flows to make a flexible approximate posterior whose density you can still evaluate, which is what IAF was introduced for. Lossless compression uses the density directly with entropy coding. And in reinforcement learning a flow can represent a policy whose log-probability is needed for the objective. The honest caveat that belongs with the OOD answer is Nalisnick et al.'s finding that deep generative models, flows included, can assign HIGHER likelihood to out-of-distribution data than to their own training distribution — the famous CIFAR-trained model preferring SVHN. So the exact likelihood is real and its interpretation as a novelty score is not automatic, which is the kind of caveat that separates having used a method from having read about it."
        },
        {
          "q": "Compare flows to VAEs, GANs and diffusion on the axes that actually differ.",
          "a": "Take likelihood first. A flow gives exact log-likelihood. A VAE gives a lower bound, and the gap is the KL between the approximate and true posterior, which you cannot measure. A GAN gives nothing — it is an implicit model with no density at all. Diffusion gives a bound that is fairly tight but expensive to evaluate. On sampling: GANs are one forward pass and fastest; flows are one pass through the inverse and also fast, which is under-appreciated; diffusion needs many sequential steps; VAEs are one decoder pass. On sample quality at a fixed parameter budget the ranking runs roughly diffusion, then GAN, then VAE and flow — and flows lose here specifically because invertibility forbids a bottleneck and forces dimension preservation, so parameters are spent maintaining a bijection rather than modelling structure. On training stability, flows and VAEs and diffusion are all straightforward maximum-likelihood-style objectives with a single loss; GANs are a minimax game with no monitorable convergence signal. On mode coverage, likelihood-based models including flows are mode-covering because the objective punishes assigning near-zero density to real data, whereas GANs are mode-seeking and can drop modes silently. The compact summary is that flows trade sample quality for an exact, evaluable density, and whether that is a good trade is entirely determined by whether the application consumes the density or the samples."
        },
        {
          "q": "What is flow matching and why did it displace the classical formulations?",
          "a": "Continuous normalizing flows define the transformation as an ODE — dx/dt = v_theta(x, t) — which removes the architectural constraints entirely, because any velocity field defines an invertible map and the density change is an integral of the trace rather than a determinant. The problem was training: the original approach required simulating the ODE in the forward pass and backpropagating through the solver, which is slow and memory-hungry, and that kept CNFs impractical. Flow matching removes the simulation. Prescribe a probability path from noise to data — typically the straight line x_t = (1-t) x_0 + t x_1 — and note that this path has a known target velocity at every point, namely x_1 - x_0 for the linear case. Then simply regress the network onto that target: a plain MSE, no ODE solve, no divergence estimate, no adjoint. The conditional formulation makes the per-sample target tractable while provably matching the marginal path. Two things follow that explain the adoption. It is a simulation-free objective with the same practical shape as diffusion's noise-prediction loss, so it slots into existing training infrastructure. And because the prescribed path is straight rather than the curved trajectory a diffusion process induces, the learned ODE is easier to integrate, which means good samples in fewer steps. Rectified flow pushes that further by re-straightening the paths. Several current large image and video models are trained this way rather than as classical DDPMs, which is the practical answer to why it matters."
        },
        {
          "q": "Your flow trains to a good likelihood and produces poor samples. What is happening?",
          "a": "This is a real and instructive failure rather than a bug, and the first thing to say is that likelihood and perceptual sample quality are only loosely coupled — Theis et al. made this precise, showing that models can be near-optimal on one and poor on the other, and that the two objectives can be improved independently. For a flow specifically there are a few concrete causes. High-dimensional likelihood is dominated by low-level statistics: a model can score extremely well by capturing local pixel correlations and smooth textures while getting global structure wrong, because the bulk of the density mass lives in those local terms. Dequantization is a common practical culprit — image data is discrete and a continuous density on discrete data is unbounded, so you must add noise, and using plain uniform dequantization rather than variational dequantization gives a looser and differently-shaped objective that flatters the number. Check the sampling temperature too: Glow's qualitative results were reported at reduced temperature, sampling z from a narrower Gaussian than the model was trained with, because full-temperature samples are noticeably worse — which is itself evidence of the gap. And confirm you are not measuring in the wrong units, since bits-per-dimension depends on the dequantization convention and comparisons across papers are frequently not apples to apples. The general lesson to state is that if the product needs good samples, optimizing likelihood is optimizing a proxy, and a diffusion model is the better tool."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Change of variables",
        "back": "log p_X(x) = log p_Z(f(x)) + log|det J_f(x)|. Exact, not a bound — which is the entire appeal and the source of every constraint."
      },
      {
        "type": "intuition",
        "front": "Why the Jacobian dominates design",
        "back": "A general determinant is O(d^3) and appears in the loss for every sample. Every flow architecture is an answer to making it cheap."
      },
      {
        "type": "formula",
        "front": "Affine coupling",
        "back": "y_a = x_a; y_b = x_b * exp(s(x_a)) + t(x_a). Triangular Jacobian, so log-det = sum(s). s and t are never inverted."
      },
      {
        "type": "intuition",
        "front": "Why alternate the mask",
        "back": "Each coupling layer leaves half the dimensions untouched. Without alternating, half the input is never transformed."
      },
      {
        "type": "definition",
        "front": "MAF vs IAF",
        "back": "Autoregressive flows with triangular Jacobians. MAF is fast to evaluate and sequential to sample; IAF is the reverse. Pick by which operation you need fast."
      },
      {
        "type": "intuition",
        "front": "What flows uniquely provide",
        "back": "An exact, evaluable, normalized density. VAEs give a bound, GANs give nothing, diffusion gives an expensive bound."
      },
      {
        "type": "definition",
        "front": "Flow matching",
        "back": "Prescribe a path from noise to data and regress the network onto its known target velocity. Simulation-free, and straight paths integrate in fewer steps."
      },
      {
        "type": "formula",
        "front": "Why exp(s)",
        "back": "The scale must be strictly positive for invertibility, and exponentiating makes log-det just sum(s). Clamp s in practice or exp overflows early in training."
      },
      {
        "type": "pitfall",
        "front": "Dimension preservation",
        "back": "A bijection forbids a bottleneck, so parameters go into maintaining invertibility rather than modelling structure. The main reason flows lost on image quality."
      },
      {
        "type": "pitfall",
        "front": "Likelihood as a novelty score",
        "back": "Nalisnick et al.: a CIFAR-trained flow assigns HIGHER likelihood to SVHN. The density is exact; its interpretation as OOD evidence is not automatic."
      },
      {
        "type": "pitfall",
        "front": "Good bits-per-dim, bad samples",
        "back": "High-dimensional likelihood is dominated by local statistics. Theis et al.: the two objectives can be improved independently."
      },
      {
        "type": "pitfall",
        "front": "Comparing bits-per-dimension across papers",
        "back": "The number depends on the dequantization convention — uniform versus variational — so cross-paper comparisons are frequently not like for like."
      }
    ],
    "refs": [
      {
        "title": "Dinh, Sohl-Dickstein & Bengio (2016) — Density Estimation Using Real NVP",
        "url": "https://arxiv.org/abs/1605.08803"
      },
      {
        "title": "Kingma & Dhariwal (2018) — Glow: Generative Flow with Invertible 1x1 Convolutions",
        "url": "https://arxiv.org/abs/1807.03039"
      },
      {
        "title": "Papamakarios et al. (2019) — Normalizing Flows for Probabilistic Modeling and Inference",
        "url": "https://arxiv.org/abs/1912.02762"
      },
      {
        "title": "Lipman et al. (2022) — Flow Matching for Generative Modeling",
        "url": "https://arxiv.org/abs/2210.02747"
      },
      {
        "title": "Nalisnick et al. (2019) — Do Deep Generative Models Know What They Don't Know?",
        "url": "https://arxiv.org/abs/1810.09136"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
