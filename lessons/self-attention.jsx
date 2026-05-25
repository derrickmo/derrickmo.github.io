// lessons/self-attention.jsx — Module 08-01 · Self-Attention Mechanism.
//
// This file is loaded BY /learn/transformers/self-attention/index.html
// AFTER lesson-app.jsx, so all helpers (LessonSection, P, Math, CodeBlock,
// KeyInsight, TryThis, Aside, Diagram) are available on window.
//
// To convert from notebook: take each "Part" of the .ipynb in order and
// turn cells into the matching helpers below:
//   - markdown cell → <P>, <H3>, <Math>, <KeyInsight>
//   - code cell     → <CodeBlock lang="python">
//   - output (if useful as a figure) → <Diagram caption>
//
// Below is a placeholder version with the right *shape* so Derrick can
// see how the page looks. Claude Code should replace each <P>/<CodeBlock>
// with the real content from the notebook.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn, Diagram,
  TransformerBlock,
} = window;

function LessonContent() {
  return (
    <>
      {/* ─── Intro block (between hero and Part 0) ──────────── */}
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            Self-attention is the operation that lets a transformer look at
            every other token in a sequence simultaneously and decide how much
            each one matters for the current step. It replaces the recurrence
            of an RNN with a parallel, content-based lookup over the entire
            input. Once you've internalized it, every modern LLM, vision
            transformer, and multimodal model becomes legible.
          </P>
          <P>
            In this lesson we'll derive scaled dot-product attention from first
            principles, implement it in NumPy by hand, port it to PyTorch,
            train a one-layer attention block on a toy copy task, and inspect
            what the attention weights actually learn. Six parts, no shortcuts.
          </P>
        </div>
      </section>

      {/* ─── Part 0 — Setup ─────────────────────────────────── */}
      <LessonSection n="0" title="Setup" tag="// IMPORTS + DATA">
        <P>
          We import NumPy and PyTorch, fix seeds so every run is reproducible,
          and pick a device. Then we set up a tiny synthetic dataset — a copy
          task: given a sequence, produce the same sequence as output. This
          is the simplest task that requires the model to "look at" specific
          input positions, which is exactly what attention is for.
        </P>
        <CodeBlock lang="python">{`import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

# Reproducibility
torch.manual_seed(42)
np.random.seed(42)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Hyperparameters
SEQ_LEN = 6
VOCAB_SIZE = 10
D_MODEL = 16
BATCH = 32`}</CodeBlock>
        <Aside title="Why this dataset?">
          A copy task is the smallest interesting attention problem. The model
          can't solve it by memorizing a mapping — it has to learn to look at
          the right input position. If attention doesn't do this, nothing else
          will save it.
        </Aside>
      </LessonSection>

      {/* ─── Part 1 — From Scratch ──────────────────────────── */}
      <LessonSection n="1" title="From Scratch" tag="// MATH + NUMPY">
        <P>
          Attention is a function of three matrices: queries <MathInline>{`Q`}</MathInline>,
          keys <MathInline>{`K`}</MathInline>, and values <MathInline>{`V`}</MathInline>.
          Each row of <MathInline>{`Q`}</MathInline> asks a question; each row of
          <MathInline>{`K`}</MathInline> advertises what it offers; the answer is a
          weighted sum of <MathInline>{`V`}</MathInline> rows, weighted by how well each key
          matches the query.
        </P>

        <MathBlock>{`\\text{Attention}(Q, K, V) = \\text{softmax}\\!\\left(\\frac{Q K^\\top}{\\sqrt{d_k}}\\right) V`}</MathBlock>

        <P>
          Three things to notice. The dot product <MathInline>{`Q K^\\top`}</MathInline>
          measures similarity. The softmax turns those similarities into a
          probability distribution over keys. The scale <MathInline>{`\\sqrt{d_k}`}</MathInline>
          keeps the logits from saturating when the hidden dimension is large
          (otherwise softmax pushes one weight to 1 and starves the gradients).
        </P>

        <H3>Implementation — pure NumPy</H3>
        <P>
          Before writing any PyTorch, we implement attention with raw arrays so
          there's no doubt about what the operation actually does.
        </P>
        <CodeBlock lang="python">{`def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)

def attention_numpy(Q, K, V):
    """
    Scaled dot-product attention in NumPy.

    Q: (..., n_q, d_k)
    K: (..., n_k, d_k)
    V: (..., n_k, d_v)
    Returns: (..., n_q, d_v), (..., n_q, n_k) — output, weights
    """
    d_k = Q.shape[-1]
    scores = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d_k)
    weights = softmax(scores, axis=-1)
    out = weights @ V
    return out, weights

# Sanity check on tiny matrices
Q = np.random.randn(3, 4)   # 3 queries, dim 4
K = np.random.randn(5, 4)   # 5 keys
V = np.random.randn(5, 8)   # 5 values, dim 8
out, w = attention_numpy(Q, K, V)
print(out.shape)   # (3, 8)
print(w.sum(-1))   # [1., 1., 1.] — each row sums to 1`}</CodeBlock>

        <KeyInsight title="Attention is a soft lookup">
          Imagine a Python dict where <code>keys</code> and <code>values</code> are
          arrays of vectors. A hard lookup picks one key by exact match. Attention
          softens that: it returns a probability-weighted average of all values,
          where the weight for each key is how similar it is to the query.
          That's the whole idea. The math is the formalization.
        </KeyInsight>

        <Diagram caption="Self-attention in a one-layer transformer block (the operation we're building).">
          <TransformerBlock width={420} height={320} mode="dark"
            inputLabel="TOKENS" blockLabel="SELF-ATTN" headLabel="OUT" />
        </Diagram>
      </LessonSection>

      {/* ─── Part 2 — Assembly ──────────────────────────────── */}
      <LessonSection n="2" title="Assembly" tag="// nn.Module">
        <P>
          Now we wrap the operation into an <code>nn.Module</code> that holds
          learnable projection matrices <MathInline>{`W_Q, W_K, W_V`}</MathInline>.
          These map an input embedding into the query, key, and value subspaces.
          During training they're what the model actually learns.
        </P>
        <CodeBlock lang="python">{`class SelfAttention(nn.Module):
    def __init__(self, d_model, d_k):
        super().__init__()
        self.W_q = nn.Linear(d_model, d_k, bias=False)
        self.W_k = nn.Linear(d_model, d_k, bias=False)
        self.W_v = nn.Linear(d_model, d_k, bias=False)
        self.d_k = d_k

    def forward(self, x):
        # x: (B, T, d_model)
        Q = self.W_q(x)   # (B, T, d_k)
        K = self.W_k(x)
        V = self.W_v(x)

        scores = Q @ K.transpose(-1, -2) / (self.d_k ** 0.5)
        weights = F.softmax(scores, dim=-1)
        return weights @ V, weights`}</CodeBlock>
        <Aside title="Why no bias on the projections?">
          The original Transformer paper drops biases on Q/K/V projections —
          they don't help and they add parameters. Modern variants (Llama, GPT)
          follow the same convention.
        </Aside>
      </LessonSection>

      {/* ─── Part 3 — Training ──────────────────────────────── */}
      <LessonSection n="3" title="Training" tag="// TRAIN + COMPARE">
        <P>
          We wrap the attention layer with an embedding for the input tokens
          and a linear head for the output logits, then train on the copy task
          with cross-entropy loss. Expect the model to reach near-perfect
          accuracy within a few hundred steps — proof that attention can
          identify and copy from the relevant input position.
        </P>
        <CodeBlock lang="python">{`class TinyAttentionModel(nn.Module):
    def __init__(self, vocab, d_model, d_k):
        super().__init__()
        self.embed = nn.Embedding(vocab, d_model)
        self.attn = SelfAttention(d_model, d_k)
        self.head = nn.Linear(d_k, vocab)

    def forward(self, x):
        h = self.embed(x)
        h, w = self.attn(h)
        return self.head(h), w

model = TinyAttentionModel(VOCAB_SIZE, D_MODEL, D_MODEL).to(device)
opt = torch.optim.Adam(model.parameters(), lr=3e-3)

for step in range(500):
    x = torch.randint(0, VOCAB_SIZE, (BATCH, SEQ_LEN), device=device)
    y = x.clone()    # copy task
    logits, _ = model(x)
    loss = F.cross_entropy(logits.reshape(-1, VOCAB_SIZE), y.reshape(-1))
    opt.zero_grad()
    loss.backward()
    opt.step()
    if step % 50 == 0:
        print(f"step {step:>4} | loss {loss.item():.3f}")`}</CodeBlock>
        <TryThis title="Break it, then explain it.">
          Set the scale factor to 1 (remove the <MathInline>{`\\sqrt{d_k}`}</MathInline>)
          and increase <code>D_MODEL</code> to 128. Watch the loss plateau higher.
          Inspect <code>scores.std()</code> before softmax — without the scale,
          the logits saturate and gradients vanish. This is why the scale exists.
        </TryThis>
      </LessonSection>

      {/* ─── Part 4 — Evaluation ────────────────────────────── */}
      <LessonSection n="4" title="Evaluation" tag="// METRICS + ABLATION">
        <P>
          The most informative thing we can do is visualize the attention
          weights for a held-out example. A well-trained copy model produces a
          near-diagonal attention matrix: each output position attends almost
          entirely to the corresponding input position. If the matrix is
          uniform or off-diagonal, something is wrong.
        </P>
        <CodeBlock lang="python">{`model.eval()
with torch.no_grad():
    x = torch.randint(0, VOCAB_SIZE, (1, SEQ_LEN), device=device)
    logits, w = model(x)
    preds = logits.argmax(-1)

print("input :", x[0].tolist())
print("pred  :", preds[0].tolist())
print("attn:")
print(w[0].cpu().numpy().round(2))`}</CodeBlock>
        <KeyInsight title="The attention matrix is the explanation">
          Unlike many ML models, attention's intermediate state is human-readable.
          You can point at a row and say "the model used these inputs to produce
          this output." That's why "attention as interpretation" is such a
          common technique in NLP — though it's not the whole story (see
          Module 10-10, Mechanistic Interpretability).
        </KeyInsight>
        <Warn title="Don't over-trust attention as 'attribution'.">
          Attention weights are NOT a faithful explanation of which inputs the
          model actually used. Multiple papers (Jain & Wallace 2019, Wiegreffe
          & Pinter 2019) show that you can permute attention weights without
          changing predictions much. Treat them as a useful debugging tool, not
          a causal explanation.
        </Warn>
      </LessonSection>

      {/* ─── Part 5 — Summary ───────────────────────────────── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          In one lesson we went from a similarity-weighted lookup all the way
          to a working attention layer that learns to solve a sequence task.
          The math is six lines. The intuition is one sentence: attention is a
          soft, content-based pointer over a sequence.
        </P>
        <H3>What to remember</H3>
        <ul style={{ color: "var(--white)", fontSize: 16, lineHeight: 1.7, maxWidth: 720, paddingLeft: 22 }}>
          <li>Attention computes a weighted average of values. Weights come from query–key similarity.</li>
          <li>The <MathInline>{`\\sqrt{d_k}`}</MathInline> scale exists to keep softmax gradients alive at large widths.</li>
          <li>One attention head can only express one kind of relationship per layer — next lesson, we'll see why we need multiple heads.</li>
          <li>Attention's intermediate state is interpretable but not necessarily a faithful explanation.</li>
        </ul>
        <H3>Next up</H3>
        <P>
          <strong>08-02 · Multi-Head Attention.</strong> One head can't capture
          syntactic dependence and lexical similarity simultaneously. Multiple
          heads, projected to a shared output, let the model attend in parallel
          to different relationship types. We'll implement it from scratch and
          see why "12 heads" became the default.
        </P>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
