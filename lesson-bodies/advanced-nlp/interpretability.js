// GENERATED from content/lessons/advanced-nlp/interpretability.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/interpretability/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "interpretability": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The previous lessons in this module all ended in the same place. Benchmarks could not tell us whether a model was doing the task or exploiting an artifact. Adversarial sets could show that something was wrong but not what. And the model's own chain of thought turned out to be a generated artifact rather than a report of its computation. Mechanistic interpretability is the response: stop asking the model what it did, stop inferring from behaviour alone, and reverse-engineer the actual computation from the weights and activations.",
        "The standard of evidence is what separates this from earlier interpretability work. Probing - training a classifier on frozen activations to see if some property is decodable - tells you information is PRESENT, which is much weaker than it sounds, because a sufficiently expressive probe recovers almost anything from almost any representation. The correction is Hewitt & Liang's control task: build an identical task with RANDOM labels and report SELECTIVITY, the real-task accuracy minus the control accuracy. A probe that does well on both is memorizing. But even a perfectly selective probe says nothing about whether the model USES the information, which is why the field moved to CAUSAL interventions: patch an activation from one run into another and see whether the output changes. If it does, that component is doing work.",
        "The obstacle is that features are not neurons. Models represent far more distinct features than they have dimensions, packing them into overlapping directions - SUPERPOSITION - which is tolerable because features are sparse, only a few active at a time. The consequence is polysemanticity: a single neuron fires for unrelated things and is not interpretable in isolation. Sparse autoencoders address this by learning an overcomplete dictionary that decomposes activations into many mostly-inactive, more monosemantic features, and this scaled to production models - Anthropic extracted millions of interpretable features from Claude 3 Sonnet, including one for the Golden Gate Bridge that could be clamped to make the model bring the bridge into every response. That is the clearest existing demonstration that these features are causally real, not just correlational stories."
      ],
      "math": [
        {
          "h": "Probing selectivity: the control-task correction",
          "paras": [
            "A probe's accuracy conflates 'the representation encodes this' with 'the probe learned it'. Build a control task with the same structure and RANDOM labels, and report the difference. High accuracy with low selectivity means the probe, not the model, is doing the work."
          ],
          "tex": "\\mathrm{Selectivity} = \\mathrm{Acc}_{\\mathrm{task}} - \\mathrm{Acc}_{\\mathrm{control}}, \\qquad \\text{control: } y \\sim \\mathrm{Uniform}(\\mathcal{Y}) \\text{ fixed per word type}",
          "texNote": "A linear probe at 90% on the real task and 20% on the control is informative. A deep MLP probe at 95% and 90% is not - it memorized. This is why linear probes are preferred: low capacity makes accuracy mean more."
        },
        {
          "h": "Activation patching: the causal test",
          "paras": [
            "Run the model on a CLEAN input and a CORRUPTED one, then copy a single activation from the clean run into the corrupted run and re-run downstream. The recovery in the output metric measures that component's causal contribution to the behaviour."
          ],
          "tex": "\\mathrm{Effect}(c) = \\frac{\\mathcal{M}\\big(x_{\\mathrm{corr}} \\,\\big|\\, a_c \\leftarrow a_c^{\\mathrm{clean}}\\big) - \\mathcal{M}(x_{\\mathrm{corr}})}{\\mathcal{M}(x_{\\mathrm{clean}}) - \\mathcal{M}(x_{\\mathrm{corr}})}",
          "texNote": "M is typically the logit difference between the correct and a distractor answer, which is more sensitive than accuracy. Effect near 1 means patching that one component restores the behaviour - strong evidence it carries the relevant information."
        },
        {
          "h": "Superposition: why features outnumber neurons",
          "paras": [
            "If a model needs to represent m features in d dimensions with m >> d, it cannot give each an orthogonal direction. But if only k features are active at once and k << d, near-orthogonal directions suffice - interference is small and the model tolerates it in exchange for representing far more."
          ],
          "tex": "m \\gg d, \\quad \\text{active } k \\ll d \\;\\Rightarrow\\; \\exists\\, \\{v_i\\}_{i=1}^{m} \\subset \\mathbb{R}^d, \\; |v_i^\\top v_j| \\le \\epsilon, \\quad m = O\\!\\left(e^{d\\epsilon^2}\\right)",
          "texNote": "The Johnson-Lindenstrauss bound: the number of near-orthogonal directions grows EXPONENTIALLY in d. This is why neurons are polysemantic - each is a projection of many superposed features - and why interpreting individual neurons was always going to fail."
        },
        {
          "h": "Sparse autoencoders: dictionary learning on activations",
          "paras": [
            "Learn an overcomplete basis in which activations decompose sparsely. The hidden layer is much wider than the input, and an L1 penalty forces only a few features active per token - undoing superposition by moving to a higher-dimensional, sparser space."
          ],
          "tex": "\\hat{a} = W_d f + b_d, \\quad f = \\mathrm{ReLU}(W_e(a - b_d)), \\quad \\mathcal{L} = \\lVert a - \\hat{a}\\rVert_2^2 + \\lambda \\lVert f \\rVert_1",
          "texNote": "Dictionary size is typically 8-64x the model dimension. The lambda trade-off is the whole game: too high and features die or reconstruction fails; too low and features stay polysemantic. There is no ground truth to validate against, which is the method's central weakness."
        }
      ],
      "code": [
        {
          "h": "Activation patching, end to end",
          "paras": [
            "The workhorse technique. Everything else in the field is a variation on 'change one thing inside the model and measure what happens to the output'."
          ],
          "code": "import torch\n\nclean = \"When Mary and John went to the store, John gave a drink to\"   # -> \" Mary\"\ncorr  = \"When Alice and John went to the store, John gave a drink to\"  # -> \" Alice\"\n\ndef metric(logits):\n    \"\"\"Logit DIFFERENCE, not accuracy - far more sensitive to partial effects.\"\"\"\n    return logits[0, -1, MARY] - logits[0, -1, ALICE]\n\n_, clean_cache = model.run_with_cache(clean)\nbaseline_corr  = metric(model(corr))\nbaseline_clean = metric(model(clean))\n\nresults = torch.zeros(n_layers, seq_len)\nfor layer in range(n_layers):\n    for pos in range(seq_len):\n        def patch(activation, hook):\n            activation[:, pos, :] = clean_cache[hook.name][:, pos, :]\n            return activation\n        patched = model.run_with_hooks(corr, fwd_hooks=[(f\"blocks.{layer}.hook_resid_post\", patch)])\n        results[layer, pos] = (metric(patched) - baseline_corr) / (baseline_clean - baseline_corr)\n\n# Reading the heatmap: bright cells are (layer, position) pairs where copying ONE\n# activation from the clean run restores the clean behaviour. In this IOI task the\n# signal concentrates on the subject-name positions in early-middle layers and\n# then at the final position in later layers - the information is moved forward,\n# not recomputed.\n#\n# WHY THIS BEATS PROBING: a probe says the name is DECODABLE at some layer. This\n# says the model's output DEPENDS on it there. Only the second is a claim about\n# the computation.",
          "caption": "Patching one activation from a clean run into a corrupted run and measuring recovery. Correlational methods tell you what is present; this tells you what is used."
        },
        {
          "h": "Where the field's confidence and its limits both come from",
          "paras": [
            "Two findings define the current state - one showing that circuits are real and legible, one showing that ablation-based evidence can mislead."
          ],
          "code": "# THE IOI CIRCUIT (Wang et al. 2022), GPT-2 small, indirect object identification.\n# A complete, human-legible algorithm found in 26 of 144 attention heads:\n#   DUPLICATE TOKEN HEADS  - notice \"John\" appears twice\n#   S-INHIBITION HEADS     - write a signal suppressing the repeated name\n#   NAME MOVER HEADS       - attend to names, copy the non-suppressed one out\n# That is a real algorithm, recovered from weights, and it predicts behaviour on\n# inputs never used to find it. Existence proof that circuits can be understood.\n\n# THE COMPLICATION FROM THE SAME PAPER - BACKUP NAME MOVER HEADS.\n# Ablate the name mover heads and performance drops far LESS than expected:\n# other heads that were doing little step in and take over the function.\n#\n#   ablate name movers .......... expected large drop, observed modest drop\n#   -> the naive conclusion \"these heads are not important\" is WRONG\n#\n# This is SELF-REPAIR, and it breaks the most common interpretability inference:\n# \"I ablated it and nothing happened, so it does not matter.\" The component\n# mattered; the network compensated. Ablation measures NECESSITY GIVEN THE REST\n# OF THE NETWORK ADAPTS - which is not the quantity you wanted.\n#\n# Practical consequences:\n#   * Prefer patching (measure what a component CONTRIBUTES) over ablation\n#     (measure what breaks when it is removed).\n#   * Test whole circuits, not single components.\n#   * Verify any claimed circuit on held-out inputs, not the ones that found it.",
          "caption": "The IOI circuit is the field's clearest success and its clearest warning: a legible algorithm across 26 heads, plus backup heads that make ablation evidence systematically misleading."
        }
      ],
      "useCases": [
        "Safety auditing: locating features and circuits associated with deception, sycophancy, or refusal behaviour, and testing whether they are causally involved rather than merely correlated - which is the only way to distinguish a model that is safe from one that is behaving safely on the evaluated distribution.",
        "Targeted model editing: ROME and MEMIT localize factual associations to specific mid-layer MLP weights and edit them directly, which is a genuinely different intervention from fine-tuning and comes with its own generalization and side-effect questions.",
        "Steering and control: clamping a sparse-autoencoder feature's activation changes behaviour in a specific, predictable direction - the Golden Gate Bridge demonstration - offering a control surface with finer granularity than prompting.",
        "Debugging unexpected behaviour: when a model fails in a specific way, activation patching can localize WHERE in the computation the failure occurs, which is more actionable than a benchmark score and occasionally identifies a data or tokenization problem rather than a model one."
      ],
      "pitfalls": [
        "Reading probe accuracy as evidence about the model's computation. A strong probe recovers almost anything from almost any representation. Report SELECTIVITY against a random-label control task, prefer linear probes, and remember that even perfect selectivity shows information is present, not that it is used.",
        "Inferring unimportance from ablation. Backup heads take over when primary components are removed, so 'I ablated it and nothing changed' is not evidence the component was irrelevant. Prefer patching, which measures contribution, over ablation, which measures necessity-given-compensation.",
        "Interpreting individual neurons. Superposition means a neuron is a projection of many features, so polysemanticity is the expected case rather than an anomaly. Neuron-level stories are usually cherry-picked from the small minority that happen to look clean.",
        "Trusting a circuit found and validated on the same inputs. A circuit is a hypothesis about the computation and must predict behaviour on held-out inputs, ideally including inputs constructed to break it if it is wrong.",
        "Treating sparse-autoencoder features as ground truth. There is no ground truth to validate against - the sparsity penalty, dictionary size, and training data all shape which features appear, and different runs give different decompositions. Feature interpretations are hypotheses, and the causal test (clamp it, see what changes) is what upgrades them to evidence.",
        "Generalizing from GPT-2 small. Most legible circuit work is on small models and narrow tasks; whether the same style of decomposition holds for frontier models on open-ended behaviour is genuinely unresolved and should not be assumed.",
        "Confusing an explanation that sounds satisfying with one that predicts. The check is always the same: does this account let you predict the model's behaviour on a new input you have not tried?"
      ],
      "connections": [
        {
          "ref": "advanced-nlp/cot",
          "text": "The faithfulness failure is exactly why this field exists - if self-report were reliable, causal interventions would be unnecessary."
        },
        {
          "ref": "advanced-nlp/bert",
          "text": "BERTology's probing results are the correlational ancestor of this work, and the control-task correction is what separates careful probing from the rest."
        },
        {
          "ref": "trustworthy-ai/probing-patching",
          "text": "The safety-facing treatment of the same toolkit - what causal localization buys you when the question is whether a model is deceptive rather than how it does arithmetic."
        },
        {
          "ref": "trustworthy-ai/superposition-sae",
          "text": "Superposition and dictionary learning in depth, including the scaling results and the open questions about feature validity."
        },
        {
          "ref": "transformers/multi-head-attention",
          "text": "Circuits are described in terms of heads and their QK/OV behaviour, so the mechanics of attention are the vocabulary this analysis is written in."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is mechanistic interpretability?",
          "a": "Reverse-engineering the algorithms a network implements from its weights and activations, rather than inferring from input-output behaviour or asking the model to explain itself."
        },
        {
          "q": "Why isn't probing enough?",
          "a": "It shows information is DECODABLE, not that the model uses it - and a strong enough probe recovers almost anything from almost any representation, including random vectors."
        },
        {
          "q": "What is a control task?",
          "a": "The same probing setup with RANDOM labels. Report SELECTIVITY = real accuracy minus control accuracy; high accuracy on both means the probe memorized rather than read."
        },
        {
          "q": "What is activation patching?",
          "a": "Copy one activation from a clean run into a corrupted run and measure how much the output recovers. It measures CAUSAL contribution rather than correlation."
        },
        {
          "q": "Why use logit difference rather than accuracy as the metric?",
          "a": "It is continuous and far more sensitive to partial effects - accuracy only moves when a patch flips the argmax, which loses most of the signal."
        },
        {
          "q": "What is superposition?",
          "a": "Representing more features than there are dimensions by assigning near-orthogonal directions, tolerable because only a few features are active at once. The number of such directions grows exponentially in d."
        },
        {
          "q": "What is polysemanticity?",
          "a": "A single neuron responding to several unrelated concepts - the direct consequence of superposition, and the reason neuron-level interpretation was always going to fail."
        },
        {
          "q": "What is a sparse autoencoder here?",
          "a": "An overcomplete autoencoder (8-64x the model dimension) with an L1 penalty, trained to reconstruct activations sparsely. It decomposes superposed activations into more monosemantic features."
        },
        {
          "q": "What are induction heads?",
          "a": "Heads implementing 'find the previous occurrence of the current token and copy what followed'. They form abruptly during training, coinciding with in-context learning appearing."
        },
        {
          "q": "What is the IOI circuit?",
          "a": "A complete legible algorithm for indirect object identification in GPT-2 small: duplicate-token heads, S-inhibition heads, and name-mover heads - 26 of 144 heads, recovered from weights."
        },
        {
          "q": "What are backup name mover heads?",
          "a": "Heads that take over when the primary name movers are ablated. They mean ablation UNDERSTATES importance, breaking the inference 'nothing changed, so it did not matter'."
        },
        {
          "q": "What is ROME?",
          "a": "Rank-One Model Editing: causal tracing localizes a factual association to specific mid-layer MLP weights, then a rank-one update edits it directly - a targeted alternative to fine-tuning."
        }
      ],
      "standard": [
        {
          "q": "Explain the difference between correlational and causal interpretability methods.",
          "a": "THE DISTINCTION IS THE FIELD'S CENTRAL METHODOLOGICAL COMMITMENT, and it is what separates modern mechanistic work from a decade of earlier interpretability. CORRELATIONAL METHODS observe what a representation CONTAINS. PROBING: train a classifier on frozen activations to predict some property; if it succeeds, the property is decodable. ATTENTION VISUALIZATION: look at where heads attend and narrate a story. NEURON MAXIMUM ACTIVATION: find the inputs that most excite a neuron and describe the pattern. FEATURE ATTRIBUTION (gradients, integrated gradients, SHAP): assign importance to inputs. All of these are OBSERVATIONS about a forward pass. THE THREE PROBLEMS WITH THEM. (1) PRESENCE IS NOT USE. A probe recovering part-of-speech from layer 6 shows the information survives to layer 6; it says nothing about whether any downstream computation reads it. The model may encode it incidentally. (2) PROBE CAPACITY CONFOUNDS EVERYTHING. A sufficiently expressive probe extracts almost anything from almost any representation - random vectors included, given enough dimensions and data. Hewitt & Liang's control-task correction is the response: construct the same task with random labels and report SELECTIVITY. A linear probe at 90% real and 20% control is informative; an MLP probe at 95% and 90% memorized. This single correction invalidated a substantial amount of earlier probing literature. (3) ATTENTION IS NOT EXPLANATION. Jain & Wallace showed you can often find very different attention distributions producing the same output, so 'this head attends to the object' is a much weaker claim than it sounds. CAUSAL METHODS intervene and measure the effect on the output. ABLATION: remove a component (zero it, mean-ablate it, or resample it) and see what breaks. ACTIVATION PATCHING: run clean and corrupted inputs, copy an activation from one into the other, and measure how much the behaviour recovers. PATH PATCHING: patch along specific paths between components to isolate which connections carry the effect. CAUSAL SCRUBBING: state a hypothesis about the circuit as a set of permitted resamplings, and check whether the behaviour survives them - a much stricter test. STEERING: add a feature direction to the residual stream and observe the behavioural change. WHY THESE ARE BETTER. They test COUNTERFACTUALS - what would the output be if this component computed something else - which is exactly the question 'does the model use this' asks. Patching in particular gives a graded, comparable effect size, and it can be run over every layer and position to produce a map of where the relevant information lives. THE SUBTLETY THAT MATTERS, and which distinguishes someone who has run these experiments from someone who has read about them: ABLATION AND PATCHING MEASURE DIFFERENT THINGS. Ablation asks 'what breaks if this is removed', which the network can compensate for - backup name movers in the IOI circuit take over when the primary heads are ablated, so ablation systematically UNDERSTATES importance. Patching asks 'how much does this contribute when everything else is held at the corrupted baseline', which does not permit compensation. When they disagree, the disagreement is informative: it means the network has redundancy, which is itself a finding about the architecture. Also: the CHOICE OF CORRUPTED INPUT defines what you are measuring. A corrupted input differing in one name isolates name-related computation; one differing in topic isolates something else. There is no neutral baseline, and zero-ablation in particular is often badly off-distribution - the model is being fed activations it would never produce - which makes mean-ablation or resample-ablation the better default. THE SHORT VERSION I would give: correlational methods generate hypotheses cheaply, causal methods test them. Use the first to find where to look and the second to make any claim you intend to defend."
        },
        {
          "q": "What is superposition, and why does it make interpretability hard?",
          "a": "THE PUZZLE IT SOLVES. Language models appear to represent far more distinct concepts than they have neurons. A 768-dimensional residual stream cannot give an orthogonal direction to every entity, syntactic relation, topic, and stylistic property the model clearly distinguishes. Superposition is the answer: represent m >> d features as NEAR-orthogonal directions in d dimensions, accepting small interference. WHY IT WORKS. Two facts combine. (1) The Johnson-Lindenstrauss lemma: the number of nearly-orthogonal directions in d dimensions grows EXPONENTIALLY in d, so 768 dimensions can host astronomically many directions with small pairwise overlap. (2) FEATURE SPARSITY: at any given token only a few features are active. If features never co-occur, their interference never materializes. So the model trades a small, rarely-realized interference cost for a large increase in representable features, and Elhage et al.'s toy models show this is exactly what optimization does - as feature sparsity increases, models transition from dedicating one dimension per feature to packing many in superposition, and they do it in structured geometric arrangements (antipodal pairs, pentagons, tetrahedra) depending on the sparsity level. WHY IT MAKES INTERPRETABILITY HARD. (1) POLYSEMANTIC NEURONS. Each neuron is a projection of the superposed representation, so it responds to several unrelated features - academic citations and Korean text and DNA sequences in the classic example. Interpreting individual neurons is therefore not just difficult but misconceived; the neuron is not the unit of representation. (2) THE PRIVILEGED BASIS IS GONE, at least in the residual stream. There is no reason for features to align with coordinate axes, so looking at dimensions is arbitrary. (Nonlinearities give MLP neurons a partially privileged basis, which is why they are somewhat more interpretable than residual-stream directions, but only partially.) (3) FEATURES INTERFERE, so a strong activation of one slightly activates others, producing behaviour that looks like a bug and is actually the cost of the encoding. (4) IT MAY EXPLAIN ADVERSARIAL VULNERABILITY - a perturbation aligned with the interference between features can flip predictions cheaply. (5) THE NUMBER OF FEATURES IS UNKNOWN and possibly enormous, so 'enumerate what the model represents' is not obviously a finite project. THE RESPONSE - SPARSE AUTOENCODERS. Since the problem is too many features in too few dimensions, project UP into a much wider space with a sparsity constraint. Train an autoencoder whose hidden layer is 8-64x the model dimension, with an L1 penalty forcing few features active per token, to reconstruct the activations. The learned dictionary directions are substantially more monosemantic than neurons, and the technique scaled: Anthropic extracted millions of features from Claude 3 Sonnet, including abstract and multilingual ones, and demonstrated causality by CLAMPING a feature - the Golden Gate Bridge feature, held high, made the model relate everything to the bridge. That clamping result is the important part, because it converts 'this direction correlates with the bridge' into 'this direction causes bridge-related behaviour'. THE OPEN PROBLEMS, which I would be careful to state. There is NO GROUND TRUTH for what the right features are, so the sparsity coefficient, dictionary width, and training distribution all shape the answer and different runs give different decompositions. FEATURE SPLITTING: increase the dictionary size and one feature resolves into several finer ones, with no principled stopping point - which suggests 'the' feature set may not be well-defined. DEAD FEATURES and reconstruction error mean the decomposition is incomplete. And crucially, features are only half the picture: understanding a model requires the CIRCUITS connecting them, and circuit-finding over millions of features is a much harder problem than finding the features was. Superposition explains why a decade of neuron-level interpretability produced so little, and sparse autoencoders are the most promising response - but 'promising response to the obstacle' is a fair characterization of where things stand, not 'solved'.",
          "deepDive": {
            "q": "What are the strongest results in mechanistic interpretability, and what are its real limitations?",
            "a": "THE STRONGEST RESULTS, in rough order of how much they establish. (1) INDUCTION HEADS (Olsson et al.). Attention heads implementing 'find where this token appeared before and predict what followed it', built from a two-head composition: a previous-token head writes information forward, and the induction head uses it to attend back. What makes this the field's best result is the convergence of evidence: the mechanism is understood at the level of QK and OV circuits, the heads FORM ABRUPTLY during training at a visible bump in the loss curve, in-context learning ability appears at exactly that point, and ablating them damages ICL. Mechanism, formation dynamics, and behavioural correlate all line up. (2) THE IOI CIRCUIT (Wang et al.). A complete, human-legible algorithm for indirect object identification in GPT-2 small, spanning 26 of 144 heads with distinct roles - duplicate-token detection, S-inhibition, name-moving - validated by patching and by predicting behaviour on new inputs. It is the existence proof that a nontrivial circuit can be fully recovered. (3) ROME AND CAUSAL TRACING (Meng et al.). Factual associations localized to specific mid-layer MLPs, then EDITED with a rank-one weight update that changes the fact while mostly preserving unrelated behaviour. Localization plus successful targeted intervention is a strong combination. (4) SPARSE AUTOENCODERS AT SCALE (Bricken et al., Templeton et al.). Millions of interpretable features from a production model, with causal validation by clamping. (5) GROKKING'S MODULAR ARITHMETIC CIRCUIT (Nanda et al.) - a network trained on modular addition was shown to implement a Fourier-basis trigonometric algorithm, fully reverse-engineered, with the phase transition in generalization explained mechanistically. Small and synthetic, but complete in a way nothing on real models is. THE LIMITATIONS, stated honestly. (1) SCALE. Almost all complete circuit analyses are on small models and NARROW, well-specified tasks. IOI is a two-name template. Nothing comparable exists for 'why did the model refuse this request' on a frontier model, and it is not clear the same style of analysis will work - the behaviours of interest may not decompose into small circuits. (2) LABOUR INTENSITY. IOI took months of expert effort for one task in one small model. Automating circuit discovery (ACDC and successors) is active work and not yet at the point of replacing that effort. (3) NO GROUND TRUTH. There is no way to check whether an SAE's features are the 'right' ones, or whether a circuit is complete rather than a legible fragment of something larger. The field's answer is causal validation and prediction on held-out inputs, which is good discipline but not verification. (4) SELF-REPAIR AND REDUNDANCY. Backup heads mean components compensate for one another, so ablation understates importance and circuits are not cleanly modular. This is a fact about how networks are organized and it directly complicates the enterprise. (5) CHERRY-PICKING RISK. Published examples are the ones that turned out legible. The base rate of components that resist interpretation is not usually reported, and it matters enormously for whether the approach generalizes. (6) INTERPRETABILITY ILLUSIONS. A clean story can be wrong - a plausible narrative that fails to predict behaviour on new inputs. The discipline that guards against this is prediction, not plausibility. (7) FEATURE SPLITTING undermines the idea of a canonical feature set. WHERE I THINK IT ACTUALLY STANDS. The field has established that transformers contain real, discoverable, causally-implicated structure, and that is a genuine and non-obvious scientific result - it was not clear a decade ago that these models were anything other than inscrutable. The tools are sound: patching, path patching, causal scrubbing, and dictionary learning are principled and they work. What has not been established is that a complete understanding of a frontier model on open-ended behaviour is achievable, and the honest position is that this is an open empirical question rather than a matter of remaining effort. FOR PRACTITIONERS, the sober summary: this is not yet a debugging tool you reach for when your fine-tune misbehaves. Its value today is in safety-relevant auditing at labs with the resources to do it, in model editing, in steering via SAE features, and in the general epistemic discipline it enforces - causal evidence over correlational, prediction over plausible narrative. That discipline is worth importing into ordinary ML work even if you never patch an activation."
          }
        },
        {
          "q": "How would you investigate whether a model is using a spurious feature to make its decisions?",
          "a": "I WOULD RUN A LADDER FROM CHEAP BEHAVIOURAL TESTS TO EXPENSIVE MECHANISTIC ONES, and stop as soon as I have an answer, because the behavioural tests usually suffice and the mechanistic ones are expensive. LEVEL 1 - INPUT ABLATION. Remove the suspected feature from the input and measure the change. If performance is unaffected by deleting the thing you thought mattered, or barely drops when you delete everything EXCEPT the suspected shortcut, you have your answer immediately. This is the hypothesis-only baseline from NLI, generalized, and it costs one training or evaluation run. LEVEL 2 - COUNTERFACTUAL INPUTS. Construct minimal pairs where the spurious feature and the true label DISAGREE - the HANS construction. If accuracy collapses on those cases while remaining high on the aligned ones, the model is following the shortcut. This is the strongest behavioural evidence available and it requires no model internals, which makes it usable on APIs. LEVEL 3 - TRAINING-DATA ANALYSIS. Measure the actual correlation between the suspected feature and the label in the training set, via PMI or a simple predictive model. If it is strong, the shortcut is available and you should assume it was used; if it is weak, look elsewhere. This tells you whether your hypothesis is even plausible before you spend effort testing it. LEVEL 4 - PROBING, with the control-task correction. Train a linear probe to predict the spurious feature from intermediate representations, and report selectivity against a random-label control. This tells you the feature is ENCODED, which is necessary but not sufficient for it being used - and it tells you WHERE, which directs the causal work. LEVEL 5 - CAUSAL INTERVENTION, which is where you get a real answer about the mechanism. ACTIVATION PATCHING with a clean/corrupted pair differing only in the spurious feature: if patching a small number of components flips the output, those components are carrying it. Then DIRECTIONAL ABLATION - find the direction encoding the feature (a probe's weight vector works), project it out of the residual stream, and re-run. If behaviour changes, the model was reading that direction; if it does not, either the feature is represented elsewhere or it was not being used. This is a genuinely informative experiment and it is not expensive on a mid-sized model. LEVEL 6 - SPARSE AUTOENCODER FEATURES, if you have them: find the feature corresponding to the spurious property, clamp it to zero or to a high value, and observe the behavioural change. The cleanest intervention available, and the least available in practice. WHAT I WOULD DO WITH THE ANSWER. If the model IS using the shortcut: the fixes are the ones from the debiasing literature - counterexample augmentation (most reliable), product-of-experts training against a bias-only model, example reweighting, or directional ablation applied at inference as a runtime intervention. All of them cost in-distribution accuracy, because the shortcut is genuinely predictive in-distribution, and that trade should be stated rather than discovered. If it is NOT using the shortcut, that is a real and reportable finding, and it means my error analysis should look elsewhere. THE THING I WOULD EMPHASIZE: levels 1-3 are cheap, fast, and answer the practical question - is my model relying on something it should not - well enough to act on. Levels 4-6 answer the mechanistic question, which matters when you need to INTERVENE surgically, when you are auditing for safety and need to know the mechanism rather than the symptom, or when the behavioural tests are ambiguous. Reaching for activation patching before running an input ablation is a common enthusiasm error, and the ablation would usually have settled it in an hour."
        },
        {
          "q": "What are induction heads and why are they considered the field's clearest result?",
          "a": "THE MECHANISM. An induction head implements a pattern-completion rule: given a sequence containing [A][B] earlier and [A] again now, predict [B]. Concretely, in '...the cat sat on the mat... the cat', an induction head attending from the second 'cat' finds the earlier occurrence and copies what followed it. HOW IT IS BUILT, which is the part worth knowing precisely because it shows genuine compositional structure. It requires TWO heads in different layers working together. First, a PREVIOUS-TOKEN HEAD in an early layer attends from each position to the one before it and writes information about the previous token into the current residual stream. Then the INDUCTION HEAD in a later layer uses that: its query at the current token matches against keys that now contain 'the token before me was A', so it attends to the position FOLLOWING the earlier A, and its OV circuit copies that token to the output. The composition is the point - the second head can only work because the first one restructured the information, and this is what 'circuit' means in this field. WHY IT IS THE CLEAREST RESULT - the evidence converges from four directions, which is rare. (1) MECHANISTIC UNDERSTANDING: the QK circuit (what it attends to) and the OV circuit (what it writes) are both characterized, so the algorithm is specified rather than described. (2) FORMATION DYNAMICS: induction heads appear ABRUPTLY during training, and the moment they form is visible as a bump or kink in the loss curve. You can watch the circuit come into existence. (3) BEHAVIOURAL CORRELATE: in-context learning ability appears at the same moment. A capability and a mechanism arriving together is much stronger evidence than either alone. (4) CAUSAL VALIDATION: ablating induction heads damages in-context learning. (5) UNIVERSALITY: they are found across model sizes and architectures, so this is not an idiosyncrasy of one checkpoint - which addresses the cherry-picking worry directly. WHAT THEY EXPLAIN, and where the claim should be limited. They provide a concrete mechanism for the simplest form of in-context learning - copying and pattern completion from the context - and Olsson et al. argue they generalize to fuzzier matching, completing [A*][B*] for tokens SIMILAR to A and B rather than identical, which reaches toward genuine analogical behaviour. But they clearly do not explain all of in-context learning: learning a novel input-output mapping from demonstrations involves more than copy-completion, and the relative contribution of induction heads to few-shot task performance in large models is not settled. Overclaiming here is common and I would avoid it. WHY IT MATTERS BEYOND ITSELF. (1) It is the existence proof that a specific, nontrivial capability can be traced to a specific, understandable circuit - which was not obvious and is the premise the field rests on. (2) It links TRAINING DYNAMICS to CAPABILITY EMERGENCE, giving a concrete mechanism for a phase transition, which bears directly on the emergence debate. (3) It demonstrates COMPOSITIONALITY: capabilities are built from simpler components across layers, which is what makes circuit analysis a coherent research programme rather than a description of individual heads. (4) Methodologically, it set the template - propose a mechanism, verify with causal interventions, check universality across models, connect to behaviour - and that template is what most subsequent work follows. THE HONEST CAVEAT I would attach: this is still a relatively simple mechanism found in relatively small models. It is the clearest result partly because copy-completion is a simple enough function to fully characterize. Whether the same clarity is attainable for the behaviours people most want to understand - deception, sycophancy, refusal, reasoning - is exactly the open question, and the induction-head result does not settle it."
        },
        {
          "q": "Should a production ML team invest in interpretability? Make the case both ways.",
          "a": "THE CASE AGAINST, taken seriously first, because for most teams it is currently the stronger case. (1) IT IS NOT YET A DEBUGGING TOOL. When your classifier underperforms, the answer is almost always in the DATA - label noise, distribution shift, leakage, a broken preprocessing step - and error analysis on a hundred examples finds it faster than any activation study. Mechanistic interpretability has essentially no track record of fixing ordinary production bugs. (2) THE EXPERTISE IS SCARCE AND SPECIALIZED, and someone spending months on circuit analysis is not spending them on data quality or evaluation, which have far better expected return. (3) THE RESULTS DO NOT TRANSFER READILY. Findings are model-specific and often checkpoint-specific; fine-tune the model and your analysis may not hold. (4) SIMPLER TOOLS OFTEN SUFFICE for the practical questions. Want to know if the model uses a spurious feature? Ablate it from the input. Want to know where it fails? Build a challenge set. Both are hours of work with clear answers. (5) THE SCALE PROBLEM IS REAL: complete analyses exist for small models on narrow tasks, and your production system is probably neither. THE CASE FOR, which is strong in specific situations. (1) HIGH-STAKES DEPLOYMENTS WHERE BEHAVIOURAL TESTING IS INSUFFICIENT. If your model must not exhibit a behaviour, behavioural evaluation can only show it did not exhibit it on the distribution you tested. Causal localization can tell you whether the capability is present and what triggers it - which is a different and stronger claim. This is precisely why frontier labs invest in it. (2) TARGETED INTERVENTION. Model editing (ROME/MEMIT) and SAE-based steering give control surfaces that fine-tuning and prompting do not - changing one fact or one behavioural tendency without a training run and without the collateral changes fine-tuning brings. (3) REGULATORY AND AUDIT REQUIREMENTS, where 'the model performs well on our test set' is increasingly not an acceptable answer and post-hoc narration (chain of thought) has been shown unfaithful. (4) UNDERSTANDING A FAILURE YOU CANNOT REPRODUCE BEHAVIOURALLY - occasionally the fastest path to a rare, weird failure is looking at where the computation diverges. (5) THE EPISTEMIC DISCIPLINE TRANSFERS EVEN IF THE TECHNIQUES DO NOT. Control tasks for probes, causal rather than correlational evidence, validating hypotheses on held-out inputs, distrusting plausible narratives - these habits improve ordinary ML work, and they are cheap to adopt. WHAT I WOULD ACTUALLY RECOMMEND, as a graded answer rather than a yes or no. For a typical product team: invest in EVALUATION, error analysis, and data quality first, and adopt the epistemic standards without the tooling. Learn input ablation and counterfactual construction, which are the interpretability techniques with the best cost-benefit ratio by a wide margin and require no internals access. For a team deploying models in a regulated or high-stakes domain: add probing with control tasks and activation patching for the specific behaviours you must guarantee, and budget real time for it. For a team building or heavily adapting frontier models: this is core safety infrastructure and should be resourced accordingly. AND THE TRAJECTORY, which affects the answer over a two-year horizon: SAE-based tooling is becoming more usable, automated circuit discovery is improving, and open-source interpretability libraries have lowered the entry cost substantially. The barrier is falling, so 'not yet' is a more accurate answer than 'no'. The thing I would push back on either way is the middle position of running attention visualizations and calling it interpretability - that is the one option with the costs of both approaches and the benefits of neither."
        },
        {
          "q": "How does interpretability connect to AI safety, and what would it need to deliver?",
          "a": "THE SAFETY ARGUMENT, stated plainly. Behavioural evaluation can only tell you what a model DID on the inputs you tried. It cannot tell you what it WOULD do on inputs you did not think of, and it cannot distinguish a model that is safe from a model that behaves safely under evaluation. If a model's disposition differed between evaluated and unevaluated conditions - whether through deliberate strategy or, far more mundanely, through distribution-dependent behaviour - behavioural testing would not reveal it. Interpretability is the only proposed approach that inspects the mechanism rather than the output, which is why it is treated as core safety infrastructure rather than as a scientific curiosity. WHAT IT WOULD NEED TO DELIVER, roughly in order of ambition. (1) DETECTING DECEPTION AND STRATEGIC BEHAVIOUR - features or circuits that activate when a model is representing something it will not say, or is modelling its evaluator. Early work exists on 'truthfulness directions' and on lie detection from activations, and it is genuinely promising and genuinely preliminary. This is the flagship application. (2) EVALUATION AWARENESS - can you tell from internals whether the model has represented 'this is a test'? Directly relevant to whether any behavioural evaluation is trustworthy, and a concrete near-term target. (3) CAPABILITY AUDITING - determining whether a dangerous capability is present but not elicited, which behavioural red-teaming cannot establish (failure to elicit is weak evidence of absence). (4) MONITORING AT RUNTIME - detecting concerning internal states during deployment rather than filtering outputs, which is more robust because it does not depend on the harm being visible in the text. (5) TARGETED REMOVAL - editing out a capability or disposition rather than suppressing its expression through training, which is what current safety fine-tuning does and which is known to be shallow and jailbreakable. (6) VERIFICATION - the far end: a positive argument that a model does not implement a class of behaviour, rather than an absence of evidence that it does. WHERE IT ACTUALLY IS. Sparse autoencoders extract interpretable features from production models at scale and those features are causally real, which is a substantial result. Steering works. Simple deception-detection probes show signal. Circuits for narrow capabilities have been fully mapped. That is real progress and more than existed three years ago. WHAT IS MISSING, honestly. Complete understanding of a frontier model on open-ended behaviour does not exist and there is no clear path to it. Coverage is unknown - you find features you look for, and there is no way to enumerate what you missed. Everything is model-specific, so results do not transfer across a version bump. There is no ground truth, so validation rests on causal intervention and prediction rather than verification. And the field is small relative to capability research, which is a resourcing fact worth naming. THE ARGUMENTS I FIND MOST INTERESTING, on both sides. FOR: interpretability is the only approach that could give POSITIVE assurance rather than absence of negative evidence, and every other safety method - RLHF, red-teaming, constitutional training - operates on behaviour and therefore inherits the fundamental limitation. AGAINST, or at least tempering: it may not scale, and betting safety on an unsolved research problem is risky; models may not decompose into human-legible concepts at all, in which case the enterprise fails on its premise rather than on effort; and there is a dual-use concern, since understanding a mechanism well enough to remove a capability is understanding it well enough to enhance one. MY POSITION, for what it is worth in an interview: interpretability is necessary but not sufficient. It should be pursued vigorously because it is the only line of attack on the verification problem, and it should not be relied upon exclusively, because it may not arrive in time or at all. The practical near-term contribution is more modest and more certain than the long-term one: better evaluation, better auditing tools, and an epistemic standard - causal evidence over plausible narrative - that the whole field benefits from adopting."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Mechanistic interpretability",
        "back": "Reverse-engineering the algorithms a network implements from weights and activations - not inferring from behaviour, and not asking the model to explain itself (chain of thought is unfaithful)."
      },
      {
        "type": "pitfall",
        "front": "Probing shows presence, not use",
        "back": "A strong probe recovers almost anything from almost any representation. Report SELECTIVITY = real-task accuracy minus random-label control accuracy, and prefer LINEAR probes so accuracy means something."
      },
      {
        "type": "definition",
        "front": "Activation patching",
        "back": "Copy one activation from a CLEAN run into a CORRUPTED run and measure output recovery, normalized between the two baselines. Measures causal contribution. Use LOGIT DIFFERENCE as the metric - accuracy only moves when the argmax flips."
      },
      {
        "type": "pitfall",
        "front": "Ablation understates importance",
        "back": "Backup name mover heads take over when the primaries are ablated, so 'I removed it and nothing changed' is not evidence of irrelevance. Ablation measures necessity-given-compensation; patching measures contribution. Prefer patching."
      },
      {
        "type": "definition",
        "front": "Superposition",
        "back": "Representing m >> d features as near-orthogonal directions in d dimensions, viable because features are SPARSE (few active at once). Johnson-Lindenstrauss: near-orthogonal directions grow exponentially in d."
      },
      {
        "type": "intuition",
        "front": "Why neurons are not interpretable",
        "back": "Superposition makes each neuron a projection of many features, so polysemanticity is the EXPECTED case. Neuron-level stories are usually cherry-picked from the minority that happen to look clean."
      },
      {
        "type": "definition",
        "front": "Sparse autoencoders",
        "back": "Overcomplete autoencoder (8-64x model dimension) with an L1 sparsity penalty, trained to reconstruct activations. Undoes superposition by moving to a wider, sparser space. Validated causally by CLAMPING a feature (the Golden Gate Bridge result)."
      },
      {
        "type": "definition",
        "front": "Induction heads",
        "back": "Two-head composition: a previous-token head writes 'the token before me was A' forward; the induction head uses it to attend after the earlier A and copy what followed. Form ABRUPTLY at a visible loss-curve bump, exactly when in-context learning appears."
      },
      {
        "type": "definition",
        "front": "The IOI circuit",
        "back": "GPT-2 small's indirect-object algorithm: duplicate-token heads notice the repeat, S-inhibition heads suppress it, name-mover heads copy the survivor. 26 of 144 heads, fully legible - the field's existence proof."
      },
      {
        "type": "pitfall",
        "front": "SAE features have no ground truth",
        "back": "The sparsity coefficient, dictionary width, and training data all shape which features appear; different runs differ; FEATURE SPLITTING means a bigger dictionary resolves one feature into several with no principled stopping point."
      },
      {
        "type": "definition",
        "front": "ROME / causal tracing",
        "back": "Localize a factual association to specific mid-layer MLP weights via patching, then apply a rank-one weight edit to change it. Localization plus successful targeted intervention - a real alternative to fine-tuning."
      },
      {
        "type": "intuition",
        "front": "The test for any interpretability claim",
        "back": "Does the account PREDICT behaviour on inputs you did not use to find it? A satisfying story that fails held-out prediction is an interpretability illusion - plausibility is not evidence."
      }
    ],
    "refs": [
      {
        "title": "Olsson et al. (2022), In-context Learning and Induction Heads",
        "url": "https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html"
      },
      {
        "title": "Wang et al. (2022), Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small",
        "url": "https://arxiv.org/abs/2211.00593"
      },
      {
        "title": "Elhage et al. (2022), Toy Models of Superposition",
        "url": "https://transformer-circuits.pub/2022/toy_model/index.html"
      },
      {
        "title": "Templeton et al. (2024), Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet",
        "url": "https://transformer-circuits.pub/2024/scaling-monosemanticity/"
      },
      {
        "title": "Hewitt & Liang (2019), Designing and Interpreting Probes with Control Tasks",
        "url": "https://arxiv.org/abs/1909.03368"
      },
      {
        "title": "Meng et al. (2022), Locating and Editing Factual Associations in GPT (ROME)",
        "url": "https://arxiv.org/abs/2202.05262"
      }
    ],
    "demos": [
      "activation-patching",
      "sparse-autoencoder",
      "superposition",
      "probing-classifier"
    ],
    "demoTitles": {
      "activation-patching": "Activation Patching (Causal Tracing)",
      "sparse-autoencoder": "Sparse Autoencoders (Superposition)",
      "superposition": "Toy Model of Superposition",
      "probing-classifier": "Linear Probing by Layer"
    }
  }
};
