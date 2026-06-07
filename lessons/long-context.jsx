// lessons/long-context.jsx — Module 17-08 - Long Context (RoPE Scaling and Sliding Window).
// Full on-site flagship lesson. Loaded by /learn/llm-systems/long-context/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Why context length is hard, how RoPE scaling (PI/NTK/YaRN)
// extends it, sparse and sliding-window attention with attention sinks, and how to measure it.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            A model trained on 4,000 tokens of context cannot simply be handed 128,000 and asked to cope.
            Two things break: attention costs grow with the square of the length, and the position encoding
            is asked about positions it has never seen. Extending context is the engineering of getting
            around both - and it is one of the most active frontiers in deploying large language models.
          </P>
          <P>
            We will see why naive extrapolation fails, how RoPE scaling stretches the position encoding,
            how sparse and sliding-window attention tame the quadratic cost (and the surprising role of
            attention sinks), and how to actually measure whether long context works.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Two problems ── */}
      <LessonSection n="0" title="Why It Is Hard" tag="// QUADRATIC + EXTRAPOLATION">
        <P>
          Self-attention compares every token to every other, so its cost is
          <MathInline>{`O(n^2)`}</MathInline> in the sequence length - doubling the context quadruples the
          work and the KV-cache memory. Separately, a model trained only up to length
          <MathInline>{`L`}</MathInline> has never seen positions beyond it, and its position encoding
          produces nonsense there. Long context must solve both.
        </P>
      </LessonSection>

      {/* ── Part 1 — RoPE scaling ── */}
      <LessonSection n="1" title="Extending RoPE" tag="// PI, NTK, YaRN">
        <P>
          Rotary position embeddings rotate each query and key by an angle proportional to position. Feed in
          positions past training and the angles spin past anything seen - attention falls apart. Position
          interpolation (PI) fixes this by squeezing new positions into the trained range: scale every
          position down by the extension factor, so position 8000 is treated like the familiar 2000.
        </P>
        <MathBlock>{`\\theta'_m = \\theta_{m / s}, \\qquad s = \\frac{L_{\\text{new}}}{L_{\\text{train}}}`}</MathBlock>
        <P>
          PI is crude - it compresses high frequencies that encode fine local order. NTK-aware scaling and
          YaRN are smarter: they stretch low frequencies (long-range) more than high ones (local), preserving
          the model's sense of nearby order while extending its reach. A little fine-tuning at the new length
          cements it.
        </P>
        <CodeBlock lang="python">{`def scale_rope(pos, s, mode="pi"):
    if mode == "pi":   return pos / s          # uniform squeeze
    if mode == "ntk":  return pos              # change the base instead (per-dim)
    # YaRN: interpolate low freqs, extrapolate high freqs, with a temperature`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Sparse attention ── */}
      <LessonSection n="2" title="Sliding Windows and Sinks" tag="// BEAT THE QUADRATIC">
        <P>
          To escape <MathInline>{`O(n^2)`}</MathInline>, restrict what each token attends to. Sliding-window
          attention lets a token see only the last <MathInline>{`w`}</MathInline> tokens, making cost linear.
          But naively dropping old tokens crashes quality - because of attention sinks: models dump a lot of
          attention onto the very first tokens, and discarding them destabilizes everything. StreamingLLM's
          fix is to always keep those first few sink tokens plus a recent window.
        </P>
        <CodeBlock lang="python">{`# StreamingLLM cache: a few attention-sink tokens + a sliding recent window
keep = sink_tokens[:4] + recent_tokens[-w:]   # bounded memory, stable quality`}</CodeBlock>
        <KeyInsight title="The first tokens are load-bearing">
          It looks like you should evict the oldest tokens first - they are stale. But attention sinks mean
          the earliest tokens absorb excess attention and keep the softmax well-behaved. Keep the sinks, slide
          the rest: a counterintuitive fix that came straight from looking at the attention maps.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — The cost ── */}
      <LessonSection n="3" title="The Memory Wall" tag="// KV CACHE GROWS">
        <P>
          Even with linear attention, generation stores a key and value for every past token - the KV cache -
          and at long context that cache, not the model weights, dominates memory. This is why long-context
          serving leans on the same toolbox: paged attention to pack the cache, grouped-query attention to
          shrink it, and eviction policies to bound it.
        </P>
        <MathBlock>{`\\text{KV memory} \\approx 2 \\cdot n_{\\text{layers}} \\cdot n_{\\text{tokens}} \\cdot d_{\\text{kv}}`}</MathBlock>
      </LessonSection>

      {/* ── Part 4 — Measure it ── */}
      <LessonSection n="4" title="Does It Actually Work" tag="// PERPLEXITY + RETRIEVAL">
        <P>
          A model accepting 128k tokens is not the same as using them. Two tests: perplexity as a function of
          position should stay flat out to the claimed length (it spikes where extrapolation fails), and a
          needle-in-a-haystack retrieval should find a fact placed anywhere in the context. The notorious
          failure is lost-in-the-middle - facts in the center of a long context get ignored even when the
          model technically accepts them.
        </P>
        <CodeBlock lang="python">{`# needle test: hide a fact at position p in a long context, ask for it
for p in range(0, ctx_len, step):
    ctx = filler[:p] + needle + filler[p:]
    ok[p] = (model(ctx + question) == answer)   # should be 1 everywhere`}</CodeBlock>
        <TryThis title="Plot perplexity vs position">
          Sweep an extended model's perplexity across positions for none / PI / NTK / YaRN scaling. Plain
          extrapolation cliffs at the training length; PI flattens it at a small cost; NTK and YaRN push the
          usable length furthest. That curve is how you choose a scaling method.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You saw the two obstacles to long context - quadratic attention and position extrapolation - and the
          tools that overcome them: RoPE scaling (PI, NTK, YaRN), sliding-window attention with kept sink
          tokens, the KV-cache memory wall, and the perplexity and retrieval tests that reveal whether long
          context truly works.
        </P>
        <P>
          Extending context means stretching the position encoding and bounding the attention cost. RoPE
          scaling reuses trained positions for longer ones; sliding windows plus attention sinks make
          attention linear without collapsing; the KV cache becomes the binding memory constraint; and only a
          position-swept perplexity or needle test proves the context is usable, not just accepted. Long
          context is accepted easily and used only with care.
        </P>
        <Warn title="The one thing to remember">
          Accepting a long context is not the same as using it - stretch RoPE, keep the attention sinks, watch
          the KV cache, and always test whether the middle of the context is actually read.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
