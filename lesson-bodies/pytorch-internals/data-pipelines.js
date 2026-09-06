// GENERATED from content/lessons/pytorch-internals/data-pipelines.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/pytorch-internals/data-pipelines/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

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
    ],
    "demoTitles": {
      "reservoir-sampling": "Reservoir Sampling",
      "batching": "Dynamic Batching",
      "image-augmentation": "Data Augmentation",
      "importance-sampling": "Importance Sampling"
    }
  }
};
