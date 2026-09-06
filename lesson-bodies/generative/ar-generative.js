// GENERATED from content/lessons/generative/ar-generative.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/generative/ar-generative/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "decoding": "Decoding Strategies",
      "tokenizer": "Tokenizer Lab",
      "beam-search": "Beam Search Tree",
      "convolution": "Convolution Lab"
    }
  }
};
