// GENERATED from content/lessons/fine-tuning/instruction-tuning.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/fine-tuning/instruction-tuning/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "instruction-tuning": {
    "level": "core",
    "body": {
      "intuition": [
        "A pretrained language model predicts the next token. Ask it a question and a plausible continuation is another question, because that is what documents containing questions look like. Instruction tuning fixes this with the least exotic technique available: supervised next-token prediction on (instruction, response) pairs, with the loss computed only over the response. That is all supervised fine-tuning is. The interesting part was never the objective - it is what the data does.",
        "Two findings define the subject and they point in opposite directions. FLAN and T0 showed that instruction-tuning on a large MIXTURE of tasks produces zero-shot generalization to task types held out of training - the model learns 'follow the instruction' as a skill rather than learning the tasks. FLAN also found this was scale-dependent: below roughly 8B parameters, instruction tuning HURT held-out zero-shot performance, and the benefit emerged only at much larger scale. Then LIMA went the other way. One thousand carefully curated examples, no reinforcement learning at all, and the resulting model was competitive with heavily RLHF-trained systems in human preference comparisons. Its authors proposed the Superficial Alignment Hypothesis: essentially all knowledge and capability is acquired during pretraining, and alignment merely teaches the model which subdistribution of formats to use when interacting with users. If that is true - and a thousand examples being enough is strong evidence for it - then SFT is not teaching, it is SELECTING.",
        "Which sets up the finding that makes this lesson the module's spine in its sharpest form. Gudibande et al. fine-tuned open models on outputs from a much stronger proprietary model and evaluated two ways. Crowdworkers rated the imitation models as roughly competitive with the target - and targeted capability benchmarks showed little improvement. The models had learned the STYLE of the stronger model: its confident register, its formatting, its structure, its length. They had not acquired its capabilities, and human preference could not tell the difference, because style is what human preference measures on a short comparison. Name the proxy: for instruction tuning the proxy is a preference judgment, from a human or an LLM judge, and it is systematically confounded by exactly the surface properties that SFT is best at teaching. That is not a subtle bias. It means the standard evaluation for this method is most sensitive precisely where the method is most likely to be fooling you."
      ],
      "math": [
        {
          "h": "The SFT objective and the mask that decides what you trained",
          "paras": [
            "Standard cross-entropy over the response tokens only. Including the prompt tokens in the loss trains the model to GENERATE instructions, which is a different task and dilutes the signal you wanted.",
            "The end-of-sequence token being inside the sum is not a detail. If it is masked out or absent from the template, the model never learns to stop, and it will generate until it hits the length limit on every request."
          ],
          "tex": "\\mathcal{L}_{\\text{SFT}} = -\\sum_{t=1}^{|y|} \\log p_\\theta\\!\\left(y_t \\mid x,\\, y_{<t}\\right), \\qquad \\text{mask}_t = \\mathbb{1}[\\,t \\in \\text{response} \\cup \\{\\text{EOS}\\}\\,]",
          "texNote": "In multi-turn data the mask is per-turn: every assistant turn contributes, every user turn does not, and the whole conversation is one sequence so later turns condition on earlier ones. Getting this wrong is the most common silent bug in SFT pipelines - the loss looks reasonable either way, and the symptom appears only in generation."
        },
        {
          "h": "Why multi-task instruction tuning generalizes",
          "paras": [
            "The FLAN mechanism. Pretraining gives a model that continues documents. Instruction tuning on many task types makes the INSTRUCTION itself the variable being conditioned on, so the model learns a mapping from instruction to behaviour rather than a set of behaviours.",
            "The regime caveat is the interesting part: this only pays off at sufficient scale. Below roughly 8B, FLAN found instruction tuning DEGRADED held-out zero-shot performance - the model has enough capacity to fit the training tasks but not enough to abstract the skill from them."
          ],
          "tex": "\\mathbb{E}_{\\text{tasks } \\mathcal{T}} \\big[\\mathcal{L}(\\theta; \\mathcal{T})\\big] \\;\\longrightarrow\\; p_\\theta(y \\mid \\underbrace{i}_{\\text{instruction}}, x) \\quad \\text{generalizes to } i \\notin \\mathcal{T}_{\\text{train}}",
          "texNote": "Read it as meta-learning across task descriptions. The diversity of task TYPES matters more than the number of examples per type - which is why FLAN's ablations show adding task clusters helps and adding examples within a cluster saturates quickly, and why LIMA's thousand diverse examples can outperform tens of thousands of homogeneous ones."
        },
        {
          "h": "Length is a confound in every preference measurement you will make",
          "paras": [
            "Both human raters and LLM judges prefer longer responses at equal quality, and SFT readily learns to be longer. So any preference-based comparison of an instruction-tuned model against its base is measuring a mixture of quality and verbosity, with no way to separate them from the aggregate score."
          ],
          "tex": "\\Pr[\\,y_A \\succ y_B\\,] \\;=\\; f\\big(\\underbrace{q(y_A) - q(y_B)}_{\\text{quality}},\\; \\underbrace{|y_A| - |y_B|}_{\\text{length}},\\; \\underbrace{\\text{style}}_{\\text{register, format}}\\big)",
          "texNote": "The practical instruction: report the mean output length of every model in any preference table, and if the winner is substantially longer, the comparison is not yet interpretable. Length-controlled comparison - matching or regressing out length - is the minimum fix, and it routinely removes a large share of an apparent win."
        }
      ],
      "code": [
        {
          "h": "Building an SFT example, where the bugs live",
          "paras": [
            "Three things go wrong here and all of them are silent: the loss mask, the EOS token, and the chat template. None of them makes training fail; each of them makes the resulting model wrong in a specific way."
          ],
          "code": "def build_example(tokenizer, messages):\n    \"\"\"messages = [{'role': 'user'|'assistant', 'content': ...}, ...]\"\"\"\n    ids, labels = [], []\n    for m in messages:\n        # USE THE MODEL'S OWN TEMPLATE. Special tokens, role markers and\n        # whitespace must match pretraining/post-training exactly - a\n        # hand-rolled '### Assistant:' format on a model trained with ChatML\n        # is a distribution mismatch you will not see in the loss.\n        seg = tokenizer.apply_chat_template([m], tokenize=True,\n                                            add_generation_prompt=False)\n        ids += seg\n        if m[\"role\"] == \"assistant\":\n            labels += seg                      # train on assistant turns\n        else:\n            labels += [-100] * len(seg)        # MASK user/system turns\n    ids.append(tokenizer.eos_token_id)\n    labels.append(tokenizer.eos_token_id)      # <- TRAIN ON EOS, always\n    return {\"input_ids\": ids, \"labels\": labels}\n\n# THE THREE SILENT FAILURES:\n#\n# 1. NO MASK (loss over prompt tokens too). You are training the model to\n#    generate instructions as well as answer them. Training loss looks fine;\n#    quality is diluted, and on templated prompts the model wastes capacity\n#    learning boilerplate it will never need to produce.\n#\n# 2. EOS MASKED OR ABSENT. The model never learns to stop. It generates until\n#    the length cap on every single request. Extremely common, trivially\n#    fixed, and it will not show up until you generate.\n#\n# 3. WRONG TEMPLATE. Silent distribution mismatch. The model works, somewhat,\n#    and is worse than it should be for reasons no metric names.",
          "caption": "The objective is ordinary cross-entropy; the pipeline is where SFT goes wrong. All three failures leave the training loss looking healthy and only surface at generation time, which is why they survive into production."
        },
        {
          "h": "The evaluation that separates style from capability",
          "paras": [
            "Gudibande et al.'s design, and the single most useful experimental pattern in this lesson. Two evaluations of the same models that disagree, where the disagreement is the result."
          ],
          "code": "# TRAIN: fine-tune an open model on outputs sampled from a much stronger model.\n# EVALUATE TWICE:\n#\n#   (A) PREFERENCE - crowdworkers or an LLM judge compare responses.\n#       -> imitation models rated roughly COMPETITIVE with the target.\n#\n#   (B) TARGETED CAPABILITY - benchmarks with checkable answers.\n#       -> little improvement over the base model.\n#\n# THE READING: the imitation learned the target's STYLE - register, format,\n# confidence, structure, length - and not its capability. Preference judging\n# on short comparisons is largely a style measurement, so it could not tell.\n\n# THE MINIMUM DIAGNOSTIC SUITE I WOULD RUN ON ANY SFT MODEL:\nreport = {\n    \"preference_vs_base\":  win_rate(judge, sft, base),      # the flattering one\n    \"mean_output_tokens\":  mean_len(sft), mean_len(base),   # the confound\n    \"exact_answer_tasks\":  accuracy(sft, checkable_bench),  # capability\n    \"held_out_capability\": capability_suite(sft, base),     # forgetting\n    \"format_violations\":   invalid_rate(sft, schema_bench), # what SFT does teach\n    \"refusal_rate\":        refusals(sft, base),             # sycophancy drift\n}\n# If preference_vs_base is up, mean_output_tokens is up 40%, and\n# exact_answer_tasks is flat, you have reproduced the imitation result and\n# you should say so rather than ship it.",
          "caption": "Two evaluations that disagree, where the disagreement IS the finding. Preference win-rate rose while checkable capability did not, because a short preference comparison measures style - which is exactly what SFT is best at teaching."
        }
      ],
      "useCases": [
        "Turning a base model into an assistant at all - the first and largest behavioural change any deployed LLM undergoes, and the step without which the model answers a question with another question.",
        "Teaching format and protocol adherence: JSON schemas, tool-call syntax, citation style, a fixed response structure. This is where SFT is unambiguously the right tool, because the capability exists and only the output convention is missing.",
        "Domain specialization on top of a strong base - support responses, clinical note structure, legal drafting conventions - where a few thousand curated in-house examples teach the house style far more reliably than any prompt.",
        "Producing the starting policy for preference optimization. Every RLHF and DPO pipeline begins from an SFT checkpoint, because both need a policy that already produces plausible responses before preferences can meaningfully rank them."
      ],
      "pitfalls": [
        "Judging SFT by preference win-rate alone. Gudibande et al. showed imitation models rated competitive with a far stronger target while showing little gain on checkable benchmarks - preference judging on short comparisons measures style, and style is precisely what SFT teaches most readily.",
        "Not reporting output length. Human and LLM judges both prefer longer responses at equal quality, and SFT reliably makes models longer. A win-rate table without a length column is not yet interpretable; length-controlled comparison often removes much of the apparent gain.",
        "Computing the loss over prompt tokens. You are training the model to generate instructions alongside answering them, which dilutes the signal and wastes capacity on template boilerplate. Mask everything that is not an assistant turn.",
        "Masking or omitting the EOS token. The model never learns to stop and generates to the length cap on every request. It is the most common SFT bug, it is invisible in the training loss, and it takes one line to fix.",
        "Using a hand-rolled chat template. Special tokens, role markers and whitespace must match what the model was trained with; a plausible-looking custom format is a silent distribution mismatch that degrades quality for reasons no metric will name.",
        "Assuming more data is better. LIMA reached competitive human-preference results with 1,000 curated examples, and filtering work has repeatedly found that aggressively pruning a large instruction set to a small high-quality subset IMPROVES the result. Diversity of task type matters more than volume.",
        "Training on outputs from a stronger model and reporting the preference win as capability transfer. That is the imitation result exactly. If you distil, evaluate on checkable tasks and say plainly what did and did not move."
      ],
      "connections": [
        {
          "ref": "fine-tuning/reward-modeling",
          "text": "SFT is step one of the alignment stack and the reward model is step two. The reason to go further is that SFT can only imitate demonstrations, and there is no demonstration for 'this response is better than that one' - which is the information preferences carry and imitation cannot."
        },
        {
          "ref": "llm-systems/distillation",
          "text": "Training on a stronger model's outputs is distillation, and the imitation result is a precise statement of when it fails: matching output distributions on the sampled distribution transfers surface behaviour reliably and capability only where the student already had the substrate."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "This lesson's failure is an evaluation failure. Judge length bias, position bias, and self-preference are the instruments' properties, and an instruction-tuning result is only as trustworthy as the scrutiny applied to them."
        },
        {
          "ref": "fine-tuning/full-fine-tuning",
          "text": "The forgetting question in its most consequential form: instruction tuning changes behaviour globally, so the capability suite from that lesson must be run before and after, and 'it got better at instructions' does not answer it."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "The Superficial Alignment Hypothesis is a claim about what alignment can and cannot do. If alignment selects a format distribution rather than installing values, then behavioural evaluation of a fine-tune is measuring the selected surface, not the underlying model."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is supervised fine-tuning?",
          "a": "Standard next-token cross-entropy on (instruction, response) pairs, with the loss masked to the response tokens. The objective is ordinary; the data is the interesting part."
        },
        {
          "q": "Why mask the prompt tokens out of the loss?",
          "a": "Otherwise you train the model to generate instructions as well as answer them, diluting the signal and spending capacity on template boilerplate it will never need to produce."
        },
        {
          "q": "What happens if you do not train on the EOS token?",
          "a": "The model never learns to stop and generates to the length cap on every request. Invisible in the training loss, obvious the first time you generate."
        },
        {
          "q": "What did FLAN show?",
          "a": "Instruction-tuning on a large mixture of task types produces zero-shot generalization to held-out task types - the model learns instruction-following as a skill rather than the individual tasks."
        },
        {
          "q": "What is FLAN's scale caveat?",
          "a": "Below roughly 8B parameters, instruction tuning HURT held-out zero-shot performance. The benefit emerged only at much larger scale."
        },
        {
          "q": "What is LIMA's result?",
          "a": "1,000 carefully curated examples with no reinforcement learning produced a model competitive with heavily RLHF-trained systems in human preference comparisons."
        },
        {
          "q": "What is the Superficial Alignment Hypothesis?",
          "a": "Knowledge and capability are acquired almost entirely in pretraining; alignment teaches the model which subdistribution of formats to use with users. SFT selects rather than teaches."
        },
        {
          "q": "What did Gudibande et al. find?",
          "a": "Models fine-tuned on a stronger model's outputs were rated competitive by crowdworkers but showed little gain on targeted capability benchmarks. They imitated style, not capability."
        },
        {
          "q": "Why is response length a problem in evaluation?",
          "a": "Human and LLM judges prefer longer responses at equal quality, and SFT reliably increases length. Any preference table without a length column is confounded."
        },
        {
          "q": "Why does the chat template matter?",
          "a": "Special tokens, role markers and whitespace must match what the model was trained with. A plausible-looking custom format is a silent distribution mismatch."
        },
        {
          "q": "How is the loss masked in multi-turn data?",
          "a": "Per turn: every assistant turn contributes to the loss, every user and system turn is masked, and the whole conversation is one sequence so later turns condition on earlier ones."
        },
        {
          "q": "Why does every RLHF pipeline start from an SFT checkpoint?",
          "a": "Preference methods rank responses, so the policy must already generate plausible ones. Preferences over incoherent samples carry almost no usable signal."
        }
      ],
      "standard": [
        {
          "q": "How do you handle multi-turn conversation data in SFT?",
          "a": "THE BASIC SETUP. A conversation is ONE training sequence, not a set of independent examples. Tokenize the whole thing with the model's chat template, and set the label mask per turn: every assistant turn contributes to the loss, every user and system turn is masked to -100. Because it is one sequence, later assistant turns are conditioned on all earlier context automatically, which is exactly the behaviour you want and is why you should not split a conversation into separate (context, response) rows. WHY SPLITTING IS WORSE, since people do it. Splitting an n-turn conversation into n examples means the shared prefix is re-encoded n times - so you pay roughly n times the compute for the same signal - and the earlier turns appear repeatedly across examples, which over-weights them relative to later ones. It is the same overfitting-from-repetition argument as batching K-way preference comparisons together rather than as independent pairs. THE DETAILS THAT MATTER. (1) PER-TURN TERMINATORS. Each assistant turn needs its end-of-turn token IN THE LABELS, not just one EOS at the end of the conversation. Otherwise the model learns to end conversations but not turns, and it will run on past where it should have stopped. This is the multi-turn version of the EOS bug and it is easy to miss because single-turn generation looks fine. (2) TRUNCATION. Long conversations exceed the context window, and naive right-truncation cuts off the last assistant turn - so your longest, richest examples contribute a truncated response and teach the model that responses do not end. Truncate from the LEFT, dropping the oldest turns, and keep the final assistant turn intact. (3) SYSTEM PROMPTS. Decide deliberately whether to vary them. Training with one fixed system prompt makes the model brittle to a different one at inference; varying them teaches the model to actually condition on the system prompt, which is usually what you want. (4) PACKING. If you concatenate multiple conversations into one sequence for efficiency, you must prevent cross-contamination - either block-diagonal attention masking, or accept the small leakage, but decide rather than discover. WHAT TO WATCH IN EVALUATION. Multi-turn models fail differently: they lose track of earlier constraints, they repeat themselves across turns, and they degrade as the conversation lengthens. Aggregate quality on single-turn prompts will not show any of this. I would evaluate by TURN INDEX - quality at turn 1 versus turn 5 - which is one grouping and immediately reveals whether the model degrades with depth. THE DATA POINT PEOPLE MISS. If your product is multi-turn, multi-turn data must be in the training set from the start. A model trained only on single turns handles follow-ups poorly, and retrofitting it later is harder than including them, because the single-turn behaviour is already well-established by then."
        },
        {
          "q": "Explain instruction tuning: what it does, what it cannot do, and how you would evaluate it.",
          "a": "WHAT IT IS. Supervised next-token prediction on (instruction, response) pairs with the loss masked to the response. Mechanically it is the most ordinary technique in this module; everything interesting is in the data and the evaluation. WHAT IT ACHIEVES. The base model continues documents, so it answers a question with another question. Instruction tuning changes the model's mode of interaction. FLAN and T0 showed the more surprising version: training on a large MIXTURE of task types produces zero-shot generalization to task types held out entirely, because the instruction becomes the variable being conditioned on and the model learns a mapping from instruction to behaviour rather than a set of behaviours. Diversity of task type turns out to matter more than volume per type. WHAT IT CANNOT DO, which is the substance. LIMA's result - one thousand curated examples, no RL, competitive with RLHF'd systems on human preference - motivated the Superficial Alignment Hypothesis: capability is acquired in pretraining, and alignment selects which format subdistribution the model uses. If a thousand examples suffice, the fine-tune cannot be installing much. Gudibande et al. then tested the sharp version: fine-tune an open model on a much stronger model's outputs, and evaluate two ways. Crowdworkers rated the imitations roughly competitive with the target; targeted capability benchmarks barely moved. The imitations acquired the target's register, formatting, structure and confidence - and none of its capability. HOW I WOULD EVALUATE IT, which follows directly from that. The default instrument is a preference win-rate, and it is confounded precisely where SFT is strongest, so I would never report it alone. My minimum table: (1) preference win-rate against the base, with (2) MEAN OUTPUT LENGTH for every model beside it, because judges prefer length and length-controlled comparison routinely removes much of an apparent win; (3) checkable-answer benchmarks, where style cannot help, as the capability column; (4) a pre-declared capability suite run on the base BEFORE fine-tuning, to price the forgetting; (5) format-violation and refusal rates, which measure what SFT actually teaches and which no accuracy metric registers. THE DECISION RULE. If preference is up, length is up 40%, and checkable accuracy is flat, I have reproduced the imitation result and should say so rather than ship it as a capability gain. If checkable accuracy moves, something real happened. THE ONE-LINE SUMMARY I WOULD GIVE. Instruction tuning reliably teaches behaviour and rarely teaches capability, and the standard evaluation is most sensitive to behaviour - so the method and its metric are aligned with each other rather than with what you wanted.",
          "deepDive": {
            "q": "How much do you believe the Superficial Alignment Hypothesis? What evidence would change your mind?",
            "a": "I believe a strong version of it for BEHAVIOUR and a weak version for capability, and the distinction is where the interesting evidence sits. THE CASE FOR. LIMA's headline is hard to explain otherwise: a thousand examples cannot install knowledge, and yet the resulting model is preferred comparably to systems trained with orders of magnitude more alignment data and a full RL stack. Data-filtering work points the same way - pruning a large instruction set to a small high-quality subset often IMPROVES results, which is the signature of a selection process rather than a learning one. The imitation result is the third leg: style transferred, capability did not. And mechanistically it is plausible, since pretraining sees trillions of tokens and SFT sees millions, so any account where SFT installs capability has to explain how six orders of magnitude less data does it. THE CASE AGAINST, and it is real. First, LIMA was evaluated primarily on human preference over open-ended prompts - which is precisely the instrument Gudibande showed is style-sensitive, so the two results are partly in tension: you cannot cite LIMA's preference win as evidence about alignment while discounting the imitation models' preference wins as style. Second, the scaling of RLHF and of large-scale post-training since then is evidence against the strong version. If alignment were purely superficial, spending enormous effort on post-training would not keep producing capability gains - and it does, particularly on reasoning, where RL with verifiable rewards demonstrably improves checkable performance rather than register. Third, LIMA is a claim about a strong base model; on a weaker base, more data plainly helps more. WHAT I ACTUALLY THINK. The hypothesis is close to true for the FORMAT-AND-REGISTER component of alignment, which is what SFT does, and false as a general claim about post-training, which now includes methods that optimize against checkable outcomes rather than imitating demonstrations. The distinction that resolves it is IMITATION versus OPTIMIZATION: imitating demonstrations can only select from what the base can already produce, because the target is a sample the base could have generated. Optimizing against a signal that is not a demonstration - a verifier, a reward model, a preference - can move the model somewhere it would not have gone, and that is not superficial. WHAT WOULD CHANGE MY MIND. Toward the strong version: a demonstration that RL post-training gains on checkable reasoning benchmarks are reproducible by SFT on a small curated set of the same tasks. Away from it: a careful study showing SFT alone, on a modest dataset, produces gains on tasks the base model provably fails at under any prompting or sampling budget - because the superficial reading predicts that heavy sampling from the base should surface the capability if it is there. That second experiment is cheap and I would want it run before accepting either version."
          }
        },
        {
          "q": "Design an instruction-tuning dataset for a domain assistant. What matters most?",
          "a": "DIVERSITY OF TASK TYPE FIRST, VOLUME LAST - that ordering is the substance of the answer and it inverts most people's instinct. WHY. FLAN's ablations show adding task CLUSTERS helps generalization while adding examples within a cluster saturates quickly, and LIMA showed a thousand diverse curated examples beating far larger homogeneous sets. The model is learning the instruction-to-behaviour mapping, and every new task type is a new data point about that mapping while every extra example within a type is a repeat. THE DESIGN, in order. (1) ENUMERATE THE TASK TYPES the assistant must handle, from real usage if it exists and from the product spec if it does not. Aim for breadth: question answering, summarization, extraction, refusal, clarification requests, multi-turn follow-ups, error handling. Cover the shapes, then fill them. (2) COVER THE HARD CASES DELIBERATELY, especially the ones with no good answer. Ambiguous requests that should trigger a clarifying question. Out-of-scope requests that should be declined. Requests where the honest answer is 'I do not know' - which the model will never learn unless it is demonstrated, because every other example in the set shows a confident answer, and that is a large part of where fine-tuning-induced hallucination comes from. (3) FIX THE RESPONSE CONVENTIONS and enforce them mechanically: length, structure, citation format, refusal wording. SFT learns surface conventions extremely reliably, so being inconsistent here wastes the method's main strength. (4) MULTI-TURN FROM THE START if the product is multi-turn. A model trained only on single turns handles follow-ups poorly, and retrofitting is harder than including them. (5) QUALITY OVER QUANTITY, enforced by review. A few hundred examples an expert has actually read beats tens of thousands scraped. If I generate synthetic data, I filter it hard and I have humans review a sample - and I remember that filtering a large set down usually improves results rather than merely saving compute. (6) MIX IN GENERAL DATA, a few percent, to limit forgetting. This is cheap and it is standard practice in production SFT for a reason. WHAT I WOULD NOT DO. Scrape a large set of model-generated responses from a stronger model and call it a domain dataset. That reproduces the imitation setup exactly: the style will transfer, the domain competence will not, and my preference-based evaluation will tell me it worked. THE EVALUATION BUILT ALONGSIDE, not after. A held-out set by TIME rather than at random, since near-duplicates are endemic in domain corpora and a random split inflates everything. Checkable tasks wherever the domain admits them. And the capability suite on the base model before I start, because after training it is too late to establish the baseline."
        },
        {
          "q": "What is the relationship between SFT, distillation, and the imitation problem?",
          "a": "THEY ARE THE SAME MECHANISM SEEN AT THREE DISTANCES, and the imitation result is what happens when you push the mechanism past what it can carry. SFT AS DISTILLATION. When the responses in your SFT set come from a stronger model, you are doing distillation: minimizing cross-entropy between the student and samples from the teacher. Classical distillation matches full output distributions with a temperature; sequence-level distillation on sampled outputs is the coarser version everyone actually runs. So SFT-on-model-outputs is not LIKE distillation, it IS distillation with hard targets. WHAT TRANSFERS AND WHAT DOES NOT. This is the crux. Matching the teacher's output distribution on a set of prompts transfers whatever is determined by that distribution's SURFACE: register, formatting, structure, hedging, length, the shape of a good answer. It transfers capability only where the student already has the underlying substrate and merely needed to be shown which mode to use - which is the Superficial Alignment Hypothesis restated from the distillation side. Where the teacher's answer is correct for reasons the student cannot represent, the student learns the FORM of a correct answer without the computation that produces it. The predictable result is a model that sounds like the teacher and is confidently wrong more often - because it has learned the teacher's confidence, which was calibrated to the teacher's competence. GUDIBANDE'S MEASUREMENT of exactly this. Imitation models rated competitive by crowdworkers; targeted benchmarks barely moved. And they observed that scaling the imitation DATA did not close the capability gap while scaling the base model did - which is the decisive detail, because it says the bottleneck is the student's capability rather than the amount of teaching. More imitation data buys more style. WHY CLASSICAL DISTILLATION WORKS BETTER THAN THIS SUGGESTS. Two differences. It matches full distributions rather than sampled hard targets, so the student gets the teacher's uncertainty structure - the dark knowledge - not just its argmax. And it is usually applied where teacher and student share an architecture and training distribution and differ only in size, so the substrate really is there. LLM imitation typically violates both. WHAT I TAKE FROM IT PRACTICALLY. Distil for behaviour, format and style, deliberately, and expect it to work well. Do not expect to distil reasoning into a model that cannot do it. If capability transfer is the goal, the things that actually work are different in kind: training on VERIFIED outputs rather than sampled ones - rejection sampling against a checker, which is what the strongest open reasoning models do - or distilling into a student large enough to have the substrate. And whichever I do, I evaluate on checkable tasks, because the preference metric will not distinguish these cases.",
          "deepDive": {
            "q": "If imitation transfers style but not capability, why do distilled reasoning models work as well as they do?",
            "a": "Because the strongest of them are not doing imitation in the sense Gudibande tested, and the difference is precise and worth stating. WHAT CHANGED. The successful reasoning-distillation recipes train on outputs that have been VERIFIED, not merely sampled. Generate many candidate chains of thought from a strong teacher, CHECK the final answers against ground truth, keep only the correct ones, and fine-tune on those. That is rejection sampling, and it changes the objective materially: the training distribution is now the teacher's correct-answer distribution rather than its output distribution. You are no longer imitating a model, you are imitating a filtered process. WHY THAT IS DIFFERENT IN KIND. Under plain imitation, the student's target includes the teacher's errors, and - more importantly - the student cannot tell which of the teacher's confident-sounding chains actually worked, so it learns confidence uniformly. Under verified imitation, every training example is a demonstration that a particular reasoning trajectory REACHES A CORRECT ANSWER. The supervision now carries information the surface does not: it selects trajectories by outcome. That is closer to reinforcement learning with a sparse verifier than to behavioural cloning, and it is exactly the imitation-versus-optimization distinction that resolves the Superficial Alignment Hypothesis. THE SECOND DIFFERENCE: THE TARGET IS INTERMEDIATE COMPUTATION. A chain of thought is not just an answer's surface, it is the intermediate steps. Training on it teaches the student to allocate serial computation - to externalize working into tokens - which is a capability the base model has the substrate for but does not deploy by default. So this is still selection rather than installation in one sense: the capability was latent and the fine-tune taught the model to USE it. That fits the superficial hypothesis better than it first appears, and it explains the scale dependence people observe - distilling reasoning into a very small model works far less well, because the substrate genuinely is not there. THE THIRD DIFFERENCE: MEASUREMENT. Reasoning distillation is evaluated on benchmarks with checkable answers, so the metric cannot be fooled by style. That is not a property of the method, it is a property of the domain, and it is why this literature has cleaner results than the general-assistant imitation literature. Whenever the answer is checkable, the whole set of problems in this lesson shrinks. WHAT I WOULD CONCLUDE. The rule is not 'distillation does not transfer capability'. It is: imitating a SAMPLE transfers surface; imitating a VERIFIED sample transfers whatever the verification selects for; and neither installs a substrate the student lacks. If I want capability transfer, I should be asking what my filter is, not how much teacher data I have - and if I have no filter, I should expect style and evaluate accordingly."
          }
        },
        {
          "q": "Your SFT model generates until the token limit on every request. Diagnose it.",
          "a": "This is the EOS bug and it is worth walking through carefully, because the diagnosis pattern generalizes to most SFT failures - the training loss is healthy and the problem exists only in generation. THE PRIMARY CAUSE. The end-of-sequence token was not in the loss. Either it was never appended to the training targets, or it was appended to input_ids but masked out of the labels, or the chat template's terminator differs from the token the generation config stops on. In all three cases the model never receives gradient signal for 'stop here', so at inference the EOS probability stays near its pretrained baseline and never becomes the argmax. Nothing about this is visible in the loss curve: you trained a valid objective, just not the one you needed. HOW I WOULD CONFIRM IT IN TWO MINUTES. Take a training example, run a forward pass, and inspect the model's probability for the EOS token at the position where the response ends. If it is small, that is the answer. Second check: print the decoded labels for one example with the -100 positions removed, and confirm the terminator is there. Third: compare tokenizer.eos_token_id against the model's generation_config.eos_token_id - a mismatch between the template's end-of-turn token and the configured stop token produces identical symptoms and is common with models using a distinct end-of-turn marker. THE OTHER CAUSES, in order. (1) TEMPLATE MISMATCH: training with one chat format and generating with another means the model is not in the state it learned to terminate from. (2) MULTI-TURN CONCATENATION without per-turn terminators: if the whole conversation was one sequence with a single EOS at the very end, the model learned to end conversations but not turns. (3) GENERATION CONFIG: stop tokens not set, or a repetition or length penalty configured such that EOS is suppressed. (4) TRAINING DATA WITH TRUNCATED RESPONSES: if long examples were cut at max_length, the responses in the data have no natural ending, and the model correctly learned that responses do not end. This one is nastier because the fix is in the data pipeline, and it shows up as 'sometimes stops, sometimes does not' correlated with length. THE FIX AND THE PREVENTION. Append EOS to both input_ids and labels, verify the ids match the generation config, and add an assertion in the data pipeline that every example's labels end with the terminator - a two-line check that makes this class of bug impossible. MORE GENERALLY. Every SFT failure in this lesson shares a shape: the loss is a valid objective computed correctly on data that encoded the wrong thing, so training-time metrics cannot see it. The countermeasure is to GENERATE from a checkpoint early and often, on real prompts, and read the output. A five-minute generation check after the first hundred steps catches the EOS bug, the mask bug, and the template bug together, and none of them are catchable any other way."
        },
        {
          "q": "How do you know whether your fine-tune taught capability or style?",
          "a": "You separate them by CHOOSING INSTRUMENTS THAT STYLE CANNOT MOVE, and the design is straightforward once stated - the difficulty is that the default instrument is the confounded one. THE CONFOUNDED DEFAULT. A preference comparison, from humans or an LLM judge, on open-ended prompts. It is sensitive to register, formatting, structure, confidence and length - exactly the properties SFT teaches most readily. Gudibande's imitation models won on it while gaining almost nothing in capability, so a preference win is compatible with zero capability change and cannot distinguish the cases. THE INSTRUMENTS THAT CAN. (1) CHECKABLE-ANSWER TASKS: mathematics, code that runs against tests, extraction with exact-match answers, closed-book questions with unique answers. Style cannot make a wrong answer right. This is the primary capability column and it should lead the table. (2) LENGTH-CONTROLLED PREFERENCE: match or regress out response length before comparing. It routinely removes a large share of an apparent win, and what remains is more likely to be real. (3) THE PASS-AT-K DIAGNOSTIC, which is the sharpest single test. Sample k responses from the BASE model and check whether any is correct. If the base solves it at k = 50 but not at k = 1, and the fine-tune solves it at k = 1, the fine-tune taught the model to SELECT a capability it already had - real and useful, but not new capability. If the base fails at large k and the fine-tune succeeds, something genuinely changed. This directly operationalizes the Superficial Alignment Hypothesis as an experiment rather than a belief. (4) ADVERSARIAL FORMAT CONTROL: force both models into an identical output format - same length limit, same structure - and re-run the preference comparison. If the win disappears, it was style. THE CONFIRMING SIGNALS, which I would report alongside. Mean output length before and after. Format-violation rate, which should improve if SFT worked as intended. Refusal-rate drift, which detects sycophancy. Calibration - fine-tuning often makes models more confident without making them more correct, and that shows up as worse calibration at equal accuracy, which is a specific and measurable harm. HOW I WOULD SUMMARIZE THE RESULT. Two columns, always, with the honest verdict attached: 'preference up 18 points, checkable accuracy flat, mean length up 42% - this fine-tune changed style'. That sentence is more useful than any single number, it is what the data supports, and it is the kind of statement this whole module exists to make possible."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The SFT objective and its mask",
        "back": "Cross-entropy over RESPONSE tokens only: mask_t = 1[t in response or t = EOS]. Multi-turn: every assistant turn contributes, user/system turns are masked, whole conversation is one sequence."
      },
      {
        "type": "pitfall",
        "front": "The EOS bug",
        "back": "If EOS is absent from the labels (or masked, or mismatched against generation_config), the model never learns to stop and generates to the length cap every time. Invisible in the loss. Confirm by checking p(EOS) at the response end on a training example."
      },
      {
        "type": "intuition",
        "front": "FLAN's finding, and its scale caveat",
        "back": "Instruction-tuning on a MIXTURE of task types generalizes zero-shot to HELD-OUT task types. But below ~8B it HURT held-out performance - the model fits the training tasks without abstracting the skill. Diversity of task type beats volume per type."
      },
      {
        "type": "definition",
        "front": "The Superficial Alignment Hypothesis (LIMA)",
        "back": "Knowledge and capability come almost entirely from pretraining; alignment teaches which subdistribution of FORMATS to use. Evidence: 1,000 curated examples, no RL, competitive with RLHF'd systems on human preference."
      },
      {
        "type": "pitfall",
        "front": "The imitation result (Gudibande et al.)",
        "back": "Fine-tuning on a stronger model's outputs: crowdworkers rated it COMPETITIVE; targeted capability benchmarks barely moved. And scaling imitation DATA did not close the gap while scaling the BASE model did - the bottleneck is the student, not the teaching."
      },
      {
        "type": "pitfall",
        "front": "Length confounds every preference table",
        "back": "Human and LLM judges prefer longer at equal quality, and SFT reliably lengthens output. Report mean output length beside every win-rate; length-controlled comparison routinely removes much of an apparent win."
      },
      {
        "type": "intuition",
        "front": "The pass-at-k diagnostic",
        "back": "The sharpest style-vs-capability test. If the BASE solves it at k=50 but not k=1, and the fine-tune solves it at k=1, the fine-tune taught SELECTION of an existing capability. If the base fails at large k and the fine-tune succeeds, something genuinely new happened."
      },
      {
        "type": "pitfall",
        "front": "Use the model's own chat template",
        "back": "Special tokens, role markers and whitespace must match training. A hand-rolled '### Assistant:' on a ChatML model is a silent distribution mismatch - the model works somewhat and is worse for reasons no metric names."
      },
      {
        "type": "intuition",
        "front": "Why more SFT data is often worse",
        "back": "LIMA: 1,000 curated examples beat far larger sets. Filtering work repeatedly finds that pruning a large instruction set IMPROVES results. The model learns an instruction-to-behaviour MAPPING, so each new task type is a data point and each extra within-type example is a repeat."
      },
      {
        "type": "intuition",
        "front": "Imitation vs optimization",
        "back": "Imitating a SAMPLE can only select from what the base can already produce - the target is something the base could have generated. Optimizing against a signal that is not a demonstration (verifier, reward model, preference) can move the model somewhere it would not have gone."
      },
      {
        "type": "pitfall",
        "front": "Demonstrate 'I do not know'",
        "back": "If every SFT example shows a confident answer, the model learns to always answer confidently - a large part of fine-tuning-induced hallucination. Ambiguity, out-of-scope refusal, and honest uncertainty must be IN the dataset or they will not exist."
      },
      {
        "type": "intuition",
        "front": "Why distilled reasoning models work when imitation fails",
        "back": "They train on VERIFIED outputs - sample many chains, CHECK the final answers, keep only correct ones. The training distribution becomes the teacher's correct-answer distribution. That is rejection sampling, closer to RL with a sparse verifier than to behavioural cloning."
      }
    ],
    "refs": [
      {
        "title": "Wei et al. (2021), Finetuned Language Models Are Zero-Shot Learners (FLAN)",
        "url": "https://arxiv.org/abs/2109.01652"
      },
      {
        "title": "Zhou et al. (2023), LIMA: Less Is More for Alignment",
        "url": "https://arxiv.org/abs/2305.11206"
      },
      {
        "title": "Gudibande et al. (2023), The False Promise of Imitating Proprietary LLMs",
        "url": "https://arxiv.org/abs/2305.15717"
      },
      {
        "title": "Ouyang et al. (2022), Training Language Models to Follow Instructions with Human Feedback (InstructGPT)",
        "url": "https://arxiv.org/abs/2203.02155"
      },
      {
        "title": "Sanh et al. (2021), Multitask Prompted Training Enables Zero-Shot Task Generalization (T0)",
        "url": "https://arxiv.org/abs/2110.08207"
      }
    ],
    "demos": [
      "distillation",
      "dataset-distillation",
      "decoding",
      "calibration"
    ],
    "demoTitles": {
      "distillation": "Knowledge Distillation",
      "dataset-distillation": "Dataset Distillation",
      "decoding": "Decoding Strategies",
      "calibration": "Model Calibration"
    }
  }
};
