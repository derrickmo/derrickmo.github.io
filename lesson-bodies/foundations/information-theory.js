// GENERATED from content/lessons/foundations/information-theory.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/information-theory/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "information-theory": {
    "level": "intro",
    "body": {
      "intuition": [
        "Entropy answers a deceptively simple question: on average, how many bits does it take to describe an outcome drawn from a given distribution? A fair coin flip needs exactly 1 bit; a coin that lands heads 99% of the time needs far less, because 'heads' is barely surprising and can be encoded cheaply - entropy is the theoretical floor on average encoding length, and it doubles as a measure of uncertainty: a uniform distribution (maximally unpredictable) has the highest entropy of any distribution over the same outcomes.",
        "Cross-entropy is what happens when your encoding scheme is built for the *wrong* distribution: if you design your code assuming distribution Q but the true distribution is P, you pay more bits on average than entropy's floor - and that gap is exactly the KL divergence. This is not a coincidence chosen for teaching purposes; it is why cross-entropy is the standard classification loss. Training a classifier by minimizing cross-entropy between predicted probabilities Q and true labels P is, bit for bit, minimizing the extra encoding cost of using your model's beliefs instead of the truth.",
        "Mutual information closes the loop: it measures how many bits knowing one variable saves you when describing another - zero if they're independent, and it captures nonlinear dependence that plain correlation misses entirely (the Y=X^2 example from the previous lesson has zero correlation but strictly positive mutual information). These three quantities - entropy, cross-entropy, KL divergence - are the vocabulary you'll use to talk about loss functions, calibration, and information flow through a network for the rest of this curriculum."
      ],
      "math": [
        {
          "h": "Entropy, cross-entropy, and KL divergence - one family of formulas",
          "paras": [
            "Entropy H(P) is the expected 'surprise' (-log P(x)) of outcomes drawn from P itself. Cross-entropy H(P,Q) is the expected surprise of outcomes drawn from P but measured using Q's log-probabilities - it's always at least H(P), and the gap is the KL divergence D_KL(P||Q), which is zero exactly when P=Q and strictly positive otherwise (Gibbs' inequality)."
          ],
          "tex": "H(P) = -\\sum_x P(x)\\log P(x) \\quad H(P,Q) = -\\sum_x P(x)\\log Q(x) \\quad D_{KL}(P\\Vert Q) = H(P,Q) - H(P) = \\sum_x P(x)\\log\\frac{P(x)}{Q(x)} \\ge 0",
          "texNote": "Cross-entropy = entropy + KL divergence. Minimizing cross-entropy against a fixed true label distribution P is exactly minimizing KL divergence, since H(P) doesn't depend on the model's parameters."
        },
        {
          "h": "Mutual information as a difference of entropies",
          "paras": [
            "Mutual information I(X;Y) measures how much uncertainty about X is removed by observing Y - equivalently, it's the KL divergence between the true joint distribution and the (independence-assuming) product of marginals, which is exactly zero when X and Y are independent."
          ],
          "tex": "I(X;Y) = H(X) - H(X\\mid Y) = D_{KL}\\big(P(X,Y) \\;\\Vert\\; P(X)P(Y)\\big) \\ge 0",
          "texNote": "I(X;Y)=0 if and only if X and Y are independent - unlike correlation, mutual information captures any kind of statistical dependence, linear or not."
        }
      ],
      "code": [
        {
          "h": "Entropy, cross-entropy, and KL from scratch",
          "paras": [
            "The three quantities computed directly from their definitions, showing the H(P,Q) = H(P) + D_KL(P||Q) identity holds numerically."
          ],
          "code": "import numpy as np\n\ndef entropy(p, eps=1e-12):\n    p = np.clip(p, eps, 1)\n    return -np.sum(p * np.log2(p))\n\ndef cross_entropy(p, q, eps=1e-12):\n    q = np.clip(q, eps, 1)\n    return -np.sum(p * np.log2(q))\n\ndef kl_divergence(p, q, eps=1e-12):\n    p, q = np.clip(p, eps, 1), np.clip(q, eps, 1)\n    return np.sum(p * np.log2(p / q))\n\ntrue_dist = np.array([0.7, 0.2, 0.1])          # true label distribution (or one-hot in practice)\nmodel_a   = np.array([0.6, 0.3, 0.1])          # a decent model\nmodel_b   = np.array([0.33, 0.33, 0.34])       # a poorly-calibrated (near-uniform) model\n\nfor name, q in [('model_a', model_a), ('model_b', model_b)]:\n    ce, kl = cross_entropy(true_dist, q), kl_divergence(true_dist, q)\n    print(f\"{name}: H(P,Q)={ce:.3f} bits, D_KL={kl:.3f} bits, H(P)+D_KL={entropy(true_dist)+kl:.3f}\")\n    # confirms H(P,Q) == H(P) + D_KL(P||Q) to floating-point precision",
          "caption": "Cross-entropy always equals entropy plus KL divergence - a worse model (model_b) pays a larger KL 'penalty' on top of the same irreducible entropy floor."
        },
        {
          "h": "Mutual information catches what correlation misses",
          "paras": [
            "The classic case: Y = X^2 for X symmetric around 0 has zero linear correlation with X, but mutual information correctly flags them as dependent."
          ],
          "code": "import numpy as np\nfrom sklearn.feature_selection import mutual_info_regression\n\nrng = np.random.default_rng(0)\nx = rng.uniform(-1, 1, 5000)\ny = x ** 2 + 0.01 * rng.standard_normal(5000)   # perfectly (nonlinearly) dependent\n\ncorr = np.corrcoef(x, y)[0, 1]\nmi = mutual_info_regression(x.reshape(-1, 1), y, random_state=0)[0]\nprint(f\"Pearson correlation: {corr:.4f}\")   # ~0.00 - looks independent!\nprint(f\"Mutual information: {mi:.4f} nats\") # clearly > 0 - correctly detects dependence",
          "caption": "Correlation only sees linear relationships; mutual information sees any statistical dependence, which is why it shows up in feature selection and information bottleneck analyses (Module 24)."
        }
      ],
      "useCases": [
        "Cross-entropy IS the standard classification loss - every softmax classifier in this curriculum trains by minimizing it, from Module 02's logistic regression through Module 08's transformers.",
        "KL divergence appears throughout: as a regularizer in VAEs (Module 11), as the trust-region constraint in RLHF/PPO (Module 24's overoptimization lesson), and as the basis of temperature scaling's calibration objective.",
        "Mutual information motivates representation learning objectives (maximize I between a representation and the signal you care about, InfoNCE-style contrastive losses in Module 12) and feature-selection methods that need to catch nonlinear dependence.",
        "Perplexity, the standard language-model evaluation metric, is just 2^(cross-entropy) - a transformation of the same quantity into an interpretable 'effective vocabulary size'."
      ],
      "pitfalls": [
        "Confusing entropy (a property of one distribution) with cross-entropy (a property of two distributions being compared) - they coincide only when the two distributions are identical.",
        "Computing log(0) when a predicted probability is exactly 0 for the true class - always clip probabilities away from the boundary (or use a numerically stable log-softmax + NLL formulation) before taking a log.",
        "KL divergence is NOT symmetric: D_KL(P||Q) != D_KL(Q||P) in general - which direction you minimize changes the character of the fit (mode-covering vs mode-seeking behavior), a distinction that matters in variational inference and distillation.",
        "Assuming mutual information is on a fixed, easily-interpretable scale like correlation's [-1,1] - MI is nonnegative and unbounded above, and its magnitude depends on the base of the logarithm (bits vs nats) and estimator used.",
        "Interpreting a lower cross-entropy loss number as automatically meaning better-calibrated probabilities - a model can achieve low average cross-entropy while still being poorly calibrated on specific subgroups or confidence ranges (Module 24's calibration lesson makes this precise)."
      ],
      "connections": [
        {
          "ref": "foundations/probability",
          "text": "Entropy, cross-entropy, and KL divergence are all expectations of a log-probability - a direct application of the expectation operator from the previous lesson."
        },
        {
          "ref": "foundations/calculus",
          "text": "The next lesson covers the gradients of cross-entropy loss with respect to model outputs - the derivative that actually drives every classifier's training."
        },
        {
          "text": "24-01's calibration lesson and 24-10's KL-regularized RLHF objective both build directly on the cross-entropy/KL vocabulary introduced here."
        },
        {
          "text": "25-09's MLE = cross-entropy derivation makes the training-objective connection exact, with a from-scratch numerical proof."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Definition of entropy H(P).",
          "a": "H(P) = -sum_x P(x) log P(x) - the expected 'surprise', and the theoretical minimum average bits to encode outcomes from P."
        },
        {
          "q": "Definition of cross-entropy H(P,Q).",
          "a": "H(P,Q) = -sum_x P(x) log Q(x) - expected surprise of outcomes from P, measured using Q's log-probabilities."
        },
        {
          "q": "Relationship between cross-entropy, entropy, and KL divergence.",
          "a": "H(P,Q) = H(P) + D_KL(P||Q) - cross-entropy is entropy plus the extra cost of using the wrong distribution."
        },
        {
          "q": "Is KL divergence symmetric?",
          "a": "No - D_KL(P||Q) != D_KL(Q||P) in general; it's a divergence, not a distance metric."
        },
        {
          "q": "Why is minimizing cross-entropy loss equivalent to minimizing KL divergence during training?",
          "a": "H(P) (the true label distribution's entropy) doesn't depend on model parameters, so minimizing H(P,Q) over the model's Q is the same optimization as minimizing D_KL(P||Q)."
        },
        {
          "q": "What does mutual information measure?",
          "a": "How much uncertainty about one variable is removed by observing another - zero iff the variables are independent, captures nonlinear dependence unlike correlation."
        },
        {
          "q": "What is perplexity, in terms of cross-entropy?",
          "a": "2^(cross-entropy in bits), or e^(cross-entropy in nats) - an interpretable 'effective vocabulary size' transform of the same loss."
        },
        {
          "q": "What's the entropy of a fair coin flip, in bits?",
          "a": "1 bit - H = -(0.5 log2 0.5 + 0.5 log2 0.5) = 1."
        },
        {
          "q": "Why must predicted probabilities be clipped away from 0 before taking a log for cross-entropy?",
          "a": "log(0) is -infinity - a numerically stable implementation clips or works in log-space (log-softmax) throughout."
        },
        {
          "q": "Which distribution over a fixed support has maximum entropy?",
          "a": "The uniform distribution - maximum uncertainty/unpredictability among all distributions over the same outcomes."
        },
        {
          "q": "Is D_KL(P||Q) ever negative?",
          "a": "No - it's always >= 0 (Gibbs' inequality), equal to zero exactly when P=Q almost everywhere."
        }
      ],
      "standard": [
        {
          "q": "Prove (or derive) that D_KL(P||Q) >= 0 for any two distributions P and Q, and explain the intuition.",
          "a": "By Jensen's inequality applied to the concave log function: D_KL(P||Q) = sum_x P(x) log(P(x)/Q(x)) = -sum_x P(x) log(Q(x)/P(x)) >= -log(sum_x P(x) * Q(x)/P(x)) = -log(sum_x Q(x)) = -log(1) = 0, since -log is convex so Jensen's flips the direction into a lower bound. Intuitively: you can never encode outcomes from P *more* efficiently by pretending they came from a different distribution Q than by using P's own optimal code - any mismatch between your assumed distribution and the true one can only cost extra bits, never save them, which is exactly Gibbs' inequality in information-theoretic language.",
          "deepDive": {
            "q": "Under what condition does equality D_KL(P||Q)=0 hold, and why does that matter for training?",
            "a": "Equality holds if and only if P(x)=Q(x) for every x where P(x)>0 (i.e., P and Q are identical wherever P has support) - which is why minimizing cross-entropy loss to its theoretical floor (H(P)) during training is only possible if the model can represent the true label distribution exactly; in practice with one-hot labels, P is a point mass, so the KL term vanishes only when the model assigns probability 1 to the correct class and 0 to everything else, an unreachable limit that's part of why cross-entropy loss decreases but never truly reaches zero in real training."
          }
        },
        {
          "q": "Explain why D_KL(P||Q) != D_KL(Q||P) with a concrete example, and describe the practically different behavior this asymmetry produces in variational inference.",
          "a": "D_KL(P||Q) = sum_x P(x) log(P(x)/Q(x)) weights the log-ratio by P(x) - if Q(x)=0 somewhere P(x)>0, the term blows up to infinity, so minimizing this direction over Q strongly penalizes Q assigning near-zero probability anywhere P has mass, forcing Q to 'cover' all of P's modes (mode-covering, can result in an overly spread-out Q). D_KL(Q||P) instead weights by Q(x) - it's cheap for Q to simply not place mass where P is near zero, so minimizing this direction lets Q concentrate on just one of P's modes and ignore the rest (mode-seeking). Concretely, if P is a bimodal mixture of two well-separated Gaussians and Q is constrained to be a single Gaussian, minimizing D_KL(P||Q) over Q tends to produce a wide Q straddling both modes (bad fit to either), while minimizing D_KL(Q||P) tends to produce a narrow Q that locks onto just one mode.",
          "deepDive": {
            "q": "Which direction does standard variational inference (e.g., a VAE's ELBO) actually minimize, and what's the practical consequence?",
            "a": "Variational inference typically minimizes D_KL(Q||P) (approximate posterior Q vs true posterior P) because that direction is the one that's tractable to optimize with the evidence lower bound (ELBO) - the practical consequence is that VI-fit approximate posteriors tend to be mode-seeking/underdispersed relative to the true posterior, systematically underestimating uncertainty, which is a well-known limitation motivating alternative approaches (MCMC, normalizing flows) when calibrated uncertainty matters more than a fast point estimate."
          }
        },
        {
          "q": "You train two models to the same cross-entropy loss value on a held-out set. Does that guarantee they have the same accuracy? The same calibration? Explain with the entropy decomposition.",
          "a": "Neither is guaranteed. Cross-entropy H(P,Q) = H(P) + D_KL(P||Q) is a single scalar aggregating errors across the entire predicted distribution and every example; two models can reach the same total KL divergence via completely different error patterns - one might be well-calibrated but occasionally very wrong on hard examples (contributing large per-example KL spikes on a few points), while the other is mildly overconfident everywhere (many small KL contributions spread evenly) - both averaging to the same number. Accuracy only depends on whether argmax(Q) matches the true label, which is invariant to how confident the correct-argmax predictions are, so a model can lose cross-entropy 'points' by being underconfident on already-correct predictions while matching another model's accuracy exactly; calibration (whether stated confidence matches empirical correctness frequency, per 24-01) is an entirely separate axis that a single aggregate loss number cannot certify.",
          "deepDive": {
            "q": "What diagnostic would distinguish these cases in practice?",
            "a": "Break the aggregate cross-entropy down per-example or per-confidence-bin: a reliability diagram (24-01) bins predictions by stated confidence and plots empirical accuracy against confidence - two models with identical average cross-entropy can show very different reliability curves, one hugging the diagonal (well-calibrated) and the other systematically above or below it, revealing the aggregate-vs-per-instance blind spot that a single loss scalar can't."
          }
        },
        {
          "q": "You want to select the top-K most predictive features for a target variable that has a nonlinear relationship with several candidate features. Why might ranking by Pearson correlation choose badly, and how would mutual information fix it - and what's the catch?",
          "a": "Pearson correlation only measures the strength of a *linear* relationship; a feature that's strongly predictive but nonlinearly related to the target (e.g., a U-shaped or periodic relationship) can have correlation near zero and get ranked low or discarded entirely, even though a downstream nonlinear model could exploit it perfectly - the Y=X^2 example is the canonical case. Mutual information I(X;Y) is nonnegative and equals zero only under true statistical independence, so it correctly assigns high MI to the U-shaped feature. The catch: MI is harder to estimate reliably from finite samples, especially for continuous variables (it requires density estimation or a k-nearest-neighbor-based estimator like the Kraskov-Stogbauer-Grassberger method), it has no natural upper bound for comparing 'how predictive' one feature is versus another the way a correlation coefficient in [-1,1] does, and estimator bias/variance can itself rank noisy features artificially high with small sample sizes.",
          "deepDive": {
            "q": "In a high-dimensional feature-selection setting, what's a practical middle ground between correlation and full mutual information?",
            "a": "Tree-based feature importance (e.g., from a gradient-boosted tree ensemble, Module 03) implicitly captures nonlinear and even interaction effects without needing explicit density estimation, since trees split on whatever threshold best reduces impurity regardless of the relationship's shape - it's a common practical substitute when MI estimation is too noisy or slow at scale, though it inherits its own biases (favoring high-cardinality features) that need separate correction."
          }
        },
        {
          "q": "Derive why perplexity = 2^(cross-entropy in bits) is interpreted as an 'effective vocabulary size', and explain what a perplexity of 50 means concretely for a language model.",
          "a": "If a model assigned uniform probability 1/V to every one of V possible next tokens (total ignorance among V equally likely choices), its cross-entropy per token would be -log2(1/V) = log2(V) bits, and perplexity would be 2^(log2 V) = V exactly - perplexity recovers the vocabulary size in this maximally-uncertain baseline case. For a real model with cross-entropy c bits per token, perplexity 2^c is interpreted as 'the model's uncertainty at each step is as if it were choosing uniformly among this many options', even though the model isn't actually restricting itself to a smaller vocabulary - it's a re-scaling of the same information-theoretic quantity into a more intuitive unit. A perplexity of 50 means the model's average per-token uncertainty is comparable to guessing uniformly among 50 equally-likely next tokens, substantially better than guessing among the full vocabulary (often 30,000+ tokens) but still leaving real uncertainty at each step.",
          "deepDive": {
            "q": "Why is perplexity comparison only valid between models sharing the same tokenizer/vocabulary?",
            "a": "Cross-entropy per token is computed relative to a specific tokenization scheme - a model with a coarser tokenizer (fewer, longer tokens covering more text per token) will naturally show higher per-token uncertainty (harder prediction task per step) even if it's equally or more capable overall, while a finer tokenizer artificially lowers per-token perplexity by making each individual prediction easier (more predictable sub-word continuations); comparing raw perplexity across models with different vocabularies conflates genuine capability differences with tokenization-scheme differences, which is why cross-tokenizer comparisons normalize to bits-per-byte or bits-per-character instead."
          }
        },
        {
          "q": "Explain what 'label smoothing' does to a classification loss in terms of cross-entropy and KL divergence, and why it might improve calibration.",
          "a": "Standard cross-entropy training uses a one-hot true distribution P (probability 1 on the correct class, 0 elsewhere) - minimizing H(P,Q) then pushes the model to drive Q(correct class) toward 1 and every other class toward exactly 0, which requires logits to diverge toward infinity to hit an unreachable target, encouraging overconfidence. Label smoothing replaces the one-hot P with a softened distribution - e.g., (1-epsilon) on the true class and epsilon/(K-1) spread over the other K-1 classes - so the target the model is asked to match is no longer a degenerate point mass; minimizing D_KL(P_smoothed || Q) now has a genuinely achievable zero (Q can actually equal P_smoothed with finite logits), which caps how extreme the logits need to become and empirically tends to produce better-calibrated, less overconfident predicted probabilities.",
          "deepDive": {
            "q": "How does label smoothing's effect connect to temperature scaling (24-01) as two different ways of addressing the same overconfidence problem?",
            "a": "They intervene at different points in the pipeline: label smoothing changes the TRAINING objective itself (the target distribution P the model is trained to match), producing a model whose logits are inherently less extreme from the start, while temperature scaling is a POST-HOC fix applied after training - it rescales an already-trained (possibly overconfident) model's logits by dividing by a fitted temperature T* before the softmax, without retraining anything; label smoothing tries to prevent overconfidence from arising during optimization, whereas temperature scaling corrects it after the fact, and the two are complementary rather than redundant - a label-smoothed model can still benefit from a (typically smaller) temperature-scaling correction on top."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Entropy H(P)",
        "back": "-sum_x P(x) log P(x) - expected surprise; the theoretical floor on average encoding length for outcomes from P."
      },
      {
        "type": "formula",
        "front": "Cross-entropy H(P,Q)",
        "back": "-sum_x P(x) log Q(x) - expected surprise of P-outcomes measured with Q's log-probabilities; always >= H(P)."
      },
      {
        "type": "formula",
        "front": "KL divergence decomposition",
        "back": "H(P,Q) = H(P) + D_KL(P||Q) - cross-entropy is entropy plus the extra cost of a wrong distribution."
      },
      {
        "type": "pitfall",
        "front": "KL divergence is asymmetric",
        "back": "D_KL(P||Q) != D_KL(Q||P) - direction changes mode-covering vs mode-seeking behavior in variational inference."
      },
      {
        "type": "intuition",
        "front": "Why cross-entropy is the classification loss",
        "back": "Minimizing H(P,Q) over model params Q = minimizing D_KL(P||Q), since H(P) is constant w.r.t. the model."
      },
      {
        "type": "definition",
        "front": "Mutual information I(X;Y)",
        "back": "How much uncertainty about X is removed by observing Y; zero iff independent - catches nonlinear dependence correlation misses."
      },
      {
        "type": "formula",
        "front": "Perplexity",
        "back": "2^(cross-entropy in bits) - 'effective vocabulary size' the model's uncertainty is comparable to guessing uniformly among."
      },
      {
        "type": "pitfall",
        "front": "Same loss != same calibration",
        "back": "Cross-entropy is a single aggregate number - two models can hit the same value via very different, unequally-calibrated error patterns."
      },
      {
        "type": "pitfall",
        "front": "log(0) in cross-entropy",
        "back": "A predicted probability of exactly 0 for the true class gives -infinity loss - clip probabilities or use a stable log-softmax formulation."
      }
    ],
    "refs": [
      {
        "title": "Cover & Thomas, Elements of Information Theory (Ch. 2)",
        "url": "https://onlinelibrary.wiley.com/doi/book/10.1002/047174882X"
      },
      {
        "title": "Shannon, A Mathematical Theory of Communication (1948)",
        "url": "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf"
      },
      {
        "title": "PyTorch: torch.nn.functional.cross_entropy",
        "url": "https://pytorch.org/docs/stable/generated/torch.nn.functional.cross_entropy.html"
      },
      {
        "title": "Kraskov, Stogbauer, Grassberger - Estimating Mutual Information",
        "url": "https://arxiv.org/abs/cond-mat/0305641"
      }
    ],
    "demos": [
      "cross-entropy",
      "huffman-coding",
      "mutual-information",
      "channel-capacity"
    ],
    "demoTitles": {
      "cross-entropy": "Cross-Entropy Loss",
      "huffman-coding": "Huffman Coding & Entropy",
      "mutual-information": "Mutual Information vs Correlation",
      "channel-capacity": "Channel Capacity"
    }
  }
};
