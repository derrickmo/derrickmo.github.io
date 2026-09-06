// GENERATED from content/lessons/multimodal/multimodal-eval.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/multimodal-eval/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "multimodal-eval": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This module has produced the same finding four times in four settings. VQA models answered from question priors without looking. Multimodal classifiers underperformed their best unimodal branch because one modality crowded out the other. VLMs described objects that merely CO-OCCUR with what was present. And CLIP behaves like a bag of concepts, failing on word order that changes the meaning. In every case the aggregate metric on an i.i.d. test set looked fine and could not have revealed the problem, because the shortcut works on the test set for exactly the reason it works in training.",
        "So the central discipline of multimodal evaluation is not a metric, it is a set of ABLATIONS AND CONSTRUCTED TESTS. Drop each modality and measure what survives. Feed mismatched pairs and measure the drop. Build cases where the shortcut and the task disagree. Perturb the input in a way that should change the answer and check whether it does. Each of these costs a training run or an afternoon, and each answers a question no accuracy number can.",
        "The best cautionary tale in the area is what happened to the benchmarks built to do exactly this. ARO and VL-Checklist test compositional understanding by pairing an image with a correct caption and a procedurally-generated hard negative - swapped word order, altered relations. Models scored near chance, which was reported as evidence they lack compositionality. Then SugarCrepe showed the negatives were themselves detectable BY A TEXT-ONLY MODEL: the procedural generation produced negatives that were less fluent or less plausible as English, so a blind language model could pick the correct caption without seeing the image at all. The benchmark built to expose a shortcut contained a shortcut. That is not an embarrassment to avoid mentioning - it is the strongest possible argument for the discipline this lesson is about, applied recursively to your own diagnostics."
      ],
      "math": [
        {
          "h": "Retrieval metrics, and what they assume",
          "paras": [
            "Recall@K is the standard for cross-modal retrieval: what fraction of queries have their correct match in the top K. It assumes the annotation is COMPLETE - that anything not labelled as a match is genuinely a non-match - and for image-caption data that assumption is badly false."
          ],
          "tex": "R@K = \\frac{1}{|Q|}\\sum_{q \\in Q} \\mathbb{1}\\big[\\mathrm{rank}(q, g_q) \\le K\\big], \\qquad \\text{assumes } |\\{\\text{correct matches}\\}| = 1",
          "texNote": "COCO pairs each image with five captions, so a retrieved caption that genuinely describes the image but was written for a DIFFERENT image counts as an error. Re-annotation efforts found a large fraction of 'incorrect' retrievals are actually correct - so reported R@1 substantially understates real performance and the ranking between models can change."
        },
        {
          "h": "CLIPScore and the modality gap",
          "paras": [
            "A reference-free image-text agreement score. It ranks well and thresholds badly, because the two modalities occupy separate cones and the absolute value has no scale."
          ],
          "tex": "\\mathrm{CLIPScore}(c, v) = w \\cdot \\max\\big(0,\\; \\cos(f_T(c),\\, f_I(v))\\big), \\qquad w = 2.5 \\text{ (rescaling only)}",
          "texNote": "The 2.5 is a cosmetic rescaling to spread values into a friendlier range; it adds no information. Matched image-caption cosine is ~0.3 while image-image is ~0.6, so a 'low' score of 0.28 may be perfectly good. Compare like with like, and rank rather than threshold."
        },
        {
          "h": "The unimodal ablation, stated generally",
          "paras": [
            "The single most informative experiment in multimodal ML, and it applies to any task with structured input. Whatever a partial-input model reaches is achievable WITHOUT the missing part."
          ],
          "tex": "\\Delta_{\\text{modality}} = \\mathrm{Acc}\\big(p(y \\mid x_1, x_2)\\big) - \\max_i \\mathrm{Acc}\\big(p(y \\mid x_i)\\big)",
          "texNote": "If this is near zero, the second modality contributes nothing measurable. If it is NEGATIVE - which happens routinely - the fusion actively harmed the model. Report it in the results table, not the appendix."
        }
      ],
      "code": [
        {
          "h": "The evaluation table that should replace a single number",
          "paras": [
            "Five rows that between them answer 'is this model using both modalities, and is it using them for the right reasons'. None of these is exotic and all of them are routinely omitted."
          ],
          "code": "results = {\n    # 1. UNIMODAL ABLATIONS - retrain with one modality removed\n    \"modality A only\":      train_and_eval(drop=\"B\"),\n    \"modality B only\":      train_and_eval(drop=\"A\"),\n    \"full model\":           train_and_eval(drop=None),\n\n    # 2. MODALITY CORRUPTION - no retraining, on the trained model\n    \"full, B blanked\":      eval(model, corrupt=\"blank_B\"),\n    \"full, B mismatched\":   eval(model, corrupt=\"shuffle_B\"),\n\n    # 3. SHIFTED SPLIT - where the shortcut and the task disagree\n    \"shifted priors\":       eval(model, split=\"cp\"),\n\n    # 4. COUNTERFACTUAL CONSISTENCY - perturb so the answer MUST change\n    \"counterfactual pairs\": eval_consistency(model, pairs),\n\n    # 5. PER-SLICE - by class, by condition, by group\n    \"worst slice\":          min(eval_by_slice(model).values()),\n}\n\n# The SHAPE of this table is the result. Two models both reporting 70%:\n#\n#   model   full  A-only  B-only  B-blanked  shifted  counterfactual\n#   X ...... 70%    65%     31%      69%       42%         0.21\n#   Y ...... 70%    48%     44%      52%       64%         0.58\n#\n# X is functionally unimodal: dropping modality B costs one point, and it\n# collapses under a prior shift. Y genuinely integrates both. A single\n# accuracy number reports these as identical models.\n#\n# COUNTERFACTUAL CONSISTENCY is the strictest and most informative: the\n# fraction of perturbation pairs where the model's answer changes CORRECTLY\n# when the input changes in a way that must change the answer. Per-example\n# accuracy can be high while consistency is near zero.",
          "caption": "Two models at identical accuracy, one functionally unimodal and one genuinely integrating. The single number reports them as the same, and every row that distinguishes them is cheap to produce."
        },
        {
          "h": "SugarCrepe: when the benchmark for shortcuts has a shortcut",
          "paras": [
            "The recursive version of this module's lesson, and the reason to run your ablations on your own diagnostic sets too."
          ],
          "code": "# ARO and VL-Checklist test COMPOSITIONALITY: pair an image with the correct\n# caption and a procedurally-generated hard negative.\n#   correct:  \"the horse is eating the grass\"\n#   negative: \"the grass is eating the horse\"     (swapped)\n# Models scored NEAR CHANCE -> reported as evidence CLIP lacks compositional\n# understanding.\n#\n# SUGARCREPE'S FINDING (Hsieh et al. 2023): run a TEXT-ONLY language model\n# on the two captions, with NO IMAGE, and pick the more probable one.\n#\n#   benchmark        blind text-only model      \"should\" be 50%\n#   ARO (relation) ........ ~83%\n#   ARO (attribute) ....... ~87%\n#   VL-Checklist .......... high\n#\n# The procedurally-generated negatives were less FLUENT and less PLAUSIBLE\n# as English - \"the grass is eating the horse\" is not merely wrong about the\n# image, it is unlikely as a sentence. So a model could score well by being\n# a good language model, and score badly by NOT being one. The benchmark was\n# partly measuring text plausibility, not vision-language grounding.\n#\n# SUGARCREPE'S FIX: generate negatives with an LLM so they are fluent and\n# plausible, then FILTER with an adversarial refinement that removes any pair\n# a blind text model can solve. On the corrected benchmark, models do better\n# than ARO suggested - and still clearly below humans, so the underlying\n# finding survives in weakened form.\n#\n# THE LESSON, applied recursively: run the blind-baseline ablation on your\n# OWN challenge sets. A test built to detect a shortcut is itself a dataset,\n# and datasets acquire shortcuts from how they are generated.",
          "caption": "A blind text-only model scores 83-87% on benchmarks designed to require vision, because procedurally-generated negatives were detectably less fluent. Run the ablation on your diagnostics, not only on your training data."
        }
      ],
      "useCases": [
        "Model selection for a multimodal product, where the honest comparison is a table of ablations and slices rather than a leaderboard position - and where the ablations frequently reverse the ranking.",
        "Dataset construction and release, where publishing the unimodal baselines alongside the data is the minimum diligence and would have caught several widely-used benchmarks' shortcuts before release.",
        "Retrieval system evaluation, where the annotation-incompleteness problem means reported R@1 understates real quality and human judgment of the top results is needed to calibrate it.",
        "Safety and hallucination auditing for deployed vision-language systems, using targeted probes (POPE-style yes/no questions on co-occurring objects) rather than caption-similarity metrics that cannot see the failure."
      ],
      "pitfalls": [
        "Reporting a single aggregate number. Two models at identical accuracy can differ completely in whether they use the second modality, and only the ablation table distinguishes them.",
        "Thresholding CLIPScore. The modality gap means matched image-caption cosine is ~0.3 while image-image is ~0.6, so there is no absolute scale and no threshold transfers across prompts, domains, or checkpoints. Rank instead.",
        "Trusting Recall@K on image-caption data. The annotation assumes one correct match per query and is badly incomplete - re-annotation found a large fraction of 'incorrect' retrievals are genuinely correct, so R@1 understates performance and can misrank models.",
        "Treating a challenge set as shortcut-free because it was designed to be. SugarCrepe showed a blind text model scoring 83-87% on compositionality benchmarks whose procedurally-generated negatives were detectably less fluent. Run the ablation on your diagnostics too.",
        "Optimizing against an adversarial benchmark. A systematic, known shift becomes gameable once it is a target - VQA-CP's inverse prior is the canonical case. Use these sets as diagnostics and keep a private held-out version.",
        "Ignoring contamination. Web-scale image-text pretraining plausibly includes COCO, Flickr30k, and other standard benchmarks, so strong numbers may partly reflect recall of annotations rather than perception. Evaluate on data the model cannot have seen.",
        "Evaluating only the complete-input case. Report performance under every missingness pattern you expect in deployment; a fused model is frequently WORSE than the corresponding unimodal baseline when a modality is absent, and no aggregate shows it."
      ],
      "connections": [
        {
          "ref": "multimodal/vqa",
          "text": "The question-only baseline and VQA-CP are the canonical instances of the ablation-and-shifted-split discipline this lesson generalizes."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "The same problems in text: proxy metrics diverging from what you care about, learned judges being over-optimizable, and single numbers hiding the operating point."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "The hypothesis-only baseline and HANS are the direct ancestors of everything here, and SugarCrepe is the same story told about a benchmark rather than a model."
        },
        {
          "ref": "multimodal/multimodal-fusion",
          "text": "Modality-zeroing and per-missingness-pattern reporting are the fusion-specific rows of the evaluation table, and they routinely reveal negative contributions."
        },
        {
          "ref": "trustworthy-ai/attribution",
          "text": "Attribution and attention maps generate hypotheses about what a model uses; causal perturbation of the input is what tests them, and the distinction matters here as much as in interpretability."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the central discipline of multimodal evaluation?",
          "a": "Ablations and constructed tests, not metrics. Drop each modality, feed mismatched pairs, build cases where the shortcut and task disagree, and perturb inputs so the answer must change."
        },
        {
          "q": "Why can't an i.i.d. test set detect a shortcut?",
          "a": "Structurally: the shortcut works on the test set for exactly the reason it works in training. Detection requires data built so the shortcut and the task DISAGREE."
        },
        {
          "q": "What is the unimodal ablation?",
          "a": "Retrain with each modality alone and compare to the full model. Whatever the partial model reaches is achievable WITHOUT the other modality - and the gap can be zero or negative."
        },
        {
          "q": "What is the modality-corruption test?",
          "a": "On the trained model, feed a blanked or MISMATCHED second modality. No retraining needed, and a small accuracy drop means the model is ignoring it."
        },
        {
          "q": "Why is CLIPScore not thresholdable?",
          "a": "The modality gap: matched image-caption cosine is ~0.3 while image-image is ~0.6. There is no absolute scale and no threshold transfers across prompts, domains, or checkpoints."
        },
        {
          "q": "What is wrong with Recall@K on COCO?",
          "a": "It assumes complete annotation - anything unlabelled is a non-match. COCO pairs five captions per image, so a retrieved caption that genuinely describes the image but was written for another counts as an error."
        },
        {
          "q": "What is Winoground?",
          "a": "Pairs of images and captions using the SAME words in different orders. Models must match both correctly. Vision-language models perform near chance, isolating compositional understanding from vocabulary."
        },
        {
          "q": "What did SugarCrepe find?",
          "a": "That a BLIND text-only model scores 83-87% on ARO and VL-Checklist, because their procedurally-generated hard negatives were less fluent as English. The compositionality benchmarks had their own shortcut."
        },
        {
          "q": "How did SugarCrepe fix it?",
          "a": "Generate negatives with an LLM so they are fluent and plausible, then adversarially FILTER out any pair a blind text model can solve. Models then score better than ARO suggested and still below humans."
        },
        {
          "q": "Why not optimize against an adversarial benchmark?",
          "a": "A systematic, known shift becomes gameable - VQA-CP's inverse prior is the canonical case, where methods improved the score without improving grounding. Use them as diagnostics and keep a private version."
        },
        {
          "q": "What is counterfactual consistency?",
          "a": "The fraction of perturbation pairs where the model's answer changes CORRECTLY when the input changes in a way that must change it. Far stricter than per-example accuracy, and often near zero when accuracy is high."
        },
        {
          "q": "Why does contamination matter here?",
          "a": "Web-scale image-text pretraining plausibly includes COCO and Flickr30k, so benchmark numbers may reflect recall of annotations rather than perception. Evaluate on data the model cannot have seen."
        }
      ],
      "standard": [
        {
          "q": "Design an evaluation for a multimodal model that would actually detect shortcut learning.",
          "a": "THE PRINCIPLE FIRST: an i.i.d. test set cannot detect a shortcut, because the shortcut holds on it for the same reason it holds in training. That is structural and no amount of held-out data fixes it. So every technique below is a way of constructing data or conditions where the shortcut and the task DISAGREE. LEVEL 1 - ABLATION BASELINES, and this is non-negotiable. Retrain the model with each modality removed. Whatever a partial-input model reaches is achievable without the missing modality, and the gap to the full model is the only part attributable to multimodality. This one experiment would have reframed VQA years earlier than it did, and it costs one training run per modality. Report it in the results table. LEVEL 2 - CORRUPTION AT INFERENCE, which needs no retraining. Feed the trained model a blanked, shuffled, or MISMATCHED second modality. Mismatched is the most informative: pair each question with a different image and measure the drop. A small drop means the model is not using that input regardless of what it was trained on. LEVEL 3 - IDENTIFY CANDIDATE SHORTCUTS EXPLICITLY. Compute PMI between input features and labels to find give-away tokens. Check whether the label correlates with length, position, source, or annotator. Train a deliberately WEAK model - logistic regression on bag-of-words - because weak models find the easiest signal first, which makes them useful shortcut detectors. And read a hundred examples yourself; humans notice 'the answer is always the longest option' quickly. LEVEL 4 - CONSTRUCT CHALLENGE SETS WHERE THE SHORTCUT FAILS. This is the definitive test. For each hypothesized shortcut, generate examples where following it gives the wrong answer: VQA v2's complementary pairs (two similar images, same question, different answers), HANS-style templated constructions, POPE's co-occurrence-chosen absent objects. Report per-heuristic accuracy, not an aggregate. LEVEL 5 - CONTRAST SETS AND COUNTERFACTUALS. Take real examples and perturb them MINIMALLY so the correct answer changes - remove the object, change its colour, alter the count. Then measure CONSISTENCY: the fraction of contrast groups where every member is correct. This is far stricter than per-example accuracy and it is the closest thing to a causal test of whether the model is reading the input. For images this is increasingly cheap to generate with inpainting. LEVEL 6 - SHIFTED SPLITS as a diagnostic, held out and ideally kept private, because a known systematic shift becomes an optimization target. THE STEP EVERYONE SKIPS, and the one I would emphasize: RUN THE ABLATION ON YOUR CHALLENGE SET TOO. A diagnostic set is itself a dataset and acquires shortcuts from how it was generated. SugarCrepe is the proof - ARO and VL-Checklist were built specifically to test compositional grounding, and a blind text-only model scored 83-87% on them because the procedurally-generated negatives were less fluent as English. The benchmark for shortcuts had a shortcut. If you generate hard negatives by rule, check that a model seeing only one modality cannot solve them. HOW I WOULD REPORT IT: a table, not a number. Full model, each unimodal ablation, mismatched-modality accuracy, per-heuristic challenge-set accuracy, contrast-set consistency, and the worst per-slice result. The SHAPE of that table is the finding - two models at the same headline accuracy can look completely different across it. AND THE HABIT: build the challenge set BEFORE you build the model, while you are still thinking about what the task requires rather than about what your model does. Retrofitting an evaluation to an existing model means unconsciously building one it passes."
        },
        {
          "q": "How would you evaluate a cross-modal retrieval system?",
          "a": "THE STANDARD METRICS AND THEIR ASSUMPTION. Recall@K (usually 1, 5, 10) in both directions - image-to-text and text-to-image - plus median rank and mean reciprocal rank. These assume the annotation is COMPLETE: that the labelled match is the only correct one and everything else is a non-match. For image-caption data that assumption is badly false and the consequences are underappreciated. THE ANNOTATION PROBLEM. COCO pairs each image with five captions. But captions are generic - 'a man riding a horse on a beach' describes many images - so a retrieved caption written for a DIFFERENT image may describe the query image perfectly, and it counts as an error. Re-annotation efforts (ECCV Caption, Crisscrossed Captions) collected many more human judgments per pair and found a large fraction of 'incorrect' retrievals are genuinely correct. Two consequences: reported R@1 substantially UNDERSTATES real performance, and because the incompleteness is not uniform across models, the ranking between systems can change under corrected annotation. Anyone taking a leaderboard position at face value should know this. WHAT I WOULD DO INSTEAD, or in addition. (1) Report R@K for comparability, and say which annotation you used. (2) HUMAN JUDGMENT ON THE TOP RESULTS: for a sample of queries, have annotators rate the top-5 retrieved items as relevant or not. This measures precision as a user experiences it and is immune to annotation incompleteness. It is the number I would actually trust. (3) NDCG with graded relevance if you can afford multi-level judgments, since 'somewhat relevant' is common in retrieval and binary labels discard it. (4) The DUPLICATE and NEAR-DUPLICATE problem: large corpora contain many near-identical items, so a model that retrieves five copies of the same thing scores well and serves the user badly. Measure result DIVERSITY explicitly. THE SYSTEM-LEVEL EVALUATION that papers omit and products need. (a) The ANN RECALL trade-off: exact search is infeasible at scale, so you are running approximate nearest-neighbour search whose recall is a TUNABLE operating point. Report end-to-end quality at a stated latency, not embedding quality in isolation - a model that is 2 points better and requires exact search may be worse in production. (b) FILTERED SEARCH: real queries have constraints (in stock, this category, this date range), and filtering interacts badly with graph-based ANN indexes, sometimes collapsing recall. This is a common and severe production failure that no benchmark measures. (c) COLD-START and long-tail behaviour: performance on rare items, which the head-dominated aggregate hides. (d) LATENCY and index build time. THE DIAGNOSTIC I WOULD RUN FIRST on any new retrieval corpus: retrieve for a sample of queries and LOOK at the results. Near-duplicate flooding, a dominant cluster absorbing everything, and systematic failure on a query type are all visible in ten minutes and invisible in R@K. AND THE FRAMING: retrieval quality is a property of the ENCODER, the INDEX, and the FILTERING TOGETHER. Evaluating the encoder alone answers a question about a component, not about the system, and the component question is the one benchmarks answer."
        },
        {
          "q": "Explain Winoground and what it established about vision-language models.",
          "a": "THE DESIGN, which is unusually clean. Each item has TWO images and TWO captions. The captions contain EXACTLY THE SAME WORDS in a different order - 'some plants surrounding a lightbulb' and 'a lightbulb surrounding some plants'. The model must match each caption to its correct image. Because the word sets are identical, no amount of vocabulary knowledge helps; the only way to succeed is to understand how the arrangement of words maps to the arrangement of things. That isolates COMPOSITIONALITY from lexical recognition better than any other benchmark. THE SCORING is deliberately strict. Text score: for a given image, is the correct caption scored higher? Image score: for a given caption, is the correct image scored higher? GROUP score: both, for both items - all four comparisons correct. The group score is the one to look at, because the others can be satisfied by partial luck. THE RESULT. Vision-language models scored at or near CHANCE on the group score, while humans were around 85%. A model that is excellent at zero-shot classification, retrieval, and captioning fails completely at deciding whether the plants surround the lightbulb or the reverse. That is a striking dissociation and it is the strongest single piece of evidence that contrastive vision-language models behave as bags of concepts. WHY IT HAPPENS, connecting to the objective. Contrastive pretraining asks the model to pick the matching caption from a batch of mostly UNRELATED alternatives. Recognizing which concepts are present is always sufficient to win that comparison, so there is no gradient pressure toward representing their arrangement. The training data compounds it: web alt-text rarely specifies spatial relations precisely. And the architecture compounds it further: pooling an image to a single vector makes it hard to encode relational structure compositionally, and CLIP's text encoder has been shown to produce similar embeddings for shuffled captions - the direct signature of order-insensitivity. THE IMPORTANT CAVEATS, which a good answer includes. (1) Winoground is SMALL - 400 items - so the confidence intervals are wide and small differences between models are not meaningful. (2) Later analysis (Diwan et al.) showed a substantial fraction of items require more than compositional reasoning: unusual imagery, complex pragmatics, or genuinely ambiguous visual content. So near-chance performance overstates the compositional deficit somewhat; the benchmark is harder than 'just' compositionality. (3) It is a DIAGNOSTIC, not a training target - 400 items cannot be optimized against meaningfully. WHERE IT LEFT THE FIELD. It motivated ARO and VL-Checklist, which scaled up the idea with procedurally-generated hard negatives - and those turned out to have their own shortcut, which SugarCrepe exposed by showing a blind text-only model scoring 83-87% on them. On SugarCrepe's corrected version, models do better than ARO claimed and still clearly worse than humans, so the underlying finding survives in weakened and better-measured form. It also motivated NegCLIP-style training with hard negatives that differ only in composition, which substantially improves these benchmarks - confirming the diagnosis, since supplying the missing gradient pressure supplies the missing capability. WHAT I TAKE FROM THE WHOLE ARC: the capability gap was real, the first attempts to measure it at scale were themselves flawed in exactly the way they were measuring, and the correction came from applying the same blind-baseline check to the benchmark. That is the discipline working, and it is a better story about scientific practice than a clean result would have been."
        },
        {
          "q": "How do you evaluate hallucination in a vision-language system?",
          "a": "THE FIRST POINT is that reference-based caption metrics CANNOT see this failure. BLEU, ROUGE, CIDEr, and SPICE compare a generated caption against references, so a caption that hallucinates one object while matching the reference's phrasing scores well. If hallucination is your concern - and for any deployed captioning or VQA system it should be - you need targeted metrics. THE TARGETED METRICS, in increasing order of usefulness. (1) CHAIR: count mentioned objects that are not in the image's annotation. CHAIR_i is the fraction of MENTIONS that are wrong; CHAIR_s is the fraction of CAPTIONS containing any error. Report both, because a low per-mention rate can coexist with most captions being wrong. Limited to the annotated object vocabulary, so it misses attribute and relation hallucination. (2) POPE, which is the best-designed and the one I would lead with. Reframe as balanced yes/no questions - 'is there a {object} in the image?' - which removes all wording ambiguity and reduces the problem to binary classification. The crucial design choice is how the ABSENT objects are selected: randomly, by dataset popularity, or ADVERSARIALLY by co-occurrence with objects that ARE present. Accuracy falls monotonically across those splits, which is direct evidence that the language prior is the mechanism rather than general unreliability. And report the YES-RATE alongside accuracy: it typically exceeds 50% on a balanced set, which isolates instruction-tuning sycophancy from perception failure. Those are different problems with different fixes and conflating them wastes effort. (3) Extended benchmarks (AMBER, HallusionBench) covering attributes, relations, and counting, since object presence is only one hallucination type. (4) ENTAILMENT-BASED checking: decompose the generation into atomic claims and check each against a structured description or a detector's output. Closest to a general solution and the most expensive. (5) LLM-as-judge with the image, which is flexible and inherits the judge's own hallucination tendencies - so validate it against human labels before trusting it. THE PROTOCOL ISSUES that determine whether the numbers mean anything. LENGTH: hallucination rate rises with caption length, so comparing systems with different output lengths compares verbosity. Report length distributions and consider length-controlled comparison. CONTAMINATION: COCO is plausibly in web-scale pretraining data, so a model may be recalling annotations - evaluate on images it cannot have seen. YOUR OWN DISTRIBUTION: benchmark images are curated and well-framed; if your deployment is user photographs or documents, the rates will differ substantially and only your own probes will tell you. HUMAN EVALUATION, which remains the anchor and should use a TASK rather than a rating: ask annotators to HIGHLIGHT unsupported spans rather than to score factuality 1-5. Span highlighting is far more reliable, produces error analysis for free, and gives you a labelled set for validating automatic metrics. WHAT I WOULD REPORT for a deployed system: POPE accuracy AND yes-rate on my own image distribution across all three negative-selection splits, CHAIR at a controlled caption length, a human span-highlighting evaluation on a few hundred outputs, and the hallucination rate broken down by image type. And I would treat these as the PRIMARY quality metrics rather than supplements, because for every real use of visual description the question 'is it true' precedes 'is it well-phrased' - and for accessibility applications, where the user cannot verify, it is the only question that matters."
        },
        {
          "q": "What role should human evaluation play, and how do you do it well?",
          "a": "ITS ROLE: human evaluation is the GROUND TRUTH that every automatic metric is a proxy for, and it is routinely done badly enough to be noisier than the metrics it validates. The right use is not to run it on every change - too slow - but to run it ONCE properly to validate a cheaper proxy, then use the proxy for iteration and re-anchor periodically. Getting that structure right matters more than any individual protocol detail. HOW TO DO IT WELL. (1) DEFINE THE QUESTION PRECISELY. 'Rate the quality 1-5' produces noise because raters weight different things. Break it into independently-judgeable dimensions - is every claim supported by the image, does it answer what was asked, is it fluent, is it appropriately concise - each with a written definition and worked examples including boundary cases. The guidelines ARE the experiment. (2) PREFER TASKS OVER RATINGS. People are far more reliable at concrete judgements than abstract scores. 'Highlight every span not supported by the image' beats 'rate factuality 1-5'. 'Which of these two is better' beats 'score each 1-10' - pairwise comparison has substantially better inter-annotator agreement, and Likert responses cluster in the middle regardless. For ranking many systems, collect pairwise comparisons and fit a Bradley-Terry or Elo model. (3) MEASURE AND REPORT AGREEMENT. Multiple annotators per item, and compute Krippendorff's alpha or Cohen's kappa. This is the CEILING on any metric's correlation and on your ability to detect differences. If agreement is low, the guidelines are wrong - fix them and re-run rather than averaging harder. Publishing model comparisons without reporting annotator agreement is the most common defect in this area. (4) CONTROL THE CONFOUNDS. Randomize presentation order and which system is 'A'. Blind annotators to system identity. Interleave items from all systems rather than blocking by system, since raters drift and calibrate to what they have recently seen. Include attention checks with known answers and screen out failures. Cap session length, because quality degrades measurably after about an hour. (5) GET THE RIGHT ANNOTATORS. This matters more in multimodal settings than people expect: crowdworkers cannot judge whether a medical image description is correct and will judge FLUENCY instead while believing they are judging accuracy. That failure means the evaluation measures style and is reported as measuring correctness. For specialized domains you need domain experts, and for accessibility products you need actual blind and low-vision users, whose judgments about what makes a description useful differ substantially from sighted annotators'. (6) SIZE THE STUDY. Compute how many items you need to detect the difference you care about given the observed variance, and report CONFIDENCE INTERVALS. Twenty items and two raters cannot distinguish systems differing by a few percent, yet that is routinely used to claim exactly that. If intervals overlap, say the result is inconclusive. (7) ANALYZE PROPERLY: aggregate per item before per system, use paired tests, report the DISTRIBUTION rather than only the mean - a system that is usually excellent and occasionally terrible differs from a uniformly mediocre one - and examine the disagreement cases, which is where the interesting behaviour is. THE VALIDATION LOOP I would set up: run one careful human evaluation, use it to measure how well each candidate automatic metric or LLM judge correlates with human judgment ON YOUR DATA, report that correlation alongside the human-human ceiling, then iterate with the best proxy and re-anchor quarterly. The mistake is either extreme - trusting a proxy you never validated, or attempting human evaluation on every change and therefore doing it badly."
        },
        {
          "q": "Your multimodal model scores well on benchmarks but users are unhappy. How do you investigate?",
          "a": "I WOULD TREAT THIS AS A MEASUREMENT PROBLEM BEFORE A MODEL PROBLEM, and work in a fixed order. STEP 1 - COLLECT THE ACTUAL COMPLAINTS. 'Users are unhappy' is not actionable; fifty concrete failing examples are. Sample from production, or ask users to flag. This step frequently ends the investigation by itself, and skipping it is how teams spend a month on the wrong thing. STEP 2 - CHECK WHETHER THE BENCHMARK MEASURES YOUR TASK. Benchmark images are curated, well-lit, well-framed, and drawn from a specific distribution; user inputs are not. Compare the two distributions directly - resolution, aspect ratio, blur, framing, subject matter, and the proportion containing text. A cheap and effective diagnostic is training a classifier to distinguish benchmark from production inputs; if it succeeds trivially, its top features tell you how they differ. VizWiz exists precisely because blind users' real photographs look nothing like COCO. STEP 3 - CHECK FOR CONTAMINATION. If the model was pretrained on web-scale image-text data, standard benchmarks are plausibly in it, so strong benchmark numbers may reflect recall of annotations rather than perception. Test on images that cannot have been in the training data - recent photographs, internal data, or perturbed versions of benchmark images. A large drop between original and perturbed images is direct evidence. STEP 4 - RUN THE ABLATIONS ON PRODUCTION-LIKE DATA. Modality corruption on your own inputs: does blanking or mismatching the image change the answers? If not, the model is answering from priors, which will look fine on a benchmark whose priors match training and fail on real inputs whose priors do not. STEP 5 - CHECK THE METRIC AGAINST THE USER'S NOTION OF SUCCESS. This is where the gap usually is. Users weight errors by IMPORTANCE; benchmark metrics weight them by frequency. A captioning system that is excellent on the common 80% and hallucinates on the rest scores well and is experienced as unreliable, because users remember the failures. Recompute the metric the way the user cares - per document, per session, worst-case rather than average - or measure the downstream outcome (did they accept the output, did they have to correct it, did they abandon). STEP 6 - LOOK FOR THE SPECIFIC FAILURE CLASSES that aggregate metrics hide: text in images (very common in real use, poorly handled, and absent from most benchmarks), unanswerable inputs where the model should abstain and does not, rare categories, and the demographic or condition slices where performance is worst. STEP 7 - CHECK THE PIPELINE, not just the model: resolution handling, preprocessing differences between evaluation and serving, image orientation metadata, and whether production images are being downscaled somewhere before the model sees them. Training-serving skew is mundane and extremely common - render an input at the resolution the model actually receives and look at it. WHAT USUALLY TURNS OUT TO BE TRUE, in my experience of this pattern: some combination of a distribution gap the benchmark never covered, a metric that averages over an error class users treat as disqualifying, and an absent abstention mechanism so the system fails confidently rather than gracefully. THE FIX IS USUALLY EVALUATION-FIRST: build an evaluation set from real production inputs with real user-relevant labels, and re-rank the candidate models on it. That frequently reverses the ranking, and it converts an argument about the model into a measurement. AND THE PREVENTION worth stating in a design review: the evaluation set should be constructed from the deployment distribution BEFORE the first model is chosen. Most of these gaps are decided at that moment, months before anyone notices them."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The central discipline",
        "back": "Not a metric - ABLATIONS and constructed tests. Drop each modality; feed mismatched pairs; build cases where the shortcut and task disagree; perturb inputs so the answer MUST change. Each costs a run and answers what no accuracy can."
      },
      {
        "type": "pitfall",
        "front": "i.i.d. test sets cannot find shortcuts",
        "back": "Structural: the shortcut works on the test set for the same reason it works in training. No amount of held-out data helps. Detection requires data built so the shortcut and the task DISAGREE."
      },
      {
        "type": "definition",
        "front": "The evaluation table",
        "back": "Full model; each unimodal ablation; blanked and MISMATCHED modality; shifted split; counterfactual consistency; worst slice. Two models at 70% can differ completely across it - one functionally unimodal, one genuinely integrating."
      },
      {
        "type": "pitfall",
        "front": "SugarCrepe: the benchmark had a shortcut",
        "back": "A BLIND text-only model scores 83-87% on ARO and VL-Checklist, because procedurally-generated negatives ('the grass is eating the horse') were less FLUENT as English. Run the blind-baseline ablation on your own diagnostics."
      },
      {
        "type": "definition",
        "front": "Winoground",
        "back": "Two images, two captions with the SAME WORDS reordered; match both. Isolates compositionality from vocabulary. Models near CHANCE on the group score vs ~85% for humans - though only 400 items, and later analysis showed many need more than composition."
      },
      {
        "type": "pitfall",
        "front": "Recall@K assumes complete annotation",
        "back": "COCO has five captions per image, so a retrieved caption that genuinely describes the query but was written for another image counts as an ERROR. Re-annotation found many 'incorrect' retrievals are correct - R@1 understates, and rankings can change."
      },
      {
        "type": "pitfall",
        "front": "CLIPScore ranks, it does not threshold",
        "back": "The modality gap puts matched image-caption cosine at ~0.3 and image-image at ~0.6, so there is no absolute scale. The 2.5 multiplier in the standard formula is cosmetic rescaling adding no information."
      },
      {
        "type": "definition",
        "front": "Counterfactual consistency",
        "back": "The fraction of perturbation PAIRS where the answer changes correctly when the input changes in a way that must change it. Far stricter than per-example accuracy - often near zero while accuracy looks high."
      },
      {
        "type": "pitfall",
        "front": "Adversarial benchmarks become gameable",
        "back": "A systematic, KNOWN shift can be exploited - VQA-CP's inverse prior let methods improve scores without improving grounding. Use them as diagnostics, keep a private held-out version, and never optimize against them."
      },
      {
        "type": "pitfall",
        "front": "Hallucination is invisible to caption metrics",
        "back": "BLEU/ROUGE/CIDEr/SPICE compare against references, so a caption that invents one object while matching the reference's phrasing scores well. Use POPE (with the yes-rate reported) and CHAIR at a controlled length."
      },
      {
        "type": "intuition",
        "front": "Prefer tasks over ratings in human eval",
        "back": "'Highlight every unsupported span' beats 'rate factuality 1-5'; pairwise comparison beats 1-10 scoring. And report inter-annotator AGREEMENT - it is the ceiling on any metric's correlation and on your power to detect differences."
      },
      {
        "type": "pitfall",
        "front": "Get the right annotators",
        "back": "Crowdworkers cannot judge whether a medical description is correct and will judge FLUENCY while believing they judge accuracy - so the study measures style and is reported as measuring correctness. Accessibility products need actual blind and low-vision users."
      }
    ],
    "refs": [
      {
        "title": "Hsieh et al. (2023), SugarCrepe: Fixing Hackable Benchmarks for Vision-Language Compositionality",
        "url": "https://arxiv.org/abs/2306.14610"
      },
      {
        "title": "Thrush et al. (2022), Winoground: Probing Vision and Language Models for Visio-Linguistic Compositionality",
        "url": "https://arxiv.org/abs/2204.03162"
      },
      {
        "title": "Hessel et al. (2021), CLIPScore: A Reference-free Evaluation Metric for Image Captioning",
        "url": "https://arxiv.org/abs/2104.08718"
      },
      {
        "title": "Chun et al. (2022), ECCV Caption: Correcting False Negatives by Collecting Machine-and-Human-verified Image-Caption Associations",
        "url": "https://arxiv.org/abs/2204.03359"
      },
      {
        "title": "Diwan et al. (2022), Why is Winoground Hard? Investigating Failures in Visuolinguistic Compositionality",
        "url": "https://arxiv.org/abs/2211.00768"
      }
    ],
    "demos": [
      "classification-metrics",
      "embeddings",
      "calibration",
      "vector-search"
    ],
    "demoTitles": {
      "classification-metrics": "Classification Metrics",
      "embeddings": "Embedding Atlas",
      "calibration": "Model Calibration",
      "vector-search": "Vector Search"
    }
  }
};
