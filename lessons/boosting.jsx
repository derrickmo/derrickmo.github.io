// lessons/boosting.jsx — Module 02-04 - Gradient Boosting and AdaBoost.
// Full on-site flagship lesson. Loaded by /learn/supervised-learning/boosting/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Build an ensemble sequentially, each model fixing the
// last one's mistakes: from fitting residuals to gradient boosting, shrinkage, and XGBoost.

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
            A single decision tree is weak - too shallow and it underfits, too deep and it overfits.
            Boosting turns a crowd of weak trees into one of the strongest models in all of tabular
            machine learning by training them in sequence, each one fixing the mistakes of those before
            it. Gradient boosting, in the form of XGBoost and LightGBM, still wins a large share of
            structured-data competitions.
          </P>
          <P>
            We will see why boosting differs from bagging, build the residual-fitting idea, generalize it
            to gradient boosting on any loss, add the shrinkage that makes it work, and arrive at the
            modern boosted-tree recipe.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Bagging vs boosting ── */}
      <LessonSection n="0" title="Sequential, Not Parallel" tag="// BAGGING VS BOOSTING">
        <P>
          Random forests reduce variance by averaging many independent deep trees trained in parallel.
          Boosting does the opposite: it grows shallow trees in sequence, where each new tree is trained
          specifically on what the current ensemble still gets wrong. Bagging fights variance; boosting
          fights bias by relentlessly chipping away at the residual error.
        </P>
      </LessonSection>

      {/* ── Part 1 — Fit the residuals ── */}
      <LessonSection n="1" title="Fit the Residuals" tag="// THE CORE IDEA">
        <P>
          Start with a constant prediction. Compute how far off it is on each example - the residuals -
          and train a small tree to predict those residuals. Add that tree (scaled down) to the model and
          repeat. Each round, the model's predictions creep toward the truth.
        </P>
        <MathBlock>{`F_m(x) = F_{m-1}(x) + \\nu\\, h_m(x), \\qquad h_m \\approx (y - F_{m-1}(x))`}</MathBlock>
        <CodeBlock lang="python">{`import numpy as np
F = np.full_like(y, y.mean())              # start with the mean
trees = []
for _ in range(M):
    residual = y - F                       # what's left to explain
    h = fit_tree(X, residual, max_depth=3) # a weak learner
    F = F + lr * h.predict(X)              # shrink and add
    trees.append(h)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 2 — Gradient boosting ── */}
      <LessonSection n="2" title="Gradient Boosting" tag="// RESIDUALS ARE GRADIENTS">
        <P>
          The leap: for squared-error loss, the residual <MathInline>{`y - F`}</MathInline> is exactly the
          negative gradient of the loss with respect to the prediction. So "fit the residuals" is really
          "fit the negative gradient" - and that generalizes to <em>any</em> differentiable loss. Boosting
          becomes gradient descent in function space, taking a step by adding a tree that points downhill.
        </P>
        <MathBlock>{`h_m \\approx -\\frac{\\partial \\mathcal{L}(y, F)}{\\partial F}\\Big|_{F = F_{m-1}}`}</MathBlock>
        <KeyInsight title="Gradient descent, but in function space">
          Ordinary gradient descent nudges parameters; gradient boosting nudges the whole function by
          adding a model that approximates the loss's negative gradient. This is why you can boost on log
          loss for classification, quantile loss for intervals, or any loss you like - just plug in its
          gradient.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — AdaBoost ── */}
      <LessonSection n="3" title="AdaBoost" tag="// REWEIGHT THE HARD CASES">
        <P>
          AdaBoost, the original boosting algorithm, frames the same idea differently: after each weak
          learner, it increases the weight of the examples that were misclassified so the next learner
          focuses on them, then combines the learners weighted by their accuracy. It is gradient boosting
          on an exponential loss - the reweighting falls out of that gradient.
        </P>
        <CodeBlock lang="python">{`w = np.ones(n) / n                         # example weights
for _ in range(M):
    h = fit_weighted_stump(X, y, w)
    err = (w * (h.predict(X) != y)).sum()
    alpha = 0.5 * np.log((1 - err) / err)  # learner's vote
    w *= np.exp(-alpha * y * h.predict(X)) # up-weight the mistakes
    w /= w.sum()`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Regularization ── */}
      <LessonSection n="4" title="Why It Does Not Overfit" tag="// SHRINKAGE + DEPTH">
        <P>
          Boosting will memorize the training set if you let it, so three knobs keep it honest: a small
          learning rate (shrinkage) so each tree contributes a little, shallow trees so each is weak, and
          row/column subsampling so trees are decorrelated. XGBoost adds an explicit regularization term on
          tree complexity. Together these make boosted trees both powerful and controllable.
        </P>
        <MathBlock>{`\\mathcal{L} = \\sum_i \\ell(y_i, F(x_i)) + \\sum_m \\Omega(h_m), \\qquad \\Omega = \\gamma T + \\tfrac12 \\lambda \\|w\\|^2`}</MathBlock>
        <TryThis title="Trade rate for rounds">
          Halve the learning rate and double the number of trees. Test accuracy usually improves - many
          tiny steps generalize better than a few big ones. That rate-versus-rounds trade is the single
          most important tuning decision in gradient boosting.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You built boosting from the residual-fitting idea up: a sequence of weak trees, each correcting
          the last, generalized to gradient boosting on any loss, with AdaBoost as the exponential-loss
          special case and shrinkage plus shallow trees as the regularizers.
        </P>
        <P>
          Boosting grows weak learners sequentially, each fitting the negative gradient of the loss -
          gradient descent in function space. AdaBoost reweights the hard examples; modern gradient boosting
          fits residuals with shallow trees, a small learning rate, subsampling, and explicit complexity
          penalties. The result, XGBoost and friends, remains the model to beat on tabular data.
        </P>
        <Warn title="The one thing to remember">
          Bagging averages strong learners to cut variance; boosting chains weak ones to cut bias by chasing
          the gradient of the loss, one small step at a time.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
