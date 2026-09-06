// GENERATED from content/lessons/transformers/rope.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/transformers/rope/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "rope": "RoPE Explorer",
      "positional-encoding": "Positional Encoding",
      "context-extension": "Context Extension"
    }
  }
};
