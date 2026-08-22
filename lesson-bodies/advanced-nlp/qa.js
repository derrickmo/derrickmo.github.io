// GENERATED from content/lessons/advanced-nlp/qa.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/qa/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "qa": {
    "level": "core",
    "body": {
      "intuition": [
        "Question answering splits into three settings that share a name and little else. EXTRACTIVE QA gives you a passage and asks you to point at the span that answers the question - the model predicts a start position and an end position, and the answer is guaranteed to be text that exists. OPEN-DOMAIN QA gives you only the question and a corpus, so you must retrieve before you can read. GENERATIVE QA lets the model compose an answer in its own words, which is what every LLM assistant does and what makes grounding hard.",
        "SQuAD made extractive QA the standard task and produced the field's most quoted milestone: models surpassed the human score of 91.2 F1 within two years. Then Jia and Liang ran a test that should be famous: append to each passage ONE distracting sentence, grammatical and topically similar, that shares words with the question but does not answer it. Across sixteen published systems, average F1 fell from 75 to 36. Adding a sentence that a human reader ignores without effort cut performance by more than half.",
        "That result and the SQuAD 2.0 result point the same way. SQuAD 2.0 added 50,000 questions that LOOK answerable from the passage but are not, and required models to abstain; performance collapsed again, because the models had never needed to ask whether an answer was present - only which span was most question-like. What both findings expose is that 'superhuman on SQuAD' meant superhuman at a specific and rather narrow game: given that exactly one span in this paragraph answers this question, find it. Knowing when there is no answer, and not being distracted by text that merely resembles the question, were not part of that game. Everything practical about QA - retrieval, abstention, grounding, citation - lives in the part the benchmark left out."
      ],
      "math": [
        {
          "h": "Extractive QA: two independent position distributions",
          "paras": [
            "The model emits a start logit and an end logit at every token, softmaxed over the passage. The answer is the span maximizing the product, subject to validity constraints. That the two distributions are independent is the source of most decoding subtleties."
          ],
          "tex": "p_s(i) = \\mathrm{softmax}_i(w_s^\\top h_i), \\quad p_e(j) = \\mathrm{softmax}_j(w_e^\\top h_j), \\quad (\\hat{i},\\hat{j}) = \\arg\\max_{i \\le j,\\; j-i < L} p_s(i)\\,p_e(j)",
          "texNote": "The constraints i <= j and a maximum answer length L are not learned - they are imposed at decode time. Without them the argmax can put the end before the start, which is a nonsensical output the loss never penalized."
        },
        {
          "h": "Abstention: scoring the null answer",
          "paras": [
            "SQuAD 2.0 requires deciding whether the passage answers the question at all. The standard mechanism compares the best span's score against the score of pointing at [CLS], with a threshold tuned on development data."
          ],
          "tex": "s_{\\text{null}} = p_s(\\texttt{[CLS]}) \\cdot p_e(\\texttt{[CLS]}), \\qquad \\text{abstain if } \\; \\max_{i \\le j} p_s(i)p_e(j) - s_{\\text{null}} < \\tau",
          "texNote": "tau is chosen to trade precision against coverage and must be re-tuned per domain - it is an operating point, not a property of the model. Reporting a single F1 without stating tau hides the choice."
        },
        {
          "h": "Retriever-reader: where the errors actually come from",
          "paras": [
            "Open-domain QA factorizes into retrieval and reading, and the end-to-end accuracy is bounded by retrieval recall. This decomposition tells you where to spend effort - and it is usually not on the reader."
          ],
          "tex": "\\mathrm{Acc}_{\\text{e2e}} \\le \\mathrm{Recall}@k \\;\\times\\; \\mathrm{Acc}_{\\text{reader}\\mid\\text{gold in }k}",
          "texNote": "With Recall@20 = 0.80 and a reader at 0.75 given the right passage, the ceiling is 0.60. Improving the reader to 0.85 buys 8 points; improving retrieval to 0.92 buys 9 - and retrieval is usually the cheaper fix. Always measure the two separately."
        }
      ],
      "code": [
        {
          "h": "Span decoding, with the constraints that are not in the loss",
          "paras": [
            "The training objective is two independent cross-entropies over positions. Everything that makes the output well-formed happens at decode time, and omitting it produces answers that span the question, run backwards, or cover half the document."
          ],
          "code": "import numpy as np\n\ndef decode_span(start_logits, end_logits, offsets, ctx_mask,\n                n_best=20, max_len=30):\n    \"\"\"offsets: char span per token; ctx_mask: True for passage tokens only.\"\"\"\n    starts = np.argsort(start_logits)[-n_best:][::-1]\n    ends   = np.argsort(end_logits)[-n_best:][::-1]\n\n    best = (-1e9, None)\n    for i in starts:\n        for j in ends:\n            if j < i:                    continue   # end before start\n            if j - i + 1 > max_len:      continue   # runaway span\n            if not (ctx_mask[i] and ctx_mask[j]):  continue   # inside the QUESTION\n            score = start_logits[i] + end_logits[j]\n            if score > best[0]:\n                best = (score, (offsets[i][0], offsets[j][1]))\n\n    null = start_logits[0] + end_logits[0]          # [CLS] = \"no answer here\"\n    return best, null\n\n# The abstention decision, per SQuAD 2.0:\nspan_score, null_score = decode_span(...)\nanswer = context[slice(*span_score[1])] if span_score[0] - null_score > TAU else \"\"\n\n# TAU is tuned on dev data and is an OPERATING POINT, not a model property.\n# Raising it: fewer wrong answers, more refusals. Lowering it: the reverse.\n# For a customer-facing assistant, wrong answers usually cost far more than\n# \"I don't know\", so TAU belongs high - and it must be re-tuned per domain.",
          "caption": "Every constraint here - monotonic span, length cap, passage-only positions - is imposed at decode time, because the two independent position softmaxes cannot express them. This is the same lesson as constrained decoding in NER."
        },
        {
          "h": "The adversarial test that reframed the field",
          "paras": [
            "Jia and Liang's AddSent construction is simple enough to reimplement in an afternoon, and running it on your own QA system is the most informative hour you will spend on it."
          ],
          "code": "# ORIGINAL passage:\n#   \"Peyton Manning became the oldest quarterback to play in a Super Bowl\n#    at age 39. The previous record was held by John Elway, who led the\n#    Broncos to victory in Super Bowl XXXIII at age 38.\"\n#   Q: \"What is the name of the quarterback who was 38 in Super Bowl XXXIII?\"\n#   A: \"John Elway\"   (correct)\n#\n# ADD ONE SENTENCE at the end - grammatical, topical, shares words with the\n# question, and answers nothing:\n#   \"Quarterback Jeff Dean had jersey number 37 in Champ Bowl XXXIV.\"\n#\n#   -> model now answers \"Jeff Dean\"\n#\n# Across 16 published systems (Jia & Liang, 2017):\n#     average F1 on the original SQuAD dev ......... 75.4\n#     average F1 with ONE distractor appended ...... 36.4\n#\n# Note what the distractor does NOT do: it does not contradict the passage,\n# does not remove the correct answer, and would not confuse a human reader.\n# It merely places high question-word overlap near a plausible answer type.\n# The models were ranking spans by question similarity, and the benchmark\n# never had to distinguish that from comprehension because in natural SQuAD\n# passages the two coincide.\n#\n# Run this on your own system. Appending one topical distractor to your\n# evaluation passages takes an afternoon and tells you more about robustness\n# than any leaderboard number.",
          "caption": "One appended sentence halves F1 across sixteen systems. The failure is not noise-sensitivity - it is that lexical similarity to the question was doing the work that comprehension was assumed to be doing."
        }
      ],
      "useCases": [
        "Grounded assistants over private corpora - documentation, policies, contracts, tickets - where the retriever-reader or RAG pattern answers from your own text and can cite the source span, which is what makes the answer checkable.",
        "Structured extraction reframed as QA: instead of training a tagger per field, ask 'what is the invoice total?' and 'who is the counterparty?' over the document. This transfers well few-shot because the question carries the field's semantics, and it handles new fields without new training data.",
        "Search result enrichment: extracting a direct answer span from a top document to display above the results, where the extractive formulation's grounding guarantee matters more than fluency.",
        "Evaluation and verification tooling - question-generation-based factual consistency checks (QAGS, FEQA) generate questions from a summary, answer them against the source, and compare, which is a QA system used as a metric."
      ],
      "pitfalls": [
        "Believing 'superhuman on SQuAD'. Appending ONE topical distractor sentence dropped sixteen published systems from 75 to 36 F1, and SQuAD 2.0's unanswerable questions caused another collapse. The benchmark measured 'find the most question-like span given that one exists', which is a narrower skill than it appeared.",
        "Training without unanswerable examples and then deploying. A model that has only ever seen answerable questions will always produce an answer, confidently, including for questions the document does not address - which is the dominant failure mode in production.",
        "Reporting exact match as the headline metric for generative answers. EM demands character-identical output, so 'John Elway' versus 'Elway' versus 'John Elway, the quarterback' scores 1, 0, 0 - fine for benchmarking a span extractor, actively misleading for anything that composes an answer.",
        "Optimizing the reader when retrieval is the bottleneck. End-to-end accuracy is capped by Recall@k; measure the two components separately before choosing where to spend, because it is usually retrieval and usually cheaper.",
        "Skipping the stride when a document exceeds the context window. The answer span can straddle a chunk boundary and become unreachable, and no error is raised. Overlap the windows and reconcile scores across them.",
        "Trusting a generative model to stay grounded without verification. Extractive QA cannot return text that is not in the passage; generative QA can, and will - paraphrasing a number, merging two facts, or answering from parametric memory when the context does not support it.",
        "Assuming the position of the answer does not matter. Long-context readers show a documented U-shaped accuracy curve over the position of the relevant passage - information in the middle of a long context is used substantially less reliably than information at either end."
      ],
      "connections": [
        {
          "ref": "rag-agents/rag-pipeline",
          "text": "Open-domain QA IS retrieval-augmented generation with a longer history - the retriever-reader decomposition and its recall ceiling are the same analysis."
        },
        {
          "ref": "advanced-nlp/ner",
          "text": "Span extraction with decode-time constraints is structurally the same problem as BIO decoding: the loss does not enforce well-formedness, so the decoder must."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "Entailment between the answer and its supporting passage is the standard automatic groundedness check, and both tasks were undone by the same class of adversarial probe."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "Exact match and token-F1 are surface-overlap proxies with the same failure mode as BLEU - they reward matching the reference's form rather than its content."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "The lost-in-the-middle position effect determines how much of a long retrieved context is actually usable, which changes how you order and how much you retrieve."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three QA settings?",
          "a": "EXTRACTIVE (find a span in a given passage), OPEN-DOMAIN (retrieve then read from a corpus), and GENERATIVE (compose an answer in the model's own words). They share a name and little else."
        },
        {
          "q": "How does extractive QA work mechanically?",
          "a": "Two linear heads over the encoder output produce start and end logits at every token, softmaxed over positions. The answer is the highest-scoring valid span."
        },
        {
          "q": "What constraints must the decoder impose?",
          "a": "End at or after start, a maximum answer length, and both endpoints inside the passage rather than the question. None of these is in the loss, so all must be applied at decode time."
        },
        {
          "q": "What did SQuAD 2.0 add?",
          "a": "50,000 questions that look answerable from the passage but are not, requiring the model to abstain. Performance dropped sharply because models had never needed to ask whether an answer existed."
        },
        {
          "q": "How does a model abstain?",
          "a": "Score the null answer by pointing start and end at [CLS], and abstain when the best span's score minus the null score falls below a threshold tuned on dev data."
        },
        {
          "q": "What was the AddSent result?",
          "a": "Appending ONE grammatical, topical distractor sentence that shares words with the question dropped sixteen systems from an average 75 F1 to 36 - a human reader ignores it effortlessly."
        },
        {
          "q": "What does that failure reveal?",
          "a": "The models were ranking spans by lexical similarity to the question. In natural SQuAD passages that coincides with comprehension, so the benchmark could not distinguish the two."
        },
        {
          "q": "What is the retriever-reader decomposition?",
          "a": "Retrieve k candidate passages, then read them for the answer. End-to-end accuracy is bounded by Recall@k times reader accuracy given the gold passage - measure both separately."
        },
        {
          "q": "What is DPR?",
          "a": "Dense Passage Retrieval: a dual encoder trained contrastively so question and passage embeddings align. It beat BM25 substantially on open-domain QA and started the dense-retrieval era."
        },
        {
          "q": "What is Fusion-in-Decoder?",
          "a": "Encode each retrieved passage independently, then let the decoder cross-attend over the concatenation of all of them. Scales to many passages because the expensive encoding stays per-passage."
        },
        {
          "q": "Why is exact match a poor metric for generative QA?",
          "a": "It requires character-identical output, so a correct answer phrased differently scores zero. Adequate for span extraction against a fixed reference; misleading for anything that composes."
        },
        {
          "q": "What is 'lost in the middle'?",
          "a": "Long-context models show a U-shaped accuracy curve over the position of the relevant passage - evidence at the start or end is used far more reliably than evidence in the middle."
        }
      ],
      "standard": [
        {
          "q": "Design a question-answering system over 500,000 internal documents.",
          "a": "THE ARCHITECTURE IS RETRIEVE-THEN-READ, and I would spend most of the design effort on retrieval and on the abstention behaviour, because that is where the failures come from. STAGE 1 - INGESTION AND CHUNKING, which is more consequential than it looks. Chunk documents into passages of roughly 200-500 tokens with meaningful OVERLAP, and prefer boundaries that respect structure - sections, paragraphs, table rows - over fixed token counts, because a chunk that splits a sentence from its subject is unanswerable no matter how good the reader is. Carry metadata on every chunk: source document, section heading, date, author, access-control identifiers. The heading in particular should be PREPENDED to the chunk text, because a chunk reading 'The limit is 30 days' is meaningless in isolation and retrievable when it begins 'Refund Policy > Timeframes: The limit is 30 days'. STAGE 2 - HYBRID RETRIEVAL, and I would not choose between dense and lexical. BM25 handles exact terms, product names, error codes, and identifiers that embeddings blur together; dense retrieval handles paraphrase and synonymy. Combine with reciprocal rank fusion, which needs no score calibration between the two. Retrieve generously - 50 to 100 candidates. STAGE 3 - RERANKING. A cross-encoder reranker over the top ~50, cut to the top 5-10 for the reader. This is consistently the highest-return single component in a RAG system, because a bi-encoder compresses each passage into one vector before it has seen the question, while a cross-encoder scores the pair jointly. Reranking is where most of the precision comes from. STAGE 4 - READING AND ANSWERING. For a modern system this is an LLM prompted with the top passages and instructed to answer only from them and to cite chunk identifiers. Two non-negotiable properties: it must ABSTAIN when the passages do not contain the answer, and it must CITE, because citation is what makes the answer verifiable by the user. On ordering, place the strongest passages at the beginning and end of the context rather than the middle, given the documented position effect. STAGE 5 - VERIFICATION, before the answer is shown. Run an entailment check between each generated sentence and the cited passages, and either flag or suppress unsupported claims. This is cheap relative to generation and catches the failure mode users punish hardest. THE THINGS THAT ACTUALLY DECIDE WHETHER THIS WORKS, which are not in the diagram. (1) ACCESS CONTROL must be enforced at RETRIEVAL, by filtering the index on the user's permissions before scoring - never by filtering the answer afterwards, which leaks through the answer text itself. This is the most common serious security bug in enterprise RAG. (2) FRESHNESS AND CONFLICT: 500,000 internal documents will contain superseded policies, drafts, and contradictions. Metadata filtering by date and status, and preferring current documents in ranking, matters more than model quality. When sources genuinely conflict, surfacing both is better than silently picking one. (3) ABSTENTION IS THE PRODUCT REQUIREMENT. In an internal knowledge setting a confident wrong answer is worse than 'I could not find this', because it will be acted on. Tune the operating point accordingly and measure the refusal rate as a first-class metric. EVALUATION, which I would build before the system. A set of a few hundred real questions with human-verified answers and the passages that support them, then measure separately: Recall@k for retrieval, answer accuracy GIVEN correct retrieval, groundedness (is every claim supported), and abstention behaviour on questions the corpus genuinely cannot answer - which must be part of the set, or you have no measurement of the most important behaviour. Log every production query with its retrieved passages and let users flag bad answers; that stream becomes both your evaluation set and your reranker training data. WHAT I WOULD NOT DO: fine-tune a reader before exhausting retrieval quality, and use a single similarity threshold as the abstention mechanism, since retrieval scores are not comparable across queries.",
          "deepDive": {
            "q": "When does fine-tuning beat retrieval, and when should you use both?",
            "a": "THE TWO WAYS TO GET KNOWLEDGE INTO A MODEL'S ANSWER: put it in the WEIGHTS (fine-tuning, continued pretraining) or put it in the CONTEXT (retrieval). They fail differently and the choice is not primarily about accuracy. WHAT RETRIEVAL IS FOR. Facts that CHANGE - prices, policies, inventory, personnel, current events - because updating an index is instant and retraining is not. Facts that must be ATTRIBUTED, since retrieval gives you a source to cite and weights do not. Large, sparse knowledge where any given fact is rarely needed, because there is no reason to pay for it in parameters. Access-controlled knowledge, since retrieval can filter per user and weights cannot - a model fine-tuned on documents some users may not see has no mechanism to unlearn them per request. And any setting where you must be able to REMOVE a fact, for legal or privacy reasons. WHAT FINE-TUNING IS FOR. FORMAT, STYLE, AND BEHAVIOUR - how to structure an answer, what tone to use, which conventions to follow, when to refuse. Retrieval cannot teach this and prompting teaches it expensively and inconsistently. DOMAIN LANGUAGE - terminology, abbreviations, and phrasing patterns that the base model handles poorly, where the problem is comprehension of the input rather than access to facts. SKILLS AND TASK SHAPE - a specialized reasoning pattern, a fixed output schema, a multi-step procedure. And LATENCY-OR-COST-CRITICAL deployments where you cannot afford long contexts or a retrieval hop. STABLE, DENSE knowledge that is needed on nearly every query is also reasonable to bake in. WHERE THE COMPARISON IS OFTEN MISSTATED: people fine-tune to inject facts, and it works poorly. Facts learned by fine-tuning are diffuse, hard to update, prone to interference with existing knowledge, and impossible to attribute - and the model will still confidently produce a plausible variant when uncertain, because nothing in the training signal distinguished 'I know this' from 'this is the kind of thing I would say'. The empirical finding that RAG generally beats fine-tuning for knowledge injection is consistent and worth quoting. THE COMBINATION, which is what mature systems do. Fine-tune the model to be a GOOD READER - to use retrieved context faithfully, to cite, to abstain when the context is insufficient, and to produce your output format - then retrieve the facts at query time. This is exactly what RA-DIT and similar recipes do, and it addresses the most common RAG failure: a general model given retrieved passages does not reliably prefer them over its parametric priors, will answer from memory when the context is inconvenient, and abstains too rarely. Fine-tuning on examples where the correct behaviour is 'the context does not say' is the direct fix, and it is a behaviour, not a fact, so it is the right thing to put in weights. THE DECISION PROCEDURE I would state. Does the knowledge change? Retrieve. Must the answer be attributable? Retrieve. Is it access-controlled? Retrieve, always. Is the problem HOW the model answers rather than WHAT it knows? Fine-tune. Is the model failing to understand the domain's language? Fine-tune, or continue pretraining. Is the model failing to USE what it retrieves? Fine-tune for that specific behaviour, which is the case people most often miss. AND THE COST ASYMMETRY that usually settles it in practice: retrieval costs inference tokens and an index; fine-tuning costs a training run plus a model artifact to version, evaluate, and re-do every time the base model or the knowledge changes. For most teams retrieval is both cheaper and more maintainable, and the right question is what MINIMUM amount of fine-tuning makes retrieval work well."
          }
        },
        {
          "q": "Explain the Jia & Liang adversarial SQuAD result and what it means for evaluation.",
          "a": "THE EXPERIMENT. Take SQuAD dev passages and append ONE sentence at the end. The sentence is grammatical, topically plausible, shares many words with the question, and contains a plausible-looking answer of the right type - but it answers nothing and contradicts nothing. The correct answer remains in the passage, unmodified. A human reads past it without noticing. THE RESULT. Across sixteen published systems, average F1 on the modified set fell from 75.4 to 36.4. Not a few points - more than half. And it was not model-specific: every system tested failed, including the architecturally diverse ones, which rules out an idiosyncratic bug and points at something the whole training setup shared. WHAT THE MODELS WERE ACTUALLY DOING. Ranking candidate spans by lexical and semantic similarity to the question, then filtering by answer type. In natural SQuAD passages, that heuristic and genuine comprehension AGREE almost all the time - the sentence containing the answer is usually the sentence most similar to the question, because the question was written by looking at that sentence. So the benchmark could not distinguish the heuristic from comprehension, and gradient descent found the cheaper one. The adversarial sentence is constructed precisely to break the coincidence: maximum question overlap, zero answer content. WHY IT IS A DEEP RESULT AND NOT A CURIOSITY. (1) It came at the moment models were declared 'superhuman' on SQuAD, and it showed the claim was about a narrow game: given that exactly one span in this paragraph answers this question, find it. (2) The perturbation is not noise - it is a fluent sentence a human ignores - so this is not an argument about adversarial examples being unrealistic. Real documents contain topically similar irrelevant text constantly. (3) The failure is CONCENTRATED: models were not uniformly degraded, they were specifically fooled toward the distractor, which tells you what feature they were using. (4) The construction requires no gradient access, which is what makes it reproducible on any system. WHAT IT MEANS FOR EVALUATION, generalized. (a) I.I.D. TEST ACCURACY CANNOT DETECT A SHORTCUT, because the shortcut works on the test set for exactly the reason it works on training. This is a structural limitation, not a sampling problem, and no amount of held-out data fixes it. (b) THE DATA COLLECTION PROCESS CREATES THE COINCIDENCE. SQuAD's annotators wrote questions while looking at the answer sentence, which guaranteed high lexical overlap between question and answer sentence. The shortcut was manufactured by the protocol. Any elicitation protocol should be audited for what correlations it introduces. (c) CHALLENGE SETS MUST BE CONSTRUCTED, not sampled. You have to hypothesize the heuristic and build data where following it is wrong. (d) The right report is a TABLE - clean accuracy, adversarial accuracy, per-perturbation breakdown - not a number. WHAT CHANGED AFTERWARDS. Adversarial and contrast-set evaluation became standard practice; SQuAD 2.0 added unanswerable questions specifically to force the 'is there an answer' decision; adversarial data collection (ANLI, Dynabench, AdversarialQA) put models in the annotation loop; and training on adversarial examples became a routine robustness measure - though it tends to fix the specific construction rather than the underlying brittleness, which is an honest limitation. WHAT I WOULD DO WITH IT PRACTICALLY: reimplement AddSent for my own QA system. Append one topical distractor to each evaluation passage and measure the drop. It takes an afternoon, requires no special tooling, and tells you more about deployment robustness than any leaderboard position."
        },
        {
          "q": "How do you make a QA system say 'I don't know'?",
          "a": "ABSTENTION IS A DESIGN REQUIREMENT, not an emergent property, and it has to be built into the data, the model, the decoder, and the evaluation. Handling it in only one of those places is why most systems answer everything. AT THE DATA LEVEL. Train on UNANSWERABLE EXAMPLES. This is SQuAD 2.0's central contribution and it is the single most important step: a model that has only ever seen questions with answers has never received a gradient telling it that 'no answer' is an option, so it will always produce its best guess. Crucially the negatives must be HARD - questions that look answerable from the passage, with plausible answer-type entities present. Randomly pairing questions with unrelated passages teaches only topic mismatch, which is the easy case and not the one that fails in production. AT THE MODEL LEVEL, extractive. Score the null answer by pointing start and end at [CLS], and compare the best span's score to it. This gives a single scalar difference to threshold. AT THE MODEL LEVEL, generative. Instruct explicitly and fine-tune on the behaviour: examples where the context does not support an answer and the correct output is a refusal. Prompting alone helps but is unreliable - the model's prior toward being helpful is strong, and the failure is precisely that it overrides an instruction when a plausible-looking answer is available. Making abstention a trained behaviour rather than an instructed one is the difference between a system that refuses sometimes and one that refuses when it should. AT THE DECODER AND PIPELINE LEVEL, several signals, each catching different failures. (1) The null-score margin. (2) RETRIEVAL confidence - if the top passage's reranker score is low, abstain before reading; this catches 'the corpus does not contain this' which the reader cannot detect. (3) ENTAILMENT verification - if the drafted answer is not entailed by the cited passages, suppress it. (4) SELF-CONSISTENCY - sample several answers and abstain on disagreement, which correlates well with correctness and costs several forward passes. (5) SEQUENCE PROBABILITY, which is the weakest signal and should not be used alone: models are confidently wrong routinely and token likelihood conflates fluency with correctness. CALIBRATION, which is what makes any threshold meaningful. Raw scores are not probabilities. Fit a calibration map on held-out data - temperature scaling or isotonic regression - so the threshold corresponds to an actual error rate you can reason about. And re-calibrate per domain, because the mapping does not transfer. CHOOSING THE OPERATING POINT, which is a product decision and should be stated as one. Plot the RISK-COVERAGE curve: as you raise the threshold, coverage falls and accuracy on the answered subset rises. Then ask what a wrong answer costs relative to a refusal. For a medical or legal assistant, wrong answers are far more expensive and the threshold belongs high. For a search feature where the user sees the sources anyway, low. A single F1 number hides this entirely, which is why abstention-capable systems should always be reported as a curve. EVALUATING IT, and this is the part most often skipped. Your evaluation set MUST contain questions the corpus cannot answer, in realistic proportion - otherwise you have no measurement of the behaviour you care most about, and every metric will reward answering. Report coverage, accuracy-on-answered, and the false-refusal rate separately. Watch for the degenerate solution: a model can score well on some abstention metrics by refusing almost everything, which is why coverage must be reported alongside. THE HONEST DIFFICULTY: models are bad at knowing what they do not know, because nothing in next-token prediction distinguishes 'I have seen this fact' from 'this is the shape of a plausible answer'. Retrieval helps enormously precisely because it externalizes the question - 'is the evidence present' is a far more tractable check than 'do I know this' - which is a good argument for grounded architectures independent of freshness or citation."
        },
        {
          "q": "Compare extractive and generative QA. When is each right?",
          "a": "EXTRACTIVE returns a SPAN of the source text - the output is guaranteed to be a contiguous substring of the passage. GENERATIVE composes free text conditioned on the passage. The difference in guarantee is the whole story. WHAT EXTRACTIVE BUYS. (1) GROUNDING BY CONSTRUCTION. The model literally cannot return text that is not in the source. No hallucination is possible - not 'unlikely', impossible. For high-stakes extraction this is worth a great deal and there is no generative equivalent. (2) FREE ATTRIBUTION: you have exact character offsets, so you can highlight the answer in the document, which is often more useful to the user than the answer itself. (3) CHEAP: one encoder pass, no autoregressive decoding, so latency is milliseconds and there are no output tokens to pay for. (4) CALIBRATED SPAN SCORES to threshold on. (5) DETERMINISTIC and easy to version and audit. WHAT EXTRACTIVE CANNOT DO. Answer yes/no questions, count, compare, aggregate across passages, or synthesize when the answer is distributed over several sentences. Reformat or normalize - the answer comes out exactly as written, including in the wrong tense, with the wrong determiner, or as an abbreviation. Combine information from multiple documents. And it fails entirely when the answer is not stated verbatim anywhere, which in real corpora is common. WHAT GENERATIVE BUYS. (1) ANSWERS WHERE NO SPAN EXISTS - multi-hop synthesis, arithmetic over retrieved values, comparison, summarization of several sources. (2) NATURAL, well-formed answers in the user's phrasing. (3) One interface for every question shape, including yes/no and open-ended. (4) The ability to say 'the document does not address this' in words, and to qualify an answer. (5) It can use knowledge from pretraining to interpret and connect what it retrieves. WHAT GENERATIVE COSTS. (1) HALLUCINATION IS ALWAYS POSSIBLE and the characteristic failures are subtle: a number slightly altered, two facts merged, a qualifier dropped, a plausible bridge invented between passages. These are harder to catch than obvious fabrication precisely because they are close to correct. (2) ATTRIBUTION MUST BE ENGINEERED - citations must be requested, then VERIFIED, because models cite incorrectly. (3) Expensive and slow. (4) Non-deterministic. (5) Hard to evaluate: exact match is meaningless and every automatic alternative is a proxy. HOW I CHOOSE. Use EXTRACTIVE when the answer is a specific fact that exists verbatim, when auditability is a requirement (legal, medical, financial extraction), when latency or volume is binding, or when you want to highlight rather than tell. Use GENERATIVE when questions are conversational and varied, when answers require synthesis or reasoning across sources, or when the interface is a chat assistant. THE HYBRID, which is what I would build for most real products: retrieve, then generate WITH citations, then VERIFY the generated claims against the cited passages with an entailment check, and show the source spans alongside the answer. You get generative flexibility with much of extractive's grounding discipline. A cheaper variant that is underrated: run an extractive model first, and only fall back to generation when no span scores well - the extractive path handles the common 'what is X' case at a fraction of the cost and with a hard grounding guarantee, and generation handles the rest. AND A NOTE ON EVALUATION, because the choice changes it: extractive QA can be scored with EM and token-F1 against a reference span, which is imperfect but workable. Generative QA cannot - EM punishes correct paraphrases, and you need either human evaluation, an LLM judge, or a groundedness metric. Choosing generative means committing to a harder evaluation problem, and that cost should be part of the decision rather than a surprise afterwards."
        },
        {
          "q": "Your open-domain QA system answers 60% of questions correctly. How do you improve it?",
          "a": "FIRST, DECOMPOSE - do not tune anything until you know which stage is losing. End-to-end accuracy is bounded by Recall@k times reader accuracy given the gold passage, so measure both. Take your evaluation set, and for each question determine (a) whether any retrieved passage actually contains the answer, and (b) whether the reader got it right when one did. That gives you three buckets: retrieval failures, reader failures, and questions that are unanswerable from the corpus at all. THE ARITHMETIC MAKES THE DECISION FOR YOU. Suppose Recall@20 is 0.80 and reader accuracy given gold is 0.75: the product is 0.60, which matches. Now, improving the reader from 0.75 to 0.85 buys 8 points; improving retrieval from 0.80 to 0.92 buys 9. If instead retrieval were already 0.95 and the reader 0.63, the effort clearly belongs on the reader. This five-minute analysis routinely redirects weeks of work, and skipping it is the most common failure in RAG projects. IF RETRIEVAL IS THE BOTTLENECK, in rough order of return. (1) ADD A CROSS-ENCODER RERANKER over the top 50-100 candidates. Consistently the largest single win, because bi-encoder retrieval compresses each passage to a vector before seeing the question while a cross-encoder scores the pair jointly. (2) HYBRID RETRIEVAL - combine BM25 with dense, fused by reciprocal rank. Lexical retrieval handles identifiers, codes, rare terms, and exact names that embeddings smear together; dense handles paraphrase. Their failures are close to complementary. (3) FIX THE CHUNKING, which is underrated. Are chunks too small to contain a complete answer, or too large so the relevant sentence is diluted? Do they respect document structure? Is the section heading prepended so the chunk is interpretable alone? A large share of 'retrieval failures' are chunks that could not have answered the question regardless of ranking. (4) QUERY TRANSFORMATION - rewrite conversational questions into standalone ones, decompose multi-hop questions into sub-questions, or generate a hypothetical answer and retrieve against it (HyDE). Multi-hop questions in particular are usually unanswerable by single-shot retrieval by construction. (5) FINE-TUNE THE RETRIEVER on your own domain with in-domain pairs, using hard negatives mined from the current retriever's mistakes. (6) RAISE k, then rely on the reranker to cut it back - cheap and often effective. IF THE READER IS THE BOTTLENECK. Check whether it is using the retrieved context at all, or answering from parametric memory - a diagnostic worth running explicitly is to corrupt the context and see whether the answer changes. Check POSITION effects, since evidence in the middle of a long context is used less reliably, and reorder so the strongest passages sit at the beginning and end. Check whether the failures are abstention failures - answering when it should not - versus genuine comprehension failures, because those have different fixes. Fine-tune for faithful context use and for abstention if it is a general model that has not been taught either. IF QUESTIONS ARE UNANSWERABLE FROM THE CORPUS, the fix is not a model. Either the content does not exist, in which case the system should reliably say so and someone should write the missing documentation, or it exists but was not ingested - check coverage, parsing failures, PDFs that extracted as empty, and access-control filters that are excluding more than intended. WHAT I WOULD DO FIRST, before any of it: READ FIFTY FAILURES BY HAND. Category counts from an error taxonomy - retrieval miss, reranker miss, chunk boundary, reader misread, unanswerable, ambiguous question, wrong gold label - will tell you where the mass is, and it is very often somewhere the metrics did not suggest. In my experience a meaningful fraction of 'errors' at this stage turn out to be questions with a defensible alternative answer or an incorrect reference, which changes what 60% means before you have changed anything at all."
        },
        {
          "q": "What is Fusion-in-Decoder, and why does it scale better than concatenating passages?",
          "a": "THE PROBLEM. Open-domain QA improves with more retrieved passages - the gold passage is more likely to be in the set, and multi-hop questions may need several. But the obvious approach, concatenating passages into one long input, runs straight into quadratic attention: 100 passages of 200 tokens is 20,000 tokens, and attention cost grows with the square of that. So the naive approach caps the number of passages far below what accuracy would want. FUSION-IN-DECODER (Izacard & Grave, 2021). Use an encoder-decoder. ENCODE EACH PASSAGE INDEPENDENTLY, each concatenated with the question, producing one representation set per passage. Then CONCATENATE all the encoder outputs and let the decoder CROSS-ATTEND over the whole collection while generating the answer. WHY THIS SCALES. Encoder cost is now LINEAR in the number of passages: n separate passes of length L each cost n * L^2 rather than one pass of length nL costing n^2 * L^2. With n = 100 that is a hundredfold reduction in encoder attention cost. The passages are also encoded in parallel, which suits hardware. Only the decoder's cross-attention sees everything jointly, and the decoder is short - it is generating a brief answer - so the cross-attention over nL keys is affordable. WHY IT STILL WORKS - the conceptual point. Evidence combination does not need to happen in the encoder. Each passage is encoded in isolation, so no passage informs another's representation, and yet the DECODER can aggregate across all of them because it attends to all their tokens. Izacard & Grave showed accuracy keeps improving up to 100 passages, and that FiD genuinely FUSES evidence rather than just picking the best passage - it answers questions requiring information from several. That is the surprising part: independent encoding loses less than intuition suggests, because the aggregation the task needs is exactly what cross-attention does. THE TRADE-OFFS. (1) Cross-attention over all passages is still the dominant inference cost, and it grows linearly with n, so there is a real ceiling - FiD-KD and later work attack this by distilling attention scores to prune passages. (2) It requires an encoder-decoder architecture, so it does not transfer directly to decoder-only models, which is a substantial part of why it is less discussed now than its results merit. (3) Passages cannot condition on each other during encoding, so genuine multi-hop reasoning that requires reading passage B in light of passage A is limited - the decoder must do that work. (4) The encoder representations for all n passages must be held in memory simultaneously. HOW THIS RELATES TO WHAT PEOPLE DO NOW. Modern RAG with a long-context decoder-only LLM is the concatenation approach, made viable by cheaper attention (FlashAttention, sparse and linear variants) and much longer context windows rather than by a smarter factorization. It is simpler and it works, but it pays the quadratic cost and it exhibits the lost-in-the-middle position effect that FiD's symmetric cross-attention does not, since FiD has no notion of a passage being 'in the middle'. THE IDEA WORTH CARRYING, beyond the specific model: SEPARATE THE ENCODING OF INDEPENDENT ITEMS FROM THEIR COMBINATION. Encode each unit once, in isolation, and fuse at the point where fusion is actually needed. That pattern appears in FiD, in late-interaction retrieval (ColBERT), in cross-encoder reranking pipelines, and in memory-augmented architectures generally. When you see a system concatenating many independent items into one sequence, it is usually worth asking whether the combination could happen later and more cheaply."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Extractive QA",
        "back": "Two heads produce start and end logits per token; the answer is the highest-scoring valid span. Grounding is guaranteed by construction - the model cannot return text absent from the passage."
      },
      {
        "type": "pitfall",
        "front": "Span constraints are not in the loss",
        "back": "Two independent position softmaxes can put the end before the start, span the question, or cover half the document. Enforce end >= start, a max length, and passage-only endpoints at DECODE time."
      },
      {
        "type": "pitfall",
        "front": "The AddSent result",
        "back": "Append ONE grammatical, topical distractor sentence sharing words with the question: 16 systems dropped from 75.4 to 36.4 average F1. They were ranking spans by question similarity, which coincides with comprehension in natural SQuAD passages."
      },
      {
        "type": "definition",
        "front": "SQuAD 2.0",
        "back": "Adds 50k questions that look answerable but are not, requiring abstention. Models had only ever been asked WHICH span, never WHETHER one exists - so performance collapsed."
      },
      {
        "type": "definition",
        "front": "Null-answer abstention",
        "back": "Score the null by pointing start and end at [CLS]; abstain when (best span score - null score) < tau. Tau is an OPERATING POINT tuned per domain, not a model property - report the risk-coverage curve, not one F1."
      },
      {
        "type": "intuition",
        "front": "The retriever-reader ceiling",
        "back": "Acc_e2e <= Recall@k x Acc_reader-given-gold. With 0.80 x 0.75 = 0.60, improving retrieval to 0.92 buys as much as improving the reader to 0.85. Measure both before choosing where to work."
      },
      {
        "type": "definition",
        "front": "Fusion-in-Decoder",
        "back": "Encode each retrieved passage INDEPENDENTLY (linear cost in n), then let the decoder cross-attend over all encoder outputs at once. Scales to ~100 passages and genuinely fuses evidence - aggregation happens in cross-attention, not in the encoder."
      },
      {
        "type": "pitfall",
        "front": "Exact match for generative answers",
        "back": "EM needs character-identical output: 'John Elway' / 'Elway' / 'John Elway, the quarterback' score 1 / 0 / 0. Fine for benchmarking a span extractor, misleading for anything that composes an answer."
      },
      {
        "type": "intuition",
        "front": "Lost in the middle",
        "back": "Long-context readers show a U-shaped accuracy curve over the position of the relevant passage - evidence at either end is used far more reliably than evidence in the middle. Put your strongest passages first and last."
      },
      {
        "type": "pitfall",
        "front": "Access control belongs in RETRIEVAL",
        "back": "Filter the index by the user's permissions BEFORE scoring. Filtering the answer afterwards leaks through the answer text itself - the most common serious security bug in enterprise RAG."
      },
      {
        "type": "intuition",
        "front": "Hard negatives for abstention training",
        "back": "Unanswerable training examples must LOOK answerable - same topic, plausible answer-type entities present. Randomly pairing questions with unrelated passages only teaches topic mismatch, which is not the production failure."
      },
      {
        "type": "intuition",
        "front": "Retrieval vs fine-tuning for knowledge",
        "back": "Retrieve what CHANGES, what must be ATTRIBUTED, and what is ACCESS-CONTROLLED. Fine-tune the BEHAVIOUR - format, domain language, faithful context use, and abstention. The common mistake is fine-tuning to inject facts."
      }
    ],
    "refs": [
      {
        "title": "Rajpurkar et al. (2018), Know What You Don't Know: Unanswerable Questions for SQuAD",
        "url": "https://arxiv.org/abs/1806.03822"
      },
      {
        "title": "Jia & Liang (2017), Adversarial Examples for Evaluating Reading Comprehension Systems",
        "url": "https://arxiv.org/abs/1707.07328"
      },
      {
        "title": "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering",
        "url": "https://arxiv.org/abs/2004.04906"
      },
      {
        "title": "Izacard & Grave (2021), Leveraging Passage Retrieval with Generative Models (Fusion-in-Decoder)",
        "url": "https://arxiv.org/abs/2007.01282"
      },
      {
        "title": "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      }
    ],
    "demos": [
      "vector-search",
      "rag-chunking",
      "rag-reranker",
      "lost-in-the-middle"
    ]
  }
};
