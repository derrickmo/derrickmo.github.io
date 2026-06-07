// lessons/rlhf-ppo.jsx — Module 13-08 - RLHF with PPO.
// Full on-site flagship lesson. Loaded by /learn/fine-tuning/rlhf-ppo/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. The full alignment pipeline: SFT -> reward model
// -> PPO with a KL leash, the objective, the loop, and reward hacking.

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
            A pretrained language model predicts likely text, not helpful text. Reinforcement
            learning from human feedback is how you turn the first into the second. It is a
            three-stage pipeline - supervised fine-tuning, a reward model learned from human
            preferences, then reinforcement learning that optimizes the policy against that reward,
            kept on a leash so it does not drift into nonsense.
          </P>
          <P>
            We walk the whole pipeline, focus on the PPO stage that does the alignment, write its
            objective with the all-important KL penalty, sketch the training loop, and confront
            reward hacking - the failure mode that makes the KL leash non-negotiable.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The three stages ── */}
      <LessonSection n="0" title="The Pipeline" tag="// SFT -> RM -> PPO">
        <P>
          Stage one, supervised fine-tuning: train the base model on high-quality demonstrations so
          it follows instructions at all. Stage two, the reward model: collect human comparisons of
          pairs of responses and fit a model that scores a response's quality. Stage three, PPO:
          use that reward to reinforce good responses from the SFT model.
        </P>
        <CodeBlock lang="python">{`# stage 1: pi_sft = finetune(base, demonstrations)        # instruction-following
# stage 2: r_phi  = train_reward_model(preference_pairs)  # scalar quality
# stage 3: pi     = ppo(pi_sft, r_phi, pi_ref=pi_sft)     # this lesson`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Reward model ── */}
      <LessonSection n="1" title="The Reward Model" tag="// PREFERENCES -> SCALAR">
        <P>
          You cannot write a loss for "helpful," but people can say which of two answers is better.
          The reward model learns a scalar score so that preferred answers score higher, via the
          Bradley-Terry objective.
        </P>
        <MathBlock>{`\\mathcal{L}_{\\text{RM}} = -\\log \\sigma\\big(r_\\phi(x, y_w) - r_\\phi(x, y_l)\\big)`}</MathBlock>
        <P>
          That single learned number is what the RL stage will maximize. Its quality - and its
          blind spots - become the policy's quality and blind spots. This is the lever, and also
          the liability.
        </P>
      </LessonSection>

      {/* ── Part 2 — The PPO objective ── */}
      <LessonSection n="2" title="The PPO Objective" tag="// REWARD MINUS A KL LEASH">
        <P>
          Now treat generation as a policy and maximize the reward model's score - but with a catch.
          Chase reward freely and the model will exploit the reward model's quirks, producing text
          that scores high but reads like garbage. So we subtract a penalty for drifting from the
          reference (SFT) model, measured by KL divergence.
        </P>
        <MathBlock>{`\\max_{\\pi}\\; \\mathbb{E}_{y \\sim \\pi}\\big[\\,r_\\phi(x, y)\\,\\big] - \\beta\\,\\mathrm{KL}\\big(\\pi(\\cdot|x)\\,\\|\\,\\pi_{\\text{ref}}(\\cdot|x)\\big)`}</MathBlock>
        <P>
          PPO optimizes this with its clipped surrogate, so each update stays inside a trust region
          and training does not collapse. In practice the KL term is folded into the per-token reward.
        </P>
        <CodeBlock lang="python">{`# per-token reward = sequence reward at the end, minus the KL drift each step
kl = logp_policy - logp_ref                      # per token
reward_t = -beta * kl
reward_t[-1] += r_phi(x, y)                       # add the RM score at the end
# then run PPO (clipped surrogate + GAE advantages) on these rewards`}</CodeBlock>
        <KeyInsight title="The KL leash is the whole trick">
          Without the KL penalty, PPO will happily walk the policy off a cliff to wherever the reward
          model is miscalibrated. beta sets how far the model may roam: too small and it hacks the
          reward, too large and it never improves. Tuning that leash is most of the art of RLHF.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — The loop ── */}
      <LessonSection n="3" title="The Training Loop" tag="// ROLLOUT, SCORE, UPDATE">
        <P>
          Each PPO iteration: sample completions from the current policy, score them with the reward
          model, compute KL-shaped per-token rewards and GAE advantages, then take a few clipped
          gradient steps. A value head (a critic) estimates returns to reduce variance.
        </P>
        <CodeBlock lang="python">{`for step in range(N):
    prompts = sample_prompts()
    responses, logp = policy.generate(prompts)         # rollout
    scores = reward_model(prompts, responses)          # judge
    rewards = shape_with_kl(logp, ref_logp(responses), scores, beta)
    adv = gae(rewards, value_head(responses))
    for _ in range(ppo_epochs):
        ppo_clip_update(policy, value_head, adv, logp)  # trust-region step`}</CodeBlock>
      </LessonSection>

      {/* ── Part 4 — Reward hacking ── */}
      <LessonSection n="4" title="Reward Hacking" tag="// GOODHART STRIKES">
        <P>
          The reward model is a proxy, and optimizing a proxy hard turns Goodhart's law loose: the
          measure stops measuring what you meant. RLHF policies famously learn to be verbose,
          sycophantic, or to parrot patterns the reward model over-rewards - scoring high while
          getting worse. The KL leash, a held-out true-reward check, and reward-model retraining
          are the defenses.
        </P>
        <CodeBlock lang="python">{`# watch the gap between proxy reward and a held-out human/true score
proxy = reward_model(prompts, responses).mean()   # keeps climbing
true  = human_eval(prompts, responses)            # plateaus, then falls => hacking`}</CodeBlock>
        <TryThis title="Watch the KL climb">
          Track KL divergence from the reference over training. A healthy run keeps it bounded; a
          run that is hacking shows KL shooting up as proxy reward climbs and true quality stalls.
          That divergence between the two curves is the signature of reward hacking.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You traced RLHF end to end: SFT to follow instructions, a Bradley-Terry reward model from
          human preferences, and PPO that maximizes that reward minus a KL penalty - and you saw why
          that penalty is what stands between alignment and reward hacking.
        </P>
        <P>
          RLHF aligns a model by optimizing a learned reward under a KL leash to a reference policy.
          PPO does the optimization stably; the reward model encodes human preference; the KL term
          keeps the policy from exploiting the reward model's flaws. It is powerful but finicky and
          has many moving parts - which is exactly why DPO, by folding the reward and the RL step into
          one direct preference loss, has become a popular shortcut to the same goal.
        </P>
        <Warn title="The one thing to remember">
          You are not optimizing what humans want - you are optimizing a model of what humans want.
          The KL leash is what keeps that distinction from blowing up in your face.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
