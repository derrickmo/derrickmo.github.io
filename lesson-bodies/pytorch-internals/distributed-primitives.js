// GENERATED from content/lessons/pytorch-internals/distributed-primitives.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/pytorch-internals/distributed-primitives/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "distributed-primitives": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Every distributed training strategy - DDP, FSDP, tensor parallelism, expert parallelism - is built from about eight collective operations. Learning them directly, rather than meeting them as implementation details of a wrapper, is what turns those strategies from recipes into things you can reason about and modify. All-reduce combines a tensor across all ranks and gives every rank the result. All-gather concatenates. Reduce-scatter combines and gives each rank one slice. Broadcast sends one rank's copy to everyone. And the identity that organizes the rest of the subject is that ALL-REDUCE EQUALS REDUCE-SCATTER FOLLOWED BY ALL-GATHER - which is exactly why ZeRO and FSDP can decompose a data-parallel step into two halves and shard state in between.",
        "The algorithmic content is in how all-reduce is implemented. The obvious approach - every rank sends to a root, which sums and sends back - makes the root receive N-1 copies of the whole tensor, so cost grows linearly with the number of ranks and the root is a bottleneck. RING ALL-REDUCE instead passes chunks around a ring: N-1 reduce-scatter steps leave each rank owning one fully-summed chunk, then N-1 all-gather steps distribute them. Each rank sends about 2D bytes regardless of N. That flatness in the number of ranks is the reason large-scale data-parallel training is possible at all, and it is a genuinely beautiful result.",
        "And then the thing that makes distributed debugging its own discipline: collectives are COLLECTIVE. Every rank must call them, in the same order, with the same shapes. Violate that and the job does not error - it HANGS, silently, until a timeout measured in minutes or tens of minutes. A rank-dependent branch that calls a collective on only some ranks, an uneven data shard so one rank finishes an epoch early, a validation step that runs on rank zero only and does an all-reduce inside - all produce the same symptom, which is nothing happening. That is this module's theme at its most extreme: the abstraction hid the synchronization, and when it fails there is not even a symptom to read, only an absence."
      ],
      "math": [
        {
          "h": "Ring all-reduce: flat in the number of ranks",
          "paras": [
            "Split the tensor into N chunks. In the reduce-scatter phase each rank sends one chunk to its neighbour and accumulates the one it receives, N-1 times, after which each rank holds one fully-summed chunk. The all-gather phase circulates those, again N-1 times.",
            "Each step moves D/N bytes, so the total per rank is independent of N to first order - which is what makes scaling out affordable."
          ],
          "tex": "\\text{bytes per rank} = 2\\,\\frac{N-1}{N}\\,D \\;\\xrightarrow{\\;N \\text{ large}\\;}\\; 2D \\qquad\\text{vs}\\qquad (N-1)D \\;\\text{ for gather-to-root}",
          "texNote": "The comparison is the point: naive all-reduce is LINEAR in N and bottlenecks one link, ring all-reduce is FLAT. It is also bandwidth-optimal - you cannot do better than moving each byte about twice - which is why essentially every implementation uses this or a topology-aware variant of it. NCCL picks between ring and tree algorithms based on message size and the interconnect it detects."
        },
        {
          "h": "Why small messages must be bucketed",
          "paras": [
            "The cost of a message is a fixed latency plus a size-dependent transfer term. For small tensors the fixed term dominates completely, so sending many small messages is enormously more expensive than one large one carrying the same bytes.",
            "A model has hundreds of parameter tensors, so a naive per-parameter all-reduce is latency-bound - which is why DDP coalesces gradients into buckets."
          ],
          "tex": "T(S) = \\alpha + \\frac{S}{\\beta}, \\qquad \\sum_{i=1}^{k} T(S_i) = k\\alpha + \\frac{\\sum_i S_i}{\\beta} \\;\\gg\\; T\\Big(\\sum_i S_i\\Big) \\;\\text{ when } k\\alpha \\text{ dominates}",
          "texNote": "With alpha in the microseconds and hundreds of tensors per model, the fixed cost alone can exceed the transfer time. Bucketing into a few tens of megabytes amortizes it - and it buys a second thing: because gradients become ready in reverse layer order during backward, DDP can launch a bucket's all-reduce as soon as that bucket fills, OVERLAPPING communication with the rest of the backward pass."
        },
        {
          "h": "The decomposition that underlies sharding",
          "paras": [
            "All-reduce is not primitive - it factors into a reduce-scatter and an all-gather, and each half leaves the data in a different distribution. Sharded training strategies exploit the gap between the halves.",
            "In ZeRO stage 2, gradients are reduce-scattered so each rank holds only its slice, the optimizer updates that slice, and the updated parameters are all-gathered."
          ],
          "tex": "\\texttt{all\\_reduce}(x) \\;=\\; \\texttt{all\\_gather}\\big(\\texttt{reduce\\_scatter}(x)\\big)",
          "texNote": "Read it as: after reduce-scatter every rank has a complete answer for one SLICE, and after all-gather everyone has everything. If a rank only ever needs its own slice - because it only stores the optimizer state for that slice - you can stop after the first half and save both memory and, sometimes, communication. That single identity is the mechanism behind ZeRO's stages and behind FSDP."
        }
      ],
      "code": [
        {
          "h": "Setup, the collectives, and the device assignment that must come first",
          "paras": [
            "The initialization has one ordering requirement that produces a confusing failure when violated: each rank must select its device before creating tensors or initializing the process group."
          ],
          "code": "import torch.distributed as dist\n\nlocal_rank = int(os.environ[\"LOCAL_RANK\"])     # set by torchrun\ntorch.cuda.set_device(local_rank)              # <-- BEFORE init and before any\n                                               # CUDA tensor. NCCL requires each\n                                               # rank on a DISTINCT device; get\n                                               # this wrong and two ranks land on\n                                               # device 0 and the job hangs or\n                                               # reports an unhelpful NCCL error.\ndist.init_process_group(\"nccl\")                # gloo for CPU, nccl for GPU\nrank, world = dist.get_rank(), dist.get_world_size()\n\n# THE COLLECTIVES - every rank must call each of these, in the same ORDER,\n# with the same SHAPES.\ndist.all_reduce(t, op=dist.ReduceOp.SUM)   # combine; everyone gets the result\ndist.reduce(t, dst=0)                      # combine; only dst gets it\ndist.broadcast(t, src=0)                   # src's copy -> everyone\ndist.all_gather(out_list, t)               # everyone gets everyone's tensor\ndist.reduce_scatter(out, in_list)          # combine, each rank keeps one slice\ndist.all_to_all(out_list, in_list)         # transpose across ranks (MoE routing)\ndist.barrier()                             # everyone waits\n\n# OVERLAP: issue asynchronously, do other work, then wait.\nwork = dist.all_reduce(t, async_op=True)\nother_computation()\nwork.wait()          # this is what DDP does per gradient BUCKET, launching the\n                     # all-reduce as soon as a bucket fills during backward\n\n# AVERAGING - note there is no ReduceOp.MEAN in NCCL; sum then divide:\ndist.all_reduce(t, op=dist.ReduceOp.SUM); t /= world\n\n# MAKE THE MODELS IDENTICAL AT STEP 0, or the ranks optimize different models\n# while averaging their gradients - which trains, badly, and never errors:\nfor p in model.parameters():\n    dist.broadcast(p.data, src=0)",
          "caption": "set_device before init_process_group is the ordering that matters - two ranks on the same device produce a hang or an opaque NCCL error rather than a clear message. And broadcasting parameters from rank 0 is what guarantees the ranks are averaging gradients of the same model."
        },
        {
          "h": "Ring all-reduce from scratch, and why the job hangs",
          "paras": [
            "Implementing the ring once makes the cost model concrete. The second half is the diagnostic discipline, because the characteristic distributed failure produces no error at all."
          ],
          "code": "def ring_all_reduce(x, rank, world):\n    chunks = list(x.chunk(world))\n    send, recv = (rank + 1) % world, (rank - 1) % world\n    # PHASE 1 - REDUCE-SCATTER: after N-1 steps, rank r owns chunk (r+1)%N\n    # fully summed.\n    for i in range(world - 1):\n        s = (rank - i) % world\n        r = (rank - i - 1) % world\n        dist.send(chunks[s], send); dist.recv(buf, recv)\n        chunks[r] += buf\n    # PHASE 2 - ALL-GATHER: circulate the completed chunks.\n    for i in range(world - 1):\n        s = (rank - i + 1) % world\n        r = (rank - i) % world\n        dist.send(chunks[s], send); dist.recv(chunks[r], recv)\n    return torch.cat(chunks)\n#\n# Each step moves D/N bytes and there are 2(N-1) steps -> 2(N-1)/N * D per\n# rank, essentially FLAT in N. Naive gather-to-root is (N-1)*D and bottlenecks\n# one link. That flatness is why data parallelism scales.\n\n# ---- WHY THE JOB HANGS, AND HOW TO FIND OUT ----\n# Collectives are COLLECTIVE. Every rank must call them, same order, same\n# shapes. A mismatch does not error - it BLOCKS until the NCCL timeout, which\n# is minutes to tens of minutes.\n#\n# THE FOUR CAUSES, in order of frequency:\n#   1. RANK-DEPENDENT CONTROL FLOW that calls a collective on only some ranks:\n#        if rank == 0: dist.all_reduce(stats)      # <-- everyone else waits\n#        if loss > threshold: log_averaged_metric() # <-- diverges per rank!\n#   2. UNEVEN DATA SHARDS -> one rank finishes the epoch early and stops\n#      joining the gradient all-reduce. Pad or drop so counts match exactly.\n#   3. A RANK CRASHED. The others block on the next collective. Always read\n#      rank 0's log AND the others - the real error is often on rank 3.\n#   4. MISMATCHED SHAPES or dtypes in the same collective.\n#\n# THE TOOLS:\n#   TORCH_DISTRIBUTED_DEBUG=DETAIL   -> reports MISMATCHED collectives, which\n#                                       turns the hang into a real message\n#   NCCL_DEBUG=INFO                  -> topology, algorithm choice, errors\n#   py-spy dump --pid <each rank>    -> shows WHICH collective each rank is\n#                                       stuck in; the odd one out is the bug",
          "caption": "The ring's cost is flat in the number of ranks, which is the whole basis of scaling data parallelism. The second half is the practical content: a mismatched collective hangs rather than errors, and TORCH_DISTRIBUTED_DEBUG=DETAIL is what converts that silence into a message."
        }
      ],
      "useCases": [
        "Understanding and debugging DDP, which is gradient bucketing plus asynchronous all-reduce launched during the backward pass - once you know the primitives, its behaviour and its failure modes are predictable rather than mysterious.",
        "Implementing or reasoning about sharded training: FSDP and ZeRO are built directly on the reduce-scatter and all-gather decomposition, and the memory-versus-communication trade of each ZeRO stage is read off which half of the identity you stop at.",
        "Mixture-of-experts routing, which needs all-to-all to send each token to the rank holding its expert and to send the results back - a primitive that appears almost nowhere else and is the defining communication pattern of expert parallelism.",
        "Any custom parallelism: tensor parallelism needs all-reduce inside the forward pass, pipeline parallelism needs point-to-point send and receive between stages, and sequence parallelism needs all-gather along the sequence dimension."
      ],
      "pitfalls": [
        "Calling a collective on only some ranks. Rank-dependent control flow - logging on rank zero, an early exit, a conditional that depends on a per-rank loss value - makes the other ranks block until the timeout. This is the most common distributed bug and it produces no error, only silence.",
        "Uneven data shards. If the shard counts differ, one rank runs out and stops participating in the gradient all-reduce while the others wait forever. Pad by repeating or drop the remainder so every rank has an identical step count.",
        "Forgetting torch.cuda.set_device(local_rank) before initializing the process group. NCCL requires a distinct device per rank; two ranks on device zero hang or produce an opaque error that names nothing useful.",
        "Not broadcasting parameters at startup. If ranks initialize differently they optimize different models while averaging gradients, which trains and converges worse and never errors. Broadcast from rank zero, or seed identically and verify.",
        "Reading only rank zero's logs. When a job hangs, the real error is frequently on another rank, and rank zero is merely blocked on a collective. Collect logs from every rank, and use py-spy to see which collective each is stuck in.",
        "Sending many small tensors. Message cost is a fixed latency plus a transfer term, and with hundreds of parameter tensors the latency dominates. Bucket into tens of megabytes, which is exactly what DDP does and also what enables overlap with backward.",
        "Assuming there is a mean reduction. NCCL provides sum, product, min and max; averaging is a sum followed by a division by the world size, and forgetting the division silently scales your gradients by the number of ranks."
      ],
      "connections": [
        {
          "ref": "training-systems/ddp",
          "text": "The direct application. DDP is gradient bucketing plus asynchronous all-reduce launched as each bucket fills during the backward pass, so its overlap behaviour and its hangs are both consequences of the primitives here."
        },
        {
          "ref": "training-systems/fsdp",
          "text": "Built on the all-reduce equals reduce-scatter plus all-gather identity. ZeRO's stages are choices about how much of the state to keep sharded between the two halves, and the extra communication of stage 3 is the parameter all-gathers that sharding the weights requires."
        },
        {
          "ref": "llm-systems/moe",
          "text": "Expert parallelism is the one place all-to-all is the central primitive - routing each token to the rank holding its expert and returning the results - and it is why MoE's scaling behaviour is dominated by network topology rather than by arithmetic."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Communication buffers are part of the memory budget, and asynchronous collectives interact with the caching allocator - a tensor whose memory is reused while a collective is still reading it is a genuine and hard-to-find bug."
        },
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "Where the timeline view shows communication and computation as separate rows, which is the only convenient way to see whether your overlap is actually happening or whether every all-reduce is stalling the pipeline."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is all-reduce?",
          "a": "Combine a tensor across all ranks with an associative operation and give every rank the result. It is the core primitive of data-parallel training."
        },
        {
          "q": "What is the identity relating all-reduce to other collectives?",
          "a": "all_reduce = all_gather(reduce_scatter(x)). After reduce-scatter each rank has the complete answer for one slice; after all-gather everyone has everything."
        },
        {
          "q": "How does ring all-reduce work?",
          "a": "N-1 reduce-scatter steps passing chunks around a ring so each rank ends up owning one fully-summed chunk, then N-1 all-gather steps circulating those chunks."
        },
        {
          "q": "What does ring all-reduce cost per rank?",
          "a": "2(N-1)/N times D bytes, which is essentially 2D and flat in the number of ranks - against (N-1)D for a naive gather to a root."
        },
        {
          "q": "Why does bucketing matter?",
          "a": "Message cost is a fixed latency plus a transfer term. With hundreds of small parameter tensors the latency dominates, so coalescing into large buckets is enormously cheaper."
        },
        {
          "q": "What second benefit does bucketing give DDP?",
          "a": "Gradients become ready in reverse layer order during backward, so a bucket's all-reduce can launch as soon as it fills - overlapping communication with the rest of the backward pass."
        },
        {
          "q": "What happens if only some ranks call a collective?",
          "a": "The others block until the NCCL timeout. It does not error - it hangs, which is the characteristic distributed failure."
        },
        {
          "q": "Why must you call set_device before init_process_group?",
          "a": "NCCL requires each rank on a distinct device. Two ranks landing on device zero produce a hang or an opaque error rather than a useful message."
        },
        {
          "q": "How do you average across ranks?",
          "a": "All-reduce with SUM then divide by the world size. There is no mean reduction in NCCL, and forgetting the division silently scales gradients by the rank count."
        },
        {
          "q": "Why broadcast parameters at startup?",
          "a": "So every rank optimizes the same model. Different initializations with averaged gradients trains, converges worse, and never errors."
        },
        {
          "q": "What is TORCH_DISTRIBUTED_DEBUG=DETAIL for?",
          "a": "It detects mismatched collectives across ranks and reports them, converting a silent hang into an actual error message."
        },
        {
          "q": "Which collective does mixture-of-experts need?",
          "a": "All-to-all, to route each token to the rank holding its expert and to return the results. It appears almost nowhere else."
        }
      ],
      "standard": [
        {
          "q": "Explain the main collective operations and how data-parallel training uses them.",
          "a": "THE PRIMITIVES, and it helps to organize them by what each rank ends up holding. BROADCAST: one rank's tensor goes to everyone. Used at startup to make all model replicas identical. ALL-REDUCE: combine across ranks with an associative op and give everyone the result. The core of data parallelism. REDUCE: same but only one rank keeps it. ALL-GATHER: everyone ends up with the concatenation of everyone's tensors. REDUCE-SCATTER: combine, and each rank keeps one SLICE of the result. ALL-TO-ALL: a transpose across ranks, where rank i's j-th block goes to rank j. BARRIER: everyone waits. HOW DATA PARALLELISM USES THEM. Each rank holds a full model replica and processes a different shard of the batch. Each computes gradients on its shard. Then ALL-REDUCE with SUM, divided by the world size, gives every rank the average gradient - and the mathematical fact that makes this correct is that the average of per-shard gradients equals the gradient of the full batch, because the loss is a mean over examples. Every rank then applies the same update to identical weights, so replicas stay identical. That is the whole algorithm, and note that after the initial broadcast, all-reduce is the only communication required. HOW IT IS IMPLEMENTED WELL, which is the interesting part. Naive all-reduce sends everything to a root, which receives N-1 copies of the full gradient - linear in N and bottlenecked on one link. RING ALL-REDUCE splits the tensor into N chunks and passes them around a ring: N-1 reduce-scatter steps leave each rank owning one fully-summed chunk, then N-1 all-gather steps distribute them. Each rank moves about 2D bytes REGARDLESS of N. That flatness is why data parallelism scales to thousands of devices, and it is bandwidth-optimal - you cannot move each byte fewer than about twice. THE ENGINEERING THAT MAKES IT FAST. Message cost is a fixed latency plus a size term, and a model has hundreds of parameter tensors, so a per-tensor all-reduce is latency-bound. DDP BUCKETS gradients into tens of megabytes. And because gradients become ready in reverse layer order during the backward pass, DDP launches each bucket's all-reduce as soon as that bucket fills - so communication OVERLAPS with the remaining backward computation, which is why a well-tuned DDP job spends much less on communication than the raw byte count suggests. THE IDENTITY WORTH KNOWING. all-reduce equals reduce-scatter followed by all-gather. That decomposition is what sharded strategies exploit: if a rank only needs its own slice - because it only stores optimizer state for that slice - it can stop after the first half. ZeRO's stages are exactly choices about where to stop and what to keep sharded, and FSDP is built on it.",
          "deepDive": {
            "q": "Derive the ring all-reduce cost and explain why it is bandwidth-optimal.",
            "a": "THE SETUP. N ranks in a logical ring, each holding a tensor of D bytes to be summed. Split each rank's tensor into N chunks of D/N bytes. PHASE 1 - REDUCE-SCATTER, N-1 steps. In step i, each rank sends one chunk to its right neighbour and receives one from its left, adding the received chunk into its own copy. The indices are chosen so that after N-1 steps, each rank holds exactly one chunk that has accumulated contributions from ALL ranks - rank r ends up owning the fully-summed chunk at some fixed offset from r. Bytes sent per rank in this phase: (N-1) times D/N. PHASE 2 - ALL-GATHER, N-1 steps. Now circulate the completed chunks around the same ring, each rank forwarding what it received, so after N-1 steps every rank has all N completed chunks. Bytes sent per rank: another (N-1) times D/N. TOTAL: 2(N-1)D/N per rank, which tends to 2D as N grows. The key property is that this is INDEPENDENT OF N to first order - doubling the number of ranks does not increase the bytes any single rank must send. WHY IT IS OPTIMAL. A lower-bound argument: at the end, every rank must possess the sum, which depends on data originally held by every other rank. Consider any single rank. It must RECEIVE at least D bytes of information it did not have - it cannot know the others' contributions otherwise. And it must SEND at least D bytes, because its own data must reach every other rank in some form. So 2D per rank is a lower bound on the traffic, and the ring achieves 2(N-1)D/N, which is within a factor (N-1)/N of it. That gap vanishes as N grows. So ring all-reduce is bandwidth-optimal up to that factor, and the result is due to Patarasuk and Yuan. WHERE IT IS NOT THE BEST CHOICE, which is what a good answer adds. The ring is optimal in BANDWIDTH and poor in LATENCY: it takes 2(N-1) sequential steps, so the fixed per-message cost is paid 2(N-1) times. For SMALL tensors, where latency dominates, that is bad - and a TREE algorithm, with logarithmic depth, is much better: it costs more bandwidth but only about 2*log(N) steps. This is precisely why NCCL implements both and selects between them based on message size and detected topology, and it is why the bucket size in DDP is a real tuning parameter rather than an arbitrary constant - it moves you along the latency-versus-bandwidth trade. TOPOLOGY MATTERS TOO, and the simple ring model ignores it. Real hardware is hierarchical: fast NVLink within a node, slower InfiniBand or Ethernet between nodes. A topology-unaware ring would send chunks across the slow inter-node link many times. NCCL builds hierarchical rings and trees - reduce within a node over NVLink first, then across nodes, then broadcast back down - so the slow link carries the traffic once rather than N times. That is why NCCL_DEBUG=INFO printing the detected topology and chosen algorithm is worth reading when performance is disappointing: a misdetected topology, or a container that hides the interconnect, silently costs a large factor."
          }
        },
        {
          "q": "Your distributed job hangs. Walk through the diagnosis.",
          "a": "A HANG IS THE CHARACTERISTIC DISTRIBUTED FAILURE and it means some ranks are waiting at a collective that others never reached. There is no error to read, so the diagnosis is about establishing WHERE each rank is. STEP 1: FIND OUT WHICH COLLECTIVE EACH RANK IS IN. py-spy dump on every process gives a Python stack per rank. Almost always the picture is stark: most ranks are blocked in the same collective and one is somewhere else entirely, or has died. The odd one out names the bug. This takes a minute and is the single most effective step. STEP 2: TURN ON THE DEBUG FLAGS. TORCH_DISTRIBUTED_DEBUG=DETAIL detects mismatched collectives across ranks - different operations, different shapes, different order - and reports them, which converts the silence into an actual message. NCCL_DEBUG=INFO prints topology, algorithm selection, and errors. Between them, most hangs become diagnosable without further work. STEP 3: READ EVERY RANK'S LOGS, not just rank zero's. A very common situation is that rank three crashed with a real error - an out-of-memory, a data problem, an assertion - and every other rank is simply blocked on the next collective waiting for it. Rank zero's log shows nothing wrong because nothing is wrong with rank zero. If your logging setup only captures rank zero, fix that first, because it hides the actual error by construction. THE FOUR CAUSES, in order of frequency. (1) RANK-DEPENDENT CONTROL FLOW that calls a collective on only some ranks. The clean version is easy to spot - if rank == 0 around something that reduces. The nasty version is a condition that depends on data: if loss > threshold: log_averaged_metric() diverges between ranks because the losses differ, so some ranks call the collective inside and others do not. Any conditional whose predicate is rank-dependent and whose body communicates is a hang waiting to happen. (2) UNEVEN DATA. If shards have different lengths, one rank finishes the epoch and stops joining the gradient all-reduce. Pad by repeating or drop the remainder so step counts match exactly - and be aware that this bites in EVALUATION too, where dropping corrupts the metric and padding requires deduplication. (3) A CRASHED OR OOM-KILLED RANK, per step 3. (4) MISMATCHED SHAPES or dtypes in the same collective, which DETAIL will report. STEP 4: THE TIMEOUT. NCCL's default timeout is long, which is why a hang feels indefinite. Lowering it during development turns a hang into a crash with a stack trace much sooner, which is a genuine improvement in iteration speed. PREVENTION, which is where the real leverage is. Never put a collective inside a data-dependent branch. If you need a rank-dependent decision that affects communication, compute the decision on rank zero and BROADCAST it, so every rank takes the same path. Assert that shard counts are identical across ranks at startup - one all-reduce of the local length, compared against the world minimum and maximum. And log from every rank, to separate files, from the start."
        },
        {
          "q": "How do DDP and FSDP differ in what they communicate?",
          "a": "DDP: FULL REPLICAS, GRADIENT ALL-REDUCE. Every rank holds a complete copy of the parameters, gradients and optimizer state, and processes a different batch shard. The only communication is one all-reduce of the gradients per step, so about 2D bytes per rank with the ring algorithm, where D is the model size in gradient bytes. Memory per device is 16 bytes per parameter under mixed-precision Adam, and it is FLAT in the number of devices - adding GPUs never helps you fit a larger model, only process a larger batch. FSDP AND ZeRO: SHARDED STATE, MORE COLLECTIVES. The state is divided across ranks, and the extra communication is what reconstitutes it on demand. Working through the stages using the decomposition identity: ZeRO-1 shards the OPTIMIZER STATE. Gradients are still all-reduced, each rank updates only its slice of parameters, then the updated parameters are all-gathered. Memory drops to 4P + 12P/N. Communication is roughly unchanged from DDP. ZeRO-2 additionally shards the GRADIENTS, so instead of all-reduce you use REDUCE-SCATTER - each rank receives only the summed gradient slice it needs. That is the first half of the identity, and it costs about half the traffic of an all-reduce. Memory 2P + 14P/N. ZeRO-3 / FSDP shards the PARAMETERS too. Now a layer's weights are not resident, so before the forward pass of each layer you must ALL-GATHER its parameters, use them, and free them; the same happens again in backward. Memory is 16P/N - genuinely divided by the device count, which is what lets a model larger than one device fit. Communication rises to roughly 1.5 times DDP's, because you have added parameter all-gathers in both forward and backward on top of the gradient reduce-scatter. THE TRADE, stated plainly. DDP: minimum communication, memory flat in N, so the model must fit on one device. FSDP: memory divided by N, so arbitrarily large models fit, at about 1.5 times the communication and a more complex execution schedule. There is no free lunch and the choice is determined by whether the model fits. WHAT MAKES FSDP WORK IN PRACTICE. The all-gathers are PREFETCHED - the parameters for layer i+1 are gathered while layer i computes - so the communication overlaps with computation and the wall-clock cost is much less than the byte count suggests. This is the same overlap trick as DDP's bucketing, applied to a different collective, and when someone reports FSDP being slow it is usually because the prefetching is not happening: wrapping granularity too coarse or too fine, or a model structure that prevents it. THE PRACTICAL SELECTION RULE. Model fits comfortably on one device: DDP, always - it is simpler and faster. Model does not fit: FSDP. Model fits but optimizer state is the binding constraint: ZeRO-1 or -2, which give most of the memory benefit at DDP-like communication and are under-used relative to how often that is the actual situation.",
          "deepDive": {
            "q": "Why does averaging per-shard gradients equal the full-batch gradient, and where does that argument break?",
            "a": "THE ARGUMENT. The loss over a batch B is typically a MEAN over examples: L(theta) = (1/|B|) sum over examples of l(theta, x). Split B into N disjoint shards of equal size. The gradient of the full-batch loss is (1/|B|) sum over all examples of grad l. Each rank computes the gradient of ITS shard's mean loss, which is (N/|B|) sum over its own examples of grad l. Averaging those N per-rank gradients gives (1/N) times the sum, which is (1/|B|) sum over all examples - exactly the full-batch gradient. So the average is EXACT, not an approximation. Each individual rank's gradient is a biased view of the full batch, but their mean is precisely right, and that is the entire correctness basis of data-parallel training. WHERE IT BREAKS - four cases, and each corresponds to a real bug. (1) UNEQUAL SHARD SIZES. If ranks have different numbers of examples, the unweighted average of per-rank means is NOT the full-batch mean - it over-weights examples on ranks with fewer of them. Padding to equal size fixes it; dropping the remainder fixes it; averaging without checking silently computes a slightly wrong gradient. This matters most in evaluation, where the analogous error corrupts a reported metric. (2) NON-LINEAR REDUCTIONS IN THE LOSS. The argument depends on the loss being a MEAN, so the gradient operator commutes with the averaging. A loss that is not a per-example mean breaks it - a contrastive loss with in-batch negatives is the canonical case: each rank's InfoNCE denominator contains only ITS OWN batch's negatives, so the per-rank losses are not shards of a single global loss at all, and the averaged gradient is not the gradient of the global objective. That is why contrastive methods need an explicit all-gather of embeddings before computing the loss, and it is a real and commonly-missed correctness issue rather than a performance optimization. (3) BATCH-DEPENDENT LAYERS. BatchNorm computes statistics over the LOCAL batch, so each replica normalizes differently and the model is not, strictly, one function being evaluated on a shard. Usually tolerated, and SyncBatchNorm exists to make the statistics global for cases where it matters - small per-device batches especially. (4) ANY PER-BATCH NORMALIZATION in the loss - dividing by the number of non-padded tokens, for instance. If the token counts differ per rank, averaging the per-rank normalized losses is not the globally normalized loss, for the same reason as case (1). The correct treatment is to all-reduce the token count and the summed loss separately and divide once. THE PRACTICAL SUMMARY I WOULD GIVE. Data parallelism is exact when the objective decomposes as a sum over examples and the shards are equal. Every failure of that condition - unequal shards, in-batch interactions, batch statistics, per-batch normalizers - is a place where the averaged gradient is subtly wrong, and none of them produce an error. Being able to name which of those apply to your loss is the check worth doing before scaling out."
          }
        },
        {
          "q": "How would you profile and improve communication in a distributed job?",
          "a": "FIRST, ESTABLISH WHETHER COMMUNICATION IS ACTUALLY THE PROBLEM, because it is assumed far more often than measured. THE SCALING TEST. Run on 1, 2, 4, 8 devices with the same per-device batch and measure throughput per device. Perfect scaling means flat per-device throughput. The shape of the falloff tells you a great deal: a gentle decline suggests communication overhead growing; a cliff at the node boundary points at the inter-node interconnect; no scaling at all from one to two suggests something is serializing entirely. This is the most informative experiment and it takes twenty minutes. THE PROFILER TIMELINE. torch.profiler with the distributed rows shows computation and NCCL kernels on separate streams. What you are looking for is OVERLAP: are the all-reduce kernels running concurrently with backward computation, or does the compute stream go idle while communication proceeds? A timeline with visible gaps aligned to communication is the diagnosis. This is the only convenient way to see overlap, and it is worth the setup. NCCL_DEBUG=INFO tells you the detected topology and the algorithm chosen, which catches the case where the fast interconnect was not detected - a container without the right device access, or a misconfigured network - and that alone can be a large factor. THE FIXES, in order of typical impact. (1) VERIFY THE OVERLAP IS HAPPENING. DDP launches a bucket's all-reduce when the bucket fills during backward, so most communication should hide behind computation. If it is not, the usual causes are: gradient accumulation without no_sync, so you all-reduce on every micro-step instead of only the last one - which is a large and easily-fixed waste; a model whose backward finishes too fast relative to the communication; or find_unused_parameters=True, which forces a traversal and delays bucket readiness. (2) TUNE THE BUCKET SIZE. Too small and you are latency-bound with many messages; too large and the first bucket cannot launch until late in the backward pass, reducing overlap. It is a real parameter and the default is not always right for very large or very small models. (3) REDUCE THE BYTES. Gradient compression, or communicating in bf16 rather than fp32, halves the traffic and is usually quality-neutral for the all-reduce specifically. (4) INCREASE THE COMPUTE PER COMMUNICATION. A larger per-device batch, or gradient accumulation with no_sync, raises the ratio of computation to communication and is often the simplest effective change - though it changes the effective batch size, which is a modelling decision rather than only a systems one. (5) TOPOLOGY: keep communication within nodes where possible, and check that NCCL is using NVLink rather than falling back to PCIe. WHAT I WOULD MEASURE TO KNOW WHETHER I SUCCEEDED. Per-device throughput at the target scale against the single-device baseline - the scaling efficiency - rather than any absolute number. And I would be honest that some of the falloff is not communication at all: stragglers, an input pipeline that cannot feed N devices, and per-step synchronization from logging are all common and are frequently misattributed to the network. The scaling test with a synthetic fixed batch, bypassing the data loader, separates those cleanly and is worth running before optimizing anything."
        },
        {
          "q": "What is all-to-all for, and why is mixture-of-experts communication difficult?",
          "a": "WHAT ALL-TO-ALL DOES. It is a transpose across ranks: rank i's j-th block is sent to rank j, and rank i receives everyone's i-th block. Every rank both sends to and receives from every other rank. It is the most communication-intensive collective in ordinary use, because unlike all-reduce there is no structure to exploit - the data genuinely has to be permuted across the whole system. WHY MoE NEEDS IT. In expert parallelism, different ranks hold different experts. Each token is routed by a gate to one or two experts, which are probably on other ranks. So: (1) each rank computes routing for its own tokens; (2) ALL-TO-ALL to send each token to the rank holding its assigned expert; (3) each rank runs its expert on whatever arrived; (4) ALL-TO-ALL again to send the results back to the ranks that own those tokens. Two all-to-all operations per MoE layer, in both forward and backward. WHY IT IS DIFFICULT - and the reasons compound. (1) IT IS ALL-PAIRS. Traffic scales with the full cross-product of ranks, so it stresses bisection bandwidth rather than any single link. Where all-reduce can be arranged hierarchically to cross the slow inter-node link once, all-to-all fundamentally must cross it, and MoE performance therefore tracks network topology more directly than any other parallelism strategy. (2) THE LOAD IS DATA-DEPENDENT AND UNBALANCED. How many tokens go to each expert depends on the gate's decisions, which vary per batch. So the message sizes are irregular and unpredictable, some ranks receive far more tokens than others, and everyone waits for the slowest. This is the central practical problem of MoE training. The standard responses are a CAPACITY FACTOR - a hard cap on tokens per expert, dropping the overflow, which bounds the imbalance at the cost of discarding computation - and an AUXILIARY LOAD-BALANCING LOSS that penalizes uneven routing so the gate learns to spread tokens. Both are workarounds for a fundamentally dynamic communication pattern. (3) IT DOES NOT OVERLAP EASILY. DDP's gradient all-reduce overlaps with backward because gradients become ready progressively. An MoE all-to-all sits in the middle of the forward pass and everything after it depends on it, so there is much less to hide it behind. Implementations work hard at overlapping the two all-to-alls with the expert computation of other layers, and it is genuinely harder. (4) IT INTERACTS WITH EVERY OTHER PARALLELISM. A real large-scale system combines data, tensor, pipeline and expert parallelism, and the expert dimension's all-to-all must be arranged to use the fastest available links while the others also compete for them. THE SUMMARY I WOULD GIVE. MoE trades arithmetic for communication: it gives you far more parameters at constant FLOPs per token, and it pays in an all-pairs communication pattern with data-dependent, unbalanced message sizes that is hard to overlap. That is why MoE is a systems achievement as much as a modelling one, and why its practical scaling is determined by interconnect quality rather than by compute."
        },
        {
          "q": "How do you make a distributed job reproducible and correct at startup?",
          "a": "THE CHECKS I WOULD RUN AT STARTUP, before any training, because each catches a failure that is otherwise silent. (1) IDENTICAL MODELS ACROSS RANKS. Either seed every rank identically and construct the model, or - more robustly - construct on rank zero and BROADCAST every parameter and buffer. I prefer the broadcast because it is immune to any source of construction non-determinism. Then VERIFY: all-reduce a hash or the sum of parameter norms and assert every rank agrees. If ranks start from different weights, they will average gradients of different models, which trains, converges worse, and never errors - the worst kind of bug. (2) IDENTICAL SHARD COUNTS. All-reduce the local number of batches with MIN and with MAX and assert they are equal. Unequal counts mean a rank runs out early and the job hangs at the next collective. This one assertion prevents the most common hang. (3) DISTINCT DEVICES. Assert torch.cuda.current_device() equals local_rank, and that set_device was called BEFORE init_process_group. Two ranks on one device produce an opaque NCCL failure. (4) CONSISTENT CONFIGURATION. All-reduce a hash of the config - hyperparameters, model architecture, precision - and assert agreement. A mismatched learning rate across ranks is silent and produces a slowly diverging mess. THE SEEDING, which needs care because the requirements differ per component. Model initialization must be IDENTICAL, so use the same seed or broadcast. Data ordering must DIFFER per rank - that is the point of sharding - so DistributedSampler seeds from a shared base plus the epoch and then takes the rank's stride, which is both reproducible and disjoint. Augmentation randomness should differ per rank AND per worker, so seed from (base, epoch, rank, worker_id). Dropout differs naturally and does not need to match. Getting this wrong in the direction of too much sharing means every rank sees identical augmentations, silently reducing effective diversity by the world size. (5) set_epoch EVERY EPOCH on the sampler, or the shuffle is identical every epoch across the whole run. WHAT REMAINS NON-DETERMINISTIC even after all this. NCCL reductions do not guarantee a fixed summation ORDER, and floating-point addition is not associative - so bitwise-identical results across runs are not achievable in general even with everything seeded. Deterministic algorithm flags help within a device but not across the collective. So the honest target is 'the conclusion reproduces', and I would establish the run-to-run spread of the final metric once, so I know which differences my experiments can actually support. THE PRACTICE I WOULD INSIST ON. Write these checks as a startup function that runs on every job and fails loudly. They cost seconds, they run before any expensive work, and each one converts a silent multi-hour failure into an immediate error message - which is the highest-leverage engineering available in distributed training."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Ring all-reduce cost",
        "back": "2(N-1)/N * D bytes per rank -> ~2D, essentially FLAT in the number of ranks. Naive gather-to-root is (N-1)*D and bottlenecks one link. This flatness is why data parallelism scales to thousands of devices."
      },
      {
        "type": "formula",
        "front": "The decomposition behind all sharding",
        "back": "all_reduce = all_gather(reduce_scatter(x)). After reduce-scatter each rank has the COMPLETE answer for one SLICE; after all-gather everyone has everything. ZeRO's stages are choices about where to stop and what to keep sharded."
      },
      {
        "type": "intuition",
        "front": "Why ring all-reduce is bandwidth-optimal",
        "back": "Each rank must RECEIVE >= D bytes (it cannot know others' data otherwise) and SEND >= D bytes (its data must reach everyone). So 2D is a lower bound, and the ring achieves 2(N-1)/N*D. But it is LATENCY-poor: 2(N-1) sequential steps, which is why NCCL also uses TREE algorithms for small messages."
      },
      {
        "type": "pitfall",
        "front": "A mismatched collective HANGS, it does not error",
        "back": "Every rank must call every collective, same ORDER, same SHAPES. Violate it and ranks block until the NCCL timeout (minutes). TORCH_DISTRIBUTED_DEBUG=DETAIL detects mismatches and converts the silence into a message."
      },
      {
        "type": "pitfall",
        "front": "The nastiest hang: a DATA-dependent branch",
        "back": "`if rank == 0:` around a collective is easy to spot. `if loss > threshold: log_averaged_metric()` DIVERGES between ranks because the losses differ. Any conditional with a rank-dependent predicate and a communicating body is a hang waiting to happen - broadcast the decision instead."
      },
      {
        "type": "formula",
        "front": "Why bucketing matters",
        "back": "T(S) = alpha + S/beta. With hundreds of parameter tensors, k*alpha dominates - so many small messages cost far more than one large one. DDP buckets to tens of MB, which ALSO enables overlap: gradients arrive in reverse layer order, so a bucket's all-reduce launches as soon as it fills."
      },
      {
        "type": "pitfall",
        "front": "set_device BEFORE init_process_group",
        "back": "NCCL requires each rank on a DISTINCT device. Two ranks landing on device 0 produce a hang or an opaque error naming nothing useful. Also assert current_device() == local_rank at startup."
      },
      {
        "type": "intuition",
        "front": "Why averaging shard gradients is EXACT",
        "back": "The loss is a MEAN over examples, so the mean of per-shard gradients IS the full-batch gradient - not an approximation. Each rank's gradient alone is a biased view; their average is precisely right. That is the entire correctness basis of data parallelism."
      },
      {
        "type": "pitfall",
        "front": "Where the gradient-averaging argument BREAKS",
        "back": "(1) unequal shard sizes; (2) losses that are NOT a per-example mean - a CONTRASTIVE loss's in-batch negatives are only local, so you must all-gather embeddings first; (3) BatchNorm's local statistics; (4) per-batch normalizers like token counts. None of these error."
      },
      {
        "type": "definition",
        "front": "DDP vs ZeRO stages, by communication",
        "back": "DDP: ~2D (one all-reduce), memory FLAT in N. ZeRO-1: shard optimizer state, ~same comm. ZeRO-2: shard grads too - REDUCE-SCATTER instead of all-reduce. ZeRO-3/FSDP: shard params, adding parameter ALL-GATHERS in fwd and bwd -> ~1.5x DDP comm, memory 16P/N."
      },
      {
        "type": "pitfall",
        "front": "Gradient accumulation without no_sync",
        "back": "DDP all-reduces on EVERY backward by default, so accumulating k micro-batches does k all-reduces instead of one. Wrap the non-final micro-steps in model.no_sync(). A large, common, easily-fixed waste."
      },
      {
        "type": "intuition",
        "front": "Why MoE communication is hard",
        "back": "All-to-all is ALL-PAIRS, so it stresses bisection bandwidth and MUST cross the slow inter-node link (unlike all-reduce, which can be hierarchical). Worse, message sizes are DATA-DEPENDENT and unbalanced - hence capacity factors and load-balancing losses - and it sits mid-forward, so it does not overlap easily."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Distributed communication package (torch.distributed)",
        "url": "https://pytorch.org/docs/stable/distributed.html"
      },
      {
        "title": "Li et al. (2020), PyTorch Distributed: Experiences on Accelerating Data Parallel Training",
        "url": "https://arxiv.org/abs/2006.15704"
      },
      {
        "title": "Patarasuk & Yuan (2009), Bandwidth Optimal All-reduce Algorithms for Clusters of Workstations",
        "url": "https://www.sciencedirect.com/science/article/pii/S0743731508001767"
      },
      {
        "title": "Rajbhandari et al. (2020), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models",
        "url": "https://arxiv.org/abs/1910.02054"
      },
      {
        "title": "NVIDIA: NCCL User Guide",
        "url": "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/index.html"
      }
    ],
    "demos": [
      "batching",
      "moe",
      "mixed-precision",
      "autoscaling"
    ],
    "demoTitles": {
      "batching": "Dynamic Batching",
      "moe": "Mixture of Experts (MoE)",
      "mixed-precision": "Mixed Precision",
      "autoscaling": "Autoscaling"
    }
  }
};
