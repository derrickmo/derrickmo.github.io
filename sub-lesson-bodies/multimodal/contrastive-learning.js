// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/multimodal/contrastive-learning/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Multimodal Learning",
    "lessons": {
      "contrastive-learning": {
        "title": "Contrastive Learning"
      },
      "vector-search": {
        "title": "Vector Search"
      },
      "spectrogram": {
        "title": "Spectrograms & the STFT"
      },
      "mfcc": {
        "title": "Mel Filterbank & MFCC"
      },
      "pitch-detection": {
        "title": "Pitch Detection (Autocorrelation)"
      },
      "dtw": {
        "title": "Dynamic Time Warping"
      }
    }
  },
  "moduleSlug": "multimodal",
  "conceptId": "contrastive-learning",
  "lesson": {
    "title": "Contrastive Learning",
    "oneLine": "Pull matching pairs together and push mismatches apart in embedding space.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Contrastive learning shapes an embedding space by example: matching pairs (two crops of an image, or an image and its caption) should land close together; everything else should be far apart. This is how CLIP aligns images and text into one space, enabling zero-shot recognition and cross-modal search."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The InfoNCE loss makes the positive pair win a softmax over negatives:"
        ],
        "tex": "\\mathcal{L} = -\\log\\frac{\\exp(\\mathrm{sim}(z_i, z_j)/\\tau)}{\\sum_k \\exp(\\mathrm{sim}(z_i, z_k)/\\tau)}",
        "texNote": "tau is a temperature; the negatives are the other items in the batch."
      },
      {
        "h": "In code",
        "code": "# in-batch contrastive (CLIP-style)\nlogits = (Z_img @ Z_txt.T) / tau\nlabels = np.arange(len(Z_img))      # i-th image matches i-th text\nloss = cross_entropy(logits, labels)",
        "caption": "The diagonal pairs are positives; everything off-diagonal is negative."
      },
      {
        "h": "The batch is the ceiling, and also the problem",
        "paras": [
          "InfoNCE bounds the mutual information it can capture by the logarithm of the number of negatives, so batch size is not a throughput setting but a cap on what the objective can express: 5.545 nats at batch 256, 8.318 at 4,096, 11.09 at 65,536. That is the reason contrastive methods went to enormous batches and invented memory banks and momentum encoders to fake them.",
          "The same growth creates the opposing problem. If the data has 100 true classes, a batch of 256 contains at least one false negative — a \"negative\" that is genuinely the same class as the anchor — with probability 0.923, and at batch 4,096 it is a certainty. The objective then explicitly pushes apart things that belong together. Both pressures are why the field moved toward supervised contrastive objectives where labels are available, toward hard-negative mining that chooses negatives rather than sampling them, and toward methods like BYOL that dispense with explicit negatives altogether."
        ]
      }
    ],
    "takeaways": [
      "Contrastive learning aligns matching pairs in embedding space.",
      "InfoNCE turns it into a softmax over in-batch negatives.",
      "It powers CLIP and self-supervised representations."
    ],
    "demo": "contrastive-learning"
  },
  "order": [
    "contrastive-learning",
    "vector-search",
    "spectrogram",
    "mfcc",
    "pitch-detection",
    "dtw"
  ],
  "index": 0,
  "prev": null,
  "next": "vector-search"
};
