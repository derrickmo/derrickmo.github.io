// GENERATED from content/lessons/generative/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "generative". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "autoencoders": {
    "level": "core",
    "body": {
      "intuition": [
        "An autoencoder is a network trained to copy its input to its output through a NARROW middle. Because the bottleneck cannot carry everything, the encoder must decide what to keep, and what it keeps is whatever the decoder needs to rebuild the input - which, if the data has structure, is the structure. It is the simplest possible statement of representation learning: compress, then reconstruct, and let the reconstruction loss decide what compression is worth doing.",
        "The most important thing to say about autoencoders in a generative-modelling module is that they are NOT GENERATIVE MODELS. Nothing in the objective constrains what the latent space looks like BETWEEN the training points. Encode your data and you get a cloud of latent codes with an arbitrary shape - clusters, filaments, empty regions. Sample a random point in that space and decode it and you get garbage, because that point corresponds to nothing the decoder was ever trained on. You can only decode codes you already have, which means you can reconstruct and interpolate a little, but you cannot GENERATE.",
        "That gap is exactly what the rest of this module is about, and it is worth seeing clearly before the fixes arrive. The VAE's answer is to force the latent distribution to match a prior you can sample from, paying for it in blur. Latent diffusion's answer is to keep the autoencoder purely as a COMPRESSOR and put a real generative model in the latent space, which is why 11-01 turns out to be a prerequisite for Stable Diffusion rather than a historical curiosity. A second thing worth carrying: a BOTTLENECK IS NOT COMPRESSION. If the decoder is powerful enough, even a very narrow continuous bottleneck can carry an arbitrary amount of information - a single real number has infinitely many digits - so 'the latent is 2-D' does not by itself constrain anything. What constrains an autoencoder is the bottleneck TOGETHER with limited capacity, noise, or an explicit penalty."
      ],
      "math": [
        {
          "h": "The objective, and what it does not say",
          "paras": [
            "Minimize reconstruction error through a bottleneck. Note that the loss involves only points in the DATA - there is no term of any kind describing the distribution of z, which is precisely why the latent space is unconstrained between codes."
          ],
          "tex": "\\min_{\\phi,\\theta} \\; \\mathbb{E}_{x \\sim p_{\\mathrm{data}}}\\big[\\ell\\big(x, \\; g_\\theta(f_\\phi(x))\\big)\\big], \\qquad z = f_\\phi(x) \\in \\mathbb{R}^{d}, \\; d \\ll \\dim(x)",
          "texNote": "There is NO term involving p(z). The objective is satisfied by any encoder-decoder pair that round-trips the training set, however scattered the codes. Sampling z ~ anything and decoding is therefore undefined behaviour - this single omission is what the VAE adds back."
        },
        {
          "h": "The linear case: an autoencoder is PCA's subspace",
          "paras": [
            "With linear layers and squared error, the optimal autoencoder spans exactly the same subspace as the top-d principal components (Baldi & Hornik, 1989). It does NOT recover the ordered orthonormal basis - any invertible mixing of those directions is an equally good solution - which is a useful reminder that a learned latent's individual coordinates mean nothing unless something makes them mean something."
          ],
          "tex": "\\hat{x} = W_d W_e\\, x, \\quad \\min \\lVert X - W_d W_e X\\rVert_F^2 \\;\\Rightarrow\\; \\mathrm{col}(W_d) = \\mathrm{span}\\{u_1,\\dots,u_d\\}",
          "texNote": "u_i = the top singular vectors. The subspace is identified; the basis within it is not. Nonlinear autoencoders inherit this: latent DIMENSIONS are not features, and reading meaning into individual coordinates is a category error unless disentanglement was explicitly imposed."
        },
        {
          "h": "The denoising variant, and what it actually learns",
          "paras": [
            "Corrupt the input, reconstruct the CLEAN version. This forces the model to learn the data manifold rather than the identity, and it has a striking interpretation: a denoising autoencoder trained with Gaussian noise learns the SCORE of the smoothed data distribution."
          ],
          "tex": "\\min \\mathbb{E}_{x, \\epsilon}\\big[\\lVert x - g_\\theta(f_\\phi(x + \\sigma\\epsilon))\\rVert^2\\big], \\qquad \\frac{g(\\tilde{x}) - \\tilde{x}}{\\sigma^2} \\;\\approx\\; \\nabla_{\\tilde{x}} \\log p_\\sigma(\\tilde{x})",
          "texNote": "The residual points UPHILL in probability. This is Vincent's (2011) connection between denoising and score matching, and it is the same identity that makes DDPM's noise-prediction objective a score model - the link from this lesson to 11-09 and to diffusion generally."
        }
      ],
      "code": [
        {
          "h": "Demonstrating that an autoencoder is not generative",
          "paras": [
            "Two lines separate 'reconstructs beautifully' from 'can generate'. Running this once makes the rest of the module's motivation concrete."
          ],
          "code": "import torch\n\nae.eval()\nwith torch.no_grad():\n    z_data = ae.encode(x_test)                    # (N, d) - the codes that EXIST\n\n    # 1. RECONSTRUCTION: decode a real code. Looks great.\n    recon = ae.decode(z_data)                     # crisp, faithful\n\n    # 2. GENERATION: decode a code sampled from a standard normal. Garbage.\n    z_prior = torch.randn(64, D_LATENT)\n    fake = ae.decode(z_prior)                     # noise, smears, nothing\n\n    # 3. WHY: look at where the real codes actually live.\n    print(z_data.mean(0))    # e.g. tensor([ 3.1, -7.4,  0.2, ...]) - not 0\n    print(z_data.std(0))     # e.g. tensor([12.6,  0.3,  4.8, ...]) - not 1\n    # The aggregate posterior is an arbitrary blob: wrong location, wildly\n    # anisotropic scale, and full of HOLES between clusters. N(0, I) samples\n    # land almost entirely in regions the decoder never saw.\n\n    # 4. INTERPOLATION half-works, which is the instructive part:\n    a, b = z_data[0], z_data[1]\n    mid = ae.decode(0.5 * a + 0.5 * b)            # often blurry/invalid\n    # The straight line between two codes leaves the data manifold, because\n    # nothing ever asked the latent space to be convex or connected.\n\n# The fix is not a better architecture. It is adding a term that CONSTRAINS\n# p(z) - which is the VAE - or abandoning the idea that this space should be\n# samplable and putting a real generative model on top of it (latent diffusion).",
          "caption": "Reconstruction and generation are different capabilities. The autoencoder objective delivers the first and says nothing about the second, because it contains no term describing the distribution of z."
        },
        {
          "h": "Reconstruction error for anomaly detection - and why it fails",
          "paras": [
            "The most common practical use of a plain autoencoder, and one with a well-documented failure mode that is worth knowing before you deploy it."
          ],
          "code": "# The idea: train on normal data only; anomalies reconstruct badly.\nscore = ((x - ae(x)) ** 2).mean(dim=(1, 2, 3))\nis_anomaly = score > threshold\n\n# This works when anomalies are OFF the learned manifold, and it fails in two\n# documented ways.\n#\n# (1) AUTOENCODERS GENERALIZE TOO WELL. A model trained on digits will often\n#     reconstruct an unseen letter perfectly, because it learned generic\n#     strokes-and-edges rather than 'digitness'. Low error, real anomaly.\n#\n# (2) THE LIKELIHOOD/COMPLEXITY CONFOUND (Nalisnick et al., 2019). Deep\n#     generative models trained on CIFAR-10 assign HIGHER likelihood to SVHN\n#     than to CIFAR-10 itself. SVHN images are simpler - smoother, lower\n#     entropy - and simple inputs are easy to reconstruct or to score highly\n#     REGARDLESS of whether the model has ever seen anything like them. The\n#     same confound afflicts reconstruction error: a blank grey image gets a\n#     near-zero score from any autoencoder.\n#\n# MITIGATIONS: compare reconstruction error against a COMPLEXITY baseline\n# (e.g. a general-purpose compressor's bitrate on the same input), use the\n# likelihood RATIO against a background model, or score in feature space\n# rather than pixel space. And always evaluate on real anomalies from your\n# own domain - the method's success is entirely domain-dependent.",
          "caption": "Reconstruction-error anomaly detection has a structural confound: simple inputs score well whether or not the model has seen anything like them. The CIFAR-10-scores-SVHN-higher result is the canonical demonstration."
        }
      ],
      "useCases": [
        "The COMPRESSOR half of latent diffusion: Stable Diffusion's VAE maps 512x512x3 pixels to a 64x64x4 latent, a ~48x reduction in elements, so the expensive generative model runs in a small space. This is the single most consequential deployed use of an autoencoder today.",
        "Dimensionality reduction and representation learning where the structure is nonlinear enough that PCA is insufficient - denoising, sparse, and contractive variants are all ways of controlling WHAT gets kept.",
        "Anomaly and novelty detection via reconstruction error in industrial inspection, network monitoring, and fraud - with the complexity confound above measured rather than assumed.",
        "Sparse dictionary learning on neural activations: the sparse autoencoders used in mechanistic interpretability are exactly this architecture, overcomplete rather than bottlenecked, with an L1 penalty doing the constraining instead of a narrow middle."
      ],
      "pitfalls": [
        "Expecting to generate by sampling the latent space. The objective contains no term describing p(z), so the codes form an arbitrary blob full of holes and prior samples decode to garbage. This is not a tuning problem; it is a missing term.",
        "Believing a narrow bottleneck forces compression. A sufficiently powerful decoder can extract arbitrary information from a single real number, so 'the latent is 2-D' constrains nothing by itself. Compression comes from the bottleneck TOGETHER with limited capacity, noise, or an explicit penalty.",
        "Reading meaning into individual latent dimensions. Even in the linear case only the SUBSPACE is identified, not the basis - any invertible mixing is an equally optimal solution. Disentanglement must be imposed, and even then it is contested.",
        "Using reconstruction error for anomaly detection without a complexity control. Simple inputs reconstruct well regardless of familiarity - a blank image scores near zero, and models trained on CIFAR-10 assign SVHN higher likelihood. Compare against a compression baseline or a background model.",
        "Training with MSE and being surprised by blur. Squared error on pixels rewards predicting the conditional MEAN, which for an ambiguous region is an average of plausible outputs. This is a LIKELIHOOD choice, not an architecture flaw, and it recurs identically in the VAE.",
        "Treating a deeper autoencoder as automatically better. Past a point the extra capacity is spent learning to route information around the bottleneck rather than learning structure, which shows up as excellent reconstruction and useless representations."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/pca",
          "text": "A linear autoencoder with squared error spans exactly PCA's subspace - the nonlinear version is the natural generalization, and the loss of an ordered basis is the price."
        },
        {
          "ref": "generative/vae",
          "text": "The VAE is this lesson plus one missing term: a penalty forcing the aggregate latent distribution toward a prior you can actually sample from."
        },
        {
          "ref": "generative/latent-diffusion",
          "text": "Latent diffusion accepts that this space is not samplable and puts a real generative model on top of it - which turns the autoencoder into pure compression and is why it matters commercially."
        },
        {
          "ref": "generative/ebm-score",
          "text": "A denoising autoencoder's residual estimates the SCORE of the smoothed data distribution, which is the identity connecting this lesson to diffusion and score-based models."
        },
        {
          "ref": "advanced-nlp/interpretability",
          "text": "The sparse autoencoders used to decompose superposed activations are this architecture with an L1 penalty and an OVERCOMPLETE middle rather than a bottleneck."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is an autoencoder?",
          "a": "An encoder-decoder network trained to reconstruct its input through a bottleneck. The bottleneck forces the encoder to keep only what the decoder needs, which - if the data has structure - is the structure."
        },
        {
          "q": "Why is an autoencoder not a generative model?",
          "a": "The objective has no term describing p(z), so the latent codes form an arbitrary blob with holes. Sampling z from a prior and decoding gives garbage, because those points correspond to nothing the decoder saw."
        },
        {
          "q": "How does a linear autoencoder relate to PCA?",
          "a": "With squared error it spans exactly the same subspace as the top-d principal components - but it does NOT recover the ordered orthonormal basis, since any invertible mixing is equally optimal."
        },
        {
          "q": "Does a narrow bottleneck guarantee compression?",
          "a": "No. A powerful decoder can extract arbitrary information from a single continuous value. Compression requires the bottleneck plus limited capacity, noise, or an explicit penalty."
        },
        {
          "q": "What is a denoising autoencoder?",
          "a": "Corrupt the input, reconstruct the clean version. It forces learning the data manifold rather than the identity, and works even without a bottleneck."
        },
        {
          "q": "What does a denoising autoencoder secretly learn?",
          "a": "The SCORE of the noise-smoothed data distribution - the residual (output minus noisy input) over sigma-squared approximates grad log p_sigma. This is the link to diffusion models."
        },
        {
          "q": "What is a sparse autoencoder?",
          "a": "An autoencoder whose hidden layer is often WIDER than the input, constrained by an L1 or KL sparsity penalty so few units activate. Used for dictionary learning and, now, for interpretability."
        },
        {
          "q": "What is a contractive autoencoder?",
          "a": "Adds a penalty on the Frobenius norm of the encoder's Jacobian, explicitly making the representation insensitive to small input perturbations - an explicit form of what denoising does implicitly."
        },
        {
          "q": "Why are autoencoder reconstructions blurry with MSE?",
          "a": "Squared error rewards the conditional MEAN, so when several outputs are plausible the model predicts their average. It is a likelihood choice, not an architecture defect."
        },
        {
          "q": "How are autoencoders used for anomaly detection?",
          "a": "Train on normal data, flag high reconstruction error. It works when anomalies are off-manifold and fails when the model generalizes too well or when the anomaly is simply SIMPLER than the training data."
        },
        {
          "q": "What is the CIFAR-10/SVHN result?",
          "a": "Deep generative models trained on CIFAR-10 assign HIGHER likelihood to SVHN images, because SVHN is lower-complexity. Likelihood and reconstruction error both confound familiarity with simplicity."
        },
        {
          "q": "Where are autoencoders most important today?",
          "a": "As the COMPRESSOR in latent diffusion - mapping 512x512x3 to 64x64x4 so the diffusion model runs in a ~48x smaller space. Not as generators."
        }
      ],
      "standard": [
        {
          "q": "Explain why an autoencoder cannot generate, and what each fix actually changes.",
          "a": "THE PROBLEM, precisely. The autoencoder objective is expectation over the DATA of a reconstruction loss. Every term involves a real data point. Nothing anywhere in the objective describes the distribution of z, so the optimizer is free to place codes wherever is convenient - and it does. Encode a dataset and you typically find latents with a nonzero mean, wildly different per-dimension scales, distinct clusters, and large empty regions between them. Sample from a standard normal and you land in those empty regions, where the decoder's behaviour is undefined in the strict sense that no gradient ever constrained it. THE DIAGNOSTIC that makes this concrete: print the mean and standard deviation of the encoded training set. If they are not roughly zero and one, N(0,I) samples are simply in the wrong place; and even after standardizing, the HOLES remain, which is the deeper issue. Interpolating between two real codes half-works for the same reason - the straight line between them may leave the data manifold, because nothing asked the space to be convex or connected. FIX 1 - CONSTRAIN THE LATENT DISTRIBUTION (the VAE). Add a KL term pulling the per-example posterior q(z|x) toward the prior p(z). Now the aggregate distribution of codes is pushed toward something you can sample from, and the stochastic encoder means each data point occupies a REGION rather than a point, which fills in the space between codes. What it changes: the space becomes samplable and interpolation becomes meaningful. What it costs: blur, because there is now a tension between reconstructing precisely and matching the prior, and because the Gaussian likelihood rewards conditional means. FIX 2 - ADVERSARIAL REGULARIZATION (adversarial autoencoders). Instead of a KL term, train a discriminator to distinguish encoded codes from prior samples and train the encoder to fool it. This matches the AGGREGATE posterior to the prior directly rather than per-example, which is arguably the quantity you actually care about, and it works with priors that have no tractable density. Costs: adversarial training instability. FIX 3 - DISCRETIZE (VQ-VAE). Quantize the latent to entries of a learned codebook. Now the latent space is a finite set with no holes by construction - every code is valid. But you cannot sample uniformly from the codebook and get coherent output, because the codes have STRUCTURE, so you must fit a second model (a PixelCNN or a transformer) over the code sequence. This is the honest version of the trade: the autoencoder does compression, a separate model does generation. FIX 4 - ABANDON THE PREMISE (latent diffusion). Keep the autoencoder as a pure COMPRESSOR, add only enough regularization to keep the latent well-scaled, and train a diffusion model in that latent space. This is the design that won commercially, and its logic is worth stating: pixel-space diffusion spends most of its capacity modelling imperceptible high-frequency detail, so hand that part to a cheap autoencoder and spend the expensive generative model on the semantic part. WHAT I WOULD TAKE FROM THE COMPARISON. Reconstruction and generation are genuinely different capabilities, and the gap between them is exactly one missing term - a specification of what the latent distribution should be. Every fix above is a different way of supplying it, and they differ mainly in what they pay: the VAE pays in blur, the adversarial version in stability, VQ in needing a second model, and latent diffusion in needing a second model too but getting a much better one.",
          "deepDive": {
            "q": "Walk through the VQ-VAE: why discretize, and what does it buy?",
            "a": "THE MECHANISM. The encoder produces a continuous feature map. Each spatial position's vector is replaced by its NEAREST NEIGHBOUR in a learned codebook of K embedding vectors, and the decoder reconstructs from the quantized map. So the latent is a grid of integers - an image becomes, say, a 32x32 grid of codebook indices. THREE TRAINING DETAILS that people get wrong. (1) The nearest-neighbour lookup is not differentiable, so the STRAIGHT-THROUGH ESTIMATOR copies the gradient from the decoder input directly to the encoder output, pretending quantization was the identity. Crude, and it works. (2) The codebook is learned by a separate term pulling codebook entries toward the encoder outputs assigned to them - or, in the common variant, by an EMA update, which is more stable. (3) A COMMITMENT LOSS penalizes the encoder for drifting away from its chosen codebook entry, which is necessary because otherwise the encoder output can grow without bound to reduce quantization error's relative size. WHY DISCRETIZE AT ALL - four real reasons. (a) NO HOLES. A continuous latent space has undefined regions between codes; a finite codebook does not - every index is a valid latent. This removes the autoencoder's core generative failure by construction rather than by regularization. (b) IT MATCHES THE PRIOR MODEL. Once the latent is a sequence of discrete tokens, you can model it with the best tools available for discrete sequences - PixelCNN originally, transformers now. That is an enormous practical advantage, because autoregressive modelling of discrete tokens is the single most refined technique in machine learning. (c) NO POSTERIOR COLLAPSE. The VAE's characteristic failure, where a strong decoder ignores the latent, does not occur here because there is no KL term pushing the posterior toward an uninformative prior. (d) IT IS A NATURAL INTERFACE between modalities: images become token sequences, so the same architecture handles text and images. THE TWO-STAGE STRUCTURE, which is the conceptual payoff. Stage 1 learns a COMPRESSION - what the tokens mean. Stage 2 learns a PRIOR over token sequences - what arrangements are plausible. These are separable, trained independently, and each can use the best available method for its job. VQ-VAE-2 added a hierarchy (a coarse top-level code map and a fine bottom-level one) and produced ImageNet samples competitive with GANs of the era, which was the proof that the approach scaled. WHERE IT SHOWS UP NOW, because this is not a historical detour. VQGAN adds a perceptual loss and a patch discriminator to the stage-1 autoencoder, which sharpens reconstructions substantially, and pairs it with a transformer prior - that is the architecture behind a large fraction of image generation before diffusion took over, and it remains standard for VIDEO and AUDIO tokenization. Discrete audio codecs (SoundStream, EnCodec) are VQ-VAEs with residual quantization, and they are what make audio language models possible. Any 'multimodal LLM that generates images' is doing something in this family. THE KNOWN DIFFICULTIES. CODEBOOK COLLAPSE - most entries go unused, so effective capacity is far below K; mitigated with EMA updates, dead-code reinitialization, and lower-dimensional codebook vectors. Choosing K and the downsampling factor is a real compression-versus-fidelity trade with no principled answer. Reconstruction has a hard ceiling set by the quantization, which is why perceptual and adversarial losses matter so much for stage 1. And errors compound across stages: a stage-2 model that generates a slightly implausible token sequence produces artifacts stage 1 cannot repair. THE FRAMING I FIND MOST USEFUL: VQ-VAE is the clearest statement in generative modelling that COMPRESSION AND GENERATION ARE SEPARATE PROBLEMS, and that solving them separately with the right tool for each beats solving them jointly. Latent diffusion is the same insight with a diffusion model in stage 2 instead of a transformer."
          }
        },
        {
          "q": "You want to detect defects in manufactured parts from images, with only good examples. How would you use an autoencoder, and what would you watch for?",
          "a": "THE SETUP IS THE RIGHT ONE FOR RECONSTRUCTION-BASED DETECTION - abundant normal data, defects that are rare, varied, and not enumerable in advance, so a supervised classifier is not an option. But I would go in knowing the specific ways this method fails. THE BASELINE APPROACH. Train an autoencoder on good parts only. At inference, reconstruct and score by reconstruction error. The hypothesis is that defects lie off the learned manifold, so the decoder cannot reproduce them and the error localizes to the defect. The error MAP is as valuable as the scalar - it tells the operator where to look, which is often the actual product requirement. WHAT I WOULD CHANGE FROM THE NAIVE VERSION. (1) SCORE IN FEATURE SPACE, NOT PIXEL SPACE. Per-pixel MSE is dominated by high-frequency texture and lighting variation and is a poor match for perceptual defect visibility. Comparing features from a pretrained network (an LPIPS-style perceptual distance) is markedly better, and combining structural similarity with MSE is a cheap improvement. (2) USE A DENOISING OR MASKED variant. A plain autoencoder can learn to pass information through and reconstruct a defect it has never seen. Training it to reconstruct a clean patch from a CORRUPTED one - or to inpaint a masked region from context - forces it to predict what SHOULD be there, so a defect is reconstructed as its defect-free counterpart and the error is large by construction. This single change usually matters more than any architecture choice. (3) PATCH-BASED rather than whole-image, since a small defect on a large part contributes negligibly to an image-level error. Score patches and aggregate with a max or a high quantile, not a mean. THE FAILURE MODES I WOULD MEASURE, not assume. (a) OVER-GENERALIZATION: the model reconstructs unseen defects well because it learned generic edges and textures. Test this directly by holding out real defect images and checking the error separation. (b) THE COMPLEXITY CONFOUND: reconstruction error correlates with image complexity, so a smooth, simple region scores low whether or not it is normal, and a busy but perfectly good region scores high. This is the same effect behind models trained on CIFAR-10 assigning SVHN higher likelihood. Mitigate by normalizing the error against a local complexity estimate, or by comparing against a background model. (c) NUISANCE VARIATION: lighting, part pose, and background changes produce large reconstruction errors that are not defects. Either control them physically - which in a manufacturing line is usually possible and is the right answer - or include them in training so the model learns to reconstruct through them. (d) THRESHOLD DRIFT: as the process changes, the error distribution shifts. Monitor it and recalibrate. WHAT I WOULD COMPARE AGAINST, because reconstruction-based detection is frequently NOT the best method and it would be dishonest to skip this. PATCHCORE and similar memory-bank methods - extract patch features from a frozen pretrained network, store a coreset of normal features, and score by distance to the nearest normal feature - are simpler, need no training, and outperform autoencoder reconstruction on the standard MVTec-AD benchmark by a wide margin. Normalizing-flow-based density estimation on pretrained features is another strong family. If I had to pick one method to try first on an industrial defect problem, it would be a memory-bank method, not an autoencoder. I would still build the autoencoder if the defects are structural rather than textural, or if the deployment cannot ship a feature memory bank. THE EVALUATION, which is where these projects succeed or fail. Collect real defects, even if few, and evaluate image-level AUROC AND pixel-level localization separately - a system that flags the right image for the wrong reason will not survive operator review. Report a precision-recall curve rather than a single threshold, because the cost of a missed defect versus a false alarm is a business input, not a modelling one. And split by production batch and time period, since parts from one batch are highly self-similar and a random split will overstate everything."
        },
        {
          "q": "What are the main autoencoder variants and what problem does each solve?",
          "a": "THE FAMILY ORGANIZES CLEANLY BY WHAT CONSTRAINS THE REPRESENTATION, which is a better axis than chronology. UNDERCOMPLETE (the plain bottleneck): the constraint is DIMENSION. The middle layer is narrower than the input, so information must be discarded. Simple, and the caveat is the one above - dimension alone constrains little if the decoder is powerful, since a continuous scalar can carry arbitrary information. DENOISING (Vincent et al., 2008): the constraint is NOISE. Corrupt the input, reconstruct the clean original. This works WITHOUT a bottleneck, which is its conceptual importance - the model cannot learn the identity because the identity of the corrupted input is the wrong answer, so it must learn the structure that lets it undo the corruption. It also has the deepest theoretical payoff: the learned residual estimates the score of the smoothed data density, which is the bridge to diffusion. SPARSE: the constraint is ACTIVATION SPARSITY, via an L1 penalty or a KL to a low target activation rate. The hidden layer can be OVERCOMPLETE - wider than the input - because sparsity rather than dimension does the constraining. This is dictionary learning, and it is exactly the architecture used to decompose superposed neural activations in mechanistic interpretability, which has made it suddenly relevant again. CONTRACTIVE (Rifai et al., 2011): the constraint is an explicit penalty on the encoder Jacobian's Frobenius norm, making the representation locally insensitive to input perturbation. It is the analytic version of what denoising achieves stochastically, and the comparison is instructive - denoising penalizes sensitivity along directions the noise actually explores, contractive penalizes it in all directions. VARIATIONAL: the constraint is DISTRIBUTIONAL - a KL term pulling the posterior toward a prior. This is the one that converts an autoencoder into a generative model, at the cost of blur, and it belongs to a different lineage (variational inference) despite the name. VECTOR-QUANTIZED: the constraint is DISCRETENESS - the latent must be a codebook entry. Removes holes by construction, avoids posterior collapse, and produces a token sequence that a strong autoregressive model can then generate. MASKED (MAE, and BERT in the same spirit): the constraint is that most of the input is REMOVED, so the model must infer it from context. The modern high-mask-ratio version is a pretraining method rather than a compression method, and the ratio is what makes it work - 75% for images, since images are redundant. HOW I WOULD CHOOSE. For LEARNING A REPRESENTATION to transfer: masked or denoising, and honestly today you should probably use a pretrained model rather than train your own. For COMPRESSION as a component in a larger system: undercomplete with perceptual and adversarial losses (the VQGAN or Stable-Diffusion-VAE recipe), and quantize if a discrete interface helps downstream. For GENERATION: not a plain autoencoder - use a VAE if you need a fast samplable latent, or VQ plus a transformer prior, or latent diffusion. For ANOMALY DETECTION: denoising or masked, so the model reconstructs what SHOULD be there rather than what is. For INTERPRETABILITY: sparse and overcomplete. THE UNIFYING POINT worth making: every variant is answering the same question - 'what stops the network from learning the identity function' - and the answer determines what the representation ends up encoding. Dimension, noise, sparsity, smoothness, distribution, discreteness. Choosing a variant IS choosing what you want the representation to be invariant to, which makes it a modelling decision rather than an architectural one."
        },
        {
          "q": "How is an autoencoder used inside Stable Diffusion, and why is that design a good idea?",
          "a": "THE ROLE. Stable Diffusion is a LATENT diffusion model. A pretrained autoencoder maps a 512x512x3 image to a 64x64x4 latent - a factor of 8 spatially, and roughly 48x fewer elements overall. The diffusion model operates entirely in that latent space, and the decoder converts the final latent back to pixels. The autoencoder is trained ONCE, separately, and frozen. WHY THIS IS A GOOD IDEA - the argument is about where capacity goes. Rombach et al. framed it as separating PERCEPTUAL compression from SEMANTIC compression. Most of the bits in a natural image are high-frequency detail that contributes little to what the image means - texture, sensor noise, exact edge placement. A pixel-space diffusion model must model all of it, and empirically most of its training compute goes into that imperceptible detail. An autoencoder can discard it far more cheaply, because reconstruction is a much easier problem than generation. So: let a cheap model handle the perceptually irrelevant part, and spend the expensive iterative model on the semantic part. THE QUANTITATIVE PAYOFF is large and is the reason this design won. Attention and convolution costs scale with the number of elements, so a 48x reduction is roughly that much less work PER DENOISING STEP, and diffusion needs many steps. That difference is what took text-to-image generation from a datacenter service to something that runs on a consumer GPU, which changed the entire ecosystem around it. THE DESIGN DETAILS THAT MATTER. (1) The autoencoder is trained with a PERCEPTUAL loss (LPIPS) and a PATCH DISCRIMINATOR, not plain MSE. This is essential - MSE alone gives blurry reconstructions, and every blur in the autoencoder is a hard ceiling on the final output no matter how good the diffusion model is. (2) The latent is only LIGHTLY regularized - a very small KL weight, or vector quantization in the VQ variant. Enough to keep the latent from drifting to an arbitrary scale, deliberately not enough to make it a good generative prior, because it is not being asked to be one. This is the key design insight: the autoencoder is a compressor, and treating it as a generative model would force a trade it does not need to make. (3) The downsampling factor is a tuned trade-off - the paper swept it and found factors of 4 to 8 best. Too little compression and you have not saved much; too much and the autoencoder discards semantic content the diffusion model can never recover. THE COSTS AND FAILURE MODES, which are visible in practice. The autoencoder is a hard ceiling on fidelity: whatever it cannot reconstruct, the system cannot generate. This is the known source of Stable Diffusion's difficulty with small faces and with TEXT in images - fine high-frequency structure that survives the 8x downsampling poorly. It is also why later versions retrained the autoencoder with more channels rather than only improving the diffusion model. There are characteristic latent-space artifacts, and errors made in latent space get amplified by the decoder in ways that are hard to predict. And the two-stage structure means a fidelity problem requires diagnosing WHICH stage caused it - a useful debugging step is to encode and immediately decode a real image and look at what is lost, which upper-bounds the whole system. THE GENERAL LESSON, which recurs: FACTOR THE PROBLEM SO EACH PART USES THE CHEAPEST ADEQUATE METHOD. Compression is easy and an autoencoder suffices; generation is hard and deserves the expensive model. The same reasoning produces VQ-VAE plus transformer, retrieve-then-read in QA, and cascaded model designs generally. When a system spends most of its expensive computation on a subproblem that a cheap method could handle, that is a factoring opportunity."
        },
        {
          "q": "Why are autoencoder reconstructions blurry, and how do you fix it?",
          "a": "THE CAUSE IS THE LOSS, NOT THE ARCHITECTURE, and this is the single most important thing to get right about the question. Minimizing squared error means predicting the CONDITIONAL MEAN of the output given the input. When several outputs are plausible - which is the normal case whenever the bottleneck has discarded information - the mean of those plausible outputs is a blur. If a region could be either of two textures, the MSE-optimal prediction is their average, which is neither. Equivalently: MSE corresponds to a Gaussian likelihood with fixed variance, and that likelihood is an extremely poor model of natural images, which are multimodal at every scale. WHY THIS MATTERS CONCEPTUALLY: the model is not failing. It is succeeding at an objective that does not want what you want. Blur is the correct answer to the question you asked. THE FIXES, in increasing order of effectiveness and complexity. (1) PERCEPTUAL LOSS (LPIPS, or feature-matching against a pretrained network). Compare reconstructions in a feature space where perceptually similar images are close, rather than in pixels. Because features are invariant to exact positioning of high-frequency detail, the model is no longer punished for producing plausible-but-different texture. This is the biggest single improvement available and it is cheap. (2) ADVERSARIAL LOSS. Add a discriminator - typically a patch discriminator, which judges local realism rather than global structure. The generator is now rewarded for producing output on the data manifold rather than at the average of it, which is precisely the failure MSE causes. Combining a reconstruction term (for fidelity to THIS input) with an adversarial term (for realism) is the VQGAN and Stable-Diffusion-VAE recipe, and it works well. (3) A BETTER LIKELIHOOD. Replace the implicit fixed-variance Gaussian with something that can represent multimodality: a discretized logistic mixture (PixelCNN++'s choice), or an autoregressive decoder that models pixels conditionally rather than independently. More principled, more expensive. (4) DISCRETE LATENTS plus a strong prior. VQ-VAE's stage-2 model samples plausible token sequences rather than averaging, so the output is a sample from the distribution rather than its mean. (5) DIFFUSION AS THE DECODER, which is the modern high-end answer - a diffusion decoder samples from the conditional distribution instead of predicting its mean, and produces sharp output by construction. THE TRADE-OFF YOU ARE MAKING, which should be stated explicitly rather than discovered. All of these replace 'faithful to the input on average' with 'realistic'. An adversarial or diffusion decoder will HALLUCINATE plausible detail that was not in the original - inventing texture, sharpening a face into a different face. For a compression component feeding a generative model, that is exactly right and the hallucinated detail is a feature. For MEDICAL or SCIENTIFIC reconstruction it is a serious problem, because a plausible invented lesion is worse than a blurry real one. So the correct answer to 'how do I fix the blur' depends on whether faithfulness or realism is the requirement, and that is a domain question. WHERE ELSE THIS EXACT ISSUE APPEARS, since recognizing the pattern is worth more than the fix: VAE blur is the same mechanism with the same fix; regression models predicting the mean of a multimodal target have the same problem; and image super-resolution and inpainting are entirely organized around this trade, with 'distortion' metrics (PSNR, SSIM) and 'perceptual' metrics known to be in provable tension - you cannot maximize both, and every method sits somewhere on that curve."
        },
        {
          "q": "How do you tell whether a learned representation is any good?",
          "a": "YOU CANNOT TELL FROM THE TRAINING LOSS, which is the first thing to establish. Reconstruction error measures how much information survived the bottleneck, not whether that information is USEFUL. A representation that memorizes an index into the training set has perfect reconstruction and zero utility. So evaluation must be extrinsic. THE PROTOCOLS, and what each measures. (1) LINEAR PROBING: freeze the encoder, train a linear classifier on the representation for a downstream task. Measures LINEAR SEPARABILITY - whether the useful structure is present and directly accessible. Cheap, standardized, comparable. (2) k-NN CLASSIFICATION: no training at all, classify by nearest neighbours in representation space. The purest test of whether the space is semantically organized, and parameter-free so there is nothing to tune away. (3) FINE-TUNING: train everything on the downstream task. Measures how good an INITIALIZATION the representation is, which is a different property - MAE's features probe poorly and fine-tune excellently, which is the canonical demonstration that these protocols can rank methods oppositely. (4) LOW-SHOT: probe or fine-tune with 1% or 10% of labels, closer to the regime where representation learning actually pays. (5) TRANSFER to a different dataset or a dense task, which tests generality rather than fit to one benchmark. (6) CLUSTERING quality, if you have labels: does k-means on the representation recover them? WHAT TO WATCH FOR IN THE MEASUREMENT ITSELF. Report the protocol's hyperparameters, because linear-probe results move by a point or two depending on the optimizer, learning rate, and whether features are normalized. Check WHICH LAYER you are probing - the last layer is often not the best, since it specializes to the training objective. And use a control: how well does a RANDOM untrained encoder of the same architecture score? Randomly-initialized convolutional features are a surprisingly strong baseline, and if your trained encoder barely beats it, the training did little. FOR AUTOENCODERS SPECIFICALLY, some additional checks. INTERPOLATION between codes - does the decoded path stay on the data manifold, or pass through garbage? That tests whether the space is smooth and connected, which reconstruction error cannot see. LATENT TRAVERSALS - move along one dimension and see whether anything interpretable changes. Note the honest caveat here: absent an explicit disentanglement objective there is no reason for individual dimensions to mean anything, since even the linear case identifies only the subspace and not the basis, so a failed traversal is expected rather than diagnostic. And the AGGREGATE POSTERIOR's shape, if you intend to sample from it. THE THING I WOULD ACTUALLY DO ON A REAL PROJECT: evaluate on the downstream task you care about, with the amount of labelled data you actually have. Every protocol above is a proxy for that, chosen because papers need a comparable number across tasks they do not have. If you have a specific task, measuring it directly is both easier and more informative than any of them - and it avoids the classic error of optimizing a probing protocol that does not match how the representation will be used."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Autoencoder",
        "back": "Encoder-decoder trained to reconstruct its input through a bottleneck. The objective is an expectation over DATA points only - there is no term describing p(z), which is exactly why it cannot generate."
      },
      {
        "type": "pitfall",
        "front": "Autoencoders are NOT generative",
        "back": "Latent codes form an arbitrary blob with holes: nonzero mean, anisotropic scale, empty regions. Prior samples decode to garbage. Diagnostic: print z.mean(0) and z.std(0) on the encoded training set."
      },
      {
        "type": "intuition",
        "front": "Linear autoencoder = PCA's subspace",
        "back": "With squared error it spans the top-d principal subspace - but NOT the ordered orthonormal basis, since any invertible mixing is equally optimal. Hence latent DIMENSIONS carry no meaning by default."
      },
      {
        "type": "pitfall",
        "front": "A bottleneck is not compression",
        "back": "A powerful decoder can extract arbitrary information from one continuous scalar (infinitely many digits). Compression needs the bottleneck PLUS limited capacity, noise, or an explicit penalty."
      },
      {
        "type": "definition",
        "front": "Denoising autoencoder",
        "back": "Reconstruct the CLEAN input from a corrupted one. Works without a bottleneck (the identity is now the wrong answer). Its residual over sigma^2 estimates grad log p_sigma - the SCORE - which is the bridge to diffusion."
      },
      {
        "type": "intuition",
        "front": "Why MSE reconstructions blur",
        "back": "Squared error predicts the conditional MEAN, so ambiguous regions get the average of plausible outputs. It is a LIKELIHOOD choice. Fix with perceptual + adversarial losses, a multimodal likelihood, or a diffusion decoder."
      },
      {
        "type": "pitfall",
        "front": "Anomaly detection's complexity confound",
        "back": "Reconstruction error tracks input SIMPLICITY as much as familiarity - a blank image scores near zero. Same effect as models trained on CIFAR-10 assigning SVHN HIGHER likelihood. Normalize against a complexity or background model."
      },
      {
        "type": "definition",
        "front": "The variant family, by what constrains it",
        "back": "Undercomplete = dimension. Denoising = noise. Sparse = L1 activation (can be OVERCOMPLETE). Contractive = Jacobian norm. Variational = distribution. VQ = discreteness. Masked = most of the input removed. Choosing one IS choosing the invariance."
      },
      {
        "type": "definition",
        "front": "VQ-VAE",
        "back": "Quantize each latent vector to a learned codebook entry; straight-through estimator for gradients, plus a commitment loss. No holes by construction, no posterior collapse - but you need a SECOND model (transformer/PixelCNN) over the token sequence to generate."
      },
      {
        "type": "intuition",
        "front": "The autoencoder in Stable Diffusion",
        "back": "512x512x3 -> 64x64x4 = ~48x fewer elements, so each denoising step is far cheaper. Trained with PERCEPTUAL + adversarial losses (MSE blur would be a hard ceiling) and only LIGHTLY regularized - it is a compressor, not a generative prior."
      },
      {
        "type": "pitfall",
        "front": "The autoencoder caps the whole system",
        "back": "Whatever it cannot reconstruct, latent diffusion cannot generate - the known source of small-face and in-image-TEXT failures. Debug by encoding and immediately decoding a real image: that is the system's fidelity ceiling."
      },
      {
        "type": "intuition",
        "front": "Evaluating a representation",
        "back": "Never from reconstruction loss - a memorized index reconstructs perfectly and is useless. Use linear probe, k-NN, fine-tuning, and low-shot, and always include a RANDOM untrained encoder as the control."
      }
    ],
    "refs": [
      {
        "title": "Vincent et al. (2008), Extracting and Composing Robust Features with Denoising Autoencoders",
        "url": "https://www.cs.toronto.edu/~larocheh/publications/icml-2008-denoising-autoencoders.pdf"
      },
      {
        "title": "van den Oord et al. (2017), Neural Discrete Representation Learning (VQ-VAE)",
        "url": "https://arxiv.org/abs/1711.00937"
      },
      {
        "title": "Rombach et al. (2022), High-Resolution Image Synthesis with Latent Diffusion Models",
        "url": "https://arxiv.org/abs/2112.10752"
      },
      {
        "title": "Nalisnick et al. (2019), Do Deep Generative Models Know What They Don't Know?",
        "url": "https://arxiv.org/abs/1810.09136"
      },
      {
        "title": "Vincent (2011), A Connection Between Score Matching and Denoising Autoencoders",
        "url": "https://www.iro.umontreal.ca/~vincentp/Publications/smdae_techreport.pdf"
      }
    ],
    "demos": [
      "pca",
      "embeddings",
      "tsne",
      "sparse-autoencoder"
    ]
  },
  "vae": {
    "level": "core",
    "body": {
      "intuition": [
        "The VAE fixes the autoencoder's one missing piece. An autoencoder places latent codes wherever is convenient, so the space has holes and prior samples decode to nothing. The VAE adds a term that pulls the distribution of codes toward a prior you can sample from, and makes the encoder output a DISTRIBUTION rather than a point - so each training example occupies a small region of latent space instead of a single spot. Regions overlap, the gaps fill in, and now sampling z from N(0, I) and decoding produces something coherent.",
        "The derivation is variational inference, and the shape is worth carrying even if the algebra fades. You want to maximize log p(x), which requires an intractable integral over z. So you introduce an approximate posterior q(z|x), and a few lines of algebra give you log p(x) = ELBO + KL(q || true posterior). Because KL is non-negative, the ELBO is a LOWER BOUND on the log-likelihood, and maximizing it does two things at once: it pushes up the likelihood, and it pulls q toward the true posterior. The bound is tight exactly when your approximate posterior is correct.",
        "What you get is the first corner of the module's central trade-off. VAEs sample FAST - one forward pass through the decoder - and they cover MODES well, because the likelihood objective penalizes assigning low probability to real data. What they do not give you is sample quality: VAE samples are famously blurry. The reason is worth being precise about, because it is almost always misattributed to the architecture. Blur comes from the Gaussian output likelihood, which makes the optimal reconstruction the conditional MEAN of all plausible images - and the average of several plausible images is a blur. The second recurring failure is POSTERIOR COLLAPSE: give the decoder enough power and it will model the data on its own, the KL term drives q(z|x) to the prior, and the latent carries no information at all. You have trained an expensive unconditional model with a decorative encoder attached."
      ],
      "math": [
        {
          "h": "The ELBO, and where the bound comes from",
          "paras": [
            "Start from the marginal likelihood, insert q(z|x), and apply Jensen's inequality - or equivalently write the exact decomposition below, which is more informative because it shows precisely what the gap is."
          ],
          "tex": "\\log p_\\theta(x) = \\underbrace{\\mathbb{E}_{q_\\phi(z|x)}\\big[\\log p_\\theta(x|z)\\big] - \\mathrm{KL}\\big(q_\\phi(z|x)\\,\\|\\,p(z)\\big)}_{\\mathcal{L}_{\\mathrm{ELBO}}} \\;+\\; \\mathrm{KL}\\big(q_\\phi(z|x)\\,\\|\\,p_\\theta(z|x)\\big)",
          "texNote": "The final KL is non-negative and NOT computable, which is exactly why the ELBO is a bound rather than the likelihood. The gap is the approximate posterior's error - so a VAE's reported 'likelihood' is a lower bound of unknown tightness, and comparing it against an exact-likelihood model is comparing different quantities."
        },
        {
          "h": "The reparameterization trick",
          "paras": [
            "You cannot backpropagate through sampling. The fix is to move the randomness OUT of the computation graph: sample a standard normal and transform it with the encoder's outputs, so the gradient flows through mu and sigma while epsilon is just an input."
          ],
          "tex": "z = \\mu_\\phi(x) + \\sigma_\\phi(x) \\odot \\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, I) \\;\\Longrightarrow\\; \\nabla_\\phi \\mathbb{E}_{q}\\big[f(z)\\big] = \\mathbb{E}_{\\epsilon}\\big[\\nabla_\\phi f(z(\\phi,\\epsilon))\\big]",
          "texNote": "This is a pathwise gradient estimator, and its variance is dramatically lower than the score-function (REINFORCE) alternative - which is why VAEs train stably and discrete-latent models, where the trick does not apply, need Gumbel-Softmax or straight-through estimators instead."
        },
        {
          "h": "The closed-form KL for Gaussians",
          "paras": [
            "With a diagonal Gaussian posterior and a standard normal prior, the KL term has an exact expression, so no sampling is needed for that half of the loss."
          ],
          "tex": "\\mathrm{KL}\\big(\\mathcal{N}(\\mu,\\sigma^2)\\,\\|\\,\\mathcal{N}(0,I)\\big) = \\tfrac{1}{2}\\sum_{j=1}^{d}\\big(\\mu_j^2 + \\sigma_j^2 - \\log \\sigma_j^2 - 1\\big)",
          "texNote": "Note the per-dimension structure: a dimension with mu=0 and sigma=1 contributes ZERO. That is exactly what posterior collapse looks like numerically - individual latent dimensions going inactive, which is why per-dimension KL is the diagnostic to plot rather than the total."
        },
        {
          "h": "Rate-distortion: what beta actually controls",
          "paras": [
            "Reading the two terms as RATE (bits sent through the latent) and DISTORTION (reconstruction error) explains why the ELBO alone does not determine the solution - many (rate, distortion) pairs achieve the same ELBO, and beta selects among them."
          ],
          "tex": "\\mathcal{L}_\\beta = \\underbrace{\\mathbb{E}_q[-\\log p(x|z)]}_{D \\;\\text{(distortion)}} + \\beta \\underbrace{\\mathrm{KL}(q\\|p)}_{R \\;\\text{(rate)}}, \\qquad \\beta = 1 \\text{ recovers the ELBO}",
          "texNote": "Alemi et al.'s point: at beta = 1 the objective is indifferent along a whole rate-distortion curve, so 'the ELBO' does not pin down whether you get a useful latent or a collapsed one. beta > 1 buys disentanglement-ish structure at the cost of reconstruction; beta < 1 the reverse."
        }
      ],
      "code": [
        {
          "h": "The whole model, and the diagnostic that matters",
          "paras": [
            "The implementation is short. The part worth writing down carefully is the PER-DIMENSION KL, because the aggregate loss hides the failure mode you most need to see."
          ],
          "code": "import torch, torch.nn.functional as F\n\ndef vae_loss(x, x_hat, mu, logvar, beta=1.0):\n    # distortion: use sum-over-pixels, NOT mean - the relative weighting of the\n    # two terms depends on it, and a mean here silently makes beta ~1/D\n    recon = F.binary_cross_entropy(x_hat, x, reduction=\"sum\") / x.size(0)\n    kl_per_dim = 0.5 * (mu.pow(2) + logvar.exp() - logvar - 1)   # (B, d)\n    kl = kl_per_dim.sum(1).mean()\n    return recon + beta * kl, recon, kl, kl_per_dim.mean(0)      # keep per-dim\n\n# forward\nmu, logvar = encoder(x)\nz = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)          # reparameterize\nloss, recon, kl, kl_dims = vae_loss(x, decoder(z), mu, logvar)\n\n# THE DIAGNOSTIC: how many latent dimensions are actually carrying information?\nactive = (kl_dims > 0.01).sum().item()\nprint(f\"active dims: {active}/{LATENT_D}   KL={kl:.2f}  recon={recon:.2f}\")\n#\n#   active dims: 16/16   KL=28.4   <- healthy\n#   active dims:  3/16   KL= 4.1   <- partial collapse; 13 dims are decorative\n#   active dims:  0/16   KL= 0.0   <- FULL posterior collapse: the decoder is\n#                                     an unconditional model and the encoder\n#                                     is doing nothing at all\n#\n# Total KL near zero with acceptable reconstruction is the signature. It looks\n# like a well-optimized loss and it means the latent variable is unused.",
          "caption": "Per-dimension KL is the diagnostic. A dimension with mu=0 and sigma=1 contributes exactly zero KL and carries exactly zero information, and the aggregate loss will not tell you how many have gone inactive."
        },
        {
          "h": "Why the samples are blurry - it is the likelihood",
          "paras": [
            "The most common misdiagnosis in this area. The experiment that settles it takes ten minutes and rules out the architecture entirely."
          ],
          "code": "# Reconstructions are blurry, samples more so. Which term is responsible?\n#\n# CONTROL 1 - remove the KL entirely (beta = 0). This is now a plain\n# autoencoder with the same architecture and the same output likelihood.\n#   -> reconstructions are SHARPER but still soft. So the KL is not the\n#      whole story; some of the blur was already there.\n#\n# CONTROL 2 - keep beta = 1 but change the output distribution.\n#   Gaussian / MSE ................... blurry\n#   discretized logistic mixture ..... noticeably sharper\n#   + perceptual (LPIPS) loss ........ sharp\n#   + patch discriminator ............ sharp, realistic texture\n#   autoregressive decoder ........... sharp (and slow, and collapse-prone)\n#\n# The architecture never changed. The blur tracks the LIKELIHOOD, because a\n# fixed-variance Gaussian makes the optimal output the conditional MEAN of all\n# plausible images - and averaging plausible images is what blur IS.\n#\n# TWO CONTRIBUTIONS, separable by these controls:\n#   (a) the output likelihood rewards means over samples  <- the big one\n#   (b) the KL removes information, so the decoder must average over what it\n#       no longer knows                                    <- the smaller one\n#\n# This is why Stable Diffusion's VAE trains with perceptual + adversarial\n# losses and a TINY KL weight: it needs sharp reconstruction, and it does not\n# need the latent to be a good generative prior.",
          "caption": "Two controls separate the causes: beta=0 isolates the KL's contribution, and swapping the output distribution isolates the likelihood's. The likelihood dominates, which is why the fix is a better likelihood rather than a better architecture."
        }
      ],
      "useCases": [
        "The compression stage of latent diffusion: Stable Diffusion's first stage is a VAE with a deliberately tiny KL weight, perceptual and adversarial losses, and no ambition to be a generative prior - the most commercially significant VAE deployment by far.",
        "Anomaly detection and density estimation where a likelihood BOUND is useful and calibration matters more than sample beauty - a VAE gives a per-example score that a GAN cannot.",
        "Structured latent spaces for scientific data: molecular design, single-cell genomics, and physical simulation, where continuous interpolation and gradient-based optimization in the latent space are the actual objective and blur in the decoder is irrelevant.",
        "Semi-supervised learning and representation learning where the encoder is the product, and where the probabilistic framing supports downstream Bayesian treatment."
      ],
      "pitfalls": [
        "Attributing blur to the architecture. It is the output LIKELIHOOD: a fixed-variance Gaussian makes the optimal prediction the conditional mean, and the mean of several plausible images is a blur. Fix it with a perceptual loss, an adversarial term, or a multimodal likelihood - not with more layers.",
        "Missing posterior collapse because you only watch the total loss. A strong decoder can model the data alone, the KL drives q(z|x) to the prior, and the latent carries nothing. Plot PER-DIMENSION KL and count active dimensions; near-zero total KL with acceptable reconstruction is the signature.",
        "Using `reduction='mean'` on the reconstruction term. It rescales the loss by the number of pixels, silently making the effective beta about 1/D and usually causing collapse. Sum over pixels, average over the batch.",
        "Reporting the ELBO as a likelihood. It is a LOWER BOUND whose tightness depends on how good your approximate posterior is, so ELBO comparisons against exact-likelihood models (flows, autoregressive) are comparing different quantities. Use importance-weighted bounds if you need a tighter number.",
        "Expecting individual latent dimensions to be meaningful. Locatello et al. proved that unsupervised disentanglement is IMPOSSIBLE without inductive biases, and their large-scale study found that random seed variation dominated the difference between methods.",
        "Treating beta as a nuisance hyperparameter. It selects a point on the rate-distortion curve, and at beta=1 the objective is indifferent along that whole curve - so beta is choosing what kind of model you get, not just tuning it.",
        "Sampling from the aggregate posterior's mean rather than the prior when evaluating. If your samples look good only when you decode encoded real data, you have not tested generation at all."
      ],
      "connections": [
        {
          "ref": "generative/autoencoders",
          "text": "The VAE is the autoencoder plus exactly one term - a KL pulling the code distribution toward a samplable prior - and every difference in behaviour traces back to it."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "The ELBO is standard variational inference; the VAE's contribution was amortizing the posterior with a network and making it differentiable via reparameterization."
        },
        {
          "ref": "generative/latent-diffusion",
          "text": "Latent diffusion uses a VAE with the KL weight turned almost off - it wants compression, not a prior, which is the clearest statement that those are separate jobs."
        },
        {
          "ref": "generative/gan",
          "text": "The GAN sits at the opposite corner of the trilemma: excellent samples, fast sampling, no likelihood, and mode coverage as its characteristic failure."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "A VAE gives a per-example likelihood bound, which is what makes it usable for anomaly scoring - subject to the complexity confound that afflicts all likelihood-based detection."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a VAE add to an autoencoder?",
          "a": "A stochastic encoder outputting a distribution, plus a KL term pulling that distribution toward a prior. Together they make the latent space samplable, which the autoencoder objective never constrained."
        },
        {
          "q": "What is the ELBO?",
          "a": "Expected log-likelihood of the reconstruction minus KL(q(z|x) || p(z)). It is a LOWER BOUND on log p(x); the gap is KL(q || true posterior)."
        },
        {
          "q": "Why is the ELBO a bound and not the likelihood?",
          "a": "log p(x) = ELBO + KL(q || true posterior), and that last KL is non-negative and uncomputable. The bound is tight only when the approximate posterior is exact."
        },
        {
          "q": "What is the reparameterization trick?",
          "a": "Write z = mu + sigma * epsilon with epsilon ~ N(0,I), moving the randomness out of the computation graph so gradients flow through mu and sigma."
        },
        {
          "q": "Why not use REINFORCE instead?",
          "a": "The score-function estimator is unbiased but has far higher variance. The pathwise gradient from reparameterization is what makes VAE training stable."
        },
        {
          "q": "What is posterior collapse?",
          "a": "The KL drives q(z|x) to the prior so the latent carries no information, and the decoder models the data unconditionally. Signature: total KL near zero with acceptable reconstruction."
        },
        {
          "q": "How do you detect it?",
          "a": "Plot PER-DIMENSION KL and count dimensions above a small threshold. A dimension with mu=0, sigma=1 contributes exactly zero KL and exactly zero information."
        },
        {
          "q": "How do you prevent it?",
          "a": "KL annealing (warm up beta from 0), FREE BITS (no penalty until a dimension's KL exceeds a floor), weakening the decoder, or dropping the decoder's access to context."
        },
        {
          "q": "Why are VAE samples blurry?",
          "a": "The Gaussian output likelihood makes the optimal reconstruction the conditional MEAN, and the average of several plausible images is a blur. It is the likelihood, not the architecture."
        },
        {
          "q": "What is beta-VAE?",
          "a": "Weight the KL term by beta. beta > 1 pushes toward a more factorized, lower-rate latent (marketed as disentanglement) at the cost of reconstruction; beta < 1 the reverse."
        },
        {
          "q": "What did Locatello et al. show about disentanglement?",
          "a": "Unsupervised disentanglement is IMPOSSIBLE without inductive biases (a theorem), and empirically random-seed variation dominated the differences between published methods."
        },
        {
          "q": "Where does the VAE sit in the generative trilemma?",
          "a": "Fast sampling and good mode coverage, poor sample quality. GANs take quality and speed but lose coverage and likelihood; diffusion takes quality and coverage but is slow."
        }
      ],
      "standard": [
        {
          "q": "Derive the ELBO and explain what each term does.",
          "a": "THE GOAL. We want to maximize the marginal likelihood log p(x) = log integral p(x|z)p(z) dz. That integral is intractable for any interesting decoder, so we cannot optimize it directly. THE DERIVATION, and I prefer the exact-decomposition route over Jensen's inequality because it shows what the gap IS rather than just that one exists. Introduce any distribution q(z|x). Then: log p(x) = E_q[log p(x)] since log p(x) does not depend on z. Write p(x) = p(x,z)/p(z|x), so log p(x) = E_q[log p(x,z) - log p(z|x)]. Insert q: = E_q[log p(x,z) - log q(z|x)] + E_q[log q(z|x) - log p(z|x)]. The second bracket is exactly KL(q(z|x) || p(z|x)). So log p(x) = ELBO + KL(q || true posterior), and since KL >= 0, the ELBO is a lower bound. Expanding the first bracket with p(x,z) = p(x|z)p(z) gives the familiar form: ELBO = E_q[log p(x|z)] - KL(q(z|x) || p(z)). WHAT EACH TERM DOES. The RECONSTRUCTION term E_q[log p(x|z)] asks that z retain enough information to rebuild x. Alone, it recovers a plain autoencoder with a noisy encoder. The KL(q(z|x) || p(z)) term is a REGULARIZER pulling each per-example posterior toward the prior, and it does two jobs that are worth separating: it makes the aggregate distribution of codes resemble something you can sample from, and it LIMITS THE INFORMATION each code can carry - which is why the rate-distortion reading is illuminating. WHAT MAXIMIZING THE ELBO ACHIEVES. Two things simultaneously, which is the elegant part. Since log p(x) is fixed with respect to phi, increasing the ELBO by varying phi must DECREASE KL(q || true posterior) - so the encoder is being pushed toward the true posterior. And varying theta increases the bound on the likelihood. One objective, both inference and learning. THE TENSION, which is where all the practical difficulty lives. The two terms pull against each other: reconstruction wants informative, well-separated codes; the KL wants every posterior to look like the prior. At one extreme (KL dominant) you get posterior collapse and an unconditional decoder; at the other (reconstruction dominant) you get an autoencoder with holes. The ELBO's beta=1 setting is one point on that curve, and Alemi et al.'s observation is sharper than it first sounds: MANY different (rate, distortion) pairs achieve the SAME ELBO value, so the objective is genuinely indifferent between a model with a rich latent and one with a collapsed latent that compensates with a strong decoder. The ELBO does not specify the model you want. THE PRACTICAL CONSEQUENCES I would state. (1) The ELBO is a bound of UNKNOWN tightness, so comparing a VAE's ELBO against a normalizing flow's exact likelihood is comparing different quantities; use importance-weighted bounds (IWAE) if you need a tighter estimate. (2) The relative scaling of the terms depends on your reduction - summing reconstruction over pixels versus averaging changes the effective beta by a factor of D, and this is a real and common bug. (3) Because the objective does not pin down the rate, you should MONITOR the rate (KL) and distortion (reconstruction) separately rather than only the total, and decide which point on the curve you want.",
          "deepDive": {
            "q": "How do you actually estimate a VAE's log-likelihood, and how tight is the ELBO?",
            "a": "WHY THIS IS A REAL QUESTION. Papers report 'negative log-likelihood' for VAEs and compare it against normalizing flows and autoregressive models, which compute the likelihood EXACTLY. But a VAE's ELBO is a lower bound, so a VAE reporting 80 nats might have a true likelihood of 78 or of 60 - and you cannot tell from the number. Any comparison that ignores this is not measuring what it claims. THE IMPORTANCE-WEIGHTED BOUND (IWAE, Burda et al. 2016). Draw k samples from q(z|x) and average the importance weights INSIDE the log rather than outside: L_k = E[log (1/k) sum_i p(x,z_i)/q(z_i|x)]. Three properties make this the standard tool. (1) L_1 is exactly the ELBO. (2) L_k is monotonically non-decreasing in k - more samples give a TIGHTER bound. (3) As k goes to infinity, L_k converges to the true log p(x). So k is a dial trading compute for tightness, and evaluating with k = 1000 or 5000 gives a number close enough to the truth to be worth reporting. The estimator is just log-sum-exp over the per-sample log weights minus log k, which is a few lines. THE SUBTLETY THAT MAKES IWAE INTERESTING BEYOND EVALUATION: if you also TRAIN with L_k, you get a better generative model but, counter-intuitively, a WORSE inference network. Rainforth et al. showed the signal-to-noise ratio of the encoder's gradient DEGRADES as k grows - the tighter bound leaves less gradient signal for q, since the importance weighting can compensate for a poor posterior. So a tighter bound is not uniformly better, which is a genuinely surprising result and the kind of thing worth knowing. Fixes exist (doubly-reparameterized gradients, DReG) that recover the encoder's signal. HOW TIGHT IS THE ELBO IN PRACTICE? The gap is KL(q || true posterior), and it is typically substantial - on image benchmarks the difference between the ELBO and a high-k IWAE bound is often several nats per image, which is large relative to the differences papers report between methods. The gap is also not constant: it depends on the model, the data point, and how expressive q is, so it can differ systematically between in-distribution and out-of-distribution inputs. That last point is why ELBO-based anomaly detection is shakier than it looks. OTHER ESTIMATORS worth knowing. ANNEALED IMPORTANCE SAMPLING (AIS) gives a much more accurate estimate by bridging between the prior and the posterior through a sequence of intermediate distributions - it is the gold standard for evaluating decoder-based models and it is expensive. Wu et al. used AIS to evaluate decoder-based models and found reported numbers were often optimistic. Bidirectional Monte Carlo SANDWICHES the true value between a stochastic lower and upper bound, which is the honest way to report it. WHAT THIS MEANS FOR HOW YOU READ RESULTS. (1) A VAE's ELBO and a flow's exact likelihood are not comparable; at minimum use a high-k IWAE bound and say so. (2) State k, because L_1 and L_5000 are different numbers for the same model. (3) Small likelihood differences between VAE variants may be differences in POSTERIOR QUALITY rather than in the generative model - the encoder is being evaluated along with the decoder. (4) And the deeper caution from Theis et al.: log-likelihood and sample quality are only loosely coupled in high dimensions, so even a perfectly measured likelihood does not tell you the samples are good. Report both, and know that they answer different questions."
          }
        },
        {
          "q": "Your VAE trains to a low loss but the latent is unused. Diagnose and fix it.",
          "a": "THIS IS POSTERIOR COLLAPSE and it is the VAE's signature failure. CONFIRMING IT. Plot the two loss terms separately. The signature is total KL near zero - or falling toward zero during training - with a reconstruction term that is acceptable. Then plot PER-DIMENSION KL and count how many dimensions exceed a small threshold like 0.01 nats. Common patterns: 16/16 active is healthy; 3/16 is partial collapse where thirteen dimensions are decorative; 0/16 is complete collapse. A second confirmation: replace z with random noise at inference and see whether the outputs change. If reconstructions are unaffected, the decoder is ignoring the latent entirely. WHY IT HAPPENS. The KL term is minimized exactly when q(z|x) = p(z) for every x - that is, when the encoder outputs the prior regardless of input, contributing zero KL and zero information. If the decoder is powerful enough to model p(x) on its own, this is a genuinely good solution to the objective: KL is zero and reconstruction is as good as an unconditional model can manage. It is not an optimization failure; it is the optimizer finding a valid optimum you did not want. Two things make it worse: a STRONG DECODER (autoregressive decoders collapse almost by default, which is why text VAEs are notoriously hard), and the fact that early in training the latent is uninformative anyway, so the KL gradient pushes toward collapse before the encoder has learned anything worth keeping - a self-reinforcing trap. THE FIXES, roughly in order of how much I trust them. (1) KL ANNEALING / WARM-UP: start beta at 0 and ramp to 1 over the first several thousand steps. The model first learns to use the latent (pure autoencoder), then gradually pays for it. Simple, effective, and the standard first move. Cyclical annealing - repeatedly ramping rather than once - works better still on hard cases. (2) FREE BITS: apply NO KL penalty to a dimension until its KL exceeds a floor lambda, i.e. use max(lambda, KL_j) per dimension. This is my preferred fix because it targets the mechanism directly - it makes a small amount of information FREE, so there is no gradient pressure to drive a dimension to exactly zero, while still penalizing excess rate. Introduced with IAF-VAE and widely reused. (3) WEAKEN THE DECODER: reduce its capacity, restrict its receptive field, or apply word/pixel dropout so it cannot rely on its own context and must consult z. Crude but reliable, and the standard fix for text VAEs. (4) SKIP CONNECTIONS from z to every decoder layer, so the latent's influence does not have to survive the whole stack. (5) A MORE EXPRESSIVE POSTERIOR (normalizing flows on q, IAF) reduces the approximation gap and can help, though it does not address the fundamental incentive. (6) DELTA-VAE or explicitly constraining the posterior to keep a minimum distance from the prior. (7) AGGRESSIVE ENCODER TRAINING: run several encoder updates per decoder update early on (He et al.), letting the inference network keep up so the latent becomes useful before the decoder learns to do without it. (8) SWITCH TO DISCRETE LATENTS - VQ-VAE has no KL term at all and therefore no collapse mechanism, which is one of its underrated advantages. WHAT I WOULD ACTUALLY DO: free bits plus a short KL warm-up, and monitor active-dimension count as a first-class training metric alongside the loss. If it still collapses with an autoregressive decoder, I would question whether I need a latent variable at all - a collapsed VAE is an unconditional model with extra steps, and if the unconditional model is good enough, the honest move is to use it. AND THE FRAMING WORTH GIVING: collapse is the model telling you the latent is not EARNING its cost. The KL is a price in nats, and if the decoder can produce the same likelihood without paying it, it will. The fixes all work by either lowering the price (free bits, annealing) or raising the value (weaker decoder, better posterior)."
        },
        {
          "q": "Compare VAEs, GANs, and diffusion models along the axes that matter.",
          "a": "I would organize this around the GENERATIVE TRILEMMA - high sample quality, mode coverage and diversity, fast sampling - because each family takes two and gives up the third, and that framing explains the field's trajectory. VAE: fast sampling (one decoder pass), good mode coverage, POOR sample quality. Coverage is good because the objective is likelihood-based and a likelihood objective is severely punished for assigning near-zero probability to real data - it is mode-covering by construction. Quality is poor because of the output likelihood, as discussed. It also gives you a likelihood BOUND, an encoder for free, and stable training. GAN: fast sampling (one generator pass), EXCELLENT sample quality, poor mode coverage. The adversarial objective only asks that samples fool a discriminator - there is no term requiring that all of the data be covered, so dropping modes is not penalized. It also gives no likelihood at all, no encoder by default, and notoriously unstable training. DIFFUSION: excellent sample quality, good mode coverage, SLOW sampling - originally a thousand sequential network evaluations, now tens with better samplers and single-digit with distillation. Training is stable (it is a regression problem), it provides a likelihood bound, and the sampling cost is the price. THE MECHANISM BEHIND THE COVERAGE DIFFERENCE is worth stating because it is the most transferable idea here. Likelihood-based training minimizes roughly KL(p_data || p_model), which is MODE-COVERING: p_data being large where p_model is near zero incurs enormous cost, so the model spreads mass to cover everything, and blurs when unsure. The GAN's original objective relates to Jensen-Shannon and in practice behaves MODE-SEEKING: putting mass where there is no data is punished, but failing to cover some data is comparatively cheap. Sharp where it commits, blind where it does not. That single asymmetry explains blur versus mode collapse better than any architectural detail. WHAT ELSE MATTERS IN PRACTICE, beyond the trilemma. TRAINING STABILITY: diffusion and VAEs optimize a well-posed single objective; GANs optimize a two-player game with no guarantee of convergence, and much of the GAN literature is stabilization machinery. EVALUATION: VAEs and diffusion give likelihood bounds; GANs give nothing, which is a real practical handicap. CONTROLLABILITY: diffusion is exceptionally steerable because generation is iterative - you can intervene at every step, which is what makes inpainting, guidance, and ControlNet-style conditioning natural. LATENT STRUCTURE: VAEs and GANs have a compact latent to manipulate; diffusion's 'latent' is the same shape as the data, so latent arithmetic is less natural. WHERE THINGS ACTUALLY STAND. Diffusion won image generation because sampling speed was the most FIXABLE of the three constraints - distillation, consistency models, and better ODE solvers took a thousand steps down to a handful, while nobody found a comparable fix for GAN mode collapse or VAE blur. That is the historically interesting part: the trilemma is real, but the corners are not equally defensible, and the family that gave up the most tractable constraint won. VAEs did not disappear - they became the compression stage inside latent diffusion, which is a more important role than they had as generators. And GANs remain competitive where single-step sampling is a hard requirement, and their discriminators live on as perceptual losses inside other systems."
        },
        {
          "q": "What is beta-VAE, and is disentanglement real?",
          "a": "BETA-VAE. Weight the KL term: L = reconstruction + beta * KL. At beta > 1 the model pays more per nat of latent information, so it uses fewer, more independent factors - and the claim (Higgins et al., 2017) was that this yields DISENTANGLED representations where individual latent dimensions correspond to interpretable generative factors like rotation, scale, or colour. The demonstrations were genuinely striking: traverse one dimension of a beta-VAE trained on synthetic faces and the head rotates while everything else stays fixed. WHY IT PLAUSIBLY WORKS. The KL to a factorized standard normal penalizes correlation between latent dimensions, so at higher beta the pressure toward a factorized posterior increases. If the data really was generated by independent factors, and the model is forced to use few dimensions independently, aligning them with those factors is a natural solution. IS IT REAL? Here I would give the honest answer, which is heavily qualified. Locatello et al. (2019) ran the large-scale study - roughly 12,000 models across methods, datasets, and hyperparameters - and reported two things. First, a THEOREM: unsupervised disentanglement is IMPOSSIBLE without inductive biases on models or data. The argument is clean. For any generative model with a factorized latent, there exist infinitely many bijective transformations of the latent that preserve the marginal distribution exactly while completely entangling the factors. Since the data likelihood cannot distinguish them, no purely unsupervised objective can prefer the disentangled one. Any method that appears to work is relying on unstated inductive biases from the architecture, the initialization, or the data. Second, an EMPIRICAL result: across their sweep, random seed variation dominated the differences between methods, disentanglement scores did not correlate reliably with downstream usefulness, and there was no way to select good hyperparameters without access to ground-truth factor labels - which defeats the purpose. WHAT SURVIVES THE CRITIQUE. (1) beta genuinely controls the RATE-DISTORTION trade-off, which is real and useful independent of disentanglement. Higher beta gives a lower-capacity, more factorized latent and worse reconstruction - a knob worth having. (2) On SYNTHETIC datasets built from known independent factors (dSprites, Shapes3D), the effect is reproducible. Those datasets satisfy the assumptions by construction. (3) With even weak supervision - a few labelled factors, or paired observations differing in one factor - disentanglement becomes achievable, and the impossibility theorem does not apply because you have supplied the missing information. (4) The line of work forced the field to be much more careful about what a metric is measuring. WHAT I WOULD SAY IN AN INTERVIEW: beta-VAE is a valuable knob on the rate-distortion curve, mis-sold as a solution to disentanglement. The impossibility result is not a technicality - it says the unsupervised version of the problem is ill-posed, and the demonstrations that convinced people were on datasets constructed to satisfy the assumptions. If you need disentangled or controllable representations today, the practical routes are weak supervision, a known factor structure you can build into the architecture, or - what actually happened in the field - conditioning on TEXT, which supplies the semantic factorization externally rather than hoping it emerges. That last point is worth making: the disentanglement problem was largely bypassed rather than solved."
        },
        {
          "q": "How would you use a VAE for anomaly detection, and what are the traps?",
          "a": "THE APPEAL over a plain autoencoder is that a VAE gives a probabilistic score - a likelihood bound - rather than only a reconstruction error, which sounds like the principled quantity to threshold. THE SCORING OPTIONS, and they behave differently. (1) RECONSTRUCTION PROBABILITY: sample z several times from q(z|x) and average log p(x|z). Closer to the autoencoder approach but with uncertainty accounted for. (2) THE ELBO itself as a log-likelihood proxy. (3) An IMPORTANCE-WEIGHTED bound (IWAE) for a tighter estimate, at k times the cost. (4) The KL term ALONE, which measures how unusual the required posterior is - sometimes more discriminative than reconstruction, and worth trying because it is free. THE TRAPS, and these are the substance. (1) THE COMPLEXITY CONFOUND, which is the big one. Nalisnick et al. showed deep generative models trained on CIFAR-10 assign HIGHER likelihood to SVHN images than to CIFAR-10 itself. The cause is that likelihood tracks COMPLEXITY: simple, smooth, low-entropy inputs get high likelihood under almost any model, familiar or not. So a likelihood threshold can systematically flag the wrong things, and this is not a tuning issue - it is structural. The fixes are ratio-based: the LIKELIHOOD RATIO against a background model trained on perturbed or generic data (Ren et al.), or comparing against a general-purpose COMPRESSOR's bitrate on the same input (Serra et al.'s input-complexity correction). Both work by cancelling the complexity term. If you deploy likelihood-based anomaly detection without one of these, expect the failure. (2) THE ELBO IS A BOUND OF UNKNOWN TIGHTNESS, and the gap can differ systematically between in-distribution and out-of-distribution inputs - so what looks like a likelihood difference may be a posterior-approximation difference. (3) PIXEL-SPACE LIKELIHOODS are dominated by high-frequency detail, so a semantically anomalous image with normal texture statistics scores fine. Scoring in a feature space usually works better. (4) POSTERIOR COLLAPSE destroys the method silently: if the latent is unused, the ELBO is essentially an unconditional model's likelihood and carries no per-example information about the latent structure. Check active dimensions before trusting any of this. (5) A VAE trained on normal data can still assign reasonable likelihood to anomalies simply because it generalizes. WHAT I WOULD ACTUALLY BUILD. Start with the simplest thing that could work and measure it: reconstruction error in FEATURE space, with a complexity correction, evaluated against real anomalies from the domain. Add the likelihood-ratio background model if the complexity confound shows up in the error analysis - and check for it explicitly by plotting the score against a compressed-size proxy, which reveals it immediately. Then compare against the methods that actually top the anomaly-detection benchmarks, because being honest here matters: memory-bank methods on pretrained features (PatchCore) and normalizing-flow density estimation on pretrained features generally outperform VAE-based scoring on standard benchmarks, and they need no generative training. I would reach for a VAE when I need a genuine density model - for calibrated scores, for a principled combination with other evidence, or because the domain is not one where ImageNet-pretrained features transfer. THE EVALUATION DISCIPLINE, which decides the project: collect real anomalies even if there are few, report a precision-recall curve rather than a threshold, split by batch and time rather than randomly, and check whether the score correlates with input complexity before believing anything it tells you."
        },
        {
          "q": "Why does the reparameterization trick matter, and what do you do when it does not apply?",
          "a": "THE PROBLEM. The ELBO contains an expectation over q(z|x), and we need its gradient with respect to phi, the parameters OF that distribution. You cannot backpropagate through a sampling operation - `z = sample(q_phi)` has no derivative with respect to phi in the usual sense, because the randomness and the parameters are entangled in the sampler. THE TRICK. Re-express the sample as a deterministic function of the parameters and an independent noise source: z = mu_phi(x) + sigma_phi(x) * epsilon with epsilon ~ N(0, I). Now epsilon is just an input to the graph, the path from phi to z is differentiable, and the gradient of the expectation becomes the expectation of the gradient. Single-sample Monte Carlo is usually enough. WHY IT MATTERS SO MUCH - it is about VARIANCE, not merely about possibility. The alternative, the SCORE-FUNCTION estimator (REINFORCE / likelihood-ratio), also works: grad E_q[f(z)] = E_q[f(z) grad log q(z)]. It is unbiased and it requires nothing of f - f need not even be differentiable. But its variance is enormous, because it uses only the SCALAR value of f and none of its gradient information, so it learns nothing about which direction in z-space would improve things. The pathwise estimator uses grad f directly, which is far more informative per sample. In practice the difference is between a VAE that trains in an hour and one that does not train at all. This is why the 2013 VAE papers were a breakthrough despite the ELBO being decades old - the objective existed, a usable gradient estimator did not. WHEN IT DOES NOT APPLY. The trick needs a differentiable path from the distribution's parameters to the sample. That fails for DISCRETE latent variables - a categorical sample is a step function of its logits, with zero gradient almost everywhere - and it needs adaptation for distributions with no simple location-scale form. WHAT TO DO INSTEAD, in order of practicality. (1) GUMBEL-SOFTMAX / CONCRETE relaxation: sample a continuous relaxation of a categorical using Gumbel noise and a temperature, which IS reparameterizable, then anneal the temperature toward discreteness. Biased but low variance, and the standard first choice. (2) STRAIGHT-THROUGH: take the hard discrete sample in the forward pass but pass the relaxation's gradient backward. Biased and it works remarkably well - it is what VQ-VAE uses. (3) REINFORCE WITH VARIANCE REDUCTION: baselines, control variates, and Rao-Blackwellization (NVIL, VIMCO, RELAX). Unbiased, and requires care to be usable. (4) For continuous non-Gaussian distributions: IMPLICIT reparameterization (differentiating through the CDF) covers gamma, beta, Dirichlet and others, and is available in modern frameworks. (5) Sometimes you can MARGINALIZE the discrete variable exactly if its support is small, which removes the problem. THE WIDER LESSON, since this pattern recurs far beyond VAEs. Whenever you need to optimize through a stochastic or discrete decision - hard attention, reinforcement learning actions, neural architecture search, sampling-based routing in mixture-of-experts - you face this same choice: a low-variance biased relaxation, or an unbiased high-variance score-function estimator. The field's general finding is that biased-but-low-variance usually wins in practice, which is worth knowing as a prior when you meet the problem in a new setting."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The ELBO",
        "back": "E_q[log p(x|z)] - KL(q(z|x) || p(z)). Exact decomposition: log p(x) = ELBO + KL(q || TRUE posterior), so it is a LOWER BOUND whose gap is the posterior approximation error."
      },
      {
        "type": "definition",
        "front": "Reparameterization trick",
        "back": "z = mu + sigma * epsilon, epsilon ~ N(0,I). Moves randomness out of the graph so gradients flow through mu and sigma. Matters because of VARIANCE - the score-function alternative is unbiased but far too noisy to train with."
      },
      {
        "type": "pitfall",
        "front": "Posterior collapse",
        "back": "KL drives q(z|x) to the prior; the latent carries nothing and the decoder is unconditional. Signature: total KL ~ 0 with acceptable reconstruction. It is a VALID optimum, not an optimization failure."
      },
      {
        "type": "intuition",
        "front": "Detecting collapse",
        "back": "Plot PER-DIMENSION KL and count dims > ~0.01 nats - a dim with mu=0, sigma=1 contributes exactly zero. Also: replace z with noise at inference; if reconstructions are unchanged, the decoder ignores the latent."
      },
      {
        "type": "definition",
        "front": "Free bits",
        "back": "Apply no KL penalty until a dimension's KL exceeds a floor: max(lambda, KL_j). Makes a little information FREE so there is no gradient pressure to zero a dimension out. The most targeted collapse fix."
      },
      {
        "type": "pitfall",
        "front": "Why VAE samples blur",
        "back": "The Gaussian output likelihood makes the optimal reconstruction the conditional MEAN, and averaging plausible images IS blur. Architecture-independent - confirm by swapping the likelihood (logistic mixture, LPIPS, patch discriminator) at fixed architecture."
      },
      {
        "type": "pitfall",
        "front": "reduction='mean' on the reconstruction term",
        "back": "Divides by the pixel count, silently making the effective beta ~1/D and usually causing collapse. SUM over pixels, MEAN over the batch."
      },
      {
        "type": "intuition",
        "front": "Rate-distortion reading",
        "back": "L = D + beta*R with R = KL (bits through the latent), D = reconstruction. At beta=1 MANY (R,D) pairs give the SAME ELBO - so the objective does not pin down whether you get a rich latent or a collapsed one. Monitor R and D separately."
      },
      {
        "type": "pitfall",
        "front": "Is disentanglement real?",
        "back": "Locatello et al.: unsupervised disentanglement is IMPOSSIBLE without inductive biases (any measure-preserving bijection of the latent entangles factors at identical likelihood), and empirically random SEED dominated method choice."
      },
      {
        "type": "intuition",
        "front": "Mode-covering vs mode-seeking",
        "back": "Likelihood training ~ KL(p_data || p_model): catastrophic to put ~0 mass on real data, so it COVERS and blurs. GANs behave mode-SEEKING: putting mass off-data is punished, missing modes is cheap. One asymmetry explains blur vs mode collapse."
      },
      {
        "type": "pitfall",
        "front": "ELBO is not a likelihood",
        "back": "It is a bound of UNKNOWN tightness, so comparing it against a flow's or an autoregressive model's exact likelihood compares different quantities. Use IWAE for a tighter estimate at k times the cost."
      },
      {
        "type": "intuition",
        "front": "When reparameterization fails",
        "back": "Discrete latents have zero gradient a.e. Options: Gumbel-Softmax (biased, low variance), straight-through (what VQ-VAE uses), REINFORCE + control variates (unbiased, high variance), or exact marginalization if the support is small."
      }
    ],
    "refs": [
      {
        "title": "Kingma & Welling (2013), Auto-Encoding Variational Bayes",
        "url": "https://arxiv.org/abs/1312.6114"
      },
      {
        "title": "Higgins et al. (2017), beta-VAE: Learning Basic Visual Concepts with a Constrained Variational Framework",
        "url": "https://openreview.net/forum?id=Sy2fzU9gl"
      },
      {
        "title": "Alemi et al. (2018), Fixing a Broken ELBO",
        "url": "https://arxiv.org/abs/1711.00464"
      },
      {
        "title": "Locatello et al. (2019), Challenging Common Assumptions in the Unsupervised Learning of Disentangled Representations",
        "url": "https://arxiv.org/abs/1811.12359"
      },
      {
        "title": "Kingma et al. (2016), Improving Variational Inference with Inverse Autoregressive Flow (free bits)",
        "url": "https://arxiv.org/abs/1606.04934"
      }
    ],
    "demos": [
      "vae",
      "variational-inference",
      "embeddings",
      "kernel-density"
    ]
  },
  "gan": {
    "level": "core",
    "body": {
      "intuition": [
        "Every model so far has needed an explicit likelihood - some formula for how probable a given image is - and paid for it. The GAN's idea is to skip the likelihood entirely. Train a GENERATOR to turn noise into images, train a DISCRIMINATOR to tell real from generated, and let them compete. The generator never computes p(x); it only ever receives the signal 'the discriminator could tell'. That is enough to produce astonishingly sharp samples, and it is why GANs dominated image generation for six years.",
        "Sharpness comes from what the objective does NOT ask for. A likelihood-based model is severely punished for assigning near-zero probability to real data, so it spreads mass to cover everything and hedges when uncertain - which is what blur is. The adversarial objective asks only that samples be indistinguishable from real ones. Producing a hedge, an average, a blur, is immediately detectable and therefore punished. But nothing in the objective requires covering ALL the data, so a generator that produces three perfect kinds of image and ignores the other seven pays no price. That is MODE COLLAPSE, and it is not a bug in the implementation - it is the objective's blind spot.",
        "The second thing to internalize is that there is NO LOSS TO WATCH. In ordinary training a falling loss means progress. Here the two losses are adversarial: if the generator improves, the discriminator's loss rises, and vice versa, so both curves hovering around a constant is what SUCCESS looks like - and it is also what total failure looks like. You cannot tell them apart from the curves. This is why GAN practice is dominated by stabilization machinery and by sample-based metrics like FID, and it is the deepest practical difference between adversarial and likelihood-based training. It is also worth knowing the most sobering result in the area: Lucic et al. gave many published GAN variants equal hyperparameter search budgets and found that none consistently beat the ORIGINAL formulation - most of the reported progress was search budget, not method."
      ],
      "math": [
        {
          "h": "The minimax game and what it optimizes",
          "paras": [
            "The discriminator maximizes its ability to separate real from fake; the generator minimizes it. At the optimal discriminator, the generator's objective becomes a divergence between the data and model distributions - which is where the theory both illuminates and misleads."
          ],
          "tex": "\\min_G \\max_D \\; \\mathbb{E}_{x\\sim p_{\\mathrm{data}}}\\!\\big[\\log D(x)\\big] + \\mathbb{E}_{z\\sim p_z}\\!\\big[\\log(1 - D(G(z)))\\big], \\qquad D^*(x) = \\frac{p_{\\mathrm{data}}(x)}{p_{\\mathrm{data}}(x)+p_g(x)}",
          "texNote": "Substituting D* gives 2*JSD(p_data || p_g) - log 4, so the global optimum is p_g = p_data. The catch: this assumes an OPTIMAL discriminator and unlimited capacity, and real training never has either - so the theory describes a game nobody plays."
        },
        {
          "h": "Why the original generator loss vanishes, and the non-saturating fix",
          "paras": [
            "Early in training the discriminator wins easily, D(G(z)) is near zero, and log(1 - D(G(z))) is flat there - so the generator gets almost no gradient exactly when it most needs one. The standard fix flips the objective to something with a strong gradient in that region."
          ],
          "tex": "\\text{saturating: } \\min_G \\mathbb{E}\\big[\\log(1 - D(G(z)))\\big] \\quad\\longrightarrow\\quad \\text{non-saturating: } \\max_G \\mathbb{E}\\big[\\log D(G(z))\\big]",
          "texNote": "Same fixed point, completely different gradients. Essentially every implementation uses the non-saturating form, and it was proposed in the ORIGINAL paper - the minimax form is what the theory analyzes, not what anyone runs. Knowing that distinction is a common interview discriminator."
        },
        {
          "h": "Wasserstein distance: why it gives gradients when JS does not",
          "paras": [
            "If the data lies on a low-dimensional manifold and the generated distribution lies on another, the two supports are almost surely disjoint - and JS divergence is CONSTANT at log 2 for disjoint supports, so its gradient is zero. Wasserstein distance instead measures how far mass must be MOVED, which varies smoothly even for disjoint supports."
          ],
          "tex": "W(p_r, p_g) = \\inf_{\\gamma \\in \\Pi(p_r,p_g)} \\mathbb{E}_{(x,y)\\sim\\gamma}\\big[\\lVert x-y\\rVert\\big] = \\sup_{\\lVert f\\rVert_L \\le 1} \\mathbb{E}_{p_r}[f(x)] - \\mathbb{E}_{p_g}[f(x)]",
          "texNote": "The right-hand form (Kantorovich-Rubinstein duality) is what you implement: a CRITIC f constrained to be 1-Lipschitz, outputting an unbounded score rather than a probability. The critic's loss is then an estimate of W, which is the closest thing GANs have to a meaningful progress metric."
        },
        {
          "h": "Enforcing the Lipschitz constraint: gradient penalty",
          "paras": [
            "WGAN originally clipped weights to a box, which crudely bounds the Lipschitz constant and badly distorts the critic. WGAN-GP instead penalizes the gradient norm at points interpolated between real and fake samples, using the fact that an optimal 1-Lipschitz critic has unit gradient norm almost everywhere along those lines."
          ],
          "tex": "\\mathcal{L}_D = \\mathbb{E}_{p_g}[D(\\tilde{x})] - \\mathbb{E}_{p_r}[D(x)] + \\lambda\\,\\mathbb{E}_{\\hat{x}}\\Big[\\big(\\lVert\\nabla_{\\hat{x}} D(\\hat{x})\\rVert_2 - 1\\big)^2\\Big], \\quad \\hat{x} = \\epsilon x + (1-\\epsilon)\\tilde{x}",
          "texNote": "lambda = 10 is the standard value. Two implementation traps: the penalty is on points BETWEEN real and fake (not on either alone), and batch normalization in the critic breaks the per-sample gradient assumption - use layer norm or instance norm instead."
        }
      ],
      "code": [
        {
          "h": "The training loop, with the details that decide whether it works",
          "paras": [
            "The loop is short; the annotations are the lesson. Nearly every failed GAN reimplementation is one of these details."
          ],
          "code": "import torch\n\nfor real in loader:\n    # ---- CRITIC: n_critic steps per generator step (WGAN-GP uses 5) ----\n    for _ in range(N_CRITIC):\n        z = torch.randn(B, Z_DIM, device=dev)\n        fake = G(z).detach()                  # DETACH - do not build G's graph\n        d_real, d_fake = D(real), D(fake)\n\n        gp = gradient_penalty(D, real, fake)  # on INTERPOLATED points\n        d_loss = d_fake.mean() - d_real.mean() + 10.0 * gp\n        opt_D.zero_grad(); d_loss.backward(); opt_D.step()\n\n    # ---- GENERATOR: one step ----\n    z = torch.randn(B, Z_DIM, device=dev)\n    g_loss = -D(G(z)).mean()                  # NOT detached: gradient flows to G\n    opt_G.zero_grad(); g_loss.backward(); opt_G.step()\n\n# THE DETAILS THAT MATTER, each a common failure:\n#  * .detach() on the critic step, or you update G with D's gradients.\n#  * NO batch norm in a WGAN-GP critic - the penalty assumes each sample's\n#    gradient is independent, and BN couples them. Use LayerNorm/InstanceNorm.\n#  * Adam betas (0.0, 0.9) or (0.5, 0.999), NOT the default (0.9, 0.999).\n#    High momentum interacts badly with a moving adversarial objective.\n#  * TWO-TIMESCALE (TTUR): a higher LR for D than G (e.g. 4e-4 vs 1e-4) is a\n#    reliable, nearly free stabilizer.\n#  * The generator's LAST layer is tanh, so scale real data to [-1, 1].\n#  * Track an EMA of G's weights and sample from THAT - typically worth\n#    several FID points and almost never mentioned in tutorials.",
          "caption": "Detach, no batch norm in a gradient-penalty critic, non-default Adam betas, two-timescale learning rates, and an EMA of the generator. None is exotic; together they are most of the difference between a GAN that trains and one that does not."
        },
        {
          "h": "You cannot read the loss curves - what to watch instead",
          "paras": [
            "The single most disorienting thing about GAN training, and the practical response to it."
          ],
          "code": "# WHAT THE CURVES LOOK LIKE:\n#   healthy training ......... d_loss ~ flat, g_loss ~ flat\n#   total failure ............ d_loss ~ flat, g_loss ~ flat\n# Adversarial losses are relative. Neither going down is progress, and both\n# hovering is what equilibrium AND collapse both look like.\n#\n# WHAT TO WATCH INSTEAD:\n#\n# 1. FID on a fixed sample, every N steps. The primary signal. Use the SAME\n#    number of samples every time (FID is biased downward with more samples,\n#    so 10k and 50k are not comparable).\n#\n# 2. THE WASSERSTEIN ESTIMATE (WGAN only): d_real.mean() - d_fake.mean()\n#    correlates with sample quality and DOES trend down. This was WGAN's most\n#    useful practical contribution and is often undersold relative to the\n#    theory.\n#\n# 3. A FIXED z GRID, rendered every N steps into a contact sheet. Cheap, and\n#    it makes mode collapse visible immediately - many z values mapping to\n#    near-identical images.\n#\n# 4. DISCRIMINATOR ACCURACY on held-out real vs fake:\n#      ~50%  -> D cannot tell: either equilibrium or D has collapsed\n#      ~100% -> D has won: G's gradient is vanishing, lower D's LR or capacity\n#      ~75%  -> a healthy working range\n#\n# 5. GRADIENT NORMS into G. If they collapse toward zero, G has stopped\n#    learning regardless of what the loss says.\n#\n# THE FAILURE SIGNATURES:\n#   mode collapse ....... FID plateaus high; the z grid shows repeats\n#   D too strong ........ D accuracy ~100%, G gradients -> 0\n#   D too weak .......... samples degrade while g_loss looks great\n#   oscillation ......... FID cycles up and down without converging",
          "caption": "GAN training has no monotone objective to monitor, so the practical answer is FID on a fixed sample, a fixed-z contact sheet, discriminator accuracy, and (for WGAN) the Wasserstein estimate - which is the one adversarial quantity that genuinely trends."
        }
      ],
      "useCases": [
        "Single-step generation where latency is a hard constraint - real-time video effects, on-device generation, and interactive editing - which is the one axis where GANs still structurally beat diffusion, and why GAN-style adversarial objectives reappear in diffusion DISTILLATION.",
        "Image-to-image translation and restoration: super-resolution, deblurring, colourization, inpainting, and unpaired translation (CycleGAN). Here the adversarial term supplies realism that a reconstruction loss cannot, and the paired input constrains coverage so mode collapse matters less.",
        "As a LOSS rather than a model: patch discriminators are a standard component inside autoencoders (VQGAN, the Stable Diffusion VAE) and other systems, where they sharpen output that MSE would blur. This is arguably the GAN's most widespread surviving deployment.",
        "Simulation and data augmentation in domains with scarce data - medical imaging, physics, and tabular synthesis - where the generator's samples supplement a small dataset, with the standard caution that it cannot create information the training set lacked."
      ],
      "pitfalls": [
        "Reading the loss curves as progress. Adversarial losses are relative, so flat curves describe both equilibrium and total failure. Monitor FID on a FIXED sample size, a fixed-z contact sheet, discriminator accuracy, and (for WGAN) the Wasserstein estimate.",
        "Missing mode collapse because samples look good. Individually beautiful samples that repeat across different z values are the signature. A likelihood model cannot do this; the adversarial objective has no term penalizing missing modes.",
        "Using batch normalization in a WGAN-GP critic. The gradient penalty assumes per-sample gradients are independent and batch norm couples them. Use layer or instance normalization.",
        "Leaving Adam at its default betas. (0.9, 0.999) interacts badly with a moving adversarial target; (0.0, 0.9) or (0.5, 0.999) are the standard settings, and a two-timescale learning rate (higher for D) is close to free.",
        "Forgetting to detach the generator's output on the critic step, which back-propagates the critic's objective into the generator and produces a model that trains toward nothing coherent.",
        "Comparing FID values computed with different sample counts. FID is a BIASED estimator that decreases with more samples, so 10k-sample and 50k-sample numbers are not comparable, and neither is a number from a different Inception implementation.",
        "Expecting a likelihood. GANs provide none - no density, no ELBO, no principled anomaly score - which rules them out wherever you need to evaluate the probability of a given input rather than produce new ones.",
        "Assuming a newer GAN variant will beat the original. Given equal hyperparameter search budgets, Lucic et al. found no variant consistently dominated; much of the published progress was search budget rather than method."
      ],
      "connections": [
        {
          "ref": "generative/vae",
          "text": "The opposite corner of the trilemma: likelihood training is mode-covering and blurs, adversarial training is mode-seeking and sharpens. One asymmetry explains both characteristic failures."
        },
        {
          "ref": "generative/autoencoders",
          "text": "A patch discriminator is now a standard component of autoencoder training - the GAN survives most widely as a LOSS inside other models rather than as a model."
        },
        {
          "ref": "generative/conditional-generation",
          "text": "Conditional GANs introduced the projection and auxiliary-classifier machinery, and the fidelity-diversity trade they exposed reappears exactly as classifier-free guidance in diffusion."
        },
        {
          "ref": "generative/diffusion-guidance",
          "text": "FID, Inception Score, and precision/recall for generative models were all developed to evaluate GANs, and they carry their biases into diffusion evaluation unchanged."
        },
        {
          "ref": "cnn/cnn-architectures",
          "text": "DCGAN's architectural guidelines - strided convolutions instead of pooling, batch norm, no fully-connected layers - were the first recipe that made deep convolutional generation train reliably."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a GAN?",
          "a": "A generator mapping noise to samples and a discriminator distinguishing real from generated, trained adversarially. The generator never computes a likelihood - its only signal is whether the discriminator was fooled."
        },
        {
          "q": "What does the minimax objective optimize at the optimal discriminator?",
          "a": "The Jensen-Shannon divergence between the data and model distributions (up to constants), so the global optimum is p_g = p_data. This assumes an optimal discriminator, which training never has."
        },
        {
          "q": "What is the non-saturating loss?",
          "a": "Maximize log D(G(z)) instead of minimizing log(1 - D(G(z))). Same fixed point, but a strong gradient when the discriminator is winning - which is exactly when the original form flattens out."
        },
        {
          "q": "What is mode collapse?",
          "a": "The generator produces only a few kinds of output, ignoring most of the data distribution. The objective never asks for coverage, so missing modes costs nothing."
        },
        {
          "q": "Why can't you monitor GAN training with the loss?",
          "a": "The losses are adversarial and relative - improvement in one raises the other. Flat curves are what BOTH equilibrium and total failure look like."
        },
        {
          "q": "Why does WGAN use Wasserstein distance?",
          "a": "When the real and generated distributions lie on disjoint low-dimensional manifolds, JS divergence is constant at log 2 and its gradient is zero. Wasserstein varies smoothly with how far mass must be moved."
        },
        {
          "q": "What is the critic, as opposed to the discriminator?",
          "a": "In WGAN, f outputs an unbounded SCORE rather than a probability, and must be 1-Lipschitz. Its output difference estimates the Wasserstein distance."
        },
        {
          "q": "How is the Lipschitz constraint enforced?",
          "a": "Originally by weight clipping, which distorts the critic badly. WGAN-GP penalizes (||grad D|| - 1)^2 at points interpolated between real and fake, with lambda = 10. Spectral normalization is the modern alternative."
        },
        {
          "q": "Why no batch norm in a WGAN-GP critic?",
          "a": "The gradient penalty assumes each sample's gradient is independent, and batch norm couples samples within a batch. Use layer or instance normalization."
        },
        {
          "q": "What is TTUR?",
          "a": "Two-timescale update rule: a higher learning rate for the discriminator than the generator (e.g. 4e-4 vs 1e-4). A cheap and reliable stabilizer."
        },
        {
          "q": "What did 'Are GANs Created Equal?' find?",
          "a": "Given equal hyperparameter search budgets, no published variant consistently outperformed the original GAN. Much reported progress was search budget rather than method."
        },
        {
          "q": "Where do GANs still win?",
          "a": "Single-step sampling - one forward pass versus diffusion's many - so real-time and on-device generation. And as a LOSS (patch discriminators) inside autoencoders and restoration models."
        }
      ],
      "standard": [
        {
          "q": "Why is GAN training unstable, and what actually fixes it?",
          "a": "THE ROOT CAUSE IS THAT IT IS NOT AN OPTIMIZATION PROBLEM. Ordinary training descends a fixed objective and converges to a minimum. GAN training seeks a NASH EQUILIBRIUM of a two-player game, where each player's objective depends on the other's current parameters. Gradient descent on a minimax objective is not guaranteed to converge at all - even on simple bilinear games it can cycle forever around the equilibrium rather than approaching it, which is a fact about the dynamics rather than about neural networks. THE SPECIFIC FAILURE MODES, and what causes each. (1) VANISHING GRADIENTS. If the discriminator becomes too good, D(G(z)) goes to zero, and in the original saturating loss log(1 - D(G(z))) is flat there - the generator receives essentially no signal exactly when it is worst. This is why the non-saturating form exists and why it was in the original paper. (2) MODE COLLAPSE. The generator finds one output that reliably fools the current discriminator and maps most of z to it. The discriminator then learns to reject that output, so the generator moves to another, and the two cycle without covering the distribution. The structural cause is that the objective contains no coverage term. (3) OSCILLATION AND NON-CONVERGENCE, from the game dynamics above. (4) DISCRIMINATOR OVERFITTING when data is limited: it memorizes the training set, its signal to the generator becomes meaningless, and quality degrades. WHAT ACTUALLY FIXES IT, ordered by how much I trust it. ARCHITECTURAL AND OPTIMIZER HYGIENE first, because it is cheap and does most of the work: DCGAN's guidelines (strided convolutions rather than pooling, no fully-connected layers, normalization), Adam with betas (0.0, 0.9) or (0.5, 0.999) rather than the default, TTUR with a higher discriminator learning rate, and an EMA of the generator's weights for sampling - the last is worth several FID points and is nearly free. LIPSCHITZ CONSTRAINTS ON THE DISCRIMINATOR, which I would call the single most reliable class of fix. SPECTRAL NORMALIZATION (divide each weight matrix by its largest singular value) is my default: it is cheap, has no extra hyperparameter, and is far less fiddly than a gradient penalty. WGAN-GP works well but adds a lambda to tune and forbids batch norm in the critic. The reason these help is worth stating: constraining the discriminator prevents it from becoming arbitrarily sharp, which keeps the generator's gradient informative. LOSS FUNCTION CHOICE matters less than the literature suggests - hinge loss, WGAN, and non-saturating all work with adequate regularization, and Lucic et al.'s finding is precisely that the differences shrink to within search-budget variance once you tune properly. REGULARIZING WITH DATA: for limited data, adaptive discriminator augmentation (ADA, from StyleGAN2-ADA) applies differentiable augmentations to BOTH real and fake inputs with a strength tuned by how much the discriminator is overfitting. This was the breakthrough that made GANs trainable on a few thousand images and is the right tool whenever data is scarce. FOR MODE COLLAPSE SPECIFICALLY: minibatch discrimination or minibatch standard deviation (letting the discriminator see batch-level statistics, so a batch of identical outputs is detectable), unrolled GANs, and PacGAN. These help and none fully solves it. WHAT I WOULD SAY OVERALL: GAN stability was addressed by accumulating engineering practice rather than by any single theoretical fix, and the honest summary is that the field found a recipe (spectral norm, TTUR, EMA, augmentation, careful architecture) rather than a solution. That is part of why diffusion displaced GANs so quickly - a diffusion model optimizes one well-posed regression objective, and none of this applies.",
          "deepDive": {
            "q": "Explain mode collapse in depth: mechanism, detection, and mitigations.",
            "a": "THE MECHANISM. The generator's objective is to maximize the probability that the discriminator judges its output real. Nothing in that requires diversity. If a single output x* strongly fools the CURRENT discriminator, mapping every z to x* is a locally optimal generator response - it maximizes the objective exactly. The discriminator then learns that x* is fake, and the generator jumps to a new x**. The two chase each other around a small set of outputs, and the joint dynamics can cycle indefinitely without covering the data. Note this is a rational response to the objective, not an optimization pathology, which is why architectural tinkering does not reliably fix it. THE DIVERGENCE VIEW, which makes the contrast with VAEs precise. Likelihood training minimizes roughly KL(p_data || p_model), which blows up wherever p_data is large and p_model is near zero - so it is MODE-COVERING and pays for it by spreading mass into implausible regions, i.e. blur. The reverse KL(p_model || p_data) blows up wherever the model puts mass with no data, so it is MODE-SEEKING: it prefers to concentrate on a subset it can model well and simply ignore the rest. GAN training in practice behaves much closer to the reverse direction. One asymmetry, two characteristic failures, and that framing transfers well beyond GANs. THE DEGREES, which matter for diagnosis. COMPLETE collapse - every z gives essentially the same image - is rare and obvious. PARTIAL collapse - the generator covers a handful of modes and drops the rest - is common and much harder to see, because the samples you look at are all good. And INTRA-MODE collapse - all faces are covered but every face has the same expression - is subtle and frequently goes unreported. DETECTION, and this is where most practitioners under-invest. (1) A FIXED-z CONTACT SHEET, rendered periodically. Cheap and immediately reveals repeats. (2) NEAREST-NEIGHBOUR checks: for each generated sample find its nearest generated neighbour; a distribution of distances concentrated near zero means duplicates. (3) PRECISION AND RECALL FOR GENERATIVE MODELS (Sajjadi et al.; Kynkaanniemi et al.), which is the right tool. Precision measures what fraction of generated samples fall in the real data's manifold (quality); RECALL measures what fraction of the real manifold is covered by generated samples (diversity). Mode collapse is exactly high precision with low recall, and FID - a single number mixing both - can look acceptable while recall is terrible. If you care about coverage, report precision and recall, not FID alone. (4) The BIRTHDAY PARADOX test (Arora & Zhang): sample a batch of size s and check for near-duplicates; if duplicates appear at batch size s, the effective support is roughly s^2. This gives an actual estimate of the number of modes and it repeatedly showed published GANs had support far smaller than their training sets. (5) If you have labels, classify generated samples and compare the class histogram against the data's. MITIGATIONS, none complete. MINIBATCH DISCRIMINATION / MINIBATCH STDDEV: give the discriminator access to batch-level statistics so a batch of near-identical outputs is detectable. Simple, effective, and standard in the StyleGAN line. UNROLLED GANs: update the generator against a discriminator unrolled several steps into the future, so the generator cannot exploit the current discriminator's transient weakness - directly targets the chase dynamic, and is expensive. PACGAN: give the discriminator several samples at once, so lack of diversity becomes visible. WGAN and other divergence changes reduce but do not eliminate it. VEEGAN and BiGAN-style approaches add an ENCODER, so the model must be able to map real data back into the latent space - which penalizes ignoring parts of the data and attacks the root cause more directly than the rest. Conditioning helps a great deal in practice, since conditional generation forces coverage of the conditioning variable. THE HONEST SUMMARY: mode collapse was never solved for unconditional GANs, only managed. It is the single clearest reason diffusion models displaced them - a likelihood-based objective is mode-covering by construction, so the failure mode does not exist, and the price (slow sampling) turned out to be much more tractable to fix."
          }
        },
        {
          "q": "Explain WGAN: what problem it solves and whether it delivered.",
          "a": "THE PROBLEM IT DIAGNOSED, which is the paper's most valuable contribution. Arjovsky & Bottou's analysis: natural images lie on a low-dimensional manifold in pixel space, and the generator's output also lies on a low-dimensional manifold (the image of z under G). Two low-dimensional manifolds in a high-dimensional space intersect in a set of measure zero almost surely - their supports are effectively DISJOINT. For disjoint supports, JS divergence is exactly constant at log 2, and KL is infinite. A constant divergence has ZERO GRADIENT. So the theoretical objective the original GAN optimizes provides no learning signal in precisely the situation that always holds. That is a clean and genuinely illuminating diagnosis of why the discriminator getting too good kills training. THE PROPOSED FIX. Use the Wasserstein (earth-mover) distance instead. It measures the minimum cost of transporting mass from one distribution to the other, so it varies SMOOTHLY with how far apart the supports are and gives useful gradients even when they do not overlap. Via Kantorovich-Rubinstein duality it can be written as a supremum over 1-LIPSCHITZ functions of the difference in expected values, which is implementable: train a CRITIC f that outputs an unbounded score rather than a probability, constrain it to be 1-Lipschitz, and its output gap estimates W. ENFORCING LIPSCHITZ - the practical story. The original paper CLIPPED weights to a small box. It bounds the Lipschitz constant crudely and badly distorts the critic - it biases it toward simple functions and causes gradients to explode or vanish depending on the clipping value, which the authors acknowledged as a poor solution. WGAN-GP replaced it with a GRADIENT PENALTY: penalize (||grad_x D(x_hat)|| - 1)^2 at points interpolated between real and fake samples, using the fact that an optimal 1-Lipschitz critic has unit gradient norm along those lines. This works far better and became standard, with two implementation traps - the penalty must be on the interpolated points, and batch norm in the critic breaks the per-sample independence the penalty assumes. SPECTRAL NORMALIZATION later provided a cheaper alternative: divide each weight matrix by its top singular value, bounding the Lipschitz constant architecturally with no extra loss term or hyperparameter. It is my default today. DID IT DELIVER? Partly, and the honest accounting is more interesting than either the hype or the backlash. WHAT IT DELIVERED: (a) a MEANINGFUL LOSS - the critic's estimate of W correlates with sample quality and actually trends downward, which was the first time GAN practitioners had any monitorable quantity, and I would argue this was its biggest practical contribution; (b) genuinely improved stability, with much less sensitivity to architecture; (c) reduced mode collapse, though not eliminated; (d) the diagnostic framework itself, which reshaped how the field thought about GAN failure. WHAT IT DID NOT DELIVER: (a) the theory does not really hold in practice, because the critic is neither optimal nor exactly 1-Lipschitz, so what you are estimating is not the Wasserstein distance - it is something with similar behaviour; (b) Lucic et al.'s controlled comparison found WGAN-GP did not consistently beat a well-tuned non-saturating GAN with spectral normalization, which is the deflating result; (c) it is slower, needing multiple critic steps per generator step; (d) the best GANs that followed (StyleGAN and successors) mostly did NOT use the WGAN loss, preferring non-saturating or hinge losses with strong regularization. WHAT I WOULD CONCLUDE: WGAN's lasting contributions are the DIAGNOSIS (disjoint supports kill JS gradients) and the emphasis on constraining the discriminator's Lipschitz constant - which turned out to be the actually-important intervention, and which spectral normalization delivers more cheaply than the Wasserstein machinery. The specific distance mattered less than the constraint it forced you to impose. That is a common pattern in this literature and worth recognizing: a paper's theory motivates a regularizer, the regularizer is what works, and it works for reasons broader than the theory."
        },
        {
          "q": "How do you evaluate a generative model with no likelihood?",
          "a": "GANS PROVIDE NO DENSITY, so evaluation must be sample-based, and every available metric is a proxy with known failure modes. INCEPTION SCORE (IS). Feed samples to an Inception classifier; reward confident per-sample predictions (each image looks like SOMETHING) and a diverse marginal over classes. Its problems are severe enough that it should not be used alone: it never looks at the real data at all, so it cannot detect that your samples differ from your dataset; it is entirely defined by ImageNet classes, so it is meaningless for faces or medical images; and it is trivially gamed by a model producing one perfect example of each of the 1000 classes. FRECHET INCEPTION DISTANCE (FID). Fit a Gaussian to Inception features of real and generated samples and compute the Frechet distance between them. Better than IS because it compares against real data, it correlates reasonably with human judgment, and it detects several kinds of degradation. Its problems, which people routinely ignore: it is a BIASED estimator that decreases with more samples, so 10k-sample and 50k-sample FIDs are not comparable and both must state N; it assumes Gaussian features, which they are not; it depends on the exact Inception implementation, and the PyTorch and TensorFlow versions disagree; it is an ImageNet-feature metric applied to domains ImageNet knows nothing about; and it CONFLATES quality and diversity into one number, so a model with beautiful samples and poor coverage can match one with mediocre samples and full coverage. PRECISION AND RECALL FOR GENERATIVE MODELS, which is the fix for that last problem and is under-used. Estimate the real and generated manifolds with k-nearest-neighbour spheres in feature space. PRECISION = fraction of generated samples inside the real manifold (quality/fidelity). RECALL = fraction of real samples inside the generated manifold (coverage/diversity). Mode collapse is exactly high precision with low recall, and it is invisible in FID. If diversity matters to you, this pair should be your primary metric. Density and Coverage (Naeem et al.) are more robust variants. HUMAN EVALUATION, which remains the ground truth. Two-alternative forced choice against real images, or against a baseline model, with the usual discipline: enough items for a confidence interval, randomized order, measured inter-annotator agreement, and attention checks. HYPE (Human eYe Perceptual Evaluation) formalizes this by measuring the exposure time at which people can no longer distinguish generated from real. TASK-BASED evaluation, which I find the most honest when it is available. If the generated data is for augmentation, measure downstream task accuracy when training on it. If it is for a product, measure whether users accept the output. These are the only metrics that measure what you actually want. AND THE CHECKS THAT ARE ROUTINELY SKIPPED. (1) MEMORIZATION: for your best samples, find the nearest training image in feature space and look at it. A model that memorizes scores excellently on FID and is worthless. This should be standard practice and it is not. (2) The BIRTHDAY-PARADOX support estimate, which repeatedly showed published GANs had far smaller effective support than their training sets. (3) Coverage of known attributes, if you have labels. WHAT I WOULD REPORT: FID with a stated sample count and Inception version, precision and recall separately, a nearest-neighbour memorization check, and a human comparison against a baseline. AND THE CAUTION THAT FRAMES ALL OF IT, from Theis et al.: likelihood and sample quality are only loosely coupled in high dimensions - you can construct a model with near-optimal likelihood and terrible samples, or excellent samples and terrible likelihood. So there is no single number here, and a paper reporting one is choosing which failure to hide."
        },
        {
          "q": "Diffusion has largely displaced GANs. Do GANs still matter?",
          "a": "YES, IN SPECIFIC AND DEFENSIBLE PLACES, and the honest answer separates 'GANs as the headline image generator' - which is over - from 'adversarial training as a technique' - which is not. WHY DIFFUSION WON. Better sample quality at scale; genuinely better mode coverage, since a likelihood-style objective is mode-covering by construction; far more stable training (one regression objective, no game); much better controllability, because iterative generation gives you a hook at every step, which is what makes inpainting, guidance, and ControlNet natural; and better scaling behaviour with data and compute. Against those, diffusion's one structural disadvantage was SAMPLING SPEED - and that turned out to be the most fixable constraint of the three in the trilemma. Distillation, consistency models, and better ODE solvers took a thousand steps down to a handful, while nobody found a comparable fix for mode collapse. That asymmetry, more than anything, is the story. WHERE GANS STILL WIN. (1) SINGLE-STEP GENERATION. One forward pass, full stop. For real-time video effects, on-device generation, and interactive editing where latency is a hard constraint, this remains a structural advantage. (2) SUPER-RESOLUTION AND RESTORATION, where the input heavily constrains the output so coverage matters less, the adversarial term supplies the realism a reconstruction loss cannot, and speed matters. (3) SMALL-DATA REGIMES: StyleGAN2-ADA trains well on a few thousand images, which is a scale where diffusion models struggle. (4) The STYLEGAN LATENT SPACE remains exceptionally good for editing - W and W+ support semantic manipulation and GAN inversion in a way diffusion's data-shaped latent does not match, and a lot of face-editing tooling still rests on it. (5) Domains where the ecosystem simply has not moved - medical imaging, scientific simulation, tabular data. WHERE ADVERSARIAL TRAINING SURVIVES INSIDE OTHER MODELS, which I would argue is the more important answer. (a) PATCH DISCRIMINATORS as a perceptual loss inside autoencoders - the Stable Diffusion VAE and VQGAN both train adversarially, and without it their reconstructions would be blurry, which would cap the entire diffusion system. So there is a discriminator inside the most-deployed diffusion model in the world. (b) DIFFUSION DISTILLATION: adversarial diffusion distillation (SDXL-Turbo) and related methods use a discriminator to train few-step or one-step samplers, explicitly borrowing the GAN's speed advantage. (c) Speech and audio vocoders (HiFi-GAN and successors) are still adversarial and still standard, because the latency requirement is severe. (d) Domain adaptation and representation learning use adversarial objectives routinely. WHAT I WOULD SAY IN AN INTERVIEW. GANs lost the headline application and won a durable place as a COMPONENT. The adversarial loss is the best tool available for 'make this output lie on the data manifold', and that is a subproblem that appears inside many systems whose top-level objective is not adversarial. And the intellectual legacy is substantial regardless: implicit generative modelling, the mode-covering versus mode-seeking distinction, and most of the evaluation apparatus that diffusion papers now use were all developed here. The deeper lesson I would draw is about which constraints are worth accepting: three families each gave up one leg of the trilemma, and the one that gave up the most TRACTABLE constraint won. That is a useful way to think about any design that involves an apparently forced trade."
        },
        {
          "q": "You need to generate synthetic training data for a small medical imaging dataset. Would you use a GAN?",
          "a": "MY FIRST ANSWER IS THAT SYNTHETIC DATA IS PROBABLY NOT THE HIGHEST-VALUE INTERVENTION HERE, and I would say so before discussing architectures - because the framing matters more than the model. A generative model trained on your small dataset cannot create information that dataset does not contain. It can smooth and interpolate what is there, which sometimes helps as a regularizer, but the failure modes of the downstream classifier usually come from cases the dataset does not cover - and those are exactly what the generator also cannot produce. WHAT I WOULD DO FIRST, in order. (1) CLASSICAL AUGMENTATION tuned to the modality's real invariances - and in medical imaging this requires care, since horizontal flips are wrong when laterality is diagnostic and intensity jitter is wrong when absolute intensity carries meaning (CT Hounsfield units). Get this right and it often closes most of the gap. (2) TRANSFER LEARNING from a large pretrained model, plus SELF-SUPERVISED continued pretraining on unlabelled in-domain scans, of which there are usually far more than labelled ones. This is typically the single highest-return step. (3) ACTIVE LEARNING to direct any additional labelling budget. (4) Better use of the labels you have - cross-validation, careful splitting, ensembling. If someone proposes a GAN before these, the proposal is usually about novelty rather than performance. IF SYNTHETIC DATA IS STILL WANTED, the architecture question. I would NOT reach for an unconditional GAN. Reasons: mode collapse is especially dangerous here, because the modes it drops will be the rare pathologies you most need; GANs are data-hungry and a few hundred or thousand images is a hard regime; there is no likelihood, so you cannot even score how well the distribution is covered; and training instability makes the whole thing hard to validate. If I did use a GAN, StyleGAN2 with ADAPTIVE DISCRIMINATOR AUGMENTATION is the right choice - it was designed for exactly this data scale and it works. A conditional formulation (conditioned on pathology label, and on scanner or site if available) is essential, because conditioning forces coverage of the conditioning variable and directly counteracts the failure mode I am most worried about. A diffusion model is now a defensible alternative and has better coverage properties, at the cost of needing more data still and being slower. THE VALIDATION I WOULD INSIST ON, which is where these projects usually fail. (1) MEMORIZATION CHECK, first and non-negotiable: for a large sample of generated images, find the nearest training image in feature space and inspect the closest matches manually. A generator that memorizes patient scans is a privacy incident, not a data augmentation strategy, and 'it is synthetic' is not a defence if it reproduces a real patient. Differential privacy guarantees are worth considering if the data will leave the institution. (2) COVERAGE: precision and recall for generative models, or a class histogram against the real distribution. Confirm the rare classes actually appear. (3) CLINICAL REVIEW: have a radiologist look at samples. Generative models produce anatomically impossible structures that look plausible to a non-expert and are obvious to one, and a model that generates a lung with the wrong lobe count is worse than no model. (4) THE DOWNSTREAM TEST that actually settles it: train the classifier with and without synthetic data and evaluate on a REAL held-out set, split by patient and by site. If synthetic data does not improve real-data performance, it does not matter how good the samples look. And check whether the improvement survives when compared against classical augmentation at equal effort, which is the comparison that most often deflates the result. THE RISK I WOULD FLAG EXPLICITLY: synthetic data can encode and amplify the training set's biases - scanner, site, demographic - while giving the appearance of a larger, more diverse dataset. That is a specific way this can make things worse rather than merely failing to help, and it is worth naming before the project starts."
        },
        {
          "q": "How do you make a GAN conditional, and what breaks?",
          "a": "THE GOAL is to control what is generated - a class, a text description, another image - rather than sampling unconditionally. THE APPROACHES, and they differ in more than plumbing. (1) NAIVE CONCATENATION (the original cGAN): append a one-hot label or embedding to z for the generator and to the input for the discriminator. Simple, and weak - the discriminator can largely ignore the label, so the generator faces little pressure to actually respect it, and you get class-agnostic samples with a decorative conditioning input. (2) AUXILIARY CLASSIFIER (AC-GAN): the discriminator also predicts the class, and the generator is rewarded when its samples are classified correctly. This does enforce conditioning, and it has a known pathology worth knowing: the auxiliary classification term rewards the generator for producing EASILY CLASSIFIABLE samples, which pushes it toward prototypical, low-diversity outputs near each class centre. It reduces intra-class diversity as a direct consequence of the objective, and this has been measured repeatedly. (3) PROJECTION DISCRIMINATOR (Miyato & Koyama), which is the principled version and my default. Rather than adding a classification loss, incorporate the label through an INNER PRODUCT between the label embedding and the discriminator's feature vector, added to the unconditional score. This follows from the form of the optimal discriminator when the conditional and marginal distributions differ by a class-dependent factor, and empirically it gives better sample quality and much better within-class diversity than AC-GAN. This is what BigGAN uses. (4) CONDITIONAL NORMALIZATION: make the normalization layers' scale and shift functions of the condition - conditional batch norm for class labels, AdaIN for style, SPADE for spatial semantic maps. Very effective, and it injects the condition throughout the network rather than only at the input, which matters for spatially-structured conditions. (5) For IMAGE-TO-IMAGE, the condition is an image: pix2pix pairs a patch discriminator with an L1 reconstruction term, and CycleGAN adds a cycle-consistency loss so unpaired translation is possible. WHAT BREAKS. (a) THE CONDITION GETS IGNORED, the most common failure - the generator produces good images unrelated to the condition. Diagnose by generating with a fixed z and varying the condition: if the outputs barely change, conditioning has failed. Fix by strengthening how the discriminator uses the condition (projection rather than concatenation) or by injecting the condition at more layers. (b) INTRA-CLASS MODE COLLAPSE: all samples for a class look identical. Conditioning fixes coverage ACROSS classes and can make it worse WITHIN them, especially with an auxiliary classifier. Measure per-class diversity, not just overall FID. (c) CONDITION-DEPENDENT QUALITY: rare classes get far worse samples, because the discriminator has seen few real examples of them, so the generator's signal there is weak. Report FID per class - the aggregate hides it entirely. (d) The generator can IGNORE z instead of ignoring the condition - producing a deterministic function of the condition, which is one-to-one image translation dressed up as generation. This is very common in image-to-image models and is the reason pix2pix's authors observed the noise input being ignored. Mitigations: explicit diversity terms (BicycleGAN), or accepting determinism if it is acceptable for the application. (e) With free-form TEXT conditioning, the discriminator's job becomes very hard and naive approaches fail - which is part of why text-to-image did not really work with GANs at scale and diffusion with CLASSIFIER-FREE GUIDANCE succeeded. THE CONNECTION I WOULD DRAW: the fidelity-versus-diversity trade that conditional GANs exposed - the truncation trick, where sampling z from a narrowed distribution improves quality and reduces diversity - is exactly the same knob as classifier-free guidance weight in diffusion. Both are explicit dials trading coverage for per-sample quality, and both make the trilemma's trade adjustable at INFERENCE time rather than fixed at training time. That is the same idea appearing twice, and recognizing it is worth more than either implementation."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "GAN objective",
        "back": "Generator maps noise to samples; discriminator separates real from fake; trained adversarially. At the OPTIMAL discriminator the generator minimizes JS divergence - but training never has an optimal discriminator, so the theory describes a game nobody plays."
      },
      {
        "type": "definition",
        "front": "Non-saturating loss",
        "back": "Maximize log D(G(z)) rather than minimize log(1 - D(G(z))). Same fixed point, strong gradient when D is winning. It is in the ORIGINAL paper - the minimax form is analyzed, not run."
      },
      {
        "type": "intuition",
        "front": "Why GANs are sharp and VAEs blur",
        "back": "Likelihood training ~ KL(p_data||p_model) is mode-COVERING: hedging is cheap, missing data is catastrophic -> blur. Adversarial training behaves mode-SEEKING: hedging is detectable, missing modes is free -> sharp but collapsed."
      },
      {
        "type": "pitfall",
        "front": "GAN losses are not progress signals",
        "back": "They are adversarial and relative, so flat curves describe equilibrium AND total failure identically. Watch FID at a FIXED sample count, a fixed-z contact sheet, D accuracy (~75% healthy), and WGAN's Wasserstein estimate."
      },
      {
        "type": "definition",
        "front": "Why Wasserstein",
        "back": "Real and generated data lie on low-dimensional manifolds that almost surely do not intersect. For disjoint supports JS is CONSTANT at log 2 - zero gradient. Wasserstein varies with how far mass must move, so it still gives signal."
      },
      {
        "type": "definition",
        "front": "WGAN-GP gradient penalty",
        "back": "lambda*(||grad D(x_hat)|| - 1)^2 at points INTERPOLATED between real and fake, lambda=10. Two traps: it must be on interpolates, and batch norm in the critic breaks the per-sample independence it assumes."
      },
      {
        "type": "intuition",
        "front": "Spectral normalization",
        "back": "Divide each weight matrix by its top singular value, bounding the Lipschitz constant architecturally. Cheaper than a gradient penalty, no extra hyperparameter - the modern default. The CONSTRAINT mattered more than the specific distance."
      },
      {
        "type": "pitfall",
        "front": "Mode collapse detection",
        "back": "High precision, LOW recall (precision/recall for generative models) - invisible in FID, which merges both into one number. Also: fixed-z contact sheets, nearest-neighbour duplicate distances, and the birthday-paradox support estimate."
      },
      {
        "type": "pitfall",
        "front": "FID is a biased estimator",
        "back": "It decreases with more samples, so 10k and 50k FIDs are not comparable - always state N and the Inception implementation. It also conflates quality and diversity, and assumes Gaussian features."
      },
      {
        "type": "pitfall",
        "front": "Are GANs created equal?",
        "back": "Lucic et al.: with EQUAL hyperparameter search budgets, no published variant consistently beat the original. Much reported progress was search budget. Treat GAN loss-function comparisons without matched budgets as uninformative."
      },
      {
        "type": "definition",
        "front": "The training-hygiene checklist",
        "back": "Detach G's output on the critic step; no BN in a GP critic; Adam betas (0.0,0.9) or (0.5,0.999); TTUR (higher LR for D); EMA of G's weights for sampling (several FID points, nearly free); tanh output so scale data to [-1,1]."
      },
      {
        "type": "intuition",
        "front": "Where GANs still matter",
        "back": "Single-step sampling (real-time, on-device), restoration/super-resolution, small data (StyleGAN2-ADA), StyleGAN's editable W space - and above all as a LOSS: the patch discriminator inside Stable Diffusion's own VAE."
      }
    ],
    "refs": [
      {
        "title": "Goodfellow et al. (2014), Generative Adversarial Networks",
        "url": "https://arxiv.org/abs/1406.2661"
      },
      {
        "title": "Gulrajani et al. (2017), Improved Training of Wasserstein GANs (WGAN-GP)",
        "url": "https://arxiv.org/abs/1704.00028"
      },
      {
        "title": "Miyato et al. (2018), Spectral Normalization for Generative Adversarial Networks",
        "url": "https://arxiv.org/abs/1802.05957"
      },
      {
        "title": "Lucic et al. (2018), Are GANs Created Equal? A Large-Scale Study",
        "url": "https://arxiv.org/abs/1711.10337"
      },
      {
        "title": "Kynkaanniemi et al. (2019), Improved Precision and Recall Metric for Assessing Generative Models",
        "url": "https://arxiv.org/abs/1904.06991"
      }
    ],
    "demos": [
      "gan",
      "vae",
      "embeddings",
      "classification-metrics"
    ]
  },
  "conditional-generation": {
    "level": "core",
    "body": {
      "intuition": [
        "Unconditional generation samples from p(x) - you get something from the data distribution and you have no say in what. Almost every useful application wants p(x | c): this class, this text description, this sketch, this segmentation map, this reference face. Conditioning is what turned generative models from research demonstrations into products, and the interesting part is that the mechanism you choose determines both how strongly the condition binds and what fails.",
        "The naive approach - concatenate the condition to the input and hope - is weak, and its failure is specific: the model produces good samples that IGNORE the condition, because nothing in the objective made following it necessary. Every serious method makes the condition structurally unavoidable. GANs learned this the hard way and produced the projection discriminator; diffusion learned it and produced classifier-free guidance; and conditional normalization (injecting the condition into every layer's scale and shift) works in both.",
        "The idea that outlasted everything else here is that conditioning strength can be a DIAL AT INFERENCE TIME rather than a property fixed at training time. Classifier-free guidance extrapolates away from the unconditional prediction and away from the conditional one, and the extrapolation factor w trades DIVERSITY for FIDELITY continuously: w = 1 gives the honest conditional distribution, higher w gives samples that match the prompt harder and look better individually while covering less of the space. The GAN world found the same knob independently as the truncation trick. Recognizing them as the same trade is worth more than either technique, because it says the generative trilemma's coverage-versus-quality edge is not a fixed point you choose once - it is a slider your users can move."
      ],
      "math": [
        {
          "h": "Classifier guidance: steering with an external gradient",
          "paras": [
            "The first workable diffusion conditioning (Dhariwal & Nichol) trains a classifier on NOISY images and pushes the sampler along the gradient of log p(c|x). Bayes' rule turns the score of the conditional into the unconditional score plus a classifier gradient."
          ],
          "tex": "\\nabla_x \\log p(x \\mid c) = \\nabla_x \\log p(x) + \\nabla_x \\log p(c \\mid x), \\qquad \\tilde{\\epsilon} = \\epsilon_\\theta(x_t,t) - s\\,\\sigma_t \\nabla_{x_t} \\log p_\\phi(c \\mid x_t)",
          "texNote": "s is the guidance scale. The drawbacks are practical and decisive: you must train a SEPARATE classifier on noisy inputs at every noise level, and the method inherits that classifier's failures - including its adversarial vulnerability, since you are literally doing gradient ascent on its output."
        },
        {
          "h": "Classifier-free guidance: the same steering with no classifier",
          "paras": [
            "Train ONE network to do both jobs by randomly dropping the condition during training (typically 10-20% of the time), then at sampling extrapolate along the direction from the unconditional to the conditional prediction."
          ],
          "tex": "\\tilde{\\epsilon}_\\theta(x_t, c) = \\epsilon_\\theta(x_t, \\varnothing) + w\\big(\\epsilon_\\theta(x_t, c) - \\epsilon_\\theta(x_t, \\varnothing)\\big)",
          "texNote": "w = 1 recovers the true conditional; w = 0 is unconditional; w > 1 EXTRAPOLATES past the conditional prediction, which is why quality rises and diversity falls. Typical values are 3-8 for text-to-image. Cost: two forward passes per step, so guidance roughly doubles inference compute."
        },
        {
          "h": "What guidance is doing to the distribution",
          "paras": [
            "The extrapolation is equivalent to sampling from a sharpened distribution in which the conditional likelihood term is raised to a power - which makes the fidelity/diversity trade explicit rather than mysterious."
          ],
          "tex": "p_w(x \\mid c) \\;\\propto\\; p(x)\\,p(c \\mid x)^{\\,w} \\;=\\; p(x\\mid c)\\left[\\frac{p(c\\mid x)}{1}\\right]^{w-1}",
          "texNote": "Raising p(c|x) to a power > 1 concentrates mass on samples the model is most confident match the condition. That is precisely 'more on-prompt, less varied', and it is the same operation as low-temperature sampling in a language model or the truncation trick in a GAN."
        }
      ],
      "code": [
        {
          "h": "Classifier-free guidance, training and sampling",
          "paras": [
            "The whole technique is two small changes. Note that the training side is a single line - randomly replacing the condition with a learned null embedding - and that is what makes one network serve as both models."
          ],
          "code": "import torch\n\n# ---- TRAINING: drop the condition ~10-20% of the time ----\ndef train_step(x0, c):\n    t = torch.randint(0, T, (x0.size(0),), device=x0.device)\n    noise = torch.randn_like(x0)\n    x_t = q_sample(x0, t, noise)\n\n    drop = torch.rand(c.size(0), device=c.device) < 0.15\n    c_in = torch.where(drop[:, None], null_embedding, c)   # learned NULL token\n\n    return F.mse_loss(model(x_t, t, c_in), noise)\n\n# ---- SAMPLING: two predictions per step, then extrapolate ----\n@torch.no_grad()\ndef guided_eps(x_t, t, c, w=7.5):\n    # batch them together - one forward pass at 2x batch, not two passes\n    x_in = torch.cat([x_t, x_t])\n    c_in = torch.cat([null_embedding.expand_as(c), c])\n    eps_uncond, eps_cond = model(x_in, torch.cat([t, t]), c_in).chunk(2)\n    return eps_uncond + w * (eps_cond - eps_uncond)\n\n# NEGATIVE PROMPTS are the same formula with a non-empty \"unconditional\":\n#   eps_neg + w * (eps_cond - eps_neg)\n# You are extrapolating AWAY from the negative prompt's prediction rather than\n# away from the null one. No new machinery - just a different anchor point.\n#\n# COST: guidance roughly doubles inference compute. Distillation methods\n# (guidance distillation) train a single network to emit the guided prediction\n# directly, recovering the 2x.",
          "caption": "Classifier-free guidance is a 15%-dropout line at training and a two-point extrapolation at sampling. Negative prompts fall out for free by moving the anchor from the null embedding to a prompt you want to move away from."
        },
        {
          "h": "The guidance scale is a dial, and it has a cost",
          "paras": [
            "Sweeping w is the most informative experiment in conditional diffusion, because it makes the trilemma's quality-versus-coverage edge visible as a curve rather than a claim."
          ],
          "code": "# Sweep w and measure BOTH axes - this is the whole story in one table.\n#\n#   w      FID (lower=better)   CLIP score (prompt match)   diversity\n#   1.0        best                   weak                   highest\n#   3.0        good                   good                   good\n#   7.5        worse                  strong                 reduced\n#  15.0        much worse             strongest              low\n#  30.0        artifacts              saturated              very low\n#\n# FID is minimized around w ~ 1-3, but human preference and prompt adherence\n# peak much higher (~7-8 for text-to-image). That divergence is important:\n# the metric and the user disagree, because FID rewards matching the DATA\n# DISTRIBUTION and users want on-prompt, striking single images. Reporting\n# FID alone would tell you to ship w=2, which nobody wants.\n#\n# HIGH-w FAILURE MODE: predicted x0 values drift outside the valid pixel\n# range, producing oversaturation and blown-out colours.\n#\n#   Imagen's DYNAMIC THRESHOLDING: at each step, clip the predicted x0 to\n#   [-s, s] where s is a high percentile (e.g. 99.5%) of |x0|, then rescale\n#   by s. This pushes saturated pixels inward instead of clipping them flat,\n#   and it is what makes very high guidance usable.\n\ndef dynamic_threshold(x0, p=0.995):\n    s = torch.quantile(x0.abs().flatten(1), p, dim=1).clamp(min=1.0)\n    s = s.view(-1, 1, 1, 1)\n    return x0.clamp(-s, s) / s",
          "caption": "FID is minimized near w=1-3 while human preference peaks near 7-8. The metric and the user disagree because they want different things - and dynamic thresholding is what keeps the high-guidance regime from blowing out."
        }
      ],
      "useCases": [
        "Text-to-image and text-to-video, where a text encoder's embeddings condition the model through cross-attention and classifier-free guidance supplies the prompt-adherence dial that makes the systems usable.",
        "Spatial and structural control: ControlNet-style adapters conditioning on edge maps, depth, pose, or segmentation, which give precise layout control that text alone cannot express - the practical answer to 'the prompt describes what, not where'.",
        "Image-to-image translation and restoration - super-resolution, inpainting, colourization, style transfer - where the condition is another image and the model's job is a constrained completion rather than free generation.",
        "Class-conditional generation for data augmentation and for controlled synthesis in scientific and medical settings, where conditioning on the label is what makes coverage of rare classes enforceable rather than hoped for."
      ],
      "pitfalls": [
        "Conditioning by concatenation and assuming it binds. The most common failure is good samples that ignore the condition. Diagnose by fixing z (or the noise seed) and VARYING the condition - if outputs barely change, conditioning has failed.",
        "Using an auxiliary classifier loss in a conditional GAN without checking intra-class diversity. It rewards easily-classifiable samples, which pushes the generator toward prototypical outputs near each class centre. The projection discriminator avoids this and is the better default.",
        "Tuning the guidance scale on FID. FID is minimized around w = 1-3 while human preference and prompt adherence peak near 7-8, so optimizing FID gives you a model nobody wants. Report FID AND a prompt-adherence metric AND look at samples.",
        "Pushing guidance high without dynamic thresholding. Predicted x0 drifts outside the valid range and you get oversaturation and blown-out colours - a rendering artifact often misread as a model-quality problem.",
        "Reporting per-class quality only in aggregate. Rare conditions get systematically worse samples because the model saw few examples of them, and the overall FID hides it completely.",
        "Forgetting that guidance roughly DOUBLES inference cost - two forward passes per denoising step. This is a real serving-cost line item, and guidance distillation exists specifically to recover it.",
        "Letting the model ignore the noise instead of the condition. In image-to-image especially, the generator can become a deterministic function of the condition - one-to-one translation dressed up as generation. Check that different seeds give different outputs."
      ],
      "connections": [
        {
          "ref": "generative/gan",
          "text": "The projection discriminator and the truncation trick were the GAN world's answers to the same two problems - making the condition bind, and trading diversity for fidelity at inference."
        },
        {
          "ref": "generative/diffusion-guidance",
          "text": "Guidance in full - samplers, schedules, and the evaluation machinery that measures what the guidance scale is actually costing you."
        },
        {
          "ref": "generative/latent-diffusion",
          "text": "Cross-attention over text embeddings is the conditioning mechanism that made latent diffusion a text-to-image system rather than an unconditional one."
        },
        {
          "ref": "multimodal/clip",
          "text": "CLIP's joint text-image space is what makes text conditioning and CLIP-score evaluation possible - and Imagen's finding that a frozen T5 text encoder works better is a direct argument about where language understanding should come from."
        },
        {
          "ref": "advanced-nlp/cot",
          "text": "Raising p(c|x) to a power is the same operation as low-temperature sampling in a language model - sharpening a conditional at the cost of coverage, in both cases a user-facing dial."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is conditional generation?",
          "a": "Sampling from p(x|c) rather than p(x) - generating an image of a specific class, matching a text description, or completing a given sketch or layout."
        },
        {
          "q": "Why does naive concatenation of the condition fail?",
          "a": "Nothing forces the model to use it, so you get good samples that ignore the condition. The fix is a mechanism that makes the condition structurally unavoidable."
        },
        {
          "q": "What is a projection discriminator?",
          "a": "Incorporate the label into the discriminator via an inner product between the label embedding and the feature vector, added to the unconditional score. Better quality and intra-class diversity than an auxiliary classifier."
        },
        {
          "q": "What is wrong with AC-GAN's auxiliary classifier?",
          "a": "It rewards the generator for producing EASILY CLASSIFIABLE samples, which pushes toward prototypical, low-diversity outputs near each class centre."
        },
        {
          "q": "What is classifier guidance?",
          "a": "Train a classifier on NOISY images and push the diffusion sampler along grad log p(c|x). Works, but needs a separate noise-aware classifier and inherits its failure modes."
        },
        {
          "q": "What is classifier-free guidance?",
          "a": "Randomly drop the condition during training (~10-20%) so one network learns both conditional and unconditional prediction, then extrapolate: eps_uncond + w(eps_cond - eps_uncond)."
        },
        {
          "q": "What does the guidance scale w do?",
          "a": "w=1 is the true conditional, w=0 unconditional, w>1 extrapolates past the conditional - sharpening prompt adherence and per-sample quality while reducing diversity."
        },
        {
          "q": "What is CFG doing distributionally?",
          "a": "Sampling from p(x)p(c|x)^w - raising the conditional likelihood to a power concentrates mass on samples the model is most confident match the condition."
        },
        {
          "q": "How do negative prompts work?",
          "a": "Same formula with a non-empty anchor: eps_neg + w(eps_cond - eps_neg). You extrapolate away from the negative prompt's prediction instead of away from the null one."
        },
        {
          "q": "What does CFG cost?",
          "a": "Two forward passes per denoising step, so roughly 2x inference compute. Guidance distillation trains a network to emit the guided prediction directly to recover it."
        },
        {
          "q": "What is dynamic thresholding?",
          "a": "At each step clip the predicted x0 to a high percentile of its own magnitude and rescale, instead of hard-clipping. It prevents the oversaturation that high guidance otherwise causes (Imagen)."
        },
        {
          "q": "Should you tune w on FID?",
          "a": "No. FID is minimized around w=1-3 while human preference and prompt adherence peak near 7-8. The metric wants distribution-matching; users want striking on-prompt images."
        }
      ],
      "standard": [
        {
          "q": "Explain classifier-free guidance and why it replaced classifier guidance.",
          "a": "CLASSIFIER GUIDANCE FIRST, because CFG is best understood as its correction. Dhariwal & Nichol wanted class-conditional diffusion good enough to beat GANs on ImageNet. Their approach used Bayes' rule on scores: grad log p(x|c) = grad log p(x) + grad log p(c|x). The first term is what an unconditional diffusion model already estimates. The second is a classifier's gradient. So train a classifier and add s times its gradient to the sampler's step, where s is a guidance scale. Raising s above 1 improves sample quality and class adherence dramatically - this is what let diffusion beat BigGAN on ImageNet FID and was the result that started the diffusion era. THE PROBLEMS WITH IT, which are practical and add up. (1) You need a SEPARATE CLASSIFIER trained on NOISY images at every noise level. Off-the-shelf classifiers are useless because they have never seen x_t at high noise, so this is an extra model, an extra training run, and extra maintenance. (2) The classifier's gradient at high noise is a poor signal - it is being asked to classify near-pure noise. (3) You are doing GRADIENT ASCENT on a classifier's output, which is literally the construction of an adversarial example, so you partly optimize for the classifier's quirks rather than for genuine class-membership. (4) It does not extend gracefully to rich conditions - there is no natural 'classifier' for an arbitrary text prompt. CLASSIFIER-FREE GUIDANCE (Ho & Salimans). Observe that the classifier gradient can be written in terms of the conditional and unconditional score functions - both of which a diffusion model can provide itself. Train ONE network with the condition randomly dropped 10-20% of the time and replaced by a learned null embedding, so it learns both p(x|c) and p(x). Then at sampling: eps_tilde = eps_uncond + w(eps_cond - eps_uncond). WHY THIS IS BETTER, point for point. (a) NO SECOND MODEL - one network, one training run, and the dropout is a single line. (b) No adversarial-example pathology, since you are extrapolating between two predictions from the SAME model rather than ascending an external classifier. (c) It works with ARBITRARY conditions - text embeddings, images, layouts, anything you can feed the network - which is the decisive advantage and the reason every text-to-image system uses it. (d) Empirically better quality at matched conditioning strength. THE INTERPRETATION worth carrying: the guided prediction corresponds to sampling from p(x)p(c|x)^w. For w > 1 you are raising the conditional likelihood to a power, which sharpens the distribution toward samples the model is most sure match the condition. That is exactly the fidelity-for-diversity trade, and it is the same operation as low-temperature sampling in an LM or the truncation trick in a GAN. THE COSTS, stated honestly. (1) TWO FORWARD PASSES PER STEP, so guidance roughly doubles inference cost - a real serving line item, batched as a 2x batch rather than two calls, and addressed by guidance distillation. (2) High w causes OVERSATURATION, because the predicted x0 leaves the valid range; Imagen's dynamic thresholding is the standard fix and is what makes very high guidance usable. (3) REDUCED DIVERSITY, which at high w becomes severe - many prompts collapse to near-identical compositions. (4) The optimal w depends on the model, the sampler, and the prompt, and it is a user-facing parameter for good reason. THE THING I WOULD EMPHASIZE: CFG is the reason text-to-image works. Without it, models produce plausible images loosely related to the prompt; with it, they follow instructions. It is a small change with an outsized effect, and it converted conditioning strength from a training-time property into an inference-time dial - which is a design pattern worth generalizing.",
          "deepDive": {
            "q": "How does text conditioning actually work in a text-to-image model, and what determines its quality?",
            "a": "THE PIPELINE. Text goes through a frozen TEXT ENCODER producing a sequence of token embeddings. Those embeddings condition the denoising network via CROSS-ATTENTION: at multiple resolutions in the U-Net or DiT, the image features form queries and the text embeddings supply keys and values, so every spatial location can attend to every token. Classifier-free guidance then supplies the adherence dial, with the null condition being an empty-string embedding. WHY CROSS-ATTENTION RATHER THAN CONCATENATION. Text is a variable-length sequence and the image is spatial; cross-attention handles the mismatch naturally and lets DIFFERENT SPATIAL REGIONS attend to DIFFERENT TOKENS, which is what compositional prompts require ('a red cube on a blue sphere' needs the cube region attending to 'red' and the sphere region to 'blue'). Concatenating a single pooled text vector destroys exactly that, and pooled-vector conditioning is a large part of why early text-to-image models produced 'vibes of the prompt' rather than its content. WHAT DETERMINES QUALITY - and Imagen's ablation is the most informative result here. Saharia et al. compared text encoders and found that SCALING THE TEXT ENCODER improved image-text alignment MORE than scaling the diffusion model itself. A frozen T5-XXL (a large language model trained only on text) outperformed CLIP's text encoder. That is a striking result with a clear reading: the hard part of text-to-image is UNDERSTANDING THE TEXT, and a model trained on far more text than any image-text corpus contains understands it better. It also means you should think of the text encoder as a component to be chosen deliberately, not as plumbing. CLIP versus T5 is a real trade: CLIP's embeddings are already aligned to visual concepts, which helps for short descriptive prompts; T5 has far better compositional and syntactic understanding, which helps for long, structured ones. Several systems use BOTH, concatenating the two encoders' outputs. THE KNOWN FAILURE MODES, which all trace to the mechanism. (1) ATTRIBUTE BINDING: 'a red cube and a blue sphere' produces a blue cube. Cross-attention gives every region access to every token, and nothing enforces that 'red' binds to the cube - the model learns binding statistically and fails when the combination is unusual. Attend-and-Excite and similar methods intervene on attention maps at inference to force each subject token to be attended somewhere. (2) COUNTING is unreliable, because nothing in the architecture counts. (3) SPATIAL RELATIONS ('left of', 'behind') are weak, since the training captions rarely describe layout precisely and the model has little pressure to learn it - which is why ControlNet-style spatial conditioning exists and is popular. (4) NEGATION largely fails: 'a room without a chair' often produces a chair, because the text encoder's embedding of the phrase still activates chair-related directions. Negative prompts exist partly to work around this and are a better mechanism for it than text. (5) TEXT RENDERING inside images is poor when the tokenizer and encoder discard character-level information; models that render text well feed character-aware encoders. (6) LONG PROMPTS get truncated at the encoder's context limit - CLIP's 77 tokens is a hard wall people routinely exceed without noticing. WHAT I WOULD CHECK when diagnosing a conditioning problem: visualize the CROSS-ATTENTION MAPS per token. They show directly which region attended to which word, and attribute-binding failures are immediately visible as the wrong region attending to the adjective. That is the single most useful debugging tool in this area and it is cheap to produce."
          }
        },
        {
          "q": "How would you add a new type of control to an existing text-to-image model?",
          "a": "THE CONSTRAINT THAT SHAPES EVERYTHING: retraining the base model is out of reach for almost everyone, and full fine-tuning risks catastrophic forgetting of everything the base model knows. So the question is really how to ADD a control channel without disturbing what exists. THE OPTIONS, in increasing order of invasiveness. (1) INFERENCE-TIME MANIPULATION, no training at all. For spatial control you can intervene directly on cross-attention maps - forcing a subject token's attention into a specified region gets you crude layout control for free. Prompt-to-Prompt edits by manipulating attention between two generations. Cheap, immediate, and limited in precision. (2) TEXTUAL INVERSION: learn a NEW TOKEN EMBEDDING for a concept from a handful of images, freezing the entire model. A few kilobytes, no risk of forgetting, and limited to concepts expressible as a single embedding - excellent for 'this specific object or style', useless for structural control. (3) LoRA / DreamBooth-style fine-tuning: low-rank updates to the attention layers. Small files, composable, and the standard method for style and subject customization. Still fundamentally about WHAT is generated, not WHERE. (4) CONTROLNET, which is the right answer for a new SPATIAL modality - depth, pose, edges, segmentation, normals. The design is worth understanding because it solves the forgetting problem structurally: freeze the base model entirely; make a trainable COPY of the encoder blocks; feed the control image into that copy; and connect the copy's outputs back into the frozen decoder through ZERO-INITIALIZED convolutions. The zero-init is the key detail - at initialization the ControlNet contributes exactly nothing, so training starts from the unmodified base model and the control is learned as an additive correction. There is no destructive phase at the start, which is precisely what makes it trainable on a modest dataset without wrecking the base. T2I-Adapter is a lighter variant with a similar structure. (5) IP-Adapter and similar: add a decoupled cross-attention path for IMAGE prompts, so you can condition on a reference image alongside text. (6) Full fine-tuning, which I would reach for only with a lot of data and a real reason. HOW I WOULD ACTUALLY DECIDE. Is the control SPATIAL and dense? ControlNet. Is it a specific SUBJECT or STYLE? LoRA or textual inversion. Is it a REFERENCE IMAGE's overall look? An IP-Adapter-style image prompt. Is it a semantic property already in the model's vocabulary? Try prompting and attention manipulation first, because it costs nothing. THE DATA QUESTION, which usually decides feasibility. ControlNet training needs PAIRS of (control signal, image). The trick that makes this tractable is that most control signals can be EXTRACTED automatically from existing images - run an edge detector, a depth estimator, or a pose model over a large image corpus and you have millions of pairs with no annotation. If your new modality can be extracted from images by an existing model, you can build the dataset cheaply; if it cannot, that is the real obstacle and it is worth confronting before choosing an architecture. THE EVALUATION. Control ADHERENCE (does the output match the control signal, measured by re-extracting it and comparing), IMAGE QUALITY (has the base model's ability degraded), TEXT ADHERENCE (does it still follow the prompt - a common regression, where the control overrides the text), and COMPOSABILITY (does it stack with other adapters, since users will combine them). I would also check behaviour when the control and the prompt CONFLICT, because that is where these systems produce their strangest outputs and users will do it constantly."
        },
        {
          "q": "How do you evaluate a conditional generative model?",
          "a": "THE EXTRA AXIS is that unconditional metrics do not measure whether the condition was respected, and that is usually the thing you care about most. So evaluation splits into at least three questions. (1) SAMPLE QUALITY - are the images good? FID against a reference set, with the usual caveats (biased with sample count, ImageNet features, conflates quality and diversity). (2) CONDITION ADHERENCE - does the output match c? This is the conditional-specific part and the method depends on the condition type. For CLASS labels: classify the generated samples with an independent classifier and measure accuracy. For TEXT: CLIP score (cosine similarity between the image embedding and the prompt embedding) is the standard, and it is weak - it saturates, it is insensitive to compositional errors, and it is the very model used for training in some systems, which makes it partly circular. Better options include a VQA model asked structured questions about the image (TIFA, VQAScore), or human evaluation. For SPATIAL controls: RE-EXTRACT the control signal from the generated image and compare against the input - if you conditioned on a depth map, run the depth estimator on the output and measure agreement. This is the cleanest form of adherence measurement available and it should be used whenever the condition is extractable. (3) DIVERSITY GIVEN THE CONDITION, which is routinely omitted and matters. Generate many samples for the SAME condition and measure their spread - LPIPS distance between pairs, or per-condition recall. A model that produces one image per prompt is not conditional generation, it is a lookup table, and neither FID nor CLIP score will tell you. THE THINGS I WOULD INSIST ON. (a) REPORT THE GUIDANCE SCALE and sweep it, because every number above moves with w and comparing two models at different scales is meaningless. The honest presentation is a CURVE - FID against CLIP score as w varies - which shows the whole trade-off rather than one point on it. This is now standard in good papers and it is the single most informative plot in this area. (b) PER-CONDITION BREAKDOWN. Rare classes and unusual prompts are much worse than the aggregate suggests, and the aggregate is dominated by the common cases. (c) COMPOSITIONAL BENCHMARKS specifically - attribute binding, counting, spatial relations, negation - because these are the known systematic failures and general metrics miss all of them. T2I-CompBench and similar exist for this. (d) A MEMORIZATION check: nearest training neighbours for your best samples. Conditional models trained on captioned web data have been shown to reproduce training images verbatim for certain prompts, which is a legal and privacy issue rather than a quality one. (e) HUMAN EVALUATION as the anchor, pairwise against a baseline, with the discipline that implies. AND THE POINT I WOULD LEAD WITH IN A DESIGN REVIEW: choose the operating point from the USE CASE, not from the metric. FID is minimized around w = 1-3; human preference peaks near 7-8. If you tune on FID you ship a model that scores well and that users find bland and off-prompt. The metric and the user want different things here, and knowing which one you are serving is the actual decision."
        },
        {
          "q": "Why does high guidance produce oversaturated images, and how is it fixed?",
          "a": "THE MECHANISM. At each denoising step the model predicts the noise, from which you derive a predicted CLEAN IMAGE x0. In an unguided model that prediction stays in the valid data range, because it was trained to predict real images. Classifier-free guidance EXTRAPOLATES: eps_uncond + w(eps_cond - eps_uncond) with w well above 1 pushes the prediction beyond anything the model was trained to output. The derived x0 then contains values outside the valid range - beyond [-1, 1] in normalized pixel space. Naive clipping flattens those pixels to the extremes, and the visible result is blown-out highlights, crushed shadows, and hyper-saturated colours. At very high w you also get structural artifacts, because the accumulated extrapolation error compounds across steps. WHY IT GETS WORSE AT HIGHER RESOLUTION, which is a detail worth knowing: the effect was most acute in Imagen's high-resolution pixel-space cascades, because the same guidance scale applied over more pixels and more steps compounds further. THE FIXES. (1) DYNAMIC THRESHOLDING (Imagen's contribution, and the standard answer). At each step, compute a threshold s as a high percentile - say 99.5% - of the absolute values of the predicted x0 IN THAT SAMPLE, clip x0 to [-s, s], then RESCALE by dividing by s. The crucial difference from static clipping is the rescale: instead of flattening the outliers, you push the whole image inward proportionally, so saturated pixels are pulled back toward the valid range while relative structure is preserved. This is what makes very high guidance scales usable at all, and it is a handful of lines. (2) GUIDANCE RESCALING (Lin et al., 'Common Diffusion Noise Schedules and Sample Steps are Flawed'): guidance changes the STANDARD DEVIATION of the prediction, so rescale the guided output to match the conditional prediction's statistics. Addresses the same problem from the moment-matching direction and composes with thresholding. (3) DYNAMIC OR SCHEDULED GUIDANCE: vary w across timesteps rather than holding it fixed. High guidance early (when composition is being decided) and lower later (when detail is being rendered) gives much of the adherence with fewer artifacts, and several samplers now do this by default. (4) Operating in a LATENT space rather than pixels reduces the severity, which is one under-discussed reason latent diffusion tolerates high guidance better than pixel-space models. (5) Simply using a lower w and accepting less adherence, which is a legitimate choice. THE DEEPER READING, and the reason this is a good interview question: guidance is a HACK. It is not sampling from any distribution the model was trained to represent - p(x)p(c|x)^w is a distribution nobody fitted, and for w > 1 it is deliberately not the data distribution. It works because the sharpened distribution happens to be what users want, and the artifacts are what you get for sampling from a distribution your model was never trained on. All the fixes above are ways of keeping the extrapolation inside the region where the model is still reliable. That framing also explains why the whole area is empirical: there is no principled way to derive the right w, because the target distribution is defined by preference rather than by data."
        },
        {
          "q": "What is the truncation trick, and how does it relate to guidance?",
          "a": "THE TRUNCATION TRICK (Brock et al., BigGAN). At sampling time, draw z from a TRUNCATED normal - resample any component whose magnitude exceeds a threshold - rather than from the full N(0, I) the generator was trained with. Lower the truncation threshold and sample quality rises dramatically while diversity falls. At very low thresholds every sample for a class is nearly identical and nearly perfect; at threshold = infinity you recover the untruncated model. WHY IT WORKS. The generator maps latent space to image space, and it is best-trained where latent density is highest - near the origin. Points in the tails are rare during training, so the generator's behaviour there is less well constrained and more likely to produce artifacts. Truncating restricts sampling to the well-modelled central region. Equivalently, you are sampling from a SHARPENED version of the model's implied distribution. THE RELATIONSHIP TO GUIDANCE, which is the point of the question. Both are inference-time knobs that trade DIVERSITY for FIDELITY by sharpening a distribution the model was trained on, and neither corresponds to sampling from the trained distribution. Truncation sharpens the LATENT prior; guidance sharpens the CONDITIONAL likelihood via p(x)p(c|x)^w. Same trade, different mechanism, discovered independently in the two families - which is a good sign the trade is fundamental rather than architectural. THE SAME PATTERN ELSEWHERE, because once you see it you see it everywhere. Language models: TEMPERATURE below 1, top-k, and nucleus sampling all sharpen the next-token distribution, improving coherence and reducing diversity - and the well-documented result that low temperature produces repetitive text is the same diversity collapse. Reinforcement learning: the exploration-exploitation dial. Any softmax with a temperature parameter. In every case you are choosing where to sit on a quality-versus-coverage curve, at inference, without retraining. WHAT THIS SAYS ABOUT THE TRILEMMA, which is this module's spine. The trilemma presents quality, coverage, and speed as three corners you choose between at design time. Truncation and guidance show that the quality-coverage EDGE is not a point you pick once - it is a continuous slider available at inference. That is a genuinely useful reframing, because it means (a) you can serve different operating points to different users or use cases from one model, (b) evaluating a model at a single point on that curve is not evaluating the model, and (c) reporting a CURVE (FID against CLIP score as w varies, or FID against truncation level) is the honest presentation. A model that dominates another across the whole curve is genuinely better; one that only wins at a particular setting has been tuned to a metric. ONE ASYMMETRY WORTH NOTING: BigGAN's truncation exposed a per-model limitation - some generators produce artifacts under truncation unless they are constrained to be smooth (BigGAN used orthogonal regularization to fix this). Guidance has an analogous constraint in dynamic thresholding. In both cases the sharpening knob only works if the model is well-behaved off the training distribution, which is not automatic."
        },
        {
          "q": "Design a system that generates product images from a text description and a reference photo.",
          "a": "THE REQUIREMENT decomposes into two conditions of different kinds: TEXT specifying the scene, style, and context, and a REFERENCE PHOTO specifying the identity of a particular product that must be preserved exactly. The hard part is the second, because generic text-to-image will produce something LIKE the product rather than the product, and for commerce that is unacceptable - the customer receives the physical item. THE APPROACHES, and I would evaluate them in this order. (1) IP-ADAPTER-STYLE IMAGE PROMPTING. Add a decoupled cross-attention path that attends to embeddings of the reference image alongside the text path. No per-product training, works at inference from a single reference, and composes with text. This is where I would start because it has no per-item cost. Its weakness is fidelity: it captures the reference's overall appearance well and fine details - logos, exact colour, text on packaging - imperfectly. (2) DREAMBOOTH or LoRA PER PRODUCT: fine-tune on a handful of images of that specific item bound to a rare token. Much better identity preservation. The cost is a training run and a stored adapter PER SKU, which for a catalogue of thousands is a real operational burden - though the adapters are small and the training is minutes. Viable for a curated subset, not for a long tail. (3) INPAINTING WITH COMPOSITING, which is the approach I would most likely ship. Segment the product from the reference photo, place it in the target composition, and use the generative model to INPAINT the surroundings - background, lighting, shadows, context - conditioned on the text. The product pixels are the ORIGINAL pixels, so identity is preserved exactly by construction rather than approximately by learning. This inverts the problem: instead of asking the model to reproduce the product, ask it to build a world around a product it never touches. For commerce that guarantee is worth more than any amount of fidelity improvement. (4) A ControlNet on depth or edges from the reference to preserve SHAPE while text controls appearance - useful when you want the same silhouette in a different material or colour. THE ARCHITECTURE I WOULD PROPOSE: the compositing approach as the primary path, with a segmentation model extracting the product, a placement step (learned or rule-based) choosing scale and position, and an inpainting diffusion model conditioned on text generating the environment plus contact shadows. Add an IP-Adapter path for cases where the product must be re-rendered rather than composited - different angle, different pose - accepting lower fidelity there and routing those through review. THE PROBLEMS I WOULD PLAN FOR. (a) LIGHTING AND SHADOW CONSISTENCY is the giveaway that separates a convincing composite from an obvious one, and it is the main technical risk in the compositing path - the model must generate shadows and reflections consistent with the pasted product's existing lighting. Harmonization models exist for this and it is worth budgeting for. (b) SCALE AND PERSPECTIVE plausibility. (c) TEXT AND LOGOS on packaging, which generative models render badly - another argument for compositing. (d) The prompt and the product CONFLICTING ('on a beach' with an indoor-lit product). THE GUARDRAILS, which for a commerce product are not optional. Generated images must not misrepresent the item - no invented features, no altered colours, no implied accessories that are not included. That is a legal exposure, not a quality preference, and it is the strongest argument for the compositing architecture, where the product itself is never synthesized. I would add an automated check comparing the generated image's product region against the reference, a human review queue before publication, and clear labelling of synthetic imagery. EVALUATION: identity preservation (embedding similarity of the product region against the reference), prompt adherence, human realism ratings, and - the metric that actually matters - downstream conversion and RETURN RATE, since a beautiful image that misrepresents the item shows up as returns rather than as a quality metric."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Classifier-free guidance",
        "back": "Drop the condition ~10-20% of training so one net learns p(x|c) AND p(x), then extrapolate: eps_uncond + w(eps_cond - eps_uncond). w=1 true conditional, w=0 unconditional, w>1 sharpens adherence and cuts diversity."
      },
      {
        "type": "intuition",
        "front": "What CFG does distributionally",
        "back": "Samples from p(x)p(c|x)^w. Raising the conditional likelihood to a power concentrates mass on samples the model is most confident match c - the same operation as low temperature in an LM or truncation in a GAN."
      },
      {
        "type": "definition",
        "front": "Classifier guidance, and why it lost",
        "back": "grad log p(x|c) = grad log p(x) + grad log p(c|x), using a classifier trained on NOISY images. Needs a second model, is gradient ascent on a classifier (i.e. adversarial-example construction), and has no analogue for free-form text."
      },
      {
        "type": "pitfall",
        "front": "Do not tune w on FID",
        "back": "FID is minimized near w=1-3; human preference and prompt adherence peak near 7-8. FID rewards matching the DATA distribution; users want striking on-prompt images. Report the FID-vs-CLIP-score CURVE across w."
      },
      {
        "type": "definition",
        "front": "Dynamic thresholding",
        "back": "Clip predicted x0 to +/- a high percentile (~99.5%) of its own |values|, then RESCALE by that percentile. The rescale is the point - it pushes saturation inward instead of flattening it. Makes high guidance usable (Imagen)."
      },
      {
        "type": "intuition",
        "front": "Why high guidance oversaturates",
        "back": "w>1 extrapolates the prediction beyond anything the model was trained to output, so the derived x0 leaves the valid range. Guidance is a HACK - p(x)p(c|x)^w is a distribution nobody fitted."
      },
      {
        "type": "definition",
        "front": "Negative prompts",
        "back": "CFG with a non-empty anchor: eps_neg + w(eps_cond - eps_neg). You extrapolate AWAY from the negative prompt's prediction rather than away from the null embedding. No new machinery."
      },
      {
        "type": "pitfall",
        "front": "The condition gets ignored",
        "back": "The most common conditioning failure - good samples unrelated to c. Diagnose by FIXING the seed and VARYING the condition; if outputs barely move, conditioning failed. Fix with projection/cross-attention/conditional norm, not concatenation."
      },
      {
        "type": "pitfall",
        "front": "AC-GAN's diversity problem",
        "back": "An auxiliary classification loss rewards EASILY CLASSIFIABLE samples, pushing the generator to prototypical outputs near each class centre. The projection discriminator (inner product with the feature vector) avoids this."
      },
      {
        "type": "definition",
        "front": "ControlNet's zero-init",
        "back": "Freeze the base model, train a COPY of the encoder on the control signal, and connect it back through ZERO-INITIALIZED convolutions - so at step 0 the control contributes nothing and training starts from the unmodified base. No destructive phase."
      },
      {
        "type": "intuition",
        "front": "Text encoder > diffusion model (Imagen)",
        "back": "Scaling the frozen TEXT encoder improved image-text alignment more than scaling the diffusion model, and T5-XXL beat CLIP's text encoder. The hard part of text-to-image is understanding the text."
      },
      {
        "type": "pitfall",
        "front": "Compositional failures are systematic",
        "back": "Attribute binding ('red cube, blue sphere' -> blue cube), counting, spatial relations, and negation all fail and are invisible to FID/CLIP score. Debug by visualizing per-token CROSS-ATTENTION MAPS - binding errors are immediately visible."
      }
    ],
    "refs": [
      {
        "title": "Ho & Salimans (2022), Classifier-Free Diffusion Guidance",
        "url": "https://arxiv.org/abs/2207.12598"
      },
      {
        "title": "Dhariwal & Nichol (2021), Diffusion Models Beat GANs on Image Synthesis",
        "url": "https://arxiv.org/abs/2105.05233"
      },
      {
        "title": "Saharia et al. (2022), Photorealistic Text-to-Image Diffusion Models with Deep Language Understanding (Imagen)",
        "url": "https://arxiv.org/abs/2205.11487"
      },
      {
        "title": "Zhang et al. (2023), Adding Conditional Control to Text-to-Image Diffusion Models (ControlNet)",
        "url": "https://arxiv.org/abs/2302.05543"
      },
      {
        "title": "Miyato & Koyama (2018), cGANs with Projection Discriminator",
        "url": "https://arxiv.org/abs/1802.05637"
      }
    ],
    "demos": [
      "gan",
      "diffusion",
      "embeddings",
      "vae"
    ]
  },
  "latent-diffusion": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Pixel-space diffusion works and is ruinously expensive. Every denoising step is a full forward pass over a 512x512x3 tensor, and you need tens to hundreds of steps, so generating one image costs more than most people can spend and training costs more than most labs can raise. Latent diffusion's answer is a single observation about WHERE that compute goes: most of the bits in a natural image are high-frequency detail - texture grain, exact edge placement, sensor noise - that contributes almost nothing to what the image MEANS, and the diffusion model is spending most of its capacity modelling it.",
        "So split the problem. Rombach et al. called it separating PERCEPTUAL from SEMANTIC compression. Train a cheap autoencoder once to strip the perceptually irrelevant detail - 512x512x3 becomes 64x64x4, about 48 times fewer elements - and run the expensive iterative model entirely in that small space. Reconstruction is a far easier problem than generation, so a cheap model can do the first job well; generation is hard and deserves the expensive model. The decoder puts the detail back at the end.",
        "The consequence was not incremental. That factor-of-48 reduction per step is what took text-to-image from a datacenter service to something that runs on a consumer GPU, which is the entire reason there is an open ecosystem around image generation. But the design has a hard edge worth stating plainly: THE AUTOENCODER IS A CEILING. Whatever it cannot reconstruct, the system can never generate, no matter how good the diffusion model gets. Stable Diffusion's well-known difficulty with small faces and with text inside images is largely this - fine high-frequency structure that survives an 8x downsample poorly. The single most useful debugging step in this architecture is to encode a real image and immediately decode it, because whatever is lost in that round trip is the upper bound on everything downstream."
      ],
      "math": [
        {
          "h": "Where the compute saving comes from",
          "paras": [
            "Both convolution and attention cost scale with the number of spatial elements - attention quadratically. Reducing the spatial resolution by a factor f reduces elements by f-squared, and that saving is paid on EVERY denoising step."
          ],
          "tex": "N_{\\mathrm{pix}} = \\tfrac{H}{f}\\cdot\\tfrac{W}{f}, \\qquad \\frac{512^2 \\cdot 3}{64^2 \\cdot 4} \\approx 48\\times \\text{ fewer elements}, \\qquad \\mathrm{cost}_{\\mathrm{attn}} \\propto N_{\\mathrm{pix}}^2",
          "texNote": "f = 8 is Stable Diffusion's downsampling factor. Rombach et al. swept f and found 4-8 optimal: below that you have not saved much, above it the autoencoder discards semantic content the diffusion model can never recover."
        },
        {
          "h": "The objective is unchanged - only the space is different",
          "paras": [
            "Latent diffusion is not a new generative formulation. It is the same denoising objective applied to z = E(x) instead of to x, which is why every diffusion technique - schedules, samplers, guidance - transfers unmodified."
          ],
          "tex": "\\mathcal{L}_{\\mathrm{LDM}} = \\mathbb{E}_{\\mathcal{E}(x),\\,c,\\,\\epsilon,\\,t}\\Big[\\big\\lVert \\epsilon - \\epsilon_\\theta\\big(z_t, t, \\tau_\\theta(c)\\big)\\big\\rVert_2^2\\Big], \\qquad z_t = \\sqrt{\\bar\\alpha_t}\\,\\mathcal{E}(x) + \\sqrt{1-\\bar\\alpha_t}\\,\\epsilon",
          "texNote": "tau_theta(c) is the condition encoder - a frozen text model for text-to-image - entering through cross-attention. The autoencoder E is FROZEN during diffusion training, so the two stages are genuinely independent."
        },
        {
          "h": "The scale factor, and why omitting it breaks everything",
          "paras": [
            "The noise schedule assumes the data has roughly unit variance. A trained autoencoder's latents do not, so the latent must be rescaled by a constant before diffusion - a detail that is invisible in the papers and fatal in reimplementations."
          ],
          "tex": "z = s \\cdot \\mathcal{E}(x), \\qquad s = \\frac{1}{\\hat\\sigma_{\\mathcal{E}(x)}} \\;\\;(\\text{Stable Diffusion: } s = 0.18215)",
          "texNote": "If s is wrong the signal-to-noise ratio at every timestep is wrong, and the model trains toward a schedule that does not match its data - producing washed-out or noisy output for reasons that look like a model bug. Always decode with the inverse scaling."
        }
      ],
      "code": [
        {
          "h": "The full pipeline, and the two places people get it wrong",
          "paras": [
            "The structure is short. The scale factor and the frozen-encoder discipline are the parts that break silently."
          ],
          "code": "import torch\n\nSCALE = 0.18215                 # NOT decoration - see below\n\n# ---- TRAINING (autoencoder already trained and FROZEN) ----\nwith torch.no_grad():\n    z0 = vae.encode(x).latent_dist.sample() * SCALE      # (B, 4, 64, 64)\n\nt = torch.randint(0, T, (z0.size(0),), device=z0.device)\nnoise = torch.randn_like(z0)\nz_t = alpha_bar[t].sqrt() * z0 + (1 - alpha_bar[t]).sqrt() * noise\n\ncond = text_encoder(prompt_ids)                          # frozen too\nloss = F.mse_loss(unet(z_t, t, encoder_hidden_states=cond), noise)\n\n# ---- SAMPLING ----\nz = torch.randn(1, 4, 64, 64, device=dev)\nfor t in scheduler.timesteps:\n    eps = guided_eps(z, t, cond, w=7.5)                  # CFG: 2 passes\n    z = scheduler.step(eps, t, z).prev_sample\nimage = vae.decode(z / SCALE).sample                     # INVERSE scaling\n\n# THE TWO SILENT KILLERS:\n#  1. FORGETTING THE SCALE FACTOR. The noise schedule assumes ~unit-variance\n#     data. A raw VAE latent has std ~5.5 for the SD autoencoder, so without\n#     the 0.18215 the effective SNR at every timestep is wrong and output is\n#     washed out or noisy - which looks like a model defect, not a scaling bug.\n#  2. NOT FREEZING THE VAE. If gradients reach the encoder it can cheat by\n#     making the latent easier to denoise rather than more informative, and\n#     the decoder drifts away from the latents the U-Net was trained on.",
          "caption": "Latent diffusion is ordinary diffusion in a different space. The scale factor and the frozen autoencoder are the two implementation details that fail silently and produce symptoms that look like model problems."
        },
        {
          "h": "The round-trip test: your system's fidelity ceiling",
          "paras": [
            "Ten lines that tell you what the architecture can and cannot ever produce. Run it before blaming the diffusion model for anything."
          ],
          "code": "# Encode a real image and immediately decode it. No diffusion involved.\nwith torch.no_grad():\n    z = vae.encode(x).latent_dist.mode()\n    x_hat = vae.decode(z).sample\n\nprint(f\"PSNR {psnr(x, x_hat):.1f} dB   LPIPS {lpips(x, x_hat).item():.3f}\")\n\n# WHATEVER IS LOST HERE, THE SYSTEM CAN NEVER GENERATE.\n#\n# What you will see on a photo with fine detail (SD 1.x VAE, f=8, 4 channels):\n#   large structures ........ essentially perfect\n#   textures ................ slightly altered but plausible\n#   SMALL FACES ............. distorted - eyes and mouths shift\n#   TEXT in the image ....... unreadable, letterforms invented\n#   thin high-contrast lines  softened or broken\n#\n# This is the source of the two most-reported Stable Diffusion complaints,\n# and NEITHER is fixable by a better U-Net, more steps, or better prompting.\n# Later versions increased the latent channel count (4 -> 16 in SD3/Flux)\n# specifically to raise this ceiling, which is a much larger quality change\n# than it sounds.\n#\n# DEBUGGING RULE: if a failure survives the round trip, it is an AUTOENCODER\n# problem. If the round trip is clean and generation still fails, it is a\n# diffusion problem. This one test partitions the entire failure space.",
          "caption": "Encode-then-decode with no diffusion. Small faces and in-image text degrade in the round trip alone, which is why no amount of U-Net improvement fixed them - and why raising the latent channel count did."
        }
      ],
      "useCases": [
        "Text-to-image at consumer scale: Stable Diffusion and its descendants, where the ~48x reduction is what makes both training and inference affordable enough for an open ecosystem to exist around them.",
        "Video generation, where the argument is far stronger - a video's pixel count is enormous and latent compression applies across time as well as space, so essentially every practical video diffusion system is latent.",
        "Audio and speech generation, where the same two-stage pattern (neural codec plus a generative model over codes) is standard, and where the codec's quality is likewise the system's ceiling.",
        "High-resolution and 3D generation, where pixel- or voxel-space diffusion is simply infeasible and compression is the only route - the same reasoning that made cascaded pixel models (Imagen) the main alternative and latent models the winner."
      ],
      "pitfalls": [
        "Omitting the latent scale factor. The noise schedule assumes roughly unit-variance data and raw latents are not; without the rescaling the effective SNR is wrong at every timestep, producing washed-out or noisy samples that look like a model defect.",
        "Blaming the diffusion model for autoencoder failures. Run the encode-decode round trip first: small faces and in-image text degrade there alone, and no U-Net improvement, sampler, or prompt fixes what the autoencoder discarded.",
        "Training the autoencoder with MSE alone. Its blur becomes a hard ceiling on the entire system, which is why the standard recipe uses perceptual (LPIPS) and patch-adversarial losses.",
        "Regularizing the latent too strongly. The autoencoder is a COMPRESSOR, not a generative prior - Stable Diffusion uses a deliberately tiny KL weight. A strongly-regularized latent trades reconstruction fidelity for a property the diffusion model does not need.",
        "Letting gradients reach the encoder during diffusion training. It can then make the latent easier to denoise rather than more informative, and the decoder drifts away from the distribution the denoiser was trained on.",
        "Choosing the downsampling factor by intuition. Rombach et al. found 4-8 optimal by sweep: too little compression saves little, too much discards semantics that are then unrecoverable. It is an empirical trade, not a free parameter.",
        "Assuming latent-space operations behave like pixel-space ones. Latent interpolation, arithmetic, and masking do not map cleanly onto their pixel equivalents, and a small latent perturbation can produce a large, structured pixel change."
      ],
      "connections": [
        {
          "ref": "generative/autoencoders",
          "text": "This is the autoencoder's most consequential deployment - as pure compression, with a tiny regularization weight, precisely because it is NOT being asked to be a generative prior."
        },
        {
          "ref": "generative/ddpm",
          "text": "The diffusion objective is completely unchanged; only the space it operates in differs, which is why every schedule, sampler, and guidance technique transfers unmodified."
        },
        {
          "ref": "generative/conditional-generation",
          "text": "Cross-attention over a frozen text encoder's embeddings is what turns this from an unconditional model into a text-to-image system."
        },
        {
          "ref": "multimodal/clip",
          "text": "The text encoder is the conditioning pathway, and Imagen's finding that a larger frozen language model beats CLIP's text tower is a direct argument about where the language understanding should live."
        },
        {
          "ref": "generative/ar-generative",
          "text": "VQ-GAN plus a transformer is the same two-stage factorization with an autoregressive prior instead of a diffusion one - compression and generation solved separately, either way."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is latent diffusion?",
          "a": "Run the diffusion process in a pretrained autoencoder's latent space rather than in pixels. Stable Diffusion maps 512x512x3 to 64x64x4 - about 48x fewer elements per denoising step."
        },
        {
          "q": "Why is that so much cheaper?",
          "a": "Convolution and attention costs scale with the number of spatial elements (attention quadratically), and the saving is paid on EVERY denoising step, of which there are many."
        },
        {
          "q": "What is the perceptual/semantic split?",
          "a": "Most bits in a natural image are high-frequency detail that contributes little to meaning. Let a cheap autoencoder discard it and spend the expensive iterative model on the semantic content."
        },
        {
          "q": "Is the diffusion objective different?",
          "a": "No. It is the identical denoising objective applied to z = E(x) instead of x, which is why schedules, samplers, and guidance all transfer unchanged."
        },
        {
          "q": "What is the latent scale factor?",
          "a": "A constant (0.18215 in Stable Diffusion) multiplying the latent so it has roughly unit variance, because the noise schedule assumes that. Omitting it makes the SNR wrong at every timestep."
        },
        {
          "q": "How is the autoencoder trained?",
          "a": "Separately and beforehand, with reconstruction plus PERCEPTUAL (LPIPS) plus patch-adversarial losses, and only very light KL or VQ regularization. Then frozen."
        },
        {
          "q": "Why is the KL weight so small?",
          "a": "The autoencoder is a compressor, not a generative prior - the diffusion model provides the prior. A strong KL would trade reconstruction fidelity for a property nothing needs."
        },
        {
          "q": "What limits a latent diffusion model's fidelity?",
          "a": "The autoencoder. Whatever it cannot reconstruct, the system can never generate - which is why small faces and in-image text fail regardless of the U-Net."
        },
        {
          "q": "How do you test that ceiling?",
          "a": "Encode a real image and immediately decode it, with no diffusion. Whatever is lost in that round trip bounds everything downstream, and it partitions the failure space."
        },
        {
          "q": "How is text conditioning added?",
          "a": "Cross-attention in the denoising network, with a frozen text encoder supplying keys and values, plus classifier-free guidance for the adherence dial."
        },
        {
          "q": "What downsampling factor is best?",
          "a": "4 to 8 by Rombach et al.'s sweep. Less saves little; more discards semantic content the diffusion model cannot recover."
        },
        {
          "q": "What changed in later versions?",
          "a": "More latent channels (4 to 16 in SD3/Flux), which directly raises the reconstruction ceiling, plus a shift from U-Net to transformer backbones and flow-matching objectives."
        }
      ],
      "standard": [
        {
          "q": "Explain the latent diffusion architecture and why the two-stage design is correct.",
          "a": "THE ARCHITECTURE. Stage one is an AUTOENCODER, trained separately on images and then frozen. Its encoder maps 512x512x3 to a 64x64x4 latent - a factor of 8 spatially and roughly 48x fewer elements - and it is trained with reconstruction plus a perceptual (LPIPS) loss plus a patch discriminator, with only very light KL or VQ regularization. Stage two is a DIFFUSION MODEL operating entirely on those latents, conditioned through cross-attention on a frozen text encoder's embeddings. At inference you sample noise in latent space, denoise it, and decode once at the end. WHY IT IS CORRECT - the argument in three steps. (1) COMPUTE FOLLOWS ELEMENT COUNT. Both convolution and attention scale with the number of spatial positions, attention quadratically, and diffusion pays that cost on every one of many denoising steps. Reducing elements 48x is therefore an enormous saving, and it is multiplied by the step count. (2) THE DISCARDED INFORMATION IS THE CHEAP KIND. Rombach et al.'s framing - perceptual versus semantic compression - is the substance of the argument. Most bits in a natural image are high-frequency detail that contributes almost nothing to meaning, and a pixel-space diffusion model demonstrably spends most of its capacity modelling exactly that. An autoencoder can strip it far more cheaply, because RECONSTRUCTION IS A MUCH EASIER PROBLEM THAN GENERATION - reconstruction has the answer available as input. (3) THE TWO PROBLEMS HAVE DIFFERENT BEST TOOLS. Compression wants a feedforward encoder-decoder with perceptual losses; generation wants an iterative denoiser. Solving them jointly forces one architecture to do both jobs at whatever compromise is achievable. THE PAYOFF WAS QUALITATIVE, NOT INCREMENTAL. The saving is what made training feasible on an academic budget and inference feasible on a consumer GPU, which is the reason there is an open text-to-image ecosystem at all. That is a case where an efficiency result changed who could participate in the field, not just how fast the field moved. THE COSTS, which I would state without hedging. (a) THE AUTOENCODER IS A HARD CEILING. Whatever it cannot reconstruct, the system can never generate. Stable Diffusion's difficulty with small faces and with text in images is largely this, and it is not addressable by any improvement to the diffusion model. Later versions raised the latent channel count from 4 to 16 precisely to lift the ceiling, which is a bigger quality change than its description suggests. (b) ERRORS COMPOUND ACROSS STAGES: a slightly implausible latent gets amplified by the decoder in ways that are hard to predict from the latent alone. (c) DEBUGGING requires attributing failures to a stage, for which the encode-decode round trip is the essential test. (d) The latent space is not interpretable, so latent-space edits behave less predictably than pixel edits. THE ALTERNATIVE, for contrast: Imagen used CASCADED PIXEL-SPACE diffusion - a small base model at 64x64 followed by super-resolution diffusion stages. It also works and produces excellent results, and it avoids the autoencoder ceiling. It is more expensive and involves more models to train and serve, and the field went latent, but the comparison is genuinely close and worth knowing rather than dismissing. THE GENERAL LESSON I would draw: when a system spends most of its expensive computation on a subproblem a cheap method could handle, that is a factoring opportunity. The same reasoning gives VQ-GAN plus a transformer, retrieve-then-read in QA, and cascaded models generally.",
          "deepDive": {
            "q": "What exactly does the Stable Diffusion autoencoder lose, and how would you improve it?",
            "a": "MEASURING IT FIRST, because the answer should be empirical. Encode and immediately decode a set of real images and measure PSNR, LPIPS, and - most informatively - look at the residual. For the SD 1.x autoencoder (f=8, 4 latent channels) the pattern is consistent: large-scale structure and colour are essentially perfect; texture is slightly altered but plausible; SMALL FACES are distorted, with eyes and mouths shifting position; TEXT is unreadable and letterforms are invented; thin high-contrast lines soften or break; and fine periodic patterns can alias. WHY THOSE THINGS SPECIFICALLY. The bottleneck is a 4-channel 64x64 grid for a 512x512x3 image - a compression ratio of 48:1. What survives is what the training objective rewarded, and the objective was reconstruction plus LPIPS plus a patch discriminator. LPIPS and a patch discriminator both reward PERCEPTUAL PLAUSIBILITY of local texture rather than exact correspondence, so the autoencoder learns to produce something that looks like the right kind of texture rather than the exact one. For most content that is exactly what you want and is why the reconstructions look so good. For content where the exact arrangement IS the meaning - a face at 30 pixels, the word 'OPEN' on a sign - plausible-looking texture is wrong, and the model has no way to know the difference. It is the same failure as a GAN inventing detail, deployed deliberately. THE IMPROVEMENTS, in order of impact. (1) MORE LATENT CHANNELS. Going from 4 to 16 channels at the same spatial resolution is a 4x increase in latent capacity and it dramatically improves reconstruction of faces and text. This is what SD3 and Flux did and it is the single largest available win. The cost is that the diffusion model now works in a higher-dimensional space, which is somewhat harder to model and slightly more expensive - a genuine trade, but at current compute levels clearly worth it. (2) LESS SPATIAL DOWNSAMPLING (f=4 rather than 8) trades directly against the compute saving that motivated the whole design, so it is usually the wrong lever. (3) BETTER LOSSES: more weight on adversarial and perceptual terms, or a discriminator that specifically attends to faces and text regions. (4) A DIFFUSION DECODER instead of a feedforward one - sampling from the conditional distribution of images given the latent rather than predicting a point estimate. This produces noticeably sharper output and is used in some systems; it costs extra inference steps at decode time, which partly undoes the efficiency argument. (5) DOMAIN-SPECIFIC FINE-TUNING of the autoencoder: if you generate a narrow domain (product photos, faces, medical images), fine-tuning the VAE on that domain raises its ceiling substantially and is cheap. This is underused - people fine-tune the U-Net constantly and the VAE almost never. (6) HYBRID APPROACHES: generate in latent space and then run a pixel-space refinement or super-resolution pass, which is how several production systems handle faces. THE STRATEGIC POINT I would make in a design review: the community spent years fine-tuning U-Nets on top of a frozen autoencoder whose limitations were the binding constraint for two of the most-complained-about failure modes. That is a good example of optimizing the component you can see rather than the one that is limiting, and the diagnostic that would have revealed it - the encode-decode round trip - takes ten lines and almost nobody ran it."
          }
        },
        {
          "q": "Your generated images have a specific recurring flaw. How do you determine which component is responsible?",
          "a": "THE PIPELINE HAS FOUR COMPONENTS AND THE DIAGNOSTIC PROCEDURE ISOLATES THEM IN ORDER, cheapest first. STEP 1 - THE AUTOENCODER ROUND TRIP, always first because it is the cheapest and it partitions the whole failure space. Take REAL images containing the flawed content, encode them, decode them immediately, and inspect. If the flaw appears in the round trip, it is an AUTOENCODER limitation and nothing downstream can fix it - stop here and either change the autoencoder, add a pixel-space refinement stage, or accept it. This single test resolves the two most common Stable Diffusion complaints (small faces, in-image text) instantly, and the fact that people spend weeks tuning prompts and samplers for those is a good argument for running it first. STEP 2 - IS IT THE CONDITIONING? Generate with a FIXED SEED while varying the prompt, and with a fixed prompt while varying the seed. If output barely changes with the prompt, the condition is not binding. Visualize the per-token CROSS-ATTENTION MAPS - attribute-binding failures ('red cube, blue sphere' producing a blue cube) are immediately visible as the wrong region attending to the wrong word. Also check whether the prompt exceeds the text encoder's context limit and is being silently truncated, which is very common. STEP 3 - IS IT THE SAMPLER OR SCHEDULE? Vary the sampler and the step count. If the flaw disappears with more steps or a different solver, it is discretization error rather than a model problem. If images are systematically medium-brightness - never very dark or very bright - that is the ZERO-TERMINAL-SNR issue, a train/inference mismatch in the standard noise schedules rather than anything about your model or data. STEP 4 - IS IT THE GUIDANCE SCALE? Sweep w. Oversaturation, blown highlights, and high-contrast artifacts at high w are the guidance extrapolation leaving the valid range, fixed by dynamic thresholding rather than by anything else. Low diversity and repeated compositions are also a guidance symptom. STEP 5 - IS IT THE DIFFUSION MODEL ITSELF? Only if the above are clean. Now ask whether the flaw reflects the TRAINING DATA - a bias, an over-represented style, a watermark pattern the model learned. Check by looking at what the training distribution contains, and by testing whether the flaw is prompt-dependent in a way that tracks data availability. Rare concepts are worse because the model saw few examples, which is a data problem with a data fix. STEP 6 - IS IT THE DECODER'S INTERACTION with generated (rather than real) latents? The autoencoder was trained on latents from real images; the diffusion model produces latents that are close to but not exactly in that distribution. Test by decoding a generated latent and a real-image latent side by side. Some artifacts appear only for generated latents, which is a genuine stage-interaction failure and points toward fine-tuning the decoder on generated latents. THE GENERAL HABIT I would push: this architecture has clean seams, so USE THEM. Each stage can be tested in isolation with a few lines, and the ordering above is by cost. The failure mode I have seen most often is teams tuning the most visible component - prompts, then samplers, then U-Net fine-tunes - for a problem that a ten-line round-trip test would have attributed to the frozen autoencoder on day one."
        },
        {
          "q": "Compare latent diffusion with cascaded pixel-space diffusion.",
          "a": "THE TWO ANSWERS TO THE SAME PROBLEM - high-resolution diffusion is too expensive - and they factor it differently. LATENT DIFFUSION (Stable Diffusion) compresses SPATIALLY with an autoencoder and runs one diffusion model in the small space. CASCADED PIXEL DIFFUSION (Imagen, DALL-E 2) runs a base diffusion model at low resolution in PIXEL space - say 64x64 - then a sequence of diffusion SUPER-RESOLUTION models, each conditioned on the previous stage's output, stepping up to 256 and then 1024. LATENT'S ADVANTAGES. (1) ONE diffusion model to train and serve rather than three, which is a large operational simplification. (2) The compression is learned and therefore adapted to the data. (3) Cheaper end to end at a given output resolution. (4) The autoencoder is reusable across many diffusion models, which is exactly what the open ecosystem did - hundreds of fine-tunes share one VAE. (5) Conditioning enters once rather than at every stage. CASCADED'S ADVANTAGES. (1) NO AUTOENCODER CEILING. Everything operates in pixel space, so there is no fixed reconstruction limit - which is directly why Imagen handled fine detail and text better than early Stable Diffusion. (2) Each stage is a SIMPLER problem: the base model handles composition and semantics at low resolution where global structure is easy to model; the upsamplers handle local detail, which is a much more constrained conditional task. (3) The stages can be sized and trained independently to their difficulty. (4) NOISE CONDITIONING AUGMENTATION - deliberately adding noise to the low-resolution conditioning input during super-resolution training - makes each stage robust to the previous stage's errors, which is an elegant fix for the error-compounding problem cascades otherwise have. CASCADED'S COSTS. Multiple models to train, tune, and serve; error compounding across stages (partly addressed by noise conditioning augmentation); higher total inference cost because every stage runs a full diffusion process; and more moving parts in deployment. WHY LATENT WON IN PRACTICE. Cost, principally, and the fact that ONE reusable autoencoder plus one diffusion model is a far better substrate for an open ecosystem - you can fine-tune the U-Net for a style and share a 2GB file, which is what actually happened. Cascades require coordinating multiple models, which is a much higher barrier to community contribution. I would argue the ecosystem effect mattered as much as the raw efficiency. WHERE THINGS HAVE LANDED. Modern systems are increasingly HYBRID and the distinction is blurring: latent diffusion at a base resolution followed by a latent or pixel refiner (SDXL's base-plus-refiner), or latent generation followed by a diffusion-based upscaler. Latent backbones have moved from U-Nets to transformers, and the autoencoders have more channels. The lesson that survives from the cascade line is NOISE CONDITIONING AUGMENTATION, which is a genuinely good idea for any multi-stage generative pipeline: train each stage on deliberately degraded versions of what the previous stage will actually produce, rather than on ground truth it will never see. That is a general principle about exposure bias in staged systems and it transfers well beyond diffusion."
        },
        {
          "q": "How would you adapt a pretrained latent diffusion model to a specialized domain?",
          "a": "THE OPTIONS SPAN FOUR ORDERS OF MAGNITUDE IN COST, and I would work up from the cheapest because the cheap ones frequently suffice. (1) PROMPTING AND NEGATIVE PROMPTING, zero cost. Often gets 60-70% of the way for a stylistic target and should always be the baseline. (2) TEXTUAL INVERSION: learn a new token embedding from 3-5 images, freezing the entire model. A few kilobytes, no forgetting risk, minutes to train. Good for a specific object or style, limited by what a single embedding can express. (3) LoRA on the cross-attention and possibly the other linear layers: the workhorse. Tens of images, minutes to an hour of training, a file of a few megabytes, and it composes with other LoRAs at inference. This is where I would expect to land for most domain-adaptation requests. (4) DREAMBOOTH: fine-tune the full U-Net on a few images of a specific subject bound to a rare token, with a prior-preservation loss on generated images of the same class to prevent language drift - the failure where the model forgets what 'dog' means because you taught it that one dog. Higher fidelity than LoRA and a much larger artifact; DreamBooth-with-LoRA is the common compromise. (5) FULL FINE-TUNING of the U-Net on a large domain dataset - thousands to millions of images. This is what you do for a genuinely different domain (medical imaging, satellite, industrial), and it needs real compute and care about catastrophic forgetting. (6) FINE-TUNE THE AUTOENCODER, which almost nobody does and which is often the right answer. If your domain has structure the general VAE reconstructs poorly - text-heavy documents, fine medical detail, unusual colour statistics - the round-trip test will show it, and no amount of U-Net training will fix it. Fine-tuning the VAE on domain images is cheap and raises the ceiling. (7) CONTROLNET, if the requirement is SPATIAL control rather than appearance. THE DECISION PROCEDURE. First run the ENCODE-DECODE ROUND TRIP on domain images. If the autoencoder loses what matters, fix that before anything else - this is the step people skip and it determines whether the rest is even possible. Then ask what kind of adaptation is needed: a specific SUBJECT (textual inversion or DreamBooth), a STYLE (LoRA), a whole DOMAIN with different statistics (full fine-tune, and probably the VAE too), or LAYOUT control (ControlNet). Then ask how much data exists, which usually settles it: under 10 images means textual inversion or DreamBooth; tens to hundreds means LoRA; thousands or more makes full fine-tuning worth considering. THE FAILURE MODES TO PLAN FOR. CATASTROPHIC FORGETTING and language drift - the model loses general capability or the meaning of a common word; mitigate with prior preservation, low learning rates, and holding out a set of general prompts to check regression on. OVERFITTING to the training images, which shows as the model reproducing them almost verbatim - check with nearest-neighbour comparison against the training set, and this is a legal issue as well as a quality one if the images are not yours. LOSS OF PROMPT ADHERENCE, where the fine-tune dominates and the model ignores the text - test with prompts unrelated to the domain. EVALUATION: hold out domain images for FID, measure prompt adherence on both domain and general prompts, run the memorization check, and get domain-expert review, because in specialized domains the failures that matter (an anatomically impossible structure, a physically impossible product configuration) are invisible to every automatic metric and obvious to a practitioner."
        },
        {
          "q": "Why did diffusion backbones move from U-Nets to transformers?",
          "a": "THE STARTING POINT. Diffusion models were built on U-Nets because the task looks like dense image-to-image prediction, which is what U-Nets were designed for: a convolutional encoder-decoder with skip connections preserving spatial detail across the bottleneck, plus attention blocks inserted at lower resolutions where it is affordable. It worked extremely well and defined the architecture for years. WHAT CHANGED - the Diffusion Transformer result (Peebles & Xie, DiT). Replace the U-Net with a plain transformer operating on patches of the latent, conditioning through adaptive layer norm, and the finding was that DiT SCALES BETTER: performance improves smoothly and predictably with model FLOPs, and the largest DiT beat comparable U-Net models on ImageNet generation. The scaling behaviour, not a fixed-size win, is the important part. WHY TRANSFORMERS SCALE BETTER HERE. (1) FEWER INDUCTIVE BIASES. A U-Net hard-codes locality and a multi-resolution hierarchy. Those biases help enormously at small scale and become constraints at large scale - the same story as CNNs versus ViTs in classification, with the same crossover shape. (2) GLOBAL ATTENTION EVERYWHERE. A U-Net can only afford attention at low resolutions; a transformer on latent patches attends globally at every layer, which matters for long-range coherence and compositional structure. (3) UNIFORM ARCHITECTURE means scaling is a matter of width, depth, and patch size rather than redesigning a hierarchy - so the scaling laws that the field understands for language models apply. (4) INFRASTRUCTURE REUSE: every optimization built for transformer training and serving - FlashAttention, sequence and tensor parallelism, mature kernels - applies immediately. This is a much larger practical advantage than it sounds. (5) MULTIMODAL UNIFICATION: if text and images are both token sequences, one architecture handles both, which is where the field is heading. WHAT LATENT SPACE MADE POSSIBLE. Note the dependency: a transformer over pixel patches at 512x512 would be prohibitive, but over a 64x64 latent it is 4096 tokens at patch size 1, or 1024 at patch size 2 - entirely tractable. Latent compression is what made the transformer backbone affordable, so the two design choices are complementary rather than independent. THE COSTS. Transformers need more data and compute to reach the same quality at small scale, since they lack the U-Net's helpful priors. Attention is quadratic in token count, which bounds resolution unless you compress harder or use efficient attention. And the loss of explicit multi-resolution structure means the model must learn scale hierarchy from data. WHERE THINGS STAND. SD3, Flux, and Sora all use transformer backbones (MMDiT-style variants handling text and image tokens jointly), typically paired with flow-matching objectives rather than the original DDPM parameterization. U-Nets remain competitive at smaller scales and in constrained settings. THE PATTERN WORTH NAMING, because it is the third time it has appeared in this curriculum: an architecture with strong task-specific inductive biases wins at small scale, a more general architecture wins at large scale once data and compute are sufficient, and the crossover point moves as compute grows. CNNs to ViTs, task-specific NLP models to language models, U-Nets to DiTs. That is a useful prior when someone proposes a highly-structured architecture for a problem that is about to get a lot more compute."
        },
        {
          "q": "What is the zero-terminal-SNR problem, and why does it matter?",
          "a": "THE BUG. The standard noise schedules - linear and cosine - do not actually reach zero signal-to-noise ratio at the final timestep. At t = T the latent still contains a small amount of signal from the original image. During TRAINING that is harmless: the model sees x_T with a residual trace of the data and learns to denoise from there. At INFERENCE you start from PURE Gaussian noise, which contains no signal at all. So there is a train/test mismatch at the single most important step - the first one, which determines the overall composition. THE VISIBLE CONSEQUENCE, and it is a specific and recognizable one. Because the model was trained expecting a faint trace of the true image at t = T, and the strongest low-frequency component of that trace is the image's MEAN BRIGHTNESS, the model implicitly relies on being told roughly how bright the output should be. At inference nobody tells it, so it defaults to the dataset average - medium grey. Stable Diffusion 1.x notoriously cannot produce a genuinely dark image ('a solid black background', 'a photo at midnight') or a genuinely bright one; everything regresses toward medium brightness. Users spent years assuming this was a prompting problem or a data problem. It was a schedule bug. THE DIAGNOSIS (Lin et al., 'Common Diffusion Noise Schedules and Sample Steps Are Flawed'). They identified three related issues: the schedule does not enforce zero terminal SNR; the sampler starts from the wrong distribution relative to training; and the standard practice of sampling a subset of timesteps compounds it. THE FIX, which is a set of coordinated changes rather than one line. (1) RESCALE THE SCHEDULE so that alpha_bar at T is exactly zero, giving genuine pure noise at the final step. (2) TRAIN WITH V-PREDICTION rather than epsilon-prediction. This matters because at zero SNR the epsilon parameterization degenerates - if the input is pure noise, predicting the noise is trivial and uninformative, so there is no learning signal at that step. The v-parameterization (predicting a velocity that interpolates between the noise and the data prediction) remains well-conditioned across the whole range including the endpoints. (3) Change the sampler to start from the last timestep properly. (4) Rescale classifier-free guidance to correct the variance change guidance introduces. THE RESULT: models can then produce the full brightness range, and the improvement on dark and bright prompts is dramatic and immediately visible. WHY IT MATTERS BEYOND THE SPECIFIC FIX, which is the reason this is a good question. (a) It is a TRAIN/INFERENCE MISMATCH - the model was trained on a distribution it never sees at deployment. That class of bug is everywhere in ML and is systematically under-looked-for, because everything about training looks correct. (b) It went unnoticed for YEARS in the most-used generative model in the world, with thousands of people working on it, and the symptom was attributed to everything except the schedule. That is a lesson about how a plausible alternative explanation ('the training data is mostly medium-brightness') can prevent anyone from checking the actual cause. (c) It shows that the noise schedule is a MODELLING DECISION with observable consequences, not a hyperparameter to copy from the previous paper - which is how it had been treated. (d) The parameterization interacts with the schedule: epsilon-prediction is fine on the old schedule and broken on the corrected one, so fixing one thing required fixing another. Coupled defaults are exactly where this kind of bug hides. THE HABIT I would take from it: when a model has a systematic, direction-consistent bias in its outputs, check whether the inference procedure matches the training procedure exactly before concluding anything about the data or the architecture."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Latent diffusion",
        "back": "Run diffusion in a frozen autoencoder's latent space. 512x512x3 -> 64x64x4 = ~48x fewer elements, paid on EVERY denoising step. The objective is unchanged - only the space differs."
      },
      {
        "type": "intuition",
        "front": "Perceptual vs semantic compression",
        "back": "Most bits in an image are high-frequency detail contributing little to meaning, and pixel diffusion spends most of its capacity there. Let a cheap autoencoder strip it - reconstruction is far easier than generation because the answer is the input."
      },
      {
        "type": "pitfall",
        "front": "The latent scale factor",
        "back": "0.18215 in Stable Diffusion. The noise schedule assumes ~unit-variance data; raw SD latents have std ~5.5. Omit it and the SNR is wrong at every timestep - output looks washed out or noisy, which reads as a model defect."
      },
      {
        "type": "pitfall",
        "front": "The autoencoder is a hard ceiling",
        "back": "Whatever it cannot reconstruct, the system can NEVER generate. Small faces and in-image text degrade in the round trip alone - unfixable by any U-Net, sampler, or prompt. SD3/Flux raised latent channels 4 -> 16 for exactly this."
      },
      {
        "type": "definition",
        "front": "The round-trip test",
        "back": "Encode a real image, decode immediately, no diffusion. Whatever is lost bounds everything downstream. If a flaw survives the round trip it is an AUTOENCODER problem; if the round trip is clean it is a diffusion problem. Ten lines that partition the failure space."
      },
      {
        "type": "intuition",
        "front": "Why the KL weight is tiny",
        "back": "The autoencoder is a COMPRESSOR - the diffusion model supplies the prior. Strong regularization would trade reconstruction fidelity for a property nothing downstream needs. Trained with perceptual + patch-adversarial losses, then FROZEN."
      },
      {
        "type": "definition",
        "front": "Downsampling factor f",
        "back": "Rombach et al. swept it: f = 4-8 optimal. Below, little is saved; above, the autoencoder discards semantics that are then unrecoverable. An empirical trade, not a free parameter."
      },
      {
        "type": "intuition",
        "front": "Latent vs cascaded pixel diffusion",
        "back": "Latent: one model + one reusable autoencoder, cheaper, but a fixed reconstruction ceiling. Cascaded (Imagen): pixel-space base + SR stages, no ceiling, more models. Latent won partly on cost and partly because a shared VAE enabled an open ecosystem."
      },
      {
        "type": "definition",
        "front": "Noise conditioning augmentation",
        "back": "The cascade line's durable idea: train each super-resolution stage on deliberately DEGRADED versions of what the previous stage will actually produce, not on ground truth it will never see. General exposure-bias fix for staged pipelines."
      },
      {
        "type": "pitfall",
        "front": "Zero-terminal-SNR",
        "back": "Standard schedules do not reach SNR=0 at t=T, so training keeps a faint signal trace while inference starts from PURE noise. The model leans on that trace for mean brightness -> SD 1.x cannot make genuinely dark or bright images. Fix: rescale the schedule AND switch to v-prediction."
      },
      {
        "type": "intuition",
        "front": "U-Net -> transformer backbones",
        "back": "DiT scales better with FLOPs: fewer inductive biases, global attention at every layer, and the whole transformer infrastructure applies. LATENT COMPRESSION is what makes it affordable (64x64 latent = ~1-4k tokens). Third instance of general-beats-specific at scale."
      },
      {
        "type": "intuition",
        "front": "Adaptation ladder for a new domain",
        "back": "Prompting -> textual inversion (3-5 imgs, KBs) -> LoRA (tens of imgs, MBs) -> DreamBooth -> full U-Net fine-tune -> and the one everyone skips: FINE-TUNE THE VAE, which is the only fix if the round trip loses what matters."
      }
    ],
    "refs": [
      {
        "title": "Rombach et al. (2022), High-Resolution Image Synthesis with Latent Diffusion Models",
        "url": "https://arxiv.org/abs/2112.10752"
      },
      {
        "title": "Peebles & Xie (2023), Scalable Diffusion Models with Transformers (DiT)",
        "url": "https://arxiv.org/abs/2212.09748"
      },
      {
        "title": "Lin et al. (2024), Common Diffusion Noise Schedules and Sample Steps Are Flawed",
        "url": "https://arxiv.org/abs/2305.08891"
      },
      {
        "title": "Saharia et al. (2022), Photorealistic Text-to-Image Diffusion Models (Imagen, cascaded pixel diffusion)",
        "url": "https://arxiv.org/abs/2205.11487"
      },
      {
        "title": "Podell et al. (2023), SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis",
        "url": "https://arxiv.org/abs/2307.01952"
      }
    ],
    "demos": [
      "diffusion",
      "vae",
      "quantization",
      "embeddings"
    ]
  },
  "diffusion-guidance": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Diffusion's one structural disadvantage in the generative trilemma was SPEED. DDPM sampling ran the network a thousand times to produce one image, against a GAN's single forward pass. That looked like a fundamental cost of iterative refinement, and for about a year it was treated as one. It was not, and how it was dismantled is the most instructive engineering story in generative modelling.",
        "The key reframing is that DIFFUSION SAMPLING IS NUMERICAL INTEGRATION. Song et al. showed the reverse process has a deterministic counterpart - the PROBABILITY FLOW ODE - whose solution has the same marginals as the stochastic one. Once you see sampling as solving an ODE, the thousand steps stop looking like a property of the model and start looking like what they are: Euler's method with a very small step size. And numerical analysis has spent seventy years building better integrators than Euler. DDIM is essentially that observation applied once; DPM-Solver applies it properly, exploiting the semi-linear structure of the ODE to get comparable quality in 10-20 steps. Distillation and consistency models then went further, training a network to jump directly to the solution in one to four steps.",
        "So the trilemma's third corner turned out to be the tractable one - which is the real reason diffusion displaced GANs rather than sharing the field with them. Nobody found a comparable fix for mode collapse. The second half of this lesson is the other thing the speed story forces on you: EVALUATION. Every knob here - step count, sampler, guidance scale - moves quality and diversity in opposite directions, so a single FID number describes a point, not a model. The honest report is a curve, and the most important fact about that curve is that FID is minimized around guidance 1-3 while human preference peaks near 7-8. The metric and the user want different things, and knowing which you are serving is the actual decision."
      ],
      "math": [
        {
          "h": "The probability flow ODE: sampling as integration",
          "paras": [
            "The reverse-time SDE has a deterministic ODE with identical marginal distributions at every time. Removing the noise term makes sampling a solvable initial-value problem - which is what unlocks every fast sampler."
          ],
          "tex": "\\mathrm{d}x = \\Big[f(x,t) - \\tfrac{1}{2}g(t)^2 \\nabla_x \\log p_t(x)\\Big]\\mathrm{d}t, \\qquad \\nabla_x \\log p_t(x) \\approx -\\frac{\\epsilon_\\theta(x,t)}{\\sigma_t}",
          "texNote": "The network's noise prediction IS a score estimate up to scaling, so a trained diffusion model already gives you the ODE's right-hand side. Sampling is then integration, and the step count is a DISCRETIZATION choice rather than a property of the model."
        },
        {
          "h": "DDIM: deterministic, non-Markovian, skippable",
          "paras": [
            "DDIM constructs a family of non-Markovian forward processes with the same marginals as DDPM, so a DDPM-trained model can be sampled with far fewer steps. Setting eta = 0 makes it fully deterministic, which additionally makes the map from noise to image invertible."
          ],
          "tex": "x_{t-1} = \\sqrt{\\bar\\alpha_{t-1}}\\underbrace{\\left(\\frac{x_t - \\sqrt{1-\\bar\\alpha_t}\\,\\epsilon_\\theta}{\\sqrt{\\bar\\alpha_t}}\\right)}_{\\text{predicted } x_0} + \\sqrt{1-\\bar\\alpha_{t-1}-\\eta^2\\sigma_t^2}\\;\\epsilon_\\theta + \\eta\\sigma_t \\epsilon",
          "texNote": "eta = 1 recovers DDPM; eta = 0 is the deterministic ODE solver. NO RETRAINING is required - the same weights work - which is why DDIM was adopted immediately and universally."
        },
        {
          "h": "Why a better solver helps so much",
          "paras": [
            "The diffusion ODE is SEMI-LINEAR: an exactly-solvable linear part plus a nonlinear term involving the network. DPM-Solver solves the linear part analytically and applies a higher-order approximation only to the nonlinear remainder, so the error per step falls much faster than Euler's."
          ],
          "tex": "x_t = \\underbrace{\\frac{\\alpha_t}{\\alpha_s}x_s}_{\\text{exact}} - \\alpha_t\\!\\!\\int_{\\lambda_s}^{\\lambda_t}\\!\\! e^{-\\lambda}\\hat\\epsilon_\\theta \\,\\mathrm{d}\\lambda, \\qquad \\text{error} = O(h^{k+1}) \\text{ for order } k",
          "texNote": "lambda = log-SNR, the natural integration variable. First order recovers DDIM; second and third order give usable samples in 10-20 network evaluations. All of this is post-hoc - the model is unchanged."
        },
        {
          "h": "Consistency models: learn the solution map directly",
          "paras": [
            "Rather than integrating the ODE, train a network whose output is CONSTANT along each ODE trajectory - so evaluating it at any point on the path jumps straight to the endpoint. This is what makes one-step sampling possible."
          ],
          "tex": "f_\\theta(x_t, t) = f_\\theta(x_{t'}, t') \\;\\;\\forall t,t' \\text{ on the same trajectory}, \\qquad f_\\theta(x_\\varepsilon,\\varepsilon) = x_\\varepsilon",
          "texNote": "The boundary condition is enforced by parameterization. Trained by distillation from a teacher, or standalone. One step is usable; two to four steps are close to the full-sampler quality, which effectively removes diffusion's speed disadvantage."
        }
      ],
      "code": [
        {
          "h": "The step-count story, measured",
          "paras": [
            "The numbers are the lesson. Note that the model is IDENTICAL across the first four rows - only the integrator changed."
          ],
          "code": "# Same trained model. Only the sampler differs.\n#\n#   sampler              steps   relative quality      notes\n#   DDPM (ancestral)      1000   reference             stochastic, original\n#   DDPM                    50   badly degraded        naive step-skipping fails\n#   DDIM (eta=0)            50   ~reference            deterministic ODE, no retrain\n#   DDIM                    20   slightly soft\n#   DPM-Solver++ (2M)       20   ~reference            higher-order solver\n#   DPM-Solver++ (2M)       10   very close\n#   ---- these DO require extra training ----\n#   LCM / consistency        4   close                 distilled\n#   consistency / ADD        1   usable                one forward pass\n#\n# THE POINT: rows 3-6 need NO retraining whatsoever. The thousand steps were\n# never a property of the model - they were Euler's method with a tiny step\n# size, and better integrators were sitting in the numerical analysis\n# literature the whole time.\n#\n# Only the last two rows change the model, and they are attacking a different\n# thing: instead of integrating the ODE faster, they learn its solution map.\n\n# Swapping samplers is usually one line:\npipe.scheduler = DPMSolverMultistepScheduler.from_config(\n    pipe.scheduler.config, algorithm_type=\"dpmsolver++\", solver_order=2)\nimage = pipe(prompt, num_inference_steps=20, guidance_scale=7.5).images[0]",
          "caption": "A 50-fold reduction in sampling cost with the same weights, purely by treating sampling as an integration problem. Distillation then takes 20 steps to 1-4, at the cost of an extra training stage."
        },
        {
          "h": "Evaluate a curve, not a point",
          "paras": [
            "Every knob in this lesson trades quality against diversity, so any single number is a choice of operating point disguised as a measurement."
          ],
          "code": "results = []\nfor w in [1.0, 2.0, 3.0, 5.0, 7.5, 10.0, 15.0]:\n    imgs = generate(prompts, guidance_scale=w, num_inference_steps=30)\n    results.append({\n        \"w\": w,\n        \"fid\":  fid(imgs, reference, n=10_000),   # SAME n every time\n        \"clip\": clip_score(imgs, prompts),\n        \"div\":  mean_pairwise_lpips(imgs_per_prompt),\n        \"pref\": pickscore(imgs, prompts),          # learned human preference\n    })\n\n#    w     FID     CLIP    diversity   human-pref\n#   1.0    9.8     0.24      high         low\n#   3.0   11.2     0.29      good         medium\n#   7.5   17.5     0.32      reduced      HIGHEST\n#  15.0   28.1     0.33      low          falling\n#\n# FID is minimized at w~1-3. Human preference peaks near 7-8. They DISAGREE,\n# because FID rewards matching the DATA DISTRIBUTION while users want striking,\n# on-prompt single images. Tuning on FID ships a model nobody likes.\n#\n# REPORT THE CURVE. A model that dominates another across the whole FID-CLIP\n# frontier is genuinely better; one that wins at a single setting was tuned to\n# a metric. And state n for FID - it is a BIASED estimator that falls as n\n# rises, so 10k and 50k numbers are not comparable.\n#\n# Learned preference models (PickScore, HPSv2, ImageReward) are trained on\n# human comparisons and track preference far better than FID or CLIP score -\n# but they are themselves models, so they can be over-optimized against.",
          "caption": "FID and human preference are minimized and maximized at different guidance scales. Reporting one number picks an operating point; reporting the FID-versus-CLIP frontier reports the model."
        }
      ],
      "useCases": [
        "Production text-to-image serving, where the step count is the dominant cost driver and moving from 50 DDIM steps to 20 DPM-Solver++ steps is a direct 2.5x throughput gain with no retraining and no quality loss.",
        "Real-time and interactive generation - live canvas tools, in-editor previews, on-device apps - which require distilled few-step or one-step models and were simply impossible before consistency-style methods.",
        "Image editing via DDIM INVERSION: because eta=0 sampling is deterministic and invertible, you can map a real image back to the noise that would produce it, edit the conditioning, and re-generate - the basis of prompt-based real-image editing.",
        "Model selection and release evaluation, where reporting the FID-versus-prompt-adherence frontier across guidance scales - rather than a single tuned number - is what makes two models honestly comparable."
      ],
      "pitfalls": [
        "Reporting FID at one guidance scale. Every quality number moves with w, and FID is minimized around w = 1-3 while human preference peaks near 7-8. Report the FID-versus-CLIP frontier across a sweep, or you are reporting a tuning choice.",
        "Comparing FID values computed with different sample counts or different Inception implementations. FID is a biased estimator that falls as n rises, so 10k and 50k numbers are not comparable and neither is a PyTorch number against a TensorFlow one.",
        "Naively skipping DDPM steps. Ancestral sampling degrades badly at low step counts; you need a sampler designed for it (DDIM, DPM-Solver), and the swap is usually one line with no retraining.",
        "Assuming a sampler that works at 50 steps works at 10. Solver order, the timestep spacing (uniform versus log-SNR-uniform), and the guidance scale all interact, and the optimal guidance scale is typically LOWER for few-step samplers.",
        "Over-optimizing a learned preference model. PickScore, HPSv2, and ImageReward track human judgment far better than FID - and they are models, so tuning hard against them finds their biases, which is Goodhart's law with a specific mechanism.",
        "Forgetting that guidance doubles the cost per step. A 20-step guided sample is 40 network evaluations, so step-count comparisons that ignore guidance understate the real cost by 2x.",
        "Treating the noise schedule as a hyperparameter to copy. The zero-terminal-SNR defect in the standard schedules is a genuine train/inference mismatch, and fixing it requires changing the parameterization to v-prediction as well."
      ],
      "connections": [
        {
          "ref": "generative/ebm-score",
          "text": "The score-based SDE framework is where the probability flow ODE comes from - it is what unified DDPM and NCSN and made 'sampling is integration' available as a reframing."
        },
        {
          "ref": "generative/conditional-generation",
          "text": "Classifier-free guidance supplies the quality-diversity dial whose curve this lesson measures, and its 2x per-step cost is a first-order term in any sampling budget."
        },
        {
          "ref": "generative/gan",
          "text": "FID, Inception Score, and precision/recall were all built to evaluate GANs and carry their biases into diffusion evaluation unchanged - including conflating quality with coverage."
        },
        {
          "ref": "generative/latent-diffusion",
          "text": "Latent compression and few-step sampling multiply: ~48x fewer elements per step times 50x fewer steps is what made consumer-hardware generation possible."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "The same evaluation discipline applies - proxies diverge from what you care about, learned metrics are over-optimizable, and reporting a single number hides the operating point."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why was DDPM sampling so slow?",
          "a": "It ran the network once per timestep for ~1000 steps. Structurally that is Euler integration of the reverse process with a very small step size."
        },
        {
          "q": "What is the probability flow ODE?",
          "a": "A deterministic ODE whose solution has the same marginal distributions at every time as the reverse SDE. It reframes sampling as an initial-value problem you can solve with any integrator."
        },
        {
          "q": "What is DDIM?",
          "a": "A non-Markovian forward process with the same marginals as DDPM, so a DDPM-trained model can skip steps. With eta = 0 it is deterministic - and requires NO retraining."
        },
        {
          "q": "Why does determinism matter beyond speed?",
          "a": "It makes the noise-to-image map invertible, so you can DDIM-invert a real image to its latent noise, change the conditioning, and regenerate - the basis of real-image editing."
        },
        {
          "q": "What does DPM-Solver exploit?",
          "a": "The diffusion ODE is SEMI-LINEAR. Solve the linear part exactly and apply a higher-order approximation only to the nonlinear network term, giving error O(h^(k+1)) instead of Euler's O(h^2)."
        },
        {
          "q": "How few steps are usable?",
          "a": "DPM-Solver++ at 10-20 steps is close to reference with no retraining. Distilled consistency or LCM models are usable at 1-4 steps, at the cost of an extra training stage."
        },
        {
          "q": "What is a consistency model?",
          "a": "A network trained so its output is CONSTANT along each ODE trajectory - evaluating it anywhere on the path jumps straight to the endpoint. That is what makes one-step sampling possible."
        },
        {
          "q": "What does guidance cost per step?",
          "a": "Two forward passes (conditional and unconditional), so ~2x. A 20-step guided sample is 40 network evaluations - step counts quoted without this understate the cost."
        },
        {
          "q": "Where is FID minimized versus human preference?",
          "a": "FID around w = 1-3; human preference and prompt adherence peak near 7-8. They measure different things - distribution matching versus striking on-prompt images."
        },
        {
          "q": "Why is FID not comparable across papers?",
          "a": "It is a biased estimator that decreases with more samples, and it depends on the exact Inception implementation. Always state n and the implementation."
        },
        {
          "q": "What are PickScore, HPSv2, ImageReward?",
          "a": "Models trained on human preference comparisons. They track human judgment far better than FID or CLIP score - and being models, they can be over-optimized against."
        },
        {
          "q": "How should a diffusion model be reported?",
          "a": "As a CURVE - FID against prompt adherence across a guidance sweep, at a stated step count and sample size. A single number is an operating point, not a measurement."
        }
      ],
      "standard": [
        {
          "q": "Diffusion needed 1000 sampling steps and now needs 1-20. Walk through how that happened.",
          "a": "THE STARTING POINT. DDPM's reverse process is Markovian: each step removes a little noise, and the derivation assumes small steps, so you need roughly as many sampling steps as training timesteps - a thousand network evaluations per image. Against a GAN's single forward pass this looked like a fundamental cost of iterative refinement, and it was diffusion's one clear disadvantage in the trilemma. STEP 1 - DDIM (Song et al., 2020). The insight is that DDPM's training objective only depends on the MARGINALS q(x_t | x_0), not on the specific Markovian forward process used to derive it. So you can construct a family of NON-MARKOVIAN forward processes with the same marginals, and a model trained under DDPM's objective is valid for all of them. One member of that family is deterministic (eta = 0) and permits sampling on an arbitrary SUBSET of timesteps. Result: 50 steps at near-reference quality, with no retraining. That last point is why adoption was immediate - it was a free 20x. STEP 2 - THE SDE/ODE REFRAMING (Song et al., 2021). Diffusion is a stochastic differential equation, and every diffusion SDE has a corresponding PROBABILITY FLOW ODE with identical marginals at every time. This is the conceptual turning point: sampling is not a special stochastic procedure, it is SOLVING AN ODE, and the model's noise prediction is a score estimate that gives you the right-hand side. DDIM is revealed as the first-order Euler discretization of that ODE. And once the problem is named as numerical integration, seventy years of numerical analysis becomes applicable. STEP 3 - BETTER SOLVERS. Off-the-shelf Runge-Kutta helps. The bigger win is exploiting STRUCTURE: the diffusion ODE is semi-linear, with an exactly-solvable linear part and a nonlinear term containing the network. DPM-Solver solves the linear part analytically and approximates only the remainder, using log-SNR as the integration variable. Second- and third-order versions produce reference-quality samples in 10-20 network evaluations. Still no retraining - this is post-hoc, and swapping the sampler is one line of code. STEP 4 - DISTILLATION, which changes the model and attacks a different quantity. PROGRESSIVE DISTILLATION (Salimans & Ho) trains a student to take one step matching the teacher's two, then repeats - halving the step count each round down to 4 or fewer. CONSISTENCY MODELS (Song et al.) train a network whose output is constant along an ODE trajectory, so evaluating it at any point jumps directly to the endpoint; one step is usable, two to four are close to full quality. LATENT CONSISTENCY MODELS bring this to Stable Diffusion, and ADVERSARIAL DIFFUSION DISTILLATION (SDXL-Turbo) adds a discriminator - notably borrowing from GANs to recover a GAN-like sampling cost. GUIDANCE DISTILLATION separately trains a network to emit the guided prediction directly, recovering the 2x that classifier-free guidance costs. THE SHAPE OF THE STORY, which is what I would want to convey. Steps 1-3 were pure REFRAMING: the same model, the same weights, a better understanding of what sampling is, and a 50x reduction. Step 4 traded extra training for further gains. That is the difference between recognizing your problem is a known problem in another field and grinding on it as a novel one. AND WHY IT MATTERED STRATEGICALLY: the trilemma says you give up one of quality, coverage, and speed. Diffusion gave up SPEED, which turned out to be the most tractable - it is a discretization and distillation problem, both well-understood. Nobody found a comparable fix for GAN mode collapse or VAE blur, because those are properties of the objective rather than of the sampling procedure. The family that gave up the fixable constraint won, and that is a useful lens on any apparently-forced trade.",
          "deepDive": {
            "q": "What is DDIM inversion, and how does it enable real-image editing?",
            "a": "THE CAPABILITY. Given a REAL photograph, recover the noise that a deterministic sampler would turn into that image; then change the conditioning and re-run the sampler forward to get an edited version that preserves the original's structure. This is what makes 'change the dog to a cat, keep everything else' work on real photos rather than only on generated ones. WHY IT IS POSSIBLE. DDIM with eta = 0 is a DETERMINISTIC map from noise to image - it is an ODE solve, and ODE solves are reversible. So you can run the same discretization BACKWARDS: instead of stepping from x_t to x_{t-1}, step from x_{t-1} to x_t, using the model's prediction at each point. After T steps you have x_T, the noise that maps to your image. Stochastic DDPM sampling has no such inverse, which is why the deterministic variant matters for editing far beyond its speed benefit. THE PROBLEM, and it is substantial. Inversion assumes the model's prediction at x_t is the same going forwards and backwards, which is only true in the limit of infinitesimal steps. With a practical step count the error ACCUMULATES, and the reconstruction drifts. Worse, the drift is much larger WITH classifier-free guidance: inversion is typically done at guidance 1 (where it is reasonably accurate), but generation is done at guidance 7.5, so the forward pass follows a substantially different trajectory than the one you inverted. Naive invert-then-regenerate at high guidance often fails to reconstruct the original at all, which surprises people who expect it to be exact. THE FIXES, which are the interesting part. (1) NULL-TEXT INVERSION (Mokady et al.): keep the inverted trajectory as a target and OPTIMIZE the null-text embedding at each timestep so that guided generation follows it. You are fine-tuning the unconditional anchor per-image so the high-guidance path matches the low-guidance inversion. Accurate, and it costs an optimization loop per image. (2) NEGATIVE-PROMPT INVERSION approximates the same thing in closed form, much faster. (3) EDIT-FRIENDLY INVERSION deliberately stores the per-step noises so reconstruction is exact by construction, trading some editability. (4) For latent-consistency and few-step models, specialized inversion schemes exist. THE EDITING METHODS BUILT ON IT. PROMPT-TO-PROMPT manipulates CROSS-ATTENTION MAPS between the source and target generations - injecting the source's attention maps for unchanged words preserves layout while the changed word alters content. This is the key idea: the attention maps encode WHERE things are, so preserving them preserves structure. PLUG-AND-PLAY injects spatial features rather than attention. MASACTRL manipulates self-attention for non-rigid edits. And InstructPix2Pix takes a different route entirely - train a model on synthetic (image, instruction, edited image) triples so editing is a conditional generation task with no inversion needed, which is more robust and less flexible. THE PRACTICAL STATE. Inversion-based editing is powerful and fiddly: it works well for some images and edits and fails unpredictably for others, it needs per-image tuning for good results, and it is slow. Instruction-tuned editing models and inpainting-with-masks are more robust and are what most products actually ship. But inversion remains the technique when you need to preserve a real image's exact structure while changing its semantics, and the underlying observation - that deterministic sampling gives you an invertible map between noise and images - is worth knowing as a general property rather than as an editing trick."
          }
        },
        {
          "q": "How would you evaluate two text-to-image models against each other?",
          "a": "THE FIRST THING I WOULD ESTABLISH is that a single number cannot do this, because every quality metric moves with the guidance scale and the step count, and those are free parameters. Comparing model A at its best settings against model B at whatever settings the paper reported is not a comparison. THE PROTOCOL. (1) FIX WHAT YOU CAN. Same prompt set, same number of samples, same reference set for FID, same Inception implementation, same seed policy. State the step count and sampler for each - if they differ, you are also comparing samplers. (2) SWEEP GUIDANCE and plot the FID-versus-CLIP-SCORE FRONTIER for each model. This is the single most informative plot in text-to-image evaluation. A model whose frontier dominates the other's everywhere is genuinely better; one that wins only at a particular setting was tuned to a metric. (3) MEASURE THE AXES SEPARATELY. Quality/distribution match: FID at a stated n. Prompt adherence: CLIP score as a weak baseline, plus something better - VQA-based scoring (TIFA, VQAScore) asks structured questions about the generated image and is far more sensitive to compositional errors than CLIP, which saturates. Diversity: generate many samples per prompt and measure mean pairwise LPIPS, since a model that produces one image per prompt looks fine on FID and CLIP and is not doing conditional generation. (4) LEARNED PREFERENCE MODELS - PickScore, HPSv2, ImageReward - are trained on human comparisons and track preference substantially better than FID or CLIP. I would report one, with the caveat that they are models and therefore over-optimizable. (5) COMPOSITIONAL BENCHMARKS specifically: attribute binding, counting, spatial relations, negation. These are the known systematic failures and every general metric misses them. T2I-CompBench and similar exist for exactly this. (6) HUMAN EVALUATION as the anchor: pairwise forced choice on a fixed prompt set, randomized order, blind, enough items for a confidence interval, with inter-annotator agreement reported. This is what everything else is a proxy for, and I would run it once properly rather than continuously. THE THINGS THAT ARE ROUTINELY OMITTED AND SHOULD NOT BE. (a) COST. Two models are not comparable if one needs 50 steps and the other 20, or if one is 3x the parameters. Report quality at matched inference FLOPs - the honest frontier is quality against compute, and a model that wins only by spending more has not won. (b) A MEMORIZATION CHECK: nearest training-set neighbours for the best samples. Models trained on captioned web data have been shown to reproduce training images for certain prompts, which is a legal exposure, not a quality metric. (c) FAILURE-MODE ANALYSIS: hands, faces, text rendering, unusual compositions. Aggregate metrics hide these completely and users notice them immediately. (d) PROMPT-SET BIAS: a model tuned on MS-COCO-style captions will win on a COCO prompt set. Use prompts representative of your actual use. WHAT I WOULD ACTUALLY DELIVER: a table with FID/CLIP/preference/diversity at matched compute for several guidance scales, the frontier plot, a compositional breakdown, a human pairwise result, and a page of hand-picked failure cases for each model. And I would lead with the observation that decides most real decisions: FID is minimized near w=1-3 and human preference peaks near 7-8, so if the two models were each tuned on FID, both are being evaluated at a setting no user would choose."
        },
        {
          "q": "What are the trade-offs of distilled few-step diffusion models?",
          "a": "WHAT DISTILLATION BUYS. A 50-step guided sample is 100 network evaluations; a one-step distilled model is one. That is a hundredfold reduction in inference cost, and it is the difference between a batch service and a real-time interactive one - live canvas editing, in-editor previews, on-device generation. For a high-volume product it is also the difference between viable and not. THE METHODS, briefly, because they differ in what they cost. PROGRESSIVE DISTILLATION halves the step count repeatedly, each stage training a student to match two teacher steps - stable, and it needs several training rounds. CONSISTENCY DISTILLATION trains a student whose output is constant along a teacher's ODE trajectory, reaching 1-4 steps in one training stage. LATENT CONSISTENCY MODELS apply this to Stable Diffusion, and LCM-LoRA packages it as a small adapter, which is a neat practical trick - you can add few-step sampling to an existing fine-tune without retraining it. ADVERSARIAL DIFFUSION DISTILLATION (SDXL-Turbo) adds a discriminator to the distillation objective, borrowing the GAN's ability to make single-step output look sharp. GUIDANCE DISTILLATION separately folds classifier-free guidance into one pass, recovering its 2x. WHAT IT COSTS, and the list is longer than the marketing suggests. (1) SAMPLE DIVERSITY DROPS, sometimes sharply. Multi-step sampling explores a trajectory; a one-step model learns a more direct map from noise to image and tends to produce less varied output for the same prompt. This is measurable with per-prompt LPIPS and is under-reported. (2) QUALITY AT THE TOP END is usually below the teacher's best. Few-step models are excellent on average and lose the last increment of detail and coherence, which matters for hero images and not for previews. (3) The GUIDANCE DIAL is often FIXED at distillation time. Distilled models frequently expect a specific guidance scale or have guidance baked in, so the user-facing quality-diversity slider disappears - which is a real product regression, not just a technical one. (4) An EXTRA TRAINING STAGE, with its own compute, hyperparameters, and failure modes, and it must be redone whenever the base model changes. (5) COMPOSABILITY suffers: distilled models interact awkwardly with LoRAs, ControlNets, and inpainting pipelines built for the multi-step base, because those were tuned against a different trajectory. (6) ADVERSARIAL distillation reintroduces GAN training instability into a pipeline that had been free of it - a genuine irony worth noting. HOW I WOULD DEPLOY THIS. A CASCADE, which is what mature products do: use the few-step model for INTERACTIVE preview - the user is exploring, dragging a slider, iterating on a prompt, and they want latency far more than they want the last 5% of quality - and the full multi-step model for the FINAL RENDER once the user commits. The user experience is dominated by the fast path and the output quality by the slow one. That gets most of both. WHEN I WOULD NOT DISTIL: if diversity is a product requirement (generating many options per prompt), if users need the guidance dial, if the pipeline depends on multi-step intervention (inpainting, ControlNet, editing), or if inference cost is simply not the binding constraint. THE BROADER PATTERN: distillation trades FLEXIBILITY for SPEED. The multi-step process has a hook at every step, which is what made diffusion so controllable in the first place; collapsing it to one step removes those hooks. That is the same trade as compiling versus interpreting, and it argues for keeping both paths rather than replacing one with the other."
        },
        {
          "q": "How do noise schedules and prediction parameterizations interact?",
          "a": "THE TWO CHOICES. The NOISE SCHEDULE determines how much signal remains at each timestep - alpha_bar(t), or equivalently the log-SNR trajectory. The PARAMETERIZATION determines what the network outputs: the noise (epsilon-prediction), the clean data (x0-prediction), or a velocity (v-prediction). They are usually presented as independent and they are not. SCHEDULES. LINEAR (original DDPM) destroys information too fast at the end - the last several hundred timesteps are nearly pure noise and contribute little training signal. COSINE (Nichol & Dhariwal) spends more of the schedule in the informative middle range and improved likelihoods and sample quality noticeably. The general framing that clarifies this: what matters is the distribution of LOG-SNR values you train on, because that is what determines which difficulty of denoising problem the network practises. A schedule is a choice of curriculum. Higher-resolution images need SHIFTED schedules - more noise at every step - because adjacent pixels are more correlated, so a given noise level destroys proportionally less information; SD3 makes this shift explicit as a function of resolution, and getting it wrong is a common cause of poor high-resolution results. PARAMETERIZATIONS. EPSILON-prediction is the DDPM default and works well in the middle of the schedule. Its problem is at LOW noise: if x_t is nearly clean, predicting the tiny noise component is a high-relative-error task, and the derived x0 amplifies that error. X0-prediction has the mirror problem: at HIGH noise, predicting the clean image from near-pure noise is nearly impossible and the loss is dominated by that regime. V-PREDICTION (Salimans & Ho) predicts v = alpha*epsilon - sigma*x0, a velocity that interpolates between the two, and it is well-conditioned across the ENTIRE range including both endpoints. WHERE THEY INTERACT, which is the point. (1) THE ZERO-TERMINAL-SNR FIX REQUIRES BOTH. Standard schedules do not reach SNR = 0 at t = T, which creates a train/inference mismatch (training keeps a faint signal trace, inference starts from pure noise) and is why SD 1.x cannot produce genuinely dark or bright images. Fixing the schedule to reach zero SNR BREAKS epsilon-prediction, because at exactly zero SNR the input IS the noise, so predicting the noise is trivial and carries no learning signal. So you must switch to v-prediction at the same time. Two changes, coupled, and doing one without the other makes things worse. (2) THE LOSS WEIGHTING is implicitly determined by the parameterization. The simple unweighted MSE that DDPM uses corresponds to a particular weighting over noise levels, and different parameterizations imply different weightings - so switching parameterization silently changes which timesteps the model prioritizes. Making the weighting explicit (as EDM does) decouples this and is cleaner. (3) DISTILLATION generally needs v-prediction, because progressive distillation must operate at very few steps where epsilon-prediction is poorly conditioned. THE MODERN SYNTHESIS. Karras et al.'s EDM paper reformulated the whole design space - schedule, parameterization, loss weighting, and sampler - in a common framework and showed that many published differences were reparameterizations of each other, with a small number of choices actually mattering. And FLOW MATCHING with rectified flow (SD3, Flux) sidesteps much of it: define a straight-line path from noise to data, predict the velocity along it, and both the schedule and the parameterization fall out of that single choice. Straighter paths are also easier to integrate in few steps, which connects the training formulation directly to sampling cost. WHAT I WOULD TAKE FROM THIS: these are not hyperparameters to copy from the previous paper. They are coupled modelling decisions with observable, sometimes dramatic consequences, and the zero-terminal-SNR episode - a systematic brightness bias in the world's most-used image model, unnoticed for years, caused by a schedule default - is the case study."
        },
        {
          "q": "When do you want a stochastic sampler versus a deterministic one?",
          "a": "THE TWO FAMILIES. The reverse SDE injects fresh noise at every step (DDPM ancestral sampling, SDE solvers). The probability flow ODE injects none (DDIM at eta = 0, DPM-Solver, most fast samplers). Both have the same marginal distributions in the continuous limit, so with perfect score estimates and infinitesimal steps they sample from the same thing. In practice, with an imperfect model and finite steps, they behave differently in ways that matter. WHAT DETERMINISM BUYS. (1) FAR FEWER STEPS. This is the headline: deterministic solvers reach reference quality in 10-20 network evaluations where ancestral sampling needs hundreds. Removing the noise makes the trajectory smooth and therefore integrable with a large step size, which is the entire basis of fast sampling. (2) REPRODUCIBILITY - the same seed gives exactly the same image, which matters enormously for a product where users share and re-run prompts. (3) INVERTIBILITY, which is a capability rather than a convenience: because the map from noise to image is a bijection, you can DDIM-invert a real image to its latent noise, edit the conditioning, and regenerate. Every inversion-based editing method depends on this. (4) A meaningful LATENT SPACE, so interpolating between two seeds produces a smooth semantic path. (5) EXACT LIKELIHOODS via the instantaneous change-of-variables formula on the ODE. WHAT STOCHASTICITY BUYS, and this is the part people miss. Karras et al. identified the mechanism clearly: injected noise acts as ERROR CORRECTION. A deterministic solver accumulates discretization and score-estimation error along the trajectory with no mechanism to shed it - every mistake is carried to the end. Adding noise at each step and re-denoising effectively pushes the sample back toward the correct marginal, so errors are continually washed out rather than compounded. The practical consequence is that at HIGH step counts, stochastic sampling often gives BETTER final quality than deterministic - the opposite of the low-step-count ordering. It also gives more DIVERSITY at a fixed conditioning, because the trajectory is not a deterministic function of the initial noise. THE PRACTICAL PICTURE. Few steps (under ~30): deterministic wins decisively - stochastic sampling degrades badly when the per-step noise is large relative to the correction. Many steps (100+): stochastic can edge ahead on fidelity. Karras et al.'s recommendation, which is the sophisticated answer, is a TUNABLE amount of stochasticity - their sampler adds noise only within a chosen range of noise levels, with a churn parameter controlling how much, so you can dial in as much error correction as your step budget affords. HOW I WOULD CHOOSE IN A PRODUCT. Deterministic (DPM-Solver++ or DDIM) as the default, because step count dominates serving cost and reproducibility is a user-facing feature. Stochastic if I have a generous step budget and am chasing maximum fidelity for a final render - which fits the preview-then-render cascade well: deterministic few-step for interaction, stochastic many-step for the committed output. And deterministic always when I need inversion, interpolation, or exact likelihoods, since those are simply unavailable otherwise. THE THING WORTH NAMING: this is a case where the theoretically-equivalent formulations diverge entirely because of MODEL ERROR. With a perfect score network the choice would be immaterial. The whole argument is about how each solver handles the fact that the score estimate is wrong, which is a good reminder that sampler design is numerical analysis under approximation error, not just integration."
        },
        {
          "q": "You need to cut text-to-image serving costs by 5x. What do you do?",
          "a": "I WOULD ATTACK IT IN THE ORDER OF COST-PER-UNIT-OF-EFFORT, and the first three items typically get most of the way with no model changes at all. STEP 1 - MEASURE WHERE THE COST IS. Per request: how many denoising steps, is guidance on (2x per step), what resolution, what batch size, and what fraction of GPU time is the U-Net versus the VAE decode versus the text encoder. This takes an hour and usually reveals something - a common finding is that the text encoder is being re-run for identical prompts, or that batch size is 1 because the serving layer never implemented batching. STEP 2 - THE SAMPLER, which is nearly free. If you are on 50 DDIM steps, moving to DPM-Solver++ at 20 steps is a 2.5x reduction with the same weights and one line of code. Validate quality on your own prompt distribution, not on a benchmark. This alone is half the target. STEP 3 - BATCHING AND SCHEDULING. Diffusion inference batches extremely well because every request runs the same number of steps at the same shapes. Continuous batching, or even simple request coalescing over a short window, can multiply throughput several-fold on the same hardware. Also cache the text encoder output for repeated prompts, and keep the VAE decode off the critical path where possible. STEP 4 - PRECISION AND KERNELS. fp16 or bf16 if not already; torch.compile; FlashAttention; channels-last memory format. Quantizing the U-Net to int8 is more invasive and worth testing for quality regression. These are typically 1.5-2x combined and cost only engineering time. STEP 5 - GUIDANCE DISTILLATION, which removes the 2x from classifier-free guidance by training a network to emit the guided prediction directly. One training stage, and it composes with everything above. STEP 6 - STEP DISTILLATION, if still needed. LCM-LoRA or a similar adapter gets you to 4-8 steps on top of an existing fine-tune without retraining the base, which is a good property. Full adversarial distillation gets to 1-2 steps with a larger quality and diversity cost. STEP 7 - ARCHITECTURAL: a smaller U-Net, or generating at lower resolution and upscaling with a cheap super-resolution model. The latter is underrated - many products generate at 1024 when 768 plus an upscaler is visually equivalent and much cheaper. THE PRODUCT-LEVEL LEVERS, which often beat all of the above and are usually not considered by the ML team. (a) A CASCADE: serve a fast distilled model for previews and the full model only for the final render the user commits to. Most generations in an interactive product are exploratory and discarded, so this can cut total compute by far more than 5x while IMPROVING perceived latency. (b) CACHING identical or near-identical prompts. (c) Rate-limiting or queueing free-tier traffic to fill batches. (d) Reducing the default resolution or step count and exposing 'high quality' as an explicit option - most users will not notice and those who care will opt in. WHAT I WOULD CHECK BEFORE SHIPPING ANY OF IT: quality on YOUR prompt distribution with a human comparison against the current model, not FID on COCO. And diversity per prompt, because distillation and low step counts reduce it and users notice when every generation looks the same before they notice a small fidelity loss. THE ORDER MATTERS: sampler and serving fixes are reversible, cheap, and quality-neutral; distillation is a training investment with quality and diversity costs and must be re-done when the base model changes. Do the free things first, and you may find you never need the expensive ones."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Sampling is numerical integration",
        "back": "The reverse SDE has a deterministic PROBABILITY FLOW ODE with identical marginals, and the model's noise prediction gives its right-hand side. So 1000 steps was Euler's method with a tiny step size - not a property of the model."
      },
      {
        "type": "definition",
        "front": "DDIM",
        "back": "A non-Markovian forward process with DDPM's marginals, so a DDPM-trained model can skip steps. eta=0 is deterministic (and therefore INVERTIBLE). ~50 steps at reference quality with NO retraining."
      },
      {
        "type": "definition",
        "front": "DPM-Solver",
        "back": "Exploits the ODE's SEMI-LINEAR structure: solve the linear part exactly, apply a higher-order method only to the nonlinear network term, integrating in log-SNR. Error O(h^(k+1)); 10-20 steps at reference quality, still no retraining."
      },
      {
        "type": "definition",
        "front": "Consistency models",
        "back": "Train a network whose output is CONSTANT along each ODE trajectory, so evaluating anywhere on the path jumps to the endpoint. 1 step usable, 2-4 close to full quality. Requires a distillation/training stage."
      },
      {
        "type": "intuition",
        "front": "Why speed was the fixable corner",
        "back": "Diffusion gave up SPEED in the trilemma - a discretization and distillation problem, both well-understood. Nobody found a comparable fix for GAN mode collapse or VAE blur, which are properties of the OBJECTIVE. The family that gave up the tractable constraint won."
      },
      {
        "type": "pitfall",
        "front": "FID and human preference disagree",
        "back": "FID is minimized at guidance w~1-3; human preference peaks near 7-8. FID rewards matching the DATA DISTRIBUTION; users want striking on-prompt images. Tune on FID and you ship a model nobody likes."
      },
      {
        "type": "pitfall",
        "front": "Report a curve, not a number",
        "back": "Every metric moves with w and step count. Plot the FID-vs-CLIP FRONTIER across a guidance sweep. Dominating the frontier = genuinely better; winning at one setting = tuned to a metric."
      },
      {
        "type": "pitfall",
        "front": "FID comparability",
        "back": "Biased estimator - it FALLS as sample count rises, so 10k and 50k are not comparable. It also depends on the Inception implementation (PyTorch vs TF disagree). Always state n and the implementation."
      },
      {
        "type": "definition",
        "front": "DDIM inversion",
        "back": "Deterministic sampling is an invertible map, so you can run it BACKWARDS to find the noise producing a real image, then edit the conditioning and regenerate. Breaks at high guidance (inversion is done at w=1) - hence null-text inversion."
      },
      {
        "type": "pitfall",
        "front": "Guidance doubles per-step cost",
        "back": "Conditional + unconditional = 2 network evals per step, so '20 steps' is really 40. Step counts quoted without this understate cost 2x. Guidance distillation folds it into one pass."
      },
      {
        "type": "pitfall",
        "front": "What distillation costs",
        "back": "Lower per-prompt DIVERSITY (measure with pairwise LPIPS), lower top-end quality, a FIXED guidance scale (the user-facing dial disappears), an extra training stage, and awkward composability with LoRAs/ControlNets built for the multi-step base."
      },
      {
        "type": "intuition",
        "front": "Schedule and parameterization are coupled",
        "back": "Fixing zero-terminal-SNR BREAKS epsilon-prediction (at SNR=0 predicting the noise is trivial), so you must switch to v-prediction simultaneously. Flow matching sidesteps both: a straight noise-to-data path makes schedule and parameterization fall out of one choice."
      }
    ],
    "refs": [
      {
        "title": "Song et al. (2021), Score-Based Generative Modeling through Stochastic Differential Equations",
        "url": "https://arxiv.org/abs/2011.13456"
      },
      {
        "title": "Song et al. (2020), Denoising Diffusion Implicit Models (DDIM)",
        "url": "https://arxiv.org/abs/2010.02502"
      },
      {
        "title": "Lu et al. (2022), DPM-Solver: A Fast ODE Solver for Diffusion Probabilistic Model Sampling",
        "url": "https://arxiv.org/abs/2206.00927"
      },
      {
        "title": "Song et al. (2023), Consistency Models",
        "url": "https://arxiv.org/abs/2303.01469"
      },
      {
        "title": "Karras et al. (2022), Elucidating the Design Space of Diffusion-Based Generative Models (EDM)",
        "url": "https://arxiv.org/abs/2206.00364"
      }
    ],
    "demos": [
      "diffusion",
      "classification-metrics",
      "embeddings",
      "lr-schedule"
    ]
  },
  "ebm-score": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Every other model in this module bought tractability with a structural constraint. VAEs need an encoder and settle for a bound. Flows need invertible layers with computable Jacobians. Autoregressive models need an ordering. Energy-based models refuse all of that: define a scalar ENERGY E(x) with any network you like, let p(x) be proportional to exp(-E(x)), and you have a distribution. Low energy means high probability. The architecture is completely unconstrained.",
        "The price is the normalizing constant Z - the integral of exp(-E(x)) over all of x-space, which is intractable for anything interesting. You cannot compute the likelihood, you cannot compute its gradient directly, and sampling requires MCMC. For years that made EBMs elegant and impractical. The escape is a single observation that is genuinely the most important idea in this lesson: TAKE THE GRADIENT OF THE LOG-DENSITY WITH RESPECT TO x, AND Z DISAPPEARS. Z is a constant with respect to x, so grad log p(x) = -grad E(x) exactly. The intractable quantity is annihilated by differentiation.",
        "That quantity - grad log p(x), the SCORE - points uphill in probability, and it is all you need to sample by Langevin dynamics. So the strategy becomes: never model the density, model the score. Hyvarinen showed you can fit a score without knowing the density, Vincent showed that fitting a score is equivalent to DENOISING, Song and Ermon showed that denoising at many noise levels makes it work in high dimensions, and Ho et al.'s DDPM turned out to be exactly that with a different derivation. Diffusion models are score models. The chain from 'the normalizing constant is intractable' to 'therefore text-to-image works' runs through this lesson, and seeing it as one idea rather than four is the point."
      ],
      "math": [
        {
          "h": "The energy-based model and its intractable constant",
          "paras": [
            "Any scalar function of x defines a distribution once you normalize. The normalizer is an integral over the whole data space, which for images is hopeless."
          ],
          "tex": "p_\\theta(x) = \\frac{e^{-E_\\theta(x)}}{Z_\\theta}, \\qquad Z_\\theta = \\int e^{-E_\\theta(x)}\\,\\mathrm{d}x",
          "texNote": "The maximum-likelihood gradient is E_data[grad E] - E_model[grad E]: push energy DOWN on real data, UP on samples from the model. The second term needs samples from p_theta, which needs MCMC - and that is the whole difficulty."
        },
        {
          "h": "The score: differentiating away the normalizer",
          "paras": [
            "This is the central move. Z does not depend on x, so its gradient with respect to x is zero, and the score of an energy-based model is simply the negative gradient of the energy - computable with one backward pass."
          ],
          "tex": "\\nabla_x \\log p_\\theta(x) = \\nabla_x\\big[-E_\\theta(x) - \\log Z_\\theta\\big] = -\\nabla_x E_\\theta(x)",
          "texNote": "One line, and it converts an intractable model into a tractable one - provided you are willing to work with the score instead of the density. Everything else in this lesson is a consequence."
        },
        {
          "h": "Denoising score matching: the identity that becomes diffusion",
          "paras": [
            "Hyvarinen's original score-matching objective requires the trace of the Hessian, which costs O(d) backward passes - hopeless for images. Vincent's result replaces it with an equivalent objective on NOISE-PERTURBED data, where the target score is available in closed form."
          ],
          "tex": "\\mathbb{E}_{p_\\sigma}\\Big[\\big\\lVert s_\\theta(\\tilde{x}) - \\nabla_{\\tilde{x}}\\log p_\\sigma(\\tilde{x}\\mid x)\\big\\rVert^2\\Big], \\qquad \\nabla_{\\tilde{x}}\\log p_\\sigma(\\tilde{x}\\mid x) = -\\frac{\\tilde{x}-x}{\\sigma^2} = -\\frac{\\epsilon}{\\sigma}",
          "texNote": "The target is just the added noise, scaled. So 'estimate the score' and 'predict the noise you added' are THE SAME TASK - which is why DDPM's loss, derived from a completely different variational argument, is denoising score matching."
        },
        {
          "h": "Langevin dynamics: sampling from the score alone",
          "paras": [
            "Given the score you can sample without ever evaluating the density: walk uphill in log-probability and add noise. The noise is what makes it sample from p rather than converge to a mode."
          ],
          "tex": "x_{k+1} = x_k + \\frac{\\eta}{2}\\nabla_x \\log p(x_k) + \\sqrt{\\eta}\\,z_k, \\qquad z_k \\sim \\mathcal{N}(0,I)",
          "texNote": "As step size goes to zero and steps to infinity this converges to p(x). In high dimensions plain Langevin mixes terribly - it cannot cross low-density regions between modes - which is exactly the problem ANNEALING over noise levels solves."
        }
      ],
      "code": [
        {
          "h": "Why single-noise score matching fails, and what fixes it",
          "paras": [
            "The manifold problem is the reason score-based generation needed a specific trick to work at all, and understanding it explains the entire structure of diffusion."
          ],
          "code": "# THE PROBLEM (Song & Ermon, 2019). Three failures, one cause:\n#\n# 1. MANIFOLD. Real images occupy a low-dimensional manifold in pixel space.\n#    Off the manifold p(x) ~ 0, so grad log p(x) is UNDEFINED - and that is\n#    where Langevin sampling starts, from pure noise.\n#\n# 2. LOW-DENSITY REGIONS. Score matching's objective is weighted by p(x), so\n#    the estimate is poor exactly where there is little data - which is most\n#    of the space, and precisely where a sampler spends its early steps.\n#\n# 3. MIXING. Even with a perfect score, Langevin cannot cross the near-zero\n#    density valleys between modes in reasonable time. Mode weights come out\n#    wrong even when each mode is found.\n#\n# THE FIX: perturb the data with MANY noise levels at once.\n#   Large sigma  -> fills the whole space, score defined everywhere, modes\n#                   merge into one broad basin (easy to sample)\n#   Small sigma  -> close to the true data distribution (accurate)\n# Train ONE network conditioned on sigma, then ANNEAL from large to small.\n\nsigmas = torch.exp(torch.linspace(np.log(50.0), np.log(0.01), L))\n\ndef dsm_loss(model, x):\n    i = torch.randint(0, L, (x.size(0),), device=x.device)\n    sigma = sigmas[i].view(-1, 1, 1, 1)\n    noise = torch.randn_like(x)\n    x_tilde = x + sigma * noise\n    target = -noise / sigma                       # the closed-form score\n    return ((model(x_tilde, i) - target) ** 2 * sigma ** 2).mean()\n\n# Note the sigma^2 weighting: it makes the loss scale-invariant across noise\n# levels so no single sigma dominates. Reparameterize the network to predict\n# the NOISE instead of the score and this becomes, line for line, DDPM's loss.",
          "caption": "Annealing over noise levels solves three problems at once - undefined scores off the manifold, poor estimates in low-density regions, and slow mixing. That single fix is why diffusion has a noise schedule at all."
        },
        {
          "h": "The same model, three names",
          "paras": [
            "DDPM and NCSN were developed independently with different derivations and turned out to be the same thing. Seeing the translation is worth more than either derivation alone."
          ],
          "code": "# NCSN (score matching)          DDPM (variational)            unified (SDE)\n# ---------------------          ------------------            ------------\n# score s(x, sigma)              noise eps(x_t, t)             score of p_t\n# noise levels sigma_i           timesteps t                   continuous t\n# annealed Langevin              ancestral sampling            solve the SDE\n# variance EXPLODING             variance PRESERVING           VE- / VP-SDE\n#\n# The exact translation:\n#     s_theta(x_t, t)  =  -eps_theta(x_t, t) / sigma_t\n#\n# So a trained DDPM IS a score model - you get grad log p_t(x) for free by\n# dividing its output by -sigma_t. That is not an analogy; it is an identity.\n#\n# WHAT THE UNIFICATION BOUGHT (Song et al., 2021):\n#   * The PROBABILITY FLOW ODE - a deterministic sampler with the same\n#     marginals, which is what every fast sampler is built on.\n#   * EXACT LIKELIHOODS via the instantaneous change-of-variables formula,\n#     so score models became likelihood models too.\n#   * CONTROLLABLE generation by adding any grad log p(y|x) to the score,\n#     which is exactly classifier guidance.\n#   * Freedom to choose the forward SDE, since training only needs the score.\n#\n# One reframing turned two independently-derived methods into one family and\n# handed the field its sampler, its likelihood, and its conditioning mechanism.",
          "caption": "s(x_t, t) = -eps(x_t, t)/sigma_t is an identity, not an analogy. The SDE framework that follows from it produced the probability flow ODE, exact likelihoods, and classifier guidance in one paper."
        }
      ],
      "useCases": [
        "Diffusion models, which are the deployed form of everything in this lesson - every text-to-image, video, and audio diffusion system is a denoising score matching model with a noise schedule that anneals.",
        "Compositional generation: energies ADD, so summing two energy functions multiplies the distributions and gives you conjunction of constraints for free. This is the cleanest theoretical advantage of the energy view and it is used for compositional and controllable diffusion.",
        "Inverse problems - inpainting, deblurring, super-resolution, MRI and CT reconstruction - where a learned score is a data PRIOR that combines with a known physical forward model, and the reconstruction is posterior sampling rather than regression.",
        "Anomaly and out-of-distribution detection using energy as a score, and energy-based reinterpretations of discriminative classifiers (JEM), which improve calibration and robustness at some cost in training stability."
      ],
      "pitfalls": [
        "Trying to train an EBM by maximum likelihood without appreciating the cost. The gradient needs samples from the model at every step, which means MCMC inside the training loop - expensive, and the chains are usually far from converged, so the gradient is biased.",
        "Using single-noise-level score matching in high dimensions. Real data lies on a low-dimensional manifold, so the score is undefined off it, is poorly estimated in the low-density regions where sampling begins, and cannot mix between modes. Multiple noise levels fix all three.",
        "Implementing Hyvarinen's original objective directly. The Hessian-trace term costs O(d) backward passes per example, which is hopeless for images. Use denoising score matching (which is also the diffusion objective) or sliced score matching.",
        "Treating diffusion and score matching as separate topics. s(x_t, t) = -eps(x_t, t)/sigma_t is an identity - a trained DDPM gives you the score of the noised data distribution directly, which is what makes guidance and inverse-problem solvers work.",
        "Expecting Langevin dynamics to mix in reasonable time on a multimodal distribution. It cannot cross low-density valleys, so mode weights come out wrong even when every mode is found. Annealing is the practical answer.",
        "Forgetting the noise-level weighting in the loss. Without a sigma-squared-style weighting the objective is dominated by whichever noise levels have the largest gradient magnitudes, and training silently prioritizes the wrong regime.",
        "Reading 'energy-based models can use any architecture' as 'energy-based models are easy'. The unconstrained architecture is paid for entirely in sampling and training difficulty, which is why the field routed around EBMs via the score rather than through them."
      ],
      "connections": [
        {
          "ref": "generative/ddpm",
          "text": "DDPM's noise-prediction loss IS denoising score matching, derived independently from a variational argument - the two literatures converged on the same objective."
        },
        {
          "ref": "generative/diffusion-guidance",
          "text": "The probability flow ODE comes directly from the SDE framework here, and it is what turned sampling into a numerical integration problem with 50x fewer steps."
        },
        {
          "ref": "generative/flows",
          "text": "Flow matching is the modern reformulation - define a straight path from noise to data and regress its velocity, which makes schedule and parameterization fall out of one choice."
        },
        {
          "ref": "generative/autoencoders",
          "text": "A denoising autoencoder's residual estimates the score of the smoothed data distribution - the identity that connects the module's first lesson to its last."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "MCMC, Langevin dynamics, and the intractable-normalizer problem are standard Bayesian territory; the score trick is a specific and unusually clean escape from it."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is an energy-based model?",
          "a": "p(x) proportional to exp(-E(x)) for any scalar network E. Low energy means high probability, and the architecture is completely unconstrained - which is the appeal."
        },
        {
          "q": "What makes EBMs hard?",
          "a": "The normalizing constant Z is an integral over all of x-space. You cannot compute the likelihood, and sampling requires MCMC."
        },
        {
          "q": "What is the score?",
          "a": "grad_x log p(x) - the gradient of the log-density with respect to the INPUT. It points uphill in probability and is all you need for Langevin sampling."
        },
        {
          "q": "Why does the score avoid the normalizer?",
          "a": "Z does not depend on x, so its gradient with respect to x is zero: grad log p(x) = -grad E(x). Differentiation annihilates the intractable constant."
        },
        {
          "q": "What is Langevin dynamics?",
          "a": "x <- x + (eta/2) * score + sqrt(eta) * noise. Walk uphill in log-probability with added noise; it converges to p(x) as the step size shrinks."
        },
        {
          "q": "What is wrong with Hyvarinen's original score matching?",
          "a": "It requires the trace of the Hessian of the log-density, which costs O(d) backward passes per example - hopeless in image dimensions."
        },
        {
          "q": "What is denoising score matching?",
          "a": "Perturb data with Gaussian noise and regress the score of the PERTURBED distribution, whose target is available in closed form: -(x_tilde - x)/sigma^2, i.e. the scaled noise."
        },
        {
          "q": "So what is the connection to diffusion?",
          "a": "Predicting the noise IS estimating the score: s(x_t, t) = -eps(x_t, t)/sigma_t. DDPM's loss is denoising score matching, derived variationally instead."
        },
        {
          "q": "Why does score matching need multiple noise levels?",
          "a": "Data lies on a low-dimensional manifold, so the score is undefined off it, poorly estimated in low-density regions where sampling starts, and unable to mix between modes. Annealing fixes all three."
        },
        {
          "q": "What is the VE/VP distinction?",
          "a": "Variance-EXPLODING (NCSN) adds noise of growing magnitude without rescaling the data; variance-PRESERVING (DDPM) scales the data down as it adds noise so total variance stays fixed. Two SDEs in the same family."
        },
        {
          "q": "What did the SDE framework buy?",
          "a": "The probability flow ODE (hence fast samplers), exact likelihoods via instantaneous change of variables, classifier guidance as score addition, and freedom to design the forward process."
        },
        {
          "q": "What is compositionality in EBMs?",
          "a": "Energies ADD, so summing two energy functions multiplies their distributions - conjunction of constraints for free. The cleanest theoretical advantage of the energy view."
        }
      ],
      "standard": [
        {
          "q": "Explain the path from energy-based models to diffusion models.",
          "a": "I would tell this as one idea developing rather than four techniques, because that is what it is. STEP 1 - THE ENERGY-BASED MODEL AND ITS PROBLEM. Define p(x) proportional to exp(-E(x)) with any network E. Maximally flexible - no invertibility constraint, no ordering, no encoder. The maximum-likelihood gradient is E_data[grad E] - E_model[grad E]: push energy down on real data and up on model samples. The second expectation needs samples from the model, which needs MCMC inside the training loop. Contrastive divergence truncates the chains, which makes it affordable and BIASED, and in practice training is slow and unstable. This is where EBMs sat for years - elegant, and not competitive. STEP 2 - THE SCORE TRICK. Observe that Z is constant with respect to x, so grad_x log p(x) = -grad_x E(x). The intractable object vanishes under differentiation. If you are willing to work with the SCORE rather than the density, everything becomes computable with one backward pass. And the score is enough to SAMPLE, via Langevin dynamics: step uphill in log-probability and add noise. So: never model the density, model the score. STEP 3 - FITTING A SCORE WITHOUT KNOWING THE DENSITY. Hyvarinen (2005) showed the objective E||s_theta(x) - grad log p_data(x)||^2, which appears to need the unknown true score, can be integrated by parts into a form requiring only the model - but it contains the TRACE OF THE HESSIAN, costing O(d) backward passes per example. Fine for small problems, hopeless for images. Two escapes. SLICED score matching projects onto random directions, giving an unbiased estimate with a few passes. DENOISING SCORE MATCHING (Vincent, 2011) is the one that mattered: perturb x with Gaussian noise and match the score of the PERTURBED distribution, whose target is available in closed form and is just the scaled noise. You are now solving a plain regression problem. STEP 4 - WHY IT STILL DID NOT WORK, AND THE FIX. Song & Ermon (2019) identified three coupled failures in high dimensions. The MANIFOLD problem: real data occupies a low-dimensional set, so the score is undefined off it - and that is exactly where sampling begins. The LOW-DENSITY problem: score matching's objective is weighted by p(x), so the estimate is worst where there is least data, which is most of the space. And MIXING: Langevin cannot cross the near-zero density valleys between modes, so mode weights are wrong even when modes are found. The fix for all three is one thing - MULTIPLE NOISE LEVELS. Large noise fills the space (score defined everywhere, modes merged into one basin); small noise is accurate. Train one network conditioned on the noise level and ANNEAL from large to small during sampling. That is NCSN, and it produced the first competitive score-based image samples. STEP 5 - THE CONVERGENCE. Ho et al.'s DDPM (2020) arrived from a completely different direction - a variational bound on a Markovian denoising process - and its simplified objective is a noise-prediction regression at many noise levels. That is denoising score matching. Two independent derivations, one algorithm. The translation is exact: s(x_t, t) = -eps(x_t, t)/sigma_t. STEP 6 - THE UNIFICATION. Song et al. (2021) framed both as discretizations of stochastic differential equations - NCSN is variance-exploding, DDPM variance-preserving - and that reframing paid for itself several times over. It gave the PROBABILITY FLOW ODE, which is what every fast sampler is built on. It gave EXACT LIKELIHOODS via instantaneous change of variables. It made conditioning trivial, since you can add any grad log p(y|x) to the score - which is classifier guidance. And it decoupled the forward process from training, since only the score is learned. WHAT I WOULD EMPHASIZE: the whole chain is driven by one move - refusing to model the density and modelling its gradient instead - and everything after is engineering around the consequences. It is also a good example of two literatures solving the same problem in different languages for years before someone wrote the dictionary.",
          "deepDive": {
            "q": "What is flow matching, and why did it replace the diffusion formulation in recent models?",
            "a": "THE REFRAMING. Diffusion defines a stochastic forward process that gradually destroys data, then learns to reverse it, and everything - noise schedule, parameterization, loss weighting - is derived from that process. FLOW MATCHING starts somewhere else: define a PATH between the noise distribution and the data distribution, and learn the VELOCITY FIELD that transports samples along it. Generation is then solving an ODE from noise to data. RECTIFIED FLOW is the simplest instance and the one that matters practically: make the path a STRAIGHT LINE. Interpolate x_t = (1-t)x_0 + t*x_1 with x_0 noise and x_1 data, and the target velocity is simply x_1 - x_0, a constant along the path. The training objective is a plain regression: predict (x_1 - x_0) given x_t and t. That is it - no noise schedule to design, no parameterization choice, no variational bound. WHY THE STRAIGHTNESS MATTERS, which is the practical payoff. Sampling means integrating an ODE, and integration error depends on how CURVED the trajectory is. A perfectly straight path can be integrated exactly in ONE Euler step. Diffusion's probability-flow trajectories are curved, which is why they need many steps or a sophisticated solver. So flow matching attacks the few-step sampling problem in the TRAINING FORMULATION rather than post hoc with better solvers or distillation - and that is a more fundamental fix. In practice the learned marginal paths are not perfectly straight (the model must average over which data point each noise sample maps to), which is what REFLOW addresses: generate noise-data pairs with the trained model, retrain on those pairs, and the paths straighten further. WHAT ELSE IT BUYS. (1) SIMPLICITY - the objective is a conditional regression with no variational derivation and no schedule design, so there is much less to get wrong. The zero-terminal-SNR class of bug simply does not arise, because the endpoints are the endpoints by construction. (2) GENERALITY - it works between ARBITRARY distributions, not just noise-to-data, so it handles image-to-image and other transport problems in the same framework. (3) A cleaner connection to optimal transport, since the straight-line interpolation is the OT path for the pairing you sample. (4) Better empirical scaling in the reported comparisons. WHERE IT IS DEPLOYED: Stable Diffusion 3 and Flux both use rectified flow with transformer backbones, and the SD3 paper's ablation compares flow-matching variants against diffusion formulations at matched compute and finds the flow formulation better, with a resolution-dependent timestep shift as an important detail. THE HONEST CAVEATS. Flow matching and diffusion are closely related - the probability flow ODE of a diffusion model IS a flow, so this is a change of formulation rather than a different family, and several 'flow matching beats diffusion' comparisons are partly comparisons of schedule and weighting choices. The practical gains are real but incremental rather than categorical, and the biggest one is arguably that the formulation has fewer coupled defaults to get wrong. WHAT I TAKE FROM IT: the field spent years fixing diffusion's sampling cost downstream - better ODE solvers, then distillation - and flow matching asks whether the trajectory should have been straight in the first place. That is a good instance of a general move: when you are working hard to correct a system's output, check whether the formulation that produced it was the right one."
          }
        },
        {
          "q": "Why are energy-based models appealing in theory but rarely used in practice?",
          "a": "THE APPEAL IS REAL AND WORTH STATING PROPERLY. (1) MAXIMAL FLEXIBILITY. Any scalar-output network is a valid energy function. No invertibility requirement (flows), no ordering (autoregressive), no encoder or bound (VAEs), no adversary (GANs). You can use whatever architecture suits the data. (2) COMPOSITIONALITY, which is the deepest advantage. Energies ADD, and adding log-densities multiplies distributions - so E1 + E2 gives you the product, i.e. the CONJUNCTION of two constraints, with no retraining. You can train energy functions for separate concepts and combine them at inference. Negation and disjunction have similar constructions. No other generative family offers this cleanly. (3) A NATURAL FIT FOR CONSTRAINTS AND INVERSE PROBLEMS: a physical constraint is an energy term you add. (4) They unify with discriminative models - a classifier's logits define an energy (JEM), which gives a generative model for free and improves calibration and robustness. WHY THEY ARE RARE, and the reasons compound. (1) TRAINING NEEDS MCMC IN THE LOOP. The likelihood gradient contains an expectation over the MODEL's distribution, so every update needs samples from the current model. Contrastive divergence truncates the chains to keep it affordable, which makes the gradient BIASED, and the bias interacts badly with the model becoming sharper. Persistent contrastive divergence helps and does not solve it. (2) INSTABILITY. Without care, energy diverges - the model drives training-data energy to negative infinity - so you need spectral normalization, gradient penalties, energy regularization, or replay buffers. The engineering burden resembles GAN stabilization, and for the same structural reason: there is no single well-posed objective being descended. (3) SLOW SAMPLING. Langevin dynamics needs many steps and mixes poorly between modes in high dimensions. (4) NO LIKELIHOOD, so you cannot evaluate, compare, or use them for density-based tasks without expensive estimation of Z (AIS). (5) HYPERPARAMETER SENSITIVITY: step sizes, chain lengths, buffer policies, and noise scales all interact. WHAT ACTUALLY HAPPENED, and this is the interesting part: THE FIELD ROUTED AROUND THE PROBLEM RATHER THAN SOLVING IT. Every difficulty above traces to the normalizing constant. Score-based methods sidestep Z entirely by modelling the gradient of the log-density, denoising score matching turns the fitting problem into plain regression, and annealing over noise levels fixes the mixing problem that made Langevin unusable. Diffusion models are the successful descendants of the EBM programme - they inherit the flexibility (any architecture), they keep the score, and they discard the intractable density and the MCMC training loop. So 'EBMs are not used' is misleading. The IDEAS are used constantly and the specific formulation is not. WHERE EXPLICIT EBMs STILL APPEAR: compositional generation, where the additive property is the whole point; energy-based reinterpretations of classifiers for calibration and OOD detection; structured prediction with constraints; and as a theoretical lens - describing diffusion, contrastive learning, and even some RL objectives in energy terms is often clarifying. THE LESSON I WOULD DRAW: when a framework is elegant but blocked by one specific obstacle, the productive move is often to find a formulation that never encounters the obstacle rather than to attack it directly. Z was never made tractable; it was made irrelevant."
        },
        {
          "q": "How do you use a learned score model to solve an inverse problem like MRI reconstruction?",
          "a": "THE SETUP. You have measurements y = A(x) + noise, where A is a KNOWN forward operator - undersampled Fourier measurements for MRI, a blur kernel for deblurring, a downsampling operator for super-resolution, a mask for inpainting. You want to recover x. The problem is ill-posed: many x are consistent with y, so you need a PRIOR over plausible x. WHY A SCORE MODEL IS THE RIGHT PRIOR. Classical reconstruction uses hand-designed priors - total variation, wavelet sparsity - that are crude compared to what a generative model learns. A supervised network trained on (y, x) pairs works but is tied to one specific A: change the sampling pattern or the acceleration factor and you retrain. A DIFFUSION PRIOR is trained ONCE on clean images with no knowledge of A, and then combines with any forward model at inference. That decoupling is the decisive practical advantage in medical imaging, where acquisition protocols vary constantly. THE FORMULATION. You want to sample from the posterior p(x|y), whose score decomposes by Bayes' rule: grad log p(x|y) = grad log p(x) + grad log p(y|x). The first term is exactly what your diffusion model provides. The second is the DATA-CONSISTENCY term, computable from the known forward model - for Gaussian measurement noise it is proportional to A^T(y - Ax)/sigma_y^2. So you run the usual reverse diffusion and add the data-consistency gradient at each step. Conceptually identical to classifier guidance, with a known physical likelihood instead of a learned classifier. THE COMPLICATION, and it is the crux. The diffusion prior gives you the score of the NOISY distribution p_t(x_t), but the likelihood term p(y|x) is defined on CLEAN x. You need p(y|x_t), which requires marginalizing over x given x_t and is intractable. The approaches differ in how they approximate it. (1) DPS (Diffusion Posterior Sampling) approximates using the model's predicted x0 at each step: compute x0_hat from the current x_t, evaluate the data-consistency gradient there, and backpropagate through the denoiser. Simple, general, and works well. (2) PROJECTION-BASED methods alternate a diffusion step with a hard projection onto the measurement-consistent set - for MRI, replacing the measured Fourier coefficients with their true values. Cheap and effective when A has convenient structure, which for MRI it does. (3) Decomposition methods (DDRM, DDNM) use the SVD of A to handle measured and unmeasured subspaces separately, which is elegant and requires a tractable SVD. (4) Variable-splitting approaches alternate denoising and data-consistency optimization. WHAT I WOULD BUILD FOR MRI SPECIFICALLY: train an unconditional diffusion model on clean reconstructed images from the anatomy of interest, then use projection-based data consistency in k-space at each reverse step - since for MRI the forward model is a Fourier transform with a mask, so enforcing consistency is exact and cheap. Add DPS-style guidance for the noise model if needed. THE THINGS I WOULD BE CAREFUL ABOUT, and in medical imaging they are not optional. (a) HALLUCINATION. A generative prior will happily invent anatomically plausible structure that is not supported by the measurements. That is the entire point of the prior and it is also the central clinical risk - an invented lesion, or a real one smoothed away. This must be tested explicitly, not assumed away. (b) UNCERTAINTY: sample the posterior MULTIPLE times and show the variance map. Regions of high variance are where the measurements did not constrain the answer, and that is exactly what a radiologist needs to know. This is a genuine advantage of posterior sampling over a regression network, which gives one answer with no indication of what it made up. (c) DISTRIBUTION SHIFT: a prior trained on one scanner, protocol, or population will bias reconstructions toward it, which is a fairness and safety issue. (d) EVALUATION must be diagnostic-task-based - lesion detectability, radiologist assessment - not PSNR/SSIM, which reward smoothness and are known to correlate poorly with clinical utility. A method that improves PSNR while erasing small lesions is worse, and PSNR will not say so."
        },
        {
          "q": "What is contrastive divergence and why is it problematic?",
          "a": "THE PROBLEM IT ADDRESSES. The maximum-likelihood gradient for an energy-based model is E_data[grad_theta E(x)] - E_model[grad_theta E(x)]. The first expectation is over your dataset - easy. The second is over the MODEL's own distribution, and sampling from p_theta requires MCMC, which would need to run to convergence at every gradient step. That is completely impractical. CONTRASTIVE DIVERGENCE (Hinton, 2002). Do it anyway, but truncate. Initialize the MCMC chain at a DATA point rather than at random, run only k steps (often k = 1), and use the resulting sample as the negative. The intuition is that starting from data means you are already near a high-probability region, so a few steps suffice to find where the model is putting mass it should not. The update is then: push energy down at the data point, up at the point k steps away. THE PROBLEMS, in order of severity. (1) IT IS BIASED. CD-k does not follow the gradient of the log-likelihood; it follows the gradient of something else, and the gap does not vanish with more data. Carreira-Perpinan & Hinton showed CD converges to a different fixed point than maximum likelihood. For many purposes the bias is tolerable; for density estimation it is not, and you cannot bound it easily. (2) IT ONLY EXPLORES LOCALLY. Because chains start at data, the model is never penalized for putting mass in regions FAR from any data - the chain never goes there to discover the problem. So spurious modes in empty parts of the space are invisible to training, which is exactly the failure that makes EBM samples poor. (3) THE CHAINS ARE NOT CONVERGED, so the negative samples are not from the model, and the whole 'contrast data against model samples' story does not really hold. (4) INSTABILITY: the energy landscape can diverge, with training-data energy driven toward negative infinity, and it needs regularization to prevent that. THE IMPROVEMENTS. PERSISTENT CD (PCD / Tieleman): maintain a persistent set of chains across parameter updates instead of restarting from data each time. The chains keep exploring and can wander into low-data regions, which fixes problem (2) substantially, and it is the standard choice. Its assumption - that the model changes slowly enough that the chains stay roughly equilibrated - requires a small learning rate. REPLAY BUFFERS (used in modern deep EBM work, e.g. Du & Mordatch) are PCD with a buffer of past samples, re-initializing a fraction from noise to maintain exploration. LANGEVIN dynamics as the sampler rather than Gibbs, with tuned step sizes and gradient clipping. And SPECTRAL NORMALIZATION or energy regularization to keep the landscape from diverging. THE HONEST ASSESSMENT. Modern deep EBMs with all of this machinery do train and do produce reasonable samples, but the recipe is delicate and the results have not been competitive with diffusion or autoregressive models at scale. Every difficulty here traces to the same root - needing samples from an intractable model during training - and the field's successful response was to change the objective so that sampling is never required in the training loop. Denoising score matching needs no MCMC at all: it is a regression against a closed-form target. THAT is why the score route won, and contrastive divergence is worth understanding mainly as the obstacle that motivated it. THE TRANSFERABLE POINT: whenever a training procedure requires sampling from the model being trained, expect bias, instability, and expense. Objectives that avoid it - score matching, noise-contrastive estimation, and the various contrastive losses in representation learning - are usually the ones that scale."
        },
        {
          "q": "How do you get an exact likelihood out of a diffusion model?",
          "a": "THE PUZZLE. Diffusion models are usually trained with a simplified denoising objective and evaluated with sample-quality metrics, and the variational derivation gives a BOUND on the likelihood rather than the likelihood itself. So it looks like they belong with VAEs in the 'bound only' category. The SDE framework shows otherwise, and the route is worth knowing because it is the cleanest payoff of the unification. THE MECHANISM - THE PROBABILITY FLOW ODE. Every diffusion SDE has a deterministic ODE whose solution has the SAME MARGINAL distribution at every time. That ODE is a CONTINUOUS NORMALIZING FLOW: an invertible, deterministic map between the noise distribution at t = T and the data distribution at t = 0. And for a continuous normalizing flow the change-of-variables formula applies in its instantaneous form: the log-density changes along the trajectory at a rate given by the NEGATIVE DIVERGENCE of the velocity field. So integrate the ODE from your data point out to t = T, accumulating the divergence term along the way, and you get log p(x) exactly - up to numerical integration error. THE PRACTICAL DIFFICULTY is the divergence, which is the trace of the Jacobian of the network with respect to its input. Computing it exactly costs one backward pass PER DIMENSION, which for images is hopeless. The standard fix is the HUTCHINSON TRACE ESTIMATOR: the trace of a matrix equals the expectation of v-transpose-A-v for a random vector v with unit covariance, so one vector-Jacobian product gives an unbiased estimate. Average a few samples to reduce variance. This makes the whole thing tractable at the cost of a stochastic likelihood estimate - unbiased in the trace, though the log is then slightly biased, which careful papers acknowledge. WHAT THIS BUYS. (1) DIFFUSION MODELS BECOME COMPARABLE with autoregressive models and normalizing flows on bits-per-dimension, which they were not before - and they are competitive. (2) It supplies a principled anomaly and OOD score, subject to the usual complexity confound. (3) It confirms that the score-based and likelihood-based views are the same object seen from different angles. (4) It enables MAXIMUM-LIKELIHOOD TRAINING of diffusion models, and Song et al. showed that a particular weighting of the denoising objective corresponds exactly to maximizing the likelihood - which explains why the 'simplified' unweighted loss gives better SAMPLES but worse likelihood than the weighted one. That is a clean instance of this module's recurring theme: the objective you choose selects a point on the quality-versus-likelihood trade, and the two are not the same axis. THE CAVEATS I would state. The number depends on the ODE solver's tolerance, so it is 'exact' only up to integration error and you must report the settings. The Hutchinson estimator adds variance. The DISCRETIZATION convention matters as it does for any bits-per-dimension figure - uniform versus variational dequantization changes the value materially. And computing it is expensive relative to a forward pass, so it is an evaluation tool rather than something you run per sample in production. AND THE CONNECTION BACK TO THE LESSON: this only exists because someone noticed that a stochastic denoising process has a deterministic counterpart. The same observation gave fast samplers. One reframing, two large payoffs - which is a decent argument for spending time on formulations rather than only on models."
        },
        {
          "q": "Compare the ways different generative families avoid computing the normalizing constant.",
          "a": "EVERY GENERATIVE MODEL FACES THE SAME OBSTACLE - a valid probability distribution must integrate to one, and enforcing that in high dimensions is hard. The families are best understood as five different escapes, and laying them side by side is the most compact way to see the whole design space. (1) AUTOREGRESSIVE - FACTORIZE. Decompose p(x) into a product of one-dimensional conditionals via the chain rule. Each conditional is normalized by a softmax over a small support, which is trivial. The global normalizer is then automatically one. COST: you must impose an ORDERING, and sampling is inherently sequential - O(d) network evaluations. This is the cleanest escape and it buys exact likelihoods, which is why autoregressive models have the best reported likelihoods of any family. (2) NORMALIZING FLOWS - CHANGE OF VARIABLES. Transform a simple normalized distribution through an INVERTIBLE map, and track the density exactly with the Jacobian determinant. COST: severe architectural constraints - every layer must be invertible with a tractable Jacobian determinant - which limits expressiveness per parameter, and the latent must have the same dimension as the data. Exact likelihood, fast sampling, constrained architecture. (3) VAEs - BOUND IT. Do not compute the likelihood; optimize a variational LOWER BOUND instead. COST: the bound has an unknown gap, so reported likelihoods are not comparable with exact-likelihood models, and the objective's tension between reconstruction and the KL produces blur and posterior collapse. (4) GANs - AVOID DENSITY ENTIRELY. Never represent p(x) at all; learn a sampler judged by a discriminator. COST: no likelihood of any kind, no principled evaluation, unstable adversarial training, and mode collapse because nothing in the objective requires coverage. (5) ENERGY-BASED / SCORE - DIFFERENTIATE IT AWAY. Model the SCORE, grad_x log p(x), which equals -grad_x E(x) because Z does not depend on x. COST: you have the gradient of the log-density, not the log-density, so sampling requires an iterative procedure (Langevin, or an ODE/SDE solve) and evaluating a likelihood requires extra machinery. THE PATTERN WORTH SEEING. Each family pays for tractability with a different currency: autoregressive pays in SAMPLING SPEED, flows pay in ARCHITECTURAL FREEDOM, VAEs pay in TIGHTNESS, GANs pay in EVALUABILITY AND COVERAGE, and score models pay in ITERATIVE SAMPLING. Those costs map almost exactly onto the generative trilemma's corners, which is not a coincidence - the trilemma is a statement about which currency you spend. WHY THE SCORE ROUTE WON FOR IMAGES. Its cost - iterative sampling - turned out to be the most reducible. Recognizing sampling as ODE integration cut a thousand steps to twenty with no retraining; distillation cut it to one to four. Nobody found comparable reductions in autoregressive sequentiality for high-resolution images, in flow architecture constraints, or in GAN mode collapse. And the score route uniquely keeps ARCHITECTURAL FREEDOM (any network can estimate a score) while providing a STABLE regression objective, which is the combination that scales. THE UNIFICATIONS worth knowing, because the boundaries are softer than the taxonomy suggests: the probability flow ODE makes a diffusion model a continuous normalizing flow, so score models DO give exact likelihoods; flow matching bridges flows and diffusion explicitly; VQ-VAE plus a transformer is a two-stage hybrid of compression and autoregression; and latent diffusion is autoencoder plus score model. The productive way to hold this is not five separate families but one design space with a small number of levers - what you model (density, score, sampler, or bound), what constraint you accept, and where you spend the cost."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Energy-based model",
        "back": "p(x) = exp(-E(x))/Z for ANY scalar network E. Maximal architectural freedom; the price is that Z is an intractable integral over all of x-space."
      },
      {
        "type": "intuition",
        "front": "The score trick",
        "back": "Z does not depend on x, so grad_x log p(x) = -grad_x E(x). DIFFERENTIATION ANNIHILATES THE NORMALIZER. This one line is what makes the whole score/diffusion programme possible."
      },
      {
        "type": "definition",
        "front": "Langevin dynamics",
        "back": "x <- x + (eta/2)*grad log p(x) + sqrt(eta)*z. Samples from p using ONLY the score - no density evaluation. The added noise is what makes it sample rather than converge to a mode."
      },
      {
        "type": "definition",
        "front": "Denoising score matching",
        "back": "Perturb x with noise and regress the perturbed score, whose target is closed-form: -(x_tilde - x)/sigma^2 = -eps/sigma. Estimating the score and predicting the added noise are THE SAME TASK."
      },
      {
        "type": "intuition",
        "front": "s(x_t,t) = -eps(x_t,t)/sigma_t",
        "back": "An IDENTITY, not an analogy. A trained DDPM is a score model. This is why guidance (add grad log p(y|x) to the score) and inverse-problem solvers work at all."
      },
      {
        "type": "pitfall",
        "front": "Why single-noise score matching fails",
        "back": "Three coupled failures: the score is UNDEFINED off the data manifold (where sampling starts), poorly estimated in low-density regions (the objective is p-weighted), and Langevin cannot mix across low-density valleys."
      },
      {
        "type": "intuition",
        "front": "Why diffusion has a noise schedule",
        "back": "Annealing over noise levels fixes all three failures at once - large sigma fills the space and merges modes, small sigma is accurate. The schedule is not a hyperparameter, it is the fix."
      },
      {
        "type": "pitfall",
        "front": "Hyvarinen's original objective",
        "back": "Requires the TRACE OF THE HESSIAN of the log-density - O(d) backward passes per example, hopeless for images. Use denoising score matching or sliced score matching (random projections)."
      },
      {
        "type": "definition",
        "front": "VE vs VP SDEs",
        "back": "Variance-EXPLODING (NCSN): add noise of growing magnitude, data unscaled. Variance-PRESERVING (DDPM): scale data down as noise is added so total variance is fixed. Two discretizations of one SDE family."
      },
      {
        "type": "definition",
        "front": "What the SDE unification bought",
        "back": "The probability flow ODE (hence every fast sampler), EXACT likelihoods via instantaneous change-of-variables, classifier guidance as simple score addition, and freedom to design the forward process independently of training."
      },
      {
        "type": "pitfall",
        "front": "Why contrastive divergence is problematic",
        "back": "The ML gradient needs samples from the MODEL, so MCMC runs inside the training loop. CD truncates the chains: biased gradient, and because chains start at DATA the model is never penalized for mass far from data."
      },
      {
        "type": "intuition",
        "front": "Five escapes from the normalizer",
        "back": "Autoregressive FACTORIZES (pays in sampling speed); flows use CHANGE OF VARIABLES (pays in architecture); VAEs BOUND it (pays in tightness); GANs AVOID density (pays in evaluability/coverage); score models DIFFERENTIATE it away (pays in iterative sampling - the most reducible cost, which is why they won)."
      }
    ],
    "refs": [
      {
        "title": "Song & Ermon (2019), Generative Modeling by Estimating Gradients of the Data Distribution (NCSN)",
        "url": "https://arxiv.org/abs/1907.05600"
      },
      {
        "title": "Song et al. (2021), Score-Based Generative Modeling through Stochastic Differential Equations",
        "url": "https://arxiv.org/abs/2011.13456"
      },
      {
        "title": "Vincent (2011), A Connection Between Score Matching and Denoising Autoencoders",
        "url": "https://www.iro.umontreal.ca/~vincentp/Publications/smdae_techreport.pdf"
      },
      {
        "title": "Du & Mordatch (2019), Implicit Generation and Modeling with Energy-Based Models",
        "url": "https://arxiv.org/abs/1903.08689"
      },
      {
        "title": "Lipman et al. (2023), Flow Matching for Generative Modeling",
        "url": "https://arxiv.org/abs/2210.02747"
      }
    ],
    "demos": [
      "mcmc",
      "kernel-density",
      "diffusion",
      "importance-sampling"
    ]
  },
  "ar-generative": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Autoregressive models take the most direct route available to a valid probability distribution: apply the chain rule. Any joint distribution factorizes into a product of conditionals, each conditioned on everything before it, and each conditional is a small softmax that normalizes trivially. So there is no intractable partition function, no variational bound, no adversary - just exact maximum likelihood on a sequence of classification problems. This is why autoregressive models report the best likelihoods of any generative family, and why they are the only family whose numbers are directly comparable to each other.",
        "The cost is written into the same equation. Sampling must be SEQUENTIAL, because token i+1 depends on token i, so generating a 32x32 RGB image requires 3,072 network evaluations - one per subpixel. That is the third corner of the trilemma: exact likelihood and excellent mode coverage, paid for in sampling speed. For text this is acceptable because sequences are short relative to their information content; for images at any real resolution it was fatal, which is why PixelCNN never scaled to the sizes GANs and diffusion reached.",
        "The reason this lesson matters now is that autoregressive image generation came back by changing WHAT it factorizes over. Modelling raw pixels means thousands of steps and most of them spent on imperceptible detail. Modelling a grid of DISCRETE TOKENS from a VQ autoencoder means a few hundred steps over units that carry real semantic content - which is the two-stage factorization again, with a transformer as the prior. That is VQGAN, and it is how image generation became a language-modelling problem. It is also the architecture behind unified multimodal models, because once images are token sequences, one transformer handles text and images with the same machinery."
      ],
      "math": [
        {
          "h": "The chain rule, which is the whole model",
          "paras": [
            "Exact, unconditional, and requiring no approximation. The only choice is the ORDERING, and there is no canonical ordering for a 2-D image - which is the first real design decision."
          ],
          "tex": "p(x) = \\prod_{i=1}^{n} p(x_i \\mid x_1, \\ldots, x_{i-1}), \\qquad \\log p(x) = \\sum_{i=1}^{n} \\log p(x_i \\mid x_{<i})",
          "texNote": "Each conditional is normalized over a small support (256 values for a pixel, ~50k for a text token), so the global normalizer is one by construction. That is why the likelihood is exact and cheap - the escape from the partition function is factorization."
        },
        {
          "h": "The sampling cost",
          "paras": [
            "Training is parallel because all conditionals can be evaluated at once with a causal mask. Sampling cannot be, because each step's input is the previous step's output."
          ],
          "tex": "\\text{train: } O(1) \\text{ passes} \\qquad \\text{sample: } O(n) \\text{ passes}, \\qquad n_{32\\times32\\times3} = 3072",
          "texNote": "The training/sampling asymmetry is the defining property. It is also why KV caching matters so much - without it each of the n steps recomputes attention over the whole prefix, making sampling O(n^2) network work rather than O(n)."
        },
        {
          "h": "Why the output distribution matters more than it looks",
          "paras": [
            "A 256-way softmax per subpixel treats intensity 127 and 128 as unrelated categories, wasting capacity and producing noisy gradients. PixelCNN++ replaced it with a mixture of discretized logistics, which respects ordinality and cut the parameter count sharply."
          ],
          "tex": "p(x_i \\mid \\cdot) = \\sum_{k=1}^{K}\\pi_k\\Big[\\sigma\\!\\big(\\tfrac{x_i+0.5-\\mu_k}{s_k}\\big) - \\sigma\\!\\big(\\tfrac{x_i-0.5-\\mu_k}{s_k}\\big)\\Big]",
          "texNote": "A continuous mixture INTEGRATED over each discrete bin. K = 10 components suffices. This is a good general lesson: when your categorical variable has an order, a softmax over categories throws that structure away."
        }
      ],
      "code": [
        {
          "h": "The masked-convolution blind spot - a real bug with a real fix",
          "paras": [
            "PixelCNN's original masking has a geometric defect that is invisible in the loss and cripples the receptive field. It is a good example of a bug you can only find by drawing the picture."
          ],
          "code": "# PixelCNN enforces causality with MASKED CONVOLUTIONS: zero out the kernel\n# weights for positions at or after the current pixel in raster order.\n#\n#   mask A (first layer):  X X X       mask B (later layers):  X X X\n#                          X . .                               X X .\n#                          . . .                               . . .\n#   (X = visible, . = masked; centre is the current pixel)\n#\n# THE BLIND SPOT. Stack these and the effective receptive field is NOT the\n# full causal region - a triangular wedge above and to the RIGHT is never\n# reachable, no matter how many layers you stack:\n#\n#          # # # # # . .        # = seen\n#          # # # # . . .        . = BLIND, though causally valid\n#          # # # X . . .        X = current pixel\n#\n# The model is denied legitimate context, and nothing in the loss reveals it.\n#\n# THE FIX (Gated PixelCNN): TWO stacks.\n#   vertical stack   - all rows strictly above, no causality issue\n#   horizontal stack - the current row, left of the pixel\n# The vertical feeds INTO the horizontal, so together they cover the full\n# causal region with no gap.\n#\n# Plus a gated activation, borrowed from LSTMs and worth real accuracy:\n#     y = tanh(W_f * x) * sigmoid(W_g * x)\n#\n# THE TRANSFERABLE LESSON: when you impose a structural constraint with\n# masking, DRAW THE EFFECTIVE RECEPTIVE FIELD. This bug survived a published\n# paper because the loss went down and the samples looked fine.",
          "caption": "Stacked masked convolutions leave a triangular blind spot that no depth can fix. The two-stack solution is simple; finding the problem required drawing the receptive field, because the loss never showed it."
        },
        {
          "h": "The modern form: images as token sequences",
          "paras": [
            "The two-stage design that made autoregressive image generation competitive. Stage one decides what the tokens mean; stage two models which arrangements are plausible."
          ],
          "code": "# STAGE 1: VQGAN encodes 256x256x3 -> a 16x16 grid of codebook indices.\n#   3 x 256 x 256 = 196,608 values  ->  256 tokens\n#   a ~768x reduction in sequence length\n# Trained with reconstruction + PERCEPTUAL + patch-adversarial losses (plain\n# MSE would blur, and that blur would cap the whole system).\n\nwith torch.no_grad():\n    tokens = vqgan.encode(images).indices.flatten(1)   # (B, 256), ints\n\n# STAGE 2: an ordinary decoder-only transformer over those tokens.\nlogits = transformer(tokens[:, :-1], cond=text_emb)\nloss = F.cross_entropy(logits.transpose(1, 2), tokens[:, 1:])\n\n# Generation is exactly text generation, with the same toolkit:\ntokens = generate(transformer, cond=text_emb, temperature=1.0, top_p=0.9)\nimage = vqgan.decode(tokens)\n\n# WHY THIS WORKS WHERE PIXEL-LEVEL DID NOT:\n#   * 256 sequential steps instead of 196,608\n#   * each token carries semantic content, not one subpixel of texture\n#   * the perceptually irrelevant detail is handled by the DECODER, not by\n#     the expensive sequential model\n#   * you inherit every transformer optimization: KV caching, FlashAttention,\n#     the whole serving stack\n#\n# Same factorization as latent diffusion - compress cheaply, generate\n# expensively in the small space - with an autoregressive prior instead of\n# a diffusion one.",
          "caption": "VQGAN plus a transformer: 196,608 sequential steps become 256. The two-stage split is identical to latent diffusion's, which is the clearest evidence that compression and generation are genuinely separate problems."
        }
      ],
      "useCases": [
        "Language modelling, where this family is not one option among several but the entire field - every LLM is a decoder-only autoregressive model, and text's discrete, ordered, information-dense nature is exactly what the factorization suits.",
        "Audio and speech generation via neural codecs: WaveNet was raw-waveform autoregressive, and modern systems tokenize audio with a residual VQ codec and run a transformer over the codes - the same two-stage pattern as images.",
        "Unified multimodal models, where images, audio, and text are all token sequences so one transformer handles them together. This is the strongest current argument for autoregressive image generation over diffusion.",
        "Density estimation and lossless compression, where exact likelihoods are the requirement rather than sample quality - an autoregressive model's log-likelihood is directly an achievable code length via arithmetic coding."
      ],
      "pitfalls": [
        "Assuming a good likelihood means good samples. Theis et al. showed the two are only loosely coupled in high dimensions - you can construct models with near-optimal likelihood and terrible samples, and vice versa. Report both and know they answer different questions.",
        "Using a 256-way softmax for pixel intensities. It discards ordinality, so 127 and 128 are unrelated categories. A discretized logistic mixture respects the ordering and cuts parameters sharply - and the same reasoning applies to any ordered categorical output.",
        "Stacking masked convolutions without drawing the receptive field. PixelCNN's blind spot is a triangular region of legitimate context that no depth reaches, and the loss never reveals it.",
        "Forgetting that sampling is sequential and cannot be batched along the sequence. Training parallelizes fully and sampling does not, so a model that trains in hours can be unusable to sample from - the asymmetry is the defining property of the family.",
        "Sampling with the wrong strategy. Pure ancestral sampling from a well-fit model can still produce incoherent output, and the whole temperature / top-k / nucleus toolkit exists because the model's tail is not trustworthy. This is the same quality-diversity dial as guidance and truncation.",
        "Comparing autoregressive likelihoods against a VAE's ELBO or a GAN's nothing. Only exact-likelihood models are comparable with each other, and even then only with the same discretization and bits-per-dimension convention.",
        "Choosing a raster ordering without thinking. There is no canonical order for a 2-D image, the model's conditional structure depends entirely on it, and alternatives - multi-scale, next-scale, or bidirectional-with-masking - can be substantially better."
      ],
      "connections": [
        {
          "ref": "generative/latent-diffusion",
          "text": "Both are two-stage: compress cheaply with an autoencoder, then generate in the small space. Only the prior differs - a transformer versus a diffusion model."
        },
        {
          "ref": "generative/autoencoders",
          "text": "VQ-VAE is the compression stage that made autoregressive image generation viable, and its discreteness is exactly what a transformer prior needs."
        },
        {
          "ref": "advanced-nlp/architectures",
          "text": "Decoder-only transformers ARE this family; the causal mask is what enforces the chain-rule factorization."
        },
        {
          "ref": "generative/ebm-score",
          "text": "Factorization is one of the five escapes from the normalizing constant - the most direct one, paid for entirely in sampling speed."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Without KV caching, sequential sampling recomputes attention over the whole prefix at every step, turning O(n) generation into O(n^2) work."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is an autoregressive generative model?",
          "a": "It factorizes p(x) by the chain rule into a product of conditionals, each predicting one element given all previous ones. Each conditional is a small normalized softmax, so the likelihood is exact."
        },
        {
          "q": "Why is the likelihood exact?",
          "a": "Each conditional normalizes over a small support, so the product is automatically a valid distribution. There is no partition function to compute - factorization is the escape."
        },
        {
          "q": "What is the fundamental cost?",
          "a": "Sampling is SEQUENTIAL - O(n) network evaluations, one per element. A 32x32 RGB image needs 3,072 forward passes."
        },
        {
          "q": "Why is training parallel but sampling not?",
          "a": "At training the ground-truth prefix is available, so all conditionals evaluate at once with a causal mask. At sampling each step's input is the previous step's output."
        },
        {
          "q": "What is PixelCNN's blind spot?",
          "a": "Stacked masked convolutions leave a triangular region above and to the right unreachable, denying the model legitimate causal context. Fixed by separate vertical and horizontal stacks."
        },
        {
          "q": "Why a discretized logistic mixture instead of a 256-way softmax?",
          "a": "A softmax over 256 categories discards ORDINALITY - it treats 127 and 128 as unrelated. A logistic mixture integrated over bins respects the ordering and uses far fewer parameters."
        },
        {
          "q": "How did autoregressive image generation become viable?",
          "a": "By changing what it factorizes over: a VQ autoencoder turns 256x256x3 into a 16x16 token grid, so 196,608 sequential steps become 256 over semantically meaningful units."
        },
        {
          "q": "What is VQGAN?",
          "a": "VQ-VAE with perceptual and patch-adversarial losses for sharp reconstruction, paired with a transformer prior over the discrete codes. Image generation as language modelling."
        },
        {
          "q": "Do good likelihoods imply good samples?",
          "a": "No. Theis et al. showed they are only loosely coupled in high dimensions - you can construct models with excellent likelihood and terrible samples, and the reverse."
        },
        {
          "q": "What is bits-per-dimension?",
          "a": "Log-likelihood normalized per dimension and converted to base 2 - the standard comparable unit for exact-likelihood image models, and directly the achievable code length under arithmetic coding."
        },
        {
          "q": "Why does ordering matter for images?",
          "a": "There is no canonical order for a 2-D grid, and the model's entire conditional structure depends on the one you choose. Raster order is arbitrary; multi-scale and next-scale orderings can be better."
        },
        {
          "q": "Where does this family sit in the trilemma?",
          "a": "Exact likelihood and excellent mode coverage - a likelihood objective is mode-covering by construction - paid for entirely in sampling speed."
        }
      ],
      "standard": [
        {
          "q": "Compare autoregressive and diffusion models for image generation.",
          "a": "THE STRUCTURAL DIFFERENCE. Autoregressive models factorize over SPACE - generate element 1, then 2 conditioned on 1, and so on. Diffusion factorizes over NOISE LEVEL - generate the whole image at once, repeatedly, refining from noise to data. Both are iterative; they iterate along different axes, and almost every practical difference follows from that. AUTOREGRESSIVE ADVANTAGES. (1) EXACT LIKELIHOOD, directly comparable across models and directly usable for compression and density estimation. Diffusion gives a bound, or an exact likelihood only via the probability-flow ODE at extra cost. (2) A MATURE, SHARED STACK - if images are tokens, every transformer optimization applies: KV caching, FlashAttention, speculative decoding, quantization, established serving infrastructure. This is a bigger practical advantage than it sounds. (3) NATURAL MULTIMODALITY: one model over interleaved text and image tokens, which is the strongest current argument for the approach. (4) VARIABLE-LENGTH output is natural. (5) Sampling control is well understood - temperature, top-k, nucleus, and beam search all transfer. DIFFUSION ADVANTAGES. (1) PARALLEL generation within each step - the whole image is produced at once, refined - so it maps far better onto accelerators than a sequential loop. (2) NO ORDERING ARTIFACT. Raster order makes the top-left corner unconditioned and the bottom-right conditioned on everything, which is an arbitrary asymmetry with no basis in image structure. Diffusion treats all positions symmetrically. (3) ITERATIVE REFINEMENT means every position can be revised in light of every other, whereas an autoregressive model cannot revisit a committed token - there is no undo. (4) MUCH BETTER CONTROLLABILITY: intervening at every denoising step is what makes inpainting, guidance, and ControlNet natural. (5) It is the more mature path for high-resolution images with a large ecosystem. THE STEP-COUNT COMPARISON, which is more even than it first appears. Diffusion: 20-50 steps, each a full network pass over the whole image, and 2x that with guidance. Token-based autoregressive: ~256 steps for a 16x16 grid, each cheap with KV caching. The totals are closer than the raw counts suggest, and both are being attacked - diffusion by distillation to 1-4 steps, autoregressive by parallel decoding schemes. WHERE THINGS STAND, honestly. Diffusion dominates pure image quality and the tooling ecosystem. Autoregressive is winning the MULTIMODAL argument, because unifying modalities as token sequences is architecturally clean and lets image generation inherit everything built for LLMs. VAR (visual autoregressive, next-SCALE prediction rather than next-token) reported beating diffusion on ImageNet with better scaling behaviour, which is a genuine result and suggests the ordering choice was more of the handicap than the factorization. And several recent systems are HYBRID - autoregressive over coarse structure with a diffusion decoder for detail - which is a sensible reading of where each is strong. WHAT I WOULD SAY IN AN INTERVIEW: the choice is increasingly about the SYSTEM rather than the images. If you are building a unified multimodal model, tokens and a transformer are the coherent design. If you are building the best possible image generator with fine-grained control, diffusion has the ecosystem and the controllability. And the fact that both use the SAME two-stage compression (VQGAN or a VAE, then an expensive generative model in the small space) is the deeper point - that factorization is the settled part, and the prior is still contested.",
          "deepDive": {
            "q": "What is VAR (visual autoregressive modelling), and why does next-scale prediction help?",
            "a": "THE PROBLEM IT ADDRESSES. Standard autoregressive image models predict the next TOKEN in raster order over a flattened token grid. That imposes three unnatural things on a 2-D image. (1) An ARBITRARY ORDER: the top-left corner is generated with no context and the bottom-right with full context, an asymmetry with no basis in image structure. (2) A BROKEN LOCALITY structure: adjacent rows are far apart in the flattened sequence, so vertical neighbours are distant in the model's conditioning. (3) LONG SEQUENCES with quadratic attention cost - a 32x32 token grid is 1,024 steps. VAR'S REFRAMING (Tian et al., 2024). Predict the next SCALE rather than the next token. Encode an image into a multi-scale pyramid of token maps - 1x1, then 2x2, 4x4, 8x8, up to 16x16 - using a residual quantizer where each scale encodes what the previous scales could not represent. Then generate scale by scale: produce the entire 1x1 map, then the entire 2x2 map conditioned on it, and so on. Within a scale, ALL tokens are predicted in PARALLEL; the autoregression is across scales only. WHY THIS IS BETTER, and the reasons are distinct. (1) IT MATCHES HOW IMAGES ARE STRUCTURED - coarse-to-fine. Global composition is decided first and detail is filled in conditioned on it, which is both a better inductive bias and closer to how humans describe and perceive images. (2) NO ARBITRARY ORDERING WITHIN A SCALE. Every token at a given scale sees the same context (all coarser scales) and is generated simultaneously, restoring the spatial symmetry that raster order destroys. (3) FAR FEWER SEQUENTIAL STEPS - the number of SCALES, roughly 10, rather than the number of tokens, roughly 1,000. Each step is a bigger parallel computation, which suits accelerators far better than a long thin sequential loop. This is a large wall-clock win. (4) The conditioning at each step is 2-D and local rather than a flattened prefix, so the attention structure is more natural. THE RESULTS. VAR reported beating diffusion transformers on ImageNet 256x256 generation in both FID and inference speed, and - more interestingly - exhibited POWER-LAW SCALING in model size and compute of the kind seen in LLMs, with predictable improvement. It also showed zero-shot generalization to inpainting and editing. It won a NeurIPS best paper award. WHAT IT SUGGESTS, which is the part worth taking away. The handicap of autoregressive image modelling may have been the ORDERING, not the autoregressive factorization. Raster order was inherited from how images are stored in memory, not from anything about images, and it imposed a poor conditional structure. Change the order to something that respects image structure and the family becomes competitive with diffusion. That is a specific instance of a general point: in an autoregressive model the ORDER IS A MODELLING DECISION and a consequential one, and defaults inherited from data formats are rarely the right choice. THE CAVEATS I would attach. It requires a multi-scale residual quantizer, so stage one is more complex than a plain VQ-VAE and its quality caps the system as usual. The results are on class-conditional ImageNet, which is a narrower setting than open-domain text-to-image where diffusion's ecosystem advantages are largest. And 'coarse-to-fine generation' is not a new idea - it is what cascaded diffusion and Laplacian-pyramid GANs also do; VAR's contribution is making it the autoregressive factorization itself rather than a multi-stage pipeline."
          }
        },
        {
          "q": "Why do likelihood and sample quality diverge, and what should you report?",
          "a": "THE CLAIM, from Theis, van den Oord & Bethge's 'A note on the evaluation of generative models' - one of the most useful short papers in the field. Log-likelihood and sample quality are LARGELY INDEPENDENT in high dimensions, and optimizing one gives essentially no guarantee about the other. THE CONSTRUCTIONS THAT PROVE IT, and they are simple enough to state. (1) GREAT LIKELIHOOD, TERRIBLE SAMPLES. Take a model that is 99% a bad generator and 1% a very good one, mixed. In high dimensions the log-likelihood is dominated by whichever component assigns high probability, so the mixture's likelihood is within a tiny constant of the good component's - specifically, log(0.01) is a negligible penalty against a likelihood measured in thousands of nats. But 99% of your SAMPLES come from the bad component. Near-optimal likelihood, useless samples. (2) GREAT SAMPLES, TERRIBLE LIKELIHOOD. A model that memorizes the training set and samples from it uniformly produces perfect samples and assigns zero probability to any held-out point - infinitely bad likelihood. A GAN sits nearer this end: excellent samples, no meaningful likelihood at all. WHY IT HAPPENS. The two measure different things. Likelihood is an average over the DATA of how much probability the model assigns - so it punishes assigning low probability to real things (mode-covering) and barely notices assigning probability to non-things. Sample quality asks whether things the model PRODUCES look real - so it punishes producing non-things and barely notices missed modes. Those are near-orthogonal failure modes. In high dimensions the asymmetry is extreme, because a tiny fraction of the probability mass can dominate the average log-likelihood while contributing almost none of the samples. WHAT THIS IMPLIES FOR EVALUATION. (1) REPORT BOTH, and treat them as answers to different questions rather than as two estimates of one quality. (2) EVALUATE FOR THE APPLICATION. Lossless compression needs likelihood, full stop - bits-per-dimension IS the achievable code length. Anomaly detection and density estimation need likelihood. Content generation needs sample quality. Semi-supervised learning needs neither directly; it needs representation quality. Choosing the metric from the deployment is the actual discipline. (3) DO NOT COMPARE ACROSS FAMILIES CARELESSLY. An autoregressive model's exact likelihood, a VAE's ELBO, a flow's exact likelihood, and a diffusion model's bound are not the same quantity, and a GAN has none. (4) BE CAREFUL WITH BITS-PER-DIMENSION even among exact-likelihood models: the discretization convention (uniform dequantization versus variational dequantization) changes the number materially, and papers do not always state it. THE SPECIFIC CAUTION FOR AUTOREGRESSIVE MODELS, which is the reason this comes up here. They achieve the best likelihoods of any family, and this is sometimes presented as evidence they are the best generative models. It is evidence they are the best DENSITY ESTIMATORS. Their samples were, for a long time, visibly worse than GANs' at the same likelihood advantage. The gap is largely explained by the above - a likelihood objective spreads mass to cover everything, including regions with no data, and samples from that spread mass look wrong. WHAT I WOULD ACTUALLY REPORT for a new generative model: bits-per-dimension with the dequantization convention stated (if exact likelihood is available), FID with the sample count and Inception implementation stated, precision and recall separately so quality and coverage are not conflated, a human comparison against a baseline, and a nearest-training-neighbour memorization check. The shape of that table is the result, and any single line of it can be gamed."
        },
        {
          "q": "How does the token-based approach make image generation a language-modelling problem?",
          "a": "THE TRANSFORMATION. Stage one, a VQ autoencoder (VQGAN in practice) maps an image to a grid of discrete indices into a learned codebook - 256x256x3 becomes, say, a 16x16 grid of integers, roughly a 768-fold reduction in sequence length. Stage two, an ordinary decoder-only transformer models the distribution over those integer sequences, exactly as it would over text tokens. Generation samples a token sequence and the VQ decoder renders it to pixels. WHAT THIS BUYS, and the list is longer than it first appears. (1) SEQUENCE LENGTH becomes tractable: 256 sequential steps instead of 196,608, over units that carry semantic content rather than one subpixel of texture. (2) THE ENTIRE LLM STACK APPLIES UNCHANGED - KV caching, FlashAttention, tensor and sequence parallelism, quantization, speculative decoding, mature serving infrastructure, and every scaling-law result. You are not building generative-image infrastructure; you are reusing text infrastructure. This is a very large practical advantage and it compounds over time. (3) SAMPLING CONTROL transfers: temperature, top-k, nucleus sampling, and classifier-free guidance over token logits all work with no modification. (4) MULTIMODALITY becomes structural rather than bolted on. If images are token sequences and text is token sequences, one transformer over an interleaved stream handles both, and it can generate either. That is the design behind unified multimodal models and it is the strongest argument for this approach. (5) SCALING is predictable in the way LLM scaling is. (6) CONDITIONING is trivial - prepend the condition's tokens to the sequence. WHAT IT COSTS. (1) THE AUTOENCODER IS A HARD CEILING, exactly as in latent diffusion. Whatever VQGAN cannot reconstruct, the system cannot generate, and quantization loss is more severe than a continuous latent's - which is why VQGAN needs perceptual and adversarial losses to be usable at all. (2) CODEBOOK COLLAPSE: most entries go unused, cutting effective capacity far below the nominal size. Mitigated with EMA updates, dead-code reinitialization, and low-dimensional codebook vectors, and it remains a real tuning burden. (3) THE ORDERING PROBLEM does not go away - raster order over a token grid is still arbitrary, still makes the top-left unconditioned, and still breaks 2-D locality. This is precisely what VAR's next-scale prediction attacks. (4) ERROR ACCUMULATION: an early wrong token commits the model to a bad global structure with no way to revise, which diffusion's iterative refinement does not suffer. (5) TWO STAGES to train, tune, and debug. WHERE IT IS DEPLOYED. The lineage runs VQ-VAE to VQGAN to DALL-E 1 (which was exactly this) to Parti and Muse, and into current unified multimodal models that generate images as tokens. Audio took the same route with residual VQ codecs, and audio language models are precisely this pattern. THE FRAMING I FIND MOST USEFUL: the important question was never 'transformer or diffusion'. It was 'what should the generative model operate on', and the settled answer in both families is a compressed representation from a cheap autoencoder. Latent diffusion uses a continuous latent with a diffusion prior; VQGAN plus a transformer uses a discrete latent with an autoregressive prior. Same factorization, different prior - and the choice between them is increasingly decided by what the surrounding SYSTEM needs rather than by image quality alone."
        },
        {
          "q": "Why is sampling from an autoregressive model harder than it looks?",
          "a": "THE NAIVE VIEW is that if the model is a good density estimator you should sample ancestrally - draw each token from its predicted conditional - and you get samples from the model distribution. That is correct and it frequently produces bad output, for reasons worth separating. (1) THE TAIL IS NOT TRUSTWORTHY. A softmax assigns nonzero probability to every token, and the model's estimates in the far tail are based on almost no data and are essentially noise. Sampling faithfully means occasionally drawing one of those, and a single bad token is not just one bad element - it CONDITIONS EVERYTHING AFTER IT. In text this produces the classic derailment where one odd word sends the rest of the paragraph somewhere strange. (2) EXPOSURE BIAS. Training conditions on ground-truth prefixes; sampling conditions on the model's own outputs. Once the model produces something slightly off-distribution, it is in a state it never trained on, and errors compound. This is a genuine train/inference mismatch, and it is why long generations degrade more than short ones. (3) NO UNDO. A committed token cannot be revised in light of what comes later, unlike diffusion's iterative refinement, so an early structural error is permanent. (4) THE DEGENERATION PARADOX (Holtzman et al.): maximizing likelihood - beam search or greedy decoding - produces REPETITIVE, degenerate text, which is deeply counterintuitive. The most probable sequence is not a typical sequence. Human text sits in a moderate-probability region; the highest-probability continuation of anything tends toward loops and platitudes, because repetition is locally very probable. So neither faithful sampling nor likelihood maximization gives you what you want. THE TOOLKIT, and what each does. TEMPERATURE scales the logits: below 1 sharpens (more coherent, less diverse), above 1 flattens. TOP-K truncates to the k most likely tokens - simple, and the right k depends on how peaked the distribution is at that position, which varies. NUCLEUS (top-p) truncates to the smallest set whose cumulative probability exceeds p, which adapts to the distribution's shape and is generally better than top-k for that reason. REPETITION PENALTIES down-weight already-generated tokens, treating a symptom. MIN-P and typical sampling are refinements aimed at the same problem. BEAM SEARCH helps for constrained tasks (translation, where there is a right answer) and hurts for open-ended generation, for the degeneration reason above. THE UNIFYING OBSERVATION, which is this module's recurring theme: every one of these is a QUALITY-VERSUS-DIVERSITY DIAL applied at inference. Lower temperature and smaller nucleus give more coherent, less varied output. That is the same trade as classifier-free guidance's w in diffusion and the truncation trick in GANs - three families, three mechanisms, one slider. And in all three cases you are sampling from a distribution the model was NOT trained to represent, which is why the settings are empirical and why they are exposed to users. FOR IMAGE TOKENS SPECIFICALLY: the same toolkit applies, and classifier-free guidance can be applied over token logits by running conditional and unconditional passes and extrapolating - so even the diffusion technique transfers. The practical settings differ because image token distributions are shaped differently from text, but the machinery is identical, which is another instance of the infrastructure-reuse argument."
        },
        {
          "q": "What is teacher forcing and what problems does it cause?",
          "a": "WHAT IT IS. During training, condition each prediction on the GROUND-TRUTH prefix rather than on the model's own previous outputs. This is what makes autoregressive training parallel - with a causal mask, all positions are computed in one pass - and without it training would be as sequential as sampling and hopelessly slow. Every autoregressive model is trained this way; it is not optional. THE PROBLEM: EXPOSURE BIAS. At training the model only ever sees prefixes drawn from the true data distribution. At inference it sees prefixes it generated itself, which are not distributed the same way. Once it produces something slightly unusual, it is in a state it never trained on, its next prediction is less reliable, and errors compound along the sequence. The model was never EXPOSED to its own mistakes, hence the name. THE OBSERVABLE SYMPTOMS: degradation that worsens with sequence length; repetition loops; and outputs that start coherently and drift. WHAT HAS BEEN PROPOSED. (1) SCHEDULED SAMPLING (Bengio et al.): during training, randomly substitute the model's own prediction for the ground truth with a probability that increases over training. Intuitive, and it has a real problem - it makes the training objective INCONSISTENT with maximum likelihood, and Huszar showed it is a biased estimator that can converge to the wrong model. It also breaks the parallelism that made teacher forcing worth using. (2) PROFESSOR FORCING uses an adversarial discriminator to make the hidden-state dynamics under teacher forcing and free running indistinguishable. Elegant and rarely used. (3) SEQUENCE-LEVEL TRAINING - RL or minimum-risk training against a sequence-level metric (MIXER, self-critical sequence training) - optimizes what you actually care about rather than per-token likelihood, at the cost of high-variance gradients and much more complex training. (4) RL FROM HUMAN FEEDBACK is, among other things, a sequence-level training procedure that operates on the model's own generations, so it directly addresses the mismatch - which is an underappreciated framing of what RLHF is doing mechanically. HOW IMPORTANT IS IT ACTUALLY? This is where I would push back on the standard telling. Exposure bias was considered a central problem in the RNN era and its practical significance has shrunk considerably. Modern LLMs are trained with pure teacher forcing and generate coherent text over thousands of tokens. Several factors explain this: much larger models with much more data cover far more of the state space, so 'a state it never trained on' is rarer; better sampling strategies (nucleus, temperature) keep generation away from the tail where derailment starts; and the sheer diversity of training data means the model has seen text that looks like most of its own plausible errors. Some analyses argue that exposure bias was substantially conflated with underfitting. WHAT REMAINS TRUE. It is still a genuine train/inference mismatch, it still explains why very long generations degrade more than short ones, and it is still why generation quality is sensitive to the sampling strategy in a way that a perfectly-fit model would not be. And the general lesson transfers well beyond autoregressive models: whenever training conditions on something the model will not have at inference, expect a gap, and expect it to show up as compounding error in sequential settings. That pattern recurs in imitation learning (where DAgger is the analogous fix), in cascaded generative pipelines (where noise conditioning augmentation is the fix), and anywhere a system is trained on ground truth and deployed on its own output."
        },
        {
          "q": "You need lossless image compression. How would an autoregressive model help?",
          "a": "THE CONNECTION IS EXACT, and it is the cleanest application of an exact-likelihood model. Shannon's source coding theorem says the optimal code length for a symbol with probability p is -log2(p) bits. An autoregressive model gives you p(x_i | x_<i) for every element, so ARITHMETIC CODING can encode the data at almost exactly the model's negative log-likelihood in bits. Bits-per-dimension is therefore not a proxy for compression performance - it IS the achievable compression rate, up to a negligible overhead. That makes this the one setting where likelihood is unambiguously the right metric. THE SCHEME. Encoding: for each element in order, compute the model's conditional distribution given the already-encoded prefix, and feed it to the arithmetic coder along with the true value. Decoding: run the SAME model on the already-decoded prefix to get the identical distribution, and use it to decode the next value. Because the model is deterministic and both sides process elements in the same order, encoder and decoder stay in lockstep. The model itself is shared, not transmitted. WHY IT BEATS CLASSICAL CODECS. PNG and FLIF use hand-designed local predictors and context models. A neural autoregressive model learns a far better predictive distribution from data, and the gain is substantial - learned lossless compressors beat PNG comfortably and beat the best classical codecs (FLIF, JPEG-XL lossless) on matched domains. THE PROBLEM, and it is decisive in practice: SPEED. Both encoding and decoding require one network evaluation PER ELEMENT, sequentially. For a megapixel image that is millions of forward passes, taking minutes to hours. And unlike generation, decoding cannot be approximated or distilled - it must reproduce the encoder's distributions EXACTLY, bit for bit, or decompression fails catastrophically. That exactness requirement also means you must be careful about floating-point determinism across hardware and library versions, which is a genuine engineering hazard. THE APPROACHES THAT MAKE IT PRACTICAL. (1) PARALLEL-FRIENDLY FACTORIZATIONS: multi-scale schemes that condition on a downsampled version and decode a whole level in parallel, trading a little compression for orders of magnitude in speed. (2) BITS-BACK CODING with latent-variable models (Bits-Back ANS, HiLLoC), which lets you use a VAE for lossless compression by recovering the bits spent encoding the latent - clever, and it makes non-autoregressive models usable here. (3) LOCAL context models that condition on a small neighbourhood, cheap enough to run at scale. (4) L3C and similar learned hierarchical approaches designed for speed from the start. WHAT I WOULD ACTUALLY RECOMMEND. For a domain-specific archive where compression ratio dominates and time does not - medical imaging archives, scientific data, satellite imagery - a learned autoregressive compressor is genuinely worth it, and a model fine-tuned on that domain does much better than a general one. For general-purpose or interactive use, the sequential decode makes it impractical and a fast learned codec or a good classical one is the right answer. THE TWO CAUTIONS I would flag. (a) The model must be available and IDENTICAL at decompression time, forever. That is a serious archival dependency - you are coupling your data's readability to a specific model artifact and its numerical behaviour. (b) Compression ratio is domain-dependent: a model trained on natural images will do poorly on documents or medical scans, so the domain must be fixed or the model chosen per domain and recorded alongside the data."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Autoregressive factorization",
        "back": "p(x) = product of p(x_i | x_<i) by the chain rule. Each conditional is a small normalized softmax, so the likelihood is EXACT - factorization is the escape from the partition function."
      },
      {
        "type": "intuition",
        "front": "The defining asymmetry",
        "back": "Training is parallel (ground-truth prefixes + causal mask = one pass); sampling is SEQUENTIAL, O(n) network evaluations. A 32x32 RGB image needs 3,072 passes. This asymmetry is the family's whole cost."
      },
      {
        "type": "pitfall",
        "front": "PixelCNN's blind spot",
        "back": "Stacked masked convolutions leave a TRIANGULAR region above-and-right unreachable at any depth - legitimate context the model is denied, invisible in the loss. Fix: separate vertical and horizontal stacks. Always DRAW the effective receptive field."
      },
      {
        "type": "pitfall",
        "front": "256-way softmax for pixels",
        "back": "Discards ORDINALITY - 127 and 128 become unrelated categories. Use a discretized logistic mixture (K~10) integrated over bins. General rule: a softmax over an ORDERED categorical throws away structure."
      },
      {
        "type": "definition",
        "front": "VQGAN + transformer",
        "back": "Stage 1 compresses 256x256x3 to a 16x16 token grid (~768x shorter), trained with perceptual + adversarial losses. Stage 2 is a plain decoder-only transformer over those tokens. Image generation as language modelling."
      },
      {
        "type": "intuition",
        "front": "Why tokens rescued AR image generation",
        "back": "256 sequential steps instead of 196,608, over units carrying SEMANTIC content rather than one subpixel of texture - and you inherit the whole LLM stack (KV cache, FlashAttention, serving)."
      },
      {
        "type": "pitfall",
        "front": "Likelihood does not imply sample quality",
        "back": "Mix 99% bad generator with 1% good: in high dimensions log(0.01) is negligible against thousands of nats, so likelihood is near-optimal while 99% of SAMPLES are bad. The reverse also constructs. Report both."
      },
      {
        "type": "definition",
        "front": "Bits-per-dimension",
        "back": "Log-likelihood normalized per dimension in base 2 - and it IS the achievable arithmetic-coding length, not a proxy. State the dequantization convention (uniform vs variational); it changes the number materially."
      },
      {
        "type": "intuition",
        "front": "VAR: next-SCALE prediction",
        "back": "Autoregress across a coarse-to-fine pyramid (1x1, 2x2, ... 16x16), all tokens within a scale in PARALLEL. ~10 sequential steps not ~1000, no arbitrary within-scale ordering, and LLM-like power-law scaling. The handicap was the ORDER, not the factorization."
      },
      {
        "type": "pitfall",
        "front": "The degeneration paradox",
        "back": "Maximizing likelihood (beam/greedy) produces REPETITIVE degenerate text - the most probable sequence is not a typical one. So neither faithful sampling nor likelihood maximization works; hence temperature, top-k, nucleus."
      },
      {
        "type": "definition",
        "front": "Teacher forcing and exposure bias",
        "back": "Train on GROUND-TRUTH prefixes (which is what makes training parallel), sample on the model's OWN outputs. The mismatch compounds along a sequence. Much less severe at LLM scale than in the RNN era - often conflated with underfitting."
      },
      {
        "type": "intuition",
        "front": "One dial, three families",
        "back": "Temperature/top-p in AR models, guidance scale w in diffusion, truncation in GANs - all the same inference-time quality-vs-diversity slider, and all sample from a distribution the model was never trained to represent."
      }
    ],
    "refs": [
      {
        "title": "van den Oord et al. (2016), Conditional Image Generation with PixelCNN Decoders",
        "url": "https://arxiv.org/abs/1606.05328"
      },
      {
        "title": "Esser et al. (2021), Taming Transformers for High-Resolution Image Synthesis (VQGAN)",
        "url": "https://arxiv.org/abs/2012.09841"
      },
      {
        "title": "Tian et al. (2024), Visual Autoregressive Modeling: Scalable Image Generation via Next-Scale Prediction (VAR)",
        "url": "https://arxiv.org/abs/2404.02905"
      },
      {
        "title": "Theis et al. (2016), A note on the evaluation of generative models",
        "url": "https://arxiv.org/abs/1511.01844"
      },
      {
        "title": "Holtzman et al. (2020), The Curious Case of Neural Text Degeneration",
        "url": "https://arxiv.org/abs/1904.09751"
      }
    ],
    "demos": [
      "decoding",
      "tokenizer",
      "beam-search",
      "convolution"
    ]
  }
};
