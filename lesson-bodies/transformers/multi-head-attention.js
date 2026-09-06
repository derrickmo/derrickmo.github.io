// GENERATED from content/lessons/transformers/multi-head-attention.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/multi-head-attention/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "multi-head-attention": {
    "level": "core",
    "body": {
      "intuition": [
        "A single attention head computes ONE weighted average per position: it decides, with one set of query and key projections, which other tokens matter and blends their values accordingly. That is a real limitation, and it is easiest to see with a sentence. In 'the cat that the dog chased ran away', the word 'ran' needs to attend to 'cat' (its subject, a syntactic relation), and separately to 'chased' (the embedded verb, a different relation), and perhaps to 'away' (its complement). One head must compress all of those relationships into a single softmax distribution, so strengthening one necessarily weakens the others - a single average cannot represent several different relationships at once.",
        "MULTI-HEAD ATTENTION runs h attention operations in PARALLEL, each with its OWN learned query, key, and value projections, then concatenates their outputs and mixes them with a final linear layer. Each head therefore gets its own notion of 'similar' - its own subspace to compare in - so one head can specialize in syntactic dependencies, another in coreference, another in positional adjacency. The critical design decision is that the per-head dimension is d_model/h rather than d_model, so h heads cost exactly the same compute and parameters as one full-width head. Multi-head attention is not more expensive than single-head attention; it is a REPARTITIONING of the same budget into several independent comparisons.",
        "Two clarifications worth having straight, because interviews probe them. First, heads are not made different by any explicit mechanism - there is no orthogonality penalty or diversity loss. They differ only because they start from different random initializations and gradient descent finds it useful to specialize; and empirically many heads end up redundant, which is why you can prune a large fraction of them with little loss. Second, the output projection W_O is not decoration: without it the concatenated head outputs would never interact, so each head's contribution would flow forward in its own fixed slice of the residual stream. W_O is what lets the model combine what the heads found."
      ],
      "math": [
        {
          "h": "Scaled dot-product attention, then h of them in parallel",
          "paras": [
            "Each head projects the input into its own query, key and value spaces, runs scaled dot-product attention there, and returns a d_k-dimensional vector per position. The h results are concatenated back to d_model and passed through W_O. Note where the parameters live: 4 matrices of size d_model x d_model in total (Q, K, V, O), independent of h - which is why head count is free."
          ],
          "tex": "\\mathrm{head}_i = \\mathrm{softmax}\\!\\left(\\frac{(XW_i^Q)(XW_i^K)^{\\top}}{\\sqrt{d_k}}\\right)(XW_i^V), \\qquad \\mathrm{MHA}(X) = \\big[\\mathrm{head}_1 \\Vert \\cdots \\Vert \\mathrm{head}_h\\big]\\,W^O",
          "texNote": "d_k = d_model/h is the per-head width. The sqrt(d_k) divisor keeps the dot products at unit-ish scale so softmax does not saturate. W_i^Q, W_i^K, W_i^V are d_model x d_k; W^O is d_model x d_model. Total parameters = 4*d_model^2, the SAME for any h."
        },
        {
          "h": "Why divide by sqrt(d_k)",
          "paras": [
            "If query and key components are independent with mean 0 and variance 1, their dot product over d_k dimensions has variance d_k, so its standard deviation grows as sqrt(d_k). Feeding logits of that scale into a softmax pushes it toward a one-hot distribution, where gradients vanish. Dividing by sqrt(d_k) restores unit variance and keeps the softmax in its responsive regime - this is a variance-control argument, not a heuristic."
          ],
          "tex": "q \\cdot k = \\sum_{j=1}^{d_k} q_j k_j, \\quad \\mathbb{E}[q\\cdot k] = 0, \\quad \\mathrm{Var}(q \\cdot k) = d_k \\;\\Rightarrow\\; \\mathrm{Var}\\!\\left(\\frac{q\\cdot k}{\\sqrt{d_k}}\\right) = 1",
          "texNote": "With d_k = 64, unscaled logits have sd 8, so differences of tens are common and softmax saturates. This is also why the trick is called SCALED dot-product attention, and why temperature-like scaling reappears wherever a softmax consumes inner products."
        }
      ],
      "code": [
        {
          "h": "Multi-head attention in one batched matmul per projection",
          "paras": [
            "The implementation detail that matters: you do NOT loop over heads. Project once to the full d_model, then RESHAPE to (batch, heads, seq, d_k) so the head axis rides along as a batch dimension. Every head is computed in the same matmul."
          ],
          "code": "import torch, torch.nn as nn, torch.nn.functional as F, math\n\nclass MultiHeadAttention(nn.Module):\n    def __init__(self, d_model=512, n_heads=8, dropout=0.0):\n        super().__init__()\n        assert d_model % n_heads == 0\n        self.h, self.d_k = n_heads, d_model // n_heads\n        self.qkv = nn.Linear(d_model, 3 * d_model, bias=False)   # fused Q,K,V projection\n        self.proj = nn.Linear(d_model, d_model, bias=False)      # W_O\n        self.drop = nn.Dropout(dropout)\n\n    def forward(self, x, mask=None):                             # x: (B, T, d_model)\n        B, T, D = x.shape\n        q, k, v = self.qkv(x).chunk(3, dim=-1)\n        # (B,T,D) -> (B, heads, T, d_k): the head axis becomes a batch dimension\n        q, k, v = [t.view(B, T, self.h, self.d_k).transpose(1, 2) for t in (q, k, v)]\n\n        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_k)    # (B, h, T, T)\n        if mask is not None:\n            att = att.masked_fill(mask == 0, float('-inf'))      # -inf BEFORE softmax\n        att = self.drop(att.softmax(dim=-1))\n        out = att @ v                                            # (B, h, T, d_k)\n        out = out.transpose(1, 2).contiguous().view(B, T, D)     # concat the heads\n        return self.proj(out)                                    # W_O mixes them\n\nmha = MultiHeadAttention(512, 8)\nprint(mha(torch.randn(2, 10, 512)).shape)                        # torch.Size([2, 10, 512])\nprint(f'{sum(p.numel() for p in mha.parameters()):,} params')    # 1,048,576 = 4 * 512^2",
          "caption": "The head axis is folded into the batch dimension, so h heads cost one matmul, not h. Parameter count is 4*d_model^2 regardless of head count - heads repartition the budget rather than adding to it."
        },
        {
          "h": "Head count is free; head width is the real knob",
          "paras": [
            "The measurement that makes the design click: sweep h at fixed d_model and the parameter count does not move at all. What changes is d_k - more heads means each compares in a narrower subspace, which is the actual trade-off being made."
          ],
          "code": "d_model = 512\nfor h in (1, 2, 4, 8, 16, 32, 64):\n    m = MultiHeadAttention(d_model, h)\n    print(f'h={h:2d}  d_k={d_model//h:3d}  params={sum(p.numel() for p in m.parameters()):,}')\n# h= 1  d_k=512  params=1,048,576\n# h= 8  d_k= 64  params=1,048,576      <- identical\n# h=64  d_k=  8  params=1,048,576      <- identical, but each head sees only 8 dims\n#\n# The trade-off: more heads = more distinct relationships representable, but each\n# head's subspace is narrower and its attention scores noisier. d_k = 64-128 is the\n# empirical sweet spot; GPT-3 uses d_k=128, most BERT-scale models d_k=64.",
          "caption": "Sweeping head count at fixed d_model: parameters are constant, only d_k shrinks. The real design decision is how narrow a subspace each head compares in - d_k around 64-128 is where nearly every production model lands."
        }
      ],
      "useCases": [
        "Every transformer, everywhere: encoder self-attention (BERT), decoder masked self-attention (GPT), and encoder-decoder cross-attention (translation, Whisper, diffusion text conditioning) are all the same multi-head operator with different masks and different sources for Q versus K/V.",
        "Interpretability research: individual heads have been shown to implement identifiable functions - induction heads that complete repeated patterns, previous-token heads, name-mover heads - which makes multi-head attention one of the few places where a network's computation decomposes into nameable parts.",
        "Head pruning for efficiency: many heads are redundant after training, so a large fraction can be removed with minimal accuracy loss - a standard compression technique and strong evidence that head specialization is emergent and uneven rather than uniform.",
        "Cross-modal fusion: any architecture that conditions one sequence on another (image-text, audio-text, retrieval-augmented generation) uses cross-attention, where queries come from one modality and keys/values from the other."
      ],
      "pitfalls": [
        "Assuming more heads always helps: heads share a fixed budget, so h=64 at d_model=512 gives each head only 8 dimensions to compare in - too narrow to represent a useful similarity. Keep d_k in the 64-128 range and change d_model if you need more capacity.",
        "Adding the mask AFTER softmax: masked positions must be set to -inf BEFORE the softmax so they receive exactly zero probability. Zeroing afterwards leaves the remaining weights un-normalized and silently corrupts training.",
        "Forgetting the output projection W_O: without it the concatenated heads never interact and each head writes into its own fixed slice of the residual stream. W_O is a required part of the operator, not an optional extra layer.",
        "Reading attention weights as explanations: attention is not attribution. Attention-weight maps can be altered without changing predictions, and information also flows through residual connections that attention maps do not show - use causal methods (patching, ablation) for claims about what the model uses.",
        "Confusing head count with sequence-length cost: attention memory and compute scale as O(T^2) in sequence length regardless of h. Changing head count does nothing for long-context cost - that needs FlashAttention, GQA (for the cache), or a different attention pattern."
      ],
      "connections": [
        {
          "ref": "transformers/self-attention",
          "text": "The flagship lesson derives single-head scaled dot-product attention in full; this one is the parallel-heads generalization built directly on it."
        },
        {
          "ref": "transformers/gqa-mqa",
          "text": "Grouped-query and multi-query attention keep multiple QUERY heads but share key/value heads - a direct modification of this operator driven entirely by KV-cache memory at inference."
        },
        {
          "ref": "transformers/flash-attention",
          "text": "FlashAttention computes exactly this operator without ever materializing the T x T matrix, which is what makes long contexts affordable."
        },
        {
          "ref": "trustworthy-ai/probing-patching",
          "text": "Activation patching on individual heads is how interpretability work establishes that a specific head causally implements a specific behaviour - beyond what attention weights alone can show."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is multi-head attention?",
          "a": "Running h attention operations in parallel, each with its own Q/K/V projections into a d_model/h subspace, then concatenating the outputs and mixing them with a learned output projection W_O."
        },
        {
          "q": "Why use multiple heads instead of one?",
          "a": "One softmax can express only one weighted average, so a single head must compress all relationships into one distribution. Multiple heads let different subspaces capture different relations (syntax, coreference, position) simultaneously."
        },
        {
          "q": "How many parameters does MHA have?",
          "a": "4*d_model^2 (W_Q, W_K, W_V, W_O), independent of head count - heads repartition the same budget rather than adding to it."
        },
        {
          "q": "What is d_k?",
          "a": "The per-head dimension, d_model/h. With d_model=512 and h=8, d_k=64. It is the width of the subspace each head compares in."
        },
        {
          "q": "Why divide by sqrt(d_k)?",
          "a": "Dot products over d_k dimensions have variance d_k, so logits grow as sqrt(d_k) and saturate the softmax (vanishing gradients). Dividing restores unit variance."
        },
        {
          "q": "What does the output projection W_O do?",
          "a": "Mixes the concatenated head outputs. Without it each head would write into its own fixed slice of the residual stream and never interact."
        },
        {
          "q": "How is the head axis implemented efficiently?",
          "a": "Reshape (B,T,d_model) to (B,h,T,d_k) so the head axis becomes a batch dimension - all heads are computed in one batched matmul, never a Python loop."
        },
        {
          "q": "What is the compute and memory cost?",
          "a": "O(T^2 * d) compute and O(T^2) attention-matrix memory per head-batch, plus O(T*d^2) for the projections. The T^2 term is what limits context length."
        },
        {
          "q": "How is causal masking applied?",
          "a": "Set the disallowed positions to -inf BEFORE the softmax so they get exactly zero weight. Masking after softmax leaves the distribution un-normalized."
        },
        {
          "q": "What makes heads different from each other?",
          "a": "Nothing explicit - only different random initializations plus gradient descent finding specialization useful. There is no diversity or orthogonality penalty, which is why many heads end up redundant."
        },
        {
          "q": "Can you prune attention heads?",
          "a": "Yes - a large fraction of heads can be removed after training with minimal accuracy loss, which shows specialization is emergent and uneven rather than uniformly distributed."
        },
        {
          "q": "What is cross-attention?",
          "a": "The same operator with queries from one sequence and keys/values from another - used in encoder-decoder models, multimodal fusion, and diffusion text conditioning."
        }
      ],
      "standard": [
        {
          "q": "Explain multi-head attention in full: what it computes, why multiple heads help, and how the parameter budget works.",
          "a": "WHAT IT COMPUTES. Start from single-head scaled dot-product attention: project the input X into queries Q = XW^Q, keys K = XW^K and values V = XW^V; compute scores QK^T scaled by 1/sqrt(d_k); softmax over the key axis to get attention weights; multiply by V. The result at each position is a weighted average of value vectors, with weights determined by query-key similarity. MULTI-HEAD attention runs h such operations in parallel, each with its OWN W_i^Q, W_i^K, W_i^V projecting into a d_k = d_model/h dimensional subspace. The h outputs (each d_k wide) are CONCATENATED back to d_model and passed through a final learned projection W^O. WHY MULTIPLE HEADS HELP. A single attention head produces exactly one softmax distribution per query position, which means one weighted average - so it can express one relationship. Consider 'the cat that the dog chased ran away': the token 'ran' needs its subject 'cat' (a long-range syntactic dependency) and also relates to 'chased' (the embedded clause verb). One head must trade these off inside a single distribution - putting more weight on 'cat' necessarily means less on 'chased'. With multiple heads, each has its own projections and therefore its OWN notion of similarity - its own subspace in which 'related' is defined - so one head can specialize in subject-verb dependencies while another tracks positional adjacency and another does coreference. Empirically this is observable: interpretability work has identified previous-token heads, induction heads that complete repeated sequences, and name-mover heads in specific models. THE PARAMETER BUDGET - the part people most often get wrong. Because each head projects to d_k = d_model/h rather than d_model, the h per-head matrices stack into exactly the same total as one full-width projection: h * (d_model x d_k) = d_model x d_model. So the layer has four d_model x d_model matrices (Q, K, V, O) for a total of 4*d_model^2 parameters, REGARDLESS of h. h=1 and h=64 have identical parameter counts and near-identical FLOPs. This is the crucial insight: multi-head attention is not a capacity increase, it is a REPARTITIONING of a fixed budget into several independent comparison subspaces. The cost of more heads is that each head's subspace gets narrower - at d_model=512, h=64 gives each head only 8 dimensions, which is too few to define a meaningful similarity and makes the attention scores noisy. That is why production models keep d_k in the 64-128 range (BERT-base: d_model=768, h=12, d_k=64; GPT-3: d_k=128) and scale h with d_model rather than independently. THE IMPLEMENTATION detail worth mentioning: you never loop over heads. Project once to 3*d_model with a fused QKV matrix, reshape to (batch, heads, seq, d_k) so the head axis becomes a batch dimension, and every head is computed in one batched matmul. THE ROLE OF W^O, which is easy to under-explain: after concatenation, each head's output occupies a distinct 64-dimensional slice of the vector. Without W^O, those slices would be written into the residual stream unchanged and never mixed, so heads could not combine their findings and later layers would see a fixed partition. W^O is a learned mixing of what the heads found, and in the interpretability framing it is what determines how each head 'writes' into the residual stream. COSTS: attention is O(T^2 * d_model) compute and O(h * T^2) attention-weight memory, versus O(T * d_model^2) for the projections. For short sequences the projections dominate; past T ~ d_model the quadratic term takes over, which is the entire long-context problem.",
          "deepDive": {
            "q": "Do heads actually specialize, and what happens if you prune them?",
            "a": "THE EVIDENCE THAT THEY SPECIALIZE. Interpretability research has identified heads with clearly nameable functions. Clark et al. (2019) analyzed BERT and found heads that attend almost exclusively to the next token, heads that attend to the previous token, heads that attend to the sentence-separator token, and heads whose attention aligns with specific syntactic dependency relations (direct objects to their verbs, determiners to their nouns) far better than chance. Olsson et al. (2022) identified INDUCTION HEADS in autoregressive models - a two-head circuit where a previous-token head writes information that lets a later head complete the pattern '[A][B] ... [A] -> [B]', which is the mechanism behind much of in-context learning, and whose formation coincides with a visible phase change in the training loss curve. Wang et al.'s IOI work traced a specific circuit for indirect-object identification through named head roles (duplicate-token heads, S-inhibition heads, name-mover heads). So specialization is real and, in some cases, causally verified rather than merely correlational. THE EVIDENCE THAT SPECIALIZATION IS UNEVEN - the pruning result. Michel, Levy and Neubig (2019), 'Are Sixteen Heads Really Better than One?', showed that at test time most heads can be removed individually with negligible performance change, and that many layers can be reduced to a SINGLE head with small degradation. Voita et al. (2019) found similar results for machine translation: a small subset of heads are 'important' (identifiable as positional, syntactic, or rare-token heads) and the rest can be pruned with minor loss. So the picture is: a minority of heads do identifiable, important work; the majority are redundant or weakly used. WHY REDUNDANCY ARISES. There is NO mechanism encouraging diversity - no orthogonality penalty, no diversity loss. Heads differ only because of random initialization and whatever specialization gradient descent finds useful. With more heads than the task needs, gradient descent has no pressure to make them distinct, so they duplicate. There is also a training-versus-inference asymmetry worth knowing: heads that are prunable at test time are not necessarily unnecessary DURING training - they may aid optimization (more parallel paths, a form of implicit ensembling) even if the trained model does not need them. That is a real caveat to 'just train with fewer heads'. WHAT THIS IMPLIES PRACTICALLY. (1) Head pruning is a legitimate compression technique, usually structured (remove whole heads, giving a genuinely smaller dense model and real speedups) and typically done with an importance score (gradient-based or ablation-based) plus fine-tuning. (2) Do not conclude 'use fewer heads from the start' - the evidence is that many heads help training even when they are removable afterwards, so the safer recipe is train wide, prune after. (3) It is a caution against over-reading head interpretations: if most heads are redundant, a story about what head 7 does may not describe a load-bearing part of the computation - which is exactly why ablation and activation patching (does removing it change the behaviour?) are required for causal claims, rather than attention-weight inspection alone. (4) It connects to the broader superposition picture: features are not neatly one-per-head, and the clean named-head examples are the exception that got isolated, not the typical case. THE HONEST SUMMARY for an interview: yes, heads demonstrably specialize, with induction heads the best-documented and most consequential example; but specialization is uneven and heavily redundant, most heads can be pruned at test time with little loss, and this both enables a compression technique and warrants caution about interpretability claims based on attention patterns alone."
          }
        },
        {
          "q": "Why is attention scaled by 1/sqrt(d_k)? What happens without it?",
          "a": "THE VARIANCE ARGUMENT. Suppose query and key components are approximately independent with mean 0 and variance 1 (which is roughly what standard initialization plus layer normalization gives you). Their dot product is a sum of d_k such products, so it has mean 0 and VARIANCE d_k - meaning a standard deviation of sqrt(d_k). With d_k = 64, the raw logits have standard deviation 8, so differences of 20-30 between the largest and typical logits are common. WHAT THAT DOES TO SOFTMAX. Softmax of logits separated by tens is effectively a hard argmax: one weight near 1, the rest near 0. Two things break. (1) GRADIENTS VANISH. The Jacobian of softmax is diag(p) - pp^T, whose entries all go to zero as p approaches one-hot - so almost no gradient flows back to the queries and keys, and the attention pattern stops being learnable. Early in training, when the model has no idea which tokens matter, being locked into near-deterministic attention is fatal. (2) THE MODEL LOSES THE ABILITY TO BLEND. Attention's value is in producing a weighted AVERAGE over several tokens; a saturated softmax reduces it to a hard lookup, discarding the soft-combination capability entirely. THE FIX: dividing by sqrt(d_k) rescales the logits to unit variance regardless of head width, keeping the softmax in the regime where it produces meaningful distributions and useful gradients. Notice the fix must be sqrt(d_k) specifically - the standard deviation, not the variance - and it must scale with the PER-HEAD dimension, not d_model, which is a detail people get wrong when they change head counts. WHAT HAPPENS WITHOUT IT, empirically: training is slow or fails to converge; attention entropy collapses immediately; and the effect worsens as d_k grows, which is exactly why the original Transformer paper introduced the scaling when moving to larger models (their footnote makes the variance argument explicitly). You can partially compensate with a much smaller initialization for W^Q and W^K, which is really the same fix applied at a different place - what matters is the SCALE of the logits entering the softmax, however you control it. RELATED PLACES THE SAME ISSUE APPEARS, which shows you understand the general principle rather than a memorized fact: (a) contrastive learning with cosine similarities needs a TEMPERATURE (tau ~ 0.07 in CLIP/SimCLR) because cosine logits live in [-1, 1] and give an almost uniform softmax - the same problem in the opposite direction, logits too SMALL rather than too large; (b) knowledge distillation uses a temperature to soften teacher logits and expose inter-class structure; (c) muP and other scaling-law-aware initialization schemes generalize this reasoning to every layer, prescribing how initialization and learning rates should scale with width so activations stay well-conditioned. THE GENERAL PRINCIPLE to state: whenever a softmax consumes inner products, you must control the scale of those inner products, because softmax is only informative over a limited logit range - too large and it saturates to argmax with vanishing gradients, too small and it flattens to uniform and carries no signal. 1/sqrt(d_k) is the specific instance of that principle for dot-product attention.",
          "deepDive": {
            "q": "Attention entropy sometimes collapses during training even with the sqrt(d_k) scaling. Why, and what fixes it?",
            "a": "THE PHENOMENON, called entropy collapse or attention collapse: partway through training, some heads' attention distributions become extremely peaked - all mass on one token, often a special token like BOS or a punctuation mark - and stay that way. The head stops contributing anything useful, and in bad cases the loss spikes or training diverges. This has been documented as a real instability in large-model training, notably in Google's work on training stability and in analyses of ViT and large language model training. WHY IT HAPPENS DESPITE THE SCALING. The sqrt(d_k) factor fixes the scale of logits AT INITIALIZATION, under the assumption that q and k components have unit variance. But nothing keeps that true during training: gradient descent can grow the norms of W^Q and W^K, which grows ||q|| and ||k||, which grows the logits multiplicatively - the scaling constant does not adapt. There is a positive feedback loop: a slightly peaked attention pattern that happens to be useful gets reinforced, its logits grow, it becomes more peaked, gradients through the softmax shrink so the pattern cannot be revised, and the head freezes. Because the softmax gradient vanishes exactly in the saturated regime, the collapse is self-locking - the head cannot easily escape once there. THE FIXES, roughly in order of how commonly they are used. (1) QK-LAYERNORM (or QK-RMSNorm) - apply a normalization to the queries and keys BEFORE computing the dot product. This bounds ||q|| and ||k|| so the logits cannot grow without limit no matter what the weights do; it is the most direct fix and has been adopted in several large-model training recipes (Gemma and others) specifically for stability. (2) sigma-REPARAM or explicit spectral control - constrain or penalize the spectral norm of the attention weight matrices, attacking the same growth from the weight side; the sigma-Reparam paper showed this prevents entropy collapse and improves stability across transformer variants. (3) ATTENTION LOGIT SOFT-CAPPING - pass logits through a bounded function like c * tanh(logit / c) so they can never exceed a cap. Gemma-2 used this; it is crude but effective, though it interacts awkwardly with FlashAttention kernels that assume a plain softmax. (4) STANDARD STABILITY MEASURES that help indirectly: careful learning-rate warmup (the original transformer's warmup exists in part for this reason - large early updates are what kick the logits into the saturated regime), gradient clipping, and pre-norm rather than post-norm placement. (5) ENTROPY REGULARIZATION - explicitly penalize very low attention entropy. Conceptually direct but rarely used in practice because it adds a hyperparameter and the normalization-based fixes are cleaner. HOW TO DIAGNOSE IT, which is the practical part: log the mean attention ENTROPY per layer and per head during training. Healthy heads show entropy that decreases gradually as the model learns what to attend to and then plateaus; collapsing heads show entropy dropping to near zero and staying pinned, often coinciding with a loss spike. Also log the maximum attention logit magnitude - if it is climbing into the tens or hundreds, you are heading for saturation. Both are cheap to log and are standard instrumentation in large-scale training runs. THE BROADER LESSON worth stating: a fix that is correct at initialization is not automatically correct throughout training, because training changes the very statistics the fix assumed. That pattern recurs - BatchNorm's running statistics drifting, initialization schemes that stop holding after weight growth, learning rates tuned at one scale failing at another - and the robust solutions are usually ones that NORMALIZE at every step (QK-LayerNorm) rather than ones that set a constant once (1/sqrt(d_k))."
          }
        },
        {
          "q": "Walk through the shapes and computational cost of multi-head attention for a realistic configuration.",
          "a": "Take GPT-2 medium-ish numbers: batch B=8, sequence length T=1024, d_model=1024, h=16, so d_k=64. SHAPES, step by step. Input X: (8, 1024, 1024). Fused QKV projection (one matmul against a 1024 x 3072 matrix): (8, 1024, 3072), split into Q, K, V each (8, 1024, 1024). Reshape each to (8, 1024, 16, 64) then transpose to (8, 16, 1024, 64) - batch, heads, sequence, head-dim - so the head axis rides as a batch dimension. Scores Q @ K^T: (8, 16, 1024, 1024) - this is the attention matrix, and it is the memory problem. Softmax over the last axis, then @ V: (8, 16, 1024, 64). Transpose and reshape back to (8, 1024, 1024), then W^O: (8, 1024, 1024). COMPUTE, in multiply-accumulates per forward pass. Projections: Q, K, V and O are each B*T*d_model^2 = 8 * 1024 * 1024^2 ~ 8.6 GMACs, so ~34 GMACs for all four. Attention scores: B*h*T^2*d_k = 8*16*1024^2*64 ~ 8.6 GMACs. Attention-weighted values: same again, ~8.6 GMACs. Total ~51 GMACs, of which the projections are ~67% and the quadratic attention part ~33%. THE CROSSOVER, which is the number worth remembering: projections cost O(T * d^2) and attention costs O(T^2 * d), so attention dominates once T > d_model. At T=1024, d=1024 they are comparable; at T=8192 with the same d, attention is ~8x the projection cost. This is why 'attention is quadratic' matters at long context and is nearly irrelevant at short context - and why quoting the quadratic complexity without the crossover point is a shallow answer. MEMORY, which is usually the binding constraint. The attention matrix alone is B*h*T*T = 8*16*1024*1024 = 134M values = 268 MB in fp16 - for ONE layer. In a naive implementation you must keep it for the backward pass, so a 24-layer model would need ~6.4 GB just for attention matrices. This is exactly the problem FlashAttention solves: by computing attention in tiles and recomputing it in the backward pass, it never materializes the T x T matrix, cutting memory from O(T^2) to O(T) and, because attention is memory-bandwidth-bound, also making it several times FASTER. Activations elsewhere (the QKV and MLP intermediates) are O(T*d) per layer and are comparatively modest. WHAT SCALES WITH WHAT - the summary I would give. Head count h: no effect on parameters, no effect on FLOPs, only changes d_k (the subspace width). Sequence length T: linear in projections, QUADRATIC in attention compute and memory. Model width d_model: quadratic in projections, linear in the attention term. Batch B: linear in everything. This table is what lets you answer capacity-planning questions - 'we want to go from 2K to 32K context, what breaks?' - with 'the attention term grows 256x while the projections grow 16x, so we move from projection-dominated to attention-dominated and need FlashAttention plus a KV-cache strategy', which is a much better answer than 'attention is quadratic'. ONE INFERENCE-SPECIFIC NOTE: at generation time with a KV cache, each new token computes attention against T cached keys/values, so per-token attention cost is O(T*d) rather than O(T^2*d), and the bottleneck shifts to READING the cache - which is memory bandwidth, and is exactly why MQA/GQA (which shrink the cache) speed up decoding even though they do not reduce FLOPs much."
        },
        {
          "q": "How does multi-head attention differ across encoder self-attention, decoder masked self-attention, and cross-attention?",
          "a": "All three use the identical operator; what differs is WHERE Q, K and V come from and WHAT MASK is applied. That framing - one operator, three configurations - is the clean way to present it. (1) ENCODER SELF-ATTENTION (BERT, ViT, the encoder half of a translation model). Q, K, V all come from the SAME sequence - the encoder's own hidden states. NO causal mask, so every position attends to every other position, both left and right. This is what makes encoder representations BIDIRECTIONAL, which is exactly right for understanding tasks (classification, NER, retrieval embeddings) where the whole input is available at once. The only masking is a PADDING mask, which zeroes attention to padded positions so variable-length sequences batch correctly. (2) DECODER MASKED (CAUSAL) SELF-ATTENTION (GPT, and the decoder half of an encoder-decoder). Q, K, V again come from the same sequence, but a CAUSAL MASK sets all positions j > i to -inf for query i, so position i attends only to positions <= i. This is what makes autoregressive generation possible: during training you feed the whole target sequence at once and, because of the mask, each position's prediction depends only on earlier tokens - so you get T training signals from one forward pass (teacher forcing) while preserving the left-to-right factorization needed at inference. Without the mask the model would trivially cheat by looking at the token it is asked to predict. (3) CROSS-ATTENTION (encoder-decoder translation, Whisper, Flamingo-style multimodal, Stable Diffusion's text conditioning). Q comes from the DECODER's hidden states; K and V come from the ENCODER's output. So each decoder position queries the source sequence and pulls in relevant source information. No causal mask is needed on the source axis - the entire source is available - though the source padding mask still applies. This is the mechanism by which conditioning actually happens: in Stable Diffusion, the image latents attend to CLIP text embeddings through cross-attention layers, which is why prompt tokens can steer generation and why cross-attention maps are used for editing techniques like prompt-to-prompt. FOUR PRACTICAL CONSEQUENCES worth mentioning. (a) SHAPE ASYMMETRY: in cross-attention the attention matrix is T_target x T_source rather than square, so K and V have the source length while Q has the target length - a common source of shape bugs. (b) KV CACHING DIFFERS: in decoder self-attention the cache grows with each generated token; in cross-attention the encoder output is FIXED for the whole generation, so its K and V are computed once and reused - a significant and easy optimization. (c) MASK BOOKKEEPING is where most transformer bugs live: causal masks, padding masks, and their combination must be broadcast correctly across the (B, h, T_q, T_k) tensor, and an off-by-one in the causal mask (allowing position i to see i+1) leaks the label and produces suspiciously good validation loss - the transformer equivalent of the forecasting-leakage bug. (d) PREFIX-LM / T5-style models use a hybrid mask - bidirectional over the prompt, causal over the continuation - showing that the mask is a free design choice rather than a property of the architecture. THE MODERN CONTEXT: decoder-only models (GPT-style) largely won, so most current LLMs use only causal self-attention, feeding the 'source' in as a prefix rather than through a separate encoder and cross-attention. Cross-attention remains dominant for genuinely multimodal conditioning (diffusion, speech-to-text) where the conditioning signal lives in a different space than the generated sequence and should not be tokenized into the same stream."
        },
        {
          "q": "Attention weights are often shown as explanations of model behaviour. Is that valid?",
          "a": "Largely NO, and the reasoning is worth knowing precisely because attention visualizations are so intuitively appealing and so widely misused. THE CASE AGAINST 'ATTENTION IS EXPLANATION'. (1) ATTENTION WEIGHTS ARE NOT UNIQUE. Jain and Wallace (2019), 'Attention is not Explanation', showed you can often find ALTERNATIVE attention distributions - very different from the learned one - that produce the SAME model output. If several attention patterns yield identical predictions, no single pattern can be THE explanation. They also found attention weights correlate only weakly with gradient-based feature-importance measures, which is a bad sign for either method being straightforwardly faithful. (2) INFORMATION FLOWS AROUND ATTENTION. The residual stream carries information past every attention layer untouched. A token's representation at layer L already contains contributions from earlier layers, so a head attending to token j is not only receiving 'token j's meaning' - it receives whatever has been written into position j's residual stream by all previous computation. This is exactly why raw last-layer attention can put near-zero weight on the token that actually determined the output: the information had already moved. Attention ROLLOUT (multiplying attention matrices across layers, accounting for residuals) partially addresses this and measurably outperforms raw attention, but is still correlational. (3) ATTENTION IS ONE STEP OF MANY. The value vectors, the output projection W^O, the MLP layers, and layer norms all transform what attention retrieves. High attention weight on a token whose value vector contributes little to the output is not evidence of influence. (4) THE MULTI-HEAD PROBLEM. With hundreds of heads across layers, any narrative can be supported by selecting a head - a multiple-comparisons problem that visualization tools make easy to fall into. THE PARTIAL DEFENCE. Wiegreffe and Pinter (2019), 'Attention is not not Explanation', pushed back: the adversarial distributions Jain and Wallace found were constructed with knowledge of the model and were not necessarily achievable by training; attention weights do carry real information; and whether attention is an 'explanation' depends on what you want an explanation FOR. Attention is genuinely useful as a DIAGNOSTIC and as a hypothesis generator - if a head consistently attends from verbs to their subjects, that is a lead worth testing. WHAT TO DO INSTEAD, when you need a causal claim. (a) ABLATION - zero or mean-ablate a head and measure the behavioural change. If removing it does not change the output, it was not load-bearing. (b) ACTIVATION PATCHING / interchange interventions - run the model on a clean and a corrupted input, copy a specific activation from one run into the other, and measure recovery. This is a do-operation inside the network and gives genuinely causal evidence about which components carry which information. (c) INTEGRATED GRADIENTS or Shapley values for input attribution, with sanity checks (Adebayo-style model randomization) to confirm the attribution tracks the model rather than just the input. (d) PROBING with CONTROL TASKS - and note that a probe's ability to decode information does not show the model USES it, which is why probe selectivity (Hewitt and Liang) matters. THE STATEMENT I WOULD MAKE IN AN INTERVIEW: attention weights show what a head READ, not what the model USED - and because information also flows through residual connections and is transformed by everything downstream, reading is a poor proxy for use. Attention maps are a legitimate diagnostic and hypothesis generator, and they are evidence of nothing on their own; causal claims require intervention (ablation or patching), which is precisely the methodology mechanistic interpretability adopted after this debate."
        },
        {
          "q": "How would you choose the number of heads and d_model for a new model?",
          "a": "The decision decomposes into three questions, and the key structural fact is that head count and model width are NOT independent knobs - d_k = d_model/h ties them together. STEP 1 - CHOOSE d_model FROM YOUR COMPUTE AND DATA BUDGET, not from intuition. d_model is the real capacity knob: parameters scale as roughly 12 * n_layers * d_model^2 for a standard transformer, and it interacts with depth. Use the established scaling guidance rather than guessing - Kaplan et al. and then Chinchilla (Hoffmann et al.) give the relationship between parameters, training tokens and loss, with Chinchilla's headline result being roughly 20 tokens per parameter for compute-optimal training. Also follow the empirical aspect-ratio convention: d_model/n_layers around 100-150 for models in the common range (GPT-3 175B: d_model 12288, 96 layers, ratio 128). Very deep-and-thin or shallow-and-wide models underperform at matched parameters. STEP 2 - CHOOSE h SO THAT d_k LANDS IN 64-128. This is the operative rule. Look at what production models do: BERT-base d_model 768, h 12, d_k 64; BERT-large 1024/16/64; GPT-3 12288/96/128; LLaMA-2 70B 8192/64/128. Essentially everything sits at d_k = 64 or 128, and that consistency across a decade and many labs is strong evidence. The reasoning: too FEW heads (large d_k) means fewer distinct relationships can be represented simultaneously; too MANY heads (small d_k) means each head compares in a subspace too narrow to define a useful similarity, and the attention scores become noisy. So in practice you fix d_model from the budget and then set h = d_model/64 or d_model/128. STEP 3 - CHECK HARDWARE ALIGNMENT, which is a real constraint people forget. d_k should be a multiple of 8 (ideally 64) for tensor-core efficiency and for FlashAttention kernel support - some kernels only support specific head dimensions (commonly 64, 128, sometimes up to 256). d_model should be a multiple of 64 or 128, and if using tensor parallelism, h must be divisible by the tensor-parallel degree so heads can be split across devices without remainder. A configuration that is a few percent 'better' on paper but falls off the optimized kernel path is a bad trade. STEP 4 - CONSIDER THE INFERENCE STORY SEPARATELY. If the model will serve long-context generation, the KV cache is 2 * n_layers * n_kv_heads * d_k * T * batch * bytes, and it frequently exceeds the weights in memory. This is why modern models decouple query heads from KV heads: use h query heads for quality but only n_kv groups (GQA) for the cache - LLaMA-2 70B uses 64 query heads with 8 KV groups, an 8x cache reduction. So the modern version of 'how many heads' is really two numbers, and the second one is chosen from serving economics rather than quality. WHAT I WOULD ACTUALLY DO for a new model: pick d_model and n_layers from the compute budget using Chinchilla-style guidance and the aspect-ratio convention; set h = d_model/128 (or /64 for smaller models); set n_kv_heads to 8 or d_model/1024-ish if long-context serving matters; verify every dimension is hardware-friendly and kernel-supported; and then NOT tune these further, because the empirical evidence is that head count has a broad flat optimum while d_model, depth, and data quantity are where the gains actually are. If pressed to justify not tuning h: the pruning literature shows most heads are redundant anyway, so head count is not where the marginal return lives."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Multi-head attention",
        "back": "h parallel attention operations, each with its own Q/K/V projections into a d_model/h subspace; outputs concatenated and mixed by W_O. Each head gets its own notion of 'similar'."
      },
      {
        "type": "formula",
        "front": "MHA parameter count",
        "back": "4 * d_model^2 (W_Q, W_K, W_V, W_O) - INDEPENDENT of head count. Heads repartition a fixed budget; d_k = d_model/h is what actually changes."
      },
      {
        "type": "formula",
        "front": "Why 1/sqrt(d_k)",
        "back": "Dot products over d_k dims have variance d_k, so logits have sd sqrt(d_k) and saturate softmax (vanishing gradients). Dividing restores unit variance. Same principle as contrastive learning's temperature."
      },
      {
        "type": "intuition",
        "front": "Why more than one head",
        "back": "One softmax = one weighted average = one relationship. 'ran' needs its subject AND its clause verb; a single head must trade them off inside one distribution. Heads give parallel, independent comparisons."
      },
      {
        "type": "definition",
        "front": "The role of W_O",
        "back": "Mixes the concatenated head outputs. Without it, each head writes into its own fixed slice of the residual stream and heads never interact - it is part of the operator, not an extra layer."
      },
      {
        "type": "formula",
        "front": "Attention cost crossover",
        "back": "Projections O(T*d^2), attention O(T^2*d). Attention dominates once T > d_model. At T=1024,d=1024 they are comparable; at T=8192 attention is ~8x. Head count affects NEITHER."
      },
      {
        "type": "pitfall",
        "front": "Head count is not a capacity knob",
        "back": "h=1 and h=64 have identical params and FLOPs. More heads = narrower d_k. Keep d_k at 64-128 (BERT 64, GPT-3 128, LLaMA-2 128) and change d_model for capacity."
      },
      {
        "type": "pitfall",
        "front": "Mask BEFORE softmax",
        "back": "Set disallowed positions to -inf before the softmax so they get exactly zero weight. Zeroing after softmax leaves the distribution un-normalized. Off-by-one in a causal mask = label leakage."
      },
      {
        "type": "intuition",
        "front": "Heads specialize but redundantly",
        "back": "Induction heads, previous-token heads, name-mover heads are real and causally verified. But most heads prune away with little loss (Michel 2019) - specialization is emergent, uneven, and heavily duplicated."
      },
      {
        "type": "pitfall",
        "front": "Attention is not explanation",
        "back": "Different attention distributions can give identical outputs (Jain & Wallace), and information flows through residuals that attention maps do not show. Attention shows what a head READ, not what the model USED - use ablation/patching for causal claims."
      }
    ],
    "refs": [
      {
        "title": "Vaswani et al. (2017), Attention Is All You Need",
        "url": "https://arxiv.org/abs/1706.03762"
      },
      {
        "title": "Michel, Levy & Neubig (2019), Are Sixteen Heads Really Better than One?",
        "url": "https://arxiv.org/abs/1905.10650"
      },
      {
        "title": "Elhage et al. (2021), A Mathematical Framework for Transformer Circuits",
        "url": "https://transformer-circuits.pub/2021/framework/index.html"
      },
      {
        "title": "Jain & Wallace (2019), Attention is not Explanation",
        "url": "https://arxiv.org/abs/1902.10186"
      }
    ],
    "demos": [
      "multi-head-attention",
      "attention",
      "attention-rollout"
    ],
    "demoTitles": {
      "multi-head-attention": "Multi-Head Attention",
      "attention": "Attention Heatmap",
      "attention-rollout": "Attention Rollout"
    }
  }
};
