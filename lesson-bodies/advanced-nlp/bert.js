// GENERATED from content/lessons/advanced-nlp/bert.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/bert/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "bert": {
    "level": "core",
    "body": {
      "intuition": [
        "A left-to-right language model reading 'the bank was steep and muddy' has already committed to a representation of 'bank' before it sees 'steep'. That is fine if your goal is to GENERATE the next word - you never have the future - but it is a needless handicap if your goal is to UNDERSTAND a sentence you already have in full. BERT's premise (Devlin et al., 2018) is that for classification, tagging, and extraction, you should let every token see every other token in both directions, and the way to train that is to hide some of the input and predict it from the rest.",
        "That is MASKED LANGUAGE MODELLING: corrupt 15% of the tokens and train the model to recover them from the surrounding context on both sides. The prediction task is only a scaffold - once pretraining is over the MLM head is thrown away and what you keep is the encoder, which now produces a contextual vector for every token. 'Bank' in a river sentence and 'bank' in a finance sentence get different vectors, which is the property word2vec could not have and the thing that made BERT immediately better on eleven benchmark tasks.",
        "The details that look arbitrary in the paper turn out to matter, and two of them are worth carrying: the 80/10/10 CORRUPTION SPLIT (of the 15% chosen, 80% become [MASK], 10% a random token, 10% are left alone) exists to reduce the mismatch between pretraining - where [MASK] is everywhere - and fine-tuning, where it never appears. And NEXT SENTENCE PREDICTION, BERT's second objective, was later shown by RoBERTa to contribute essentially NOTHING; removing it and training longer on more data improved every downstream number. That is a useful reminder that a paper's ablations are done under its own compute budget, and that BERT's headline result was partly a story about being UNDERTRAINED rather than about being architecturally right."
      ],
      "math": [
        {
          "h": "The masked language modelling objective",
          "paras": [
            "Sample a mask set M covering about 15% of positions, corrupt those tokens, and maximize the log-probability of the originals given the corrupted sequence. Unlike an autoregressive loss, the conditioning set is the whole sequence minus the masked positions - which is why the encoder can be fully bidirectional without leaking the answer."
          ],
          "tex": "\\mathcal{L}_{\\mathrm{MLM}} = -\\sum_{i \\in \\mathcal{M}} \\log p_\\theta\\big(x_i \\mid \\tilde{x}_{\\setminus \\mathcal{M}}\\big), \\qquad |\\mathcal{M}| \\approx 0.15\\,T",
          "texNote": "Only ~15% of positions produce a training signal per sequence, versus 100% for an autoregressive loss - which is precisely why MLM needs more pretraining steps per token of data to reach the same quality. The trade is signal density for bidirectionality."
        },
        {
          "h": "Why 15%, and what the ratio actually trades off",
          "paras": [
            "The mask ratio sits between two failure modes. Too low and each sequence yields almost no gradient signal, so pretraining is slow and expensive. Too high and too much context is destroyed, so the task becomes guessing rather than inference. Text is INFORMATION-DENSE - unlike images, a token is rarely recoverable by interpolating its neighbours - so the usable ratio is far lower than the 75% that works for masked image modelling."
          ],
          "tex": "\\text{signal per sequence} \\propto r \\qquad \\text{vs} \\qquad \\text{context retained} \\propto (1-r), \\qquad r^\\star \\approx 0.15",
          "texNote": "Later work (Wettig et al., 2023) showed 15% is not universal: larger models and larger data budgets prefer HIGHER ratios, up to 40%, because they can exploit the extra signal without being starved of context. The constant was tuned for BERT's scale, not derived."
        }
      ],
      "code": [
        {
          "h": "Building MLM training examples, including the 80/10/10 split",
          "paras": [
            "The masking is the entire data pipeline. Note the two non-obvious pieces: special tokens are never masked, and labels are set to -100 everywhere except the masked positions so the loss ignores them."
          ],
          "code": "import torch\n\ndef mask_tokens(input_ids, tokenizer, mlm_prob=0.15):\n    labels = input_ids.clone()\n\n    # choose ~15% of positions, never a special token\n    prob = torch.full(labels.shape, mlm_prob)\n    special = torch.tensor(\n        [tokenizer.get_special_tokens_mask(s, already_has_special_tokens=True)\n         for s in labels.tolist()], dtype=torch.bool)\n    prob.masked_fill_(special, 0.0)\n    selected = torch.bernoulli(prob).bool()\n\n    labels[~selected] = -100          # loss is computed ONLY on selected positions\n\n    # 80% -> [MASK]\n    to_mask = torch.bernoulli(torch.full(labels.shape, 0.8)).bool() & selected\n    input_ids[to_mask] = tokenizer.mask_token_id\n\n    # 10% -> random token  (forces the model to keep a real representation of\n    #                       EVERY token, not just the masked slots)\n    to_random = torch.bernoulli(torch.full(labels.shape, 0.5)).bool() & selected & ~to_mask\n    input_ids[to_random] = torch.randint(len(tokenizer), labels.shape, dtype=torch.long)[to_random]\n\n    # remaining 10% left unchanged - the pretrain/finetune bridge: [MASK] never\n    # appears downstream, so the model must not rely on seeing it\n    return input_ids, labels\n\nloss = F.cross_entropy(mlm_head(encoder(input_ids)).view(-1, V), labels.view(-1))\n# ignore_index=-100 is the default, so unmasked positions contribute nothing",
          "caption": "The 80/10/10 split is not cosmetic. Pure [MASK] would let the model learn 'only bother contextualizing masked slots'; the random-token and unchanged cases force a genuine representation at every position and narrow the pretrain/finetune gap."
        },
        {
          "h": "Which pooled representation you use changes the answer",
          "paras": [
            "BERT gives you a vector per token plus a [CLS] vector. Which one you use for a sentence-level task is a real decision, and the default choice is frequently the wrong one - notably for similarity, where off-the-shelf [CLS] embeddings are famously poor."
          ],
          "code": "out = bert(input_ids, attention_mask=mask).last_hidden_state   # (B, T, H)\n\ncls   = out[:, 0]                                              # [CLS] token\nmeanp = (out * mask.unsqueeze(-1)).sum(1) / mask.sum(1, keepdim=True)\n\n# For CLASSIFICATION with fine-tuning: [CLS] is fine - it is trained end to end\n# for exactly this, which is what it exists for.\n#\n# For SIMILARITY with a FROZEN model: [CLS] is bad. Raw BERT sentence vectors\n# underperform averaged GloVe on STS benchmarks, because nothing in the MLM or\n# NSP objective ever asked the space to be metrically meaningful.\n#   raw BERT [CLS] cosine      ~ 0.17-0.30 Spearman on STS-B\n#   avg GloVe                  ~ 0.58\n#   Sentence-BERT (siamese FT) ~ 0.85\n#\n# The fix is not a better pooling trick - it is TRAINING for the objective you\n# want (Sentence-BERT's siamese fine-tuning with a similarity loss).\n\nfor layer in range(13):        # and the layer matters too\n    h = bert(input_ids, output_hidden_states=True).hidden_states[layer]\n    # syntax peaks in the MIDDLE layers; the last layers specialize to the\n    # pretraining objective and are often NOT the best frozen features.",
          "caption": "Two defaults worth unlearning: [CLS] is not a general-purpose sentence embedding without training for it, and the final layer is not automatically the most useful one when you freeze the model."
        }
      ],
      "useCases": [
        "Classification and regression over text you already have in full - sentiment, topic, intent, toxicity, routing - where bidirectional context is free and generation is not needed. A fine-tuned encoder of 100-300M parameters is still the cost-effective answer here, often matching a much larger generative model at a fraction of the latency.",
        "Token-level extraction: named entity recognition, part-of-speech tagging, span extraction, and slot filling, where you need a decision per token and a bidirectional representation is the natural fit.",
        "Retrieval and semantic search via encoder embeddings - but trained for it (Sentence-BERT, E5, GTE, BGE) rather than taken raw, which is the difference between an unusable and a state-of-the-art retriever.",
        "Domain adaptation by CONTINUED pretraining: running MLM on your own unlabelled corpus (clinical notes, legal filings, code) before fine-tuning is one of the highest-return steps available when your domain is far from web text - this is the BioBERT / SciBERT / CodeBERT pattern."
      ],
      "pitfalls": [
        "Using raw BERT [CLS] vectors as sentence embeddings for similarity. Nothing in MLM or NSP trains the space to be metrically meaningful, and raw BERT scores WORSE than averaged GloVe on STS. Use a model actually trained for embedding (Sentence-BERT, E5, BGE) - this is a training-objective problem, not a pooling problem.",
        "Assuming BERT can generate text. The bidirectional objective is fundamentally incompatible with left-to-right generation; you can hack iterative unmasking out of it, but the results are poor and you should reach for a decoder instead.",
        "Copying the 15% mask ratio as if it were a law. It was tuned at BERT's scale; larger models with larger budgets do better at higher ratios (up to ~40%). Treat it as a hyperparameter with a sensible default, not a constant.",
        "Keeping next-sentence prediction. RoBERTa's ablation showed it contributes nothing and can hurt; the field dropped it. If you are reimplementing from the BERT paper, you are reimplementing a result that was superseded within a year.",
        "Truncating silently at 512 tokens. BERT's learned absolute position embeddings mean the limit is hard, not soft, and long documents get their tails cut off with no error raised. Chunk with overlap, use a long-context encoder, or select spans deliberately - but know that the default is a silent data loss.",
        "Fine-tuning on a small dataset and trusting a single run. Encoder fine-tuning is genuinely unstable at small n - across seeds the spread can exceed the difference between the methods you are comparing. Report a mean and spread over several seeds."
      ],
      "connections": [
        {
          "ref": "transformers/full-transformer",
          "text": "BERT is the transformer ENCODER stack with a new pretraining objective bolted on - no architectural invention, which is part of why it landed so fast."
        },
        {
          "ref": "advanced-nlp/architectures",
          "text": "The encoder/decoder/encoder-decoder comparison is the direct sequel: MLM is what makes an encoder an encoder, and the objective is what determines what transfers."
        },
        {
          "ref": "advanced-cv/dino-mae",
          "text": "MAE is masked modelling for images, and the mask ratio difference (75% vs 15%) is entirely about redundancy - a pixel patch is interpolable from neighbours, a word is not."
        },
        {
          "ref": "rnn-nlp/word-vectors",
          "text": "The jump from word2vec's one-vector-per-type to BERT's contextual vectors is the single clearest before/after in modern NLP representation learning."
        },
        {
          "ref": "rag-agents/embeddings-vector-stores",
          "text": "Modern retrievers are BERT-family encoders fine-tuned with a contrastive objective - the architecture is BERT's, the training is not."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is masked language modelling?",
          "a": "Corrupt ~15% of the input tokens and train the model to recover the originals from the surrounding context on BOTH sides. The head is discarded afterwards; the contextual encoder is the product."
        },
        {
          "q": "Why can BERT be bidirectional when GPT cannot?",
          "a": "Because the prediction targets are HIDDEN. GPT predicts the next token, so seeing the future would leak the answer; BERT predicts masked tokens, which are removed from the input, so full attention leaks nothing."
        },
        {
          "q": "What is the 80/10/10 split?",
          "a": "Of the 15% selected: 80% become [MASK], 10% a random token, 10% are left unchanged. It narrows the pretrain/finetune gap ([MASK] never appears downstream) and forces a real representation at every position."
        },
        {
          "q": "What is next sentence prediction, and is it used?",
          "a": "A binary 'does sentence B follow sentence A' objective in the original BERT. RoBERTa showed it contributes essentially nothing; the field dropped it."
        },
        {
          "q": "What did RoBERTa change?",
          "a": "Removed NSP, used dynamic masking, much more data, larger batches, and longer training. No architectural change - the conclusion was that BERT was UNDERTRAINED."
        },
        {
          "q": "Why is MLM less sample-efficient per token than autoregressive LM?",
          "a": "Only the ~15% masked positions produce a loss signal, versus every position in an autoregressive model. You buy bidirectionality with signal density."
        },
        {
          "q": "What does [CLS] do?",
          "a": "A prepended token whose final representation is used as a sequence-level summary for classification. It works well WHEN fine-tuned for the task and poorly as a frozen sentence embedding."
        },
        {
          "q": "Why are raw BERT embeddings bad for similarity?",
          "a": "Nothing in MLM or NSP asks the space to be metrically meaningful, so cosine similarity is near-meaningless - raw BERT underperforms averaged GloVe on STS. Sentence-BERT fixes it by training for the objective."
        },
        {
          "q": "What is BERT's sequence-length limit and why?",
          "a": "512 tokens, because the position embeddings are LEARNED and absolute - there are only 512 of them. It is a hard limit, and truncation is silent."
        },
        {
          "q": "When would you pick an encoder over a decoder LLM today?",
          "a": "Fixed-taxonomy classification or token labelling at volume, where you have labelled data. A 110M encoder can match a much larger generative model at far lower latency and cost."
        },
        {
          "q": "What is continued pretraining?",
          "a": "Running MLM on your own unlabelled in-domain corpus before fine-tuning. It is the BioBERT/SciBERT pattern and pays off most when your domain is far from web text."
        },
        {
          "q": "Which layer's features should you use if you freeze BERT?",
          "a": "Not automatically the last. Syntactic information peaks in the middle layers and the top layers specialize to the pretraining objective, so middle-layer or layer-averaged features are often better frozen."
        }
      ],
      "standard": [
        {
          "q": "Explain BERT's pretraining objectives and design choices, and say which ones survived.",
          "a": "THE SETUP. BERT is the transformer encoder stack - no architectural invention - pretrained with two objectives on BooksCorpus plus English Wikipedia. The contribution was the OBJECTIVE and the transfer recipe, not the model. OBJECTIVE 1 - MASKED LANGUAGE MODELLING. Select ~15% of token positions. Of those, replace 80% with [MASK], 10% with a random vocabulary token, and leave 10% unchanged. Run the full bidirectional encoder and predict the ORIGINAL token at each selected position with cross-entropy. The key structural point is why bidirectionality is legal here: an autoregressive model cannot attend to the future because the future contains the label, but BERT's labels are REMOVED from the input, so every token may attend to every other token without leakage. That is the whole reason the objective exists. WHY 80/10/10, which is the detail interviewers probe. [MASK] is a pretraining artifact that never appears at fine-tuning time, so a model trained purely on [MASK] learns the shortcut 'only masked slots need contextualizing' and suffers a train/test input distribution mismatch. The random-token 10% forces the model to maintain a genuine contextual representation of EVERY position, because any position might be corrupted and it cannot tell. The unchanged 10% means a token that looks correct might still be a prediction target, so the model cannot simply copy. It is a hedge against the model exploiting the corruption pattern itself. OBJECTIVE 2 - NEXT SENTENCE PREDICTION. Feed two segments and classify whether B genuinely followed A, with the aim of teaching inter-sentence relationships for QA and NLI. This one DID NOT SURVIVE. RoBERTa ablated it and found removing NSP matched or improved every downstream task; the leading explanation is that the negative examples came from different documents, so the task collapsed into TOPIC detection, which is far easier than coherence and teaches little. Later models replaced it with sentence-order prediction (ALBERT) or dropped it entirely. WHAT ELSE CHANGED. RoBERTa also introduced DYNAMIC masking - BERT masked once during preprocessing so the model saw the same mask pattern every epoch, whereas resampling per epoch is strictly better and free. And RoBERTa trained on roughly 10x the data for longer with bigger batches. The headline conclusion, which is the more important lesson: BERT's published numbers reflected a model that was substantially UNDERTRAINED, and a large fraction of the 'architecture improvements' published in the following year were partially recovering that gap. Ablations are conducted inside a compute budget, and their conclusions do not automatically survive a larger one. WHAT SURVIVED. Bidirectional masked pretraining, absolutely - it is still how encoders are trained, and it generalized to images (MAE) and speech. Subword tokenization, the fine-tuning-with-a-small-head transfer recipe, and the [CLS] convention all survived. NSP did not. The 15% constant survived as a default but has since been shown scale-dependent - larger models do better at up to ~40%. And ELECTRA offered a genuinely better alternative: instead of predicting masked tokens at 15% of positions, train a discriminator to detect which tokens a small generator REPLACED, giving a signal at every position and markedly better compute efficiency.",
          "deepDive": {
            "q": "What have probing studies found out about what BERT actually learns, and how much should we trust them?",
            "a": "THE FIELD. 'BERTology' is the body of work analyzing what pretrained encoders represent, mostly via PROBING: train a small classifier on frozen representations to predict a linguistic property, and treat its accuracy as evidence the property is encoded. THE MAIN FINDINGS, which are genuinely interesting. (1) A LAYER HIERARCHY that loosely mirrors the classical NLP pipeline (Tenney et al., 'BERT Rediscovers the Classical NLP Pipeline'): surface features such as sentence length live in the lowest layers, SYNTAX peaks in the middle layers, and SEMANTICS and task-specific information in the upper layers. This is why the last layer is often not the best frozen feature - it has specialized to the MLM objective. (2) SYNTAX IS RECOVERABLE GEOMETRICALLY. Hewitt & Manning's structural probe found a linear transformation of BERT's space under which SQUARED L2 DISTANCE approximates parse-tree path distance - dependency structure is present in a strikingly simple form, without ever being supervised. (3) ATTENTION HEADS SPECIALIZE, with individual heads tracking direct objects, coreference, or determiner-noun links (Clark et al.). (4) MASSIVE REDUNDANCY: most heads can be pruned with little loss (Michel et al. found many layers run acceptably with a SINGLE head at inference), and layers can be dropped. THE CRITICISMS, which matter as much as the findings. (a) PROBE ACCURACY CONFLATES 'the information is present' WITH 'the probe extracted it'. A sufficiently powerful probe can recover almost anything from almost any representation - random vectors included, given enough dimensions. Hewitt & Liang's answer is CONTROL TASKS: build a task with the same structure but RANDOM labels, and report SELECTIVITY (real-task accuracy minus control accuracy). A probe that scores well on both is memorizing, not reading. This is the single most important methodological correction in the area. (b) PRESENCE IS NOT USE. Even a well-controlled probe showing a property is linearly decodable says nothing about whether the model USES it in its computation. This is exactly why causal methods - activation patching, ablation, causal tracing - superseded probing as the standard of evidence in mechanistic interpretability. (c) The findings are ARCHITECTURE- AND CHECKPOINT-SPECIFIC and often do not replicate across models, seeds, or even fine-tuning runs. (d) ATTENTION IS NOT EXPLANATION (Jain & Wallace): you can frequently find very different attention distributions that produce the same output, so 'this head attends to the object' is a weaker claim than it sounds. HOW MUCH TO TRUST IT. As a description of what is LINEARLY DECODABLE, with control tasks reported, probing is sound and useful - it is genuinely informative that parse structure is recoverable by a linear map. As a claim about the model's mechanism, it is weak evidence, and the field has moved to causal interventions for that. My practical use of it is narrow and defensible: probing tells me WHICH LAYER to take frozen features from, and that is a decision it answers well."
          }
        },
        {
          "q": "You need a text classifier for 50,000 labelled support tickets into 12 categories. Encoder fine-tune or LLM prompt?",
          "a": "With 50,000 labels and a fixed taxonomy, I would FINE-TUNE AN ENCODER, and I would expect it to win on every axis that matters here. Let me give the reasoning rather than just the answer. WHY THE ENCODER WINS AT THIS SPEC. (1) The data is ample. 50,000 examples across 12 classes is roughly 4,000 per class - far past the point where fine-tuning a 110M-parameter encoder is stable and well past what few-shot prompting can express in a context window. (2) The taxonomy is FIXED AND CLOSED, which is exactly the shape encoders are good at. An LLM's advantage is open-ended, zero-shot, or shifting label sets; none of that applies. (3) COST AND LATENCY differ by orders of magnitude. A DeBERTa-v3-base or RoBERTa-base classifier runs in single-digit milliseconds on a GPU, batches efficiently, and runs on CPU if needed; an API LLM call is 100x the latency and a recurring per-token cost. At support-ticket volume that difference is the entire operating budget. (4) The output is a CALIBRATED PROBABILITY VECTOR, which matters because you will want a confidence threshold for human routing. Getting reliable confidence out of a generative model is meaningfully harder. (5) It runs in your own infrastructure, which is often decisive for support data containing customer PII. WHAT I WOULD ACTUALLY BUILD. Start with a zero-shot LLM baseline anyway - it costs an afternoon and establishes the floor, and tells you whether the taxonomy is even coherent. Then fine-tune DeBERTa-v3-base (consistently stronger than BERT-base at the same size) with a linear head, learning rate 2e-5, 3-5 epochs, early stopping on validation macro-F1. Check the class distribution: support tickets are typically heavily imbalanced, so I would report MACRO-F1 and per-class recall rather than accuracy, and consider class weighting if the tail classes matter. Run several seeds and report the spread. THE HYBRID THAT IS USUALLY BEST. Use the LLM where it is genuinely better: (a) to help clean and audit the label set - support taxonomies are usually inconsistent, and an LLM disagreeing with a human label is a good signal for review; (b) to pseudo-label additional unlabelled tickets or generate synthetic examples for tail classes; (c) as a fallback at inference for the low-confidence tail, so the encoder handles the 90% it is sure about and the LLM handles the rest; (d) to produce an explanation for the human reviewer, which the encoder cannot do. WHEN I WOULD REVERSE THE DECISION. If the taxonomy changes monthly, if there are hundreds of fine-grained classes with long-tail examples, if you need a free-text rationale as part of the output, or if the labelled set were 500 rather than 50,000 - any of those flips it to the LLM, or to an LLM-distilled encoder. The honest general rule: LLMs win on flexibility and cold start, fine-tuned encoders win on cost, latency, calibration, and peak accuracy when the task is stable and labelled."
        },
        {
          "q": "Walk through fine-tuning BERT for a downstream task, and the failure modes you would watch for.",
          "a": "THE MECHANICS. Take the pretrained encoder, attach a task head, and train everything end to end on labelled data. For sequence classification the head reads the [CLS] representation; for token classification it applies a shared linear layer per token; for span extraction it predicts start and end distributions over positions. The head is randomly initialized, the body is not, and that asymmetry is the source of most of the difficulty. THE STANDARD RECIPE, which is remarkably stable across tasks: AdamW at 2e-5 to 5e-5 (roughly 100x smaller than you would use training from scratch - you are ADJUSTING a representation, not learning one), 2-4 epochs, batch 16-32, linear warmup over the first 6-10% of steps then linear decay, weight decay 0.01, max gradient norm 1.0. Warmup matters more than it looks: in the first steps the random head produces large, badly-directed gradients that flow into the pretrained body, and a high learning rate at that moment can destroy the pretrained weights before the head has learned anything useful. THE FAILURE MODES, which is the substance. (1) INSTABILITY ON SMALL DATASETS, and this is the big one. On small GLUE tasks (RTE, MRPC, CoLA - a few thousand examples) fine-tuning BERT-large fails to converge on a noticeable fraction of random seeds, landing at near-majority-class performance. The spread across seeds routinely EXCEEDS the difference between competing published methods, which means single-seed comparisons in this regime are close to meaningless. Mosbach et al. and Dodge et al. traced it substantially to optimization - vanishing gradients early in training and the bias-correction term omitted from BERT's original Adam implementation - and showed that longer training with proper warmup and bias correction largely fixes it. Practical response: always run 3-5 seeds, report mean and standard deviation, use warmup, and prefer more epochs with early stopping over few epochs. (2) CATASTROPHIC FORGETTING. Too high a learning rate, or too many epochs, and the model overwrites the pretrained knowledge it was supposed to be exploiting - you see training loss collapse while validation degrades. LAYER-WISE LEARNING RATE DECAY (multiply the rate by ~0.9 per layer going down, so early layers barely move) is the standard mitigation and is worth using by default on small datasets. (3) OVERFITTING, which is fast: with a few thousand examples and 110M parameters, three epochs can be too many. Early stopping on a real validation split is not optional. (4) THE TOKENIZATION MISMATCH in token-level tasks: WordPiece splits words into subwords, so your word-level labels must be aligned to subword positions, and the standard convention (label the first subword, set the rest to -100) has to be reproduced exactly at inference. Getting this subtly wrong produces a model that looks fine on token accuracy and is broken on entity F1. (5) SILENT TRUNCATION at 512 tokens - no error is raised, and if your label-bearing text is at the end of long documents you will lose it. (6) DOMAIN GAP: if your text is clinical, legal, or code, general BERT may underperform, and continued MLM pretraining on in-domain unlabelled text before fine-tuning is usually the highest-return fix. WHAT I WOULD CHECK BEFORE TRUSTING THE RESULT: a majority-class baseline and a TF-IDF plus logistic regression baseline (which beats fine-tuned BERT more often than people expect on easy topical tasks), several seeds, a per-class breakdown rather than only accuracy, and a manual look at fifty errors - which reveals label noise and taxonomy problems that no metric will."
        },
        {
          "q": "Why did decoder-only models displace BERT-style encoders, and is that the right outcome?",
          "a": "THE DISPLACEMENT IS REAL BUT PARTIAL, and the reasons are more about economics and interface than about representation quality. WHY DECODERS WON THE HEADLINE. (1) ONE MODEL, EVERY TASK. A decoder trained on next-token prediction can be steered by a prompt into classification, extraction, translation, summarization, and dialogue with no task-specific head and no gradient step. An encoder needs a labelled dataset and a fine-tune per task. That is a difference in DEPLOYMENT ECONOMICS more than in linguistic ability, and it is decisive when you have many tasks and few labels. (2) GENERATION IS STRICTLY MORE GENERAL. Encoders cannot generate; decoders can also classify (score the label tokens). The capability set is a superset. (3) THE SCALING STORY WAS CLEANER. Next-token prediction produces a training signal at EVERY position, so per token of data it is more efficient than MLM's 15%, and it scaled smoothly and predictably to hundreds of billions of parameters, where in-context learning emerged. Nobody found an equivalent payoff from scaling encoders, partly because far less compute was spent trying. (4) IN-CONTEXT LEARNING removed the labelled-data requirement for a huge class of problems - the single biggest practical unlock. WHY THE DISPLACEMENT IS NOT COMPLETE, and where encoders remain correct. (a) At FIXED, HIGH-VOLUME CLASSIFICATION AND TAGGING with labelled data, a 110M fine-tuned encoder matches or beats a much larger LLM at a small fraction of the latency and cost, with calibrated probabilities. This is not nostalgia; it is the right engineering answer and remains widely deployed. (b) EMBEDDINGS AND RETRIEVAL are still encoder territory - E5, BGE, GTE, and the models under most RAG systems are BERT-family bidirectional encoders fine-tuned contrastively. Bidirectional attention is genuinely better suited to producing a single fixed representation of a complete text. (c) Where you need a decision per token over a full document, bidirectional context is a real advantage. THE THEORETICAL QUESTION, which I think is the interesting part: is bidirectionality actually worth anything, or was BERT's advantage purely an artifact of scale? The evidence is mixed and honest people disagree. Encoders remain better per parameter on understanding tasks and on embeddings, which suggests a real benefit. But at large scale a decoder's unidirectional representation appears to be sufficient for nearly everything, and recent work converting decoders into strong embedders (LLM2Vec, and the top of the MTEB leaderboard) suggests the gap is narrower than the encoder camp assumed. IS IT THE RIGHT OUTCOME? Mostly yes for the field - the generality and the zero-shot interface are worth a great deal, and the compute went where the returns were. But it produced a real inefficiency at the application layer: an enormous amount of production traffic is large generative models doing three-class classification that a 110M encoder would do better, faster, and for a hundredth of the cost. The mature position, and the one I would argue in a design review, is that the two are complementary - use the LLM for the cold start, flexibility, and open-ended output; distil to an encoder once the task stabilizes and volume justifies it."
        },
        {
          "q": "What is ELECTRA and why is it more compute-efficient than BERT?",
          "a": "THE PROBLEM IT ADDRESSES. MLM produces a learning signal at only ~15% of positions - the other 85% of the forward pass computes representations that contribute nothing to the loss. Since compute scales with all positions and signal with a fraction of them, this is a large and obvious inefficiency, and ELECTRA (Clark et al., 2020) attacks it directly. THE METHOD - REPLACED TOKEN DETECTION. Two networks. A small GENERATOR is a standard MLM model that fills in masked positions with plausible tokens. Its outputs replace the masked tokens, producing a corrupted sequence that mostly looks fluent. The larger DISCRIMINATOR then classifies EVERY token as original or replaced - a binary decision at every position. After pretraining the generator is discarded and the discriminator is what you fine-tune. WHY IT IS MORE EFFICIENT. (1) SIGNAL AT EVERY POSITION: the loss covers 100% of tokens rather than 15%, roughly a 6-7x increase in supervised positions per unit of forward compute. (2) THE TASK IS HARDER IN A USEFUL WAY. Because the generator produces PLAUSIBLE replacements, the discriminator cannot succeed on surface cues - it must judge whether each token genuinely fits its context, which requires the same understanding MLM demands but exercised everywhere. (3) NO PRETRAIN/FINETUNE MISMATCH: the discriminator never sees [MASK] tokens, so the 80/10/10 hedging that BERT needs is unnecessary. THE RESULTS were striking: ELECTRA-small matched GPT (the original) with 1/30th the compute, and ELECTRA-base outperformed BERT-large on GLUE while using less than a quarter of the pretraining compute. On a compute-matched basis it dominated BERT across the board. THE DESIGN SUBTLETIES worth knowing, because they are where reimplementations fail. The generator must be SMALL - roughly a quarter to a half the discriminator's hidden size. A generator that is too strong produces replacements that are genuinely correct, making the discrimination task ill-posed and noisy (the 'replaced' token may be a perfectly valid word). The two networks share token embeddings but not the rest. And critically the generator is trained with MLM, NOT adversarially - it is not a GAN, despite the visual resemblance, because the discrete token sampling blocks gradient flow and the authors found adversarial training worse. Calling it a GAN in an interview is the standard mistake. WHY IT DID NOT TAKE OVER, which is the more interesting question. Its efficiency win is on the ENCODER track, and the field's attention and compute moved almost entirely to decoder-only generative models around the same time - so ELECTRA won an argument in a room people were leaving. It also adds pipeline complexity (two networks, a size ratio to tune), and it produces a discriminator whose output head is not directly usable for anything generative. It remains a strong choice where an encoder is the right tool and pretraining compute is constrained, DeBERTaV3 combines ELECTRA-style RTD with disentangled attention to good effect, and the core insight - get a training signal at every position - is a general lesson that recurs whenever people design pretraining objectives."
        },
        {
          "q": "How do subword tokenization choices affect a BERT-style model in practice?",
          "a": "WHY SUBWORDS AT ALL. A word-level vocabulary cannot cover an open vocabulary - every unseen word becomes [UNK], and morphologically rich languages explode the vocabulary size. Character-level models have no out-of-vocabulary problem but produce very long sequences, which is expensive under quadratic attention and pushes the model to spend capacity relearning that letters form words. Subwords are the compromise: frequent words stay whole, rare words decompose into meaningful pieces, and nothing is ever out of vocabulary. THE ALGORITHMS, briefly and with their real differences. BPE merges the most frequent adjacent pair repeatedly, greedily, until the vocabulary target is reached. WORDPIECE (BERT's) merges the pair that most increases the likelihood of the training data under a unigram model, which is a slightly more principled criterion, and marks continuations with '##'. UNIGRAM/SentencePiece starts from a large candidate vocabulary and prunes, keeping a probabilistic segmentation model - which permits SUBWORD REGULARIZATION, sampling different segmentations of the same word during training as a data augmentation. SentencePiece also treats the input as a raw byte or character stream including spaces, which makes it language-agnostic and removes the need for a pre-tokenizer - important for languages without whitespace word boundaries. BYTE-LEVEL BPE (GPT-2 onward) operates on bytes, guaranteeing that any Unicode string is representable with no [UNK] ever. WHAT IT ACTUALLY CHANGES IN PRACTICE. (1) TOKEN-LEVEL TASKS REQUIRE LABEL ALIGNMENT. Your NER labels are on words; the model works on subwords. The convention is to label the FIRST subword of each word and mark the rest -100 so they are ignored by the loss, then aggregate at inference. Getting this wrong is a common and quiet bug: token accuracy looks fine while entity-level F1 is badly degraded. (2) SEQUENCE LENGTH IS LANGUAGE-DEPENDENT, and this is a fairness issue as much as an engineering one. A multilingual tokenizer trained mostly on English fragments other languages far more aggressively - the same sentence can take 2-4x more tokens in Thai, Telugu, or Burmese than in English. That means less content fits in the context window, inference costs more, and for API-priced models speakers of those languages pay several times more for the same information. It also degrades quality, because the model must compose meaning from more fragments. (3) NUMBERS AND CODE. How a tokenizer splits digits materially affects arithmetic ability - inconsistent splitting ('1234' as one token here and '12'+'34' there) makes digit alignment harder to learn, which is why several modern tokenizers split numbers into fixed-size digit groups deliberately. Similarly, whether indentation and common code idioms are single tokens changes a code model's effective context substantially. (4) DOMAIN MISMATCH: a general tokenizer shreds specialist vocabulary - chemical names, gene symbols, legal terms - into many pieces, which both lengthens sequences and forces the model to reassemble meaning. This is a real part of why domain-specific models like SciBERT, which train their own vocabulary, outperform general ones on domain tasks; the vocabulary, not just the weights, is adapted. (5) THE VOCABULARY IS FROZEN WITH THE MODEL. You cannot change the tokenizer of a pretrained model without invalidating its embeddings, so adding domain tokens post hoc means initializing new embeddings (typically as the mean of their subword pieces) and training them. THE PRACTICAL CHECK I would run on any new domain: tokenize a sample and look at the FERTILITY - average subword pieces per word. If it is well above ~1.5, the tokenizer is a poor fit, and that fact alone predicts both higher cost and worse downstream performance."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Masked language modelling",
        "back": "Corrupt ~15% of tokens, predict the originals from BOTH-side context. Legal to be bidirectional because the targets are REMOVED from the input - unlike next-token prediction, where the future is the answer."
      },
      {
        "type": "definition",
        "front": "BERT's 80/10/10 split",
        "back": "Of the 15% selected: 80% -> [MASK], 10% -> random token, 10% unchanged. Narrows the pretrain/finetune gap ([MASK] never appears downstream) and forces a real representation at EVERY position."
      },
      {
        "type": "intuition",
        "front": "Why MLM needs more steps than autoregressive LM",
        "back": "Loss signal comes from only ~15% of positions vs 100% for next-token prediction, while compute covers all positions. You buy bidirectionality with signal density - which is exactly what ELECTRA fixes."
      },
      {
        "type": "pitfall",
        "front": "Next sentence prediction",
        "back": "BERT's second objective - and it does NOTHING. RoBERTa's ablation showed removing it matches or improves everything; negatives came from other documents, so it collapsed to topic detection. Dropped by the field."
      },
      {
        "type": "pitfall",
        "front": "Raw BERT [CLS] as a sentence embedding",
        "back": "Scores WORSE than averaged GloVe on STS (~0.2-0.3 vs ~0.58 Spearman). Nothing in MLM/NSP makes the space metric. Fix by training for it (Sentence-BERT ~0.85), not by changing the pooling."
      },
      {
        "type": "definition",
        "front": "RoBERTa's changes",
        "back": "Drop NSP, dynamic masking (resample per epoch, not once in preprocessing), 10x data, bigger batches, longer training. NO architecture change - the finding was that BERT was UNDERTRAINED."
      },
      {
        "type": "definition",
        "front": "ELECTRA / replaced token detection",
        "back": "A small generator fills masks; a larger discriminator classifies EVERY token as original-or-replaced. Signal at 100% of positions, no [MASK] mismatch. ELECTRA-base beat BERT-large on GLUE at <1/4 the compute. NOT a GAN - the generator trains with MLM."
      },
      {
        "type": "pitfall",
        "front": "Fine-tuning instability at small n",
        "back": "On small GLUE tasks BERT-large diverges to majority-class on a real fraction of seeds, and seed spread often EXCEEDS the gap between published methods. Fix: warmup, Adam bias correction, more epochs + early stopping, and report 3-5 seeds."
      },
      {
        "type": "intuition",
        "front": "Which BERT layer to freeze-and-use",
        "back": "Not the last. Surface features low, SYNTAX in the middle, task-specific/objective-specific at the top. Frozen features from middle layers often beat the final layer."
      },
      {
        "type": "pitfall",
        "front": "Subword label alignment",
        "back": "Labels are per WORD, the model is per SUBWORD. Convention: label the first subword, set the rest to -100. Get it wrong and token accuracy still looks fine while entity F1 quietly collapses."
      },
      {
        "type": "pitfall",
        "front": "The 512-token wall",
        "back": "BERT's position embeddings are LEARNED and absolute - there are exactly 512. Truncation is silent, with no warning, so tail content in long documents disappears from training and inference alike."
      },
      {
        "type": "intuition",
        "front": "Probing vs causal evidence",
        "back": "A probe recovering a property proves it is DECODABLE, not that the model uses it - a strong probe recovers things from random vectors. Report SELECTIVITY against a random-label control task (Hewitt & Liang); use activation patching for causal claims."
      }
    ],
    "refs": [
      {
        "title": "Devlin et al. (2018), BERT: Pre-training of Deep Bidirectional Transformers",
        "url": "https://arxiv.org/abs/1810.04805"
      },
      {
        "title": "Liu et al. (2019), RoBERTa: A Robustly Optimized BERT Pretraining Approach",
        "url": "https://arxiv.org/abs/1907.11692"
      },
      {
        "title": "Clark et al. (2020), ELECTRA: Pre-training Text Encoders as Discriminators",
        "url": "https://arxiv.org/abs/2003.10555"
      },
      {
        "title": "Rogers et al. (2020), A Primer in BERTology: What We Know About How BERT Works",
        "url": "https://arxiv.org/abs/2002.12327"
      },
      {
        "title": "Reimers & Gurevych (2019), Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
        "url": "https://arxiv.org/abs/1908.10084"
      }
    ],
    "demos": [
      "tokenizer",
      "attention",
      "probing-classifier",
      "embeddings"
    ]
  }
};
