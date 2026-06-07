// curriculum.js — single source of truth for all 20 modules + 200 lessons.
// Loaded BEFORE any *-app.jsx. The learn / module / lesson page apps all
// consume window.CURRICULUM.
//
// status legend:
//   PENDING — not started, dim
//   DRAFT   — being written, link active
//   LIVE    — fully published, link active + bright

window.CURRICULUM = {
  modules: [
    {
      n: "01", slug: "foundations",
      title: "Mathematical & Programming Foundations",
      category: "Foundations",
      blurb: "Build fluency with Python's numerical stack and establish the mathematical prerequisites for ML/DL. No prior math courses assumed beyond high school.",
      status: "LIVE",
      lessons: [
        { n: "01-01", slug: "python-numpy-tensor-speed", title: "Python, NumPy & Tensor Speed", status: "PENDING" },
        { n: "01-02", slug: "advanced-numpy-pytorch", title: "Advanced NumPy & PyTorch Operations", status: "PENDING" },
        { n: "01-03", slug: "pandas", title: "Pandas for Tabular Data", status: "PENDING" },
        { n: "01-04", slug: "matplotlib", title: "Visualization with Matplotlib", status: "PENDING" },
        { n: "01-05", slug: "pytorch-data-loading", title: "Data Loading with PyTorch", status: "PENDING" },
        { n: "01-06", slug: "linear-algebra", title: "Linear Algebra for Machine Learning", status: "LIVE" },
        { n: "01-07", slug: "probability", title: "Probability & Statistics for ML", status: "PENDING" },
        { n: "01-08", slug: "information-theory", title: "Information Theory for ML", status: "PENDING" },
        { n: "01-09", slug: "calculus", title: "Calculus & Optimization Foundations", status: "PENDING" },
        { n: "01-10", slug: "complexity", title: "Computational Thinking & Complexity", status: "PENDING" },
      ],
    },
    {
      n: "02", slug: "supervised-learning",
      title: "Supervised Learning",
      category: "Classical ML",
      blurb: "Master core supervised algorithms from scratch using sklearn and NumPy. Every algorithm is implemented before being compared against library versions.",
      status: "LIVE",
      lessons: [
        { n: "02-01", slug: "linear-regression", title: "Linear Regression", status: "PENDING" },
        { n: "02-02", slug: "logistic-regression", title: "Logistic Regression & Binary Classification", status: "PENDING" },
        { n: "02-03", slug: "trees-forests", title: "Decision Trees & Random Forests", status: "PENDING" },
        { n: "02-04", slug: "boosting", title: "Gradient Boosting & AdaBoost", status: "PENDING" },
        { n: "02-05", slug: "svm", title: "Support Vector Machines", status: "PENDING" },
        { n: "02-06", slug: "glm", title: "Generalized Linear Models & Exponential Family", status: "PENDING" },
        { n: "02-07", slug: "knn", title: "k-Nearest Neighbors", status: "PENDING" },
        { n: "02-08", slug: "naive-bayes", title: "Naive Bayes for Text Classification", status: "PENDING" },
        { n: "02-09", slug: "ensembles", title: "Stacking & Voting Ensembles", status: "PENDING" },
        { n: "02-10", slug: "model-comparison", title: "Model Comparison & Algorithm Selection", status: "PENDING" },
      ],
    },
    {
      n: "03", slug: "unsupervised-learning",
      title: "Unsupervised & Statistical Learning",
      category: "Classical ML",
      blurb: "Discover structure in unlabeled data. EM connects to VAEs, kernel methods connect to attention, matrix factorization connects to recommenders and LoRA.",
      status: "LIVE",
      lessons: [
        { n: "03-01", slug: "kmeans", title: "K-Means Clustering", status: "PENDING" },
        { n: "03-02", slug: "hierarchical-density-clustering", title: "Hierarchical & Density-Based Clustering", status: "PENDING" },
        { n: "03-03", slug: "pca", title: "Principal Component Analysis", status: "PENDING" },
        { n: "03-04", slug: "tsne-umap", title: "t-SNE, UMAP & Manifold Learning", status: "PENDING" },
        { n: "03-05", slug: "ica", title: "Independent Component Analysis", status: "PENDING" },
        { n: "03-06", slug: "gmm-em", title: "Gaussian Mixture Models & EM Algorithm", status: "PENDING" },
        { n: "03-07", slug: "anomaly-detection", title: "Anomaly Detection", status: "PENDING" },
        { n: "03-08", slug: "kernel-methods", title: "Kernel Methods & Feature Maps", status: "PENDING" },
        { n: "03-09", slug: "matrix-factorization", title: "Matrix Factorization & Decomposition", status: "PENDING" },
        { n: "03-10", slug: "bayesian-inference", title: "Bayesian Inference & Probabilistic Thinking", status: "PENDING" },
      ],
    },
    {
      n: "04", slug: "ml-theory",
      title: "ML Theory & Evaluation",
      category: "Classical ML",
      blurb: "Production-quality evaluation pipelines and formal theory. VC dimension, PAC learning, convex optimization, calibration, Gaussian processes.",
      status: "LIVE",
      lessons: [
        { n: "04-01", slug: "evaluation-metrics", title: "Evaluation Metrics Deep Dive", status: "PENDING" },
        { n: "04-02", slug: "cross-validation", title: "Cross-Validation & Hyperparameter Tuning", status: "PENDING" },
        { n: "04-03", slug: "feature-engineering", title: "Feature Engineering & Pipelines", status: "PENDING" },
        { n: "04-04", slug: "data-augmentation", title: "Data Augmentation & Color Spaces", status: "PENDING" },
        { n: "04-05", slug: "imbalanced-data", title: "Handling Imbalanced Data", status: "PENDING" },
        { n: "04-06", slug: "learning-theory", title: "Learning Theory — VC Dimension, PAC Learning", status: "PENDING" },
        { n: "04-07", slug: "bias-variance", title: "Bias-Variance Decomposition & ML Debugging", status: "PENDING" },
        { n: "04-08", slug: "convex-optimization", title: "Convex Optimization Foundations", status: "PENDING" },
        { n: "04-09", slug: "calibration", title: "Calibration & Uncertainty Quantification", status: "PENDING" },
        { n: "04-10", slug: "gaussian-processes", title: "Gaussian Processes & Bayesian Optimization", status: "PENDING" },
      ],
    },
    {
      n: "05", slug: "neural-nets",
      title: "Neural Network Foundations",
      category: "Deep Learning Core",
      blurb: "Build neural networks from first principles in NumPy, implement backprop by hand, master the optimization toolkit, then transition to PyTorch.",
      status: "LIVE",
      lessons: [
        { n: "05-01", slug: "nn-walkthrough", title: "Neural Network End-to-End Walkthrough", status: "PENDING" },
        { n: "05-02", slug: "perceptron-mlp", title: "Perceptron & Multi-Layer Architecture", status: "PENDING" },
        { n: "05-03", slug: "activation-functions", title: "Activation Functions Deep Dive", status: "PENDING" },
        { n: "05-04", slug: "loss-functions", title: "Loss Functions Deep Dive", status: "LIVE" },
        { n: "05-05", slug: "forward-pass", title: "Forward Pass & Computational Graphs", status: "LIVE" },
        { n: "05-06", slug: "backprop", title: "Backpropagation from Scratch", status: "PENDING" },
        { n: "05-07", slug: "pytorch-fundamentals", title: "PyTorch Fundamentals — Autograd & nn.Module", status: "PENDING" },
        { n: "05-08", slug: "sgd-momentum", title: "Optimizers — SGD, Momentum & Nesterov", status: "PENDING" },
        { n: "05-09", slug: "adam-lr-scheduling", title: "Advanced Optimizers & Learning Rate Scheduling", status: "PENDING" },
        { n: "05-10", slug: "regularization", title: "Regularization Techniques", status: "PENDING" },
      ],
    },
    {
      n: "06", slug: "cnn",
      title: "Convolutional Neural Networks",
      category: "Deep Learning Core",
      blurb: "From convolution mechanics through landmark architectures to segmentation, adversarial robustness, and non-image domains.",
      status: "LIVE",
      lessons: [
        { n: "06-01", slug: "fc-for-images", title: "Fully Connected Networks for Images", status: "PENDING" },
        { n: "06-02", slug: "convolution", title: "Convolution from Scratch", status: "PENDING" },
        { n: "06-03", slug: "cnn-architectures", title: "CNN Architectures — LeNet to ResNet", status: "LIVE" },
        { n: "06-04", slug: "transfer-learning", title: "Transfer Learning & Fine-Tuning", status: "LIVE" },
        { n: "06-05", slug: "unet", title: "U-Net & Encoder-Decoder Architecture", status: "PENDING" },
        { n: "06-06", slug: "efficient-cnns", title: "Depthwise Separable Convolutions & Efficient Architectures", status: "PENDING" },
        { n: "06-07", slug: "segmentation", title: "Semantic & Instance Segmentation", status: "PENDING" },
        { n: "06-08", slug: "style-transfer", title: "Neural Style Transfer", status: "PENDING" },
        { n: "06-09", slug: "1d-3d-convolutions", title: "1D & 3D Convolutions", status: "PENDING" },
        { n: "06-10", slug: "adversarial", title: "Adversarial Examples & Robustness", status: "PENDING" },
      ],
    },
    {
      n: "07", slug: "rnn-nlp",
      title: "Recurrent Networks & NLP Foundations",
      category: "Deep Learning Core",
      blurb: "Tokenization, word vectors, RNNs, LSTMs, attention, parsing, and CRFs — the building blocks that lead to transformers.",
      status: "LIVE",
      lessons: [
        { n: "07-01", slug: "tokenization", title: "Tokenization — BPE, WordPiece & SentencePiece", status: "PENDING" },
        { n: "07-02", slug: "word-vectors", title: "Word Vectors — Word2Vec, GloVe & FastText", status: "PENDING" },
        { n: "07-03", slug: "rnn", title: "Recurrent Neural Networks from Scratch", status: "PENDING" },
        { n: "07-04", slug: "lstm-gru", title: "LSTMs & GRUs", status: "PENDING" },
        { n: "07-05", slug: "seq2seq-attention", title: "Sequence-to-Sequence with Attention", status: "LIVE" },
        { n: "07-06", slug: "text-generation", title: "Text Generation & Decoding Strategies", status: "PENDING" },
        { n: "07-07", slug: "classical-lm", title: "Classical Language Models & Perplexity", status: "PENDING" },
        { n: "07-08", slug: "dependency-parsing", title: "Dependency Parsing", status: "PENDING" },
        { n: "07-09", slug: "sequence-labeling", title: "Sequence Labeling & CRFs", status: "PENDING" },
        { n: "07-10", slug: "elmo", title: "Contextual Embeddings — ELMo", status: "PENDING" },
      ],
    },
    {
      n: "08", slug: "transformers",
      title: "Transformers — Architecture to Attention",
      category: "Deep Learning Core",
      blurb: "The most critical module. Build every transformer component from scratch: attention, RoPE, Flash Attention, KV cache — the backbone of modules 9–18.",
      status: "LIVE",
      lessons: [
        { n: "08-01", slug: "self-attention", title: "Self-Attention Mechanism", status: "DRAFT" },
        { n: "08-02", slug: "multi-head-attention", title: "Multi-Head Attention", status: "PENDING" },
        { n: "08-03", slug: "positional-encoding", title: "Positional Encoding — Sinusoidal & Learned", status: "PENDING" },
        { n: "08-04", slug: "transformer-block", title: "The Transformer Block", status: "PENDING" },
        { n: "08-05", slug: "full-transformer", title: "Full Transformer — Encoder-Decoder", status: "PENDING" },
        { n: "08-06", slug: "modern-blocks", title: "RMSNorm, SwiGLU & Modern Building Blocks", status: "PENDING" },
        { n: "08-07", slug: "gqa-mqa", title: "Grouped-Query & Multi-Query Attention", status: "PENDING" },
        { n: "08-08", slug: "rope", title: "Rotary Position Embeddings (RoPE)", status: "PENDING" },
        { n: "08-09", slug: "flash-attention", title: "Flash Attention — Algorithm & Concepts", status: "PENDING" },
        { n: "08-10", slug: "kv-cache", title: "KV Cache & Autoregressive Inference", status: "PENDING" },
      ],
    },
    {
      n: "09", slug: "advanced-cv",
      title: "Advanced Computer Vision",
      category: "Advanced Deep Learning",
      blurb: "Grad-CAM, object detection, YOLO, Vision Transformers, self-supervised learning, video understanding, OCR, and a CIFAR-100 training deep dive.",
      status: "LIVE",
      lessons: [
        { n: "09-01", slug: "grad-cam", title: "Grad-CAM & Saliency Maps", status: "PENDING" },
        { n: "09-02", slug: "object-detection", title: "Object Detection Fundamentals", status: "LIVE" },
        { n: "09-03", slug: "yolo", title: "YOLO Detection", status: "PENDING" },
        { n: "09-04", slug: "mediapipe", title: "MediaPipe Real-Time Vision", status: "PENDING" },
        { n: "09-05", slug: "vit", title: "Vision Transformers (ViT)", status: "PENDING" },
        { n: "09-06", slug: "dino-mae", title: "Self-Supervised Vision — DINO & MAE", status: "PENDING" },
        { n: "09-07", slug: "image-retrieval", title: "Image Retrieval & Visual Similarity Search", status: "PENDING" },
        { n: "09-08", slug: "video", title: "Video Understanding", status: "PENDING" },
        { n: "09-09", slug: "ocr", title: "OCR & Document AI", status: "PENDING" },
        { n: "09-10", slug: "cifar100", title: "CNN Training Deep Dive — CIFAR-100", status: "PENDING" },
      ],
    },
    {
      n: "10", slug: "advanced-nlp",
      title: "Advanced NLP — Pretrained Language Models",
      category: "Advanced Deep Learning",
      blurb: "GPT, BERT, fine-tuning, NER, NLI, QA, chain-of-thought, and mechanistic interpretability.",
      status: "LIVE",
      lessons: [
        { n: "10-01", slug: "gpt", title: "GPT-Style Autoregressive Language Modeling", status: "PENDING" },
        { n: "10-02", slug: "bert", title: "BERT-Style Masked Language Modeling", status: "PENDING" },
        { n: "10-03", slug: "architectures", title: "Encoder vs Decoder vs Encoder-Decoder", status: "PENDING" },
        { n: "10-04", slug: "fine-tuning-transformers", title: "Pretrained Transformer Fine-Tuning", status: "PENDING" },
        { n: "10-05", slug: "ner", title: "Named Entity Recognition", status: "PENDING" },
        { n: "10-06", slug: "nli", title: "Natural Language Inference", status: "PENDING" },
        { n: "10-07", slug: "qa", title: "Question Answering", status: "PENDING" },
        { n: "10-08", slug: "nlp-eval", title: "NLP Evaluation", status: "PENDING" },
        { n: "10-09", slug: "cot", title: "Chain-of-Thought & In-Context Learning", status: "PENDING" },
        { n: "10-10", slug: "interpretability", title: "Mechanistic Interpretability", status: "PENDING" },
      ],
    },
    {
      n: "11", slug: "generative",
      title: "Generative Deep Learning",
      category: "Advanced Deep Learning",
      blurb: "Autoencoders, VAEs, GANs, diffusion, normalizing flows, energy-based models, autoregressive generation.",
      status: "LIVE",
      lessons: [
        { n: "11-01", slug: "autoencoders", title: "Autoencoders", status: "PENDING" },
        { n: "11-02", slug: "vae", title: "Variational Autoencoders (VAEs)", status: "PENDING" },
        { n: "11-03", slug: "gan", title: "GANs — DCGAN & WGAN", status: "PENDING" },
        { n: "11-04", slug: "conditional-generation", title: "Conditional Generation", status: "PENDING" },
        { n: "11-05", slug: "ddpm", title: "DDPM Diffusion from Scratch", status: "LIVE" },
        { n: "11-06", slug: "latent-diffusion", title: "Latent Diffusion Models", status: "PENDING" },
        { n: "11-07", slug: "diffusion-guidance", title: "Diffusion Guidance & Evaluation", status: "PENDING" },
        { n: "11-08", slug: "flows", title: "Normalizing Flows & Flow Matching", status: "LIVE" },
        { n: "11-09", slug: "ebm-score", title: "Energy-Based Models & Score Matching", status: "PENDING" },
        { n: "11-10", slug: "ar-generative", title: "Autoregressive Generative Models", status: "PENDING" },
      ],
    },
    {
      n: "12", slug: "multimodal",
      title: "Multimodal & Cross-Modal Learning",
      category: "Advanced Deep Learning",
      blurb: "CLIP, contrastive learning, vision-language models, VQA, audio representations, speech pipelines.",
      status: "LIVE",
      lessons: [
        { n: "12-01", slug: "clip", title: "CLIP — Contrastive Image-Text Pretraining", status: "PENDING" },
        { n: "12-02", slug: "zero-shot", title: "Zero-Shot & Few-Shot Classification", status: "PENDING" },
        { n: "12-03", slug: "siamese", title: "Siamese Networks & Triplet Loss", status: "PENDING" },
        { n: "12-04", slug: "simclr-byol", title: "Contrastive Self-Supervised Learning — SimCLR & BYOL", status: "PENDING" },
        { n: "12-05", slug: "vlm-captioning", title: "Vision-Language Models & Image Captioning", status: "PENDING" },
        { n: "12-06", slug: "vqa", title: "Visual Question Answering", status: "PENDING" },
        { n: "12-07", slug: "multimodal-fusion", title: "Multi-Modal Fusion Architectures", status: "PENDING" },
        { n: "12-08", slug: "audio-representations", title: "Audio & Speech Representations", status: "PENDING" },
        { n: "12-09", slug: "stt-tts", title: "STT & TTS Foundations", status: "PENDING" },
        { n: "12-10", slug: "multimodal-eval", title: "Multimodal Evaluation & Alignment Metrics", status: "PENDING" },
      ],
    },
    {
      n: "13", slug: "fine-tuning",
      title: "Fine-Tuning & Alignment",
      category: "Adaptation & Alignment",
      blurb: "LoRA, QLoRA, instruction tuning, reward modeling, RLHF, DPO, efficient fine-tuning with Unsloth.",
      status: "LIVE",
      lessons: [
        { n: "13-01", slug: "full-fine-tuning", title: "Full Fine-Tuning vs Feature Extraction", status: "PENDING" },
        { n: "13-02", slug: "lora", title: "LoRA — Low-Rank Adaptation from Scratch", status: "PENDING" },
        { n: "13-03", slug: "qlora", title: "QLoRA — 4-Bit Quantization + LoRA", status: "PENDING" },
        { n: "13-04", slug: "adapters", title: "Adapter Methods Comparison", status: "PENDING" },
        { n: "13-05", slug: "prompt-tuning", title: "Prompt Tuning & Prefix Tuning", status: "PENDING" },
        { n: "13-06", slug: "instruction-tuning", title: "Instruction Tuning & SFT", status: "PENDING" },
        { n: "13-07", slug: "reward-modeling", title: "Reward Modeling (Bradley-Terry)", status: "PENDING" },
        { n: "13-08", slug: "rlhf-ppo", title: "RLHF with PPO", status: "LIVE" },
        { n: "13-09", slug: "dpo-grpo", title: "DPO, GRPO & Modern Alignment", status: "PENDING" },
        { n: "13-10", slug: "unsloth", title: "Efficient Fine-Tuning with Unsloth", status: "PENDING" },
      ],
    },
    {
      n: "14", slug: "reinforcement-learning",
      title: "Reinforcement Learning",
      category: "Reinforcement Learning",
      blurb: "MDPs, TD learning, Q-learning, bandits, DQN, policy gradients, actor-critic, model-based RL, offline RL, imitation learning.",
      status: "LIVE",
      lessons: [
        { n: "14-01", slug: "mdp-bellman", title: "MDPs, Bellman Equations & Value/Policy Iteration", status: "PENDING" },
        { n: "14-02", slug: "mc-td", title: "Monte Carlo & TD Learning", status: "LIVE" },
        { n: "14-03", slug: "q-learning", title: "Q-Learning & SARSA", status: "PENDING" },
        { n: "14-04", slug: "bandits", title: "Exploration, Bandits & UCB", status: "PENDING" },
        { n: "14-05", slug: "dqn", title: "Deep Q-Networks (DQN)", status: "PENDING" },
        { n: "14-06", slug: "policy-gradient", title: "Policy Gradient & REINFORCE", status: "PENDING" },
        { n: "14-07", slug: "actor-critic", title: "Actor-Critic, A2C & PPO", status: "PENDING" },
        { n: "14-08", slug: "model-based-rl", title: "Model-Based RL & MCTS", status: "PENDING" },
        { n: "14-09", slug: "offline-rl", title: "Offline RL — CQL & IQL", status: "PENDING" },
        { n: "14-10", slug: "imitation-learning", title: "Imitation Learning & Inverse RL", status: "PENDING" },
      ],
    },
    {
      n: "15", slug: "pytorch-internals",
      title: "Advanced PyTorch Internals",
      category: "Systems & Engineering",
      blurb: "Custom autograd, advanced data pipelines, state_dict surgery, TorchScript, torch.fx, CUDA memory, distributed primitives, profiling.",
      status: "LIVE",
      lessons: [
        { n: "15-01", slug: "custom-autograd", title: "Custom Autograd Functions & Hooks", status: "PENDING" },
        { n: "15-02", slug: "data-pipelines", title: "Advanced Data Pipelines", status: "PENDING" },
        { n: "15-03", slug: "nn-module-patterns", title: "Advanced nn.Module Patterns", status: "PENDING" },
        { n: "15-04", slug: "custom-loss", title: "Custom Loss Functions & Gradient Utilities", status: "PENDING" },
        { n: "15-05", slug: "torchscript", title: "TorchScript & JIT Compilation", status: "PENDING" },
        { n: "15-06", slug: "torch-fx", title: "torch.fx Graph Transformations", status: "PENDING" },
        { n: "15-07", slug: "cuda-memory", title: "CUDA Memory Management", status: "PENDING" },
        { n: "15-08", slug: "distributed-primitives", title: "Distributed Communication Primitives", status: "PENDING" },
        { n: "15-09", slug: "debugging-profiling", title: "PyTorch Debugging & Profiling", status: "PENDING" },
        { n: "15-10", slug: "mini-framework", title: "Mini Training Framework", status: "PENDING" },
      ],
    },
    {
      n: "16", slug: "training-systems",
      title: "Training Optimization & Distributed Systems",
      category: "Systems & Engineering",
      blurb: "Mixed precision, torch.compile, gradient checkpointing, DDP, FSDP, end-to-end optimized training.",
      status: "LIVE",
      lessons: [
        { n: "16-01", slug: "mixed-precision", title: "Mixed Precision Training", status: "PENDING" },
        { n: "16-02", slug: "torch-compile", title: "torch.compile — Dynamo & Inductor", status: "PENDING" },
        { n: "16-03", slug: "gradient-checkpointing", title: "Gradient Checkpointing", status: "PENDING" },
        { n: "16-04", slug: "gradient-accumulation", title: "Gradient Accumulation & Large Batch Training", status: "PENDING" },
        { n: "16-05", slug: "data-loading-scale", title: "Data Loading at Scale", status: "PENDING" },
        { n: "16-06", slug: "training-stability", title: "Training Stability & NaN Recovery", status: "PENDING" },
        { n: "16-07", slug: "profiling", title: "Profiling & Bottleneck Analysis", status: "PENDING" },
        { n: "16-08", slug: "ddp", title: "Distributed Data Parallel (DDP)", status: "LIVE" },
        { n: "16-09", slug: "fsdp", title: "FSDP, ZeRO & Model Parallelism", status: "PENDING" },
        { n: "16-10", slug: "optimized-pipeline", title: "End-to-End Optimized Training Pipeline", status: "PENDING" },
      ],
    },
    {
      n: "17", slug: "llm-systems",
      title: "Large Language Models — Systems & Scaling",
      category: "LLMs & Agents",
      blurb: "LLM architectures, scaling laws, MoE, quantization, efficient inference, long context, structured output, evaluation.",
      status: "LIVE",
      lessons: [
        { n: "17-01", slug: "llm-architectures", title: "LLM Architecture Patterns", status: "PENDING" },
        { n: "17-02", slug: "scaling-laws", title: "Scaling Laws & Chinchilla", status: "PENDING" },
        { n: "17-03", slug: "moe", title: "Mixture of Experts (MoE)", status: "PENDING" },
        { n: "17-04", slug: "llm-data-pipelines", title: "Training Data Pipelines", status: "PENDING" },
        { n: "17-05", slug: "distillation", title: "Knowledge Distillation", status: "PENDING" },
        { n: "17-06", slug: "quantization", title: "Quantization — PTQ, QAT, GPTQ, AWQ", status: "PENDING" },
        { n: "17-07", slug: "speculative-decoding", title: "Efficient Inference & Speculative Decoding", status: "PENDING" },
        { n: "17-08", slug: "long-context", title: "Long Context — RoPE Scaling & Sliding Window", status: "PENDING" },
        { n: "17-09", slug: "structured-output", title: "Structured Output & Function Calling", status: "PENDING" },
        { n: "17-10", slug: "llm-eval", title: "LLM Evaluation & Benchmarks", status: "PENDING" },
      ],
    },
    {
      n: "18", slug: "rag-agents",
      title: "RAG & Agentic AI Systems",
      category: "LLMs & Agents",
      blurb: "Embeddings, retrieval, RAG pipelines, agent loops, multi-agent orchestration, voice agents, guardrails.",
      status: "LIVE",
      lessons: [
        { n: "18-01", slug: "embeddings-vector-stores", title: "Embeddings & Vector Stores", status: "PENDING" },
        { n: "18-02", slug: "chunking-retrieval", title: "Chunking, BM25 & Dense Retrieval", status: "PENDING" },
        { n: "18-03", slug: "advanced-rag", title: "Advanced RAG — HyDE & Reranking", status: "PENDING" },
        { n: "18-04", slug: "rag-pipeline", title: "RAG Pipeline End-to-End", status: "LIVE" },
        { n: "18-05", slug: "rag-eval", title: "RAG Evaluation Metrics", status: "PENDING" },
        { n: "18-06", slug: "agent-loops", title: "Agent Loops, Tool Use & Planning", status: "PENDING" },
        { n: "18-07", slug: "multi-agent", title: "Multi-Agent Orchestration", status: "PENDING" },
        { n: "18-08", slug: "voice-agents", title: "Voice Agents — STT→LLM→TTS", status: "PENDING" },
        { n: "18-09", slug: "guardrails", title: "Guardrails & Agent Evaluation", status: "PENDING" },
        { n: "18-10", slug: "capstone-assistant", title: "Domain-Specific AI Assistant (Capstone)", status: "PENDING" },
      ],
    },
    {
      n: "19", slug: "ml-applications",
      title: "ML Applications & Domain Problems",
      category: "Applications",
      blurb: "Recommenders, time series, search ranking, explainability, GNNs, audio classification, tabular deep learning.",
      status: "LIVE",
      lessons: [
        { n: "19-01", slug: "recommenders-cf", title: "Recommender Systems — Collaborative Filtering", status: "PENDING" },
        { n: "19-02", slug: "neural-recommenders", title: "Neural Recommenders & Two-Tower Architecture", status: "PENDING" },
        { n: "19-03", slug: "time-series", title: "Time Series Forecasting", status: "PENDING" },
        { n: "19-04", slug: "search-ranking", title: "Search & Ranking Systems", status: "PENDING" },
        { n: "19-05", slug: "shap", title: "SHAP & Model-Agnostic Explainability", status: "PENDING" },
        { n: "19-06", slug: "gnn", title: "Graph Neural Networks", status: "PENDING" },
        { n: "19-07", slug: "audio-classification", title: "Audio Classification", status: "PENDING" },
        { n: "19-08", slug: "semi-supervised", title: "Semi-Supervised Learning", status: "PENDING" },
        { n: "19-09", slug: "multi-task", title: "Multi-Task & Multi-Output Learning", status: "PENDING" },
        { n: "19-10", slug: "tabular-dl", title: "Tabular Deep Learning", status: "PENDING" },
      ],
    },
    {
      n: "20", slug: "mlops",
      title: "MLOps & Production Deployment",
      category: "MLOps & Production",
      blurb: "ML strategy, experiment tracking, model export, serving, Docker, monitoring, CI/CD, testing, system design.",
      status: "LIVE",
      lessons: [
        { n: "20-01", slug: "ml-strategy", title: "ML Strategy & Error Analysis", status: "PENDING" },
        { n: "20-02", slug: "mlflow", title: "Experiment Tracking with MLflow", status: "PENDING" },
        { n: "20-03", slug: "torchscript-onnx", title: "Model Export — TorchScript & ONNX", status: "PENDING" },
        { n: "20-04", slug: "model-serving", title: "Model Serving — FastAPI & Gradio", status: "PENDING" },
        { n: "20-05", slug: "docker", title: "Docker Containerization", status: "PENDING" },
        { n: "20-06", slug: "monitoring", title: "Data Drift & Model Monitoring", status: "PENDING" },
        { n: "20-07", slug: "cicd", title: "CI/CD for ML", status: "PENDING" },
        { n: "20-08", slug: "testing", title: "ML Testing & Data Validation", status: "PENDING" },
        { n: "20-09", slug: "project-structure", title: "ML Project Structure & Best Practices", status: "PENDING" },
        { n: "20-10", slug: "system-design", title: "ML System Design Patterns", status: "PENDING" },
      ],
    },
  ],

  // Helper lookups
  findModule(slug) { return this.modules.find(m => m.slug === slug); },
  findLesson(moduleSlug, lessonSlug) {
    const m = this.findModule(moduleSlug);
    return m ? m.lessons.find(l => l.slug === lessonSlug) : null;
  },
  prevNext(moduleSlug, lessonSlug) {
    const idx = this.modules.findIndex(m => m.slug === moduleSlug);
    if (idx < 0) return { prev: null, next: null };
    const m = this.modules[idx];
    const lidx = m.lessons.findIndex(l => l.slug === lessonSlug);
    if (lidx < 0) return { prev: null, next: null };

    let prev = null, next = null;
    if (lidx > 0) {
      prev = { module: m, lesson: m.lessons[lidx - 1] };
    } else if (idx > 0) {
      const pm = this.modules[idx - 1];
      prev = { module: pm, lesson: pm.lessons[pm.lessons.length - 1] };
    }
    if (lidx < m.lessons.length - 1) {
      next = { module: m, lesson: m.lessons[lidx + 1] };
    } else if (idx < this.modules.length - 1) {
      const nm = this.modules[idx + 1];
      next = { module: nm, lesson: nm.lessons[0] };
    }
    return { prev, next };
  },

  // Repo URL helpers
  repo: "https://github.com/derrickmo/machine_learning_tutorials",
  notebookUrl(moduleSlug, lessonSlug) {
    const m = this.findModule(moduleSlug);
    if (!m) return this.repo;
    const lesson = m.lessons.find(l => l.slug === lessonSlug);
    if (!lesson) return this.repo;
    const folderName = `module_${m.n}_${m.slug.replace(/-/g, "_")}`;
    // Their notebook filenames use snake_case of the title (e.g. "08-01_self_attention_mechanism.ipynb")
    const fileTitle = lesson.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return `${this.repo}/blob/main/${folderName}/${lesson.n}_${fileTitle}.ipynb`;
  },
  colabUrl(moduleSlug, lessonSlug) {
    return this.notebookUrl(moduleSlug, lessonSlug)
      .replace("github.com", "colab.research.google.com/github")
      .replace("/blob/main/", "/blob/main/");
  },
};
