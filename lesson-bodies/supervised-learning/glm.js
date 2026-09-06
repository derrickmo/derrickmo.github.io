// GENERATED from content/lessons/supervised-learning/glm.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/glm/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "glm": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Linear regression and logistic regression look like two different algorithms, but this lesson reveals they are the same recipe with one ingredient swapped. Both assume the target comes from a distribution in the exponential family, both put a linear predictor w^T x at the core, and both connect the two through a link function. Change the distribution (Gaussian to Bernoulli to Poisson) and you get linear regression, logistic regression, or Poisson regression - the generalized linear model (GLM) framework is the single template underneath.",
        "The key move is separating three choices that are usually tangled together: (1) what distribution generates the target - Gaussian for continuous values, Bernoulli for binary, Poisson for counts; (2) the linear predictor eta = w^T x, always the same; and (3) the link function that maps the distribution's mean to that linear predictor. For linear regression the link is the identity (mean = w^T x); for logistic regression it's the logit (log-odds = w^T x); for Poisson it's the log (log-rate = w^T x). Once you see these as three settings of the same dial, you stop memorizing separate algorithms.",
        "The payoff is practical: when your target isn't continuous and Gaussian, you shouldn't force linear regression onto it. Counts (number of purchases, events per hour) are non-negative integers with variance that grows with the mean - Poisson or negative-binomial regression respects that, where plain linear regression would predict negative counts and assume constant variance. Recognizing which exponential-family distribution matches your target is a modeling skill that generalizes far beyond these three examples, and it's the same maximum-likelihood machinery every time."
      ],
      "math": [
        {
          "h": "The exponential family and its shared structure",
          "paras": [
            "A distribution is in the exponential family if its density can be written in a canonical form with a natural parameter eta and a sufficient statistic T(y). Gaussian, Bernoulli, Poisson, gamma, and more all fit this mold. The shared structure is what makes GLMs uniform: the mean is a fixed function of eta, and the negative-log-likelihood gradient always takes the same 'prediction minus observation' shape."
          ],
          "tex": "p(y \\mid \\eta) = h(y)\\, \\exp\\!\\big(\\eta\\, T(y) - A(\\eta)\\big) \\qquad \\mathbb{E}[T(y)] = A'(\\eta)",
          "texNote": "A(eta) is the log-partition function; its derivative gives the mean. This single identity is why every GLM's MLE gradient has the same form."
        },
        {
          "h": "Link function and the universal GLM gradient",
          "paras": [
            "A GLM sets the natural parameter (or the mean, via a link g) to the linear predictor eta = w^T x. With the canonical link, the maximum-likelihood gradient with respect to the weights is always the same: the model's predicted mean minus the observed target, times the feature vector - identical to what you derived separately for linear and logistic regression."
          ],
          "tex": "g(\\mu) = w^\\top x \\qquad \\nabla_w\\, (-\\log \\text{lik}) = \\sum_i \\big(\\mu_i - y_i\\big)\\, x_i, \\quad \\mu_i = g^{-1}(w^\\top x_i)",
          "texNote": "mu_i is the predicted mean under the chosen distribution; (mu - y)*x is the same gradient as linear (mu=w.x) and logistic (mu=sigmoid) regression - one algorithm."
        }
      ],
      "code": [
        {
          "h": "Three GLMs, one gradient-descent loop",
          "paras": [
            "The same fitting code with only the inverse-link (how the linear score becomes a mean) swapped shows that linear, logistic, and Poisson regression are the same algorithm."
          ],
          "code": "import numpy as np\n\ndef fit_glm(X, y, inverse_link, lr=0.01, steps=2000):\n    w = np.zeros(X.shape[1])\n    for _ in range(steps):\n        mu = inverse_link(X @ w)          # predicted mean under the chosen distribution\n        grad = X.T @ (mu - y) / len(y)     # SAME (mu - y)*x gradient every time\n        w -= lr * grad\n    return w\n\n# identity link  -> linear regression (Gaussian target)\n# sigmoid link   -> logistic regression (Bernoulli target)\n# exp link       -> Poisson regression (count target)\nidentity = lambda z: z\nsigmoid  = lambda z: 1 / (1 + np.exp(-np.clip(z, -30, 30)))\npoisson  = lambda z: np.exp(np.clip(z, -30, 30))\n\n# only the inverse_link argument changes - the learner is identical\n# w_lin = fit_glm(X, y_continuous, identity)\n# w_log = fit_glm(X, y_binary,     sigmoid)\n# w_poi = fit_glm(X, y_counts,     poisson)",
          "caption": "One learner, three models: swap the inverse-link and you move between Gaussian, Bernoulli, and Poisson regression."
        },
        {
          "h": "Why Poisson beats linear regression on count data",
          "paras": [
            "Count targets are non-negative and heteroscedastic (variance grows with the mean). Poisson regression's exp link keeps predictions positive and its likelihood matches that variance structure; linear regression can predict negatives and assumes constant variance."
          ],
          "code": "import numpy as np\nimport statsmodels.api as sm\n\nrng = np.random.default_rng(0)\nX = rng.normal(size=(500, 1))\nX_ = sm.add_constant(X)\nrate = np.exp(0.5 + 1.2 * X[:, 0])                 # true log-linear rate\ny = rng.poisson(rate)                               # count target\n\npoi = sm.GLM(y, X_, family=sm.families.Poisson()).fit()\nols = sm.OLS(y, X_).fit()\n\nprint('Poisson coef (true 0.5, 1.2):', poi.params.round(2))   # recovers the log-rate\nprint('OLS predicts negatives?     ', (ols.predict(X_) < 0).any())  # True - nonsensical for counts",
          "caption": "Poisson regression recovers the true log-rate coefficients and never predicts a negative count; OLS does both wrong."
        }
      ],
      "useCases": [
        "Count modeling - purchases per user, events per hour, insurance claims - where Poisson or negative-binomial regression respects the non-negativity and mean-variance relationship linear regression ignores.",
        "A unifying mental model for the whole classical toolbox: recognizing linear, logistic, and Poisson regression as one family means one derivation, one optimization method, and one set of diagnostics.",
        "Insurance and actuarial pricing (gamma/Tweedie GLMs for claim severity and frequency), where the interpretable, distribution-appropriate structure is often legally and practically required.",
        "The exponential-family view underlies why softmax cross-entropy is the natural classification loss and why the (prediction - target) gradient recurs everywhere in deep learning."
      ],
      "pitfalls": [
        "Forcing linear regression onto count or binary targets: it can predict impossible values (negative counts, probabilities outside [0,1]) and assumes constant variance that count data violates - pick the distribution that matches the target's support and variance structure.",
        "Overdispersion: real count data often has variance larger than its mean, violating Poisson's variance = mean assumption - use negative-binomial regression (or quasi-Poisson) when a dispersion test flags it, or standard errors will be too small.",
        "Interpreting GLM coefficients on the wrong scale: a Poisson coefficient is a change in log-rate (exponentiate for a multiplicative rate ratio), a logistic coefficient is a change in log-odds - reading them as linear effects on the raw target is a common mistake.",
        "Confusing the canonical link with a mandatory one: the canonical link gives the clean (mu - y)x gradient and nice theory, but you can use non-canonical links (e.g., probit instead of logit) when they fit better - the framework doesn't force it.",
        "Assuming a GLM captures nonlinearity in the features: the predictor is still linear in w^T x, so you need feature engineering, splines (GAMs), or a different model for genuinely nonlinear feature effects - the link only transforms the mean, not the feature dependence."
      ],
      "connections": [
        {
          "ref": "supervised-learning/linear-regression",
          "text": "Linear regression is the Gaussian GLM with an identity link - the base case the whole framework generalizes."
        },
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "Logistic regression is the Bernoulli GLM with a logit link; its (p - y)x gradient is the universal exponential-family gradient."
        },
        {
          "ref": "foundations/probability",
          "text": "The exponential family and maximum-likelihood estimation are the probability foundations this lesson builds directly on."
        },
        {
          "ref": "supervised-learning/naive-bayes",
          "text": "Naive Bayes is a generative counterpart; contrasting it with the discriminative logistic/GLM view is a recurring theme in classical ML."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What three choices define a generalized linear model?",
          "a": "A distribution from the exponential family (for the target), a linear predictor eta = w^T x, and a link function relating the distribution's mean to eta."
        },
        {
          "q": "What link function does linear regression use?",
          "a": "The identity link: mean = w^T x."
        },
        {
          "q": "What link function does logistic regression use?",
          "a": "The logit (log-odds) link: log(p/(1-p)) = w^T x, so the mean is sigmoid(w^T x)."
        },
        {
          "q": "What distribution and link does Poisson regression use?",
          "a": "Poisson distribution with a log link: log(rate) = w^T x, so predicted mean = exp(w^T x), always non-negative."
        },
        {
          "q": "What is the exponential family?",
          "a": "A class of distributions writable as h(y)exp(eta*T(y) - A(eta)); includes Gaussian, Bernoulli, Poisson, gamma, and more."
        },
        {
          "q": "What form does every canonical-link GLM's MLE gradient take?",
          "a": "sum_i (mu_i - y_i) x_i - predicted mean minus observed target, times the input; the same as linear and logistic regression."
        },
        {
          "q": "Why not use linear regression for count data?",
          "a": "It can predict negative counts and assumes constant variance, but counts are non-negative with variance growing with the mean - use Poisson/negative-binomial."
        },
        {
          "q": "What is overdispersion?",
          "a": "When count data's variance exceeds its mean, violating Poisson's variance=mean assumption - use negative-binomial or quasi-Poisson instead."
        },
        {
          "q": "How do you interpret a Poisson regression coefficient?",
          "a": "As a change in log-rate; exponentiate it to get a multiplicative rate ratio (e.g., coef 0.7 -> rate multiplies by e^0.7 per unit)."
        },
        {
          "q": "Does a GLM capture nonlinear feature effects?",
          "a": "No - it's linear in w^T x; the link transforms the mean, not the feature dependence. You still need feature engineering, splines, or GAMs for nonlinearity."
        }
      ],
      "standard": [
        {
          "q": "Explain how linear regression, logistic regression, and Poisson regression are three instances of one framework. What exactly changes and what stays the same?",
          "a": "All three are generalized linear models, sharing: (1) a linear predictor eta = w^T x at the core, (2) an assumption that the target is drawn from an exponential-family distribution, and (3) fitting by maximum likelihood, whose gradient (with the canonical link) is always sum_i (mu_i - y_i) x_i. What changes across the three is only the target distribution and its accompanying link function: linear regression assumes a Gaussian target with an identity link (mu = w^T x), logistic regression assumes Bernoulli with a logit link (mu = sigmoid(w^T x)), and Poisson regression assumes a Poisson target with a log link (mu = exp(w^T x)). So they're not three separate algorithms to memorize - they're one algorithm (maximize exponential-family likelihood of a link-transformed linear predictor) with the distribution swapped to match the target's type: continuous, binary, or count. The universal gradient form is the giveaway that they're the same machine.",
          "deepDive": {
            "q": "Why does the maximum-likelihood gradient come out to (mu - y)x for every exponential-family distribution with its canonical link?",
            "a": "In canonical form p(y|eta) = h(y)exp(eta*T(y) - A(eta)), the log-likelihood is eta*T(y) - A(eta) + const, and the key identity is that the mean of the sufficient statistic equals the derivative of the log-partition function: E[T(y)] = A'(eta) = mu. With the canonical link setting eta = w^T x, the gradient of the negative log-likelihood w.r.t. w is (dA/deta - T(y)) * deta/dw = (mu - y) * x (taking T(y) = y for these cases). The clean cancellation - where A'(eta) is exactly the mean mu - is a structural property of the exponential family, which is precisely why the gradient has the identical 'prediction minus target times input' form regardless of whether you're doing Gaussian, Bernoulli, or Poisson regression. It's also why this gradient shape recurs throughout deep learning: softmax cross-entropy is the multinomial exponential-family case."
          }
        },
        {
          "q": "You're modeling the number of support tickets a customer files per month. Walk through why you'd choose Poisson (or negative-binomial) regression over linear regression, and how you'd decide between the two.",
          "a": "Ticket counts are non-negative integers, and their variance typically grows with their mean (a customer averaging 10 tickets varies more in absolute terms than one averaging 1). Linear regression is wrong on both counts: with an identity link it can predict negative ticket counts (nonsensical), and its Gaussian assumption imposes constant variance (homoscedasticity), which count data violates. Poisson regression fixes both: the log link (mu = exp(w^T x)) guarantees positive predictions, and the Poisson likelihood builds in the variance = mean relationship. To decide between Poisson and negative-binomial, I'd check for overdispersion - fit the Poisson model and test whether the residual variance exceeds what Poisson allows (variance should equal the mean; a dispersion statistic well above 1, or a formal overdispersion test, flags it). Real count data is very often overdispersed (extra customer-to-customer heterogeneity, clustering of tickets), in which case negative-binomial regression - which adds a dispersion parameter letting variance exceed the mean - gives correct (wider) standard errors and better fit. If there are also far more zero-count customers than either model expects, a zero-inflated or hurdle model is the next step.",
          "deepDive": {
            "q": "What specifically goes wrong if you use Poisson regression on overdispersed data and ignore it?",
            "a": "The point estimates (coefficients) often remain roughly unbiased, but the standard errors are computed under the too-tight variance = mean assumption, so they come out too small - which makes confidence intervals too narrow and p-values too optimistic, leading you to declare effects statistically significant that aren't. In other words, overdispersion doesn't necessarily bias what the model predicts on average, but it makes you overconfident about those predictions and coefficients. The fixes are negative-binomial regression (models the extra variance explicitly) or quasi-Poisson (inflates the standard errors by an estimated dispersion factor without changing the point estimates) - either restores honest uncertainty, the same 'aggregate looks fine but the uncertainty is wrong' theme that recurs in calibration and A/B testing (24-01, 23-07)."
          }
        },
        {
          "q": "A stakeholder asks you to explain what a Poisson regression coefficient of 0.7 on a feature means. How do you translate it into something interpretable?",
          "a": "The coefficient 0.7 is on the log-rate scale, because Poisson regression models log(rate) = w^T x - so a one-unit increase in that feature adds 0.7 to the log of the expected count, holding other features fixed. That's not directly interpretable, so exponentiate it: e^0.7 ~ 2.01. The interpretable statement is 'each one-unit increase in this feature multiplies the expected count by about 2.0 (a ~101% increase), all else equal' - it's a multiplicative (rate-ratio) effect, not an additive one. This multiplicative interpretation is a direct consequence of the log link: because the linear predictor sits inside an exponential, additive changes on the log scale become multiplicative changes on the count scale. (Contrast with logistic regression, where exponentiating a coefficient gives an odds ratio, not a rate ratio.) I'd present it as the rate ratio, since 'doubles the expected number of tickets' is far more actionable to a stakeholder than 'adds 0.7 to the log-rate'.",
          "deepDive": {
            "q": "Why are GLM coefficients multiplicative on the response scale for log/logit links but additive for the identity link?",
            "a": "It's entirely determined by the link function. With the identity link (linear regression), mu = w^T x, so the effect of a feature is additive on the raw response - a one-unit change adds w to the predicted value directly. With a log link (Poisson), mu = exp(w^T x) = product of exp(w_j x_j), so a one-unit change in x_j multiplies the mean by exp(w_j) - additive on the log scale becomes multiplicative on the response scale. With a logit link (logistic), the exponentiated coefficient is multiplicative on the odds. The general rule: the coefficient is always additive on the scale of the linear predictor (the link scale); whether that translates to additive, multiplicative, or something else on the response scale depends on the inverse link you pass it back through - which is exactly why stating the scale is essential when interpreting any GLM."
          }
        },
        {
          "q": "Explain the difference between a generative model (like Naive Bayes) and a discriminative GLM (like logistic regression), given that both can end up as linear classifiers.",
          "a": "A discriminative GLM like logistic regression models the conditional distribution p(y | x) directly - it learns the decision boundary (the log-odds as a function of x) without ever modeling how the features themselves are distributed. A generative model like Gaussian Naive Bayes instead models the joint distribution by learning p(x | y) (how features are distributed within each class) and p(y) (the class priors), then applies Bayes' theorem to get p(y | x) at prediction time. Strikingly, under certain assumptions (e.g., Gaussian class-conditionals with shared covariance) the generative model's resulting decision boundary is also linear in x - so both can be linear classifiers - but they arrive there differently and have different strengths. The discriminative model, by optimizing exactly the quantity you care about (p(y|x)), tends to be more accurate given enough data and is robust to wrong assumptions about p(x); the generative model can be trained with less data (it makes stronger assumptions that act as a prior), handles missing features more naturally, and lets you generate synthetic samples - but it pays for wrong p(x|y) assumptions with accuracy.",
          "deepDive": {
            "q": "There's a classic result about the sample-efficiency crossover between Naive Bayes and logistic regression - what does it say?",
            "a": "Ng and Jordan (2001) showed that although logistic regression (discriminative) has lower asymptotic error - it wins given enough data because it doesn't rely on Naive Bayes' often-false conditional-independence assumption - Naive Bayes (generative) approaches its (higher) asymptotic error much faster, needing only about O(log d) examples versus logistic regression's O(d) in the feature dimension d. So there's a crossover: with little training data the generative model's stronger assumptions act as a helpful prior and it generalizes better, but as data grows the discriminative model overtakes it and stays ahead. The practical lesson is that 'discriminative is always better' is false in the small-data regime - the right choice depends on how much data you have relative to the feature dimension, a specific instance of the bias-variance tradeoff where the generative model's assumptions are bias that pays off when variance (from little data) would otherwise dominate."
          }
        },
        {
          "q": "Why is the exponential-family / GLM view worth learning even if you mostly use neural networks in practice?",
          "a": "Because the losses and output layers of neural networks are GLMs sitting on top of learned features. A network's regression head with squared-error loss is a Gaussian GLM; a binary classification head with sigmoid and binary cross-entropy is a Bernoulli GLM; a multiclass softmax head with cross-entropy is a multinomial (categorical) GLM; and there are count-prediction heads that are Poisson GLMs. The universal (prediction - target) * input gradient you get from the exponential family is exactly the gradient that flows back from the final layer into the rest of the network - so the clean gradient behavior, the reason cross-entropy is the natural classification loss, and the reason these losses are convex in the final-layer weights all come from the GLM structure. Understanding it tells you why to pick a given output activation + loss pairing for a new target type (e.g., use a log-link Poisson head for count targets, not a linear head with MSE), how to interpret the final layer, and why the same maximum-likelihood reasoning that chooses squared vs cross-entropy vs Poisson loss is the same reasoning throughout. It turns 'which loss function do I use?' from a lookup into a derivation.",
          "deepDive": {
            "q": "How would you design the output layer and loss for a neural network predicting a non-negative count target, using the GLM view?",
            "a": "The GLM view says: match the output distribution to the target's type (Poisson for counts) and use its canonical link as the final-layer transformation with the corresponding negative-log-likelihood as the loss. Concretely, make the final layer output a single real number eta = w^T (features) (unconstrained), pass it through exp() to get a guaranteed-positive predicted rate mu = exp(eta) (the inverse of the Poisson log link), and train with the Poisson negative log-likelihood loss (mu - y*log(mu), up to constants) rather than MSE. This guarantees non-negative predictions, builds in the variance = mean structure, and - because it's the canonical link - gives the clean (mu - y) gradient signal back into the network. If the counts are overdispersed, you'd extend to a negative-binomial head with a learned dispersion parameter, exactly mirroring the classical Poisson-vs-negative-binomial choice but with the linear predictor replaced by the network's learned features."
          }
        },
        {
          "q": "What does the canonical link give you, and when might you deliberately choose a non-canonical link instead?",
          "a": "The canonical link is the specific link function that sets the linear predictor equal to the distribution's natural parameter directly (identity for Gaussian, logit for Bernoulli, log for Poisson). Choosing it buys you the cleanest theory and computation: the MLE gradient reduces to the simple (mu - y) x form, the log-likelihood is concave (guaranteed unique optimum), and certain sufficiency and orthogonality properties hold that make estimation and inference well-behaved. But the canonical link isn't mandatory - it's a choice, and sometimes a different link fits the science or the data better. For a Bernoulli target you might use a probit link (inverse-normal CDF) instead of logit when you have an underlying-latent-Gaussian interpretation (common in econometrics and psychometrics), or a complementary-log-log link when the process is an extreme-value / hazard-type mechanism (e.g., discrete-time survival, where the probability of an event accumulates asymmetrically). You'd pick a non-canonical link when domain knowledge suggests a different mean-to-predictor relationship, or when it simply gives better held-out fit - trading a little theoretical convenience for a better-matched model.",
          "deepDive": {
            "q": "Practically, how different are logit and probit links, and does the choice usually matter?",
            "a": "For the same data, logit and probit give very similar fitted probabilities in the middle of the range and differ mainly in the tails (probit approaches 0 and 1 slightly faster because the normal CDF has thinner tails than the logistic function), and their coefficients differ by roughly a constant scaling factor (about 1.6-1.8) because the two link functions have different variances. In most applied classification settings the choice barely affects predictions or conclusions, so logit is preferred by default for its interpretability (coefficients are log-odds, exponentiate to odds ratios) and its canonical-link computational niceness. Probit is chosen mainly when there's a substantive latent-Gaussian story (a normally-distributed unobserved propensity crossing a threshold) that makes its parameters more meaningful, or in specific fields where it's convention - it's a case where the 'right' link is more about interpretation and domain fit than predictive performance."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Generalized linear model",
        "back": "Three choices: an exponential-family distribution for the target, a linear predictor eta=w^T x, and a link g(mean)=eta. Fit by MLE."
      },
      {
        "type": "formula",
        "front": "Universal GLM gradient",
        "back": "grad(-loglik) = sum_i (mu_i - y_i) x_i - predicted mean minus target times input, for every canonical-link GLM."
      },
      {
        "type": "definition",
        "front": "Link functions of the big three",
        "back": "Linear reg: identity (mu=w.x). Logistic: logit (log-odds=w.x). Poisson: log (log-rate=w.x, mu=exp(w.x))."
      },
      {
        "type": "definition",
        "front": "Exponential family form",
        "back": "p(y|eta)=h(y)exp(eta*T(y)-A(eta)); mean = A'(eta). Includes Gaussian, Bernoulli, Poisson, gamma."
      },
      {
        "type": "pitfall",
        "front": "Linear regression on counts",
        "back": "Predicts negative counts and assumes constant variance; counts are non-negative with variance growing with the mean - use Poisson/neg-binomial."
      },
      {
        "type": "pitfall",
        "front": "Overdispersion",
        "back": "Variance > mean violates Poisson's variance=mean; standard errors come out too small - use negative-binomial or quasi-Poisson."
      },
      {
        "type": "intuition",
        "front": "Interpreting a Poisson coefficient",
        "back": "It's on the log-rate scale; exponentiate for a multiplicative rate ratio (coef 0.7 -> e^0.7 ~ 2x the expected count per unit)."
      },
      {
        "type": "intuition",
        "front": "Why GLMs matter for deep learning",
        "back": "NN output heads ARE GLMs: MSE=Gaussian, sigmoid+BCE=Bernoulli, softmax+CE=categorical - the (pred-target) gradient is the exponential-family gradient."
      }
    ],
    "refs": [
      {
        "title": "Nelder & Wedderburn, Generalized Linear Models (1972)",
        "url": "https://www.jstor.org/stable/2344614"
      },
      {
        "title": "statsmodels: Generalized Linear Models",
        "url": "https://www.statsmodels.org/stable/glm.html"
      },
      {
        "title": "Ng & Jordan, On Discriminative vs Generative Classifiers (NeurIPS 2001)",
        "url": "https://papers.nips.cc/paper/2001/hash/7b7a53e239400a13bd6be6c91c4f6c4e-Abstract.html"
      },
      {
        "title": "McCullagh & Nelder, Generalized Linear Models (book)",
        "url": "https://www.routledge.com/Generalized-Linear-Models/McCullagh-Nelder/p/book/9780412317606"
      }
    ],
    "demos": [
      "regression"
    ],
    "demoTitles": {
      "regression": "Linear & Logistic Regression"
    }
  }
};
