// GENERATED from content/lessons/pytorch-internals/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "pytorch-internals". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "data-pipelines": {
    "level": "core",
    "body": {
      "intuition": [
        "DataLoader is one line in every training script and it is hiding four things: a sampler deciding the order, a set of worker PROCESSES doing the loading, a collate function assembling batches, and a pinned-memory transfer to the device. Each of those is a mechanism with its own failure mode, and none of them fails loudly. A misconfigured sampler produces a valid-looking batch in the wrong order. A worker misconfiguration produces duplicated data. A memory bug produces steadily growing RSS until the job dies hours in. The training loss curve looks plausible through all of it.",
        "The single most important structural fact is that num_workers spawns PROCESSES, not threads, and it does so because Python's global interpreter lock makes threads useless for CPU-bound work like image decoding and augmentation. Processes give you real parallelism and they charge for it: the dataset object is pickled and copied to every worker, so memory multiplies; the module is re-imported in each worker under spawn, so top-level code runs again and unguarded training code recurses; and workers are started fresh each epoch unless you ask otherwise. Almost every mysterious DataLoader problem traces back to that one design decision.",
        "The reason to care is the number that matters most and is measured least: GPU utilization. A pipeline that cannot keep up leaves the accelerator idle, and the symptom - training is slow - names nothing. You can spend a week optimizing a model that was never the bottleneck. The purpose of the whole apparatus is OVERLAP, loading batch n+1 while computing batch n, and the achievable speedup follows a simple pipelining model with a sharp peak: it is largest when load time and compute time are balanced and worth almost nothing when either dominates. So the first diagnostic in any slow-training investigation is to check whether the GPU is busy, and the second is to time the loader with the model removed."
      ],
      "math": [
        {
          "h": "The pipelining model, and why the speedup peaks",
          "paras": [
            "Without overlap, each step costs loading plus compute. With enough workers to hide loading entirely, each step costs the LARGER of the two, plus one load to fill the pipeline.",
            "The speedup is therefore bounded by the ratio of the sum to the max, which is at most 2 and is achieved only at balance - an inverted-V in the load-to-compute ratio."
          ],
          "tex": "T_{\\text{seq}} = N\\,(t_{\\ell} + t_{c}), \\qquad T_{\\text{pipe}} \\approx N\\,\\max(t_{\\ell}, t_{c}) + t_{\\ell} \\\\[4pt] \\text{speedup} \\;\\to\\; \\frac{t_{\\ell} + t_{c}}{\\max(t_{\\ell}, t_{c})} \\;\\le\\; 2",
          "texNote": "Read the bound carefully, because it sets expectations. Overlapping loading with compute can never do better than double your throughput, and it approaches 2 only when the two are balanced. If loading takes ten times compute, workers help enormously in absolute terms but you are still load-bound - the fix is a faster loader, not more overlap. If compute dominates, adding workers buys nothing and costs memory."
        },
        {
          "h": "What num_workers actually costs",
          "paras": [
            "Each worker is a separate process holding its own copy of the dataset object and its own batch buffers. The memory is not shared, and prefetch_factor multiplies the buffered batches.",
            "This is why num_workers is not a free knob: raising it trades host memory and startup time for pipeline depth."
          ],
          "tex": "M_{\\text{host}} \\approx M_{\\text{main}} + W\\big(M_{\\text{dataset copy}} + p \\cdot B \\cdot M_{\\text{sample}}\\big)",
          "texNote": "W is the worker count and p is prefetch_factor, defaulting to 2 batches queued per worker. Note the dataset-copy term: if your Dataset holds a large in-memory structure, W workers means W copies. Under fork on Linux the copy is lazy - but Python REFERENCE COUNTING touches the object header on every access, which dirties the page and forces a real copy, so a dataset holding a large Python list of objects grows memory steadily as workers touch it. Storing the same data as a numpy array or an arrow table avoids it, because the payload has no per-element refcounts."
        },
        {
          "h": "Sharding an IterableDataset across workers",
          "paras": [
            "A map-style dataset is sharded automatically - the sampler hands each worker a disjoint set of indices. An iterable dataset has no indices, so EVERY worker runs the same __iter__ and yields the same data unless you shard it yourself.",
            "The standard fix is strided assignment based on the worker's id, which is disjoint and covers the stream exactly once."
          ],
          "tex": "\\text{worker } w \\text{ of } W \\;\\Rightarrow\\; \\text{yield items } i \\;\\text{ where } i \\equiv w \\pmod{W}",
          "texNote": "Forget this and you silently train on W duplicates of every sample, with the epoch W times longer than it should be and effective dataset diversity divided by W. Nothing errors, the loss falls, and the model overfits harder than it should. This is the canonical example of the module's theme: the abstraction hid the parallelism, and the failure has no symptom that names it."
        }
      ],
      "code": [
        {
          "h": "The two dataset styles, sharding, and a real collate function",
          "paras": [
            "Map-style when you can index randomly, iterable when the data is a stream. The sharding line in the iterable version is the one people omit."
          ],
          "code": "class MapStyle(Dataset):\n    def __len__(self):  return len(self.items)      # sampler needs this\n    def __getitem__(self, i): return transform(self.items[i])\n    # Sharding is AUTOMATIC: the sampler gives each worker disjoint indices.\n\nclass Streaming(IterableDataset):\n    def __iter__(self):\n        info = torch.utils.data.get_worker_info()\n        w, W = (info.id, info.num_workers) if info else (0, 1)\n        for i, item in enumerate(open_stream()):\n            if i % W == w:                          # <-- SHARD IT YOURSELF.\n                yield transform(item)               # Omit this line and every\n                                                    # worker yields the SAME data:\n                                                    # W duplicates of everything,\n                                                    # silently. Nothing errors.\n\ndef pad_collate(batch):\n    \"\"\"Variable-length sequences -> padded tensor + lengths + mask.\"\"\"\n    seqs, labels = zip(*batch)\n    lens = torch.tensor([len(s) for s in seqs])\n    out = torch.zeros(len(seqs), lens.max(), dtype=torch.long)\n    for i, s in enumerate(seqs):\n        out[i, :len(s)] = torch.as_tensor(s)\n    mask = torch.arange(lens.max())[None, :] < lens[:, None]\n    return out, lens, mask, torch.stack(labels)\n\nloader = DataLoader(ds, batch_size=32, num_workers=8,\n                    collate_fn=pad_collate,\n                    pin_memory=True,          # page-locked host buffer, so...\n                    persistent_workers=True,  # ...don't respawn every epoch\n                    prefetch_factor=2)\nfor x, *_ in loader:\n    x = x.to(\"cuda\", non_blocking=True)       # ...this can be a true ASYNC DMA.\n    # non_blocking WITHOUT pin_memory is a silent no-op - the copy is synchronous\n    # and you get none of the overlap you think you configured.",
          "caption": "Two lines carry most of the risk: the modulo shard in the iterable dataset, whose absence silently duplicates data W times, and pin_memory paired with non_blocking - use non_blocking alone and the async transfer you configured is a synchronous copy."
        },
        {
          "h": "Find the bottleneck before optimizing anything",
          "paras": [
            "The most valuable twenty lines in this lesson. Slow training names no cause, and these three measurements distinguish the three possibilities in about a minute."
          ],
          "code": "# 1. IS THE GPU EVEN BUSY? If utilization is low, the model is not the problem.\n#    watch -n0.5 nvidia-smi   ->  sustained <60% means you are input-bound.\n\n# 2. TIME THE LOADER ALONE, with the model removed entirely:\nt0 = time.perf_counter()\nfor i, _ in enumerate(loader):\n    if i == 200: break\nprint(\"loader-only:\", (time.perf_counter() - t0) / 200, \"s/batch\")\n\n# 3. TIME THE STEP ALONE, on one batch reused forever:\nx, y = next(iter(loader))\ntorch.cuda.synchronize(); t0 = time.perf_counter()   # <-- SYNCHRONIZE, or you\nfor _ in range(200):                                  #     are timing the launch\n    loss = model(x).mean(); loss.backward(); opt.step(); opt.zero_grad()\ntorch.cuda.synchronize()                              #     queue, not the work\nprint(\"compute-only:\", (time.perf_counter() - t0) / 200, \"s/batch\")\n\n# READ THE TWO NUMBERS:\n#   loader >> compute  -> input-bound. More workers, cheaper transforms, a\n#                         better storage format. NOT a faster model.\n#   compute >> loader  -> adding workers buys nothing and costs memory.\n#   roughly equal      -> the overlap sweet spot; speedup approaches 2x.\n#\n# THE SWEEP that finds num_workers - and note it is an INVERTED V, not\n# monotone: too few and you are load-bound, too many and you pay context\n# switching, memory, and startup for depth you cannot use.\nfor w in (0, 2, 4, 8, 16):\n    print(w, time_one_epoch(DataLoader(ds, num_workers=w)))",
          "caption": "Slow training names no cause. These two timings separate input-bound from compute-bound in a minute, and the torch.cuda.synchronize calls are essential - without them you are timing how fast Python can enqueue kernels, not how long they take."
        }
      ],
      "useCases": [
        "Any training run where the accelerator is under-utilized, which is far more common than people assume - the input pipeline is the most frequently overlooked bottleneck and the cheapest one to fix once identified.",
        "Streaming from remote or sharded storage, where an IterableDataset over object storage or WebDataset-style tar shards is the standard pattern and correct worker sharding is the thing that makes it correct.",
        "Class-imbalanced training via WeightedRandomSampler, which rebalances by sampling probability rather than by duplicating data - and composes with the loss-weighting alternative rather than replacing it.",
        "Variable-length sequence models, where a custom collate function producing padded tensors plus lengths and masks is the interface between ragged data and the fixed-shape tensors the model needs."
      ],
      "pitfalls": [
        "Forgetting to shard an IterableDataset by worker id. Every worker yields the same stream, so you train on W duplicates of everything with dataset diversity divided by W. Nothing errors and the loss still falls - the canonical silent pipeline failure.",
        "Using non_blocking=True without pin_memory=True. Asynchronous host-to-device transfer requires page-locked memory; without it the copy is synchronous and the overlap you configured does not exist.",
        "Holding a large Python list of objects in the Dataset. Under fork the pages are shared lazily, but reference counting touches each object's header on access, dirtying the page and forcing a real copy - so memory grows steadily until the job dies. Store the payload as a numpy array or arrow table, which has no per-element refcounts.",
        "Forgetting sampler.set_epoch(epoch) with DistributedSampler. The shuffle seed never changes, so every epoch presents the same order and the same shards to the same ranks. Training still works and converges worse, with no error.",
        "Putting training code at module top level with num_workers > 0. Under the spawn start method - the default on Windows and macOS - each worker re-imports the module and re-runs it, producing recursive process creation. Guard with if __name__ == '__main__'.",
        "Benchmarking without torch.cuda.synchronize. CUDA launches are asynchronous, so timing around them measures how fast Python enqueues kernels rather than how long they take, and the error always flatters the GPU.",
        "Raising num_workers monotonically expecting improvement. The curve is an inverted V: past the point where loading is hidden you pay memory, startup and context-switching for depth you cannot use, and on a machine with few cores you can make throughput worse."
      ],
      "connections": [
        {
          "ref": "training-systems/data-loading-scale",
          "text": "The same problems at cluster scale, where storage format, sharding across nodes, and network throughput dominate and the per-process concerns here become per-node ones."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Pinned memory is the connective tissue: page-locked host buffers are what make asynchronous transfers possible, and they are a limited resource whose over-allocation degrades the whole machine."
        },
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "The 'is the GPU busy' question is answered properly there with the profiler's timeline, which shows the gaps between kernels directly rather than inferring input-bound behaviour from an aggregate."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "WeightedRandomSampler is the sampling-side answer to class imbalance; loss weighting is the objective-side answer. They are not equivalent - resampling changes the effective dataset and the variance of the gradient estimate, weighting does not."
        },
        {
          "ref": "training-systems/ddp",
          "text": "DistributedSampler's set_epoch requirement lives at the intersection: it is a data-pipeline call whose omission is a distributed-training bug, and it fails silently in both directions."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does DataLoader actually do?",
          "a": "It combines a sampler that decides order, worker processes that load and transform, a collate function that assembles batches, and an optional pinned-memory transfer to the device."
        },
        {
          "q": "Why are DataLoader workers processes rather than threads?",
          "a": "The GIL makes threads useless for CPU-bound work like image decoding and augmentation. Processes give real parallelism, at the cost of memory copies and startup time."
        },
        {
          "q": "What is the difference between map-style and iterable datasets?",
          "a": "Map-style implements __len__ and __getitem__ so the sampler can index randomly. Iterable implements __iter__ for streams where random access is impossible."
        },
        {
          "q": "How do you shard an IterableDataset across workers?",
          "a": "Read torch.utils.data.get_worker_info() and yield only items where index modulo num_workers equals the worker id. Without it every worker yields the same data."
        },
        {
          "q": "What happens if you forget to shard?",
          "a": "You train on W duplicates of every sample, with effective diversity divided by W and epochs W times longer. Nothing errors and the loss still falls."
        },
        {
          "q": "What is pin_memory for?",
          "a": "It allocates page-locked host memory, which is what allows an asynchronous DMA transfer to the device. Without it, non_blocking=True is a silent no-op."
        },
        {
          "q": "What does persistent_workers do?",
          "a": "It keeps worker processes alive between epochs instead of respawning them, which matters when startup cost is significant relative to epoch length."
        },
        {
          "q": "What is prefetch_factor?",
          "a": "The number of batches each worker keeps queued ahead, defaulting to 2. It multiplies the buffered memory by workers times batches."
        },
        {
          "q": "Why does a Dataset holding a Python list grow memory across workers?",
          "a": "Fork shares pages lazily, but reference counting writes to each object's header on access, dirtying the page and forcing a copy. Use numpy arrays or arrow, which have no per-element refcounts."
        },
        {
          "q": "What does DistributedSampler.set_epoch do?",
          "a": "It reseeds the shuffle per epoch. Forgetting it means every epoch presents the same order to the same ranks - a silent degradation with no error."
        },
        {
          "q": "What is the maximum speedup from overlapping loading and compute?",
          "a": "Two, and only at balance. The speedup is (t_load + t_compute) / max(t_load, t_compute), so it is small whenever either side dominates."
        },
        {
          "q": "Why must you call torch.cuda.synchronize when benchmarking?",
          "a": "CUDA launches are asynchronous, so without it you measure how fast Python enqueues kernels rather than how long they take - and the error always flatters the GPU."
        }
      ],
      "standard": [
        {
          "q": "Your training is slow. How do you determine whether the data pipeline is the bottleneck?",
          "a": "MEASURE BEFORE OPTIMIZING, because 'training is slow' names no cause and the three possible causes have completely different fixes. STEP 1: IS THE GPU BUSY? Watch utilization for a minute. Sustained low utilization means the accelerator is waiting, and the model is not the problem. This takes seconds and it redirects the entire investigation. STEP 2: TIME THE LOADER ALONE. Iterate the DataLoader with the model removed entirely and record seconds per batch. This is the pipeline's standalone throughput and it is the number people never have. STEP 3: TIME THE STEP ALONE. Take one batch, keep it on the device, and run forward-backward-step repeatedly - with torch.cuda.synchronize before and after, because CUDA launches are asynchronous and timing without it measures Python's enqueue rate rather than the work. READ THE TWO NUMBERS. If loader time greatly exceeds compute time, you are input-bound: more workers, cheaper transforms, a better storage format, or decoding on the GPU. A faster model would change nothing. If compute dominates, adding workers buys nothing and costs memory. If they are close, you are at the overlap sweet spot and further gains need both sides improved. IF INPUT-BOUND, WHERE THE TIME ACTUALLY GOES. (1) Decoding - JPEG decode is often the single largest cost in vision pipelines, and moving it to the GPU or pre-decoding to a raw format can be transformative. (2) Random reads from slow storage - many small files on a network filesystem is the worst case, and packing into sequential shards is the standard fix. (3) Augmentation in Python rather than in a vectorized library. (4) Collation copying more than necessary. I would profile inside __getitem__ rather than guess, because the distribution of cost is usually surprising. THE SWEEP FOR num_workers, and the property that matters: it is an INVERTED V, not monotone. Too few and you are load-bound; too many and you pay memory, process startup and context switching for pipeline depth you cannot use, which on a machine with few cores actively hurts. So sweep it rather than setting it high. THE THING I WOULD FLAG AS A PROCESS POINT. This measurement takes about ten minutes and I have seen weeks spent optimizing models that were never the bottleneck. The reason it gets skipped is that the abstraction hides the pipeline so completely that it does not occur to people that it might be the problem - which is this module's theme exactly.",
          "deepDive": {
            "q": "You have measured input-bound and raised num_workers, and now memory grows steadily until the job is killed. Diagnose it.",
            "a": "Steady growth rather than a fixed high level points at a leak or an aliasing effect rather than at simple over-allocation, and there is a specific, very common cause. THE MAIN CAUSE: COPY-ON-ACCESS FROM REFERENCE COUNTING. On Linux, DataLoader workers are created with fork by default, which shares the parent's memory pages copy-on-write. That sounds ideal - the dataset is not duplicated. But CPython stores a REFERENCE COUNT in every object's header, and merely reading a Python object increments and decrements it, which WRITES to that header, which dirties the page, which triggers a real copy. So if your Dataset holds a large Python list of objects - strings, dicts, PIL images, tuples - then as each worker walks through its share of the data it gradually copies the entire structure. Memory grows steadily across the epoch, and it grows roughly linearly in the number of workers. THE FIX, and it is a real fix rather than a mitigation: store the payload in a form with no per-element Python objects. A numpy array of fixed-width records, a single large numpy array of bytes with an offsets array, an arrow table, or a memory-mapped file. Then reading touches only the buffer, which has one refcount for the whole array, and the pages stay shared. Converting a list of strings to a concatenated byte array plus offsets is the canonical version of this fix and it is dramatic. THE OTHER CAUSES worth checking, in order. (1) prefetch_factor times num_workers times batch size of buffered data - this is a fixed high level rather than growth, but it can be surprisingly large with big batches, and it is the first thing to compute since it is arithmetic. (2) A GENUINE LEAK IN THE MAIN PROCESS: accumulating tensors that still carry graph references. Appending loss rather than loss.item() to a list keeps the entire computation graph alive for every step - the classic version of this bug, and it presents as steady growth exactly like the refcount issue. Check by logging len of any accumulator and whether its elements require grad. (3) CACHING INSIDE THE DATASET - a memoizing transform or an lru_cache that grows without bound, multiplied per worker. (4) Under spawn rather than fork the dataset is pickled to each worker, so memory is W copies immediately - a step change at startup rather than growth, which distinguishes it. HOW I WOULD LOCALIZE IT. Log resident memory of the main process and of a worker separately - if only workers grow, it is dataset-side; if only the main process grows, it is accumulation in the training loop. Then run with num_workers=0: if the growth disappears, it is worker-related and almost certainly the refcount issue. That two-step split takes minutes and separates the two large categories immediately. THE GENERAL LESSON, which is this module's spine: the DataLoader hid the fact that your dataset is being copied into other processes, and the failure surfaced hours later as an out-of-memory kill - a symptom that names nothing about its cause."
          }
        },
        {
          "q": "Explain how num_workers works and everything it costs.",
          "a": "THE MECHANISM. num_workers > 0 creates that many separate PROCESSES. Each receives a copy of the dataset object, runs its own __getitem__ calls, collates batches, and pushes them through a queue to the main process, which yields them to your loop. The main process does no loading at all. WHY PROCESSES AND NOT THREADS. The GIL means Python threads cannot execute bytecode concurrently, so for CPU-bound work - JPEG decoding, augmentation, tokenization - threads give you no parallelism at all. Processes have independent interpreters. Note the nuance: threads DO overlap operations that release the GIL, which includes file I/O and most numpy and torch calls, so a purely I/O-bound pipeline can be overlapped with threads. But the general case is CPU-bound, which is why the framework chose processes. THE COSTS, and each is a real operational concern. (1) MEMORY MULTIPLICATION. Each worker holds a dataset copy plus prefetch_factor batches. Under spawn, the dataset is pickled and genuinely duplicated at startup. Under fork it is shared lazily - but Python reference counting writes to object headers on read, dirtying pages and forcing copies, so a dataset holding large Python containers gets copied anyway, gradually. This is the single most common source of mysterious memory growth. (2) STARTUP COST. Workers are created at the start of every epoch unless persistent_workers=True. With short epochs, respawning can be a significant fraction of wall-clock. (3) SPAWN RE-IMPORTS YOUR MODULE. On Windows and macOS the default start method is spawn, which re-imports the main module in each worker - so any training code at module top level runs again, recursively creating processes. This is what the if __name__ == '__main__' guard is for, and its absence produces a confusing process explosion rather than a clean error. (4) DEBUGGING BECOMES HARDER. Exceptions inside workers are re-raised in the main process with a less useful traceback, breakpoints do not work as expected, and the standard advice - set num_workers=0 to debug - exists for good reason. (5) NON-DETERMINISM. Worker completion order affects nothing for map-style datasets since the sampler fixes order, but random state must be seeded per worker or every worker uses the same augmentation randomness, which silently reduces augmentation diversity. torch handles the base seed, but a dataset using Python's random or numpy's global state needs a worker_init_fn. HOW I WOULD CHOOSE THE VALUE. Sweep it, because the curve is an inverted V rather than monotone - past the point where loading is hidden, you pay memory and context-switching for depth you cannot use. Start from the number of physical cores available to the job, and be aware that in a container with a CPU quota, os.cpu_count() reports the host's cores rather than your quota, so the sensible default is often far too high. THE SUMMARY. num_workers is not a throughput dial, it is a decision to run your dataset code in other processes - and every surprising DataLoader behaviour follows from that."
        },
        {
          "q": "How would you design a data pipeline for a dataset too large to fit on local disk?",
          "a": "THE CONSTRAINT THAT DRIVES EVERYTHING: random access to remote storage is catastrophically slow. A random read from object storage has latency in the tens of milliseconds; a random read of a small file from a network filesystem is not much better. If your Dataset does one remote read per sample, you cannot feed a GPU regardless of how many workers you add. So the design must convert random access into SEQUENTIAL access. THE STANDARD SOLUTION: SHARDED SEQUENTIAL FORMATS. Pack the data into shards of a few hundred megabytes each - tar files in the WebDataset style, or a columnar format like parquet, or TFRecord-style containers. Each worker streams whole shards sequentially, which is what object storage is fast at. This is the single most important decision and it usually improves throughput by an order of magnitude over per-sample files. HOW SHUFFLING WORKS WHEN YOU CANNOT INDEX. Two levels, and you need both. (1) SHUFFLE THE SHARD LIST each epoch, which is cheap and gives coarse randomness. (2) A SHUFFLE BUFFER within the stream: maintain a buffer of N samples, yield a random element, refill from the stream. That gives local randomness within a window. The buffer size is the quality knob - too small and consecutive samples remain correlated, which matters enormously if shards are ordered by class or by time. I would size the buffer to span several shards' worth of samples. Note this is approximate shuffling and it is worth stating rather than pretending otherwise. SHARDING ACROSS WORKERS AND RANKS. This is where correctness bugs live. With an IterableDataset you must shard explicitly, and in distributed training you shard TWICE - across ranks and then across workers within each rank. Get this wrong and you either duplicate data or drop it, silently. The clean formulation is to assign shards to (rank, worker) pairs rather than assigning samples, so each shard is read by exactly one reader and the sequential-read property is preserved. And you need a policy for when shard counts do not divide evenly - either drop the remainder or accept slightly uneven epochs, but decide deliberately, because uneven ranks in DDP means some ranks finish early and the collective hangs. CACHING AND PREFETCH. Cache decoded shards on local disk if there is room, since epoch two is then local. Overlap the network fetch with compute - the same pipelining model as the local case, with much larger t_load. WHAT I WOULD MEASURE. Throughput in samples per second at the loader alone, network bandwidth utilization, and whether the GPU is idle. And I would test the shuffling: compute the distribution of labels within consecutive batches. If a batch is mostly one class, the shuffle buffer is too small and the model will see badly correlated gradients - a real quality problem that no throughput metric shows.",
          "deepDive": {
            "q": "How do you guarantee correctness of a distributed streaming pipeline - no duplicates, no drops, reproducible?",
            "a": "This deserves care because every failure here is silent and several are subtly wrong in ways that still train. THE DECOMPOSITION. You have R ranks, each with W workers, so R*W independent readers. The requirement is that the union of what they read is the dataset exactly once, with no overlaps. ASSIGN SHARDS, NOT SAMPLES. Give reader index k = rank * W + worker_id the shards where shard_index mod (R*W) == k. This is disjoint and covering by construction, and crucially each shard is read by exactly one reader, so sequential reading is preserved. Sharding by sample instead would make every reader touch every shard, destroying the access pattern you designed for. THE UNEVEN-DIVISION PROBLEM, which is the one that bites. If the shard count is not divisible by R*W, some readers get more shards than others. In DDP that means some ranks run out of data first, and since every rank must participate in every all-reduce, the fast ranks block forever waiting for a gradient sync that never comes - the job HANGS rather than errors, which is the worst failure mode. Three options: (a) drop the remainder shards so division is exact - simplest, loses a little data; (b) pad by repeating shards so all readers get the same count - keeps all data, slightly over-samples some; (c) have each rank signal completion and use a join context so ranks that finish early participate in dummy collectives. I would use (b) for training and (a) for evaluation, where duplicates would corrupt the metric. EVALUATION IS THE SUBTLE CASE. For validation you must not duplicate samples or the metric is wrong, and you must not drop them or the metric is computed on a subset. The standard trick is to pad the last batch and carry a mask, then all-gather both predictions and masks so duplicates can be removed before reducing. Many pipelines get this wrong and report a slightly incorrect validation number that nobody notices. REPRODUCIBILITY. Seed everything from a base seed plus the epoch, so the shard permutation and the shuffle buffer are deterministic given (base_seed, epoch): shard order from a generator seeded on (base_seed, epoch), and per-reader randomness seeded on (base_seed, epoch, rank, worker_id) so readers differ from each other but reproduce across runs. The equivalent of DistributedSampler.set_epoch for the streaming case - and its omission has the same effect, the same order every epoch. CHECKPOINT-RESUME is the hardest part and it is usually ignored. To resume mid-epoch you must record, per reader, which shard and which offset within it. Without that, resuming restarts the epoch and re-trains on data already seen, which is a real problem for single-pass training on very large corpora where you never see an epoch boundary. HOW I WOULD VERIFY ALL OF IT. Write a test that runs the pipeline with tiny synthetic shards containing unique integer ids, collects everything every reader yields, and asserts the multiset equals the expected one exactly. That test takes an hour to write and it is the only thing that will catch a duplication bug, because in production the symptom is 'the model is slightly worse than expected' and nobody attributes that to the loader."
          }
        },
        {
          "q": "When would you use WeightedRandomSampler versus weighting the loss?",
          "a": "They both address class imbalance and they are NOT equivalent, which is the substance of the answer. WHAT EACH DOES. WeightedRandomSampler changes which samples appear in a batch - it draws examples with probability proportional to a per-sample weight, typically inverse class frequency, so the batch composition is balanced. Loss weighting leaves the data alone and multiplies each example's loss by a class weight, so rare classes contribute more gradient per appearance. THE DIFFERENCES THAT MATTER. (1) GRADIENT VARIANCE. Resampling means rare-class examples appear often, so their gradient contribution is spread across many steps. Loss weighting means a rare example appears rarely but contributes a large gradient when it does, which is a higher-variance estimator - occasional large updates rather than steady small ones. In practice this makes loss weighting noisier at extreme imbalance. (2) REPETITION AND OVERFITTING. Sampling with replacement means the same rare examples are seen many times per epoch. If you have ten examples of a rare class and you upsample them fiftyfold, the model memorizes those ten. Loss weighting does not repeat data, so it does not create that specific overfitting pressure - it just makes the few examples count more, which has its own overfitting risk but a different shape. (3) INTERACTION WITH BATCH-DEPENDENT LAYERS. BatchNorm computes statistics over the batch, so changing batch composition changes those statistics. With a sampler the batch is balanced and the statistics reflect a balanced distribution that does not match test time. Loss weighting leaves batch composition at the true distribution. This is a genuine and under-appreciated difference. (4) EPOCH SEMANTICS. A sampler with replacement means an 'epoch' no longer means one pass over the data - some examples appear many times, some not at all. That breaks the mental model behind epoch-based schedules and early stopping. (5) COST. Sampling changes nothing about compute. Loss weighting also changes nothing. Both are free, unlike physical oversampling. WHICH I WOULD CHOOSE. Moderate imbalance and plenty of data in every class: loss weighting, because it is simpler, keeps epoch semantics, and does not disturb batch statistics. Severe imbalance with very few rare examples: sampling, so the rare class appears often enough to contribute stable gradients - but with augmentation applied so the repeats are not identical, because otherwise you are memorizing. Extreme imbalance, as in fraud or rare-event detection: neither alone is usually enough, and the better answers are a different objective - focal loss, which downweights easy examples rather than reweighting classes - or changing the decision threshold after training, or treating it as anomaly detection. WHAT I WOULD ACTUALLY DO FIRST, and this is the point I would emphasize: check whether the imbalance is a problem at all. Train without any correction and look at per-class recall and the precision-recall curve, not accuracy. Often the model handles it and the correction is solving a problem you inferred from the class histogram rather than measured. And whatever you do, TUNE THE DECISION THRESHOLD on validation afterwards, since that alone recovers most of what rebalancing was meant to achieve and it costs nothing."
        },
        {
          "q": "Walk through what happens between a Dataset's __getitem__ and a tensor on the GPU.",
          "a": "THE FULL PATH, because knowing it is what lets you find where the time goes. (1) THE SAMPLER produces an index, or a list of indices for a batch sampler. For map-style datasets this is where shuffling and any weighting happens, and in distributed training this is where the rank's shard is selected. (2) THE WORKER PROCESS receives the indices over a queue and calls __getitem__ for each. This is where reading, decoding and augmentation happen, entirely on CPU, in that worker's own interpreter. (3) COLLATE assembles the list of samples into batched tensors. The default collate stacks tensors and converts numbers; a custom one handles ragged data. Note that collation happens IN THE WORKER, not the main process, which is often overlooked - so an expensive collate is parallelized, which is good, but it also means the batch is fully materialized in worker memory before transfer. (4) THE BATCH IS SENT TO THE MAIN PROCESS through shared memory. Torch tensors are moved via file-descriptor-based sharing rather than being pickled byte-for-byte, which is why this is not as slow as it sounds - but it does mean the /dev/shm limit matters, and a small shared-memory allocation in a container is a classic cause of cryptic DataLoader crashes. (5) PIN_MEMORY, if enabled, copies the batch into page-locked host memory, either in a dedicated pinning thread in the main process or in the worker depending on version. Page-locked means the OS cannot swap those pages, which is the precondition for DMA. (6) THE .to(device, non_blocking=True) CALL issues an asynchronous DMA transfer on the current CUDA stream and returns immediately. The CPU continues while the copy proceeds. If the memory is not pinned, the driver must stage through an internal pinned buffer and the call becomes synchronous - so non_blocking silently does nothing. (7) KERNELS ARE ENQUEUED on the stream, ordered after the copy. Your Python code has by now run ahead and is probably loading the next batch. WHERE THE TIME ACTUALLY GOES, in my experience of profiling these: decoding in step 2 dominates vision pipelines; step 4's shared-memory transfer matters for very large batches; step 5 is cheap but pinning too much memory degrades the whole machine because page-locked pages cannot be swapped by anything. WHAT THIS EXPLAINS. Why non_blocking without pin_memory does nothing. Why /dev/shm size causes DataLoader crashes in containers. Why collate cost is parallelized but batch memory is not. And why the pipeline can be entirely hidden behind compute if and only if steps 1 to 5 for batch n+1 fit inside the compute time for batch n - which is the pipelining model, made concrete."
        },
        {
          "q": "How do you make a training run reproducible, and what remains non-deterministic?",
          "a": "WHAT YOU MUST SEED. Python's random, numpy's global state, and torch's CPU and CUDA generators. And crucially, PER WORKER: DataLoader gives each worker a distinct base seed for torch's generator, but a dataset using Python's random or numpy's global state inherits the parent's state under fork - so every worker produces the SAME augmentation randomness. The fix is a worker_init_fn that seeds those from torch.initial_seed(). Without it, augmentation diversity is silently divided by the number of workers, which is a quality bug with no symptom. WHAT ELSE YOU MUST FIX. The sampler's generator, so shuffling is reproducible; set_epoch or an equivalent so it differs per epoch but reproducibly. Weight initialization, which follows from the torch seed. And the ORDER of data, which for map-style datasets is fully determined by the sampler regardless of worker completion order - worth knowing, because people assume workers introduce order non-determinism and for map-style they do not. WHAT REMAINS NON-DETERMINISTIC EVEN THEN. (1) CUDA KERNEL NON-DETERMINISM. Several operations use atomic accumulation whose order depends on scheduling - scatter-add, index_add, some backward passes of pooling and convolution, and anything using atomicAdd on floats. Since floating-point addition is not associative, different orders give different results. torch.use_deterministic_algorithms(True) forces deterministic implementations where they exist and RAISES for operations where they do not, which is the right behaviour - it tells you what is non-deterministic instead of hiding it. (2) cuDNN BENCHMARK MODE picks convolution algorithms by timing them at runtime, so the choice can differ between runs; set cudnn.benchmark=False and cudnn.deterministic=True. Note this costs speed, which is the real reason people leave determinism off. (3) ATOMICS IN REDUCTIONS more generally, including some multi-GPU collectives where the reduction order across ranks is not fixed. (4) NON-DETERMINISM ACROSS HARDWARE OR LIBRARY VERSIONS: the same code on a different GPU architecture or cuDNN version can produce different results legitimately. Reproducibility is always relative to an environment. WHAT I WOULD ACTUALLY AIM FOR, because full bitwise determinism costs real performance. For DEBUGGING, turn everything on - deterministic algorithms, cudnn.deterministic, single worker - and accept the slowdown, because being able to reproduce a bug exactly is worth more than throughput while you are hunting it. For PRODUCTION training, seed everything and accept kernel-level non-determinism, but verify that the run-to-run variance in your final metric is small compared to the effects you care about - which is a measurement worth doing once, since if seed variance exceeds your improvements you have a bigger problem than reproducibility. THE POINT I WOULD END ON. 'Reproducible' usually means 'the conclusion reproduces', not 'the bits reproduce'. Establishing the seed-to-seed spread of your metric tells you which claims your experiments can actually support, and that is more valuable than bitwise determinism."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "num_workers spawns PROCESSES, not threads",
        "back": "Because the GIL makes threads useless for CPU-bound work (decode, augment). Every surprising DataLoader behaviour follows from this: dataset copies, module re-import under spawn, harder debugging, per-worker RNG state."
      },
      {
        "type": "pitfall",
        "front": "IterableDataset must be sharded BY HAND",
        "back": "Use get_worker_info() and yield items where i % num_workers == worker_id. Omit it and every worker yields the SAME stream: W duplicates of everything, diversity divided by W, epochs W times longer. Nothing errors."
      },
      {
        "type": "formula",
        "front": "The overlap speedup is capped at 2",
        "back": "(t_load + t_compute) / max(t_load, t_compute) <= 2, achieved only at BALANCE. If loading is 10x compute you are still load-bound - the fix is a faster loader, not more overlap. Inverted-V in the load/compute ratio."
      },
      {
        "type": "pitfall",
        "front": "non_blocking=True without pin_memory is a no-op",
        "back": "Async DMA requires PAGE-LOCKED host memory. Without pinning, the driver stages through an internal buffer and the copy is synchronous - you get none of the overlap you configured, silently."
      },
      {
        "type": "pitfall",
        "front": "Why a Dataset holding a Python list leaks memory",
        "back": "fork shares pages copy-on-write, but CPython's REFCOUNT lives in the object header - so merely READING an object writes to its page and forces a copy. Store payloads as numpy/arrow/memmap (one refcount for the whole buffer), not lists of objects."
      },
      {
        "type": "pitfall",
        "front": "DistributedSampler.set_epoch(epoch)",
        "back": "Without it the shuffle seed never changes: every epoch presents the same order and the same shards to the same ranks. Training converges worse, with no error anywhere."
      },
      {
        "type": "intuition",
        "front": "The three-measurement bottleneck test",
        "back": "(1) Is GPU utilization low? (2) Time the LOADER with the model removed. (3) Time the STEP on one reused batch, with torch.cuda.synchronize both sides. loader >> compute = input-bound; compute >> loader = more workers buy nothing."
      },
      {
        "type": "pitfall",
        "front": "Benchmark CUDA with synchronize()",
        "back": "Launches are ASYNCHRONOUS, so timing around them measures how fast Python enqueues kernels, not how long they run - and the error always flatters the GPU. Also warm up first, for autotuning and allocator caching."
      },
      {
        "type": "pitfall",
        "front": "Seed the RNG PER WORKER",
        "back": "Torch gives each worker a distinct seed, but a dataset using Python's `random` or numpy's GLOBAL state inherits the parent's under fork - so every worker produces IDENTICAL augmentation randomness. Fix with worker_init_fn. Diversity silently divided by W."
      },
      {
        "type": "intuition",
        "front": "Random access kills remote-storage pipelines",
        "back": "Per-sample reads from object storage have tens-of-ms latency - you cannot feed a GPU that way regardless of worker count. Pack into SEQUENTIAL shards (WebDataset tar, parquet) and shuffle with (a) shard-list permutation + (b) a shuffle BUFFER."
      },
      {
        "type": "pitfall",
        "front": "Uneven shards HANG a DDP job",
        "back": "If shard count is not divisible by ranks x workers, some ranks run out first - and every rank must join every all-reduce, so the fast ranks block forever. Pad by repeating (training) or drop remainder (evaluation, where duplicates corrupt the metric)."
      },
      {
        "type": "intuition",
        "front": "WeightedRandomSampler vs loss weighting",
        "back": "NOT equivalent. Sampling repeats rare examples (memorization risk), breaks epoch semantics, and changes BATCH COMPOSITION - so BatchNorm statistics no longer match test time. Loss weighting keeps the true distribution but gives a higher-variance gradient."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: torch.utils.data documentation",
        "url": "https://pytorch.org/docs/stable/data.html"
      },
      {
        "title": "PyTorch: Single- and Multi-process Data Loading internals",
        "url": "https://pytorch.org/docs/stable/data.html#single-and-multi-process-data-loading"
      },
      {
        "title": "Aizman, Maltby & Breuel (2019), High Performance I/O For Large Scale Deep Learning (WebDataset)",
        "url": "https://arxiv.org/abs/2001.01858"
      },
      {
        "title": "PyTorch: Reproducibility and deterministic algorithms",
        "url": "https://pytorch.org/docs/stable/notes/randomness.html"
      },
      {
        "title": "PyTorch: CUDA semantics - asynchronous execution and pinned memory",
        "url": "https://pytorch.org/docs/stable/notes/cuda.html"
      }
    ],
    "demos": [
      "reservoir-sampling",
      "batching",
      "image-augmentation",
      "importance-sampling"
    ]
  },
  "nn-module-patterns": {
    "level": "core",
    "body": {
      "intuition": [
        "nn.Module looks like a plain Python class and it is not. It overrides __setattr__, so every assignment is intercepted: assign an nn.Parameter and it is registered in a parameter dictionary; assign another Module and it joins the child-module tree; assign anything else and it is an ordinary attribute. That single interception is what makes .parameters(), .to(device), .state_dict(), .train() and .cuda() work at all - they are recursive walks over a tree the assignments built for you.",
        "And it is the source of this module's most expensive silent bug. Write self.layers = [nn.Linear(d, d) for _ in range(6)] and the list is an ordinary attribute. The six Linears are NOT registered. They never appear in .parameters(), so the optimizer never sees them; .to('cuda') never moves them, so you get a device mismatch or - worse, if the input happens to be on CPU - you do not; .state_dict() omits them, so a checkpoint silently loses a third of the model. Meanwhile the forward pass still calls them and the loss still falls, because the registered parts learn. You have trained a model with six layers frozen at random initialization and nothing anywhere said so. nn.ModuleList exists exactly to fix this.",
        "The pattern repeats. Buffers are the same mechanism for non-learnable state that must still move with the model and appear in checkpoints. train() and eval() flip a flag that only two common layers read, and forgetting eval() at validation means BatchNorm updates its running statistics on validation data - corrupting the model with information from the set you are measuring on, which is quiet contamination rather than a crash. load_state_dict(strict=False) returns the keys it could not match and returns them as a value people discard. Every one of these is the module's theme: the abstraction did something helpful and hid the mechanism, and when the mechanism fails it fails without a symptom that names it."
      ],
      "math": [
        {
          "h": "What assignment actually registers",
          "paras": [
            "nn.Module's __setattr__ dispatches on type. Three destinations, and everything else falls through to the instance dictionary where none of the recursive machinery can see it.",
            "This is the whole mechanism, and knowing it lets you predict exactly which containers work and which silently do not."
          ],
          "tex": "\\text{setattr}(m, n, v) \\to \\begin{cases} m.\\_parameters[n] = v & v \\in \\text{Parameter} \\\\ m.\\_modules[n] = v & v \\in \\text{Module} \\\\ m.\\_buffers[n] = v & \\text{via register\\_buffer} \\\\ m.\\_\\_dict\\_\\_[n] = v & \\textbf{otherwise - INVISIBLE} \\end{cases}",
          "texNote": "A Python list, dict, or tuple of Modules lands in the last row. So does a Parameter stored inside a list. The containers nn.ModuleList, nn.ModuleDict, nn.ParameterList and nn.ParameterDict exist solely to route those cases into the first three rows - they are not stylistic alternatives, they are the difference between a registered and an unregistered submodule."
        },
        {
          "h": "state_dict is a flattening of the tree",
          "paras": [
            "Keys are the dotted attribute path from the root, so a checkpoint's key structure IS your attribute naming. Rename an attribute and every existing checkpoint stops matching that key.",
            "load_state_dict returns the mismatches rather than raising when strict is False - and that return value is the only thing standing between you and a silently half-loaded model."
          ],
          "tex": "\\text{state\\_dict}[\\,\\underbrace{\\text{\"encoder.layers.3.attn.qkv.weight\"}}_{\\text{attribute path}}\\,] = W \\\\[4pt] \\text{load\\_state\\_dict}(\\ldots,\\, \\text{strict=False}) \\;\\to\\; (\\text{missing\\_keys},\\, \\text{unexpected\\_keys})",
          "texNote": "Buffers appear here too, which is why BatchNorm's running statistics survive a save-load round trip - they are state the model needs and are not parameters. Register a buffer with persistent=False to keep it out, which is right for things like a causal mask that can be recomputed and would otherwise bloat every checkpoint and break when the sequence length changes."
        },
        {
          "h": "Why forgetting .eval() is a correctness bug, not a style issue",
          "paras": [
            "BatchNorm computes genuinely different functions in the two modes, and in training mode it also MUTATES state. Dropout differs too, but only in the output - it changes nothing persistent.",
            "So a validation pass in training mode both measures the wrong thing and modifies the model using the validation data."
          ],
          "tex": "\\text{train: } \\hat{x} = \\frac{x - \\mu_{\\mathcal{B}}}{\\sqrt{\\sigma^2_{\\mathcal{B}} + \\epsilon}}, \\;\\; \\mu_{\\text{run}} \\leftarrow (1-\\alpha)\\mu_{\\text{run}} + \\alpha \\mu_{\\mathcal{B}} \\\\[4pt] \\text{eval: } \\hat{x} = \\frac{x - \\mu_{\\text{run}}}{\\sqrt{\\sigma^2_{\\text{run}} + \\epsilon}} \\qquad \\text{(no update)}",
          "texNote": "Two consequences of the training branch that people miss. The output depends on the OTHER examples in the batch, so predictions are not independent - which breaks any evaluation assuming per-example inference. And the running statistics are updated, so validating in training mode leaks the validation distribution into the deployed model permanently."
        }
      ],
      "code": [
        {
          "h": "The registration bug, and the containers that fix it",
          "paras": [
            "The most expensive four lines in the module. The broken version runs, trains, and produces a plausible loss curve while a third of the network never moves."
          ],
          "code": "class Broken(nn.Module):\n    def __init__(self, d, n):\n        super().__init__()\n        self.layers = [nn.Linear(d, d) for _ in range(n)]   # <-- PLAIN LIST\n        self.head   = nn.Linear(d, 1)\n    def forward(self, x):\n        for l in self.layers: x = l(x).relu()                # still CALLED...\n        return self.head(x)                                  # ...never TRAINED\n\n# len(list(Broken(64, 6).parameters()))  ->  2   (just the head!)\n# The 6 Linears are absent from .parameters(), so the optimizer never sees\n# them; absent from .to('cuda'), so they stay on CPU; absent from\n# .state_dict(), so the checkpoint loses them. The loss still falls.\n\nclass Correct(nn.Module):\n    def __init__(self, d, n):\n        super().__init__()\n        self.layers = nn.ModuleList(nn.Linear(d, d) for _ in range(n))\n        self.head   = nn.Linear(d, 1)\n        # NON-LEARNABLE state that must still move with .to() and be saved:\n        self.register_buffer(\"scale\", torch.tensor(d ** -0.5))\n        # ...and state you'd rather NOT ship in every checkpoint:\n        self.register_buffer(\"mask\", causal_mask(1024), persistent=False)\n\n# THE ONE-LINE ASSERTION THAT WOULD HAVE CAUGHT IT - put it in a test:\nassert sum(p.numel() for p in model.parameters()) == EXPECTED_PARAM_COUNT\n#\n# Counting parameters is the cheapest structural check available and it\n# catches unregistered submodules, tied weights you did not intend, and\n# accidental duplication. Almost nobody writes it.",
          "caption": "A plain list of Modules is invisible to every recursive walk - optimizer, device move, checkpoint - while still being called in forward. The parameter-count assertion is the cheapest structural test that exists and it catches this class of bug instantly."
        },
        {
          "h": "Hooks, and reading load_state_dict's return value",
          "paras": [
            "Hooks are the supported way to observe or modify a module without editing it. And the strict=False return value is the difference between knowing your checkpoint loaded and assuming it."
          ],
          "code": "# HOOKS: observe or modify without touching the module's code.\nfeats = {}\ndef grab(name):\n    def hook(mod, inp, out): feats[name] = out.detach()\n    return hook\n\nhandles = [m.register_forward_hook(grab(n))\n           for n, m in model.named_modules() if isinstance(m, nn.Linear)]\n# ... run the model, read feats ...\nfor h in handles: h.remove()      # <-- REMOVE THEM. A retained hook that\n                                  # closes over tensors keeps them (and their\n                                  # graph) alive - a memory leak with no symptom\n                                  # beyond gradual growth.\n\n# register_full_backward_hook gives grad_input/grad_output for the same job\n# on the backward pass - the standard tool for finding where gradients vanish.\n\n# ---- CHECK WHAT ACTUALLY LOADED ----\nmissing, unexpected = model.load_state_dict(ckpt, strict=False)\nif missing or unexpected:\n    print(\"MISSING  :\", missing)     # in the model, absent from the checkpoint\n    print(\"UNEXPECTED:\", unexpected) # in the checkpoint, absent from the model\n    raise RuntimeError(\"partial load - decide deliberately\")\n#\n# strict=False is used constantly for transfer learning and fine-tuning, and\n# its return value is discarded almost as constantly. A renamed attribute, a\n# 'module.' prefix left over from DataParallel, or a changed head silently\n# leaves those weights at random init - and the model still runs.\n\n# TIED WEIGHTS behave correctly by default:\nmodel.decoder.weight = model.embedding.weight   # same object\n# .parameters() DEDUPLICATES by identity, so the shared tensor appears once and\n# the optimizer updates it once. This is why weight tying needs no special\n# handling - but it also means a parameter count will not reveal the sharing.",
          "caption": "Two habits worth building: remove every hook you register, since a retained one holds the graph alive, and always inspect what load_state_dict(strict=False) returns - a leftover 'module.' prefix or a renamed attribute leaves weights at random init while the model runs fine."
        }
      ],
      "useCases": [
        "Any model with a repeated block - transformers, ResNets, U-Nets - where nn.ModuleList or nn.Sequential is what makes a variable-depth stack correct rather than merely convenient.",
        "Feature extraction and interpretability work, where forward hooks let you capture intermediate activations from a model you did not write and cannot modify, which is the standard approach for probing and for Grad-CAM-style attribution.",
        "Transfer learning and fine-tuning, where strict=False loading with a deliberate inspection of the missing and unexpected keys is the difference between initializing a new head on purpose and losing half the backbone by accident.",
        "Weight tying between input embedding and output projection in language models, which works automatically because .parameters() deduplicates by identity - one of the rare cases where the abstraction's hidden behaviour is exactly right."
      ],
      "pitfalls": [
        "Storing submodules in a plain Python list, dict or tuple. They are not registered, so they are invisible to .parameters(), .to(), and .state_dict() while still being called in forward - a third of your model silently frozen at initialization. Use nn.ModuleList or nn.ModuleDict.",
        "Forgetting model.eval() before validation. BatchNorm then uses batch statistics AND updates its running estimates from validation data, which both measures the wrong function and permanently contaminates the model with the set you are measuring on.",
        "Forgetting model.train() after validation. The reverse, and equally silent: the rest of training runs with dropout disabled and BatchNorm frozen, so your regularization quietly stops.",
        "Discarding load_state_dict(strict=False)'s return value. A renamed attribute, a leftover 'module.' prefix from DataParallel, or a changed head leaves those weights at random initialization and the model still runs. Inspect missing and unexpected keys every time.",
        "Creating layers inside forward. Each call constructs new modules with fresh random parameters that the optimizer has never seen, so nothing learns and memory grows. Layers belong in __init__; use lazy modules if the shape is genuinely unknown until the first call.",
        "Registering hooks without removing them. The handle exists for a reason - a retained forward hook closing over outputs keeps those tensors and their autograd graph alive, producing steady memory growth with no other symptom.",
        "Assuming .to(device) behaves like a tensor's. Module.to is IN-PLACE and returns self; Tensor.to is out-of-place and returns a new tensor. Writing tensor.to(device) without assigning the result is a genuinely common bug that leaves the tensor where it was."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/custom-autograd",
          "text": "The other half of what a Module hides. Registration builds the parameter tree; autograd builds the graph that connects it - and a custom Function is where you take over the second while the first keeps working."
        },
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "fx traces the module tree into a graph you can rewrite programmatically, which only works because the tree exists as a data structure. Unregistered submodules are invisible to fx for exactly the same reason they are invisible to the optimizer."
        },
        {
          "ref": "neural-nets/regularization",
          "text": "train/eval mode is where dropout's two behaviours live. The mode flag is the mechanism, and forgetting to set it is how regularization silently stops or how evaluation silently becomes stochastic."
        },
        {
          "ref": "neural-nets/pytorch-fundamentals",
          "text": "The tensor-level foundation this builds on. The in-place versus out-of-place asymmetry between Module.to and Tensor.to is the kind of detail that only makes sense once you know a Module is a container and a tensor is a value."
        },
        {
          "ref": "mlops/testing",
          "text": "The parameter-count assertion and the load_state_dict key check are unit tests. Structural tests for models are rare and unusually high-value, because the failures they catch are exactly the ones that produce a plausible loss curve."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does nn.Module's __setattr__ do?",
          "a": "It dispatches on type: Parameters go to _parameters, Modules to _modules, buffers to _buffers via register_buffer, and everything else to the ordinary instance dictionary where the recursive machinery cannot see it."
        },
        {
          "q": "What goes wrong with self.layers = [nn.Linear(...), ...]?",
          "a": "The list is an ordinary attribute, so the Linears are unregistered - invisible to .parameters(), .to(), and .state_dict() - while still being called in forward. They stay frozen at initialization."
        },
        {
          "q": "What is nn.ModuleList for?",
          "a": "Routing a sequence of modules into the registration mechanism. It is not a style choice; it is the difference between registered and invisible submodules."
        },
        {
          "q": "What is a buffer?",
          "a": "Non-learnable state that should still move with .to(device) and appear in state_dict - BatchNorm running statistics, fixed positional encodings, precomputed masks."
        },
        {
          "q": "What does persistent=False do on a buffer?",
          "a": "Keeps it out of state_dict. Right for anything recomputable, like a causal mask, which would otherwise bloat checkpoints and break when sequence length changes."
        },
        {
          "q": "What do train() and eval() actually change?",
          "a": "A boolean flag that in practice only Dropout and BatchNorm-style layers read. Dropout stops dropping; BatchNorm switches to running statistics and stops updating them."
        },
        {
          "q": "Why is forgetting eval() a correctness bug?",
          "a": "BatchNorm both normalizes with batch statistics - making predictions depend on other examples in the batch - and updates its running estimates from validation data, contaminating the model permanently."
        },
        {
          "q": "What does load_state_dict(strict=False) return?",
          "a": "A tuple of missing keys and unexpected keys. Discarding it is how a renamed attribute or a leftover 'module.' prefix silently leaves weights at random initialization."
        },
        {
          "q": "How does weight tying work?",
          "a": "Assign the same tensor to two attributes. .parameters() deduplicates by identity, so the shared parameter appears once and is updated once - no special handling needed."
        },
        {
          "q": "Why must hooks be removed?",
          "a": "The handle's remove() unregisters it. A retained forward hook that closes over outputs keeps those tensors and their graph alive, producing steady memory growth."
        },
        {
          "q": "What happens if you create a layer in forward?",
          "a": "New modules with fresh random parameters are built on every call, the optimizer never sees them, nothing learns, and memory grows."
        },
        {
          "q": "How does Module.to differ from Tensor.to?",
          "a": "Module.to is in-place and returns self; Tensor.to is out-of-place and returns a new tensor. Calling tensor.to(device) without assigning the result does nothing."
        }
      ],
      "standard": [
        {
          "q": "Explain how nn.Module registration works and the bugs it causes.",
          "a": "THE MECHANISM. nn.Module overrides __setattr__, so every attribute assignment is intercepted and dispatched on type. An nn.Parameter goes into the module's _parameters dictionary. Another nn.Module goes into _modules, building a tree. register_buffer puts a tensor into _buffers. Anything else falls through to the plain instance dictionary. WHY THAT MATTERS. Everything convenient about Modules is a recursive walk over that tree. .parameters() walks _parameters and recurses into _modules - that is what the optimizer receives. .to(device) walks and moves every parameter and buffer in place. .state_dict() walks and builds a flat dictionary keyed by dotted attribute path. .train() and .eval() walk and set a flag. If something is not in the tree, it participates in none of this. THE CANONICAL BUG. self.layers = [nn.Linear(d, d) for _ in range(6)] stores a plain Python list, which is an ordinary attribute. The six Linears are unregistered. So: the optimizer never receives their parameters, so they never update; .to('cuda') never moves them, so either you get a device error or - if inputs happen to be on CPU - you silently run part of the model on CPU; .state_dict() omits them, so a checkpoint loses them entirely and reloading gives fresh random weights. And forward still CALLS them, so the model runs and the loss still falls, because the registered parts compensate. You have a model with a third of its depth frozen at initialization and no error anywhere. THE FIX is nn.ModuleList, nn.ModuleDict, nn.ParameterList - containers whose only job is to route their contents into the registration mechanism. THE RELATED CASES. A Parameter stored inside a list has the same problem. A tensor that should be state - BatchNorm's running mean, a positional encoding - assigned as a plain attribute will not move device or save; it needs register_buffer. And creating layers inside forward constructs fresh parameters every call, so nothing learns. HOW I WOULD CATCH IT. A single assertion on total parameter count, in a test: sum(p.numel() for p in model.parameters()) == expected. It is the cheapest structural check available, it catches unregistered submodules immediately, and it also catches unintended weight sharing and accidental duplication. Almost nobody writes it, and it would prevent the most expensive class of bug in this lesson. THE THEME. This is the module's spine in its clearest form: the abstraction hid the registration mechanism to make model definition pleasant, and when the mechanism fails it fails without any symptom that names it - the loss curve looks fine.",
          "deepDive": {
            "q": "You load a pretrained checkpoint and the model performs at chance. Walk through the diagnosis.",
            "a": "Performance at chance after loading means the weights are effectively random, so I would establish WHERE the load failed before theorizing. STEP 1: DID IT LOAD AT ALL? Call load_state_dict with strict=True. If it raises, the error names the mismatched keys and I am done in seconds. Most people use strict=False for flexibility and then never look at what it returned, which converts a loud failure into a silent one. So: missing, unexpected = model.load_state_dict(ckpt, strict=False) and PRINT BOTH. If missing is large, most of the model was never loaded. STEP 2: THE COMMON KEY MISMATCHES, which cover the majority of cases. (a) A 'module.' prefix on every key, left over from a checkpoint saved from a DataParallel or DDP-wrapped model - the wrapper adds a level to the attribute path. Strip it. (b) An 'model.' or '_orig_mod.' prefix from a compiled model, since torch.compile wraps the module. (c) Renamed attributes between the code version that saved and the one loading - keys are attribute paths, so renaming self.fc to self.head invalidates every checkpoint. (d) A changed head for a new number of classes, which SHOULD be missing and is the one legitimate case - but then only those keys should be missing. STEP 3: DID IT LOAD INTO THE RIGHT OBJECT? A subtle one: if you build the model, wrap it (DDP, compile, a Lightning module), and then load into the wrapper versus the inner module, the paths differ. Load into the unwrapped module before wrapping. STEP 4: VERIFY NUMERICALLY RATHER THAN STRUCTURALLY. Even with all keys matched, check that the weights actually changed: take a parameter's norm before and after loading. If identical, nothing was assigned. This catches the case where you loaded into a copy or where an in-place expectation was wrong. STEP 5: IF THE WEIGHTS ARE RIGHT, THE PROBLEM IS ELSEWHERE, and now the diagnosis shifts. Is the model in eval mode? A model with BatchNorm in training mode with batch size 1 produces garbage, because the batch statistics are computed from a single example. Is the PREPROCESSING the same as at training time - normalization constants, channel order, resize interpolation? A pretrained vision model given un-normalized inputs performs near chance and this is extremely common. Is the input dtype and range what the model expects. STEP 6: THE MINIMAL CHECK I would run first in future. Load the checkpoint, put the model in eval, run the ORIGINAL training data through it, and confirm the loss matches what was recorded at save time. That single check distinguishes 'the weights are wrong' from 'everything downstream of the weights is wrong', and it takes two minutes. THE HABIT WORTH BUILDING. Treat load_state_dict's return value as an error to be handled, not a value to be ignored - raise on unexpected missing keys and explicitly allow-list the ones you intend, such as a new head. That converts this entire class of silent failure back into a loud one, which is what it should have been."
          }
        },
        {
          "q": "What are hooks and when would you use them?",
          "a": "WHAT THEY ARE. Callbacks registered on a Module that fire during forward or backward, giving you access to inputs, outputs and gradients without modifying the module's code. Three main kinds: forward_pre_hook fires before forward and can modify the inputs; forward_hook fires after and sees inputs and outputs, and can replace the output; full_backward_hook fires during backward and sees the gradients with respect to the module's inputs and outputs. Registration returns a HANDLE whose remove() unregisters it. WHEN I WOULD USE THEM. (1) FEATURE EXTRACTION from a model you did not write and should not modify - grabbing intermediate activations from a pretrained backbone for probing, for retrieval, or for a downstream head. This is the most common use and it is exactly what hooks are for. (2) INTERPRETABILITY. Grad-CAM needs both the activations of a target layer and the gradients flowing into it, which is a forward hook plus a backward hook and nothing else. Activation patching and probing work the same way. (3) DEBUGGING GRADIENT FLOW. A backward hook logging gradient norms per layer is the standard tool for finding where gradients vanish or explode, and it localizes the problem to a layer immediately rather than leaving you with an aggregate. (4) MONITORING ACTIVATION STATISTICS - mean, standard deviation, fraction of dead ReLUs, per layer - which catches initialization and normalization problems that the loss curve does not show. (5) INJECTING BEHAVIOUR: quantization observers, activation clipping, noise injection, and profiling instrumentation are all implemented as hooks in real libraries. THE PITFALLS, and they matter. (1) REMOVE THEM. A retained forward hook that stores outputs keeps those tensors alive, and if they carry an autograd graph you keep the whole graph. This is a steady memory leak whose only symptom is growth. Use a context manager or a try/finally. (2) DETACH what you store, unless you specifically want the graph. feats[name] = out means you retain the graph; out.detach() means you do not. (3) HOOKS AND torch.compile or fx interact awkwardly - hooks are Python-level side effects, and a traced or compiled graph may not run them where you expect. Do not rely on hooks inside a compiled region. (4) BACKWARD HOOK SEMANTICS are subtle: use register_full_backward_hook rather than the deprecated register_backward_hook, whose behaviour with modules having multiple inputs was genuinely wrong. WHEN I WOULD NOT USE THEM. If I control the module's code, an explicit return of intermediates is clearer, testable, and survives compilation. Hooks are for when you do not control the code, or when the instrumentation should be removable without touching the model - which is a real and common requirement.",
          "deepDive": {
            "q": "Explain parametrizations - what problem do they solve that a hook or a custom Module does not?",
            "a": "THE PROBLEM. Sometimes you want a weight to be a FUNCTION of an underlying parameter rather than a free parameter itself. Weight normalization writes W = g * V / ||V||, learning direction and magnitude separately. Spectral normalization writes W = W_raw / sigma(W_raw), dividing by the largest singular value to bound the Lipschitz constant. Orthogonal parametrization keeps W on the orthogonal manifold. In each case the thing the layer uses is not the thing the optimizer updates. WHY THE OBVIOUS APPROACHES ARE UNSATISFACTORY. Writing a custom Module means reimplementing the layer, so you now maintain your own Linear or Conv2d and lose everything that special-cases the standard ones - fused kernels, quantization support, fx patterns. Using a forward_pre_hook to overwrite the weight before each call works and is roughly what the old weight_norm implementation did, and it is fragile: the weight attribute is mutated in place, state_dict contains the raw parameter under a surprising name, and removing the reparametrization cleanly is awkward. torch.nn.utils.parametrize DOES IT PROPERLY. You register a small Module on a parameter, and PyTorch replaces the attribute with a property that computes the parametrized value on access, keeping the original as an ordinary parameter under module.parametrizations. The gradient flows through the parametrization function automatically, because it is just autograd. Key properties: (1) THE ORIGINAL LAYER IS UNTOUCHED - you parametrize an existing nn.Linear rather than replacing it. (2) COMPOSABLE - multiple parametrizations chain in order. (3) CLEAN REMOVAL - parametrize.remove_parametrizations bakes the current value back into a plain parameter, which is exactly what you want before exporting or deploying. (4) CACHING - a context manager caches the computed value so you do not recompute the normalization on every access within a forward pass, which matters when the parametrization is expensive. (5) state_dict CONTAINS THE UNDERLYING PARAMETER, so checkpoints are of the free variable and the constraint is re-applied on load, which is the correct semantics. THE SUBTLETY WORTH KNOWING. Spectral norm's sigma is estimated by POWER ITERATION with a persistent vector carried across steps - so it has state, which is a buffer, and the estimate is only accurate because it is warm-started each iteration. That means it behaves differently in eval mode and that calling the layer twice in one step advances the iteration. This is a case where a parametrization is not a pure function of the parameter, and knowing that explains otherwise confusing non-determinism. WHERE I WOULD USE IT. Spectral norm for GAN discriminators and anywhere you want a Lipschitz bound; orthogonal parametrization for RNN recurrent matrices to control gradient scaling; and any constrained optimization where projecting after each step is the alternative - parametrization is generally better than projection because the constraint holds exactly at every point rather than being restored afterwards."
          }
        },
        {
          "q": "Why does forgetting model.eval() matter, and what exactly changes?",
          "a": "WHAT THE FLAG DOES. train() and eval() set a boolean, self.training, recursively on the module tree. Most layers ignore it. In practice two families read it and they are the two that matter. DROPOUT. In training it zeroes a random fraction of activations and scales the rest by 1/(1-p) so the expected value is preserved - inverted dropout. In eval it is the identity. If you evaluate in training mode, your predictions are STOCHASTIC: run the same input twice and get different answers, and your validation metric has noise that has nothing to do with the model. BATCHNORM, and this is the serious one, because it does two different things. First, the normalization statistics: in training it uses the current batch's mean and variance; in eval it uses the running estimates accumulated during training. Second - and this is the part people forget - in training mode it UPDATES those running estimates from the batch it just saw. So evaluating in training mode has two consequences. (1) THE OUTPUT DEPENDS ON THE OTHER EXAMPLES IN THE BATCH. Your prediction for one input changes depending on what it was batched with, which violates the assumption behind essentially every evaluation protocol and makes single-example inference wrong. At batch size 1 the variance is degenerate and the output is garbage. (2) THE MODEL IS MUTATED USING VALIDATION DATA. The running statistics now contain information from the set you are measuring on, and that contamination is permanent - it goes into the checkpoint and into production. It is a quiet form of test-set leakage that no metric reveals. THE REVERSE BUG is equally silent: forgetting model.train() after validation means the rest of your training runs with dropout disabled and BatchNorm frozen, so your regularization stops and your normalization statistics stop tracking the shifting activation distribution. Training continues, converges differently, and nothing says why. HOW I WOULD PREVENT IT. Use a context manager or a helper that sets the mode and restores it, rather than calling eval() and train() by hand in a loop - the failure is a missing line, so remove the possibility of missing it. And pair eval() with torch.no_grad() or inference_mode(), which are orthogonal: no_grad controls whether the graph is built, eval controls layer behaviour, and using one without the other is a common confusion. Neither implies the other. A CHECK WORTH HAVING. Assert model.training is False inside your evaluation function. One line, and it converts a silent correctness bug into a loud one. THE BROADER POINT. This is a case where an abstraction unified two genuinely different mathematical functions behind one call, which is convenient and correct - and the cost is that switching between them is a side effect you can forget, with no error when you do."
        },
        {
          "q": "How would you implement a model with a variable number of layers and shared weights?",
          "a": "TWO SEPARATE REQUIREMENTS, and it is worth separating them because they use different mechanisms. VARIABLE DEPTH: nn.ModuleList. Construct the layers in __init__ from a depth argument and store them in a ModuleList so they are registered. If the forward pass is a simple chain, nn.Sequential is even better since it supplies the forward for you; ModuleList is what you want when the loop does anything else - residual connections that skip differently, a layer index passed to each block, or early exit. The important thing is that neither a plain list nor a dict works, for the registration reason. WEIGHT SHARING: assign the same module object to multiple positions. Because .parameters() deduplicates by identity, the shared parameters appear once and the optimizer updates them once - which is exactly right. Concretely, self.block = Block(d) once, then call it n times in a loop, gives a universal-transformer-style recurrent depth with one block's worth of parameters. Or tie an embedding to an output projection by assigning the same tensor to both attributes, which is standard in language models and needs no special handling. THE SUBTLETIES I WOULD MENTION. (1) SHARED MODULES WITH STATE. If the shared block contains BatchNorm, its running statistics are shared across all invocations and are updated once per call - so a block used six times updates its statistics six times per step with six different activation distributions. That is usually wrong. LayerNorm has no running state and is safe, which is one reason recurrent-depth architectures use it. (2) GRADIENTS ACCUMULATE CORRECTLY. Calling the same module n times means autograd accumulates n gradient contributions into the same parameter, which is the correct semantics and needs no intervention. (3) PARAMETER COUNTING WILL NOT SHOW THE SHARING, since dedup makes it look like a small model - so a parameter-count assertion cannot distinguish intended tying from accidental aliasing, and I would test the intent explicitly with an identity check. (4) CHECKPOINT KEYS follow the attribute path, so a shared module saved once loads once - no issue, but be aware that converting a shared architecture to an unshared one invalidates checkpoints in a way that is not obvious from the key names. THE VARIANT WORTH KNOWING: PARTIAL SHARING, where you share most of a block but give each position its own small adapter or its own layer norm. That is implemented as one shared module plus a ModuleList of per-position modules, and it is the structure behind several parameter-efficient architectures. WHAT I WOULD ACTUALLY CHECK after building it. Print the total parameter count and compare against the arithmetic for both the shared and unshared versions - if it matches the unshared number, the sharing did not happen, and if it matches the shared number when you wanted independent layers, you have accidentally aliased. That check takes one line and it is the only thing that distinguishes the two designs from the outside."
        },
        {
          "q": "What is the difference between eval(), no_grad(), and inference_mode()?",
          "a": "THEY ARE ORTHOGONAL and confusing them is common, so I would state clearly that you generally need at least two of them and that none implies another. eval() CHANGES LAYER BEHAVIOUR. It sets self.training = False recursively, which makes Dropout the identity and makes BatchNorm use running statistics instead of batch statistics and stop updating them. It has NOTHING to do with gradients - an eval-mode model still builds a full autograd graph and still allocates all the intermediate tensors for backward. no_grad() CHANGES GRAPH CONSTRUCTION. Inside the context, operations do not record grad_fn, so no graph is built and the intermediate activations that backward would need are freed as soon as they are unused. This is a large memory saving and a modest speedup. It has NOTHING to do with layer behaviour - a model in training mode inside no_grad still applies dropout and still updates BatchNorm running statistics, which is exactly the silent contamination case. inference_mode() IS A STRONGER no_grad. It also skips version counting and view tracking, the bookkeeping autograd uses to detect in-place modifications of tensors it needs. That makes it faster and lower-overhead than no_grad, at a cost: tensors created inside inference mode are marked and CANNOT later be used in autograd at all - not just 'they have no gradient', but using them in a graph raises an error. So it is right for pure serving and wrong if the outputs will feed anything that needs differentiation. THE PRACTICAL COMBINATIONS. Validation during training: model.eval() plus torch.no_grad(). I would use no_grad rather than inference_mode here because validation outputs sometimes flow into things that touch autograd, and the error when they do is confusing. Pure serving: model.eval() plus torch.inference_mode() for the extra speed. Computing gradients with respect to the INPUT - adversarial examples, saliency, Grad-CAM: model.eval() but NOT no_grad, since you need the graph. This combination is the one that reveals the orthogonality most clearly. Training: model.train() and no context manager. THE BUGS EACH OMISSION CAUSES. eval() without no_grad: correct outputs, wasted memory - and at large batch sizes this alone can cause an out-of-memory during validation, which is a very common and confusing failure since validation is supposed to be cheaper than training. no_grad without eval(): stochastic predictions from dropout and, worse, BatchNorm running statistics updated from validation data - a permanent contamination with no error. Neither: both problems. THE CHECK I WOULD ADD. Assert model.training is False and torch.is_grad_enabled() is False at the top of the evaluation function. Two lines, and they convert both silent failures into loud ones - which is the recurring recommendation in this module, because every failure here is one that still produces a plausible number."
        },
        {
          "q": "How would you write structural tests for a model?",
          "a": "Model bugs are unusually hard to catch because a broken model still produces a loss curve, so the tests worth writing are the ones that check STRUCTURE rather than performance. Here is the set I would actually write, ordered by value per line. (1) PARAMETER COUNT. assert the total equals the arithmetic you expect from the architecture. This single assertion catches unregistered submodules - the plain-list bug - accidental weight sharing, duplicated blocks, and a wrong depth or width from a config change. It is the highest-value test in this list and almost nobody writes it. (2) ALL PARAMETERS RECEIVE GRADIENT. Run one forward-backward on random input, then assert every parameter with requires_grad has a non-None .grad and, ideally, a non-zero norm. This catches dead branches, a module called but detached, a forward path that skips a layer under some config, and a frozen-by-accident submodule. When it fails it names the exact parameter, which is far better than a training curve. (3) DEVICE AND DTYPE CONSISTENCY. After model.to(device), assert every parameter and buffer is on that device. This catches unregistered modules from the other direction and catches buffers created as plain attributes. (4) CHECKPOINT ROUND TRIP. Save, construct a fresh model, load with strict=True, and assert the outputs on a fixed input are identical. This catches missing buffers, non-deterministic construction, and any state the model needs that is not in state_dict. It is the test that would have prevented most of the silent-load failures in this lesson. (5) SHAPE CONTRACT. Assert output shape for a couple of representative input shapes, including a batch of one and, for sequence models, a length that is not a nice power of two. (6) train/eval DIFFERENCE. Assert that a model containing dropout produces different outputs across two calls in train mode and identical outputs in eval mode. This directly tests that the mode flag is wired through, and it catches a custom module that ignores self.training. (7) DETERMINISM GIVEN A SEED, for the construction path - same seed, same initial parameters. WHAT I WOULD NOT TEST. Numerical performance on a benchmark, in a unit test - that belongs in a separate, slower evaluation job. And gradient correctness via gradcheck for standard layers, since they are already tested upstream; reserve gradcheck for CUSTOM autograd Functions, where a hand-written backward genuinely can be wrong. THE PRINCIPLE BEHIND THE LIST. Every one of these tests targets a failure that is SILENT - the model still runs and still trains. That is the correct criterion for what deserves a structural test in machine-learning code, and it is a different criterion from ordinary software testing, where most failures are loud. In this module particularly, the abstraction's job is to hide the mechanism, so the tests must check the mechanism directly."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "nn.Module intercepts __setattr__",
        "back": "Parameter -> _parameters, Module -> _modules, register_buffer -> _buffers, ANYTHING ELSE -> plain __dict__ where .parameters()/.to()/.state_dict() cannot see it. Every convenience is a recursive walk over that tree."
      },
      {
        "type": "pitfall",
        "front": "The plain-list bug",
        "back": "self.layers = [nn.Linear(...) for _ in range(6)] leaves them UNREGISTERED: optimizer never sees them, .to() never moves them, state_dict omits them - but forward still CALLS them. A third of the model frozen at init, loss curve looks fine. Use nn.ModuleList."
      },
      {
        "type": "intuition",
        "front": "The cheapest structural test that exists",
        "back": "assert sum(p.numel() for p in model.parameters()) == EXPECTED. Catches unregistered submodules, accidental weight sharing, duplicated blocks, and wrong depth/width from a config change. One line. Almost nobody writes it."
      },
      {
        "type": "pitfall",
        "front": "Forgetting eval() is a CORRECTNESS bug",
        "back": "BatchNorm in train mode (a) normalizes with BATCH statistics, so a prediction depends on what it was batched with, and (b) UPDATES running stats from validation data - permanent contamination that goes into the checkpoint. The reverse (no train()) silently disables regularization."
      },
      {
        "type": "definition",
        "front": "eval() vs no_grad() vs inference_mode()",
        "back": "ORTHOGONAL. eval() = layer BEHAVIOUR (dropout, BN). no_grad() = no GRAPH built (memory). inference_mode() = stronger no_grad (skips version/view tracking; outputs can NEVER re-enter autograd). Need eval WITHOUT no_grad for input gradients (saliency, adversarial)."
      },
      {
        "type": "definition",
        "front": "Buffers",
        "back": "register_buffer = non-learnable state that still moves with .to() and appears in state_dict (BN running stats, positional encodings). persistent=False keeps it OUT of the checkpoint - right for recomputable things like a causal mask."
      },
      {
        "type": "pitfall",
        "front": "Read load_state_dict(strict=False)'s return value",
        "back": "It returns (missing_keys, unexpected_keys) and people discard it. A 'module.' prefix from DDP, an '_orig_mod.' from torch.compile, or a renamed attribute leaves weights at RANDOM INIT and the model still runs. Raise unless the missing keys are an allow-listed new head."
      },
      {
        "type": "intuition",
        "front": "state_dict keys ARE attribute paths",
        "back": "'encoder.layers.3.attn.qkv.weight' is the dotted path from the root. So renaming an attribute invalidates every existing checkpoint for that key - the naming is part of your serialization contract, not an implementation detail."
      },
      {
        "type": "intuition",
        "front": "Weight tying needs no special handling",
        "back": ".parameters() DEDUPLICATES by identity, so assigning the same tensor to two attributes gives one parameter updated once. But note: a parameter COUNT cannot then distinguish intended tying from accidental aliasing - test identity explicitly."
      },
      {
        "type": "pitfall",
        "front": "Shared modules containing BatchNorm",
        "back": "A block called n times shares its running statistics and updates them n times per step from n different activation distributions - usually wrong. LayerNorm has no running state, which is one reason recurrent-depth architectures use it."
      },
      {
        "type": "pitfall",
        "front": "Remove your hooks",
        "back": "A retained forward hook that stores outputs keeps those tensors AND their autograd graph alive - steady memory growth with no other symptom. Detach what you store, use try/finally, and note hooks interact badly with torch.compile and fx."
      },
      {
        "type": "pitfall",
        "front": "Module.to is IN-PLACE; Tensor.to is NOT",
        "back": "model.to(device) mutates and returns self. tensor.to(device) returns a NEW tensor - writing it without assigning does nothing. A genuine asymmetry that follows from a Module being a container and a tensor being a value."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Modules - notes on nn.Module semantics",
        "url": "https://pytorch.org/docs/stable/notes/modules.html"
      },
      {
        "title": "PyTorch: torch.nn.Module API reference",
        "url": "https://pytorch.org/docs/stable/generated/torch.nn.Module.html"
      },
      {
        "title": "PyTorch: torch.nn.utils.parametrize - parametrizations tutorial",
        "url": "https://pytorch.org/tutorials/intermediate/parametrizations.html"
      },
      {
        "title": "Salimans & Kingma (2016), Weight Normalization",
        "url": "https://arxiv.org/abs/1602.07868"
      },
      {
        "title": "Miyato et al. (2018), Spectral Normalization for Generative Adversarial Networks",
        "url": "https://arxiv.org/abs/1802.05957"
      }
    ],
    "demos": [
      "neural-playground",
      "weight-init",
      "batch-norm",
      "backprop"
    ]
  },
  "custom-loss": {
    "level": "core",
    "body": {
      "intuition": [
        "Writing a loss function in PyTorch is writing a differentiable expression - autograd supplies the backward pass for free. That freedom is real, and it hides three things that bite. The composed backward may be numerically unstable even when the forward looks fine. The reduction you chose may be dividing by the wrong number. And some operations you want are not differentiable at all, so autograd will silently hand you a zero gradient rather than an error.",
        "Numerical stability is the one that produces NaN at three in the morning. The pattern is always the same: an expression that is mathematically fine has a derivative that is not. sqrt(x) is perfectly well behaved at zero and its derivative is infinite there, so a distance computed as sqrt of a sum of squares gives NaN the moment two points coincide - which happens the instant your model learns anything. log(p) is fine until p underflows. softmax followed by log overflows on large logits, while the fused log_softmax does not, because it subtracts the max first. The library's fused losses exist precisely because someone already hit each of these, and reaching for the composed version is how you rediscover them.",
        "The reduction question is subtler and more common than it should be. Almost every sequence model computes a masked loss, and almost every first implementation writes loss.mean() over a padded tensor - which divides by the padded length rather than the number of real tokens. The result is a loss that depends on how much padding happened to be in the batch, so an unusually short batch produces a spuriously small loss and a correspondingly small gradient. Nothing errors, training works, and the effective learning rate silently varies with batch composition. That is this module's theme again: the reduction abstraction did something reasonable and the mechanism it hid - what exactly it divided by - is where the bug lives."
      ],
      "math": [
        {
          "h": "The log-sum-exp trick, and why fused losses exist",
          "paras": [
            "Softmax exponentiates, which overflows for logits above about 88 in float32. Subtracting the maximum first is mathematically an identity and numerically the difference between a finite answer and an infinity.",
            "The fused log_softmax also avoids the second problem: taking log of a probability that has underflowed to zero. Computing the two steps separately loses both protections."
          ],
          "tex": "\\log \\sum_i e^{x_i} = m + \\log \\sum_i e^{x_i - m}, \\qquad m = \\max_i x_i \\\\[4pt] \\log \\text{softmax}(x)_j = x_j - m - \\log\\textstyle\\sum_i e^{x_i - m}",
          "texNote": "Read the second line: the fused form never computes a probability at all, so it never underflows to zero and never takes log of it. This is why cross_entropy takes LOGITS rather than probabilities, and why binary_cross_entropy_with_logits exists alongside binary_cross_entropy - passing a sigmoid output to the non-fused version reintroduces exactly the overflow the fused one was written to avoid."
        },
        {
          "h": "Where infinite gradients come from",
          "paras": [
            "The recurring trap: a function that is finite and continuous at a point while its derivative is not. sqrt is the canonical case and norms are how you meet it, because the moment two vectors coincide you differentiate sqrt at zero.",
            "The fix is to move the singularity out of reach with an epsilon INSIDE the square root, not to clamp the result afterwards - clamping the output does nothing to the gradient that produced it."
          ],
          "tex": "\\frac{d}{dx}\\sqrt{x} = \\frac{1}{2\\sqrt{x}} \\;\\xrightarrow{\\;x\\to 0\\;}\\; \\infty, \\qquad \\frac{\\partial}{\\partial u_k}\\lVert u - v\\rVert_2 = \\frac{u_k - v_k}{\\lVert u-v\\rVert_2}",
          "texNote": "So a Euclidean distance loss produces NaN exactly when two points become identical, which is what a metric-learning objective is actively trying to achieve for positive pairs. Use sqrt(x + eps), or work with squared distances and avoid the root entirely - the squared form has a bounded derivative everywhere and usually optimizes the same ordering."
        },
        {
          "h": "Masked reduction: divide by what is real",
          "paras": [
            "The per-element loss is computed with reduction none, multiplied by the mask, and then divided by the number of unmasked elements. Using mean() instead divides by the padded count.",
            "The consequence is that the gradient magnitude depends on the padding fraction, so the effective learning rate varies with batch composition - invisibly."
          ],
          "tex": "\\mathcal{L} = \\frac{\\sum_{i} m_i \\, \\ell_i}{\\sum_i m_i} \\qquad\\text{not}\\qquad \\frac{1}{N}\\sum_i m_i \\, \\ell_i",
          "texNote": "The two agree only when nothing is masked. Note also the interaction with GRADIENT ACCUMULATION: if you accumulate over k micro-batches you must divide by k, and if the micro-batches have different numbers of real tokens then dividing each by its own token count and then by k is subtly not the same as dividing the total loss by the total tokens. For token-level objectives the second is what you want."
        }
      ],
      "code": [
        {
          "h": "The stability rules, as a table you can apply",
          "paras": [
            "Each row is a composed expression that is mathematically correct and numerically wrong, next to the fused operation that exists because of it. Learning the pattern matters more than the list: the danger is always an exp that can overflow or a log that can see zero."
          ],
          "code": "# COMPOSED (unstable)                    FUSED (use this)\n# ---------------------------------------------------------------------\n# log(softmax(x))                         F.log_softmax(x)\n# nll_loss(log(softmax(x)), y)            F.cross_entropy(x, y)       <- LOGITS\n# bce(sigmoid(x), y)                      F.binary_cross_entropy_with_logits\n# log(sigmoid(x))                         F.logsigmoid(x)\n# log(sum(exp(x)))                        torch.logsumexp(x, dim)\n# log(1 + x)  for small x                 torch.log1p(x)\n# exp(x) - 1  for small x                 torch.expm1(x)\n\n# THE SQRT TRAP - the most common NaN in metric learning:\nd = torch.sqrt(((u - v) ** 2).sum(-1))        # NaN when u == v: d/dx sqrt -> inf\nd = torch.sqrt(((u - v) ** 2).sum(-1) + 1e-8) # eps INSIDE the root\nd2 = ((u - v) ** 2).sum(-1)                   # or avoid the root entirely -\n                                              # squared distance is smooth\n                                              # everywhere and usually preserves\n                                              # the ordering you cared about.\n#\n# NOTE: clamping the OUTPUT does nothing. d.clamp(min=1e-8) leaves the\n# gradient of the sqrt that produced it untouched, and that gradient is what\n# is infinite. The epsilon has to be inside.\n\n# DIVISION BY A NORM has the same shape:\nx = x / x.norm(dim=-1, keepdim=True)                     # NaN on a zero vector\nx = x / x.norm(dim=-1, keepdim=True).clamp_min(1e-6)     # bounded\nx = F.normalize(x, dim=-1, eps=1e-12)                    # or just use this",
          "caption": "The pattern beneath the table: every unstable form contains an exp that can overflow or a log that can see zero, and the fused op restructures the algebra so neither happens. The sqrt trap is separate - a finite function with an infinite derivative, and clamping the output cannot fix it."
        },
        {
          "h": "Masked loss, accumulation, and clipping in the right order",
          "paras": [
            "Three things that interact, and the interactions are where the silent bugs are. The order of unscale, clip, and step matters under mixed precision, and the clip function returns a number worth logging."
          ],
          "code": "# MASKED LOSS - divide by real tokens, not padded length.\nper_tok = F.cross_entropy(logits.transpose(1, 2), targets, reduction=\"none\")\nloss = (per_tok * mask).sum() / mask.sum().clamp_min(1)\n#      NOT (per_tok * mask).mean(), which divides by the PADDED count, making\n#      the loss - and hence the gradient scale - depend on how much padding\n#      happened to be in this batch. Nothing errors; your effective learning\n#      rate just varies with batch composition.\n#\n# (Or simply use ignore_index=PAD, which does this correctly for you.)\n\n# GRADIENT ACCUMULATION + CLIPPING + AMP, in the only correct order:\nfor i, batch in enumerate(loader):\n    with torch.autocast(\"cuda\", dtype=torch.bfloat16):\n        loss = compute_loss(batch) / ACCUM        # <-- divide, or the effective\n    scaler.scale(loss).backward()                 #     LR is ACCUM times larger\n    if (i + 1) % ACCUM == 0:\n        scaler.unscale_(opt)                      # 1. UNSCALE first, or you\n                                                  #    clip the scaled gradients\n                                                  #    (i.e. a random threshold)\n        gn = nn.utils.clip_grad_norm_(model.parameters(), 1.0)   # 2. clip\n        scaler.step(opt); scaler.update()         # 3. step\n        opt.zero_grad(set_to_none=True)\n        log(\"grad_norm\", gn)   # <-- clip_grad_norm_ RETURNS the PRE-CLIP norm.\n                               # Log it. It is the single best early-warning\n                               # signal for instability, and it is free.\n\n# WHEN YOU NEED A CUSTOM autograd.Function - and how to know it is right:\nclass STE(torch.autograd.Function):           # straight-through estimator\n    @staticmethod\n    def forward(ctx, x): return (x > 0).float()   # not differentiable\n    @staticmethod\n    def backward(ctx, g): return g                # pretend it was the identity\n\n# ALWAYS gradcheck a hand-written backward, in float64:\ntorch.autograd.gradcheck(MyFn.apply, (x.double().requires_grad_(),))\n# A wrong backward does not crash. The loss still falls, slightly worse, and\n# you will never find it from a training curve.",
          "caption": "Unscale before clipping or you are clipping scaled gradients against a threshold that means nothing. And clip_grad_norm_ returns the pre-clip norm - logging that one number is the cheapest instability warning available."
        }
      ],
      "useCases": [
        "Sequence models with padding, where a correctly masked and correctly normalized loss is the difference between a stable objective and one whose gradient scale drifts with batch composition.",
        "Metric learning, contrastive objectives and anything computing distances, where the sqrt-at-zero trap appears the moment the model succeeds at pulling positive pairs together - the failure arrives precisely when training starts working.",
        "Custom objectives that mix terms - a reconstruction loss plus a KL term plus a regularizer - where relative scaling, per-term logging, and stable formulations for each piece decide whether the combination trains at all.",
        "Quantization-aware training and discrete latent models, where the forward pass is deliberately non-differentiable and a straight-through estimator supplies a surrogate gradient that autograd cannot derive for you."
      ],
      "pitfalls": [
        "Computing log(softmax(x)) or bce(sigmoid(x), y) instead of the fused versions. The composed forms overflow on large logits and take log of underflowed zeros; cross_entropy and binary_cross_entropy_with_logits exist because someone already hit both.",
        "Taking sqrt of something that can be zero. The derivative is infinite there, so a Euclidean distance produces NaN exactly when two points coincide - which is what a contrastive objective is trying to achieve. Put the epsilon INSIDE the root, or use squared distances.",
        "Clamping the output to fix a gradient problem. d.clamp(min=eps) leaves the gradient of the operation that produced d untouched, and that gradient is the infinite one. The stabilizer has to be upstream of the singularity.",
        "Using .mean() on a masked loss. It divides by the padded length rather than the real token count, so the loss and its gradient scale depend on how much padding was in the batch - a silently varying effective learning rate. Divide by mask.sum().",
        "Clipping gradients before unscaling under mixed precision. The gradients still carry the loss scaler's factor, so your clip threshold is being compared against a number that is thousands of times too large and the clip effectively never fires.",
        "Forgetting to divide the loss by the accumulation count. Accumulating k micro-batches without dividing makes the effective learning rate k times larger, which usually presents as divergence a few hundred steps in rather than as an obvious error.",
        "Writing a custom autograd.Function without gradcheck. A wrong backward does not crash - training still proceeds and converges slightly worse, and no training curve will ever reveal it. Check in float64, including at awkward inputs like zeros and boundaries."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/custom-autograd",
          "text": "Where the Function API and the graph mechanics are developed properly. This lesson is the applied side: when the composed backward is not good enough, and how to verify the one you wrote by hand."
        },
        {
          "ref": "training-systems/training-stability",
          "text": "The systems-level treatment of the same failures - loss spikes, NaN recovery, skip-step guards and dynamic loss scaling. The numerical rules here are what stop those failures from being generated in the first place."
        },
        {
          "ref": "training-systems/mixed-precision",
          "text": "Why unscale must precede clipping, and why fp16 makes every stability question in this lesson sharper - a formulation that survives in float32 can underflow in half precision, which is why bf16 is preferred where available."
        },
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "Where anomaly detection and gradient-flow inspection live. The single most useful habit from this lesson - logging the pre-clip gradient norm every step - is a diagnostic that costs nothing and warns before the loss does."
        },
        {
          "ref": "generative/vae",
          "text": "A worked example of a multi-term objective: reconstruction plus KL, with the log-variance parameterization chosen specifically so that exponentiating cannot produce a negative variance and the KL term stays finite."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does cross_entropy take logits rather than probabilities?",
          "a": "So it can fuse log and softmax and use the log-sum-exp trick. Computing softmax then log overflows on large logits and takes log of underflowed zeros."
        },
        {
          "q": "What is the log-sum-exp trick?",
          "a": "log(sum(exp(x))) = m + log(sum(exp(x - m))) with m the maximum. Subtracting the max before exponentiating prevents overflow and is mathematically an identity."
        },
        {
          "q": "Why does sqrt cause NaN?",
          "a": "Its derivative is 1/(2*sqrt(x)), which is infinite at zero. So a Euclidean distance produces NaN exactly when two points coincide."
        },
        {
          "q": "How do you fix the sqrt trap?",
          "a": "Put the epsilon inside the root - sqrt(x + eps) - or use squared distances. Clamping the output does nothing, because the infinite gradient came from the operation upstream."
        },
        {
          "q": "What is wrong with .mean() on a masked loss?",
          "a": "It divides by the padded length instead of the real token count, so the loss and gradient scale depend on how much padding is in the batch. Divide by mask.sum()."
        },
        {
          "q": "Why divide the loss by the accumulation count?",
          "a": "Because gradients accumulate additively. Without it the effective learning rate is k times larger, which usually shows up as divergence a few hundred steps in."
        },
        {
          "q": "Why must you unscale before clipping under AMP?",
          "a": "The gradients still carry the loss scaler's factor, so comparing them against your clip threshold is meaningless and the clip effectively never fires."
        },
        {
          "q": "What does clip_grad_norm_ return?",
          "a": "The total gradient norm BEFORE clipping. Logging it is the cheapest early-warning signal for instability available."
        },
        {
          "q": "What is the difference between clip_grad_norm_ and clip_grad_value_?",
          "a": "Norm clipping rescales all gradients together, preserving their direction. Value clipping clamps each element independently, which changes the direction."
        },
        {
          "q": "When do you need a custom autograd.Function?",
          "a": "When the operation is not differentiable and you want a surrogate gradient, when you can write a numerically better backward than the composed one, or when you want to trade recompute for memory."
        },
        {
          "q": "What is a straight-through estimator?",
          "a": "Use a non-differentiable operation in the forward pass and pretend it was the identity in the backward, so gradients flow through a threshold or a quantizer."
        },
        {
          "q": "Why gradcheck a custom backward?",
          "a": "Because a wrong backward does not crash. Training proceeds, converges slightly worse, and no training curve will reveal it. Check in float64."
        }
      ],
      "standard": [
        {
          "q": "Your loss becomes NaN partway through training. How do you find the cause?",
          "a": "I would localize before theorizing, because there are only a handful of causes and they are quickly distinguished. STEP 1: WHEN AND WHERE. Is it at a specific step, or after a specific batch? Log the loss every step and check whether it spiked before going NaN or jumped straight to it. A spike then NaN suggests instability - an exploding gradient or a bad batch. Immediate NaN suggests a singularity in the loss expression itself. STEP 2: FIND THE FIRST NaN. torch.autograd.set_detect_anomaly(True) makes the backward pass raise at the operation that produced the NaN, with a traceback to where that operation was created in the forward. It is extremely slow, so I would enable it only for a targeted rerun, but it names the culprit directly rather than leaving me to guess. STEP 3: THE USUAL CAUSES, roughly in order. (a) SQRT OR NORM AT ZERO - the derivative is infinite there, so any distance computation NaNs the moment two vectors coincide. This is the most common one in metric learning and it appears exactly when the model starts working. (b) LOG OF ZERO - a probability that underflowed, usually from a hand-composed softmax-then-log rather than the fused log_softmax. (c) DIVISION BY A NORM or a count that can be zero, including a mask that is all-zero for some sequence in the batch. (d) EXPLODING GRADIENTS - the loss was rising before it went NaN, and gradient norm was climbing. (e) fp16 OVERFLOW - values above about 65,000 become inf, then inf minus inf is NaN. Very common in attention logits and in loss terms with large scale. (f) A BAD BATCH - a sample with a NaN or an extreme value in the input. STEP 4: THE CHEAP CHECKS that distinguish them. Log the gradient norm every step - clip_grad_norm_ returns it for free - and look at its trajectory before the failure. If it was climbing, the cause is (d) or (e). If it was flat and then NaN appeared instantly, the cause is a singularity, (a) to (c). Check the inputs with torch.isfinite on the batch. And check whether it reproduces with the same seed and the same batch, which distinguishes a data problem from an accumulation problem. STEP 5: THE FIXES, matched to the cause. Epsilon inside the sqrt rather than clamping the output; fused losses instead of composed ones; clamp_min on any denominator; gradient clipping with the unscale-then-clip order under AMP; and a skip-step guard that checks torch.isfinite on the gradients before opt.step, so one bad batch does not poison every weight. THE PREVENTION I WOULD ARGUE FOR. Most of this is avoidable by construction: use the fused losses, never take a bare sqrt, and log the gradient norm from the first day. The gradient-norm log in particular converts this whole investigation into a glance at a chart, because instability is visible in it many steps before the loss shows anything.",
          "deepDive": {
            "q": "Explain what makes fp16 so much more fragile than bf16 here, and what changes.",
            "a": "THE FORMATS. Both are 16 bits. fp16 spends 5 bits on the exponent and 10 on the mantissa; bf16 spends 8 on the exponent and 7 on the mantissa. bf16's exponent field is the SAME WIDTH as fp32's, so it has the same dynamic range - roughly 1e-38 to 3e38 - with less precision. fp16's range is roughly 6e-8 to 65504. THE CONSEQUENCE FOR OVERFLOW. In fp16, anything above 65504 becomes inf. Attention logits before the softmax, a squared-error loss on unnormalized targets, a sum over a long sequence - all of these routinely exceed that. And once you have an inf, the next subtraction produces NaN, which then propagates through every parameter it touches on the backward pass. In bf16 this simply does not happen, because the range matches fp32. THE CONSEQUENCE FOR UNDERFLOW, which is the subtler half. Gradients in fp16 that fall below about 6e-8 flush to zero, and a large fraction of gradients in a trained network are that small. Those parameters then receive no update at all. This is why fp16 training REQUIRES loss scaling: multiply the loss by a large factor so the gradients land in representable range, then unscale before the optimizer step. bf16 has enough range that loss scaling is unnecessary, which removes an entire subsystem - the scaler, its dynamic adjustment, the skipped steps when it overflows, and the unscale-before-clip ordering requirement. WHAT bf16 COSTS. Precision: 7 mantissa bits versus 10, so roughly 3 fewer bits of relative accuracy per value. In practice this matters far less than the range does, because neural network training is remarkably tolerant of noise in individual values and intolerant of infinities. The one place it does matter is accumulation: summing many bf16 values loses precision quickly, which is why reductions and the master weights are kept in fp32 regardless of the compute dtype. THE PRACTICAL RULES THAT FOLLOW. On hardware supporting bf16 - Ampere and later, and TPUs - use bf16 and delete the GradScaler. On older hardware you are stuck with fp16 and need loss scaling, and then the ordering discipline in this lesson becomes load-bearing: unscale before clipping, check for inf before stepping, and expect the scaler to skip steps occasionally, which is normal behaviour rather than a bug. AND THE PART PEOPLE MISS: autocast does not cast everything. It keeps a list of operations that must stay in fp32 - softmax, layer norm, reductions, and the loss functions - precisely because those are where the range and accumulation problems concentrate. So a hand-written loss inside an autocast region may run in a dtype you did not intend, and if you have written your own numerically delicate operation you may need to force it to fp32 explicitly. That is a real and under-documented source of instability in custom objectives."
          }
        },
        {
          "q": "Explain gradient clipping - the variants, where it goes, and how you would tune it.",
          "a": "WHY IT EXISTS. Gradient magnitudes in deep networks are heavy-tailed: most steps are ordinary and occasionally one batch produces a gradient orders of magnitude larger, which takes a step so large it destroys the parameters. Pascanu et al. introduced clipping for exactly this in RNNs, where the recurrent Jacobian's repeated multiplication makes the tail especially heavy. It is a simple, effective guard and it is standard in essentially all transformer training. THE TWO VARIANTS, and the difference matters. NORM CLIPPING computes the global L2 norm across all parameters and, if it exceeds a threshold, rescales EVERY gradient by the same factor. The direction is preserved exactly; only the step length is capped. VALUE CLIPPING clamps each element independently to a range, which CHANGES THE DIRECTION - a gradient with one huge component and many small ones becomes a different direction after clamping. Norm clipping is almost always what you want, and it is what people mean by gradient clipping without qualification. Value clipping is occasionally used as a crude safety net. THE ORDERING, which is where the bugs are. The sequence is backward, then unscale if using a GradScaler, then clip, then step. Two mistakes are common. Clipping before unscaling means your threshold is compared against gradients still multiplied by the loss scale - typically tens of thousands - so the clip never fires and you have silently disabled it. And clipping after the optimizer step obviously does nothing, but it is easy to write in a refactor and produces no error. Under gradient accumulation, clip once before the step, not per micro-batch. HOW I WOULD TUNE THE THRESHOLD. Not by guessing - by measuring. clip_grad_norm_ RETURNS the pre-clip norm, so log it from the first run and look at its distribution. Then set the threshold somewhere around the high percentile of the normal range, so it clips the tail and leaves the body alone. A threshold of 1.0 is the common default and it is a default rather than a principle: if your typical gradient norm is 0.05, a threshold of 1.0 never fires and you have no protection; if it is 40, a threshold of 1.0 clips every step and you have effectively replaced your optimizer with sign-like normalized steps. I would also log the CLIP FRACTION - what proportion of steps are being clipped. Near zero means it is doing nothing; near one means it is dominating your update rule. Somewhere in the low percentage range is the intent. WHAT CLIPPING DOES NOT FIX. It bounds the damage from an exploding gradient; it does not address the cause. If gradients are exploding every step, the problem is a learning rate that is too high, a bad initialization, a missing normalization layer, or a numerically unstable loss - and clipping will mask that while training slowly and badly. So a rising clip fraction is a signal to investigate rather than a sign the guard is working. THE HABIT I WOULD RECOMMEND. Log gradient norm and clip fraction every step, permanently. They cost nothing, they are the earliest visible symptom of most training instabilities, and they turn 'the loss went NaN' into 'the gradient norm had been climbing for two hundred steps'."
        },
        {
          "q": "When should you write a custom autograd.Function rather than composing operations?",
          "a": "Autograd composes backwards automatically and correctly, so the default answer is do not. There are four real reasons to override it. REASON 1: THE FORWARD IS NOT DIFFERENTIABLE and you want a surrogate gradient. Thresholding, argmax, rounding, quantization, sampling from a discrete distribution - autograd will give you zero or nothing. A straight-through estimator does the discrete thing forward and passes the gradient through as if it were the identity, which is what makes quantization-aware training and discrete latent variable models trainable. This is the most common legitimate reason. REASON 2: A NUMERICALLY BETTER BACKWARD EXISTS. The composed backward differentiates each primitive and multiplies, which can be less stable than the analytic derivative of the whole expression. The library's fused losses are exactly this - log_softmax's backward is a clean subtraction rather than a chain through an exp that may have overflowed. If you have derived a closed form that avoids a cancellation or a singularity the composition hits, that is worth implementing. REASON 3: MEMORY. Autograd saves whatever the backward needs, which for a long chain of cheap operations can be many intermediate tensors. A custom Function can save only the inputs and RECOMPUTE the intermediates in backward, trading compute for memory. That is exactly what gradient checkpointing does, generalized. Also useful when you can express the backward in terms of the OUTPUT rather than the intermediates - a common trick that halves what needs saving. REASON 4: WRAPPING A NON-PYTORCH OPERATION - a custom CUDA kernel, a call into another library, a numerical solver - where there is no graph to compose and you must supply the derivative yourself. Implicit differentiation of an optimization problem's solution lives here too. WHAT IT COSTS, and why the default should be no. You now own correctness. A wrong backward does not crash: training proceeds, converges a little worse, and no training curve will ever tell you. You also lose composability with some parts of the stack - fx tracing, torch.compile, and some vmap and functorch transforms need extra work or setup_context to handle a custom Function. THE DISCIPLINE IF YOU DO IT. gradcheck in float64, always, and at awkward inputs - zeros, boundaries, values where a branch changes - not just at a random point where any smooth wrong function might pass. gradgradcheck if second derivatives will be taken. Save only what you need with ctx.save_for_backward, since saving the output and the input both is a common way to double memory unnecessarily. And return exactly one gradient per forward input, with None for the ones that do not need it - a shape mismatch here is a confusing error. THE ONE-LINE SUMMARY. Write a custom Function when autograd cannot express what you need or expresses it badly, and treat the hand-written backward as code that requires a test, because it is the one part of a training pipeline whose failure is completely invisible.",
          "deepDive": {
            "q": "Walk through implementing a straight-through estimator for quantization, and what its gradient is actually doing.",
            "a": "THE SETUP. Quantization-aware training wants the forward pass to use quantized weights - so the network experiences the error it will experience at deployment - while the optimizer updates full-precision weights. The quantizer is a rounding operation, whose derivative is zero almost everywhere and undefined at the step boundaries. Backpropagating through it honestly gives zero gradient everywhere, and nothing learns. THE IMPLEMENTATION. Forward: q = round(clamp(x / s, qmin, qmax)) * s for a scale s. Backward: return the incoming gradient unchanged for inputs inside the clamp range, and ZERO for inputs outside it. That second part is important and is often omitted. The naive straight-through estimator passes the gradient through unconditionally; the clipped version - sometimes called the clipped STE - zeroes the gradient where the input was saturated, which is correct in the sense that moving a weight further into the saturated region genuinely changes nothing in the forward pass. Omitting it means saturated weights keep receiving gradient telling them to move further out, and they drift arbitrarily far while having no effect. WHAT THE GRADIENT ACTUALLY IS. It is not the derivative of anything. Pretending round is the identity means we are computing the gradient of a DIFFERENT function - the one without quantization - and applying it to update the parameters of the one with it. So the STE is a biased estimator, deliberately. The justification is empirical and partly theoretical: the quantization error behaves somewhat like noise, and the gradient of the un-quantized function is a reasonable descent direction for the quantized one when the quantization is fine enough. The bias grows as the bit width falls, which is exactly why very low-bit training is harder and needs additional tricks. Bengio et al. introduced it for stochastic neurons and it has been reinvented in every discrete-latent setting since. THE VARIANTS WORTH KNOWING. The scale s can itself be learned, which requires a gradient through the quantizer with respect to the scale - LSQ derives this properly and it is a genuine improvement over a fixed or calibrated scale. And Gumbel-softmax is the alternative philosophy: instead of a biased gradient through a hard operation, relax the operation to a continuous one, get an unbiased gradient of the relaxed objective, and anneal the temperature. Bias in the gradient versus bias in the objective - that is the real choice, and it is the same trade as score-function versus reparameterized estimators. HOW I WOULD VERIFY IT. gradcheck will FAIL, correctly, because the implemented backward is deliberately not the true derivative. So the test is different: assert that the forward output is exactly the quantized value, that the backward returns the incoming gradient unchanged inside the range and zero outside, and that a small training run on a toy problem converges to something close to the full-precision result. That is a case where the usual verification tool does not apply and you have to state what correctness means for yourself - which is worth recognizing, because reaching for gradcheck and being confused when it fails is the common experience here."
          }
        },
        {
          "q": "How do you correctly implement a masked loss for variable-length sequences?",
          "a": "THE REQUIREMENT. Padded positions must contribute nothing to the loss and nothing to the gradient, and the normalization must be by the number of REAL elements. Both halves matter and the second is the one usually got wrong. THE TWO CORRECT APPROACHES. (1) IGNORE_INDEX, which is the simplest and what I would use by default. Set padded target positions to a sentinel and pass ignore_index to cross_entropy. It excludes them from both the sum and the count, so the normalization is automatically by real tokens. Fewer moving parts, harder to get wrong. (2) EXPLICIT MASKING: compute per-element loss with reduction='none', multiply by the mask, sum, and divide by mask.sum(). Necessary when the loss is custom or when you need per-sequence weighting. THE MISTAKE, which is extremely common: (per_token_loss * mask).mean(). That sums the masked losses and divides by the TOTAL number of elements including padding. So a batch that happens to contain short sequences has a lot of padding, the divisor is too large, and the loss - and therefore the gradient magnitude - is spuriously small. The effective learning rate now varies with batch composition, invisibly. Nothing errors and training works; it just works worse and inconsistently. THE SECOND-ORDER QUESTION, which is a genuine design decision rather than a bug: normalize per TOKEN or per SEQUENCE? Dividing the whole batch's masked sum by the total real token count weights every token equally, so long sequences contribute more to the update. Computing a per-sequence mean first and then averaging over sequences weights every sequence equally regardless of length. These give different models. For language modelling, per-token is standard and correct, because the objective is per-token likelihood. For a classification-like task with one label per sequence, per-sequence is right. State which one you intend, because both are defensible and the difference is invisible in the loss value. THE INTERACTION WITH GRADIENT ACCUMULATION, which is subtle. If you accumulate k micro-batches, each normalized by its own token count, and then divide by k, you have computed the average of per-micro-batch averages - which is NOT the same as the average over all tokens unless every micro-batch has the same real-token count. For token-level objectives the correct thing is to accumulate the SUM of losses and the SUM of token counts across micro-batches and divide once at the end. Most implementations do the approximate version and it is usually fine, but it is worth knowing it is an approximation, and it matters more when sequence lengths vary a lot. THE OTHER MASKING that must match: the ATTENTION mask. A loss mask without a matching attention mask means the model attends to padding - it learns to use garbage positions, and the failure is a quality degradation with no error. The two masks are related but not identical, since causal masking and padding masking compose. THE CHECK I WOULD WRITE. Construct a batch, compute the loss, then compute it again with different amounts of padding on the same real content and assert the values match to floating-point tolerance. That single test catches every normalization error in this answer, and it takes ten lines."
        },
        {
          "q": "What is the difference between detach, no_grad, and .data - and when do you use each?",
          "a": "detach() RETURNS A NEW TENSOR sharing the same storage but disconnected from the graph. Operations on the original still record; the detached one is a leaf with requires_grad False. Use it when you want a VALUE from the graph without the gradient path: logging a loss, storing an activation, computing a target for a self-supervised objective, or stopping gradient in one branch of a two-branch architecture. The stop-gradient in BYOL and in SimSiam is literally a detach, and it is load-bearing there rather than incidental - removing it collapses the model. torch.no_grad() IS A CONTEXT that disables graph construction entirely for everything inside it. Use it for inference, for validation, and for any computation whose result will never need gradients - updating an EMA teacher, computing a metric, or modifying parameters in place. The difference from detach is scope: detach is per-tensor and surgical, no_grad is per-region and wholesale. .data IS LEGACY AND SHOULD NOT BE USED. It returns a tensor sharing storage with requires_grad stripped, similar to detach, but it BYPASSES autograd's version counter - the mechanism that detects when a tensor needed for backward has been modified in place. So mutating through .data can silently produce wrong gradients, where the same mutation through detach would raise a clear error telling you the tensor was modified. It exists for backward compatibility, it is a footgun, and detach does the same job safely. If you see .data in code, it is either very old or a bug waiting. THE ONES PEOPLE CONFUSE. detach() versus no_grad(): if you want the whole block cheap, use no_grad, because detach still builds the graph up to the point you detach and pays the memory for it. Conversely, no_grad inside a training step disables gradients for everything, including things you needed. requires_grad_(False) versus detach(): the first FREEZES a parameter permanently for the optimizer, the second cuts a single tensor out of one graph. Freezing a backbone is requires_grad_(False); stopping gradient flow through one path in the forward is detach. inference_mode() versus no_grad(): the former is faster and marks its outputs so they can never re-enter autograd at all, which is right for serving and wrong if the results feed anything differentiable. THE PLACES THIS MATTERS MOST. Accumulating metrics: appending loss rather than loss.item() or loss.detach() to a list keeps the entire graph alive for every step, which is the classic memory leak in training loops and presents as steadily growing memory with no other symptom. EMA teacher updates: must be under no_grad, and the update is in-place on parameters. Two-branch self-supervised architectures: the detach is the method, not an optimization. And target networks in reinforcement learning: the bootstrap target must be detached, or you are differentiating through your own target, which is the moving-target instability."
        },
        {
          "q": "You have a loss with three terms. How do you weight and monitor them?",
          "a": "THE FIRST THING I WOULD DO IS LOG THEM SEPARATELY, before touching any weights. A combined loss tells you almost nothing: it can fall while one term rises, one term can be three orders of magnitude larger and dominate everything, and a term can be silently zero because of a bug. Logging each term - and each term's contribution AFTER weighting - takes three lines and it is the difference between tuning and guessing. I have seen a great deal of time spent tuning weights on a term that was zero because a mask was wrong. THE SCALE PROBLEM. Terms usually have wildly different natural magnitudes: a reconstruction MSE over many pixels versus a KL over a few latent dimensions versus a regularizer. The weight you choose is doing two jobs at once - correcting for scale, and expressing a genuine preference about the trade-off - and conflating them makes the hyperparameter uninterpretable and non-transferable. I would normalize each term to a comparable scale first, for example by dividing by its number of elements or by its value at initialization, and only then apply preference weights. Then a weight of 1.0 means something. HOW I WOULD SET THE WEIGHTS. (1) Start from the scale-normalized version with all weights at one and look at what happens. (2) Sweep the most important weight over a log grid, since these are scale parameters and a linear sweep wastes most of its points. (3) Check the PARETO behaviour rather than only the combined number - plot term A against term B across the sweep, because the combined loss hides whether you are trading or improving both. (4) Be suspicious of weights tuned to three significant figures; if performance is that sensitive, something else is wrong. THE ALTERNATIVES TO HAND-TUNING, worth knowing. Uncertainty weighting learns a per-task weight parameterized as a log-variance, so the model down-weights terms it cannot fit - principled, one extra parameter per term, and it works well for genuinely multi-task losses. GradNorm balances weights so each term's gradient magnitude is comparable. And for a constrained problem - minimize A subject to B below a threshold - a Lagrangian formulation with a learned multiplier is often much better than a fixed weight, because the multiplier adapts to keep the constraint satisfied rather than requiring you to know the right trade-off in advance. Beta-VAE's KL weighting and the KL-constrained RLHF objective are both instances of this. WHAT I WOULD MONITOR THROUGHOUT. Each term's raw value, each term's weighted contribution, and the GRADIENT NORM CONTRIBUTED BY EACH TERM - which is the one people never log and is the most informative, because a term can have a small value and a large gradient. Computing it costs one backward per term, so I would do it occasionally rather than every step. If one term supplies 95% of the gradient, that term is your objective and the others are decoration, regardless of what the weights say. THE FAILURE MODE TO WATCH FOR. A term that gets driven to zero early and then contributes nothing - posterior collapse in a VAE is exactly this, and the standard responses are KL annealing or a free-bits floor. If a term's value flatlines at its minimum, the optimization has found a degenerate solution to it and the weight will not fix that."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Log-sum-exp trick",
        "back": "log(sum(exp(x))) = m + log(sum(exp(x-m))), m = max(x). Mathematically an identity, numerically the difference between finite and inf. It is why cross_entropy takes LOGITS - the fused form never materializes a probability, so it never takes log of an underflowed zero."
      },
      {
        "type": "pitfall",
        "front": "The sqrt trap",
        "back": "d/dx sqrt(x) = 1/(2 sqrt(x)) -> INFINITE at 0. A Euclidean distance NaNs exactly when two points coincide - which is what contrastive learning is trying to achieve. Fix: eps INSIDE the root, or use squared distances."
      },
      {
        "type": "pitfall",
        "front": "Clamping the output cannot fix a gradient",
        "back": "d.clamp(min=eps) leaves untouched the gradient of the operation that PRODUCED d - and that is the infinite one. The stabilizer must be UPSTREAM of the singularity."
      },
      {
        "type": "formula",
        "front": "Masked loss normalization",
        "back": "L = sum(m*l) / sum(m), NOT (m*l).mean(). The wrong version divides by the PADDED count, so loss and gradient scale depend on how much padding was in the batch - a silently varying effective learning rate. Or just use ignore_index."
      },
      {
        "type": "intuition",
        "front": "Per-token vs per-sequence normalization",
        "back": "Dividing by total real tokens weights every TOKEN equally (long sequences contribute more). Per-sequence mean then averaged weights every SEQUENCE equally. Both defensible, they give different models, and the difference is invisible in the loss value. State which you intend."
      },
      {
        "type": "pitfall",
        "front": "AMP ordering: unscale -> clip -> step",
        "back": "Clip before unscaling and your threshold is compared against gradients still carrying the loss scale (tens of thousands), so the clip NEVER FIRES and you have silently disabled it. Under accumulation, clip once before the step, not per micro-batch."
      },
      {
        "type": "intuition",
        "front": "clip_grad_norm_ returns the PRE-CLIP norm",
        "back": "Log it every step - the cheapest early-warning signal for instability, visible hundreds of steps before the loss moves. Also log the CLIP FRACTION: ~0 means the guard does nothing; ~1 means clipping has replaced your optimizer with normalized steps."
      },
      {
        "type": "definition",
        "front": "Norm clipping vs value clipping",
        "back": "NORM: rescales all gradients by one factor, so DIRECTION IS PRESERVED and only step length is capped. VALUE: clamps elements independently, which CHANGES the direction. Norm clipping is what people mean by 'gradient clipping' unqualified."
      },
      {
        "type": "intuition",
        "front": "fp16 vs bf16",
        "back": "bf16 has fp32's EXPONENT WIDTH, so the same range with less precision - no overflow above 65504, and NO LOSS SCALING NEEDED. fp16 needs a GradScaler because gradients below ~6e-8 flush to zero. Range matters far more than precision in training."
      },
      {
        "type": "pitfall",
        "front": "gradcheck any hand-written backward",
        "back": "A wrong backward does NOT crash - training proceeds, converges slightly worse, and no curve reveals it. Check in float64 at AWKWARD inputs (zeros, boundaries), not a random smooth point. Note a straight-through estimator will fail gradcheck BY DESIGN."
      },
      {
        "type": "definition",
        "front": "detach vs no_grad vs .data",
        "back": "detach(): per-tensor, surgical, cuts one path (BYOL/SimSiam's stop-grad IS this). no_grad(): per-region, no graph built at all. .data: LEGACY - bypasses the version counter, so in-place mutation through it silently corrupts gradients. Never use it."
      },
      {
        "type": "intuition",
        "front": "Log each loss term's GRADIENT norm, not just its value",
        "back": "A term can have a small value and a large gradient. If one term supplies 95% of the gradient, that term IS your objective regardless of what the weights say. Also normalize terms to comparable scale BEFORE applying preference weights, or the weight is doing two jobs."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Autograd mechanics",
        "url": "https://pytorch.org/docs/stable/notes/autograd.html"
      },
      {
        "title": "PyTorch: Extending PyTorch - custom autograd Functions",
        "url": "https://pytorch.org/docs/stable/notes/extending.html"
      },
      {
        "title": "Pascanu, Mikolov & Bengio (2013), On the Difficulty of Training Recurrent Neural Networks",
        "url": "https://arxiv.org/abs/1211.5063"
      },
      {
        "title": "Bengio, Leonard & Courville (2013), Estimating or Propagating Gradients Through Stochastic Neurons",
        "url": "https://arxiv.org/abs/1308.3432"
      },
      {
        "title": "Gulrajani et al. (2017), Improved Training of Wasserstein GANs (gradient penalty)",
        "url": "https://arxiv.org/abs/1704.00028"
      }
    ],
    "demos": [
      "backprop",
      "gradient-clipping",
      "optimizers",
      "activations"
    ]
  },
  "torchscript": {
    "level": "core",
    "body": {
      "intuition": [
        "Eager PyTorch is a Python program. That is its great virtue - you can print, branch, debug, and use any library - and it is exactly what you cannot ship to a production server that must not run a Python interpreter, or to a mobile device, or into a C++ service. TorchScript is the answer to that: a statically-typed subset of Python with its own intermediate representation, serializable to a single file, and executable by LibTorch with no Python at all. Getting a model into it means confronting a fact eager mode works hard to hide - that your model is a PROGRAM, not a graph, and the two are not the same thing.",
        "There are two ways across and they fail in opposite ways. TRACING runs your model on an example input and records the operations that actually executed. It handles almost any Python because it never reads your code - and that is the problem: it records the TRACE, not the PROGRAM. Any data-dependent branch is resolved once, at trace time, and baked in. A model with an if on a tensor value is silently frozen into whichever branch that example took, and the exported artifact confidently computes the wrong thing for every input that should have taken the other one. Some cases emit a TracerWarning; shape specialization often does not. SCRIPTING instead compiles your source, so control flow survives - at the cost of only accepting a typed subset of Python, which means annotations, homogeneous containers, and no arbitrary objects.",
        "This is the module's theme with an unusually sharp edge, because the failure is not just silent, it is silent in the ARTIFACT you deploy rather than in the code you test. And there is a second honesty owed here. TorchScript is in maintenance mode. It is still widely deployed, still the thing you will meet in existing systems, and still the shortest path into LibTorch - but the direction PyTorch is investing in is torch.export with AOTInductor and ExecuTorch for deployment, and torch.compile for training. So learn TorchScript because you will encounter it and because its tracing-versus-scripting distinction is the conceptual foundation for everything that followed, and start new export work by looking at torch.export first."
      ],
      "math": [
        {
          "h": "What tracing actually captures",
          "paras": [
            "Tracing evaluates your function at one point and records the operations that ran. Formally it captures the restriction of f to the single control-flow path that the example input selected - not f itself.",
            "So tracing is exact if and only if your model's execution path does not depend on the values or the shapes of its inputs."
          ],
          "tex": "\\mathrm{trace}(f, x_0) = f\\big|_{\\,\\Pi(x_0)}, \\qquad \\Pi(x_0) = \\text{the branch path taken at } x_0 \\\\[4pt] \\mathrm{trace}(f,x_0)(x) = f(x) \\iff \\Pi(x) = \\Pi(x_0)",
          "texNote": "Read the condition literally: the trace is correct only on inputs that take the SAME path. That covers a great many models - a fixed stack of layers has one path - and it excludes anything with a data-dependent branch, a loop whose count depends on the input, or an early exit. The dangerous part is that violating the condition produces a wrong answer rather than an error."
        },
        {
          "h": "Scripting compiles the source into a typed IR",
          "paras": [
            "Scripting reads your Python and compiles it, so branches and loops become branches and loops in the IR. The price is a type system: every value needs a static type, and the default for an unannotated argument is Tensor.",
            "That default is the single most common scripting error - a function taking an int or a list is assumed to take a Tensor and fails at compile time with a message about the wrong type."
          ],
          "tex": "\\text{Python source} \\;\\xrightarrow{\\;\\text{compile}\\;}\\; \\text{typed IR}, \\qquad \\tau \\in \\{\\text{Tensor}, \\text{int}, \\text{float}, \\text{bool}, \\text{List}[\\tau], \\text{Dict}[\\tau,\\tau], \\text{Optional}[\\tau], \\ldots\\}",
          "texNote": "Containers must be HOMOGENEOUS - List[int] is fine, a list mixing ints and tensors is not - and Optional requires explicit refinement, meaning you must check for None in a way the compiler can see before using the value. These constraints are why scripting a research codebase is real work: the code is usually valid Python and not valid typed Python."
        },
        {
          "h": "Freezing as partial evaluation",
          "paras": [
            "After scripting or tracing an eval-mode module, freezing inlines the parameters as constants and folds everything that can be computed from them. It is partial evaluation of the program with the weights known.",
            "This is what enables optimizations that are unavailable while the weights are still mutable attributes - constant folding, dead-code elimination of training-only branches, and fusing a BatchNorm into the preceding convolution."
          ],
          "tex": "\\text{freeze}: \\; g(\\theta, x) \\;\\longmapsto\\; g_{\\theta}(x) \\quad \\text{with } \\theta \\text{ folded in and } \\text{training-only paths pruned}",
          "texNote": "The consequence is that a frozen module is deployment-only: parameters are no longer separately addressable, you cannot load a new state_dict into it, and the training branches are gone. Freeze as the last step of an export pipeline, never as something you keep around and expect to update."
        }
      ],
      "code": [
        {
          "h": "The tracing trap, and the verification that catches it",
          "paras": [
            "The canonical failure in three lines. What matters is not the example but the habit that follows it: an export is not done until you have checked it against eager on inputs that exercise every path and several shapes."
          ],
          "code": "class Dynamic(nn.Module):\n    def forward(self, x):\n        if x.sum() > 0:          # <-- DATA-DEPENDENT BRANCH\n            return x * 2\n        return x - 1\n\nt = torch.jit.trace(Dynamic(), torch.ones(3))   # traces the POSITIVE branch\nt(torch.ones(3))     # 2, 2, 2   correct\nt(-torch.ones(3))    # -2,-2,-2  WRONG - eager gives -2,-2,-2? no: -1-1 = -2...\n#                       eager returns x-1 = -2; the trace returns x*2 = -2.\n#                       They agree BY COINCIDENCE here, which is exactly how\n#                       this bug survives a casual check. Use asymmetric values.\n\n# SCRIPTING KEEPS THE BRANCH:\ns = torch.jit.script(Dynamic())\ns(-torch.ones(3))    # correct - the `if` is compiled into the IR\n\n# THE VERIFICATION THAT IS NOT OPTIONAL:\ndef verify(eager, exported, inputs):\n    eager.eval(); exported.eval()\n    for x in inputs:\n        a, b = eager(x), exported(x)\n        assert torch.allclose(a, b, atol=1e-5), f\"MISMATCH on shape {tuple(x.shape)}\"\n\nverify(model, traced, [\n    torch.randn(1, 3, 224, 224),      # different BATCH sizes - tracing\n    torch.randn(8, 3, 224, 224),      # specializes on shape silently\n    torch.randn(1, 3, 256, 256),      # different spatial size\n    torch.full((4, 10), -5.0),        # inputs that take the OTHER branch\n])\n# Test every branch and several shapes. A single-input check passes for a\n# model that is completely broken for half its inputs.",
          "caption": "Note the coincidence in the comment: the two branches happened to agree on that input, which is precisely how a baked-in branch survives a casual check. Verification needs inputs chosen to exercise different paths and different shapes, not one convenient example."
        },
        {
          "h": "Scripting in practice: annotations, mixing, and freezing",
          "paras": [
            "Scripting a real model is mostly a typing exercise. The mixing rule is the practical escape hatch: script the parts with control flow, trace the parts that are awkward to type, and compose them."
          ],
          "code": "class Net(nn.Module):\n    def __init__(self, layers: nn.ModuleList, use_aux: bool):\n        super().__init__()\n        self.layers = layers\n        self.use_aux: bool = use_aux          # annotate, or it becomes a Tensor\n\n    def forward(self, x: torch.Tensor,\n                mask: Optional[torch.Tensor] = None) -> torch.Tensor:\n        #        ^^^^^^^^ UNANNOTATED ARGS DEFAULT TO Tensor - the single most\n        #        common scripting error. An int, a bool, or a list must be said.\n        if mask is not None:                  # explicit refinement: the compiler\n            x = x * mask                      # needs to SEE the None check\n        for layer in self.layers:             # ModuleList iteration is supported;\n            x = layer(x)                      # a plain list would not be\n        return x\n\nscripted = torch.jit.script(Net(...))\n\n# MIXING is the practical answer for real models:\n#   - script the module that has the control flow\n#   - trace the submodules that are painful to type (third-party layers,\n#     anything using numpy or arbitrary Python objects)\n#   - a scripted module can CALL a traced one, and vice versa\nclass Wrapper(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.backbone = torch.jit.trace(third_party_net, example)  # no branches\n    def forward(self, x, n: int):\n        for _ in range(n):                     # real control flow, so SCRIPT\n            x = self.backbone(x)\n        return x\nfinal = torch.jit.script(Wrapper())\n\n# FREEZE LAST, for deployment only:\nfrozen = torch.jit.freeze(scripted.eval())    # inlines weights as constants,\n                                              # folds constants, prunes\n                                              # training-only branches, allows\n                                              # conv-BN fusion.\n# After freezing you cannot load a new state_dict - parameters are gone as\n# separately addressable attributes. It is the last step, not a checkpoint.\nfrozen.save(\"model.pt\")     # loadable from C++ with torch::jit::load, no Python",
          "caption": "Unannotated arguments default to Tensor, which is the error people hit first. The mixing pattern is what makes scripting tractable on real code: script the control flow, trace the awkward leaves, and compose them."
        }
      ],
      "useCases": [
        "Deploying into a C++ service or any environment that must not run a Python interpreter - a saved TorchScript archive is loaded by LibTorch with torch::jit::load and needs nothing from your training environment.",
        "Mobile and embedded inference, historically via PyTorch Mobile, where the absence of a Python runtime is a hard constraint rather than a performance preference.",
        "Removing the GIL from a serving path, since a scripted module executes without holding it - which is what allows genuine multi-threaded request handling in a single process rather than one process per worker.",
        "Locking a model into a self-contained artifact for reproducibility or handover: the archive carries the code and the weights together, so it cannot silently drift when the surrounding Python package is upgraded."
      ],
      "pitfalls": [
        "Tracing a model with data-dependent control flow. The trace records the branch your example happened to take and bakes it in, so the exported artifact confidently computes the wrong thing for every input that should have gone the other way. Script anything with an if or a data-dependent loop.",
        "Verifying an export on a single input. A model that is broken for half its inputs passes that check, and branches can coincidentally agree on convenient values. Verify across several shapes and inputs chosen to exercise each path.",
        "Ignoring TracerWarning. It is emitted precisely when the tracer notices a tensor value being converted to a Python number or used in control flow, which is the signature of the problem above. It is a warning that should be treated as an error.",
        "Forgetting that tracing specializes on shape. Many traces work only for the batch size and spatial dimensions used at trace time, and this is often silent rather than warned. Test other shapes explicitly, and use dynamic-shape support deliberately if you need it.",
        "Leaving arguments unannotated when scripting. Anything without an annotation is assumed to be a Tensor, so an int, bool or list argument fails to compile with a message about types that reads as unrelated to the actual mistake.",
        "Freezing before you are finished. Freezing inlines the weights as constants, so parameters are no longer separately addressable and you cannot load a new state_dict. It is the last step of an export pipeline, not an intermediate artifact.",
        "Assuming the exported model is faster. TorchScript's optimizer does some fusion, and the main reason to use it is removing the Python runtime rather than raw speed. If throughput is the goal, measure - and look at torch.compile or a dedicated inference runtime instead."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/torch-fx",
          "text": "The same tracing-versus-source distinction one level up. fx traces symbolically to produce a Python-level graph you can rewrite, and it hits exactly the same wall on data-dependent control flow - which is why torch.compile's Dynamo, which handles it by breaking the graph, superseded both."
        },
        {
          "ref": "mlops/torchscript-onnx",
          "text": "The deployment-side treatment: what an exported artifact means operationally, how ONNX compares as a target, and where torch.export and ExecuTorch fit as the direction the ecosystem is moving."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The training-side successor. Dynamo captures graphs from real Python bytecode and simply BREAKS the graph at anything it cannot handle, which is why it works on code that scripting rejects and tracing silently corrupts."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "Post-training quantization historically ran on scripted or fx-traced graphs, because quantization is a graph rewrite - you need a data structure to insert observers into, and a Python program is not one."
        },
        {
          "ref": "pytorch-internals/nn-module-patterns",
          "text": "Why scripting can iterate an nn.ModuleList and not a plain Python list of modules: the registration mechanism is what makes the structure visible to the compiler, exactly as it makes it visible to the optimizer."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is TorchScript?",
          "a": "A statically-typed subset of Python with its own IR, serializable to a single archive and executable by LibTorch without a Python interpreter."
        },
        {
          "q": "What is the difference between tracing and scripting?",
          "a": "Tracing runs the model on an example and records the operations that executed. Scripting compiles your source code, so control flow survives."
        },
        {
          "q": "What does tracing get wrong?",
          "a": "Any data-dependent control flow. It records the branch the example took and bakes it in, so the artifact is wrong for inputs that should take the other branch."
        },
        {
          "q": "When is a trace exact?",
          "a": "Exactly when every input takes the same control-flow path as the example. A fixed stack of layers qualifies; anything with a data-dependent if or loop does not."
        },
        {
          "q": "What is a TracerWarning?",
          "a": "A warning emitted when the tracer sees a tensor converted to a Python number or used in control flow - the signature of the baked-in-branch problem. Treat it as an error."
        },
        {
          "q": "What does scripting cost?",
          "a": "It only accepts a typed subset of Python: static types everywhere, homogeneous containers, explicit Optional refinement, and no arbitrary Python objects."
        },
        {
          "q": "What type does an unannotated argument get when scripting?",
          "a": "Tensor. That default is the most common scripting error - an int, bool or list argument must be annotated."
        },
        {
          "q": "Can you mix tracing and scripting?",
          "a": "Yes, and it is the practical approach: script the parts with control flow and trace the submodules that are awkward to type. Each can call the other."
        },
        {
          "q": "What does torch.jit.freeze do?",
          "a": "Inlines parameters as constants on an eval-mode module, enabling constant folding, dead-code elimination of training branches, and conv-BN fusion."
        },
        {
          "q": "Why can you not load a state_dict into a frozen module?",
          "a": "Freezing folded the parameters into the graph as constants, so they no longer exist as separately addressable attributes. Freeze last."
        },
        {
          "q": "Why does TorchScript help with the GIL?",
          "a": "A scripted module executes without holding the interpreter lock, so a single process can genuinely serve requests on multiple threads."
        },
        {
          "q": "What is TorchScript's status today?",
          "a": "Maintenance mode. It is still widely deployed and is the shortest path into LibTorch, but new work should look at torch.export with AOTInductor or ExecuTorch."
        }
      ],
      "standard": [
        {
          "q": "Explain tracing versus scripting and how you would decide between them.",
          "a": "WHAT EACH DOES. Tracing runs your model on an example input and records the sequence of tensor operations that actually executed. It never looks at your source, so it handles arbitrary Python - numpy calls, third-party libraries, weird objects - because none of that appears in the recording. Scripting compiles the Python source into a typed IR, so branches become branches and loops become loops, at the cost of accepting only a statically-typed subset of the language. THE FAILURE MODES ARE OPPOSITE, which is the useful framing. Tracing accepts almost everything and can be WRONG. Scripting rejects a lot and, when it succeeds, is faithful. Concretely: trace a model containing if x.sum() > 0 and the trace records only the branch that example took. The exported artifact then computes the wrong function for every input that should have gone the other way, with no error and often no warning. Formally, a trace is exact only on inputs that take the same control-flow path as the example. THE SECOND TRACING TRAP is shape specialization. Many traces are valid only for the batch size and spatial dimensions used at trace time, and this is frequently silent. So a model traced on batch 1 can produce wrong results or fail obscurely on batch 8. HOW I WOULD DECIDE. Does the forward pass contain data-dependent control flow - an if on a tensor value, a loop whose count comes from the data, an early exit, a variable-length sequence handled with a Python loop? If yes, SCRIPT it, because tracing is not merely suboptimal, it is incorrect. If the model is a fixed sequence of operations - which most vision backbones and most transformer blocks are - tracing is fine and much less work. IN PRACTICE I WOULD MIX. Script the module that owns the control flow; trace the submodules that are painful to type, such as third-party layers or anything touching non-tensor Python. A scripted module can call a traced one and vice versa, so you pay the typing cost only where it buys you correctness. THE VERIFICATION IS NOT OPTIONAL, and this is what I would emphasize as the practice. Compare the exported module against eager on a set of inputs chosen to exercise EVERY branch and SEVERAL shapes, including a different batch size. A single-input check passes for a model that is broken for half its inputs, and I have seen branches coincidentally agree on the convenient test value, which is how this bug survives review. And treat TracerWarning as an error, because it fires exactly when the tracer notices the situation that causes this. THE HONEST CODA. TorchScript is in maintenance mode; the direction is torch.export with AOTInductor and ExecuTorch. I would still learn this distinction, because it is the conceptual foundation for every graph-capture mechanism that followed, including fx and Dynamo.",
          "deepDive": {
            "q": "torch.compile handles code that scripting rejects and tracing corrupts. What does it do differently?",
            "a": "THE KEY DIFFERENCE: DYNAMO OPERATES ON PYTHON BYTECODE, AND IT IS ALLOWED TO GIVE UP LOCALLY. TorchScript's two approaches are both all-or-nothing on a whole function: scripting must compile everything or it errors, and tracing must record everything or it silently omits it. Dynamo instead analyses the bytecode frame by frame, capturing what it can into an FX graph and inserting a GRAPH BREAK at anything it cannot - a data-dependent branch, a call into arbitrary Python, a print statement, a numpy operation. Execution falls back to the interpreter at the break, then resumes capturing after it. So a function becomes several compiled graphs with Python in between, rather than one graph or a failure. That single design decision is why torch.compile works on real research code that scripting rejects. WHAT REPLACES THE CORRECTNESS PROBLEM: GUARDS. Because the captured graph is specialized to the conditions that held at capture time - shapes, dtypes, the values of Python variables that affected the trace, the types of arguments - Dynamo records a set of GUARDS alongside it. At every call it checks the guards; if they hold, the compiled graph runs; if not, it recompiles for the new conditions and caches that too. This is the crucial contrast with tracing: TorchScript's trace silently assumes its specialization remains valid, while Dynamo CHECKS. A data-dependent branch that would have been baked in by a trace instead becomes either a guard that triggers recompilation or a graph break, and in both cases the answer is correct. DYNAMIC SHAPES ARE HANDLED, not assumed away. By default Dynamo specializes on shape for the first compilation, then if it sees a different shape it recompiles with symbolic shapes so one graph covers a range. That is why dynamic=True exists and why you can see two compilations rather than one - the first is specialized, the second is generalized. WHAT IT COSTS. Compilation time on first call and on every guard miss. Graph breaks reduce the optimization opportunity, since the compiler can only fuse within a graph - so a loop containing a break is compiled many small pieces. And debugging requires new tools: torch._dynamo.explain reports the graph count and the reason for each break, which is the thing to look at when compiled code is not faster. THE HONEST SUMMARY OF THE PROGRESSION. Tracing: easy, silently wrong on control flow. Scripting: correct, rejects real code. fx: symbolic tracing, same control-flow wall as tracing, but produces a Python-level graph that is pleasant to rewrite. Dynamo: captures from bytecode, breaks the graph rather than failing or lying, and guards its specializations. Each step traded a different thing, and the one that won traded completeness of the graph for never being wrong - which, given that the failure mode of the alternatives was a silently incorrect deployed artifact, is the right trade."
          }
        },
        {
          "q": "How would you set up a verification process for an exported model?",
          "a": "The premise is that export failures are SILENT, so verification is not a formality - it is the only thing standing between you and a wrong artifact in production. I would build it as a test that runs in CI on every export. LEVEL 1: NUMERICAL EQUIVALENCE, on a deliberately chosen input set. Compare eager against the exported module with torch.allclose at a stated tolerance, over: several BATCH SIZES including one and something large, since tracing specializes on shape; several SPATIAL or SEQUENCE lengths if the model accepts them; inputs constructed to take EACH BRANCH of any conditional in the model, which requires knowing what the branches are; and edge inputs - all zeros, extreme magnitudes, an empty or length-one sequence. The branch coverage is the part people skip and it is the part that catches the tracing bug. I would also avoid symmetric test values, because I have seen two branches coincidentally agree on ones and zeros. LEVEL 2: MODE AND STATE. Assert the exported module is in eval mode and that it was exported from an eval-mode model - a model traced in training mode bakes in dropout and BatchNorm's batch-statistics path, which is a completely different function. Confirm buffers made it across by comparing state, since a buffer registered as a plain attribute will be absent. LEVEL 3: THE FULL PIPELINE, not just the model. Most production mismatches are not in the model at all - they are preprocessing. Normalization constants, channel order, resize interpolation, tokenizer version. I would verify end to end from raw input to final output, comparing against the training-time pipeline, because a correct model with different preprocessing is indistinguishable from a broken model in the metrics and far more common. LEVEL 4: A GOLDEN-OUTPUT REGRESSION TEST. Save a fixed set of inputs and the outputs the model produced at export time, and check them on every subsequent export. This catches drift from library upgrades, from a changed op implementation, and from someone editing the model. It is the highest-value long-lived test here. LEVEL 5: PERFORMANCE, with the caveat that it is a separate question. Measure latency at the batch sizes you serve, with proper warm-up and synchronization, and compare against the eager baseline - because the assumption that export makes things faster is often wrong, and if the only benefit was removing Python you want to know that explicitly. WHAT TOLERANCE TO USE. Exact equality is the wrong target: fusion changes the order of floating-point operations, so small differences are expected and legitimate. I would set atol around 1e-5 for fp32 and much looser for fp16 or bf16, and - more importantly - check the DISTRIBUTION of differences rather than only the max, because a max difference of 1e-3 concentrated on one element means something different from the same max spread across everything. THE PROCESS POINT. All of this runs automatically or it will not be run. An export script that prints 'exported successfully' without comparing anything is the normal state of affairs, and it is why this class of bug reaches production."
        },
        {
          "q": "A model works in eager mode but fails or misbehaves after scripting. Walk through the debugging.",
          "a": "SCRIPTING FAILURES ARE LOUD, which is a mercy, so the work is usually interpreting an unhelpful message. Common categories, in the order I meet them. (1) TYPE ERRORS FROM MISSING ANNOTATIONS. Every unannotated argument is assumed to be Tensor, so passing an int produces an error complaining about a type mismatch somewhere downstream of the real cause. Fix: annotate every non-tensor argument and every non-tensor attribute assigned in __init__. This is by far the most common category and the message rarely points at the line that needs the annotation. (2) HETEROGENEOUS CONTAINERS. A list holding mixed types, or a dict with non-uniform values, cannot be typed. Fix: make them homogeneous, or use a NamedTuple or a dataclass that the compiler understands. (3) OPTIONAL WITHOUT REFINEMENT. Using a value of type Optional[Tensor] requires the compiler to SEE a None check in a form it can follow - an explicit if x is not None, not a truthiness test and not a check hidden in a helper. (4) UNSUPPORTED PYTHON. Arbitrary classes, closures over non-scriptable objects, *args in some positions, exceptions with non-constant messages, and calls into numpy or any third-party library. Fix: move it out of the scripted region, or wrap it - a submodule that is traced rather than scripted, or a function marked with torch.jit.ignore so it stays a Python call. (5) INHERITANCE AND super() patterns that the compiler cannot resolve. THE FAILURE THAT IS NOT LOUD, and the one worth the most attention: the module scripts successfully and behaves DIFFERENTLY. Causes I would check in order. (a) Was the model in eval mode? A model scripted in training mode carries dropout active and BatchNorm on the batch-statistics path. (b) Are buffers present? A tensor stored as a plain attribute rather than a registered buffer will not be there. (c) Is there control flow that depends on a Python attribute the compiler CONSTANT-FOLDED? An attribute like self.use_aux annotated as bool is compiled as a value, so changing it after scripting has no effect - the branch is already resolved. This surprises people and is the scripted analogue of the tracing trap. (d) Did a traced submodule get mixed in, bringing its own baked-in branch with it? That is a real and easily missed combination: the outer module scripts faithfully and an inner traced module is silently wrong. HOW I WOULD LOCALIZE. Script the SMALLEST unit that fails rather than the whole model - go submodule by submodule, since the error message from a large module is nearly useless. Print scripted_module.code, which shows the compiler's view of your function and is often immediately revealing about what it thought your types were. And .graph for the IR when the source view is not enough. THE PREVENTION. Script early and continuously rather than at the end of a project. A codebase written with scripting in mind - annotations everywhere, ModuleList rather than list, no arbitrary objects in forward - scripts in minutes; the same model written freely can be days of work to convert. That is a real argument for deciding your deployment path before you write the model rather than after.",
          "deepDive": {
            "q": "What actually happens to a Python attribute like self.use_aux when you script a module, and why does changing it afterwards do nothing?",
            "a": "WHAT THE COMPILER DOES. When you script a module, the compiler walks its attributes. Parameters and buffers become graph inputs that stay mutable. But a plain Python attribute of a primitive type - a bool, an int, a float, a string - is treated as a CONSTANT of the compiled module unless you take specific steps otherwise. Its value at scripting time is baked into the IR. WHY THAT IS THE RIGHT DEFAULT. It enables the optimization that makes scripting worth doing. If self.use_aux is a constant False, then the branch if self.use_aux: ... is dead code, and the compiler eliminates it entirely - along with any submodules only reachable through it. Constant folding then propagates: shapes computed from constant dimensions become constants, arithmetic on them is evaluated at compile time, and whole subgraphs disappear. A model with several configuration flags can shrink substantially. Treating those attributes as mutable would forbid all of it. THE CONSEQUENCE. scripted.use_aux = True after scripting either raises, or sets an attribute that nothing reads, depending on how it was declared. The compiled graph does not contain a branch to take. This is genuinely surprising the first time and it is the scripted analogue of the tracing trap: a decision that was dynamic in Python has become static in the artifact. The difference from tracing is that here it is intentional and documented rather than an accident - but the practical effect on someone who did not expect it is the same. HOW TO GET MUTABILITY WHEN YOU NEED IT. (1) Make it a TENSOR - a registered buffer holding a flag - so the branch becomes a real conditional on a tensor value in the IR, which scripting supports. Costs you the dead-code elimination. (2) Make it an ARGUMENT to forward, annotated as bool, so the caller supplies it per call. Usually the cleanest design and it makes the dependency explicit. (3) Export SEPARATE ARTIFACTS for each configuration, which is often the right production answer - two models rather than one model with a switch, each fully optimized. THE DESIGN LESSON I WOULD DRAW. Export forces you to decide which of your model's behaviours are CONFIGURATION, fixed at build time, and which are INPUT, varying per call. Eager mode lets you leave that undecided because a Python attribute can be either. A compiled artifact cannot, and the compiler will make the decision for you - toward constant - if you do not make it yourself. Recognizing that this is a modelling decision rather than a framework quirk is what makes the behaviour predictable, and it applies equally to torch.export's distinction between static and dynamic dimensions."
          }
        },
        {
          "q": "Why would you export a model at all? Argue the cases for and against.",
          "a": "THE CASES FOR, and I would separate them because they are often conflated. (1) NO PYTHON RUNTIME. This is the strongest and most common reason. A C++ service, a mobile app, an embedded device, a game engine - environments where shipping a Python interpreter plus a package environment is impossible or unacceptable. An exported archive loads with LibTorch and needs nothing from your training setup. Nothing else solves this. (2) THE GIL. A scripted module executes without holding the interpreter lock, so one process can serve concurrent requests on multiple threads. In eager Python you typically need one process per concurrent request stream, which multiplies memory by the number of workers - and for a large model that is the difference between fitting on a machine and not. (3) DEPLOYMENT HERMETICITY. The archive contains the code and the weights together, so it cannot break when someone upgrades a package in the serving image. That reproducibility is worth real money in an environment where model and infrastructure are deployed on different schedules. (4) OPTIMIZATION OPPORTUNITY. Freezing enables constant folding, dead-code elimination and operator fusion that are unavailable while weights are mutable Python attributes. Real, though usually smaller than people expect. THE CASES AGAINST. (1) IT IS WORK, and the work is proportional to how dynamically the model was written. A model written without export in mind can take days to convert, and the conversion pressure can distort the model code - people remove clean Python constructs to satisfy a compiler. (2) DEBUGGING GETS HARDER. You lose print, breakpoints, and readable stack traces inside the exported region. The workflow becomes verify-by-comparison rather than inspect-directly. (3) THE CORRECTNESS RISK IS REAL. Tracing can silently produce a wrong artifact, and that risk is only managed by a verification discipline that must itself be built and maintained. (4) SPEED IS OFTEN NOT THE BENEFIT. People export expecting throughput and get parity, then attribute the disappointment to configuration. If speed is the goal, torch.compile or a dedicated inference runtime is usually the better lever. (5) MAINTENANCE MODE. TorchScript specifically is no longer where the investment is going, so building new infrastructure on it means building on something that will not improve. HOW I WOULD DECIDE. If the serving environment requires no-Python, export is not a choice and the question is only which target - and for new work I would evaluate torch.export with AOTInductor, or ONNX if the runtime ecosystem matters, before TorchScript. If you serve from Python and throughput is the concern, do NOT export first: measure, then try torch.compile, then consider a specialized runtime like a dedicated inference server. And if you serve from Python and the concern is process memory from many workers, the GIL argument makes export worth it even at parity latency. THE THING I WOULD SAY TO A TEAM. Decide the deployment path BEFORE writing the model, because it is nearly free to write export-friendly code from the start and expensive to retrofit. That is the single highest-leverage decision in this area and it is usually made last."
        },
        {
          "q": "Compare TorchScript, torch.export, ONNX and torch.compile.",
          "a": "They are frequently discussed as alternatives and they answer different questions, so I would separate the axes first: TRAINING versus INFERENCE, and STAYING IN PYTORCH versus LEAVING IT. torch.compile IS FOR TRAINING AND EAGER SPEED, and it does not produce a portable artifact. Dynamo captures graphs from Python bytecode, breaking the graph wherever it cannot proceed, and Inductor generates fused kernels. You stay in Python, you keep debuggability, and you get speed. It is not a deployment mechanism - the compiled artifact lives in the process. TORCHSCRIPT IS AN INFERENCE ARTIFACT that leaves Python. Tracing or scripting produces a serializable archive runnable by LibTorch. It is mature, widely deployed, and in maintenance mode. Its distinctive problem is that tracing can silently be wrong and scripting rejects real code. TORCH.EXPORT IS THE INTENDED SUCCESSOR to TorchScript for capture. It produces a full-graph, ahead-of-time representation with explicit handling of dynamic shapes - you declare which dimensions are dynamic rather than hoping the trace generalizes. It is strict about capture: rather than silently baking in a branch, it fails and tells you, which is the correctness lesson from tracing applied deliberately. From an exported program you can go to AOTInductor for a compiled shared library, or to ExecuTorch for mobile and embedded. ONNX IS AN INTERCHANGE FORMAT, and that is its whole point - it is not a PyTorch thing. Export to ONNX when the RUNTIME is not PyTorch: ONNX Runtime, TensorRT, CoreML, a vendor accelerator, or a team that does not use PyTorch. The cost is operator coverage - an op without an ONNX equivalent needs a custom implementation or a model change - and the fact that you are now debugging across a format boundary. HOW I WOULD CHOOSE. Serving from Python and want speed: torch.compile, and nothing else. Serving from C++ or mobile, new project: torch.export, then AOTInductor or ExecuTorch. Serving from C++, existing system already on it: TorchScript, because it works and rewriting has no payoff. Targeting a non-PyTorch runtime or specialized hardware: ONNX, accepting the coverage tax. THE CONCEPTUAL THREAD, which is what I would want to leave someone with. All four are answering the same question - how do you get a graph out of a Python program - and they differ in what they do when the program is not a graph. Tracing lies. Scripting refuses unless you rewrite. fx traces symbolically and hits the same wall as tracing. Dynamo breaks the graph and guards its assumptions. torch.export fails loudly and makes you declare your dynamism. The industry converged on the last two because the failure mode of the first - a silently incorrect deployed artifact - is the worst one available, and being told what your model cannot do is far better than being given something that quietly does the wrong thing."
        },
        {
          "q": "How does export interact with quantization and other graph-level optimizations?",
          "a": "THE UNDERLYING REASON THEY ARE CONNECTED: quantization is a GRAPH REWRITE, and a Python program is not a graph. To quantize you must insert observers that watch activation ranges, then replace float operations with quantized ones, then fuse patterns like conv-batchnorm-relu into a single quantized op. Every one of those steps needs a data structure representing the model's operations and their connectivity. Eager mode does not have one - it has a Python function - which is why eager-mode quantization requires you to manually place QuantStub and DeQuantStub modules and manually specify fusion lists. That is tedious and error-prone, and it exists only because the graph is absent. WHAT A CAPTURED GRAPH BUYS. With a scripted, fx-traced, or exported graph, the toolchain can find the patterns automatically: walk the graph, match conv followed by batchnorm followed by relu, replace with the fused quantized module. fx-graph-mode quantization was built for exactly this and it is substantially less manual than the eager path. The modern direction is quantization on top of torch.export's representation, for the same reason. THE FUSIONS THAT MATTER, and why the graph is required. CONV-BN FUSION is the canonical one: in eval mode, batch normalization is an affine transformation with fixed parameters, so it can be folded into the preceding convolution's weights and bias exactly - a numerically exact rewrite that removes every BN op. You cannot do this without knowing that a particular BN follows a particular conv, which is a graph property. Similarly for fusing activation functions into the preceding operation to avoid a round trip through memory. LINEAR ALGEBRA FUSIONS - combining the separate query, key and value projections into one matmul - are the same category. THE INTERACTION WITH FREEZING. torch.jit.freeze inlines parameters as constants, which is what makes conv-BN fusion possible in the scripted path: while the weights are mutable attributes the compiler cannot fold them, because they could change. Freezing is the step that converts them into something foldable. This is why freezing is not merely a cleanup - it is what unlocks the optimization. THE ORDER THAT MATTERS IN PRACTICE. Prepare and calibrate quantization on the captured graph, convert, THEN export or freeze for deployment. Doing it in the wrong order - freezing first, then trying to quantize - leaves you with a graph whose parameters are already constants and whose structure has been altered, and the quantization patterns may no longer match. WHAT I WOULD WARN ABOUT. Every one of these rewrites changes numerics, and conv-BN fusion is exact only in EVAL mode with the BN in its inference formulation - fusing a training-mode BN is wrong. So the verification discipline from earlier in this lesson applies with more force after an optimization pass than before it: compare against eager, on multiple inputs, and look at the distribution of differences rather than only the maximum."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "What tracing actually captures",
        "back": "trace(f, x0) = f restricted to the control-flow PATH taken at x0. It is exact iff every input takes that same path. Violating it produces a WRONG ANSWER, not an error - the artifact confidently computes the other branch."
      },
      {
        "type": "intuition",
        "front": "Tracing vs scripting fail in OPPOSITE directions",
        "back": "TRACING accepts almost any Python and can be silently WRONG (it never reads your code). SCRIPTING refuses a lot and, when it succeeds, is FAITHFUL. Practical answer: mix - script the control flow, trace the awkward-to-type leaves."
      },
      {
        "type": "pitfall",
        "front": "Verify an export on MULTIPLE branches and shapes",
        "back": "A single-input check passes for a model broken on half its inputs - and two branches can COINCIDENTALLY agree on symmetric test values like ones/zeros. Also test different batch sizes: tracing specializes on shape, often silently."
      },
      {
        "type": "pitfall",
        "front": "Unannotated scripting arguments default to Tensor",
        "back": "The single most common scripting error, and the message points downstream of the real cause. Annotate every non-tensor argument AND every non-tensor attribute assigned in __init__."
      },
      {
        "type": "intuition",
        "front": "Why changing a scripted module's bool attribute does nothing",
        "back": "Plain primitive attributes are compiled as CONSTANTS, which is what enables dead-code elimination of the branches they guard. The decision that was dynamic in Python became static in the artifact. Use a buffer, a forward argument, or separate artifacts."
      },
      {
        "type": "definition",
        "front": "torch.jit.freeze",
        "back": "Partial evaluation: inlines parameters as CONSTANTS on an eval-mode module, enabling constant folding, dead-code elimination of training branches, and conv-BN fusion. Afterwards you CANNOT load a state_dict - it is the last step, not a checkpoint."
      },
      {
        "type": "intuition",
        "front": "Why quantization needs a captured graph",
        "back": "Quantization is a GRAPH REWRITE - insert observers, replace ops, fuse conv-bn-relu patterns. A Python program is not a data structure you can match patterns against, which is exactly why EAGER-mode quantization requires manual QuantStubs and fusion lists."
      },
      {
        "type": "intuition",
        "front": "Conv-BN fusion is exact, and only in eval mode",
        "back": "In eval, BN is a fixed affine map, so it folds into the preceding conv's weights exactly (~1e-7). It requires knowing WHICH bn follows WHICH conv - a graph property - and it requires the weights to be constants, which is what freezing provides."
      },
      {
        "type": "pitfall",
        "front": "Treat TracerWarning as an error",
        "back": "It fires precisely when the tracer sees a tensor converted to a Python number or used in control flow - the signature of the baked-in-branch bug. It is the one warning in this area that reliably indicates a correctness problem."
      },
      {
        "type": "intuition",
        "front": "The real reason to export is NOT speed",
        "back": "It is removing the Python runtime (C++/mobile), escaping the GIL (one process serving many threads instead of one process per worker), and hermetic artifacts. If speed is the goal, measure - torch.compile or a dedicated runtime is usually the better lever."
      },
      {
        "type": "definition",
        "front": "TorchScript vs torch.export vs ONNX vs torch.compile",
        "back": "compile = TRAINING/eager speed, stays in Python, no artifact. TorchScript = inference artifact leaving Python, MAINTENANCE MODE. torch.export = its successor, explicit dynamic shapes, FAILS LOUDLY instead of baking in. ONNX = interchange for NON-PyTorch runtimes."
      },
      {
        "type": "intuition",
        "front": "What Dynamo does that scripting and tracing do not",
        "back": "It works on BYTECODE and is allowed to give up LOCALLY - inserting a GRAPH BREAK rather than failing or lying - and it GUARDS its specializations, rechecking them per call and recompiling on a miss. Tracing assumes its specialization holds; Dynamo verifies it."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: TorchScript documentation",
        "url": "https://pytorch.org/docs/stable/jit.html"
      },
      {
        "title": "PyTorch: Loading a TorchScript Model in C++",
        "url": "https://pytorch.org/tutorials/advanced/cpp_export.html"
      },
      {
        "title": "PyTorch: torch.export",
        "url": "https://pytorch.org/docs/stable/export.html"
      },
      {
        "title": "PyTorch: Quantization - eager, fx graph mode, and export paths",
        "url": "https://pytorch.org/docs/stable/quantization.html"
      },
      {
        "title": "ONNX: Open Neural Network Exchange",
        "url": "https://onnx.ai/"
      }
    ],
    "demos": [
      "quantization",
      "pruning",
      "batching",
      "mixed-precision"
    ]
  },
  "torch-fx": {
    "level": "advanced",
    "body": {
      "intuition": [
        "torch.fx turns a Module into a data structure you can edit. symbolic_trace runs the forward pass with PROXY objects instead of tensors - every operation on a proxy records a node rather than computing anything - and the result is a Graph of six node kinds, which fx can then regenerate as ordinary Python and recompile into a working Module. So the round trip is model, graph, edited graph, model, and the output is a normal nn.Module you can train, script, or deploy.",
        "The reason this matters is that a large family of things you want to do to a neural network are GRAPH REWRITES, and a Python function is not something you can pattern-match against. Fusing every convolution with the batch norm that follows it. Replacing every activation with a different one. Inserting quantization observers after every operation that needs one. Deleting a branch. Extracting intermediate activations by name. Each of these needs to know which operation feeds which, and that is a property of the graph, not of the source text. This is why fx-graph-mode quantization exists and why the eager-mode alternative makes you place stubs and fusion lists by hand.",
        "And fx has one hard limit that is worth meeting deliberately, because it is the same limit as tracing in the previous lesson wearing different clothes. Proxies cannot be evaluated as booleans, so a forward pass containing if x.sum() > 0 does not silently bake in a branch - it raises a TraceError. That is a real improvement over torch.jit.trace: fx fails loudly where tracing lies. But it is still a STATIC graph, so genuinely dynamic control flow cannot be represented at all, and the answer is either to restructure the model, or to move up to torch.compile, whose Dynamo captures from bytecode and simply breaks the graph around what it cannot handle. Knowing that fx is where PyTorch learned to represent models as data - and where it also learned that a static graph is not enough - is the point of the lesson."
      ],
      "math": [
        {
          "h": "The Graph IR: six node kinds and nothing else",
          "paras": [
            "A traced graph is a list of nodes, each with an opcode, a target, and args referring to earlier nodes. That is the entire representation, and its smallness is what makes writing transformations tractable.",
            "Every transformation in this lesson is some combination of reading these, rewriting a target, inserting a node, and re-pointing the args of downstream nodes."
          ],
          "tex": "\\text{op} \\in \\{\\,\\texttt{placeholder},\\; \\texttt{get\\_attr},\\; \\texttt{call\\_function},\\; \\texttt{call\\_method},\\; \\texttt{call\\_module},\\; \\texttt{output}\\,\\}",
          "texNote": "placeholder is a forward argument, get_attr reads a parameter or buffer, call_module invokes a submodule by qualified name, call_function calls a free function such as torch.add, call_method calls a tensor method, and output returns. Note the consequence for nn.Module design from the previous lesson: a submodule stored in a plain Python list is not addressable by qualified name, so it cannot become a call_module node - it is invisible to fx for exactly the same reason it is invisible to the optimizer."
        },
        {
          "h": "Conv-BN fusion, which is exact",
          "paras": [
            "In eval mode batch normalization is a fixed affine map, so it can be folded into the preceding convolution's weights and bias with no approximation at all. This is the canonical fx transformation and the one worth deriving.",
            "Both operations are linear in eval mode, so their composition is a single linear operation - the fusion is just writing down which one."
          ],
          "tex": "W' = W \\cdot \\frac{\\gamma}{\\sqrt{\\sigma^2 + \\epsilon}}, \\qquad b' = (b - \\mu)\\cdot\\frac{\\gamma}{\\sqrt{\\sigma^2+\\epsilon}} + \\beta",
          "texNote": "The scale factor multiplies each output channel's filter. Measured on a real model this reproduces the original outputs to about 1e-7 - floating-point noise, not approximation - while removing every BatchNorm node from the graph. Two conditions are load-bearing: the module must be in EVAL mode, since training-mode BN uses batch statistics and is not a fixed map; and the BN must consume the conv's output and nothing else must, or folding changes what the other consumer sees."
        },
        {
          "h": "The Interpreter pattern",
          "paras": [
            "fx.Interpreter re-executes a graph node by node, which gives you a hook at every operation. Subclass it, override run_node, and you have per-node instrumentation without touching the model.",
            "This is how shape propagation, per-operation profiling, and many analysis passes are implemented - the graph is executed once with the semantics you choose."
          ],
          "tex": "\\text{Interpreter}(G).\\texttt{run}(x): \\quad \\text{env}[n] \\leftarrow \\texttt{run\\_node}(n) \\;\\; \\text{for } n \\in G \\text{ in topological order}",
          "texNote": "The environment maps each node to its computed value, so overriding run_node lets you record the output shape and dtype, time the operation, accumulate statistics, or substitute a different implementation entirely. It is the cleanest way to answer questions like which layer produces the largest activation tensor, which is exactly the question you need answered when hunting a memory problem."
        }
      ],
      "code": [
        {
          "h": "Trace, inspect, and fuse - with the verification that must accompany it",
          "paras": [
            "The round trip, and the transformation that pays for the whole lesson. Every graph rewrite must be checked numerically against the original, because a rewrite that is subtly wrong still runs."
          ],
          "code": "gm = torch.fx.symbolic_trace(model)      # -> GraphModule\ngm.graph.print_tabular()                 # opcode | name | target | args\nprint(gm.code)                           # the REGENERATED Python - readable\n\ndef fuse_conv_bn(gm: torch.fx.GraphModule) -> torch.fx.GraphModule:\n    modules = dict(gm.named_modules())\n    for node in gm.graph.nodes:\n        if node.op != \"call_module\": continue\n        bn = modules.get(node.target)\n        if not isinstance(bn, nn.BatchNorm2d): continue\n        prev = node.args[0]\n        if prev.op != \"call_module\": continue\n        conv = modules.get(prev.target)\n        if not isinstance(conv, nn.Conv2d): continue\n        if len(prev.users) > 1: continue      # <-- the conv feeds something ELSE\n                                              #     too; folding would change\n                                              #     what that consumer sees\n        fused = fuse(conv, bn)                # W' = W*g/sqrt(v+eps), b' = ...\n        replace_module(gm, prev.target, fused)\n        node.replace_all_uses_with(prev)      # BN's consumers now read the conv\n        gm.graph.erase_node(node)\n    gm.graph.lint(); gm.recompile()           # lint BEFORE recompile\n    return gm\n\n# VERIFY. Always. A wrong rewrite still runs.\ngm.eval(); fused_gm = fuse_conv_bn(copy.deepcopy(gm)).eval()\nx = torch.randn(4, 3, 64, 64)\nprint((gm(x) - fused_gm(x)).abs().max())   # ~1e-7 - float noise, not error\nprint(sum(1 for n in fused_gm.graph.nodes\n          if isinstance(dict(fused_gm.named_modules()).get(n.target), nn.BatchNorm2d)))\n#                                          # 0 - every BN node is gone\n#\n# TWO CONDITIONS ARE LOAD-BEARING: eval mode (training-mode BN uses BATCH\n# statistics and is not a fixed affine map), and the conv having exactly one\n# consumer. Skipping the second check silently changes the model.",
          "caption": "Exact to floating-point noise, with every BatchNorm node removed. The len(prev.users) > 1 guard is the one people omit: if the convolution also feeds a skip connection, folding the BN into it changes what that other consumer receives."
        },
        {
          "h": "Retargeting, insertion, and the two gotchas that cost real time",
          "paras": [
            "Rewriting a node's target and inserting a new node are the other two primitives. Both have a sharp edge that produces a confusing failure the first time."
          ],
          "code": "# 1. RETARGET: swap every ReLU for GELU.\nfor node in gm.graph.nodes:\n    if node.op == \"call_function\" and node.target is F.relu:\n        node.target = F.gelu\n        node.kwargs = {}          # <-- GOTCHA. F.relu traces with\n                                  # kwargs {'inplace': False}; F.gelu has no\n                                  # such argument, so recompile() produces code\n                                  # that raises TypeError at CALL time, not at\n                                  # rewrite time. Clear the kwargs.\n\n# 2. INSERT a node after another (the observer pattern - how quantization\n#    inserts its range-watchers):\nfor node in list(gm.graph.nodes):\n    if node.op == \"call_module\" and is_conv(node):\n        with gm.graph.inserting_after(node):\n            new = gm.graph.call_function(torch.clamp, (node,), {\"min\": -1e4, \"max\": 1e4})\n        node.replace_all_uses_with(new)   # <-- GOTCHA. This rewires EVERY use\n                                          # of `node`, INCLUDING new's own\n                                          # argument - so `new` now takes\n                                          # ITSELF as input. A self-loop.\n        new.args = (node,)                # restore it. (Or use the\n                                          # propagate_meta / replace-with-\n                                          # exclusion helpers.)\n\ngm.graph.lint(); gm.recompile()\n\n# 3. THE INTERPRETER: per-node instrumentation without touching the model.\nclass ShapeAndTimeProf(torch.fx.Interpreter):\n    def run_node(self, n):\n        t0 = time.perf_counter(); out = super().run_node(n)\n        if isinstance(out, torch.Tensor):\n            self.log.append((n.name, tuple(out.shape), time.perf_counter() - t0))\n        return out\n#   -> answers 'which layer produces the largest activation tensor', which is\n#      exactly the question you need when hunting a memory problem.\n\n# 4. THE LIMIT, met deliberately:\nclass DynamicNet(nn.Module):\n    def forward(self, x):\n        if x.sum() > 0: return x * 2      # bool(Proxy) is not defined\n        return x - 1\ntorch.fx.symbolic_trace(DynamicNet())     # raises TraceError\n#\n# fx FAILS LOUDLY where torch.jit.trace would silently bake in one branch.\n# That is a real improvement - but it is still a STATIC graph. Genuinely\n# dynamic control flow needs torch.compile, whose Dynamo breaks the graph\n# around what it cannot capture instead of refusing.",
          "caption": "Both gotchas produce confusing failures: leftover kwargs raise a TypeError at call time rather than at rewrite time, and replace_all_uses_with rewires the new node's own argument into a self-loop. Restore new.args after the call."
        }
      ],
      "useCases": [
        "Quantization, which is the flagship application - fx-graph-mode quantization finds conv-bn-relu patterns automatically and inserts observers, replacing the eager-mode workflow of placing stubs and fusion lists by hand.",
        "Structured pruning and architecture surgery: removing channels or whole blocks requires knowing what consumes what, so the dependency structure a graph gives you is exactly the information the rewrite needs.",
        "Feature extraction by name - torchvision's create_feature_extractor is an fx pass that returns intermediate node outputs, which is more robust than hooks because it produces a real Module rather than relying on side effects.",
        "Analysis passes: propagating shapes and dtypes through a model without running it at full size, counting FLOPs per operation, and finding which layer materializes the largest activation - all Interpreter subclasses of a few dozen lines."
      ],
      "pitfalls": [
        "Fusing a conv-BN pair where the convolution has more than one consumer. If the conv also feeds a skip connection, folding the BN into its weights changes what that other consumer receives. Check len(node.users) before rewriting.",
        "Fusing BatchNorm in training mode. The fusion is exact only because eval-mode BN is a fixed affine map; in training mode it uses batch statistics and is not. Always call .eval() before the pass and verify numerically afterwards.",
        "Retargeting a node without clearing stale kwargs. F.relu traces with inplace=False in its kwargs, and F.gelu has no such parameter - so the rewritten graph compiles fine and raises TypeError when called, which points at the wrong place entirely.",
        "Calling replace_all_uses_with after inserting a node. It rewires every use of the old node including the new node's own argument, producing a self-loop. Restore new.args afterwards, or use the helper that excludes the replacement.",
        "Forgetting graph.lint() and recompile(). Editing the graph does not change the module's forward until you recompile, so a pass can appear to do nothing; lint first, because it catches structural corruption like the self-loop with a clear message.",
        "Expecting fx to trace dynamic control flow. Proxies cannot be evaluated as booleans, so any data-dependent branch raises TraceError. This is better than silently baking in a branch, and it still means fx cannot represent that model - restructure it or move to torch.compile.",
        "Rewriting without a numerical check. A subtly wrong graph transformation still runs and still trains, slightly worse, with nothing to indicate the pass was incorrect. Compare against the original on real inputs after every pass."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/torchscript",
          "text": "The same capture problem with different aims. TorchScript captures for DEPLOYMENT and produces a typed IR you cannot easily edit; fx captures for TRANSFORMATION and produces a Python-level graph designed to be rewritten. Both hit the same wall on dynamic control flow."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The successor that resolves the limit. Dynamo captures from bytecode and inserts a graph break rather than raising, so it handles code fx refuses - and it emits FX graphs to its backend, so fx remains the representation underneath."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The application that motivated much of fx. Quantization is pattern matching plus node insertion plus module replacement, which is precisely what a graph makes possible and a Python function does not."
        },
        {
          "ref": "pytorch-internals/nn-module-patterns",
          "text": "Why registration matters here too: a submodule in a plain Python list has no qualified name, so it can never become a call_module node. It is invisible to fx for the same reason it is invisible to the optimizer."
        },
        {
          "ref": "pytorch-internals/debugging-profiling",
          "text": "The Interpreter pattern is a profiling tool - per-node timing and shape propagation in a few dozen lines - and it answers questions the standard profiler does not, such as which operation materializes the largest tensor."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does torch.fx do?",
          "a": "symbolic_trace runs the forward pass with Proxy objects that record operations instead of computing, producing a Graph you can edit and recompile back into a working nn.Module."
        },
        {
          "q": "What are the six node opcodes?",
          "a": "placeholder, get_attr, call_function, call_method, call_module, and output. That is the entire IR, which is what makes writing transformations tractable."
        },
        {
          "q": "Why is a graph needed for quantization?",
          "a": "Quantization is pattern matching plus node insertion plus module replacement. A Python function is not a data structure you can match patterns against, which is why eager-mode quantization needs manual stubs."
        },
        {
          "q": "What is the conv-BN fusion formula?",
          "a": "W' = W * gamma / sqrt(var + eps) and b' = (b - mean) * gamma / sqrt(var + eps) + beta. In eval mode it is exact to floating-point noise."
        },
        {
          "q": "Why must the model be in eval mode to fuse BN?",
          "a": "Eval-mode BatchNorm is a fixed affine map, so it composes with the convolution into a single linear operation. Training-mode BN uses batch statistics and is not fixed."
        },
        {
          "q": "When can you not fuse a conv-BN pair?",
          "a": "When the convolution has more than one consumer. Folding changes its output, so anything else reading it would receive something different."
        },
        {
          "q": "What happens if you retarget F.relu to F.gelu without clearing kwargs?",
          "a": "F.relu traces with inplace=False in its kwargs and gelu has no such argument, so the graph recompiles fine and raises TypeError when called."
        },
        {
          "q": "What is the replace_all_uses_with trap?",
          "a": "It rewires every use of the old node, including the newly inserted node's own argument - creating a self-loop. Restore new.args afterwards."
        },
        {
          "q": "What does fx.Interpreter give you?",
          "a": "Node-by-node re-execution with a hook at every operation, so you can time each one, record shapes, or substitute implementations without touching the model."
        },
        {
          "q": "What happens when fx meets data-dependent control flow?",
          "a": "It raises TraceError, because a Proxy cannot be evaluated as a boolean. It fails loudly where torch.jit.trace would silently bake in one branch."
        },
        {
          "q": "Why is failing loudly better than tracing's behaviour?",
          "a": "Because a silently baked-in branch produces an artifact that confidently computes the wrong function for half its inputs, with no error anywhere."
        },
        {
          "q": "Why must you call recompile after editing a graph?",
          "a": "The GraphModule's forward is generated Python. Editing the graph does not change it until you regenerate, so the pass otherwise appears to do nothing."
        }
      ],
      "standard": [
        {
          "q": "How would you extract intermediate features with fx, and why prefer that to hooks?",
          "a": "THE FX APPROACH. Trace the model, then build a new GraphModule whose output node returns a dictionary of the nodes you want instead of just the final one. torchvision packages this as create_feature_extractor, which takes a model and a mapping from node names to output keys and returns a Module producing that dictionary. Under the hood it is: trace, find the named nodes, rewrite the output node's args to include them, prune anything downstream that is now unreachable with eliminate_dead_code, and recompile. WHY IT BEATS HOOKS - four reasons, and they are all consequences of producing a real Module rather than relying on side effects. (1) IT IS A VALUE, NOT A SIDE EFFECT. A hook writes into a dictionary you own, so extraction depends on running the model and then reading state elsewhere. The fx version RETURNS the features, so it composes normally - it can be passed around, wrapped, and reasoned about, and there is no ordering dependency between running and reading. (2) IT SURVIVES EXPORT AND COMPILATION. Hooks are Python-level callbacks; a scripted, exported, or compiled model may not run them where you expect, and a traced graph will not contain them at all. An fx feature extractor is a Module whose forward genuinely returns those tensors, so it exports like any other model. This is the decisive difference for anything heading to production. (3) DEAD CODE CAN BE ELIMINATED. If you only need features from the first half of a network, the fx version can prune the rest entirely, so you do not pay to compute a classifier head you are discarding. A hook cannot do that - the model still runs to completion. On a large backbone used only for early features that is a substantial saving. (4) NODE NAMES ARE STABLE AND ENUMERABLE. get_graph_node_names gives you every addressable point, including the outputs of functional operations that are not modules at all - a bare F.relu or an addition in a residual connection has no module to attach a hook to, and fx addresses it fine. WHEN HOOKS ARE STILL RIGHT. When the model is not traceable, which is the main case - anything with data-dependent control flow raises TraceError, and hooks do not care. When you need to MODIFY behaviour dynamically at runtime rather than build a fixed variant. When you want instrumentation you can attach and remove without constructing a second model, such as temporary debugging. And when the thing you want is on the backward pass, since fx captures the forward and gradients are a different question - a backward hook remains the tool for gradient inspection. WHAT I WOULD ACTUALLY DO. For a production feature extractor - a backbone feeding a downstream head, a perceptual loss, a distillation setup where you need intermediate activations from a teacher - use fx, because it produces a Module I can export and because pruning the unused tail is free. For ad-hoc debugging and interpretability on a model I am still exploring, use hooks, because they require no tracing and no rebuild. The two are not competing so much as suited to build-time versus run-time instrumentation."
        },
        {
          "q": "Explain what torch.fx is and what it enables.",
          "a": "THE MECHANISM. symbolic_trace runs your forward pass, but instead of tensors it passes PROXY objects. Every operation on a proxy records a node in a graph and returns a new proxy rather than computing anything. The result is an fx.Graph - a list of nodes, each with an opcode, a target and args pointing at earlier nodes - wrapped in a GraphModule whose forward is REGENERATED PYTHON. So the round trip is module, graph, edited graph, regenerated module, and the output is an ordinary nn.Module you can train, script, or deploy. You can even read the generated source with gm.code, which is unusually pleasant for a compiler IR. THE IR IS SIX OPCODES: placeholder for a forward argument, get_attr for a parameter or buffer, call_module for a submodule by qualified name, call_function for a free function, call_method for a tensor method, and output. That smallness is the design's main virtue - a transformation is a loop over nodes with a few if statements, not a compiler pass. WHAT IT ENABLES, and the reason to care: a large class of things you want to do to a network are GRAPH REWRITES, and a Python function is not something you can pattern-match against. (1) QUANTIZATION - find conv-bn-relu patterns, insert observers, replace with quantized modules. This is the flagship application and it is why fx-graph-mode quantization replaced the eager workflow of placing stubs by hand. (2) OPERATOR FUSION, of which conv-BN folding is canonical: in eval mode BN is a fixed affine map, so it folds into the preceding convolution's weights exactly - to about 1e-7, which is floating-point noise rather than approximation - and every BN node disappears from the graph. (3) ARCHITECTURE SURGERY: swapping activations, removing branches, structured pruning, which needs the dependency structure. (4) FEATURE EXTRACTION by node name, which produces a real Module rather than relying on hooks. (5) ANALYSIS: shape propagation, FLOP counting, and per-node profiling via the Interpreter pattern. THE LIMIT, which I would raise unprompted because it is the interesting part. Proxies cannot be evaluated as booleans, so a forward containing if x.sum() > 0 raises TraceError. That is a genuine improvement over torch.jit.trace, which would silently record whichever branch the example took and produce an artifact that is wrong for half its inputs. fx fails loudly. But it is still a STATIC graph and cannot represent dynamic control flow at all, so the options are to restructure the model or to move to torch.compile - whose Dynamo captures from bytecode and inserts a graph break around what it cannot handle. Notably, Dynamo emits FX graphs to its backend, so fx remains the representation underneath even in the successor.",
          "deepDive": {
            "q": "Derive conv-BN fusion and state precisely when it is valid.",
            "a": "THE TWO OPERATIONS. A convolution is y = W * x + b, linear in x. Batch normalization in EVAL mode is z = gamma * (y - mu) / sqrt(sigma^2 + eps) + beta, where mu, sigma^2, gamma and beta are all fixed tensors - so it is an affine map applied per channel. THE COMPOSITION. Substitute: z = gamma * (W*x + b - mu) / sqrt(sigma^2 + eps) + beta. Let s = gamma / sqrt(sigma^2 + eps), a per-output-channel scalar. Then z = s*(W*x) + s*(b - mu) + beta = (s*W)*x + (s*(b-mu) + beta). That is exactly a convolution with W' = s*W and b' = s*(b - mu) + beta, where s multiplies each output channel's entire filter. Since convolution is linear and the scaling is per output channel, scaling the filter is equivalent to scaling the output - which is what makes the fold work. No approximation anywhere; the residual is floating-point rounding, measured around 1e-7. WHEN IT IS VALID - four conditions, and each is a real check rather than a formality. (1) EVAL MODE. In training, BN normalizes by the CURRENT BATCH's statistics, which depend on the input, so it is not a fixed affine map and there is nothing to fold. Fusing a training-mode BN silently replaces a data-dependent normalization with a constant one - the model still runs and trains differently. (2) THE CONV MUST HAVE EXACTLY ONE CONSUMER. If its output also feeds a skip connection or a second branch, folding changes what that consumer sees, because the conv's output is now pre-scaled. This is the check people omit, and in a ResNet it matters. (3) NOTHING BETWEEN THEM. The BN must consume the conv's output directly. A nonlinearity in between breaks the composition, because the composition of two linear maps is linear and conv-relu-bn is not. (4) THE CONVOLUTION MUST HAVE A BIAS, or you must add one - if it was created with bias=False, which is standard precisely BECAUSE a following BN makes the bias redundant, the fused module needs a bias parameter created for it. Forgetting this is a common implementation bug. WHY THIS IS WORTH DOING. It removes an operation from every block, and more importantly it removes a MEMORY ROUND TRIP - BN is memory-bound, reading and writing the full activation tensor for very little arithmetic. On CPU I have seen modest wins around 1.3x on a small model, and the honest statement is that the gain depends heavily on the model and the hardware, so it should be measured rather than assumed. The parameter-count saving is negligible; the win is in bandwidth and in having fewer kernel launches. THE GENERALIZATION worth naming. The same argument fuses any fixed affine operation into an adjacent linear one - scaling, a fixed LayerNorm at inference in some formulations, a constant multiply. The pattern is: two linear maps in sequence compose into one, and if either has fixed parameters you can do the composition at build time rather than at every forward pass. That is partial evaluation, which is also what torch.jit.freeze does, and recognizing them as the same idea is more useful than memorizing either."
          }
        },
        {
          "q": "How would you write and validate a graph transformation pass?",
          "a": "THE STRUCTURE OF A PASS, which is always the same four steps. (1) TRACE, and be explicit about what you are tracing - a fresh copy, since passes mutate in place and you will want the original for comparison. (2) ITERATE over graph.nodes, matching the pattern you care about. Matching means checking node.op, node.target, and the ops and targets of node.args - so a conv-bn pattern is a call_module node whose module is a BatchNorm whose single argument is a call_module node whose module is a Conv2d. (3) REWRITE: change a target, insert a node with graph.inserting_after or inserting_before, re-point consumers with replace_all_uses_with, erase the dead node. Note you should collect the matches into a list BEFORE mutating, because mutating the graph while iterating it is asking for trouble. (4) LINT AND RECOMPILE. graph.lint() checks structural invariants - topological order, no self-loops, all args resolvable - and gives a clear message when you have corrupted the graph. recompile() regenerates the forward; without it, the module still runs the old code and the pass appears to have done nothing. THE VALIDATION, which matters more than the pass. (1) NUMERICAL EQUIVALENCE against the original on real inputs, at a stated tolerance. For an equivalence-preserving pass like fusion, expect floating-point noise around 1e-6 or better, and be suspicious of anything larger. For a pass that deliberately changes semantics - swapping activations - you cannot check equivalence, so check the properties you intended: that the new op appears everywhere, that the old one appears nowhere, and that the model still trains. (2) STRUCTURAL ASSERTIONS: count the nodes you expected to remove and assert zero remain; count the nodes you expected to insert. This catches a pass that matched nothing, which is the most common failure and is completely silent - the model works perfectly because nothing happened. (3) IDEMPOTENCE where it should hold: running the pass twice should equal running it once. A pass that keeps inserting nodes on every application has a matching bug. (4) EDGE CASES IN THE GRAPH: a conv with two consumers, a BN not preceded by a conv, a model where the pattern appears zero times, and a model where it appears at the very start or very end. THE FAILURE MODE I WOULD WARN ABOUT MOST. A pass that silently matches nothing. The model is unchanged, everything works, and you believe you have optimized it. Always assert on the number of rewrites performed, and log it. Second most common: a pass that is correct on the model you tested and wrong on a slightly different architecture, because you did not check the guard conditions - the multiple-consumers case being the standard example. THE WORKFLOW I WOULD USE. Write the pass against a tiny model where I can print_tabular the whole graph and read it, verify there, then run on the real model with structural assertions. Debugging a graph transformation on a 200-layer network is unpleasant; on a five-node graph it is trivial, and the pass logic is the same."
        },
        {
          "q": "Compare fx, TorchScript tracing, and Dynamo as capture mechanisms.",
          "a": "ALL THREE ANSWER THE SAME QUESTION - how do you get a graph out of a Python program - and they differ in how they capture and in what they do when the program is not a graph. TORCHSCRIPT TRACING runs the model with real tensors and records the operations that executed. It sees actual values, so it can be fooled: a data-dependent branch is resolved once and BAKED IN, silently, and shape specialization is often silent too. It produces a TorchScript IR aimed at deployment - typed, serializable, runnable without Python - and not designed for you to edit. TORCH.FX traces SYMBOLICALLY with Proxy objects rather than tensors. Because a proxy has no value, any attempt to branch on it raises TraceError rather than picking a branch. So fx cannot be fooled the way tracing can - it fails loudly. Its output is a Python-level graph with six node kinds and a regenerated forward you can read, designed explicitly for TRANSFORMATION rather than deployment. Its limit is the same as tracing's in extent - it captures a static graph - but the failure mode is honest. DYNAMO analyses Python BYTECODE. It captures what it can into an FX graph and inserts a GRAPH BREAK at anything it cannot - a data-dependent branch, a print, a call into numpy - then resumes capturing after. So a function becomes several graphs with Python between them rather than one graph or a failure. And it records GUARDS: the conditions under which the captured graph is valid, checked on every call, triggering recompilation on a miss. That is the crucial difference from tracing, which ASSUMES its specialization remains valid while Dynamo VERIFIES it. THE PROGRESSION IS A STORY ABOUT FAILURE MODES, which is how I would frame it. Tracing: silently wrong. fx: loudly incapable. Dynamo: locally incapable, globally correct. Each generation kept the ability to capture a graph and changed what happens at the boundary of what is capturable, and the winner is the one that never produces a wrong answer. Given that the alternative's failure was a silently incorrect deployed artifact, that ordering is exactly right. WHAT THIS MEANS PRACTICALLY. Want to REWRITE a model - fuse, quantize, prune, extract features: fx, because its graph is designed to be edited and its failures are honest. Want to DEPLOY without Python: torch.export for new work, TorchScript for existing systems. Want SPEED in training while staying in Python: torch.compile. AND THE DETAIL THAT TIES IT TOGETHER: Dynamo emits FX graphs to its backend. So fx did not lose - it became the intermediate representation of the thing that succeeded it, which is a good outcome for a design and a good indication that the six-opcode IR was the right abstraction.",
          "deepDive": {
            "q": "If Dynamo handles dynamic control flow, is there still a reason to use fx directly?",
            "a": "Yes, several, and they follow from the two serving different purposes: Dynamo is a COMPILER FRONT END and fx is a PROGRAM TRANSFORMATION toolkit. REASON 1: YOU WANT THE ARTIFACT, NOT THE SPEED. fx gives you a GraphModule - a real nn.Module with regenerated Python you can read, save, further modify, script, or hand to someone. torch.compile gives you a callable whose optimization lives in the process and is regenerated per run. If the deliverable is a MODIFIED MODEL - a quantized one, a pruned one, one with a swapped activation - fx is the tool and compile is not. REASON 2: DETERMINISM AND INSPECTABILITY. An fx pass produces exactly the graph you wrote, and you can print it. Dynamo's behaviour depends on guards, recompilation, and what it chose to break on, which varies with input shapes and with the version. For a build step that must be reproducible - producing a deployment artifact in CI - that variability is a problem rather than a feature. REASON 3: YOU ARE WRITING THE TRANSFORMATION, not consuming one. Quantization toolchains, pruning libraries, model-surgery tools, and academic work on architecture modification all need to match patterns and rewrite. Dynamo does not expose that as a user-facing workflow; it hands FX graphs to a BACKEND, which is a different integration point and a lower-level one. REASON 4: ANALYSIS WITHOUT EXECUTION. ShapeProp and Interpreter subclasses let you propagate shapes, count FLOPs, or find the largest activation tensor without running the model at full scale. That is an fx capability used constantly in tooling and it has no compile equivalent. REASON 5: SIMPLICITY. fx is a few hundred lines of concept - six opcodes and a node list. Understanding what a pass will do is straightforward. Dynamo's bytecode analysis, guard system and recompilation logic are considerably more machinery, and when something goes wrong you are debugging a compiler. WHERE THEY COMPOSE, which is the practical answer for most people. Use fx to transform the model - fuse, quantize, prune - then torch.compile the RESULT for speed. The two are complementary layers rather than competitors, and this ordering is what production pipelines actually do. WHAT I WOULD SAY ABOUT DIRECTION. The ecosystem is consolidating around torch.export's representation for deployment capture and Dynamo for training, and fx's role is settling into being the IR underneath both plus the toolkit for writing passes. So fx is not being replaced; it is being demoted from a capture mechanism - where its static-graph limit was a real problem - to a representation and transformation layer, where that limit does not bite because the capture is someone else's job. That is a healthy outcome and it is worth understanding, because it tells you which part of fx to invest in learning: the graph manipulation, not symbolic_trace itself."
          }
        },
        {
          "q": "How does fx-graph-mode quantization differ from eager-mode quantization?",
          "a": "THE UNDERLYING REASON THEY DIFFER: quantization requires knowing the model's STRUCTURE, and eager mode does not have any. EAGER MODE puts the burden on you. You must insert QuantStub at every point where float data enters the quantized region and DeQuantStub where it leaves. You must supply an explicit list of module names to fuse - conv, bn, relu triples specified by string. You must replace functional calls like F.relu with module versions, because a free function has no module to swap. And you must add FloatFunctional wrappers around arithmetic like additions in residual connections, because a bare + cannot carry a quantization observer. Every one of these is manual, model-specific, and easy to get subtly wrong - and getting it wrong usually means part of the model quietly stays in float, so the model works and is slower and larger than you think. FX GRAPH MODE does all of that by traversal. It traces to a graph, PATTERN-MATCHES conv-bn-relu and its variants automatically, inserts observers at the right places by looking at what feeds what, handles functional calls and arithmetic because they are nodes like any other, and determines the quantized-float boundaries from the graph structure. You supply a qconfig mapping - which parts should be quantized and how - and the pass does the placement. It is dramatically less work and dramatically less error-prone. WHAT FX MODE COSTS. It requires the model to be TRACEABLE, so a model with data-dependent control flow raises TraceError and you are back to restructuring or to eager mode. In practice this is the main reason people fall back. It also gives you less fine-grained manual control, though qconfig mappings can be specified per module or per pattern, which covers most needs. THE STEPS, so the shape is clear. prepare_fx inserts observers according to the qconfig. You then run CALIBRATION data through it to collect activation ranges - this is post-training quantization; for quantization-aware training the inserted modules are fake-quantize nodes that are differentiated through with a straight-through estimator instead. Then convert_fx replaces the float operations with quantized ones and removes the observers. THE DIRECTION, stated honestly. Both of these are the older APIs; the current direction is quantization built on torch.export's representation - PT2 export quantization - which keeps the graph-based automation and moves to the capture mechanism the ecosystem is standardizing on. The conceptual content is unchanged: it is still pattern matching, observer insertion, and module replacement on a graph. WHAT I WOULD TAKE FROM THE COMPARISON GENERALLY. The eager-versus-graph gap here is the clearest illustration of this module's theme. Eager mode hid the model's structure to make it pleasant to write, and quantization is a task that NEEDS that structure - so the cost of the abstraction is paid, in full, as manual annotation. Recovering the graph recovers the automation."
        },
        {
          "q": "You wrote an fx pass and the model output is unchanged. What went wrong?",
          "a": "Unchanged output after a semantics-changing pass means the pass did nothing, and there are four candidates I would check in order - all of which are silent, which is why this is a good question. CANDIDATE 1: YOU DID NOT RECOMPILE. A GraphModule's forward is generated Python source. Editing graph.nodes changes the graph and NOT the compiled forward, so the module keeps running the old code. Call gm.recompile() after the edits - and call gm.graph.lint() first, because it validates the structure and gives a clear message if you corrupted it. This is the most common cause by a wide margin and it produces exactly this symptom. CANDIDATE 2: THE PATTERN MATCHED NOTHING. The loop ran, no node satisfied the conditions, and the pass silently did nothing. Causes: checking node.target against a module instance rather than looking it up in named_modules; assuming activations are call_module nodes when the model uses functional F.relu, which traces as call_function; or a guard condition being stricter than intended. FIX AND PREVENTION: count the rewrites and assert on the count. A pass that reports 'rewrote 0 nodes' is immediately diagnosable; a pass that reports nothing is not. I would treat this as mandatory in any pass. CANDIDATE 3: YOU MUTATED A COPY. symbolic_trace returns a new GraphModule; if you traced, transformed, and then ran the ORIGINAL model, nothing changed because you are running a different object. Easy to do when the pass returns a new module and the call site ignores the return value. CANDIDATE 4: THE PASS RAN ON THE WRONG THING. Tracing a wrapper - a DataParallel, a Lightning module, a compiled module - gives you a graph of the wrapper, whose only node may be a call to the inner module. Trace the inner nn.Module. HOW I WOULD DIAGNOSE IN THIRTY SECONDS. print gm.graph.print_tabular() before and after, and diff. That shows immediately whether the graph changed at all, which splits candidates 1 and 3 (graph changed, module did not run it) from candidate 2 (graph unchanged). Then print gm.code, which shows the regenerated forward - if the graph changed and the code did not, it is the recompile. THE RELATED CASE worth mentioning: output unchanged after an EQUIVALENCE-PRESERVING pass like conv-BN fusion is CORRECT and expected - that pass is supposed to leave outputs identical to floating-point noise. So the structural assertion is the only way to verify it did anything: count the BatchNorm nodes and assert zero remain. This is a good illustration of why numerical checks alone are insufficient for validating a pass, and why every pass needs both a numerical check and a structural one."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "How symbolic_trace works",
        "back": "Runs forward with PROXY objects instead of tensors - each operation records a node and returns a new proxy rather than computing. Output is a GraphModule whose forward is REGENERATED PYTHON (readable via gm.code)."
      },
      {
        "type": "definition",
        "front": "The six fx opcodes",
        "back": "placeholder (forward arg), get_attr (param/buffer), call_function, call_method, call_module (by QUALIFIED NAME), output. A submodule in a plain Python list has no qualified name, so it can never become a call_module node - invisible to fx for the same reason it is invisible to the optimizer."
      },
      {
        "type": "formula",
        "front": "Conv-BN fusion",
        "back": "s = gamma/sqrt(var+eps); W' = s*W, b' = s*(b - mean) + beta. Both are linear in EVAL mode, so their composition is one linear op. Exact to ~1e-7 (float noise), and every BN node disappears."
      },
      {
        "type": "pitfall",
        "front": "Four conditions for valid conv-BN fusion",
        "back": "(1) EVAL mode - training BN uses batch statistics and is not a fixed map. (2) The conv has EXACTLY ONE consumer (a skip connection breaks it). (3) Nothing between them. (4) The conv needs a bias - if created with bias=False (standard, since BN made it redundant) you must add one."
      },
      {
        "type": "pitfall",
        "front": "Retargeting leaves stale kwargs",
        "back": "F.relu traces with kwargs {'inplace': False}; F.gelu has no such argument. The graph recompiles FINE and raises TypeError at CALL time, pointing nowhere useful. Set node.kwargs = {} after changing node.target."
      },
      {
        "type": "pitfall",
        "front": "replace_all_uses_with creates a self-loop",
        "back": "After inserting `new` that consumes `node`, calling node.replace_all_uses_with(new) rewires EVERY use - including new's OWN argument. `new` now takes itself as input. Restore new.args = (node,) afterwards."
      },
      {
        "type": "pitfall",
        "front": "Edited the graph and nothing changed?",
        "back": "You did not recompile(). The forward is GENERATED source; editing graph.nodes does not change it. Call lint() then recompile(). Second candidate: the pattern matched NOTHING - so always COUNT the rewrites and assert on the count."
      },
      {
        "type": "intuition",
        "front": "Every pass needs BOTH checks",
        "back": "NUMERICAL (vs the original, ~1e-6 for equivalence-preserving passes) AND STRUCTURAL (count nodes removed/inserted). A fusion pass that did nothing passes the numerical check perfectly - identical output is the expected result."
      },
      {
        "type": "intuition",
        "front": "fx fails LOUDLY where tracing lies",
        "back": "bool(Proxy) is undefined, so `if x.sum() > 0` raises TraceError instead of silently baking in one branch. A real improvement - but fx still captures only a STATIC graph. Dynamic control flow needs torch.compile."
      },
      {
        "type": "definition",
        "front": "fx.Interpreter",
        "back": "Re-executes the graph node by node with a hook at every operation (override run_node). Used for shape propagation, FLOP counting, per-node timing, and answering 'which layer materializes the largest activation tensor' - the question you need when hunting memory."
      },
      {
        "type": "intuition",
        "front": "The capture progression, as failure modes",
        "back": "TRACING: silently wrong. FX: loudly incapable (TraceError). DYNAMO: locally incapable (graph break), globally correct, and it GUARDS its specializations instead of assuming them. The winner is the one that never returns a wrong answer."
      },
      {
        "type": "intuition",
        "front": "Why eager-mode quantization is manual",
        "back": "It has no graph, so YOU must place QuantStub/DeQuantStub, list fusion patterns by name, replace F.relu with module versions, and wrap residual adds in FloatFunctional. fx does all of it by traversal - and getting eager wrong leaves part of the model silently in float."
      }
    ],
    "refs": [
      {
        "title": "Reed et al. (2022), torch.fx: Practical Program Capture and Transformation for Deep Learning in Python",
        "url": "https://arxiv.org/abs/2112.08429"
      },
      {
        "title": "PyTorch: torch.fx documentation",
        "url": "https://pytorch.org/docs/stable/fx.html"
      },
      {
        "title": "PyTorch: FX Graph Mode Quantization",
        "url": "https://pytorch.org/docs/stable/quantization.html"
      },
      {
        "title": "Ioffe & Szegedy (2015), Batch Normalization",
        "url": "https://arxiv.org/abs/1502.03167"
      },
      {
        "title": "PyTorch: TorchDynamo overview - graph breaks and guards",
        "url": "https://pytorch.org/docs/stable/torch.compiler_deepdive.html"
      }
    ],
    "demos": [
      "pruning",
      "quantization",
      "batch-norm",
      "distillation"
    ]
  },
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
  },
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
    ]
  },
  "debugging-profiling": {
    "level": "core",
    "body": {
      "intuition": [
        "Every lesson in this module has ended the same way: the abstraction hid a mechanism, and when the mechanism fails there is no symptom that names it. This lesson is the method for that situation. Machine-learning bugs are unusually hard not because they are subtle but because THEY DO NOT ANNOUNCE THEMSELVES - a model with a third of its layers unregistered still trains, a loss with the wrong normalization still falls, a traced model still returns numbers. The training curve is a terrible detector, because almost everything produces a plausible one.",
        "So the practice is to build instruments rather than to reason harder. For performance, the instrument is the PROFILER TIMELINE - not a table of operator times, but the picture showing device work, host work, and memory over time, where the gaps are the finding. A slow training run has one of three causes and they look completely different on a timeline: the GPU is idle waiting for data, the GPU is busy but doing memory-bound work, or the GPU is repeatedly stalled by a synchronization your Python code did not know it was requesting. Each has a different fix and guessing between them wastes days.",
        "For correctness, the single most valuable technique is to OVERFIT ONE BATCH. Take four examples, turn off augmentation, regularization and shuffling, and train until the loss reaches essentially zero. If it cannot, the bug is in the model, the loss, or the optimizer - not in your data, your hyperparameters, or your learning-rate schedule, and you have eliminated most of the search space in about two minutes. If it can, the model is wired correctly and the problem is somewhere in the data pipeline or the generalization setup. That single test partitions the space more sharply than any other, it costs almost nothing, and it is skipped almost universally in favour of tuning."
      ],
      "math": [
        {
          "h": "The roofline: which resource are you actually limited by",
          "paras": [
            "A kernel's achievable performance is bounded by whichever runs out first - arithmetic throughput or memory bandwidth. Arithmetic intensity, the FLOPs performed per byte moved, decides which.",
            "This is what determines whether an optimization can help. Fusing kernels reduces bytes moved and does nothing for FLOPs, so it helps memory-bound work and not compute-bound work."
          ],
          "tex": "I = \\frac{\\text{FLOPs}}{\\text{bytes}}, \\qquad \\text{attainable} = \\min\\big(P_{\\text{peak}},\\; I \\cdot \\beta_{\\text{mem}}\\big)",
          "texNote": "Large matrix multiplications have high intensity and are compute-bound - they are what accelerators are designed for. Elementwise operations, normalizations, activations and reductions have intensity near one and are memory-bound, so their cost is the traffic rather than the arithmetic. A transformer step is a mix, which is why fusing the elementwise chains around the matmuls is worth real time and why the matmuls themselves are already near peak."
        },
        {
          "h": "Amdahl's law, and why you must measure first",
          "paras": [
            "If a component is a fraction p of total time and you speed it up by a factor s, the overall gain is bounded. Making a 20% component infinitely fast caps the total improvement at 25%.",
            "The practical consequence is that the ordering of your optimization work is determined entirely by the measurement, and optimizing without one has an expected payoff close to zero."
          ],
          "tex": "\\text{speedup} = \\frac{1}{(1-p) + p/s} \\;\\xrightarrow{\\;s\\to\\infty\\;}\\; \\frac{1}{1-p}",
          "texNote": "The number worth internalizing: a component you cannot see is a component you cannot bound. If the data pipeline is 60% of step time, every model optimization you make is competing for the remaining 40% - and the single measurement that would have told you takes ten minutes. This is the argument for profiling before optimizing stated quantitatively rather than as advice."
        },
        {
          "h": "Launch overhead: why many small kernels are the wrong shape",
          "paras": [
            "Each kernel launch has a fixed cost of a few microseconds. A model with thousands of small operations per step can spend more time launching than computing, and the GPU sits idle between launches.",
            "This is what fusion and CUDA graphs address - not by making the arithmetic faster, but by reducing the number of launches."
          ],
          "tex": "T_{\\text{step}} \\approx \\sum_i \\max\\big(\\ell_{\\text{launch}},\\; t_i\\big) \\;\\xrightarrow{\\;t_i \\ll \\ell\\;}\\; k \\cdot \\ell_{\\text{launch}}",
          "texNote": "When each kernel's execution is shorter than the launch overhead, step time is set by the NUMBER of operations rather than the work in them - and the signature on a timeline is unmistakable: a dense picket fence of tiny kernels with gaps between them. Small batch sizes make this worse, which is why a model can be launch-bound at batch 1 and compute-bound at batch 64."
        }
      ],
      "code": [
        {
          "h": "The profiler, and the timeline signatures worth recognizing",
          "paras": [
            "The table of operator times is the least useful output. The timeline is the artifact - the gaps and their cadence identify the problem faster than any aggregate."
          ],
          "code": "from torch.profiler import profile, schedule, ProfilerActivity\n\nwith profile(\n    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],\n    schedule=schedule(wait=1, warmup=2, active=3),   # SKIP the first steps -\n                                                     # they include autotuning,\n                                                     # allocator growth and\n                                                     # possibly compilation\n    on_trace_ready=torch.profiler.tensorboard_trace_handler(\"./log\"),\n    record_shapes=True, profile_memory=True, with_stack=True,\n) as prof:\n    for i in range(6):\n        train_step(); prof.step()\n\nprint(prof.key_averages().table(sort_by=\"self_cuda_time_total\", row_limit=15))\nprof.export_chrome_trace(\"trace.json\")     # <- open in chrome://tracing or\n                                           #    Perfetto. THIS is the artifact.\n\n# TIMELINE SIGNATURES - what the picture means:\n#\n#  GPU row mostly EMPTY, long gaps ............ INPUT-BOUND. The loader cannot\n#                                               keep up. Fix the pipeline; a\n#                                               faster model changes nothing.\n#  Regular SAWTOOTH of idle at a fixed cadence . A per-step SYNCHRONIZATION.\n#                                               Look for .item(), .cpu(), a\n#                                               print, or an `if` on a tensor\n#                                               value. It drains the pipeline.\n#  Dense PICKET FENCE of tiny kernels ......... LAUNCH-BOUND. Too many small\n#                                               ops. Fuse (torch.compile),\n#                                               raise the batch, or CUDA graphs.\n#  Few LONG kernels, GPU ~100% busy ........... COMPUTE-BOUND. You are using\n#                                               the machine. Now the levers are\n#                                               algorithmic or precision.\n#  Large memcpy bars ......................... unnecessary host-device traffic,\n#                                               or a non-contiguous tensor\n#                                               forcing a copy.\n#\n# THE 80/20: look at the GPU row's OCCUPANCY before reading any table. Whether\n# the device is busy answers the first question, and the tables answer the\n# second - in that order, never the reverse.",
          "caption": "Read the timeline before the table. Device occupancy answers the first question - is the GPU even working - and each idle pattern has a distinct cadence that names its cause, which no aggregate table can show."
        },
        {
          "h": "The correctness ladder, in the order that eliminates the most",
          "paras": [
            "Each rung eliminates a large region of the search space. Running them in order is what turns an open-ended investigation into a bounded one."
          ],
          "code": "# 1. OVERFIT ONE BATCH. The highest-value test in machine learning.\nx, y = next(iter(loader))\nmodel.train()\nfor _ in range(300):\n    loss = criterion(model(x), y); loss.backward(); opt.step(); opt.zero_grad()\nprint(loss.item())      # must reach ~0\n#\n#   CANNOT reach ~0 -> the bug is in the MODEL, LOSS, or OPTIMIZER. Not the\n#                      data, not the hyperparameters, not the schedule. You\n#                      have eliminated most of the search space in 2 minutes.\n#   CAN reach ~0    -> wiring is fine; look at the data pipeline, the\n#                      augmentation, the train/val split, or generalization.\n\n# 2. DO ALL PARAMETERS GET GRADIENT?\nloss.backward()\ndead = [n for n, p in model.named_parameters()\n        if p.requires_grad and (p.grad is None or p.grad.abs().sum() == 0)]\nprint(\"NO GRADIENT:\", dead)     # names an unregistered module, a detached\n                                # branch, or an accidentally frozen submodule\n\n# 3. SANITY-CHECK THE LOSS AT INITIALIZATION.\n#    C-class cross-entropy on a fresh model must be about ln(C). If it is not,\n#    the labels, the reduction, or the output layer is wrong - and this check\n#    takes one forward pass.\nprint(loss.item(), math.log(num_classes))\n\n# 4. FIND THE FIRST NaN.\nwith torch.autograd.set_detect_anomaly(True):    # very slow; use for one run\n    loss.backward()                              # raises AT the op that\n                                                 # produced it, with the\n                                                 # forward traceback\n\n# 5. TRUTHFUL CUDA TRACEBACKS: CUDA_LAUNCH_BLOCKING=1\n#    Launches are async, so an error surfaces wherever the host next\n#    synchronizes - not where it happened.\n\n# 6. BISECT AGAINST A REFERENCE. Disable one thing at a time and find where\n#    the behaviour changes: AMP off, compile off, one GPU instead of many,\n#    num_workers=0, augmentation off, deterministic algorithms on.\n#    Each is one line and each halves the space.",
          "caption": "Overfitting one batch is the highest-leverage test available and it is routinely skipped in favour of tuning. It partitions the problem into model-side and data-side in two minutes, which no amount of hyperparameter search can do."
        }
      ],
      "useCases": [
        "Any training run that is slower than expected, where the first question - is the GPU even busy - is answered in seconds and determines which of three unrelated investigations to start.",
        "A model that will not learn, where the overfit-one-batch test immediately separates a wiring bug from a data or generalization problem, and the no-gradient check names the specific parameter when it is the former.",
        "Cost reduction on a large training job, where Amdahl's law makes the profile the only defensible basis for choosing what to optimize - and where a 60% data pipeline invalidates every model-side improvement you were considering.",
        "Validating that an optimization did what you think: comparing profiles before and after a change is how you confirm that torch.compile actually fused something, that the overlap you configured is happening, or that a fusion pass ran at all."
      ],
      "pitfalls": [
        "Optimizing before profiling. Amdahl's law bounds your gain by the fraction you are improving, so effort spent on a component you have not measured has an expected payoff near zero - and a 60% data pipeline makes every model-side change nearly worthless.",
        "Timing without torch.cuda.synchronize. CUDA launches are asynchronous, so timing around them measures Python's enqueue rate rather than the work, and the error always flatters the GPU. Warm up first as well, since early iterations include autotuning and allocator growth.",
        "Profiling the first steps. They contain kernel autotuning, allocator segment growth, cuDNN benchmarking and possibly compilation, none of which represent steady state. Use the profiler schedule to skip and warm up.",
        "Reading the operator table before the timeline. The table tells you which kernels are expensive; the timeline tells you whether the GPU was doing anything at all. If the device is idle 70% of the time, the table is a ranking of the wrong things.",
        "Calling .item() every step. It is a full synchronization that drains the pipeline the CPU had built by running ahead, so you also lose the launch latency that was previously hidden. Accumulate on the device and transfer once per logging interval.",
        "Trusting a CUDA error's traceback. Asynchronous execution means the error surfaces wherever the host next synchronizes, which is usually not where it occurred. CUDA_LAUNCH_BLOCKING=1 makes it truthful at a large cost in speed.",
        "Tuning hyperparameters before checking that the model can overfit one batch. If it cannot, no hyperparameter will save it, and the search you are running is expensive noise around a wiring bug."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "The memory half of the same discipline: the snapshot recorder is to memory what the profiler timeline is to time, and both replace bisection with a picture that names the cause directly."
        },
        {
          "ref": "pytorch-internals/data-pipelines",
          "text": "The most common finding a profile produces. Input-bound training is under-diagnosed precisely because DataLoader hides the pipeline so thoroughly that people do not think to suspect it."
        },
        {
          "ref": "training-systems/torch-compile",
          "text": "The main fix for launch-bound and memory-bound work, since fusion reduces both the number of launches and the bytes moved. The profile before and after is how you confirm it did anything, and dynamo.explain is how you find the graph breaks limiting it."
        },
        {
          "ref": "pytorch-internals/custom-loss",
          "text": "Where the numerical failures come from, and where the single most useful permanent metric lives: logging the pre-clip gradient norm every step warns of instability long before the loss does."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The production continuation. Everything here is applied to a training run in front of you; monitoring applies the same instrument-first discipline to a system nobody is watching, where the failures are equally silent."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the first question when training is slow?",
          "a": "Is the GPU busy. Low utilization means you are input-bound or synchronization-bound and no model-side optimization will help."
        },
        {
          "q": "Why must you warm up before profiling?",
          "a": "The first iterations include kernel autotuning, cuDNN benchmarking, allocator segment growth and possibly compilation - none of which represent steady state."
        },
        {
          "q": "What does an idle GPU with long gaps mean?",
          "a": "Input-bound. The data pipeline cannot keep up, and the fix is in the loader rather than the model."
        },
        {
          "q": "What does a regular sawtooth of GPU idle mean?",
          "a": "A per-step synchronization - .item(), .cpu(), a print, or Python control flow on a tensor value - draining the pipeline the CPU had built by running ahead."
        },
        {
          "q": "What does a dense picket fence of tiny kernels mean?",
          "a": "Launch-bound. Each launch costs a few microseconds, so with thousands of small operations the step time is set by the count rather than the work."
        },
        {
          "q": "What is arithmetic intensity?",
          "a": "FLOPs per byte moved. High intensity means compute-bound; low means memory-bound, which is where fusion helps because it reduces traffic rather than arithmetic."
        },
        {
          "q": "What does Amdahl's law say about optimization?",
          "a": "Speeding up a component that is fraction p of the time caps your total gain at 1/(1-p). Making a 20% component infinitely fast buys at most 25%."
        },
        {
          "q": "What is the overfit-one-batch test?",
          "a": "Train on four examples with augmentation and regularization off until the loss reaches essentially zero. If it cannot, the bug is in the model, loss or optimizer."
        },
        {
          "q": "What should cross-entropy be at initialization?",
          "a": "About ln(C) for C classes. If it is not, the labels, the reduction, or the output layer is wrong - and it costs one forward pass to check."
        },
        {
          "q": "How do you find which parameters get no gradient?",
          "a": "After one backward, list parameters whose grad is None or all zero. That names an unregistered module, a detached branch, or an accidentally frozen submodule."
        },
        {
          "q": "What does set_detect_anomaly do?",
          "a": "Makes the backward pass raise at the operation that produced a NaN, with a traceback to where that operation was created. Very slow, so use it for one targeted run."
        },
        {
          "q": "What does CUDA_LAUNCH_BLOCKING=1 do?",
          "a": "Forces synchronization after every kernel launch, so CUDA errors surface at the operation that caused them rather than wherever the host next synchronized."
        }
      ],
      "standard": [
        {
          "q": "Your training run is slower than expected. Walk through the investigation.",
          "a": "MEASURE FIRST, because 'slow' names no cause and there are three unrelated ones with three unrelated fixes. And Amdahl's law makes this quantitative rather than advisory: if I optimize a component that is 20% of the time, my ceiling is a 25% improvement, so working without a measurement has an expected payoff near zero. STEP 1: IS THE GPU BUSY? Watch utilization for a minute. This takes seconds and it splits the problem immediately. Sustained low utilization means the device is waiting, so the model is not the problem. STEP 2: PROFILE, AND READ THE TIMELINE, NOT THE TABLE. The operator table ranks kernels by time and is the less useful output; the timeline shows device work, host work and memory over time, and the GAPS are the finding. Four signatures cover most cases. Long empty stretches on the GPU row: INPUT-BOUND, fix the loader. A regular sawtooth of idle at a fixed cadence: a per-step SYNCHRONIZATION - a .item(), a print, a NaN check, an if on a tensor value - draining the pipeline that the CPU had built by running ahead, so you lose both the wait and the previously-hidden launch latency. A dense picket fence of tiny kernels: LAUNCH-BOUND, where step time is set by the number of operations rather than the work in them. Few long kernels with the device busy: COMPUTE-BOUND, which means you are actually using the machine. STEP 3: SEPARATE THE COMPONENTS IF THE TIMELINE IS AMBIGUOUS. Time the data loader alone with the model removed, and time the step alone on one reused batch with synchronize on both sides. Those two numbers tell you the split directly. STEP 4: FIXES, MATCHED TO THE FINDING. Input-bound: more workers, cheaper transforms, a better storage format, decoding on the device - and note more workers is an inverted V, not monotone. Synchronization-bound: log less often, accumulate metrics on the device, remove tensor-valued conditionals from the hot loop. Launch-bound: torch.compile to fuse, a larger batch, or CUDA graphs to eliminate launch overhead entirely for a static shape. Compute-bound: now the levers are precision, better kernels such as fused attention, or an algorithmic change - and this is the only case where a faster model is the right answer. STEP 5: CONFIRM. Profile again and check the change did what you expected. This is skipped constantly and it is how people accumulate optimizations that did nothing. THE THING I WOULD EMPHASIZE. The most common finding is input-bound, and it is under-diagnosed precisely because DataLoader hides the pipeline so completely that people do not think to suspect it. I have seen weeks spent on model optimizations for a job that was waiting on JPEG decoding, and the measurement that would have redirected it takes ten minutes.",
          "deepDive": {
            "q": "The timeline shows the GPU busy but throughput is still poor. What now?",
            "a": "A busy GPU is not a productive GPU - it can be busy doing memory-bound work at a small fraction of peak arithmetic throughput. So the next question is WHICH RESOURCE is saturated. THE ROOFLINE FRAMING. Every kernel has an arithmetic intensity - FLOPs per byte moved - and its attainable performance is the lesser of peak compute and intensity times memory bandwidth. Large matrix multiplications have high intensity and run near peak; elementwise operations, normalizations, activations, and reductions have intensity near one and are limited entirely by bandwidth. A transformer step is a mixture, and a step dominated by the memory-bound half can keep the device 100% occupied while achieving a small fraction of its FLOPs. HOW I WOULD ESTABLISH IT. Compute the achieved FLOPs per second from the model's arithmetic and the measured step time, and compare against the device's spec. If you are at 15% of peak on a model that should be matmul-dominated, something is wrong. The profiler gives per-kernel time, and comparing the time spent in matmul kernels against everything else tells you the split directly - if the elementwise and normalization kernels together exceed the matmuls, you are memory-bound in aggregate. Nsight Compute gives achieved bandwidth and occupancy per kernel if you need to go further. THE FIXES FOR MEMORY-BOUND WORK, which is the usual finding. (1) FUSION. Chains of elementwise operations each read and write the full tensor; fusing them into one kernel moves the data once. torch.compile does this automatically and it is the highest-value single change for this pattern. (2) BETTER ALGORITHMS THAT REDUCE TRAFFIC RATHER THAN ARITHMETIC - flash attention is the canonical example, tiling so the attention matrix is never materialized, with identical arithmetic and far less traffic. (3) LOWER PRECISION, which halves the bytes moved and therefore directly speeds up memory-bound kernels - this is a large part of why bf16 helps beyond the tensor-core arithmetic. (4) LAYOUT: non-contiguous tensors force strided access or an explicit copy, and a stray permute or transpose before an operation can silently double the traffic. Check for unexpected contiguous calls in the profile. THE OTHER CAUSE OF BUSY-BUT-SLOW: SMALL KERNELS AT LOW OCCUPANCY. A kernel launched with too few blocks cannot fill the device's streaming multiprocessors, so it occupies the timeline while using a fraction of the hardware. Signature: batch size too small, or a model dimension that does not tile well. Fix: larger batch, or accept it and use CUDA graphs to at least remove the launch overhead between them. AND THE ONE PEOPLE MISS: the kernels may be the wrong ones. cuDNN algorithm selection, a convolution running a fallback because of an unusual shape or a channels-last mismatch, or an operation silently falling back to a generic implementation because of a dtype it does not have a fast path for. The profiler shows kernel NAMES, and a name containing 'fallback' or an unexpectedly generic kernel where you expected a tensor-core one is an immediate finding. THE HABIT. Compare against a theoretical bound rather than against your expectations. Knowing that a step should take X milliseconds given the arithmetic and the device's specification turns 'slower than expected' into a specific gap with a size, which is what makes the investigation terminate."
          }
        },
        {
          "q": "Your model is not learning - the loss is flat. How do you debug it?",
          "a": "I WOULD RUN A LADDER OF CHECKS IN THE ORDER THAT ELIMINATES THE MOST, because each one partitions the space and the whole thing takes about twenty minutes. RUNG 1: OVERFIT ONE BATCH. Take four examples, turn off augmentation, dropout, weight decay and shuffling, and train on them repeatedly until the loss reaches essentially zero. This is the highest-value test in machine learning and it is skipped almost universally. If the model CANNOT drive four examples to zero loss, the bug is in the MODEL, the LOSS, or the OPTIMIZER - and you have eliminated the data pipeline, the hyperparameters, the schedule, and generalization entirely. If it CAN, the wiring is correct and the problem is on the data side. Two minutes, and it halves the problem. RUNG 2: IS THE LOSS SENSIBLE AT INITIALIZATION? For C-class cross-entropy on an untrained model it must be about ln(C). If it is 12 when it should be 2.3, the labels are wrong, the reduction is wrong, or the output layer is producing something unexpected. One forward pass. RUNG 3: DO ALL PARAMETERS RECEIVE GRADIENT? After one backward, list every parameter whose grad is None or identically zero. This immediately names an unregistered submodule stored in a plain Python list, a branch that was detached, or a submodule frozen by accident. It is one comprehension and it gives you a parameter NAME rather than a symptom. RUNG 4: IS THE OPTIMIZER SEEING THE PARAMETERS? Compare the count in optimizer.param_groups against model.parameters(). An optimizer constructed before some modules were created, or given a filtered list, silently updates nothing. Also confirm the parameters actually CHANGE - take a norm before and after a step. RUNG 5: GRADIENT MAGNITUDE. Log the global gradient norm. If it is 1e-12 the signal is vanishing - check initialization, the activation functions, and whether a normalization layer is missing. If it is 1e8 it is exploding and the loss is probably about to go NaN. Both are visible immediately and neither is visible in the loss. RUNG 6: LEARNING RATE. Only now, because a wrong learning rate is what people check FIRST and it is rarely the cause of a completely flat loss. Sweep it over several orders of magnitude - a flat loss at every rate points back to rungs 1 to 4. RUNG 7: THE DATA. Print actual batches. Are the labels aligned with the inputs? Is normalization applied? Is the target in the range the loss expects? A shuffled label-input correspondence produces exactly a flat loss and is invisible in every metric. THE COMMON CAUSES, ranked by what I actually find. Missing zero_grad or a missing optimizer.step. An unregistered module. Labels misaligned. A learning rate far too small. A frozen backbone from a leftover requires_grad_(False). And forgetting model.train(), so dropout and batch norm are in the wrong mode. THE POINT OF THE LADDER. Each rung is cheap and eliminates a category. Working in this order means you never spend a day on hyperparameters for a model with a wiring bug, which is the failure mode this ladder exists to prevent."
        },
        {
          "q": "What would you log in every training run, and why?",
          "a": "I would separate metrics into three groups: what tells you the run is working, what warns you before it breaks, and what lets you diagnose afterwards. Most people log only the first group. GROUP 1 - IS IT WORKING. Training loss, validation loss, and the task metric. Necessary and almost useless for diagnosis, because nearly every bug produces a plausible loss curve. GROUP 2 - EARLY WARNING, and this is the group that earns its keep. (1) GRADIENT NORM, pre-clip. clip_grad_norm_ RETURNS it, so it is free, and it is the single best early indicator of instability - a rising gradient norm precedes a loss spike by hundreds of steps. (2) CLIP FRACTION - what proportion of steps are being clipped. Near zero means the guard does nothing; near one means clipping has replaced your update rule. (3) LEARNING RATE, actually read from the optimizer rather than from your schedule's intent, because a warmup or scheduler bug is invisible otherwise. (4) PARAMETER NORM, or its change per step. A parameter norm growing without bound, or a step size that is a large fraction of the parameter magnitude, is a problem in progress. (5) For policy or generative models, an ENTROPY or diversity measure, since collapse is silent in the loss. GROUP 3 - RESOURCE AND DIAGNOSIS. (1) Peak memory per step, with an alert on the trend - a leak found on day one is a five-minute fix, and the same leak found when a week-long run dies at hour 140 has cost the run. (2) Step time, and separately data time versus compute time, so a pipeline regression is visible. (3) GPU utilization. (4) Throughput in examples per second, which is the number that actually matters for cost. WHAT I WOULD LOG PERIODICALLY RATHER THAN EVERY STEP. Per-layer gradient norms, which localize a vanishing or exploding gradient to a specific depth. Activation statistics - mean, standard deviation, dead-unit fraction - which catch initialization and normalization problems the loss cannot show. Weight histograms. These are expensive enough to warrant a cadence of every few hundred steps. THE IMPLEMENTATION CONSTRAINT that matters. Every .item() is a synchronization that drains the pipeline, so logging every scalar every step can measurably slow training. Accumulate on the DEVICE and transfer once per logging interval - you get every step's contribution at one synchronization per interval. This is what well-optimized training loops do and it is why naive logging shows up as a sawtooth in a profile. WHAT I WOULD ADD FOR A LONG RUN SPECIFICALLY. A pre-declared capability suite or held-out evaluation on a fixed cadence, and enough checkpointing to resume - including the data loader's position, which is usually forgotten and means a resume silently re-trains on data already seen. THE PRINCIPLE. The metrics worth logging are the ones that move BEFORE the thing you care about moves. Loss is a lagging indicator of nearly every failure in this module; gradient norm, memory trend, and entropy are leading ones, and they are all nearly free.",
          "deepDive": {
            "q": "How would you build a regression test suite for a training pipeline?",
            "a": "The premise is that machine-learning failures are silent, so the tests worth writing are the ones that catch failures a training curve would not. I would build four tiers, fastest first. TIER 1 - STRUCTURAL, seconds, runs on every commit. Parameter count equals the expected arithmetic, which catches unregistered submodules, unintended weight sharing, and a config change that silently altered depth or width. Every parameter receives a non-zero gradient after one backward. Every parameter and buffer lands on the target device after .to(). A checkpoint round trip - save, construct fresh, load with strict=True, assert identical outputs on a fixed input - which catches missing buffers and non-deterministic construction. Output shapes for a couple of input shapes including batch size one. These are cheap, they are deterministic, and each targets a specific silent failure. TIER 2 - NUMERICAL CONTRACTS, seconds. Loss at initialization equals the theoretical value - ln(C) for C-class cross-entropy - which catches label and reduction errors. A masked loss is invariant to how much padding is in the batch, which catches the normalization bug. gradcheck in float64 for any custom autograd Function, since a hand-written backward is the one component whose failure is completely invisible. And a train-versus-eval difference test: a model with dropout must give different outputs across two train-mode calls and identical outputs in eval, which verifies the mode flag is actually wired through custom modules. TIER 3 - LEARNING BEHAVIOUR, a minute or two, runs on every pull request. OVERFIT A TINY BATCH: train on four examples for a few hundred steps and assert the loss falls below a threshold. This is the strongest single test of the whole pipeline - it exercises the model, the loss, the optimizer and the training loop together, and it fails if any of them is broken. Assert the parameters actually changed. And assert that a fixed seed gives a reproducible loss trajectory for a handful of steps, which catches accidental non-determinism entering the pipeline. TIER 4 - GOLDEN RUNS, minutes to hours, nightly. Train a small model on a small dataset to a known metric and assert it lands within a tolerance established from several seeds. This is the only tier that catches quality regressions from a library upgrade, a changed default, or a subtly wrong optimization, and it is the expensive one - so the tolerance must be set from the measured seed spread, not guessed, or it will be flaky and get disabled. Also record throughput and peak memory here and alert on regressions, since a performance regression is a real defect that no correctness test catches. WHAT I WOULD NOT DO. Put a long training run in the pull-request path; assert on exact floating-point values across hardware, since kernel differences make that flaky; or write tests that assert a metric improves, which is what research is for rather than what CI is for. THE SELECTION CRITERION, which is the transferable part. In ordinary software most failures are loud, so testing targets edge cases. In machine-learning code most failures are SILENT and still produce a plausible number, so testing should target the mechanisms the abstractions hide - registration, gradient flow, normalization, mode flags, serialization. That is a different criterion and it is why ML test suites that follow ordinary software instincts catch so little."
          }
        },
        {
          "q": "How do you debug a job that behaves differently in production than in development?",
          "a": "The productive framing is that something in the environment differs and I need to find WHICH, so the method is bisection over the differences rather than reasoning about the model. STEP 1: ENUMERATE WHAT ACTUALLY DIFFERS, in writing. Library versions - PyTorch, CUDA, cuDNN, the tokenizer, the preprocessing library. Hardware - a different GPU architecture selects different kernels and produces legitimately different numerics. Batch size, which changes BatchNorm statistics and can change the results of reductions. Precision - AMP on in one place and not the other. Model mode - eval versus train. Determinism flags. And the data path: preprocessing, normalization constants, image decoding library, resize interpolation, tokenizer version. STEP 2: FIND A REPRODUCIBLE DIFFERENCE ON ONE EXAMPLE. Take a single input, run it through both environments, and compare the OUTPUT. If they differ, the model or its inputs differ and I can bisect. If they agree, the model is fine and the difference is in aggregation, batching, or the evaluation itself - which is a completely different investigation and knowing that immediately is worth a great deal. STEP 3: BISECT THE PIPELINE, not just the model. Compare intermediate values: the raw input bytes, the decoded tensor, the normalized tensor, the model's first-layer output, the logits. The first point of divergence names the component. In my experience the most common answer is PREPROCESSING - different normalization constants, RGB versus BGR, a different resize interpolation, a tokenizer version mismatch. A correct model with different preprocessing is indistinguishable from a broken model in the metrics and far more likely. STEP 4: THE USUAL SUSPECTS, ranked by how often they are the answer. (1) model.eval() not called, so dropout is active and BatchNorm uses batch statistics - and at batch size one in production that produces garbage while working fine at batch 64 in development. (2) Preprocessing mismatch, per step 3. (3) A different library version changing a default - an interpolation mode, an initialization, a fused kernel's numerics. (4) BATCH SIZE affecting BatchNorm, or affecting a reduction's order enough to matter. (5) Missing no_grad or inference_mode, which is a memory and speed difference rather than a correctness one but presents as production being slow or running out of memory. (6) A checkpoint that did not fully load, because strict=False was used and the return value discarded. STEP 5: THE STRUCTURAL FIX. Pin the environment - a container image with exact versions - and run the SAME evaluation code in both places, driven by the same configuration. Most of these differences exist because development and production have separately-evolved code paths for what should be one path. WHAT I WOULD BUILD TO PREVENT RECURRENCE. A golden-output test that runs in both environments: fixed inputs, expected outputs recorded at export time, asserted on every deployment. That single artifact converts this whole class of problem from an investigation into an alert, and it is the thing that would have caught every cause in step 4."
        },
        {
          "q": "When is torch.compile worth using, and how do you tell whether it helped?",
          "a": "WHAT IT DOES, which determines when it helps. Dynamo captures graphs from Python bytecode, breaking the graph where it cannot proceed, and Inductor generates fused kernels. The gains come from two things: FUSING memory-bound elementwise chains so tensors are read and written once instead of once per operation, and REDUCING KERNEL LAUNCHES. Both of those target specific profile signatures, which is how you know in advance whether it can help. WHEN IT HELPS A LOT. A model dominated by many small elementwise operations - normalizations, activations, residual adds, scaling - which is most of a transformer block outside the matmuls. A model that is launch-bound, showing a picket fence of tiny kernels. Small batch sizes, where launch overhead is a large fraction. Anything where the profile shows the GPU busy on low-intensity work. WHEN IT HELPS LITTLE OR NOT AT ALL. A model already dominated by large matrix multiplications running near peak - there is nothing to fuse and the launches are already amortized. A job that is INPUT-BOUND, where the GPU is idle and making it faster changes nothing. A model with many graph breaks, since fusion only happens within a graph. And anything where the dominant cost is communication. HOW I WOULD TELL WHETHER IT HELPED - and this is where people go wrong. (1) BENCHMARK CORRECTLY: warm up generously, because the first calls include compilation which can be tens of seconds, and synchronize around the timing. Comparing a compiled first iteration against an eager one measures compilation, not speed. (2) MEASURE STEADY-STATE THROUGHPUT over many steps, not a single step. (3) CHECK THE GRAPH BREAKS with torch._dynamo.explain, which reports how many graphs were produced and WHY each break happened. If your model compiled into forty graphs, most of the benefit is gone and the breaks are the thing to fix - usually a print, a data-dependent branch, or a call into a library Dynamo cannot trace. (4) WATCH FOR RECOMPILATION. Dynamo guards its specializations and recompiles on a miss, so varying input shapes can trigger repeated recompilation that costs more than the fusion saves. The logs report this, and dynamic=True is the fix when shapes genuinely vary. (5) PROFILE BEFORE AND AFTER and confirm the kernel count dropped and the elementwise time shrank. If the profile looks the same, nothing was fused regardless of what the wall clock says. THE COSTS TO WEIGH. Compilation time, which matters for short jobs and for interactive development. Debuggability inside the compiled region. Occasional numerical differences from fusion changing operation order - usually within tolerance, and worth verifying rather than assuming. And a longer feedback loop, since every code change triggers recompilation. WHAT I WOULD ACTUALLY DO. Profile first to see whether the signature is one compile can address. Try it - it is one line. Measure steady-state throughput properly. Check the graph-break count and fix the cheap ones. And verify numerics against eager on real inputs before shipping it, because a fusion that changes results outside tolerance is a correctness issue that no speed measurement reveals."
        },
        {
          "q": "What makes debugging machine-learning code different from debugging ordinary software?",
          "a": "THE CENTRAL DIFFERENCE: MOST FAILURES ARE SILENT. In ordinary software a bug usually produces an exception, a wrong output you can check against a specification, or a test failure. In machine-learning code, a model with a third of its layers unregistered still trains. A loss with the wrong normalization still falls. A traced model with a baked-in branch still returns numbers. A wrong hand-written backward still converges, slightly worse. The system's primary output - a loss curve - is a terrible detector, because almost every bug produces a plausible one. THE CONSEQUENCES FOR METHOD, which is what the difference actually implies. (1) YOU CANNOT RELY ON THE PROGRAM TELLING YOU. So you build instruments: the profiler timeline, the memory snapshot, gradient norms, parameter counts, activation statistics. The work shifts from reading errors to constructing observations. (2) TESTS MUST TARGET MECHANISMS, not behaviour. Asserting that a parameter count matches, that every parameter receives gradient, that a masked loss is invariant to padding - these check the machinery the abstractions hide, which is where the silent failures are. Ordinary software testing instincts, which target edge cases and error paths, catch very little here. (3) STOCHASTICITY BREAKS BISECTION. Two runs differ legitimately, so 'it got worse' may be seed variance rather than your change. You must establish the run-to-run spread before you can attribute anything, and that measurement is skipped constantly. (4) THE FEEDBACK LOOP IS LONG. A bug that manifests after six hours of training cannot be debugged by iteration, which is why the cheap early checks - overfit one batch, sanity-check the loss at initialization - have such high value: they move detection from hour six to minute two. (5) THE BUG MAY BE IN THE SPECIFICATION. A model that does something surprising is frequently optimal for a reward or loss you did not intend to write, which is a category that does not exist in ordinary software - the program is correct and the requirement was wrong, and no amount of code inspection finds it. THE PRACTICES THAT FOLLOW, in order of value. Overfit one batch, always, first - it separates model-side from data-side in two minutes. Assert structural properties in tests. Log leading indicators - gradient norm, memory trend - not just the lagging loss. Compare against a reference implementation or a previous run rather than against your expectations. And bisect over the ENVIRONMENT, since so many problems are a version, a mode flag, or a preprocessing constant rather than the model. WHAT I WOULD SAY LAST. This module has been a tour of abstractions that hide mechanisms - registration, the caching allocator, graph capture, collectives - and every one of them fails without a symptom that names it. That is not a criticism of the abstractions, which earn their keep. It is an argument that the corresponding skill is knowing what each one hid and having an instrument ready for it, which is a different skill from the one ordinary debugging teaches."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The overfit-one-batch test",
        "back": "4 examples, augmentation/regularization/shuffling OFF, train to ~0 loss. CANNOT -> the bug is in MODEL/LOSS/OPTIMIZER (data, hyperparameters and schedule eliminated). CAN -> wiring is fine, look at the data pipeline. Two minutes, halves the search space, almost universally skipped."
      },
      {
        "type": "formula",
        "front": "Amdahl's law",
        "back": "speedup = 1/((1-p) + p/s) -> 1/(1-p). Making a 20% component INFINITELY fast caps the total gain at 25%. This is 'profile before optimizing' stated quantitatively - work on an unmeasured component has expected payoff near zero."
      },
      {
        "type": "intuition",
        "front": "Four timeline signatures",
        "back": "Long EMPTY GPU stretches = input-bound. Regular SAWTOOTH of idle = a per-step SYNCHRONIZATION (.item(), print, tensor-valued `if`). Dense PICKET FENCE of tiny kernels = launch-bound. Few LONG kernels, GPU busy = compute-bound. Read the timeline BEFORE the table."
      },
      {
        "type": "formula",
        "front": "Roofline / arithmetic intensity",
        "back": "I = FLOPs/bytes; attainable = min(peak_compute, I * bandwidth). Matmuls = high I, compute-bound, near peak. Elementwise/norms/reductions = I~1, MEMORY-bound. Fusion reduces BYTES not FLOPs - so it helps the second and not the first."
      },
      {
        "type": "intuition",
        "front": "A busy GPU is not a productive GPU",
        "back": "It can be 100% occupied doing memory-bound work at a small fraction of peak FLOPs. Compute achieved FLOP/s from the model's arithmetic and the step time, and compare to spec. 15% of peak on a matmul-dominated model means something is wrong."
      },
      {
        "type": "definition",
        "front": "The loss-at-initialization check",
        "back": "C-class cross-entropy on an untrained model must be ~ln(C). If it is 12 when it should be 2.3, the labels, the reduction, or the output layer is wrong. One forward pass, and it catches a whole category."
      },
      {
        "type": "intuition",
        "front": "The no-gradient sweep",
        "back": "After one backward, list parameters where grad is None or all-zero. It NAMES an unregistered submodule (the plain-list bug), a detached branch, or an accidentally frozen module - a parameter name instead of a symptom. One comprehension."
      },
      {
        "type": "pitfall",
        "front": "Profile the WARM steps only",
        "back": "The first iterations include kernel autotuning, cuDNN benchmarking, allocator segment growth, and possibly compilation. Use profiler schedule(wait, warmup, active). And synchronize around any manual timing, or you measure Python's enqueue rate."
      },
      {
        "type": "intuition",
        "front": "Log LEADING indicators, not just loss",
        "back": "Loss is a LAGGING indicator of nearly every failure. Gradient norm (free from clip_grad_norm_), clip fraction, actual LR read from the optimizer, parameter norm, memory trend, and entropy all move BEFORE the loss does."
      },
      {
        "type": "pitfall",
        "front": "Logging can slow training measurably",
        "back": "Every .item() is a full SYNCHRONIZATION that drains the pipeline the CPU built by running ahead. Accumulate metrics on the DEVICE and transfer once per interval - you keep every step's contribution at one sync per interval."
      },
      {
        "type": "definition",
        "front": "The correctness ladder",
        "back": "(1) overfit one batch (2) loss = ln(C) at init (3) every param gets gradient (4) optimizer sees all params and they CHANGE (5) gradient norm sane (6) THEN learning rate (7) print actual batches. LR is what people check first and is rarely the cause of a FLAT loss."
      },
      {
        "type": "intuition",
        "front": "Why ML debugging differs from software debugging",
        "back": "Most failures are SILENT and still produce a plausible loss curve. So: build INSTRUMENTS rather than read errors; test MECHANISMS not behaviour; establish seed spread before attributing anything; and remember the bug may be in the SPECIFICATION - a category ordinary software does not have."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: torch.profiler documentation",
        "url": "https://pytorch.org/docs/stable/profiler.html"
      },
      {
        "title": "PyTorch: Profiler recipe and trace analysis",
        "url": "https://pytorch.org/tutorials/recipes/recipes/profiler_recipe.html"
      },
      {
        "title": "Karpathy (2019), A Recipe for Training Neural Networks",
        "url": "http://karpathy.github.io/2019/04/25/recipe/"
      },
      {
        "title": "Williams, Waterman & Patterson (2009), Roofline: An Insightful Visual Performance Model",
        "url": "https://dl.acm.org/doi/10.1145/1498765.1498785"
      },
      {
        "title": "PyTorch: Frequently Asked Questions - debugging CUDA errors and memory",
        "url": "https://pytorch.org/docs/stable/notes/faq.html"
      }
    ],
    "demos": [
      "optimizers",
      "gradient-clipping",
      "batch-norm",
      "mixed-precision"
    ]
  },
  "mini-framework": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This module has been a tour of abstractions that hide mechanisms: registration hides the parameter tree, the caching allocator hides memory, tracing hides that your model is a program, collectives hide synchronization. Each one fails silently, and each lesson was about knowing what was hidden. The capstone is to build the abstractions yourself, at which point nothing is hidden - and every silent failure from the earlier lessons becomes obvious rather than memorized.",
        "The whole thing is smaller than people expect. A reverse-mode autodiff engine is about thirty lines: a value that remembers the operation that produced it, a topological sort, and a backward pass that accumulates gradients in reverse order. A Module system is an __setattr__ that dispatches on type. SGD is one line and Adam is four. A trainer is a loop with the steps in the right order. Together that is a few hundred lines that will train a real network, and writing them once converts a great deal of received knowledge into things you can derive.",
        "The specific payoff is that each component explains one of this module's bugs. Writing __setattr__ makes it immediate why a plain Python list of Modules is invisible - you can see that nothing put it in the dictionary the walk reads. Writing the topological sort makes it clear why the graph is freed after backward, why retain_graph exists, and why holding a loss tensor keeps everything alive. Writing Adam makes the sixteen-bytes-per-parameter accounting concrete, because you allocate the two moment buffers yourself. And writing the trainer makes the ordering of accumulate, unscale, clip and step something you derived rather than something you copied. The honest caveat is that you should not ship this - the real framework carries an enormous amount of correctness and performance work you will not reproduce - but you will read and debug it far better afterwards."
      ],
      "math": [
        {
          "h": "Why reverse mode, and what it costs",
          "paras": [
            "Automatic differentiation applies the chain rule mechanically. The choice is the ORDER of the products: forward mode propagates derivatives with respect to one input forward; reverse mode propagates derivatives of one output backward.",
            "For a function from many parameters to one scalar loss, reverse mode gives every partial derivative in a single pass, while forward mode would need one pass per parameter. That asymmetry is the entire reason training is feasible."
          ],
          "tex": "\\frac{\\partial L}{\\partial \\theta_i} = \\sum_{\\text{paths}} \\prod_{\\text{edges}} \\frac{\\partial \\text{out}}{\\partial \\text{in}} \\\\[4pt] \\text{forward: } O(n)\\ \\text{passes for } n \\text{ inputs}, \\qquad \\text{reverse: } O(1)\\ \\text{pass, } O(\\text{graph})\\ \\text{memory}",
          "texNote": "The trade is time for memory: reverse mode must keep the intermediate values that the backward pass needs, which is why activations dominate the training memory budget and why gradient checkpointing - recompute rather than store - is the lever that exists. Forward mode has no such cost and is the right choice when you have few inputs and many outputs, which is not the shape of neural network training."
        },
        {
          "h": "The backward pass is a topological sort",
          "paras": [
            "Each value remembers the operation that produced it and its inputs, forming a directed acyclic graph. Backward visits nodes in reverse topological order, so a node's gradient is complete before it is propagated onward.",
            "Accumulation rather than assignment is essential: a value used in two places receives a contribution from each path, and summing them is exactly the multivariable chain rule."
          ],
          "tex": "\\bar{v} = \\sum_{u \\in \\text{consumers}(v)} \\bar{u}\\,\\frac{\\partial u}{\\partial v}, \\qquad \\text{visit } v \\text{ only after every consumer}",
          "texNote": "Two things fall out of this that people otherwise memorize. Reverse topological order is why gradients arrive at the LAST layers first, which is what lets DDP overlap its all-reduce with the rest of the backward pass. And gradients ACCUMULATE into .grad rather than overwrite, which is why zero_grad exists at all and why gradient accumulation over micro-batches needs no special support."
        },
        {
          "h": "Adam, and where the memory goes",
          "paras": [
            "An exponential moving average of the gradient and of its square, each bias-corrected, giving a per-parameter step size. Writing it makes the memory accounting concrete rather than quoted.",
            "The two state buffers are the same shape as the parameters, which is where twelve of the sixteen bytes per parameter come from."
          ],
          "tex": "m_t = \\beta_1 m_{t-1} + (1-\\beta_1) g_t, \\quad v_t = \\beta_2 v_{t-1} + (1-\\beta_2) g_t^2 \\\\[4pt] \\theta_t = \\theta_{t-1} - \\eta\\,\\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t} + \\epsilon}, \\qquad \\hat{m}_t = \\frac{m_t}{1-\\beta_1^t}",
          "texNote": "The bias correction matters most in the first steps: m and v start at zero, so without it the early updates are heavily damped, which is a real effect and part of why warmup is often unnecessary with Adam but essential with plain SGD. Note also that decoupled weight decay - AdamW - applies the decay directly to the parameters rather than adding it to the gradient, because adding it to the gradient means the adaptive denominator scales it differently per parameter, which is not what regularization is supposed to do."
        }
      ],
      "code": [
        {
          "h": "A complete autodiff engine, in about thirty lines",
          "paras": [
            "Every value remembers how it was produced. Backward walks the graph in reverse topological order and accumulates. That is the whole idea, and each line explains a behaviour from earlier lessons."
          ],
          "code": "class Value:\n    def __init__(self, data, parents=(), backward=lambda: None):\n        self.data, self.grad = data, 0.0\n        self._parents, self._backward = parents, backward   # <- the GRAPH\n\n    def __add__(self, o):\n        out = Value(self.data + o.data, (self, o))\n        def back():\n            self.grad += out.grad          # ACCUMULATE, never assign - a value\n            o.grad    += out.grad          # used twice gets both contributions.\n        out._backward = back               # THIS is why zero_grad exists.\n        return out\n\n    def __mul__(self, o):\n        out = Value(self.data * o.data, (self, o))\n        def back():\n            self.grad += o.data * out.grad\n            o.grad    += self.data * out.grad\n        out._backward = back\n        return out\n\n    def backward(self):\n        order, seen = [], set()\n        def topo(v):                       # TOPOLOGICAL SORT\n            if v in seen: return\n            seen.add(v)\n            for p in v._parents: topo(p)\n            order.append(v)\n        topo(self)\n        self.grad = 1.0                    # dL/dL\n        for v in reversed(order):          # reverse order => a node's gradient\n            v._backward()                  # is COMPLETE before it propagates\n\n# WHAT THIS EXPLAINS, from earlier lessons:\n#   * '+=' not '=' -> gradients ACCUMULATE -> zero_grad is required, and\n#     gradient accumulation over micro-batches needs no special support.\n#   * The closure captures `self` and `o` -> holding the output tensor keeps\n#     the ENTIRE graph alive. That is the losses.append(loss) leak, visible.\n#   * reversed(order) -> gradients arrive at the LAST layers FIRST, which is\n#     exactly what lets DDP overlap its all-reduce with the backward pass.\n#   * PyTorch FREES the graph after backward, so a second call fails - which\n#     is what retain_graph=True suppresses, and why needing it is usually a\n#     sign you are reusing a graph you meant to rebuild.",
          "caption": "Thirty lines, and four behaviours you would otherwise memorize become derivable: why zero_grad is needed, why holding a loss tensor leaks the graph, why gradients arrive back-to-front, and what retain_graph is suppressing."
        },
        {
          "h": "Module registration, an optimizer, and the training loop's ordering",
          "paras": [
            "The registration mechanism is one method. The optimizer makes the memory accounting concrete. And the loop's ordering is something you can now derive rather than copy."
          ],
          "code": "class Module:\n    def __setattr__(self, name, value):\n        if isinstance(value, (Parameter, Module)):\n            self._children[name] = value      # <-- THE registration mechanism\n        object.__setattr__(self, name, value)\n\n    def parameters(self):                     # a recursive walk over _children\n        for v in self._children.values():\n            yield from ([v] if isinstance(v, Parameter) else v.parameters())\n#\n# NOW IT IS OBVIOUS why self.layers = [Linear(), Linear()] fails: a list is\n# not a Parameter or a Module, so nothing puts it in _children, so the walk\n# never reaches it. It is not a quirk - there is no mechanism by which it\n# COULD be found. nn.ModuleList exists to route it into that dictionary.\n\nclass Adam:\n    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8):\n        self.p = list(params)\n        self.m = [zeros_like(p) for p in self.p]   # <-- 4 bytes/param\n        self.v = [zeros_like(p) for p in self.p]   # <-- 4 bytes/param\n        self.t = 0                                 # THE memory accounting,\n                                                   # allocated by your own hand\n    def step(self):\n        self.t += 1\n        for p, m, v in zip(self.p, self.m, self.v):\n            m[:] = b1 * m + (1 - b1) * p.grad\n            v[:] = b2 * v + (1 - b2) * p.grad ** 2\n            mh, vh = m / (1 - b1 ** self.t), v / (1 - b2 ** self.t)\n            p.data -= lr * mh / (vh ** 0.5 + eps)\n\n# THE LOOP, with every ordering derivable from what you just built:\nfor i, batch in enumerate(loader):\n    with autocast():\n        loss = criterion(model(batch.x), batch.y) / ACCUM   # divide: gradients\n    scaler.scale(loss).backward()                           # ACCUMULATE (the +=)\n    if (i + 1) % ACCUM == 0:\n        scaler.unscale_(opt)          # BEFORE clipping - else the threshold is\n                                      # compared against scaled gradients\n        gn = clip_grad_norm_(model.parameters(), 1.0)   # returns PRE-clip norm:\n        scaler.step(opt); scaler.update()               # log it, it is free\n        opt.zero_grad(set_to_none=True)   # required BECAUSE of the '+=' above\n\n# WHAT YOU SHOULD NOT DO: ship this. The real framework carries broadcasting\n# semantics, in-place version counting, device dispatch, memory formats, fused\n# kernels, and thousands of person-years of correctness work. The value here is\n# that you will now READ and DEBUG that framework far better.",
          "caption": "Writing __setattr__ makes the plain-list bug structural rather than surprising - there is no mechanism by which the walk could find it. And allocating Adam's two moment buffers by hand is where the sixteen-bytes-per-parameter figure stops being a quotation."
        }
      ],
      "useCases": [
        "Learning, which is the honest primary use - building the engine once converts a large amount of received knowledge into things you can derive, and the understanding transfers directly to reading and debugging the real framework.",
        "Interviews and teaching, where implementing reverse-mode autodiff from scratch is a standard exercise and the ability to explain why gradients accumulate, why the graph is freed, and why reverse mode is the right choice separates understanding from familiarity.",
        "Constrained environments - embedded targets, unusual hardware, an educational setting - where a few hundred lines you fully control is preferable to a large dependency, accepting that you are giving up performance and correctness coverage.",
        "Research on the training loop itself: a minimal framework is a good substrate for experimenting with optimizers, schedules, or gradient manipulations without fighting the abstractions of a production trainer."
      ],
      "pitfalls": [
        "Assigning rather than accumulating gradients. A value used in two places must receive a contribution from each path, and summing them IS the multivariable chain rule. Assignment silently drops one path's gradient, which trains and converges worse.",
        "Visiting nodes in the wrong order in backward. A node's gradient must be complete before it propagates, so the traversal must be reverse topological - not simply depth-first from the output, which can propagate a partial gradient and produce a subtly wrong result.",
        "Forgetting bias correction in Adam. The moments start at zero, so without it the first steps are heavily damped - and the effect is largest exactly when the model is most sensitive to its early trajectory.",
        "Adding weight decay to the gradient rather than applying it to the parameters. The adaptive denominator then scales the decay differently per parameter, which is not what regularization is meant to do - this is precisely the distinction AdamW exists to fix.",
        "Building the graph with reference cycles. A node holding its parents and a closure capturing the node makes cycles that Python's reference counting cannot collect, so memory is released only when the cyclic collector runs - a real design consideration in a hand-built engine.",
        "Shipping it. A hand-built framework lacks broadcasting semantics, in-place version counting to detect corrupted graphs, device dispatch, memory formats and fused kernels, and each of those is a class of bug you will rediscover slowly.",
        "Concluding that because it was easy, the real framework is over-engineered. Almost all of PyTorch's complexity is correctness in edge cases and performance on real hardware - the ideas are simple and the engineering is not, and conflating the two is the standard mistake after this exercise."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/custom-autograd",
          "text": "The same engine from the other side - there you extend PyTorch's autograd with a Function; here you build the machinery that Function plugs into, which makes the ctx and save_for_backward conventions obvious rather than arbitrary."
        },
        {
          "ref": "pytorch-internals/nn-module-patterns",
          "text": "Writing __setattr__ makes that lesson's central bug structural: a plain list is not a Parameter or a Module, so nothing puts it in the registry, so no recursive walk can reach it. There is no mechanism by which it could work."
        },
        {
          "ref": "neural-nets/backprop",
          "text": "The mathematical foundation - reverse-mode automatic differentiation is the chain rule with the products associated in the order that costs one pass for a scalar output, which is why training is feasible at all."
        },
        {
          "ref": "neural-nets/adam-lr-scheduling",
          "text": "Where the optimizer's behaviour is developed properly. Implementing it here makes the two moment buffers - and therefore the memory accounting quoted throughout this module - something you allocated rather than something you were told."
        },
        {
          "ref": "pytorch-internals/cuda-memory",
          "text": "Reverse mode's cost is memory for the intermediates, which is why activations dominate the training budget and why gradient checkpointing exists as the lever. Building the engine makes that trade visible rather than asserted."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is reverse-mode autodiff used for training?",
          "a": "For a function from many parameters to one scalar loss, reverse mode gives every partial derivative in one pass. Forward mode would need one pass per parameter."
        },
        {
          "q": "What does reverse mode cost?",
          "a": "Memory. It must keep the intermediate values the backward pass needs, which is why activations dominate the training memory budget and why gradient checkpointing exists."
        },
        {
          "q": "What is stored in the computation graph?",
          "a": "Each value remembers the operation that produced it and its inputs, forming a directed acyclic graph that backward traverses in reverse topological order."
        },
        {
          "q": "Why must backward use reverse topological order?",
          "a": "So a node's gradient is complete - every consumer has contributed - before it is propagated onward. Plain depth-first traversal can propagate a partial gradient."
        },
        {
          "q": "Why do gradients accumulate rather than overwrite?",
          "a": "A value used in several places receives a contribution from each path, and summing them is the multivariable chain rule. It is also why zero_grad exists."
        },
        {
          "q": "Why does gradient accumulation over micro-batches need no special support?",
          "a": "Because backward already accumulates into .grad. Skipping zero_grad between micro-batches is the entire implementation."
        },
        {
          "q": "Why does holding a loss tensor leak memory?",
          "a": "The backward closures capture the inputs, so keeping the output keeps the whole graph alive. That is the classic losses.append(loss) leak seen from inside."
        },
        {
          "q": "Why do gradients arrive at the last layers first?",
          "a": "Reverse topological order starts from the output. This is what lets DDP launch a bucket's all-reduce during backward and overlap communication with computation."
        },
        {
          "q": "What is retain_graph suppressing?",
          "a": "PyTorch frees the graph's buffers after backward, so a second call fails. Needing retain_graph usually means you are reusing a graph you meant to rebuild."
        },
        {
          "q": "Why does Adam need bias correction?",
          "a": "The moments start at zero, so early estimates are biased toward zero and the first updates would be heavily damped without the 1/(1-beta^t) factors."
        },
        {
          "q": "Where do Adam's twelve bytes per parameter come from?",
          "a": "Two fp32 moment buffers of the parameter's shape, four bytes each, plus the fp32 master copy in mixed-precision training."
        },
        {
          "q": "Why is AdamW's decoupled weight decay better?",
          "a": "Adding decay to the gradient makes the adaptive denominator scale it differently per parameter. Applying it directly to the weights keeps regularization uniform."
        }
      ],
      "standard": [
        {
          "q": "Implement reverse-mode autodiff and explain each design decision.",
          "a": "THE STRUCTURE. Each value carries its data, a gradient slot, a reference to the values it was computed from, and a closure that knows how to propagate a gradient to those inputs. Operations construct a new value and attach that closure. Calling backward on a scalar performs a topological sort of the graph reachable from it, seeds the output's gradient to one, and then invokes each node's closure in REVERSE topological order. That is about thirty lines. DECISION 1: WHY REVERSE MODE. Automatic differentiation is the chain rule applied mechanically, and the only choice is the order in which you associate the products. Forward mode propagates derivatives with respect to ONE INPUT forward through the graph, so it costs one pass per input. Reverse mode propagates the derivative of ONE OUTPUT backward, so it costs one pass per output. Training has millions of inputs - the parameters - and one output - the scalar loss - so reverse mode gives every partial derivative in a single pass while forward mode would need millions. That asymmetry is why training is feasible at all. The price is memory: reverse mode must retain the intermediate values the backward closures need, which is exactly why activations dominate the training memory budget and why gradient checkpointing is the lever that exists. DECISION 2: WHY REVERSE TOPOLOGICAL ORDER, not simply depth-first from the output. A node's gradient is the SUM over all its consumers. If you propagate from a node before every consumer has contributed, you propagate a partial gradient and the result is subtly wrong - it would still train, slightly worse, with nothing to indicate it. The topological sort guarantees every consumer is visited first. DECISION 3: WHY ACCUMULATE RATHER THAN ASSIGN. A value used in two places - a residual connection, a shared embedding, a tied weight - receives a contribution along each path, and summing them IS the multivariable chain rule. Two consequences follow immediately and they are usually memorized rather than derived: zero_grad exists because gradients accumulate, and gradient accumulation over micro-batches needs no special support at all, since skipping zero_grad is the whole implementation. DECISION 4: THE CLOSURE CAPTURES ITS INPUTS, which means holding the output keeps the entire graph alive. That is the losses.append(loss) memory leak seen from the inside, and it is why PyTorch frees the graph's buffers after backward - and therefore why a second backward fails and retain_graph exists to suppress that. WHAT THE REAL IMPLEMENTATION ADDS. Broadcasting, which means a backward must SUM over the broadcast dimensions to return a gradient of the input's shape - the single most common bug in a hand-built engine. In-place operation version counting, so autograd can detect that a tensor it needs was modified and raise rather than compute silently wrong gradients. Device dispatch, memory formats, and fused kernels. The IDEAS here are simple; the engineering around correctness and performance is not, and the standard mistake after this exercise is to conclude the framework is over-engineered.",
          "deepDive": {
            "q": "What breaks when you add broadcasting, and how do you handle it?",
            "a": "THE PROBLEM. Broadcasting lets a (3, 1) tensor add to a (3, 4) tensor by implicitly expanding the first. The forward is straightforward. The backward is where a naive implementation is wrong: the output gradient has shape (3, 4), and the gradient with respect to the (3, 1) input must have shape (3, 1) - so the broadcast dimensions must be SUMMED OVER, not passed through. WHY IT IS EASY TO GET WRONG. If you write the addition backward as 'pass the output gradient to both inputs unchanged', which is correct for same-shaped tensors and is what everyone writes first, then with broadcasting you return a (3, 4) gradient for a (3, 1) parameter. Depending on your implementation this either raises a shape error - fine, you find it - or, worse, silently broadcasts again during the optimizer update, producing a parameter of the wrong shape or an update using the wrong values. In a hand-built engine backed by numpy, the silent path is the common one, because numpy will happily broadcast in the update too. THE RULE, which is worth stating precisely. If an input of shape A was broadcast to output shape B, the gradient must be reduced from B back to A by summing over every dimension where A was 1 or absent. Concretely: sum over the leading dimensions that A did not have at all, then sum with keepdim over the dimensions where A had size 1 while B had size greater than 1. A small helper applied at the end of every elementwise backward handles it uniformly, and factoring it out is the right design rather than reimplementing it per operation. WHY SUMMING IS CORRECT MATHEMATICALLY. Broadcasting is a COPY operation: the single value is used in several output positions. From the earlier discussion, a value used in several places accumulates a contribution from each - so summing over the broadcast axis is exactly the accumulate rule applied to an implicit copy. That is a satisfying consistency and it is the reason to think of broadcasting as an operation with a backward rather than as a shape convenience. THE RELATED CASES that break the same way. Reductions are the transpose of broadcasting: a sum's backward must BROADCAST the output gradient back to the input's shape, and a mean's backward must additionally divide by the number of elements reduced. Indexing and gather need a scatter-add in backward, and it must be an accumulating scatter, because an index can appear more than once - using a plain assignment scatter silently drops all but one contribution, which is the same accumulate-versus-assign error one level up. Matrix multiplication with batched or broadcast dimensions needs the same reduction treatment. HOW I WOULD CATCH ALL OF IT. gradcheck against numerical differentiation, in float64, on tensors with DELIBERATELY MISMATCHED shapes - (3,1) against (3,4), a scalar against a matrix, an index array containing repeats. A gradient engine tested only on same-shaped inputs passes everything and is wrong on the first real model. That test design point is the transferable lesson: test the shapes that exercise the machinery, not the shapes that are convenient."
          }
        },
        {
          "q": "What does building a Module system teach you about the real one?",
          "a": "THE MECHANISM IS ONE METHOD. __setattr__ intercepts every assignment and dispatches on type: a Parameter goes into the parameter registry, a Module into the child registry, anything else into the ordinary instance dictionary. parameters() is then a recursive walk over those registries, and to(), state_dict(), train() and zero_grad are the same walk with different work at each node. WHAT BECOMES OBVIOUS IMMEDIATELY. The plain-list bug stops being a quirk and becomes structural. self.layers = [Linear(), Linear()] assigns a LIST, which is not a Parameter and not a Module, so the dispatch sends it to the ordinary dictionary, so nothing put it in the registry, so no recursive walk can possibly reach it. There is no mechanism by which it COULD work. And nn.ModuleList's entire purpose becomes clear: it is a Module whose children are the list's contents, so assigning it routes them into the registry. Once you have written the dispatch, you can predict which containers work without looking it up. WHAT ELSE FALLS OUT. Buffers need a separate registry because they must participate in to() and state_dict but NOT in parameters() - so a plain tensor attribute cannot work, and register_buffer is not ceremony. state_dict's keys are dotted paths because the walk builds them by concatenating attribute names as it recurses, which is why renaming an attribute invalidates every checkpoint. Weight tying works with no special handling because parameters() deduplicates by identity as it walks. And train() and eval() are just a flag set recursively, which explains why only layers that READ the flag - dropout and normalization - change behaviour. WHAT THE REAL ONE ADDS, and it is a lot. Hooks at several points in the walk. Lazy modules that infer shapes on the first call. Device and dtype conversion that handles every tensor type correctly. Serialization compatibility across versions. Sharing semantics for distributed training. Integration with fx and torch.compile, which need the registry to be a traversable structure - and note that this is exactly why an unregistered submodule is invisible to fx as well as to the optimizer. It is the same registry, so it is the same bug. THE DESIGN LESSON WORTH TAKING AWAY. The whole system rests on one interception point, and every convenience - device movement, checkpointing, optimization, graph capture - is a different traversal of one data structure. That is a good design: it is small, it is uniform, and its failure mode is a single well-defined thing, namely something not being in the structure. The cost is that the failure is SILENT, because a Python object assigned to an attribute is a perfectly normal thing to do and there is nowhere to raise. Understanding that trade is the point of building it - the abstraction is not badly designed, it is designed with a known and unavoidable hole, and knowing where the hole is is the skill."
        },
        {
          "q": "Write the training loop and justify every ordering decision.",
          "a": "THE LOOP, and every step's placement follows from something in this module. (1) FORWARD, inside an autocast region if using mixed precision - autocast chooses per-operation precision, keeping numerically sensitive operations such as softmax, normalization and reductions in fp32 while running matmuls in bf16 or fp16. (2) DIVIDE THE LOSS BY THE ACCUMULATION COUNT. Because backward ACCUMULATES into .grad - which you know from building the engine - k micro-batches without dividing gives you k times the gradient and therefore k times the effective learning rate. This usually presents as divergence a few hundred steps in rather than as an obvious error. (3) BACKWARD, scaled by the GradScaler if using fp16. The scale exists because fp16 gradients below about 6e-8 flush to zero, so you multiply the loss up to move them into representable range. bf16 needs none of this, having fp32's exponent range. (4) ONLY ON THE ACCUMULATION BOUNDARY: unscale, clip, step, zero. (5) UNSCALE BEFORE CLIPPING. The gradients still carry the scaler's factor - typically tens of thousands - so comparing them against a clip threshold of 1.0 is meaningless and the clip never fires. You have silently disabled your instability guard. (6) CLIP, and LOG THE RETURNED NORM, which is the pre-clip value and the single best early-warning signal for instability, available for free. Also log the clip fraction: near zero means the guard does nothing, near one means clipping has replaced your update rule. (7) STEP. (8) ZERO_GRAD with set_to_none=True, which frees the gradient tensors rather than zeroing them in place - and which is required in the first place BECAUSE backward accumulates. THE ORDERING QUESTIONS PEOPLE GET WRONG. zero_grad before backward or after step is equivalent as long as it happens once per accumulation cycle; putting it inside the accumulation loop defeats accumulation entirely, which is a silent bug producing a smaller effective batch than intended. The scheduler steps per OPTIMIZER step, not per micro-batch, or your schedule runs k times too fast. And in DDP, the non-final micro-batches must be wrapped in no_sync, or you all-reduce on every micro-step instead of once - a large and easily-fixed waste. WHAT ELSE BELONGS IN A REAL LOOP. Checkpointing that saves the model, the optimizer state, the scheduler, the scaler, the epoch AND the data loader position - the last is usually forgotten and means a resume silently re-trains on data already seen. Evaluation wrapped in both eval() and no_grad(), which are orthogonal and both required. Logging accumulated on the device and transferred once per interval, since every .item() is a synchronization that drains the pipeline. And a non-finite guard before the step, so one bad batch does not poison every parameter. THE POINT OF DERIVING RATHER THAN COPYING. Every one of these orderings is a consequence of something mechanical - accumulation in the engine, the scaler's factor, the collective's placement. Copying a loop means each is arbitrary and a refactor can silently break it; deriving them means you can tell when a rearrangement is safe, which is what you need when adapting the loop to a new setting.",
          "deepDive": {
            "q": "What must a checkpoint contain for a bit-identical resume, and what usually gets forgotten?",
            "a": "THE OBVIOUS CONTENTS. Model state_dict, optimizer state_dict - which carries Adam's moment buffers and the step count that drives bias correction - the learning-rate scheduler's state, the GradScaler's state including its current scale and its growth tracker, and the epoch and step counters. Most checkpointing code has these. WHAT GETS FORGOTTEN, in rough order of how often it bites. (1) THE DATA LOADER POSITION. Resuming restarts the epoch, so the model re-trains on data it has already seen and skips data it has not. For epoch-based training on a small dataset this is a minor distortion; for SINGLE-PASS training on a very large corpus, where you never reach an epoch boundary, it is a serious correctness problem - you can resume five times and never see the last third of your data. Fixing it means recording, per data-parallel rank and per worker, which shard and which offset within it, which is real work and is why it is skipped. (2) RNG STATE - Python's random, numpy's, torch's CPU and CUDA generators, and the per-worker states. Without them the augmentation and dropout sequences differ after resume, so the run is not the same run. Bit-identical resume is impossible without this. (3) THE SCALER'S STATE specifically. It is easy to save the model and optimizer and forget the scaler, which then restarts at its initial scale and takes several skipped steps to re-converge - a small but real discontinuity that shows as a bump in the loss right after every resume. (4) EMA OR TEACHER WEIGHTS, if you keep an exponential moving average or a target network. These are not in the model's state_dict and are silently reinitialized. (5) THE CONFIGURATION ITSELF, so you can verify the resumed run matches - I would save it and assert on load rather than trusting that nobody changed a flag. WHAT MAKES BIT-IDENTICAL RESUME IMPOSSIBLE ANYWAY, which is worth being honest about. Non-deterministic CUDA kernels using atomic accumulation, where floating-point addition's non-associativity means the order matters and the order is not fixed. cuDNN algorithm selection under benchmark mode. And in distributed training, the reduction order within a collective. So the achievable target is usually 'statistically equivalent' rather than 'bitwise identical', and I would state which one the project needs - the honest version being that most projects need the loss curve to continue smoothly, not the bits to match. THE TEST I WOULD WRITE, because this is otherwise never verified. Train N steps, checkpoint, train N more, and record the loss trajectory. Separately: train N steps, checkpoint, RESTART the process, load, train N more. Compare the two trajectories. If the resumed one diverges immediately or shows a discontinuity at the resume point, something is missing - and the size and shape of the discontinuity usually identifies which of the five items above it is. That test takes an hour to write and it is the only thing that catches a resume bug before it costs you a long run."
          }
        },
        {
          "q": "Why do frameworks exist? What would you actually lose by using your own?",
          "a": "IT IS WORTH ANSWERING SERIOUSLY, because the exercise of building one tends to produce the conclusion that the real thing is over-engineered, and that conclusion is wrong. WHAT YOU LOSE, in order of how quickly it hurts. (1) PERFORMANCE, by one to two orders of magnitude. Fused kernels, cuDNN and cuBLAS, tensor-core paths, memory-format optimization, the caching allocator, kernel autotuning. A hand-built engine on numpy is not slightly slower, it is unusable for anything real. (2) CORRECTNESS IN EDGE CASES, which is most of the actual engineering. Broadcasting semantics in every backward. In-place operation version counting so autograd detects a tensor it needed was modified, rather than silently computing wrong gradients. Numerical stability in the fused losses. Correct behaviour at zero-size tensors, at extreme values, at every dtype combination. Each of these is a bug you WILL rediscover, slowly, and several of them are silent. (3) HARDWARE COVERAGE. CPU, several GPU vendors, TPUs, Apple silicon, quantized paths, each with its own kernels. (4) THE ECOSYSTEM, which is the largest practical loss. Distributed training, mixed precision, profiling tools, checkpointing, the model hub, every library that expects an nn.Module. Writing your own means writing all of it. (5) MAINTENANCE. New hardware, new operations, new optimizers, security fixes - forever. WHAT THE EXERCISE IS ACTUALLY FOR, and I would be clear that it is not a build-versus-buy question. The value is that you can now READ the framework. When autograd raises about a tensor modified in place, you know what version counting is and why it exists. When memory grows because you appended a loss tensor, you know the closure captured the graph. When a submodule does not train, you know the registration dispatch could not have found it. When DDP overlaps communication with backward, you know it is because reverse topological order delivers the last layers' gradients first. Each of those is a debugging session you now finish in minutes instead of hours. WHEN A MINIMAL IMPLEMENTATION IS GENUINELY RIGHT. An embedded or unusual target where the dependency does not exist. A teaching setting. Research ON the training machinery itself, where fighting a production trainer's abstractions costs more than reimplementing the parts you need. And occasionally a narrow production case - a fixed small model on a constrained device - where a few hundred lines you fully control beats a large dependency. Those are real and they are narrow. THE JUDGEMENT I WOULD OFFER. The IDEAS in a deep learning framework are simple enough to implement in an afternoon; the ENGINEERING is thousands of person-years of correctness and performance work. Conflating those two is the standard error after this exercise, and avoiding it is part of what the exercise should teach. The right conclusion is not that PyTorch is over-built - it is that you now know which of its complexity is essential and which is convenience, which is exactly the knowledge that makes you able to work with it rather than against it."
        },
        {
          "q": "Which of this module's silent failures does building the framework explain?",
          "a": "This is the capstone question and the answer is essentially all of them, which is the point of doing it. THE PLAIN-LIST BUG, from nn.Module patterns. Writing __setattr__ shows the dispatch: a list is not a Parameter and not a Module, so it goes to the ordinary instance dictionary, so no recursive walk can reach it. It is not a quirk to memorize - there is no mechanism by which it could work, and nn.ModuleList's entire job is to route the contents into the registry. THE LOSS-APPEND LEAK, from CUDA memory. Writing the backward closure shows it captures its inputs, so holding the output tensor keeps the whole graph alive. Once you have written that closure, losses.append(loss) is obviously a leak rather than a rule you were given. WHY zero_grad EXISTS, and why gradient accumulation needs no support. The engine accumulates with += because a value used twice must receive both contributions - that IS the multivariable chain rule. So gradients pile up unless cleared, and skipping the clear across micro-batches is the entire implementation of accumulation. WHY retain_graph EXISTS. The graph's buffers are freed after backward, so a second call fails - and knowing that, you also know that needing retain_graph usually means you are reusing a graph you meant to rebuild. WHY DDP CAN OVERLAP COMMUNICATION WITH BACKWARD, from distributed primitives. Reverse topological order means the LAST layers' gradients complete first, so their bucket can be all-reduced while the earlier layers are still computing. That is not an implementation detail of DDP, it is a consequence of the traversal order. THE MEMORY ACCOUNTING, quoted throughout the module as sixteen bytes per parameter. Allocating Adam's two moment buffers by hand makes twelve of those bytes something you did rather than something you read, and that number is what every technique in the memory lesson is fighting. THE TRAINING-LOOP ORDERING - divide by accumulation, unscale before clip, zero after step. Each follows from the accumulation rule and from the scaler's factor, so they are derivable rather than copied, and you can tell when a rearrangement is safe. WHY ACTIVATIONS DOMINATE TRAINING MEMORY. Reverse mode must retain the intermediates its closures need. That single fact explains why gradient checkpointing is the lever for the activation term and why inference needs so much less memory than training. WHAT IT DOES NOT EXPLAIN, to be fair. The caching allocator's fragmentation behaviour, tracing's baked-in branches, and the collective-hang failure are all about the SYSTEM around the engine rather than the engine itself, and you have to learn those separately - which is why they got their own lessons. THE SUMMARY I WOULD GIVE. The module's argument was that every abstraction hides a mechanism that fails silently. Building the abstractions is the most direct way to stop them being hidden, and the fact that so many of the earlier bugs become derivable from thirty lines of autodiff and one __setattr__ is the strongest evidence that the mechanisms really were simple all along - they were just invisible."
        },
        {
          "q": "How would you extend a minimal framework to support gradient checkpointing?",
          "a": "IT IS A GOOD TEST OF WHETHER YOU UNDERSTAND THE ENGINE, because it requires intervening in the graph rather than adding an operation. THE IDEA. Reverse mode retains every intermediate the backward closures need, and that is what makes activations the dominant training memory term. Checkpointing trades compute for memory: run a segment of the network WITHOUT recording a graph, save only its inputs, and when the backward pass reaches that segment, RE-RUN it with recording enabled to rebuild the local graph, then backpropagate through it. THE IMPLEMENTATION in the minimal engine. A checkpoint wrapper around a function f and its inputs would: (1) in forward, run f with graph recording DISABLED and return the output as a value whose parents are the inputs, saving those inputs; (2) attach a backward closure that, when invoked, re-enables recording, re-runs f on the saved inputs to construct the segment's graph locally, seeds that graph with the incoming output gradient, runs backward through it, and returns the resulting input gradients. So the segment's intermediates exist only during its own backward and are freed immediately after. THE COST. One extra forward pass over the checkpointed segments, so roughly 30 to 40% more compute for the whole run if you checkpoint everything. THE DETAIL THAT MATTERS MOST, and that people get wrong: it must be SEGMENTED. Checkpointing every individual layer stores a boundary tensor for every layer, which is nearly what you were storing anyway - the saving is negligible. With L layers in segments of size s you store L/s boundaries and recompute s layers at a time, which is minimized at s of about the square root of L, giving O(sqrt(L)) activation memory. That is the classic sublinear-memory result and it is entirely about the segment size. THE CORRECTNESS TRAPS, which are real and are why the library version has so much machinery. (1) NON-DETERMINISM. If the segment contains dropout or any randomness, the recomputed forward must produce the SAME random values as the original, or the gradients correspond to a different function than the one that produced the output. The fix is capturing and restoring the RNG state around the recomputation - which the real implementation does and a naive one forgets, producing gradients that are subtly wrong and still train. (2) SIDE EFFECTS. If the segment updates something - BatchNorm's running statistics being the obvious case - the recomputation updates them a SECOND time, so your statistics advance at twice the intended rate. Also handled explicitly in the real implementation. (3) NON-TENSOR INPUTS and outputs need care about what is saved and what is reconstructed. (4) IT INTERACTS WITH OTHER MEMORY TECHNIQUES: under QLoRA the recomputed forward dequantizes the 4-bit weights a second time, so the combined cost is worse than either technique alone suggests. THE POINT OF THE EXERCISE. Checkpointing looks like a feature and it is actually a small, principled intervention in the graph - decline to record, then rebuild on demand. Being able to implement it is good evidence you understand what the graph is for, and the traps are a good illustration of why the production version is larger than the idea."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why reverse mode, not forward mode",
        "back": "Forward costs one pass per INPUT; reverse costs one pass per OUTPUT. Training has millions of parameters and ONE scalar loss - so reverse gives every partial in a single pass. The price is MEMORY for the intermediates, which is why activations dominate the training budget."
      },
      {
        "type": "intuition",
        "front": "Backward is a reverse TOPOLOGICAL sort",
        "back": "A node's gradient is the SUM over its consumers, so it must be complete before it propagates - plain depth-first from the output can propagate a partial gradient and be subtly wrong. And reverse order means the LAST layers finish first, which is what lets DDP overlap its all-reduce."
      },
      {
        "type": "intuition",
        "front": "'+=' not '=' explains three things",
        "back": "A value used twice gets a contribution from each path - that IS the multivariable chain rule. Consequences: zero_grad must exist; gradient accumulation over micro-batches needs NO special support (just skip zero_grad); and assigning instead silently drops a path."
      },
      {
        "type": "intuition",
        "front": "Why the plain-list bug is structural, not a quirk",
        "back": "__setattr__ dispatches on TYPE: Parameter -> registry, Module -> registry, anything else -> the ordinary __dict__. A list is neither, so nothing put it in the registry, so no recursive walk CAN reach it. nn.ModuleList's whole job is routing the contents in."
      },
      {
        "type": "intuition",
        "front": "The backward closure captures its inputs",
        "back": "Which is why holding the output tensor keeps the ENTIRE graph alive - losses.append(loss) seen from inside the engine. It is also why PyTorch frees the graph after backward, and therefore what retain_graph=True is suppressing."
      },
      {
        "type": "formula",
        "front": "Adam, and where 12 bytes/param come from",
        "back": "m = b1*m + (1-b1)*g; v = b2*v + (1-b2)*g^2; theta -= lr*mhat/(sqrt(vhat)+eps) with mhat = m/(1-b1^t). The TWO fp32 moment buffers are 4 bytes each, plus the fp32 master copy = 12. You allocate them by hand."
      },
      {
        "type": "intuition",
        "front": "Why bias correction matters",
        "back": "m and v start at ZERO, so early estimates are biased toward zero and the first updates would be heavily damped without 1/(1-beta^t). Largest effect exactly when the model is most sensitive to its early trajectory."
      },
      {
        "type": "pitfall",
        "front": "AdamW's decoupling",
        "back": "Adding weight decay to the GRADIENT means the adaptive denominator scales it differently per parameter - which is not what regularization should do. AdamW applies decay directly to the weights instead."
      },
      {
        "type": "pitfall",
        "front": "Broadcasting is where hand-built engines break",
        "back": "If input shape A broadcast to output shape B, the gradient must be SUMMED back from B to A. Naive 'pass the gradient through' returns the wrong shape - and with numpy it may silently broadcast again in the update. Broadcasting is a COPY, so summing is just the accumulate rule."
      },
      {
        "type": "pitfall",
        "front": "Gradient checkpointing must be SEGMENTED",
        "back": "Checkpointing every layer stores a boundary per layer and saves almost nothing. Segments of ~sqrt(L) give O(sqrt(L)) memory for ~one extra forward. Traps: RNG state must be restored for the recompute (or dropout differs), and BN running stats get updated TWICE."
      },
      {
        "type": "intuition",
        "front": "The training loop's ordering is derivable",
        "back": "Divide loss by ACCUM (because backward accumulates) -> backward -> UNSCALE before clip (else the threshold meets scaled gradients and never fires) -> clip (log the returned PRE-clip norm) -> step -> zero_grad (needed BECAUSE of the '+='). Nothing here is arbitrary."
      },
      {
        "type": "intuition",
        "front": "What you'd actually lose writing your own framework",
        "back": "1-2 orders of magnitude of PERFORMANCE (fused kernels, cuBLAS, the allocator), plus edge-case CORRECTNESS (broadcasting backwards, in-place version counting, numerical stability), hardware coverage, and the ecosystem. The IDEAS are an afternoon; the ENGINEERING is person-centuries."
      }
    ],
    "refs": [
      {
        "title": "Baydin et al. (2018), Automatic Differentiation in Machine Learning: a Survey",
        "url": "https://arxiv.org/abs/1502.05767"
      },
      {
        "title": "Paszke et al. (2019), PyTorch: An Imperative Style, High-Performance Deep Learning Library",
        "url": "https://arxiv.org/abs/1912.01703"
      },
      {
        "title": "Karpathy, micrograd - a minimal scalar-valued autograd engine",
        "url": "https://github.com/karpathy/micrograd"
      },
      {
        "title": "Kingma & Ba (2015), Adam: A Method for Stochastic Optimization",
        "url": "https://arxiv.org/abs/1412.6980"
      },
      {
        "title": "Loshchilov & Hutter (2019), Decoupled Weight Decay Regularization (AdamW)",
        "url": "https://arxiv.org/abs/1711.05101"
      }
    ],
    "demos": [
      "backprop",
      "optimizers",
      "lr-schedule",
      "neural-playground"
    ]
  }
};
