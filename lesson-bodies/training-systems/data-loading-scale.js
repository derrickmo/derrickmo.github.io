// GENERATED from content/lessons/training-systems/data-loading-scale.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/training-systems/data-loading-scale/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "data-loading-scale": {
    "level": "core",
    "body": {
      "intuition": [
        "At single-machine scale the data pipeline is a tuning question. At cluster scale it is a capacity-planning question, and the first thing to do is arithmetic: how many bytes per second must reach the accelerators to keep them busy? Multiply the samples per second the devices can consume by the bytes per sample, times the number of devices. For a vision job on decoded images that is often gigabytes per second; for language-model pretraining on pre-tokenized data it is far less. That single number tells you whether your storage can possibly work, and it is computable before you write any code.",
        "The design decision that follows dominates everything else: RANDOM ACCESS TO REMOTE STORAGE IS FATAL. A random read from object storage has latency in the tens of milliseconds, and a small file on a network filesystem is not much better, because the metadata operation costs as much as the data. If your Dataset performs one remote read per sample, no number of workers rescues you - you are bounded by latency times concurrency, not by bandwidth. The fix is to convert random access into SEQUENTIAL access by packing samples into shards of a few hundred megabytes and streaming them. That one change is routinely worth an order of magnitude and it is the difference between a pipeline that scales and one that does not.",
        "Sequential streaming then costs you the ability to shuffle by index, which you replace with two levels: permute the SHARD LIST each epoch, and maintain a SHUFFLE BUFFER within the stream. The buffer size is a quality knob and it is under-examined - if consecutive samples in a shard are correlated, which they usually are because shards are built from ordered sources, a small buffer gives you correlated batches and a training signal that is not what you think. The honest framing for the whole lesson is that this is an exchange like every other in the module: you are buying throughput with randomness, with preprocessing done ahead of time, and sometimes - in data echoing - with sample freshness. Each of those has a measurable cost and the rates depend on your data."
      ],
      "math": [
        {
          "h": "The throughput budget, computed before anything is built",
          "paras": [
            "The pipeline must deliver bytes at least as fast as the accelerators consume samples. Everything else - format, caching, worker count - is in service of this one inequality.",
            "Computing it first tells you immediately whether the storage tier you are planning to use is viable at all."
          ],
          "tex": "R_{\\text{required}} = \\underbrace{N_{\\text{dev}}}_{\\text{devices}} \\times \\underbrace{\\frac{B}{t_{\\text{step}}}}_{\\text{samples/s per device}} \\times \\underbrace{s_{\\text{bytes}}}_{\\text{bytes/sample}}",
          "texNote": "Worked example: 64 devices at 8 steps per second with batch 32 and 150 KB per decoded image is about 2.5 GB/s sustained. That is beyond a single network filesystem mount and comfortably within aggregate object-storage bandwidth IF the access pattern is sequential. Note what the formula makes obvious: storing pre-decoded images multiplies s_bytes by an order of magnitude versus storing JPEGs, trading network bandwidth for CPU decode - which is the first exchange in this lesson."
        },
        {
          "h": "Why random access loses, in one comparison",
          "paras": [
            "Remote storage has high latency and high bandwidth. A random-read pipeline is bounded by latency divided by concurrency; a sequential-read pipeline is bounded by bandwidth. Those are different regimes by orders of magnitude.",
            "The consequence is that the fix is structural - change the access pattern - rather than a matter of adding workers."
          ],
          "tex": "R_{\\text{random}} \\approx \\frac{c \\cdot s_{\\text{bytes}}}{\\ell}, \\qquad R_{\\text{seq}} \\approx \\beta_{\\text{net}} \\qquad (\\ell \\sim 10\\text{--}100\\,\\text{ms})",
          "texNote": "With c concurrent requests, latency l of 20 ms and 150 KB samples, you need hundreds of concurrent requests to reach even 1 GB/s - and each is a separate connection with its own overhead. Streaming a 500 MB shard reaches the same rate with one request. This is why every large-scale pipeline is shard-based, and why the number of FILES matters more than the number of bytes."
        },
        {
          "h": "Shuffle quality from a buffer",
          "paras": [
            "With a buffer of size M over a stream, two samples that were adjacent in the shard can only be separated by about M positions. So the buffer bounds how far correlation can be broken.",
            "The practical requirement is that the buffer must be large compared with the correlation length in the source ordering, not merely large compared with the batch."
          ],
          "tex": "\\Pr[\\text{two source-adjacent samples land in the same batch}] \\;\\approx\\; \\frac{B}{M} \\quad (M \\gg B)",
          "texNote": "So a buffer of 10,000 with batch 256 still puts source-adjacent samples in the same batch about 2.5% of the time - fine if the source order is arbitrary, and a real problem if shards are ordered by class, by document, or by time. The measurement that settles it is the label or source distribution WITHIN consecutive batches, which is one histogram and is almost never checked."
        }
      ],
      "code": [
        {
          "h": "Compute the budget, then shard correctly across ranks and workers",
          "paras": [
            "The budget is arithmetic you should do before choosing a format. The sharding is where correctness bugs live, and the rule is to assign shards rather than samples so sequential reading survives."
          ],
          "code": "def budget(n_dev, batch, step_s, bytes_per_sample):\n    r = n_dev * (batch / step_s) * bytes_per_sample\n    print(f\"{r/2**30:.2f} GiB/s sustained required\")\n#  64 devices, batch 32, 8 steps/s, 150 KB decoded images -> ~2.5 GiB/s.\n#  Beyond one NFS mount; fine for object storage IF reads are SEQUENTIAL.\n\nclass ShardStream(IterableDataset):\n    def __init__(self, shards, seed=0):\n        self.shards, self.seed = shards, seed\n        self.epoch = 0\n\n    def __iter__(self):\n        info = get_worker_info()\n        w, W = (info.id, info.num_workers) if info else (0, 1)\n        r, R = dist.get_rank(), dist.get_world_size()\n        k, K = r * W + w, R * W                 # this reader's index of K total\n\n        # SHUFFLE THE SHARD LIST, seeded on (base, epoch) so every reader\n        # agrees and it is reproducible:\n        g = random.Random((self.seed, self.epoch))\n        shards = self.shards[:]; g.shuffle(shards)\n\n        # ASSIGN SHARDS, NOT SAMPLES. Each shard is read by exactly ONE reader,\n        # so the sequential access pattern - the whole point - survives.\n        # Sharding by sample would make every reader touch every shard.\n        for s in shards[k::K]:\n            yield from read_sequentially(s)\n\n# UNEVEN SHARDS HANG A DDP JOB: every rank must join every all-reduce, so a\n# rank that runs out early blocks the others forever.\n#   TRAINING   -> PAD by repeating shards so all readers get the same count\n#   EVALUATION -> DROP the remainder; duplicates would corrupt the metric\n# Assert it at startup: all-reduce the local shard count with MIN and MAX and\n# require them equal. One line, prevents the most common distributed hang.",
          "caption": "Assign shards, not samples - sharding by sample makes every reader touch every shard and destroys the sequential access the format was chosen for. And assert equal shard counts at startup, because unequal counts hang rather than error."
        },
        {
          "h": "Two-level shuffling, and the exchange you can make when still input-bound",
          "paras": [
            "Streaming costs you index-based shuffling. The replacement has a quality knob that needs measuring rather than assuming, and if the pipeline still cannot keep up there is one more exchange available."
          ],
          "code": "def shuffle_buffer(stream, M=10_000, rng=random):\n    buf = []\n    for item in stream:\n        buf.append(item)\n        if len(buf) >= M:\n            i = rng.randrange(len(buf))\n            buf[i], buf[-1] = buf[-1], buf[i]\n            yield buf.pop()\n    rng.shuffle(buf); yield from buf\n\n# THE DIAGNOSTIC nobody runs: is the shuffle actually working?\nfor batch in islice(loader, 20):\n    print(Counter(batch.labels).most_common(3))\n#   If a batch is mostly one class, the buffer is too small RELATIVE TO THE\n#   CORRELATION LENGTH in the source order. Shards built from ordered sources -\n#   by class, by document, by date - need a buffer spanning several shards'\n#   worth of samples, not merely several batches' worth.\n\n# THE CACHE TIERS, in the order they pay off:\n#   object store  -> epoch 1 only, if the local cache holds the dataset\n#   local NVMe    -> epoch 2+; often the single biggest win available\n#   page cache    -> free, and why a second epoch is faster than the first\n#   GPU decode    -> when CPU decode is the bottleneck (nvJPEG / DALI)\n\n# PREPROCESSING PLACEMENT is an exchange between storage and CPU:\n#   OFFLINE  (tokenize once, store token ids)   -> more storage, no per-epoch\n#                                                  CPU. Right for LLM text.\n#   ONLINE   (decode + augment every epoch)     -> less storage, CPU every\n#                                                  epoch. Required when the\n#                                                  augmentation must be random.\n\n# STILL INPUT-BOUND? DATA ECHOING: reuse each loaded batch e times before\n# fetching the next. You trade sample FRESHNESS for utilization - and if the\n# GPU was idle, repeated data beats no data. Measure in epochs-to-target, not\n# steps: echoing needs more steps and can still finish sooner in wall-clock.",
          "caption": "The shuffle diagnostic is a single Counter over consecutive batches and it is almost never run - a buffer sized against the batch rather than against the source's correlation length produces correlated batches silently."
        }
      ],
      "useCases": [
        "Large-scale pretraining, where the corpus lives in object storage and the pipeline must sustain gigabytes per second across many nodes - the setting where shard-based streaming is not an optimization but the only design that works.",
        "Multi-node vision training, where JPEG decoding is frequently the true bottleneck and the decision is between pre-decoding to storage, decoding on the GPU, or accepting a lower device utilization.",
        "Any job where nvidia-smi shows sustained low utilization, which is more common than teams expect and where the input pipeline is the most frequently overlooked cause and the cheapest to fix once identified.",
        "Single-pass training over a corpus larger than one epoch, where checkpointing the data position per reader is a correctness requirement rather than a convenience - without it, a resume silently re-trains on data already seen."
      ],
      "pitfalls": [
        "One remote read per sample. Object-storage latency is tens of milliseconds, so a random-access pipeline is bounded by latency and concurrency rather than bandwidth, and no number of workers fixes it. Pack into sequential shards of a few hundred megabytes.",
        "Sharding by sample rather than by shard. Every reader then touches every shard, destroying the sequential access pattern the format exists to provide - which converts a bandwidth-bound pipeline back into a latency-bound one.",
        "Unequal shard counts across readers. A rank that runs out early stops joining the gradient all-reduce and the job HANGS rather than erroring. Pad by repeating for training, drop the remainder for evaluation, and assert equality at startup.",
        "Sizing the shuffle buffer against the batch rather than against the correlation length in the source order. Shards built from ordered data need a buffer spanning several shards' worth of samples, or consecutive batches are correlated and the training signal is not what you think.",
        "Never measuring the shuffle. One Counter over the labels of twenty consecutive batches settles it, and it is almost never run - so correlated batches go undetected and present as a mysterious quality difference.",
        "Ignoring the file count. Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones even at identical total bytes - and the small-file case can be slower by an order of magnitude.",
        "Not checkpointing the data position. Resuming restarts the epoch, so the model re-trains on data already seen and never reaches the tail - which is a minor distortion for epoch-based training and a serious correctness problem for single-pass training on a very large corpus."
      ],
      "connections": [
        {
          "ref": "pytorch-internals/data-pipelines",
          "text": "The single-machine mechanics this builds on - worker processes, collation, pinning, and the sharding of an IterableDataset. That lesson is about the DataLoader's internals; this one is about the storage and network above it."
        },
        {
          "ref": "training-systems/profiling",
          "text": "How you establish that you are input-bound in the first place, which is the precondition for any of this. The GPU-idle question is answered in seconds and it determines whether this lesson is relevant to your job at all."
        },
        {
          "ref": "pytorch-internals/distributed-primitives",
          "text": "Why unequal shards hang rather than error: every rank must participate in every collective, so a rank that finishes early blocks the rest until the timeout. The data-side fix is padding or dropping; the symptom is on the collective."
        },
        {
          "ref": "llm-systems/llm-data-pipelines",
          "text": "The content side of the same problem - quality filtering, deduplication with MinHash and LSH, sequence packing and mixture weighting. This lesson delivers bytes; that one decides which bytes are worth delivering."
        },
        {
          "ref": "training-systems/optimized-pipeline",
          "text": "Where the input pipeline is placed against the other techniques, since a job that is input-bound gains nothing from mixed precision, compilation or checkpointing - and knowing that ordering is the point of the capstone."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the first calculation for a large-scale data pipeline?",
          "a": "The required throughput: devices times samples per second per device times bytes per sample. It tells you immediately whether the storage tier is viable."
        },
        {
          "q": "Why is random access to remote storage fatal?",
          "a": "Latency is tens of milliseconds per read, so throughput is bounded by latency divided by concurrency rather than by bandwidth. No number of workers fixes it."
        },
        {
          "q": "What is the standard fix?",
          "a": "Pack samples into sequential shards of a few hundred megabytes and stream them, converting random access into sequential access. Routinely worth an order of magnitude."
        },
        {
          "q": "Why assign shards rather than samples to readers?",
          "a": "So each shard is read by exactly one reader and the sequential access pattern survives. Sharding by sample makes every reader touch every shard."
        },
        {
          "q": "What happens if readers get unequal shard counts?",
          "a": "A rank runs out early and stops joining the gradient all-reduce, so the job hangs rather than erroring. Pad for training, drop for evaluation."
        },
        {
          "q": "How do you shuffle a stream?",
          "a": "Two levels: permute the shard list each epoch, and maintain a shuffle buffer within the stream. The buffer size is the quality knob."
        },
        {
          "q": "How large should the shuffle buffer be?",
          "a": "Large relative to the correlation length in the source ordering, not merely relative to the batch. Shards built from ordered sources need several shards' worth."
        },
        {
          "q": "How do you check the shuffle is working?",
          "a": "Print the label or source distribution within twenty consecutive batches. If a batch is dominated by one class, the buffer is too small."
        },
        {
          "q": "Why does the number of files matter, not just the bytes?",
          "a": "Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones at the same total size."
        },
        {
          "q": "What is data echoing?",
          "a": "Reusing each loaded batch several times before fetching the next, trading sample freshness for device utilization when the pipeline cannot keep up."
        },
        {
          "q": "When should preprocessing be offline versus online?",
          "a": "Offline when it is deterministic - tokenization - trading storage for CPU. Online when it must be random per epoch, as with most augmentation."
        },
        {
          "q": "Why checkpoint the data position?",
          "a": "Without it a resume restarts the epoch, so the model re-trains on seen data and never reaches the tail - a serious problem for single-pass training on a large corpus."
        }
      ],
      "standard": [
        {
          "q": "How would you build the shards in the first place, and what decisions does that involve?",
          "a": "SHARD CONSTRUCTION IS AN OFFLINE JOB that determines most of your runtime pipeline's behaviour, and it is worth treating as a designed artefact rather than a conversion script. DECISION 1: SHARD SIZE. Too small and you are back toward the small-file problem, paying metadata and connection overhead per shard. Too large and you lose granularity - a reader that must finish a shard before rebalancing, a longer replay on resume, and coarser sharding across readers. A few hundred megabytes to a gigabyte is the usual range, and the binding constraint is usually that the number of shards must be comfortably larger than ranks times workers so the assignment divides reasonably. I would target at least a few shards per reader. DECISION 2: SHUFFLE AT BUILD TIME. This is the single highest-value decision and it is often skipped. If each shard is a RANDOM SAMPLE of the corpus rather than a contiguous slice of the source, then streaming order barely matters, the runtime shuffle buffer only has to break local structure, and every downstream shuffling problem shrinks. It costs one full pass at build time. Skipping it means every training run pays for it forever in buffer size and batch correlation. DECISION 3: WHAT TO STORE - the preprocessing split. Everything deterministic goes in: tokenization for text, resizing to the training resolution for images, any fixed normalization. Everything that must be random per epoch stays out. The rule is to split the transform chain at the first random operation and precompute the prefix. Pre-resizing in particular is frequently the largest single win and is skipped because the original data is what arrived. DECISION 4: THE MANIFEST. Record, per shard, the number of samples, the byte size, a checksum, and enough metadata to filter - source, language, date, label distribution. This is what lets you construct a weighted mixture without opening shards, verify integrity, and compute the exact epoch length in advance. A pipeline without a manifest cannot answer basic questions cheaply. DECISION 5: DEDUPLICATION, which belongs at build time because it is a global operation. Exact duplicates by content hash are cheap. Near-duplicates need MinHash with LSH banding to avoid the quadratic comparison, and a Bloom filter is the practical structure for membership at corpus scale. Doing this once offline is far better than any runtime filtering. DECISION 6: HOW SHARDS ARE GROUPED. If shards are homogeneous by source - all one language, all one class - then a reader assigned to a subset sees a biased sample for a whole shard's duration, which no runtime buffer fully fixes. Interleaving sources within each shard at build time solves it properly, and it is a build-time decision that cannot be recovered later. THE VALIDATION I WOULD RUN before trusting a new shard set. Read every shard, count the samples, and compare against the manifest. Sample from several shards and check the label distribution matches the corpus. And verify the total sample count matches the source, because a silent drop during a long build job is common and is invisible afterwards."
        },
        {
          "q": "Design a data pipeline for training on a corpus that does not fit on local disk.",
          "a": "START WITH THE ARITHMETIC, because it determines whether the design is possible before any of it is built. Required throughput is devices times samples-per-second-per-device times bytes-per-sample. Sixty-four devices at eight steps per second with batch 32 and 150 KB decoded images is about 2.5 GB/s sustained - beyond a single network filesystem mount, comfortably within aggregate object-storage bandwidth IF the access pattern is right. That last clause is the whole design. THE CONSTRAINT THAT DRIVES EVERYTHING: RANDOM ACCESS IS FATAL. A random read from object storage has latency in the tens of milliseconds, and a small file on a network filesystem is barely better because the metadata operation costs as much as the payload. A pipeline doing one remote read per sample is bounded by latency divided by concurrency, so you would need hundreds of concurrent requests to reach even a fraction of the needed rate, each with its own connection overhead. Adding workers does not fix a latency bound. THE DESIGN: SHARDED SEQUENTIAL STREAMING. Pack samples into shards of a few hundred megabytes - tar files in the WebDataset style, or a columnar format such as parquet. Each reader streams whole shards sequentially, which is what object storage is fast at, and one request now covers thousands of samples. This single change is routinely worth an order of magnitude and it is the difference between a pipeline that scales and one that does not. SHARDING ACROSS READERS, where the correctness bugs are. With R ranks and W workers each you have R times W independent readers. Assign SHARDS to readers, not samples: reader k takes shards k, k+RW, k+2RW and so on. Assigning by sample would make every reader touch every shard, destroying the sequential pattern you designed for. And the shard counts must be EQUAL, because a rank that runs out early stops joining the gradient all-reduce and the job hangs rather than errors - pad by repeating for training, drop the remainder for evaluation where duplicates would corrupt the metric, and assert equality at startup with a min and max all-reduce. SHUFFLING WITHOUT INDICES, at two levels. Permute the shard list each epoch, seeded on the base seed plus the epoch so every reader agrees and it is reproducible. Then a shuffle buffer within the stream: hold M samples, emit a random one, refill. The buffer size is the quality knob and it must be sized against the CORRELATION LENGTH of the source ordering rather than against the batch - shards built from ordered data need a buffer spanning several shards' worth. CACHING TIERS, which is often the single biggest win after the format. Cache decoded shards on local NVMe if there is room, so epoch one pays the network and epoch two onward is local. The page cache does some of this for free, which is why a second epoch is faster. IF STILL INPUT-BOUND. Move decoding to the GPU with nvJPEG or DALI when CPU decode is the bottleneck; pre-decode to a raw format, trading storage bandwidth for CPU; or use data echoing, reusing each batch several times, which trades sample freshness for utilization and is worth it when the alternative is an idle accelerator. WHAT I WOULD MEASURE. Loader-only throughput with the model removed, device utilization, and the shuffle diagnostic - a label histogram over consecutive batches, which nobody runs and which catches a correlated-batch problem no throughput number reveals.",
          "deepDive": {
            "q": "How do you guarantee that a streaming distributed pipeline reads the dataset exactly once, reproducibly, and can resume?",
            "a": "EXACTLY ONCE. With R ranks and W workers each, there are R*W readers, and the requirement is that the union of what they read is the dataset exactly once with no overlap. Assign shards by index modulo R*W, which is disjoint and covering by construction, and crucially keeps each shard read by exactly one reader so sequential access survives. Then the only remaining question is divisibility. THE UNEVEN-DIVISION PROBLEM, which is the one that bites. If the shard count is not divisible by R*W, readers get different counts. In DDP that means some ranks run out first, and since every rank must participate in every all-reduce, the fast ranks block forever - the job HANGS rather than erroring, which is the worst failure mode because there is nothing to read. Three options: drop the remainder shards so division is exact, which loses a little data; pad by repeating shards so all readers get the same count, which slightly over-samples some; or use a join context so ranks that finish early participate in dummy collectives. I would pad for training and drop for evaluation, where duplicates would corrupt the metric. And I would assert it at startup: all-reduce the local shard count with MIN and with MAX and require them equal. One line, and it converts the most common distributed hang into an immediate error. EVALUATION IS THE SUBTLE CASE and it is frequently got wrong. You must not duplicate samples or the metric is inflated, and you must not drop them or it is computed on a subset. The standard treatment is to pad the last batch and carry a mask, then all-gather both predictions and the mask so duplicates can be removed before reducing. Many pipelines report a slightly incorrect validation number for exactly this reason and nobody notices, because a slightly wrong number looks like a right one. REPRODUCIBILITY. Seed the shard permutation from (base_seed, epoch) so every reader computes the SAME permutation - they must agree, or the disjointness argument breaks. Seed per-reader randomness, including the shuffle buffer and any augmentation, from (base_seed, epoch, rank, worker_id) so readers differ from each other but reproduce across runs. And note that torch seeds workers automatically but a dataset using Python's random or numpy's global state inherits the parent's under fork, so every worker produces identical randomness unless you seed explicitly in a worker_init_fn - which silently divides augmentation diversity by the worker count. CHECKPOINT-RESUME, which is the hardest part and is usually ignored. To resume mid-epoch you must record, per reader, which shard it was on and the offset within it. Without that, a resume restarts the epoch: the model re-trains on data it has already seen and never reaches the tail. For epoch-based training on a modest dataset that is a minor distortion. For SINGLE-PASS training on a corpus larger than one epoch - which is how large language models are trained - it is a serious correctness problem, and a job that has been resumed five times may never have seen the last portion of its data. The practical simplification is to checkpoint only at shard boundaries, which makes the state small and the logic simple at the cost of replaying at most one shard. THE TEST I WOULD WRITE, because none of this is verifiable by inspection. Run the pipeline with tiny synthetic shards containing unique integer ids, collect everything every reader yields, and assert the multiset equals the expected one exactly. An hour to write, and it is the only thing that catches a duplication or drop bug - because in production the symptom is a model that is slightly worse than expected and nobody attributes that to the loader."
          }
        },
        {
          "q": "How would you decide between storing decoded data and decoding at load time?",
          "a": "IT IS AN EXCHANGE BETWEEN STORAGE BANDWIDTH AND CPU, and the right answer depends on which one you have. THE TWO OPTIONS. Store COMPRESSED - JPEGs, encoded audio, raw text - and decode per epoch. Storage is small and cheap to move; CPU pays every epoch. Or store DECODED - raw tensors, pre-tokenized ids - and read directly. CPU is free at load time; storage grows by roughly an order of magnitude for images and the network must carry it. THE ARITHMETIC THAT DECIDES IT. Compute both required rates. A 150 KB decoded image versus a 15 KB JPEG is a tenfold difference in required network throughput. If the decoded rate exceeds what your storage can sustain, the decision is made for you. If the compressed rate is within budget, the question becomes whether you have CPU to spare - which is measurable by watching whether the workers saturate their cores. WHERE THE ANSWERS DIFFER BY DOMAIN. LANGUAGE MODELS: tokenize offline, always. Tokenization is deterministic, so there is nothing gained by redoing it, token ids are compact, and it removes a substantial CPU cost from every epoch. This is universal practice and it is not really a trade-off. VISION: usually keep JPEGs and decode online, because decoded images are large and because augmentation has to happen per epoch anyway, so the CPU is already engaged. The exception is when decode is measurably the bottleneck, at which point the options are GPU decoding - nvJPEG or DALI, which moves the work to hardware that is otherwise waiting - or pre-decoding to a raw format if storage permits. AUDIO: usually decode online, since compressed audio is small and decoding is comparatively cheap. THE THIRD OPTION people forget: PARTIAL PRECOMPUTATION. Store at the resolution you actually train at rather than the original. Pre-resizing to 256 pixels rather than storing 4K originals cuts both storage and decode cost enormously, and the only thing lost is the ability to train at a higher resolution later without reprocessing. In practice this is often the single largest win available and it is skipped because the original data is what arrived. THE CONSTRAINT THAT OVERRIDES THE ARITHMETIC. Anything that must be RANDOM per epoch cannot be precomputed - random crops, random augmentation, random masking. You can precompute the deterministic prefix of the pipeline and leave the random suffix online, which is the general answer: split the transform chain at the first random operation, precompute everything before it. HOW I WOULD DECIDE IN PRACTICE. Measure the loader-only throughput and profile inside __getitem__ to see where the time actually goes - the distribution is usually surprising, and decode is often a larger share than expected. Then compute both throughput budgets. Then pick the option whose bottleneck you have headroom in. And re-measure afterwards, because moving the bottleneck from CPU to network means the next constraint is a different one - which is this module's recurring point."
        },
        {
          "q": "Your GPUs are at 40% utilization on a 64-node job. Walk through the investigation.",
          "a": "LOW UTILIZATION MEANS THE DEVICES ARE WAITING, and there are four things they can be waiting for. I would distinguish them before optimizing anything. STEP 1: IS IT INPUT OR COMMUNICATION? Run the training loop with SYNTHETIC data - a fixed tensor in a loop, no loader at all. If utilization jumps, you are input-bound. If it stays at 40%, the problem is communication, synchronization, or the model itself, and the data pipeline is innocent. This experiment takes ten minutes and it splits the investigation in half, which is why it goes first. STEP 2, IF INPUT-BOUND: WHERE IN THE PIPELINE? Time the loader alone with the model removed, per rank. Then look at whether the bottleneck is storage, network, or CPU. Storage and network show as low CPU utilization in the workers with the loader still slow. CPU shows as workers pegged at 100%. The distinction determines everything downstream. STEP 3: THE COMMON CAUSES AT SCALE, in order. (a) RANDOM ACCESS - one remote read per sample. Latency-bound, unfixable by adding workers, and the fix is repacking into sequential shards. This is the big one and the symptom is that throughput does not improve with more workers. (b) TOO MANY SMALL FILES - metadata operations dominating, which is the same problem wearing different clothes. (c) DECODE-BOUND - workers at 100% CPU. Fix by moving decode to the GPU, pre-decoding, or storing at the training resolution. (d) INSUFFICIENT WORKERS OR PREFETCH - the cheapest to test and worth ruling out early, remembering the count is an inverted V rather than monotone. (e) SHARED FILESYSTEM CONTENTION - 64 nodes hitting one mount is a different workload from one node, and per-node caching is the fix. STEP 4: THE STRAGGLER CHECK, which is specific to distributed training and often missed. Utilization is an average. If one rank is slow, every rank waits at the all-reduce, so all of them show low utilization while only one has a problem. Log per-rank step times and look at the distribution rather than the mean. A single slow node - a bad disk, a thermal issue, a noisy neighbour - presents exactly as a global slowdown, and no amount of pipeline optimization fixes it. STEP 5: IF NOT INPUT-BOUND. Profile and look at the timeline. Communication not overlapping with computation, a per-step synchronization from logging, or a small model that simply cannot fill the device are the candidates - and they are diagnosed by the timeline's shape rather than by aggregates. WHAT I WOULD FIX FIRST given the finding. Format before workers, caching before format changes if a local cache is available, and the straggler before anything if the per-rank distribution is skewed. THE MEASUREMENT I WOULD ADD PERMANENTLY. Per-rank data time and compute time, logged separately, so the next occurrence is diagnosed from a dashboard rather than from an investigation. That is cheap and it turns a recurring multi-day question into a glance.",
          "deepDive": {
            "q": "Explain data echoing - what it trades, and how you would evaluate whether it helped.",
            "a": "WHAT IT IS. When the input pipeline cannot keep up, reuse each loaded batch e times before fetching the next - either by repeating the whole batch, or by re-shuffling and re-augmenting the buffered examples between uses. The accelerator is then fed from memory rather than waiting on storage. Choi et al. formalized and measured this. WHAT IT TRADES. Sample FRESHNESS for device UTILIZATION. Each optimizer step now uses data that is partly repeated, so a step carries less new information than a step on fresh data. In exchange, you take steps at the rate the device can sustain rather than the rate the pipeline can supply. THE ARGUMENT FOR IT is blunt and correct: if the GPU would otherwise be IDLE, repeated data beats no data. A step on echoed data is worth less than a step on fresh data, and it is worth more than zero. WHERE ON THE PIPELINE YOU ECHO MATTERS, which is the part people miss. You can echo after reading but before augmentation, in which case each repeat gets different random augmentation and is meaningfully different - this is the good case, and for vision it recovers most of the value of fresh data. Or you can echo after the full transform, in which case the repeats are identical and the marginal value is lower. Echoing as EARLY as possible in the pipeline, subject to the bottleneck being upstream of that point, is the rule. HOW I WOULD EVALUATE IT, and the measurement design is the substance of the answer. The wrong metric is STEPS to a target loss - echoing needs more steps by construction, so it always looks worse. The wrong metric is also steps per second, which always looks better. The right metric is WALL-CLOCK TIME to a target loss, or equivalently to a target validation metric. That is the only comparison that reflects the actual trade. I would run three configurations - no echoing, echo 2, echo 4 - to the same target metric and compare elapsed time, with the learning rate re-tuned per configuration since the effective data distribution has changed. WHAT I WOULD EXPECT. A benefit that grows with how input-bound you are and shrinks as e increases, since the marginal value of each repeat falls. Choi et al. found meaningful wall-clock improvements when the pipeline was the bottleneck and, importantly, that the benefit depends on where in the pipeline the echoing happens. THE RISKS TO WATCH. Repeated data increases the effective number of passes over each example, so OVERFITTING arrives sooner in terms of unique data seen - which matters for small datasets and barely at all for a corpus you will not finish one pass of. And the gradient becomes more correlated between consecutive steps, which interacts with momentum in ways that may need the learning rate adjusting. WHEN I WOULD USE IT AT ALL. Only after the structural fixes - sharding, caching, format, GPU decode - have been applied and the pipeline still cannot keep up. Echoing is the last resort in that list because it is the only one that degrades the training signal rather than merely moving work around. But it is a legitimate and under-used tool when the alternative is an accelerator sitting idle, and framing it as an explicit exchange rather than a hack is what makes it defensible."
          }
        },
        {
          "q": "How would you verify that shuffling is adequate?",
          "a": "THIS IS THE MEASUREMENT NOBODY RUNS, and it is one histogram. THE DIRECT CHECK. Take twenty consecutive batches from the loader and print the distribution of labels, or of source shard, or of any categorical attribute you have. If batches are dominated by one value, the shuffle is not breaking the source ordering. That is it - it takes five minutes and it settles the question definitively. WHY IT MATTERS. A correlated batch is a biased gradient estimate. If a batch is mostly one class, the update pushes toward that class and the next batch pushes back, so the trajectory oscillates and the effective learning rate is behaving differently from what you set. With batch normalization it is worse: the statistics are computed over a batch that is not representative of the data distribution, so the normalization itself is wrong. And none of this produces an error - it produces slightly worse convergence that gets attributed to hyperparameters. WHY IT HAPPENS AT SCALE SPECIFICALLY. Shards are built from ordered sources: a crawl in date order, a dataset grouped by class, documents from one site. Streaming reads them sequentially, so consecutive samples are correlated. The shuffle buffer is the only thing breaking that, and its size is usually chosen against the batch size rather than against the CORRELATION LENGTH in the source - which is the wrong comparison and is why the default is often too small. THE ARITHMETIC. With a buffer of M and batch B, two source-adjacent samples land in the same batch with probability roughly B/M. At M = 10,000 and B = 256 that is about 2.5% - fine if the source order is arbitrary, and a real problem if a shard is entirely one class, because then it is not two adjacent samples but the whole shard that needs breaking up. THE MORE ROBUST FIXES, in order. (1) SHUFFLE THE DATA ONCE WHEN BUILDING THE SHARDS. If each shard is already a random sample of the corpus, the streaming order barely matters and the buffer only needs to break local structure. This is by far the best fix, it is a one-time offline cost, and it is the reason well-built datasets do not need heroic buffers. (2) INTERLEAVE MULTIPLE SHARDS per reader, drawing round-robin from several open shards, so the buffer sees a mixture rather than a single source. (3) SIZE THE BUFFER against the correlation length, which means measuring it rather than guessing. (4) Permute the shard LIST each epoch, which is necessary but not sufficient - it changes which shards are adjacent, not what is inside them. WHAT I WOULD CHECK BEYOND LABELS. The distribution of sequence length within a batch, if you bucket by length, since that is deliberately correlated and you should know how much. And the source or domain mixture if you are training on a weighted mixture of corpora - a batch drawn entirely from one source is a different training signal from a proportionally mixed one, and the mixture weights you carefully chose only apply in expectation over batches, not within them."
        },
        {
          "q": "What is the exchange this lesson makes, and how does it fit the module?",
          "a": "SEVERAL EXCHANGES, and naming them individually is more useful than a single summary. EXCHANGE 1: RANDOMNESS FOR THROUGHPUT. Sequential shard streaming is orders of magnitude faster than random access, and it costs you the ability to shuffle by index. You buy that back approximately with a shuffle buffer, and the approximation is the cost - measurable as the correlation within consecutive batches, and almost never measured. EXCHANGE 2: STORAGE FOR CPU. Precomputing a transform - tokenizing, pre-decoding, pre-resizing - means storing more bytes and moving them over the network, in return for not spending CPU every epoch. The rate depends entirely on which of storage bandwidth and CPU you have spare, which is why the answer differs between language models (tokenize offline, always) and vision (usually decode online). EXCHANGE 3: FRESHNESS FOR UTILIZATION. Data echoing reuses batches, so each step carries less new information and you take more steps per second. Worth it precisely when the alternative is an idle accelerator, and the evaluation must be in wall-clock to a target rather than in steps. EXCHANGE 4: LOCAL DISK FOR NETWORK. Caching shards locally makes epoch one expensive and every subsequent epoch cheap. Free if you have the disk, useless for single-pass training where there is no second epoch - which is a good example of the rate depending on your regime rather than the technique. HOW IT FITS THE MODULE. This lesson is unusual in one respect: it is the only one where the resource being bought is not on the accelerator. Everything else in the module trades compute, memory and communication ON the device; this trades storage, network and host CPU. And that matters because those resources are frequently the binding ones and are the least likely to be measured - a job can be 60% input-bound while the whole team optimizes the model. THE ORDERING CLAIM I WOULD MAKE, which is the capstone's argument in miniature. If you are input-bound, every other technique in this module is worthless to you. Mixed precision, compilation, checkpointing and sharding all make the accelerator faster or fit more on it, and the accelerator is idle. So the profiling question - is the GPU even busy - is not merely the first step of a performance investigation; it determines whether the rest of the module applies at all. That is why this lesson sits before the capstone and why the capstone's first move is to establish which resource binds."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The throughput budget",
        "back": "R = devices x (batch / step_time) x bytes_per_sample. 64 devices, batch 32, 8 steps/s, 150 KB images = ~2.5 GiB/s sustained. Compute this BEFORE choosing a format - it tells you whether the storage tier is viable at all."
      },
      {
        "type": "intuition",
        "front": "Random access to remote storage is FATAL",
        "back": "Latency is tens of ms per read, so throughput is bounded by latency/concurrency, NOT bandwidth - no number of workers fixes it. Streaming one 500 MB shard reaches the same rate as hundreds of concurrent random reads. This is why every large pipeline is shard-based."
      },
      {
        "type": "pitfall",
        "front": "Assign SHARDS to readers, not samples",
        "back": "Sharding by sample makes every reader touch every shard, destroying the sequential access the format exists to provide. Reader k takes shards k, k+RW, k+2RW... where RW = ranks x workers."
      },
      {
        "type": "pitfall",
        "front": "Unequal shard counts HANG a DDP job",
        "back": "A rank that runs out stops joining the all-reduce and the others block forever. PAD by repeating (training) or DROP the remainder (evaluation, where duplicates corrupt the metric). Assert it: all-reduce the count with MIN and MAX and require equality."
      },
      {
        "type": "formula",
        "front": "Shuffle-buffer quality",
        "back": "P(two source-adjacent samples in the same batch) ~ B/M. At M=10k, B=256 that is ~2.5%. Size M against the CORRELATION LENGTH of the source ordering, not against the batch - shards built from ordered data need several shards' worth."
      },
      {
        "type": "intuition",
        "front": "The shuffle diagnostic nobody runs",
        "back": "Print Counter(labels) over 20 consecutive batches. If a batch is dominated by one class, the buffer is too small. Correlated batches are a BIASED gradient estimate - and with BatchNorm the statistics are wrong too. No error, just worse convergence blamed on hyperparameters."
      },
      {
        "type": "intuition",
        "front": "The best shuffle fix is offline",
        "back": "SHUFFLE ONCE WHEN BUILDING THE SHARDS. If each shard is already a random sample of the corpus, streaming order barely matters and the buffer only breaks local structure. One-time cost, and it is why well-built datasets need no heroic buffers."
      },
      {
        "type": "pitfall",
        "front": "File COUNT matters, not just bytes",
        "back": "Storage systems charge for metadata operations, so a million small files is a fundamentally different workload from a thousand large ones at identical total size - and can be an order of magnitude slower."
      },
      {
        "type": "intuition",
        "front": "Split the transform chain at the first RANDOM op",
        "back": "Everything before it can be precomputed offline (tokenize, pre-decode, pre-RESIZE to the training resolution - often the biggest win and usually skipped). Everything after must stay online because it must differ per epoch."
      },
      {
        "type": "definition",
        "front": "Data echoing",
        "back": "Reuse each loaded batch e times before fetching the next: trade sample FRESHNESS for utilization. Echo as EARLY in the pipeline as possible so each repeat gets different augmentation. Evaluate in WALL-CLOCK to a target - steps-to-target always looks worse by construction."
      },
      {
        "type": "pitfall",
        "front": "Low utilization on many nodes? Check for a STRAGGLER",
        "back": "Utilization is an AVERAGE. One slow rank makes every rank wait at the all-reduce, so all show low utilization while only one has a problem. Log per-rank step times and look at the DISTRIBUTION - no pipeline work fixes a bad disk on node 37."
      },
      {
        "type": "intuition",
        "front": "Input-bound makes the rest of the module irrelevant",
        "back": "Mixed precision, compile, checkpointing and sharding all make the accelerator faster or fit more on it - and the accelerator is IDLE. The synthetic-data test (run the loop on a fixed tensor) splits input-bound from everything else in ten minutes."
      }
    ],
    "refs": [
      {
        "title": "Aizman, Maltby & Breuel (2019), High Performance I/O For Large Scale Deep Learning (WebDataset)",
        "url": "https://arxiv.org/abs/2001.01858"
      },
      {
        "title": "Choi et al. (2019), Faster Neural Network Training with Data Echoing",
        "url": "https://arxiv.org/abs/1907.05550"
      },
      {
        "title": "Mohan et al. (2020), Analyzing and Mitigating Data Stalls in DNN Training",
        "url": "https://arxiv.org/abs/2007.06775"
      },
      {
        "title": "Murray et al. (2021), tf.data: A Machine Learning Data Processing Framework",
        "url": "https://arxiv.org/abs/2101.12127"
      },
      {
        "title": "NVIDIA DALI: GPU-accelerated data loading and augmentation",
        "url": "https://docs.nvidia.com/deeplearning/dali/user-guide/docs/index.html"
      }
    ],
    "demos": [
      "reservoir-sampling",
      "importance-sampling",
      "batching",
      "bloom-filter"
    ]
  }
};
