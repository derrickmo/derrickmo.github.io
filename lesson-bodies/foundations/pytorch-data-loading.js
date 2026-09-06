// GENERATED from content/lessons/foundations/pytorch-data-loading.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/foundations/pytorch-data-loading/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "pytorch-data-loading": {
    "level": "intro",
    "body": {
      "intuition": [
        "A model only ever sees batches of tensors, but real datasets live as files on disk, rows in a DataFrame, or images in a folder. PyTorch's Dataset/DataLoader pair is the bridge: a Dataset answers two questions - 'how many examples are there' (__len__) and 'give me example i' (__getitem__) - and a DataLoader wraps any Dataset with batching, shuffling, and (critically) parallel loading, so the GPU never sits idle waiting for the next batch to be read and preprocessed on CPU.",
        "The reason this is worth a dedicated lesson rather than 'just write a for loop' is throughput: if loading and augmenting one example takes 5ms and your model consumes a batch of 64 in 10ms, a single-process loader spends 320ms preparing what the GPU consumes in 10ms - the GPU is idle 97% of the time. num_workers>0 spins up separate processes to prepare future batches while the current one trains, and pin_memory + non_blocking transfers overlap the CPU-to-GPU copy with computation too.",
        "FashionMNIST (used in this lesson) is a good stand-in for the general image-pipeline shape: fixed-size inputs, an integer label per example, and a torchvision transform pipeline that converts raw images to normalized tensors - the same shape of pipeline scales up to ImageNet-sized datasets in Module 06, just with heavier decoding and augmentation per item."
      ],
      "math": [
        {
          "h": "Idle-GPU time as a queueing problem",
          "paras": [
            "If preparing one batch takes t_load and consuming it takes t_compute, a single-process (synchronous) pipeline pays t_load + t_compute per step - GPU idle for the whole t_load. With enough parallel workers overlapping load with the *previous* batch's compute, the per-step wall time approaches max(t_load / W, t_compute) for W workers, until compute itself becomes the bottleneck."
          ],
          "tex": "T_{\\text{sync}} = t_{\\text{load}} + t_{\\text{compute}} \\qquad T_{\\text{overlapped}} \\approx \\max\\!\\left(\\frac{t_{\\text{load}}}{W},\\; t_{\\text{compute}}\\right)",
          "texNote": "Enough workers hide loading time behind compute entirely - the pipeline becomes as fast as the GPU alone, up to the point where CPU work saturates all cores."
        },
        {
          "h": "Sampling without vs with replacement",
          "paras": [
            "Shuffling for an epoch is sampling a permutation of all N indices without replacement - every example seen exactly once. WeightedRandomSampler instead samples *with* replacement according to per-example weights, which is how class imbalance gets corrected: an under-represented class's examples get sampled more often per epoch than their raw count in the dataset would give them."
          ],
          "tex": "P(\\text{class } c \\text{ sampled}) \\propto \\sum_{i \\in c} w_i \\qquad w_i = \\frac{1}{\\text{count}(\\text{class of } i)} \\;\\text{(inverse-frequency weighting)}",
          "texNote": "Weighting each example by the inverse of its class frequency flattens the sampled class distribution toward uniform, regardless of the raw imbalance in the dataset."
        }
      ],
      "code": [
        {
          "h": "A custom Dataset and DataLoader",
          "paras": [
            "The minimum contract: __len__ and __getitem__. Everything else - batching, shuffling, parallelism - is the DataLoader's job, not the Dataset's."
          ],
          "code": "import torch\nfrom torch.utils.data import Dataset, DataLoader\nfrom torchvision import datasets, transforms\n\ntransform = transforms.Compose([\n    transforms.ToTensor(),                          # PIL image -> float32 tensor in [0,1]\n    transforms.Normalize((0.2860,), (0.3530,)),      # FashionMNIST channel mean/std\n])\n\ntrain_ds = datasets.FashionMNIST(root='./data', train=True, download=True, transform=transform)\nprint(len(train_ds))                # __len__: 60000\nimage, label = train_ds[0]          # __getitem__: (1, 28, 28) tensor, int label\nprint(image.shape, label)\n\ntrain_loader = DataLoader(\n    train_ds, batch_size=64, shuffle=True,\n    num_workers=4, pin_memory=True, drop_last=True,\n)\nfor images, labels in train_loader:              # (64, 1, 28, 28), (64,)\n    images = images.to('cuda', non_blocking=True)  # overlaps with pin_memory'd CPU tensor\n    labels = labels.to('cuda', non_blocking=True)\n    break",
          "caption": "shuffle=True re-permutes indices every epoch; num_workers parallelizes __getitem__ + transform across processes; pin_memory + non_blocking overlap the H2D copy with compute."
        },
        {
          "h": "A from-scratch Dataset over a pandas DataFrame",
          "paras": [
            "Wiring the previous lesson's cleaned DataFrame into the Dataset contract - the typical bridge from tabular data to a training loop."
          ],
          "code": "import torch\nfrom torch.utils.data import Dataset\n\nclass TabularDataset(Dataset):\n    def __init__(self, df, feature_cols, target_col):\n        self.X = torch.tensor(df[feature_cols].to_numpy(dtype='float32'))\n        self.y = torch.tensor(df[target_col].to_numpy(dtype='float32'))\n\n    def __len__(self):\n        return len(self.X)                       # required\n\n    def __getitem__(self, idx):\n        return self.X[idx], self.y[idx]          # required: one example by index\n\n# ds = TabularDataset(df, feature_cols=['MedInc', 'AveRooms'], target_col='MedHouseVal')\n# loader = DataLoader(ds, batch_size=32, shuffle=True)",
          "caption": "Any object with __len__ and __getitem__ can be batched, shuffled, and parallelized by DataLoader - no torchvision-specific magic required."
        }
      ],
      "useCases": [
        "Every training loop in every later module starts with a DataLoader - it is the universal interface between 'data on disk' and 'batches on the GPU'.",
        "WeightedRandomSampler corrects class imbalance at the sampling stage, an alternative to loss re-weighting used throughout classification modules.",
        "IterableDataset (the streaming alternative to map-style Dataset) is how you handle datasets too large to index randomly - sharded files, streamed web-scale text/image corpora in Modules 08-10.",
        "num_workers/pin_memory tuning is one of the first things to check when a training run's GPU utilization is unexpectedly low - a data-loading bottleneck, not a model problem."
      ],
      "pitfalls": [
        "Setting num_workers too high on a small machine causes worker-process startup/IPC overhead to exceed the time saved - benchmark, don't assume more is always faster.",
        "Applying a random augmentation transform without accounting for worker-process random seeding: each DataLoader worker is a separate process, and without correct seeding via worker_init_fn, all workers can produce the *same* 'random' augmentations - silently reducing effective data diversity.",
        "Forgetting drop_last=True with batch normalization: a final partial batch of size 1 makes BatchNorm's per-batch statistics undefined/degenerate.",
        "Computing dataset-wide normalization statistics (mean/std) on the full dataset including validation/test data - the same leakage pitfall as fitting a scaler on the full DataFrame before splitting.",
        "Doing heavy CPU work (large-image decode, complex augmentation) inside __getitem__ with num_workers=0 - it runs synchronously in the main process, blocking the GPU exactly as if there were no DataLoader abstraction at all."
      ],
      "connections": [
        {
          "ref": "foundations/pandas",
          "text": "A cleaned pandas DataFrame is the most common source of examples for a custom Dataset - .to_numpy() bridges directly to tensors."
        },
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "Batching is broadcasting a model over a leading batch dimension - the vectorization ideas from the first lesson are why batches, not single examples, are efficient."
        },
        {
          "text": "Module 04's training-loop lessons build directly on the DataLoader introduced here - forward pass, loss, backward pass, optimizer step, repeat per batch."
        },
        {
          "text": "Module 06's image pipelines and Module 09's text pipelines extend this exact Dataset/DataLoader contract with heavier augmentation and tokenization inside __getitem__."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What two methods must a map-style PyTorch Dataset implement?",
          "a": "__len__ (number of examples) and __getitem__ (return one example given an index)."
        },
        {
          "q": "What does a DataLoader add on top of a Dataset?",
          "a": "Batching, shuffling, and parallel loading (num_workers) - the Dataset only knows how to fetch one example."
        },
        {
          "q": "Why does num_workers>0 speed up training?",
          "a": "It parallelizes data loading/preprocessing across separate processes so the next batch is ready while the GPU trains on the current one, instead of the GPU sitting idle during loading."
        },
        {
          "q": "What does pin_memory=True do?",
          "a": "Allocates batch tensors in page-locked host memory, enabling faster and asynchronous (non_blocking) transfer to the GPU."
        },
        {
          "q": "Why use drop_last=True with BatchNorm?",
          "a": "A final partial batch (possibly size 1) makes per-batch mean/variance statistics degenerate or undefined."
        },
        {
          "q": "Map-style vs iterable-style Dataset?",
          "a": "Map-style supports random access via __getitem__/index; IterableDataset only supports sequential iteration - used for streamed or too-large-to-index data."
        },
        {
          "q": "What does WeightedRandomSampler correct for?",
          "a": "Class imbalance - it samples with replacement according to per-example weights so under-represented classes appear more often per epoch."
        },
        {
          "q": "Where should dataset normalization statistics (mean/std) be computed from?",
          "a": "The training split only, then applied to validation/test - computing them on the full dataset leaks test information."
        },
        {
          "q": "What bug can multi-worker random augmentation cause if unseeded?",
          "a": "All worker processes can produce identical 'random' augmentations, silently reducing effective data diversity, unless worker_init_fn seeds them differently."
        },
        {
          "q": "What does shuffle=True change between epochs?",
          "a": "It re-samples a fresh random permutation of dataset indices each epoch, so batches contain a different mix of examples every pass."
        }
      ],
      "standard": [
        {
          "q": "You profile a training run and find GPU utilization is only 40%. Walk through how you'd diagnose and fix a data-loading bottleneck.",
          "a": "First confirm it's data-bound: time a few steps with the data pipeline replaced by pre-generated random tensors of the same shape - if GPU util jumps near 100%, loading is the bottleneck. Then increase num_workers incrementally (bench each setting; more isn't always better past core count), add pin_memory=True with .to(device, non_blocking=True), and move any CPU-heavy augmentation to be as cheap as possible per item (or precompute/cache what doesn't need to be randomized per epoch). If __getitem__ itself is inherently slow (large image decode), consider prefetching further ahead (prefetch_factor) or persistent_workers=True to avoid worker respawn overhead between epochs.",
          "deepDive": {
            "q": "Why might adding more workers eventually make throughput *worse*?",
            "a": "Beyond the number of physical CPU cores, additional worker processes compete for the same cores and add inter-process communication (IPC) overhead to shuttle batches back to the main process via shared memory - past the saturation point you're paying context-switch and serialization cost without any additional parallel throughput, so the sweet spot is usually near (but not exceeding) the core count minus what the main process itself needs."
          }
        },
        {
          "q": "Explain concretely why applying a random crop/flip augmentation inside __getitem__ can produce identical augmentations across all workers if you're not careful, and how to fix it.",
          "a": "Each DataLoader worker is a forked/spawned separate Python process; by default they may inherit or independently seed the global random state in a way that isn't automatically diversified per worker (this is especially true with the 'fork' start method, where all workers can start from the same seeded RNG state at fork time). If every worker's RNG produces the same sequence, every image processed by worker 0 gets the same augmentation draw as the corresponding image would on worker 1, silently reducing the effective diversity of augmented data across an epoch. Fix: pass a worker_init_fn to DataLoader that seeds each worker's RNG (Python's random, NumPy's, and torch's) using a value derived from torch.utils.data.get_worker_info().id, ensuring independent streams per worker.",
          "deepDive": {
            "q": "Does this issue also affect NumPy's RNG specifically, and why is that a common gotcha?",
            "a": "Yes - NumPy's legacy global RNG state (np.random.seed/np.random.rand) is a classic case where forked worker processes inherit the exact same internal state at fork time and then advance identically if no worker-specific reseeding happens, whereas torch's per-worker seeding is handled somewhat more automatically by DataLoader's default worker_init_fn for torch's own RNG - so bugs specifically surface in augmentation code that calls np.random directly instead of torch's generator, which is why explicit worker_init_fn seeding of all three RNGs (random, numpy, torch) is the robust fix."
          }
        },
        {
          "q": "You're building a Dataset for a corpus too large to fit in memory or index randomly (e.g., a sharded text corpus streamed from disk). What Dataset variant do you use, and what capability do you give up?",
          "a": "IterableDataset - you implement __iter__ instead of __len__/__getitem__, yielding examples sequentially (e.g., streaming through shard files one line at a time). You give up random access and, by extension, DataLoader's built-in shuffle=True (which requires indexing into the dataset) - shuffling instead has to be approximated with a fixed-size shuffle buffer that holds N examples in memory and randomly emits from that buffer while refilling from the stream, trading perfect epoch-level shuffling for a bounded-memory approximation.",
          "deepDive": {
            "q": "How do you correctly split work across multiple workers with an IterableDataset, given there's no index to partition?",
            "a": "You must manually partition the stream inside __iter__ using torch.utils.data.get_worker_info() to learn the current worker's id and total worker count, then have each worker skip/select a disjoint subset of shards or records (e.g., shard_id % num_workers == worker_id) - unlike map-style Datasets, DataLoader cannot automatically split an IterableDataset's work across workers, so getting this wrong silently duplicates every example num_workers times instead of partitioning them."
          }
        },
        {
          "q": "A classification dataset has 95% class A and 5% class B. Compare correcting this via WeightedRandomSampler vs via a weighted loss function, and when you'd prefer one over the other.",
          "a": "WeightedRandomSampler changes what the model *sees* - each epoch, class B examples are drawn with replacement more often (weight inversely proportional to class frequency), so the model is trained on a roughly balanced stream, which also means class B examples get reused (duplicated) within an epoch, increasing memorization risk for a small minority class. A weighted loss function (e.g., higher weight on class B's loss term in cross-entropy) instead sees the true unweighted data distribution once per epoch but scales the *gradient contribution* of minority-class errors, avoiding duplication but leaving the model less exposed to minority-class examples overall. Prefer sampling when the minority class has enough distinct examples to reuse safely and you want simpler, unweighted downstream metrics; prefer loss weighting when the minority class is very small (duplication risk high) or you're already using an imbalance-aware metric.",
          "deepDive": {
            "q": "Can you combine both, and is there a risk in doing so?",
            "a": "Yes, they're not mutually exclusive - but combining them double-corrects for the same imbalance (sampling already flattens the class distribution seen by the loss, then loss weighting flattens it again), which can overcorrect and hurt majority-class performance more than necessary; if combining, tune the loss weights down from the 'as if unweighted sampling' values, or pick one mechanism and validate against a held-out set rather than applying both at full strength by default."
          }
        },
        {
          "q": "Design the Dataset/DataLoader setup for a training script that must produce bit-for-bit reproducible batches across runs, given a fixed random seed.",
          "a": "Seed all relevant RNGs before creating the DataLoader: torch.manual_seed(seed), plus Python's random.seed(seed) and numpy.random.seed(seed) if __getitem__ or transforms use them. Pass a generator=torch.Generator().manual_seed(seed) to DataLoader so its internal shuffling permutation is deterministic. Set num_workers=0, or if using workers, pass a worker_init_fn that deterministically seeds each worker as a function of the base seed and worker id (not the wall-clock or an unseeded default) - and set persistent_workers based on run-to-run consistency needs. Also disable any nondeterministic backend kernels if bit-exactness matters beyond just the data pipeline (torch.use_deterministic_algorithms(True)).",
          "deepDive": {
            "q": "Why can num_workers>0 threaten reproducibility even with every RNG correctly seeded?",
            "a": "With multiple worker processes, the *order* in which prepared batches arrive back at the main process can vary run-to-run due to OS scheduling nondeterminism in how quickly each worker process completes its work - even though each individual worker's random augmentations are seeded deterministically, if the DataLoader interleaves results from multiple workers' queues, the exact sequence of batches consumed by the training loop can differ; num_workers=0 (single-process, fully synchronous) is the only setting that guarantees a fully deterministic batch order without additional safeguards."
          }
        },
        {
          "q": "Your Dataset's __getitem__ loads a large image from disk and applies a heavy augmentation pipeline (random crop, color jitter, blur) every epoch. Training is I/O and CPU bound even with num_workers maxed out. What are two architectural changes (not just more workers) that would help?",
          "a": "First, separate the parts of preprocessing that are the SAME every epoch from the parts that must be random: if resizing to a fixed base resolution or decoding the raw file format doesn't need to vary per epoch, do it once as an offline preprocessing pass (write out resized/decoded images or even pre-tokenized tensors to a fast format like a memory-mapped array or WebDataset shards) so __getitem__ only re-does the genuinely random augmentation steps at train time, not the expensive fixed decode. Second, if the augmentations themselves are the bottleneck, move image augmentation onto the GPU as a batched operation *after* the DataLoader hands off a batch of raw-ish tensors (e.g., using torchvision's GPU-accelerated transforms or a library like Kornia), trading CPU-per-item work for one vectorized GPU op per batch - the same 01-01 vectorization principle applied to the data pipeline instead of the model.",
          "deepDive": {
            "q": "What's the tradeoff of doing augmentation on GPU instead of CPU workers?",
            "a": "GPU augmentation competes for the same GPU compute/memory the model training itself needs, so if the GPU is already near saturation from the model's forward/backward pass, adding augmentation work there can slow down training even though it 'frees up' the CPU - whereas CPU-worker augmentation runs on otherwise-idle CPU cores in parallel with GPU compute; the right choice depends on which resource (CPU throughput vs GPU headroom) is actually the bottleneck, which is why profiling (comparing GPU utilization with a dummy-data pipeline vs the real one) should precede this architectural decision rather than guessing."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Map-style Dataset contract",
        "back": "Implement __len__ (count) and __getitem__ (fetch example by index) - DataLoader handles batching/shuffling/parallelism on top."
      },
      {
        "type": "intuition",
        "front": "Why num_workers>0 helps",
        "back": "Parallel processes prepare future batches while the GPU trains on the current one - overlaps loading with compute instead of stalling on it."
      },
      {
        "type": "definition",
        "front": "pin_memory + non_blocking",
        "back": "Page-locked host memory + async transfer - overlaps the CPU-to-GPU copy with computation instead of blocking on it."
      },
      {
        "type": "pitfall",
        "front": "Partial final batch + BatchNorm",
        "back": "A size-1 last batch makes per-batch mean/variance degenerate - use drop_last=True."
      },
      {
        "type": "pitfall",
        "front": "Unseeded multi-worker augmentation",
        "back": "Worker processes can share RNG state at fork time and produce identical 'random' augmentations - seed each worker independently via worker_init_fn."
      },
      {
        "type": "definition",
        "front": "Map-style vs IterableDataset",
        "back": "Map-style = random access (__getitem__); IterableDataset = sequential only (__iter__) - for data too large/streamed to index."
      },
      {
        "type": "formula",
        "front": "Inverse-frequency sampling weight",
        "back": "w_i = 1 / count(class of i) - used by WeightedRandomSampler to flatten a sampled class distribution toward uniform."
      },
      {
        "type": "pitfall",
        "front": "Normalization stats leakage",
        "back": "Computing mean/std for normalization on the full dataset (not just train split) leaks validation/test information."
      }
    ],
    "refs": [
      {
        "title": "PyTorch: Datasets & DataLoaders tutorial",
        "url": "https://pytorch.org/tutorials/beginner/basics/data_tutorial.html"
      },
      {
        "title": "PyTorch: torch.utils.data documentation",
        "url": "https://pytorch.org/docs/stable/data.html"
      },
      {
        "title": "PyTorch: Reproducibility notes",
        "url": "https://pytorch.org/docs/stable/notes/randomness.html"
      },
      {
        "title": "torchvision: FashionMNIST dataset",
        "url": "https://pytorch.org/vision/stable/generated/torchvision.datasets.FashionMNIST.html"
      }
    ],
    "demos": [
      "reservoir-sampling"
    ],
    "demoTitles": {
      "reservoir-sampling": "Reservoir Sampling"
    }
  }
};
