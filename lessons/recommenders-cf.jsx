// lessons/recommenders-cf.jsx — Module 19-01 - Recommender Systems (Collaborative Filtering).
// Full on-site flagship lesson. Loaded by /learn/ml-applications/recommenders-cf/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Predict what a user will like from the crowd: neighborhood
// methods, matrix factorization, implicit feedback, the cold-start problem, and ranking evaluation.

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
            Every "recommended for you" list rests on a simple bet: people who agreed in the past will agree in
            the future. Collaborative filtering makes recommendations using only the matrix of who liked what -
            no knowledge of the items or users themselves, just the pattern of interactions. It powers Netflix,
            Spotify, Amazon, and YouTube, and it is a beautiful application of the matrix-factorization ideas
            you have already met.
          </P>
          <P>
            We build it from the neighborhood intuition, move to the latent-factor model that scales, handle the
            implicit-feedback reality and the cold-start problem, and finish on how to evaluate a recommender
            honestly.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The matrix ── */}
      <LessonSection n="0" title="The Interaction Matrix" tag="// USERS x ITEMS">
        <P>
          Lay out a matrix with users as rows, items as columns, and ratings (or clicks, plays, purchases) in
          the cells. It is enormous and almost entirely empty - any user has touched a tiny fraction of items.
          Recommendation is the task of predicting the missing entries: what rating would this user give that
          item they have not seen?
        </P>
        <CodeBlock lang="python">{`# R[u, i] = rating of item i by user u, mostly missing (NaN)
# goal: predict the blanks, then recommend the highest-predicted unseen items`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Neighborhoods ── */}
      <LessonSection n="1" title="Neighborhood Methods" tag="// FIND SIMILAR USERS">
        <P>
          The most direct approach: to predict a user's rating for an item, find other users who rated it and
          who have similar taste, and average their ratings weighted by similarity. Item-item filtering flips
          it - recommend items similar to ones the user already liked, where similarity is measured by who
          rated them alike. Item-item is usually preferred: items are more stable than users.
        </P>
        <MathBlock>{`\\hat{r}_{ui} = \\frac{\\sum_{v \\in N(u)} \\mathrm{sim}(u, v)\\, r_{vi}}{\\sum_{v \\in N(u)} |\\mathrm{sim}(u, v)|}`}</MathBlock>
        <Warn title="Neighborhoods do not scale">
          Computing similarities between all pairs of millions of users is quadratic and the matrix is too
          sparse for reliable overlaps. Neighborhood methods are intuitive and a fine baseline, but at scale
          the field moved to a model that compresses the matrix instead.
        </Warn>
      </LessonSection>

      {/* ── Part 2 — Matrix factorization ── */}
      <LessonSection n="2" title="Latent Factors" tag="// FACTORIZE THE MATRIX">
        <P>
          The winning idea, made famous by the Netflix Prize, is to factor the interaction matrix into a
          user-factor matrix and an item-factor matrix. Each user and item becomes a short vector in a shared
          latent space of tastes - "amount of sci-fi," "amount of indie" - learned automatically. A predicted
          rating is just the dot product of a user vector and an item vector.
        </P>
        <MathBlock>{`\\hat{r}_{ui} = p_u^\\top q_i, \\qquad \\min_{P, Q} \\sum_{(u,i)\\,\\text{observed}} (r_{ui} - p_u^\\top q_i)^2 + \\lambda(\\|p_u\\|^2 + \\|q_i\\|^2)`}</MathBlock>
        <CodeBlock lang="python">{`for u, i, r in observed:                  # SGD over known ratings only
    err = r - P[u] @ Q[i]
    P[u] += lr * (err * Q[i] - lam * P[u])
    Q[i] += lr * (err * P[u] - lam * Q[i])`}</CodeBlock>
        <KeyInsight title="This is matrix factorization, filling blanks">
          Plain SVD needs a complete matrix; recommenders factor only the observed cells by gradient descent,
          and the learned low-rank structure predicts the rest. The same decomposition that compresses an image
          here discovers latent tastes and uses them to fill in what a user has not yet seen.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Implicit feedback and cold start ── */}
      <LessonSection n="3" title="Reality: Implicit and Cold" tag="// CLICKS, NOT STARS">
        <P>
          Most systems never see star ratings - they see clicks, plays, dwell time. This implicit feedback is
          one-sided: a play is a weak positive, but a non-play is not a clear negative (maybe they never saw
          it). Models weight observed interactions as confident positives and treat the rest as uncertain. And
          a brand-new user or item has no interactions at all - the cold-start problem - which pushes systems to
          fall back on content features or popularity until data accrues.
        </P>
        <Aside title="The two-tower fix">
          Modern recommenders blend collaborative signal with content: a two-tower model encodes user features
          and item features into the same space, so a never-seen item still gets a vector from its attributes.
          Collaborative filtering tells you who agrees; content tells you what to do before anyone has agreed.
        </Aside>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="Evaluate the Ranking" tag="// NOT RMSE">
        <P>
          A recommender's job is to order items, not predict exact ratings, so evaluate the ranking. Hold out
          some known-liked items, see whether they surface near the top, and score with ranking metrics like
          precision@k, recall@k, or NDCG. Offline ranking quality is only a proxy, though - the real test is an
          online A/B test on engagement.
        </P>
        <CodeBlock lang="python">{`def precision_at_k(recommended, relevant, k):
    hits = len(set(recommended[:k]) & set(relevant))
    return hits / k          # fraction of the top-k that the user actually liked`}</CodeBlock>
        <TryThis title="Beware the popularity trap">
          Compare your model against a baseline that just recommends the most popular items to everyone.
          Popularity is a surprisingly strong baseline and easy to accidentally relearn - if your fancy model
          barely beats it, it has found nothing personal. A good recommender must beat popularity by a clear
          margin.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built collaborative filtering from the neighborhood intuition to the latent-factor model, handled
          implicit feedback and cold start, and learned to evaluate the ranking rather than the rating.
        </P>
        <P>
          Collaborative filtering recommends from the interaction matrix alone, betting that similar users
          agree. Neighborhood methods are the intuitive baseline; matrix factorization scales it by learning
          short user and item vectors whose dot product predicts preference. Real systems contend with implicit
          feedback and cold start, often blending in content features, and they are judged by ranking metrics
          and ultimately online experiments. It is matrix factorization, put to work on what to watch next.
        </P>
        <Warn title="The one thing to remember">
          You can recommend well knowing nothing about the items - just factor the who-liked-what matrix into
          latent tastes, and a dot product tells you what comes next.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
