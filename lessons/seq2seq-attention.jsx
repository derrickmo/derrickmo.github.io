// lessons/seq2seq-attention.jsx — Module 07-05 - Sequence-to-Sequence with Attention.
// Full on-site flagship lesson. Loaded by /learn/rnn-nlp/seq2seq-attention/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. The encoder-decoder bottleneck and how Bahdanau
// attention fixes it - the idea that became self-attention and the transformer.

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
            Translating a sentence means reading one sequence and writing another, possibly of
            a different length. The encoder-decoder, or sequence-to-sequence, model does exactly
            that: one RNN reads the input into a summary, a second RNN writes the output from it.
            It worked - until the sentences got long, and a single fixed-size summary could no
            longer hold everything.
          </P>
          <P>
            Attention was the fix, and it changed everything. Instead of forcing all information
            through one bottleneck vector, the decoder learns to look back at the relevant input
            positions at each step. We build the bottleneck model, watch it strain, add Bahdanau
            attention, and read the alignment it learns - the direct ancestor of the transformer.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// A TOY TRANSLATION TASK">
        <P>
          We use a tiny synthetic task: reverse a sequence of symbols. It is the simplest job
          that forces the decoder to attend to specific input positions, which makes the effect
          of attention easy to see.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn
torch.manual_seed(0)

V, L = 12, 8                          # vocab size, sequence length
def batch(n=64):
    src = torch.randint(1, V, (n, L))
    tgt = torch.flip(src, dims=[1])   # target = reversed source
    return src, tgt`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — The encoder-decoder ── */}
      <LessonSection n="1" title="The Encoder-Decoder" tag="// ONE SUMMARY VECTOR">
        <P>
          The encoder reads the input and hands its final hidden state to the decoder as a single
          context vector. The decoder starts from that vector and generates the output one token
          at a time, feeding each prediction back in.
        </P>
        <CodeBlock lang="python">{`class Encoder(nn.Module):
    def __init__(self, h=64):
        super().__init__()
        self.emb = nn.Embedding(V, h)
        self.rnn = nn.GRU(h, h, batch_first=True)
    def forward(self, src):
        out, hidden = self.rnn(self.emb(src))   # out: all states; hidden: the summary
        return out, hidden`}</CodeBlock>
        <Warn title="The bottleneck">
          Everything the decoder knows about a 50-word sentence must be squeezed into one
          fixed-length vector. Early words get overwritten; performance falls off a cliff as
          length grows. The information is all there in the per-step encoder states - the decoder
          just cannot reach it.
        </Warn>
      </LessonSection>

      {/* ── Part 2 — Attention ── */}
      <LessonSection n="2" title="Bahdanau Attention" tag="// LOOK BACK EACH STEP">
        <P>
          Attention lets the decoder, at every output step, compute a weighted blend of all the
          encoder states rather than relying on one summary. It scores each encoder state against
          the decoder's current state, softmax-normalizes the scores into alignment weights, and
          mixes the states accordingly.
        </P>
        <MathBlock>{`\\alpha_{ti} = \\mathrm{softmax}_i\\big(\\text{score}(s_t, h_i)\\big), \\qquad c_t = \\sum_i \\alpha_{ti}\\,h_i`}</MathBlock>
        <CodeBlock lang="python">{`class Attention(nn.Module):
    def __init__(self, h=64):
        super().__init__()
        self.W = nn.Linear(2 * h, h); self.v = nn.Linear(h, 1, bias=False)
    def forward(self, dec_state, enc_states):       # (B,h), (B,L,h)
        q = dec_state.unsqueeze(1).expand(-1, enc_states.size(1), -1)
        score = self.v(torch.tanh(self.W(torch.cat([q, enc_states], -1)))).squeeze(-1)
        alpha = torch.softmax(score, dim=1)         # alignment weights (B,L)
        context = (alpha.unsqueeze(-1) * enc_states).sum(1)
        return context, alpha`}</CodeBlock>
        <KeyInsight title="This is self-attention's parent">
          The decoder forms a query, every encoder state offers a key and a value, and the output
          is a softmax-weighted sum of values. Replace "decoder attends to encoder" with "every
          token attends to every token" and you have self-attention - the transformer drops the
          RNN entirely and keeps only this.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Training ── */}
      <LessonSection n="3" title="Training" tag="// TEACHER FORCING">
        <P>
          We train with teacher forcing: at each decoder step we feed the true previous token
          rather than the model's own (possibly wrong) prediction, which stabilizes early
          training. The loss is cross-entropy over the output tokens.
        </P>
        <CodeBlock lang="python">{`def decode_step(dec_rnn, attn, emb, prev_tok, dec_state, enc_states, head):
    context, alpha = attn(dec_state[-1], enc_states)
    x = torch.cat([emb(prev_tok), context], dim=-1).unsqueeze(1)
    out, dec_state = dec_rnn(x, dec_state)
    logits = head(out.squeeze(1))
    return logits, dec_state, alpha
# loop over target positions, accumulate cross-entropy, backprop`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Read the alignment ── */}
      <LessonSection n="4" title="Read the Alignment" tag="// THE ATTENTION MAP">
        <P>
          The payoff is interpretability. Stack the alignment weights across all output steps into
          a matrix and you get an attention map - which input position the model looked at for each
          output position. On our reversal task it forms a clean anti-diagonal: output position
          <MathInline>{`t`}</MathInline> attends to input position <MathInline>{`L-t`}</MathInline>.
        </P>
        <CodeBlock lang="python">{`# collect alpha (B, L) at each output step -> (L_out, L_in) for one example
A = torch.stack(alphas, dim=0)[:, 0, :]     # attention matrix
# plotting A shows a bright anti-diagonal: the model learned to reverse`}</CodeBlock>
        <P>
          On real translation, these maps recover word alignments between languages - the model
          discovers, with no alignment supervision, which source word each target word comes from.
          That a network learns this on its own is what made attention so compelling.
        </P>
        <TryThis title="Break the bottleneck on purpose">
          Train the plain encoder-decoder and the attention version as you grow the sequence length.
          The plain model's accuracy collapses with length; the attention model holds. The gap is
          the bottleneck, made visible.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built an encoder-decoder, saw its single-vector bottleneck strain on long sequences,
          added Bahdanau attention so the decoder could look back at every encoder state, and read
          the alignment it learned.
        </P>
        <P>
          Sequence-to-sequence maps one sequence to another through an encoder summary and a
          decoder. Attention removes the bottleneck by letting the decoder form a query-weighted
          blend of all encoder states at each step - and produces interpretable alignments for
          free. Generalize "decoder attends to encoder" into "everything attends to everything,"
          drop the recurrence, and you have arrived at the transformer.
        </P>
        <Warn title="The one thing to remember">
          Do not compress a sequence into one vector and hope. Keep every state around and let the
          model attend to what it needs - that single move powers all of modern NLP.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
