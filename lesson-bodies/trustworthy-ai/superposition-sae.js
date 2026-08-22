// GENERATED from content/lessons/trustworthy-ai/superposition-sae.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/superposition-sae/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "superposition-sae": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The reason a neuron rarely means one thing is that models have more things to represent than they have neurons, and sparsity lets them cheat. If features are rarely active at the same time, you can store more of them than you have dimensions by giving each a DIRECTION rather than an axis, accepting interference between directions because collisions are rare. That is superposition, and it is why 'find the dog neuron' was always the wrong search.",
        "The toy model makes it concrete. Twenty features into five dimensions, so at most five can be orthogonal. At low sparsity the model represents about half of them and the loss sits at 0.062. Push the probability a feature is inactive to 0.99 and it represents ALL TWENTY at a loss of 0.0004 - a 150x improvement while storing four times more features than it has dimensions. The off-diagonal cosine stays around 0.36 throughout: the interference is real and the model accepts it.",
        "Sparse autoencoders are the leading attempt to recover those directions, and they inherit the module's thesis exactly. On a task with 24 known ground-truth features, the SAE with the BEST reconstruction - fraction of variance unexplained 0.0014, essentially perfect - recovered only 5 of the 24 true directions. A worse-reconstructing configuration recovered 16. THE FIT IS IDENTIFIED AND THE DECOMPOSITION IS NOT, which is the same structure as synthetic control's donor weights."
      ],
      "math": [
        {
          "h": "Why superposition is worth it",
          "paras": [
            "Storing n features in m < n dimensions forces non-orthogonal directions, so activating one feature leaks into the others. The leak costs you only when features co-occur, and under sparsity they rarely do.",
            "So the trade is interference against capacity, and sparsity sets the exchange rate."
          ],
          "tex": "h = \\sum_i x_i W_i, \\qquad \\hat{x}_j = \\mathrm{ReLU}\\Big(x_j\\|W_j\\|^2 + \\underbrace{\\sum_{i\\neq j} x_i \\langle W_i,W_j\\rangle}_{\\text{interference}} + b_j\\Big)",
          "texNote": "The ReLU is load-bearing: it lets the model absorb small negative interference into the flat region, which is why superposition works far better with a nonlinearity than without."
        },
        {
          "h": "The measured phase change",
          "paras": [
            "Twenty features, five dimensions, varying the probability that a feature is inactive."
          ],
          "tex": "\\begin{array}{lrrr} P(\\text{off}) & \\text{loss} & \\text{features represented} & \\overline{|\\cos|}_{\\text{off-diag}}\\\\ 0.000 & 0.0624 & 11 & 0.345\\\\ 0.500 & 0.0726 & 9 & 0.379\\\\ 0.900 & 0.0131 & 18 & 0.356\\\\ 0.990 & 0.0004 & \\mathbf{20} & 0.371\\\\ 0.999 & 0.00002 & \\mathbf{20} & 0.362 \\end{array}",
          "texNote": "At high sparsity all twenty features are stored in five dimensions with the loss falling by three orders of magnitude. The interference never goes away - the mean off-diagonal cosine stays near 0.36 - it simply stops being paid for."
        },
        {
          "h": "★ Reconstruction quality does not imply feature recovery",
          "paras": [
            "A sparse autoencoder trained on activations from a known generative model with 24 true features in 6 dimensions. Dictionary size and L1 penalty are both free parameters."
          ],
          "tex": "\\begin{array}{rrrrr} \\text{dict} & L_1 & \\text{FVU} & L_0 & \\text{true features recovered}\\\\ 24 & 0.02 & \\mathbf{0.0014} & 6.03 & \\mathbf{5/24}\\\\ 24 & 0.20 & 0.0775 & 2.84 & 13/24\\\\ 96 & 0.20 & 0.0769 & 3.96 & \\mathbf{16/24}\\\\ 96 & 0.02 & 0.0018 & 10.02 & 14/24 \\end{array}",
          "texNote": "The configuration with near-perfect reconstruction recovered the FEWEST true features. Recovery is judged by whether a dictionary direction has cosine above 0.9 with a true one; the counts move with hyperparameters that no reconstruction metric can select."
        }
      ],
      "code": [
        {
          "h": "'The SAE found N features' is a claim about N",
          "paras": [
            "Alive-feature counts across the same runs, where a feature counts as alive if it ever activates."
          ],
          "code": "#  dict size   L1     FVU      alive    L0     recovered\n#      12     0.20   0.0937     11     2.17      10/24\n#      24     0.02   0.0014     21     6.03       5/24   <- best fit, worst recovery\n#      24     0.20   0.0775     19     2.84      13/24\n#      24     1.00   0.6532     16     0.53      10/24\n#      48     0.20   0.0769     27     3.32      14/24\n#      96     0.20   0.0769     36     3.96      16/24\n#      96     0.02   0.0018     50    10.02      14/24   <- L0 of 10 is not sparse\n\n# ★ The number of 'features discovered' tracks the DICTIONARY SIZE you chose.\n#   Nothing in the reconstruction loss selects the right one, because the\n#   right one is defined by a ground truth you do not have.",
          "caption": "Every row is a defensible configuration and they disagree about how many features exist. That is not a tuning problem; it is an identification problem."
        },
        {
          "h": "What SAEs are genuinely for",
          "paras": [
            "The critique above is a critique of over-claiming, not of the method. Used as a hypothesis generator it is the best tool available."
          ],
          "code": "# WHAT AN SAE GIVES YOU\n#   * a basis that is SPARSER and more monosemantic than neurons\n#   * candidate directions you can name by inspecting top activations\n#   * something to INTERVENE on - which is the actual test (24-06)\n\n# WHAT IT DOES NOT GIVE YOU\n#   * the model's features - only a dictionary that reconstructs well\n#   * a feature COUNT - that is your dict-size hyperparameter\n#   * evidence of use - reconstruction is correlational, patching is not\n\n# THE EVALUATION THAT MEANS SOMETHING\n#   ablate a discovered feature and measure the change in model behaviour\n#   on inputs where the feature's proposed meaning predicts an effect.\n#   A feature you cannot break the model with is a feature you have not\n#   yet shown the model uses.",
          "caption": "The discipline is the same as attribution: the decomposition generates hypotheses and the intervention tests them."
        }
      ],
      "useCases": [
        "Explaining why single-neuron interpretability plateaus - polysemantic neurons are the expected outcome of a capacity-constrained model with sparse features, not a curiosity.",
        "Finding candidate directions in a language model's residual stream to steer, ablate or monitor, where the SAE narrows a 4,096-dimensional search to a few named directions.",
        "Safety monitoring, where a direction associated with deception or refusal can be watched at inference far more cheaply than running a classifier on outputs.",
        "Model diffing across fine-tunes, where comparing which dictionary features change is more informative than comparing weights."
      ],
      "pitfalls": [
        "Reading reconstruction quality as evidence the features are right. The best-reconstructing SAE, at FVU 0.0014, recovered 5 of 24 true features; a worse one at 0.0769 recovered 16.",
        "Quoting a feature count. Alive features ranged from 11 to 50 across defensible configurations of the same data - the number is a function of dictionary size, not a property of the model.",
        "Treating a low L1 as free accuracy. At dict 96 and L1 0.02 the FVU was excellent at 0.0018 and mean L0 was 10.02, which is not a sparse code in a 6-dimensional space.",
        "Naming a feature from its top activating examples alone. That is a correlational summary and it is systematically biased toward whatever is frequent in the sampling set.",
        "Assuming features are atomic. Dictionary directions can be composites or splits of true features - increasing dictionary size often shatters one feature into several that all look meaningful.",
        "Forgetting dead features. Sixteen of 24 dictionary elements were alive in one run; dead ones inflate the nominal dictionary while contributing nothing.",
        "Expecting superposition to disappear with scale. More dimensions means more features worth representing, so the ratio is what matters and it does not obviously improve."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/attribution",
          "text": "Why input-space attribution has a ceiling: if the model's units are directions in activation space, no attribution over input features can name them."
        },
        {
          "ref": "trustworthy-ai/probing-patching",
          "text": "The causal test that turns a discovered direction into a claim about use - and the lesson where a perfect probe meets a zero-effect intervention."
        },
        {
          "ref": "causal-inference/time-series-causality",
          "text": "The same identification structure as synthetic control: an excellent fit whose decomposition is not identified, so the weights should not be interpreted."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "The general problem - dictionary learning and sparse coding - of which SAEs are the activation-space instance, with the same rotation and scaling ambiguities."
        },
        {
          "ref": "unsupervised-learning/ica",
          "text": "The classical result on when a linear decomposition IS identifiable, which is the right baseline for asking what an SAE could recover in principle."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is superposition?",
          "a": "Representing more features than dimensions by giving each a DIRECTION rather than an axis, accepting interference because sparse features rarely co-activate."
        },
        {
          "q": "Give the measured phase change.",
          "a": "20 features in 5 dims. P(off)=0: 11 represented, loss 0.0624. P(off)=0.99: ALL 20, loss 0.0004 — three orders of magnitude better."
        },
        {
          "q": "Does the interference go away at high sparsity?",
          "a": "No. Mean off-diagonal cosine stayed ~0.36 throughout. It stops being PAID for, because collisions become rare."
        },
        {
          "q": "Why is ReLU load-bearing for superposition?",
          "a": "It absorbs small negative interference into the flat region, so the model can tolerate non-orthogonal directions far better than a linear map could."
        },
        {
          "q": "Why is a neuron the wrong unit?",
          "a": "Features are directions and there are more of them than neurons, so a neuron is a projection of several features — polysemanticity is the expected outcome, not a curiosity."
        },
        {
          "q": "What does an SAE do?",
          "a": "Learns an overcomplete dictionary with a sparsity penalty on activations, reconstructing the activation vector from few active dictionary elements."
        },
        {
          "q": "★ Give the reconstruction-vs-recovery result.",
          "a": "24 known true features. Best fit (FVU 0.0014) recovered **5/24**. A worse fit (FVU 0.0769, dict 96) recovered **16/24**."
        },
        {
          "q": "So what selects the right SAE?",
          "a": "Nothing in the reconstruction loss — the right one is defined by a ground truth you don't have. Same structure as synthetic control's donor weights."
        },
        {
          "q": "Is 'the SAE found 512 features' a finding?",
          "a": "No — it's a restatement of your dictionary size. Alive counts ranged 11 to 50 across defensible configs on the SAME data."
        },
        {
          "q": "What does the L1 coefficient trade?",
          "a": "Sparsity against reconstruction. dict 96, L1 0.02 → FVU 0.0018 but mean L0 = 10.02, which isn't a sparse code in 6 dimensions."
        },
        {
          "q": "What are dead features?",
          "a": "Dictionary elements that never activate. 16 of 24 alive in one run — they inflate the nominal dictionary while contributing nothing."
        },
        {
          "q": "What evaluation of a discovered feature actually means something?",
          "a": "Ablate or patch it and measure the behaviour change where its proposed meaning predicts an effect. Reconstruction is correlational; intervention is not."
        }
      ],
      "standard": [
        {
          "q": "Explain superposition and why it changes what interpretability should look for.",
          "a": "SUPERPOSITION IS A CAPACITY TRADE. A model has more things worth representing than it has dimensions, and if those things are SPARSE — rarely active simultaneously — it can store them as non-orthogonal DIRECTIONS rather than as axes, accepting interference between them because collisions are rare. The toy model shows the trade directly: twenty features into five dimensions, so at most five can be orthogonal. At zero sparsity the model represents about eleven of them at a loss of 0.0624. Push the probability a feature is inactive to 0.99 and it represents ALL TWENTY at a loss of 0.0004 — three orders of magnitude better while storing four times more features than dimensions. Crucially the interference does not disappear: mean off-diagonal cosine stayed around 0.36 in every regime. It simply stops being paid for, because two interfering features are rarely on at once. THE CONSEQUENCE FOR INTERPRETABILITY IS THAT A NEURON IS THE WRONG UNIT. If features are directions and there are more of them than neurons, then any single neuron is a projection of several features, and polysemanticity is the predicted outcome rather than a puzzle. 'Find the dog neuron' was searching in a basis the model never used.",
          "deepDive": {
            "q": "Which mechanistic details make superposition work at all?",
            "a": "Two mechanistic details are worth having. First, the ReLU is load-bearing: it lets the model absorb small negative interference into its flat region, so superposition works far better with a nonlinearity than without, and the toy model's behaviour changes qualitatively if you remove it. Second, feature IMPORTANCE interacts with sparsity — when features have unequal importance, the model preferentially gives the important ones cleaner directions and crowds the rest, so you see a mix of near-monosemantic and heavily-shared directions rather than a uniform smear. On the question of whether scale rescues us: more dimensions means more features worth representing, so the RATIO is what matters and there is no strong reason to expect it to improve — larger models seem to have more superposition, not less, because their training distribution supports more distinguishable concepts. That makes superposition a structural fact about the field rather than a transitional problem, and it is the main argument for dictionary-learning approaches over neuron-level analysis."
          }
        },
        {
          "q": "How do sparse autoencoders work, and how much should you trust their output?",
          "a": "AN SAE LEARNS AN OVERCOMPLETE DICTIONARY OVER ACTIVATIONS with a sparsity penalty: encode the activation into a much larger vector of nonnegative coefficients, penalize their L1, and decode back with unit-norm dictionary directions. The hope is that the learned directions recover the model's features, since the generative story — few active features combining linearly — matches the SAE's inductive bias. TRUST IT AS A HYPOTHESIS GENERATOR AND NOT AS A MEASUREMENT. On a task with 24 KNOWN ground-truth features in 6 dimensions, the configuration with the best reconstruction — FVU 0.0014, essentially perfect — recovered only 5 of the 24 true directions at cosine above 0.9. A configuration reconstructing far worse, FVU 0.0769 with a 96-element dictionary, recovered 16. THE BEST FIT GAVE THE WORST RECOVERY. And nothing in the training objective distinguishes them, because the objective measures reconstruction and the thing you want is identification, which is defined by a ground truth that in real models does not exist. Alive-feature counts ranged from 11 to 50 across defensible configurations of the same data, so 'the SAE found N features' is a restatement of the dictionary size.",
          "deepDive": {
            "q": "What does this share structurally with synthetic control?",
            "a": "The structural parallel worth naming is synthetic control from the causal module: an excellent pre-period fit whose donor weights were wrong, where the fit was identified and the decomposition was not. Same shape here. The general lesson is that when a method has more free parameters than the data constrains, a good objective value is compatible with many different decompositions, and the objective cannot rank them. That is why the field has moved toward evaluations that do not rely on reconstruction: automated interpretability scoring, where a language model predicts activations from a proposed explanation; ablation studies measuring downstream loss when a feature is removed; and feature-splitting analysis checking whether a direction shatters into several as the dictionary grows, which is a strong hint it was a composite. None of these is decisive, and the honest current state is that SAE features are useful, better than neurons, and not yet shown to be the model's actual units. Saying that plainly is more defensible than either dismissing the technique or reporting feature counts as discoveries."
          }
        },
        {
          "q": "How would you validate that a discovered feature is real?",
          "a": "BY INTERVENING, BECAUSE EVERYTHING ELSE IS CORRELATIONAL. The standard evidence — top activating examples all sharing a theme — is a summary of when the direction is active, which is exactly the kind of claim the causal module spent ten lessons warning about, and it is biased toward whatever is frequent in the sampling set. THE TEST THAT MEANS SOMETHING is ablation: set the feature's coefficient to zero, or subtract its direction from the residual stream, and measure the behaviour change on inputs where the proposed meaning PREDICTS an effect and on control inputs where it predicts none. A feature you cannot break the model with is a feature you have not shown the model uses. The converse test is steering: add the direction and check that the behaviour appears, which is the stronger evidence because it is harder to get by accident. I WOULD ALSO RUN THE NEGATIVE CONTROLS. Ablate a random direction of the same norm and confirm the effect is smaller. Check the effect on unrelated inputs to bound the specificity. And check whether the feature survives increasing the dictionary size, since a direction that shatters into three when the dictionary doubles was probably a composite rather than an atom.",
          "deepDive": {
            "q": "What does a successful ablation actually establish?",
            "a": "It is worth being clear about what ablation does and does not establish, because interpretability results are frequently over-read in the same way attribution results are. A successful ablation shows the model's output DEPENDS on that direction for those inputs; it does not show the direction means what you named it, and it does not show the model has no other route to the same behaviour. Redundancy is common — ablating one path often produces a smaller effect than expected because another path compensates, which is the self-repair phenomenon observed in language models and a genuine methodological headache, since it makes single-component ablations systematically understate importance. The mitigations are ablating sets rather than singletons, and measuring the effect with the compensating path also disabled. There is also a sampling issue in the naming step: top activating examples are drawn from a corpus, so a feature that fires on a rare construction will be named by whichever common thing also triggers it, and the explanation will be wrong in a way that is invisible until someone tests an input the naming set never contained."
          }
        },
        {
          "q": "What is the practical value of this work if the features are not identified?",
          "a": "THE VALUE IS THAT IT NARROWS THE SEARCH AND GIVES YOU SOMETHING TO INTERVENE ON, which is a genuine advance over the alternative of staring at neurons. Three concrete uses. FIRST, SAFETY MONITORING: a direction associated with a behaviour you care about — refusal, deception, a specific capability — can be watched at inference for the cost of a dot product, far cheaper than running a classifier over outputs, and it fires before the output exists rather than after. Whether the direction is the model's true atom is somewhat beside the point if it reliably predicts the behaviour, which is a testable claim. SECOND, STEERING: adding or subtracting a direction changes behaviour at inference without retraining, which is a cheap and reversible control surface. THIRD, MODEL DIFFING: comparing which dictionary features change across a fine-tune is far more informative than comparing weights, and it is how you notice a safety fine-tune removed a capability versus merely suppressing its expression. IN ALL THREE THE CLAIM IS OPERATIONAL — this direction predicts or controls this behaviour — rather than ontological, and operational claims are testable in the way the identification claim is not.",
          "deepDive": {
            "q": "What could go wrong with that reframing in practice?",
            "a": "That reframing is the honest way to present the field's current state, and it also sets the right expectations for what could go wrong. A monitoring direction validated on one distribution can fail on another, exactly like every other guarantee in this module, so it needs the same treatment: state the reference class, test on held-out distributions, and expect degradation under shift. A steering vector strong enough to change behaviour is often strong enough to degrade capability generally, so the evaluation must include unrelated tasks and not just the target behaviour. And model diffing inherits the identification problem in a specific way — if the dictionary is refit on each model, the features are not comparable across them, so you need a shared dictionary or an explicit matching step, and papers that skip this are comparing coordinate systems rather than features. None of that undermines the utility; it means the results should be reported as engineering claims with measured operating characteristics, which is a lower bar than 'we understand the model' and a much more useful one."
          }
        },
        {
          "q": "How does this lesson instantiate the module's thesis?",
          "a": "THROUGH A GUARANTEE THAT IS REAL AND ABOUT SOMETHING OTHER THAN WHAT PEOPLE READ IT AS. An SAE's reconstruction loss is an honest measurement of how well the dictionary reconstructs activations, and FVU of 0.0014 is a genuinely excellent reconstruction. What it is not is evidence about feature identification — that same configuration recovered 5 of 24 true features while a configuration reconstructing 50x worse recovered 16. The number is true; the claim made from it is about a different property. THE STRUCTURE IS THE SAME AS EVERY LESSON SO FAR. Calibration's ECE was an average over a chosen population. Conformal's coverage was marginal over a chosen exchangeable distribution. A fairness metric is a parity over a chosen partition. An attribution is a contrast against a chosen baseline. And a reconstruction score is a fit under a chosen dictionary size and sparsity penalty. IN EVERY CASE the reference — the population, the distribution, the partition, the baseline, the hyperparameter — is what determines the answer and is what the reporting convention omits. THE ACTION IS THE SAME TOO: state the reference alongside the number. For an SAE that means reporting dictionary size, L1 coefficient, alive-feature count and L0 whenever you report a feature, because the feature is not well defined without them.",
          "deepDive": {
            "q": "What is the sharper version specific to this lesson?",
            "a": "There is a sharper version specific to this lesson that connects back to the causal module. Superposition means the model's representation is genuinely not axis-aligned, so there is a rotation ambiguity at the heart of the problem: many bases reconstruct equally well, and choosing among them requires a criterion outside reconstruction. Sparsity IS that criterion — it is what breaks the rotation symmetry, which is why SAEs work at all, and it is the same reason independent component analysis can identify a decomposition that PCA cannot. But sparsity only identifies the basis when the true features really are sparse to the degree assumed, and the L1 coefficient encodes that assumption. So the free parameter is not merely a knob; it is a claim about the world, and the recovered features are its consequence. That is the causal module's thesis reappearing inside interpretability: the assumption is the estimate, and here the assumption is 'how sparse are the model's true features', which nobody knows."
          }
        },
        {
          "q": "What would change your mind about how much to trust SAE-based interpretability?",
          "a": "SEVERAL THINGS WOULD, AND STATING THEM IS WHAT MAKES THE POSITION A POSITION RATHER THAN A MOOD. FIRST, RECOVERY ON KNOWN GROUND TRUTH AT SCALE. The experiment here used 24 planted features and the recovery rate was 5 to 16 out of 24 depending on hyperparameters. If SAEs recovered planted features reliably in a realistic-scale model with realistic feature statistics — and if the recovery were robust across dictionary sizes rather than tracking them — that would be strong evidence. SECOND, HYPERPARAMETER INDEPENDENCE: if the same features appeared at dictionary sizes 4x apart, rather than splitting, that would suggest the decomposition is finding something rather than fitting a budget. THIRD, PREDICTIVE INTERVENTIONS ON HELD-OUT BEHAVIOUR: naming a feature, predicting in advance what ablating it will do on inputs nobody has looked at, and being right. That is a pre-registration standard and it is the one the field is moving toward. FOURTH, CONVERGENCE ACROSS METHODS — if SAEs, probing and patching independently identified the same directions, their different failure modes would have to conspire, which is the triangulation argument from the causal module.",
          "deepDive": {
            "q": "And what would lower your confidence?",
            "a": "Conversely, what would lower my confidence: evidence that discovered features are strongly dependent on the training corpus used to fit the SAE rather than on the model; feature-splitting behaviour that continues indefinitely with dictionary size, suggesting there is no atomic level to find; or a demonstration that steering vectors derived from SAE features are no more effective than directions found by much simpler means such as difference-in-means between contrastive prompts, which some results already suggest for certain behaviours. That last one is the most important practical check and the least glamorous: BASELINE AGAINST THE SIMPLE THING. A large fraction of interpretability's operational value — monitoring and steering — is achievable with contrastive difference vectors requiring no dictionary learning at all, and a technique should have to beat that baseline before its complexity is justified. Asking 'what does this beat' is the same discipline as asking for a negative control, and it is the question most likely to be missing from an impressive-looking result."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Superposition",
        "back": "Storing more features than dimensions as non-orthogonal DIRECTIONS, accepting interference because sparse features rarely co-activate. Interference vs capacity; sparsity sets the exchange rate."
      },
      {
        "type": "formula",
        "front": "★ The measured phase change",
        "back": "20 features in 5 dims. P(off)=0 → 11 represented, loss 0.0624. P(off)=0.99 → **ALL 20**, loss 0.0004. Off-diagonal cosine stays ~0.36 throughout — interference never leaves, it stops being PAID for."
      },
      {
        "type": "intuition",
        "front": "Why a neuron is the wrong unit",
        "back": "Features are directions and there are more of them than neurons, so any neuron is a projection of several. Polysemanticity is the PREDICTED outcome. \"Find the dog neuron\" searched a basis the model never used."
      },
      {
        "type": "intuition",
        "front": "Why ReLU is load-bearing here",
        "back": "It absorbs small negative interference into its flat region, so non-orthogonal directions are far more tolerable than in a linear map. Remove it and the toy model's behaviour changes qualitatively."
      },
      {
        "type": "pitfall",
        "front": "★ Best reconstruction, worst recovery",
        "back": "24 known true features. FVU **0.0014** (near-perfect) → **5/24** recovered. FVU 0.0769 (dict 96) → **16/24**. Nothing in the reconstruction loss distinguishes them."
      },
      {
        "type": "pitfall",
        "front": "\"The SAE found N features\"",
        "back": "A restatement of your dictionary size. Alive counts ran **11 to 50** across defensible configs on the SAME data. Report dict size, L1, alive count and L0 whenever you report a feature."
      },
      {
        "type": "intuition",
        "front": "The identification parallel",
        "back": "Same structure as synthetic control in module 23: **the FIT is identified, the DECOMPOSITION is not.** Good objective value is compatible with many decompositions and cannot rank them."
      },
      {
        "type": "pitfall",
        "front": "Low L1 is not free accuracy",
        "back": "dict 96, L1 0.02 → FVU 0.0018 (excellent) but mean **L0 = 10.02** in a 6-dimensional space. That is not a sparse code; it's a dense one with good reconstruction."
      },
      {
        "type": "definition",
        "front": "What validates a discovered feature",
        "back": "ABLATION (zero it, measure behaviour where the meaning predicts an effect + controls where it doesn't) and STEERING (add it, check the behaviour appears). Top-activating examples are a correlational summary."
      },
      {
        "type": "pitfall",
        "front": "Self-repair",
        "back": "Ablating one path often produces a smaller effect than expected because another compensates — so single-component ablations systematically UNDERSTATE importance. Ablate sets, or disable the compensating path too."
      },
      {
        "type": "intuition",
        "front": "What sparsity is really doing",
        "back": "Breaking the rotation symmetry. Many bases reconstruct equally well; sparsity is the criterion that picks one — same reason ICA identifies what PCA cannot. So the L1 coefficient is a CLAIM about how sparse the model's features are."
      },
      {
        "type": "intuition",
        "front": "★ The baseline SAEs must beat",
        "back": "Contrastive difference-in-means vectors — no dictionary learning at all — already deliver much of the monitoring and steering value. Ask what a technique BEATS before its complexity is justified."
      }
    ],
    "refs": [
      {
        "title": "Elhage et al. (2022), Toy Models of Superposition",
        "url": "https://transformer-circuits.pub/2022/toy_model/index.html"
      },
      {
        "title": "Bricken et al. (2023), Towards Monosemanticity: Decomposing Language Models With Dictionary Learning",
        "url": "https://transformer-circuits.pub/2023/monosemantic-features/index.html"
      },
      {
        "title": "Templeton et al. (2024), Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet",
        "url": "https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html"
      },
      {
        "title": "Cunningham, Ewart, Riggs, Huben & Sharkey (2023), Sparse Autoencoders Find Highly Interpretable Features in Language Models",
        "url": "https://arxiv.org/abs/2309.08600"
      },
      {
        "title": "Olah et al. (2020), Zoom In: An Introduction to Circuits",
        "url": "https://distill.pub/2020/circuits/zoom-in/"
      }
    ],
    "demos": [
      "superposition",
      "sparse-autoencoder",
      "pca",
      "embeddings"
    ]
  }
};
