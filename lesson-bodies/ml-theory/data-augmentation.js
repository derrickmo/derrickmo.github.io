// GENERATED from content/lessons/ml-theory/data-augmentation.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/data-augmentation/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "data-augmentation": {
    "level": "core",
    "body": {
      "intuition": [
        "Data augmentation generates additional training examples by applying transformations that DO NOT CHANGE THE LABEL - a horizontally flipped cat is still a cat, a slightly rotated X-ray still shows the same anatomy, an audio clip with added room noise is still the same word. It is usually the highest-leverage regularizer for perceptual data, and the reason is that it attacks overfitting's root cause directly: overfitting happens when the model has more capacity than the data constrains, and augmentation effectively multiplies the amount of data. But that framing undersells it. The deeper function is that augmentation TEACHES AN INVARIANCE - it tells the model, by example, that a particular kind of variation is irrelevant to the answer.",
        "That reframing is what makes the technique thinkable rather than a bag of tricks. Every augmentation asserts a symmetry of your task, so the design question is always 'what variation will I see at test time that should not change the prediction?'. Get it right and you have injected domain knowledge for free. Get it wrong and you have injected LABEL NOISE: a horizontal flip is fine for natural photographs and destroys text, turns a '6' into something like a '9', and mislabels a medical image where laterality is diagnostic. The same operation is correct or harmful depending entirely on the task, which is why augmentation policies cannot be copied between domains without thought.",
        "COLOR SPACES are the practical companion for images. RGB is how sensors record and screens display, but it entangles brightness with color - so if you want to vary illumination without changing hue, RGB is the wrong basis. HSV separates Hue (which color), Saturation (how vivid), and Value (how bright), so you can jitter brightness alone; LAB separates a perceptual Lightness channel from two opponent-color channels and is approximately perceptually uniform, so equal numeric distances correspond to roughly equal visual differences. Choosing the space in which to perturb is choosing WHICH aspect of appearance you are claiming the label is invariant to - the same design question, one level down."
      ],
      "math": [
        {
          "h": "Augmentation as an expectation over a transformation group",
          "paras": [
            "Training with augmentation replaces the empirical risk with an expectation over label-preserving transformations. This is a form of VICINAL RISK MINIMIZATION - instead of learning only at the observed points, you learn over a neighbourhood around them, defined by the transformation distribution you chose. The whole method rests on the assumption stated in the constraint: the label must be preserved."
          ],
          "tex": "\\min_{\\theta}\\; \\mathbb{E}_{(x,y)\\sim D}\\; \\mathbb{E}_{T\\sim \\mathcal{T}}\\Big[\\mathcal{L}\\big(f_\\theta(T(x)),\\, y\\big)\\Big] \\qquad \\text{s.t.}\\quad y\\big(T(x)\\big) = y(x)\\;\\; \\forall T \\in \\mathcal{T}",
          "texNote": "T = the augmentation distribution (your assumed invariance group). Violating the constraint - a flip that changes a '6' to a '9' - injects label noise directly into the objective, which is why an inappropriate augmentation is worse than none."
        },
        {
          "h": "Mixup: interpolate inputs and labels together",
          "paras": [
            "Mixup blends two examples AND their labels by the same coefficient, so the label constraint is satisfied by construction rather than by assumption. It encourages linear behaviour between training points, which measurably improves calibration and robustness to label noise - and it needs no domain knowledge, which is why it works outside vision too."
          ],
          "tex": "\\tilde{x} = \\lambda x_i + (1-\\lambda) x_j, \\qquad \\tilde{y} = \\lambda y_i + (1-\\lambda) y_j, \\qquad \\lambda \\sim \\mathrm{Beta}(\\alpha, \\alpha)",
          "texNote": "alpha in [0.1, 0.4] is typical; alpha -> 0 recovers no mixing. CutMix instead pastes a rectangular patch from one image into another and mixes the labels by AREA - preserving local statistics (real texture) while still blending targets."
        }
      ],
      "code": [
        {
          "h": "An augmentation pipeline, and where the color-space choice lives",
          "paras": [
            "The important detail is not the library but the split in behaviour: augmentation is applied to the TRAINING set only, never to validation or test. Note also that ColorJitter's brightness/saturation/hue arguments are perturbations in a decomposed color space - RGB would not let you vary brightness independently."
          ],
          "code": "import torch, torchvision.transforms.v2 as T\n\ntrain_tf = T.Compose([\n    T.RandomResizedCrop(224, scale=(0.6, 1.0)),   # scale + translation invariance\n    T.RandomHorizontalFlip(p=0.5),                # VALID for natural photos, NOT for text\n    T.ColorJitter(brightness=0.3, contrast=0.3,   # illumination invariance ...\n                  saturation=0.3, hue=0.05),      # ... hue kept SMALL: it changes object identity\n    T.RandomGrayscale(p=0.1),\n    T.ToDtype(torch.float32, scale=True),\n    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),\n    T.RandomErasing(p=0.25),                      # occlusion robustness (after normalize)\n])\n\n# Validation/test: deterministic ONLY - no randomness, or your metric becomes noisy\n# and (worse) optimistic if the augmentation happens to simplify the task.\neval_tf = T.Compose([\n    T.Resize(256), T.CenterCrop(224),\n    T.ToDtype(torch.float32, scale=True),\n    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),\n])\n\ntrain_ds = ImageFolder(root='train', transform=train_tf)\nval_ds   = ImageFolder(root='val',   transform=eval_tf)",
          "caption": "Augmentation belongs to the training set only. Note hue is jittered far less than brightness/saturation - hue shifts change object identity (a red apple becomes green), which is a label-preserving assumption that fails much sooner."
        },
        {
          "h": "The honest test: does the augmentation match a real invariance?",
          "paras": [
            "An augmentation only helps if it matches a variation the task actually contains. The way to know is to measure, not to assume - and the measurement that matters is on a test set that CONTAINS the corruption you are training against."
          ],
          "code": "# CIFAR-10 style experiment, same model and schedule, augmentation varied:\n#\n#   augmentation             clean test   rotated test   blurred test\n#   none                        0.883         0.412          0.601\n#   flip + crop                 0.931         0.455          0.638\n#   + rotation (+/-15 deg)      0.934         0.802          0.641   <- matches the shift\n#   + heavy rotation (+/-90)    0.901         0.815          0.635   <- too strong: clean drops\n#   + gaussian blur             0.928         0.448          0.812   <- matches the OTHER shift\n#\n# Two readings. (1) An augmentation buys robustness to the variation it MODELS and\n# almost nothing else - rotation does not help under blur. (2) Strength has an\n# optimum: +/-15 deg helps everywhere, +/-90 deg costs 3 points of clean accuracy\n# because upside-down objects are not in the test distribution.\n\ndef sanity_check(ds, tf, n=16):\n    \"\"\"ALWAYS look at augmented samples before training on them.\"\"\"\n    import matplotlib.pyplot as plt\n    fig, axes = plt.subplots(2, n // 2, figsize=(16, 5))\n    for ax, i in zip(axes.flat, range(n)):\n        ax.imshow(tf(ds[i][0]).permute(1, 2, 0).clip(0, 1)); ax.axis('off')\n        ax.set_title(ds.classes[ds[i][1]], fontsize=8)   # label must still be TRUE\n    plt.tight_layout()",
          "caption": "Augmentations buy robustness to the specific variation they model and little else, and their strength has an optimum - too aggressive costs clean accuracy. The sanity_check habit (look at augmented images with their labels) catches label-destroying transforms before they cost you a training run."
        }
      ],
      "useCases": [
        "Vision with limited labelled data - medical imaging, industrial inspection, scientific imagery - where elastic deformation, flips, and intensity jitter routinely matter more than the architecture (U-Net's original result depended on heavy elastic augmentation with ~30 training images).",
        "Modern image-classification recipes generally: RandAugment/TrivialAugment plus Mixup/CutMix plus RandomErasing are standard in every strong training recipe, and much of the reported gap between architectures has turned out to be recipe rather than architecture.",
        "Self-supervised learning, where augmentation IS the learning signal: contrastive methods define 'similar' as 'two augmentations of the same image', so the augmentation policy determines what invariances the representation acquires.",
        "Audio and text with domain-appropriate transforms: SpecAugment (time/frequency masking), speed and pitch perturbation, room impulse responses for audio; back-translation and span masking for text - the same principle, different symmetry groups."
      ],
      "pitfalls": [
        "Augmenting the validation or test set: it makes your metric noisy and can make it optimistic. Augment training only, with deterministic evaluation transforms - test-time augmentation is a separate, deliberate inference technique, not part of evaluation.",
        "Applying transformations that break the label: horizontal flip destroys text and laterality-sensitive medical images; large rotations turn digits into other digits; aggressive hue shifts change object identity (red apple to green). Each of these silently injects label noise.",
        "Assuming more augmentation is better: strength has an optimum. Distorting examples beyond the true data distribution makes the training task harder than the real one and costs clean accuracy - the CIFAR-style sweep shows heavy rotation losing 3 points versus a moderate setting.",
        "Expecting augmentation to fix underfitting: it is a regularizer, so it addresses VARIANCE. If training loss is already high, augmentation makes it worse - diagnose the train/validation gap first.",
        "Augmenting before splitting, or augmenting in a way that crosses the split: augmented copies of the same source image on both sides of a split are near-duplicates and inflate the score exactly like group leakage. Split first, then augment the training portion."
      ],
      "connections": [
        {
          "ref": "neural-nets/regularization",
          "text": "Augmentation is usually the strongest regularizer for perceptual data, and it belongs alongside weight decay, dropout, and early stopping in the same diagnosis-and-dial framework."
        },
        {
          "ref": "cnn/convolution",
          "text": "Convolution builds translation equivariance into the architecture; augmentation teaches the remaining invariances (scale, rotation, color) from data - two ways to encode the same kind of prior."
        },
        {
          "ref": "multimodal/simclr-byol",
          "text": "Contrastive self-supervised learning defines its entire training objective through augmentation, so the policy determines what the learned representation is invariant to."
        },
        {
          "ref": "cnn/style-transfer",
          "text": "Stylized-ImageNet used style transfer as an augmentation to break texture bias - the clearest case of an augmentation designed to remove a specific, measured shortcut."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is data augmentation?",
          "a": "Generating additional training examples by applying label-preserving transformations, which both multiplies effective data and teaches the model which variations are irrelevant."
        },
        {
          "q": "Why is it usually the strongest regularizer for images?",
          "a": "It attacks overfitting's root cause (too little data for the capacity) and simultaneously encodes true task invariances - more targeted than generic penalties like weight decay."
        },
        {
          "q": "What is the one hard constraint?",
          "a": "The transformation must preserve the label. If it does not, you are injecting label noise directly into the objective."
        },
        {
          "q": "Give an augmentation that is usually wrong.",
          "a": "Horizontal flip on text, on digits (6/9), or on medical images where laterality matters - and large hue shifts, which change object identity."
        },
        {
          "q": "What is Mixup?",
          "a": "Blend two images AND their labels with the same coefficient lambda ~ Beta(a,a). The label constraint holds by construction; it improves calibration and robustness to label noise."
        },
        {
          "q": "What is CutMix?",
          "a": "Paste a rectangular patch from one image into another and mix the labels by AREA - keeps local texture statistics realistic while still blending targets."
        },
        {
          "q": "What is RandAugment?",
          "a": "An automated policy with just two hyperparameters (how many ops to apply, and their global magnitude), removing AutoAugment's expensive policy search while matching its gains."
        },
        {
          "q": "Why use HSV or LAB rather than RGB?",
          "a": "RGB entangles brightness with color. HSV separates hue/saturation/value so you can jitter illumination alone; LAB separates perceptual lightness from opponent-color channels and is roughly perceptually uniform."
        },
        {
          "q": "Should you augment the validation set?",
          "a": "No - evaluation transforms must be deterministic. Random augmentation makes the metric noisy and potentially optimistic. Test-time augmentation is a separate inference-time choice."
        },
        {
          "q": "Does augmentation help underfitting?",
          "a": "No. It is a regularizer, so it targets variance. If training loss is already high you need more capacity, better features, or more training - augmentation makes it worse."
        },
        {
          "q": "What is SpecAugment?",
          "a": "Audio augmentation that masks contiguous bands of time and frequency in the spectrogram (plus time warping) - the standard recipe for speech models."
        },
        {
          "q": "How is augmentation used in self-supervised learning?",
          "a": "It defines the objective: two augmented views of the same image are a positive pair. The policy therefore determines which invariances the representation learns."
        }
      ],
      "standard": [
        {
          "q": "Explain data augmentation: why it works, how you choose transformations, and what its limits are.",
          "a": "WHY IT WORKS - two framings, and the second is the useful one. The simple framing is that augmentation multiplies your data: each image becomes many via random transforms, so the model has less opportunity to memorize specific pixels, and more effective data is the most reliable way to reduce overfitting. The deeper framing is that augmentation TEACHES AN INVARIANCE. By showing the model that a flipped, cropped, recolored cat still carries the label 'cat', you are asserting that these variations are irrelevant to the task - injecting domain knowledge that the model would otherwise have to infer from scarce examples, or would fail to infer at all. Formally it is VICINAL RISK MINIMIZATION: instead of minimizing loss at the observed points, you minimize it over a neighbourhood around them defined by your transformation distribution. That framing makes the design question precise: what is the symmetry group of my task? HOW I CHOOSE TRANSFORMATIONS. Ask what variation will occur at TEST time that should not change the answer. For natural photographs: horizontal flip (objects are not chirally distinguished), random resized crop (scale and position vary), color jitter (illumination varies), and mild rotation (camera tilt). For each, verify the label survives - which is why the same list is wrong elsewhere: flips destroy text and laterality-sensitive medical images, rotations turn a 6 into a 9, and strong hue shifts change object identity. For SPECIALIZED domains the right transforms come from the physics of acquisition: elastic deformation for anatomy (real tissue deforms smoothly), bias-field and noise simulation for MRI, room impulse responses and speed perturbation for speech. The rule of thumb: a good augmentation corresponds to a transformation the real world actually produces. THE STRENGTH QUESTION, which is where people go wrong in the other direction. Augmentation strength has an optimum, not a monotone benefit. Too little and you leave regularization on the table; too much and you distort examples outside the true data distribution, making the training task harder than the real one and costing clean accuracy. A representative sweep: moderate rotation (+/-15 degrees) improves both clean and rotated test accuracy, while heavy rotation (+/-90) buys a little more rotation robustness and loses ~3 points on clean data, because upside-down objects simply do not occur at test time. Treat the magnitude as a hyperparameter. THE LIMITS. (1) It requires KNOWING the invariances, which is domain-specific and sometimes unavailable - which is exactly why tabular augmentation is hard (perturbing a feature can change the label) and why text augmentation is delicate (synonym substitution easily changes meaning). (2) It addresses VARIANCE only - it is a regularizer, so it makes underfitting worse. (3) It buys robustness to the variation it MODELS and little else: training with rotation does not help under blur, so an augmentation policy is not generic robustness. (4) It cannot create information that is not there - augmented examples are dependent on their sources, so ten augmented copies are not ten new examples, and the benefit saturates. (5) It costs compute in the data pipeline, and an unoptimized augmentation pipeline can starve the GPU. THE THING I WOULD EMPHASIZE: modern work has shown that much of the apparent gap between architectures is actually the TRAINING RECIPE, of which augmentation is the largest component - 'ResNet Strikes Back' retrained a 2015 ResNet-50 to ~80% ImageNet top-1 with a modern recipe, close to architectures claimed to be far better. So augmentation is not a finishing touch; it is a first-order determinant of results, and comparing architectures without matching recipes is comparing recipes.",
          "deepDive": {
            "q": "Compare Mixup, CutMix and standard augmentations. Why do label-mixing methods work at all?",
            "a": "THE PUZZLE. Standard augmentations preserve the label by construction - a flipped cat is a cat. Mixup produces an image that is 60% cat and 40% dog and asks the model to predict [0.6, 0.4]. The input is not a real image of anything, and no such example exists in the world. Why does this help? MIXUP (Zhang et al., 2018): xtilde = lambda*x_i + (1-lambda)*x_j, ytilde = lambda*y_i + (1-lambda)*y_j, with lambda ~ Beta(alpha, alpha) and alpha typically 0.2. The explanations, in order of how well-supported they are. (1) IT ENFORCES LINEAR BEHAVIOUR BETWEEN EXAMPLES. Neural networks are prone to wildly confident predictions in the regions BETWEEN training points - exactly where adversarial examples live and where confidence is unjustified. Mixup explicitly supervises those regions with a sensible target, which regularizes the function to interpolate smoothly rather than to carve confident regions arbitrarily. This is the authors' framing and it is the most convincing. (2) IT IMPROVES CALIBRATION, measurably. Training on soft targets prevents the model from being pushed toward probability 1 on every training example (the mechanism that makes networks overconfident), so mixup-trained models have substantially lower expected calibration error. This is a well-replicated empirical finding and it connects mixup to label smoothing - mixup is like a data-dependent, structured label smoothing. (3) IT INCREASES ROBUSTNESS to label noise and to adversarial perturbation, because memorizing a corrupted label is harder when labels are constantly blended. (4) VICINAL RISK MINIMIZATION is the formal frame: mixup defines a vicinity distribution around each training point that is a linear path toward other points, rather than the local neighbourhood standard augmentation defines. CUTMIX (Yun et al., 2019) instead pastes a RECTANGULAR PATCH from image j into image i and mixes the labels in proportion to the patch AREA. Its advantage over mixup is that every pixel is a REAL pixel - local texture statistics stay natural, whereas mixup's blended images have unnatural ghosting that a CNN's early layers must accommodate. Its advantage over plain Cutout (which just erases a region) is that no training signal is wasted on blank pixels, and the label mixing gives extra supervision. CutMix generally outperforms mixup for image classification and is standard in strong recipes; mixup remains popular because it is domain-agnostic (it works on tabular data, audio features, and embeddings where a spatial patch has no meaning). THE HONEST CAVEATS. (a) The label-area proportionality in CutMix is an APPROXIMATION - if the pasted patch lands on background, the label mix over-credits the pasted class. Refinements (SaliencyMix, Puzzle Mix, and 'attentive' variants) address this by choosing informative regions, at added cost. (b) These methods interact with other regularizers and with training length: they generally require LONGER training to pay off, because they make the task harder, and a short-schedule comparison can show them hurting. (c) For detection and segmentation, naive mixing breaks the spatial label correspondence, so specialized variants (mosaic augmentation in YOLO) are used instead. (d) On small datasets the extra difficulty can hurt. WHAT I WOULD SAY IN SUMMARY: standard augmentation asserts an invariance you know to be true; mixup and CutMix instead construct examples where the label is known BY CONSTRUCTION (from the mixing coefficient), sidestepping the need for domain knowledge entirely. That is why they generalize across domains and why they are the components of modern recipes that require the least thought - and their calibration benefit is a genuinely valuable side effect that is often more useful than the accuracy gain."
          }
        },
        {
          "q": "Explain color spaces and why the choice matters for augmentation.",
          "a": "RGB is how cameras record and displays emit - three additive primaries - and it is a poor basis for reasoning about appearance, because it ENTANGLES the things you usually want to manipulate separately. Making an image brighter in RGB means scaling all three channels, which also changes their ratios and hence perceived saturation; changing 'the color' means moving in a direction that has no intuitive meaning. If your augmentation intent is 'this photo could have been taken under different lighting', RGB makes that hard to express. HSV (hue, saturation, value) decomposes appearance into: HUE - which color, as an angle around a color wheel; SATURATION - how vivid versus gray; VALUE - how bright. This maps directly onto augmentation intents. Brightness jitter is a change in V alone; a washed-out or vivid rendering is a change in S; and a color cast is a small change in H. Crucially it lets you apply DIFFERENT MAGNITUDES to each: standard recipes jitter brightness and saturation by 20-40% but hue by only a few percent, because hue shifts change object IDENTITY (a red apple becoming green is a different object, and for many tasks a different label) while brightness shifts do not. That asymmetry is impossible to express cleanly in RGB and is the clearest practical argument for the decomposition. LAB (or CIELAB) separates L (perceptual lightness) from a and b (green-red and blue-yellow opponent axes), and is approximately PERCEPTUALLY UNIFORM - equal numeric distances correspond to roughly equal perceived color differences, which RGB badly violates. This matters when: you want augmentation magnitudes that are perceptually meaningful rather than numerically arbitrary; you are doing color-based image processing (LAB is standard for CLAHE-style contrast enhancement, applied to L only so colors are untouched); or you are computing color distances. YCbCr splits luma from chroma and is what JPEG and video codecs use - relevant because it explains why chroma subsampling is nearly invisible (human vision is far more sensitive to luminance detail than to color detail), which is itself a useful fact about which channel carries the information. GRAYSCALE is the extreme case, and RandomGrayscale (applied with probability ~0.1) is a standard augmentation precisely because it forces the model not to rely on color alone - valuable when color is a shortcut rather than a cause. PRACTICAL IMPLICATIONS FOR AUGMENTATION DESIGN. (1) Decide WHICH aspect of appearance your task is invariant to and perturb in the space that isolates it. Lighting invariance -> V or L. Camera white-balance invariance -> small hue shifts or a color-temperature model. Print/display variation -> saturation and contrast. (2) Consider the ACQUISITION physics: for medical or scientific imaging, intensity means something (a Hounsfield unit is a physical measurement), so arbitrary brightness jitter may destroy the signal - the right augmentation there simulates real acquisition variation (bias field, noise, contrast protocol) rather than generic photographic jitter. (3) Note that these conversions are non-linear and can move values out of gamut, so implementations clip - which introduces subtle artifacts at extreme magnitudes. THE CONNECTION I would draw to close: choosing a color space is the same decision as choosing an augmentation - both are statements about which variations should leave the label unchanged. The color space just makes certain statements easy to express and others impossible, which is exactly what a good representation does."
        },
        {
          "q": "How do you decide whether an augmentation is helping, and how do you tune its strength?",
          "a": "MEASURE, DO NOT ASSUME - and measure on the right thing. The common failure is evaluating only on a clean test set from the same distribution, which under-credits augmentations that buy robustness and over-credits ones that merely regularize. (1) THE BASIC EXPERIMENT. Train with and without the augmentation, everything else identical, same seeds ideally repeated over 3+ seeds because seed variance is often comparable to the effect. Compare on: clean held-out accuracy AND on a test set that CONTAINS the variation you are training against. The second is what tells you whether the augmentation did what you intended. A representative pattern: adding moderate rotation leaves clean accuracy roughly unchanged (0.931 -> 0.934) while nearly doubling accuracy on rotated test data (0.455 -> 0.802), and does essentially nothing for blur (0.638 -> 0.641). That table is the whole method: an augmentation buys robustness to the variation it MODELS and little else. (2) TUNING STRENGTH. Sweep the magnitude and expect an inverted-U. Too weak: no regularization benefit. Too strong: examples fall outside the true data distribution, the training task becomes harder than the real one, and clean accuracy drops - heavy rotation (+/-90) costing ~3 points of clean accuracy versus a +/-15 setting is typical. The optimum shifts with dataset size (small data tolerates and benefits from more augmentation) and with training length (stronger augmentation needs longer schedules to pay off, which is a common confound in short comparisons). (3) THE INTERACTION EFFECTS people miss. Augmentation composes with other regularizers, often sub-additively: adding heavy augmentation to a model already using strong weight decay and dropout can push it into UNDERFITTING. So tune the regularization stack jointly, or at least re-check the others after changing augmentation. Also check the train/validation gap - if it has closed to nothing and both are mediocre, you have over-regularized. (4) AUTOMATED POLICIES, and when they are worth it. AutoAugment searched for policies with reinforcement learning at enormous cost; RandAugment showed you can match it with just TWO hyperparameters (N operations sampled per image, global magnitude M), which is cheap enough to grid-search directly; TrivialAugment went further and showed that applying ONE randomly chosen operation with a random magnitude - no tuning at all - is competitive, which is a striking and slightly deflating result. The practical implication: use RandAugment or TrivialAugment as a strong default rather than hand-designing a policy, and spend the saved effort on the domain-specific transforms that a generic policy cannot know about (elastic deformation for anatomy, acquisition simulation for scientific imaging). (5) THE SANITY CHECK THAT COSTS TWO MINUTES: visualize a grid of augmented samples WITH their labels before training. This catches label-destroying transforms, magnitude errors, and pipeline bugs (double normalization, wrong channel order) that would otherwise cost you a full training run and be diagnosed as a modeling problem. I would put this first in any practical answer, because it has the best effort-to-value ratio of anything in the topic. (6) FOR PRODUCTION, the decisive test is on data from the deployment distribution - ideally a held-out site, device, or time period. Augmentation's real value is usually robustness to acquisition variation, and only a shifted evaluation set can measure that."
        },
        {
          "q": "How does augmentation differ across modalities - images, audio, text, tabular?",
          "a": "The principle is identical - apply label-preserving transformations that model real variation - but the available symmetry groups differ enormously, and that difference explains why augmentation is transformative for some modalities and marginal for others. IMAGES: the richest case. Geometric (flip, crop, rotate, scale, elastic deformation), photometric (brightness, contrast, saturation, hue), occlusion (Cutout, RandomErasing), and mixing (Mixup, CutMix). Works so well because natural images have many genuine invariances and humans can articulate them. AUDIO: two levels. On the WAVEFORM - time stretching, pitch shifting, adding background noise, simulating reverberation with room impulse responses, and codec/bandwidth simulation. These are physically meaningful: the same word spoken slightly faster in a different room is still that word, and augmenting this way directly models the acquisition variation the deployed system will face. On the SPECTROGRAM - SpecAugment's time and frequency masking plus time warping, which is the standard recipe for speech recognition and was a substantial advance. Note the modality-specific constraint: pitch shifting is label-preserving for speech recognition but LABEL-DESTROYING for speaker identification or music key detection, which is a nice illustration that the transform must match the TASK, not just the data type. TEXT: the hardest of the perceptual modalities, because language is discrete and small changes often change meaning. What works: BACK-TRANSLATION (translate to another language and back, producing a genuine paraphrase - the most reliable technique), synonym replacement with care, random insertion/deletion/swap (EDA - crude but effective for small datasets), sentence reordering for document-level tasks, and span masking as used in pretraining. What fails: naive synonym substitution frequently changes sentiment or factual content ('not bad' vs 'not terrible'), and any word-level edit risks flipping the label in tasks like NLI or sentiment. Modern practice increasingly uses an LLM to generate paraphrases, which is more reliable and more expensive. And note that for large pretrained models, augmentation matters far less - pretraining already supplied the invariances. TABULAR: the weakest case, and worth being honest about. There is usually NO natural label-preserving transformation - perturbing a feature can change the true label, and columns are heterogeneous and semantically distinct. What is used: SMOTE and variants (interpolating between minority-class neighbours, which is really class rebalancing rather than augmentation and has real failure modes in high dimensions), Gaussian noise on continuous features (weak), swap-noise/CutMix-style feature mixing between rows (used in some tabular deep learning), and generative approaches (CTGAN, or diffusion models for tabular data) which are promising and hard to validate. Mixup can be applied in feature or embedding space. But the honest summary is that tabular augmentation gives modest gains compared to what it does for images, and effort is usually better spent on feature engineering. GRAPHS, TIME SERIES, POINT CLOUDS each have their own: node/edge dropping and subgraph sampling; window slicing, jittering, magnitude warping, and window warping (with the strict constraint that you must not leak the future); rotation, jitter, and point dropout respectively. THE UNIFYING QUESTION, which is the answer's real content: what transformations does the real-world data-generating process actually produce, and which of them leave the label unchanged? Where you can answer that richly (images, audio), augmentation is a first-order technique. Where you cannot (tabular), it is marginal - and recognizing which situation you are in is more valuable than knowing any particular transform."
        },
        {
          "q": "What is test-time augmentation, and when is it worth it?",
          "a": "TEST-TIME AUGMENTATION (TTA) applies augmentations at INFERENCE, runs the model on each variant, and aggregates the predictions - typically by averaging probabilities. The classic form is the 'ten-crop' evaluation (four corners, center, and their horizontal flips) used in older ImageNet papers; the modern form is usually a handful of scales and flips. WHY IT HELPS. (1) ENSEMBLING: averaging predictions over several transformed views reduces variance, in exactly the same way that averaging over model seeds does - the model's errors on different views are partially independent, so averaging cancels some of them. (2) IT COMPENSATES FOR IMPERFECT INVARIANCE: a model that is only approximately invariant to a shift will produce slightly different outputs across views, and averaging recovers a better estimate than any single view. This is the same mechanism that makes CNN predictions inconsistent under one-pixel shifts (an aliasing effect from strided downsampling) - TTA papers over it. (3) IT IMPROVES CALIBRATION, since averaging softens overconfident individual predictions. Typical gains are 0.5-1.5 points of accuracy on image classification, larger for segmentation (where averaging masks over flips/scales measurably sharpens boundaries) and in medical imaging. WHEN IT IS WORTH IT. (a) OFFLINE or batch settings where latency does not matter - scoring a research benchmark, processing a medical scan, running a nightly batch job. (b) HIGH-STAKES single predictions where a 1% gain justifies 8x compute. (c) SEGMENTATION and dense prediction, where the gain is larger. (d) When you need an UNCERTAINTY estimate cheaply - the variance across augmented views is a rough (and biased) uncertainty signal, related in spirit to MC-dropout. WHEN IT IS NOT. (a) Real-time or high-throughput serving: TTA multiplies inference cost by the number of views, and that compute is almost always better spent on a bigger model or on more training. This is the decisive argument in most production settings. (b) When the augmentations do not match a real invariance - applying a transform the model was not trained to handle can HURT. (c) When you have already trained with heavy augmentation and the model is genuinely invariant, in which case there is little variance left to average away. THE THINGS PEOPLE GET WRONG. (1) The TTA transforms should generally MATCH the training augmentations - using test transforms the model never saw during training pushes inputs off-distribution. (2) Aggregation matters: average PROBABILITIES (or logits), not hard predictions, and for segmentation you must UN-TRANSFORM the outputs before averaging (a prediction on a flipped image must be flipped back, which is a very common bug). (3) TTA must be reported honestly - a paper comparing its TTA'd model against a baseline without TTA is comparing compute budgets, not methods. (4) It interacts with calibration: averaging changes the probability distribution, so if you calibrated the single-view model, the temperature will not be right for the TTA'd one. A USEFUL FRAMING to end on: TTA is an inference-time ensemble, and it sits on the same spectrum as model ensembling and MC-dropout - all trade compute at inference for variance reduction. Given a fixed inference budget, the ranking is usually: a single larger/better-trained model > TTA on a smaller one, which is why TTA is much more common in competitions and offline analysis than in production."
        },
        {
          "q": "Augmentation encodes invariances. When is that assumption harmful?",
          "a": "It is harmful in three distinct ways, and separating them is what makes this more than a caution. (1) WHEN THE INVARIANCE IS FALSE FOR THE TASK - the direct case. The transformation changes the true label, so you are injecting LABEL NOISE into every affected example. Horizontal flip destroys text (mirror writing is not the same word), turns digits into other digits, and mislabels medical images where laterality is diagnostic (situs inversus, left-versus-right pathology). Large rotations do the same to digits and to any task with a canonical orientation. Strong hue shifts change object identity where color is criterial - a red versus green apple, a ripe versus unripe fruit, a traffic light. The insidious property is that the model still TRAINS, the loss still goes down, and the damage shows only as a mysteriously lower ceiling. The check is the two-minute one: look at augmented samples next to their labels and ask whether the label is still true. (2) WHEN THE INVARIANCE IS TRUE FOR THE TASK BUT DESTROYS INFORMATION THE MODEL NEEDS - the subtler case. In medical or scientific imaging, intensity is often a PHYSICAL MEASUREMENT (a Hounsfield unit, a fluorescence intensity, a radar return), so arbitrary brightness jitter destroys a quantitative signal even though the diagnosis label is unchanged. Similarly, aggressive cropping can remove the small region that carries the finding, teaching the model to guess from context - which produces a model that looks fine on aggregate metrics and fails on exactly the hard cases. The rule here: augment the variation that the ACQUISITION process genuinely produces (bias field, noise, protocol differences), not generic photographic jitter. (3) WHEN THE INVARIANCE IS TRUE BUT UNDESIRABLE - the case people rarely consider. Sometimes you WANT the model to be sensitive to something, and augmenting it away removes a capability. If you augment with random crops that remove object scale information, you lose the ability to estimate size; if you augment away color entirely, you cannot use color as evidence. And there is a fairness dimension: augmenting away a feature correlated with a protected attribute may be intended to reduce bias but can instead remove legitimate signal or push the model onto a different proxy - it is not a reliable debiasing method, and treating it as one is a mistake. A FOURTH, MORE SUBTLE HARM: augmentation can MASK a data problem. If your dataset is systematically biased (all positive examples photographed with one camera, all negatives with another), heavy augmentation may partly obscure the shortcut without removing it, so the model still relies on residual acquisition artifacts and you have lost the diagnostic signal that would have revealed the problem - a suspiciously easy task. Deliberately checking whether a model can solve the task from a corrupted or masked input is the counter-measure. HOW I DECIDE, practically: for every augmentation, write down the sentence 'I am asserting that the label does not depend on [X]', and then ask a domain expert whether that sentence is true. Most bad augmentations fail immediately at that step. Then validate empirically on a shifted test set, and inspect the model's errors for signs that it has become invariant to something it should have used. THE BROADER PRINCIPLE, which ties to the rest of the module: an inductive bias helps exactly to the extent it is TRUE of the data, and hurts otherwise. Augmentation is the most explicit, most controllable way to state an inductive bias - which makes it both unusually powerful and unusually easy to get wrong on purpose."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Data augmentation",
        "back": "Generating training examples via LABEL-PRESERVING transformations. Two functions: multiplies effective data (attacks overfitting's root cause) and teaches an INVARIANCE (injects domain knowledge)."
      },
      {
        "type": "formula",
        "front": "Augmentation as vicinal risk",
        "back": "min E_(x,y) E_(T~Tau)[L(f(T(x)), y)] subject to y(T(x)) = y(x). Learn over a NEIGHBOURHOOD of each point rather than at the point. Violating the constraint injects label noise."
      },
      {
        "type": "formula",
        "front": "Mixup",
        "back": "xtilde = L*x_i + (1-L)*x_j, ytilde = L*y_i + (1-L)*y_j, L ~ Beta(a,a) with a~0.2. The label holds BY CONSTRUCTION, so no domain knowledge is needed. Improves calibration and label-noise robustness."
      },
      {
        "type": "definition",
        "front": "CutMix vs Mixup",
        "back": "CutMix pastes a rectangular PATCH and mixes labels by AREA - every pixel is real, so local texture stays natural. Usually better for images; mixup is domain-agnostic (works on tabular/audio/embeddings)."
      },
      {
        "type": "intuition",
        "front": "Augmentation buys only what it models",
        "back": "Training with rotation nearly doubles rotated-test accuracy and does NOTHING for blur. It is not generic robustness - each augmentation targets one variation."
      },
      {
        "type": "pitfall",
        "front": "Strength has an optimum",
        "back": "Inverted-U: +/-15 deg rotation helps everywhere; +/-90 deg buys a little more rotation robustness and costs ~3 points of clean accuracy, because upside-down objects are not in the test distribution."
      },
      {
        "type": "definition",
        "front": "Why HSV/LAB instead of RGB",
        "back": "RGB entangles brightness with color. HSV isolates hue/saturation/value so you can jitter illumination alone; LAB is roughly perceptually uniform. Note recipes jitter brightness 20-40% but hue only ~5% - hue changes object identity."
      },
      {
        "type": "pitfall",
        "front": "Never augment validation/test",
        "back": "Evaluation transforms must be deterministic, or your metric is noisy and possibly optimistic. Test-time augmentation is a separate, deliberate inference technique that must be reported as such."
      },
      {
        "type": "definition",
        "front": "RandAugment / TrivialAugment",
        "back": "RandAugment: just N (ops per image) and M (magnitude), matching AutoAugment's searched policies at negligible cost. TrivialAugment: ONE random op at a random magnitude, no tuning - and still competitive."
      },
      {
        "type": "pitfall",
        "front": "When the invariance assumption harms",
        "back": "(1) False for the task (flip on text/digits/laterality) = label noise. (2) True but destroys physical signal (intensity jitter on CT). (3) True but undesirable (augmenting away scale you need). Write the sentence 'the label does not depend on X' and ask an expert."
      }
    ],
    "refs": [
      {
        "title": "Zhang et al. (2018), mixup: Beyond Empirical Risk Minimization",
        "url": "https://arxiv.org/abs/1710.09412"
      },
      {
        "title": "Yun et al. (2019), CutMix: Regularization Strategy to Train Strong Classifiers with Localizable Features",
        "url": "https://arxiv.org/abs/1905.04899"
      },
      {
        "title": "Cubuk et al. (2020), RandAugment: Practical automated data augmentation with a reduced search space",
        "url": "https://arxiv.org/abs/1909.13719"
      },
      {
        "title": "Park et al. (2019), SpecAugment: A Simple Data Augmentation Method for Automatic Speech Recognition",
        "url": "https://arxiv.org/abs/1904.08779"
      }
    ],
    "demos": [
      "image-augmentation",
      "label-noise",
      "histogram-equalization"
    ]
  }
};
