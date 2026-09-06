// GENERATED from content/lessons/multimodal/audio-representations.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/audio-representations/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "spectrogram": "Spectrogram (STFT)",
      "mfcc": "Mel Filterbank & MFCC",
      "fourier": "Fourier Series",
      "pitch-detection": "Pitch Detection"
    }
  }
};
