// lessons/learning-theory.jsx — Module 04-06 - Learning Theory (VC Dimension, PAC Learning).
// Full on-site flagship lesson. Loaded by /learn/ml-theory/learning-theory/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Why minimizing training error generalizes: the
// generalization gap, Hoeffding, VC dimension and capacity, the PAC bound, and what it all implies.

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
            Here is the question at the foundation of machine learning: why should a model that fits the
            training data work on data it has never seen? It is not obvious - you could always memorize the
            training set and learn nothing. Learning theory makes the conditions under which generalization
            is guaranteed precise, and in doing so it explains overfitting, the value of more data, and the
            cost of model complexity.
          </P>
          <P>
            We build the generalization gap, bound it for a single hypothesis, extend it to whole hypothesis
            classes via the VC dimension, state the PAC learning guarantee, and read off what it tells you to
            actually do.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The gap ── */}
      <LessonSection n="0" title="Train Error Is Not Test Error" tag="// THE GENERALIZATION GAP">
        <P>
          We minimize error on a training sample, but we care about the true error over the whole
          distribution. The difference is the generalization gap. Learning is only possible if we can bound
          that gap - guarantee that low training error implies low true error.
        </P>
        <MathBlock>{`\\text{gap} = \\underbrace{R(h)}_{\\text{true error}} - \\underbrace{\\hat{R}(h)}_{\\text{train error}}`}</MathBlock>
      </LessonSection>

      {/* ── Part 1 — One hypothesis ── */}
      <LessonSection n="1" title="A Single Hypothesis" tag="// HOEFFDING">
        <P>
          For one fixed hypothesis, training error is an average of independent 0/1 mistakes, so it
          concentrates around the true error. Hoeffding's inequality says the gap exceeds
          <MathInline>{`\\varepsilon`}</MathInline> with probability shrinking exponentially in the sample
          size <MathInline>{`n`}</MathInline>. More data, tighter estimate.
        </P>
        <MathBlock>{`\\Pr\\big[\\,|R(h) - \\hat{R}(h)| > \\varepsilon\\,\\big] \\le 2e^{-2n\\varepsilon^2}`}</MathBlock>
        <Warn title="But you do not test one hypothesis">
          This bound is for a hypothesis chosen before seeing the data. Training searches over many
          hypotheses and picks the one that looks best on the sample - so by chance some will look good. The
          bound must account for the size of the search, or it lies.
        </Warn>
      </LessonSection>

      {/* ── Part 2 — VC dimension ── */}
      <LessonSection n="2" title="Capacity and the VC Dimension" tag="// HOW EXPRESSIVE">
        <P>
          The right measure of a model class's complexity is not its number of parameters but its capacity:
          how many points it can fit no matter how they are labeled. The VC dimension is the largest set of
          points the class can shatter - label in every possible way. A linear classifier in the plane has
          VC dimension 3; it can realize any labeling of 3 points but not all labelings of 4.
        </P>
        <KeyInsight title="Capacity, not parameter count">
          A high-capacity class can fit anything, including noise, so fitting it tells you little. The VC
          dimension captures this precisely - it is the effective number of degrees of freedom, and it, not
          the raw parameter count, controls how much data you need.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — The bound ── */}
      <LessonSection n="3" title="The Generalization Bound" tag="// PAC LEARNING">
        <P>
          Putting it together gives a Probably Approximately Correct guarantee: with high probability, the
          true error is at most the training error plus a term that grows with the VC dimension
          <MathInline>{`d`}</MathInline> and shrinks with the sample size <MathInline>{`n`}</MathInline>.
        </P>
        <MathBlock>{`R(h) \\le \\hat{R}(h) + O\\!\\left(\\sqrt{\\frac{d\\,\\log(n/d) + \\log(1/\\delta)}{n}}\\right)`}</MathBlock>
        <P>
          Read it as a tug of war. The first term wants a rich model that fits the data; the second penalizes
          richness. Minimizing the sum - structural risk minimization - is exactly the bias-complexity
          tradeoff, now with a theorem behind it.
        </P>
      </LessonSection>

      {/* ── Part 4 — Implications ── */}
      <LessonSection n="4" title="What It Tells You to Do" tag="// THE PRACTICAL READ">
        <P>
          The bound is loose in practice, but its <em>shape</em> is the lesson. Need to fit a more complex
          model? Get more data - the penalty falls like <MathInline>{`\\sqrt{d/n}`}</MathInline>. Stuck with
          little data? Use a lower-capacity model or add regularization to shrink effective capacity.
          Overfitting is the gap term dominating; that is when train and test diverge.
        </P>
        <CodeBlock lang="python">{`# the sample complexity to reach error eps scales ~ VC-dim / eps^2
# double the model capacity -> need roughly double the data for the same guarantee
n_needed = lambda d, eps, delta: (d + np.log(1/delta)) / eps**2`}</CodeBlock>
        <TryThis title="Watch capacity bite">
          Fit polynomials of increasing degree to a small noisy dataset and plot train vs test error. Train
          error falls monotonically; test error turns up as capacity outruns the data. You are watching the
          generalization bound's two terms trade places in real time.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You saw why generalization needs a guarantee, bounded the gap for one hypothesis with Hoeffding,
          measured a model class's capacity with the VC dimension, and assembled the PAC bound that ties
          true error to training error, capacity, and sample size.
        </P>
        <P>
          Learning is possible because the gap between training and true error can be bounded - by the sample
          size and the model class's capacity, measured by the VC dimension rather than parameter count. The
          PAC bound formalizes the bias-complexity tradeoff: richer models fit better but need more data to
          trust. It is the theory beneath every practical instinct about overfitting, regularization, and the
          value of data.
        </P>
        <Warn title="The one thing to remember">
          Low training error only means low true error when your model's capacity is small relative to your
          data - that ratio, not the fit alone, is what generalization rests on.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
