// GENERATED from content/lessons/advanced-cv/vit.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-cv/vit/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "vit": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The Vision Transformer (Dosovitskiy et al., 2020) is almost provocatively simple: cut the image into 16x16 patches, flatten each into a vector, project it linearly, add a position embedding, and feed the resulting sequence to a standard transformer encoder - the SAME architecture as BERT, essentially unmodified. No convolutions, no pooling pyramid, no hand-designed locality. The paper's title, 'An Image is Worth 16x16 Words', is the whole idea. What made it a landmark result was not the architecture but the finding attached to it: with enough pretraining data, this deliberately prior-free model BEATS the convolutional networks that had dominated vision for a decade.",
        "The crucial caveat is the data condition, and it is the most important thing to take from this topic. Trained on ImageNet-1k alone, ViT UNDERPERFORMS a comparable ResNet - noticeably. Trained on ImageNet-21k it becomes competitive. Trained on JFT-300M it wins decisively. The explanation is inductive bias: a CNN has locality and translation equivariance built in, which is knowledge about images it does not have to learn; a ViT has almost none (only the patch grid and the position embeddings) and must LEARN that structure from data. Priors substitute for data, so the crossover point is exactly where you have enough data to learn what the CNN was given for free - a clean, quantitative instance of the trade-off that runs through this whole curriculum.",
        "That framing also explains everything that came after. DeiT showed you could reach ViT-level accuracy on ImageNet-1k alone using heavy augmentation and distillation from a CNN teacher - i.e. substituting a different kind of prior for data. SWIN reintroduced locality and hierarchy deliberately (windowed attention with shifted windows, and a pyramid of resolutions), making transformers work for detection and segmentation where a single-scale, quadratic-cost model does not. And ConvNeXt ran the experiment in reverse, modernizing a ResNet with the transformer era's training recipe and design choices and matching Swin - which strongly suggests much of the reported gap was never architectural at all."
      ],
      "math": [
        {
          "h": "Patch embedding: a strided convolution in disguise",
          "paras": [
            "Splitting the image into non-overlapping P x P patches and linearly projecting each one is EXACTLY a convolution with kernel size P and stride P. So even the 'convolution-free' architecture begins with one convolution - a useful thing to notice, because it means ViT does retain a minimal locality prior at the patch level."
          ],
          "tex": "N = \\frac{HW}{P^2}, \\qquad z_0 = \\big[\\, x_{\\text{cls}};\\; x^1_p E;\\; x^2_p E;\\; \\dots;\\; x^N_p E \\,\\big] + E_{\\text{pos}}, \\qquad E \\in \\mathbb{R}^{(P^2 C) \\times D}",
          "texNote": "For 224x224 with P=16: N = 196 patches, each of dimension 16*16*3 = 768 flattened. The CLS token is a learned vector prepended to the sequence whose final state is used for classification. Halving P quadruples N and therefore quadruples attention's cost."
        },
        {
          "h": "Why resolution is expensive",
          "paras": [
            "Attention is quadratic in the number of tokens, and the number of tokens is quadratic in the image side length - so attention cost scales with the FOURTH power of resolution at fixed patch size. This single fact explains why plain ViT is unsuitable for dense prediction and why Swin's windowed attention exists."
          ],
          "tex": "\\mathcal{O}\\big(N^2 D\\big) = \\mathcal{O}\\!\\left(\\frac{H^2W^2}{P^4}\\,D\\right) \\qquad \\text{vs Swin's windowed} \\qquad \\mathcal{O}\\!\\left(\\frac{HW}{P^2}\\,M^2 D\\right)",
          "texNote": "M = window size (7 in Swin). Restricting attention to windows makes the cost LINEAR in the number of tokens, and shifting the windows between layers restores cross-window information flow. That is the whole reason Swin scales to detection and segmentation resolutions."
        }
      ],
      "code": [
        {
          "h": "A ViT in forty lines",
          "paras": [
            "The patch embedding is literally a Conv2d with kernel = stride = patch size, and the rest is a standard transformer encoder. Writing it out makes clear how little is vision-specific."
          ],
          "code": "import torch, torch.nn as nn\n\nclass ViT(nn.Module):\n    def __init__(self, img=224, patch=16, dim=768, depth=12, heads=12, n_cls=1000):\n        super().__init__()\n        self.n_patches = (img // patch) ** 2                       # 196 for 224/16\n        # patch embedding IS a strided convolution\n        self.proj = nn.Conv2d(3, dim, kernel_size=patch, stride=patch)\n        self.cls = nn.Parameter(torch.zeros(1, 1, dim))\n        self.pos = nn.Parameter(torch.zeros(1, self.n_patches + 1, dim))  # LEARNED, 1D\n        enc = nn.TransformerEncoderLayer(dim, heads, dim * 4, batch_first=True,\n                                         norm_first=True, activation='gelu')\n        self.blocks = nn.TransformerEncoder(enc, depth)\n        self.norm, self.head = nn.LayerNorm(dim), nn.Linear(dim, n_cls)\n\n    def forward(self, x):\n        x = self.proj(x).flatten(2).transpose(1, 2)                # (B, N, D)\n        x = torch.cat([self.cls.expand(x.shape[0], -1, -1), x], 1) # prepend CLS\n        x = self.blocks(x + self.pos)\n        return self.head(self.norm(x[:, 0]))                       # classify from CLS\n\nm = ViT()\nprint(m(torch.randn(2, 3, 224, 224)).shape)                        # (2, 1000)\nprint(f'{sum(p.numel() for p in m.parameters())/1e6:.0f}M params')  # 86M (ViT-Base)",
          "caption": "The whole architecture: a strided conv for patch embedding, a CLS token, learned 1D position embeddings, and an unmodified transformer encoder. Almost nothing is vision-specific - which is the point, and the source of both its weakness at small scale and its strength at large scale."
        },
        {
          "h": "The data-scale crossover, and interpolating position embeddings",
          "paras": [
            "The headline empirical result, plus the one operational detail everyone hits: learned position embeddings are tied to the patch grid, so changing resolution requires interpolating them."
          ],
          "code": "# ImageNet top-1 after pretraining on datasets of increasing size (Dosovitskiy et al.):\n#\n#   pretraining data     ResNet-152x2    ViT-L/16     winner\n#   ImageNet-1k (1.3M)       77.5          76.5       ResNet   <- prior beats no prior\n#   ImageNet-21k (14M)       85.3          85.3       tie      <- crossover\n#   JFT-300M                 87.5          87.8       ViT      <- scale beats prior\n#\n# DeiT then reached ~81.8 on ImageNet-1k ALONE using heavy augmentation + distillation\n# from a CNN teacher - i.e. substituting a different prior for the missing data.\n\nimport torch.nn.functional as F\n\ndef interpolate_pos_embed(pos, old_grid, new_grid):\n    \"\"\"Fine-tuning at a new resolution: the learned grid must be resized.\"\"\"\n    cls_tok, patch_pos = pos[:, :1], pos[:, 1:]                  # keep CLS separate!\n    d = patch_pos.shape[-1]\n    patch_pos = patch_pos.reshape(1, old_grid, old_grid, d).permute(0, 3, 1, 2)\n    patch_pos = F.interpolate(patch_pos, size=(new_grid, new_grid),\n                              mode='bicubic', align_corners=False)\n    patch_pos = patch_pos.permute(0, 2, 3, 1).reshape(1, new_grid ** 2, d)\n    return torch.cat([cls_tok, patch_pos], dim=1)\n# 224 -> 384 means grid 14 -> 24. Forgetting to exclude the CLS token from the\n# reshape is the classic bug here and silently corrupts every position.",
          "caption": "The crossover: ViT loses to a ResNet on ImageNet-1k, ties at 14M images, and wins at 300M - priors substitute for data. Below it, the position-embedding interpolation every resolution change requires, with the CLS-token trap that makes it a common bug."
        }
      ],
      "useCases": [
        "Large-scale pretrained backbones: most current vision foundation models (CLIP, DINOv2, SAM, and the vision towers of multimodal LLMs) are ViTs, so the architecture is the default when you are consuming pretrained weights rather than training from scratch.",
        "Multimodal models, where the transformer's uniformity is the point: images and text become sequences of tokens processed by the same machinery, which is what makes joint training and cross-attention natural.",
        "Self-supervised learning, where ViTs pair unusually well with masked-autoencoding (MAE) and self-distillation (DINO) - masking patches is trivial in a token sequence and awkward in a convolutional feature map.",
        "Dense prediction via hierarchical variants: Swin and its successors reintroduced multi-scale features and windowed attention, which is what made transformers viable for detection and segmentation rather than classification alone."
      ],
      "pitfalls": [
        "Training a plain ViT from scratch on a small dataset: with ImageNet-1k or less it underperforms a comparable ResNet, because it must learn locality from data. Use a pretrained model, a DeiT-style recipe (heavy augmentation plus distillation), or a hierarchical variant with locality built back in.",
        "Forgetting the CLS token when interpolating position embeddings: the learned grid is tied to the patch layout, so changing resolution requires reshaping and bicubically interpolating the PATCH embeddings while keeping the CLS embedding separate. Reshaping all of them together silently corrupts every position.",
        "Underestimating the resolution cost: attention is quadratic in token count and token count is quadratic in image side, so cost scales with the fourth power of resolution at fixed patch size. Halving the patch size quadruples the sequence and roughly 16x's the attention cost.",
        "Reading raw last-layer attention as an explanation: information also flows through residual connections, so last-layer attention can put near-chance weight on the decisive patch. Use attention rollout or gradient-based relevance, and note that high-norm 'register' artifact tokens corrupt naive attention maps.",
        "Assuming the ViT-versus-CNN gap is architectural: ConvNeXt matched Swin by modernizing a ResNet with the transformer era's training recipe, and 'ResNet Strikes Back' reached ~80% ImageNet top-1 with a 2015 architecture. Compare architectures only under matched recipes."
      ],
      "connections": [
        {
          "ref": "transformers/transformer-block",
          "text": "A ViT is that block, unmodified, applied to patch tokens - so pre-norm, the FFN's parameter dominance, and the residual-stream view all carry over directly."
        },
        {
          "ref": "cnn/fc-for-images",
          "text": "The inductive-bias argument is the same one made there for convolution, run in reverse: ViT gives up locality and weight sharing and pays for it in data."
        },
        {
          "ref": "advanced-cv/dino-mae",
          "text": "Self-supervised pretraining is what made ViTs practical without proprietary billion-image datasets, and DINO's attention maps segment objects with no segmentation labels at all."
        },
        {
          "ref": "transformers/flash-attention",
          "text": "The quadratic token cost that limits ViT resolution is exactly what FlashAttention's IO-aware tiling and windowed attention schemes address."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a Vision Transformer?",
          "a": "Split the image into fixed-size patches, linearly embed each, add position embeddings, prepend a CLS token, and run a standard transformer encoder. Classification reads the CLS token's final state."
        },
        {
          "q": "How many tokens for a 224x224 image with 16x16 patches?",
          "a": "196 patches (14x14 grid), plus the CLS token = 197 tokens, each of dimension 768 in ViT-Base."
        },
        {
          "q": "Is the patch embedding really convolution-free?",
          "a": "No - splitting into non-overlapping patches and linearly projecting is exactly a Conv2d with kernel = stride = patch size. ViT keeps a minimal locality prior at the patch level."
        },
        {
          "q": "Why does ViT need more data than a CNN?",
          "a": "It lacks locality and translation equivariance, which a CNN has built in. It must LEARN that structure from data, so priors substitute for data and the crossover is where data suffices."
        },
        {
          "q": "What is the empirical crossover point?",
          "a": "ImageNet-1k: ResNet wins. ImageNet-21k (14M): roughly a tie. JFT-300M: ViT wins. That progression is the paper's central result."
        },
        {
          "q": "What is DeiT's contribution?",
          "a": "Reaching ViT-level accuracy on ImageNet-1k alone via heavy augmentation, regularization, and DISTILLATION from a CNN teacher (with a dedicated distillation token) - substituting a prior for missing data."
        },
        {
          "q": "What does Swin change?",
          "a": "Windowed attention (linear rather than quadratic in tokens) with SHIFTED windows between layers for cross-window flow, plus a hierarchical pyramid - which is what makes transformers viable for detection and segmentation."
        },
        {
          "q": "How does attention cost scale with resolution?",
          "a": "Tokens scale as (H*W)/P^2 and attention as tokens squared, so cost scales with the FOURTH power of image side at fixed patch size. Halving the patch size is ~16x more attention compute."
        },
        {
          "q": "How do you fine-tune at a higher resolution?",
          "a": "Interpolate the learned position embeddings to the new patch grid (bicubic), keeping the CLS embedding separate, then fine-tune. Forgetting to exclude CLS is the classic bug."
        },
        {
          "q": "What is the CLS token?",
          "a": "A learned vector prepended to the sequence whose final hidden state is used for classification - a learned attention-weighted pool over the patches. Some models use mean-pooling instead, with similar results."
        },
        {
          "q": "Do ViTs learn locality anyway?",
          "a": "Yes - analyses of attention distance show early heads attend locally and later heads globally, so the model discovers a CNN-like hierarchy when it has enough data to do so."
        },
        {
          "q": "What did ConvNeXt demonstrate?",
          "a": "A ResNet modernized with the transformer era's training recipe and design choices matches Swin - suggesting much of the reported ViT advantage was training recipe rather than architecture."
        }
      ],
      "standard": [
        {
          "q": "Explain the Vision Transformer and the inductive-bias argument behind its data requirements.",
          "a": "THE ARCHITECTURE, which is deliberately minimal. Take a 224x224 image, cut it into non-overlapping 16x16 patches (196 of them), flatten each patch to a 768-dimensional vector, project it linearly, add a learned position embedding, prepend a learned CLS token, and feed the 197-token sequence to a standard transformer encoder - the same blocks as BERT, with pre-norm, multi-head self-attention, and a 4x FFN. Classify from the CLS token's final state. That is the entire model. Note that the patch embedding is literally a Conv2d with kernel size and stride both 16, so even this 'convolution-free' architecture starts with one convolution - it retains a minimal locality prior at the patch level, but nothing beyond it. THE INDUCTIVE-BIAS ARGUMENT. A CNN encodes two assumptions about images structurally: LOCALITY (a unit sees only a small neighbourhood, because meaningful visual patterns are local) and TRANSLATION EQUIVARIANCE via weight sharing (a pattern worth detecting in one place is worth detecting everywhere). These are true of natural images, and because they are built in, the CNN does not spend data learning them. A ViT has neither: self-attention at layer 1 can relate any patch to any other, and position enters only through a learned embedding, so 'patch 5 is adjacent to patch 6' is something the model must infer. THE CONSEQUENCE, which is the paper's central empirical result: with limited data the CNN's true priors are worth more than the transformer's flexibility, and with abundant data the flexibility wins because the model can learn better structure than we would have imposed. The measured progression - ResNet ahead on ImageNet-1k (1.3M images), roughly tied on ImageNet-21k (14M), ViT ahead on JFT-300M - is one of the cleanest quantitative demonstrations of the priors-versus-data trade-off in the literature. WHAT THE MODEL ACTUALLY LEARNS, which supports the story. Analyses of ViT attention show that early layers develop heads with SHORT attention distance (effectively local receptive fields) alongside heads with long distance, and that mean attention distance grows with depth - the model rediscovers a CNN-like local-to-global hierarchy when it has enough data, rather than using global attention uniformly. Likewise, visualizing the learned 1D position embeddings shows they organize into a 2D grid structure, recovering the spatial layout nobody told it about. WHAT CAME AFTER, and why each follows from the argument. DeiT (Touvron et al.) reached ViT-level accuracy on ImageNet-1k ALONE using heavy augmentation, strong regularization, and DISTILLATION from a CNN teacher via a dedicated distillation token - which is substituting a different prior (the teacher's learned inductive bias, plus augmentation-encoded invariances) for the missing data. SWIN reintroduced locality and hierarchy explicitly: windowed attention with shifted windows, and a resolution pyramid, which both restores the CNN's priors and makes the cost linear rather than quadratic in token count - necessary for detection and segmentation. And CONVNEXT ran the experiment in the other direction, modernizing a ResNet with the transformer era's recipe (AdamW, 300 epochs, heavy augmentation, large depthwise kernels, LayerNorm, inverted bottleneck) and matching Swin - which is strong evidence that a large share of the reported architectural gap was actually the TRAINING RECIPE. THE HONEST CONCLUSION I would offer: the ViT result is not 'transformers are better at vision'; it is 'architectural priors are a substitute for data, and at sufficient scale you can afford to learn them'. That framing predicts everything that followed, including the recipe-versus-architecture confound, and it generalizes well beyond vision.",
          "deepDive": {
            "q": "Compare ViT, Swin and ConvNeXt. What does the comparison tell you about how to read architecture papers?",
            "a": "THE THREE DESIGNS. ViT (2020): plain transformer on 16x16 patches, single resolution throughout, global attention in every layer, minimal priors. Its costs are quadratic attention in token count and no multi-scale features, so it is well-suited to classification and poorly suited to dense prediction. SWIN (Liu et al., 2021): reintroduces two CNN properties deliberately. (a) WINDOWED attention - restrict self-attention to non-overlapping M x M windows (M=7), making cost LINEAR in tokens rather than quadratic; and to restore cross-window information flow, SHIFT the window partition by half a window every other layer, so windows from adjacent layers overlap and information propagates. (b) HIERARCHY - merge patches between stages to build a resolution pyramid (1/4, 1/8, 1/16, 1/32), giving multi-scale features that detection and segmentation heads (FPN, Mask R-CNN) expect. The result was a transformer that could serve as a general-purpose backbone, not just a classifier, and it swept detection and segmentation benchmarks. CONVNEXT (Liu et al., 2022): starts from a ResNet-50 and applies, one at a time, the design choices and training recipe that accompanied transformers - AdamW instead of SGD, 300 epochs instead of 90, heavy augmentation (Mixup, CutMix, RandAugment, random erasing), stochastic depth and label smoothing, a Swin-like stage compute ratio, patchify stem, depthwise 7x7 convolutions, inverted bottleneck, fewer activations and normalizations, LayerNorm instead of BatchNorm, and separate downsampling layers. The result MATCHES Swin at comparable FLOPs on classification, detection, and segmentation - with no attention anywhere. WHAT THE COMPARISON TELLS YOU, which is the real content. (1) MUCH OF THE 'ARCHITECTURAL' GAP WAS THE RECIPE. ConvNeXt's own ablation is explicit: a large fraction of the improvement over the original ResNet-50 came from the training procedure alone, BEFORE any architectural change. The companion result, 'ResNet Strikes Back', retrained an unmodified 2015 ResNet-50 to ~80% ImageNet top-1 against its original 76%, purely with a modern recipe. So papers comparing a new architecture trained with a 2021 recipe against a baseline trained with a 2016 recipe were measuring the recipe. (2) THE PRIORS WERE RIGHT AFTER ALL - or at least, they were not the problem. Swin's success came from adding locality and hierarchy BACK to transformers, and ConvNeXt's from keeping them. That two independent lines converged on 'local + hierarchical + modern recipe' suggests the structure matters and the attention-versus-convolution question matters less than either camp claimed. (3) THE OPERATOR IS LESS IMPORTANT THAN THE MACRO-DESIGN. At matched compute and recipe, a hierarchical local-attention model and a hierarchical large-kernel-depthwise-conv model perform the same. What differentiates them is second-order: attention is data-dependent (weights depend on content) while convolution is not, which matters more at very large scale and for multimodal fusion; convolution is cheaper and better supported on constrained hardware. HOW THIS SHOULD CHANGE HOW YOU READ AN ARCHITECTURE PAPER. Ask: (a) Were the baselines trained with the SAME recipe, epochs, augmentation, and optimizer? If not, the comparison is confounded and you cannot attribute the gain. (b) Is compute (FLOPs AND wall-clock) matched, or is the new model simply bigger? (c) Was the ablation done one change at a time, and does it separate recipe from architecture? (d) Does the advantage hold at multiple scales, or only at the one reported? (e) Does it transfer to downstream tasks, or only to the classification benchmark? THE META-POINT: the field went through a full cycle - CNNs, then 'attention is all you need for vision', then 'actually a modernized CNN matches it' - and the durable knowledge from that cycle is methodological rather than architectural. When someone reports a new block, the prior should be that a meaningful part of the gain is recipe until an ablation proves otherwise."
          }
        },
        {
          "q": "Why is a plain ViT poorly suited to detection and segmentation, and what fixes it?",
          "a": "THREE STRUCTURAL PROBLEMS. (1) SINGLE RESOLUTION. A plain ViT processes 196 tokens at one scale from the first layer to the last - there is no pyramid. But detection and segmentation heads are built on MULTI-SCALE features: an FPN reads from several resolutions so that small objects are detected on high-resolution maps and large ones on coarse maps, and a segmentation decoder upsamples through skip connections from progressively finer encoder levels. A single 14x14 feature map gives none of that, and objects in a natural image span an enormous size range. (2) QUADRATIC COST IN TOKENS, and tokens scale with resolution squared. Detection typically runs at 800-1333 pixels rather than 224, which at patch size 16 means thousands of tokens and an attention matrix of millions of entries per head per layer - the cost scales as the FOURTH power of the image side. You cannot simply raise the resolution to get the detail dense prediction needs. (3) COARSE OUTPUT GRANULARITY. A 16x16 patch is the finest spatial unit the model represents, which is far too coarse for pixel-accurate masks or precise box regression. THE FIXES, in the order the field found them. (a) HIERARCHICAL TRANSFORMERS - Swin is the canonical answer. Windowed attention makes the cost linear in tokens, so high resolution becomes affordable; shifted windows restore cross-window information flow; and patch merging between stages builds the 1/4, 1/8, 1/16, 1/32 pyramid that detection and segmentation heads expect. The result is a drop-in backbone for Mask R-CNN and FPN-style heads, which is why Swin was adopted so quickly for dense tasks. PVT, Twins, and MViT are variations on the same idea. (b) ADAPTING PLAIN ViT INSTEAD - the ViTDet line (Li et al.) showed you can keep a plain, non-hierarchical ViT and build the pyramid in the DECODER by simply upsampling and downsampling the single-scale feature map, plus using windowed attention in most blocks with a few global-attention blocks interleaved. This matters because it lets detection inherit the enormous ecosystem of plain-ViT pretrained weights (MAE, CLIP, DINOv2) rather than requiring a hierarchical model to be pretrained separately. It is a good example of preferring compatibility with pretraining over architectural elegance. (c) SEGMENTATION-SPECIFIC designs: SegFormer uses a hierarchical encoder with efficient attention and a deliberately lightweight all-MLP decoder; SETR upsamples plain ViT features; and Mask2Former's mask-classification formulation works on top of either backbone. (d) SMALLER PATCHES (ViT/8 or /14) buy resolution directly at quadratic cost, viable only with efficient attention. THE BROADER OBSERVATION worth making: the properties a plain ViT lacks for dense prediction - multi-scale features and locality - are precisely the CNN properties it discarded, and the successful fixes reintroduce them. Meanwhile FlashAttention and windowed attention made the cost side tractable. So the resolution of the story is not 'transformers replaced CNNs for dense prediction' but 'transformers adopted the CNN's macro-design and kept attention as the mixing operator'. And SAM is a nice counterexample worth mentioning: it uses a plain ViT encoder at high resolution with a very light mask decoder, and works extremely well - because its promptable formulation and billion-mask training data changed what the architecture had to provide."
        },
        {
          "q": "How do position embeddings work in ViT, and what breaks when you change resolution?",
          "a": "THE PROBLEM. Self-attention is permutation-equivariant: shuffle the patch tokens and the outputs shuffle identically. Without position information a ViT would treat the image as an unordered BAG of patches, which is even worse than for text, since the patches form a 2D grid whose arrangement is highly informative. So position must be injected explicitly. WHAT ViT DOES. The original uses LEARNED 1D position embeddings: flatten the 14x14 patch grid into a 196-length sequence in raster order, and learn one embedding vector per sequence index, added to the patch embedding at the input. Notably the paper ABLATED alternatives - 2D learned embeddings (separate row and column), relative position, and no position at all - and found little difference between the position-aware variants (though a large drop for none at all). THE INTERESTING FINDING is that the model LEARNS 2D structure from the 1D encoding: visualizing the cosine similarity between learned position embeddings shows a clear grid pattern, where each position is most similar to its spatial neighbours, including vertically. Nobody told it the row width; it inferred the layout from the data, because the arrangement is consistent across every image. WHAT BREAKS WITH RESOLUTION - the practical crux. The learned embedding table has exactly one vector per position in the TRAINING grid. Fine-tune a 224px model (14x14 = 196 positions) at 384px (24x24 = 576 positions) and 380 of those positions have no embedding. The standard fix is INTERPOLATION: reshape the 196 patch embeddings into a 14x14xD grid, bicubically interpolate to 24x24xD, flatten back, and fine-tune briefly. This works well and is what every 'fine-tune at higher resolution' recipe does. THE CLASSIC BUG, which is worth stating explicitly because it is so common: the embedding tensor contains the CLS token's embedding at index 0, and the CLS token is NOT part of the spatial grid. Reshaping all 197 vectors into a grid mixes the CLS embedding into the spatial interpolation and shifts every patch position by one - which silently corrupts the whole model rather than raising an error. The correct procedure slices off the CLS embedding, interpolates only the patch embeddings, and concatenates it back. Every reference implementation has this special case, and reimplementations frequently miss it. THE ALTERNATIVES AND WHERE THE FIELD WENT. RELATIVE position bias (Swin) adds a learned bias per relative offset within a window, which handles variable input sizes more gracefully than an absolute table and captures the fact that what matters is the OFFSET between two patches, not their absolute indices. 2D ROPE - rotate different dimension groups by the x and y coordinates - is increasingly used in modern vision and multimodal models, and its advantage is exactly resolution flexibility: because the rotation is an analytic function of the coordinate, there is no table to interpolate. CONDITIONAL/CONVOLUTIONAL position encoding injects position implicitly via a depthwise convolution, exploiting the fact that zero-padded convolutions leak absolute position, which also handles arbitrary sizes naturally. And for multimodal sequences that interleave text and image tokens, schemes like M-RoPE give images a 2D position within their own frame plus a position in the token stream - an area that is still being worked out. THE PRINCIPLE worth extracting: an absolute learned table is the simplest thing that works and is the least flexible; every subsequent scheme moves toward representing RELATIVE position analytically, which buys resolution independence. That is the same progression as in language models, and for the same reason."
        },
        {
          "q": "How does interpretability differ for ViTs compared to CNNs?",
          "a": "WHAT CARRIES OVER. Gradient-based attribution (saliency, Integrated Gradients), perturbation methods (occlusion, LIME, SHAP), and probing are all architecture-agnostic - they treat the model as a function and work unchanged. Grad-CAM can be ADAPTED by treating the final block's token activations as a feature map: reshape the (N, D) tensor into a (14, 14, D) grid and apply the usual gradient weighting. It works acceptably, at patch granularity. WHAT IS NEW - and the important caution. The obvious idea is to read the ATTENTION WEIGHTS: which patches did the CLS token attend to? RAW LAST-LAYER ATTENTION IS UNRELIABLE, for a specific and instructive reason: information flows through RESIDUAL connections as well as attention, so by the final layer the relevant content may already have been written into the CLS token's residual stream, and last-layer attention can put near-chance weight on the decisive patch. ATTENTION ROLLOUT (Abnar and Zuidema) recovers much of this by multiplying attention matrices across layers with a residual correction (add the identity and renormalize), tracing information flow from input patches to the output token, and it empirically performs far better. Chefer et al.'s method, which propagates relevance using both attention and gradients, is generally the strongest transformer-specific attribution. THE THREE ViT-SPECIFIC COMPLICATIONS. (1) MULTIPLE HEADS: attention is per-head, so any map requires an aggregation choice - mean, max, or gradient-weighted - and the choice changes the picture. (2) THE CLS TOKEN is a special position whose attention is not always the semantically meaningful one; some analyses use mean patch-to-patch attention instead. (3) REGISTER TOKENS - a genuinely interesting finding. Darcet et al. (2023) observed that ViTs repurpose a few low-information background patches as global scratchpads, producing HIGH-NORM outlier tokens whose attention is essentially noise and which visibly corrupt attention maps. Adding a few dedicated 'register' tokens to the sequence gives the model somewhere to put that global state, and the attention maps become dramatically cleaner. That is an interpretability observation leading directly to an architectural fix, which is a nice example of the two feeding each other. THE HAPPY RESULT worth knowing: self-supervised ViTs, specifically DINO, produce attention maps that SEGMENT OBJECTS remarkably cleanly with no segmentation supervision whatsoever - far better than supervised ViTs' maps. This was one of the strongest early arguments for self-supervised pretraining and means that for DINO-family models the attention map is genuinely informative rather than merely suggestive. Whether this generalizes to other training regimes is model-dependent, so it should not be assumed. THE UNCHANGED DISCIPLINE, which I would emphasize: attention maps are correlational, and the sanity-check literature applies here as much as for CNNs. A map showing where a head READ is not evidence of what the model USED, because information also moves through residuals and is transformed downstream. Causal methods are the standard for claims - ABLATE a head and measure the behavioural change, or use ACTIVATION PATCHING (copy activations between a clean and a corrupted run and measure recovery), which is a do-operation inside the network and gives genuinely causal evidence. The mechanistic-interpretability literature adopted exactly this methodology for language transformers, and it transfers directly."
        },
        {
          "q": "You need a vision backbone for a project with 20,000 labelled images. What do you choose?",
          "a": "20,000 images is squarely in the regime where TRAINING FROM SCRATCH IS THE WRONG ANSWER for essentially any architecture - it is an order of magnitude below ImageNet-1k, and a plain ViT would badly underperform even a ResNet there. So the real question is which PRETRAINED backbone to fine-tune, and that decision has three inputs. (1) WHAT IS THE DOMAIN? If the images are natural photographs, ImageNet or web-scale pretraining transfers well. If they are medical scans, satellite imagery, microscopy, or industrial inspection, the transfer is weaker and the ranking of backbones can change - and there may be domain-specific pretrained models (RETFound for retinal imaging, pathology foundation models, geospatial models) that beat a general one. Check for those first; when they exist they usually win. (2) WHAT IS THE TASK? Classification: any strong backbone plus a linear or small head. Detection or segmentation: you need MULTI-SCALE features, so either a hierarchical backbone (Swin, ConvNeXt) or a plain ViT with a ViTDet-style adapter that builds the pyramid in the decoder. Retrieval or similarity: you want a backbone whose embedding space is already good - CLIP or DINOv2 - and may not need to fine-tune the backbone at all. (3) WHAT ARE THE DEPLOYMENT CONSTRAINTS? Edge or real-time: an efficient CNN (EfficientNet-Lite, MobileNet, a small ConvNeXt) with better quantization and operator support on mobile accelerators. Server with a GPU: anything. WHAT I WOULD ACTUALLY DO, concretely. Start with a DINOv2 or CLIP ViT-B and a ConvNeXt-Base or Swin-Base as the two candidates, and run the cheapest experiment first: FREEZE the backbone and train a linear probe. This takes an hour, tells you how well the pretrained features already separate your classes, and gives a floor. Then fine-tune the better one end to end with a low learning rate (and layer-wise learning-rate decay, which matters more for ViTs than CNNs), heavy augmentation, and a short schedule. At 20k images I would expect fine-tuning to beat linear probing meaningfully, but the gap tells you something useful about how far your domain is from the pretraining distribution. WHY I WOULD LEAN TOWARD DINOv2 SPECIFICALLY at this scale: self-supervised features have been consistently strong for transfer, particularly for dense tasks and for out-of-domain data, and DINOv2's features work well frozen - which is valuable when your labelled set is small enough that fine-tuning risks overfitting. If the domain is far from natural images, a ConvNeXt with ImageNet weights is a robust, unglamorous choice that rarely disappoints. THE THINGS THAT WILL MATTER MORE THAN THE BACKBONE CHOICE, and I would say this explicitly: the annotation quality, the split discipline (group by patient/site/session, not by image), the augmentation policy matched to real acquisition variation, and the evaluation design. At 20k images the difference between two strong backbones is typically a point or two; the difference between a leaky split and an honest one, or between good and careless labels, is often ten. I would also budget time for SELF-SUPERVISED PRETRAINING ON UNLABELLED DOMAIN DATA if you have it - most projects with 20k labelled images have far more unlabelled ones, and continued pretraining (MAE or DINO) on in-domain data before fine-tuning is frequently the single highest-return move available."
        },
        {
          "q": "Have transformers actually won in vision, or is that overstated?",
          "a": "The honest answer is: they have won at the FOUNDATION-MODEL layer and have not won at the architecture-per-FLOP layer, and conflating those is what makes the claim overstated. WHERE THEY HAVE CLEARLY WON. (1) LARGE-SCALE PRETRAINED BACKBONES. Essentially every vision foundation model - CLIP, DINOv2, SAM, EVA, and the vision towers of multimodal LLMs - is a ViT. If you are consuming pretrained weights, which most practitioners are, you are using a transformer, and the ecosystem effect is now self-reinforcing. (2) MULTIMODAL MODELS, where the transformer's uniformity is decisive: images and text become token sequences processed by the same machinery, cross-attention is natural, and a single architecture handles both. There is no convolutional equivalent, and this is probably the most durable advantage. (3) SELF-SUPERVISED LEARNING, where masked autoencoding is trivial in a token sequence and awkward in a convolutional feature map - MAE's simplicity depends on the architecture. (4) SCALING: transformers have been scaled to billions of parameters with predictable returns, and the scaling machinery (sharding, efficient attention kernels, training recipes) is mature. WHERE THE CLAIM IS OVERSTATED. (1) AT MATCHED COMPUTE AND RECIPE, a modernized CNN matches them. ConvNeXt equals Swin on classification, detection, and segmentation with no attention; 'ResNet Strikes Back' took a 2015 ResNet-50 from 76% to ~80% ImageNet top-1 with only a modern training recipe. So a large part of the reported architectural gap was the recipe, and comparisons that did not control for it were measuring the wrong thing. (2) IN THE SMALL-DATA REGIME, CNN priors still win, and most real projects are small-data. Training a plain ViT on 20,000 images from scratch is a bad idea; a CNN or a pretrained model is better. (3) ON CONSTRAINED HARDWARE, CNNs remain dominant - better operator support on mobile accelerators, better quantization behaviour, lower memory. Nobody ships a plain ViT to a phone for a real-time feature. (4) FOR DENSE PREDICTION, the successful transformer designs (Swin) work by REINTRODUCING the CNN's locality and hierarchy - which is an argument that those priors were correct, not that they were unnecessary. (5) THE HYBRIDS often win in practice: convolutional stems, convolutional early stages with attention later, or attention only at low resolution. That pattern - convolution where locality holds and resolution is high, attention where global content-dependent mixing is needed and token counts are small - is the pragmatic state of the art. WHAT I THINK THE DURABLE LESSON IS. The transformer's real advantage is not that attention is a better visual operator than convolution; at matched scale and recipe they are comparable. It is that the transformer is a UNIFORM, SCALABLE substrate that absorbs compute and data well, works across modalities, and pairs naturally with self-supervised objectives - so it became the platform on which large-scale pretraining happened, and the pretrained weights are what actually deliver value to most users. That is an ecosystem and scaling argument rather than an architectural one, and it is more robust than the benchmark comparisons. If asked what I would build with today: a pretrained ViT-based foundation model for anything where good weights exist and compute allows, a modernized CNN for constrained deployment or genuinely small data, and I would treat any claim that one architecture is intrinsically better as requiring a matched-recipe ablation before I believed it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Vision Transformer",
        "back": "Cut into 16x16 patches, linearly embed, add position embeddings, prepend CLS, run a standard transformer encoder. 224px/16 = 196 patches + CLS = 197 tokens. Almost nothing is vision-specific."
      },
      {
        "type": "intuition",
        "front": "Patch embedding is a convolution",
        "back": "Non-overlapping patches + linear projection IS a Conv2d with kernel = stride = patch size. So even 'convolution-free' ViT keeps a minimal locality prior at the patch level."
      },
      {
        "type": "intuition",
        "front": "The data-scale crossover",
        "back": "ImageNet-1k: ResNet wins. ImageNet-21k (14M): tie. JFT-300M: ViT wins. Priors substitute for data - the crossover is where you have enough data to LEARN what the CNN was given free."
      },
      {
        "type": "formula",
        "front": "Resolution cost",
        "back": "Tokens = HW/P^2, attention = O(tokens^2), so cost scales with the FOURTH power of image side at fixed patch size. Halving the patch size is ~16x more attention compute."
      },
      {
        "type": "definition",
        "front": "Swin's two changes",
        "back": "(1) WINDOWED attention (linear not quadratic in tokens) with SHIFTED windows between layers for cross-window flow. (2) HIERARCHY via patch merging (1/4,1/8,1/16,1/32) - which is what detection/segmentation heads need."
      },
      {
        "type": "pitfall",
        "front": "Position-embedding interpolation",
        "back": "Learned embeddings are tied to the patch grid. To fine-tune at a new resolution, reshape to 2D and bicubically interpolate - keeping the CLS embedding SEPARATE. Including CLS in the reshape corrupts every position silently."
      },
      {
        "type": "intuition",
        "front": "ViT rediscovers locality",
        "back": "Attention-distance analyses show early heads attend locally, later heads globally; and the learned 1D position embeddings organize into a 2D grid. It learns the structure a CNN is given - when it has enough data."
      },
      {
        "type": "pitfall",
        "front": "ConvNeXt's warning about recipes",
        "back": "A modernized ResNet (AdamW, 300 epochs, heavy aug, 7x7 depthwise, LayerNorm) MATCHES Swin. 'ResNet Strikes Back' got 76%->80% from recipe alone. Compare architectures only under matched recipes."
      },
      {
        "type": "pitfall",
        "front": "Register tokens",
        "back": "ViTs repurpose background patches as global scratchpads, creating HIGH-NORM outlier tokens that corrupt attention maps. Adding dedicated register tokens fixes the maps - an interpretability finding that changed the architecture."
      },
      {
        "type": "intuition",
        "front": "Where transformers actually won",
        "back": "Foundation models, multimodal, and self-supervised pretraining (masking is natural in a token sequence). NOT at matched-compute architecture, small data, or edge deployment - where modernized CNNs still win."
      }
    ],
    "refs": [
      {
        "title": "Dosovitskiy et al. (2020), An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
        "url": "https://arxiv.org/abs/2010.11929"
      },
      {
        "title": "Liu et al. (2021), Swin Transformer: Hierarchical Vision Transformer using Shifted Windows",
        "url": "https://arxiv.org/abs/2103.14030"
      },
      {
        "title": "Liu et al. (2022), A ConvNet for the 2020s (ConvNeXt)",
        "url": "https://arxiv.org/abs/2201.03545"
      },
      {
        "title": "Darcet et al. (2023), Vision Transformers Need Registers",
        "url": "https://arxiv.org/abs/2309.16588"
      }
    ],
    "demos": [
      "attention",
      "multi-head-attention",
      "attention-rollout"
    ]
  }
};
