// lessons/model-based-rl.jsx — Module 14-08 - Model-Based RL and MCTS.
// Full on-site flagship lesson. Loaded by /learn/reinforcement-learning/model-based-rl/index.html
// AFTER lesson-app.jsx. Sets __DM_LESSON_CONTENT. Plan with a model instead of only reacting:
// Dyna's imagined updates, Monte Carlo Tree Search with UCT, and the AlphaZero connection.

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
            Model-free agents learn by trial and error in the real world, which is slow and sometimes
            dangerous. Model-based agents do something more powerful: they build a model of how the world
            responds, then <em>think</em> - planning ahead by simulating possible futures before acting.
            It is the difference between memorizing reactions and reasoning about consequences, and it is
            how AlphaGo beat the best humans at Go.
          </P>
          <P>
            We will see how a learned model lets an agent plan for free with Dyna, then build Monte Carlo
            Tree Search - the planning algorithm behind AlphaGo - and finish at AlphaZero, where a neural
            network guides the search.
          </P>
        </div>
      </section>

      {/* ── Part 0 — Model-free vs model-based ── */}
      <LessonSection n="0" title="Plan, Do Not Just React" tag="// WHY A MODEL">
        <P>
          A model predicts the next state and reward for an action: <MathInline>{`(s, a) \\to (s', r)`}</MathInline>.
          Given one, an agent can simulate trajectories in its head - trying actions, seeing imagined
          outcomes - and choose without paying for real-world mistakes. The catch is that the plan is only
          as good as the model; errors compound over a long imagined rollout.
        </P>
      </LessonSection>

      {/* ── Part 1 — Dyna ── */}
      <LessonSection n="1" title="Dyna: Learn and Plan Together" tag="// IMAGINED UPDATES">
        <P>
          Dyna blends the two worlds. After each real step the agent updates its value estimate (as in
          Q-learning) and also learns the model. Then, between real steps, it replays imagined transitions
          drawn from that model, running extra value updates for free. A handful of planning steps per real
          step can slash the experience needed to solve a task.
        </P>
        <CodeBlock lang="python">{`model[s, a] = (r, s2)                          # learn the model
Q[s, a] += alpha * (r + g * Q[s2].max() - Q[s, a])   # real update
for _ in range(n):                            # plan
    (sp, ap), (rp, s2p) = sample(model)
    Q[sp, ap] += alpha * (rp + g * Q[s2p].max() - Q[sp, ap])`}</CodeBlock>
        <Aside title="Planning is just more updates">
          Dyna shows the deep point: planning and learning are the same operation - a value backup -
          applied to imagined rather than real experience. A perfect model would let you solve the task
          entirely in imagination.
        </Aside>
      </LessonSection>

      {/* ── Part 2 — MCTS ── */}
      <LessonSection n="2" title="Monte Carlo Tree Search" tag="// LOOKAHEAD THAT SCALES">
        <P>
          For huge decision trees - chess, Go - you cannot plan exhaustively. MCTS grows a search tree
          selectively toward promising lines through four repeated steps: select a path down the tree by
          a bandit rule, expand a new node, simulate a rollout to estimate its value, and back up that
          value along the path. Promising branches get explored more; the rest are pruned by neglect.
        </P>
        <MathBlock>{`\\text{UCT}(s, a) = Q(s, a) + c\\,\\sqrt{\\frac{\\ln N(s)}{N(s, a)}}`}</MathBlock>
        <CodeBlock lang="python">{`def mcts(root, iters=1000):
    for _ in range(iters):
        node = select(root)        # walk down by UCT (exploit + explore)
        child = expand(node)       # add a new action
        value = rollout(child)     # simulate to an outcome
        backup(child, value)       # propagate up the path
    return best_child(root).action  # most-visited action`}</CodeBlock>
        <KeyInsight title="UCB, applied to a tree">
          The selection rule is the bandit UCB formula at every node: balance the action's estimated value
          against how little it has been tried. MCTS is, in effect, a bandit problem stacked recursively
          down a tree - which is why exploration theory shows up at the heart of game-playing AI.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Backup ── */}
      <LessonSection n="3" title="The Search Loop" tag="// SELECT, EXPAND, SIM, BACKUP">
        <P>
          Each iteration sharpens the estimates. The backup step averages the simulated outcome into every
          node on the path, so a state's value is the mean result of all searches that passed through it.
          Run enough iterations and the visit counts at the root concentrate on the genuinely best move.
        </P>
        <CodeBlock lang="python">{`def backup(node, value):
    while node is not None:
        node.N += 1
        node.W += value             # total value
        node.Q = node.W / node.N    # mean value
        value = -value              # flip for the opponent in 2-player games
        node = node.parent`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — AlphaZero ── */}
      <LessonSection n="4" title="AlphaZero" tag="// LET A NETWORK GUIDE THE SEARCH">
        <P>
          Random rollouts are weak. AlphaZero replaces them with a neural network that, given a position,
          predicts a policy (which moves look good) and a value (who is winning). The policy biases which
          branches MCTS explores; the value replaces the rollout. The improved moves MCTS finds then become
          training targets for the network - search and learning bootstrapping each other.
        </P>
        <CodeBlock lang="python">{`# AlphaZero MCTS: policy prior P guides exploration, value v replaces rollout
def puct(node, a):
    return node.Q[a] + c * node.P[a] * (node.N ** 0.5) / (1 + node.Na[a])
# train net on (state -> visit_counts, game_outcome): self-play improves both`}</CodeBlock>
        <TryThis title="Watch the tree concentrate">
          Print the root's visit counts as iterations grow. Early on they are spread out; with more search
          they pile onto one or two moves. That concentration is the search discovering the best action -
          and it is exactly the signal AlphaZero distills back into its network.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You saw model-based RL plan with a learned model (Dyna), built Monte Carlo Tree Search with its
          UCB-driven selection and value backups, and reached AlphaZero, where a network guides the search
          and the search teaches the network.
        </P>
        <P>
          Model-based RL turns experience into a model and a model into a plan. Dyna reveals planning as
          value backups on imagined data; MCTS grows a search tree selectively using the bandit UCB rule;
          AlphaZero swaps random rollouts for a learned policy-and-value network, closing a loop where
          search and learning improve each other. Planning is what lets an agent be smart with little data -
          and it is the lineage behind the strongest game-playing systems.
        </P>
        <Warn title="The one thing to remember">
          A model lets you think before you act - and planning is just running your value updates on
          imagined experience instead of real.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
