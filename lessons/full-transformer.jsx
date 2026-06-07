// lessons/full-transformer.jsx — Module 08-05 - The Full Transformer (Encoder-Decoder).
// Full on-site flagship lesson. Loaded by /learn/transformers/full-transformer/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Assemble the complete encoder-decoder: a bidirectional
// encoder, a masked + cross-attending decoder, the masks that make it work, and how dropping one
// half gives you BERT or GPT.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn, Diagram, TransformerBlock,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            You have built self-attention and stacked it into a block. Now assemble the whole machine.
            The original transformer is an encoder-decoder: an encoder reads the input into a set of
            contextual vectors, and a decoder generates the output one token at a time, attending both
            to what it has produced and to the encoder's representation. It was built for translation,
            and its two halves became the two families that rule NLP.
          </P>
          <P>
            We wire up the encoder and decoder, see the cross-attention that connects them, get the
            masks exactly right, and finish by noting that BERT is just the encoder and GPT is just the
            decoder.
          </P>
          <Diagram caption="The full transformer: a bidirectional encoder feeds a masked, cross-attending decoder.">
            <TransformerBlock width={420} height={320} mode="dark" />
          </Diagram>
        </div>
      </section>

      {/* ── Part 0 — Architecture ── */}
      <LessonSection n="0" title="The Two Stacks" tag="// ENCODER + DECODER">
        <P>
          Two stacks of transformer blocks. The encoder's blocks use ordinary self-attention - every
          input token may look at every other, in both directions. The decoder's blocks have two
          attention sub-layers: a masked self-attention over the output so far, then a cross-attention
          that lets each output position query the encoder's outputs.
        </P>
        <CodeBlock lang="python">{`# encoder block: self-attn (bidirectional) + FFN
# decoder block: masked self-attn  +  cross-attn(to encoder)  +  FFN
# both wrapped in residual + layernorm, stacked N times`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Encoder ── */}
      <LessonSection n="1" title="The Encoder" tag="// READ, BIDIRECTIONALLY">
        <P>
          The encoder turns the input sequence into a sequence of context-rich vectors. Because it sees
          the whole input at once, its self-attention is unmasked - token 3 may attend to token 7 and
          vice versa. The output is a memory the decoder will repeatedly consult.
        </P>
        <CodeBlock lang="python">{`def encoder(x, blocks):
    for blk in blocks:
        x = x + blk.attn(blk.ln1(x))         # full self-attention
        x = x + blk.ffn(blk.ln2(x))
    return x                                   # (S, d) encoder memory`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Decoder and cross-attention ── */}
      <LessonSection n="2" title="The Decoder" tag="// GENERATE, ATTEND TO BOTH">
        <P>
          The decoder generates the output autoregressively. Each block first runs masked self-attention
          (so position <MathInline>{`t`}</MathInline> sees only positions up to <MathInline>{`t`}</MathInline>),
          then cross-attention where the queries come from the decoder but the keys and values come from
          the encoder memory - this is how information crosses from input to output.
        </P>
        <MathBlock>{`\\text{cross-attn: } \\mathrm{Attention}(Q_{\\text{dec}},\\ K_{\\text{enc}},\\ V_{\\text{enc}})`}</MathBlock>
        <CodeBlock lang="python">{`def decoder(y, memory, blocks):
    for blk in blocks:
        y = y + blk.self_attn(blk.ln1(y), causal=True)        # look back only
        y = y + blk.cross_attn(blk.ln2(y), memory)            # query the encoder
        y = y + blk.ffn(blk.ln3(y))
    return y`}</CodeBlock>
        <KeyInsight title="Cross-attention is the bridge">
          Self-attention mixes within a sequence; cross-attention mixes across two. The decoder forms a
          query about what it needs next and retrieves it from the encoder's representation of the input.
          Remove cross-attention and the encoder and decoder fall apart into two independent models -
          which is exactly what the two modern families are.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Masking ── */}
      <LessonSection n="3" title="Masks" tag="// CAUSAL + PADDING">
        <P>
          Two masks make the whole thing correct. The causal mask in the decoder's self-attention blocks
          any position from attending to the future - without it, the model would cheat by peeking at the
          token it is supposed to predict. A padding mask hides positions that are just filler so the
          model never attends to them.
        </P>
        <CodeBlock lang="python">{`import torch
def causal_mask(T):
    return torch.tril(torch.ones(T, T)).bool()    # lower-triangular: no future
# apply: scores.masked_fill(~mask, float('-inf')) before softmax`}</CodeBlock>
        <Warn title="The causal mask is non-negotiable">
          Forget it and your model trains to ~100% accuracy and generates garbage at inference - because
          in training it was reading the answer. Every autoregressive transformer lives or dies by this
          one lower-triangular mask.
        </Warn>
      </LessonSection>

      {/* ── Part 4 — Put it together ── */}
      <LessonSection n="4" title="End to End" tag="// TRANSLATE">
        <P>
          A full forward pass: embed and encode the source, then decode the target with teacher forcing,
          projecting each decoder output through a vocabulary head and training on cross-entropy. At
          inference you decode one token at a time, feeding each prediction back in.
        </P>
        <CodeBlock lang="python">{`def forward(src, tgt, model):
    memory = model.encoder(model.src_emb(src))
    out    = model.decoder(model.tgt_emb(tgt), memory)
    return model.head(out)                          # logits over vocab
# loss = cross_entropy(forward(src, tgt[:-1]), tgt[1:])   # shifted targets`}</CodeBlock>
        <TryThis title="Inspect the cross-attention">
          Visualize the decoder's cross-attention weights on a translation. They recover word alignments
          between the languages - the same interpretable alignment that seq2seq-with-attention first
          showed, now baked into a deeper, fully-attention-based model.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You assembled the complete transformer: a bidirectional encoder, a decoder with masked
          self-attention and cross-attention to the encoder, and the causal and padding masks that keep
          it honest.
        </P>
        <P>
          The full transformer is two stacks joined by cross-attention - the encoder reads, the decoder
          writes while consulting the encoder's memory, and a causal mask keeps generation honest. Keep
          only the encoder and you have BERT (bidirectional understanding); keep only the decoder and you
          have GPT (autoregressive generation). Almost every model you use is one of these two halves of
          the machine you just built.
        </P>
        <Warn title="The one thing to remember">
          Encoder reads, decoder writes, cross-attention connects them, and the causal mask stops the
          decoder from cheating - that is the entire architecture.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
