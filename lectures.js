// GENERATED from content/ by _private/scripts/gen-from-store.mjs — DO NOT EDIT BY HAND.
// Edit the canonical store (content/modules/) and re-run the generator.
// contentVersion 1.1.0
// lectures.js — condensed on-site lectures for the 25 ML-from-Scratch modules.
// Each is a high-level distillation; the full runnable notebooks live on GitHub.
// Consumed by module-app.jsx. Keyed by the curriculum slug (see curriculum.js).
// notebook fields: n=number, t=topic, d=dataset, m=time.

window.LECTURES = {
  "foundations": {
    "n": "01",
    "title": "Mathematical & Programming Foundations",
    "summary": "Build fluency with Python's numerical computing stack and establish the mathematical prerequisites for ML/DL — NumPy, PyTorch tensors, pandas, matplotlib, probability, linear algebra, calculus, and information theory.",
    "prereqs": "None — this is the entry module.",
    "takeaways": [
      "Write vectorized NumPy/PyTorch instead of Python loops — and understand why it's orders of magnitude faster.",
      "The linear algebra, calculus, probability, and information theory that every later module quietly assumes.",
      "Load, explore, and visualize real data with pandas, matplotlib, and PyTorch DataLoaders."
    ],
    "flagship": {
      "n": "01-06",
      "label": "Linear Algebra for Machine Learning",
      "href": "learn/foundations/linear-algebra/"
    },
    "notebooks": [
      {
        "n": "01-01",
        "t": "Python, NumPy & Tensor Speed",
        "d": "Synthetic",
        "m": "15 min"
      },
      {
        "n": "01-02",
        "t": "Advanced NumPy & PyTorch Operations",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "01-03",
        "t": "Pandas for Tabular Data",
        "d": "California Housing",
        "m": "15 min"
      },
      {
        "n": "01-04",
        "t": "Visualization with Matplotlib",
        "d": "Synthetic",
        "m": "15 min"
      },
      {
        "n": "01-05",
        "t": "Data Loading with PyTorch",
        "d": "FashionMNIST",
        "m": "20 min"
      },
      {
        "n": "01-06",
        "t": "Linear Algebra for Machine Learning",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "01-07",
        "t": "Probability & Statistics for ML",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "01-08",
        "t": "Information Theory for ML",
        "d": "Synthetic",
        "m": "15 min"
      },
      {
        "n": "01-09",
        "t": "Calculus & Optimization Foundations",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "01-10",
        "t": "Computational Thinking & Complexity",
        "d": "Synthetic",
        "m": "15 min"
      }
    ]
  },
  "supervised-learning": {
    "n": "02",
    "title": "Supervised Learning",
    "summary": "Master core supervised learning algorithms from scratch — linear and logistic regression, decision trees, random forests, gradient boosting, SVMs, kNN, Naive Bayes, and ensembles — building each from NumPy before comparing against sklearn.",
    "prereqs": "Module 01.",
    "takeaways": [
      "Implement regression, trees, boosting, SVMs, kNN, and Naive Bayes in NumPy before trusting a library.",
      "The decision-boundary and bias/variance intuition behind each family of models.",
      "How to compare algorithms and pick the right one for a given problem."
    ],
    "flagship": {
      "n": "02-04",
      "label": "Gradient Boosting and AdaBoost",
      "href": "learn/supervised-learning/boosting/"
    },
    "notebooks": [
      {
        "n": "02-01",
        "t": "Linear Regression",
        "d": "California Housing",
        "m": "20 min"
      },
      {
        "n": "02-02",
        "t": "Logistic Regression & Binary Classification",
        "d": "make_moons + make_blobs",
        "m": "20 min"
      },
      {
        "n": "02-03",
        "t": "Decision Trees & Random Forests",
        "d": "Iris + make_classification",
        "m": "25 min"
      },
      {
        "n": "02-04",
        "t": "Gradient Boosting & AdaBoost",
        "d": "California Housing",
        "m": "25 min"
      },
      {
        "n": "02-05",
        "t": "Support Vector Machines",
        "d": "make_moons + make_blobs",
        "m": "25 min"
      },
      {
        "n": "02-06",
        "t": "Generalized Linear Models & Exponential Family",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "02-07",
        "t": "k-Nearest Neighbors",
        "d": "Digits + make_blobs",
        "m": "20 min"
      },
      {
        "n": "02-08",
        "t": "Naive Bayes for Text Classification",
        "d": "20 Newsgroups",
        "m": "20 min"
      },
      {
        "n": "02-09",
        "t": "Stacking & Voting Ensembles",
        "d": "make_classification",
        "m": "20 min"
      },
      {
        "n": "02-10",
        "t": "Model Comparison & Algorithm Selection",
        "d": "California Housing + Iris",
        "m": "25 min"
      }
    ]
  },
  "unsupervised-learning": {
    "n": "03",
    "title": "Unsupervised & Statistical Learning",
    "summary": "Discover structure in unlabeled data — from clustering and dimensionality reduction to probabilistic models, kernel methods, and Bayesian inference — bridging classical statistics to the generative deep learning of Modules 11–12.",
    "prereqs": "Modules 01–02.",
    "takeaways": [
      "Find structure without labels: k-means, hierarchical & density clustering, PCA, t-SNE, UMAP.",
      "The EM algorithm and Gaussian mixtures — the conceptual bridge to VAEs.",
      "Kernel methods, matrix factorization, and Bayesian inference as recurring ML primitives."
    ],
    "flagship": {
      "n": "03-09",
      "label": "Matrix Factorization and SVD",
      "href": "learn/unsupervised-learning/matrix-factorization/"
    },
    "notebooks": [
      {
        "n": "03-01",
        "t": "K-Means Clustering",
        "d": "make_blobs + Iris",
        "m": "20 min"
      },
      {
        "n": "03-02",
        "t": "Hierarchical & Density-Based Clustering",
        "d": "make_moons + make_blobs",
        "m": "20 min"
      },
      {
        "n": "03-03",
        "t": "Principal Component Analysis",
        "d": "Digits + MNIST",
        "m": "20 min"
      },
      {
        "n": "03-04",
        "t": "t-SNE, UMAP & Manifold Learning",
        "d": "MNIST",
        "m": "25 min"
      },
      {
        "n": "03-05",
        "t": "Independent Component Analysis",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "03-06",
        "t": "Gaussian Mixture Models & EM Algorithm",
        "d": "make_blobs + Iris",
        "m": "25 min"
      },
      {
        "n": "03-07",
        "t": "Anomaly Detection",
        "d": "make_blobs + anomalies",
        "m": "20 min"
      },
      {
        "n": "03-08",
        "t": "Kernel Methods & Feature Maps",
        "d": "make_moons + Digits",
        "m": "20 min"
      },
      {
        "n": "03-09",
        "t": "Matrix Factorization & Decomposition",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "03-10",
        "t": "Bayesian Inference & Probabilistic Thinking",
        "d": "Synthetic",
        "m": "25 min"
      }
    ]
  },
  "ml-theory": {
    "n": "04",
    "title": "ML Theory & Evaluation",
    "summary": "Build production-quality evaluation pipelines and formal ML theory — from precision/recall to VC dimension, PAC learning, convex optimisation, calibration, and Gaussian processes — grounding every subsequent module in rigorous methodology.",
    "prereqs": "Modules 01–03.",
    "takeaways": [
      "Build honest evaluation: the right metrics, cross-validation, and leakage-free pipelines.",
      "Bias-variance, VC dimension, and PAC learning — why models generalize, or don't.",
      "Calibration, uncertainty quantification, and the convex-optimization backbone of training."
    ],
    "flagship": {
      "n": "04-06",
      "label": "Learning Theory - VC Dimension and PAC",
      "href": "learn/ml-theory/learning-theory/"
    },
    "notebooks": [
      {
        "n": "04-01",
        "t": "Evaluation Metrics Deep Dive",
        "d": "Digits + California Housing",
        "m": "20 min"
      },
      {
        "n": "04-02",
        "t": "Cross-Validation & Hyperparameter Tuning",
        "d": "Digits",
        "m": "25 min"
      },
      {
        "n": "04-03",
        "t": "Feature Engineering & Pipelines",
        "d": "California Housing",
        "m": "20 min"
      },
      {
        "n": "04-04",
        "t": "Data Augmentation & Color Spaces",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "04-05",
        "t": "Handling Imbalanced Data",
        "d": "make_classification",
        "m": "20 min"
      },
      {
        "n": "04-06",
        "t": "Learning Theory — VC Dimension & PAC",
        "d": "make_classification",
        "m": "20 min"
      },
      {
        "n": "04-07",
        "t": "Bias-Variance Decomposition & Debugging",
        "d": "make_classification + make_moons",
        "m": "25 min"
      },
      {
        "n": "04-08",
        "t": "Convex Optimization Foundations",
        "d": "make_classification + make_blobs",
        "m": "20 min"
      },
      {
        "n": "04-09",
        "t": "Calibration & Uncertainty Quantification",
        "d": "Digits + make_classification",
        "m": "20 min"
      },
      {
        "n": "04-10",
        "t": "Gaussian Processes & Bayesian Optimization",
        "d": "make_regression",
        "m": "25 min"
      }
    ]
  },
  "neural-nets": {
    "n": "05",
    "title": "Neural Network Foundations",
    "summary": "Build every core neural-network primitive from scratch — perceptron to full MLP — with PyTorch, developing an intuition for gradients, activations, and training dynamics.",
    "prereqs": "Modules 01–02.",
    "takeaways": [
      "Build a neural net from the perceptron up to a full MLP, with backpropagation derived by hand.",
      "Activations, losses, initialization, and regularization — and how each shapes training.",
      "Why optimizers (SGD → Adam) matter, then assemble a complete training pipeline."
    ],
    "flagships": [
      {
        "n": "05-06",
        "label": "Backpropagation from Scratch",
        "href": "learn/neural-nets/forward-pass/"
      },
      {
        "n": "05-04",
        "label": "Loss Functions Deep Dive",
        "href": "learn/neural-nets/loss-functions/"
      }
    ],
    "notebooks": [
      {
        "n": "05-01",
        "t": "The Perceptron",
        "d": "MNIST + make_moons",
        "m": "15 min"
      },
      {
        "n": "05-02",
        "t": "Multilayer Perceptrons",
        "d": "FashionMNIST + make_moons",
        "m": "20 min"
      },
      {
        "n": "05-03",
        "t": "Activation Functions",
        "d": "make_moons + FashionMNIST",
        "m": "15 min"
      },
      {
        "n": "05-04",
        "t": "Loss Functions",
        "d": "MNIST",
        "m": "15 min"
      },
      {
        "n": "05-05",
        "t": "Regularisation",
        "d": "FashionMNIST",
        "m": "15 min"
      },
      {
        "n": "05-06",
        "t": "Backpropagation",
        "d": "Synthetic regression",
        "m": "20 min"
      },
      {
        "n": "05-07",
        "t": "PyTorch Autograd",
        "d": "Synthetic",
        "m": "15 min"
      },
      {
        "n": "05-08",
        "t": "Weight Initialisation",
        "d": "MNIST",
        "m": "10 min"
      },
      {
        "n": "05-09",
        "t": "Optimisers",
        "d": "FashionMNIST",
        "m": "15 min"
      },
      {
        "n": "05-10",
        "t": "Complete MLP Pipeline",
        "d": "FashionMNIST",
        "m": "25 min"
      }
    ]
  },
  "cnn": {
    "n": "06",
    "title": "Convolutional Neural Networks",
    "summary": "Build every CNN primitive from scratch — convolution to ResNet skip connections — developing spatial intuition for how networks learn visual hierarchies on CIFAR-10.",
    "prereqs": "Module 05.",
    "takeaways": [
      "Implement convolution, pooling, and receptive fields from scratch.",
      "The architectural arc LeNet → AlexNet → VGG → ResNet, and what skip connections fix.",
      "Transfer learning, batch norm, augmentation, and efficient convolutions for real vision."
    ],
    "flagships": [
      {
        "n": "06-03",
        "label": "CNN Architectures: LeNet to ResNet",
        "href": "learn/cnn/cnn-architectures/"
      },
      {
        "n": "06-06",
        "label": "Transfer Learning and Fine-Tuning",
        "href": "learn/cnn/transfer-learning/"
      }
    ],
    "notebooks": [
      {
        "n": "06-01",
        "t": "Convolution from Scratch",
        "d": "MNIST",
        "m": "20 min"
      },
      {
        "n": "06-02",
        "t": "Pooling & Receptive Fields",
        "d": "MNIST",
        "m": "15 min"
      },
      {
        "n": "06-03",
        "t": "LeNet-5 & AlexNet",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "06-04",
        "t": "VGGNet & Deep CNN Design",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "06-05",
        "t": "ResNet & Skip Connections",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "06-06",
        "t": "Transfer Learning & Fine-Tuning",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "06-07",
        "t": "Data Augmentation",
        "d": "CIFAR-10",
        "m": "15 min"
      },
      {
        "n": "06-08",
        "t": "Batch Normalization in CNNs",
        "d": "CIFAR-10",
        "m": "15 min"
      },
      {
        "n": "06-09",
        "t": "Depthwise Separable Convolutions",
        "d": "CIFAR-10",
        "m": "15 min"
      },
      {
        "n": "06-10",
        "t": "CNN Pipeline Capstone",
        "d": "CIFAR-10",
        "m": "25 min"
      }
    ]
  },
  "rnn-nlp": {
    "n": "07",
    "title": "Recurrent Networks & NLP Foundations",
    "summary": "Build the complete NLP foundation stack from scratch — BPE tokenization, Word2Vec embeddings, vanilla RNNs, LSTMs, and seq2seq models — developing sequential intuition for language on WikiText-2 and AG_NEWS.",
    "prereqs": "Modules 01, 05.",
    "takeaways": [
      "Tokenization (BPE) and word embeddings — turning text into vectors machines can learn from.",
      "RNNs, LSTMs/GRUs, and seq2seq with attention — sequential modeling before transformers.",
      "Language modeling, perplexity, and text classification, end to end."
    ],
    "flagship": {
      "n": "07-05",
      "label": "Sequence-to-Sequence with Attention",
      "href": "learn/rnn-nlp/seq2seq-attention/"
    },
    "notebooks": [
      {
        "n": "07-01",
        "t": "Tokenization & BPE",
        "d": "WikiText-2",
        "m": "20 min"
      },
      {
        "n": "07-02",
        "t": "Word Embeddings",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "07-03",
        "t": "Recurrent Neural Networks",
        "d": "WikiText-2",
        "m": "20 min"
      },
      {
        "n": "07-04",
        "t": "LSTM & GRU",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "07-05",
        "t": "Seq2Seq & Bahdanau Attention",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "07-06",
        "t": "Language Modeling (Practical)",
        "d": "WikiText-2",
        "m": "20 min"
      },
      {
        "n": "07-07",
        "t": "Perplexity & LM Evaluation",
        "d": "WikiText-2",
        "m": "15 min"
      },
      {
        "n": "07-08",
        "t": "Text Classification",
        "d": "AG_NEWS",
        "m": "20 min"
      },
      {
        "n": "07-09",
        "t": "Sequence Labeling & BiLSTM-CRF",
        "d": "CoNLL-2000",
        "m": "25 min"
      },
      {
        "n": "07-10",
        "t": "NLP Pipeline Capstone",
        "d": "AG_NEWS",
        "m": "25 min"
      }
    ]
  },
  "transformers": {
    "n": "08",
    "title": "Transformers: Architecture to Attention",
    "summary": "Build the complete Transformer stack from scratch — scaled dot-product attention, multi-head attention, positional encoding, encoder/decoder blocks, GPT-style language modelling, BERT-style pre-training, and attention analysis — developing parallel sequence intuition on WikiText-2 and AG_NEWS.",
    "prereqs": "Modules 05, 07.",
    "takeaways": [
      "Scaled dot-product and multi-head attention, built from first principles.",
      "Positional encoding, encoder/decoder blocks, and the full transformer stack.",
      "GPT-style generation and BERT-style pretraining — the backbone of modern NLP."
    ],
    "flagships": [
      {
        "n": "08-01",
        "label": "Scaled Dot-Product Attention",
        "href": "learn/transformers/self-attention/"
      },
      {
        "n": "08-05",
        "label": "The Full Transformer (Encoder-Decoder)",
        "href": "learn/transformers/full-transformer/"
      }
    ],
    "notebooks": [
      {
        "n": "08-01",
        "t": "Scaled Dot-Product Attention",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "08-02",
        "t": "Multi-Head Attention",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "08-03",
        "t": "Positional Encoding",
        "d": "Synthetic",
        "m": "15 min"
      },
      {
        "n": "08-04",
        "t": "Transformer Encoder",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "08-05",
        "t": "Transformer Decoder",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "08-06",
        "t": "GPT-style Language Model",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "08-07",
        "t": "Transformer Text Classifier",
        "d": "AG_NEWS",
        "m": "20 min"
      },
      {
        "n": "08-08",
        "t": "BERT-style Masked LM",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "08-09",
        "t": "Attention Visualisation & Analysis",
        "d": "WikiText-2",
        "m": "20 min"
      },
      {
        "n": "08-10",
        "t": "Transformer Capstone",
        "d": "AG_NEWS + WikiText-2",
        "m": "25 min"
      }
    ]
  },
  "advanced-cv": {
    "n": "09",
    "title": "Advanced Computer Vision",
    "summary": "Push beyond basic CNNs — object detection (anchor boxes, IoU, NMS), semantic & instance segmentation (FCN, U-Net), vision transformers (ViT) from scratch, OCR with CRNN, and optical flow — on CIFAR-10 and synthetic detection/segmentation data.",
    "prereqs": "Modules 05, 06, 08.",
    "takeaways": [
      "Object detection (anchors, IoU, NMS) and segmentation (FCN, U-Net) from the ground up.",
      "Vision Transformers from scratch, plus OCR (CRNN) and optical flow.",
      "Transfer learning and augmentation for production-grade vision."
    ],
    "flagship": {
      "n": "09-01",
      "label": "Object Detection Fundamentals",
      "href": "learn/advanced-cv/object-detection/"
    },
    "notebooks": [
      {
        "n": "09-01",
        "t": "Object Detection Foundations",
        "d": "Synthetic boxes",
        "m": "25 min"
      },
      {
        "n": "09-02",
        "t": "Single-Stage Detector (SSD-style)",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "09-03",
        "t": "Semantic Segmentation — FCN & U-Net",
        "d": "Synthetic masks",
        "m": "25 min"
      },
      {
        "n": "09-04",
        "t": "Instance Segmentation Concepts",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "09-05",
        "t": "Vision Transformer (ViT)",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "09-06",
        "t": "Data Augmentation & Regularisation",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "09-07",
        "t": "Transfer Learning & Fine-tuning",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "09-08",
        "t": "Optical Flow",
        "d": "Synthetic motion",
        "m": "20 min"
      },
      {
        "n": "09-09",
        "t": "OCR with CRNN",
        "d": "Synthetic digit strings",
        "m": "25 min"
      },
      {
        "n": "09-10",
        "t": "CV Capstone",
        "d": "CIFAR-10 + Synthetic",
        "m": "30 min"
      }
    ]
  },
  "advanced-nlp": {
    "n": "10",
    "title": "Advanced NLP: Pretrained Language Models",
    "summary": "Master the pretrained language model paradigm — GPT-style generation and fine-tuning, BERT classification and token labelling, generation metrics (BLEU, ROUGE, BERTScore), RAG-lite, LoRA-style efficient tuning, and in-context learning — on WikiText-2, AG_NEWS, and synthetic tasks.",
    "prereqs": "Modules 07, 08.",
    "takeaways": [
      "Fine-tune GPT and BERT for generation, classification, and token labeling.",
      "Generation evaluation (BLEU/ROUGE/BERTScore), RAG-lite, and LoRA-style efficient tuning.",
      "In-context learning and probing — what pretrained models actually know."
    ],
    "flagship": {
      "n": "10-01",
      "label": "GPT from Scratch",
      "href": "learn/advanced-nlp/gpt/"
    },
    "notebooks": [
      {
        "n": "10-01",
        "t": "GPT Fine-tuning",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "10-02",
        "t": "BERT Fine-tuning for Classification",
        "d": "AG_NEWS + WikiText-2",
        "m": "25 min"
      },
      {
        "n": "10-03",
        "t": "Token Classification (NER-style)",
        "d": "Synthetic NER",
        "m": "20 min"
      },
      {
        "n": "10-04",
        "t": "Sequence-to-Sequence Fine-tuning",
        "d": "Synthetic summarisation",
        "m": "25 min"
      },
      {
        "n": "10-05",
        "t": "Text Generation Evaluation",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "10-06",
        "t": "Retrieval-Augmented Generation (Lite)",
        "d": "Synthetic QA",
        "m": "20 min"
      },
      {
        "n": "10-07",
        "t": "Efficient Fine-tuning (LoRA-style)",
        "d": "AG_NEWS + WikiText-2",
        "m": "20 min"
      },
      {
        "n": "10-08",
        "t": "NLP Evaluation Pipeline",
        "d": "AG_NEWS + WikiText-2",
        "m": "20 min"
      },
      {
        "n": "10-09",
        "t": "In-Context Learning & Probing",
        "d": "WikiText-2",
        "m": "20 min"
      },
      {
        "n": "10-10",
        "t": "NLP Capstone",
        "d": "AG_NEWS + WikiText-2",
        "m": "30 min"
      }
    ]
  },
  "generative": {
    "n": "11",
    "title": "Generative Deep Learning",
    "summary": "Build the full spectrum of generative models from scratch — VAEs (reparameterisation, ELBO), GANs (DCGAN, WGAN-GP, conditional), diffusion (DDPM forward/reverse, noise schedules, sampling & guidance), normalizing flows, score/flow matching, and autoregressive image models — on MNIST, FashionMNIST, and CIFAR-10.",
    "prereqs": "Modules 01, 05, 06, 08.",
    "takeaways": [
      "VAEs (reparameterization, ELBO) and GANs (DCGAN, WGAN-GP, conditional).",
      "Diffusion models: forward/reverse process, noise schedules, sampling and guidance.",
      "Normalizing flows, score/flow matching, and autoregressive image models."
    ],
    "flagships": [
      {
        "n": "11-04",
        "label": "Denoising Diffusion (DDPM) from Scratch",
        "href": "learn/generative/ddpm/"
      },
      {
        "n": "11-06",
        "label": "Normalizing Flows (RealNVP)",
        "href": "learn/generative/flows/"
      }
    ],
    "notebooks": [
      {
        "n": "11-01",
        "t": "Variational Autoencoder (VAE)",
        "d": "MNIST",
        "m": "25 min"
      },
      {
        "n": "11-02",
        "t": "GAN Foundations (DCGAN)",
        "d": "FashionMNIST",
        "m": "25 min"
      },
      {
        "n": "11-03",
        "t": "Advanced GANs (WGAN-GP & cGAN)",
        "d": "FashionMNIST",
        "m": "25 min"
      },
      {
        "n": "11-04",
        "t": "Denoising Diffusion (DDPM)",
        "d": "MNIST",
        "m": "30 min"
      },
      {
        "n": "11-05",
        "t": "Diffusion Sampling & Guidance",
        "d": "MNIST",
        "m": "25 min"
      },
      {
        "n": "11-06",
        "t": "Normalizing Flows (RealNVP)",
        "d": "MNIST (binarised)",
        "m": "25 min"
      },
      {
        "n": "11-07",
        "t": "Evaluation of Generative Models",
        "d": "MNIST",
        "m": "20 min"
      },
      {
        "n": "11-08",
        "t": "Score Matching, EBMs & Flow Matching",
        "d": "Synthetic 2-D",
        "m": "20 min"
      },
      {
        "n": "11-09",
        "t": "Autoregressive Image Models",
        "d": "MNIST",
        "m": "25 min"
      },
      {
        "n": "11-10",
        "t": "Generative Models Capstone",
        "d": "MNIST + FashionMNIST",
        "m": "30 min"
      }
    ]
  },
  "multimodal": {
    "n": "12",
    "title": "Multimodal & Cross-Modal Learning",
    "summary": "Build multimodal systems from scratch — contrastive image-text learning (CLIP), visual question answering, cross-modal retrieval, image captioning (CNN+Transformer), audio-visual correspondence, and generative multimodal concepts — on MNIST, CIFAR-10, and synthetic paired datasets.",
    "prereqs": "Modules 06, 08, 09, 10, 11.",
    "takeaways": [
      "Contrastive image-text learning (CLIP) and cross-modal retrieval.",
      "Image captioning and visual question answering (CNN + Transformer).",
      "Multimodal fusion strategies — and how to evaluate them honestly."
    ],
    "flagship": {
      "n": "12-01",
      "label": "CLIP - Contrastive Image-Text Pretraining",
      "href": "learn/multimodal/clip/"
    },
    "notebooks": [
      {
        "n": "12-01",
        "t": "Contrastive Image-Text Learning (CLIP)",
        "d": "Synthetic image-caption pairs",
        "m": "25 min"
      },
      {
        "n": "12-02",
        "t": "Cross-Modal Retrieval",
        "d": "MNIST + captions",
        "m": "20 min"
      },
      {
        "n": "12-03",
        "t": "Visual Question Answering (VQA)",
        "d": "Synthetic VQA",
        "m": "25 min"
      },
      {
        "n": "12-04",
        "t": "Image Captioning (CNN + Transformer)",
        "d": "MNIST + captions",
        "m": "25 min"
      },
      {
        "n": "12-05",
        "t": "Audio-Visual Correspondence",
        "d": "Synthetic audio-visual",
        "m": "20 min"
      },
      {
        "n": "12-06",
        "t": "Vision-Language Pre-training Concepts",
        "d": "MNIST + captions",
        "m": "20 min"
      },
      {
        "n": "12-07",
        "t": "Cross-Modal Generation (DALL-E concept)",
        "d": "MNIST + captions",
        "m": "25 min"
      },
      {
        "n": "12-08",
        "t": "Multimodal Fusion Strategies",
        "d": "MNIST + tabular",
        "m": "20 min"
      },
      {
        "n": "12-09",
        "t": "Multimodal Evaluation Pipeline",
        "d": "MNIST + captions",
        "m": "20 min"
      },
      {
        "n": "12-10",
        "t": "Multimodal Capstone",
        "d": "MNIST + FashionMNIST + Synthetic",
        "m": "30 min"
      }
    ]
  },
  "fine-tuning": {
    "n": "13",
    "title": "Fine-Tuning & Alignment",
    "summary": "Master the full spectrum of model adaptation and alignment — LoRA/PEFT, supervised fine-tuning (SFT), reward modelling, PPO-based RLHF, DPO, constitutional-AI concepts, prompt tuning, and continual learning — applied to the Transformer language models built in Modules 08 and 10.",
    "prereqs": "Modules 05, 08, 10.",
    "takeaways": [
      "Parameter-efficient fine-tuning (LoRA/PEFT) and supervised fine-tuning (SFT).",
      "The RLHF stack: reward modeling, PPO, and DPO — plus constitutional-AI concepts.",
      "Catastrophic forgetting, continual learning, and alignment evaluation & safety."
    ],
    "flagship": {
      "n": "13-04",
      "label": "RLHF with PPO",
      "href": "learn/fine-tuning/rlhf-ppo/"
    },
    "notebooks": [
      {
        "n": "13-01",
        "t": "LoRA & PEFT",
        "d": "AG_NEWS",
        "m": "25 min"
      },
      {
        "n": "13-02",
        "t": "Supervised Fine-Tuning (SFT)",
        "d": "Synthetic instructions",
        "m": "25 min"
      },
      {
        "n": "13-03",
        "t": "Reward Modelling",
        "d": "Synthetic preference pairs",
        "m": "25 min"
      },
      {
        "n": "13-04",
        "t": "PPO for RLHF",
        "d": "Synthetic",
        "m": "30 min"
      },
      {
        "n": "13-05",
        "t": "Direct Preference Optimisation (DPO)",
        "d": "Synthetic preference pairs",
        "m": "25 min"
      },
      {
        "n": "13-06",
        "t": "Constitutional AI & RLAIF Concepts",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "13-07",
        "t": "Prompt Tuning & Soft Prompts",
        "d": "AG_NEWS",
        "m": "20 min"
      },
      {
        "n": "13-08",
        "t": "Catastrophic Forgetting & Continual Learning",
        "d": "MNIST (sequential)",
        "m": "25 min"
      },
      {
        "n": "13-09",
        "t": "Fine-Tuning Evaluation & Safety",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "13-10",
        "t": "Alignment Capstone",
        "d": "WikiText-2 + Synthetic",
        "m": "30 min"
      }
    ]
  },
  "reinforcement-learning": {
    "n": "14",
    "title": "Reinforcement Learning",
    "summary": "Build the full RL stack from scratch — Markov decision processes, dynamic programming, Monte Carlo, temporal-difference learning (Q-learning, SARSA), deep Q-networks (DQN, Double/Dueling), policy gradients (REINFORCE, Actor-Critic, A2C), and PPO — on gridworld, CartPole, and custom NumPy environments.",
    "prereqs": "Modules 01, 05.",
    "takeaways": [
      "MDPs, dynamic programming, Monte Carlo, and TD learning (Q-learning, SARSA).",
      "Deep RL: DQN and variants, REINFORCE, Actor-Critic/A2C, and PPO.",
      "Model-based RL concepts — all on gridworld and CartPole built in NumPy."
    ],
    "flagships": [
      {
        "n": "14-03",
        "label": "Temporal-Difference Learning",
        "href": "learn/reinforcement-learning/mc-td/"
      },
      {
        "n": "14-09",
        "label": "Model-Based RL and MCTS",
        "href": "learn/reinforcement-learning/model-based-rl/"
      }
    ],
    "notebooks": [
      {
        "n": "14-01",
        "t": "MDP & Dynamic Programming",
        "d": "Gridworld",
        "m": "25 min"
      },
      {
        "n": "14-02",
        "t": "Monte Carlo Methods",
        "d": "Gridworld / Blackjack",
        "m": "25 min"
      },
      {
        "n": "14-03",
        "t": "Temporal Difference Learning",
        "d": "Gridworld / CliffWalk / CartPole",
        "m": "25 min"
      },
      {
        "n": "14-04",
        "t": "Deep Q-Networks (DQN)",
        "d": "CartPole",
        "m": "30 min"
      },
      {
        "n": "14-05",
        "t": "Advanced DQN Variants",
        "d": "CartPole",
        "m": "25 min"
      },
      {
        "n": "14-06",
        "t": "Policy Gradient — REINFORCE",
        "d": "CartPole",
        "m": "25 min"
      },
      {
        "n": "14-07",
        "t": "Actor-Critic & A2C",
        "d": "CartPole",
        "m": "25 min"
      },
      {
        "n": "14-08",
        "t": "Proximal Policy Optimisation (PPO)",
        "d": "CartPole",
        "m": "30 min"
      },
      {
        "n": "14-09",
        "t": "Model-Based RL Concepts",
        "d": "Gridworld + CartPole",
        "m": "25 min"
      },
      {
        "n": "14-10",
        "t": "RL Capstone",
        "d": "CartPole + Gridworld",
        "m": "30 min"
      }
    ]
  },
  "pytorch-internals": {
    "n": "15",
    "title": "Advanced PyTorch Internals",
    "summary": "Go deep into PyTorch's machinery — custom autograd functions, dynamic computation graphs, TorchScript (JIT), hooks and callbacks, memory management and profiling, mixed-precision training, and gradient checkpointing — building tools that make models faster, smaller, and more debuggable.",
    "prereqs": "Modules 05, 06.",
    "takeaways": [
      "Custom autograd functions, dynamic graphs, and TorchScript JIT compilation.",
      "Hooks, memory management, and debugging real models.",
      "Mixed-precision training and gradient checkpointing for speed and memory."
    ],
    "flagship": {
      "n": "15-01",
      "label": "Custom Autograd - Build the Engine",
      "href": "learn/pytorch-internals/custom-autograd/"
    },
    "notebooks": [
      {
        "n": "15-01",
        "t": "Custom Autograd Functions",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "15-02",
        "t": "Dynamic Computation Graphs",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "15-03",
        "t": "TorchScript — JIT Tracing & Scripting",
        "d": "MNIST",
        "m": "20 min"
      },
      {
        "n": "15-04",
        "t": "Custom nn.Module Patterns",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "15-05",
        "t": "Hooks, Callbacks & Gradient Analysis",
        "d": "MNIST",
        "m": "25 min"
      },
      {
        "n": "15-06",
        "t": "Memory Management",
        "d": "MNIST / CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "15-07",
        "t": "Mixed-Precision Training (AMP)",
        "d": "MNIST / CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "15-08",
        "t": "Gradient Checkpointing",
        "d": "Synthetic deep MLP",
        "m": "20 min"
      },
      {
        "n": "15-09",
        "t": "Debugging PyTorch Models",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "15-10",
        "t": "PyTorch Internals Capstone",
        "d": "MNIST",
        "m": "30 min"
      }
    ]
  },
  "training-systems": {
    "n": "16",
    "title": "Training Optimisation & Distributed Systems",
    "summary": "Master advanced training techniques — learning-rate schedulers, optimiser variants (AdaGrad → Lion), batch-size scaling laws, data-pipeline optimisation, distributed training concepts (DDP, FSDP), gradient compression, profiling (torch.profiler, roofline), and hyperparameter optimisation — on MNIST, CIFAR-10, and synthetic benchmarks.",
    "prereqs": "Modules 05, 06, 15.",
    "takeaways": [
      "LR schedulers, advanced optimizers, and the batch-size linear-scaling rule.",
      "Data-pipeline optimization and profiling (torch.profiler, roofline analysis).",
      "Distributed training concepts (DDP, FSDP) and hyperparameter optimization."
    ],
    "flagship": {
      "n": "16-06",
      "label": "Distributed Data Parallel",
      "href": "learn/training-systems/ddp/"
    },
    "notebooks": [
      {
        "n": "16-01",
        "t": "Learning Rate Schedulers",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "16-02",
        "t": "Advanced Optimisers",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "16-03",
        "t": "Regularisation Techniques",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "16-04",
        "t": "Batch Size Scaling & Linear Scaling Rule",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "16-05",
        "t": "Data Pipeline Optimisation",
        "d": "CIFAR-10",
        "m": "20 min"
      },
      {
        "n": "16-06",
        "t": "Distributed Training Concepts",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "16-07",
        "t": "Profiling with torch.profiler",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "16-08",
        "t": "Gradient Compression & Communication",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "16-09",
        "t": "Hyperparameter Optimisation",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "16-10",
        "t": "Training Optimisation Capstone",
        "d": "CIFAR-10",
        "m": "30 min"
      }
    ]
  },
  "llm-systems": {
    "n": "17",
    "title": "Large Language Models: Systems & Scaling",
    "summary": "Master the systems and scaling foundations of LLMs — scaling laws and emergent abilities, attention efficiency (FlashAttention, KV-cache, grouped-query attention), quantisation (INT8/INT4/GPTQ/QLoRA), speculative decoding, long-context (RoPE, ALiBi, sliding window), mixture-of-experts, evaluation, and inference optimisation.",
    "prereqs": "Modules 08, 10, 13, 16.",
    "takeaways": [
      "Scaling laws, emergent abilities, and attention efficiency (FlashAttention, KV-cache, GQA).",
      "Quantization (INT8/INT4/GPTQ/QLoRA), speculative decoding, and long-context (RoPE/ALiBi).",
      "Mixture-of-experts, LLM evaluation, and inference optimization (continuous batching, PagedAttention)."
    ],
    "flagship": {
      "n": "17-06",
      "label": "Long-Context Techniques",
      "href": "learn/llm-systems/long-context/"
    },
    "notebooks": [
      {
        "n": "17-01",
        "t": "Scaling Laws & Emergent Abilities",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "17-02",
        "t": "Transformer Efficiency — Attention Variants",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "17-03",
        "t": "KV-Cache & Positional Encodings",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "17-04",
        "t": "Quantisation — INT8, INT4, GPTQ",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "17-05",
        "t": "Speculative Decoding",
        "d": "Synthetic (GPT-2 style)",
        "m": "25 min"
      },
      {
        "n": "17-06",
        "t": "Long-Context Techniques",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "17-07",
        "t": "Mixture of Experts (MoE)",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "17-08",
        "t": "LLM Evaluation",
        "d": "WikiText-2",
        "m": "25 min"
      },
      {
        "n": "17-09",
        "t": "LLM Inference Optimisation",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "17-10",
        "t": "LLM Systems Capstone",
        "d": "Synthetic / WikiText-2",
        "m": "30 min"
      }
    ]
  },
  "rag-agents": {
    "n": "18",
    "title": "RAG & Agentic AI Systems",
    "summary": "Build retrieval-augmented generation and agentic AI from scratch — dense retrieval (bi-encoders), vector indexing, RAG pipelines (retrieve-then-generate), query rewriting (HyDE), reranking, RAG evaluation, tool-using agents (ReAct), memory systems, and multi-agent orchestration — all without external API keys.",
    "prereqs": "Modules 08, 10, 13, 17.",
    "takeaways": [
      "Dense retrieval, vector indexing, and retrieve-then-generate RAG pipelines.",
      "Query rewriting (HyDE), reranking, and RAG evaluation (RAGAS-style).",
      "Tool-using agents (ReAct), memory systems, and multi-agent orchestration."
    ],
    "flagship": {
      "n": "18-03",
      "label": "RAG Pipeline End-to-End",
      "href": "learn/rag-agents/rag-pipeline/"
    },
    "notebooks": [
      {
        "n": "18-01",
        "t": "Dense Retrieval & Bi-Encoders",
        "d": "Synthetic Q&A",
        "m": "25 min"
      },
      {
        "n": "18-02",
        "t": "Vector Indexing & Similarity Search",
        "d": "Synthetic embeddings",
        "m": "20 min"
      },
      {
        "n": "18-03",
        "t": "RAG Pipeline — Retrieve-then-Generate",
        "d": "Synthetic docs + Q&A",
        "m": "25 min"
      },
      {
        "n": "18-04",
        "t": "Query Rewriting & HyDE",
        "d": "Synthetic Q&A",
        "m": "20 min"
      },
      {
        "n": "18-05",
        "t": "Reranking & Fusion",
        "d": "Synthetic Q&A",
        "m": "20 min"
      },
      {
        "n": "18-06",
        "t": "RAG Evaluation (RAGAS-style)",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "18-07",
        "t": "Tool-Using Agents (ReAct)",
        "d": "Synthetic tool-use",
        "m": "25 min"
      },
      {
        "n": "18-08",
        "t": "Agent Memory Systems",
        "d": "Synthetic conversations",
        "m": "20 min"
      },
      {
        "n": "18-09",
        "t": "Multi-Agent Orchestration",
        "d": "Synthetic multi-step",
        "m": "20 min"
      },
      {
        "n": "18-10",
        "t": "Agentic RAG Capstone",
        "d": "Synthetic docs + Q&A",
        "m": "30 min"
      }
    ]
  },
  "ml-applications": {
    "n": "19",
    "title": "ML Applications & Domain Problems",
    "summary": "Apply the full ML/DL toolkit to real-world domains — time-series forecasting, anomaly detection, medical imaging, recommender systems, NLP for code, graph neural networks, semi-supervised & multi-task learning, and fairness/bias — on synthetic domain datasets throughout.",
    "prereqs": "Modules 05, 06, 07, 08, 14.",
    "takeaways": [
      "Time-series forecasting, anomaly detection, and recommender systems.",
      "Graph neural networks, medical imaging, and NLP for code.",
      "Fairness/bias, semi-supervised, and multi-task learning on domain problems."
    ],
    "flagship": {
      "n": "19-04",
      "label": "Recommender Systems - Collaborative Filtering",
      "href": "learn/ml-applications/recommenders-cf/"
    },
    "notebooks": [
      {
        "n": "19-01",
        "t": "Time Series Forecasting",
        "d": "Synthetic time series",
        "m": "25 min"
      },
      {
        "n": "19-02",
        "t": "Anomaly Detection",
        "d": "Synthetic anomalies",
        "m": "25 min"
      },
      {
        "n": "19-03",
        "t": "Medical Imaging",
        "d": "Synthetic medical images",
        "m": "25 min"
      },
      {
        "n": "19-04",
        "t": "Recommender Systems",
        "d": "Synthetic user-item data",
        "m": "25 min"
      },
      {
        "n": "19-05",
        "t": "NLP for Code",
        "d": "Synthetic code snippets",
        "m": "25 min"
      },
      {
        "n": "19-06",
        "t": "Graph Neural Networks",
        "d": "Synthetic graphs",
        "m": "25 min"
      },
      {
        "n": "19-07",
        "t": "Semi-Supervised & Multi-Task Learning",
        "d": "CIFAR-10 + Synthetic",
        "m": "25 min"
      },
      {
        "n": "19-08",
        "t": "Fairness, Bias & Ethics in ML",
        "d": "Synthetic tabular",
        "m": "25 min"
      },
      {
        "n": "19-09",
        "t": "Structured Prediction",
        "d": "Synthetic sequences",
        "m": "25 min"
      },
      {
        "n": "19-10",
        "t": "Domain Applications Capstone",
        "d": "Synthetic multi-domain",
        "m": "30 min"
      }
    ]
  },
  "mlops": {
    "n": "20",
    "title": "MLOps & Production Deployment",
    "summary": "Master the full MLOps lifecycle — systematic evaluation, experiment tracking with MLflow, model serialisation and TorchScript export, FastAPI serving, Docker containerisation, Kubernetes orchestration, drift monitoring, ML testing with pytest, and A/B experimentation — in one integrated capstone.",
    "prereqs": "Modules 04, 05, 06, 15, 16.",
    "takeaways": [
      "Experiment tracking (MLflow), model export (TorchScript), and FastAPI serving.",
      "Docker and Kubernetes for deployment; data-drift monitoring and ML testing.",
      "Online A/B experimentation and an end-to-end production pipeline."
    ],
    "flagship": {
      "n": "20-10",
      "label": "ML System Design Patterns",
      "href": "learn/mlops/system-design/"
    },
    "notebooks": [
      {
        "n": "20-01",
        "t": "ML Strategy & Evaluation Pipeline",
        "d": "FashionMNIST",
        "m": "25 min"
      },
      {
        "n": "20-02",
        "t": "Experiment Tracking with MLflow",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "20-03",
        "t": "Model Serialisation & TorchScript",
        "d": "FashionMNIST",
        "m": "25 min"
      },
      {
        "n": "20-04",
        "t": "FastAPI Model Serving",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "20-05",
        "t": "Docker for ML Deployment",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "20-06",
        "t": "Kubernetes for ML Deployment",
        "d": "FashionMNIST",
        "m": "35 min"
      },
      {
        "n": "20-07",
        "t": "Model Monitoring & Data Drift",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "20-08",
        "t": "ML Testing & Project Standards",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "20-09",
        "t": "Online Experimentation & A/B Testing",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "20-10",
        "t": "MLOps Capstone",
        "d": "FashionMNIST",
        "m": "35 min"
      }
    ]
  },
  "agentic-ai": {
    "n": "21",
    "title": "Agentic AI Systems & MCP",
    "summary": "Build production agents from first principles — the perceive-reason-act loop, tool calling, the Model Context Protocol, planning and decomposition, memory, multi-agent orchestration, evaluation, observability, and the guardrails that keep agents safe.",
    "prereqs": "Modules 17–18 (LLM systems, RAG & agents).",
    "takeaways": [
      "An agent is a loop around an LLM: gather context, reason, call tools, observe, repeat — and you can build one from scratch.",
      "MCP standardizes how models reach tools and data; write your own servers and clients in Python.",
      "Agents fail in new ways — prompt injection, runaway loops, silent cost blowups — so evaluation, tracing, and guardrails are part of the build, not an afterthought."
    ],
    "notebooks": [
      {
        "n": "21-01",
        "t": "The Agent Loop: Perceive, Reason, Act",
        "d": "Synthetic tasks",
        "m": "25 min"
      },
      {
        "n": "21-02",
        "t": "Tool Calling & Function Calling",
        "d": "Tool APIs",
        "m": "25 min"
      },
      {
        "n": "21-03",
        "t": "MCP: Protocol, Clients & Servers",
        "d": "Local MCP server",
        "m": "30 min"
      },
      {
        "n": "21-04",
        "t": "ReAct, Planning & Task Decomposition",
        "d": "Reasoning tasks",
        "m": "25 min"
      },
      {
        "n": "21-05",
        "t": "Agent Memory & Context Management",
        "d": "Conversation logs",
        "m": "25 min"
      },
      {
        "n": "21-06",
        "t": "Multi-Agent Orchestration",
        "d": "Synthetic tasks",
        "m": "30 min"
      },
      {
        "n": "21-07",
        "t": "Agent Evaluation: Tasks & Trajectories",
        "d": "Task suites",
        "m": "25 min"
      },
      {
        "n": "21-08",
        "t": "Observability, Tracing & Cost Control",
        "d": "Trace logs",
        "m": "25 min"
      },
      {
        "n": "21-09",
        "t": "Guardrails & Agent Security",
        "d": "Injection corpus",
        "m": "25 min"
      },
      {
        "n": "21-10",
        "t": "Capstone: Build a Production Agent",
        "d": "End-to-end",
        "m": "40 min"
      }
    ]
  },
  "frontier-frameworks": {
    "n": "22",
    "title": "Frontier Models & Modern Frameworks",
    "summary": "The modern toolchain beyond core PyTorch — JAX and Flax, the open-weight model landscape, vLLM and inference engines, torch.compile and Triton, ONNX export, provider APIs, modern fine-tuning stacks, and evaluation harnesses. Principle-first so it dates slowly.",
    "prereqs": "Modules 15–17 (PyTorch internals, training systems, LLM systems).",
    "takeaways": [
      "JAX's jit/grad/vmap are the same autodiff and vectorization ideas you already know, expressed functionally.",
      "Serving is its own discipline: paged attention, continuous batching, and quantized runtimes decide real-world cost and latency.",
      "Frameworks change; the principles underneath them don't — learn to read a release and map it onto what you already understand."
    ],
    "notebooks": [
      {
        "n": "22-01",
        "t": "JAX & Functional ML: jit, grad, vmap",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "22-02",
        "t": "Training in JAX with Flax & Optax",
        "d": "FashionMNIST",
        "m": "30 min"
      },
      {
        "n": "22-03",
        "t": "The Open-Weight Model Landscape",
        "d": "Model cards",
        "m": "20 min"
      },
      {
        "n": "22-04",
        "t": "Inference Engines: vLLM & Paged Attention",
        "d": "Open-weight LLM",
        "m": "30 min"
      },
      {
        "n": "22-05",
        "t": "torch.compile & GPU Kernels with Triton",
        "d": "Synthetic",
        "m": "30 min"
      },
      {
        "n": "22-06",
        "t": "Model Export: ONNX & Quantized Runtimes",
        "d": "FashionMNIST",
        "m": "25 min"
      },
      {
        "n": "22-07",
        "t": "Provider APIs in Production",
        "d": "API patterns",
        "m": "25 min"
      },
      {
        "n": "22-08",
        "t": "Modern Fine-Tuning Stacks",
        "d": "Open-weight LLM",
        "m": "30 min"
      },
      {
        "n": "22-09",
        "t": "Evaluation Harnesses & Custom Evals",
        "d": "Eval suites",
        "m": "25 min"
      },
      {
        "n": "22-10",
        "t": "Staying Current: Releases, Benchmarks & Changelogs",
        "d": "Walkthrough",
        "m": "20 min"
      }
    ]
  },
  "causal-inference": {
    "n": "23",
    "title": "Causal Inference & Advanced Statistics",
    "summary": "From correlation to causation — potential outcomes, causal graphs and do-calculus, confounding, instrumental variables, propensity matching, uplift modeling, A/B testing at scale, resampling methods, the Bayesian workflow, and time-series causality.",
    "prereqs": "Modules 01 (probability) and 04 (evaluation).",
    "takeaways": [
      "Prediction and causation are different questions — a great predictor can be a terrible guide to intervention.",
      "Confounding is the central enemy; graphs, randomization, instruments, and matching are the weapons.",
      "Experimentation at scale is an engineering discipline: power, sequential testing, and the traps of peeking."
    ],
    "notebooks": [
      {
        "n": "23-01",
        "t": "Potential Outcomes & Treatment Effects",
        "d": "Synthetic",
        "m": "25 min"
      },
      {
        "n": "23-02",
        "t": "Causal Graphs & do-Calculus",
        "d": "Synthetic DAGs",
        "m": "25 min"
      },
      {
        "n": "23-03",
        "t": "Confounding & Simpson's Paradox",
        "d": "Classic cases",
        "m": "20 min"
      },
      {
        "n": "23-04",
        "t": "Instrumental Variables",
        "d": "Econometric data",
        "m": "25 min"
      },
      {
        "n": "23-05",
        "t": "Propensity Scores & Matching",
        "d": "Observational data",
        "m": "25 min"
      },
      {
        "n": "23-06",
        "t": "Uplift Modeling",
        "d": "Marketing data",
        "m": "25 min"
      },
      {
        "n": "23-07",
        "t": "A/B Testing & Experimentation at Scale",
        "d": "Synthetic experiments",
        "m": "30 min"
      },
      {
        "n": "23-08",
        "t": "Bootstrap, Permutation & Resampling",
        "d": "Synthetic",
        "m": "20 min"
      },
      {
        "n": "23-09",
        "t": "The Bayesian Workflow",
        "d": "Synthetic",
        "m": "30 min"
      },
      {
        "n": "23-10",
        "t": "Time-Series Causality & Synthetic Control",
        "d": "Panel data",
        "m": "25 min"
      }
    ]
  },
  "trustworthy-ai": {
    "n": "24",
    "title": "Trustworthy, Safe & Interpretable AI",
    "summary": "Make models you can trust — calibration and conformal prediction, fairness metrics and their trade-offs, attribution methods, mechanistic interpretability (superposition, SAEs, activation patching), adversarial robustness, drift detection, red-teaming, and alignment.",
    "prereqs": "Modules 04–05; module 08 for the interpretability lessons.",
    "takeaways": [
      "A confident wrong answer is worse than an honest 'maybe' — calibration and conformal prediction quantify what a model knows it doesn't know.",
      "Interpretability has gone mechanistic: features as directions, superposition, and causal interventions on activations.",
      "Robustness, fairness, and drift aren't compliance checkboxes — they're failure modes you can measure and engineer against."
    ],
    "notebooks": [
      {
        "n": "24-01",
        "t": "Calibration & Temperature Scaling",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "24-02",
        "t": "Conformal Prediction",
        "d": "CIFAR-10",
        "m": "25 min"
      },
      {
        "n": "24-03",
        "t": "Fairness Metrics & Trade-offs",
        "d": "Adult income",
        "m": "25 min"
      },
      {
        "n": "24-04",
        "t": "Attribution: SHAP, Saliency & Attention Rollout",
        "d": "Tabular + images",
        "m": "30 min"
      },
      {
        "n": "24-05",
        "t": "Mechanistic Interpretability I: Superposition & SAEs",
        "d": "Toy models",
        "m": "30 min"
      },
      {
        "n": "24-06",
        "t": "Mechanistic Interpretability II: Probing & Activation Patching",
        "d": "Small LM",
        "m": "30 min"
      },
      {
        "n": "24-07",
        "t": "Adversarial Robustness & Certified Defenses",
        "d": "MNIST + CIFAR",
        "m": "30 min"
      },
      {
        "n": "24-08",
        "t": "Distribution Shift & Drift Detection",
        "d": "Shifted datasets",
        "m": "25 min"
      },
      {
        "n": "24-09",
        "t": "Red-Teaming & Model Auditing",
        "d": "Prompt suites",
        "m": "25 min"
      },
      {
        "n": "24-10",
        "t": "Alignment & Governance Overview",
        "d": "Walkthrough",
        "m": "20 min"
      }
    ]
  },
  "interview-capstone": {
    "n": "25",
    "title": "ML Interview & System Design Capstone",
    "summary": "Turn the whole curriculum into interview readiness — the ML system design framework, classic design cases (recommender, search & ads, fraud, LLM products), coding patterns, classical CS algorithms, rapid-fire breadth drills, deep derivations, and a portfolio capstone.",
    "prereqs": "The rest of the curriculum — this module is the integration test.",
    "takeaways": [
      "ML system design has a repeatable framework: clarify, frame, data, features, model, serving, metrics, iteration.",
      "Most interview questions trace back to a small set of derivations and trade-offs you can drill deliberately.",
      "A portfolio project you can defend end-to-end beats a long list of frameworks on a resume."
    ],
    "notebooks": [
      {
        "n": "25-01",
        "t": "The ML Interview Landscape & Strategy",
        "d": "Walkthrough",
        "m": "20 min"
      },
      {
        "n": "25-02",
        "t": "ML System Design Framework",
        "d": "Case studies",
        "m": "30 min"
      },
      {
        "n": "25-03",
        "t": "Design Case: Recommender & Feed",
        "d": "MovieLens",
        "m": "30 min"
      },
      {
        "n": "25-04",
        "t": "Design Case: Search & Ads",
        "d": "Synthetic queries",
        "m": "30 min"
      },
      {
        "n": "25-05",
        "t": "Design Case: Fraud Detection & LLM Products",
        "d": "Imbalanced data",
        "m": "30 min"
      },
      {
        "n": "25-06",
        "t": "Coding Patterns for ML Interviews",
        "d": "NumPy + pandas drills",
        "m": "30 min"
      },
      {
        "n": "25-07",
        "t": "Classical CS Algorithms Review",
        "d": "Algorithm drills",
        "m": "30 min"
      },
      {
        "n": "25-08",
        "t": "ML Breadth Rapid-Fire",
        "d": "Cross-module Q&A",
        "m": "25 min"
      },
      {
        "n": "25-09",
        "t": "Deep-Dive Derivations",
        "d": "Pen + NumPy",
        "m": "30 min"
      },
      {
        "n": "25-10",
        "t": "Take-Homes, Storytelling & Portfolio Capstone",
        "d": "Your project",
        "m": "40 min"
      }
    ]
  }
};

