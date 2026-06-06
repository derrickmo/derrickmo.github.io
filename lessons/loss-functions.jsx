// lessons/loss-functions.jsx — Module 05-04 - Loss Functions Deep Dive.
// Full on-site flagship lesson. Loaded by /learn/neural-nets/loss-functions/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. The loss defines what "good" means: regression
// losses (MSE/MAE/Huber), classification (cross-entropy and why not MSE), margin and focal.

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
            A model does not know what you want - the loss function tells it. It is the single
            number training drives down, and choosing it is choosing what "good" means. The
            same network with a different loss learns a different behavior. This lesson is a
            tour of the losses you will actually reach for, why each fits its task, and the
            one gradient fact that explains why classification uses cross-entropy, not squared
            error.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// THE ROLE OF A LOSS">
        <P>
          A loss maps a prediction and a target to a single non-negative number, and its
          gradient is what flows back through the network. So two things matter: what the loss
          rewards, and how its gradient behaves. We will judge every loss on both.
        </P>
        <CodeBlock lang="python">{`import numpy as np
# y    : ground truth
# yhat : model output (a number for regression, a probability for classification)`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Regression ── */}
      <LessonSection n="1" title="Regression Losses" tag="// MSE, MAE, HUBER">
        <P>
          For predicting a continuous value, mean squared error is the default: it penalizes
          the square of the residual, so big mistakes hurt a lot. That sensitivity is a
          double-edged sword - one outlier can dominate the loss. Mean absolute error is
          robust to outliers but has a constant gradient that ignores how wrong you are.
        </P>
        <MathBlock>{`\\text{MSE} = \\tfrac1n\\sum (y - \\hat{y})^2, \\qquad \\text{MAE} = \\tfrac1n\\sum |y - \\hat{y}|`}</MathBlock>
        <P>
          Huber loss is the practical compromise: quadratic for small errors (smooth, informative
          gradient) and linear for large ones (robust to outliers), switching at a threshold
          <MathInline>{`\\delta`}</MathInline>.
        </P>
        <CodeBlock lang="python">{`def huber(y, yhat, delta=1.0):
    r = np.abs(y - yhat)
    quad = 0.5 * r**2
    lin  = delta * (r - 0.5 * delta)
    return np.where(r <= delta, quad, lin).mean()`}</CodeBlock>
        <KeyInsight title="The gradient tells the story">
          MSE's gradient is proportional to the error, so it pushes harder the more wrong it
          is - great until an outlier yanks the model. MAE's gradient is constant, so it
          shrugs off outliers but also barely accelerates on big errors. Huber gets both
          behaviors in their respective regimes.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 2 — Classification ── */}
      <LessonSection n="2" title="Cross-Entropy" tag="// THE CLASSIFICATION DEFAULT">
        <P>
          For classification the model outputs a probability distribution (via softmax), and
          cross-entropy measures how much probability it put on the true class. It punishes
          confident wrong answers severely - being 99% sure of the wrong label costs far more
          than being unsure.
        </P>
        <MathBlock>{`\\mathcal{L} = -\\sum_c y_c \\log \\hat{p}_c`}</MathBlock>
        <CodeBlock lang="python">{`def cross_entropy(p, y):       # p: predicted probs, y: true class index
    return -np.log(p[y] + 1e-12)`}</CodeBlock>
        <P>
          Why not just use MSE on the probabilities? Because of the gradient. Pair softmax with
          cross-entropy and the gradient collapses to the beautifully simple
          <MathInline>{`\\hat{p} - y`}</MathInline> - predicted minus actual - which never
          saturates. Pair a sigmoid or softmax with MSE and the gradient picks up an extra
          factor that vanishes exactly when the model is confidently wrong, stalling learning
          right when you most need it to move.
        </P>
        <MathBlock>{`\\frac{\\partial \\mathcal{L}_{\\text{CE}}}{\\partial z} = \\hat{p} - y`}</MathBlock>
        <Warn title="Confidently wrong should hurt">
          The reason cross-entropy is the classification standard is not tradition - it is that
          its gradient stays strong when the model is confidently wrong, exactly the case MSE
          handles worst. Match the loss to the output: softmax goes with cross-entropy.
        </Warn>
      </LessonSection>

      {/* ── Part 3 — Margin and imbalance ── */}
      <LessonSection n="3" title="Margin and Focal Losses" tag="// SPECIALIST LOSSES">
        <P>
          Some tasks want more than "be right" - they want "be right with room to spare." Hinge
          loss, behind the SVM, penalizes predictions that are correct but inside a margin,
          pushing the boundary away from the data.
        </P>
        <MathBlock>{`\\mathcal{L}_{\\text{hinge}} = \\max(0,\\ 1 - y\\,\\hat{y}), \\quad y \\in \\{-1, +1\\}`}</MathBlock>
        <P>
          And when classes are wildly imbalanced - think detection, where background dwarfs
          objects - focal loss down-weights the easy, already-correct examples so the rare hard
          ones drive learning. It multiplies cross-entropy by a factor that shrinks as
          confidence on the true class grows.
        </P>
        <CodeBlock lang="python">{`def focal(p_true, gamma=2.0):
    return -((1 - p_true) ** gamma) * np.log(p_true + 1e-12)
# easy examples (p_true near 1) contribute almost nothing`}</CodeBlock>
        <Aside title="The loss encodes the priority">
          Hinge says "leave a margin." Focal says "ignore what you already get right." Each
          loss is a compact statement of what the task cares about - which is why picking the
          loss is really picking the objective.
        </Aside>
      </LessonSection>

      {/* ── Part 4 — Evaluation ── */}
      <LessonSection n="4" title="See the Gradients" tag="// MSE VS CE">
        <P>
          The decisive comparison: a sigmoid output that is confidently wrong (target 1,
          prediction 0.02). Look at the gradient each loss sends back.
        </P>
        <CodeBlock lang="python">{`p, y = 0.02, 1.0                    # confidently wrong

# cross-entropy + sigmoid: gradient wrt logit = p - y
ce_grad = p - y                     # = -0.98  -> strong push

# MSE + sigmoid: gradient wrt logit = (p - y) * p * (1 - p)
mse_grad = (p - y) * p * (1 - p)    # = -0.019 -> nearly zero, stalls
print(ce_grad, mse_grad)`}</CodeBlock>
        <P>
          Cross-entropy sends a full-strength correction; MSE's gradient is throttled to almost
          nothing by the <MathInline>{`p(1-p)`}</MathInline> term, precisely when the model is
          most wrong. That one comparison is why classification networks are trained with
          cross-entropy.
        </P>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You toured the losses that matter - MSE, MAE, Huber for regression; cross-entropy for
          classification; hinge and focal for margins and imbalance - judging each by what it
          rewards and how its gradient behaves.
        </P>
        <P>
          The loss defines the objective. Regression losses trade outlier-robustness against
          gradient informativeness, with Huber bridging them. Classification uses cross-entropy
          because, paired with softmax, its gradient is the clean, non-saturating
          <MathInline>{`\\hat{p} - y`}</MathInline> - while MSE stalls on confident mistakes.
          Specialist losses like hinge and focal encode task-specific priorities. Choosing the
          loss is choosing what your model will try to be.
        </P>
        <Warn title="The one thing to remember">
          Match the loss to the output and the task, and watch its gradient - a loss is only as
          good as the gradient it sends back.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
