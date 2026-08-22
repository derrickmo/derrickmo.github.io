// GENERATED from content/lessons/training-systems/fsdp.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/fsdp/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "fsdp": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Data parallelism replicates the model on every device, so per-device memory is sixteen bytes per parameter regardless of how many devices you add. That is the number to hold: under mixed-precision Adam it is 2 for the fp16 weights, 2 for the fp16 gradients, 4 for the fp32 master copy, and 8 for Adam's two moments. Adding accelerators buys you throughput and never buys you capacity. A 7.5B model needs about 120 GB per device under DDP, which fits nothing - so at some scale replication stops being an option and the state has to be divided.",
        "ZeRO divides it in stages, and the stages are choices about where to stop in the identity that all-reduce equals reduce-scatter followed by all-gather. Stage 1 shards the OPTIMIZER STATE, leaving 4P plus 12P over N. Stage 2 additionally shards the GRADIENTS, replacing the all-reduce with a reduce-scatter and leaving 2P plus 14P over N. Stage 3 - which is what FSDP implements - shards the PARAMETERS too, giving 16P over N: memory genuinely divided by the device count, so a model larger than any single device becomes trainable. The price is communication: stages 1 and 2 keep DDP's traffic of roughly 2D, while stage 3 adds parameter all-gathers in both forward and backward, taking it to about 3D or 1.5 times DDP.",
        "The reassuring fact, and the one worth verifying yourself, is that sharding is MATHEMATICALLY NEUTRAL. Reconstructing the parameters by all-gather gives bit-identical forward outputs. A sharded Adam step equals an unsharded one exactly - and the reason is that Adam is ELEMENTWISE, so each parameter's update uses only its own gradient and its own two moments, which is precisely why you can split them across devices and nothing is lost. Run twenty-five steps sharded and unsharded from the same seed and the weights match bit for bit. So the entire question is systems engineering: what does the communication cost, does it overlap, and how do you place it on the hardware."
      ],
      "math": [
        {
          "h": "Per-device memory by ZeRO stage",
          "paras": [
            "Sixteen bytes per parameter under mixed-precision Adam, allocated to four things. Each stage moves one more of them from replicated to sharded.",
            "Only stage 3 makes per-device memory fall with the device count for ALL terms, which is what makes an otherwise-unfittable model trainable."
          ],
          "tex": "\\begin{aligned} \\text{DDP} &: 16P \\;\\text{(flat in } N\\text{)} \\\\ \\text{ZeRO-1} &: 4P + 12P/N \\\\ \\text{ZeRO-2} &: 2P + 14P/N \\\\ \\text{ZeRO-3 / FSDP} &: 16P/N \\end{aligned}",
          "texNote": "Put a number in: a 7.5B model is about 120 GB per device under DDP, which fits nothing you are likely to have; ZeRO-3 crosses an 80 GB budget at a modest device count. Note that ZeRO-1 alone removes three quarters of the memory and costs essentially no extra communication - which makes it the most under-used option in this list, because people jump to full sharding when the optimizer state was the whole problem."
        },
        {
          "h": "What each stage costs in communication",
          "paras": [
            "DDP performs one all-reduce of the gradients per step, about 2D bytes per rank with a ring algorithm. Stage 2 replaces it with a reduce-scatter, which is half of that. Stage 3 adds parameter all-gathers in forward and backward.",
            "So the memory reduction of stage 3 is paid for in traffic, and whether that matters depends entirely on whether the communication overlaps with computation."
          ],
          "tex": "\\text{DDP, ZeRO-1} \\approx 2D, \\qquad \\text{ZeRO-2} \\approx 2D, \\qquad \\text{ZeRO-3} \\approx 3D \\;\\; (1.5\\times)",
          "texNote": "The 1.5x is the standard ZeRO-paper accounting and it is an upper bound on the wall-clock cost rather than a prediction of it, because the all-gathers can be PREFETCHED - gathering layer i+1's parameters while layer i computes. A well-configured FSDP run hides most of that traffic; a badly-wrapped one exposes it, and the difference between those two is usually larger than the difference between stages."
        },
        {
          "h": "The pipeline bubble, and why micro-batches exist",
          "paras": [
            "Pipeline parallelism splits layers across devices, so a single batch leaves most stages idle while it traverses the pipe. Splitting the batch into micro-batches fills it.",
            "The bubble fraction falls as the number of micro-batches grows relative to the number of stages, which is why pipeline parallelism needs a large batch to be efficient at all."
          ],
          "tex": "\\text{bubble fraction} = \\frac{p - 1}{m + p - 1} \\qquad (p \\text{ stages}, \\; m \\text{ micro-batches})",
          "texNote": "With 4 stages and 4 micro-batches, 43% of the time is bubble - unusable. With 4 stages and 32 micro-batches it is under 9%. That is why pipeline parallelism is only viable at large batch, and why interleaved and one-forward-one-backward schedules exist to shrink it further. It is also the reason pipeline parallelism is the LAST axis people add rather than the first."
        }
      ],
      "code": [
        {
          "h": "Verify that sharding is exact, then configure it",
          "paras": [
            "Three checks worth running once, because they convert sharding from something you trust into something you have confirmed - and the middle one explains why it works at all."
          ],
          "code": "# PROOF 1: reconstructing parameters gives an IDENTICAL forward.\nfull = torch.cat([shard_i for shard_i in all_gather(param_shards)])\nassert (model_full(x) - model_from(full)(x)).abs().max() == 0\n\n# PROOF 2: a SHARDED Adam step equals an unsharded one - exactly.\n#   WHY: Adam is ELEMENTWISE. Each parameter's update uses only its OWN\n#   gradient and its OWN m and v. There is no cross-parameter term, so\n#   splitting the state across devices loses nothing. That single property is\n#   what makes optimizer-state sharding exact rather than approximate.\nassert (adam_sharded(p, g) - adam_full(p, g)).abs().max() == 0\n\n# PROOF 3: 25 steps sharded == 25 steps unsharded, bit for bit, same seed.\nassert (w_sharded - w_full).abs().max() == 0\n#   Sharding is a SYSTEMS change, not a numerical one. Everything that remains\n#   is about communication cost and placement.\n\n# ---- CONFIGURING FSDP ----\nmodel = FSDP(\n    model,\n    auto_wrap_policy=transformer_auto_wrap_policy(     # WRAP PER BLOCK.\n        transformer_layer_cls={TransformerBlock}),      # Too COARSE: huge\n                                                        # all-gathers, poor\n                                                        # overlap, high peak.\n                                                        # Too FINE: many small\n                                                        # collectives, latency-\n                                                        # bound. Per block is\n                                                        # the usual right answer.\n    sharding_strategy=ShardingStrategy.FULL_SHARD,      # = ZeRO-3\n    #                 SHARD_GRAD_OP  = ZeRO-2 (less comm, more memory)\n    #                 HYBRID_SHARD   = shard WITHIN a node, replicate ACROSS -\n    #                                  the right default on multi-node clusters\n    mixed_precision=MixedPrecision(param_dtype=torch.bfloat16,\n                                   reduce_dtype=torch.float32),  # reduce in\n                                                        # fp32 for stability,\n                                                        # compute in bf16\n    backward_prefetch=BackwardPrefetch.BACKWARD_PRE,    # gather layer i-1's\n                                                        # params while layer i's\n                                                        # backward runs - this is\n                                                        # what hides the 1.5x\n    limit_all_gathers=True,\n)\n# PEAK PARAMETER MEMORY under just-in-time gather-then-free is\n#   P/N (your shard)  +  the LARGEST SINGLE unit you gather\n# which is why wrapping granularity sets the peak, not just the throughput.",
          "caption": "Adam being elementwise is why optimizer-state sharding is exact - each parameter's update touches only its own moments, so splitting them loses nothing. And peak parameter memory is your shard plus the largest unit you gather, which makes wrapping granularity a memory decision as well as a throughput one."
        },
        {
          "h": "The other axes, and where each belongs on the hardware",
          "paras": [
            "Sharding is one of four ways to split a model. The placement rule matters more than the individual techniques, because each axis has a different communication pattern and the interconnect is hierarchical."
          ],
          "code": "# THE FOUR AXES:\n#\n#  DATA parallel      replicate the model, split the BATCH.\n#                     Comm: one gradient all-reduce per step (~2D).\n#                     Memory: FLAT in N. Use whenever the model fits.\n#\n#  SHARDED data (ZeRO/FSDP)  split the STATE, still split the batch.\n#                     Comm: +param all-gathers in fwd and bwd (~1.5x DDP).\n#                     Memory: 16P/N. Use when the model does not fit.\n#\n#  TENSOR parallel    split each MATMUL across devices (column/row split).\n#                     Comm: an all-reduce INSIDE every layer, twice per block.\n#                     Very high frequency -> needs NVLink-class bandwidth.\n#\n#  PIPELINE parallel  split LAYERS across devices, micro-batch to fill.\n#                     Comm: point-to-point activations between stages only -\n#                     the LOWEST volume of any axis.\n#                     Cost: the bubble, (p-1)/(m+p-1).\n#\n# THE PLACEMENT RULE, which follows from the comm patterns and the hierarchy:\n#   TENSOR parallel   WITHIN a node   (highest frequency -> fastest links)\n#   PIPELINE parallel ACROSS nodes    (lowest volume -> tolerates slow links)\n#   DATA parallel     OUTERMOST       (one collective per step)\n# Getting this backwards - tensor parallel across nodes - is the classic way\n# to build a cluster job that runs at a fraction of its potential.\n\n# THE SELECTION LADDER:\n#   fits comfortably              -> DDP. Simplest and fastest. Always first.\n#   optimizer state is the issue  -> ZeRO-1 or -2. Removes 3/4 of the memory at\n#                                    ~DDP communication. MOST UNDER-USED OPTION.\n#   model does not fit            -> FSDP / ZeRO-3.\n#   still does not fit            -> + tensor parallel within the node.\n#   still does not fit            -> + pipeline across nodes (needs big batch).\n#   long sequences dominate       -> + sequence/context parallelism.\n# Each step adds real complexity. Stop at the first one that works.",
          "caption": "The placement rule is the part that decides cluster performance: tensor parallelism communicates twice per block and must live on the fastest links, pipeline parallelism sends only activations between stages and tolerates slow ones. Reversing them is the classic expensive mistake."
        }
      ],
      "useCases": [
        "Training a model too large for one device, which is FSDP's defining purpose - stage 3 is the only configuration whose per-device memory falls with the device count for every term.",
        "Relieving optimizer-state pressure without full sharding, using ZeRO stage 1 or 2 - which removes three quarters of the memory at essentially DDP-level communication and is the most under-used option in the list.",
        "Multi-node clusters with a bandwidth hierarchy, where hybrid sharding - shard within a node, replicate across nodes - keeps the frequent parameter traffic on the fast intra-node links and reduces the inter-node collective to one all-reduce.",
        "Frontier-scale pretraining, where no single axis suffices and three-dimensional parallelism combines tensor parallelism inside a node, pipeline across nodes, and data parallelism outermost."
      ],
      "pitfalls": [
        "Reaching for FSDP when the model fits. DDP is simpler, faster and has fewer failure modes, and full sharding costs about 1.5 times the communication for capacity you did not need. Compute the memory budget before choosing a strategy.",
        "Skipping ZeRO stages 1 and 2. If the optimizer state is what does not fit, stage 1 removes three quarters of the memory at essentially unchanged communication - a much better trade than full sharding, and it is routinely overlooked.",
        "Wrapping at the wrong granularity. Too coarse means huge all-gathers, a high peak from the largest unit, and little room to overlap; too fine means many small collectives that are latency-bound. Per transformer block is the usual right answer.",
        "Not enabling prefetching. The 1.5x communication figure is an upper bound that assumes nothing overlaps; gathering the next unit's parameters while the current one computes is what hides most of it, and a run without it is far slower than the accounting suggests.",
        "Using full sharding across nodes when hybrid would do. Parameter all-gathers happen per layer per step, so putting them on a slow inter-node link is the most expensive placement available. Shard within the node and replicate across.",
        "Placing tensor parallelism across node boundaries. It performs an all-reduce inside every layer, twice per transformer block, so it needs the fastest interconnect available. This single placement error can cost most of a cluster's throughput.",
        "Using pipeline parallelism at small batch. The bubble fraction is (p-1)/(m+p-1), so with four stages and four micro-batches you waste 43% of the time. It needs many micro-batches, which means a large batch, which is a precondition rather than a tuning detail."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Where the collectives come from, and the identity that organizes the stages: all-reduce equals reduce-scatter followed by all-gather, so ZeRO's stages are choices about where to stop between the two halves."
        },
        {
          "ref": "training-systems/ddp",
          "text": "The baseline this departs from, and the right answer whenever the model fits. Its per-device memory is flat in the device count, which is exactly the property sharding exists to break."
        },
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The complementary technique attacking a disjoint term. Sharding divides the parameter, gradient and optimizer terms; checkpointing reduces the activation term on each device. Large-scale training uses both, and their wrapping boundaries interact."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Expert parallelism as a fifth axis, with an all-to-all communication pattern that is more demanding than any of these - all-pairs, data-dependent in size, and hard to overlap because it sits mid-forward."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How you tell whether the communication is actually overlapping. The 1.5x figure is accounting; the exposed fraction is a measurement, and the gap between them is the whole difference between a good and a bad FSDP configuration."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does DDP not help you fit a larger model?",
          "a": "It replicates the model on every device, so per-device memory is sixteen bytes per parameter regardless of device count. Adding accelerators buys throughput, never capacity."
        },
        {
          "q": "Where do the sixteen bytes go?",
          "a": "Two for fp16 weights, two for fp16 gradients, four for the fp32 master copy, and eight for Adam's two moments - under mixed-precision Adam."
        },
        {
          "q": "What does each ZeRO stage shard?",
          "a": "Stage 1 the optimizer state (4P + 12P/N), stage 2 also the gradients (2P + 14P/N), stage 3 also the parameters (16P/N)."
        },
        {
          "q": "What does each stage cost in communication?",
          "a": "Stages 1 and 2 keep DDP's roughly 2D; stage 3 adds parameter all-gathers in forward and backward, taking it to about 3D or 1.5 times DDP."
        },
        {
          "q": "Why is sharding the optimizer state exact?",
          "a": "Adam is elementwise - each parameter's update uses only its own gradient and its own two moments - so splitting the state across devices loses nothing."
        },
        {
          "q": "What is peak parameter memory under FSDP?",
          "a": "Your shard, P/N, plus the largest single unit you gather just in time. That is why wrapping granularity is a memory decision, not only a throughput one."
        },
        {
          "q": "What is the right FSDP wrapping granularity?",
          "a": "Usually per transformer block. Too coarse gives huge all-gathers and a high peak; too fine gives many small latency-bound collectives."
        },
        {
          "q": "What does prefetching do?",
          "a": "Gathers the next unit's parameters while the current one computes, hiding most of the extra communication. Without it the 1.5x figure is realized rather than avoided."
        },
        {
          "q": "What is hybrid sharding?",
          "a": "Shard within a node and replicate across nodes, keeping the frequent parameter traffic on fast intra-node links and reducing inter-node traffic to one all-reduce."
        },
        {
          "q": "Where should tensor parallelism live?",
          "a": "Within a node. It performs an all-reduce inside every layer, twice per transformer block, so it needs the highest-bandwidth interconnect available."
        },
        {
          "q": "What is the pipeline bubble fraction?",
          "a": "(p-1)/(m+p-1) for p stages and m micro-batches. Four stages with four micro-batches wastes 43% of the time; with 32 it is under 9%."
        },
        {
          "q": "Which parallelism axis has the lowest communication volume?",
          "a": "Pipeline - it sends only activations point-to-point between adjacent stages, which is why it belongs on the slowest links."
        }
      ],
      "standard": [
        {
          "q": "Explain the ZeRO stages and how you would choose between them.",
          "a": "THE STARTING POINT. Under mixed-precision Adam, per-device memory is sixteen bytes per parameter: two for fp16 weights, two for fp16 gradients, four for the fp32 master copy, eight for Adam's two moments. In DDP all of that is REPLICATED on every device, so the per-device figure is FLAT in the device count - adding accelerators buys throughput and never buys capacity. A 7.5B model needs about 120 GB per device, which fits nothing. THE STAGES, each moving one more term from replicated to sharded. ZeRO-1 shards the OPTIMIZER STATE: the fp32 master copy and the two moments, which is twelve of the sixteen bytes. Memory becomes 4P plus 12P over N. Gradients are still all-reduced as in DDP, each rank updates only its slice of parameters, and the updated parameters are all-gathered. Communication is essentially unchanged. ZeRO-2 additionally shards the GRADIENTS. Instead of an all-reduce you use a REDUCE-SCATTER, so each rank receives only the summed gradient slice it needs - which is the first half of the identity that all-reduce equals reduce-scatter followed by all-gather, and it costs about half an all-reduce. Memory becomes 2P plus 14P over N. ZeRO-3, which is what FSDP implements, shards the PARAMETERS too. Now a layer's weights are not resident, so you must ALL-GATHER them just in time before its forward, use them, and free them - and again in backward. Memory becomes 16P over N: genuinely divided by the device count, which is what makes an otherwise-unfittable model trainable. Communication rises to about 3D, or 1.5 times DDP. HOW I WOULD CHOOSE - and the ladder matters because each step adds real complexity. Compute the budget first. If the model FITS comfortably under DDP, use DDP: simplest, fastest, fewest failure modes. If the OPTIMIZER STATE is what does not fit - which is common, since it is twelve of the sixteen bytes - use ZeRO-1 or 2, which removes three quarters of the memory at essentially DDP communication. This is the most under-used option in the list; people jump to full sharding when a stage that costs nothing would have done. If the MODEL ITSELF does not fit, ZeRO-3 or FSDP. If that is still not enough, add tensor parallelism within the node, then pipeline across nodes. Stop at the first that works. THE REASSURING PART, worth verifying once. Sharding is MATHEMATICALLY NEUTRAL. Reconstructing parameters by all-gather gives bit-identical forward outputs; a sharded Adam step equals an unsharded one exactly; twenty-five steps sharded from the same seed match unsharded bit for bit. The reason the optimizer sharding is exact is that ADAM IS ELEMENTWISE - each parameter's update uses only its own gradient and its own two moments, with no cross-parameter term. So there is nothing to lose by splitting them. Everything that remains is systems engineering: does the communication overlap, and where does it sit on the hardware.",
          "deepDive": {
            "q": "Walk through what happens in an FSDP forward and backward pass, and what determines whether it is fast.",
            "a": "THE FORWARD, per FSDP unit - typically a transformer block. (1) ALL-GATHER the unit's parameters from all ranks, reconstructing the full weights in a temporary buffer. (2) Run the unit's forward computation with those full weights. (3) FREE the gathered buffer immediately, keeping only your own shard. (4) Move to the next unit and repeat. So at any moment you hold your P/N shard of everything plus the full parameters of ONE unit - which is why peak parameter memory is P/N plus the largest single unit, and why wrapping granularity is a memory decision rather than only a throughput one. THE BACKWARD, per unit in reverse. (1) ALL-GATHER the unit's parameters again, because you freed them - this is the second of the two extra all-gathers that take communication from 2D to 3D. (2) Compute gradients. (3) REDUCE-SCATTER the gradients so each rank keeps only its slice, which is what makes gradient memory P/N. (4) Free the gathered parameters and the full gradients. WHAT DETERMINES SPEED - and this is where a good and a bad configuration differ by more than the choice of stage. (1) PREFETCHING. If unit i+1's all-gather is issued while unit i is still computing, the communication hides behind computation and the 1.5x is largely notional. If it is issued when unit i+1 is needed, every unit stalls on its gather and you realize the full cost. Forward prefetch and backward prefetch are separate settings and both matter; backward prefetch is the one more often left off. (2) WRAPPING GRANULARITY, which controls both the gather size and the overlap opportunity. Too COARSE - wrapping the whole model as one unit - means one enormous all-gather with nothing to overlap it against, and a peak equal to the full parameter set, which defeats the purpose. Too FINE - wrapping every linear layer - means many small collectives, each paying fixed latency, and the aggregate latency dominates. Per transformer block is the usual answer because it gives collectives large enough to be bandwidth-efficient and numerous enough to pipeline. (3) THE INTERCONNECT. Parameter all-gathers happen per unit per step in both directions, so their frequency is high. On NVLink within a node that is cheap; across a slower inter-node fabric it is not, which is the entire argument for HYBRID sharding - shard within the node where bandwidth is plentiful, replicate across nodes so the inter-node traffic is one all-reduce per step rather than many all-gathers. (4) THE INTERACTION WITH ACTIVATION CHECKPOINTING. If a checkpointed region spans several FSDP units, the recomputation during backward triggers those units' all-gathers AGAIN - so the recompute costs communication as well as compute, which is a real and surprising interaction. Aligning checkpoint boundaries with FSDP unit boundaries avoids it. HOW I WOULD DIAGNOSE A SLOW FSDP RUN. Profile and look at whether the all-gather kernels overlap with compute on the timeline. If there are visible gaps aligned with collectives, prefetching is not working - check the prefetch settings and the wrapping. If the collectives themselves are slow, check the interconnect and consider hybrid sharding. And compare against a DDP run at a batch size that fits, because if FSDP is much slower than DDP and the model would have fitted, the answer is to use DDP."
          }
        },
        {
          "q": "Compare data, tensor, pipeline and sharded parallelism. When would you combine them?",
          "a": "FOUR AXES, distinguished by WHAT they split and therefore by their communication pattern. DATA PARALLEL splits the BATCH and replicates the model. One gradient all-reduce per step, about 2D bytes per rank. Per-device memory is flat in N, so it never helps you fit a model. It is the simplest and it is right whenever the model fits. SHARDED DATA PARALLEL - ZeRO and FSDP - also splits the STATE. Adds parameter all-gathers in forward and backward, taking communication to about 1.5 times DDP, and makes memory 16P over N. Right when the model does not fit but a single layer does. TENSOR PARALLEL splits each MATMUL across devices - a column split on one weight matrix and a row split on the next, so the pair needs only one all-reduce between them. That is an all-reduce INSIDE every layer, twice per transformer block, at very high frequency. It divides both parameters and ACTIVATIONS, which is its distinctive advantage. Its cost is that the communication is on the critical path of every layer, so it demands NVLink-class bandwidth. PIPELINE PARALLEL splits LAYERS across devices, with only activations sent point-to-point between adjacent stages. That is the LOWEST communication volume of any axis by a wide margin, and its cost is different in kind: the BUBBLE, since a stage is idle while it waits for work, at fraction (p-1)/(m+p-1). Splitting the batch into many micro-batches shrinks it, which is why pipeline parallelism requires a large batch to be efficient at all. THE PLACEMENT RULE, which follows directly and which matters more than any individual choice. Communication frequency and volume determine which link each axis belongs on. TENSOR PARALLEL WITHIN A NODE, because it communicates twice per block on the critical path and must have the fastest links. PIPELINE PARALLEL ACROSS NODES, because it sends only activations at stage boundaries and tolerates slower links. DATA OR SHARDED-DATA PARALLEL OUTERMOST, since it is one collective per step. Getting this backwards - tensor parallelism across node boundaries - is the classic way to build a cluster job that runs at a fraction of its potential, and it is a placement error rather than a code error. WHEN TO COMBINE. Only when a single axis is insufficient, because each adds real complexity. The frontier-scale recipe is three-dimensional: tensor parallel inside a node to fit the layers and divide activations, pipeline across nodes to fit the depth, data parallel outermost to use the remaining devices - and sequence or context parallelism as a fourth axis when long sequences make activations dominant. THE SELECTION DISCIPLINE I would state. Compute the memory budget, choose the cheapest axis that makes it fit, and stop. Every additional axis costs configuration complexity, more failure modes, and a harder debugging story - and the most common mistake is adding parallelism because the model is large rather than because the arithmetic said it was necessary."
        },
        {
          "q": "How would you verify a sharded training setup is correct?",
          "a": "SHARDING IS SUPPOSED TO BE MATHEMATICALLY NEUTRAL, which gives you an unusually strong test: the sharded run should match the unsharded one, and any deviation is a bug rather than an approximation. THE THREE EXACTNESS CHECKS, run once on a small model. (1) PARAMETER RECONSTRUCTION. All-gather the shards and compare the forward output against the unsharded model on the same input. Difference should be exactly zero. This checks the gather logic and the shard boundaries. (2) THE OPTIMIZER STEP. Apply one Adam step sharded and unsharded from the same gradients and compare. Exactly zero, and the reason it must be is that ADAM IS ELEMENTWISE - each parameter's update touches only its own gradient and its own two moments. If this test fails, either the sharding is wrong or you are using an optimizer with cross-parameter coupling, and knowing which is the whole diagnosis. (3) A MULTI-STEP RUN. Twenty-five steps, same seed, same data order, sharded versus unsharded, comparing weights bit for bit. This catches errors in the gradient reduce-scatter, in the state's shard alignment across steps, and in anything that accumulates. THE STARTUP ASSERTIONS I would add permanently, because they catch the distributed failures that are otherwise silent. All-reduce a hash of the parameters at initialization and assert every rank agrees - if replicas start different they optimize different models while averaging gradients, which trains and converges worse with no error. Assert the data-shard counts are identical across ranks with a min and max all-reduce, because unequal counts HANG rather than error. And assert each rank is on a distinct device. THE CHECKPOINT ROUND TRIP, which is the FSDP-specific one people get wrong. FSDP offers different state_dict types - a FULL state dict gathered on rank zero, and a SHARDED one written per rank. Save and reload with each and assert identical outputs on a fixed input. The full form is convenient and can exhaust rank zero's memory for a large model; the sharded form scales but ties the checkpoint to the world size unless you use a resharding-capable format. Getting this wrong means discovering at resume time that your checkpoint cannot be loaded on a different number of devices, which is an expensive discovery. THE THING TO WATCH THAT IS NOT A CORRECTNESS BUG. Bitwise equality across DIFFERENT world sizes is not achievable, because the reduction order within a collective changes and floating-point addition is not associative. So the multi-step test compares sharded against unsharded at the SAME effective configuration; across configurations, compare to a tolerance and compare the loss trajectory rather than the bits. WHY THIS IS WORTH THE HOUR. Sharding bugs are silent - a misaligned shard boundary or a wrong reduction gives you a model that trains, converges worse, and never errors. And the exactness property means you have a much sharper test available here than for most systems changes, so not using it is leaving the strongest available verification on the table.",
          "deepDive": {
            "q": "FSDP offers full and sharded state dicts. What are the trade-offs, and what breaks?",
            "a": "THE TWO FORMS. A FULL state dict all-gathers every parameter and materializes the complete model on rank zero - the same format an unsharded model produces, loadable anywhere. A SHARDED state dict has each rank write its own shard, so no rank ever holds the whole model. WHAT BREAKS WITH FULL. MEMORY. Rank zero must hold the entire model in one place, which for a model that needed sharding to train is precisely the thing that does not fit. Options are CPU offloading during the gather, which works and is slow, or accepting that you cannot save this way at all above some size. It also SERIALIZES: every rank participates in the gather and then waits while rank zero writes, so checkpointing time grows and the whole job stalls. On a large model that can be minutes per checkpoint, which interacts badly with wanting frequent checkpoints for stability. WHAT BREAKS WITH SHARDED. PORTABILITY. A naive sharded checkpoint records rank i's slice, so reloading requires the same world size and the same sharding layout. Change the number of devices - which happens constantly, for a restart on different hardware, for a scaling experiment, or for fine-tuning a model that was pretrained at a different scale - and the checkpoint cannot be loaded. That is the failure that costs the most, because it is discovered at the worst moment. THE RESOLUTION, which is what modern tooling provides: a DISTRIBUTED CHECKPOINT format that stores logical tensor coordinates rather than rank-indexed slices, plus a plan for reading them back into whatever layout the loading job wants. Each rank writes in parallel, nothing is gathered, and RESHARDING on load is supported. That is the right default for large-scale training and it is worth adopting before you need it. WHAT ELSE MUST BE IN THE CHECKPOINT, and this is where sharded setups add requirements. The OPTIMIZER STATE, which under ZeRO is itself sharded and must be saved and resharded consistently with the parameters - and it is twelve of the sixteen bytes, so it dominates the checkpoint size. The learning-rate scheduler, the GradScaler if using fp16, the step count, and the DATA LOADER POSITION per rank, without which a resume re-trains on data already seen. THE PRACTICAL POLICY I WOULD ADOPT. Use the distributed sharded format for routine training checkpoints, because they are frequent and must be fast. Export a consolidated full checkpoint occasionally - at the end, and at milestones - for portability, evaluation, and handing to anyone who is not running your exact configuration. And TEST THE RESUME, by checkpointing, restarting the process, loading, and confirming the loss trajectory continues smoothly rather than showing a discontinuity. That test is the only thing that catches a missing piece of state, and a discontinuity at the resume point usually identifies which piece by its size and shape."
          }
        },
        {
          "q": "Your FSDP job is much slower than the 1.5x communication figure suggests. Diagnose it.",
          "a": "THE 1.5x IS AN UPPER BOUND ON TRAFFIC, not a prediction of wall-clock, because the all-gathers can be hidden behind computation. A run that is much slower has failed to hide them, and there are five candidates. CANDIDATE 1: PREFETCHING IS OFF OR INEFFECTIVE. The point of prefetch is to issue unit i+1's all-gather while unit i computes. Without it every unit stalls waiting for its parameters and you realize the full communication cost serially. Forward and backward prefetch are separate settings and the backward one is more often left off. Diagnostic: the profiler timeline shows all-gather kernels with compute IDLE alongside them, in a regular pattern per layer. CANDIDATE 2: WRAPPING GRANULARITY. Too COARSE and there is nothing to overlap against - one giant all-gather at the start of forward, with the whole model's parameters materialized, which also blows up peak memory. Too FINE and you have hundreds of small collectives each paying fixed latency, so you are latency-bound rather than bandwidth-bound. Diagnostic: count the collectives per step and look at their individual durations. Many very short ones means too fine; a few enormous ones means too coarse. Per transformer block is the usual right answer. CANDIDATE 3: THE INTERCONNECT AND THE SHARDING TOPOLOGY. Parameter all-gathers happen per unit per step in both directions, so their frequency is high. Full sharding across a slow inter-node fabric puts that high-frequency traffic on the worst link available. HYBRID sharding - shard within the node, replicate across - moves it onto NVLink and reduces inter-node traffic to one all-reduce per step. On a multi-node cluster this is often the single largest fix, and the default is frequently wrong for the hardware. CANDIDATE 4: ACTIVATION CHECKPOINTING SPANNING FSDP UNITS. If a checkpointed region covers several units, the recomputation during backward triggers those units' all-gathers AGAIN - so the recompute costs communication as well as compute. That is a genuinely surprising interaction and it can be large. Fix: align checkpoint boundaries with FSDP unit boundaries. CANDIDATE 5: A STRAGGLER. Every rank waits at every collective, so one slow rank sets the pace and presents as uniformly poor performance. Diagnostic: per-rank step times, max versus median. Nothing about FSDP configuration fixes this. THE FIRST THING I WOULD ACTUALLY CHECK, before any of the above: DOES THE MODEL FIT UNDER DDP? If it does, use DDP. FSDP is paying communication for capacity you did not need, and this is a surprisingly common situation - someone reaches for sharding because the model is large rather than because the memory arithmetic said it was necessary. Computing the budget takes two minutes and can eliminate the entire investigation. AND THE MEASUREMENT THAT BOUNDS EVERYTHING. Run single-device and multi-device MFU. The difference is the total distributed overhead, and comparing it against the theoretical 1.5x tells you how much of the gap is unexplained - which is the residual that this module keeps insisting is the most valuable number in a performance analysis."
        },
        {
          "q": "Explain the memory-versus-communication trade in this lesson's terms.",
          "a": "THE EXCHANGE. Sharding buys per-device memory by spending communication, and each ZeRO stage is a different point on that curve. Stage 1 is the bargain: it moves twelve of the sixteen bytes per parameter off each device and costs essentially nothing extra in traffic, because the gradient all-reduce is unchanged and the only addition is a parameter all-gather after the step. Stage 2 replaces the all-reduce with a reduce-scatter, which is actually LESS traffic, while sharding another two bytes - so it is arguably free as well. Stage 3 is where you start paying: parameter all-gathers in both forward and backward take traffic to about 1.5 times DDP, in exchange for memory that finally divides by the device count. WHY THE RATE IS CONFIGURATION-DEPENDENT, which is this module's recurring point. The 1.5x is an upper bound on BYTES, and the wall-clock cost depends entirely on whether those bytes overlap with computation. With good prefetching and per-block wrapping on NVLink, the exposed fraction can be small and the effective rate is excellent. With coarse wrapping across a slow inter-node fabric and no prefetch, you realize the full cost serially and the effective rate is terrible. The SAME configuration on different hardware, or the same hardware with different wrapping, gives you materially different exchange rates - which is why the placement rule and the wrapping granularity matter more than the choice of stage. THE SECOND AXIS THIS OPENS. Tensor and pipeline parallelism are further exchanges of the same kind but with different currencies. Tensor parallelism buys memory - including ACTIVATION memory, which sharding does not touch - by spending very high-frequency communication on the critical path. Pipeline parallelism buys memory by spending IDLE TIME in the bubble, and its communication cost is the lowest of any axis. So you have three different things to spend - bandwidth, latency-sensitive bandwidth, and utilization - and the right combination depends on which your hardware has spare. THE ORDERING PRINCIPLE THAT FOLLOWS. Compute the memory budget, identify which term does not fit, and choose the cheapest axis that fixes THAT term. Optimizer state too large: stage 1 or 2, nearly free. Parameters too large: stage 3. A single layer too large: tensor parallelism. Depth too large: pipeline. Activations too large: checkpointing or sequence parallelism, neither of which is on this page. Applying the wrong axis costs its communication and fixes nothing, which is the failure this ordering prevents. WHAT MAKES THIS LESSON DIFFERENT FROM THE OTHERS IN THE MODULE. Here the exchange is provably lossless in the mathematical sense - sharding gives bit-identical results, verified three ways - so unlike quantization or checkpointing there is no quality question at all. The entire decision is systems engineering. That is unusually clean, and it means the only way to get it wrong is to pay communication you did not need, or to place it on hardware that cannot carry it."
        },
        {
          "q": "How does sharding interact with the other techniques in this module?",
          "a": "WITH GRADIENT CHECKPOINTING - complementary, attacking disjoint terms, and with one real interaction. Sharding divides the parameter, gradient and optimizer terms across devices; checkpointing reduces the ACTIVATION term on each device. Neither helps with the other's term, which is why large-scale training uses both. The interaction: if a checkpointed region spans several FSDP units, the recomputation during backward triggers those units' parameter all-gathers AGAIN, so recompute costs communication as well as compute. Aligning checkpoint boundaries with FSDP wrapping boundaries avoids it, and this is a genuinely surprising cost that shows up as FSDP being slower than the accounting predicts. WITH MIXED PRECISION - tightly integrated, and FSDP exposes it more explicitly than autocast does. Its MixedPrecision policy sets separate dtypes for parameters, for gradient reduction, and for buffers. The useful configuration is computing in bf16 while REDUCING in fp32, because summing many bf16 gradients across ranks loses precision in a way that matters more than the compute precision does. That is a knob autocast alone does not give you and it is worth setting deliberately. Also: bf16 parameters halve the all-gather traffic, which directly reduces the 1.5x. WITH GRADIENT ACCUMULATION - the same no_sync concern as DDP, and it is more consequential here. Without it you perform the full gather-reduce-scatter cycle on every micro-step instead of once per optimizer step, multiplying the dominant cost by the accumulation count. FSDP provides its own no_sync, and it changes the memory profile too, since gradients must be held unsharded between micro-steps. WITH torch.compile - they compose, and the composition needs care. Compiling FSDP-wrapped modules works, and the interaction between graph boundaries and FSDP unit boundaries affects how well the collectives can be scheduled. I would measure rather than assume additivity here. WITH DATA LOADING - the requirement that shard counts be equal across ranks is sharper under FSDP because a hang is even more expensive when you have more devices idle. And the effective batch is micro-batch times accumulation times world size, so a change in sharding strategy that changes the world size changes the optimization problem. WITH PROFILING - the essential pairing, because the difference between a good and bad FSDP configuration is measured in exposed communication, and that is only visible on a timeline. Single-device versus multi-device MFU bounds the total distributed overhead, and comparing it against the theoretical 1.5x tells you how much is unexplained. THE PATTERN. Sharding is the technique with the most interactions in the module, because it touches memory, communication, precision and the training loop's structure simultaneously. That is a reason to reach for it only when the budget says you must - which is the capstone's argument and the reason this lesson sits immediately before it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Per-device memory by ZeRO stage",
        "back": "DDP: 16P, FLAT in N (adding devices never buys capacity). ZeRO-1: 4P + 12P/N. ZeRO-2: 2P + 14P/N. ZeRO-3/FSDP: 16P/N. The 16 = 2 fp16 weights + 2 fp16 grads + 4 fp32 master + 8 Adam m,v."
      },
      {
        "type": "intuition",
        "front": "ZeRO-1 is the most under-used option",
        "back": "The optimizer state is TWELVE of the sixteen bytes, so stage 1 removes three quarters of the memory at essentially UNCHANGED communication. People jump to full sharding when the free stage would have done."
      },
      {
        "type": "formula",
        "front": "Communication by stage",
        "back": "DDP and ZeRO-1 ~2D. ZeRO-2 ~2D (reduce-scatter is HALF an all-reduce). ZeRO-3 ~3D = 1.5x DDP, from parameter all-gathers in BOTH forward and backward. The 1.5x is an upper bound on BYTES, not a prediction of wall-clock."
      },
      {
        "type": "intuition",
        "front": "Why optimizer-state sharding is EXACT",
        "back": "ADAM IS ELEMENTWISE - each parameter's update uses only its OWN gradient and its OWN m and v, with no cross-parameter term. So splitting the state across devices loses nothing. Verified: sharded step == unsharded step, difference exactly 0."
      },
      {
        "type": "intuition",
        "front": "Sharding is mathematically NEUTRAL - verify it",
        "back": "Three checks: (1) all-gathered params give an identical forward (diff 0); (2) sharded Adam step == unsharded (0); (3) 25 steps, same seed, bit-for-bit identical. So the entire question is systems engineering, not numerics."
      },
      {
        "type": "formula",
        "front": "FSDP peak parameter memory",
        "back": "P/N (your shard) + the LARGEST SINGLE UNIT you gather just-in-time. That is why WRAPPING GRANULARITY is a memory decision, not only a throughput one - wrapping the whole model as one unit defeats the purpose entirely."
      },
      {
        "type": "pitfall",
        "front": "Wrapping granularity: too coarse vs too fine",
        "back": "TOO COARSE: one huge all-gather with nothing to overlap against, and peak = the full model. TOO FINE: hundreds of small collectives, each paying fixed latency, so you are latency-bound. Per TRANSFORMER BLOCK is the usual right answer."
      },
      {
        "type": "intuition",
        "front": "Prefetching is what hides the 1.5x",
        "back": "Gather unit i+1's parameters while unit i computes. Without it every unit STALLS on its gather and you realize the full cost serially. Forward and BACKWARD prefetch are separate settings, and the backward one is more often left off."
      },
      {
        "type": "definition",
        "front": "The parallelism placement rule",
        "back": "TENSOR parallel WITHIN a node (an all-reduce inside every layer, twice per block - needs NVLink). PIPELINE ACROSS nodes (only activations point-to-point - lowest volume). DATA parallel OUTERMOST (one collective per step). Reversing it costs most of a cluster's throughput."
      },
      {
        "type": "formula",
        "front": "Pipeline bubble fraction",
        "back": "(p-1)/(m+p-1) for p stages, m micro-batches. 4 stages x 4 micro-batches = 43% WASTED. 4 x 32 = under 9%. Pipeline parallelism REQUIRES a large batch to be viable - that is a precondition, not a tuning detail."
      },
      {
        "type": "definition",
        "front": "Hybrid sharding",
        "back": "Shard WITHIN a node, replicate ACROSS nodes. Keeps the high-frequency parameter all-gathers on fast intra-node links and reduces inter-node traffic to ONE all-reduce per step. Often the single largest fix on a multi-node cluster."
      },
      {
        "type": "pitfall",
        "front": "Checkpointing spanning FSDP units costs COMMUNICATION",
        "back": "The recomputation during backward triggers those units' parameter all-gathers AGAIN - so recompute costs bandwidth as well as compute. Align checkpoint boundaries with FSDP wrapping boundaries. A surprising interaction that shows as FSDP being slower than the accounting predicts."
      }
    ],
    "refs": [
      {
        "title": "Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "Zhao et al. (2023), PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel",
        "url": "https://arxiv.org/abs/2304.11277"
      },
      {
        "title": "Shoeybi et al. (2019), Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism",
        "url": "https://arxiv.org/abs/1909.08053"
      },
      {
        "title": "Huang et al. (2019), GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism",
        "url": "https://arxiv.org/abs/1811.06965"
      },
      {
        "title": "Narayanan et al. (2021), Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM",
        "url": "https://arxiv.org/abs/2104.04473"
      }
    ],
    "demos": [
      "moe",
      "batching",
      "mixed-precision",
      "autoscaling"
    ]
  }
};
