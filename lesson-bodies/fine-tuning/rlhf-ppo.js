// GENERATED from content/lessons/fine-tuning/rlhf-ppo.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/fine-tuning/rlhf-ppo/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "rlhf-ppo": {
    "interview": {
      "quickGrind": [
        {
          "q": "What are the three stages of RLHF?",
          "a": "Supervised fine-tuning on demonstrations, then a reward model trained on human preference comparisons, then policy optimization against that reward with a KL penalty to the SFT model."
        },
        {
          "q": "Why train on comparisons rather than absolute scores?",
          "a": "People are far more consistent ranking two outputs than assigning a number. Absolute scales drift between annotators and within one annotator over a session; pairwise preference does not."
        },
        {
          "q": "What loss trains the reward model?",
          "a": "Bradley-Terry: -log sigmoid(r(chosen) - r(rejected)). Only the DIFFERENCE is supervised, so the reward is identified up to an additive constant per prompt."
        },
        {
          "q": "Why is the KL penalty there?",
          "a": "The reward model is a proxy that is only valid near the distribution it was trained on. The KL term keeps the policy in that region, so it is a validity constraint, not a regularizer."
        },
        {
          "q": "What happens if you remove it?",
          "a": "The policy finds inputs the reward model scores highly and humans do not — reward hacking. Measured reward climbs monotonically while true quality turns over."
        },
        {
          "q": "Why PPO rather than vanilla policy gradient?",
          "a": "Vanilla policy gradient is on-policy and high-variance, and a single large step can destroy the policy. PPO's clipped ratio bounds how far one update moves, letting you reuse a batch for several epochs."
        },
        {
          "q": "Why does PPO clip with a MIN rather than just clamping?",
          "a": "The min makes the objective pessimistic. For a positive advantage with ratio below 1 - eps, plain clipping would zero the gradient and trap the policy; the min keeps that case unclipped so it can recover."
        },
        {
          "q": "What is the value model for?",
          "a": "Baseline subtraction. The advantage is return minus the value estimate, which removes variance without adding bias — and it is a second network the size of the policy, which is much of RLHF's cost."
        },
        {
          "q": "What does DPO change?",
          "a": "It shows the RLHF optimum has a closed form in the reward, so you can substitute it and optimize preferences directly on the policy. No reward model, no sampling loop, no value network."
        },
        {
          "q": "Is DPO strictly better?",
          "a": "No — simpler and much cheaper, but it trains only on the fixed preference dataset. PPO generates fresh samples and gets feedback on its CURRENT behaviour, which matters as the policy moves away from the data."
        },
        {
          "q": "What is the KL leash measured against?",
          "a": "The SFT model, which is the reference policy. That model defines the region where the reward model's judgements are trustworthy."
        },
        {
          "q": "Whose preferences does 'aligned' mean?",
          "a": "The annotators'. The reward model is a model of a specific labelling population under specific instructions, so alignment is relative to them and inherits their biases."
        }
      ],
      "standard": [
        {
          "q": "Explain reward overoptimization and how you would detect and control it.",
          "a": "The reward model is a learned proxy for human judgement, fitted on a finite sample of comparisons drawn from a particular distribution of outputs. Optimizing against it hard means searching for inputs that maximize the proxy, and beyond some point the highest-scoring outputs are ones where the proxy and the truth have come apart — the classic Goodhart shape. What makes it concrete rather than philosophical is that it is measurable: Gao et al. showed true quality, evaluated by a gold reward model or by humans, rises and then FALLS as optimization pressure increases, while the proxy reward rises monotonically the whole way. So the curve you can see and the curve you care about diverge, and the visible one keeps looking better. Two consequences follow for practice. First, model selection on final reward is a procedure that reliably chooses the worst model, and it looks exactly like ordinary hyperparameter tuning while doing so — this is the trap, because reward curves are what the training loop plots. You need a held-out measurement of the thing you actually want: human evaluation, a genuinely independent judge, or a downstream task metric. Second, the control knob is the KL coefficient, and the useful way to think about it is that KL from the reference measures how far you have travelled from the region where the proxy was validated. Plotting true quality against sqrt(KL) rather than against training step is the diagnostic, because it shows the turn directly, and Gao's scaling analysis found a bigger reward model moves the peak further out without removing it.",
          "deepDive": {
            "q": "Does a better reward model solve it?",
            "a": "It postpones it. Scaling the reward model and its data pushes the turnover to a higher KL and a higher achievable quality, but the shape is unchanged — every finite proxy is exploitable given enough optimization pressure. That is why the KL constraint is structural rather than a temporary crutch. It is also why inference-time selection is interesting by contrast: best-of-n draws from the base policy's own support, so it is bounded by what that policy can produce, whereas policy optimization moves the distribution itself and is not bounded that way."
          }
        },
        {
          "q": "Walk through the PPO objective and say why each piece is there.",
          "a": "The starting point is the policy-gradient estimator, which is on-policy: the gradient is only valid for data collected under the current policy, so a batch is used once and thrown away, and a large step can move the policy somewhere the estimator says nothing about. PPO makes multiple epochs on one batch safe. Define the ratio r = pi_theta(a|s) / pi_old(a|s) — how much more likely the current policy is to take the action than the policy that collected it — and the surrogate objective is min(r * A, clip(r, 1-eps, 1+eps) * A). Take the two cases. With A positive you want to increase r, and the clip caps the benefit at 1+eps, so there is no incentive to push far beyond it. With A negative you want to decrease r, and the clip floors it at 1-eps. The MIN is what makes this correct rather than merely bounded, and it is the part most often stated wrongly: if the ratio has already moved to the wrong side — a positive advantage with r below 1-eps, which happens after several epochs on the same batch — plain clipping would flatten the gradient and leave the policy stuck there permanently. The min keeps that branch unclipped so the update can pull it back. On top of that sits a value-function loss for the baseline, and an entropy bonus to slow premature collapse to a deterministic policy. In the RLHF setting there is one addition: a per-token KL penalty against the reference model, either folded into the reward or applied directly, which is what bounds the distributional distance the whole procedure is allowed to travel.",
          "deepDive": {
            "q": "How much of PPO's performance is the objective?",
            "a": "Less than the paper's framing implies. Engstrom et al. ablated the implementation details — observation and reward normalization, advantage normalization, orthogonal initialization, learning-rate annealing, gradient clipping — and found they account for much of the benchmark gain attributed to the clipped objective, to the point that a well-tuned vanilla policy gradient with those details closes most of the gap. The honest reading is that PPO is a strong, robust recipe rather than a single decisive idea, which is a useful thing to be able to say without dismissing it."
          }
        },
        {
          "q": "Compare RLHF and DPO. When would you choose each?",
          "a": "DPO starts from a derivation rather than an approximation. The KL-constrained RLHF objective has a known optimal policy — proportional to the reference policy times the exponentiated reward — and inverting that expresses the reward in terms of the optimal and reference policies. Substituting into the Bradley-Terry preference likelihood gives a loss over the policy alone, and crucially the per-prompt partition function CANCELS, which is exactly the shift-invariance the reward model already had. So DPO optimizes the same objective with the reward model implicit. The practical consequences are large: no reward model to train, no sampling loop, no value network, so roughly a third of the memory and a much simpler pipeline, and it is stable in a way PPO is not. What you lose is the online loop. DPO trains on a FIXED preference dataset collected from some other policy, so as your policy improves it is being corrected by comparisons that are increasingly off-distribution — you never get feedback on what the current model actually does. PPO regenerates samples each iteration and scores them, so the feedback tracks the policy. That gap is why the strongest systems tend to use online or iterated methods, and why iterative DPO — regenerate, re-label with a judge or humans, retrain — exists as the middle ground. For a team without a large annotation pipeline, DPO on a good public preference set is the sensible default; for a frontier system with humans in the loop, the online methods still win."
        },
        {
          "q": "How would you train a reward model well?",
          "a": "The reward model is the component whose failures are hardest to see, so most of the effort is in evaluation and data rather than architecture. Architecturally it is the policy model with a scalar head, initialized from the SFT checkpoint, trained with the Bradley-Terry loss on pairs. The data decisions dominate. Collect comparisons on outputs from the policy you intend to optimize, since a reward model trained on other models' outputs is off-distribution exactly where it will be queried. Get multiple annotators per pair and measure their agreement, because inter-annotator agreement is the ceiling on what the model can learn and a reward model reporting 75% accuracy against annotators who agree with each other 70% of the time is near-saturated, not mediocre. Write the instructions carefully and treat them as part of the artifact: 'which is better' invites annotators to reward length and confidence, and the length bias in particular is strong enough that a reward model can end up largely measuring output length unless you control for it — checking the correlation between assigned reward and token count is a one-line diagnostic that catches this. For evaluation, hold out comparisons and report accuracy, but also check calibration of the implied preference probability, and test on deliberately adversarial pairs — verbose-but-wrong versus terse-but-right — since that is the failure mode that propagates directly into the policy. Ensembling several reward models and using the mean or the pessimistic minimum reduces exploitability meaningfully, because the policy has to fool all of them at once."
        },
        {
          "q": "You are asked whether RLHF makes a model 'safe'. How do you answer?",
          "a": "By being precise about what it does and does not establish. What it does: it aligns behaviour to the preferences of the annotation population, under the instructions they were given, on the distribution of prompts they saw. That is genuinely valuable and it is a narrower claim than 'safe'. The gaps worth naming, in order of how often they are missed. The reward model is a proxy, so the safety property holds where the proxy is valid and the KL leash is what keeps you there — a system that has drifted far from its reference has left the region where any of this was checked. The preferences are those of a specific group, so 'aligned' inherits their composition and their blind spots, and that is a sociotechnical fact rather than a technical shortfall. Optimizing human approval is not the same as optimizing truth: people prefer confident, fluent, agreeable answers, so sycophancy is a predicted consequence of the objective rather than a surprising bug, and it has been measured. Coverage is a red-teaming question, not a training one — the policy is safe on what was tested, and a passing evaluation is a floor rather than a proof. And none of it addresses capability misuse, since a more helpful model is more helpful for everything. The constructive version of the answer is that RLHF is one layer, it should be reported with its reference class — which annotators, which prompts, which KL — and it belongs in a stack with red-teaming, guardrails, monitoring and an incident path rather than being asked to carry the safety case alone."
        },
        {
          "q": "What would you monitor during an RLHF run?",
          "a": "Five things, and the first is the one people plot last. KL from the reference policy, per token and cumulative, because it is the coordinate everything else should be read against — reward at a given KL is meaningful, reward at an unstated KL is not. Then the reward itself, understood as the proxy and never as the objective; a reward curve rising while KL climbs steeply is the signature of overoptimization in progress rather than of progress. Then output length, since length correlates with reward in most preference datasets and a run that is mostly getting longer is a run that is mostly exploiting a bias — plotting mean tokens alongside reward makes this obvious and it is very commonly the actual explanation for an apparent gain. Then entropy or a diversity proxy, because collapse to a narrow set of phrasings is a common failure that a reward curve cannot see. And finally a held-out qualitative evaluation on a fixed prompt set at every checkpoint, ideally by humans and at minimum by an independent judge with position bias controlled by swap-averaging — this is the only measurement that can detect the divergence between proxy and truth, and it is the one that gets cut for cost. The standard PPO diagnostics still apply underneath: clip fraction, approximate KL between successive policies, value-function explained variance and gradient norms will tell you whether the optimizer is healthy, but none of them tells you whether the thing being optimized is still the thing you want."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Bradley-Terry reward loss",
        "back": "-log sigmoid(r(chosen) - r(rejected)). Only the difference is supervised, so the reward is identified up to a per-prompt constant."
      },
      {
        "type": "intuition",
        "front": "What the KL penalty really is",
        "back": "A validity constraint, not a regularizer. The reward model is only trustworthy near the distribution it was fitted on; KL measures how far you have left it."
      },
      {
        "type": "formula",
        "front": "PPO clipped objective",
        "back": "min(rA, clip(r, 1-eps, 1+eps)A) with r the probability ratio to the collecting policy. The min is what makes it pessimistic."
      },
      {
        "type": "intuition",
        "front": "Why the MIN and not just a clamp",
        "back": "A positive advantage with r below 1-eps would have zero gradient under plain clipping and stay stuck. The min leaves that branch unclipped so it can recover."
      },
      {
        "type": "definition",
        "front": "Reward overoptimization",
        "back": "True quality rises then FALLS with optimization pressure while the proxy rises monotonically. Measurable, not philosophical — plot quality against sqrt(KL)."
      },
      {
        "type": "formula",
        "front": "The DPO substitution",
        "back": "The KL-constrained optimum gives the reward in terms of the optimal and reference policies; substituting into Bradley-Terry cancels the partition function."
      },
      {
        "type": "intuition",
        "front": "What DPO gives up",
        "back": "The online loop. It trains on a fixed preference set, so it never gets feedback on what the CURRENT policy does. Hence iterative DPO."
      },
      {
        "type": "intuition",
        "front": "Best-of-n vs policy optimization",
        "back": "Best-of-n is bounded by the base policy's support and rises monotonically; policy optimization moves the distribution itself and is not bounded that way."
      },
      {
        "type": "pitfall",
        "front": "Selecting on final reward",
        "back": "Reliably chooses the worst model, and looks exactly like ordinary hyperparameter tuning. Reward curves are what the training loop plots."
      },
      {
        "type": "pitfall",
        "front": "Reward-length correlation",
        "back": "Preference data rewards length, so a reward model can largely measure token count. Correlating reward with length is a one-line check that catches it."
      },
      {
        "type": "pitfall",
        "front": "Quoting reward without KL",
        "back": "Reward at a given KL is meaningful; reward at an unstated KL is not. KL is the coordinate everything else should be read against."
      },
      {
        "type": "pitfall",
        "front": "Crediting PPO's clipped objective",
        "back": "Engstrom et al.: normalization, initialization and annealing details account for much of the benchmark gain. A robust recipe, not a single decisive idea."
      }
    ],
    "refs": [
      {
        "title": "Ouyang et al. (2022) — Training Language Models to Follow Instructions with Human Feedback (InstructGPT)",
        "url": "https://arxiv.org/abs/2203.02155"
      },
      {
        "title": "Schulman et al. (2017) — Proximal Policy Optimization Algorithms",
        "url": "https://arxiv.org/abs/1707.06347"
      },
      {
        "title": "Gao, Schulman & Hilton (2022) — Scaling Laws for Reward Model Overoptimization",
        "url": "https://arxiv.org/abs/2210.10760"
      },
      {
        "title": "Rafailov et al. (2023) — Direct Preference Optimization",
        "url": "https://arxiv.org/abs/2305.18290"
      },
      {
        "title": "Engstrom et al. (2020) — Implementation Matters in Deep RL: A Case Study on PPO and TRPO",
        "url": "https://arxiv.org/abs/2005.12729"
      }
    ],
    "demos": []
  }
};
