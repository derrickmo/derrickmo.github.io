// GENERATED from content/lessons/training-systems/profiling.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/profiling/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "profiling": {
    "level": "core",
    "body": {
      "intuition": [
        "This lesson is the instrument the rest of the module depends on. Every other technique here is an exchange whose rate depends on your configuration, so applying any of them without knowing which resource binds is guessing - and Amdahl's law makes that quantitative rather than advisory: optimizing a component that is a fifth of your time caps your gain at 25% no matter how well you do it. The measurement that would have told you takes minutes.",
        "The metric that organizes performance work at scale is MODEL FLOPS UTILIZATION - the fraction of the hardware's theoretical peak arithmetic throughput you are actually achieving. It is powerful because it is ABSOLUTE. A throughput number tells you nothing without a reference; MFU tells you how much of the machine you are using and therefore how much is left. For large transformer training, something in the 30 to 50% range is respectable, above 50% is very good, and below 20% means something is structurally wrong rather than merely untuned. And it is computable from a FLOP model you can write down: roughly six times parameters times tokens for a transformer's training step, which turns 'is this fast' into arithmetic.",
        "The discipline that follows is a PERFORMANCE BUDGET that accounts for one hundred percent of step time. Every millisecond is compute, communication, data, or idle - and idle is the interesting category, because it is where the unexplained time hides. Starting from the theoretical time implied by the FLOP count and the device's peak, you explain each gap: this much lost to memory-bound operations, this much to communication that did not overlap, this much to a straggler rank, this much to a synchronization from logging. When the budget balances you know what to optimize and by how much. When it does not, the unexplained residual is the most valuable thing in the analysis."
      ],
      "math": [
        {
          "h": "The transformer FLOP model",
          "paras": [
            "Each parameter participates in one multiply-accumulate per token in the forward pass, which is two FLOPs. The backward pass costs roughly twice the forward, because it computes gradients with respect to both inputs and weights.",
            "That gives the standard six-times rule, which is accurate enough to budget with and is why it is used throughout the scaling literature."
          ],
          "tex": "C \\approx 6 N D \\;+\\; \\underbrace{12\\,L\\,H\\,D\\,S}_{\\text{attention, }O(S^2)\\text{ term}} \\qquad (N \\text{ params},\\; D \\text{ tokens},\\; S \\text{ seq len})",
          "texNote": "The 6 decomposes as 2 for the forward and 4 for the backward. The attention term is separate because it scales with sequence length rather than with parameters, and it is negligible at short context and dominant at long context - which is why the six-times rule is a good approximation for typical settings and a bad one at 32k tokens. Knowing where the crossover is for your configuration is worth the five minutes."
        },
        {
          "h": "Model FLOPs Utilization",
          "paras": [
            "Divide the useful arithmetic your model requires by the time taken and by the hardware's theoretical peak. It is a fraction, so it is comparable across models, hardware and scales.",
            "The definition uses the FLOPs the model logically needs, not the FLOPs actually executed - so recomputation from gradient checkpointing counts against you, which is correct, because it is overhead rather than useful work."
          ],
          "tex": "\\mathrm{MFU} = \\frac{6ND / t_{\\text{step}}}{N_{\\text{dev}} \\cdot P_{\\text{peak}}}",
          "texNote": "Two conventions worth distinguishing. MODEL FLOPs utilization counts only the arithmetic the model requires; HARDWARE FLOPs utilization also counts recomputation, so a checkpointed run has a higher HFU than MFU and the gap is exactly the recompute overhead. Report which one you mean. And use the peak for the PRECISION you are running - quoting bf16 tensor-core peak while running fp32 makes your MFU look terrible for the wrong reason."
        },
        {
          "h": "Scaling efficiency, and where it goes",
          "paras": [
            "Perfect scaling means per-device throughput is independent of device count. The shortfall is communication that did not overlap, stragglers, and any serial fraction.",
            "The straggler term is the one people forget and it is not an average - a single slow rank sets the pace for everyone, because every rank waits at the collective."
          ],
          "tex": "E(N) = \\frac{T_1}{N \\cdot T_N}, \\qquad T_N \\ge \\max_{i \\le N} t_i \\;+\\; t_{\\text{comm, exposed}}",
          "texNote": "Read the max: the step time is bounded below by the SLOWEST rank, so a distribution of per-rank times matters more than their mean. On a large cluster one bad disk, one thermally throttled device or one noisy neighbour presents as a uniform global slowdown, and no amount of pipeline or model optimization will touch it. Logging per-rank step times is how you tell."
        }
      ],
      "code": [
        {
          "h": "Compute MFU, and decide from it",
          "paras": [
            "Twenty lines that convert a throughput number into a statement about how much of the machine you are using - and therefore about how much is available."
          ],
          "code": "def transformer_flops(n_params, n_layers, n_heads, d_model, seq_len, tokens):\n    dense = 6 * n_params * tokens                       # fwd 2N + bwd 4N per token\n    attn  = 12 * n_layers * d_model * seq_len * tokens  # the O(S^2) term\n    return dense + attn\n\ndef mfu(flops, step_time_s, n_dev, peak_flops_per_dev):\n    return flops / step_time_s / (n_dev * peak_flops_per_dev)\n\n#  USE THE PEAK FOR THE PRECISION YOU ARE RUNNING. Quoting bf16 tensor-core\n#  peak while running fp32 makes your MFU look terrible for the wrong reason.\n\n#  READ THE RESULT:\n#    > 50%   excellent - you are near the practical ceiling; remaining wins are\n#            algorithmic (better attention kernels) or precision\n#    30-50%  respectable for large-scale training; incremental work pays\n#    20-30%  something is leaking - check overlap, data, and small-kernel time\n#    < 20%   STRUCTURALLY wrong. Not a tuning problem. Look for an idle GPU, a\n#            straggler, unoverlapped communication, or a model whose shapes do\n#            not use tensor cores at all.\n\n# MFU vs HFU - report which you mean:\n#   MODEL FLOPs util    counts only the arithmetic the MODEL requires\n#   HARDWARE FLOPs util also counts RECOMPUTATION (checkpointing)\n#   The gap between them IS your recompute overhead, which is a useful number\n#   in its own right - it tells you what checkpointing is costing.\n\n# THE ATTENTION CROSSOVER, worth computing once for your config:\nfor S in (512, 2048, 8192, 32768):\n    d, a = transformer_flops(N, L, H, d_model, S, tokens=S)\n    print(S, f\"attention is {100*a/(d+a):.0f}% of FLOPs\")\n#   Short context: the 6ND rule is a good approximation. Long context: the\n#   quadratic term dominates and budgeting with 6ND alone is badly wrong.",
          "caption": "MFU is absolute where throughput is relative - it says how much of the machine you are using and therefore how much is left. Below 20% is a structural problem rather than a tuning one, which redirects the whole investigation."
        },
        {
          "h": "A performance budget that accounts for 100% of step time",
          "paras": [
            "The discipline that makes the analysis terminate. Start from the theoretical time, explain every gap, and treat the unexplained residual as the finding."
          ],
          "code": "# 1. THE FLOOR: what the arithmetic alone would take at peak.\nt_ideal = flops / (n_dev * peak_flops)\n\n# 2. THE ACTUAL, measured with warm-up and synchronization.\nt_actual = measure_steady_state()\n\n# 3. ATTRIBUTE EVERY MILLISECOND. From the profiler timeline:\nbudget = {\n  \"matmul kernels\":        t_matmul,      # useful arithmetic, near peak\n  \"memory-bound kernels\":  t_elementwise, # norms, activations, adds -> fuse\n  \"communication EXPOSED\": t_comm_gap,    # all-reduce NOT hidden behind compute\n  \"data stalls\":           t_input_wait,  # GPU idle waiting on the loader\n  \"launch gaps\":           t_launch,      # picket fence -> compile / CUDA graphs\n  \"synchronization\":       t_sync,        # .item(), prints, tensor-valued ifs\n  \"recompute\":             t_ckpt,        # gradient checkpointing overhead\n}\nresidual = t_actual - t_ideal - sum(budget.values())\n#   THE RESIDUAL IS THE MOST VALUABLE NUMBER HERE. If it is large, your model\n#   of where time goes is wrong, and everything you plan from it is guesswork.\n\n# 4. THE STRAGGLER CHECK - specific to distributed and routinely missed.\n#    Step time is bounded below by the SLOWEST rank, so an average hides it.\nts = [None] * world; dist.all_gather_object(ts, local_step_time)\nif max(ts) > 1.15 * median(ts):\n    print(\"STRAGGLER: rank\", ts.index(max(ts)), max(ts), \"vs median\", median(ts))\n#   One bad disk, one throttled device or one noisy neighbour presents as a\n#   UNIFORM global slowdown. No model or pipeline work will touch it.\n\n# 5. THE SCALING CURVE, which tells you where the ceiling is:\n#    run at 1, 2, 4, 8, ... devices with the SAME per-device batch and plot\n#    per-device throughput. Flat = perfect scaling. A cliff at the node\n#    boundary = the inter-node interconnect. A gentle decline = growing\n#    communication overhead. Twenty minutes, and it bounds every later claim.",
          "caption": "The residual is the finding. A budget that leaves 40% unexplained means your model of where the time goes is wrong, and every optimization planned from it is guesswork."
        }
      ],
      "useCases": [
        "Deciding what to optimize on a large training job, where Amdahl's law makes the profile the only defensible basis - and where discovering that the data pipeline is 60% of step time invalidates every model-side change you were considering.",
        "Capacity planning and cost estimation: MFU plus the FLOP model gives GPU-hours to a target and therefore a dollar figure, before the run starts and in a form that can be checked against the invoice afterwards.",
        "Justifying hardware or configuration changes, since MFU is absolute and comparable - a claim that a change improved throughput 20% is much stronger when it is stated as MFU rising from 32% to 38% against a known ceiling.",
        "Diagnosing poor scaling on a cluster, where the scaling curve's shape distinguishes communication overhead from stragglers from an input pipeline that cannot feed more devices - three problems with unrelated fixes."
      ],
      "pitfalls": [
        "Optimizing before profiling. Amdahl bounds your gain by the fraction you are improving, so effort on an unmeasured component has an expected payoff near zero - and a 60% data pipeline makes every model-side change nearly worthless.",
        "Quoting MFU against the wrong peak. Use the theoretical peak for the precision you are actually running; comparing bf16 throughput against fp32 peak, or against a sparse-tensor-core figure you are not using, produces numbers that are meaningless in either direction.",
        "Confusing model FLOPs utilization with hardware FLOPs utilization. HFU counts recomputation from gradient checkpointing and MFU does not, so a checkpointed run reports a higher HFU. State which you mean - the gap between them is exactly your recompute overhead.",
        "Using the six-times rule at long context. The attention term scales with sequence length and is negligible at 2k tokens and dominant at 32k, so budgeting with 6ND alone at long context understates the work badly.",
        "Reading average utilization on a multi-node job. One slow rank makes every rank wait at the collective, so all of them show low utilization while only one has a problem. Log per-rank step times and look at the distribution.",
        "Timing without warm-up and synchronization. Early iterations include autotuning, allocator growth and possibly compilation, and CUDA launches are asynchronous - so timing without both measures the wrong thing and the error always flatters the device.",
        "Accepting a performance budget with a large unexplained residual. If 40% of step time is unaccounted for, your model of the system is wrong and every optimization planned from it is guesswork. The residual is the finding, not a rounding error."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "The single-machine version of the same discipline - timeline signatures, the roofline, and finding a stall. This lesson adds the absolute framing: MFU against a theoretical ceiling, and a budget that must account for all of the time."
        },
        {
          "ref": "training-systems/optimized-pipeline",
          "text": "Where the measurements become decisions. The capstone's first move is to establish which resource binds, because every technique in the module targets a different one and applying the wrong one gives nothing."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "The six-times FLOP rule is the same accounting used to state compute budgets in the scaling literature, which is why MFU converts directly into a position on those curves and into a cost estimate."
        },
        {
          "ref": "training-systems/data-loading-scale",
          "text": "The most common finding a profile produces at scale, and the one that invalidates the rest of the module - an idle accelerator cannot be helped by making it faster."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "Where the communication term in the budget comes from, and why the scaling curve's shape - a cliff at the node boundary versus a gentle decline - identifies which collective is exposed."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is MFU?",
          "a": "Model FLOPs Utilization - the fraction of the hardware's theoretical peak arithmetic throughput that your model's required FLOPs actually achieve."
        },
        {
          "q": "Why is MFU better than a throughput number?",
          "a": "It is absolute. Throughput means nothing without a reference; MFU says how much of the machine you are using and therefore how much is left."
        },
        {
          "q": "What is the transformer FLOP rule?",
          "a": "About 6ND for training - two per parameter per token forward, four backward - plus a separate attention term that scales with sequence length."
        },
        {
          "q": "When does the six-times rule break down?",
          "a": "At long context, where the quadratic attention term dominates. It is a good approximation at 2k tokens and badly wrong at 32k."
        },
        {
          "q": "What MFU should you expect?",
          "a": "Roughly 30 to 50% is respectable for large transformer training, above 50% is very good, and below 20% indicates something structurally wrong rather than untuned."
        },
        {
          "q": "What is the difference between MFU and HFU?",
          "a": "Hardware FLOPs utilization counts recomputation from gradient checkpointing; model FLOPs utilization does not. The gap between them is exactly your recompute overhead."
        },
        {
          "q": "Which peak should you divide by?",
          "a": "The theoretical peak for the precision you are actually running. Comparing bf16 throughput against fp32 peak produces a meaningless number."
        },
        {
          "q": "What is a performance budget?",
          "a": "An accounting that attributes one hundred percent of step time - compute, communication, data, launch gaps, synchronization, recompute - starting from the theoretical floor."
        },
        {
          "q": "Why does the residual matter?",
          "a": "A large unexplained residual means your model of where the time goes is wrong, so every optimization planned from it is guesswork. It is the finding, not a rounding error."
        },
        {
          "q": "What does Amdahl's law say about optimization order?",
          "a": "Improving a component that is fraction p of the time caps your total gain at 1/(1-p). Work on an unmeasured component has an expected payoff near zero."
        },
        {
          "q": "Why is a single straggler so damaging?",
          "a": "Step time is bounded below by the slowest rank, because every rank waits at the collective. One bad node presents as a uniform global slowdown."
        },
        {
          "q": "What does a scaling curve tell you?",
          "a": "Flat per-device throughput means perfect scaling; a cliff at the node boundary points at the interconnect; a gentle decline points at growing communication overhead."
        }
      ],
      "standard": [
        {
          "q": "Explain MFU and how you would use it to decide what to optimize.",
          "a": "WHAT IT IS. Model FLOPs Utilization is the arithmetic your model logically requires, divided by the time taken and by the hardware's theoretical peak. For a transformer the numerator is about six times parameters times tokens - two FLOPs per parameter per token in the forward pass, four in the backward - plus a separate attention term scaling with sequence length. WHY IT IS THE RIGHT HEADLINE METRIC. It is ABSOLUTE. Tokens per second is meaningless without knowing the model and the hardware; MFU is a fraction, so it is comparable across models, precisions and cluster sizes, and it tells you how much headroom remains. If you are at 45%, the most a perfect optimization could buy is roughly a factor of two, which bounds every claim anyone makes about a proposed change. If you are at 12%, most of the machine is idle and the problem is structural rather than a matter of tuning. HOW I WOULD READ IT. Above 50% is very good and the remaining wins are algorithmic - better attention kernels, lower precision - rather than configuration. Thirty to fifty percent is respectable for large-scale training and incremental work pays. Twenty to thirty means something is leaking. Below twenty means look for an idle accelerator, a straggler, unoverlapped communication, or shapes that do not use tensor cores at all - and no amount of hyperparameter work will touch it. THE CONVENTIONS TO STATE, because they change the number. Use the peak for the PRECISION you are running. And distinguish MODEL from HARDWARE FLOPs utilization: HFU also counts recomputation from gradient checkpointing, so a checkpointed run reports a higher HFU, and the gap between the two is exactly what checkpointing is costing you - which is a useful number in itself. HOW I WOULD USE IT TO DECIDE. MFU tells you HOW MUCH is available; the profile tells you WHERE it went. So I would compute MFU first to size the opportunity, then build a PERFORMANCE BUDGET that accounts for one hundred percent of step time: matmul kernels, memory-bound kernels, exposed communication, data stalls, launch gaps, synchronization, recompute. Every millisecond gets a category. Then the optimization follows mechanically - large memory-bound fraction means fusion and compile; large exposed communication means overlap or a different sharding strategy; large data stalls mean the input pipeline and nothing else matters; large launch gaps mean CUDA graphs or a bigger batch. AND THE RESIDUAL IS THE MOST VALUABLE PART. If forty percent of step time is unexplained, my model of the system is wrong and everything I plan is guesswork. Chasing the residual until the budget balances is what makes the analysis terminate rather than continue indefinitely. THE ONE THING I WOULD ADD AT SCALE. Check per-rank step times, not the average. A single slow rank sets the pace for everyone because every rank waits at the collective, so it presents as a uniform global slowdown that no model or pipeline work will fix.",
          "deepDive": {
            "q": "Derive the 6ND rule and say precisely where it is inaccurate.",
            "a": "THE FORWARD PASS. Consider a weight matrix of shape (in, out) applied to one token. That is a matrix-vector product: in times out multiply-accumulate operations. A multiply-accumulate is conventionally counted as TWO FLOPs, one multiply and one add. So the cost is 2 times the number of parameters in that matrix, per token. Summing over all weight matrices, the forward pass costs about 2N FLOPs per token, where N is the parameter count. THE BACKWARD PASS. It computes two things: the gradient with respect to the layer's INPUT, which is needed to continue propagating, and the gradient with respect to the WEIGHTS. Each is a matrix product of the same shape as the forward, so each costs about 2N per token, giving 4N total. Hence 6N per token for a full training step, and 6ND for D tokens. That is the rule, and its derivation is short enough to reconstruct in an interview, which is worth being able to do. WHERE IT IS INACCURATE, in order of how much it matters. (1) ATTENTION IS NOT COUNTED. The query-key product and the attention-value product are not parameter multiplications - their cost scales with sequence length, not parameter count. The extra term goes like 12 times layers times model dimension times sequence length, per token, so it is QUADRATIC in sequence length overall. At 2k context on a large model it is a small percentage and ignorable. At 32k it can dominate. So the rule's accuracy is a function of your context length, and computing the crossover for your configuration takes five minutes and prevents a badly wrong budget. (2) IT COUNTS ONLY MATRIX MULTIPLICATIONS. Layer norms, activations, softmaxes, residual adds and dropout are all excluded. Their FLOP count is genuinely small - which is why the rule works - but their TIME is not, because they are memory-bound. This is the crucial subtlety: the rule is a good model of the ARITHMETIC and a poor model of the TIME, and the gap between them is precisely what MFU measures. A model spending half its time on elementwise operations has a low MFU even though its matmuls are running at peak. (3) EMBEDDINGS. The input embedding is a lookup, not a matmul, so it should not be counted; the output projection to vocabulary IS a matmul and should be. Whether N includes the embedding parameters changes the number, and different papers make different choices - which is a real source of confusion when comparing MFU figures across sources. (4) RECOMPUTATION. Gradient checkpointing performs extra forward passes, which are real FLOPs executed but not FLOPs the model requires. MFU excludes them by convention, HFU includes them - hence the two metrics. (5) MoE MODELS break the rule entirely, because only a fraction of parameters are active per token; you must count ACTIVE parameters, and this is a common error when comparing a mixture-of-experts model against a dense one. WHY THE RULE SURVIVES DESPITE ALL THAT. Because for a standard dense transformer at typical context lengths, matrix multiplications are the overwhelming majority of the arithmetic, and the corrections are small or accountable. It gives you a number good to within a few percent for the case it was designed for, which is exactly what a budget needs - and knowing the five cases above tells you when to stop trusting it."
          }
        },
        {
          "q": "Your job scales poorly from 8 to 64 GPUs. How do you find out why?",
          "a": "BUILD THE SCALING CURVE FIRST, because its SHAPE identifies the cause before any profiling. Run at 1, 2, 4, 8, 16, 32, 64 devices with the SAME per-device batch, and plot per-device throughput. Flat means perfect scaling. A GENTLE DECLINE points at communication overhead growing. A CLIFF AT THE NODE BOUNDARY - typically at 8 or 16 devices - points at the inter-node interconnect, since within a node you have fast links and between nodes you do not. NO SCALING AT ALL from one to two suggests something is serializing entirely. This takes twenty minutes and it bounds every subsequent claim. THEN SEPARATE THE FOUR CANDIDATES. (1) COMMUNICATION NOT OVERLAPPING. DDP launches a bucket's all-reduce as it fills during backward, so most communication should hide behind computation. Check the profiler timeline for NCCL kernels running concurrently with compute; visible gaps aligned with communication is the diagnosis. Common causes: gradient accumulation without no_sync, so you all-reduce every micro-step instead of once; find_unused_parameters delaying bucket readiness; or a model whose backward finishes too fast relative to the communication volume. (2) A STRAGGLER, which is the one people miss because utilization is an average. Log per-rank step times and look at the DISTRIBUTION - if one rank is consistently 20% slower, every rank waits at the collective and the whole job runs at that pace. Causes are mundane: a degraded disk, a thermally throttled device, a noisy co-tenant, an unbalanced data shard. Nothing about the model or the pipeline will fix it, and identifying it saves you from optimizing the wrong layer entirely. (3) THE INPUT PIPELINE NOT SCALING. Eight nodes hitting one shared filesystem mount is a different workload from one node, and it can hit a hard ceiling. The test is to run with SYNTHETIC data - a fixed tensor in a loop - and see whether scaling recovers. If it does, the pipeline is the constraint and this is a storage problem rather than a training one. (4) THE EFFECTIVE BATCH CHANGED. This is not a performance issue but it is the most common confusion: eight times the ranks is eight times the effective batch, which changes the optimization problem and requires a learning-rate adjustment. A run that appears to scale but converges worse is this, not a systems problem. THE MEASUREMENT DISCIPLINE. Use the same per-device batch across the sweep or you are measuring two things at once. Warm up and synchronize. And bypass the data loader with synthetic data for the pure scaling measurement, then re-introduce it - the difference between the two curves is the pipeline's contribution, isolated. WHAT I WOULD REPORT. Scaling efficiency at each size, the per-rank step-time distribution, and the fraction of step time that is exposed communication. Those three explain essentially every poor-scaling case, and only the first is usually collected."
        },
        {
          "q": "How do you build a performance budget, and what do you do with the residual?",
          "a": "THE STRUCTURE. Start from the theoretical floor - the FLOPs your model requires divided by the aggregate peak - and then attribute every millisecond of the gap between that and the measured step time. The categories are: matmul kernels, which is useful work; memory-bound kernels, which is real work running below peak; exposed communication, meaning collectives not hidden behind compute; data stalls, meaning the device idle waiting on input; launch gaps, meaning too many small kernels; synchronization, meaning host-device round trips from logging or tensor-valued control flow; and recompute, if checkpointing is on. The rule is that the categories must sum to the measured time. WHERE THE NUMBERS COME FROM. The profiler timeline gives kernel time by category and shows the gaps directly. Per-rank timing gives the straggler component. Running with synthetic data isolates the input contribution. Running single-device isolates the communication contribution. Each is a separate short experiment and together they populate the budget. WHAT THE BUDGET IS FOR. It converts optimization from a list of things one could try into a ranked list with expected values. If memory-bound kernels are 35% of step time, fusing them with torch.compile has a ceiling of 35% and a realistic gain of maybe half that. If exposed communication is 5%, perfecting the overlap is worth at most 5% and should not be the priority regardless of how interesting it is. That is Amdahl applied per category, and it stops the common pattern of optimizing whatever is most familiar. WHAT TO DO WITH THE RESIDUAL, which is the substance of the question. A residual is time you cannot explain, and it means your model of the system is WRONG. That matters more than its size, because every plan you make from an incorrect model is guesswork. So I would chase it rather than round it away. The usual culprits: kernels you did not attribute because they had unfamiliar names, often a fallback implementation running because a shape or dtype missed a fast path; memory allocation and caching-allocator behaviour, visible as gaps that do not correspond to any kernel; CPU-side overhead in the training loop itself, which is invisible on the device timeline and requires looking at the host row; and time inside collectives that is actually WAITING for a straggler rather than communicating, which is a common misattribution because it appears as NCCL kernel time. HOW I WOULD KNOW WHEN TO STOP. When the residual is small enough that it cannot change the ranking of the categories. If it is 3% you are done; if it is 40% you have not started. And I would state the residual explicitly in any performance report, because a budget that quietly omits it is claiming more understanding than it has. THE HABIT THIS BUILDS. Accounting for all of the time, rather than for the parts you can name, is what turns performance work from a sequence of experiments into an analysis with a conclusion.",
          "deepDive": {
            "q": "How would you turn MFU into a cost estimate and a capacity plan?",
            "a": "THE CHAIN OF ARITHMETIC, and each step is checkable. (1) TOTAL COMPUTE REQUIRED. From the FLOP model: about 6ND for a dense transformer, where N is parameters and D is total training tokens. Add the attention term if the context is long. For a 7B model on 1T tokens that is about 4.2e22 FLOPs. (2) EFFECTIVE THROUGHPUT. Aggregate peak times MFU. If a device gives about 1e15 bf16 FLOPs per second and you achieve 40% MFU on 64 devices, that is 2.56e16 effective FLOPs per second. (3) WALL-CLOCK. Divide: 4.2e22 over 2.56e16 is about 1.6e6 seconds, roughly 19 days. (4) COST. Multiply device-hours by the hourly rate. 64 devices for 19 days is about 29,000 device-hours; at a given rate that is a number you can put in a proposal and check against an invoice. WHAT THIS IS ACTUALLY FOR, beyond a number. It makes the MFU improvement CONCRETE. Going from 30% to 40% MFU on that job saves about six days and a quarter of the budget, which is a far more persuasive case for a week of performance work than 'the profile looks bad'. It also tells you whether a proposed configuration is feasible at all before you commission the cluster. THE PLANNING QUESTIONS IT ANSWERS. Given a deadline and a budget, what model size and token count are reachable - which is the same arithmetic solved for a different variable, and it connects directly to the compute-optimal scaling results, since those tell you how to SPLIT a fixed compute budget between parameters and tokens. Given a fixed cluster, how long. Given a fixed deadline, how many devices - remembering that scaling efficiency falls, so twice the devices is not half the time, and the scaling curve is what tells you the real factor. THE ADJUSTMENTS THAT MATTER IN PRACTICE. Add checkpoint overhead and evaluation time, which are real and are omitted from every naive estimate. Add an allowance for restarts - at scale, node failures are routine, and a plan with no failure budget is wrong. Distinguish MFU from HFU if you are checkpointing, since the extra recomputation is real wall-clock even though it is not useful FLOPs. And use the achieved MFU from a short pilot run rather than an aspirational one, because the difference between assumed and measured MFU is usually the largest error in the whole estimate. WHAT I WOULD PRESENT. The estimate, the MFU it assumes, the source of that MFU (measured on a pilot, or assumed from literature), and the sensitivity - how the answer moves if MFU is 30% instead of 40%. That last one is what makes it an engineering estimate rather than a number, and it also makes the case for the performance work self-evident."
          }
        },
        {
          "q": "What are the most common causes of low MFU, and how do you distinguish them?",
          "a": "SIX CAUSES, each with a distinguishing signature, and I would work through them in this order because it is roughly the order of frequency. (1) THE DEVICE IS IDLE - input-bound. Signature: low utilization, long empty stretches on the GPU timeline. Test: run with synthetic data; if MFU jumps, the pipeline is the constraint. This is the most common cause at scale and it is under-diagnosed because the DataLoader hides the pipeline so thoroughly. (2) A LARGE MEMORY-BOUND FRACTION. Signature: the device is busy, but the time is dominated by elementwise kernels, normalizations, activations - operations with low arithmetic intensity that run far below peak by construction. Test: split kernel time into matmul versus everything else; if the second exceeds the first, this is it. Fix: fusion via torch.compile, lower precision to halve the traffic, better attention kernels. (3) EXPOSED COMMUNICATION. Signature: NCCL kernels visible on the timeline with compute idle alongside. Test: compare single-device MFU against multi-device; the difference is the communication cost. Fix: overlap, bucketing, no_sync under accumulation, or a different sharding strategy. (4) LAUNCH-BOUND. Signature: a dense picket fence of very short kernels with gaps between them. Test: count kernels per step and compare their total duration against step time. Fix: CUDA graphs via reduce-overhead mode, a larger batch, or fusion. Most severe at small batch sizes. (5) SHAPES THAT MISS THE FAST PATH. Signature: MFU low even though the model is matmul-dominated and the device is busy. Cause: dimensions that are not multiples of 8 or 16 fall off tensor-core paths; an unusual dtype combination selects a generic kernel; a non-contiguous tensor forces a strided access or a copy. Test: look at kernel NAMES in the profile - a generic or fallback kernel where you expected a tensor-core one is an immediate finding. Fix: pad dimensions, check memory format. (6) A STRAGGLER, in distributed jobs. Signature: every rank shows low utilization while per-rank step times are skewed. Test: log per-rank times and compare max against median. Fix: find the bad node; nothing else helps. HOW I WOULD SEQUENCE THE INVESTIGATION. Utilization first, because it separates idle from busy in seconds. Then synthetic data, because it separates input-bound from everything else in ten minutes. Then single-device versus multi-device, which isolates communication. Then the kernel breakdown, which separates memory-bound from launch-bound from fast-path problems. Four experiments, each cheap, and together they identify all six. THE POINT I WOULD MAKE ABOUT ORDER. Each test eliminates a category rather than confirming one, which is what makes the sequence terminate. Starting with the profiler's operator table instead - which is where people usually start - gives you a ranking of kernels without telling you whether kernels are the problem at all."
        },
        {
          "q": "How does this lesson relate to the rest of the module?",
          "a": "IT IS THE INSTRUMENT THE MODULE DEPENDS ON, and stating that relationship precisely is the point. Every other technique here is an EXCHANGE - it buys one scarce resource by spending another - and the exchange rate is a property of your configuration rather than of the technique. Mixed precision buys memory and speed with numerical headroom, and buys nothing if you are input-bound. Compilation buys throughput with compile time, and buys nothing if you are matmul-dominated. Checkpointing buys memory with a third of your compute, and buys nothing if parameters rather than activations dominate. Accumulation buys effective batch with wall-clock, and buys nothing above the critical batch size. Sharding buys memory with communication, and hurts if you were already communication-bound. In every case the question is which resource currently binds, and that is a measurement. WHAT AMDAHL ADDS. It makes the argument quantitative rather than advisory. Optimizing a component that is 20% of your time caps your gain at 25% no matter how well you execute. So the ORDER of the work is fully determined by the profile, and the expected value of working without one is close to zero. That is a stronger claim than 'measure first' as a slogan, and it is why I would treat the profile as a prerequisite rather than a diagnostic. WHAT MFU ADDS ON TOP. It gives an ABSOLUTE reference. A profile tells you where the time went; MFU tells you how much time there was to save. At 45% MFU the total available improvement is bounded by roughly a factor of two, which caps every proposal anyone makes. At 12% the problem is structural and the module's techniques are mostly irrelevant until it is fixed. Knowing which regime you are in determines whether you are tuning or debugging. THE ORDERING CLAIM THIS ESTABLISHES, which the capstone then applies. If you are input-bound, nothing else in this module matters - mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more on it, and the accelerator is idle. So the very first question is whether the device is busy, and only after that does the rest of the module become relevant. That is not an ordering of convenience, it is a logical dependency. THE CONTRAST WITH MODULE 15, which sharpens both. There, the discipline was to build diagnostics because failures are SILENT - a wrong model still trains. Here, the discipline is to measure because benefits are INVISIBLE - a technique that bought nothing looks exactly like one that bought a lot until you measure. Both demand instruments, for opposite reasons: there because the failure hides, here because the gain does."
        },
        {
          "q": "What would you monitor continuously on a long training run, as opposed to profiling once?",
          "a": "THE DISTINCTION MATTERS: profiling is an investigation you run deliberately, monitoring is what tells you an investigation is needed. They collect different things. THE CONTINUOUS SET, all cheap enough for every step or every few steps. (1) MFU, computed from step time and the known FLOP count. One line, and it is the single number that says whether the job is healthy in performance terms. A drop in MFU is the alert that starts everything else. (2) STEP TIME, and separately DATA TIME and COMPUTE TIME, so a pipeline regression is distinguishable from a compute regression without profiling. (3) PER-RANK STEP TIME, or at minimum the max-to-median ratio, because a straggler appearing mid-run - a node degrading, a disk failing - is common on long jobs and presents as a global slowdown. (4) TOKENS PER SECOND, which is what the budget and the deadline are actually denominated in. (5) PEAK MEMORY, with an alert on the trend, because a slow leak found on day one is a five-minute fix and the same leak found when a two-week run dies at hour 300 has cost the run. (6) GPU UTILIZATION, as a coarse cross-check on the rest. THE STABILITY METRICS ALONGSIDE, since they share the same dashboard: gradient norm, clip fraction, loss scale, skip count. Those are leading indicators of a different kind of failure and they cost nothing. WHAT I WOULD ALERT ON rather than merely plot. MFU dropping more than some percentage below its recent median, which catches a straggler, a storage degradation, or a thermal problem. The max-to-median rank ratio exceeding a threshold. Peak memory trending upward. And the job producing no steps for some interval, which catches a hang - and a hang is the characteristic distributed failure, so it needs an explicit detector rather than being noticed by a human. WHAT I WOULD NOT COLLECT CONTINUOUSLY. Full profiler traces, which are expensive and enormous - instead I would capture a short trace on a schedule, say a few steps every hour, so there is a recent one available when something changes and I do not have to reproduce the condition. Per-layer statistics, likewise on a cadence rather than every step. THE IMPLEMENTATION CONSTRAINT that decides whether this is practical. Every .item() is a device-to-host synchronization that drains the pipeline, so naively logging ten scalars per step measurably slows training - which is a genuinely absurd outcome for a monitoring system. Accumulate on the device and transfer once per interval. THE PRINCIPLE. Profiling answers where the time goes; monitoring answers whether that changed. On a long run the second question is the one you cannot afford to answer only retrospectively, because by then the run is over and the conditions are gone."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "MFU",
        "back": "MFU = (6ND / t_step) / (n_dev * peak_flops). ABSOLUTE, unlike throughput - it says how much of the machine you use and therefore how much is LEFT. Use the peak for the PRECISION you are running."
      },
      {
        "type": "formula",
        "front": "The 6ND rule, derived",
        "back": "Forward: 2 FLOPs per parameter per token (one multiply-accumulate). Backward: 4N - it computes gradients w.r.t. INPUTS and w.r.t. WEIGHTS, each a same-shaped matmul. Total 6N per token. Plus a separate O(S^2) attention term."
      },
      {
        "type": "intuition",
        "front": "How to read an MFU number",
        "back": ">50% excellent (remaining wins are algorithmic). 30-50% respectable for large training. 20-30% something is leaking. <20% STRUCTURALLY wrong - idle GPU, straggler, unoverlapped comms, or shapes missing tensor cores. Not a tuning problem."
      },
      {
        "type": "definition",
        "front": "MFU vs HFU",
        "back": "MODEL FLOPs util counts only arithmetic the model REQUIRES. HARDWARE FLOPs util also counts RECOMPUTATION. So a checkpointed run has higher HFU, and the GAP between them is exactly your recompute overhead. Always state which you mean."
      },
      {
        "type": "pitfall",
        "front": "The 6ND rule breaks at long context",
        "back": "The attention term scales with SEQUENCE LENGTH, not parameters - negligible at 2k, dominant at 32k. Also excluded: layer norms, activations, softmax - small in FLOPs, large in TIME because they are memory-bound. The rule models ARITHMETIC, not time."
      },
      {
        "type": "intuition",
        "front": "The performance budget must sum to 100%",
        "back": "matmul + memory-bound + exposed comms + data stalls + launch gaps + synchronization + recompute = measured step time. THE RESIDUAL IS THE FINDING: 40% unexplained means your model of the system is wrong and every plan from it is guesswork."
      },
      {
        "type": "formula",
        "front": "Amdahl, applied per category",
        "back": "Improving a component that is fraction p of time caps the total gain at 1/(1-p). So a budget converts 'things to try' into a RANKED list with expected values - and stops the pattern of optimizing whatever is most familiar."
      },
      {
        "type": "pitfall",
        "front": "A single straggler sets the pace for everyone",
        "back": "T_N >= max_i(t_i) + exposed comms. Every rank waits at the collective, so ONE bad disk or throttled device presents as a UNIFORM global slowdown. Utilization is an AVERAGE - log per-rank step times and compare max to median."
      },
      {
        "type": "intuition",
        "front": "The scaling curve's SHAPE names the cause",
        "back": "FLAT = perfect. GENTLE DECLINE = growing communication overhead. CLIFF at the node boundary = the inter-node interconnect. NO scaling from 1->2 = something serializes. Same per-device batch throughout, or you measure two things at once."
      },
      {
        "type": "intuition",
        "front": "Four experiments identify every low-MFU cause",
        "back": "(1) utilization -> idle vs busy. (2) SYNTHETIC data -> input-bound vs not. (3) single vs multi device -> communication cost. (4) kernel breakdown + NAMES -> memory-bound vs launch-bound vs missed fast path. Each ELIMINATES a category."
      },
      {
        "type": "formula",
        "front": "MFU to a cost estimate",
        "back": "FLOPs = 6ND; effective rate = n_dev * peak * MFU; wall-clock = FLOPs/rate; cost = device-hours x rate. 30% -> 40% MFU on a 19-day job saves ~6 days and a quarter of the budget - a far better case for a week of perf work than 'the profile looks bad'."
      },
      {
        "type": "intuition",
        "front": "Profiling vs monitoring",
        "back": "Profiling answers WHERE the time goes; monitoring answers whether that CHANGED. Monitor MFU, step/data/compute time, per-rank max-to-median, peak memory trend, and alert on no-steps-for-N-minutes - because a HANG is the characteristic distributed failure."
      }
    ],
    "refs": [
      {
        "title": "Chowdhery et al. (2022), PaLM: Scaling Language Modeling with Pathways (MFU)",
        "url": "https://arxiv.org/abs/2204.02311"
      },
      {
        "title": "Kaplan et al. (2020), Scaling Laws for Neural Language Models (the 6ND accounting)",
        "url": "https://arxiv.org/abs/2001.08361"
      },
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      },
      {
        "title": "PyTorch: Holistic Trace Analysis for distributed training",
        "url": "https://pytorch.org/blog/trace-analysis-for-masses/"
      }
    ],
    "demos": [
      "batching",
      "scaling-laws",
      "autoscaling",
      "mixed-precision"
    ]
  }
};
