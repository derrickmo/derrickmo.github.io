// GENERATED from content/lessons/cnn/cnn-architectures.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/cnn/cnn-architectures/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "cnn-architectures": {
    "interview": {
      "quickGrind": [
        {
          "q": "What is a unit's receptive field, and how does it grow with depth?",
          "a": "The region of the input that can affect it. Stacking 3x3 convs grows it by 2 per layer, and a stride-2 downsample doubles the rate — so depth and downsampling are the two levers."
        },
        {
          "q": "Why did VGG stack 3x3 convs instead of using 7x7?",
          "a": "Three stacked 3x3s see the same 7x7 window with 27C^2 parameters instead of 49C^2, and interleave two extra nonlinearities. More expressive, fewer weights."
        },
        {
          "q": "What problem does a residual connection actually solve?",
          "a": "Degradation: past a certain depth, plain networks get worse on TRAINING loss. Deeper should never be worse, because the extra layers could be identity — residual blocks make that identity easy to represent."
        },
        {
          "q": "So the degradation problem is not overfitting?",
          "a": "No, and the distinction is the whole argument. Training error rises too, so it is an optimization failure, not a generalization one. That is why regularization does not help and a change of parameterization does."
        },
        {
          "q": "Why does the gradient flow better through a skip?",
          "a": "The Jacobian of y = x + F(x) is I + dF/dx, so backprop through a block adds an identity path. The gradient reaches earlier layers through a route that is never multiplied down to nothing."
        },
        {
          "q": "What is a bottleneck block?",
          "a": "1x1 down-project, 3x3 at the reduced width, 1x1 up-project. It buys depth at fixed cost — the expensive spatial conv runs on a quarter of the channels."
        },
        {
          "q": "What is a 1x1 convolution for?",
          "a": "Mixing channels at a fixed spatial location: a per-pixel linear map. It changes the channel count cheaply, which is what makes bottlenecks and depthwise-separable designs possible."
        },
        {
          "q": "What did batch norm change about depth?",
          "a": "It made deep networks trainable at higher learning rates by stabilizing the distribution of layer inputs. It was necessary but not sufficient — BN alone did not fix degradation; residuals did."
        },
        {
          "q": "Pre-activation or post-activation ResNet?",
          "a": "Pre-activation — BN and ReLU before the conv — makes the skip path a clean identity all the way through, which trains better at extreme depth. It is the v2 formulation."
        },
        {
          "q": "Why global average pooling instead of large fully connected layers?",
          "a": "The FC layers held most of the parameters and most of the overfitting. Averaging each channel over space is parameter-free, makes the network input-size agnostic, and lost nothing measurable."
        },
        {
          "q": "Where do residual connections appear outside CNNs?",
          "a": "Every transformer block — attention and the FFN are both wrapped in a residual. The idea outlived the architecture that motivated it, which is a good sign it was about optimization rather than vision."
        },
        {
          "q": "Would you design an architecture by hand today?",
          "a": "Rarely. You start from a strong pretrained backbone and adapt it. Hand design is for genuine constraints — a target latency, an unusual input shape, a deployment device — not for chasing accuracy."
        }
      ],
      "standard": [
        {
          "q": "Explain the degradation problem and why residual connections fix it.",
          "a": "The observation that motivated ResNet was not about overfitting. He et al. compared a 20-layer and a 56-layer plain network on CIFAR and found the deeper one had HIGHER TRAINING error — not just worse test error. That rules out capacity and regularization as explanations, because a 56-layer network strictly contains the 20-layer one as a special case: set the extra 36 layers to identity and you reproduce it exactly. So the deeper network can represent the shallower solution and gradient descent does not find it. That makes it an optimization problem, and the fix is a change of parameterization rather than a change of capacity. A residual block computes y = x + F(x) instead of y = H(x), so representing identity means driving F to zero — pushing a stack of weights toward zero is easy, whereas making a stack of convolutions and nonlinearities compute identity is not. The block starts near identity and learns a perturbation. The gradient view is the same fact from the other side: the Jacobian is I + dF/dx, so there is an additive path back to every earlier layer that no chain of multiplications can attenuate to nothing. That is why 152 layers trains at all, and why the pre-activation variant, which keeps the skip path a pure identity with no BN or ReLU on it, trains even deeper networks more stably.",
          "deepDive": {
            "q": "Does that mean the deep network is really learning a deep function?",
            "a": "Partly, and less than the depth suggests. Veit et al. showed a ResNet behaves like an ensemble of many shallower paths: there are 2^n routes through n blocks, most of them short, and deleting a single block at test time barely changes the output — which would be catastrophic in a plain network. So depth is buying an ensemble of effective depths rather than one very deep computation, and that reframes the 'deeper is better' intuition considerably."
          }
        },
        {
          "q": "How do you reason about receptive field when designing or debugging a network?",
          "a": "Start by computing it, because the number is often smaller than people assume and it bounds what the network can possibly do. Each 3x3 conv adds 2, each stride-2 downsample doubles the growth rate downstream, and dilation multiplies the effective kernel spacing without cost. If your task requires relating two things 200 pixels apart and the final layer's receptive field is 90, no amount of training fixes it — you need more depth, more downsampling, or dilation. That is a design constraint you can check on paper before running anything. The complication is that the THEORETICAL receptive field is not the effective one. Luo et al. showed the effective receptive field is roughly Gaussian and grows only with the square root of the number of layers, so influence concentrates near the centre and the outer region contributes very little. A network whose theoretical field covers the image may in practice attend to a much smaller region, which is one reason architectures reach for explicit global context — dilated convolutions, pyramid pooling, or attention — rather than relying on stacked convs alone. Practically I would compute the theoretical field as a sanity bound, and if the task is genuinely global, add a mechanism that is global by construction instead of hoping depth delivers it.",
          "deepDive": {
            "q": "How would you check the effective receptive field empirically?",
            "a": "Take the gradient of a single output unit with respect to the input and look at where it is non-negligible. That directly measures which pixels can influence that unit and by how much, and it typically shows a compact blob well inside the theoretical bound. It is a few lines of autograd and it settles the question for your actual trained network rather than for the architecture in the abstract."
          }
        },
        {
          "q": "Walk through LeNet to ResNet and say what each step actually fixed.",
          "a": "LeNet established the pattern that still holds: alternate convolution and downsampling to build features while shrinking spatial extent, then classify. AlexNet showed the pattern scaled given GPUs, ReLU and enough data — the contribution was mostly demonstrating that the recipe worked at ImageNet scale, plus dropout and augmentation. VGG made the design uniform and asked what depth alone buys: only 3x3 convs, double the channels whenever you halve the resolution. It reached 19 layers and then hit a wall, and it was enormous because the fully connected head held around 100 million of its 138 million parameters. Inception attacked cost rather than depth, running several kernel sizes in parallel and using 1x1 convolutions to reduce channels first — the origin of the bottleneck idea. ResNet then fixed the wall itself with the residual block, which turned depth from a liability into a knob and immediately produced 152-layer networks that trained more easily than 20-layer plain ones. Afterwards the field explored the same space differently: DenseNet concatenated instead of adding, ResNeXt added grouped convolutions, EfficientNet found that width, depth and resolution should be scaled together, and ConvNeXt showed that a plain CNN modernized with the transformer era's training recipe matches vision transformers — which is a useful reminder that a lot of apparent architectural progress was actually training-recipe progress."
        },
        {
          "q": "An 'efficient' architecture has half the FLOPs and runs slower. Explain.",
          "a": "FLOPs count arithmetic and hardware is usually not arithmetic-bound. The common culprit is arithmetic intensity: depthwise convolutions do very little work per byte of memory traffic, so they are bandwidth-bound and use a small fraction of the available FLOPs, whereas a dense 3x3 on many channels maps onto highly optimized GEMM kernels running near peak. Halving FLOPs while quartering intensity is a net loss. Kernel support matters too — a fused, well-tuned operator can beat a theoretically cheaper one that falls back to a generic implementation. Then there is fragmentation: many small operators mean many kernel launches, and at small batch sizes launch overhead can dominate the math entirely. Memory access patterns and layout conversions add more. The practical consequence is that FLOPs are a proxy that is only reliable within an architecture family, and the honest procedure is to measure latency on the target hardware at the target batch size, which is where papers reporting 'efficiency' most often diverge from deployment. It is the same shape as every proxy-metric problem: the number is real, and it is not the quantity you are being paid to reduce."
        },
        {
          "q": "Why do residual connections appear in transformers if they were invented for CNNs?",
          "a": "Because the problem they solve is about optimizing deep stacks, not about images. Any architecture that composes many layers faces the same difficulty — the composed Jacobian is a long product, and without an additive path the signal reaching early layers is at the mercy of that product. A transformer block wraps both attention and the feed-forward network in a residual for exactly that reason, and it also inherits the identity-initialization argument: with the residual, a block starts close to a no-op and learns a perturbation, which is a much better starting point than a random deep function. The related detail worth knowing is that pre-norm and post-norm transformers differ in precisely the way pre-activation and post-activation ResNets do. Pre-norm keeps the residual stream a clean additive highway and trains stably at depth without warmup; post-norm puts a normalization on the residual path itself and needs careful warmup to avoid diverging. Modern LLMs are pre-norm for the same reason ResNet-v2 was: keep the identity path unobstructed. So the lineage is direct, and it is evidence that the contribution was an optimization insight rather than a vision one."
        },
        {
          "q": "You need a model for a fixed latency budget on a specific device. How do you proceed?",
          "a": "Treat it as a constrained search where the constraint is measured, not estimated. First establish the budget precisely — latency at what percentile, at what batch size, on what hardware, including preprocessing — because a p99 target at batch 1 is a very different problem from a mean target at batch 32. Then build a baseline from a pretrained backbone at a few widths and depths and MEASURE each on the target device rather than reasoning from FLOPs. That measurement usually reorders the candidates. From there the levers in rough order of return: pick the right backbone family for the device, since what is fast on a server GPU and what is fast on a mobile NPU differ substantially; reduce input resolution, which is often the single largest lever and is frequently under-explored because it feels like giving up; apply compound scaling rather than tuning depth or width alone; then quantize, which typically gives a solid speedup for a small accuracy cost and is well supported. Distillation is worth trying when a large model is available and the small one has capacity to spare. Structured pruning helps if the runtime can actually exploit the resulting sparsity, and unstructured pruning usually cannot be exploited at all — which is the same FLOPs-versus-latency trap in a different disguise."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Degradation problem",
        "back": "Deeper plain networks show higher TRAINING error, not just test error. An optimization failure, not overfitting — which is why residuals and not regularization fix it."
      },
      {
        "type": "formula",
        "front": "Residual block",
        "back": "y = x + F(x). Jacobian is I + dF/dx, so backprop always has an additive identity path to earlier layers."
      },
      {
        "type": "intuition",
        "front": "Why identity is the key",
        "back": "A deeper net contains the shallower one if the extra layers are identity. Residual form makes identity mean 'drive F to zero', which is easy; plain form does not."
      },
      {
        "type": "formula",
        "front": "Receptive field growth",
        "back": "+2 per 3x3 conv; a stride-2 downsample doubles the downstream growth rate; dilation widens it at no parameter cost."
      },
      {
        "type": "intuition",
        "front": "Effective receptive field",
        "back": "Roughly Gaussian and grows with sqrt(depth), so it is much smaller than the theoretical bound. Measure it with the gradient of one output w.r.t. the input."
      },
      {
        "type": "formula",
        "front": "Three 3x3 vs one 7x7",
        "back": "Same 7x7 window, 27C^2 vs 49C^2 parameters, plus two extra nonlinearities. The VGG argument for small kernels."
      },
      {
        "type": "definition",
        "front": "Bottleneck block",
        "back": "1x1 down-project, 3x3 at reduced width, 1x1 up-project. Buys depth at fixed cost by running the expensive spatial conv on fewer channels."
      },
      {
        "type": "intuition",
        "front": "ResNet as an ensemble",
        "back": "2^n paths through n blocks, mostly short; deleting one block barely changes the output. Depth buys an ensemble of effective depths, not one very deep function."
      },
      {
        "type": "intuition",
        "front": "Pre-norm vs post-norm",
        "back": "The transformer version of pre-activation vs post-activation ResNet. Keep the residual stream a clean identity and depth trains without warmup."
      },
      {
        "type": "pitfall",
        "front": "Trusting FLOPs",
        "back": "Depthwise convs have low arithmetic intensity and are bandwidth-bound; many small ops add launch overhead. Measure latency on the target device at the target batch size."
      },
      {
        "type": "pitfall",
        "front": "Assuming depth delivers global context",
        "back": "The effective receptive field may not cover the image even when the theoretical one does. If the task is global, use dilation, pyramid pooling or attention."
      },
      {
        "type": "pitfall",
        "front": "Crediting the architecture",
        "back": "ConvNeXt showed a plain CNN with a modern training recipe matches ViTs. Much apparent architectural progress was training-recipe progress."
      }
    ],
    "refs": [
      {
        "title": "He et al. (2015) — Deep Residual Learning for Image Recognition",
        "url": "https://arxiv.org/abs/1512.03385"
      },
      {
        "title": "He et al. (2016) — Identity Mappings in Deep Residual Networks",
        "url": "https://arxiv.org/abs/1603.05027"
      },
      {
        "title": "Simonyan & Zisserman (2014) — Very Deep Convolutional Networks (VGG)",
        "url": "https://arxiv.org/abs/1409.1556"
      },
      {
        "title": "Luo et al. (2016) — Understanding the Effective Receptive Field",
        "url": "https://arxiv.org/abs/1701.04128"
      },
      {
        "title": "Liu et al. (2022) — A ConvNet for the 2020s (ConvNeXt)",
        "url": "https://arxiv.org/abs/2201.03545"
      }
    ],
    "demos": []
  }
};
