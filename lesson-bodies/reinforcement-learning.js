// GENERATED from content/lessons/reinforcement-learning/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "reinforcement-learning". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
  },
  "q-learning": {
    "level": "core",
    "body": {
      "intuition": [
        "Take the Bellman optimality equation, replace the expectation you cannot compute with a single sampled transition, and nudge your estimate toward it. That is Q-learning. Its sibling SARSA differs in exactly one symbol: where Q-learning uses the max over next actions, SARSA uses the value of the action it ACTUALLY TOOK. One symbol, and it changes what the algorithm is learning - Q-learning learns the value of the greedy policy no matter how it behaves, while SARSA learns the value of the policy it is actually following, exploration included.",
        "That distinction is abstract until you see cliff walking, which is why it is the canonical example. A gridworld with a cliff along the bottom edge: the shortest path runs right beside it, and stepping off is catastrophic. Q-learning learns the optimal path - along the edge - because the max in its target assumes it will act greedily from the next state onward. But it is BEHAVING epsilon-greedily, so it occasionally steps off and falls, and its online return is worse. SARSA's target includes the exploratory action, so the value of edge-adjacent states carries the cost of sometimes randomly stepping into the cliff; it learns the longer, safer path and earns more reward while learning. Neither is wrong. Q-learning answers 'what is the best policy', SARSA answers 'what is the best policy given that I will keep exploring'. Anneal epsilon to zero and both converge to the same optimal policy.",
        "This is the module's theme in its cleanest instance: SARSA is the algorithm that ACCOUNTS FOR ITS OWN BEHAVIOUR. The agent generates its own data, and SARSA's target treats that fact as part of the problem rather than as noise. There is a second consequence of the max that runs through the rest of the module. The max of noisy estimates is biased upward - by Jensen's inequality, the expectation of a maximum exceeds the maximum of expectations - so Q-learning systematically OVERESTIMATES action values whenever its estimates are noisy, which is always. That bias is small and correctable in a table; it becomes a defining problem once function approximation amplifies it in DQN, and it becomes the central problem in offline RL, where the overestimated actions can never be tried and corrected."
      ],
      "math": [
        {
          "h": "The one-symbol difference",
          "paras": [
            "Both are temporal-difference control: form a target from one sampled transition, take the difference from the current estimate, and step toward it. The only difference is which next-action value enters the target.",
            "Q-learning's max makes it OFF-POLICY - the target does not depend on what the behaviour policy will do next, so it can learn about the greedy policy from data generated any way at all. SARSA's a' is the action actually taken, which ties the target to the behaviour policy and makes it on-policy."
          ],
          "tex": "\\text{Q-learning:}\\quad Q(s,a) \\mathrel{+}= \\alpha\\Big[r + \\gamma \\max_{a'} Q(s',a') - Q(s,a)\\Big] \\\\[6pt] \\text{SARSA:}\\qquad\\; Q(s,a) \\mathrel{+}= \\alpha\\Big[r + \\gamma\\, Q(s',a') - Q(s,a)\\Big], \\;\\; a' \\sim \\pi(\\cdot\\mid s')",
          "texNote": "The bracketed quantity is the TD error. Note what off-policy buys and costs: Q-learning can reuse old data, learn from demonstrations, and learn the optimal policy while behaving safely - which is why every replay-based deep method descends from it. What it costs is the off-policy leg of the deadly triad, so once function approximation enters, this is the update that can diverge."
        },
        {
          "h": "Expected SARSA, and why Q-learning is a special case of it",
          "paras": [
            "SARSA's target uses a sampled next action, which adds variance for no benefit when you know the policy. Replace the sample with its expectation under the policy and the variance from that choice disappears entirely.",
            "The unification is the useful part: make the target policy greedy and the expectation collapses to a max, recovering Q-learning exactly. So these are one algorithm parameterized by the target policy."
          ],
          "tex": "Q(s,a) \\mathrel{+}= \\alpha\\Big[r + \\gamma \\sum_{a'} \\pi(a'\\mid s')\\,Q(s',a') - Q(s,a)\\Big] \\\\[4pt] \\pi = \\text{greedy} \\;\\Rightarrow\\; \\sum_{a'}\\pi(a'|s')Q(s',a') = \\max_{a'}Q(s',a')",
          "texNote": "Expected SARSA generally dominates SARSA: same bias, strictly lower variance, and it tolerates larger learning rates as a result. The cost is one sum over actions per update, which is negligible for small action sets and impossible for continuous ones - which is precisely where actor-critic methods take over."
        },
        {
          "h": "Maximization bias",
          "paras": [
            "The max in Q-learning's target is applied to ESTIMATES, not true values. Jensen's inequality then guarantees a systematic upward bias, because the max is a convex function of its arguments.",
            "The bias is largest when estimates are noisy and when there are many actions, since the max of many noisy variables drifts further above the true best. This is not an artefact of a bad implementation - it is a property of the estimator."
          ],
          "tex": "\\mathbb{E}\\Big[\\max_{a} \\hat{Q}(s,a)\\Big] \\;\\ge\\; \\max_{a} \\mathbb{E}\\big[\\hat{Q}(s,a)\\big] \\;=\\; \\max_a Q(s,a)",
          "texNote": "The fix is DECOUPLING: use one estimator to SELECT the maximizing action and a second, independent one to EVALUATE it. Double Q-learning maintains two tables and updates one at a time using the other for evaluation, which removes the bias without needing more data. The same idea reappears as Double DQN and again as the twin critics of continuous-control methods, so it is worth learning here where it is provable rather than there where it is a trick."
        }
      ],
      "code": [
        {
          "h": "Both algorithms, and the cliff-walking result that separates them",
          "paras": [
            "The implementations differ in one line. What separates them is not correctness but what question they answer, and cliff walking makes that visible in a single plot."
          ],
          "code": "def step(Q, s, a, r, s2, a2, done, alpha, gamma, off_policy):\n    if done:\n        target = r                              # NO bootstrap at a terminal state\n    elif off_policy:\n        target = r + gamma * Q[s2].max()        # Q-LEARNING: assumes greedy next\n    else:\n        target = r + gamma * Q[s2, a2]          # SARSA: the action ACTUALLY taken\n    Q[s, a] += alpha * (target - Q[s, a])\n\n# CLIFF WALKING (Sutton & Barto's example). A gridworld whose shortest path\n# runs along a cliff edge; stepping off is catastrophic and resets the episode.\n#\n#   Q-LEARNING  -> learns the OPTIMAL path, right along the edge, because the\n#                  max assumes it will act greedily from s' onward. But it is\n#                  BEHAVING eps-greedily, so it occasionally steps off.\n#                  Lower online return during learning.\n#   SARSA       -> its target contains the exploratory action, so states beside\n#                  the cliff inherit the cost of sometimes falling. Learns the\n#                  longer SAFE path. Higher online return during learning.\n#\n# NEITHER IS WRONG. They answer different questions:\n#   Q-learning: \"what is the best policy?\"\n#   SARSA:      \"what is the best policy GIVEN that I will keep exploring?\"\n# Anneal eps -> 0 and both converge to the same optimal policy.\n#\n# THIS IS THE MODULE'S THEME IN ONE EXAMPLE: SARSA is the algorithm that\n# accounts for its own behaviour. The agent generates its own data, and SARSA\n# treats that as part of the problem rather than as noise to be ignored.",
          "caption": "One line apart, and they learn different paths. The distinction is not which is correct but which question you are asking - and if you evaluate greedily rather than online, the entire visible difference disappears, which is why the evaluation protocol matters as much as the algorithm."
        },
        {
          "h": "Maximization bias, and decoupling as the fix",
          "paras": [
            "A demonstration you can run in twenty lines, and the reason Double Q-learning exists. The bias is not subtle once you construct a case that isolates it."
          ],
          "code": "# THE CLASSIC CONSTRUCTION. State A: go RIGHT for terminal reward 0, or LEFT\n# to state B. From B there are many actions, each with reward ~ N(-0.1, 1).\n# So LEFT is WORSE in expectation (-0.1 < 0) - going right is optimal.\n#\n# What Q-learning does early on: max over many noisy N(-0.1, 1) estimates is\n# positive with high probability, so Q(A, LEFT) looks GOOD and the agent\n# strongly prefers LEFT for a long time. It is not a bug and more data does\n# not immediately fix it - the estimator itself is biased upward.\n\n# DOUBLE Q-LEARNING: decouple SELECTION from EVALUATION.\nif np.random.rand() < 0.5:\n    a_star = Q1[s2].argmax()                    # Q1 SELECTS\n    Q1[s, a] += alpha * (r + gamma * Q2[s2, a_star] - Q1[s, a])   # Q2 EVALUATES\nelse:\n    a_star = Q2[s2].argmax()\n    Q2[s, a] += alpha * (r + gamma * Q1[s2, a_star] - Q2[s, a])\n\n# WHY IT WORKS: the noise that made an action look best in Q1 is INDEPENDENT\n# of the noise in Q2, so Q2's estimate of that action is unbiased. You are no\n# longer taking a max and reading its value off the same noisy numbers.\n#\n# The bias grows with the NUMBER OF ACTIONS and with estimate noise - which is\n# why it becomes severe in DQN (function approximation is a noise source that\n# never goes away) and catastrophic in offline RL (the overestimated action can\n# never be tried and corrected, so nothing pushes it back down).",
          "caption": "The estimator is biased, not the implementation. Decoupling selection from evaluation removes it, and this same trick reappears as Double DQN and as the twin critics of continuous-control methods - worth learning here where it is provable."
        }
      ],
      "useCases": [
        "Any small-to-moderate discrete control problem where a table fits: routing and scheduling, game agents on modest state spaces, inventory policies, elevator and traffic-light control. Tabular Q-learning is genuinely deployable and has convergence guarantees that nothing later in this module retains.",
        "SARSA specifically where the cost of exploration is real and borne during learning - a physical robot, a live system, anything where falling off the cliff has consequences. Learning the value of the policy you are actually running is the safer default when online performance matters.",
        "As the learning core inside a larger system: Q-learning's off-policy property means it can learn from logged data, from demonstrations, and from a replay buffer, which is the property every deep value-based method inherits.",
        "As a diagnostic baseline. If tabular Q-learning on a discretized version of your problem cannot solve it, the difficulty is in the problem formulation - the reward, the state, the horizon - and a deep method will not rescue it."
      ],
      "pitfalls": [
        "Comparing Q-learning and SARSA at fixed epsilon and concluding one is better. They optimize different objectives under exploration; anneal epsilon to zero and both reach the same optimal policy. The comparison is only meaningful once you say whether you care about online return or final greedy performance.",
        "Evaluating with the exploration policy still on. Q-learning's learned policy is the greedy one - evaluating it epsilon-greedily measures something you never intend to deploy, and it is exactly what makes Q-learning look worse than SARSA on cliff walking. Report both, and say which you mean.",
        "Bootstrapping at terminal states. The target at a terminal transition is the reward alone, with no gamma*Q(s') term. Getting this wrong produces a value function that looks plausible and is systematically wrong near the goal - the most common bug in a first implementation.",
        "Treating maximization bias as an implementation error. E[max] >= max E is a property of the estimator, guaranteed by Jensen. It grows with the number of actions and with estimate noise, and the fix is decoupling selection from evaluation rather than tuning.",
        "Using a constant learning rate and expecting convergence. The Robbins-Monro conditions require the step sizes to sum to infinity but their squares to converge. A constant alpha never settles - it keeps tracking, which is exactly what you want in a non-stationary problem and not what you want when claiming convergence.",
        "Sampling the next action for SARSA when you know the policy. Expected SARSA uses the expectation instead, giving identical bias with strictly lower variance for one sum over actions - it dominates plain SARSA whenever the action set is small enough to enumerate.",
        "Assuming the tabular convergence guarantees carry over. They require every state-action pair to be visited infinitely often and a table. Replace the table with a network and you have entered the deadly triad; nothing on this page still holds."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/mc-td",
          "text": "This lesson is TD applied to CONTROL rather than prediction. The bias-variance trade established there - Monte Carlo unbiased and noisy, one-step TD biased and stable - is the same axis n-step returns and TD(lambda) interpolate along here."
        },
        {
          "ref": "reinforcement-learning/dqn",
          "text": "Q-learning with a neural network in place of the table. Everything that needs to be added there - replay, target networks, Double DQN - is a repair for a guarantee that this lesson still has and that lesson gives up."
        },
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "Where maximization bias becomes the central problem rather than a correctable one: the overestimated action can never be tried, so no data ever arrives to push its value back down. The loop that fixes the bias online is exactly what offline learning removes."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The epsilon-greedy behaviour policy used here is the crudest exploration strategy, and that lesson is about what better ones buy. Cliff walking is really a statement about the interaction between exploration and the value being learned."
        },
        {
          "ref": "reinforcement-learning/mdp-bellman",
          "text": "Q-learning is that lesson's optimality equation with the expectation replaced by a sample. Keeping the max while sampling is what makes it off-policy - so the algorithm's defining property and its central weakness come from the same symbol."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the Q-learning update?",
          "a": "Q(s,a) += alpha * [r + gamma * max_a' Q(s',a') - Q(s,a)]. A sampled Bellman optimality backup with a step size."
        },
        {
          "q": "How does SARSA differ?",
          "a": "It uses Q(s', a') for the action actually taken rather than the max. One symbol, and it makes the algorithm on-policy."
        },
        {
          "q": "What does on-policy versus off-policy mean here?",
          "a": "SARSA learns the value of the policy it is following, exploration included. Q-learning learns the value of the greedy policy regardless of how it behaves."
        },
        {
          "q": "What happens in cliff walking?",
          "a": "Q-learning learns the optimal path along the cliff edge but falls off while exploring, so its online return is worse. SARSA learns the longer safe path and earns more during learning."
        },
        {
          "q": "Do they converge to the same policy?",
          "a": "Yes, if epsilon is annealed to zero. The difference is entirely about behaviour under persistent exploration."
        },
        {
          "q": "What is Expected SARSA?",
          "a": "Replace the sampled next action with its expectation under the policy. Same bias, strictly lower variance, at the cost of one sum over actions."
        },
        {
          "q": "How is Q-learning a special case of Expected SARSA?",
          "a": "Make the target policy greedy and the expectation over actions collapses to a max. They are one algorithm parameterized by the target policy."
        },
        {
          "q": "What is maximization bias?",
          "a": "E[max of estimates] >= max of true values, by Jensen. Taking a max over noisy estimates systematically overestimates, and the bias grows with the number of actions."
        },
        {
          "q": "How does Double Q-learning fix it?",
          "a": "Decouple selection from evaluation: one table picks the maximizing action, the other supplies its value. The noise that made an action look best is independent of the noise evaluating it."
        },
        {
          "q": "What are the tabular convergence conditions?",
          "a": "Robbins-Monro step sizes - sum of alpha infinite, sum of alpha squared finite - plus every state-action pair visited infinitely often."
        },
        {
          "q": "Why might you use a constant learning rate anyway?",
          "a": "Because it never stops tracking, which is what you want in a non-stationary environment. You give up the convergence claim in exchange for adaptivity."
        },
        {
          "q": "Why can't you bootstrap at a terminal state?",
          "a": "The terminal state has value zero by definition, so the target is the reward alone. Including gamma*Q(s') there makes values near the goal systematically wrong."
        }
      ],
      "standard": [
        {
          "q": "Explain the difference between Q-learning and SARSA and why it matters.",
          "a": "THE MECHANICAL DIFFERENCE is one symbol. Both are temporal-difference control: sample a transition, build a target, step toward it. Q-learning's target is r + gamma*max_a' Q(s',a'). SARSA's is r + gamma*Q(s',a') where a' is the action ACTUALLY TAKEN by the behaviour policy. WHAT THAT CHANGES CONCEPTUALLY. Q-learning's max assumes the agent will act greedily from the next state onward, so it converges to the value of the OPTIMAL policy no matter how the data was generated - that is what off-policy means, and it is why Q-learning can learn from a replay buffer, from demonstrations, or from any exploratory behaviour. SARSA's target contains the action its own policy chose, so it converges to the value of THE POLICY IT IS ACTUALLY FOLLOWING, exploration and all. THE EXAMPLE THAT MAKES IT CONCRETE - cliff walking. A gridworld with a cliff along the bottom; the shortest path runs right beside it and stepping off is catastrophic. Q-learning learns to walk the edge, because the greedy path is optimal. But it is behaving epsilon-greedily, so it periodically steps off, and its return DURING LEARNING is worse. SARSA's targets carry the expected cost of exploratory actions, so states next to the cliff get low values and it learns a longer, safer path with better online return. Neither is wrong - Q-learning answers 'what is the best policy', SARSA answers 'what is the best policy given that I will keep exploring'. Anneal epsilon to zero and they agree. WHY IT MATTERS PRACTICALLY. If exploration has real cost - a physical robot, a live recommender, anything where mistakes are expensive while learning - SARSA's objective is the one you want, because it prices your own exploration. If you will train in simulation and deploy greedily, Q-learning's objective is correct and its off-policy property is worth a great deal, since it lets you reuse data. THE EVALUATION POINT I would make, because it is where people go wrong: the entire visible difference depends on how you evaluate. Evaluate greedily and both look the same; evaluate online with exploration on and SARSA wins. So the comparison is meaningless until you state which you are measuring, and 'Q-learning was worse' usually means 'we evaluated with epsilon still on'. THE CONNECTION TO THE REST. Q-learning's max is also the source of maximization bias - the max of noisy estimates is biased upward by Jensen - which is a minor correctable issue in a table, a defining problem in DQN, and the central problem in offline RL. So the one symbol that gives Q-learning its most useful property also gives it its most persistent failure mode.",
          "deepDive": {
            "q": "Derive maximization bias and explain why it becomes progressively worse in DQN and then in offline RL.",
            "a": "THE DERIVATION. Suppose Q-hat(s,a) is an unbiased estimate of Q(s,a) for every a, with independent noise. We want the value of the best action, max_a Q(s,a), and we estimate it by max_a Q-hat(s,a). The max is a CONVEX function of its arguments, so Jensen's inequality gives E[max_a Q-hat(s,a)] >= max_a E[Q-hat(s,a)] = max_a Q(s,a). The estimator is biased UPWARD, and strictly so whenever there is noise and more than one action near the maximum. INTUITION FOR WHY. The max selects whichever estimate is largest, and an estimate is largest partly because its true value is high and partly because its noise happened to be positive. You are selecting FOR positive noise, then reading off the selected value as if it were unbiased. It is a winner's curse. THE SIZE OF THE BIAS grows with two things: the noise scale, and the NUMBER OF ACTIONS - with k actions the expected maximum of k independent zero-mean noises grows roughly like the standard deviation times sqrt(2 log k), so more actions means more bias, not merely more variance. THE CANONICAL EXAMPLE. State A: go right for reward 0 and terminate, or go left to state B, from which many actions each give reward ~ N(-0.1, 1). Left is worse in expectation. But early on the max over many noisy estimates from B is positive with high probability, so Q(A, left) looks good and the agent prefers left persistently. WHY IT WORSENS IN DQN. In a table, each Q(s,a) has its own entry and the noise comes only from sampling, which shrinks as visits accumulate - so the bias decays. With function approximation, the estimates are coupled through shared parameters and there is a persistent approximation error that does NOT vanish with more data: the network cannot represent the true Q exactly, so every state has residual error, and the max keeps selecting the positive residuals. Worse, that error is now correlated across states, so the overestimation propagates through bootstrapping rather than averaging out. This is exactly why Double DQN - use the online network to select and the target network to evaluate - produced a measurable improvement: it is the tabular fix transplanted, using two networks that already existed. WHY IT IS CATASTROPHIC IN OFFLINE RL. Online, there is a self-correcting loop: if Q(s,a) is overestimated, the greedy policy tries a, observes the real reward, and the estimate comes down. That loop is the mechanism by which optimism is repaired, and it is why optimism is a FEATURE online - it drives exploration. Remove the environment and the loop is gone. The max in the target ranges over ALL actions including those never present in the dataset, where the network's output is pure extrapolation and unconstrained by any data. Those out-of-distribution actions get overestimated, the max selects them precisely because they are overestimated, the error propagates through bootstrapping to earlier states, and nothing ever arrives to contradict it. The estimates can diverge. THE UNIFYING READING, which is the module's theme: the same optimism is a feature when the agent can act on it and a pathology when it cannot. Every offline method is a way of preventing the max from ranging over actions the data cannot support - CQL by pushing down out-of-distribution values explicitly, IQL by never querying an out-of-dataset action at all. Understanding that these are all responses to Jensen's inequality plus a missing feedback loop is more useful than remembering three algorithms."
          }
        },
        {
          "q": "When would you choose SARSA over Q-learning in a real system?",
          "a": "The decision turns on whether exploration costs are borne for real, and on whether you can reuse data. CHOOSE SARSA WHEN EXPLORATION IS EXPENSIVE AND ONLINE. A physical robot that can damage itself, a live recommendation or pricing system where every exploratory action is a real user's experience, a control system with safety consequences. SARSA's value function prices its own exploration, so it learns policies with MARGIN - it stays away from states where a random action would be catastrophic. That is not conservatism bolted on, it is what its objective actually is, and it is the right objective when the exploration is not free. Cliff walking is a toy version of exactly this situation. CHOOSE Q-LEARNING WHEN YOU WILL DEPLOY GREEDILY. If training happens in simulation and the deployed policy has no exploration, then SARSA is optimizing for a behaviour you will never exhibit, and Q-learning's target matches your deployment. Most simulation-trained agents are in this case. THE OTHER AXIS, WHICH USUALLY DOMINATES IN PRACTICE: DATA REUSE. Q-learning is off-policy, so it can learn from a replay buffer, from logged historical data, from human demonstrations, from an older policy's trajectories. SARSA is on-policy, so its data is stale the moment the policy changes and must largely be discarded. In any setting where interaction is the scarce resource - which is most real settings - that sample-efficiency difference is larger than the safety difference and usually decides it. This is why essentially every deep value-based method descends from Q-learning rather than SARSA. WHAT I WOULD ACTUALLY DO in a safety-sensitive online system. I would not simply pick SARSA. I would use Q-learning for its data efficiency and handle safety EXPLICITLY - action masking or a safety layer that filters catastrophic actions before they are taken, plus a conservative exploration schedule. That is more reliable than hoping the value function has learned to avoid the cliff, because it does not depend on the value function being correct. SARSA's implicit safety is a real property, but it is a soft one that emerges from learning, and if what you need is 'never step off the cliff', an explicit constraint beats a learned tendency. THE MIDDLE OPTION worth naming. Expected SARSA gives you SARSA's on-policy semantics with strictly lower variance, and it generalizes: with a greedy target policy it is Q-learning, with the behaviour policy it is SARSA, and you can pick any target policy in between - for instance, a slightly-less-exploratory version of your behaviour policy. That gives a continuous dial between the two objectives rather than a binary choice, and it is under-used."
        },
        {
          "q": "What conditions guarantee Q-learning converges, and which ones do real systems violate?",
          "a": "THE GUARANTEE. Tabular Q-learning converges to Q* with probability one given three conditions. (1) EVERY STATE-ACTION PAIR IS VISITED INFINITELY OFTEN. Without this there are entries you never update and cannot know. (2) ROBBINS-MONRO STEP SIZES: the sum of alpha_t diverges, so you can still travel arbitrarily far from your initialization, while the sum of alpha_t squared converges, so the noise averages out and the iterate settles. A schedule like 1/t satisfies both; a constant alpha satisfies only the first. (3) BOUNDED REWARDS and a discount below one, which is what makes the underlying operator a contraction. The proof is a stochastic-approximation argument: Q-learning is a noisy fixed-point iteration on a contraction mapping, and the step-size conditions are exactly what let the noise be averaged away without stalling. WHICH ONES REAL SYSTEMS VIOLATE - all three, routinely. (1) INFINITE VISITATION IS IMPOSSIBLE in any large or continuous space; you visit a vanishing fraction of the state-action space. This is the exploration problem, and it is why the guarantee is asymptotic in a way that has little to say about finite-time behaviour. (2) CONSTANT LEARNING RATES ARE STANDARD, deliberately. A decaying alpha stops learning, and in a non-stationary environment - which includes any multi-agent setting, any system with drifting dynamics, and notably any deep RL setup where the representation is itself changing - you WANT to keep tracking. So practitioners knowingly trade the convergence claim for adaptivity, and the honest statement is that the algorithm tracks rather than converges. (3) THE TABLE IS REPLACED BY A NETWORK, which voids the argument entirely. This is the big one. The proof requires updating one entry without affecting others; a function approximator couples every entry, and the composition of the Bellman operator with a projection onto the function class need not be a contraction in any norm. That is the deadly triad, and Baird's counterexample shows genuine divergence with no bug present. WHAT THIS MEANS PRACTICALLY, which is my actual answer. The tabular guarantee is not a promise about your deep RL system; it is a statement about the idealized algorithm, and its value is DIAGNOSTIC. When a deep agent misbehaves, ask which condition is being violated hardest. Poor coverage of the state space points at exploration. Instability that appears with off-policy data and disappears on-policy points at the triad. A value function that grows without bound points at the max plus bootstrapping. Each of those has a different fix - better exploration, more on-policy data or importance correction, target networks and Double DQN respectively. THE HABIT I WOULD RECOMMEND. Keep a small tabular version of the problem where the conditions DO hold. If your method fails there, it is broken in a way that has nothing to do with approximation, and you have saved yourself a long investigation of the wrong layer.",
          "deepDive": {
            "q": "Explain the deadly triad concretely and why on-policy TD with linear approximation is safe while off-policy is not.",
            "a": "THE THREE INGREDIENTS. (1) FUNCTION APPROXIMATION - values are represented by a parametric function rather than a table, so updating one state changes others. (2) BOOTSTRAPPING - the target contains your own current estimate, as in TD and Q-learning, rather than an actual observed return as in Monte Carlo. (3) OFF-POLICY TRAINING - the distribution of states you update on differs from the distribution the target policy would induce. Any TWO of these together are safe. All three can diverge, and the divergence is genuine rather than a numerical artefact. WHY, IN TERMS OF NORMS - this is the crux. The Bellman operator T is a contraction in the SUP-norm. With function approximation you cannot represent TV, so each update effectively applies T then PROJECTS back onto the representable set: the operator is Pi-T. The projection Pi is an orthogonal projection with respect to a weighted L2 norm, where the weights are the STATE DISTRIBUTION YOU SAMPLE FROM. A projection is a non-expansion in its OWN norm. So you are composing a contraction in the sup-norm with a non-expansion in a weighted L2 norm - two different norms - and the composition has no guarantee at all. It can expand, and the parameters can grow without bound. WHY ON-POLICY IS SAFE. If you sample states from the stationary distribution induced by the policy you are evaluating, then a special relationship holds: T is a contraction in THAT weighted L2 norm too, not just in the sup-norm. The key fact is that the policy's own transition matrix does not increase the norm weighted by its own stationary distribution - intuitively, transitioning according to the policy leaves the distribution unchanged, so it cannot amplify a norm defined by that distribution. Now both operators contract in the SAME norm, the composition contracts, and on-policy linear TD converges - this is the classic Tsitsiklis and Van Roy result. WHY OFF-POLICY BREAKS IT. Update on a distribution mu that is not the target policy's stationary distribution, and that relationship fails: the transition operator CAN expand the mu-weighted norm, because mu is not its fixed point. Concretely, you repeatedly update states that the target policy rarely visits, using bootstrap targets from states it visits often, and there is no mechanism forcing consistency. Baird's counterexample is a seven-state MDP with linear features where exactly this happens and the weights diverge geometrically. WHAT THIS PREDICTS about the fixes, which is why the theory earns its keep. Target networks attack the BOOTSTRAPPING leg: freezing the target for many steps makes each phase look like supervised regression toward a fixed function, which is stable, and only the periodic refresh reintroduces the coupling. Experience replay makes the data MORE off-policy - it is a sample-efficiency device that worsens this leg, which is why it needs the target network alongside it. Importance-sampling corrections attack the off-policy leg directly, at the cost of enormous variance over long horizons. Gradient-TD methods change the objective to one whose true gradient is being followed, so the norm mismatch never arises. And on-policy methods like A2C and PPO sidestep the whole thing by keeping the data distribution matched to the policy - which is a large part of why they are more stable than value-based methods, and why they are less sample-efficient, since matched data cannot be reused."
          }
        },
        {
          "q": "Explain n-step returns and TD(lambda) as a bridge between this lesson and Monte Carlo.",
          "a": "THE AXIS. One-step TD bootstraps immediately: target = r + gamma*Q(s'). Monte Carlo waits for the episode to end and uses the actual return with no bootstrap at all. Those are the endpoints of a spectrum, and n-step returns are the interior: take n real rewards, then bootstrap on the value estimate n steps out. THE BIAS-VARIANCE TRADE, which is the whole content. One-step TD has LOW VARIANCE - only one reward and one transition enter the target - and HIGH BIAS, because it leans entirely on a current estimate that is wrong early in training. Monte Carlo is UNBIASED, since the observed return is a genuine sample of the return, and has HIGH VARIANCE, because it accumulates the randomness of an entire trajectory. n interpolates: more real reward means less bias and more variance. There is typically an interior optimum, and it is usually well above one - n in the range of three to twenty is often much better than either extreme, which is a practical finding people under-use. THE SECOND EFFECT, credit assignment speed. With one-step TD, information about a reward propagates backward one state per update, so a reward at the end of a long corridor takes many sweeps to reach the start. With n-step it moves n states per update. In sparse-reward problems this is often the dominant consideration, ahead of the bias-variance argument. TD(LAMBDA). Rather than picking one n, take a geometrically weighted average of ALL n-step returns with decay lambda - the lambda-return. lambda = 0 recovers one-step TD, lambda = 1 recovers Monte Carlo, and intermediate values blend smoothly. The reason to prefer this to a single n is partly that the average has lower variance than any individual term, and partly the implementation: ELIGIBILITY TRACES let you compute it online, incrementally, without waiting for the episode to end. Each state keeps a trace of how recently and how often it was visited, decayed by gamma*lambda, and every TD error updates all states in proportion to their traces. That is the backward view, and it is equivalent to the forward view of averaging n-step returns. WHERE THIS SHOWS UP IN MODERN WORK. Generalized advantage estimation is exactly TD(lambda) applied to ADVANTAGES rather than values, with the same lambda knob doing the same bias-variance job, and it is a standard component of PPO. So this is not historical material - it is the machinery inside the policy-gradient methods later in the module, which is a good reason to understand it here where it is simple. THE OFF-POLICY COMPLICATION worth flagging. n-step returns with off-policy data require importance-sampling corrections whose variance grows with n, because you are correcting for a product of n policy ratios. This is why n-step methods sit more naturally in on-policy algorithms, and why off-policy multi-step methods - Retrace, Tree Backup, V-trace - exist as a distinct family whose whole purpose is bounding that variance."
        },
        {
          "q": "Your tabular Q-learning agent's values keep growing without bound. What is happening?",
          "a": "In a genuinely tabular setting with a discount below one, unbounded growth is not supposed to happen, so this is a bug or a broken assumption rather than a tuning problem. I would work through it in this order. CHECK 1: IS THERE ACTUALLY A DISCOUNT? If gamma = 1 in a CONTINUING task with any positive reward on a cycle, the true value IS infinite and the algorithm is correct. This is the most common cause. gamma = 1 is only legitimate in episodic tasks that provably terminate. Related: a time-limit truncation being recorded as a normal transition means episodes never really end from the learner's point of view. CHECK 2: TERMINAL BOOTSTRAPPING. If the target at a terminal transition is r + gamma*max Q(s_terminal) instead of just r, and the terminal entry is being updated by other paths, you have created a loop that feeds value back into itself. This produces exactly the symptom and it is the classic first-implementation bug. Print the terminal state's Q values - they must be zero and must never be a bootstrap source. CHECK 3: LEARNING RATE ABOVE ONE, or an update written as Q += alpha*target rather than Q += alpha*(target - Q). The second form is a moving average and is stable for alpha in (0,1]; the first is an accumulation and diverges. This is a transcription error people make and then debug at the wrong level. CHECK 4: A REWARD LOOP - a self-transition or short cycle with positive net reward. Then the value really is large and the algorithm has correctly found it. This is specification gaming, and the diagnostic is to look at which state the growth concentrates in and inspect its transitions. CHECK 5: IS IT ACTUALLY TABULAR? If states are being hashed, discretized, or featurized in any way that makes two distinct situations share an entry, you have function approximation with aliasing, and the guarantees are gone. This includes the sneaky case where a dictionary keyed on a mutable object is collapsing states you believed were distinct. CHECK 6: NUMERICAL - rewards on a very large scale plus a long horizon can overflow, and NaN propagation makes everything look like divergence. Print the reward magnitudes. HOW I WOULD LOCALIZE IT FAST. Log the maximum Q value and WHICH state-action pair attains it, every few hundred steps. Divergence is nearly always concentrated: one entry runs away and drags its predecessors along. Looking at that entry's transitions and rewards usually names the cause immediately, and it is far more informative than watching an aggregate curve. THE THING I WOULD SAY ABOUT PRIORS. In tabular RL with a proper discount, divergence means an assumption is broken - most often that the task terminates, or that terminal states are handled correctly. In DEEP RL the same symptom has a much wider differential, because the deadly triad permits genuine divergence with no bug at all. Knowing which regime you are in determines whether you are looking for a mistake or for an instability, and that is worth establishing before spending an afternoon."
        },
        {
          "q": "How does the exploration policy interact with what Q-learning learns?",
          "a": "More than people expect, and in two distinct ways that are worth separating. WAY ONE: COVERAGE, which affects whether learning is possible at all. Q-learning's convergence requires every state-action pair to be visited infinitely often. Epsilon-greedy explores by taking uniformly random actions with probability epsilon, which is a random walk over the state space - and a random walk reaches a state at the end of a long corridor with probability exponentially small in its length. So in sparse-reward or deep problems, epsilon-greedy does not merely explore slowly, it effectively never reaches the reward, and the agent has nothing to learn from. No amount of training fixes this because the data does not contain the signal. This is why the exploration lesson matters and why methods like optimistic initialization, count-based bonuses, and posterior sampling exist. WAY TWO: WHAT THE VALUES MEAN, which is subtler and is the cliff-walking story. Q-learning's TARGET is off-policy, so in the limit its values are the optimal ones regardless of behaviour. But the DISTRIBUTION of updates is set by the behaviour policy, so which states are accurate at any finite time depends entirely on where you have been. An epsilon-greedy behaviour policy concentrates updates near the current greedy path, so values far from it stay poor - and if the greedy path is a local optimum, exploration is what determines whether you ever discover otherwise. THE INTERACTION THAT SURPRISES PEOPLE: epsilon affects the LEARNED POLICY of SARSA and not of Q-learning, but it affects the DATA of both. So Q-learning's asymptotic answer is exploration-independent while its finite-time behaviour is exploration-dominated, and since every real run is finite, in practice exploration dominates both. A PRACTICAL CONSEQUENCE. When people report that Q-learning 'converged to a suboptimal policy', it is almost always an exploration failure rather than a learning failure - the algorithm converged correctly on the data it saw, and the data did not contain the better option. The diagnostic separating these is the one I keep coming back to: give the agent data from a good policy - a demonstration, or an exploratory policy you know covers the space - and see whether it then learns the good policy. If yes, the learner is fine and exploration is the problem. If no, the learner or the representation is the problem. WHAT I WOULD USE instead of epsilon-greedy where it matters. Optimistic initialization is nearly free and remarkably effective in tabular settings - initialize Q high and the agent is drawn to unvisited pairs automatically, because unvisited means still-optimistic. Count-based bonuses generalize it. Boltzmann exploration scales exploration with value uncertainty rather than uniformly. And a decaying epsilon schedule is the minimum, since a constant epsilon means you never stop paying the exploration cost and never converge to the greedy policy's performance."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Q-learning vs SARSA: the one-symbol difference",
        "back": "Q-learning target: r + gamma*MAX_a' Q(s',a') - assumes greedy continuation, OFF-policy. SARSA target: r + gamma*Q(s',a') for the action ACTUALLY TAKEN - ON-policy, learns the value of the policy it is running."
      },
      {
        "type": "intuition",
        "front": "Cliff walking",
        "back": "Q-learning learns the OPTIMAL edge path but falls off while exploring (worse ONLINE return). SARSA prices its own exploration and learns the longer SAFE path (better online). Anneal eps->0 and both reach optimal. The difference vanishes if you evaluate greedily."
      },
      {
        "type": "formula",
        "front": "Maximization bias",
        "back": "E[max_a Qhat(s,a)] >= max_a Q(s,a) by Jensen - the max is convex. You select FOR positive noise then read the selected value as unbiased: a winner's curse. Grows with noise AND with the NUMBER of actions (~sigma*sqrt(2 log k))."
      },
      {
        "type": "definition",
        "front": "Double Q-learning",
        "back": "Decouple SELECTION from EVALUATION: Q1 picks argmax, Q2 supplies its value (and vice versa, chosen at random each step). The noise that made an action look best is independent of the noise evaluating it. Reappears as Double DQN and as twin critics."
      },
      {
        "type": "intuition",
        "front": "Expected SARSA unifies the two",
        "back": "Target = r + gamma*sum_a' pi(a'|s')Q(s',a'). Same bias as SARSA, strictly LOWER variance (tolerates bigger alpha). Make pi greedy and the sum collapses to a max = Q-learning. One algorithm parameterized by the TARGET policy."
      },
      {
        "type": "pitfall",
        "front": "Never bootstrap at a terminal state",
        "back": "Target is the reward ALONE - no gamma*Q(s') term. Getting it wrong makes values near the goal systematically wrong, and it can cause unbounded growth if the terminal entry feeds back. The most common first-implementation bug."
      },
      {
        "type": "definition",
        "front": "Tabular Q-learning convergence conditions",
        "back": "(1) every (s,a) visited infinitely often; (2) Robbins-Monro steps: sum alpha = inf, sum alpha^2 < inf; (3) bounded rewards, gamma < 1. Real systems violate ALL THREE - and knowingly, since constant alpha buys tracking in non-stationary problems."
      },
      {
        "type": "intuition",
        "front": "Why maximization bias worsens down the module",
        "back": "TABULAR: noise is sampling noise and decays with visits. DQN: approximation error PERSISTS and is correlated across states, so it propagates through bootstrapping. OFFLINE: the overestimated action can never be TRIED, so no data ever pushes it back down."
      },
      {
        "type": "pitfall",
        "front": "Comparing Q-learning and SARSA at fixed epsilon",
        "back": "They optimize different objectives UNDER EXPLORATION. Anneal eps->0 and both reach the same optimal policy. State whether you measure ONLINE return or FINAL GREEDY performance - 'Q-learning was worse' usually means 'we evaluated with epsilon on'."
      },
      {
        "type": "intuition",
        "front": "n-step returns and TD(lambda)",
        "back": "One-step TD = low variance, high bias. MC = unbiased, high variance. n interpolates, and the optimum is usually WELL ABOVE 1 (n~3-20). Second effect: credit propagates n states per update instead of 1 - often dominant in sparse-reward tasks. GAE is TD(lambda) on ADVANTAGES."
      },
      {
        "type": "intuition",
        "front": "Exploration affects Q-learning's DATA, not its target",
        "back": "Asymptotically the values are exploration-independent (off-policy target). But WHICH states are accurate at finite time is set entirely by where you went - and every real run is finite. 'Converged to a suboptimal policy' is almost always an exploration failure."
      },
      {
        "type": "intuition",
        "front": "The exploration-vs-learning diagnostic",
        "back": "Give the agent data from a KNOWN-GOOD policy (a demonstration, or a covering exploratory policy). If it then learns well, exploration was the problem. If not, the learner or representation is. One experiment, resolves an argument people otherwise have repeatedly."
      }
    ],
    "refs": [
      {
        "title": "Watkins & Dayan (1992), Q-learning",
        "url": "https://link.springer.com/article/10.1007/BF00992698"
      },
      {
        "title": "Rummery & Niranjan (1994), On-line Q-Learning Using Connectionist Systems (SARSA)",
        "url": "http://mi.eng.cam.ac.uk/reports/svr-ftp/auto-pdf/rummery_tr166.pdf"
      },
      {
        "title": "van Hasselt (2010), Double Q-learning",
        "url": "https://papers.nips.cc/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html"
      },
      {
        "title": "van Seijen et al. (2009), A Theoretical and Empirical Analysis of Expected Sarsa",
        "url": "https://ieeexplore.ieee.org/document/4927542"
      },
      {
        "title": "Jaakkola, Jordan & Singh (1994), On the Convergence of Stochastic Iterative Dynamic Programming Algorithms",
        "url": "https://direct.mit.edu/neco/article/6/6/1185/5850"
      }
    ],
    "demos": [
      "sarsa-vs-qlearning",
      "gridworld-rl",
      "td-lambda",
      "double-q-learning"
    ]
  },
  "bandits": {
    "level": "core",
    "body": {
      "intuition": [
        "A multi-armed bandit is an MDP with one state. Actions give rewards, and that is all - no transitions, no credit assignment, no horizon. Stripping those away is the point: what remains is the exploration problem alone, in a setting clean enough to prove things about. Every insight here transfers upward, and studying it in the full MDP first means confusing exploration failures with credit-assignment failures, which is a large fraction of the time people lose debugging RL.",
        "The dilemma is that the agent chooses its own data. Pull the arm you currently believe is best and you learn nothing about the others; pull a different one and you pay for the information. The cost is REGRET - the gap between what you earned and what an oracle who knew the best arm would have earned. And regret's shape, not its size, is the thing to internalize. Fixed epsilon-greedy explores at a constant rate forever, so it wastes a constant fraction of every step and its regret grows LINEARLY - it never stops paying. UCB and Thompson sampling explore less as they learn more, and their regret grows only LOGARITHMICALLY. Lai and Robbins proved that logarithmic is the best any algorithm can do, so the good methods are not merely better, they are order-optimal.",
        "The unifying idea behind the good methods is OPTIMISM IN THE FACE OF UNCERTAINTY: act as if each arm is as good as it plausibly could be, and the arm you choose is then either genuinely good - fine, you collect reward - or over-estimated, in which case pulling it produces data that corrects the estimate. Either outcome is useful, which is why optimism is not a heuristic but a mechanism. Notice this is the same optimism that Q-learning's max produces as a bias, and the reason that bias is a FEATURE online and a pathology offline: online, acting on an over-estimate generates the data that repairs it. Remove the ability to act and optimism has no corrective loop, which is exactly what breaks offline RL. The bandit setting is where that mechanism is clearest."
      ],
      "math": [
        {
          "h": "Regret, and why its shape is the whole story",
          "paras": [
            "Regret compares your cumulative reward against always pulling the best arm. Writing it as a sum over arms of gap times pull-count shows immediately what an algorithm must do: pull suboptimal arms a sublinear number of times.",
            "Any algorithm that explores at a fixed rate pulls every arm a constant fraction of the time, so its regret is linear and it never stops paying."
          ],
          "tex": "R_T = T\\mu^{*} - \\mathbb{E}\\Big[\\sum_{t=1}^{T} \\mu_{a_t}\\Big] = \\sum_{a} \\underbrace{\\Delta_a}_{\\mu^{*}-\\mu_a} \\cdot \\mathbb{E}[N_a(T)]",
          "texNote": "Read the right-hand form as a budget: each suboptimal arm costs its gap times how often you pull it. Lai and Robbins showed any consistent algorithm must pull a suboptimal arm at least about log(T)/KL(mu_a, mu*) times - you cannot distinguish a near-optimal arm without sampling it - so logarithmic regret is a LOWER bound, not just what the good algorithms happen to achieve."
        },
        {
          "h": "UCB1: optimism with a confidence interval",
          "paras": [
            "Pull the arm with the highest plausible mean rather than the highest estimated mean. The bonus term is a Hoeffding confidence radius: it shrinks as an arm is pulled more, and grows slowly with total time so no arm is abandoned forever.",
            "The derivation is worth knowing because it explains every term. Hoeffding gives a deviation bound of order sqrt(log(1/delta) / 2n); choosing delta about 1/t^4 so the union bound over arms and rounds still holds yields the 2 ln t numerator."
          ],
          "tex": "a_t = \\arg\\max_a \\left[\\, \\hat{\\mu}_a + c\\sqrt{\\frac{2\\ln t}{N_a}} \\,\\right], \\qquad R_T = O\\!\\left(\\sum_{a:\\Delta_a>0} \\frac{\\ln T}{\\Delta_a}\\right)",
          "texNote": "The two terms are exploitation and exploration made explicit and comparable, in the same units as reward - which is what makes UCB feel principled where epsilon-greedy feels arbitrary. Note the regret is INVERSELY proportional to the gap: nearly-tied arms are expensive to separate, which is correct, since distinguishing them requires many samples and also costs little to get wrong."
        },
        {
          "h": "Thompson sampling: act according to the probability you are best",
          "paras": [
            "Maintain a posterior over each arm's mean, sample one value from each posterior, and pull the argmax of the samples. For Bernoulli rewards the Beta prior is conjugate, so the update is two integer increments.",
            "This is probability matching: an arm is chosen with exactly the probability that it is optimal under the current posterior. Exploration emerges from posterior width rather than from an added bonus."
          ],
          "tex": "\\theta_a \\sim \\mathrm{Beta}(\\alpha_a, \\beta_a), \\quad a_t = \\arg\\max_a \\theta_a, \\qquad (\\alpha_a, \\beta_a) \\mathrel{+}= (r, 1-r)",
          "texNote": "Also logarithmic regret, and it frequently beats UCB empirically while being simpler to implement and far easier to extend - to contextual settings, to delayed feedback, and to batched updates, where UCB's confidence bookkeeping gets awkward. Its practical weakness is that it needs a posterior, so with neural networks you must approximate one, which is what bootstrapped ensembles and randomized priors are for."
        }
      ],
      "code": [
        {
          "h": "Four strategies, and what separates them",
          "paras": [
            "All four are a few lines. What distinguishes them is not complexity but whether the exploration rate DECAYS as knowledge accumulates - which is what separates linear from logarithmic regret."
          ],
          "code": "def epsilon_greedy(Q, N, t, eps=0.1):\n    return np.random.randint(k) if np.random.rand() < eps else Q.argmax()\n    # FIXED eps -> explores forever -> LINEAR regret. Decay eps ~ 1/t and it\n    # becomes logarithmic, which is the cheapest possible fix and is skipped\n    # more often than it should be.\n\ndef optimistic(Q, N, t):\n    return Q.argmax()          # ...with Q INITIALIZED HIGH, e.g. Q0 = 5 >> max mu\n    # No explicit exploration at all: an unpulled arm still looks great, so\n    # the greedy agent is drawn to it automatically. Nearly free, remarkably\n    # effective, and it stops working in NON-STATIONARY problems because the\n    # initial optimism is spent once and never renewed.\n\ndef ucb1(Q, N, t, c=2.0):\n    if (N == 0).any():\n        return int(np.flatnonzero(N == 0)[0])      # pull each arm once first\n    return (Q + c * np.sqrt(2 * np.log(t) / N)).argmax()\n\ndef thompson(alpha, beta):\n    return np.random.beta(alpha, beta).argmax()     # sample, then act greedily\n\n# REGRET SHAPE - plot cumulative regret against LOG t and read the slope:\n#   fixed eps-greedy .... straight line vs t      -> LINEAR, never stops paying\n#   decaying eps ........ straight line vs log t  -> logarithmic\n#   UCB1 ................ straight vs log t       -> logarithmic, order-optimal\n#   Thompson ............ straight vs log t       -> logarithmic, often best\n#\n# UCB LOOKS BAD AT SMALL T. It must pull every arm once and the log t numerator\n# has barely grown, so at T=100 with many arms it is still in its forced-\n# exploration phase. Benchmarking at short horizons systematically favours\n# eps-greedy and tells you nothing about asymptotic behaviour.",
          "caption": "The separating property is whether the exploration rate decays with knowledge. Note the benchmarking trap: UCB is provably order-optimal and looks poor at small T, so a short-horizon comparison inverts the true ranking."
        },
        {
          "h": "Non-stationarity: the step size decides whether you can adapt",
          "paras": [
            "The most practically important result in this lesson, and the one least often stated. A sample average is the right estimator for a fixed mean and the wrong one for a moving target - and the difference is one line."
          ],
          "code": "# SAMPLE AVERAGE (step 1/N): each observation is weighted equally forever.\nQ[a] += (r - Q[a]) / N[a]\n\n# CONSTANT STEP (alpha): an exponentially weighted average of RECENT rewards.\nQ[a] += alpha * (r - Q[a])\n\n# Unrolling the constant-alpha update shows what it actually computes:\n#   Q_n = (1-alpha)^n Q_0 + sum_i alpha (1-alpha)^(n-i) r_i\n# an exponential recency weighting with effective memory ~ 1/alpha.\n#\n# WHY IT MATTERS. If the arms' means DRIFT, the sample average has effectively\n# frozen by the time drift occurs - its step size is 1/N, which is tiny after\n# many pulls, so it cannot move. It converges beautifully to a mean that is no\n# longer true. Constant alpha keeps tracking, at the cost of never settling.\n#\n#   stationary problem  -> 1/N converges; constant alpha leaves residual noise\n#   drifting problem    -> 1/N FREEZES;   constant alpha tracks\n#\n# This is exactly the Robbins-Monro trade from Q-learning: the conditions that\n# guarantee convergence are precisely the conditions that prevent adaptation.\n# Non-stationary problems also need RENEWED optimism - optimistic init is spent\n# once - which is why UCB's slowly-growing log t numerator, or a sliding window,\n# or discounted counts, are the standard fixes.",
          "caption": "One line apart, and one of them cannot adapt. The conditions guaranteeing convergence are exactly the conditions preventing adaptation - the same trade as Q-learning's Robbins-Monro schedule, visible here in two lines."
        }
      ],
      "useCases": [
        "Online content, layout and creative selection - the canonical industrial bandit, where each arm is a variant, feedback is immediate, and the alternative is an A/B test that pays full regret on the losing arm for the whole test duration.",
        "Contextual bandits for recommendation, ranking and ad selection, where the arm's value depends on user features. This is the bridge to full RL and the setting where most deployed 'RL' actually lives, because there is no long-horizon credit assignment to get wrong.",
        "Adaptive clinical trials and any experiment where assigning a subject to a worse arm has real cost - the problem Thompson was originally motivated by in 1933, and where minimizing regret is an ethical argument rather than an efficiency one.",
        "Hyperparameter search and resource allocation: successive halving and Hyperband are bandit algorithms over configurations, and Bayesian optimization is the same optimism-under-uncertainty idea with a Gaussian-process posterior in place of per-arm counts."
      ],
      "pitfalls": [
        "Using a fixed exploration rate. Constant epsilon means constant regret per step, so cumulative regret is LINEAR and the agent never stops paying for information it already has. Decaying epsilon is the cheapest possible fix and turns it logarithmic.",
        "Benchmarking at short horizons. UCB must pull every arm once and its log t bonus has barely grown early on, so with many arms it looks poor at small T and excellent later. A short-horizon comparison systematically favours epsilon-greedy and says nothing about the asymptotics the theory is about.",
        "Using a sample average in a non-stationary problem. The 1/N step size shrinks to nothing, so the estimate freezes and converges accurately to a mean that is no longer true. Constant alpha tracks; the price is that it never settles.",
        "Relying on optimistic initialization when things drift. The initial optimism is spent once and never renewed, so it drives early exploration and then stops entirely. Non-stationary problems need a renewing mechanism - UCB's growing log t, sliding windows, or discounted counts.",
        "Assuming epsilon-greedy suffices in a real MDP. Uniform random exploration is a random walk, so reaching a state at the end of a corridor of length n has probability exponentially small in n. In sparse-reward problems the agent does not explore slowly - it effectively never finds the reward, and no amount of training helps.",
        "Comparing bandit algorithms on a single problem instance. Regret is a statement about expectation over problem instances and noise; a single run with a lucky early pull can invert the ranking. Average over many random instances and report the spread.",
        "Forgetting that a bandit assumes actions do not change the state. If pulling an arm affects future rewards - a user who tires of a recommendation, a price that shifts demand - the bandit formulation is wrong and its guarantees do not apply, no matter how well it performs in an offline replay."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/q-learning",
          "text": "Optimism appears there as a BIAS - the max of noisy estimates over-estimates - and here as a MECHANISM. The reconciliation is that acting on an over-estimate generates the data that corrects it, which is why the same property is a feature online and a pathology offline."
        },
        {
          "ref": "reinforcement-learning/dqn",
          "text": "Epsilon-greedy is what DQN actually uses, and it is why hard-exploration games resisted it for years. Bootstrapped ensembles and randomized priors are attempts to bring this lesson's posterior-sampling idea into deep networks."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "Thompson sampling is posterior sampling as a decision rule. The Beta-Bernoulli conjugacy that makes the update two integer increments is the same machinery, and the practical difficulty with neural networks is exactly the difficulty of approximate posteriors."
        },
        {
          "ref": "ml-theory/gaussian-processes",
          "text": "Bayesian optimization is this lesson with a GP posterior over a continuous action space, and its acquisition functions are UCB and Thompson sampling by name. Same mechanism, different uncertainty model."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The explicit alternative. A fixed-allocation A/B test pays full regret on the losing arm for the entire test, but gives clean unbiased estimates and a valid p-value; adaptive allocation minimizes regret and breaks the standard inference. Which you want depends on whether you are deciding or measuring."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a multi-armed bandit?",
          "a": "An MDP with a single state: actions yield rewards with no transitions and no credit assignment. It isolates the exploration problem."
        },
        {
          "q": "What is regret?",
          "a": "The gap between the cumulative reward of an oracle that always pulls the best arm and what you actually earned. Equivalently, the sum over arms of gap times expected pull count."
        },
        {
          "q": "Why does fixed epsilon-greedy have linear regret?",
          "a": "It explores at a constant rate forever, so it pulls suboptimal arms a constant fraction of the time and pays a constant cost per step indefinitely."
        },
        {
          "q": "What is the Lai-Robbins bound?",
          "a": "Any consistent algorithm must pull a suboptimal arm on the order of log(T)/KL times. Logarithmic regret is a lower bound, so UCB and Thompson are order-optimal rather than merely good."
        },
        {
          "q": "What is the UCB1 rule?",
          "a": "Pull argmax over arms of the estimated mean plus c*sqrt(2 ln t / N_a) - the highest plausible mean rather than the highest estimated mean."
        },
        {
          "q": "Where does the UCB bonus come from?",
          "a": "A Hoeffding confidence radius of order sqrt(log(1/delta)/2n), with delta chosen around 1/t^4 so a union bound over arms and rounds still holds - which produces the 2 ln t numerator."
        },
        {
          "q": "Why is UCB regret inversely proportional to the gap?",
          "a": "Nearly-tied arms need many samples to separate. That is correct behaviour: they are expensive to distinguish and cheap to confuse, so the regret from confusing them stays bounded."
        },
        {
          "q": "What is Thompson sampling?",
          "a": "Sample a mean from each arm's posterior and pull the argmax of the samples. It selects each arm with exactly the probability it is optimal - probability matching."
        },
        {
          "q": "Why is Beta-Bernoulli convenient?",
          "a": "Beta is conjugate to Bernoulli, so the posterior update after observing a reward is incrementing alpha or beta by one. No integration required."
        },
        {
          "q": "What is optimism in the face of uncertainty?",
          "a": "Act as if each option is as good as it plausibly could be. Either it is genuinely good and you collect reward, or it is over-estimated and pulling it produces the data that corrects the estimate."
        },
        {
          "q": "Why does a sample average fail in non-stationary problems?",
          "a": "Its step size is 1/N, which shrinks to nothing, so the estimate freezes. It converges accurately to a mean that is no longer true. Constant alpha keeps tracking."
        },
        {
          "q": "Why is epsilon-greedy inadequate for deep MDPs?",
          "a": "Uniform random exploration is a random walk, so reaching a state n steps down a corridor has probability exponentially small in n. The agent effectively never finds distant rewards."
        }
      ],
      "standard": [
        {
          "q": "Your feedback is delayed by hours and you can only update the policy once a day. How does that change the design?",
          "a": "This is the normal industrial situation and it breaks the assumption every textbook bandit result rests on - that you observe the reward before choosing the next action. WHAT ACTUALLY BREAKS. (1) DETERMINISTIC RULES DEGENERATE. UCB computes one argmax from the current statistics, so if statistics only update daily, UCB assigns the SAME arm to every user for the entire day. A batch of a million decisions becomes one giant sample of one arm - terrible exploration and an operational risk, since a bad arm gets full traffic for 24 hours. (2) THE CONFIDENCE BOOKKEEPING IS WRONG. UCB's bonus uses N_a, the number of pulls, but during the day you have pulls whose rewards have not arrived. Counting them makes the agent over-confident (the bonus shrinks on evidence you do not have); not counting them makes it re-explore arms it has already committed to. Neither is right. (3) NON-STATIONARITY GETS WORSE, because a full day of drift accumulates between updates. WHY THOMPSON HANDLES THIS BETTER, and this is the decisive practical argument for it. Thompson is RANDOMIZED, so one posterior sample per DECISION spreads the day's traffic across arms in proportion to the probability each is optimal. You get within-batch exploration for free, no arm takes all the traffic, and the allocation is automatically sensible. The standard treatment of pending feedback is to sample from the posterior conditioned on what you know - and a clean approximation is to treat outstanding pulls as having their posterior-mean outcome, or simply to accept a slightly stale posterior, both of which degrade gracefully. THE DESIGN I WOULD ACTUALLY BUILD. Thompson sampling with a per-arm PROBABILITY FLOOR of a few percent, so no arm is ever fully starved and the off-policy estimator's variance stays bounded. Log the assignment propensity on every decision, without exception, because that is what lets me evaluate any candidate policy from the day's logs with inverse-propensity or doubly-robust estimators. Update the posterior in batch overnight from whatever feedback has landed, with an attribution window matched to the delay distribution. Use DISCOUNTED counts or a sliding window rather than raw totals, because with daily updates and a live system, drift is the norm rather than the exception. WHAT I WOULD MEASURE. The delay distribution itself, first - if 90% of feedback arrives within an hour and the tail runs to a week, that shapes the attribution window and tells me how much of my posterior is provisional. And I would track the effective sample size after importance weighting, since a policy that has drifted far from the logging policy makes the logged data nearly useless for evaluating it, and that shows up as an ESS collapse long before the estimates look obviously wrong. THE GENERAL POINT. Delayed and batched feedback does not invalidate the bandit framing; it invalidates the specific algorithms that assume immediate sequential feedback. Randomized allocation degrades gracefully under batching and deterministic allocation does not, which is a structural reason to prefer Thompson that has nothing to do with regret bounds."
        },
        {
          "q": "Explain the exploration-exploitation trade-off and compare the main strategies.",
          "a": "THE SETUP AND WHY THE BANDIT IS THE RIGHT PLACE TO STUDY IT. A bandit is an MDP with one state - actions give rewards, no transitions, no credit assignment. That strips the problem to exploration alone, which matters because a great deal of debugging time in full RL is spent confusing exploration failures with credit-assignment failures. THE DILEMMA. The agent chooses its own data. Pull the arm you believe is best and you learn nothing about the others; pull another and you pay for the information. The metric is REGRET, the shortfall against an oracle that always pulls the best arm, and it decomposes as the sum over arms of the gap times how often you pulled that arm. So the entire game is pulling suboptimal arms a SUBLINEAR number of times. THE STRATEGIES, ordered by what they get right. (1) FIXED EPSILON-GREEDY. Explore uniformly with probability epsilon. Its flaw is structural: constant exploration rate means constant cost per step, so regret is LINEAR - it never stops paying for information it already has. It is also uniform, so it wastes as much effort on an arm known to be terrible as on a promising one. Decaying epsilon like 1/t fixes the first problem and turns regret logarithmic, and it is the cheapest possible improvement. (2) OPTIMISTIC INITIALIZATION. Set initial estimates well above any plausible reward and act greedily. Unpulled arms look attractive, so the greedy agent explores automatically. Nearly free and surprisingly effective; the limitation is that the optimism is spent once and never renewed, so it fails in non-stationary problems. (3) UCB1. Pull the arm with the highest PLAUSIBLE mean: estimate plus a Hoeffding confidence radius sqrt(2 ln t / N_a). Exploration is now directed - the bonus is large for rarely-pulled arms and shrinks as evidence accumulates - and the two terms are in the same units, which is what makes it feel principled rather than arbitrary. Regret is O(sum of ln T / gap). (4) THOMPSON SAMPLING. Maintain a posterior per arm, sample from each, pull the argmax of the samples. This selects each arm with exactly the probability it is optimal. Also logarithmic regret, frequently better than UCB empirically, and much easier to extend to contextual, delayed, or batched settings. THE UNIFYING PRINCIPLE. Both good methods implement OPTIMISM IN THE FACE OF UNCERTAINTY, and the reason it works is a mechanism rather than a heuristic: the arm you choose is either genuinely good, in which case you collect reward, or over-estimated, in which case pulling it generates the data that corrects it. Every outcome is useful. THE THEORETICAL ANCHOR. Lai and Robbins proved logarithmic regret is a LOWER bound for any consistent algorithm - you cannot identify a near-optimal arm without sampling it enough times. So UCB and Thompson are order-optimal, and the interesting comparisons between them are about constants, practicality and extensibility rather than about rates.",
          "deepDive": {
            "q": "Derive the UCB1 bonus term, and explain what each part is doing.",
            "a": "START FROM A CONCENTRATION BOUND. Let arm a have been pulled N_a times with rewards bounded in [0,1] and empirical mean mu-hat_a. Hoeffding's inequality says the empirical mean concentrates around the true mean: P(|mu-hat_a - mu_a| >= u) <= 2 exp(-2 N_a u^2). Set the right-hand side to a failure probability delta and solve for u: u = sqrt(log(2/delta) / (2 N_a)). So with probability at least 1-delta, the true mean lies within u of the estimate. CHOOSING DELTA - this is where the log t comes from, and it is the part people cannot usually reconstruct. We want the confidence interval to hold SIMULTANEOUSLY for every arm at every round, because we are making a decision every round based on all of them. A union bound over k arms and t rounds means we need delta small enough that the total failure probability across all those events stays bounded. Choosing delta on the order of t^{-4} does it: the number of (arm, round) pairs grows polynomially, t^{-4} decays fast enough for the sum to converge, and substituting gives u = sqrt(log(2 t^4) / (2 N_a)) which is proportional to sqrt(4 log t / (2 N_a)) = sqrt(2 log t / N_a). That is the UCB1 bonus. The specific power 4 is a convenience that makes the analysis clean rather than something fundamental - other choices shift constants. WHAT EACH PART DOES. The N_a in the DENOMINATOR is the core: the bonus shrinks like 1/sqrt(N_a), so an arm you have sampled a lot gets almost no bonus and is judged on its estimate. The log t in the NUMERATOR grows, slowly, without bound - which guarantees that any arm left alone long enough eventually becomes attractive again, so no arm is permanently abandoned. That is what makes UCB consistent: it cannot be fooled forever by an unlucky early sample. And log grows slowly enough that this re-exploration costs only logarithmically. WHY THE REGRET IS ln T / gap. An arm stops being pulled once its upper confidence bound falls below the optimal arm's mean, which requires the bonus to shrink below the gap: sqrt(2 ln T / N_a) < Delta_a, so N_a > 2 ln T / Delta_a^2. Each of those pulls costs Delta_a, giving regret per arm of about 2 ln T / Delta_a. Summed over suboptimal arms, that is the bound. Note the inverse dependence on the gap is correct rather than a weakness: a nearly-tied arm needs many samples to rule out, but each mistake costs little, and the product stays controlled. THE PRACTICAL READINGS THAT FOLLOW FROM THE DERIVATION. (1) The bound assumes rewards in [0,1]. If yours are not, either scale them or the constant c is wrong, and this is a common source of UCB underperforming - c is not a free tuning knob, it encodes the reward range. (2) Every arm must be pulled once before the formula is defined, so with many arms relative to the horizon, UCB spends its whole budget in forced exploration - which is exactly why it benchmarks poorly at small T. (3) Hoeffding is distribution-free and therefore loose. Using a tighter bound gives better algorithms: KL-UCB uses a KL-divergence-based bound and is asymptotically optimal with matching constants, not just matching rate. Knowing that the looseness lives in the concentration inequality tells you where the improvements come from."
          }
        },
        {
          "q": "Why is epsilon-greedy inadequate for hard exploration in real MDPs?",
          "a": "Because uniform random action selection is a RANDOM WALK in state space, and random walks are exponentially bad at reaching distant places. THE ARGUMENT. Consider a corridor of length n where the reward sits at one end and the agent starts at the other, with actions left and right. Under uniform random exploration the agent performs an unbiased random walk, so the expected time to reach the far end scales like n squared, and the probability of reaching it within a fixed episode length falls off exponentially in n. Now put the reward behind a specific sequence of choices - a key before a door, a sequence of platform jumps - and the probability of stumbling onto it by chance is exponentially small in the sequence length. The agent does not explore slowly; it never receives the signal at all, so there is nothing to learn from and no amount of training helps. This is why sparse-reward, long-horizon tasks were the last thing deep RL solved, and why Montezuma's Revenge became the standard example - DQN with epsilon-greedy scored essentially zero for years while the same algorithm was superhuman on dense-reward games. THE DEEPER PROBLEM: SHALLOW VERSUS DEEP EXPLORATION. Epsilon-greedy perturbs each action INDEPENDENTLY. To execute a coherent ten-step deviation from the current policy, you would need ten consecutive random actions to happen to line up, which is exponentially unlikely. What is needed is DEEP exploration - committing to a consistent alternative hypothesis about the world for an extended period, so the agent actually tests it. That distinction is the key one and it is what bandit theory's posterior sampling provides naturally: a single posterior sample defines a whole policy that is then followed consistently. THE FIXES, and how they map to this lesson. (1) POSTERIOR SAMPLING AT THE POLICY LEVEL - Bootstrapped DQN keeps an ensemble of value heads, samples ONE head per episode, and acts greedily with respect to it for the whole episode. That is Thompson sampling lifted to MDPs, and it gives deep exploration because the commitment lasts. (2) OPTIMISM VIA EXPLORATION BONUSES - count-based methods add a bonus like 1/sqrt(N(s)) to the reward, which is UCB's bonus moved into the reward function; pseudo-counts and hash-based counts extend it to large state spaces. (3) INTRINSIC MOTIVATION - curiosity from prediction error, or random network distillation, which rewards states where a fixed random network is poorly predicted. These are practical approximations of novelty. (4) STRUCTURED APPROACHES - go-explore-style archives that return to promising states before exploring from them, which directly attacks the random-walk problem by removing the need to re-traverse. WHAT I WOULD SAY IN AN INTERVIEW. The honest summary is that epsilon-greedy is adequate when rewards are dense enough that a random walk finds signal quickly, which covers a lot of practical problems, and it is not merely suboptimal but useless when they are not. Diagnosing which regime you are in is the first question: if the agent has never once received the reward, the problem is exploration and no learning-side change will help."
        },
        {
          "q": "How do contextual bandits differ from bandits and from full RL, and why do they matter in practice?",
          "a": "THE THREE SETTINGS. A BANDIT has one state: the best arm is the same every round. A CONTEXTUAL BANDIT gives you a context x each round - user features, time of day, query - and the best arm depends on it, so you are learning a mapping from context to action rather than a single best action. FULL RL adds that your action CHANGES the next state, so you must reason about long-run consequences. The distinguishing question between contextual bandits and RL is exactly whether your action affects the future - not whether the problem has features. WHY THIS IS THE PRACTICALLY IMPORTANT CASE. An enormous share of deployed 'reinforcement learning' is contextual bandits: news and content recommendation, ad selection, ranking, pricing, personalized layouts, treatment assignment. The reason is that the hard part of RL - long-horizon credit assignment through a learned value function, with the deadly triad waiting - simply does not arise. You get immediate feedback, the objective is well-defined per round, and the theory is strong. That makes contextual bandits reliable in a way full RL is not, and choosing the bandit formulation when it is defensible is usually the right engineering call. THE ALGORITHMS ARE THE SAME IDEAS WITH A MODEL ATTACHED. LinUCB assumes the expected reward is linear in features and maintains a confidence ELLIPSOID rather than a per-arm interval - the bonus becomes sqrt(x^T A^{-1} x), which is large in feature directions you have not seen much of. That is UCB with the count replaced by a covariance, and it is the same optimism principle. Thompson sampling extends even more naturally: keep a posterior over the parameters, sample a parameter vector, act greedily. Its ease of extension is a large part of why it dominates in industry. WHEN THE BANDIT FORMULATION IS WRONG, which is the important judgement. If the action changes the state, the guarantees do not hold no matter how well the model fits. The concrete failure cases: a user who tires of a repeatedly-shown recommendation; a price change that shifts demand; a treatment that changes the patient's condition; any engagement optimization where today's recommendation shapes tomorrow's interests. In all of these, a contextual bandit optimizes immediate reward and can be systematically harmful over the horizon that matters - the classic result being that pure engagement optimization degrades long-run retention. The diagnostic is to ask whether repeating an action many times would change its own value; if yes, you need at least a delayed-reward formulation. THE EVALUATION ADVANTAGE worth mentioning. Because there is no state transition, OFF-POLICY EVALUATION is tractable: with logged propensities you can use inverse propensity scoring or doubly-robust estimators to get an unbiased estimate of a new policy's value from old data, with real confidence intervals. That is enormously valuable in production and it is essentially impossible in full RL, where off-policy evaluation over a long horizon has variance that explodes with the product of importance ratios. LOGGING PROPENSITIES IS THE PRICE - and forgetting to log them is the most expensive avoidable mistake in an industrial bandit system, because it retroactively destroys the ability to evaluate anything.",
          "deepDive": {
            "q": "Adaptive allocation minimizes regret but breaks standard statistical inference. How do you handle that tension?",
            "a": "THE TENSION, stated precisely. An A/B test allocates fixed proportions, so each arm's sample is i.i.d. and the standard estimators, confidence intervals and p-values are valid. A bandit allocates ADAPTIVELY - the probability of assigning arm a at time t depends on rewards observed before t - so the samples are neither independent nor identically distributed. Consequences: the sample mean of an arm is BIASED, typically downward for arms that got unlucky early, because the algorithm stops sampling arms that look bad and therefore never corrects the unlucky estimate. Standard confidence intervals under-cover, and naive p-values are invalid. This is not a small effect; it can be substantial for arms with few pulls, which is exactly the arms the bandit deliberately under-samples. WHY IT MATTERS. Two different goals are being confused. If the goal is to ACT WELL - maximize reward over the deployment - the bandit is right and the bias on abandoned arms is irrelevant, since you were never going to use them. If the goal is to MEASURE - produce a defensible estimate of each variant's effect for a decision, a regulator, or a paper - then the bandit has damaged exactly the thing you wanted. Most organizational conflict about this traces to two stakeholders having different goals and both saying 'we ran a test'. THE APPROACHES, roughly by cost. (1) DECIDE WHICH GOAL YOU HAVE, first and explicitly. This resolves more of these arguments than any technique. (2) IMPORTANCE-WEIGHTED ESTIMATORS. Log the propensity - the probability with which each action was actually selected - and use inverse propensity scoring. This yields unbiased estimates of any policy's value from adaptively-collected data. It requires that propensities were logged and bounded away from zero, which is why forcing a floor on assignment probability is standard practice: it bounds the variance of the estimator. (3) EXPLORE-THEN-COMMIT OR BATCHED DESIGNS. A fixed exploration phase with equal allocation gives clean i.i.d. data for inference, then adapt afterwards. You pay more regret than a fully adaptive method and you get valid statistics on the exploration phase. Often the right compromise. (4) ALWAYS-VALID INFERENCE. Confidence sequences and anytime-valid p-values, built on martingale concentration, remain valid under continuous monitoring and adaptive sampling. This is the technically correct answer and the tooling has matured enough to use. (5) SAMPLE-SPLITTING or de-biasing corrections specifically designed for adaptively collected data. THE DESIGN I WOULD ACTUALLY PROPOSE for a production system. Adaptive allocation with a FLOOR on each arm's probability - say a few percent - so no arm is ever fully abandoned. Log propensities on every decision, always. Use inverse-propensity or doubly-robust estimators for reporting, with confidence sequences rather than fixed-horizon intervals. That combination gets most of the regret benefit while preserving the ability to make defensible statements afterwards, and the floor is what makes the estimator's variance manageable. THE POINT I WOULD END ON. The bandit does not break statistics; it breaks the assumption that the data was collected independently of the outcomes. Once you know that is the issue, the fix is always the same shape - record how the data was collected, and account for it in the estimator. That is the same discipline as handling any selection effect."
          }
        },
        {
          "q": "Compare UCB and Thompson sampling. Which would you deploy?",
          "a": "THE THEORY IS A TIE. Both achieve logarithmic regret and both are order-optimal against the Lai-Robbins lower bound. So the choice is made on other grounds, and saying that clearly is the start of a good answer. WHERE THEY DIFFER MECHANICALLY. UCB is DETERMINISTIC given the history: compute an upper bound per arm, take the max. Thompson is RANDOMIZED: sample from each posterior, take the max of the samples. UCB's exploration comes from an added bonus term; Thompson's emerges from posterior width. THE PRACTICAL ARGUMENTS FOR THOMPSON, which is what I would usually deploy. (1) IT EXTENDS. Contextual settings, delayed feedback, batched updates, non-standard reward distributions - in each case Thompson needs only a posterior, while UCB needs a valid concentration bound derived for that setting, and deriving one is real work that often has no clean answer. (2) BATCHED AND DELAYED FEEDBACK, specifically, which is the common industrial reality. If you update once an hour, a deterministic rule assigns the SAME arm to every user in that hour - so a batch is one giant sample of one arm. Thompson's randomization spreads assignments across arms in proportion to posterior probability, which is both better exploration and much better operationally. This alone decides many real deployments. (3) EMPIRICAL PERFORMANCE. Careful evaluations have generally found Thompson competitive with or better than UCB in practice, despite matching rates - the constants favour it. (4) PROPENSITIES COME FREE. Thompson is randomized, so you can log the probability of each assignment, which is exactly what off-policy evaluation needs. A deterministic rule has degenerate propensities and destroys your ability to evaluate counterfactually. For a production system this is a large advantage and it is routinely overlooked. THE ARGUMENTS FOR UCB. (1) DETERMINISM is easier to debug, audit and explain - you can say exactly why an arm was chosen. In regulated settings that matters. (2) NO PRIOR to specify, and no posterior to approximate. With neural network reward models, Thompson requires approximate posteriors - ensembles, dropout, randomized priors - and the quality of the approximation directly determines exploration quality. UCB needs only a bound, which can be cruder. (3) The confidence interval is INTERPRETABLE and can be reported. (4) Worst-case guarantees are more directly stated. WHAT I WOULD ACTUALLY DEPLOY. Thompson sampling with a probability floor on every arm, logging propensities on every decision. The floor bounds off-policy estimator variance and guarantees no arm is abandoned; the propensity log preserves the ability to evaluate new policies offline. If the reward model is a neural network, I would use a bootstrapped ensemble for the posterior rather than dropout, since dropout-based uncertainty is known to be poorly calibrated for this purpose. AND THE THING I WOULD CHECK FIRST. Whether the problem is stationary. Both methods assume fixed arm means; if the means drift, both fail in the same way - accumulated evidence makes them confident and they stop exploring. The fix is discounted counts or a sliding window, and it applies to whichever algorithm you pick."
        },
        {
          "q": "How would you set up exploration for a deep RL agent on a sparse-reward task?",
          "a": "FIRST, ESTABLISH THAT EXPLORATION IS ACTUALLY THE PROBLEM, because the fixes are expensive and frequently misapplied. The diagnostic: has the agent EVER received the reward? Log it. If the reward has never been observed in any episode, no learning-side change matters - the data contains no signal. If it has been observed occasionally and the agent fails to exploit it, the problem is credit assignment or the learner, not exploration. That single check separates two very different investigations. SECOND, TRY THE CHEAP STRUCTURAL FIXES BEFORE THE CLEVER ALGORITHMIC ONES. (1) RESHAPE THE PROBLEM. Potential-based shaping preserves optimality and can densify the signal enormously. Curriculum learning - start from states near the goal and progressively move the start back - is remarkably effective and much simpler than intrinsic motivation. Reducing the horizon or the action granularity often makes an intractable exploration problem trivial. (2) USE DEMONSTRATIONS if any exist. A handful of successful trajectories, either seeded into the replay buffer or used to pretrain the policy, changes the problem entirely, because the exploration difficulty was about ever reaching the reward once. (3) CHECK THE EPISODE LENGTH. If episodes terminate before the reward is reachable, the agent cannot succeed by construction. THIRD, THE ACTUAL EXPLORATION METHODS, in order of cost-effectiveness. (1) DEEP EXPLORATION VIA POSTERIOR SAMPLING. Bootstrapped ensembles - several value heads on a shared trunk, sample ONE head per episode and act greedily with respect to it throughout. This is Thompson sampling lifted to MDPs, and the crucial property is COMMITMENT: the agent follows one coherent hypothesis for a whole episode instead of dithering. Epsilon-greedy's fatal flaw is that it perturbs each action independently, so a coherent ten-step deviation is exponentially unlikely; deep exploration fixes exactly that. (2) COUNT-BASED BONUSES. Add roughly 1/sqrt(N(s)) to the reward - UCB's bonus moved into the reward function. In large state spaces use pseudo-counts from a density model, or hash-based counts, which are crude and often work. (3) RANDOM NETWORK DISTILLATION. Reward the agent for states where a learned network fails to predict a fixed random network's output. Simple, robust, no density model, and it was the method that finally moved the needle on the hardest exploration benchmarks. (4) GO-EXPLORE-STYLE ARCHIVES. Remember promising states, RETURN to them directly, and explore from there. This attacks the random-walk problem at its root by removing the need to re-traverse the corridor every time. FOURTH, THE MEASUREMENT. Track state-visitation coverage, not just return - return is flat during the entire period that matters, so it tells you nothing about whether exploration is improving. A coverage metric, even a crude one like the number of distinct discretized states visited, gives you a signal while return is still zero. THE PRINCIPLE UNDERNEATH, which ties back to the bandit lesson: uniform random exploration is a random walk and random walks are exponentially bad at reaching distant states. Every method above replaces undirected dithering with something DIRECTED - toward uncertainty, toward novelty, or toward a committed hypothesis. That is what optimism in the face of uncertainty means once the state space is large."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "A bandit is an MDP with one state",
        "back": "Actions give rewards; no transitions, no credit assignment. Stripping those away isolates EXPLORATION - which matters because much RL debugging time is lost confusing exploration failures with credit-assignment failures."
      },
      {
        "type": "formula",
        "front": "Regret and its decomposition",
        "back": "R_T = T*mu* - E[sum of rewards] = sum_a Delta_a * E[N_a(T)]. Each suboptimal arm costs its GAP times how often you pull it - so the whole game is pulling suboptimal arms a SUBLINEAR number of times."
      },
      {
        "type": "intuition",
        "front": "Why fixed epsilon-greedy has LINEAR regret",
        "back": "Constant exploration rate = constant cost per step, forever. It never stops paying for information it already has, and it wastes as much on a known-terrible arm as on a promising one. Decaying eps ~ 1/t makes it logarithmic - the cheapest possible fix."
      },
      {
        "type": "formula",
        "front": "UCB1",
        "back": "argmax_a [ mu_hat_a + c*sqrt(2 ln t / N_a) ]. Bonus = Hoeffding radius with delta ~ t^-4 so a union bound over arms AND rounds holds. Regret O(sum ln T / Delta_a)."
      },
      {
        "type": "intuition",
        "front": "What each part of the UCB bonus does",
        "back": "N_a in the DENOMINATOR: bonus shrinks like 1/sqrt(N), so well-sampled arms are judged on their estimate. log t in the NUMERATOR: grows without bound, so no arm is abandoned forever - that is what makes UCB consistent, and log grows slowly enough to cost only logarithmically."
      },
      {
        "type": "definition",
        "front": "Lai-Robbins lower bound",
        "back": "Any consistent algorithm must pull a suboptimal arm ~log(T)/KL(mu_a, mu*) times. Logarithmic regret is a LOWER BOUND - so UCB and Thompson are order-OPTIMAL, not merely good. Comparisons between them are about constants and practicality."
      },
      {
        "type": "definition",
        "front": "Thompson sampling",
        "back": "Sample theta_a ~ posterior for each arm, pull argmax of the SAMPLES. Selects each arm with exactly the probability it is optimal (probability matching). Beta-Bernoulli conjugacy makes the update two integer increments."
      },
      {
        "type": "intuition",
        "front": "Optimism is a MECHANISM, not a heuristic",
        "back": "Act as if each option is as good as it plausibly could be. Either it IS good (collect reward) or it is over-estimated (pulling it generates the data that corrects it). Every outcome is useful - which is exactly the loop that offline RL removes."
      },
      {
        "type": "pitfall",
        "front": "Sample average FREEZES in non-stationary problems",
        "back": "Step size 1/N shrinks to nothing, so the estimate converges accurately to a mean that is no longer true. Constant alpha computes an exponentially-weighted average with memory ~1/alpha and keeps tracking. Same Robbins-Monro trade as Q-learning."
      },
      {
        "type": "pitfall",
        "front": "UCB benchmarks badly at small T",
        "back": "It must pull every arm once and log t has barely grown, so with many arms it is still in forced exploration at T=100. Short-horizon comparisons systematically favour eps-greedy and say nothing about the asymptotics the theory describes."
      },
      {
        "type": "intuition",
        "front": "Shallow vs DEEP exploration",
        "back": "Eps-greedy perturbs each action INDEPENDENTLY, so a coherent 10-step deviation needs 10 lucky actions in a row - exponentially unlikely. Deep exploration COMMITS to one hypothesis for a whole episode (Bootstrapped DQN samples one value head per episode = Thompson lifted to MDPs)."
      },
      {
        "type": "pitfall",
        "front": "Log propensities, always",
        "back": "Contextual bandits allow unbiased OFF-POLICY EVALUATION (IPS / doubly-robust) - but only if the assignment probability was recorded. Forgetting is the most expensive avoidable mistake in an industrial bandit system: it retroactively destroys the ability to evaluate anything."
      }
    ],
    "refs": [
      {
        "title": "Auer, Cesa-Bianchi & Fischer (2002), Finite-time Analysis of the Multiarmed Bandit Problem (UCB1)",
        "url": "https://link.springer.com/article/10.1023/A:1013689704352"
      },
      {
        "title": "Lai & Robbins (1985), Asymptotically Efficient Adaptive Allocation Rules",
        "url": "https://www.sciencedirect.com/science/article/pii/0196885885900028"
      },
      {
        "title": "Chapelle & Li (2011), An Empirical Evaluation of Thompson Sampling",
        "url": "https://papers.nips.cc/paper/2011/hash/e53a0a2978c28872a4505bdb51db06dc-Abstract.html"
      },
      {
        "title": "Li et al. (2010), A Contextual-Bandit Approach to Personalized News Article Recommendation (LinUCB)",
        "url": "https://arxiv.org/abs/1003.0146"
      },
      {
        "title": "Osband et al. (2016), Deep Exploration via Bootstrapped DQN",
        "url": "https://arxiv.org/abs/1602.04621"
      }
    ],
    "demos": [
      "bandit",
      "thompson-vs-ucb",
      "bayesian-optimization",
      "regret-matching"
    ]
  },
  "dqn": {
    "level": "core",
    "body": {
      "intuition": [
        "Replace the Q-table with a neural network and you get DQN. That sentence understates the problem: the moment the table becomes a function approximator, every guarantee from the tabular lessons is void. You now have all three legs of the deadly triad at once - function approximation, bootstrapping, and off-policy data - and the composition of the Bellman operator with a projection onto a function class need not be a contraction in any norm. Divergence is not a bug you can find; it is permitted by the mathematics. So DQN is best understood not as 'Q-learning with a network' but as Q-learning plus a set of devices for holding the feedback loop still long enough to learn.",
        "There are two such devices and each targets a specific leg. EXPERIENCE REPLAY stores transitions and samples them randomly, which breaks the temporal correlation between consecutive updates - stochastic gradient descent assumes roughly independent samples, and a trajectory is about as far from independent as data gets - while also letting each transition be reused many times. TARGET NETWORKS freeze a copy of the network to compute the bootstrap targets, refreshing it every few thousand steps. Between refreshes, the target is a FIXED function, so each phase looks like ordinary supervised regression, which is stable. Notice the tension: replay makes the data MORE off-policy, worsening one leg, and the target network weakens the bootstrapping leg to compensate. They are not two independent good ideas; they are a balanced pair.",
        "The result was genuinely striking - one architecture and one hyperparameter set learning 49 Atari games from raw pixels, reaching or exceeding human scores on many. Then the field spent several years discovering what the result rested on. Double DQN showed the value estimates were substantially overoptimistic and fixed it with a one-line change. Prioritized replay showed uniform sampling wastes effort. Rainbow combined six extensions and, more usefully, ablated them. And Henderson et al. showed that reported gains in deep RL are frequently within SEED VARIANCE - that the same algorithm with different random seeds, or a different but equally reasonable implementation, can produce results spanning the gap between published methods. That last finding is the honest frame for this lesson: the techniques here are real, and the effect sizes attributed to many of them were measured with instruments too noisy to support the claims."
      ],
      "math": [
        {
          "h": "The DQN loss, and what the target network changes",
          "paras": [
            "Regression toward a bootstrapped target, exactly as in tabular Q-learning, except the target is computed with a SEPARATE frozen parameter set theta-minus that is only periodically synced.",
            "The gradient does not flow through the target - that is the whole point. Without the stop-gradient you are chasing a target that moves as you move, which is the bootstrapping leg of the triad at full strength."
          ],
          "tex": "\\mathcal{L}(\\theta) = \\mathbb{E}_{(s,a,r,s')\\sim \\mathcal{D}}\\Big[\\big(\\underbrace{r + \\gamma \\max_{a'} Q(s',a';\\theta^{-})}_{\\text{fixed target, no gradient}} - Q(s,a;\\theta)\\big)^2\\Big]",
          "texNote": "Between syncs of theta-minus this is a standard supervised regression problem with a fixed target function - which is stable. The instability is concentrated into the periodic refresh, so the sync interval C is a real hyperparameter: too short and you recover the unstable moving-target problem, too long and you are regressing toward stale values and learning slows."
        },
        {
          "h": "Double DQN: the same decoupling, using networks you already have",
          "paras": [
            "The max in the target both SELECTS the action and EVALUATES it using the same noisy estimates, which is maximization bias. Double DQN selects with the online network and evaluates with the target network.",
            "The elegance is that no new machinery is needed - the two networks already exist for a different reason, so the fix costs one line."
          ],
          "tex": "y^{\\text{DQN}} = r + \\gamma\\, Q\\!\\big(s', \\arg\\max_{a'} Q(s',a';\\theta^{-});\\, \\theta^{-}\\big) \\\\[4pt] y^{\\text{DDQN}} = r + \\gamma\\, Q\\!\\big(s', \\arg\\max_{a'} Q(s',a';\\theta);\\, \\theta^{-}\\big)",
          "texNote": "The only change is which parameters supply the argmax. van Hasselt et al. measured DQN's value estimates against actual discounted returns on Atari and found substantial systematic overestimation, which Double DQN reduced along with improving scores - a rare case in deep RL where a mechanism was proposed, measured directly, and the fix verified against the measurement rather than only against the benchmark."
        },
        {
          "h": "Prioritized replay, and the bias it introduces",
          "paras": [
            "Sampling uniformly from the buffer spends most updates on transitions the network already predicts well. Prioritizing by TD-error magnitude concentrates effort where the error is - but it changes the sampling distribution, which biases the expectation the loss is estimating.",
            "So the correction is not optional: importance-sampling weights restore the expectation, annealed by beta because the bias matters most near convergence."
          ],
          "tex": "P(i) = \\frac{p_i^{\\alpha}}{\\sum_k p_k^{\\alpha}}, \\quad p_i = |\\delta_i| + \\epsilon, \\qquad w_i = \\left(\\frac{1}{N \\cdot P(i)}\\right)^{\\beta}\\Big/\\max_j w_j",
          "texNote": "alpha interpolates between uniform (0) and fully greedy prioritization (1). The w_i weights are the standard importance correction and they must be normalized by the max so they only ever scale gradients DOWN, preserving stability. This is the module's theme appearing as a design choice: you are deliberately reshaping your own data distribution, and reshaping it requires paying for the bias you introduced."
        }
      ],
      "code": [
        {
          "h": "The training step, annotated by which triad leg each device addresses",
          "paras": [
            "The whole algorithm is short. What is worth memorizing is not the code but which structural problem each line exists to solve - because that is what tells you which knob to turn when it fails."
          ],
          "code": "def train_step(q, q_target, buffer, opt, gamma, batch=32):\n    s, a, r, s2, done = buffer.sample(batch)     # REPLAY: breaks temporal\n                                                 # correlation (SGD wants ~iid)\n                                                 # and reuses each transition.\n                                                 # NOTE it makes data MORE\n                                                 # off-policy - worsens that leg.\n    with torch.no_grad():                        # TARGET NET: no gradient here.\n        a_star = q(s2).argmax(1)                 # DOUBLE DQN: online net SELECTS\n        y = r + gamma * (1 - done) * \\           # target net EVALUATES.\n            q_target(s2).gather(1, a_star[:, None]).squeeze(1)\n        #        ^^^^^^^^^^^^ (1-done): NEVER bootstrap past a terminal state.\n\n    pred = q(s).gather(1, a[:, None]).squeeze(1)\n    loss = F.smooth_l1_loss(pred, y)             # HUBER: quadratic near zero,\n                                                 # linear in the tails, so one\n                                                 # bad target cannot produce a\n                                                 # huge gradient.\n    opt.zero_grad(); loss.backward()\n    nn.utils.clip_grad_norm_(q.parameters(), 10)\n    opt.step()\n\nif step % C == 0:\n    q_target.load_state_dict(q.state_dict())     # the sync interval C is a real\n                                                 # hyperparameter: too short =\n                                                 # moving target, too long =\n                                                 # stale targets, slow learning.\n\n# THE TWO DEVICES MAP ONTO THE TRIAD:\n#   replay        -> makes SGD's iid assumption approximately true (and makes\n#                    the OFF-POLICY leg worse, deliberately, for efficiency)\n#   target net    -> weakens the BOOTSTRAPPING leg: between syncs this is\n#                    ordinary supervised regression toward a FIXED function\n# They are a balanced pair, not two independent good ideas.",
          "caption": "Each line exists to hold one leg of the deadly triad still. Replay deliberately worsens the off-policy leg to buy sample efficiency, and the target network weakens the bootstrapping leg to pay for it - which is why removing either one alone destabilizes training."
        },
        {
          "h": "The preprocessing that changes the problem, and the Rainbow ablation",
          "paras": [
            "Two things worth knowing that are not in the loss function. The Atari preprocessing quietly redefines the objective, and Rainbow's ablation is more informative than its headline result."
          ],
          "code": "# PREPROCESSING THAT IS NOT NEUTRAL:\n#\n#   frame stacking (4 frames)  -> RESTORES THE MARKOV PROPERTY. One frame does\n#                                 not contain velocity, so Q(s,a) over a single\n#                                 frame is not a well-defined object.\n#   reward clipping to [-1,1]  -> CHANGES THE PROBLEM. It makes one shared\n#                                 hyperparameter set work across 49 games with\n#                                 wildly different reward scales, and the agent\n#                                 can no longer prefer a 100-point reward to a\n#                                 1-point one. That is a different MDP, and it\n#                                 is why later work replaced it with adaptive\n#                                 normalization rather than keeping it.\n#   frame skip (4)             -> shortens the effective horizon 4x.\n\n# RAINBOW'S ABLATION is the useful part of that paper. Combining six extensions\n# beat all of them; removing each in turn showed which carried the result:\n#   prioritized replay ....... large drop when removed\n#   multi-step returns ....... large drop when removed\n#   distributional RL ........ clear contribution\n#   Double DQN, dueling,\n#     noisy nets ............. smaller / game-dependent\n#\n# READ THAT AGAINST Henderson et al.: reported gains in deep RL are frequently\n# within SEED VARIANCE - the same algorithm across seeds, or two reasonable\n# implementations of it, can span the gap between published methods. So the\n# large-effect rows are trustworthy and the small ones deserve more seeds\n# before you build on them.\n#\n# MINIMUM HONEST PROTOCOL: >= 5 seeds, report the spread not the best run, and\n# use sticky actions - without them a deterministic emulator lets an agent\n# memorize one action sequence rather than learn a policy.",
          "caption": "Reward clipping is not preprocessing, it is a redefinition of the objective - the agent literally cannot prefer a 100-point reward to a 1-point one. And Rainbow's ablation matters more than its score, especially read against the seed-variance result."
        }
      ],
      "useCases": [
        "Discrete-action control with a high-dimensional observation space - games, some robotics with discretized actions, dialogue-action selection - which is the setting DQN was built for and where value-based methods remain a reasonable default.",
        "Any problem where interaction is expensive and data must be reused. Off-policy learning with a replay buffer is the property that makes DQN far more sample-efficient than on-policy policy-gradient methods, and it is usually the deciding factor.",
        "Learning from logged or demonstration data mixed with online interaction, since the off-policy target does not care where a transition came from - a property later formalized in offline RL and in demonstration-seeded replay buffers.",
        "As the standard reference implementation for studying stability. Because its failure modes are well-characterized, DQN is a good instrument for asking whether a new representation or exploration method helps, without confounding it with a novel learning rule."
      ],
      "pitfalls": [
        "Removing the target network or the replay buffer independently. They are a balanced pair - replay deliberately makes the data more off-policy for sample efficiency, and the target network weakens the bootstrapping leg to compensate. Take away either and training destabilizes for reasons that look mysterious if you do not know the triad.",
        "Bootstrapping past terminal states. The (1 - done) factor is load-bearing, and a related subtle version is treating TIME-LIMIT truncation as termination - the episode did not really end, so zeroing the bootstrap there teaches the agent that the world stops arbitrarily.",
        "Treating reward clipping as harmless preprocessing. Clipping to [-1, 1] means the agent cannot prefer a 100-point reward to a 1-point one - a different MDP. It existed to make one hyperparameter set work across 49 games, and later methods replaced it with adaptive normalization rather than retaining it.",
        "Forgetting that a single frame is not Markov. Frame stacking is not a performance trick, it restores the property that makes Q(s,a) a well-defined object at all. Any problem with hidden velocity, latency, or mode needs the equivalent.",
        "Using prioritized replay without the importance-sampling correction. Prioritizing changes the sampling distribution, which biases the expectation the loss estimates. The weights must be included and normalized by their maximum so they only scale gradients down.",
        "Reporting single-seed results. Henderson et al. showed deep RL results vary enough across seeds and implementations that reported differences between methods are frequently within that variance. Five seeds minimum, report the spread, and be suspicious of small gains - including your own.",
        "Evaluating on a deterministic emulator. Without sticky actions or random no-op starts, an agent can memorize a single winning action sequence rather than learn a policy, and the score will not reveal the difference."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/q-learning",
          "text": "The tabular guarantees this lesson gives up. Maximization bias is a small correctable issue there and a persistent problem here, because approximation error does not decay with more visits the way sampling noise does - it is a property of the function class."
        },
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "What happens when you keep the replay buffer and remove the environment. Everything DQN relies on to correct its own overestimates - trying the action and observing the result - is exactly what is unavailable there, which is why conservatism becomes necessary."
        },
        {
          "ref": "reinforcement-learning/policy-gradient",
          "text": "The alternative family. Policy-gradient methods avoid the triad by staying on-policy and not bootstrapping through a max, at the cost of discarding data after each update - a direct trade of stability against sample efficiency."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "DQN's exploration is plain epsilon-greedy, which is why hard-exploration games resisted it for years. Bootstrapped ensembles and noisy networks are attempts to bring posterior sampling into this setting."
        },
        {
          "ref": "training-systems/training-stability",
          "text": "Huber loss, gradient clipping and target freezing are the same stabilization vocabulary used in supervised training - but here the instability has an additional structural source, since the target itself is generated by the model being trained."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is DQN?",
          "a": "Q-learning with a neural network approximating Q(s,a), stabilized by an experience replay buffer and a periodically-synced target network."
        },
        {
          "q": "Why is experience replay needed?",
          "a": "Consecutive transitions are highly correlated and SGD assumes roughly independent samples. Replay breaks that correlation and lets each transition be reused many times."
        },
        {
          "q": "Why is a target network needed?",
          "a": "It freezes the bootstrap target, so between syncs the problem is ordinary supervised regression toward a fixed function. Without it you chase a target that moves as you move."
        },
        {
          "q": "Which triad legs do the two devices address?",
          "a": "Replay addresses SGD's independence assumption but makes the data more off-policy; the target network weakens the bootstrapping leg to compensate. They are a balanced pair."
        },
        {
          "q": "What does Double DQN change?",
          "a": "The online network selects the maximizing action and the target network evaluates it. One line, using two networks that already exist for another reason."
        },
        {
          "q": "What did van Hasselt et al. measure?",
          "a": "DQN's value estimates against actual discounted returns on Atari, finding substantial systematic overestimation that Double DQN reduced along with improving scores."
        },
        {
          "q": "What is the dueling architecture?",
          "a": "Split the head into a state value V(s) and an advantage A(s,a), recombining as V + A - mean(A). It helps in states where the action choice barely matters."
        },
        {
          "q": "What is prioritized experience replay?",
          "a": "Sample transitions in proportion to TD-error magnitude rather than uniformly, with importance-sampling weights to correct the bias that introduces."
        },
        {
          "q": "Why must prioritized replay use IS weights?",
          "a": "Changing the sampling distribution changes the expectation the loss estimates. The weights restore it, and are normalized by their max so they only scale gradients down."
        },
        {
          "q": "Why is Huber loss used?",
          "a": "It is quadratic near zero and linear in the tails, so one badly-wrong bootstrap target cannot produce an enormous gradient."
        },
        {
          "q": "What does reward clipping cost?",
          "a": "The agent can no longer prefer a 100-point reward to a 1-point one - it is a different MDP. It existed so one hyperparameter set worked across 49 games."
        },
        {
          "q": "What did Rainbow's ablation show?",
          "a": "Prioritized replay and multi-step returns carried the most, with distributional RL contributing clearly and Double DQN, dueling and noisy nets smaller or game-dependent."
        }
      ],
      "standard": [
        {
          "q": "DQN needed around 200 million frames to learn an Atari game. Why so many, and what would you do about it?",
          "a": "Two hundred million frames is roughly 38 days of continuous play for a game a person learns in minutes, so the gap is worth explaining precisely rather than dismissing as 'deep learning needs data'. WHERE THE SAMPLES GO. (1) NO PRIOR KNOWLEDGE. The agent starts with no concept of objects, gravity, or that a ladder is climbable. It learns the visual representation, the dynamics, and the policy simultaneously from a scalar reward - and a scalar reward is an extraordinarily thin supervision signal compared with a label per image. (2) CREDIT ASSIGNMENT IS SLOW. One-step bootstrapping propagates value backward one state per update. A reward a hundred steps from the relevant decision needs the information to traverse a hundred backups, each requiring the intermediate values to have settled. (3) EXPLORATION IS UNDIRECTED. Epsilon-greedy is a random walk, so the agent spends enormous effort re-visiting known regions and rarely reaches new ones. (4) THE DEVICES THEMSELVES COST SAMPLES. The target network deliberately delays learning - you regress toward stale values between syncs - and a large replay buffer means each update uses a mixture dominated by old policies. Both trade sample efficiency for stability, on purpose. WHAT ACTUALLY CLOSED THE GAP, in rough order of effect. (1) MULTI-STEP RETURNS. Propagating n steps of real reward per update instead of one is one of the largest single wins, and Rainbow's ablation confirms it. Cheap to add. (2) PRIORITIZED REPLAY, for the same reason - it accelerates backward propagation of newly-discovered reward rather than replaying it uniformly. (3) MORE UPDATES PER ENVIRONMENT STEP. The later data-efficient work found that DQN was massively under-training relative to its data: raising the replay ratio - many gradient steps per environment step - buys large efficiency gains, provided you counteract the resulting overfitting with periodic resets or regularization. This reframes the problem as one of under-using data rather than needing more. (4) MODEL-BASED METHODS. Learn the dynamics and generate synthetic experience, which is where the biggest reported efficiency gains on Atari have come from - and it is a direct attack on the root cause, since a model lets you do credit assignment without new interaction. (5) BETTER EXPLORATION for the hard-exploration subset specifically. WHAT I WOULD DO ON A REAL PROBLEM. Ask first whether I need to learn from scratch at all - demonstrations, a pretrained representation, a simulator, or a shaped reward each remove an entire category of cost, and are almost always cheaper than an algorithmic improvement. Then multi-step returns and a higher replay ratio, since both are small changes with large measured effects. Then model-based, if interaction is genuinely the binding constraint. THE FRAMING I WOULD OFFER. The comparison to human learning is not quite fair - a person brings a lifetime of physical priors to a new game. But the honest version of the point still stands: DQN's sample cost is dominated by learning things that were, in principle, available more cheaply, and most practical sample-efficiency work consists of finding a way to supply them."
        },
        {
          "q": "Explain DQN and why each of its components exists.",
          "a": "THE STARTING POINT. Tabular Q-learning has convergence guarantees. Replace the table with a neural network and every one of them is void, because you now have all three legs of the deadly triad simultaneously: function approximation, bootstrapping, and off-policy data. The Bellman operator contracts in the sup-norm, the projection onto the function class contracts in a weighted L2 norm, and composing contractions in different norms guarantees nothing - divergence is permitted by the mathematics, not just a possible bug. So DQN is Q-learning plus devices for holding that loop still. DEVICE 1: EXPERIENCE REPLAY. Store transitions in a large buffer and sample uniformly. Two purposes. It breaks the temporal correlation between consecutive updates - SGD assumes roughly independent samples and a trajectory is about as far from that as data gets. And it lets each expensive transition be used many times, which is why DQN is far more sample-efficient than on-policy methods. The cost, and I would say this explicitly: replay makes the data MORE off-policy, since you are training on transitions generated by older policies. It worsens one leg of the triad in exchange for efficiency. DEVICE 2: TARGET NETWORK. Keep a frozen copy of the parameters for computing bootstrap targets, synced every few thousand steps. Between syncs the target is a FIXED function, so the problem is ordinary supervised regression, which is stable. This weakens the bootstrapping leg and pays for what replay cost. That is why removing either one alone destabilizes training - they are a balanced pair rather than two independent tricks. THE SUPPORTING DETAILS THAT MATTER. Huber loss, so one wildly wrong target cannot produce an enormous gradient. Frame stacking, which is not a trick but a restoration of the Markov property - a single frame has no velocity, so Q over one frame is not a well-defined object. Reward clipping, which I would flag as changing the problem rather than preprocessing it: the agent cannot prefer a 100-point reward to a 1-point one, and it existed so one hyperparameter set could span 49 games. THE IMPROVEMENTS. Double DQN decouples selection from evaluation using the two networks already present, addressing maximization bias, and it was validated by measuring the overestimation directly rather than only by benchmark scores. Dueling splits the head into value and advantage. Prioritized replay samples by TD error with importance-sampling correction. Multi-step returns trade bias for faster credit propagation. Rainbow combines them. THE HONEST CLOSE. Rainbow's ablation showed prioritized replay and multi-step returns carried most of the gain, with several other components smaller or game-dependent. Read against Henderson et al.'s finding that deep RL results frequently vary across seeds and implementations by more than the gap between published methods, the right posture is to trust the large effects and treat the small ones as unresolved.",
          "deepDive": {
            "q": "Walk through what actually goes wrong if you remove the target network, in terms of the update dynamics.",
            "a": "THE SETUP. Without a target network the loss is (r + gamma*max_a' Q(s',a';theta) - Q(s,a;theta))^2, with the SAME theta in both terms. Note that in practice the gradient is still stopped through the target - it is a semi-gradient method - so the issue is not that you are differentiating the target; it is that the target FUNCTION moves every time you take a step. FAILURE MODE ONE: THE MOVING TARGET AND SELF-REINFORCEMENT. Suppose a gradient step raises Q(s,a). Because the network generalizes, it also raises Q at states similar to s - including, very often, s' itself, since consecutive states in a trajectory are highly similar in feature space. So the target r + gamma*max Q(s') also rises. The next update chases the raised target, raising Q further, which raises the target again. This is a positive feedback loop with gain roughly gamma times the generalization coefficient between s and s'. When that product exceeds one, the values grow without bound. With a table this cannot happen, because updating Q(s,a) does not touch Q(s',a'). Generalization - the thing that makes the network useful - is precisely what creates the loop. FAILURE MODE TWO: MAXIMIZATION BIAS AMPLIFIED. The max over actions selects whichever action has the largest positive approximation error. That inflated value becomes a bootstrap target for predecessor states, whose values inflate, and their errors propagate backward through the chain. With a frozen target this propagation happens once per sync and the network has time to fit consistently in between; without one it compounds every step. FAILURE MODE THREE: LOSS OF THE REGRESSION FRAMING. The stability of supervised learning rests on a fixed target function. A moving target turns the problem into a fixed-point iteration on a non-contraction, and the analytical guarantees are simply absent. Empirically it shows as Q values growing steadily while episode returns stay flat or collapse - a very characteristic signature, and one worth recognizing because it points immediately at this cause. WHY FREEZING FIXES IT. Between syncs the target is a fixed function, so you are solving a well-posed regression problem, and standard SGD analysis applies. The loop is not eliminated - it reappears at each sync - but it is SAMPLED at a low rate rather than run continuously, so the network has time to fit the current target before the target moves. The sync interval C is therefore a genuine hyperparameter: too short recovers the moving-target instability, too long means regressing toward stale values so learning is slow and the policy lags. THE VARIANTS THIS EXPLAINS. Polyak averaging - theta-minus <- tau*theta + (1-tau)*theta-minus with small tau - is the continuous version, giving a slowly-moving target rather than a periodically-jumping one, and it is standard in continuous-control methods where the abrupt jump interacts badly with the actor. Both are the same idea: put a low-pass filter between the network and its own target. THE GENERALIZABLE POINT. Any time a model generates its own training targets, ask what the loop gain is. That question covers target networks here, the KL anchor in RLHF, EMA teachers in self-supervised learning, and self-training in semi-supervised learning - all the same structure, and all solved by slowing one side of the loop down."
          }
        },
        {
          "q": "Your DQN's Q-values are growing steadily but episode return is flat. Diagnose it.",
          "a": "That specific combination is close to diagnostic, and it is the signature of value inflation rather than of a learning failure. I would work through it in order. FIRST, CONFIRM WHAT THE VALUES SHOULD BE. Compute the maximum possible discounted return from the reward scale and horizon: with rewards clipped to [-1,1] and gamma = 0.99, no state's value can exceed about 100. If Q values are in the thousands, they are not merely optimistic, they are impossible, and this is inflation rather than optimism. This check takes one minute and immediately rules half the hypotheses in or out. CAUSE 1: THE TARGET NETWORK IS EFFECTIVELY ABSENT. Either it is not being used, or the sync interval is so short that the target moves every step, or - a real bug I would check - the target network shares parameters with the online network because of how it was constructed. Then the self-reinforcing loop runs: raising Q(s,a) raises Q(s') through generalization, which raises the target, which raises Q further. Diagnostic: print the norm of the difference between online and target parameters; if it is near zero, they are the same network. CAUSE 2: TERMINAL BOOTSTRAPPING. If the (1 - done) factor is missing or wrong, value flows through terminal states and accumulates around them without bound. A subtler variant that I would specifically check: TIME-LIMIT TRUNCATION being recorded as termination, or worse, termination not being recorded at all for a time-limited environment. Print the value of states just before episode end. CAUSE 3: MAXIMIZATION BIAS WITHOUT DOUBLE DQN. Plain DQN's max both selects and evaluates using the same noisy estimates, and van Hasselt measured this producing substantial overestimation on Atari. Switching to Double DQN is a one-line change and is worth trying early precisely because it is so cheap. CAUSE 4: THE DEADLY TRIAD IN FULL. Very large replay buffer relative to policy change rate, a high learning rate, or a target sync interval that is too short. Diagnostic: reduce the learning rate substantially; if the growth slows proportionally, it is a dynamics problem rather than a bug. CAUSE 5, AND THE ONE THAT EXPLAINS THE FLAT RETURN: the values could be inflated by a CONSTANT and the policy would still be fine, since the greedy action depends on differences. Flat return alongside growing values suggests the inflation is not uniform - it is corrupting the ORDERING. So I would look at the spread of Q values across actions in a given state. If the advantages have collapsed - all actions nearly equal, with a large shared offset - the network is spending its capacity representing a large constant and the action distinctions are being lost in the noise. That is exactly what the dueling architecture addresses by separating V from A. WHAT I WOULD LOG GOING FORWARD, since this is a recurring class of problem: mean and max Q alongside the actual observed discounted return on evaluation episodes. Plotting predicted value against realized return is the single most informative diagnostic in value-based RL, it takes ten lines, and it turns 'the agent seems unstable' into a measured statement about overestimation. It is exactly the measurement the Double DQN paper made, and it is under-used."
        },
        {
          "q": "How do you evaluate a deep RL algorithm honestly?",
          "a": "This deserves a careful answer because the field's own reproducibility work showed the default practices are not adequate. THE CORE PROBLEM, from Henderson et al. and related work: deep RL results vary substantially with random seed, with implementation details that are not in the paper, with hyperparameters chosen per-method, and with the exact environment version. The variation is often larger than the gap between methods being compared, which means a single-seed comparison is not weak evidence, it is no evidence. WHAT I WOULD REQUIRE. (1) MULTIPLE SEEDS - five is a minimum and ten is better - and REPORT THE DISTRIBUTION, not the mean of the top runs and certainly not the best run. A common and serious error is reporting the max over seeds, which is a biased estimator of performance that gets worse the more seeds you run. (2) THE SPREAD SHOWN, ideally as individual seed curves or a percentile band rather than a standard error, since RL learning curves are frequently multimodal - some seeds solve the task and some never do, and a mean with error bars describes neither population. (3) TUNE EACH METHOD SEPARATELY with an equal budget, and say what that budget was. Comparing a tuned method against a baseline at its paper's default hyperparameters is one of the most common ways to manufacture a result. (4) FIX THE ENVIRONMENT VERSION AND PROTOCOL and state it. On Atari specifically: sticky actions or random no-op starts, because a deterministic emulator lets an agent memorize a single winning action sequence rather than learn a policy, and the score does not reveal which happened. Also state whether you report training scores or separate evaluation episodes, and whether evaluation is greedy. (5) REPORT SAMPLE EFFICIENCY, not only final performance - an algorithm that reaches the same score in a tenth of the interactions is a different proposition, and final-score tables hide that entirely. (6) USE AGGREGATE METRICS DESIGNED FOR THIS. Mean human-normalized score across games is dominated by a few games where scores can be enormous; interquartile mean and stratified bootstrap confidence intervals over the full run distribution are much more robust, and this is now standard practice in careful work. WHAT I WOULD ADD BEYOND THE STATISTICS. An ablation, because a combined method's headline number does not tell you what carried it - Rainbow's ablation is more valuable than Rainbow's score. And a measured mechanism where possible: the Double DQN paper's strength is that it predicted overestimation, MEASURED it against realized returns, and showed the fix reduced the measured quantity - not just the benchmark. A claim tied to a measured mechanism survives seed noise in a way a benchmark delta does not. THE POSTURE I WOULD RECOMMEND. Be most suspicious of your own small improvements. If an effect is within the seed spread, the honest report is that it is within the seed spread - and saying so is more useful than a confident claim that will not replicate.",
          "deepDive": {
            "q": "Given that seed variance is so large, how should a practitioner decide whether to adopt a technique?",
            "a": "I would separate the question into three, because they have different answers. QUESTION ONE: IS THERE A MECHANISM I UNDERSTAND? Techniques whose justification is structural survive better than techniques justified only by benchmark deltas. Target networks address a specific instability with an explicable loop; Double DQN addresses a bias that is provable from Jensen's inequality and was measured directly; multi-step returns address credit-propagation speed with a clear bias-variance account. Compare those against a technique justified by 'it improved mean score on 57 games by 3%'. When seed variance is large, a mechanism you can reason about is stronger evidence than an effect size you cannot reproduce - and it also tells you WHEN the technique should help, which lets you predict rather than hope. QUESTION TWO: HOW LARGE IS THE EFFECT RELATIVE TO THE NOISE? Rainbow's ablation is useful precisely because it separates large effects from small ones. Prioritized replay and multi-step returns produced large drops when removed; some others were small or game-dependent. I would adopt the large-effect components readily and treat the small ones as unresolved until I have measured them on MY problem. The general rule: an effect smaller than the seed spread should not be adopted on someone else's evidence, because you have no way to verify it and no reason to think it transfers. QUESTION THREE: WHAT DOES IT COST? Not just compute - complexity, hyperparameters, and failure modes. Prioritized replay adds a sum-tree, two hyperparameters, and a correction that is easy to get wrong. Distributional RL changes the loss and the output head. Each addition multiplies the space of things that can be subtly broken, and in a field where debugging is already hard because failures are silent, that cost is real and usually under-counted. HOW I WOULD ACTUALLY DECIDE. Start with the simplest thing that works - DQN with a target network, replay, Huber loss, and Double DQN, since that last one is one line and mechanistically justified. Get it working and establish a seed distribution on my own problem. Then add components ONE AT A TIME, each evaluated with the same seed protocol, and keep only those whose effect clearly exceeds my measured seed spread. That is slower than adopting Rainbow wholesale and it produces a system I can debug. THE STRUCTURAL POINT WORTH MAKING. The reproducibility problem is not primarily a statistics problem, it is an incentive problem: publishing rewards a positive delta, and the cheapest route to one is a favourable seed and a well-tuned method against an untuned baseline. As a practitioner you are not subject to that incentive - you want the thing to work - so you can afford the discipline of adopting only what you have verified. That asymmetry is worth exploiting rather than lamenting."
          }
        },
        {
          "q": "When would you choose DQN over a policy-gradient method, and vice versa?",
          "a": "THE DECIDING AXES, in the order they usually matter. AXIS 1: ACTION SPACE. DQN requires a max over actions, so it needs a discrete and enumerable action set. Continuous actions rule it out directly - you cannot argmax over a continuum - which is why continuous control is dominated by policy-gradient and actor-critic methods, and why the value-based methods that do work there (DDPG, TD3, SAC) all introduce a separate actor network specifically to produce the argmax. Very large discrete action spaces have the same problem in practice. This axis alone decides many cases. AXIS 2: SAMPLE EFFICIENCY VERSUS STABILITY, which is the real trade. DQN is off-policy: a replay buffer lets each transition be used many times, so it is far more sample-efficient. The price is the deadly triad and everything in this lesson built to manage it. On-policy policy-gradient methods discard data after each update - the data must match the current policy - so they are much hungrier, and in exchange they avoid the off-policy leg entirely and are markedly more stable and easier to get working. If interaction is cheap (a fast simulator, massive parallelism) buy stability with samples and use PPO. If interaction is expensive (a real robot, a live system) you need off-policy reuse. AXIS 3: WHAT KIND OF POLICY YOU NEED. Value-based methods produce a deterministic greedy policy. If you need a genuinely STOCHASTIC optimal policy - partial observability, adversarial or multi-agent settings where being predictable is exploitable, or anywhere you want entropy for exploration - policy-gradient methods represent that natively and value-based ones cannot. AXIS 4: HOW HARD THE REWARD STRUCTURE IS. Value-based methods with bootstrapping propagate reward information backward efficiently through a replay buffer, which helps in long-horizon sparse tasks. Policy gradients rely on sampling a good trajectory before they can reinforce it, which is harder when good trajectories are rare. WHAT I WOULD ACTUALLY REACH FOR. Discrete actions, expensive interaction: DQN with Double DQN and multi-step returns. Continuous actions, expensive interaction: SAC, which is off-policy actor-critic and gets much of DQN's efficiency with a continuous action space and entropy-regularized exploration. Cheap interaction, want it working quickly and reliably: PPO, essentially regardless of the action space - it is the default for good reasons, and its reliability across problems is worth more than a sample-efficiency advantage you may spend weeks debugging. THE HONEST CAVEAT. The empirical comparisons between these families are exactly the ones most affected by seed variance and per-method tuning, so I would hold the rankings loosely and rely on the structural arguments - action space, data reuse, policy class - which do not depend on benchmark noise."
        },
        {
          "q": "Explain prioritized experience replay, including why it needs a correction.",
          "a": "THE MOTIVATION. Uniform sampling from the replay buffer spends most updates on transitions the network already predicts well, where the TD error is near zero and the gradient contributes almost nothing. That is wasted computation, and it is especially wasteful in sparse-reward problems where the few informative transitions are a tiny fraction of the buffer. THE MECHANISM. Assign each transition a priority p_i = |delta_i| + epsilon, the magnitude of its last TD error plus a small constant so nothing has zero probability. Sample with probability proportional to p_i^alpha, where alpha interpolates between uniform (alpha = 0) and fully greedy prioritization (alpha = 1). After each update, recompute the sampled transitions' TD errors and update their priorities. New transitions get maximal priority so they are seen at least once. Implementation is a sum-tree, giving O(log N) sampling and updating. WHY IT NEEDS A CORRECTION - the part that matters. The loss is an EXPECTATION over the buffer's distribution. Changing which transitions you sample changes that expectation, so the gradient you compute is no longer an unbiased estimate of the gradient of the loss you meant to minimize. Concretely, high-error transitions are over-represented, so the network is fitted disproportionately to them, which biases the value function toward the noisiest parts of the state space. The fix is standard importance sampling: weight each sampled transition's loss by w_i = (1/(N*P(i)))^beta. At beta = 1 this exactly cancels the sampling bias; below 1 it partially corrects. TWO DETAILS THAT ARE EASY TO GET WRONG. (1) NORMALIZE BY THE MAXIMUM WEIGHT in the batch, so all weights are at most one and the correction only ever scales gradients DOWN. Without this the correction can produce very large gradients for rare transitions, which is exactly the instability you were trying to avoid. (2) ANNEAL BETA from about 0.4 toward 1 over training. The bias matters most near convergence, when you need unbiased estimates to settle correctly, and early on the extra bias is an acceptable price for faster learning. WHY IT HELPS AS MUCH AS IT DOES. Rainbow's ablation found prioritized replay among the largest contributors, and the reason is credit propagation. In a sparse-reward task, when a reward is first observed, exactly one transition has a large TD error. Uniform sampling replays it about as often as everything else, so information crawls backward. Prioritization replays it immediately, which creates a large TD error at its predecessor, which is then prioritized - so the reward information propagates backward along the trajectory quickly. It is doing a form of prioritized sweeping, the classic model-based idea, in a model-free setting. THE MODULE-THEME READING. This is the agent deliberately reshaping its own data distribution to learn faster - the feedback loop used as a tool rather than merely managed. And the correction is the price: any time you choose your own data non-uniformly, you owe an accounting for the bias you introduced. That is the same discipline as logging propensities in a bandit, and the same estimator."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "DQN's two devices map onto the deadly triad",
        "back": "REPLAY: makes SGD's iid assumption ~true and reuses data - but makes the data MORE off-policy. TARGET NET: weakens the BOOTSTRAPPING leg (between syncs it is plain supervised regression). A balanced pair - remove either alone and training destabilizes."
      },
      {
        "type": "intuition",
        "front": "Why a moving target diverges",
        "back": "Raising Q(s,a) also raises Q(s') through GENERALIZATION (consecutive states are similar), which raises the target, which raises Q again. Loop gain ~ gamma x generalization coefficient; above 1 it blows up. A table cannot do this - generalization is what creates the loop."
      },
      {
        "type": "formula",
        "front": "Double DQN target",
        "back": "y = r + gamma*Q(s', argmax_a' Q(s',a'; THETA); THETA-MINUS). Online net SELECTS, target net EVALUATES. One line, using two networks that already exist. Validated by MEASURING overestimation against realized returns, not just by scores."
      },
      {
        "type": "pitfall",
        "front": "Reward clipping is not preprocessing",
        "back": "Clipping to [-1,1] means the agent CANNOT prefer a 100-point reward to a 1-point one - a different MDP. It existed so one hyperparameter set spanned 49 games; later methods replaced it with adaptive normalization rather than keeping it."
      },
      {
        "type": "intuition",
        "front": "Frame stacking restores the Markov property",
        "back": "A single frame has no VELOCITY, so Q(s,a) over one frame is not a well-defined object. This is not a performance trick. Any problem with hidden velocity, latency, or mode needs the equivalent."
      },
      {
        "type": "formula",
        "front": "Prioritized replay + its correction",
        "back": "P(i) ~ p_i^alpha with p_i = |delta_i| + eps. IS weights w_i = (1/(N*P(i)))^beta, NORMALIZED BY MAX so they only scale gradients DOWN. Anneal beta 0.4 -> 1: bias matters most near convergence."
      },
      {
        "type": "intuition",
        "front": "Why prioritized replay helps so much",
        "back": "Credit propagation. When a sparse reward is first seen, ONE transition has a large TD error; prioritization replays it immediately, creating a large error at its predecessor, which is then prioritized. It is prioritized sweeping in a model-free setting."
      },
      {
        "type": "pitfall",
        "front": "Deep RL results are frequently within SEED VARIANCE",
        "back": "Henderson et al.: seeds, implementation details, and per-method tuning vary results by more than the gap between published methods. >= 5 seeds, report the SPREAD (curves or percentiles, not SEM - RL curves are often multimodal), never the max over seeds."
      },
      {
        "type": "intuition",
        "front": "Rainbow's ablation beats Rainbow's score",
        "back": "Prioritized replay and multi-step returns carried the most; distributional RL contributed clearly; Double DQN, dueling and noisy nets were smaller or game-dependent. Adopt large effects readily; treat sub-seed-spread effects as unresolved until measured on YOUR problem."
      },
      {
        "type": "pitfall",
        "front": "The growing-Q, flat-return signature",
        "back": "First check the ARITHMETIC ceiling (clipped rewards + gamma=0.99 caps value ~100). Then: target net effectively absent, terminal bootstrapping / time-limit truncation, maximization bias. Log PREDICTED value against REALIZED discounted return - the single best value-based diagnostic."
      },
      {
        "type": "definition",
        "front": "Polyak-averaged target",
        "back": "theta_minus <- tau*theta + (1-tau)*theta_minus with small tau - the continuous version of a periodic sync, giving a slowly-moving rather than jumping target. Standard in continuous control, where the abrupt jump interacts badly with the actor."
      },
      {
        "type": "pitfall",
        "front": "Evaluate with sticky actions",
        "back": "On a deterministic emulator an agent can MEMORIZE one winning action sequence rather than learn a policy - and the score will not reveal which happened. Sticky actions or random no-op starts are the minimum honest protocol."
      }
    ],
    "refs": [
      {
        "title": "Mnih et al. (2015), Human-level Control through Deep Reinforcement Learning",
        "url": "https://www.nature.com/articles/nature14236"
      },
      {
        "title": "van Hasselt, Guez & Silver (2016), Deep Reinforcement Learning with Double Q-learning",
        "url": "https://arxiv.org/abs/1509.06461"
      },
      {
        "title": "Schaul et al. (2016), Prioritized Experience Replay",
        "url": "https://arxiv.org/abs/1511.05952"
      },
      {
        "title": "Hessel et al. (2018), Rainbow: Combining Improvements in Deep Reinforcement Learning",
        "url": "https://arxiv.org/abs/1710.02298"
      },
      {
        "title": "Henderson et al. (2018), Deep Reinforcement Learning that Matters",
        "url": "https://arxiv.org/abs/1709.06560"
      }
    ],
    "demos": [
      "dqn",
      "prioritized-replay",
      "double-q-learning",
      "distributional-rl"
    ]
  },
  "policy-gradient": {
    "level": "core",
    "body": {
      "intuition": [
        "Value-based methods learn a value function and read a policy off it. Policy-gradient methods skip the intermediary and optimize the policy's parameters directly against expected return. Three reasons that is worth doing. CONTINUOUS ACTIONS: you cannot argmax over a continuum, so any method requiring a max over actions is structurally excluded. STOCHASTIC OPTIMAL POLICIES: under partial observability or in adversarial settings the best policy is genuinely randomized, and a greedy value method cannot represent that. And SMOOTHNESS: a small parameter change produces a small change in behaviour, whereas an epsilon-greedy policy over a value function flips discontinuously the instant two action values cross - which is a real source of instability in value-based learning.",
        "The obstacle looks fatal at first. Expected return depends on the trajectory distribution, which depends on the policy, so differentiating it seems to require differentiating through the ENVIRONMENT - through where the policy takes you, which you have no model of. The policy gradient theorem's remarkable content is that you do not. Using the identity grad p = p * grad log p, the gradient becomes an expectation you can sample, and the term involving how the state distribution shifts VANISHES. You need only the gradient of the log-probability of the actions you took, weighted by how good the outcome was. No model, no differentiating through dynamics.",
        "This is the module's theme at its sharpest. The agent's parameters determine the data distribution, and the theorem says that when you differentiate expected return, the dependence of the DATA on the parameters contributes nothing to the gradient - you can take the derivative as though the state distribution were fixed. That is what makes the whole family possible. What you pay for it is VARIANCE. The estimator is a product of a log-probability gradient and a sampled return, and returns over long trajectories are extremely noisy, so the raw estimator is nearly unusable. Essentially every technique in this lesson and the next - baselines, reward-to-go, advantage estimation, trust regions - exists to reduce that variance without reintroducing bias. Understanding policy gradients means understanding that one derivation and then a long list of variance reductions."
      ],
      "math": [
        {
          "h": "The policy gradient theorem, via the log-derivative trick",
          "paras": [
            "The whole derivation is three lines. Write the objective as an expectation over trajectories, push the gradient inside, and use grad p = p grad log p to turn it back into an expectation you can estimate from samples.",
            "The crucial cancellation: the trajectory probability factorizes into environment transitions times policy probabilities, and the log turns that product into a sum - in which every transition term is independent of theta and differentiates to zero."
          ],
          "tex": "\\nabla_\\theta J = \\nabla_\\theta \\mathbb{E}_{\\tau\\sim\\pi_\\theta}[R(\\tau)] = \\mathbb{E}_{\\tau}\\big[R(\\tau)\\,\\nabla_\\theta \\log p_\\theta(\\tau)\\big] \\\\[4pt] \\log p_\\theta(\\tau) = \\log p(s_0) + \\sum_t \\big[\\underbrace{\\log P(s_{t+1}|s_t,a_t)}_{\\nabla_\\theta = 0} + \\log \\pi_\\theta(a_t|s_t)\\big]",
          "texNote": "The dynamics terms vanish because they do not depend on theta - which is why this works with NO MODEL of the environment. You are not differentiating through where the policy takes you; you are only differentiating the probability of the actions you actually chose, weighted by the return that followed."
        },
        {
          "h": "Baselines: free variance reduction",
          "paras": [
            "Subtracting any function of the STATE from the return leaves the gradient unbiased, because the expected score function is zero. Subtracting a function of the ACTION does not, which is the line people cross.",
            "The practical choice is b(s) = V(s), which turns the weight into the advantage - how much better this action was than the policy's average from that state."
          ],
          "tex": "\\mathbb{E}_{a\\sim\\pi}\\big[\\nabla_\\theta \\log \\pi_\\theta(a|s)\\big] = \\sum_a \\nabla_\\theta \\pi_\\theta(a|s) = \\nabla_\\theta \\sum_a \\pi_\\theta(a|s) = \\nabla_\\theta 1 = 0 \\\\[4pt] \\Rightarrow\\; \\nabla_\\theta J = \\mathbb{E}\\big[\\nabla_\\theta\\log\\pi_\\theta(a_t|s_t)\\,(G_t - b(s_t))\\big] \\;\\;\\text{unbiased for any } b(s)",
          "texNote": "Why it reduces variance: without a baseline, if all returns are positive the update raises the probability of EVERY action taken and relies on the relative magnitudes to sort them out - which is a terrible signal-to-noise ratio. With V(s) subtracted, better-than-average actions get raised and worse-than-average ones get lowered, which is what you meant all along."
        },
        {
          "h": "Score function versus reparameterization",
          "paras": [
            "REINFORCE is the score-function estimator: it needs only the ability to evaluate log-probability, so it works for discrete actions and non-differentiable objectives, and it is high-variance. The reparameterization trick pushes the randomness into a fixed noise source and differentiates THROUGH the sample, which is far lower variance but requires a differentiable path.",
            "Knowing which one you are using explains most of the variance behaviour of a method, and it is the same distinction that separates the two families of gradient estimator in variational inference."
          ],
          "tex": "\\text{score fn: } \\nabla_\\theta \\mathbb{E}[f(a)] = \\mathbb{E}\\big[f(a)\\nabla_\\theta \\log \\pi_\\theta(a)\\big] \\\\[4pt] \\text{reparam: } a = \\mu_\\theta + \\sigma_\\theta \\epsilon,\\; \\epsilon\\sim\\mathcal{N}(0,I) \\;\\Rightarrow\\; \\nabla_\\theta \\mathbb{E}[f(a)] = \\mathbb{E}\\big[\\nabla_a f \\cdot \\nabla_\\theta a\\big]",
          "texNote": "The reparameterized form uses the gradient of f itself, so it exploits far more information per sample - which is why it is dramatically lower variance. It requires f to be differentiable in a, which the environment's return is not, but a learned critic IS: that is exactly the trick SAC uses, and it is the same identity that makes VAEs trainable."
        }
      ],
      "code": [
        {
          "h": "REINFORCE, with the two corrections that make it usable",
          "paras": [
            "The plain estimator is correct and nearly unusable. Reward-to-go and a baseline are both unbiased, both cost almost nothing, and together they are the difference between a method that learns and one that does not."
          ],
          "code": "def reinforce_loss(logps, rewards, values, gamma=0.99):\n    # 1. REWARD-TO-GO, not the full episode return. Actions cannot influence\n    #    rewards that already happened, so including them adds pure noise with\n    #    zero expected contribution. Unbiased, strictly lower variance.\n    G, out = 0.0, []\n    for r in reversed(rewards):\n        G = r + gamma * G\n        out.append(G)\n    G = torch.tensor(out[::-1])\n\n    # 2. BASELINE. Subtracting any function of STATE is unbiased because\n    #    E[grad log pi] = 0. V(s) is the practical choice -> the ADVANTAGE.\n    adv = G - values.detach()\n\n    # 3. NORMALIZE the advantages. Not unbiased in the strict sense, but it\n    #    decouples the learning rate from the reward SCALE, which otherwise\n    #    silently rescales every gradient. Universally done.\n    adv = (adv - adv.mean()) / (adv.std() + 1e-8)\n\n    # NOTE THE MINUS: optimizers descend, the objective ascends.\n    return -(logps * adv).mean()\n\n# WHY NOT SUBTRACT A FUNCTION OF THE ACTION? Because E[grad log pi * b(s)] = 0\n# requires b to be constant w.r.t. the sum over actions. A b(s,a) does NOT\n# come out of that sum and you get a biased gradient - this is the line people\n# cross when they invent a clever baseline.\n\n# THE ON-POLICY CONSTRAINT: logps must come from the CURRENT policy. After one\n# gradient step the data is stale and the estimator is no longer valid without\n# an importance-sampling correction. That is the whole reason PPO exists.",
          "caption": "Three lines of variance reduction, two of them exactly unbiased. Note the boundary: a baseline may depend on the state but not the action - crossing it silently biases the gradient, and it is the most common way a hand-rolled 'improvement' goes wrong."
        },
        {
          "h": "Why the raw estimator fails, measured",
          "paras": [
            "Worth running once so the variance problem is a number rather than an assertion. The gradient estimate from a handful of episodes is dominated by noise, and each correction is visible in the estimator's standard deviation."
          ],
          "code": "# Estimate the SAME gradient many times and look at its spread:\ndef grad_std(estimator, n_repeats=100, n_eps=10):\n    gs = [estimator(collect(n_eps)) for _ in range(n_repeats)]\n    return torch.stack(gs).std(0).mean()\n\n#   full return, no baseline ......... enormous spread; the sign of individual\n#                                      components flips between repeats\n#   + reward-to-go ................... clearly lower\n#   + value baseline ................. lower again - the biggest single win\n#   + advantage normalization ........ stable across reward scales\n#\n# WHY THE RAW VERSION IS SO BAD. The weight on every action in an episode is\n# the SAME total return, so a lucky episode raises the probability of every\n# action it contained, including the bad ones, and an unlucky episode lowers\n# all of them. The estimator is unbiased - average enough episodes and the\n# bad actions wash out - but the number of episodes needed is impractical.\n#\n# AND IF ALL RETURNS ARE POSITIVE (a common reward design), every update\n# raises the probability of every sampled action, and learning depends\n# entirely on the RELATIVE magnitudes surviving the noise. Subtracting a\n# baseline is what turns 'raise everything, some more than others' into\n# 'raise the good ones, lower the bad ones'.",
          "caption": "The estimator is unbiased and that is not sufficient - the number of episodes needed to average out the noise is impractical. The all-positive-returns case shows why a baseline is not an optimization but a repair."
        }
      ],
      "useCases": [
        "Continuous control - robotics, locomotion, manipulation, vehicle control - where a max over actions is not available and the policy must output a distribution over a continuous space.",
        "Any setting where the optimal policy is genuinely stochastic: partially observable environments, adversarial and multi-agent games where predictability is exploitable, and problems where you want to preserve behavioural diversity.",
        "Fine-tuning large models against a non-differentiable objective. RLHF and RL with verifiable rewards are policy gradients over token sequences - the reward is a black box, so only a score-function estimator is available, and every variance-reduction technique here applies directly.",
        "Problems with structured or combinatorial action spaces where the policy can be factorized and sampled from but a value function over all actions cannot be enumerated - routing, scheduling, sequence generation."
      ],
      "pitfalls": [
        "Using the full episode return instead of reward-to-go. Actions cannot affect rewards that already occurred, so those terms have zero expected contribution and pure variance. It is unbiased to drop them and it is free.",
        "Making the baseline depend on the action. b(s) is unbiased because the expected score function sums to zero over actions; b(s,a) does not come out of that sum and the gradient becomes biased. This is the most common way a hand-rolled improvement goes wrong.",
        "Not normalizing advantages. Without it the effective learning rate scales with the reward magnitude, so a change in reward scale silently retunes your optimizer - and the symptom is that hyperparameters stop transferring between environments for no visible reason.",
        "Reusing data after an update. The estimator is valid only for trajectories drawn from the CURRENT policy. One gradient step makes the batch stale, and continuing to use it without an importance-sampling correction gives a wrong gradient - which is precisely the problem PPO's clipped ratio is designed to bound.",
        "Ignoring reward scale entirely. The gradient magnitude is proportional to the return, so an environment with returns in the thousands and one with returns in the units need completely different learning rates unless you normalize. Normalize.",
        "Forgetting the entropy term in a deterministic-drifting policy. Policy gradients can collapse to a near-deterministic policy early, after which exploration stops and the run plateaus. An entropy bonus is the standard cheap insurance and its coefficient matters.",
        "Assuming low variance means correctness. Many variance reductions - advantage normalization, dropping the gamma^t weighting that the strict theorem requires, generalized advantage estimation with lambda below one - introduce bias that is accepted because it pays for itself. That is a defensible trade and it should be a known one rather than an accident."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/actor-critic",
          "text": "The direct continuation: replace the sampled return with a learned critic's estimate, trading variance for bias. Everything in that lesson - GAE, trust regions, PPO's clipping - is a further attack on the variance problem introduced here."
        },
        {
          "ref": "reinforcement-learning/dqn",
          "text": "The opposite trade. Value-based methods are off-policy and sample-efficient at the cost of the deadly triad; policy gradients stay on-policy and avoid it entirely, paying with data that must be discarded after every update."
        },
        {
          "ref": "generative/vae",
          "text": "The same estimator choice appears there: the reparameterization trick is what makes VAEs trainable, and it is low-variance precisely because it uses the gradient of the objective rather than only its value. REINFORCE is the score-function alternative you must fall back on when no differentiable path exists."
        },
        {
          "ref": "fine-tuning/rlhf-ppo",
          "text": "RLHF is a policy gradient over token sequences with a learned reward model. The reward is a black box, so only the score-function estimator is available - which is why every variance-reduction technique here reappears there, and why the KL term functions as a trust region."
        },
        {
          "ref": "reinforcement-learning/mdp-bellman",
          "text": "Note what the policy gradient theorem does NOT need: a model. The Bellman machinery requires P(s'|s,a); this derivation makes the dynamics terms differentiate to zero, which is why policy gradients were the natural route to model-free continuous control."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the policy gradient theorem?",
          "a": "grad J = E[grad log pi(a|s) * Q(s,a)]. The gradient of expected return is an expectation of the score function weighted by how good the outcome was."
        },
        {
          "q": "What is the log-derivative trick?",
          "a": "grad p = p * grad log p. It converts the gradient of an expectation into an expectation of a gradient, which you can then estimate from samples."
        },
        {
          "q": "Why do you not need a model of the environment?",
          "a": "The log trajectory probability is a sum of transition terms and policy terms, and the transition terms do not depend on theta, so they differentiate to zero."
        },
        {
          "q": "What is REINFORCE?",
          "a": "The Monte Carlo policy gradient: weight each action's score function by the sampled return that followed it. Unbiased and very high variance."
        },
        {
          "q": "Why is reward-to-go better than the full return?",
          "a": "An action cannot influence rewards that already happened, so those terms contribute zero in expectation and only add variance. Dropping them is unbiased and free."
        },
        {
          "q": "Why can you subtract a baseline?",
          "a": "Because the expected score function is zero - the gradient of the probabilities summing to one. So E[grad log pi * b(s)] = 0 for any b that does not depend on the action."
        },
        {
          "q": "What happens if the baseline depends on the action?",
          "a": "The gradient becomes biased. b(s,a) does not factor out of the sum over actions, so the cancellation that made baselines free no longer applies."
        },
        {
          "q": "What is the advantage?",
          "a": "A(s,a) = Q(s,a) - V(s): how much better an action was than the policy's average from that state. Using V as the baseline turns the weight into the advantage."
        },
        {
          "q": "Why normalize advantages?",
          "a": "It decouples the learning rate from the reward scale. Without it, changing the reward magnitude silently rescales every gradient and hyperparameters stop transferring."
        },
        {
          "q": "Why are policy gradients on-policy?",
          "a": "The expectation is over trajectories from the current policy. After one update the data is stale and the estimator is invalid without an importance-sampling correction."
        },
        {
          "q": "What is the difference between score-function and reparameterization estimators?",
          "a": "The score function needs only log-probabilities, works for discrete and non-differentiable objectives, and is high-variance. Reparameterization differentiates through the sample using the objective's own gradient, and is far lower variance."
        },
        {
          "q": "Why add an entropy bonus?",
          "a": "Policy gradients can collapse to a near-deterministic policy early, ending exploration. An entropy term keeps the distribution spread out and is cheap insurance."
        }
      ],
      "standard": [
        {
          "q": "How would you parameterize a policy for a continuous action space, and what goes wrong?",
          "a": "THE STANDARD CHOICE. A diagonal Gaussian: the network outputs a mean vector mu(s) and a log standard deviation, and the action is sampled from N(mu, sigma^2). Log-probability is analytic, entropy is analytic, and sampling is trivial. Diagonal rather than full covariance because the full version needs a Cholesky factor and the extra expressiveness rarely pays. THE FOUR THINGS THAT GO WRONG, in the order I have seen them bite. (1) UNBOUNDED SIGMA. If log-sigma is a free parameter it can run to negative infinity, giving a deterministic policy with exploding log-probabilities and a numerically broken loss, or to positive infinity, giving pure noise. CLAMP log-sigma to something like [-20, 2]. This is a one-line fix and its absence is a genuinely common bug. (2) STATE-INDEPENDENT VERSUS STATE-DEPENDENT SIGMA. A single global log-sigma parameter is the usual default and it is often better than a state-dependent head, because a state-dependent sigma lets the policy become confident in familiar states early and stop exploring there. If you do make it state-dependent, expect to work harder on entropy regularization. (3) ACTION BOUNDS. Real actuators have limits, and a Gaussian has infinite support. Naively CLIPPING the sampled action to the valid range is the common approach and it is subtly wrong: the log-probability you compute is for the unclipped action, so the gradient is inconsistent with what was actually executed, and probability mass piles up at the boundary invisibly. The principled fix is a squashing function - apply tanh and correct the log-probability by the log-determinant of the transformation's Jacobian, which is what SAC does. If you clip instead, at least know that you are introducing a bias. (4) ACTION SCALE. If different action dimensions have different physical ranges, a single sigma means the policy explores absurdly in one dimension and negligibly in another. Normalize the action space to roughly [-1,1] per dimension and let the environment wrapper rescale. THE ALTERNATIVES WORTH KNOWING. A BETA distribution has bounded support by construction, so it removes the clipping problem entirely and is a reasonable choice for bounded actions. DISCRETIZING each dimension into bins turns the problem back into a categorical policy, which is surprisingly competitive and removes all the above issues at the cost of resolution and of an action space that grows exponentially in dimensions if you need joint bins. And a DETERMINISTIC policy with added exploration noise is what DDPG and TD3 use, which changes the estimator from score-function to reparameterized. WHAT I WOULD CHECK FIRST when a continuous-control run misbehaves: log-sigma over training, the fraction of sampled actions hitting the bounds, and per-dimension action statistics. Those three catch most of the above, and none of them are logged by default."
        },
        {
          "q": "Derive the policy gradient theorem and explain why it is remarkable.",
          "a": "THE OBJECTIVE. J(theta) = E over trajectories drawn from pi_theta of the return R(tau). We want its gradient. THE APPARENT OBSTACLE. The expectation is over a distribution that DEPENDS on theta, so we cannot simply move the gradient inside. And the trajectory distribution involves the environment's transition kernel, which we have no model of and cannot differentiate. It looks like we would need to differentiate through the dynamics. THE DERIVATION, three steps. (1) Write J = integral over tau of p_theta(tau) R(tau). Differentiate: grad J = integral of grad p_theta(tau) * R(tau). (2) Apply the identity grad p = p * grad log p, which is just the chain rule on the logarithm. This gives grad J = integral of p_theta(tau) * grad log p_theta(tau) * R(tau) - which is once again an EXPECTATION under p_theta, so it can be estimated by sampling trajectories. (3) Expand log p_theta(tau). The trajectory probability factorizes as p(s_0) times the product over t of P(s_{t+1}|s_t,a_t) * pi_theta(a_t|s_t). The log turns that product into a sum, and every environment term - the initial-state distribution and every transition probability - is INDEPENDENT OF THETA and differentiates to zero. What survives is the sum of grad log pi_theta(a_t|s_t). RESULT: grad J = E[ sum_t grad log pi_theta(a_t|s_t) * R(tau) ]. WHY IT IS REMARKABLE, and this is what I would emphasize. The policy determines the data distribution - which states you visit depends on how you act. So naively, changing theta changes both what actions you take AND where you end up, and you would expect the gradient to have a term for the shifting state distribution. The derivation shows that term contributes nothing: you may differentiate as though the trajectory distribution were fixed, correcting only the log-probabilities of the actions actually taken. That is what makes model-free policy optimization possible at all. THE INTERPRETATION. grad log pi(a|s) points in the parameter direction that makes action a more likely. Multiplying by the return means good outcomes push the parameters toward the actions that produced them and bad outcomes push away - trial and error, made into a gradient. THE PRICE. Variance. The weight on every action in an episode is a noisy sampled return, so a lucky episode raises the probability of every action it contained including the bad ones. The estimator is unbiased and the number of episodes needed to average out the noise is impractical, which is why the rest of the subject is variance reduction: reward-to-go (unbiased), baselines (unbiased), advantage normalization and GAE (slightly biased, worth it).",
          "deepDive": {
            "q": "The strict theorem has a gamma^t discounting factor on the state distribution that essentially nobody implements. What is going on?",
            "a": "THE DISCREPANCY. Derived carefully for the discounted objective, the policy gradient is an expectation under the DISCOUNTED state distribution, which means each timestep's contribution should be weighted by gamma^t: grad J = E[ sum_t gamma^t * grad log pi(a_t|s_t) * A(s_t,a_t) ]. Standard implementations discount the RETURNS but do not apply gamma^t to the gradient terms - every timestep gets weight one. So essentially every practical implementation computes a biased estimate of the discounted objective. Thomas pointed this out explicitly, and the practice has not changed. WHY IT IS DONE ANYWAY. (1) THE gamma^t FACTOR DESTROYS LATE-EPISODE LEARNING. With gamma = 0.99 and a thousand-step episode, the final steps get weight about 4e-5. Those transitions contribute essentially nothing to the gradient, so the agent barely learns about the later portion of episodes - which is often where the interesting behaviour is. Effective sample size collapses. (2) THE DISCOUNTED OBJECTIVE IS USUALLY NOT WHAT YOU WANT. gamma is normally introduced as a variance-reduction and horizon-limiting device for the SOLVER, while the quantity you actually care about is the undiscounted episode return. If the true objective is undiscounted, then weighting all timesteps equally is arguably closer to the right thing, and the gamma in the returns is doing bias-variance work rather than defining the objective. (3) IT WORKS. This is not a satisfying justification, but the undiscounted-weighting version is what produced essentially all the results in the field, and the discrepancy does not appear to be a practical limitation. HOW TO THINK ABOUT IT PRECISELY. The unweighted estimator is a consistent gradient estimator for the AVERAGE-REWARD or undiscounted objective under certain conditions, and a biased one for the discounted objective. So the honest description is not 'everyone implements it wrong' but 'everyone optimizes a different objective than the one in the derivation, and it is usually the objective they wanted'. Which is a defensible position that is nonetheless worth stating out loud, because the derivation in most textbooks is for the discounted case. WHY THIS IS WORTH KNOWING FOR AN INTERVIEW. It is a good example of a gap between theory and practice where the practice is defensible and the reasoning is instructive. It also generalizes: several standard implementation choices in RL are biased with respect to the stated objective and are kept because the bias buys effective sample size - GAE with lambda below one, advantage normalization, and value-function bootstrapping at truncation boundaries are all in the same category. Being able to name which parts of your estimator are exact and which are pragmatic is a much more useful skill than being able to recite the theorem, because it tells you which approximations to suspect when something behaves unexpectedly."
          }
        },
        {
          "q": "Why is REINFORCE so high-variance, and what would you do about it?",
          "a": "THE SOURCES OF VARIANCE, and it helps to enumerate them because different fixes attack different ones. (1) THE RETURN ITSELF IS A NOISY RANDOM VARIABLE. It accumulates the stochasticity of the policy, the environment transitions, and the reward, over the whole episode. Its variance typically grows with horizon length - roughly linearly for independent per-step noise, worse when the noise compounds. (2) CREDIT IS ASSIGNED INDISCRIMINATELY. In the raw estimator, every action in an episode is weighted by the SAME total return. A single lucky outcome raises the probability of every action taken, including the bad ones, and relies on averaging over many episodes to sort them out. (3) THE ALL-POSITIVE-RETURNS PROBLEM. If your rewards are all positive - a very common design - then every update raises the probability of every sampled action, and learning depends entirely on the RELATIVE magnitudes surviving the noise. That is a terrible signal-to-noise ratio, and it is a design flaw rather than an inherent difficulty. (4) THE SCORE-FUNCTION ESTIMATOR IS INTRINSICALLY WEAK. It uses only the VALUE of the objective at sampled points, not its gradient, so it extracts far less information per sample than a reparameterized estimator would. THE FIXES, in order of value per unit of effort. (1) REWARD-TO-GO. Weight each action by the return from that point forward, not the whole episode. Exactly unbiased, since actions cannot influence past rewards and those terms have zero expectation. Free, and it addresses source (2) directly. (2) A VALUE BASELINE. Subtract V(s) so the weight becomes the advantage. Unbiased for any function of state, because the expected score function is zero. This is the single largest win, and it converts 'raise everything, some more than others' into 'raise better-than-average actions, lower worse-than-average ones' - addressing source (3) completely. (3) ADVANTAGE NORMALIZATION. Standardize the advantages within a batch. Not strictly unbiased, but it decouples the learning rate from the reward scale, and without it hyperparameters silently fail to transfer between environments. Universally done. (4) A LEARNED CRITIC INSTEAD OF SAMPLED RETURNS - which is actor-critic. This trades variance for BIAS, and it is the big lever: a one-step TD estimate has far lower variance than a full return and is biased by the critic's error. GAE then gives you a lambda knob to sit anywhere on that trade. (5) MORE PARALLEL ENVIRONMENTS. Unglamorous and extremely effective - the estimator's variance falls with batch size, and modern implementations run dozens to thousands of environments precisely for this reason. (6) REPARAMETERIZATION WHERE POSSIBLE. If actions are continuous and you have a differentiable critic, you can differentiate through the sampled action using the critic's gradient rather than using the score function. That is SAC's approach and it is dramatically lower variance, because it uses the gradient of the objective rather than only its value. WHAT I WOULD DO IN PRACTICE. Never run bare REINFORCE. Reward-to-go plus a value baseline plus normalization plus many parallel environments is the minimum viable configuration, and at that point you have essentially written A2C - which is the honest way to describe the relationship between the two."
        },
        {
          "q": "When would you choose a policy-gradient method over a value-based one?",
          "a": "FOUR CONDITIONS, and the first is usually decisive. (1) CONTINUOUS OR VERY LARGE ACTION SPACES. Value-based methods require argmax over actions, which is undefined over a continuum and impractical over a huge discrete set. A policy network simply outputs distribution parameters - a mean and standard deviation for a Gaussian, say - and sampling is trivial. This is why continuous control is dominated by policy-gradient and actor-critic methods, and why the value-based methods that do work there (DDPG, TD3, SAC) all bolt on an actor network specifically to produce the argmax. (2) THE OPTIMAL POLICY IS STOCHASTIC. Under full observability a finite MDP always has a deterministic optimal policy, so this seems not to matter - but it stops being true under PARTIAL OBSERVABILITY, where two states that look identical may require different actions and the best you can do is randomize; in ADVERSARIAL settings, where being predictable is exploitable and the equilibrium is mixed; and whenever you want to preserve behavioural diversity. Policy gradients represent stochastic policies natively; a greedy value method cannot. (3) YOU NEED SMOOTH POLICY CHANGES. This one is under-appreciated. An epsilon-greedy policy over a value function changes DISCONTINUOUSLY: a tiny change to two nearly-equal action values flips the argmax and the behaviour jumps. Policy gradients change the policy smoothly with the parameters, which makes the learning dynamics much better behaved and makes trust-region methods possible - you can bound how much the policy changed, which you cannot meaningfully do for a greedy policy. (4) THE OBJECTIVE IS NON-DIFFERENTIABLE OR A BLACK BOX. Optimizing a language model against a reward model, a verifier, or a human preference - there is no value function over token sequences you would want to argmax over, and the score-function estimator is the only tool available. WHEN I WOULD NOT. Sample efficiency. On-policy policy gradients must DISCARD data after each update, because the estimator is only valid for the current policy. Value-based methods reuse a replay buffer many times over. If interaction is expensive - a real robot, a live system - that difference typically dominates everything above, and the right answer is an off-policy actor-critic like SAC, which is genuinely a hybrid: a policy network for the continuous action space, a replay buffer and Q-functions for the sample efficiency. THE HONEST SUMMARY I WOULD GIVE. The families are not competitors so much as endpoints, and the methods people actually deploy sit in between. The structural questions - can I argmax, do I need stochasticity, can I afford to throw data away - decide it, and they do not depend on benchmark noise, which is why I would reason from them rather than from published rankings.",
          "deepDive": {
            "q": "Explain the score-function versus reparameterization distinction and why it matters beyond RL.",
            "a": "THE PROBLEM BOTH SOLVE. You want the gradient with respect to theta of an expectation E_{x ~ p_theta}[f(x)], where the DISTRIBUTION depends on theta. You cannot move the gradient inside naively. SCORE-FUNCTION ESTIMATOR (REINFORCE, likelihood ratio). Use grad p = p grad log p to get E[f(x) * grad log p_theta(x)]. Requirements: you must be able to sample from p_theta and evaluate grad log p_theta. You do NOT need f to be differentiable, or even continuous, or known analytically - it can be a black-box simulator, a human rating, or a discrete metric. Weakness: it uses only the VALUE of f at sampled points. The gradient information about theta comes entirely from the score function; f is just a scalar weight. So each sample carries little information about which direction to move, and variance is high - and it grows with the dimension of x and with the magnitude of f. REPARAMETERIZATION ESTIMATOR. Express the sample as a deterministic function of theta and a parameter-free noise variable: x = g_theta(epsilon) with epsilon from a fixed distribution. Then E_{p_theta}[f(x)] = E_epsilon[f(g_theta(epsilon))], and since the expectation is now over something independent of theta, you can move the gradient inside directly: E_epsilon[grad_x f * grad_theta g]. Requirements: f must be differentiable in x, and the distribution must admit such a reparameterization - Gaussians do (mu + sigma*epsilon), and discrete distributions do not without relaxation. Strength: it uses grad f, the actual gradient of the objective, so each sample tells you which DIRECTION to move rather than only how good the current point was. Variance is typically far lower, often by orders of magnitude. WHERE EACH APPEARS. Score function: REINFORCE and all policy gradients over discrete actions; RLHF and RL with verifiable rewards, where the reward is a black box over token sequences; variational inference with discrete latents; any optimization through a simulator you cannot differentiate. Reparameterization: VAEs - this trick is precisely what made them trainable, and the paper is largely about this identity; SAC, which reparameterizes the continuous action and backpropagates through a differentiable CRITIC, getting low-variance policy gradients; normalizing flows; most continuous latent-variable models. THE HYBRIDS, which are where the interesting engineering lives. Gumbel-Softmax relaxes a discrete distribution into a continuous one so it can be reparameterized, trading exactness for variance. Control variates - baselines - reduce score-function variance and are exactly what a value baseline does in RL; RELAX and REBAR build learned control variates for discrete variables. And note that SAC's approach is the general recipe: if the objective is a black box, LEARN a differentiable surrogate for it (the critic), then reparameterize through the surrogate. That converts a score-function problem into a reparameterization problem at the cost of the surrogate's bias. THE POINT I WOULD MAKE. Recognizing which estimator a method uses predicts its variance behaviour before you run anything, and it explains apparently unrelated design decisions across RL, generative modelling, and variational inference as instances of one choice. That is the kind of unification worth carrying between fields."
          }
        },
        {
          "q": "Your policy-gradient agent learns then collapses to a deterministic policy and stops improving. Diagnose it.",
          "a": "This is entropy collapse, and it is one of the characteristic failure modes of the family. THE MECHANISM. Policy gradients increase the log-probability of actions that led to good outcomes. Nothing in the objective rewards keeping the distribution spread out. So the policy can concentrate quickly - and once it is nearly deterministic, two things happen. It stops exploring, so it never discovers anything better. And the gradient itself dies: grad log pi for the near-certain action is near zero, since log pi is near zero and flat, so even if a better action existed the update signal to move toward it is vanishing. It is self-locking. WHAT I WOULD CHECK, in order. (1) LOG THE POLICY ENTROPY. This should be a standard metric in any policy-gradient run and it is the direct diagnostic. If entropy falls monotonically and hits near zero around when improvement stalls, that is the answer. If entropy is healthy and returns are flat, the problem is elsewhere. (2) IS THERE AN ENTROPY BONUS, and is its coefficient sensible? The standard fix is adding beta times entropy to the objective. Too small and it does nothing; too large and the policy stays diffuse and never commits. It usually wants tuning per environment, and a schedule that decays it over training is often better than a constant. (3) LEARNING RATE TOO HIGH. Large updates overshoot, concentrating probability mass on whatever happened to look good in one noisy batch, and the resulting deterministic policy then cannot recover. Entropy collapse and too-large steps are frequently the same problem, which is exactly what trust-region methods address. (4) ADVANTAGE NORMALIZATION MISSING. If advantages have a large scale, the effective step size is huge regardless of the nominal learning rate. (5) FOR GAUSSIAN POLICIES SPECIFICALLY: is the standard deviation learned or state-dependent, and is it bounded? An unbounded learned log-sigma can run to negative infinity, giving a deterministic policy and, worse, exploding log-probabilities. Clamping log-sigma to a sensible range is standard and its absence is a common bug. (6) IS IT ACTUALLY A LOCAL OPTIMUM? Policy gradients converge to local optima, and if the collapse is to a genuinely locally-optimal behaviour then entropy was a symptom rather than a cause. Diagnostic: initialize a fresh policy from the collapsed one but with higher entropy and see whether it finds anything better. THE STRUCTURAL FIXES beyond a bonus term. Maximum-entropy RL - SAC's formulation - puts entropy INTO the objective rather than adding it as a penalty, so the optimal policy is stochastic by definition and the temperature can be auto-tuned to hit an entropy target. That is a cleaner solution than a hand-tuned coefficient and it is one of the main reasons SAC is robust. A KL constraint against a previous policy also bounds how fast the distribution can concentrate, which is a different route to the same protection. WHAT I WOULD ADD TO THE LOGGING PERMANENTLY. Policy entropy, the KL divergence between consecutive policies, and the advantage statistics. Those three make most policy-gradient pathologies visible immediately, and none of them are on by default in most implementations."
        },
        {
          "q": "How does RLHF relate to what is in this lesson?",
          "a": "It is a policy gradient over token sequences, and recognizing that makes the whole stack legible rather than exotic. THE MAPPING. The POLICY is the language model: pi(a|s) is the probability of the next token given the context. An ACTION is a token, a STATE is the sequence so far, an EPISODE is generating one response, and the REWARD is a scalar from a reward model, delivered at the end of the sequence. So it is an MDP with an enormous discrete action space, a deterministic transition function (appending a token), and a terminal reward. WHY THE SCORE-FUNCTION ESTIMATOR IS FORCED. The reward is a black box with respect to the tokens - a separate network scoring a discrete sequence - so there is no differentiable path from the reward back to the policy parameters. You cannot reparameterize through a discrete token sampling step. That leaves REINFORCE-style estimation as the only option, which is exactly why every variance-reduction technique in this lesson reappears in RLHF: a value head as the baseline, advantage normalization, and GAE across token positions. WHAT MAPS ONTO WHAT, concretely. The value head in a PPO-based RLHF implementation is the baseline from this lesson, predicting the expected reward from a partial sequence. Whitening the rewards per batch is advantage normalization, and it is doubly necessary here because a reward model's scale is arbitrary - recall that a Bradley-Terry reward is identified only up to a per-prompt shift. PPO's clipped ratio is the trust region, bounding how far the policy can move on one batch of data, which matters because the data is on-policy and goes stale. THE ONE STRUCTURAL DIFFERENCE WORTH NAMING: the KL PENALTY against the reference model. In classical RL there is no privileged prior policy to stay near. In RLHF there is - the pretrained model - and the KL term is doing two jobs: it is a trust region in the sense of this lesson, and it is a constraint keeping the policy near a distribution the reward model was fitted on, which is what bounds reward-model overoptimization. That dual role is why it is the most important hyperparameter in the stack. AND GRPO IS A DIRECT DESCENDANT of the baseline discussion here. It drops the value network and computes the baseline as the MEAN REWARD OVER A GROUP of samples for the same prompt. That is legitimate for exactly the reason given in this lesson: a baseline may be any function of the state alone, and the group mean for a prompt is such a function, so the estimator stays unbiased while variance falls. It also removes the per-prompt reward shift by construction. WHAT I WOULD SAY THIS BUYS YOU. Someone who knows this lesson can read an RLHF implementation and identify every component's purpose, predict which hyperparameters are dangerous, and diagnose failures - a collapsing entropy, a policy drifting off the reward model's distribution, an advantage scale problem - using the same vocabulary. The apparent novelty of the RLHF stack is mostly this lesson's machinery applied to a very large action space with a learned reward."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Policy gradient theorem",
        "back": "grad J = E[ grad log pi_theta(a_t|s_t) * G_t ]. Derived via grad p = p*grad log p. The trajectory log-prob is a SUM of transition terms (theta-independent -> vanish) and policy terms - which is why NO MODEL is needed."
      },
      {
        "type": "intuition",
        "front": "What makes the theorem remarkable",
        "back": "The policy determines the DATA DISTRIBUTION, so you would expect a term for how the state distribution shifts. It contributes NOTHING. You may differentiate as though the trajectory distribution were fixed, correcting only the log-probs of actions actually taken."
      },
      {
        "type": "formula",
        "front": "Why baselines are free",
        "back": "E[grad log pi] = sum_a grad pi(a|s) = grad(sum_a pi) = grad 1 = 0. So subtracting ANY b(s) is unbiased. b(s,a) is NOT - it does not factor out of the sum over actions. That is the line hand-rolled 'improvements' cross."
      },
      {
        "type": "intuition",
        "front": "Why a baseline is a repair, not an optimization",
        "back": "With all-positive returns (a common reward design) every update RAISES the probability of every sampled action, and learning depends on relative magnitudes surviving the noise. Subtracting V(s) turns that into 'raise better-than-average, lower worse-than-average'."
      },
      {
        "type": "definition",
        "front": "Reward-to-go",
        "back": "Weight each action by the return FROM THAT POINT FORWARD, not the whole episode. Exactly unbiased - actions cannot influence past rewards, so those terms have zero expectation and contribute only variance."
      },
      {
        "type": "intuition",
        "front": "Score function vs reparameterization",
        "back": "SCORE FN uses only the VALUE of f at sampled points -> works for black-box/discrete objectives, high variance. REPARAM (x = mu + sigma*eps) uses grad_x f -> tells you which DIRECTION to move, far lower variance, needs a differentiable path. Same choice as VAE vs REINFORCE."
      },
      {
        "type": "pitfall",
        "front": "Policy gradients are ON-POLICY",
        "back": "The estimator is valid only for trajectories from the CURRENT policy. One gradient step makes the batch stale. Reusing it without importance correction gives a wrong gradient - which is exactly what PPO's clipped ratio bounds."
      },
      {
        "type": "pitfall",
        "front": "Normalize advantages",
        "back": "Gradient magnitude is proportional to the return, so the effective learning rate scales with the REWARD SCALE. Without normalization hyperparameters silently fail to transfer between environments, and the symptom names no cause."
      },
      {
        "type": "pitfall",
        "front": "Entropy collapse is self-locking",
        "back": "Once the policy is near-deterministic, exploration stops AND the gradient dies (grad log pi is near zero and flat for a near-certain action), so it cannot recover. Log policy entropy always. Fixes: entropy bonus, lower LR, clamp log-sigma, or max-entropy RL (SAC)."
      },
      {
        "type": "intuition",
        "front": "The gamma^t factor nobody implements",
        "back": "The strict discounted theorem weights step t by gamma^t; implementations use weight 1. With gamma=0.99 over 1000 steps the last steps would get ~4e-5 - effective sample size collapses. The honest framing: everyone optimizes the UNDISCOUNTED objective, which is usually the one they wanted."
      },
      {
        "type": "intuition",
        "front": "RLHF is this lesson over tokens",
        "back": "Policy = LM, action = token, episode = one response, terminal reward = reward model. The reward is a BLACK BOX over discrete tokens, so the score-function estimator is FORCED. Value head = baseline; reward whitening = advantage normalization; PPO clip = trust region."
      },
      {
        "type": "intuition",
        "front": "GRPO's baseline is this lesson's theorem",
        "back": "It replaces the value network with the MEAN REWARD OVER A GROUP of samples for the same prompt. Legitimate because a baseline may be any function of the STATE alone - and the group mean for a prompt is exactly that, so the estimator stays unbiased."
      }
    ],
    "refs": [
      {
        "title": "Williams (1992), Simple Statistical Gradient-Following Algorithms for Connectionist RL (REINFORCE)",
        "url": "https://link.springer.com/article/10.1007/BF00992696"
      },
      {
        "title": "Sutton et al. (2000), Policy Gradient Methods for RL with Function Approximation",
        "url": "https://papers.nips.cc/paper/1999/hash/464d828b85b0bed98e80ade0a5c43b0f-Abstract.html"
      },
      {
        "title": "Kakade (2001), A Natural Policy Gradient",
        "url": "https://papers.nips.cc/paper/2001/hash/4b86abe48d358ecf194c56c69108433e-Abstract.html"
      },
      {
        "title": "Greensmith, Bartlett & Baxter (2004), Variance Reduction Techniques for Gradient Estimates in Reinforcement Learning",
        "url": "https://www.jmlr.org/papers/v5/greensmith04a.html"
      },
      {
        "title": "Thomas (2014), Bias in Natural Actor-Critic Algorithms",
        "url": "https://proceedings.mlr.press/v32/thomas14.html"
      }
    ],
    "demos": [
      "policy-gradient",
      "gae",
      "max-entropy-rl",
      "gridworld-rl"
    ]
  },
  "actor-critic": {
    "level": "advanced",
    "body": {
      "intuition": [
        "REINFORCE weights each action by a sampled return, which is unbiased and extremely noisy. Actor-critic replaces that sample with a LEARNED estimate: a critic predicts the value, the actor uses the resulting advantage as its weight. That is a bias-for-variance trade, and it is the same trade as Monte Carlo versus TD from earlier in the module - here applied to the policy gradient's weighting term rather than to a value estimate. Generalized advantage estimation then gives you the dial: a lambda parameter interpolating between a one-step TD advantage (low variance, biased by the critic's error) and a full Monte Carlo advantage (unbiased, noisy), by exponentially averaging all the n-step estimators in between.",
        "The second problem is the one that defines this lesson, and it is the module's theme in its sharpest form. A policy gradient is computed from data generated by the CURRENT policy. Take a large step and the policy changes, which changes the state distribution - so the data you used to compute the step no longer describes the policy you now have. The gradient was valid only locally, and a step big enough to matter can be big enough to invalidate its own justification. This is not a numerical issue; it is the feedback loop. Value-based methods have nothing quite like it because their target does not depend on which states the current policy visits.",
        "Trust-region methods are the answer: bound how far the policy may move in a single update, measured in POLICY space rather than parameter space - because equal-sized parameter steps can produce wildly different behavioural changes depending on where you are. TRPO does this properly, constraining the KL divergence between old and new policies and solving the constrained problem with a natural-gradient step and a line search, with a monotonic-improvement guarantee behind it. PPO replaces the constraint with a clipped surrogate objective that is far simpler and became the default. Then the honest coda, which parallels the DQN lesson's: Engstrom et al. took PPO apart and found that much of its advantage over TRPO came from CODE-LEVEL OPTIMIZATIONS - value clipping, reward scaling, orthogonal initialization, learning-rate annealing, gradient clipping - rather than from the clipped objective, and that the clipping does not in fact enforce a trust region in the way its motivation suggests. The algorithm works; the explanation for why it works was substantially wrong."
      ],
      "math": [
        {
          "h": "The actor-critic gradient, and where the bias enters",
          "paras": [
            "Same policy gradient as before, with the sampled return replaced by an advantage estimate computed from a learned critic. The one-step form uses a single TD error, which is exactly the quantity from temporal-difference learning.",
            "The bias is entirely the critic's error. If V were exact the estimate would be unbiased; it is not, so you are trading a noisy unbiased signal for a smooth biased one."
          ],
          "tex": "\\nabla_\\theta J = \\mathbb{E}\\big[\\nabla_\\theta \\log \\pi_\\theta(a_t|s_t)\\, A_t\\big], \\qquad \\hat{A}_t^{(1)} = \\underbrace{r_t + \\gamma V_\\phi(s_{t+1}) - V_\\phi(s_t)}_{\\delta_t,\\;\\text{the TD error}}",
          "texNote": "Note the critic appears only as a WEIGHT - no gradient flows from the actor's loss into phi, and the critic is trained separately by regression on returns. Forgetting to detach the advantage is a common bug that couples the two objectives and destabilizes both."
        },
        {
          "h": "Generalized advantage estimation: the bias-variance dial",
          "paras": [
            "Rather than choosing a single n for an n-step advantage, take an exponentially weighted average of all of them. The resulting expression is strikingly simple - a discounted sum of TD errors.",
            "lambda = 0 gives the one-step TD advantage; lambda = 1 gives the Monte Carlo advantage. It is TD(lambda) applied to advantages, and it is the same eligibility-trace machinery from earlier in the module."
          ],
          "tex": "\\hat{A}_t^{\\text{GAE}(\\gamma,\\lambda)} = \\sum_{l=0}^{\\infty} (\\gamma\\lambda)^{l}\\, \\delta_{t+l}, \\qquad \\lambda=0 \\Rightarrow \\delta_t, \\quad \\lambda=1 \\Rightarrow G_t - V(s_t)",
          "texNote": "Two discount-like parameters doing different jobs, which is worth separating: gamma sets the HORIZON of the problem and changes what is optimal, while lambda sets the BIAS-VARIANCE trade of the estimator and does not change the objective. Typical values are gamma 0.99 and lambda 0.95, and lambda is much safer to tune."
        },
        {
          "h": "PPO's clipped surrogate, and why the min is the whole trick",
          "paras": [
            "Let r_t be the probability ratio between the new and old policies. The surrogate objective is the minimum of the unclipped and clipped terms, which makes it a PESSIMISTIC bound on the improvement.",
            "The asymmetry is the part most explanations skip. The min means clipping only binds when the update would IMPROVE the surrogate - so the objective removes the incentive to move far in a good direction, while leaving the gradient intact for moving BACK if a step went the wrong way."
          ],
          "tex": "r_t(\\theta) = \\frac{\\pi_\\theta(a_t|s_t)}{\\pi_{\\theta_{\\text{old}}}(a_t|s_t)}, \\qquad L^{\\text{CLIP}} = \\mathbb{E}\\Big[\\min\\big(r_t \\hat{A}_t,\\; \\mathrm{clip}(r_t, 1-\\epsilon, 1+\\epsilon)\\,\\hat{A}_t\\big)\\Big]",
          "texNote": "Work through the two cases. If A > 0 and r rises above 1+eps, the clipped term is smaller, so the min selects it and the gradient vanishes - no reward for pushing further. If A < 0 and r falls below 1-eps, the clipped term is again the smaller (more negative times a bound), so the gradient vanishes there too. But if a previous epoch pushed r too far in the WRONG direction, the unclipped term is selected and the gradient still points back. That one-sidedness is what makes it a bound rather than a symmetric penalty."
        }
      ],
      "code": [
        {
          "h": "GAE and the A2C update",
          "paras": [
            "GAE is a single backward pass and it is the component that most reliably improves a policy-gradient implementation. The 1 - done factor appears twice and both matter."
          ],
          "code": "def gae(rewards, values, dones, last_value, gamma=0.99, lam=0.95):\n    adv, gae_t = torch.zeros_like(rewards), 0.0\n    values = torch.cat([values, last_value[None]])\n    for t in reversed(range(len(rewards))):\n        nonterminal = 1.0 - dones[t]\n        delta = rewards[t] + gamma * values[t+1] * nonterminal - values[t]\n        gae_t = delta + gamma * lam * nonterminal * gae_t   # <- the recursion\n        adv[t] = gae_t\n    return adv, adv + values[:-1]                # returns = advantages + values\n\n# TWO PARAMETERS DOING DIFFERENT JOBS:\n#   gamma  - sets the HORIZON. Changes what is optimal. A modelling choice.\n#   lambda - sets the estimator's BIAS-VARIANCE. Does NOT change the objective.\n#            Much safer to tune. 0.95 is a good default; 1.0 = Monte Carlo.\n\n# THE A2C UPDATE - three terms, and the coefficients matter:\nloss = (-(logp * adv.detach()).mean()                 # actor: DETACH the advantage\n        + 0.5 * F.mse_loss(value_pred, returns)       # critic: plain regression\n        - 0.01 * entropy.mean())                      # entropy bonus vs collapse\n\n# WHY DETACH: the critic is a WEIGHT in the actor's gradient, not a path for\n# it. Leaving it attached couples the two objectives - the actor starts\n# optimizing the critic to make its own advantages look good - and both\n# destabilize. Easy bug, hard symptom.\n#\n# TRUNCATION vs TERMINATION: at a TIME LIMIT the episode did not really end,\n# so you must BOOTSTRAP with V(s_final). Treating truncation as termination\n# teaches the agent the world stops arbitrarily, and it is one of the most\n# common silent bugs in on-policy implementations.",
          "caption": "Detaching the advantage is load-bearing: the critic is a weight in the actor's gradient, not a path for it. And note truncation versus termination - at a time limit you must bootstrap, or the agent learns that the world ends at random."
        },
        {
          "h": "PPO, and the implementation details that turned out to carry it",
          "paras": [
            "The clipped objective is short. The list underneath it is the uncomfortable part of this lesson: a careful ablation found much of PPO's advantage came from those lines rather than from the objective."
          ],
          "code": "for epoch in range(K):                     # MULTIPLE passes over one batch -\n    for mb in minibatches(batch):          # this is what buys sample efficiency,\n        ratio = (new_logp - old_logp).exp()  # and it is WHY the ratio is needed:\n                                             # after epoch 1 the data is off-policy\n                                             # with respect to the current policy.\n        s1 = ratio * adv\n        s2 = torch.clamp(ratio, 1-eps, 1+eps) * adv\n        actor_loss = -torch.min(s1, s2).mean()   # PESSIMISTIC: see the min\n\n# ENGSTROM ET AL. TOOK PPO APART and found much of its gain over TRPO came\n# from CODE-LEVEL OPTIMIZATIONS rather than the clipped objective - and that\n# clipping does NOT enforce a trust region the way the motivation implies\n# (the KL between old and new policies routinely exceeds what eps suggests).\n# The techniques that carried it:\n#\n#   value-function loss clipping        reward / observation normalization\n#   orthogonal init + tuned gain        learning-rate annealing\n#   global gradient-norm clipping       Adam epsilon tuning\n#   advantage normalization per batch   separate actor/critic networks\n#\n# WHAT TO TAKE FROM THIS. Not that PPO is bad - it works and it is the right\n# default. Rather: (1) reproduce a baseline WITH its implementation details or\n# your comparison is meaningless; (2) an algorithm's stated mechanism and its\n# actual mechanism can differ, and only ablation distinguishes them; (3) LOG\n# THE ACTUAL KL between old and new policies, because eps does not control it\n# and the KL is what you actually care about.",
          "caption": "The multiple epochs are the point - they make the data off-policy with respect to the updated policy, which is exactly what the ratio corrects for. And the list below is why you must reproduce a baseline with its implementation details before claiming to have beaten it."
        }
      ],
      "useCases": [
        "Continuous control at scale - locomotion, manipulation, simulated robotics - where PPO is the default first thing to try because it is robust across environments and forgiving of hyperparameters relative to the alternatives.",
        "RLHF and RL with verifiable rewards for language models, which are PPO or GRPO over token sequences. The clipped ratio and the value baseline transfer directly; the KL-to-reference term plays the trust-region role and additionally bounds reward-model overoptimization.",
        "Any setting with cheap parallel simulation, where on-policy methods shine: thousands of parallel environments make the gradient estimate accurate enough that the sample inefficiency stops mattering and the stability advantage dominates.",
        "As the reliable baseline in a research comparison. PPO's robustness means a failure to beat it is usually informative, and its sensitivity to implementation details means beating it requires reproducing those details first."
      ],
      "pitfalls": [
        "Not detaching the advantage in the actor loss. The critic is a weight in the actor's gradient, not a path for it - leaving it attached lets the actor optimize the critic to make its own advantages look good, and both objectives destabilize.",
        "Treating time-limit truncation as termination. The episode did not really end, so you must bootstrap with V(s_final) at a truncation. Zeroing it teaches the agent that the world stops arbitrarily, and it is one of the most common silent bugs in on-policy code.",
        "Confusing gamma and lambda. Gamma sets the horizon and changes which policy is optimal - a modelling choice. Lambda sets the estimator's bias-variance and does not change the objective. Tune lambda freely; treat gamma as part of the problem specification.",
        "Assuming PPO's epsilon enforces a KL bound. It does not - measured KL between consecutive policies routinely exceeds what epsilon would suggest. Log the actual KL, and consider early-stopping the epoch loop when it exceeds a target, which is what several strong implementations do.",
        "Comparing against a baseline without its implementation details. Engstrom et al. found much of PPO's advantage over TRPO came from value clipping, reward normalization, orthogonal initialization and learning-rate annealing. A comparison against a stripped-down baseline measures the details, not the idea.",
        "Running too many epochs over one batch. More epochs extract more from the data and push the policy further from the one that generated it, so the ratio correction is doing more work and the estimate degrades. Three to ten is typical, and the right number interacts with batch size and epsilon.",
        "Forgetting the entropy bonus, or leaving it at a default. Policy-gradient methods collapse to deterministic policies and then stop learning, and the coefficient generally needs tuning per environment - a decaying schedule is often better than a constant."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/policy-gradient",
          "text": "This lesson is that lesson's variance problem, attacked twice: a learned critic replaces the noisy sampled return, and GAE gives an explicit dial on the resulting bias-variance trade."
        },
        {
          "ref": "reinforcement-learning/mc-td",
          "text": "GAE is TD(lambda) applied to advantages rather than values - the same eligibility-trace machinery and the same lambda knob, which is a good reason to have understood it there where it is simpler."
        },
        {
          "ref": "fine-tuning/rlhf-ppo",
          "text": "The direct application: PPO over token sequences with a learned reward model. The KL-to-reference term does double duty as a trust region and as the control on reward-model overoptimization, which is why it is the most consequential hyperparameter there."
        },
        {
          "ref": "reinforcement-learning/dqn",
          "text": "The opposite side of the stability-versus-efficiency trade. On-policy methods avoid the deadly triad by keeping data matched to the policy, and pay by discarding it after a few epochs; DQN reuses everything and spends its effort managing the triad instead."
        },
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "What happens when the trust region becomes the entire problem. Offline methods cannot collect new on-policy data at all, so constraining the policy to stay near the data distribution stops being a stability device and becomes the central objective."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is an actor-critic method?",
          "a": "A policy gradient where the sampled return is replaced by an advantage computed from a learned value function. The critic reduces variance and introduces bias equal to its own error."
        },
        {
          "q": "What is the advantage?",
          "a": "A(s,a) = Q(s,a) - V(s). The one-step estimate is the TD error r + gamma*V(s') - V(s)."
        },
        {
          "q": "What is GAE?",
          "a": "An exponentially weighted average of all n-step advantage estimators, which reduces to a discounted sum of TD errors with decay gamma*lambda."
        },
        {
          "q": "What do gamma and lambda each control?",
          "a": "Gamma sets the horizon and changes which policy is optimal. Lambda sets the estimator's bias-variance trade and does not change the objective."
        },
        {
          "q": "Why do policy-gradient methods need a trust region?",
          "a": "The gradient is computed from data generated by the current policy. A large step changes the state distribution, so the data no longer describes the policy you now have."
        },
        {
          "q": "What does TRPO constrain?",
          "a": "The KL divergence between the old and new policies - a bound in policy space rather than parameter space, solved with a natural-gradient step and a line search."
        },
        {
          "q": "Why measure the step in policy space rather than parameter space?",
          "a": "Equal-sized parameter steps produce wildly different behavioural changes depending on where you are. KL measures what actually matters, which is how much the behaviour changed."
        },
        {
          "q": "What is PPO's clipped objective?",
          "a": "min(r_t * A_t, clip(r_t, 1-eps, 1+eps) * A_t), where r_t is the ratio of new to old action probabilities."
        },
        {
          "q": "Why the min rather than just the clip?",
          "a": "It makes the objective a pessimistic bound. Clipping binds only when the update would improve the surrogate, so the gradient still points back if a previous epoch moved too far the wrong way."
        },
        {
          "q": "Why does PPO need the ratio at all?",
          "a": "Because it takes multiple epochs over one batch. After the first epoch the data is off-policy with respect to the updated policy, and the ratio is the importance correction."
        },
        {
          "q": "Does PPO's epsilon enforce a KL bound?",
          "a": "No. Measured KL between consecutive policies routinely exceeds what epsilon implies. Log the actual KL and consider early-stopping the epoch loop on it."
        },
        {
          "q": "What did Engstrom et al. find about PPO?",
          "a": "Much of its advantage over TRPO came from code-level optimizations - value clipping, reward normalization, orthogonal init, learning-rate annealing - rather than from the clipped objective."
        }
      ],
      "standard": [
        {
          "q": "Should the actor and critic share parameters? Argue both sides.",
          "a": "A real design decision with no universal answer, and the reasoning is more useful than the verdict. THE CASE FOR SHARING A TRUNK. Both networks need to understand the same observation - from pixels, both need to know where things are; from proprioception, both need the same physical state. Learning that representation twice is wasteful, and the critic's regression signal is often DENSER and better-conditioned than the actor's policy-gradient signal, so it can act as a useful auxiliary task that shapes the shared features. This matters most with high-dimensional observations where representation learning is the expensive part - which is why shared trunks are standard in Atari-style pixel-based work. THE CASE AGAINST. The two objectives have very different scales and very different gradient characteristics. The critic is doing regression toward returns, whose magnitude depends entirely on the reward scale; the actor is maximizing a normalized advantage. So you need a coefficient balancing them - typically 0.5 on the value loss - and that coefficient is now a hyperparameter coupling two objectives that would otherwise be independent. Worse, the value loss can DOMINATE: if returns are large, the critic's gradients swamp the actor's and the policy barely moves, which presents as a policy that will not learn while the value loss falls nicely. And the two want different learning rates - critics generally tolerate and benefit from higher rates than actors. WHAT THE EVIDENCE SAYS. In continuous-control benchmarks from low-dimensional state, SEPARATE networks are generally better and are what most strong implementations use - the observation is small so there is nothing expensive to share, and decoupling removes the balancing problem. From PIXELS, sharing is usually better because the convolutional trunk is the expensive part and the auxiliary signal helps. The large-scale empirical studies of on-policy RL design choices came down on separate networks as the safer default for the standard continuous-control suites, which is a useful prior. WHAT I WOULD ACTUALLY DO. Separate networks unless observations are high-dimensional. If sharing, then: normalize returns or use a value-loss coefficient tuned deliberately rather than inherited; consider stopping the actor's gradient into the trunk so only the critic shapes the representation, which gets the sharing benefit without the interference; and watch the ratio of value-loss to policy-loss gradient norms, because that number tells you immediately whether one objective is dominating. THE DIAGNOSTIC THAT SETTLES IT ON A GIVEN PROBLEM. Log the critic's EXPLAINED VARIANCE on returns and the policy entropy together. If explained variance is high and the policy is not improving, the critic is fine and the actor is being starved - which points at the balance. If explained variance is near zero, the critic is the problem regardless of architecture, and sharing is making it worse by injecting a useless gradient into the trunk."
        },
        {
          "q": "Explain the progression from REINFORCE through A2C to PPO.",
          "a": "IT IS A SEQUENCE OF FIXES TO TWO PROBLEMS: variance, and the fact that a policy update invalidates its own data. PROBLEM 1 AND ITS FIXES - VARIANCE. REINFORCE weights each action by a sampled return, which is unbiased and extremely noisy because it accumulates the randomness of an entire trajectory. First fix: reward-to-go and a baseline, both exactly unbiased. Second fix, and the step that defines actor-critic: replace the sampled return entirely with a LEARNED critic. Now the weight is an advantage estimate, r + gamma*V(s') - V(s), whose variance is dramatically lower because it involves one reward and two value estimates rather than a whole trajectory. The cost is bias equal to the critic's error - the same Monte-Carlo-versus-TD trade from earlier in the module, applied to the policy gradient's weight. GAE then makes that trade explicit: an exponentially weighted average of all n-step advantage estimators, collapsing to a discounted sum of TD errors, with lambda = 0 giving the one-step version and lambda = 1 giving Monte Carlo. Typical lambda around 0.95, and I would stress that lambda is safe to tune while gamma is not, because gamma changes which policy is optimal and lambda only changes the estimator. A2C is then this assembled: parallel environments for a decorrelated batch, GAE advantages, a shared or separate critic trained by regression, and an entropy bonus against policy collapse. PROBLEM 2 AND ITS FIXES - THE POLICY INVALIDATES ITS OWN DATA. The gradient is valid for the policy that generated the batch. A big step changes the state distribution, so the justification for the step no longer holds. This is the feedback loop, and it does not have a clean analogue in value-based methods. TRPO's answer: constrain the KL divergence between old and new policies, which measures the change in POLICY space rather than parameter space - an important distinction, since equal parameter steps produce very different behavioural changes depending on where you are. It solves the constrained problem with a natural-gradient direction and a line search, and it comes with a monotonic-improvement guarantee. It is also complicated, requiring conjugate gradients and Fisher-vector products. PPO's answer: drop the constraint, use a clipped surrogate. The min of the unclipped and clipped terms makes the objective a pessimistic bound, so there is no gradient reward for pushing the ratio beyond 1 +/- epsilon while the gradient still points back if you overshot. It is a few lines, it allows multiple epochs over one batch - which is where its sample efficiency comes from and also why the ratio is needed at all - and it became the default. THE HONEST CLOSE. Engstrom et al. ablated PPO carefully and found much of its edge over TRPO came from implementation details rather than the objective, and that the clipping does not enforce a trust region in the sense its motivation suggests. That does not make PPO wrong - it is still the right default - but it means the stated mechanism and the operative mechanism differ, and it is why I would log the actual KL rather than trusting epsilon.",
          "deepDive": {
            "q": "Work through PPO's clipped objective case by case. Why is the min essential, and what does clipping fail to do?",
            "a": "SETUP. r = pi_new(a|s) / pi_old(a|s), the probability ratio, which is 1 at the start of each epoch. A is the advantage estimate. The objective is min(r*A, clip(r, 1-eps, 1+eps)*A). CASE 1: A > 0, r rising above 1+eps. We want to increase this action's probability, and we have already increased it beyond the band. Unclipped term: r*A, still growing with r. Clipped term: (1+eps)*A, constant. The min selects the CLIPPED one since it is smaller, and it has zero gradient in r. So there is no incentive to push further. Correct. CASE 2: A < 0, r falling below 1-eps. We want to decrease this action's probability and have gone past the band. Unclipped: r*A, which is a small number times a negative - and as r falls, r*A rises toward zero, so the unclipped term is LARGER. Clipped: (1-eps)*A, constant and more negative. The min selects the clipped term, zero gradient. Correct. CASE 3 - THE ONE THAT SHOWS WHY THE MIN MATTERS: A > 0 but r has fallen BELOW 1-eps. This happens in later epochs when earlier minibatch updates moved the policy the wrong way for this sample. Unclipped: r*A, small. Clipped: (1-eps)*A, larger. The min selects the UNCLIPPED term, which still has a gradient pushing r back up. So the objective does not trap you outside the band - it lets you return. CASE 4: A < 0 with r above 1+eps. Symmetric: the unclipped term is selected and the gradient pushes r back down. THE STRUCTURE THIS REVEALS. The min makes the objective a PESSIMISTIC LOWER BOUND on the unclipped surrogate. Clipping binds only when the update would IMPROVE the surrogate - it removes the reward for moving far in a favourable direction while leaving the corrective gradient intact. A symmetric penalty, or a plain clip without the min, would fail case 3: once a sample's ratio drifted outside the band it would have zero gradient forever and could never be corrected. That asymmetry is the actual content of the trick and it is what most explanations omit. WHAT CLIPPING FAILS TO DO. It does not bound the KL divergence. The clip is per-sample and per-dimension in the ratio, and the KL is an aggregate over the whole distribution - so a policy can move a long way in KL while every individual ratio stays inside the band, particularly with many action dimensions where small per-dimension changes compound. Engstrom et al. measured this directly: the achieved KL routinely exceeds what epsilon would suggest, and PPO's stability is therefore not coming from the trust-region argument used to motivate it. Additionally the gradient is zero only for samples currently outside the band - the update as a whole is still unconstrained in magnitude, since other samples continue to contribute. WHAT PRACTITIONERS DO ABOUT IT. Compute the KL between old and new policies every epoch and EARLY-STOP the epoch loop when it exceeds a target. That is an explicit trust region layered on top of the clipping, it is present in several strong implementations, and it is the fix that follows directly from understanding what the clip does not do. Some implementations also add an explicit adaptive KL penalty, which is the other variant proposed in the original paper and is closer to TRPO in spirit."
          }
        },
        {
          "q": "What does GAE do and how would you choose lambda?",
          "a": "WHAT IT DOES. The advantage can be estimated at many horizons. The one-step estimate is delta_t = r_t + gamma*V(s_{t+1}) - V(s_t): low variance, biased by the critic's error at one state. The n-step estimate uses n real rewards before bootstrapping: less bias, more variance. The full Monte Carlo estimate is G_t - V(s_t): unbiased given a correct V, maximum variance. GAE takes an exponentially weighted average of ALL of them with decay lambda, and the algebra collapses beautifully into a discounted sum of TD errors, sum over l of (gamma*lambda)^l * delta_{t+l}, computable in one backward pass. lambda = 0 recovers the one-step estimate and lambda = 1 recovers Monte Carlo. WHY AVERAGE RATHER THAN PICK ONE n. Two reasons. The average has lower variance than any individual estimator, since the n-step estimates are correlated but not perfectly. And it avoids a discrete hyperparameter with a sharp effect in favour of a smooth one - which matters because the best n varies across states and across training, and a smooth average adapts better than any fixed choice. HOW I WOULD CHOOSE LAMBDA. Start at 0.95, which is the near-universal default and is well-supported empirically. Then reason from what dominates the error. If the CRITIC IS POOR - early in training, a hard-to-predict value function, a badly-tuned critic learning rate - then the bias from bootstrapping is large and I want lambda HIGHER, closer to 1, relying more on real rewards. If the REWARDS ARE VERY NOISY or episodes are very long, Monte Carlo variance dominates and I want lambda LOWER, leaning on the critic. A practical diagnostic: look at the critic's explained variance on returns. If it is low, the critic is not helping and a higher lambda is indicated; if it is high, the critic is good and you can afford a lower lambda for the variance reduction. THE CRITICAL DISTINCTION I WOULD MAKE, because it is a common confusion. Gamma and lambda are both decay parameters and they do completely different things. GAMMA IS PART OF THE PROBLEM: it sets the effective horizon and it changes which policy is optimal, so sweeping it means solving different problems. LAMBDA IS PART OF THE ESTIMATOR: it changes the bias-variance of your advantage estimate and leaves the objective untouched. That makes lambda safe to tune freely and gamma something to fix from the application's horizon and leave alone. People who tune them jointly as if they were interchangeable get confusing results for exactly this reason. THE CONNECTION WORTH DRAWING. GAE is TD(lambda) applied to advantages instead of values - same eligibility-trace derivation, same forward-backward equivalence. So it is not a new idea from 2016; it is an old idea correctly placed. Knowing that means the intuition from TD(lambda) transfers directly, including that the optimum is usually interior and that the credit-propagation-speed argument matters as much as the bias-variance one."
        },
        {
          "q": "Why does PPO allow multiple epochs over one batch when vanilla policy gradient does not?",
          "a": "THE UNDERLYING ISSUE. The policy gradient estimator is an expectation over trajectories from the CURRENT policy. After one gradient step, the policy has changed, so the batch was generated by a different - now old - policy. Using it again means computing an expectation under the wrong distribution, and the gradient is simply wrong. Vanilla policy gradient therefore does one update per batch and throws the data away, which is why it is so sample-inefficient. WHAT THE RATIO DOES. Importance sampling: to estimate an expectation under pi_new using samples from pi_old, weight each sample by pi_new/pi_old. That ratio is exactly PPO's r_t. So the surrogate objective r_t * A_t IS the importance-sampled policy gradient objective, which makes it valid to reuse the batch - in principle. WHY IT IS NOT ENOUGH ON ITS OWN. Importance sampling is unbiased but its variance explodes as the two distributions diverge. If pi_new assigns high probability where pi_old assigned low probability, the ratio is enormous and a single sample dominates the estimate. So naive importance-weighted reuse degrades badly, and the further you optimize on one batch the worse it gets. This is a general property of importance sampling, not specific to RL. WHAT THE CLIPPING ADDS. By removing the gradient once the ratio leaves [1-eps, 1+eps], PPO removes the incentive to move into the region where the importance weights would be unreliable. It is keeping the estimator inside its own domain of validity. That is a better description of what clipping does than 'it enforces a trust region', and it is consistent with Engstrom's finding that it does not bound KL - it is bounding the per-sample importance weight, which is a different and more local quantity. THE PRACTICAL CONSEQUENCE. Multiple epochs are where PPO's sample efficiency over vanilla policy gradient comes from - typically three to ten passes, in minibatches. But more epochs push the policy further from the data-generating one, so the correction is doing more work and the estimate degrades. There is an optimum, it interacts with batch size and epsilon, and it is a real hyperparameter rather than a throughput setting. A robust practice is to compute the KL each epoch and EARLY-STOP when it exceeds a target, which adapts the epoch count to how far the policy has actually moved rather than fixing it in advance. THE WIDER POINT I WOULD MAKE. This is the same structure as DPO's off-policy problem and as offline RL generally: data collected under one policy, used to evaluate another, with the estimate degrading as they diverge. Importance weighting is the correction, its variance is the cost, and every method in this family is some way of bounding how far apart the two are allowed to get. Recognizing PPO's clip as a variance-control device on an importance-sampling estimator - rather than as a trust region - makes it fit into that family cleanly.",
          "deepDive": {
            "q": "TRPO has a monotonic improvement guarantee. What exactly does it guarantee, and why does nobody use TRPO?",
            "a": "WHAT THE GUARANTEE ACTUALLY SAYS. The theory starts from an identity: the performance of a new policy equals the old policy's performance plus the expected advantage of the new policy, measured under the NEW policy's state distribution. That last part is the problem - it requires knowing where the new policy goes, which you cannot sample without running it. The surrogate objective replaces the new state distribution with the OLD one, which is computable, and the theory then bounds the error of that substitution by a term proportional to the maximum KL divergence between the policies. So: J(new) >= L_old(new) - C * max_KL, where C depends on gamma and the advantage scale. Maximize the right-hand side and you have a lower bound on the true improvement - so if the bound increases, actual performance cannot decrease. That is a genuine monotonic improvement guarantee, and it is a lovely result. WHY IT DOES NOT BIND IN PRACTICE, which is the honest part. (1) THE CONSTANT C IS ENORMOUS. It scales like 1/(1-gamma)^2 times the maximum advantage. At gamma = 0.99 that factor alone is 10,000. Taking the theoretical step size would mean steps so small that nothing happens in any reasonable time. So TRPO as implemented replaces the penalty with a HARD CONSTRAINT at a hand-chosen KL, which is a heuristic - and the guarantee no longer applies to what is actually run. (2) IT USES MAXIMUM KL over states; the implementation uses MEAN KL because the max is not estimable from samples. Another gap between the theorem and the code. (3) THE ADVANTAGES ARE ESTIMATED, not exact, so the surrogate itself is noisy and the bound assumes an exact quantity. WHY NOBODY USES TRPO. (1) COMPLEXITY. It needs conjugate gradient to solve for the natural-gradient direction, Fisher-vector products via double backpropagation, and a backtracking line search to enforce the constraint. That is a lot of machinery, it is fiddly to implement correctly, and it composes badly with other things - notably with architectures that share parameters between actor and critic, and with recurrent policies. (2) PPO GETS SIMILAR RESULTS IN A FEW LINES, with first-order optimization and standard Adam. Even if the theoretical story is weaker, the empirical result is comparable and the engineering cost is a fraction. (3) IT DOES NOT SCALE AS CONVENIENTLY - the second-order machinery is awkward with very large networks and with distributed training. WHAT I TAKE FROM THE COMPARISON, and it is a broader lesson about theory in deep RL. The theory pointed at the RIGHT IDEA - constrain movement in policy space, not parameter space - and the specific bound was too loose to use. That is a common and underappreciated pattern: the theorem's value was directional rather than quantitative. PPO kept the idea and discarded the derivation, which is why Engstrom's finding that PPO's clip does not enforce a trust region is less damaging than it first sounds - the trust-region framing was always a motivation rather than a guarantee for PPO. And it is why 'log the actual KL' is the right practical response: neither method controls the quantity its story is about, so measure it."
          }
        },
        {
          "q": "Your PPO run is unstable - returns spike then collapse. Diagnose it.",
          "a": "PPO is unusually forgiving, so a collapse usually means one specific thing has gone wrong rather than general difficulty. I would work through these in order, with the diagnostics attached. CHECK 1: THE ACTUAL KL between old and new policies per update. Epsilon does not bound this, so it must be measured. If KL spikes right before the collapse, the policy took a step large enough to invalidate its own data and it landed somewhere bad. Fixes: reduce the learning rate, reduce the number of epochs, or early-stop the epoch loop on a KL target - the last being the most robust and the one I would prefer. CHECK 2: POLICY ENTROPY. If it falls to near zero before the collapse, the policy went deterministic, stopped exploring, and got stuck - and the gradient dies with it, so it cannot recover. Raise the entropy coefficient or use a schedule. If instead entropy SPIKES at the collapse, the policy was destroyed by a bad update and is re-randomizing, which points back to check 1. CHECK 3: THE CRITIC'S EXPLAINED VARIANCE on returns. If it is near zero or negative, the value function is useless, so the advantages are essentially the returns with noise subtracted, and the policy is being updated on garbage. Common causes: critic learning rate too low, insufficient critic capacity, or - most often - reward scale. Which leads to: CHECK 4: REWARD AND ADVANTAGE SCALE. Are advantages normalized per batch? Is the reward normalized or clipped? A reward scale change effectively rescales the learning rate, and an environment that starts producing much larger rewards partway through training (because the agent got better) can silently blow up the effective step size. This is a genuinely common cause of the spike-then-collapse shape specifically. CHECK 5: TRUNCATION HANDLING. At a time limit you must bootstrap with V(s_final), not treat it as terminal. Getting this wrong makes the value targets systematically wrong for long episodes - and it often only bites once the agent gets good enough to reach the time limit, which produces exactly a collapse after a period of improvement. I would check this early precisely because of that timing signature. CHECK 6: IS THE ADVANTAGE DETACHED in the actor loss? If not, the actor is optimizing the critic to make its own advantages look favourable, which produces a self-reinforcing divergence. CHECK 7: OBSERVATION NORMALIZATION statistics. If you use a running normalizer, its statistics shift as the agent visits new states, which changes the input distribution to both networks mid-training. Freezing them after a while, or using a fixed scale, removes this. WHAT I WOULD LOG AS STANDARD, since these recur: KL per update, policy entropy, critic explained variance, advantage mean and standard deviation, the clipping fraction (what proportion of samples are being clipped - if it is near zero, epsilon is doing nothing; near one, the policy is trying to move much further than allowed), episode length, and the raw reward scale. That set makes essentially every PPO pathology visible immediately, and most implementations do not log more than half of it."
        },
        {
          "q": "How do on-policy actor-critic methods compare with off-policy ones like SAC?",
          "a": "THE STRUCTURAL DIFFERENCE. On-policy methods (A2C, PPO) require data from the current policy, so a batch is used for a few epochs and discarded. Off-policy actor-critic methods (DDPG, TD3, SAC) keep a replay buffer and reuse every transition many times, learning Q-functions off-policy in the DQN tradition while using an actor to produce the argmax that a continuous action space makes otherwise impossible. THE TRADE. Sample efficiency versus stability, and it is a genuine one. SAC typically needs an order of magnitude fewer environment steps than PPO on continuous-control benchmarks, because it reuses data. PPO is more robust - fewer failure modes, less hyperparameter sensitivity, and it avoids the deadly triad entirely because its data distribution matches its policy. Which matters depends on whether interaction or wall-clock-plus-debugging is your scarce resource. WHAT SAC ADDS BEYOND OFF-POLICY LEARNING, since it is more than DDPG with a replay buffer. (1) MAXIMUM ENTROPY OBJECTIVE: maximize reward PLUS policy entropy, so the optimal policy is stochastic by construction rather than by an added bonus term. This gives robust exploration, better behaviour under multi-modal optima, and - importantly - a temperature that can be auto-tuned to hit an entropy target, removing one of the most annoying hyperparameters in the family. (2) TWIN CRITICS with a min: take the minimum of two Q-networks as the target, which directly addresses the maximization bias from the Q-learning lesson. Same decoupling idea as Double Q-learning, in continuous form. (3) REPARAMETERIZED POLICY GRADIENT: because the critic is differentiable in the action, SAC backpropagates THROUGH the sampled action rather than using the score-function estimator. That is dramatically lower variance, and it is only available because the action is continuous and the critic is learned - a nice illustration of the estimator distinction from the policy-gradient lesson. WHEN I WOULD CHOOSE WHICH. Cheap parallel simulation, want it working reliably and quickly: PPO, essentially always. This is why it dominates in settings with fast simulators and large-scale parallelism. Expensive interaction - a real robot, a live system, anything where each sample costs money or time: SAC, and accept the additional care required. Discrete actions: PPO, or a value-based method; SAC has discrete variants but the reparameterization advantage is lost. Language models: PPO or GRPO, because the action space is discrete and enormous and the reward is a black box, so the score-function estimator is forced. THE POINT I WOULD END ON. The methods are not really competitors on a single axis - they occupy different points on the data-reuse-versus-stability trade, and the choice is determined by which resource is scarce. A team with a fast simulator and limited engineering time should not be running SAC to save samples they have in abundance."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "GAE",
        "back": "A_t = sum_l (gamma*lambda)^l * delta_{t+l}, where delta_t = r_t + gamma*V(s_{t+1}) - V(s_t). lambda=0 -> one-step TD; lambda=1 -> Monte Carlo. It is TD(lambda) applied to ADVANTAGES - same eligibility-trace derivation."
      },
      {
        "type": "pitfall",
        "front": "gamma and lambda do different jobs",
        "back": "GAMMA is part of the PROBLEM - it sets the horizon and changes which policy is optimal. LAMBDA is part of the ESTIMATOR - bias-variance only, objective untouched. Tune lambda freely (0.95 default); fix gamma from the application and leave it."
      },
      {
        "type": "intuition",
        "front": "Why policy gradients need a trust region",
        "back": "The gradient is computed from data generated by the CURRENT policy. A large step changes the state distribution, so the data no longer describes the policy you now have - the step invalidates its own justification. Value-based methods have no clean analogue."
      },
      {
        "type": "formula",
        "front": "PPO's clipped surrogate",
        "back": "L = E[min(r_t*A_t, clip(r_t, 1-eps, 1+eps)*A_t)] with r_t = pi_new/pi_old. The MIN makes it a PESSIMISTIC lower bound on the unclipped surrogate."
      },
      {
        "type": "intuition",
        "front": "Why PPO's min is essential (the case people miss)",
        "back": "If A>0 but r has fallen BELOW 1-eps (an earlier minibatch moved the wrong way), the min selects the UNCLIPPED term, which still has gradient pushing r back up. A plain clip would zero the gradient forever and trap you outside the band."
      },
      {
        "type": "pitfall",
        "front": "PPO's epsilon does NOT bound the KL",
        "back": "The clip is per-sample on the ratio; KL is an aggregate over the distribution, and small per-dimension changes compound. Measured KL routinely exceeds what eps implies. LOG THE ACTUAL KL and early-stop the epoch loop on a KL target."
      },
      {
        "type": "intuition",
        "front": "Why PPO can do multiple epochs on one batch",
        "back": "The ratio r_t IS an importance-sampling correction, making reuse valid in principle. But IS variance explodes as the policies diverge - so the clip's real job is keeping the estimator inside its own domain of validity, which is a better description than 'trust region'."
      },
      {
        "type": "pitfall",
        "front": "Implementation matters (Engstrom et al.)",
        "back": "Much of PPO's edge over TRPO came from CODE-LEVEL choices - value-loss clipping, reward/obs normalization, orthogonal init, LR annealing, grad clipping - not the clipped objective. Reproduce a baseline WITH its details or the comparison measures the details."
      },
      {
        "type": "pitfall",
        "front": "Detach the advantage in the actor loss",
        "back": "The critic is a WEIGHT in the actor's gradient, not a path for it. Leaving it attached lets the actor optimize the critic to make its own advantages look good, and both objectives destabilize. Easy bug, hard symptom."
      },
      {
        "type": "pitfall",
        "front": "Truncation is not termination",
        "back": "At a TIME LIMIT the episode did not really end - you must BOOTSTRAP with V(s_final). Treating it as terminal teaches the agent the world stops arbitrarily. Signature: it only bites once the agent is good enough to REACH the time limit, so it looks like a collapse after improvement."
      },
      {
        "type": "intuition",
        "front": "TRPO's guarantee and why it does not bind",
        "back": "J(new) >= L_old(new) - C*max_KL is a real monotonic-improvement bound. But C ~ 1/(1-gamma)^2 (=10,000 at gamma=0.99), so the theoretical step is uselessly small; implementations use a hand-chosen HARD KL constraint and MEAN not MAX KL. The theory was directional, not quantitative."
      },
      {
        "type": "intuition",
        "front": "What SAC adds over PPO",
        "back": "Off-policy replay (10x sample efficiency), MAX-ENTROPY objective with auto-tuned temperature (stochastic by construction, not by a bonus), TWIN CRITICS with a min (the Double-Q fix in continuous form), and a REPARAMETERIZED gradient through a differentiable critic (far lower variance than score-function)."
      }
    ],
    "refs": [
      {
        "title": "Schulman et al. (2017), Proximal Policy Optimization Algorithms",
        "url": "https://arxiv.org/abs/1707.06347"
      },
      {
        "title": "Schulman et al. (2015), Trust Region Policy Optimization",
        "url": "https://arxiv.org/abs/1502.05477"
      },
      {
        "title": "Schulman et al. (2016), High-Dimensional Continuous Control Using Generalized Advantage Estimation",
        "url": "https://arxiv.org/abs/1506.02438"
      },
      {
        "title": "Mnih et al. (2016), Asynchronous Methods for Deep Reinforcement Learning (A3C)",
        "url": "https://arxiv.org/abs/1602.01783"
      },
      {
        "title": "Engstrom et al. (2020), Implementation Matters in Deep Policy Gradients: A Case Study on PPO and TRPO",
        "url": "https://arxiv.org/abs/2005.12729"
      }
    ],
    "demos": [
      "actor-critic",
      "ppo",
      "gae",
      "policy-gradient"
    ]
  },
  "offline-rl": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Offline RL is reinforcement learning from a fixed dataset with no environment access. The motivation is obvious - healthcare, driving, industrial control and recommendation all have enormous logged datasets and prohibitive or dangerous exploration - and the obvious approach fails badly. Fujimoto et al. showed that standard off-policy algorithms, run on a fixed buffer, degrade catastrophically even when the data comes from an EXPERT policy and the algorithm would have learned fine had it collected that same data itself. That result is the entry point to the subject, because it says the problem is not data quality.",
        "The cause is the max in the Bellman backup. It ranges over ALL actions, including ones the dataset never contains, and at those actions the network's output is pure extrapolation - unconstrained by any data. Extrapolation is not merely inaccurate; it is selected FOR being high, because the max picks whichever action looks best, and out-of-distribution actions are disproportionately the ones with large positive error. That inflated value then becomes a bootstrap target for earlier states, propagates backward, and the value function can diverge while the training loss looks fine.",
        "Now notice what is missing, because this completes the module's argument. In online RL the same thing happens - Q-learning's max is provably biased upward - and it is HARMLESS, even useful. The agent acts on the overestimate, tries the action, observes the real reward, and the estimate comes down. Optimism drives exploration precisely because the feedback loop repairs it. Offline RL deletes that loop. The agent can form an arbitrarily confident belief that an unseen action is wonderful and nothing will ever contradict it. Every method in this lesson is therefore a way of preventing the max from ranging over actions the data cannot support: constrain the policy toward the behaviour policy, push down the values of out-of-distribution actions explicitly, or - IQL's approach - never query an out-of-dataset action at all. The whole subfield is a response to one missing feedback loop."
      ],
      "math": [
        {
          "h": "Where the error enters: the max over unsupported actions",
          "paras": [
            "The Bellman target requires evaluating Q at the argmax action, but the dataset only constrains Q at actions the behaviour policy actually took. Everywhere else the value is whatever the function approximator extrapolates.",
            "The second line is the compounding step and it is why this is worse than a static error: the inflated value becomes a target for predecessor states, so the error propagates backward through bootstrapping rather than staying local."
          ],
          "tex": "y = r + \\gamma \\max_{a'} Q_\\theta(s',a'), \\qquad \\text{but } \\mathcal{D} \\text{ constrains } Q \\text{ only on } \\{(s,a) \\sim \\mu\\} \\\\[4pt] \\mathbb{E}\\big[\\max_{a'} Q\\big] \\;\\ge\\; \\max_{a'} Q^{*} \\;\\; \\text{and the gap enters } y \\text{, then } Q(s,\\cdot),\\text{ then } Q(s_{\\text{prev}},\\cdot),\\ldots",
          "texNote": "Online, this same bias is self-correcting: the agent takes the overestimated action, sees the real reward, and the estimate falls. That correction is exactly what a fixed dataset removes. So offline RL's central difficulty is not that the data is limited - it is that the mechanism which repaired optimism has been deleted."
        },
        {
          "h": "CQL: push down what you cannot verify",
          "paras": [
            "Add a term to the standard TD loss that lowers Q on actions sampled from a wide distribution and raises it on actions actually present in the data. The net effect is to make the learned Q a LOWER bound on the true value of the policy.",
            "A lower bound is the right object: a policy maximizing a pessimistic value estimate will not chase phantom high values, because the only actions whose values were not pushed down are the ones the data supports."
          ],
          "tex": "\\mathcal{L}_{\\text{CQL}} = \\underbrace{\\mathcal{L}_{\\text{TD}}}_{\\text{usual Bellman error}} + \\alpha \\Big( \\underbrace{\\mathbb{E}_{s\\sim\\mathcal{D}}\\big[\\log \\textstyle\\sum_a e^{Q(s,a)}\\big]}_{\\text{soft-max over ALL actions: push down}} - \\underbrace{\\mathbb{E}_{(s,a)\\sim\\mathcal{D}}[Q(s,a)]}_{\\text{data actions: push up}} \\Big)",
          "texNote": "alpha is the conservatism dial and it is the method's main difficulty: too small and out-of-distribution values are not suppressed enough, too large and the values become so pessimistic that the policy degenerates toward imitating the data. There is no way to tune it by trying policies in the environment, which is the recurring practical problem in this whole area."
        },
        {
          "h": "IQL: never query an out-of-dataset action",
          "paras": [
            "The cleanest response - remove the max instead of correcting it. Fit V by EXPECTILE regression on Q over in-dataset actions, which approximates a max from below without evaluating any action outside the data, then use V for the Q target so the backup contains no max at all.",
            "The policy is then extracted separately by advantage-weighted regression, which is a weighted imitation of the dataset and therefore also never proposes an unsupported action."
          ],
          "tex": "L_V = \\mathbb{E}_{(s,a)\\sim\\mathcal{D}}\\big[L_2^{\\tau}\\big(Q(s,a) - V(s)\\big)\\big], \\quad L_2^{\\tau}(u) = |\\tau - \\mathbb{1}(u<0)|\\,u^2 \\\\[4pt] L_Q = \\mathbb{E}\\big[(r + \\gamma V(s') - Q(s,a))^2\\big], \\qquad \\pi \\propto \\exp\\!\\big(\\beta\\,(Q-V)\\big)\\cdot \\text{imitate}",
          "texNote": "The upper expectile with tau around 0.7 to 0.9 weights positive residuals more heavily, so V approaches the best IN-DATASET action's value rather than the mean - a max taken only over what the data supports. Every quantity is evaluated at state-action pairs that exist in the dataset, which is why IQL needs no explicit conservatism penalty and no alpha to tune."
        }
      ],
      "code": [
        {
          "h": "The failure, and CQL's response",
          "paras": [
            "Worth reproducing once, because the failure is dramatic and the mechanism is not obvious from the loss curve - the TD error can look healthy while the values diverge."
          ],
          "code": "# THE FAILURE. Run ordinary off-policy Q-learning on a FIXED buffer:\nfor batch in dataset:                      # no environment interaction\n    y = r + gamma * q_target(s2).max(1)[0] # <-- max over ALL actions, most of\n                                           #     which are NOT in the data\n    loss = F.mse_loss(q(s).gather(1, a), y)\n#\n# Q values grow steadily; the policy chases actions with no support; returns\n# collapse. Fujimoto et al. showed this happens even with EXPERT data - the\n# same algorithm learns fine if it COLLECTS that data itself. The difference\n# is the correction loop, not the data.\n\n# CQL: add a term that lowers Q where the data cannot vouch for it.\nlogsumexp_q = torch.logsumexp(q(s), dim=1)          # soft-max over ALL actions\ndata_q      = q(s).gather(1, a).squeeze(1)          # actions actually taken\ncql_penalty = (logsumexp_q - data_q).mean()\nloss = td_loss + alpha * cql_penalty\n\n# WHY LOGSUMEXP: it is a soft maximum, so the penalty concentrates on whichever\n# action currently has the HIGHEST value - which is exactly the one the max in\n# the backup would select, and therefore exactly the one that needs suppressing.\n# The result is a LOWER BOUND on the true value, and a policy maximizing a\n# pessimistic estimate will not chase phantom values.\n#\n# THE PRACTICAL PROBLEM: alpha. Too small and OOD values are not suppressed;\n# too large and everything is pessimistic and the policy degenerates toward\n# imitation. And you cannot tune it by trying policies in the environment -\n# which is the defining difficulty of this whole area.",
          "caption": "The failure occurs with expert data and the same algorithm succeeds if it collects that data itself, which localizes the problem precisely: not data quality, but the missing correction loop. CQL's logsumexp targets the highest-valued action, which is the one the backup's max would have picked."
        },
        {
          "h": "IQL, and the baseline that keeps everyone honest",
          "paras": [
            "IQL's approach is structurally different - it removes the max rather than correcting it - and the comparison against filtered behaviour cloning is the check that should accompany any offline result."
          ],
          "code": "def expectile_loss(diff, tau=0.8):\n    # asymmetric squared loss: weight POSITIVE residuals more heavily, so V is\n    # pulled toward the upper end of Q over IN-DATASET actions - a max taken\n    # only over actions the data supports.\n    return torch.where(diff > 0, tau, 1 - tau) * diff.pow(2)\n\nv_loss = expectile_loss(q_target(s, a) - v(s)).mean()      # V from data actions\nq_loss = F.mse_loss(q(s, a), r + gamma * v(s2))            # NO MAX ANYWHERE\n\n# POLICY EXTRACTION by advantage-weighted regression - weighted imitation, so\n# it can never propose an action absent from the data:\nadv    = (q_target(s, a) - v(s)).detach()\np_loss = -(torch.exp(beta * adv).clamp(max=100) * log_prob(a | s)).mean()\n\n# IQL NEVER EVALUATES AN OUT-OF-DATASET ACTION, which is why it needs no\n# conservatism coefficient - the structural fix replaces the tuned penalty.\n\n# ---- THE BASELINE THAT KEEPS EVERYONE HONEST ----\n# On many benchmark datasets, BEHAVIOUR CLONING ON THE TOP X% OF TRAJECTORIES\n# by return is competitive with sophisticated offline RL. Always report it.\n#\n#   expert / narrow data  -> BC is often fine; offline RL adds risk, not value\n#   diverse / suboptimal  -> offline RL should WIN, via STITCHING: combining\n#                            good segments of different mediocre trajectories\n#                            into a better one, which BC cannot do because it\n#                            only ever reproduces whole behaviours\n#\n# If your method does not beat filtered BC on stitching-friendly data, it is\n# not doing the thing offline RL is FOR. That is the diagnostic question.",
          "caption": "IQL's fix is structural rather than a tuned penalty - no max is ever taken over unsupported actions, so no conservatism coefficient is needed. And filtered behaviour cloning is the baseline that determines whether a method is doing anything RL-specific at all."
        }
      ],
      "useCases": [
        "Healthcare and clinical decision support, where logged treatment histories are abundant and exploratory policies are unethical - the setting that motivates the field, and the one where the inability to validate a learned policy before deployment is most acute.",
        "Robotics with large logged datasets or teleoperated demonstrations, where offline pretraining followed by a short online fine-tuning phase is far cheaper than learning from scratch on hardware.",
        "Recommendation and advertising from historical interaction logs, where the data is enormous, exploration costs real revenue, and the logging policy is known - which is a substantial advantage, since it makes importance-weighted evaluation possible.",
        "Industrial process control, energy management, and anywhere a plant has years of operational data plus a hard prohibition on exploratory actions. Also the standard initialization step for online RL, since offline pretraining removes the expensive early random phase."
      ],
      "pitfalls": [
        "Running an ordinary off-policy algorithm on a fixed buffer. It fails even on expert data, and the same algorithm would succeed if it collected that data itself - so the diagnosis is the missing correction loop, not data quality. Expecting DQN or SAC to work unmodified offline is the single most common mistake here.",
        "Not reporting filtered behaviour cloning as a baseline. Behaviour cloning on the top-returning trajectories is competitive with sophisticated methods on many datasets. If your method does not beat it on data where stitching is possible, it is not doing anything RL-specific.",
        "Tuning the conservatism coefficient by evaluating in the environment. If you can do that, you are not in the offline setting, and any hyperparameter chosen that way has leaked online access into a method claiming not to need it. This is a widespread and serious evaluation flaw.",
        "Ignoring the dataset's coverage. What is achievable is bounded by what the data supports: a policy can only be verified where the data has something to say. Report state-action coverage and the behaviour policy's return, because they determine the ceiling more than the algorithm does.",
        "Assuming more conservatism is safer. Too much makes the value estimates so pessimistic that the policy degenerates toward imitating the behaviour policy, giving up exactly the improvement offline RL was meant to provide. The coefficient has an interior optimum you cannot easily find.",
        "Treating offline policy evaluation as solved. Importance-weighted estimates over long horizons have variance that grows with the product of per-step ratios, so they are usually unusable beyond short horizons. Not knowing how good your learned policy is remains the field's central practical obstacle.",
        "Expecting return-conditioned sequence models to stitch. Decision Transformer avoids bootstrapping entirely, which is elegant, and it correspondingly struggles to combine good segments of different suboptimal trajectories - the operation dynamic programming performs naturally and the one that most distinguishes offline RL from imitation."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/q-learning",
          "text": "Maximization bias completes its arc here. It is a correctable nuisance in a table, a persistent problem under function approximation, and unbounded offline - because the loop that repaired it, trying the action and observing the result, is exactly what a fixed dataset removes."
        },
        {
          "ref": "reinforcement-learning/imitation-learning",
          "text": "The alternative that needs no value function at all, and the baseline every offline method must beat. The distinguishing capability is STITCHING - combining segments of different mediocre trajectories - which cloning cannot do and dynamic programming does naturally."
        },
        {
          "ref": "fine-tuning/dpo-grpo",
          "text": "DPO is offline preference learning and inherits the same difficulty: the data was generated by another policy, so updates in uncovered regions are extrapolations. Its characteristic failure - both chosen and rejected probabilities falling - is this lesson's distribution shift in a different costume."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The contrast that isolates the mechanism. Optimism is a virtue there because acting on it generates corrective data; it is a pathology here because it cannot. Same estimator property, opposite consequence, and the difference is only whether the loop exists."
        },
        {
          "ref": "causal-inference/propensity-matching",
          "text": "Offline policy evaluation is causal inference on sequential decisions - the logging policy is a propensity, importance weighting is inverse-propensity weighting, and coverage is the positivity assumption. The variance explosion over long horizons is that machinery's known failure mode."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is offline RL?",
          "a": "Learning a policy from a fixed logged dataset with no environment interaction, so you can never try an action to see what happens."
        },
        {
          "q": "Why do standard off-policy algorithms fail offline?",
          "a": "The max in the Bellman backup queries actions absent from the data, where the network extrapolates. Those extrapolations are selected for being high and propagate backward through bootstrapping."
        },
        {
          "q": "What did Fujimoto et al. show?",
          "a": "Standard off-policy algorithms degrade catastrophically on a fixed buffer even with expert data, while the same algorithm succeeds if it collects that data itself."
        },
        {
          "q": "Why is that comparison the key one?",
          "a": "It shows the problem is not data quality but the missing correction loop - online, acting on an overestimate produces the data that repairs it."
        },
        {
          "q": "What is extrapolation error?",
          "a": "The value assigned to state-action pairs the dataset does not contain. It is unconstrained by data, and the max selects preferentially for whichever extrapolation is highest."
        },
        {
          "q": "What does CQL do?",
          "a": "Adds a penalty that lowers Q on actions from a wide distribution and raises it on actions present in the data, making the learned Q a lower bound on the true value."
        },
        {
          "q": "Why does CQL use logsumexp?",
          "a": "It is a soft maximum, so the penalty concentrates on the highest-valued action - exactly the one the backup's max would select and therefore the one needing suppression."
        },
        {
          "q": "What is the difficulty with CQL's alpha?",
          "a": "Too small and out-of-distribution values are not suppressed; too large and the policy degenerates toward imitation. And you cannot tune it by trying policies in the environment."
        },
        {
          "q": "What does IQL do differently?",
          "a": "It removes the max rather than correcting it. Expectile regression fits V from in-dataset actions, and the Q target r + gamma*V(s') contains no max at all."
        },
        {
          "q": "What is expectile regression doing?",
          "a": "An asymmetric squared loss weighting positive residuals more, so V approaches the best IN-DATASET action's value - a max taken only over what the data supports."
        },
        {
          "q": "How does IQL extract a policy?",
          "a": "Advantage-weighted regression - weighted imitation of the dataset - so it can never propose an action the data does not contain."
        },
        {
          "q": "What is stitching?",
          "a": "Combining good segments of different suboptimal trajectories into a better policy. It is what dynamic programming does naturally and what behaviour cloning cannot do."
        }
      ],
      "standard": [
        {
          "q": "How would you combine offline pretraining with online fine-tuning?",
          "a": "This is where offline RL is most practically valuable, and it is harder than it sounds because the two phases want opposite things. THE APPEAL. Offline pretraining solves the problem online RL is worst at - the expensive, dangerous, sample-hungry early phase of random exploration. Start from a policy that is already competent, then improve it with a small amount of real interaction. In robotics this is the difference between a feasible project and an infeasible one. THE CORE TENSION. Offline methods are CONSERVATIVE by design: they suppress values for actions outside the data, which is exactly right when you cannot try them and exactly wrong once you can. A method tuned to never leave the data distribution will not exploit the ability to explore, so the online phase improves slowly or not at all. Conversely, dropping the conservatism at the moment you go online produces a characteristic and well-documented failure: the value function's out-of-distribution estimates, which the pessimism was suppressing, are suddenly acted on, the policy takes bad actions, and performance DIPS SHARPLY before recovering. That initial collapse is often the thing that makes the whole approach unusable in a setting where you cannot afford a bad period. THE APPROACHES. (1) ANNEAL THE CONSERVATISM. Start at the offline coefficient and decay it as online data accumulates. Simple and it works, and the schedule is another thing you cannot tune offline. (2) SEED THE REPLAY BUFFER with the offline data and keep sampling from it, so the online updates are anchored by data you trust rather than dominated by the small amount of fresh interaction. Balancing the sampling ratio between offline and online data matters and is worth tuning. (3) USE A METHOD THAT TRANSITIONS NATURALLY. IQL is notably good here: its policy extraction is advantage-weighted regression with a temperature, so raising beta smoothly relaxes how tightly it imitates, and it has no explicit conservatism penalty to switch off. That structural property is a real argument for choosing IQL when online fine-tuning is planned. (4) CALIBRATE BEFORE RELAXING - approaches that ensure the pessimistic value function is at least a valid lower bound on the behaviour policy's value before letting the policy move, which is what removes the initial dip in the more careful recent work. (5) KEEP A SAFETY LAYER during the online phase regardless, because the whole point of the offline phase was that exploration is expensive or dangerous, and that has not stopped being true. WHAT I WOULD MEASURE. The dip specifically: plot return from the first online step, not from a smoothed window, because a brief collapse is exactly what averaging hides and exactly what a deployment cannot tolerate. And track how far the policy's action distribution moves from the offline data over the online phase - if it barely moves, the conservatism is still binding and the online phase is buying nothing. THE HONEST FRAMING. Offline-to-online is the most defensible use of offline RL, because the online phase gives you back the thing the offline setting removed: the ability to VALIDATE. A policy you can test is worth far more than one you can only estimate, and I would design the project so that the offline phase produces a candidate and the online phase produces the evidence."
        },
        {
          "q": "Why is offline RL hard, and how do the main approaches address it?",
          "a": "THE SETTING. A fixed logged dataset, no environment access. Motivated by healthcare, driving, industrial control, recommendation - places with abundant logs and prohibitive exploration. THE FAILURE THAT DEFINES THE FIELD. Fujimoto et al. ran standard off-policy algorithms on a fixed buffer and found catastrophic degradation - even with EXPERT data, and even though the same algorithm learns fine if it collects that same data itself. That comparison is the crucial one because it localizes the problem: not data quality, not data quantity, but something about the absence of interaction. THE MECHANISM. The Bellman target contains a max over ALL actions, but the dataset constrains Q only at actions the behaviour policy took. Elsewhere, Q is whatever the network extrapolates - unconstrained by data. And the max SELECTS FOR high extrapolations: an action looks best partly because it is good and partly because its error happened to be positive, so the argmax preferentially picks errors. That inflated value becomes a bootstrap target for predecessor states and propagates backward, so the error compounds rather than staying local. Values can diverge while the TD loss looks healthy. WHY ONLINE RL DOES NOT HAVE THIS PROBLEM - and this is the insight I would lead with. Online, exactly the same bias exists; Q-learning's max is provably optimistic. But it is self-correcting and even useful: the agent acts on the overestimate, tries the action, observes the true reward, and the value comes down. Optimism drives exploration precisely because a feedback loop repairs it. Offline RL deletes that loop, so an arbitrarily confident wrong belief about an unseen action is never contradicted. Every method below is a way of preventing the max from ranging over unsupported actions. THE THREE FAMILIES. (1) POLICY CONSTRAINT - BCQ, BEAR, TD3+BC. Keep the learned policy close to the behaviour policy, by explicit divergence constraints, by generating candidate actions from a model of the behaviour policy, or - in TD3+BC - by simply adding a behaviour-cloning term to the actor loss. Simple and effective, and the limitation is that it constrains you toward the data even where you could safely improve. (2) VALUE REGULARIZATION - CQL. Do not constrain the policy; make the VALUES pessimistic. Add a term pushing down Q on actions sampled broadly and pushing up on data actions, which yields a lower bound on the true value. A policy maximizing a pessimistic estimate will not chase phantoms. The cost is alpha, a conservatism coefficient with an interior optimum you cannot tune by trying policies. (3) AVOID THE MAX ENTIRELY - IQL, which I find the most elegant. Fit V by expectile regression over IN-DATASET actions, which approximates a max from below without evaluating anything outside the data, then use r + gamma*V(s') as the Q target - no max anywhere. Extract the policy by advantage-weighted regression, which is weighted imitation and so cannot propose unsupported actions. Structural rather than penalized, and it needs no conservatism coefficient. Plus model-based methods that penalize by model uncertainty, and sequence models like Decision Transformer that sidestep bootstrapping entirely by conditioning on desired return.",
          "deepDive": {
            "q": "How would you evaluate an offline RL method honestly, given you cannot run the policy?",
            "a": "This is the field's central practical problem and it is worth being blunt about how unsolved it is. THE FLAW THAT PERVADES THE LITERATURE. Almost every offline RL paper tunes hyperparameters - CQL's alpha, IQL's tau and beta, network sizes, training length - by evaluating candidate policies IN THE ENVIRONMENT. If you can do that, you are not in the offline setting. It leaks online access into a method whose entire premise is not having it, and the reported numbers are therefore an upper bound achievable only by someone who could already evaluate online. In a genuine deployment - a hospital, a plant - you cannot, and the method's real-world performance is unknown. Naming this is the most important part of an honest answer. WHAT YOU CAN ACTUALLY DO, in increasing order of trustworthiness. (1) OFF-POLICY EVALUATION with importance weighting. If the logging policy's action probabilities were recorded, inverse propensity scoring gives an unbiased estimate of a new policy's value. The problem is variance: the weight is a PRODUCT of per-step ratios, so over a horizon of any length it explodes, and effective sample size collapses to a handful of trajectories. Per-decision and weighted variants, and doubly-robust estimators combining a learned model with importance weights, help substantially and do not fix the fundamental scaling. Practically usable for short horizons; not for long ones. (2) FITTED Q EVALUATION - learn a Q function for the target policy by regression on the data. Lower variance, but it has exactly the extrapolation problem this whole lesson is about, so it is optimistically biased in the same way the learner is, which makes it the wrong instrument for detecting the learner's failure. (3) MODEL-BASED EVALUATION - learn dynamics and roll out. Inherits model error, which compounds over the horizon and is largest exactly off the data distribution. (4) PESSIMISTIC LOWER BOUNDS - high-confidence off-policy evaluation gives a statement of the form 'with probability 1-delta the policy is at least this good'. Conservative, often uninformatively so, and it is the right shape for a deployment decision because it fails safe. (5) COVERAGE DIAGNOSTICS. Not a value estimate, but arguably more useful: measure how far the learned policy's action distribution has moved from the behaviour policy, per state. If it is proposing actions with negligible support, the value estimates are extrapolation and no evaluation method will rescue that. This is cheap and it is the check I would insist on. WHAT I WOULD REQUIRE IN A REPORT. Filtered behaviour cloning as a baseline, always - if the method does not beat cloning the top-returning trajectories on data where stitching is possible, it is not doing anything RL-specific. Hyperparameters selected WITHOUT environment access, with the selection procedure stated, and a sensitivity analysis showing performance across the hyperparameter range rather than at its best point. Dataset coverage statistics and the behaviour policy's return, because those bound what is achievable more than the algorithm does. And where the application permits, a staged deployment with a safety layer rather than a claim of offline validation - which is the honest engineering answer when the statistical one is unavailable."
          }
        },
        {
          "q": "When should you use offline RL rather than behaviour cloning?",
          "a": "THE DECIDING PROPERTY IS STITCHING, and I would organize the whole answer around it. Behaviour cloning learns to reproduce the actions in the data. Offline RL, because it does dynamic programming, can combine GOOD SEGMENTS OF DIFFERENT TRAJECTORIES into a policy better than any trajectory present. If trajectory A gets efficiently from the start to a midpoint and then does something poor, and trajectory B does something poor early but handles the end well, dynamic programming can construct A-then-B by propagating values through the shared state. Cloning cannot - it only ever reproduces whole behaviours, weighted by frequency. WHEN CLONING IS THE RIGHT ANSWER. (1) EXPERT DATA. If the demonstrator was good, cloning it is close to optimal and offline RL adds risk - extrapolation error, hyperparameters you cannot tune - for a small ceiling gain. (2) NARROW DATA. If the dataset covers one way of doing the task, there is nothing to stitch, and the value function has almost no support to work with. (3) YOU CANNOT TUNE ANYTHING. Cloning has essentially no offline-specific hyperparameters, which matters enormously when you cannot evaluate. This is an underrated argument. (4) YOU NEED PREDICTABILITY. A cloned policy behaves like the data; an RL policy may propose something no one has seen, which is exactly the risk in a safety-critical setting. WHEN OFFLINE RL EARNS ITS COST. (1) SUBOPTIMAL BUT DIVERSE DATA - many mediocre trajectories exploring different approaches. This is the regime it is FOR, and where the reported gains over cloning are largest. (2) THE DATA CONTAINS FAILURES you can learn from. Cloning imitates failures in proportion to their frequency; RL can use a failure to lower a value and avoid it. Data with explicit negative outcomes is much more valuable to RL than to cloning. (3) MIXED-QUALITY DATA where you cannot cleanly filter. Filtered cloning on the top decile is a strong baseline, but it discards most of the data; RL uses all of it. (4) THE REWARD DIFFERS FROM THE DEMONSTRATOR'S OBJECTIVE. If you want to optimize something the logged policy was not optimizing - cost rather than throughput, say - cloning gives you the wrong objective by construction. THE BASELINE I WOULD ALWAYS RUN. Behaviour cloning on the top X% of trajectories by return. It is the check that determines whether the method is doing anything RL-specific, it takes an hour, and a substantial fraction of published offline results do not clearly beat it on datasets where they should. Fujimoto and Gu's minimalist TD3+BC result points the same way: TD3 plus a behaviour-cloning term plus normalization matched much more elaborate methods, which suggests much of the field's complexity was not carrying the result. THE SUMMARY. Ask what improvement over the data is actually available. If the answer is 'imitate the best behaviour present', clone. If it is 'assemble something better than any single trajectory', that is dynamic programming's specific capability and worth the difficulty."
        },
        {
          "q": "Explain CQL and IQL and compare their approaches.",
          "a": "THEY SOLVE THE SAME PROBLEM AT DIFFERENT LEVELS - one corrects the max, the other removes it - and that difference explains their practical characteristics. CQL - CORRECT THE VALUES. Keep standard Q-learning, add a regularizer to the loss: push Q DOWN on actions sampled from a broad distribution, push it UP on actions actually in the data. The penalty is logsumexp over actions minus the data actions' values. The logsumexp is a soft maximum, so the downward pressure concentrates on whichever action currently has the highest value - which is exactly the action the Bellman max would select and therefore exactly the one needing suppression. The theoretical claim is that the learned Q is a LOWER BOUND on the true value of the policy, and a policy maximizing a pessimistic estimate will not chase phantom values, because the only values not pushed down are those the data supports. IQL - REMOVE THE MAX. A different move: never evaluate an out-of-dataset action at all. Fit V by EXPECTILE regression on Q over in-dataset state-action pairs, using an asymmetric squared loss with tau around 0.7 to 0.9 that weights positive residuals more heavily. That pulls V toward the upper end of Q over the actions the data contains - approximating a max, taken only over supported actions. Then the Q target is r + gamma*V(s'), which contains no max whatsoever. Every quantity is evaluated at pairs present in the data. The policy is extracted separately by advantage-weighted regression, exp(beta*(Q-V)) weighting a behaviour-cloning loss, which is weighted imitation and so also cannot propose unsupported actions. THE COMPARISON. (1) STRUCTURAL VERSUS PENALIZED. IQL's fix is architectural - the problematic operation is absent - while CQL's is a penalty that must be balanced. That means IQL has no conservatism coefficient to tune, which is a substantial practical advantage in a setting where you cannot tune by evaluation. IQL has tau and beta, but they are better behaved and their effects are more interpretable. (2) CONSERVATISM CONTROL. CQL's alpha gives explicit control over how pessimistic to be, which is a genuine advantage when you know how much you trust the data. IQL's conservatism is implicit in tau. (3) COMPUTATIONAL COST. CQL's logsumexp requires sampling or enumerating actions per state, which is expensive in continuous spaces. IQL evaluates only data actions, so it is cheaper and simpler. (4) EXPRESSIVENESS. IQL's advantage-weighted policy extraction is a weighted imitation, which bounds how far it can move from the behaviour policy - a safety property and a ceiling. CQL's policy can in principle move further where the values support it. WHICH I WOULD REACH FOR. IQL first: simpler, cheaper, fewer things to tune blind, and strong benchmark performance. CQL when I have a reason to want explicit conservatism control. And TD3+BC before either, as the minimalist baseline - because if TD3 plus a cloning term plus normalization matches the elaborate methods on my data, that is worth knowing before I build anything complicated.",
          "deepDive": {
            "q": "Expectile regression is unusual. Explain what it computes and why it is the right tool here.",
            "a": "WHAT AN EXPECTILE IS. The mean minimizes expected SQUARED error and the median minimizes expected ABSOLUTE error. Quantiles generalize the median by making the absolute loss asymmetric; EXPECTILES generalize the mean by making the SQUARED loss asymmetric. The tau-expectile minimizes E[|tau - 1(u<0)| * u^2] where u is the residual. At tau = 0.5 both weights are equal and you recover the mean. As tau approaches 1, positive residuals - cases where the target exceeds the prediction - are weighted far more heavily, so the fit is pulled upward toward the maximum. In the limit tau -> 1 the expectile approaches the maximum of the distribution. WHY THAT IS EXACTLY WHAT IS NEEDED. We want max over a of Q(s,a), but only over actions the dataset supports at state s. The dataset gives us samples of Q(s,a) for a drawn from the behaviour policy at that state. Regressing V(s) on those samples with a symmetric squared loss would give the MEAN of Q over behaviour-policy actions - that is policy evaluation of the behaviour policy, which is not what we want. Using an upper expectile pulls V toward the largest of those samples instead, approximating the max over supported actions without ever evaluating Q at an unsupported one. It is a max computed by asymmetric regression rather than by an argmax operation - and that is the trick. WHY NOT USE A QUANTILE INSTEAD? You could, and expectile regression is preferred for two reasons. It is a SMOOTH loss, differentiable everywhere except at zero and with well-behaved gradients, whereas the quantile pinball loss has constant-magnitude gradients that interact poorly with neural-network optimization. And expectiles are more sensitive to the magnitude of extreme values, not just their rank, which matters here because the size of the best action's value is the quantity we want, not merely its position. THE APPROXIMATION AND ITS DIRECTION. The expectile with tau below 1 is a LOWER bound on the max - it underestimates. That is the safe direction: an underestimate of the best supported action's value produces a conservative policy, whereas an overestimate is precisely the failure mode of the whole field. So the approximation error is on the correct side, which is a genuinely elegant property rather than a lucky one. WHY tau IS BOUNDED IN PRACTICE. Pushing tau toward 1 gets closer to a true max but the estimator becomes high-variance and unstable, because it is increasingly determined by a few extreme samples - and in a stochastic environment those extremes reflect lucky TRANSITIONS rather than good actions, so you start absorbing environment noise into the value. That is why 0.7 to 0.9 is the practical range and why IQL is known to be less suited to highly stochastic environments. That failure mode is worth being able to state, because it is the honest limit of the method. THE CONNECTION WORTH DRAWING. This is the same statistical machinery as quantile regression in distributional RL, and the same idea as asymmetric loss functions in risk-sensitive estimation - use an asymmetric loss when the cost of over- and under-estimating differ. Here they differ enormously, because overestimation is the failure mode."
          }
        },
        {
          "q": "You are asked to build an offline RL system for a medical treatment policy. What are your concerns?",
          "a": "I would want to raise the concerns in an order that reflects which ones could stop the project, because several of them should. CONCERN 1: YOU CANNOT VALIDATE THE POLICY. This is the binding issue and it is not primarily technical. Off-policy evaluation over a long horizon has variance growing with the product of per-step importance ratios, so it is usually uninformative; fitted Q evaluation shares the learner's optimistic bias, making it the wrong instrument for detecting the learner's failure; model-based rollouts compound model error exactly off the data distribution. So I would not be able to tell anyone reliably how good the learned policy is, and I would say that at the start rather than after building it. The honest framing is that offline RL produces a CANDIDATE policy requiring prospective validation, not a validated one. CONCERN 2: CONFOUNDING. This is the concern most specific to medicine and it is frequently missed by people arriving from RL rather than from causal inference. Treatment decisions in logged data were made by clinicians using information that may not be in the dataset - how the patient looked, an off-record conversation, institutional context. If the behaviour policy conditioned on something unobserved that also affects outcomes, then the data violates the assumption that the state is Markov and sufficient, and the learned value function is estimating a confounded quantity. It will systematically credit the treatment for the clinician's unrecorded judgement. No amount of conservatism fixes this - it is a causal identification failure, not a distribution-shift one, and it belongs in the sensitivity analysis vocabulary of causal inference rather than the RL one. CONCERN 3: COVERAGE AND POSITIVITY. Offline RL can only say something about actions the data contains. If a treatment was never given to a patient subgroup, the value there is extrapolation. In causal-inference terms this is the positivity assumption, and it fails constantly in clinical data because treatment assignment is strongly patient-dependent by design. I would want per-subgroup coverage reported before any modelling. CONCERN 4: THE REWARD FUNCTION IS A CLINICAL AND ETHICAL DECISION, not an engineering one. Mortality at 30 days, quality-adjusted life years, a composite - these encode value judgements, they conflict, and optimizing a proxy hard is exactly how you get a policy that games it. This needs clinicians and ethicists deciding it explicitly and in writing. CONCERN 5: DISTRIBUTION SHIFT OVER TIME. Practice standards, patient populations and available treatments change, so a policy learned on historical data may be optimal for a world that no longer exists. WHAT I WOULD ACTUALLY PROPOSE. Frame the deliverable as DECISION SUPPORT rather than an autonomous policy: surface the model's recommendation and its uncertainty to a clinician who decides, which keeps a human in the loop and makes the system's errors recoverable. Constrain the policy tightly to the data distribution - I would prefer IQL or a policy-constrained method precisely because their conservatism is structural. Report coverage per subgroup. Run high-confidence lower-bound evaluation and present the lower bound, not the point estimate. And insist that any deployment is prospective and staged with predefined stopping rules. THE THING I WOULD SAY MOST FIRMLY. If the organization's expectation is a validated autonomous treatment policy, the correct answer is that the current state of offline evaluation does not support that, and saying so early is more valuable than building something that cannot be checked."
        },
        {
          "q": "How does Decision Transformer differ from value-based offline RL, and what does it give up?",
          "a": "THE REFRAMING. Decision Transformer treats offline RL as CONDITIONAL SEQUENCE MODELLING rather than as dynamic programming. Feed a transformer a sequence of (return-to-go, state, action) tokens and train it with ordinary supervised next-token prediction to model the action given the history and the desired return. At inference, condition on a high desired return and let it generate actions. There is no value function, no Bellman backup, no bootstrapping, and no policy improvement step. WHY THAT IS APPEALING. Every problem in this lesson comes from the max in the Bellman backup querying unsupported actions and propagating error through bootstrapping. Remove bootstrapping and the entire failure mode is gone by construction - no extrapolation error, no divergence, no conservatism coefficient. It is supervised learning, so it inherits supervised learning's stability and its scaling behaviour, which is a large practical advantage. And it composes naturally with the transformer stack and with long context. WHAT IT GIVES UP - STITCHING, and this is the crux. Dynamic programming propagates values through shared states, which lets it combine the good first half of one trajectory with the good second half of another into a policy better than either. Decision Transformer conditions on a return and imitates trajectories that achieved it; if no trajectory in the data achieved the return you condition on, it is extrapolating in return-space with no mechanism for assembling one. Empirically this shows up exactly as predicted: DT is strong on datasets containing good trajectories and comparatively weak on the diverse-suboptimal datasets where stitching is the whole point - which are precisely the datasets that distinguish offline RL from imitation. THE SECOND WEAKNESS: STOCHASTIC ENVIRONMENTS. Conditioning on a high return in a stochastic environment selects for trajectories that got LUCKY, not for good actions. The model learns to imitate behaviour that preceded fortunate outcomes, which is a form of survivorship reasoning. Value-based methods take expectations and are not fooled this way. This is a genuine and well-characterized limitation. THE THIRD: THE RETURN CONDITION IS A HYPERPARAMETER AT TEST TIME. You must pick a target return, and asking for too much produces incoherent behaviour while asking for too little leaves performance on the table - and you cannot tune it by evaluating. HOW I WOULD PLACE IT. Decision Transformer is best understood as sophisticated return-conditioned IMITATION rather than as reinforcement learning - which is not a criticism, since much of what people want from offline RL is achievable by imitation, and the honest comparison is against filtered behaviour cloning rather than against CQL. Its real contributions are the demonstration that a large sequence model with a good representation can substitute for a lot of algorithmic machinery, and its natural fit with pretraining and multi-task settings. WHERE THIS IS GOING. The interesting subsequent work tries to get both - adding value-based stitching to sequence models, or using dynamic programming to relabel returns so the sequence model can learn stitched behaviour. That direction acknowledges the diagnosis: the value function was doing something specific and valuable, and removing it removed that too."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why offline RL fails where online RL does not",
        "back": "The max queries actions absent from the data, where Q is pure EXTRAPOLATION - and the max SELECTS FOR high extrapolations. Online, acting on the overestimate produces the data that corrects it. Offline, that loop is deleted, so nothing ever contradicts the belief."
      },
      {
        "type": "definition",
        "front": "Fujimoto et al.'s key comparison",
        "back": "Standard off-policy algorithms fail catastrophically on a fixed buffer EVEN WITH EXPERT DATA - while the same algorithm succeeds if it COLLECTS that same data itself. That isolates the cause: not data quality, the missing correction loop."
      },
      {
        "type": "formula",
        "front": "CQL objective",
        "back": "L_TD + alpha*(E_s[logsumexp_a Q(s,a)] - E_{(s,a)~D}[Q(s,a)]). Push DOWN broadly, push UP on data actions -> a LOWER BOUND on true value. logsumexp is a soft max, so pressure concentrates on the action the backup's max would pick."
      },
      {
        "type": "formula",
        "front": "IQL: no max anywhere",
        "back": "V by EXPECTILE regression on Q over IN-DATASET actions (tau ~0.7-0.9); then Q target = r + gamma*V(s') - no max. Policy by advantage-weighted regression exp(beta*(Q-V)) x imitation. Never evaluates an out-of-dataset action, so no conservatism coefficient."
      },
      {
        "type": "intuition",
        "front": "What expectile regression computes",
        "back": "Expectiles generalize the MEAN by making the SQUARED loss asymmetric (quantiles generalize the median with absolute loss). Upper tau pulls V toward the LARGEST in-dataset Q - a max computed by regression rather than by argmax. And it UNDER-estimates, which is the safe direction."
      },
      {
        "type": "pitfall",
        "front": "Always report filtered behaviour cloning",
        "back": "BC on the top X% of trajectories by return is competitive with sophisticated offline RL on many datasets. If your method does not beat it on data where STITCHING is possible, it is not doing anything RL-specific."
      },
      {
        "type": "definition",
        "front": "Stitching",
        "back": "Combining good SEGMENTS of different suboptimal trajectories into a policy better than any single one, by propagating values through shared states. Dynamic programming does it naturally; behaviour cloning and return-conditioned sequence models cannot."
      },
      {
        "type": "pitfall",
        "front": "The field's evaluation flaw",
        "back": "Most offline RL papers tune hyperparameters by evaluating candidate policies IN THE ENVIRONMENT. If you can do that you are not offline - it leaks online access into a method premised on not having it, and the numbers are an upper bound only achievable by someone who did not need the method."
      },
      {
        "type": "pitfall",
        "front": "More conservatism is not safer",
        "back": "Too much pessimism makes the values so low that the policy degenerates toward IMITATING the behaviour policy - giving up exactly the improvement offline RL was for. alpha has an interior optimum you cannot find without evaluation."
      },
      {
        "type": "intuition",
        "front": "Off-policy evaluation's variance problem",
        "back": "The importance weight is a PRODUCT of per-step ratios, so variance grows with horizon and effective sample size collapses to a handful of trajectories. Usable at short horizons, not long ones. Fitted-Q evaluation shares the learner's optimistic bias - wrong instrument for detecting the learner's failure."
      },
      {
        "type": "intuition",
        "front": "What Decision Transformer gives up",
        "back": "Return-conditioned sequence modelling removes bootstrapping (so no extrapolation error) but loses STITCHING. And in STOCHASTIC environments, conditioning on a high return selects for trajectories that got LUCKY - survivorship reasoning. Value methods take expectations and are not fooled."
      },
      {
        "type": "intuition",
        "front": "Offline RL is causal inference on decisions",
        "back": "The logging policy is a propensity; importance weighting is IPW; coverage is POSITIVITY. And the medical-data killer is CONFOUNDING: if clinicians acted on information not in the dataset, the value function credits the treatment for their unrecorded judgement - a causal identification failure no conservatism fixes."
      }
    ],
    "refs": [
      {
        "title": "Levine et al. (2020), Offline Reinforcement Learning: Tutorial, Review, and Perspectives on Open Problems",
        "url": "https://arxiv.org/abs/2005.01643"
      },
      {
        "title": "Fujimoto, Meger & Precup (2019), Off-Policy Deep Reinforcement Learning without Exploration (BCQ)",
        "url": "https://arxiv.org/abs/1812.02900"
      },
      {
        "title": "Kumar et al. (2020), Conservative Q-Learning for Offline Reinforcement Learning",
        "url": "https://arxiv.org/abs/2006.04779"
      },
      {
        "title": "Kostrikov, Nair & Levine (2021), Offline Reinforcement Learning with Implicit Q-Learning",
        "url": "https://arxiv.org/abs/2110.06169"
      },
      {
        "title": "Fujimoto & Gu (2021), A Minimalist Approach to Offline Reinforcement Learning (TD3+BC)",
        "url": "https://arxiv.org/abs/2106.06860"
      }
    ],
    "demos": [
      "dqn",
      "value-iteration",
      "distributional-rl",
      "importance-sampling"
    ]
  },
  "imitation-learning": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Behaviour cloning is the simplest idea in this module: collect demonstrations, train a classifier or regressor from states to the expert's actions, deploy it. No reward function, no value function, no exploration, no bootstrapping - it is supervised learning, with all of supervised learning's reliability. And it works remarkably often, which is why it is the first thing to try and why the entire SFT stage of language-model training is exactly this.",
        "Its failure is the module's theme in its purest form. A supervised learner is trained on the EXPERT'S state distribution and deployed on its OWN. A small error takes it somewhere the expert never went, where it has no training data and is therefore worse, which takes it further off, and the errors compound. Ross and Bagnell made this precise: behaviour cloning's regret grows like error times horizon SQUARED, against error times horizon for a method that accounts for the distribution it induces. The extra factor of T is entirely the feedback loop - the one every other lesson in this module was built to manage - reappearing in a method that has no mechanism for it because it deleted the loop entirely. DAgger's fix is to put the loop back: roll out the LEARNER, have the expert relabel the states the learner actually visited, aggregate, refit. Train on your own distribution and the quadratic term goes away.",
        "Inverse RL asks a different question - not what did the expert DO, but what were they trying to ACHIEVE. Recover the reward function, then plan with it. The problem is ill-posed by construction: infinitely many rewards explain any behaviour, including the zero reward under which everything is optimal. Maximum-entropy IRL resolves this by choosing, among all reward functions whose optimal policies match the expert's feature expectations, the one inducing the highest-entropy behaviour distribution. And this is where the module ends, because the payoff is a statement about what is worth learning. A POLICY encodes one solution to one environment. A REWARD encodes the task. Block the corridor the demonstrations used, and a cloned policy fails - including a DAgger-trained one, whose covariate-shift robustness does not extend to a changed world - while a recovered reward lets you replan and still reach the goal. Robustness to your own mistakes and transfer to a different environment are different properties, and only one of them survives the world changing."
      ],
      "math": [
        {
          "h": "Why behaviour cloning's error compounds quadratically",
          "paras": [
            "Suppose the learned policy disagrees with the expert with probability epsilon on states drawn from the expert's distribution. The first mistake puts you off that distribution, where the guarantee no longer applies and performance can be arbitrarily bad for the rest of the episode.",
            "Summing the cost over all the timesteps at which a first deviation could occur gives the extra factor of T. This is not a loose bound - the construction achieving it is straightforward."
          ],
          "tex": "J(\\pi_{\\text{BC}}) - J(\\pi^{*}) \\;=\\; O\\!\\big(\\epsilon T^{2}\\big) \\qquad\\text{vs}\\qquad O\\!\\big(\\epsilon T\\big) \\;\\text{for DAgger}",
          "texNote": "Read the two factors of T separately: one is the ordinary accumulation of per-step cost over a horizon, and the SECOND is the compounding - each mistake increases the chance of further mistakes by moving you somewhere unfamiliar. At T = 1000 and epsilon = 0.01 that difference is between a mild degradation and total failure, which is why the distinction is practical rather than theoretical."
        },
        {
          "h": "DAgger: train on the distribution you will actually see",
          "paras": [
            "Iterate: roll out the CURRENT policy, collect the states IT visits, ask the expert what they would do at those states, add the labelled pairs to the dataset, refit on everything.",
            "The result is a dataset whose state distribution converges to the learner's own, which is exactly the distribution the deployed policy will encounter - removing the mismatch that produced the quadratic term."
          ],
          "tex": "\\mathcal{D}_{i+1} = \\mathcal{D}_i \\cup \\big\\{(s, \\pi^{*}(s)) : s \\sim d_{\\pi_i}\\big\\}, \\qquad \\pi_{i+1} = \\arg\\min_{\\pi} \\mathbb{E}_{\\mathcal{D}_{i+1}}\\big[\\ell(\\pi(s), \\pi^{*}(s))\\big]",
          "texNote": "The critical requirement is an INTERACTIVE expert - someone or something that can be queried for the correct action at an arbitrary state the learner wandered into, including states no sensible expert would ever reach. That is easy with a planner or a simulator and often impossible with a human, and it is the practical reason DAgger is less used than its theory would suggest."
        },
        {
          "h": "Maximum-entropy IRL, and the ambiguity it resolves",
          "paras": [
            "Inverse RL is ill-posed: many rewards make the same behaviour optimal, and the zero reward makes everything optimal. MaxEnt IRL picks the distribution over trajectories that matches the expert's expected FEATURE COUNTS while being otherwise as uncommitted as possible.",
            "The resulting gradient is beautifully interpretable - it is the difference between the expert's feature expectations and the current model's, so learning stops exactly when the two agree."
          ],
          "tex": "p(\\tau) \\propto \\exp\\big(w^{\\top} f(\\tau)\\big) \\quad\\text{s.t.}\\quad \\mathbb{E}_{p}[f] = \\mathbb{E}_{\\text{expert}}[f] \\\\[4pt] \\nabla_w \\mathcal{L} = \\underbrace{\\mathbb{E}_{\\text{expert}}[f]}_{\\text{count from demos}} - \\underbrace{\\mathbb{E}_{p_w}[f]}_{\\text{from soft value iteration}}",
          "texNote": "Maximum entropy is the principled way to say 'match what I observed and assume nothing else', and it also makes the model tolerant of suboptimal demonstrations - the expert is assumed to be noisily rational rather than perfect, so a few bad actions do not have to be explained. The inner expectation requires solving the forward problem at every gradient step, which is why IRL is expensive and why adversarial methods that avoid it became popular."
        }
      ],
      "code": [
        {
          "h": "Behaviour cloning, the measurement that exposes it, and DAgger",
          "paras": [
            "The covariate-shift gap is easy to hide by accident. Evaluating on the demonstration states shows high accuracy; the failure only appears when you roll the policy out - and only if you roll out from a distribution of starts rather than one fixed one."
          ],
          "code": "# BEHAVIOUR CLONING: ordinary supervised learning.\nbc = fit_classifier(states=D_expert.s, labels=D_expert.a)\n\n# THE MEASUREMENT THAT MATTERS - and the design detail that makes or breaks it:\nprint(\"action accuracy on DEMO states :\", acc(bc, D_expert))     # ~98%\nprint(\"mean return over RANDOM STARTS  :\", rollout(bc, starts=\"random\"))\n#\n# EVALUATE FROM RANDOM STARTS, not one fixed start. From a single deterministic\n# start the cloned policy often retraces the demonstrated corridor exactly and\n# matches the expert - showing NO gap and hiding the whole phenomenon. Averaging\n# over starts forces the policy into states the demos under-covered, which is\n# where the compounding actually happens.\n\n# DEMO-BUDGET SWEEP: the gap closes with data, but slowly and unevenly.\n#   2 demos  -> fails                    5+ demos -> largely recovers\n\n# DAGGER: put the feedback loop back.\nD = D_expert\nfor i in range(n_rounds):\n    pi = fit_classifier(D.s, D.a)\n    visited = rollout_states(pi)              # the LEARNER's distribution\n    labels  = [expert(s) for s in visited]    # <- INTERACTIVE expert required\n    D = D + (visited, labels)\n#\n# Now the training distribution converges to the deployed one, and the T^2\n# term becomes T. THE CATCH: you must be able to query the expert at arbitrary\n# states the learner blundered into - trivial with a planner or simulator,\n# usually impossible with a human, which is why DAgger is less used in\n# practice than its theory deserves.",
          "caption": "The evaluation design decides whether you observe the phenomenon at all: from one fixed start a cloned policy retraces the demonstration and looks perfect. Averaging over random starts forces it into under-covered states, which is where compounding lives."
        },
        {
          "h": "MaxEnt IRL, and the transfer test that ends the module",
          "paras": [
            "The reason to recover a reward rather than a policy, made into an experiment. Two findings here, and the second one - about feature design - is the practically important one."
          ],
          "code": "# MAXENT IRL: match feature expectations, choose max-entropy among the matches.\nfor it in range(n_iters):\n    pi_soft = soft_value_iteration(R=w @ features)   # solve the FORWARD problem\n    svf     = state_visitation_freq(pi_soft)         # expected feature counts\n    grad    = expert_feature_counts - svf @ features\n    w      += lr * grad                              # stop when the counts agree\n\n# ---- FINDING 1: FEATURE CHOICE IS THE LEVER, not the algorithm ----\n#   ONE-HOT state features   -> the recovered 'reward' just memorizes WHICH\n#                               CELLS the demos passed through. Perfect fit on\n#                               the demonstrated map, ZERO transfer.\n#   CELL-TYPE features       -> is_goal / is_hazard / is_free. Now the reward\n#     (is_goal, is_hazard,      expresses the TASK rather than the route, and\n#      is_free)                 it transfers. Recovered reward correlates ~+1\n#                               with the true one; ~94% policy agreement.\n#\n# The choice of feature basis IS the choice of what generalizes. This is the\n# same lesson as representation design everywhere, and in IRL it is unusually\n# stark because you can see exactly what got memorized.\n\n# ---- FINDING 2: THE TRANSFER TEST - the module's closing argument ----\n# Add a wall blocking the corridor the demonstrations funnelled through:\n#\n#   behaviour cloning ..... FAILS (~65% goal-reaching)\n#   DAgger ................ FAILS (~70%)  <-- robust to ITS OWN mistakes,\n#                                             NOT to a changed world\n#   MaxEnt IRL ............ REPLANS on the recovered reward -> 100%\n#\n# A POLICY encodes one solution to one environment. A REWARD encodes the task.\n# Covariate-shift robustness and cross-environment transfer are DIFFERENT\n# properties, and only the second survives the world changing.",
          "caption": "DAgger failing the transfer test is the instructive result: it fixes the distribution mismatch caused by the learner's own errors, which is a different problem from the environment changing. Only the reward is the object that survives."
        }
      ],
      "useCases": [
        "Robotics from demonstration - teleoperation, kinesthetic teaching, motion capture - where specifying a reward for a manipulation task is far harder than performing it once, which is the original argument for the whole area.",
        "Autonomous driving, where behaviour cloning from human driving is the standard starting point and covariate shift is the canonical documented failure: the model never saw recovery from a lane departure because good drivers do not depart lanes, so it cannot recover.",
        "Language-model post-training. Supervised fine-tuning IS behaviour cloning on demonstrations, and the move to preference learning is precisely this lesson's move from imitating behaviour to learning what the behaviour was for.",
        "Bootstrapping RL to avoid the expensive random-exploration phase: pretrain by cloning, then fine-tune with RL. This is standard in robotics and in reasoning models, and it works because cloning solves the exploration problem that RL is worst at."
      ],
      "pitfalls": [
        "Evaluating behaviour cloning on the demonstration states. Action accuracy there can be near-perfect while the rolled-out policy fails, because the whole problem is that deployment happens on a different state distribution. Only a rollout measures the thing you care about.",
        "Rolling out from a single fixed start. The cloned policy often retraces the demonstrated trajectory exactly and matches the expert, showing no gap and hiding the phenomenon entirely. Average over a distribution of starts so the policy is forced into under-covered states.",
        "Assuming DAgger is available. It requires an INTERACTIVE expert that can label arbitrary states the learner wandered into, including states no sensible expert would reach. That is easy with a planner and usually impossible with a human, which is the real reason it is under-used.",
        "Using one-hot or otherwise memorizing features in IRL. The recovered reward then encodes which cells the demonstrations passed through rather than what the task was, fitting perfectly and transferring not at all. The feature basis IS the choice of what generalizes.",
        "Expecting covariate-shift robustness to give environment transfer. A DAgger-trained policy handles its own mistakes and still fails when the environment changes, because it is still a policy - one solution to one world. Only a recovered reward supports replanning.",
        "Forgetting that inverse RL is ill-posed. Many rewards explain any behaviour and the zero reward explains everything, so some principle must break the tie - maximum entropy, a feature basis, a prior. If you cannot say what resolves the ambiguity in your method, it is being resolved by accident.",
        "Cloning demonstrations that contain no failures. If every demonstration succeeds, the learner never sees a recovery and cannot perform one. Deliberately including corrections and near-misses is often worth more than more successful demonstrations."
      ],
      "connections": [
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "Behaviour cloning is the baseline every offline method must beat, and the distinguishing capability is stitching. Note the contrast in failure modes: cloning suffers covariate shift from its own errors, while offline RL suffers extrapolation error from the max - two different consequences of the same missing loop."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "SFT is behaviour cloning on demonstrations, and it inherits this lesson's limits exactly - which is why the Superficial Alignment Hypothesis and the imitation-versus-optimization distinction are this lesson's argument restated for language models."
        },
        {
          "ref": "fine-tuning/reward-modeling",
          "text": "Learning a reward model from preferences is inverse RL with a different elicitation format: instead of inferring a reward from demonstrations, infer it from comparisons. Both are recovering the objective rather than the behaviour, and both are ill-posed without a resolving principle."
        },
        {
          "ref": "reinforcement-learning/mdp-bellman",
          "text": "The transfer result is a statement about that lesson's objects. A reward function plus dynamics defines the problem; a policy is one solution to it. Change the dynamics and the reward survives while the policy does not - which is why IRL can replan and cloning cannot."
        },
        {
          "ref": "generative/gan",
          "text": "GAIL is adversarial imitation: a discriminator separating expert from learner state-action pairs supplies the reward, and the policy is trained against it. It avoids IRL's expensive inner planning loop and inherits GAN training's instabilities in exchange."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is behaviour cloning?",
          "a": "Supervised learning from states to expert actions using demonstration data. No reward, no value function, no exploration - it is ordinary classification or regression."
        },
        {
          "q": "What is covariate shift in imitation learning?",
          "a": "The learner is trained on the expert's state distribution and deployed on its own. A small error takes it somewhere unfamiliar, where it is worse, which takes it further off."
        },
        {
          "q": "How does behaviour cloning's error scale?",
          "a": "O(epsilon * T^2) against O(epsilon * T) for a method accounting for its induced distribution. The extra factor of T is the compounding."
        },
        {
          "q": "What is DAgger?",
          "a": "Roll out the current learner, have the expert label the states the learner visited, aggregate into the dataset, refit. It trains on the learner's own distribution."
        },
        {
          "q": "What does DAgger require that is often unavailable?",
          "a": "An interactive expert who can be queried for the correct action at arbitrary states the learner wandered into - easy with a planner, usually impossible with a human."
        },
        {
          "q": "What is inverse RL?",
          "a": "Recovering the reward function from demonstrations rather than the policy, so you can then plan with it."
        },
        {
          "q": "Why is inverse RL ill-posed?",
          "a": "Many reward functions make the same behaviour optimal, and the zero reward makes everything optimal. Some principle must break the tie."
        },
        {
          "q": "How does MaxEnt IRL resolve the ambiguity?",
          "a": "Among all trajectory distributions matching the expert's expected feature counts, choose the maximum-entropy one - match what you observed and assume nothing else."
        },
        {
          "q": "What is the MaxEnt IRL gradient?",
          "a": "Expert feature expectations minus the current model's feature expectations. Learning stops exactly when the two agree."
        },
        {
          "q": "Why is MaxEnt IRL expensive?",
          "a": "Each gradient step requires solving the forward problem - soft value iteration and state-visitation computation - to get the model's feature expectations."
        },
        {
          "q": "Why does a reward transfer where a policy does not?",
          "a": "A policy encodes one solution to one environment. A reward encodes the task, so if the dynamics change you can replan with it."
        },
        {
          "q": "What is GAIL?",
          "a": "Adversarial imitation: a discriminator separating expert from learner state-action pairs provides the reward signal, avoiding IRL's inner planning loop."
        }
      ],
      "standard": [
        {
          "q": "Looking back across this module, what is the single idea that connects the lessons?",
          "a": "THAT THE AGENT GENERATES ITS OWN TRAINING DATA, so every error runs through a FEEDBACK LOOP rather than sitting still - and that essentially every technique in the module is a device for stopping some loop from running away. Run through it. MDPs AND BELLMAN give the one setting where the loop is provably safe: exact expectations, a table, a known model, and a contraction guarantee. Everything after drops one of those assumptions and has to add something back. Q-LEARNING VERSUS SARSA is the loop made visible in one symbol - SARSA's target contains its own exploratory action, so it prices its own behaviour, which is why it learns the safe path along the cliff. BANDITS isolate the loop by removing everything else: exploration IS the agent choosing its own data, regret is the price of that choice, and optimism works as a mechanism precisely because acting on an overestimate generates the data that corrects it. DQN is where the loop is explicitly engineered - a replay buffer to make the data look independent, a target network to stop the model chasing a target that moves as it moves, and the two are a balanced pair rather than two good ideas. POLICY GRADIENTS contain the module's most elegant fact: when you differentiate expected return, the dependence of the DATA on the parameters contributes nothing, which is what makes model-free policy optimization possible - and the price is variance, which is what everything downstream attacks. ACTOR-CRITIC AND PPO confront the loop directly: a step large enough to matter can change the state distribution enough to invalidate the data that justified it, which is what a trust region is for. OFFLINE RL is the loop DELETED, and it shows what the loop was doing - the same optimism that drives exploration online becomes unbounded overestimation offline, because nothing can ever contradict a confident belief about an action you cannot try. AND THIS LESSON completes it from the other side. Behaviour cloning also deletes the loop, by being pure supervised learning, and pays with an extra factor of the horizon - errors compound because the learner's own mistakes change the states it visits. DAgger puts the loop back and the quadratic term goes away. THE CLOSING TURN, which is why this is the last lesson. Having spent the module managing the loop, the transfer test asks what is actually worth learning. A policy that is robust to its own mistakes - DAgger's achievement - still fails when the world changes, because a policy is one solution to one environment with the dynamics baked in. A recovered REWARD survives, because it encodes the task rather than the route. So the module ends by distinguishing two things that are easy to conflate: robustness to your own errors, and transfer to a different world. Only the second requires learning what the behaviour was FOR. THE ONE-SENTENCE VERSION. In supervised learning the data is given; in RL the data is a consequence of the model, and almost every difficulty and almost every technique in this module follows from that single structural difference."
        },
        {
          "q": "Explain behaviour cloning's failure mode and how DAgger fixes it.",
          "a": "THE METHOD. Collect demonstrations, train a supervised model from states to actions, deploy. It is attractive because it has none of RL's difficulties - no exploration, no bootstrapping, no reward specification, no deadly triad - and it is genuinely the right first thing to try. THE FAILURE. A supervised learner comes with a guarantee on the distribution it was TRAINED on. Here that is the expert's state distribution. But at deployment the learner generates its OWN states, and the moment it makes a small error it is somewhere the expert never went - so it has no training signal there, so it is more likely to err again, so it drifts further. The errors compound. THE QUANTITATIVE STATEMENT, which is what makes this more than an intuition: Ross and Bagnell showed the regret scales as epsilon times T SQUARED, against epsilon times T for a method that accounts for the distribution it induces. One factor of T is the ordinary accumulation of per-step cost over a horizon; the second is the compounding. At T = 1000 and epsilon = 0.01 that is the difference between a mild degradation and complete failure. THE CANONICAL EXAMPLE is driving. Human drivers do not depart their lane, so the demonstration data contains no examples of RECOVERING from a lane departure. A cloned policy that drifts slightly has never seen how to correct, so it drifts more. The data is missing exactly the states the learner will need most, and it is missing them BECAUSE the expert is good - which is a genuinely counterintuitive property. DAGGER'S FIX. Iterate: fit a policy on the current dataset, roll IT out, collect the states IT visits, ask the expert what they would do at those states, add those labelled pairs, refit on the aggregate. Over rounds, the training distribution converges to the learner's own deployment distribution, which removes the mismatch, and the bound improves to epsilon times T. WHY THIS IS THE MODULE'S THEME. Every other lesson here manages a feedback loop between the policy and the data it generates. Behaviour cloning deletes that loop - it is pure supervised learning - and the quadratic term is precisely the cost of having deleted it. DAgger puts it back. That framing explains why the fix takes the shape it does rather than being a trick. THE PRACTICAL CATCH, which I would not omit. DAgger needs an INTERACTIVE expert able to label arbitrary states the learner blundered into, including states no competent expert would ever occupy. With a planner or a simulator that is trivial. With a human it is usually impossible - you cannot pause a real car halfway off the road and ask what to do - and that is why DAgger is far less used in practice than its theory deserves. The practical alternatives are injecting noise during demonstration collection so the expert has to demonstrate recoveries, or adding synthetic perturbations with corrective labels.",
          "deepDive": {
            "q": "How would you MEASURE the covariate-shift gap, and what design choice most often hides it?",
            "a": "THE WRONG MEASUREMENT, which is the default one. Held-out action accuracy on demonstration states. A cloned policy routinely scores near-perfect there - 98% is typical - while failing completely when rolled out. It is the wrong measurement because it evaluates on the training distribution, which is exactly the distribution the deployed policy will not see. It answers 'did the model fit the data' when the question is 'what happens when the model drives'. THE RIGHT MEASUREMENT. Roll the policy out and measure the actual return or task success. Then compare against the expert's return on the same task. The gap between action accuracy and rolled-out return IS the covariate-shift gap, and reporting both numbers side by side is the clearest way to expose it. THE DESIGN CHOICE THAT HIDES IT - and this is the part worth knowing because it is easy to get wrong accidentally. Evaluate from a SINGLE FIXED START and the phenomenon can disappear entirely. From one deterministic start in a deterministic environment, the cloned policy often retraces the demonstrated trajectory step for step: it is in-distribution the whole way, it never errs, and it matches the expert exactly. You conclude there is no gap. The fix is to evaluate from a DISTRIBUTION OF START STATES, which forces the policy into regions the demonstrations under-covered, where the compounding actually happens. I would treat that as a required part of the protocol rather than a refinement. OTHER DIAGNOSTICS I WOULD ADD. (1) A DEMONSTRATION-BUDGET SWEEP. Plot rolled-out return against number of demonstrations. If it rises steeply and then plateaus below the expert, the residual gap is covariate shift rather than insufficient data - more of the same demonstrations will not close it, and that distinction changes what you do next. (2) STATE-DISTRIBUTION DIVERGENCE. Measure how far the learner's visited-state distribution is from the expert's, with any density-ratio or classifier-based estimate. A classifier trained to distinguish learner states from expert states is cheap and its accuracy is a direct measure of the shift - and it is also the discriminator inside GAIL, which is a nice consistency. (3) TIME-TO-FAILURE. Record how many steps the policy survives before diverging. Compounding predicts a characteristic distribution - fine for a while, then rapid divergence - which looks different from uniform incompetence. (4) PER-STATE ACCURACY ALONG THE ROLLOUT. Plot action agreement with the expert against timestep during a rollout. Covariate shift shows as accuracy DEGRADING with time within an episode, which is a signature no aggregate number displays. WHAT I WOULD REPORT. Action accuracy on demo states, rolled-out return over random starts, expert return for reference, and the accuracy-versus-timestep curve. That set makes the phenomenon unambiguous and takes very little work, and any one of those numbers alone can be misleading."
          }
        },
        {
          "q": "Why would you recover a reward function instead of just cloning the policy?",
          "a": "THE SHORT ANSWER: a reward transfers and a policy does not. The longer answer is about what each object actually encodes. WHAT A POLICY IS. A mapping from states to actions - one solution to one environment. It embeds the dynamics implicitly: it knows to turn left here because turning left worked in this world. Change the world and the mapping is wrong, and nothing in it tells you what to do instead. WHAT A REWARD IS. A specification of the objective, separate from the dynamics. Together with dynamics it defines the MDP, so given a reward you can plan in a NEW environment and get a policy appropriate to it. That is the whole argument. THE EXPERIMENT THAT DEMONSTRATES IT, and I would describe it because it makes the point concrete. Take a gridworld, generate expert demonstrations, and train three things: behaviour cloning, DAgger, and MaxEnt IRL. All three do well on the original map. Now add a wall blocking the corridor the demonstrations funnelled through. Behaviour cloning fails - it is trying to execute a route that no longer exists. DAgger ALSO fails, which is the instructive part: DAgger fixed the distribution mismatch caused by the learner's own errors, and that is a different problem from the environment changing. It is still a policy. MaxEnt IRL replans on the recovered reward and reaches the goal. Covariate-shift robustness and cross-environment transfer are different properties, and only the second survives the world changing. THE OTHER REASONS TO WANT A REWARD. (1) IT IS OFTEN THE MORE COMPACT DESCRIPTION. 'Reach the goal, avoid the hazards' is simpler than any policy achieving it, so it needs less data to identify and generalizes better - the same argument as preferring a model to a lookup table. (2) IT PERMITS EXCEEDING THE DEMONSTRATOR. Cloning is bounded by the expert. With a reward you can plan optimally, which may be better than what was demonstrated - relevant whenever demonstrations are competent but not optimal, which is most demonstrations. (3) IT IS INTERPRETABLE AND AUDITABLE. You can read a recovered reward and ask whether it is what you meant. You cannot read a policy network that way, and in any setting requiring justification that matters. (4) IT COMPOSES with other objectives and constraints in a way a policy does not. THE COST, stated honestly. IRL is ill-posed - many rewards explain any behaviour, and the zero reward explains everything - so some principle must break the tie, and the choice of that principle and of the FEATURE BASIS determines what generalizes. With one-hot state features, MaxEnt IRL recovers a 'reward' that merely memorizes which cells the demonstrations crossed: perfect fit, zero transfer. With cell-type features - is_goal, is_hazard, is_free - it recovers something that expresses the task and transfers. The algorithm is the same; the feature choice is the lever. And IRL is expensive, since every gradient step solves the forward planning problem. So: clone when the environment is fixed and the expert is good. Recover a reward when the world may change, when you need to exceed the demonstrator, or when someone will have to audit the objective."
        },
        {
          "q": "How does this lesson relate to how language models are trained?",
          "a": "Directly, and the mapping is exact enough to be worth stating carefully. SFT IS BEHAVIOUR CLONING. Supervised fine-tuning trains a model to reproduce demonstrated responses, given a prompt. States are contexts, actions are tokens, demonstrations are the curated (instruction, response) pairs. It is supervised learning on an expert's distribution, and it inherits everything in this lesson. THE COVARIATE-SHIFT INHERITANCE, which explains a real phenomenon. During training, the model predicts each token conditioned on the GROUND-TRUTH prefix - teacher forcing. At generation time it conditions on its OWN previously generated tokens. One unusual token puts the context somewhere the training data did not cover, making the next token more likely to be unusual. That is exactly compounding error, and it is the standard explanation for degeneration and drift in long generations. The classical name for this in sequence modelling is exposure bias, and it is the same phenomenon as a cloned driving policy drifting out of its lane. THE FIXES ARE ALSO THE SAME SHAPE. Scheduled sampling - training on the model's own outputs part of the time - is DAgger with a mixing schedule. Rejection-sampling fine-tuning, where you generate from the current model, keep the outputs that pass a checker, and train on those, is DAgger with a verifier standing in for the interactive expert. That correspondence is worth noticing, because it says the fix people arrived at empirically for language models is the fix the imitation-learning literature derived from a regret bound. RLHF IS THE MOVE FROM IMITATION TO A LEARNED REWARD. This is the sharpest connection. SFT can only reproduce demonstrated behaviour and is bounded by the demonstrator. Preference learning recovers what the behaviour was FOR - a reward model - and then optimizes against it, which can exceed the demonstrations. That is precisely the argument for inverse RL over cloning. And reward modelling from preferences is inverse RL with a different elicitation format: infer the objective from comparisons rather than from demonstrations. Both are ill-posed without a resolving principle - MaxEnt in one case, Bradley-Terry plus a KL anchor in the other. THE SUPERFICIAL ALIGNMENT DEBATE IS THIS LESSON'S DEBATE. The claim that SFT only selects a format distribution rather than installing capability is the statement that behaviour cloning is bounded by what the demonstrator's data can express and by what the base model can already produce. And the finding that imitating a stronger model transfers STYLE but not capability is a covariate-shift-adjacent result: the student reproduces surface behaviour on the demonstrated distribution and fails where the underlying competence would have been needed. WHAT I WOULD DRAW FROM IT. Someone who understands this lesson can predict several language-model training phenomena from first principles: that pure SFT will drift in long generations, that training on model-generated verified outputs will help, that preference optimization can exceed demonstrations where imitation cannot, and that a learned reward will be gamed if optimized too hard - which is the ill-posedness of IRL meeting Goodhart. The vocabulary transfers completely.",
          "deepDive": {
            "q": "If SFT is behaviour cloning, why does it work as well as it does on language models when driving policies fail?",
            "a": "A fair question, and the answer is a set of structural differences that happen to be favourable - which is worth knowing precisely, because they identify when it will stop working. (1) THE HORIZON IS SHORT AND SELF-CORRECTING. The T^2 term is fatal because compounding runs over a long horizon. A typical response is hundreds of tokens, not thousands of control steps, and more importantly LANGUAGE IS ERROR-TOLERANT: an awkward word choice does not put the model in an unrecoverable state, because the next token distribution is still reasonable. A car half off the road IS in an unrecoverable state relative to its training data. The state space has a recovery structure that physical control does not. (2) THE DATA IS ENORMOUS AND THE STATE SPACE IS COVERED BY PRETRAINING. This is the big one. A driving policy sees demonstrations only from expert driving. A language model has seen trillions of tokens of text INCLUDING text containing mistakes, corrections, unusual phrasings, and recoveries. So the states an SFT model drifts into are not off-distribution with respect to PRETRAINING even when they are off-distribution with respect to the SFT data. The base model's competence covers the drift. That is a structural advantage no robotics setting has, and it explains why SFT on a strong base works while SFT on a weak one degenerates. (3) EPSILON IS SMALL. The compounding bound scales with the per-step error. Modern language models have very low per-token error on in-distribution text, so even quadratic growth from a small base stays manageable over a few hundred tokens. (4) DECODING PROVIDES DAMPING. Temperature, top-p and repetition penalties are all mechanisms that suppress the low-probability tail where drift begins. That is not learning - it is a stabilizer bolted on at inference, and it is doing real work. WHEN IT DOES FAIL, which validates the analysis. Long generations degenerate - repetition loops and drift are exactly compounding error, and they appear reliably past some length. Out-of-distribution prompts produce worse behaviour than the SFT data suggested. Agentic settings with many tool-calling steps are much more fragile than single-turn generation, because the horizon is long AND errors are not self-correcting - a wrong API call really does put the agent somewhere it has no data for. That last case is the closest analogue to driving and it fails in the same way, which I think is the strongest evidence the framing is right. WHAT THIS PREDICTS. As language models move toward long-horizon agentic tasks, the imitation-learning failure mode should become more prominent, and the fixes should look like DAgger and inverse RL - training on the model's own trajectories with verified or expert labels, and optimizing a learned objective rather than imitating demonstrations. That is what rejection-sampling fine-tuning and RL with verifiable rewards actually are, and I would say the field arrived at them by the same route the imitation-learning literature did twenty years earlier."
          }
        },
        {
          "q": "Explain GAIL and how it relates to IRL and to GANs.",
          "a": "THE PROBLEM IT SOLVES. Classical IRL is expensive because it is a nested optimization: for each candidate reward you must SOLVE the forward RL problem to compute the induced feature expectations, then take one gradient step on the reward, and repeat. Solving an MDP per gradient step is prohibitive at any realistic scale. GAIL's contribution is showing you can skip the explicit reward and match the expert's occupancy measure directly. THE MECHANISM. Train a DISCRIMINATOR D to distinguish expert state-action pairs from learner state-action pairs. Use its output as a reward - typically -log(1 - D(s,a)) or log D(s,a) - and train the policy with a policy-gradient method to maximize it. The policy is trying to produce state-action pairs the discriminator cannot distinguish from the expert's; the discriminator is trying to keep separating them. At equilibrium the learner's occupancy measure matches the expert's. THE GAN CORRESPONDENCE, which is exact rather than analogical. The generator is the POLICY, and the data it generates is its state-action distribution - though note the generator here acts through an environment, so it cannot be differentiated end to end, which is why a policy gradient is needed where a GAN backpropagates through the generator. The discriminator is the same object. The objective is a divergence between the learner's and the expert's occupancy measures, minimized adversarially. Ho and Ermon's derivation is the substantive part: they showed that IRL with a particular regularizer on the reward is DUAL to occupancy-measure matching, and that choosing the regularizer appropriately yields exactly the GAN objective. So GAIL is not GAN-inspired imitation - it is what IRL becomes when you write down its dual. WHAT IT BUYS. No inner planning loop, so it scales to continuous high-dimensional control where classical IRL cannot go. And it needs no feature basis to be hand-designed, since the discriminator learns the features - which removes the lever that determines transfer in MaxEnt IRL, for better and for worse. WHAT IT COSTS. (1) ADVERSARIAL TRAINING INSTABILITY, inherited wholesale: mode collapse, oscillation, sensitivity to the balance between discriminator and policy updates. (2) IT DOES NOT GIVE YOU AN INTERPRETABLE REWARD. The discriminator is a reward in a formal sense but it is defined relative to the current policy and shifts as training proceeds, so it does not transfer to a new environment the way a MaxEnt reward does. If transfer is why you wanted IRL, GAIL does not deliver it - AIRL was developed specifically to recover a transferable reward from an adversarial formulation, by restricting the discriminator's form so a state-only reward can be extracted. (3) SAMPLE EFFICIENCY: it needs environment interaction to generate learner trajectories, so it is not an offline method. WHERE I WOULD PLACE IT. GAIL is the right choice for high-dimensional imitation where you have a simulator and want to match expert behaviour without hand-designing features. If you want a transferable, auditable objective, MaxEnt IRL with a deliberately chosen feature basis - or AIRL - is the better tool, and the feature basis is a feature rather than a bug, since it is where you state what should generalize."
        },
        {
          "q": "You have 50 demonstrations for a robotic task. Walk through your approach.",
          "a": "I would start with the cheapest thing and let the measurements decide the rest, because 50 demonstrations is a small enough budget that the data question dominates the algorithm question. STEP 1: BEHAVIOUR CLONING, AND MEASURE IT PROPERLY. Fit a policy, then evaluate the right way - rolled-out task success from a DISTRIBUTION of start states, not action accuracy on the demonstration set and not a single fixed start. Report action accuracy and rolled-out success side by side; the gap between them is the covariate-shift gap and it tells me what problem I have. I would also plot accuracy against timestep within a rollout, since degradation with time is the signature of compounding rather than of general incompetence. STEP 2: A DEMONSTRATION-BUDGET SWEEP, which is the most informative cheap experiment. Train on 10, 20, 30, 50 demonstrations and plot rolled-out success. If it is still rising steeply at 50, my binding constraint is DATA and I should collect more - that is a straightforward answer. If it has plateaued below acceptable, more of the same demonstrations will not help and the constraint is covariate shift or representation. That single plot redirects the whole project and takes an afternoon. STEP 3: FIX THE DATA BEFORE THE ALGORITHM, because with 50 demonstrations this is where the leverage is. (a) INJECT NOISE DURING COLLECTION so the demonstrator has to perform RECOVERIES - this is the single most valuable change, because the missing recoveries are exactly what covariate shift exploits, and they are missing precisely because the expert is good. (b) Add synthetic perturbations with corrective labels where the task permits computing them. (c) Ensure the demonstrations start from varied initial conditions rather than one canonical setup. (d) Include some failures and corrections deliberately. STEP 4: DAGGER IF THE EXPERT IS QUERYABLE. If I have a scripted expert, a planner, or a motion-capture setup that can label arbitrary states, DAgger removes the quadratic term and is clearly worth it. If the expert is a human teleoperator, DAgger is likely impractical, and the noise-injection approach in step 3 is the practical substitute - it is deliberately manufacturing the same data DAgger would have collected. STEP 5: DECIDE WHETHER I NEED A REWARD. The question is whether the environment will change - a different object, a different layout, a different goal position. If yes, a cloned policy will fail on the changed world and so will a DAgger-trained one, and I should be recovering a reward or at least conditioning the policy on the goal. If the setup is fixed, cloning is the right tool and IRL adds cost for nothing. STEP 6: IF I HAVE A SIMULATOR, clone first and then fine-tune with RL. Cloning solves the exploration problem that RL is worst at, and RL then exceeds the demonstrator. This is the standard and generally best combination when it is available. WHAT I WOULD NOT DO with 50 demonstrations: reach for GAIL or a complex IRL method first. The failure at this data scale is far more likely to be about what the demonstrations contain than about the imitation algorithm, and the budget sweep in step 2 will tell me that before I have built anything."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Behaviour cloning's compounding error",
        "back": "O(epsilon*T^2) vs O(epsilon*T) for DAgger. One factor of T is ordinary horizon accumulation; the SECOND is compounding - each mistake moves you somewhere unfamiliar, raising the chance of more. At T=1000, eps=0.01 that is mild degradation vs total failure."
      },
      {
        "type": "intuition",
        "front": "Why the expert being GOOD causes the problem",
        "back": "Human drivers do not depart their lane, so the demonstrations contain no LANE-DEPARTURE RECOVERIES. The data is missing exactly the states the learner will need most, and it is missing them BECAUSE the demonstrator was competent."
      },
      {
        "type": "definition",
        "front": "DAgger",
        "back": "Roll out the CURRENT learner, have the expert label the states IT visited, aggregate, refit. The training distribution converges to the deployment distribution. Requires an INTERACTIVE expert able to label arbitrary blundered-into states - trivial with a planner, usually impossible with a human."
      },
      {
        "type": "pitfall",
        "front": "Evaluate imitation from RANDOM starts",
        "back": "From one fixed start the cloned policy often retraces the demonstration exactly, matches the expert, and shows NO gap - hiding the phenomenon entirely. Average over a distribution of starts. Also plot accuracy vs TIMESTEP: degradation within an episode is the signature."
      },
      {
        "type": "intuition",
        "front": "Why inverse RL is ill-posed",
        "back": "Infinitely many rewards make the same behaviour optimal - including the ZERO reward, under which everything is optimal. Some principle must break the tie. If you cannot say what resolves the ambiguity in your method, it is being resolved by accident."
      },
      {
        "type": "formula",
        "front": "MaxEnt IRL",
        "back": "p(tau) ~ exp(w.f(tau)) subject to E_p[f] = E_expert[f]; gradient = expert feature counts - model feature counts, so learning stops when they agree. Max entropy = 'match what I observed, assume nothing else', and it tolerates noisily-rational experts."
      },
      {
        "type": "intuition",
        "front": "The transfer test (the module's closing result)",
        "back": "Block the corridor the demos used: BC fails (~65%), DAGGER ALSO FAILS (~70%), MaxEnt IRL REPLANS to 100%. DAgger fixes shift caused by the LEARNER'S OWN errors - a different problem from the WORLD changing. It is still a policy."
      },
      {
        "type": "pitfall",
        "front": "In IRL the FEATURE BASIS is the lever",
        "back": "ONE-HOT state features -> the 'reward' memorizes which CELLS the demos crossed: perfect fit, ZERO transfer. CELL-TYPE features (is_goal/is_hazard/is_free) -> expresses the TASK, correlates ~+1 with truth, transfers. Same algorithm; the features decide what generalizes."
      },
      {
        "type": "intuition",
        "front": "A policy vs a reward",
        "back": "A POLICY encodes one solution to one environment, with the dynamics baked in implicitly. A REWARD encodes the TASK, separate from dynamics - so change the world and you can replan. Covariate-shift robustness and cross-environment transfer are DIFFERENT properties."
      },
      {
        "type": "intuition",
        "front": "SFT is behaviour cloning; RLHF is the move to a reward",
        "back": "Teacher forcing trains on ground-truth prefixes; generation conditions on the model's OWN tokens = exposure bias = compounding error. Scheduled sampling is DAgger with a schedule; rejection-sampling fine-tuning is DAgger with a VERIFIER as the expert."
      },
      {
        "type": "intuition",
        "front": "Why SFT works where driving policies fail",
        "back": "Short horizon; language is ERROR-TOLERANT (an awkward word is recoverable, a car half off the road is not); and PRETRAINING covers the drift - drifted states are off-SFT-distribution but not off-pretraining-distribution. It DOES fail in long agentic rollouts, where both advantages vanish."
      },
      {
        "type": "definition",
        "front": "GAIL",
        "back": "A discriminator separating expert from learner (s,a) pairs supplies the reward; the policy is trained by policy gradient against it. Ho & Ermon showed IRL with a particular reward regularizer is DUAL to occupancy matching, yielding exactly the GAN objective - so it is not GAN-inspired, it IS IRL's dual."
      }
    ],
    "refs": [
      {
        "title": "Ross, Gordon & Bagnell (2011), A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning (DAgger)",
        "url": "https://arxiv.org/abs/1011.0686"
      },
      {
        "title": "Ross & Bagnell (2010), Efficient Reductions for Imitation Learning",
        "url": "https://proceedings.mlr.press/v9/ross10a.html"
      },
      {
        "title": "Ziebart et al. (2008), Maximum Entropy Inverse Reinforcement Learning",
        "url": "https://cdn.aaai.org/AAAI/2008/AAAI08-227.pdf"
      },
      {
        "title": "Ng & Russell (2000), Algorithms for Inverse Reinforcement Learning",
        "url": "https://ai.stanford.edu/~ang/papers/icml00-irl.pdf"
      },
      {
        "title": "Ho & Ermon (2016), Generative Adversarial Imitation Learning",
        "url": "https://arxiv.org/abs/1606.03476"
      }
    ],
    "demos": [
      "gridworld-rl",
      "value-iteration",
      "max-entropy-rl",
      "pathfinding"
    ]
  }
};