// Minimal code illustration per module — the one idea, in a few lines.
window.LECTURE_CODE = {
  "foundations": {
    "caption": "Why every later module lives in tensors, not loops.",
    "code": "import numpy as np\nA = np.random.randn(1000, 1000)\nb = np.random.randn(1000)\ny = A @ b          # NumPy runs the loop in C...\n# ...~100x faster than a Python \"for i: y[i] = (A[i]*b).sum()\""
  },
  "supervised-learning": {
    "caption": "Fit a model by following the gradient downhill.",
    "code": "for _ in range(epochs):\n    y_hat = X @ w + b\n    grad_w = X.T @ (y_hat - y) / n      # dLoss/dw\n    w -= lr * grad_w                    # the move every model makes"
  },
  "unsupervised-learning": {
    "caption": "K-means in two steps: assign, then move centroids.",
    "code": "for _ in range(iters):\n    labels = np.argmin(((X[:, None] - C) ** 2).sum(-1), axis=1)  # assign\n    C = np.array([X[labels == k].mean(0) for k in range(K)])     # update"
  },
  "ml-theory": {
    "caption": "Cross-validation: never score on what you trained on.",
    "code": "scores = []\nfor tr, va in KFold(5).split(X):\n    model.fit(X[tr], y[tr])\n    scores.append(f1(y[va], model.predict(X[va])))\nprint(np.mean(scores), \"±\", np.std(scores))"
  },
  "neural-nets": {
    "caption": "Backprop is just the chain rule, carefully bookkept.",
    "code": "z = X @ W + b\na = relu(z)\n# backward\ndz = dA * (z > 0)        # relu'(z)\ndW = X.T @ dz\ndb = dz.sum(0)"
  },
  "cnn": {
    "caption": "A convolution slides one small kernel over the image.",
    "code": "# output pixel = elementwise product of a patch and the kernel\nout[i, j] = (patch(img, i, j) * kernel).sum()\n# learn many kernels, stack layers -> a CNN that sees hierarchy"
  },
  "rnn-nlp": {
    "caption": "An RNN carries a hidden state across the sequence.",
    "code": "h = torch.zeros(hidden)\nfor x_t in sequence:\n    h = torch.tanh(Wx @ x_t + Wh @ h + b)   # memory through a loop"
  },
  "transformers": {
    "caption": "The one equation behind every modern LLM.",
    "code": "# scaled dot-product attention\nscores = Q @ K.transpose(-2, -1) / math.sqrt(d_k)\nweights = scores.softmax(dim=-1)\nout = weights @ V          # every token reads every other token"
  },
  "advanced-cv": {
    "caption": "Detection starts with IoU — how much two boxes overlap.",
    "code": "inter = overlap_area(box_a, box_b)\niou = inter / (area(box_a) + area(box_b) - inter)\n# keep the highest-scoring box, suppress overlaps (NMS)"
  },
  "advanced-nlp": {
    "caption": "Fine-tuning: reuse the pretrained body, train a small head.",
    "code": "for p in model.encoder.parameters():\n    p.requires_grad = False             # freeze what's already learned\nlogits = head(model.encoder(tokens))    # adapt, don't retrain"
  },
  "generative": {
    "caption": "Diffusion: add noise, then learn to take it back out.",
    "code": "# forward: data -> noise (closed form)\nx_t = sqrt(abar[t]) * x0 + sqrt(1 - abar[t]) * noise\n# train a network to predict `noise`, then run the chain in reverse"
  },
  "multimodal": {
    "caption": "CLIP: pull matching image/text together, push others apart.",
    "code": "logits = (img_emb @ txt_emb.T) * temperature\nloss = (cross_entropy(logits, idx) + cross_entropy(logits.T, idx)) / 2\n# one shared space for pixels and words"
  },
  "fine-tuning": {
    "caption": "LoRA: freeze W, learn a tiny low-rank update.",
    "code": "# A: d->r, B: r->d, with r << d  (a few % of the params)\ndelta = (x @ A) @ B\ny = x @ W_frozen + alpha * delta"
  },
  "reinforcement-learning": {
    "caption": "Q-learning: bootstrap toward reward + best next value.",
    "code": "target = r + gamma * Q[s2].max()\nQ[s, a] += alpha * (target - Q[s, a])   # learn from delayed reward"
  },
  "pytorch-internals": {
    "caption": "Define your own gradient when you need to.",
    "code": "class Square(torch.autograd.Function):\n    @staticmethod\n    def forward(ctx, x): ctx.save_for_backward(x); return x * x\n    @staticmethod\n    def backward(ctx, g): (x,) = ctx.saved_tensors; return g * 2 * x"
  },
  "training-systems": {
    "caption": "Mixed precision: fp16 math, fp32 stability.",
    "code": "with torch.autocast(\"cuda\"):\n    loss = model(x).loss\nscaler.scale(loss).backward()           # train bigger + faster\nscaler.step(opt); scaler.update()"
  },
  "llm-systems": {
    "caption": "KV-cache: don't recompute the past at each new token.",
    "code": "k_cache = torch.cat([k_cache, k_new], dim=1)\nv_cache = torch.cat([v_cache, v_new], dim=1)\nout = attention(q_new, k_cache, v_cache)   # why generation gets cheaper"
  },
  "rag-agents": {
    "caption": "RAG: retrieve first, then condition generation on it.",
    "code": "docs = index.search(embed(query), k=5)        # find relevant context\nanswer = llm(prompt(query, context=docs))     # ground the answer in facts"
  },
  "ml-applications": {
    "caption": "A GNN layer: aggregate neighbors, then transform.",
    "code": "# the same learning idea, retargeted to graphs\nh_v = relu(W @ mean([h_u for u in neighbors(v)] + [h_v]))\n# stack layers -> information flows across the graph"
  },
  "mlops": {
    "caption": "A model in production is a function behind an endpoint.",
    "code": "@app.post(\"/predict\")\ndef predict(req: Input):\n    x = torch.tensor(req.features)\n    return {\"y\": int(model(x).argmax())}      # from notebook to service"
  },
  "agentic-ai": {
    "caption": "An agent is a loop: reason, act, observe, repeat.",
    "code": "while not done:\n    thought = llm(context)                 # reason about the goal\n    result = tools[thought.tool](thought.args)   # act\n    context += observe(result)             # fold the result back in"
  },
  "frontier-frameworks": {
    "caption": "JAX: gradients as a function transformation.",
    "code": "import jax\nloss = lambda w, x, y: ((x @ w - y) ** 2).mean()\ngrad_fn = jax.jit(jax.grad(loss))   # compile the gradient itself\nw -= lr * grad_fn(w, x, y)          # same idea, new toolchain"
  },
  "causal-inference": {
    "caption": "Intervening is not the same as observing.",
    "code": "p_obs = df[df.treated == 1].outcome.mean()       # P(Y | T=1)\n# do(T=1): break the arrows INTO treatment, then average\np_do = sum(p(y, do_t=1, z=z) * p(z) for z in confounders)\n# the gap between the two IS confounding"
  },
  "trustworthy-ai": {
    "caption": "Calibration: confidence should mean what it says.",
    "code": "conf, correct = probs.max(1)\nece = sum(abs(conf[bin].mean() - correct[bin].mean()) * len(bin) / n\n          for bin in confidence_bins)   # 90% sure should be right 90% of the time"
  },
  "interview-capstone": {
    "caption": "Every design case walks the same skeleton.",
    "code": "steps = [\"clarify goal\", \"frame as ML task\", \"data & labels\",\n         \"features\", \"model choice\", \"serving & latency\",\n         \"metrics & monitoring\", \"iterate\"]\n# the content changes; the skeleton never does"
  }
};

window.LECTURES_REPO = "https://github.com/derrickmo/machine_learning_tutorials";
window.lectureFolder = function (n) { return `${window.LECTURES_REPO}/tree/main/modules/module_${n}`; };
