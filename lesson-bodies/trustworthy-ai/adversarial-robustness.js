// GENERATED from content/lessons/trustworthy-ai/adversarial-robustness.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/adversarial-robustness/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "adversarial-robustness": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Adversarial examples are not a curiosity about images. They are what happens when a model relies on features that carry real predictive signal and are individually smaller than the perturbation budget. Build a task with four large-margin features and two hundred tiny ones, each smaller than epsilon, and a standard model reaches 0.9056 clean accuracy and 0.6389 under an L-infinity attack it never saw - because it learned to use the two hundred.",
        "Adversarial training is the defence that works, and its cost is specific rather than universal. Here it recovered robust accuracy from 0.6389 to 0.8059 at a clean-accuracy cost of essentially zero, because the task HAD large-margin features available to fall back on. The famous robustness-accuracy trade-off is real when robust features are insufficient for the task, and it is not a law.",
        "The module's thesis lands hardest here, because 'robust' is the word most often used with no quantifier at all. Robustness is defined RELATIVE TO A THREAT MODEL. The model trained against L-infinity at 0.08 scores 0.8059 there, 0.6706 at twice the budget, 0.7193 under L-2, and 0.8496 against a contrast-and-brightness shift that lies outside every L-p ball. Four numbers, one model, one word."
      ],
      "math": [
        {
          "h": "The robust optimization problem",
          "paras": [
            "Adversarial training replaces empirical risk minimization with a min-max: minimize the worst-case loss inside a perturbation set. Everything that follows depends on what set you wrote down.",
            "PGD is the standard inner maximizer - projected gradient ascent, restarted from a random point in the ball."
          ],
          "tex": "\\min_\\theta\\ \\mathbb{E}_{(x,y)}\\Big[\\max_{\\|\\delta\\|_p\\leq \\varepsilon} \\mathcal{L}\\big(f_\\theta(x+\\delta),y\\big)\\Big]",
          "texNote": "The threat model is the pair (p, epsilon), and it is a MODELLING CHOICE, not a property of the world. A defence is a statement about that set and says nothing outside it."
        },
        {
          "h": "★ One model, four threat models",
          "paras": [
            "The adversarially-trained model was optimized against L-infinity perturbations of size 0.08. Every column below is the same two models."
          ],
          "tex": "\\begin{array}{lrr} \\text{attack} & \\text{standard} & \\text{adv-trained}\\\\ L_\\infty\\ \\varepsilon=0.08\\ \\text{(trained for)} & 0.6388 & \\mathbf{0.8059}\\\\ L_\\infty\\ \\varepsilon=0.16\\ \\text{(2x budget)} & 0.2901 & 0.6706\\\\ L_2\\ \\text{(comparable budget)} & 0.6995 & 0.7193\\\\ \\text{contrast + shift (no } L_p\\text{ bound)} & 0.6965 & 0.8496 \\end{array}",
          "texNote": "Robustness degrades gracefully off the trained threat model here and can collapse entirely in real systems. The number that gets published is the first row; the word 'robust' is read as all four."
        },
        {
          "h": "Certified versus empirical: a lower and an upper bound",
          "paras": [
            "Randomized smoothing gives a provable L-2 radius from a lower confidence bound on the smoothed classifier's top-class probability. It is a guarantee against EVERY perturbation in the ball, including ones nobody has invented.",
            "Empirical robust accuracy is an upper bound: it reflects only the attacks you ran."
          ],
          "tex": "R = \\sigma\\,\\Phi^{-1}(\\underline{p}), \\qquad \\underline{p} = \\text{Clopper-Pearson lower bound}, \\qquad \\text{certified} \\leq \\text{true} \\leq \\text{empirical}",
          "texNote": "Measured at radius 0.25: certified 0.8290, empirical 0.8420. At 0.50: 0.7435 and 0.7720. At 1.00: 0.0000 and 0.5965, because the maximum certifiable radius with this sigma and sample budget was 0.616. The gap IS the honest measure of your ignorance."
        }
      ],
      "code": [
        {
          "h": "★ The invalid certificate I wrote first",
          "paras": [
            "The tell was that certified accuracy came out ABOVE empirical accuracy, which a valid lower bound cannot do."
          ],
          "code": "# WRONG - the Monte Carlo POINT ESTIMATE of p\n#   p_hat = votes.max() / n,  clamped to 1 - 1e-6\n#   Phi^-1(1 - 1e-6) = 4.75  ->  max 'certified' radius 1.188\n#   ... and certified accuracy at r=1.0 came out at 0.7125 while the\n#       empirical attacked accuracy was 0.5930. A LOWER BOUND CANNOT\n#       EXCEED THE QUANTITY IT BOUNDS. That is how I knew it was broken.\n\n# RIGHT - Cohen et al. 2019\n#   1. SELECT the top class on a separate sample of n0 = 100\n#   2. ESTIMATE its probability on n = 1000 fresh samples\n#   3. take the CLOPPER-PEARSON LOWER BOUND at alpha = 0.001\n#   4. ABSTAIN if that bound is <= 0.5      (abstained on 1.6%)\n#   ->  max certified radius 0.616, and certified <= empirical everywhere\n\n# ★ The entire content of the certificate is the CONFIDENCE BOUND.\n#   Drop it and you have a number that looks like a guarantee and is not.",
          "caption": "A certificate computed from a point estimate is not a certificate. This is the module's thesis demonstrated by my own first attempt at it."
        },
        {
          "h": "Evaluating a defence honestly",
          "paras": [
            "The literature on broken defences is large and the failures are stereotyped."
          ],
          "code": "# THE CHECKLIST (Carlini et al., 'On Evaluating Adversarial Robustness')\n#   * ADAPTIVE attacks - designed against YOUR defence, not a library default\n#   * gradient sanity: does loss increase with more PGD steps? does a\n#     random-start ensemble help? if not you may have GRADIENT MASKING\n#   * check that eps -> large drives accuracy to ~0. If it does not, the\n#     attack is failing, not the model succeeding\n#   * report clean accuracy, the exact threat model, steps, restarts, and\n#     the attack's own hyperparameters\n#   * compare against adversarial training - most defences do not beat it\n\n# ★ GRADIENT MASKING is the standard way a defence looks good: obfuscated\n#   or shattered gradients make the ATTACK fail while the model remains\n#   just as vulnerable to an attack that does not need gradients.",
          "caption": "Most published defences that were not adversarial training were later broken by adaptive attacks. Assume yours will be, and evaluate accordingly."
        }
      ],
      "useCases": [
        "Security-relevant classifiers with a real adversary - malware, spam, fraud, content policy - where the threat model is a genuine question about attacker capability rather than a mathematical convenience.",
        "Certifying a safety-critical component where a provable bound is worth a large accuracy cost, and where the L-2 or L-infinity ball genuinely covers the perturbations of concern.",
        "Using adversarial training as a regularizer, since robust models tend to have more perceptually aligned features and better calibration under some shifts.",
        "Stress-testing before launch, where the goal is not a guarantee but finding the cheapest input change that flips a decision."
      ],
      "pitfalls": [
        "Saying 'robust' with no threat model. The same model scored 0.8059, 0.6706, 0.7193 and 0.8496 against four different perturbation sets, and only the first was the one it was trained for.",
        "Computing a certificate from a Monte Carlo point estimate. That gave a maximum radius of 1.188 against a correct 0.616, and produced certified accuracy above empirical accuracy - which is impossible and was the only reason I caught it.",
        "Reporting empirical robust accuracy as robustness. It is an upper bound reflecting the attacks you ran; certified accuracy is the lower bound, and the truth is between them.",
        "Evaluating a defence with a library-default attack. Adaptive attacks designed against the specific defence are the standard, and most non-adversarial-training defences fall to them.",
        "Missing gradient masking. If loss stops increasing with more PGD steps, or a huge epsilon does not drive accuracy to near zero, the attack is failing rather than the model succeeding.",
        "Assuming the robustness-accuracy trade-off is a law. Here adversarial training cost essentially nothing - 0.9056 to 0.9064 clean - because the task had large-margin features to fall back on.",
        "Forgetting that certified accuracy is a property of the SMOOTHED classifier, not the base model, and that smoothing itself cost clean accuracy - 0.9064 down to 0.8875."
      ],
      "connections": [
        {
          "ref": "cnn/adversarial",
          "text": "The vision treatment - FGSM, PGD, transferability and the physical-world attacks - which this lesson assumes and extends into certification."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "The same question without an adversary: robustness to a distribution you did not choose, where the perturbation set is defined by the world rather than by you."
        },
        {
          "ref": "trustworthy-ai/red-teaming",
          "text": "The unbounded version - a human adversary with no L-p constraint at all - and why coverage of the attack space is the quantity that matters there."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The other guarantee in this module with a stated reference class, and the same lower-bound discipline: a confidence bound is what makes a number a guarantee."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "The benign cousin of the min-max problem, where the perturbation set encodes invariances you want rather than an attacker you fear."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Write the robust optimization objective.",
          "a": "min_θ E[ max_{‖δ‖_p ≤ ε} L(f_θ(x+δ), y) ]. The threat model (p, ε) is a modelling CHOICE, not a property of the world."
        },
        {
          "q": "Why do adversarial examples exist?",
          "a": "Models use features that carry real signal and are individually smaller than ε. Here: 4 large-margin features plus 200 tiny ones, and the model learned the 200."
        },
        {
          "q": "Give the standard model's numbers.",
          "a": "Clean 0.9056; L∞ PGD-20 at ε=0.01/0.02/0.04/0.08 → 0.8852 / 0.8577 / 0.7969 / 0.6389."
        },
        {
          "q": "What did adversarial training buy?",
          "a": "Robust accuracy 0.6389 → 0.8059 at ε=0.08, with clean accuracy 0.9056 → 0.9064 — essentially no cost."
        },
        {
          "q": "So is the robustness-accuracy trade-off a law?",
          "a": "No. It bites when robust features are INSUFFICIENT for the task. Here large-margin features existed to fall back on, so the trade was free."
        },
        {
          "q": "★ Give the four threat models.",
          "a": "Adv-trained model: L∞ 0.08 → 0.8059 (trained for); L∞ 0.16 → 0.6706; L2 comparable → 0.7193; contrast+shift (no Lp bound) → 0.8496."
        },
        {
          "q": "Certified vs empirical — which bounds which?",
          "a": "certified ≤ true ≤ empirical. Certified covers EVERY perturbation in the ball; empirical reflects only the attacks you ran."
        },
        {
          "q": "Give the randomized smoothing radius formula.",
          "a": "R = σ·Φ⁻¹(p̲), where p̲ is a Clopper-Pearson LOWER confidence bound on the smoothed top-class probability."
        },
        {
          "q": "★ What happens if you use the point estimate instead?",
          "a": "You get an invalid certificate. Max radius 1.188 vs a correct 0.616 — and certified accuracy came out ABOVE empirical, which a lower bound cannot do."
        },
        {
          "q": "Give the measured certified/empirical gap.",
          "a": "r=0.25: 0.8290 / 0.8420. r=0.50: 0.7435 / 0.7720. r=1.00: 0.0000 / 0.5965 (max certifiable radius was 0.616)."
        },
        {
          "q": "What is gradient masking?",
          "a": "Obfuscated or shattered gradients make the ATTACK fail while the model stays vulnerable. Tell: loss stops rising with more PGD steps, or huge ε doesn't drive accuracy to ~0."
        },
        {
          "q": "How should a defence be evaluated?",
          "a": "ADAPTIVE attacks designed against it, gradient sanity checks, the full threat model and attack hyperparameters, and a comparison against adversarial training."
        }
      ],
      "standard": [
        {
          "q": "Explain adversarial examples and why adversarial training works.",
          "a": "ADVERSARIAL EXAMPLES ARE WHAT HAPPENS WHEN A MODEL USES FEATURES SMALLER THAN THE PERTURBATION BUDGET. They are not a bug about images or a quirk of high dimensions — they follow from the model doing exactly what it was trained to do, which is use whatever generalizes. I built the mechanism explicitly: a task with four large-margin features and two hundred tiny ones, each individually smaller than ε. The two hundred carry most of the aggregate signal, so a standard model uses them and reaches 0.9056 clean accuracy — and an L∞ attack at ε = 0.08 wipes them out, dropping it to 0.6389. The degradation is graded: 0.8852 at ε = 0.01, 0.8577 at 0.02, 0.7969 at 0.04. ADVERSARIAL TRAINING REPLACES EMPIRICAL RISK MINIMIZATION WITH A MIN-MAX: minimize the worst-case loss inside a perturbation set, with PGD as the inner maximizer. It works by forcing the model onto features that survive the perturbation — here, the four large-margin ones — recovering robust accuracy from 0.6389 to 0.8059. THE COST WAS ESSENTIALLY ZERO in clean accuracy, 0.9056 to 0.9064, because those robust features were sufficient for the task. That is the honest version of the famous trade-off: it bites when robust features are INSUFFICIENT, and it is not a law.",
          "deepDive": {
            "q": "Is the model actually making a mistake?",
            "a": "The Ilyas et al. framing is worth having because it reorients the intuition: adversarial examples arise from 'non-robust features' that are genuinely predictive and genuinely brittle, so the model is not making an error in any statistical sense — it is using signal that generalizes on the natural distribution and evaporates under a small adversarial shift. The striking evidence is that a model trained only on adversarially-perturbed images labelled with the ATTACK's target class still generalizes to the clean test set, which is hard to explain if the perturbations were meaningless noise. Practically, that reframes robustness as a preference for a particular kind of feature rather than as fixing a defect, which explains why it costs something: you are restricting the model's hypothesis class. It also explains why adversarially-trained models have side benefits — more perceptually aligned gradients, better transfer, sometimes better calibration — since large-margin features tend to be the semantically meaningful ones. On the training side, the practical costs are real: PGD adversarial training is roughly k times the cost of standard training for k inner steps, and cheaper variants like FGSM-based fast adversarial training are prone to catastrophic overfitting, where robustness to single-step attacks appears while multi-step robustness collapses."
          }
        },
        {
          "q": "Someone tells you their model is robust. What do you ask?",
          "a": "AGAINST WHAT, AND WITH WHICH ATTACK. 'Robust' with no quantifier is not a claim. Robustness is defined relative to a threat model — a perturbation set — and it says nothing outside it. My adversarially-trained model, optimized against L∞ at ε = 0.08, scored 0.8059 there, 0.6706 at twice the budget, 0.7193 under an L2 attack of comparable size, and 0.8496 against a contrast-and-brightness change that lies outside every L∞ ball. FOUR NUMBERS, ONE MODEL, ONE WORD, and only the first is the one the training targeted. In this synthetic setup the degradation off the trained threat model was graceful; in real systems it frequently is not, and models robust to L∞ have been shown to fall to L2, to rotations, to spatial transformations, and to perturbations no one thought to test. SECOND, WHICH ATTACK, because the number is an upper bound that reflects only what you ran. I would want the number of PGD steps, the number of random restarts, whether the attack was ADAPTIVE — designed against this specific defence rather than a library default — and the clean accuracy alongside it. THIRD, THE GRADIENT SANITY CHECKS: does the loss keep increasing with more steps, and does a large ε drive accuracy to near zero? If not, the attack is failing rather than the model succeeding.",
          "deepDive": {
            "q": "Which of those checks should you run first, and why?",
            "a": "That last check is worth doing first because gradient masking is the standard way a defence looks good without being good. Obfuscated, shattered or stochastic gradients make the optimizer fail to find the adversarial example that exists, so the measured robust accuracy is high and the model is exactly as vulnerable to an attack that does not rely on those gradients — a transfer attack from a substitute model, a gradient-free method, or expectation over transformation for stochastic defences. Athalye, Carlini and Wagner broke seven of eight ICLR 2018 defences this way, and the pattern has repeated since. The base rate here is genuinely informative: essentially every published defence other than adversarial training and certified methods has eventually been broken, so the prior on a novel defence should be low and the burden of evidence high. The practical consequence for a reviewer is to ask for the adaptive-attack section specifically, and to treat its absence as decisive rather than as an omission. For a defender, the useful posture is to assume your defence will be broken and to design the evaluation as an attempt to break it yourself."
          }
        },
        {
          "q": "What does a certified defence give you that adversarial training does not?",
          "a": "A PROOF INSTEAD OF A MEASUREMENT. Empirical robust accuracy is an upper bound on true robustness — it reflects only the attacks you ran, so tomorrow's attack can lower it. Certified accuracy is a LOWER bound: a guarantee that no perturbation within the specified ball changes the prediction, including perturbations nobody has invented. Randomized smoothing is the practical method at scale: classify under Gaussian noise, take the majority vote, and the smoothed classifier provably has an L2 radius R = σ·Φ⁻¹(p̲) where p̲ is a lower confidence bound on the top-class probability. THE GAP BETWEEN THE BOUNDS IS THE HONEST MEASURE OF YOUR IGNORANCE. Measured: at radius 0.25, certified 0.8290 against empirical 0.8420; at 0.50, 0.7435 against 0.7720; at 1.00, 0.0000 against 0.5965, because the maximum certifiable radius under my σ and sample budget was 0.616. THE COSTS ARE THREE. Certification is expensive at inference — the estimate needed a thousand noisy forward passes per input. Smoothing costs clean accuracy, 0.9064 down to 0.8875, and the certified model is the SMOOTHED one, not the base model. And the certificate covers one norm ball: the contrast-and-brightness perturbation lies outside every L2 ball and the certificate says nothing about it.",
          "deepDive": {
            "q": "Which implementation detail is easiest to get wrong here?",
            "a": "The methodological detail that matters most is the confidence bound, and I learned it by getting it wrong. My first implementation used the Monte Carlo point estimate of p, clamped near 1, which gives Φ⁻¹(1 − 1e-6) ≈ 4.75 and a maximum 'certified' radius of 1.188 — nearly double the correct 0.616. The tell was that certified accuracy came out at 0.7125 while the empirical attacked accuracy was 0.5930, and A LOWER BOUND CANNOT EXCEED THE QUANTITY IT BOUNDS. Cohen et al.'s procedure is specific for exactly this reason: select the top class on a separate small sample so the selection does not bias the estimate, estimate its probability on fresh samples, take a Clopper-Pearson lower bound at a stated α, and ABSTAIN when that bound does not exceed 0.5 — which happened on 1.6% of inputs. The abstention is part of the guarantee, not an implementation detail: the certificate is a statement about the inputs where it did not abstain. All of which is the module's thesis demonstrated on myself: the entire content of the certificate is the confidence bound, and without it you have a number that looks like a guarantee and is not."
          }
        },
        {
          "q": "How would you decide whether adversarial robustness is worth investing in for a given system?",
          "a": "BY ASKING WHETHER THERE IS AN ADVERSARY AND WHAT THEY CAN ACTUALLY DO. The L∞ threat model comes from an image-classification setting where the constraint encodes imperceptibility to a human, and it transfers poorly to most production systems. For malware, spam, fraud and content policy there IS a real adversary, and the right threat model is defined by their capability — which features they control, at what cost, with what feedback — not by a norm ball. An attacker who can rewrite text arbitrarily is not constrained by any L-p budget, so an L∞-robust model is answering a question nobody asked. FOR MOST SYSTEMS THERE IS NO ADVERSARY, and the money is better spent on distribution shift, which is the same robustness question with the perturbation set chosen by the world rather than by an attacker, and which causes far more production failures. WHERE I WOULD INVEST ANYWAY: as a regularizer, since adversarially-trained models tend to have more semantically aligned features and can generalize better under some natural shifts; and for a small safety-critical component where a certificate is worth a real accuracy cost and the norm ball genuinely covers the perturbations of concern. THE HONEST DEFAULT for most teams is stress-testing rather than certification — find the cheapest input change that flips a decision, and fix what that reveals.",
          "deepDive": {
            "q": "What does a realistic threat model look like for something like a fraud model?",
            "a": "The threat-model question deserves to be made concrete because it is where most of the value is. For a fraud model, the attacker controls transaction attributes but not the victim's history, faces a real cost per attempt, and gets feedback only through accept/decline — so the realistic threat model is a small number of queries over a subset of features with a cost budget, which looks nothing like a norm ball and admits a much cheaper defence, such as making the expensive-to-forge features load-bearing. For an LLM, the attacker controls the entire prompt, so there is no perturbation budget at all and the adversarial-examples literature transfers mostly as intuition; the relevant discipline is red-teaming, which is the next-but-one lesson. The structural point is that the L-p framing was a modelling convenience that made the problem tractable and has been enormously productive academically, and its convenience is not evidence about your system. Choosing a threat model that describes your actual adversary is the highest-value step and it is usually skipped, because writing down a norm ball is easy and characterizing an adversary is not."
          }
        },
        {
          "q": "You inherit a system with a published defence. How do you audit it?",
          "a": "I WOULD TRY TO BREAK IT, AND I WOULD START WITH THE FAILURE MODES THAT ARE STEREOTYPED. First, the gradient sanity checks, because they are cheap and they catch the most common problem: does the loss keep rising with more PGD steps; does adding random restarts help; does a very large ε drive accuracy toward zero as it must. If a huge budget leaves accuracy well above chance, the attack is failing rather than the model succeeding, and I am looking at gradient masking rather than robustness. Second, ATTACKS THAT DO NOT NEED THE DEFENCE'S GRADIENTS: transfer from a substitute model, a gradient-free method, and — if the defence is stochastic — expectation over transformation, which is what defeats randomized preprocessing defences. Third, an ADAPTIVE attack written against the specific mechanism, since a library default tests whether the defence resists a generic attack, which is not the claim. Fourth, I would compare against plain adversarial training at matched clean accuracy; most published defences do not beat it, and if this one does not either, the simpler thing is preferable for maintainability alone. FIFTH, I WOULD CHECK THE THREAT MODEL AGAINST THE SYSTEM'S ACTUAL ADVERSARY, because a defence can be correct and irrelevant.",
          "deepDive": {
            "q": "What prior should you bring to a novel published defence?",
            "a": "It is worth being explicit about the prior. Essentially every published defence that is not adversarial training or a certified method has eventually been broken by an adaptive attack — Athalye, Carlini and Wagner broke seven of eight defences at one ICLR, and the pattern held for years afterward. So the base rate says a novel defence is probably broken, and the audit should be structured as an attempt to confirm that rather than as a verification exercise. Carlini et al.'s evaluation checklist is the right document to work from and its most useful property is that it is a list of things that must be REPORTED — clean accuracy, exact threat model, attack steps and restarts, whether the attack was adaptive — so absence of a section is itself a finding. On the reporting side, the single most valuable artifact to produce from an audit is a robustness curve across ε rather than a point estimate, because the shape reveals gradient masking immediately: a genuine defence degrades smoothly toward chance, and a masked one holds flat and then falls off a cliff, or never falls at all. That curve costs almost nothing to produce and it is missing from most internal evaluations I would expect to inherit."
          }
        },
        {
          "q": "How does this lesson instantiate the module's thesis, and what is the honesty note?",
          "a": "THE WORD 'ROBUST' IS THE MODULE'S THESIS IN A SINGLE ADJECTIVE. A certified radius is a genuine mathematical guarantee — stronger than anything else in this module, since it covers perturbations nobody has invented — and it holds inside ONE norm ball, for the SMOOTHED classifier, on the inputs where the procedure did not abstain. Four qualifiers, all stated in the paper, none of them in the word. Measured, the same model gave 0.8059, 0.6706, 0.7193 and 0.8496 across four perturbation sets. THE HONESTY NOTE IS THAT I PRODUCED AN INVALID CERTIFICATE MYSELF, on the first attempt, by computing the radius from a Monte Carlo point estimate instead of a Clopper-Pearson lower bound. It gave a maximum radius of 1.188 against the correct 0.616 — nearly double — and it looked entirely plausible. THE ONLY REASON I CAUGHT IT was an internal consistency check: certified accuracy at radius 1.0 came out at 0.7125 while the empirical attacked accuracy was 0.5930, and a lower bound cannot exceed the quantity it bounds. Without that comparison I would have published a number that had the form of a guarantee and none of the content. The entire content of a certificate is the confidence bound, and dropping it leaves something that is not a weaker certificate but not a certificate at all.",
          "deepDive": {
            "q": "Why would a code review not have caught that, and what did?",
            "a": "The generalizable lesson from that mistake is about which checks catch which errors. No amount of re-reading the code would have found it, because the code correctly implemented what I wrote; the error was conceptual, substituting an estimate for a bound. What found it was a RELATIONSHIP THAT MUST HOLD — certified ≤ empirical — computed independently and compared. That is the same family as the causal module's habit of asking whether a diagnostic could have come out badly, and the same family as an A/A test: an invariant you can check without knowing the right answer. Whenever a quantity is claimed to be a bound, computing the thing it bounds and comparing is close to free and catches exactly the errors that review does not. It is worth building that in deliberately: for any lower bound, produce an upper bound; for any guarantee, produce an empirical estimate of the same quantity; and treat a violated ordering as decisive. In this case it turned a wrong result into the best teaching example in the lesson, which is the most useful thing a bug can do."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Robust optimization",
        "back": "min_θ E[ max_{‖δ‖_p ≤ ε} L(f_θ(x+δ), y) ]. The threat model (p, ε) is a MODELLING CHOICE. A defence is a statement about that set and says nothing outside it."
      },
      {
        "type": "intuition",
        "front": "Why adversarial examples exist",
        "back": "The model uses features that are genuinely predictive and individually SMALLER than ε. Built explicitly: 4 large-margin + 200 tiny features → standard model learns the 200, clean 0.9056 → robust 0.6389."
      },
      {
        "type": "pitfall",
        "front": "★ \"Robust\" with no threat model",
        "back": "ONE model trained on L∞ ε=0.08: **0.8059** there, **0.6706** at 2× budget, **0.7193** under L2, **0.8496** vs contrast+shift (outside every Lp ball). Four numbers, one word."
      },
      {
        "type": "intuition",
        "front": "Is the robustness–accuracy trade-off a law?",
        "back": "No. Here adversarial training cost NOTHING (clean 0.9056 → 0.9064) while raising robust accuracy 0.6389 → 0.8059, because large-margin features existed to fall back on. It bites when robust features are INSUFFICIENT."
      },
      {
        "type": "definition",
        "front": "Certified vs empirical",
        "back": "certified ≤ true ≤ empirical. Certified = guarantee against EVERY perturbation in the ball, including uninvented ones. Empirical = only the attacks you ran. The GAP is the honest measure of your ignorance."
      },
      {
        "type": "formula",
        "front": "Randomized smoothing radius",
        "back": "R = σ·Φ⁻¹(p̲), p̲ = Clopper-Pearson LOWER bound on the smoothed top-class probability. Measured: r=0.25 → 0.8290/0.8420; r=0.50 → 0.7435/0.7720; r=1.00 → 0.0000/0.5965."
      },
      {
        "type": "pitfall",
        "front": "★ The invalid certificate",
        "back": "Point estimate instead of a confidence bound: Φ⁻¹(1−1e−6)=4.75 → max radius **1.188** vs correct **0.616**. Caught only because certified (0.7125) EXCEEDED empirical (0.5930) — impossible for a lower bound."
      },
      {
        "type": "definition",
        "front": "Cohen et al.'s procedure",
        "back": "(1) SELECT top class on a separate n₀ sample. (2) ESTIMATE on fresh n. (3) Clopper-Pearson lower bound at α. (4) **ABSTAIN if p̲ ≤ 0.5** (1.6% here). The abstention is part of the guarantee."
      },
      {
        "type": "pitfall",
        "front": "Gradient masking",
        "back": "Obfuscated/shattered/stochastic gradients make the ATTACK fail while the model stays vulnerable. Tells: loss stops rising with more PGD steps; restarts don't help; huge ε doesn't drive accuracy to ~0."
      },
      {
        "type": "pitfall",
        "front": "The base rate on novel defences",
        "back": "Essentially every published defence other than adversarial training and certified methods has been broken by adaptive attacks (7 of 8 at one ICLR). Assume yours is broken; structure the audit as an attempt to confirm it."
      },
      {
        "type": "intuition",
        "front": "Choosing a threat model that matters",
        "back": "L∞ encodes imperceptibility to a human — an image convenience. A fraud attacker has a QUERY and COST budget over a feature subset; an LLM attacker controls the whole prompt and has no budget at all. Describe your adversary, not a norm ball."
      },
      {
        "type": "intuition",
        "front": "★ The check that catches conceptual bugs",
        "back": "A RELATIONSHIP THAT MUST HOLD, computed independently. For any lower bound, produce the upper bound and compare; a violated ordering is decisive. Code review can't find an error where the code correctly implements the wrong idea."
      }
    ],
    "refs": [
      {
        "title": "Madry et al. (2018), Towards Deep Learning Models Resistant to Adversarial Attacks",
        "url": "https://arxiv.org/abs/1706.06083"
      },
      {
        "title": "Cohen, Rosenfeld & Kolter (2019), Certified Adversarial Robustness via Randomized Smoothing",
        "url": "https://arxiv.org/abs/1902.02918"
      },
      {
        "title": "Athalye, Carlini & Wagner (2018), Obfuscated Gradients Give a False Sense of Security",
        "url": "https://arxiv.org/abs/1802.00420"
      },
      {
        "title": "Carlini et al. (2019), On Evaluating Adversarial Robustness",
        "url": "https://arxiv.org/abs/1902.06705"
      },
      {
        "title": "Ilyas et al. (2019), Adversarial Examples Are Not Bugs, They Are Features",
        "url": "https://arxiv.org/abs/1905.02175"
      }
    ],
    "demos": [
      "adversarial-examples",
      "certified-robustness",
      "image-augmentation",
      "mc-dropout"
    ]
  }
};
