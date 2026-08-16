// GENERATED from content/lessons/transformers/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "transformers". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
    ]
  },
  "positional-encoding": {
    "level": "core",
    "body": {
      "intuition": [
        "Self-attention has a property that is easy to state and easy to underestimate: it is PERMUTATION EQUIVARIANT. Shuffle the input tokens and the outputs shuffle identically - the operation computes a weighted average over a SET, with no notion of order anywhere in it. There is no recurrence tracking time and no convolution defining adjacency. So 'the dog bit the man' and 'the man bit the dog' produce, before any positional information is added, exactly the same bag of representations. For language, code, audio, or any sequence, that is fatal. Positional encoding is the machinery that puts order back in.",
        "The original Transformer's answer was to ADD a fixed sinusoidal vector to each token embedding. Each dimension of that vector is a sine or cosine at a different frequency, so position is written as a multi-scale binary-like code: fast-varying dimensions distinguish neighbours, slow-varying ones distinguish distant regions. Two properties motivated the choice. It needs no parameters and is defined for any position, so in principle a model can be run on sequences longer than it saw in training. And because of the angle-addition identities, the encoding of position p+k is a fixed LINEAR function of the encoding of p - which means relative offsets are, at least in principle, learnable by a linear projection.",
        "The alternative is to LEARN an embedding per position, exactly like a token embedding table. That is what BERT and GPT-2 do, it works slightly better in-distribution, and it has one hard limitation: position 1025 has no embedding if you only trained 1024 of them, so the context length is fixed by construction. The modern picture has moved past both. Absolute encodings added at the input are a poor fit for attention, which fundamentally cares about the RELATIVE offset between a query and a key - and so the field converged on relative schemes injected inside attention itself: T5's learned relative bias, ALiBi's linear distance penalty, and above all RoPE, which rotates queries and keys so their dot product depends only on the difference of positions. Understanding sinusoidal and learned encodings is what makes the reason for that shift legible."
      ],
      "math": [
        {
          "h": "Sinusoidal encoding: a multi-scale clock",
          "paras": [
            "Dimension pair (2i, 2i+1) of the encoding oscillates at wavelength 10000^(2i/d), so wavelengths run from about 2*pi (fastest, distinguishing adjacent tokens) up to 10000*2*pi (slowest, distinguishing coarse regions). The vector is ADDED to the token embedding, not concatenated - which relies on the model learning to separate the two signals within the same d_model dimensions."
          ],
          "tex": "PE_{(p,\\,2i)} = \\sin\\!\\left(\\frac{p}{10000^{2i/d}}\\right), \\qquad PE_{(p,\\,2i+1)} = \\cos\\!\\left(\\frac{p}{10000^{2i/d}}\\right)",
          "texNote": "p = position, i indexes dimension pairs, d = d_model. Low i = high frequency = fine-grained position; high i = low frequency = coarse position. The base 10000 sets the longest wavelength and is the same constant RoPE later inherits (and that context-extension methods rescale)."
        },
        {
          "h": "The relative-offset property, and why it is weaker than it looks",
          "paras": [
            "By the angle-addition formulas, shifting position by k rotates each frequency pair by a FIXED angle depending only on k - so PE(p+k) = M_k PE(p) for a matrix M_k independent of p. That is the sense in which sinusoids encode relative position. The catch: attention computes a dot product between projected q and k, and this linear relation does NOT make the resulting score a function of (p - p') alone, so relative position is available in principle but must be learned rather than being structurally guaranteed."
          ],
          "tex": "\\begin{bmatrix}\\sin(\\omega_i (p+k))\\\\ \\cos(\\omega_i (p+k))\\end{bmatrix} = \\begin{bmatrix}\\cos(\\omega_i k) & \\sin(\\omega_i k)\\\\ -\\sin(\\omega_i k) & \\cos(\\omega_i k)\\end{bmatrix}\\begin{bmatrix}\\sin(\\omega_i p)\\\\ \\cos(\\omega_i p)\\end{bmatrix}",
          "texNote": "omega_i = 1/10000^(2i/d). The matrix is a ROTATION by omega_i * k - the same rotation RoPE applies directly to q and k, which is exactly why RoPE gets a genuine relative-position guarantee that additive sinusoids only gesture at."
        }
      ],
      "code": [
        {
          "h": "Both encodings, and the property that distinguishes them",
          "paras": [
            "Sinusoidal is a buffer computed once; learned is an nn.Embedding indexed by position. The important difference is not accuracy - it is that the learned table has a hard maximum position, while the sinusoidal formula is defined for any p."
          ],
          "code": "import torch, torch.nn as nn, math\n\nclass SinusoidalPE(nn.Module):\n    def __init__(self, d_model, max_len=5000):\n        super().__init__()\n        pe = torch.zeros(max_len, d_model)\n        pos = torch.arange(max_len).unsqueeze(1).float()\n        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))\n        pe[:, 0::2], pe[:, 1::2] = torch.sin(pos * div), torch.cos(pos * div)\n        self.register_buffer('pe', pe)                # a BUFFER: no parameters, saved with the model\n    def forward(self, x):                             # x: (B, T, d_model)\n        return x + self.pe[:x.size(1)]                # ADDED, not concatenated\n\nclass LearnedPE(nn.Module):\n    def __init__(self, d_model, max_len=512):\n        super().__init__()\n        self.pe = nn.Embedding(max_len, d_model)      # d_model * max_len PARAMETERS\n        self.max_len = max_len\n    def forward(self, x):\n        T = x.size(1)\n        assert T <= self.max_len, f'position {T} > trained max {self.max_len}'   # HARD limit\n        return x + self.pe(torch.arange(T, device=x.device))\n\nsin_pe, learn_pe = SinusoidalPE(512), LearnedPE(512, max_len=512)\nprint('sinusoidal params:', sum(p.numel() for p in sin_pe.parameters()))      # 0\nprint('learned params   :', sum(p.numel() for p in learn_pe.parameters()))    # 262,144\nprint(sin_pe(torch.randn(1, 4096, 512)).shape)   # works at 4096 - defined for any position\n# learn_pe(torch.randn(1, 4096, 512))            # AssertionError: no embedding for pos >= 512",
          "caption": "Sinusoidal costs zero parameters and is defined at any position; the learned table costs d_model*max_len parameters and hard-fails past its trained length. That extrapolation asymmetry is the whole practical difference."
        },
        {
          "h": "Testing the claim that sinusoids extrapolate",
          "paras": [
            "The formula extends to any position, but that is not the same as the MODEL working there. The honest measurement is perplexity beyond the training length - and it degrades badly, which is the empirical result that motivated ALiBi and RoPE-scaling. Distinguish 'defined at position p' from 'trained on the attention patterns that occur at position p'."
          ],
          "code": "# same 512-context model, evaluated at increasing lengths (representative numbers):\n#   eval length   sinusoidal PPL   learned PPL   ALiBi PPL\n#      512            18.2            17.9         18.4      <- training length\n#     1024            31.7           (crash)       19.1\n#     2048            96.4           (crash)       20.3\n#     4096           412.8           (crash)       22.6\n#\n# Sinusoidal DOESN'T crash but degrades sharply: the encoding is defined, yet the\n# model never learned attention patterns for those offsets. ALiBi degrades gently\n# because its distance penalty is a monotone function of offset that keeps working.\n\ndef pe_similarity(pe, p, q):\n    \"\"\"Cosine similarity between two positions' encodings - the model's 'sense' of distance.\"\"\"\n    return torch.cosine_similarity(pe.pe[p], pe.pe[q], dim=0).item()\n\nfor gap in (1, 5, 20, 100, 500):\n    print(f'gap {gap:3d}: cos = {pe_similarity(sin_pe, 100, 100 + gap):+.3f}')\n# gap   1: cos = +0.999   gap  20: cos = +0.771   gap 500: cos = +0.166\n# Similarity decays with distance (good) but NOT monotonically at all scales -\n# sinusoids interfere, which is one reason learned relative schemes do better.",
          "caption": "Extrapolation measured rather than assumed: sinusoidal encodings are defined beyond the training length but perplexity still explodes, because the model never learned those attention patterns. ALiBi's monotone distance penalty is what actually extrapolates."
        }
      ],
      "useCases": [
        "Any transformer over ordered data - text, code, audio frames, time series, video frames - since without positional information attention treats the input as an unordered set and cannot distinguish 'dog bites man' from 'man bites dog'.",
        "Vision transformers: patches need 2D position, usually via learned embeddings interpolated when the input resolution changes at fine-tuning time - the standard trick that lets a ViT pretrained at 224px run at 384px.",
        "Non-sequence uses of the same trick: diffusion models encode the TIMESTEP with the identical sinusoidal formula, and NeRF-style models use 'positional encoding' of coordinates to let an MLP represent high-frequency detail - the same idea of mapping a scalar into a multi-frequency vector.",
        "Understanding modern long-context work: every context-extension method (position interpolation, NTK-aware scaling, YaRN) is a modification of a positional scheme, so the sinusoidal base and wavelength story is the prerequisite for reading any of that literature."
      ],
      "pitfalls": [
        "Assuming sinusoidal encodings give real length extrapolation: the formula is defined for any position, but perplexity still degrades sharply past the training length because the model never learned attention patterns at those offsets. Defined is not the same as trained.",
        "Forgetting that learned position embeddings hard-cap context: position max_len has no embedding, so the model cannot run longer - and naive interpolation of the table is a fine-tuning operation, not a free extension.",
        "Adding positional encodings to a model that already has RoPE or ALiBi: modern models inject position INSIDE attention, so also adding an absolute encoding at the input is redundant at best and harmful at worst.",
        "Ignoring that adding (rather than concatenating) forces token and position information to share the same d_model dimensions - it works because the model learns to separate them, but it is a real design compromise, and it is why the positional signal can be attenuated in deeper layers.",
        "Overlooking that padding and left-truncation shift positions: if you left-pad a batch, every real token's position index changes, which silently changes the encoding it receives. Use attention masks plus correct position ids, and check them explicitly."
      ],
      "connections": [
        {
          "ref": "transformers/rope",
          "text": "RoPE applies exactly the rotation matrix that appears in the sinusoidal shift identity, but to the queries and keys directly - which converts a suggestive property into a structural guarantee that scores depend only on relative offset."
        },
        {
          "ref": "transformers/self-attention",
          "text": "Permutation equivariance is a property of the attention operator itself; this lesson is the fix for the specific limitation that operator has."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Position interpolation, NTK-aware scaling, and YaRN all extend context by rescaling a positional scheme - the base-10000 wavelength story here is what they manipulate."
        },
        {
          "ref": "generative/ddpm",
          "text": "Diffusion models embed the denoising timestep with the identical sinusoidal construction, which is a nice reminder that this is a general scalar-to-vector encoding, not a language-specific trick."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why do transformers need positional encoding?",
          "a": "Self-attention is permutation equivariant - it computes a weighted average over a SET. Without positional information, 'dog bites man' and 'man bites dog' give identical representations."
        },
        {
          "q": "What is sinusoidal positional encoding?",
          "a": "A fixed vector per position whose dimension pairs are sine/cosine at geometrically spaced wavelengths (10000^(2i/d)), added to the token embedding. Zero parameters, defined at any position."
        },
        {
          "q": "Why sines and cosines at different frequencies?",
          "a": "It writes position as a multi-scale code: fast dimensions distinguish neighbours, slow dimensions distinguish distant regions - like a binary counter with continuous digits."
        },
        {
          "q": "What is the relative-offset property?",
          "a": "PE(p+k) = M_k PE(p) where M_k is a rotation depending only on k, not p - so relative offsets are a linear function of the encoding, at least in principle."
        },
        {
          "q": "Learned positional embeddings - what are they?",
          "a": "An nn.Embedding table indexed by position, trained like token embeddings (BERT, GPT-2). d_model * max_len parameters, and a hard maximum context length."
        },
        {
          "q": "Which performs better in-distribution?",
          "a": "Learned is usually marginally better within the trained length; the original Transformer paper reported nearly identical results and chose sinusoidal for its extrapolation potential."
        },
        {
          "q": "Do sinusoidal encodings really extrapolate?",
          "a": "The formula does; the model largely does not. Perplexity degrades sharply beyond the training length because the model never learned attention patterns at those offsets."
        },
        {
          "q": "Why add rather than concatenate?",
          "a": "Concatenation would spend dimensions permanently on position; addition keeps d_model fixed and lets the model learn to separate the two signals. It is a compromise that works empirically."
        },
        {
          "q": "What is ALiBi?",
          "a": "Attention with Linear Biases: add a per-head penalty -m*|i-j| to attention scores instead of any positional embedding. Extrapolates gently to longer contexts than it trained on."
        },
        {
          "q": "What is T5's relative position bias?",
          "a": "A learned scalar bias added to attention logits, indexed by BUCKETED relative distance (fine buckets near, log-spaced far), shared across layers."
        },
        {
          "q": "Why did the field move to relative schemes?",
          "a": "Attention fundamentally compares a query to a key, and what matters is their OFFSET. Absolute encodings added at the input make the model infer offsets; relative schemes give them structurally."
        },
        {
          "q": "How do ViTs handle position at a new resolution?",
          "a": "Interpolate the learned 2D position-embedding grid to the new patch layout (usually bicubic), then fine-tune - the standard recipe for running a 224px-pretrained ViT at 384px."
        }
      ],
      "standard": [
        {
          "q": "Why do transformers need positional encoding, and how do sinusoidal and learned encodings compare?",
          "a": "THE PROBLEM. Self-attention computes, for each query, a softmax-weighted average of value vectors. Nothing in that computation references position: if you permute the input tokens, the outputs permute identically (permutation EQUIVARIANCE), and if you then pool, the result is fully permutation INVARIANT. Unlike an RNN (which processes sequentially, so order is intrinsic) or a CNN (whose kernels define adjacency), a transformer sees a SET. For language that is catastrophic - 'the dog bit the man' and 'the man bit the dog' would be indistinguishable - so positional information must be injected explicitly. SINUSOIDAL ENCODING (Vaswani et al., 2017). For position p and dimension pair (2i, 2i+1), PE = sin(p / 10000^(2i/d)) and cos(p / 10000^(2i/d)). Wavelengths form a geometric series from about 2*pi to 10000*2*pi, so the encoding is a multi-scale positional code: high-frequency dimensions distinguish adjacent tokens, low-frequency dimensions distinguish coarse regions of the sequence - conceptually a binary counter with continuous digits. This vector is ADDED to the token embedding. Two claimed advantages: (a) ZERO PARAMETERS and defined for any position, so nothing structurally prevents running on longer sequences; (b) the RELATIVE-OFFSET property - by angle addition, PE(p+k) = M_k PE(p) where M_k is a rotation depending only on k, so a linear projection could in principle read off relative offsets. LEARNED ENCODING (BERT, GPT-2, ViT). Just an embedding table with one trainable vector per position, learned by backprop like token embeddings. Costs d_model * max_len parameters (for BERT-base, 768 * 512 = 393K - trivial) and has a HARD maximum length: position 513 simply does not exist. THE COMPARISON. In-distribution quality: essentially a wash. The original paper reported 'nearly identical results' and chose sinusoidal for its extrapolation potential; later work generally finds learned marginally better within the training length, since it can adapt to the actual positional statistics of the data. Extrapolation: this is the real difference, and the honest version is more nuanced than the paper's hope. Learned embeddings CANNOT extrapolate at all - there is no vector for an unseen position. Sinusoidal encodings are DEFINED at any position but the model still degrades badly beyond its training length, because it never learned to handle attention patterns at those offsets. So the sinusoidal advantage is real but much weaker than advertised, and 'sinusoidal extrapolates' is a claim worth correcting in an interview. Parameters: sinusoidal free, learned negligible - not a real consideration. Flexibility: learned can capture data-specific positional structure (e.g. document formatting regularities); sinusoidal imposes a fixed prior. WHY BOTH LOST. Both are ABSOLUTE encodings added at the INPUT, and that is a structural mismatch with what attention does. Attention scores a query at position i against a key at position j, and what should matter is (i - j) - the offset - not the absolute indices. With input-added absolute encodings, the model has to infer offsets from the difference of two encodings that have already been mixed with token content and transformed by several layers. The field therefore moved to RELATIVE schemes injected INSIDE attention: Shaw et al. (2018) added learned relative-position vectors to keys; T5 uses a learned scalar bias per bucketed relative distance added to attention logits; ALiBi (Press et al., 2022) adds a simple linear penalty -m*|i-j| with per-head slopes and no embeddings at all, which extrapolates gracefully; and RoPE (Su et al., 2021) rotates queries and keys by an angle proportional to position, so their dot product depends provably on (i - j) alone. RoPE is now the default in essentially every modern LLM (LLaMA, Mistral, Qwen, Gemma). THE THROUGH-LINE worth stating: the progression from sinusoidal to learned to relative to RoPE is a story about moving positional information from a bolt-on at the input to a structural property of the attention operation itself - and each step improved both quality and length generalization.",
          "deepDive": {
            "q": "Sinusoidal encodings are defined at any position, yet models still fail beyond their training length. Explain precisely why, and what actually fixes it.",
            "a": "THE DISTINCTION that resolves the puzzle: being DEFINED at a position and being TRAINED on the attention patterns that occur at that position are different things. Four concrete mechanisms cause the failure. (1) UNSEEN RELATIVE OFFSETS. A model trained on 512-token contexts has never computed attention between tokens 3000 apart. Even though PE(3000) is a perfectly well-defined vector, the query-key interaction pattern it produces is out of distribution for every learned projection in the network. The model has no idea what to do with it, and the resulting attention logits are effectively arbitrary. (2) ATTENTION ENTROPY GROWS WITH LENGTH. Softmax over more keys spreads probability more thinly. A model trained to attend over 512 positions has learned logit scales that produce useful distributions at that length; at 4096 the same logits produce a much flatter, noisier distribution, diluting the signal. This is a length-generalization problem independent of the positional scheme. (3) NORM AND DISTRIBUTION SHIFT. Attention outputs are averages over more vectors, changing their statistics, which shifts every downstream LayerNorm and MLP away from the distribution it was trained on - a cascading out-of-distribution failure. (4) HIGH-FREQUENCY ALIASING. In the sinusoidal construction the fastest dimensions have wavelength ~2*pi, so at large p they oscillate rapidly and nearby distant positions look nearly identical or spuriously similar; the encoding stops being a clean monotone signal of distance far out. WHAT ACTUALLY FIXES IT, in the order the field discovered them. (a) ALiBi - remove positional embeddings entirely and add a per-head linear penalty -m*|i-j| to attention logits. Because the penalty is a MONOTONE function of distance defined at every offset, and because it says something simple and true at any length ('closer is more relevant, with a head-specific strength'), it extrapolates gracefully - Press et al. showed a model trained at 1024 evaluating well beyond it. The cost is a hard recency prior that limits genuinely long-range retrieval, which is why ALiBi did not become universal. (b) ROPE PLUS SCALING - RoPE alone extrapolates poorly for the same reason sinusoids do (unseen rotation angles), but because position enters as a ROTATION FREQUENCY, you can rescale it. POSITION INTERPOLATION (Chen et al., 2023) divides position indices by a factor s so a model trained at L handles s*L by mapping new positions into the trained angular range - with a little fine-tuning this works remarkably well. NTK-AWARE SCALING adjusts the rotation BASE (the 10000 constant) instead, scaling low frequencies more than high ones to preserve local resolution, and often works with no fine-tuning. YaRN combines these with an attention-temperature correction and is the strongest of the family. This is now the standard way long-context models are made, and it is why the base constant matters. (c) TRAINING ON LONG SEQUENCES - the unglamorous but decisive answer. Nothing substitutes for having actually trained at the target length, which is why frontier models do a long-context continuation phase (progressively increasing sequence length) rather than relying on extrapolation. (d) ARCHITECTURAL alternatives - sliding-window or local attention (Mistral), attention sinks (keeping the first few tokens always attendable, which fixes the StreamingLLM failure mode), or recurrence/state-space hybrids. THE EVALUATION CAVEAT worth raising: perplexity at long context is a weak measure - a model can have decent perplexity while being unable to USE distant information, since most next-token predictions depend on nearby context. Test with needle-in-a-haystack retrieval, long-document QA, or RULER-style benchmarks that require actually using distant tokens. A model advertised at 128K context can be near-useless past 32K on those, and the gap between 'supported context' and 'effective context' is one of the more important practical facts in current LLM deployment."
          }
        },
        {
          "q": "Compare relative position encodings - Shaw, T5 bias, ALiBi, RoPE - and explain why relative beat absolute.",
          "a": "WHY RELATIVE IS THE RIGHT FRAME. Attention computes a compatibility between a query at position i and a key at position j. Linguistically and structurally, what matters is almost always the OFFSET (i - j): 'the adjective two tokens before the noun', 'the matching bracket', 'the previous sentence'. Absolute position matters far less - a syntactic dependency between tokens 10 and 12 is the same relation as between 510 and 512. Absolute encodings force the model to infer offsets from the difference between two absolute signals that have already been mixed with content, which is both wasteful and fragile at unseen absolute positions. Relative schemes provide the offset directly. THE FOUR APPROACHES. (1) SHAW ET AL. (2018) - the first relative scheme. Learn an embedding vector per relative distance (clipped at some maximum) and add it to the KEYS (and optionally values) inside attention. Effective, but costs memory proportional to T^2 relative embeddings and complicates efficient attention kernels. Mostly of historical importance now. (2) T5 RELATIVE POSITION BIAS (Raffel et al., 2020). Add a learned SCALAR bias to each attention logit, indexed by a BUCKETED relative distance - fine-grained buckets for small offsets, logarithmically-spaced buckets for large ones - with buckets shared across layers (one table per head). Cheap (a handful of parameters per head), effective, and the log-bucketing gives some graceful degradation at longer distances. Still used in T5-family and several encoder models. (3) ALiBi (Press et al., 2022). No embeddings at all: subtract m_h * |i - j| from the attention logit, where m_h is a fixed per-head slope from a geometric sequence. Interpretation: each head gets a different recency bias strength, so some heads look locally and others tolerate distance. Its headline property is length extrapolation - train at 1024, evaluate far beyond it with graceful degradation - because a monotone distance penalty remains meaningful at any offset. Its cost is a hard structural recency prior: information far away is systematically down-weighted, which hurts tasks needing genuine long-range retrieval. Used in BLOOM and MPT. (4) RoPE (Su et al., 2021) - the winner. Instead of adding anything, ROTATE the query and key vectors by an angle proportional to their position: pairs of dimensions are rotated by p*theta_i with geometrically-spaced frequencies. Because a dot product of two rotated vectors depends only on the DIFFERENCE of rotation angles, the attention score becomes provably a function of (i - j) and the content - relative position is structural, not learned. It adds no parameters, no logit bias, and is compatible with FlashAttention (it is applied to q and k before the kernel). And crucially it is TUNABLE for context extension: since position enters as a frequency, you can interpolate positions or rescale the base to stretch the trained range. RoPE is used by LLaMA, Mistral, Qwen, Gemma, DeepSeek - essentially every current open LLM. WHY RoPE WON over ALiBi, specifically: it imposes no fixed recency prior (so long-range retrieval remains possible), it costs nothing, it composes with efficient attention kernels, and the position-interpolation and NTK/YaRN family gave it a practical path to very long contexts that ALiBi's fixed slopes do not offer. ALiBi's extrapolation advantage turned out to be less valuable than RoPE's extensibility plus a long-context training phase. THE PATTERN worth articulating: each step moved positional information CLOSER to the operation that uses it - from added-at-the-input (absolute), to added-to-keys (Shaw), to added-to-logits (T5, ALiBi), to built-into-the-geometry-of-q-and-k (RoPE). And the final step is the only one that makes relative dependence a mathematical property of the operator rather than something the model must learn to extract."
        },
        {
          "q": "How would you extend a model's context length beyond what it was trained on?",
          "a": "There are four families of answers, and the right one depends on whether you can fine-tune. STEP 0 - CHECK WHAT SCHEME THE MODEL USES, because the options differ completely. Learned absolute embeddings: you cannot extend without adding and training new embeddings (or interpolating the table and fine-tuning). Sinusoidal: defined at any position but degrades sharply. ALiBi: extrapolates natively and gracefully. RoPE: the interesting case, and the one that matters for modern models. (1) POSITION INTERPOLATION (Chen et al., 2023) - the foundational trick for RoPE. Instead of letting position indices grow past the trained range, DIVIDE them by a scale factor s: to go from 4K to 16K, use p/4. Now the rotation angles stay inside the range the model saw in training; positions are just packed more densely. It works strikingly well with a small amount of fine-tuning (often ~1000 steps), far better than naive extrapolation, because interpolating within a learned range is a much gentler ask than extrapolating outside it. The cost is reduced positional RESOLUTION - adjacent tokens now differ by a smaller angle, which slightly degrades fine-grained local ordering. (2) NTK-AWARE SCALING and YaRN - the refinement. Rather than scaling all positions uniformly, change the RoPE BASE (the 10000 constant) so that LOW-frequency (long-wavelength) dimensions are interpolated while HIGH-frequency (local) dimensions are left nearly intact - preserving local resolution where it matters and stretching only the coarse scales. NTK-aware scaling often works with NO fine-tuning at all, which is why it spread rapidly through the open-model community. YaRN (Peng et al., 2023) combines wavelength-dependent interpolation with an attention-temperature correction and is the strongest member of the family, reaching large extensions with modest fine-tuning. This is the default recommendation for extending a RoPE model today. (3) CONTINUED PRETRAINING AT LONGER LENGTH - the unglamorous answer that frontier labs actually use. Take the model, apply a positional scaling method, then continue training on long documents with a progressively increasing sequence length. Nothing substitutes for having actually trained on the attention patterns that occur at long range. Expensive (attention is quadratic, so long-context training is costly) but it is what produces genuinely usable long context rather than nominal support. (4) ARCHITECTURAL WORKAROUNDS when you cannot retrain. SLIDING-WINDOW attention (Mistral): each token attends only to the last W tokens, so cost is linear and any length is processable, with information propagating across windows through depth. ATTENTION SINKS / StreamingLLM: keep the first few tokens permanently attendable while sliding the rest - the observation being that models dump attention mass onto initial tokens, and evicting them destroys the distribution. RETRIEVAL instead of context: chunk the document, retrieve the relevant pieces, and keep the prompt short - frequently the correct engineering answer, since it is cheaper and often more accurate than a very long context. HOW I WOULD EVALUATE THE RESULT, which is the part people skip: perplexity is a WEAK measure of long-context ability, because most next-token predictions depend on nearby tokens, so perplexity can look fine while the model ignores distant information entirely. Use retrieval-style probes - needle-in-a-haystack across depths and lengths, multi-needle variants, RULER, or long-document QA - and report performance as a function of both context length and the position of the needed information, since the well-documented 'lost in the middle' effect means accuracy dips for information in the middle of a long context. Also measure the COST: attention memory and time grow quadratically, KV cache grows linearly with length (which is usually what actually limits you in serving), and both need to be in the decision. THE SUMMARY: for a RoPE model, use YaRN or NTK-aware scaling, fine-tune briefly on long documents if you can, evaluate with retrieval probes rather than perplexity, and seriously consider whether retrieval-augmented short context solves the actual problem more cheaply."
        },
        {
          "q": "Why are positional encodings ADDED to token embeddings rather than concatenated?",
          "a": "This looks like a strange choice - you are summing two semantically unrelated signals into the same vector - and the reasoning is worth unpacking because it reveals something about how high-dimensional representations work. THE PRACTICAL ARGUMENTS FOR ADDING. (1) DIMENSIONALITY IS PRESERVED. Concatenating a p-dimensional positional vector to a d-dimensional token embedding gives d+p dimensions, so every downstream weight matrix grows, and you must decide how to split the budget between content and position at every layer. Addition keeps d_model fixed and lets the split be learned and layer-dependent rather than fixed by architecture. (2) THE MODEL CAN LEARN TO SEPARATE THEM. In high dimensions, two random subspaces are nearly orthogonal, so a sum can be approximately decomposed by a linear projection - the model can learn W_Q and W_K that read mostly positional information and others that read mostly content. Empirically this is what happens: some attention heads are strongly positional (previous-token heads) while others are content-driven, which requires exactly this separability. (3) IT DOES NOT PERMANENTLY SPEND CAPACITY. With concatenation, p dimensions are reserved for position at every layer forever, even where position is irrelevant. With addition, the positional signal can be attenuated by later layers when it stops being useful - and it demonstrably is, since deeper layers become more content-driven. (4) EMPIRICALLY IT WORKS AND THE ALTERNATIVE ADDS NO GAIN. This is the honest bottom line: several papers have compared them and found little or no advantage to concatenation for the extra cost, so the field kept the simpler option. THE COUNTERARGUMENTS, which you should be able to state. Adding INTERFERES: the positional vector is noise from the content pathway's perspective and vice versa, so both signals are degraded, and how much depends on their relative magnitudes - which is why the original Transformer multiplies embeddings by sqrt(d_model) before adding the encoding, to keep the token signal from being swamped. That scaling factor is exactly an acknowledgement that the sum is a delicate balance. Also, information capacity is genuinely shared: d_model dimensions must now carry both, so at small d_model the interference is worse. THE DEEPER RESOLUTION, and the best answer: the question became largely MOOT because modern models do NEITHER. RoPE does not add or concatenate anything to the embedding - it ROTATES the query and key vectors inside attention, so position modifies the GEOMETRY of the comparison rather than occupying any dimensions of the representation. ALiBi adds a bias to the LOGITS, not to the representation at all. Both approaches sidestep the interference problem entirely, and both work better than either add or concatenate. That is the strongest evidence that 'add vs concatenate' was a false dichotomy: the real insight was that position should modify the attention COMPUTATION, not the token REPRESENTATION. A NICE RELATED OBSERVATION for a follow-up: the residual stream framing from interpretability makes this concrete - the residual stream is a shared communication channel that many components read from and write to in different subspaces, and adding the positional encoding is just one more thing written into it. Under that view, addition is not a hack; it is the standard mechanism by which everything in a transformer communicates, and the model's ability to read specific subspaces is what makes it work."
        },
        {
          "q": "How does positional encoding work for Vision Transformers, and what changes for 2D data?",
          "a": "THE SETUP. A ViT splits an image into non-overlapping patches (typically 16x16 pixels), linearly projects each into a d_model vector, and treats the resulting sequence of ~196 patch tokens (for 224x224 with 16px patches) exactly like a token sequence. Since attention is permutation equivariant, the model would otherwise treat the image as a BAG of patches with no spatial arrangement - even worse than the language case, because the patches form a 2D grid whose structure is highly informative. THE STANDARD ANSWER: LEARNED 1D EMBEDDINGS. The original ViT uses a learned embedding per patch INDEX - i.e. it flattens the 2D grid into a 1D sequence in raster order and learns one vector per sequence position, exactly as BERT does. This seems like it should be inadequate (position 15 and position 29 are vertically adjacent in a 14-wide grid, but nothing tells the model that), yet the paper ablated 1D learned, 2D learned (separate row and column embeddings, summed or concatenated), and relative encodings, and found little difference. The explanation is that the model LEARNS the 2D structure: if you visualize the cosine similarity between learned position embeddings, they organize into a clear 2D grid - nearby patches in the image get similar embeddings, and the row/column structure emerges without being imposed. That is a satisfying result: the inductive bias was learnable from data because the arrangement is consistent across every image. WHAT CHANGES FOR 2D, concretely. (1) THE RESOLUTION PROBLEM is the big one. Learned position embeddings are tied to a specific grid size, so a ViT pretrained at 224px (14x14 patches) cannot directly accept 384px input (24x24 patches). The standard fix is to INTERPOLATE the position-embedding grid - reshape the learned embeddings into a 14x14xd grid, bicubically interpolate to 24x24xd, and fine-tune briefly. This works well and is what every 'fine-tune at higher resolution' recipe does; it is worth knowing because it is a common practical operation and a frequent source of bugs (interpolating the CLS token's embedding along with the patches, or forgetting to exclude it, is a classic error). (2) THE CLS TOKEN has its own position embedding and is not part of the spatial grid, so it must be handled separately during any interpolation. (3) 2D-AWARE SCHEMES exist and matter more at scale: separate row and column embeddings (factorized 2D), 2D relative position bias (used in Swin Transformer, where relative offsets within a window are learned - a natural fit since Swin's windows are fixed-size), and 2D RoPE (rotate different dimension groups by the x and y coordinates independently), which is increasingly used in modern vision and multimodal models because it inherits RoPE's resolution flexibility. (4) HIERARCHICAL ARCHITECTURES change the question: Swin's shifted-window attention makes locality architectural, so its relative position bias only needs to cover within-window offsets, which is both cheaper and more effective. (5) CONVOLUTIONAL POSITION - some hybrids inject position implicitly with a depthwise convolution (a 'conditional position encoding'), exploiting the fact that zero-padded convolutions leak absolute position; this handles arbitrary resolutions naturally. THE BROADER POINT worth making: the ViT result - that a 1D learned encoding suffices because the model discovers 2D structure - is another instance of the recurring theme that with enough data, weaker priors can be learned rather than imposed. But in the LOW-data regime, or where resolution must vary, the explicitly 2D schemes (relative bias, 2D RoPE) help, which is exactly the same data-versus-inductive-bias trade-off as CNNs versus ViTs generally."
        },
        {
          "q": "Design a positional scheme for a non-standard modality - say irregular time-stamped events. What would you do?",
          "a": "This is a good test of whether the concepts transfer, because the standard schemes all assume a REGULAR integer index and that assumption fails here. THE PROBLEM WITH INDEX POSITION. If events arrive at irregular times - clinical measurements, user clicks, financial trades, sensor readings - then event k's index says nothing about WHEN it happened. Two sequences with identical event indices could span an hour or a year, and the gap between events is often the most informative signal (a patient measured every 5 minutes is in a very different state from one measured monthly). Encoding index position would throw that away and, worse, would make the model treat unlike gaps as equivalent. THE DESIGN. (1) ENCODE CONTINUOUS TIME, NOT INDEX. The sinusoidal construction generalizes directly: it maps a scalar to a multi-frequency vector, and there is nothing integer-specific about it. Feed the actual timestamp t (or elapsed time since sequence start) into sin(t / base^(2i/d)) and cos(...). Choose the frequency range from the domain: the fastest wavelength should resolve the finest interval that matters (seconds? minutes?) and the slowest should cover the longest span you care about (a year?). This frequency-range choice is the main domain-specific decision, and it is the same decision the 10000 base makes for text. (2) PREFER RELATIVE TIME, for the same reason NLP did. What usually matters is the ELAPSED TIME between two events, not their absolute clock time. So inject a function of (t_i - t_j) into the attention logits - the ALiBi/T5 pattern generalized to a continuous variable. Options: a learned MLP on the log time difference producing a per-head bias; bucketed log-spaced time differences with learned biases (the T5 scheme, with time buckets instead of index buckets); or a decay term -lambda_h * (t_i - t_j) with per-head rates, which is ALiBi with real time and gives each head its own timescale - a very natural fit, since some heads should care about the last minute and others about the last month. (3) USE LOG TIME. Time differences in real event data span many orders of magnitude (milliseconds to months), so encode log(1 + delta_t) rather than delta_t, or use log-spaced buckets. Otherwise the fine-scale structure is compressed into nothing. (4) CONSIDER 2D or MULTI-FIELD POSITION. Many event streams have several relevant 'positions': absolute time, elapsed time since sequence start, time since the previous event of the same TYPE, and possibly a cyclical component (hour of day, day of week - encode those with sin/cos of the cycle so that 23:00 and 01:00 are close). Sum or concatenate several encodings, one per field. Cyclical encoding is a genuinely important detail in this domain and a good thing to raise. (5) HANDLE THE CAUSAL/IRREGULARITY INTERACTION. If the task is forecasting, causal masking must be by TIME, not by index - and if events can share a timestamp, decide explicitly whether simultaneous events may attend to each other (usually yes) and implement it, or you will have a subtle leak. WHAT I WOULD ACTUALLY BUILD, and how I would validate it: start with continuous sinusoidal encoding of log-elapsed-time plus cyclical calendar features added at the input, AND a per-head time-decay bias in attention. Then ablate: remove the time encoding entirely (index only) and confirm performance drops - if it does not, time was not carrying signal and the simpler model wins. Test extrapolation to longer gaps than seen in training, since irregular data often has heavy-tailed gaps. And compare against the domain's real baselines - Hawkes processes, neural ODEs / continuous-time models (Neural CDEs), and simple gap features fed to a gradient-boosted tree - because for irregular event data those are frequently competitive and sometimes better, and knowing that is more valuable than an elegant transformer variant that loses to a baseline. THE TRANSFERABLE PRINCIPLE: positional encoding is really 'encode whatever ordering or metric structure the data has, in a form attention can compare' - integer index for text is just the simplest case. Identify your data's true notion of distance, encode it at the right scales, prefer relative to absolute, and verify empirically that it carries signal."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why positional encoding exists",
        "back": "Self-attention is permutation equivariant - it averages over a SET. Without position, 'dog bites man' = 'man bites dog'. No recurrence, no convolution, so order must be injected explicitly."
      },
      {
        "type": "formula",
        "front": "Sinusoidal encoding",
        "back": "PE(p,2i)=sin(p/10000^(2i/d)), PE(p,2i+1)=cos(...). Wavelengths geometric from ~2*pi to 10000*2*pi: fast dims separate neighbours, slow dims separate regions. Zero parameters, ADDED to the embedding."
      },
      {
        "type": "formula",
        "front": "The relative-offset property",
        "back": "PE(p+k) = M_k PE(p) with M_k a rotation depending only on k. Relative position is a LINEAR function of the encoding - suggestive, but attention scores still aren't guaranteed to depend only on (i-j). RoPE makes that guarantee."
      },
      {
        "type": "pitfall",
        "front": "Sinusoids don't really extrapolate",
        "back": "The formula is defined at any p, but perplexity still explodes past the training length - the model never learned attention patterns at those offsets. Defined is not the same as trained. ALiBi's monotone distance penalty is what extrapolates."
      },
      {
        "type": "definition",
        "front": "Learned position embeddings",
        "back": "nn.Embedding indexed by position (BERT, GPT-2, ViT). d_model*max_len params, marginally better in-distribution, and a HARD context cap - position max_len simply does not exist."
      },
      {
        "type": "definition",
        "front": "ALiBi",
        "back": "No embeddings: subtract m_h*|i-j| from attention logits with per-head slopes. Extrapolates gracefully because a monotone distance penalty is meaningful at any offset. Cost: a hard recency prior that limits long-range retrieval."
      },
      {
        "type": "definition",
        "front": "T5 relative bias",
        "back": "A learned SCALAR added to each attention logit, indexed by BUCKETED relative distance (fine near, log-spaced far), per head. Cheap and effective; log buckets give graceful degradation."
      },
      {
        "type": "intuition",
        "front": "Why relative beat absolute",
        "back": "Attention compares a query at i to a key at j, and what matters is the OFFSET (i-j). Absolute-at-the-input forces the model to infer offsets from mixed signals. The progression moved position closer to the operation that uses it, ending at RoPE."
      },
      {
        "type": "pitfall",
        "front": "Add vs concatenate is moot",
        "back": "Adding keeps d_model fixed and lets the model separate signals in near-orthogonal subspaces (hence the sqrt(d_model) embedding scale). But modern models do NEITHER - RoPE rotates q/k, ALiBi biases logits. Position should modify the COMPUTATION, not the representation."
      },
      {
        "type": "pitfall",
        "front": "ViT resolution change",
        "back": "Learned patch-position embeddings are tied to the grid size. To fine-tune at higher resolution, reshape to a 2D grid and bicubically interpolate (handling the CLS token separately), then fine-tune. Forgetting the CLS token is a classic bug."
      }
    ],
    "refs": [
      {
        "title": "Vaswani et al. (2017), Attention Is All You Need (sinusoidal encoding)",
        "url": "https://arxiv.org/abs/1706.03762"
      },
      {
        "title": "Shaw, Uszkoreit & Vaswani (2018), Self-Attention with Relative Position Representations",
        "url": "https://arxiv.org/abs/1803.02155"
      },
      {
        "title": "Press, Smith & Lewis (2022), Train Short, Test Long: Attention with Linear Biases (ALiBi)",
        "url": "https://arxiv.org/abs/2108.12409"
      },
      {
        "title": "Chen et al. (2023), Extending Context Window of LLMs via Position Interpolation",
        "url": "https://arxiv.org/abs/2306.15595"
      }
    ],
    "demos": [
      "positional-encoding",
      "rope",
      "attention"
    ]
  },
  "transformer-block": {
    "level": "core",
    "body": {
      "intuition": [
        "Attention alone is not a neural network layer - it is a routing operation. It moves information between positions with a weighted average, but the aggregation itself is linear in the values, so a stack of pure attention layers cannot compute much. The TRANSFORMER BLOCK is the unit that makes it a real architecture, and it is built from exactly four pieces: multi-head attention (mix information ACROSS positions), a position-wise feed-forward network (process each position INDEPENDENTLY, and supply the nonlinearity), residual connections (make depth trainable), and layer normalization (keep activations well-scaled). Stack N identical copies and you have GPT, BERT, ViT, or Whisper - the block is the entire architecture, repeated.",
        "The cleanest way to hold it is as an alternation: COMMUNICATE, then COMPUTE. Attention is the only place where positions exchange information; the FFN is the only place where each position transforms its own content, and it is where most of the parameters and most of the FLOPs live (its hidden dimension is conventionally 4x d_model, giving 8*d_model^2 parameters versus attention's 4*d_model^2 - two-thirds of the block). Interpretability work supports the division too: attention heads move and copy information, while the MLP layers appear to store and retrieve factual associations.",
        "Two details in the block are load-bearing far beyond their apparent size. The RESIDUAL CONNECTION is what makes 96-layer models trainable at all, and in the interpretability framing it creates the 'residual stream' - a shared channel every layer reads from and writes to, which is why you can think of layers as incrementally editing a running representation rather than transforming it wholesale. And the PLACEMENT of layer norm - before the sublayer (pre-norm) or after (post-norm) - looks cosmetic and is not: post-norm was the original design and requires careful learning-rate warmup to train at depth, while pre-norm trains stably without it, which is why every large modern model uses pre-norm."
      ],
      "math": [
        {
          "h": "Post-norm (original) vs pre-norm (modern)",
          "paras": [
            "The two arrangements differ only in whether normalization is applied to the sublayer's INPUT or to the sum. The consequence is structural: in pre-norm the residual path from input to output is a clean identity with nothing applied to it, so gradients reach early layers undisturbed. In post-norm every residual addition is followed by a normalization, so the identity path is repeatedly rescaled - which is what makes deep post-norm stacks fragile."
          ],
          "tex": "\\underbrace{x \\leftarrow \\mathrm{LN}\\big(x + \\mathrm{Sublayer}(x)\\big)}_{\\text{post-norm (Vaswani 2017)}} \\qquad\\qquad \\underbrace{x \\leftarrow x + \\mathrm{Sublayer}\\big(\\mathrm{LN}(x)\\big)}_{\\text{pre-norm (GPT-2 onward)}}",
          "texNote": "Sublayer = multi-head attention, then the FFN - each wrapped this way, so a block applies the pattern twice. Pre-norm needs a FINAL LayerNorm after the last block, since the stream is otherwise never normalized on the way out."
        },
        {
          "h": "The position-wise FFN, and where the parameters are",
          "paras": [
            "The FFN is applied identically and independently at every position - equivalently, two 1x1 convolutions over the sequence. It expands to d_ff = 4*d_model, applies a nonlinearity, and projects back. Counting parameters per block makes the split obvious: the FFN holds two-thirds of them."
          ],
          "tex": "\\mathrm{FFN}(x) = W_2\\,\\sigma\\!\\left(W_1 x + b_1\\right) + b_2, \\qquad \\underbrace{8 d^2}_{\\text{FFN}} + \\underbrace{4 d^2}_{\\text{attention}} = 12 d^2 \\text{ per block}",
          "texNote": "d = d_model, d_ff = 4d, sigma = ReLU originally, GELU in BERT/GPT, SwiGLU in modern models. The 12*d_model^2 per block is the number behind the standard 'parameters ~ 12 * n_layers * d_model^2' estimate for a transformer."
        }
      ],
      "code": [
        {
          "h": "The whole block in twenty lines",
          "paras": [
            "This is a complete pre-norm decoder block - the unit that, repeated, is GPT. Note the two residual additions, the LayerNorm applied to the sublayer input rather than to the sum, and the FFN's 4x expansion."
          ],
          "code": "import torch, torch.nn as nn\n\nclass TransformerBlock(nn.Module):\n    \"\"\"Pre-norm block: x + Sublayer(LN(x)), twice.\"\"\"\n    def __init__(self, d_model=512, n_heads=8, d_ff=None, dropout=0.1):\n        super().__init__()\n        d_ff = d_ff or 4 * d_model                       # the 4x convention\n        self.ln1, self.ln2 = nn.LayerNorm(d_model), nn.LayerNorm(d_model)\n        self.attn = MultiHeadAttention(d_model, n_heads, dropout)\n        self.ffn = nn.Sequential(\n            nn.Linear(d_model, d_ff), nn.GELU(),         # expand + nonlinearity\n            nn.Linear(d_ff, d_model), nn.Dropout(dropout))  # project back\n        self.drop = nn.Dropout(dropout)\n\n    def forward(self, x, mask=None):\n        x = x + self.drop(self.attn(self.ln1(x), mask))  # COMMUNICATE across positions\n        x = x + self.ffn(self.ln2(x))                    # COMPUTE per position\n        return x\n\nblock = TransformerBlock(512, 8)\nn = sum(p.numel() for p in block.parameters())\nprint(f'{n:,} params  (12*d^2 = {12*512**2:,} plus norms/biases)')   # 3,152,384\nattn_n = sum(p.numel() for p in block.attn.parameters())\nprint(f'attention {attn_n/n:.0%}, FFN {1-attn_n/n:.0%}')             # attention 33%, FFN 67%",
          "caption": "A complete pre-norm transformer block. Two residual additions, LayerNorm on each sublayer's input, and an FFN that expands 4x - which is why the FFN holds two-thirds of the block's parameters."
        },
        {
          "h": "Why pre-norm replaced post-norm",
          "paras": [
            "The measurable difference: post-norm needs learning-rate warmup to train deep stacks and diverges without it, while pre-norm trains stably from step one. The mechanism is the gradient path - pre-norm leaves a clean identity from input to output, post-norm normalizes after every addition."
          ],
          "code": "# 24-layer stack, identical data/optimizer, only norm PLACEMENT differs:\n#\n#   config                       no warmup        4k-step warmup\n#   post-norm, lr 1e-3           diverged (NaN)   loss 3.41\n#   post-norm, lr 1e-4           loss 3.88        loss 3.52\n#   pre-norm,  lr 1e-3           loss 3.39        loss 3.38   <- stable either way\n#\n# gradient norm reaching layer 0 at initialization (relative to the last layer):\n#   post-norm 24 layers: 0.02x   <- signal is attenuated on the way down\n#   pre-norm  24 layers: 0.94x   <- the identity path preserves it\n\ndef grad_ratio(model, x):\n    model.zero_grad(); model(x).sum().backward()\n    g = [b.attn.qkv.weight.grad.norm().item() for b in model.blocks]\n    return g[0] / g[-1]        # first layer vs last layer gradient magnitude",
          "caption": "Post-norm applies a normalization after every residual addition, attenuating gradients on the way to early layers, so deep stacks need warmup and are learning-rate sensitive. Pre-norm's clean identity path preserves gradient magnitude - which is why every large modern model uses it."
        }
      ],
      "useCases": [
        "Every transformer in production: GPT/LLaMA (decoder-only stacks of this block with causal masking), BERT (encoder stacks, bidirectional), ViT (encoder over image patches), Whisper and speech models (encoder-decoder), and diffusion transformers (DiT) - the block is the architecture, repeated N times.",
        "Capacity planning and cost estimation: because a block is ~12*d_model^2 parameters and the FFN is two-thirds of it, you can estimate a model's size, memory, and FLOPs from three numbers (layers, width, sequence length) - the arithmetic every system-design interview expects.",
        "Targeted efficiency work: knowing that the FFN dominates parameters explains why mixture-of-experts replaces the FFN specifically, why quantization focuses there, and why attention-focused optimizations (FlashAttention, GQA) address latency and memory rather than parameter count.",
        "Interpretability: the residual-stream view - every block reads from and writes to a shared channel - is the foundation of transformer-circuits work, where attention heads move information and MLP layers act as key-value memories storing factual associations."
      ],
      "pitfalls": [
        "Using post-norm without warmup at depth: the original arrangement needs a careful learning-rate warmup and is sensitive to the peak LR; skipping warmup on a deep post-norm stack reliably diverges. Use pre-norm unless you have a specific reason not to.",
        "Forgetting the FINAL LayerNorm in a pre-norm model: because normalization is applied to sublayer inputs, the residual stream is never normalized on the way out, so a pre-norm stack needs one LN after the last block before the output head. Omitting it degrades training and is a common reimplementation bug.",
        "Assuming attention is where the parameters are: the FFN holds two-thirds of every block (8*d^2 vs 4*d^2). Efficiency work aimed at 'the expensive part' should target the FFN for parameters and memory, and attention for long-sequence latency.",
        "Thinking of LayerNorm as BatchNorm's equivalent: LayerNorm normalizes over FEATURES within each token independently, so it has no batch dependence, behaves identically at train and test, and works at batch size 1 - which is exactly why transformers use it and why the BatchNorm eval()/running-statistics machinery does not apply.",
        "Treating dropout placement as arbitrary: dropout goes on the sublayer OUTPUT before the residual addition (and optionally on attention weights), not on the residual stream itself - dropping the residual path directly damages the identity that makes depth trainable."
      ],
      "connections": [
        {
          "ref": "transformers/modern-blocks",
          "text": "The modern variant of this block swaps LayerNorm for RMSNorm and the ReLU/GELU FFN for SwiGLU - same skeleton, cheaper and slightly better components."
        },
        {
          "ref": "transformers/full-transformer",
          "text": "The flagship lesson assembles these blocks into the complete encoder-decoder architecture, with cross-attention as the third sublayer in each decoder block."
        },
        {
          "ref": "neural-nets/regularization",
          "text": "Residual connections plus normalization are what make very deep stacks trainable; this block is where the optimization tricks from the neural-network module become architectural."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Mixture-of-experts replaces this block's FFN with many experts and a router - a direct consequence of the FFN being where two-thirds of the parameters live."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are the components of a transformer block?",
          "a": "Multi-head attention, a position-wise feed-forward network, residual connections around each, and layer normalization - repeated N times to form the model."
        },
        {
          "q": "What does the FFN do that attention cannot?",
          "a": "Attention aggregates linearly across positions; the FFN applies a nonlinear transformation to each position independently. It supplies the per-position computation and most of the nonlinearity."
        },
        {
          "q": "Why is d_ff usually 4*d_model?",
          "a": "An empirical convention from the original paper that has held up: it gives enough expansion for the nonlinearity to be useful without dominating cost. Modern SwiGLU models use ~8/3*d_model per matrix to keep parameters comparable."
        },
        {
          "q": "How many parameters does a block have?",
          "a": "About 12*d_model^2: 4*d^2 for attention (Q,K,V,O) and 8*d^2 for the FFN (two d x 4d matrices). Hence 'params ~ 12 * n_layers * d_model^2'."
        },
        {
          "q": "Pre-norm vs post-norm?",
          "a": "Post-norm: x <- LN(x + Sublayer(x)) (original). Pre-norm: x <- x + Sublayer(LN(x)) (GPT-2 onward). Pre-norm trains stably at depth without warmup."
        },
        {
          "q": "Why does pre-norm train more stably?",
          "a": "It leaves a clean identity path from input to output with nothing applied to it, so gradients reach early layers undisturbed. Post-norm normalizes after every residual addition, attenuating that path."
        },
        {
          "q": "What extra piece does pre-norm require?",
          "a": "A final LayerNorm after the last block - the residual stream is otherwise never normalized on the way out. Forgetting it is a classic reimplementation bug."
        },
        {
          "q": "Why LayerNorm rather than BatchNorm?",
          "a": "LayerNorm normalizes over features within each token, so it has no batch dependence: identical behaviour at train and test, works at batch size 1, and handles variable-length sequences."
        },
        {
          "q": "What is the residual stream?",
          "a": "The interpretability view of the residual path: a shared channel that every attention head and MLP reads from and writes to, so layers incrementally edit a running representation rather than replacing it."
        },
        {
          "q": "Where does dropout go?",
          "a": "On each sublayer's output before the residual addition, and optionally on attention weights. Never on the residual path itself - that damages the identity that makes depth trainable."
        },
        {
          "q": "Which sublayer costs more?",
          "a": "Parameters: the FFN, two-thirds of the block. Long-sequence compute and memory: attention, because of its O(T^2) term. Different bottlenecks, different fixes."
        },
        {
          "q": "How does a decoder block differ from an encoder block?",
          "a": "Causal masking in self-attention, and (in encoder-decoder models) a third sublayer: cross-attention to the encoder output, between self-attention and the FFN."
        }
      ],
      "standard": [
        {
          "q": "Walk through a transformer block component by component, explaining what each part contributes.",
          "a": "THE SKELETON. A block applies two sublayers, each wrapped in a residual connection and a layer normalization. In the modern (pre-norm) arrangement: x = x + Attention(LN(x)); then x = x + FFN(LN(x)). Stack N of these and you have the model. (1) MULTI-HEAD ATTENTION - the COMMUNICATION step. This is the ONLY place in the entire architecture where information moves between positions. Each position forms a query, compares it against every key, and takes a weighted average of values - so token 50 can pull in information from token 3. Multi-head means several such comparisons happen in parallel in different learned subspaces. Without it, the model would be a per-token MLP with no context whatsoever. (2) THE POSITION-WISE FFN - the COMPUTATION step. A two-layer MLP applied identically and independently at each position: expand from d_model to d_ff (conventionally 4x), apply a nonlinearity (ReLU originally, GELU in BERT/GPT, SwiGLU in modern models), project back. Two things to say about why it matters. First, attention's aggregation is LINEAR in the values, so without the FFN a stack of attention layers would have severely limited expressive power - the FFN supplies the nonlinearity that makes depth meaningful. Second, this is where most of the model LIVES: 8*d^2 parameters versus attention's 4*d^2, so two-thirds of every block, and interpretability work (Geva et al.) suggests MLP layers act as key-value memories storing factual associations, which fits the ROME/model-editing results that locate facts in specific MLP layers. (3) RESIDUAL CONNECTIONS - what makes depth possible. Each sublayer's output is ADDED to its input rather than replacing it, so the block computes an UPDATE to a running representation. This gives a direct gradient path from the loss to every layer (no vanishing through 96 layers) and means each sublayer only has to learn a refinement, not a full transformation. In the interpretability framing this creates the RESIDUAL STREAM: a shared communication channel that every head and MLP reads from and writes into, usually in different subspaces - which is the mental model behind transformer-circuits work and explains how information from layer 2 can be used directly at layer 40. (4) LAYER NORMALIZATION - keeping activations well-conditioned. Normalize each token's feature vector to zero mean and unit variance, then apply a learned scale and shift. LayerNorm rather than BatchNorm because it has no batch dependence: it behaves identically at train and test, works at batch size 1, and handles variable-length sequences - all essential for sequence models, and the reason the whole eval()/running-statistics apparatus of BatchNorm is irrelevant here. Its PLACEMENT matters a great deal (see below). THE ALTERNATION - the framing I would lead with: communicate (attention), then compute (FFN), repeatedly. Every transformer is that loop. The masking and the source of Q/K/V determine what kind of model it is - causal mask gives GPT, no mask gives BERT, and an extra cross-attention sublayer gives an encoder-decoder. THE COST STRUCTURE, which is what system-design questions actually want: per block, parameters are ~12*d_model^2 (attention 4, FFN 8); compute is O(T*d^2) for the projections and FFN plus O(T^2*d) for attention, so attention dominates once T exceeds d_model; activation memory is dominated by the T x T attention matrix in a naive implementation, which is precisely what FlashAttention eliminates. Knowing which part dominates which resource is what lets you answer 'this model is too slow/too big' with a targeted fix rather than a guess.",
          "deepDive": {
            "q": "Explain the residual stream view of a transformer and why it changes how you think about layers.",
            "a": "THE STANDARD PICTURE is a pipeline: layer 1 transforms the input, layer 2 transforms that, and so on, each layer's output being the next layer's input. THE RESIDUAL STREAM PICTURE (Elhage et al., 'A Mathematical Framework for Transformer Circuits') is different and more accurate. Because every sublayer ADDS to its input rather than replacing it, the value flowing through the network is a running SUM: x_final = x_embed + sum over all attention heads of their outputs + sum over all MLPs of their outputs. The residual path is a shared BUS that every component reads from and writes to. Nothing is ever destroyed by a later layer; contributions accumulate. FOUR CONSEQUENCES THAT CHANGE HOW YOU THINK. (1) LAYERS COMMUNICATE DIRECTLY ACROSS DEPTH. A head in layer 2 can write information that a head in layer 40 reads, without any intervening layer needing to preserve or forward it - the residual stream carries it untouched. So 'depth' is not a strict pipeline; it is a sequence of read-modify-write operations on shared state. This is what makes CIRCUITS possible: an induction circuit is a previous-token head in an early layer writing something that an induction head in a later layer reads, which is only coherent under this view. (2) COMPONENTS COMMUNICATE VIA SUBSPACES. The stream has d_model dimensions but there are far more components than dimensions, so components use different (approximately orthogonal) SUBSPACES to avoid interfering. Each head's output projection W_O determines which subspace it writes to, and each head's W_Q/W_K/W_V determine which it reads from. This immediately connects to SUPERPOSITION - the stream carries more features than it has dimensions, packed into near-orthogonal directions with some interference, which is the motivation for sparse autoencoders in interpretability. (3) THE STREAM IS A PRIVILEGED BASIS ONLY WHERE SOMETHING BREAKS ROTATION SYMMETRY. Because everything reads and writes linearly, the stream itself has no preferred coordinate system - except that LayerNorm and the elementwise nonlinearity inside MLPs do break it. This is why 'neuron 1432 means X' claims are more meaningful for MLP neurons than for residual-stream dimensions, and it is a subtle point that shows real familiarity with the framework. (4) IT EXPLAINS PRACTICAL PHENOMENA. LOGIT LENS works (decode the residual stream at intermediate layers with the final unembedding and you get an interpretable, progressively-refining prediction) precisely because the stream is in the same space throughout. LAYER PRUNING often causes surprisingly little damage because removing one contributor from a sum degrades it gracefully. MODEL EDITING (ROME) works by changing what a specific MLP writes. And the observation that later layers often make small refinements is natural if each layer is an incremental edit rather than a transformation. WHY PRE-NORM FITS THIS VIEW BETTER, tying it back: in pre-norm, the residual path is a pure identity - nothing is applied to the stream itself, only to the copies fed into sublayers - so the stream really is a clean accumulator. In post-norm, every addition is followed by a normalization that rescales the whole stream, which both hurts gradient flow and muddies the interpretation. That the architecture the field converged on for optimization reasons is also the one with the cleaner conceptual story is a nice convergence, and worth pointing out. THE PRACTICAL PAYOFF for an interview: this view is what lets you reason about WHERE to intervene. Want to know what a layer contributes? Ablate its write to the stream. Want to know what information is present at layer L? Probe or logit-lens the stream there. Want to edit a fact? Change what the relevant MLP writes. The pipeline view suggests none of these; the residual-stream view makes them obvious."
          }
        },
        {
          "q": "Explain pre-norm versus post-norm in depth. Why did the field switch?",
          "a": "THE TWO ARRANGEMENTS. Post-norm (Vaswani et al., 2017): x <- LayerNorm(x + Sublayer(x)) - the sublayer operates on the raw input, and normalization is applied AFTER the residual addition. Pre-norm (GPT-2 onward, and now universal): x <- x + Sublayer(LayerNorm(x)) - normalization is applied to the sublayer's INPUT, and the residual addition is the last thing that happens. THE PROBLEM WITH POST-NORM. Because a LayerNorm sits after every residual addition, the identity path from input to output is not clean - it is rescaled at every one of the 2N sublayers. In the backward direction, gradients flowing to early layers pass through all those normalizations and are attenuated; measured at initialization on a 24-layer stack, the gradient norm reaching layer 0 can be a small fraction of that at the last layer. The practical symptoms are well documented: post-norm transformers require a careful learning-rate WARMUP (the original paper's schedule ramps up over 4000 steps) and are sensitive to the peak learning rate; without warmup, deep post-norm stacks reliably diverge. Xiong et al. (2020), 'On Layer Normalization in the Transformer Architecture', analyzed exactly this - they showed post-norm has large gradients near the output at initialization, motivating warmup, while pre-norm's gradients are well-behaved and warmup becomes unnecessary. WHY PRE-NORM IS BETTER BEHAVED. The residual path is a pure identity: x_out = x_in + (things computed from normalized copies). So the gradient of the loss with respect to an early layer's input includes an unattenuated identity term, exactly as in a ResNet with identity shortcuts. Training is stable from step one, tolerates larger learning rates, and scales to 100+ layers. That is the whole reason for the switch, and it is an optimization argument, not a quality argument. THE COST OF PRE-NORM, which is worth knowing because it is the interesting part. (a) The residual stream is never normalized, so its MAGNITUDE GROWS with depth as more contributions accumulate - which means later layers' contributions are relatively smaller compared to the accumulated stream, and some analyses argue this makes deep pre-norm models effectively shallower than their layer count suggests (a 'representation collapse' concern). (b) You MUST add a final LayerNorm after the last block, since nothing else normalizes the output before the unembedding - omitting it is a common reimplementation bug that shows up as poor training. (c) Some work reports post-norm reaching slightly better final quality WHEN it trains successfully, so the switch trades a little peak quality for a lot of reliability - an entirely reasonable trade at scale, where a diverged run costs enormous compute. WHAT CAME AFTER, which shows the question is not closed: DEEPNORM (Wang et al., 2022) modifies post-norm with a scaled residual and a specific initialization, enabling stable training of 1000-layer transformers and claiming post-norm's quality with pre-norm's stability. SANDWICH NORM and other variants normalize at both ends. Gemma-2 and some other recent models use both pre- and post-normalization around each sublayer. And QK-LayerNorm addresses a related but distinct instability (attention logit growth). So the field's consensus is 'pre-norm by default', not 'post-norm is wrong'. HOW I WOULD ANSWER THE SUMMARY QUESTION: the switch happened because pre-norm makes deep transformers trainable without warmup and tolerant of larger learning rates, by keeping the residual identity path clean - a stability win that mattered enormously as models got deeper, at the cost of a slightly growing residual norm, a required final LayerNorm, and possibly a small amount of peak quality."
        },
        {
          "q": "Why does the FFN have a 4x expansion, and why does it hold most of the parameters?",
          "a": "THE ARITHMETIC FIRST. The FFN is two matrices: d_model x d_ff and d_ff x d_model. With d_ff = 4*d_model that is 4*d^2 + 4*d^2 = 8*d^2 parameters. Attention is four d x d matrices (Q, K, V, O) = 4*d^2. So the block is 12*d^2 total, and the FFN is exactly two-thirds of it. This is where the widely-used estimate 'parameters ~ 12 * n_layers * d_model^2' comes from, and being able to derive it on the spot is worth having. WHY 4x SPECIFICALLY. Honestly: it is an empirical convention from the original paper (d_model 512, d_ff 2048) that has held up across a decade of scaling, not a derived quantity. The reasoning behind why SOME expansion is needed is more principled. (1) The FFN is the block's main source of nonlinear per-position computation, and an MLP's expressive power depends on its hidden width - a bottleneck (d_ff < d_model) would throw information away, and d_ff = d_model would make it a fairly weak transformation. (2) There is an interpretability-flavoured argument: if MLP layers act as key-value memories (Geva et al.), then d_ff is the NUMBER OF MEMORY SLOTS, and you want many more slots than the dimensionality of the space, which points to expansion. (3) Ablations broadly show quality improving with d_ff up to a point and then flattening while cost keeps rising, with 4x sitting near the knee. Some models deviate deliberately - and the deviations are informative. SwiGLU-based models (LLaMA, PaLM) use THREE matrices instead of two (gate, up, down), so to keep parameters comparable they set d_ff to about 8/3 * d_model rather than 4x - which means 'LLaMA uses a smaller FFN' is a misreading; it uses the same parameter budget in a different shape. WHY THE FFN DOMINATING MATTERS PRACTICALLY - this is the payoff of the question. (a) MIXTURE OF EXPERTS replaces the FFN, not attention, precisely because that is where the parameters are: you can have 64 expert FFNs and route each token to 2 of them, multiplying parameter count while keeping per-token FLOPs nearly constant. Every major MoE model (Switch, Mixtral, DeepSeek-MoE) does this. (b) QUANTIZATION and PRUNING target the FFN for the same reason - that is where the memory is. (c) Attention-focused optimizations (FlashAttention, GQA, MQA) do NOT reduce parameter count meaningfully; they address activation memory, long-sequence compute, and KV-cache size. So 'my model is too big to fit' and 'my model is too slow at long context' have different answers, and knowing the split tells you which lever to pull. (d) At INFERENCE with a KV cache, decoding is memory-bandwidth-bound on reading the WEIGHTS, and since two-thirds of the weights are FFN, that is where decode time goes - which is also why MoE helps latency (only the routed experts are read) and why weight-only quantization of the FFN is so effective. THE COMPUTE SPLIT, to complete the picture: per token, the FFN costs ~8*d^2 MACs and the attention projections ~4*d^2, while the attention score computation costs ~2*T*d. So for short sequences the FFN dominates compute as well as parameters; the quadratic attention term only takes over once T > d_model, which for a 4096-wide model means past ~4K tokens. That crossover is the single most useful number for reasoning about transformer cost."
        },
        {
          "q": "Why do transformers use LayerNorm instead of BatchNorm?",
          "a": "THE MECHANICAL DIFFERENCE. BatchNorm normalizes each FEATURE across the BATCH dimension: for feature j, compute mean and variance over all examples (and, in vision, all spatial positions) in the mini-batch. LayerNorm normalizes each EXAMPLE across the FEATURE dimension: for token i, compute mean and variance over its own d_model features. So BatchNorm's statistics depend on which other examples are in the batch; LayerNorm's do not. That single difference drives everything else. WHY THAT MATTERS FOR SEQUENCES - five reasons, the first three decisive. (1) VARIABLE SEQUENCE LENGTHS AND PADDING. In a batch of sentences of different lengths, BatchNorm's per-feature statistics would be computed over a mix of real and padded positions, and the number of real tokens contributing varies by position - so position 3 might average over 32 sequences while position 200 averages over 2. The statistics become unreliable and position-dependent. LayerNorm normalizes within a token and is completely unaffected. (2) NO TRAIN/TEST DISCREPANCY. BatchNorm must use batch statistics during training and stored RUNNING statistics at inference, which creates the whole eval()/train() apparatus, the risk of train-test mismatch under distribution shift, and the classic bug of forgetting model.eval(). LayerNorm computes the same function in both modes - no running statistics, no mode switch, no discrepancy. For autoregressive generation, where you process one token at a time, this is essential. (3) BATCH SIZE INDEPENDENCE. BatchNorm degrades badly at small batch sizes because the statistics are noisy, and it is undefined at batch size 1. Transformers are often trained with small per-device batches (long sequences eat memory) and are run at batch size 1 at inference. LayerNorm works identically at any batch size. Also relevant: at inference with a KV cache you process a single token, so batch statistics would be meaningless. (4) SEQUENTIAL/AUTOREGRESSIVE CORRECTNESS. With BatchNorm, one example's normalization depends on its batch-mates, so predictions are not a function of that input alone - unacceptable for generation, and a subtle source of information leakage between examples. (5) DISTRIBUTED TRAINING SIMPLICITY. BatchNorm across data-parallel workers requires synchronizing statistics (SyncBatchNorm) with its communication cost; LayerNorm needs nothing. WHAT BATCHNORM PROVIDES THAT LAYERNORM DOES NOT, for completeness: BatchNorm's noisy batch statistics act as a mild REGULARIZER (each example's normalization depends on its batch-mates, injecting noise). LayerNorm has no such effect, which is part of why transformers rely more heavily on dropout and weight decay than modern CNNs do - a nice connection to make. THE MODERN REFINEMENT worth mentioning: most current LLMs use RMSNorm rather than LayerNorm - dropping the mean subtraction and the learned bias, keeping only the root-mean-square rescaling and a learned gain. It is measurably cheaper (fewer reduction passes over the vector, and normalization is memory-bandwidth-bound so this is a real saving) and works just as well, which suggests the RE-CENTERING was never the important part and the RE-SCALING was. LLaMA, Gemma, Mistral, Qwen all use RMSNorm. THE ONE-LINE ANSWER: LayerNorm normalizes within a token rather than across the batch, so it is independent of batch composition and size, identical at train and test, and correct for variable-length sequences and single-token autoregressive decoding - all of which BatchNorm fails at. And the field has since moved one step further to RMSNorm, keeping only the rescaling."
        },
        {
          "q": "How do encoder blocks, decoder blocks, and decoder-only blocks differ?",
          "a": "All three are built from the same components; the differences are the MASK and whether a cross-attention sublayer is present. (1) ENCODER BLOCK (BERT, ViT, the encoder half of T5). Two sublayers: bidirectional self-attention (no causal mask - every position attends to every other, left and right) and the FFN. Purpose: build the richest possible representation of an input that is fully available. This is right for understanding tasks - classification, NER, retrieval embeddings, and any case where you encode once and use the representation. The training objective is typically masked language modelling (predict randomly masked tokens using both-side context), which requires bidirectionality. (2) DECODER BLOCK IN AN ENCODER-DECODER (the original Transformer, T5, Whisper, BART). THREE sublayers: causal self-attention over the generated sequence so far, then CROSS-ATTENTION where queries come from the decoder and keys/values from the ENCODER's output, then the FFN. Purpose: generate an output sequence conditioned on a separately-encoded input. The separation is genuinely useful when the source and target are different modalities or languages - Whisper encodes audio and decodes text, and the encoder can be bidirectional over the audio while the decoder stays autoregressive over text. (3) DECODER-ONLY BLOCK (GPT, LLaMA, Mistral - the dominant modern design). Two sublayers: causal self-attention and the FFN. No cross-attention; conditioning is done by putting the 'input' into the same sequence as a PREFIX. Purpose: next-token prediction over a single stream. THE CAUSAL MASK is the key mechanism to be able to explain: setting positions j > i to -inf before the softmax means position i attends only to positions <= i, which is what lets you train on a whole sequence in one forward pass (teacher forcing) while preserving the left-to-right factorization needed at generation time. Without it the model trivially cheats by reading the answer. WHY DECODER-ONLY WON, which is what a good answer should address. (a) SIMPLICITY AND SCALE - one stack, one objective, one set of hyperparameters; easier to scale and to engineer. (b) UNIVERSAL FORMAT - every task can be cast as text continuation, so no architecture change per task; the prefix does what cross-attention used to. (c) TRAINING EFFICIENCY - every token provides a prediction target, whereas masked language modelling only supervises the ~15% masked positions, so decoder-only extracts more signal per token of data. (d) IN-CONTEXT LEARNING emerged strongly in this setting. WHAT ENCODERS ARE STILL BEST AT, since 'decoder-only won' is too glib: bidirectional context genuinely helps for embedding and retrieval (the strongest text embedding models are still encoder-style or use bidirectional attention), for token-level tagging, and for classification where you have plenty of labelled data and want a small, fast model - a fine-tuned BERT-base still beats prompting a large LLM on cost-per-inference for a fixed narrow task. And encoder-DECODERs remain natural where the input is a different modality (speech, images) or where you want to encode a long source once and decode many times, since the encoder KV can be computed once and reused. THE PRACTICAL DETAIL that catches people: in an encoder-decoder, the cross-attention keys and values are computed ONCE from the encoder output and reused for every generated token, whereas self-attention's KV cache grows with each token. Knowing that distinction is a good sign you have actually implemented generation."
        },
        {
          "q": "You need to reduce a transformer's inference latency. Which parts of the block do you target?",
          "a": "The right first move is to identify which RESOURCE is binding, because the block has three different bottlenecks and they have different fixes. PROFILE FIRST, and split by phase - PREFILL (processing the prompt, compute-bound, parallel over all tokens) versus DECODE (generating tokens one at a time, memory-bandwidth-bound). These behave completely differently and most latency questions are really about decode. THE THREE BOTTLENECKS AND THEIR FIXES. (1) WEIGHT MEMORY BANDWIDTH - usually the decode bottleneck. Generating one token requires reading EVERY weight from memory to do a tiny amount of arithmetic (batch 1 means each weight is used once), so decode speed is essentially model_size / memory_bandwidth. Fixes: QUANTIZATION (int8 or int4 weight-only quantization gives a near-linear speedup because you are moving fewer bytes - the single highest-value optimization for decode); MoE (only the routed experts' weights are read per token, so an MoE model with 8x the parameters can decode at the speed of a much smaller dense one); DISTILLATION or a smaller model; and BATCHING, which amortizes weight reads across many sequences and is why serving systems batch aggressively (continuous batching). Since the FFN is two-thirds of the weights, it is the main target here. (2) KV CACHE MEMORY AND BANDWIDTH - the long-context bottleneck. The cache is 2 * n_layers * n_kv_heads * d_k * T * batch * bytes, and at long context or high batch it exceeds the weights and must be read for every generated token. Fixes: GQA/MQA (share key/value heads across query heads - LLaMA-2 70B's 8 KV groups for 64 query heads is an 8x cache reduction, and this is the standard modern choice); KV-cache QUANTIZATION (int8 cache); PAGED ATTENTION (vLLM - eliminates the fragmentation from pre-allocating max-length cache, raising achievable batch size several-fold); cache EVICTION or sliding windows for very long contexts; and MLA-style low-rank cache compression. (3) ATTENTION COMPUTE - the long-prompt/prefill bottleneck. The O(T^2) term dominates once T > d_model. Fixes: FLASHATTENTION (exact, not an approximation - it tiles the computation so the T x T matrix is never materialized, cutting memory from O(T^2) to O(T) and running several times faster because attention is memory-bandwidth-bound); sliding-window or sparse attention patterns if you can accept an approximation; and chunked prefill to overlap with decode in a serving system. BEYOND THE BLOCK - often the biggest wins, and worth raising because they show system-level thinking. SPECULATIVE DECODING: a small draft model proposes several tokens and the large model verifies them in ONE forward pass, giving 2-3x decode speedup with IDENTICAL output distribution - the most impactful decode optimization of recent years. CONTINUOUS BATCHING: interleave requests at the token level rather than waiting for a batch to finish, which massively improves throughput under real traffic. PREFIX CACHING: reuse the KV cache for shared system prompts across requests. And OPERATOR FUSION / a good serving runtime (vLLM, TensorRT-LLM), which is often worth 2x with no model change. THE ORDER I WOULD ACTUALLY TRY: (a) profile and split prefill vs decode; (b) use a proper serving runtime with continuous batching and paged attention - frequently the largest single win and requires no model change; (c) weight-only int8/int4 quantization; (d) FlashAttention if not already in use; (e) speculative decoding if a suitable draft model exists; (f) GQA/MQA and KV quantization if the cache is the constraint (note GQA usually requires retraining or at least uptraining, so it is a model-design decision rather than a deployment one); (g) only then consider a smaller or distilled model. Notice that most of these do not change the block at all - which is itself the important observation, because the instinct to redesign the architecture is usually the most expensive path to the smallest gain."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The transformer block",
        "back": "Multi-head attention (COMMUNICATE across positions) + position-wise FFN (COMPUTE per position), each wrapped in a residual connection and a LayerNorm. Stack N copies = the whole model."
      },
      {
        "type": "formula",
        "front": "Block parameter count",
        "back": "~12*d_model^2: attention 4*d^2 (Q,K,V,O) + FFN 8*d^2 (two d x 4d matrices). Hence 'params ~ 12 * n_layers * d_model^2'. The FFN is TWO-THIRDS of the block."
      },
      {
        "type": "formula",
        "front": "Pre-norm vs post-norm",
        "back": "Post: x <- LN(x + Sublayer(x)) (original, needs warmup, LR-sensitive). Pre: x <- x + Sublayer(LN(x)) (modern, stable at depth, clean identity path). Pre-norm REQUIRES a final LN after the last block."
      },
      {
        "type": "intuition",
        "front": "Why the FFN is necessary",
        "back": "Attention's aggregation is LINEAR in the values, so stacked attention alone has limited expressive power. The FFN supplies the per-position nonlinearity - and interpretability work suggests MLPs act as key-value memories storing facts."
      },
      {
        "type": "definition",
        "front": "The residual stream",
        "back": "Because every sublayer ADDS to its input, the value is a running sum that all heads and MLPs read from and write to (in different subspaces). Layers edit shared state rather than forming a strict pipeline - the basis of circuits work and logit lens."
      },
      {
        "type": "intuition",
        "front": "LayerNorm vs BatchNorm",
        "back": "LN normalizes over FEATURES within one token: no batch dependence, identical at train/test, works at batch size 1 and with variable lengths. BN fails all of those for sequences. Modern models use RMSNorm (drop the mean-centering, keep the rescaling)."
      },
      {
        "type": "formula",
        "front": "Attention/FFN cost crossover",
        "back": "Projections + FFN: O(T*d^2). Attention scores: O(T^2*d). Attention dominates once T > d_model (~4K tokens for a 4096-wide model). Params: FFN dominates always."
      },
      {
        "type": "pitfall",
        "front": "Missing final LayerNorm (pre-norm)",
        "back": "Pre-norm normalizes sublayer INPUTS, so the residual stream is never normalized on the way out. A pre-norm stack needs one LN after the last block before the head - omitting it is a classic reimplementation bug."
      },
      {
        "type": "intuition",
        "front": "Encoder / decoder / decoder-only",
        "back": "Encoder: bidirectional self-attn + FFN. Encoder-decoder's decoder: causal self-attn + CROSS-attn + FFN. Decoder-only: causal self-attn + FFN, conditioning via a prefix. Same components, different mask and sublayer count."
      },
      {
        "type": "pitfall",
        "front": "Target the right bottleneck",
        "back": "Decode latency = weights/bandwidth -> quantize, MoE, batch. Long context = KV cache -> GQA, paged attention, cache quantization. Long prompt = O(T^2) attention -> FlashAttention. Different problems, different fixes."
      }
    ],
    "refs": [
      {
        "title": "Vaswani et al. (2017), Attention Is All You Need",
        "url": "https://arxiv.org/abs/1706.03762"
      },
      {
        "title": "Xiong et al. (2020), On Layer Normalization in the Transformer Architecture",
        "url": "https://arxiv.org/abs/2002.04745"
      },
      {
        "title": "Geva et al. (2021), Transformer Feed-Forward Layers Are Key-Value Memories",
        "url": "https://arxiv.org/abs/2012.14913"
      },
      {
        "title": "Elhage et al. (2021), A Mathematical Framework for Transformer Circuits (residual stream)",
        "url": "https://transformer-circuits.pub/2021/framework/index.html"
      }
    ],
    "demos": [
      "multi-head-attention",
      "attention",
      "batch-norm"
    ]
  },
  "modern-blocks": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The 2017 transformer block and a 2024 LLaMA block have the same skeleton - attend, then feed-forward, each with a residual and a normalization - but almost every component inside has been replaced. LayerNorm became RMSNorm. The ReLU/GELU feed-forward became SwiGLU. Absolute positional encodings became RoPE. Multi-head attention became grouped-query attention. Biases were deleted. None of these changes is individually dramatic; together they are the difference between the original architecture and what every modern open model actually ships, and each one has a specific, checkable justification.",
        "Two of them are the subject of this lesson. RMSNorm (Zhang and Sennrich, 2019) drops LayerNorm's mean-subtraction and its learned bias, keeping only a root-mean-square rescale and a learned gain. It is cheaper - normalization is memory-bandwidth-bound, so removing a reduction pass and a subtraction is a real saving at scale - and it works just as well, which is itself informative: it says the RE-CENTERING was never the part that mattered, only the RE-SCALING. SwiGLU (Shazeer, 2020) replaces the FFN's single expansion matrix with a GATED pair: one branch produces values, another produces a multiplicative gate through a Swish nonlinearity. That is three matrices instead of two, so d_ff is reduced to about 8/3 * d_model to hold the parameter count constant, and the result is a consistent quality gain at equal cost.",
        "The honest framing for these is important, and it is what a good interview answer contains. Shazeer's own paper on GLU variants ends by saying the architectures 'seem to produce better perplexities' and offers no explanation, closing with a line about divine benevolence - a rare and admirable admission that the result is empirical. So the correct posture is: these are well-replicated empirical wins with plausible but unproven mechanisms (gating gives multiplicative interactions and data-dependent information flow), adopted because they survived scrutiny at scale, not because anyone derived them. Being able to say that - and to distinguish 'we measured it repeatedly' from 'we understand it' - is more valuable than a confident story about why gating works."
      ],
      "math": [
        {
          "h": "LayerNorm vs RMSNorm",
          "paras": [
            "LayerNorm centres and scales, with a learned gain and bias. RMSNorm skips the mean entirely: divide by the root mean square and apply a learned gain. Fewer operations, one fewer reduction over the feature vector, and no bias parameters - and empirically equal quality, which is the evidence that re-centering was doing little work."
          ],
          "tex": "\\mathrm{LN}(x) = \\gamma \\odot \\frac{x - \\mu}{\\sqrt{\\sigma^2 + \\epsilon}} + \\beta \\qquad\\qquad \\mathrm{RMSNorm}(x) = \\gamma \\odot \\frac{x}{\\sqrt{\\tfrac{1}{d}\\sum_i x_i^2 + \\epsilon}}",
          "texNote": "mu and sigma^2 are the mean and variance over the d feature dimensions of ONE token. RMSNorm drops mu, drops beta, and needs only one pass to accumulate the sum of squares - typically 10-30% faster for the normalization op, which matters because it is bandwidth-bound and runs 2N times per forward pass."
        },
        {
          "h": "SwiGLU: a gated feed-forward network",
          "paras": [
            "A GLU-family FFN splits the expansion into two projections: one passed through an activation to form a GATE, one linear to form the VALUES, combined by an elementwise product before the down-projection. With Swish (SiLU) as the activation this is SwiGLU. Because there are now three matrices, d_ff is set to about 8/3 * d_model so total parameters match the classic 4x two-matrix FFN."
          ],
          "tex": "\\mathrm{SwiGLU}(x) = \\Big(\\underbrace{\\mathrm{Swish}(xW_{\\text{gate}})}_{\\text{gate}} \\;\\odot\\; \\underbrace{xW_{\\text{up}}}_{\\text{values}}\\Big) W_{\\text{down}}, \\qquad \\mathrm{Swish}(z) = z\\,\\sigma(z)",
          "texNote": "Elementwise product = multiplicative interaction, which a plain FFN cannot express in one layer. Parameter count is 3 * d_model * d_ff, so d_ff = (8/3) d_model gives 8*d_model^2 - identical to the classic two-matrix FFN at 4x expansion."
        }
      ],
      "code": [
        {
          "h": "RMSNorm and SwiGLU, and the parameter-matching detail",
          "paras": [
            "Both are short. The detail worth internalizing is the d_ff choice: a naive swap to SwiGLU at 4x expansion silently adds 50% more FFN parameters, so any 'SwiGLU is better' comparison that skips the 8/3 adjustment is measuring extra capacity, not the gating."
          ],
          "code": "import torch, torch.nn as nn, torch.nn.functional as F\n\nclass RMSNorm(nn.Module):\n    def __init__(self, d, eps=1e-6):\n        super().__init__()\n        self.gain, self.eps = nn.Parameter(torch.ones(d)), eps    # no bias\n    def forward(self, x):\n        rms = x.pow(2).mean(-1, keepdim=True).add(self.eps).rsqrt()\n        return self.gain * (x * rms)                              # no mean subtraction\n\nclass SwiGLU(nn.Module):\n    def __init__(self, d_model, d_ff=None):\n        super().__init__()\n        d_ff = d_ff or int(8 * d_model / 3)        # 8/3, NOT 4x - three matrices now\n        d_ff = 64 * ((d_ff + 63) // 64)            # round to a hardware-friendly multiple\n        self.gate = nn.Linear(d_model, d_ff, bias=False)\n        self.up   = nn.Linear(d_model, d_ff, bias=False)\n        self.down = nn.Linear(d_ff, d_model, bias=False)\n    def forward(self, x):\n        return self.down(F.silu(self.gate(x)) * self.up(x))       # gate * values\n\nd = 4096\nclassic = nn.Sequential(nn.Linear(d, 4*d, bias=False), nn.GELU(), nn.Linear(4*d, d, bias=False))\nswiglu  = SwiGLU(d)\nn = lambda m: sum(p.numel() for p in m.parameters())\nprint(f'classic 4x GELU : {n(classic):,}')     # 134,217,728\nprint(f'SwiGLU  8/3     : {n(swiglu):,}')      # 134,217,728  <- matched, on purpose\nprint(f'SwiGLU  4x (bug): {n(SwiGLU(d, 4*d)):,}')   # 201,326,592  <- 50% MORE params",
          "caption": "SwiGLU uses three matrices, so d_ff must drop to ~8/3*d_model to match the classic FFN's parameter count. Comparing SwiGLU at 4x against GELU at 4x measures 50% extra capacity, not the gating mechanism - the most common error in reproducing this result."
        },
        {
          "h": "The modern block, assembled",
          "paras": [
            "Every change in one place: pre-norm with RMSNorm, no biases anywhere, RoPE applied inside attention, grouped-query KV heads, and a SwiGLU feed-forward. This is, component for component, a LLaMA-style block."
          ],
          "code": "class ModernBlock(nn.Module):\n    \"\"\"LLaMA-style: pre-RMSNorm, no biases, RoPE inside attention, GQA, SwiGLU FFN.\"\"\"\n    def __init__(self, d_model=4096, n_heads=32, n_kv_heads=8):\n        super().__init__()\n        self.norm1, self.norm2 = RMSNorm(d_model), RMSNorm(d_model)\n        self.attn = GroupedQueryAttention(d_model, n_heads, n_kv_heads, rope=True)\n        self.ffn = SwiGLU(d_model)\n    def forward(self, x, freqs_cis, mask=None):\n        x = x + self.attn(self.norm1(x), freqs_cis, mask)\n        x = x + self.ffn(self.norm2(x))\n        return x\n\n# what changed since 2017, and why:\n#   LayerNorm      -> RMSNorm      cheaper (bandwidth-bound op), equal quality\n#   post-norm      -> pre-norm     trains at depth without warmup\n#   ReLU/GELU FFN  -> SwiGLU       consistent perplexity gain at matched params\n#   sinusoidal PE  -> RoPE         relative position by construction, extendable\n#   MHA            -> GQA          8x smaller KV cache at ~equal quality\n#   biases         -> removed      no measurable loss, slightly better stability",
          "caption": "A LLaMA-style block: the 2017 skeleton with every component replaced. Each substitution is individually small and empirically justified; together they define what a modern LLM block looks like."
        }
      ],
      "useCases": [
        "Reading and reimplementing any modern open model: LLaMA, Mistral, Qwen, Gemma, DeepSeek and their derivatives all use pre-RMSNorm + RoPE + GQA + SwiGLU with no biases, so recognizing this component set is what makes their code legible at a glance.",
        "Training-efficiency work at scale: RMSNorm and bias removal are small per-op wins that matter because normalization runs 2N times per forward pass and is memory-bandwidth-bound - the kind of change that only pays off when multiplied by billions of tokens.",
        "Designing an architecture rather than copying one: the SwiGLU parameter-matching detail (8/3 rather than 4x) is the canonical example of how to compare architectural variants honestly - hold parameters and compute fixed, or you are measuring capacity.",
        "Interpreting ablation literature: this component set is the product of many published one-change-at-a-time studies, so it is the standard reference point for 'has anyone actually tested this?' when someone proposes a new block variant."
      ],
      "pitfalls": [
        "Swapping GELU for SwiGLU at the same d_ff: three matrices instead of two means 50% more FFN parameters, so the 'improvement' is mostly extra capacity. Use d_ff ~ 8/3 * d_model to compare honestly - this is the single most common reproduction error.",
        "Assuming these changes are large individually: each is worth a small perplexity improvement or a modest speedup. They are adopted because they compose and because they were validated at scale, not because any one of them transforms a model.",
        "Claiming a mechanism you cannot support: Shazeer's GLU paper explicitly declines to explain why gating helps. 'Multiplicative interactions and data-dependent gating' is a plausible hypothesis, not an established result - say so.",
        "Forgetting that RMSNorm has no bias and no mean-centering: porting weights between a LayerNorm model and an RMSNorm model is not a rename, and reimplementations that keep the beta parameter are silently a different architecture.",
        "Ignoring hardware alignment when choosing d_ff: 8/3 * d_model is rarely a nice number, so implementations round it to a multiple of 64 or 256. Skipping the rounding costs real throughput on tensor cores."
      ],
      "connections": [
        {
          "ref": "transformers/transformer-block",
          "text": "This is the same block with modernized components - the skeleton (attend, feed-forward, residual, normalize) is unchanged, which is why the 2017 paper still reads as current."
        },
        {
          "ref": "neural-nets/activation-functions",
          "text": "Swish/SiLU and GELU come from that lesson's family of smooth activations; SwiGLU is the gated combination of one of them with a linear branch."
        },
        {
          "ref": "transformers/rope",
          "text": "RoPE is the positional half of the same modernization, and the one change with a genuine mathematical justification rather than a purely empirical one."
        },
        {
          "ref": "llm-systems/llm-architectures",
          "text": "The systems view of these choices - how component selection interacts with serving cost, quantization, and kernel support."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is RMSNorm?",
          "a": "LayerNorm without the mean-subtraction and without the learned bias: divide by the root mean square of the features and apply a learned gain."
        },
        {
          "q": "Why is RMSNorm faster?",
          "a": "One fewer reduction over the feature vector and no subtraction. Normalization is memory-bandwidth-bound and runs 2N times per forward pass, so the saving is real at scale (typically 10-30% of the norm op)."
        },
        {
          "q": "What does RMSNorm's success tell us?",
          "a": "That the re-CENTERING in LayerNorm was doing little work - only the re-SCALING mattered. An informative negative result."
        },
        {
          "q": "What is SwiGLU?",
          "a": "A gated FFN: Swish(x W_gate) * (x W_up), then down-projected. Three matrices instead of two, with an elementwise product providing multiplicative interaction."
        },
        {
          "q": "Why is d_ff 8/3*d_model in SwiGLU models?",
          "a": "To keep parameters equal to the classic two-matrix 4x FFN. Three matrices of size d x d_ff means d_ff = 8/3 * d gives 8*d^2, matching."
        },
        {
          "q": "What is Swish/SiLU?",
          "a": "z * sigmoid(z) - a smooth, non-monotonic activation. Smooth like GELU, and used as the gate nonlinearity in SwiGLU."
        },
        {
          "q": "Why does gating help?",
          "a": "The honest answer: nobody has established why. The plausible hypothesis is multiplicative interactions and data-dependent information flow. Shazeer's paper explicitly declines to explain it."
        },
        {
          "q": "Why remove biases from linear layers?",
          "a": "No measurable quality loss, slightly better training stability at scale, and fewer parameters/ops. Modern LLMs (LLaMA, PaLM) drop them from attention and FFN projections."
        },
        {
          "q": "What is the full modern component set?",
          "a": "Pre-norm RMSNorm, no biases, RoPE, grouped-query attention, SwiGLU FFN. That is a LLaMA block, and essentially every current open model uses it."
        },
        {
          "q": "Are these changes individually large?",
          "a": "No - each is worth a small perplexity gain or a modest speedup. They matter because they compose and because they were validated repeatedly at scale."
        },
        {
          "q": "What is GeGLU?",
          "a": "The same gated FFN with GELU as the gate activation instead of Swish. Comparable to SwiGLU; both beat the ungated baseline, and the choice between them is largely convention."
        },
        {
          "q": "Where does normalization time actually go?",
          "a": "Memory bandwidth, not arithmetic - reading and writing the activation tensor. That is why removing one reduction pass (RMSNorm) is worth measurable wall-clock time."
        }
      ],
      "standard": [
        {
          "q": "What is RMSNorm, why did it replace LayerNorm, and what does its success imply?",
          "a": "THE DEFINITION. LayerNorm computes, per token, the mean and variance across its d_model features, subtracts the mean, divides by the standard deviation, then applies a learned per-feature gain (gamma) and bias (beta). RMSNorm (Zhang and Sennrich, 2019) keeps only the scaling: divide each token's feature vector by its root mean square (sqrt of the mean of squares) and apply a learned gain. No mean subtraction, no bias parameter. WHY IT REPLACED LayerNorm - three reasons. (1) IT IS CHEAPER, and the saving is larger than it looks. LayerNorm requires two reduction passes over the feature vector (one for the mean, one for the variance given the mean) or a fused two-moment pass, plus the subtraction; RMSNorm needs one accumulation of squares. More importantly, normalization is MEMORY-BANDWIDTH-BOUND, not compute-bound - the cost is dominated by reading and writing the activation tensor - so reducing the work per element and the number of passes translates fairly directly into wall-clock time. And it runs 2N times per forward pass (twice per block), so a 10-30% saving on that op is a measurable fraction of training and inference time at scale. (2) IT IS EQUALLY GOOD. Across many replications - and now across essentially every major open model - swapping LayerNorm for RMSNorm costs no measurable quality. That is the empirical basis for the switch. (3) FEWER PARAMETERS AND SIMPLER KERNELS: no beta, and a simpler fused kernel, which also helps quantization and export. WHAT ITS SUCCESS IMPLIES - the more interesting part of the question. LayerNorm was introduced with a story about reducing 'internal covariate shift' by re-centering AND re-scaling activations. If removing the re-centering costs nothing, then the re-centering was not doing the work the story attributed to it. That fits a broader re-evaluation: Santurkar et al. (2018) argued BatchNorm's benefit comes from SMOOTHING THE OPTIMIZATION LANDSCAPE (making the loss surface better conditioned and gradients more predictable) rather than from covariate-shift correction, and the RMSNorm result points the same way - what matters is keeping activation MAGNITUDES in a stable range so that gradients through the layer are well-behaved, and the mean is largely irrelevant to that. A second implication is methodological and worth stating: this is a case where the field's stated justification for a component was wrong, and the way that was discovered was by ablating the component into pieces and measuring. That is a good template - when a technique has several parts bundled with one explanation, test the parts separately. THE CAVEATS, for completeness. RMSNorm is not universally better - it is equal-and-cheaper, which is enough. Some architectures still use LayerNorm (BERT-family, ViT variants) simply because they predate the switch or inherit pretrained weights. And porting weights between the two is not a rename: an RMSNorm model has no beta, and its gamma is fitting a different function, so conversion requires care. Also note that normalization PLACEMENT (pre vs post) is a separate and larger effect than the choice of normalizer - if asked what matters more, placement does. THE CURRENT PICTURE: essentially every modern LLM (LLaMA, Mistral, Qwen, Gemma, DeepSeek) uses pre-norm RMSNorm, and the remaining research activity in this area is about additional normalization for stability - QK-norm on queries and keys to prevent attention logit growth, and Gemma-2-style norms both before and after each sublayer.",
          "deepDive": {
            "q": "Normalization layers are usually explained as fixing 'internal covariate shift'. Is that right, and what is actually going on?",
            "a": "THE ORIGINAL CLAIM. Ioffe and Szegedy (2015) introduced BatchNorm with the argument that as earlier layers' parameters change during training, the DISTRIBUTION of inputs to later layers shifts ('internal covariate shift'), forcing later layers to continually re-adapt; normalizing each layer's inputs removes that shift and so speeds training. It is an intuitive story and it dominated textbook explanations for years. THE EVIDENCE AGAINST IT. Santurkar et al. (2018), 'How Does Batch Normalization Help Optimization?', ran the decisive experiment: they DELIBERATELY INJECTED covariate shift after the BatchNorm layer - adding time-varying random noise to the normalized activations, so the distributions fed to later layers were explicitly unstable - and training was still fast. If BatchNorm's benefit came from removing distribution shift, reintroducing shift should have destroyed the benefit. It did not. They also measured the actual distributional shift with and without BatchNorm and found the relationship to training speed weak. So the stated mechanism does not survive testing. WHAT THEY PROPOSED INSTEAD: normalization SMOOTHS THE OPTIMIZATION LANDSCAPE. Concretely, they showed BatchNorm improves the Lipschitz constants of both the loss and its gradient - the loss surface changes less abruptly, gradients are more predictive of what happens after a step, and therefore larger learning rates are stable and training is faster and less sensitive to initialization. The benefit is about CONDITIONING, not about distributions per se. OTHER THREADS THAT FIT. (a) SCALE INVARIANCE: normalization makes a layer's output invariant to the scale of its weights, which means the effective learning rate adapts automatically - a weight-norm-growth argument that explains why normalized networks tolerate a much wider range of learning rates. (b) IMPLICIT REGULARIZATION in BatchNorm's case, from the noise in mini-batch statistics (which LayerNorm and RMSNorm do NOT have - hence transformers relying more on dropout and weight decay). (c) LENGTH-DIRECTION DECOUPLING: normalization separates the magnitude and direction of the weight vector, making the direction easier to optimize (the WeightNorm view). (d) At the extreme, several lines of work (Fixup, NFNets, and careful-initialization schemes) train deep networks WITHOUT normalization at all by controlling initialization and residual scaling directly - which is strong evidence that normalization is one convenient way to achieve well-conditioned signal propagation, not a uniquely necessary mechanism. WHAT THE RMSNorm RESULT ADDS to this picture: if re-centering can be dropped with no cost, then the mean was not the operative quantity - only the SCALE was. That is exactly what the conditioning story predicts (keeping activation magnitudes bounded is what stabilizes gradient magnitudes) and hard to explain under the covariate-shift story, which treats the whole distribution as the problem. So RMSNorm is a small piece of corroborating evidence for the modern explanation. WHAT I WOULD SAY IN AN INTERVIEW: internal covariate shift is the historical motivation and is largely discredited as the mechanism; the better-supported account is that normalization improves the conditioning of the optimization problem - smoother loss landscape, more predictive gradients, scale-invariance that stabilizes effective learning rates - which is why it permits higher learning rates and reduces initialization sensitivity. And I would add the honest caveat that this is still an area of active debate rather than a settled theory, and that the practical rules (normalize, use pre-norm, use RMSNorm because it is cheaper) are all empirically rather than theoretically grounded."
          }
        },
        {
          "q": "Explain SwiGLU. Why do gated FFNs beat plain ones, and how do you compare them fairly?",
          "a": "THE CONSTRUCTION. A classic transformer FFN is: expand with W_1 (d_model -> d_ff), apply a nonlinearity, project back with W_2. A GLU-family FFN splits the expansion into TWO parallel projections of the same width: one, passed through an activation, produces a GATE; the other, linear, produces VALUES. The two are combined by an ELEMENTWISE PRODUCT, then down-projected. With Swish (SiLU: z * sigmoid(z)) as the gate activation, this is SwiGLU; with GELU it is GeGLU; with no activation, plain GLU. So the FFN goes from two matrices to three. WHY IT MIGHT HELP - hypotheses, clearly labelled as such. (1) MULTIPLICATIVE INTERACTIONS. A standard FFN computes an additive combination of features passed through a pointwise nonlinearity; it cannot form a product of two learned projections in a single layer. Gating introduces exactly that, and multiplicative interactions are a genuinely different (and in some senses more expressive) primitive - the same argument used for LSTM gates, attention itself (which is multiplicative), and feature-wise modulation (FiLM). (2) DATA-DEPENDENT INFORMATION FLOW. The gate can suppress or pass each hidden unit depending on the input, giving a soft, input-conditional routing that a fixed nonlinearity cannot. (3) BETTER-CONDITIONED GRADIENTS. Some analyses argue the gated form gives more stable gradient flow than a saturating pointwise nonlinearity, though this is weaker evidence. THE HONEST CAVEAT, and I would state it explicitly: Shazeer's 'GLU Variants Improve Transformer' (2020) reports the empirical gains and then declines to explain them, ending with a much-quoted line attributing the result to divine benevolence. The mechanism is NOT established. What IS established is that the improvement replicates - across model scales, across labs, and across GLU variants - which is why LLaMA, PaLM, Mistral, Qwen and Gemma all adopted it. Distinguishing 'reliably measured' from 'understood' is the substance of this answer. HOW TO COMPARE FAIRLY - the part that actually matters in practice. Because SwiGLU uses three matrices instead of two, a naive swap at the same d_ff increases FFN parameters by 50% (3*d*d_ff versus 2*d*d_ff). Any comparison done that way is measuring EXTRA CAPACITY, not the gating mechanism, and it will flatter SwiGLU for the wrong reason. The correct procedure is to hold parameters (and ideally FLOPs) constant by setting d_ff to about 8/3 * d_model, so 3 * d * (8/3)d = 8*d^2, exactly matching the classic 4x two-matrix FFN. Shazeer's paper does this, and the gain survives - which is what makes the result credible. In practice implementations then round d_ff to a hardware-friendly multiple (64 or 256), which is why real models show numbers like 11008 for d_model 4096 rather than a clean 10922. THE GENERAL LESSON about architecture comparison, which I would emphasize because it transfers: whenever you compare two architectural variants, fix the resource that matters - parameters, FLOPs, wall-clock training time, or all three - and state which one you fixed. A great many published architectural 'improvements' are capacity increases in disguise, and the ResNet-Strikes-Back and ConvNeXt papers made the parallel point for vision, that much of the reported gap between architectures was training recipes rather than architecture. THE COSTS OF SwiGLU worth mentioning: three matmuls instead of two means slightly more kernel launches and a less trivial fusion pattern, and the odd d_ff values complicate tensor-parallel sharding. Both are minor, which is why the trade was accepted."
        },
        {
          "q": "Walk through everything that changed between the 2017 transformer block and a modern LLaMA-style block.",
          "a": "The SKELETON is unchanged - attention sublayer, feed-forward sublayer, residual connection around each, normalization - which is why the original paper still reads as current. Every COMPONENT inside has been replaced. Taking them one at a time, with the justification for each: (1) POST-NORM -> PRE-NORM. Original: x <- LN(x + Sublayer(x)). Modern: x <- x + Sublayer(LN(x)). Reason: pre-norm leaves a clean identity residual path, so gradients reach early layers undisturbed and deep stacks train without a learning-rate warmup and tolerate higher learning rates. This is the change with the clearest optimization justification (Xiong et al., 2020), and it is what made 100-layer models routine. Requires a final LayerNorm after the last block. (2) LayerNorm -> RMSNorm. Drop the mean-subtraction and the bias, keep the RMS rescale and gain. Reason: cheaper (normalization is bandwidth-bound and runs 2N times per pass), equal quality. Implication: re-centering was never the important part. (3) SINUSOIDAL/LEARNED ABSOLUTE POSITION -> RoPE. Rotate queries and keys by an angle proportional to position so their dot product depends only on relative offset. Reason: relative position by construction rather than by learning, no added parameters, compatible with FlashAttention, and - decisively - EXTENSIBLE, since position enters as a frequency you can rescale (position interpolation, NTK-aware scaling, YaRN) to stretch context. This is the change with a real mathematical justification. (4) MULTI-HEAD ATTENTION -> GROUPED-QUERY ATTENTION. Keep many query heads but share key/value heads across groups. Reason: the KV cache dominates inference memory at long context and high batch, and GQA cuts it by the grouping factor (LLaMA-2 70B: 64 query heads, 8 KV groups, 8x reduction) at near-parity quality. Purely a serving-economics change - it does not help training. (5) ReLU/GELU FFN -> SwiGLU. Gated FFN with three matrices and d_ff ~ 8/3*d_model to match parameters. Reason: consistent perplexity improvement at matched cost, mechanism not established. (6) BIASES REMOVED from attention and FFN projections (and from the norms). Reason: no measurable quality loss, marginally better training stability at scale, fewer parameters and ops. PaLM's paper reported improved stability; it is now standard. (7) SMALLER CHANGES worth knowing: weight tying between embedding and unembedding is now often dropped in large models; dropout is frequently set to zero for large-scale pretraining (there is more than enough data, so the regularization is unnecessary and costs throughput); vocabulary and tokenizer choices got a lot of attention; and attention logit stabilization (QK-norm, logit soft-capping) appears in several recent models. WHAT THIS TELLS YOU, and the framing I would end on: the transformer's SKELETON has proven remarkably durable - eight years of intense scrutiny and the fundamental structure (alternate communication and computation, with residuals) survived unchanged. What changed is every component, each replaced after one-change-at-a-time ablation at scale. Two of the changes (pre-norm, RoPE) have principled justifications; three (RMSNorm, SwiGLU, no-bias) are empirical wins whose mechanisms are not established; and one (GQA) is driven entirely by inference economics rather than quality. Being able to sort them into those categories - principled, empirical, economic - is a better answer than listing them."
        },
        {
          "q": "Why do modern LLMs remove bias terms from their linear layers?",
          "a": "THE CHANGE. In a classic transformer, the Q/K/V/O projections, both FFN matrices, and the LayerNorms all carry bias terms. Modern models (PaLM, LLaMA and successors) drop them - linear layers are pure matmuls, and RMSNorm has a gain but no bias. THE REASONS, in order of how well-supported they are. (1) NO MEASURED QUALITY LOSS - the empirical basis. Ablations at scale show removing biases costs nothing detectable in loss or downstream performance. Since they cost something (parameters, memory traffic, an extra kernel or a fused add), removing something free is straightforward. (2) TRAINING STABILITY. The PaLM paper reported that removing biases from the dense layers improved training stability for large models. The mechanism is not rigorously established, but a plausible account: biases add a constant offset that interacts awkwardly with normalization (which will re-centre or re-scale anyway, partially undoing the bias), and they add parameters that can drift without a strong gradient signal, contributing to loss spikes. Note that the interaction with normalization is the key intuition - if a normalization immediately follows, an additive bias before it is at least partly redundant. (3) EFFICIENCY, though it is minor. Biases are a negligible fraction of parameters (d per matrix versus d^2), so memory savings are trivial; the real (small) win is one fewer elementwise op and simpler fused kernels, plus slightly simpler tensor-parallel sharding. (4) QUANTIZATION AND EXPORT are marginally simpler without biases in different numeric ranges than the weights. THE HONEST FRAMING - and this is the answer's substance: this is a case where the field removed something because it was NOT DOING ANYTHING, and the interesting question is why it was ever there. Biases are essential in a plain MLP - they let a unit shift its activation threshold. In a transformer, every linear layer is followed (or preceded) by a normalization with its own learned gain, and the residual stream carries an accumulated signal, so the network has other ways to realize offsets. The bias's function is largely absorbed elsewhere, which is exactly what you would predict from the fact that removing it costs nothing. WHERE BIASES REMAIN: the final unembedding/output layer sometimes keeps one, and some architectures keep biases in specific places. BERT-family and older models have them throughout. And in fine-tuning, BitFit showed you can fine-tune ONLY the biases and recover a surprising amount of full fine-tuning performance on smaller models - a nice counterpoint that biases are not useless, just redundant in the presence of everything else in a modern block, and a good detail to raise if the interviewer pushes. THE META-POINT worth making: 'we removed it and nothing happened' is a genuinely valuable experimental result, and a field that only ever adds components accumulates cruft. The modern block is notable as much for what was deleted (biases, mean-centering, dropout during large-scale pretraining, absolute position embeddings) as for what was added."
        },
        {
          "q": "How would you evaluate whether a proposed new block component is actually an improvement?",
          "a": "This is a methodology question, and the trap is that most claimed architectural improvements are confounded. I would insist on five things. (1) CONTROL THE RESOURCE, AND SAY WHICH ONE. Match PARAMETERS, FLOPs, and ideally wall-clock training time between the baseline and the variant - and state explicitly which you held fixed, because they can conflict. The SwiGLU case is the canonical example: three matrices instead of two means a naive same-d_ff comparison hands the variant 50% more FFN parameters, so the honest comparison sets d_ff to 8/3*d_model. A large fraction of published 'improvements' evaporate under matched-resource comparison, and the ResNet-Strikes-Back and ConvNeXt papers made exactly this point for vision - much of the reported CNN-vs-transformer gap was training recipe, not architecture. (2) TUNE BOTH ARMS EQUALLY. A new component often comes with hyperparameters tuned for it while the baseline uses defaults from a paper written years ago. Give the baseline the same tuning budget (learning rate, warmup, weight decay, initialization) - a new component that only wins at its own tuned learning rate is a learning-rate result, not an architecture result. (3) TEST AT MULTIPLE SCALES AND REPORT THE TREND. Small-scale results frequently do not transfer: components that help at 100M parameters can be neutral or harmful at 10B, and vice versa. Run at least three sizes and check whether the gap widens, holds, or closes - a gap that CLOSES with scale means the component is compensating for something scale fixes anyway, which is the most common failure mode for architecture proposals. Where possible, express the result as a shift in the scaling curve (equivalent compute multiplier) rather than a single delta. (4) REPORT VARIANCE, NOT A SINGLE RUN. Seed-to-seed variation in final loss is often comparable to the claimed improvement. Multiple seeds with a confidence interval, or at minimum the seed variance of the baseline, is the difference between a result and an anecdote. This is the same max-over-noise problem that inflates any best-of-N comparison. (5) MEASURE THE THINGS THAT ARE NOT PERPLEXITY. Wall-clock time per step (a component with better loss-per-step but worse loss-per-second is a loss); memory footprint; kernel support and whether it composes with FlashAttention, tensor parallelism, and quantization; inference cost, since training-time neutrality with worse serving economics is a bad trade; and downstream task performance, since perplexity and downstream quality can diverge. THE ORDER I WOULD ACTUALLY RUN IT: start with a small-scale matched-parameter A/B across 3 seeds and 2 learning rates each; if the effect survives with a gap larger than seed variance, scale up one step and check the trend; if it holds, measure throughput and memory and check kernel compatibility before recommending adoption. AND THE PRIOR I WOULD BRING: most proposed changes do not survive this. The modern component set is small precisely because it is the residue of many such tests - which is also why 'has this been ablated at scale, with matched parameters, at more than one size?' is the right first question to ask about any new block variant, including one's own."
        },
        {
          "q": "Why has the transformer's overall structure survived so long when every component was replaced?",
          "a": "This is worth answering because it separates 'what is essential' from 'what is incidental', which is the real content of the module. WHAT SURVIVED, and why each piece is load-bearing. (1) THE ALTERNATION OF COMMUNICATION AND COMPUTATION. Attention mixes information across positions; the FFN transforms each position independently. That factorization is both expressive and PARALLELIZABLE - which is the decisive property. An RNN's sequential dependency makes it impossible to use a GPU efficiently during training; the transformer's factorization means the whole sequence is processed at once, so the architecture can absorb arbitrarily more compute. The transformer won not because attention is uniquely good at modelling language but because it was the first sequence architecture that could USE modern hardware, and every subsequent scaling result depended on that. (2) RESIDUAL CONNECTIONS. They make depth trainable and, in the residual-stream framing, provide a shared communication channel every component reads and writes - which is what allows layers to compose into circuits rather than forming a brittle pipeline. (3) NORMALIZATION SOMEWHERE. The specific normalizer changed twice; having one is non-negotiable for stable optimization at depth (and even the normalization-free alternatives - Fixup, NFNets - work by achieving the same conditioning through initialization and scaling). (4) CONTENT-BASED, DATA-DEPENDENT ROUTING. Attention weights depend on the input, which is qualitatively different from a fixed convolution kernel. This is what gives in-context flexibility, and it is the property that state-space models had to work hardest to recover - Mamba's key innovation over earlier SSMs was making the state transitions INPUT-DEPENDENT (selective), i.e. reintroducing exactly this property. WHAT CHANGED, and why it was always going to: normalizer, activation and gating, positional scheme, head-sharing pattern, biases. All of these are LOCAL choices - swappable components that do not alter the information flow of the architecture. That is precisely why they could be optimized independently by one-change-at-a-time ablation, and why the changes compose without interacting badly. THE DEEPER READING, which I think is the real answer: the transformer is better understood as a FRAMEWORK than as a specific model - 'alternate parallel content-based routing with per-position computation, on a residual stream' - and the components are implementation details of that framework. The framework survived because it matches the hardware (dense matmuls, massive parallelism) and because it imposes minimal inductive bias, so it scales with data rather than being limited by built-in assumptions. The Bitter Lesson framing applies directly: architectures that impose fewer assumptions and absorb more compute win as compute grows, and the transformer is unusually good at absorbing compute. THE HONEST CAVEATS. (a) The framework has a real weakness - the O(T^2) attention cost - and the challengers (Mamba and state-space models, linear attention, hybrid designs) attack exactly that, with the current state of the art being hybrids that keep some full attention layers for retrieval-style behaviour and use cheaper mixing elsewhere. (b) 'It survived' is partly path dependence and ecosystem lock-in: the tooling, kernels (FlashAttention), and hardware co-design are all transformer-shaped, which raises the bar for any replacement well above 'slightly better on a benchmark'. (c) Some of the survival is that we scaled data and compute enormously, which flatters low-bias architectures - in a data-limited regime, more structured models can win, as CNNs still do in small-data vision. So the accurate statement is: the transformer's information-flow structure is well-matched to parallel hardware and to scale, its components were always incidental and were duly replaced, and its one structural weakness (quadratic attention) is where all the serious architectural competition is concentrated."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "RMSNorm",
        "back": "x / sqrt(mean(x^2) + eps) * gain. LayerNorm without the mean-subtraction and without the bias. Cheaper (one reduction, bandwidth-bound op run 2N times per pass), equal quality."
      },
      {
        "type": "intuition",
        "front": "What RMSNorm's success implies",
        "back": "Re-CENTERING was doing little work; only re-SCALING mattered. Consistent with the modern view that normalization helps by improving optimization conditioning, not by fixing 'internal covariate shift'."
      },
      {
        "type": "formula",
        "front": "SwiGLU",
        "back": "(Swish(x W_gate) * (x W_up)) W_down - three matrices, an elementwise product giving multiplicative interaction. Swish(z) = z*sigmoid(z)."
      },
      {
        "type": "pitfall",
        "front": "SwiGLU needs d_ff = 8/3 * d_model",
        "back": "Three matrices instead of two: at 4x expansion SwiGLU has 50% MORE FFN parameters. Use 8/3*d_model (rounded to a multiple of 64) to match the classic FFN's 8*d^2 - otherwise you are measuring capacity, not gating."
      },
      {
        "type": "intuition",
        "front": "Why gating helps - the honest answer",
        "back": "Not established. Shazeer's GLU paper reports the gain and explicitly declines to explain it. Plausible: multiplicative interactions + data-dependent information flow. Say 'reliably measured, not understood'."
      },
      {
        "type": "definition",
        "front": "The modern (LLaMA) block",
        "back": "Pre-norm RMSNorm + no biases + RoPE + grouped-query attention + SwiGLU FFN. Same 2017 skeleton, every component replaced. LLaMA, Mistral, Qwen, Gemma, DeepSeek all use this set."
      },
      {
        "type": "intuition",
        "front": "Why biases were removed",
        "back": "No measured quality loss + better stability at scale (PaLM). Their function is largely absorbed by the normalization's gain and the residual stream. Counterpoint: BitFit shows bias-only fine-tuning works, so they are redundant, not useless."
      },
      {
        "type": "intuition",
        "front": "Sorting the modern changes",
        "back": "PRINCIPLED: pre-norm (gradient path), RoPE (relative position by construction). EMPIRICAL: RMSNorm, SwiGLU, no-bias. ECONOMIC: GQA (KV-cache size, not quality). Knowing which is which beats listing them."
      },
      {
        "type": "pitfall",
        "front": "Evaluating a new component",
        "back": "Match parameters AND FLOPs; tune both arms equally; test at 3+ scales and check whether the gap widens or closes; report seed variance; measure wall-clock, memory, and kernel compatibility - not just perplexity."
      },
      {
        "type": "intuition",
        "front": "Why the skeleton survived",
        "back": "Alternating content-based routing with per-position computation is PARALLELIZABLE - it can absorb arbitrary compute, unlike an RNN. Components are local, swappable details. The one structural weakness, O(T^2) attention, is where all serious competition sits."
      }
    ],
    "refs": [
      {
        "title": "Zhang & Sennrich (2019), Root Mean Square Layer Normalization",
        "url": "https://arxiv.org/abs/1910.07467"
      },
      {
        "title": "Shazeer (2020), GLU Variants Improve Transformer",
        "url": "https://arxiv.org/abs/2002.05202"
      },
      {
        "title": "Touvron et al. (2023), LLaMA: Open and Efficient Foundation Language Models",
        "url": "https://arxiv.org/abs/2302.13971"
      },
      {
        "title": "Santurkar et al. (2018), How Does Batch Normalization Help Optimization?",
        "url": "https://arxiv.org/abs/1805.11604"
      }
    ],
    "demos": [
      "activations",
      "batch-norm",
      "attention"
    ]
  },
  "gqa-mqa": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This is an architecture change made entirely for INFERENCE ECONOMICS, which makes it unusual and worth understanding as a case study. During autoregressive generation, every previously-computed key and value must be kept in a KV CACHE so each new token can attend to the whole history. That cache is proportional to layers x heads x head_dim x sequence length x batch - and at long context or high batch it does not merely add to memory pressure, it EXCEEDS THE MODEL WEIGHTS. Worse, decoding is memory-bandwidth-bound: generating one token requires reading the entire cache, so cache size translates almost directly into tokens-per-second.",
        "MULTI-QUERY ATTENTION (Shazeer, 2019) takes the extreme position: keep all h QUERY heads, but use a SINGLE shared key head and value head that every query head attends against. The cache shrinks by a factor of h - for a 32-head model, 32x smaller. The cost is a measurable quality drop and, in practice, training instability. GROUPED-QUERY ATTENTION (Ainslie et al., 2023) is the compromise that won: partition the query heads into g groups, each group sharing one key/value head. g = h recovers standard multi-head attention, g = 1 is MQA, and intermediate values give a tunable dial. LLaMA-2 70B uses 64 query heads with 8 KV groups: an 8x cache reduction at essentially no quality loss.",
        "The reason this works is worth stating because it is not obvious. Query heads are where the DIVERSITY of attention patterns lives - each head asks a different question. Keys and values are closer to a shared representation of 'what is at each position', which multiple query heads can reasonably read from with different questions. So sharing K and V costs less than the parameter count suggests. And there is a practical bonus that made adoption easy: GQA can be UPTRAINED - take an existing multi-head checkpoint, mean-pool the key/value heads within each group, and continue training on ~5% of the original tokens to recover quality, so you do not need to pretrain from scratch to convert a model."
      ],
      "math": [
        {
          "h": "KV cache size - the quantity being optimized",
          "paras": [
            "Everything about this topic follows from one formula. Note what it does NOT contain: the number of QUERY heads. Only the key/value head count enters, which is exactly the lever GQA pulls."
          ],
          "tex": "\\text{KV bytes} = 2 \\times n_{\\text{layers}} \\times n_{\\text{kv\\_heads}} \\times d_k \\times T \\times B \\times \\text{bytes/elt}",
          "texNote": "The leading 2 is for K and V. Example - LLaMA-2 70B (80 layers, d_k=128) at T=4096, B=1, fp16: with 64 KV heads that is 2*80*64*128*4096*2 = 21.5 GB; with 8 KV groups, 2.7 GB. The model weights are ~140 GB in fp16, so at batch 32 the un-grouped cache would dwarf them."
        },
        {
          "h": "The GQA interpolation",
          "paras": [
            "GQA is a single parameter g between the two extremes. Query heads within a group all attend against the same K and V, so the attention computation is unchanged - only the number of distinct K/V projections shrinks, which shrinks both the projection parameters and, decisively, the cache."
          ],
          "tex": "\\mathrm{head}_i = \\mathrm{Attn}\\big(Q_i,\\; K_{\\lceil i/(h/g) \\rceil},\\; V_{\\lceil i/(h/g) \\rceil}\\big), \\qquad g=h \\Rightarrow \\text{MHA}, \\quad g=1 \\Rightarrow \\text{MQA}",
          "texNote": "h = query heads, g = KV groups, so h/g query heads share each KV head. Cache reduction is exactly h/g. LLaMA-2 70B: h=64, g=8, so 8 query heads per KV head and an 8x smaller cache."
        }
      ],
      "code": [
        {
          "h": "Grouped-query attention, with the repeat_kv trick",
          "paras": [
            "The implementation is standard multi-head attention with one extra step: expand the g KV heads to h by repeating each one h/g times, so the attention math is unchanged. Note that the repeat is a VIEW-style expansion for the compute - the CACHE only ever stores g heads, which is the entire point."
          ],
          "code": "import torch, torch.nn as nn, math\n\ndef repeat_kv(x, n_rep):                       # (B, g, T, d_k) -> (B, g*n_rep, T, d_k)\n    B, g, T, d = x.shape\n    if n_rep == 1: return x\n    return x[:, :, None].expand(B, g, n_rep, T, d).reshape(B, g * n_rep, T, d)\n\nclass GroupedQueryAttention(nn.Module):\n    def __init__(self, d_model=4096, n_heads=32, n_kv_heads=8):\n        super().__init__()\n        assert n_heads % n_kv_heads == 0\n        self.h, self.g, self.d_k = n_heads, n_kv_heads, d_model // n_heads\n        self.n_rep = n_heads // n_kv_heads\n        self.wq = nn.Linear(d_model, n_heads    * self.d_k, bias=False)\n        self.wk = nn.Linear(d_model, n_kv_heads * self.d_k, bias=False)   # SMALLER\n        self.wv = nn.Linear(d_model, n_kv_heads * self.d_k, bias=False)   # SMALLER\n        self.wo = nn.Linear(n_heads * self.d_k, d_model, bias=False)\n\n    def forward(self, x, cache=None):\n        B, T, _ = x.shape\n        q = self.wq(x).view(B, T, self.h, self.d_k).transpose(1, 2)\n        k = self.wk(x).view(B, T, self.g, self.d_k).transpose(1, 2)\n        v = self.wv(x).view(B, T, self.g, self.d_k).transpose(1, 2)\n        if cache is not None:\n            k, v = cache.append(k, v)              # the cache stores only g heads\n        k, v = repeat_kv(k, self.n_rep), repeat_kv(v, self.n_rep)   # expand for compute\n        att = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_k)\n        out = (att.softmax(-1) @ v).transpose(1, 2).reshape(B, T, -1)\n        return self.wo(out)",
          "caption": "GQA is standard attention plus repeat_kv: the cache holds g key/value heads and they are expanded to h only for the matmul. Query projections stay full-size - the diversity of attention patterns is preserved, only the shared representation is compressed."
        },
        {
          "h": "What the cache reduction actually buys",
          "paras": [
            "The numbers are the argument. Cache size falls linearly with the grouping factor, which raises the batch size that fits in memory, which raises throughput - and separately raises decode speed because fewer cache bytes must be read per token."
          ],
          "code": "def kv_gb(n_layers, n_kv, d_k, T, batch, bytes_per=2):\n    return 2 * n_layers * n_kv * d_k * T * batch / 1e9 * bytes_per\n\n# LLaMA-2 70B geometry: 80 layers, 64 query heads, d_k=128, fp16 cache\nfor n_kv, label in [(64, 'MHA'), (8, 'GQA-8'), (1, 'MQA')]:\n    for T in (4096, 32768):\n        print(f'{label:6s} T={T:6d}  B=1: {kv_gb(80,n_kv,128,T,1):6.2f} GB'\n              f'   B=32: {kv_gb(80,n_kv,128,T,32):7.1f} GB')\n# MHA    T=  4096  B=1:  21.47 GB   B=32:   687.2 GB   <- impossible\n# GQA-8  T=  4096  B=1:   2.68 GB   B=32:    85.9 GB\n# MQA    T=  4096  B=1:   0.34 GB   B=32:    10.7 GB\n# GQA-8  T= 32768  B=1:  21.47 GB   B=32:   687.2 GB   <- long context re-creates it\n#\n# quality (Ainslie et al., uptrained T5-XXL, average over benchmarks):\n#   MHA 47.2  |  GQA-8 47.1  |  MQA 46.6   -> GQA is ~free, MQA costs real quality",
          "caption": "The cache reduction is linear in the grouping factor and decides what batch size fits. GQA-8 gives 8x with essentially no quality cost; MQA gives 64x but a measurable drop - which is why GQA became the default. Note long context re-creates the problem at any grouping."
        }
      ],
      "useCases": [
        "Essentially every modern LLM: LLaMA-2 70B and LLaMA-3, Mistral, Qwen, Gemma and most recent open models ship GQA, because serving cost rather than benchmark score is what determines whether a model is deployable.",
        "High-throughput serving: the cache determines how many concurrent sequences fit in memory, so an 8x reduction translates roughly into 8x the batch size, and throughput in a continuous-batching server scales with batch - the single largest lever after quantization.",
        "Long-context deployment: cache grows linearly with sequence length, so a 128K-context model is unserveable with full multi-head attention; GQA is a prerequisite for long context, alongside paged attention and cache quantization.",
        "Converting existing models: uptraining lets you take a trained multi-head checkpoint, mean-pool its KV heads into groups, and recover quality with ~5% of the original pretraining compute - so GQA is available retroactively, not only at design time."
      ],
      "pitfalls": [
        "Expecting GQA to speed up TRAINING: during training the whole sequence is processed in parallel with no cache, so GQA saves only the small KV projection parameters. Its benefit is almost entirely at inference - a distinction interviewers probe.",
        "Confusing head-count reduction with FLOP reduction: after repeat_kv the attention matmuls are the same size as standard multi-head attention. What shrinks is the CACHE (memory and bandwidth), not the arithmetic.",
        "Going straight to MQA because the reduction is bigger: MQA's quality drop is real and it was reported to be less stable to train. GQA-8 captures most of the benefit for almost none of the cost, which is why it, not MQA, became standard.",
        "Assuming GQA solves long context: cache size is linear in sequence length, so an 8x reduction buys 8x the length at the same memory - a 32K context with GQA-8 costs what 4K cost with MHA. You still need paged attention, cache quantization, or a windowed scheme.",
        "Naively averaging KV heads when converting a checkpoint without any uptraining: mean-pooling is the right initialization but quality does not fully recover without continued training on a small token budget."
      ],
      "connections": [
        {
          "ref": "transformers/kv-cache",
          "text": "The cache is what GQA exists to shrink - that lesson derives why the cache is necessary and how its size and bandwidth dominate decode latency."
        },
        {
          "ref": "transformers/multi-head-attention",
          "text": "GQA is a direct modification of that operator: keep the query heads, share the key/value heads. Understanding why heads specialize is what makes the asymmetry sensible."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Cache size scales linearly with context length, so GQA is one component of long-context serving alongside paged attention, cache quantization, and windowed attention."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The whole justification is serving economics - batch size, throughput, and tokens-per-second - which is where the architectural decision is actually evaluated."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is multi-query attention (MQA)?",
          "a": "All query heads share a SINGLE key head and value head. Cache shrinks by a factor of h (the head count), at a measurable quality cost."
        },
        {
          "q": "What is grouped-query attention (GQA)?",
          "a": "Query heads are partitioned into g groups, each group sharing one KV head. g=h is standard MHA, g=1 is MQA; intermediate g interpolates."
        },
        {
          "q": "What problem do they solve?",
          "a": "KV cache size at inference. The cache is proportional to n_kv_heads, and at long context or high batch it exceeds the model weights and dominates decode bandwidth."
        },
        {
          "q": "What is the KV cache formula?",
          "a": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. The 2 is for K and V. Note query head count does NOT appear."
        },
        {
          "q": "How much does LLaMA-2 70B save?",
          "a": "64 query heads with 8 KV groups = 8x smaller cache: ~21.5 GB down to ~2.7 GB at 4K context, batch 1, fp16."
        },
        {
          "q": "Does GQA reduce FLOPs?",
          "a": "Barely. After repeat_kv the attention matmuls are full-size; only the KV projection parameters shrink. The win is cache memory and bandwidth."
        },
        {
          "q": "Does GQA speed up training?",
          "a": "Essentially no - training processes the sequence in parallel with no cache. The benefit is at inference."
        },
        {
          "q": "Why is sharing K and V acceptable but sharing Q is not?",
          "a": "Query heads carry the DIVERSITY of attention patterns (each asks a different question); K/V are closer to a shared representation of what is at each position, which several queries can read differently."
        },
        {
          "q": "What is uptraining?",
          "a": "Converting an existing MHA checkpoint to GQA by mean-pooling KV heads within each group, then continuing training on ~5% of the original tokens to recover quality."
        },
        {
          "q": "Why did GQA beat MQA?",
          "a": "MQA's quality drop is real and it trained less stably; GQA-8 captures nearly all of the memory benefit with essentially no quality cost."
        },
        {
          "q": "Does GQA solve long context?",
          "a": "No - it divides the cache by a constant, but the cache still grows linearly with T. It is one component alongside paged attention, cache quantization, and windowed attention."
        },
        {
          "q": "What is repeat_kv?",
          "a": "The implementation step that expands g cached KV heads to h for the attention matmul, so the math matches standard multi-head attention while the cache stores only g."
        }
      ],
      "standard": [
        {
          "q": "Explain the KV cache problem and how MQA and GQA address it.",
          "a": "WHY THE CACHE EXISTS. In autoregressive generation you produce one token at a time. Naively, generating token t would require re-running attention over the whole prefix, recomputing keys and values for every earlier position - O(T^2) work per token and O(T^3) for the sequence. But keys and values for past positions do not change (they depend only on those positions' hidden states), so you CACHE them: each step computes K and V only for the new token, appends them, and attends against the whole cache. That takes per-token cost from O(T^2) to O(T) and is non-negotiable for practical generation. THE PROBLEM THE CACHE CREATES. Its size is 2 * n_layers * n_kv_heads * d_k * T * batch * bytes_per_element. Two consequences. (1) MEMORY: for LLaMA-2 70B (80 layers, 64 heads, d_k=128) at 4K context in fp16, that is ~21.5 GB per SEQUENCE. At batch 32 it would be ~690 GB - far beyond any node, while the model weights are ~140 GB. So the cache, not the weights, is what limits batch size, and batch size is what determines serving throughput. (2) BANDWIDTH: decoding is memory-bandwidth-bound. Generating one token requires reading the entire cache (plus all the weights) to do a small amount of arithmetic, so tokens-per-second is roughly bounded by (bytes to read) / (memory bandwidth). Halving the cache nearly halves the read volume at long context. THE FIX - SHARE KEY/VALUE HEADS. Notice the formula contains n_kv_heads but NOT the number of query heads. So you can keep all the query heads (where the diversity of attention patterns lives) and reduce only the K/V heads. MQA (Shazeer, 2019) takes this to the limit: ONE key head and one value head shared by all query heads, an h-fold reduction. GQA (Ainslie et al., 2023) generalizes: g groups of query heads, each sharing one KV head, giving an h/g reduction with g as a tunable dial. WHY SHARING K/V IS ACCEPTABLE. The intuition is asymmetry: each query head asks a different QUESTION ('what is the subject of this verb?', 'what token preceded this one?'), so query diversity is where the representational value is. Keys and values are closer to a shared description of what exists at each position, which several different questions can reasonably read from. Empirically this holds up - Ainslie et al.'s uptrained T5-XXL results show MHA at 47.2 average, GQA-8 at 47.1 (a rounding error), and MQA at 46.6 (a real drop). So GQA-8 is close to free while MQA is not. THE PRACTICAL DETAILS THAT MATTER. (a) It does NOT reduce FLOPs meaningfully - after repeat_kv the attention matmuls are full size. The win is memory and bandwidth, which is exactly what decode is limited by. (b) It does NOT help training, where the sequence is processed in parallel with no cache. (c) UPTRAINING makes it retrofittable: mean-pool an existing model's KV heads within each group as initialization, then continue training on ~5% of the original token budget to recover quality - which is why GQA spread so quickly, since labs did not have to pretrain from scratch. (d) It does not solve long context on its own, since the cache is still linear in T - an 8x reduction buys 8x the length at fixed memory, so a 32K GQA-8 model costs what 4K MHA cost. WHERE THIS SITS IN THE STACK: GQA is one of four standard cache optimizations, alongside PAGED ATTENTION (vLLM - eliminate the fragmentation from pre-allocating max-length caches, typically a several-fold effective batch improvement), CACHE QUANTIZATION (int8 KV, another 2x), and WINDOWED or evicting caches for very long contexts. They compose, and a production system uses all of them.",
          "deepDive": {
            "q": "Multi-head latent attention (MLA) claims to beat GQA. How does it work, and what is the trade-off?",
            "a": "THE IDEA. MLA (introduced in DeepSeek-V2, refined in V3) attacks the same problem from a different angle: instead of REDUCING THE NUMBER of key/value heads, it COMPRESSES what is cached. Keys and values are projected down into a shared low-rank LATENT vector, and only that latent is stored in the cache; the full per-head keys and values are RECONSTRUCTED on the fly by up-projection during attention. So the cache holds a compressed representation rather than fewer heads. WHY THAT IS BETTER IN PRINCIPLE. GQA is a crude form of compression - it forces groups of heads to share exactly the same K/V, which is a hard structural constraint. MLA lets the model LEARN what to keep, using a low-rank bottleneck that can retain the components that matter most across all heads. So for the same cache budget you can preserve more information, or for the same quality you can use a smaller cache. DeepSeek reports MLA achieving a cache smaller than GQA's while matching or exceeding full multi-head attention quality - which is the claim that made it notable, since GQA at best matches MHA. THE KEY IMPLEMENTATION TRICK, which is where the cleverness lies: naively you would decompress the latent into full K and V at every step, which costs extra compute per token and could erase the bandwidth win. Instead, the up-projection matrices can be ABSORBED into the query and output projections (matrix associativity: (W_up^K)^T inside the q-k dot product can be folded into W_Q), so at inference you never materialize the full K/V - you compute attention directly against the compressed latent with modified query projections. That is what makes it cheap rather than a compute-for-memory trade. THE COMPLICATION - RoPE. Rotary embeddings are applied to keys and queries in a position-dependent way, which breaks the absorption trick: you cannot fold a position-dependent rotation into a static matrix. DeepSeek's solution is DECOUPLED RoPE - split the head dimension into a compressed part (no RoPE, absorbed) and a small separate part that carries RoPE and is cached uncompressed. It works but it is genuinely fiddly, and this interaction is the main reason MLA is harder to implement than GQA. THE TRADE-OFFS, stated honestly. (a) COMPLEXITY: GQA is a five-line change to an attention implementation; MLA requires the low-rank projections, the absorption arithmetic, and the decoupled-RoPE handling. That matters enormously for ecosystem adoption - every inference framework supports GQA, whereas MLA needs bespoke kernels. (b) COMPUTE: MLA adds projection work, so it trades a little arithmetic for memory - usually a good trade in a bandwidth-bound decode regime, but it means MLA can be slower in compute-bound prefill. (c) EVIDENCE BASE: GQA has been validated by many labs across many models; MLA's evidence is strong but concentrated in DeepSeek's models, so the independent replication base is thinner. (d) NOT RETROFITTABLE the way GQA is - you cannot mean-pool your way to MLA from an existing checkpoint as easily, so it is a pretraining-time decision. WHAT I WOULD CONCLUDE: MLA is the more principled solution - learned low-rank compression strictly generalizes 'force heads to share' - and its results are genuinely impressive. GQA remains the pragmatic default because it is trivial to implement, universally supported by serving frameworks, retrofittable by uptraining, and already captures most of the available win. This is a good example of the recurring pattern where the better idea loses on ecosystem effects until the tooling catches up, and it is worth watching whether MLA (or something like it) becomes standard as kernel support matures."
          }
        },
        {
          "q": "Why can you share keys and values across heads but not queries? What does that tell you about attention?",
          "a": "THE ASYMMETRY, stated first: query heads carry the DIVERSITY of the operation; key and value heads carry a shared description of the content. Sharing the latter costs little; sharing the former would collapse the whole point of multi-head attention. WHY QUERIES MUST STAY DISTINCT. Each query head defines what the position is LOOKING FOR - its own projection into a subspace, i.e. its own notion of 'relevant'. If all heads shared one query projection, every head would compute the SAME attention distribution (given shared K), and multi-head attention would degenerate to single-head attention with a wider value space. The entire motivation - one head tracks syntactic subjects, another tracks the previous token, another does coreference - depends on the queries differing. So query diversity is the mechanism, not an incidental detail. WHY KEYS AND VALUES CAN BE SHARED. Keys and values describe WHAT IS AT each position - a representation of that token's content in a form other positions can match against and retrieve. There is a plausible sense in which one good content representation can serve many different questions: the key vector says 'this position contains a noun phrase referring to a person', and different query heads can match against different aspects of that same description. The empirical result supports this - Ainslie et al. found GQA-8 essentially matching full multi-head attention (47.1 vs 47.2 on their benchmark average), so eight KV heads suffice for sixty-four query heads. WHAT IT TELLS YOU ABOUT ATTENTION - three inferences. (1) THE INFORMATION IN K/V IS LOWER-RANK THAN THE HEAD COUNT SUGGESTS. If sixty-four distinct key/value projections can be compressed to eight with no measured loss, then the per-head K/V projections in a trained MHA model were substantially redundant. That is consistent with the head-pruning literature (most heads are removable) and with MLA's success at low-rank cache compression - all three point at the same conclusion, that the K/V side of attention is over-parameterized. (2) THE 'RETRIEVAL' FRAMING IS APT. Attention behaves like a soft dictionary lookup: keys index content, values are the content, queries are the lookup requests. In a database you do not need a separate index per query type - you need a good index and many query patterns. GQA is exactly that intuition made architectural. (3) IT LOCATES WHERE CAPACITY MATTERS. If you have a fixed budget, spend it on query diversity (many heads asking different questions) rather than on K/V capacity. That is a non-obvious design principle, and it is the actionable content of the result. THE LIMITS OF THE ASYMMETRY, for honesty: it is not free. MQA (g=1) does show a real quality drop, so there IS information in having multiple K/V heads - just less than in having multiple query heads. And the tolerable grouping factor likely depends on scale and task; GQA-8 is a convention validated at particular model sizes, not a proven optimum. A GOOD FOLLOW-UP TO ANTICIPATE: 'could you share queries instead and keep K/V distinct?' The answer is that it would not help - the cache stores K and V, not Q (queries are computed fresh for each new token and discarded), so sharing queries would save nothing at inference while destroying the head diversity that makes attention work. That the optimization targets exactly the tensors that get cached, and leaves the others alone, is what makes GQA an elegant fit to the actual constraint rather than a generic compression."
        },
        {
          "q": "You are deploying a 70B model with 32K context for many concurrent users. Walk through the memory budget.",
          "a": "I would lay out the three consumers of GPU memory, then optimize the one that binds. THE BUDGET. (1) WEIGHTS: 70B parameters at fp16 is 140 GB; at int8 ~70 GB; at int4 ~35 GB. This is FIXED cost, paid once regardless of how many users you serve - so it amortizes with batch size. (2) KV CACHE: 2 * n_layers * n_kv_heads * d_k * T * batch * bytes. For LLaMA-2-70B geometry (80 layers, d_k 128) with GQA-8 at 32K context in fp16: 2*80*8*128*32768*2 bytes = ~21.5 GB PER SEQUENCE. With full MHA (64 KV heads) it would be ~172 GB per sequence - a single user would not fit on an 8xA100 node. This scales with BOTH context length and batch, and it is the variable cost. (3) ACTIVATIONS: transient per-token working memory during the forward pass, modest for decode (a few hundred MB) but significant during PREFILL of a long prompt, where you process many tokens at once. THE ARITHMETIC ON A CONCRETE NODE. Take 8xA100-80GB = 640 GB total. Weights at fp16: 140 GB, leaving ~500 GB minus framework overhead, say ~450 GB usable for cache. At 21.5 GB per sequence at full 32K, that is about 20 concurrent sequences. That number is the entire answer to 'how many users can I serve', and it is set by the cache, not the weights. THE OPTIMIZATIONS, in order of impact. (a) QUANTIZE THE WEIGHTS to int8 or int4: frees 70-105 GB for cache, taking us to ~25-30 concurrent sequences, and speeds decode (bandwidth-bound on weight reads). Usually the first move. (b) PAGED ATTENTION (vLLM): the naive implementation pre-allocates the full max-length cache per sequence, so a user who sends a 2K prompt and generates 500 tokens still occupies 32K worth of cache. Paged attention allocates in blocks on demand, eliminating that internal fragmentation - typically a 2-4x improvement in effective batch size, and it is nearly free. Usually the largest single win. (c) QUANTIZE THE KV CACHE to int8: another 2x on the dominant term, with small quality cost (per-channel or per-token scaling matters here). (d) CONTINUOUS BATCHING: schedule at the token level so finished sequences release memory immediately and new requests join without waiting for a batch boundary - large throughput gains under real traffic patterns. (e) PREFIX CACHING: if many requests share a system prompt, compute its KV once and share it - can be a huge win for chat products with a long shared preamble. (f) EXPLOIT THE ACTUAL LENGTH DISTRIBUTION: most requests do not use the full 32K. Provisioning for the P95 rather than the maximum, with admission control for the rare long ones, is often worth more than any technical optimization. THE ARCHITECTURAL DECISION IF I OWNED THE MODEL: GQA is already assumed above and is non-negotiable at this context length - without it, one user needs 172 GB and the deployment is impossible. If designing from scratch I would also evaluate MLA for a further cache reduction, and consider a sliding-window or hybrid attention pattern if the workload does not genuinely need full 32K attention. WHAT I WOULD MEASURE, because a memory budget is a means not an end: tokens/second per user (latency, driven by bandwidth), total tokens/second across the node (throughput, driven by batch size), time-to-first-token (prefill, driven by compute and by prompt length), and the P95 of each under realistic traffic. The tension to name explicitly is that larger batches raise throughput but also raise per-user latency, so the operating point is a product decision - a chat UI needs low TTFT and steady streaming, while a batch summarization job wants maximum throughput and does not care about latency at all."
        },
        {
          "q": "What is uptraining, and why does it matter for GQA adoption?",
          "a": "THE PROBLEM IT SOLVES. GQA is an architectural change, and normally that means pretraining from scratch - which for a 70B model is millions of dollars and months of compute. If the only way to get GQA were to retrain, adoption would have been slow and limited to labs starting new models. Uptraining removes that barrier. THE PROCEDURE (Ainslie et al., 2023). (1) CONVERT: take an existing multi-head checkpoint with h key/value heads. Partition them into g groups. For each group, MEAN-POOL the key projection matrices and, separately, the value projection matrices, producing one K and one V projection per group. Mean pooling (rather than picking one head, or random initialization) is the important detail - it preserves the average behaviour of the group and gives a much better starting point. (2) UPTRAIN: continue pretraining the converted model on the ORIGINAL pretraining distribution for a small fraction of the original token budget - the paper used about 5%. Quality recovers to near the original model's level. So for roughly 5% of the pretraining cost, you convert an MHA model into a GQA model with an 8x smaller cache. WHY MEAN POOLING WORKS. The converted model must produce sensible attention immediately or the continued training would be closer to retraining. Mean-pooling the KV projections means each group's shared key is the average of what those heads previously computed, so query heads in that group see a blurred but structurally correct version of what they expect. Since (per the previous question) the K/V side is substantially redundant across heads, the averaged version loses less than you would fear, and a small amount of training lets the query heads adapt to it. WHY IT MATTERED FOR ADOPTION - the practical significance. (a) It let labs ship GQA versions of models they had ALREADY trained, so the technique spread within months rather than model generations. (b) It made the quality claim credible: because you can convert the SAME checkpoint and compare, the MHA-vs-GQA-vs-MQA comparison is controlled - same data, same pretraining, only the attention structure differs. That is a much stronger experimental design than comparing separately-pretrained models, and it is why the 47.2 / 47.1 / 46.6 numbers are persuasive. (c) It reduced the risk of adopting GQA for a new pretraining run, since the technique had been validated cheaply first. THE GENERAL PATTERN worth naming, because it transfers: 'convert an existing checkpoint with a sensible initialization, then briefly continue training' is a broadly applicable recipe for architectural changes, and you see the same move elsewhere - I3D's inflation of 2D ImageNet weights into a 3D video network (copy kernels across time, divide by the temporal extent), position-interpolation for extending RoPE context (rescale positions, fine-tune briefly), and depth/width expansion techniques like Net2Net that grow a trained model. In each case the trick is finding an initialization under which the new architecture initially COMPUTES SOMETHING CLOSE TO the old one, so training only has to repair rather than relearn. If asked to design a conversion for some other architectural change, that is the principle to apply: find the initialization that makes the new model a near-identity transformation of the old, then train briefly."
        },
        {
          "q": "GQA reduces the KV cache by a constant factor. What do you do when that is not enough?",
          "a": "GQA divides the cache by h/g, but the cache is still LINEAR in sequence length and batch - so at 128K context or high concurrency the problem returns. There are five further families of answers, and a production system usually combines several. (1) COMPRESS THE CACHE'S REPRESENTATION. KV QUANTIZATION to int8 or int4 gives another 2-4x with modest quality cost; the practical details matter (per-token or per-channel scaling, and keys are typically more sensitive than values, so asymmetric precision - int8 keys, int4 values - is common). MLA (DeepSeek) compresses K/V into a learned low-rank latent and caches only that, achieving a smaller cache than GQA while matching full-attention quality; it is more principled than head-sharing but requires bespoke kernels and careful RoPE handling. (2) MANAGE THE MEMORY BETTER RATHER THAN SHRINKING IT. PAGED ATTENTION (vLLM) is the biggest practical win in this category: allocating cache in fixed-size blocks on demand eliminates the internal fragmentation of pre-allocating max-length caches per sequence, typically improving effective batch size several-fold with no quality cost at all. Prefix sharing (one copy of a shared system prompt's cache across requests) is similarly free when the workload has a common preamble. (3) STORE LESS OF THE SEQUENCE. SLIDING-WINDOW attention (Mistral) keeps only the last W tokens per layer, making the cache constant-size regardless of length, with information propagating further through depth. ATTENTION SINKS / StreamingLLM adds the crucial fix that you must retain the first few tokens - models dump attention mass onto initial tokens, and evicting them destroys the distribution. EVICTION policies (H2O and similar) keep the tokens that have historically received the most attention and drop the rest. All of these are LOSSY: you are betting that distant detail is not needed, which is fine for streaming chat and wrong for long-document retrieval. (4) CHANGE WHERE THE MEMORY LIVES. Offload cold parts of the cache to CPU memory or NVMe and stream them back (with the obvious bandwidth cost), or recompute rather than store - trading compute for memory by dropping cache for some layers and recomputing on demand. Both are last resorts, used when a request must be served at all rather than served fast. (5) AVOID THE LONG CONTEXT ENTIRELY - frequently the correct engineering answer. RETRIEVAL (chunk the corpus, retrieve the relevant pieces, keep the prompt short) is usually cheaper AND more accurate than stuffing a huge context, because models exhibit the 'lost in the middle' degradation and long-context accuracy is often far below nominal support. Summarize-and-carry-forward for long conversations does the same thing for chat. HOW I WOULD SEQUENCE IT for a real deployment: paged attention and continuous batching first (largest win, zero quality cost), then weight quantization, then KV quantization, then evaluate whether the workload genuinely needs full-context attention - and if it does not, move to retrieval or a windowed scheme rather than paying for capability nobody uses. The architectural options (MLA, different attention patterns) only apply if you control pretraining. THE MEASUREMENT that should drive the decision: profile the actual context-length distribution of your traffic. Provisioning for a 128K worst case when P95 is 8K is the most common and most expensive mistake in this area, and fixing it requires no technology at all."
        },
        {
          "q": "This architecture change was driven by inference cost rather than model quality. Is that unusual, and what does it signal?",
          "a": "It IS somewhat unusual historically, and it signals a real shift in where the field's constraints live - which makes it a good question to think about carefully. THE HISTORICAL PATTERN. Most architectural innovations were justified by QUALITY or by TRAINABILITY: residual connections made depth trainable, attention beat recurrence on translation quality, BatchNorm and pre-norm made optimization stable, transformers replaced RNNs partly for quality and partly for training parallelism. Inference cost was a downstream concern handled by compression - quantize, prune, distill - AFTER the architecture was fixed. WHAT IS DIFFERENT ABOUT GQA. It makes the model slightly WORSE (or at best equal) in quality and is adopted anyway, because the serving economics dominate. That inverts the usual ordering: the architecture is being designed around deployment constraints at pretraining time, accepting a quality cost to get a memory win. MQA's larger quality drop being rejected while GQA's negligible one was accepted shows the field pricing the trade-off explicitly. WHY THE SHIFT HAPPENED - three causes. (1) INFERENCE NOW DOMINATES LIFETIME COST. A frontier model is trained once and then serves billions of requests; at scale, cumulative inference compute exceeds training compute, often by a lot. A 10% serving cost reduction is worth more than a 1% quality gain for most deployed products. (2) THE BOTTLENECK MOVED TO MEMORY BANDWIDTH. Decode is bandwidth-bound, not compute-bound, so the levers that matter are ones that move fewer bytes - which is exactly what GQA, quantization, and MLA do, and NOT what more FLOPs-efficient architectures do. Architecture design has had to follow the actual hardware constraint. (3) LONG CONTEXT BECAME A PRODUCT REQUIREMENT. Cache size scales linearly with context, so supporting 128K context is not achievable by tuning a serving stack alone - it forces an architectural response. WHAT ELSE THIS EXPLAINS, which shows the pattern is broad rather than a one-off: MoE (parameters that are not read per token - a serving-driven design), speculative decoding (an inference-time algorithm that changes nothing about the model), quantization-aware architecture choices (EfficientNet-Lite removing squeeze-and-excitation and h-swish because they quantize badly on mobile accelerators; modern LLMs avoiding operations that break int8 kernels), and hardware-aware NAS optimizing measured latency rather than FLOPs. In vision the same shift happened earlier, when mobile deployment forced MobileNet-style design. WHAT IT SIGNALS ABOUT THE FIELD, and the framing I would offer: machine learning architecture is becoming a SYSTEMS discipline, where the design objective is quality-per-dollar-served rather than quality alone. The practical implication for anyone building models is that 'what does this cost to serve?' belongs in the design conversation from the start, not after the model works - and the interview-relevant version is that a candidate who can only discuss benchmark quality is missing half of what determines whether a model ships. THE COUNTERWEIGHT, for balance: this can go too far. Optimizing hard for current hardware risks overfitting the architecture to a transient constraint - if memory bandwidth improves dramatically, or if a different accelerator design becomes dominant, some of these choices become unnecessary baggage. The components with PRINCIPLED justifications (pre-norm, RoPE) will likely outlast the ones with purely economic ones (GQA), and it is worth being clear-eyed about which is which."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "KV cache size",
        "back": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. The 2 = K and V. Query head count does NOT appear - which is exactly the asymmetry GQA exploits."
      },
      {
        "type": "definition",
        "front": "MQA vs GQA",
        "back": "MQA: ALL query heads share ONE K/V head (h-fold cache reduction, real quality drop). GQA: g groups of query heads each share one K/V head (h/g reduction). g=h is MHA, g=1 is MQA."
      },
      {
        "type": "intuition",
        "front": "Why share K/V but not Q",
        "back": "Query heads carry the DIVERSITY (each asks a different question); K/V are a shared description of what is at each position. Also: the cache stores K and V, not Q - sharing queries would save nothing."
      },
      {
        "type": "formula",
        "front": "LLaMA-2 70B GQA numbers",
        "back": "64 query heads, 8 KV groups = 8x cache reduction: ~21.5 GB -> ~2.7 GB at 4K context, batch 1, fp16 (80 layers, d_k=128). Weights are ~140 GB, so at batch 32 the un-grouped cache would dwarf them."
      },
      {
        "type": "pitfall",
        "front": "GQA does not reduce FLOPs or help training",
        "back": "After repeat_kv the attention matmuls are full-size, and training has no cache at all. The win is inference MEMORY and BANDWIDTH - which is what decode is limited by."
      },
      {
        "type": "definition",
        "front": "Uptraining",
        "back": "Convert an MHA checkpoint to GQA by MEAN-POOLING the K/V heads within each group, then continue pretraining on ~5% of the original tokens. Makes GQA retrofittable and gives a controlled MHA/GQA/MQA comparison."
      },
      {
        "type": "intuition",
        "front": "Measured quality cost",
        "back": "Ainslie et al. (uptrained T5-XXL): MHA 47.2, GQA-8 47.1, MQA 46.6. GQA is essentially free; MQA costs real quality and trained less stably - which is why GQA, not MQA, became standard."
      },
      {
        "type": "pitfall",
        "front": "GQA does not solve long context",
        "back": "The cache is still LINEAR in T - an 8x reduction buys 8x the length at fixed memory. 32K with GQA-8 costs what 4K cost with MHA. Combine with paged attention, KV quantization, or windowed attention."
      },
      {
        "type": "definition",
        "front": "MLA (multi-head latent attention)",
        "back": "DeepSeek's alternative: compress K/V into a learned LOW-RANK latent and cache only that, with up-projections absorbed into W_Q/W_O. Smaller cache than GQA at MHA quality; costs implementation complexity and needs decoupled RoPE."
      },
      {
        "type": "intuition",
        "front": "What GQA signals",
        "back": "An architecture change adopted for INFERENCE ECONOMICS at a small quality cost - inference now dominates lifetime compute, and decode is bandwidth-bound. Same force behind MoE, speculative decoding, and quantization-aware design."
      }
    ],
    "refs": [
      {
        "title": "Ainslie et al. (2023), GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
        "url": "https://arxiv.org/abs/2305.13245"
      },
      {
        "title": "Shazeer (2019), Fast Transformer Decoding: One Write-Head is All You Need (MQA)",
        "url": "https://arxiv.org/abs/1911.02150"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention (vLLM)",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "DeepSeek-AI (2024), DeepSeek-V2 (multi-head latent attention)",
        "url": "https://arxiv.org/abs/2405.04434"
      }
    ],
    "demos": [
      "kv-cache",
      "multi-head-attention",
      "paged-attention"
    ]
  },
  "rope": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Every earlier positional scheme ADDS something - a sinusoidal vector to the embedding, a learned vector, a bias to the logits. RoPE (Su et al., 2021) does something structurally different: it ROTATES the query and key vectors by an angle proportional to their position. Take the d_k dimensions of a head in pairs, treat each pair as a point in a 2D plane, and rotate pair i at position p by the angle p * theta_i, with the theta_i geometrically spaced exactly as in the sinusoidal construction. Nothing is added to the representation, no parameters are introduced, and the values are left alone - only the geometry of the query-key comparison changes.",
        "The payoff is a mathematical guarantee that no additive scheme provides. A dot product of two vectors is invariant to rotating BOTH by the same angle, so rotating q by m*theta and k by n*theta leaves a score that depends on the RELATIVE offset (m - n) and on the content - never on m and n separately. Relative position stops being something the model must learn to extract and becomes a property of the operator. That is the whole argument, and it is why RoPE displaced sinusoidal, learned, T5-bias, and ALiBi encodings to become the default in essentially every modern LLM - LLaMA, Mistral, Qwen, Gemma, DeepSeek.",
        "The second payoff was not anticipated and turned out to matter as much. Because position enters as a rotation FREQUENCY, you can rescale it. If a model trained at 4K context sees position indices divided by 8, positions up to 32K map into the angular range it already knows - POSITION INTERPOLATION, which extends context with a small amount of fine-tuning. NTK-aware scaling refines this by adjusting the base constant so high-frequency (local) dimensions are barely touched while low-frequency ones stretch, often working with no fine-tuning at all; YaRN combines both with an attention-temperature correction. Every practical long-context method in current use is a manipulation of RoPE's frequencies, which is why this lesson is the prerequisite for reading any of that literature."
      ],
      "math": [
        {
          "h": "The rotation, and the relative-position guarantee",
          "paras": [
            "Apply to each 2D slice of the head dimension a rotation by p*theta_i. Because rotations compose and a dot product is invariant under a common rotation, the attention score between positions m and n depends only on their difference. This is an identity, not an approximation - which is the entire point of the scheme."
          ],
          "tex": "R_{p,i} = \\begin{bmatrix}\\cos p\\theta_i & -\\sin p\\theta_i\\\\ \\sin p\\theta_i & \\cos p\\theta_i\\end{bmatrix}, \\qquad \\big(R_m q\\big)^{\\!\\top}\\big(R_n k\\big) = q^{\\top} R_{n-m}\\, k",
          "texNote": "theta_i = base^(-2i/d_k) with base = 10000 by convention. The identity R_m^T R_n = R_{n-m} is just 'rotate by -m then by n'. So the score is a function of (n - m) and the content only - relative position by construction, with zero parameters."
        },
        {
          "h": "Context extension: interpolation versus base scaling",
          "paras": [
            "Two ways to make a model trained to length L handle length s*L. POSITION INTERPOLATION divides the position index, packing more positions into the same angular range. NTK-AWARE SCALING instead raises the base, which stretches LOW-frequency dimensions much more than high-frequency ones - preserving local resolution, which is why it often needs no fine-tuning."
          ],
          "tex": "\\underbrace{\\theta_i' = \\theta_i,\\;\\; p' = p/s}_{\\text{position interpolation}} \\qquad\\qquad \\underbrace{\\text{base}' = \\text{base}\\cdot s^{\\,d_k/(d_k-2)},\\;\\; p'=p}_{\\text{NTK-aware scaling}}",
          "texNote": "Interpolation compresses ALL frequencies uniformly, costing local positional resolution. NTK-aware scaling leaves the fastest dimensions nearly untouched and stretches the slow ones. YaRN interpolates per-wavelength (by whether a dimension's period fits inside the trained context) and adds a temperature correction to the attention logits."
        }
      ],
      "code": [
        {
          "h": "RoPE, and a check that the guarantee holds",
          "paras": [
            "The implementation is a complex-multiplication trick: view dimension pairs as complex numbers and multiply by e^{i*p*theta}. The assertion at the end is the lesson - two pairs of positions with the SAME offset must produce the SAME attention score, which is what distinguishes RoPE from every additive scheme."
          ],
          "code": "import torch\n\ndef rope_freqs(d_k, max_len, base=10000.0):\n    theta = base ** (-torch.arange(0, d_k, 2).float() / d_k)     # (d_k/2,)\n    angles = torch.arange(max_len).float()[:, None] * theta[None]  # (T, d_k/2)\n    return torch.polar(torch.ones_like(angles), angles)            # e^{i*p*theta}\n\ndef apply_rope(x, freqs):                    # x: (B, h, T, d_k)\n    xc = torch.view_as_complex(x.float().reshape(*x.shape[:-1], -1, 2))\n    out = torch.view_as_real(xc * freqs[: x.shape[-2]]).flatten(-2)\n    return out.type_as(x)\n\nd_k, T = 64, 512\nfreqs = rope_freqs(d_k, T)\nq = torch.randn(1, 1, T, d_k); k = torch.randn(1, 1, T, d_k)\nqr, kr = apply_rope(q, freqs), apply_rope(k, freqs)\n\n# THE GUARANTEE: same offset -> same score contribution, regardless of absolute position.\n# Compare q at 10 vs k at 15 (offset 5) against the SAME vectors placed at 300 and 305.\nq2 = q.clone(); k2 = k.clone()\nq2[0,0,300] = q[0,0,10]; k2[0,0,305] = k[0,0,15]\nq2r, k2r = apply_rope(q2, freqs), apply_rope(k2, freqs)\ns1 = (qr[0,0,10]  * kr[0,0,15]).sum()\ns2 = (q2r[0,0,300] * k2r[0,0,305]).sum()\nprint(f'offset 5 at (10,15): {s1:.6f}   at (300,305): {s2:.6f}   diff {abs(s1-s2):.2e}')\n# offset 5 at (10,15): 1.234567   at (300,305): 1.234567   diff 2.4e-07  <- identical",
          "caption": "RoPE as complex multiplication, and the property that justifies it: identical content at identical OFFSET produces an identical score no matter where in the sequence it sits. Additive positional schemes satisfy no such identity."
        },
        {
          "h": "Extending context by rescaling frequencies",
          "paras": [
            "The three practical methods in one place. All of them manipulate the same two quantities - the position index and the base - and their differences are entirely about which frequencies get compressed."
          ],
          "code": "def rope_freqs_scaled(d_k, max_len, base=10000.0, method='none', s=8.0):\n    if method == 'ntk':                       # raise the base: stretches SLOW dims most\n        base = base * s ** (d_k / (d_k - 2))\n    theta = base ** (-torch.arange(0, d_k, 2).float() / d_k)\n    pos = torch.arange(max_len).float()\n    if method == 'pi':                        # position interpolation: compress ALL dims\n        pos = pos / s\n    return torch.polar(torch.ones_like(pos[:, None] * theta), pos[:, None] * theta)\n\n# LLaMA-2 7B (trained at 4096), evaluated at 32768 - representative perplexities:\n#   method                fine-tuning needed   PPL @ 32K\n#   none (extrapolate)          -               >1000     <- unusable\n#   position interpolation    ~1k steps           7.2\n#   NTK-aware                   none              8.9\n#   YaRN                      ~400 steps          6.9\n#\n# Rule of thumb: NTK-aware if you cannot fine-tune at all; YaRN if you can afford\n# a short run. And ALWAYS verify with retrieval probes, not perplexity - a model can\n# have decent PPL at 32K while being unable to USE information from position 20000.",
          "caption": "Context extension is a manipulation of RoPE's frequencies: interpolation compresses all of them, NTK-aware scaling raises the base so local resolution survives, YaRN does it per-wavelength plus a logit temperature. Verify with retrieval probes, never with perplexity alone."
        }
      ],
      "useCases": [
        "Every current open LLM: LLaMA and its descendants, Mistral, Qwen, Gemma, DeepSeek and Phi all use RoPE, so reading or reimplementing any modern model requires knowing it - and its frequency parameters are the first thing to check when porting weights.",
        "Long-context extension in practice: position interpolation, NTK-aware scaling, and YaRN are the standard ways a 4K or 8K model becomes a 32K-128K model, and all three are frequency manipulations of exactly this construction.",
        "Multimodal and vision models: 2D RoPE (rotate different dimension groups by the x and y coordinates) gives resolution-flexible position for image and video transformers, which learned patch embeddings cannot do without interpolation.",
        "Debugging inference stacks: RoPE must be applied to queries and keys before caching decisions are made, and the cached keys must carry the rotation for their ORIGINAL positions - getting this wrong is one of the most common and most confusing bugs in a hand-written generation loop."
      ],
      "pitfalls": [
        "Assuming RoPE extrapolates for free: the relative-position identity holds at any offset, but the model has never SEEN rotation angles beyond its training range, so naive extrapolation degrades catastrophically. Extension requires interpolation or base rescaling, plus usually a short fine-tune.",
        "Rotating the VALUES: RoPE applies to queries and keys only. Rotating V would corrupt the retrieved content, since position should influence WHICH tokens are attended to, not WHAT is retrieved from them.",
        "Re-rotating cached keys during generation: keys are cached WITH the rotation for their original position and must not be rotated again as the sequence grows. Applying RoPE to the whole cache each step is a classic bug that silently destroys long-range behaviour.",
        "Mismatching the base constant when porting or extending: models trained with base 10000 versus 500000 (LLaMA-3) behave completely differently, and loading weights with the wrong base produces a model that looks fine at short context and fails at long - check it explicitly.",
        "Evaluating extended context with perplexity: perplexity is dominated by local prediction and can look acceptable while the model cannot retrieve information from distant positions. Use needle-in-a-haystack across depths, multi-needle variants, or RULER-style probes."
      ],
      "connections": [
        {
          "ref": "transformers/positional-encoding",
          "text": "RoPE applies precisely the rotation matrix that appears in the sinusoidal shift identity - but to q and k directly, converting a suggestive property into a structural guarantee."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Position interpolation, NTK-aware scaling, and YaRN are the practical long-context toolkit, and all of them are manipulations of the frequencies defined here."
        },
        {
          "ref": "transformers/flash-attention",
          "text": "RoPE is applied to q and k BEFORE the attention kernel, which is why it composes cleanly with FlashAttention - unlike schemes that modify the attention matrix itself."
        },
        {
          "ref": "transformers/gqa-mqa",
          "text": "In MLA-style cache compression, RoPE's position-dependence is what breaks the matrix-absorption trick, forcing the decoupled-RoPE design - a good example of positional choices constraining systems design."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is RoPE?",
          "a": "Rotary Position Embedding: rotate pairs of dimensions in the query and key vectors by an angle proportional to position, so the attention score depends only on relative offset."
        },
        {
          "q": "What is the key mathematical property?",
          "a": "(R_m q)^T (R_n k) = q^T R_(n-m) k. A dot product is invariant under a common rotation, so the score depends on (n-m) and the content, never on m and n separately."
        },
        {
          "q": "How many parameters does RoPE add?",
          "a": "Zero. The rotation angles are fixed by the frequency schedule; nothing is learned."
        },
        {
          "q": "Which tensors does RoPE apply to?",
          "a": "Queries and keys only - never values. Position should influence which tokens are attended to, not what content is retrieved from them."
        },
        {
          "q": "What is the base constant?",
          "a": "The 10000 in theta_i = base^(-2i/d_k), inherited from sinusoidal encoding. It sets the longest wavelength; LLaMA-3 uses 500000 for longer context."
        },
        {
          "q": "Why did RoPE beat ALiBi?",
          "a": "No fixed recency prior (so long-range retrieval stays possible), zero parameters, FlashAttention-compatible, and - decisively - extendable by rescaling frequencies."
        },
        {
          "q": "What is position interpolation?",
          "a": "Divide position indices by a scale factor s so positions up to s*L map into the trained angular range. Works well with a short fine-tune; costs local positional resolution."
        },
        {
          "q": "What is NTK-aware scaling?",
          "a": "Raise the base instead of scaling positions, which stretches low-frequency (long-wavelength) dimensions much more than high-frequency ones - preserving local resolution, often with no fine-tuning."
        },
        {
          "q": "What is YaRN?",
          "a": "Per-wavelength interpolation (stretch dimensions whose period exceeds the trained context, leave fast ones alone) plus an attention-temperature correction. The strongest of the extension family."
        },
        {
          "q": "Does RoPE extrapolate natively?",
          "a": "No. The identity holds at any offset, but the model has never seen those rotation angles, so quality collapses beyond the training length without rescaling."
        },
        {
          "q": "How is RoPE implemented efficiently?",
          "a": "View dimension pairs as complex numbers and multiply by e^(i*p*theta) - one complex multiply per pair, applied to q and k before the attention kernel."
        },
        {
          "q": "What is the classic RoPE bug in a generation loop?",
          "a": "Re-rotating cached keys as the sequence grows. Keys are cached already rotated for their original positions and must not be rotated again."
        }
      ],
      "standard": [
        {
          "q": "Explain RoPE: the mechanism, the property it guarantees, and why it replaced every other positional scheme.",
          "a": "THE MECHANISM. Split each attention head's d_k dimensions into d_k/2 consecutive PAIRS, and treat each pair as a point in a 2D plane. For a token at position p, rotate pair i by the angle p * theta_i, where theta_i = base^(-2i/d_k) with base conventionally 10000 - the same geometric frequency schedule as sinusoidal encoding. Apply this to the QUERY and KEY vectors (never to values), then compute attention exactly as usual. No parameters are added, nothing is added to the token representation, and the values are untouched: the only thing that changes is the geometry of the query-key comparison. Implementation is a complex multiplication - view each pair as a complex number and multiply by e^(i * p * theta_i). THE GUARANTEE. A dot product is invariant when you rotate both vectors by the same angle. So if q sits at position m and k at position n, then (R_m q)^T (R_n k) = q^T R_m^T R_n k = q^T R_(n-m) k. The attention score is therefore a function of the CONTENT and the RELATIVE OFFSET (n - m), and cannot depend on m and n separately. That is an identity, not a learned tendency, and it is the entire argument for the scheme: relative position becomes a property of the operator rather than something the model must infer from two absolute signals that have already been mixed with content. WHY IT REPLACED THE ALTERNATIVES, one by one. Versus SINUSOIDAL and LEARNED ABSOLUTE: those add a vector at the input, so position information is entangled with content in the residual stream, must survive many layers, and the model has to learn to extract offsets. RoPE injects position at the exact point where it is used - the query-key comparison - and gives offsets for free. Versus LEARNED ABSOLUTE specifically: no hard context cap, since the rotation is defined for any p, and no parameters. Versus T5's RELATIVE BIAS: T5 adds a learned scalar per bucketed distance, which works but requires modifying the attention MATRIX (adding a bias to the logits), which complicates fused kernels, and the bucketing discretizes distance. RoPE needs no bias term and applies before the kernel. Versus ALiBi: ALiBi extrapolates natively and is beautifully simple, but it imposes a HARD RECENCY PRIOR - a monotone penalty on distance - which structurally limits genuine long-range retrieval. RoPE imposes no such prior. And decisively, RoPE turned out to be EXTENDABLE: because position enters as a frequency, you can rescale it (position interpolation, NTK-aware scaling, YaRN) to stretch a trained model to much longer contexts, which ALiBi's fixed slopes do not offer. THE PRACTICAL ADVANTAGES that sealed adoption: zero parameters; applied to q and k BEFORE the attention kernel, so it composes perfectly with FlashAttention and other fused implementations (unlike anything that modifies the attention matrix); trivial to implement; and it works well empirically across scales. THE HONEST LIMITATION to state: RoPE does NOT give free length extrapolation. The identity holds at any offset, but the model has never seen rotation angles beyond its training range, so naive extrapolation degrades catastrophically - which is precisely why the whole interpolation/scaling literature exists. A candidate who says 'RoPE handles long context' without that caveat has learned the marketing rather than the mechanism.",
          "deepDive": {
            "q": "Walk through the derivation: why does requiring the score to depend only on relative position lead to a rotation?",
            "a": "This is Su et al.'s actual derivation and it is worth being able to reconstruct, because it shows RoPE is DERIVED rather than guessed. THE REQUIREMENT. We want position-aware transformations f_q(x, m) and f_k(x, n) applied to the query and key such that their inner product is a function of the contents and the RELATIVE position only: <f_q(x_q, m), f_k(x_k, n)> = g(x_q, x_k, n - m) for some function g. THE 2D CASE. Work in a 2D subspace and use complex numbers, where a vector is a complex number and the inner product of a and b is Re(a * conj(b)). Propose that the transformation is a multiplication by a unit-modulus complex number depending on position: f_q(x, m) = x * e^(i * phi(m)). Then <f_q(x_q, m), f_k(x_k, n)> = Re( x_q e^(i phi(m)) * conj(x_k e^(i phi(n))) ) = Re( x_q conj(x_k) e^(i (phi(m) - phi(n))) ). For this to depend on n - m only, we need phi(m) - phi(n) to be a function of (m - n) - which forces phi to be LINEAR: phi(p) = p * theta for some constant theta. So multiplication by e^(i p theta) is essentially the unique solution of the form 'multiply by a position-dependent unit complex number', and multiplication by a unit complex number IS a rotation in the plane. That is where the rotation comes from - it is not a design choice, it is what the relative-position requirement forces. WHY UNIT MODULUS. If the multiplier had modulus not equal to 1, the transformation would scale the vector by an amount depending on absolute position, so the attention LOGIT MAGNITUDE would depend on where the token sits - tokens later in the sequence would systematically get larger or smaller scores regardless of content. That is exactly what you do not want, so norm preservation is required, leaving only rotations. This is also the reason RoPE does not disturb the sqrt(d_k) scaling: rotations preserve norms, so the logit variance argument from standard attention is untouched. EXTENDING TO d_k DIMENSIONS. Apply the 2D construction independently to d_k/2 disjoint pairs, each with its own frequency theta_i. The block-diagonal rotation matrix that results is R_p, and the same algebra gives R_m^T R_n = R_(n-m) blockwise. WHY GEOMETRICALLY-SPACED FREQUENCIES. If every pair used the same theta, the encoding would be periodic with a single period and positions separated by 2*pi/theta would be indistinguishable - catastrophic aliasing. Geometric spacing (theta_i = base^(-2i/d_k)) gives a range of periods from about 2*pi (fastest, resolving adjacent tokens) up to base * 2*pi (slowest, spanning the whole context), so the ensemble distinguishes positions across scales - the same multi-resolution argument as sinusoidal encoding, and RoPE inherits the constant 10000 from it. WHAT THE DERIVATION ALSO EXPLAINS. (a) Why RoPE applies to q and k but not v: the requirement was about the INNER PRODUCT, which involves only q and k. Rotating v would change the retrieved content as a function of absolute position, which the derivation never asks for and which would be harmful. (b) Why the base matters for long context: base sets the slowest frequency, so it determines the length scale over which position is resolvable - hence LLaMA-3 raising it to 500000 for longer contexts, and hence NTK-aware scaling adjusting the base rather than the positions. (c) Why extrapolation fails despite the identity: the identity guarantees the FORM of the dependence, but g(x_q, x_k, n-m) is realized by learned weights that have only ever been optimized for offsets inside the training range - the mathematics is exact, the learned function is not defined outside its training support. That distinction, between a structural guarantee and a learned function's domain, is the crispest way to explain why a mathematically elegant scheme still needs interpolation tricks in practice."
          }
        },
        {
          "q": "How do position interpolation, NTK-aware scaling, and YaRN extend context, and how do they differ?",
          "a": "THE SHARED PROBLEM. A model trained at length L has only ever seen RoPE rotation angles p*theta_i for p < L. Feed it p = 10L and every frequency is at an angle it has never encountered, the attention logits go out of distribution, and quality collapses (perplexity into the hundreds or thousands). All three methods keep the angles inside the familiar range, and they differ in HOW they compress. (1) POSITION INTERPOLATION - PI (Chen et al., 2023). Divide the position index by a scale factor s: use p/s instead of p. To go 4K -> 32K, use s = 8, so position 32000 is treated as position 4000 - within the trained range. Every frequency is compressed by the same factor. It works remarkably well with a short fine-tune (roughly 1000 steps in the original paper), and the reason it beats extrapolation is intuitive: interpolating BETWEEN values a function has seen is a much gentler ask than extrapolating beyond them. THE COST: local positional resolution. Adjacent tokens now differ by 1/s of the angle they used to, so fine-grained ordering (which token came immediately before which) is compressed, and models show slightly degraded short-range behaviour. (2) NTK-AWARE SCALING (from the open-source community, then formalized). The insight: uniform compression is wasteful. HIGH-frequency dimensions (short wavelength) carry LOCAL positional information and are the ones you want to preserve; LOW-frequency dimensions (long wavelength) carry coarse position and are the ones that need stretching. So instead of scaling positions, RAISE THE BASE: base' = base * s^(d_k/(d_k-2)). Because theta_i = base^(-2i/d_k), raising the base shrinks all theta_i but shrinks the already-small ones proportionally more, stretching long wavelengths while leaving the fastest dimensions nearly untouched. THE PAYOFF: it often works with NO fine-tuning at all, which is why it spread so fast through the open-model community - you could extend a downloaded checkpoint's context by changing one constant. It is usually slightly worse than a fine-tuned PI at large scale factors. (3) YaRN (Peng et al., 2023) - 'Yet another RoPE extensioN'. Combines the good parts and adds one more. It applies interpolation PER WAVELENGTH using an explicit criterion: dimensions whose period is much shorter than the trained context are left alone (they already see full cycles and generalize), dimensions whose period exceeds the trained context are interpolated (they never completed a cycle, so extrapolating them is meaningless), and dimensions in between are blended - a 'NTK-by-parts' scheme. It then adds an ATTENTION TEMPERATURE correction: with more tokens in the context the softmax spreads thinner, so YaRN scales the attention logits by a factor that depends on s to restore the entropy the model expects. That temperature term is the piece the other methods lack and is a meaningful part of its advantage. YaRN reaches larger extensions with less fine-tuning than PI and better quality than NTK-aware alone. HOW TO CHOOSE: cannot fine-tune at all -> NTK-aware (change one constant, ship it); can afford a few hundred steps -> YaRN; already have a fine-tuning pipeline and want the simplest thing that works -> PI. If you are pretraining from scratch, just train at (or progressively up to) the target length and use a large base - which is what frontier labs do, and it is why LLaMA-3 uses base 500000. WHAT TO WATCH FOR IN EVALUATION, which is where most reported long-context results are weak: perplexity at long context is a POOR measure, because most next-token predictions depend on nearby tokens, so a model can post reasonable perplexity at 32K while being unable to retrieve anything from position 20000. Use needle-in-a-haystack across both context lengths and needle DEPTHS, multi-needle variants, and RULER-style tasks that require aggregating distant information. Expect the honest result that EFFECTIVE context is well below nominal context for most extended models - the gap between 'supports 128K' and 'works at 128K' is one of the more consequential practical facts in current LLM deployment."
        },
        {
          "q": "Why does RoPE apply to queries and keys but not values? What would break?",
          "a": "THE PRINCIPLED ANSWER. RoPE exists to make the attention SCORE depend on relative position. The score is a function of q and k only - values never enter it. So the derivation that produces the rotation is entirely about the inner product <f_q(x,m), f_k(x,n)>, and values are simply not part of the requirement. Applying a rotation to V would be adding a transformation the design never asked for. THE FUNCTIONAL SEPARATION, which is the more intuitive framing: attention is a soft dictionary lookup. Queries and keys determine WHICH positions to retrieve from - that is a matching operation, and matching is exactly where relative position belongs ('the token three back', 'the matching bracket'). Values are WHAT gets retrieved - the content. Position should influence the routing, not corrupt the payload. Rotating V would mean the content you retrieve from a token changes depending on where that token sits in the sequence, which is not a property anyone wants: the meaning of a word should not rotate as it moves. WHAT WOULD ACTUALLY BREAK, concretely. (1) THE OUTPUT WOULD BECOME POSITION-DEPENDENT IN AN UNCONTROLLED WAY. The attention output is a weighted sum of value vectors. If each value has been rotated by its own absolute position angle, the sum mixes vectors from different rotational frames, and the result depends on the absolute positions of all attended tokens rather than on their content and relative offsets. The clean relative-position property that RoPE was built to provide would be destroyed at the output even though it held at the score. (2) THE RESIDUAL STREAM WOULD BE CORRUPTED. The attention output is added to the residual stream, which downstream layers and the final unembedding read in a consistent basis. Injecting position-dependent rotations into that stream means every later component sees content that has been arbitrarily rotated depending on where it came from, which the model would have to learn to undo - pure waste at best. (3) THE UNEMBEDDING WOULD SEE ROTATED REPRESENTATIONS. The output projection expects token representations in a fixed space; rotating them by position would make the same semantic content decode differently at different positions. WHAT ABOUT SCHEMES THAT DO TOUCH VALUES? Worth mentioning for completeness: Shaw et al.'s original relative-position work DID add learned relative-position vectors to values as well as keys, and found the value component contributed little - it was dropped in later work (including T5's simplification to a scalar logit bias). So this is not merely a theoretical argument; it was tested, and position-in-values turned out not to earn its keep. THE GENERALIZABLE PRINCIPLE, which is what a strong answer extracts: in any attention-like mechanism, ask which quantity your modification should affect - the ROUTING (who talks to whom) or the CONTENT (what is said). Positional information belongs to routing. The same reasoning explains why ALiBi biases the logits rather than the values, why attention masks apply to scores, and why the various sparse/windowed attention patterns all modify score computation and leave values alone. Modifications that blur the routing/content distinction generally end up being learned around or actively harmful."
        },
        {
          "q": "What are the common RoPE bugs when implementing a generation loop with a KV cache?",
          "a": "This is a good practical question because the bugs are subtle, silent, and produce models that look fine at short context. (1) RE-ROTATING CACHED KEYS - the classic. Keys are cached AFTER RoPE has been applied for their original positions. On each new step, a naive implementation re-applies RoPE to the whole cached tensor, so a key originally at position 5 gets rotated again (now by position 5 in a shifted frame, or worse, by its index in the current window). The symptom is insidious: generation looks reasonable for a few tokens and degrades as the sequence grows, since the accumulated erroneous rotation grows with position. THE FIX: apply RoPE to the new token's q and k ONLY, then append the rotated k to the cache. Write a test that generates a sequence token-by-token with the cache and compares it against a single full-sequence forward pass - they must match to floating-point tolerance. That equivalence test catches most cache bugs, not just this one. (2) WRONG POSITION INDICES AFTER PADDING OR TRUNCATION. If you left-pad a batch, every real token's index shifts, and rotating by the padded index gives every sequence a different (wrong) positional frame. Similarly, if you truncate a long prompt from the left, the surviving tokens' positions must be recomputed. THE FIX: carry explicit position_ids alongside the tokens rather than deriving positions from tensor indices, and make padding-aware position computation the default. (3) OFF-BY-ONE BETWEEN PREFILL AND DECODE. During prefill you rotate positions 0..T-1; the first generated token must be position T, not T-1 or 0. Getting this wrong shifts the entire generated continuation by one position relative to the prompt - which often still produces fluent text, so it can go unnoticed for a long time while quietly degrading quality. (4) BASE / SCALING MISMATCH BETWEEN TRAINING AND INFERENCE. If the model was trained with base 500000 (LLaMA-3) or with a YaRN scaling configuration, the inference stack must apply the SAME frequencies. Loading weights into a framework that defaults to base 10000 gives a model that seems fine at short context and fails at long - one of the more confusing porting bugs, because nothing errors. THE FIX: read the base and any rope_scaling config from the model config and assert it, rather than relying on defaults. (5) PRECISION. RoPE involves sin/cos and complex multiplication; computing the frequencies in fp16 loses precision at large positions (the angle p*theta becomes large and the trig loses significant digits). Standard practice is to compute the rotation in fp32 and cast back - most reference implementations do this explicitly, and reimplementations that skip it show subtle long-context degradation. (6) HEAD-DIMENSION PAIRING CONVENTION. There are two conventions for which dimensions form a pair: adjacent pairs (0,1), (2,3), ... or split-half pairs (i, i + d_k/2). Both are valid and self-consistent, but they are NOT interchangeable - weights trained under one and inferenced under the other produce garbage. This bites when porting between frameworks (HuggingFace and the original LLaMA code differ here, which is why conversion scripts permute the q and k projection weights). (7) FORGETTING TO APPLY RoPE TO THE GQA KEY HEADS CORRECTLY: with grouped-query attention, RoPE applies to the g key heads before caching and to all h query heads - a shape mismatch here is easy to write and easy to miss. THE UNIFYING TEST worth stating: cached incremental generation must produce bit-comparable output to a single full-sequence forward pass on the same tokens. Almost every bug in this list violates that invariant, so one test catches them all - and writing that test is the first thing I would do when implementing or debugging a generation loop."
        },
        {
          "q": "RoPE has no learned parameters. Is that a strength or a limitation?",
          "a": "Mostly a strength, and the reasons are worth separating from the reflex that 'more learnable is better'. THE CASE THAT IT IS A STRENGTH. (1) THE FUNCTION IS ALREADY CORRECT. RoPE is DERIVED from the requirement that attention scores depend only on relative position - it is the essentially unique norm-preserving solution. When you can derive the right transformation, learning it is wasted capacity and wasted data: the model would be spending parameters and gradient signal rediscovering a rotation. This is the same argument as building translation equivariance into a CNN rather than learning it. (2) NO OVERFITTING TO TRAINED POSITIONS. Learned absolute embeddings memorize position-specific idiosyncrasies of the training corpus (document boundaries, formatting regularities), which is one reason they generalize poorly to new lengths and to differently-structured inputs. A fixed geometric transformation has nothing to overfit. (3) EXTENSIBILITY - the decisive practical benefit. Precisely BECAUSE the frequencies are a known analytic function rather than a learned table, you can manipulate them post hoc: interpolate positions, rescale the base, apply per-wavelength scaling. You cannot do that to a learned embedding table in any principled way - interpolating a learned table is a heuristic requiring fine-tuning, whereas rescaling RoPE frequencies has a clear interpretation and sometimes needs no training at all. Every practical long-context method depends on this. (4) NO PARAMETERS TO SHARD, QUANTIZE, OR PORT, and no extra memory - minor, but real at scale. THE CASE THAT IT IS A LIMITATION. (1) THE FREQUENCY SCHEDULE IS A FIXED PRIOR. theta_i = 10000^(-2i/d_k) is inherited from the 2017 sinusoidal paper and was never optimized. Different data might prefer a different distribution of wavelengths - and evidence that this matters is that LLaMA-3 changed the base to 500000 for long context, which is exactly a hand-tuned adjustment of the unlearned prior. If it were learned, the model could have found that itself. (2) IT CANNOT ADAPT PER HEAD OR PER LAYER. All heads get the same frequency schedule, yet heads plausibly need different positional sensitivity - some are local (previous-token heads), some are long-range. ALiBi at least gives each head a different slope; RoPE gives all heads identical frequencies. There is research on per-head or learned rotation frequencies, but it has not displaced the standard scheme. (3) THE RELATIVE-ONLY PROPERTY IS SOMETIMES TOO STRONG. Some tasks genuinely need ABSOLUTE position ('is this the first token?', document-start effects), and pure RoPE cannot express it directly - though in practice models recover absolute information from other sources (the BOS token, attention sinks, and the fact that early positions have distinctive attention patterns). THE EMPIRICAL VERDICT: attempts to learn positional encodings have generally NOT beaten RoPE at scale, which is the strongest available evidence that the fixed prior is close enough to right. And the field's actual response to RoPE's limitations was not 'make it learnable' but 'tune the base and the scaling' - a hand-designed adjustment of a hand-designed prior, which suggests the parameterization is more valuable than the learnability. THE BROADER PRINCIPLE I would state: build in structure you can DERIVE, learn structure you cannot. Rotation-for-relative-position is derivable, so build it in; which relationships between tokens matter is not derivable, so learn that (in W_Q, W_K, and the rest of the network). The failure mode on the other side - imposing structure that is wrong - is what makes ALiBi's fixed recency prior limiting, and RoPE sits at a good point on that spectrum because its structure is a genuine invariance rather than a guess about what matters."
        },
        {
          "q": "How would you adapt RoPE to a modality where position is not a single integer - images, or 3D data?",
          "a": "The core question is: what is the POSITION VARIABLE, and what invariance do you want? RoPE's construction generalizes cleanly as long as you can answer that. (1) IMAGES - 2D RoPE. A patch has coordinates (x, y). PARTITION the head dimensions into two groups: rotate one group by x*theta_i and the other by y*theta_j. Then the dot product between two patches decomposes into a function of (dx, dy) - relative 2D displacement - exactly analogous to the 1D case. This is what modern vision and multimodal models do (it appears in several recent VLMs and in video models), and its big practical advantage over learned 2D position embeddings is RESOLUTION FLEXIBILITY: because the rotation is an analytic function of the coordinate, you can run at a different image size without interpolating an embedding table. The design decisions are how to split dimensions between axes (usually evenly) and whether the two axes should share a frequency schedule (usually yes, unless the aspect ratio is systematically skewed). (2) VIDEO - 3D (x, y, t). Same construction with three groups of dimensions. The interesting decision is the FREQUENCY ALLOCATION: space and time have very different extents and statistics (a 24-frame clip versus a 256x256 grid), so using the same wavelength schedule for t as for x is wrong - the temporal frequencies should span the temporal extent. Some models also deliberately give the temporal axis more or fewer dimensions depending on how much temporal reasoning the task needs. (3) 3D POINT CLOUDS AND MOLECULES - the harder case, and where you should say what does NOT work. Coordinates are CONTINUOUS and unordered, and the invariance you want is usually not translation alone but ROTATION and REFLECTION of the whole structure (SE(3)/E(3) equivariance). RoPE gives you relative translation only, so it is insufficient by itself: rotating the whole molecule changes the relative coordinate vectors and hence the scores, which is exactly what you do not want. The right tools there are genuinely equivariant architectures (EGNN, e3nn-style tensor-field networks) or, more simply, features that are already invariant - pairwise DISTANCES and angles rather than raw coordinate differences. Recognizing that RoPE is the wrong tool here is a better answer than shoehorning it in. (4) IRREGULAR TIME SERIES - continuous 1D. RoPE extends directly by using the real-valued timestamp instead of an integer index: rotate by t*theta_i with t continuous. Nothing in the construction requires integers. The design work is choosing the frequency range to span the relevant time scales (and probably using log-time, since real event gaps span orders of magnitude). This is a clean and underused fit. (5) MIXED-MODALITY SEQUENCES - the practical case in VLMs, where a sequence interleaves text tokens and image patches. You need a position convention that covers both; approaches include giving images a 2D position within their own frame plus a 1D position in the token stream (Qwen2-VL's M-RoPE does something like this), or flattening patches into the 1D stream and accepting the loss of 2D structure. This is an active design area and worth flagging as unsettled. THE GENERAL RECIPE I would state: (a) identify the coordinate(s) that define position in your modality; (b) identify the invariance you want the attention score to have - relative translation in each coordinate is what RoPE provides; (c) partition head dimensions among the coordinates and choose a frequency schedule per coordinate that spans that coordinate's actual range; (d) verify the guarantee empirically with the same test as the 1D case - place identical content at two position pairs with the same relative offset and assert the scores match. And (e) check whether your desired invariance is actually broader than translation (rotation, permutation, scale), because if it is, RoPE is the wrong primitive and you need an equivariant architecture instead."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "RoPE",
        "back": "Rotate dimension PAIRS of q and k by angle p*theta_i (theta_i = base^(-2i/d_k)). Zero parameters, applied before the attention kernel, never to values."
      },
      {
        "type": "formula",
        "front": "The RoPE identity",
        "back": "(R_m q)^T (R_n k) = q^T R_(n-m) k. A dot product is invariant under a common rotation, so the score depends ONLY on relative offset (n-m) and content - a structural guarantee, not a learned tendency."
      },
      {
        "type": "intuition",
        "front": "Why the rotation is forced",
        "back": "Requiring <f_q(x,m), f_k(x,n)> = g(x,x',n-m) with a norm-preserving position transform forces phi(p) to be LINEAR in p, i.e. multiplication by e^(i*p*theta) = a rotation. RoPE is derived, not guessed."
      },
      {
        "type": "pitfall",
        "front": "RoPE does not extrapolate for free",
        "back": "The identity holds at any offset, but the model has never SEEN those rotation angles, so quality collapses past the training length. Extension needs interpolation or base rescaling - usually plus a short fine-tune."
      },
      {
        "type": "definition",
        "front": "Position interpolation vs NTK-aware",
        "back": "PI: divide positions by s (compresses ALL frequencies, costs local resolution, needs ~1k fine-tune steps). NTK-aware: raise the BASE (stretches slow dims most, preserves local resolution, often no fine-tuning)."
      },
      {
        "type": "definition",
        "front": "YaRN",
        "back": "Per-wavelength interpolation (leave dims whose period fits in the trained context, stretch those that don't, blend between) PLUS an attention-temperature correction for the flatter softmax at long context. Strongest of the family."
      },
      {
        "type": "pitfall",
        "front": "Never rotate the values",
        "back": "RoPE is derived from a requirement on the SCORE, which involves only q and k. Rotating V would make retrieved CONTENT depend on absolute position and corrupt the residual stream. Shaw et al. tested position-in-values; it contributed little."
      },
      {
        "type": "pitfall",
        "front": "The cached-key bug",
        "back": "Keys are cached ALREADY rotated for their original positions - do not re-rotate the cache each step. Test: incremental cached generation must match a single full-sequence forward pass to floating-point tolerance."
      },
      {
        "type": "pitfall",
        "front": "Base and pairing conventions",
        "back": "Base 10000 vs 500000 (LLaMA-3) changes long-context behaviour; and adjacent-pair vs split-half dimension pairing are both valid but NOT interchangeable - hence the weight permutation in HF conversion scripts."
      },
      {
        "type": "intuition",
        "front": "Why RoPE beat ALiBi",
        "back": "ALiBi extrapolates natively but imposes a hard RECENCY prior that limits long-range retrieval. RoPE imposes no prior, costs nothing, composes with FlashAttention, and is EXTENDABLE by rescaling frequencies."
      }
    ],
    "refs": [
      {
        "title": "Su et al. (2021), RoFormer: Enhanced Transformer with Rotary Position Embedding",
        "url": "https://arxiv.org/abs/2104.09864"
      },
      {
        "title": "Chen et al. (2023), Extending Context Window of Large Language Models via Position Interpolation",
        "url": "https://arxiv.org/abs/2306.15595"
      },
      {
        "title": "Peng et al. (2023), YaRN: Efficient Context Window Extension of Large Language Models",
        "url": "https://arxiv.org/abs/2309.00071"
      },
      {
        "title": "Press, Smith & Lewis (2022), Train Short, Test Long (ALiBi - the main alternative)",
        "url": "https://arxiv.org/abs/2108.12409"
      }
    ],
    "demos": [
      "rope",
      "positional-encoding",
      "context-extension"
    ]
  },
  "flash-attention": {
    "level": "advanced",
    "body": {
      "intuition": [
        "FlashAttention (Dao et al., 2022) computes EXACTLY the same function as standard attention - same output, same gradients, no approximation - and is several times faster while using O(T) memory instead of O(T^2). That combination sounds impossible until you notice what the standard implementation actually spends its time on. It is not the matmuls: attention as usually written materializes the full T x T score matrix in GPU high-bandwidth memory, writes it, reads it back for the softmax, writes the result, reads it again for the value multiply. For a 4K sequence with 16 heads that is hundreds of megabytes moved per layer to do a comparatively small amount of arithmetic. The operation is MEMORY-BANDWIDTH-BOUND, and the fix is to stop moving data, not to do less math.",
        "The technique is TILING plus ONLINE SOFTMAX. Load a block of queries and a block of keys/values into the GPU's fast on-chip SRAM, compute that tile's scores, and immediately fold them into a running output - never writing the score tile back to main memory. The obstacle is that softmax needs a normalizer over the WHOLE row, which you do not have until you have seen every key. The resolution is the online-softmax recurrence: keep a running maximum and a running sum of exponentials, and when a new block arrives with a larger maximum, RESCALE what you have accumulated so far. This is numerically identical to computing the softmax at the end, which is why the result is exact rather than approximate.",
        "The backward pass adds one more idea: rather than storing the attention matrix for gradient computation, RECOMPUTE the tiles on the fly from the saved q, k, v. Recomputation costs extra FLOPs and still comes out ahead, because FLOPs were never the constraint. That is the lesson to carry away, and it generalizes far past attention: on modern accelerators, arithmetic is cheap and memory movement is expensive, so an algorithm that does MORE arithmetic to move LESS data usually wins. FlashAttention is the reason long-context training became affordable, and it is now the default path in PyTorch's scaled_dot_product_attention."
      ],
      "math": [
        {
          "h": "Online softmax: the recurrence that makes tiling exact",
          "paras": [
            "Process keys in blocks. Maintain a running max m and running sum l. When block j arrives, update the max, rescale the previously-accumulated sum and output by exp(m_old - m_new), then add the new block's contribution. The rescaling is what preserves exactness - the final result is bit-comparable to computing softmax over the whole row at once (up to floating-point reassociation)."
          ],
          "tex": "m^{(j)} = \\max\\big(m^{(j-1)},\\, \\tilde{m}_j\\big), \\quad \\ell^{(j)} = e^{\\,m^{(j-1)} - m^{(j)}}\\ell^{(j-1)} + e^{\\,\\tilde{m}_j - m^{(j)}}\\tilde{\\ell}_j, \\quad O^{(j)} = e^{\\,m^{(j-1)} - m^{(j)}}O^{(j-1)} + \\tilde{P}_j V_j",
          "texNote": "m = running row max (for numerical stability), l = running sum of exponentials, O = running unnormalized output; tilde-quantities are the current block's local values. Divide O by l at the end. Milakov & Gimelshein (2018) introduced this recurrence; FlashAttention applies it to make attention tiling possible."
        },
        {
          "h": "The memory accounting - why it is a bandwidth win",
          "paras": [
            "Standard attention's HBM traffic is dominated by the T x T score matrix, read and written several times. FlashAttention's traffic is dominated by re-reading K and V blocks once per query block. With a block size chosen so a tile fits in SRAM, the asymptotics change from quadratic to (essentially) linear in T for a fixed head dimension."
          ],
          "tex": "\\underbrace{\\Theta\\!\\left(T^2 + T d\\right)}_{\\text{standard HBM accesses}} \\qquad\\longrightarrow\\qquad \\underbrace{\\Theta\\!\\left(\\frac{T^2 d^2}{M}\\right)}_{\\text{FlashAttention, } M = \\text{SRAM size}}",
          "texNote": "d = head dimension, M = on-chip SRAM capacity. Since M is large relative to d^2, the ratio is a large constant factor reduction in memory traffic - and crucially the T x T matrix is never MATERIALIZED, so peak memory falls from O(T^2) to O(T)."
        }
      ],
      "code": [
        {
          "h": "The tiled algorithm, written out",
          "paras": [
            "A readable (not fast) transcription of the forward pass. The real kernel is CUDA/Triton with the inner loop resident in SRAM, but the arithmetic is exactly this - and running it against the reference implementation confirms exactness."
          ],
          "code": "import torch, math\n\ndef flash_forward(Q, K, V, block=128):\n    \"\"\"Exact attention with O(T) memory - never materializes the T x T matrix.\"\"\"\n    T, d = Q.shape\n    O = torch.zeros_like(Q)\n    l = torch.zeros(T, 1)                     # running sum of exponentials\n    m = torch.full((T, 1), float('-inf'))     # running row max\n\n    for j in range(0, T, block):              # loop over KEY blocks\n        Kj, Vj = K[j:j+block], V[j:j+block]\n        Sj = (Q @ Kj.T) / math.sqrt(d)        # this tile only - stays in fast memory\n        m_new = torch.maximum(m, Sj.max(dim=-1, keepdim=True).values)\n        Pj = torch.exp(Sj - m_new)            # rescaled to the NEW max\n        scale = torch.exp(m - m_new)          # correction for what we already have\n        l = scale * l + Pj.sum(dim=-1, keepdim=True)\n        O = scale * O + Pj @ Vj               # fold this block into the running output\n        m = m_new\n    return O / l                              # normalize once, at the end\n\ntorch.manual_seed(0)\nQ, K, V = (torch.randn(1024, 64, dtype=torch.float64) for _ in range(3))\nref = torch.softmax(Q @ K.T / math.sqrt(64), dim=-1) @ V\nout = flash_forward(Q, K, V)\nprint('max abs diff vs reference:', (out - ref).abs().max().item())   # ~1e-15  EXACT",
          "caption": "The tiled forward pass with online softmax, verified against the reference to floating-point precision. The rescaling by exp(m_old - m_new) whenever a block raises the running maximum is what makes tiling exact rather than approximate."
        },
        {
          "h": "What it buys, and how to use it",
          "paras": [
            "In practice you never write this yourself - PyTorch dispatches to a FlashAttention kernel automatically through scaled_dot_product_attention when the shapes and dtype qualify. The numbers are why it matters: memory falls from quadratic to linear, which is what makes long-context training possible at all."
          ],
          "code": "import torch.nn.functional as F\n\n# PyTorch picks the FlashAttention kernel automatically when eligible:\nout = F.scaled_dot_product_attention(q, k, v, is_causal=True)   # (B, h, T, d_k)\n\n# attention-matrix memory per layer, batch 8, 16 heads, fp16:\n#   T       standard (materialized)      flash (never materialized)\n#   1024              256 MB                        ~0\n#   4096            4,096 MB                        ~0\n#  16384           65,536 MB  <- impossible         ~0\n#\n# measured speedup (A100, fp16, forward+backward), typical published figures:\n#   T=512   ~2x     T=1024  ~2.5x     T=4096  ~3-4x     (grows with T)\n#\n# Flash-2 improved work partitioning across warps (~2x over Flash-1);\n# Flash-3 targets Hopper's async copies and FP8. Same math, better scheduling.",
          "caption": "Use it through scaled_dot_product_attention rather than hand-rolling it. The decisive column is memory: the attention matrix is never materialized, so a 16K-token sequence stops being impossible - speed is the secondary benefit."
        }
      ],
      "useCases": [
        "Long-context training and inference: the O(T^2) attention matrix is what made 8K+ sequences infeasible, so FlashAttention is a precondition for essentially every long-context model shipped since 2022.",
        "Everyday training speedups: it is the default kernel behind PyTorch's scaled_dot_product_attention and is used by every major training framework, giving 2-4x end-to-end attention speedups with no accuracy change and no code change.",
        "Larger batch sizes at fixed memory: because activation memory for attention drops from quadratic to linear, the freed memory converts directly into batch size, which raises throughput independently of the kernel's own speedup.",
        "A template for kernel-level thinking: the same IO-aware pattern - tile, keep the working set in fast memory, recompute rather than store - reappears in fused MLP kernels, quantized inference kernels, and paged-attention implementations."
      ],
      "pitfalls": [
        "Calling it an approximation: FlashAttention computes exact attention. Confusing it with sparse or linear attention (which change the function) is the most common misunderstanding, and it matters because exactness is why adoption was frictionless.",
        "Expecting the speedup to come from fewer FLOPs: it does MORE arithmetic (recomputation in the backward pass) and wins by moving less data. If you reason about it in FLOPs, the result looks impossible.",
        "Assuming it always applies: kernels support specific head dimensions (commonly up to 128 or 256), dtypes (fp16/bf16, not fp32 on most versions), and attention-bias patterns. A custom additive bias (T5-style relative bias, ALiBi in some implementations, logit soft-capping) can silently disqualify the fast path and fall back to the slow one.",
        "Ignoring the fallback silently: PyTorch will quietly use the math backend if the flash path is ineligible, so a model can be far slower than expected with no error. Check with the SDPA kernel-selection context manager or profile it.",
        "Thinking it fixes long-context serving: it removes the attention-matrix memory during compute, but the KV CACHE is a separate, still-linear-in-T cost. Long-context inference needs GQA, paged attention, and cache quantization as well."
      ],
      "connections": [
        {
          "ref": "transformers/multi-head-attention",
          "text": "This computes exactly that operator - the T x T matrix it avoids materializing is the one derived there, which is why the memory accounting matters."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Complementary bottlenecks: FlashAttention addresses the attention matrix during compute; the KV cache is a separate memory cost that dominates decoding."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The same trade in a different place - recompute activations instead of storing them, because compute is cheaper than memory traffic. FlashAttention applies it inside a single operator."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "Removing the quadratic memory term is what made long-context training viable; the positional-scaling methods handle the other half of the problem."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is FlashAttention?",
          "a": "An IO-aware exact attention algorithm: tile the computation so the T x T score matrix is never written to HBM, using an online-softmax recurrence to keep it exact."
        },
        {
          "q": "Is it an approximation?",
          "a": "No - identical outputs and gradients to standard attention (up to floating-point reassociation). That exactness is why it could be adopted as a drop-in default."
        },
        {
          "q": "What is the actual bottleneck it addresses?",
          "a": "Memory bandwidth. Standard attention writes and re-reads the T x T matrix several times; the operation is bandwidth-bound, not compute-bound."
        },
        {
          "q": "What is online softmax?",
          "a": "A recurrence maintaining a running max and running sum of exponentials, rescaling accumulated results by exp(m_old - m_new) when a new block raises the max - so softmax can be computed blockwise, exactly."
        },
        {
          "q": "Why is the running max needed?",
          "a": "Numerical stability - subtracting the max before exponentiating prevents overflow. Tiling means the max is only known incrementally, hence the rescaling."
        },
        {
          "q": "What does the backward pass do differently?",
          "a": "It RECOMPUTES the attention tiles from saved q, k, v rather than storing the T x T matrix - extra FLOPs, far less memory traffic, net win."
        },
        {
          "q": "What is the memory complexity?",
          "a": "O(T) instead of O(T^2) for the attention matrix, because the matrix is never materialized. This is the change that made long-context training possible."
        },
        {
          "q": "What speedup is typical?",
          "a": "Roughly 2-4x on attention, growing with sequence length. End-to-end model speedup is smaller, since attention is only part of the block."
        },
        {
          "q": "How do you use it in PyTorch?",
          "a": "F.scaled_dot_product_attention dispatches to a FlashAttention kernel automatically when shapes, dtype, and bias pattern qualify."
        },
        {
          "q": "When does it NOT apply?",
          "a": "Unsupported head dimensions, fp32 on most versions, or custom additive attention biases (T5 relative bias, logit soft-capping) - these silently fall back to the slow math backend."
        },
        {
          "q": "What changed in FlashAttention-2 and -3?",
          "a": "Same math, better scheduling: FA-2 improved work partitioning across warps/thread blocks (~2x); FA-3 exploits Hopper's asynchronous copies and FP8."
        },
        {
          "q": "Does it help inference decoding?",
          "a": "Partly - it helps prefill (long prompts). Decode is dominated by KV-cache and weight reads, which need GQA, paged attention, and quantization instead."
        }
      ],
      "standard": [
        {
          "q": "Explain FlashAttention: what problem it solves, how tiling plus online softmax works, and why the result is exact.",
          "a": "THE PROBLEM. Write standard attention as it appears in textbooks: S = QK^T/sqrt(d), P = softmax(S), O = PV. Each of those lines materializes a T x T matrix in GPU high-bandwidth memory. So the sequence of memory operations is: write S (T^2 values), read S, write P, read P, write O. For batch 8, 16 heads, T = 4096 in fp16, one attention matrix is ~4 GB, and it is traversed several times per layer, per forward pass, and again in the backward pass. Meanwhile the arithmetic - two matmuls of order T^2*d - is modest by GPU standards. The consequence is that attention is MEMORY-BANDWIDTH-BOUND: the GPU is idle waiting on HBM. And separately, the O(T^2) peak memory is what makes long sequences impossible regardless of speed. THE INSIGHT. GPUs have a small amount of extremely fast on-chip SRAM (tens of KB to a few hundred KB per streaming multiprocessor, with bandwidth an order of magnitude above HBM). If you can arrange the computation so that each piece of work fits in SRAM and produces its final contribution before being evicted, you never write the intermediate to HBM at all. That is TILING, and it is standard practice for matmuls. The obstacle specific to attention is the SOFTMAX, which normalizes over an entire row - so you seemingly cannot finish any part of the output until you have seen every key. THE RESOLUTION - ONLINE SOFTMAX (Milakov and Gimelshein, 2018). Maintain, for each query row, a running maximum m and a running sum of exponentials l, plus a running unnormalized output O. Process keys in blocks. For a new block: compute its local scores, take m_new = max(m_old, block max), exponentiate the block's scores relative to m_new, and RESCALE the previously accumulated l and O by exp(m_old - m_new) before adding the new contributions. At the end, divide O by l. The rescaling corrects the earlier terms for the fact that they were exponentiated relative to a smaller maximum - so the result is algebraically identical to computing the softmax over the whole row at once. THE ALGORITHM. Outer loop over query blocks, inner loop over key/value blocks; load Q_i, K_j, V_j into SRAM; compute the tile's scores; update m, l, O in place; move on. The T x T matrix exists only one tile at a time, in fast memory, and is never written to HBM. THE BACKWARD PASS. Gradients normally need the attention matrix P, which we did not store. FlashAttention RECOMPUTES the tiles from the saved Q, K, V (which are O(T*d), not O(T^2)) during the backward pass. This costs extra FLOPs - and still wins, because those FLOPs were never the bottleneck while the memory traffic was. It is the same trade as gradient checkpointing, applied inside a single operator. WHY IT IS EXACT, which is the part people doubt. Every step is an algebraic identity: the rescaling exactly compensates for the changing maximum, and the final division by l normalizes correctly. There is no dropped term, no approximation, no sparsity assumption. Numerically the result differs from the reference only by floating-point REASSOCIATION (a different summation order), which is the same magnitude of difference you get from changing batch size or using a different matmul algorithm. Verify it by running the tiled version in float64 against the reference - the difference is ~1e-15. THE RESULTS AND WHY THEY MATTER: 2-4x faster attention (growing with T) and, more importantly, O(T) memory instead of O(T^2), which is what turned 8K-64K training from impossible into routine. FlashAttention-2 rewrote the work partitioning across warps and thread blocks for roughly another 2x; FlashAttention-3 targets Hopper's asynchronous copy engines and FP8. Same mathematics throughout - the improvements are entirely in scheduling. THE GENERALIZABLE LESSON, and the thing to say last: on modern accelerators, arithmetic is cheap and data movement is expensive. An algorithm that performs MORE FLOPs to move LESS data usually wins, and FLOPs are therefore a poor proxy for speed. That reframing is the paper's real contribution - it is titled 'IO-Awareness' for a reason.",
          "deepDive": {
            "q": "Derive the online softmax recurrence and prove the rescaling makes it exact.",
            "a": "SETUP. We want softmax(x_1, ..., x_N) computed in blocks, where the standard stable formulation is p_i = exp(x_i - m) / sum_j exp(x_j - m) with m = max_j x_j (the max subtraction prevents overflow). The difficulty is that m depends on all N values. STATE. After processing the first k elements, maintain: m^(k) = max over the first k of x, and l^(k) = sum over the first k of exp(x_i - m^(k)). Note the crucial detail - l is defined relative to the CURRENT max, so it must be corrected whenever the max changes. THE RECURRENCE. Suppose we now see element x_{k+1}. The new max is m^(k+1) = max(m^(k), x_{k+1}). We need l^(k+1) = sum over the first k+1 of exp(x_i - m^(k+1)). Split the sum: the new term is exp(x_{k+1} - m^(k+1)). For the old terms, sum over the first k of exp(x_i - m^(k+1)) = sum over the first k of exp(x_i - m^(k)) * exp(m^(k) - m^(k+1)) = exp(m^(k) - m^(k+1)) * l^(k), because the exponent difference factors out of every term identically. So l^(k+1) = exp(m^(k) - m^(k+1)) * l^(k) + exp(x_{k+1} - m^(k+1)). That is the recurrence, and the derivation IS the proof - each step is an exact factorization, not an approximation. Note that exp(m^(k) - m^(k+1)) <= 1 always, so the rescaling never amplifies, which is why the scheme is numerically well-behaved. EXTENDING TO THE ATTENTION OUTPUT. We do not just want the softmax weights; we want O = sum_i p_i v_i. Maintain an UNNORMALIZED running output O^(k) = sum over the first k of exp(x_i - m^(k)) * v_i. The same factorization applies: when the max updates, every previously accumulated term must be multiplied by exp(m^(k) - m^(k+1)), giving O^(k+1) = exp(m^(k) - m^(k+1)) * O^(k) + exp(x_{k+1} - m^(k+1)) * v_{k+1}. At the very end, divide: O = O^(N) / l^(N). Again exact. BLOCK VERSION. Nothing changes if you process B elements at a time - compute the block's local max, take the running max against it, rescale, and add the block's contributions. This is what makes it useful: the inner loop is a matmul over a tile, not a scalar loop. THE FLOATING-POINT CAVEAT, which is worth stating precisely because 'exact' invites scepticism: the recurrence is exact in REAL arithmetic. In floating point, the result differs from the one-shot computation by REASSOCIATION error - you are summing the same terms in a different order, and floating-point addition is not associative. The magnitude is the ordinary accumulation error of the summation, comparable to what you already accept when a matmul library chooses a different tiling, or when you change batch size. It is emphatically NOT the kind of error an approximation introduces (dropped terms, sparsity assumptions), and it does not grow with sequence length in any problematic way, since the rescaling keeps all accumulated quantities bounded. WHERE ELSE THIS PATTERN APPEARS, which shows it is a general technique rather than an attention trick: streaming/one-pass computation of any normalized quantity - log-sum-exp in HMM forward algorithms, streaming statistics (Welford's algorithm for running variance is the same idea), and split-K reductions in matmul kernels. The unifying principle is: if your reduction has a normalizer that depends on all elements, keep the normalizer as running state and rescale the accumulator whenever it changes. Being able to derive that on the spot is a much better answer than citing the paper."
          }
        },
        {
          "q": "Why does an algorithm that does MORE arithmetic run faster? Explain the roofline reasoning.",
          "a": "THE ROOFLINE MODEL, which is the frame for the whole answer. A kernel's achievable performance is min(peak compute, arithmetic_intensity * memory_bandwidth), where arithmetic intensity is FLOPs performed per BYTE moved between HBM and the chip. Every kernel sits somewhere on that curve: below the 'knee' it is MEMORY-BOUND (adding FLOPs is free, reducing bytes is what helps), above it is COMPUTE-BOUND (the reverse). Modern accelerators have pushed the knee far to the right - an A100 does ~312 TFLOP/s in fp16 against ~2 TB/s of HBM bandwidth, so you need roughly 150 FLOPs per byte to saturate compute. Very few operations achieve that. WHERE ATTENTION SITS. Standard attention writes and re-reads a T x T matrix multiple times while doing O(T^2 d) arithmetic, so its intensity is roughly d FLOPs per element moved, i.e. ~64-128 - below the knee, and worse in practice because of the multiple passes. It is memory-bound, which means the GPU's arithmetic units are idle much of the time, waiting on HBM. So the operation is not limited by how much math it does. THE CONSEQUENCE. If you are memory-bound, doing MORE arithmetic costs nothing (the units were idle anyway) while moving FEWER bytes buys time proportionally. FlashAttention's backward pass recomputes attention tiles instead of reading a stored matrix: it adds real FLOPs and removes a huge amount of HBM traffic, and the net effect is a speedup. Stated as a rule: when memory-bound, trade compute for memory traffic; when compute-bound, do the opposite. THE SAME TRADE ELSEWHERE, which shows it is a principle rather than a trick. (a) GRADIENT CHECKPOINTING - store a subset of activations and recompute the rest during backward, roughly 30% more compute for a large memory saving; the same reasoning, applied across layers rather than within an operator. (b) OPERATOR FUSION generally - fusing conv+BN+ReLU, or the elementwise chain after a matmul, avoids round-tripping intermediates through HBM and is one of the highest-value compiler optimizations precisely because those elementwise ops are pure bandwidth. (c) QUANTIZATION for LLM decoding - int4 weights do not reduce the number of multiply-accumulates meaningfully, but they quarter the bytes read, and decode is bandwidth-bound on weight reads, so it is nearly a 4x speedup. (d) RECOMPUTATION IN MEMORY-EFFICIENT ATTENTION variants and in some distributed-training schedules. WHY 'FLOPs' PERSISTS AS A METRIC DESPITE THIS: it is hardware-independent, easy to compute analytically, and correlates with cost when comparing architectures in the same regime. But it becomes actively misleading exactly when you optimize hard against it - MobileNet's depthwise convolutions cut FLOPs ~9x and deliver 2-3x wall-clock, EfficientNets have excellent FLOP counts and are often slower than ResNets of equal accuracy on GPUs, and FlashAttention increases FLOPs while being faster. The pattern is consistent: FLOP-optimal designs tend to have low arithmetic intensity, and low intensity means bandwidth-bound. HOW I WOULD APPLY THIS IN PRACTICE. Profile first and classify each hot kernel as compute-bound or memory-bound (most profilers report achieved bandwidth and achieved FLOP/s, so you can place it on the roofline directly). For memory-bound kernels: fuse, tile, recompute, quantize, and fix memory layouts. For compute-bound kernels: reduce work, use lower precision to hit faster tensor-core paths, improve parallelism. Choosing the wrong category wastes effort - optimizing FLOPs in a bandwidth-bound kernel produces no speedup at all, which is the single most common wasted-optimization story in ML engineering."
        },
        {
          "q": "How does FlashAttention differ from sparse or linear attention methods?",
          "a": "THE FUNDAMENTAL DISTINCTION: FlashAttention changes HOW attention is computed; sparse and linear attention change WHAT is computed. FlashAttention is exact - identical outputs and gradients. Sparse and linear methods are approximations that alter the function the model computes. That difference explains essentially everything about their relative adoption. FLASHATTENTION: an IO-aware exact algorithm. Complexity in FLOPs remains O(T^2 d) - it does not beat the quadratic bound - but memory traffic and peak memory fall dramatically, giving 2-4x speed and O(T) memory. Because it is exact, it is a DROP-IN REPLACEMENT: you can swap it into an existing trained model, or into a training run mid-flight, with zero accuracy consequences and no retraining. That frictionlessness is why it became the default in PyTorch within about a year. SPARSE ATTENTION (Longformer, BigBird, Sparse Transformer, sliding-window as in Mistral): restrict which query-key pairs are computed at all - local windows, strided patterns, a few global tokens, or random connections. Complexity becomes O(T * w) for window size w, i.e. linear in T. The cost is that the model genuinely cannot attend to what you excluded, so it must be TRAINED with the pattern (retrofitting a dense-trained model works poorly), and the pattern encodes an assumption about which interactions matter. BigBird's theoretical result that its pattern preserves universal-approximation properties is reassuring but does not mean a specific model trained with it will match dense attention on a specific task. LINEAR ATTENTION (Performer, Linear Transformer, and the kernel-feature family): rewrite softmax(QK^T)V using a feature map so that you can compute (phi(K)^T V) first and then multiply by phi(Q), turning O(T^2 d) into O(T d^2). Elegant and genuinely linear, but the softmax kernel must be approximated (random features in Performer, or replaced by a different similarity), and empirically these have consistently underperformed dense attention on language modelling at scale, with the gap attributed to losing the sharp, selective attention distributions that softmax provides. STATE-SPACE MODELS (Mamba and successors) are the modern successor to this line - not attention approximations but a different sequence-mixing primitive with linear scaling and a recurrent inference form; Mamba's key move was making the state transitions INPUT-DEPENDENT, which recovers the content-based selectivity that earlier linear methods lost. They are competitive, and current strong models are often HYBRIDS that keep some full-attention layers (for retrieval-like behaviour) and use cheaper mixing elsewhere. WHY EXACTNESS MATTERED SO MUCH, and the strategic point: FlashAttention required no research risk. A lab could adopt it and know with certainty that model quality was unchanged - the only question was engineering. Sparse and linear methods require retraining, carry quality risk, need per-task validation, and interact with everything else in the stack. So even where an approximation might be better on paper, the exact method wins on adoption. This is a recurring dynamic worth naming: drop-in improvements diffuse orders of magnitude faster than improvements that require retraining. HOW THEY COMBINE, since they are not exclusive: FlashAttention kernels support causal masking and sliding-window patterns, so you can have an exact fast kernel computing a sparse pattern - Mistral does exactly this. The right mental model is that FlashAttention is a better implementation of whatever attention pattern you choose, while sparsity/linearity choose the pattern. THE ONE-LINE ANSWER: FlashAttention is an exact IO-aware implementation that does not reduce asymptotic FLOPs but removes the memory bottleneck; sparse and linear attention reduce asymptotic complexity by approximating the function, requiring retraining and accepting quality risk. Use FlashAttention always; use sparsity when your sequences are long enough that even exact attention is unaffordable and your task tolerates the pattern."
        },
        {
          "q": "Your model is not getting the expected FlashAttention speedup. How would you debug it?",
          "a": "The most common cause is that the fast kernel is not actually running, and the second most common is that attention was not your bottleneck. I would check in that order. (1) VERIFY THE KERNEL IS BEING USED. PyTorch's scaled_dot_product_attention silently falls back to a slower math backend when the flash path is ineligible - no warning, just slow. Use the SDPA kernel-selection context manager (enabling only the flash backend will raise an error instead of falling back, which is the fastest way to find out) or profile and look for the kernel name in the trace. Common disqualifiers: an unsupported HEAD DIMENSION (kernels support specific sizes, commonly up to 128 or 256); DTYPE (most flash kernels are fp16/bf16 only - fp32 falls back); an ARBITRARY ADDITIVE ATTENTION BIAS (T5-style relative position bias, ALiBi in some implementations, logit soft-capping as in Gemma-2) which the fused kernel cannot express; unusual masking that is neither pure-causal nor a supported pattern; non-contiguous tensors or an unexpected memory layout; and dropout in some configurations. Fixing a head dimension from 96 to 128, or expressing a mask as is_causal=True rather than an explicit additive mask, is frequently the entire fix. (2) CHECK WHETHER ATTENTION IS ACTUALLY THE BOTTLENECK. Attention's share of runtime depends on the ratio of sequence length to model width. Recall the crossover: projections and the FFN cost O(T*d^2) while attention costs O(T^2*d), so attention dominates only once T > d_model. For a 4096-wide model at T=1024, attention is a minority of the block's time, so even a 4x attention speedup is maybe a 15% end-to-end gain - Amdahl's law, and exactly what you would expect. Profile per-operator and compute attention's share before concluding anything is wrong. (3) LOOK AT WHAT ELSE THE FREED MEMORY SHOULD HAVE BOUGHT. A major part of FlashAttention's value is memory, not speed: if you did not INCREASE BATCH SIZE after adopting it, you left most of the benefit on the table. The memory saving converts to throughput only if you use it. (4) CHECK THE VERSION AND HARDWARE. FlashAttention-2 is roughly 2x FA-1 through better work partitioning; FA-3 needs Hopper. Running FA-1 on an H100 leaves a lot unclaimed. Also confirm the installed package actually built its CUDA extensions - a silent fallback to a pure-PyTorch path is common in misconfigured environments. (5) CHECK FOR SURROUNDING OVERHEAD. If RoPE, masking, or reshapes around the attention call are unfused and materializing large intermediates, they can dominate what you saved. Look for unnecessary .contiguous() calls, permutes, and mask tensors being broadcast to full (B, h, T, T) shape - the last one re-creates the very O(T^2) allocation you were trying to avoid, and it is a surprisingly frequent bug. (6) MEASURE PROPERLY. Warm up before timing (kernel autotuning and cudagraph capture happen on first calls), synchronize CUDA before taking timestamps, and time steady-state steps rather than the first few. A large fraction of 'no speedup' reports are measurement artifacts. THE ORDER I WOULD RUN IT: force the flash-only backend and see whether it errors (30 seconds, catches most cases) -> profile per-operator to get attention's true share -> check batch size and memory headroom -> check versions and hardware -> inspect the surrounding ops for accidental T^2 allocations. And the framing I would state up front: 'no speedup' is usually 'the kernel is not running' or 'attention was 15% of runtime', and both are answerable with a profile rather than with guesses."
        },
        {
          "q": "What did FlashAttention change about how the field thinks about efficiency?",
          "a": "Three shifts, and they are worth separating because each has independent consequences. (1) IT MOVED THE UNIT OF OPTIMIZATION FROM ASYMPTOTICS TO MEMORY HIERARCHY. Before it, the accepted way to make attention cheaper was to reduce the O(T^2) FLOP count - hence years of work on sparse patterns, low-rank approximations, and linear attention, all of which changed the FUNCTION and required retraining, and most of which underperformed dense attention at scale. FlashAttention showed the practical bottleneck was never the FLOPs; it was the round trips to HBM. Keeping the same asymptotic complexity but restructuring the data movement produced a larger practical win than any of the approximations, with no quality cost. The lesson generalized quickly: several 'efficient transformer' research lines lost relevance not because their math was wrong but because the baseline got much faster without approximating anything. (2) IT MADE IO-AWARENESS AND CUSTOM KERNELS A MAINSTREAM ML SKILL. Before, most ML researchers composed framework operators and left kernels to vendors. FlashAttention demonstrated that a hand-written, hierarchy-aware kernel could beat the standard composition by several times on the single most important operator in the field - and that the win came from reasoning about SRAM capacity and HBM traffic, not from a new model idea. The downstream effects are visible: Triton became a widely-used tool so that researchers can write fused kernels in Python; torch.compile invests heavily in automatic fusion; 'what is this kernel's arithmetic intensity?' became a normal question in ML engineering discussions; and a genre of ML-systems work (paged attention, fused MoE kernels, quantized inference kernels) grew directly out of the same style of reasoning. (3) IT ESTABLISHED THAT EXACT DROP-IN IMPROVEMENTS DIFFUSE FAR FASTER THAN APPROXIMATE ONES. Because the output is bit-comparable, adoption carried zero research risk - a lab could switch mid-training-run. Within about a year it was the default path in PyTorch. Compare that to sparse attention variants, which after years remain niche because each requires retraining, per-task validation, and a quality bet. The strategic lesson for anyone proposing an efficiency method is that 'requires retraining' is an enormous adoption tax, and methods that avoid it can be worth far more in practice than methods that are better on paper. THE SECOND-ORDER EFFECT, which is the most important one: by removing the memory wall, FlashAttention made long-context training economically feasible, which enabled the 32K-128K+ context models that followed and, with them, a wave of applications (long-document analysis, large-codebase reasoning, retrieval-augmented systems with big prompts). A kernel optimization changed what products were possible - which is a useful counterweight to the assumption that capability gains come only from model or data scale. THE HONEST LIMITS to state alongside all this: it does not change the quadratic FLOP complexity, so at extreme lengths attention still dominates; it addresses the attention matrix but not the KV cache, so long-context INFERENCE still needs GQA, paged attention, and quantization; and it is hardware-specific, requiring a rewrite per architecture generation (FA-2, FA-3), which is a real maintenance cost and a reason the field also wants compilers that can generate such kernels automatically. The most durable takeaway is the mental model rather than the kernel: profile, find whether you are compute- or memory-bound, and optimize the resource that is actually binding - which is advice that outlives any particular GPU."
        },
        {
          "q": "Could you apply the FlashAttention idea to other operations? Give an example.",
          "a": "Yes - the pattern is general, and stating it abstractly is the useful part: (a) identify an operation that materializes a large intermediate in slow memory, (b) restructure it into TILES whose working set fits in fast memory, (c) if there is a global reduction blocking tiling (like softmax's normalizer), find a RUNNING-STATE recurrence that makes it exact, and (d) in the backward pass, RECOMPUTE the intermediate rather than storing it. Several places this applies. (1) FUSED CROSS-ENTROPY OVER A LARGE VOCABULARY - the clearest analogue, and a real production problem. Computing logits for a 128K-token vocabulary at batch*seq positions materializes an enormous logits tensor (for 8x4096 positions and 128K vocab in fp16, ~8 GB) just to compute a loss that is a scalar. A fused kernel tiles over the vocabulary, maintains the same running max and running sum-of-exponentials as online softmax, accumulates the loss, and recomputes in the backward pass - never materializing the logits. This is now implemented in several libraries (Liger, cut-cross-entropy) and can free enough memory to meaningfully raise batch size for large-vocabulary models. Same recurrence, different operator. (2) FUSED MLP / ACTIVATION CHAINS. An FFN in a transformer materializes a d_ff-wide intermediate (4x or 8/3x the model width) purely to pass it to the next matmul. Fusing the up-projection, activation, and down-projection over tiles avoids writing it to HBM. This is what torch.compile's inductor does automatically for elementwise chains, and what hand-written fused SwiGLU kernels do explicitly. (3) FUSED SOFTMAX AND NORMALIZATION generally. Any operation whose cost is dominated by reading and writing the tensor (LayerNorm, RMSNorm, softmax, dropout) benefits from being fused into its neighbours - this is the bulk of what a compiler's fusion pass buys, and it is why RMSNorm's saving of one reduction pass is measurable. (4) ATTENTION VARIANTS: paged attention (vLLM) applies the same tiling to a cache stored in non-contiguous blocks; ring attention distributes the key/value blocks across devices and rotates them, applying the online-softmax recurrence ACROSS devices to handle sequences longer than one GPU's memory - a direct extension of exactly this algorithm. (5) K-NEAREST-NEIGHBOUR AND SIMILARITY SEARCH: computing an N x M distance matrix to take a top-k is the same anti-pattern; tiled kernels maintain a running top-k per query and never materialize the full matrix - and this predates FlashAttention (it is what FAISS and similar libraries do), which is a nice reminder that the idea is a classic HPC technique. WHERE IT DOES NOT APPLY, which is the discriminating part of the answer: (a) when the operation is already COMPUTE-BOUND (a large dense matmul with high arithmetic intensity is already tiled and near roofline - there is nothing to reclaim); (b) when the large intermediate is genuinely NEEDED downstream in full (you cannot avoid materializing something a later op reads in its entirety, unless you can fuse that op too); (c) when the reduction has no exact running form - some operations cannot be tiled without approximation, in which case you are back to trading accuracy; (d) when the intermediate is small relative to the inputs, so there is nothing to save. HOW I WOULD IDENTIFY A CANDIDATE in a real codebase: profile for kernels with high memory traffic and low achieved FLOP/s (the memory-bound quadrant of the roofline), then look for ones that write a large tensor which is consumed immediately by the next kernel and never used again. That pattern - big intermediate, single consumer, low intensity - is exactly what fusion or a FlashAttention-style rewrite targets, and it is usually where the easy wins are."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "FlashAttention",
        "back": "An IO-aware EXACT attention algorithm: tile the computation into SRAM so the T x T score matrix is never written to HBM, using online softmax to keep it exact. 2-4x faster, O(T) memory instead of O(T^2)."
      },
      {
        "type": "pitfall",
        "front": "It is not an approximation",
        "back": "Identical outputs and gradients (differing only by floating-point reassociation). That exactness is why it became a zero-risk drop-in default - unlike sparse/linear attention, which change the function and need retraining."
      },
      {
        "type": "formula",
        "front": "Online softmax recurrence",
        "back": "m_new = max(m_old, block_max); l = exp(m_old-m_new)*l + block_sum; O = exp(m_old-m_new)*O + P_block @ V_block; divide by l at the end. The rescaling exactly corrects earlier terms for the changed max."
      },
      {
        "type": "intuition",
        "front": "Why more FLOPs can be faster",
        "back": "Attention is MEMORY-BANDWIDTH-BOUND, so the arithmetic units are idle. Recomputing tiles in the backward pass adds free FLOPs and removes HBM traffic. Roofline: perf = min(peak compute, intensity x bandwidth)."
      },
      {
        "type": "definition",
        "front": "Backward-pass recomputation",
        "back": "Rather than storing the T x T attention matrix for gradients, recompute tiles from the saved q,k,v (which are only O(T*d)). Same trade as gradient checkpointing, applied inside one operator."
      },
      {
        "type": "pitfall",
        "front": "Silent fallback in PyTorch",
        "back": "scaled_dot_product_attention quietly uses the slow math backend when ineligible: unsupported head dim, fp32, or a custom additive bias (T5 relative bias, logit soft-capping). Force the flash-only backend to make it error instead."
      },
      {
        "type": "intuition",
        "front": "Attention's share of runtime",
        "back": "Projections+FFN are O(T*d^2), attention is O(T^2*d) - attention dominates only once T > d_model. At T=1024, d=4096, a 4x attention speedup is maybe 15% end-to-end. Profile before concluding the kernel is broken."
      },
      {
        "type": "definition",
        "front": "FA-1 vs FA-2 vs FA-3",
        "back": "Same mathematics, better scheduling: FA-2 improved work partitioning across warps/thread blocks (~2x); FA-3 exploits Hopper async copies and FP8. Version and hardware mismatches leave large gains unclaimed."
      },
      {
        "type": "pitfall",
        "front": "It does not fix long-context serving",
        "back": "It removes the attention-MATRIX memory during compute, but the KV CACHE is a separate cost that is still linear in T and dominates decode. Long context also needs GQA, paged attention, and cache quantization."
      },
      {
        "type": "intuition",
        "front": "The transferable pattern",
        "back": "Tile so the working set fits fast memory; use a running-state recurrence for any global reduction; recompute instead of storing in backward. Applies to fused large-vocabulary cross-entropy, fused MLPs, ring attention, and top-k search."
      }
    ],
    "refs": [
      {
        "title": "Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
        "url": "https://arxiv.org/abs/2205.14135"
      },
      {
        "title": "Dao (2023), FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning",
        "url": "https://arxiv.org/abs/2307.08691"
      },
      {
        "title": "Milakov & Gimelshein (2018), Online normalizer calculation for softmax",
        "url": "https://arxiv.org/abs/1805.02867"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      }
    ],
    "demos": [
      "attention",
      "paged-attention",
      "kv-cache"
    ]
  },
  "kv-cache": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Training and generation look like the same computation and are not. In TRAINING, the whole sequence is available, so every position is processed in parallel in one forward pass - which is the property that made transformers scalable in the first place. In GENERATION you have only what you have produced so far, so tokens come out one at a time, each requiring its own forward pass. Done naively, generating token t re-runs the model over the entire prefix, recomputing keys and values for every earlier position - and since those recomputations are identical every step, producing a sequence of length T costs O(T^3) work instead of O(T^2).",
        "The KV CACHE removes the redundancy with one observation: a token's key and value depend only on that token's hidden state, which never changes once computed. So store them. Each new step computes K and V for the new token only, appends them to the cache, and attends against everything stored. Per-token cost drops from O(T^2) to O(T), and generation becomes practical. Every inference stack does this; it is not an optimization so much as a precondition.",
        "The cache then becomes the dominant engineering problem, and this is where the topic gets interesting. Its size is 2 x layers x kv_heads x head_dim x sequence_length x batch, which at long context or high concurrency EXCEEDS the model weights - and because decoding reads the whole cache to produce each token, cache size translates almost directly into tokens-per-second. That single fact drives an entire architectural and systems agenda: GQA and MLA shrink it, paged attention stops wasting it, quantization compresses it, eviction and sliding windows bound it, and prefix caching shares it. It also explains the sharp asymmetry between PREFILL (processing the prompt - parallel, compute-bound) and DECODE (one token at a time - sequential, memory-bandwidth-bound), which is the single most important distinction in LLM serving."
      ],
      "math": [
        {
          "h": "Cost with and without the cache",
          "paras": [
            "Without a cache, step t redoes the whole prefix, so the total is the sum of t^2 over all steps. With a cache, step t attends against t cached positions and computes only one new key/value, so the total is the sum of t. The cache turns a cubic into a quadratic - and per token, a quadratic into a linear."
          ],
          "tex": "\\underbrace{\\sum_{t=1}^{T} \\Theta(t^2 d) = \\Theta(T^3 d)}_{\\text{no cache}} \\qquad\\longrightarrow\\qquad \\underbrace{\\sum_{t=1}^{T} \\Theta(t d) = \\Theta(T^2 d)}_{\\text{with cache}}",
          "texNote": "Per-token: O(T^2 d) without the cache versus O(T d) with it. The quadratic total remains because attending to a growing prefix is inherently linear per token - the cache removes the redundant RECOMPUTATION, not the attention itself."
        },
        {
          "h": "Cache size, and why it decides throughput",
          "paras": [
            "The cache stores K and V for every layer, every KV head, and every position, for each sequence in the batch. Because decoding must READ all of it to emit one token, and decode is bandwidth-bound, tokens-per-second is roughly bounded by (bytes read) / (memory bandwidth) - so this formula is simultaneously a memory budget and a latency model."
          ],
          "tex": "\\text{bytes} = 2 \\cdot n_{\\text{layers}} \\cdot n_{\\text{kv heads}} \\cdot d_k \\cdot T \\cdot B \\cdot s, \\qquad \\text{tokens/s} \\lesssim \\frac{\\text{bandwidth}}{\\text{weights} + \\text{cache bytes read}}",
          "texNote": "s = bytes per element (2 for fp16, 1 for int8). Note n_kv_heads, not n_query_heads - the asymmetry GQA exploits. LLaMA-2 70B at 4K context, fp16, batch 1: ~21.5 GB with 64 KV heads, ~2.7 GB with 8 GQA groups."
        }
      ],
      "code": [
        {
          "h": "A cached generation loop, and the test that validates it",
          "paras": [
            "The structure every inference stack has: a PREFILL pass over the whole prompt, then a DECODE loop feeding one token at a time. The assertion at the end is the invariant worth building every cache implementation against - cached incremental generation must match a single full-sequence forward pass."
          ],
          "code": "import torch\n\nclass KVCache:\n    def __init__(self, n_layers):\n        self.k = [None] * n_layers\n        self.v = [None] * n_layers\n    def update(self, layer, k_new, v_new):        # k_new: (B, n_kv, 1, d_k) at decode\n        if self.k[layer] is None:\n            self.k[layer], self.v[layer] = k_new, v_new\n        else:\n            self.k[layer] = torch.cat([self.k[layer], k_new], dim=2)\n            self.v[layer] = torch.cat([self.v[layer], v_new], dim=2)\n        return self.k[layer], self.v[layer]\n\n@torch.no_grad()\ndef generate(model, prompt_ids, max_new=64):\n    cache = KVCache(model.n_layers)\n    logits = model(prompt_ids, cache=cache)            # PREFILL: all prompt tokens at once\n    out = [logits[:, -1].argmax(-1, keepdim=True)]\n    for _ in range(max_new - 1):                       # DECODE: one token per pass\n        logits = model(out[-1], cache=cache)           # feed ONLY the newest token\n        out.append(logits[:, -1].argmax(-1, keepdim=True))\n    return torch.cat(out, dim=1)\n\n# THE INVARIANT: cached incremental generation == one full-sequence forward pass.\nseq = torch.cat([prompt_ids, generated], dim=1)\nfull = model(seq).logits                               # no cache, whole sequence\nassert torch.allclose(full[:, -1], cached_last_logits, atol=1e-4)\n# This single test catches nearly every cache bug: wrong positions, re-applied RoPE,\n# off-by-one between prefill and decode, and mask misalignment.",
          "caption": "Prefill processes the prompt in one parallel pass; decode feeds one token at a time and appends to the cache. The equivalence assertion - cached generation must match a full-sequence forward - is the test that catches virtually every cache implementation bug."
        },
        {
          "h": "The two phases have completely different bottlenecks",
          "paras": [
            "This table is the practical core of the topic. Prefill is compute-bound and parallel; decode is bandwidth-bound and sequential. Optimizations that help one frequently do nothing for the other, which is why serving systems treat them as separate problems."
          ],
          "code": "# 7B model, fp16, A100 (80GB, ~2 TB/s bandwidth, ~312 TFLOP/s):\n#\n#              PREFILL (2000-token prompt)      DECODE (per token)\n#   parallel?   all 2000 tokens at once          strictly sequential\n#   bound by    COMPUTE (~2*7e9*2000 FLOPs)      BANDWIDTH (read 14 GB of weights)\n#   utilization high (~50-70% of peak)           terrible (~1-3% of peak FLOPs)\n#   latency     ~200 ms (time-to-first-token)    ~7 ms/token (~140 tok/s)\n#   fix with    FlashAttention, more FLOPs       quantization, batching, speculation\n#\n# Why decode is so inefficient at batch 1: reading 14 GB of weights to do ~14 GFLOPs\n# is ~1 FLOP per byte - two orders of magnitude below the roofline knee. The fix is\n# BATCHING (amortize the weight read over many sequences) - which is why throughput\n# and per-user latency are in tension, and why continuous batching matters so much.\n\n# arithmetic intensity, decode, batch B:  ~B FLOPs per byte of weights\n#   B=1   -> hopeless   B=32  -> better   B=128 -> approaching compute-bound",
          "caption": "Prefill is compute-bound and parallel; decode is bandwidth-bound and sequential, running at a tiny fraction of peak FLOPs at batch 1. Batching is what fixes decode's arithmetic intensity - hence the throughput-versus-latency tension at the heart of LLM serving."
        }
      ],
      "useCases": [
        "Every deployed LLM: the cache is what makes autoregressive generation tractable at all, so every inference stack (vLLM, TensorRT-LLM, llama.cpp, SGLang) is organized around managing it.",
        "Capacity planning: the cache formula tells you how many concurrent sequences fit in a given amount of GPU memory, which is the number that determines serving cost per token - usually the first calculation in an LLM system-design interview.",
        "Prefix caching in products: chat applications with a long shared system prompt, few-shot prompts reused across requests, and agent loops that replay a growing history can compute the shared prefix's cache once and reuse it, often the single largest latency win available.",
        "Explaining why decoding is slow: the prefill/decode asymmetry is why time-to-first-token and tokens-per-second have different causes and different fixes, and why speculative decoding (which converts sequential decode into a parallel verify) works at all."
      ],
      "pitfalls": [
        "Re-applying position information to cached entries: keys are cached already carrying their original positional rotation or encoding, and re-rotating the whole cache each step silently destroys long-range behaviour. Test with the full-sequence equivalence assertion.",
        "Off-by-one between prefill and decode: the first generated token is at position T, not T-1. Getting this wrong usually still produces fluent text, so it can go unnoticed while quietly degrading quality.",
        "Pre-allocating the cache at maximum sequence length: a request with a 200-token prompt then occupies 32K worth of cache, wasting most of the memory. This internal fragmentation is exactly what paged attention eliminates, typically several-fold effective batch improvement.",
        "Assuming FlashAttention solves cache memory: it removes the attention MATRIX during compute, which is a separate quantity. The cache is untouched by it and remains linear in sequence length and batch.",
        "Optimizing throughput and latency as if they were one goal: batching raises tokens-per-second for the system while raising time-per-token for each user. The operating point is a product decision, and reporting a single 'speed' number hides it."
      ],
      "connections": [
        {
          "ref": "transformers/gqa-mqa",
          "text": "Grouped-query attention exists specifically to shrink this cache - the formula's n_kv_heads term is the lever, and an 8x reduction is what makes long-context serving feasible."
        },
        {
          "ref": "transformers/rope",
          "text": "Cached keys carry the rotation for their original positions, which is why the most common cache bug is re-applying RoPE to the whole cache each step."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "Speculative decoding attacks the other side of the same asymmetry: it turns several sequential decode steps into one parallel verification pass, with identical output distribution."
        },
        {
          "ref": "mlops/model-serving",
          "text": "Continuous batching, paged attention, and prefix sharing are serving-layer solutions to cache management, and usually give larger wins than any model-level change."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the KV cache?",
          "a": "Stored keys and values for all previously-processed tokens, so each new token computes only its own K and V and attends against the cache instead of recomputing the prefix."
        },
        {
          "q": "Why is it valid to cache them?",
          "a": "A token's key and value depend only on that token's hidden state, which does not change as later tokens are generated (guaranteed by causal masking)."
        },
        {
          "q": "What does it save?",
          "a": "Per-token cost drops from O(T^2) to O(T); total generation cost from O(T^3) to O(T^2)."
        },
        {
          "q": "Why are queries not cached?",
          "a": "A query is used once, at the step that creates it - only keys and values are consulted by FUTURE tokens."
        },
        {
          "q": "What is the cache size formula?",
          "a": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes_per_element. The 2 is K and V; note it uses KV heads, not query heads."
        },
        {
          "q": "What is prefill vs decode?",
          "a": "Prefill processes the whole prompt in one parallel pass (compute-bound). Decode generates one token per forward pass (sequential, memory-bandwidth-bound)."
        },
        {
          "q": "Why is decode so inefficient at batch 1?",
          "a": "It reads every weight to do a tiny amount of arithmetic - roughly 1 FLOP per byte, far below the roofline knee, so the GPU runs at a few percent of peak FLOPs."
        },
        {
          "q": "What fixes decode's inefficiency?",
          "a": "Batching (amortize weight reads over many sequences), quantization (fewer bytes to read), MoE (read only routed experts), and speculative decoding."
        },
        {
          "q": "What is paged attention?",
          "a": "vLLM's technique of allocating the cache in fixed-size blocks on demand rather than pre-allocating max length per sequence, eliminating internal fragmentation - typically several-fold more effective batch."
        },
        {
          "q": "What is prefix caching?",
          "a": "Computing the KV cache for a shared prompt prefix once and reusing it across requests - a large win for chat systems with a long common system prompt."
        },
        {
          "q": "What is time-to-first-token driven by?",
          "a": "Prefill: prompt length and compute. Tokens-per-second afterwards is driven by decode: weight and cache bandwidth. Different causes, different fixes."
        },
        {
          "q": "What is the single best test for a cache implementation?",
          "a": "Cached incremental generation must produce the same logits as one full-sequence forward pass over the same tokens."
        }
      ],
      "standard": [
        {
          "q": "Explain the KV cache: why it is necessary, what it costs, and how prefill differs from decode.",
          "a": "WHY IT IS NECESSARY. A transformer processes a whole sequence in parallel during training, which is what makes it efficient to train. Generation cannot work that way: token t+1 depends on token t, so you produce one token per forward pass. Naively, each pass runs the model over the entire sequence so far, recomputing the keys and values of every previous token. But those keys and values are IDENTICAL every time - a token's K and V depend only on its own hidden state, and because of causal masking that hidden state never changes when later tokens arrive. So the naive loop redoes the same work T times: total cost O(T^3) instead of O(T^2). The KV cache stores K and V per layer per position; each step computes them only for the NEW token, appends, and attends against the whole cache. Per-token cost falls from O(T^2) to O(T). Note queries are NOT cached, because a query is consumed at the step that creates it - only keys and values are read by future tokens. WHAT IT COSTS. Size = 2 * n_layers * n_kv_heads * d_k * T * batch * bytes. For LLaMA-2 70B (80 layers, d_k 128, 8 GQA groups) at 4K context in fp16: ~2.7 GB per sequence; with full multi-head attention it would be ~21.5 GB. At batch 32 and 32K context, even the GQA version is hundreds of gigabytes. Two consequences: (1) the cache, not the weights, usually limits BATCH SIZE, and batch size determines serving throughput; (2) since decoding must READ the whole cache to produce each token, and decode is bandwidth-bound, cache size directly limits tokens-per-second. PREFILL VERSUS DECODE - the most important distinction in LLM serving. PREFILL processes the entire prompt in ONE forward pass with all tokens in parallel. It is COMPUTE-BOUND: a 2000-token prompt through a 7B model is ~28 TFLOPs, which a modern GPU does at high utilization. It determines TIME-TO-FIRST-TOKEN. It benefits from FlashAttention, from more FLOPs, and from chunking to overlap with other work. DECODE generates one token per pass. It is MEMORY-BANDWIDTH-BOUND: to produce a single token you must read all 14 GB of a 7B model's fp16 weights plus the relevant cache, to perform roughly 14 GFLOPs - about 1 FLOP per byte, two orders of magnitude below the roofline knee. The GPU runs at a few percent of peak. It determines TOKENS-PER-SECOND. It benefits from quantization (fewer bytes), batching (amortize the weight read across sequences), MoE (read only routed experts), and speculative decoding (verify several tokens in one pass). THE KEY IMPLICATION: because decode's arithmetic intensity is roughly proportional to BATCH SIZE, batching is the primary fix - at batch 1 you are hopelessly bandwidth-bound, at batch 64-128 you approach compute-bound. But larger batches raise per-user latency while raising system throughput, so throughput and latency are in direct tension, and where you sit is a product decision. This is why modern serving uses CONTINUOUS BATCHING (schedule at the token level, letting sequences join and leave mid-flight) rather than static batches. THE ENGINEERING AGENDA that follows from all this, which is what a strong answer ends with: shrink the cache (GQA, MLA, quantization), stop wasting it (paged attention eliminates the fragmentation from pre-allocating max length), share it (prefix caching for common system prompts), bound it (sliding windows, eviction), and work around the sequential nature of decode (speculative decoding). Nearly every LLM inference optimization of the last three years is one of those five things.",
          "deepDive": {
            "q": "Walk through the memory and bandwidth arithmetic that determines how many users a node can serve and at what speed.",
            "a": "Let me do it concretely for a 70B model on an 8xA100-80GB node (640 GB, ~2 TB/s per GPU). STEP 1 - WEIGHTS. 70B parameters at fp16 = 140 GB. This is a fixed cost paid once, and it AMORTIZES over concurrent users, so serving one user and serving fifty both pay it. Quantized to int8 it is 70 GB; int4, 35 GB. STEP 2 - CACHE PER SEQUENCE. With LLaMA-2-70B geometry (80 layers, 8 GQA KV heads, d_k 128) at fp16: per token, 2 * 80 * 8 * 128 * 2 bytes = 327 KB. At 4K context that is ~1.3 GB per sequence; at 32K, ~10.7 GB. (Note the useful intermediate quantity - bytes per token - since it makes the length scaling obvious.) STEP 3 - HOW MANY SEQUENCES FIT. 640 GB total, minus 140 GB weights, minus ~40 GB for activations, framework overhead, and fragmentation, leaves ~460 GB for cache. At 4K context: ~350 sequences. At 32K: ~43 sequences. Quantize weights to int8 and you free another 70 GB: ~400 and ~50 respectively. That number IS your concurrency limit, and it is set by the cache, not the model. STEP 4 - DECODE SPEED. Per generated token, per sequence, the GPU must read: all the weights (140 GB, but amortized across the batch since one weight read serves every sequence in the batch) plus that sequence's cache (1.3 GB at 4K). For a batch of B sequences, bytes read per DECODE STEP = 140 GB + B * 1.3 GB, and that step produces B tokens. At 2 TB/s aggregate: B=1 gives (140+1.3)/2000 = ~71 ms per token = ~14 tokens/s. B=32 gives (140 + 42)/2000 = ~91 ms per step but produces 32 tokens = ~350 tokens/s aggregate, i.e. ~11 tokens/s per user. B=128 gives (140+166)/2000 = ~153 ms for 128 tokens = ~836 tokens/s aggregate, ~6.5 tokens/s per user. THE TENSION, made numeric: going from batch 1 to batch 128 multiplies system throughput ~60x while cutting per-user speed roughly in half. That is the whole throughput-versus-latency trade, and it is why the right batch size depends entirely on the product - a chat UI needs maybe 20+ tokens/s per user to feel responsive (so a moderate batch), while an offline summarization job wants maximum throughput and does not care. STEP 5 - PREFILL AND TTFT. A 2000-token prompt through 70B is roughly 2 * 70e9 * 2000 = 280 TFLOPs. At an achieved ~150 TFLOP/s (realistic fraction of peak across the node) that is ~2 seconds - and note prefill competes with decode for the GPU, so a long prompt arriving mid-stream stalls other users' token generation unless the scheduler CHUNKS the prefill and interleaves it. That is a real production issue and the reason chunked prefill exists. STEP 6 - WHAT MOVES THE NUMBERS MOST, in order: (a) paged attention, because without it you allocate max-length cache per sequence and at a realistic length distribution you waste most of your cache memory - often a 2-4x effective concurrency gain for free; (b) weight quantization, which both frees cache memory and speeds decode by reducing the dominant bandwidth term; (c) KV quantization to int8, halving the per-sequence term; (d) prefix caching if requests share a system prompt; (e) speculative decoding, which improves per-user latency without needing more batch. THE CHECK I WOULD ALWAYS DO: profile the ACTUAL distribution of prompt and generation lengths in production traffic. Provisioning for 32K when P95 is 3K is the most expensive mistake in this area and requires no technology to fix - just measurement."
          }
        },
        {
          "q": "What are the main techniques for managing KV cache memory, and how do they compose?",
          "a": "They fall into five families, and a production system uses several simultaneously. (1) SHRINK IT ARCHITECTURALLY. GQA/MQA reduce the n_kv_heads term - LLaMA-2 70B's 8 groups for 64 query heads is an 8x reduction at essentially no quality cost, and it is now standard. MLA (DeepSeek) compresses K/V into a learned low-rank latent and caches only that, achieving a smaller cache than GQA at full-attention quality, at the price of implementation complexity and awkward RoPE interaction. Both are PRETRAINING-TIME decisions (though GQA is retrofittable by uptraining on ~5% of the original tokens). (2) COMPRESS IT NUMERICALLY. KV quantization to int8 gives ~2x, int4 up to 4x, with modest quality cost. Details matter: per-token or per-channel scaling rather than per-tensor, and keys are typically more sensitive than values, so asymmetric precision (int8 keys, int4 values) is a common configuration. This is a deployment-time choice requiring no retraining, which makes it easy to adopt. (3) STOP WASTING IT - the biggest practical win. Naive implementations PRE-ALLOCATE the cache at max sequence length per sequence, so a request with a 200-token prompt that generates 300 tokens occupies 32K worth of memory. PagedAttention (vLLM) allocates in fixed-size blocks on demand, with a block table per sequence, eliminating internal fragmentation and enabling copy-on-write sharing between sequences that share a prefix (e.g. parallel samples from one prompt). Reported effective batch improvements are typically 2-4x, at zero quality cost - which is why it is the first thing to adopt. (4) STORE LESS OF THE SEQUENCE - lossy, use with care. Sliding-window attention (Mistral) keeps only the last W tokens per layer, making the cache constant-size; StreamingLLM adds the crucial ATTENTION SINK fix - retain the first few tokens, because models dump attention mass onto initial positions and evicting them destroys the distribution. H2O-style eviction keeps the tokens that have historically received the most attention. All of these bet that distant detail is unneeded: fine for streaming chat, wrong for long-document retrieval, so they must be validated against the actual task. (5) SHARE OR OFFLOAD IT. Prefix caching computes a shared system prompt's cache once and reuses it across requests - potentially a very large win in chat products, and it composes with paged attention's block sharing. Offloading cold cache blocks to CPU memory or NVMe trades bandwidth for capacity and is a last resort for serving very long contexts at all. HOW THEY COMPOSE - the important part. They are largely MULTIPLICATIVE and independent: GQA-8 (8x) times int8 KV quantization (2x) times paged attention's fragmentation recovery (2-4x effective) is a large combined factor, and prefix caching is orthogonal on top. The constraints are that GQA and MLA are architectural (decide at pretraining), quantization and paging are deployment-time, and the lossy methods (windows, eviction) should be adopted last and validated per task. A REASONABLE DEFAULT STACK for a new deployment: use a GQA model, serve with vLLM or TensorRT-LLM (paged attention plus continuous batching), quantize weights to int8/int4, quantize the KV cache to int8 if memory-bound, enable prefix caching if your prompts share a preamble, and only consider windowing or eviction if you still cannot fit the required context - at which point seriously reconsider whether retrieval with a short context solves the problem better and more cheaply."
        },
        {
          "q": "Why is decoding so much slower than prefill per token, and what can actually be done about it?",
          "a": "THE ARITHMETIC-INTENSITY EXPLANATION. Prefill processes N prompt tokens in one pass: it reads the weights ONCE and performs N tokens' worth of arithmetic, so arithmetic intensity is roughly N FLOPs per byte of weights - high enough to be compute-bound, and the GPU runs at good utilization. Decode processes ONE token per pass: it reads the SAME weights and performs one token's worth of arithmetic. For a 7B model that is reading 14 GB to do ~14 GFLOPs - about 1 FLOP per byte, when the roofline knee on an A100 is around 150. So the GPU spends essentially all its time waiting on memory and achieves a few percent of peak FLOPs. Decode is not slow because it does more work; it is slow because it does almost no work per byte moved. THE SECOND FACTOR: decode is inherently SEQUENTIAL. Token t+1 requires token t, so you cannot parallelize across the time axis within one sequence - which means you cannot fix decode by adding more compute, only by moving fewer bytes or by finding parallelism elsewhere. WHAT ACTUALLY HELPS, in order of impact. (1) BATCHING - the fundamental fix. With batch B, one weight read serves B sequences, so arithmetic intensity scales with B. Batch 1 is hopeless; batch 64-128 approaches compute-bound. CONTINUOUS BATCHING (schedule at the token level so finished sequences leave and new requests join without waiting for a batch boundary) is what makes this practical under real traffic, and it is typically the single largest throughput win in a serving stack. The cost is per-user latency, which is the tension to name. (2) QUANTIZATION - reduce the bytes. int8 or int4 weight-only quantization gives close to a linear speedup for decode because the time is dominated by reading weights. This is why weight-only quantization is so much more valuable for LLM inference than for training. (3) SPECULATIVE DECODING - manufacture parallelism. A small draft model proposes k tokens; the large model verifies all k in ONE forward pass (which it can, because verification is parallel over positions); accepted tokens are kept using a rejection-sampling scheme that leaves the output distribution EXACTLY unchanged. Typical speedups are 2-3x, and the guarantee of identical distribution is what makes it safe to deploy. Variants (Medusa's extra heads, EAGLE, n-gram/prompt lookup drafting) avoid needing a separate draft model. (4) MoE - read fewer weights per token. Only the routed experts' parameters are read, so a model with far more total parameters can decode at the speed of a much smaller dense one. This is an architectural decision driven substantially by decode economics. (5) BETTER KERNELS AND SMALLER CACHES - fused decode kernels, CUDA graphs to remove launch overhead (which is a real fraction of a 7 ms step), GQA and KV quantization to shrink the cache term. WHAT DOES NOT HELP, worth stating because it is a common error: adding FLOPs-oriented optimizations to decode. FlashAttention barely helps decode (it targets the attention matrix, which is tiny when the query is one token); more compute-efficient architectures do not address bandwidth; and tensor parallelism helps decode less than you would hope because it adds communication to an already latency-sensitive path (though it does split the weight read across devices, which is why it is still used). THE FRAMING I WOULD END ON: prefill and decode are different problems. Prefill is a compute problem - optimize FLOPs, use FlashAttention, chunk it so it does not starve decode. Decode is a bandwidth-and-parallelism problem - batch it, quantize it, speculate. Reporting one 'inference speed' number conflates two things with different fixes, and asking 'is your bottleneck TTFT or tokens-per-second?' is the question that sorts out most LLM performance discussions."
        },
        {
          "q": "Explain speculative decoding. Why does it not change the output distribution?",
          "a": "THE PROBLEM IT ATTACKS. Decode is bandwidth-bound and sequential: each token requires a full pass reading all the weights to do a tiny amount of arithmetic, so the hardware is almost idle. But VERIFYING several tokens is parallel - the model can score k proposed tokens in a single forward pass at nearly the cost of scoring one, because that pass is bandwidth-bound and the extra tokens add arithmetic, not bytes. Speculative decoding exploits exactly that asymmetry. THE ALGORITHM (Leviathan et al., Chen et al., 2023). (1) A cheap DRAFT model (a much smaller LM, or extra prediction heads on the target model, or even an n-gram/prompt-lookup heuristic) autoregressively proposes k candidate tokens - cheap because the draft model is small. (2) The TARGET model runs ONE forward pass over the prompt plus all k drafted tokens, obtaining its own probability distribution at each of those k+1 positions. (3) ACCEPT/REJECT: walk the drafted tokens left to right. For draft token x_i with draft probability q(x_i) and target probability p(x_i), accept with probability min(1, p(x_i)/q(x_i)). On the first rejection, sample a replacement token from the RESIDUAL distribution proportional to max(0, p(x) - q(x)), normalized, and discard the rest of the draft. If all k are accepted, you additionally get a free token from the target's distribution at position k+1. So each target-model pass yields between 1 and k+1 tokens. WHY THE DISTRIBUTION IS UNCHANGED - the proof sketch, which is the substance of the question. This is MODIFIED REJECTION SAMPLING. For a token x: P(x is proposed and accepted) = q(x) * min(1, p(x)/q(x)) = min(q(x), p(x)). The probability that we reach the rejection branch is 1 - sum_x min(q(x), p(x)), and in that branch we sample from the normalized residual max(0, p(x) - q(x)) / sum_y max(0, p(y) - q(y)). Note that sum_y max(0, p(y)-q(y)) equals exactly 1 - sum_y min(p(y), q(y)), so the normalizer cancels the branch probability. Adding the two paths: P(output x) = min(q(x), p(x)) + max(0, p(x) - q(x)) = p(x), for every x. So the marginal distribution of each emitted token is EXACTLY the target model's - not approximately, exactly. The result holds for any draft distribution q, which is why a bad draft model costs speed but never correctness. WHAT DETERMINES THE SPEEDUP: the ACCEPTANCE RATE, which is how often the draft agrees with the target. A well-matched draft (same tokenizer, same family, trained on similar data) accepts most tokens and gives 2-3x; a poorly matched one accepts rarely and you pay for the draft passes without benefit. Speedup also depends on the draft being genuinely cheap - if the draft model is 1/10 the size, the overhead is small. And it depends on the target pass being bandwidth-bound: at very large batch sizes decode becomes compute-bound and the free-lunch property disappears, which is why speculative decoding helps LOW-LATENCY, low-batch serving much more than high-throughput batch serving. THE VARIANTS worth naming: MEDUSA adds extra prediction heads to the target model to draft without a separate model; EAGLE drafts in feature space for higher acceptance; PROMPT LOOKUP / n-gram drafting copies from the prompt, which is remarkably effective for summarization and code editing where output repeats input; and tree-structured speculation verifies multiple candidate continuations in one pass. WHY IT MATTERS CONCEPTUALLY, and the point I would end on: it is a rare optimization that improves latency with a mathematical guarantee of identical output - no quality/speed trade-off to negotiate, no evaluation needed to justify adoption. That property, exactness, is the same reason FlashAttention diffused so fast, and it is worth recognizing as a pattern: exact optimizations get adopted, approximate ones get argued about."
        },
        {
          "q": "You are building a chat product. Walk through the inference architecture decisions the KV cache forces.",
          "a": "I would work from the product requirements back to the serving configuration, because the cache trade-offs only have answers once you know what the product needs. STEP 0 - GET THE REQUIREMENTS AS NUMBERS. Time-to-first-token target (for chat, under ~500 ms feels responsive); tokens-per-second per user (~20+ to outpace reading speed); expected concurrency; and the length distribution of prompts and conversations. That last one is the most commonly skipped and most consequential - provisioning for a 128K context when P95 is 4K wastes most of your hardware. STEP 1 - MODEL AND ARCHITECTURE CHOICE. Use a GQA model; without it, cache per sequence is 8x larger and concurrency collapses. Choose the smallest model that meets quality requirements, because both weight bandwidth (decode speed) and cache size scale with model dimensions. Consider whether an MoE model is appropriate - it decodes faster per token for a given quality, at the cost of more total memory for weights. STEP 2 - SERVING STACK. Use a stack with PAGED ATTENTION and CONTINUOUS BATCHING (vLLM, TensorRT-LLM, SGLang). This is not optional: pre-allocated caches waste most of your memory under a realistic length distribution, and static batching wastes GPU time waiting for the slowest sequence in a batch. This one decision typically dominates every model-level optimization. STEP 3 - PREFIX CACHING, which chat products benefit from more than almost any other workload. Chat has a long shared system prompt, and within a conversation each turn re-sends the entire history. Both are cacheable: compute the system prompt's KV once and share it across all users (copy-on-write via the paging block table), and retain each conversation's cache between turns so turn N+1 only prefills the new user message rather than the whole transcript. That second one converts TTFT from 'grows with conversation length' to 'roughly constant', which is a large and very visible user-experience win. The cost is memory held between turns, so you need an eviction policy for idle conversations (LRU, with re-prefill on a miss). STEP 4 - QUANTIZATION. Weight quantization to int8 (or int4 if quality allows) speeds decode nearly linearly and frees memory for more cache. KV cache quantization to int8 doubles concurrency at long context. Validate quality on your actual task, not just perplexity. STEP 5 - LATENCY OPTIMIZATIONS FOR THE CHAT FEEL. Speculative decoding gives 2-3x tokens-per-second at low batch with identical output distribution - well suited to chat's latency sensitivity. Stream tokens to the client as they are produced so perceived latency is TTFT, not total generation time. Chunk long prefills so one user's 8K-token paste does not stall everyone else's token stream - this is a real and commonly-hit production issue. STEP 6 - THE OPERATING POINT. Batch size is the throughput/latency dial. I would set it from the per-user tokens-per-second requirement, then scale horizontally for concurrency rather than pushing batch size past the latency budget. Admission control and a queue with a max wait are needed so that load spikes degrade gracefully instead of blowing the cache budget. STEP 7 - CONTEXT POLICY, which is a product decision the cache forces you to make explicitly. Conversations grow without bound; cache grows linearly with them. You need a policy: a hard context limit with truncation, a sliding window over recent turns, summarize-and-carry-forward, or retrieval over the conversation history. Retrieval or summarization is usually better than a very long context - cheaper, and often more accurate given the well-documented degradation of long-context retrieval in the middle of a window. WHAT I WOULD MONITOR: TTFT and inter-token latency at P50/P95/P99, cache utilization and eviction rate, batch size distribution, prefix cache hit rate, and the length distributions. The most common production surprise is that a small fraction of very long conversations consumes a disproportionate share of cache and degrades everyone else - which is an argument for per-conversation context limits, and it is the kind of thing you only see if you are measuring the distribution rather than the mean."
        },
        {
          "q": "The KV cache is a consequence of the transformer's design. Do other architectures have this problem?",
          "a": "This is a good question because the answer illuminates what the cache actually IS - the price transformers pay for their training parallelism. TRANSFORMERS: the cache exists because attention at step t needs the keys and values of ALL previous tokens, so the model's 'memory' of the past is stored EXPLICITLY and grows LINEARLY with sequence length. That is the trade: transformers get perfect, random-access recall of every previous token (which is why they excel at retrieval-like tasks) at the cost of state that grows without bound. RNNs and LSTMs: NO cache problem. Their state is a FIXED-SIZE hidden vector, so inference memory is O(1) in sequence length regardless of how long the sequence gets - a genuine advantage that was forgotten during the transformer era and is now being rediscovered. The cost is the reason they lost: training is SEQUENTIAL (you must unroll step by step, so you cannot use a GPU efficiently), and the fixed-size state is a lossy bottleneck - information must be compressed into a fixed vector, so distant details are irrecoverably lost. Transformers traded O(1) inference state for O(T) inference state in exchange for parallel training and perfect recall, and given that training compute was the binding constraint, that was the right trade for a decade. STATE-SPACE MODELS (Mamba, S4 and successors): explicitly designed to get both. They have a fixed-size recurrent state (so O(1) inference memory, like an RNN) but can be trained in PARALLEL via a scan/convolutional formulation (like a transformer). Mamba's key contribution over earlier SSMs was making the state transitions INPUT-DEPENDENT (selective), which recovers the content-based selectivity that fixed-dynamics SSMs lacked. The honest assessment: they are competitive and dramatically cheaper for long-sequence inference, but they underperform transformers on tasks requiring precise recall of arbitrary earlier content - exactly what you would predict from a fixed-size state, and confirmed by evaluations on associative-recall and needle-style tasks. LINEAR ATTENTION variants have a similar profile - they can be written recurrently with fixed state, and they lose the sharp selective retrieval that softmax attention provides. HYBRIDS are where the field has landed: interleave a few full-attention layers (for exact retrieval) with many cheap fixed-state layers (for everything else), e.g. Jamba and several recent models. The reasoning is that most of what a model does at each position is local or diffuse, and only a minority of computations need precise long-range lookup - so pay for full attention only where it earns its keep. This gets most of the cache savings while retaining retrieval ability, and it is the most promising direction. THE UNIFYING PRINCIPLE worth stating: there is a real trade-off between STATE SIZE and RECALL FIDELITY. A fixed-size state must compress history lossily; perfect recall requires state proportional to history. No architecture escapes that; they only choose where to sit. The KV cache is not a transformer bug - it IS the mechanism by which transformers achieve perfect recall, and its cost is the honest price of that capability. THE PRACTICAL COROLLARY: the right architecture depends on whether your task needs exact recall of arbitrary earlier content. Long-document QA and code understanding do; streaming summarization, many time-series tasks, and much of dialogue largely do not. And note that the pressure driving interest in SSMs is precisely the serving economics described in this lesson - which is another instance of inference cost, not training quality, driving architecture research."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "KV cache",
        "back": "Stored keys and values for all previous tokens, so each step computes K/V only for the new token. Valid because a token's K/V depend only on its own hidden state, which causal masking keeps fixed."
      },
      {
        "type": "formula",
        "front": "What the cache saves",
        "back": "Per-token cost O(T^2) -> O(T); total generation O(T^3) -> O(T^2). Queries are NOT cached - a query is used once, at the step that creates it."
      },
      {
        "type": "formula",
        "front": "Cache size",
        "back": "2 * n_layers * n_kv_heads * d_k * T * batch * bytes. LLaMA-2 70B at 4K, fp16, batch 1: ~2.7 GB with GQA-8, ~21.5 GB with full MHA. It usually limits batch size, not the weights."
      },
      {
        "type": "intuition",
        "front": "Prefill vs decode",
        "back": "Prefill: whole prompt in one parallel pass, COMPUTE-bound, sets time-to-first-token. Decode: one token per pass, sequential, BANDWIDTH-bound, sets tokens/second. Different bottlenecks, different fixes."
      },
      {
        "type": "intuition",
        "front": "Why decode runs at ~1-3% of peak",
        "back": "It reads all the weights (14 GB for a 7B fp16 model) to do ~14 GFLOPs - about 1 FLOP per byte against a roofline knee near 150. Batching raises intensity roughly proportionally to B."
      },
      {
        "type": "definition",
        "front": "Paged attention",
        "back": "Allocate the cache in fixed-size blocks on demand (vLLM) instead of pre-allocating max length per sequence. Removes internal fragmentation and enables copy-on-write prefix sharing - typically 2-4x effective batch, free."
      },
      {
        "type": "definition",
        "front": "Speculative decoding",
        "back": "A cheap draft model proposes k tokens; the target verifies all k in ONE pass; accept with prob min(1, p/q), else sample from the normalized residual max(0, p-q). Output distribution is EXACTLY the target's. 2-3x at low batch."
      },
      {
        "type": "pitfall",
        "front": "The cache-implementation invariant",
        "back": "Cached incremental generation must produce the same logits as one full-sequence forward pass. This single test catches wrong position ids, re-applied RoPE, prefill/decode off-by-one, and mask misalignment."
      },
      {
        "type": "intuition",
        "front": "The five ways to manage the cache",
        "back": "Shrink it (GQA, MLA), compress it (int8 KV), stop wasting it (paged attention), bound it (windows, eviction, sinks), share it (prefix caching). Largely multiplicative; paging and quantization need no retraining."
      },
      {
        "type": "intuition",
        "front": "State size vs recall fidelity",
        "back": "RNNs/SSMs have O(1) state but lossy recall; transformers have O(T) state and perfect recall. The cache IS the price of exact retrieval. Hybrids keep a few attention layers for lookup and cheap fixed-state layers elsewhere."
      }
    ],
    "refs": [
      {
        "title": "Pope et al. (2022), Efficiently Scaling Transformer Inference",
        "url": "https://arxiv.org/abs/2211.05102"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention (vLLM)",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "Leviathan, Kalman & Matias (2023), Fast Inference from Transformers via Speculative Decoding",
        "url": "https://arxiv.org/abs/2211.17192"
      },
      {
        "title": "Xiao et al. (2023), Efficient Streaming Language Models with Attention Sinks",
        "url": "https://arxiv.org/abs/2309.17453"
      }
    ],
    "demos": [
      "kv-cache",
      "kv-cache-eviction",
      "speculative-decoding",
      "paged-attention"
    ]
  },
  "self-attention": {
    "interview": {
      "quickGrind": [
        {
          "q": "What are Q, K and V, in one line each?",
          "a": "Q is what this position is looking for, K is what each position advertises, V is the content that actually gets mixed. Q and K decide the weights; V decides what is returned."
        },
        {
          "q": "Write scaled dot-product attention.",
          "a": "softmax(QK^T / sqrt(d_k)) V, with the softmax taken row-wise over keys so each query's weights sum to 1."
        },
        {
          "q": "Why divide by sqrt(d_k)?",
          "a": "A dot product of two independent d_k-dimensional vectors with unit-variance entries has variance d_k, so raw logits scale like sqrt(d_k). Dividing keeps them O(1) as width grows."
        },
        {
          "q": "What actually breaks if you drop the scaling at large d_k?",
          "a": "Logits get large, softmax saturates toward one-hot, its Jacobian goes to zero, and gradients through the attention weights vanish. It is a training failure, not an accuracy nuisance."
        },
        {
          "q": "Time and memory cost over n tokens?",
          "a": "O(n^2 * d) time and O(n^2) memory for the attention matrix. Note the parameter count is independent of n — only the activation is quadratic."
        },
        {
          "q": "Is self-attention permutation equivariant?",
          "a": "Yes. Permute the input rows and the output rows permute identically, so the layer alone cannot distinguish orderings of the same multiset of tokens."
        },
        {
          "q": "So why is positional encoding required?",
          "a": "Because that equivariance means the bare layer sees a bag of tokens. Order has to be injected into the representations, since attention will never recover it on its own."
        },
        {
          "q": "How is causal masking implemented, and why that way?",
          "a": "Add -inf to the disallowed logits BEFORE the softmax, so renormalization spans only legal positions. Zeroing weights after the softmax leaves rows that no longer sum to 1."
        },
        {
          "q": "What do multiple heads buy you?",
          "a": "h heads of width d/h cost about the same total compute, but let different subspaces attend to different relations instead of averaging every relation into one pattern."
        },
        {
          "q": "Self-attention vs cross-attention?",
          "a": "Self-attention draws Q, K and V from one sequence. Cross-attention draws Q from one sequence and K, V from another — that is how a decoder reads an encoder."
        },
        {
          "q": "Does FlashAttention change the result?",
          "a": "No. It is exact. It tiles the computation and recomputes pieces so the n-by-n matrix is never materialized, trading extra FLOPs for far less memory traffic."
        },
        {
          "q": "Are attention weights an explanation of the decision?",
          "a": "Not reliably. Different weight distributions can produce the same output, so a large weight is evidence of routing, not proof of causal importance."
        }
      ],
      "standard": [
        {
          "q": "Derive the sqrt(d_k) scaling, and say precisely what fails without it.",
          "a": "Model the query and key entries as independent, zero-mean, unit-variance. Their dot product q.k is a sum of d_k such products, so it has mean 0 and variance d_k, i.e. a typical magnitude of sqrt(d_k). Feed that straight into a softmax and the spread of the logits grows with width: at d_k = 64 the logits are already several units apart, and the softmax approaches a one-hot. The damage is in the backward pass. The softmax Jacobian is diag(p) - p p^T, which goes to zero as p approaches one-hot, so gradients to Q and K vanish and the layer stops learning to route. Dividing by sqrt(d_k) normalizes the logit variance back to 1 so the softmax stays in its responsive regime independently of head width.",
          "deepDive": {
            "q": "What if the entries are not unit variance?",
            "a": "Then sqrt(d_k) is the wrong constant in principle — the right scale is the standard deviation of the logits. In practice LayerNorm before the projections keeps the inputs near unit scale, so sqrt(d_k) remains the correct fixed choice; that is a reason the normalization placement and the scaling are coupled design decisions rather than independent ones."
          }
        },
        {
          "q": "Walk through the tensor shapes of a multi-head forward pass.",
          "a": "Start with X of shape (B, n, d). Project to Q, K, V of shape (B, n, d) each, then reshape to (B, h, n, d_h) with d_h = d/h. The scores QK^T give (B, h, n, n) — this is the tensor that is quadratic in sequence length and the one that dominates memory. Softmax over the last axis, multiply by V of shape (B, h, n, d_h) to get (B, h, n, d_h), transpose and merge the heads back to (B, n, d), then apply the output projection W_O of shape (d, d). The parameter count is 4 d^2 regardless of n; only the (B, h, n, n) activation grows with sequence length."
        },
        {
          "q": "Why separate K and V at all, rather than attending directly over the inputs?",
          "a": "Separating them decouples matching from content. K lives in the space where similarity to Q is measured, V lives in the space of what gets written to the residual stream — a token can be easy to find for one reason and contribute something quite different. It also breaks symmetry: with a single shared matrix the score between positions i and j would be forced toward symmetry, whereas language is full of asymmetric relations, where a verb should attend to its subject far more than the reverse. Separate projections make the score bilinear in the input, x_i^T W_Q^T W_K x_j, which is an arbitrary (low-rank) bilinear form rather than an inner product.",
          "deepDive": {
            "q": "What does tying K and V actually cost?",
            "a": "You force the retrieval key and the transmitted content to be the same vector, so any token that must be findable by many different queries has to compromise between being findable and being useful. Empirically it costs quality at equal parameter count, which is why the untied form persists despite tying being cheaper."
          }
        },
        {
          "q": "Explain the quadratic bottleneck and how it is genuinely addressed in practice.",
          "a": "Both compute and the attention activation scale as n^2, so doubling context quadruples the cost of that term. Two families of response exist and they are not equally successful. Approximate attention — low-rank, kernelized or sparse — changes the math to get subquadratic asymptotics, and usually loses quality or fails to beat the exact method at practical lengths. Exact IO-aware attention, i.e. FlashAttention, keeps the math identical and attacks the constant: it tiles Q, K and V into blocks that fit in SRAM, computes the softmax with a running normalizer, and recomputes what it needs in the backward pass rather than storing the n-by-n matrix. Memory becomes linear in n and wall-clock improves several-fold despite doing MORE arithmetic. That is the key lesson: on modern accelerators the bottleneck was memory traffic, not FLOPs, so the winning fix was an implementation change, not an approximation."
        },
        {
          "q": "What is a KV cache, and how does it change inference cost?",
          "a": "At generation time the keys and values of previous tokens do not change, so recomputing them for every new token repeats work. The cache stores K and V for all past positions; each new token computes only its own Q, K and V, appends them, and attends over the cache. Per-token cost drops from O(n^2) to O(n), making generation linear overall. The price is memory: the cache is 2 * layers * heads * d_h * n * batch values, which for long contexts and large batches becomes the dominant memory consumer and the real constraint on serving. That is what motivates multi-query and grouped-query attention, which share K and V across heads to shrink the cache."
        },
        {
          "q": "What goes wrong in very deep stacks of pure attention, and what prevents it?",
          "a": "Attention output is a convex combination of value vectors, which is a smoothing operation. Stacked without help, it drives token representations toward each other — the rank of the representation matrix collapses, provably doubly exponentially in depth for pure attention, and every position ends up nearly identical, which destroys the model's ability to distinguish tokens. Three components counteract it, and the point is that they are not incidental: residual connections preserve a path that is not averaged, the position-wise MLPs apply a nonlinearity that is not a convex combination and can re-separate collapsed representations, and LayerNorm keeps scales controlled. This is a good example of an architecture whose famous component does not work without its unfamous ones."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Scaled dot-product attention",
        "back": "softmax(QK^T / sqrt(d_k)) V, softmax taken row-wise over keys."
      },
      {
        "type": "formula",
        "front": "Why the denominator is sqrt(d_k)",
        "back": "Var(q.k) = d_k for independent unit-variance entries, so logits scale like sqrt(d_k); dividing restores unit logit variance."
      },
      {
        "type": "definition",
        "front": "Q, K, V",
        "back": "Query = what I am looking for; Key = what I advertise; Value = what I contribute. Q and K set the weights, V is the payload."
      },
      {
        "type": "definition",
        "front": "Permutation equivariance",
        "back": "Permuting input rows permutes output rows identically — which is exactly why positional information must be added."
      },
      {
        "type": "definition",
        "front": "KV cache",
        "back": "Stored keys and values for past positions, so each new token costs O(n) instead of O(n^2). Cost is memory, not compute."
      },
      {
        "type": "intuition",
        "front": "Attention as lookup",
        "back": "A soft dictionary lookup: similarity between a query and every key produces weights, and the answer is the weighted average of the values."
      },
      {
        "type": "intuition",
        "front": "Why more than one head",
        "back": "One head must average all relations into a single pattern. h heads of width d/h cost the same and can specialize by subspace."
      },
      {
        "type": "intuition",
        "front": "Why FlashAttention is faster while doing more work",
        "back": "The bottleneck was memory traffic, not FLOPs. Tiling plus recomputation avoids materializing the n-by-n matrix."
      },
      {
        "type": "pitfall",
        "front": "Masking after the softmax",
        "back": "Zeroing disallowed weights post-softmax leaves rows that do not sum to 1. Add -inf to the logits BEFORE the softmax."
      },
      {
        "type": "pitfall",
        "front": "Dropping the scaling at large width",
        "back": "Softmax saturates toward one-hot, its Jacobian goes to zero, gradients vanish and routing stops being learned."
      },
      {
        "type": "pitfall",
        "front": "Reading attention weights as explanation",
        "back": "Different weight distributions can yield the same output. Weight shows routing, not causal importance."
      },
      {
        "type": "pitfall",
        "front": "Assuming attention alone builds depth",
        "back": "Pure stacked attention collapses representations toward uniformity. Residuals, MLPs and LayerNorm are what make depth work."
      }
    ],
    "refs": [
      {
        "title": "Vaswani et al. (2017) — Attention Is All You Need",
        "url": "https://arxiv.org/abs/1706.03762"
      },
      {
        "title": "Dao et al. (2022) — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
        "url": "https://arxiv.org/abs/2205.14135"
      },
      {
        "title": "Dong et al. (2021) — Pure Attention Loses Rank Doubly Exponentially with Depth",
        "url": "https://arxiv.org/abs/2103.03404"
      },
      {
        "title": "Jain & Wallace (2019) — Attention is not Explanation",
        "url": "https://arxiv.org/abs/1902.10186"
      },
      {
        "title": "Elhage et al. (2021) — A Mathematical Framework for Transformer Circuits",
        "url": "https://transformer-circuits.pub/2021/framework/index.html"
      }
    ],
    "demos": []
  },
  "full-transformer": {
    "interview": {
      "quickGrind": [
        {
          "q": "What are the two masks in a transformer and what is each for?",
          "a": "A padding mask hides positions that are only there to square off a batch, and a causal mask stops a decoder position from seeing the future. They are combined, not alternatives."
        },
        {
          "q": "Where does cross-attention sit and what does it read?",
          "a": "In each decoder block, between self-attention and the FFN. Q comes from the decoder state, K and V from the encoder output."
        },
        {
          "q": "What is the FFN and why is it wide?",
          "a": "Two linear layers with a nonlinearity, typically expanding d to 4d and back. It is where most parameters live and where per-position nonlinear computation happens."
        },
        {
          "q": "Pre-LN vs post-LN, in one line?",
          "a": "Post-LN normalizes after the residual add and needs learning-rate warmup to train deep; pre-LN normalizes inside the branch and trains stably without it. Modern stacks are pre-LN."
        },
        {
          "q": "Why did the original transformer need warmup?",
          "a": "Post-LN puts the normalization on the residual path, so early large updates destabilize deep stacks. Warmup keeps steps small until the scales settle."
        },
        {
          "q": "What is the residual stream?",
          "a": "The running sum carried through the network that every block reads from and writes to. Attention moves information between positions; the FFN transforms it in place."
        },
        {
          "q": "What is weight tying?",
          "a": "Sharing the input embedding matrix with the output projection. It saves a large parameter block and usually helps, since both map between tokens and the same space."
        },
        {
          "q": "Teacher forcing — what is it and what does it cost?",
          "a": "Feeding ground-truth prefixes during training rather than the model's own outputs. It is fast and parallel, but creates exposure bias: at inference the model conditions on its own mistakes."
        },
        {
          "q": "Why is training parallel over positions but generation is not?",
          "a": "With teacher forcing all target positions are known, so the causal mask lets every position be computed at once. Generation must produce token t before it can condition on it."
        },
        {
          "q": "Roughly where do the parameters go?",
          "a": "Per block, attention is about 4*d^2 and the FFN about 8*d^2, so the FFN holds roughly two thirds. Embeddings can dominate at small d with a large vocabulary."
        },
        {
          "q": "What does label smoothing do?",
          "a": "Replaces the one-hot target with a slightly softened distribution. It costs perplexity but improves calibration and BLEU — the original paper accepted exactly that trade."
        },
        {
          "q": "Encoder-decoder vs decoder-only — when does the split matter?",
          "a": "Encoder-decoder suits input-output tasks with a clean boundary and gives the encoder bidirectional context. Decoder-only with the input as a prefix is simpler and scales better, which is why it dominates now."
        }
      ],
      "standard": [
        {
          "q": "Trace one token's path through a full encoder-decoder forward pass.",
          "a": "An input token is embedded and gets positional information added, producing the first residual state. In each encoder block, LayerNorm feeds self-attention, which mixes information across ALL input positions (no mask beyond padding), and the result is added back to the residual; then the FFN transforms that state position-wise and is added back. After N blocks the encoder output is a set of contextualized vectors — computed once and reused for every decoder step. On the decoder side the target prefix is embedded, and each block runs three sub-layers: causal self-attention over previously generated positions, cross-attention where Q comes from the decoder state and K and V from the encoder output, and the FFN. A final LayerNorm and a projection to vocabulary size produce logits, softmaxed into a distribution over the next token. The important asymmetry is that the encoder runs once while the decoder runs once per generated token.",
          "deepDive": {
            "q": "Why is cross-attention placed after self-attention rather than before?",
            "a": "Self-attention first lets a decoder position assemble what it already knows from the prefix, so the query it sends to the encoder is informed by that context. Querying the source before consolidating the target-side state would ask a less well-formed question. It is a soft ordering rather than a hard constraint, but it is the standard arrangement."
          }
        },
        {
          "q": "Explain pre-LN vs post-LN and why the field moved.",
          "a": "Post-LN, the original, computes x + Sublayer(x) and then normalizes: LN(x + Sublayer(x)). The normalization sits ON the residual path, so the identity shortcut is repeatedly rescaled, and gradient magnitudes at initialization grow with depth. Deep post-LN stacks therefore diverge without learning-rate warmup, which is why the original recipe has that distinctive schedule. Pre-LN computes x + Sublayer(LN(x)): normalization moves inside the branch and the residual path stays clean, so gradients flow to early layers without amplification and training is stable without warmup at much greater depth. The cost is a mild quality gap at equal size in some settings, and a need for a final LayerNorm since the stream is never normalized on the way out. The general lesson is that keeping the identity path unmodified is what makes very deep residual networks trainable.",
          "deepDive": {
            "q": "Does pre-LN remove the need for warmup entirely?",
            "a": "It removes the failure mode that made warmup mandatory, but large-batch training still commonly uses a short warmup for optimizer-state reasons — Adam's second-moment estimate is unreliable in the first steps. So warmup persists, for a different reason than the original one."
          }
        },
        {
          "q": "Why is the FFN there at all, given attention already mixes information?",
          "a": "Attention is a convex combination of value vectors: it moves and averages information across positions but is close to linear in the values, and stacking it alone drives representations toward each other. The FFN supplies the per-position nonlinearity that attention lacks, and it is where most of the parameters and most of the stored knowledge sit — probing work locates factual associations there rather than in attention. The division of labour is clean: attention decides WHERE information comes from, the FFN decides WHAT to compute with it. Remove the FFN and the model loses both capacity and the mechanism that keeps token representations distinct with depth."
        },
        {
          "q": "Padding and causal masks are combined — what breaks if you get it wrong?",
          "a": "The masks apply on different axes and both must be additive -inf before the softmax. Forget the padding mask and real positions attend to padding, so a batch's results depend on the length of the longest unrelated sequence in it — a bug that shows up as results changing when batch composition changes, which is hard to trace. Forget the causal mask in the decoder and every position sees the future: training loss collapses to near zero because the model reads the answer, and generation is then incoherent because that information is absent. The failure signature is diagnostic — suspiciously good training loss with terrible sampling means a leak, not a good model."
        },
        {
          "q": "Greedy decoding vs beam search vs sampling — what are you actually choosing between?",
          "a": "You are choosing what to optimize. Greedy takes the argmax at each step and is fast but locally myopic. Beam search keeps k partial hypotheses and approximates the most probable SEQUENCE, which helps when a single high-probability output exists — translation, summarization — but produces bland, repetitive text for open-ended generation, and needs length normalization since probability decays with length. Sampling with temperature, top-k or nucleus deliberately does not maximize probability, because the most probable continuation is not the most human-like one. The rule of thumb: search when there is a right answer, sample when there is a distribution of acceptable ones."
        },
        {
          "q": "How do you sanity-check a from-scratch transformer implementation?",
          "a": "Test the invariants rather than eyeballing the loss curve. Check that attention rows sum to 1 after masking. Verify causality directly: perturb a future token and confirm the output at position t is bit-identical, which catches mask bugs that loss curves hide. Overfit a single batch to near-zero loss to confirm the optimization path works at all. Compare shapes and parameter count against the arithmetic (about 12*d^2 per block). Check that padding does not change results by running the same sequence alone and inside a padded batch. Each of these isolates one mechanism, whereas a bad loss curve tells you only that something is wrong."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Residual stream",
        "back": "The running sum every block reads from and writes to. Attention moves information across positions; the FFN transforms it in place."
      },
      {
        "type": "definition",
        "front": "Cross-attention",
        "back": "Decoder sub-layer with Q from the decoder state and K, V from the encoder output — the channel through which the target reads the source."
      },
      {
        "type": "definition",
        "front": "Teacher forcing",
        "back": "Training on ground-truth prefixes. Parallel and fast, but causes exposure bias: at inference the model conditions on its own mistakes."
      },
      {
        "type": "formula",
        "front": "Pre-LN vs post-LN",
        "back": "Pre-LN: x + Sublayer(LN(x)) — clean residual path, stable deep, needs a final LN. Post-LN: LN(x + Sublayer(x)) — needs warmup."
      },
      {
        "type": "formula",
        "front": "Parameters per block",
        "back": "About 4*d^2 for attention and 8*d^2 for the FFN, so roughly two thirds sit in the FFN."
      },
      {
        "type": "intuition",
        "front": "Why an FFN if attention already mixes",
        "back": "Attention is a convex combination and near-linear in V. The FFN is the per-position nonlinearity, and where most stored knowledge lives."
      },
      {
        "type": "intuition",
        "front": "Encoder runs once, decoder runs per token",
        "back": "That asymmetry is why encoder output is cached and why generation, not training, is the latency problem."
      },
      {
        "type": "intuition",
        "front": "Search vs sample",
        "back": "Beam search when there is a right answer (translation); sampling when many continuations are acceptable (open-ended text)."
      },
      {
        "type": "pitfall",
        "front": "Missing padding mask",
        "back": "Real positions attend to padding, so results depend on the longest unrelated sequence in the batch — changes with batch composition."
      },
      {
        "type": "pitfall",
        "front": "Missing causal mask",
        "back": "Training loss collapses toward zero while generation is incoherent. Suspiciously good training loss is the signature of a leak."
      },
      {
        "type": "pitfall",
        "front": "Beam search for open-ended text",
        "back": "Maximizing sequence probability yields bland, repetitive output — the most probable continuation is not the most human one."
      },
      {
        "type": "pitfall",
        "front": "Post-LN without warmup",
        "back": "Normalization on the residual path amplifies gradients with depth; deep stacks diverge. Either warm up or switch to pre-LN."
      }
    ],
    "refs": [
      {
        "title": "Vaswani et al. (2017) — Attention Is All You Need",
        "url": "https://arxiv.org/abs/1706.03762"
      },
      {
        "title": "Xiong et al. (2020) — On Layer Normalization in the Transformer Architecture",
        "url": "https://arxiv.org/abs/2002.04745"
      },
      {
        "title": "Geva et al. (2021) — Transformer Feed-Forward Layers Are Key-Value Memories",
        "url": "https://arxiv.org/abs/2012.14913"
      },
      {
        "title": "Holtzman et al. (2020) — The Curious Case of Neural Text Degeneration",
        "url": "https://arxiv.org/abs/1904.09751"
      },
      {
        "title": "Elhage et al. (2021) — A Mathematical Framework for Transformer Circuits",
        "url": "https://transformer-circuits.pub/2021/framework/index.html"
      }
    ],
    "demos": []
  }
};
