// lessons/linear-algebra.jsx — Module 01-06 - Linear Algebra for Machine Learning.
// Full on-site flagship lesson. Loaded by /learn/foundations/linear-algebra/index.html
// AFTER lesson-app.jsx. Sets __DM_LESSON_CONTENT. Why ML lives in matmuls: dot products
// as similarity, matrices as linear maps, then least squares solved with the normal
// equations and verified against NumPy and PyTorch.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn, Diagram,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            Almost every operation in machine learning is, underneath, a matrix multiply.
            A neural network layer, a similarity search, a projection onto principal
            components, a least-squares fit - all of them reduce to multiplying vectors and
            matrices. Get comfortable with that small vocabulary and the rest of the field
            stops looking like magic and starts looking like linear algebra.
          </P>
          <P>
            In this lesson we build the core operations from the ground up - the dot
            product as similarity, a matrix as a linear map, matrix multiplication as
            composition - then use them to solve a real problem: fitting a line to data
            with the normal equations, and checking our answer against NumPy and PyTorch.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// IMPORTS + DATA">
        <P>
          We import NumPy for the from-scratch work and PyTorch only to cross-check at the
          end. Then we make a small dataset: points scattered around a true line, so we
          have something concrete to fit later.
        </P>
        <CodeBlock lang="python">{`import numpy as np
import torch
np.random.seed(0)

# points around the line y = 2x + 1, with noise
n = 50
x = np.linspace(-3, 3, n)
y = 2 * x + 1 + np.random.randn(n) * 1.0
X = np.stack([x, np.ones(n)], axis=1)   # design matrix: columns [x, 1]`}</CodeBlock>
        <P>
          Stacking a column of ones beside <MathInline>{`x`}</MathInline> is a standard
          trick: it folds the intercept into the same matrix so a single matrix-vector
          product computes <MathInline>{`wx + b`}</MathInline> for every point at once.
        </P>
      </LessonSection>

      {/* ── Part 1 — From Scratch ── */}
      <LessonSection n="1" title="From Scratch" tag="// VECTORS + MATRICES">
        <H3>The dot product is similarity</H3>
        <P>
          The dot product of two vectors sums their elementwise products. Geometrically it
          measures alignment: large and positive when the vectors point the same way, zero
          when they are orthogonal, negative when they oppose. Normalize it and you get
          cosine similarity - the backbone of embeddings and retrieval.
        </P>
        <MathBlock>{`a \\cdot b = \\sum_i a_i b_i = \\|a\\|\\,\\|b\\|\\cos\\theta`}</MathBlock>
        <CodeBlock lang="python">{`def dot(a, b):
    return sum(ai * bi for ai, bi in zip(a, b))

a, b = np.array([1, 2, 3]), np.array([0, 1, 0])
print(dot(a, b), a @ b)              # 2, 2  (@ is NumPy's dot/matmul)

# cosine similarity
cos = (a @ b) / (np.linalg.norm(a) * np.linalg.norm(b))`}</CodeBlock>
        <KeyInsight title="Why ML loves dot products">
          A single neuron computes a dot product of its weights with its inputs - it is
          literally asking "how much does this input look like what I am tuned for?"
          Attention scores, kernel methods, and nearest-neighbor search are all dot
          products in disguise.
        </KeyInsight>

        <H3>A matrix is a linear map</H3>
        <P>
          Multiplying a vector by a matrix transforms it - rotating, scaling, projecting,
          or mixing its coordinates. Each output entry is a dot product of one matrix row
          with the input vector. Stacking those dot products is matrix-vector
          multiplication.
        </P>
        <MathBlock>{`(Wx)_i = \\sum_j W_{ij}\\,x_j`}</MathBlock>
        <P>
          Matrix-matrix multiplication then composes two linear maps into one, and it is
          the single most important operation to picture: row of the left times column of
          the right, accumulated.
        </P>
        <CodeBlock lang="python">{`def matmul(A, B):
    m, k = A.shape; k2, n = B.shape
    out = np.zeros((m, n))
    for i in range(m):
        for j in range(n):
            out[i, j] = A[i, :] @ B[:, j]     # row . column
    return out

A = np.random.randn(3, 4); B = np.random.randn(4, 2)
print(np.allclose(matmul(A, B), A @ B))       # True`}</CodeBlock>
        <Aside title="Shapes are a type system">
          <MathInline>{`(m\\times k)\\,(k\\times n) = (m\\times n)`}</MathInline>: the inner
          dimensions must match and they vanish; the outer ones survive. Reading shapes is
          how you debug almost every deep-learning error before it happens.
        </Aside>
      </LessonSection>

      {/* ── Part 2 — Assembly ── */}
      <LessonSection n="2" title="Assembly" tag="// A LAYER IS A MATMUL">
        <P>
          With matmul in hand, a whole layer of a network applied to a whole batch is one
          operation: stack the inputs into a matrix and multiply. No loops over examples,
          no loops over neurons - the hardware does it in parallel. This is why we write
          vectorized code instead of Python loops.
        </P>
        <CodeBlock lang="python">{`# batch of 32 inputs, layer with weights W (in=4, out=8)
Xb = np.random.randn(32, 4)
W  = np.random.randn(4, 8)
b  = np.random.randn(8)
H  = Xb @ W + b          # (32, 8): every example, every neuron, at once`}</CodeBlock>
        <P>
          The norm of a vector measures its length, and it is how we size gradients, weight
          decay, and distances. Two show up constantly:
        </P>
        <MathBlock>{`\\|v\\|_2 = \\sqrt{\\textstyle\\sum_i v_i^2}, \\qquad \\|v\\|_1 = \\textstyle\\sum_i |v_i|`}</MathBlock>
        <TryThis title="Feel the parallelism">
          Time <code>Xb @ W</code> against a double Python loop over examples and neurons
          for a 1000x1000 matrix. The vectorized version is often 100x faster - same math,
          run in C on contiguous memory.
        </TryThis>
      </LessonSection>

      {/* ── Part 3 — Application ── */}
      <LessonSection n="3" title="Application" tag="// LEAST SQUARES">
        <P>
          Now use it. Fitting the best line through our noisy points is the least-squares
          problem: find the weights that minimize the squared error
          <MathInline>{`\\|Xw - y\\|^2`}</MathInline>. Setting the gradient to zero gives a
          closed-form answer entirely in matrix operations - the normal equations.
        </P>
        <MathBlock>{`\\hat{w} = (X^\\top X)^{-1} X^\\top y`}</MathBlock>
        <CodeBlock lang="python">{`# solve the normal equations (don't invert explicitly - solve the system)
w_hat = np.linalg.solve(X.T @ X, X.T @ y)
print("slope, intercept =", w_hat)        # ~ [2, 1], recovering the true line`}</CodeBlock>
        <P>
          Two transposes, a matrix product, and a solve - and we have recovered the slope
          and intercept that generated the data. Every term is something we built in Part
          1. No iteration, no learning rate; pure linear algebra.
        </P>
        <Warn title="Solve, don't invert">
          Never compute <MathInline>{`(X^\\top X)^{-1}`}</MathInline> directly. Forming the
          inverse is slower and numerically worse than solving the linear system, which is
          what <code>np.linalg.solve</code> (and a QR or SVD under the hood) does.
        </Warn>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="Evaluation" tag="// CROSS-CHECK">
        <P>
          Trust, but verify. NumPy's dedicated least-squares routine and PyTorch's linear
          algebra should both reproduce our hand-rolled solution.
        </P>
        <CodeBlock lang="python">{`# NumPy's least-squares solver
w_np, *_ = np.linalg.lstsq(X, y, rcond=None)

# PyTorch
Xt, yt = torch.tensor(X), torch.tensor(y)
w_t = torch.linalg.lstsq(Xt, yt).solution

print(np.allclose(w_hat, w_np))                 # True
print(np.allclose(w_hat, w_t.numpy(), atol=1e-6))  # True`}</CodeBlock>
        <KeyInsight title="The same idea scales up">
          This 2-parameter line fit is the exact computation behind a linear regression
          over thousands of features, and the SVD that solves it robustly is the same SVD
          behind PCA, low-rank adapters (LoRA), and recommendation systems. One toolkit,
          everywhere.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built the dot product, saw it as similarity, treated a matrix as a linear map,
          composed maps with matrix multiplication, vectorized a whole layer, and then
          solved a real least-squares fit with nothing but those pieces.
        </P>
        <P>
          The dot product measures alignment; a matrix transforms a vector; matrix
          multiplication composes transformations and runs in parallel on hardware. Stack
          your data into matrices and the per-example loops vanish. Norms size things;
          eigenvectors and the SVD expose a matrix's principal directions. Master this
          handful of operations and the rest of machine learning reads as applied linear
          algebra.
        </P>
        <Warn title="The one thing to remember">
          When in doubt, look at the shapes. Matching inner dimensions is the type system
          of machine learning - get the shapes right and the math usually follows.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
