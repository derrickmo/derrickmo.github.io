// lessons/mc-td.jsx — Module 14-02 - Monte Carlo and Temporal-Difference Learning.
// Full on-site flagship lesson. Loaded by /learn/reinforcement-learning/mc-td/index.html
// AFTER lesson-app.jsx. Sets __DM_LESSON_CONTENT. Learning values from experience without a
// model: Monte Carlo waits for the full return; TD bootstraps from its own next estimate.
// We implement both on a random walk and compare bias, variance, and convergence.

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
            Dynamic programming can solve a Markov decision process - but only if you already
            know its transition probabilities and rewards. The interesting case is when you do
            not, and must learn the value of states purely from experience. Two ideas make that
            possible, and the tension between them runs through all of reinforcement learning.
          </P>
          <P>
            Monte Carlo learns by playing whole episodes and averaging the actual returns.
            Temporal-difference learning updates after every single step, bootstrapping from its
            own current guess of the next state's value. We build both on a simple random walk and
            watch how they trade bias against variance.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Setup ── */}
      <LessonSection n="0" title="Setup" tag="// A RANDOM WALK">
        <P>
          Our environment is a classic five-state random walk. You start in the middle and step
          left or right with equal probability until you fall off either end; the right end pays
          1, the left pays 0. The true value of each state is its probability of eventually
          reaching the right - a smooth ramp from 1/6 to 5/6 - which gives us ground truth to
          measure error against.
        </P>
        <CodeBlock lang="python">{`import numpy as np
np.random.seed(0)

N = 5                              # states 1..5, plus terminals 0 and 6
true_V = np.arange(1, N + 1) / (N + 1)   # [1/6, ..., 5/6]

def episode():
    s = 3                          # start in the middle
    traj = []
    while 0 < s < N + 1:
        a = np.random.choice([-1, 1])
        traj.append(s)
        s += a
    reward = 1.0 if s == N + 1 else 0.0    # reward only at the right end
    return traj, reward`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Monte Carlo ── */}
      <LessonSection n="1" title="Monte Carlo" tag="// WAIT FOR THE RETURN">
        <P>
          Monte Carlo waits until an episode ends, computes the actual return
          <MathInline>{`G`}</MathInline> that followed each visited state, and nudges that state's
          value toward it. No model, no bootstrapping - just the real outcome.
        </P>
        <MathBlock>{`V(s) \\leftarrow V(s) + \\alpha\\,\\big[\\,G - V(s)\\,\\big]`}</MathBlock>
        <CodeBlock lang="python">{`def monte_carlo(alpha=0.02, episodes=200):
    V = np.full(N + 2, 0.5); V[0] = V[N + 1] = 0
    for _ in range(episodes):
        traj, G = episode()              # undiscounted: return = final reward
        for s in traj:
            V[s] += alpha * (G - V[s])   # update toward the realized return
    return V[1:N + 1]`}</CodeBlock>
        <P>
          The target <MathInline>{`G`}</MathInline> is unbiased - it is a real sample of what
          happened - but noisy, because a single episode's outcome depends on the whole random
          path. Estimates jump around and settle slowly.
        </P>
      </LessonSection>

      {/* ── Part 2 — Temporal Difference ── */}
      <LessonSection n="2" title="Temporal Difference" tag="// BOOTSTRAP EACH STEP">
        <P>
          TD learning does not wait. After a single transition it updates using the reward plus
          its own current estimate of the next state's value. That substitution - guessing the
          rest of the return instead of measuring it - is called bootstrapping.
        </P>
        <MathBlock>{`V(s) \\leftarrow V(s) + \\alpha\\,\\big[\\,\\underbrace{r + \\gamma V(s') - V(s)}_{\\text{TD error } \\delta}\\,\\big]`}</MathBlock>
        <CodeBlock lang="python">{`def td0(alpha=0.05, gamma=1.0, episodes=200):
    V = np.full(N + 2, 0.5); V[0] = V[N + 1] = 0
    for _ in range(episodes):
        s = 3
        while 0 < s < N + 1:
            a = np.random.choice([-1, 1]); s2 = s + a
            r = 1.0 if s2 == N + 1 else 0.0
            V[s] += alpha * (r + gamma * V[s2] - V[s])   # bootstrap on V[s2]
            s = s2
    return V[1:N + 1]`}</CodeBlock>
        <KeyInsight title="The TD error is the heartbeat of RL">
          That bracket, <MathInline>{`\\delta = r + \\gamma V(s') - V(s)`}</MathInline>, is the
          single most important quantity in reinforcement learning. It is the surprise: how much
          better or worse things turned out than expected. Q-learning, SARSA, actor-critic, and
          deep RL are all variations on chasing this error.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Compare ── */}
      <LessonSection n="3" title="Bias and Variance" tag="// RUN BOTH, MEASURE">
        <P>
          Run both and compare the root-mean-square error against the true values over training.
          TD's target uses its own estimates, so early on it is biased - but each update has low
          variance, so it learns fast and steadily. MC is unbiased but high-variance, so it is
          noisier and slower here.
        </P>
        <CodeBlock lang="python">{`def rms(V): return np.sqrt(np.mean((V - true_V) ** 2))

print("MC  RMS:", rms(monte_carlo()))   # unbiased target, higher variance
print("TD  RMS:", rms(td0()))           # biased (bootstraps), lower variance`}</CodeBlock>
        <P>
          On this task - and most tasks - TD reaches a good estimate with far less data. The
          bootstrap that makes it biased is exactly what makes it efficient: it reuses what it has
          already learned about the next state instead of waiting for a full noisy rollout.
        </P>
        <TryThis title="Find the bridge">
          MC and TD are the two ends of one dial. TD(lambda) with eligibility traces blends them:
          lambda = 0 is the one-step TD here, lambda = 1 is Monte Carlo. Intermediate values
          usually beat both - try implementing the trace and sweeping lambda.
        </TryThis>
      </LessonSection>

      {/* ── Part 4 — Why bootstrapping works ── */}
      <LessonSection n="4" title="Why Bootstrapping Works" tag="// THE BELLMAN BACKUP">
        <P>
          Bootstrapping is not a hack - it is the Bellman equation applied to samples. The true
          value satisfies a consistency condition: a state's value equals the expected reward plus
          the discounted value of the next state.
        </P>
        <MathBlock>{`V^\\pi(s) = \\mathbb{E}\\big[\\,r + \\gamma V^\\pi(s')\\,\\big]`}</MathBlock>
        <P>
          TD turns that expectation into a stochastic update: each transition is one sample of the
          right-hand side, and nudging <MathInline>{`V(s)`}</MathInline> toward it makes the
          estimate satisfy the equation on average. Repeat over enough transitions and it converges
          to the true values - this is sampled dynamic programming.
        </P>
        <Aside title="From prediction to control">
          We estimated the value of a fixed policy (prediction). Swap state-values for
          action-values and act greedily on them, and the very same TD update becomes Q-learning
          and SARSA - control, learning how to act, not just how to evaluate.
        </Aside>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You implemented Monte Carlo and TD(0) on a random walk, compared their bias and variance,
          and saw that bootstrapping is the Bellman equation applied to samples.
        </P>
        <P>
          Monte Carlo learns from complete returns: unbiased but high-variance and slow. Temporal
          difference learns from one step by bootstrapping on its own next estimate: biased but
          low-variance and fast. The TD error <MathInline>{`r + \\gamma V(s') - V(s)`}</MathInline>
          is the central learning signal of reinforcement learning, and TD(lambda) interpolates the
          whole spectrum between the two. Every value-based RL algorithm you will meet is built on
          this update.
        </P>
        <Warn title="The one thing to remember">
          You do not need to see the end of the story to learn from it. Bootstrapping lets you
          improve an estimate using a later estimate - the idea that makes online reinforcement
          learning possible.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
