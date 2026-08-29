// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/transformers/multi-head/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Transformers",
    "lessons": {
      "tokenization": {
        "title": "Tokenization"
      },
      "embeddings": {
        "title": "Embeddings"
      },
      "attention": {
        "title": "Attention"
      },
      "multi-head": {
        "title": "Multi-Head Attention"
      },
      "decoding": {
        "title": "Decoding"
      }
    }
  },
  "moduleSlug": "transformers",
  "conceptId": "multi-head",
  "lesson": {
    "title": "Multi-Head Attention",
    "oneLine": "Run several attention patterns in parallel, then combine them.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "One attention map forces every token to mix information in a single way. Real language needs several relationships at once — syntactic agreement, coreference, local phrasing. Multi-head attention splits the model width into h smaller subspaces, runs attention independently in each, and concatenates the results.",
          "Each head is cheap (it works in d/h dimensions), and together they let the layer attend to different things in different subspaces simultaneously."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Each head projects Q, K, V into its own subspace, attends there, and the outputs are concatenated and mixed by a final projection W^O:"
        ],
        "tex": "\\mathrm{MultiHead}(X) = \\mathrm{Concat}(\\mathrm{head}_1,\\dots,\\mathrm{head}_h)\\,W^{O}",
        "texNote": "head_i = Attention(XW_i^Q, XW_i^K, XW_i^V); the heads run fully in parallel."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef multi_head(X, Wq, Wk, Wv, Wo, h):\n    n, d = X.shape\n    dk = d // h\n    outs = []\n    for i in range(h):                 # each head sees a d/h slice\n        sl = slice(i * dk, (i + 1) * dk)\n        outs.append(attention(X @ Wq[:, sl], X @ Wk[:, sl], X @ Wv[:, sl]))\n    return np.concatenate(outs, axis=-1) @ Wo",
        "caption": "Heads are independent; the final W^O lets them interact."
      },
      {
        "h": "One softmax can only point at one place",
        "paras": [
          "A single attention head produces one probability distribution per query, so when a task needs two different positions at once the head has to split its mass between them and returns their average — which is neither. Constructing exactly that case, a single head asked to retrieve the values at two positions recovers each with a relative error of 0.528 and 0.506, essentially half of each. Two heads, one aimed at each position, recover them with an error of 0.005.",
          "That is the whole argument for multiple heads, and the reason it is nearly free: splitting a width of d into h heads of d/h leaves the parameter count unchanged while allowing h simultaneous lookups. The cost is per-head width, so heads that need fine-grained comparison get less room to make it — which is also why the observed redundancy is real and why pruning a trained model's heads so often costs little. The capacity is in being able to attend to several places at once, not in the size of any one head."
        ]
      }
    ],
    "takeaways": [
      "Multiple heads capture multiple relationships in parallel subspaces.",
      "Splitting the width keeps the total cost the same as single-head attention.",
      "The output projection W^O lets the heads' results recombine."
    ],
    "demo": "multi-head-attention"
  },
  "order": [
    "tokenization",
    "embeddings",
    "attention",
    "multi-head",
    "decoding"
  ],
  "index": 3,
  "prev": "attention",
  "next": "decoding"
};
