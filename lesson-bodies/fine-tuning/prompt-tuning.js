// GENERATED from content/lessons/fine-tuning/prompt-tuning.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/fine-tuning/prompt-tuning/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "prompt-tuning": {
    "level": "core",
    "body": {
      "intuition": [
        "Every method so far modified weights. This one does not touch them at all. A prompt is a sequence of token embeddings, and nothing requires those embeddings to correspond to real tokens - so learn some. Prepend k trainable vectors to the input embeddings, freeze the entire model, and backpropagate into the vectors only. For k = 20 on a model with d = 4096 that is 82,000 parameters, five orders of magnitude below the model, and the 'fine-tuned model' you ship is a small matrix.",
        "Lester et al.'s central result is not the method, it is the SCALE CURVE. At small model sizes prompt tuning trails full fine-tuning badly. The gap narrows monotonically as the model grows, and by around 10B parameters it closes - on their benchmarks a tuned soft prompt matched full fine-tuning of T5-XXL. This is the cleanest example in the module of a technique whose viability is a property of the regime rather than of the technique, and it has a practical consequence people repeatedly walk into: prototype prompt tuning on a small model and it will look broken, because it IS broken there. Prefix tuning, published slightly earlier, gives the method more room by learning prefix key-value vectors at EVERY layer rather than only at the input, and P-tuning v2 showed that this deeper variant works across scales - so the scale sensitivity belongs to the shallow input-only form specifically.",
        "Name the proxy. The claim is parity with full fine-tuning at scale, and it holds on the benchmarks measured. The costs sit somewhere the benchmark does not look. The soft prompt occupies k positions of CONTEXT on every single request, forever - it is not a one-time training cost but a permanent tax on sequence budget, KV-cache memory, and attention compute. And optimization is genuinely harder than for the other methods: the learning rates are an order of magnitude higher than adapters want, results vary substantially across seeds, and prefix tuning required a reparameterization trick - optimizing a smaller matrix through an MLP rather than the prefix directly - because the direct parameterization would not train stably. That instability is not incidental. Under the unified view, prefix tuning composes its update through a GATE rather than an addition, and a gated update has no direct gradient path toward simply having a larger effect."
      ],
      "math": [
        {
          "h": "Soft prompts: the input sequence, with a learned prefix",
          "paras": [
            "The model is untouched. The only change is that the embedding sequence it receives begins with k vectors that were learned rather than looked up.",
            "Because P lives in embedding space and nothing constrains it to the vocabulary's convex hull, it can express prompts no sequence of real tokens can - which is the source of both its power and its uninterpretability."
          ],
          "tex": "X = [\\,\\underbrace{P}_{k \\times d}\\;;\\; \\underbrace{E(x)}_{n \\times d}\\,], \\qquad \\theta_{\\text{train}} = \\{P\\}, \\quad |P| = k \\cdot d",
          "texNote": "At k = 20, d = 4096 that is 81,920 parameters - about 0.001% of a 7B model. The 'fine-tuned model' is a matrix you could email. Note the shape of the cost though: k is added to every sequence at inference, so the parameter saving is paid back in context."
        },
        {
          "h": "Prefix tuning: a learned prefix in every layer's attention",
          "paras": [
            "Rather than one prefix at the input, learn prefix keys and values injected at every layer's attention. The queries still come only from real tokens, so the prefix is something the sequence can attend TO but never attends FROM.",
            "The reparameterization in the second line is the load-bearing engineering detail. Optimizing the prefix directly was unstable; optimizing a smaller matrix through an MLP and discarding the MLP after training was not."
          ],
          "tex": "\\text{Attn}(Q, [P_K^{(\\ell)}; K], [P_V^{(\\ell)}; V]), \\qquad |\\theta| = 2 L k d \\\\[4pt] P^{(\\ell)} = \\mathrm{MLP}_{\\phi}\\big(P'\\big) \\quad \\text{during training; store } P^{(\\ell)} \\text{ after}",
          "texNote": "Depth is the difference: 2Lkd against kd, so prefix tuning has roughly 2L times the capacity and correspondingly less scale sensitivity - which is what P-tuning v2 exploited to make the family work below 10B. The reparameterization costs nothing at inference because the MLP is thrown away once the prefixes are materialized."
        },
        {
          "h": "What the prefix costs at inference, which no parameter count shows",
          "paras": [
            "The soft prompt is not free after training. It occupies positions in every forward pass, so it enters the attention cost and the KV cache exactly as real tokens do."
          ],
          "tex": "\\text{KV cache} \\;\\propto\\; (k+n), \\qquad \\text{attention FLOPs} \\;\\propto\\; (k+n)^2, \\qquad \\text{usable context} = C - k",
          "texNote": "For k = 20 against a 4k context this is negligible. For the k = 100 or more that prefix tuning sometimes wants, on short requests, it is a real fraction of both the sequence budget and the per-request cost - and it recurs on every request for the life of the deployment, unlike a training-time cost that is paid once."
        }
      ],
      "code": [
        {
          "h": "Soft prompt tuning from scratch, and the initialization that decides whether it trains",
          "paras": [
            "The method is a parameter and a concatenation. The interesting line is the initialization: random vectors in embedding space start nowhere useful, and initializing from real vocabulary embeddings - ideally the tokens of your class labels - is worth a large amount, especially at smaller scale."
          ],
          "code": "class SoftPrompt(nn.Module):\n    def __init__(self, model, k=20, init_tokens=None):\n        super().__init__()\n        self.model = model\n        for p in self.model.parameters():\n            p.requires_grad = False              # the ENTIRE model is frozen\n        emb = model.get_input_embeddings()\n        d = emb.embedding_dim\n        if init_tokens is not None:\n            # INITIALIZE FROM REAL VOCABULARY - e.g. the class-label tokens.\n            # Random init in embedding space starts far outside the region the\n            # model's representations occupy, and at small scale it often never\n            # recovers. This single choice moves results a lot.\n            init = emb.weight[init_tokens].clone().detach()\n        else:\n            init = emb.weight[torch.randint(0, 5000, (k,))].clone().detach()\n        self.P = nn.Parameter(init)              # k x d, the only trainable tensor\n\n    def forward(self, input_ids, attention_mask):\n        e = self.model.get_input_embeddings()(input_ids)\n        B = e.size(0)\n        e = torch.cat([self.P.unsqueeze(0).expand(B, -1, -1), e], dim=1)\n        m = torch.cat([torch.ones(B, self.P.size(0), device=e.device),\n                       attention_mask], dim=1)   # <- extend the mask, or the\n        return self.model(inputs_embeds=e, attention_mask=m)   # prefix is ignored\n\n# LEARNING RATE: prompt tuning wants ~0.3 to 0.03, orders of magnitude above\n# the 2e-5 an adapter wants. Comparing methods at a shared LR makes this one\n# look broken, and that comparison is made surprisingly often.",
          "caption": "Two lines matter. Initializing from real vocabulary embeddings rather than randomly, and extending the attention mask - forget the second and the model silently ignores the prefix you are training, with a loss curve that looks merely disappointing rather than broken."
        },
        {
          "h": "The scale curve, which is the actual finding",
          "paras": [
            "Lester et al.'s central figure. This is what you need to know before running the experiment, because prototyping at small scale gives an answer that is correct about the small model and wrong about the method."
          ],
          "code": "# PROMPT TUNING vs FULL FINE-TUNING, by model size (SuperGLUE, T5):\n#\n#   ~100M params ....... large gap, prompt tuning clearly worse\n#   ~1B   params ....... gap narrowing\n#   ~10B  params ....... gap nearly closed\n#   ~11B  (T5-XXL) ..... PARITY with full fine-tuning\n#\n# The technique's viability is a property of the REGIME, not of the technique.\n# Prototype it on a 250M model and you will conclude it does not work - a\n# conclusion that is correct about that model and wrong about the method.\n\n# WHY DEPTH HELPS: prefix tuning injects at EVERY layer (2Lkd params vs kd),\n# and P-tuning v2 showed that deeper variant works across scales. So the scale\n# sensitivity belongs to the SHALLOW input-only form, not to soft prompts.\n\n# TWO PROPERTIES WORTH KNOWING:\n#\n# 1. DOMAIN ROBUSTNESS. Lester et al. found prompt tuning degrades LESS under\n#    domain shift than full fine-tuning - unsurprising once you connect it to\n#    13-01: a frozen model cannot have its features distorted, because nothing\n#    is updating them. The most constrained method forgets the least.\n#\n# 2. PROMPT TRANSFER (SPoT). A prompt trained on a source task is a good\n#    INITIALIZATION for a related target task, which addresses the slow and\n#    unstable convergence directly - and gives a similarity measure between\n#    tasks as a side effect.",
          "caption": "The scale curve is the paper's result; the method is the vehicle. Note the connection back to 13-01: prompt tuning is the most constrained method here and it is correspondingly the most robust under domain shift, because a frozen model has no features to distort."
        }
      ],
      "useCases": [
        "Serving very large frozen models to many tasks, which is the setting the method was designed for: one copy of a 100B+ model, a matrix of a few thousand numbers per task, and different prefixes in the same batch are just different tokens - the best multi-tenant story of any method in this module.",
        "Adapting models you cannot modify. If the weights are behind an API or a compliance boundary, or the deployment forbids shipping a modified checkpoint, a learned prefix is an adaptation that lives entirely in the input.",
        "Task steering where robustness matters more than peak accuracy - the frozen model cannot be distorted, so the domain-shift degradation is smaller than fine-tuning's, and the base model's other capabilities are exactly preserved by construction.",
        "As a research instrument: soft prompts are a probe of what a frozen model can be induced to do without changing it, and prompt-transfer similarity between tasks - which prompts initialize well from which - is a usable measure of task relatedness."
      ],
      "pitfalls": [
        "Evaluating prompt tuning on a small model. The gap to full fine-tuning is large below roughly 1B parameters and closes only around 10B for the input-only form. A negative result at 250M is a fact about that model, not about the method - use prefix tuning or P-tuning v2 if you must work at small scale.",
        "Forgetting to extend the attention mask when you prepend the prefix. The model silently ignores the vectors you are training, and the failure looks like slow convergence rather than a bug, so it survives for a long time.",
        "Using an adapter's learning rate. Prompt tuning needs rates orders of magnitude higher - hundredths rather than 2e-5 - because the gradient reaches only k*d parameters through the whole frozen stack. A shared-rate comparison across PEFT methods makes this one look broken.",
        "Random initialization in embedding space. Random vectors start far outside the region the model's representations actually occupy. Initialize from real vocabulary embeddings, ideally the tokens of your class labels, which is worth a large amount at small and medium scale.",
        "Ignoring the permanent context cost. The prefix consumes k positions in every request for the life of the deployment - KV cache, attention compute, and usable context - which is a recurring inference cost that no parameter count reveals and that a training-time comparison never shows.",
        "Treating a single run as the result. Prompt tuning has substantially higher seed variance than adapters or LoRA, so a single-seed comparison is unreliable in both directions. Run several and report the spread.",
        "Expecting soft prompts to be interpretable. Nearest-neighbour decoding of learned prompt vectors into vocabulary tokens generally produces incoherent text, because P is not constrained to the region real embeddings occupy. It is an optimization result in embedding space, not a discovered instruction."
      ],
      "connections": [
        {
          "ref": "fine-tuning/adapters",
          "text": "The unified view places prefix tuning as a parallel GATED adapter on the attention keys and values - the only method in the family using a gate, which is a mechanistic explanation for its optimization difficulty rather than an empirical observation about it."
        },
        {
          "ref": "fine-tuning/full-fine-tuning",
          "text": "The domain-robustness result is that lesson's finding taken to its limit: prompt tuning is maximally constrained, so it cannot distort features at all, and it degrades least under shift. Constrain more, learn less, forget less - all the way down."
        },
        {
          "ref": "transformers/kv-cache",
          "text": "Where the permanent inference cost lives. Prefix keys and values sit in the cache like real tokens on every request, so a long prefix is a standing memory and compute charge that a parameter count never surfaces."
        },
        {
          "ref": "llm-systems/long-context",
          "text": "The prefix competes with real content for the sequence budget, and the attention cost is quadratic in total length - which turns the choice of k into a serving decision rather than a modelling one at long context."
        },
        {
          "ref": "rag-agents/rag-pipeline",
          "text": "The discrete counterpart. In-context learning and retrieval put instructions in as real tokens - interpretable, editable, no training run - while soft prompts optimize the same positions continuously. The trade is interpretability against capacity per token."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is prompt tuning?",
          "a": "Prepend k trainable embedding vectors to the input, freeze the entire model, and train only those vectors. For k = 20 and d = 4096 that is about 82,000 parameters."
        },
        {
          "q": "How does prefix tuning differ?",
          "a": "It injects learned prefix keys and values at EVERY layer's attention rather than only at the input, giving 2Lkd parameters instead of kd - much more capacity and much less scale sensitivity."
        },
        {
          "q": "What is Lester et al.'s central finding?",
          "a": "Prompt tuning's viability scales with model size: a large gap to full fine-tuning at small scale, closing around 10B parameters, reaching parity at T5-XXL on their benchmarks."
        },
        {
          "q": "Why must you extend the attention mask?",
          "a": "Otherwise the prepended positions are masked out and the model ignores the vectors you are training. The failure looks like slow convergence rather than a bug."
        },
        {
          "q": "How should soft prompts be initialized?",
          "a": "From real vocabulary embeddings, ideally the tokens of your class labels. Random vectors start outside the region the model's representations occupy and often never recover at smaller scale."
        },
        {
          "q": "What learning rate does prompt tuning need?",
          "a": "Orders of magnitude higher than adapters - hundredths rather than 2e-5 - because the gradient reaches only k*d parameters through the entire frozen stack."
        },
        {
          "q": "What is the reparameterization trick in prefix tuning?",
          "a": "Optimize a smaller matrix through an MLP and materialize the prefixes afterwards, discarding the MLP. The direct parameterization would not train stably."
        },
        {
          "q": "What is P-tuning v2?",
          "a": "Prefix tuning applied to natural-language understanding, showing the deep per-layer variant works comparably to fine-tuning across scales - so the scale sensitivity belongs to the shallow input-only form."
        },
        {
          "q": "What does the prefix cost at inference?",
          "a": "k positions of context on every request, forever: KV-cache memory, quadratic attention cost, and usable context reduced from C to C - k. No parameter count shows it."
        },
        {
          "q": "Why is prompt tuning robust to domain shift?",
          "a": "The model is entirely frozen, so its features cannot be distorted by fine-tuning. It is the most constrained method here and correspondingly the one that forgets least."
        },
        {
          "q": "What is SPoT?",
          "a": "Soft prompt transfer: initialize a target task's prompt from a prompt trained on a related source task. It speeds up and stabilizes convergence, and yields a task-similarity measure as a by-product."
        },
        {
          "q": "Are soft prompts interpretable?",
          "a": "Generally not. Nearest-neighbour decoding into vocabulary tokens produces incoherent text, because the learned vectors are not constrained to the region real embeddings occupy."
        }
      ],
      "standard": [
        {
          "q": "Explain prompt tuning and prefix tuning, and when you would use them over LoRA.",
          "a": "THE IDEA. A prompt is a sequence of embedding vectors, and nothing requires those vectors to be lookups of real tokens. So learn them. Prompt tuning prepends k trainable vectors to the input embeddings, freezes the whole model, and backpropagates into those vectors alone - k*d parameters, about 82,000 at k = 20 and d = 4096, five orders of magnitude below the model. Prefix tuning does the same idea with depth: learned prefix keys and values injected at every layer's attention, 2Lkd parameters, which is far more capacity. The queries still come only from real tokens, so the prefix is something the sequence attends TO but never attends FROM. THE CENTRAL RESULT, which is about scale rather than about the method. Lester et al. showed the gap to full fine-tuning is large at small model sizes and closes monotonically as the model grows, reaching parity around 10B parameters. That has a direct practical consequence: prototyping prompt tuning on a 250M model gives you a negative result that is correct about that model and wrong about the method. Prefix tuning and P-tuning v2, being deep, are much less scale-sensitive - so the fragility belongs specifically to the shallow input-only form. WHEN I WOULD CHOOSE IT OVER LORA. Three cases. (1) THE MODEL IS ENORMOUS AND FROZEN AND SHARED. One copy of a very large model, thousands of tasks, a few kilobytes each. Different prefixes in one batch are just different tokens, so heterogeneous batching is trivial - better even than LoRA's, which needs a specialized grouped kernel. (2) I CANNOT MODIFY THE WEIGHTS - behind an API, a compliance boundary, or a deployment that forbids shipping modified checkpoints. A learned prefix is adaptation that lives entirely in the input. (3) ROBUSTNESS MATTERS MORE THAN PEAK ACCURACY. Because the model is entirely frozen, its features cannot be distorted and its other capabilities are preserved exactly. Lester et al. measured better domain-shift behaviour than full fine-tuning, which is 13-01's finding taken to its limit. WHEN I WOULD NOT. Below about 10B for shallow prompt tuning. When context budget is tight, since the prefix is a permanent per-request tax on KV cache and attention rather than a one-time training cost. And when I need reliable results without babysitting - prompt tuning has materially higher seed variance and needs learning rates orders of magnitude away from everything else in the stack, which makes it awkward to slot into a pipeline tuned for adapters. THE HONEST SUMMARY. It has the best parameter count and the best multi-tenant story in the module, and it pays for both with optimization difficulty and a permanent context cost. For most production work LoRA is the better trade; prompt tuning wins at the extreme end of scale and sharing.",
          "deepDive": {
            "q": "Why is prompt tuning harder to optimize than the other PEFT methods? Give a mechanistic account.",
            "a": "Four reasons, and they compound. (1) THE GRADIENT PATH IS LONG AND NARROW. The trainable parameters sit at the very bottom of the network and the loss is at the top, so every gradient traverses the entire frozen stack to reach k*d numbers. Adapters and LoRA have trainable parameters distributed at every depth, so most of their parameters are close to the loss. A long path means more opportunity for the signal to be attenuated or dominated by curvature, and it is a large part of why the required learning rate is orders of magnitude higher. (2) THE PARAMETERS LIVE IN AN UNUSUAL SPACE. P occupies the embedding space, but real embeddings occupy a small, structured region of it - roughly a shell, with strong anisotropy. Random initialization puts the prompt far outside that region, where the model's early layers have never operated and their behaviour is essentially undefined. This is why initializing from real vocabulary embeddings helps so much: it starts you inside the manifold the rest of the network was trained to consume. (3) THE COMPOSITION IS A GATE, not an addition - the unified view's diagnosis, and the deepest of the four. Rewriting attention over a prefixed sequence splits into standard attention plus a gated delta, where the gate is the share of attention mass the prefix captures. So the prefix's influence is BOUNDED by how much attention it wins, and there is no direct gradient on 'have a larger effect' - it must first win mass, which is a competitive, saturating process. Contrast LoRA, where the update is added with a fixed scale and its magnitude is directly optimizable. This predicts the fix, and the fix works: He et al.'s scaled parallel adapter replaces the gate with a scaled addition and trains better. (4) CAPACITY IS SMALL AND INDIRECT. k*d parameters must steer an entire frozen network, so the loss surface is a low-dimensional slice of a very high-dimensional function, and there is no reason for that slice to be well-conditioned. THE OBSERVED CONSEQUENCES, all of which follow. High seed variance. Slow convergence needing many more steps than adapters. Sensitivity to k, to initialization, and to learning rate. And the fact that prefix tuning NEEDED the MLP reparameterization to train at all - which is a preconditioning fix: optimizing through the MLP changes the effective geometry of the parameter space, and the MLP is discarded afterwards because it was only ever scaffolding for the optimizer. THE MITIGATIONS THAT FOLLOW FROM THE DIAGNOSIS. Vocabulary initialization for (2), SPoT prompt transfer for (2) and (4), depth via prefix tuning for (4), and scaled addition instead of gating for (3). Each targets a specific one, which is why they stack."
          }
        },
        {
          "q": "How do soft prompts compare with in-context learning and hard prompt engineering?",
          "a": "They occupy the same positions in the sequence and differ in whether those positions are optimized continuously or written discretely - and that one difference produces the whole comparison. CAPACITY PER POSITION. A hard prompt token must be one of ~50,000 vocabulary items, roughly 16 bits of information. A soft prompt vector is d free real numbers, unconstrained by the vocabulary. So a 20-vector soft prompt can express far more than 20 real tokens can, and empirically it does - which is why prompt tuning reaches full-fine-tuning parity at scale while prompt engineering generally does not. TRAINING DATA. In-context learning needs a handful of examples and no gradient step. Prompt tuning needs a training set and a training run. That is the fundamental trade: soft prompts buy capacity with a labelled dataset and a fitting procedure. INFERENCE COST, where soft prompts win decisively and it is under-appreciated. Few-shot in-context learning puts entire examples in the context on every request - often hundreds or thousands of tokens - and pays quadratic attention over them forever. A 20-vector soft prompt distils the same task specification into 20 positions. The T-Few work made this argument sharply for (IA)^3 and it applies here: pay once at training rather than on every request. INTERPRETABILITY AND EDITABILITY, where hard prompts win decisively. You can read a hard prompt, reason about it, edit one clause, version it in git, and explain it to a reviewer. Soft prompts are opaque - decoding them to nearest vocabulary neighbours produces incoherent text, because they are not constrained to the region real embeddings occupy. In any setting where someone must audit what the model was told, that is disqualifying. ROBUSTNESS. Soft prompts are fitted to a distribution and can overfit it. Hard prompts are written from intent and generalize in a different, often more predictable way. Neither is uniformly better, but a soft prompt's failure mode is a silent distribution-shift degradation, which is harder to notice. HOW I WOULD ACTUALLY DECIDE. Start with a hard prompt, always - it costs nothing, it is a baseline, and it frequently suffices. Move to few-shot if it does not. Move to soft prompts when the task is stable, high-volume, has training data, and the per-request context cost of few-shot examples has become a real expense - which is exactly the industrial setting the method was designed for. And notice the hybrid that people miss: initialize the soft prompt from the tokens of your best hard prompt. You get the good starting point AND the capacity, and it is strictly better than random initialization."
        },
        {
          "q": "Your prompt tuning run is not converging. Walk through your debugging.",
          "a": "In order of frequency, because this method has a small number of very common failures. CHECK 1: IS THE PREFIX ACTUALLY BEING ATTENDED TO? Extend the attention mask by k when you prepend the prefix. This is the single most common bug and its signature is a loss curve that decreases slightly - because the head can still fit something - rather than one that fails outright. Diagnostic: set the prefix to garbage and see whether the loss changes at all. If it does not, the model is not reading it. CHECK 2: LEARNING RATE. Prompt tuning wants hundredths, not 2e-5. If the pipeline was written for LoRA or adapters, the inherited rate is three orders of magnitude too small and the run will look like a very slow, very flat convergence. This is the second most common cause and it is a one-line fix. Sweep upward aggressively - much further than feels reasonable. CHECK 3: INITIALIZATION. If P was initialized randomly, restart from real vocabulary embeddings, ideally the tokens of the class labels or the best hard prompt you have. Random vectors sit outside the region the network was trained to consume, and at small and medium scale the optimizer frequently never finds its way in. CHECK 4: MODEL SCALE. Is this model large enough? Shallow prompt tuning has a large gap below ~1B parameters and closes it only around 10B. If I am on a 350M model, the run is not broken - the method does not work there. The fix is not more steps; it is prefix tuning or P-tuning v2, which inject at every layer and are far less scale-sensitive. CHECK 5: STEPS. Prompt tuning converges much more slowly than adapters - the gradient traverses the entire frozen stack to reach a small number of parameters. Runs that look stalled at the step count an adapter needs are often still moving. Plot to convergence before concluding. CHECK 6: SEED VARIANCE. This method has materially higher run-to-run variance than the alternatives. Before diagnosing a failure, run three seeds; if one works, the problem is stability rather than setup, and SPoT-style initialization from a related task's prompt is the standard remedy. CHECK 7: k. Too few vectors and there is no capacity; too many and the optimization gets harder and the context cost grows. Values in the tens are typical - sweep it, but late, after the above. THE ORDER MATTERS. The first three are bugs and take minutes. Four and five are regime questions that change the plan. Six and seven are tuning. Working in that order means I do not spend a day tuning k on a run whose attention mask was wrong.",
          "deepDive": {
            "q": "How would you decide the prefix length k, accounting for both quality and serving cost?",
            "a": "k is unusual among hyperparameters because it has a permanent per-request cost, so it is a serving decision as much as a modelling one. THE QUALITY SIDE. k is the capacity knob. Quality typically rises steeply from very small k and then flattens - the same saturating shape as LoRA's rank - with the flattening point depending on task complexity and model scale. Larger models need SMALLER k, which is worth noting: a bigger model needs less steering to reach a given behaviour, the same phenomenon as the shrinking intrinsic dimension behind LoRA. I would sweep k over something like 5, 10, 20, 50, 100 and find the knee. THE COST SIDE, which no parameter count shows. The prefix occupies k positions on every request forever. Three consequences: KV-cache memory grows with (k + n) per sequence, which at high concurrency is real device memory; attention cost grows with (k + n)^2, so k matters more on SHORT requests, where it is a large fraction of the total, than on long ones; and usable context drops to C - k. For k = 20 against a 4k context none of this matters. For k = 100 on a service whose median request is 200 tokens, the prefix is a third of the sequence and a substantial share of the per-request cost - and it recurs for the life of the deployment, unlike a training cost paid once. HOW I WOULD ACTUALLY DECIDE. Build the quality-versus-k curve, then overlay a cost curve computed from my own traffic distribution - not from an average, because the effect is dominated by short requests. Pick the knee of quality, then check whether the next smaller k is within tolerance, and prefer it if so, because the cost is recurring and the quality difference is not. THE ALTERNATIVE I WOULD CONSIDER FIRST. If k needs to be large for quality, that is evidence the shallow form lacks capacity, and the right response is usually DEPTH rather than LENGTH: prefix tuning injects at every layer, so it gets 2L times the parameters at the same k, which buys capacity without buying context cost. Trading sequence length for depth is strictly the better direction when serving cost matters, and it is the design insight that separates prefix tuning from prompt tuning in the first place. THE PRODUCTION DETAIL. The prefix's keys and values are identical for every request using that task, so they can be computed once and cached rather than recomputed - a prefix-cache, which is the same mechanism as system-prompt caching. That removes the compute cost while leaving the memory and context costs, and it is worth building before concluding k is too expensive."
          }
        },
        {
          "q": "Prompt tuning is more robust to domain shift than full fine-tuning. Why, and what does that tell you about the module as a whole?",
          "a": "THE MECHANISM IS ALMOST TRIVIAL ONCE STATED. Full fine-tuning updates the backbone, and 13-01's result is that those updates distort pretrained features - most severely in the directions the fine-tuning data does not constrain, which is exactly where out-of-distribution inputs live. Prompt tuning updates nothing in the backbone. The features are bit-for-bit what pretraining produced, so there is no distortion to suffer. The adaptation is confined to the input, which steers the frozen function rather than rewriting it. Lester et al. measured the consequence directly: smaller degradation under domain shift than full fine-tuning. Catastrophic forgetting is likewise not reduced but ELIMINATED - the base model is unchanged, so its other capabilities are exactly preserved and you can verify that by construction rather than by evaluation. WHAT THIS TELLS YOU ABOUT THE MODULE. It completes a monotone pattern that runs through every lesson so far, and seeing it as one pattern is the point. Full fine-tuning: unconstrained update, learns most, forgets most, worst out-of-distribution behaviour relative to its in-distribution gain. LoRA: rank-constrained, learns less, forgets less - Biderman et al. measured exactly that, and observed it is one property, not two. Adapters and BitFit: smaller still. Prompt tuning: no weight update at all, learns least, forgets nothing. The ordering is the same on both axes because it is the SAME AXIS. The amount you can change the model bounds both what it can acquire and what it can lose, and no method escapes that - the constraint is not a design flaw anyone is going to engineer around. THE PRACTICAL CONSEQUENCE. 'Which PEFT method is best' is malformed. The correct question is which side of the acquire-versus-preserve trade your task sits on. Teaching genuinely new knowledge - a new language, a new domain's facts - means you WANT an unconstrained update and every constraint is working against you. Teaching behaviour, format, tone, task selection - which is most production fine-tuning - means the capability is already present and the constraint costs nothing while buying you preserved capability and robustness for free. THE MODULE'S SPINE, restated. Every method optimizes a proxy. The proxy is always in-distribution performance on the fine-tuning task, which improves with less constraint. The thing you actually want usually includes preserved capability and robustness, which improve with MORE constraint. So the proxy is not merely an imperfect measure of the goal - on this axis it points in the opposite direction, which is why choosing on it goes wrong so reliably."
        },
        {
          "q": "How would you build a multi-task serving system on a single frozen large model using soft prompts?",
          "a": "THE ARCHITECTURE. One copy of the frozen model, resident. A store of per-task prefixes: for shallow prompt tuning, a k x d matrix per task, a few hundred kilobytes; for prefix tuning, per-layer keys and values, larger but still small. At request time, look up the task's prefix, prepend it, run. THE PROPERTY THAT MAKES THIS EASY. Different prefixes in one batch are just different token positions, so a batch containing requests for many tasks is a completely ordinary batched forward pass - no custom kernel, no grouped GEMM, none of the machinery S-LoRA needs for heterogeneous LoRA batching. This is the best multi-tenant story of any method in the module and it is the reason the technique was proposed at that scale in the first place. THE OPTIMIZATION THAT MATTERS MOST. The prefix's keys and values are IDENTICAL for every request using that task, so compute them once and cache them rather than recomputing per request. This is exactly system-prompt or prefix caching, and with it the prefix costs memory and context but almost no compute. Building this early removes most of the objection to larger k. THE COSTS I WOULD PLAN FOR. Context: usable length is C - k for every request. KV cache: (k + n) per sequence, so at high concurrency the prefix is a standing memory charge multiplied by concurrent sequences - though with the shared-prefix cache above, the task-prefix portion can be stored once per task rather than once per sequence, which is a large saving and worth the engineering. Attention: quadratic in (k + n), which bites on SHORT requests, so I would size k against my traffic's short tail rather than its mean. THE OPERATIONAL DESIGN. Prefixes are small enough to treat as configuration: version them, roll them out per tenant, A/B them, and roll back instantly by pointing at the previous matrix. That is a materially better deployment story than swapping model weights, and it is a genuine advantage over every weight-modifying method here. THE PART I WOULD BE HONEST ABOUT. This works well only if the base model is LARGE - shallow prompt tuning trails badly below about 10B. If the platform's model is 7B, I would use prefix tuning or P-tuning v2 for the per-layer capacity, or accept that LoRA is the better method and build the grouped-kernel serving path instead. Choosing prompt tuning for its serving elegance on a model too small to support it is the predictable way this design fails. I would also plan for a QUALITY FLOOR per task: some tasks will not reach acceptable quality with a prefix, and the system should be able to fall back to a LoRA adapter or a dedicated fine-tune for those, which means the serving layer should not assume a single adaptation mechanism from the start."
        },
        {
          "q": "What does it mean that soft prompts are not interpretable, and should it worry you?",
          "a": "WHAT IS ACTUALLY TRUE. If you take a learned prompt vector and find its nearest neighbours among the real vocabulary embeddings, you generally get incoherent text - not a hidden instruction written in English. The reason is geometric: real embeddings occupy a small, structured, anisotropic region of the d-dimensional space, and nothing in the optimization constrains P to stay inside it. The learned vectors are points in embedding space that produce useful behaviour when consumed by layer 1; they are not compressed sentences. Some work finds loosely related tokens for some prompts, but that is weak and not something to rely on. WHY IT MATTERS PRACTICALLY. Three places. (1) AUDITING. In a regulated or safety-sensitive deployment, someone may need to state what the model was instructed to do. 'A matrix we fitted' is a materially worse answer than a prompt someone can read, and in some settings it is not an acceptable answer at all. (2) DEBUGGING. When a hard prompt misbehaves you read it, spot the ambiguous clause, and edit it. When a soft prompt misbehaves your only tool is retraining, because there is nothing to inspect. That is a real reduction in operational leverage. (3) SECURITY. A soft prompt is an opaque artefact that alters model behaviour. If prefixes are supplied by tenants or fetched from a store, the supply chain deserves the same scrutiny as model weights - and unlike weights, there is no reading it to check. SHOULD IT WORRY ME? It should INFORM the choice rather than rule it out, and I would frame it as a trade rather than a defect. The uninterpretability is the same property as the capacity: a soft vector is unconstrained by the vocabulary, which is precisely why 20 of them outperform 20 real tokens. You cannot have the capacity and the readability, because the readability is the constraint. WHERE THAT LEAVES ME. For a stable, high-volume, well-specified task with an evaluation I trust, I would use soft prompts and treat the evaluation as the audit surface - what the artefact DOES is measurable even when what it SAYS is not. For anything requiring human review of instructions, anything low-volume enough that a hard prompt suffices, or anything where I will need to iterate quickly on behaviour, I would use a hard prompt and keep the readability. THE BROADER POINT. This is the same trade as learned features versus hand-engineered ones, one level up. We accepted opacity in representations decades ago because the capacity was worth it, and we manage it with evaluation rather than inspection. Soft prompts extend that bargain to instructions, and it deserves the same response: not refusal, but an insistence that the behavioural evaluation is strong enough to carry the weight the inspection used to."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Prompt tuning vs prefix tuning",
        "back": "Prompt tuning: k trainable vectors prepended at the INPUT, k*d parameters. Prefix tuning: learned K,V prefixes at EVERY layer, 2Lkd parameters. Depth is the difference - and it is why prefix tuning is far less scale-sensitive."
      },
      {
        "type": "intuition",
        "front": "The power of scale (Lester et al.)",
        "back": "Prompt tuning trails full FT badly at small scale, closes the gap monotonically, and reaches PARITY around 10B (T5-XXL). Prototyping on a 250M model gives a negative result that is correct about that model and wrong about the method."
      },
      {
        "type": "pitfall",
        "front": "Extend the attention mask",
        "back": "Prepending k vectors without extending the mask means the model IGNORES the parameters you are training. The signature is a loss that decreases slightly rather than failing outright - so the bug survives a long time. Test: set the prefix to garbage; if loss is unchanged, it is not being read."
      },
      {
        "type": "pitfall",
        "front": "Prompt tuning needs a huge learning rate",
        "back": "Hundredths, not 2e-5 - orders of magnitude above adapters. The gradient traverses the ENTIRE frozen stack to reach only k*d parameters. Inheriting an adapter pipeline's LR makes the method look broken."
      },
      {
        "type": "intuition",
        "front": "Initialize soft prompts from real vocabulary",
        "back": "Real embeddings occupy a small anisotropic shell of the d-dim space; random vectors start outside it, where early layers have never operated. Init from class-label tokens (or your best hard prompt) - worth a lot at small and medium scale."
      },
      {
        "type": "formula",
        "front": "The permanent inference cost of a prefix",
        "back": "KV cache ~ (k+n), attention FLOPs ~ (k+n)^2, usable context = C - k, on EVERY request forever. Bites hardest on SHORT requests, where k is a large fraction of the total. No parameter count shows this."
      },
      {
        "type": "definition",
        "front": "The prefix-tuning reparameterization",
        "back": "Optimize a smaller matrix through an MLP, materialize the prefixes afterwards, discard the MLP. The direct parameterization would not train stably - it is a PRECONDITIONER, scaffolding for the optimizer that costs nothing at inference."
      },
      {
        "type": "intuition",
        "front": "Why prompt tuning is hard to optimize",
        "back": "(1) long narrow gradient path through the whole frozen stack; (2) parameters live outside the embedding manifold; (3) the composition is a GATE - influence is bounded by attention mass won, with no direct gradient on 'have more effect'; (4) tiny indirect capacity."
      },
      {
        "type": "intuition",
        "front": "Prompt tuning is maximally robust to shift",
        "back": "The backbone is untouched, so features cannot be distorted and forgetting is ELIMINATED rather than reduced - verifiable by construction. It is 13-01's finding taken to the limit."
      },
      {
        "type": "definition",
        "front": "SPoT (soft prompt transfer)",
        "back": "Initialize a target task's prompt from one trained on a related source task. Speeds and stabilizes convergence, and gives a task-similarity measure as a by-product - which prompts initialize well from which."
      },
      {
        "type": "pitfall",
        "front": "Soft prompts are not compressed sentences",
        "back": "Nearest-neighbour decoding into vocabulary tokens gives incoherent text, because P is unconstrained by the vocabulary manifold. The uninterpretability IS the capacity - you cannot have both, because readability is the constraint."
      },
      {
        "type": "intuition",
        "front": "Soft prompts vs few-shot ICL",
        "back": "A hard token carries ~16 bits (one of ~50k); a soft vector carries d free reals. So 20 soft vectors beat 20 real tokens. And ICL pays hundreds of context tokens on EVERY request - soft prompts pay once at training. The hybrid: initialize the soft prompt from your best hard prompt."
      }
    ],
    "refs": [
      {
        "title": "Lester et al. (2021), The Power of Scale for Parameter-Efficient Prompt Tuning",
        "url": "https://arxiv.org/abs/2104.08691"
      },
      {
        "title": "Li & Liang (2021), Prefix-Tuning: Optimizing Continuous Prompts for Generation",
        "url": "https://arxiv.org/abs/2101.00190"
      },
      {
        "title": "Liu et al. (2021), P-Tuning v2: Prompt Tuning Can Be Comparable to Fine-tuning Universally Across Scales and Tasks",
        "url": "https://arxiv.org/abs/2110.07602"
      },
      {
        "title": "Vu et al. (2021), SPoT: Better Frozen Model Adaptation through Soft Prompt Transfer",
        "url": "https://arxiv.org/abs/2110.07904"
      },
      {
        "title": "Qin & Eisner (2021), Learning How to Ask: Querying LMs with Mixtures of Soft Prompts",
        "url": "https://arxiv.org/abs/2104.06599"
      }
    ],
    "demos": [
      "tokenizer",
      "embeddings",
      "attention",
      "scaling-laws"
    ],
    "demoTitles": {
      "tokenizer": "Tokenizer Lab",
      "embeddings": "Embedding Atlas",
      "attention": "Attention Heatmap",
      "scaling-laws": "Neural Scaling Laws"
    }
  }
};
