// GENERATED from content/lessons/multimodal/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "multimodal". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "zero-shot": {
    "level": "core",
    "body": {
      "intuition": [
        "A conventional classifier's output layer is a fixed set of numbered slots, and adding a class means retraining. CLIP's zero-shot trick removes that constraint with one observation: if images and text live in a shared embedding space, then the TEXT ENCODER can manufacture a classifier on demand. Embed 'a photo of a dog', 'a photo of a cat', and any other class name you like, and classify an image by which text embedding it is closest to. The classes are described rather than enumerated, so the label set becomes a runtime argument.",
        "The result that made this famous is that zero-shot CLIP matched a fully supervised ResNet-50 on ImageNet without seeing a single ImageNet training image. What that headline obscures is how much of the performance comes from PROMPT ENGINEERING, which is not a detail here but a core part of the method. Using the bare class name 'dog' is meaningfully worse than 'a photo of a dog', because CLIP's training captions are sentences, not nouns, and a bare word sits in a part of the text-embedding space the model rarely visited. Ensembling many prompt templates and averaging their embeddings adds several more points. You are not choosing wording; you are choosing where in text space to place your classifier.",
        "The deeper thing to understand about this shared space is that it is NOT shared in the way the phrase suggests. Image embeddings and text embeddings occupy two SEPARATE, non-overlapping cones - the MODALITY GAP - so an image's cosine similarity to its own caption is around 0.3 while its similarity to another image is around 0.6. The contrastive objective only ever asked that matching pairs be closer to each other than to mismatched pairs; it never asked that the two modalities occupy the same region. Zero-shot classification works because comparisons are made WITHIN a modality's relationship to text, and this is why absolute CLIP similarity scores are close to meaningless as a threshold and only the RANKING is trustworthy."
      ],
      "math": [
        {
          "h": "The text encoder as a classifier factory",
          "paras": [
            "Zero-shot classification is a nearest-neighbour lookup in embedding space. Written out, the text embeddings play exactly the role a linear layer's weight matrix would - which is the cleanest way to see what is happening."
          ],
          "tex": "\\hat{y} = \\arg\\max_{k} \\; \\frac{\\langle f_I(x),\\, f_T(t_k)\\rangle}{\\lVert f_I(x)\\rVert\\,\\lVert f_T(t_k)\\rVert}, \\qquad W = \\big[\\,\\bar{f}_T(t_1)\\;\\cdots\\;\\bar{f}_T(t_K)\\,\\big]^{\\top}",
          "texNote": "W is a K x d matrix of normalized text embeddings, and the prediction is argmax of W times the normalized image embedding. It IS a linear classifier - the text encoder just computed its weights instead of gradient descent."
        },
        {
          "h": "Prompt ensembling: average in embedding space, not in probability space",
          "paras": [
            "Multiple templates per class, embedded and averaged BEFORE normalization, then renormalized. This is cheap - the text side is computed once and cached - and it is worth several points."
          ],
          "tex": "\\bar{f}_T(c) = \\frac{\\frac{1}{M}\\sum_{m=1}^{M} f_T\\big(\\tau_m(c)\\big)}{\\big\\lVert \\frac{1}{M}\\sum_{m=1}^{M} f_T\\big(\\tau_m(c)\\big)\\big\\rVert}",
          "texNote": "tau_m are templates ('a photo of a {}', 'a blurry photo of a {}', 'art of the {}'). CLIP's 80-template ImageNet ensemble is worth roughly +3.5% over a single prompt, and averaging EMBEDDINGS beats averaging the resulting probabilities."
        },
        {
          "h": "The modality gap, measured",
          "paras": [
            "The two modalities occupy separate cones. You can measure the gap directly as the distance between the mean embeddings, and it is large and stable - it does not close with more training."
          ],
          "tex": "\\Delta = \\Big\\lVert \\tfrac{1}{N}\\sum_i \\bar{f}_I(x_i) - \\tfrac{1}{N}\\sum_i \\bar{f}_T(t_i) \\Big\\rVert, \\qquad \\cos(\\text{img},\\text{its caption}) \\approx 0.3 \\;\\ll\\; \\cos(\\text{img},\\text{img}) \\approx 0.6",
          "texNote": "The contrastive objective only requires matched pairs to rank above mismatched ones - it never requires the modalities to overlap. Consequence: absolute similarity scores are not comparable across modalities and make poor thresholds; only the ranking within a comparison is meaningful."
        }
      ],
      "code": [
        {
          "h": "Zero-shot classification, with the prompt handling that actually matters",
          "paras": [
            "The mechanism is ten lines. The templates are what separate a working system from a disappointing one, and the text side costs nothing at inference because it is cached."
          ],
          "code": "import torch, clip\n\nTEMPLATES = [\n    \"a photo of a {}.\", \"a blurry photo of a {}.\", \"a photo of the large {}.\",\n    \"a photo of the small {}.\", \"art of the {}.\", \"a cropped photo of a {}.\",\n]   # CLIP's ImageNet set has 80; even 6 recovers most of the gain\n\n@torch.no_grad()\ndef build_classifier(classnames, model, tokenizer):\n    weights = []\n    for c in classnames:\n        emb = model.encode_text(tokenizer([t.format(c) for t in TEMPLATES]))\n        emb = emb / emb.norm(dim=-1, keepdim=True)   # normalize EACH\n        emb = emb.mean(0)                            # then average\n        weights.append(emb / emb.norm())             # then renormalize\n    return torch.stack(weights)                      # (K, d) - computed ONCE\n\nW = build_classifier(classnames, model, tokenizer)\n\n@torch.no_grad()\ndef classify(images):\n    f = model.encode_image(images)\n    f = f / f.norm(dim=-1, keepdim=True)\n    return (100.0 * f @ W.T).softmax(-1)             # 100 = CLIP's learned scale\n\n# WHAT THE PROMPTS ARE WORTH (CLIP paper, ImageNet zero-shot):\n#   bare class name .................. baseline\n#   \"a photo of a {}\" ................ +1.3%\n#   80-template ensemble ............. +3.5%\n#   class-name disambiguation ........ more again on fine-grained sets\n#\n# The last one is underrated: CLIP has never heard of the ImageNet class\n# \"crane\" as a bird versus a machine, and \"boxer\" as a dog versus a fighter.\n# Renaming to \"crane bird\" fixes a whole class of errors that look like\n# vision failures and are actually LABEL AMBIGUITY.",
          "caption": "The text tower computes the classifier weights once and caches them, so zero-shot inference costs exactly one image forward pass. Prompt templates and class-name disambiguation are worth several points and are the part people skip."
        },
        {
          "h": "The modality gap, and why absolute scores mislead",
          "paras": [
            "Ten lines that change how you use CLIP similarity. If you have ever tried to threshold a CLIP score and found no value works, this is why."
          ],
          "code": "img_emb = normalize(model.encode_image(images))     # (N, d)\ntxt_emb = normalize(model.encode_text(captions))    # (N, d), matched pairs\n\nprint(\"matched image-text  \", (img_emb * txt_emb).sum(-1).mean().item())\nprint(\"image-image (random)\", (img_emb @ img_emb.T).mean().item())\nprint(\"text-text  (random) \", (txt_emb @ txt_emb.T).mean().item())\nprint(\"centroid distance   \", (img_emb.mean(0) - txt_emb.mean(0)).norm().item())\n\n#   matched image-text ....... ~0.30      <- an image and ITS OWN caption\n#   image-image (random) ..... ~0.60      <- two UNRELATED images\n#   text-text  (random) ...... ~0.55\n#   centroid distance ........ ~0.82      <- the modality GAP\n#\n# An image is more similar to a random other image than to its own caption.\n# The embeddings sit in two separate cones and the contrastive loss never\n# asked them to overlap - it only asked matched pairs to RANK above\n# mismatched ones.\n#\n# CONSEQUENCES YOU WILL HIT:\n#  * A CLIPScore of 0.31 is not \"31% match\". There is no absolute scale, and\n#    a fixed threshold will not transfer across prompts, domains, or models.\n#  * Compare LIKE WITH LIKE: rank captions for one image, or images for one\n#    caption. Do not compare an image-text score against an image-image one.\n#  * For retrieval, calibrate the threshold per query, or use rank position.\n#  * The gap is stable and does not close with more training - it is a\n#    property of the objective plus initialization, not a convergence issue.",
          "caption": "An image's similarity to its own caption (~0.30) is LOWER than to a random unrelated image (~0.60). The shared space is two adjacent cones, which is why CLIP scores rank well and threshold badly."
        }
      ],
      "useCases": [
        "Cold-start classification with no labelled data and a label set that changes at runtime - content moderation categories, product taxonomies, and any setting where new classes appear faster than you can label them.",
        "Open-vocabulary detection and segmentation, where CLIP's text tower supplies the class embeddings and a detector proposes regions, giving detection of categories never annotated in the training set.",
        "Data curation and filtering at scale: scoring image-text pairs to build training sets (LAION was filtered with CLIP), finding mislabelled examples, and retrieving candidates for annotation.",
        "Semantic image search and deduplication over large catalogues, where the embedding is the index and the query can be text or an image - subject to the ranking-not-thresholding caution."
      ],
      "pitfalls": [
        "Thresholding on absolute CLIP similarity. The modality gap means an image scores ~0.30 against its own caption and ~0.60 against a random image, so there is no meaningful absolute scale and a fixed threshold will not transfer across prompts, domains, or model versions. Rank, do not threshold.",
        "Using bare class names as prompts. CLIP was trained on sentences, so 'a photo of a {}' is worth over a point on ImageNet and an 80-template ensemble roughly 3.5 - and averaging EMBEDDINGS beats averaging probabilities.",
        "Ignoring class-name ambiguity. 'Crane', 'boxer', and 'mouse' mean different things, and the model has no way to know which you meant. Disambiguating the class string fixes errors that look like vision failures.",
        "Assuming zero-shot generalizes uniformly. CLIP is strong on common natural-image categories and weak on fine-grained, specialized, and abstract tasks - satellite imagery, medical scans, counting, and any concept rare in web alt-text.",
        "Believing 'zero-shot' means the model has not seen the task. CLIP's 400M web pairs almost certainly contain examples resembling most benchmarks, and the CLIP paper's own de-duplication analysis is the honest treatment - treat the term as 'no task-specific supervision', not 'no exposure'.",
        "Reaching for zero-shot when you have labels. A linear probe on CLIP features with even 4-16 examples per class typically beats zero-shot, and full fine-tuning beats that. Zero-shot's niche is genuinely no data.",
        "Fine-tuning CLIP naively for a downstream task and losing robustness. Fine-tuning distorts the pretrained features and degrades out-of-distribution performance; WiSE-FT (interpolating fine-tuned and zero-shot weights) recovers much of it and often improves both."
      ],
      "connections": [
        {
          "ref": "multimodal/clip",
          "text": "The contrastive pretraining that produces the shared space - zero-shot classification is the payoff, and the modality gap is a direct consequence of that objective."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "NLI-based zero-shot classification is the same reframing in text: turn classification into a task the model was already trained on, and let the label's SEMANTICS do the work."
        },
        {
          "ref": "multimodal/multimodal-eval",
          "text": "CLIPScore inherits the modality gap, which is why it is a ranking signal rather than an absolute measure of image-text agreement."
        },
        {
          "ref": "advanced-cv/image-retrieval",
          "text": "Zero-shot classification and retrieval are the same nearest-neighbour operation in the same space, with the query coming from a different tower."
        },
        {
          "ref": "advanced-nlp/fine-tuning-transformers",
          "text": "The zero-shot-versus-probe-versus-fine-tune ladder, and the OOD feature-distortion result that motivates WiSE-FT, are exactly the transfer-learning trade-offs from the NLP side."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How does CLIP do zero-shot classification?",
          "a": "Embed each class name in a prompt template with the text encoder, embed the image, and take the nearest text embedding by cosine similarity. The text tower computes the classifier's weights."
        },
        {
          "q": "Why is it literally a linear classifier?",
          "a": "Stacking the normalized class-text embeddings gives a K x d matrix, and the prediction is argmax of that matrix times the normalized image embedding - the same form as a linear layer, with weights computed rather than trained."
        },
        {
          "q": "Why does 'a photo of a {}' beat the bare class name?",
          "a": "CLIP was trained on sentence-like captions, so a bare noun lands in a region of text-embedding space the model rarely saw. It is worth over a point on ImageNet."
        },
        {
          "q": "What is prompt ensembling?",
          "a": "Embed each class under many templates and average the EMBEDDINGS (then renormalize) rather than the probabilities. CLIP's 80-template ImageNet set is worth roughly +3.5%."
        },
        {
          "q": "What is the modality gap?",
          "a": "Image and text embeddings occupy two separate, non-overlapping cones. An image's cosine similarity to its own caption is ~0.30 while two random images score ~0.60."
        },
        {
          "q": "Why does the gap exist?",
          "a": "The contrastive objective only requires matched pairs to rank above mismatched pairs within a batch. It never requires the two modalities to occupy the same region, and the gap is stable rather than a convergence artifact."
        },
        {
          "q": "What is the practical consequence?",
          "a": "Absolute similarity scores are meaningless as thresholds and do not transfer across prompts, domains, or models. Only the RANKING within a like-for-like comparison is trustworthy."
        },
        {
          "q": "When does zero-shot lose to a linear probe?",
          "a": "Almost immediately. With 4-16 labelled examples per class a linear probe on CLIP features typically beats zero-shot, and fine-tuning beats that."
        },
        {
          "q": "Where is CLIP zero-shot weak?",
          "a": "Fine-grained distinctions, specialized domains (satellite, medical), counting, spatial relations, and abstract or systematic tasks - anything rare or absent in web alt-text."
        },
        {
          "q": "Is 'zero-shot' an accurate description?",
          "a": "Only as 'no task-specific supervision'. With 400M web pairs the training data almost certainly contains examples resembling most benchmarks; the CLIP paper's own overlap analysis is the honest treatment."
        },
        {
          "q": "What is WiSE-FT?",
          "a": "Linearly interpolate the fine-tuned weights with the original zero-shot weights. It recovers much of the robustness fine-tuning destroys and often improves in-distribution accuracy too."
        },
        {
          "q": "How do you fix class-name ambiguity?",
          "a": "Rewrite the class string. 'Crane' becomes 'crane bird', 'boxer' becomes 'boxer dog'. These errors look like vision failures and are label ambiguity."
        }
      ],
      "standard": [
        {
          "q": "Explain how CLIP enables zero-shot classification, and what its limits are.",
          "a": "THE MECHANISM. CLIP trains an image encoder and a text encoder jointly with a contrastive objective on ~400M web image-text pairs: within a batch, the matched image-text pair should score higher than all mismatched pairs, in both directions. The result is two towers producing embeddings in a common space. For zero-shot classification you then take each class name, put it in a prompt template, embed it, and classify an image by nearest text embedding. WHY THIS IS DIFFERENT FROM CONVENTIONAL CLASSIFICATION. A standard classifier's output layer is a fixed set of numbered slots with no semantic content - class 3 is class 3. Here the class is described in TEXT, so the model brings everything it learned about the words to bear, and the label set becomes a runtime argument. Adding a class costs one text-encoder forward pass, not a retraining run. Formally the stacked class embeddings ARE a linear classifier's weight matrix; the text encoder computed the weights instead of gradient descent finding them. THE HEADLINE RESULT and its caveat. Zero-shot CLIP matched a fully supervised ResNet-50 on ImageNet with no ImageNet training images - genuinely striking. But it was ImageNet-comparable, not ImageNet-beating, and across the 27-dataset suite in the paper the picture is uneven: strong on common natural-image categories, much weaker on specialized ones. WHAT MAKES IT WORK IN PRACTICE, which is more than the mechanism. PROMPTS matter substantially - 'a photo of a {}' over a bare noun is worth over a point, and an 80-template ensemble roughly 3.5, because CLIP's training text was sentences. CLASS-NAME DISAMBIGUATION matters more than people expect: ImageNet's 'crane' is ambiguous between bird and machine, and fixing the string fixes errors that look like vision failures. And the DISTRIBUTION of the pretraining data determines what works - concepts common in web alt-text work, concepts rare in it do not. THE LIMITS, in order of practical importance. (1) IT LOSES TO ALMOST ANY SUPERVISION. With 4-16 labelled examples per class a linear probe on CLIP features beats zero-shot; with more, fine-tuning beats that. Zero-shot's genuine niche is no data at all, or a label set that changes faster than you can label. (2) SYSTEMATIC WEAKNESSES: counting, spatial relations, attribute binding, and fine-grained distinctions are all poor, because contrastive captions rarely specify them and the objective does not require compositional understanding - a bag-of-concepts representation suffices to win most contrastive comparisons. (3) DOMAIN LIMITS: medical imaging, satellite, industrial inspection, and scientific data are weak because they are rare in web pairs. (4) THE MODALITY GAP means absolute scores are not interpretable and cannot be thresholded reliably. (5) 'ZERO-SHOT' OVERSTATES the claim - at web scale the training data plausibly contains near-duplicates of benchmark content, and the CLIP paper's own de-duplication analysis is the honest place to look. HOW I WOULD USE IT: as a strong cold-start baseline and a labelling engine. Prompt it, look at the errors, use it to pre-label data cheaply, then train a probe or fine-tune with WiSE-FT-style interpolation to keep the robustness. That sequence gets the flexibility early and the accuracy later, which is the same lifecycle as prompting-then-distilling in NLP.",
          "deepDive": {
            "q": "What exactly is the modality gap, why does it arise, and does it matter?",
            "a": "THE OBSERVATION (Liang et al., 2022). In a trained CLIP model, image embeddings and text embeddings do not mingle. They occupy two distinct, narrow cones in the shared space, separated by a large and stable distance. Concretely, an image's cosine similarity to its OWN caption is around 0.30 while its similarity to a random unrelated image is around 0.60 - a matched cross-modal pair is LESS similar than an arbitrary within-modal pair. If your mental model was 'a shared space where a dog photo lands near the word dog', that model is wrong in an important way. WHERE IT COMES FROM - two contributions, and the paper separates them cleanly. (1) INITIALIZATION. Even at random initialization, before any training, two different encoder architectures map their inputs into different narrow cones. This is a consequence of deep networks with random weights producing outputs concentrated in a small region of the sphere - a 'cone effect' that gets narrower with depth. So the gap EXISTS BEFORE TRAINING BEGINS. (2) THE OBJECTIVE DOES NOT REMOVE IT. Contrastive learning with a temperature parameter has many optima. It requires that matched pairs score higher than mismatched pairs, which is a RANKING constraint, and a configuration with both modalities in separate cones satisfies it perfectly well as long as the relative ordering is right. There is no term pulling the modalities together in an absolute sense. The authors showed you can artificially shift one modality's embeddings to close the gap and downstream performance changes - sometimes improving, sometimes not - confirming the gap is a real, manipulable property rather than a measurement artifact. WHY IT MATTERS PRACTICALLY. (a) ABSOLUTE SIMILARITY IS UNINTERPRETABLE. A CLIPScore of 0.31 does not mean 31% agreement; there is no scale. Any pipeline that thresholds a raw CLIP similarity - 'accept the caption if score > 0.3' - is on unstable ground, because the appropriate value shifts with the prompt, the domain, and the model checkpoint. Rank instead, or calibrate per query against a set of known-bad references. (b) YOU CANNOT COMPARE ACROSS MODALITY PAIRS. An image-text score and an image-image score are on different scales, so a system that mixes them (say, a retrieval index containing both) will systematically favour one kind of match. (c) It complicates using CLIP embeddings as a shared space for GENERATION - DALL-E 2's prior model exists precisely to map from text embeddings to image embeddings, which would be unnecessary if the space were truly shared. That architectural choice is direct evidence of the gap. (d) It affects fairness and calibration analyses that assume a common metric. WHAT IT DOES NOT MEAN. It does not mean CLIP is broken or that zero-shot classification is unsound. Classification compares one image against SEVERAL text embeddings, all in the same cone, so the gap is a constant offset that cancels in the argmax. Retrieval within a fixed query modality is fine for the same reason. The gap breaks absolute interpretation, not relative comparison. CAN IT BE CLOSED? Several attempts exist - adding a term that aligns the modality means, shifting embeddings post hoc, or architectural changes - and the results are mixed: closing the gap does not reliably improve downstream performance, and sometimes hurts. That is itself informative. It suggests the gap is not a defect to be repaired but a natural configuration of a ranking objective, and that the representations are doing their job in a geometry that simply is not the one the phrase 'shared embedding space' evokes. THE TRANSFERABLE LESSON: when a loss constrains only RELATIVE quantities, do not assume the ABSOLUTE ones are meaningful. This applies to every contrastive method, to reward models trained on preferences, and to any ranking-based objective."
          }
        },
        {
          "q": "You need to classify product images into 200 categories with no labelled data. Walk through your approach.",
          "a": "STEP 1 - START WITH ZERO-SHOT AND MEASURE IT HONESTLY. Build the CLIP zero-shot classifier over the 200 category names, run it on a sample, and hand-label a few hundred images to get a real accuracy number. This takes a day and gives the baseline everything else is judged against. Without this number the rest of the project is guesswork. STEP 2 - FIX THE CLASS STRINGS, which is where the first large gain usually is. Product taxonomies are full of internal jargon, abbreviations, and ambiguous single words that CLIP cannot interpret - a category called 'TOPS' or 'MISC-ACC' means nothing. Rewrite each category as a natural description of what the product IS: 'a photo of a women's short-sleeve blouse' rather than 'TOPS-SS-W'. This is not cosmetic. In my experience it is the single highest-return intervention on a real taxonomy, and it costs an afternoon with the category list. STEP 3 - PROMPT ENSEMBLE, with templates matched to the imagery. Product photos are usually white-background studio shots, so templates like 'a product photo of a {} on a white background' fit better than CLIP's generic ImageNet set. Average embeddings, not probabilities. STEP 4 - HANDLE THE TAXONOMY'S STRUCTURE. Two hundred categories almost certainly form a hierarchy with confusable siblings. Classify HIERARCHICALLY - first the coarse group, then within it - which turns one 200-way decision into two much easier ones and dramatically reduces confusion between distant classes. Also look for categories that are genuinely not visually distinguishable (two SKU groups that differ only by material or by price band); no vision model will separate those, and identifying them early prevents blaming the model for a taxonomy problem. STEP 5 - GET SOME LABELS, because this is the step that actually decides the outcome. Use the zero-shot model's confidence to select what to annotate - the uncertain and the confidently-wrong cases - and label maybe 10-20 per class. With 16 examples per class a LINEAR PROBE on frozen CLIP features will typically beat zero-shot comfortably, and a probe trains in seconds. This is the highest-value few days available. STEP 6 - THE LADDER FROM THERE. Linear probe → few-shot methods that combine the probe with the zero-shot classifier as a prior (Tip-Adapter, CoOp-style prompt learning) → full fine-tuning once you have thousands of labels, with WiSE-FT interpolation to keep out-of-distribution robustness. Each rung needs more data and gives more accuracy. STEP 7 - EXPLOIT WHAT THE DOMAIN GIVES YOU FOR FREE. Product catalogues usually have TITLES and DESCRIPTIONS. Those are text, and CLIP can embed them - so you can classify from text, from image, or from both, and the text is often more reliable. If titles exist, a text classifier may beat any vision approach and should be the real baseline. Similarly, if products have SKUs with any structure, that is supervision you already own. Bringing this up early distinguishes someone who has done this from someone who has only read about CLIP. WHAT I WOULD REPORT: zero-shot accuracy, probe accuracy at several label budgets, per-category breakdown (the aggregate will hide that a third of the categories are near-zero), and the confusion structure. And the practical recommendation is almost always the same shape: zero-shot gets you running in a day, and 20 labels per class gets you most of the way to a supervised system - so the answer to 'we have no labelled data' is usually 'let us get a little'."
        },
        {
          "q": "Compare zero-shot, linear probing, few-shot adaptation, and fine-tuning on CLIP features.",
          "a": "THE LADDER, by data requirement. ZERO-SHOT: no labels. Build the classifier from class names. Costs one text forward pass per class, cached forever. Its unique property is that the label set is a RUNTIME argument. LINEAR PROBE: a few labels per class. Freeze the encoder, train a logistic regression on the embeddings. Trains in seconds on CPU, needs no GPU for training at all, and is remarkably strong - CLIP's linear probes were competitive with fully fine-tuned supervised models across its benchmark suite. FEW-SHOT ADAPTATION: a middle ground designed for the 1-16 shot regime. CoOp and CoCoOp learn the prompt's context tokens rather than the classifier weights, keeping the text encoder's semantics. Tip-Adapter builds a cache of few-shot features and BLENDS its prediction with the zero-shot classifier, which is training-free in its base form. The key idea in this family is using the zero-shot classifier as a PRIOR so that a handful of examples adjusts rather than replaces it. FULL FINE-TUNING: thousands of labels. Highest ceiling, and the most ways to go wrong. THE CROSSOVER POINTS, roughly. Zero-shot is beaten by a linear probe at around 4-16 examples per class on typical benchmarks, though the exact point depends heavily on how well the domain matches CLIP's pretraining - on a domain CLIP knows well, zero-shot holds up longer; on satellite or medical imagery, a probe wins almost immediately because zero-shot is poor there anyway. Few-shot methods beat plain probes in the 1-8 shot range, where the zero-shot prior is doing real work; above ~16 shots the advantage shrinks. THE NON-OBVIOUS TRADE, which is where the interesting content is. FINE-TUNING DEGRADES ROBUSTNESS. CLIP's zero-shot classifier is unusually robust to distribution shift - it holds up on ImageNet-R, ImageNet-Sketch, and ObjectNet far better than supervised models. Fine-tuning on ImageNet improves in-distribution accuracy and DESTROYS much of that robustness, because fine-tuning distorts the pretrained features to fit the target distribution. This is the same feature-distortion mechanism as LP-FT in NLP. The fix is WiSE-FT: linearly interpolate the fine-tuned weights with the original zero-shot weights, w = alpha*w_ft + (1-alpha)*w_zs. Remarkably this often improves BOTH in-distribution and out-of-distribution accuracy at intermediate alpha - you are not trading, you are recovering something fine-tuning threw away. Anyone fine-tuning CLIP should be doing this; it costs one line. HOW I WOULD CHOOSE. No labels or a runtime-variable label set: zero-shot. A handful of labels and a need for speed: linear probe, always, because it takes minutes and establishes whether anything more is warranted. 1-8 shots and you want the last points: a few-shot adapter that uses the zero-shot prior. Thousands of labels and a stable task: fine-tune, with WiSE-FT. Deployment under distribution shift: keep the zero-shot classifier in the mix regardless, because its robustness is a real asset. THE HABIT I WOULD PUSH: always report the linear probe. It is nearly free, and if a fine-tune does not clearly beat a probe on frozen features, the fine-tune is not earning its complexity, its training cost, or its robustness loss."
        },
        {
          "q": "Why is CLIP bad at counting and spatial relations?",
          "a": "THE OBSERVATION. CLIP struggles with 'three dogs' versus 'two dogs', with 'a cat to the left of a dog', and with attribute binding ('a red cube and a blue sphere'). It behaves closer to a BAG OF CONCEPTS than a compositional model, and the ARO and Winoground benchmarks were built to measure exactly this - Winoground pairs differ only in word ORDER with the same words, and CLIP-family models perform near chance on it. THE REASONS, and they stack. (1) THE TRAINING SIGNAL DOES NOT REQUIRE IT. Contrastive learning asks the model to pick the matching caption from a batch of mostly UNRELATED alternatives. If the batch contains a dog photo, a car photo, and a beach photo, recognizing which concepts are present is entirely sufficient - you never need to know how many or where. The model learns exactly what the task demands, and the task is easy. Hard negatives that differ only in count or arrangement essentially never occur in a random batch, so there is no gradient pressure toward compositionality. (2) THE CAPTIONS RARELY SPECIFY IT. Web alt-text says 'dogs playing in a park', not 'three dogs, two on the left'. Counting and spatial language are sparse in the training distribution, so even a model capable of learning them has little to learn from. (3) THE POOLED EMBEDDING DISCARDS STRUCTURE. CLIP compresses an image to a single vector. A single vector can encode which concepts are present; encoding their count and arrangement compositionally in a fixed vector is much harder, and nothing rewards it. This is a genuine architectural limitation of dual-encoder designs. (4) THE TEXT TOWER IS ORDER-INSENSITIVE IN PRACTICE. Studies have shown CLIP's text encoder gives similar embeddings to shuffled captions, which is the direct signature of bag-of-words behaviour. WHAT FIXES IT, and how well. (a) HARD NEGATIVES IN TRAINING: construct captions that differ only in count, order, or attribute binding and use them as negatives. NegCLIP does this and substantially improves compositional benchmarks - which confirms the diagnosis, since supplying the missing gradient pressure supplies the missing capability. (b) CROSS-ATTENTION ARCHITECTURES: models that let text tokens attend to image regions (BLIP, and the whole VLM family) handle composition far better than dual encoders, because the interaction happens before pooling rather than after. This is the strongest structural fix and it costs the ability to precompute embeddings, which is why dual encoders survive for retrieval. (c) GENERATIVE VLMs with a language model on top do better again, because generation forces the model to produce a specific description rather than to rank. (d) Explicit region-level supervision. WHAT I WOULD TAKE FROM THIS. The failure is not mysterious and it is not about scale. It is a direct consequence of an objective that asks for RANKING among easy negatives, and a representation that pools before comparing. That is the module's recurring point: the objective determines the capability, and 'the model does not do X' usually means 'nothing in training required X'. It also explains the architectural split in the field - dual encoders for retrieval where precomputation matters, cross-attention or generative models where compositional understanding matters, and increasingly a two-stage funnel using both."
        },
        {
          "q": "How would you evaluate whether a zero-shot classifier is good enough to deploy?",
          "a": "THE FIRST THING I WOULD ESTABLISH is what 'good enough' means in decision terms, because zero-shot accuracy on a benchmark is not it. What action follows the prediction, what does a mistake cost, and is there a human in the loop? Those determine the metric and the operating point. THE EVALUATION I WOULD BUILD. (1) A REAL LABELLED TEST SET from your own distribution, hand-labelled, a few hundred to a few thousand examples. There is no substitute, and 'we have no labels' is not a reason to skip it - you need labels for EVALUATION even when you do not need them for training, and this is the most common corner cut in zero-shot projects. (2) PER-CLASS BREAKDOWN, always. Zero-shot accuracy is wildly uneven across classes, far more so than a supervised model's, because it depends on how well each class name is represented in the pretraining distribution. An aggregate of 78% routinely hides a third of the classes near zero. Report per-class recall and precision and look at the worst ones. (3) CALIBRATION. CLIP's softmax over the class embeddings, scaled by its learned temperature, is not calibrated for your task. If you intend to threshold on confidence - to route to a human, or to abstain - you must fit a calibration map on held-out data and check the reliability diagram. A well-ranked but badly-calibrated classifier is fine for ordering and dangerous for thresholding. (4) THE RISK-COVERAGE CURVE rather than a single accuracy. Plot accuracy on the retained subset against the fraction retained as you raise the confidence threshold. This is the deployment-relevant view: it tells you 'we can auto-classify 60% of traffic at 95% accuracy and route the rest', which is an actual product decision. (5) THE BASELINES that make the number interpretable: majority class, a random classifier, and - if any labels exist at all - a linear probe on the same features. If a 16-shot probe beats zero-shot substantially, the honest recommendation is to spend a week labelling rather than to deploy zero-shot. (6) ROBUSTNESS CHECKS: performance on the harder slices you expect in production - unusual lighting, occlusion, low resolution, the long tail of your catalogue. And a check on PROMPT SENSITIVITY: re-run with different templates and see how much the number moves. If it swings by several points, your reported figure is partly a prompt-selection artifact, and note that choosing prompts on your test set is test-set fitting. THE FAILURE MODES SPECIFIC TO ZERO-SHOT that I would look for by hand. Class-name ambiguity producing systematic confusions. Classes that are semantically close in text space but visually distinct (or the reverse). Classes absent from the pretraining distribution, which fail completely rather than gracefully. And the absence of an 'other' option - a zero-shot classifier over K classes will confidently assign one of them to an image belonging to none, so if your production stream contains out-of-taxonomy inputs you need an explicit rejection mechanism, which the standard setup does not provide. WHAT I WOULD RECOMMEND IN THE WRITE-UP: deploy zero-shot behind a confidence threshold with human review for the remainder, log everything, use the logged human decisions as labels, and plan to replace it with a probe or a fine-tune within a quarter. Zero-shot is an excellent way to start a system and rarely the right way to run one."
        },
        {
          "q": "What is prompt learning, and when is it worth it over hand-written prompts?",
          "a": "THE IDEA. Instead of writing 'a photo of a {}', LEARN the context tokens. CoOp (Context Optimization) replaces the hand-written words with continuous learnable vectors placed around the class-name token, freezes both encoders, and optimizes only those vectors with a few labelled examples. The class name stays as real text so the method still generalizes across classes; only the surrounding context is learned. WHY IT WORKS. Hand-written prompts are a discrete search over a space you cannot explore systematically - people try a dozen templates and pick the best on a validation set, which is both crude and a form of fitting. Learned context does gradient descent in a continuous space and finds prompts that no one would write, because they are not words. The gains are consistent: CoOp reports substantial improvements over hand-crafted prompts in the 1-16 shot regime across many datasets, with the largest gains on specialized domains where generic templates fit worst. THE PROBLEM, and it is the interesting part. CoOp OVERFITS TO THE CLASSES IT WAS TRAINED ON. Learn context on the base classes of a dataset and evaluate on unseen classes from the same dataset, and performance can fall BELOW hand-written prompts. The learned context has absorbed dataset-specific information rather than a general way of describing images, which defeats the point of using CLIP - you have traded away the open-vocabulary property to gain a few points on a closed set. CoCoCoOp's answer is to make the context CONDITIONAL on the image: a small network produces an instance-specific shift to the context vectors, which generalizes much better to unseen classes at some cost in the base-class accuracy. That base-versus-new trade-off is the central tension in this literature and is worth being able to state. WHEN IT IS WORTH IT. (1) You have a FIXED, CLOSED label set and a few labelled examples per class - then class overfitting is not a cost you care about, and the gains are real. (2) A SPECIALIZED DOMAIN where generic templates are a poor fit and you cannot easily guess better wording - satellite imagery, medical, industrial. (3) Extremely LOW-SHOT settings (1-8 per class), where a linear probe is unstable but the prompt has few enough parameters to fit reliably. WHEN IT IS NOT. (1) If the label set must stay OPEN - the whole reason to use CLIP - prefer hand-written prompts or CoCoOp. (2) If you have more than ~16 examples per class, a linear probe or an adapter is simpler, faster, and usually at least as good. (3) If interpretability matters: hand-written prompts can be read and debugged; learned vectors cannot, and when they fail you have no handle on why. (4) If you have essentially no labels, since prompt learning is still supervised - it needs examples, so it is not a zero-shot method despite living in the zero-shot literature. HOW I WOULD FRAME IT: prompt learning is PEFT for the text tower - a tiny number of parameters adapting a frozen model, exactly analogous to prompt tuning in NLP and subject to the same trade. And the practical baseline it must beat is not 'a bad hand-written prompt' but 'an ensemble of reasonable hand-written prompts plus a linear probe', which is cheap and strong. Many reported gains shrink against that comparison, so I would insist on running it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "CLIP zero-shot classification",
        "back": "Embed each class name in a prompt template, embed the image, take the nearest text embedding. The stacked class embeddings ARE a linear classifier's weight matrix - the text encoder computed the weights instead of gradient descent."
      },
      {
        "type": "pitfall",
        "front": "The modality gap",
        "back": "Image and text embeddings occupy SEPARATE cones. An image scores ~0.30 against its own caption and ~0.60 against a random unrelated image. The contrastive loss only constrains RANKING, never absolute overlap - and the gap exists at random init (the cone effect)."
      },
      {
        "type": "pitfall",
        "front": "Never threshold a raw CLIP score",
        "back": "0.31 does not mean '31% match' - there is no absolute scale, and the right value shifts with prompt, domain, and checkpoint. Rank within a like-for-like comparison, or calibrate per query."
      },
      {
        "type": "intuition",
        "front": "Prompt engineering is worth real points",
        "back": "ImageNet zero-shot: 'a photo of a {}' = +1.3% over the bare name; an 80-template ensemble = +3.5%. Average EMBEDDINGS (normalize each, mean, renormalize), not probabilities. The text side is cached, so it is free at inference."
      },
      {
        "type": "pitfall",
        "front": "Class-name ambiguity",
        "back": "'Crane' (bird/machine), 'boxer' (dog/fighter), 'mouse' (animal/device). These look like vision failures and are LABEL ambiguity - rewriting the class string fixes them. Highest-return fix on a real product taxonomy."
      },
      {
        "type": "intuition",
        "front": "Zero-shot loses to almost any supervision",
        "back": "A linear probe on frozen CLIP features beats zero-shot at roughly 4-16 examples per class, and trains in seconds. Zero-shot's genuine niche is NO data, or a label set that changes at runtime."
      },
      {
        "type": "definition",
        "front": "WiSE-FT",
        "back": "Interpolate fine-tuned and zero-shot weights: w = alpha*w_ft + (1-alpha)*w_zs. Fine-tuning destroys CLIP's distribution-shift robustness; interpolation recovers it and often improves ID accuracy too. One line - always do it."
      },
      {
        "type": "pitfall",
        "front": "Why CLIP can't count or bind attributes",
        "back": "Contrastive batches contain UNRELATED negatives, so recognizing which concepts are present always suffices - counting and arrangement get no gradient pressure. Plus captions rarely specify them and pooling to one vector discards structure. NegCLIP's hard negatives confirm the diagnosis."
      },
      {
        "type": "intuition",
        "front": "'Zero-shot' overstates the claim",
        "back": "It means no TASK-SPECIFIC supervision, not no exposure. With 400M web pairs the training data plausibly contains near-duplicates of benchmark content - the CLIP paper's own overlap analysis is the honest treatment."
      },
      {
        "type": "definition",
        "front": "CoOp / prompt learning",
        "back": "Learn the context tokens around the class name as continuous vectors with a few labels; both encoders stay frozen. PEFT for the text tower. Beware: it OVERFITS to the trained classes and can fall below hand-written prompts on unseen ones - CoCoOp conditions on the image to fix this."
      },
      {
        "type": "pitfall",
        "front": "Zero-shot has no 'other' class",
        "back": "A K-way zero-shot classifier confidently assigns one of the K classes to an image belonging to NONE. If production contains out-of-taxonomy inputs you must add an explicit rejection mechanism - the standard setup provides none."
      },
      {
        "type": "intuition",
        "front": "Report per-class, not aggregate",
        "back": "Zero-shot accuracy is far more uneven across classes than a supervised model's, because it tracks how well each class name is represented in web alt-text. An aggregate of 78% routinely hides a third of classes near zero."
      }
    ],
    "refs": [
      {
        "title": "Radford et al. (2021), Learning Transferable Visual Models From Natural Language Supervision (CLIP)",
        "url": "https://arxiv.org/abs/2103.00020"
      },
      {
        "title": "Liang et al. (2022), Mind the Gap: Understanding the Modality Gap in Multi-modal Contrastive Representation Learning",
        "url": "https://arxiv.org/abs/2203.02053"
      },
      {
        "title": "Wortsman et al. (2022), Robust fine-tuning of zero-shot models (WiSE-FT)",
        "url": "https://arxiv.org/abs/2109.01903"
      },
      {
        "title": "Zhou et al. (2022), Learning to Prompt for Vision-Language Models (CoOp)",
        "url": "https://arxiv.org/abs/2109.01134"
      },
      {
        "title": "Yuksekgonul et al. (2023), When and Why Vision-Language Models Behave Like Bags-of-Words (ARO)",
        "url": "https://arxiv.org/abs/2210.01936"
      }
    ],
    "demos": [
      "embeddings",
      "contrastive-learning",
      "vector-search",
      "knn"
    ]
  },
  "siamese": {
    "level": "core",
    "body": {
      "intuition": [
        "Classification needs a fixed set of classes with examples of each. Some problems do not fit that shape at all: face verification, where a new employee joins tomorrow and you have one photo; signature matching; near-duplicate detection; product matching across catalogues. What these share is that the question is not 'which of K classes is this' but 'are these two things the same'. METRIC LEARNING answers that directly - learn an embedding in which distance means similarity, and then the decision is a threshold rather than a classifier.",
        "A SIAMESE network is the architecture: run both inputs through the SAME network with SHARED WEIGHTS and compare the outputs. Weight sharing is not an implementation convenience, it is the point - it guarantees the two branches compute the same function, so the comparison is meaningful and the embedding is symmetric. Feed it pairs with a contrastive loss (pull same together, push different apart beyond a margin) or TRIPLETS with an anchor, a positive, and a negative, asking that the anchor be closer to the positive than to the negative by a margin.",
        "The margin is what stops the trivial solution. Without it, mapping every input to a single constant satisfies 'same things are close' perfectly and is useless - the same collapse that haunts every negative-free representation method. But the margin creates a second problem that dominates practice: once training gets going, MOST TRIPLETS ARE ALREADY SATISFIED and contribute exactly zero gradient. With N examples there are O(N^3) triplets and the overwhelming majority are uninformative, so a naive implementation spends almost all its compute on examples it has already learned. Everything interesting about training these models is MINING - choosing which triplets to look at - and the counterintuitive finding is that mining the HARDEST negatives causes collapse, which is why FaceNet used semi-hard ones instead."
      ],
      "math": [
        {
          "h": "Contrastive loss: pairs with a margin on the negatives",
          "paras": [
            "For a pair with label y = 1 (same) or 0 (different), pull same-pairs together with no lower bound and push different-pairs apart only until they exceed a margin. The hinge on the negative term is what makes it finite - once a pair is far enough, stop caring."
          ],
          "tex": "\\mathcal{L} = y\\,d^2 + (1-y)\\,\\max(0,\\; m - d)^2, \\qquad d = \\lVert f(x_1) - f(x_2)\\rVert_2",
          "texNote": "Without the margin the negative term would push dissimilar pairs infinitely apart, which is unbounded and degenerate. With it, the loss only cares about violations - which is also why most pairs eventually contribute nothing."
        },
        {
          "h": "Triplet loss: a relative constraint, not an absolute one",
          "paras": [
            "The triplet formulation asks only that the anchor be CLOSER to the positive than to the negative, by a margin. That is a weaker and more useful requirement than fixing absolute distances, because it does not impose a global scale."
          ],
          "tex": "\\mathcal{L} = \\max\\Big(0,\\;\\lVert f(a)-f(p)\\rVert^2 - \\lVert f(a)-f(n)\\rVert^2 + \\alpha\\Big)",
          "texNote": "alpha ~ 0.2 with L2-normalized embeddings, where all distances lie in [0, 2]. Embeddings are normalized to the unit sphere precisely so the margin has a consistent meaning - without normalization the network can satisfy the margin by scaling everything up, which teaches nothing."
        },
        {
          "h": "Why mining dominates: the triplet count and the zero-gradient problem",
          "paras": [
            "The combinatorics are brutal and get worse as training succeeds. A triplet that already satisfies the margin contributes exactly zero gradient, so the fraction of useful work collapses over time."
          ],
          "tex": "|\\mathcal{T}| = O(N^3), \\qquad \\nabla\\mathcal{L} = 0 \\;\\;\\text{whenever}\\;\\; d(a,n)^2 - d(a,p)^2 > \\alpha",
          "texNote": "After a few epochs the ACTIVE fraction of randomly-sampled triplets typically falls below 1%. Batch composition therefore matters more than almost any other hyperparameter, and it is why the P-K sampling scheme (P identities, K images each) is standard."
        },
        {
          "h": "Semi-hard mining: the negative that is close but not too close",
          "paras": [
            "Hardest negatives - those closer to the anchor than the positive - produce large gradients that frequently point toward collapse, especially early and with noisy labels. FaceNet's answer selects negatives that violate the margin but are still FARTHER than the positive."
          ],
          "tex": "n^{\\star} = \\arg\\min_{n}\\;\\big\\{ d(a,n) \\;:\\; d(a,n) > d(a,p) \\big\\}, \\qquad d(a,p) < d(a,n) < d(a,p)+\\alpha",
          "texNote": "This is the informative band: hard enough to give gradient, not so hard that a mislabelled or genuinely ambiguous example dominates the update. The whole design is a variance-versus-signal trade on the negative."
        }
      ],
      "code": [
        {
          "h": "Batch-hard mining, which is what you should actually implement",
          "paras": [
            "Hermans et al. showed that mining WITHIN a well-constructed batch - hardest positive and hardest negative per anchor - outperforms elaborate offline mining schemes and is far simpler. The batch sampler is the real algorithm."
          ],
          "code": "import torch\n\n# P-K SAMPLING: P identities x K images each. This is the actual algorithm -\n# it guarantees every anchor has K-1 positives and (P-1)*K negatives IN BATCH.\n# P=18, K=4 (batch 72) is a common setting.\n\ndef batch_hard_triplet(emb, labels, margin=0.3):\n    emb = torch.nn.functional.normalize(emb, dim=1)\n    d = torch.cdist(emb, emb)                          # (B, B)\n    same = labels[:, None] == labels[None, :]\n    eye  = torch.eye(len(labels), dtype=torch.bool, device=emb.device)\n\n    # hardest POSITIVE: the same-identity example that is FARTHEST\n    hardest_pos = (d * (same & ~eye)).max(1).values\n\n    # hardest NEGATIVE: the different-identity example that is CLOSEST\n    hardest_neg = (d + 1e6 * same).min(1).values\n\n    return torch.relu(hardest_pos - hardest_neg + margin).mean()\n\n# WHY THIS BEATS OFFLINE MINING:\n#  * no separate mining pass over the dataset, so no stale embeddings\n#  * mining is against the CURRENT model, which is what you want\n#  * hardness is bounded by the batch, which acts as natural regularization -\n#    the hardest negative in a batch of 72 is rarely a pathological one\n#\n# THE TRAP: the batch SAMPLER is the algorithm. With random sampling, most\n# anchors have no positive in the batch at all and the loss is meaningless.\n# If your triplet model is not learning, check the sampler before the loss.",
          "caption": "Batch-hard mining with P-K sampling. The batch bounds how hard the mined negative can be, which is a natural regularizer that offline hardest-negative mining lacks - and the sampler, not the loss, is where implementations go wrong."
        },
        {
          "h": "Diagnosing a triplet model that will not train",
          "paras": [
            "Four numbers that identify essentially every failure mode in this family. The active-triplet fraction is the one people never log and always need."
          ],
          "code": "with torch.no_grad():\n    emb = torch.nn.functional.normalize(model(batch), dim=1)\n    d = torch.cdist(emb, emb)\n    same = labels[:, None] == labels[None, :]\n\n    active = (loss_per_triplet > 0).float().mean()      # fraction still learning\n    pos_d  = d[same & ~eye].mean()\n    neg_d  = d[~same].mean()\n    spread = emb.std(0).mean()                          # per-dimension spread\n\nprint(f\"active {active:.3f}  pos {pos_d:.3f}  neg {neg_d:.3f}  spread {spread:.4f}\")\n\n#  active ~0.00, pos~neg~0, spread~0 .... COLLAPSE. Every input maps to the\n#                                         same point. Usually caused by\n#                                         hardest-negative mining, too high a\n#                                         learning rate, or no margin.\n#  active ~0.00, pos < neg, healthy ..... converged, or the mining is too easy\n#                                         to find remaining violations\n#  active ~1.00 and stuck ............... margin too large, or labels are noisy\n#                                         enough that the task is unsatisfiable\n#  active 0.05-0.30 ..................... healthy training\n#\n# COLLAPSE IS THE CHARACTERISTIC FAILURE and it is silent in the loss - the\n# loss goes to exactly the margin and looks like it converged. Log the\n# embedding SPREAD every epoch; it is the only signal that separates\n# \"converged\" from \"collapsed\".",
          "caption": "Loss reaching the margin looks like convergence and is also what collapse looks like. Embedding spread and the active-triplet fraction are what distinguish them, and neither is in a default training log."
        }
      ],
      "useCases": [
        "Face verification and re-identification, where the identity set is open and grows continuously - the canonical application, and the one that produced FaceNet, batch-hard mining, and the margin-based softmax losses that superseded them.",
        "Signature, fingerprint, and biometric matching, and any one-shot or few-shot verification task where a new identity arrives with a single reference example and retraining is not an option.",
        "Product and entity matching across catalogues, near-duplicate detection, and plagiarism or copy detection, where the question is 'is this the same item' rather than 'what category is this'.",
        "Retrieval embeddings generally: the same machinery, with a contrastive rather than triplet loss, underlies modern text and image retrievers - the loss changed, the framing did not."
      ],
      "pitfalls": [
        "Mining the HARDEST negatives globally. It is the intuitive choice and it causes collapse - the hardest negatives are disproportionately mislabelled or genuinely ambiguous, so their large gradients push the model toward a degenerate solution. Use semi-hard, or batch-hard where the batch bounds the difficulty.",
        "Sampling batches randomly. With random sampling most anchors have no positive in the batch and the loss is meaningless. P-K sampling (P identities, K images each) IS the algorithm; if a triplet model is not learning, check the sampler before the loss.",
        "Not logging the ACTIVE TRIPLET FRACTION. After a few epochs the fraction of randomly-sampled triplets producing any gradient typically falls below 1%, so almost all compute is wasted - and nothing in the loss curve shows it.",
        "Mistaking collapse for convergence. When every embedding maps to the same point, the loss sits at exactly the margin and looks converged. Log the embedding standard deviation; it is the only signal that separates the two.",
        "Forgetting to L2-normalize the embeddings. Without normalization the network can satisfy any margin by scaling everything up, which teaches nothing about relative structure and makes the margin meaningless.",
        "Using accuracy to evaluate a verification system. The operating point is a threshold on distance, so report the ROC and the true-accept rate at a fixed false-accept rate (TAR@FAR) - a face system at 99% accuracy may be unusable at the false-accept rate a security application requires.",
        "Reaching for triplet loss by default in 2020s work. Margin-based softmax losses (ArcFace, CosFace) beat it substantially on face recognition, and InfoNCE-style losses with many negatives beat it for retrieval. Triplet loss is the right thing to UNDERSTAND and often not the right thing to use."
      ],
      "connections": [
        {
          "ref": "multimodal/simclr-byol",
          "text": "SimCLR is this idea with augmented views supplying the positives instead of labels, and InfoNCE using many negatives at once instead of one - the same geometry, a better-conditioned loss."
        },
        {
          "ref": "multimodal/clip",
          "text": "CLIP's contrastive loss is the cross-modal version: the positive is the matching caption and the negatives are the rest of the batch, which is why batch size mattered so much."
        },
        {
          "ref": "advanced-cv/image-retrieval",
          "text": "The embedding this lesson trains is exactly what a retrieval index stores, and the ANN search that follows is a separate engineering problem with its own recall trade-offs."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "Mining is a sampling problem: which of an enormous, highly imbalanced set of comparisons to spend gradient on, and the answer is neither uniform nor extreme."
        },
        {
          "ref": "advanced-cv/dino-mae",
          "text": "Representation collapse is the shared failure across all of this - triplet loss prevents it with a margin, contrastive methods with negatives, BYOL and DINO with asymmetry and centering."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a Siamese network?",
          "a": "Two (or more) branches with SHARED weights processing different inputs, compared at the output. Weight sharing guarantees both branches compute the same function, which is what makes the comparison meaningful."
        },
        {
          "q": "Why use metric learning instead of classification?",
          "a": "When the class set is open or grows - faces, products, signatures - or when you have one example per identity. The decision becomes a distance threshold rather than a fixed output layer."
        },
        {
          "q": "What is contrastive loss?",
          "a": "For a pair: pull same-label pairs together, push different-label pairs apart until they exceed a margin. The hinge means once a negative pair is far enough, it stops contributing."
        },
        {
          "q": "What is triplet loss?",
          "a": "max(0, d(a,p)^2 - d(a,n)^2 + alpha) over an anchor, positive, and negative. It constrains only the RELATIVE ordering, which is weaker and more useful than fixing absolute distances."
        },
        {
          "q": "Why is a margin necessary?",
          "a": "Without it, mapping every input to a constant satisfies 'same things are close' perfectly. The margin makes the trivial solution non-optimal - it is the anti-collapse term."
        },
        {
          "q": "Why L2-normalize the embeddings?",
          "a": "Otherwise the network can satisfy any margin by scaling all embeddings up, which teaches nothing. Normalizing to the unit sphere makes the margin's meaning consistent."
        },
        {
          "q": "Why does mining dominate triplet training?",
          "a": "There are O(N^3) triplets and a satisfied triplet contributes EXACTLY zero gradient. After a few epochs under 1% of random triplets are active, so almost all compute is wasted without mining."
        },
        {
          "q": "Why not mine the hardest negatives?",
          "a": "They are disproportionately mislabelled or genuinely ambiguous, and their large gradients push toward collapse. FaceNet used SEMI-hard negatives - violating the margin but still farther than the positive."
        },
        {
          "q": "What is batch-hard mining?",
          "a": "Within a batch, take the hardest positive and hardest negative per anchor. Simpler than offline mining, mines against the CURRENT model, and the batch naturally bounds how pathological the negative can be."
        },
        {
          "q": "What is P-K sampling?",
          "a": "Sample P identities and K images each, so every anchor has K-1 positives and (P-1)K negatives in batch. This sampler is the real algorithm - random sampling leaves most anchors without a positive."
        },
        {
          "q": "How do you detect embedding collapse?",
          "a": "The loss sits at exactly the margin and looks converged. Log the per-dimension embedding STANDARD DEVIATION - if it goes to zero, everything mapped to one point."
        },
        {
          "q": "Should you use triplet loss today?",
          "a": "Usually not. Margin-based softmax losses (ArcFace, CosFace) beat it for faces, and InfoNCE with many negatives beats it for retrieval. It is the right thing to understand and often not to use."
        }
      ],
      "standard": [
        {
          "q": "Explain triplet loss and why mining is the central difficulty.",
          "a": "THE LOSS. Take an anchor, a positive of the same identity, and a negative of a different one. Require that the anchor-positive distance be smaller than the anchor-negative distance by a margin alpha, and hinge at zero: L = max(0, d(a,p)^2 - d(a,n)^2 + alpha). Two design points are worth stating. It is a RELATIVE constraint - it never says how far apart anything should be in absolute terms, only which is closer - which is more appropriate than an absolute one because there is no natural scale for 'same person'. And embeddings are L2-NORMALIZED to the unit sphere, so distances live in [0, 2] and the margin has consistent meaning; without normalization the model satisfies any margin by inflating everything. WHY MINING DOMINATES, and this is really the whole subject. (1) COMBINATORICS: N examples give O(N^3) triplets. You cannot enumerate them and you must choose. (2) ZERO GRADIENT: the hinge means a triplet already satisfying the margin contributes EXACTLY nothing. Early in training most triplets are violated; after a few epochs the model has learned the easy structure and the active fraction of randomly-sampled triplets falls below 1%. So a naive implementation spends over 99% of its compute on examples it has already learned - the loss curve looks flat and it is not converged, it is starved. (3) The distribution of triplet difficulty is extremely skewed, so uniform sampling is close to the worst possible choice. THE MINING SPECTRUM, and the counterintuitive part. EASY negatives (already satisfying the margin) give no gradient. HARDEST negatives - the ones closest to the anchor, closer even than the positive - give the largest gradient and CAUSE COLLAPSE. FaceNet reported this directly: training on hardest negatives led to a degenerate solution early in training. The reason is that in any real dataset the hardest negatives are disproportionately LABEL NOISE (two photos of the same person labelled as different people) or genuinely ambiguous cases. Optimizing hard against those drags the whole embedding toward a constant. SEMI-HARD is FaceNet's answer: negatives that violate the margin but are still FARTHER from the anchor than the positive is - hard enough to give signal, not so hard as to be pathological. THE MODERN PRACTICE, which simplified this considerably. Hermans et al.'s 'In Defense of the Triplet Loss' showed that BATCH-HARD mining - within a batch, take the hardest positive and hardest negative for each anchor - outperforms elaborate offline schemes. Three reasons it works: it mines against the CURRENT model rather than stale offline embeddings; there is no separate mining pass; and crucially the BATCH BOUNDS THE DIFFICULTY - the hardest negative among 72 samples is much less likely to be pathological than the hardest among a million. That bounding is an accidental but important regularizer. It requires P-K SAMPLING (P identities, K images each), and I would emphasize that the SAMPLER is the algorithm: with random batches most anchors have no positive at all and the loss is meaningless. If a triplet model is not learning, check the sampler before touching the loss. WHAT I WOULD MONITOR: the active triplet fraction (healthy is roughly 5-30%), mean positive and negative distances, and the embedding standard deviation - because COLLAPSE LOOKS LIKE CONVERGENCE. When every embedding is identical the loss sits at exactly the margin and the curve flattens, which is indistinguishable from success in the loss alone. AND THE HONEST CODA: the field largely moved past triplet loss. Margin-based softmax losses (ArcFace, CosFace) treat this as classification with an angular margin and beat triplet loss substantially on face recognition, partly because they use ALL classes as implicit negatives every step and so sidestep mining entirely. InfoNCE does the same for retrieval with in-batch negatives. Triplet loss remains the clearest way to understand what metric learning is doing, and the mining story is a genuinely useful lesson about where the difficulty in a method actually lives.",
          "deepDive": {
            "q": "Why did margin-based softmax losses replace triplet loss for face recognition?",
            "a": "THE PROBLEM WITH TRIPLET LOSS AT SCALE. (1) MINING IS THE ENTIRE ENGINEERING PROBLEM - batch composition, hardness selection, and margin tuning all interact, and getting any of them wrong gives collapse or stalled training. (2) SLOW CONVERGENCE: each update sees a handful of comparisons, so information about the global structure of the embedding space arrives slowly. (3) It only ever enforces LOCAL constraints - this anchor closer to this positive than this negative - and never directly shapes the global geometry. THE ALTERNATIVE FRAMING. Train a classifier over the training identities with a softmax, then throw the classification head away and use the penultimate features as the embedding. This sounds crude and works surprisingly well, because a softmax over K classes implicitly contrasts each example against ALL K-1 other class centroids at every step - it is a much denser signal than one triplet. The catch is that plain softmax optimizes SEPARABILITY, not DISCRIMINABILITY: it only needs the classes to be separable, and gives no pressure toward large margins between them, so the features generalize poorly to identities never seen in training - which is the whole use case. THE FIX - ANGULAR MARGINS. Normalize both the feature and the class weight vectors, so the logit becomes the COSINE of the angle between them, scaled by a factor s. Then inject a margin into that angle for the true class, so the model must push the correct class not merely to the top but past a margin. The variants differ in where the margin goes: SPHEREFACE multiplies the angle (cos(m*theta)); COSFACE subtracts from the cosine (cos(theta) - m); ARCFACE adds to the angle (cos(theta + m)), which gives a constant linear margin on the hypersphere and is the cleanest geometrically. ArcFace is the usual default, with s ~ 64 and m ~ 0.5. WHY THIS BEATS TRIPLET LOSS. (1) NO MINING. Every example is contrasted against every class centroid every step - the hard-negative problem dissolves because you never choose. (2) DENSE SIGNAL: one forward pass gives K-1 comparisons instead of one. (3) GLOBAL GEOMETRY: the class weight vectors act as learned centroids distributed over the sphere, so the loss shapes the whole space rather than local neighbourhoods. (4) STABILITY: it is ordinary classification training, with none of triplet loss's collapse modes. (5) The margin is a single interpretable hyperparameter instead of a margin plus a mining strategy plus a batch scheme. THE COSTS, which are real. (a) You need CLASS LABELS for training - identities, not just pairs - so it does not apply when you only have same/different supervision. (b) The classification layer is K x d parameters, and with millions of identities that layer dominates memory, requiring partial-FC or sharded softmax tricks. (c) It assumes a fixed training identity set, though the learned EMBEDDING still generalizes to unseen identities, which is the point. (d) The scale s and margin m interact and need tuning. WHERE EACH IS STILL RIGHT: margin-softmax when you have identity labels and a large training set (face recognition, essentially always now). Triplet or contrastive when supervision is only PAIRWISE (this pair matches, this pair does not), when the label set is enormous and unstable, or in cross-modal settings where there are no shared classes - which is why CLIP is contrastive and not ArcFace. THE PATTERN WORTH NAMING: a hard SAMPLING problem was dissolved by changing the loss so that no sampling is needed. That move - replace 'choose good comparisons' with 'compare against everything cheaply' - recurs in noise-contrastive estimation, in full-softmax versus sampled-softmax debates, and in the shift from triplet to InfoNCE in self-supervised learning."
          }
        },
        {
          "q": "Design a face verification system for building access. What are the decisions?",
          "a": "THE TASK IS VERIFICATION, NOT IDENTIFICATION, and getting that straight first changes everything. Identification asks 'who is this among N enrolled people' - a 1:N search. Verification asks 'is this the person whose badge was presented' - a 1:1 comparison against one enrolled template. Verification is far easier and far safer, and for building access it is the right framing because the badge supplies the claimed identity. If the system must work badge-free, it becomes 1:N identification and the false-accept problem gets N times worse, which is a decision to make explicitly with the security owner rather than an implementation detail. THE PIPELINE. (1) DETECTION and landmark alignment - crop and warp the face to a canonical pose. This step matters more than people expect; alignment quality is a large fraction of end-to-end accuracy. (2) LIVENESS / ANTI-SPOOFING, which I would raise as the first-order concern rather than an add-on. A face recognition system with no liveness check is defeated by a printed photograph, and for physical access control that is the actual threat model, not embedding accuracy. Options span passive (texture and reflection analysis, which is cheap and beatable), active challenge-response (blink, turn), depth or infrared sensing (much stronger, needs hardware), and I would push for a depth or IR camera if the security requirement is real. (3) EMBEDDING with a pretrained face model - ArcFace-family, trained on a large public identity set. I would not train from scratch; the public models are strong and the data requirements are enormous. (4) COMPARISON against the enrolled template by cosine similarity, thresholded. THE OPERATING POINT IS THE CENTRAL DECISION and it belongs to the security owner, not to me. Report the ROC and pick a point by the FALSE ACCEPT RATE the application tolerates - for building access that might be 1 in 100,000 or lower, and at that FAR the true-accept rate might be 95%, meaning one in twenty legitimate attempts is rejected and needs a fallback. That trade must be stated in those terms. Reporting 'accuracy' here is close to meaningless: at a 1e-5 FAR, accuracy is dominated by the negative class and tells you nothing. And there must be a FALLBACK path (PIN, guard, badge-only) or the system fails closed on its own false rejections. THE FAIRNESS ISSUE, which is not optional. Face recognition systems have well-documented and large accuracy disparities across demographic groups - NIST's FRVT evaluations measured false-match rates varying by more than an order of magnitude across groups for many algorithms. A single global threshold therefore delivers different real security and different real inconvenience to different people. I would insist on measuring per-group TAR at the operating FAR on a representative evaluation set, reporting it, and treating a large disparity as a blocking issue rather than a footnote. This is the single most likely way the project causes harm. ENROLLMENT AND OPERATIONS. Multiple enrollment images per person if possible (different lighting, with and without glasses), template storage as embeddings with clear retention and deletion policy, re-enrollment when appearance changes, and a defined process for removing departed employees. And template PROTECTION: an embedding is biometric data, it cannot be reissued like a password, and a leaked template database is a permanent harm - so encryption at rest, no export, and consideration of cancellable-biometric schemes. WHAT I WOULD FLAG TO THE STAKEHOLDERS: the legal position (biometric data is specially regulated in many jurisdictions, with consent and notice requirements), the demographic disparity measurement, the liveness threat model, and the fallback path. Those four determine whether this should be built at all, and they are more consequential than any modelling choice in the system."
        },
        {
          "q": "How do you evaluate a metric-learning model?",
          "a": "THE FIRST THING is that the evaluation depends on the TASK the embedding serves, and the two main ones are measured completely differently. VERIFICATION (1:1, 'are these the same'). The output is a distance and the decision is a threshold, so the evaluation is a binary classifier's. Report the ROC curve, and specifically the TRUE ACCEPT RATE AT A FIXED FALSE ACCEPT RATE - TAR@FAR=1e-3, 1e-4, 1e-6, depending on the application. This is the only presentation that lets a stakeholder choose an operating point. Accuracy is close to useless here because the negative pairs vastly outnumber the positives, so a trivial 'always different' classifier scores well. Equal Error Rate is a common single-number summary and it hides which side of the trade you are on. IDENTIFICATION (1:N, 'who is this'). Rank-1 accuracy, and the CMC curve (cumulative match characteristic) showing accuracy at rank k. Crucially, distinguish CLOSED-SET (the query is guaranteed to be enrolled) from OPEN-SET (the query may be nobody), because open-set requires a rejection threshold and is far harder - most published rank-1 numbers are closed-set and overstate what deployment will do. RETRIEVAL, if the embedding serves search. Recall@k, mean average precision, and normalized discounted cumulative gain. Recall@1 is a common headline and Recall@k for larger k reflects a re-ranking pipeline better. THE EVALUATION-DESIGN ISSUES that decide whether any of these numbers mean anything. (1) THE SPLIT MUST BE BY IDENTITY, not by image. If the same person appears in train and test, you are measuring memorization. This is the single most common fatal error in metric-learning evaluation and it inflates results dramatically. (2) OPEN-SET REALISM: the test identities should be ones the model never saw, because that is the deployment condition. (3) THE NEGATIVE PAIR DISTRIBUTION determines the FAR axis. Pairs drawn from an easy population give optimistic numbers; the honest evaluation uses the hardest negatives you expect - same demographic, similar appearance, family members for faces. (4) SCALE: FAR of 1e-6 cannot be estimated from a thousand negative pairs. You need at least tens of millions of comparisons to measure a low FAR, and papers reporting 1e-6 from small test sets are extrapolating. THE ANALYSES I WOULD ADD BEYOND THE HEADLINE. PER-GROUP breakdown - by demographic, by capture condition, by image quality. Aggregate metrics hide large disparities and, for biometrics specifically, those disparities are the main harm channel. FAILURE-CASE REVIEW: look at the highest-scoring false accepts and the lowest-scoring false rejects by hand; they usually reveal a data or preprocessing problem rather than a modelling one. EMBEDDING HEALTH: the standard deviation across dimensions and the singular-value spectrum, which detect partial collapse that the task metrics can mask. And ROBUSTNESS to the perturbations you expect - compression, resolution, pose, occlusion, lighting. AND THE THING I WOULD SAY FIRST IN A REVIEW: report the operating point, not just the curve summary. 'TAR 97.2% at FAR 1e-5, measured on 40 million negative pairs with identity-disjoint splits' is a claim someone can act on. '99.6% accuracy' is not a claim about anything."
        },
        {
          "q": "Compare triplet loss with InfoNCE. Why did contrastive methods move to InfoNCE?",
          "a": "THE STRUCTURAL DIFFERENCE. Triplet loss compares an anchor against ONE positive and ONE negative. InfoNCE compares an anchor against one positive and MANY negatives simultaneously, in the form of a softmax cross-entropy: the positive should receive high probability among all the candidates in the batch. Written out, InfoNCE is -log[ exp(sim(a,p)/tau) / sum_j exp(sim(a,x_j)/tau) ]. WHY MANY NEGATIVES HELP, which is the core of the answer. (1) A DENSER SIGNAL PER UPDATE. One triplet gives one comparison; InfoNCE with batch size 256 gives 255 comparisons per anchor at essentially the same compute, because the negatives are already in the batch and the similarity matrix is one matrix multiply. That is a large difference in information per gradient step. (2) IT DISSOLVES THE MINING PROBLEM. With triplet loss you must CHOOSE a negative, and that choice is the whole difficulty - too easy gives no gradient, too hard causes collapse. With InfoNCE the softmax automatically WEIGHTS negatives by their difficulty: hard negatives get high probability mass and therefore large gradients, easy ones get almost none. You get adaptive hardness weighting for free, without selecting anything. This is the single most important advantage. (3) BETTER-CONDITIONED GRADIENTS: the softmax is smooth, whereas the triplet hinge is either fully on or fully off, which makes the effective batch size erratic. (4) A THEORETICAL GROUNDING - InfoNCE is a lower bound on the mutual information between the two views, which triplet loss has no analogue for. Whether that framing explains its success is debated, but it gave the area a common language. (5) THE TEMPERATURE tau is an interpretable and powerful knob: low tau sharpens the distribution and concentrates gradient on the hardest negatives, high tau spreads it. It is effectively a continuous hardness dial replacing a discrete mining strategy, which is a much better parameterization. THE COSTS. (1) INfoNCE benefits strongly from LARGE BATCHES, since the batch supplies the negatives - which is why SimCLR needed 4096 and why that was a real infrastructure requirement. MoCo's momentum queue exists precisely to decouple negative count from batch size, and CLIP's large-batch training is the same constraint. (2) FALSE NEGATIVES: in-batch negatives may actually be positives (two different images of the same class), and InfoNCE penalizes them regardless. With class labels available you can mask them; without labels, this caps representation quality and is a known limitation. (3) The temperature needs tuning and the results are sensitive to it. WHERE TRIPLET LOSS IS STILL RIGHT: when supervision is genuinely PAIRWISE and you cannot form batches with multiple positives; when memory forbids large batches; and when you need an explicit interpretable margin for an operating point. In practice those cases are uncommon. THE BROADER ARC, which is the point I would end on: the field moved from 'select good comparisons' (mining) to 'compare against everything and let the loss weight them' (softmax over many negatives), and then in the supervised face-recognition case to 'compare against every class centroid' (ArcFace). Each step removes a sampling decision by making the comparison cheaper and denser. That is a recurring and generalizable move - when a method's difficulty is concentrated in choosing what to compare, look for a formulation that compares against everything."
        },
        {
          "q": "What is representation collapse in metric learning, and how do the different methods prevent it?",
          "a": "THE FAILURE. Any objective of the form 'make similar things close' has a trivial global optimum: map every input to the SAME POINT. All distances are zero, similarity is perfect, and the representation carries no information. Every method that learns from similarity must include something that makes this solution unattractive, and comparing those mechanisms is one of the more illuminating tours of representation learning. THE MECHANISMS, family by family. (1) MARGINS AND NEGATIVES - contrastive and triplet loss. The margin term explicitly requires dissimilar pairs to be at least alpha apart, which the constant solution violates maximally. This is the most direct fix and the most obvious. Its weakness is that it depends on having good negatives, which brings the mining problem: with only easy negatives the constraint is satisfied trivially and provides no shaping, and with the hardest negatives the model collapses for a different reason - label noise dominating the gradient. (2) MANY NEGATIVES WITH A SOFTMAX - InfoNCE. Same principle, better conditioned: the loss requires the positive to beat all the negatives, and the softmax weights them by difficulty automatically. The failure mode shifts from collapse to FALSE NEGATIVES capping quality. (3) CLASS CENTROIDS WITH ANGULAR MARGINS - ArcFace and family. Collapse is impossible because the classification objective requires distinguishing K classes, and the angular margin additionally forces separation. Needs identity labels. (4) ASYMMETRY WITH STOP-GRADIENT - BYOL and SimSiam, which use NO negatives at all. An online network with an extra predictor head is trained to match a target network that receives no gradient. Remove either the predictor or the stop-gradient and it collapses immediately. Why this works is still not fully settled; the leading account is that predictor-plus-stop-gradient makes the dynamics resemble an alternating optimization in which the constant solution is not an attractor. Worth knowing as an honest 'it works and the theory is partial'. (5) CENTERING AND SHARPENING - DINO. Centering the teacher output prevents any dimension dominating but pushes toward UNIFORM; sharpening with a low temperature prevents uniformity but pushes toward a CONSTANT one-hot. The two failure modes point in opposite directions and cancel, so both are required - removing either collapses the model, which is a common reimplementation bug. (6) EXPLICIT STATISTICS - VICReg and Barlow Twins. Rather than preventing collapse implicitly, constrain the representation's statistics directly: VICReg adds a VARIANCE term requiring each dimension to maintain variance above a threshold, which forbids constancy by construction, plus a covariance term preventing redundancy. Barlow Twins pushes the cross-correlation matrix toward the identity. These are the most transparent about what they are doing, need no negatives, asymmetry, or momentum encoder, and cost a little peak performance. (7) GENERATIVE OBJECTIVES sidestep it entirely - a masked autoencoder cannot reconstruct pixels from a constant representation, so the failure mode does not exist. That is a real structural advantage of generative pretraining. THE DISTINCTION THAT MATTERS PRACTICALLY: there are TWO collapses. COMPLETE collapse (constant output) is obvious and is what the mechanisms above prevent. DIMENSIONAL collapse is subtler - the representation occupies a low-dimensional subspace, so it has not degenerated but is wasting capacity, and it degrades downstream performance while the training loss looks fine. Detect it by computing the SINGULAR VALUE SPECTRUM of a batch of embeddings; a rapidly decaying spectrum is the signature. Barlow Twins and VICReg address it directly through their decorrelation terms. That diagnostic is cheap and it is the kind of check that distinguishes someone who has trained these models from someone who has read about them - which is exactly why it comes up in interviews."
        },
        {
          "q": "You need to match products across two retail catalogues with no labelled matches. How would you approach it?",
          "a": "THE FIRST MOVE IS TO NOTICE THIS IS NOT PRIMARILY A VISION PROBLEM. Product catalogues have titles, descriptions, brands, categories, prices, and often identifiers - and text plus structured fields will get you further than images for most of the catalogue. I would build the text and structured baseline first, and I would say so before proposing embeddings, because leading with a Siamese network here would be solving the wrong problem. THE LADDER. (1) EXACT IDENTIFIERS. GTIN, UPC, EAN, MPN, ISBN. Where these exist and are populated they resolve matches perfectly and instantly. In most real catalogues coverage is partial and quality is uneven, but the covered fraction is free and should be handled before anything learned. Also check for format inconsistencies - leading zeros, check digits, hyphens - which cause spurious misses. (2) BLOCKING, which is the scalability decision and is easy to overlook. Two catalogues of a million items each give 10^12 pairs; you cannot score them all. Block by category, brand, or a cheap key so only plausible pairs are compared, then score within blocks. Getting blocking wrong caps recall no matter how good the matcher is, and it is where most of the engineering effort actually goes. (3) TEXT SIMILARITY on titles and descriptions: TF-IDF or BM25 as a baseline, then embedding similarity with a sentence encoder. Product titles are a peculiar dialect - abbreviations, model numbers, pack sizes, colour codes - so a general encoder underperforms and character-level or hybrid lexical-plus-dense matching is usually better. Model numbers in particular are where lexical matching beats embeddings decisively, since an embedding will happily treat 'XR-450' and 'XR-460' as near-identical and they are different products. (4) STRUCTURED FIELD AGREEMENT: brand, category, pack size, weight, price ratio. These are strong features and cheap. (5) IMAGES, which is where the Siamese network comes in - and it is genuinely useful, because the same product often has near-identical or literally identical vendor photography across catalogues. A pretrained embedding (CLIP, or a copy-detection model like DINOv2 or SSCD) plus approximate nearest-neighbour search finds those, and it works with NO training. Image matching is also the best signal when titles differ wildly between vendors, which is common. (6) COMBINE the signals in a scorer. With no labels, a hand-weighted rule over the strong signals gets you started. WHERE THE LABELS COME FROM, since 'no labelled matches' is the stated constraint but need not stay true. Bootstrap: high-confidence matches from identifiers and from near-identical images ARE labels, and they are plentiful and reliable enough to train a supervised matcher for the rest. This is the key unlock, and it converts an unsupervised problem into a weakly-supervised one within a day. Then use the trained matcher's uncertain cases to direct a small human labelling effort - a few thousand reviewed pairs go a very long way for entity matching. THE EVALUATION, which is harder than the modelling. Precision and recall on a hand-labelled sample, chosen by stratified sampling across confidence bands rather than uniformly (uniform sampling of 10^12 pairs finds essentially no positives). Report the precision-recall curve and choose the threshold from the business cost: a false match that merges two different products is usually far worse than a missed match, because it corrupts pricing and inventory downstream. I would also measure recall separately on the head and the long tail - head products match easily and dominate any aggregate. THE FAILURE MODES TO PLAN FOR: product VARIANTS (same model, different colour or size) are the hardest case and require deciding explicitly whether they count as matches, which is a business question not a modelling one; BUNDLES and multipacks; refurbished versus new; and stock photography shared across genuinely different products, which is the specific way image matching fails and the reason it must be combined with text rather than trusted alone."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Siamese network",
        "back": "Branches with SHARED weights processing different inputs, compared at the output. Weight sharing guarantees both compute the same function - that is what makes the distance meaningful, not an implementation convenience."
      },
      {
        "type": "definition",
        "front": "Triplet loss",
        "back": "max(0, d(a,p)^2 - d(a,n)^2 + alpha). A RELATIVE constraint - only which is closer, never absolute distances. Embeddings L2-normalized so the margin has consistent meaning (otherwise the model just scales everything up)."
      },
      {
        "type": "intuition",
        "front": "Why a margin at all",
        "back": "Without it, mapping every input to a CONSTANT satisfies 'similar things are close' perfectly and carries no information. The margin is the anti-collapse term, and every similarity-based method needs some equivalent."
      },
      {
        "type": "pitfall",
        "front": "Mining is the whole problem",
        "back": "O(N^3) triplets, and a satisfied triplet gives EXACTLY zero gradient. After a few epochs under 1% of random triplets are active - the loss curve looks flat and the model is starved, not converged. Log the ACTIVE FRACTION (healthy 5-30%)."
      },
      {
        "type": "pitfall",
        "front": "Hardest-negative mining collapses",
        "back": "The hardest negatives are disproportionately MISLABELLED or genuinely ambiguous, so their large gradients drag the embedding to a constant. FaceNet used SEMI-hard: violating the margin but still farther than the positive."
      },
      {
        "type": "definition",
        "front": "Batch-hard + P-K sampling",
        "back": "Sample P identities x K images; per anchor take the hardest in-batch positive and negative. Mines against the CURRENT model, no offline pass, and the BATCH BOUNDS the difficulty - an accidental but crucial regularizer. The sampler IS the algorithm."
      },
      {
        "type": "pitfall",
        "front": "Collapse looks like convergence",
        "back": "When all embeddings coincide, the loss sits at exactly the margin and the curve flattens - identical to success. Log the per-dimension embedding STANDARD DEVIATION; it is the only signal that separates them."
      },
      {
        "type": "intuition",
        "front": "Why InfoNCE beat triplet loss",
        "back": "Many negatives at once (one matmul), and the softmax AUTOMATICALLY weights them by difficulty - hard ones get the gradient, easy ones get none. Mining dissolves; temperature becomes a continuous hardness dial. Cost: needs large batches, and false negatives."
      },
      {
        "type": "definition",
        "front": "ArcFace / margin softmax",
        "back": "Normalize features AND class weights so logits are cosines, then add an angular margin to the true class. Contrasts against ALL K-1 class centroids every step - no mining at all. Beats triplet loss for faces; needs identity labels."
      },
      {
        "type": "pitfall",
        "front": "Verification metrics",
        "back": "Report ROC and TAR@FAR (1e-3 ... 1e-6), never accuracy - negatives swamp positives so 'always different' scores well. And a FAR of 1e-6 cannot be estimated from a thousand pairs; you need tens of millions of comparisons."
      },
      {
        "type": "pitfall",
        "front": "Split by IDENTITY, not by image",
        "back": "If the same person/product appears in train and test you are measuring memorization, and the inflation is dramatic. The single most common fatal error in metric-learning evaluation."
      },
      {
        "type": "intuition",
        "front": "Dimensional collapse",
        "back": "Not a constant output, but the embedding occupying a low-dimensional subspace - wasting capacity while the loss looks fine. Detect via the SINGULAR VALUE SPECTRUM of a batch of embeddings; fast decay is the signature."
      }
    ],
    "refs": [
      {
        "title": "Schroff et al. (2015), FaceNet: A Unified Embedding for Face Recognition and Clustering",
        "url": "https://arxiv.org/abs/1503.03832"
      },
      {
        "title": "Hermans et al. (2017), In Defense of the Triplet Loss for Person Re-Identification",
        "url": "https://arxiv.org/abs/1703.07737"
      },
      {
        "title": "Deng et al. (2019), ArcFace: Additive Angular Margin Loss for Deep Face Recognition",
        "url": "https://arxiv.org/abs/1801.07698"
      },
      {
        "title": "Hadsell et al. (2006), Dimensionality Reduction by Learning an Invariant Mapping",
        "url": "https://www.cs.toronto.edu/~hinton/csc2535_06/readings/hadsell-chopra-lecun-06.pdf"
      },
      {
        "title": "Musgrave et al. (2020), A Metric Learning Reality Check",
        "url": "https://arxiv.org/abs/2003.08505"
      }
    ],
    "demos": [
      "contrastive-learning",
      "embeddings",
      "knn",
      "tsne"
    ]
  },
  "simclr-byol": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Metric learning needs pairs, and pairs need labels. Self-supervised contrastive learning removes that requirement with one substitution: take TWO AUGMENTED VIEWS of the same image as a positive pair, and every other image in the batch as negatives. No annotation at all, and the resulting representations went from clearly-worse-than-supervised in 2018 to matching and then beating supervised pretraining on transfer by 2021.",
        "The most important thing to understand about this family is that THE AUGMENTATION IS THE OBJECTIVE. You are training the model to produce the same representation for two views, which means you are explicitly instructing it to be INVARIANT to whatever differs between them. Choose random cropping and you teach scale and position invariance. Add colour jitter and you teach colour invariance - which is exactly right for object recognition and exactly wrong if colour is diagnostic, as in histopathology or defect inspection. SimCLR's ablation makes this concrete and slightly alarming: cropping alone performs poorly, because two crops of the same image share a colour histogram and the model can match them on that shortcut without learning anything about content. Colour distortion is what closes the shortcut, and the crop-plus-colour PAIR is what makes the method work. Neither alone does.",
        "Then BYOL arrived and did the same thing with NO NEGATIVES AT ALL - just an online network with an extra predictor head trained to match a slowly-updated copy of itself, with a stop-gradient. That should collapse to a constant and it does not, which set off one of the more instructive episodes in recent ML: a widely-read blog post argued BYOL only worked because batch normalization was leaking implicit contrast between samples, and the BYOL authors replied with a version using group normalization and weight standardization that worked fine. The claim was wrong, the investigation was good science, and SimSiam then showed the momentum encoder was not needed either - stop-gradient plus predictor suffices. Collectively that told the field that preventing collapse is easier and stranger than anyone expected, and that the mechanism is still not fully understood."
      ],
      "math": [
        {
          "h": "NT-Xent: InfoNCE over augmented views",
          "paras": [
            "For a batch of N images, produce 2N views. Each view's positive is its counterpart; the other 2N-2 views are negatives. This is InfoNCE with a temperature, applied to a batch where the positive pairs are manufactured by augmentation."
          ],
          "tex": "\\ell_{i,j} = -\\log\\frac{\\exp\\!\\big(\\mathrm{sim}(z_i,z_j)/\\tau\\big)}{\\sum_{k=1}^{2N}\\mathbb{1}_{k\\neq i}\\exp\\!\\big(\\mathrm{sim}(z_i,z_k)/\\tau\\big)}, \\qquad \\mathrm{sim}(u,v)=\\frac{u^{\\top}v}{\\lVert u\\rVert\\lVert v\\rVert}",
          "texNote": "tau ~ 0.1-0.5 and it matters a great deal: low temperature concentrates gradient on the HARDEST negatives (an automatic hardness weighting that replaces triplet mining), high temperature spreads it. This is the continuous version of the mining decision."
        },
        {
          "h": "The projection head, and why you throw it away",
          "paras": [
            "SimCLR applies the contrastive loss not to the representation h but to a projection z = g(h) through a small MLP. After training the head is DISCARDED and h is used downstream - and h is substantially better than z for transfer, which is the surprising part."
          ],
          "tex": "h = f(\\tilde{x}) \\in \\mathbb{R}^{2048}, \\qquad z = g(h) = W_2\\,\\sigma(W_1 h) \\in \\mathbb{R}^{128}, \\qquad \\mathcal{L}\\text{ acts on } z",
          "texNote": "Linear evaluation on h beats z by more than 10 points. The interpretation: the head ABSORBS the invariances the loss demands - it discards colour, orientation, and crop information that the objective punishes but that downstream tasks may need. Keeping a layer between the loss and the representation protects the representation from the objective."
        },
        {
          "h": "BYOL: no negatives, and three pieces that must all be present",
          "paras": [
            "An online network with a PREDICTOR matches a target network that is an EMA of the online one and receives NO GRADIENT. Removing the predictor or the stop-gradient collapses it immediately; removing the EMA (SimSiam) does not."
          ],
          "tex": "\\mathcal{L} = \\big\\lVert \\overline{q_\\theta(z_\\theta)} - \\overline{z'_\\xi} \\big\\rVert_2^2, \\qquad \\xi \\leftarrow \\lambda\\xi + (1-\\lambda)\\theta, \\qquad \\mathrm{sg}[z'_\\xi]",
          "texNote": "The bar is L2 normalization; sg is stop-gradient. The asymmetry - only one branch has a predictor, only one receives gradient - is what makes the constant solution not an attractor. The mechanism is still not fully settled theoretically."
        }
      ],
      "code": [
        {
          "h": "SimCLR's augmentation ablation, which is the lesson",
          "paras": [
            "The single most useful experiment in this literature, because it shows the objective is a modelling decision rather than a preprocessing detail."
          ],
          "code": "# SimCLR's ImageNet linear-eval ablation (representative published numbers):\n#\n#   augmentation                        top-1\n#   crop only ......................... ~33%    <- the colour-histogram shortcut\n#   colour only ....................... ~26%\n#   CROP + COLOUR ..................... ~56%    <- the pair is what works\n#   + blur, flip, grayscale ........... ~64%\n#\n# Crop alone fails for a specific reason: two crops of the SAME image share a\n# colour histogram, so the model can match them on low-level colour statistics\n# without learning anything about content. Colour distortion destroys that\n# shortcut and FORCES the model to use structure. Neither augmentation alone\n# gets close; the composition is the method.\n\ntrain_tf = T.Compose([\n    T.RandomResizedCrop(224, scale=(0.2, 1.0)),\n    T.RandomHorizontalFlip(),\n    T.RandomApply([T.ColorJitter(0.8, 0.8, 0.8, 0.2)], p=0.8),   # STRONG\n    T.RandomGrayscale(p=0.2),\n    T.RandomApply([T.GaussianBlur(23)], p=0.5),\n    T.ToTensor(), T.Normalize(MEAN, STD),\n])\n\n# THE MODELLING CONSEQUENCE, which is the part to carry into your own domain:\n# you are declaring what the representation should IGNORE. Colour jitter is\n# correct for object recognition and WRONG for histopathology (stain colour is\n# diagnostic), for defect inspection (discolouration IS the defect), and for\n# any task where the augmented-away property is the label. Redesign the policy\n# to match the real acquisition variation in your domain - that is the main\n# modelling decision in this whole method, not the architecture.",
          "caption": "Crop alone reaches ~33% because two crops share a colour histogram and the model matches on that shortcut. Colour distortion closes it. The augmentation policy is not preprocessing - it is the specification of what the representation must ignore."
        },
        {
          "h": "BYOL, and the batch-norm story",
          "paras": [
            "The implementation is short; the interesting content is which pieces are load-bearing and how the field found out."
          ],
          "code": "def byol_step(x, online, target, predictor, tau=0.996):\n    v1, v2 = augment(x), augment(x)                     # two views\n\n    p1 = predictor(online(v1))                          # ONLY online has this\n    p2 = predictor(online(v2))\n    with torch.no_grad():                               # STOP-GRADIENT\n        t1, t2 = target(v1), target(v2)\n\n    loss = mse(norm(p1), norm(t2)) + mse(norm(p2), norm(t1))\n\n    for pt, po in zip(target.parameters(), online.parameters()):\n        pt.data = tau * pt.data + (1 - tau) * po.data   # EMA update\n    return loss\n\n# WHAT IS LOAD-BEARING (measured by ablation):\n#   remove the PREDICTOR ......... collapses immediately\n#   remove the STOP-GRADIENT ..... collapses immediately\n#   remove the EMA (tau -> 0) .... does NOT collapse (this is SimSiam)\n#\n# THE BATCH-NORM EPISODE, worth knowing as a piece of scientific practice:\n# a widely-read 2020 blog post argued BYOL only avoids collapse because\n# BatchNorm leaks information ACROSS samples in a batch, providing implicit\n# contrast - i.e. BYOL was secretly contrastive. Plausible, well argued, and\n# it was tested: the BYOL authors replaced BN with GROUP NORM + WEIGHT\n# STANDARDIZATION (no cross-sample interaction at all) and it still worked,\n# with careful initialization and learning-rate scaling.\n#\n# So BN is not the mechanism. What the episode actually established is that\n# collapse avoidance here is a DYNAMICS property of predictor + stop-gradient,\n# and that it is still not fully explained. Worth citing as an example of a\n# strong claim, a clean rebuttal, and a residual open question.",
          "caption": "Predictor and stop-gradient are load-bearing; the momentum encoder is not (which is SimSiam). The batch-norm hypothesis was plausible, testable, and falsified by swapping in group normalization - and the underlying mechanism remains unsettled."
        }
      ],
      "useCases": [
        "Pretraining on large unlabelled in-domain corpora before fine-tuning on a small labelled set - medical imaging, satellite, industrial inspection, microscopy - which is the highest-return step available when labels are the bottleneck and images are not.",
        "Learning retrieval and similarity embeddings without annotation, where the augmented-view positive replaces the labelled pair and the resulting space supports nearest-neighbour search directly.",
        "Domain adaptation by continued self-supervised pretraining from an existing checkpoint, which is far more practical than training from scratch and captures most of the benefit at a fraction of the compute.",
        "Beyond vision: the same recipe with domain-appropriate augmentations underlies contrastive learning for audio (SpecAugment-style views), time series, tabular data, and graphs - and the augmentation-design problem is the hard part in every case."
      ],
      "pitfalls": [
        "Copying ImageNet's augmentation policy into a domain where it encodes the wrong invariances. Colour jitter is correct for object recognition and destructive for histopathology, defect inspection, or any task where the augmented-away property IS the signal. The policy is the objective - redesign it for your data.",
        "Applying the contrastive loss directly to the representation with no projection head. The head absorbs the invariances the loss demands, and removing it costs over 10 points on linear evaluation because the representation itself gets stripped of information downstream tasks need.",
        "Using the projection output z downstream instead of the pre-projection representation h. The head exists to be discarded; z is optimized for the pretext task and h is what transfers.",
        "Treating the temperature as a minor hyperparameter. Low tau concentrates gradient on the hardest negatives and high tau spreads it - it is the continuous replacement for triplet mining, and results are genuinely sensitive to it.",
        "Ignoring the batch-size requirement. SimCLR's negatives come from the batch, so quality degrades sharply at small batch sizes; MoCo's momentum queue exists precisely to decouple negative count from batch size, and is the right choice on constrained hardware.",
        "Assuming false negatives are harmless. In-batch negatives frequently include other images of the same class, which the loss penalizes anyway - a structural ceiling on representation quality that supervised contrastive learning fixes when labels are available.",
        "Judging these methods by linear probing alone. MAE probes far worse than DINO and fine-tunes better; the two protocols measure linear separability versus adaptability, and they can rank methods oppositely. Report both and pick the one matching how you will use the model."
      ],
      "connections": [
        {
          "ref": "multimodal/siamese",
          "text": "This is metric learning with augmented views supplying the positives instead of labels, and InfoNCE's many negatives replacing triplet mining."
        },
        {
          "ref": "advanced-cv/dino-mae",
          "text": "The direct successors - DINO's centering-and-sharpening and MAE's masked reconstruction - along with the full collapse-prevention taxonomy and the linear-probe-versus-fine-tune split."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "Augmentation is usually a regularizer that buys only the variation it models; here it is promoted to being the objective itself, which makes the same design question much more consequential."
        },
        {
          "ref": "multimodal/clip",
          "text": "CLIP is the cross-modal version: the second 'view' is a caption rather than an augmentation, which is why it learns semantics that augmentation-based methods cannot."
        },
        {
          "ref": "neural-nets/regularization",
          "text": "The batch-norm controversy is a reminder that normalization layers can create cross-sample dependencies with real behavioural consequences - a general hazard, not just a BYOL curiosity."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is SimCLR's core idea?",
          "a": "Two augmented views of the same image are a positive pair; all other images in the batch are negatives. Train with InfoNCE. No labels required."
        },
        {
          "q": "What is NT-Xent?",
          "a": "Normalized temperature-scaled cross-entropy - InfoNCE over 2N augmented views with cosine similarity and a temperature tau, where each view's positive is its counterpart."
        },
        {
          "q": "Why does cropping alone fail?",
          "a": "Two crops of the same image share a colour histogram, so the model matches them on low-level colour statistics without learning content. Colour distortion closes that shortcut."
        },
        {
          "q": "What does the augmentation policy actually specify?",
          "a": "What the representation must be INVARIANT to. It is a modelling decision, not preprocessing - and copying ImageNet's policy into a domain where colour is diagnostic is actively harmful."
        },
        {
          "q": "What is the projection head for?",
          "a": "The contrastive loss acts on z = g(h), and the head is discarded afterwards. It ABSORBS the invariances the loss demands, protecting the representation h from being stripped of information."
        },
        {
          "q": "How much does the projection head matter?",
          "a": "Linear evaluation on h beats z by more than 10 points. Always use the pre-projection representation downstream."
        },
        {
          "q": "What does the temperature do?",
          "a": "Low tau concentrates gradient on the hardest negatives; high tau spreads it evenly. It is the continuous replacement for triplet mining, and results are sensitive to it."
        },
        {
          "q": "Why did SimCLR need large batches?",
          "a": "The negatives come from the batch, so more negatives means a denser signal. MoCo's momentum queue decouples negative count from batch size and is the fix on limited hardware."
        },
        {
          "q": "What is BYOL?",
          "a": "An online network with a PREDICTOR head trained to match an EMA target network under stop-gradient - with NO negatives at all. It should collapse and does not."
        },
        {
          "q": "Which BYOL components are load-bearing?",
          "a": "The predictor and the stop-gradient - removing either collapses it immediately. The EMA is NOT required; removing it gives SimSiam, which still works."
        },
        {
          "q": "What was the batch-norm controversy?",
          "a": "A blog post argued BYOL only worked because BatchNorm leaks cross-sample information, i.e. it was secretly contrastive. The authors falsified it with group norm plus weight standardization, which has no cross-sample interaction."
        },
        {
          "q": "What are false negatives here?",
          "a": "In-batch negatives that are actually the same class as the anchor. The loss pushes them apart regardless, which caps representation quality - supervised contrastive learning fixes it when labels exist."
        }
      ],
      "standard": [
        {
          "q": "Explain SimCLR and which of its components actually matter.",
          "a": "THE METHOD. Take an image, produce two augmented views, encode both, project through a small MLP, and apply InfoNCE where the two views of the same image are positives and all other views in the batch are negatives. No labels anywhere. THE FOUR COMPONENTS AND THEIR MEASURED CONTRIBUTIONS, which is where the substance is. (1) AUGMENTATION COMPOSITION - the largest single factor. SimCLR's ablation grid showed crop alone at roughly 33% linear-eval top-1, colour alone at 26%, and crop PLUS colour at 56%, rising to 64% with blur and flips. The interaction is the finding: neither alone works, and the reason crop alone fails is instructive - two crops of the same image share a colour histogram, so the model can match them on that low-level statistic and never learn content. Colour distortion removes the shortcut. This is a shortcut-learning story identical in structure to the NLI artifact and HANS results: the model finds the cheapest predictive signal, and your job is to remove the cheap ones. (2) THE PROJECTION HEAD - worth over 10 points, and the mechanism is counterintuitive. The loss is applied to z = g(h), and h is used downstream. Why does inserting a discardable layer help? Because the contrastive objective demands invariance to the augmentations, and information about colour, orientation, and crop is therefore actively HARMFUL to the loss. If the loss acts directly on h, that information is stripped from the representation you keep. Putting a head in between lets the head absorb the invariance requirement while h retains information downstream tasks may need. The general principle - keep a buffer between your pretext loss and the representation you plan to reuse - is one of the more transferable ideas in self-supervised learning. (3) LARGE BATCHES AND LONG TRAINING. Negatives come from the batch, so more is better; SimCLR used up to 8192 and trained for many hundreds of epochs. This was a genuine infrastructure requirement and a fair criticism of the method - MoCo's momentum queue exists precisely to decouple negative count from batch size and is the practical answer on limited hardware. (4) TEMPERATURE, which controls hardness weighting: low tau concentrates gradient on the hardest negatives, high tau spreads it. It is the continuous replacement for triplet mining and the results are genuinely sensitive to it. WHAT I WOULD EMPHASIZE ABOUT ALL OF THIS: the augmentation policy IS the objective. You are stating, explicitly, which transformations the representation must ignore. That is a modelling decision about your domain, and copying ImageNet's policy into histopathology (where stain colour is diagnostic) or defect inspection (where discolouration is the defect) instructs the model to discard the signal. I would ask about the domain's real acquisition variation before touching anything else. THE LIMITATIONS worth stating. False negatives - other images of the same class treated as negatives - cap quality structurally, and supervised contrastive learning fixes this when labels exist. The compute requirement is substantial. And the invariances learned are only those the augmentations model, so the representation can be blind to variation the policy never introduced."
        },
        {
          "q": "How does BYOL avoid collapse without negatives, and what did the batch-norm debate establish?",
          "a": "THE PUZZLE. BYOL trains an online network to predict the output of a target network on a different augmented view of the same image. There is no negative term. The obvious global optimum is for both networks to output a CONSTANT for every input - the prediction is then perfect and the representation is worthless. It does not collapse, and the reason is genuinely not obvious. THE THREE COMPONENTS, and their measured necessity. (1) The PREDICTOR - an extra MLP applied only to the ONLINE branch, creating an architectural ASYMMETRY between the two sides. (2) The STOP-GRADIENT on the target branch, so gradients flow through only one path. (3) The EMA (momentum) update of the target from the online network. Ablations show removing the predictor collapses immediately, removing the stop-gradient collapses immediately, and removing the EMA does NOT collapse - which is SimSiam's contribution, and it was surprising because the momentum encoder had been assumed essential. THE LEADING EXPLANATION, offered with appropriate hedging because this is still open. The predictor plus stop-gradient makes the optimization resemble an ALTERNATING procedure, expectation-maximization-like: the online network chases a target that is itself slowly moving, and the predictor absorbs the residual difference between the two views' representations rather than forcing the encoder to make them identical. In that dynamical system the constant solution is not an attractor - the predictor can satisfy the objective without the encoder degenerating. There are also analyses showing the predictor's alignment with the encoder's feature covariance matters, and that a sufficiently well-conditioned predictor prevents dimensional collapse. Nobody has a complete account, and I would say so rather than overclaim. THE BATCH-NORM EPISODE, which is worth telling in full because it is good scientific practice. In 2020 a widely-read blog post argued that BYOL only avoids collapse because BATCH NORMALIZATION leaks information across samples: BN subtracts a batch mean, so each sample's normalized output depends on the OTHER samples in the batch, which is an implicit form of contrast. The claim was that BYOL was secretly contrastive and the 'no negatives' framing was misleading. It was plausible, well-argued, and specific enough to test. The BYOL authors tested it: they replaced BatchNorm with GROUP NORMALIZATION plus WEIGHT STANDARDIZATION - neither of which has any cross-sample interaction - and BYOL still worked, given careful initialization and learning-rate scaling. So the hypothesis was falsified. WHAT THE EPISODE ESTABLISHED, which is more than 'the blog post was wrong'. (a) BN is not the mechanism, though it does help optimization, which is why removing it naively degrades results and made the hypothesis look right. (b) Collapse avoidance is a DYNAMICS property of the predictor-plus-stop-gradient structure, not an implicit contrastive term. (c) The mechanism remains incompletely understood, which is an honest and unusual thing for the field to leave standing. (d) Methodologically it is a good example of a falsifiable claim being cleanly tested - the hypothesis made a specific prediction (remove cross-sample normalization and BYOL collapses) and the prediction failed. WHY IT MATTERS PRACTICALLY: negative-free methods removed the large-batch requirement that made SimCLR expensive, which is a real deployment advantage, and they avoid the false-negative problem entirely since there are no negatives to be wrong about. The costs are sensitivity to hyperparameters and a mechanism you cannot fully reason about when it goes wrong.",
          "deepDive": {
            "q": "How would you design an augmentation policy for a domain that is not natural images?",
            "a": "THE PRINCIPLE. In contrastive self-supervised learning the augmentation policy IS the objective - it declares which transformations the representation must ignore. So the design question is not 'what augmentations are standard' but 'what variation in my data is NUISANCE, and what is SIGNAL'. Getting this backwards trains the model to discard exactly what you need. THE PROCEDURE I would follow. STEP 1 - ENUMERATE THE REAL ACQUISITION VARIATION. What actually differs between two recordings of the SAME underlying thing in your domain? For medical imaging: scanner manufacturer, reconstruction kernel, slice thickness, patient positioning, contrast timing. For industrial inspection: lighting angle, camera pose, conveyor speed, part orientation. For satellite: season, time of day, atmospheric conditions, sensor. These are your candidate augmentations, because invariance to them is genuinely desirable - two scans of the same patient on different machines should embed similarly. STEP 2 - ENUMERATE WHAT IS DIAGNOSTIC AND MUST BE PRESERVED. This is the step that catches the expensive mistakes. In histopathology, STAIN COLOUR carries information and aggressive colour jitter destroys it (though stain NORMALIZATION as an augmentation is correct, because it targets the nuisance variation specifically). In defect inspection, DISCOLOURATION is often the defect. In radiology, absolute intensity is calibrated - CT Hounsfield units mean something physically - so intensity jitter is wrong in a way it is not for photographs. In remote sensing, ABSOLUTE SCALE is meaningful (a building is a fixed size) so aggressive random resizing is wrong, and ORIENTATION is arbitrary so rotation is fine - the exact opposite of natural images, where scale is arbitrary and orientation is meaningful. That inversion is a good illustration of how domain-dependent this is. STEP 3 - CHECK LATERALITY AND SPATIAL SEMANTICS. Horizontal flips are the default in vision and are WRONG whenever left and right differ - medical images (situs, laterality), text in images, and any domain with a canonical orientation. STEP 4 - LOOK FOR DOMAIN-SPECIFIC AUGMENTATIONS THAT MODEL REAL PHYSICS. This is where the biggest gains are and where generic recipes have nothing to offer. Simulate the actual corruption process: k-space undersampling for MRI, realistic noise models for low-dose CT, sensor noise and motion blur for cameras, room impulse responses and codec artifacts for audio, atmospheric effects for satellite. An augmentation that models a real corruption teaches a genuinely useful invariance; a generic one may teach nothing relevant. STEP 5 - EXPLOIT NATURAL POSITIVE PAIRS IF THEY EXIST, which is often better than any augmentation. Two views of the same patient at different times, two cameras of the same scene, two sensors over the same location, the same product photographed by two vendors. Real pairs encode the true nuisance distribution rather than your guess at it, and where available they should replace synthetic augmentation. This is arguably the single most valuable move and it is domain-specific enough that generic papers never mention it. STEP 6 - VALIDATE EMPIRICALLY, because reasoning gets you a shortlist and not an answer. Run the SimCLR-style ablation on your own data: train with each augmentation family alone and in combination, and evaluate on a small labelled downstream set. This is a few days of compute and it is the only way to know. Also check for SHORTCUTS - if your augmentations leave a cheap matching signal (a scanner-specific artifact, a border, a timestamp overlay), the model will use it, and the diagnostic is a representation that clusters by SITE or DEVICE rather than by content. Actually testing whether embeddings cluster by acquisition metadata is a cheap and revealing check that almost nobody runs. THE PRINCIPLE TO STATE AT THE END: for natural images the community's policy encodes decades of accumulated intuition about what does not change an object's identity. In a new domain that intuition does not transfer, and the policy is the main modelling decision in the method - more consequential than the architecture, the batch size, or the loss variant."
          }
        },
        {
          "q": "You have 500,000 unlabelled medical images and 2,000 labelled ones. Would you use SimCLR?",
          "a": "THIS IS EXACTLY THE REGIME SELF-SUPERVISION EXISTS FOR, and yes - with two substantial modifications and one prior step. THE PRIOR STEP: DO NOT TRAIN FROM SCRATCH. 500,000 images is far too few to learn a competitive representation from random initialization; SimCLR used ImageNet's 1.3M with hundreds of epochs, and DINOv2 used 142M curated images. Start from an existing checkpoint - a strong general vision model, or better a published medical-imaging foundation model if one exists for your modality - and do CONTINUED self-supervised pretraining on your 500,000. You inherit general visual competence and adapt it to your domain's statistics, at a fraction of the compute. This distinction between training from scratch and continued pretraining is the difference between a project that works and one that does not, and it is the most common mistake in this setup. MODIFICATION 1 - REDESIGN THE AUGMENTATION POLICY, which is the main modelling work. The standard policy encodes assumptions that are wrong here. Colour jitter is questionable to harmful: for histopathology, stain colour is diagnostic, and the right move is stain NORMALIZATION or stain-specific augmentation rather than generic jitter. For CT, intensity is CALIBRATED (Hounsfield units are physical), so intensity shifts corrupt meaning. Horizontal flips are wrong wherever laterality matters. Aggressive random cropping can crop out a small lesion entirely and then ask the model to match that crop to one containing it, which teaches the wrong invariance. What I WOULD include: realistic acquisition variation - noise models matched to the modality, mild geometric deformation, slice-thickness and resolution variation, scanner-simulation augmentations. And I would strongly consider MAE-style masked reconstruction instead of contrastive learning, because it makes no augmentation-invariance assumptions at all - it only requires that the image be predictable from itself, which is a much safer assumption in a domain where I am unsure which invariances are correct. That is a real argument for the generative family over the contrastive one in non-natural domains. MODIFICATION 2 - EXPLOIT NATURAL POSITIVE PAIRS, which medical data supplies unusually well and which beats synthetic augmentation. Two slices from the same volume, two views of the same study (CC and MLO in mammography), the same patient at different timepoints, or the same anatomy across modalities. These encode the true nuisance variation instead of my guess at it. Using patient identity to form positives (and, importantly, to EXCLUDE same-patient images from the negative set) is a well-established improvement in medical contrastive learning. THE EVALUATION DISCIPLINE, which decides whether any of this is real. Baselines first: fine-tune an ImageNet-pretrained model on the 2,000 labels, and run a linear probe on the same features. If that meets the requirement, stop. Then evaluate the self-supervised representation on the DOWNSTREAM task, not on the pretraining loss, which tells you almost nothing. Split by PATIENT and by SITE, never randomly - images from one patient are highly self-similar and a random split leaks catastrophically, which is the single most common fatal error in medical ML evaluation. With 2,000 labels the validation estimate is noisy, so use cross-validation and report confidence intervals. AND THE ALTERNATIVE I WOULD RAISE FIRST: if labelling more is possible at all, ACTIVE LEARNING on the 500,000 unlabelled images typically buys more than any pretraining change. Going from 2,000 to 3,000 well-chosen labels often beats a month of self-supervised engineering. I would want that comparison made explicitly before committing to the pretraining route, because it is the honest framing of where the value is."
        },
        {
          "q": "Why did self-supervised learning start beating supervised pretraining?",
          "a": "THE CLAIM IS NARROWER THAN IT SOUNDS and worth stating precisely: self-supervised representations transfer BETTER than supervised ImageNet pretraining on many downstream tasks, particularly dense prediction, low-shot learning, and out-of-domain transfer. It is a claim about TRANSFER, not about ImageNet classification itself. THE REASONS, in order of how much I think they contribute. (1) THE LABEL IS A LOW-BANDWIDTH TARGET. A 1000-way ImageNet label carries at most about 10 bits about an image containing millions. Supervised training only needs to preserve whatever distinguishes those 1000 classes, and everything else is free to be discarded - which is exactly what happens. Self-supervised objectives demand far more: to match two augmented views you need a rich representation of content, and to reconstruct masked patches you need to model structure the label never asked about. More demanded, more retained. (2) SUPERVISED TRAINING PERMITS SHORTCUTS. If a texture cue suffices to name the class, the model uses it and stops - the texture-bias result. Self-supervised targets are harder to game: another view's full representation, or the actual pixel content, cannot be satisfied by a single discriminative cue. This is the same shortcut-learning argument that runs through NLI artifacts and HANS, applied to pretraining objectives. (3) THE DATA CEILING IS REMOVED, and this is the structural advantage. ImageNet's 1.3M labels took years and enormous cost; you cannot scale that to 100M+. Self-supervision can use everything, and scale is what produces strong representations. DINOv2's 142M curated images is simply not achievable with human labels. (4) LABEL NOISE AND TAXONOMY ARTIFACTS. ImageNet's label set is idiosyncratic (120 dog breeds, no people category) and its labels contain real errors, so a supervised representation partly encodes those quirks. (5) SELF-SUPERVISED FEATURES ARE MORE SPATIALLY INFORMATIVE, which is why the gap is largest on detection and segmentation - global classification supervision provides little pressure to keep localized information, while masked and view-matching objectives do. WHERE THE CLAIM NEEDS QUALIFYING, because the honest version is less clean. (a) 'SELF-SUPERVISED' IS DOING A LOT OF WORK. CLIP's supervision is human-written alt text at web scale - weakly supervised, not label-free. DINOv2's training set was heavily CURATED by a retrieval pipeline, which is supervision applied to data selection rather than to labels. DATA CURATION has quietly become the important variable, and the supervised/self-supervised dichotomy is blurrier than the framing suggests. (b) COMPUTE IS RARELY NORMALIZED. Self-supervised methods often train far longer; the honest comparison is at matched compute and it is less lopsided. (c) SUPERVISED PRETRAINING REMAINS COMPETITIVE when you have a large in-domain labelled set and the downstream task is similar - the generality you buy is worth less if you only need one task. (d) The evaluation protocols disagree, as the linear-probe versus fine-tune split shows, so 'better' depends on which you report. WHAT I THINK THE HONEST SUMMARY IS: the field moved from 'labels are the supervision signal' to 'DATA is the supervision signal, and labels are one expensive way to extract it'. Self-supervision, weak supervision from text, and careful curation are all ways of getting more signal per unit of human effort, and they compose. The operational consequence for a practitioner is simple and worth stating plainly: start from a strong pretrained checkpoint, continue pretraining on your own unlabelled domain data if you have a meaningful amount, and spend your labelling budget on fine-tuning and evaluation rather than on building a pretraining corpus."
        },
        {
          "q": "What is supervised contrastive learning, and when would you use it over cross-entropy?",
          "a": "THE IDEA. Standard contrastive learning treats only augmented views of the SAME image as positives, which means two different images of the same class are treated as NEGATIVES and pushed apart - a false negative, and a structural limitation. Supervised contrastive learning (SupCon, Khosla et al.) uses the labels: all images of the same class in the batch are positives for each other, and only different-class images are negatives. So it is contrastive learning that knows about classes, or equivalently a classification objective expressed geometrically. THE LOSS generalizes InfoNCE to multiple positives, and the important implementation detail is where the sum over positives goes: putting it INSIDE the log performs noticeably worse than putting it outside, which the paper analyzes and which is an easy thing to get wrong. WHAT IT BUYS OVER CROSS-ENTROPY. (1) BETTER ROBUSTNESS. The reported gains are largest on corrupted and shifted data - ImageNet-C and similar - which suggests the representation is less reliant on brittle discriminative cues. (2) LESS SENSITIVITY TO HYPERPARAMETERS AND TO LABEL NOISE, since the objective is about geometry rather than fitting a specific decision boundary, and a mislabelled example is one bad positive among many rather than a hard constraint on a boundary. (3) A BETTER-STRUCTURED EMBEDDING SPACE, with tighter class clusters and larger margins, which helps if you also want the features for retrieval or few-shot use. (4) It composes naturally with a self-supervised pretraining stage using the same machinery. THE COSTS AND CAVEATS, which matter. (1) It needs LARGE BATCHES to have enough positives and negatives per class - the same constraint as SimCLR, and worse when there are many classes, since a batch of 256 over 1000 classes has very few same-class pairs. (2) It is a TWO-STAGE procedure in the standard recipe: train the encoder contrastively, then train a linear classifier on frozen features. More pipeline than a single cross-entropy run. (3) The reported gains over a WELL-TUNED cross-entropy baseline with modern augmentation and label smoothing are modest, and there has been reasonable debate about how much survives careful matched comparison. I would present it as a real but not transformative improvement. (4) It does not give calibrated probabilities directly; you get those from the second-stage classifier. WHEN I WOULD USE IT. When ROBUSTNESS to distribution shift or corruption is a stated requirement. When labels are NOISY, where its tolerance is a genuine advantage. When I want the embedding for BOTH classification and retrieval, since the geometry is better suited to nearest-neighbour use. And when I already have a contrastive pretraining pipeline and adding labels to it is cheap. WHEN I WOULD NOT. For a straightforward classification task with clean labels, adequate data, and no shift - cross-entropy with good augmentation is simpler, faster, one stage, and gives calibrated outputs. The added complexity should be justified by one of the specific advantages above, not adopted by default. THE FRAMING I FIND CLARIFYING: SupCon sits on a spectrum. Self-supervised contrastive uses only augmentation-based positives (no label information). SupCon uses class labels for positives. And ArcFace-style margin softmax uses class CENTROIDS rather than instance-level positives, which is the same information organized differently and is more efficient when classes are numerous. Which point on that spectrum is right depends on how much label information you have and how many classes there are - which is a more useful way to choose than treating them as competing methods."
        },
        {
          "q": "How do you evaluate a self-supervised representation, and what do the protocols miss?",
          "a": "THE STANDARD PROTOCOLS, and what each actually measures. (1) LINEAR PROBING: freeze the backbone, train one linear layer. Measures how LINEARLY SEPARABLE the representation already is - whether the semantic structure is present and directly accessible. Cheap, standardized, comparable across papers. (2) FINE-TUNING: train everything. Measures how good an INITIALIZATION the representation is, which is a different property. (3) k-NN CLASSIFICATION: classify by nearest neighbours with no training at all. The purest test of whether the embedding space is semantically organized, and parameter-free so there is nothing to tune away. (4) LOW-SHOT: probe or fine-tune with 1% or 10% of labels, closer to the regime self-supervision is actually for. (5) TRANSFER to other datasets and to DENSE tasks - detection, segmentation, depth - which tests generality rather than fit to one benchmark. WHAT THE PROTOCOLS MISS, which is the substance of the question. (a) THEY DISAGREE, AND THE DISAGREEMENT IS INFORMATIVE. MAE probes at roughly 68% and fine-tunes to 83.6%; DINO probes at 78% and fine-tunes to 82.8%. Ranking by one protocol gives the opposite answer to the other. A paper reporting only linear probing systematically favours joint-embedding methods; one reporting only fine-tuning favours generative ones. Reporting both is the minimum, and choosing the one matching your intended use is the actual decision. (b) IMAGENET-CENTRISM. Nearly all evaluation is on ImageNet or ImageNet-like data, and the methods' augmentations were tuned against it, so results transfer less well to medical, satellite, or industrial imagery than the numbers suggest. Domain-specific evaluation is essential and rarely done. (c) DENSE AND STRUCTURAL PROPERTIES go unmeasured by classification protocols. Whether features support dense correspondence, depth, or segmentation is a different question, and DINOv2's headline claim is precisely about dense tasks - which classification probing would not reveal. (d) ROBUSTNESS AND CALIBRATION under shift or corruption are generally not reported. (e) COMPUTE IS NOT NORMALIZED. Methods differ enormously in pretraining cost - MAE is roughly 3x faster per epoch than contrastive methods needing multiple views and large batches - so comparing final numbers without a budget is comparing different things. (f) THE PROTOCOLS HAVE THEIR OWN HYPERPARAMETERS: linear-probe results move by a point or two with the optimizer, learning rate, and whether features are normalized, so small cross-paper differences may be protocol noise. (g) WHICH LAYER you probe matters, and the last layer is often not best because it has specialized to the pretext objective. THE CONTROL EVERYONE SHOULD RUN AND ALMOST NOBODY DOES: a RANDOMLY INITIALIZED encoder of the same architecture. Random convolutional features are a surprisingly strong baseline, and if your pretrained model barely beats it, the pretraining did little. It costs one probe. WHAT I WOULD REPORT for an honest evaluation: linear probe AND k-NN AND fine-tuning; low-shot at 1% and 10%; at least one dense downstream task; transfer to a domain unlike the pretraining data; the random-init control; and all of it at a stated pretraining compute budget. AND THE PRACTICAL POINT THAT SHOULD DRIVE THE CHOICE: how will you USE the model? Frozen features for retrieval - k-NN and linear probe are the relevant numbers. Fine-tuning on a decent labelled set - fine-tuning accuracy matters and the linear probe is irrelevant. Dense prediction - evaluate on dense tasks. The most common evaluation error is optimizing a protocol that does not match the deployment, which is the same error as choosing the wrong metric anywhere else."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "SimCLR / NT-Xent",
        "back": "Two augmented views of an image are positives; all other batch views are negatives. InfoNCE with cosine similarity and temperature tau over 2N views. No labels required."
      },
      {
        "type": "pitfall",
        "front": "The augmentation IS the objective",
        "back": "Matching two views instructs the model to be INVARIANT to whatever differs between them. Colour jitter is right for object recognition and WRONG for histopathology (stain is diagnostic) or defect inspection (discolouration IS the defect)."
      },
      {
        "type": "intuition",
        "front": "Why crop alone fails (~33%)",
        "back": "Two crops of one image share a COLOUR HISTOGRAM, so the model matches on that shortcut without learning content. Colour distortion closes it: crop+colour ~56%. The composition is the method - neither alone works."
      },
      {
        "type": "definition",
        "front": "The projection head",
        "back": "Loss acts on z = g(h); h is used downstream and the head is DISCARDED. Probing h beats z by 10+ points because the head ABSORBS the invariances the loss demands, protecting h from being stripped."
      },
      {
        "type": "intuition",
        "front": "Keep a buffer between pretext loss and representation",
        "back": "The generalizable form of the projection-head result: the pretext objective punishes information downstream tasks may need, so put a discardable layer between them. Applies well beyond SimCLR."
      },
      {
        "type": "definition",
        "front": "BYOL",
        "back": "Online net + PREDICTOR trained to match an EMA target under STOP-GRADIENT. No negatives at all. Should collapse to a constant; does not. Removing predictor or stop-grad collapses it; removing the EMA does NOT (= SimSiam)."
      },
      {
        "type": "intuition",
        "front": "The BYOL batch-norm episode",
        "back": "A blog post argued BN leaks cross-sample info, making BYOL secretly contrastive. Testable, and falsified: group norm + weight standardization (no cross-sample interaction) still works. Mechanism remains an open question."
      },
      {
        "type": "pitfall",
        "front": "Temperature is not a minor knob",
        "back": "Low tau concentrates gradient on the HARDEST negatives; high tau spreads it. It is the continuous replacement for triplet mining, and results are genuinely sensitive to it."
      },
      {
        "type": "pitfall",
        "front": "False negatives cap quality",
        "back": "In-batch negatives often include other images of the same CLASS, and the loss pushes them apart anyway. A structural ceiling - SupCon fixes it when labels exist, by treating same-class images as positives."
      },
      {
        "type": "intuition",
        "front": "MoCo's momentum queue",
        "back": "SimCLR's negatives come from the batch, so quality degrades at small batch sizes. MoCo keeps a queue of past encoded samples, DECOUPLING negative count from batch size - the right choice on constrained hardware."
      },
      {
        "type": "pitfall",
        "front": "Probe and fine-tune can rank methods oppositely",
        "back": "MAE ~68% linear / 83.6% fine-tuned; DINO ~78% / 82.8%. Reporting only one systematically favours a family. Report both, plus k-NN, and pick the protocol matching how you will USE the model."
      },
      {
        "type": "intuition",
        "front": "The control nobody runs",
        "back": "A RANDOMLY INITIALIZED encoder of the same architecture. Random conv features are a surprisingly strong probe baseline - if your pretrained model barely beats it, the pretraining did little. Costs one probe."
      }
    ],
    "refs": [
      {
        "title": "Chen et al. (2020), A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)",
        "url": "https://arxiv.org/abs/2002.05709"
      },
      {
        "title": "Grill et al. (2020), Bootstrap Your Own Latent (BYOL)",
        "url": "https://arxiv.org/abs/2006.07733"
      },
      {
        "title": "Chen & He (2021), Exploring Simple Siamese Representation Learning (SimSiam)",
        "url": "https://arxiv.org/abs/2011.10566"
      },
      {
        "title": "He et al. (2020), Momentum Contrast for Unsupervised Visual Representation Learning (MoCo)",
        "url": "https://arxiv.org/abs/1911.05722"
      },
      {
        "title": "Khosla et al. (2020), Supervised Contrastive Learning",
        "url": "https://arxiv.org/abs/2004.11362"
      }
    ],
    "demos": [
      "contrastive-learning",
      "image-augmentation",
      "embeddings",
      "batch-norm"
    ]
  },
  "vlm-captioning": {
    "level": "advanced",
    "body": {
      "intuition": [
        "CLIP can tell you which of several captions matches an image. It cannot WRITE one, because a dual encoder only ranks. Generating language about an image needs a language model, and the entire modern vision-language field reduces to one engineering question: how do you get visual information INTO a language model that was trained on text?",
        "The answers form a short and instructive list. FLAMINGO interleaves cross-attention layers into a frozen LLM so text tokens attend to image features. BLIP-2 inserts a Q-Former - a small transformer with learned query tokens that extracts a fixed number of visual vectors and feeds them in as soft prompts. LLaVA does the simplest possible thing: a single LINEAR PROJECTION from the vision encoder's output space to the LLM's token embedding space, so image patches become 'tokens' the LLM reads alongside text. The striking result is that LLaVA's linear layer is competitive with the elaborate alternatives. What mattered far more than the connector was the DATA - instruction-following examples generated by prompting a strong text-only model with image annotations.",
        "The characteristic failure of these systems is OBJECT HALLUCINATION: the model confidently describes things that are not in the image. It is not random. Models hallucinate objects that CO-OCCUR with what is present - a caption mentioning a dining table when it sees a plate, a person when it sees a bicycle - because the language model's prior over plausible scenes is strong and the visual evidence is comparatively weak. The POPE benchmark exposes this brutally by simply asking 'is there a {object} in the image?' about objects chosen from co-occurrence statistics, and models that produce fluent, detailed captions answer yes to absent objects at high rates. That is the module's recurring diagnostic in a new costume: the model is producing plausible output without necessarily using the second modality, and only a test built to break the shortcut will tell you."
      ],
      "math": [
        {
          "h": "The connector: mapping vision features into token-embedding space",
          "paras": [
            "Whatever the architecture, the job is the same - turn a grid of visual features into something the language model can consume. The simplest version is a linear map into the token embedding space, so the image becomes a sequence of pseudo-tokens prepended to the text."
          ],
          "tex": "H_v = W\\,f_{\\mathrm{ViT}}(x) \\in \\mathbb{R}^{N\\times d_{\\mathrm{LLM}}}, \\qquad p(y) = \\prod_t p\\big(y_t \\mid H_v,\\, y_{<t}\\big)",
          "texNote": "N is the number of visual tokens (576 for a ViT-L/14 at 336px). Those tokens consume context and compute exactly like text tokens, which is why image resolution is expensive - it is a sequence-length problem, not a pixel problem."
        },
        {
          "h": "The visual token budget",
          "paras": [
            "Resolution is the binding constraint in practice, and the arithmetic explains why. Patch count grows quadratically with side length, and attention cost grows quadratically with token count."
          ],
          "tex": "N = \\left(\\frac{H}{p}\\right)\\!\\left(\\frac{W}{p}\\right), \\qquad 336^2/14^2 = 576 \\;\\to\\; 1008^2/14^2 = 5184 \\;(9\\times)",
          "texNote": "Tripling the side length gives 9x the tokens and roughly 81x the attention cost within the image block. This is why VLMs read small text poorly and why tiling schemes (AnyRes, dynamic resolution) exist - and why Q-Former's fixed 32 queries was an attractive compromise."
        },
        {
          "h": "CHAIR: measuring object hallucination directly",
          "paras": [
            "Rather than scoring caption similarity, count the mentioned objects that are not actually annotated in the image. It is a targeted metric for the specific failure that matters."
          ],
          "tex": "\\mathrm{CHAIR}_i = \\frac{|\\{\\text{objects mentioned}\\} \\setminus \\{\\text{objects present}\\}|}{|\\{\\text{objects mentioned}\\}|}, \\qquad \\mathrm{CHAIR}_s = \\frac{|\\{\\text{captions with a hallucination}\\}|}{|\\{\\text{captions}\\}|}",
          "texNote": "The instance-level and sentence-level variants answer different questions - what fraction of mentions are wrong, versus what fraction of outputs contain any error. Report both; a model can have a low per-mention rate and still hallucinate in most captions."
        }
      ],
      "code": [
        {
          "h": "The LLaVA-style architecture, and what the ablations found",
          "paras": [
            "The whole connector is one linear layer. The interesting content is the training recipe and the finding that data dominated architecture."
          ],
          "code": "class SimpleVLM(nn.Module):\n    def __init__(self, vision_encoder, llm, d_vis, d_llm):\n        super().__init__()\n        self.vision = vision_encoder                 # frozen CLIP ViT\n        self.proj   = nn.Linear(d_vis, d_llm)        # THE ENTIRE CONNECTOR\n        self.llm    = llm\n\n    def forward(self, image, input_ids):\n        with torch.no_grad():\n            v = self.vision(image).last_hidden_state  # (B, 576, d_vis)\n        v = self.proj(v)                              # (B, 576, d_llm)\n        t = self.llm.get_input_embeddings()(input_ids)\n        return self.llm(inputs_embeds=torch.cat([v, t], dim=1))\n\n# TWO-STAGE TRAINING:\n#   Stage 1 - ALIGNMENT: freeze vision AND llm, train ONLY the projection on\n#             image-caption pairs. Teaches the projection to speak the LLM's\n#             embedding language. Cheap - one small matrix.\n#   Stage 2 - INSTRUCTION TUNING: unfreeze the LLM (or LoRA it), train on\n#             multi-turn visual instruction data. This is where the\n#             capability comes from.\n#\n# WHAT THE ABLATIONS ACTUALLY FOUND:\n#   * a LINEAR projection is competitive with Q-Former and cross-attention;\n#     an MLP connector is a small further gain\n#   * the INSTRUCTION DATA dominated everything - LLaVA's data was generated\n#     by prompting a text-only GPT-4 with COCO annotations (boxes + captions)\n#     to write conversations about images it never saw\n#   * freezing the LLM in stage 2 costs a lot; it must adapt\n#\n# The lesson is the familiar one: with a strong pretrained vision encoder and\n# a strong LLM, the CONNECTOR is not the bottleneck. The data is.",
          "caption": "The connector is one linear layer and it is competitive with elaborate alternatives. The instruction data - generated by prompting a text-only model with image annotations - is what produced the capability."
        },
        {
          "h": "Measuring hallucination with POPE, which is a devastating test",
          "paras": [
            "Reframing captioning evaluation as yes/no questions removes every metric ambiguity and exposes the failure directly."
          ],
          "code": "# POPE (Polling-based Object Probing Evaluation): ask the model\n#   \"Is there a {object} in the image?\"\n# balanced 50/50 between present and absent objects. Three ways to choose\n# the ABSENT objects, in increasing difficulty:\n#   RANDOM    - any object not in the image\n#   POPULAR   - the most frequent objects in the dataset overall\n#   ADVERSARIAL - objects that most often CO-OCCUR with what IS present\n\nfor obj in probe_objects:\n    ans = vlm(image, f\"Is there a {obj} in the image? Answer yes or no.\")\n\n# Representative pattern across VLMs:\n#   split         accuracy   yes-rate\n#   random ......... ~87%      ~50%\n#   popular ........ ~80%      ~60%\n#   ADVERSARIAL .... ~72%      ~70%     <- co-occurring objects\n#\n# Two things to read here. (1) Accuracy falls monotonically as the negatives\n# get more plausible under a LANGUAGE prior - the model is answering partly\n# from what usually appears with what it sees, not from what is there.\n# (2) The YES-RATE climbs well above 50%: these models are biased toward\n# affirmation, which is an instruction-tuning artifact (agreeable assistants)\n# and not a vision failure at all.\n#\n# WHY THIS TEST IS SO USEFUL: no caption metric, no reference, no ambiguity\n# about wording. Just a binary fact about the image. It converts a fuzzy\n# generation-evaluation problem into a clean classification one - which is a\n# transferable trick for evaluating any generative system.",
          "caption": "POPE's adversarial split chooses absent objects that CO-OCCUR with present ones, and accuracy drops sharply. The rising yes-rate shows part of the failure is sycophancy from instruction tuning rather than perception."
        }
      ],
      "useCases": [
        "Accessibility - alt-text generation and scene description for blind and low-vision users - which is the application with the clearest social value and the least tolerance for hallucination, since the user cannot verify the description.",
        "Document and chart understanding: extracting information from screenshots, forms, invoices, and figures, where the binding constraint is usually resolution rather than reasoning, and tiling schemes are what make it work.",
        "Content moderation and cataloguing at scale, where a VLM generates structured descriptions and attributes for images that would otherwise need manual tagging - with the caution that its errors are confident and fluent.",
        "Robotics and embodied agents, where a VLM interprets a camera view and produces grounded instructions or action plans, and where the visual-token budget directly trades against control-loop latency."
      ],
      "pitfalls": [
        "Trusting fluent captions. Object hallucination is systematic, not random: models describe objects that CO-OCCUR with what is present, driven by the language model's scene prior. Evaluate with POPE or CHAIR, not with caption similarity metrics that cannot see the error.",
        "Reporting only BLEU/ROUGE/CIDEr for captions. They measure n-gram overlap with reference captions, so a caption that hallucinates one object while matching the reference's phrasing scores well, and a correct caption phrased differently scores badly.",
        "Ignoring the yes-bias. Instruction-tuned VLMs answer 'yes' well above 50% on balanced yes/no probes - an agreeableness artifact from instruction tuning rather than a perception failure, and it inflates apparent capability on any yes/no evaluation.",
        "Underestimating the resolution constraint. A 336px ViT gives 576 visual tokens; tripling the side gives 5184 and roughly 81x the attention cost. Small text, dense charts, and fine detail fail for this reason, and no prompting fixes it - you need tiling or a higher-resolution encoder.",
        "Assuming the connector architecture is where the gains are. Linear projection is competitive with Q-Former and cross-attention; the instruction DATA dominated in every published comparison.",
        "Freezing the LLM during instruction tuning. Alignment-stage freezing is correct and cheap; stage-two freezing costs substantially, because the LLM must adapt to reading visual tokens.",
        "Evaluating on benchmarks whose images are in the training data. Web-scale image-text pretraining plausibly includes COCO, and the model may be recalling annotations rather than perceiving - which is the same contamination problem as in text benchmarks, with less attention paid to it."
      ],
      "connections": [
        {
          "ref": "multimodal/clip",
          "text": "The vision encoder in nearly every VLM is a CLIP-style ViT, chosen because contrastive image-text pretraining already aligned its features with language."
        },
        {
          "ref": "multimodal/vqa",
          "text": "The language-prior failure here is the same one VQA-CP exposed - a model answering from what usually goes with what it sees rather than from the image."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "Entailment between a generated caption and a source description is one automatic groundedness check, and the artifact story is structurally identical."
        },
        {
          "ref": "multimodal/multimodal-eval",
          "text": "Caption metrics, CLIPScore, and hallucination benchmarks in full - including why reference-based overlap metrics are the wrong tool for this failure."
        },
        {
          "ref": "advanced-nlp/architectures",
          "text": "The connector question is a special case of how to condition a decoder: cross-attention (Flamingo), soft prompts (Q-Former), or in-sequence tokens (LLaVA)."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why can't CLIP generate captions?",
          "a": "A dual encoder only scores image-text pairs, so it can RANK candidate captions but has no decoder to produce text. Generation needs a language model."
        },
        {
          "q": "What is the connector in a VLM?",
          "a": "The module mapping vision-encoder features into a form the language model can consume - a linear projection, an MLP, a Q-Former, or cross-attention layers."
        },
        {
          "q": "How does LLaVA connect the modalities?",
          "a": "One linear projection from the vision encoder's output space to the LLM's token-embedding space, so image patches become pseudo-tokens read alongside text."
        },
        {
          "q": "What is BLIP-2's Q-Former?",
          "a": "A small transformer with a fixed set of learned query tokens that extract a fixed-length visual summary, fed to the LLM as soft prompts. Fixes the token count regardless of image size."
        },
        {
          "q": "How does Flamingo differ?",
          "a": "It interleaves gated cross-attention layers into a frozen LLM, so text tokens attend to image features rather than images becoming tokens in the sequence."
        },
        {
          "q": "What did LLaVA's ablations find?",
          "a": "A linear projection is competitive with elaborate connectors; the INSTRUCTION DATA dominated. Their data was generated by prompting a text-only GPT-4 with COCO annotations."
        },
        {
          "q": "What is the two-stage training recipe?",
          "a": "Stage 1: freeze vision and LLM, train only the projection on caption pairs (alignment). Stage 2: instruction-tune with the LLM unfrozen or LoRA'd, which is where capability comes from."
        },
        {
          "q": "What is object hallucination?",
          "a": "Describing objects not present in the image. It is systematic - models mention objects that CO-OCCUR with what is present, driven by the LLM's scene prior."
        },
        {
          "q": "What is POPE?",
          "a": "Yes/no probes - 'is there a {object} in the image?' - balanced 50/50, with absent objects chosen randomly, by popularity, or ADVERSARIALLY by co-occurrence. Accuracy falls sharply on the adversarial split."
        },
        {
          "q": "What is the yes-bias?",
          "a": "Instruction-tuned VLMs answer 'yes' well above 50% on balanced probes - an agreeableness artifact of instruction tuning rather than a perception failure."
        },
        {
          "q": "Why do VLMs read small text poorly?",
          "a": "Resolution. A 336px ViT/14 gives 576 tokens; tripling the side gives 5184 tokens and ~81x the attention cost. Fine detail is simply not in the tokens."
        },
        {
          "q": "What is CHAIR?",
          "a": "A hallucination metric counting mentioned objects that are not annotated as present, at instance level (fraction of mentions wrong) and sentence level (fraction of captions containing any error)."
        }
      ],
      "standard": [
        {
          "q": "How do you connect a vision encoder to a language model? Compare the approaches.",
          "a": "THE PROBLEM. A language model consumes a sequence of token embeddings. A vision encoder produces a grid of patch features in a different space with different statistics. The connector's job is to bridge that, and the design space is small enough to enumerate. (1) LINEAR PROJECTION (LLaVA). One matrix mapping vision features to the LLM's token embedding dimension; image patches become pseudo-tokens prepended to the text sequence. Advantages: trivially simple, preserves all spatial detail (every patch gets a token), and the LLM's self-attention handles the interaction natively so nothing about the LLM architecture changes. Disadvantages: the token count is fixed by the vision encoder's patch grid, so 576 tokens for a 336px image and much more at higher resolution - visual tokens consume context and compute. (2) MLP PROJECTION (LLaVA-1.5). The same with a two-layer MLP, which is a consistent small improvement over linear for essentially no cost. This is the current default. (3) Q-FORMER (BLIP-2). A small transformer with a fixed number of LEARNED QUERY tokens (32) that cross-attend to the vision features and extract a fixed-length summary, fed to the LLM as soft prompts. Advantages: a constant, small token count regardless of image resolution, which is a real efficiency win, and it can be pretrained separately on image-text tasks. Disadvantages: it is an information BOTTLENECK - 32 vectors for an entire image - which hurts on tasks needing fine spatial detail like OCR and dense description, and it adds a component with its own training complexity. (4) CROSS-ATTENTION (Flamingo). Insert gated cross-attention layers into a FROZEN LLM, so text tokens attend to visual features at multiple depths. Advantages: the LLM's weights are untouched so its text capability is fully preserved, visual tokens do not consume context, and it handles interleaved image-text sequences naturally. Disadvantages: it modifies the LLM's architecture (new layers to train), and the gating is needed to keep early training from destroying the LLM's behaviour. WHAT THE EVIDENCE SAYS, and this is the part that matters. LLaVA's result was that a LINEAR projection with good instruction data beat much more elaborate systems. That is a strong claim and it held up: the community converged on simple MLP connectors. The interpretation is that with a strong pretrained vision encoder (CLIP, already aligned to language by its own pretraining) and a strong LLM, the connector is not the bottleneck - the model has the visual information and the language ability, and what it needs is training data teaching it to USE them together. The connector just has to not destroy anything. WHERE THE CHOICE STILL MATTERS. Efficiency at high resolution: Q-Former's fixed budget is genuinely attractive when images are large or numerous, and the modern compromise is tiling plus a resampler. Interleaved multi-image or video input: cross-attention or a resampler handles many images far better than concatenating thousands of tokens. Preserving text-only capability: Flamingo's frozen-LLM design is the strongest option, and full fine-tuning in the LLaVA recipe does degrade pure-text performance measurably. WHAT I WOULD BUILD TODAY: an MLP connector over a high-resolution vision encoder with dynamic tiling, LoRA on the LLM, and most of my effort on the instruction data - because that is where every ablation says the returns are.",
          "deepDive": {
            "q": "Explain object hallucination in VLMs: causes, measurement, and mitigations.",
            "a": "THE PHENOMENON. A VLM produces a fluent, detailed caption that mentions objects the image does not contain. It is not random noise - the hallucinated objects are systematically ones that CO-OCCUR with what is actually present. A model seeing a plate mentions a dining table; seeing a bicycle it mentions a person; seeing a kitchen counter it mentions a sink. THE CAUSES, and they are separable. (1) THE LANGUAGE PRIOR DOMINATES. The LLM was trained on enormous amounts of text and has strong expectations about what scenes contain. The visual signal enters through a comparatively thin connector and competes against that prior. When the visual evidence is weak or ambiguous, the prior wins - and its prediction is a co-occurring object. This is the dominant cause. (2) THE TRAINING DATA REWARDS IT. Caption datasets describe salient objects, and instruction data generated by prompting a text model with annotations inherits that model's tendency to elaborate. If training captions routinely mention typical scene elements, the model learns to produce them. (3) SNOWBALLING within a generation: once a hallucinated object is in the context, subsequent tokens condition on it, so a single early error propagates into a coherent but wrong description. Longer captions hallucinate more, and this is measurable. (4) RESOLUTION AND ATTENTION: fine detail may genuinely not be in the visual tokens, so the model fills the gap. (5) THE YES-BIAS from instruction tuning: models trained to be helpful and agreeable answer affirmatively more often than chance, which is a separate failure that compounds with the first. MEASUREMENT, which is where the field made real progress. CHAIR counts mentioned objects absent from the annotation, at instance and sentence level - simple, and limited to the annotated object vocabulary. POPE is better designed: it reframes the problem as balanced yes/no questions ('is there a {object} in the image?'), which removes all metric ambiguity and, crucially, chooses the ABSENT objects three ways - randomly, by dataset popularity, and ADVERSARIALLY by co-occurrence with present objects. Accuracy falls monotonically across those splits, which is direct evidence that the language prior is the mechanism rather than general unreliability. The yes-rate rising above 50% simultaneously separates the sycophancy component from the perception component, which is a nice piece of experimental design. Later benchmarks (AMBER, HallusionBench) extend this to attributes, relations, and counting. THE MITIGATIONS, in rough order of effectiveness. (a) BETTER AND MORE NEGATIVE DATA: instruction data that includes explicit negatives ('there is no X in this image') and corrections directly reduces the yes-bias, and this is the most reliable fix. (b) HIGHER RESOLUTION and more visual tokens, which addresses the cases where the detail genuinely was not available. (c) DECODING INTERVENTIONS: contrastive decoding approaches (VCD) generate with the original image and with a distorted one and take the difference, amplifying what is genuinely image-driven and suppressing what comes from the prior. This is classifier-free guidance's logic applied to hallucination and it works reasonably well with no retraining. (d) POST-HOC VERIFICATION: run an object detector or a separate VLM over the generated claims and check each mention against the image, which is the most reliable and the most expensive. (e) RLHF or DPO on preference data that penalizes hallucination. (f) Shorter, less elaborate generations, since hallucination rate rises with length - a real trade against descriptiveness. WHAT I WOULD SAY IN A DESIGN REVIEW: for accessibility applications this is the central risk, because the user cannot verify the description and a confident wrong detail is worse than an omission. I would evaluate with POPE-style probes on my own image distribution, report the yes-rate alongside accuracy, prefer shorter grounded descriptions over fluent elaborate ones, and add post-hoc verification for any high-stakes deployment."
          }
        },
        {
          "q": "How would you evaluate an image captioning system?",
          "a": "THE REFERENCE-BASED METRICS FIRST, and their specific failures. BLEU, ROUGE, and METEOR are n-gram overlap measures borrowed from translation and summarization; they were never designed for captioning and correlate poorly with human judgment here. CIDEr is captioning-specific - it weights n-grams by TF-IDF across the corpus so that generic phrases ('a picture of') count for little, and it uses multiple references - and it is the standard headline number. SPICE parses both caption and references into scene graphs (objects, attributes, relations) and compares those, so it measures semantic content rather than wording and correlates better with humans on content. THE PROBLEM COMMON TO ALL OF THEM: they compare against reference captions. A caption that hallucinates one object while matching the reference's phrasing scores well; a correct caption phrased differently scores badly. And references are themselves one person's choice of what was salient, so the metric partly measures agreement with that choice. Optimizing CIDEr directly, which was standard practice with reinforcement learning, produces generic hedge-everything captions that score well and read poorly - a clean Goodhart demonstration. REFERENCE-FREE METRICS. CLIPScore computes the similarity between the image and the generated caption in CLIP space, needing no reference at all. It correlates better with human judgment than the overlap metrics on many benchmarks. Its limits are the modality gap (the absolute value is uninterpretable - use it to rank, not to threshold), insensitivity to fine compositional errors, and circularity if your model was trained with CLIP features. HALLUCINATION METRICS, which I would treat as primary rather than supplementary because they target the failure that actually matters. CHAIR counts mentioned objects absent from the annotation. POPE reframes it as balanced yes/no probes with adversarially-chosen co-occurring negatives - and it is the single most informative evaluation for these systems because it removes wording ambiguity entirely and isolates the language-prior failure. Report the yes-rate alongside accuracy to separate sycophancy from perception. HUMAN EVALUATION, which remains the anchor. Rate on separate dimensions - CORRECTNESS (is everything stated true), COMPLETENESS (is anything important missing), and FLUENCY - because a single quality score conflates them and correctness is the one that matters. For correctness specifically, the better protocol is a TASK rather than a rating: ask annotators to HIGHLIGHT the spans that are not supported by the image, which is far more reliable than a 1-5 score and produces error analysis for free. WHAT I WOULD ADD THAT IS OFTEN MISSING. (a) LENGTH CONTROL: hallucination rate rises with caption length, so comparing systems with different output lengths compares verbosity. Report length distributions. (b) A CONTAMINATION check: COCO is plausibly in web-scale pretraining data, so strong COCO numbers may partly reflect recall of annotations. Evaluate on images the model cannot have seen. (c) TASK-BASED evaluation where possible - can a person reconstruct the relevant facts from the caption, or complete a downstream task using it? For accessibility that is the real metric. (d) Per-category breakdown, since performance on common objects is much better than on the long tail. WHAT I WOULD REPORT: CIDEr and SPICE for comparability with the literature, CLIPScore as a reference-free signal, POPE accuracy and yes-rate as the primary correctness measure, a human correctness evaluation on a sample, and caption length. And I would lead with the hallucination numbers, because for every deployed use of captioning the question 'is it true' precedes 'is it well-phrased'."
        },
        {
          "q": "Why do VLMs struggle with charts, documents, and small text?",
          "a": "THE PRIMARY CAUSE IS RESOLUTION, and the arithmetic makes it concrete. A CLIP ViT-L/14 at 336 pixels produces a 24x24 grid, so 576 visual tokens, and each token covers a 14x14 pixel patch of a 336px image. If the original document was 2000 pixels wide and was downscaled to 336, a 10-point font is now roughly one or two pixels tall - the information is not in the image the model receives, let alone in the tokens. No amount of prompting or reasoning recovers what was destroyed by the resize. This is the single most common misdiagnosis in this area: people conclude the model 'cannot read' when the model was never shown readable text. WHY NOT JUST USE HIGHER RESOLUTION? Because it is a sequence-length problem. Patch count scales with the square of the side length: 336px gives 576 tokens, 672px gives 2304, 1008px gives 5184. Attention within the image block scales with the square of that, so tripling the side is roughly 81x the attention cost - and those tokens also consume the LLM's context window, competing with the text. Resolution is expensive in a way that is easy to underestimate. THE SOLUTIONS, and each trades something. (1) TILING / ANY-RESOLUTION (LLaVA-NeXT, InternVL): split the image into tiles at native resolution, encode each separately, and concatenate the tokens, usually plus a downscaled full view for global context. This works well and is the current standard. The costs are token count (a 4-tile image is ~2300 tokens) and the loss of cross-tile context within the encoder, so structures spanning a tile boundary are handled by the LLM rather than the vision model. (2) A NATIVE HIGH-RESOLUTION ENCODER trained for it, rather than upscaling a 224/336 model. Better but requires retraining the encoder. (3) TOKEN COMPRESSION - pooling, a resampler, or a Q-Former - to reduce the token count after high-resolution encoding. Efficient, and it reintroduces an information bottleneck exactly where fine detail lives. (4) A PIPELINE: run a dedicated OCR system and feed the extracted text to the model alongside the image. This is frequently the right engineering answer and is underrated because it is unglamorous - OCR systems are mature, cheap, and far more accurate at reading than a general VLM, and the VLM is then reasoning over text rather than perceiving it. THE SECONDARY CAUSES, beyond resolution. (a) TRAINING DATA: web image-text pairs are overwhelmingly natural photographs with descriptive captions. Documents, charts, and UI screenshots are under-represented, so even at adequate resolution the model has less experience reading them. Document-specific instruction tuning helps substantially. (b) CHARTS NEED STRUCTURED REASONING, not just perception - reading a value off a bar chart requires locating the bar, tracing to the axis, and interpolating, which is a multi-step spatial procedure that next-token prediction over patch tokens is not obviously suited to. (c) SPATIAL PRECISION: VLMs are weak at exact positions and alignment generally, which is what table structure and axis-reading depend on. (d) The CLIP-style encoder was trained with a contrastive objective that rewards recognizing what is present, not reading it - the pretraining never required character-level fidelity. HOW I WOULD DIAGNOSE A SPECIFIC FAILURE: render the input at the resolution the model actually receives and look at it. If a human cannot read it either, the problem is resolution and the fix is tiling or OCR, not prompting. If a human can read it and the model cannot, the problem is training data or the encoder, and fine-tuning on document data is the lever. That two-minute check attributes the failure correctly and saves a great deal of misdirected effort."
        },
        {
          "q": "You are building alt-text generation for an accessibility product. What matters?",
          "a": "THE DEFINING CONSTRAINT is that the user CANNOT VERIFY the output. A sighted user reading a caption alongside an image catches errors instantly; a blind user has only the caption. That inverts the usual priorities: a confident wrong detail is far worse than an omission, and fluency is worth almost nothing if correctness is uncertain. Everything below follows from that. WHAT MATTERS MOST - HALLUCINATION, and I would treat it as the primary engineering target rather than a quality metric. Concretely: evaluate with POPE-style probes on images from my actual distribution, not COCO; report the yes-rate alongside accuracy to separate sycophancy from perception; prefer SHORTER descriptions, since hallucination rate rises measurably with length; and consider post-hoc verification with an object detector for any object mentioned. I would rather ship a system that says less and is right. SECOND - WHAT TO DESCRIBE, which is a product question the ML framing obscures. Good alt text is not an exhaustive description; it conveys what is RELEVANT IN CONTEXT. The same photograph needs different alt text on a news article than in a product listing than in a personal photo album. So the system should take context - surrounding text, page purpose, user preference - as input, and should be able to produce descriptions at different lengths for different situations (a short one for a link, a longer one on request). The accessibility community's own guidance on this is more useful than any ML paper and should drive the specification. THIRD - TEXT IN IMAGES, which is disproportionately important and disproportionately badly handled. Screenshots, memes, signs, charts, and infographics are extremely common on the web and the information is often entirely in the text. A VLM at 336px cannot read them. I would run a dedicated OCR pass and provide the extracted text to the model, and I would treat 'contains unread text' as a detectable condition triggering a different code path. This is probably the highest-value engineering decision in the system. FOURTH - PEOPLE, which needs an explicit policy. Should the system describe apparent race, gender, age, disability, or attractiveness? Guessing these is both error-prone and potentially offensive, and the blind community's views on it are not unanimous - some users want the information, others find inferred attributes objectionable. This must be a stated, user-configurable policy decision made with input from actual users, not a default that falls out of whatever the model does. Likewise identifying named individuals raises privacy questions. FIFTH - THE OPERATING MODEL. I would build for uncertainty: allow the system to say 'an image, description unavailable' rather than guess, expose a way to request more detail, and log user feedback as the primary evaluation signal. And I would be clear in the interface that descriptions are machine-generated, because users calibrate their trust accordingly. EVALUATION, which must involve the actual users. Automatic metrics and sighted-annotator ratings are proxies; the real question is whether a blind user can accomplish their task with the description, and that requires user testing with the community the product serves. This is the step most likely to be skipped and the one most likely to reveal that the system optimizes the wrong thing - for instance producing florid scene descriptions when users wanted to know whether the image contained a button they could click. WHAT I WOULD FLAG UP FRONT: this is an application where the ML quality bar is set by a genuine harm - misinformation delivered to someone who cannot check it - and where the domain expertise that matters most is not in the model but in accessibility practice. I would want a blind or low-vision advisor on the project from the start, not as a review step at the end."
        },
        {
          "q": "How do you add vision to an existing language model without degrading its text ability?",
          "a": "THE PROBLEM IS REAL AND MEASURABLE. Full fine-tuning of an LLM on visual instruction data degrades its pure-text performance - it is catastrophic forgetting, and it shows up on standard text benchmarks after visual instruction tuning. If your product needs both, this matters. THE OPTIONS, from most to least protective. (1) FREEZE THE LLM ENTIRELY and use CROSS-ATTENTION (Flamingo's design). New gated cross-attention layers are inserted into the frozen LLM; the original weights never change, so text capability is preserved EXACTLY - not approximately. The gating (initialized so the new layers contribute nothing at the start, like ControlNet's zero-init) means training begins from the unmodified model. Costs: you are training new layers rather than adapting existing ones, which needs more data, and the ceiling on visual capability may be lower than full adaptation. (2) FREEZE THE LLM AND TRAIN ONLY THE CONNECTOR. The simplest protective option, and it is exactly LLaVA's stage one. It works for basic alignment and is clearly insufficient for strong instruction-following - stage two exists because the LLM must adapt to reading visual tokens. So this is a starting point, not an endpoint. (3) LoRA ON THE LLM. Low-rank updates during visual instruction tuning. Much less destructive than full fine-tuning, small artifacts, and you can serve the base model with or without the adapter - which is the practical answer for 'I need both capabilities from one deployment'. This is what I would use by default. (4) FULL FINE-TUNING WITH A TEXT-DATA MIX. Include a proportion of pure-text instruction data in the visual instruction-tuning mixture. This is rehearsal, it works, and the mix ratio is a tunable trade. Most strong open VLMs do some version of this. (5) FULL FINE-TUNING WITH NO MITIGATION - highest visual capability, measurable text degradation. WHAT I WOULD ACTUALLY DO: LoRA on the LLM plus an MLP connector, with a text-data mix in the training mixture, and a held-out text benchmark suite evaluated every checkpoint so degradation is visible rather than discovered later. That last point is the operational one - you cannot manage what you do not measure, and 'we did not check the text benchmarks' is how this problem reaches production. THE EVALUATION DISCIPLINE. Before training, record baseline scores on a text suite (reasoning, knowledge, coding, instruction-following) for the base model. After each stage, re-run it. Report the delta explicitly alongside the visual gains, so the trade is a decision rather than an accident. Also check the more subtle regressions: output formatting, refusal behaviour, and multi-turn coherence often degrade before benchmark scores move. A NUANCE WORTH RAISING. Some degradation is not forgetting but DISTRIBUTION SHIFT in the instruction style - visual instruction data has a particular voice ('The image shows...') and the model adopts it for text queries too. That is fixable with data mixing and is a different problem from losing knowledge, though it presents similarly. Distinguishing them requires looking at the outputs, not just the scores. AND THE ARCHITECTURAL POINT: this whole issue is why Flamingo's frozen-LLM design remains interesting even though the field mostly went the other way. It is the only option that gives a hard guarantee rather than a measured trade, and if preserving an expensively-aligned text model is a requirement rather than a preference, a guarantee is worth a lower visual ceiling."
        },
        {
          "q": "What is the difference between a VLM and a multimodal LLM that generates images?",
          "a": "THE ASYMMETRY. A VLM takes images and text in and produces TEXT out - understanding only. A unified multimodal model can also produce IMAGES, which requires a fundamentally different output path, and the design space for that is where the interesting choices are. WHY OUTPUT IS HARDER THAN INPUT. For input, you convert an image into something the transformer can read - a linear projection suffices, because the LLM's job is to interpret. For output, the model must GENERATE an image, and a language model natively produces discrete tokens from a vocabulary. So you need either a way to make images discrete, or a way to hand off to a separate generator. THE APPROACHES. (1) DISCRETE IMAGE TOKENS. Use a VQ autoencoder (VQGAN-style) to turn images into sequences of codebook indices, extend the LLM's vocabulary with those indices, and train on interleaved text and image tokens. Generation is then ordinary autoregressive decoding, and the same model handles both modalities with one loss. This is the cleanest unification and it is what Chameleon and similar models do. Costs: the VQ tokenizer's reconstruction quality is a hard ceiling on image fidelity; image token sequences are long (256-1024 tokens per image); and the model must learn image generation from scratch rather than inheriting a strong pretrained generator. (2) HAND OFF TO A DIFFUSION MODEL. The LLM emits a conditioning signal - text, or learned embedding tokens - which a separate diffusion model renders. Advantages: you get a state-of-the-art image generator for free, image quality is much higher, and the components can be developed independently. Disadvantages: it is two systems rather than one, the interface is a bottleneck (whatever the LLM cannot express in the conditioning is lost), and end-to-end training is awkward. Most production 'multimodal assistants that generate images' work this way, and it is the pragmatic choice. (3) CONTINUOUS EMBEDDINGS with a diffusion head attached to the LLM, trained jointly - a middle path (Transfusion-style) that keeps one model while using a diffusion objective for the image portion. Promising and less mature. WHAT UNIFICATION BUYS, and why people pursue it despite the handoff being easier. INTERLEAVED generation - a model that can write a paragraph, generate an illustration informed by it, then write more, with each conditioned on everything before. Consistency across multiple generated images. Genuine multimodal reasoning where the image generation is part of the thought rather than a final rendering step. And a single training objective and serving stack. THE PRACTICAL STATE. Understanding-only VLMs are mature and widely deployed. Unified generation is progressing quickly and image quality from token-based unified models still trails dedicated diffusion models, largely because of the VQ tokenizer ceiling and because dedicated generators have absorbed far more specialized effort. The handoff architecture remains the sensible engineering choice for most products. THE CONNECTION I WOULD DRAW: this is the same two-stage factorization as everywhere else in generative modelling - compress with an autoencoder, generate in the compressed space. Token-based unified models use a VQ autoencoder with an autoregressive prior; latent diffusion uses a continuous autoencoder with a diffusion prior. The unification question is not really 'transformer or diffusion' but 'should the image prior live inside the language model or beside it', and that is a systems question about what you need to be joint, not a question about which generates better pictures."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The connector problem",
        "back": "How to get vision features into an LLM. Options: linear/MLP projection (LLaVA, patches become pseudo-tokens), Q-Former (BLIP-2, fixed 32 learned queries), or gated cross-attention into a frozen LLM (Flamingo)."
      },
      {
        "type": "intuition",
        "front": "LLaVA's finding",
        "back": "A single LINEAR projection is competitive with elaborate connectors. What dominated was the INSTRUCTION DATA - generated by prompting a text-only GPT-4 with COCO annotations. With a strong encoder and a strong LLM, the connector is not the bottleneck."
      },
      {
        "type": "definition",
        "front": "The two-stage recipe",
        "back": "Stage 1 ALIGNMENT: freeze vision + LLM, train only the projection on caption pairs. Stage 2 INSTRUCTION TUNING: unfreeze (or LoRA) the LLM on visual instruction data - this is where capability comes from; freezing here costs a lot."
      },
      {
        "type": "pitfall",
        "front": "Object hallucination is systematic",
        "back": "VLMs describe objects that CO-OCCUR with what is present (plate -> dining table), because the LLM's scene prior beats thin visual evidence. Longer captions hallucinate more - errors snowball once in context."
      },
      {
        "type": "definition",
        "front": "POPE",
        "back": "Balanced yes/no probes: 'is there a {object}?', with absent objects chosen RANDOM / POPULAR / ADVERSARIAL (co-occurring). Accuracy falls monotonically across those splits - direct evidence the language prior is the mechanism."
      },
      {
        "type": "pitfall",
        "front": "The yes-bias",
        "back": "Instruction-tuned VLMs answer 'yes' well above 50% on balanced probes - agreeableness from instruction tuning, NOT a perception failure. Report the yes-rate alongside accuracy to separate the two."
      },
      {
        "type": "intuition",
        "front": "Visual tokens are a sequence-length problem",
        "back": "336px ViT/14 = 576 tokens; 1008px = 5184 tokens and ~81x the attention cost. Small text and dense charts fail because the information is not in the tokens - no prompting fixes it. Tiling (AnyRes) or OCR does."
      },
      {
        "type": "pitfall",
        "front": "Caption overlap metrics miss the failure",
        "back": "BLEU/ROUGE/CIDEr score n-gram overlap with references, so a caption that hallucinates one object but matches the reference's phrasing scores well. Optimizing CIDEr with RL produces generic hedge-everything captions."
      },
      {
        "type": "definition",
        "front": "CHAIR",
        "back": "Hallucination metric: CHAIR_i = fraction of MENTIONS that are absent objects; CHAIR_s = fraction of CAPTIONS containing any hallucination. Report both - a low per-mention rate can coexist with most captions being wrong."
      },
      {
        "type": "intuition",
        "front": "Diagnose a document failure in two minutes",
        "back": "Render the input at the resolution the model ACTUALLY receives and look at it. If a human cannot read it either, it is resolution (fix: tiling or a dedicated OCR pass). If a human can, it is training data or the encoder."
      },
      {
        "type": "pitfall",
        "front": "Visual instruction tuning degrades text ability",
        "back": "Full fine-tuning on visual data measurably harms pure-text benchmarks. Mitigate with LoRA + a text-data mix, and evaluate a text suite every checkpoint. Flamingo's frozen-LLM design is the only option giving a hard guarantee."
      },
      {
        "type": "intuition",
        "front": "Contrastive decoding for hallucination (VCD)",
        "back": "Generate with the real image and with a distorted one, then take the difference in logits - amplifying what is genuinely image-driven and suppressing the language prior. Classifier-free guidance's logic, no retraining needed."
      }
    ],
    "refs": [
      {
        "title": "Liu et al. (2023), Visual Instruction Tuning (LLaVA)",
        "url": "https://arxiv.org/abs/2304.08485"
      },
      {
        "title": "Li et al. (2023), BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and LLMs",
        "url": "https://arxiv.org/abs/2301.12597"
      },
      {
        "title": "Alayrac et al. (2022), Flamingo: a Visual Language Model for Few-Shot Learning",
        "url": "https://arxiv.org/abs/2204.14198"
      },
      {
        "title": "Li et al. (2023), Evaluating Object Hallucination in Large Vision-Language Models (POPE)",
        "url": "https://arxiv.org/abs/2305.10355"
      },
      {
        "title": "Rohrbach et al. (2018), Object Hallucination in Image Captioning (CHAIR)",
        "url": "https://arxiv.org/abs/1809.02156"
      }
    ],
    "demos": [
      "attention",
      "attention-rollout",
      "decoding",
      "beam-search"
    ]
  },
  "vqa": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Visual question answering looks like the ideal test of multimodal understanding: you cannot answer 'what colour is the umbrella' without both reading the question and looking at the image. It was proposed on exactly that reasoning, and for a few years progress on the VQA benchmark was treated as progress on grounded understanding.",
        "Then people ran the ablation. A model given ONLY THE QUESTION - no image at all - scored around 44% on VQA v1, against roughly 55% for the full multimodal models of the time. Most of the task was solvable without looking. The reason is that questions and answers are correlated in ways that have nothing to do with vision: 'what sport is this' is tennis about 41% of the time, 'how many' is answered '2' more often than any other number, and yes/no questions are 'yes' around 70% of the time. A model that learns the answer distribution per question type does very well, and a benchmark drawn from the same distribution cannot tell that apart from understanding.",
        "The responses to this are the most instructive part of the lesson. VQA v2 was rebuilt with COMPLEMENTARY PAIRS - for every question, two similar images with DIFFERENT correct answers - so the question alone is uninformative by construction. That is dataset design as a fix for a shortcut, and it works. Then VQA-CP went further and deliberately made the train and test answer distributions DIFFER per question type, and models that scored around 40% collapsed to roughly 20%. Both moves are the same idea as HANS in natural language inference: an i.i.d. test set cannot detect a shortcut that holds in the training distribution, so you have to build data where the shortcut and the task disagree. This module's recurring question - does the model actually need the second modality - has its sharpest answer here."
      ],
      "math": [
        {
          "h": "The VQA accuracy metric, which is not accuracy",
          "paras": [
            "Ten annotators answer each question, and a prediction is credited by how many of them agreed. This handles the genuine ambiguity of open-ended visual questions, and it means the metric is bounded below 100% by human disagreement."
          ],
          "tex": "\\mathrm{Acc}(a) = \\min\\!\\left(\\frac{\\big|\\{h : h \\text{ answered } a\\}\\big|}{3},\\; 1\\right)",
          "texNote": "Three or more agreeing annotators gives full credit; two gives 2/3. Human performance on VQA v2 is around 80%, not 100%, because annotators genuinely disagree - so a model at 80% is at the ceiling of the measurement, not at perfect understanding."
        },
        {
          "h": "The language-prior baseline",
          "paras": [
            "The diagnostic that reframed the field. Train a model on the question alone and see how much of the task survives - whatever it reaches is achievable without vision."
          ],
          "tex": "p(a \\mid q) \\;\\text{vs}\\; p(a \\mid q, v), \\qquad \\text{VQA v1: } 44\\% \\;\\text{vs}\\; \\sim55\\%",
          "texNote": "Eleven points is the entire measurable contribution of vision on that benchmark. The same ablation applies to any multimodal task: drop a modality and see what survives. It costs one training run and it is the cheapest possible sanity check."
        },
        {
          "h": "Complementary pairs: making the question uninformative by construction",
          "paras": [
            "VQA v2's fix. For each question, find a SECOND image that is similar but for which the answer differs. Now the marginal answer distribution given the question is balanced, so the prior carries no information."
          ],
          "tex": "\\forall (q, v_1, a_1)\\;\\exists\\,(q, v_2, a_2)\\;\\text{with}\\; a_1 \\neq a_2, \\qquad p(a \\mid q) \\to \\text{uniform over the pair}",
          "texNote": "This is a DATA-side fix for a shortcut, and it is more robust than any modelling intervention because it removes the signal rather than regularizing against it. It roughly doubled the dataset and cut the question-only baseline substantially."
        }
      ],
      "code": [
        {
          "h": "The ablation that should precede any VQA result",
          "paras": [
            "Three training runs that tell you what your benchmark is actually measuring. This generalizes to every multimodal task and is the module's core discipline."
          ],
          "code": "# Train three models on the same data, differing only in what they see.\nfull  = train(lambda ex: (ex[\"image\"], ex[\"question\"]))\nq_only = train(lambda ex: (ZERO_IMAGE,  ex[\"question\"]))   # blind\nv_only = train(lambda ex: (ex[\"image\"],  EMPTY_STRING))    # deaf\n\n#   VQA v1 (the original benchmark)\n#     prior (most common answer per type) ..... ~37%\n#     QUESTION ONLY ........................... ~44%\n#     image only .............................. ~29%\n#     full model .............................. ~55%\n#\n# Read the second row carefully. A model that never sees the image scores 44%\n# on a task defined as answering questions ABOUT images. Vision contributes\n# about 11 points, and the benchmark cannot distinguish those 11 points from\n# the 44 that came from knowing what answers follow what questions.\n#\n# WHERE THE PRIOR COMES FROM (VQA v1 answer distributions):\n#   \"what sport is ...\"     -> \"tennis\"  ~41% of the time\n#   \"how many ...\"          -> \"2\"       most common by a wide margin\n#   \"is/are/does ...\"       -> \"yes\"     ~70%\n#   \"what colour is the ...\"-> a small set dominates\n#\n# Answering \"yes\" to every yes/no question is a strong baseline. That is not\n# a model failure - it is a correct read of the training distribution, and it\n# is what supervised learning is supposed to do.\n#\n# RUN THIS ON YOUR OWN MULTIMODAL TASK. It is one training run per modality\n# and it is the difference between knowing and assuming.",
          "caption": "A blind model scores 44% on VQA v1 against 55% for the full model. Vision's measurable contribution is eleven points, and no aggregate accuracy on an i.i.d. test set can separate those from the rest."
        },
        {
          "h": "VQA-CP: changing the priors and watching models collapse",
          "paras": [
            "The stronger diagnostic. Rather than balancing the data, deliberately make the train and test answer distributions disagree - so a model relying on the prior is actively punished."
          ],
          "code": "# VQA-CP (Changing Priors, Agrawal et al. 2018) re-splits VQA so that the\n# ANSWER DISTRIBUTION PER QUESTION TYPE differs between train and test.\n#\n#   e.g.  train: \"what sport\" -> mostly tennis\n#         test:  \"what sport\" -> mostly skiing\n#         train: \"how many\"   -> mostly 2\n#         test:  \"how many\"   -> mostly 1, 3, 4\n#\n# Representative results for models of that era:\n#   model              VQA v2      VQA-CP v2\n#   SAN ............... ~52%         ~25%\n#   UpDn (attention) .. ~63%         ~40%\n#   ---------------------------------------\n#   drop ..............             ~20-25 points\n#\n# A model at 63% falls to 40% when only the ANSWER PRIOR changes. The images\n# are the same images, the questions are the same questions, and the visual\n# task is identical. What changed is a statistical regularity the model was\n# never supposed to be using.\n#\n# THE PATTERN, which is exactly HANS in a different modality:\n#   i.i.d. test set  -> cannot detect the shortcut, BY CONSTRUCTION\n#   shifted test set -> exposes it immediately\n#\n# CAVEAT WORTH KNOWING: VQA-CP has a design flaw of its own - because the\n# shift is systematic and known, methods can exploit the INVERSE prior and\n# score well without improving grounding. Later work showed several\n# \"debiasing\" methods were partly doing this. So VQA-CP is a good diagnostic\n# and a poor optimization target, which is itself a general lesson about\n# adversarial benchmarks.",
          "caption": "Changing only the answer distribution drops a 63% model to 40% on identical images and questions. And VQA-CP's own flaw - that its known, systematic shift can be gamed by the inverse prior - is a lesson about adversarial benchmarks becoming targets."
        }
      ],
      "useCases": [
        "Accessibility question-answering, where a blind user photographs their surroundings and asks about them - the application that motivated the VizWiz dataset, and one where the images are blurry, poorly framed, and unanswerable far more often than in curated benchmarks.",
        "Document and chart question answering in enterprise settings - asking questions of invoices, forms, reports, and dashboards - where the binding constraint is resolution and OCR rather than reasoning.",
        "Visual search and product question answering in commerce ('does this jacket have a hood'), where the answer must be grounded in the actual product image rather than in what such products usually have.",
        "Robotics and embodied agents querying a scene before acting, where an ungrounded answer produces a wrong action rather than a wrong sentence - which raises the cost of the language-prior failure considerably."
      ],
      "pitfalls": [
        "Reporting VQA accuracy without a QUESTION-ONLY baseline. A blind model scored 44% on VQA v1 against 55% for the full model, so most of the number came from answer priors. Run the unimodal ablation before believing any multimodal result.",
        "Treating an i.i.d. test set as evidence of grounding. It cannot detect a shortcut that holds in the training distribution - that is structural, not a sampling issue. Only data built so the shortcut and the task DISAGREE will reveal it.",
        "Confusing VQA accuracy with accuracy. It is min(agreeing annotators / 3, 1) over ten annotators, so human performance is around 80% and a model at 80% is at the measurement ceiling, not at perfect understanding.",
        "Optimizing against VQA-CP. Its shift is systematic and known, so methods can exploit the INVERSE prior and improve the score without improving grounding - several published debiasing methods were later shown to be partly doing this. Use it as a diagnostic, not a target.",
        "Ignoring unanswerable questions. Benchmark questions are always answerable; real ones are not - VizWiz found a large fraction of real user questions cannot be answered from the photo taken. A model with no way to abstain will confidently guess.",
        "Framing VQA as classification over a fixed answer vocabulary and then deploying it open-ended. The standard benchmark setup takes the top ~3000 answers as classes, which caps the task and hides failures on anything outside that set.",
        "Assuming modern VLMs fixed this. They are much better and the language-prior failure persists in a related form - POPE's adversarial split and compositional benchmarks show the same 'answer from what usually co-occurs' behaviour."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/nli",
          "text": "The hypothesis-only baseline and HANS are exactly this story in text: an ablation revealing a shortcut, then a constructed test set proving the model relies on it."
        },
        {
          "ref": "multimodal/vlm-captioning",
          "text": "Object hallucination is the generative form of the same failure - describing what usually co-occurs rather than what is present, and POPE is the VQA-shaped test for it."
        },
        {
          "ref": "multimodal/multimodal-fusion",
          "text": "Modality dominance is the architectural version: one modality's signal is easier to learn from, so the model uses it and effectively ignores the other."
        },
        {
          "ref": "advanced-nlp/qa",
          "text": "SQuAD's AddSent result is the same shape - one appended sentence halving F1 because the model was ranking by question similarity rather than comprehending."
        },
        {
          "ref": "multimodal/multimodal-eval",
          "text": "Unimodal ablations, shifted splits, and per-question-type breakdowns are the evaluation discipline this failure demands, and they generalize to every multimodal system."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is VQA?",
          "a": "Answering a natural-language question about an image. Proposed as a test of grounded understanding because you appear to need both modalities to answer."
        },
        {
          "q": "What did the question-only baseline show?",
          "a": "A model with no image scored ~44% on VQA v1 against ~55% for full models. Most of the task was solvable from answer priors conditioned on question type."
        },
        {
          "q": "Give examples of the priors.",
          "a": "'What sport' is tennis ~41% of the time; 'how many' is most often '2'; yes/no questions are 'yes' ~70% of the time. Answering 'yes' to everything is a strong baseline."
        },
        {
          "q": "How did VQA v2 fix it?",
          "a": "COMPLEMENTARY PAIRS: for every question, a second similar image with a DIFFERENT answer. The question alone becomes uninformative by construction - a data-side fix."
        },
        {
          "q": "What is VQA-CP?",
          "a": "Changing Priors: re-split so the answer distribution per question type DIFFERS between train and test. Models dropped roughly 20-25 points on identical images and questions."
        },
        {
          "q": "What is VQA-CP's own flaw?",
          "a": "Its shift is systematic and known, so methods can exploit the INVERSE prior and score well without better grounding. A good diagnostic, a bad optimization target."
        },
        {
          "q": "How is VQA accuracy computed?",
          "a": "min(number of the 10 annotators giving that answer / 3, 1). Three agreeing annotators gives full credit, two gives 2/3 - it accommodates genuine ambiguity."
        },
        {
          "q": "What is human performance on VQA v2?",
          "a": "Around 80%, not 100%, because annotators genuinely disagree on open-ended visual questions. A model at 80% is at the measurement ceiling."
        },
        {
          "q": "Why is VQA usually posed as classification?",
          "a": "The standard setup takes the top ~3000 answers as a fixed label set, which makes training and evaluation tractable - and caps the task and hides failures outside that vocabulary."
        },
        {
          "q": "What is VizWiz?",
          "a": "VQA from blind users' real photographs. Images are blurry and poorly framed, and a large fraction of questions are UNANSWERABLE from the photo - which benchmark datasets never contain."
        },
        {
          "q": "Do modern VLMs still show language priors?",
          "a": "Yes, in a related form. POPE's adversarial split and compositional benchmarks show the same 'answer from what usually co-occurs' behaviour, though the models are much better overall."
        },
        {
          "q": "What is the general diagnostic here?",
          "a": "The UNIMODAL ABLATION - train on each modality alone and see what survives. One training run per modality, and it is the difference between knowing and assuming."
        }
      ],
      "standard": [
        {
          "q": "Explain the language-prior problem in VQA and what has been done about it.",
          "a": "THE FINDING. VQA was proposed as a test requiring both vision and language. Then Antol et al.'s own paper and subsequent analyses ran the ablation: train a model on the QUESTION ALONE, with no image. It scored roughly 44% on VQA v1, against about 55% for the full multimodal models of the time. So the measurable contribution of vision was about eleven points, and the benchmark had no way to distinguish those from the forty-four that came from elsewhere. WHERE THE PRIOR COMES FROM. Questions and answers are correlated through the world and through how the dataset was collected. 'What sport is this' is tennis about 41% of the time, because tennis photographs are common in the source images. 'How many' is answered '2' more than any other number. Yes/no questions are 'yes' around 70% of the time, partly because annotators writing questions about an image tend to write questions whose answer is yes. A model that learns p(answer | question type) does very well, and this is not a bug in the model - it is a correct read of the training distribution and exactly what supervised learning optimizes for. THE RESPONSES, which are the instructive part. (1) VQA v2 - THE DATA FIX. For every question, find a SECOND image that is similar but for which the answer differs, and include both. Now the answer distribution given the question is balanced by construction, so the prior carries no information. This roughly doubled the dataset and substantially cut the question-only baseline. I would emphasize that this is a data-side fix and that data-side fixes are more robust than modelling ones, because they remove the signal rather than regularizing against it. (2) VQA-CP - THE DIAGNOSTIC. Re-split the data so the answer distribution per question type deliberately DIFFERS between train and test: 'what sport' is mostly tennis in training and mostly skiing in test. Models fell by 20-25 points on identical images and questions. This is the same construction as HANS in natural language inference and it makes the same point: an i.i.d. test set CANNOT detect a shortcut that holds in the training distribution, so you must build data where the shortcut and the task disagree. (3) MODELLING FIXES: adversarial regularization against a question-only branch, product-of-experts with a bias-only model, example reweighting, counterfactual training with modified images. These improve VQA-CP scores. (4) BETTER GROUNDING: attention supervision, region-level pretraining, and object-centric representations. THE CAVEAT THAT MAKES THIS A BETTER ANSWER. VQA-CP has a design flaw of its own. Because its distribution shift is SYSTEMATIC AND KNOWN - the test priors are roughly the inverse of the training priors - a method can exploit that inverse structure and improve its score without improving grounding at all. Later analyses showed several published debiasing methods were partly doing this, and that some gains disappeared under a properly randomized shift. So VQA-CP is a good DIAGNOSTIC and a poor OPTIMIZATION TARGET, which generalizes: any adversarial benchmark becomes gameable once it becomes a target, and the more structured the adversarial construction, the more gameable it is. WHERE THIS LEAVES THINGS. Modern VLMs are far better on VQA and the failure has not disappeared - it has changed shape. POPE's adversarial split, where absent objects are chosen by co-occurrence, shows the same 'answer from what usually goes with what I see' behaviour. Compositional benchmarks show the same for attributes and relations. The lesson I would draw is the module's spine: a multimodal model must EARN its second modality, the default assumption should be that it might not be using it, and the check costs one training run."
        },
        {
          "q": "How would you build and evaluate a VQA system for a real product?",
          "a": "I WOULD START BY QUESTIONING THE BENCHMARK FRAMING, because product VQA differs from benchmark VQA in ways that determine the architecture. Benchmark questions are always answerable, always about a well-framed image, and drawn from a fixed answer vocabulary. Product questions are none of those. THE DESIGN DECISIONS. (1) ANSWERABILITY IS A FIRST-CLASS OUTPUT. VizWiz - VQA on photographs taken by blind users - found a large fraction of real questions cannot be answered from the image at all: the subject is out of frame, the photo is blurred, the text is too small, or the question is about something not visible. A system with no way to say 'I cannot tell from this image' will confidently guess, and for an accessibility product a confident wrong answer is the worst possible output. So abstention must be trained, not bolted on: include unanswerable examples in training with the correct output being a refusal, and evaluate the abstention behaviour explicitly. (2) OPEN-ENDED GENERATION, not classification over a fixed vocabulary. The benchmark setup's top-3000-answers framing does not survive contact with real questions. Use a VLM and generate. (3) CALIBRATION AND ROUTING. Produce a confidence signal and route low-confidence cases - to a follow-up question ('could you take another photo showing the label?'), to a different tool, or to a human. The follow-up option is underused and is often the most useful behaviour: the system knows what would help. (4) RESOLUTION AND OCR. A large fraction of real visual questions are about TEXT - labels, prices, expiry dates, signs, screens. A general VLM at 336px cannot read them. A dedicated OCR pass feeding text to the model is usually the highest-value engineering decision in the system. THE EVALUATION, which is where I would spend the most care. (a) BUILD THE UNIMODAL ABLATIONS FIRST. Question-only and image-only baselines on YOUR data. If the question-only model is close to the full one, your evaluation set is measuring priors and any model comparison on it is uninformative. This is one training run and it should precede everything. (b) COLLECT REAL QUESTIONS from real users on real images, not synthetic ones. The distribution differs enormously - real questions are shorter, more ambiguous, more often about text, and more often unanswerable. (c) EVALUATE ABSTENTION SEPARATELY: what fraction of unanswerable questions get a refusal, and what fraction of answerable ones get a spurious refusal? Report both; a system can score well on one by sacrificing the other. (d) PER-QUESTION-TYPE BREAKDOWN. Counting, colour, text-reading, spatial relations, and yes/no all behave very differently, and an aggregate hides that counting is near-useless while colour is fine. (e) A SHIFTED evaluation set - different image sources, different question phrasings, a different time period - to check that performance is not distribution-specific. (f) HUMAN EVALUATION on correctness, since automatic matching against a reference answer punishes correct paraphrases and cannot judge open-ended responses. THE THING I WOULD FLAG TO STAKEHOLDERS: the cost asymmetry. For most product VQA, a wrong answer is much more expensive than a refusal, because the user acts on it and cannot verify it. That should set the operating point, and it means the headline metric is not accuracy but something like 'accuracy on answered questions at a stated coverage' - a risk-coverage curve, not a single number. Framing it that way at the start prevents a great deal of argument later."
        },
        {
          "q": "Compare VQA with text-only question answering. What transfers and what does not?",
          "a": "WHAT IS STRUCTURALLY THE SAME, which is more than people expect. Both are conditional generation or classification given a question and a context. Both suffer the same class of failure - a model exploiting statistical regularities in the question-answer relationship rather than consulting the context. Both were undone by the same diagnostic: SQuAD's AddSent showed one appended distractor sentence halving F1 because models were ranking spans by question similarity; VQA's question-only baseline showed 44% of the task solvable blind. Both needed the same fixes - SQuAD 2.0 added unanswerable questions, VQA v2 added complementary pairs, and both were data-side interventions against a shortcut. And both need abstention as a first-class capability that the original benchmarks omitted. That parallel is worth stating explicitly, because recognizing it means the diagnostic toolkit transfers wholesale. WHAT IS HARDER IN THE VISUAL CASE. (1) THE CONTEXT IS NOT DISCRETE. A passage is a sequence of tokens the model can attend to and point at; an image is a continuous grid with no natural units. Extractive answering - point at the span containing the answer - has no clean visual analogue, so you lose the grounding guarantee that extractive QA provides for free. A text QA model literally cannot return text absent from the passage; a VQA model can say anything. (2) NO ORDERING OR SYNTAX to exploit. Text has structure the model can use to locate information; an image has spatial structure that must be learned. (3) RESOLUTION IS A HARD CONSTRAINT. If the answer is small text in the image, the information may not be in the model's input at all - there is no equivalent in text QA, where the passage is either present or not. (4) ANNOTATION AMBIGUITY IS HIGHER. VQA uses ten annotators and credits partial agreement because open-ended visual questions genuinely have multiple valid answers, and human performance is around 80%. Text QA has more determinate answers. (5) THE PRIOR IS STRONGER. A language model has enormous prior knowledge about what scenes contain, and that prior competes against a comparatively thin visual signal - which is why object hallucination is systematic. Text QA's analogue (answering from parametric memory instead of the passage) exists but is weaker because the passage is a strong, discrete signal. WHAT IS EASIER. Visual questions are typically SHORTER and more templated in benchmarks, and the answer vocabulary is smaller. Multi-hop reasoning is less common. WHAT TRANSFERS DIRECTLY, and this is the practical payoff. The evaluation discipline: input ablations, adversarially-constructed challenge sets, unanswerable examples, abstention as a measured behaviour, risk-coverage curves rather than single accuracies, and per-type breakdowns. Retrieval-augmented framings transfer too - a VQA system can retrieve external knowledge for questions requiring facts not in the image (OK-VQA is built around exactly this), which is retrieve-then-read with an image as part of the query. THE ONE I WOULD EMPHASIZE: extractive QA's grounding guarantee has no visual equivalent, and that absence is why hallucination is a much bigger problem in VQA than in extractive text QA. Any high-stakes visual QA system needs a verification step - re-detecting mentioned objects, or checking against OCR output - to recover something like the guarantee that extractive text QA gets from its architecture."
        },
        {
          "q": "How do you tell whether a multimodal model is actually using both modalities?",
          "a": "THE QUESTION SHOULD BE ROUTINE AND USUALLY IS NOT, and the tools are cheap. I would run them in order of cost. LEVEL 1 - UNIMODAL ABLATION AT TRAINING TIME. Train separate models on each modality alone, using the same architecture and data otherwise. Compare against the full model. If the text-only model is within a point of the multimodal one, the second modality is contributing nothing measurable and your task or dataset does not require it. This is the definitive test and it costs one training run per modality. It is the same experiment as NLI's hypothesis-only baseline and it has the same status: not optional. LEVEL 2 - MODALITY CORRUPTION AT INFERENCE TIME, which needs no retraining. Take the trained multimodal model and feed it a BLANK, SHUFFLED, or MISMATCHED image while keeping the question. If the answers barely change, the model is ignoring the image regardless of what it was trained on. Mismatched is the more informative variant - pair each question with a different image from the dataset and measure how much accuracy drops. A small drop is a strong signal. LEVEL 3 - PERFORMANCE UNDER DISTRIBUTION SHIFT. Build or find a split where the shortcut and the task disagree - VQA-CP for answer priors, complementary pairs for question priors, POPE's adversarial split for co-occurrence. A large drop confirms reliance on the regularity rather than the modality. Note the caveat that a systematic, known shift becomes gameable once it is a target. LEVEL 4 - ATTENTION AND ATTRIBUTION, with appropriate caution. Visualize cross-attention from answer tokens to image regions, or compute input-gradient attributions over the image. These are useful for generating hypotheses - 'is it looking at the object it is describing?' - and they are correlational. Attention is not explanation: you can often find different attention patterns producing the same output. Treat a suspicious attention map as a lead, not a finding. LEVEL 5 - CAUSAL INTERVENTION, which is the strongest evidence. Modify the image in a way that SHOULD change the answer - remove the object, change its colour, add a second instance - and check whether the answer changes correspondingly. This is a counterfactual test and it is the visual analogue of a contrast set. If you can generate these programmatically (inpainting, colour manipulation, object insertion) you can build a substantial diagnostic suite cheaply, and the resulting per-perturbation accuracy table is far more informative than any aggregate. WHAT I WOULD REPORT. Not a single accuracy but a table: full model, each unimodal ablation, mismatched-modality accuracy, shifted-split accuracy, and counterfactual consistency (the fraction of perturbation pairs where the model's answer changes correctly). The SHAPE of that table is the result. A model at 70% whose blind baseline is 65% is a different object from a model at 70% whose blind baseline is 40%, and reporting only the 70% conflates them. THE HABIT WORTH INSTILLING, which is this module's spine: assume the model might not need the second modality until you have checked. It is a cheap check, it is frequently surprising, and 'multimodal' in a system's name is a description of its inputs rather than evidence about its computation."
        },
        {
          "q": "What makes counting hard for vision-language models?",
          "a": "COUNTING IS THE CLEANEST FAILURE IN THIS AREA because it is unambiguous - there is a right answer, it is verifiable, and models are bad at it in a specific and diagnosable way. THE REASONS, and they stack. (1) THE ARCHITECTURE DOES NOT COUNT. A transformer over patch tokens has no counting primitive. To answer 'how many dogs' it must detect instances, individuate them (decide two patches belong to the same dog and a third to another), and aggregate - a multi-step procedure with no architectural support. Attention pools, and pooling loses cardinality: a representation that says 'dogs are present, strongly' does not distinguish three dogs from five. (2) THE TRAINING SIGNAL NEVER REQUIRED IT. Contrastive image-text pretraining asks which caption matches among unrelated alternatives, and recognizing that dogs are present always suffices - a batch essentially never contains 'three dogs' and 'four dogs' as competing options. So there is no gradient pressure toward cardinality. This is the same explanation as attribute binding and spatial relations, and it is the dominant cause. (3) THE CAPTIONS RARELY SPECIFY COUNTS. Web alt-text says 'dogs playing', not 'three dogs'. Where counts do appear they are small, so the model sees '2' constantly and '7' almost never. (4) THE ANSWER PRIOR IS EXTREMELY STRONG. In VQA, 'how many' is answered '2' more than any other number by a wide margin, so predicting a small number is a good strategy that requires no visual work at all. The failure is therefore partly a language-prior failure rather than a perception failure, and the two need separating. (5) RESOLUTION AND OCCLUSION make individuation genuinely hard for many images even for a well-designed system. HOW TO DIAGNOSE WHICH CAUSE IS OPERATING, which matters because the fixes differ. Test on images with counts OUTSIDE the common range - seven, twelve, twenty - and see whether the model regresses to small numbers regardless of content, which indicates a prior problem. Test with a controlled synthetic set where you generate exactly N objects and vary N, which isolates perception from prior. And compare against a dedicated DETECTOR: if an object detector plus a count gets it right and the VLM does not, the visual information is available and the failure is in aggregation, not perception. WHAT ACTUALLY FIXES IT. (a) DELEGATE TO A DETECTOR. Run an object detector, count the boxes, and give the count to the model. This is the same principle as giving a language model a calculator - do not ask a system that pattern-matches to perform a deterministic procedure it has no mechanism for. It is unglamorous, reliable, and what I would ship. (b) COUNTING-SPECIFIC TRAINING DATA with a balanced count distribution, which addresses both the prior and the perception. (c) Architectures with explicit object-level representations rather than pooled patches. (d) Chain-of-thought or programmatic decomposition - having the model enumerate and then count - which helps somewhat by externalizing the aggregation step, and is fragile. THE GENERAL PRINCIPLE I WOULD END ON: when a model fails at a task with a deterministic procedure and a verifiable answer, the question to ask is whether the architecture has any mechanism for that procedure. Counting, arithmetic, exact string matching, and sorting all fall in this class, and in every case the reliable engineering answer is to delegate to something that computes rather than to train harder on something that estimates."
        },
        {
          "q": "How would you design a VQA dataset that resists shortcut learning?",
          "a": "THE PRINCIPLE FIRST: shortcuts are created by the COLLECTION PROCESS, not by the subject matter. So the design work is anticipating what regularities the protocol will introduce and structuring collection to remove them. Fixing it afterwards with modelling tricks is strictly worse. THE DESIGN MOVES, roughly in order of effectiveness. (1) BALANCED COMPLEMENTARY PAIRS, which is VQA v2's contribution and remains the strongest single technique. For every question, include a second image where the same question has a DIFFERENT answer. This makes p(answer | question) uninformative by construction, so no amount of language modelling helps. It roughly doubles collection cost and it removes the shortcut rather than penalizing it, which is why it is more robust than any debiasing method. (2) BALANCE THE ANSWER DISTRIBUTION WITHIN QUESTION TYPE, deliberately. If 'how many' is answered '2' most of the time in the wild, oversample images with other counts until the distribution is flat. The same for colours, sports, and yes/no. (3) CONTROL HOW QUESTIONS ARE ELICITED. If you show an annotator an image and ask them to write a question, they write questions whose answers are salient and usually affirmative - which is where the 70% 'yes' rate came from. Better protocols: ask for questions with a SPECIFIED answer, ask for questions that are hard, or ask one annotator to write a question and a different one to answer it independently (disagreement then flags ambiguity). Elicitation protocol is the single biggest source of artifacts and the least examined. (4) INCLUDE UNANSWERABLE QUESTIONS in realistic proportion, so abstention is trainable and measurable. Benchmark datasets essentially never contain these and real deployments are full of them. (5) COLLECT COUNTERFACTUAL PAIRS: the same image edited so the answer changes (object removed, colour changed, count altered). These support consistency evaluation - does the model's answer change when it should - which is a much stricter test than per-example accuracy. (6) SPLIT ADVERSARIALLY as a diagnostic set, not as the main benchmark: a VQA-CP-style shifted split held out for measurement. And keep it PRIVATE, because a known systematic shift becomes gameable once it is a target, which is exactly what happened to VQA-CP. THE VALIDATION I WOULD RUN BEFORE RELEASING ANYTHING. (a) Train the UNIMODAL BASELINES on my own dataset - question-only and image-only. If either scores well above chance, I have a shortcut and should fix the data before publishing. This is the minimum acceptable diligence and it is cheap. (b) Train a deliberately WEAK model (logistic regression on question bag-of-words) and see what it finds - weak models find the easiest signal first, which makes them useful shortcut detectors. (c) Compute PMI between question n-grams and answers to locate specific give-aways. (d) Check for annotator-specific and source-specific regularities: if one annotator wrote a large block of questions, their style is a leakable signal. (e) Have humans attempt a sample WITHOUT the image and report their accuracy - a direct, interpretable measure of how much the question gives away. THE HONEST CAVEAT I would include in the dataset paper: you cannot remove shortcuts you have not thought of, and the ones that matter are usually the ones nobody anticipated. So I would publish the ablation baselines alongside the dataset as part of the release, invite people to find shortcuts, and treat the dataset as revisable - which is what VQA v1 to v2 to VQA-CP actually was, played out over several years and several groups. Building that expectation in from the start is better than defending a first version."
        }
      ]
    },
    "flashcards": [
      {
        "type": "pitfall",
        "front": "The question-only baseline",
        "back": "A BLIND model scored ~44% on VQA v1 vs ~55% for full models. Vision's measurable contribution was ~11 points. Run the unimodal ablation before believing any multimodal result - one training run per modality."
      },
      {
        "type": "intuition",
        "front": "Where VQA's language priors come from",
        "back": "'What sport' -> tennis ~41%; 'how many' -> '2' most often; yes/no -> 'yes' ~70%. Not a model bug - a correct read of the training distribution, which is exactly what supervised learning optimizes for."
      },
      {
        "type": "definition",
        "front": "VQA v2's complementary pairs",
        "back": "For every question, a SECOND similar image with a DIFFERENT answer, so p(answer|question) is uninformative by construction. A DATA-side fix - removes the signal rather than regularizing against it, which is why it is robust."
      },
      {
        "type": "definition",
        "front": "VQA-CP",
        "back": "Changing Priors: train and test answer distributions per question type deliberately DIFFER. Models dropped ~20-25 points on identical images and questions. Same construction as HANS in NLI."
      },
      {
        "type": "pitfall",
        "front": "VQA-CP is a diagnostic, not a target",
        "back": "Its shift is systematic and KNOWN, so methods can exploit the inverse prior and score well without better grounding - several published debiasing methods were shown to be partly doing this. Any structured adversarial benchmark becomes gameable once targeted."
      },
      {
        "type": "definition",
        "front": "VQA accuracy is not accuracy",
        "back": "min(#of 10 annotators giving that answer / 3, 1). Human performance is ~80%, not 100%, because open-ended visual questions genuinely have multiple valid answers - so 80% is the measurement ceiling."
      },
      {
        "type": "intuition",
        "front": "i.i.d. test sets cannot find shortcuts",
        "back": "Structural, not a sampling problem: the shortcut works on the test set for exactly the reason it works in training. Detection requires data built so the shortcut and the task DISAGREE."
      },
      {
        "type": "pitfall",
        "front": "Unanswerable questions",
        "back": "Benchmark questions are always answerable; real ones are not - VizWiz (blind users' real photos) found a large fraction cannot be answered from the image. Without trained abstention the model confidently guesses."
      },
      {
        "type": "definition",
        "front": "The modality-corruption test",
        "back": "No retraining needed: feed the trained model a BLANK, SHUFFLED, or MISMATCHED image with the same question. If answers barely change, it is ignoring that modality. Mismatched is the most informative variant."
      },
      {
        "type": "intuition",
        "front": "Why counting fails",
        "back": "No architectural counting primitive (pooling loses cardinality); contrastive pretraining never required it (unrelated negatives make presence sufficient); captions rarely state counts; and '2' is a strong prior. Fix by DELEGATING to a detector."
      },
      {
        "type": "pitfall",
        "front": "Elicitation protocol creates the artifacts",
        "back": "Showing an annotator an image and asking for a question yields salient, usually-affirmative questions - that is where the 70% 'yes' rate came from. Ask for a question with a SPECIFIED answer, or separate question-writer from answerer."
      },
      {
        "type": "intuition",
        "front": "What to report instead of one number",
        "back": "A table: full model, each unimodal ablation, mismatched-modality accuracy, shifted-split accuracy, counterfactual consistency. 70% with a 65% blind baseline is a different object from 70% with a 40% one."
      }
    ],
    "refs": [
      {
        "title": "Goyal et al. (2017), Making the V in VQA Matter: Elevating the Role of Image Understanding (VQA v2)",
        "url": "https://arxiv.org/abs/1612.00837"
      },
      {
        "title": "Agrawal et al. (2018), Don't Just Assume; Look and Answer: Overcoming Priors for VQA (VQA-CP)",
        "url": "https://arxiv.org/abs/1712.00377"
      },
      {
        "title": "Antol et al. (2015), VQA: Visual Question Answering",
        "url": "https://arxiv.org/abs/1505.00468"
      },
      {
        "title": "Gurari et al. (2018), VizWiz Grand Challenge: Answering Visual Questions from Blind People",
        "url": "https://arxiv.org/abs/1802.08218"
      },
      {
        "title": "Dancette et al. (2021), Beyond Question-Based Biases: Assessing Multimodal Shortcut Learning in VQA",
        "url": "https://arxiv.org/abs/2104.03149"
      }
    ],
    "demos": [
      "attention",
      "classification-metrics",
      "embeddings",
      "saliency"
    ]
  },
  "multimodal-fusion": {
    "level": "core",
    "body": {
      "intuition": [
        "Once you have two modalities you have to combine them, and the textbook taxonomy is early fusion (concatenate the raw inputs or low-level features), late fusion (train separate models and combine their predictions), and intermediate fusion (join the representations somewhere in the middle, usually with attention). That framing is fine as far as it goes and it obscures the finding that should shape your expectations.",
        "MULTIMODAL MODELS OFTEN UNDERPERFORM THE BEST SINGLE-MODALITY BASELINE. Wang et al. measured this carefully on video classification: a network given both audio and video did WORSE than the video-only network, despite strictly more information. That is not a bug in the fusion layer. The causes are structural. A multimodal network has more parameters and more capacity, so it OVERFITS sooner. And the two modalities have different signal strength and different overfitting rates, so the model latches onto whichever is easier to fit and effectively stops learning from the other - GREEDY LEARNING, or modality dominance. More information can genuinely make the model worse.",
        "That reframes what fusion architecture is for. The design question is not 'where do I concatenate' but 'how do I stop one modality from crowding out the other, and how do I know whether the second one is contributing at all'. Gradient blending answers the first by weighting each modality's loss according to its measured overfitting-to-generalization ratio. The second is answered by the same discipline as everywhere in this module: train the unimodal baselines, compare, and treat the multimodal model as needing to EARN its extra modality rather than being assumed to benefit from it."
      ],
      "math": [
        {
          "h": "The three fusion points",
          "paras": [
            "Where the modalities meet determines what interactions the model can represent. Late fusion cannot express any cross-modal interaction below the decision level; early fusion can, but forces the network to learn alignment from raw signals with very different statistics."
          ],
          "tex": "\\text{early: } y = g\\big([x_a; x_v]\\big) \\qquad \\text{late: } y = h\\big(g_a(x_a),\\, g_v(x_v)\\big) \\qquad \\text{inter: } y = h\\big(\\mathrm{Attn}(f_a(x_a),\\, f_v(x_v))\\big)",
          "texNote": "Late fusion is robust to missing modalities and to differing sample rates, and it can only combine CONCLUSIONS. Intermediate fusion with cross-attention is the modern default because it lets the modalities interact while keeping their encoders specialized."
        },
        {
          "h": "Bilinear pooling: modelling multiplicative interactions",
          "paras": [
            "Concatenation gives the model only additive interactions unless it learns products itself. The outer product gives every pairwise feature interaction explicitly - and is far too large, which is why the low-rank approximations exist."
          ],
          "tex": "z = W\\,\\mathrm{vec}(f_a f_v^{\\top}) \\;\\in\\; \\mathbb{R}^{d_a d_v} \\quad\\longrightarrow\\quad z \\approx \\big(U^{\\top}f_a\\big) \\odot \\big(V^{\\top}f_v\\big)",
          "texNote": "The full outer product for two 2048-d features is over 4 million terms per output unit. MCB approximates it with count-sketch projections, MLB and MUTAN with low-rank factorizations - and the elementwise product of two projections is the cheap version that captures most of the benefit."
        },
        {
          "h": "Gradient blending: weight each modality by whether it is overfitting",
          "paras": [
            "Wang et al.'s fix. Train with auxiliary unimodal heads alongside the joint one, and weight each loss by its OVERFITTING-TO-GENERALIZATION ratio - measured, not guessed - so a modality that is memorizing gets down-weighted before it dominates."
          ],
          "tex": "\\mathcal{L} = \\sum_{k \\in \\{a,\\,v,\\,av\\}} w_k \\mathcal{L}_k, \\qquad w_k \\propto \\frac{\\Delta G_k}{O_k^2}, \\quad O_k = \\text{overfitting},\\; \\Delta G_k = \\text{generalization gain}",
          "texNote": "O is measured as the gap between training and validation loss; Delta G as the validation improvement. The weights are recomputed periodically during training. The point is that the blend is DATA-DRIVEN rather than a hand-tuned hyperparameter."
        }
      ],
      "code": [
        {
          "h": "The experiment that should precede any fusion architecture",
          "paras": [
            "Three models, and the comparison that tells you whether fusion is worth building at all. This is the same ablation as VQA's question-only baseline, applied to your own task."
          ],
          "code": "audio_only = train(AudioNet())\nvideo_only = train(VideoNet())\nfused      = train(FusionNet())\n\n# Wang et al., Kinetics video classification (representative):\n#   video only ........ 72.6%\n#   audio only ........ 22.6%\n#   naive late fusion . 71.4%    <- WORSE than video alone\n#   + gradient blending 74.5%    <- now the fusion helps\n#\n# The naive fused model has strictly MORE information and performs WORSE.\n# Two structural causes, neither fixable by a better concatenation:\n#\n#  1. OVERFITTING. More parameters and more capacity, same data. The joint\n#     model reaches a lower training loss and a higher validation loss.\n#\n#  2. GREEDY LEARNING / MODALITY DOMINANCE. The modalities have different\n#     signal strength and different learning speeds, so the optimizer\n#     latches onto whichever reduces loss fastest and the other's encoder\n#     stops receiving useful gradient. The result is a large model that is\n#     effectively unimodal, with the extra parameters spent on overfitting.\n#\n# DIAGNOSTIC for dominance: at inference, ZERO OUT one modality and measure\n# the drop. If zeroing audio costs 0.3% while zeroing video costs 40%, the\n# audio branch is decoration regardless of what the architecture diagram says.\n\nfor drop in [\"none\", \"audio\", \"video\"]:\n    print(drop, evaluate(fused, zero_modality=drop))",
          "caption": "A fused model with strictly more information scoring below the video-only baseline. The fix was not a better fusion layer - it was reweighting the losses so one modality could not crowd out the other."
        },
        {
          "h": "Cross-attention fusion, and handling missing modalities",
          "paras": [
            "The modern default, plus the piece that production systems need and papers rarely include: what happens when a modality is absent at inference."
          ],
          "code": "class CrossAttnFusion(nn.Module):\n    def __init__(self, d, heads=8):\n        super().__init__()\n        self.a2v = nn.MultiheadAttention(d, heads, batch_first=True)\n        self.v2a = nn.MultiheadAttention(d, heads, batch_first=True)\n        self.norm_a, self.norm_v = nn.LayerNorm(d), nn.LayerNorm(d)\n        # learned placeholders for a modality that is absent at inference\n        self.missing_a = nn.Parameter(torch.zeros(1, 1, d))\n        self.missing_v = nn.Parameter(torch.zeros(1, 1, d))\n\n    def forward(self, fa, fv, has_a=True, has_v=True):\n        if not has_a: fa = self.missing_a.expand(fv.size(0), 1, -1)\n        if not has_v: fv = self.missing_v.expand(fa.size(0), 1, -1)\n        a = self.norm_a(fa + self.v2a(fa, fv, fv)[0])   # audio queries video\n        v = self.norm_v(fv + self.a2v(fv, fa, fa)[0])   # video queries audio\n        return torch.cat([a.mean(1), v.mean(1)], dim=-1)\n\n# MODALITY DROPOUT during training is what makes the missing case work:\n#   randomly drop each modality with p ~ 0.1-0.3 so the model learns to\n#   function on either alone AND on both. Without it, a model trained only\n#   on complete pairs degrades unpredictably when a sensor fails, a video\n#   has no audio track, or a record has a null field - which in production\n#   is not an edge case but a constant.\n#\n# It also acts as a regularizer against modality dominance: a model that\n# relies entirely on video is punished whenever video is dropped.",
          "caption": "Cross-attention lets each modality query the other while keeping encoders specialized. Modality dropout during training handles absent inputs at inference and simultaneously discourages one modality from dominating."
        }
      ],
      "useCases": [
        "Video understanding combining RGB, optical flow, and audio, where the modalities are temporally aligned and complementary - and where the underperformance result was first measured carefully.",
        "Clinical prediction from imaging plus structured records plus notes, a setting where missing modalities are the norm rather than the exception and modality dropout is essential rather than optional.",
        "Multimodal sentiment and affect recognition from text, prosody, and facial expression, where the text modality typically dominates and the others must be protected from being crowded out.",
        "Autonomous systems fusing camera, lidar, and radar, where the fusion point is a genuine engineering decision - early fusion buys cross-sensor detail, late fusion buys graceful degradation when a sensor fails, and safety usually favours the latter."
      ],
      "pitfalls": [
        "Assuming more modalities means better performance. Fused models routinely UNDERPERFORM the best unimodal baseline because of extra capacity (overfitting) and greedy learning (one modality dominating). Always train the unimodal baselines and compare.",
        "Not measuring modality dominance. Zero out each modality at inference and measure the drop: if removing one costs almost nothing, its branch is decoration regardless of the architecture diagram.",
        "Training only on complete examples. Production data has missing modalities constantly - a silent video, a null field, a failed sensor - and a model that never saw an absent modality degrades unpredictably. Use modality dropout, which also regularizes against dominance.",
        "Concatenating features with wildly different scales and dimensionalities. A 2048-d image feature next to a 12-d tabular vector means the small one contributes almost nothing to the first layer's gradients. Project to comparable dimensions and normalize.",
        "Using full bilinear pooling. The outer product of two 2048-d features is over 4 million terms per output; use low-rank or sketched approximations, or an elementwise product of projections, which captures most of the benefit.",
        "Ignoring temporal or spatial ALIGNMENT. Audio and video sampled at different rates, or a caption describing a region rather than the whole image, need explicit alignment - concatenating misaligned representations teaches the model to ignore the harder one.",
        "Choosing early fusion for a safety-critical sensor system. Late or hybrid fusion degrades gracefully when a sensor fails and keeps per-sensor failure modes diagnosable, which usually matters more than the extra accuracy from early cross-sensor interaction."
      ],
      "connections": [
        {
          "ref": "multimodal/vqa",
          "text": "Modality dominance is the architectural version of the language-prior failure - a model answering from the easier signal and effectively ignoring the other."
        },
        {
          "ref": "multimodal/vlm-captioning",
          "text": "A VLM's connector is a fusion design, and the finding that the connector matters less than the data is the same conclusion this lesson reaches from the other direction."
        },
        {
          "ref": "ml-applications/multi-task",
          "text": "Loss balancing across objectives is the same problem as loss balancing across modalities, and gradient blending is a sibling of the uncertainty-weighting and gradient-surgery methods there."
        },
        {
          "ref": "ml-theory/bias-variance",
          "text": "The overfitting explanation is a capacity story: more parameters on the same data, with the extra capacity spent memorizing rather than integrating."
        },
        {
          "ref": "multimodal/multimodal-eval",
          "text": "Unimodal ablations and modality-zeroing are the core of honest multimodal evaluation, and they belong in the results table rather than in an appendix."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are early, late, and intermediate fusion?",
          "a": "Early: combine raw inputs or low-level features. Late: separate models, combine predictions. Intermediate: join representations mid-network, usually with attention. The fusion point determines which interactions are representable."
        },
        {
          "q": "What is the surprising empirical result about fusion?",
          "a": "Multimodal models often UNDERPERFORM the best unimodal baseline despite having strictly more information - measured carefully by Wang et al. on video classification."
        },
        {
          "q": "Why does that happen?",
          "a": "Two causes: extra capacity means more overfitting on the same data; and GREEDY LEARNING, where the optimizer latches onto whichever modality reduces loss fastest and the other's encoder stops learning."
        },
        {
          "q": "What is modality dominance?",
          "a": "One modality's signal is easier to fit, so the model relies on it and effectively ignores the other. The result is a large model that is functionally unimodal."
        },
        {
          "q": "How do you detect it?",
          "a": "Zero out each modality at inference and measure the accuracy drop. If removing one costs almost nothing, that branch is decoration whatever the diagram says."
        },
        {
          "q": "What is gradient blending?",
          "a": "Train auxiliary unimodal heads alongside the joint one and weight each loss by its measured overfitting-to-generalization ratio, recomputed during training. A data-driven blend rather than a tuned hyperparameter."
        },
        {
          "q": "What is modality dropout?",
          "a": "Randomly drop each modality during training (p ~ 0.1-0.3) so the model works with either alone and with both. Handles missing inputs at inference and regularizes against dominance."
        },
        {
          "q": "What is bilinear pooling for?",
          "a": "Concatenation gives only additive interactions; the outer product gives every pairwise feature product explicitly. It is far too large, so MCB, MLB, and MUTAN approximate it."
        },
        {
          "q": "When is late fusion the right choice?",
          "a": "When modalities have very different sample rates, when missing modalities are common, when per-modality failure must be diagnosable, or when graceful degradation matters more than peak accuracy - safety-critical sensor fusion, typically."
        },
        {
          "q": "Why does feature scale matter in concatenation?",
          "a": "A 2048-d image feature beside a 12-d tabular vector means the small one barely influences the first layer's gradients. Project to comparable dimensions and normalize before concatenating."
        },
        {
          "q": "What does alignment mean here?",
          "a": "Corresponding parts of the modalities must be matched - temporally for audio and video at different rates, spatially for a caption describing a region. Misaligned representations teach the model to ignore the harder modality."
        },
        {
          "q": "What is the modern default architecture?",
          "a": "Modality-specific encoders plus cross-attention, or tokenizing every modality and letting a single transformer's self-attention do the fusion - which is what unified multimodal models do."
        }
      ],
      "standard": [
        {
          "q": "Why do multimodal models sometimes underperform unimodal ones, and what do you do about it?",
          "a": "THE RESULT. Wang et al. measured this on video classification: a video-only network reached 72.6%, an audio-only network 22.6%, and the naively fused audio-video network 71.4% - WORSE than video alone, despite strictly more information. This is not an isolated finding; it recurs across multimodal tasks and it is the single most important thing to know before designing a fusion architecture. THE TWO CAUSES, which are separable and need different fixes. (1) OVERFITTING FROM EXTRA CAPACITY. The multimodal network has more parameters - two encoders plus a fusion module - trained on the same number of examples. It reaches a lower training loss and a higher validation loss than the unimodal model. The extra capacity is spent memorizing rather than integrating. (2) GREEDY LEARNING, or modality dominance, which is the more interesting cause. The modalities differ in signal strength and in how quickly they can be fit. Gradient descent reduces loss along the fastest available direction, so the model rapidly exploits the easier modality; once the loss is low, the gradient reaching the harder modality's encoder is small, and that encoder never learns a useful representation. The result is a large model that is functionally unimodal, with the second branch contributing noise and parameters. Note this is a training-DYNAMICS failure, not a representational one - the architecture could represent a good joint model, and the optimizer does not find it. HOW TO DIAGNOSE. Train the unimodal baselines first, always. Then, on the trained fused model, ZERO OUT each modality at inference and measure the drop. If removing audio costs 0.3% and removing video costs 40%, the audio branch is decoration. Also compare the fused model's training and validation curves against the unimodal ones - if the gap is much larger, overfitting is the dominant cause; if the gap is similar but the fused model is no better, dominance is. THE FIXES, matched to the cause. For OVERFITTING: standard regularization, but applied thoughtfully - stronger weight decay and dropout, smaller fusion modules, and pretrained frozen encoders so only the fusion is learned. For DOMINANCE: (a) GRADIENT BLENDING, which is the principled answer - attach auxiliary unimodal heads, and weight each loss by its measured overfitting-to-generalization ratio, recomputed periodically. A modality that is memorizing gets down-weighted before it can dominate. This recovered 74.5% in the paper, finally beating video alone. (b) MODALITY DROPOUT: randomly drop each modality during training, so a model relying entirely on one is punished whenever that one is absent. Simple, effective, and it also solves the missing-modality problem at inference. (c) SEPARATE LEARNING RATES or staged training - train each encoder separately, then fuse - which prevents the fast modality from racing ahead. (d) Auxiliary unimodal losses even without the blending weights, which keeps gradient flowing to both encoders. WHAT I WOULD TAKE AWAY, and it is the module's spine: adding a modality is a hypothesis, not an improvement. The default expectation should be that the model might not use it, and the check - unimodal baselines plus modality zeroing - is cheap and belongs in the results table rather than an appendix. A paper reporting a multimodal result without unimodal baselines has not established that the multimodality did anything."
        },
        {
          "q": "Design a system that predicts patient outcomes from imaging, structured records, and clinical notes.",
          "a": "THE DEFINING FEATURE OF THIS SETTING is that MISSING MODALITIES ARE THE NORM. Not every patient has a scan, notes are inconsistently written, lab panels differ by presentation, and the pattern of what is missing is itself informative - a patient who got a CT is different from one who did not. So the architecture must handle absence as a first-class case rather than as an exception, and I would design for that before optimizing anything. THE ARCHITECTURE. Modality-specific encoders: a pretrained imaging model (fine-tuned, ideally after continued pretraining on in-domain scans), a clinical text encoder for notes, and a tabular model - and I would use gradient-boosted trees as the tabular BASELINE, because on structured clinical data they are extremely hard to beat and any deep tabular branch must justify itself against them. Then intermediate fusion with cross-attention over the modality representations, with LEARNED MISSING-MODALITY EMBEDDINGS so an absent modality has a defined representation, and MODALITY DROPOUT during training so the model genuinely works with any subset. THE BASELINES THAT DECIDE THE PROJECT, which I would build first. Structured records alone with gradient boosting. Notes alone. Imaging alone. And a simple clinical risk score if one exists for the outcome, because established scores are often startlingly competitive and their absence from the comparison is a common reviewer objection. If the multimodal model does not clearly beat the best of these, it should not ship - and given the underperformance result, that is a real possibility rather than a formality. THE ISSUES SPECIFIC TO CLINICAL DATA. (1) MISSINGNESS IS INFORMATIVE AND LEAKY. That a test was ordered encodes the clinician's suspicion, which correlates with the outcome. A model can achieve strong apparent performance by learning 'this patient got a troponin test, so cardiac concern was present' - which is real signal but not the signal you wanted, and it will not transfer to a screening deployment where ordering patterns differ. Decide explicitly whether missingness indicators are legitimate features for the intended use. (2) TEMPORALITY AND LEAKAGE. Everything must be measured at a defined prediction time, and anything recorded after it is leakage. Clinical notes are especially dangerous here because they are often written or amended after the outcome is known - a discharge summary mentioning the diagnosis is a perfect predictor and a worthless model. This is the most common fatal error in this kind of project. (3) SPLITTING must be by PATIENT and ideally by SITE and TIME PERIOD, never randomly. Records from one patient are highly self-similar, and site-specific documentation and equipment produce shortcuts that a random split rewards. (4) MODALITY DOMINANCE will almost certainly favour the structured data, because it is dense, low-noise, and easy to fit. Measure it by zeroing each modality, and expect to need gradient blending or dropout to keep the imaging branch alive. EVALUATION. AUROC is the conventional headline and is a poor primary metric for a clinical decision - report CALIBRATION (a reliability diagram and calibration slope), because a risk model whose 20% predictions are not 20% risks is unusable for decision-making, and report DECISION-CURVE or net-benefit analysis at the thresholds clinicians would actually use. Subgroup performance by age, sex, ethnicity, and site is not optional; disparities here are the primary harm channel. And prospective or at least temporally-held-out validation, since retrospective performance systematically overstates. WHAT I WOULD SAY UP FRONT: the modelling is the easy part. The project succeeds or fails on the prediction-time definition, the leakage audit, and the split design, and those decisions are made in the first week."
        },
        {
          "q": "What are the trade-offs between early, late, and intermediate fusion?",
          "a": "EARLY FUSION - combine at the input or low-feature level, then one model. ADVANTAGES: the model can learn arbitrary cross-modal interactions from the ground up, including low-level correlations a later fusion cannot see (audio-visual synchrony at the frame level, for instance). One model to train and serve. DISADVANTAGES: it forces a single architecture to handle signals with completely different statistics, dimensionality, and sample rates; it requires ALIGNMENT before fusion, which for audio at 16 kHz and video at 30 fps is real work; it is fragile to missing modalities, since the input shape is undefined; and it is prone to the dominance problem because everything competes in one representation from the start. LATE FUSION - separate models per modality, combine the predictions. ADVANTAGES: each encoder is specialized and can be trained, tuned, and updated independently; missing modalities are handled trivially by dropping a term; per-modality performance is diagnosable, which matters enormously in production; and it degrades gracefully when a sensor fails. It is also the most robust to differing sample rates and to modalities arriving at different times. DISADVANTAGES: it can only combine CONCLUSIONS, so no cross-modal interaction below the decision level is representable. If the answer requires jointly interpreting the modalities - 'is the person in the video the one speaking' - late fusion cannot express it. INTERMEDIATE FUSION - join the representations mid-network, typically with cross-attention. ADVANTAGES: encoders stay specialized while the representations interact richly; attention handles alignment implicitly rather than requiring it upfront; and it is where the accuracy usually is. This is the modern default. DISADVANTAGES: more design choices (which layer, which direction, how many cross-attention blocks), harder to handle missing modalities without explicit placeholders, and less diagnosable. HOW I WOULD CHOOSE, as a decision procedure. Does the task require JOINT interpretation, or can it be answered by combining independent conclusions? Joint - intermediate. Independent - late is simpler and probably sufficient. Are modalities frequently MISSING? Late, or intermediate with learned missing-modality embeddings and modality dropout. Is GRACEFUL DEGRADATION a safety requirement - autonomous driving, medical monitoring? Late or hybrid, because a single fused model that fails silently when a sensor degrades is a worse failure mode than a slightly less accurate model that reports which sensor is down. Are the modalities TEMPORALLY FINE-GRAINED and correlated at low level (lip-reading, audio-visual sync)? Early or very-early intermediate, because the interaction you need lives below the semantic level. Is data LIMITED? Late, because it has fewer joint parameters and overfits less - which connects directly to the underperformance result. THE HYBRID that most production systems converge on: late fusion as the backbone for robustness and diagnosability, with intermediate cross-attention paths added where a specific joint interaction is known to matter. That gets most of the accuracy while keeping the failure modes legible. AND THE POINT I WOULD MAKE LAST: the modern trend dissolves the taxonomy. If you tokenize every modality and feed one transformer, self-attention performs fusion at every layer simultaneously, so it is early, intermediate, and late at once. That is what unified multimodal models do, and it works when you have enough data and compute - which is the usual condition under which architectural priors stop paying."
        },
        {
          "q": "How do you handle modalities that are missing at inference time?",
          "a": "THE PROBLEM IS UNIVERSAL IN PRODUCTION AND ABSENT FROM MOST PAPERS. Benchmarks provide complete examples; real systems get videos with no audio track, patients without a scan, products without a description, and sensors that fail. A model trained only on complete inputs behaves unpredictably when a modality is absent - not gracefully degraded, but arbitrarily wrong, because it is being fed an input distribution it never saw. THE APPROACHES, from simplest to most capable. (1) ZERO OR MEAN IMPUTATION at the feature level. Feed zeros, or the training-set mean, in place of the missing modality. Trivial, and it puts the model off-distribution unless it was trained for it - which leads directly to the next point. (2) MODALITY DROPOUT DURING TRAINING, which is the key technique and the one I would apply by default. Randomly drop each modality with probability 0.1-0.3 during training, including dropping combinations. The model then learns to function on any subset because it has seen every subset. This costs nothing, it makes imputation safe, and it doubles as a regularizer against modality dominance - a model that relies entirely on video is penalized every time video is dropped. If I could apply only one thing from this lesson, it would be this. (3) LEARNED MISSING-MODALITY EMBEDDINGS: a trainable vector representing 'this modality is absent', used in place of the encoder output. Better than zeros because the model can learn a specific response to absence rather than treating it as an unusual value. Combines naturally with dropout. (4) LATE FUSION, which handles it structurally - drop the missing modality's term and renormalize the combination weights. This is why late fusion persists in sensor systems despite lower peak accuracy. (5) CROSS-MODAL RECONSTRUCTION: train an auxiliary model to predict the missing modality's representation from the present ones, and impute that. Elegant, and it works when the modalities are genuinely redundant - and if they are that redundant, the second modality was adding little anyway, which is worth noticing. (6) A MIXTURE OF EXPERTS over modality subsets - separate heads for each available combination - which is best-in-class per combination and scales badly (2^n subsets). THE THING THAT IS OFTEN MISSED: MISSINGNESS IS FREQUENTLY INFORMATIVE. That a patient has no CT scan, or a product has no description, or a user has not enabled the camera, carries signal. So a missingness INDICATOR is a legitimate feature, and sometimes a strong one. But treat it carefully: if the missingness pattern differs between your training data and deployment - which it will, if deployment changes who gets scanned or what gets described - a model leaning on the indicator will transfer badly. Decide explicitly whether you want the model to use it. WHAT I WOULD EVALUATE, and this is the part that is almost always skipped: performance under EVERY missingness pattern you expect, reported separately. Not just the complete case. A table with one row per available-modality subset shows immediately whether the model degrades gracefully or falls off a cliff, and it frequently reveals that the model is much worse without a modality than the corresponding unimodal baseline - which means the fusion actively harmed it in that condition. That is a real and common failure and no aggregate metric will show it."
        },
        {
          "q": "How does alignment between modalities affect fusion, and what do you do when they are not aligned?",
          "a": "WHAT ALIGNMENT MEANS. Fusion assumes you are combining representations of the SAME THING. That assumption is often false in a way that quietly degrades everything downstream. Audio at 16 kHz and video at 30 fps have completely different temporal granularity. A caption describes one region of an image, not the whole thing. A clinical note refers to a scan taken three days earlier. If the model is fed misaligned representations, the cross-modal signal is noise, and the training dynamics respond by ignoring the harder modality - which is dominance again, arriving through a different door. THE KINDS OF MISALIGNMENT and their handling. (1) TEMPORAL RATE mismatch (audio-video). Standard fix: window and pool one modality to match the other's rate, or resample both to a common one. Better: let cross-attention handle it - the video queries attend over a window of audio frames and learn the correspondence, which avoids committing to a fixed alignment. (2) TEMPORAL OFFSET, where the modalities are correlated but shifted - lip movement leading sound, a sensor with latency. Learn the offset, or provide enough context window that attention can find it. Audio-visual synchronization models exist precisely to estimate this and can be used as a preprocessing step. (3) SPATIAL misalignment: the text refers to a region, not the image. Region-level features plus cross-attention from text tokens to regions is the standard answer, and it is why region-based vision-language pretraining (bottom-up attention, and later grounded pretraining) outperformed whole-image features on tasks needing localization. (4) SEMANTIC misalignment: the modalities describe related but not identical content - a product photo and a marketing description, a news image and its article. Here strict alignment does not exist and forcing it is wrong; a weaker contrastive objective at the document level is more appropriate than assuming correspondence. (5) MISSING CORRESPONDENCE ENTIRELY: unpaired data in each modality. Then you cannot fuse directly and need either a bridging dataset or a cycle-consistency-style objective. WHAT ATTENTION BUYS, and why it became the default. Cross-attention learns a SOFT, DATA-DEPENDENT alignment rather than requiring a fixed one - each query decides for itself what to attend to, so rate differences, offsets, and partial correspondence are all absorbed. That is a real advantage over concatenation, which implicitly asserts that position i in one modality corresponds to position i in the other. If you take one architectural lesson from this, it is that concatenation encodes an alignment assumption and attention does not. HOW I WOULD DIAGNOSE A SUSPECTED ALIGNMENT PROBLEM. Visualize the cross-attention: does the text token attend to the right region, does the video frame attend to the concurrent audio? Deliberately introduce a known offset and see whether performance degrades as expected - if a 200 ms audio shift changes nothing, the model was not using fine temporal correspondence in the first place, which is itself a finding. And check whether the model performs the same on shuffled cross-modal pairs; if it does, alignment is irrelevant to it and you have a dominance problem rather than an alignment one. THE PRACTICAL ORDERING I would recommend: fix gross alignment in preprocessing (resample, window, offset-correct), let attention handle the residual, and measure whether it is doing so rather than assuming. Attention is capable of learning alignment and will not bother if the task can be solved without it."
        },
        {
          "q": "Are modality-specific encoders still necessary, or should everything be one transformer?",
          "a": "THE TREND is clearly toward unification: tokenize every modality and feed one transformer, letting self-attention perform fusion at every layer. That is what unified multimodal models do, and it is worth understanding both why it works and where specialized encoders still earn their place. THE CASE FOR ONE TRANSFORMER. (1) SELF-ATTENTION IS ALREADY A FUSION MECHANISM. If image patches and text tokens are in the same sequence, every layer performs cross-modal interaction - the early/intermediate/late taxonomy dissolves because it is all three at once. (2) FEWER INDUCTIVE BIASES, which is the same argument as CNNs-to-ViTs and U-Nets-to-DiTs: hand-designed structure helps at small scale and constrains at large scale, and the crossover moves as compute grows. This is now the third instance of that pattern in this curriculum, which is enough to treat it as a prior rather than a coincidence. (3) ONE ARCHITECTURE, ONE INFRASTRUCTURE. Everything built for transformers - FlashAttention, parallelism strategies, quantization, serving stacks, scaling-law intuition - applies immediately. This compounds and is underrated. (4) NEW MODALITIES are added by writing a tokenizer, not by designing an encoder. (5) It enables INTERLEAVED sequences (text, image, text, image) which specialized-encoder-plus-fusion designs handle awkwardly. THE CASE FOR MODALITY-SPECIFIC ENCODERS. (1) PRETRAINED WEIGHTS. The strongest practical argument: an existing CLIP vision tower or a pretrained audio encoder embodies enormous compute you get for free. Training a unified model from scratch to match it is expensive, which is why most deployed VLMs still bolt a pretrained ViT onto a pretrained LLM. (2) EFFICIENCY. A modality-specific encoder can compress before fusion - a ViT reduces an image to a few hundred tokens, and processing raw pixels in a general transformer would be far worse. Tokenization IS a modality-specific step even in 'unified' models, which is worth noticing: the unification is at the sequence level, not at the raw-input level. (3) REAL STRUCTURAL DIFFERENCES. Audio is a 1-D signal with meaningful frequency structure; images are 2-D with spatial locality; text is discrete and sequential. Some architectural accommodation of that structure is genuinely useful, especially with limited data. (4) MODULARITY: you can upgrade the vision encoder without retraining everything, and diagnose failures per modality. THE HONEST SYNTHESIS. Modern 'unified' models are less unified than the framing suggests - almost all of them use a modality-specific TOKENIZER or encoder (a ViT, a VQ codec for audio) and then a shared transformer. So the real question is not 'encoders or not' but HOW MUCH modality-specific processing happens before the shared stack, and the answer has been drifting toward less over time as data and compute grow. That drift is the same story as every other architecture-prior question. WHAT I WOULD BUILD TODAY for a practical system: pretrained modality-specific encoders feeding a shared transformer, because the pretrained weights are worth more than architectural purity and because it is what the ecosystem supports. What I would expect in a few years: thinner encoders and a larger shared stack, following the pattern. And the thing I would watch for as evidence either way: whether unified models trained from scratch start beating encoder-plus-LLM assemblies at matched compute - which is the comparison that actually settles it, and which is rarely run cleanly."
        }
      ]
    },
    "flashcards": [
      {
        "type": "pitfall",
        "front": "Multimodal can be WORSE than unimodal",
        "back": "Wang et al., Kinetics: video-only 72.6%, audio-only 22.6%, naive fusion 71.4% - worse than video alone despite more information. Causes: extra capacity (overfitting) and GREEDY LEARNING (one modality dominating)."
      },
      {
        "type": "definition",
        "front": "Greedy learning / modality dominance",
        "back": "The optimizer exploits whichever modality reduces loss fastest; once loss is low, little gradient reaches the other encoder, which never learns. A training-DYNAMICS failure - the architecture could represent the joint model, the optimizer does not find it."
      },
      {
        "type": "definition",
        "front": "The modality-zeroing test",
        "back": "On the trained fused model, zero out each modality at inference and measure the drop. Removing audio costs 0.3% while removing video costs 40% -> the audio branch is decoration, whatever the architecture diagram says."
      },
      {
        "type": "definition",
        "front": "Gradient blending",
        "back": "Auxiliary unimodal heads alongside the joint one, with each loss weighted by its MEASURED overfitting-to-generalization ratio, recomputed during training. Data-driven, not a tuned hyperparameter. Recovered 74.5% - finally beating video alone."
      },
      {
        "type": "definition",
        "front": "Modality dropout",
        "back": "Randomly drop each modality (p ~ 0.1-0.3) during training, including combinations. Makes missing-modality inference safe AND penalizes any model relying on one modality. If you apply one technique from this lesson, this is it."
      },
      {
        "type": "intuition",
        "front": "Fusion point determines representable interactions",
        "back": "Late fusion combines CONCLUSIONS only - it cannot express 'is the person in the video the one speaking'. Early fusion can, but must learn alignment from signals with different statistics. Intermediate + cross-attention is the modern default."
      },
      {
        "type": "pitfall",
        "front": "Concatenating mismatched scales",
        "back": "A 2048-d image feature beside a 12-d tabular vector: the small one barely affects first-layer gradients. Project to comparable dimensions and normalize before concatenating."
      },
      {
        "type": "intuition",
        "front": "Concatenation encodes an alignment assumption",
        "back": "It asserts position i in one modality corresponds to position i in the other. Cross-attention learns a SOFT, data-dependent alignment instead, absorbing rate differences, offsets, and partial correspondence. That is its main advantage."
      },
      {
        "type": "pitfall",
        "front": "Missingness is informative AND leaky",
        "back": "That a test was ordered encodes clinical suspicion; that a camera was enabled encodes intent. Real signal, but it will not transfer if deployment changes the missingness pattern. Decide explicitly whether the indicator is a legitimate feature."
      },
      {
        "type": "pitfall",
        "front": "Evaluate every missingness pattern",
        "back": "Report one row per available-modality subset, not just the complete case. This routinely reveals the fused model is WORSE than the corresponding unimodal baseline when a modality is absent - a real failure no aggregate shows."
      },
      {
        "type": "definition",
        "front": "Bilinear pooling",
        "back": "Outer product gives every pairwise feature interaction, versus concatenation's additive-only. Full version is 4M+ terms for two 2048-d features, so MCB (count sketch), MLB / MUTAN (low-rank), or just elementwise product of two projections."
      },
      {
        "type": "intuition",
        "front": "Late fusion for safety-critical sensing",
        "back": "Degrades gracefully when a sensor fails and keeps per-sensor failure diagnosable. A single fused model that fails SILENTLY on a degraded sensor is a worse failure mode than a slightly less accurate model that reports which sensor is down."
      }
    ],
    "refs": [
      {
        "title": "Wang et al. (2020), What Makes Training Multi-Modal Classification Networks Hard?",
        "url": "https://arxiv.org/abs/1905.12681"
      },
      {
        "title": "Baltrusaitis et al. (2018), Multimodal Machine Learning: A Survey and Taxonomy",
        "url": "https://arxiv.org/abs/1705.09406"
      },
      {
        "title": "Fukui et al. (2016), Multimodal Compact Bilinear Pooling for VQA",
        "url": "https://arxiv.org/abs/1606.01847"
      },
      {
        "title": "Nagrani et al. (2021), Attention Bottlenecks for Multimodal Fusion",
        "url": "https://arxiv.org/abs/2107.00135"
      },
      {
        "title": "Peng et al. (2022), Balanced Multimodal Learning via On-the-fly Gradient Modulation",
        "url": "https://arxiv.org/abs/2203.15332"
      }
    ],
    "demos": [
      "embeddings",
      "attention",
      "multi-head-attention",
      "classification-metrics"
    ]
  },
  "audio-representations": {
    "level": "core",
    "body": {
      "intuition": [
        "Raw audio is a one-dimensional signal at 16,000 samples per second for speech, so one second is a 16,000-length vector and a three-minute song is over eight million samples. Nothing about that representation is convenient: the information humans care about - which phoneme, which note, which speaker - is not visible in the waveform, it is in how frequency content changes over time. So the standard move is to convert audio into a picture: a SPECTROGRAM, with time on one axis, frequency on the other, and energy as intensity. From there a convolutional network or a transformer treats it much like an image.",
        "The conversion has three steps and each one encodes a decision. The SHORT-TIME FOURIER TRANSFORM chops the signal into overlapping windows and takes the Fourier transform of each, which immediately forces the time-frequency uncertainty trade-off: a short window localizes events in time and blurs frequency, a long window does the reverse, and you cannot have both. The MEL SCALE then warps the frequency axis to match human perception, which is roughly logarithmic - we distinguish 200 Hz from 300 Hz easily and 5000 Hz from 5100 Hz barely - so mel bins compress the high frequencies where our resolution is poor. And the LOG compresses amplitude, because loudness perception is also roughly logarithmic and because raw spectral energy spans an enormous dynamic range that would otherwise dominate the loss.",
        "The thing to keep in mind throughout is that a spectrogram DISCARDS PHASE. The Fourier transform gives complex numbers; taking the magnitude throws away the angle. For classification that is fine - phase carries little that a recognizer needs. For GENERATION it is a real problem, because you cannot invert a magnitude spectrogram back to a waveform without inventing the phase, and naive reconstruction sounds metallic and smeared. That single missing quantity is the reason neural vocoders exist and the reason speech synthesis is a two-stage pipeline rather than one model."
      ],
      "math": [
        {
          "h": "The STFT and the time-frequency trade-off",
          "paras": [
            "Window the signal, transform each window, and slide. The window length sets both resolutions simultaneously and in opposite directions - there is no setting that is good at both, which is a mathematical fact rather than an engineering limitation."
          ],
          "tex": "X[m,k] = \\sum_{n=0}^{N-1} x[n + mH]\\,w[n]\\,e^{-2\\pi i kn/N}, \\qquad \\Delta t \\cdot \\Delta f \\ge \\frac{1}{4\\pi}",
          "texNote": "N = window length, H = hop. Speech typically uses a 25 ms window with a 10 ms hop - short enough that a phoneme is roughly stationary within it, long enough to resolve formants. Music uses longer windows because pitch resolution matters more than onset timing."
        },
        {
          "h": "The mel scale: warping frequency to match perception",
          "paras": [
            "Human frequency discrimination is roughly logarithmic above a few hundred Hz. Mel filterbanks place narrow triangular filters at low frequencies and wide ones at high, so the representation spends resolution where perception does."
          ],
          "tex": "m = 2595 \\log_{10}\\!\\left(1 + \\frac{f}{700}\\right), \\qquad \\text{mel-spec} = \\log\\big(M \\cdot |X|^2 + \\epsilon\\big)",
          "texNote": "M is the filterbank matrix (typically 80 filters for speech). The epsilon inside the log prevents negative infinity on silence - omitting it is a classic source of NaNs. 80 mel bins compress ~200 linear frequency bins with almost no perceptual loss."
        },
        {
          "h": "MFCCs, and why they are mostly legacy",
          "paras": [
            "Applying a discrete cosine transform to the log-mel spectrum decorrelates the coefficients. That was essential when the downstream model was a Gaussian mixture with a DIAGONAL covariance, which cannot represent correlated features. Neural networks have no such constraint."
          ],
          "tex": "c_n = \\sum_{m=1}^{M} \\log(E_m)\\cos\\!\\left[\\frac{\\pi n (m - 0.5)}{M}\\right], \\qquad n = 1,\\ldots,13",
          "texNote": "The DCT discards information (only ~13 of 80 coefficients are kept) to buy decorrelation the model no longer needs. Modern systems use LOG-MEL directly and do better. MFCCs remain worth knowing because you will meet them in legacy pipelines and in the literature."
        }
      ],
      "code": [
        {
          "h": "The pipeline, and what each parameter costs",
          "paras": [
            "Every line here is a decision with an audible consequence, and the defaults encode assumptions about speech that break for other audio."
          ],
          "code": "import torchaudio\n\nmel = torchaudio.transforms.MelSpectrogram(\n    sample_rate=16000,   # SPEECH. Music needs 44.1k - a 16k resample discards\n                         # everything above 8 kHz (Nyquist), which for speech\n                         # is fine and for cymbals is not.\n    n_fft=400,           # 25 ms window @16k. Phonemes are ~roughly stationary\n                         # over this; longer smears onsets, shorter loses\n                         # formant resolution.\n    hop_length=160,      # 10 ms hop -> 100 frames/second. This sets the\n                         # sequence length your model sees.\n    n_mels=80,           # 80 for speech, 128 for music/general audio\n    f_min=0, f_max=8000,\n)\n\nspec = mel(waveform)\nlogspec = torch.log(spec + 1e-6)      # the epsilon is NOT optional - log(0)\n                                      # on a silent frame gives -inf -> NaN\n\n# NORMALIZE per-utterance or with dataset statistics. Log-mel values sit in\n# roughly [-12, 4]; feeding that unnormalized is a common cause of slow\n# convergence that gets misattributed to the architecture.\n\n# SHAPE: (80, T) where T = duration_seconds * 100. A 10-second clip is\n# (80, 1000) - which for a transformer is a 1000-token sequence, so audio\n# length is a sequence-length problem exactly as image resolution is.\n\n# SPECAUGMENT - the standard augmentation, applied ON the spectrogram:\n#   * time masking      - zero out random time bands\n#   * frequency masking - zero out random mel bands\n#   * time warping      - mild temporal distortion\n# It is cheap, it operates on the already-computed features, and it was worth\n# large WER reductions in ASR. Note it teaches robustness to MISSING bands,\n# which is a genuinely useful invariance for speech and a questionable one\n# for tasks where a narrow frequency band carries the label.",
          "caption": "Sample rate, window, hop, and mel count are four decisions that determine what the model can hear and how long its input sequence is. The epsilon inside the log is the single most common source of NaNs in audio pipelines."
        },
        {
          "h": "The phase problem, which is why vocoders exist",
          "paras": [
            "The one asymmetry that shapes the whole field: analysis discards phase harmlessly, synthesis cannot recover it."
          ],
          "code": "# The STFT produces COMPLEX values. A spectrogram keeps only the magnitude.\nX = torch.stft(waveform, n_fft=400, return_complex=True)\nmagnitude = X.abs()      # what the model sees\nphase     = X.angle()    # DISCARDED\n\n# FOR RECOGNITION this is fine - phase carries little that distinguishes\n# phonemes, and discarding it makes the representation shift-invariant in a\n# useful way.\n#\n# FOR GENERATION it is fatal. A model that predicts a mel spectrogram has\n# produced something that CANNOT be inverted to audio, because the phase is\n# missing and magnitude alone does not determine a waveform.\n#\n# THE OPTIONS:\n#  1. GRIFFIN-LIM: iteratively estimate a phase consistent with the given\n#     magnitudes. Fully deterministic, no training, and it sounds metallic\n#     and smeared - characteristic \"robotic TTS\" artifacts.\n#  2. NEURAL VOCODER: train a model to map mel -> waveform directly\n#     (WaveNet, WaveRNN, HiFi-GAN). Learns to produce plausible phase, and\n#     this is what made neural TTS sound natural.\n#  3. Predict the COMPLEX spectrogram or the raw waveform end to end -\n#     harder, and increasingly done.\n#\n# THIS IS WHY TTS IS TWO-STAGE: text -> mel is a comparatively easy\n# sequence problem; mel -> waveform is the hard signal problem, and\n# separating them let each be solved with the right tool. The same\n# factorization as latent diffusion and VQGAN: compress, generate in the\n# compressed space, decode with a specialist.",
          "caption": "Magnitude spectrograms cannot be inverted without inventing phase. Griffin-Lim's characteristic metallic artifact is the sound of that invention going badly, and neural vocoders are the field's answer."
        }
      ],
      "useCases": [
        "Speech recognition and speaker identification, where log-mel spectrograms remain the standard input representation and the window/hop settings are effectively fixed conventions across the field.",
        "Audio classification and event detection - environmental sounds, machine condition monitoring, medical auscultation - where the spectrogram-as-image framing lets you reuse the entire computer-vision toolkit including pretrained backbones.",
        "Music information retrieval: pitch, chord, beat, and genre estimation, where the parameter choices differ sharply from speech (higher sample rate, longer windows, constant-Q rather than mel) because the relevant structure is different.",
        "Self-supervised speech pretraining (wav2vec 2.0, HuBERT, WavLM), which learns representations from unlabelled audio and dramatically reduced the labelled-data requirement for ASR in low-resource languages."
      ],
      "pitfalls": [
        "Omitting the epsilon inside the log. A silent frame gives log(0) = -inf and NaNs propagate through the whole batch. This is the single most common bug in audio pipelines and it is one character.",
        "Resampling music to 16 kHz. Nyquist means you discard everything above 8 kHz, which is correct for speech and destroys cymbals, harmonics, and brightness. Choose the sample rate from the content, not from the tutorial.",
        "Copying speech window settings to other audio. A 25 ms window suits phonemes; music needs longer windows for pitch resolution and often a constant-Q transform instead of mel, because musical intervals are logarithmic in a way mel filters do not match.",
        "Using MFCCs with a neural network. The DCT exists to decorrelate features for diagonal-covariance GMMs, a constraint neural networks do not have, and it discards information. Use log-mel and expect better results.",
        "Feeding unnormalized log-mel values. They sit in roughly [-12, 4], and skipping normalization causes slow convergence that gets misattributed to the architecture. Normalize per-utterance or with dataset statistics.",
        "Expecting to invert a predicted magnitude spectrogram. Phase is gone, and Griffin-Lim's reconstruction sounds metallic. Any generative audio system needs a vocoder or must predict phase or waveform directly.",
        "Applying SpecAugment without thinking about the invariance. Frequency masking teaches robustness to missing bands, which is right for speech and wrong when a narrow band carries the label - a machine-fault frequency, or a specific instrument."
      ],
      "connections": [
        {
          "ref": "multimodal/stt-tts",
          "text": "The phase problem is precisely why TTS is a two-stage pipeline, and the window/hop settings determine the frame rate that ASR alignment operates over."
        },
        {
          "ref": "multimodal/simclr-byol",
          "text": "Self-supervised speech models (wav2vec 2.0, HuBERT) apply the same contrastive and masked-prediction recipes, with the augmentation-design question replaced by a masking-and-quantization one."
        },
        {
          "ref": "foundations/linear-algebra",
          "text": "The STFT is a change of basis and the mel filterbank is a matrix multiplication - the whole front end is linear algebra plus one nonlinearity (the log)."
        },
        {
          "ref": "ml-applications/audio-classification",
          "text": "Treating a spectrogram as an image lets you transfer ImageNet-pretrained CNNs to audio, which works surprisingly well and is the standard baseline."
        },
        {
          "ref": "generative/autoencoders",
          "text": "Neural audio codecs are VQ autoencoders on waveforms, and they play the same compression role for audio language models that VQGAN plays for images."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why convert audio to a spectrogram?",
          "a": "The information humans and models care about is in how frequency content changes over time, which is invisible in the waveform. A spectrogram makes it a 2-D image the vision toolkit can process."
        },
        {
          "q": "What is the STFT?",
          "a": "Chop the signal into overlapping windows, Fourier-transform each, and stack them. Time on one axis, frequency on the other."
        },
        {
          "q": "What is the time-frequency trade-off?",
          "a": "A short window localizes events in time and blurs frequency; a long window resolves frequency and smears time. Uncertainty makes it impossible to have both - a mathematical fact, not an engineering limit."
        },
        {
          "q": "What window and hop are standard for speech?",
          "a": "25 ms window, 10 ms hop, giving 100 frames per second. The window is short enough that a phoneme is roughly stationary and long enough to resolve formants."
        },
        {
          "q": "Why the mel scale?",
          "a": "Human frequency discrimination is roughly logarithmic above a few hundred Hz, so mel filterbanks use narrow filters at low frequencies and wide ones at high - spending resolution where perception has it."
        },
        {
          "q": "Why take the log of the spectrogram?",
          "a": "Loudness perception is roughly logarithmic, and raw spectral energy spans an enormous dynamic range that would otherwise dominate the loss. Add an epsilon or silent frames give -inf."
        },
        {
          "q": "What are MFCCs and are they still used?",
          "a": "A DCT applied to log-mel, which decorrelates the coefficients. That mattered for diagonal-covariance GMMs; neural networks have no such constraint, so log-mel directly is better."
        },
        {
          "q": "What does a spectrogram discard?",
          "a": "PHASE. The Fourier transform is complex; taking the magnitude throws away the angle. Harmless for recognition, fatal for generation."
        },
        {
          "q": "Why does that matter for TTS?",
          "a": "A predicted magnitude spectrogram cannot be inverted to a waveform without inventing phase. Griffin-Lim does it deterministically and sounds metallic; neural vocoders learn it and sound natural."
        },
        {
          "q": "What is SpecAugment?",
          "a": "Masking random time bands and frequency bands (plus mild time warping) directly on the spectrogram. Cheap, applied to already-computed features, and worth large WER reductions in ASR."
        },
        {
          "q": "Why 16 kHz for speech?",
          "a": "Nyquist: 16 kHz captures content up to 8 kHz, which covers speech intelligibility. Music needs 44.1 kHz because harmonics and brightness live above 8 kHz."
        },
        {
          "q": "What is wav2vec 2.0?",
          "a": "Self-supervised speech pretraining: mask spans of the latent audio representation and solve a contrastive task against quantized targets. It sharply reduced the labelled-data requirement for ASR."
        }
      ],
      "standard": [
        {
          "q": "Walk through the audio preprocessing pipeline and justify each step.",
          "a": "STEP 0 - SAMPLE RATE, which is a decision and not a default. Nyquist says you can represent frequencies up to half the sample rate, so 16 kHz captures up to 8 kHz - adequate for speech intelligibility, which is why it is the ASR standard. Music needs 44.1 or 48 kHz because harmonics, cymbals, and brightness live above 8 kHz, and resampling music to 16 kHz destroys them irreversibly. Choose from the content. STEP 1 - FRAMING. Chop the signal into overlapping windows, typically 25 ms with a 10 ms hop for speech. The rationale for 25 ms is that speech is roughly STATIONARY over that duration - a phoneme's spectral character does not change much in 25 ms - so the Fourier transform of the window is meaningful. The 10 ms hop gives 100 frames per second, which sets the sequence length the model sees, and that matters: audio length is a sequence-length problem exactly as image resolution is. A window function (Hann, Hamming) is applied to reduce spectral leakage from the abrupt window edges. STEP 2 - FOURIER TRANSFORM per window, giving complex coefficients. Take the magnitude, and note what just happened: PHASE IS DISCARDED. For recognition that is a good trade - phase carries little phonetic information and discarding it gives a useful shift-invariance - but it is irreversible and it is the reason generation needs a vocoder. STEP 3 - MEL FILTERBANK. Multiply by a matrix of triangular filters spaced on the mel scale, which is roughly logarithmic above a few hundred Hz. This compresses ~200 linear frequency bins into 80 mel bins with almost no perceptual loss, because human frequency discrimination is poor at high frequencies. It is dimensionality reduction chosen by perception rather than by variance, which is a nice contrast with PCA. STEP 4 - LOG. Compresses the dynamic range, matching logarithmic loudness perception and preventing loud frames from dominating the loss. Add an epsilon: log(0) on a silent frame is negative infinity and the NaN propagates through the batch. STEP 5 - NORMALIZE, per utterance or with dataset statistics. Log-mel values sit around [-12, 4], and skipping this causes slow convergence people routinely blame on the architecture. STEP 6 (OPTIONAL, AND USUALLY SKIP) - DCT to get MFCCs. This decorrelates the coefficients, which was essential when the downstream model was a GMM with diagonal covariance that structurally cannot represent correlated features. A neural network has no such constraint, and the DCT discards information by keeping only ~13 of 80 coefficients. Modern systems use log-mel and do better; MFCCs are worth knowing for legacy pipelines and the literature. WHAT I WOULD EMPHASIZE OVERALL: every step is a modelling decision encoding an assumption. The window length asserts what timescale matters. The mel scale asserts that human perception is the right resolution allocation - which is correct for speech and questionable for machine-fault detection, where the diagnostic frequency may be high and narrow. The log asserts that relative energy matters more than absolute. When audio work fails on a non-speech domain, the cause is usually one of these inherited assumptions rather than the model. AND THE ALTERNATIVE worth mentioning: learned front ends and raw-waveform models (SincNet, and wav2vec 2.0's convolutional encoder) skip this pipeline entirely and learn the filterbank. They work, they need more data, and log-mel remains a strong and much cheaper default."
        },
        {
          "q": "Explain the phase problem and how audio generation deals with it.",
          "a": "THE ASYMMETRY. The STFT produces COMPLEX numbers: magnitude and phase. A spectrogram keeps the magnitude and discards the phase. For ANALYSIS this is nearly free - phase carries little that distinguishes phonemes or instruments, and discarding it makes the representation robust to time shifts. For SYNTHESIS it is fatal, because a magnitude spectrogram does not determine a waveform. Many different signals share the same magnitude spectrogram, and picking a bad one sounds wrong. WHY IT SOUNDS WRONG. Phase encodes the alignment of frequency components across overlapping windows. Get it inconsistent and adjacent windows disagree about where the waveform is in its cycle, producing the characteristic METALLIC, smeared, 'robotic' quality that anyone who has heard early TTS will recognize. It is not noise; it is a specific perceptual artifact of phase inconsistency. THE SOLUTIONS, historically and now. (1) GRIFFIN-LIM. Iteratively alternate: convert the current estimate to the time domain, take its STFT, replace the magnitudes with the target magnitudes, keep the estimated phase, and repeat. It converges to a signal whose magnitude spectrogram approximately matches the target and whose phase is at least self-consistent. Fully deterministic, needs no training, and it is what makes early neural TTS sound robotic. Still useful as a baseline and for quick prototyping. (2) NEURAL VOCODERS - the change that made neural TTS sound human. Train a model to map mel spectrogram to waveform directly, learning to produce plausible phase. WaveNet was first and was extremely slow (autoregressive at the sample rate - 24,000 sequential steps per second of audio). WaveRNN and parallel variants sped it up. HiFi-GAN is the current standard: a GAN-based vocoder that is fast, high quality, and small enough to run in real time on modest hardware. Note the irony that a GAN is doing the essential work inside a system whose headline model is not adversarial - the same role a patch discriminator plays inside Stable Diffusion's VAE. (3) PREDICT THE COMPLEX SPECTROGRAM, or predict phase alongside magnitude. Harder, because phase is a wrapped quantity with awkward geometry, and increasingly viable. (4) END-TO-END WAVEFORM MODELS that skip the spectrogram entirely - VITS and similar - which avoid the problem by never discarding phase in the first place. (5) NEURAL CODECS (SoundStream, EnCodec): VQ autoencoders on the waveform that produce discrete tokens and decode back to audio. These preserve everything needed for reconstruction and enable audio LANGUAGE models, since audio becomes a token sequence. WHY THE TWO-STAGE SPLIT PERSISTED SO LONG. Text-to-mel is a sequence-to-sequence problem with a modest output rate (100 frames/second) that transformers handle well. Mel-to-waveform is a signal problem at 24,000 samples/second requiring a completely different kind of model. Separating them let each be solved with the right tool and let the vocoder be trained once and reused across voices and languages. That is exactly the same factorization argument as latent diffusion and VQGAN - compress, generate in the compressed space, decode with a specialist - and recognizing it as the same pattern is worth more than the specific audio details. THE PRACTICAL CONSEQUENCE for anyone building audio generation: your output quality is capped by your vocoder, exactly as latent diffusion's is capped by its autoencoder. If synthesized speech sounds wrong, check whether the mel spectrogram itself is good by vocoding a GROUND-TRUTH mel - if that already sounds bad, the vocoder is the problem, and no amount of work on the text-to-mel model will help. That round-trip test is the audio analogue of the encode-decode check in latent diffusion and it partitions the failure space the same way."
        },
        {
          "q": "How would you approach audio classification for machine fault detection?",
          "a": "THE FIRST THING I WOULD CHECK is whether the speech-derived defaults apply, because they mostly do not, and inheriting them uncritically is how these projects underperform. (1) SAMPLE RATE AND FREQUENCY RANGE. Machine faults - bearing defects, gear mesh, cavitation - often manifest at HIGH frequencies, sometimes ultrasonic. Resampling to 16 kHz to reuse a speech pipeline discards everything above 8 kHz and may discard the signal entirely. Determine the diagnostic frequency range from the physics or from the domain expert first. (2) THE MEL SCALE IS PROBABLY WRONG. Mel spacing allocates fine resolution to low frequencies because that is where human hearing is sharp. A bearing fault frequency is narrow, possibly high, and mel bins there are wide - so the very feature you need is smeared across a bin. Use a LINEAR spectrogram, or a filterbank designed around the expected fault frequencies, or a constant-Q transform if the harmonic structure matters. This single change is often the difference between a working and a non-working system, and it is invisible if you only ever copy audio-classification tutorials. (3) WINDOW LENGTH from the phenomenon: impulsive faults need short windows to localize the impulse; tonal faults need long windows to resolve the frequency. (4) SPECAUGMENT'S FREQUENCY MASKING IS ACTIVELY HARMFUL here. It teaches invariance to missing frequency bands, and a narrow band IS the label. Augmentations must be chosen from real acquisition variation - microphone position, background machinery, load conditions, speed variation - not from the speech recipe. THE PHYSICS AS A FEATURE ENGINE, which is where the real wins are. Rotating machinery has known characteristic frequencies computable from the geometry and shaft speed - ball pass frequencies, gear mesh frequencies and their harmonics and sidebands. If shaft speed is measurable, ORDER TRACKING (resampling by shaft angle rather than time) turns a speed-varying signal into a stationary one, which is transformative for varying-load equipment. Envelope analysis (demodulating a high-frequency band) is the classical technique for bearing faults and it works extremely well. A model given these features, or applied to an order-tracked signal, will beat a generic spectrogram CNN and will be far more interpretable to the maintenance engineers who have to act on it. THE DATA REALITY. Faults are rare, so this is usually an ANOMALY DETECTION problem rather than a classification one - you have abundant healthy audio and few or no examples of each fault type. Train on healthy data and score deviation; and evaluate with the complexity confound in mind, since a quiet machine reconstructs well regardless of familiarity. Compare against a memory-bank or density-estimation baseline on pretrained features, which are strong and need no training. Also expect severe DOMAIN SHIFT between machines, installations, and operating conditions - a model trained on one pump will not transfer to another without adaptation, and the evaluation must be split by MACHINE, not randomly, or you will measure memorization. WHAT I WOULD DELIVER: a per-machine model or a model with machine identity as a conditioning input; a scoring pipeline with a threshold chosen from the cost of a missed fault versus a false alarm (a missed bearing failure is expensive, a false alarm is an inspection); the spectrogram and the top contributing frequency bands surfaced alongside every alert, because a maintenance engineer will not act on a score without a reason; and a drift monitor, because machines change as they wear and the healthy baseline moves."
        },
        {
          "q": "What is wav2vec 2.0, and how does self-supervised learning work for speech?",
          "a": "THE MOTIVATION. Transcribed speech is expensive - it requires a human listening and typing - so labelled ASR data is scarce, especially outside a handful of languages. Untranscribed speech is abundant. Self-supervised pretraining converts that abundance into a representation, and the effect was dramatic: wav2vec 2.0 reached usable word error rates with TEN MINUTES of labelled data, and competitive rates with an hour, where previously hundreds of hours were needed. For low-resource languages that is a categorical change rather than an incremental one. THE ARCHITECTURE. (1) A convolutional FEATURE ENCODER maps the raw waveform to latent representations at about 50 per second - note it operates on the waveform, not on a spectrogram, so the front end is learned. (2) A TRANSFORMER contextualizes those latents. (3) A QUANTIZATION module maps each latent to an entry in a learned codebook (actually two codebooks combined, for a larger effective vocabulary), producing DISCRETE targets. THE OBJECTIVE. Mask spans of the latent sequence - BERT-style, but on continuous audio - and require the transformer's output at masked positions to identify the correct QUANTIZED latent for that position among distractors sampled from other masked positions in the utterance. So it is a contrastive task with quantized targets. Two design points are worth explaining. First, WHY QUANTIZE: predicting a continuous latent invites the trivial solution of predicting something close to everything, and quantization creates a well-defined discrete target that makes the contrastive task meaningful. Second, WHERE THE MASKING HAPPENS: masking the LATENTS rather than the waveform means the model cannot exploit low-level continuity to fill the gap. A DIVERSITY LOSS encourages the codebook to be used evenly, preventing the collapse where a few codes absorb everything. THE ALTERNATIVES, which are instructive. HuBERT replaces the contrastive objective with masked prediction of CLUSTER assignments obtained by k-means on features - first on MFCCs, then iteratively on the model's own representations. Simpler than wav2vec 2.0's quantization-plus-contrast, and it works at least as well, which is a nice illustration that the specific pretext machinery matters less than getting a well-posed masked-prediction task. WavLM adds denoising and speaker-mixing to the pretext task, which improves speaker-related downstream tasks. Whisper takes an entirely different route - weak supervision at scale (680,000 hours of noisy web transcripts) rather than self-supervision - and gets robustness from data diversity rather than from a pretext objective. That contrast is worth stating: two routes to the same goal, one spending on unlabelled data and one on noisy labelled data, and both work. WHAT IT IS USED FOR BEYOND ASR: speaker verification, emotion recognition, keyword spotting, and audio classification all benefit from the pretrained representation, typically with a small head on frozen features. The pattern is exactly BERT's. THE PRACTICAL CAVEATS. Pretraining is expensive and you should almost always start from a released checkpoint and continue pretraining on in-domain audio rather than training from scratch. The models are sensitive to domain shift - a model pretrained on read audiobook speech degrades on telephone audio or noisy field recordings - so in-domain continued pretraining is the highest-return step. And fine-tuning with CTC on a small labelled set is the standard recipe, with the usual small-data instability, so multiple seeds and careful early stopping apply exactly as they do in NLP."
        },
        {
          "q": "How do the requirements differ between speech, music, and general audio?",
          "a": "THEY DIFFER IN ALMOST EVERY PARAMETER, and treating audio as one domain is the most common source of avoidable failure. SPEECH. Sample rate 16 kHz suffices because intelligibility lives below 8 kHz. Windows are short (25 ms) because phonemes are short and onsets matter. Mel scale is appropriate because the task is defined by human perception - speech evolved to be heard. 80 mel bins is standard. The relevant structure is FORMANTS (resonances of the vocal tract) and their transitions, on a timescale of tens of milliseconds. Pitch matters for prosody and speaker identity but not usually for the words. MUSIC. Sample rate 44.1 or 48 kHz, because harmonics, cymbals, and perceived brightness extend well above 8 kHz and downsampling audibly destroys them. Windows are LONGER, because pitch resolution matters more than onset localization - distinguishing adjacent semitones requires resolving frequencies a few percent apart, which needs a long window. The mel scale is often the WRONG warping: musical pitch is logarithmic in a specific way (an octave is a doubling, a semitone is a factor of 2^(1/12)), so a CONSTANT-Q TRANSFORM, with bins spaced by musical intervals, aligns the representation with the structure. That means a chord has the same shape regardless of key, which is exactly the invariance you want. Harmonic structure matters enormously - timbre is the relative strength of harmonics - and timescales span milliseconds (onsets) to minutes (form). GENERAL AUDIO AND ENVIRONMENTAL SOUND. Extremely wide-band and varied; often needs the full spectrum and more mel bins (128+). Events are of wildly varying duration - a glass break is milliseconds, rain is continuous - so a single window length is a compromise and multi-resolution approaches help. Weak labelling is the norm (a clip contains a dog bark somewhere) which makes it a multiple-instance learning problem rather than plain classification. INDUSTRIAL AND BIOACOUSTIC. Frequently the mel scale is simply wrong, because the diagnostic content is at frequencies where human hearing is insensitive and mel bins are wide. Bat and whale vocalizations, machine faults, and ultrasound all need a representation designed around the phenomenon. Linear spectrograms, custom filterbanks, or physics-derived features beat inherited defaults. WHAT TRANSFERS AND WHAT DOES NOT. The SPECTROGRAM-AS-IMAGE framing transfers everywhere and is a good default first move, including reusing ImageNet-pretrained CNNs, which works surprisingly well. The specific PARAMETERS transfer badly. Pretrained SPEECH models transfer poorly to music and environmental sound because their front ends and objectives are speech-shaped; general audio models (PANNs, AST, CLAP) are the right starting point for non-speech. AUGMENTATION policies transfer worst of all - SpecAugment's frequency masking suits speech and is destructive when a narrow band carries the label. THE DIAGNOSTIC I would run entering a new audio domain: plot the spectrogram of positive and negative examples side by side and LOOK at them. Where is the difference? What frequency range, what timescale, what structure? That five-minute exercise determines the sample rate, window length, and frequency warping, and it is far more reliable than any default. If you cannot see the difference in a well-chosen representation, the model will struggle too - and if you can, you have just specified the front end."
        },
        {
          "q": "Why can you treat a spectrogram as an image, and where does that analogy break?",
          "a": "WHY IT WORKS, and it works better than it has any right to. A spectrogram is a 2-D array of non-negative values, which is structurally an image. Convolutions detect local patterns - a formant transition, a harmonic stack, an onset - exactly as they detect edges and textures. Pooling gives tolerance to small shifts in time and frequency, which is genuinely desirable (the same word spoken slightly faster or by a slightly higher voice should still be recognized). And empirically, ImageNet-pretrained CNNs fine-tuned on spectrograms are a strong baseline for audio classification, which is surprising given that the pretraining data was photographs - the low-level filters (edges, blobs, oriented gratings) are apparently generic enough to be useful on a completely different signal. WHERE THE ANALOGY BREAKS, and these are the things that matter in practice. (1) THE AXES ARE NOT INTERCHANGEABLE. In an image, x and y are the same kind of thing and a square filter is natural. In a spectrogram, one axis is TIME and the other is FREQUENCY, with completely different semantics. A vertical structure is a transient; a horizontal one is a sustained tone. Square kernels are a compromise, and asymmetric or separable time-frequency kernels often work better. (2) TRANSLATION INVARIANCE IS ASYMMETRIC. Shifting an image right does not change what it depicts. Shifting a spectrogram in TIME is harmless (the same sound later), but shifting in FREQUENCY changes the pitch, which for speech changes the speaker and for music changes the note. So frequency-axis translation invariance - which pooling provides - is sometimes wrong, and this is a real design consideration. (Note the exception: on a LOG-frequency axis, a pitch shift IS a translation, which is one reason constant-Q transforms are attractive for music.) (3) VALUE SEMANTICS DIFFER. Pixel intensities are bounded and roughly uniform in meaning; log-mel values are unbounded below and represent energy on a log scale. Normalization strategies from vision do not transfer directly. (4) SPECTROGRAMS ARE NOT LOCAL IN THE SAME WAY. A harmonic stack spans the whole frequency axis - the fundamental at 200 Hz and its harmonics at 400, 600, 800 are one perceptual object, and a small convolution kernel cannot see them together. This is a genuine limitation and it argues for large receptive fields, dilated convolutions along frequency, or attention. (5) THE INPUT IS VARIABLE-LENGTH along time in a way images usually are not, so cropping and padding strategies differ and the model must handle arbitrary duration. (6) AUGMENTATIONS DO NOT TRANSFER. Horizontal flip reverses time and produces something acoustically nonsensical. Colour jitter has no meaning. Random crop in frequency deletes content rather than reframing it. SpecAugment exists precisely because vision augmentations are wrong here. WHAT I WOULD DO WITH THIS. Use the image framing as a strong, fast baseline - it is genuinely good and pretrained backbones are free. Then look at the specific failures and ask which broken assumption caused them: if the model confuses pitch-shifted versions of a sound, the frequency-invariance issue is biting; if it misses harmonically-defined categories, the locality issue is. And prefer audio-native architectures (AST, PANNs, or a transformer over patches with axis-aware position encoding) when the baseline plateaus - they encode the right asymmetries rather than inheriting the wrong ones."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The audio front end",
        "back": "waveform -> STFT (25 ms window, 10 ms hop for speech) -> magnitude (PHASE DISCARDED) -> mel filterbank (80 bins) -> log(+eps) -> normalize. Every step encodes an assumption about what matters."
      },
      {
        "type": "intuition",
        "front": "Time-frequency uncertainty",
        "back": "Short window = sharp in time, blurred in frequency; long window = the reverse. Mathematically impossible to have both. Speech uses 25 ms (phonemes ~stationary); music uses longer (pitch resolution beats onset timing)."
      },
      {
        "type": "definition",
        "front": "Why the mel scale and the log",
        "back": "Mel: human frequency discrimination is ~logarithmic above a few hundred Hz, so spend resolution where perception has it. Log: loudness perception is ~logarithmic and raw energy spans a huge dynamic range that would dominate the loss."
      },
      {
        "type": "pitfall",
        "front": "log(0) = -inf",
        "back": "A silent frame gives negative infinity and NaNs propagate through the batch. `torch.log(spec + 1e-6)`. The single most common bug in audio pipelines and it is one character."
      },
      {
        "type": "pitfall",
        "front": "MFCCs are legacy for neural nets",
        "back": "The DCT decorrelates features - which mattered for DIAGONAL-covariance GMMs and does not for neural networks - while discarding information (keeping ~13 of 80 coefficients). Use log-mel directly."
      },
      {
        "type": "intuition",
        "front": "The phase problem",
        "back": "A spectrogram keeps magnitude and discards PHASE. Harmless for recognition (and gives shift-invariance); FATAL for generation, because magnitude alone does not determine a waveform. This is why vocoders exist."
      },
      {
        "type": "definition",
        "front": "Griffin-Lim vs neural vocoder",
        "back": "Griffin-Lim iteratively estimates a self-consistent phase - deterministic, untrained, and it sounds METALLIC (the classic 'robotic TTS' artifact). Neural vocoders (HiFi-GAN) learn plausible phase and made neural TTS sound human."
      },
      {
        "type": "intuition",
        "front": "The vocoder round-trip test",
        "back": "If synthesized speech sounds wrong, vocode a GROUND-TRUTH mel first. If that already sounds bad, the vocoder is the ceiling and no work on text-to-mel helps. Same diagnostic as latent diffusion's encode-decode check."
      },
      {
        "type": "pitfall",
        "front": "Speech defaults do not transfer",
        "back": "16 kHz discards everything above 8 kHz (Nyquist) - fine for speech, destroys music. Mel spacing is wrong when the diagnostic frequency is high and narrow (machine faults). Music often wants constant-Q, where a pitch shift is a TRANSLATION."
      },
      {
        "type": "pitfall",
        "front": "SpecAugment's frequency masking",
        "back": "It teaches invariance to MISSING frequency bands - right for speech, actively harmful when a narrow band IS the label (a bearing fault frequency, a specific instrument). Choose augmentations from real acquisition variation."
      },
      {
        "type": "definition",
        "front": "wav2vec 2.0",
        "back": "Conv encoder on the raw WAVEFORM -> transformer -> mask latent spans -> contrastive task against QUANTIZED targets, plus a codebook diversity loss. Reached usable WER with ten minutes of labels. HuBERT does the same with k-means cluster targets."
      },
      {
        "type": "pitfall",
        "front": "Where spectrogram-as-image breaks",
        "back": "The axes are not interchangeable (time vs frequency); frequency translation changes PITCH so pooling there can be wrong; harmonic stacks span the whole frequency axis so small kernels cannot see them; and vision augmentations (h-flip = time reversal) are nonsense."
      }
    ],
    "refs": [
      {
        "title": "Baevski et al. (2020), wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations",
        "url": "https://arxiv.org/abs/2006.11477"
      },
      {
        "title": "Park et al. (2019), SpecAugment: A Simple Data Augmentation Method for ASR",
        "url": "https://arxiv.org/abs/1904.08779"
      },
      {
        "title": "Hsu et al. (2021), HuBERT: Self-Supervised Speech Representation Learning by Masked Prediction",
        "url": "https://arxiv.org/abs/2106.07447"
      },
      {
        "title": "Kong et al. (2020), HiFi-GAN: Generative Adversarial Networks for Efficient and High Fidelity Speech Synthesis",
        "url": "https://arxiv.org/abs/2010.05646"
      },
      {
        "title": "Gong et al. (2021), AST: Audio Spectrogram Transformer",
        "url": "https://arxiv.org/abs/2104.01778"
      }
    ],
    "demos": [
      "spectrogram",
      "mfcc",
      "fourier",
      "pitch-detection"
    ]
  },
  "stt-tts": {
    "level": "core",
    "body": {
      "intuition": [
        "Speech recognition and speech synthesis look like inverses and are engineered very differently. Both face the same structural problem - audio and text run at completely different rates, with 100 audio frames per second against maybe 3 words - so both need an ALIGNMENT mechanism. Where they differ is that recognition must be robust to enormous input variation and can afford to be approximately right, while synthesis must produce a signal at 24,000 samples per second that sounds human, where 'approximately right' is immediately audible.",
        "For recognition, three architectures dominate and the choice is essentially about STREAMING. CTC introduces a blank symbol and marginalizes over all alignments, which is simple and assumes each output is conditionally independent given the audio - so it needs an external language model to be competitive. Attention-based encoder-decoder models learn alignment implicitly and are strong, but must see the whole utterance before decoding, so they cannot stream. RNN-Transducer combines an audio encoder with a text predictor and is naturally streaming with bounded latency, which is why it is what runs on your phone. That is the decision: if the product needs partial results as the user speaks, RNN-T; if it can wait for the utterance to end, attention models are simpler and often better.",
        "The metric deserves scepticism. WORD ERROR RATE counts substitutions, insertions, and deletions as equal, which is a strange thing to do: dropping 'not' from 'do not administer' and mis-transcribing 'the' as 'a' both count as one error. A system at 5% WER may be fine for dictation and dangerous for medical transcription, depending entirely on WHICH 5%. And Whisper illustrates the other side of this - trained on 680,000 hours of noisy web transcripts rather than clean labelled data, it is dramatically more robust across accents, noise, and domains than models with better benchmark WER, while having its own characteristic failure of HALLUCINATING fluent text during silence. Robustness and benchmark score came apart, which is the module's recurring theme in yet another form."
      ],
      "math": [
        {
          "h": "CTC: marginalizing over alignments",
          "paras": [
            "The audio has T frames and the transcript has U characters, with T much larger than U and no given correspondence. CTC introduces a BLANK symbol, defines a collapsing function (remove repeats, then remove blanks), and sums the probability of every frame-level path that collapses to the target."
          ],
          "tex": "p(y \\mid x) = \\sum_{\\pi \\in \\mathcal{B}^{-1}(y)} \\prod_{t=1}^{T} p(\\pi_t \\mid x), \\qquad \\mathcal{B}(\\texttt{--h-e-ll--o}) = \\texttt{hello}",
          "texNote": "The sum is over exponentially many paths and is computed in O(TU) by a forward-backward dynamic program - the same algorithm as HMM training. The blank is what allows repeated characters ('ll') to survive collapsing, by separating them."
        },
        {
          "h": "CTC's conditional independence assumption",
          "paras": [
            "Given the audio, each frame's output is independent of the others. This is what makes the dynamic program tractable and it is also CTC's central weakness - the model has no way to express that 'q' is almost always followed by 'u'."
          ],
          "tex": "p(\\pi \\mid x) = \\prod_{t} p(\\pi_t \\mid x) \\quad\\Longrightarrow\\quad \\text{no } p(\\pi_t \\mid \\pi_{<t})",
          "texNote": "Consequence: CTC models produce phonetically plausible nonsense and need an external language model at decode time to be competitive. RNN-T fixes exactly this by adding a text predictor conditioned on previous outputs."
        },
        {
          "h": "Word error rate, and what it hides",
          "paras": [
            "Edit distance between reference and hypothesis at the word level, normalized by reference length. Every error type counts the same, which is the assumption worth questioning."
          ],
          "tex": "\\mathrm{WER} = \\frac{S + I + D}{N}, \\qquad \\mathrm{WER} > 1 \\text{ is possible (insertions are unbounded)}",
          "texNote": "S/I/D = substitutions, insertions, deletions; N = reference words. Note WER can exceed 100% when the system hallucinates - which is exactly how Whisper's silence hallucinations show up, and why a WER cap is a useful sanity filter."
        }
      ],
      "code": [
        {
          "h": "The three ASR architectures and the streaming decision",
          "paras": [
            "The comparison that determines the architecture, laid out by the property that actually differs."
          ],
          "code": "# CTC                                encoder only + blank symbol\n#   p(y|x) = sum over alignments, forward-backward in O(TU)\n#   + simple, fast, non-autoregressive decoding\n#   + STREAMS naturally (each frame is independent)\n#   - conditional independence -> needs an external LM to compete\n#   - cannot model output dependencies at all\n#\n# ATTENTION ENCODER-DECODER (LAS, Whisper)\n#   decoder cross-attends over the full encoded utterance\n#   + implicit alignment, strong accuracy, internal LM for free\n#   - must see the WHOLE utterance -> cannot stream\n#   - attention can fail catastrophically: looping, early stopping,\n#     or skipping large spans, with no alignment constraint to prevent it\n#\n# RNN-TRANSDUCER (RNN-T)  <- what runs on your phone\n#   audio encoder + TEXT PREDICTOR (conditioned on previous outputs)\n#   + joint network combines both -> models output dependencies\n#   + STREAMS with bounded latency\n#   - more complex training, larger memory (the T x U joint lattice)\n#\n# THE DECISION RULE: does the product need partial results while the user\n# is still speaking? Voice assistants, live captions, dictation -> RNN-T.\n# Batch transcription of recorded audio -> attention encoder-decoder,\n# which is simpler and usually more accurate.\n\nctc_loss = F.ctc_loss(log_probs, targets, input_lengths, target_lengths,\n                      blank=0, zero_infinity=True)\n# zero_infinity=True matters: if the target is LONGER than the input frames\n# the loss is infinite, and one such example NaNs the whole batch. This is\n# the standard CTC bug and it usually means a data-prep error (wrong\n# sample rate, over-aggressive trimming, or a mislabelled clip).",
          "caption": "The architecture choice is really a streaming choice. CTC's conditional independence is why it needs an external LM; RNN-T's text predictor is the fix, and it is what makes bounded-latency on-device recognition possible."
        },
        {
          "h": "Why WER is a poor primary metric, made concrete",
          "paras": [
            "Two transcriptions with identical WER and completely different consequences. This is the argument for task-weighted evaluation."
          ],
          "code": "reference = \"do not administer more than two tablets daily\"\n\nhyp_a     = \"do not administer more than to tablets daily\"   # to/two\nhyp_b     = \"do administer more than two tablets daily\"      # dropped NOT\n\n#   both: 1 error / 8 words = 12.5% WER\n#   hyp_a: a homophone typo a human corrects instantly\n#   hyp_b: INVERTS THE INSTRUCTION\n#\n# WER weights every word equally, which is defensible for dictation and\n# indefensible for anything where specific tokens carry the decision.\n\n# WHAT TO REPORT INSTEAD, depending on the task:\n#   * ENTITY error rate - accuracy on names, numbers, dosages, dates,\n#     which is what downstream systems actually consume\n#   * KEYWORD recall for command-and-control\n#   * DOWNSTREAM task accuracy - did the intent classifier get it right,\n#     did the extracted field match - which is the only metric that\n#     measures what you care about\n#   * WER by SLICE: accent, noise level, speaker gender, domain. Aggregate\n#     WER hides that one demographic is twice as bad, and published ASR\n#     systems have shown exactly that pattern.\n#\n# AND: normalize before scoring. Punctuation, casing, numbers (\"two\" vs\n# \"2\"), and contractions can swing WER by several points and are usually\n# not what you meant to measure. State the normalization or the number is\n# not comparable to anyone else's.",
          "caption": "Identical WER, opposite consequences. Report entity error rate, downstream task accuracy, and a per-slice breakdown - and always state the text normalization, which alone moves WER by points."
        }
      ],
      "useCases": [
        "Voice assistants and on-device dictation, where streaming with bounded latency is a hard requirement and RNN-T is the standard answer, usually with a small on-device model and a larger server fallback.",
        "Meeting and media transcription with diarization, where batch processing allows attention-based models and the real difficulty is speaker attribution, overlapping speech, and domain vocabulary rather than raw acoustic modelling.",
        "Accessibility - live captioning and screen readers - where latency, robustness to noisy real-world audio, and graceful failure matter far more than benchmark WER.",
        "Voice interfaces in cars, clinics, and warehouses, where the acoustic conditions are hostile and domain vocabulary is specialized, so in-domain fine-tuning and a constrained decoding vocabulary beat a stronger general model."
      ],
      "pitfalls": [
        "Reporting WER as the primary metric without a normalization statement. Punctuation, casing, and number formatting swing it by several points, so an unqualified WER is not comparable across systems or papers.",
        "Treating all errors as equal. Dropping 'not' and mis-transcribing 'the' both count as one substitution. Report entity error rate, keyword recall, or downstream task accuracy - whichever matches what consumes the transcript.",
        "Skipping the per-slice breakdown. Aggregate WER hides large disparities across accents, dialects, ages, and noise conditions, and published systems have demonstrated exactly those gaps. This is the main fairness channel in ASR.",
        "Using an attention encoder-decoder for a streaming product. It must see the whole utterance before decoding. RNN-T exists for this and the choice should be made from the latency requirement, not from benchmark accuracy.",
        "Forgetting `zero_infinity` in CTC. If a target is longer than the input frames the loss is infinite and one example NaNs the batch - and it usually signals a data-prep error rather than a model problem.",
        "Deploying Whisper on audio with long silences without guarding against hallucination. It generates fluent, confident, entirely invented text during non-speech, which is a qualitatively different failure from a high WER. Use voice activity detection and check for repeated or implausible segments.",
        "Evaluating TTS with MOS alone. Mean opinion score is not comparable across studies - it depends on the rater pool, the instructions, and which systems appeared together - so absolute MOS values from different papers mean little. Use preference tests against a stated baseline."
      ],
      "connections": [
        {
          "ref": "multimodal/audio-representations",
          "text": "The phase problem is why TTS is two-stage, and the window/hop settings define the frame rate that CTC and RNN-T align against."
        },
        {
          "ref": "advanced-nlp/architectures",
          "text": "The streaming constraint is the same encoder-decoder-versus-decoder-only question, decided by whether output must begin before the input ends."
        },
        {
          "ref": "rnn-nlp/sequence-labeling",
          "text": "CTC's forward-backward is the same dynamic program as HMM training, and constrained decoding over an output lattice is the same machinery as Viterbi over tag sequences."
        },
        {
          "ref": "advanced-cv/ocr",
          "text": "OCR faces the identical alignment problem with the identical CTC solution, and its CER-versus-field-accuracy gap is exactly the WER-versus-entity-accuracy gap here."
        },
        {
          "ref": "multimodal/multimodal-eval",
          "text": "WER's blindness to which errors matter is a special case of the general point that a metric encodes a cost model, usually an implicit and wrong one."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What problem does CTC solve?",
          "a": "Alignment. The audio has ~100 frames per second and the transcript has a few words, with no given correspondence. CTC adds a blank symbol and sums over all frame-level paths that collapse to the target."
        },
        {
          "q": "What is the blank symbol for?",
          "a": "Two jobs: it lets frames emit nothing, and it SEPARATES repeated characters so 'hello' survives the collapse of repeats ('h-e-l-blank-l-o')."
        },
        {
          "q": "What is CTC's central weakness?",
          "a": "Conditional independence: given the audio, each frame's output is independent, so the model cannot express that 'q' is followed by 'u'. It needs an external language model to compete."
        },
        {
          "q": "Why can't attention encoder-decoder models stream?",
          "a": "The decoder cross-attends over the ENTIRE encoded utterance, so decoding cannot start until the input has ended."
        },
        {
          "q": "What is RNN-T?",
          "a": "An audio encoder plus a TEXT PREDICTOR conditioned on previous outputs, combined by a joint network. It models output dependencies AND streams with bounded latency - which is why it runs on phones."
        },
        {
          "q": "How do you choose among the three?",
          "a": "By streaming. Partial results while the user speaks (assistants, live captions) -> RNN-T. Batch transcription of recorded audio -> attention encoder-decoder, simpler and usually more accurate."
        },
        {
          "q": "What is WER?",
          "a": "(substitutions + insertions + deletions) / reference words. It can exceed 100%, because insertions are unbounded - which is how hallucinated text shows up."
        },
        {
          "q": "What is WER's main flaw?",
          "a": "It weights every word equally. Dropping 'not' and mis-transcribing 'the' are both one error, with completely different consequences."
        },
        {
          "q": "What should you report alongside it?",
          "a": "Entity error rate (names, numbers, dosages), downstream task accuracy, and a per-SLICE breakdown by accent, noise, and demographic - plus the text normalization used."
        },
        {
          "q": "What is distinctive about Whisper?",
          "a": "Weak supervision at scale - 680,000 hours of noisy web transcripts rather than clean labelled data - giving robustness across accents, noise, and domains that models with better benchmark WER lack."
        },
        {
          "q": "What is Whisper's characteristic failure?",
          "a": "Hallucinating fluent, confident text during SILENCE or non-speech. A qualitatively different failure from high WER, and it needs voice activity detection plus repetition checks to guard against."
        },
        {
          "q": "Why is TTS two-stage?",
          "a": "Text-to-mel is a modest-rate sequence problem; mel-to-waveform is a 24 kHz signal problem needing a different kind of model. Splitting them lets each use the right tool and lets the vocoder be reused across voices."
        }
      ],
      "standard": [
        {
          "q": "Compare CTC, attention encoder-decoder, and RNN-T for speech recognition.",
          "a": "THE SHARED PROBLEM is alignment: roughly 100 audio frames per second against a handful of words, with no given correspondence between them. Each architecture solves it differently and the differences determine what you can build. CTC. Add a BLANK symbol to the output alphabet, let the encoder emit a distribution per frame, and define the probability of a transcript as the sum over all frame-level paths that collapse to it (remove repeats, then remove blanks). The sum is over exponentially many paths and is computed in O(TU) by forward-backward - the same dynamic program as HMM training. STRENGTHS: simple, fast, non-autoregressive decoding, and it streams naturally because each frame is independent. WEAKNESS, and it is the defining one: CONDITIONAL INDEPENDENCE. Given the audio, outputs at different frames are independent, so the model cannot represent that 'q' is followed by 'u' or that a word is likely to follow another. It produces phonetically plausible nonsense and needs an external language model at decode time (typically shallow fusion with a beam search) to be competitive. ATTENTION ENCODER-DECODER (Listen-Attend-Spell, and Whisper). Encode the utterance, then decode autoregressively with cross-attention over the encoding. STRENGTHS: alignment is learned implicitly, the decoder is an internal language model so output dependencies are free, and accuracy is strong. WEAKNESSES: it must see the WHOLE utterance before decoding, so it cannot stream - a hard blocker for interactive products. And the attention is unconstrained, so it can fail catastrophically in ways CTC cannot: looping on a phrase, stopping early, or skipping a large span, because nothing enforces monotonic coverage of the audio. Those failures produce fluent wrong output rather than degraded output. RNN-TRANSDUCER. An audio encoder plus a separate TEXT PREDICTOR conditioned on previously emitted tokens, combined by a small joint network that produces a distribution over the alphabet plus blank for each (audio frame, output position) pair. Training marginalizes over the T x U lattice. STRENGTHS: it models output dependencies (fixing CTC's weakness) AND streams with bounded latency (fixing attention's), which is why it is the standard for on-device and real-time recognition. WEAKNESSES: more complex to train, and the T x U joint lattice is memory-hungry enough that efficient implementations are a real engineering concern. HOW I WOULD CHOOSE. The question is STREAMING. If the product must show partial results while the user is still speaking - voice assistants, live captions, interactive dictation - RNN-T, and the decision is essentially made. If the audio is recorded and can be processed in full - meeting transcription, media captioning, batch pipelines - an attention encoder-decoder is simpler and usually more accurate, and Whisper is a strong off-the-shelf option. CTC alone is rarely the best choice today, though it remains useful as an auxiliary loss: hybrid CTC-attention training, where a CTC head on the encoder is trained jointly with the attention decoder, is a common and effective recipe because the CTC loss enforces monotonic alignment and stabilizes the attention. That hybrid is worth knowing as the practical answer that takes something from each. AND A NOTE ON WHERE THIS IS GOING: large audio-language models that consume audio tokens and generate text with a general LLM are increasingly competitive, which collapses the architecture question into the same decoder-only framing as everything else - with streaming still the open problem."
        },
        {
          "q": "Why is word error rate a problematic metric, and what would you use instead?",
          "a": "WHAT WER IS: edit distance at the word level between reference and hypothesis, normalized by reference length - substitutions plus insertions plus deletions over reference words. It is standard, comparable across the literature, and easy to compute, which is why it persists. THE PROBLEMS, in order of practical importance. (1) ALL ERRORS COUNT EQUALLY. 'Do not administer' transcribed as 'do administer' is one deletion, 12.5% WER on that sentence, and it inverts the instruction. 'Two' transcribed as 'to' is also one error and a human corrects it instantly. Any application where specific tokens carry the decision - numbers, negations, names, dosages, commands - is badly served by a metric that averages over them. (2) IT IS NOT NORMALIZATION-INVARIANT. Punctuation, casing, contractions, and number formatting ('two' versus '2') can move WER by several points, and different papers normalize differently. An unqualified WER is not comparable to anyone else's, and this is a routine source of misleading comparisons. (3) THE AGGREGATE HIDES DISPARITY. Published ASR systems have shown substantially higher error rates for some dialects and demographic groups than others. A single WER conceals that entirely, and it is the primary fairness channel in speech systems - so a per-slice breakdown is not an extra, it is a requirement. (4) IT CAN EXCEED 100%, because insertions are unbounded. That sounds like a curiosity and it is diagnostically useful: a WER far above 100% on a segment is the signature of hallucinated output rather than degraded recognition, which is a different failure needing a different fix. (5) IT SAYS NOTHING ABOUT LATENCY, which for streaming systems is half the user experience. WHAT I WOULD REPORT INSTEAD, chosen from what consumes the transcript. ENTITY ERROR RATE: accuracy on the spans that matter - names, numbers, dates, dosages, product codes. This is usually the number the downstream system cares about and it is far more actionable than WER. KEYWORD RECALL for command-and-control interfaces. DOWNSTREAM TASK ACCURACY - did the intent classifier fire correctly, did the extracted field match the record - which is the only metric that measures the actual objective, and it frequently ranks systems differently from WER. SEMANTIC measures (embedding similarity, or an LLM judging whether the meaning is preserved) for open-ended transcription, which credit a paraphrase and penalize a meaning-changing error appropriately. And for streaming, LATENCY metrics alongside accuracy: time to first token, and the stability of partial results, since a caption that keeps rewriting itself is unusable regardless of final WER. THE DISCIPLINE I WOULD INSIST ON. State the normalization explicitly. Report per-slice results - accent, noise level, speaker demographics, domain - as a table, not a footnote. Include an ORACLE or human-transcription baseline where possible, because human WER on difficult audio is not zero and knowing the ceiling changes how you read the numbers. And look at fifty errors by hand; the error TYPES are far more informative than the rate, and they usually point at a data or vocabulary problem rather than a modelling one. THE GENERAL POINT, which is this module's theme: a metric encodes a cost model, and WER's cost model - all words equally valuable - is one almost no application actually has. Choosing the metric IS choosing what you are optimizing, and inheriting the field's default means inheriting an assumption you probably disagree with."
        },
        {
          "q": "How does modern text-to-speech work, and what determines quality?",
          "a": "THE TWO-STAGE ARCHITECTURE, which has been the standard shape and is worth understanding even as end-to-end models arrive. STAGE 1, TEXT TO MEL: a sequence model maps text (or phonemes) to a mel spectrogram at ~100 frames per second. STAGE 2, VOCODER: a neural model maps the mel spectrogram to a waveform at 24,000 samples per second. The split exists because these are genuinely different problems - stage 1 is a modest-rate sequence-to-sequence task that transformers handle well, stage 2 is a high-rate signal-generation task requiring different machinery - and because the vocoder can be trained once and reused across voices and languages. It is the same compress-then-decode factorization as latent diffusion. STAGE 1 VARIANTS. AUTOREGRESSIVE (Tacotron 2): generate mel frames one at a time with attention over the text. Natural prosody, and it inherits attention's failure modes - repeating words, skipping words, or failing to stop, which in TTS are audible and embarrassing. NON-AUTOREGRESSIVE (FastSpeech 2): predict a DURATION for each input token, expand the text sequence accordingly, and generate all mel frames in parallel. Much faster, far more robust (no looping or skipping, because the alignment is explicit), and slightly less natural in prosody because the duration model is doing work attention used to do implicitly. The duration predictor needs alignments to train, obtained from a teacher model or from a forced aligner - which is a real dependency. FastSpeech 2 also predicts pitch and energy explicitly, which gives controllability. STAGE 2, THE VOCODER. WaveNet was first and was autoregressive at the sample rate - 24,000 sequential steps per second of audio, far too slow for production. WaveRNN and parallel variants sped it up. HiFi-GAN is the current standard: adversarially trained, fast enough for real time on modest hardware, and high quality. Note that a GAN is doing essential work inside a system whose headline model is not adversarial - the same role a patch discriminator plays inside Stable Diffusion's autoencoder. WHAT DETERMINES QUALITY, in the order I would investigate. (1) THE VOCODER IS A CEILING. Vocode a GROUND-TRUTH mel spectrogram and listen. If that already sounds wrong, no work on stage 1 will help, and this ten-minute test partitions the failure space exactly as the encode-decode round trip does for latent diffusion. (2) TEXT NORMALIZATION AND PHONEMIZATION, which is where more production TTS bugs live than in the models. '$5.99', '2024', 'Dr.', 'St.' - each needs expansion to spoken form, and the rules are language-specific and full of ambiguity ('St.' is street or saint; 'read' depends on tense). Getting this wrong produces confidently wrong speech, and it is unglamorous engineering that determines perceived quality more than the acoustic model. (3) PROSODY: TTS reliably produces correct words with wrong emphasis, because the text does not determine the intonation and the model averages over the possibilities. This is the main remaining gap versus human speech and it is why long-form synthesis still sounds off even when individual sentences are fine. (4) DATA: single-speaker TTS wants a few hours of clean, consistent, studio-quality recordings; noisy or inconsistent data shows up immediately. EVALUATION. MOS (mean opinion score) is the convention and is NOT comparable across studies - it depends on the rater pool, the instructions, and which systems were heard together. Use PREFERENCE TESTS against a stated baseline, or MUSHRA, and report the comparison rather than an absolute number. Also measure intelligibility separately (word error rate of an ASR system on the synthesized audio is a cheap proxy) and report failure rates for the specific pathologies - skipped words, repeated words, mispronounced names. THE CURRENT DIRECTION: codec-based models (VALL-E and successors) treat TTS as language modelling over neural audio codec tokens, which gives zero-shot voice cloning from seconds of reference audio. That capability is genuinely impressive and it is also a serious misuse risk - voice cloning enables fraud and non-consensual synthetic speech - so any deployment needs consent verification and ideally watermarking, and I would raise that before the technical discussion rather than after."
        },
        {
          "q": "What makes Whisper different, and what are its failure modes?",
          "a": "THE APPROACH. Whisper is an ordinary attention encoder-decoder transformer - architecturally unremarkable. What is different is the DATA: 680,000 hours of audio with transcripts scraped from the web, deliberately NOT cleaned to a high standard, spanning many languages, accents, recording conditions, and domains. This is WEAK SUPERVISION AT SCALE rather than self-supervision or careful curation, and it was a bet that diversity beats cleanliness. WHY IT WORKED. Models trained on clean read speech (LibriSpeech and similar) achieve excellent benchmark WER and degrade sharply on real-world audio - accents, background noise, telephone bandwidth, crosstalk, domain vocabulary. Whisper's training distribution CONTAINS all of that, so it is robust where they are brittle. The striking result in the paper is that Whisper does NOT top the LibriSpeech leaderboard and substantially outperforms LibriSpeech-tuned models on out-of-distribution audio - benchmark score and real-world robustness came apart, and the model that looks worse on the benchmark is the one you would actually deploy. That is this curriculum's recurring theme arriving in speech. It also does several tasks in one model - multilingual transcription, translation to English, language identification, and timestamps - by conditioning on special tokens, which is a neat piece of interface design. THE FAILURE MODES, and they are specific and important. (1) HALLUCINATION ON SILENCE AND NON-SPEECH. Given silence, music, or noise, Whisper generates fluent, confident, entirely invented text - commonly repeated phrases, and notoriously sometimes text resembling YouTube subtitle boilerplate ('thank you for watching'), which is an artifact of the training data's provenance. This is a QUALITATIVELY different failure from high WER: the output is well-formed and wrong, so downstream systems and human readers have no signal that anything went wrong. Mitigations: voice activity detection to avoid feeding it non-speech at all; checking for repeated n-grams; using the no-speech probability the model provides; and capping segment WER-like implausibility. This must be handled explicitly in any deployment. (2) LOOPING AND REPETITION, the general attention-decoder pathology, which its long-form chunking strategy can amplify - a bad segment's output conditions the next. (3) TIMESTAMP INACCURACY: the predicted timestamps are approximate and drift, so applications needing precise alignment should use a forced aligner on the output rather than trusting them. (4) UNEVEN MULTILINGUAL QUALITY, tracking how much of each language was in the web data - excellent for high-resource languages and poor for low-resource ones, which the aggregate multilingual number obscures. (5) NO STREAMING, since it is an encoder-decoder that needs the full 30-second window; streaming implementations chunk and are approximate. (6) It is not immune to demographic disparity, and the per-slice evaluation still applies. WHAT I WOULD TAKE FROM IT MORE BROADLY. The methodological point is that DATA DIVERSITY bought robustness that architecture and clean-data training did not, and that the standard benchmark actively misled about which model to deploy. The practical point is that a model with a distinctive failure mode needs a guard designed for that failure - voice activity detection here - rather than a general improvement in quality. And the deployment point is that fluent-but-invented output is the most dangerous class of error in any generative system, because it defeats the reader's ability to notice."
        },
        {
          "q": "How would you build a voice interface for a specialized domain?",
          "a": "THE CORE DIFFICULTY is that general ASR is trained on general speech, and specialized domains have vocabulary, phrasing, and acoustics the model has never seen - drug names, part numbers, medical abbreviations, aviation phraseology, regional place names. A general model will confidently produce a plausible common word instead of the specialized one, and that error is invisible in aggregate WER while being fatal for the task. THE LADDER, cheapest first. (1) CUSTOM VOCABULARY AND BIASING, no training required. Most ASR systems support boosting a phrase list at decode time - shallow fusion with a domain language model, or on-the-fly biasing toward a context-specific vocabulary (the current patient's medication list, this warehouse's part numbers, this user's contacts). This is enormously effective for named entities and it is dynamic, which matters: the relevant vocabulary often depends on the session. If I could apply one thing, this is it. (2) CONSTRAINED DECODING for command-and-control. If the valid utterances form a small set or a grammar, decode against it rather than over open vocabulary. Accuracy goes up sharply, and out-of-grammar input becomes a detectable rejection rather than a silent misrecognition. (3) IN-DOMAIN FINE-TUNING of the acoustic model, once you have a few hours of transcribed domain audio. Start from a strong pretrained model (Whisper, or a wav2vec 2.0 checkpoint) and fine-tune - never train from scratch. (4) CONTINUED SELF-SUPERVISED PRETRAINING on untranscribed domain audio if you have a lot of it, before supervised fine-tuning. THE ACOUSTIC ENVIRONMENT, which is often the binding constraint and is under-considered. A warehouse, a moving vehicle, an operating theatre, and a factory floor have severe noise, reverberation, and often multiple speakers. The highest-return interventions here are frequently not model changes: a better microphone or a headset, near-field capture, push-to-talk instead of always-on, and noise suppression or beamforming in the front end. I would measure the signal-to-noise ratio of real captured audio before touching the model, because a model cannot recover information the microphone did not capture. And I would train or fine-tune on audio recorded through the ACTUAL deployment hardware, since channel characteristics matter more than people expect. THE INTERFACE DESIGN, which determines whether the system is usable at a given accuracy. CONFIRMATION for high-stakes actions - reading back a dosage or a part number before committing. Graceful REJECTION when confidence is low, with a specific request ('I did not catch the quantity') rather than a generic failure. Correction affordances that do not require repeating the whole utterance. And a fallback that is not voice. A 90%-accurate system with good confirmation and correction is more usable than a 95%-accurate system that fails silently, which is worth saying explicitly to stakeholders who are focused on the accuracy number. EVALUATION, on the domain's terms. Entity error rate on the terms that matter, not WER. Downstream task success - did the right record get updated. Per-speaker and per-condition breakdown, since a system that works for some staff and not others will be abandoned. And realistic test audio: recorded in the actual environment, with the actual hardware, by the actual users, including the accents and the background. Benchmark audio will overstate performance by a wide margin and the gap will only appear after deployment. WHAT I WOULD PILOT FIRST: the vocabulary-biasing path on an off-the-shelf model with real recorded audio, because it is a week of work and it establishes whether the remaining gap is a vocabulary problem, an acoustic problem, or a task-design problem - and those three have completely different fixes."
        },
        {
          "q": "What ethical and safety issues do speech systems raise?",
          "a": "I would separate these into recognition and synthesis, because the risks differ. RECOGNITION. (1) DEMOGRAPHIC PERFORMANCE DISPARITY is the most documented and most immediate harm. Published work has measured substantially higher error rates for some dialects and speaker groups than others in commercial ASR systems. The consequence is not abstract - if a voice interface gates access to a service, worse recognition means worse service for specific populations, and an aggregate WER conceals it entirely. The mitigations are known and unglamorous: representative training data, per-slice evaluation reported as a requirement rather than an extra, and treating a large disparity as a launch blocker. (2) SURVEILLANCE AND ALWAYS-ON CAPTURE. A device that listens continuously is a surveillance device, whatever the intent, and the questions are what is retained, where processing happens, and whether bystanders who never consented are recorded. On-device processing is a genuine mitigation and worth its engineering cost. (3) CONSENT in multi-party settings - meeting transcription records everyone present, and jurisdictions differ on whether one-party consent suffices. (4) SPEECH AS BIOMETRIC AND HEALTH DATA: voice identifies individuals and carries inferable signals about age, health conditions, and emotional state, so a transcript pipeline may be processing more sensitive data than anyone intended. SYNTHESIS, where the risks have sharpened recently. (1) VOICE CLONING FROM SECONDS OF AUDIO is now practical, and it enables impersonation fraud (the 'family member in distress' call), fabricated evidence, and non-consensual synthetic speech placing words in a real person's mouth. This is not speculative; it is happening. Mitigations: consent verification before cloning a voice, watermarking synthetic audio, detection models, and provenance standards - all partial, and worth doing anyway. (2) THE DEEPFAKE ASYMMETRY: detection lags generation, and the mere EXISTENCE of convincing synthesis undermines trust in genuine recordings, which is a harm even when no fake is made. (3) CONSENT AND COMPENSATION for voice actors whose recordings train synthesis models, which is an active labour dispute rather than a hypothetical. (4) DISCLOSURE: a synthetic voice in a customer-service or companionship context raises the question of whether the user should be told, and I think the answer is generally yes. WHAT I WOULD ACTUALLY DO ON A PROJECT. Measure per-group performance and publish it internally as a launch criterion. Minimize retention and process on-device where feasible. For any cloning capability, require verifiable consent from the voice's owner and watermark the output. Disclose synthetic speech to users. And be willing to say that a specific application should not be built - unrestricted voice cloning as a consumer feature is difficult to make safe, and 'we added a terms-of-service clause' is not a control. THE FRAMING I FIND USEFUL: speech is unusually intimate data. It identifies you, it carries involuntary signals about your state, and a convincing copy of it can be used against you in a way a copy of your text cannot. That argues for treating voice with the care given to biometrics rather than the care given to logs, and for raising these questions at design time rather than at review."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "CTC",
        "back": "Add a BLANK symbol; p(y|x) = sum over all frame paths collapsing to y (remove repeats, then blanks), computed in O(TU) by forward-backward. The blank both allows 'emit nothing' and SEPARATES repeated characters."
      },
      {
        "type": "pitfall",
        "front": "CTC's conditional independence",
        "back": "Given the audio, frame outputs are independent - so the model cannot express that 'q' is followed by 'u'. It produces phonetically plausible nonsense and needs an external LM at decode time. RNN-T's text predictor is the fix."
      },
      {
        "type": "definition",
        "front": "The three ASR architectures",
        "back": "CTC: simple, streams, no output dependencies. Attention enc-dec: strong, internal LM, CANNOT stream, can loop/skip catastrophically. RNN-T: models dependencies AND streams with bounded latency - what runs on your phone."
      },
      {
        "type": "intuition",
        "front": "The architecture choice is a streaming choice",
        "back": "Partial results while the user is still speaking (assistants, live captions) -> RNN-T. Batch transcription of recorded audio -> attention encoder-decoder, simpler and usually more accurate. Hybrid CTC+attention training stabilizes the latter."
      },
      {
        "type": "pitfall",
        "front": "WER weights all errors equally",
        "back": "'do not administer' -> 'do administer' and 'two' -> 'to' are both ONE error at 12.5% WER. Report ENTITY error rate, downstream task accuracy, and a per-slice breakdown by accent/noise/demographic."
      },
      {
        "type": "pitfall",
        "front": "Unqualified WER is not comparable",
        "back": "Punctuation, casing, contractions, and number formatting ('two' vs '2') swing it by several points. State the normalization. Also: WER can EXCEED 100% since insertions are unbounded - which is how hallucination shows up."
      },
      {
        "type": "pitfall",
        "front": "CTC's zero_infinity flag",
        "back": "If a target is LONGER than the input frames the loss is infinite and one example NaNs the batch. Set zero_infinity=True - and treat it as a signal of a data-prep error (wrong sample rate, over-trimming, mislabelled clip)."
      },
      {
        "type": "intuition",
        "front": "Whisper's bet",
        "back": "680k hours of NOISY web transcripts - weak supervision at scale, not clean data. It does not top LibriSpeech and substantially beats LibriSpeech-tuned models on real-world audio. Benchmark score and deployable robustness came apart."
      },
      {
        "type": "pitfall",
        "front": "Whisper hallucinates on silence",
        "back": "Given silence, music, or noise it generates fluent, confident, invented text - sometimes YouTube-subtitle boilerplate from its training data. Fluent-and-wrong defeats the reader's ability to notice. Guard with VAD, repetition checks, and the no-speech probability."
      },
      {
        "type": "definition",
        "front": "TTS is two-stage",
        "back": "text -> mel (a ~100 fps sequence problem) then mel -> waveform (a 24 kHz signal problem, the vocoder). Different tools for different problems, and the vocoder is trained once and reused across voices. Same factorization as latent diffusion."
      },
      {
        "type": "intuition",
        "front": "AR vs non-AR TTS",
        "back": "Tacotron-style autoregressive: natural prosody, inherits attention's looping/skipping/never-stopping failures. FastSpeech-style: explicit DURATION prediction, parallel, robust by construction, slightly flatter prosody - and needs alignments to train."
      },
      {
        "type": "pitfall",
        "front": "MOS is not comparable across studies",
        "back": "It depends on the rater pool, the instructions, and which systems were heard together. Use PREFERENCE tests against a stated baseline, and measure intelligibility separately (e.g. ASR WER on the synthesized audio)."
      }
    ],
    "refs": [
      {
        "title": "Graves et al. (2006), Connectionist Temporal Classification",
        "url": "https://www.cs.toronto.edu/~graves/icml_2006.pdf"
      },
      {
        "title": "Radford et al. (2022), Robust Speech Recognition via Large-Scale Weak Supervision (Whisper)",
        "url": "https://arxiv.org/abs/2212.04356"
      },
      {
        "title": "Graves (2012), Sequence Transduction with Recurrent Neural Networks (RNN-T)",
        "url": "https://arxiv.org/abs/1211.3711"
      },
      {
        "title": "Ren et al. (2021), FastSpeech 2: Fast and High-Quality End-to-End Text to Speech",
        "url": "https://arxiv.org/abs/2006.04558"
      },
      {
        "title": "Koenecke et al. (2020), Racial disparities in automated speech recognition",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1915768117"
      }
    ],
    "demos": [
      "spectrogram",
      "beam-search",
      "hmm-viterbi",
      "dtw"
    ]
  },
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
    ]
  }
};
