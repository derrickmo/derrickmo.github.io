// GENERATED from content/lessons/fine-tuning/adapters.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/fine-tuning/adapters/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "adapters": {
    "level": "core",
    "body": {
      "intuition": [
        "Adapters came first. Houlsby et al. inserted small bottleneck modules - down-project to a low dimension, nonlinearity, up-project back, add to the residual stream - into every transformer block, froze everything else, and reported GLUE performance within 0.4% of full fine-tuning while training 3.6% of the parameters per task. That result is two years older than LoRA and it made the same point. Since then the design space has been filled in: adapters after the FFN only rather than after both sublayers, adapters in PARALLEL to a sublayer rather than in series, learned rescaling vectors instead of matrices, and BitFit, which trains nothing but the bias terms - about 0.09% of parameters - and is still competitive on GLUE at small-to-medium data sizes.",
        "The temptation is to memorize this as a list. He et al.'s unified view is the better move: every one of these methods computes a small DELTA and adds it to some hidden state, and they differ along only three axes. WHICH representation they modify (attention output, FFN output, the keys and values). WHERE the module sits (in series inside the residual path, or in parallel beside the sublayer). And HOW the delta is composed (plain addition, scaled addition, gated). Under that view prefix tuning is a parallel adapter on attention, LoRA is a parallel adapter on a weight matrix with no nonlinearity, and the best variant the paper found was a SCALED PARALLEL ADAPTER on the FFN - a configuration nobody had proposed because it fell between the existing named methods.",
        "Now the proxy, and this lesson is where the module's discipline bites hardest. Every one of these papers reports accuracy parity with full fine-tuning on GLUE-style benchmarks. Careful head-to-head studies that tune each method properly find them broadly comparable, with reported gaps often inside hyperparameter-tuning variance. That is not a boring result - it is telling you the accuracy axis is SATURATED and therefore useless for choosing. The axes that actually separate these methods are the ones the papers mostly do not report: does the update MERGE back into the weights, or does it add sequential depth to every forward pass forever; can requests for different tasks be BATCHED into one pass; how does it behave at batch size 1, where you are latency-bound rather than throughput-bound. AdapterDrop was written because sequential adapters cost enough inference time to be worth engineering around, reporting speedups on the order of tens of percent from simply removing them from the lower layers. LoRA did not win this competition on accuracy. It won because its delta is an additive side path, and that is a structural property, not a quality one."
      ],
      "math": [
        {
          "h": "The bottleneck adapter",
          "paras": [
            "The original form. Down-project the hidden state to a bottleneck of size r, apply a nonlinearity, project back, and add to the residual - which means the module can be initialized near zero and start as the identity, the same trick LoRA uses.",
            "The parameter count is dominated by the two projections, so the bottleneck size r is the single capacity knob, exactly as rank is for LoRA."
          ],
          "tex": "h \\leftarrow h + W_{\\text{up}}\\, \\sigma\\!\\left(W_{\\text{down}}\\, h\\right), \\qquad W_{\\text{down}} \\in \\mathbb{R}^{r \\times d},\\; W_{\\text{up}} \\in \\mathbb{R}^{d \\times r} \\\\[4pt] |\\theta_{\\text{adapter}}| = 2rd + r + d \\;\\;\\text{per insertion point}",
          "texNote": "Zero-initialize W_up and the module is the identity at step 0 - the same near-identity start LoRA gets from B = 0, and for the same reason: a randomly-initialized new module attached to a pretrained one shocks it. Note what the sigma costs structurally: a nonlinearity between the projections means this delta CANNOT be folded into a linear layer, so unlike LoRA it is an extra operation in the forward pass forever."
        },
        {
          "h": "The unified view: three axes, not seven methods",
          "paras": [
            "He et al.'s reframing. Every parameter-efficient method computes a delta on some hidden representation, and the named methods are points in a three-way design space rather than distinct ideas.",
            "The payoff is predictive rather than taxonomic: once you can place a method, you can read off its serving properties. A delta computed in PARALLEL from the sublayer's input can be fused or batched; one computed in SERIES from the sublayer's output cannot, because it must wait."
          ],
          "tex": "\\Delta h = s \\cdot f\\big(\\,\\text{input}\\,\\big) \\quad\\text{parameterized by}\\quad \\begin{cases} \\textbf{target} & \\text{attn out} \\;/\\; \\text{FFN out} \\;/\\; K,V \\\\ \\textbf{position} & \\text{sequential} \\;/\\; \\text{parallel} \\\\ \\textbf{composition} & \\text{add} \\;/\\; \\text{scaled add} \\;/\\; \\text{gated} \\end{cases}",
          "texNote": "Read the named methods off the grid. Houlsby adapter: FFN and attention output, sequential, add. Prefix tuning: keys and values, parallel, gated add. LoRA: a weight matrix, parallel, scaled add, no nonlinearity. The paper's best-performing variant - scaled parallel adapter on the FFN - is a grid cell nobody had named, which is the argument for the framework."
        },
        {
          "h": "(IA)^3 and BitFit: how far down the parameter count goes",
          "paras": [
            "The extreme end of the design space, where the update is not a matrix at all. (IA)^3 learns three vectors per block that RESCALE the keys, the values, and the FFN's inner activations elementwise. BitFit learns nothing but the existing bias terms.",
            "Both are worth knowing because they bound the question: if 0.01% of parameters is competitive on a task, that task was not testing capacity, and any accuracy comparison you run on it is measuring something other than what you think."
          ],
          "tex": "\\text{(IA)}^3:\\;\\; K \\leftarrow l_k \\odot K, \\;\\; V \\leftarrow l_v \\odot V, \\;\\; h_{\\text{ffn}} \\leftarrow l_{ff} \\odot h_{\\text{ffn}} \\quad (\\sim 0.01\\% \\text{ of } \\theta) \\\\[4pt] \\text{BitFit:}\\;\\; \\text{train } \\{b\\} \\text{ only} \\quad (\\sim 0.09\\% \\text{ of } \\theta)",
          "texNote": "Both are elementwise, so like LoRA they merge: the (IA)^3 vectors fold into the adjacent weight matrices and the biases are already part of the model. That merge-ability is not a coincidence - it is what you get when the delta is a rescaling or an addition rather than a new nonlinear computation."
        }
      ],
      "code": [
        {
          "h": "Four methods, side by side, with the number each paper leads with",
          "paras": [
            "Written out together, the family resemblance is obvious and the differences are small. That is the point - the interesting variation is not in these thirty lines."
          ],
          "code": "class BottleneckAdapter(nn.Module):          # Houlsby / Pfeiffer\n    def __init__(self, d, r=64):\n        super().__init__()\n        self.down, self.up = nn.Linear(d, r), nn.Linear(r, d)\n        nn.init.zeros_(self.up.weight)        # near-identity at init, as LoRA does\n    def forward(self, h):\n        return h + self.up(F.gelu(self.down(h)))   # SEQUENTIAL: needs h first\n\nclass ParallelAdapter(nn.Module):            # He et al.'s scaled parallel adapter\n    def __init__(self, d, r=64, s=4.0):\n        super().__init__()\n        self.down, self.up, self.s = nn.Linear(d, r), nn.Linear(r, d), s\n        nn.init.zeros_(self.up.weight)\n    def forward(self, x, sublayer_out):\n        return sublayer_out + self.s * self.up(F.gelu(self.down(x)))  # reads the INPUT\n\nclass IA3(nn.Module):                        # three vectors per block\n    def __init__(self, d, d_ff):\n        super().__init__()\n        self.lk = nn.Parameter(torch.ones(d))\n        self.lv = nn.Parameter(torch.ones(d))\n        self.lff = nn.Parameter(torch.ones(d_ff))\n\ndef bitfit(model):                           # train the biases, nothing else\n    for n, p in model.named_parameters():\n        p.requires_grad = n.endswith(\".bias\")\n\n#  method              trainable %   headline claim\n#  Houlsby adapter ..... 3.6%        within 0.4% of full FT on GLUE\n#  Pfeiffer adapter .... ~1.8%       ~half the params, comparable\n#  LoRA (r=8) .......... ~0.4%       parity on adaptation tasks\n#  (IA)^3 .............. ~0.01%      strong in the few-shot regime\n#  BitFit .............. ~0.09%      competitive on GLUE at small/medium n\n#\n# READ THAT COLUMN AGAIN. If 0.09% is competitive, the benchmark is not\n# testing capacity - so it cannot rank methods BY capacity either.",
          "caption": "Note the single structural difference: BottleneckAdapter takes the sublayer's OUTPUT and must run after it; ParallelAdapter takes its INPUT and can run beside it. Everything downstream - latency, fusability, batchability - follows from that one line."
        },
        {
          "h": "The comparison that actually decides it",
          "paras": [
            "If accuracy is saturated, the evaluation has to measure the properties that are not. These four columns separate the methods cleanly where accuracy does not, and almost no paper reports them together."
          ],
          "code": "# THE TABLE I WOULD BUILD BEFORE CHOOSING:\n#\n#                    merges?  added latency  batch across   trainable\n#                             @ bs=1         tasks?         params\n#  ---------------------------------------------------------------------\n#  LoRA .............. YES     0 (merged)     YES (unmerged) ~0.4%\n#  (IA)^3 ............ YES     0 (merged)     yes            ~0.01%\n#  BitFit ............ n/a     0              no*            ~0.09%\n#  Parallel adapter .. no      small          partly         ~1-4%\n#  Houlsby adapter ... NO      NOTICEABLE     hard           ~3.6%\n#  Prefix tuning ..... no      context cost   YES            ~0.1%\n#\n#  * BitFit's biases are part of the model, so switching task means\n#    swapping weights - fine for one task, useless for multi-tenant.\n\n# WHY SEQUENTIAL ADAPTERS COST LATENCY: they add DEPTH. Two extra small\n# matmuls per block that cannot start until the sublayer finishes, so they\n# are pure serial time. At large batch this is amortized against a busy GPU;\n# at batch size 1 - interactive serving - you are latency-bound and it shows.\n# AdapterDrop removes adapters from the LOWER layers for exactly this reason\n# and reports inference speedups in the tens of percent for multi-task\n# serving, at little accuracy cost.\n\n# MEASURE IT YOURSELF, both regimes, because they disagree:\nfor bs in (1, 64):\n    t_base = time_forward(base_model, bs)\n    t_adpt = time_forward(adapted_model, bs)\n    print(bs, f\"{100 * (t_adpt / t_base - 1):.1f}% slower\")",
          "caption": "The four columns that are not saturated. Sequential adapters add serial depth that cannot overlap with anything, so the penalty is largest at batch size 1 - which is exactly the interactive-serving case, and exactly the regime papers benchmarking throughput do not report."
        }
      ],
      "useCases": [
        "Multi-task systems where each task needs a modest amount of capacity and the tasks are known in advance - the setting adapters were designed for, and where AdapterFusion-style composition lets you combine several trained adapters without retraining any of them.",
        "Research on the design space itself: adapters are the most flexible insertion point, so if you need a nonlinearity, a gate, or a module that reads something other than a weight matrix's input, LoRA's additive-matrix form cannot express it and an adapter can.",
        "Extreme few-shot adaptation, where (IA)^3-style rescaling with a few thousand parameters is more stable than a matrix update and was shown to beat in-context learning at far lower inference cost - because you pay once at training instead of on every prompt.",
        "Establishing how much capacity a task actually needs. Running BitFit first is a diagnostic: if training 0.09% of the parameters gets most of the way, the task is a readout problem and no amount of adapter capacity will be the deciding factor."
      ],
      "pitfalls": [
        "Choosing between PEFT methods on benchmark accuracy. Careful head-to-head comparisons find them broadly comparable once each is tuned, with reported gaps frequently inside hyperparameter variance. A saturated axis cannot rank anything; you are reading noise and attributing it to method design.",
        "Ignoring inference latency until deployment. Sequential adapters add serial depth to every forward pass, permanently, and the cost is worst at batch size 1 where interactive serving lives. Measure at batch 1 AND at your production batch size - they disagree, and papers usually report only the flattering one.",
        "Assuming any PEFT method supports multi-tenant serving. Only methods whose delta is an additive or multiplicative side path can be batched heterogeneously; anything that modifies the main computation sequentially cannot. This is the property that decided LoRA's adoption and it is not an accuracy property.",
        "Comparing methods at a shared learning rate. Optimal rates differ by an order of magnitude across these methods - prompt tuning in particular needs far higher rates than adapters - and a shared-rate comparison is a reliable way to make a method look bad while feeling rigorous.",
        "Reading 'within 0.4% of full fine-tuning' without asking what the benchmark was. GLUE-style tasks are largely solvable from a good frozen representation, which is why BitFit is competitive on them. That number is evidence about the task's difficulty at least as much as about the method.",
        "Forgetting that adapters must be initialized near the identity. Zero-init the up-projection so the module starts as a no-op; otherwise you reintroduce the random-new-module shock that distorts the pretrained features, which is the failure mode LoRA's zero-initialized B avoids by design.",
        "Stacking adapters from different training runs and expecting composition. AdapterFusion works because it LEARNS a combination; naively summing independently trained deltas is not a defined operation and the results are unpredictable."
      ],
      "connections": [
        {
          "ref": "fine-tuning/lora",
          "text": "The direct comparison this lesson exists to make. Under the unified view LoRA is a parallel adapter on a weight matrix with no nonlinearity - and that structural choice, not its accuracy, is why it displaced the sequential adapters that preceded it by two years."
        },
        {
          "ref": "fine-tuning/prompt-tuning",
          "text": "The third branch of the design space, and the one the unified view reframes most usefully: prefix tuning turns out to be a parallel adapter acting on the attention keys and values, which explains both its serving advantages and its optimization difficulties."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Mixture-of-experts is the same modular-capacity idea taken to pretraining scale, with a learned router in place of a task label - and it inherits the same serving question about which computations can be shared across a heterogeneous batch."
        },
        {
          "ref": "mlops/model-serving",
          "text": "The columns that actually decide between these methods - added latency at batch 1, batching across tenants, memory residency - are serving concerns, which is why a purely training-side comparison consistently picks the wrong method."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "A saturated benchmark cannot rank methods, and recognizing saturation before running the comparison is the skill. The same reasoning appears there in the context of models rather than adaptation methods."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a bottleneck adapter?",
          "a": "A small module inserted into each transformer block: down-project to size r, nonlinearity, up-project back, add to the residual. Everything else is frozen."
        },
        {
          "q": "What did Houlsby et al. report?",
          "a": "GLUE performance within 0.4% of full fine-tuning while training about 3.6% of the parameters per task. Two years before LoRA, making the same point."
        },
        {
          "q": "What is the difference between Houlsby and Pfeiffer adapters?",
          "a": "Houlsby inserts an adapter after both the attention and the FFN sublayers; Pfeiffer inserts one after the FFN only - roughly half the parameters, comparable results."
        },
        {
          "q": "What is BitFit?",
          "a": "Train only the existing bias terms, about 0.09% of parameters. Competitive with full fine-tuning on GLUE at small-to-medium data sizes."
        },
        {
          "q": "What is (IA)^3?",
          "a": "Three learned vectors per block that rescale the keys, the values, and the FFN inner activations elementwise - around 0.01% of parameters, and it merges into the adjacent matrices."
        },
        {
          "q": "What are the three axes of the unified view?",
          "a": "Which representation is modified (attention output, FFN output, keys and values), where the module sits (sequential or parallel), and how the delta is composed (add, scaled add, gated)."
        },
        {
          "q": "Where does LoRA sit in that grid?",
          "a": "A parallel adapter on a weight matrix, scaled addition, no nonlinearity. Prefix tuning is a parallel gated adapter on the keys and values."
        },
        {
          "q": "What was He et al.'s best-performing variant?",
          "a": "A scaled parallel adapter on the FFN - a cell of the design grid that no named method occupied, which is the argument for having the framework."
        },
        {
          "q": "Why do sequential adapters cost inference latency?",
          "a": "They add serial depth: extra matmuls that cannot start until the sublayer finishes. The cost is worst at batch size 1, where you are latency-bound rather than throughput-bound."
        },
        {
          "q": "What is AdapterDrop?",
          "a": "Removing adapters from the lower transformer layers to recover inference speed in multi-task serving, reported in the tens of percent, at little accuracy cost."
        },
        {
          "q": "Why can LoRA be batched across tasks but sequential adapters cannot?",
          "a": "LoRA's delta is an additive side path, so the expensive shared computation is task-independent. A sequential adapter modifies the main path, so different tasks need different main computations."
        },
        {
          "q": "Why is comparing PEFT methods on GLUE accuracy misleading?",
          "a": "The axis is saturated - BitFit at 0.09% of parameters is competitive - so differences are inside tuning variance. The unsaturated axes are latency, merge-ability, and batchability."
        }
      ],
      "standard": [
        {
          "q": "Compare the main PEFT method families and explain how you would choose between them.",
          "a": "I would start by refusing the list and using the unified view, because it makes the comparison predictive instead of memorized. THE FRAMEWORK. Every one of these methods computes a small delta and adds it to a hidden state. They differ on three axes: WHICH representation (attention output, FFN output, or the keys and values), WHERE the module sits (in series inside the residual path, or in parallel beside the sublayer), and HOW the delta composes (plain add, scaled add, gated). Houlsby adapters are sequential adapters on both sublayers. Pfeiffer is the same on the FFN only. LoRA is a parallel adapter on a weight matrix with no nonlinearity. Prefix tuning is a parallel gated adapter on the keys and values. (IA)^3 is an elementwise rescaling. BitFit trains the biases and nothing else. THE ACCURACY QUESTION, disposed of first. Every one of these papers reports near-parity with full fine-tuning on GLUE-style benchmarks, and careful head-to-head studies that tune each properly find them broadly comparable, with reported gaps often inside hyperparameter variance. That is not a disappointing result, it is a diagnostic: BitFit at 0.09% of parameters being competitive tells you these benchmarks are not testing capacity, so they cannot rank methods by capacity either. I would say explicitly that accuracy is the wrong axis and then move to the ones that are not saturated. THE AXES THAT DECIDE IT. (1) DOES IT MERGE? LoRA and (IA)^3 fold into the weights, so the deployed model has the original architecture and zero added latency. Sequential adapters cannot - they are extra operations forever. (2) CAN YOU BATCH ACROSS TASKS? Only if the delta is an additive or multiplicative side path, leaving the expensive shared computation task-independent. LoRA can; sequential adapters largely cannot. This is what makes multi-tenant serving possible and it is the single most consequential difference. (3) LATENCY AT YOUR BATCH SIZE. Sequential adapters add serial depth. At large batch it amortizes against a busy accelerator; at batch size 1 - interactive serving - it is visible, which is why AdapterDrop was written. (4) TRAINABLE PARAMETERS, which matters least of the four but is the one everyone reports. HOW I WOULD CHOOSE. Single model, offline batch inference: almost anything, take the simplest. Multi-tenant serving: LoRA, unmerged, no real competition. Extreme few-shot: (IA)^3, which is more stable than a matrix update at that data scale and beats in-context learning at far lower inference cost. Need a nonlinearity or a gate that LoRA's additive-matrix form cannot express: an adapter, because that is the flexible insertion point. And BitFit first as a DIAGNOSTIC - if training the biases gets most of the way, the task is a readout problem and the method choice barely matters. THE SUMMARY I WOULD GIVE. LoRA did not win on accuracy. It won because its delta is an additive side path that merges and batches, and that is a structural property. Knowing that is the difference between choosing a method and repeating a ranking.",
          "deepDive": {
            "q": "The unified view claims prefix tuning is a form of adapter. Reconstruct that argument.",
            "a": "It is a genuinely surprising equivalence and reconstructing it is the best test of whether the framework is real. THE SETUP. Prefix tuning prepends l learned key-value pairs to the attention keys and values at every layer. So attention over the augmented sequence is softmax over the concatenation of the prefix keys and the real keys, applied to the concatenation of the prefix values and the real values. THE ALGEBRA. Split the softmax normalizer into the part coming from the prefix and the part coming from the real tokens. Because softmax over a concatenation can be written as a convex combination of the two separately-normalized attentions, the output becomes: (1 - g) times standard attention over the real sequence, plus g times attention over the prefix alone - where g is the share of total attention mass falling on the prefix, and g depends on the query. THE READING. Rearrange to head = standard_attention + g * (prefix_attention - standard_attention). That is exactly the unified-view form: the original sublayer output, plus a GATED delta computed in PARALLEL from the same query. The gate is g, learned implicitly through the prefix keys; the delta's parameters are the prefix keys and values. So prefix tuning is a parallel adapter on the attention output with a gated composition, and the prefix length l plays the role that bottleneck size r plays elsewhere. WHY THIS IS USEFUL RATHER THAN CUTE. Three predictions fall out. (1) The GATED composition is the odd one out - every other method uses plain or scaled addition. Gating means the delta's influence is bounded by the attention mass it can capture, which explains prefix tuning's known optimization difficulty: to have a large effect the prefix must win attention mass, and the path to that is not a direct gradient on a magnitude. Replacing the gate with a scaled addition should help - and that is what the paper's scaled parallel adapter does, and it performs better. (2) Prefix tuning's serving properties follow from being parallel: different prefixes across a batch are just different tokens, so it batches trivially. (3) The framework predicts unnamed cells. The best variant found was a scaled parallel adapter on the FFN, which existed only as a grid coordinate before the paper. THE GENERAL LESSON. When several methods with different stories perform comparably, that is evidence they are the same method with different parameterizations, and finding the shared form usually explains their failure modes better than any of the individual papers do. That move - unify, then read the differences off the parameterization - is worth more than the specific result."
          }
        },
        {
          "q": "How would you design a fair benchmark comparing PEFT methods?",
          "a": "The main design decision is admitting that accuracy will probably not separate them, and building the study to measure what will. TUNING, which is where most comparisons fail. Each method gets its OWN hyperparameter search with the same budget - same number of trials, same search strategy - because optimal learning rates differ by an order of magnitude across these methods, and comparing them at a shared rate is a reliable way to make one look bad while feeling rigorous. For LoRA the search must couple alpha and r, since the scale is alpha/r and sweeping r at fixed alpha is a learning-rate sweep. I would report the search space and the budget, since 'we tuned each method' means nothing without them. MATCHING WHAT, EXACTLY. Not trainable parameters - that is the wrong control, because these methods place parameters in structurally different positions and equal counts do not mean equal capacity. I would match COMPUTE BUDGET for tuning and TRAINING STEPS, and report the parameter count as an outcome. SEEDS AND VARIANCE. Multiple seeds, and report the spread rather than the best run. Fine-tuning variance on modest datasets is routinely larger than the effects being compared, and a single-seed table showing a 0.3-point gap is not evidence of anything. If the spread overlaps, say so - that is the finding. TASKS THAT ARE NOT SATURATED. This is the substantive fix. If BitFit at 0.09% of parameters matches full fine-tuning on your benchmark, the benchmark is not testing capacity. I would include at least one task where full fine-tuning clearly beats a frozen linear probe, so there is headroom for methods to differ in, and I would report the frozen-probe and full-fine-tuning numbers as the floor and ceiling of the axis. THE NON-ACCURACY COLUMNS, which I would treat as primary rather than an appendix. Added inference latency at batch size 1 AND at production batch size, measured, since they disagree. Whether the method merges. Whether requests for different tasks can share a forward pass. Peak training memory. Adapter artefact size. Training throughput. THE OUT-OF-DISTRIBUTION COLUMN. Every method here constrains the update differently, and the constraint's effect on generalization is invisible in-distribution. LoRA forgets less than full fine-tuning; I would expect the more constrained methods to show more of that, and it is the kind of difference an in-distribution table structurally cannot show. WHAT I WOULD EXPECT TO FIND, stated in advance so the study is falsifiable: accuracy comparable within noise, latency and batching clearly separated, and the ranking on the second set stable across tasks while the ranking on the first is not. If accuracy rankings turn out to be stable across tasks and seeds, that would genuinely surprise me and would be the more interesting result."
        },
        {
          "q": "Why did LoRA displace adapters despite adapters coming first and performing comparably?",
          "a": "Because the deciding argument was a systems argument, and recognizing that is the substance of the answer. THE THREE STRUCTURAL ADVANTAGES. (1) IT MERGES. LoRA's delta is a matrix of the same shape as the weight it modifies, so W' = W0 + (alpha/r)BA and the deployed model is architecturally identical to the base with identical latency. A bottleneck adapter is a new nonlinear module in the residual path - there is no algebra that folds a nonlinearity into a linear layer, so the cost is permanent. In interactive serving at batch size 1 that is visible, and AdapterDrop exists as an entire paper about clawing it back. (2) IT BATCHES ACROSS TASKS. This is the decisive one. Serving unmerged, the forward pass is W0 x plus (alpha/r) B_i A_i x for request i. The first term - which is nearly all the FLOPs - is IDENTICAL regardless of which adapter each request uses, so a batch containing requests for a thousand different fine-tunes runs one shared GEMM plus a batched small low-rank term. Systems like S-LoRA are built on exactly that. A sequential adapter modifies the main path, so different tasks require different main computations and the shared GEMM is gone. LoRA turned per-customer fine-tuning into a viable product; adapters did not. (3) IT NEEDS NO SURGERY. LoRA wraps existing nn.Linear modules. Adapters require inserting modules into the block definition, which means library support per architecture, and it is why adapter tooling stayed a specialist ecosystem while LoRA became a two-line change in any codebase. THE ACCURACY POINT, stated carefully. Adapters were not worse. Houlsby reported within 0.4% of full fine-tuning on GLUE in 2019, and head-to-head studies find the families comparable once tuned. If accuracy had been the deciding axis, the two-year-older method would have won. It was not. THE WIDER LESSON I WOULD DRAW. The property that decided it - the delta is an additive side path rather than a modification of the shared computation - is a property nobody was optimizing for when LoRA was proposed. The paper argues from intrinsic dimension and reports benchmark parity; the merge and the multi-tenant batching are consequences of the form that turned out to matter more than the motivation. That is a common shape in systems: the winning design wins on a property that was incidental to its stated rationale, and you can only see it if you evaluate structure rather than scores.",
          "deepDive": {
            "q": "Are there settings where you would still choose a bottleneck adapter over LoRA today?",
            "a": "Yes, and being able to name them is the check on whether 'LoRA won' is understood or just repeated. CASE 1: YOU NEED A NONLINEARITY. LoRA's delta is BA - strictly a low-rank LINEAR map. A bottleneck adapter has a nonlinearity between its projections and can therefore express deltas LoRA cannot at any rank. On adaptation tasks this rarely binds, but if the fine-tune must implement something like a learned gate or a routing decision on the hidden state, the linear form is a genuine restriction rather than an efficient one. CASE 2: MODULAR COMPOSITION IS THE POINT. AdapterFusion trains a learned attention over several independently-trained adapters, so you can combine task modules without retraining any of them - a workflow that matters when tasks arrive over time and retraining is expensive. Composition of LoRA adapters is less well-defined: summing two independently trained low-rank deltas is not a principled operation and behaves unpredictably. If modularity is the requirement, the adapter ecosystem was built for it. CASE 3: THE INSERTION POINT ISN'T A WEIGHT MATRIX. LoRA modifies existing linear layers. If you want to intervene on the residual stream itself, between sublayers, or on something with no matrix to decompose, an adapter is the natural form. Much interpretability-adjacent and steering work sits here. CASE 4: OFFLINE BATCH INFERENCE, SINGLE TASK. If you run large batches offline, the latency argument is amortized to nothing and the multi-tenant argument is worth zero. Then the choice is free and you should pick whatever your codebase supports. CASE 5: PARALLEL ADAPTERS SPECIFICALLY. He et al.'s scaled parallel adapter on the FFN outperformed the alternatives in their comparison and keeps most of LoRA's structural advantages, since being parallel means it reads the sublayer's input and can be computed alongside rather than after. It is a genuinely good default that is under-used mostly because it lacks a memorable name and a tooling ecosystem. THE HONEST SUMMARY. In production, LoRA is right almost always, and the reason is serving structure rather than quality. The adapter family remains the more expressive and more composable design space, and it is where I would look if the constraint I hit is expressiveness or modularity rather than memory."
          }
        },
        {
          "q": "BitFit trains 0.09% of parameters and is competitive on GLUE. What should you conclude?",
          "a": "Mostly something about GLUE, and then something interesting about pretrained models - in that order, because the first conclusion is the one people skip. CONCLUSION 1: THE BENCHMARK IS NOT TESTING CAPACITY. If tuning only the bias terms - which cannot change any weight matrix, only shift each unit's threshold - reaches full-fine-tuning territory, then the pretrained representation already contains what the task needs and the fine-tune is selecting and rescaling existing features rather than building new ones. That is a statement about the difficulty of the task, and it immediately invalidates using that benchmark to rank methods BY capacity, which is what most PEFT comparison tables implicitly do. Notice this also explains why every PEFT method reports parity on GLUE: on a task where 0.09% suffices, everything above 0.09% will tie. CONCLUSION 2: PRETRAINED REPRESENTATIONS ARE EXTREMELY GENERAL. The positive reading, and it is real. The features are there; what varies between tasks is which ones matter and how strongly. Biases are exactly a per-feature threshold, so BitFit is close to a pure feature-SELECTION mechanism, and its success says most of what a downstream task needs is selection. That is the same finding as the intrinsic-dimension result behind LoRA, reached from a different direction. CONCLUSION 3, THE CAVEAT THE PAPER ITSELF MAKES. BitFit's competitiveness is reported for small-to-medium data. It degrades relative to full fine-tuning as data grows, which is the signature of a capacity constraint that binds once there is enough signal to exploit capacity. So the honest statement is regime-dependent rather than universal, and 'BitFit works' without the regime attached is a misquote. WHAT I WOULD DO WITH THIS OPERATIONALLY. Run BitFit, or a linear probe, FIRST on any new task, as a diagnostic rather than a candidate. It costs almost nothing and it tells me which problem I have. If it gets most of the way, my task is a readout problem: the method choice barely matters, I should spend my effort on data and evaluation, and any PEFT comparison I run will be measuring noise. If it fails badly and full fine-tuning succeeds, there is real headroom, methods will differ, and the comparison is worth running. THE META-POINT, which is this module's spine again. The most useful thing a cheap baseline gives you is not a number to beat - it is information about what your benchmark can and cannot distinguish. Skipping it is how people run careful comparisons on a saturated axis and draw confident conclusions from noise."
        },
        {
          "q": "You are building a platform where thousands of customers fine-tune the same base model. Which method and why?",
          "a": "LoRA, served unmerged, with a standardized rank across tenants. The reasoning is entirely about serving structure. THE CONSTRAINT THAT DOMINATES. Thousands of tenants means thousands of adapted models, most with sparse traffic. If each is a full fine-tune you need one accelerator per one or two models and utilization collapses. The problem is not training cost, it is serving a long tail of low-traffic customers economically, and that is what determines the method. WHY LORA SOLVES IT. Serving unmerged, the forward pass is W0 x + (alpha/r) B_i A_i x. The W0 x term is the overwhelming majority of the FLOPs and it is TENANT-INDEPENDENT, so a single batch can contain requests for many different customers, sharing one dense GEMM, with only the small low-rank detour differing per request. That is a batched gather plus a grouped small GEMM - what Punica's SGMV kernel and S-LoRA implement. No other family gives you this: sequential adapters change the main path, and BitFit's biases are part of the weights so switching tenants means swapping the model. THE DESIGN DECISIONS THAT FOLLOW. (1) STANDARDIZE THE RANK across tenants, so the grouped kernel has one uniform shape. Letting customers choose r is a serving liability disguised as flexibility. (2) TARGET ALL LINEAR LAYERS, since the MLP holds two thirds of the parameters and per-tenant quality is the product. (3) An ADAPTER CACHE with an admission policy - hot adapters resident on device, the tail paged from host memory. It is the same problem shape as KV-cache management and deserves the same attention. (4) A MERGE PATH for whales: if one customer is 40% of traffic, merge their adapter into a dedicated replica and serve it at zero adapter overhead, keeping the shared unmerged pool for the tail. (5) PIN THE BASE REVISION in every adapter's metadata, because an adapter paired with the wrong base degrades output silently rather than erroring. THE TRAINING SIDE. QLoRA if customers train on constrained hardware, but note that you should still serve from an fp16 or inference-quantized base rather than the 4-bit training base - and never merge a QLoRA adapter into the base it was trained against. WHAT I WOULD MEASURE ONCE LIVE. Throughput as a function of DISTINCT ADAPTERS PER BATCH, not just batch size. A batch of 64 requests across 64 different adapters behaves very differently from 64 requests across 4, because the grouped GEMM degenerates toward a loop as the batch becomes ragged. That curve is the real capacity model for this platform, and it is not something the LoRA paper tells you."
        },
        {
          "q": "Explain the unified view of PEFT and why it is more useful than a list of methods.",
          "a": "THE FRAMEWORK. He et al. observed that every parameter-efficient method computes a delta on a hidden representation and adds it, and that the named methods differ along only three axes. TARGET: which representation is modified - the attention output, the FFN output, or the attention keys and values. POSITION: whether the module sits sequentially in the residual path, reading the sublayer's OUTPUT, or in parallel beside it, reading the sublayer's INPUT. COMPOSITION: how the delta combines - plain addition, scaled addition, or a gate. Place the methods on that grid and Houlsby adapters are sequential-add on both sublayers, LoRA is parallel-scaled-add on a weight matrix without a nonlinearity, prefix tuning is parallel-gated-add on the keys and values, and (IA)^3 is a multiplicative rescaling. WHY IT BEATS A LIST - three concrete payoffs. (1) IT PREDICTS SERVING BEHAVIOUR. Position determines everything downstream. A parallel module reads the sublayer's input, so it can be computed alongside, fused, or batched heterogeneously; a sequential one must wait for the output, so it is pure added serial depth. That single distinction explains why LoRA merges and adapters do not, why LoRA supports multi-tenant batching and adapters do not, and why AdapterDrop had to exist. You can read those consequences off the grid coordinate without knowing anything else about the method. (2) IT EXPLAINS FAILURE MODES. Prefix tuning's composition is a GATE, and it is the only method in the family using one. A gated delta's influence is bounded by how much attention mass the prefix can capture, and there is no direct gradient path to 'have a larger effect' - which is a mechanistic account of prefix tuning's notorious optimization instability, and it predicts the fix: replace the gate with a scaled addition. (3) IT PRODUCES NEW METHODS. The best variant in the paper - a scaled parallel adapter on the FFN - was an empty cell of the grid. It was not proposed by anyone because it sat between the existing named methods, and the framework found it by enumeration rather than insight. That is the strongest possible evidence that a taxonomy is real: it generates. THE DERIVATION THAT MAKES IT NON-OBVIOUS. Prefix tuning does not look like an adapter at all - it prepends tokens. But splitting the attention softmax over the prefix and the real sequence rewrites the head output as standard attention plus a gated delta computed in parallel from the same query. That is a genuine equivalence, not an analogy. THE HABIT I WOULD TAKE FROM IT. When several methods with different motivating stories perform comparably on benchmarks, treat that as evidence they are the same method differently parameterized, and go looking for the shared form. The shared form usually explains their differences better than any of the original papers do."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Bottleneck adapter",
        "back": "h <- h + W_up * sigma(W_down * h) inserted per block; 2rd + r + d parameters per insertion point. Houlsby et al. 2019: within 0.4% of full FT on GLUE at 3.6% of parameters - two years before LoRA."
      },
      {
        "type": "intuition",
        "front": "The unified view: three axes",
        "back": "TARGET (attn out / FFN out / K,V) x POSITION (sequential / parallel) x COMPOSITION (add / scaled add / gated). Houlsby = seq-add; LoRA = parallel-scaled-add on a matrix, no nonlinearity; prefix tuning = parallel-GATED-add on K,V."
      },
      {
        "type": "pitfall",
        "front": "PEFT accuracy is a SATURATED axis",
        "back": "Head-to-head studies find these methods comparable once each is tuned, with gaps inside hyperparameter variance. BitFit at 0.09% is competitive on GLUE - so the benchmark is not testing capacity and cannot rank by it. Choose on latency, merge-ability, batchability."
      },
      {
        "type": "intuition",
        "front": "Why position determines everything",
        "back": "A PARALLEL module reads the sublayer's INPUT, so it can be fused, merged, or batched heterogeneously. A SEQUENTIAL one reads the OUTPUT and is pure added serial depth. That single line explains why LoRA merges and adapters do not."
      },
      {
        "type": "definition",
        "front": "BitFit",
        "back": "Train only the existing bias terms (~0.09% of parameters). Competitive with full FT on GLUE at SMALL-TO-MEDIUM data - it degrades as data grows, which is the signature of a capacity constraint that binds once there is signal to exploit."
      },
      {
        "type": "definition",
        "front": "(IA)^3",
        "back": "Three learned vectors per block rescaling K, V and the FFN inner activations elementwise (~0.01% of parameters). Merges into adjacent matrices. Beat in-context learning in the few-shot regime at far lower inference cost."
      },
      {
        "type": "intuition",
        "front": "Prefix tuning IS a parallel adapter",
        "back": "Split the attention softmax over prefix vs real keys: head = standard_attention + g*(prefix_attention - standard_attention), a GATED delta computed in parallel from the same query. The gate explains its optimization instability - no direct gradient path to 'have a larger effect'."
      },
      {
        "type": "pitfall",
        "front": "Measure adapter latency at batch size 1",
        "back": "Sequential adapters add serial depth that cannot overlap. At large batch it amortizes against a busy GPU; at bs=1 (interactive serving) it is visible. The two regimes disagree, and papers report the flattering one. AdapterDrop exists to claw this back."
      },
      {
        "type": "definition",
        "front": "AdapterDrop",
        "back": "Remove adapters from the LOWER transformer layers to recover multi-task inference speed - reported speedups in the tens of percent at little accuracy cost. Evidence that sequential-adapter latency is large enough to engineer around."
      },
      {
        "type": "pitfall",
        "front": "Never compare PEFT methods at a shared learning rate",
        "back": "Optimal rates differ by an order of magnitude across methods (prompt tuning needs far higher rates than adapters). Each method gets its own search with an equal budget - otherwise you are measuring the shared rate's suitability, not the method."
      },
      {
        "type": "intuition",
        "front": "The scaled parallel adapter",
        "back": "He et al.'s best variant: a scaled parallel adapter on the FFN - an EMPTY CELL of the design grid that no named method occupied. A taxonomy that generates new methods is a real taxonomy, not a filing system."
      },
      {
        "type": "intuition",
        "front": "Why LoRA displaced adapters despite arriving second",
        "back": "Not accuracy - adapters were within 0.4% of full FT in 2019. LoRA merges to zero latency, batches heterogeneously (shared W0 x term), and needs no architectural surgery. The deciding argument was a SYSTEMS argument, and it was incidental to the paper's stated motivation."
      }
    ],
    "refs": [
      {
        "title": "Houlsby et al. (2019), Parameter-Efficient Transfer Learning for NLP",
        "url": "https://arxiv.org/abs/1902.00751"
      },
      {
        "title": "He et al. (2021), Towards a Unified View of Parameter-Efficient Transfer Learning",
        "url": "https://arxiv.org/abs/2110.04366"
      },
      {
        "title": "Ben Zaken et al. (2021), BitFit: Simple Parameter-efficient Fine-tuning for Transformer-based Masked Language-models",
        "url": "https://arxiv.org/abs/2106.10199"
      },
      {
        "title": "Liu et al. (2022), Few-Shot PEFT is Better and Cheaper than In-Context Learning (T-Few, (IA)^3)",
        "url": "https://arxiv.org/abs/2205.05638"
      },
      {
        "title": "Ruckle et al. (2020), AdapterDrop: On the Efficiency of Adapters in Transformers",
        "url": "https://arxiv.org/abs/2010.11918"
      }
    ],
    "demos": [
      "lora",
      "batching",
      "moe",
      "pruning"
    ],
    "demoTitles": {
      "lora": "LoRA - Low-Rank Adaptation",
      "batching": "Dynamic Batching",
      "moe": "Mixture of Experts (MoE)",
      "pruning": "Pruning & Sparsity"
    }
  }
};
