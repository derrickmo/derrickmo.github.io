// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// Titles and one-liners only: everything module-app.jsx's concept cards read, and
// nothing else. The full sub-lessons.js is ~16x larger and no page loads it any more.

window.SUB_LESSONS_NAV = {
  "foundations": {
    "title": "Mathematical and Programming Foundations",
    "intro": "The handful of mathematical ideas the rest of the course quietly assumes: how derivatives compose, how a model learns by descending a loss, how to reason about uncertainty, and why averages become bell curves.",
    "order": [
      "chain-rule",
      "gradient-descent",
      "softmax",
      "cross-entropy",
      "bayes",
      "entropy",
      "clt",
      "fourier",
      "mutual-information",
      "importance-sampling",
      "reservoir-sampling",
      "huffman-coding",
      "aliasing",
      "channel-capacity"
    ],
    "lessons": {
      "chain-rule": {
        "title": "The Chain Rule",
        "oneLine": "Compose derivatives through a graph - the calculus identity that makes backprop possible."
      },
      "gradient-descent": {
        "title": "Gradient Descent",
        "oneLine": "Follow the negative gradient downhill to minimize a loss."
      },
      "softmax": {
        "title": "Softmax",
        "oneLine": "Turn a vector of scores into a probability distribution."
      },
      "cross-entropy": {
        "title": "Cross-Entropy Loss",
        "oneLine": "Measure how far a predicted distribution is from the true label."
      },
      "bayes": {
        "title": "Bayes' Rule",
        "oneLine": "Update what you believe in light of new evidence."
      },
      "entropy": {
        "title": "Entropy and Information",
        "oneLine": "Measure how much uncertainty a distribution carries, in bits."
      },
      "clt": {
        "title": "The Central Limit Theorem",
        "oneLine": "Sums of many independent random draws look Gaussian, whatever the source."
      },
      "fourier": {
        "title": "Fourier Series",
        "oneLine": "Any periodic signal is a sum of sines — and that basis change is why positional encodings and spectrograms look the way they do."
      },
      "mutual-information": {
        "title": "Mutual Information",
        "oneLine": "How many bits knowing one variable saves you about another — a dependence measure that sees every relationship, not just linear ones."
      },
      "importance-sampling": {
        "title": "Importance Sampling",
        "oneLine": "Estimate an expectation under one distribution using samples from another, by reweighting — and watch the variance explode when the two disagree."
      },
      "reservoir-sampling": {
        "title": "Reservoir Sampling",
        "oneLine": "A uniform sample of k items from a stream of unknown length, in one pass and constant memory."
      },
      "huffman-coding": {
        "title": "Huffman Coding",
        "oneLine": "Give frequent symbols short codes — provably optimal among per-symbol codes, and that qualifier is where all the interesting losses hide."
      },
      "aliasing": {
        "title": "Aliasing & the Nyquist Limit",
        "oneLine": "Sample too slowly and a high frequency comes back wearing a low frequency's clothes — indistinguishably, and permanently."
      },
      "channel-capacity": {
        "title": "Channel Capacity",
        "oneLine": "The exact number of bits a noisy channel can carry per use — reachable with coding, and unreachable without it."
      }
    }
  },
  "supervised-learning": {
    "title": "Supervised Learning",
    "intro": "The classic classifiers, each built before it is trusted: vote with your neighbors, carve the space with questions, find the widest margin, and score the result honestly.",
    "order": [
      "decision-tree",
      "roc",
      "bayesian-linear-regression"
    ],
    "lessons": {
      "decision-tree": {
        "title": "Decision Trees",
        "oneLine": "Carve the feature space with a sequence of axis-aligned questions."
      },
      "roc": {
        "title": "ROC and Thresholds",
        "oneLine": "Score a classifier honestly across every decision threshold."
      },
      "bayesian-linear-regression": {
        "title": "Bayesian Linear Regression",
        "oneLine": "Put a prior on the weights and get a posterior instead of a point — which is exactly ridge regression, plus an error bar that grows where you have no data."
      }
    }
  },
  "unsupervised-learning": {
    "title": "Unsupervised Learning",
    "intro": "Finding structure with no labels at all: group points that belong together, and find the directions that carry the information.",
    "order": [
      "dbscan",
      "hierarchical-clustering",
      "tsne",
      "spectral-clustering",
      "kernel-density"
    ],
    "lessons": {
      "dbscan": {
        "title": "DBSCAN",
        "oneLine": "Find dense clusters of any shape, and label the rest as noise."
      },
      "hierarchical-clustering": {
        "title": "Hierarchical Clustering",
        "oneLine": "Build a tree of merges and cut it at the height you want."
      },
      "tsne": {
        "title": "t-SNE",
        "oneLine": "Lay out high-dimensional data in 2D so neighborhoods are preserved."
      },
      "spectral-clustering": {
        "title": "Spectral Clustering",
        "oneLine": "Cut the similarity graph, not the feature space — which is why it finds the two interleaved rings that k-means cannot."
      },
      "kernel-density": {
        "title": "Kernel Density Estimation",
        "oneLine": "Estimate a density by putting a bump on every point — where the bump's WIDTH matters about ten times more than its shape."
      }
    }
  },
  "ml-theory": {
    "title": "Machine Learning Theory",
    "intro": "Why models generalize - or fail to: the bias-variance trade-off, how regularization tames it, how to estimate true performance, and the surprise of double descent.",
    "order": [
      "regularization",
      "double-descent",
      "overfitting",
      "newtons-method",
      "active-learning",
      "coordinate-descent",
      "proximal-gradient",
      "quasi-newton",
      "coreset",
      "dataset-distillation"
    ],
    "lessons": {
      "regularization": {
        "title": "Regularization",
        "oneLine": "Penalize complexity to trade a little bias for much less variance."
      },
      "double-descent": {
        "title": "Double Descent",
        "oneLine": "Past the interpolation threshold, more parameters can help again."
      },
      "overfitting": {
        "title": "Overfitting & Generalization",
        "oneLine": "Fitting the noise instead of the signal — measurable only against data the model has never seen, which is why the split is the experiment."
      },
      "newtons-method": {
        "title": "Newton's Method & Second-Order Optimization",
        "oneLine": "Use curvature, not just slope — quadratic convergence that nobody can afford at scale, and the approximations that made it usable."
      },
      "active-learning": {
        "title": "Active Learning",
        "oneLine": "Let the model choose what gets labelled next — a real win when labels are the bottleneck, and a quiet way to bias your test set."
      },
      "coordinate-descent": {
        "title": "Coordinate Descent",
        "oneLine": "Optimise one variable at a time. It is why lasso paths are cheap — and it silently stalls the moment the penalty stops being separable."
      },
      "proximal-gradient": {
        "title": "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)",
        "oneLine": "Take a gradient step on the smooth part, then apply the penalty exactly — and add momentum only once you know the problem is ill-conditioned."
      },
      "quasi-newton": {
        "title": "Quasi-Newton Methods (BFGS / L-BFGS)",
        "oneLine": "Build curvature from the gradients you already computed — and treat the memory length as a real hyperparameter, because it is."
      },
      "coreset": {
        "title": "Coresets",
        "oneLine": "A small weighted subset that provably approximates the full dataset's objective — and the weights are what make it unbiased."
      },
      "dataset-distillation": {
        "title": "Dataset Distillation",
        "oneLine": "Synthesise a handful of examples that train a model as well as the whole dataset — for a linear model you can construct them in closed form and prove it."
      }
    }
  },
  "neural-nets": {
    "title": "Neural Networks from Scratch",
    "intro": "The deep-learning core: stack linear maps and nonlinearities into a network, get gradients with backprop, keep training stable with the right activations, initialization, normalization, and optimizer.",
    "order": [
      "mlp",
      "activations",
      "optimizers",
      "batch-norm",
      "weight-init",
      "perceptron",
      "adam",
      "label-noise"
    ],
    "lessons": {
      "mlp": {
        "title": "The Multilayer Perceptron",
        "oneLine": "Stack linear layers and nonlinearities into a universal function approximator."
      },
      "activations": {
        "title": "Activation Functions",
        "oneLine": "The per-neuron nonlinearity that gives a network its expressive power."
      },
      "optimizers": {
        "title": "Optimizers: SGD to Adam",
        "oneLine": "Turn raw gradients into stable, fast parameter updates."
      },
      "batch-norm": {
        "title": "Batch Normalization",
        "oneLine": "Normalize activations across the batch to stabilize training."
      },
      "weight-init": {
        "title": "Weight Initialization",
        "oneLine": "Start with the right variance so signals neither vanish nor explode."
      },
      "perceptron": {
        "title": "The Perceptron",
        "oneLine": "One neuron, one linear boundary — and the 1969 proof of what it cannot do is why depth exists."
      },
      "adam": {
        "title": "Adam",
        "oneLine": "Per-parameter step sizes from running estimates of the gradient's mean and variance — the default, and worth knowing why it is not always the right default."
      },
      "label-noise": {
        "title": "Label Noise & Memorization",
        "oneLine": "Networks learn the signal first and memorise the noise afterwards — which is why early stopping is a noise-robustness method, with a measurable payoff."
      }
    }
  },
  "cnn": {
    "title": "Convolutional Neural Networks",
    "intro": "Vision-shaped networks: slide learnable filters over the image, share weights for translation equivariance, and regularize with augmentation.",
    "order": [
      "cnn",
      "data-augmentation"
    ],
    "lessons": {
      "cnn": {
        "title": "Convolutional Networks",
        "oneLine": "Stack convolutions and pooling into a hierarchy of visual features."
      },
      "data-augmentation": {
        "title": "Data Augmentation",
        "oneLine": "Manufacture label-preserving variety to regularize a vision model."
      }
    }
  },
  "rnn-nlp": {
    "title": "Sequence Models and NLP",
    "intro": "Modeling order before transformers: Markov chains, learned word vectors, recurrent state, and the gates that made it trainable.",
    "order": [
      "markov",
      "word2vec",
      "lstm-gates",
      "hmm-viterbi"
    ],
    "lessons": {
      "markov": {
        "title": "Markov Chains",
        "oneLine": "Model a sequence where the next step depends only on the current state."
      },
      "word2vec": {
        "title": "Word2Vec",
        "oneLine": "Learn word vectors by predicting a word from its context."
      },
      "lstm-gates": {
        "title": "LSTM Gates",
        "oneLine": "Gates let a recurrent net keep or forget information over long spans."
      },
      "hmm-viterbi": {
        "title": "HMM & the Viterbi Algorithm",
        "oneLine": "Recover the most likely hidden sequence — noting that the most likely sequence is not the sequence of most likely states, and the difference can be an impossible path."
      }
    }
  },
  "transformers": {
    "title": "Transformers",
    "intro": "The architecture behind modern language models, built one idea at a time: turn text into tokens, tokens into vectors, give them a sense of order, let them attend to each other, stack that into a block, and decode the result back into text.",
    "order": [
      "tokenization",
      "embeddings",
      "attention",
      "multi-head",
      "decoding"
    ],
    "lessons": {
      "tokenization": {
        "title": "Tokenization",
        "oneLine": "Turn raw text into the discrete tokens a model actually consumes."
      },
      "embeddings": {
        "title": "Embeddings",
        "oneLine": "Map each token id to a dense vector whose geometry carries meaning."
      },
      "attention": {
        "title": "Attention",
        "oneLine": "Weight every token by how relevant it is to the one you are computing."
      },
      "multi-head": {
        "title": "Multi-Head Attention",
        "oneLine": "Run several attention patterns in parallel, then combine them."
      },
      "decoding": {
        "title": "Decoding",
        "oneLine": "Turn the model's next-token distribution into actual generated text."
      }
    }
  },
  "advanced-cv": {
    "title": "Advanced Computer Vision",
    "intro": "Classic vision beyond convolution: find edges and corners, track motion, segment regions, and clean up overlapping detections.",
    "order": [
      "edge-detection",
      "hough-transform",
      "harris-corners",
      "hog",
      "optical-flow",
      "image-segmentation",
      "iou-nms",
      "histogram-equalization",
      "morphological-operations",
      "template-matching"
    ],
    "lessons": {
      "edge-detection": {
        "title": "Edge Detection",
        "oneLine": "Find boundaries where image intensity changes sharply."
      },
      "hough-transform": {
        "title": "The Hough Transform",
        "oneLine": "Detect lines by having edge points vote in parameter space."
      },
      "harris-corners": {
        "title": "Corner Detection",
        "oneLine": "Find points where intensity changes in every direction."
      },
      "hog": {
        "title": "HOG Features",
        "oneLine": "Describe shape by the histogram of gradient orientations in each cell."
      },
      "optical-flow": {
        "title": "Optical Flow",
        "oneLine": "Estimate the per-pixel motion between two frames."
      },
      "image-segmentation": {
        "title": "Image Segmentation",
        "oneLine": "Partition an image into coherent regions or objects."
      },
      "iou-nms": {
        "title": "IoU and Non-Max Suppression",
        "oneLine": "Collapse many overlapping detections into clean, single boxes."
      },
      "histogram-equalization": {
        "title": "Histogram Equalization",
        "oneLine": "Remap intensities through their own cumulative distribution to spread contrast — and amplify noise by the same factor, wherever the image was flat."
      },
      "morphological-operations": {
        "title": "Morphological Operations",
        "oneLine": "Erode, dilate, and the two useful compositions — shape-aware cleanup that is decided entirely by the structuring element you pick."
      },
      "template-matching": {
        "title": "Template Matching (Cross-Correlation)",
        "oneLine": "Slide a patch and score every position — but score it with normalised correlation, because raw correlation just finds whatever is brightest."
      }
    }
  },
  "advanced-nlp": {
    "title": "Advanced NLP and Generation",
    "intro": "Beyond a single forward pass: search for better continuations, encode position efficiently, and cache computation so generation is fast.",
    "order": [
      "beam-search",
      "rope",
      "kv-cache"
    ],
    "lessons": {
      "beam-search": {
        "title": "Beam Search",
        "oneLine": "Keep several candidate continuations instead of committing greedily."
      },
      "rope": {
        "title": "Rotary Position Embeddings",
        "oneLine": "Encode position by rotating query and key vectors."
      },
      "kv-cache": {
        "title": "The KV Cache",
        "oneLine": "Cache past keys and values so each new token is cheap to generate."
      }
    }
  },
  "generative": {
    "title": "Generative Models",
    "intro": "Three ways to learn to create data: encode and sample through a latent space, train a generator against a critic, or add noise and learn to reverse it.",
    "order": [
      "diffusion",
      "variational-inference"
    ],
    "lessons": {
      "diffusion": {
        "title": "Diffusion Models",
        "oneLine": "Add noise to data, then train a network to reverse it step by step."
      },
      "variational-inference": {
        "title": "Variational Inference & the ELBO",
        "oneLine": "Turn an intractable integral into an optimisation problem — and accept that the bound you maximise is not the thing you wanted."
      }
    }
  },
  "multimodal": {
    "title": "Multimodal Learning",
    "intro": "Tying modalities together through a shared embedding space, and searching that space at scale.",
    "order": [
      "contrastive-learning",
      "vector-search",
      "spectrogram",
      "mfcc",
      "pitch-detection",
      "dtw"
    ],
    "lessons": {
      "contrastive-learning": {
        "title": "Contrastive Learning",
        "oneLine": "Pull matching pairs together and push mismatches apart in embedding space."
      },
      "vector-search": {
        "title": "Vector Search",
        "oneLine": "Find the nearest embeddings to a query, fast, at scale."
      },
      "spectrogram": {
        "title": "Spectrograms & the STFT",
        "oneLine": "Chop audio into short windows, take a Fourier transform of each — and accept a hard trade between time and frequency resolution."
      },
      "mfcc": {
        "title": "Mel Filterbank & MFCC",
        "oneLine": "Warp frequency the way hearing does, take the log, then decorrelate with a DCT — and know that the last step is the one modern systems drop."
      },
      "pitch-detection": {
        "title": "Pitch Detection (Autocorrelation)",
        "oneLine": "Find the lag at which a signal best resembles itself — then deal with the octave errors, which are the entire practical problem."
      },
      "dtw": {
        "title": "Dynamic Time Warping",
        "oneLine": "Compare two sequences that are the same shape at different speeds — a distance that is genuinely useful and genuinely not a metric."
      }
    }
  },
  "fine-tuning": {
    "title": "Fine-Tuning and Alignment",
    "intro": "Adapting a pretrained model cheaply, and steering it toward human preferences.",
    "order": [
      "reward-model",
      "dpo"
    ],
    "lessons": {
      "reward-model": {
        "title": "Reward Modeling",
        "oneLine": "Learn a scalar reward from human preference comparisons."
      },
      "dpo": {
        "title": "Direct Preference Optimization",
        "oneLine": "Optimize a model on preferences directly, skipping the RL loop."
      }
    }
  },
  "reinforcement-learning": {
    "title": "Reinforcement Learning",
    "intro": "Learning from reward, built up in order: balance exploration, solve known MDPs with Bellman backups, learn values from experience, then optimize policies directly and with deep function approximators.",
    "order": [
      "bandit",
      "sarsa",
      "td-lambda",
      "double-q-learning",
      "gae",
      "ppo",
      "dyna-q",
      "regret-matching",
      "minimax",
      "mcts",
      "neuroevolution",
      "prioritized-replay",
      "distributional-rl",
      "successor-representation",
      "max-entropy-rl",
      "cfr",
      "replicator-dynamics",
      "iterated-prisoners-dilemma"
    ],
    "lessons": {
      "bandit": {
        "title": "Multi-Armed Bandits",
        "oneLine": "The simplest RL problem: balance exploring options against exploiting the best."
      },
      "sarsa": {
        "title": "SARSA",
        "oneLine": "On-policy control: update toward the action you actually took."
      },
      "td-lambda": {
        "title": "TD(lambda) and Eligibility Traces",
        "oneLine": "Dial smoothly between one-step TD and full Monte Carlo."
      },
      "double-q-learning": {
        "title": "Double Q-Learning",
        "oneLine": "Cancel the optimistic bias that fools plain Q-learning."
      },
      "gae": {
        "title": "Generalized Advantage Estimation",
        "oneLine": "Tune the bias-variance trade-off of the advantage signal."
      },
      "ppo": {
        "title": "Proximal Policy Optimization",
        "oneLine": "Take the biggest safe policy step by clipping the update."
      },
      "dyna-q": {
        "title": "Dyna-Q",
        "oneLine": "Learn a model of the world and plan inside it between real steps."
      },
      "regret-matching": {
        "title": "Regret Matching & Nash Equilibrium",
        "oneLine": "Play each action in proportion to how much you regret not having played it — and the time-average converges to equilibrium."
      },
      "minimax": {
        "title": "Minimax & Alpha-Beta",
        "oneLine": "Assume the opponent plays their best reply, then pick the move that survives it — and prune the branches that provably cannot change the answer."
      },
      "mcts": {
        "title": "Monte-Carlo Tree Search",
        "oneLine": "Spend your search budget where it looks promising — statistics instead of enumeration, which is what made Go tractable."
      },
      "neuroevolution": {
        "title": "Neuroevolution",
        "oneLine": "Optimise the weights by perturb-and-rank instead of by backpropagation — worth it when the reward has no usable gradient, or when you have far more machines than patience."
      },
      "prioritized-replay": {
        "title": "Prioritized Experience Replay",
        "oneLine": "Replay surprising transitions more often — which speeds learning and quietly changes what you are averaging over, unless you correct for it."
      },
      "distributional-rl": {
        "title": "Distributional RL (C51)",
        "oneLine": "Learn the whole distribution of returns instead of its mean — the mean comes out the same, and the shape is what improves the agent."
      },
      "successor-representation": {
        "title": "Successor Representation",
        "oneLine": "Cache where the policy tends to go, separately from what you get for going there — so a new reward is instant and a new wall is not."
      },
      "max-entropy-rl": {
        "title": "Maximum-Entropy RL (Soft Value Iteration)",
        "oneLine": "Add the policy's entropy to the objective and the max in the Bellman backup becomes a log-sum-exp — which is where SAC comes from."
      },
      "cfr": {
        "title": "Counterfactual Regret Minimization",
        "oneLine": "Minimise regret at every information set and the AVERAGE strategy converges to Nash — the current one never does, and confusing them is the classic bug."
      },
      "replicator-dynamics": {
        "title": "Replicator Dynamics",
        "oneLine": "Strategies that beat the average grow — and in rock-paper-scissors the population orbits forever rather than converging to the equilibrium."
      },
      "iterated-prisoners-dilemma": {
        "title": "Iterated Prisoner's Dilemma",
        "oneLine": "Repetition makes cooperation rational — and a two percent chance of a mistake is enough to destroy it between two copies of tit-for-tat."
      }
    }
  },
  "pytorch-internals": {
    "title": "PyTorch Internals",
    "intro": "What a deep-learning framework actually does for you: record a computation graph, differentiate it automatically, and drive the standard train loop.",
    "order": [
      "backprop",
      "optimizers",
      "gradient-descent"
    ],
    "lessons": {
      "backprop": {
        "title": "Autograd and the Computational Graph",
        "oneLine": "How a framework records operations and replays them backward for gradients."
      },
      "optimizers": {
        "title": "The Optimizer Step",
        "oneLine": "How torch.optim turns accumulated gradients into a weight update."
      },
      "gradient-descent": {
        "title": "The Training Loop",
        "oneLine": "The five-line skeleton at the heart of every training script."
      }
    }
  },
  "training-systems": {
    "title": "Training at Scale",
    "intro": "Keeping large training runs stable and efficient: schedule the learning rate, tame exploding gradients, train in low precision, and predict returns with scaling laws.",
    "order": [
      "lr-schedule",
      "gradient-clipping",
      "scaling-laws",
      "bayesian-optimization"
    ],
    "lessons": {
      "lr-schedule": {
        "title": "Learning-Rate Schedules",
        "oneLine": "Vary the step size over training - warm up, then decay."
      },
      "gradient-clipping": {
        "title": "Gradient Clipping",
        "oneLine": "Cap the gradient norm so a bad batch cannot blow up training."
      },
      "scaling-laws": {
        "title": "Scaling Laws",
        "oneLine": "Loss falls as a predictable power law in compute, data, and parameters."
      },
      "bayesian-optimization": {
        "title": "Bayesian Optimization",
        "oneLine": "Model the objective you cannot see, then spend each expensive evaluation where the model says it will learn the most."
      }
    }
  },
  "llm-systems": {
    "title": "LLM Systems and Efficiency",
    "intro": "Making large models cheap enough to serve: fewer bits per weight, faster decoding, paged memory for the KV cache, and conditional compute.",
    "order": [
      "pruning",
      "paged-attention",
      "kv-cache-eviction",
      "mixture-of-depths"
    ],
    "lessons": {
      "pruning": {
        "title": "Pruning",
        "oneLine": "Remove the weights that barely matter to shrink the model."
      },
      "paged-attention": {
        "title": "Paged Attention",
        "oneLine": "Manage the KV cache like virtual memory to kill fragmentation."
      },
      "kv-cache-eviction": {
        "title": "KV-Cache Eviction",
        "oneLine": "The cache, not the weights, is what fills your GPU at long context — and which tokens you may drop is not obvious."
      },
      "mixture-of-depths": {
        "title": "Mixture-of-Depths",
        "oneLine": "Route only some tokens through each block — conditional DEPTH rather than conditional width, and the saving beats the routed fraction."
      }
    }
  },
  "rag-agents": {
    "title": "RAG and Agents",
    "intro": "Turning a raw model into a grounded, reliable, safe system: chunk and retrieve the right context, rerank it, let the model act in a loop, and guard the edges.",
    "order": [
      "rag-chunking",
      "hyde",
      "reranking",
      "react-agent",
      "self-consistency",
      "reflection",
      "prompt-injection",
      "rag-fusion"
    ],
    "lessons": {
      "rag-chunking": {
        "title": "Chunking for Retrieval",
        "oneLine": "Split documents so the answer survives retrieval intact."
      },
      "hyde": {
        "title": "HyDE",
        "oneLine": "Retrieve with a hypothetical answer instead of the raw question."
      },
      "reranking": {
        "title": "Reranking",
        "oneLine": "Re-score the top retrieved hits with a more careful model."
      },
      "react-agent": {
        "title": "The ReAct Agent Loop",
        "oneLine": "Interleave reasoning with tool calls in a thought-action-observation loop."
      },
      "self-consistency": {
        "title": "Self-Consistency",
        "oneLine": "Sample several reasoning paths and take the majority answer."
      },
      "reflection": {
        "title": "Reflection",
        "oneLine": "Draft, critique, and revise toward a quality bar."
      },
      "prompt-injection": {
        "title": "Prompt Injection",
        "oneLine": "The attacks that hijack an LLM, and the layered defenses against them."
      },
      "rag-fusion": {
        "title": "Multi-Query & RAG-Fusion",
        "oneLine": "Ask the question several ways and fuse the rankings — where using ranks instead of scores is what makes fusing incompatible retrievers possible at all."
      }
    }
  },
  "ml-applications": {
    "title": "Applied Machine Learning",
    "intro": "Putting models to work responsibly: forecast the future, make confidence scores trustworthy, and explain what drove a prediction.",
    "order": [
      "forecasting",
      "calibration",
      "conformal",
      "fairness",
      "pagerank",
      "community-detection",
      "label-propagation",
      "kalman-filter"
    ],
    "lessons": {
      "forecasting": {
        "title": "Time-Series Forecasting",
        "oneLine": "Predict future values from the patterns in past observations."
      },
      "calibration": {
        "title": "Calibration",
        "oneLine": "Make a model's confidence match its real accuracy."
      },
      "conformal": {
        "title": "Conformal Prediction",
        "oneLine": "Output prediction sets with a guaranteed coverage rate."
      },
      "fairness": {
        "title": "Fairness Metrics",
        "oneLine": "Measure group disparities - and confront their impossibility."
      },
      "pagerank": {
        "title": "PageRank",
        "oneLine": "Importance as the stationary distribution of a random walk — an eigenvector problem that you solve by repeated multiplication, never by decomposition."
      },
      "community-detection": {
        "title": "Community Detection (Louvain)",
        "oneLine": "Find groups that are denser inside than chance predicts — and know that the objective itself is blind below a scale set by the graph's size."
      },
      "label-propagation": {
        "title": "Label Propagation",
        "oneLine": "Let a few labels diffuse through a similarity graph — powerful when the manifold assumption holds, and biased by whichever class you happened to label."
      },
      "kalman-filter": {
        "title": "Kalman Filter",
        "oneLine": "The optimal recursive estimator for a linear-Gaussian system — and a machine whose output quality is set entirely by two noise numbers you have to supply."
      }
    }
  },
  "mlops": {
    "title": "MLOps and Serving",
    "intro": "Running models in production: serve them efficiently, scale with demand, ship new versions safely, and notice when the world shifts under them.",
    "order": [
      "autoscaling",
      "canary-rollout",
      "drift-detection",
      "bloom-filter",
      "count-min-sketch",
      "semantic-caching",
      "model-cascade"
    ],
    "lessons": {
      "autoscaling": {
        "title": "Autoscaling",
        "oneLine": "Track demand by adding and removing replicas automatically."
      },
      "canary-rollout": {
        "title": "Canary Rollouts",
        "oneLine": "Ship a new model to a slice of traffic, watch, then ramp or roll back."
      },
      "drift-detection": {
        "title": "Drift Detection",
        "oneLine": "Notice when production data has shifted away from training."
      },
      "bloom-filter": {
        "title": "Bloom Filter",
        "oneLine": "A membership test that can say yes when it means no, never the reverse — and whose error rate you can compute before you build it."
      },
      "count-min-sketch": {
        "title": "Count-Min Sketch",
        "oneLine": "Approximate frequencies in fixed memory, always overestimating — excellent for heavy hitters and worthless for the tail."
      },
      "semantic-caching": {
        "title": "Semantic Caching",
        "oneLine": "Serve a cached answer when a new question means the same thing — where the similarity threshold is a product decision about how often you are willing to be wrong."
      },
      "model-cascade": {
        "title": "Model Cascade & Early-Exit",
        "oneLine": "Answer the easy queries with the cheap model and escalate the rest — where the deferral rule, not the models, is what you are actually designing."
      }
    }
  },
  "agentic-ai": {
    "title": "Concept by concept",
    "intro": "The pieces an agent is assembled from, taken one at a time. Each is a mechanism you can measure on its own before it disappears into a loop that does five things at once.",
    "order": [
      "tool-routing",
      "guardrails",
      "constrained-decoding"
    ],
    "lessons": {
      "tool-routing": {
        "title": "Tool Routing",
        "oneLine": "Choosing which tool to call is a classification problem hiding inside a generation problem."
      },
      "guardrails": {
        "title": "Agent Guardrails",
        "oneLine": "Independent layers multiply the attacker's failure probability - which is why defence composes where a pipeline does not."
      },
      "constrained-decoding": {
        "title": "Constrained Decoding",
        "oneLine": "Mask invalid tokens at every step and a valid parse stops being a result - it becomes the definition."
      }
    }
  },
  "frontier-frameworks": {
    "title": "Concept by concept",
    "intro": "The techniques that survive the framework churn. Each is a mechanism rather than an API, which is why they outlast the library that first shipped them.",
    "order": [
      "quantization",
      "speculative-decoding",
      "lora",
      "moe"
    ],
    "lessons": {
      "quantization": {
        "title": "Quantization",
        "oneLine": "Fewer bits per weight, and the outliers decide how few you can get away with."
      },
      "speculative-decoding": {
        "title": "Speculative Decoding",
        "oneLine": "Verify k drafted tokens for the price of one, because decoding is bandwidth-bound and the weights are read once either way."
      },
      "lora": {
        "title": "LoRA",
        "oneLine": "Assume the update is low rank, train two thin matrices, and merge them back for free inference."
      },
      "moe": {
        "title": "Mixture of Experts",
        "oneLine": "Route each token to a few experts: parameters grow, compute per token does not - and all of them still have to be resident."
      }
    }
  },
  "causal-inference": {
    "title": "Concept by concept",
    "intro": "The ideas this module rests on, taken one at a time. Each is a claim about what the data cannot tell you on its own - which is the whole subject in one sentence.",
    "order": [
      "causal-inference",
      "simpsons-paradox",
      "mcmc"
    ],
    "lessons": {
      "causal-inference": {
        "title": "Causal Inference",
        "oneLine": "Estimating what WOULD have happened, from data that only records what did."
      },
      "simpsons-paradox": {
        "title": "Simpson's Paradox",
        "oneLine": "A trend that reverses on aggregation - and no statistic in the table tells you which answer to act on."
      },
      "mcmc": {
        "title": "MCMC",
        "oneLine": "Sample from a distribution you can only evaluate up to a constant, by building a chain whose stationary distribution is it."
      }
    }
  },
  "trustworthy-ai": {
    "title": "Concept by concept",
    "intro": "The instruments this module uses to interrogate a model. Every one of them is a true measurement over a reference class narrower than its name suggests.",
    "order": [
      "shap",
      "saliency",
      "adversarial-examples",
      "superposition",
      "activation-patching",
      "sparse-autoencoder",
      "certified-robustness",
      "conformal-regression"
    ],
    "lessons": {
      "shap": {
        "title": "SHAP Values",
        "oneLine": "The only attribution satisfying a set of fairness axioms - computed against a baseline that the number never mentions."
      },
      "saliency": {
        "title": "Saliency Maps",
        "oneLine": "Gradient-based heat maps that look convincing whether or not they track the model."
      },
      "adversarial-examples": {
        "title": "Adversarial Examples",
        "oneLine": "Imperceptible perturbations that flip a prediction - and the direction, not the size, is what does it."
      },
      "superposition": {
        "title": "Superposition",
        "oneLine": "More features than dimensions, packed at an angle - which is why single neurons rarely mean one thing."
      },
      "activation-patching": {
        "title": "Activation Patching",
        "oneLine": "The do-operator applied inside a network - the one place in ML where intervention is exact and free."
      },
      "sparse-autoencoder": {
        "title": "Sparse Autoencoders & Superposition",
        "oneLine": "Neurons are polysemantic because models pack more features than dimensions — and a sparse dictionary can pull some of them apart."
      },
      "certified-robustness": {
        "title": "Certified Robustness",
        "oneLine": "A proof that no perturbation within a radius can change the prediction — narrower than it sounds, and the only claim an adaptive attacker cannot refute."
      },
      "conformal-regression": {
        "title": "Conformal Regression",
        "oneLine": "Distribution-free prediction intervals with a coverage guarantee that genuinely holds — as long as you know it is a guarantee about the average, not about your case."
      }
    }
  },
  "interview-capstone": {
    "title": "Concept by concept",
    "intro": "The handful of ideas that recur across every round. Each is small enough to state in a minute and general enough to answer questions you did not prepare for.",
    "order": [
      "classification-metrics",
      "dynamic-programming",
      "graph-search",
      "search-astar",
      "dijkstra",
      "backtracking",
      "simulated-annealing",
      "branch-and-bound",
      "arc-consistency",
      "mst",
      "max-flow"
    ],
    "lessons": {
      "classification-metrics": {
        "title": "Classification Metrics",
        "oneLine": "Precision, recall and the rest are a family, and picking the wrong member is how a project optimizes the wrong thing."
      },
      "dynamic-programming": {
        "title": "Dynamic Programming",
        "oneLine": "Overlapping subproblems plus optimal substructure - and the ML versions are the same recursion wearing different names."
      },
      "graph-search": {
        "title": "Graph Search",
        "oneLine": "BFS, Dijkstra and A* are one algorithm with three queues - and the heuristic is the only thing that must be proven."
      },
      "search-astar": {
        "title": "A* and Informed Search",
        "oneLine": "Dijkstra with a hint: rank by cost-so-far plus an estimate of cost-to-go, and stay optimal as long as the estimate never over-promises."
      },
      "dijkstra": {
        "title": "Dijkstra's Shortest Path",
        "oneLine": "Always expand the closest unfinished node — correct precisely because edge weights are non-negative, and wrong the moment they are not."
      },
      "backtracking": {
        "title": "Backtracking & Constraint Satisfaction",
        "oneLine": "Search that undoes its own choices — and the pruning that turns an impossible enumeration into a tractable one."
      },
      "simulated-annealing": {
        "title": "Simulated Annealing",
        "oneLine": "Accept worse moves on purpose, less and less often — the simplest escape from a local minimum that still works."
      },
      "branch-and-bound": {
        "title": "Branch & Bound",
        "oneLine": "Search the whole tree in principle, and skip almost all of it in practice — the bound does the work, not the branching."
      },
      "arc-consistency": {
        "title": "Arc Consistency (AC-3)",
        "oneLine": "Delete values that provably cannot appear in any solution — a cheap pre-filter that prunes hard, and decides nothing."
      },
      "mst": {
        "title": "Minimum Spanning Tree",
        "oneLine": "Connect everything at least cost — and notice that single-linkage clustering is this algorithm with the last few edges deleted."
      },
      "max-flow": {
        "title": "Max Flow / Min Cut",
        "oneLine": "The most you can push equals the cheapest thing you can sever — one theorem that turns matching, segmentation and scheduling into the same problem."
      }
    }
  }
};
