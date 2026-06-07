// lessons/gpt.jsx — Module 10-01 - GPT-Style Autoregressive Language Modeling.
// Full on-site flagship lesson. Loaded by /learn/advanced-nlp/gpt/index.html AFTER lesson-app.jsx.
// Sets __DM_LESSON_CONTENT. Build a decoder-only GPT from scratch: next-token objective, the
// architecture, causal training, a minimal nanoGPT-style model, generation, then scaling.

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
            Every large language model you have used - ChatGPT, Claude, Llama - is, at its core, the same
            thing: a decoder-only transformer trained to predict the next token. It is a startlingly simple
            objective, "guess what comes next," and yet scaled up it produces translation, reasoning, code,
            and conversation as side effects. This lesson builds that model from scratch.
          </P>
          <P>
            We will state the objective, lay out the decoder-only architecture, train it with a causal mask,
            assemble a minimal GPT in a handful of lines, generate text from it, and end on the one fact that
            turned this toy into a revolution: it keeps getting better as you scale it.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The objective ── */}
      <LessonSection n="0" title="Next-Token Prediction" tag="// THE WHOLE GAME">
        <P>
          A language model factorizes the probability of a sequence into a product of next-token
          probabilities, each conditioned on everything before it. Training maximizes the log-likelihood of
          real text under this factorization - equivalently, it minimizes cross-entropy on predicting each
          token from its predecessors.
        </P>
        <MathBlock>{`p(x_1, \\dots, x_T) = \\prod_{t=1}^{T} p(x_t \\mid x_{<t})`}</MathBlock>
        <P>
          That is the entire training signal. No labels, no task - just text, and the demand to predict it.
        </P>
      </LessonSection>

      {/* ── Part 1 — The architecture ── */}
      <LessonSection n="1" title="Decoder-Only Architecture" tag="// EMBED, STACK, PROJECT">
        <P>
          GPT is the decoder half of the transformer with the cross-attention removed - there is no encoder
          to attend to. Tokens are embedded and given positions, passed through a stack of blocks (each:
          masked self-attention, then an MLP, wrapped in residuals and norms), and a final linear head
          projects every position to a distribution over the vocabulary.
        </P>
        <CodeBlock lang="python">{`import torch, torch.nn as nn

class GPT(nn.Module):
    def __init__(self, V, d, n_layers, n_heads, T):
        super().__init__()
        self.tok = nn.Embedding(V, d)
        self.pos = nn.Embedding(T, d)
        self.blocks = nn.ModuleList(Block(d, n_heads) for _ in range(n_layers))
        self.ln = nn.LayerNorm(d)
        self.head = nn.Linear(d, V, bias=False)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Causal training ── */}
      <LessonSection n="2" title="Train on Shifted Tokens" tag="// PREDICT THE NEXT ONE">
        <P>
          The trick that makes training efficient: with a causal mask, a single forward pass predicts the
          next token at <em>every</em> position at once. The targets are just the inputs shifted by one. One
          sequence of length <MathInline>{`T`}</MathInline> yields <MathInline>{`T`}</MathInline> training
          examples for free.
        </P>
        <CodeBlock lang="python">{`def forward(self, idx):
    T = idx.size(1)
    x = self.tok(idx) + self.pos(torch.arange(T))
    for blk in self.blocks:
        x = blk(x)                      # masked self-attention inside
    return self.head(self.ln(x))        # logits at every position

# loss: predict token t+1 from positions up to t
logits = model(x[:, :-1])
loss = nn.functional.cross_entropy(logits.flatten(0, 1), x[:, 1:].flatten())`}</CodeBlock>
        <Warn title="The causal mask does the work">
          Without the mask, position t would see token t+1 - the answer - and training would be trivial and
          useless. The lower-triangular mask is what lets one parallel forward pass legitimately supervise
          every position at once. It is the entire reason GPT trains so efficiently.
        </Warn>
      </LessonSection>

      {/* ── Part 3 — A minimal block ── */}
      <LessonSection n="3" title="The Block" tag="// ATTENTION + MLP">
        <P>
          Each block is the transformer block you already know, pre-norm style: masked self-attention adds
          context across tokens, an MLP transforms each token, and residual connections carry the signal
          through. Stack a dozen of these and you have GPT-2; stack many more and widen them and you have a
          frontier model.
        </P>
        <CodeBlock lang="python">{`class Block(nn.Module):
    def __init__(self, d, h):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.attn = CausalSelfAttention(d, h)
        self.mlp = nn.Sequential(nn.Linear(d, 4*d), nn.GELU(), nn.Linear(4*d, d))
    def forward(self, x):
        x = x + self.attn(self.ln1(x))    # mix across tokens (causally)
        x = x + self.mlp(self.ln2(x))     # transform each token
        return x`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Generation ── */}
      <LessonSection n="4" title="Generate" tag="// SAMPLE, FEED BACK, REPEAT">
        <P>
          To generate, run the model on the prompt, take the distribution at the last position, sample a
          token, append it, and repeat. Decoding strategy - temperature, top-k, top-p - shapes the style of
          what comes out. This autoregressive loop is all there is to "the model writing."
        </P>
        <CodeBlock lang="python">{`@torch.no_grad()
def generate(model, idx, n, temp=1.0):
    for _ in range(n):
        logits = model(idx[:, -T:])[:, -1] / temp
        probs = torch.softmax(logits, dim=-1)
        nxt = torch.multinomial(probs, 1)
        idx = torch.cat([idx, nxt], dim=1)     # append and continue
    return idx`}</CodeBlock>
        <TryThis title="Train on tiny Shakespeare">
          A small GPT trained on a few megabytes of Shakespeare will, in minutes, go from random characters to
          plausible Elizabethan-looking text. Watching coherence emerge from pure next-token prediction is the
          fastest way to feel why this objective is so powerful.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built a GPT from scratch: the next-token objective, a decoder-only stack with a language-model
          head, causal training that supervises every position in one pass, a minimal block, and the
          autoregressive generation loop.
        </P>
        <P>
          GPT is a decoder-only transformer trained to predict the next token by minimizing cross-entropy, with
          a causal mask that turns one sequence into many supervised examples. Generation is just sampling that
          distribution and feeding it back. The architecture is modest and the objective is humble - and the
          headline result of the last few years is that scaling this exact recipe in data, parameters, and
          compute is what produced the capabilities we now call large language models.
        </P>
        <Warn title="The one thing to remember">
          Predict the next token, mask the future, and scale - that simple loop, enlarged, is the whole of
          modern language modeling.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
