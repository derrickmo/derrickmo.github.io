// GENERATED from content/lessons/llm-systems/moe.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/moe/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "moe": {
    "level": "advanced",
    "body": {
      "intuition": [
        "In a dense transformer one parameter count does two jobs: it sets the model's capacity AND its FLOPs per token, because every weight participates in every token. Mixture of experts breaks that identity. Replace the feed-forward network with N copies of it and a small router that sends each token to only k of them - usually one or two - and you get N times the parameters at roughly k over N times the compute. Capacity and arithmetic are now separate axes, which is the whole idea and the reason it is used at the frontier.",
        "It targets the FFN specifically, and that is not arbitrary: the FFN is two thirds of a transformer block's parameters, so it is where the capacity lives. Attention stays dense. What you buy is a better loss per FLOP - a sparse model reaches a lower loss than a dense one at the same compute budget, which is a genuine and repeated finding. What you pay is threefold: a load-balancing problem, because the router's assignment is learned and data-dependent and will collapse if you let it; an all-to-all communication pattern, which is the most demanding collective there is; and, decisively for anything you intend to serve, the requirement that EVERY expert be resident in memory even though only k of them fire.",
        "That last point is where this module's two-regime framing does the most work. In the compute-bound TRAINING regime, MoE is close to a free lunch - more capacity at the same FLOPs. In the memory-bandwidth-bound INFERENCE regime it is much less attractive: a sparse model with the FLOPs of a 7B dense model has the memory footprint of something far larger, and memory footprint is precisely what bounds the batch size, which bounds arithmetic intensity, which bounds throughput. So the same architecture is an excellent way to spend a training budget and an awkward thing to deploy, and reading MoE discussions is much easier once you know which regime the speaker is in."
      ],
      "math": [
        {
          "h": "Decoupling capacity from compute",
          "paras": [
            "The router produces a distribution over experts; the top k are run and their outputs combined, weighted by the gate. Parameters scale with the expert count and FLOPs with the number selected.",
            "The ratio of the two is the sparsity, and it is the new design axis that dense models do not have."
          ],
          "tex": "y = \\sum_{i \\in \\mathrm{TopK}(g(x))} g_i(x)\\, E_i(x), \\qquad P \\propto N, \\quad \\text{FLOPs} \\propto k",
          "texNote": "With N = 8 and k = 2 you have roughly four times the FFN parameters at the same arithmetic per token. Note the gate weight g_i multiplying the expert output is load-bearing: it is what makes the router DIFFERENTIABLE, since the top-k selection itself is not. The gradient reaches the router only through those weights, which is why a router whose gate values are near-uniform learns very slowly."
        },
        {
          "h": "The load-balancing loss",
          "paras": [
            "Nothing in the objective rewards using all the experts, and a router that discovers a good expert early will keep sending tokens there - a rich-get-richer collapse. The standard fix is an auxiliary loss that is minimized when routing is uniform.",
            "It multiplies the FRACTION OF TOKENS actually routed to each expert by the ROUTER'S AVERAGE PROBABILITY for it, which makes the term differentiable through the second factor even though the first is a hard count."
          ],
          "tex": "\\mathcal{L}_{\\text{aux}} = \\alpha \\, N \\sum_{i=1}^{N} f_i \\cdot p_i, \\qquad f_i = \\tfrac{1}{T}\\big|\\{t : i \\in \\mathrm{TopK}(x_t)\\}\\big|, \\;\\; p_i = \\tfrac{1}{T}\\textstyle\\sum_t g_i(x_t)",
          "texNote": "The product is the trick: f is a hard count with no gradient, p is soft and differentiable, and multiplying them gives a term whose gradient pushes the router's probability DOWN on experts that are already over-subscribed. It is minimized when both are uniform at 1/N. The coefficient alpha is a real hyperparameter - too small and experts collapse, too large and the router is forced to ignore the input, which throws away the specialization you wanted."
        },
        {
          "h": "The capacity factor, and what dropping costs",
          "paras": [
            "Communication and compute must be planned for a fixed buffer per expert, so each expert accepts a bounded number of tokens per batch. Tokens beyond that are DROPPED - they skip the FFN entirely and pass through on the residual.",
            "The factor trades wasted buffer against dropped tokens, and both are pure loss."
          ],
          "tex": "\\text{capacity} = C_f \\cdot \\frac{k \\cdot T}{N}, \\qquad C_f = 1 \\Rightarrow \\text{perfect balance assumed}, \\quad C_f > 1 \\Rightarrow \\text{slack}",
          "texNote": "At C_f = 1.25 you have allocated 25% headroom and you still drop whatever exceeds it. A dropped token is not an error - it simply gets no expert computation at that layer - but it is a token that received less processing than its neighbours, which is a strange and rarely-discussed property of MoE training. Note that dropping is a TRAINING-time device; at inference you generally cannot drop, which is one of several ways the two regimes diverge here."
        }
      ],
      "code": [
        {
          "h": "A top-k router with balancing, and where each piece is needed",
          "paras": [
            "The routing itself is a few lines. Everything around it exists because the assignment is learned, dynamic and data-dependent - which is the source of every difficulty in this lesson."
          ],
          "code": "class MoELayer(nn.Module):\n    def __init__(self, d, n_experts, k=2, cap_factor=1.25):\n        super().__init__()\n        self.router  = nn.Linear(d, n_experts, bias=False)\n        self.experts = nn.ModuleList(FFN(d) for _ in range(n_experts))\n        self.k, self.cf, self.N = k, cap_factor, n_experts\n\n    def forward(self, x):                       # x: (T, d), T tokens\n        logits = self.router(x)                 # (T, N)\n        probs  = logits.softmax(-1)\n        topv, topi = probs.topk(self.k, dim=-1) # hard selection - NOT\n                                                # differentiable...\n        topv = topv / topv.sum(-1, keepdim=True)\n\n        cap = int(self.cf * self.k * x.size(0) / self.N)\n        out = torch.zeros_like(x)\n        for i, expert in enumerate(self.experts):\n            idx = (topi == i).nonzero()[:cap]   # <-- OVERFLOW IS DROPPED. Those\n                                                # tokens get NO expert compute\n                                                # at this layer; they pass\n                                                # through on the residual.\n            if idx.numel():\n                tok, slot = idx[:, 0], idx[:, 1]\n                out[tok] += topv[tok, slot, None] * expert(x[tok])\n                #          ^^^^ ...but the GATE WEIGHT is, which is the ONLY\n                #          path by which gradient reaches the router. A router\n                #          whose gates are near-uniform learns very slowly.\n\n        # LOAD BALANCING - without this the router COLLAPSES onto a few experts,\n        # because nothing in the main objective rewards using all of them.\n        f = torch.zeros(self.N).index_add_(0, topi.flatten(),\n                                           torch.ones(topi.numel())) / x.size(0)\n        p = probs.mean(0)\n        aux = self.N * (f * p).sum()            # hard count x soft prob\n        return out, aux                          # add alpha * aux to the loss\n\n# WHY THE PRODUCT f*p: f is a COUNT with no gradient; p is SOFT. Multiplying\n# gives a term whose gradient pushes router probability DOWN on experts that\n# are already over-subscribed. Minimized when both are uniform at 1/N.\n# alpha matters: too small -> collapse; too large -> the router ignores the\n# input and you lose the specialization you were buying.",
          "caption": "Two lines carry the design. The gate weight is the only differentiable path to the router, so the top-k selection can be hard; and the auxiliary loss multiplies a non-differentiable count by a differentiable probability, which is how you get a gradient out of a balance constraint."
        },
        {
          "h": "Expert choice, and the two costs that decide deployment",
          "paras": [
            "Inverting the routing removes load balancing by construction. And then the two costs that a FLOP-based comparison completely hides."
          ],
          "code": "# EXPERT CHOICE ROUTING - invert the assignment. Instead of each TOKEN picking\n# its top-k experts, each EXPERT picks its top-c tokens:\ntopv, topi = probs.t().topk(capacity, dim=-1)   # (N, capacity) over TOKENS\n#   -> PERFECT BALANCE BY CONSTRUCTION. No auxiliary loss, no dropping, no\n#      capacity factor to tune.\n#   -> BUT the semantics change: a token may receive ZERO experts or MANY.\n#      Variable compute per token, which is arguably a feature (hard tokens\n#      get more) and is awkward for autoregressive decoding, where it leaks\n#      information across positions unless handled carefully.\n\n# ---- COST 1: COMMUNICATION ----\n# Experts live on different devices, so per MoE layer:\n#   all-to-all  -> send each token to the rank holding its expert\n#   compute     -> each rank runs its expert on whatever arrived\n#   all-to-all  -> send the results back\n# Twice per layer, forward AND backward. all-to-all is ALL-PAIRS, so it stresses\n# bisection bandwidth and MUST cross the slow inter-node link - unlike an\n# all-reduce, which can be arranged hierarchically. And the message sizes are\n# DATA-DEPENDENT, so they are unpredictable and unbalanced.\n\n# ---- COST 2: MEMORY RESIDENCY - the one that decides serving ----\n#   FLOPs per token   ~  ACTIVE parameters   (k of N experts)\n#   MEMORY resident   ~  TOTAL parameters    (ALL N experts)\n#\n#   e.g. 8 experts, top-2:  compute of a ~7B dense model\n#                           memory of a ~40B+ dense model\n#\n# In the BANDWIDTH-BOUND decode regime this is decisive: memory bounds the\n# batch, the batch bounds arithmetic intensity, and intensity bounds throughput.\n# So MoE's advantage is LARGEST in compute-bound TRAINING and SMALLEST in\n# memory-bound INFERENCE - the same architecture, opposite verdicts.\n\n# THE MODERN REFINEMENT (DeepSeekMoE style): many FINE-GRAINED experts plus a\n# few always-on SHARED experts. Fine granularity gives the router more precise\n# choices; shared experts absorb the common computation so the specialists do\n# not each have to relearn it.",
          "caption": "Expert choice removes the balance problem by inverting who selects whom, at the cost of variable compute per token. And the memory line is the one that decides deployments: FLOPs track active parameters, residency tracks total."
        }
      ],
      "useCases": [
        "Frontier-scale pretraining, where the compute budget is the binding constraint and MoE reliably reaches a lower loss per FLOP than a dense model - which is why most of the largest models are sparse.",
        "Getting more capacity onto a fixed training cluster, since the FLOPs per token are what the accelerators are spending and the extra parameters are comparatively cheap to hold across many devices.",
        "Multilingual and multi-domain models, where the intuition that different experts specialize has some empirical support and where the capacity is genuinely being used for distinct kinds of input.",
        "Settings where memory is plentiful relative to compute - large-batch offline inference, or serving on hardware with substantial memory per accelerator - which is where a sparse model's residency cost is least damaging."
      ],
      "pitfalls": [
        "Omitting the load-balancing loss. The router collapses onto a few experts because nothing in the main objective rewards using all of them, and the unused experts are dead parameters you paid for in memory and communication.",
        "Setting the balancing coefficient by feel. Too small and experts collapse; too large and the router is forced toward uniform routing, which discards the specialization that was the point of the architecture.",
        "Ignoring dropped tokens. At a capacity factor of 1.25 anything beyond the buffer skips the FFN entirely and passes through on the residual - a token that received strictly less processing than its neighbours, which is a strange property to have without knowing it.",
        "Comparing a sparse and a dense model on FLOPs alone. That comparison hides memory residency and all-to-all communication, which are the two costs that determine whether the model can be served - and both are invisible in a compute-optimal analysis.",
        "Applying dense scaling laws unchanged. FLOPs track ACTIVE parameters while capacity tracks TOTAL, so the compute-optimal allocation is a different optimization with a third axis, and the naive version recommends far more sparsity than is servable.",
        "Placing expert parallelism across a slow interconnect. All-to-all is all-pairs and must cross the inter-node link - unlike an all-reduce, which can be arranged hierarchically - so it stresses bisection bandwidth and is the least forgiving collective to misplace.",
        "Expecting MoE to be stable out of the box. Sparse models are known to be more prone to training instability, which is why router z-losses and careful initialization appear in essentially every production recipe."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-architectures",
          "text": "Why MoE routes at the FFN and leaves attention dense: the FFN is two thirds of a block's parameters, so it is where capacity lives. The design follows from the parameter distribution rather than being a free choice."
        },
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Where all-to-all is developed as a primitive. It is the most demanding collective - all-pairs, so it stresses bisection bandwidth and cannot be arranged hierarchically the way an all-reduce can - and MoE is essentially the only place it is central."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Why the dense analysis has to be redone: the compute constraint refers to active parameters and the loss model to total parameters, which turns a curve into a surface with sparsity as a third axis."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "The inference-regime consequence. Decoding is bandwidth-bound, and a sparse model's total parameters must be resident and largely read, so the technique that helps most there is the one that amortizes reads over more tokens."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "Expert parallelism is a fifth parallelism axis that must be placed alongside data, tensor and pipeline - and its all-to-all pattern is more demanding than any of them, which constrains where it can sit in the hierarchy."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a mixture of experts change?",
          "a": "It decouples capacity from compute. Parameters scale with the number of experts while FLOPs per token scale with how many are selected."
        },
        {
          "q": "Why does MoE replace the FFN rather than attention?",
          "a": "The FFN is two thirds of a transformer block's parameters, so that is where the capacity lives. Attention stays dense."
        },
        {
          "q": "How does gradient reach the router if top-k is not differentiable?",
          "a": "Through the gate weights multiplying the expert outputs. The hard selection carries no gradient; the soft weight does."
        },
        {
          "q": "What is the load-balancing loss?",
          "a": "The expert count times the sum over experts of the token fraction times the mean router probability. It is minimized when both are uniform."
        },
        {
          "q": "Why multiply a count by a probability?",
          "a": "The count is hard and has no gradient; the probability is soft. Their product gives a differentiable term whose gradient pushes probability off over-subscribed experts."
        },
        {
          "q": "What is the capacity factor?",
          "a": "A multiplier on the expected tokens per expert, setting a fixed buffer. Tokens beyond it are dropped - they skip the FFN and pass through on the residual."
        },
        {
          "q": "What is expert choice routing?",
          "a": "Inverting the assignment so each expert picks its top tokens rather than each token picking experts. Perfectly balanced by construction, with variable compute per token."
        },
        {
          "q": "What communication pattern does MoE need?",
          "a": "All-to-all, twice per layer in forward and again in backward - to send tokens to their expert's rank and the results back."
        },
        {
          "q": "Why is all-to-all harder than all-reduce?",
          "a": "It is all-pairs, so it stresses bisection bandwidth and must cross the inter-node link, where an all-reduce can be arranged hierarchically to cross it once."
        },
        {
          "q": "What is MoE's memory cost?",
          "a": "Every expert must be resident even though only k fire, so FLOPs track active parameters while memory tracks total parameters."
        },
        {
          "q": "In which regime is MoE most attractive?",
          "a": "The compute-bound training regime. It is least attractive in memory-bandwidth-bound inference, where residency bounds the batch and therefore throughput."
        },
        {
          "q": "What are shared experts?",
          "a": "Always-on experts alongside the routed ones, absorbing common computation so the specialists do not each have to relearn it. Paired with finer-grained experts."
        }
      ],
      "standard": [
        {
          "q": "How would you serve a mixture-of-experts model efficiently?",
          "a": "THE CONSTRAINT THAT SHAPES EVERYTHING: all experts must be RESIDENT while only k fire per token. So the memory footprint is that of the total parameter count and the arithmetic is that of the active count - and in the bandwidth-bound decode regime, memory is what bounds the batch and therefore the throughput. Serving MoE well is mostly about managing that gap. WHAT MAKES IT HARDER THAN A DENSE MODEL. (1) THE WEIGHTS READ PER TOKEN ARE DATA-DEPENDENT. In a dense model every token reads the same weights, so batching amortizes them perfectly. In an MoE model, tokens in a batch route to DIFFERENT experts, so the union of experts touched grows with the batch - and at large batch you end up reading most experts anyway, which erodes the FLOP advantage in exactly the regime where you needed the batch. That is an unpleasant interaction and it is under-discussed. (2) ROUTING IS PER-TOKEN AT DECODE, so each generated token may need a different expert set than the last, and there is no locality to exploit across steps. (3) THE ALL-TO-ALL IS STILL THERE if experts are distributed, and at batch sizes typical of interactive serving the messages are tiny and latency-bound. THE TECHNIQUES, roughly in order of how much they help. (1) KEEP EXPERTS ON ONE DEVICE if they fit, eliminating the all-to-all entirely. This is the single biggest simplification and it bounds how many experts you can have - which is a serving constraint feeding back into the architecture. (2) EXPERT PARALLELISM WITHIN A NODE if they do not, so the all-to-all is over the fast interconnect. Never across nodes for an interactive path. (3) BATCH BY ROUTE where the workload permits - grouping requests likely to use similar experts raises locality. Limited applicability, but real for domain-partitioned traffic. (4) EXPERT OFFLOADING AND CACHING: keep hot experts resident and page cold ones from host memory. This works because expert usage is typically skewed even after balancing, and it is the direct analogue of KV-cache paging. The risk is a request that misses, so it needs an admission policy and it degrades tail latency. (5) QUANTIZE THE EXPERTS more aggressively than the dense parts. Experts are the bulk of the parameters and are used sparsely, so they are the highest-leverage target and some evidence suggests they tolerate it well. (6) PRUNE REDUNDANT EXPERTS, which the specialization analysis makes plausible - if some experts are functionally similar, dropping them costs little and directly attacks residency. WHAT I WOULD MEASURE. Achieved batch size against the theoretical one, which quantifies how much memory the experts are costing you in throughput terms. The distinct-experts-touched per batch as a function of batch size, which tells you where the FLOP advantage erodes. And the tail latency, because expert offloading and imbalanced routing both hurt the tail specifically while leaving the mean acceptable. THE HONEST SUMMARY. Sparse models are considerably harder to serve than dense ones of the same quality, and the right answer is often to train sparse and DISTIL to dense for deployment - putting the FLOP advantage where it helps and the memory advantage where it helps."
        },
        {
          "q": "Explain mixture of experts - what it buys and what it costs.",
          "a": "THE CORE IDEA. In a dense transformer one parameter count does two jobs: it sets capacity AND FLOPs per token, because every weight participates in every token. MoE breaks that identity. Replace the FFN with N copies plus a small router, send each token to only k of them - typically one or two - and you get N times the parameters at roughly k over N times the arithmetic. Capacity and compute become separate axes. WHY THE FFN. Because it is two thirds of a transformer block's parameters, so that is where capacity lives. Attention stays dense. That is not an arbitrary choice; it follows from the parameter distribution. THE MECHANISM. A linear router produces logits over experts, softmax, take the top k, run those experts, and combine their outputs weighted by the gate values. The gate weight is load-bearing: the top-k SELECTION is not differentiable, so the only path by which gradient reaches the router is through those multiplicative weights. A router whose gates are near-uniform therefore learns very slowly, which is worth knowing when one appears not to be learning. WHAT IT BUYS. A better loss per FLOP. At a fixed compute budget a sparse model reaches a lower loss than a dense one - a repeated finding and the reason most frontier models are sparse. THE THREE COSTS, and they are the substance. (1) LOAD BALANCING. Nothing in the main objective rewards using all the experts, so the router collapses onto a few - rich-get-richer, since an expert that gets more tokens gets better and attracts more. The standard fix is an auxiliary loss equal to N times the sum over experts of the token FRACTION times the mean router PROBABILITY. The product is the trick: the fraction is a hard count with no gradient, the probability is soft, and multiplying gives a differentiable term that pushes probability off over-subscribed experts. Its coefficient is a genuine hyperparameter - too small and experts collapse, too large and the router is forced toward uniform routing, discarding the specialization you were buying. (2) CAPACITY AND DROPPING. Buffers must be fixed for communication and compute planning, so each expert accepts a bounded number of tokens and the overflow is DROPPED - those tokens skip the FFN entirely and pass through on the residual. They are not errors, but they received strictly less processing than their neighbours, which is a strange property to have unknowingly. (3) COMMUNICATION AND MEMORY. Experts live on different devices, so each MoE layer needs two all-to-all operations, in forward and again in backward. All-to-all is all-pairs, stresses bisection bandwidth, must cross the slow inter-node link where an all-reduce could be hierarchical, and its message sizes are data-dependent and therefore unbalanced. And every expert must be RESIDENT even though only k fire. THE REGIME POINT I WOULD END ON. FLOPs track ACTIVE parameters; memory tracks TOTAL. So in the compute-bound training regime MoE is close to a free lunch, and in the bandwidth-bound inference regime it is much less attractive - residency bounds the batch, the batch bounds arithmetic intensity, and intensity bounds throughput. Same architecture, opposite verdicts, and knowing which regime someone is arguing from resolves most disagreements about whether MoE is worth it.",
          "deepDive": {
            "q": "Walk through the load-balancing problem in detail and compare the available fixes.",
            "a": "WHY COLLAPSE HAPPENS. The router is trained only through the main loss, and the main loss rewards routing a token to whichever expert handles it best. Early in training the experts are nearly identical, so small random differences decide the routing. An expert that receives slightly more tokens gets slightly more gradient, becomes slightly better, and attracts more tokens. That is a positive feedback loop with no opposing force, and the equilibrium is a small number of used experts with the rest dead - parameters you paid for in memory and communication and are not using. FIX 1: THE AUXILIARY LOSS. Add alpha times N times the sum over experts of f_i times p_i, where f is the fraction of tokens routed to expert i and p is the router's mean probability for it. Both are uniform at 1/N when balanced, and the sum is minimized there. The construction is clever: f is a hard count and carries no gradient, but multiplying by the differentiable p gives a term whose gradient reduces the router's probability on experts with high f. So the load imbalance you measure becomes a force on the thing you can differentiate. Its weakness is the coefficient. Too small and collapse proceeds; too large and the router is pushed toward uniform routing regardless of input, which is the degenerate case where you have paid for N experts and are using them as an expensive average. Tuning it is real work and it interacts with the number of experts and the batch size. FIX 2: THE CAPACITY FACTOR. Cap the tokens per expert and drop the overflow. This is not really a balancing mechanism - it is a mechanism for BOUNDING THE DAMAGE of imbalance so the buffers and the all-to-all can be sized statically. It converts imbalance from a correctness problem into a dropped-token problem. The cost is that dropping is unevenly distributed over the data: tokens that route to popular experts are the ones dropped, so you are systematically under-processing a particular kind of input. FIX 3: EXPERT CHOICE ROUTING, which I find the most elegant. Invert the assignment: instead of each token picking its top-k experts, each EXPERT picks its top-c tokens. Balance is then perfect BY CONSTRUCTION - every expert gets exactly c tokens - so there is no auxiliary loss, no coefficient to tune, no capacity factor, and no dropping. What changes is the semantics: a token may be selected by zero experts or by many, so compute per token becomes variable. That is arguably a feature - difficult tokens attract more experts - and it is awkward for autoregressive decoding, because an expert choosing among tokens couples positions in a way that can leak information from later tokens to earlier ones unless carefully constrained. That restriction is why it is more common in encoder or training-time settings. FIX 4: NOISE AND REGULARIZATION on the router logits, which was in the original sparsely-gated formulation - adding noise before the top-k makes the assignment stochastic and prevents early lock-in. Simple, and it addresses the feedback loop at its source rather than penalizing its outcome. FIX 5: MANY FINE-GRAINED EXPERTS PLUS SHARED ONES. More, smaller experts give the router finer choices and make any single expert less dominant; always-on shared experts absorb the computation every token needs, so the specialists are not each forced to relearn the common case. This changes the problem's shape rather than adding a penalty, and it is where recent production designs have gone. WHAT I WOULD USE. Auxiliary loss plus a modest capacity factor as the reliable default, with the coefficient tuned by monitoring the actual expert utilization histogram rather than by feel - that histogram is the diagnostic and it is rarely plotted. Fine-grained plus shared experts if designing from scratch. And expert choice where the setting permits it, because removing a hyperparameter by construction is worth more than tuning it well."
          }
        },
        {
          "q": "When would you choose a sparse model over a dense one?",
          "a": "THE DECISION TURNS ON WHICH REGIME DOMINATES YOUR COSTS, and I would work through it in that frame. CHOOSE SPARSE WHEN TRAINING COMPUTE IS THE BINDING CONSTRAINT. At a fixed FLOP budget a sparse model reaches a lower loss than a dense one - repeatedly demonstrated and the reason frontier pretraining is largely sparse. If you have a cluster, a compute budget, and the goal is the best model you can train with it, MoE is the right answer and the memory cost is spread across many devices where it is comparatively cheap. CHOOSE SPARSE WHEN MEMORY IS PLENTIFUL RELATIVE TO COMPUTE. Large-batch offline inference, batch scoring, anything where you are already compute-bound at serving time because the batch is large. In that regime the residency cost is absorbed and the FLOP saving is real. CHOOSE DENSE WHEN YOU ARE SERVING INTERACTIVELY. Decoding is memory-bandwidth-bound: memory bounds the batch, the batch bounds arithmetic intensity, and intensity bounds throughput. A sparse model with the FLOPs of a 7B dense model has the footprint of something much larger, so it occupies the memory that would otherwise hold KV cache for more concurrent requests. You are trading the thing that determines your throughput for a FLOP saving in a regime where FLOPs were not the constraint. That is the wrong trade, and it is the single most common misapplication. CHOOSE DENSE WHEN THE DEPLOYMENT IS MEMORY-CONSTRAINED - edge, single-GPU, anything where total parameters must fit somewhere small. The active-parameter count is irrelevant if the total does not fit. CHOOSE DENSE WHEN THE INFRASTRUCTURE IS NOT THERE. Expert parallelism needs all-to-all across devices, load-balancing monitoring, capacity tuning, and a serving stack that handles routing. That is substantial engineering, and a dense model of the same quality - if you can afford to train one - is far simpler to operate. THE INTERMEDIATE OPTION people forget. Train sparse and DISTIL to dense for serving. That puts the FLOP advantage where it helps - training - and the memory advantage where it helps - inference. It is the explicit two-regime answer and it is used in practice. THE NUMBERS I WOULD ACTUALLY COMPUTE before deciding. Total parameters times bytes, to see whether it fits alongside the KV cache I need. The resulting servable batch, and therefore the arithmetic intensity and the throughput, compared against a dense model of the same quality. And the all-to-all volume against my interconnect. Those three turn the question from an architectural preference into an arithmetic comparison, and in my experience they frequently point the opposite way to the FLOP comparison that motivated the choice."
        },
        {
          "q": "Why is MoE communication so difficult, and what can be done about it?",
          "a": "THE PATTERN. Experts are distributed across devices, so each MoE layer requires: route tokens locally, ALL-TO-ALL to send each token to the rank holding its expert, compute, ALL-TO-ALL to send results back. Twice per layer in the forward pass and again in backward. WHY ALL-TO-ALL IS THE HARDEST COLLECTIVE. (1) IT IS ALL-PAIRS. Every rank sends to and receives from every other rank, so the traffic stresses BISECTION BANDWIDTH rather than any single link. Contrast an all-reduce, which can be arranged hierarchically - reduce within a node over the fast interconnect, then across nodes once, then broadcast back down - so the slow inter-node link carries the data once. All-to-all has no such structure; the data genuinely must cross. (2) THE SIZES ARE DATA-DEPENDENT. How many tokens go to each expert depends on the router's decisions, which vary per batch. So message sizes are irregular and unpredictable, some ranks receive far more than others, and every rank waits for the slowest. This is the central practical problem and it is why capacity factors exist - they bound the imbalance at the cost of dropping tokens. (3) IT DOES NOT OVERLAP EASILY. A gradient all-reduce overlaps with the backward pass because gradients become ready progressively. An MoE all-to-all sits in the MIDDLE of the forward pass and everything after it depends on it, so there is far less to hide it behind. WHAT CAN BE DONE, roughly in order of effect. (1) PLACEMENT. Keep expert parallelism within the fastest available domain. If experts fit within a node, the all-to-all is over NVLink and the problem largely disappears; across nodes it is the dominant cost. This is the single biggest lever and it constrains how many experts you can have. (2) CAPACITY FACTORS AND BALANCING, which make the message sizes predictable enough to plan buffers and reduce the straggler effect. The auxiliary loss is a communication optimization as much as a modelling one, which is a useful way to see it. (3) OVERLAPPING WITH OTHER LAYERS. Implementations work hard to overlap one MoE layer's all-to-all with another layer's expert computation, which requires restructuring the schedule and is where much of the systems effort in MoE goes. (4) HIERARCHICAL ALL-TO-ALL: aggregate within a node first, then exchange between nodes, then distribute - which reduces inter-node messages at the cost of extra local work, and is the standard optimization. (5) FEWER, LARGER EXPERTS reduce the message count; more, finer experts improve routing quality. That is a direct tension between modelling and systems, and it is resolved differently depending on the interconnect. THE OBSERVATION I WOULD MAKE. MoE's practical scaling is determined by NETWORK TOPOLOGY more than by arithmetic, which is unusual - most of the techniques in this curriculum are limited by compute or memory. That is why MoE is a systems achievement as much as a modelling one, and why the same architecture performs very differently on two clusters with the same aggregate FLOPs."
        },
        {
          "q": "What happens to a dropped token, and is that acceptable?",
          "a": "WHAT HAPPENS MECHANICALLY. Each expert has a fixed capacity - a buffer sized as the capacity factor times the expected tokens per expert. Tokens routed to an expert beyond its capacity are not processed by it. In the standard implementation they simply pass through on the RESIDUAL connection: the MoE layer contributes nothing for them, and they proceed to the next layer unchanged by that FFN. WHY IT IS DONE. Communication buffers and compute must be sized statically for the all-to-all and for efficient batched expert computation. Without a cap, a batch where many tokens route to one expert would need an unbounded buffer, and the imbalance would stall every rank. Dropping converts an unbounded, unpredictable problem into a bounded one at a known cost. IS IT ACCEPTABLE - three considerations, and I think the honest answer is a qualified yes with a caveat people rarely state. (1) IT IS NOT AN ERROR. A residual connection means the token still carries its representation forward; it has just received one fewer FFN application. In a deep model with many layers, missing one expert application at one layer is a small perturbation, and empirically models train fine with modest drop rates. (2) BUT IT IS NOT RANDOM. Dropped tokens are those routed to POPULAR experts, so you are systematically under-processing a particular kind of input - whatever the over-subscribed experts specialize in. That is a structured bias, not noise, and it is invisible in aggregate loss. I have not seen it well characterized and I would treat it as an open concern rather than a solved one. (3) IT DIFFERS BETWEEN TRAINING AND INFERENCE, which is the part that matters most. At training time dropping is tolerable and is standard. At inference you generally CANNOT drop - a user's token receiving less computation than another's is a correctness and fairness problem, and the capacity factor is usually raised or the constraint removed entirely. So the model is being evaluated under a different routing regime than it was trained under, which is a train-test mismatch that is rarely discussed. WHAT I WOULD MONITOR. The drop RATE, per layer, as a standard metric. A rising drop rate means balance is degrading. And the expert utilization histogram, which is the underlying quantity and which is almost never plotted despite being one line. If drops are concentrated in a few layers, that suggests those layers' routers have collapsed and the balancing coefficient needs attention there specifically. THE ALTERNATIVE THAT REMOVES THE QUESTION. Expert choice routing has no dropping at all, because each expert takes exactly its capacity in tokens - balance is by construction. The cost is variable compute per token and the autoregressive complication. That trade - a strange training-time artefact versus a strange decoding-time constraint - is a fair summary of where MoE routing design currently sits.",
          "deepDive": {
            "q": "How would you evaluate whether the experts have actually specialized?",
            "a": "THE QUESTION MATTERS because the intuitive story - experts specialize by topic or language, and the router learns to dispatch - is largely folklore, and the measured picture is messier. Establishing what is actually happening changes how you interpret the architecture. THE MEASUREMENTS I WOULD RUN. (1) THE UTILIZATION HISTOGRAM, first and always. Fraction of tokens routed to each expert, per layer. This is one line of code and it is the basic health check - a collapsed router shows immediately, and a perfectly uniform one under a strong auxiliary loss tells you the router may be ignoring the input. (2) ROUTING CONSISTENCY. For a fixed token type - a particular word, a particular part of speech, a particular language - what is the distribution over experts? If routing were topic-based you would expect concentration. The published analyses generally find LESS specialization than expected: routing often correlates with shallow features like the token identity itself rather than with semantic category, particularly in early layers. (3) LAYER DEPENDENCE. Specialization patterns differ by depth, and early-layer routing looks more lexical while deeper layers look more contextual. Worth measuring per layer rather than in aggregate, because an aggregate hides it. (4) ABLATION, which is the strongest test. Disable an expert - route its tokens elsewhere - and measure the loss change, overall and by input category. If expert 5 is the mathematics expert, ablating it should hurt mathematics specifically. If the damage is uniform, the expert is not specialized in any interpretable way. This is the experiment that distinguishes the story from the reality and it is cheap. (5) REDUNDANCY. Compare experts' weights or their functional behaviour on the same inputs. High similarity means you are paying for capacity you are not using distinctly - and there is evidence that some experts are substantially redundant, which is what expert-pruning work exploits. WHAT THE EVIDENCE ROUGHLY SHOWS, stated carefully because it is an area where confident claims outrun the measurements. Routing is often less semantically interpretable than the name suggests. Some specialization by surface features is real. Specialization by language has been observed in multilingual models. And the performance benefit does not obviously depend on interpretable specialization - the model gains from having more parameters with sparse access, whether or not the partition means anything to us. WHY THIS MATTERS PRACTICALLY. If experts are substantially redundant, you can PRUNE them - dropping the least-used experts with modest quality loss, which directly addresses the residency problem that makes MoE hard to serve. If routing is dominated by token identity, a cheaper router might suffice. And if specialization is genuinely weak, the intuitive argument for MoE - a mixture of specialists - is the wrong story even though the empirical result stands, and reasoning from the wrong story will lead you to wrong predictions about when it will help. THE HABIT I WOULD RECOMMEND. Plot the utilization histogram and run the ablation before believing any specialization narrative, including your own. It is an afternoon, and the result is frequently not what the architecture's name suggests."
          }
        },
        {
          "q": "How does MoE interact with the parallelism strategies?",
          "a": "IT ADDS A FIFTH AXIS - EXPERT PARALLELISM - and it is the most demanding one, so its placement constrains everything else. WHAT EXPERT PARALLELISM IS. Distribute the experts of a layer across devices; each device holds a subset and processes whatever tokens are routed to it. The communication is all-to-all, twice per layer, in forward and backward. HOW IT COMPOSES WITH THE OTHERS. With DATA parallelism: straightforward - each expert-parallel group processes a different batch shard and gradients are all-reduced as usual, with the subtlety that experts see different numbers of tokens so their gradient scales differ, which the balancing loss partly addresses. With TENSOR parallelism: each expert can itself be tensor-parallel, which is standard for large experts and means you have a two-dimensional device grid with expert index on one axis and tensor shard on the other. With PIPELINE parallelism: compatible, and the all-to-all within a stage adds to that stage's time, which affects the bubble balance across stages - a stage containing MoE layers is slower, so the pipeline must be partitioned by TIME rather than by layer count. With FSDP: the experts are the bulk of the parameters, so sharding them is where the memory saving is - and this interacts awkwardly, because expert parallelism already distributes them, so applying both means deciding which axis owns the distribution. THE PLACEMENT RULE, extending the one from the sharding lesson. Tensor parallelism communicates most frequently and belongs within a node. Expert parallelism's all-to-all is all-pairs and cannot be arranged hierarchically, so it too wants the fastest domain - which puts it in direct competition with tensor parallelism for the same fast links. That competition is the central difficulty in a large MoE deployment, and the usual resolution is to keep the expert group within a node where possible, which bounds the number of experts to what fits. Pipeline parallelism, with the lowest volume, goes across nodes. Data parallelism outermost. THE LOAD-IMBALANCE INTERACTION, which compounds. Expert parallelism's message sizes are data-dependent, so ranks receive different amounts of work and every collective waits for the slowest. In a pipeline that straggler propagates into the bubble. So MoE makes the straggler problem worse in a way that is intrinsic rather than incidental - it is not a bad node, it is the routing. Capacity factors are as much a systems device for bounding this as a modelling one. WHAT I WOULD MEASURE. The all-to-all time as a fraction of step time, the per-rank token-count distribution, and the drop rate - those three characterize the expert-parallel cost completely. And the scaling curve as a function of expert count, which is what tells you where the interconnect stops supporting more experts. THE SUMMARY. MoE is the parallelism axis whose cost is set by network topology rather than by arithmetic, which is why the same sparse architecture performs very differently on two clusters with identical aggregate FLOPs, and why expert count is as much an infrastructure decision as a modelling one."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "What MoE decouples",
        "back": "y = sum over TopK(g(x)) of g_i(x) * E_i(x). PARAMETERS ~ N (expert count), FLOPs ~ k (experts selected). With N=8, k=2: ~4x the FFN parameters at the same arithmetic per token."
      },
      {
        "type": "intuition",
        "front": "Why the gate weight is load-bearing",
        "back": "Top-k SELECTION is not differentiable. The gate value multiplying each expert's output is the ONLY path by which gradient reaches the router - so a router whose gates are near-uniform learns very slowly."
      },
      {
        "type": "formula",
        "front": "The load-balancing auxiliary loss",
        "back": "alpha * N * sum_i (f_i * p_i), where f = token FRACTION (hard count, no gradient) and p = mean router PROBABILITY (soft). The PRODUCT makes a non-differentiable balance constraint differentiable. Minimized when both are uniform at 1/N."
      },
      {
        "type": "intuition",
        "front": "Why routers collapse",
        "back": "An expert that gets slightly more tokens gets more gradient, becomes better, and attracts more - positive feedback with no opposing force in the main objective. The equilibrium is a few used experts and the rest DEAD parameters you paid for."
      },
      {
        "type": "pitfall",
        "front": "The balancing coefficient has two failure modes",
        "back": "Too SMALL: experts collapse. Too LARGE: the router is forced toward uniform routing regardless of input - you have paid for N experts and are using them as an expensive average. Tune it against the utilization HISTOGRAM, which is one line and rarely plotted."
      },
      {
        "type": "definition",
        "front": "Capacity factor and dropped tokens",
        "back": "capacity = C_f * kT/N. Overflow tokens SKIP the FFN and pass through on the residual. Not an error - but not random either: drops concentrate on POPULAR experts, so you systematically under-process a particular kind of input."
      },
      {
        "type": "pitfall",
        "front": "Dropping is a TRAINING-time device",
        "back": "At inference you generally cannot drop - a user's token getting less computation than another's is a fairness problem - so the capacity factor is raised or removed. The model is then evaluated under a DIFFERENT routing regime than it trained under."
      },
      {
        "type": "definition",
        "front": "Expert choice routing",
        "back": "Invert it: each EXPERT picks its top-c TOKENS. Perfect balance BY CONSTRUCTION - no aux loss, no capacity factor, no dropping. Cost: a token may get ZERO or MANY experts (variable compute), and it couples positions, which is awkward for autoregressive decoding."
      },
      {
        "type": "intuition",
        "front": "The line that decides deployment",
        "back": "FLOPs ~ ACTIVE parameters; MEMORY RESIDENT ~ TOTAL parameters. 8 experts top-2 = compute of a ~7B dense model, memory of a ~40B+ one. In bandwidth-bound decode, memory bounds the batch -> intensity -> throughput."
      },
      {
        "type": "intuition",
        "front": "MoE's verdict flips between regimes",
        "back": "LARGEST advantage in compute-bound TRAINING (better loss per FLOP). SMALLEST in memory-bound INFERENCE (residency bounds the batch). Same architecture, opposite verdicts - which resolves most arguments about whether MoE is worth it."
      },
      {
        "type": "pitfall",
        "front": "Why all-to-all is the hardest collective",
        "back": "ALL-PAIRS, so it stresses bisection bandwidth and MUST cross the inter-node link - unlike an all-reduce, which can be hierarchical and cross it once. And message sizes are DATA-DEPENDENT, so they are unbalanced and every rank waits for the slowest."
      },
      {
        "type": "intuition",
        "front": "Specialization is largely folklore - measure it",
        "back": "Routing often correlates with shallow features (token identity) more than semantics, especially in early layers. The strong test is ABLATION: disable an expert and see whether the damage is CATEGORY-SPECIFIC or uniform. Redundant experts can be PRUNED, which directly helps residency."
      }
    ],
    "refs": [
      {
        "title": "Shazeer et al. (2017), Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer",
        "url": "https://arxiv.org/abs/1701.06538"
      },
      {
        "title": "Fedus, Zoph & Shazeer (2021), Switch Transformers: Scaling to Trillion Parameter Models",
        "url": "https://arxiv.org/abs/2101.03961"
      },
      {
        "title": "Lepikhin et al. (2020), GShard: Scaling Giant Models with Conditional Computation",
        "url": "https://arxiv.org/abs/2006.16668"
      },
      {
        "title": "Zhou et al. (2022), Mixture-of-Experts with Expert Choice Routing",
        "url": "https://arxiv.org/abs/2202.09368"
      },
      {
        "title": "Dai et al. (2024), DeepSeekMoE: Towards Ultimate Expert Specialization",
        "url": "https://arxiv.org/abs/2401.06066"
      }
    ],
    "demos": [
      "moe",
      "mixture-of-depths",
      "batching",
      "model-cascade"
    ]
  }
};
