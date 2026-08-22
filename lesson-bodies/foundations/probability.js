// GENERATED from content/lessons/foundations/probability.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/probability/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "probability": {
    "level": "intro",
    "body": {
      "intuition": [
        "Almost every model you'll build is, under the hood, a statement about probability: a classifier outputs P(class | input), a language model outputs P(next token | context), a generative model outputs P(data). The loss functions used to train them - cross-entropy, MSE, negative log-likelihood - are not arbitrary choices; they fall out of maximum likelihood estimation once you decide what probability distribution your outputs should follow (25-09 makes this identity exact).",
        "The two ideas worth internalizing before anything else: a random variable's *expectation* is a weighted average over its possible outcomes, and Bayes' theorem is just algebra on the definition of conditional probability - but that algebra is the engine behind everything from spam filters to how a model should update its beliefs given new evidence. Getting comfortable manipulating P(A|B), P(B|A), and P(A,B) interchangeably is a skill you will use in every remaining module.",
        "The Central Limit Theorem explains a fact you'll rely on constantly without naming it: averages of many roughly-independent things look approximately Gaussian, regardless of the shape of the underlying distribution - this is why mini-batch gradient noise, sample means, and many aggregate model behaviors are well-approximated by a normal distribution even when individual data points are not."
      ],
      "math": [
        {
          "h": "Bayes' theorem, and why it's just conditional-probability algebra",
          "paras": [
            "The definition of conditional probability, P(A|B) = P(A,B)/P(B), is symmetric in a way that's easy to miss: P(A,B) = P(B,A) also equals P(B|A)P(A). Setting those two expressions for the joint equal and dividing by P(B) gives Bayes' theorem - it isn't a separate law of probability, it's the same joint probability written two ways."
          ],
          "tex": "P(A \\mid B) = \\frac{P(B \\mid A)\\, P(A)}{P(B)} \\qquad P(B) = \\sum_{a} P(B \\mid A{=}a)\\, P(A{=}a)",
          "texNote": "Posterior = likelihood times prior, divided by a normalizing constant (the marginal, obtained by summing/integrating over every value the hidden variable could take)."
        },
        {
          "h": "Expectation and variance as weighted averages",
          "paras": [
            "Expectation is a probability-weighted average of outcomes; variance measures the average squared distance from that average - both are properties of a distribution, not of any single sample, and both are what a model's loss function is implicitly trying to control (minimize expected loss; a high-variance estimator is unreliable even if unbiased on average)."
          ],
          "tex": "\\mathbb{E}[X] = \\sum_x x \\cdot P(X{=}x) \\qquad \\text{Var}(X) = \\mathbb{E}\\big[(X - \\mathbb{E}[X])^2\\big] = \\mathbb{E}[X^2] - \\mathbb{E}[X]^2",
          "texNote": "The 'computational' variance formula (right-hand side) avoids a second pass over the data but can lose precision via catastrophic cancellation when E[X^2] and E[X]^2 are close."
        }
      ],
      "code": [
        {
          "h": "Bayes' theorem as a diagnostic-test problem",
          "paras": [
            "The classic counter-intuitive result: even an accurate test can produce mostly-false positives when the condition is rare - base rates dominate."
          ],
          "code": "import numpy as np\n\n# a disease with 1% prevalence; a test that's 95% sensitive, 90% specific\np_disease = 0.01\np_pos_given_disease = 0.95        # sensitivity\np_pos_given_healthy = 1 - 0.90    # 1 - specificity = false-positive rate\n\np_pos = (p_pos_given_disease * p_disease +\n         p_pos_given_healthy * (1 - p_disease))          # law of total probability\n\np_disease_given_pos = (p_pos_given_disease * p_disease) / p_pos   # Bayes\nprint(f\"P(disease | positive test) = {p_disease_given_pos:.3f}\")  # ~0.088 - mostly false positives!\n\n# verify by simulation\nrng = np.random.default_rng(0)\nn = 2_000_000\nhas_disease = rng.random(n) < p_disease\ntest_pos = np.where(has_disease, rng.random(n) < p_pos_given_disease,\n                                    rng.random(n) < p_pos_given_healthy)\nprint(f\"simulated: {has_disease[test_pos].mean():.3f}\")   # matches the closed form",
          "caption": "Low base rate + imperfect specificity = most positives are false positives - the reason screening-test results always need the prevalence, not just sensitivity/specificity."
        },
        {
          "h": "The Central Limit Theorem, shown not told",
          "paras": [
            "Averaging many samples from a wildly non-Gaussian distribution still produces something visibly bell-shaped - the mechanism behind why sample means and mini-batch statistics behave predictably."
          ],
          "code": "import numpy as np\n\nrng = np.random.default_rng(0)\nn_trials, batch_size = 20_000, 30\n\n# start from a heavily skewed exponential distribution, not remotely Gaussian\nraw = rng.exponential(scale=1.0, size=(n_trials, batch_size))\nbatch_means = raw.mean(axis=1)                    # 20,000 sample means of size 30\n\nprint(f\"population mean/std: {1.0:.3f} / {1.0:.3f}\")               # exponential(1): mean=std=1\nprint(f\"batch-mean mean/std: {batch_means.mean():.3f} / {batch_means.std():.3f}\")\n# std shrinks by ~1/sqrt(batch_size), and a histogram of batch_means looks Gaussian\n# even though `raw` itself is exponential, not Gaussian at all",
          "caption": "The individual samples are exponential (skewed, non-negative); their batch means are approximately Normal(mu, sigma/sqrt(n)) - the CLT in one snippet."
        }
      ],
      "useCases": [
        "Cross-entropy loss is exactly negative log-likelihood under a categorical distribution assumption - every classifier's training objective is a probability statement (tied to 25-09's MLE=CE identity).",
        "A/B testing and experimentation (Module 23) is applied probability: is an observed difference likely to be real or explainable by sampling noise alone?",
        "Bayesian updating (Module 23's Bayesian workflow) is how models incorporate prior knowledge with new evidence - the same algebra as the diagnostic-test example, at scale.",
        "Uncertainty quantification and calibration (Module 24) both start from 'what does it even mean for a model's output to BE a probability, and is it a well-calibrated one'."
      ],
      "pitfalls": [
        "Confusing P(A|B) with P(B|A) - the 'prosecutor's fallacy' (treating the probability of evidence given innocence as if it were the probability of innocence given evidence) is a real, high-stakes version of this exact mix-up.",
        "Ignoring the base rate (prior) when interpreting a conditional probability - a highly 'accurate' test can still produce mostly false positives when the condition being tested for is rare, as the code example shows.",
        "Treating independence as a default assumption rather than something to check - P(A,B) = P(A)P(B) only holds when A and B are actually independent; correlated features violate it constantly in real data.",
        "Using the 'computational' variance formula (E[X^2] - E[X]^2) naively on large-magnitude data - subtracting two large nearly-equal numbers loses floating-point precision; prefer a numerically stable one-pass algorithm (Welford's) when it matters.",
        "Assuming the Central Limit Theorem kicks in at any sample size - convergence to Gaussian can be slow for heavily skewed or heavy-tailed distributions, and 'n=30 is enough' is a rule of thumb, not a guarantee."
      ],
      "connections": [
        {
          "ref": "foundations/linear-algebra",
          "text": "Multivariate Gaussians and covariance matrices - the vector/matrix generalization of these ideas - build directly on the linear algebra from the previous lesson."
        },
        {
          "ref": "foundations/information-theory",
          "text": "The next lesson's entropy, cross-entropy, and KL divergence are all expectations of a log-probability - a direct extension of the expectation operator introduced here."
        },
        {
          "text": "Module 23 (Causal Inference) is this lesson's ideas taken to their limit: potential outcomes, Bayesian workflows, and hypothesis testing at scale."
        },
        {
          "text": "Module 24's calibration and conformal prediction lessons ask, rigorously, whether a model's stated probabilities mean what they claim to mean."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State Bayes' theorem.",
          "a": "P(A|B) = P(B|A) P(A) / P(B) - posterior proportional to likelihood times prior."
        },
        {
          "q": "Where does Bayes' theorem come from?",
          "a": "It's algebra on the definition of conditional probability: P(A,B) = P(A|B)P(B) = P(B|A)P(A), rearranged."
        },
        {
          "q": "Definition of expectation for a discrete random variable.",
          "a": "E[X] = sum over x of x * P(X=x) - a probability-weighted average of outcomes."
        },
        {
          "q": "Two formulas for variance.",
          "a": "Var(X) = E[(X-E[X])^2] (definitional) = E[X^2] - E[X]^2 (computational, less numerically stable)."
        },
        {
          "q": "What does independence mean mathematically?",
          "a": "P(A,B) = P(A)P(B) - knowing one event tells you nothing about the other's probability."
        },
        {
          "q": "What does the Central Limit Theorem say?",
          "a": "The sum/mean of many independent (or weakly dependent) random variables is approximately Gaussian, regardless of the individual variables' distribution."
        },
        {
          "q": "Why is a 95%-sensitive test's positive result not 95% reliable for a rare condition?",
          "a": "The base rate matters - Bayes' theorem shows P(condition|positive) depends heavily on the prior prevalence, not just sensitivity/specificity."
        },
        {
          "q": "Law of total probability, in one line.",
          "a": "P(B) = sum over a of P(B|A=a) P(A=a) - marginalize a joint distribution by summing out the other variable."
        },
        {
          "q": "What's the 'prosecutor's fallacy'?",
          "a": "Confusing P(evidence|innocent) with P(innocent|evidence) - treating a conditional probability as if it applied in the reverse direction."
        },
        {
          "q": "How does sample-mean standard deviation scale with sample size n?",
          "a": "By 1/sqrt(n) - the standard error shrinks with the square root of the number of samples, not linearly."
        },
        {
          "q": "Why is Welford's algorithm preferred over E[X^2]-E[X]^2 for variance?",
          "a": "It's numerically stable (avoids subtracting two large nearly-equal numbers) and computes variance in one streaming pass."
        }
      ],
      "standard": [
        {
          "q": "Derive Bayes' theorem from the definition of conditional probability, and explain what each term (prior, likelihood, posterior, marginal) means in a concrete classification context.",
          "a": "Start from the definition P(A|B) = P(A,B)/P(B). The joint P(A,B) is symmetric: it also equals P(B|A)P(A) by the same definition applied the other way. Substituting gives P(A|B) = P(B|A)P(A)/P(B). In a classification context with class C and features X: the prior P(C) is your belief about class frequency before seeing any features; the likelihood P(X|C) is how probable the observed features are under each class (what a generative classifier models directly); the posterior P(C|X) is what you actually want - the class probability given the observed features; and the marginal P(X) = sum_c P(X|C=c)P(C=c) is a normalizing constant ensuring the posterior sums to 1 across classes.",
          "deepDive": {
            "q": "How does this connect to the difference between generative and discriminative classifiers?",
            "a": "A generative classifier (e.g., naive Bayes, Gaussian discriminant analysis) explicitly models the likelihood P(X|C) and prior P(C), then applies Bayes' theorem to get P(C|X) at inference time - it can also generate new X samples per class. A discriminative classifier (logistic regression, most neural nets) skips straight to modeling P(C|X) directly, never explicitly representing P(X|C) or P(C) - usually more accurate for classification alone since it doesn't need to correctly model the (often harder) distribution of X itself, but it can't generate new data or easily handle missing features the way a generative model can."
          }
        },
        {
          "q": "A company reports their fraud-detection model has 99% recall and 99% specificity on a dataset where fraud is 0.1% of transactions. A user asks 'if the model flags my transaction, what's the chance it's actually fraud?' Walk through the calculation.",
          "a": "Let F = fraud (prior 0.001), Flag = model flags. P(Flag|F) = 0.99 (recall/sensitivity), P(Flag|not F) = 1 - 0.99 = 0.01 (false positive rate = 1 - specificity). By the law of total probability, P(Flag) = 0.99*0.001 + 0.01*0.999 = 0.00099 + 0.00999 = 0.01098. Bayes: P(F|Flag) = (0.99*0.001)/0.01098 ~ 0.090 - only about 9% of flagged transactions are actually fraud, even with a model that sounds highly accurate on both axes, because genuine fraud is so rare that the much larger pool of legitimate transactions produces more false positives in absolute count than true positives from the small fraud pool.",
          "deepDive": {
            "q": "What does this imply about how such a system should be deployed in practice?",
            "a": "The raw flag shouldn't trigger an automatic block - it should route to a review queue or a second-stage check, exactly the precision@K framing in 25-05's fraud lesson; and improving the *precision* at a fixed recall (often via a better threshold choice or a second, more expensive model on the flagged subset) matters more for user experience than pushing recall or specificity higher in isolation, since the base-rate imbalance dominates the naive-looking metrics."
          }
        },
        {
          "q": "Explain why mini-batch gradient estimates in SGD are often treated as approximately Gaussian-distributed noise around the true gradient, using the Central Limit Theorem.",
          "a": "A mini-batch gradient is itself a sample mean: it averages the per-example gradient contributions of B examples drawn (roughly) independently from the training distribution. Each individual example's gradient can have a complicated, non-Gaussian distribution, but by the CLT, the *average* of B such roughly-independent quantities converges toward a Gaussian distribution centered at the true (full-dataset) gradient, with variance shrinking as 1/B. This is why SGD noise is commonly modeled as additive Gaussian noise on the gradient in theoretical analyses (e.g., relating SGD to Langevin dynamics) - it's not an arbitrary modeling choice, it follows from treating the mini-batch as a sample mean.",
          "deepDive": {
            "q": "What breaks this approximation, and when does it matter in practice?",
            "a": "The CLT's convergence rate depends on how skewed/heavy-tailed the per-example gradient distribution is and how large B is; with very small batch sizes, heavily imbalanced data, or gradient distributions with heavy outlier tails (common early in training or near loss spikes), the Gaussian approximation is poor - this is part of why gradient clipping exists (bound the influence of rare extreme per-example gradients) and why very small-batch training can show qualitatively different, less Gaussian-looking noise behavior than the large-batch regime the theory is often derived for."
          }
        },
        {
          "q": "You compute variance using the formula Var(X) = E[X^2] - E[X]^2 on a dataset of numbers around 1,000,000 with a true standard deviation of about 5. What can go wrong numerically, and what's the fix?",
          "a": "E[X^2] and E[X]^2 are both approximately 10^12, while their true difference (the variance) is only about 25 - in float32/float64 arithmetic, subtracting two numbers that agree in their leading many significant digits loses most of the precision in the result (catastrophic cancellation), potentially producing a negative 'variance' or one accurate to only 1-2 significant digits. The fix is either to center the data first (subtract the mean, then compute mean of squared deviations directly - the definitional formula, which doesn't cancel large numbers) or to use a numerically stable streaming algorithm like Welford's, which updates a running mean and sum-of-squared-deviations incrementally without ever computing E[X^2] as a separate large quantity.",
          "deepDive": {
            "q": "Why would anyone use the E[X^2]-E[X]^2 formula at all, given this risk?",
            "a": "It's the natural one-pass formula when you're accumulating sum(x) and sum(x^2) simultaneously as data streams in and don't want to store all values for a second centering pass - useful for extremely large or truly streaming datasets where memory, not precision, is the binding constraint; Welford's algorithm gets both properties (one-pass, numerically stable) by updating mean and M2 (sum of squared deviations from the running mean) together, which is why most production statistics libraries use it instead of the naive two-moment formula."
          }
        },
        {
          "q": "How would you test whether two features in your dataset are actually independent, rather than assuming it?",
          "a": "Independence requires P(A,B) = P(A)P(B) for every combination of values, which is stronger than just zero linear correlation (uncorrelated does not imply independent - e.g., Y = X^2 for X symmetric around 0 has zero Pearson correlation with X but is completely dependent). For categorical features, a chi-squared test of independence on the contingency table checks whether observed joint counts differ significantly from the counts expected under independence. For continuous features, mutual information (an expectation of a log-ratio of joint to marginal densities - closely related to the KL divergence introduced in the next lesson) captures nonlinear dependence that correlation misses, or a permutation test comparing the observed joint statistic to its distribution under independently shuffled columns.",
          "deepDive": {
            "q": "Why does 'zero correlation does not imply independence' matter practically in feature engineering?",
            "a": "A linear model or a correlation-based feature-selection step can discard a feature with strong nonlinear predictive power simply because its linear correlation with the target happens to be near zero (the Y=X^2 example) - which is exactly the trap 24-04's saturated-gradient saliency example and 19-05's correlated-feature attribution pitfall both illustrate from different angles: a feature can matter a great deal without any linear signal being visible to a method that only checks for linear relationships."
          }
        },
        {
          "q": "Explain the difference between a frequentist confidence interval and a Bayesian credible interval for the same quantity, using the language of this lesson.",
          "a": "A frequentist 95% confidence interval is a statement about the PROCEDURE, not about any one realized interval: if you repeated the sampling-and-interval-construction process many times, 95% of the resulting intervals would contain the true (fixed, non-random) parameter - the parameter isn't treated as a random variable, so it's technically incorrect to say 'there's a 95% probability the true value is in this specific interval' once the interval is already computed. A Bayesian 95% credible interval instead treats the parameter itself as a random variable with a posterior distribution P(parameter | data), constructed via Bayes' theorem from a prior and the observed data's likelihood - it directly supports the statement 'given this prior and this data, there's a 95% probability the true parameter lies in this interval', because the probability statement is about the parameter's posterior distribution, not about a hypothetical repetition of the sampling procedure.",
          "deepDive": {
            "q": "Under what conditions do the two intervals tend to numerically coincide, and why does that make the distinction easy to blur in practice?",
            "a": "With a weak/uninformative (flat) prior and enough data that the likelihood dominates the posterior, a Bayesian credible interval often numerically converges toward the same bounds as the corresponding frequentist confidence interval - the posterior becomes shaped almost entirely by the data, mimicking the frequentist sampling distribution. This convergence is exactly why practitioners often (loosely, and technically incorrectly in the frequentist case) interpret a 95% CI as '95% probability the true value is in here' - the Bayesian interpretation IS valid under a matching-prior setup, so the intuitive reading happens to be numerically justified in that regime even though it isn't the frequentist interval's actual defined meaning."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Bayes' theorem",
        "back": "P(A|B) = P(B|A)P(A) / P(B) - posterior proportional to likelihood times prior, normalized by the marginal."
      },
      {
        "type": "definition",
        "front": "Expectation",
        "back": "E[X] = sum_x x * P(X=x) - a probability-weighted average of outcomes."
      },
      {
        "type": "formula",
        "front": "Variance, two forms",
        "back": "E[(X-E[X])^2] (definitional, stable) = E[X^2]-E[X]^2 (computational, can lose precision via cancellation)."
      },
      {
        "type": "definition",
        "front": "Independence",
        "back": "P(A,B) = P(A)P(B) for all values - stronger than zero correlation (Y=X^2 is dependent but can be uncorrelated with X)."
      },
      {
        "type": "intuition",
        "front": "Central Limit Theorem",
        "back": "Averages of many roughly-independent variables look approximately Gaussian, regardless of the individual variables' distribution; std shrinks as 1/sqrt(n)."
      },
      {
        "type": "pitfall",
        "front": "Base-rate neglect",
        "back": "An 'accurate' test on a rare condition can still be mostly false positives - P(condition|positive) depends heavily on the prior, not just sensitivity/specificity."
      },
      {
        "type": "pitfall",
        "front": "Prosecutor's fallacy",
        "back": "Confusing P(evidence|hypothesis) with P(hypothesis|evidence) - they're related by Bayes' theorem, not interchangeable."
      },
      {
        "type": "pitfall",
        "front": "Naive variance formula precision loss",
        "back": "E[X^2]-E[X]^2 subtracts two large nearly-equal numbers on large-magnitude data - use Welford's algorithm or center first."
      },
      {
        "type": "definition",
        "front": "Law of total probability",
        "back": "P(B) = sum_a P(B|A=a) P(A=a) - marginalize a joint distribution by summing out the other variable."
      }
    ],
    "refs": [
      {
        "title": "Wasserman, All of Statistics (Ch. 1-3, probability foundations)",
        "url": "https://link.springer.com/book/10.1007/978-0-387-21736-9"
      },
      {
        "title": "Welford's online algorithm for variance",
        "url": "https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm"
      },
      {
        "title": "3Blue1Brown: Bayes theorem visualized",
        "url": "https://www.3blue1brown.com/lessons/bayes-theorem"
      },
      {
        "title": "NumPy: Generator (random sampling API)",
        "url": "https://numpy.org/doc/stable/reference/random/generator.html"
      }
    ],
    "demos": []
  }
};
