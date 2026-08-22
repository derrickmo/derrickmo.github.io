// GENERATED from content/lessons/pytorch-internals/cuda-memory.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/pytorch-internals/cuda-memory/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "cuda-memory": {
    "level": "core",
    "body": {
      "intuition": [
        "PyTorch does not hand freed GPU memory back to the driver. cudaMalloc and cudaFree are synchronizing and slow, so PyTorch runs its own CACHING ALLOCATOR: it requests large segments from the driver, carves your tensors out of them, and when a tensor is freed it keeps the block for reuse. That is why allocation is fast and it is why nvidia-smi is not measuring what you think. nvidia-smi reports what the allocator has RESERVED from the driver, plus several hundred megabytes of CUDA context, plus any other process - not the memory your live tensors occupy. Reading it as your model's memory usage is the single most common confusion in this area.",
        "Which is why the error message people find most baffling is the honest one. Tried to allocate 2.00 GiB, 5.00 GiB free - because that free memory is not CONTIGUOUS. The allocator has plenty of total space carved into blocks that are individually too small, and no single block can satisfy the request. That is fragmentation, and it is caused most often by varying tensor sizes: a training run with variable sequence lengths allocates and frees differently-shaped activations every step, and the free space gradually becomes unusable rubble. The fix is not empty_cache, which merely returns the cache to the driver and slows everything down; it is either expandable_segments, which lets segments grow through virtual memory instead of being fixed-size, or making your allocations regular by bucketing lengths.",
        "The deeper point is that PyTorch's memory behaviour is a system with its own state, and every diagnostic that treats it as a simple number will mislead. Four separate quantities matter - allocated, max allocated, reserved, max reserved - and each answers a different question. Allocations are asynchronous with respect to your Python code, so an out-of-memory error is frequently raised at a line that is not where the memory went. And the modern tool for all of this, the memory snapshot recorder, produces a timeline showing every allocation with the stack that made it, which turns this whole class of investigation from guesswork into reading a chart. It is dramatically under-used relative to how well it works."
      ],
      "math": [
        {
          "h": "Where the memory actually is",
          "paras": [
            "Four terms, and knowing which one dominates determines the fix. The first three scale with parameters; the fourth scales with batch and sequence length, and for training it is usually the largest.",
            "Under mixed-precision Adam the parameter-side terms total about 16 bytes per trainable parameter, of which only 2 are the weights."
          ],
          "tex": "M = \\underbrace{2P}_{\\text{weights}} + \\underbrace{2P_t}_{\\text{grads}} + \\underbrace{12P_t}_{\\text{fp32 master} + m,v} + \\underbrace{c \\cdot B \\cdot L \\cdot d \\cdot \\text{bytes}}_{\\text{activations}} + \\underbrace{\\text{workspace}}_{\\text{cuDNN, comm buffers}}",
          "texNote": "Read the exponents of your own problem. For a small model with a huge batch, activations dominate and the fix is checkpointing or micro-batching. For a large model with a small batch, the parameter terms dominate and the fix is LoRA, quantization, or sharding. Applying the wrong one gives no benefit, which is why the decomposition is worth computing before choosing a technique."
        },
        {
          "h": "Fragmentation: why total free is not the largest allocatable",
          "paras": [
            "The allocator holds a set of segments, each carved into used and free blocks. A request succeeds only if some single free block is large enough, so the quantity that matters is the MAXIMUM free block, not the sum.",
            "Repeatedly allocating and freeing tensors of varying sizes drives a wedge between the two."
          ],
          "tex": "\\text{allocatable}(s) = \\big[\\exists\\, b \\in \\text{free blocks} : |b| \\ge s\\big] \\quad\\text{but}\\quad \\sum_{b} |b| \\;\\gg\\; \\max_b |b|",
          "texNote": "This is why the error reports free memory alongside a failed allocation - both numbers are true. The classic generator is variable sequence length: each step allocates activations of a different shape, so freed blocks never quite fit the next request. Bucketing lengths into a few fixed sizes makes the allocation pattern repeat, so blocks are reused exactly."
        },
        {
          "h": "The four numbers, and what each answers",
          "paras": [
            "PyTorch exposes allocated and reserved, each with a running maximum. They answer genuinely different questions and conflating them is what makes memory debugging feel arbitrary."
          ],
          "tex": "\\text{allocated} \\le \\text{reserved} \\le \\text{nvidia-smi} - \\text{context} - \\text{other processes} \\\\[4pt] \\text{fragmentation} \\;\\approx\\; \\text{max\\_reserved} - \\text{max\\_allocated}",
          "texNote": "allocated is what your live tensors occupy right now; max_allocated is the peak, which is the number that decides whether the job fits. reserved is what the allocator holds from the driver; the gap between max_reserved and max_allocated is cache and fragmentation. If that gap is large and growing, you have a fragmentation problem rather than a model that is too big - and the two have completely different fixes."
        }
      ],
      "code": [
        {
          "h": "Read the right number, and record a snapshot when it is not enough",
          "paras": [
            "The four quantities and the tool that supersedes guessing. The snapshot recorder produces a timeline of every allocation with the Python stack that caused it, viewable in a browser."
          ],
          "code": "def mem(tag=\"\"):\n    a  = torch.cuda.memory_allocated()     / 2**30   # LIVE tensors, right now\n    ma = torch.cuda.max_memory_allocated() / 2**30   # PEAK live -> does it fit?\n    r  = torch.cuda.memory_reserved()      / 2**30   # held from the DRIVER\n    mr = torch.cuda.max_memory_reserved()  / 2**30\n    print(f\"{tag:20s} alloc {a:6.2f}  peak {ma:6.2f}  reserved {r:6.2f}\"\n          f\"  frag~{mr - ma:5.2f} GiB\")\ntorch.cuda.reset_peak_memory_stats()      # call before a measured region\n\n# nvidia-smi shows RESERVED + ~300-600 MB CUDA CONTEXT + other processes.\n# It is not your model's memory. Do not tune against it.\n\n# THE SNAPSHOT RECORDER - the modern tool, and badly under-used:\ntorch.cuda.memory._record_memory_history(max_entries=100_000)\ntrain_a_few_steps()\ntorch.cuda.memory._dump_snapshot(\"mem.pickle\")\ntorch.cuda.memory._record_memory_history(enabled=None)\n#   Open at pytorch.org/memory_viz - a timeline of EVERY allocation with the\n#   Python stack that made it. It answers 'what is holding this memory' and\n#   'where does the peak come from' directly, instead of by bisection.\n\n# WHY AN OOM POINTS AT THE WRONG LINE:\n#   CUDA work is ASYNCHRONOUS. Your Python runs ahead of the device, so the\n#   allocation that fails is often not the one your traceback names. For a\n#   truthful traceback, run with CUDA_LAUNCH_BLOCKING=1 - slow, but it makes\n#   the error surface at the operation that caused it.",
          "caption": "Four numbers answering four questions: max_allocated decides whether the job fits, and the gap between max_reserved and max_allocated is your fragmentation. The snapshot recorder replaces the entire guess-and-bisect workflow with a timeline you read."
        },
        {
          "h": "Fragmentation, and the leaks that look like it",
          "paras": [
            "Two failure shapes that present identically as a rising memory graph and have different causes. Distinguishing them is the whole diagnosis."
          ],
          "code": "# ---- FRAGMENTATION: allocated is FLAT, reserved keeps CLIMBING ----\n#   Trigger: varying tensor sizes - variable sequence lengths are the classic.\n#   Symptom: 'tried to allocate 2.00 GiB ... 5.00 GiB free' (both true - the\n#            free memory is not CONTIGUOUS).\n#   FIXES, in order of preference:\n#     1. PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True\n#        Segments grow via virtual memory instead of being fixed-size, so\n#        varying sizes stop producing unusable rubble. Usually the whole fix.\n#     2. BUCKET the variable dimension into a few fixed sizes, so the\n#        allocation pattern REPEATS and blocks are reused exactly.\n#     3. Sort batches by length so consecutive steps are similar.\n#     4. torch.cuda.empty_cache() - returns the CACHE to the driver. This is\n#        almost never the right answer: it does not fix fragmentation, it is\n#        slow (it synchronizes), and the memory is immediately re-reserved.\n#        Use it only to release memory to ANOTHER process.\n\n# ---- LEAKS: allocated ITSELF climbs, step over step ----\nlosses.append(loss)            # <-- keeps the ENTIRE autograd graph alive,\nlosses.append(loss.item())     #     every step. THE classic. Use .item().\n\nouts.append(model(x))          # retains graph; use .detach() if you need the\nouts.append(model(x).detach()) #     values\n\nloss.backward(retain_graph=True)  # usually a symptom, not a solution - it\n                                  # means you are reusing a graph you probably\n                                  # meant to rebuild\n\nhandle = m.register_forward_hook(store)   # a retained hook closing over\nhandle.remove()                           # outputs holds them + their graph\n\nopt.zero_grad(set_to_none=True)   # frees the gradient tensors rather than\n                                  # zeroing them in place - the default now,\n                                  # and worth a real amount at large scale\n\n# THE DIAGNOSTIC THAT SPLITS THEM, in one line per step:\n#   allocated flat, reserved rising  -> FRAGMENTATION\n#   allocated rising                 -> LEAK (something is being retained)",
          "caption": "The two shapes look identical on a memory chart and have opposite fixes. Log allocated and reserved separately every step: flat allocated with rising reserved is fragmentation, rising allocated is a retention leak."
        }
      ],
      "useCases": [
        "Diagnosing an out-of-memory error, which is the everyday application - and where knowing whether the model is genuinely too large, the activations are too large, or the memory is merely fragmented determines which of three unrelated fixes to apply.",
        "Fitting a larger model or batch than the card nominally supports, by identifying which term of the budget dominates and applying the technique that targets it - checkpointing for activations, quantization or sharding for parameters.",
        "Serving, where memory determines how many concurrent requests fit and where the KV cache dominates. Paged attention exists precisely because KV-cache fragmentation was wasting a large fraction of serving memory.",
        "Multi-tenant machines, where set_per_process_memory_fraction and explicit release prevent one caching allocator from holding memory another process needs - the allocator's default behaviour is to keep everything it has ever used."
      ],
      "pitfalls": [
        "Reading nvidia-smi as your model's memory usage. It shows what the caching allocator has RESERVED plus several hundred megabytes of CUDA context plus other processes. Use max_memory_allocated to decide whether a job fits.",
        "Calling empty_cache to fix fragmentation. It returns the cache to the driver, which does not defragment anything, synchronizes the device, and is immediately undone as the allocator re-reserves. It is for releasing memory to another process and almost nothing else.",
        "Appending loss to a list instead of loss.item(). The tensor carries its autograd graph, so you retain the entire graph for every step - the classic training-loop leak, which presents as steadily rising allocated memory with no other symptom.",
        "Trusting the traceback of an out-of-memory error. CUDA execution is asynchronous, so the failing allocation is frequently not at the line reported. Rerun with CUDA_LAUNCH_BLOCKING=1 for a truthful location, accepting the slowdown.",
        "Confusing fragmentation with a leak. Flat allocated memory with climbing reserved memory is fragmentation; climbing allocated memory is retention. They look identical on a memory chart and have completely different fixes, so log both.",
        "Using retain_graph=True to make an error go away. It is almost always a symptom of accidentally reusing a graph you meant to rebuild, and it keeps every intermediate activation alive. Fix the reuse instead.",
        "Optimizing the wrong term of the budget. Gradient checkpointing does nothing if parameters dominate; quantizing the weights does nothing if activations dominate. Compute the decomposition first - it is arithmetic, and it takes two minutes."
      ],
      "connections": [
        {
          "ref": "training-systems/gradient-checkpointing",
          "text": "The lever for the activation term specifically, trading roughly one extra forward pass for O(sqrt(L)) activation memory - and it must be SEGMENTED, since checkpointing every layer stores a boundary per layer and saves almost nothing."
        },
        {
          "ref": "training-systems/mixed-precision",
          "text": "Halves the activation and gradient terms and introduces the fp32 master copy that is part of the 16-bytes-per-parameter accounting. bf16 removes the loss-scaling machinery that fp16's narrow range requires."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The lever for the weight term, and the reason QLoRA works - a frozen weight needs only enough precision for a forward pass, so 4 bits suffices where a trainable one would round its updates away."
        },
        {
          "ref": "pytorch-internals/data-pipelines",
          "text": "Pinned host memory is the other side of the transfer: page-locked pages cannot be swapped, so over-pinning degrades the whole machine rather than just your process."
        },
        {
          "ref": "llm-systems/speculative-decoding",
          "text": "Serving-side memory is dominated by the KV cache, and paged attention exists because KV-cache fragmentation - exactly the phenomenon in this lesson - was wasting a large share of serving capacity."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does PyTorch not return freed GPU memory to the driver?",
          "a": "cudaMalloc and cudaFree are synchronizing and slow. PyTorch runs a caching allocator that keeps freed blocks for reuse, which makes allocation fast."
        },
        {
          "q": "What does nvidia-smi actually show?",
          "a": "What the caching allocator has reserved from the driver, plus several hundred megabytes of CUDA context, plus any other process. Not your live tensor memory."
        },
        {
          "q": "What are the four memory numbers?",
          "a": "memory_allocated (live tensors now), max_memory_allocated (peak - decides whether it fits), memory_reserved (held from the driver), and max_memory_reserved."
        },
        {
          "q": "How do you estimate fragmentation?",
          "a": "max_memory_reserved minus max_memory_allocated. A large and growing gap means fragmentation rather than a model that is too big."
        },
        {
          "q": "Why does OOM report free memory alongside the failed allocation?",
          "a": "Because both are true - the free memory is not contiguous. A request succeeds only if a single free block is large enough, not if the total is."
        },
        {
          "q": "What causes fragmentation most often?",
          "a": "Varying tensor sizes. Variable sequence lengths allocate differently-shaped activations every step, so freed blocks never quite fit the next request."
        },
        {
          "q": "What does expandable_segments do?",
          "a": "Lets allocator segments grow through virtual memory rather than being fixed-size, so varying allocation sizes stop producing unusable rubble. Usually the whole fix."
        },
        {
          "q": "When should you call empty_cache?",
          "a": "Almost never - only to release memory to another process. It does not defragment, it synchronizes, and the allocator immediately re-reserves."
        },
        {
          "q": "What is the classic training-loop memory leak?",
          "a": "Appending loss rather than loss.item() to a list. The tensor carries its autograd graph, so you retain the whole graph for every step."
        },
        {
          "q": "How do you distinguish a leak from fragmentation?",
          "a": "Log both numbers. Rising allocated memory is a leak; flat allocated with rising reserved is fragmentation. They look identical on a single chart."
        },
        {
          "q": "Why can an OOM traceback point at the wrong line?",
          "a": "CUDA execution is asynchronous, so Python runs ahead of the device and the failing allocation is often not the one reported. Use CUDA_LAUNCH_BLOCKING=1."
        },
        {
          "q": "What does zero_grad(set_to_none=True) do?",
          "a": "Frees the gradient tensors instead of zeroing them in place, so the memory is released between steps. It is the default now and worth a real amount at scale."
        }
      ],
      "standard": [
        {
          "q": "You get a CUDA out-of-memory error. Walk through your diagnosis.",
          "a": "FIRST, ESTABLISH WHICH OF THREE PROBLEMS IT IS, because they have unrelated fixes: the model is genuinely too large, the activations are too large, or the memory is merely fragmented. STEP 1: READ THE RIGHT NUMBERS. Not nvidia-smi - that shows what the caching allocator RESERVED plus several hundred megabytes of CUDA context plus other processes. Log torch.cuda.max_memory_allocated, which is the peak of live tensors and the number that decides whether the job fits, alongside max_memory_reserved. STEP 2: COMPUTE THE BUDGET ARITHMETICALLY before measuring anything else. Weights are P times bytes per parameter. Gradients and optimizer state are about 14 more bytes per TRAINABLE parameter under mixed-precision Adam. Activations scale with batch times sequence times depth. Whichever term dominates determines the fix, and this calculation takes two minutes. STEP 3: LOOK AT THE SHAPE OF THE FAILURE. Does it fail on the first step? Then it is a static capacity problem - the model plus one batch does not fit, and the arithmetic will already have told you which term. Does it fail after many steps? Then something is growing, and I go to step 4. Does the error report a large amount of free memory? Then it is fragmentation. STEP 4: LEAK OR FRAGMENTATION, which is the distinction people conflate. Log allocated and reserved every step. If ALLOCATED is rising, something is being retained - a tensor with a graph appended to a list, a hook holding outputs, retain_graph, a growing cache. If allocated is FLAT and RESERVED is rising, the allocator is accumulating unusable blocks, which is fragmentation. These look identical on a single memory chart and have opposite fixes. STEP 5: USE THE SNAPSHOT RECORDER rather than bisecting. torch.cuda.memory._record_memory_history, run some steps, dump, and open the result in the viewer. It shows every allocation with the Python stack that made it and a timeline, so 'what is holding this memory' and 'where does the peak come from' are read off a chart instead of guessed. This tool is dramatically under-used and it replaces most of the traditional workflow. THE FIXES, matched to the cause. Activations dominate: gradient checkpointing, smaller micro-batch with accumulation, shorter sequences. Parameters dominate: mixed precision, LoRA, quantization, sharding with FSDP. Fragmentation: expandable_segments in PYTORCH_CUDA_ALLOC_CONF, and bucketing variable lengths so the allocation pattern repeats. Leak: find and fix the retention. WHAT I WOULD NOT DO. Sprinkle empty_cache, which does not defragment, synchronizes, and is immediately undone. Or trust the traceback line - CUDA is asynchronous, so the failing allocation is frequently not where the error surfaces, and CUDA_LAUNCH_BLOCKING=1 is what makes the location truthful.",
          "deepDive": {
            "q": "Explain the caching allocator's design and why expandable_segments helps.",
            "a": "THE PROBLEM IT SOLVES. cudaMalloc and cudaFree are expensive and, importantly, SYNCHRONIZING - they force the device to finish outstanding work. A training step allocates and frees hundreds of tensors, so calling the driver for each would serialize the whole pipeline and destroy throughput. THE DESIGN. PyTorch requests large SEGMENTS from the driver and sub-allocates your tensors within them. Freed tensors return their block to a free list rather than to the driver. Blocks are organized by size class - small allocations from one pool, large from another - and adjacent free blocks are coalesced. The allocator is also STREAM-AWARE: a block freed on one stream is not reused on another until it is safe, since the device may not have finished with it. WHY FRAGMENTATION HAPPENS ANYWAY. Segments are a fixed size once created. Within one, allocation and freeing of DIFFERENT sizes leaves gaps. If you request 2 GiB and the largest contiguous free block is 1.5 GiB, the request fails even though the total free space is much larger - the allocator cannot move existing blocks, because tensors have addresses that user code holds. This is why the error reports both numbers and why both are true. The classic generator is a variable dimension - sequence length - so each step's activations are a slightly different size and freed blocks never quite fit the next request. WHAT expandable_segments CHANGES. Instead of allocating fixed-size physical segments, the allocator reserves a large VIRTUAL address range and maps physical pages into it on demand, using the driver's virtual memory management API. Now a segment can GROW: when more space is needed at the end of a segment, more physical memory is mapped there rather than a new fixed segment being created elsewhere. The practical effect is that varying allocation sizes stop producing unusable rubble, because there is effectively one growable region rather than many fixed ones with gaps between them. In my experience this is the single most effective fix for fragmentation-shaped OOMs and it is a one-line environment variable. THE OTHER TUNABLES worth knowing. max_split_size_mb prevents the allocator from splitting large blocks below a threshold, which reduces fragmentation from large allocations at the cost of some waste. roundup_power2_divisions makes allocation sizes round to fewer distinct values, which increases reuse - the same idea as bucketing your sequence lengths, applied by the allocator. And garbage_collection_threshold makes the allocator release cached blocks when reserved memory exceeds a fraction, which is a gentler version of empty_cache. WHY empty_cache IS NOT THE FIX. It returns cached free blocks to the driver. It does not move anything, so it cannot merge fragments that are separated by live tensors. It synchronizes. And the allocator immediately re-reserves as training continues, so you have paid a stall for nothing. Its legitimate use is releasing memory so ANOTHER process can have it, which is a real need on shared machines and is not what people usually call it for. THE MENTAL MODEL I WOULD OFFER. The caching allocator is a memory manager with its own policy, sitting between your tensors and the driver. Most confusing memory behaviour in PyTorch is that policy being visible - and once you know it exists, the reserved-versus-allocated distinction, the free-memory-in-an-OOM message, and the ineffectiveness of empty_cache all follow from it."
          }
        },
        {
          "q": "How would you fit a model that does not currently fit in memory?",
          "a": "COMPUTE THE BUDGET FIRST, because the techniques target disjoint terms and applying the wrong one gives no benefit. Weights: P times bytes. Gradients plus optimizer state: about 14 more bytes per trainable parameter under mixed-precision Adam, so 16 total including the weights. Activations: proportional to batch times sequence times depth. Workspace for cuDNN and communication buffers. Then attack the largest term. IF ACTIVATIONS DOMINATE - typical for a modest model with a large batch or long sequences. (1) GRADIENT CHECKPOINTING: store activations only at segment boundaries and recompute within a segment during backward. Roughly one extra forward pass, so 30 to 40% more compute, for O(sqrt(L)) activation memory. The detail that matters: it must be SEGMENTED - checkpointing every layer individually stores a boundary per layer and saves almost nothing. (2) MICRO-BATCHING with gradient accumulation: same effective batch, a fraction of the peak, at the cost of more steps and slightly worse hardware utilization. (3) SHORTER SEQUENCES if the task permits, since two terms scale with length. (4) Memory-efficient attention, which avoids materializing the attention matrix at all - the largest single activation in a transformer. IF PARAMETERS DOMINATE - typical for a large model with a small batch. (1) MIXED PRECISION, which halves several terms and is nearly free on modern hardware; prefer bf16, which needs no loss scaling. (2) FREEZE MOST PARAMETERS and train an adapter, which removes the 14 bytes per parameter of gradient and optimizer state for everything frozen - the largest single lever available. (3) QUANTIZE the frozen base to 4 bits, which is what makes very large models trainable on one card. (4) 8-BIT OPTIMIZERS, which quantize the Adam moments and typically cost very little quality. (5) SHARD across devices with FSDP or ZeRO, dividing everything at the cost of parameter all-gathers. IF IT IS FRAGMENTATION rather than capacity - and check this before doing any of the above, because it is the cheapest fix. expandable_segments in PYTORCH_CUDA_ALLOC_CONF, plus bucketing variable-length inputs so the allocation pattern repeats. THE ORDER I WOULD ACTUALLY APPLY THEM. Cheapest and least invasive first: mixed precision, set_to_none on zero_grad, expandable_segments. Then micro-batching, which costs only time. Then checkpointing, which costs compute you can measure. Then the parameter-side changes, which alter what the model can learn and therefore need validating. Sharding last, because it is an infrastructure change. WHAT I WOULD MEASURE THROUGHOUT. max_memory_allocated before and after each change, so I know what each one bought - and the throughput, because several of these trade compute for memory and it is easy to end up fitting comfortably while training half as fast as necessary. THE JUDGEMENT CALL worth stating: fitting is not the goal, finishing is. A configuration that fits with 2 GiB to spare and runs at 60% of the throughput of one that fits with 200 MiB to spare is usually the worse choice, and people optimize for headroom out of anxiety rather than measurement."
        },
        {
          "q": "Explain asynchronous CUDA execution and its consequences for debugging and benchmarking.",
          "a": "THE MECHANISM. CUDA kernel launches are ASYNCHRONOUS. When your Python code calls a tensor operation, the driver enqueues the kernel on a stream and returns immediately - the GPU may not have started, let alone finished. Your Python continues, enqueuing more work. Operations on the same stream execute in order, so correctness is preserved, but there is no synchronization with the host unless something forces it. WHAT FORCES SYNCHRONIZATION. Copying data to the CPU - .item(), .cpu(), .numpy(), printing a tensor's values. An explicit torch.cuda.synchronize(). Any allocation that requires the allocator to wait. And, importantly, an error, which surfaces whenever the host next checks. CONSEQUENCE 1: TRACEBACKS LIE. An error raised by a kernel is detected when the host next synchronizes, which can be many operations later. So the traceback points at whatever your Python was doing at that moment, not at the operation that failed. This is why illegal-memory-access errors are so frustrating to debug and why CUDA_LAUNCH_BLOCKING=1 exists: it forces synchronization after every launch, making the traceback truthful at a substantial cost in speed. It is the first thing to reach for on a confusing CUDA error. The same applies to out-of-memory errors, whose reported line is often not where the memory went. CONSEQUENCE 2: BENCHMARKING WITHOUT SYNCHRONIZE MEASURES NOTHING. Timing around a block of GPU operations measures how fast Python enqueued them, which is fast and unrelated to how long they take. The error always FLATTERS the GPU, so you conclude your model is fast and your data loader is slow. Every timing must be torch.cuda.synchronize, start timer, work, synchronize, stop timer - and with warm-up iterations first, because the first calls include kernel autotuning, allocator growth, and possibly compilation. torch.cuda.Event with elapsed_time is the more precise alternative since it timestamps on the device. CONSEQUENCE 3: OVERLAP IS AVAILABLE AND USUALLY UNUSED. Because the CPU runs ahead, host-side work naturally overlaps with device work - which is what makes the data-loading pipeline able to hide behind compute. And with pinned memory plus non_blocking=True, the host-to-device copy is a genuine asynchronous DMA that overlaps with computation. Without pinning, that call is silently synchronous. CONSEQUENCE 4: STREAMS let you express independent work explicitly. Operations on different streams may run concurrently, with events used to express dependencies. This is how you overlap communication with computation in distributed training, and it is where subtle bugs live - a tensor allocated on one stream and used on another needs record_stream, or the caching allocator may reuse its memory while the other stream is still reading it. THE PRACTICAL RULES I WOULD STATE. Synchronize before and after every timing. Use CUDA_LAUNCH_BLOCKING=1 the moment a CUDA error is confusing. Avoid .item() inside a training loop, because each one is a synchronization point that stalls the pipeline - accumulate on the device and transfer once per logging interval. And be aware that a profiler timeline is the correct way to see all of this, because it shows the device timeline alongside the host timeline and makes the gaps visible.",
          "deepDive": {
            "q": "You are logging loss.item() every step and throughput is poor. Explain what is happening and how you would fix it.",
            "a": "WHAT .item() DOES. It copies a single value from device to host, which requires the value to EXIST - so it blocks until every kernel enqueued before it has completed. It is a full synchronization point. WHY THAT COSTS MORE THAN IT SOUNDS. The performance model of eager PyTorch depends on the CPU RUNNING AHEAD of the GPU. Python enqueues kernels for step n+1 while the device is still executing step n, and the launch overhead - which is real, tens of microseconds per kernel, and a transformer step launches thousands - is hidden behind device work. A synchronization point DRAINS that pipeline: the CPU stops, waits for the device to finish everything, and then has to refill the queue from empty. So you pay not only the wait but the launch latency that was previously hidden. On a model with many small kernels this can be a large fraction of step time. THE SYMPTOM in a profile is characteristic: a gap on the device timeline immediately after the synchronization, while the host re-enqueues. If you see a regular sawtooth of GPU idle time at a fixed cadence, look for a per-step .item(), .cpu(), a print, or an if on a tensor value. THE OTHER HIDDEN SYNCHRONIZERS people miss. Any Python control flow on a tensor value - if loss > threshold, or a NaN check like if torch.isnan(loss).any() - forces the value to the host. So a well-intentioned per-step NaN guard is a per-step synchronization. Same for .cpu(), .numpy(), .tolist(), and printing a tensor. And some indexing patterns with tensor indices synchronize to validate bounds. THE FIXES, in order. (1) LOG LESS OFTEN. Every 50 or 100 steps rather than every step. The simplest fix and usually sufficient - you do not need per-step loss values. (2) ACCUMULATE ON THE DEVICE. Keep a running sum as a device tensor, adding loss.detach() each step, and call .item() once per logging interval. Now you get every step's contribution with one synchronization per interval. (3) USE ASYNCHRONOUS COPIES for values you must have: copy to a pinned host buffer with non_blocking=True and read it a few steps later, accepting the lag. This is what well-optimized training loops do for metrics. (4) FOR NaN GUARDS specifically: check every N steps rather than every step, or accumulate an is-finite flag on the device and check it at the interval boundary. The guard is protecting against a rare event, so checking it rarely is proportionate. HOW I WOULD CONFIRM THE DIAGNOSIS BEFORE FIXING. Comment out the logging and measure throughput. If it jumps, that was it. Or profile and look for the gap. That takes two minutes and prevents optimizing the wrong thing - which matters because 'poor throughput' has several other candidate causes, and this one is invisible unless you know to look for it."
          }
        },
        {
          "q": "What memory concerns are specific to inference and serving rather than training?",
          "a": "THE BUDGET LOOKS COMPLETELY DIFFERENT. Training's dominant terms - gradients, optimizer state, and stored activations for backward - are all ABSENT at inference. What remains is weights, the activations of a single forward pass which are freed as you go, and, for autoregressive generation, the KV CACHE. For a large language model serving many concurrent requests, the KV cache is usually the dominant term and the one that determines how many requests fit. THE KV CACHE, since it is the whole story for LLM serving. Its size is roughly 2 (keys and values) times layers times KV heads times head dimension times sequence length times batch times bytes. It grows with every generated token, so a request's memory footprint INCREASES over its lifetime - which is unlike almost anything in training and is why capacity planning is harder. Note what is absent from that formula: the number of QUERY heads. That is exactly why grouped-query attention exists - reducing KV heads while keeping query heads shrinks the cache by the ratio, with little quality cost. FRAGMENTATION IS WORSE HERE, and it is this lesson's phenomenon in its most consequential form. Requests arrive and finish at different times with different lengths, so the allocation pattern is maximally irregular. Naive per-request contiguous KV allocation wastes a large share of memory to internal fragmentation - you must reserve for the maximum possible length, and most requests do not reach it. PAGED ATTENTION is the answer: allocate the cache in fixed-size blocks, like operating-system paging, with a block table mapping logical positions to physical blocks. It eliminates the internal fragmentation and enables sharing blocks between requests with a common prefix, which is a large additional win for a shared system prompt. THE OTHER DIFFERENCES. (1) MEMORY DETERMINES THROUGHPUT DIRECTLY, because it sets how many requests can be batched, and batching is what makes the arithmetic efficient. So a memory saving converts directly into throughput in a way it does not in training. (2) NO no_grad BY DEFAULT - forgetting inference_mode or no_grad at serving means building an autograd graph for every request, which multiplies memory for nothing. This is a genuinely common production bug. (3) VARIABLE, ADVERSARIAL WORKLOAD: you cannot choose your batch composition, so a memory configuration that works on average can fail on a burst of long requests. Admission control and preemption become necessary. (4) WEIGHTS ARE SHARED across requests, so quantizing them helps every request at once and is unusually high-leverage. WHAT I WOULD MEASURE. Peak memory as a function of concurrent requests and sequence length - a two-dimensional capacity surface rather than a single number - and the fraction of KV memory that is actually occupied versus reserved, which is the fragmentation metric that matters here. THE CONNECTION I WOULD DRAW. Paged attention is this lesson's caching-allocator problem rediscovered one level up: variable-sized allocations with unpredictable lifetimes fragment, and the fix is the same one operating systems reached decades ago - fixed-size pages with an indirection table. That is a satisfying convergence and a good reason to understand the allocator's design rather than just its symptoms."
        },
        {
          "q": "How do you find what is holding memory in a long-running job?",
          "a": "USE THE SNAPSHOT RECORDER FIRST, because it answers the question directly and the alternatives are all indirect. torch.cuda.memory._record_memory_history(max_entries=...) turns on tracking, you run some steps, _dump_snapshot writes a pickle, and the browser viewer shows a TIMELINE of every allocation with the PYTHON STACK that created it and the point at which it was freed. So 'what is holding this memory' is read off a chart rather than inferred. It is the single most effective tool here and it is badly under-used - most people are still bisecting by commenting out code. Enable it for a bounded window rather than the whole job, since it has overhead and the entry buffer is finite. WHAT TO LOOK FOR IN THE SNAPSHOT. Allocations whose lifetime spans many steps when they should be per-step. A staircase pattern where each step's peak is slightly higher than the last. And the stack traces of the largest surviving blocks, which usually name the retention directly. THE INSTRUMENTATION I WOULD ADD ANYWAY, since it costs nothing and catches most cases without a snapshot. Log allocated and reserved every N steps. Rising ALLOCATED means retention; flat allocated with rising RESERVED means fragmentation. That single distinction eliminates half the search space and it is one line. THE USUAL CULPRITS, in order of frequency. (1) Accumulating tensors that carry a graph - appending loss rather than loss.item(), or storing model outputs without detaching. This is the classic and it accounts for most cases. (2) Retained hooks closing over activations, which keep those tensors and their graphs alive. Removing the handle is the fix. (3) A growing cache - a memoized function, an lru_cache with no bound, a dictionary of per-batch state keyed by something unbounded. (4) retain_graph=True, which is nearly always a symptom of reusing a graph you meant to rebuild. (5) Holding a reference to the last batch or the last output across iterations, which pins one step's worth of everything. (6) Exception objects capturing tracebacks that reference tensors - in a long-running server this can pin memory in a way that is genuinely hard to see. A CHEAP MANUAL SWEEP when the snapshot is unavailable: walk gc.get_objects, filter to torch.Tensor, and aggregate by size and by whether requires_grad is set. That gives you a histogram of what exists, and an unexpectedly large count of tensors of one shape usually names the leak. It is crude and it works. WHAT I WOULD BE CAREFUL ABOUT. Python's garbage collector handles reference CYCLES lazily, so a cycle involving tensors can hold GPU memory until a collection runs. gc.collect() followed by empty_cache tells you whether that is the situation - if memory drops substantially, you have cycles, and the fix is to break them rather than to collect periodically. THE PREVENTIVE HABIT. In any long-running job, log peak memory per step and alert on a trend. A leak found on day one is a five-minute fix; the same leak found when a week-long run dies at hour 140 has cost the run."
        },
        {
          "q": "Someone suggests calling empty_cache periodically to avoid OOM. Evaluate that.",
          "a": "I would push back, and explain what it actually does, because this is a very common piece of folk advice that usually makes things worse. WHAT empty_cache DOES. It returns FREE cached blocks from PyTorch's allocator to the CUDA driver. That is all. It does not touch memory occupied by live tensors, and it cannot MOVE anything - tensors have addresses that user code holds, so the allocator cannot compact. WHY IT DOES NOT FIX FRAGMENTATION. Fragmentation is free space broken into pieces too small to satisfy a request, with LIVE tensors between them. Returning the free pieces to the driver does not merge them, because the live tensors are still in the way. When the next allocation comes, PyTorch requests fresh segments from the driver and you are back where you started - having paid for the round trip. WHY IT COSTS. It SYNCHRONIZES the device, draining the pipeline that lets the CPU run ahead. Calling it every step introduces a stall every step. And the subsequent cudaMalloc calls to re-acquire memory are themselves slow and synchronizing. So the periodic-empty_cache pattern converts a memory problem into a throughput problem while usually not solving the memory problem. WHEN IT IS LEGITIMATELY THE RIGHT CALL - and there are real cases, so I would not say never. (1) RELEASING MEMORY TO ANOTHER PROCESS. On a shared machine, or when you finish training and want to run evaluation in a separate process, or when handing the GPU to another tenant. The allocator's default is to keep everything it has ever reserved, so an explicit release is the only way. (2) BETWEEN DISTINCT PHASES with very different memory profiles - after training and before a large-batch evaluation - where a one-time release lets the allocator re-form segments suited to the new pattern. Once, not periodically. (3) BEFORE MEASURING, if you want a clean reading of what a phase actually needs. WHAT I WOULD SUGGEST INSTEAD, matched to the actual cause. If the shape is fragmentation - flat allocated, rising reserved, an OOM reporting free memory - use PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True, which lets segments grow via virtual memory and genuinely addresses the cause, and bucket variable-length inputs so the allocation pattern repeats. If the shape is a leak - rising ALLOCATED - find the retention, because empty_cache will not touch it and the periodic call will mask the trend that would have diagnosed it. If it is genuine capacity, apply the technique that targets the dominant budget term. THE MIDDLE OPTION worth mentioning: garbage_collection_threshold in the allocator config makes PyTorch release cached blocks automatically when reserved memory exceeds a fraction of capacity. That is the principled version of what the periodic-empty_cache suggestion is reaching for, and it is adaptive rather than unconditional. THE MORE GENERAL POINT. empty_cache is the standard example of a fix that addresses a SYMPTOM of the caching allocator's visibility rather than any cause. Its popularity comes from occasionally appearing to work - because the timing of a stall can change when an OOM happens to occur - which is exactly the kind of evidence that keeps folk remedies alive."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why PyTorch caches GPU memory",
        "back": "cudaMalloc/cudaFree are SYNCHRONIZING and slow, and a step allocates hundreds of tensors. PyTorch requests large SEGMENTS and sub-allocates, keeping freed blocks. Consequence: nvidia-smi shows RESERVED + ~300-600MB context + other processes, NOT your tensors."
      },
      {
        "type": "definition",
        "front": "The four memory numbers",
        "back": "allocated (live NOW), MAX_allocated (peak - decides whether it fits), reserved (held from the driver), max_reserved. FRAGMENTATION ~ max_reserved - max_allocated. Conflating them is what makes memory debugging feel arbitrary."
      },
      {
        "type": "intuition",
        "front": "'Tried to allocate 2 GiB... 5 GiB free' - both true",
        "back": "A request needs ONE contiguous free BLOCK, not enough total. The allocator cannot compact, because live tensors have addresses user code holds. Classic generator: VARIABLE SEQUENCE LENGTHS make every step's allocation a different size."
      },
      {
        "type": "definition",
        "front": "expandable_segments",
        "back": "PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True. Reserves a large VIRTUAL range and maps physical pages on demand, so a segment can GROW instead of being fixed-size. Usually the whole fix for fragmentation-shaped OOMs, and it is one environment variable."
      },
      {
        "type": "pitfall",
        "front": "empty_cache does NOT defragment",
        "back": "It returns FREE cached blocks to the driver. It cannot merge fragments separated by LIVE tensors, it SYNCHRONIZES, and the allocator immediately re-reserves. Legitimate only for releasing memory to ANOTHER process, or once between phases."
      },
      {
        "type": "intuition",
        "front": "Leak vs fragmentation - the one-line diagnostic",
        "back": "Log BOTH every step. ALLOCATED rising = retention leak. Allocated FLAT with RESERVED rising = fragmentation. They look identical on a single memory chart and have opposite fixes."
      },
      {
        "type": "pitfall",
        "front": "The classic training-loop leak",
        "back": "losses.append(loss) retains the ENTIRE autograd graph, every step. Use loss.item(). Same for storing model outputs without .detach(), retained hooks closing over activations, and retain_graph=True (nearly always a symptom of reusing a graph you meant to rebuild)."
      },
      {
        "type": "formula",
        "front": "The memory budget decomposition",
        "back": "2P weights + 2P_t grads + 12P_t (fp32 master + Adam m,v) + activations (~B*L*d*depth) + workspace. Which term DOMINATES decides the fix - checkpointing does nothing if parameters dominate, quantizing weights does nothing if activations do."
      },
      {
        "type": "pitfall",
        "front": "OOM tracebacks point at the wrong line",
        "back": "CUDA is ASYNCHRONOUS - Python runs ahead, so the failing allocation is often not the one reported. CUDA_LAUNCH_BLOCKING=1 forces synchronization after every launch and makes the traceback truthful, at a large speed cost."
      },
      {
        "type": "intuition",
        "front": "loss.item() every step drains the pipeline",
        "back": "It is a full SYNCHRONIZATION: the CPU stops, waits for all queued kernels, then refills the queue from empty - so you also lose the launch latency that was previously hidden. Signature: a regular sawtooth of GPU idle. Accumulate on device, .item() once per interval."
      },
      {
        "type": "definition",
        "front": "The memory snapshot recorder",
        "back": "_record_memory_history -> run -> _dump_snapshot -> open at pytorch.org/memory_viz. A TIMELINE of every allocation with the PYTHON STACK that made it. Answers 'what is holding this' directly instead of by bisection. Badly under-used."
      },
      {
        "type": "intuition",
        "front": "Paged attention is this lesson one level up",
        "back": "Serving memory is dominated by the KV CACHE, which GROWS per request over its lifetime. Variable-size allocations with unpredictable lifetimes fragment badly - so the fix is fixed-size BLOCKS plus an indirection table, exactly what operating systems did with paging."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: CUDA semantics - asynchronous execution, streams, memory management",
        "url": "https://pytorch.org/docs/stable/notes/cuda.html"
      },
      {
        "title": "PyTorch: Understanding CUDA Memory Usage (snapshot recorder and visualizer)",
        "url": "https://pytorch.org/docs/stable/torch_cuda_memory.html"
      },
      {
        "title": "Chen et al. (2016), Training Deep Nets with Sublinear Memory Cost",
        "url": "https://arxiv.org/abs/1604.06174"
      },
      {
        "title": "Kwon et al. (2023), Efficient Memory Management for LLM Serving with PagedAttention",
        "url": "https://arxiv.org/abs/2309.06180"
      },
      {
        "title": "Dettmers et al. (2022), 8-bit Optimizers via Block-wise Quantization",
        "url": "https://arxiv.org/abs/2110.02861"
      }
    ],
    "demos": [
      "mixed-precision",
      "paged-attention",
      "kv-cache",
      "quantization"
    ]
  }
};
