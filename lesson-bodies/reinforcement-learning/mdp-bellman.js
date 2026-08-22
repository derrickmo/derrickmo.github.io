// GENERATED from content/lessons/reinforcement-learning/mdp-bellman.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/reinforcement-learning/mdp-bellman/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "mdp-bellman": {
    "level": "intro",
    "body": {
      "intuition": [
        "A Markov decision process is five things: states, actions, a transition kernel saying where you land, a reward function, and a discount factor. The Markov property is the assumption that carries all the weight - the next state depends on the current state and action ONLY, not on how you arrived. That assumption is what turns an intractable problem over histories into a tractable one over states, and it is also the assumption most often false in practice, which is why so much applied RL work is really state-design work in disguise.",
        "Everything else follows from one idea: the value of a state is the immediate reward plus the discounted value of wherever you land. Written down, that self-reference IS the Bellman equation. It looks circular and is not, because the discount factor makes it a CONTRACTION - each application of the Bellman operator shrinks the distance between any two value estimates by a factor of gamma. So there is exactly one fixed point, and iterating from anywhere converges to it geometrically. That single fact is why value iteration works, why it works from any initialization, and why you can bound how far you are from the answer before you have it.",
        "This lesson is the module's baseline in a precise sense, and worth reading with the rest in mind. Here the feedback loop is provably safe: exact expectations, a tabular value table, a known model, and a contraction guarantee. Every subsequent lesson gives up one of those. Monte Carlo and TD give up the known model and must sample. Q-learning gives up on-policy data. DQN gives up the table for a function approximator - and the guarantee goes with it, which is why replay buffers and target networks have to be invented to hold the loop together. Offline RL gives up the ability to try an action and see. When you meet each of those techniques, the useful question is which assumption on this page it dropped, and what it had to add back to compensate."
      ],
      "math": [
        {
          "h": "The Bellman optimality equation",
          "paras": [
            "The value of a state under an optimal policy is the best action's immediate reward plus the discounted expected value of the successor. The max inside the expectation is what makes this the OPTIMALITY equation rather than the evaluation one.",
            "Note there is no reference to a policy on the right-hand side. The optimal value function is defined without ever naming a policy, and the policy is then read off it by taking the greedy action - which is why a value function is a complete solution to an MDP."
          ],
          "tex": "V^{*}(s) = \\max_{a} \\Big[\\, R(s,a) + \\gamma \\sum_{s'} P(s' \\mid s,a)\\, V^{*}(s') \\,\\Big], \\qquad \\pi^{*}(s) = \\arg\\max_{a} Q^{*}(s,a)",
          "texNote": "A finite MDP always admits a DETERMINISTIC optimal policy - stochasticity never helps when you know the model, because the max is attained at a single action. That stops being true under partial observability, under function approximation, and in games, which is one reason policy-gradient methods that output distributions are not merely a different implementation of the same thing."
        },
        {
          "h": "Why the self-reference converges: the contraction property",
          "paras": [
            "Define the Bellman operator T as the right-hand side above, applied to an arbitrary value function. The key fact is that T moves any two value functions closer together in the sup-norm, by a factor of exactly gamma.",
            "By the Banach fixed-point theorem this gives a unique fixed point and geometric convergence from any starting point - so value iteration cannot get stuck, cannot oscillate, and its error can be bounded before you have converged."
          ],
          "tex": "\\lVert T V - T U \\rVert_{\\infty} \\;\\le\\; \\gamma \\lVert V - U \\rVert_{\\infty} \\;\\Longrightarrow\\; \\lVert V_k - V^{*}\\rVert_{\\infty} \\le \\gamma^{k} \\lVert V_0 - V^{*}\\rVert_{\\infty}",
          "texNote": "The practical reading: iterations needed scales like 1/(1-gamma). At gamma = 0.9 you need tens of sweeps, at 0.99 hundreds, at 0.999 thousands - and the effective horizon 1/(1-gamma) is the number of steps into the future that meaningfully affects a value. Choosing gamma is choosing a horizon, and it CHANGES THE PROBLEM rather than tuning the solver."
        },
        {
          "h": "The policy improvement theorem",
          "paras": [
            "The guarantee behind policy iteration, and behind every actor-critic method later in the module. If you act greedily with respect to the value of your current policy, the new policy is at least as good in every state.",
            "Because it improves monotonically and the space of deterministic policies is finite, policy iteration terminates EXACTLY - not asymptotically - which is a stronger statement than value iteration's geometric convergence."
          ],
          "tex": "\\pi'(s) = \\arg\\max_a Q^{\\pi}(s,a) \\;\\Longrightarrow\\; V^{\\pi'}(s) \\ge V^{\\pi}(s) \\;\\; \\forall s",
          "texNote": "This is the theorem that licenses the whole evaluate-then-improve alternation known as generalized policy iteration, which describes nearly every algorithm in this module. Approximate versions of it are what actor-critic methods rely on - and the failure of the guarantee once the evaluation is approximate and the improvement is a gradient step is exactly why trust regions become necessary."
        }
      ],
      "code": [
        {
          "h": "Value iteration and policy iteration, side by side",
          "paras": [
            "Both solve the same MDP and they trade off differently: value iteration does cheap sweeps and many of them, policy iteration does expensive evaluations and few. Writing both makes the relationship obvious - they are the two extremes of generalized policy iteration."
          ],
          "code": "def value_iteration(P, R, gamma, tol=1e-8):\n    V = np.zeros(nS)\n    while True:\n        Q = R + gamma * P @ V                 # (nS, nA): one Bellman backup\n        V_new = Q.max(axis=1)                 # the max IS the optimality part\n        if np.abs(V_new - V).max() < tol:     # sup-norm, because that is the\n            return V_new, Q.argmax(axis=1)    # norm the contraction is in\n        V = V_new\n\ndef policy_iteration(P, R, gamma):\n    pi = np.zeros(nS, dtype=int)\n    while True:\n        # EVALUATE: solve the linear system exactly - no max, so it IS linear\n        P_pi, R_pi = P[np.arange(nS), pi], R[np.arange(nS), pi]\n        V = np.linalg.solve(np.eye(nS) - gamma * P_pi, R_pi)\n        # IMPROVE: act greedily w.r.t. that value (policy improvement theorem)\n        pi_new = (R + gamma * P @ V).argmax(axis=1)\n        if (pi_new == pi).all():\n            return V, pi                      # EXACT termination, not a tolerance\n        pi = pi_new\n\n# THE TRADE:\n#   value iteration ... cheap sweeps, ~1/(1-gamma) of them, converges\n#                       geometrically to a TOLERANCE\n#   policy iteration .. an O(nS^3) linear solve per step, but usually only a\n#                       handful of steps, and terminates EXACTLY because the\n#                       policy space is finite and improvement is monotone\n#\n# They are the endpoints of GENERALIZED POLICY ITERATION: evaluate a bit,\n# improve a bit, repeat. Nearly every algorithm in this module is a point on\n# that spectrum with sampling substituted for the exact expectation.",
          "caption": "Policy iteration's evaluation step is a LINEAR solve because fixing the policy removes the max. That is the whole structural difference: the max is what makes the optimality equation nonlinear, and removing it is what lets you solve in closed form."
        },
        {
          "h": "Gamma is not a tuning knob - it defines the problem",
          "paras": [
            "The most consequential and least examined choice in an MDP. It sets the effective horizon, it sets the convergence rate, and changing it changes which policy is optimal - so a gamma sweep is not hyperparameter tuning, it is asking a different question each time."
          ],
          "code": "for g in [0.5, 0.9, 0.99, 0.999]:\n    V, pi = value_iteration(P, R, g)\n    print(g, \"horizon ~\", round(1/(1-g)), \"| sweeps\", n_sweeps, \"| pi\", pi)\n#\n#   gamma   effective horizon   what the agent will do\n#   0.5     ~2 steps            grabs the nearest small reward\n#   0.9     ~10                 balanced\n#   0.99    ~100                walks past small rewards to a distant large one\n#   0.999   ~1000              same policy, ~10x the sweeps to find it\n#\n# THE POLICY CHANGES. A myopic agent is not a worse-trained agent, it is an\n# agent solving a different problem. Reporting 'we used gamma=0.99' without\n# saying why is reporting an unexamined modelling assumption.\n\n# REWARD SHAPING: adding a helpful reward to speed learning USUALLY changes\n# the optimal policy - the classic failure is a bicycle agent rewarded for\n# moving toward a goal that learns to circle, collecting the shaping reward\n# forever. The exception is POTENTIAL-BASED shaping (Ng et al. 1999):\n#\n#     F(s, a, s') = gamma * Phi(s') - Phi(s)\n#\n# This form - and essentially only this form - leaves the optimal policy\n# UNCHANGED, because it telescopes over any trajectory and so adds a constant\n# to every return. Any other shaping term is a new problem you did not intend\n# to pose.",
          "caption": "Two ways to silently change the problem while believing you are tuning the solver. Potential-based shaping is the one form that provably preserves the optimal policy, because it telescopes and adds a constant to every trajectory's return."
        }
      ],
      "useCases": [
        "Any sequential decision problem with a known or learnable model and a manageable state space: inventory and supply-chain policies, maintenance scheduling, queue and admission control, dynamic pricing - where dynamic programming gives an exact answer and the hard part is the modelling rather than the algorithm.",
        "As the ground truth for evaluating everything else. If a problem is small enough to solve exactly, do so, and use the exact optimal values to measure how far a sampling or function-approximation method actually is - which is the only way to see overestimation and divergence rather than infer them.",
        "Planning inside a model-based agent: once you have learned P and R, value iteration is what you run in the learned model, so the guarantees here are exactly what model-based methods inherit and what model error erodes.",
        "Framing a problem before choosing an algorithm. Writing down the state, action, reward and discount forces the questions that decide a project - is the state actually Markov, what horizon do we care about, what are we really rewarding - and most applied RL failures are visible at this stage."
      ],
      "pitfalls": [
        "Assuming the Markov property holds. If the next state depends on history the state does not capture - a hidden mode, a latency, an unobserved intent - then value functions over that state are not well defined and every convergence guarantee here is void. This is a POMDP, and the standard responses are stacking observations or carrying a recurrent belief state.",
        "Treating gamma as a solver hyperparameter. It sets the effective horizon 1/(1-gamma) and it CHANGES WHICH POLICY IS OPTIMAL, so sweeping it is posing a sequence of different problems. Choose it from the horizon the application cares about, and note that a smaller gamma is sometimes genuinely better when the model is imperfect, because it limits how far errors are propagated.",
        "Non-potential-based reward shaping. Adding a plausible helper reward usually changes the optimal policy, and the classic failure is an agent that farms the shaping term forever rather than reaching the goal. Only potential-based shaping - gamma*Phi(s') - Phi(s) - provably preserves optimality, because it telescopes.",
        "Using the wrong norm when checking convergence. The contraction is in the SUP-norm, so a mean or L2 residual can look converged while one state is far off - and in a sparse-reward MDP that one state is often the one that matters.",
        "Mishandling terminal states. A terminal state must have value zero and must not bootstrap, and an off-by-one here produces a value function that looks plausible and is systematically wrong near the goal. It is the most common bug in a first RL implementation.",
        "Forgetting that policy iteration's evaluation is an O(nS^3) linear solve. It terminates in few iterations, but each is expensive, so beyond a few thousand states you want modified policy iteration - a few sweeps of evaluation rather than an exact solve - which is the practical middle of the spectrum.",
        "Expecting these guarantees to survive function approximation. Contraction is a property of the exact Bellman operator on a table. Compose it with a projection onto a function class and the composite need not be a contraction at all, which is precisely how divergence enters and why the next several lessons spend their effort on stabilization."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/mc-td",
          "text": "The first assumption dropped: the model is unknown, so the expectation in the Bellman backup must be sampled. Monte Carlo samples the whole return, TD samples one step and bootstraps on its own estimate - and the bias-variance trade between them is the module's other running thread."
        },
        {
          "ref": "reinforcement-learning/q-learning",
          "text": "Q-learning is this lesson's optimality equation with the expectation replaced by a sample and the max kept. Keeping the max while sampling is exactly what makes it off-policy, and also what introduces the overestimation bias that recurs through DQN and offline RL."
        },
        {
          "ref": "supervised-learning/model-comparison",
          "text": "The structural contrast worth holding onto: supervised learning has a fixed data distribution, and here the policy generates the states it is evaluated on. Every difficulty in this module traces back to that loop, which simply does not exist in the supervised setting."
        },
        {
          "ref": "foundations/complexity",
          "text": "Value iteration is dynamic programming in the textbook sense - overlapping subproblems, optimal substructure - and the curse of dimensionality is why exact DP stops at moderate state spaces and everything after this lesson is a way of approximating it."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "The Markov property here plays the same role the conditional-independence structure plays in graphical models: it is the assumption that makes an intractable joint problem factor. And as there, the modelling skill is knowing when it is false."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What defines an MDP?",
          "a": "States, actions, a transition kernel P(s'|s,a), a reward function, and a discount factor gamma - plus the Markov property, that the next state depends only on the current state and action."
        },
        {
          "q": "What is the Bellman optimality equation?",
          "a": "V*(s) = max_a [R(s,a) + gamma * sum_s' P(s'|s,a) V*(s')]. The value of a state is the best action's reward plus the discounted expected value of where you land."
        },
        {
          "q": "Why does value iteration converge?",
          "a": "The Bellman operator is a gamma-contraction in the sup-norm, so by the fixed-point theorem there is a unique fixed point and iteration converges geometrically from any initialization."
        },
        {
          "q": "How many iterations does value iteration need?",
          "a": "On the order of 1/(1-gamma), since the error shrinks by gamma each sweep. At gamma = 0.99 that is hundreds of sweeps; at 0.999, thousands."
        },
        {
          "q": "What is the effective horizon?",
          "a": "1/(1-gamma) - roughly the number of future steps that meaningfully affect a value. Choosing gamma is choosing how far ahead the agent cares."
        },
        {
          "q": "What is the difference between value iteration and policy iteration?",
          "a": "Value iteration does cheap Bellman sweeps and many of them. Policy iteration alternates an exact policy evaluation - an O(nS^3) linear solve - with a greedy improvement, and needs far fewer iterations."
        },
        {
          "q": "Why is policy evaluation a linear solve?",
          "a": "Fixing the policy removes the max, so the Bellman equation becomes linear in V: (I - gamma*P_pi) V = R_pi. The max is what makes the optimality equation nonlinear."
        },
        {
          "q": "What is the policy improvement theorem?",
          "a": "Acting greedily with respect to Q^pi gives a policy at least as good as pi in every state. It licenses the whole evaluate-then-improve alternation."
        },
        {
          "q": "Why does policy iteration terminate exactly?",
          "a": "Improvement is monotone and the set of deterministic policies is finite, so it must stop - unlike value iteration, which converges asymptotically to a tolerance."
        },
        {
          "q": "Does an MDP always have a deterministic optimal policy?",
          "a": "A finite MDP does - the max is attained at a single action. That stops being true under partial observability, function approximation, or in multi-agent games."
        },
        {
          "q": "What is potential-based reward shaping?",
          "a": "F(s,a,s') = gamma*Phi(s') - Phi(s). It telescopes over any trajectory, adding a constant to every return, so it provably leaves the optimal policy unchanged - and essentially no other shaping form does."
        },
        {
          "q": "What is generalized policy iteration?",
          "a": "The pattern of alternating partial policy evaluation with partial policy improvement. Value iteration and policy iteration are its two extremes, and nearly every RL algorithm is a point in between."
        }
      ],
      "standard": [
        {
          "q": "Explain MDPs and the Bellman equations, and why the whole thing converges.",
          "a": "THE FORMALISM. An MDP is (S, A, P, R, gamma). The Markov property - the next state depends only on the current state and action, not on history - is what does the work: it collapses a problem over trajectories into one over states, which is the only reason any of this is tractable. It is also the assumption most often violated in practice, so a large share of applied RL is really state design. THE CORE IDEA. Define the value of a state as the expected discounted return from it. Then the value of a state equals the immediate reward plus the discounted value of the successor - the Bellman equation. For a fixed policy that is the Bellman EXPECTATION equation and it is linear in V, because the action is determined. For the optimal policy it is the Bellman OPTIMALITY equation with a max over actions, which is nonlinear. Note that V* is defined without reference to any policy, and the optimal policy is then read off by acting greedily - so a value function is a complete solution to the MDP. WHY IT CONVERGES, which is the part I would spend the most time on. The equation is self-referential and that looks like a problem. It is not, because the Bellman operator T is a CONTRACTION in the sup-norm with modulus gamma: applying T to any two value functions brings them strictly closer, by a factor of gamma. The proof is short - the max of differences is bounded by the difference of maxes, and the transition probabilities sum to one, so the gamma comes straight through. By Banach's fixed-point theorem this gives a UNIQUE fixed point, and iterating from ANY initialization converges geometrically at rate gamma^k. That single property is why value iteration cannot oscillate, cannot get stuck in a local optimum, and admits an error bound before convergence. THE TWO ALGORITHMS. Value iteration applies T repeatedly - cheap sweeps, about 1/(1-gamma) of them. Policy iteration alternates exact evaluation (a linear solve, since fixing the policy removes the max) with greedy improvement, justified by the policy improvement theorem; because improvement is monotone and there are finitely many deterministic policies, it terminates EXACTLY rather than asymptotically, usually in a handful of iterations, each more expensive. They are the endpoints of generalized policy iteration. WHY THIS LESSON MATTERS FOR THE REST. Everything here rests on four assumptions: a known model, exact expectations, a tabular value function, and the contraction. Every later method drops one. Sampling replaces the expectation; function approximation replaces the table; and the moment you compose the Bellman operator with a projection onto a function class, the composite need not be a contraction at all. That is where divergence enters, and it is why the machinery of the next lessons - target networks, replay, trust regions - exists.",
          "deepDive": {
            "q": "Prove the contraction property, and explain precisely what breaks under function approximation.",
            "a": "THE PROOF. Let T be the Bellman optimality operator: (TV)(s) = max_a [R(s,a) + gamma * sum_s' P(s'|s,a) V(s')]. Take any two value functions V and U. For any state s, |(TV)(s) - (TU)(s)| = |max_a [...V...] - max_a [...U...]|. Use the fact that the absolute difference of two maxima is at most the maximum of the absolute differences - which holds because whichever action attains the larger max, the other's value at that action is a lower bound. So this is at most max_a | gamma * sum_s' P(s'|s,a) [V(s') - U(s')] |, which is at most gamma * max_a sum_s' P(s'|s,a) * |V(s') - U(s')|. Since the transition probabilities are non-negative and sum to one, that inner sum is a convex combination and is bounded by the largest element: gamma * max_s' |V(s') - U(s')| = gamma * ||V - U||_inf. Taking the max over s gives ||TV - TU||_inf <= gamma ||V - U||_inf. Banach then gives existence, uniqueness, and geometric convergence. TWO THINGS THE PROOF RELIED ON, and both matter. First, the SUP-norm specifically - the argument works because a convex combination is bounded by a max. The same statement is FALSE in general for a weighted L2 norm, which is why analyses of approximate methods must be careful about which norm they are in. Second, that T is applied to an arbitrary function over states with no constraint on its form. WHAT BREAKS UNDER FUNCTION APPROXIMATION. With a parametric approximator you cannot represent TV in general, so you follow each backup with a PROJECTION onto the function class: the update is really Pi-T, not T. The projection is a contraction in the norm it projects in - typically a weighted L2 norm defined by the state distribution you sample from - and T is a contraction in the sup-norm. Composing two contractions in DIFFERENT norms gives no guarantee at all, and the composite can genuinely expand. Baird's counterexample is the canonical demonstration: a small MDP with linear function approximation and off-policy updates where the parameters diverge to infinity, with no bug anywhere. THE DEADLY TRIAD names the three ingredients that must be present: function approximation, bootstrapping (updating an estimate toward another estimate), and off-policy training (the distribution you update on differs from the one your policy induces). Any two are safe; all three can diverge. Note that on-policy TD with linear approximation IS safe, because then the projection's norm is the on-policy state distribution and the composition works out - so it is specifically the mismatch between the sampling distribution and the policy's own distribution that breaks it. WHAT THIS PREDICTS, and it is why the theory is worth knowing. Every stabilization technique in deep RL attacks one leg. A target network freezes the bootstrap target, weakening the bootstrapping leg by making the update look more like supervised regression against a fixed target. Importance sampling and on-policy methods attack the off-policy leg. Gradient-TD methods change the objective so it is a true gradient descent on a well-defined error. And offline RL's conservatism is a direct response to the off-policy leg being maximally violated. Being able to say 'this trick exists because of that leg' is the difference between remembering the tricks and understanding them."
          }
        },
        {
          "q": "How do you choose gamma, and what does it actually control?",
          "a": "THREE THINGS AT ONCE, which is why it is the most consequential parameter in an MDP and the least examined. (1) THE EFFECTIVE HORIZON, 1/(1-gamma). Rewards beyond that many steps are discounted into irrelevance. gamma = 0.9 is about ten steps, 0.99 about a hundred, 0.999 about a thousand. (2) THE CONVERGENCE RATE. Error shrinks by gamma per sweep, so iterations scale like 1/(1-gamma) - the same quantity. Long horizons are expensive in exactly the way they are far-sighted. (3) WHICH POLICY IS OPTIMAL. This is the one people miss. A myopic agent takes the near small reward; a far-sighted one walks past it to a distant large one. Those are different optimal policies for the same environment. So sweeping gamma is not hyperparameter tuning, it is posing a different problem each time - and reporting 'we used 0.99' without justification is reporting an unexamined modelling assumption. HOW I WOULD CHOOSE IT. Start from the APPLICATION'S horizon: over what timescale do consequences matter? In an episodic task with a natural length, gamma should make the episode's end reachable within the effective horizon - if episodes are 200 steps and gamma is 0.9, the agent literally cannot see the terminal reward. In a continuing task, gamma often has a natural interpretation as a survival probability or a financial discount rate, and then it is not a hyperparameter at all, it is part of the problem specification. THE COUNTERINTUITIVE PART worth raising. A SMALLER gamma is sometimes better even when you care about the long horizon, when your model or value estimates are imperfect. A large gamma propagates errors far - a bad value estimate contaminates states many steps away - so the discount acts as a regularizer limiting how far error travels, and there is an optimum below the true horizon that trades far-sightedness for robustness. This is well-studied and it is why practitioners sometimes get better real performance from 0.95 than 0.999 on a problem that nominally needs the longer horizon. THE PRACTICAL ADVICE. Report gamma with a justification. If you must sweep, understand you are comparing solutions to different problems, and evaluate all of them against the SAME undiscounted objective you actually care about - otherwise you are comparing scores on different scales and the comparison is meaningless. THE RELATED TRAP. Do not confuse the training discount with the evaluation metric. Episode return in evaluation is typically UNDISCOUNTED; discounting is a solver device to make the fixed point well-defined and the horizon finite. Reporting discounted returns as your headline number makes results incomparable across gamma settings, and it is a surprisingly common error."
        },
        {
          "q": "Your RL agent is behaving strangely - it circles instead of reaching the goal. Diagnose.",
          "a": "This is close to a diagnostic signature, and I would start with the two most likely causes before touching the algorithm. HYPOTHESIS 1: NON-POTENTIAL-BASED REWARD SHAPING. Somebody added a helpful reward - progress toward the goal, distance reduction, a proximity bonus - to make learning faster. Almost any such term CHANGES THE OPTIMAL POLICY, and the characteristic failure is exactly circling: if the agent gets reward for moving toward the goal, it can farm that reward forever by approaching and retreating, and the resulting return can exceed simply finishing. The agent is optimal for the reward you wrote and it is not doing what you wanted. DIAGNOSTIC: compute the return of the circling behaviour under your reward function and compare it against a direct path. If circling scores higher, the problem is the specification, not the learning. FIX: use potential-based shaping, gamma*Phi(s') - Phi(s), which telescopes over any trajectory and therefore adds a constant to every return - provably preserving the optimal policy. Almost any other form does not. HYPOTHESIS 2: THE DISCOUNT IS TOO SMALL. If gamma's effective horizon is shorter than the distance to the goal, the goal reward is discounted below the noise floor and the agent literally cannot see it. It then optimizes whatever local signal exists, which looks like aimless or circling behaviour. DIAGNOSTIC: compare 1/(1-gamma) against the typical number of steps to the goal. If the horizon is shorter, that is the bug. HYPOTHESIS 3: A TERMINAL-STATE BUG. If the terminal state is not handled correctly - it bootstraps instead of having value zero, or the done flag is not propagated - reaching the goal may not actually end the episode or may not deliver the value it should. A common variant is truncation on a time limit being treated as termination, which teaches the agent that the world ends arbitrarily and makes long-horizon behaviour incoherent. DIAGNOSTIC: print the value of the terminal state and the states adjacent to it. HYPOTHESIS 4: A GENUINE LOOP IN THE REWARD. Any positive reward on a cycle with no cost gives infinite return in a continuing task, and the agent has correctly found it. This is specification gaming and it is the same category as the first hypothesis. HYPOTHESIS 5: only after those - AN ALGORITHMIC PROBLEM. Insufficient exploration so the goal was never reached, or divergence in the value estimates. THE ORDER MATTERS because the first four are all SPECIFICATION problems, and no amount of training fixes a specification problem. The general habit I would state: when an RL agent does something surprising, assume first that it is optimal for a reward function you did not intend to write. That is the correct prior, it is usually right, and it is checkable by evaluating the surprising behaviour's return under your own reward function - which takes minutes.",
          "deepDive": {
            "q": "Prove that potential-based shaping preserves the optimal policy, and say where the result's limits are.",
            "a": "THE SETUP. Take an MDP M with reward R, and form M' with reward R'(s,a,s') = R(s,a,s') + F(s,a,s') where F(s,a,s') = gamma*Phi(s') - Phi(s) for an arbitrary potential function Phi over states. Claim: every optimal policy of M' is optimal in M and vice versa. THE PROOF, which is a telescoping argument. Consider any trajectory s_0, s_1, s_2, ... The added discounted return from F is the sum over t of gamma^t [gamma*Phi(s_{t+1}) - Phi(s_t)] = sum_t [gamma^{t+1} Phi(s_{t+1}) - gamma^t Phi(s_t)]. That is a telescoping series: every term cancels against the next except the very first, leaving -Phi(s_0) (plus a limiting term that vanishes for gamma < 1 with bounded Phi, and is exactly zero for episodic tasks where the terminal potential is defined as zero). So for ANY trajectory from s_0, the total shaped return equals the original return minus Phi(s_0). The shaping adds a constant that depends only on the START STATE and not on what the agent does. Since it changes every policy's value by the same amount at each state, it cannot change the ordering of policies, so the argmax is preserved. Equivalently and more usefully: Q*_{M'}(s,a) = Q*_M(s,a) - Phi(s), so the greedy policy is identical. THE CONVERSE, which is the stronger and less-quoted half of Ng et al.'s result: potential-based shaping is essentially the ONLY form with this guarantee. If F is not potential-based, one can construct an MDP where the optimal policy changes. So this is not a sufficient condition among many - it is a characterization, and that is why the result is important rather than merely convenient. WHERE THE LIMITS ARE, since a proof invites over-application. (1) IT PRESERVES OPTIMALITY, NOT LEARNING DYNAMICS - which is the point, since a good Phi speeds learning by densifying the reward while a bad one can slow it down. Choosing Phi near V* is ideal and obviously circular; a heuristic distance-to-goal is the usual practical choice. (2) THE POTENTIAL MUST BE A FUNCTION OF STATE ALONE for the basic result. Extensions to state-action and to time-varying potentials exist but need care, and the naive versions break the telescoping. (3) TERMINAL STATES must have Phi = 0, or the telescoping leaves a residual at the end and the guarantee fails - this is a real and common implementation bug. (4) IT ASSUMES THE SAME GAMMA in the F term as in the return. Using Phi(s') - Phi(s) without the gamma factor - which looks natural and is what people write - does NOT telescope correctly and does not preserve optimality. (5) UNDER FUNCTION APPROXIMATION the guarantee is about the exact optimal policies; the practical effect on an approximate learner is empirical. THE THING I WOULD EMPHASIZE. This result is one of the few places in RL where a practical technique everyone wants to use has a clean theorem saying exactly when it is safe, and the theorem's converse says the unsafe version is genuinely unsafe rather than merely unproven. That makes it worth knowing precisely rather than approximately."
          }
        },
        {
          "q": "What is the Markov property really assuming, and what do you do when it fails?",
          "a": "WHAT IT ASSUMES. That the current state is a SUFFICIENT STATISTIC of the history for predicting the future: P(s_{t+1} | s_t, a_t) = P(s_{t+1} | s_t, a_t, s_{t-1}, a_{t-1}, ...). Everything relevant about the past is already in the state. This is what lets value functions be defined over states at all - if the future depended on how you arrived, then 'the value of state s' would not be well-defined, because different histories reaching s would have different futures. So the property is not a convenience, it is a precondition for the objects in this lesson to exist. HOW IT FAILS IN PRACTICE, with the common shapes. (1) UNOBSERVED VARIABLES: a robot that cannot see whether it is holding an object; a recommender that cannot see the user's mood or intent; a trading agent that cannot see other participants' positions. (2) VELOCITY AND RATES: a single image frame does not tell you which way the ball is moving - the classic case, and the reason Atari agents stack four frames. (3) LATENCY AND ACTUATION DELAY: an action's effect arrives some steps later, so the current observation does not reflect commands already in flight. (4) NON-STATIONARITY: the dynamics themselves drift, which is a hidden variable indexed by time. HOW YOU DIAGNOSE IT. Ask whether two situations that look identical in your state representation could plausibly require different actions. If yes, the representation is not Markov. That is a modelling question rather than an experiment, and it is answerable at the whiteboard before writing code - which is why this belongs in the first lesson. THE RESPONSES, roughly in order of cost. (1) EXPAND THE STATE. Stack the last k observations; add velocities, rates, and time-since-event features; include the last action. Cheap, often sufficient, and the standard first move. (2) RECURRENCE. An RNN or transformer over the observation history learns a belief state implicitly. Powerful, and it makes training substantially harder because the representation and the policy are learned together through the same loop. (3) EXPLICIT BELIEF STATE - the POMDP treatment. Maintain a posterior over hidden state and plan in belief space, which is Markov by construction. Principled and expensive; the belief space is continuous even when the state space is finite. (4) FRAME-STACKING'S HONEST LIMIT: it handles short-range dependence and nothing else. If the relevant history is long or event-triggered, stacking will silently fail. WHAT I WOULD SAY LAST, because it is the practical point. Most reported RL failures I have seen are not algorithmic. They are a state representation that is not Markov, so the agent is being asked to learn a function that does not exist, and the algorithm dutifully converges to some average over the histories it cannot distinguish. That failure looks like high variance, unstable training, or a plateau - none of which point at the cause. Checking the Markov assumption explicitly is the cheapest debugging step available and it is routinely skipped."
        },
        {
          "q": "Compare value iteration and policy iteration. When would you use each, and what is in between?",
          "a": "THE SHARED STRUCTURE. Both are instances of generalized policy iteration: alternate evaluating the current policy with improving it greedily. They differ only in HOW MUCH evaluation happens before each improvement. VALUE ITERATION does exactly one Bellman backup - with the max folded in - then implicitly improves. Each sweep is O(nS * nA * nS) for a dense model, cheap, and you need about 1/(1-gamma) of them. It converges geometrically to a tolerance and never terminates exactly. Its advantage is that each step is cheap and it needs no matrix solve, which matters as the state space grows and as the transition structure gets sparse. POLICY ITERATION evaluates the current policy EXACTLY by solving (I - gamma*P_pi)V = R_pi, an O(nS^3) linear solve, then improves greedily. It terminates exactly - improvement is monotone and there are finitely many deterministic policies - and in practice it converges in a strikingly small number of iterations, often under ten even for large gamma. Its per-iteration cost is the problem. THE KEY ASYMMETRY. Policy iteration's iteration count is nearly INDEPENDENT of gamma, while value iteration's scales like 1/(1-gamma). So the gap widens dramatically as gamma approaches one: at gamma = 0.999 value iteration needs thousands of sweeps and policy iteration still needs a handful. If you have a long horizon and a state space small enough to solve linear systems in, policy iteration is dramatically better and this is under-appreciated. WHAT IS IN BETWEEN: MODIFIED POLICY ITERATION, which is what I would actually use. Instead of solving the evaluation exactly, run k sweeps of the linear Bellman backup for the fixed policy, then improve. k = 1 recovers value iteration, k = infinity recovers policy iteration, and k in the range of 5 to 50 is usually much better than either - you get most of policy iteration's iteration-count advantage at value iteration's per-step cost, and no linear solve. This is the practical default for exact dynamic programming and it deserves to be better known than it is. HOW I WOULD CHOOSE. Small state space (thousands), long horizon, dense transitions: policy iteration. Large or sparse state space: value iteration or modified policy iteration, with asynchronous or prioritized sweeping so you update the states whose values are actually changing rather than sweeping uniformly. Very large: neither - you are in function-approximation territory and the rest of this module. WHY THE COMPARISON MATTERS BEYOND DP. The evaluate-versus-improve balance recurs everywhere. Actor-critic methods are generalized policy iteration with sampling and function approximation: how many critic updates per actor update is the same k. PPO's multiple epochs on one batch of data is a choice about how much to improve on one evaluation. Recognizing that these are the same dial in different clothing is more useful than either algorithm on its own."
        },
        {
          "q": "How would you use exact dynamic programming as a research tool, even when your real problem is far too big for it?",
          "a": "This is one of the most useful habits in RL practice and it is systematically under-used, because people treat DP as a topic they have moved past rather than an instrument. THE CORE MOVE: BUILD A SMALL VERSION OF YOUR PROBLEM WHERE YOU CAN COMPUTE V* AND Q* EXACTLY. A gridworld with the same qualitative structure - the same kind of hazards, the same reward sparsity, the same stochasticity - is usually enough. Now you have ground truth, and ground truth changes what you can measure. WHAT IT LETS YOU MEASURE THAT YOU OTHERWISE CANNOT. (1) OVERESTIMATION, directly. Q-learning's max operator biases estimates upward, and offline methods bootstrap on actions never taken. Without Q* you can only infer this from downstream symptoms; with Q* you can plot estimated-minus-true Q and watch the bias grow. This turns 'the algorithm seems unstable' into a measured quantity, and it is how the double-Q and conservative-offline literatures made their case. (2) HOW GOOD IS 'GOOD'. Reported returns are meaningless without knowing the optimum. Ninety percent of optimal and ninety percent of a weak baseline look identical in a learning curve. (3) WHETHER A FAILURE IS EXPLORATION OR LEARNING. Compare against an agent given the optimal policy's state distribution to learn from. If it succeeds there and fails on-policy, the problem is exploration; if it fails either way, it is the learner. That single experiment resolves a question people usually argue about. (4) THE VALUE OF INFORMATION in a partially observable variant - solve the fully observable version exactly and the gap is what the hidden state costs you. (5) WHETHER YOUR REWARD FUNCTION IS WHAT YOU MEANT. Solve the small MDP exactly and LOOK at the optimal policy. If the exact optimum does something you did not intend, you have found a specification bug with zero training involved - and specification bugs are the most expensive kind to find late. WHAT IT ALSO GIVES YOU: A BEHAVIOUR-POLICY GENERATOR. Exact solutions let you construct datasets of known quality - an epsilon-greedy-over-optimal policy gives you a medium-quality dataset with measurable coverage - which is exactly what you need to study offline RL, imitation learning, and preference methods under controlled conditions rather than on whatever data you happen to have. THE CAVEAT I WOULD STATE. A small tabular problem does not exhibit everything a large one does - representation learning, generalization across states, the deadly triad in its full form. So it is an instrument for isolating a mechanism, not a substitute for the real experiment. But 'the mechanism I claimed is happening, here it is measured against ground truth' is a much stronger statement than a learning curve, and it costs an afternoon."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Bellman optimality equation",
        "back": "V*(s) = max_a [R(s,a) + gamma * sum_s' P(s'|s,a) V*(s')]. Defined WITHOUT reference to a policy - the policy is read off by acting greedily, which is why a value function is a complete solution to an MDP."
      },
      {
        "type": "intuition",
        "front": "Why the self-referential Bellman equation converges",
        "back": "The Bellman operator is a gamma-CONTRACTION in the sup-norm: ||TV - TU||_inf <= gamma||V - U||_inf. Banach then gives a UNIQUE fixed point and geometric convergence from ANY initialization - so value iteration cannot oscillate or get stuck."
      },
      {
        "type": "formula",
        "front": "Effective horizon",
        "back": "1/(1-gamma). Also the iteration count for value iteration - long horizons are expensive in exactly the way they are far-sighted. gamma=0.9 -> ~10 steps, 0.99 -> ~100, 0.999 -> ~1000."
      },
      {
        "type": "pitfall",
        "front": "Gamma changes the PROBLEM, not the solver",
        "back": "It changes which policy is optimal - a myopic agent takes the near reward, a far-sighted one walks past it. Sweeping gamma poses a different problem each time. Also: report UNDISCOUNTED evaluation returns, or results are incomparable across gamma."
      },
      {
        "type": "definition",
        "front": "Potential-based reward shaping",
        "back": "F(s,a,s') = gamma*Phi(s') - Phi(s). Telescopes over any trajectory, so it adds a constant (-Phi(s_0)) to every return and provably preserves the optimal policy. Ng et al.'s converse: essentially NO other form does."
      },
      {
        "type": "pitfall",
        "front": "The circling agent",
        "back": "Diagnostic signature of non-potential-based shaping: the agent farms the progress reward by approaching and retreating forever. Check by computing the circling behaviour's return under YOUR reward - if it beats a direct path, the spec is the bug, not the learner."
      },
      {
        "type": "intuition",
        "front": "Why policy evaluation is a LINEAR solve",
        "back": "Fixing the policy removes the max, so (I - gamma*P_pi)V = R_pi. The max is exactly what makes the OPTIMALITY equation nonlinear - that one difference is the entire structural gap between the two algorithms."
      },
      {
        "type": "definition",
        "front": "Policy improvement theorem",
        "back": "Acting greedily w.r.t. Q^pi gives V^pi'(s) >= V^pi(s) for all s. Monotone improvement + finitely many deterministic policies => policy iteration terminates EXACTLY, not to a tolerance."
      },
      {
        "type": "intuition",
        "front": "Value vs policy iteration: the gamma asymmetry",
        "back": "VI's iteration count scales like 1/(1-gamma); PI's is nearly INDEPENDENT of gamma (often <10 iterations). So the gap widens as gamma -> 1. Middle ground: MODIFIED policy iteration - k evaluation sweeps then improve; k=1 is VI, k=inf is PI, k=5-50 usually beats both."
      },
      {
        "type": "pitfall",
        "front": "The deadly triad",
        "back": "Function approximation + bootstrapping + off-policy data can diverge. Any TWO are safe. The cause: T contracts in SUP-norm, the projection contracts in a weighted L2 norm, and composing contractions in DIFFERENT norms guarantees nothing. Baird's counterexample diverges with no bug."
      },
      {
        "type": "intuition",
        "front": "The Markov property is a precondition, not a convenience",
        "back": "If the future depends on HOW you arrived, 'the value of state s' is not well-defined. Test: could two situations identical in your representation require different actions? Then it is not Markov - and the algorithm will converge to an average over histories it cannot distinguish."
      },
      {
        "type": "intuition",
        "front": "Use exact DP as an instrument",
        "back": "Build a small version where you can compute V*/Q* exactly. That gives you: measured overestimation (not inferred), what '90% of optimal' means, exploration-vs-learning separation, datasets of KNOWN quality for offline RL, and a spec check - look at the exact optimum before training anything."
      }
    ],
    "refs": [
      {
        "title": "Sutton & Barto (2018), Reinforcement Learning: An Introduction (2nd ed.)",
        "url": "http://incompleteideas.net/book/the-book-2nd.html"
      },
      {
        "title": "Ng, Harada & Russell (1999), Policy Invariance Under Reward Transformations",
        "url": "https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf"
      },
      {
        "title": "Kaelbling, Littman & Moore (1996), Reinforcement Learning: A Survey",
        "url": "https://arxiv.org/abs/cs/9605103"
      },
      {
        "title": "Amit, Meir & Ciosek (2020), Discount Factor as a Regularizer in Reinforcement Learning",
        "url": "https://arxiv.org/abs/2007.02040"
      },
      {
        "title": "Bellman (1957), A Markovian Decision Process",
        "url": "https://www.jstor.org/stable/24900506"
      }
    ],
    "demos": [
      "value-iteration",
      "gridworld-rl",
      "markov",
      "pathfinding"
    ]
  }
};
