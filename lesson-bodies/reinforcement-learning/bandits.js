// GENERATED from content/lessons/reinforcement-learning/bandits.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/reinforcement-learning/bandits/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
  }
};
