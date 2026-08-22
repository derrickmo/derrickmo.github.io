// GENERATED from content/lessons/advanced-nlp/gpt.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/gpt/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "gpt": {
    "interview": {
      "quickGrind": [
        {
          "q": "What is GPT's training objective?",
          "a": "Next-token prediction — maximize the log-likelihood of each token given all previous ones. One objective, no task-specific heads, and the supervision comes free with the text."
        },
        {
          "q": "Why decoder-only rather than encoder-decoder?",
          "a": "For pure generation the encoder is redundant: a causal decoder already conditions on everything to its left, so the prompt is just a prefix. Fewer parts, one objective, and every token contributes a training signal."
        },
        {
          "q": "What does the causal mask actually do?",
          "a": "Sets attention scores to -inf for future positions before the softmax, so each position attends only to itself and earlier ones. That single mask is what makes parallel training on all positions valid."
        },
        {
          "q": "Why can you train on all positions at once?",
          "a": "Because the mask makes position i's prediction independent of anything after i. So one forward pass yields T supervised predictions rather than one — the efficiency that made scaling practical."
        },
        {
          "q": "How are the training targets constructed?",
          "a": "The labels are the inputs shifted by one. Predict token t+1 from tokens 1..t, which is why an off-by-one here is a classic bug that produces confident nonsense."
        },
        {
          "q": "Why is generation sequential when training is parallel?",
          "a": "Training has the ground-truth prefix available; generation must produce token t before it can condition on it. The dependency is real, which is why decode is the expensive phase."
        },
        {
          "q": "What is the KV cache for?",
          "a": "Past keys and values do not change as you generate, so cache them. Without it each new token recomputes attention over the whole prefix, turning generation quadratic."
        },
        {
          "q": "Why is decoding memory-bandwidth-bound?",
          "a": "One token's forward pass reads every weight and the whole KV cache to do a single token's arithmetic. Arithmetic intensity is about one, against hardware ratios in the hundreds."
        },
        {
          "q": "Temperature, top-k, top-p — what do they do?",
          "a": "Temperature rescales the logits before softmax; top-k truncates to the k most likely; top-p truncates to the smallest set covering probability p. All three trade diversity against the risk of sampling a bad token."
        },
        {
          "q": "Why does greedy decoding produce repetitive text?",
          "a": "It maximizes per-step likelihood, and a high-likelihood continuation of a repeated phrase is more of the same. Degeneration is a property of the objective plus the decoder, not a training failure."
        },
        {
          "q": "What is teacher forcing here?",
          "a": "The same thing as in seq2seq: training conditions on the true prefix. It is what makes the parallel loss valid, and it is why the model never trains on its own mistakes."
        },
        {
          "q": "Is next-token prediction enough to produce a useful assistant?",
          "a": "No — it produces a model of text, which will happily continue a question with more questions. Instruction tuning and preference optimization are what turn a document continuer into something that answers."
        }
      ],
      "standard": [
        {
          "q": "Explain why next-token prediction is a strong objective and where it is misunderstood.",
          "a": "The mechanical case first: the supervision is free, so the training set is the entire corpus rather than a labelled subset, and every position in every sequence is a training example — a 1,000-token document supplies 1,000 predictions from one forward pass. That combination is what allowed the objective to scale to trillions of tokens when no labelled objective could. The deeper case is that predicting the next token is not a shallow task. To predict well across a large corpus the model has to represent syntax, factual associations, discourse structure, the identity and register of the speaker, and the constraints of whatever is being described — because all of them reduce uncertainty about what comes next. Compression and understanding become hard to separate. The misunderstanding runs in two directions. One is deflationary: 'it is just predicting the next word', which is true and uninformative, in the same way that 'evolution is just differential reproduction' is true. The other over-reads it: a model trained purely on next-token prediction models the DISTRIBUTION OF TEXT, not truth and not helpfulness, so it will continue a plausible-sounding falsehood as readily as a fact, and it will answer a question with more questions if that is what the corpus does. That gap is exactly what instruction tuning and preference optimization exist to close, and it is why the base model and the assistant are different artifacts.",
          "deepDive": {
            "q": "Are the emergent-ability claims solid?",
            "a": "Weaker than the original framing suggested. Schaeffer et al. argued that many apparent phase transitions are artifacts of DISCONTINUOUS metrics — exact-match accuracy on a multi-step task jumps from zero when the model finally gets every step right, while the underlying per-token log-likelihood was improving smoothly all along. Switching to a continuous metric often removes the discontinuity. It does not mean nothing interesting happens with scale; it means 'emergence' claims should be checked against a metric that can see partial progress before being treated as evidence of a qualitative change."
          }
        },
        {
          "q": "Walk through the causal mask and what depends on it.",
          "a": "In self-attention every position computes scores against every other, and the mask adds -inf to the upper triangle before the softmax so those become exactly zero weight. Position i therefore attends to positions 1 through i only. The consequences are larger than the implementation. First, correctness of the parallel loss: because prediction i depends on nothing after i, a single forward pass over a length-T sequence produces T independent supervised predictions, all valid. Remove the mask and every position sees its own answer, the loss collapses toward zero, and you have trained nothing — the classic catastrophic bug, and it is invisible except that the loss looks wonderful. Second, the KV cache is only sound because of the mask: past keys and values cannot depend on future tokens, so they are fixed once computed and can be reused, which is the entire basis of efficient generation. Third, it is what makes the architecture decoder-only in any meaningful sense — the same block with a bidirectional mask is a BERT encoder, so the mask, not the parameters, is the architectural choice. That is worth saying explicitly in an interview: encoder, decoder and prefix-LM differ by their attention mask, and the rest of the block is identical.",
          "deepDive": {
            "q": "What does the mask cost, and when would you not want it?",
            "a": "It halves the available context for representation learning: a token cannot use anything to its right, so for tasks that classify or embed a complete sequence — retrieval, NLI, token labelling — a bidirectional encoder is strictly better informed and consistently wins at matched size. That is the trade behind prefix-LM and encoder-decoder designs, which apply bidirectional attention over the input and causal attention over the output, getting full context for the thing being read and valid generation for the thing being written."
          }
        },
        {
          "q": "Why is generation so much more expensive per token than training, and what follows?",
          "a": "Because the two phases sit in different hardware regimes. Training and the prefill phase of inference process many tokens at once, so each weight loaded from memory is used for a lot of arithmetic — they are compute-bound and can approach peak FLOPs. Decoding produces one token at a time, and that single token's forward pass must read every parameter plus the entire KV cache in order to do one token's worth of math. Arithmetic intensity is around one operation per byte, against modern accelerator ratios in the hundreds, so the hardware sits idle waiting on memory and the achieved FLOPs are a small fraction of peak. Almost every inference technique is an attack on bytes-read-per-token rather than on arithmetic: quantization reduces bytes per parameter; GQA and MQA shrink the KV cache that must be re-read every step; distillation reduces the parameter count; batching amortizes one weight read across many sequences; and speculative decoding is the cleanest illustration, because verifying k drafted tokens in a single pass costs about what one token costs — the weights are read once either way. Once you see the regime, that result stops being surprising and becomes an obvious consequence: if you are memory-bound, extra arithmetic is nearly free."
        },
        {
          "q": "How would you debug a GPT-style model that trains to a low loss and generates badly?",
          "a": "Low training loss with bad generation is a specific signature and it usually means the loss is not measuring what you think. The first suspect is the shift: if the labels are not offset by one, the model is being trained to predict the token it was just shown, which drives loss to near zero and produces confident nonsense at inference. Check by taking one batch and printing input and target side by side — this takes a minute and catches the most damaging bug in the pipeline. Second suspect is the mask: if it is missing or inverted, positions attend to their own future and the loss collapses for the same reason. Verify by feeding a sequence, changing only a LATER token, and confirming the logits at an earlier position are bit-identical. Third, tokenizer mismatch between training and inference produces exactly this symptom, since the model is decoding ids that mean something else. Then the non-bug explanations: check whether generation is simply using a bad decoding configuration, since greedy decoding degenerates into repetition on a perfectly healthy model and that is not a training problem. And evaluate on held-out perplexity rather than training loss, because a low training loss with high validation perplexity is ordinary overfitting or, on a small corpus, memorization — which also produces fluent output that fails to generalize."
        },
        {
          "q": "You have a base model and you want an assistant. What is the gap?",
          "a": "The base model is a model of text, so it continues documents. Prompted with a question it may produce a list of related questions, because that is a plausible continuation in a corpus full of FAQ pages. Closing the gap has three stages in the standard recipe. Supervised fine-tuning on instruction-response pairs teaches the FORMAT — that a question should be followed by an answer, at some length, in some register. This is where most of the visible behaviour change comes from, and LIMA's result that a small number of carefully curated examples goes a long way suggests SFT is largely eliciting capability that pretraining already installed rather than teaching new capability. Then preference optimization — RLHF with a reward model and PPO, or DPO which optimizes the same preference objective directly and skips the separate reward model — tunes the qualities that are easy to judge pairwise and hard to demonstrate: helpfulness, refusing appropriately, not fabricating. The honest caveats: the reward model is a proxy and optimizing it hard produces Goodhart's failure, which is why the KL term against the reference policy is a safety knob rather than a regularization detail; preference data encodes the labellers' preferences, so 'aligned' means aligned to them; and Gudibande et al. showed imitating a stronger model's outputs improves style much more than capability, which is why a small model fine-tuned on GPT-4 transcripts can sound excellent and remain weak on anything requiring the underlying ability."
        },
        {
          "q": "How do you pick a decoding strategy?",
          "a": "By what the task tolerates. If there is a single correct answer — extraction, classification framed as generation, code that must compile, structured output — you want low or zero temperature, because sampling introduces error with no upside. If the task wants variety — brainstorming, creative writing, generating candidates for a reranker — you want sampling, and nucleus sampling is the sensible default because it adapts the truncation to the distribution's shape rather than to a fixed count: where the model is confident, top-p keeps few tokens; where it is genuinely uncertain, it keeps many. Top-k does the reverse, which is why it can either truncate a legitimately flat distribution or admit garbage from a peaked one. The thing worth understanding rather than memorizing is why pure likelihood maximization fails. Beam search on open-ended text produces bland repetitive output — Holtzman et al.'s degeneration result — because the highest-probability continuation of any text is more of the same, while human text is not the maximum-likelihood sequence and sits at a characteristic level of surprise. So sampling is not a concession to compute; for open-ended generation it produces text that is more human-like than the mode does. Beam search remains right for constrained tasks like translation where the target really is close to a single best sequence."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Next-token prediction",
        "back": "Maximize log p(x_t | x_<t). Supervision is free, and one forward pass over T tokens yields T training examples."
      },
      {
        "type": "formula",
        "front": "Causal mask",
        "back": "Add -inf to the upper triangle of the attention scores before softmax. Position i attends to 1..i only."
      },
      {
        "type": "intuition",
        "front": "The mask IS the architecture",
        "back": "Encoder, decoder and prefix-LM differ by their attention mask; the block is identical. Bidirectional mask on the same code is BERT."
      },
      {
        "type": "intuition",
        "front": "Why training parallelizes and decoding does not",
        "back": "Training has the true prefix, so all positions are independent. Generation must emit token t before conditioning on it."
      },
      {
        "type": "formula",
        "front": "Decode arithmetic intensity",
        "back": "~1 op/byte — one token's math requires reading every weight plus the whole KV cache. Hardware ratios are in the hundreds, so decode is bandwidth-bound."
      },
      {
        "type": "definition",
        "front": "Nucleus (top-p) sampling",
        "back": "Truncate to the smallest set covering probability p. Adapts to the distribution's shape, unlike top-k's fixed count."
      },
      {
        "type": "intuition",
        "front": "Why speculative decoding is free",
        "back": "Verifying k drafted tokens in one pass costs about what one token costs, because the weights are read once either way. A direct consequence of being memory-bound."
      },
      {
        "type": "intuition",
        "front": "Base model vs assistant",
        "back": "The base model continues documents — it may answer a question with more questions. SFT teaches format; preference optimization tunes what is easy to judge and hard to demonstrate."
      },
      {
        "type": "pitfall",
        "front": "Off-by-one in the shift",
        "back": "Training the model to predict the token it was just given drives loss toward zero and produces confident nonsense. Print one batch's inputs and targets side by side."
      },
      {
        "type": "pitfall",
        "front": "Missing or inverted mask",
        "back": "Positions see their own answer, loss collapses, nothing is learned — and the loss curve looks excellent. Test: change a later token, confirm earlier logits are unchanged."
      },
      {
        "type": "pitfall",
        "front": "Beam search on open-ended text",
        "back": "The highest-probability continuation of anything is more of the same. Human text is not the mode; degeneration is the objective plus the decoder, not a training failure."
      },
      {
        "type": "pitfall",
        "front": "Reading emergence off a discontinuous metric",
        "back": "Exact-match jumps from zero when the last step finally lands, while per-token likelihood improved smoothly. Check with a metric that can see partial progress."
      }
    ],
    "refs": [
      {
        "title": "Radford et al. (2019) — Language Models are Unsupervised Multitask Learners (GPT-2)",
        "url": "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf"
      },
      {
        "title": "Brown et al. (2020) — Language Models are Few-Shot Learners (GPT-3)",
        "url": "https://arxiv.org/abs/2005.14165"
      },
      {
        "title": "Holtzman et al. (2019) — The Curious Case of Neural Text Degeneration (nucleus sampling)",
        "url": "https://arxiv.org/abs/1904.09751"
      },
      {
        "title": "Ouyang et al. (2022) — Training Language Models to Follow Instructions with Human Feedback",
        "url": "https://arxiv.org/abs/2203.02155"
      },
      {
        "title": "Schaeffer, Miranda & Koyejo (2023) — Are Emergent Abilities of LLMs a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      }
    ],
    "demos": []
  }
};
