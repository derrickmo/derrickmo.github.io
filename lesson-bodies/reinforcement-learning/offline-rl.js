// GENERATED from content/lessons/reinforcement-learning/offline-rl.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/reinforcement-learning/offline-rl/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "dqn": "Deep Q-Network (DQN)",
      "value-iteration": "MDP Value Iteration",
      "distributional-rl": "Distributional RL (C51)",
      "importance-sampling": "Importance Sampling"
    }
  }
};
