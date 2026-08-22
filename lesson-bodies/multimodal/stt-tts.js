// GENERATED from content/lessons/multimodal/stt-tts.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/stt-tts/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
  }
};
