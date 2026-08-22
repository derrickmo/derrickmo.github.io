// GENERATED from content/lessons/supervised-learning/naive-bayes.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/naive-bayes/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "naive-bayes": {
    "level": "core",
    "body": {
      "intuition": [
        "Naive Bayes is the simplest generative classifier: instead of learning a boundary between classes, it learns what each class 'looks like' and asks, for a new example, which class most likely generated it. It applies Bayes' theorem - posterior proportional to likelihood times prior - and adds one bold simplifying assumption that gives it its name: that all features are conditionally independent given the class. That assumption is almost always false, yet the classifier works remarkably well, which is the puzzle worth understanding.",
        "The 'naive' independence assumption is what makes the math trivial. Without it, modeling the joint distribution of all features given a class is intractable (you'd need a probability for every combination of feature values). With it, the joint likelihood factorizes into a simple product of per-feature likelihoods, each estimated by just counting. So a model that would require astronomically many parameters collapses to one parameter per feature per class - estimated in a single pass over the data, no iteration, no gradient descent.",
        "Text classification is Naive Bayes' showcase because the setting fits its strengths: thousands of features (words), each a weak individual signal, and a task where counting word frequencies per class is fast and effective. Spam filtering was historically dominated by Naive Bayes for exactly this reason. The independence assumption ('the word cheap appears independently of the word free given that an email is spam') is clearly wrong, but because the classifier only needs to get the argmax right - not the exact probabilities - it's robust to the assumption's violation."
      ],
      "math": [
        {
          "h": "Bayes' theorem and the naive factorization",
          "paras": [
            "The posterior probability of a class given the features is, by Bayes' theorem, proportional to the class prior times the likelihood of the features under that class. The naive assumption factorizes that likelihood into a product over features, turning an intractable joint distribution into a product of easily-counted per-feature terms."
          ],
          "tex": "P(y \\mid x_1,\\dots,x_d) \\propto P(y)\\, P(x_1,\\dots,x_d \\mid y) \\;\\overset{\\text{naive}}{=}\\; P(y)\\prod_{j=1}^{d} P(x_j \\mid y)",
          "texNote": "The naive step replaces the joint likelihood with a product of per-feature likelihoods - the intractable becomes a product of counts."
        },
        {
          "h": "Log-space prediction and Laplace smoothing",
          "paras": [
            "Predictions are made in log-space (sums instead of products) to avoid numerical underflow from multiplying thousands of tiny probabilities. Laplace (add-one) smoothing prevents a single unseen word from zeroing out an entire class's probability - a word never seen in the spam training set would otherwise make P(spam) exactly zero."
          ],
          "tex": "\\hat{y} = \\arg\\max_y \\Big[\\log P(y) + \\sum_j \\log P(x_j \\mid y)\\Big] \\qquad P(w \\mid y) = \\frac{\\text{count}(w, y) + \\alpha}{\\text{count}(y) + \\alpha V}",
          "texNote": "Sum logs to avoid underflow; alpha (usually 1) is added to every count so no unseen word forces a zero probability. V is the vocabulary size."
        }
      ],
      "code": [
        {
          "h": "Multinomial Naive Bayes on 20 Newsgroups",
          "paras": [
            "The canonical text pipeline: count words, fit Naive Bayes by counting, classify. It trains in one pass and is a strong, fast text baseline."
          ],
          "code": "from sklearn.datasets import fetch_20newsgroups\nfrom sklearn.feature_extraction.text import CountVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\n\ncats = ['sci.space', 'rec.sport.hockey', 'talk.politics.guns']\ntrain = fetch_20newsgroups(subset='train', categories=cats, remove=('headers','footers','quotes'))\ntest  = fetch_20newsgroups(subset='test',  categories=cats, remove=('headers','footers','quotes'))\n\nvec = CountVectorizer()\nXtr = vec.fit_transform(train.data)      # bag-of-words counts\nXte = vec.transform(test.data)\n\nnb = MultinomialNB(alpha=1.0).fit(Xtr, train.target)   # alpha = Laplace smoothing\nprint('test accuracy:', nb.score(Xte, test.target))    # strong for a one-pass counting model\n# fit() here is literally counting word frequencies per class - no iteration",
          "caption": "MultinomialNB.fit() just tallies per-class word counts; alpha=1.0 is add-one smoothing so unseen words don't zero out a class."
        },
        {
          "h": "Why smoothing is not optional",
          "paras": [
            "Without smoothing, one word that never appeared in a class's training documents makes that class's probability exactly zero, no matter how strong the other evidence - a catastrophic single point of failure."
          ],
          "code": "import numpy as np\n\n# toy: P(word | spam) counts; 'quantum' never seen in spam training\nspam_counts = {'free': 40, 'cheap': 30, 'quantum': 0}\nspam_total, V = 100, 10000\n\ndef p_word(w, alpha):\n    return (spam_counts.get(w, 0) + alpha) / (spam_total + alpha * V)\n\n# without smoothing, an unseen word zeros the whole product\nprint('P(quantum|spam) alpha=0:', p_word('quantum', 0))    # 0.0 -> kills P(spam) entirely\nprint('P(quantum|spam) alpha=1:', p_word('quantum', 1))    # small but nonzero - evidence preserved",
          "caption": "Add-one smoothing turns an impossible-looking zero into a small nonzero probability - so one novel word can't veto an entire class."
        }
      ],
      "useCases": [
        "Spam and text classification baselines - fast to train (one counting pass), cheap to serve, and surprisingly competitive on high-dimensional bag-of-words features.",
        "Real-time / streaming classification where the model must update incrementally: Naive Bayes updates by just incrementing counts, no retraining loop.",
        "A strong, honest baseline before reaching for anything heavier - if Naive Bayes already does well, a transformer needs to justify its cost; if it fails, that's informative about the task's structure.",
        "Settings with very little labeled data: the strong independence assumption acts as a prior, so Naive Bayes reaches its (capped) performance with far fewer examples than a discriminative model needs."
      ],
      "pitfalls": [
        "Forgetting Laplace (add-one) smoothing: a single word unseen in a class's training data makes that class's probability exactly zero, vetoing all other evidence - always smooth.",
        "Trusting the output probabilities: Naive Bayes' independence violation makes it systematically over-confident (probabilities pushed toward 0 or 1) because correlated features double-count evidence - its class ranking is usually good but its probabilities are poorly calibrated.",
        "Using the wrong variant: MultinomialNB for word counts, BernoulliNB for binary presence/absence, GaussianNB for continuous features - applying GaussianNB to word counts (or vice versa) mismodels the data.",
        "Highly correlated features amplify the independence-assumption error: duplicating an informative feature effectively counts its evidence twice, skewing the posterior - deduplicate or use a model without the independence assumption when features are strongly correlated.",
        "Reading Naive Bayes as competitive with modern methods on hard tasks: it's a strong baseline, not a ceiling - the independence assumption caps its accuracy, and discriminative models (logistic regression, transformers) overtake it given enough data."
      ],
      "connections": [
        {
          "ref": "foundations/probability",
          "text": "Naive Bayes is Bayes' theorem plus a conditional-independence assumption - a direct application of the posterior-proportional-to-likelihood-times-prior rule."
        },
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "The generative (Naive Bayes) vs discriminative (logistic regression) contrast, including the classic small-data-vs-large-data crossover, is a core comparison."
        },
        {
          "ref": "supervised-learning/glm",
          "text": "The GLM lesson formalizes the generative-vs-discriminative distinction that Naive Bayes sits on the generative side of."
        },
        {
          "ref": "foundations/information-theory",
          "text": "Log-space prediction (summing log-probabilities) connects to the log-likelihood and cross-entropy machinery from information theory."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the 'naive' assumption in Naive Bayes?",
          "a": "That all features are conditionally independent given the class - so the joint likelihood factorizes into a product of per-feature likelihoods."
        },
        {
          "q": "What does Naive Bayes compute to make a prediction?",
          "a": "The class maximizing P(y) * product_j P(x_j | y) (posterior via Bayes' theorem), usually in log-space as a sum."
        },
        {
          "q": "Is Naive Bayes generative or discriminative?",
          "a": "Generative - it models P(x | y) and P(y) then applies Bayes' theorem, rather than modeling the boundary P(y | x) directly."
        },
        {
          "q": "Why do predictions use log-space (sum of logs)?",
          "a": "Multiplying thousands of tiny probabilities underflows to zero; summing their logs is numerically stable and monotonic in the same argmax."
        },
        {
          "q": "What is Laplace smoothing and why is it needed?",
          "a": "Add a constant (usually 1) to every count so no unseen feature has zero probability - otherwise one unseen word zeros out an entire class."
        },
        {
          "q": "Why does Naive Bayes work despite the false independence assumption?",
          "a": "It only needs the correct class to have the highest posterior (right argmax), not exact probabilities - so it tolerates the assumption's violation."
        },
        {
          "q": "Which Naive Bayes variant for word counts vs binary presence vs continuous features?",
          "a": "MultinomialNB for counts, BernoulliNB for binary presence/absence, GaussianNB for continuous features."
        },
        {
          "q": "Are Naive Bayes probability outputs well-calibrated?",
          "a": "No - the independence violation makes it over-confident (probabilities pushed toward 0/1) because correlated features double-count evidence; ranking is fine, calibration is poor."
        },
        {
          "q": "How does Naive Bayes update on new data?",
          "a": "Incrementally - just increment the counts; no retraining loop, which makes it ideal for streaming."
        },
        {
          "q": "How much training data does Naive Bayes need vs logistic regression?",
          "a": "Less - its strong assumptions act as a prior, so it reaches its (capped) accuracy faster; logistic regression needs more but has a higher ceiling."
        }
      ],
      "standard": [
        {
          "q": "Walk through how Naive Bayes classifies a document, from Bayes' theorem to the final prediction, including why the naive assumption is essential.",
          "a": "Given a document represented by features x_1..x_d (e.g., word counts), we want the class y maximizing the posterior P(y | x). By Bayes' theorem, P(y | x) = P(x | y)P(y) / P(x); since P(x) is the same across classes, we maximize P(x | y)P(y) - the class-conditional likelihood times the prior. The problem is P(x | y): modeling the full joint distribution of all features given the class would require a parameter for every combination of feature values (exponentially many), which is intractable to estimate. The naive assumption - features are conditionally independent given the class - lets us factorize P(x | y) = product_j P(x_j | y), replacing that intractable joint with a product of per-feature likelihoods, each estimated by simple counting (how often word j appears in class-y documents, normalized). So the prediction is argmax_y P(y) * product_j P(x_j | y), computed in log-space as argmax_y [log P(y) + sum_j log P(x_j | y)] to avoid underflow. The naive assumption is essential because it's the single thing that turns an intractable density-estimation problem into a one-pass counting exercise - without it, Naive Bayes wouldn't be 'naive' or fast, it'd be an intractable joint model.",
          "deepDive": {
            "q": "Why does Naive Bayes often classify well even though the independence assumption is clearly violated (e.g., 'New' and 'York' are not independent)?",
            "a": "Because classification only requires the correct class to receive the highest posterior score, not that the posterior probabilities themselves be accurate. The independence violation distorts the magnitude of the estimated probabilities - typically making them over-confident by double-counting correlated evidence - but it often doesn't change which class comes out on top, since the distortion tends to affect the competing classes in similar directions. Domingos and Pazzani (1997) analyzed exactly this: Naive Bayes is optimal for classification under a much broader set of conditions than the (rarely-met) independence assumption, because the decision only depends on the sign/ordering of the log-posterior differences, not their calibrated values. So it's a case where a badly-wrong model of the probabilities still yields a good decision rule - which is also why you should trust its rankings/argmax far more than its actual probability outputs."
          }
        },
        {
          "q": "Explain the zero-frequency problem and why Laplace smoothing solves it. What does the smoothing parameter trade off?",
          "a": "The zero-frequency (or zero-probability) problem: if a particular word never appeared in the training documents of a given class, its maximum-likelihood estimate P(word | class) = count(word, class)/count(class) is exactly zero. Because Naive Bayes multiplies per-feature likelihoods, that single zero makes the entire product P(x | class) = 0, so the class is assigned zero posterior probability no matter how overwhelmingly the other words point to it - one unseen word gets absolute veto power, which is both statistically unjustified (absence in a finite sample isn't proof of impossibility) and catastrophic. Laplace (add-alpha) smoothing fixes it by adding a small constant alpha (usually 1) to every count before normalizing: P(word|class) = (count(word,class) + alpha) / (count(class) + alpha*V), where V is the vocabulary size. This guarantees every probability is strictly positive, so no single unseen word can zero out a class. The alpha parameter trades bias against variance in the probability estimates: larger alpha pulls all word probabilities toward uniform (1/V) - more smoothing, more bias, but more robust to rare-word noise - while alpha near zero trusts the raw counts (less bias, more variance, and back toward the zero-frequency risk). You tune alpha by cross-validation, though alpha=1 is a solid default.",
          "deepDive": {
            "q": "What is the Bayesian interpretation of Laplace smoothing?",
            "a": "Add-alpha smoothing is exactly maximum a posteriori (MAP) estimation of the per-class word distribution under a Dirichlet prior. The Dirichlet is the conjugate prior for the multinomial (categorical) distribution, and a symmetric Dirichlet prior with parameter alpha, combined with the observed word counts, yields a posterior whose mean/mode is (count + alpha)/(total + alpha*V) - precisely the smoothed estimate. So 'add one to every count' isn't an ad-hoc hack; it's the principled result of placing a prior that says 'before seeing data, every word has a little pseudo-count of probability' and updating it with the observed counts - alpha is the strength of that prior (pseudo-observations per word), which is why larger alpha means the prior (uniform) dominates and smaller alpha means the data dominates, the standard prior-vs-likelihood tradeoff from the Bayesian view of estimation."
          }
        },
        {
          "q": "Compare Naive Bayes (generative) and logistic regression (discriminative) as text classifiers: how they're trained, and the classic result about when each wins.",
          "a": "Both can classify the same bag-of-words text, but they take opposite approaches. Naive Bayes is generative: it models how the data is generated - P(word | class) for every word and the class priors P(class) - by counting, in a single non-iterative pass, then applies Bayes' theorem at prediction time. Logistic regression is discriminative: it directly models the decision boundary P(class | document) as a function of the word features, fitting weights by iterative maximum-likelihood (gradient descent) to optimize exactly the classification objective, without modeling how words are distributed. The classic result (Ng & Jordan, 2001) is a sample-efficiency crossover: Naive Bayes has a higher asymptotic error (because its independence assumption is wrong and can't be fixed with more data), but it approaches that error much faster - needing roughly O(log d) training examples versus logistic regression's O(d) in the feature dimension d. So with little training data, Naive Bayes' strong assumptions act as a helpful prior and it generalizes better; as data grows, logistic regression - unconstrained by the false independence assumption - overtakes it and stays ahead. Practically: reach for Naive Bayes when data is scarce, you need a fast/streaming baseline, or dimensionality is very high relative to examples; reach for logistic regression (or beyond) when you have ample data and want the higher accuracy ceiling.",
          "deepDive": {
            "q": "There's a formal relationship between Naive Bayes and logistic regression - what is it?",
            "a": "For binary classification with the right feature model, Naive Bayes and logistic regression form a 'generative-discriminative pair': the posterior log-odds that Naive Bayes computes is, algebraically, a linear function of the features - exactly the form logistic regression assumes. So both end up as linear classifiers over the same features; the difference is only in how the linear coefficients are estimated. Naive Bayes sets them indirectly via the independently-counted class-conditional statistics (which forces a particular, possibly-suboptimal coefficient combination consistent with the independence assumption), while logistic regression fits the same-form coefficients directly to maximize conditional likelihood, free to choose any values including ones that account for feature correlations. That's the deeper reason logistic regression has the higher ceiling: it optimizes the same linear decision function's parameters without being constrained by the generative independence assumption that pins Naive Bayes' coefficients."
          }
        },
        {
          "q": "Why are Naive Bayes' output probabilities usually poorly calibrated even when its classifications are accurate, and what would you do if you needed reliable probabilities?",
          "a": "The independence assumption causes systematic over-confidence. When features are correlated - as words in text always are - Naive Bayes treats each correlated feature as independent evidence and multiplies their likelihoods, effectively counting the same underlying signal multiple times. For example, if 'New' and 'York' almost always co-occur, a document containing both contributes their evidence twice over as if they were two independent confirmations, so the posterior gets pushed much harder toward the favored class than the true evidence warrants. The result is probability estimates piled up near 0 and 1 - the model says '99.99% spam' when the honest probability is more like 90% - so a reliability diagram would show the predictions systematically overconfident, even while the argmax (the actual class decision) remains correct because the over-confidence affects the ordering less than the magnitudes. If you need reliable probabilities (for a downstream expected-value/cost decision, per 25-04/25-05), calibrate the outputs post-hoc: fit a calibration map on a held-out set - Platt scaling (a logistic function on the log-odds) or isotonic regression - to pull the over-confident scores back toward their empirical frequencies, exactly the calibration toolkit 24-01 builds. Alternatively, use a model whose probabilities are better-calibrated to begin with (well-fit logistic regression).",
          "deepDive": {
            "q": "Why does calibrating Naive Bayes' probabilities not usually change its accuracy?",
            "a": "Because post-hoc calibration (Platt/isotonic) applies a monotonic transformation to the model's scores - it stretches and compresses the probability scale to match empirical frequencies, but a monotonic map preserves the ordering of scores. Since classification accuracy depends only on which class has the highest score (the argmax) and thresholding, and monotonic remapping doesn't change that ordering, the class decisions - and therefore the accuracy - are unchanged; only the reported probabilities become trustworthy. This is the same reason temperature scaling (24-01) improves a neural net's calibration without touching its accuracy: it rescales confidences monotonically. So calibration is essentially free from an accuracy standpoint - you get honest probabilities for the same predictions - which is why it's the standard fix when a good-ranking but overconfident model like Naive Bayes needs to feed a decision that depends on the actual probability value."
          }
        },
        {
          "q": "Which Naive Bayes variant would you use for (a) email spam detection with word counts, (b) presence/absence of specific keywords, and (c) continuous sensor features, and why does the choice matter?",
          "a": "(a) Word counts: Multinomial Naive Bayes. It models each class as a multinomial distribution over the vocabulary - the probability of drawing each word - so it naturally handles term frequencies (a word appearing 5 times contributes more than appearing once), which is the right model for bag-of-words count features. (b) Binary presence/absence: Bernoulli Naive Bayes. It models each feature as an independent binary event (word present or not) and, crucially, explicitly accounts for the absence of a word as evidence too (a word NOT appearing in a document counts against classes where that word is common) - which Multinomial NB doesn't do. This makes BernoulliNB appropriate for short texts or when you've binarized features to presence/absence. (c) Continuous features: Gaussian Naive Bayes. It models each feature's class-conditional distribution as a Gaussian, estimating a per-class mean and variance for each feature, so it fits continuous measurements rather than counts or binary flags. The choice matters because each variant assumes a different generative distribution for the features, and applying the wrong one mismodels the data - e.g., feeding word counts to GaussianNB pretends counts are Gaussian (they're not - they're non-negative and skewed), and feeding continuous sensor readings to MultinomialNB is nonsensical since it expects count-like non-negative integers. Matching the variant to the feature type is the same 'pick the distribution that matches your data' discipline as choosing a GLM family.",
          "deepDive": {
            "q": "For a document where most vocabulary words are absent, how does BernoulliNB's treatment of absence change its behavior versus MultinomialNB?",
            "a": "BernoulliNB includes a term for every vocabulary word in every document's likelihood - present words contribute P(word present | class) and, importantly, absent words contribute P(word absent | class) = 1 - P(word present | class). So for a class where a certain word is very common, a document lacking that word is actively penalized for that class. MultinomialNB only sums over the words that actually appear (with their counts); word absence contributes nothing directly. The practical consequences: BernoulliNB tends to work better on short documents where the presence/absence signal is strong and word repetition is rare, and its explicit absence-modeling can help discriminate classes by what's missing; MultinomialNB tends to win on longer documents where term frequency carries real information and the vocabulary is large (making explicit absence terms for every non-occurring word both noisy and computationally heavier). It's a concrete example of how the generative assumption you choose - counts vs binary events with absence - changes what evidence the classifier uses."
          }
        },
        {
          "q": "Naive Bayes assumes features are conditionally independent given the class. What happens to its behavior when you include two highly correlated (or duplicated) features, and how would you mitigate it?",
          "a": "Highly correlated or duplicated features cause Naive Bayes to double-count evidence, amplifying the very error the independence assumption creates. Concretely, if you include the same informative feature twice (or two features that are near-perfect proxies for each other), Naive Bayes treats them as two independent pieces of evidence and multiplies both of their likelihoods into the posterior - so the class they favor gets its log-odds boosted twice as much as the true single piece of evidence justifies. This makes the model even more over-confident than usual and, in cases where that doubled evidence tips a close decision, can flip the classification incorrectly by letting one underlying signal dominate the vote. The mitigation options: (1) Deduplicate / decorrelate the feature set - drop redundant features, or use dimensionality reduction (e.g., select one representative per correlated group) so each retained feature carries roughly independent evidence, better matching the assumption. (2) For text, use TF-IDF-style weighting or feature selection to reduce redundancy among co-occurring terms. (3) If features are inherently strongly correlated and you can't remove them, use a model that doesn't assume independence - logistic regression fits per-feature weights that can down-weight redundant features (assigning correlated features shared/split weights) precisely because it optimizes the joint decision rather than counting each feature independently, so it doesn't double-count the way Naive Bayes does.",
          "deepDive": {
            "q": "Why does logistic regression naturally handle correlated features that break Naive Bayes?",
            "a": "Logistic regression fits its weights jointly by maximizing the conditional likelihood of the labels, so it 'sees' the features together and can allocate the total predictive credit for a correlated group across their weights - if two features are near-duplicates, the optimizer will typically split the weight between them (or shrink one) so their combined contribution equals the evidence they jointly provide, rather than counting each fully. Naive Bayes, by contrast, estimates each feature's likelihood in isolation by independent counting, with no mechanism to notice that two features are redundant, so it necessarily adds their evidence as if independent. This is the discriminative-vs-generative distinction in action: the discriminative model optimizes the joint decision boundary (and thus accounts for feature interactions/correlations implicitly), while the generative Naive Bayes model's per-feature independent estimation bakes in the assumption that no such correlations exist - which is exactly why adding correlated features degrades Naive Bayes but not (much) logistic regression."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The 'naive' assumption",
        "back": "Features are conditionally independent given the class, so P(x|y) factorizes into product_j P(x_j|y) - the intractable joint becomes a product of counts."
      },
      {
        "type": "formula",
        "front": "Naive Bayes prediction",
        "back": "argmax_y [log P(y) + sum_j log P(x_j|y)] - Bayes' theorem in log-space (sums avoid underflow)."
      },
      {
        "type": "definition",
        "front": "Generative vs discriminative",
        "back": "Naive Bayes models P(x|y) and P(y) then applies Bayes (generative); logistic regression models P(y|x) directly (discriminative)."
      },
      {
        "type": "pitfall",
        "front": "Zero-frequency problem",
        "back": "An unseen word gives P(word|class)=0, zeroing the whole product and vetoing the class - fix with Laplace (add-alpha) smoothing."
      },
      {
        "type": "formula",
        "front": "Laplace smoothing",
        "back": "P(w|y) = (count(w,y)+alpha)/(count(y)+alpha*V) - MAP estimate under a Dirichlet prior; alpha=1 is add-one."
      },
      {
        "type": "pitfall",
        "front": "Naive Bayes calibration",
        "back": "Over-confident (probabilities near 0/1) because correlated features double-count evidence - argmax/ranking good, probabilities poor. Calibrate post-hoc."
      },
      {
        "type": "intuition",
        "front": "Why it works despite false independence",
        "back": "Classification needs only the right argmax, not exact probabilities - the distortion often doesn't change which class scores highest."
      },
      {
        "type": "definition",
        "front": "NB variants by feature type",
        "back": "MultinomialNB (word counts), BernoulliNB (binary presence/absence, models absence too), GaussianNB (continuous features)."
      }
    ],
    "refs": [
      {
        "title": "Domingos & Pazzani, On the Optimality of the Simple Bayesian Classifier (1997)",
        "url": "https://link.springer.com/article/10.1023/A:1007413511361"
      },
      {
        "title": "scikit-learn: Naive Bayes",
        "url": "https://scikit-learn.org/stable/modules/naive_bayes.html"
      },
      {
        "title": "Manning, Raghavan, Schutze - IR Book, Text classification & Naive Bayes",
        "url": "https://nlp.stanford.edu/IR-book/html/htmledition/naive-bayes-text-classification-1.html"
      },
      {
        "title": "Ng & Jordan, On Discriminative vs Generative Classifiers (NeurIPS 2001)",
        "url": "https://papers.nips.cc/paper/2001/hash/7b7a53e239400a13bd6be6c91c4f6c4e-Abstract.html"
      }
    ],
    "demos": [
      "naive-bayes"
    ]
  }
};
