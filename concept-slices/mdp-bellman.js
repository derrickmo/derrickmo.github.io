// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/mdp-bellman/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "mdp-bellman": {
    "id": "mdp-bellman",
    "name": "MDPs & Bellman Backup",
    "area": "Reinforcement Learning",
    "summary": "Sequential decision-making under uncertainty; the Bellman equation defines optimal value recursively.",
    "tex": "V^*(s) = \\max_a \\bigl[ R(s,a) + \\gamma\\, \\mathbb{E}_{s'} V^*(s') \\bigr]",
    "leadsTo": [
      "q-learning",
      "policy-gradient",
      "actor-critic",
      "dqn",
      "sarsa",
      "td-lambda",
      "dyna-q",
      "distributional-rl",
      "successor-representation",
      "max-entropy-rl",
      "dynamic-programming"
    ],
    "prereqs": []
  },
  "q-learning": {
    "id": "q-learning",
    "name": "Q-Learning / TD",
    "area": "Reinforcement Learning",
    "summary": "Sample the Bellman backup from experience — model-free RL's foundational update.",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "sarsa",
      "td-lambda",
      "dyna-q",
      "double-q-learning",
      "distributional-rl"
    ]
  },
  "policy-gradient": {
    "id": "policy-gradient",
    "name": "Policy Gradient (REINFORCE)",
    "area": "Reinforcement Learning",
    "summary": "Push up the log-probability of high-reward actions, push down low-reward ones — the foundation of every modern policy-based RL method, including PPO, GRPO, and RLHF.",
    "tex": "\\nabla_\\theta J = \\mathbb{E}_{\\pi_\\theta}\\bigl[ \\nabla_\\theta \\log \\pi_\\theta(a \\mid s) \\cdot (R - b) \\bigr]",
    "prereqs": [
      "mdp-bellman",
      "gradient-descent"
    ],
    "leadsTo": [
      "actor-critic",
      "reward-model",
      "dpo",
      "ppo",
      "max-entropy-rl"
    ]
  },
  "actor-critic": {
    "id": "actor-critic",
    "name": "Actor-Critic",
    "area": "Reinforcement Learning",
    "summary": "Train a value function (critic) and a policy (actor) together: the critic's bootstrapped TD error is the low-variance advantage that drives the policy gradient. The workhorse behind A2C, A3C, PPO, and RLHF.",
    "tex": "\\delta_t = r_t + \\gamma V(s_{t+1}) - V(s_t); \\quad \\theta \\leftarrow \\theta + \\alpha\\, \\delta_t\\, \\nabla_\\theta \\log \\pi_\\theta(a_t \\mid s_t)",
    "prereqs": [
      "policy-gradient",
      "mdp-bellman"
    ],
    "leadsTo": [
      "ppo",
      "gae"
    ]
  },
  "dqn": {
    "id": "dqn",
    "name": "Deep Q-Network (DQN)",
    "area": "Reinforcement Learning",
    "summary": "Approximate Q(s,a) with a neural network and stabilize the bootstrapped training with two tricks — an experience replay buffer (decorrelate samples) and a periodically synced target network (a fixed bootstrap target). The algorithm that learned Atari from pixels.",
    "tex": "L(\\theta) = \\mathbb{E}\\Bigl[ \\bigl( r + \\gamma \\max_{a'} Q_{\\theta^-}(s',a') - Q_\\theta(s,a) \\bigr)^2 \\Bigr]",
    "prereqs": [
      "mdp-bellman",
      "backprop"
    ],
    "leadsTo": [
      "prioritized-replay"
    ]
  },
  "sarsa": {
    "id": "sarsa",
    "name": "SARSA & On-policy vs Off-policy TD",
    "area": "Reinforcement Learning",
    "summary": "Temporal-difference control comes in two flavors that differ only in the bootstrap target. SARSA is on-policy — it updates toward Q(s',a') for the action it will actually take, so it accounts for its own exploration and learns safer policies. Q-learning is off-policy — it updates toward max_a' Q(s',a'), learning the optimal greedy policy from any behavior, which is what makes replay and DQN possible. On Cliff Walking, SARSA takes the safe path and Q-learning the optimal cliff-edge path.",
    "tex": "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma\\,Q(s',a') - Q(s,a)\\,]",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": [
      "double-q-learning"
    ]
  },
  "td-lambda": {
    "id": "td-lambda",
    "name": "TD(λ) & Eligibility Traces",
    "area": "Reinforcement Learning",
    "summary": "A single mechanism that interpolates between one-step TD(0) and Monte-Carlo returns. An eligibility trace marks recently visited states (e(s) += 1, decaying by γλ each step); when a TD error δ occurs, every marked state is updated in proportion to its trace, spreading credit backward along the trajectory in one online pass. λ=0 is TD(0), λ=1 is Monte Carlo; intermediate λ usually learns fastest. The backward view equals the forward λ-return; GAE is its modern advantage-estimation descendant.",
    "tex": "\\delta_t = r_{t+1} + \\gamma V(s_{t+1}) - V(s_t);\\quad V(s) \\mathrel{+}= \\alpha\\,\\delta_t\\, e(s)",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": [
      "gae"
    ]
  },
  "dyna-q": {
    "id": "dyna-q",
    "name": "Dyna-Q & Model-Based RL",
    "area": "Reinforcement Learning",
    "summary": "Integrates learning, planning, and acting: the agent does ordinary Q-learning from real steps AND learns a one-step model (remembering (s,a)->(r,s')), then performs n planning updates per real step by replaying remembered transitions through the model. Planning propagates value across the state space without extra real experience, so Dyna-Q is far more sample-efficient than model-free Q-learning. The bridge between learning from experience and planning with a known model; experience replay is the same idea, and World Models / MuZero / Dreamer are its modern descendants. Risk: planning inside a wrong model learns the wrong thing.",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": []
  },
  "distributional-rl": {
    "id": "distributional-rl",
    "name": "Distributional RL (C51)",
    "area": "Reinforcement Learning",
    "summary": "Learn the full distribution of returns Z(s,a) instead of just its expectation. C51 represents Z as a categorical distribution over a fixed set of atoms and applies the distributional Bellman backup TZ = R + γZ(s'), projecting the shifted/scaled target back onto the atom support. Stochastic rewards make returns multimodal — a shape the scalar value (the mean) hides — enabling more stable learning and risk-aware decisions. Successors QR-DQN and IQN learn quantiles instead of fixed atoms.",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": []
  },
  "successor-representation": {
    "id": "successor-representation",
    "name": "Successor Representation",
    "area": "Reinforcement Learning",
    "summary": "M(s,s') is the expected discounted number of future visits to s' starting from s under a policy — equal to (I−γP)⁻¹. It factorizes value into dynamics and reward, V(s)=Σ_s' M(s,s')R(s'), so when the reward changes you recompute V instantly as M·R with no relearning of dynamics. Learned by TD just like a value function but bootstrapping one-hot occupancy. Sits between model-free and model-based RL; the deep version (successor features) enables transfer across reward functions, and predictive maps like it appear in hippocampal place/grid cells.",
    "tex": "M = (I - \\gamma P)^{-1},\\qquad V = M R",
    "prereqs": [
      "mdp-bellman",
      "markov"
    ],
    "leadsTo": []
  },
  "max-entropy-rl": {
    "id": "max-entropy-rl",
    "name": "Maximum-Entropy RL (Soft Value Iteration)",
    "area": "Reinforcement Learning",
    "summary": "Maximize expected reward PLUS policy entropy, weighted by a temperature α. This replaces the hard max in the Bellman equation with a soft log-sum-exp, V(s)=α·logΣ exp(Q(s,a)/α), and makes the optimal policy a Boltzmann distribution π(a|s)=softmax(Q(s,a)/α). The entropy bonus keeps exploration alive and yields robust policies; α→0 recovers ordinary value iteration and a greedy policy. The framework behind Soft Actor-Critic (SAC) and soft Q-learning, and kin to the KL-regularized objective of PPO/RLHF.",
    "tex": "V(s) = \\alpha \\log \\textstyle\\sum_a \\exp\\!\\big(Q(s,a)/\\alpha\\big)",
    "prereqs": [
      "mdp-bellman",
      "policy-gradient"
    ],
    "leadsTo": []
  },
  "dynamic-programming": {
    "id": "dynamic-programming",
    "name": "Dynamic Programming",
    "area": "Algorithms",
    "summary": "Solve a problem by combining optimal answers to overlapping subproblems, computed once and reused (memoized). Requires optimal substructure; turns exponential brute force into polynomial table-filling. The 0/1 knapsack table is canonical; the same idea drives edit distance, shortest paths, the Bellman equation, and Viterbi/CTC decoding.",
    "tex": "\\mathrm{dp}[i][c] = \\max\\bigl( \\mathrm{dp}[i{-}1][c],\\; \\mathrm{dp}[i{-}1][c - w_i] + v_i \\bigr)",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "dtw",
      "branch-and-bound"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "mdp-bellman": [
    {
      "kind": "demo",
      "slug": "gridworld-rl"
    },
    {
      "kind": "demo",
      "slug": "value-iteration"
    },
    {
      "kind": "demo",
      "slug": "policy-gradient"
    },
    {
      "kind": "demo",
      "slug": "actor-critic"
    },
    {
      "kind": "demo",
      "slug": "dqn"
    },
    {
      "kind": "demo",
      "slug": "sarsa-vs-qlearning"
    },
    {
      "kind": "demo",
      "slug": "td-lambda"
    },
    {
      "kind": "demo",
      "slug": "dyna-q"
    },
    {
      "kind": "demo",
      "slug": "distributional-rl"
    },
    {
      "kind": "demo",
      "slug": "successor-representation"
    },
    {
      "kind": "demo",
      "slug": "max-entropy-rl"
    },
    {
      "kind": "demo",
      "slug": "knapsack"
    },
    {
      "kind": "game",
      "slug": "snake-dqn"
    },
    {
      "kind": "game",
      "slug": "twenty48"
    },
    {
      "kind": "module",
      "slug": "reinforcement-learning"
    }
  ]
};
