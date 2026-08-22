// GENERATED from content/lessons/advanced-nlp/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "advanced-nlp". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
  },
  "architectures": {
    "level": "core",
    "body": {
      "intuition": [
        "There are three named transformer families and they are not three architectures. They are ONE architecture with three ATTENTION MASKS. An encoder lets every position attend to every other; a decoder masks the future so position i sees only 1..i; an encoder-decoder runs a bidirectional stack over the input and a causal stack over the output, with cross-attention connecting them. Once you see that the mask is the whole difference, the design space becomes something you can reason about instead of memorize.",
        "The mask is chosen by what the model must PRODUCE, not by what it must understand. If the output is a label or a tag over an input you already have in full, nothing is gained by hiding the future, so use bidirectional attention - that is BERT. If the output is a sequence generated one token at a time, position i cannot depend on tokens that do not exist yet, so causality is forced - that is GPT. If input and output are different sequences with different lengths and roles (translate this, summarize that), a dedicated encoder plus a decoder that cross-attends to it is the natural factorization - that is T5 and the original 2017 transformer.",
        "So why did DECODER-ONLY win, given that T5's own careful ablation found encoder-decoder best? Three reasons, and none of them is 'it understands language better'. First, next-token prediction gives a training signal at every position, which scales more cleanly than masked objectives. Second, one causal stack does everything - classification, extraction, translation, dialogue - through the prompt, with no task-specific head, which is a deployment story rather than a modelling one. Third, in-context learning emerged from that setup at scale and removed the labelled-data requirement for a huge class of problems. The architecture that won is the one whose INTERFACE was most general, and that is a genuinely different claim from the one people usually make for it."
      ],
      "math": [
        {
          "h": "The three masks",
          "paras": [
            "Everything reduces to which entries of the attention matrix are permitted. The encoder allows all; the decoder allows only the lower triangle; the prefix-LM allows all within a prefix and causal thereafter, which is the continuous interpolation between them."
          ],
          "tex": "M^{\\mathrm{enc}}_{ij} = 0 \\;\\;\\forall i,j \\qquad M^{\\mathrm{dec}}_{ij} = \\begin{cases}0 & j \\le i\\\\ -\\infty & j > i\\end{cases} \\qquad M^{\\mathrm{pre}}_{ij} = \\begin{cases}0 & j \\le \\max(i, p)\\\\ -\\infty & \\text{else}\\end{cases}",
          "texNote": "M is added to the logits before the softmax, so -inf zeroes that attention weight. p = the prefix length; p = T recovers the encoder and p = 0 recovers the decoder, which makes the prefix-LM the family that contains both."
        },
        {
          "h": "Cross-attention: where the encoder-decoder actually differs",
          "paras": [
            "The decoder block in an encoder-decoder has THREE sublayers rather than two. Causal self-attention over what has been generated, then cross-attention whose queries come from the decoder and whose keys and values come from the encoder output, then the feed-forward. Cross-attention is the only channel through which the input reaches the output, and it is computed once per decoder layer against a fixed encoder memory."
          ],
          "tex": "\\mathrm{CrossAttn}(H^{\\mathrm{dec}}, H^{\\mathrm{enc}}) = \\mathrm{softmax}\\!\\left(\\frac{(H^{\\mathrm{dec}}W_Q)(H^{\\mathrm{enc}}W_K)^{\\top}}{\\sqrt{d_k}}\\right)H^{\\mathrm{enc}}W_V",
          "texNote": "The encoder memory is computed ONCE for the whole generation, so its cost amortizes over all output tokens - the reason encoder-decoders are efficient when the input is long and the output is short (summarization), and why they are less compelling when the output dominates."
        },
        {
          "h": "Parameter accounting, which is where comparisons go wrong",
          "paras": [
            "An encoder-decoder with L layers each side has roughly 2x the parameters of an L-layer decoder-only model, plus cross-attention. Papers comparing 'a 12-layer encoder-decoder against a 12-layer decoder' are comparing different budgets, and that alone explains several published gaps."
          ],
          "tex": "P_{\\mathrm{enc\\text{-}dec}} \\approx 2 L\\big(12 d^2\\big) + L\\big(4 d^2\\big) \\quad \\text{vs} \\quad P_{\\mathrm{dec}} \\approx L\\big(12 d^2\\big)",
          "texNote": "12 d^2 per block = 4 d^2 attention + 8 d^2 FFN (at the usual 4d expansion); the extra 4 d^2 per decoder layer is cross-attention. T5's ablation controlled for this by comparing at matched parameters AND matched FLOPs, which is why its conclusions are worth more than most."
        }
      ],
      "code": [
        {
          "h": "One implementation, three families",
          "paras": [
            "The clearest way to internalize this is to write the mask as a function and swap it. Nothing else about the block changes."
          ],
          "code": "import torch\n\ndef build_mask(T, kind, prefix_len=0):\n    if kind == \"encoder\":                      # BERT: everyone sees everyone\n        return torch.zeros(T, T)\n    if kind == \"decoder\":                      # GPT: strictly causal\n        return torch.triu(torch.full((T, T), float(\"-inf\")), diagonal=1)\n    if kind == \"prefix\":                       # UL2 / PaLM prefix-LM\n        m = torch.triu(torch.full((T, T), float(\"-inf\")), diagonal=1)\n        m[:, :prefix_len] = 0.0                # the prompt is fully visible to all\n        return m\n\n# the block itself is identical in all three cases\nscores = (q @ k.transpose(-2, -1)) / d_k ** 0.5\nattn   = (scores + build_mask(T, kind)).softmax(-1) @ v\n\n# The practical consequence people miss: with a CAUSAL mask, the prompt tokens\n# cannot attend forward to each other either. In a prefix-LM they can - which is\n# why prefix-LM is a strictly better fit for 'long instruction, short answer'\n# and costs nothing extra at training time.",
          "caption": "Encoder, decoder, and prefix-LM differ by three lines. The prefix-LM is the general case: prefix_len = T gives an encoder, prefix_len = 0 gives a decoder."
        },
        {
          "h": "What each family costs at inference",
          "paras": [
            "The architecture choice is largely an inference-economics choice, and the shape of your input/output ratio decides it."
          ],
          "code": "# Task: summarize a 4000-token document into 100 tokens.\n#\n# ENCODER-DECODER (T5-style)\n#   encode 4000 tokens ONCE                     -> 4000^2 attention, amortized\n#   decode 100 steps, each cross-attending to a CACHED encoder memory\n#   decoder self-attention is over <=100 tokens only\n#\n# DECODER-ONLY (GPT-style)\n#   prefill 4100 tokens, then 100 decode steps\n#   every decode step attends over the FULL 4000+ token KV cache\n#   KV cache size scales with document length, not summary length\n#\n# For long-in / short-out, encoder-decoder is structurally cheaper and its\n# KV cache is ~40x smaller. For chat (short-in / long-out, multi-turn) the\n# decoder-only cache is reused across turns and the encoder buys nothing.\n#\n# This - not representational power - is the honest architectural argument,\n# and it is why T5-family models persisted longest in translation and\n# summarization services while decoder-only took everything conversational.",
          "caption": "The input/output length ratio is the practical decision rule. Long input and short output favours an encoder-decoder; conversational and generative workloads favour decoder-only, whose KV cache amortizes across turns."
        }
      ],
      "useCases": [
        "Encoder-only for high-volume classification, tagging, span extraction, and retrieval embeddings - anywhere you have the full input, a fixed output space, and labelled data. Still the cost-optimal answer at production volume.",
        "Decoder-only for anything open-ended or multi-task: chat, code, agents, instruction following, and any setting where the task set changes faster than you can build labelled datasets. Also the only family with meaningful in-context learning.",
        "Encoder-decoder for genuine sequence transduction with a strong asymmetry between input and output - translation, summarization, grammatical correction, speech recognition (Whisper is an encoder-decoder), and text-to-speech, where a dedicated bidirectional read of a long input pays for itself.",
        "Prefix-LM and mixture-of-denoisers (UL2, PaLM) when you want a single model that is strong at both understanding and generation - a bidirectional read of the prompt with causal generation after it, trained on a blend of denoising objectives."
      ],
      "pitfalls": [
        "Comparing an L-layer encoder-decoder to an L-layer decoder and calling it a fair fight. The encoder-decoder has roughly twice the parameters plus cross-attention; match parameters AND FLOPs or the comparison is meaningless. Several published architecture gaps are mostly this.",
        "Assuming decoder-only won because it understands language better. It won on interface generality, training-signal density, and deployment economics. T5's own controlled ablation found encoder-decoder BEST at matched budget on transfer tasks - the field went the other way for reasons that were not about that benchmark.",
        "Using a decoder-only model for embeddings without adaptation. Causal attention means the final token has seen everything but earlier tokens have not, so naive pooling is skewed. It can be fixed (LLM2Vec removes the causal mask and continues training) but not ignored.",
        "Forgetting that the pretraining OBJECTIVE and the ARCHITECTURE are separable choices. You can train a decoder with a denoising objective or an encoder-decoder with next-token prediction; conflating the two is the most common confusion in this area, and the papers that separate them (T5, UL2, Wang et al. 2022) are the ones worth reading.",
        "Building an encoder-decoder for a chat product. Multi-turn dialogue is a single growing sequence, so there is no clean input/output split to exploit, and you lose KV-cache reuse across turns.",
        "Believing the choice is permanent. Architectural ADAPTATION is cheap: a modest amount of continued pretraining converts a decoder to a prefix-LM or an encoder-decoder to a decoder at a fraction of pretraining cost, which is why the choice matters less than it appears."
      ],
      "connections": [
        {
          "ref": "transformers/full-transformer",
          "text": "The original 2017 model was an encoder-decoder built for translation - the two single-stack families are both simplifications of it, which is a useful historical inversion of how they are usually taught."
        },
        {
          "ref": "advanced-nlp/bert",
          "text": "Masked language modelling is what makes an encoder worth having; without a bidirectional objective the bidirectional mask has nothing to exploit."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "The KV cache is what makes decoder-only inference tractable, and its size is the main inference-economics difference between the families."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Every frontier LLM is a decoder-only stack with the same mask and different everything-else - the family question was settled before the interesting engineering started."
        },
        {
          "ref": "rnn-nlp/seq2seq-attention",
          "text": "Cross-attention is the direct descendant of Bahdanau attention over an RNN encoder's hidden states; the encoder-decoder factorization predates transformers entirely."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What actually distinguishes encoder, decoder, and encoder-decoder?",
          "a": "The attention mask, plus cross-attention. Encoder = full bidirectional; decoder = causal (lower-triangular); encoder-decoder = bidirectional stack over the input plus a causal stack that cross-attends to it."
        },
        {
          "q": "Why must a decoder be causal?",
          "a": "It predicts token i+1 from tokens 1..i. If it could attend to future positions the answer would be in the input, and the loss would be trivially satisfied without learning anything."
        },
        {
          "q": "What is cross-attention?",
          "a": "Attention where queries come from the decoder and keys/values from the ENCODER output. It is the only channel by which the input reaches the generated sequence."
        },
        {
          "q": "What is a prefix-LM?",
          "a": "Bidirectional attention within a prefix (the prompt), causal after it. It generalizes both other families: prefix = whole sequence gives an encoder, prefix = empty gives a decoder."
        },
        {
          "q": "What did T5's architecture ablation find?",
          "a": "At matched parameters and matched compute, ENCODER-DECODER with a span-corruption objective transferred best - which is the opposite of what the field subsequently adopted."
        },
        {
          "q": "So why did decoder-only win?",
          "a": "Training signal at every position, one model for every task via prompting with no task head, in-context learning at scale, and simpler inference. Interface generality and economics, not representational superiority."
        },
        {
          "q": "Which family for translation or summarization?",
          "a": "Encoder-decoder is the natural fit - long input read once and cached, short output generated against it. Decoder-only works but carries the whole input in its KV cache at every step."
        },
        {
          "q": "Which family for embeddings?",
          "a": "Encoder-only, by default - bidirectional attention gives every token full context, which is what a single fixed representation wants. Decoder-only models can be adapted (LLM2Vec) but need the causal mask removed."
        },
        {
          "q": "Can an encoder generate text?",
          "a": "Not naturally. You can iteratively unmask, but quality is poor - the objective never trained a left-to-right factorization of the sequence probability."
        },
        {
          "q": "How many extra parameters does cross-attention add?",
          "a": "Roughly 4d^2 per decoder layer (Q, K, V, O projections), on top of an encoder-decoder already having about twice the layers of a comparable single stack."
        },
        {
          "q": "What is UL2's mixture of denoisers?",
          "a": "Pretraining on a blend of objectives - short spans (R), long spans / extreme corruption (X), and pure prefix-LM continuation (S) - so one model gets both understanding and generation ability. It also showed the objective, not the stack, does most of the work."
        },
        {
          "q": "Is the architecture choice reversible?",
          "a": "Largely yes, and cheaply. Modest continued pretraining converts between families (decoder to prefix-LM, encoder-decoder to decoder), which is why the choice matters less than the debate suggests."
        }
      ],
      "standard": [
        {
          "q": "Compare the three transformer families and say how you would choose between them.",
          "a": "THE UNIFYING FRAME I would start with: these are not three architectures. They are one architecture with three attention masks, plus cross-attention in one case. Getting that across first makes everything else follow. ENCODER-ONLY (BERT, RoBERTa, DeBERTa). Full bidirectional attention; every token sees every token. Pretrained with a denoising objective, usually masked language modelling, because next-token prediction would leak through the bidirectional mask. Output is a contextual vector per token, so you attach a head: [CLS] for classification, per-token linear for tagging, start/end logits for span extraction. STRENGTHS: the richest possible representation per token (full context in both directions), parameter-efficient for understanding tasks, fast single-pass inference, calibrated probabilities. WEAKNESSES: cannot generate, needs a fine-tune per task, and needs labelled data. DECODER-ONLY (GPT, Llama, Mistral). Causal mask; trained with next-token prediction; generates autoregressively with a KV cache. STRENGTHS: a training signal at every position (more efficient per token of data than MLM's 15%), one model for all tasks via prompting, in-context learning at scale, and the simplest possible training and inference stack. WEAKNESSES: no bidirectional context, so per-token representations are weaker for understanding tasks; generation is sequential and therefore latency-bound; and the KV cache grows with the full sequence. ENCODER-DECODER (T5, BART, Whisper). Bidirectional encoder over the input, causal decoder over the output, cross-attention between. STRENGTHS: the right inductive bias when input and output are genuinely different objects; the encoder memory is computed ONCE and cross-attended repeatedly, so a long input amortizes across a short output; and the decoder's self-attention is only over what it has generated, which keeps its cache small. WEAKNESSES: roughly twice the parameters for a given depth, more complex to train and serve, and no advantage when the task is a single growing sequence. HOW I WOULD CHOOSE, as a decision procedure. (1) Do you need to GENERATE? If not, encoder-only, and stop - you will get better accuracy per parameter and far lower cost. (2) If you do generate: is there a clean, long INPUT that is distinct from the output? Translation, summarization, speech-to-text - encoder-decoder is a genuinely better fit, and the KV-cache arithmetic backs that up (summarizing 4000 tokens into 100, the encoder-decoder's decoder cache is ~40x smaller). (3) Is the task set open-ended, changing, or conversational? Decoder-only, decisively - multi-turn dialogue has no input/output split to exploit and benefits from cache reuse across turns. (4) Are you constrained to what exists? This dominates in practice: the ecosystem, the tooling, the fine-tuning recipes, and the serving stacks are overwhelmingly decoder-only, and 'the best model I can actually get' beats 'the right family' most of the time. THE HONEST CAVEAT I would add. T5's controlled ablation - matched parameters and matched FLOPs, which most comparisons do not do - found encoder-decoder best on transfer. Wang et al. (2022) later found the answer depends on what comes next: causal decoder plus LM objective is best for zero-shot after pretraining alone, while encoder-decoder plus masked objective is best after multitask fine-tuning. So the literature does not support a simple ranking, and the field's convergence on decoder-only was driven by generality, scaling behaviour, and engineering economics rather than by a benchmark win. Saying that plainly is worth more in an interview than picking a side.",
          "deepDive": {
            "q": "Why does the pretraining objective matter more than the architecture, and what is the evidence?",
            "a": "THE CLAIM. Architecture and objective are separable choices that get conflated because the famous models pair them conventionally - BERT is 'encoder + MLM', GPT is 'decoder + next-token'. But you can train a decoder with a denoising objective, an encoder-decoder with pure LM, and so on, and when people run that grid the OBJECTIVE explains more of the variance than the mask does. THE EVIDENCE. (1) T5 (Raffel et al., 2020) ran the systematic grid - architectures crossed with objectives at matched compute. Across architectures, DENOISING objectives beat plain language modelling for transfer, and among denoising variants, SPAN CORRUPTION (mask contiguous spans, replace each with a single sentinel, generate the spans) beat independent-token masking. Mask ratio and span length mattered less than the choice of denoising at all. The architectural effect was real but smaller than the objective effect. (2) Wang et al. (2022) ran architecture x objective x adaptation for zero-shot generalization, and found the ranking REVERSES depending on the downstream regime: causal-decoder + LM is best zero-shot straight out of pretraining, encoder-decoder + MLM is best after multitask fine-tuning. An architecture claim that flips under a change of downstream protocol is not primarily an architecture claim. Crucially they also showed ADAPTATION IS CHEAP - a small amount of continued pretraining with a different objective converts a model between regimes and recovers most of the gap, which directly undercuts the idea that the mask locks in a capability. (3) UL2 (Tay et al., 2022) made the point constructively with MIXTURE-OF-DENOISERS: train one model on a blend of R-denoising (short spans, BERT-like), X-denoising (long spans or high corruption, aggressive), and S-denoising (sequential prefix-LM, GPT-like), with a mode token telling the model which regime it is in. The result was a single model strong at both understanding and generation, beating T5 and GPT-style baselines at matched compute on both kinds of task. The lever they pulled was the objective mixture, not the stack. (4) ELECTRA is the same lesson inside the encoder family: replaced-token detection, at identical architecture, beat BERT-large using less than a quarter of the pretraining compute. Same mask, different objective, large win. WHY THE OBJECTIVE DOMINATES, mechanistically. The objective determines WHAT INFORMATION THE MODEL IS FORCED TO ENCODE and how much signal it receives per unit of compute. Next-token prediction on a huge corpus is an extraordinarily rich objective - to predict well you need syntax, world knowledge, arithmetic, and something like reasoning - and it delivers a gradient at every position. MLM delivers a richer per-position task but at only 15% of positions. Span corruption sits between. The mask, by contrast, only constrains which context is AVAILABLE, and for most tasks the missing direction turns out to be substitutable given enough scale and data. THE CAVEATS I would attach. The claim is not that architecture is irrelevant - it clearly determines inference economics (KV cache size, prefill/decode split, amortization of a long input), which is a large practical difference even if downstream quality is similar. And it is not that any objective works: the SPACE of good objectives is narrow, and most inventive pretext tasks are worse than plain next-token prediction. THE TRANSFERABLE LESSON, which is why this is worth knowing beyond NLP trivia: when you are designing a self-supervised system, spend your thinking on WHAT SIGNAL YOU ARE EXTRACTING FROM THE DATA and how densely, and treat the architecture as the thing that has to be efficient enough to consume it. The same conclusion emerged independently in vision - MAE's mask ratio mattered more than the ViT variant."
          }
        },
        {
          "q": "Why is an encoder-decoder cheaper for summarization but not for chat? Work through the arithmetic.",
          "a": "THE TASK SHAPES ARE DIFFERENT and that is the whole answer, but the arithmetic makes it concrete. SUMMARIZATION: 4000 tokens in, 100 tokens out. ENCODER-DECODER. Encode 4000 tokens once - one bidirectional forward pass, O(4000^2) attention, paid ONCE. Then 100 decoding steps. Each step's self-attention is over at most 100 generated tokens; each step's cross-attention is against the fixed encoder memory, whose keys and values are computed once and cached. So the decoder's own KV cache holds 100 positions. DECODER-ONLY. Prefill the 4100-token prompt, then 100 decode steps, and every one of those steps attends over the entire 4100-token KV cache. THE CACHE COMPARISON is the striking part: the encoder-decoder's decoder cache is 100 positions versus 4100, roughly 40x smaller. Memory bandwidth is the binding constraint in autoregressive decoding - each step must read the whole cache - so this is a real throughput difference, not a bookkeeping one. The encoder-decoder does still hold the cross-attention K/V for 4000 encoder positions, but those are computed once and shared across all 100 steps rather than re-read as a growing causal cache, and in several implementations they are projected once per layer rather than per step. The structural point survives: work proportional to the INPUT is paid once, work proportional to the OUTPUT is paid per step, and when the input dominates that factorization is the right one. NOW CHAT: multi-turn, short user messages, long assistant replies, and a conversation that grows. THE ENCODER-DECODER ADVANTAGE EVAPORATES, for three reasons. (1) THERE IS NO STABLE INPUT/OUTPUT SPLIT. Turn 3's 'input' includes turns 1 and 2 plus the assistant's own previous outputs. If you re-encode the conversation each turn, you pay the encoder cost repeatedly, and it grows every turn - which is exactly the cost you were trying to amortize. (2) THE DECODER-ONLY CACHE IS REUSED ACROSS TURNS. A decoder-only server keeps the KV cache for the whole conversation; a new turn only prefills the new tokens. That is a large win in a multi-turn product and it has no encoder-decoder analogue, because the encoder's input changed. (3) THE OUTPUT DOMINATES OR MATCHES THE INPUT, so the amortization argument runs backwards - the thing you would be caching is the small part. THE GENERAL RULE, which is worth stating as a rule: encoder-decoders amortize INPUT processing across OUTPUT tokens, so they win when input >> output AND the input is fixed for the duration of the generation. They lose when the input grows with the output (dialogue, agents, long-form generation with self-reference) or when input and output are the same object. WHERE THIS SHOWS UP IN THE REAL WORLD, which confirms it: Whisper is an encoder-decoder (30 seconds of audio in, a short transcript out - a textbook fit); translation and summarization services ran T5/BART-family models long after chat had gone decoder-only; and no serious chat product is an encoder-decoder. The architecture followed the workload shape."
        },
        {
          "q": "Can you use a decoder-only LLM to produce embeddings? What goes wrong and how is it fixed?",
          "a": "YOU CAN, IT IS INCREASINGLY DONE, AND IT REQUIRES REAL ADAPTATION. WHAT GOES WRONG, in order of severity. (1) THE CAUSAL MASK IS BACKWARDS FOR THIS PURPOSE. Token 1 has seen only itself; token T has seen everything. Mean-pooling such a sequence averages representations built from wildly different amounts of context, which is not a coherent operation. Last-token pooling avoids that but puts enormous weight on one position, and that position is the one the model was trained to use for predicting the NEXT token - a subtly different job from summarizing what came before. (2) THE OBJECTIVE NEVER ASKED FOR A METRIC SPACE. Next-token prediction rewards a representation from which the following token is predictable; it never asks that semantically similar TEXTS be nearby. This is the same failure as raw BERT [CLS] embeddings, and it has the same answer: it is a training problem, not a pooling problem. (3) ANISOTROPY. LLM hidden states occupy a narrow cone - cosine similarities between unrelated texts are uniformly high, so the usable dynamic range of the similarity score is small. (4) COST AND DIMENSION. A 7B model is orders of magnitude more expensive per embedding than a 110M encoder, and produces 4096-dimensional vectors that are expensive to store and search at corpus scale. THE FIXES, roughly in order of increasing effectiveness. (a) BETTER POOLING as a stopgap: last-token or weighted-mean (weighting later positions more, which corrects for the causal asymmetry) beats naive mean-pooling, but it is a patch. (b) ECHO EMBEDDINGS: put the text in the prompt TWICE and pool over the second copy, so that every token of the second pass has effectively seen the whole text through the first. A clever trick that recovers a bidirectional read without touching the model, at 2x inference cost. (c) PROMPT-BASED EXTRACTION: 'This sentence means in one word:' and take the next-token representation - surprisingly effective zero-shot, because it uses the model's own instruction-following to do the summarizing. (d) LLM2Vec, which is the principled version and now the standard recipe: REMOVE THE CAUSAL MASK to make attention bidirectional, do a short continued pretraining with masked next-token prediction so the model adapts to seeing the future, then apply CONTRASTIVE fine-tuning (SimCSE-style or with real pairs). This turns strong decoders into state-of-the-art embedders. (e) FULL CONTRASTIVE FINE-TUNING with hard negatives and instruction prefixes, which is what the top MTEB entries do. IS IT WORTH IT? The case FOR: these models bring far more world knowledge and much better multilingual and instruction-following behaviour, so instruction-conditioned embeddings ('represent this document for retrieval of legal precedent') work in a way small encoders cannot manage, and the top of the MTEB leaderboard is now dominated by adapted decoders. The case AGAINST, which is the one I would raise in a design review: for a retrieval system you may embed tens of millions of documents and every query at low latency, so a 7B embedder can cost 50-100x a 335M encoder per vector, and the quality gap on straightforward semantic retrieval is often a couple of points. THE PRACTICAL ANSWER I would give: use a well-trained encoder-family embedder (E5, BGE, GTE) by default; reach for an adapted decoder when you need instruction-conditioning, unusual domains, strong multilingual coverage, or the last few points of accuracy and can afford them. And note the conceptual point the whole exercise makes: the architecture was NOT the binding constraint - the objective was. Once you train for embedding, the decoder is fine."
        },
        {
          "q": "What is span corruption and why did T5 prefer it to BERT-style masking?",
          "a": "THE MECHANISM. T5 reframed every task as text-to-text, so its pretraining objective also had to produce text. Span corruption: choose ~15% of tokens, but mask them in CONTIGUOUS SPANS of average length ~3 rather than independently. Each corrupted span is replaced in the input by a single unique SENTINEL token (<X>, <Y>, <Z>...), and the target sequence is the sentinels followed by the tokens each replaced. So 'Thank you <X> me to your party <Y> week' has the target '<X> for inviting <Y> last'. WHY IT IS BETTER THAN INDEPENDENT-TOKEN MASKING, and there are four distinct reasons. (1) IT IS A HARDER AND MORE REALISTIC TASK. Independent masking frequently masks one token of a multi-token word or phrase, leaving the rest as a near-decisive clue - reconstructing 'ing' given 'invit' is not language understanding. Masking whole spans removes that crutch, which is the same insight behind whole-word masking and SpanBERT. (2) SHORTER SEQUENCES, LOWER COST. Because a span of k tokens collapses to ONE sentinel in the input and the target contains only the corrupted tokens rather than the full sequence, both input and target are substantially shorter than a BERT-style setup. Attention is quadratic, so this is a direct compute saving - T5 reported meaningful speedups from the target-length reduction alone. (3) IT MATCHES THE ARCHITECTURE. T5 is an encoder-decoder, so its objective must produce a target SEQUENCE. Predicting independent tokens at masked positions is a natural encoder objective; generating the missing spans is a natural encoder-decoder objective, and it exercises the decoder and cross-attention during pretraining exactly as downstream generation will. (4) IT TEACHES VARIABLE-LENGTH GENERATION. The model must decide HOW MANY tokens each sentinel expands to, which BERT never learns - BERT's masked slots are always exactly one token. That is a genuine additional capability and it matters for generative downstream tasks. WHAT THE ABLATION ACTUALLY SHOWED. T5 compared language modelling, BERT-style masking, deshuffling, and several corruption variants at matched compute. Denoising beat plain LM for transfer, and among denoising variants the differences were modest - the paper is honest that span corruption's advantage over BERT-style masking was largely about EFFICIENCY (shorter targets) rather than a large quality gap. Average span length 3 and corruption rate 15% were chosen by sweep, and performance was fairly flat across nearby values. That flatness is itself worth reporting: the big win was 'denoise rather than pure LM', and the fine-tuning of the denoising scheme was second-order. WHERE IT WENT AFTERWARDS. UL2 generalized it into a MIXTURE of denoisers - short spans, long or aggressive spans, and pure prefix continuation - with a mode token, and showed a single model could get both understanding and generation strength that way. And the general principle transferred cleanly out of NLP: SpanBERT for encoders, and the same 'mask contiguous structure, not independent atoms' logic underlies masked image modelling with block masking. THE ONE-LINE VERSION for an interview: mask contiguous spans and make the model generate them, because independent-token masking leaves too many local shortcuts and produces targets that are wastefully long."
        },
        {
          "q": "You need multilingual translation for 20 language pairs. Which architecture and why?",
          "a": "I would build ONE MULTILINGUAL ENCODER-DECODER, not 20 bilingual models and not a decoder-only LLM, and the reasoning has several independent legs. WHY ENCODER-DECODER FOR TRANSLATION SPECIFICALLY. (1) It is the canonical sequence-transduction shape: a complete source sentence read bidirectionally, and a target generated conditioned on it. The source is genuinely a different object from the target, which is exactly the asymmetry cross-attention exists to exploit. (2) BIDIRECTIONAL SOURCE ENCODING is worth real quality here because word order and agreement differ across languages - resolving a German verb at the end of a clause requires having read the end, and a causal encoder simply has not. (3) The COMPUTE PROFILE fits: encode once, decode against a cached memory, with the decoder's self-attention only over the target. (4) The whole field's evidence base - the original transformer, Marian, mBART, M2M-100, NLLB - is encoder-decoder, which means the recipes, the tokenizers, and the tooling all exist. WHY ONE MULTILINGUAL MODEL RATHER THAN 20 BILINGUAL ONES. (a) Twenty models is twenty training runs, twenty deployments, twenty monitoring surfaces, and twenty things to keep in sync - operationally this dominates everything else. (b) TRANSFER: low-resource pairs benefit substantially from high-resource ones through a shared representation, and this is the single strongest argument. (c) ZERO-SHOT PAIRS: a model trained on X-to-English and English-to-Y can often translate X-to-Y directly, which is how you cover 20x19 directions without 380 datasets. (d) One shared vocabulary and one serving path. THE COSTS I would go in expecting. THE CURSE OF MULTILINGUALITY: at fixed capacity, adding languages eventually degrades each one, so you need more parameters than a bilingual model and you should plan for it. Sampling has to be TEMPERATURE-BALANCED (T ~ 5 is a common setting) so high-resource pairs do not swamp the low-resource ones - naive proportional sampling is the classic mistake. And the TOKENIZER must be trained on balanced multilingual data, or scripts under-represented in it get shredded into many pieces, which raises cost and hurts quality for exactly the languages that can least afford it. WHY NOT A DECODER-ONLY LLM? This is the part that has genuinely changed and I would not be dogmatic. Large LLMs are now competitive or better on HIGH-RESOURCE pairs, and they bring things a dedicated NMT model cannot: document-level context, controllable formality and terminology, and the ability to follow an instruction about the translation. But for this spec I would still choose the dedicated model, because (i) a 300M-1B NMT model runs at a small fraction of the latency and cost of an LLM, which matters at translation volume; (ii) LLM quality on low-resource languages is materially worse and highly uneven; and (iii) dedicated models are more controllable and less prone to omission, embellishment, or refusing. WHAT I WOULD ACTUALLY DO: fine-tune NLLB-200 or mBART-50 on in-domain data for the 20 pairs rather than training from scratch, which gets multilingual transfer for free. Evaluate with COMET or another learned metric rather than BLEU - BLEU is known to correlate poorly with human judgment across languages and rewards surface overlap. Then keep an LLM in the loop for the things it is uniquely good at: post-editing, terminology enforcement, and handling the long tail where the NMT model's confidence is low."
        },
        {
          "q": "The original transformer was an encoder-decoder. Why did the field split it apart?",
          "a": "THE STARTING POINT. 'Attention Is All You Need' (2017) was a MACHINE TRANSLATION paper. Its encoder-decoder structure was inherited wholesale from the RNN seq2seq models it replaced - the contribution was removing recurrence, not rethinking the factorization. So the encoder-decoder is the ancestor and the two single-stack families are both SIMPLIFICATIONS of it, which reverses how the three are usually presented. THE SPLIT, and what each half was chasing. GPT (June 2018) kept only the DECODER. The reasoning was that if your goal is a general language model, next-token prediction on unlabelled text is the objective, and it needs no encoder because there is no separate input - the prompt and the continuation are one sequence. Discarding the encoder halved the parameters at a given depth and made pretraining maximally simple. BERT (October 2018) kept only the ENCODER. The reasoning was that for UNDERSTANDING tasks, causality is a pure handicap - you have the whole input, so hiding half of it from every token throws away information for nothing. Masked language modelling was invented precisely to make a bidirectional stack trainable. Both papers appeared within months, and both immediately beat the state of the art on their respective task families. That is the split: not a schism, but two teams noticing that half the machinery was dead weight for their goal. WHY THE HALVES DIVERGED SO SHARPLY AFTERWARDS. Each simplification unlocked a different scaling story. BERT's encoder scaled to a few hundred million parameters and then the returns flattened for its task set - GLUE saturated, and there was no obvious next thing to want from a bigger encoder. GPT's decoder scaled to billions and kept producing NEW CAPABILITIES rather than incremental accuracy: few-shot learning, instruction following, code, reasoning. That asymmetry in the returns to scale is what determined where the compute went, and compute allocation determined everything downstream - the tooling, the talent, the ecosystem. WHY ENCODER-DECODER PERSISTED IN THE MIDDLE. T5 (2019) argued for it explicitly and won its own controlled ablation. BART did the same for generation. Both remained standard in translation, summarization, and speech, where the input/output asymmetry is real. Whisper is an encoder-decoder and is current. So it never died; it was outgrown in ATTENTION rather than in merit. WHAT I THINK THE REAL LESSON IS, because this question is usually testing whether you can reason about the field rather than recite it. The field did not converge on decoder-only because it is architecturally superior - T5's evidence says otherwise at matched budget, and Wang et al. showed the ranking flips with the downstream protocol. It converged because a single causal stack trained on next-token prediction gave the most GENERAL INTERFACE - one model, any task, no head, no labels - and generality compounds. Every additional unit of compute spent on that one artifact benefits every task at once, whereas compute spent on an encoder-decoder for summarization benefits summarization. That is an economic argument about where capability accumulates, and it is the same argument that explains a lot of what has happened since. It also implies the split could partially reverse: if inference economics ever dominate again - long documents, short outputs, at enormous volume - the encoder-decoder's amortization advantage is still sitting there, unclaimed."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The three families in one sentence",
        "back": "One architecture, three attention masks: encoder = full bidirectional, decoder = causal lower-triangular, encoder-decoder = both stacks joined by cross-attention. The mask is the difference."
      },
      {
        "type": "definition",
        "front": "Cross-attention",
        "back": "Queries from the DECODER, keys and values from the ENCODER output. The only channel by which the input reaches the generated sequence. Adds ~4d^2 parameters per decoder layer."
      },
      {
        "type": "definition",
        "front": "Prefix-LM",
        "back": "Bidirectional within a prefix, causal after it. The general case: prefix = whole sequence gives an encoder, prefix = empty gives a decoder. Used by UL2 and PaLM."
      },
      {
        "type": "intuition",
        "front": "T5's ablation result",
        "back": "At MATCHED parameters and FLOPs, encoder-decoder + span corruption transferred best - the opposite of what the field adopted. Worth knowing because most architecture comparisons do not match budget at all."
      },
      {
        "type": "intuition",
        "front": "Why decoder-only actually won",
        "back": "Signal at every position, one model for every task via prompting, in-context learning at scale, simplest inference. Interface generality and economics - NOT better language understanding."
      },
      {
        "type": "definition",
        "front": "Span corruption (T5)",
        "back": "Mask CONTIGUOUS spans (avg ~3 tokens), replace each with one sentinel, generate the spans as the target. Harder than independent masking (no partial-word crutch), shorter targets (cheaper), and teaches variable-length generation."
      },
      {
        "type": "intuition",
        "front": "Input/output ratio picks the family",
        "back": "Long-in / short-out (summarize, translate, transcribe) -> encoder-decoder: encode once, amortize over the output; decoder cache 40x smaller. Growing conversation -> decoder-only: cache reuses across turns, no stable input/output split."
      },
      {
        "type": "pitfall",
        "front": "Unfair architecture comparisons",
        "back": "An L-layer encoder-decoder has ~2x the parameters of an L-layer decoder plus cross-attention. Match parameters AND FLOPs, or the gap you measured is a budget difference."
      },
      {
        "type": "pitfall",
        "front": "Decoder-only embeddings",
        "back": "Causal attention means token 1 saw only itself and token T saw everything, so mean-pooling averages incomparable things. Fix: LLM2Vec - drop the causal mask, briefly continue pretraining, then contrastive fine-tune."
      },
      {
        "type": "intuition",
        "front": "Objective > architecture",
        "back": "T5, UL2, ELECTRA and Wang et al. (2022) all point the same way: the pretraining objective explains more variance than the mask, and the ranking of architectures flips with the downstream protocol. Adaptation between families is also cheap."
      }
    ],
    "refs": [
      {
        "title": "Raffel et al. (2020), Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)",
        "url": "https://arxiv.org/abs/1910.10683"
      },
      {
        "title": "Wang et al. (2022), What Language Model Architecture and Pretraining Objective Work Best for Zero-Shot Generalization?",
        "url": "https://arxiv.org/abs/2204.05832"
      },
      {
        "title": "Tay et al. (2022), UL2: Unifying Language Learning Paradigms",
        "url": "https://arxiv.org/abs/2205.05131"
      },
      {
        "title": "Lewis et al. (2019), BART: Denoising Sequence-to-Sequence Pre-training",
        "url": "https://arxiv.org/abs/1910.13461"
      },
      {
        "title": "BehnamGhader et al. (2024), LLM2Vec: Large Language Models Are Secretly Powerful Text Encoders",
        "url": "https://arxiv.org/abs/2404.05961"
      }
    ],
    "demos": [
      "attention",
      "multi-head-attention",
      "decoding",
      "beam-search"
    ]
  },
  "fine-tuning-transformers": {
    "level": "core",
    "body": {
      "intuition": [
        "Fine-tuning is the whole reason pretraining is worth doing: you spend enormous compute once to learn a general representation, then spend a few GPU-minutes per task adapting it. The mechanics are almost embarrassingly simple - attach a randomly-initialized head, train everything with a small learning rate for a few epochs - and the recipe (AdamW, 2e-5, 3 epochs, warmup then linear decay) is so stable across tasks that it has become folklore.",
        "The part that is NOT folklore, and that most people learn the hard way, is that this procedure is genuinely UNSTABLE when the dataset is small. On the small GLUE tasks, fine-tuning BERT-large diverges to majority-class performance on a substantial minority of random seeds - Dodge et al. found that changing only the seed produced a range of results wider than the gaps between competing published methods. That is a serious claim about a whole literature: a paper reporting a one-point improvement from a single run may be reporting a lucky seed. Once you have seen it, you stop trusting any small-data fine-tuning number that comes without a spread.",
        "The other thing worth internalizing early is that you are ADJUSTING a representation, not learning one, and that framing explains almost every hyperparameter. The learning rate is ~100x smaller than you would use from scratch because large steps destroy what you paid for. Warmup exists because the random head emits large, meaningless gradients in the first few steps and those flow straight into the pretrained body. Layer-wise decay exists because lower layers encode general features that need almost no change while upper layers are task-specific. Early stopping exists because with a few thousand examples and 110 million parameters, three epochs is often one too many."
      ],
      "math": [
        {
          "h": "Layer-wise learning rate decay",
          "paras": [
            "Give each layer its own learning rate, decaying geometrically as you go down the stack. Lower layers encode general lexical and syntactic features that transfer as-is; upper layers are specialized to the pretraining objective and need the most adjustment. This is ULMFiT's discriminative fine-tuning, and it remains one of the cheapest stability wins available."
          ],
          "tex": "\\eta_{\\ell} = \\eta_{\\mathrm{top}} \\cdot \\xi^{\\,L-\\ell}, \\qquad \\xi \\in [0.65, 0.95]",
          "texNote": "With L = 12 and xi = 0.9, layer 1 trains at 0.9^11 ~ 0.31 of the top rate; with xi = 0.65 it is 0.65^11 ~ 0.009, i.e. effectively frozen. Smaller xi means stronger regularization toward the pretrained weights - use it when data is scarce."
        },
        {
          "h": "Warmup, and what it is protecting against",
          "paras": [
            "The head is random, so its initial gradients are large and point nowhere useful, and they propagate into the pretrained body. Warmup keeps the step size near zero while the head finds its bearings; the decay afterwards is standard annealing."
          ],
          "tex": "\\eta(t) = \\eta_{\\max} \\cdot \\min\\!\\left(\\frac{t}{t_w},\\; \\frac{T - t}{T - t_w}\\right), \\qquad t_w \\approx 0.06\\,T",
          "texNote": "6-10% of total steps is the usual warmup fraction. Mosbach et al. showed that omitting warmup - or omitting Adam's bias correction, which BERT's original TensorFlow implementation did - is a direct cause of the divergent runs on small datasets."
        },
        {
          "h": "Why fine-tuning can be WORSE than a linear probe out of distribution",
          "paras": [
            "Kumar et al. (2022) gave the clean account. Fine-tuning updates the features to fit the head; when the head starts random, the early updates distort the pretrained features to accommodate a meaningless target. In-distribution this is harmless because the features re-fit the data, but OUT of distribution the distorted features have lost generality. The fix, LP-FT, is to train the head first with the body frozen, then fine-tune everything."
          ],
          "tex": "\\text{ID: } \\mathrm{FT} \\ge \\mathrm{LP} \\qquad \\text{OOD: } \\mathrm{LP} \\text{ can beat } \\mathrm{FT} \\qquad \\text{LP-FT} \\ge \\text{both}",
          "texNote": "The mechanism is that a random head's gradient has a large component orthogonal to anything useful, and the body absorbs it. Two lines of code - freeze, train head, unfreeze - buy most of the fix."
        }
      ],
      "code": [
        {
          "h": "The recipe, with the stability measures included",
          "paras": [
            "This is the version worth using by default, not the minimal one. Every extra piece here is answering a documented failure mode."
          ],
          "code": "from torch.optim import AdamW\nfrom transformers import get_linear_schedule_with_warmup\n\ndef param_groups(model, base_lr=2e-5, decay=0.9, wd=0.01):\n    \"\"\"Layer-wise LR decay + no weight decay on bias/LayerNorm.\"\"\"\n    no_decay = (\"bias\", \"LayerNorm.weight\")\n    groups, L = [], model.config.num_hidden_layers\n    for name, p in model.named_parameters():\n        if not p.requires_grad:\n            continue\n        if \"embeddings\" in name:            depth = 0\n        elif \"encoder.layer.\" in name:      depth = int(name.split(\"encoder.layer.\")[1].split(\".\")[0]) + 1\n        else:                               depth = L + 1        # head\n        groups.append({\n            \"params\": [p],\n            \"lr\": base_lr * decay ** (L + 1 - depth),\n            \"weight_decay\": 0.0 if any(n in name for n in no_decay) else wd,\n        })\n    return groups\n\nopt = AdamW(param_groups(model), eps=1e-8)   # AdamW applies bias correction -\n                                             # BERT's original impl did NOT, and\n                                             # that omission caused divergent runs\ntotal = len(loader) * EPOCHS\nsched = get_linear_schedule_with_warmup(opt, int(0.1 * total), total)\n\nfor epoch in range(EPOCHS):\n    for batch in loader:\n        loss = model(**batch).loss\n        loss.backward()\n        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)\n        opt.step(); sched.step(); opt.zero_grad()",
          "caption": "Warmup, bias correction, gradient clipping, layer-wise decay, and no weight decay on bias/LayerNorm. None of these is exotic; together they are most of the difference between a recipe that converges on every seed and one that does not."
        },
        {
          "h": "Measuring the seed variance instead of hoping it is small",
          "paras": [
            "If you take one thing from this lesson into practice, make it this. The cost is a few extra runs; the benefit is knowing whether your improvement exists."
          ],
          "code": "import numpy as np\n\nscores = []\nfor seed in range(5):\n    torch.manual_seed(seed)\n    model = AutoModelForSequenceClassification.from_pretrained(CKPT, num_labels=K)\n    scores.append(train_and_eval(model, seed))\n\nprint(f\"{np.mean(scores):.3f} +/- {np.std(scores):.3f}   min={min(scores):.3f}\")\n\n# Representative behaviour on a small GLUE task (RTE, ~2.5k examples), BERT-large:\n#   seed 0: 0.703   seed 1: 0.688   seed 2: 0.527  <- degenerate: majority class\n#   seed 3: 0.715   seed 4: 0.531  <- degenerate\n#\n# Two of five runs collapsed. Reporting max() here would claim 0.715; reporting\n# a single unlucky run would claim 0.527. The published differences between\n# competing methods on this task are often smaller than that spread, which is\n# why single-seed small-data comparisons should not be believed.\n#\n# Mosbach et al.: the cause is largely OPTIMIZATION, not overfitting - vanishing\n# gradients early in training plus the missing Adam bias correction. Longer\n# training with warmup and proper bias correction removes most of the failures.",
          "caption": "Two of five seeds collapsing to majority class is normal on small datasets, not a bug in your code. Always report mean and spread; a single run on a few-thousand-example task carries almost no information."
        }
      ],
      "useCases": [
        "Task-specific models at production volume: a fine-tuned 110-300M encoder for classification, tagging, or extraction runs at a fraction of the latency and cost of prompting a large model, with calibrated probabilities you can threshold.",
        "Domain adaptation in two stages - continued pretraining on unlabelled in-domain text, then supervised fine-tuning on your labels. This is the highest-return sequence when your text is clinical, legal, financial, or code, and it routinely beats fine-tuning a general model directly.",
        "Intermediate-task transfer (STILT): fine-tune on a large related task first (MNLI is the classic bridge for sentence-pair tasks), then on your small target task. On small GLUE tasks this both raises the mean and dramatically reduces the seed variance.",
        "Distilling a large model's behaviour into a small one: label a corpus with an LLM, fine-tune a small encoder on those labels, and deploy the encoder. The standard path from an expensive prototype to an affordable production system."
      ],
      "pitfalls": [
        "Reporting a single fine-tuning run on a small dataset. On few-thousand-example tasks a meaningful fraction of seeds collapse to majority-class, and the seed spread often exceeds the effect you are claiming. Run 3-5 seeds and report mean and standard deviation - this is the single most important habit in this lesson.",
        "Using a from-scratch learning rate. 1e-3 will destroy the pretrained weights in the first hundred steps. The 2e-5 to 5e-5 band is not superstition; it reflects that you are adjusting a representation rather than learning one.",
        "Skipping warmup, or using an Adam implementation without bias correction. Both are documented causes of the divergent runs, and both are free to fix.",
        "Fine-tuning everything when you have 500 examples. At that size, linear probing, LP-FT (probe first, then fine-tune), or a PEFT method will usually beat full fine-tuning, and will certainly be more stable.",
        "Assuming fine-tuning always beats a frozen backbone. In distribution it usually does; OUT of distribution a linear probe can win, because early updates from a random head distort the pretrained features. LP-FT is the cheap fix and should be the default when robustness matters.",
        "Ignoring the trivial baselines. TF-IDF plus logistic regression beats fine-tuned BERT more often than people expect on topical classification, and it takes ten minutes. If you cannot beat it convincingly, the problem is your data, not your model.",
        "Training past the point of overfitting because 'the paper said three epochs'. With a small dataset, evaluate every few hundred steps and early-stop on a real validation split; with a large one, three epochs may be far too few."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/bert",
          "text": "Fine-tuning is the payoff of masked pretraining - the whole point of learning a general representation is that this step is cheap."
        },
        {
          "ref": "fine-tuning/lora",
          "text": "PEFT methods make fine-tuning tractable at LLM scale and are also more STABLE at small n, because far fewer parameters can be distorted."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The seed-variance problem is a special case of the general point that a single held-out estimate on a small dataset is a noisy statistic - the discipline is the same."
        },
        {
          "ref": "neural-nets/adam-lr-scheduling",
          "text": "Warmup, bias correction, and decay schedules are exactly the optimizer details that decide whether fine-tuning converges here."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "LLM-labels-then-fine-tune-a-small-model is the standard production path, and it is distillation with a data-generation step in front."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the standard fine-tuning recipe?",
          "a": "AdamW at 2e-5 to 5e-5, 2-4 epochs, batch 16-32, linear warmup over the first 6-10% of steps then linear decay, weight decay 0.01 (not on bias/LayerNorm), gradient clipping at 1.0."
        },
        {
          "q": "Why such a small learning rate?",
          "a": "You are ADJUSTING a pretrained representation, not learning one. A from-scratch rate overwrites the pretrained weights before the head has learned anything - that is catastrophic forgetting."
        },
        {
          "q": "Why warmup?",
          "a": "The head is randomly initialized, so its first gradients are large and badly directed, and they flow into the pretrained body. Warmup keeps steps tiny while the head orients itself."
        },
        {
          "q": "What is layer-wise learning rate decay?",
          "a": "Scale the learning rate down by a factor (~0.65-0.95) per layer going down the stack. Lower layers hold general features that need little change; upper layers are objective-specific and need the most."
        },
        {
          "q": "How unstable is small-data fine-tuning?",
          "a": "Very. On small GLUE tasks a real fraction of seeds collapse to majority-class, and the seed spread frequently exceeds the differences between published methods. Always report 3-5 seeds."
        },
        {
          "q": "What causes that instability?",
          "a": "Mostly optimization: vanishing gradients early in training and the missing Adam bias correction in BERT's original implementation - not, primarily, overfitting. Warmup, bias correction, and longer training fix most of it."
        },
        {
          "q": "What is catastrophic forgetting here?",
          "a": "Overwriting pretrained knowledge during fine-tuning, usually from too high a learning rate or too many epochs. Symptom: training loss collapses while validation degrades."
        },
        {
          "q": "What is LP-FT?",
          "a": "Linear-probe first (head only, body frozen), then fine-tune everything. It prevents the random head's early gradients from distorting the features, and beats both pure probing and pure fine-tuning out of distribution."
        },
        {
          "q": "When does linear probing beat fine-tuning?",
          "a": "When the labelled set is very small, and out of distribution generally - fine-tuning distorts pretrained features to fit an initially-random head, which costs generality."
        },
        {
          "q": "What is intermediate-task transfer / STILT?",
          "a": "Fine-tune on a large related task (MNLI is the classic) before your small target task. It raises the mean AND sharply reduces seed variance on small datasets."
        },
        {
          "q": "What is continued pretraining?",
          "a": "Running the pretraining objective on your own unlabelled in-domain corpus before supervised fine-tuning. Highest-return step when your domain is far from web text."
        },
        {
          "q": "Why exclude bias and LayerNorm from weight decay?",
          "a": "Decay is a prior toward zero, which is meaningful for weight matrices and meaningless-to-harmful for biases and normalization scales - shrinking a LayerNorm gain toward zero just suppresses the layer."
        }
      ],
      "standard": [
        {
          "q": "Fine-tuning BERT on your 3,000-example dataset gives wildly different results across runs. Diagnose and fix it.",
          "a": "FIRST: THIS IS EXPECTED, NOT A BUG IN YOUR CODE. Small-dataset fine-tuning of large pretrained transformers is a documented instability. Dodge et al. (2020) showed that varying ONLY the random seed on small GLUE tasks produces a spread of outcomes wider than the gaps between competing published methods, and that a fraction of runs collapse entirely to majority-class prediction. Recognizing this immediately is the right first move, because the alternative - hunting for a bug - wastes a day. WHAT THE SEED ACTUALLY CONTROLS, since 'the seed' is three different things. (1) The HEAD INITIALIZATION - a randomly initialized classifier whose early gradients propagate into the pretrained body. (2) The DATA ORDER - which examples appear in the first few batches, when the learning rate is rising and the model is most plastic. (3) Dropout masks. Dodge et al. found (1) and (2) both matter substantially and roughly independently. DIAGNOSIS - what I would look at, in order. (a) Plot the TRAINING LOSS of the good and bad runs together. If a bad run's loss stays flat near ln(K) and never descends, it is an OPTIMIZATION failure - the model never escaped the initial region. If the training loss descends fine but validation degrades, it is overfitting or forgetting. These have different fixes and the plot distinguishes them in seconds. (b) Check the gradient norms in the first hundred steps - the failure signature is vanishing gradients through the lower layers. (c) Check whether the degenerate runs predict a single class, which confirms collapse. THE FIXES, roughly in order of return on effort. (1) USE ADAM WITH BIAS CORRECTION. BERT's original TensorFlow optimizer omitted it, and Mosbach et al. identified that omission as a direct cause of divergence; PyTorch's AdamW includes it, so this is often free. (2) WARMUP over 10% of steps, which protects the body from the random head's opening gradients. (3) TRAIN LONGER - counterintuitively, Mosbach et al. found that more epochs (up to 20 on small tasks) with early stopping REDUCES variance rather than increasing it, because the failures are runs that never converged rather than runs that overfit. (4) LOWER THE LEARNING RATE and add layer-wise decay (xi ~ 0.9), which keeps the lower layers near their pretrained values. (5) RE-INITIALIZE THE TOP FEW LAYERS. Zhang et al. showed that discarding the top 3-6 pretrained layers and reinitializing them improves both mean and variance - those layers are the most specialized to the pretraining objective and are often the least useful for your task. (6) INTERMEDIATE-TASK TRANSFER: fine-tune on MNLI first, then on your task. For sentence-pair tasks this is dramatic, and it works partly because the head is no longer starting from noise. (7) SWITCH TO PEFT - LoRA and adapters are noticeably more stable at small n, because there are far fewer parameters available to be distorted. (8) MIXOUT, which stochastically replaces weight updates with the pretrained values - an explicit regularizer toward the starting point. WHAT I WOULD DO WITH THE RESULT, which matters as much as the fix. Report MEAN AND STANDARD DEVIATION over at least five seeds, never a single run and never the maximum. If you are comparing two approaches, the comparison is only meaningful if the difference exceeds the seed spread - and on a 3,000-example dataset it frequently does not, which is a legitimate finding to report. And ensemble if you can afford it: averaging predictions over five fine-tuned models both raises accuracy and eliminates the risk of shipping a degenerate run, which on a small dataset is often the most valuable thing you can do with five runs you already had to do anyway.",
          "deepDive": {
            "q": "Why does fine-tuning sometimes hurt out-of-distribution performance, and what is the fix?",
            "a": "THE PHENOMENON. Fine-tuning almost always improves IN-DISTRIBUTION accuracy over a frozen backbone with a linear head. But Kumar et al. (2022) showed that on distribution SHIFT, the ordering can reverse: a linear probe on frozen features can beat full fine-tuning, sometimes substantially. That is surprising, because fine-tuning is strictly more expressive - it can represent whatever the probe represents. THE MECHANISM, which is the interesting part. Consider the two components: pretrained FEATURES and a randomly initialized HEAD. At step zero the head is noise, so its gradient with respect to the features is essentially arbitrary - it points toward whatever would make the current random head fit the data. The body absorbs that gradient and the features MOVE in a direction determined by noise. Because the features are being dragged to accommodate the head rather than the head being fitted to the features, the early phase of fine-tuning DISTORTS the pretrained representation. In distribution this does not matter: the features and head co-adapt and end up fitting the training distribution well. Out of distribution it matters a great deal, because the distortion has destroyed exactly the general structure that pretraining bought and that OOD generalization depends on. Kumar et al. formalized this in an overparameterized linear setting: fine-tuning changes features in the directions spanned by the training data while leaving orthogonal directions at their pretrained values, producing a feature map that is inconsistent between the two subspaces - and that inconsistency is what OOD data exposes. THE FIX - LP-FT. Two stages. First LINEAR PROBE: freeze the body, train only the head to convergence. Now the head is a good, low-noise readout of the pretrained features. Then FINE-TUNE everything at a small learning rate. Because the head is already near-optimal, the gradient reaching the body is small and well-directed, so features are refined rather than distorted. This gets you the ID accuracy of fine-tuning and much of the OOD robustness of probing, and it costs one extra cheap training stage. It is a two-line change and should arguably be the default. RELATED APPROACHES, all attacking the same problem. (a) WISE-FT: fine-tune normally, then linearly INTERPOLATE the fine-tuned and pretrained weights (w = alpha*w_ft + (1-alpha)*w_pre). Astonishingly, this often improves BOTH ID and OOD simultaneously - the interpolation path stays in a low-loss region and the midpoint inherits robustness from the pretrained endpoint. (b) Small learning rates and layer-wise decay, which limit distortion by construction. (c) PEFT - LoRA and adapters constrain updates to a low-rank or bottlenecked subspace, so the pretrained features cannot be moved far; this is part of why PEFT often shows better OOD behaviour than full fine-tuning at similar ID accuracy. (d) Regularizing explicitly toward the pretrained weights (L2-SP, Mixout). THE BROADER LESSON I would draw. There is a real tension between FITTING the target distribution and PRESERVING pretrained generality, and standard fine-tuning resolves it entirely in favour of fitting, without ever asking. Every method above is a way of putting a thumb on the other side of the scale. It also reframes what pretrained features ARE: not a starting point to be improved, but an asset that fine-tuning spends. And practically, it means that if you care about robustness you must EVALUATE out of distribution - an ID validation set will show fine-tuning winning and will never reveal the trade."
          }
        },
        {
          "q": "How would you decide between full fine-tuning, PEFT, linear probing, and prompting?",
          "a": "THE DECISION IS DRIVEN BY THREE VARIABLES: how much labelled data you have, how big the model is, and how many tasks you must serve. Let me take them as a decision procedure. STEP 1 - HOW MUCH LABELLED DATA? Under ~100 examples: PROMPTING or few-shot, because no gradient-based method has enough signal to beat a good prompt, and fine-tuning at this size is a variance generator. 100-1,000: PEFT (LoRA, adapters) or LP-FT - full fine-tuning is unstable here and PEFT's restricted update space is an effective regularizer. 1,000-10,000: full fine-tuning of a small-to-mid encoder becomes the strongest option, with the stability measures applied and multiple seeds. Above ~10,000: full fine-tuning, comfortably, and the instability problem largely disappears. STEP 2 - HOW BIG IS THE MODEL? Under ~1B parameters, full fine-tuning is cheap and there is little reason to avoid it. Above that, full fine-tuning needs optimizer states and gradients at roughly 12-16 bytes per parameter, so a 7B model wants ~100GB+ of accelerator memory and a 70B model is out of reach without a cluster - PEFT becomes not a preference but a requirement. QLoRA extends this further by quantizing the frozen base to 4-bit and training LoRA adapters on top, which puts 70B fine-tuning on a single large GPU. STEP 3 - HOW MANY TASKS? One task: full fine-tune, simplest thing that works. Many tasks with one base model: PEFT decisively - LoRA adapters are megabytes rather than gigabytes, you can hot-swap them against a shared base at serving time, and you avoid maintaining N full copies. This operational argument is usually the one that actually decides it in production. Many tasks that change weekly: prompting, because the iteration loop is minutes rather than hours. WHAT EACH METHOD ACTUALLY BUYS. LINEAR PROBING: fastest, most stable, best OOD robustness, lowest ceiling. Genuinely underrated as a BASELINE - if a probe gets within a point of your fine-tune, the fine-tune is not earning its complexity. PEFT: within ~1 point of full fine-tuning on most tasks, 100-1000x fewer trained parameters, more stable at small n, better OOD behaviour, and trivially composable. The gap widens when the target task is far from pretraining, where the model genuinely needs to move. FULL FINE-TUNING: highest ceiling, especially for domain shift and for tasks requiring new capabilities rather than new readouts. Most expensive, least stable at small n, and produces a full model copy per task. PROMPTING: zero training cost, instant iteration, no labelled data needed, but higher inference cost per call, weaker on specialized formats and domains, and harder to make reliably consistent. THE ANSWER I ACTUALLY GIVE in a design review, because it is a sequence rather than a choice: prompt first to establish feasibility and generate a baseline, use the prompted model to LABEL data, then fine-tune a small model on those labels for production. You get the LLM's flexibility during development and the small model's economics at scale. The decision is a lifecycle, and treating it as a single fork is the most common framing error."
        },
        {
          "q": "You have 200,000 unlabelled in-domain documents and 2,000 labelled examples. What is your plan?",
          "a": "This is the classic two-stage setup and the plan is well established, but the ORDER and the baselines matter more than the technique. STEP 1 - BASELINES FIRST, before any pretraining. (a) Majority class. (b) TF-IDF plus logistic regression, which takes ten minutes and beats fine-tuned transformers more often than people admit on topical tasks. (c) Off-the-shelf fine-tuning of a general pretrained model on the 2,000 labels. (d) A zero-shot or few-shot LLM. These four numbers frame everything and occasionally end the project - if (b) is already good enough, you are done. Skipping this step and going straight to domain-adaptive pretraining is the most common way to spend three weeks unnecessarily. STEP 2 - DOMAIN-ADAPTIVE PRETRAINING (DAPT). Continue masked language modelling on the 200,000 unlabelled documents starting FROM an existing checkpoint - never from scratch, since 200k documents is nowhere near enough to learn a representation. Gururangan et al. ('Don't Stop Pretraining') measured this carefully and found consistent gains from DAPT across four domains, with the gains LARGEST when the domain is furthest from the pretraining corpus. They also introduced TASK-ADAPTIVE pretraining (TAPT) - MLM on the task's own unlabelled text, which is a much smaller corpus but exactly on distribution - and found DAPT followed by TAPT best of all. Practical details: a few epochs is usually enough, monitor DOWNSTREAM performance rather than MLM loss (the pretraining loss tells you almost nothing about transfer), and checkpoint periodically because more is not monotonically better. STEP 3 - CHECK THE TOKENIZER, which people skip and should not. Measure FERTILITY - average subword pieces per word - on your domain. If specialist vocabulary is being shredded into four or five pieces, the model is spending capacity reassembling terms it should know. You can add domain tokens and initialize their embeddings as the mean of their constituent subwords, then let DAPT train them. SciBERT's advantage over BERT on scientific text is substantially a vocabulary story, not only a weights story. STEP 4 - FINE-TUNE ON THE 2,000 LABELS, carefully, because this is the fragile step. Layer-wise LR decay, warmup, early stopping on a proper validation split, and 3-5 seeds with mean and spread reported. Consider LP-FT and consider PEFT - at 2,000 examples both are competitive and both are more stable. STEP 5 - USE THE UNLABELLED DATA A SECOND TIME, since DAPT is not the only way to exploit it. PSEUDO-LABELLING: train on the 2,000, predict on the 200,000, keep high-confidence predictions, retrain. This is often complementary to DAPT because it uses the unlabelled data for the TASK rather than for the representation. Consistency-regularization methods (UDA, FixMatch-style) do something similar with augmentation. STEP 6 - AND THE HIGHEST-VALUE OPTION, which I would raise first in any real project: ACTIVE LEARNING. If labelling more is possible at all, use the model's uncertainty to select the next 500 documents to label. Going from 2,000 to 2,500 well-chosen labels typically buys more than any algorithmic change on this list, and it is worth saying so before proposing a month of pretraining. EVALUATION DISCIPLINE throughout: with 2,000 labels the validation set is small and noisy, so use cross-validation, split by the correct unit (document, author, time period - never randomly if there is leakage structure), and report confidence intervals. Many of the differences between the steps above will be inside the noise, and knowing that prevents chasing them."
        },
        {
          "q": "What is intermediate-task transfer, and when does it help or hurt?",
          "a": "THE IDEA. Instead of pretrained -> target, insert a stage: pretrained -> INTERMEDIATE TASK -> target. Phang et al. called it STILT (Supplementary Training on Intermediate Labeled Tasks). The canonical example is fine-tuning on MNLI (393k sentence-pair examples) before a small sentence-pair task like RTE (2.5k), and the gains are large - several points - alongside a dramatic reduction in seed variance. WHY IT WORKS, and there are three mechanisms worth separating. (1) SKILL TRANSFER: MNLI teaches sentence-pair reasoning - how to compare two texts and judge their relationship - which is precisely the skill RTE needs. The intermediate task supplies the abundant supervision the target task lacks. (2) A NON-RANDOM STARTING POINT: after the intermediate stage the model's upper layers are already organized for the task FORMAT, so the target fine-tune begins from a sensible place rather than from noise. This is why the variance reduction is so pronounced - it is attacking the same root cause as LP-FT and warmup. (3) IMPLICIT REGULARIZATION: the model has been pulled toward a region of weight space that generalizes for a related task, which constrains where the small target fine-tune can go. WHEN IT HELPS - the empirical picture from Pruksachatkun et al., who ran the large study across many intermediate/target pairs. Gains are most reliable when the intermediate task is LARGE, requires HIGH-LEVEL INFERENCE (NLI, QA, commonsense), and the target task is SMALL. MNLI and QQP are the most consistently useful intermediates for sentence-pair targets; SQuAD transfers well to other QA. The correlation the study found is informative: intermediate tasks that best predicted transfer were those requiring reasoning, not those most superficially similar in domain. WHEN IT HURTS - and it genuinely can, this is not a free lunch. NEGATIVE TRANSFER occurs when the intermediate task is small (so you are just adding noise and one more overfitting opportunity), when it is low-level (tagging, surface-form tasks transfer poorly to inference tasks), or when its output format or label semantics conflict with the target's. It can also induce forgetting: an aggressive intermediate fine-tune can degrade the pretrained representation before you ever reach the target task, which is the same feature-distortion problem in a different costume. The published results include plenty of negative cells in the transfer matrix, and there is no reliable a priori rule for predicting them - which is the honest answer to 'how do I pick the intermediate task?' You try a few and measure. THE MODERN CONTEXT, because this technique evolved rather than disappeared. Multi-task intermediate training (running many intermediate tasks jointly) is usually better than a single one, and that idea scaled into INSTRUCTION TUNING - T0, FLAN, and their successors are intermediate-task transfer with hundreds of tasks and a natural-language interface. The line from STILT to instruction tuning is direct: both are 'train on lots of supervised tasks between pretraining and deployment so the model learns the shape of tasks'. That framing is worth having, because it makes instruction tuning look less like a new idea and more like the scaled version of one that was already understood. PRACTICALLY, for a small sentence-pair or QA task today: starting from an MNLI-tuned checkpoint (they are freely available) instead of a raw pretrained one costs nothing and typically helps. It is one of the cheapest wins available and it is routinely overlooked."
        },
        {
          "q": "How do you fine-tune for token-level tasks, and what breaks that does not break for classification?",
          "a": "THE STRUCTURAL DIFFERENCE. Sequence classification needs one decision per example; token classification needs one per TOKEN, and the model's tokens are not your tokens. That single mismatch is the source of nearly every token-level fine-tuning bug. THE HEAD is simple: a shared linear layer applied at every position, producing per-token logits, with cross-entropy summed over valid positions. Nothing subtle. WHAT BREAKS. (1) SUBWORD ALIGNMENT, the big one. Your labels are per word; WordPiece or BPE splits words into pieces. The standard convention is to assign the word's label to its FIRST subword and set the remaining pieces to -100 so the loss ignores them, then aggregate back at inference. The failure mode is quiet and nasty: if you get this wrong, per-token accuracy still looks respectable - because the vast majority of tokens are 'O' and those are easy - while entity-level F1 is badly degraded. You will not notice from the metric you are probably watching. Use the tokenizer's word_ids() mapping rather than hand-rolling the alignment. (2) THE METRIC IS THE SECOND TRAP. Token accuracy is close to meaningless when ~85% of tokens are 'O' - a model predicting 'O' everywhere scores 85%. You must evaluate at the ENTITY level with exact span matching (the seqeval convention): a prediction counts only if the full span AND the type are right. A system at 99% token accuracy can be at 60% entity F1, and only the second number reflects whether the product works. (3) INVALID LABEL SEQUENCES. With BIO tagging, an independent per-token softmax can emit I-PER directly after O, or I-LOC after B-PER, which are structurally impossible. Three responses: post-hoc repair (cheap, works surprisingly well), CONSTRAINED VITERBI DECODING with a transition matrix that forbids illegal moves, or a CRF layer that learns transition scores and decodes jointly. The gain from a CRF on top of a strong transformer is smaller than it was on top of an LSTM - the contextual encoder already captures much of the tag dependency - but constrained decoding is nearly free and removes an entire class of embarrassing outputs. (4) CLASS IMBALANCE is extreme and structural, not incidental. Consider class weighting or focal loss, but be aware both can hurt calibration. (5) DOCUMENT BOUNDARIES AND WINDOWING. Long documents must be chunked, and an entity split across a chunk boundary is unrecoverable. Use a STRIDE so windows overlap, and reconcile predictions in the overlap region - typically by preferring the prediction from the window where the token sits furthest from an edge, since edge tokens have the least context. (6) CASING AND PREPROCESSING matter far more than for classification: capitalization is one of the strongest NER cues, so an uncased model is materially worse, and text that arrives lowercased (ASR output, some logs) needs a truecasing step or a model trained for it. WHAT I WOULD VERIFY BEFORE TRUSTING THE MODEL: decode a handful of examples end to end and eyeball the spans against the source text; confirm the entity-level F1 pipeline agrees with a manual count on ten examples; check the per-TYPE breakdown, since rare entity types are usually far worse than the aggregate suggests; and inspect boundary errors specifically - 'partially correct span' is the dominant error mode in practice and exact-match F1 scores it as both a false positive and a false negative, which is harsh but is also what most downstream consumers actually require."
        },
        {
          "q": "Your fine-tuned model scores well on the test set but poorly in production. How do you investigate?",
          "a": "I would treat this as a distribution problem until proven otherwise, and work through it in a fixed order rather than starting from the model. STEP 1 - IS THE TEST SET LEGITIMATE? Check for LEAKAGE first, because it is the most common cause and the most embarrassing to find late. Were train and test split randomly when they should have been split by document, user, session, or TIME? If the same customer's tickets appear in both, or near-duplicate texts straddle the split, your test score is measuring memorization. Deduplicate across the split (exact and near-duplicate, not just exact) and re-evaluate; a large drop confirms it. Also check whether any preprocessing was fitted on the full dataset before splitting. STEP 2 - IS PRODUCTION THE SAME DISTRIBUTION? Almost always not, and the useful move is to quantify it rather than assume. Compare input length distributions, vocabulary overlap, out-of-vocabulary and fertility rates, class balance, and the rate of things the training set never contained - empty inputs, other languages, boilerplate, HTML, truncated text. A cheap and effective diagnostic: train a binary classifier to distinguish training inputs from production inputs. If it succeeds easily, the distributions differ, and its most informative features tell you HOW. STEP 3 - IS THE PREPROCESSING IDENTICAL? Training-serving skew is a mundane and extremely common cause. Same tokenizer version, same truncation length and side, same normalization, same casing, same handling of special characters. Assert this in code rather than believing it - run one production example through both paths and compare the token IDs. STEP 4 - IS THE LABEL DEFINITION THE SAME? Training labels are often produced by a careful annotator with guidelines; production 'ground truth' often comes from a different process with different incentives. If your production metric is computed from user behaviour or agent overrides, it may be measuring something else entirely, and the model may be fine. STEP 5 - LOOK AT ERRORS BY HAND. Fifty production failures, read individually. This finds more in an hour than any dashboard, and it is the step people skip. Group them: are they long inputs (truncation), rare classes, a new topic that emerged after training, sarcasm or negation, or a systematically mislabelled category? STEP 6 - CHECK THE TEMPORAL AXIS specifically. Text distributions drift - new products, new slang, seasonal topics, changed workflows. If your test set is a random split of historical data, it contains future information relative to any given training point and will overstate performance. The honest evaluation is a TIME-BASED split: train on before, test on after. Doing this often reproduces the production gap immediately, and if it does, you have both your diagnosis and your future evaluation protocol. STEP 7 - CHECK CALIBRATION AND THRESHOLDS. If you deployed with a confidence threshold tuned on the test set, and production confidence is distributed differently, the operating point has moved even if the ranking is unchanged. Recalibrate on production data. THE FIXES, once diagnosed: retrain including production-like data (which is why you should be logging and sampling it for labelling from day one); use time-based splits going forward; add monitoring for input drift rather than only output metrics; set up a continuous labelled sample from production as your real evaluation set. AND THE PREVENTION, which is what I would push in a design review: the test set should be constructed to resemble deployment - same time period relationship, same population, same preprocessing path - before the first model is trained. Most of these gaps are decided at split time, months before anyone notices them."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The default fine-tuning recipe",
        "back": "AdamW 2e-5 to 5e-5, 2-4 epochs, batch 16-32, warmup 6-10% then linear decay, weight decay 0.01 excluding bias/LayerNorm, grad clip 1.0. Small LR because you are ADJUSTING a representation, not learning one."
      },
      {
        "type": "pitfall",
        "front": "Seed variance on small datasets",
        "back": "On few-thousand-example tasks a real fraction of seeds collapse to majority-class, and the spread often EXCEEDS the gap between published methods. Never report a single run; report mean +/- std over 3-5 seeds."
      },
      {
        "type": "intuition",
        "front": "What causes fine-tuning instability",
        "back": "Mostly OPTIMIZATION, not overfitting: vanishing gradients early plus the missing Adam bias correction in BERT's original impl. Fix with warmup, proper AdamW, and LONGER training with early stopping - more epochs reduces variance."
      },
      {
        "type": "definition",
        "front": "Layer-wise LR decay",
        "back": "eta_l = eta_top * xi^(L-l), xi ~ 0.65-0.95. Lower layers hold general features needing little change; upper layers are objective-specific. Smaller xi = stronger pull toward pretrained weights = use when data is scarce."
      },
      {
        "type": "definition",
        "front": "LP-FT",
        "back": "Linear-probe the head with the body frozen, THEN fine-tune everything. Stops a random head's early gradients from distorting pretrained features. Matches FT in-distribution and beats it out-of-distribution."
      },
      {
        "type": "intuition",
        "front": "Why FT can lose to a linear probe OOD",
        "back": "A random head's early gradient is arbitrary, and the body absorbs it - features get dragged to fit noise. ID this is harmless (they re-fit); OOD the lost generality shows. Fixes: LP-FT, WiSE-FT weight interpolation, PEFT, small LRs."
      },
      {
        "type": "definition",
        "front": "Intermediate-task transfer (STILT)",
        "back": "Fine-tune on a large related task (MNLI is the classic) before the small target task. Raises the mean AND sharply cuts seed variance. Scaled up, this idea became instruction tuning."
      },
      {
        "type": "intuition",
        "front": "Why warmup",
        "back": "The head is random, so its opening gradients are large and badly directed - and they flow into the pretrained body. Warmup holds the step size near zero until the head has oriented itself."
      },
      {
        "type": "pitfall",
        "front": "Token-task metric trap",
        "back": "~85% of tokens are 'O', so 99% token accuracy can hide 60% entity F1. Evaluate at the ENTITY level with exact span match (seqeval), and check the per-type breakdown."
      },
      {
        "type": "intuition",
        "front": "DAPT then TAPT",
        "back": "Continued MLM on your domain corpus (DAPT), then on the task's own unlabelled text (TAPT), then supervised fine-tuning. Gains are largest when the domain is furthest from web text; monitor DOWNSTREAM metrics, not MLM loss."
      },
      {
        "type": "pitfall",
        "front": "Skipping the trivial baselines",
        "back": "TF-IDF + logistic regression beats fine-tuned BERT more often than expected on topical tasks and takes ten minutes. If you cannot clearly beat it, the problem is the data, not the model."
      },
      {
        "type": "intuition",
        "front": "Choosing FT vs PEFT vs probe vs prompt",
        "back": "<100 labels: prompt. 100-1k: PEFT or LP-FT. 1k-10k: full FT with stability measures. >10k: full FT comfortably. Model >1B or many tasks on one base: PEFT. In practice it is a lifecycle - prompt, label with the LLM, fine-tune small for production."
      }
    ],
    "refs": [
      {
        "title": "Dodge et al. (2020), Fine-Tuning Pretrained Language Models: Weight Initializations, Data Orders, and Early Stopping",
        "url": "https://arxiv.org/abs/2002.06305"
      },
      {
        "title": "Mosbach et al. (2021), On the Stability of Fine-tuning BERT",
        "url": "https://arxiv.org/abs/2006.04884"
      },
      {
        "title": "Kumar et al. (2022), Fine-Tuning can Distort Pretrained Features and Underperform Out-of-Distribution",
        "url": "https://arxiv.org/abs/2202.10054"
      },
      {
        "title": "Gururangan et al. (2020), Don't Stop Pretraining: Adapt Language Models to Domains and Tasks",
        "url": "https://arxiv.org/abs/2004.10964"
      },
      {
        "title": "Pruksachatkun et al. (2020), Intermediate-Task Transfer Learning with Pretrained Language Models",
        "url": "https://arxiv.org/abs/2005.00628"
      }
    ],
    "demos": [
      "lr-schedule",
      "overfitting",
      "lora",
      "distillation"
    ]
  },
  "ner": {
    "level": "core",
    "body": {
      "intuition": [
        "Named entity recognition is the task of finding the spans in a text that refer to specific things - people, organizations, places, dates, drugs, gene names, invoice numbers - and labelling what kind of thing each one is. It is the workhorse of information extraction: before you can populate a database, link records, redact personal data, or build a knowledge graph, you have to find where the entities are.",
        "The reason it deserves its own lesson rather than being 'classification, but per token' is that its METRIC is unforgiving in a way sequence classification's is not. Around 85% of tokens in a typical NER corpus are 'O' - not part of any entity - so a model that predicts 'O' everywhere scores 85% token accuracy while being completely useless. The metric that matters is ENTITY-LEVEL F1 with exact span matching: you get credit only if you found the whole span and got its type right. A system at 99% token accuracy can sit at 60% entity F1, and the two numbers routinely move in different directions.",
        "That strictness has a consequence that shapes everything downstream: BOUNDARY ERRORS dominate. Predicting 'Bank of England' when the gold span is 'the Bank of England' scores as both a false positive and a false negative - two errors for one near-miss - even though for most consumers the extraction was fine. This is where NER stops being a modelling problem and becomes a specification problem. Whether determiners are included, whether nested entities are annotated, whether 'New York Times' is an organization or contains a location - these are ANNOTATION GUIDELINE decisions, and getting them wrong costs far more than any architecture choice. It is also why the benchmark ceiling is where it is: careful re-annotation found that over 5% of CoNLL-2003's test labels are simply wrong, which means the reported gap between the top systems is partly a measurement of who best fits the errors."
      ],
      "math": [
        {
          "h": "BIO tagging and the constraint it imposes",
          "paras": [
            "Span extraction is cast as per-token classification using a tagging scheme. BIO uses B-TYPE for the first token of an entity, I-TYPE for continuations, and O for outside, giving 2k+1 labels for k entity types. The scheme encodes span structure in a per-token label - and therefore admits sequences that decode to nothing valid."
          ],
          "tex": "\\mathcal{Y} = \\{O\\} \\cup \\{B\\text{-}t, I\\text{-}t : t \\in \\mathcal{T}\\}, \\qquad |\\mathcal{Y}| = 2|\\mathcal{T}| + 1",
          "texNote": "Invalid transitions exist by construction: O -> I-PER and B-PER -> I-LOC are both unreachable in any real annotation, but an independent per-token softmax can emit either. BIOES adds explicit End and Single tags, which gives a sharper signal at boundaries at the cost of 4k+1 labels."
        },
        {
          "h": "Constrained decoding: forbid the impossible transitions",
          "paras": [
            "Rather than picking the argmax at each position independently, score whole sequences with a transition matrix that assigns -inf to illegal moves and run Viterbi. This costs almost nothing and removes an entire class of malformed output."
          ],
          "tex": "\\hat{y} = \\arg\\max_{y} \\sum_{t=1}^{T}\\Big[ s_t(y_t) + A_{y_{t-1}, y_t} \\Big], \\qquad A_{ij} = -\\infty \\text{ if } i \\to j \\text{ is illegal}",
          "texNote": "s_t = the model's per-token logits. If A is LEARNED rather than fixed, this is a CRF layer. On top of a strong transformer the learned version adds little over hard constraints - the encoder already captures most tag dependency - but the hard constraints are free."
        },
        {
          "h": "Entity-level F1, and why it is harsher than it looks",
          "paras": [
            "A predicted entity counts as correct only if BOTH its span boundaries and its type match the gold annotation exactly. Partial overlap earns nothing and costs twice."
          ],
          "tex": "P = \\frac{|\\hat{E} \\cap E|}{|\\hat{E}|}, \\quad R = \\frac{|\\hat{E} \\cap E|}{|E|}, \\quad F_1 = \\frac{2PR}{P+R}, \\quad (s,e,t) \\in \\hat{E} \\cap E \\iff \\text{all three match}",
          "texNote": "One boundary slip produces a false positive AND a false negative. If your downstream consumer tolerates partial matches (fuzzy record linkage, highlighting), report a relaxed-match score alongside - but never INSTEAD, or you lose comparability."
        }
      ],
      "code": [
        {
          "h": "The alignment step that quietly breaks everything",
          "paras": [
            "Labels are per word; the model is per subword. This is the single most common source of silent NER bugs, and the tokenizer gives you the mapping - use it rather than reconstructing the alignment by hand."
          ],
          "code": "def align_labels(words, word_labels, tokenizer, label2id):\n    enc = tokenizer(words, is_split_into_words=True, truncation=True,\n                    max_length=512, return_overflowing_tokens=True, stride=128)\n    out = []\n    for i in range(len(enc[\"input_ids\"])):\n        word_ids, labels, prev = enc.word_ids(i), [], None\n        for wid in word_ids:\n            if wid is None:                      # [CLS], [SEP], padding\n                labels.append(-100)\n            elif wid != prev:                    # FIRST subword of a word -> real label\n                labels.append(label2id[word_labels[wid]])\n            else:                                # continuation subwords -> ignored\n                labels.append(-100)\n            prev = wid\n        out.append(labels)\n    return enc, out\n\n# Why -100 on continuations rather than I-TYPE: it avoids double-counting a single\n# word's decision and keeps the loss aligned with the word-level annotation. Either\n# convention works if applied consistently at TRAIN AND INFERENCE - the bug is\n# using different ones, which shows up as good token accuracy and broken entity F1.\n#\n# stride=128 keeps a 128-token overlap between windows so an entity split across a\n# chunk boundary survives in at least one window. Without it, long documents lose\n# every entity that straddles a 512-token edge - silently.",
          "caption": "Subword alignment plus overlapping windows. Both failure modes here are invisible in token accuracy and fatal to entity F1, which is why the metric choice and the data pipeline have to be fixed together."
        },
        {
          "h": "Evaluating at the entity level, and the numbers that motivate it",
          "paras": [
            "Decode spans, then compare sets of (start, end, type) triples. The gap between the two metrics is not a rounding difference."
          ],
          "code": "from seqeval.metrics import classification_report, f1_score\n\npreds  = [[id2label[p] for p, l in zip(P, L) if l != -100] for P, L in zip(all_preds, all_labels)]\ngolds  = [[id2label[l] for l in L if l != -100] for L in all_labels]\n\nprint(f1_score(golds, preds))                # entity-level, exact span + type match\nprint(classification_report(golds, preds))   # ALWAYS read the per-type breakdown\n\n# A representative CoNLL-2003-style result:\n#   token accuracy .............. 0.987\n#   entity-level micro F1 ....... 0.912\n#   per type:  PER 0.964   LOC 0.933   ORG 0.883   MISC 0.791\n#\n# Two things to take from this. (1) Token accuracy of 98.7% sounds finished; the\n# entity F1 is 7.5 points lower and the WORST type is 20 points lower still, so\n# the aggregate hides where the model actually fails. (2) ORG and MISC are hard\n# for the same reason: their boundaries are ambiguous in the guidelines, not in\n# the language. Most remaining errors are boundary slips, not type confusions.\n#\n# For context on the ceiling: Reiss et al. (2020) re-annotated CoNLL-2003 and\n# found >5% of TEST labels incorrect. Systems reported at 93-94 F1 are competing\n# inside the annotation noise, so small benchmark differences are not meaningful.",
          "caption": "Always print the per-type report, never just the micro average. The aggregate is dominated by the easy, frequent types, and the type you actually care about is often the worst one."
        }
      ],
      "useCases": [
        "PII detection and redaction: finding names, addresses, account numbers, and dates in documents before storage or sharing. Here RECALL dominates - a missed identifier is a compliance breach, while a false positive is a redacted word - so the operating point is set very differently from a benchmark.",
        "Populating structured records from unstructured text: extracting parties, dates, amounts, and jurisdictions from contracts; drugs, dosages, and conditions from clinical notes; companies and instruments from filings. NER is the first stage of nearly every document-to-database pipeline.",
        "Knowledge graph construction and entity linking, where NER finds the mentions and a linker resolves them to canonical identifiers - the two are separate problems and the linker is usually the harder one.",
        "Search and retrieval enrichment: recognizing entities in queries and documents to support faceted filtering, query understanding, and hybrid retrieval that combines lexical entity matching with dense similarity."
      ],
      "pitfalls": [
        "Reporting token accuracy. With ~85% of tokens labelled 'O', predicting 'O' everywhere scores 85%. Entity-level F1 with exact span matching is the only metric that reflects whether the system works - and always read the per-TYPE breakdown, since the aggregate hides the type you care about.",
        "Getting subword alignment wrong at inference but not at training (or vice versa). Token accuracy stays fine and entity F1 quietly collapses. Use the tokenizer's word_ids() mapping and apply the same convention in both paths.",
        "Chunking long documents without a stride. Entities that straddle a window boundary are unrecoverable, and nothing warns you. Overlap windows and reconcile in the overlap region, preferring the window where the token is furthest from an edge.",
        "Decoding tags independently per token. An unconstrained softmax emits sequences like O followed by I-PER that correspond to no possible annotation. Constrained Viterbi decoding with a hard transition matrix costs almost nothing and removes the whole class.",
        "Treating boundary errors as a modelling failure when they are a SPECIFICATION failure. 'Bank of England' vs 'the Bank of England' is a guideline decision, and inconsistent annotation of determiners, titles, and modifiers puts a hard ceiling on F1 that no architecture will lift.",
        "Assuming CoNLL-2003 numbers transfer. It is newswire from 1996-1997 with four coarse types; performance on clinical notes, legal text, chat, or ASR output is dramatically worse, and the gap is mostly domain and casing rather than difficulty of the task in the abstract.",
        "Ignoring nested and discontinuous entities because BIO cannot express them. 'University of Washington Medical Center' contains an organization inside an organization, and flat BIO forces you to pick one - which may be the wrong one for your consumer."
      ],
      "connections": [
        {
          "ref": "rnn-nlp/sequence-labeling",
          "text": "BIO tagging, CRFs, and Viterbi decoding predate transformers entirely - the encoder changed, the output structure and its constraints did not."
        },
        {
          "ref": "advanced-nlp/fine-tuning-transformers",
          "text": "Token-level fine-tuning is where subword alignment, windowing, and metric choice all bite at once; the classification recipe does not transfer unmodified."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "The 85%-'O' distribution is structural class imbalance, and it is why accuracy is the wrong metric and why per-class reporting is mandatory."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "Exact-span F1 is a deliberately strict proxy; whether it matches what your consumer needs is the same question that governs every generation metric."
        },
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "The overlapping-window problem in NER is the same boundary problem as document chunking for retrieval, with the same stride-and-reconcile answer."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is NER?",
          "a": "Finding spans of text that refer to specific entities - people, organizations, locations, dates, domain-specific types - and labelling each span's type. The first stage of most information-extraction pipelines."
        },
        {
          "q": "What is BIO tagging?",
          "a": "B-TYPE for the first token of an entity, I-TYPE for continuations, O for outside. Turns span extraction into per-token classification with 2k+1 labels for k types."
        },
        {
          "q": "What does BIOES add?",
          "a": "Explicit End and Single tags (4k+1 labels), giving a sharper training signal at boundaries. Slightly better in practice, at the cost of more labels and more sparsity per label."
        },
        {
          "q": "Why is token accuracy a bad metric here?",
          "a": "About 85% of tokens are 'O', so predicting 'O' everywhere scores 85%. Use entity-level F1 with exact span-and-type matching."
        },
        {
          "q": "How harsh is exact-span F1?",
          "a": "A one-token boundary slip counts as a false positive AND a false negative - two errors for one near-miss. This is why boundary errors dominate real error analyses."
        },
        {
          "q": "What are invalid BIO transitions?",
          "a": "Sequences no annotation could produce, like O -> I-PER or B-PER -> I-LOC. An independent per-token argmax can emit them; constrained Viterbi decoding cannot."
        },
        {
          "q": "Is a CRF layer still worth it on top of a transformer?",
          "a": "Marginally. The contextual encoder already captures most tag dependency, so the learned transitions add little - but HARD constrained decoding is nearly free and should be used regardless."
        },
        {
          "q": "How do you align word labels to subword tokens?",
          "a": "Label the first subword of each word, set continuations to -100 so the loss ignores them, and use the tokenizer's word_ids() mapping. Apply the same convention at training and inference."
        },
        {
          "q": "How do you handle documents longer than the context window?",
          "a": "Chunk with an overlapping STRIDE, then reconcile predictions in the overlap - preferring the window where the token sits furthest from an edge, since edge tokens have the least context."
        },
        {
          "q": "What are nested entities?",
          "a": "Entities contained inside other entities - 'University of Washington' inside 'University of Washington Medical Center'. Flat BIO cannot express them; span-based or layered approaches can."
        },
        {
          "q": "Why does casing matter so much for NER?",
          "a": "Capitalization is one of the strongest surface cues for names. Uncased models are materially worse, and lowercased input (ASR output, some logs) needs truecasing or a model trained for that condition."
        },
        {
          "q": "How clean is CoNLL-2003?",
          "a": "Not very. Re-annotation found over 5% of TEST labels incorrect, so systems reported at 93-94 F1 are competing inside the annotation noise. Treat small benchmark gaps as unmeasurable."
        }
      ],
      "standard": [
        {
          "q": "Design an NER system for extracting drug names, dosages, and adverse events from clinical notes.",
          "a": "I would treat this as a specification-and-data problem first and a modelling problem second, because in clinical NER the model is rarely the binding constraint. STEP 1 - PIN DOWN THE ANNOTATION GUIDELINES, before anything else. Clinical text makes the boundary questions unusually painful and every one of them must be decided explicitly and written down. Is the drug 'metformin' or 'metformin HCl' or 'metformin 500mg PO BID'? Is the dosage one entity or three (amount, unit, frequency)? Is a NEGATED mention ('patient denies chest pain') an adverse event? Is a HYPOTHETICAL or family-history mention ('mother had a reaction to penicillin') an event for this patient? These are not edge cases in clinical text - negation and non-patient attribution are pervasive, and a system that extracts them as positives is actively dangerous. I would budget real time for guideline development and measure INTER-ANNOTATOR AGREEMENT before training anything; if two clinicians agree at 0.7 F1, no model will exceed that and you have found your ceiling. STEP 2 - CHOOSE THE BASE MODEL, and here the domain matters enormously. General BERT is a poor fit: clinical text is dense with abbreviations, misspellings, non-standard syntax, and specialist vocabulary that a general tokenizer shreds. I would start from a domain model - BioClinicalBERT, PubMedBERT, or a modern clinical model - and check tokenizer FERTILITY on my own notes; if drug names are splitting into four or five subwords, that alone predicts weaker performance. Continued pretraining on my own unlabelled notes (of which there will be many) is the highest-return next step. STEP 3 - EXPLOIT THE STRUCTURE THE DOMAIN GIVES YOU FOR FREE, which is what distinguishes a real clinical system from a benchmark one. Drugs are a CLOSED-ISH SET: RxNorm exists, and gazetteer features or a dictionary-match channel combined with the neural model catches rare drugs the model has never seen and gives you a linkable identifier. Dosages are highly REGULAR - '500mg PO BID' is close to a grammar - so a rule-based extractor may beat a learned one and will certainly be more auditable. Adverse events are the genuinely hard part and need the model. Being willing to use rules where rules are correct is a strength, not a compromise. STEP 4 - HANDLE NEGATION AND ATTRIBUTION AS A SEPARATE STAGE. Do not ask the NER model to learn 'is negated' implicitly. Extract the mention, then run a dedicated assertion classifier (negated / historical / hypothetical / family / present) over each mention with its context. This is the standard clinical NLP architecture, it is far more accurate than folding it into the tag set, and it makes the failure modes inspectable. STEP 5 - PICK THE OPERATING POINT DELIBERATELY. For pharmacovigilance, RECALL on adverse events dominates - a missed event is a safety signal lost, a false positive is a reviewer's minute. I would tune the threshold for high recall, then put a human review queue behind it, and report a precision-recall curve rather than a single F1. This is also where calibration matters, because the review queue is thresholded on confidence. STEP 6 - EVALUATE HONESTLY. Entity-level F1 per type; a relaxed-boundary score alongside it (for dosage extraction, a boundary that includes the unit but not a trailing period is fine, and exact match punishes it); a temporal split, since clinical documentation practices change; and a split by SITE or CLINICIAN rather than randomly, because notes from one author are highly self-similar and a random split leaks. And I would evaluate the end-to-end task - did we correctly populate the medication record - not only the span task, because a boundary error that still resolves to the right RxNorm code is not a real error. THE RISKS I WOULD FLAG EXPLICITLY: PHI handling and where the model runs; that performance will differ across sites and specialties in ways the aggregate hides; and that the system should be positioned as decision support with human review rather than as an autonomous extractor.",
          "deepDive": {
            "q": "How do you handle nested, overlapping, and discontinuous entities, which flat BIO cannot represent?",
            "a": "THE LIMITATION. Flat BIO assigns exactly one label per token, so it can represent a partition of the text into disjoint spans and nothing else. Three real phenomena break that. NESTED: 'University of Washington Medical Center' is an organization containing 'Washington', a location, and arguably 'University of Washington', another organization. OVERLAPPING: two entities share tokens without one containing the other. DISCONTINUOUS: 'left and right ventricles' contains 'left ventricle' and 'right ventricle', neither of which is a contiguous span. These are not exotic - nested entities are common in biomedical corpora (GENIA annotates them heavily) and discontinuous mentions are frequent in clinical text, so any real biomedical system must have an answer. THE APPROACHES, with their trade-offs. (1) LAYERED / STACKED BIO: run several BIO layers, one per nesting depth, either as separate heads or by iteratively identifying and then removing the outermost entities. Simple and reuses everything you have, but you must fix a maximum depth, deeper layers have very little training data, and errors cascade downward. (2) SPAN-BASED CLASSIFICATION, which is the most common modern answer. Enumerate candidate spans up to a maximum length, build a representation for each (typically concatenating its start and end token vectors plus a width embedding), and classify each independently as one of the entity types or 'not an entity'. This handles nesting and overlap naturally because span decisions are independent. The costs are real: O(T * L) candidate spans for max length L, a severe negative/positive imbalance, and no built-in mechanism to prevent inconsistent predictions. SpERT and similar models work this way, and it extends cleanly to joint entity-and-relation extraction. (3) HYPERGRAPH AND TRANSITION-BASED methods represent overlapping structure explicitly with a shift-reduce style parser. Expressive, including for discontinuous mentions, but complex and largely superseded. (4) SEQUENCE-TO-SEQUENCE / GENERATIVE: generate the entities directly as text ('Washington | LOC ; University of Washington Medical Center | ORG'). This handles every case including discontinuous ones without any structural machinery, which is a genuine advantage, and it is what an LLM does by default. The costs are that you must constrain or post-process the output to be grounded in the source (generative models will hallucinate spans that are not present), it is slower, and you lose calibrated per-span probabilities. (5) MACHINE-READING-COMPREHENSION FRAMING: for each entity type ask a question ('find all organizations in this text') and extract answer spans. Nesting falls out because each type is queried separately, and it transfers well to few-shot settings because the question carries the type semantics. Slower - one pass per type. (6) FOR DISCONTINUOUS specifically, the standard trick is a two-stage decomposition: extract the contiguous FRAGMENTS, then classify which fragments combine into one entity. This keeps the sequence-labelling machinery and adds a small combination model. WHAT I WOULD ACTUALLY CHOOSE. If nesting is rare in my data, flat BIO with a documented rule for which reading wins (usually the outermost or the longest), plus a measurement of how much I am losing - quantify before you engineer. If nesting is common, span-based classification, because it is well-understood, gives per-span scores, and is easy to debug. If discontinuous entities matter, the fragment-plus-combination approach, or a generative model with grounding constraints. THE POINT WORTH MAKING IN AN INTERVIEW: the first question is not 'which architecture' but WHAT DOES THE DOWNSTREAM CONSUMER NEED. If the consumer wants one entity per mention for record linkage, flat extraction of the outermost span may be exactly right and the nesting is a non-problem. Solving a representation problem your consumer does not have is a common and expensive mistake."
          }
        },
        {
          "q": "Your NER model gets 92 F1 on the test set but users say it misses obvious entities. Investigate.",
          "a": "A 92 F1 with visible obvious failures almost always means the test set and the usage are not the same distribution, or the metric and the user's notion of success are not the same thing. I would work through it in this order. STEP 1 - COLLECT THE ACTUAL FAILURES. 'Misses obvious entities' is not actionable; fifty concrete examples are. Ask users to flag them, or sample production inputs and review. This step is not optional and it usually ends the investigation by itself. STEP 2 - CLASSIFY THE ERRORS by type, because the fixes are completely different. (a) BOUNDARY errors - the entity was found but the span is off by a token. Extremely common, and note that from the metric's perspective this is a double error while from the user's perspective it may not be an error at all. (b) TYPE errors - right span, wrong label. (c) TRUE MISSES - nothing was predicted. (d) SPURIOUS predictions. If the complaints are mostly (a), the fix may be a relaxed matching policy downstream rather than a better model. STEP 3 - CHECK THE DISTRIBUTION GAP. Is production text like the test text? Compare length, casing, formatting, domain vocabulary, language mix, and the presence of things training never saw - HTML, transcripts, ALL CAPS, tables flattened into text, OCR noise. A quick and effective diagnostic is a classifier trained to separate test inputs from production inputs; if it succeeds trivially, its top features tell you what differs. CASING is the classic culprit here: a model trained on well-cased newswire degrades sharply on lowercase or uppercase input, because capitalization carries much of the signal. STEP 4 - CHECK THE ENTITY DISTRIBUTION SPECIFICALLY. Are the missed entities RARE TYPES, rare surface forms, or entities that did not exist at training time? New company names, new drug names, and new product names appear continuously, and a model trained two years ago has never seen them. Measure performance separately on entities that appear in the training set versus entities that do not - the gap is usually large and it is the honest measure of generalization. Benchmarks flatter models here because their test sets share entity vocabulary with their training sets. STEP 5 - CHECK THE PIPELINE, not just the model. Is truncation dropping the tail of long documents? Is windowing losing entities at chunk boundaries because there is no stride? Is preprocessing at serving time identical to training - same tokenizer version, same normalization, same casing? Run one production example through both paths and diff the token IDs. Training-serving skew is mundane and extremely common. STEP 6 - CHECK THE TEST SET ITSELF. Was the split random when it should have been by document, source, or time? Near-duplicate documents straddling the split inflate the score. And check the test ANNOTATIONS: if the test set was labelled by the same process as training, it shares its blind spots, so a category systematically missed in annotation is also systematically missing from the metric - which is exactly how a model scores 92 while missing things every user notices. STEP 7 - RECONCILE THE METRIC WITH THE USER'S DEFINITION. Users weight entities by IMPORTANCE; micro-F1 weights them by frequency. If the model is excellent on the 80% of mentions that are common and weak on the rare, high-value ones, the aggregate looks great and the experience is poor. Recompute the metric weighted the way the user cares - per entity TYPE, per document (did we get every entity in this document right?), or restricted to the entities that drive the downstream decision. THE FIXES, once diagnosed: add production-like data to training and keep a continuously-labelled production sample as the real evaluation set; add a gazetteer or dictionary channel for known-entity coverage, which fixes the unseen-name problem directly and cheaply; use a cased model and truecase noisy input; add stride to windowing; and if boundaries are the complaint, relax the downstream matching rather than chasing exact-span F1."
        },
        {
          "q": "How do transformer NER models compare to CRF and rule-based systems, and when would you still use rules?",
          "a": "THE THREE GENERATIONS, and what each actually contributes. RULE-BASED: regular expressions, gazetteers, and hand-written patterns. Dominant until the mid-2000s and still deployed widely. CRF-BASED: hand-engineered features (word identity, casing, prefixes and suffixes, part-of-speech, gazetteer membership, surrounding words) fed to a linear-chain CRF that models tag transitions and decodes globally with Viterbi. This was the state of the art for roughly a decade. BiLSTM-CRF: learned word representations replace hand-engineered features, CRF stays on top for structured decoding. TRANSFORMER: a pretrained contextual encoder plus a token classification head, with the CRF now largely optional. THE QUANTITATIVE PICTURE on CoNLL-2003 English, which is worth knowing as a rough ladder: hand-crafted-feature CRFs reached the high 80s F1; BiLSTM-CRF with pretrained word embeddings reached ~91; BERT-family models reach ~92-93. So the total gain from a decade of representation learning is roughly five points on this benchmark - real but not transformative - and the more meaningful improvements are in ROBUSTNESS and in how little feature engineering is required. Note also that the ceiling is close: with over 5% of CoNLL test labels wrong, the differences between the top systems are within annotation noise. WHERE TRANSFORMERS GENUINELY WIN. Ambiguous mentions resolved by context ('Washington' as person, place, or organization); unseen entities, because subword representations and contextual patterns generalize where a gazetteer cannot; domain transfer with modest labelled data; and the elimination of feature engineering, which was most of the work in the CRF era. WHEN I WOULD STILL USE RULES, and I would argue for this without embarrassment. (1) HIGHLY STRUCTURED ENTITIES. Dates, times, phone numbers, email addresses, IP addresses, currency amounts, ICD or CPT codes, and dosage expressions are close to formal grammars. A regex is more accurate, infinitely faster, fully auditable, and requires no training data. Using a 110M-parameter model to find email addresses is a bad engineering decision. (2) CLOSED, ENUMERABLE SETS. If the entity set is a known list - your own product catalogue, country names, RxNorm drug names, ticker symbols - dictionary matching with an Aho-Corasick automaton gives near-perfect recall on known items, updates instantly when the list changes, and gives you the canonical identifier for free rather than requiring a separate linking step. (3) NO LABELLED DATA AND NO TIME. Rules get you to a working system in a day and simultaneously produce weak labels you can bootstrap from. (4) AUDITABILITY AND COMPLIANCE. In regulated settings, 'why did the system redact this' must be answerable, and a rule is an answer while a model is a probability. (5) HARD GUARANTEES. If a specific pattern must ALWAYS be caught - a national identifier format, say - a rule guarantees it and a model does not. THE ARCHITECTURE I ACTUALLY BUILD, which is the point of the question: a HYBRID, and this is standard practice in production information extraction, not a compromise. Rules and dictionaries for the structured and closed-set types; a transformer for the open, context-dependent types; a merge layer with an explicit precedence policy for conflicts (typically rules win where they fire, because their precision is higher and their behaviour is predictable); and gazetteer membership additionally supplied as a FEATURE to the neural model so it can learn when to trust the dictionary. The failure mode to avoid on both sides is dogma - teams that refuse rules end up with a model that cannot reliably find a phone number, and teams that refuse models end up with ten thousand unmaintainable patterns trying to recognize company names."
        },
        {
          "q": "Should you use an LLM for NER instead of a fine-tuned encoder?",
          "a": "SOMETIMES, AND THE ANSWER HAS SHIFTED, but for a stable high-volume extraction task the fine-tuned encoder is usually still correct. Let me give both sides properly. WHERE THE LLM WINS. (1) ZERO AND FEW-SHOT. With no labelled data at all, a prompted LLM will extract entities reasonably, which no fine-tuned model can do. For a new entity type, a new domain, or a prototype, this is the difference between a day and a month. (2) CUSTOM AND OPEN-ENDED TYPES. 'Find every mention of a supply-chain disruption' is not a CoNLL type and there is no dataset for it. The LLM understands the type from its description, which is a genuinely new capability - traditional NER requires the type to be defined by examples. (3) NESTED, OVERLAPPING, AND DISCONTINUOUS entities are handled without any structural machinery, because the output is just text. (4) REASONING-DEPENDENT extraction: deciding whether a mention is negated, hypothetical, or attributed to someone other than the subject is something an LLM does natively and a tagger must be taught. (5) It can output structured records directly - entity, type, normalized form, linked identifier - collapsing several pipeline stages. WHERE THE FINE-TUNED ENCODER WINS, and these are the reasons it remains deployed. (1) ACCURACY WITH DATA. With a few thousand labelled examples, a fine-tuned encoder generally beats a prompted LLM on standard NER benchmarks. LLMs are notably weaker at EXACT BOUNDARIES - they will return 'Bank of England' when the guideline wants 'the Bank of England' - and exact-span F1 punishes that hard. Following someone else's annotation conventions is precisely what supervised learning is good at and prompting is bad at. (2) COST AND LATENCY. Tagging is one forward pass over the document; LLM extraction generates output tokens proportional to the number of entities, and at document scale the difference is one or two orders of magnitude. (3) GROUNDING. A tagger can only label tokens that exist. An LLM can return a span that is not in the text - hallucinated, normalized, or subtly reworded - which for extraction is a serious failure mode requiring a verification step that the span actually occurs. (4) CALIBRATED PER-SPAN CONFIDENCE, which you need for a human review queue. (5) DETERMINISM AND VERSIONING: same input, same output, and a model artifact you control - which matters when the extraction feeds a regulated record. (6) DATA RESIDENCY, often decisive for clinical and legal text. THE PRACTICAL SYNTHESIS, which is what I would actually propose. Use the LLM for what it is uniquely good at: bootstrapping. Prompt it to label a few thousand documents, have humans review and correct a sample, then fine-tune an encoder on the result and deploy that. You get the LLM's flexibility during development and the encoder's economics in production - the standard distillation path, and it typically reaches within a point or two of the LLM at a hundredth of the cost. Keep the LLM in the loop for the low-confidence tail, for new entity types before you have data, and for the assertion and normalization steps where reasoning helps. AND ONE NUANCE WORTH RAISING: 'LLMs are bad at NER' is often really 'LLMs disagree with CoNLL's annotation guidelines'. Much of the measured gap is convention-following rather than entity-finding, and if your task has no legacy guideline to match - you are defining the schema yourself - that part of the gap disappears. Which of these two situations you are in should change your answer."
        },
        {
          "q": "How would you build an NER system for a language with almost no labelled data?",
          "a": "THE STRATEGY IS TRANSFER PLUS BOOTSTRAPPING, and I would run several of these in parallel because they are complementary and cheap. STEP 1 - START FROM A MULTILINGUAL ENCODER. XLM-RoBERTa or a similar model pretrained on a hundred languages gives you a usable representation even for languages with modest pretraining data. The key empirical fact is ZERO-SHOT CROSS-LINGUAL TRANSFER: fine-tune on English CoNLL, evaluate on your target language, and you get a working system with NO target-language labels at all. Performance is well below a supervised model but it is a real starting point and it is free. Transfer is strongest between related languages and languages sharing a script, and weakest for low-resource languages poorly represented in pretraining - so measure it rather than assuming. STEP 2 - CHECK THE TOKENIZER FIRST, because it caps everything. Measure fertility on target-language text. Multilingual tokenizers trained on web data that is overwhelmingly English shred under-represented scripts into many pieces, which lengthens sequences, raises cost, and degrades quality. If fertility is very high, consider a model with better coverage of your language family, or vocabulary extension plus continued pretraining. STEP 3 - CONTINUED PRETRAINING on unlabelled target-language text, which is usually available in volume even when labels are not - Wikipedia, Common Crawl, news, government documents. This adapts the representation to the language at no annotation cost and typically gives a solid gain over the raw multilingual checkpoint. STEP 4 - PROJECT LABELS THROUGH TRANSLATION, the classic weak-supervision trick, in either direction. TRANSLATE-TRAIN: machine-translate an English NER corpus into the target language and project the entity spans using word alignment, giving you noisy target-language training data. TRANSLATE-TEST: translate target-language input into English, run a strong English model, and project the spans back. The weak link in both is ALIGNMENT quality, and entity spans project badly when word order or morphology differs sharply - so expect noise and treat the labels as weak. STEP 5 - EXPLOIT STRUCTURED RESOURCES that exist for almost every language. WIKIPEDIA hyperlinks are entity annotations: a link to a page whose Wikidata type is 'human' is a PER annotation. This is how WikiAnn/PAN-X was built, and it covers 280+ languages automatically. Quality is imperfect - coverage is partial and types are coarse - but the volume is large and it costs nothing. Wikidata also gives you multilingual GAZETTEERS of names, places, and organizations, which for a morphologically simple language is a strong extraction channel on its own. STEP 6 - ANNOTATE A LITTLE, WITH ACTIVE LEARNING. The return on the first few hundred labelled examples is enormous - typically most of the gap between zero-shot and full supervision. Use the zero-shot model's uncertainty to choose what to annotate, so the budget goes where it matters, and spend genuine effort on GUIDELINES: for many languages the conventions are not settled, and inconsistent annotation of a small set is worse than a smaller consistent one. STEP 7 - SELF-TRAINING to close the loop. Predict on large unlabelled target-language text, keep high-confidence predictions as pseudo-labels, retrain, iterate. Works well when the starting model is reasonable and the confidence threshold is conservative. THE LANGUAGE-SPECIFIC ISSUES I WOULD CHECK EXPLICITLY, because ignoring them is how these projects fail. MORPHOLOGY: in agglutinative or heavily-inflected languages an entity's surface form changes with case, which breaks gazetteer matching and complicates boundary conventions - you may need to define whether inflectional suffixes are inside the span. CASING: many scripts have no case distinction at all, removing the strongest cue English NER relies on, so expect lower performance and do not benchmark against English expectations. SEGMENTATION: languages without whitespace word boundaries make 'word-level' labels ill-defined and force span-offset annotation instead. And SCRIPT AND ENCODING variation - multiple orthographies, romanization, inconsistent Unicode normalization - needs a normalization step or it fragments your data silently. THE HONEST EXPECTATION I would set: zero-shot transfer plus Wikipedia-derived data plus a few hundred carefully annotated examples typically lands well short of English-level F1, and the remaining gap is mostly annotation volume and consistency rather than modelling. Saying that up front is better than promising parity."
        },
        {
          "q": "Explain the CRF layer and Viterbi decoding, and whether they are still necessary.",
          "a": "THE PROBLEM THEY SOLVE. A per-token softmax makes each tag decision INDEPENDENTLY given the encoder's representation. But BIO tags are not independent: I-PER can only follow B-PER or I-PER, and no annotation contains O followed by I-LOC. Independent argmax has no way to express that constraint and will violate it, producing output that decodes to nothing valid. THE LINEAR-CHAIN CRF. Instead of scoring tags independently, score whole SEQUENCES: the score of a tag sequence is the sum of per-token emission scores from the encoder plus learned TRANSITION scores between consecutive tags. Normalize over all possible sequences to get a probability. Two algorithms make this tractable: the FORWARD algorithm computes the partition function (the sum over all exponentially many sequences) in O(T k^2) by dynamic programming, which you need for the training loss; and VITERBI finds the highest-scoring sequence, also in O(T k^2), which you need at inference. Both are the same recursion with a sum replaced by a max. WHAT THE CRF BUYS. (1) STRUCTURAL VALIDITY - illegal transitions get large negative scores and are never decoded. (2) GLOBAL CONSISTENCY - the model can trade a locally-suboptimal tag for a better overall sequence, which matters at boundaries where the evidence is genuinely ambiguous. (3) A calibrated sequence-level probability rather than a product of per-token probabilities. WHY IT MATTERED MORE BEFORE. With hand-engineered features or a BiLSTM, each token's representation carried limited information about the rest of the sentence, so the transition model was doing real work - it was the main mechanism enforcing coherence. BiLSTM-CRF was meaningfully better than BiLSTM alone. IS IT STILL NECESSARY ON A TRANSFORMER? Largely not, and this is the interesting part. Self-attention gives every token a representation informed by the entire sequence, so the encoder already knows that the previous token started a person name - that information is IN the representation. Empirically, adding a CRF to a fine-tuned BERT typically gains a few tenths of a point on standard benchmarks, sometimes nothing, at the cost of a slower O(k^2) decode, a more complex training loop, and interactions with subword masking that are fiddly to get right (positions labelled -100 have to be excluded from the chain correctly, which is a common bug). WHAT I WOULD DO INSTEAD, and this is the practical recommendation: use CONSTRAINED VITERBI DECODING with a FIXED transition matrix rather than a learned CRF. Set illegal transitions to -inf, legal ones to 0, and decode. This gives you all of the structural-validity benefit with none of the training complexity - there are no parameters to learn - and it costs one dynamic program at inference. You get zero malformed outputs, which is the failure mode that actually embarrasses you in front of users, without paying for a learned transition model whose value the encoder has already absorbed. WHEN THE FULL CRF IS STILL WORTH IT. When the tag set has rich structure beyond BIO validity that is genuinely learnable - many types with real co-occurrence patterns. When labelled data is scarce, because the transition prior is a useful inductive bias that partly substitutes for data. When the encoder is small or frozen, so its representations carry less sequence context. And in low-resource or cross-lingual settings for the same reason. THE MORE GENERAL LESSON, which is why this question is asked: a structured-prediction layer is valuable in proportion to how much structure the ENCODER has failed to capture. As encoders got better, the marginal value of the structured decoder fell. That pattern recurs - it is the same reason beam search matters less for strong LMs than for weak ones, and it is worth recognizing as a pattern rather than a fact about CRFs."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "BIO / BIOES tagging",
        "back": "BIO: B-TYPE starts an entity, I-TYPE continues, O is outside (2k+1 labels). BIOES adds End and Single (4k+1), giving a sharper boundary signal at the cost of sparser labels."
      },
      {
        "type": "pitfall",
        "front": "Token accuracy is meaningless for NER",
        "back": "~85% of tokens are 'O', so predicting 'O' everywhere scores 85%. Use ENTITY-level F1 with exact span + type match, and always read the per-type breakdown - a 98.7% token accuracy model can sit at 91 micro-F1 with its worst type at 79."
      },
      {
        "type": "intuition",
        "front": "Why boundary errors dominate",
        "back": "Exact-span F1 scores a one-token slip as a false positive AND a false negative. 'Bank of England' vs 'the Bank of England' is a GUIDELINE decision, not a language problem - which is why annotation quality caps F1 more than architecture does."
      },
      {
        "type": "pitfall",
        "front": "Subword label alignment",
        "back": "Label the FIRST subword of each word, -100 on continuations, using the tokenizer's word_ids(). Applying different conventions at train vs inference leaves token accuracy fine and quietly destroys entity F1."
      },
      {
        "type": "pitfall",
        "front": "Windowing without a stride",
        "back": "Entities straddling a 512-token boundary are lost with no warning. Overlap windows (stride ~128) and reconcile in the overlap, preferring the window where the token is furthest from an edge."
      },
      {
        "type": "definition",
        "front": "Constrained Viterbi decoding",
        "back": "Score whole sequences with a transition matrix that sets illegal BIO moves (O -> I-PER, B-PER -> I-LOC) to -inf, then decode with Viterbi in O(T k^2). No parameters to learn, and it eliminates malformed output entirely."
      },
      {
        "type": "intuition",
        "front": "Is a CRF still worth it on a transformer?",
        "back": "Barely - self-attention already puts sequence context in every token's representation, so a learned CRF adds a few tenths of a point. Use HARD constrained decoding instead: same validity guarantee, no training complexity."
      },
      {
        "type": "pitfall",
        "front": "Nested and discontinuous entities",
        "back": "Flat BIO gives one label per token, so it cannot represent 'University of Washington' inside 'University of Washington Medical Center', nor 'left and right ventricles'. Use span classification, layered BIO, or generative extraction - and first check whether your consumer cares."
      },
      {
        "type": "pitfall",
        "front": "CoNLL-2003 is not clean",
        "back": "Re-annotation found >5% of TEST labels wrong, so systems at 93-94 F1 compete inside annotation noise. Also: 1996-97 newswire, four coarse types - performance on clinical, legal, chat, or ASR text is far lower."
      },
      {
        "type": "intuition",
        "front": "Seen vs unseen entities",
        "back": "Benchmarks share entity vocabulary between train and test, which flatters models. Report performance separately on entities that appear in training and those that do not - the gap is the honest generalization measure, and it is where a gazetteer channel pays."
      },
      {
        "type": "intuition",
        "front": "LLM vs fine-tuned encoder for NER",
        "back": "LLM wins zero-shot, on custom/open types, and on nested or reasoning-dependent extraction. Encoder wins on exact boundaries, cost, latency, grounding (a tagger cannot hallucinate a span), and calibration. Standard path: LLM labels, encoder deploys."
      },
      {
        "type": "intuition",
        "front": "Negation and attribution are a separate stage",
        "back": "Do not fold 'is this negated / hypothetical / about the patient' into the tag set. Extract mentions, then run a dedicated assertion classifier over each with its context - more accurate and far more inspectable. Standard in clinical NLP."
      }
    ],
    "refs": [
      {
        "title": "Lample et al. (2016), Neural Architectures for Named Entity Recognition",
        "url": "https://arxiv.org/abs/1603.01360"
      },
      {
        "title": "Reiss et al. (2020), Identifying Incorrect Labels in the CoNLL-2003 Corpus",
        "url": "https://aclanthology.org/2020.conll-1.16/"
      },
      {
        "title": "Li et al. (2020), A Unified MRC Framework for Named Entity Recognition",
        "url": "https://arxiv.org/abs/1910.11476"
      },
      {
        "title": "Eberts & Ulges (2020), Span-based Joint Entity and Relation Extraction (SpERT)",
        "url": "https://arxiv.org/abs/1909.07755"
      },
      {
        "title": "Pan et al. (2017), Cross-lingual Name Tagging and Linking for 282 Languages (WikiAnn)",
        "url": "https://aclanthology.org/P17-1178/"
      }
    ],
    "demos": [
      "probing-classifier",
      "hmm-viterbi",
      "tokenizer",
      "embeddings"
    ]
  },
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
  },
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
  },
  "nlp-eval": {
    "level": "core",
    "body": {
      "intuition": [
        "Evaluating a classifier is easy: there is a right answer and you either produced it or you did not. Evaluating GENERATED TEXT is not, because there are many correct outputs and no way to enumerate them. Every automatic metric for generation is therefore a PROXY - it measures similarity to one or a few reference texts and hopes that correlates with quality. Understanding which proxy fails how, and when, is most of what evaluation expertise consists of.",
        "BLEU was the first proxy that worked well enough to build a field on, and its original claim was carefully limited: it correlates with human judgment at the SYSTEM level, over a corpus, comparing systems of similar type. Nearly every subsequent use violated at least one of those conditions. Callison-Burch showed as early as 2006 that BLEU can rank a genuinely better system lower, and the failure is systematic rather than random - it happens whenever a system produces good output that shares few n-grams with the reference, which is exactly what a system with a different but valid style does.",
        "The current state is an honest hierarchy rather than a solved problem. Surface-overlap metrics (BLEU, ROUGE, exact match) are cheap, reproducible, and weakly correlated with quality. Embedding metrics (BERTScore) handle paraphrase and correlate better. LEARNED metrics trained directly on human judgments (COMET, BLEURT) correlate best and are the right default for machine translation. LLM judges are the most flexible and the most recently understood to have specific, measurable biases - position, verbosity, and self-preference among them. And human evaluation remains the ground truth that all of these are calibrated against, while having its own reliability problems that are rarely reported. The right question is never 'what is the metric' but 'what is this metric's correlation with what I actually care about, measured on my data'."
      ],
      "math": [
        {
          "h": "BLEU: modified n-gram precision with a brevity penalty",
          "paras": [
            "Count how many of the candidate's n-grams appear in the reference, CLIPPED at the reference's count so repetition cannot inflate the score, geometric-mean across n = 1..4, and multiply by a penalty for being too short. Precision alone would reward outputting a single high-confidence word, which is what the brevity penalty exists to prevent."
          ],
          "tex": "\\mathrm{BLEU} = \\mathrm{BP}\\cdot\\exp\\!\\left(\\sum_{n=1}^{4} w_n \\log p_n\\right), \\quad \\mathrm{BP} = \\min\\!\\left(1, e^{1 - r/c}\\right), \\quad p_n = \\frac{\\sum \\min(c_g, r_g)}{\\sum c_g}",
          "texNote": "c = candidate length, r = reference length. Note the GEOMETRIC mean: if any p_n is zero the whole score is zero, which is why sentence-level BLEU is near-useless (a short sentence often has no matching 4-gram) and why BLEU is defined at the corpus level."
        },
        {
          "h": "ROUGE: the recall-oriented mirror",
          "paras": [
            "Summarization cares whether the reference's content was covered, so ROUGE measures RECALL of reference n-grams. ROUGE-L uses the longest common subsequence instead, which rewards preserving order without requiring contiguity."
          ],
          "tex": "\\mathrm{ROUGE\\text{-}N} = \\frac{\\sum_{g \\in R}\\min(c_g, r_g)}{\\sum_{g \\in R} r_g}, \\qquad \\mathrm{ROUGE\\text{-}L} = F_\\beta\\big(\\mathrm{LCS}(C,R)\\big)",
          "texNote": "Recall-oriented means longer outputs score higher, so ROUGE must be reported with a length constraint or an F-measure variant, or you are measuring verbosity. This is the single most common way ROUGE comparisons are invalid."
        },
        {
          "h": "BERTScore: greedy matching in embedding space",
          "paras": [
            "Replace exact n-gram matching with cosine similarity between contextual token embeddings, greedily matching each candidate token to its most similar reference token. Paraphrase now scores well, which is the point."
          ],
          "tex": "R_{\\mathrm{BERT}} = \\frac{1}{|R|}\\sum_{r \\in R} \\max_{c \\in C} \\mathbf{x}_r^\\top \\mathbf{x}_c, \\qquad P_{\\mathrm{BERT}} = \\frac{1}{|C|}\\sum_{c \\in C} \\max_{r \\in R} \\mathbf{x}_r^\\top \\mathbf{x}_c",
          "texNote": "Raw scores sit in a narrow high range (contextual embeddings are anisotropic), so BERTScore rescales against a random-pair baseline for readability. The score depends on WHICH model produces the embeddings, so the checkpoint must be reported for the number to mean anything."
        }
      ],
      "code": [
        {
          "h": "Why an unqualified BLEU number is not comparable to anything",
          "paras": [
            "BLEU's value depends on tokenization, casing, normalization, and the number of references - decisions that are invisible in the reported number. This was a genuine reproducibility crisis in machine translation until sacreBLEU standardized it."
          ],
          "code": "import sacrebleu\n\nhyp = [\"The cat sat on the mat.\"]\nref = [[\"A cat was sitting on the mat.\"]]\n\n# Same texts, different preprocessing -> different \"BLEU\":\n#   tokenize='13a' (default) ......... 21.3\n#   tokenize='intl' .................. 20.8\n#   lowercase=True ................... 24.1\n#   after stripping punctuation ...... 27.6\n#\n# None of these is wrong; all are reported as \"BLEU\". Papers differing by\n# 1-2 BLEU were routinely differing in tokenization instead of in quality.\n\nprint(sacrebleu.corpus_bleu(hyp, ref).format())\n# BLEU|nrefs:1|case:mixed|eff:no|tok:13a|smooth:exp|version:2.4.0 = 21.3 ...\n#\n# sacreBLEU emits a SIGNATURE encoding every choice. Report the signature,\n# not the number - it is the only way the value is reproducible.\n\n# And the structural limits, which no signature fixes:\n#   * CORPUS-level only. Sentence BLEU is near-useless: the geometric mean\n#     over n=1..4 is zero whenever any n-gram order has no match, which is\n#     common in a single short sentence.\n#   * Assumes lexical overlap tracks quality. A correct translation phrased\n#     differently from the reference scores low - systematically, not randomly.\n#   * More references help a lot, and almost everyone uses one.",
          "caption": "Four preprocessing choices produce four different BLEU scores for the same pair of sentences. Always report the sacreBLEU signature; an unqualified BLEU number cannot be compared across papers."
        },
        {
          "h": "The only evaluation of a metric that matters",
          "paras": [
            "A metric is not right or wrong in the abstract - it either correlates with the judgment you care about on your data, or it does not. Measuring that correlation is a few hundred human ratings and it settles arguments that otherwise run for months."
          ],
          "code": "from scipy.stats import kendalltau, pearsonr\n\n# 1. Sample ~300 outputs across the systems and settings you care about.\n# 2. Get human ratings - ideally 3+ raters per item, and MEASURE their agreement\n#    first. If humans agree at 0.5, no metric can correlate above that.\n# 3. Correlate each candidate metric against the human scores.\n\nfor name, scores in metrics.items():\n    tau, _ = kendalltau(scores, human)\n    r, _   = pearsonr(scores, human)\n    print(f\"{name:12s}  tau={tau:+.3f}  r={r:+.3f}\")\n\n# Typical ordering on a modern generation task (segment level):\n#   BLEU          tau=+0.21     <- weak; and it was never designed for segments\n#   ROUGE-L       tau=+0.28\n#   BERTScore     tau=+0.44\n#   COMET         tau=+0.58     <- trained directly on human judgments\n#   LLM-judge     tau=+0.55     <- flexible, but carries known biases\n#   human-human   tau=+0.62     <- THE CEILING. Report it.\n\n# Two things this table does that a leaderboard cannot:\n#   (a) It shows the human-human ceiling, so you can see how much headroom\n#       actually exists. A metric at 0.58 against a ceiling of 0.62 is close\n#       to as good as the measurement allows.\n#   (b) It is measured on YOUR data. Metric correlations do not transfer\n#       across domains, languages, or quality ranges - and they are much\n#       weaker among systems of SIMILAR quality, which is exactly the\n#       comparison you usually want to make.",
          "caption": "Metric-vs-human correlation on your own data, with the human-human ceiling reported alongside. Without the ceiling, a correlation of 0.58 is uninterpretable."
        }
      ],
      "useCases": [
        "Regression testing during development: cheap surface metrics are genuinely useful for detecting that a change broke something, even when they cannot tell you that a change improved something. Fast and reproducible beats accurate for a CI gate.",
        "System-level comparison in machine translation, where learned metrics (COMET, BLEURT) now substantially outperform BLEU on correlation with human judgment and are the recommended default in the WMT evaluation campaigns.",
        "Groundedness and factual-consistency scoring for RAG and summarization, using entailment-based metrics that ask whether each generated claim is supported by the source rather than whether it resembles a reference.",
        "Pairwise preference evaluation with an LLM judge for open-ended generation, where no reference exists - viable and widely used, provided position and verbosity biases are controlled by randomizing order and checking length effects."
      ],
      "pitfalls": [
        "Reporting BLEU without a signature. Tokenization, casing, and normalization choices move the number by several points, and papers differing by 1-2 BLEU were often differing in preprocessing. Use sacreBLEU and report its signature.",
        "Using sentence-level BLEU. The geometric mean over n = 1..4 goes to zero whenever any n-gram order has no match, which is common in a single short sentence. BLEU is a corpus-level metric by construction.",
        "Comparing ROUGE scores across systems with different output lengths. ROUGE is recall-oriented, so longer summaries score higher mechanically. Constrain length or use an F-measure variant, or you are ranking verbosity.",
        "Treating a metric's published correlation with human judgment as transferable. Correlations are measured on a specific domain, language, and quality range, and they are markedly WEAKER among systems of similar quality - which is exactly the comparison you usually need.",
        "Reporting metric-human correlation without the human-human ceiling. If annotators agree at 0.62, a metric at 0.58 is close to the limit of the measurement, and chasing 0.70 is chasing noise.",
        "Using an LLM judge without controlling its biases. Judges prefer the FIRST-presented option, prefer LONGER answers, and prefer outputs from their own model family. Randomize position (or evaluate both orders), check whether your winner is simply more verbose, and prefer a different model family as the judge.",
        "Comparing perplexity across models with different tokenizers. Perplexity is per-token and the tokens differ, so the numbers are not on the same scale. Only per-character or per-word normalized values are comparable across vocabularies.",
        "Treating human evaluation as automatically trustworthy. Without clear guidelines, measured inter-annotator agreement, attention checks, and enough items for a confidence interval, human evaluation can be noisier than the metrics it is meant to validate."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/nli",
          "text": "Entailment-based consistency metrics are the most reliable automatic groundedness check available, and the artifact story there is the same proxy-gaming problem in a different costume."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general discipline - choose the metric from the decision it informs, report intervals, and distrust single numbers - applies here with the extra difficulty that the target itself is not enumerable."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "A generation system that must abstain needs calibrated confidence, and calibration is measured separately from quality - a well-scoring system can be badly calibrated."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "LLM-as-judge, arena-style pairwise preference, and contamination are the modern continuation of exactly these problems at a larger scale."
        },
        {
          "ref": "rag-agents/rag-eval",
          "text": "RAG evaluation decomposes into retrieval metrics and generation metrics, and the generation half inherits every difficulty in this lesson."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does BLEU measure?",
          "a": "Modified n-gram precision (clipped at reference counts) geometrically averaged over n = 1..4, times a brevity penalty. Precision-oriented, corpus-level, and reference-based."
        },
        {
          "q": "Why is the brevity penalty needed?",
          "a": "Precision alone rewards short output - emitting one confident word would give perfect precision. The penalty multiplies the score down when the candidate is shorter than the reference."
        },
        {
          "q": "Why is sentence-level BLEU unreliable?",
          "a": "The geometric mean over n = 1..4 is zero whenever any order has no match, which happens constantly in a single short sentence. BLEU was defined and validated at the corpus level."
        },
        {
          "q": "What is sacreBLEU?",
          "a": "A standardized BLEU implementation that fixes tokenization and normalization and emits a SIGNATURE describing every choice. It exists because unqualified BLEU numbers are not comparable across papers."
        },
        {
          "q": "How does ROUGE differ from BLEU?",
          "a": "ROUGE is RECALL-oriented - how much of the reference's content the candidate covered - which suits summarization. Consequently longer outputs score higher, so length must be controlled."
        },
        {
          "q": "What is ROUGE-L?",
          "a": "F-measure over the longest common subsequence between candidate and reference, rewarding order preservation without requiring contiguous n-grams."
        },
        {
          "q": "What is BERTScore?",
          "a": "Greedy matching of candidate and reference tokens by cosine similarity of contextual embeddings, giving precision, recall, and F1. Handles paraphrase, which n-gram overlap cannot."
        },
        {
          "q": "What are COMET and BLEURT?",
          "a": "LEARNED metrics - neural models trained directly to predict human quality judgments, optionally using the source as well as the reference. They correlate best with humans and are the recommended default for MT."
        },
        {
          "q": "What biases does an LLM judge have?",
          "a": "POSITION (prefers the first-presented option), VERBOSITY (prefers longer answers), and SELF-PREFERENCE (prefers outputs from its own model family). All three are measurable and partly controllable."
        },
        {
          "q": "How do you control position bias?",
          "a": "Evaluate each pair in BOTH orders and require consistency, or randomize order and aggregate. Disagreement between the two orders is itself a useful measure of judge reliability on that item."
        },
        {
          "q": "When is perplexity comparable across models?",
          "a": "Only when the tokenizer and vocabulary are identical. Perplexity is per-token, so different segmentations put it on different scales - normalize per character or per word to compare across vocabularies."
        },
        {
          "q": "What must a metric-human correlation be reported with?",
          "a": "The human-human agreement ceiling. Without it, a correlation of 0.58 is uninterpretable - it might be near the limit of the measurement or half of what is achievable."
        }
      ],
      "standard": [
        {
          "q": "Design an evaluation for a summarization system.",
          "a": "I would start from the DECISIONS the evaluation must inform, because 'is this summary good' decomposes into several independent questions that no single metric answers. THE DIMENSIONS, and they are genuinely separate. (1) FACTUAL CONSISTENCY - does the summary state anything the source does not support? This is the dimension that matters most in deployment and the one surface metrics are blindest to; a summary can score well on ROUGE while inventing a number. (2) RELEVANCE - did it capture the important content rather than arbitrary content? (3) COHERENCE AND FLUENCY - is it well-formed and readable? Modern models are near-ceiling here, so it is mostly a regression check now. (4) CONCISENESS - length relative to information conveyed. A system can improve on one and regress on another, so an aggregate score hides exactly what you need to see. THE AUTOMATIC LAYER, for fast iteration. ROUGE-1/2/L against references, reported WITH output length, because ROUGE is recall-oriented and rewards verbosity mechanically - a system that got 'better' by writing longer summaries is the classic false positive here. BERTScore, which handles paraphrase and correlates better. And an ENTAILMENT-BASED CONSISTENCY score, which I would treat as the primary automatic metric: decompose the summary into sentences or atomic claims, score each against each SOURCE sentence, take the max, and aggregate. This is SummaC's design and the sentence-level granularity matters - document-level NLI degrades badly on long premises. I would use these for CI and for detecting regressions, not for claiming improvement. THE JUDGE LAYER. An LLM judge scoring each dimension separately on a defined rubric, or making pairwise comparisons against a baseline system. Controls that are not optional: randomize or double-run the presentation order, check whether the preferred output is simply longer, and use a judge from a different model family than the system being evaluated. I would validate the judge against human ratings on a sample before trusting it, and report that agreement. THE HUMAN LAYER, which is the ground truth everything else is calibrated against. A few hundred summaries, rated by multiple annotators on each dimension with written guidelines and examples. I would MEASURE inter-annotator agreement first and report it, because it is the ceiling; if annotators agree at 0.5 on relevance, that dimension is not well-defined and the guidelines need work before any model comparison is meaningful. For factual consistency specifically, the better protocol is not a rating but a task: ask annotators to HIGHLIGHT unsupported spans, which is more reliable than a 1-5 score and produces error analysis for free. THE THINGS I WOULD BUILD IN DELIBERATELY. (a) A challenge set of documents where the easy strategy fails - the LEAD-3 baseline (just take the first three sentences) is famously hard to beat on news ROUGE, so if my system cannot beat lead-3, that is the finding. Reporting lead-3 alongside is non-negotiable in news summarization. (b) Documents with numbers, negation, and attributed statements, since these are where consistency failures concentrate. (c) Out-of-domain documents. (d) Long documents that exceed the context window, to see what truncation does. WHAT I WOULD REPORT: a table with one row per system and one column per dimension, automatic and human, with confidence intervals and the human-human ceiling, plus the lead-3 and reference-quality baselines. AND THE CAVEAT I would state explicitly: reference summaries are one valid summary among many, written by one person with one notion of importance. CNN/DailyMail references are famously extractive and noisy, which is why lead-3 competes with trained systems. Any reference-based metric is measuring agreement with that person's choices, and a system that summarizes differently but well is penalized. That is the fundamental limitation, and it is why the reference-free consistency check carries the most weight in my design.",
          "deepDive": {
            "q": "Why do surface-overlap metrics correlate poorly with human judgment, and what actually fixes it?",
            "a": "THE CORE MISMATCH. BLEU and ROUGE measure lexical overlap with a reference. Human quality judgment measures whether the output conveys the right meaning, well. These come apart in both directions and the failures are SYSTEMATIC rather than random, which is what makes them dangerous. FALSE NEGATIVES - good output, low score. (1) PARAPHRASE: 'the cat sat on the mat' and 'a feline was resting on the rug' share almost no n-grams and mean the same thing. (2) LEGITIMATE STYLISTIC VARIATION: a system with a different but valid register scores low against a reference in another register. (3) A SINGLE REFERENCE cannot cover the space of valid outputs, and almost every evaluation uses one - BLEU's original validation used four. (4) WORD ORDER flexibility in many languages means n-gram matching penalizes a correct alternative ordering. FALSE POSITIVES - bad output, high score. (1) FLUENT NONSENSE that reuses reference vocabulary. (2) A single word changed - a negation dropped, a number altered, an entity swapped - barely moves a 4-gram overlap score while completely inverting the meaning. This is the most serious one, because those are exactly the errors that matter most. (3) EXTRACTIVE COPYING scores well on ROUGE without any summarization occurring, which is why lead-3 is competitive on news. WHAT MAKES IT WORSE IN PRACTICE. The correlation is much weaker among systems of SIMILAR quality, which is precisely the comparison you usually want - metrics can distinguish terrible from good and struggle to distinguish good from slightly better. It degrades as systems improve, because good systems increasingly produce valid outputs unlike the reference. And it is not robust to OPTIMIZATION: as soon as you tune against the metric, you move into the region where it and quality diverge, which is Goodhart's law with a specific mechanism. WHAT ACTUALLY FIXES IT, in increasing order of effectiveness. (1) MORE REFERENCES help substantially and are rarely available. (2) EMBEDDING-BASED metrics (BERTScore, MoverScore) fix paraphrase by comparing in a semantic space rather than a lexical one. Real improvement, and still reference-based, so single-reference coverage remains a limitation. (3) LEARNED METRICS - COMET, BLEURT - are trained directly to predict human judgments from (source, candidate, reference) triples. Since the objective IS correlation with humans, they correlate best, and in WMT evaluations they now clearly outperform BLEU. Their costs are that they need human-judgment training data, they inherit the biases of that data, they are model-dependent and versioned, and they are themselves gameable if you optimize against them. (4) REFERENCE-FREE metrics evaluate the candidate against the SOURCE - entailment for consistency, QA-based methods that generate questions from the output and answer them from the source. These escape the single-reference problem entirely, which is conceptually the most important step, and they measure a specific property (groundedness) rather than overall quality. (5) LLM JUDGES, which are the most flexible and correlate well, with the biases discussed elsewhere. THE DEEPER POINT I would make, because it is the transferable one: the problem is not that BLEU is a bad metric. It is that AUTOMATIC EVALUATION OF OPEN-ENDED GENERATION IS FUNDAMENTALLY HARD, because the target is a SET of acceptable outputs that cannot be enumerated. Every method above is a different approximation of set membership - overlap with a sample from the set, semantic proximity to a sample, a learned model of the set, or a check of specific properties any member must have. That last framing is the most promising: rather than asking 'how close is this to a good output', decompose into checkable properties - is it grounded, does it cover the key content, is it the right length, does it follow the format - and verify each. It is less elegant and far more useful, because each property comes with an actionable failure mode."
          }
        },
        {
          "q": "How would you use an LLM as a judge, and what would you control for?",
          "a": "WHAT IT IS. Prompt a strong model to evaluate outputs - either scoring on a rubric, or comparing two outputs pairwise. It has become standard because it is flexible (any criterion you can describe), needs no references, gives explanations, correlates reasonably with humans (roughly 80% agreement with human preferences on chat evaluation, which is close to human-human agreement), and costs cents rather than dollars per item. THE BIASES, which are measured and specific. (1) POSITION BIAS: judges prefer the option presented FIRST, and the effect is large enough to flip conclusions. Control by evaluating each pair in BOTH orders; count a win only if it is consistent, and treat the inconsistent fraction as a measure of judge reliability on that comparison. (2) VERBOSITY BIAS: longer answers are preferred, roughly independent of whether the extra content helps. Control by reporting the length distribution of the outputs alongside the win rate, testing whether your winner is simply longer, and where possible length-controlling the comparison. This one is insidious because it produces genuine-looking improvements from a change that only made the model more verbose. (3) SELF-PREFERENCE: models prefer text from their own family. Control by using a judge from a different family than the system under test, and never use the model to judge itself in a competitive comparison. (4) STYLE OVER SUBSTANCE: confident, well-formatted, authoritative-sounding answers are preferred, including when they are wrong. This is the hardest to control, and it is why an LLM judge should not be the primary check on factual accuracy. (5) LIMITED DISCRIMINATION on absolute scales - 1-10 ratings cluster in a narrow band and are poorly separated, which is why PAIRWISE comparison is generally the better protocol. THE PROTOCOL I WOULD USE. Pairwise rather than absolute scoring. Both orders, consistency required. A specific rubric per criterion rather than 'which is better' - 'which answer is better GROUNDED IN THE PROVIDED CONTEXT' produces far more reliable judgments than an undefined preference. Chain-of-thought before the verdict, which measurably improves agreement. A three-way outcome including TIE, since forcing a choice on genuinely equivalent outputs manufactures noise. Few-shot examples of correctly-judged cases when the criterion is subtle. And a reference answer supplied to the judge when one exists, which helps considerably. THE VALIDATION STEP THAT IS NOT OPTIONAL. Before trusting a judge, measure its agreement with HUMAN judgments on a sample of a few hundred items from your own data, and report that agreement alongside every result the judge produces. Also measure the human-human agreement on the same sample, because that is the ceiling. If humans agree at 0.7 and the judge agrees with humans at 0.68, the judge is close to as good as the measurement allows and further prompt engineering is chasing noise. Skipping this step is how teams end up optimizing against a judge that disagrees with their users. WHERE I WOULD NOT USE IT. As the sole check on FACTUAL correctness in a specialist domain - the judge does not know your domain any better than the system does, and correlated errors between generator and judge are invisible. For anything with a checkable ground truth, where an exact or programmatic check is strictly better. And as the optimization TARGET, which is the most important limit: if you tune a system against a judge, you will find the judge's biases, and the well-documented result is systems that get more verbose and more confident rather than more correct. Use it to MEASURE, and keep a periodic human evaluation as the anchor that catches drift between what the judge rewards and what people want."
        },
        {
          "q": "What is perplexity, what does it tell you, and what does it not?",
          "a": "THE DEFINITION. Perplexity is the exponentiated average negative log-likelihood per token: exp(-(1/N) sum log p(x_i | x_<i)). It measures how surprised the model is by the text. The intuition worth carrying is that it is the effective BRANCHING FACTOR - a perplexity of 20 means the model is, on average, as uncertain as if it were choosing uniformly among 20 options at each token. Lower is better, and the theoretical floor is 1. WHAT IT IS GOOD FOR. (1) It is the direct exponential of the training loss, so it is the right thing to watch during pretraining - it is what you are optimizing. (2) COMPARING CHECKPOINTS of the same model on the same data, which is unambiguous and useful. (3) SCALING LAWS are expressed in loss/perplexity, and their predictive power over orders of magnitude is one of the more remarkable empirical results in the field. (4) Detecting DOMAIN MISMATCH - high perplexity on your domain's text tells you the model is out of its distribution, and this is a genuinely useful diagnostic before you commit to a base model. (5) Data quality screening: unusually high perplexity flags corrupted or unusual documents, which is a standard filter in corpus construction. WHAT IT IS NOT GOOD FOR, and these are the traps. (1) COMPARING MODELS WITH DIFFERENT TOKENIZERS. Perplexity is per TOKEN, and different tokenizers produce different numbers of tokens for the same text. A model with a larger vocabulary uses fewer, longer tokens, and each is harder to predict, so its per-token perplexity is higher for the same actual modelling quality. To compare across vocabularies you must normalize per CHARACTER or per WORD - bits-per-character is the standard fix and it is not optional. (2) MEASURING DOWNSTREAM CAPABILITY. Perplexity correlates with capability across large gaps but poorly at close range: two models within a few percent on perplexity can differ substantially on reasoning benchmarks, and instruction tuning typically makes a model far more useful while making its perplexity on raw text WORSE. Nothing about perplexity measures instruction-following, factuality, or safety. (3) EVALUATING GENERATION QUALITY. Perplexity is about assigning probability to given text, not about what the model produces. A model can have excellent perplexity and generate repetitive or degenerate text under greedy decoding - the objective never asked about the sampling distribution's behaviour. (4) COMPARING ACROSS DATASETS. Perplexity on Wikipedia and on Reddit are not comparable; the text has different intrinsic entropy. Only same-data comparisons mean anything. (5) MODELS THAT ARE NOT AUTOREGRESSIVE - masked models do not define a proper joint likelihood, so 'BERT's perplexity' is a pseudo-perplexity and not comparable to a decoder's. THE CONTAMINATION ISSUE, which deserves separate mention: if evaluation text appeared in pretraining, perplexity on it is meaninglessly low. This is pervasive with web-scraped corpora and standard benchmarks, and it is why perplexity on a curated, verifiably-held-out set is worth far more than perplexity on a public dataset. WHAT I WOULD ACTUALLY REPORT. Perplexity during pretraining as the primary training signal. Bits-per-character when comparing across tokenizers. Perplexity on in-domain held-out text when choosing a base model to adapt. And for anything about capability, TASK-SPECIFIC evaluations - because the relationship between perplexity and usefulness is real in the large and unreliable in the small, which is exactly the regime most model comparisons live in."
        },
        {
          "q": "How do you run a human evaluation that is actually reliable?",
          "a": "HUMAN EVALUATION IS THE GROUND TRUTH AND IT IS ROUTINELY DONE BADLY - often more noisily than the automatic metrics it is supposed to validate. The failures are procedural and every one is preventable. STEP 1 - DEFINE THE QUESTION PRECISELY. 'Rate the quality 1-5' produces noise because raters weight different things. Break it into specific, independently-judgeable dimensions: is every claim supported by the source; does it answer the question asked; is it fluent; is it appropriately concise. Each needs a written definition and worked examples of each score point, including the boundary cases. The guidelines are the experiment; time spent there buys more than any statistical treatment afterwards. STEP 2 - PREFER TASKS OVER RATINGS. People are much more reliable at concrete judgements than at abstract scores. 'Highlight every span not supported by the source' beats 'rate factuality 1-5'. 'Which of these two is better' beats 'score each 1-10' - pairwise comparison has far better inter-annotator agreement than absolute scales, and Likert responses cluster in the middle regardless. If you need a ranking of many systems, use pairwise comparisons and fit a Bradley-Terry or Elo model. STEP 3 - MEASURE AGREEMENT, AND REPORT IT. Multiple annotators per item, and compute Krippendorff's alpha or Cohen's kappa. This number is the CEILING on any metric's correlation and the ceiling on your ability to detect differences. If agreement is low, the problem is almost always the guidelines or the task definition, not the annotators - fix it and re-run rather than averaging harder. Publishing model comparisons without reporting annotator agreement is the single most common defect in human evaluation. STEP 4 - CONTROL THE OBVIOUS CONFOUNDS. Randomize the order in which systems are presented, and randomize which system is 'A'. Blind annotators to which system produced what. Interleave items from all systems rather than evaluating one system's outputs in a block, since raters drift and calibrate to what they have recently seen. Include ATTENTION CHECKS - items with a known answer - and screen out raters who fail them. Watch for fatigue: quality degrades measurably after about an hour, so cap session length. STEP 5 - GET THE RIGHT ANNOTATORS. For specialist domains, crowdworkers cannot judge factual correctness of clinical or legal text and will judge FLUENCY instead while believing they are judging accuracy. This is a serious and common failure - the evaluation then measures style and is reported as measuring correctness. Pay properly, because rushed annotation is bad annotation, and provide a channel for annotators to flag broken or ambiguous items. STEP 6 - SIZE THE STUDY. Compute how many items you need to detect the difference you care about, given the observed variance. Small human evaluations - twenty items, two raters - cannot distinguish systems that differ by a few percent, yet they are used to claim exactly that. Report CONFIDENCE INTERVALS on every human number, and if the intervals overlap, say the result is inconclusive rather than picking the higher mean. STEP 7 - ANALYZE PROPERLY. Aggregate per item before per system. Use statistical tests appropriate to paired designs. Report the DISTRIBUTION, not just the mean - a system that is usually excellent and occasionally terrible is different from one that is uniformly mediocre, and the mean conflates them. Look at the disagreement cases specifically; they are usually where the interesting behaviour is. THE PRACTICAL COMPROMISE for a real project, since full human evaluation is too slow for the development loop: run a careful human evaluation ONCE to validate an automatic metric or an LLM judge on your data, use the validated proxy for iteration, and re-anchor with a smaller human evaluation periodically to catch drift. The mistake is either extreme - trusting a proxy you never validated, or trying to run human evaluation on every change and therefore running it badly."
        },
        {
          "q": "How do you evaluate a system when there is no reference output at all?",
          "a": "THIS IS THE COMMON CASE IN PRODUCTION and most of the literature assumes otherwise. Chat assistants, agents, open-ended generation, and creative tasks have no gold answer, so reference-based metrics do not apply at all. The approach is to stop asking 'how close is this to the right answer' and start CHECKING PROPERTIES the output must have. WHAT YOU CAN CHECK WITHOUT A REFERENCE. (1) GROUNDEDNESS, which is the most valuable and the most tractable: is every claim supported by the provided source? Entailment models or an LLM judge with the source in hand answer this, and it needs no reference because the source IS the standard. (2) INSTRUCTION FOLLOWING: did it obey the constraints in the prompt - length, format, language, requested structure, exclusions? Many of these are programmatically checkable, which makes them the cheapest reliable signal you have. (3) FORMAT AND SCHEMA VALIDITY: is the JSON parseable, are the required fields present, do enumerated values come from the allowed set? Free and binary. (4) SELF-CONSISTENCY: sample several outputs at temperature and measure agreement. Disagreement correlates with error and needs no ground truth at all - it is one of the better uncertainty signals available. (5) SAFETY AND POLICY compliance via classifiers. (6) TASK-SPECIFIC EXECUTABLE CHECKS, which are the strongest signal when available: does the generated code compile and pass tests, does the SQL run and return plausible rows, does the extracted date parse. Wherever the output can be EXECUTED or VALIDATED, do that instead of judging it. COMPARATIVE EVALUATION, which sidesteps the reference problem. You usually do not need to know whether an output is good in the abstract - you need to know whether the new system is better than the old one. Pairwise preference between systems, judged by humans or an LLM, answers that directly. Arena-style Elo aggregates it across many comparisons. This is why chat evaluation converged on preference-based methods. ONLINE AND BEHAVIOURAL SIGNALS, which are the closest thing to ground truth in a deployed product. Did the user accept the suggestion, copy the answer, click the citation, rephrase the question, or abandon the session? Did the support ticket get resolved? These measure what you actually care about rather than a proxy for it. They are noisy, laggy, and confounded, and they require enough traffic for an A/B test - but they are the only signals that measure the real objective, and a system that improves on every offline metric while degrading acceptance rate is telling you the offline metrics are wrong. BUILDING A REFERENCE-FREE SUITE, which is what I would actually deliver. A layered set: programmatic checks (format, constraints, safety) run on every output because they are free; groundedness and self-consistency run on a sample continuously; LLM-judge pairwise comparison against the current production system on a fixed evaluation set for every candidate change; human evaluation periodically to anchor the judge; and online metrics as the final arbiter. Plus a REGRESSION SET of specific cases that previously failed - a growing collection of concrete failures with expected behaviour, which over time becomes the most valuable evaluation asset you have because every entry represents a real problem someone found. THE MINDSET SHIFT worth stating: with no reference, evaluation stops being a score and becomes a SPECIFICATION. You are enumerating what must be true of a good output and checking each. That is more work, and it is also more useful - each check that fails tells you exactly what is wrong, which a similarity score never does."
        },
        {
          "q": "How would you detect and handle benchmark contamination?",
          "a": "THE PROBLEM. Models are pretrained on web-scale corpora that include the benchmarks used to evaluate them - test sets, their solutions, discussion of them, and derivative copies. A contaminated benchmark measures memorization rather than capability, and every reported number on it is an overestimate of unknown size. As models train on more of the web, this gets worse rather than better. HOW TO DETECT IT, in order of directness. (1) N-GRAM OVERLAP against the pretraining corpus - search for long exact matches between test items and training data. This is what OpenAI and others do internally and it is the most direct method. Its limits are real: it requires access to the training data, which for most models you do not have, and it misses paraphrased or reformatted copies. (2) MEMBERSHIP-INFERENCE STYLE PROBES that need no corpus access. Compare the model's likelihood on the benchmark item against its likelihood on a perturbed version - a contaminated model assigns unusually high probability to the EXACT wording. The 'guided prompting' variant is cleaner: give the model the dataset name and the start of an instance and see whether it completes the rest verbatim; reproducing a test item exactly is strong evidence. (3) ORDERING SENSITIVITY: for multiple-choice benchmarks, a contaminated model's accuracy drops when the options are shuffled, because it memorized the answer position or the exact option text. Cheap and revealing. (4) TEMPORAL SPLITS: evaluate on data created AFTER the model's training cutoff. If performance drops sharply relative to older items of the same type and difficulty, that gap is a contamination estimate. This is the most convincing single test and it is why benchmarks with continuously-added fresh items are valuable. (5) PERFORMANCE ANOMALIES as a smell test: suspiciously strong performance on one benchmark relative to closely-related ones, or performance that does not degrade on harder subsets the way it should. HOW TO HANDLE IT. (1) PRIVATE HELD-OUT SETS that never touch the public internet. The most effective fix, and it requires discipline - one publication of your test set destroys it permanently. (2) DYNAMIC AND LIVE BENCHMARKS that add fresh items continuously, so any given model has a genuinely unseen slice. (3) PERTURBED VARIANTS: regenerate benchmark items with the same structure and different surface - new numbers, renamed entities, reworded questions. A large drop between original and perturbed is direct evidence of memorization, and this technique needs no corpus access, which makes it available to anyone evaluating a third-party model. (4) EVALUATE ON YOUR OWN DATA, which is the practical answer for most teams. Your production distribution is not in anyone's pretraining corpus, and it is the distribution you care about. (5) REPORT CONTAMINATION CHECKS as part of any evaluation, the way you report a train/test split. WHAT I WOULD TELL A TEAM CHOOSING A MODEL. Public benchmark numbers are a WEAK signal for ranking models, and the weakness is systematic rather than random - it favours whichever model absorbed more of the benchmark, which correlates with training-data scale rather than capability. Build a small internal evaluation set from your own data, keep it private, and rank candidate models on that. It takes a week and it is worth more than every leaderboard. THE DEEPER ISSUE worth naming: contamination is a specific instance of the general problem that a benchmark stops measuring a capability once it becomes an optimization target - directly through contamination, and indirectly through the field selecting architectures, data, and hyperparameters that happen to do well on it. Held-out data is only held out until someone looks at it, and the field has looked at every major benchmark many times. That argues for treating evaluation sets as consumable resources with a finite life, and for building fresh ones continuously rather than defending old ones."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "BLEU",
        "back": "Clipped n-gram PRECISION, geometric mean over n=1..4, times a brevity penalty. Corpus-level only - the geometric mean zeroes out whenever any n-gram order has no match, which is common in one short sentence."
      },
      {
        "type": "pitfall",
        "front": "Unqualified BLEU is not comparable",
        "back": "Tokenization, casing, and normalization move it by several points, so 1-2 BLEU differences between papers were often preprocessing differences. Use sacreBLEU and report its SIGNATURE, not just the number."
      },
      {
        "type": "pitfall",
        "front": "ROUGE rewards length",
        "back": "It is recall-oriented, so longer outputs cover more reference n-grams mechanically. Comparing systems with different output lengths ranks verbosity. Constrain length or use an F-measure variant."
      },
      {
        "type": "definition",
        "front": "BERTScore",
        "back": "Greedy match candidate to reference tokens by cosine similarity of CONTEXTUAL embeddings. Handles paraphrase, which n-gram overlap cannot. Score depends on the embedding checkpoint - report which one."
      },
      {
        "type": "definition",
        "front": "Learned metrics (COMET, BLEURT)",
        "back": "Neural models trained directly to predict human quality judgments from (source, candidate, reference). Since the objective IS human correlation, they correlate best - now the recommended default for MT."
      },
      {
        "type": "pitfall",
        "front": "LLM-judge biases",
        "back": "POSITION (prefers the first option), VERBOSITY (prefers longer), SELF-PREFERENCE (prefers its own family), and style-over-substance. Fix: both orders with consistency required, report length distributions, use a different model family, pairwise not 1-10."
      },
      {
        "type": "intuition",
        "front": "Always report the human-human ceiling",
        "back": "A metric correlating 0.58 with humans is uninterpretable alone. If annotators agree at 0.62, that metric is near the limit of the measurement; if they agree at 0.90, there is real headroom."
      },
      {
        "type": "pitfall",
        "front": "Perplexity across tokenizers",
        "back": "It is per-TOKEN, and different vocabularies segment text differently - larger vocabularies give fewer, harder tokens and higher perplexity at equal quality. Normalize to bits-per-character to compare."
      },
      {
        "type": "intuition",
        "front": "What perplexity does not measure",
        "back": "Downstream capability at close range (instruction tuning IMPROVES usefulness while WORSENING raw-text perplexity), generation quality under sampling, or anything cross-dataset. It measures surprise at given text."
      },
      {
        "type": "pitfall",
        "front": "The lead-3 baseline",
        "back": "Just taking a news article's first three sentences is famously competitive on ROUGE, because references are extractive and lead-biased. Report it alongside your system or the comparison is not interpretable."
      },
      {
        "type": "intuition",
        "front": "Reference-free evaluation",
        "back": "With no gold answer, stop scoring similarity and start CHECKING PROPERTIES: groundedness (entailment vs source), instruction compliance, schema validity, self-consistency across samples, and executable checks. Each failure is actionable; a similarity score never is."
      },
      {
        "type": "intuition",
        "front": "Benchmark contamination",
        "back": "Detect with n-gram overlap (needs corpus access), verbatim-completion probes, option-shuffling sensitivity, or post-cutoff data. Handle with private held-out sets, perturbed variants, and above all your OWN data - which is in nobody's pretraining corpus."
      }
    ],
    "refs": [
      {
        "title": "Papineni et al. (2002), BLEU: a Method for Automatic Evaluation of Machine Translation",
        "url": "https://aclanthology.org/P02-1040/"
      },
      {
        "title": "Post (2018), A Call for Clarity in Reporting BLEU Scores (sacreBLEU)",
        "url": "https://arxiv.org/abs/1804.08771"
      },
      {
        "title": "Zhang et al. (2020), BERTScore: Evaluating Text Generation with BERT",
        "url": "https://arxiv.org/abs/1904.09675"
      },
      {
        "title": "Rei et al. (2020), COMET: A Neural Framework for MT Evaluation",
        "url": "https://arxiv.org/abs/2009.09025"
      },
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      }
    ],
    "demos": [
      "classification-metrics",
      "calibration",
      "embeddings",
      "edit-distance"
    ]
  },
  "cot": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Two capabilities appeared at scale that nobody trained for directly. IN-CONTEXT LEARNING: put a few input-output examples in the prompt and the model performs the task, with no gradient step - the 'learning' happens entirely in the forward pass. CHAIN OF THOUGHT: ask the model to work through the problem before answering and accuracy on multi-step problems jumps dramatically, with PaLM-540B going from 17.9% to 56.9% on GSM8K grade-school maths purely from the prompt format.",
        "The natural interpretation is that the model is learning the task from the examples and then reasoning through the problem. Two experiments make that interpretation hard to sustain. Min et al. replaced the labels in the few-shot demonstrations with RANDOM ones - pairing each input with an incorrect class - and performance barely moved. What mattered was the label SPACE, the input distribution, and the FORMAT; the actual input-to-label mapping contributed little. And Turpin et al. biased models by always placing the correct answer at option (A) in the few-shot examples, then gave a test question where (A) was wrong. Accuracy fell by up to 36 points, the models followed the bias - and their chains of thought NEVER MENTIONED IT, instead constructing fluent, plausible justifications for the biased answer.",
        "So the honest framing is that chain of thought is a computational device, not a window. Generating intermediate tokens gives the model more forward passes to work with, lets it externalize state that would otherwise have to be held in a single activation, and conditions later tokens on earlier partial results - and that genuinely improves accuracy on problems requiring several steps. What it does not do is faithfully report the computation that produced the answer. Those are different claims, they are routinely conflated, and the difference matters enormously the moment you use a model's stated reasoning as evidence about its actual reasoning."
      ],
      "math": [
        {
          "h": "Why intermediate tokens add computation",
          "paras": [
            "A transformer answering directly must compute the answer within a fixed depth of L layers. Generating n intermediate tokens gives it n additional forward passes, each conditioned on everything written so far - so the effective serial computation available scales with the length of the reasoning, not just with depth."
          ],
          "tex": "\\text{direct: } \\;\\text{depth} = L \\qquad\\text{vs}\\qquad \\text{CoT: } \\;\\text{effective depth} \\approx L \\cdot n_{\\text{tokens}}",
          "texNote": "This is why CoT helps most on problems with inherent SERIAL structure - multi-step arithmetic, multi-hop inference - and helps little on problems solvable in one step. Theoretical work formalizes this: with a polynomial number of intermediate tokens, constant-depth transformers can express computations they provably cannot express in a single pass."
        },
        {
          "h": "Self-consistency: marginalize over reasoning paths",
          "paras": [
            "Greedy decoding commits to one chain. Sampling many chains and taking the majority vote on the FINAL ANSWER treats the reasoning path as a latent variable to be marginalized out - and it works because there are many ways to reach a correct answer and comparatively few ways to reach any specific wrong one."
          ],
          "tex": "\\hat{a} = \\arg\\max_{a} \\sum_{i=1}^{k} \\mathbb{1}\\big[\\mathrm{ans}(r_i) = a\\big], \\qquad r_i \\sim p_\\theta(\\cdot \\mid x), \\; T > 0",
          "texNote": "Wang et al. report roughly +18 points on GSM8K over greedy CoT with k ~ 40 samples. The cost is k forward passes, and the gain saturates around k = 20-40. Note it requires a comparable final answer, so it applies to tasks with extractable discrete answers, not open-ended generation."
        },
        {
          "h": "What the demonstrations actually contribute",
          "paras": [
            "Min et al. decomposed the few-shot prompt into four factors and ablated each. The input-label MAPPING - the thing everyone assumes is being learned - turned out to matter least."
          ],
          "tex": "p(y \\mid x, \\mathcal{D}) \\;\\text{ depends on }\\; \\{\\text{label space}, \\text{input distribution}, \\text{format}\\} \\;\\gg\\; \\{\\text{input-label mapping}\\}",
          "texNote": "Replacing every demonstration label with a random one costs only a few points on many classification tasks. The demonstrations are largely LOCATING a capability the model already has - specifying the output vocabulary and the response format - rather than teaching a new mapping."
        }
      ],
      "code": [
        {
          "h": "The faithfulness test you can run in an afternoon",
          "paras": [
            "This is the experiment that should change how you read a model's explanation. It requires no special access - only the ability to construct a biased prompt."
          ],
          "code": "# Turpin et al. (2023), \"Language Models Don't Always Say What They Think\"\n#\n# SETUP: few-shot examples where the correct answer is ALWAYS option (A).\n# Then a test question where (A) is wrong.\n\nbiased_prompt = few_shot_with_all_answers_at_A + test_question\nclean_prompt  = few_shot_with_shuffled_answers  + test_question\n\n#   accuracy, clean prompt ........ baseline\n#   accuracy, biased prompt ....... up to 36 points LOWER\n#   chains of thought that MENTION the position pattern ..... ~0\n#\n# The model's answer moved because of the position bias. Its stated reasoning\n# never referenced the bias - it produced a fluent, specific, plausible\n# justification for the biased answer instead. Not a refusal to explain, and\n# not an obviously bad explanation: a CONFABULATION.\n#\n# Same finding with a social-bias cue in the few-shot examples: the model\n# adopts the biased answer and explains it on other grounds.\n\n# THE THREE PRACTICAL TESTS for whether a CoT is load-bearing (Lanham et al.):\n#   1. TRUNCATE the chain and force an answer early. If the answer is\n#      unchanged, the later reasoning was not doing work.\n#   2. INJECT A MISTAKE mid-chain. If the final answer is unaffected, the\n#      chain is not being read by the rest of the computation.\n#   3. PARAPHRASE the chain. If the answer flips, it depended on surface form.\n#\n# Larger models were found to be LESS faithful by these tests on easier tasks -\n# they can reach the answer without the chain, so the chain becomes decoration.",
          "caption": "A model's answer shifts by up to 36 points under a position bias its chain of thought never mentions. Stated reasoning is a generated artifact, not a log of the computation - which is exactly what makes it unsafe as evidence."
        },
        {
          "h": "Self-consistency, and the confidence signal it gives you free",
          "paras": [
            "The accuracy gain is the headline, but the agreement RATE across sampled chains is a genuinely useful uncertainty estimate - one of the better ones available from a black-box model."
          ],
          "code": "from collections import Counter\n\ndef self_consistent_answer(prompt, k=20, temperature=0.7):\n    chains  = [generate(prompt, temperature=temperature) for _ in range(k)]\n    answers = [extract_final_answer(c) for c in chains]\n    counts  = Counter(a for a in answers if a is not None)\n    if not counts:\n        return None, 0.0\n    top, n = counts.most_common(1)[0]\n    return top, n / len(answers)          # agreement rate = confidence proxy\n\nanswer, agreement = self_consistent_answer(prompt)\nif agreement < 0.6:\n    answer = escalate_to_human(prompt)    # disagreement predicts error well\n\n# GSM8K, representative published numbers:\n#   greedy CoT ................. 56.5\n#   self-consistency, k=40 ..... 74.4\n#\n# Two caveats worth stating. (1) Cost is LINEAR in k - 40 samples is 40x the\n# inference bill, and the gain saturates around k=20-40. (2) It requires a\n# comparable discrete final answer, so it does not apply to open-ended text.\n#\n# And a limitation that matters more than either: majority voting over\n# reasoning paths does not make the reasoning FAITHFUL. It marginalizes over\n# sampling noise in the path, which improves the answer; it does nothing about\n# a systematic bias that shifts every sampled path in the same direction.",
          "caption": "Self-consistency buys ~18 points on GSM8K and an agreement-rate confidence signal for free. It corrects sampling noise in the reasoning path - not systematic bias, which moves every path together."
        }
      ],
      "useCases": [
        "Multi-step quantitative and logical problems - arithmetic word problems, unit conversions, date and schedule reasoning, multi-hop lookups - where the serial structure is exactly what intermediate tokens provide room for.",
        "Self-consistency for high-stakes single-answer questions, where the agreement rate across sampled chains doubles as a confidence estimate that can route low-agreement cases to human review.",
        "Prototyping and cold start: in-context learning gets a working system with zero labelled data and a minutes-long iteration loop, which is why almost every LLM feature begins as a prompt and is only later distilled into something cheaper.",
        "Generating reasoning traces as TRAINING DATA: sample chains, keep the ones that reach a verified-correct answer, and fine-tune on them. This bootstrapping loop (STaR and its descendants) is how much reasoning capability is now trained, and it sidesteps the faithfulness problem by only requiring the answer to be right."
      ],
      "pitfalls": [
        "Reading a chain of thought as an explanation. Models follow biases their stated reasoning never mentions - up to a 36-point accuracy shift from a position cue with essentially zero acknowledgement of it. The chain is generated text that looks like reasoning, not a log of the computation that produced the answer.",
        "Assuming demonstrations teach the input-label mapping. Replacing every demonstration label with a RANDOM one costs only a few points on many tasks. What the examples supply is the label space, the input distribution, and the format - they locate an existing capability rather than teaching a new one.",
        "Ignoring demonstration ORDER. Permuting the same few examples can move accuracy from near state-of-the-art to near chance on the same model and task. Report the variance across permutations, or you are reporting one lucky ordering.",
        "Expecting CoT to help below roughly 10B parameters. On small models it often HURTS, because they generate incoherent chains and then condition on them. The threshold is task-dependent and partly an artifact of how the metric is measured, but the practical implication holds.",
        "Using CoT on single-step tasks. It adds latency and cost and can reduce accuracy, because it introduces opportunities to talk yourself out of a correct immediate answer. Reserve it for problems with genuine serial structure.",
        "Treating self-consistency as a fix for unfaithful reasoning. It marginalizes over sampling noise in the path, which improves the answer; a systematic bias moves every sampled path the same way and survives the vote untouched.",
        "Deploying in-context learning where a few hundred labels exist. A fine-tuned small model will usually beat few-shot prompting, run far cheaper, and be more consistent. ICL's niche is genuinely zero-data or fast-changing tasks."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/interpretability",
          "text": "The faithfulness problem is precisely why mechanistic interpretability uses CAUSAL interventions rather than asking the model what it did - self-report is not evidence."
        },
        {
          "ref": "advanced-nlp/nli",
          "text": "Same structure as the artifact story: a model achieving the right output through a mechanism other than the one assumed, invisible to the metric being reported."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "CoT and in-context learning are the canonical 'emergent' capabilities, and whether emergence is real or an artifact of discontinuous metrics is an open and consequential argument."
        },
        {
          "ref": "rag-agents/agent-loops",
          "text": "ReAct and agent scaffolds are chain of thought with tool calls interleaved - the same mechanism, with external actions grounding the intermediate steps."
        },
        {
          "ref": "advanced-nlp/nlp-eval",
          "text": "A plausible-sounding chain is exactly the kind of output an LLM judge rewards, which is how style-over-substance bias and unfaithful reasoning compound."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is chain-of-thought prompting?",
          "a": "Prompting the model to produce intermediate reasoning steps before its answer. On GSM8K, PaLM-540B went from 17.9% to 56.9% purely from the prompt format."
        },
        {
          "q": "What is zero-shot CoT?",
          "a": "Appending 'Let's think step by step' with no worked examples. Substantially cheaper than few-shot CoT and recovers much of the gain (Kojima et al.)."
        },
        {
          "q": "Why do intermediate tokens help mechanically?",
          "a": "They add serial computation. A direct answer must be computed within L layers; n reasoning tokens give n additional forward passes, each conditioned on the partial result, so effective depth scales with chain length."
        },
        {
          "q": "When does CoT NOT help?",
          "a": "Single-step tasks, where it adds cost and can talk the model out of a correct immediate answer; and small models (below roughly 10B), where incoherent chains get conditioned on and hurt."
        },
        {
          "q": "What is self-consistency?",
          "a": "Sample k reasoning chains at temperature, then majority-vote on the FINAL ANSWER. About +18 points on GSM8K at k~40; the agreement rate is also a useful confidence estimate."
        },
        {
          "q": "Why does self-consistency work?",
          "a": "It marginalizes the reasoning path as a latent variable. There are many routes to a correct answer and comparatively few to any specific wrong one, so correct answers accumulate votes."
        },
        {
          "q": "What is in-context learning?",
          "a": "Performing a task from examples in the prompt, with no weight update. The adaptation happens entirely in the forward pass."
        },
        {
          "q": "What did Min et al. find about demonstrations?",
          "a": "Replacing every demonstration label with a RANDOM one barely hurts. The label space, input distribution, and format do the work; the input-label mapping contributes little."
        },
        {
          "q": "How sensitive is ICL to example order?",
          "a": "Severely. Permuting the same few examples can span near-state-of-the-art to near-chance on the same model and task, so a single ordering's result is not a measurement."
        },
        {
          "q": "What is the CoT faithfulness problem?",
          "a": "The stated reasoning does not reflect the actual computation. Biasing models with a position cue shifted accuracy by up to 36 points while the chains never mentioned the cue - they confabulated other justifications."
        },
        {
          "q": "How do you test whether a chain is load-bearing?",
          "a": "Truncate it and force an early answer; inject a mistake mid-chain; paraphrase it. If the final answer is unchanged, the chain was not doing the work."
        },
        {
          "q": "What is STaR-style bootstrapping?",
          "a": "Sample reasoning chains, keep only those reaching a verified-correct answer, fine-tune on them, repeat. It converts a prompting trick into trained capability and needs only the ANSWER to be checkable."
        }
      ],
      "standard": [
        {
          "q": "Explain chain-of-thought prompting: why it works, and what it does not tell you.",
          "a": "WHAT IT IS. Prompt the model to produce intermediate steps before the final answer, either by including worked examples (few-shot CoT, Wei et al.) or by simply appending 'Let's think step by step' (zero-shot CoT, Kojima et al.). The gains on multi-step problems are large - PaLM-540B on GSM8K went from 17.9% to 56.9% with no change to the model at all. WHY IT WORKS - three mechanisms, and they are separable. (1) MORE SERIAL COMPUTATION. A transformer producing an answer directly has L layers of depth to compute it in, full stop. Each generated token is another forward pass conditioned on everything written so far, so n reasoning tokens give roughly n times the serial computation. There is theoretical backing here: constant-depth transformers with a polynomial number of intermediate tokens can express computations provably outside their single-pass expressive class. This is the mechanism I would lead with, because it explains the pattern of when CoT helps. (2) EXTERNALIZED WORKING MEMORY. Intermediate results are written into the context and can be attended to later, rather than having to be maintained in a single activation vector through the remaining layers. For a problem with several intermediate quantities this is the difference between feasible and not. (3) DISTRIBUTION CONDITIONING. Text that reasons step by step is followed, in the training corpus, by correct conclusions more often than text that jumps to an answer. Producing reasoning-shaped tokens moves the model into a region of its distribution where correct answers are more likely. This is the least satisfying mechanism and probably contributes real effect. THE EVIDENCE FOR THE COMPUTATIONAL ACCOUNT. CoT helps most on problems with inherent serial structure and little on single-step problems - exactly what the depth argument predicts. Longer chains help more on harder problems. And there is the striking finding that FILLER TOKENS - meaningless padding - can recover part of the benefit on some tasks, which supports 'more compute' over 'better reasoning' as at least part of the story. WHAT IT DOES NOT TELL YOU, which is the important half. The chain is NOT a faithful account of how the answer was produced. Turpin et al. biased models by placing the correct answer at option (A) in every few-shot example, then tested on a question where (A) was wrong. Accuracy dropped by up to 36 points, models followed the bias, and their chains of thought essentially never mentioned it - instead producing fluent, specific justifications for the biased answer on entirely different grounds. That is confabulation, not a bad explanation. Lanham et al. made this measurable with three tests: truncate the chain and force an early answer, inject an error mid-chain, or paraphrase it - if the final answer is unchanged, the chain was not load-bearing. Their more uncomfortable finding is that LARGER models are often LESS faithful on easy tasks, because they can reach the answer without the chain, so the chain becomes post-hoc decoration. WHY THE DISTINCTION MATTERS PRACTICALLY. If you use CoT to IMPROVE ACCURACY, none of this is a problem - it works, use it. If you use CoT as an EXPLANATION - to audit a decision, to detect bias, to satisfy a transparency requirement, or to let a user verify the reasoning - then you are relying on a property it does not have, and the failure mode is a plausible-sounding justification for a decision made on other grounds. That is worse than no explanation, because it is convincing. The honest position is that chain of thought is a computational technique that happens to be human-readable, and readability is not faithfulness."
        },
        {
          "q": "How does in-context learning work, and what do the ablations tell us?",
          "a": "THE PHENOMENON. Put a few input-output examples in the prompt and the model performs the task on a new input, with no gradient update. GPT-3 made this the dominant interface, and it is genuinely strange: the adaptation happens entirely inside a forward pass over the context. WHAT THE ABLATIONS FOUND, which is where the interest is. Min et al. decomposed the demonstrations into four factors and ablated each. The headline: replacing every demonstration's label with a RANDOM one - deliberately pairing inputs with wrong labels - costs only a few points on many classification tasks. What DOES matter: (a) the LABEL SPACE, so the model knows the possible outputs; (b) the INPUT DISTRIBUTION, so it knows what kind of text it is dealing with; (c) the FORMAT, so it knows the response shape; and (d) the number of examples, with diminishing returns. The input-label MAPPING - the thing 'learning from examples' implies - contributes least. Lu et al. added the ORDER result: permuting the same examples can move a model from near state-of-the-art to near chance, which is not the behaviour of something learning a mapping. WHAT THAT IMPLIES. The demonstrations largely LOCATE a capability the model already has rather than teaching a new one - they specify the task, the vocabulary, and the format, and the model's pretrained knowledge does the rest. That reframes 'in-context learning' as 'task identification' for a large class of cases. THE IMPORTANT CAVEAT, because the story got more nuanced. This holds most strongly for tasks the model already knows. For genuinely NOVEL mappings - arbitrary or flipped label semantics - larger models CAN override their priors and learn the demonstrated mapping (Wei et al., 'Larger language models do in-context learning differently'). So there is a spectrum: small models rely almost entirely on priors and format, large models can genuinely use the mapping when it conflicts with what they expect. Both findings are real and the apparent contradiction is a scale effect. THE MECHANISTIC ACCOUNTS, none fully settled. (1) INDUCTION HEADS: attention heads implementing 'find the previous occurrence of the current token and copy what followed it'. Olsson et al. showed these form abruptly during training at the same point ICL ability appears, and ablating them damages it - the strongest mechanistic evidence available, though induction heads clearly do not explain all of ICL. (2) IMPLICIT GRADIENT DESCENT: several groups showed transformers CAN implement gradient descent on a linear model within their forward pass, and trained transformers on linear-regression tasks behave consistently with that. Elegant, demonstrated in toy settings, and the extent to which real LLMs do it is unresolved. (3) BAYESIAN TASK INFERENCE: the model treats the prompt as evidence about which latent task is being requested and conditions on the posterior. This matches the ablation results best - it explains why format and label space matter more than the mapping, since they are what identify the task. (4) The pretraining data's structure - documents containing repeated patterns and analogies - creates the pressure for these circuits. WHAT I TAKE FROM IT PRACTICALLY. (a) Spend effort on FORMAT and on choosing REPRESENTATIVE inputs, not only on label correctness. (b) Test multiple ORDERINGS and report the variance; a single ordering's number is not a measurement. (c) Retrieve demonstrations similar to the test input rather than using a fixed set - consistently helps. (d) If you have a few hundred labels, fine-tune instead; ICL's real niche is zero-data and fast iteration. (e) Do not describe ICL as 'the model learns from your examples' to stakeholders, because it sets an expectation the mechanism does not meet - it will not reliably absorb a correction you put in the prompt.",
          "deepDive": {
            "q": "Is 'emergence' at scale real, or an artifact of how capabilities are measured?",
            "a": "THE CLAIM. Certain capabilities - multi-step arithmetic, CoT benefit, some in-context learning - are absent in smaller models, appear abruptly beyond a parameter threshold, and cannot be predicted by extrapolating smaller models' performance. Wei et al. catalogued dozens of such curves and the framing became widespread, with real consequences: if capabilities appear discontinuously and unpredictably, then small-scale evaluation cannot tell you what a larger model will do, which is an argument about safety as much as about science. THE CHALLENGE (Schaeffer et al., 'Are Emergent Abilities of Large Language Models a Mirage?'). Emergence may be a property of the METRIC rather than of the model. The argument: many emergent capabilities are measured with DISCONTINUOUS, ALL-OR-NOTHING metrics - exact match on a multi-digit arithmetic answer, or accuracy on a task where every step must be right. Consider 5-digit addition scored by exact match. If per-digit accuracy improves smoothly from 0.7 to 0.9, exact-match accuracy on all five digits goes from 0.7^5 ~ 0.17 to 0.9^5 ~ 0.59 - and if per-digit accuracy is lower still, the exact-match curve looks flat and then explodes. The underlying capability improved SMOOTHLY; the metric manufactured the cliff. Their evidence: switching to continuous metrics on the same tasks and models - token edit distance, per-token accuracy, log-probability of the correct answer - makes the sharp transitions disappear and reveals smooth, predictable improvement. They also produce emergence artificially in vision models by choosing a discontinuous metric, showing the effect is metric-driven rather than domain-specific. WHERE THIS LEAVES THE ARGUMENT, honestly. The critique is correct that many published emergence curves are metric artifacts, and this is now widely accepted. It does not fully dissolve the phenomenon, for several reasons. (1) SOME transitions survive continuous metrics, and INDUCTION HEADS are the cleanest case - Olsson et al. observed a genuine phase change during training, visible as a bump in the loss curve, with a mechanistic correlate (the circuit forming) and a behavioural correlate (ICL appearing). That is a real discontinuity in the model, not in the measurement. (2) The metric-artifact argument explains why the CURVE looks sharp; it does not remove the fact that the model could not do the task at one scale and can at another. If exact-match on 5-digit addition is what your application needs, the practical discontinuity is real even if the underlying quantity moved smoothly. (3) Discontinuities in the LOSS LANDSCAPE and in learned circuits are documented independently - grokking is a related phenomenon where generalization appears long after memorization, with the loss showing a genuine phase transition. WHAT I THINK THE DEFENSIBLE SYNTHESIS IS. Underlying capabilities improve smoothly and predictably with scale, and this is well supported - scaling laws work. Many reported 'emergent' jumps are the composition of that smooth improvement with a thresholded metric. But circuits do form discretely during training, and downstream USABILITY genuinely is thresholded, because applications require tasks to be done correctly end to end rather than 80% correctly. WHY IT MATTERS BEYOND THE SEMANTICS. If emergence is a mirage, then small-scale experiments plus continuous metrics let you predict large-model behaviour, and evaluation should switch to continuous metrics wherever possible - which is good practice regardless. If some emergence is real, then there are capabilities you cannot anticipate before training, and safety evaluation must happen after training at scale. Both conclusions have teeth, and the practical recommendation is the same in either case: measure with continuous metrics so you can see the trend, AND evaluate at the scale you intend to deploy, because the thresholded version is what your users experience."
          }
        },
        {
          "q": "How would you make a model's reasoning more trustworthy given the faithfulness problem?",
          "a": "ACCEPT FIRST THAT YOU CANNOT MAKE FREE-FORM CoT FAITHFUL BY ASKING IT TO BE. The failure is not that the model is being evasive; it is that the text is generated by the same process that produced the answer and has no privileged access to that process. So the strategies are about making the reasoning VERIFIABLE or making it STRUCTURALLY LOAD-BEARING, not about improving the prose. STRATEGY 1 - MAKE THE REASONING EXECUTABLE. If the model writes CODE that computes the answer, the reasoning is checkable by running it. Program-aided language models (PAL) and program-of-thought do exactly this for quantitative problems, and the gain is twofold: arithmetic is delegated to an interpreter that does not make slips, and the trace is inspectable and re-runnable. Wherever the reasoning can be expressed as a computation, this is the strongest available answer. STRATEGY 2 - GROUND EACH STEP IN RETRIEVAL OR TOOLS. In a ReAct-style loop the model alternates reasoning with actions - search, lookup, calculation - and each intermediate claim is anchored to a retrieved source or a tool result. You can then verify the intermediate steps independently of the model's narration of them. This does not make the model's internal process transparent, but it makes the CLAIMS checkable, which is usually what you actually needed. STRATEGY 3 - FORCE THE CHAIN TO BE LOAD-BEARING. Decompose the problem so each step's output is the literal input to the next, with the model unable to see the whole problem at once. Least-to-most prompting and explicit decomposition pipelines do this. If a step's output is what the next step consumes, the chain cannot be decorative - and Lanham et al.'s truncation test is the way to verify you achieved it. STRATEGY 4 - VERIFY INSTEAD OF TRUSTING. Train or prompt a separate VERIFIER to check each step or the final answer. Process-supervised reward models score each reasoning step rather than only the outcome, and were shown to outperform outcome supervision on maths - which is notable because it means grading the process is trainable even though self-reported process is unreliable. Independent verification is the general principle: never let the same forward pass both produce and certify. STRATEGY 5 - MEASURE FAITHFULNESS ROUTINELY. Make the three tests part of evaluation: truncate the chain and check whether the answer changes; inject a mistake mid-chain and check whether the answer follows it; paraphrase the chain and check for flips. Also run counterfactual bias tests - reorder options, change irrelevant surface features, insert the Turpin-style position cue - and measure how much the answer moves. A faithfulness score belongs in your evaluation table next to accuracy. STRATEGY 6 - USE CONSISTENCY AS A SIGNAL. Self-consistency's agreement rate is a decent uncertainty estimate; low agreement should route to human review. Note again that it corrects sampling noise, not systematic bias. WHAT I WOULD TELL A PRODUCT TEAM, plainly. Do not show a chain of thought to users as an EXPLANATION of why the system decided something, especially in any setting with fairness or compliance stakes - it will be fluent, specific, and potentially unrelated to the actual cause, which is worse than showing nothing because it is convincing. Do show retrieved SOURCES, executed CODE, and tool RESULTS, because those are verifiable artifacts. Use CoT internally to improve accuracy, which it genuinely does. And if a regulatory requirement demands an explanation of the decision, an unfaithful narration does not satisfy it in substance even if it satisfies it in form - which is a point worth raising before it becomes someone else's problem."
        },
        {
          "q": "When should you use in-context learning versus fine-tuning?",
          "a": "THE VARIABLES ARE: how much labelled data exists, how often the task changes, how much volume you serve, and how tightly you need to control behaviour. IN-CONTEXT LEARNING WINS WHEN. (1) You have NO LABELLED DATA or a handful of examples. Below roughly 100 examples, no gradient method beats a good prompt. (2) The task CHANGES FREQUENTLY - iteration is seconds, and there is no retraining, no evaluation gate, no deployment. This is often the decisive practical factor. (3) You need MANY DIFFERENT TASKS from one model, and maintaining a fine-tune per task is not worth it. (4) The task is OPEN-ENDED or the label space is not fixed. (5) You are still discovering what the task IS, which is most of the early life of any feature - prompting lets you find the specification before committing to it. (6) You need the model's general world knowledge and reasoning, not just a mapping. FINE-TUNING WINS WHEN. (1) You have THOUSANDS of labelled examples - it will beat prompting on accuracy, usually comfortably. (2) VOLUME IS HIGH: prompts consume input tokens on every call, and a long few-shot prompt can dominate the bill; a fine-tuned model needs only the input. At scale this alone justifies it. (3) LATENCY MATTERS - a shorter prompt is a faster prefill, and a fine-tuned SMALL model beats a prompted large one on both latency and cost. (4) You need CONSISTENCY. Prompted behaviour varies with example order, phrasing, and model version; fine-tuned behaviour is baked in and versioned. (5) The task needs a SPECIALIZED FORMAT or domain conventions that are tedious to specify in a prompt and easy to demonstrate in bulk. (6) The behaviour must be RELIABLE against adversarial or unusual input, where prompt instructions can be talked around. THE ECONOMICS, which usually decide it. Fine-tuning costs a one-off training run plus ongoing maintenance - re-evaluation, versioning, and redoing it when the base model changes. ICL costs input tokens on every single request, forever. The crossover is a straightforward calculation: if a few-shot prompt adds 2,000 tokens per call and you serve a million calls a month, that is 2 billion tokens of pure overhead, which dwarfs any fine-tuning cost. Teams frequently fail to run this calculation and are surprised by the bill. THE MIDDLE OPTIONS worth naming, because the question is usually a false binary. PEFT gets fine-tuning's benefits at a fraction of the cost and lets you keep one base model with swappable adapters. PROMPT TUNING learns soft prompt embeddings - between the two in cost and capability. RETRIEVAL-AUGMENTED ICL selects demonstrations per query from a labelled pool, which uses your data without training and is consistently better than a fixed demonstration set. WHAT I ACTUALLY RECOMMEND, because it is a sequence rather than a fork: start with ICL to establish feasibility and discover the real specification. Log everything. Use the prompted system to LABEL data, with human review of a sample. Once volume or accuracy justifies it, fine-tune a smaller model on those labels and deploy that, keeping the large prompted model for the low-confidence tail and for new capabilities. This gets the LLM's flexibility during development and the small model's economics in production, and it treats the labelled dataset as the durable asset - which it is, since it survives every model change while a prompt does not."
        },
        {
          "q": "Your CoT-prompted model gets arithmetic wrong in the middle of otherwise correct reasoning. What do you do?",
          "a": "THIS IS THE MOST COMMON AND MOST FIXABLE CoT FAILURE, and the fix is to stop asking the model to do arithmetic. WHY IT HAPPENS. Language models compute arithmetic through learned pattern-matching over token sequences, not through an algorithm. Several things make it fragile: TOKENIZATION splits numbers inconsistently, so '1234' may be one token in one context and '12'+'34' in another, which makes digit alignment something the model must learn separately for every splitting pattern; carries require serial dependency across digit positions that a fixed-depth forward pass handles poorly; and larger or unusual numbers are rarer in training. The characteristic signature is exactly what you describe - correct setup, correct approach, correct final step, and a wrong multiplication in the middle. THE PRIMARY FIX - DELEGATE THE COMPUTATION. Program-aided approaches (PAL, program-of-thought) have the model write CODE expressing the reasoning and execute it. The model does what it is good at - understanding the problem and translating it into operations - and the interpreter does what it is good at, which is arithmetic. The gains on GSM8K-style benchmarks are substantial and the failure mode largely disappears, because the model is no longer computing anything. Equivalently, give it a calculator tool and require its use for every operation. If you take one thing from this question, it is this: a language model should never be the arithmetic unit in a system that has an arithmetic unit available. SECONDARY MITIGATIONS, for when tools are not available. (1) SELF-CONSISTENCY: sample k chains and majority-vote. Arithmetic slips are largely random rather than systematic, so they rarely coincide across samples, which is exactly the error type voting fixes best. (2) FORCE FINER-GRAINED STEPS - one operation per line, with intermediate results written explicitly. This both adds serial computation and makes errors localizable. (3) A VERIFIER PASS: have the model check each step, or use a separate model to. Process-supervised verifiers that score individual steps outperform outcome-only supervision on maths, and they catch exactly this failure. (4) UNIT AND SANITY CHECKS in the prompt - order of magnitude, units consistency, plausibility of the answer. (5) For simple cases, post-hoc extraction and re-computation: parse the arithmetic expressions out of the chain and evaluate them, flagging disagreements. HOW I WOULD DIAGNOSE IT PROPERLY FIRST, because 'gets arithmetic wrong' has sub-types with different fixes. Sample fifty failures and classify: is it single-operation errors (a wrong multiplication), carry or digit-alignment errors (right method, digits misaligned), transcription errors (a correct intermediate result copied wrong into the next step), or SETUP errors (the arithmetic is executed correctly but the wrong quantities were chosen)? Only the first three are fixed by delegating computation. Setup errors are comprehension failures and need better prompting, decomposition, or a stronger model - and mistaking one for the other means adding a calculator and seeing no improvement. THE SYSTEM-DESIGN POINT worth making: this is a specific instance of the general rule that you should give a language model TOOLS for anything with a deterministic correct answer - arithmetic, date computation, unit conversion, database lookup, string manipulation. Prompting a model to be more careful about arithmetic is optimizing the wrong component. The right architecture uses the model for language and judgement and delegates computation to things that compute, and the same reasoning applies to every deterministic subtask in the pipeline."
        },
        {
          "q": "What is the relationship between chain-of-thought and modern reasoning models?",
          "a": "THE LINEAGE IS DIRECT. Chain of thought began as a PROMPTING trick - discovered in 2022, requiring no model change, and producing large gains on multi-step problems. Reasoning models are what happened when the field decided to TRAIN the capability rather than elicit it. THE INTERMEDIATE STEP - BOOTSTRAPPING. STaR (Zelikman et al.) established the loop: prompt the model to produce reasoning chains, KEEP ONLY those that reach a verified-correct answer, fine-tune on them, and repeat. The elegance is that it needs only the final answer to be checkable, not the reasoning - which neatly sidesteps the faithfulness problem, since you never have to certify the chain, only the outcome. Rejection-sampling fine-tuning generalized this and it became standard practice. WHAT CHANGED WITH REASONING MODELS. (1) RL ON OUTCOMES AT SCALE. Rather than supervised fine-tuning on filtered chains, train with reinforcement learning where the reward is whether the final answer is correct (verifiable in maths, code, and formal domains). The model discovers reasoning strategies rather than imitating demonstrated ones, and the strategies that emerge - backtracking, self-checking, trying an alternative approach, explicitly noticing an error - were not designed in. (2) INFERENCE-TIME COMPUTE AS A SCALING AXIS. The striking empirical result is that accuracy improves predictably with the LENGTH of the reasoning process, giving a second scaling dimension alongside parameters and training data. You can now buy accuracy with inference tokens, which changes the deployment economics of the whole field. (3) PROCESS SUPERVISION: reward models that score each reasoning STEP rather than only the outcome, which was shown to outperform outcome supervision on maths and gives a denser training signal. (4) LONG COHERENT TRACES - thousands of tokens of exploration, far beyond what prompted CoT produced, with the model spending compute on approaches it eventually abandons. WHAT STAYED THE SAME. The underlying mechanism is unchanged: intermediate tokens buy serial computation and externalize working state. Reasoning models do more of it, better, because they were trained to rather than asked to. The faithfulness question also stayed the same and arguably got sharper - a long reasoning trace optimized against outcome reward has no pressure toward being an accurate account of the computation, only toward reaching correct answers. Several labs treat the raw trace as something not to expose to users, partly for competitive reasons and partly because it is not a clean explanation. WHAT THIS IMPLIES PRACTICALLY. (1) For maths, code, and logic, use a reasoning model rather than prompting a general model to think step by step - the trained version is substantially better and you no longer need CoT prompting techniques for it. (2) They are SLOW AND EXPENSIVE, since they generate many tokens before answering, so they are wrong for latency-sensitive or simple tasks. Route by difficulty. (3) Their advantage is concentrated in VERIFIABLE domains, because that is where outcome-based RL has a reward signal. On open-ended writing, summarization, or judgement the gains are much smaller - which follows directly from how they were trained and is worth stating when someone proposes using one for everything. (4) 'Reasoning effort' is becoming a tunable knob, which makes accuracy-versus-cost a per-request decision rather than a model-selection decision. THE ARC WORTH NAMING, because it recurs: a capability was first ELICITED by prompting, then DISTILLED into weights by fine-tuning on filtered outputs, then OPTIMIZED directly with RL against a verifiable objective. The same arc ran through instruction following and tool use, and it is a reasonable prior for whatever the next prompting trick turns out to be."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Chain-of-thought prompting",
        "back": "Prompt for intermediate steps before the answer. PaLM-540B on GSM8K: 17.9% -> 56.9% from the prompt format alone. Zero-shot variant: 'Let's think step by step'."
      },
      {
        "type": "intuition",
        "front": "Why intermediate tokens help",
        "back": "They add SERIAL COMPUTATION. A direct answer must be computed in L layers; n reasoning tokens give n more forward passes, each conditioned on the partial result. Explains why CoT helps on multi-step and not single-step problems."
      },
      {
        "type": "pitfall",
        "front": "CoT is not an explanation",
        "back": "Turpin et al.: bias the few-shot examples so the answer is always (A), and accuracy drops up to 36 points while the chains essentially NEVER mention the cue - they confabulate other justifications. Generated text that looks like reasoning, not a log of it."
      },
      {
        "type": "definition",
        "front": "Testing whether a chain is load-bearing",
        "back": "TRUNCATE it and force an early answer; INJECT a mistake mid-chain; PARAPHRASE it. If the final answer does not change, the chain was decoration. Larger models are often LESS faithful on easy tasks - they don't need the chain."
      },
      {
        "type": "definition",
        "front": "Self-consistency",
        "back": "Sample k chains at temperature, majority-vote the FINAL ANSWER (~+18 pts on GSM8K at k=40). Works because many paths reach a correct answer and few reach any specific wrong one. Agreement rate = a free confidence estimate."
      },
      {
        "type": "pitfall",
        "front": "Self-consistency does not fix unfaithfulness",
        "back": "It marginalizes SAMPLING NOISE in the reasoning path. A systematic bias shifts every sampled path in the same direction and survives the vote untouched."
      },
      {
        "type": "pitfall",
        "front": "Random demonstration labels barely hurt",
        "back": "Min et al.: replacing every few-shot label with a wrong one costs a few points. What matters is the LABEL SPACE, INPUT DISTRIBUTION, and FORMAT. Demonstrations largely LOCATE an existing capability rather than teach a mapping."
      },
      {
        "type": "pitfall",
        "front": "Demonstration order sensitivity",
        "back": "Permuting the same few examples can span near-SOTA to near-chance on the same model and task. Report variance across permutations, or you are reporting one lucky ordering."
      },
      {
        "type": "definition",
        "front": "Induction heads",
        "back": "Attention heads implementing 'find the previous occurrence of this token and copy what followed'. They form ABRUPTLY during training at the same point ICL appears, and ablating them damages it - the strongest mechanistic evidence for ICL."
      },
      {
        "type": "intuition",
        "front": "Is emergence real?",
        "back": "Many emergence curves are METRIC artifacts - exact-match on multi-step tasks turns smooth per-step improvement into a cliff (0.7^5=0.17 -> 0.9^5=0.59). Continuous metrics flatten most of them. But induction-head formation is a genuine phase change, and thresholded USABILITY is real regardless."
      },
      {
        "type": "intuition",
        "front": "Fix arithmetic errors by delegating",
        "back": "Don't prompt the model to be careful - have it write CODE and execute it (PAL), or give it a calculator. Models compute arithmetic by pattern-matching over inconsistently-tokenized digits. Never make an LLM the arithmetic unit when one is available."
      },
      {
        "type": "definition",
        "front": "STaR bootstrapping",
        "back": "Sample chains, KEEP only those reaching a verified-correct answer, fine-tune on them, repeat. Needs only the ANSWER to be checkable, not the reasoning. The bridge from CoT-as-prompting to reasoning models trained with outcome-based RL."
      }
    ],
    "refs": [
      {
        "title": "Wei et al. (2022), Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        "url": "https://arxiv.org/abs/2201.11903"
      },
      {
        "title": "Min et al. (2022), Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?",
        "url": "https://arxiv.org/abs/2202.12837"
      },
      {
        "title": "Turpin et al. (2023), Language Models Don't Always Say What They Think",
        "url": "https://arxiv.org/abs/2305.04388"
      },
      {
        "title": "Wang et al. (2023), Self-Consistency Improves Chain of Thought Reasoning",
        "url": "https://arxiv.org/abs/2203.11171"
      },
      {
        "title": "Schaeffer et al. (2023), Are Emergent Abilities of Large Language Models a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      }
    ],
    "demos": [
      "self-consistency",
      "decoding",
      "constrained-decoding",
      "react-agent"
    ]
  },
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
    ]
  }
};
