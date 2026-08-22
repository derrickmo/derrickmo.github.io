// GENERATED from content/lessons/reinforcement-learning/model-based-rl.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/reinforcement-learning/model-based-rl/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "model-based-rl": {
    "interview": {
      "quickGrind": [
        {
          "q": "Model-based versus model-free, in one line?",
          "a": "Model-based learns the environment's dynamics and uses them to plan or to generate experience; model-free learns a value function or policy directly from real transitions."
        },
        {
          "q": "What is the main argument for model-based RL?",
          "a": "Sample efficiency. Real interaction is the expensive resource, and a learned model lets you produce unlimited simulated experience from a small amount of it."
        },
        {
          "q": "What is Dyna?",
          "a": "The minimal combination: after each real transition, update from it, then run k additional updates on transitions sampled from the learned model. Planning is literally just more updates."
        },
        {
          "q": "What is the failure mode of model-based methods?",
          "a": "Model bias. The policy optimizes against the model, so it finds and exploits the model's errors — a plan that is excellent in an imagined world and useless in the real one."
        },
        {
          "q": "How does MCTS choose which branch to explore?",
          "a": "UCT — UCB applied to a tree. Score each child by its mean value plus an exploration bonus proportional to sqrt(log N_parent / N_child), and descend the argmax."
        },
        {
          "q": "Name the four phases of MCTS.",
          "a": "Selection down the tree by UCT, expansion of a new leaf, evaluation of that leaf, and backup of the result along the visited path."
        },
        {
          "q": "What did AlphaGo use for the evaluation step?",
          "a": "A random rollout to the end of the game, blended with a learned value network. AlphaZero dropped the rollouts entirely and used the value network alone."
        },
        {
          "q": "What is the policy network for in AlphaZero?",
          "a": "It supplies the prior in the PUCT selection rule, focusing the search on plausible moves. Without it the branching factor makes deep search hopeless."
        },
        {
          "q": "What is the training signal in AlphaZero?",
          "a": "Self-play. The search's visit distribution is a better policy than the raw network, so the network is trained to imitate it, and the game outcome trains the value head."
        },
        {
          "q": "Why is search described as a policy improvement operator?",
          "a": "Because the searched policy is measurably better than the network alone. Training the network toward it and re-searching is policy iteration with search as the improvement step."
        },
        {
          "q": "What is MuZero's contribution?",
          "a": "It learns a model in a LATENT space trained only to predict reward, value and policy — not to reconstruct observations — so it works where the true dynamics are unknown or not worth modelling."
        },
        {
          "q": "When is planning not worth it?",
          "a": "When the model is hard to learn, when the action space is continuous and large, or when simulation is as expensive as reality. Then a model-free method with more real data is usually simpler and better."
        }
      ],
      "standard": [
        {
          "q": "Explain model bias and the ways people control it.",
          "a": "The core asymmetry is that a learned model is fitted on data from one distribution and then queried by an optimizer that is actively searching for the highest-value states it can find — which is precisely a search for wherever the model is most optimistic, and optimism and error are correlated because the errors are largest where the data is sparsest. So the planner exploits model error by construction, not by accident, and the symptom is a policy that achieves excellent imagined return and fails in the real environment. This is the same shape as reward hacking in RLHF and as the OOD-action problem in offline RL: an optimizer pointed at a learned proxy will find its weak points. The controls follow the mechanism. Model ensembles and probabilistic models let you measure disagreement and treat it as epistemic uncertainty — PETS plans through an ensemble and averages over sampled dynamics, so a trajectory only looks good if it looks good under most plausible models. Short rollouts bound the compounding: error grows with horizon, so generating five imagined steps from a real state is far safer than fifty, which is exactly what MBPO does — branch short model rollouts off real states rather than simulating whole episodes. Pessimism penalizes uncertainty explicitly, subtracting a term proportional to model disagreement so the planner avoids regions it cannot vouch for. And frequent replanning in a receding-horizon loop means only the first action of each plan is ever executed, so errors deep in the plan never get to act.",
          "deepDive": {
            "q": "Why does MuZero's approach sidestep some of this?",
            "a": "Because it never tries to be an accurate simulator. Its latent model is trained only so that unrolling it predicts the quantities the search consumes — reward, value and policy — so it is optimized for exactly what it is used for rather than for reconstruction. A pixel-accurate model wastes capacity on detail that does not affect decisions and can still be wrong about the parts that do; a value-equivalent model puts capacity where the decisions are. It does not remove exploitation of model error, but it removes a large class of irrelevant modelling effort and the failures that come with it."
          }
        },
        {
          "q": "Walk through MCTS in detail and say what each phase contributes.",
          "a": "Selection: from the root, repeatedly descend to the child maximizing a UCT score — the child's mean value plus c sqrt(log N_parent / N_child). The first term exploits, the second is an optimism bonus that decays as a child is visited, so the search concentrates on promising branches without permanently abandoning under-explored ones. This is the bandit machinery from the exploration lesson applied at every node, and it is why the tree grows asymmetrically: good lines get deep, bad ones stay shallow, which is the entire efficiency argument versus uniform-depth search. Expansion: on reaching a leaf that has been visited before, add its children. Evaluation: estimate the new leaf's value — historically by a random rollout to termination, which is unbiased but extremely high variance, and in AlphaZero by a learned value network, which is biased but vastly lower variance and much cheaper. Backup: propagate the value up the visited path, incrementing visit counts and updating means, so information from one deep evaluation improves every ancestor's estimate. Run this thousands of times and the visit distribution at the root becomes the policy — you play the most-visited move rather than the highest-mean one, because visit count is a more robust statistic than a mean that might rest on a single lucky evaluation. That choice is a small detail that matters and is a good thing to know.",
          "deepDive": {
            "q": "Why does AlphaZero use PUCT rather than plain UCT?",
            "a": "Because plain UCT's exploration term depends only on visit counts, which means with a branching factor in the hundreds the search spends its early budget sampling every legal move once, most of which are obviously bad. PUCT multiplies the exploration term by the policy network's prior for that move, so the search allocates visits in proportion to plausibility from the start. That prior is what makes deep search tractable at Go's branching factor, and it is the clearest illustration of learning and search being complementary rather than alternatives — the network narrows the tree, the search corrects the network."
          }
        },
        {
          "q": "Explain the AlphaZero loop and why it works.",
          "a": "One network with two heads takes a position and outputs a policy prior and a value estimate. Self-play games are generated where each move is chosen by running MCTS guided by that network, and the search's root visit distribution is recorded as the improved policy target while the eventual game result is recorded as the value target. The network is then trained to predict both — cross-entropy against the visit distribution, squared error against the outcome — and the improved network is used for the next round of self-play. The reason this bootstraps rather than stalling is the key claim: SEARCH IS A POLICY IMPROVEMENT OPERATOR. Running MCTS with the network's prior produces a policy measurably stronger than the network's raw output, because the search actually looks ahead and corrects the prior's mistakes. So training the network toward the searched policy is generalized policy iteration where the improvement step is search rather than a greedy argmax, and each iteration produces a network whose priors make the next search better, which produces a better target. It also solves its own curriculum problem: the opponent is always exactly the current skill level, so the training signal is informative throughout, from random play to superhuman, without anyone designing a progression. That last property is why the same algorithm worked across Go, chess and shogi with no game-specific engineering beyond the rules — and it is also the property that does not transfer to single-agent problems, where nothing supplies an automatically-matched adversary."
        },
        {
          "q": "When would you choose model-based over model-free, honestly?",
          "a": "The decision is dominated by the cost of real interaction and by how learnable the dynamics are. Model-based wins clearly when interaction is expensive or dangerous — robotics, industrial control, anything with a physical plant or a live system — because sample efficiency is the binding constraint and an order-of-magnitude reduction in real episodes is worth substantial extra compute. It also wins when the dynamics are genuinely simpler than the policy: many control problems have smooth, low-dimensional physics and a complicated optimal policy, and learning the easier object is the better bet. And it wins when you need to plan for goals that were not in the training reward, since a model plus a new objective gives you a new plan without retraining — the same argument that made inverse RL's recovered reward transferable where a cloned policy was not. Model-free wins when a simulator is cheap and fast, because then you already have a perfect model and learning an imperfect one is strictly worse; when the observation space makes dynamics modelling hard, though MuZero-style latent models weakened this; and when you simply want something robust with fewer moving parts, since model-based systems have more components that can fail quietly. The honest summary is that model-based methods have the better asymptotic argument and a worse engineering profile, and the field's practical default remains model-free with a large simulator, with model-based reserved for where reality is the bottleneck."
        },
        {
          "q": "How does planning relate to what large language models do at inference?",
          "a": "The connection is real and worth drawing carefully. Chain-of-thought is closest to a rollout: the model generates intermediate steps, and those tokens are serial computation that the forward pass alone could not perform, so it is spending inference compute to improve an answer. Tree-of-thought and similar methods make the analogy explicit by branching over candidate continuations and evaluating them, which is a search over a tree with the model supplying both the expansion policy and the evaluation. Best-of-n with a verifier is the flattest version: sample n candidates, score them, keep the best — no tree, but the same trade of compute for quality at inference rather than in the weights. The AlphaZero framing applies directly: if search improves on the model's raw output, then distilling the searched result back into the weights is policy improvement, and that is exactly what iterated self-improvement schemes do when they fine-tune on verified solutions. The honest limits are two. First, the value function is the hard part — MCTS works in games because the outcome is objectively checkable, and for open-ended reasoning the evaluator is another model with its own biases, so search amplifies whatever the verifier gets wrong. Second, best-of-n is bounded by the base policy's support while policy optimization is not, so inference-time search is safer against Goodhart but has a ceiling the base model sets."
        },
        {
          "q": "Your Dyna agent learns fast in the model and performs poorly in the real environment. Diagnose it.",
          "a": "This is the canonical model-bias signature, so start by measuring the model rather than the policy. Compute one-step prediction error on held-out real transitions, then multi-step error by unrolling the model from real states and comparing against the real trajectory — the shape of that curve against horizon tells you how far you can trust a rollout, and if error is already large at five steps then any planning beyond that is fiction. Compare where the model is being QUERIED against where it was TRAINED: if the planner is producing state-action pairs far from the data distribution, that is the exploitation mechanism and it will show up as high ensemble disagreement on exactly the trajectories the planner likes. Then the fixes in order of cheapness. Shorten the rollout horizon, which is the single most effective knob and costs nothing. Branch imagined rollouts off REAL states from the replay buffer rather than from imagined ones, so errors cannot compound across an episode. Add an ensemble and either average over models or penalize disagreement, so a trajectory that only one model likes stops looking attractive. Increase the ratio of real to imagined updates, which trades sample efficiency back for correctness and is the honest fallback. And check the boring possibility first: that the model is fine and the reward function differs subtly between the imagined and real settings, since a mismatch there produces exactly this symptom and is much easier to fix."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Dyna",
        "back": "After each real transition, update from it, then run k more updates on model-sampled transitions. Planning is literally just additional updates."
      },
      {
        "type": "intuition",
        "front": "Why model bias is structural",
        "back": "The planner searches for high-value states, which is a search for where the model is most optimistic — and optimism correlates with error, since error is largest where data is sparsest."
      },
      {
        "type": "formula",
        "front": "UCT score",
        "back": "mean value + c sqrt(log N_parent / N_child). Bandit machinery at every node; the tree grows asymmetrically, which is the efficiency argument."
      },
      {
        "type": "definition",
        "front": "MCTS four phases",
        "back": "Selection by UCT, expansion of a leaf, evaluation (rollout or value net), backup along the visited path."
      },
      {
        "type": "intuition",
        "front": "Search as policy improvement",
        "back": "The searched policy beats the raw network, so training the network toward the search's visit distribution is policy iteration with search as the improvement step."
      },
      {
        "type": "definition",
        "front": "PUCT",
        "back": "UCT with the exploration term scaled by the policy prior, so visits go to plausible moves first. What makes deep search tractable at Go's branching factor."
      },
      {
        "type": "intuition",
        "front": "Play the most-visited move",
        "back": "Not the highest-mean one. Visit count is more robust than a mean that may rest on one lucky evaluation."
      },
      {
        "type": "definition",
        "front": "MuZero's latent model",
        "back": "Trained only to predict reward, value and policy — not to reconstruct observations. Capacity goes where the decisions are."
      },
      {
        "type": "pitfall",
        "front": "Long imagined rollouts",
        "back": "Model error compounds with horizon. Branch SHORT rollouts off real states (MBPO) rather than simulating whole episodes."
      },
      {
        "type": "pitfall",
        "front": "Planning without uncertainty",
        "back": "A single deterministic model gives the planner nothing to be cautious about. Ensembles turn disagreement into epistemic uncertainty you can penalize."
      },
      {
        "type": "pitfall",
        "front": "Assuming self-play transfers",
        "back": "AlphaZero's automatic curriculum comes from an opponent always at your exact skill level. Single-agent problems have nothing that supplies it."
      },
      {
        "type": "pitfall",
        "front": "Search with a learned verifier",
        "back": "MCTS works in games because outcomes are objectively checkable. With a model as evaluator, search amplifies whatever the verifier gets wrong."
      }
    ],
    "refs": [
      {
        "title": "Silver et al. (2017) — Mastering Chess and Shogi by Self-Play (AlphaZero)",
        "url": "https://arxiv.org/abs/1712.01815"
      },
      {
        "title": "Schrittwieser et al. (2019) — Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model (MuZero)",
        "url": "https://arxiv.org/abs/1911.08265"
      },
      {
        "title": "Janner et al. (2019) — When to Trust Your Model: Model-Based Policy Optimization (MBPO)",
        "url": "https://arxiv.org/abs/1906.08253"
      },
      {
        "title": "Chua et al. (2018) — Deep Reinforcement Learning in a Handful of Trials (PETS)",
        "url": "https://arxiv.org/abs/1805.12114"
      },
      {
        "title": "Browne et al. (2012) — A Survey of Monte Carlo Tree Search Methods",
        "url": "https://ieeexplore.ieee.org/document/6145622"
      }
    ],
    "demos": []
  }
};
