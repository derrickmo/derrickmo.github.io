// GENERATED from content/lessons/multimodal/clip.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/multimodal/clip/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "clip": {
    "interview": {
      "quickGrind": [
        {
          "q": "What does CLIP actually train?",
          "a": "Two encoders, image and text, mapped into one shared space, so that a caption's embedding is close to its own image's and far from every other image in the batch."
        },
        {
          "q": "State the loss.",
          "a": "Symmetric InfoNCE over the batch: cross-entropy over image-to-text similarities and over text-to-image similarities, with matched pairs on the diagonal as the labels."
        },
        {
          "q": "Where do the negatives come from?",
          "a": "The batch. With batch size N you get N-1 negatives per example for free, which is why CLIP-style training wants very large batches — the loss gets harder and better as N grows."
        },
        {
          "q": "What is the temperature for?",
          "a": "It scales the logits before softmax and controls how sharply the loss concentrates on the hardest negatives. CLIP learns it rather than fixing it, and it is not optional — cosine similarities live in [-1,1] and without a temperature the softmax is nearly flat."
        },
        {
          "q": "How does zero-shot classification work?",
          "a": "Embed each class name in a prompt template, embed the image, and take the nearest text embedding. The text tower literally computes the classifier's weight matrix."
        },
        {
          "q": "Why does the prompt template matter?",
          "a": "Because the text encoder was trained on captions, not bare nouns. 'A photo of a {}' matches the training distribution better than '{}', and ensembling several templates gives a further point or two."
        },
        {
          "q": "What is the modality gap?",
          "a": "Image and text embeddings occupy separate cones in the shared space, so an image scores higher against a random image than against its own caption. Cosine similarities are comparable WITHIN a modality, not across."
        },
        {
          "q": "What follows from the modality gap practically?",
          "a": "CLIP scores rank, they do not threshold. An absolute similarity of 0.3 means nothing on its own; only the ordering across candidates is meaningful."
        },
        {
          "q": "How is this the same loss as SimCLR?",
          "a": "Identical objective, different source of pairs. SimCLR builds the positive pair with two augmentations of one image; CLIP gets it free from the image-caption association."
        },
        {
          "q": "Why did CLIP need internet-scale data?",
          "a": "The supervision per pair is weak — an alt-text is a noisy, partial description. Four hundred million pairs is what turns a weak signal into a strong one."
        },
        {
          "q": "What is CLIP bad at?",
          "a": "Compositionality and relations. It behaves substantially like a bag of concepts, so 'a horse riding an astronaut' and its reverse embed very similarly. Also counting, spatial relations, and rendered text."
        },
        {
          "q": "Where does CLIP show up beyond classification?",
          "a": "As the text conditioner in text-to-image models, as a retrieval index, as a reranker, as a zero-shot filter for dataset curation, and as the backbone of many vision-language models."
        }
      ],
      "standard": [
        {
          "q": "Explain the contrastive objective and why the batch size matters so much.",
          "a": "For a batch of N image-caption pairs, encode both sides, L2-normalize, and compute the N x N matrix of cosine similarities scaled by a learned temperature. The correct pairing is the diagonal, so the loss is cross-entropy along the rows — each image against all N captions — plus cross-entropy along the columns, each caption against all N images. Symmetric InfoNCE. The reason batch size matters is that the batch IS the negative set: every off-diagonal entry is a negative, so N controls both how many negatives you have and how hard they are. With a small batch the task is easy — distinguishing your caption from 31 random ones requires only coarse features, so the model has no pressure to learn fine distinctions. With 32,768, as CLIP used, the batch is likely to contain genuinely confusable examples and the objective forces discriminative representations. This is also why the engineering matters: the loss requires all-to-all similarities, so scaling to that batch size across many GPUs means gathering embeddings across devices before computing the loss, which is a communication pattern rather than a modelling detail, and it is the reason reproductions with small batches underperform in a way that looks like a data problem and is not. The temperature interacts with this directly — it is what determines how much the loss concentrates on the hardest negatives, so the effective difficulty is a joint property of N and temperature rather than of N alone.",
          "deepDive": {
            "q": "Why is the temperature learned rather than fixed?",
            "a": "Because the right sharpness changes during training. Early on, when embeddings are near-random, a low temperature would produce enormous gradients on essentially arbitrary hard negatives; late in training a high temperature makes the loss too flat to keep improving. Learning it lets the model anneal itself. CLIP parameterizes it in log space and clamps it to avoid the degenerate solution of driving it to zero, which the optimizer will otherwise pursue because arbitrarily sharp logits reduce the training loss."
          }
        },
        {
          "q": "Walk through zero-shot classification and what actually makes it work.",
          "a": "The mechanism is that the text tower converts class names into a classifier. For each class, fill a prompt template, encode it, normalize, and stack the results — that matrix is exactly a linear classifier's weights, computed rather than trained. At inference, encode the image, take the dot product with each class embedding, softmax over classes. No labelled examples touched the model, and adding a class means writing a string. What makes it work in practice is less elegant than the mechanism suggests, and the details are worth knowing because they are where the accuracy lives. Prompt templates matter because the text encoder saw captions, so a bare class name is off-distribution; 'a photo of a {}' recovers a couple of points and ensembling many templates by averaging their embeddings recovers a couple more. Class-name disambiguation matters more than either on real taxonomies — a dataset with a class literally named 'crane' is ambiguous between the bird and the machine, and rewriting names is often the single largest fix available. And the scoring is relative, not absolute: the softmax over class embeddings is meaningful, but the raw similarity value is not comparable to any threshold because of the modality gap, so 'is this image any of my classes' is a fundamentally harder question than 'which of my classes is it', and needs a calibrated or held-out approach rather than a similarity cutoff.",
          "deepDive": {
            "q": "How would you do open-set detection with CLIP, given that?",
            "a": "Not with a raw similarity threshold, since the modality gap makes it uncalibrated. The workable approaches all convert the problem back into a comparison: add explicit background or negative class prompts so the softmax has somewhere to put unfamiliar inputs; calibrate the margin between the top and second class on a small held-out set, since the margin is a within-modality quantity and behaves far better than the absolute score; or run conformal prediction over the class scores to get a set-valued output with a coverage guarantee, which is the principled version and turns 'is it in my classes' into a set that may be empty."
          }
        },
        {
          "q": "What is the modality gap, and why does it matter operationally?",
          "a": "Despite training a shared space, image embeddings and text embeddings do not intermingle — they occupy distinct, roughly cone-shaped regions, separated by a consistent offset. The measurable consequence is that an image is typically MORE similar to a random other image than to its own caption, with numbers around 0.6 versus 0.3 being typical. That is not a bug in a particular checkpoint; it is a general phenomenon attributed partly to initialization and partly to the contrastive objective, which only ever needs to rank the correct pairing above the alternatives and never needs the two modalities to overlap. The operational consequences are concrete. First, absolute similarity is not interpretable and any threshold-based system built on it will behave unpredictably across datasets, which is a very common mistake in production filters. Second, comparisons must stay within a modality where possible — image-to-image retrieval is far better behaved than image-to-text scoring. Third, systems that combine CLIP scores with other scores additively are combining quantities on incomparable scales, so the weights end up encoding the gap rather than a real preference. The practical response is to work with rankings and margins rather than raw values, and to calibrate on held-out data whenever a decision requires a threshold."
        },
        {
          "q": "CLIP is described as behaving like a bag of words. What does that mean and how was it established?",
          "a": "It means the representation is largely insensitive to the composition and relational structure of the caption — 'a horse riding an astronaut' and 'an astronaut riding a horse' embed very similarly, and shuffling caption word order changes the embedding much less than the meaning change would warrant. The ARO benchmark established this by constructing negatives that differ from the true caption only by attribute, relation or order, and showing CLIP models perform near or below chance on them, which is a much sharper result than a general accuracy number. The reason is traceable to the objective: with in-batch negatives drawn at random, distinguishing the correct caption from 32,000 unrelated ones almost never requires understanding word order, because a bag of concepts already separates them. The training signal simply does not reward compositional understanding. The essential follow-up is that the benchmark had a flaw of its own — SugarCrepe showed that a BLIND text-only model scores 83 to 87% on ARO and VL-Checklist, because the procedurally generated negatives were less FLUENT than the real captions, so a language model could pick the real one without seeing the image at all. So the phenomenon is real and its original measurement was partly measuring something else, which makes this one of the better examples in the curriculum of a benchmark built to expose a shortcut containing one."
        },
        {
          "q": "How would you adapt CLIP to a specialized domain?",
          "a": "Ordered by cost, and the first step is usually skipped. Start by measuring zero-shot with engineered prompts and disambiguated class names, because on many domains that is already usable and it costs an afternoon — and if it is not usable, the shape of the failure tells you which of the later options to pick. Then linear probing on frozen features, which needs few labels and is a strong baseline that people under-run; if a linear probe on CLIP features already matches your requirement, nothing else is warranted. Then the parameter-efficient middle: CoOp and CoCoOp learn the prompt CONTEXT as continuous vectors rather than writing strings, which adapts the classifier with very few labels and no backbone updates, and Tip-Adapter builds a cache of few-shot features blended with the zero-shot predictions, which is training-free and surprisingly effective. Then full or partial fine-tuning, which needs real data and carries a specific risk here: fine-tuning on a narrow domain destroys the general alignment, so the model gets better at your task and stops being CLIP — WiSE-FT's weight interpolation between the zero-shot and fine-tuned models exists precisely to recover the robustness that fine-tuning discards. Finally, continued contrastive pretraining on in-domain image-text pairs if you have them at scale, which is what BioMedCLIP and similar domain models did, and which is the only option that genuinely moves the representation rather than adapting a head."
        },
        {
          "q": "Where does the contrastive image-text recipe fail as a design choice?",
          "a": "Three places. First, anything requiring dense or localized understanding: CLIP produces one global embedding per image, so segmentation, detection and counting are not naturally expressible, and systems that need them either bolt on a dense head or use an architecture with region-level supervision. Second, generation — CLIP scores alignment and cannot produce text, so vision-language models that answer questions use a generative decoder with the CLIP-style encoder as a component rather than being CLIP. Third, fine-grained distinctions that alt-text does not carry: web captions rarely specify species, part names or measurement values, so the training signal for those distinctions is genuinely absent and no amount of scale supplies it. There is also a data caveat worth stating because it now matters commercially as much as technically — the recipe requires hundreds of millions of image-text pairs, and the provenance, licensing and bias of web-scraped alt-text are real constraints rather than footnotes. The bias part is measurable: the captions encode the associations of the internet, and those propagate into zero-shot classifications in ways that have been documented and that a downstream user inherits silently, since the classifier was never trained by anyone who could audit its training set."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "CLIP loss",
        "back": "Symmetric InfoNCE over an N x N similarity matrix scaled by a learned temperature; the correct pairs are the diagonal. Cross-entropy along rows and columns."
      },
      {
        "type": "intuition",
        "front": "The batch IS the negative set",
        "back": "N controls how many negatives and how hard. Small-batch reproductions underperform in a way that looks like a data problem and is not."
      },
      {
        "type": "intuition",
        "front": "The text tower computes the classifier",
        "back": "Encoding class-name prompts produces the weight matrix of a linear classifier. Adding a class means writing a string."
      },
      {
        "type": "definition",
        "front": "Modality gap",
        "back": "Image and text embeddings occupy separate cones. An image is typically more similar to a random image (~0.6) than to its own caption (~0.3)."
      },
      {
        "type": "pitfall",
        "front": "Thresholding a CLIP score",
        "back": "The modality gap makes absolute similarity uninterpretable. CLIP scores RANK; they do not threshold. Use margins, calibration or conformal sets."
      },
      {
        "type": "intuition",
        "front": "Why the temperature is learned",
        "back": "The right sharpness changes over training. Parameterized in log space and clamped, because the optimizer will otherwise drive it to zero."
      },
      {
        "type": "intuition",
        "front": "Same loss as SimCLR",
        "back": "Identical objective, different positive pair: SimCLR augments one image, CLIP uses the free image-caption association."
      },
      {
        "type": "definition",
        "front": "Prompt ensembling",
        "back": "Average the embeddings of several caption templates. Worth a point or two; class-name disambiguation is usually worth more on real taxonomies."
      },
      {
        "type": "pitfall",
        "front": "Expecting compositional understanding",
        "back": "In-batch random negatives never require word order, so CLIP behaves like a bag of concepts. 'Horse riding an astronaut' embeds like its reverse."
      },
      {
        "type": "pitfall",
        "front": "Trusting the ARO numbers",
        "back": "SugarCrepe showed a BLIND text-only model scores 83-87% on ARO — the generated negatives were less fluent. The phenomenon is real; that measurement was partly measuring fluency."
      },
      {
        "type": "pitfall",
        "front": "Fine-tuning away the alignment",
        "back": "Narrow-domain fine-tuning destroys general robustness. WiSE-FT interpolates zero-shot and fine-tuned weights precisely to recover it."
      },
      {
        "type": "pitfall",
        "front": "Additively combining CLIP with other scores",
        "back": "The scales are incomparable, so the blend weights end up encoding the modality gap rather than a real preference."
      }
    ],
    "refs": [
      {
        "title": "Radford et al. (2021) — Learning Transferable Visual Models From Natural Language Supervision (CLIP)",
        "url": "https://arxiv.org/abs/2103.00020"
      },
      {
        "title": "Liang et al. (2022) — Mind the Gap: Understanding the Modality Gap in Multi-modal Contrastive Learning",
        "url": "https://arxiv.org/abs/2203.02053"
      },
      {
        "title": "Yuksekgonul et al. (2023) — When and Why Vision-Language Models Behave Like Bags-of-Words (ARO)",
        "url": "https://arxiv.org/abs/2210.01936"
      },
      {
        "title": "Hsieh et al. (2023) — SugarCrepe: Fixing Hackable Benchmarks for Vision-Language Compositionality",
        "url": "https://arxiv.org/abs/2306.14610"
      },
      {
        "title": "Wortsman et al. (2022) — Robust Fine-Tuning of Zero-Shot Models (WiSE-FT)",
        "url": "https://arxiv.org/abs/2109.01903"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
