// GENERATED from content/lessons/multimodal/vqa.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/vqa/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
  }
};
