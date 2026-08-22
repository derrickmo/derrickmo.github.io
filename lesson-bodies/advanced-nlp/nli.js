// GENERATED from content/lessons/advanced-nlp/nli.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/nli/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "nli": {
    "level": "core",
    "body": {
      "intuition": [
        "Natural language inference asks a deceptively simple question: given a PREMISE and a HYPOTHESIS, does the premise entail the hypothesis, contradict it, or neither? 'A soccer game with multiple males playing' entails 'Some men are playing a sport', contradicts 'The men are sleeping', and is neutral with respect to 'The men are playing for money'. It was proposed as a general test of language understanding on the reasoning that almost any comprehension task can be reframed as inference, and with SNLI (570k pairs) and MNLI (393k) the field finally had datasets big enough to train on.",
        "Models passed the benchmark quickly - fine-tuned encoders reach around 90% on MNLI, which is in the neighbourhood of human agreement. And then, in 2018, two groups independently ran the experiment that should have been run first: train a classifier that sees ONLY THE HYPOTHESIS, with the premise deleted entirely. It scored about 67% on SNLI against a 34% chance baseline. Two-thirds of a task defined as a relation between two sentences was solvable from one of them.",
        "That result is the most important thing in this lesson, and its lesson is not about NLI. Crowdworkers writing hypotheses developed habits: to produce a contradiction you insert a negation, so 'not', 'nobody', and 'never' became contradiction markers; to produce an entailment you generalize, so vague words like 'outdoors', 'animal', and 'person' became entailment markers, and entailment hypotheses came out systematically shorter. Models learned the habits. McCoy's HANS test then showed the same thing from the other direction: models scoring above 90% on MNLI fall to near ZERO on cases where the hypothesis reuses the premise's words but is not entailed. The model had learned 'high lexical overlap means entailment' - a heuristic that is right most of the time in the training data and catastrophically wrong when someone builds a test set where it is not. Every benchmark you did not adversarially probe should be read in this light."
      ],
      "math": [
        {
          "h": "The task, and the standard encoding",
          "paras": [
            "Three-way classification over a sentence pair. The pair is concatenated with a separator so that self-attention can align tokens across the two segments from the first layer - which is why cross-encoders beat any approach that embeds the sentences separately."
          ],
          "tex": "p(y \\mid P, H) = \\mathrm{softmax}\\big(W\\,h_{\\texttt{[CLS]}}\\big), \\qquad y \\in \\{\\text{entail}, \\text{contradict}, \\text{neutral}\\}",
          "texNote": "Input is [CLS] P [SEP] H [SEP]. The joint encoding is essential: a BI-encoder that embeds P and H separately and compares vectors loses the token-level alignment, and NLI is fundamentally an alignment task."
        },
        {
          "h": "The hypothesis-only baseline, and what it measures",
          "paras": [
            "Delete the premise and train on the hypothesis alone. Whatever accuracy this reaches is accuracy your full model can obtain WITHOUT doing the task, so it is the real floor - and the gap to the full model is the only part attributable to inference."
          ],
          "tex": "\\text{artifact score} = \\mathrm{Acc}\\big(p(y \\mid H)\\big) - \\tfrac{1}{|\\mathcal{Y}|}, \\qquad \\text{SNLI: } 0.67 - 0.34 = 0.33",
          "texNote": "33 points above chance from the hypothesis alone. Run this test on ANY dataset with a structured input - it costs one training run and it is the cheapest way to discover that your benchmark is partly solvable by a shortcut."
        },
        {
          "h": "Pointwise mutual information: finding the artifacts",
          "paras": [
            "The specific give-away words can be located directly by measuring which tokens are disproportionately associated with each label across the training set."
          ],
          "tex": "\\mathrm{PMI}(w, y) = \\log \\frac{p(w, y)}{p(w)\\,p(y)}",
          "texNote": "On SNLI the top contradiction words are negations ('nobody', 'no', 'never', 'sleeping'); the top entailment words are generic hypernyms ('outdoors', 'animal', 'instrument'). Entailment hypotheses are also systematically SHORTER, because generalizing shortens and elaborating lengthens."
        }
      ],
      "code": [
        {
          "h": "Run the hypothesis-only baseline before you trust anything",
          "paras": [
            "This is a fifteen-line experiment that changes how you read every number that follows. It generalizes far beyond NLI: for any task with structured input, ablate a part of the input and see how much accuracy survives."
          ],
          "code": "# 1. Full model: premise + hypothesis\nfull = train(lambda ex: tok(ex[\"premise\"], ex[\"hypothesis\"], truncation=True))\n\n# 2. Hypothesis ONLY - the premise is deleted, so the task is undefined\nhyp_only = train(lambda ex: tok(ex[\"hypothesis\"], truncation=True))\n\n# 3. Premise only, for completeness\nprem_only = train(lambda ex: tok(ex[\"premise\"], truncation=True))\n\n#   SNLI test accuracy        chance = 0.34\n#     premise only ......... 0.35    <- as expected: no signal\n#     HYPOTHESIS ONLY ...... 0.67    <- 33 points above chance from half the input\n#     full model ........... 0.91\n#\n# Read that middle row carefully. The task is defined as a RELATION between two\n# sentences, and two-thirds of it is solvable with one of them removed. So the\n# full model's 91% decomposes into roughly 67 points reachable by exploiting how\n# the hypotheses were written, and ~24 points of anything resembling inference.\n#\n# The generalization: ablate part of the input on ANY structured task. Question\n# answering without the passage, VQA without the image, multiple choice without\n# the question. It costs one training run and it is the single cheapest way to\n# find out that your benchmark is partly a spurious-correlation detector.",
          "caption": "The hypothesis-only baseline on SNLI: 67% against 34% chance. This experiment is cheap, general, and should be run on every dataset before any model comparison is taken seriously."
        },
        {
          "h": "HANS: testing the heuristic directly",
          "paras": [
            "The artifact study asked what the model could learn from the labels. HANS asks what heuristic the model actually learned, by constructing cases where a plausible heuristic gives the wrong answer."
          ],
          "code": "# HANS (McCoy et al. 2019) targets three heuristics a model might have learned:\n#   LEXICAL OVERLAP  - the hypothesis's words all appear in the premise\n#   SUBSEQUENCE      - the hypothesis is a contiguous subsequence of the premise\n#   CONSTITUENT      - the hypothesis is a syntactic constituent of the premise\n#\n# Each heuristic gets ENTAILED and NON-ENTAILED examples:\n#   P: \"The doctor was paid by the actor.\"    H: \"The doctor paid the actor.\"\n#      -> full lexical overlap, NOT entailed (the passive reverses the roles)\n#   P: \"If the artist slept, the actor ran.\"  H: \"The artist slept.\"\n#      -> a constituent of the premise, NOT entailed (it is under a conditional)\n\n#   BERT fine-tuned on MNLI (~90% MNLI accuracy):\n#     HANS, entailed subset ......... ~96%\n#     HANS, NON-entailed subset ..... ~5%\n#\n# Near-zero on the non-entailed half. The model is not doing inference at all on\n# these cases - it is answering \"do the words overlap?\" That policy scores ~96%\n# on the entailed half and ~5% on the other, which averages to something\n# respectable on any test set where overlap correlates with entailment. MNLI is\n# such a test set. HANS is not, by construction.\n#\n# The lesson is about DIAGNOSIS, not about NLI: aggregate accuracy on an i.i.d.\n# test set cannot distinguish \"solved the task\" from \"found a correlation that\n# holds in this distribution\". Only a test set built to break the correlation can.",
          "caption": "A model at 90% on MNLI scoring ~5% on HANS's non-entailed cases. This is not a small robustness gap - it is evidence the model implemented a different function than the one the benchmark was meant to measure."
        }
      ],
      "useCases": [
        "ZERO-SHOT CLASSIFICATION, which is NLI's most useful practical export: encode the text as the premise and 'This text is about {label}' as the hypothesis, and read the entailment probability as the class score. This lets one MNLI-trained model classify into any label set described in words, with no task-specific training - it is what most zero-shot classification pipelines actually run.",
        "FACTUAL CONSISTENCY AND HALLUCINATION DETECTION: check whether a generated summary or an LLM answer is entailed by its source document. SummaC and FactCC apply NLI sentence-by-sentence for exactly this, and it is one of the more reliable automatic hallucination checks available for RAG systems.",
        "Intermediate-task transfer: an MNLI-fine-tuned checkpoint is the standard starting point for small sentence-pair tasks, both raising the mean and sharply reducing seed variance. Starting from one instead of a raw pretrained model is free.",
        "Claim verification and evidence assessment - fact-checking pipelines that retrieve evidence and then ask whether it supports, refutes, or is unrelated to a claim (the FEVER task shape)."
      ],
      "pitfalls": [
        "Trusting a benchmark you have not ablated. The hypothesis-only baseline scores 67% on SNLI against 34% chance. Before comparing models on any structured-input dataset, delete part of the input and see how much accuracy survives - that number is the floor your model can reach without doing the task.",
        "Reading high i.i.d. accuracy as understanding. A model at 90% on MNLI scores ~5% on HANS's non-entailed cases, meaning it learned 'lexical overlap implies entailment'. Aggregate accuracy on a test set drawn from the training distribution cannot detect this by construction.",
        "Using a bi-encoder for NLI. Embedding premise and hypothesis separately and comparing vectors destroys the token-level alignment the task depends on. Use a cross-encoder that sees both sentences jointly.",
        "Assuming NEUTRAL is a coherent class. It is a residual category - everything that is neither entailed nor contradicted - and it absorbs genuine ambiguity, missing world knowledge, and annotator disagreement. It is consistently the lowest-accuracy class and its errors are the least interpretable.",
        "Treating disagreement between annotators as noise to be averaged away. A meaningful fraction of NLI items have legitimate label disagreement - they depend on pragmatic assumptions people do not share - and forcing a majority label discards real signal. Datasets that keep the full label distribution (ChaosNLI) show models fit the majority far better than the distribution.",
        "Expecting a model trained on SNLI's photo captions to transfer. SNLI premises are Flickr captions - short, concrete, present-tense descriptions of scenes. Performance on legal, scientific, or conversational text is far worse, and MNLI exists precisely because of this.",
        "Deploying an NLI model for factual consistency without checking its calibration on YOUR data. NLI models trained on crowdsourced pairs are poorly calibrated on long, formal document text, and the probability you threshold on is not comparable across domains."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "Annotation artifacts are the same problem as metric gaming: a proxy that correlates with the target on the data you collected, and comes apart when something optimizes against it."
        },
        {
          "ref": "advanced-nlp/fine-tuning-transformers",
          "text": "MNLI is the canonical intermediate task - starting from an MNLI checkpoint improves small sentence-pair tasks and reduces their seed variance markedly."
        },
        {
          "ref": "rag-agents/rag-eval",
          "text": "Entailment between an answer and its retrieved evidence is one of the more dependable automatic groundedness checks, and it is an NLI model doing the work."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general discipline - ablate the input, build adversarial splits, distrust aggregate i.i.d. accuracy - applies to every benchmark, not just this one."
        },
        {
          "ref": "advanced-cv/grad-cam",
          "text": "Shortcut learning is modality-independent: the vision analogue is a model classifying by background texture, and the diagnostic move (construct data where the shortcut fails) is identical."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is natural language inference?",
          "a": "Given a premise and a hypothesis, classify their relation as entailment, contradiction, or neutral. Proposed as a general test of understanding because most comprehension tasks can be reframed as inference."
        },
        {
          "q": "What are SNLI and MNLI?",
          "a": "SNLI: 570k pairs with premises from Flickr photo captions - short, concrete, single-domain. MNLI: 393k pairs across ten genres, including matched and MISMATCHED dev sets to test cross-genre transfer."
        },
        {
          "q": "What is the hypothesis-only baseline?",
          "a": "Train a classifier on the hypothesis alone, with the premise deleted. On SNLI it scores ~67% against 34% chance - two-thirds of a relational task solved from one side of the relation."
        },
        {
          "q": "What causes those artifacts?",
          "a": "How crowdworkers write. Producing a contradiction invites inserting a negation; producing an entailment invites generalizing, which yields vague words and SHORTER hypotheses. The label leaks into the hypothesis's surface form."
        },
        {
          "q": "What is HANS?",
          "a": "A diagnostic set targeting three heuristics - lexical overlap, subsequence, constituent - with entailed and non-entailed cases for each. Models at 90% MNLI score near 5% on the non-entailed half."
        },
        {
          "q": "What does that HANS result mean?",
          "a": "The model learned 'the hypothesis's words appear in the premise, so it is entailed'. That is ~96% right on one half and ~5% on the other, and averages fine on any test set where overlap correlates with entailment."
        },
        {
          "q": "Why must NLI use a cross-encoder?",
          "a": "Inference depends on token-level ALIGNMENT between the two sentences. A bi-encoder embeds them separately and compares vectors, which discards exactly that information."
        },
        {
          "q": "How is NLI used for zero-shot classification?",
          "a": "Text as premise, 'This text is about {label}' as hypothesis; the entailment probability is the class score. One MNLI model classifies into any label set describable in words, with no training."
        },
        {
          "q": "How is NLI used to detect hallucination?",
          "a": "Ask whether the generated text is entailed by the source document, sentence by sentence. SummaC and FactCC do this, and it is one of the more dependable automatic groundedness checks for RAG."
        },
        {
          "q": "Why is 'neutral' the hardest class?",
          "a": "It is a residual - everything that is neither entailed nor contradicted - so it absorbs ambiguity, missing world knowledge, and annotator disagreement rather than describing a coherent relation."
        },
        {
          "q": "What is ANLI?",
          "a": "Adversarial NLI: humans write examples that fool the current best model, those are added to training, a new model is trained, and the loop repeats for several rounds. It produces genuinely harder data and a moving benchmark."
        },
        {
          "q": "What is ChaosNLI?",
          "a": "A re-annotation collecting ~100 labels per item instead of five, showing that many items have genuine, stable human disagreement. Models fit the MAJORITY label far better than they fit the label DISTRIBUTION."
        }
      ],
      "standard": [
        {
          "q": "Explain annotation artifacts in NLI and what they imply for benchmark design generally.",
          "a": "THE FINDING. Gururangan et al. and Poliak et al. independently trained NLI classifiers on the HYPOTHESIS ALONE, discarding the premise entirely. This makes the task formally undefined - entailment is a relation between two sentences and one has been removed. The hypothesis-only model scored roughly 67% on SNLI and 53% on MNLI, against a 34% chance baseline. So two-thirds of SNLI is solvable without looking at the premise. WHERE THE ARTIFACTS COME FROM, which is the part that generalizes. The datasets were built by showing crowdworkers a premise and asking them to write three hypotheses: one entailed, one contradicting, one neutral. Under time pressure, people develop STRATEGIES, and the strategies leave fingerprints. To write a contradiction, the fastest move is to negate - so 'not', 'nobody', 'never', 'no' became strong contradiction markers. To write an entailment, the fastest move is to generalize or drop detail - so hypernyms like 'outdoors', 'animal', 'person', 'instrument' became entailment markers, and entailment hypotheses came out systematically SHORTER. To write a neutral, the fastest move is to add unverifiable detail - purposes, motivations, quantities - so words like 'tall', 'first', 'because' became neutral markers. None of this is annotator carelessness; it is what any efficient person does under the elicitation protocol, and the protocol is what encoded the label in the surface form. WHAT IT IMPLIES FOR THE MODELS. A model trained on this data will use the artifacts, because they are predictive and cheaper to learn than inference. This means (a) reported accuracy substantially overstates inferential ability, (b) the model is brittle in exactly the way HANS demonstrated, and (c) comparisons between models partly measure who best exploits the artifacts. It does NOT mean the models learn nothing - the gap from 67% to 91% is real - but the headline number is not what it appeared to be. WHAT IT IMPLIES FOR BENCHMARK DESIGN, which is the actual question. (1) ALWAYS RUN INPUT-ABLATION BASELINES. Delete part of the input and measure what survives. This one experiment would have caught SNLI, and it has since caught: visual question answering answerable without the image, reading comprehension answerable without the passage, multiple choice answerable without the question, and commonsense benchmarks answerable from answer-option length. It costs one training run. Not running it is now indefensible. (2) SCRUTINIZE THE ELICITATION PROTOCOL, because artifacts are produced by how data is collected, not by what it is about. Asking people to WRITE text to a label specification is the highest-risk protocol, since the label determines the writing strategy. Collecting naturally-occurring pairs and labelling them afterwards is far safer, though harder and more expensive. (3) BUILD ADVERSARIAL AND STRESS SPLITS DELIBERATELY. HANS-style construction - cases where a plausible heuristic gives the wrong answer - reveals what i.i.d. test accuracy cannot, by construction. (4) MEASURE ARTIFACT REMOVAL rather than assuming it. Approaches like adversarial debiasing, product-of-experts with a bias-only model, and example reweighting improve out-of-distribution performance but usually cost in-distribution accuracy, and none of them fully solve it. (5) COLLECT ADVERSARIALLY, as ANLI did: put a model in the annotation loop and only keep examples that fool it. This produces harder data and a benchmark that moves with the field, at the cost of a distribution shaped by whatever model was in the loop. THE DEEPEST POINT, and the one worth saying explicitly: this is not an NLI story. It is a general fact about supervised learning - models find the EASIEST predictive signal, and if collection introduced one that is easier than the intended task, that is what gets learned. Benchmarks measure what is predictable in the data, not what the designers meant. Every benchmark should be assumed to contain shortcuts until someone has looked.",
          "deepDive": {
            "q": "How would you actually debias a model trained on data with known artifacts?",
            "a": "THE OBJECTIVE. Train a model that does not rely on the shortcut, measured by improved performance on out-of-distribution and adversarial sets, ideally without giving up much in-distribution accuracy. THE FAMILIES, roughly in order of how principled they are. (1) PRODUCT OF EXPERTS / bias-product, which is the best-understood approach. Deliberately train a WEAK BIASED MODEL that can only use the shortcut - for NLI, a hypothesis-only classifier. Then train the main model on the combined prediction, so the loss is computed on log p_main + log p_bias. The consequence is that examples the biased model already gets right contribute little gradient to the main model, which is therefore pushed to learn what the shortcut cannot explain. At inference the bias model is discarded. This is elegant because you specify the bias explicitly and the mechanism is transparent. (2) EXAMPLE REWEIGHTING: down-weight examples the biased model finds easy, up-weight the ones it fails on. Mechanically similar to product-of-experts, simpler to implement, slightly less principled. (3) CONFIDENCE REGULARIZATION: instead of hard down-weighting, smooth the target distribution on examples the biased model handles well, so the main model is discouraged from being confident for the wrong reason. Tends to preserve in-distribution accuracy better than hard reweighting. (4) ADVERSARIAL REMOVAL: attach a discriminator that tries to predict the label from the encoder's representation of the hypothesis alone, and train the encoder to defeat it via a gradient reversal layer. Attractive in principle; in practice adversarial training is unstable and the information usually remains recoverable by a stronger probe - it is hidden, not removed. (5) DATA-SIDE FIXES: augment with counterexamples (HANS-style constructions added to training substantially improves HANS performance), collect adversarially (ANLI), or filter the dataset to remove examples solvable by the biased model (AFLite). Data fixes are often the most effective and the most expensive. (6) ENSEMBLE-BASED: train several models with different inductive biases and use their disagreement to locate shortcut-dependent examples. THE HARD PART, and this is what I would emphasize: YOU MUST KNOW THE BIAS IN ADVANCE. Every method above requires specifying what the shortcut is so you can build a model that captures it. Real datasets contain unknown shortcuts, and you cannot debias against what you have not identified. There is work on unknown-bias settings - using a deliberately under-trained or low-capacity model as a generic 'shortcut detector' on the theory that weak models learn shortcuts first - and it partly works, but it is much weaker than the targeted version. THE TRADE-OFF THAT IS ALWAYS PRESENT: debiasing methods consistently improve OOD and adversarial performance while COSTING in-distribution accuracy, typically one to three points. That trade is real, not an implementation failure. Some of the in-distribution accuracy genuinely came from the shortcut, and the shortcut is genuinely predictive in-distribution - so removing it must cost something. Which side you want depends on whether deployment resembles the training distribution. A second, subtler risk: over-debiasing can push the model to IGNORE legitimately useful signal. Lexical overlap really is correlated with entailment in normal language; a model trained to disregard it entirely has lost information. WHAT I WOULD ACTUALLY DO on a real project, which is less exciting than the methods list. First, MEASURE - build a challenge set representing the failure I care about, because without it I cannot tell whether anything helped. Second, prefer DATA fixes: collect or construct counterexamples for the specific failure, since this is the most reliable and the improvement is easiest to verify. Third, apply product-of-experts if the bias is cleanly specifiable. Fourth, report both in-distribution and challenge-set numbers always, and treat the pair as the result rather than picking whichever is flattering. And fifth, set expectations honestly: debiasing reduces reliance on a known shortcut, it does not produce a model that reasons."
          }
        },
        {
          "q": "How would you use an NLI model to detect hallucinations in a RAG system?",
          "a": "THE FRAMING, which is what makes this work: a hallucination in RAG is a generated statement not supported by the retrieved context. That is exactly entailment - context as premise, generated claim as hypothesis - so an NLI model is a natural detector and needs no task-specific training. THE PIPELINE I would build. (1) DECOMPOSE THE GENERATION INTO ATOMIC CLAIMS. Do not run NLI on a whole paragraph: it will contain supported and unsupported parts and a single label averages them into something useless. Split into sentences at minimum; better, use an LLM to decompose into atomic factual claims, since a single sentence often bundles several assertions and one can be wrong while the rest are right. This decomposition step is where most of the accuracy comes from and it is the part people skip. (2) FOR EACH CLAIM, FIND THE RELEVANT CONTEXT. Running NLI against the entire retrieved context at once is unreliable - NLI models are trained on short premises and degrade on long ones. The standard fix (SummaC's contribution) is to compute entailment between each claim and each context SENTENCE and take the MAXIMUM: a claim is supported if ANY sentence supports it. This sentence-level granularity substantially outperforms document-level NLI and is the single most important implementation detail. (3) AGGREGATE. Per-claim support scores roll up to a document-level groundedness score, but keep the per-claim scores - they are what makes the output actionable, since you can highlight the specific unsupported sentence rather than reporting a number. (4) SET A THRESHOLD ON YOUR OWN DATA. NLI probabilities from a crowdsourced-pair model are not calibrated on formal document text, so the threshold must be chosen against a labelled sample from your actual domain. THE LIMITATIONS I would state up front, because this method is often oversold. (a) 'NOT ENTAILED' IS NOT 'FALSE'. A claim can be true and unsupported by the retrieved context - the model may know it from pretraining. Whether that counts as a hallucination is a PRODUCT decision: for a grounded-answering product it does, for a general assistant it may not. (b) NLI models handle NEGATION, NUMBERS, AND QUANTIFIERS poorly, which is unfortunate because numerical hallucinations are among the most damaging. A claim that changes '$4.2 million' to '$4.5 million' may well be scored as entailed. (c) PARTIAL SUPPORT is common and three-way NLI has no vocabulary for it. (d) LONG AND MULTI-HOP claims requiring several context sentences together are missed by the max-over-sentences aggregation, which is a direct cost of the design that fixes the long-premise problem. (e) DOMAIN SHIFT: MNLI is crowdsourced short text, and legal or clinical prose is far from it. THE ALTERNATIVES AND HOW I WOULD COMBINE THEM. LLM-AS-JUDGE with a grounding prompt is more flexible, handles numbers and multi-hop better, and gives an explanation - but it is far more expensive, is itself prone to error, and has known biases. QUESTION-GENERATION methods (QAGS, FEQA) generate questions from the output, answer them from the source, and compare - stronger on some error types and slower still. TOKEN-LEVEL UNCERTAINTY from the generator is nearly free but only detects the model's own uncertainty, which correlates weakly with groundedness. In production I would use the NLI checker as a fast first-pass filter over everything, because it is cheap enough to run on every response, and escalate low-scoring outputs to an LLM judge - a cascade, so the expensive check runs on the small fraction that needs it. HOW I WOULD VALIDATE IT, which is the step that determines whether any of this is real: hand-label a few hundred generations for groundedness, then measure the detector's precision and recall against those labels. Every published number for these methods is on a specific benchmark, and transfer to your domain is an empirical question, not an assumption."
        },
        {
          "q": "Why does zero-shot classification via NLI work, and what are its limits?",
          "a": "THE METHOD (Yin et al., 2019). Take a model fine-tuned on MNLI. To classify a text into an arbitrary label set, construct one NLI pair per label: the text is the premise, and 'This example is {label}.' is the hypothesis. Read off the entailment probability for each, and take the argmax (or apply a threshold for multi-label). No training, no labelled data, and the label set can change at request time. WHY IT WORKS. (1) NLI IS A TASK-GENERAL FORMAT. Classification is 'does this text belong to this category', and entailment is 'does this text imply this statement' - these are close enough that a model trained on the second transfers to the first. Reframing a task into an already-trained format is the general trick, and NLI happens to be an unusually general format. (2) THE LABEL SEMANTICS ARE USED, not just the label identity. A standard classifier's output index carries no meaning - class 3 is class 3. Here the label is TEXT, so the model brings everything it knows about the word 'refund' or 'urgent' to bear. That is why it generalizes to labels never seen in training. (3) MNLI IS LARGE AND MULTI-GENRE, so the model has seen diverse premise types. (4) The pretrained encoder supplies broad world knowledge underneath. THE LIMITS, in order of practical importance. (1) IT IS BEATEN BY EVEN A LITTLE SUPERVISION. A few hundred labelled examples fine-tuning a small encoder will typically beat zero-shot NLI comfortably. Its niche is genuinely zero-data, not 'we did not get round to labelling'. (2) PROMPT SENSITIVITY IS SEVERE. 'This example is {label}', 'This text is about {label}', and 'The topic of this document is {label}' can differ by many points, and there is no principled way to choose without labelled data - at which point you are no longer zero-shot. This is the most underrated weakness. (3) LABEL WORDING MATTERS AS MUCH AS THE TEMPLATE. 'billing' versus 'a billing issue' versus 'payment and invoicing problems' produce different results. The labels are now part of the model input and must be engineered. (4) SCORES ARE NOT COMPARABLE ACROSS LABELS. Each label's entailment probability comes from a separate forward pass, so they are not a normalized distribution - some hypotheses are simply more entailable than others regardless of the text, which biases the argmax toward certain labels. Renormalizing helps; using the contradiction score as a counterweight helps; neither fully fixes it. (5) IT SCALES BADLY IN THE LABEL SET - one forward pass PER LABEL, so 100 labels is 100 passes per input. Fine for 5 labels, unusable at 500. (6) FINE-GRAINED, TECHNICAL, OR OVERLAPPING LABELS defeat it, because it depends on the label words being semantically transparent. Codes, jargon, and near-synonymous categories carry no usable meaning. (7) It inherits every artifact and brittleness from MNLI. WHERE I WOULD ACTUALLY USE IT: cold start on a new classification problem to establish a baseline and sanity-check the taxonomy; label sets that change per request or per user; rapid prototyping before committing to annotation; and generating weak labels to bootstrap a supervised model. AND THE HONEST COMPARISON TODAY: for most zero-shot classification, prompting a modern instruction-tuned LLM is now better and roughly as convenient. NLI-based zero-shot retains real advantages in cost (a 400M cross-encoder versus an API call), latency, on-premises deployment, and giving a per-label SCORE you can threshold rather than a generated token. That last point is more valuable than it sounds when you need to tune an operating point rather than accept whatever the model says."
        },
        {
          "q": "How should human label disagreement in NLI be handled?",
          "a": "THE OBSERVATION. NLI datasets collect five annotations per item and use the majority as the gold label, reporting the rest as noise. ChaosNLI tested that assumption by collecting about 100 annotations per item on a subset, and found that for a substantial fraction the disagreement is not noise at all: it is STABLE, REPRODUCIBLE, and reflects genuine differences in how people interpret the pair. Collect a hundred more annotations and you get the same split. WHY IT HAPPENS, and these are legitimately different judgements rather than errors. (1) PRAGMATIC INFERENCE varies. 'A man is playing guitar' and 'A man is performing' - is performing entailed? It depends on assumptions about audience and intent that people do not share. (2) The ENTAILMENT DEFINITION is itself vague. The standard instruction is roughly 'would a reasonable person conclude the hypothesis is probably true' - 'probably' is doing enormous work and different annotators set different thresholds. (3) The NEUTRAL/CONTRADICTION boundary is genuinely unclear when the hypothesis adds detail that is unlikely but not impossible. (4) WORLD KNOWLEDGE differs between annotators. (5) COREFERENCE across the pair is often ambiguous - is 'the man' in the hypothesis the same man as in the premise? THE PROBLEM WITH MAJORITY LABELS. (a) It DISCARDS REAL INFORMATION: a 60/40 split and a 100/0 split become the same training target, though they describe very different items. (b) It makes the CEILING incoherent: if only 60% of humans agree, a model at 100% agreement with the majority label is not more correct than humans - it is fitting an artifact of the aggregation. (c) It obscures MODEL CALIBRATION: a model that is uncertain on genuinely ambiguous items is behaving correctly and is penalized for it. (d) It hides that some benchmark 'errors' are cases where the model picked a defensible minority reading. WHAT TO DO INSTEAD, in increasing order of ambition. (1) COLLECT AND PUBLISH THE FULL DISTRIBUTION, not just the majority. This is the cheapest change and it enables everything else. (2) TRAIN ON SOFT LABELS: use the empirical annotator distribution as the target with a KL or cross-entropy loss against it, rather than a one-hot majority. This teaches the model to be uncertain exactly where humans are, and it improves calibration. (3) EVALUATE WITH DISTRIBUTIONAL METRICS - JS divergence or KL between the model's predictive distribution and the human distribution - alongside accuracy. ChaosNLI's headline finding is precisely that models which look excellent on majority accuracy fit the human DISTRIBUTION poorly, which is a different and arguably more relevant failure. (4) SEPARATE THE TWO KINDS OF ITEM: partition the evaluation into high-agreement items (where accuracy is meaningful) and low-agreement items (where distribution-matching is the right question), and report both. Aggregating them is what causes the confusion. (5) TREAT HIGH-DISAGREEMENT ITEMS AS A FINDING about the task specification rather than as bad data - they usually point at an underspecified guideline. THE BROADER POINT, which is why this matters beyond NLI. The assumption that every input has ONE correct label is a modelling convenience, and for tasks involving judgement - toxicity, sentiment, relevance, harm, quality - it is often false. Disagreement carries information about the item and about the population of annotators, and averaging it away both discards that and makes the resulting benchmark's ceiling meaningless. This has direct practical consequences in RLHF and preference modelling, where reward models are trained on aggregated preferences from annotators who genuinely disagree - the same critique applies, with higher stakes. My working position: report the distribution, train on it when you have it, evaluate against it, and treat low-agreement items as a signal that the specification needs work rather than as noise to be cleaned."
        },
        {
          "q": "How do you build an evaluation for a task you suspect has shortcuts?",
          "a": "THE PRINCIPLE. A test set drawn from the same distribution as training CANNOT detect a shortcut, because the shortcut works on it by definition. Detection requires data where the shortcut and the true task DISAGREE, and that has to be constructed deliberately. Everything below is a way of constructing it. STEP 1 - ABLATION BASELINES, first and cheapest. Train on partial inputs and see what survives: hypothesis-only for NLI, question-only and passage-only for QA, image-only and question-only for VQA, options-only for multiple choice. Any accuracy above chance is accuracy obtainable without doing the task. One training run each, and this alone has exposed shortcuts in a long list of major benchmarks. STEP 2 - SHUFFLE AND CORRUPTION TESTS. Shuffle word order within the input; if accuracy barely moves, the model is using bag-of-words features and the task's syntactic content is not being tested. Replace the passage with a random one. Remove the premise. Each of these is a null hypothesis you should be able to reject. STEP 3 - IDENTIFY CANDIDATE SHORTCUTS EXPLICITLY. Compute PMI between input features and labels to find give-away tokens. Check whether label correlates with length, position, source, or annotator ID. Look at what a deliberately WEAK model (logistic regression on bag-of-words, or a heavily under-trained network) learns - weak models find the easiest signal first, which makes them useful shortcut detectors. Read a hundred examples yourself; humans are good at spotting 'oh, the answer is always the longest option'. STEP 4 - CONSTRUCT CHALLENGE SETS WHERE THE SHORTCUT FAILS. This is HANS's method and it is the definitive test. For each hypothesized shortcut, generate examples where following it gives the WRONG answer - high lexical overlap but not entailed, longest option but incorrect, negation present but not a contradiction. Templated generation is fine and often preferable, because it gives you controlled coverage and lets you report per-heuristic accuracy. A model at 90% in-distribution and 5% on the anti-shortcut subset has told you something no aggregate number could. STEP 5 - CONTRAST SETS AND MINIMAL PAIRS. Take real test examples and perturb them MINIMALLY so the correct label changes - change one word, negate one clause, swap two entities. This measures whether the model's decision boundary is sensitive to the features that actually determine the label, and it is more realistic than templated generation because it stays on the data manifold. Gardner et al.'s contrast sets formalized this and it is the technique I would reach for first on a real product task. STEP 6 - ADVERSARIAL AND HUMAN-IN-THE-LOOP COLLECTION. Put the model in the annotation interface and keep only examples that fool it (ANLI, Dynabench). Produces genuinely hard data and a benchmark that moves with the field; the cost is a distribution shaped by whichever model was in the loop, which is its own kind of bias. STEP 7 - EVALUATE ACROSS NATURAL DISTRIBUTION SHIFTS - different domain, different time period, different source, different annotator pool. Any of these breaks correlations that are specific to your collection process rather than to the task, and it is the closest proxy to deployment. HOW I WOULD REPORT IT. Never a single number. A table: in-distribution accuracy, ablation baselines, per-heuristic challenge-set accuracy, contrast-set consistency (the fraction of contrast groups where EVERY member is correct, which is far stricter and more informative than per-example accuracy), and shifted-domain accuracy. The SHAPE of that table is the result. AND THE HABIT I WOULD PUSH, which is the real answer to the question: build the challenge set BEFORE you build the model, at the same time as the training data, while you are still thinking about what the task requires rather than about what your model does. Retrofitting an evaluation to a model you have already trained means you will unconsciously build one it passes. The cost is a few days; the alternative is discovering in production that your 90% model implemented a different function than the one you specified."
        },
        {
          "q": "Is NLI still a useful task, given how thoroughly the benchmarks were shown to be flawed?",
          "a": "YES, BUT ITS ROLE CHANGED - from a general test of understanding into a useful COMPONENT. Both halves of that are worth defending. WHAT IT FAILED AT. NLI was proposed as a general benchmark for language understanding, on the reasoning that most comprehension can be reframed as inference. That framing did not survive contact with the data. The artifact and HANS results showed that high accuracy was substantially achievable by exploiting elicitation habits and lexical overlap, so the benchmark did not measure what it claimed. Then LLMs arrived and made the benchmark question moot in a different way: MNLI is close to saturated, and nobody now argues that beating it demonstrates understanding. As a general benchmark, NLI is finished. WHERE IT REMAINS GENUINELY USEFUL, which is a longer list than the critique suggests. (1) FACTUAL CONSISTENCY CHECKING is the strongest case. 'Is this generated claim supported by this source?' is exactly entailment, and NLI models are the standard tool for grounding checks in summarization and RAG (SummaC, FactCC, and the AlignScore family). This has become MORE important as generation has become ubiquitous, not less. (2) ZERO-SHOT CLASSIFICATION via the entailment reframing remains a practical, cheap, on-premises-deployable technique, and it gives per-label scores rather than a generated token. (3) INTERMEDIATE-TASK TRANSFER: MNLI checkpoints remain among the best starting points for small sentence-pair tasks, both for accuracy and for stability, and this is free to use. (4) As a COMPONENT in fact-verification and claim-checking pipelines (FEVER-style). (5) As a diagnostic FORMAT: NLI-shaped probes are a convenient way to test whether a model handles negation, quantifiers, monotonicity, or specific inference patterns - even when the datasets are flawed, controlled NLI-shaped probes are informative. WHAT THE EPISODE TAUGHT THE FIELD, which is arguably its most valuable output. The artifact and HANS papers changed evaluation practice broadly: ablation baselines, adversarial and contrast sets, and challenge-set reporting all became standard partly because of this line of work. Dynabench and ANLI came directly out of it. So the benchmark's failure was scientifically productive in a way its success would not have been - and that is worth saying, because 'this benchmark was flawed' is often treated as a verdict on the researchers rather than as a finding. THE HONEST CURRENT STATE. NLI models remain useful tools with known and specific weaknesses: poor handling of numbers, negation, and quantifiers; degraded performance on long premises (hence the sentence-level max-aggregation workaround); poor calibration outside crowdsourced-text domains; and no vocabulary for partial support. Anyone deploying one as a groundedness checker should measure those weaknesses on their own data rather than inherit benchmark numbers. THE POSITION I WOULD ARGUE. Stop treating NLI as a measure of understanding, keep it as a well-understood component. And carry the general lesson, which is the part that transfers: a benchmark measures what is predictable in its data, not what its designers intended, and the only way to know the difference is to actively try to break it. That lesson cost the field several years of NLI results and is worth considerably more than the benchmark ever was."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Natural language inference",
        "back": "Given a premise and hypothesis, classify the relation: entailment, contradiction, or neutral. Encoded as [CLS] P [SEP] H [SEP] through a CROSS-encoder - a bi-encoder loses the token alignment the task depends on."
      },
      {
        "type": "pitfall",
        "front": "The hypothesis-only baseline",
        "back": "Delete the premise entirely and train on the hypothesis alone: ~67% on SNLI vs 34% chance. Two-thirds of a relational task solvable from one side. Run an input-ablation baseline on EVERY structured-input dataset."
      },
      {
        "type": "intuition",
        "front": "Where NLI artifacts come from",
        "back": "The elicitation protocol. Writing a contradiction invites negation ('nobody', 'never'); writing an entailment invites generalizing (hypernyms, and SHORTER hypotheses); writing a neutral invites added unverifiable detail. The label leaks into the surface form."
      },
      {
        "type": "pitfall",
        "front": "HANS",
        "back": "Models at ~90% MNLI score ~96% on HANS's entailed cases and ~5% on the NON-entailed ones. They learned 'lexical overlap implies entailment', which averages fine on any i.i.d. test set where overlap correlates with entailment."
      },
      {
        "type": "intuition",
        "front": "Why i.i.d. test accuracy cannot find shortcuts",
        "back": "By construction: the shortcut works on the test set for the same reason it works on training. Detection requires data built so the shortcut and the true task DISAGREE - challenge sets, contrast sets, ablations."
      },
      {
        "type": "definition",
        "front": "NLI as zero-shot classification",
        "back": "Text = premise, 'This example is {label}.' = hypothesis, entailment probability = class score. Uses the label's SEMANTICS, so it generalizes to unseen label sets. One forward pass per label, and severe prompt/label-wording sensitivity."
      },
      {
        "type": "definition",
        "front": "NLI for hallucination detection",
        "back": "Decompose the generation into atomic claims, score each against each CONTEXT SENTENCE, take the max (SummaC). Sentence-level granularity is the key detail - document-level NLI degrades badly on long premises."
      },
      {
        "type": "pitfall",
        "front": "'Not entailed' is not 'false'",
        "back": "A claim can be true but unsupported by the retrieved context. Whether that counts as a hallucination is a product decision. NLI models also handle NUMBERS, negation, and quantifiers poorly - exactly where hallucinations hurt most."
      },
      {
        "type": "pitfall",
        "front": "Neutral is a residual class",
        "back": "Everything that is neither entailed nor contradicted, so it absorbs ambiguity, missing world knowledge, and annotator disagreement. Consistently the lowest-accuracy class, with the least interpretable errors."
      },
      {
        "type": "intuition",
        "front": "ChaosNLI and real disagreement",
        "back": "~100 annotations per item show much NLI disagreement is STABLE and legitimate, not noise. Majority labels discard it, make the human ceiling incoherent, and penalize a model for being uncertain where humans are. Train and evaluate on the DISTRIBUTION."
      },
      {
        "type": "definition",
        "front": "Product-of-experts debiasing",
        "back": "Train a deliberately biased model (hypothesis-only), then train the main model on log p_main + log p_bias so examples the bias already explains contribute little gradient. Requires KNOWING the shortcut in advance - the binding limitation."
      },
      {
        "type": "intuition",
        "front": "The debiasing trade-off",
        "back": "Debiasing reliably improves OOD/adversarial performance and reliably costs 1-3 points in-distribution. That is not a bug: some of the ID accuracy genuinely came from the shortcut, which is genuinely predictive ID."
      }
    ],
    "refs": [
      {
        "title": "Gururangan et al. (2018), Annotation Artifacts in Natural Language Inference Data",
        "url": "https://arxiv.org/abs/1803.02324"
      },
      {
        "title": "McCoy et al. (2019), Right for the Wrong Reasons: Diagnosing Syntactic Heuristics in NLI (HANS)",
        "url": "https://arxiv.org/abs/1902.01007"
      },
      {
        "title": "Nie et al. (2020), What Can We Learn from Collective Human Opinions on Natural Language Inference Data? (ChaosNLI)",
        "url": "https://arxiv.org/abs/2010.03532"
      },
      {
        "title": "Laban et al. (2022), SummaC: Re-Visiting NLI-based Models for Inconsistency Detection in Summarization",
        "url": "https://arxiv.org/abs/2111.09525"
      },
      {
        "title": "Nie et al. (2020), Adversarial NLI: A New Benchmark for Natural Language Understanding",
        "url": "https://arxiv.org/abs/1910.14599"
      }
    ],
    "demos": [
      "classification-metrics",
      "probing-classifier",
      "calibration",
      "embeddings"
    ]
  }
};
