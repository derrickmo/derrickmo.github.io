// lessons/matrix-factorization.jsx — Module 03-09 - Matrix Factorization and Decomposition.
// Full on-site flagship lesson. Loaded by /learn/unsupervised-learning/matrix-factorization/index.html
// AFTER lesson-app.jsx. Sets __DM_LESSON_CONTENT. The SVD, low-rank approximation, recommenders by
// factorizing a sparse matrix, and the through-line to PCA, LSA, and LoRA.

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
            A surprising amount of machine learning is the same move: take a big matrix and factor it into
            smaller pieces that capture its essential structure. Compress an image, find topics in
            documents, recommend movies, shrink a fine-tuned model - all of these are matrix factorization.
            At its center sits the singular value decomposition, one of the most useful results in all of
            applied mathematics.
          </P>
          <P>
            We build the SVD's meaning, use it to compress optimally, factor a sparse ratings matrix into a
            recommender, and trace the same idea through PCA, latent semantic analysis, and LoRA.
          </P>
        </div>
      </section>

      {/* ── Part 0 — A matrix is data ── */}
      <LessonSection n="0" title="Structure in a Matrix" tag="// THE SETUP">
        <P>
          Treat any table as a matrix: pixels, word counts per document, ratings of items by users. The
          question factorization answers is whether that big matrix is secretly low-dimensional - whether a
          few underlying factors explain most of it. Almost always, they do.
        </P>
        <CodeBlock lang="python">{`import numpy as np
A = np.random.randn(200, 50)        # any data matrix: rows x columns`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — SVD ── */}
      <LessonSection n="1" title="The Singular Value Decomposition" tag="// A = U S Vt">
        <P>
          Every matrix factors into a rotation, a scaling, and another rotation. The SVD writes
          <MathInline>{`A = U\\Sigma V^\\top`}</MathInline>, where the columns of
          <MathInline>{`U`}</MathInline> and <MathInline>{`V`}</MathInline> are orthonormal directions and
          the singular values on the diagonal of <MathInline>{`\\Sigma`}</MathInline> say how much the
          matrix stretches along each. Large singular values are the important structure; tiny ones are
          detail or noise.
        </P>
        <MathBlock>{`A = U\\Sigma V^\\top = \\sum_{i} \\sigma_i\\,u_i v_i^\\top`}</MathBlock>
        <CodeBlock lang="python">{`U, S, Vt = np.linalg.svd(A, full_matrices=False)
# A is rebuilt as a sum of rank-1 pieces, ordered by importance (S descending)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Low-rank approximation ── */}
      <LessonSection n="2" title="Optimal Compression" tag="// KEEP THE TOP-k">
        <P>
          Keep only the <MathInline>{`k`}</MathInline> largest singular values and their vectors and you get
          the best possible rank-<MathInline>{`k`}</MathInline> approximation of the matrix - this is the
          Eckart-Young theorem. It is how SVD compresses images and denoises data: throw away the small
          singular values, keep the structure.
        </P>
        <MathBlock>{`A_k = \\sum_{i=1}^{k} \\sigma_i u_i v_i^\\top \\quad=\\quad \\arg\\min_{\\mathrm{rank}(B)\\le k}\\ \\|A - B\\|_F`}</MathBlock>
        <CodeBlock lang="python">{`k = 10
A_k = (U[:, :k] * S[:k]) @ Vt[:k]       # best rank-k approximation
# storing U[:,:k], S[:k], Vt[:k] is far smaller than A for small k`}</CodeBlock>
        <KeyInsight title="Low rank means few hidden factors">
          A matrix being well-approximated by low rank means a few latent factors generated it. Those
          factors are interpretable: in documents they are topics, in images they are basis patterns, in
          ratings they are taste dimensions. Factorization is how you discover them without labels.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Recommenders ── */}
      <LessonSection n="3" title="Recommenders" tag="// FACTOR THE RATINGS">
        <P>
          A recommender factors a sparse user-by-item ratings matrix into user vectors and item vectors, so
          that a rating is predicted by their dot product. Each user and item lives in a shared latent space
          of tastes; the dot product is how well they match. Because most ratings are missing, we fit only on
          the observed entries.
        </P>
        <MathBlock>{`\\hat{r}_{ui} = p_u^\\top q_i, \\qquad \\min_{P, Q}\\sum_{(u,i)\\,\\text{observed}} (r_{ui} - p_u^\\top q_i)^2 + \\lambda(\\|p_u\\|^2 + \\|q_i\\|^2)`}</MathBlock>
        <CodeBlock lang="python">{`# SGD over observed ratings
for u, i, r in observed:
    err = r - P[u] @ Q[i]
    P[u] += lr * (err * Q[i] - lam * P[u])
    Q[i] += lr * (err * P[u] - lam * Q[i])`}</CodeBlock>
        <Aside title="Why not just SVD it">
          Plain SVD needs a full matrix, but ratings are mostly missing. So recommenders factor only the
          observed entries by gradient descent (or alternating least squares) - matrix factorization
          generalized to fill in the blanks, which is exactly the recommendation.
        </Aside>
      </LessonSection>

      {/* ── Part 4 — One idea, everywhere ── */}
      <LessonSection n="4" title="The Same Idea Everywhere" tag="// PCA, LSA, LoRA">
        <P>
          Once you see factorization you see it constantly. PCA is the SVD of centered data - its principal
          components are the top right-singular vectors. Latent semantic analysis is the SVD of a
          word-document matrix, surfacing topics. And LoRA fine-tunes a giant model by adding a low-rank
          factorized update, because the change a task needs is itself low rank.
        </P>
        <CodeBlock lang="python">{`# PCA == SVD of centered data
Xc = X - X.mean(0)
U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
components = Vt[:k]              # the principal directions`}</CodeBlock>
        <TryThis title="Compress an image">
          Run the SVD on a grayscale image and reconstruct it from the top k singular values for k = 5, 20,
          50. Watch a recognizable image emerge from a tiny fraction of the numbers - the singular value
          spectrum tells you exactly how compressible it is.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built the meaning of the SVD, used it for optimal low-rank compression, factored a sparse
          ratings matrix into a recommender, and recognized the same move in PCA, LSA, and LoRA.
        </P>
        <P>
          Matrix factorization decomposes data into a few latent factors, and the SVD does it optimally:
          the top singular values and vectors are the best low-rank approximation there is. Keep them to
          compress and denoise; factor observed entries to recommend; and recognize that PCA, topic models,
          and low-rank adapters are all the same idea. When a matrix is secretly low-dimensional -
          and it usually is - factorization is how you find the dimensions.
        </P>
        <Warn title="The one thing to remember">
          Most big matrices are low rank in disguise - factor them, keep the large singular values, and you
          have the structure with the noise thrown away.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
