// GENERATED from content/lessons/training-systems/optimized-pipeline.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/optimized-pipeline/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "optimized-pipeline": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Nine techniques, each an exchange: mixed precision spends numerical headroom, compilation spends compile time and debuggability, checkpointing spends a third of your compute, accumulation spends wall-clock, sharding spends communication, stability guards spend throughput, and the data-pipeline choices spend storage, randomness or sample freshness. The capstone is not a longer list. It is the claim that these do not compose freely - their exchange rates depend on each other, and applying them in the wrong order or the wrong combination gives you a system that is slower than the sum of its parts suggests.",
        "The organizing discipline is a decision procedure rather than a checklist. Establish which resource binds. Apply the technique that targets THAT resource. Re-measure - because optimizing a system RE-ORDERS its bottlenecks, and the term that binds after you have halved the activations is usually not the one that bound before. The most memorable instance is that after LoRA, quantization and mixed precision have done their work on a large fine-tune, the biggest remaining allocation can be the logits tensor: something nobody was thinking about, which did not become expensive but simply stopped being dwarfed.",
        "And the ordering has a hard dependency at the top that people skip. If the accelerator is idle waiting for data, then mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more onto it, and the accelerator is not the constraint. So the first question - is the GPU busy - is not the first step of a performance investigation, it determines whether the rest of the module applies at all. That is why this lesson comes after profiling rather than before it, and why the first thing the assembled pipeline does is measure."
      ],
      "math": [
        {
          "h": "The decision procedure, as a budget",
          "paras": [
            "Both budgets must be computed, because they select different techniques. The memory budget says what fits; the time budget says what is slow. A technique that targets a term which is not binding buys nothing at all.",
            "Writing them down first is what converts a list of options into a ranked plan."
          ],
          "tex": "M = \\underbrace{2P}_{\\text{wts}} + \\underbrace{14P_t}_{\\text{grad}+\\text{opt}} + \\underbrace{A}_{\\text{acts}} + \\underbrace{L}_{\\text{logits}}, \\qquad T = t_{\\text{compute}} + t_{\\text{comm}}^{\\text{exposed}} + t_{\\text{data}} + t_{\\text{idle}}",
          "texNote": "Map each term to its lever and the plan writes itself. Training state: LoRA or ZeRO-1. Weights: quantization or full sharding. Activations: checkpointing, micro-batching, mixed precision. Logits: chunked cross-entropy. Compute time: compilation, better kernels, precision. Exposed communication: overlap, hybrid sharding, bucketing. Data time: the pipeline. Idle: find the straggler or the synchronization."
        },
        {
          "h": "Why the order matters: optimization re-orders bottlenecks",
          "paras": [
            "Amdahl bounds each step's gain by the fraction it addresses, and that fraction changes after every change. So the correct procedure is iterative, and a plan fixed in advance is wrong by the second step.",
            "The practical consequence is that you re-profile after each significant change rather than applying a prepared list."
          ],
          "tex": "S_k = \\frac{1}{(1-p_k) + p_k/s_k}, \\qquad p_{k+1} = \\frac{p_{k+1}^{\\text{old}}}{S_k} \\;\\; \\text{(every other fraction grows)}",
          "texNote": "Halving the time of a component that was 50% makes everything else 67% of the new total, so the next-largest term is now worth proportionally more and the one you just fixed is worth much less. That is why a list applied top to bottom without re-measuring converges to spending effort on things that stopped mattering three changes ago."
        },
        {
          "h": "The metric that should decide, and the ones that mislead",
          "paras": [
            "Step time gets worse under several of these techniques by construction, so optimizing it selects against checkpointing and accumulation regardless of whether they helped. The right objective is time to a target quality.",
            "Throughput is a reasonable proxy only when the effective batch and the optimization are held fixed, which most of these changes do not do."
          ],
          "tex": "\\text{minimize } T_{\\text{target}} = \\underbrace{n_{\\text{steps}}(B_{\\text{eff}})}_{\\text{optimization}} \\times \\underbrace{t_{\\text{step}}}_{\\text{systems}} \\quad\\text{not}\\quad \\min t_{\\text{step}}",
          "texNote": "The two factors pull against each other, which is the whole reason this is a capstone. Checkpointing raises t_step and can lower n_steps by permitting a larger batch. Accumulation raises t_step per optimizer step and lowers n_steps. Only the product is the thing you care about, and it is why every comparison in this lesson is run to a target loss rather than for a fixed number of steps."
        }
      ],
      "code": [
        {
          "h": "The decision procedure, applied",
          "paras": [
            "Measure, identify the binding term, apply its lever, re-measure. The ordering is not a preference - each step's value depends on the previous step's outcome."
          ],
          "code": "# STEP 0 - IS THE ACCELERATOR EVEN BUSY? This gates everything else.\n#   Run the loop on SYNTHETIC data (a fixed tensor). If throughput jumps, you\n#   are INPUT-BOUND and nothing else in this module applies until it is fixed.\n#   Ten minutes, and it is the only step with a hard dependency on it.\n\n# STEP 1 - COMPUTE BOTH BUDGETS before touching anything.\n#   MEMORY: weights 2P | grad+opt 14P_trainable | activations | LOGITS (B*T*V*3)\n#   TIME:   from the profiler - matmul | memory-bound | exposed comm | data | idle\n\n# STEP 2 - APPLY THE LEVER FOR THE BINDING TERM. One at a time.\n#   grad+opt dominates ....... LoRA, or ZeRO-1  (removes 12 of 16 bytes, ~free)\n#   weights dominate ......... quantize the base, or ZeRO-3\n#   activations dominate ..... micro-batch FIRST (linear, no recompute), then\n#                              checkpoint SEGMENTED at ~sqrt(L)\n#   LOGITS dominate .......... chunked cross-entropy - and check this, because\n#                              after the others it is often the largest term\n#   memory-bound kernels ..... torch.compile (fusion), lower precision\n#   exposed communication .... prefetch, bucket, HYBRID shard, no_sync\n#   data time ................ sequential shards, local cache, GPU decode\n#   idle ..................... find the STRAGGLER or the .item() sync\n\n# STEP 3 - RE-MEASURE. Optimization RE-ORDERS bottlenecks: the term that binds\n#   after halving the activations is usually not the one that bound before.\n#   Applying a prepared list top-to-bottom without re-profiling converges to\n#   optimizing things that stopped mattering three changes ago.\n\n# STEP 4 - JUDGE BY TIME TO A TARGET LOSS, not step time. Checkpointing and\n#   accumulation make step time WORSE by construction, so optimizing step time\n#   selects against them regardless of whether they helped.\n\n# ALWAYS ON, regardless of the above - these are not optimizations:\n#   bf16 autocast (no GradScaler)      finite-gradient check before step\n#   gradient clipping + LOG the norm   frequent checkpoints incl. loader state\n#   log MFU, per-rank step time, peak memory, effective batch size",
          "caption": "Step 0 is a hard dependency, not a preference: an idle accelerator cannot be helped by making it faster. And step 3 is what people skip - a prepared list applied without re-measuring optimizes things that stopped mattering several changes ago."
        },
        {
          "h": "The interactions, which are where assembled pipelines go wrong",
          "paras": [
            "Every pair below costs more than the two techniques individually suggest, and each is silent. These are the reason the module ends with a capstone rather than a summary."
          ],
          "code": "# CHECKPOINTING x QLoRA -> the recomputed forward DEQUANTIZES the 4-bit base\n#   weights a SECOND time. Both are memory techniques and the combination is\n#   right, but the step cost is worse than either alone implies. Budget for it.\n\n# CHECKPOINTING x FSDP -> if a checkpointed region spans several FSDP units,\n#   the recomputation triggers those units' parameter ALL-GATHERS again. The\n#   recompute now costs BANDWIDTH as well as compute. Align the boundaries.\n\n# ACCUMULATION x DDP/FSDP -> without no_sync you perform the full communication\n#   cycle on EVERY micro-step instead of once. Identical results, k times the\n#   traffic. Large, common, one line to fix.\n\n# ACCUMULATION x fp16 SCALER -> an overflow at the step boundary discards the\n#   WHOLE accumulated gradient, so one bad micro-batch costs k micro-batches.\n#   Another argument for bf16.\n\n# fp16 -> bf16 -> you deleted the GradScaler, which was ALSO doing your\n#   skip-on-non-finite. Add the finite check back explicitly. This is the most\n#   commonly missing guard in a bf16 loop.\n\n# COMPILE x CHECKPOINTING -> AOTAutograd's partitioner ALREADY chooses\n#   save-vs-recompute as a min-cut at operation granularity. Manual segment\n#   checkpointing on top can help (coarser decisions) or fight it. Measure both.\n\n# WORLD SIZE x LEARNING RATE -> effective batch = micro x accum x world_size.\n#   Adding GPUs changes the OPTIMIZATION PROBLEM. A run that diverges after\n#   scaling out is usually the linear scaling rule applied WITHOUT warmup, not\n#   a distributed bug.\n\n# CLIPPING x AMP -> unscale BEFORE clipping, or the threshold meets gradients\n#   still carrying a factor of ~2^16 and the clip never fires.\n\n# THE PATTERN: most failures come from two techniques touching the SAME term\n# and being expected to add, or from an interaction cost nobody budgeted.",
          "caption": "Eight interactions, all silent, and each costs more than the two techniques individually suggest. This list is the reason a pipeline assembled from correct parts can still be slower than expected."
        }
      ],
      "useCases": [
        "Standing up a new large training run, where the order of decisions determines the cost of the whole project and where the memory budget computed in ten minutes decides which techniques are even relevant.",
        "Auditing an existing pipeline that is slower or more expensive than expected, where the performance budget and the interaction list between them explain most cases without any new tooling.",
        "Making the case for engineering time, since MFU plus the FLOP model converts a proposed improvement into days and dollars - a far stronger argument than a profile that looks unsatisfying.",
        "Scaling an established recipe to more devices or a larger model, where the effective batch changes the optimization problem and the binding memory term usually changes too, so the previous configuration is not simply reusable."
      ],
      "pitfalls": [
        "Applying techniques from a list without measuring. Each targets a different term, and one that addresses a term which is not binding buys exactly nothing - while still costing its price in compute, complexity or communication.",
        "Not re-profiling after each change. Optimization re-orders bottlenecks, so a plan fixed in advance is wrong by its second step and converges to optimizing things that stopped mattering several changes ago.",
        "Optimizing step time. Checkpointing and accumulation make step time worse by construction, so that objective selects against them regardless of whether they helped. Judge by time to a target loss.",
        "Skipping the is-the-GPU-busy question. If the job is input-bound, every other technique in this module makes the accelerator faster or fit more onto it, and the accelerator is idle. This is a hard dependency rather than a preference.",
        "Enabling checkpointing to fix an out-of-memory and never raising the batch size. You have paid a third of your compute for headroom you are not spending, which is a bookkeeping error rather than a technical one and it is extremely common.",
        "Assuming techniques compose additively. Checkpointing plus quantized weights pays dequantization twice; checkpointing across FSDP units pays extra all-gathers; accumulation without no_sync multiplies communication. Every one of these is silent.",
        "Adding devices without adjusting the learning rate. The effective batch is micro-batch times accumulation times world size, so scaling out changes the optimization problem - and a run that diverges afterwards is usually the linear scaling rule applied without warmup rather than a distributed bug."
      ],
      "connections": [
        {
          "ref": "training-systems/profiling",
          "text": "The prerequisite instrument. MFU sizes the opportunity absolutely and the performance budget ranks the work, which is what turns this lesson's decision procedure from advice into arithmetic."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Where the memory budget's terms are established, including the logits allocation that becomes the largest remaining term once the parameter-side techniques have done their work."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The other half of the cost question. Systems work sets the time per token; the scaling literature sets how many tokens and parameters are worth buying, and only the product is the training plan."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Where the engineering-time question belongs. MFU converts a proposed optimization into days and dollars, which is what makes the decision to spend a week on performance work defensible rather than aesthetic."
        },
        {
          "ref": "fine-tuning/unsloth",
          "text": "The same discipline applied to tooling claims. A speedup figure is a measurement of someone else's configuration, and reproducing it on yours is the only version of the number that applies."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the first question in any training-performance investigation?",
          "a": "Is the accelerator busy. If the job is input-bound, every other technique makes the accelerator faster or fit more onto it, and the accelerator is idle."
        },
        {
          "q": "How do you test for input-bound quickly?",
          "a": "Run the training loop on synthetic data - a fixed tensor - with the loader removed. If throughput jumps, the pipeline is the constraint."
        },
        {
          "q": "Which two budgets should you compute first?",
          "a": "Memory - weights, training state, activations, logits - and time, from the profiler: matmul, memory-bound, exposed communication, data, idle."
        },
        {
          "q": "Why re-profile after each change?",
          "a": "Optimization re-orders bottlenecks. The term that binds after halving the activations is usually not the one that bound before, so a fixed plan is wrong by its second step."
        },
        {
          "q": "Why is step time the wrong objective?",
          "a": "Checkpointing and accumulation make it worse by construction, so optimizing it selects against them regardless of whether they helped. Use time to a target loss."
        },
        {
          "q": "What lever targets the training-state term?",
          "a": "LoRA or ZeRO stage 1 - the optimizer state and master copy are twelve of the sixteen bytes per trainable parameter."
        },
        {
          "q": "What should you try before gradient checkpointing?",
          "a": "Micro-batching with accumulation, which reduces peak activation memory linearly with no recompute cost at all."
        },
        {
          "q": "Which memory term surprises people after the others are optimized?",
          "a": "The logits tensor - batch times sequence times vocabulary, times three - which did not get more expensive but stopped being dwarfed."
        },
        {
          "q": "Why does checkpointing plus QLoRA cost more than expected?",
          "a": "The recomputed forward dequantizes the 4-bit base weights a second time, so the combined step is slower than either technique alone suggests."
        },
        {
          "q": "Why does checkpointing across FSDP units cost communication?",
          "a": "The recomputation triggers those units' parameter all-gathers again, so recompute costs bandwidth as well as compute. Align the boundaries."
        },
        {
          "q": "What breaks when you move from fp16 to bf16?",
          "a": "You delete the GradScaler, which was also performing the skip-on-non-finite guard. That check must be added back explicitly."
        },
        {
          "q": "What changes when you add GPUs?",
          "a": "The effective batch, which is micro-batch times accumulation times world size - so the optimization problem changes and the learning rate needs adjusting."
        }
      ],
      "standard": [
        {
          "q": "Walk through how you would optimize a large training job from scratch.",
          "a": "I WOULD FOLLOW A DECISION PROCEDURE RATHER THAN A CHECKLIST, because each technique targets a different resource and one applied to a term that is not binding buys nothing while still costing its price. STEP 0 - IS THE ACCELERATOR BUSY? Run the loop on synthetic data with the loader removed. If throughput jumps, the job is input-bound and NOTHING else in the module applies until that is fixed - mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more onto it, and the accelerator is idle. This is a hard dependency, it takes ten minutes, and it is skipped constantly. STEP 1 - COMPUTE BOTH BUDGETS. Memory: 2 bytes per parameter for weights, about 14 more per TRAINABLE parameter for gradients and optimizer state, activations scaling with batch times sequence times depth, and the logits tensor at batch times sequence times vocabulary times three. Time: from the profiler, split into matmul kernels, memory-bound kernels, exposed communication, data stalls, and idle. Both are needed because they select different techniques. STEP 2 - APPLY THE LEVER FOR THE BINDING TERM, one at a time. Training state dominating means LoRA or ZeRO-1, which removes twelve of sixteen bytes at essentially no communication cost. Weights dominating means quantization or full sharding. Activations dominating means micro-batching FIRST, since it is linear and free, then segmented checkpointing at about the square root of the depth. The logits dominating - which is common once the others are done - means a chunked cross-entropy. Memory-bound kernels mean compilation and lower precision. Exposed communication means prefetching, bucketing, hybrid sharding, and no_sync under accumulation. Data time means the pipeline. Idle means a straggler or a synchronization from logging. STEP 3 - RE-MEASURE, which is what people skip. Optimization RE-ORDERS bottlenecks: halving a component that was half your time makes everything else two thirds of the new total, so the next-largest term is now worth proportionally more. A prepared list applied top to bottom converges to optimizing things that stopped mattering three changes ago. STEP 4 - JUDGE BY TIME TO A TARGET LOSS. Step time gets worse under checkpointing and accumulation by construction, so optimizing step time selects against them regardless of whether they helped. The objective is the product of steps-to-target, which the optimization determines, and time-per-step, which the systems work determines - and those two pull against each other, which is the whole reason this is a capstone. WHAT I WOULD TURN ON REGARDLESS, because these are not optimizations. bf16 autocast with no GradScaler. The finite-gradient check before the step - and note that deleting the scaler deleted the skip logic it was providing. Gradient clipping with the pre-clip norm logged. Frequent checkpoints including the data-loader position. And a metrics set covering MFU, per-rank step time, peak memory and effective batch size, so the next investigation starts from a dashboard rather than from scratch.",
          "deepDive": {
            "q": "Work a concrete example: a 7B model, 8 GPUs, currently out of memory. What do you do and in what order?",
            "a": "COMPUTE THE BUDGET FIRST, because it determines everything and takes two minutes. 7B parameters at 2 bytes is 14 GB of weights. Gradients plus the fp32 master copy plus Adam's two moments is about 14 bytes per trainable parameter, so 98 GB more if everything is trainable. That is 112 GB per device before a single activation, against perhaps 80 GB available. So the TRAINING STATE is the binding term by a wide margin - not activations, not the model. That single observation eliminates half the techniques. DECISION 1: IS THIS FULL FINE-TUNING OR ADAPTATION? If adaptation, LoRA removes the 98 GB almost entirely - the fourteen bytes apply only to TRAINABLE parameters and the adapter is under one percent of them. You are left with 14 GB of frozen weights plus activations, which fits comfortably on one device and the problem is solved without any distributed machinery. This is the answer most of the time and it is worth establishing before reaching for sharding. DECISION 2: IF FULL FINE-TUNING IS REQUIRED, shard the state. ZeRO-1 across 8 devices gives 4P plus 12P over 8, which is about 14 GB plus 10.5 GB, roughly 25 GB per device - and it costs essentially no extra communication. That fits, and I would stop there rather than going to full sharding, because ZeRO-3's parameter all-gathers cost about 1.5 times DDP's traffic for capacity I no longer need. This is the under-used option and this example is exactly its case. DECISION 3: NOW RE-MEASURE, because the binding term has changed. With the state sharded, activations and the logits tensor are what remain. At a long sequence length the logits - batch times sequence times vocabulary times three copies - can be several gigabytes, which is often the largest single remaining allocation and is fixed by a chunked cross-entropy rather than by anything on the parameter side. Activations are addressed first by micro-batching, which is linear and costs no recompute, and only then by segmented checkpointing. DECISION 4: MIXED PRECISION throughout, bf16 if the hardware supports it, which halves activations and the gradient term and deletes the loss-scaling machinery. This should have been on from the start rather than being a step. THEN THE TIME QUESTION, which is separate. Once it fits, profile. If the model is memory-bound on elementwise work, compile it. If communication is exposed, check prefetching and no_sync. If the GPU is idle, the data pipeline is the constraint and none of the above matters. WHAT I WOULD NOT DO. Reach for FSDP first because the model is large - the arithmetic said the optimizer state was the problem, and stage 1 solves it more cheaply. Enable checkpointing to fix the out-of-memory and then not raise the batch size, which pays a third of the compute for headroom nobody spends. Or apply several techniques at once, which makes it impossible to attribute the result and guarantees some of them are unnecessary. THE GENERALIZABLE PART. The budget told me the binding term was the optimizer state, which pointed at exactly two techniques and eliminated the rest. Without it, the natural instinct is checkpointing - because the model is large and checkpointing is what you do for memory - and it would have cost a third of the compute while addressing a term that was a small fraction of the problem."
          }
        },
        {
          "q": "Which techniques in this module interact badly, and why?",
          "a": "SEVEN PAIRS, and every one of them is silent - the pipeline works and is slower or more fragile than the sum of its parts implies. (1) CHECKPOINTING AND QUANTIZED WEIGHTS. The recomputed forward pass dequantizes the 4-bit base a SECOND time, and dequantization is memory-bound and slow. Both are memory techniques and the combination is usually right, but the step cost exceeds what either suggests and it should be budgeted rather than discovered. (2) CHECKPOINTING AND FSDP. If a checkpointed region spans several FSDP units, the recomputation triggers those units' parameter ALL-GATHERS again - so recompute now costs bandwidth as well as compute. Aligning checkpoint boundaries with wrapping boundaries fixes it, and this is a common reason FSDP appears slower than its accounting predicts. (3) ACCUMULATION AND DATA-PARALLEL COMMUNICATION. Without no_sync you perform the full gradient communication on every micro-step instead of once per optimizer step - identical results, k times the traffic. One line, large waste, and easy to miss because nothing is wrong with the output. (4) ACCUMULATION AND THE fp16 SCALER. An overflow detected at the step boundary discards the WHOLE accumulated gradient, so a single bad micro-batch costs k micro-batches of work. An argument against large accumulation counts under fp16, and another point for bf16. (5) fp16 TO bf16. Switching is strictly better numerically and it DELETES the GradScaler, which was also performing the skip-on-non-finite guard. The loop that was protected is now not, and this is the most commonly missing guard in a bf16 training loop precisely because the protection was previously invisible. (6) COMPILATION AND CHECKPOINTING. AOTAutograd's partitioner already chooses save-versus-recompute as a min-cut at operation granularity, so compiled training may already use less activation memory than eager. Manual segment checkpointing on top can add coarse decisions the partitioner does not make, or can fight it. Measure both rather than assuming they compose. (7) WORLD SIZE AND LEARNING RATE. The effective batch is micro-batch times accumulation times world size, so adding devices changes the OPTIMIZATION problem rather than only the infrastructure. A run that diverges after scaling out is usually the linear scaling rule applied without warmup, not a distributed bug - and the diagnosis is a glance at two logged numbers. THE PATTERN ACROSS ALL OF THEM. Most failures come from two techniques touching the SAME budget term and being expected to add - checkpointing and micro-batching both reduce activations, so applying both does not halve twice - or from an interaction cost nobody budgeted, which is the dequantization and the extra all-gathers. WHAT I WOULD DO ABOUT IT. Apply one technique at a time and re-measure, which attributes the effect and surfaces the interaction. And write down which term each is addressing, because that single note makes the same-term overlaps obvious in advance rather than after."
        },
        {
          "q": "How do you decide whether an optimization is worth the engineering time?",
          "a": "CONVERT IT TO DAYS AND DOLLARS, which MFU and the FLOP model make straightforward and which is a far stronger argument than a profile that looks unsatisfying. THE ARITHMETIC. Total compute is about 6ND for a dense transformer. Effective throughput is aggregate peak times MFU. Wall-clock is the ratio, and cost is device-hours times the rate. So an MFU improvement from 30% to 40% on a job that was going to take nineteen days saves about six days and a quarter of the budget - a number you can put in front of a decision-maker and check against an invoice afterwards. THE COMPARISON THAT DECIDES IT. Estimated saving against estimated engineering time, including the cost of the added complexity forever. A week of work to save six days of compute on one run is marginal; the same week to save six days on every run for the next year is obvious. So the question is not only how much it saves but how many times it saves it, and that is usually the deciding factor rather than the size of the improvement. WHAT AMDAHL CONTRIBUTES. It bounds the payoff before you start. If the component you are proposing to optimize is 15% of step time, your ceiling is a 17% improvement - so a proposal to spend two weeks on it is answerable with arithmetic rather than opinion. This is the most useful thing a performance budget provides: it lets you decline work with a number. WHAT MFU CONTRIBUTES ON TOP. It bounds the TOTAL available. At 45% MFU the most any optimization could ever buy is roughly a factor of two, which caps every proposal anyone makes. At 12% the problem is structural and the available gain is large, which changes the calculus entirely. Knowing which regime you are in determines whether to invest at all. THE COSTS PEOPLE UNDER-COUNT. Complexity is permanent: every technique adds configuration, failure modes, and debugging surface for everyone who touches the pipeline afterwards. Some optimizations constrain future choices - a heavily tuned sharding configuration is harder to change when the model does. And the risk of introducing a subtle correctness problem is real, particularly with hand-written kernels or custom backward passes, where the failure is silent. THE ASYMMETRY I WOULD FLAG. Optimizations that are one line and reversible - bf16, torch.compile, a larger micro-batch - should be tried immediately, because measuring costs more than trying. Optimizations that restructure the pipeline should be justified by the budget first. Those two categories deserve completely different thresholds and treating them the same is why teams either over-optimize or never start. WHAT I WOULD ACTUALLY PRESENT. The measured MFU, the budget showing which term binds, the estimated saving in days and dollars with the assumption stated, and the sensitivity - how the answer changes if the improvement is half what I expect. That makes it an engineering estimate rather than a pitch, and it also makes it checkable afterwards, which is what builds the credibility to do it again.",
          "deepDive": {
            "q": "Your job is at 18% MFU. Walk through the investigation and what you would expect to find.",
            "a": "EIGHTEEN PERCENT IS THE STRUCTURAL REGIME, not the tuning regime. Something is wrong in kind, and the available gain is large - potentially a factor of two or more - which justifies real investigation. I would run four experiments, each eliminating a category. EXPERIMENT 1: SYNTHETIC DATA. Replace the loader with a fixed tensor. If MFU jumps, the job is INPUT-BOUND and everything else is moot. At 18% this is the single most likely finding on a multi-node job, because feeding many accelerators from shared storage is genuinely hard and the DataLoader hides the pipeline so thoroughly that nobody suspects it. Ten minutes. EXPERIMENT 2: SINGLE DEVICE VERSUS MULTI. Measure MFU on one device and on the full job. If single-device MFU is also 18%, the problem is local - kernels, shapes, precision - and distribution is innocent. If single-device is 45% and the full job is 18%, you have lost most of it to distribution, which points at exposed communication or a straggler. This cleanly splits local from distributed and it is the experiment people skip. EXPERIMENT 3: PER-RANK STEP TIMES. If the distribution is skewed - one rank consistently slower - you have a STRAGGLER, and every rank waits at every collective so the whole job runs at that pace. Causes are mundane: a degraded disk, a thermally throttled device, an unbalanced data shard, a noisy co-tenant. Nothing about the model or the configuration fixes it, and identifying it saves you from a week of optimizing the wrong thing. EXPERIMENT 4: THE KERNEL BREAKDOWN, and specifically the kernel NAMES. If matmul time is a small fraction of a busy timeline, you are memory-bound and compilation is the lever. If you see generic or fallback kernels where tensor-core kernels should be, the shapes are missing the fast path - dimensions not multiples of eight or sixteen, an unusual dtype combination, a non-contiguous tensor forcing a copy. That last one produces exactly this symptom: a busy GPU at very low MFU, and padding a dimension can be a large fix. WHAT I WOULD EXPECT TO FIND, in rough order of likelihood at 18%. Input-bound, most often. A straggler, on a large cluster. Exposed communication, if the model is small relative to the device count so there is little compute to hide it behind. Shapes missing the fast path, which is under-diagnosed because the GPU looks busy. And a model that is simply too small for the hardware, where the matmuls cannot fill the device - in which case a larger batch or fewer devices is the answer rather than any optimization. THE ONE THAT WOULD SURPRISE ME. A correctly-shaped, compute-bound, well-fed transformer sitting at 18%. If all four experiments come back clean I would suspect the MFU calculation itself - the wrong peak for the precision, embeddings counted inconsistently in the parameter count, or the attention term omitted at long context, which understates the FLOPs and therefore the MFU. Verifying the denominator is worth doing before concluding the system is broken, and it takes five minutes."
          }
        },
        {
          "q": "What should be on by default in any training pipeline, regardless of profiling?",
          "a": "I WOULD SEPARATE THESE FROM OPTIMIZATIONS, because they are not exchanges - they cost essentially nothing and protect against outcomes that are expensive. NUMERICAL AND PRECISION. bf16 autocast where the hardware supports it, with NO GradScaler. It halves activation memory, speeds memory-bound work, and removes the loss-scaling subsystem entirely. On older hardware, fp16 with a scaler and the unscale-clip-step ordering. TF32 for matmuls, which is nearly free. STABILITY. A finite-gradient check before the optimizer step, which converts an unrecoverable poisoning into a logged skip for the cost of one reduction - and note this is the thing you lose when you delete the fp16 scaler, so bf16 users must add it explicitly. Gradient clipping with a threshold measured from your own gradient-norm distribution rather than inherited. And zero_grad with set_to_none. CORRECTNESS UNDER DISTRIBUTION. Broadcast or verify identical parameters at startup, because ranks that begin differently optimize different models while averaging gradients - which trains, converges worse, and never errors. Assert equal data-shard counts, because unequal counts hang rather than error. And ensure the skip decision is consistent across ranks, or replicas diverge permanently. CHECKPOINTING. Frequent enough that a rollback is cheap, and including the optimizer state, scheduler, scaler, RNG state and the DATA LOADER POSITION - that last one is routinely omitted and means a resume silently re-trains on data already seen, which matters enormously for single-pass training. OBSERVABILITY, which is the part most often missing and the cheapest to add. MFU, because it is the one absolute number. Step time split into data and compute. Per-rank step time, or at least the max-to-median ratio, so a straggler is visible. Peak memory with an alert on the trend. Gradient norm and clip fraction. The effective batch size, which silently changes when someone adds GPUs. Loss scale if using fp16. Accumulate these on the device and transfer once per interval, because a .item() per metric per step is a synchronization that measurably slows training - which would be an absurd way for a monitoring system to fail. AND ONE ALERT: no completed steps for some interval, because a HANG is the characteristic distributed failure and it needs an explicit detector rather than a human noticing. WHY THIS LIST IS DEFENSIBLE WITHOUT PROFILING. Every item either costs under a percent or costs nothing at all, and each protects against a failure that is silent and expensive - a dead run, a corrupted resume, a straggler nobody noticed for a week, a divergence with no diagnostic data. That is a different calculation from an optimization, whose value depends on which resource binds. Conflating the two is why pipelines often have neither: the guards get treated as optimizations and deferred until there is time to measure."
        },
        {
          "q": "Summarize what this module has been about.",
          "a": "THAT EVERY TECHNIQUE HERE IS AN EXCHANGE - it buys one scarce resource by spending another - and that THE EXCHANGE RATE IS A PROPERTY OF YOUR CONFIGURATION rather than of the technique. Mixed precision spends numerical headroom for memory, bandwidth and arithmetic, and buys nothing if you are input-bound. Compilation spends compile time and debuggability for fusion and fewer launches, and buys almost nothing if you are matmul-dominated. Checkpointing spends about a third of your compute for O(sqrt(L)) activation memory, and buys nothing if parameters rather than activations dominate. Accumulation spends wall-clock for effective batch, and buys nothing above the critical batch size. Sharding spends communication for capacity, and hurts if you were already communication-bound. Stability guards spend a fraction of throughput for protection against events that cost everything since the last checkpoint. And the data-pipeline choices spend storage, randomness or sample freshness for the ability to keep the accelerators fed at all. THE DISCIPLINE THAT FOLLOWS. Measure which resource binds, apply the lever that targets that resource, and re-measure - because optimizing a system RE-ORDERS its bottlenecks. The most memorable illustration is that after the parameter-side techniques have all done their work on a large fine-tune, the biggest remaining allocation can be the logits tensor: a term that did not become expensive, but stopped being dwarfed. A plan fixed in advance is wrong by its second step. THE HARD DEPENDENCY AT THE TOP. If the accelerator is idle, every technique in the module makes the accelerator faster or fit more onto it, and the accelerator is not the constraint. So the is-the-GPU-busy question is not the first step of an investigation, it determines whether the investigation applies. THE OBJECTIVE THAT SHOULD DECIDE. Time to a target loss, not step time - because checkpointing and accumulation make step time worse by construction and would be rejected by any procedure that optimizes it. That objective is the product of a statistical factor, how many steps the optimization needs, and a systems factor, how long each takes. Those pull against each other, which is why this cannot be reduced to a list. THE CONTRAST WITH THE PREVIOUS MODULE, which sharpens both. Module 15 was about abstractions hiding mechanisms that fail SILENTLY, so its discipline was to build diagnostics - the failure hides. This module is about deliberate trades whose benefits are INVISIBLE without measurement - the gain hides. Both demand instruments, for opposite reasons, and the profiler and the memory budget serve both. THE ONE-SENTENCE VERSION. Performance work in machine learning is not a list of techniques to apply but a sequence of measurements that tell you which single technique to apply next, and the most expensive mistake is spending a technique's price on a resource that was not the constraint."
        },
        {
          "q": "How would you hand this pipeline over to a team that did not build it?",
          "a": "THE PROBLEM WITH AN OPTIMIZED PIPELINE is that every technique in it encodes a decision made against a measurement that is no longer visible. Someone inheriting it sees checkpointing enabled and cannot tell whether activations were the binding term or whether it was added in a panic two years ago - and the cost of the wrong assumption is either a third of the compute or an out-of-memory. So the handover is mostly about restoring the reasoning. WHAT I WOULD DOCUMENT. (1) THE BUDGET AS MEASURED: which memory term bound and which time term bound, with the numbers and the date. This is the single most valuable artefact because it is what every configuration choice was derived from. (2) WHY EACH TECHNIQUE IS ON, in one line each, naming the term it addresses. Checkpointing because activations were 60% of peak. ZeRO-1 because optimizer state did not fit. Compile because 40% of step time was memory-bound kernels. That converts a configuration into a chain of reasoning. (3) THE MEASURED MFU and what it was before the work, which tells the next person how much headroom remains and therefore whether further optimization is worth their time. (4) THE INTERACTIONS THAT WERE DISCOVERED - the checkpoint boundaries aligned with FSDP units, the no_sync placement, the reason bf16 rather than fp16 - because these are precisely the things that look arbitrary and get tidied away by someone cleaning up the code. (5) THE THINGS DELIBERATELY NOT DONE, and why. That is as valuable as what was done, because it stops the next person repeating an experiment that failed. WHAT I WOULD LEAVE AS RUNNABLE ARTEFACTS rather than prose, since documentation drifts. A benchmark script that reproduces the key measurements - loader-only throughput, step-only time, MFU, per-rank distribution - so the budget can be re-derived in an afternoon rather than reconstructed. A structural test suite: parameter count, checkpoint round trip, gradient-flow check, and the sharded-versus-unsharded equivalence check if applicable. And the golden-output test, so a library upgrade that changes numerics is caught rather than discovered. WHAT I WOULD FLAG AS FRAGILE. Anything tuned to a specific hardware configuration - the wrapping granularity, the bucket sizes, the micro-batch - because those will need re-measuring on different hardware and will silently underperform if not. Anything that depends on shapes, because the recompile cliff is silent. And the effective batch size, because it changes when someone changes the device count and it changes the optimization problem rather than only the infrastructure. THE PRINCIPLE I WOULD STATE TO THEM. Every setting here was an exchange chosen against a measured constraint. If the model, the data, the batch size or the hardware changes, the constraint probably changed too, and the right response is to re-run the budget rather than to preserve the configuration. A pipeline is not a recipe; it is the output of a procedure, and the procedure is the thing worth inheriting."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The module's thesis",
        "back": "Every technique is an EXCHANGE - it buys one scarce resource by spending another - and the exchange RATE is a property of YOUR configuration, not of the technique. So the discipline is: measure which resource binds, apply that lever, RE-MEASURE."
      },
      {
        "type": "intuition",
        "front": "Step 0 is a hard dependency",
        "back": "IS THE ACCELERATOR BUSY? Run the loop on SYNTHETIC data. If the job is input-bound, mixed precision / compile / checkpointing / sharding all make the accelerator faster or fit more onto it - and it is IDLE. Nothing else applies until this is fixed."
      },
      {
        "type": "formula",
        "front": "Map each budget term to its lever",
        "back": "grad+opt (14P_t) -> LoRA or ZeRO-1. weights (2P) -> quantize or ZeRO-3. activations -> micro-batch FIRST, then segmented checkpointing. LOGITS (B*T*V*3) -> chunked cross-entropy. memory-bound kernels -> compile. exposed comms -> prefetch/hybrid/no_sync. idle -> straggler or .item()."
      },
      {
        "type": "pitfall",
        "front": "Optimization RE-ORDERS bottlenecks",
        "back": "Halving a component that was 50% makes everything else 67% of the new total. A prepared list applied top-to-bottom without re-profiling converges to optimizing things that stopped mattering three changes ago."
      },
      {
        "type": "pitfall",
        "front": "Do NOT optimize step time",
        "back": "Checkpointing and accumulation make step time worse BY CONSTRUCTION, so that objective rejects them regardless of whether they helped. Minimize n_steps(B_eff) x t_step - the product - which means running to a TARGET LOSS."
      },
      {
        "type": "intuition",
        "front": "The logits term stops being dwarfed",
        "back": "After LoRA, quantization and mixed precision have done their work, B*T*V*3 can be the LARGEST remaining allocation. It did not get more expensive - everything around it got cheap. The clearest instance of bottleneck re-ordering."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing x QLoRA, and x FSDP",
        "back": "QLoRA: the recomputed forward DEQUANTIZES the 4-bit base a second time. FSDP: if a checkpointed region spans FSDP units, recomputation triggers their parameter ALL-GATHERS again - recompute now costs BANDWIDTH. Align the boundaries."
      },
      {
        "type": "pitfall",
        "front": "fp16 -> bf16 deletes your skip guard",
        "back": "The GradScaler was ALSO doing skip-on-non-finite. Deleting it removes that protection, and the loop that was guarded now is not. The most commonly missing guard in a bf16 training loop - precisely because it was previously invisible."
      },
      {
        "type": "pitfall",
        "front": "Adding GPUs changes the OPTIMIZATION problem",
        "back": "effective batch = micro x accum x world_size. 8 -> 64 devices is an 8x batch increase needing a LR change. A run that diverges after scaling out is usually the linear scaling rule WITHOUT warmup, not a distributed bug. Log the effective batch."
      },
      {
        "type": "intuition",
        "front": "Guards are not optimizations",
        "back": "bf16 autocast, the finite-gradient check, clipping with a MEASURED threshold, frequent checkpoints including the LOADER POSITION, and the metrics set - each costs ~0 and protects against a silent, expensive failure. Different calculation from an exchange, so different threshold."
      },
      {
        "type": "intuition",
        "front": "Convert an optimization to days and dollars",
        "back": "FLOPs = 6ND; rate = n_dev x peak x MFU; time = ratio. 30% -> 40% MFU on a 19-day job saves ~6 days and a quarter of the budget. And Amdahl lets you DECLINE work with a number: a 15% component caps the gain at 17%."
      },
      {
        "type": "intuition",
        "front": "Module 15 vs Module 16",
        "back": "15: abstractions hide mechanisms that fail SILENTLY - build diagnostics, because the FAILURE hides. 16: deliberate trades whose benefits are INVISIBLE without measurement - profile, because the GAIN hides. Both demand instruments, for opposite reasons."
      }
    ],
    "refs": [
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      },
      {
        "title": "Chowdhery et al. (2022), PaLM: Scaling Language Modeling with Pathways",
        "url": "https://arxiv.org/abs/2204.02311"
      },
      {
        "title": "Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "Hoffmann et al. (2022), Training Compute-Optimal Large Language Models (Chinchilla)",
        "url": "https://arxiv.org/abs/2203.15556"
      },
      {
        "title": "PyTorch: Performance tuning guide",
        "url": "https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html"
      }
    ],
    "demos": [
      "scaling-laws",
      "batching",
      "mixed-precision",
      "lr-schedule"
    ]
  }
};
