// GENERATED from content/lessons/reinforcement-learning/imitation-learning.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/reinforcement-learning/imitation-learning/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
    ],
    "demoTitles": {
      "gridworld-rl": "Q-Learning Gridworld",
      "value-iteration": "MDP Value Iteration",
      "max-entropy-rl": "Maximum-Entropy RL",
      "pathfinding": "A* Pathfinding"
    }
  }
};
