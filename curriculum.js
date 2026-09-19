// GENERATED from content/ by scripts/gen-from-store.mjs — DO NOT EDIT BY HAND.
// Edit the canonical store (content/modules/, lessons/) and re-run the generator.
// contentVersion 1.2.0
// curriculum.js — window.CURRICULUM for all 25 modules + 250 lessons.
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
      "n": "01",
      "slug": "foundations",
      "title": "Mathematical & Programming Foundations",
      "category": "Foundations",
      "blurb": "Build fluency with Python's numerical stack and establish the mathematical prerequisites for ML/DL. No prior math courses assumed beyond high school.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "01-01",
          "slug": "python-numpy-tensor-speed",
          "title": "Python, NumPy & Tensor Speed",
          "status": "LIVE",
          "nb": "01-01_python_numpy_tensor_speed.ipynb"
        },
        {
          "n": "01-02",
          "slug": "advanced-numpy-pytorch",
          "title": "Advanced NumPy & PyTorch Operations",
          "status": "LIVE",
          "nb": "01-02_advanced_numpy_pytorch_ops.ipynb"
        },
        {
          "n": "01-03",
          "slug": "pandas",
          "title": "Pandas for Tabular Data",
          "status": "LIVE",
          "nb": "01-03_pandas_tabular_data.ipynb"
        },
        {
          "n": "01-04",
          "slug": "matplotlib",
          "title": "Visualization with Matplotlib",
          "status": "LIVE",
          "nb": "01-04_visualization_matplotlib.ipynb"
        },
        {
          "n": "01-05",
          "slug": "pytorch-data-loading",
          "title": "Data Loading with PyTorch",
          "status": "LIVE",
          "nb": "01-05_data_loading_pytorch.ipynb"
        },
        {
          "n": "01-06",
          "slug": "linear-algebra",
          "title": "Linear Algebra for Machine Learning",
          "status": "LIVE",
          "nb": "01-06_linear_algebra_ml.ipynb"
        },
        {
          "n": "01-07",
          "slug": "probability",
          "title": "Probability & Statistics for ML",
          "status": "LIVE",
          "nb": "01-07_probability_statistics_ml.ipynb"
        },
        {
          "n": "01-08",
          "slug": "information-theory",
          "title": "Information Theory for ML",
          "status": "LIVE",
          "nb": "01-08_information_theory_ml.ipynb"
        },
        {
          "n": "01-09",
          "slug": "calculus",
          "title": "Calculus & Optimization Foundations",
          "status": "LIVE",
          "nb": "01-09_calculus_optimization_foundations.ipynb"
        },
        {
          "n": "01-10",
          "slug": "complexity",
          "title": "Computational Thinking & Complexity",
          "status": "LIVE",
          "nb": "01-10_computational_thinking_complexity.ipynb"
        }
      ]
    },
    {
      "n": "02",
      "slug": "supervised-learning",
      "title": "Supervised Learning",
      "category": "Classical ML",
      "blurb": "Master core supervised algorithms from scratch using sklearn and NumPy. Every algorithm is implemented before being compared against library versions.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "02-01",
          "slug": "linear-regression",
          "title": "Linear Regression",
          "status": "LIVE",
          "nb": "02-01_linear_regression.ipynb"
        },
        {
          "n": "02-02",
          "slug": "logistic-regression",
          "title": "Logistic Regression & Binary Classification",
          "status": "LIVE",
          "nb": "02-02_logistic_regression_binary_classification.ipynb"
        },
        {
          "n": "02-03",
          "slug": "trees-forests",
          "title": "Decision Trees & Random Forests",
          "status": "LIVE",
          "nb": "02-03_decision_trees_random_forests.ipynb"
        },
        {
          "n": "02-04",
          "slug": "boosting",
          "title": "Gradient Boosting & AdaBoost",
          "status": "LIVE",
          "nb": "02-04_gradient_boosting_adaboost.ipynb"
        },
        {
          "n": "02-05",
          "slug": "svm",
          "title": "Support Vector Machines",
          "status": "LIVE",
          "nb": "02-05_support_vector_machines.ipynb"
        },
        {
          "n": "02-06",
          "slug": "glm",
          "title": "Generalized Linear Models & Exponential Family",
          "status": "LIVE",
          "nb": "02-06_generalized_linear_models_exponential_family.ipynb"
        },
        {
          "n": "02-07",
          "slug": "knn",
          "title": "k-Nearest Neighbors",
          "status": "LIVE",
          "nb": "02-07_k_nearest_neighbors.ipynb"
        },
        {
          "n": "02-08",
          "slug": "naive-bayes",
          "title": "Naive Bayes for Text Classification",
          "status": "LIVE",
          "nb": "02-08_naive_bayes_text_classification.ipynb"
        },
        {
          "n": "02-09",
          "slug": "ensembles",
          "title": "Stacking & Voting Ensembles",
          "status": "LIVE",
          "nb": "02-09_stacking_voting_ensembles.ipynb"
        },
        {
          "n": "02-10",
          "slug": "model-comparison",
          "title": "Model Comparison & Algorithm Selection",
          "status": "LIVE",
          "nb": "02-10_model_comparison_algorithm_selection.ipynb"
        }
      ]
    },
    {
      "n": "03",
      "slug": "unsupervised-learning",
      "title": "Unsupervised & Statistical Learning",
      "category": "Classical ML",
      "blurb": "Discover structure in unlabeled data. EM connects to VAEs, kernel methods connect to attention, matrix factorization connects to recommenders and LoRA.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "03-01",
          "slug": "kmeans",
          "title": "K-Means Clustering",
          "status": "LIVE",
          "nb": "03-01_kmeans_clustering.ipynb"
        },
        {
          "n": "03-02",
          "slug": "hierarchical-density-clustering",
          "title": "Hierarchical & Density-Based Clustering",
          "status": "LIVE",
          "nb": "03-02_hierarchical_density_based_clustering.ipynb"
        },
        {
          "n": "03-03",
          "slug": "pca",
          "title": "Principal Component Analysis",
          "status": "LIVE",
          "nb": "03-03_principal_component_analysis.ipynb"
        },
        {
          "n": "03-04",
          "slug": "tsne-umap",
          "title": "t-SNE, UMAP & Manifold Learning",
          "status": "LIVE",
          "nb": "03-04_tsne_umap_manifold_learning.ipynb"
        },
        {
          "n": "03-05",
          "slug": "ica",
          "title": "Independent Component Analysis",
          "status": "LIVE",
          "nb": "03-05_independent_component_analysis.ipynb"
        },
        {
          "n": "03-06",
          "slug": "gmm-em",
          "title": "Gaussian Mixture Models & EM Algorithm",
          "status": "LIVE",
          "nb": "03-06_gaussian_mixture_models_em_algorithm.ipynb"
        },
        {
          "n": "03-07",
          "slug": "anomaly-detection",
          "title": "Anomaly Detection",
          "status": "LIVE",
          "nb": "03-07_anomaly_detection.ipynb"
        },
        {
          "n": "03-08",
          "slug": "kernel-methods",
          "title": "Kernel Methods & Feature Maps",
          "status": "LIVE",
          "nb": "03-08_kernel_methods_feature_maps.ipynb"
        },
        {
          "n": "03-09",
          "slug": "matrix-factorization",
          "title": "Matrix Factorization & Decomposition",
          "status": "LIVE",
          "nb": "03-09_matrix_factorization_decomposition.ipynb"
        },
        {
          "n": "03-10",
          "slug": "bayesian-inference",
          "title": "Bayesian Inference & Probabilistic Thinking",
          "status": "LIVE",
          "nb": "03-10_bayesian_inference_probabilistic_thinking.ipynb"
        }
      ]
    },
    {
      "n": "04",
      "slug": "ml-theory",
      "title": "ML Theory & Evaluation",
      "category": "Classical ML",
      "blurb": "Production-quality evaluation pipelines and formal theory. VC dimension, PAC learning, convex optimization, calibration, Gaussian processes.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "04-01",
          "slug": "evaluation-metrics",
          "title": "Evaluation Metrics Deep Dive",
          "status": "LIVE",
          "nb": "04-01_evaluation_metrics_deep_dive.ipynb"
        },
        {
          "n": "04-02",
          "slug": "cross-validation",
          "title": "Cross-Validation & Hyperparameter Tuning",
          "status": "LIVE",
          "nb": "04-02_cross_validation_hyperparameter_tuning.ipynb"
        },
        {
          "n": "04-03",
          "slug": "feature-engineering",
          "title": "Feature Engineering & Pipelines",
          "status": "LIVE",
          "nb": "04-03_feature_engineering_pipelines.ipynb"
        },
        {
          "n": "04-04",
          "slug": "data-augmentation",
          "title": "Data Augmentation & Color Spaces",
          "status": "LIVE",
          "nb": "04-04_data_augmentation_color_spaces.ipynb"
        },
        {
          "n": "04-05",
          "slug": "imbalanced-data",
          "title": "Handling Imbalanced Data",
          "status": "LIVE",
          "nb": "04-05_handling_imbalanced_data.ipynb"
        },
        {
          "n": "04-06",
          "slug": "learning-theory",
          "title": "Learning Theory — VC Dimension, PAC Learning",
          "status": "LIVE",
          "nb": "04-06_learning_theory_vc_dimension_pac.ipynb"
        },
        {
          "n": "04-07",
          "slug": "bias-variance",
          "title": "Bias-Variance Decomposition & ML Debugging",
          "status": "LIVE",
          "nb": "04-07_bias_variance_decomposition_ml_debugging.ipynb"
        },
        {
          "n": "04-08",
          "slug": "convex-optimization",
          "title": "Convex Optimization Foundations",
          "status": "LIVE",
          "nb": "04-08_convex_optimization_foundations.ipynb"
        },
        {
          "n": "04-09",
          "slug": "calibration",
          "title": "Calibration & Uncertainty Quantification",
          "status": "LIVE",
          "nb": "04-09_calibration_uncertainty_quantification.ipynb"
        },
        {
          "n": "04-10",
          "slug": "gaussian-processes",
          "title": "Gaussian Processes & Bayesian Optimization",
          "status": "LIVE",
          "nb": "04-10_gaussian_processes_bayesian_opt.ipynb"
        }
      ]
    },
    {
      "n": "05",
      "slug": "neural-nets",
      "title": "Neural Network Foundations",
      "category": "Deep Learning Core",
      "blurb": "Build neural networks from first principles in NumPy, implement backprop by hand, master the optimization toolkit, then transition to PyTorch.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "05-01",
          "slug": "nn-walkthrough",
          "title": "Neural Network End-to-End Walkthrough",
          "status": "LIVE",
          "nb": "05-01_neural_network_end_to_end_walkthrough.ipynb"
        },
        {
          "n": "05-02",
          "slug": "perceptron-mlp",
          "title": "Perceptron & Multi-Layer Architecture",
          "status": "LIVE",
          "nb": "05-02_perceptron_multi_layer_architecture.ipynb"
        },
        {
          "n": "05-03",
          "slug": "activation-functions",
          "title": "Activation Functions Deep Dive",
          "status": "LIVE",
          "nb": "05-03_activation_functions.ipynb"
        },
        {
          "n": "05-04",
          "slug": "loss-functions",
          "title": "Loss Functions Deep Dive",
          "status": "LIVE",
          "nb": "05-04_loss_functions.ipynb"
        },
        {
          "n": "05-05",
          "slug": "forward-pass",
          "title": "Forward Pass & Computational Graphs",
          "status": "LIVE",
          "nb": "05-05_forward_pass_computational_graphs.ipynb"
        },
        {
          "n": "05-06",
          "slug": "backprop",
          "title": "Backpropagation from Scratch",
          "status": "LIVE",
          "nb": "05-06_backpropagation.ipynb"
        },
        {
          "n": "05-07",
          "slug": "pytorch-fundamentals",
          "title": "PyTorch Fundamentals — Autograd & nn.Module",
          "status": "LIVE",
          "nb": "05-07_pytorch_fundamentals_autograd_nn_module.ipynb"
        },
        {
          "n": "05-08",
          "slug": "sgd-momentum",
          "title": "Optimizers — SGD, Momentum & Nesterov",
          "status": "LIVE",
          "nb": "05-08_optimizers_sgd_momentum_nesterov.ipynb"
        },
        {
          "n": "05-09",
          "slug": "adam-lr-scheduling",
          "title": "Advanced Optimizers & Learning Rate Scheduling",
          "status": "LIVE",
          "nb": "05-09_advanced_optimizers_learning_rate_scheduling.ipynb"
        },
        {
          "n": "05-10",
          "slug": "regularization",
          "title": "Regularization Techniques",
          "status": "LIVE",
          "nb": "05-10_regularization_techniques.ipynb"
        }
      ]
    },
    {
      "n": "06",
      "slug": "cnn",
      "title": "Convolutional Neural Networks",
      "category": "Deep Learning Core",
      "blurb": "From convolution mechanics through landmark architectures to segmentation, adversarial robustness, and non-image domains.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "06-01",
          "slug": "fc-for-images",
          "title": "Fully Connected Networks for Images",
          "status": "LIVE",
          "nb": "06-01_fully_connected_networks_for_images.ipynb"
        },
        {
          "n": "06-02",
          "slug": "convolution",
          "title": "Convolution from Scratch",
          "status": "LIVE",
          "nb": "06-02_convolution_from_scratch.ipynb"
        },
        {
          "n": "06-03",
          "slug": "cnn-architectures",
          "title": "CNN Architectures — LeNet to ResNet",
          "status": "LIVE",
          "nb": "06-03_cnn_architectures_lenet_to_resnet.ipynb"
        },
        {
          "n": "06-04",
          "slug": "transfer-learning",
          "title": "Transfer Learning & Fine-Tuning",
          "status": "LIVE",
          "nb": "06-04_transfer_learning_fine_tuning.ipynb"
        },
        {
          "n": "06-05",
          "slug": "unet",
          "title": "U-Net & Encoder-Decoder Architecture",
          "status": "LIVE",
          "nb": "06-05_unet_encoder_decoder_architecture.ipynb"
        },
        {
          "n": "06-06",
          "slug": "efficient-cnns",
          "title": "Depthwise Separable Convolutions & Efficient Architectures",
          "status": "LIVE",
          "nb": "06-06_depthwise_separable_convolutions_efficient_architectures.ipynb"
        },
        {
          "n": "06-07",
          "slug": "segmentation",
          "title": "Semantic & Instance Segmentation",
          "status": "LIVE",
          "nb": "06-07_semantic_instance_segmentation.ipynb"
        },
        {
          "n": "06-08",
          "slug": "style-transfer",
          "title": "Neural Style Transfer",
          "status": "LIVE",
          "nb": "06-08_neural_style_transfer.ipynb"
        },
        {
          "n": "06-09",
          "slug": "1d-3d-convolutions",
          "title": "1D & 3D Convolutions",
          "status": "LIVE",
          "nb": "06-09_conv1d_conv3d.ipynb"
        },
        {
          "n": "06-10",
          "slug": "adversarial",
          "title": "Adversarial Examples & Robustness",
          "status": "LIVE",
          "nb": "06-10_adversarial_examples_robustness.ipynb"
        }
      ]
    },
    {
      "n": "07",
      "slug": "rnn-nlp",
      "title": "Recurrent Networks & NLP Foundations",
      "category": "Deep Learning Core",
      "blurb": "Tokenization, word vectors, RNNs, LSTMs, attention, parsing, and CRFs — the building blocks that lead to transformers.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "07-01",
          "slug": "tokenization",
          "title": "Tokenization — BPE, WordPiece & SentencePiece",
          "status": "LIVE",
          "nb": "07-01_tokenization_bpe_wordpiece_sentencepiece.ipynb"
        },
        {
          "n": "07-02",
          "slug": "word-vectors",
          "title": "Word Vectors — Word2Vec, GloVe & FastText",
          "status": "LIVE",
          "nb": "07-02_word_vectors_word2vec_glove_fasttext.ipynb"
        },
        {
          "n": "07-03",
          "slug": "rnn",
          "title": "Recurrent Neural Networks from Scratch",
          "status": "LIVE",
          "nb": "07-03_recurrent_neural_networks.ipynb"
        },
        {
          "n": "07-04",
          "slug": "lstm-gru",
          "title": "LSTMs & GRUs",
          "status": "LIVE",
          "nb": "07-04_lstm_gru.ipynb"
        },
        {
          "n": "07-05",
          "slug": "seq2seq-attention",
          "title": "Sequence-to-Sequence with Attention",
          "status": "LIVE",
          "nb": "07-05_seq2seq_attention.ipynb"
        },
        {
          "n": "07-06",
          "slug": "text-generation",
          "title": "Text Generation & Decoding Strategies",
          "status": "LIVE",
          "nb": "07-06_text_generation_decoding_strategies.ipynb"
        },
        {
          "n": "07-07",
          "slug": "classical-lm",
          "title": "Classical Language Models & Perplexity",
          "status": "LIVE",
          "nb": "07-07_classical_language_models_perplexity.ipynb"
        },
        {
          "n": "07-08",
          "slug": "dependency-parsing",
          "title": "Dependency Parsing",
          "status": "LIVE",
          "nb": "07-08_dependency_parsing.ipynb"
        },
        {
          "n": "07-09",
          "slug": "sequence-labeling",
          "title": "Sequence Labeling & CRFs",
          "status": "LIVE",
          "nb": "07-09_sequence_labeling_bilstm_crf.ipynb"
        },
        {
          "n": "07-10",
          "slug": "elmo",
          "title": "Contextual Embeddings — ELMo",
          "status": "LIVE",
          "nb": "07-10_contextual_embeddings_elmo.ipynb"
        }
      ]
    },
    {
      "n": "08",
      "slug": "transformers",
      "title": "Transformers: Architecture to Attention",
      "category": "Deep Learning Core",
      "blurb": "The most critical module. Build every transformer component from scratch: attention, RoPE, Flash Attention, KV cache — the backbone of modules 9–18.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "08-01",
          "slug": "self-attention",
          "title": "Self-Attention Mechanism",
          "status": "LIVE",
          "nb": "08-01_self_attention_mechanism.ipynb"
        },
        {
          "n": "08-02",
          "slug": "multi-head-attention",
          "title": "Multi-Head Attention",
          "status": "LIVE",
          "nb": "08-02_multi_head_attention.ipynb"
        },
        {
          "n": "08-03",
          "slug": "positional-encoding",
          "title": "Positional Encoding — Sinusoidal & Learned",
          "status": "LIVE",
          "nb": "08-03_positional_encoding_sinusoidal_learned.ipynb"
        },
        {
          "n": "08-04",
          "slug": "transformer-block",
          "title": "The Transformer Block",
          "status": "LIVE",
          "nb": "08-04_transformer_block.ipynb"
        },
        {
          "n": "08-05",
          "slug": "full-transformer",
          "title": "Full Transformer — Encoder-Decoder",
          "status": "LIVE",
          "nb": "08-05_full_transformer_encoder_decoder.ipynb"
        },
        {
          "n": "08-06",
          "slug": "modern-blocks",
          "title": "RMSNorm, SwiGLU & Modern Building Blocks",
          "status": "LIVE",
          "nb": "08-06_rmsnorm_swiglu_modern_blocks.ipynb"
        },
        {
          "n": "08-07",
          "slug": "gqa-mqa",
          "title": "Grouped-Query & Multi-Query Attention",
          "status": "LIVE",
          "nb": "08-07_grouped_query_multi_query_attention.ipynb"
        },
        {
          "n": "08-08",
          "slug": "rope",
          "title": "Rotary Position Embeddings (RoPE)",
          "status": "LIVE",
          "nb": "08-08_rotary_position_embeddings_rope.ipynb"
        },
        {
          "n": "08-09",
          "slug": "flash-attention",
          "title": "Flash Attention — Algorithm & Concepts",
          "status": "LIVE",
          "nb": "08-09_flash_attention_concepts.ipynb"
        },
        {
          "n": "08-10",
          "slug": "kv-cache",
          "title": "KV Cache & Autoregressive Inference",
          "status": "LIVE",
          "nb": "08-10_kv_cache_autoregressive_inference.ipynb"
        }
      ]
    },
    {
      "n": "09",
      "slug": "advanced-cv",
      "title": "Advanced Computer Vision",
      "category": "Advanced Deep Learning",
      "blurb": "Grad-CAM, object detection, YOLO, Vision Transformers, self-supervised learning, video understanding, OCR, and a CIFAR-100 training deep dive.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "09-01",
          "slug": "grad-cam",
          "title": "Grad-CAM & Saliency Maps",
          "status": "LIVE",
          "nb": "09-01_grad_cam_saliency_maps.ipynb"
        },
        {
          "n": "09-02",
          "slug": "object-detection",
          "title": "Object Detection Fundamentals",
          "status": "LIVE",
          "nb": "09-02_object_detection_fundamentals.ipynb"
        },
        {
          "n": "09-03",
          "slug": "yolo",
          "title": "YOLO Detection",
          "status": "LIVE",
          "nb": "09-03_yolo_detection.ipynb"
        },
        {
          "n": "09-04",
          "slug": "mediapipe",
          "title": "MediaPipe Real-Time Vision",
          "status": "LIVE",
          "nb": "09-04_mediapipe_real_time_vision.ipynb"
        },
        {
          "n": "09-05",
          "slug": "vit",
          "title": "Vision Transformers (ViT)",
          "status": "LIVE",
          "nb": "09-05_vision_transformers_vit.ipynb"
        },
        {
          "n": "09-06",
          "slug": "dino-mae",
          "title": "Self-Supervised Vision — DINO & MAE",
          "status": "LIVE",
          "nb": "09-06_self_supervised_dino_mae.ipynb"
        },
        {
          "n": "09-07",
          "slug": "image-retrieval",
          "title": "Image Retrieval & Visual Similarity Search",
          "status": "LIVE",
          "nb": "09-07_image_retrieval_visual_similarity_search.ipynb"
        },
        {
          "n": "09-08",
          "slug": "video",
          "title": "Video Understanding",
          "status": "LIVE",
          "nb": "09-08_video_understanding.ipynb"
        },
        {
          "n": "09-09",
          "slug": "ocr",
          "title": "OCR & Document AI",
          "status": "LIVE",
          "nb": "09-09_ocr_document_ai.ipynb"
        },
        {
          "n": "09-10",
          "slug": "cifar100",
          "title": "CNN Training Deep Dive — CIFAR-100",
          "status": "LIVE",
          "nb": "09-10_cnn_training_deep_dive_cifar100.ipynb"
        }
      ]
    },
    {
      "n": "10",
      "slug": "advanced-nlp",
      "title": "Advanced NLP: Pretrained Language Models",
      "category": "Advanced Deep Learning",
      "blurb": "GPT, BERT, fine-tuning, NER, NLI, QA, chain-of-thought, and mechanistic interpretability.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "10-01",
          "slug": "gpt",
          "title": "GPT-Style Autoregressive Language Modeling",
          "status": "LIVE",
          "nb": "10-01_gpt_style_autoregressive_language_modeling.ipynb"
        },
        {
          "n": "10-02",
          "slug": "bert",
          "title": "BERT-Style Masked Language Modeling",
          "status": "LIVE",
          "nb": "10-02_bert_style_masked_language_modeling.ipynb"
        },
        {
          "n": "10-03",
          "slug": "architectures",
          "title": "Encoder vs Decoder vs Encoder-Decoder",
          "status": "LIVE",
          "nb": "10-03_encoder_decoder_architectures.ipynb"
        },
        {
          "n": "10-04",
          "slug": "fine-tuning-transformers",
          "title": "Pretrained Transformer Fine-Tuning",
          "status": "LIVE",
          "nb": "10-04_pretrained_transformer_fine_tuning.ipynb"
        },
        {
          "n": "10-05",
          "slug": "ner",
          "title": "Named Entity Recognition",
          "status": "LIVE",
          "nb": "10-05_named_entity_recognition.ipynb"
        },
        {
          "n": "10-06",
          "slug": "nli",
          "title": "Natural Language Inference",
          "status": "LIVE",
          "nb": "10-06_natural_language_inference.ipynb"
        },
        {
          "n": "10-07",
          "slug": "qa",
          "title": "Question Answering",
          "status": "LIVE",
          "nb": "10-07_question_answering.ipynb"
        },
        {
          "n": "10-08",
          "slug": "nlp-eval",
          "title": "NLP Evaluation",
          "status": "LIVE",
          "nb": "10-08_nlp_evaluation_pipeline.ipynb"
        },
        {
          "n": "10-09",
          "slug": "cot",
          "title": "Chain-of-Thought & In-Context Learning",
          "status": "LIVE",
          "nb": "10-09_chain_of_thought_in_context_learning.ipynb"
        },
        {
          "n": "10-10",
          "slug": "interpretability",
          "title": "Mechanistic Interpretability",
          "status": "LIVE",
          "nb": "10-10_mechanistic_interpretability.ipynb"
        }
      ]
    },
    {
      "n": "11",
      "slug": "generative",
      "title": "Generative Deep Learning",
      "category": "Advanced Deep Learning",
      "blurb": "Autoencoders, VAEs, GANs, diffusion, normalizing flows, energy-based models, autoregressive generation.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "11-01",
          "slug": "autoencoders",
          "title": "Autoencoders",
          "status": "LIVE",
          "nb": "11-01_autoencoders.ipynb"
        },
        {
          "n": "11-02",
          "slug": "vae",
          "title": "Variational Autoencoders (VAEs)",
          "status": "LIVE",
          "nb": "11-02_variational_autoencoders.ipynb"
        },
        {
          "n": "11-03",
          "slug": "gan",
          "title": "GANs — DCGAN & WGAN",
          "status": "LIVE",
          "nb": "11-03_gans_dcgan_wgan.ipynb"
        },
        {
          "n": "11-04",
          "slug": "conditional-generation",
          "title": "Conditional Generation",
          "status": "LIVE",
          "nb": "11-04_conditional_generation.ipynb"
        },
        {
          "n": "11-05",
          "slug": "ddpm",
          "title": "DDPM Diffusion from Scratch",
          "status": "LIVE",
          "nb": "11-05_ddpm_diffusion_from_scratch.ipynb"
        },
        {
          "n": "11-06",
          "slug": "latent-diffusion",
          "title": "Latent Diffusion Models",
          "status": "LIVE",
          "nb": "11-06_latent_diffusion_models.ipynb"
        },
        {
          "n": "11-07",
          "slug": "diffusion-guidance",
          "title": "Diffusion Guidance & Evaluation",
          "status": "LIVE",
          "nb": "11-07_diffusion_guidance_evaluation.ipynb"
        },
        {
          "n": "11-08",
          "slug": "flows",
          "title": "Normalizing Flows & Flow Matching",
          "status": "LIVE",
          "nb": "11-08_normalizing_flows_flow_matching.ipynb"
        },
        {
          "n": "11-09",
          "slug": "ebm-score",
          "title": "Energy-Based Models & Score Matching",
          "status": "LIVE",
          "nb": "11-09_energy_based_models_score_matching.ipynb"
        },
        {
          "n": "11-10",
          "slug": "ar-generative",
          "title": "Autoregressive Generative Models",
          "status": "LIVE",
          "nb": "11-10_autoregressive_generative_models.ipynb"
        }
      ]
    },
    {
      "n": "12",
      "slug": "multimodal",
      "title": "Multimodal & Cross-Modal Learning",
      "category": "Advanced Deep Learning",
      "blurb": "CLIP, contrastive learning, vision-language models, VQA, audio representations, speech pipelines.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "12-01",
          "slug": "clip",
          "title": "CLIP — Contrastive Image-Text Pretraining",
          "status": "LIVE",
          "nb": "12-01_clip_contrastive_image_text_pretraining.ipynb"
        },
        {
          "n": "12-02",
          "slug": "zero-shot",
          "title": "Zero-Shot & Few-Shot Classification",
          "status": "LIVE",
          "nb": "12-02_zero_shot_few_shot_classification.ipynb"
        },
        {
          "n": "12-03",
          "slug": "siamese",
          "title": "Siamese Networks & Triplet Loss",
          "status": "LIVE",
          "nb": "12-03_siamese_networks_triplet_loss.ipynb"
        },
        {
          "n": "12-04",
          "slug": "simclr-byol",
          "title": "Contrastive Self-Supervised Learning — SimCLR & BYOL",
          "status": "LIVE",
          "nb": "12-04_contrastive_ssl_simclr_byol.ipynb"
        },
        {
          "n": "12-05",
          "slug": "vlm-captioning",
          "title": "Vision-Language Models & Image Captioning",
          "status": "LIVE",
          "nb": "12-05_vision_language_models_image_captioning.ipynb"
        },
        {
          "n": "12-06",
          "slug": "vqa",
          "title": "Visual Question Answering",
          "status": "LIVE",
          "nb": "12-06_visual_question_answering.ipynb"
        },
        {
          "n": "12-07",
          "slug": "multimodal-fusion",
          "title": "Multi-Modal Fusion Architectures",
          "status": "LIVE",
          "nb": "12-07_multi_modal_fusion_architectures.ipynb"
        },
        {
          "n": "12-08",
          "slug": "audio-representations",
          "title": "Audio & Speech Representations",
          "status": "LIVE",
          "nb": "12-08_audio_speech_representations.ipynb"
        },
        {
          "n": "12-09",
          "slug": "stt-tts",
          "title": "STT & TTS Foundations",
          "status": "LIVE",
          "nb": "12-09_stt_tts_foundations.ipynb"
        },
        {
          "n": "12-10",
          "slug": "multimodal-eval",
          "title": "Multimodal Evaluation & Alignment Metrics",
          "status": "LIVE",
          "nb": "12-10_multimodal_evaluation_alignment_metrics.ipynb"
        }
      ]
    },
    {
      "n": "13",
      "slug": "fine-tuning",
      "title": "Fine-Tuning & Alignment",
      "category": "Adaptation & Alignment",
      "blurb": "LoRA, QLoRA, instruction tuning, reward modeling, RLHF, DPO, efficient fine-tuning with Unsloth.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "13-01",
          "slug": "full-fine-tuning",
          "title": "Full Fine-Tuning vs Feature Extraction",
          "status": "LIVE",
          "nb": "13-01_full_finetuning_vs_feature_extraction.ipynb"
        },
        {
          "n": "13-02",
          "slug": "lora",
          "title": "LoRA — Low-Rank Adaptation from Scratch",
          "status": "LIVE",
          "nb": "13-02_lora_low_rank_adaptation.ipynb"
        },
        {
          "n": "13-03",
          "slug": "qlora",
          "title": "QLoRA — 4-Bit Quantization + LoRA",
          "status": "LIVE",
          "nb": "13-03_qlora_4bit_quantization.ipynb"
        },
        {
          "n": "13-04",
          "slug": "adapters",
          "title": "Adapter Methods Comparison",
          "status": "LIVE",
          "nb": "13-04_adapter_methods_comparison.ipynb"
        },
        {
          "n": "13-05",
          "slug": "prompt-tuning",
          "title": "Prompt Tuning & Prefix Tuning",
          "status": "LIVE",
          "nb": "13-05_prompt_tuning_prefix_tuning.ipynb"
        },
        {
          "n": "13-06",
          "slug": "instruction-tuning",
          "title": "Instruction Tuning & SFT",
          "status": "LIVE",
          "nb": "13-06_instruction_tuning_sft.ipynb"
        },
        {
          "n": "13-07",
          "slug": "reward-modeling",
          "title": "Reward Modeling (Bradley-Terry)",
          "status": "LIVE",
          "nb": "13-07_reward_modeling_bradley_terry.ipynb"
        },
        {
          "n": "13-08",
          "slug": "rlhf-ppo",
          "title": "RLHF with PPO",
          "status": "LIVE",
          "nb": "13-08_rlhf_with_ppo.ipynb"
        },
        {
          "n": "13-09",
          "slug": "dpo-grpo",
          "title": "DPO, GRPO & Modern Alignment",
          "status": "LIVE",
          "nb": "13-09_dpo_grpo_modern_alignment.ipynb"
        },
        {
          "n": "13-10",
          "slug": "unsloth",
          "title": "Efficient Fine-Tuning with Unsloth",
          "status": "LIVE",
          "nb": "13-10_efficient_finetuning_unsloth.ipynb"
        }
      ]
    },
    {
      "n": "14",
      "slug": "reinforcement-learning",
      "title": "Reinforcement Learning",
      "category": "Reinforcement Learning",
      "blurb": "MDPs, TD learning, Q-learning, bandits, DQN, policy gradients, actor-critic, model-based RL, offline RL, imitation learning.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "14-01",
          "slug": "mdp-bellman",
          "title": "MDPs, Bellman Equations & Value/Policy Iteration",
          "status": "LIVE",
          "nb": "14-01_mdps_bellman_value_policy_iteration.ipynb"
        },
        {
          "n": "14-02",
          "slug": "mc-td",
          "title": "Monte Carlo & TD Learning",
          "status": "LIVE",
          "nb": "14-02_monte_carlo_td_learning.ipynb"
        },
        {
          "n": "14-03",
          "slug": "q-learning",
          "title": "Q-Learning & SARSA",
          "status": "LIVE",
          "nb": "14-03_q_learning_sarsa.ipynb"
        },
        {
          "n": "14-04",
          "slug": "bandits",
          "title": "Exploration, Bandits & UCB",
          "status": "LIVE",
          "nb": "14-04_exploration_bandits_ucb.ipynb"
        },
        {
          "n": "14-05",
          "slug": "dqn",
          "title": "Deep Q-Networks (DQN)",
          "status": "LIVE",
          "nb": "14-05_deep_q_networks_dqn.ipynb"
        },
        {
          "n": "14-06",
          "slug": "policy-gradient",
          "title": "Policy Gradient & REINFORCE",
          "status": "LIVE",
          "nb": "14-06_policy_gradient_reinforce.ipynb"
        },
        {
          "n": "14-07",
          "slug": "actor-critic",
          "title": "Actor-Critic, A2C & PPO",
          "status": "LIVE",
          "nb": "14-07_actor_critic_a2c.ipynb"
        },
        {
          "n": "14-08",
          "slug": "model-based-rl",
          "title": "Model-Based RL & MCTS",
          "status": "LIVE",
          "nb": "14-08_model_based_rl_mcts.ipynb"
        },
        {
          "n": "14-09",
          "slug": "offline-rl",
          "title": "Offline RL — CQL & IQL",
          "status": "LIVE",
          "nb": "14-09_offline_rl_cql_iql.ipynb"
        },
        {
          "n": "14-10",
          "slug": "imitation-learning",
          "title": "Imitation Learning & Inverse RL",
          "status": "LIVE",
          "nb": "14-10_imitation_learning_inverse_rl.ipynb"
        }
      ]
    },
    {
      "n": "15",
      "slug": "pytorch-internals",
      "title": "Advanced PyTorch Internals",
      "category": "Systems & Engineering",
      "blurb": "Custom autograd, advanced data pipelines, state_dict surgery, TorchScript, torch.fx, CUDA memory, distributed primitives, profiling.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "15-01",
          "slug": "custom-autograd",
          "title": "Custom Autograd Functions & Hooks",
          "status": "LIVE",
          "nb": "15-01_custom_autograd_functions_hooks.ipynb"
        },
        {
          "n": "15-02",
          "slug": "data-pipelines",
          "title": "Advanced Data Pipelines",
          "status": "LIVE",
          "nb": "15-02_advanced_data_pipelines.ipynb"
        },
        {
          "n": "15-03",
          "slug": "nn-module-patterns",
          "title": "Advanced nn.Module Patterns",
          "status": "LIVE",
          "nb": "15-03_advanced_nn_module_patterns.ipynb"
        },
        {
          "n": "15-04",
          "slug": "custom-loss",
          "title": "Custom Loss Functions & Gradient Utilities",
          "status": "LIVE",
          "nb": "15-04_custom_loss_functions_gradient_utilities.ipynb"
        },
        {
          "n": "15-05",
          "slug": "torchscript",
          "title": "TorchScript & JIT Compilation",
          "status": "LIVE",
          "nb": "15-05_torchscript_jit_compilation.ipynb"
        },
        {
          "n": "15-06",
          "slug": "torch-fx",
          "title": "torch.fx Graph Transformations",
          "status": "LIVE",
          "nb": "15-06_torch_fx_graph_transformations.ipynb"
        },
        {
          "n": "15-07",
          "slug": "cuda-memory",
          "title": "CUDA Memory Management",
          "status": "LIVE",
          "nb": "15-07_cuda_memory_management.ipynb"
        },
        {
          "n": "15-08",
          "slug": "distributed-primitives",
          "title": "Distributed Communication Primitives",
          "status": "LIVE",
          "nb": "15-08_distributed_communication_primitives.ipynb"
        },
        {
          "n": "15-09",
          "slug": "debugging-profiling",
          "title": "PyTorch Debugging & Profiling",
          "status": "LIVE",
          "nb": "15-09_pytorch_debugging_profiling.ipynb"
        },
        {
          "n": "15-10",
          "slug": "mini-framework",
          "title": "Mini Training Framework",
          "status": "LIVE",
          "nb": "15-10_mini_training_framework.ipynb"
        }
      ]
    },
    {
      "n": "16",
      "slug": "training-systems",
      "title": "Training Optimization & Distributed Systems",
      "category": "Systems & Engineering",
      "blurb": "Mixed precision, torch.compile, gradient checkpointing, DDP, FSDP, end-to-end optimized training.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "16-01",
          "slug": "mixed-precision",
          "title": "Mixed Precision Training",
          "status": "LIVE",
          "nb": "16-01_mixed_precision_training.ipynb"
        },
        {
          "n": "16-02",
          "slug": "torch-compile",
          "title": "torch.compile — Dynamo & Inductor",
          "status": "LIVE",
          "nb": "16-02_torch_compile_dynamo_inductor.ipynb"
        },
        {
          "n": "16-03",
          "slug": "gradient-checkpointing",
          "title": "Gradient Checkpointing",
          "status": "LIVE",
          "nb": "16-03_gradient_checkpointing.ipynb"
        },
        {
          "n": "16-04",
          "slug": "gradient-accumulation",
          "title": "Gradient Accumulation & Large Batch Training",
          "status": "LIVE",
          "nb": "16-04_gradient_accumulation_large_batch_training.ipynb"
        },
        {
          "n": "16-05",
          "slug": "data-loading-scale",
          "title": "Data Loading at Scale",
          "status": "LIVE",
          "nb": "16-05_data_loading_at_scale.ipynb"
        },
        {
          "n": "16-06",
          "slug": "training-stability",
          "title": "Training Stability & NaN Recovery",
          "status": "LIVE",
          "nb": "16-06_training_stability_nan_recovery.ipynb"
        },
        {
          "n": "16-07",
          "slug": "profiling",
          "title": "Profiling & Bottleneck Analysis",
          "status": "LIVE",
          "nb": "16-07_profiling_bottleneck_analysis.ipynb"
        },
        {
          "n": "16-08",
          "slug": "ddp",
          "title": "Distributed Data Parallel (DDP)",
          "status": "LIVE",
          "nb": "16-08_distributed_data_parallel_ddp.ipynb"
        },
        {
          "n": "16-09",
          "slug": "fsdp",
          "title": "FSDP, ZeRO & Model Parallelism",
          "status": "LIVE",
          "nb": "16-09_fsdp_zero_sharding.ipynb"
        },
        {
          "n": "16-10",
          "slug": "optimized-pipeline",
          "title": "End-to-End Optimized Training Pipeline",
          "status": "LIVE",
          "nb": "16-10_end_to_end_optimized_training_pipeline.ipynb"
        }
      ]
    },
    {
      "n": "17",
      "slug": "llm-systems",
      "title": "Large Language Models: Systems & Scaling",
      "category": "LLMs & Agents",
      "blurb": "LLM architectures, scaling laws, MoE, quantization, efficient inference, long context, structured output, evaluation.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "17-01",
          "slug": "llm-architectures",
          "title": "LLM Architecture Patterns",
          "status": "LIVE",
          "nb": "17-01_llm_architecture_patterns.ipynb"
        },
        {
          "n": "17-02",
          "slug": "scaling-laws",
          "title": "Scaling Laws & Chinchilla",
          "status": "LIVE",
          "nb": "17-02_scaling_laws_chinchilla.ipynb"
        },
        {
          "n": "17-03",
          "slug": "moe",
          "title": "Mixture of Experts (MoE)",
          "status": "LIVE",
          "nb": "17-03_mixture_of_experts.ipynb"
        },
        {
          "n": "17-04",
          "slug": "llm-data-pipelines",
          "title": "Training Data Pipelines",
          "status": "LIVE",
          "nb": "17-04_training_data_pipelines.ipynb"
        },
        {
          "n": "17-05",
          "slug": "distillation",
          "title": "Knowledge Distillation",
          "status": "LIVE",
          "nb": "17-05_knowledge_distillation.ipynb"
        },
        {
          "n": "17-06",
          "slug": "quantization",
          "title": "Quantization — PTQ, QAT, GPTQ, AWQ",
          "status": "LIVE",
          "nb": "17-06_quantization_ptq_qat_gptq_awq.ipynb"
        },
        {
          "n": "17-07",
          "slug": "speculative-decoding",
          "title": "Efficient Inference & Speculative Decoding",
          "status": "LIVE",
          "nb": "17-07_efficient_inference_speculative_decoding.ipynb"
        },
        {
          "n": "17-08",
          "slug": "long-context",
          "title": "Long Context — RoPE Scaling & Sliding Window",
          "status": "LIVE",
          "nb": "17-08_long_context_rope_scaling_sliding_window.ipynb"
        },
        {
          "n": "17-09",
          "slug": "structured-output",
          "title": "Structured Output & Function Calling",
          "status": "LIVE",
          "nb": "17-09_structured_output_function_calling.ipynb"
        },
        {
          "n": "17-10",
          "slug": "llm-eval",
          "title": "LLM Evaluation & Benchmarks",
          "status": "LIVE",
          "nb": "17-10_llm_evaluation_benchmarks.ipynb"
        }
      ]
    },
    {
      "n": "18",
      "slug": "rag-agents",
      "title": "RAG & Agentic AI Systems",
      "category": "LLMs & Agents",
      "blurb": "Embeddings, retrieval, RAG pipelines, agent loops, multi-agent orchestration, voice agents, guardrails.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "18-01",
          "slug": "embeddings-vector-stores",
          "title": "Embeddings & Vector Stores",
          "status": "LIVE",
          "nb": "18-01_embeddings_vector_stores.ipynb"
        },
        {
          "n": "18-02",
          "slug": "chunking-retrieval",
          "title": "Chunking, BM25 & Dense Retrieval",
          "status": "LIVE",
          "nb": "18-02_chunking_bm25_dense_retrieval.ipynb"
        },
        {
          "n": "18-03",
          "slug": "advanced-rag",
          "title": "Advanced RAG — HyDE & Reranking",
          "status": "LIVE",
          "nb": "18-03_advanced_rag_hyde_reranking.ipynb"
        },
        {
          "n": "18-04",
          "slug": "rag-pipeline",
          "title": "RAG Pipeline End-to-End",
          "status": "LIVE",
          "nb": "18-04_rag_pipeline_end_to_end.ipynb"
        },
        {
          "n": "18-05",
          "slug": "rag-eval",
          "title": "RAG Evaluation Metrics",
          "status": "LIVE",
          "nb": "18-05_rag_evaluation_metrics.ipynb"
        },
        {
          "n": "18-06",
          "slug": "agent-loops",
          "title": "Agent Loops, Tool Use & Planning",
          "status": "LIVE",
          "nb": "18-06_agent_loops_tool_use_planning.ipynb"
        },
        {
          "n": "18-07",
          "slug": "multi-agent",
          "title": "Multi-Agent Orchestration",
          "status": "LIVE",
          "nb": "18-07_multi_agent_orchestration.ipynb"
        },
        {
          "n": "18-08",
          "slug": "voice-agents",
          "title": "Voice Agents — STT→LLM→TTS",
          "status": "LIVE",
          "nb": "18-08_voice_agents_stt_llm_tts.ipynb"
        },
        {
          "n": "18-09",
          "slug": "guardrails",
          "title": "Guardrails & Agent Evaluation",
          "status": "LIVE",
          "nb": "18-09_guardrails_agent_evaluation.ipynb"
        },
        {
          "n": "18-10",
          "slug": "capstone-assistant",
          "title": "Domain-Specific AI Assistant (Capstone)",
          "status": "LIVE",
          "nb": "18-10_domain_specific_ai_assistant_capstone.ipynb"
        }
      ]
    },
    {
      "n": "19",
      "slug": "ml-applications",
      "title": "ML Applications & Domain Problems",
      "category": "Applications",
      "blurb": "Recommenders, time series, search ranking, explainability, GNNs, audio classification, tabular deep learning.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "19-01",
          "slug": "recommenders-cf",
          "title": "Recommender Systems — Collaborative Filtering",
          "status": "LIVE",
          "nb": "19-01_recommender_systems_collaborative_filtering.ipynb"
        },
        {
          "n": "19-02",
          "slug": "neural-recommenders",
          "title": "Neural Recommenders & Two-Tower Architecture",
          "status": "LIVE",
          "nb": "19-02_neural_recommenders_two_tower.ipynb"
        },
        {
          "n": "19-03",
          "slug": "time-series",
          "title": "Time Series Forecasting",
          "status": "LIVE",
          "nb": "19-03_time_series_forecasting.ipynb"
        },
        {
          "n": "19-04",
          "slug": "search-ranking",
          "title": "Search & Ranking Systems",
          "status": "LIVE",
          "nb": "19-04_search_ranking_systems.ipynb"
        },
        {
          "n": "19-05",
          "slug": "shap",
          "title": "SHAP & Model-Agnostic Explainability",
          "status": "LIVE",
          "nb": "19-05_shap_model_agnostic_explainability.ipynb"
        },
        {
          "n": "19-06",
          "slug": "gnn",
          "title": "Graph Neural Networks",
          "status": "LIVE",
          "nb": "19-06_graph_neural_networks.ipynb"
        },
        {
          "n": "19-07",
          "slug": "audio-classification",
          "title": "Audio Classification",
          "status": "LIVE",
          "nb": "19-07_audio_classification.ipynb"
        },
        {
          "n": "19-08",
          "slug": "semi-supervised",
          "title": "Semi-Supervised Learning",
          "status": "LIVE",
          "nb": "19-08_semi_supervised_learning.ipynb"
        },
        {
          "n": "19-09",
          "slug": "multi-task",
          "title": "Multi-Task & Multi-Output Learning",
          "status": "LIVE",
          "nb": "19-09_multi_task_multi_output_learning.ipynb"
        },
        {
          "n": "19-10",
          "slug": "tabular-dl",
          "title": "Tabular Deep Learning",
          "status": "LIVE",
          "nb": "19-10_tabular_deep_learning.ipynb"
        }
      ]
    },
    {
      "n": "20",
      "slug": "mlops",
      "title": "MLOps & Production Deployment",
      "category": "MLOps & Production",
      "blurb": "ML strategy, experiment tracking, model export, serving, Docker, monitoring, CI/CD, testing, system design.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "20-01",
          "slug": "ml-strategy",
          "title": "ML Strategy & Error Analysis",
          "status": "LIVE",
          "nb": "20-01_ml_strategy_error_analysis.ipynb"
        },
        {
          "n": "20-02",
          "slug": "mlflow",
          "title": "Experiment Tracking with MLflow",
          "status": "LIVE",
          "nb": "20-02_mlflow_experiment_tracking.ipynb"
        },
        {
          "n": "20-03",
          "slug": "torchscript-onnx",
          "title": "Model Export — TorchScript & ONNX",
          "status": "LIVE",
          "nb": "20-03_model_export_torchscript_onnx.ipynb"
        },
        {
          "n": "20-04",
          "slug": "model-serving",
          "title": "Model Serving — FastAPI & Gradio",
          "status": "LIVE",
          "nb": "20-04_model_serving_fastapi_gradio.ipynb"
        },
        {
          "n": "20-05",
          "slug": "docker",
          "title": "Docker Containerization",
          "status": "LIVE",
          "nb": "20-05_docker_containerization.ipynb"
        },
        {
          "n": "20-06",
          "slug": "monitoring",
          "title": "Data Drift & Model Monitoring",
          "status": "LIVE",
          "nb": "20-06_data_drift_model_monitoring.ipynb"
        },
        {
          "n": "20-07",
          "slug": "cicd",
          "title": "CI/CD for ML",
          "status": "LIVE",
          "nb": "20-07_cicd_for_ml.ipynb"
        },
        {
          "n": "20-08",
          "slug": "testing",
          "title": "ML Testing & Data Validation",
          "status": "LIVE",
          "nb": "20-08_ml_testing_data_validation.ipynb"
        },
        {
          "n": "20-09",
          "slug": "project-structure",
          "title": "ML Project Structure & Best Practices",
          "status": "LIVE",
          "nb": "20-09_ml_project_structure.ipynb"
        },
        {
          "n": "20-10",
          "slug": "system-design",
          "title": "ML System Design Patterns",
          "status": "LIVE",
          "nb": "20-10_ml_system_design_patterns.ipynb"
        }
      ]
    },
    {
      "n": "21",
      "slug": "agentic-ai",
      "title": "Agentic AI Systems & MCP",
      "category": "LLMs & Agents",
      "blurb": "Build production agents from first principles: the agent loop, tool calling, MCP servers, planning, memory, multi-agent orchestration, evaluation, and guardrails.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "21-01",
          "slug": "agent-loop",
          "title": "The Agent Loop: Perceive, Reason, Act",
          "status": "LIVE",
          "nb": "21-01_agent_loop.ipynb"
        },
        {
          "n": "21-02",
          "slug": "tool-calling",
          "title": "Tool Calling & Function Calling",
          "status": "LIVE",
          "nb": "21-02_tool_calling.ipynb"
        },
        {
          "n": "21-03",
          "slug": "mcp",
          "title": "MCP: Protocol, Clients & Servers",
          "status": "LIVE",
          "nb": "21-03_mcp.ipynb"
        },
        {
          "n": "21-04",
          "slug": "react-planning",
          "title": "ReAct, Planning & Task Decomposition",
          "status": "LIVE",
          "nb": "21-04_react_planning.ipynb"
        },
        {
          "n": "21-05",
          "slug": "agent-memory",
          "title": "Agent Memory & Context Management",
          "status": "LIVE",
          "nb": "21-05_agent_memory.ipynb"
        },
        {
          "n": "21-06",
          "slug": "multi-agent",
          "title": "Multi-Agent Orchestration",
          "status": "LIVE",
          "nb": "21-06_multi_agent.ipynb"
        },
        {
          "n": "21-07",
          "slug": "agent-evaluation",
          "title": "Agent Evaluation: Tasks & Trajectories",
          "status": "LIVE",
          "nb": "21-07_agent_evaluation.ipynb"
        },
        {
          "n": "21-08",
          "slug": "observability",
          "title": "Observability, Tracing & Cost Control",
          "status": "LIVE",
          "nb": "21-08_observability.ipynb"
        },
        {
          "n": "21-09",
          "slug": "agent-security",
          "title": "Guardrails & Agent Security",
          "status": "LIVE",
          "nb": "21-09_agent_security.ipynb"
        },
        {
          "n": "21-10",
          "slug": "agent-capstone",
          "title": "Capstone: Build a Production Agent",
          "status": "LIVE",
          "nb": "21-10_agent_capstone.ipynb"
        }
      ]
    },
    {
      "n": "22",
      "slug": "frontier-frameworks",
      "title": "Frontier Models & Modern Frameworks",
      "category": "Systems & Engineering",
      "blurb": "The modern toolchain beyond PyTorch: JAX/Flax, vLLM, torch.compile & Triton, ONNX, provider APIs, fine-tuning stacks, eval harnesses — taught principle-first so it dates slowly.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "22-01",
          "slug": "jax-fundamentals",
          "title": "JAX & Functional ML: jit, grad, vmap",
          "status": "LIVE",
          "nb": "22-01_jax_fundamentals.ipynb"
        },
        {
          "n": "22-02",
          "slug": "flax-optax",
          "title": "Training in JAX with Flax & Optax",
          "status": "LIVE",
          "nb": "22-02_flax_optax.ipynb"
        },
        {
          "n": "22-03",
          "slug": "open-weight-models",
          "title": "The Open-Weight Model Landscape",
          "status": "LIVE",
          "nb": "22-03_open_weight_models.ipynb"
        },
        {
          "n": "22-04",
          "slug": "vllm-inference",
          "title": "Inference Engines: vLLM & Paged Attention",
          "status": "LIVE",
          "nb": "22-04_vllm_paged_attention.ipynb"
        },
        {
          "n": "22-05",
          "slug": "torch-compile-triton",
          "title": "torch.compile & GPU Kernels with Triton",
          "status": "LIVE",
          "nb": "22-05_torch_compile_triton.ipynb"
        },
        {
          "n": "22-06",
          "slug": "onnx-export",
          "title": "Model Export: ONNX & Quantized Runtimes",
          "status": "LIVE",
          "nb": "22-06_onnx_export.ipynb"
        },
        {
          "n": "22-07",
          "slug": "provider-apis",
          "title": "Provider APIs in Production",
          "status": "LIVE",
          "nb": "22-07_provider_apis.ipynb"
        },
        {
          "n": "22-08",
          "slug": "finetuning-stacks",
          "title": "Modern Fine-Tuning Stacks",
          "status": "LIVE",
          "nb": "22-08_lora_qlora.ipynb"
        },
        {
          "n": "22-09",
          "slug": "eval-harnesses",
          "title": "Evaluation Harnesses & Custom Evals",
          "status": "LIVE",
          "nb": "22-09_eval_harnesses.ipynb"
        },
        {
          "n": "22-10",
          "slug": "staying-current",
          "title": "Staying Current: Releases, Benchmarks & Changelogs",
          "status": "LIVE",
          "nb": "22-10_staying_current.ipynb"
        }
      ]
    },
    {
      "n": "23",
      "slug": "causal-inference",
      "title": "Causal Inference & Advanced Statistics",
      "category": "Classical ML",
      "blurb": "From correlation to causation: potential outcomes, causal graphs, confounding, instrumental variables, A/B testing at scale, resampling, and the Bayesian workflow.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "23-01",
          "slug": "potential-outcomes",
          "title": "Potential Outcomes & Treatment Effects",
          "status": "LIVE",
          "nb": "23-01_potential_outcomes.ipynb"
        },
        {
          "n": "23-02",
          "slug": "causal-graphs",
          "title": "Causal Graphs & do-Calculus",
          "status": "LIVE",
          "nb": "23-02_causal_graphs.ipynb"
        },
        {
          "n": "23-03",
          "slug": "confounding",
          "title": "Confounding & Simpson's Paradox",
          "status": "LIVE",
          "nb": "23-03_confounding_simpson.ipynb"
        },
        {
          "n": "23-04",
          "slug": "instrumental-variables",
          "title": "Instrumental Variables",
          "status": "LIVE",
          "nb": "23-04_instrumental_variables.ipynb"
        },
        {
          "n": "23-05",
          "slug": "propensity-matching",
          "title": "Propensity Scores & Matching",
          "status": "LIVE",
          "nb": "23-05_propensity_matching.ipynb"
        },
        {
          "n": "23-06",
          "slug": "uplift-modeling",
          "title": "Uplift Modeling",
          "status": "LIVE",
          "nb": "23-06_uplift_modeling.ipynb"
        },
        {
          "n": "23-07",
          "slug": "ab-testing",
          "title": "A/B Testing & Experimentation at Scale",
          "status": "LIVE",
          "nb": "23-07_ab_testing.ipynb"
        },
        {
          "n": "23-08",
          "slug": "resampling",
          "title": "Bootstrap, Permutation & Resampling",
          "status": "LIVE",
          "nb": "23-08_resampling.ipynb"
        },
        {
          "n": "23-09",
          "slug": "bayesian-workflow",
          "title": "The Bayesian Workflow",
          "status": "LIVE",
          "nb": "23-09_bayesian_workflow.ipynb"
        },
        {
          "n": "23-10",
          "slug": "time-series-causality",
          "title": "Time-Series Causality & Synthetic Control",
          "status": "LIVE",
          "nb": "23-10_synthetic_control.ipynb"
        }
      ]
    },
    {
      "n": "24",
      "slug": "trustworthy-ai",
      "title": "Trustworthy, Safe & Interpretable AI",
      "category": "Trustworthy AI",
      "blurb": "Make models you can trust: calibration, conformal prediction, fairness, attribution, mechanistic interpretability, adversarial robustness, drift, red-teaming, and alignment.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "24-01",
          "slug": "calibration",
          "title": "Calibration & Temperature Scaling",
          "status": "LIVE",
          "nb": "24-01_calibration.ipynb"
        },
        {
          "n": "24-02",
          "slug": "conformal-prediction",
          "title": "Conformal Prediction",
          "status": "LIVE",
          "nb": "24-02_conformal_prediction.ipynb"
        },
        {
          "n": "24-03",
          "slug": "fairness",
          "title": "Fairness Metrics & Trade-offs",
          "status": "LIVE",
          "nb": "24-03_fairness.ipynb"
        },
        {
          "n": "24-04",
          "slug": "attribution",
          "title": "Attribution: SHAP, Saliency & Attention Rollout",
          "status": "LIVE",
          "nb": "24-04_attribution.ipynb"
        },
        {
          "n": "24-05",
          "slug": "superposition-sae",
          "title": "Mechanistic Interpretability I: Superposition & SAEs",
          "status": "LIVE",
          "nb": "24-05_superposition_sae.ipynb"
        },
        {
          "n": "24-06",
          "slug": "probing-patching",
          "title": "Mechanistic Interpretability II: Probing & Activation Patching",
          "status": "LIVE",
          "nb": "24-06_probing_patching.ipynb"
        },
        {
          "n": "24-07",
          "slug": "adversarial-robustness",
          "title": "Adversarial Robustness & Certified Defenses",
          "status": "LIVE",
          "nb": "24-07_adversarial.ipynb"
        },
        {
          "n": "24-08",
          "slug": "distribution-shift",
          "title": "Distribution Shift & Drift Detection",
          "status": "LIVE",
          "nb": "24-08_drift_detection.ipynb"
        },
        {
          "n": "24-09",
          "slug": "red-teaming",
          "title": "Red-Teaming & Model Auditing",
          "status": "LIVE",
          "nb": "24-09_red_teaming.ipynb"
        },
        {
          "n": "24-10",
          "slug": "alignment-governance",
          "title": "Alignment & Governance Overview",
          "status": "LIVE",
          "nb": "24-10_alignment_governance.ipynb"
        }
      ]
    },
    {
      "n": "25",
      "slug": "interview-capstone",
      "title": "ML Interview & System Design Capstone",
      "category": "Career & Applications",
      "blurb": "Turn the whole curriculum into interview readiness: ML system design cases, coding patterns, classical CS algorithms, rapid-fire breadth, deep derivations, and a portfolio capstone.",
      "status": "LIVE",
      "lessons": [
        {
          "n": "25-01",
          "slug": "interview-landscape",
          "title": "The ML Interview Landscape & Strategy",
          "status": "LIVE",
          "nb": "25-01_interview_strategy.ipynb"
        },
        {
          "n": "25-02",
          "slug": "system-design-framework",
          "title": "ML System Design Framework",
          "status": "LIVE",
          "nb": "25-02_system_design_framework.ipynb"
        },
        {
          "n": "25-03",
          "slug": "design-recommender",
          "title": "Design Case: Recommender & Feed",
          "status": "LIVE",
          "nb": "25-03_design_recommender.ipynb"
        },
        {
          "n": "25-04",
          "slug": "design-search-ads",
          "title": "Design Case: Search & Ads",
          "status": "LIVE",
          "nb": "25-04_design_search_ads.ipynb"
        },
        {
          "n": "25-05",
          "slug": "design-fraud-llm",
          "title": "Design Case: Fraud Detection & LLM Products",
          "status": "LIVE",
          "nb": "25-05_design_fraud_llm.ipynb"
        },
        {
          "n": "25-06",
          "slug": "coding-patterns",
          "title": "Coding Patterns for ML Interviews",
          "status": "LIVE",
          "nb": "25-06_coding_patterns.ipynb"
        },
        {
          "n": "25-07",
          "slug": "cs-algorithms",
          "title": "Classical CS Algorithms Review",
          "status": "LIVE",
          "nb": "25-07_cs_algorithms.ipynb"
        },
        {
          "n": "25-08",
          "slug": "breadth-rapid-fire",
          "title": "ML Breadth Rapid-Fire",
          "status": "LIVE",
          "nb": "25-08_breadth_rapid_fire.ipynb"
        },
        {
          "n": "25-09",
          "slug": "derivations",
          "title": "Deep-Dive Derivations",
          "status": "LIVE",
          "nb": "25-09_derivations.ipynb"
        },
        {
          "n": "25-10",
          "slug": "portfolio-capstone",
          "title": "Take-Homes, Storytelling & Portfolio Capstone",
          "status": "LIVE",
          "nb": "25-10_portfolio_capstone.ipynb"
        }
      ]
    }
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
    // B4: per-lesson deep link when the module's GitHub folder has been synced to
    // the canonical filenames (nbSync, from the store's notebooksSynced) AND the
    // lesson carries its filename (nb). Otherwise fall back to the module folder,
    // which always resolves once the drip creates it (the pre-B4 behavior).
    const m = this.findModule(moduleSlug);
    if (!m) return this.repo;
    const l = lessonSlug ? m.lessons.find(x => x.slug === lessonSlug) : null;
    if (m.nbSync && l && l.nb) return `${this.repo}/blob/main/modules/module_${m.n}/${l.nb}`;
    return `${this.repo}/tree/main/modules/module_${m.n}`;
  },
  colabUrl(moduleSlug, lessonSlug) {
    return this.notebookUrl(moduleSlug, lessonSlug)
      .replace("github.com", "colab.research.google.com/github")
      .replace("/blob/main/", "/blob/main/");
  },
};

// ── window.CURRICULUM_V2 — the notebooks' 26-module / 282-slot curriculum ──
// The structure the course is being rebuilt to. Consumed by learn-app.jsx to
// render the syllabus; every lesson links to the page it lives on TODAY, so no
// route here is new. `href: null` means the notebooks declare the slot and the
// site has not written it — 32 of 282.
// GENERATED from content/migrations/v1-to-v2.json — re-run sync-v2-map.mjs.
window.CURRICULUM_V2 = {
  modules: [
    {
      "n": "01",
      "slug": "math-foundations",
      "title": "Mathematical foundations",
      "track": "I",
      "trackName": "Foundations",
      "wasSlug": "foundations",
      "lessons": [
        {
          "n": "01-01",
          "title": "Linear algebra I: vectors, matrices, geometry",
          "kind": "split",
          "href": "learn/foundations/linear-algebra/",
          "on": "foundations/linear-algebra",
          "more": []
        },
        {
          "n": "01-02",
          "title": "Linear algebra II: eigendecomposition, SVD, low rank",
          "kind": "split",
          "href": "learn/foundations/linear-algebra/",
          "on": "foundations/linear-algebra",
          "more": []
        },
        {
          "n": "01-03",
          "title": "Calculus and vector calculus for ML",
          "kind": "split",
          "href": "learn/foundations/calculus/",
          "on": "foundations/calculus",
          "more": []
        },
        {
          "n": "01-04",
          "title": "Numerical optimization: gradient descent to Newton",
          "kind": "split",
          "href": "learn/foundations/calculus/",
          "on": "foundations/calculus",
          "more": []
        },
        {
          "n": "01-05",
          "title": "Probability and random variables",
          "kind": "split",
          "href": "learn/foundations/probability/",
          "on": "foundations/probability",
          "more": []
        },
        {
          "n": "01-06",
          "title": "Statistical estimation: MLE, MAP, Bayes",
          "kind": "split",
          "href": "learn/foundations/probability/",
          "on": "foundations/probability",
          "more": []
        },
        {
          "n": "01-07",
          "title": "Information theory for ML",
          "kind": "clean",
          "href": "learn/foundations/information-theory/",
          "on": "foundations/information-theory",
          "more": []
        },
        {
          "n": "01-08",
          "title": "Convex optimization and duality",
          "kind": "clean",
          "href": "learn/ml-theory/convex-optimization/",
          "on": "ml-theory/convex-optimization",
          "more": []
        },
        {
          "n": "01-09",
          "title": "Matrix calculus and the softmax Jacobian",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "01-10",
          "title": "Complexity, floating point, and numerical stability",
          "kind": "split",
          "href": "learn/foundations/complexity/",
          "on": "foundations/complexity",
          "more": []
        }
      ]
    },
    {
      "n": "02",
      "slug": "python-toolchain",
      "title": "Scientific Python and the ML toolchain",
      "track": "I",
      "trackName": "Foundations",
      "wasSlug": "foundations",
      "lessons": [
        {
          "n": "02-01",
          "title": "NumPy and tensor mechanics",
          "kind": "clean",
          "href": "learn/foundations/python-numpy-tensor-speed/",
          "on": "foundations/python-numpy-tensor-speed",
          "more": []
        },
        {
          "n": "02-02",
          "title": "Broadcasting, einsum, and vectorization",
          "kind": "split",
          "href": "learn/foundations/advanced-numpy-pytorch/",
          "on": "foundations/advanced-numpy-pytorch",
          "more": []
        },
        {
          "n": "02-03",
          "title": "Pandas for tabular data",
          "kind": "clean",
          "href": "learn/foundations/pandas/",
          "on": "foundations/pandas",
          "more": []
        },
        {
          "n": "02-04",
          "title": "Visualization for machine learning",
          "kind": "clean",
          "href": "learn/foundations/matplotlib/",
          "on": "foundations/matplotlib",
          "more": []
        },
        {
          "n": "02-05",
          "title": "PyTorch tensors, devices, and dtypes",
          "kind": "split",
          "href": "learn/foundations/advanced-numpy-pytorch/",
          "on": "foundations/advanced-numpy-pytorch",
          "more": []
        },
        {
          "n": "02-06",
          "title": "Datasets, DataLoaders, and collation",
          "kind": "clean",
          "href": "learn/foundations/pytorch-data-loading/",
          "on": "foundations/pytorch-data-loading",
          "more": []
        },
        {
          "n": "02-07",
          "title": "HuggingFace datasets, tokenizers, and the Hub",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "02-08",
          "title": "Reproducibility, seeds, environments, and profiling",
          "kind": "split",
          "href": "learn/foundations/complexity/",
          "on": "foundations/complexity",
          "more": []
        }
      ]
    },
    {
      "n": "03",
      "slug": "supervised-learning",
      "title": "Supervised learning",
      "track": "II",
      "trackName": "Classical ML, evaluation and causality",
      "wasSlug": "supervised-learning",
      "lessons": [
        {
          "n": "03-01",
          "title": "Linear regression and regularization",
          "kind": "clean",
          "href": "learn/supervised-learning/linear-regression/",
          "on": "supervised-learning/linear-regression",
          "more": []
        },
        {
          "n": "03-02",
          "title": "Logistic regression",
          "kind": "clean",
          "href": "learn/supervised-learning/logistic-regression/",
          "on": "supervised-learning/logistic-regression",
          "more": []
        },
        {
          "n": "03-03",
          "title": "Generalized linear models and the exponential family",
          "kind": "clean",
          "href": "learn/supervised-learning/glm/",
          "on": "supervised-learning/glm",
          "more": []
        },
        {
          "n": "03-04",
          "title": "k-nearest neighbours and distance metrics",
          "kind": "clean",
          "href": "learn/supervised-learning/knn/",
          "on": "supervised-learning/knn",
          "more": []
        },
        {
          "n": "03-05",
          "title": "Naive Bayes and text classification",
          "kind": "clean",
          "href": "learn/supervised-learning/naive-bayes/",
          "on": "supervised-learning/naive-bayes",
          "more": []
        },
        {
          "n": "03-06",
          "title": "Support vector machines",
          "kind": "clean",
          "href": "learn/supervised-learning/svm/",
          "on": "supervised-learning/svm",
          "more": []
        },
        {
          "n": "03-07",
          "title": "Kernel methods and feature maps",
          "kind": "clean",
          "href": "learn/unsupervised-learning/kernel-methods/",
          "on": "unsupervised-learning/kernel-methods",
          "more": []
        },
        {
          "n": "03-08",
          "title": "Decision trees and CART",
          "kind": "split",
          "href": "learn/supervised-learning/trees-forests/",
          "on": "supervised-learning/trees-forests",
          "more": []
        },
        {
          "n": "03-09",
          "title": "Bagging and random forests",
          "kind": "split",
          "href": "learn/supervised-learning/trees-forests/",
          "on": "supervised-learning/trees-forests",
          "more": []
        },
        {
          "n": "03-10",
          "title": "Boosting: AdaBoost, gradient boosting, XGBoost",
          "kind": "clean",
          "href": "learn/supervised-learning/boosting/",
          "on": "supervised-learning/boosting",
          "more": []
        },
        {
          "n": "03-11",
          "title": "Stacking and voting ensembles",
          "kind": "clean",
          "href": "learn/supervised-learning/ensembles/",
          "on": "supervised-learning/ensembles",
          "more": []
        },
        {
          "n": "03-12",
          "title": "Algorithm selection under a fixed protocol",
          "kind": "clean",
          "href": "learn/supervised-learning/model-comparison/",
          "on": "supervised-learning/model-comparison",
          "more": []
        }
      ]
    },
    {
      "n": "04",
      "slug": "unsupervised-learning",
      "title": "Unsupervised and representation learning",
      "track": "II",
      "trackName": "Classical ML, evaluation and causality",
      "wasSlug": "unsupervised-learning",
      "lessons": [
        {
          "n": "04-01",
          "title": "k-means clustering",
          "kind": "clean",
          "href": "learn/unsupervised-learning/kmeans/",
          "on": "unsupervised-learning/kmeans",
          "more": []
        },
        {
          "n": "04-02",
          "title": "Hierarchical and density-based clustering",
          "kind": "clean",
          "href": "learn/unsupervised-learning/hierarchical-density-clustering/",
          "on": "unsupervised-learning/hierarchical-density-clustering",
          "more": []
        },
        {
          "n": "04-03",
          "title": "Gaussian mixtures and EM",
          "kind": "clean",
          "href": "learn/unsupervised-learning/gmm-em/",
          "on": "unsupervised-learning/gmm-em",
          "more": []
        },
        {
          "n": "04-04",
          "title": "Principal component analysis",
          "kind": "clean",
          "href": "learn/unsupervised-learning/pca/",
          "on": "unsupervised-learning/pca",
          "more": []
        },
        {
          "n": "04-05",
          "title": "t-SNE, UMAP, and manifold learning",
          "kind": "clean",
          "href": "learn/unsupervised-learning/tsne-umap/",
          "on": "unsupervised-learning/tsne-umap",
          "more": []
        },
        {
          "n": "04-06",
          "title": "Independent component analysis",
          "kind": "clean",
          "href": "learn/unsupervised-learning/ica/",
          "on": "unsupervised-learning/ica",
          "more": []
        },
        {
          "n": "04-07",
          "title": "Matrix factorization and NMF",
          "kind": "clean",
          "href": "learn/unsupervised-learning/matrix-factorization/",
          "on": "unsupervised-learning/matrix-factorization",
          "more": []
        },
        {
          "n": "04-08",
          "title": "Anomaly detection",
          "kind": "clean",
          "href": "learn/unsupervised-learning/anomaly-detection/",
          "on": "unsupervised-learning/anomaly-detection",
          "more": []
        },
        {
          "n": "04-09",
          "title": "Bayesian inference and probabilistic modelling",
          "kind": "clean",
          "href": "learn/unsupervised-learning/bayesian-inference/",
          "on": "unsupervised-learning/bayesian-inference",
          "more": []
        },
        {
          "n": "04-10",
          "title": "Gaussian processes and Bayesian optimization",
          "kind": "clean",
          "href": "learn/ml-theory/gaussian-processes/",
          "on": "ml-theory/gaussian-processes",
          "more": []
        }
      ]
    },
    {
      "n": "05",
      "slug": "evaluation",
      "title": "Evaluation, validation, and data craft",
      "track": "II",
      "trackName": "Classical ML, evaluation and causality",
      "wasSlug": "ml-theory",
      "lessons": [
        {
          "n": "05-01",
          "title": "Metrics deep dive",
          "kind": "clean",
          "href": "learn/ml-theory/evaluation-metrics/",
          "on": "ml-theory/evaluation-metrics",
          "more": []
        },
        {
          "n": "05-02",
          "title": "Cross-validation and model selection",
          "kind": "split",
          "href": "learn/ml-theory/cross-validation/",
          "on": "ml-theory/cross-validation",
          "more": []
        },
        {
          "n": "05-03",
          "title": "Hyperparameter search",
          "kind": "split",
          "href": "learn/ml-theory/cross-validation/",
          "on": "ml-theory/cross-validation",
          "more": []
        },
        {
          "n": "05-04",
          "title": "Feature engineering and pipelines",
          "kind": "clean",
          "href": "learn/ml-theory/feature-engineering/",
          "on": "ml-theory/feature-engineering",
          "more": []
        },
        {
          "n": "05-05",
          "title": "Imbalanced data and cost-sensitive learning",
          "kind": "clean",
          "href": "learn/ml-theory/imbalanced-data/",
          "on": "ml-theory/imbalanced-data",
          "more": []
        },
        {
          "n": "05-06",
          "title": "Calibration and uncertainty",
          "kind": "clean",
          "href": "learn/ml-theory/calibration/",
          "on": "ml-theory/calibration",
          "more": []
        },
        {
          "n": "05-07",
          "title": "Leakage, splits, and honest evaluation",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "05-08",
          "title": "Data-centric AI: curation, dedup, and quality",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "05-09",
          "title": "Data augmentation and colour spaces",
          "kind": "clean",
          "href": "learn/ml-theory/data-augmentation/",
          "on": "ml-theory/data-augmentation",
          "more": []
        },
        {
          "n": "05-10",
          "title": "Bootstrap, permutation, and significance",
          "kind": "clean",
          "href": "learn/causal-inference/resampling/",
          "on": "causal-inference/resampling",
          "more": []
        }
      ]
    },
    {
      "n": "06",
      "slug": "learning-theory",
      "title": "Learning theory and generalization",
      "track": "II",
      "trackName": "Classical ML, evaluation and causality",
      "wasSlug": "ml-theory",
      "lessons": [
        {
          "n": "06-01",
          "title": "Bias, variance, and double descent",
          "kind": "split",
          "href": "learn/ml-theory/bias-variance/",
          "on": "ml-theory/bias-variance",
          "more": []
        },
        {
          "n": "06-02",
          "title": "VC dimension, shattering, and PAC learning",
          "kind": "clean",
          "href": "learn/ml-theory/learning-theory/",
          "on": "ml-theory/learning-theory",
          "more": []
        },
        {
          "n": "06-03",
          "title": "Rademacher complexity and generalization bounds",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "06-04",
          "title": "Non-convex landscapes: saddles, flat minima, connectivity",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "06-05",
          "title": "Implicit regularization: why SGD generalizes",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "06-06",
          "title": "ML debugging grounded in theory",
          "kind": "split",
          "href": "learn/ml-theory/bias-variance/",
          "on": "ml-theory/bias-variance",
          "more": []
        }
      ]
    },
    {
      "n": "07",
      "slug": "causal-inference",
      "title": "Causal inference and experimentation",
      "track": "II",
      "trackName": "Classical ML, evaluation and causality",
      "wasSlug": "causal-inference",
      "lessons": [
        {
          "n": "07-01",
          "title": "Potential outcomes and treatment effects",
          "kind": "clean",
          "href": "learn/causal-inference/potential-outcomes/",
          "on": "causal-inference/potential-outcomes",
          "more": []
        },
        {
          "n": "07-02",
          "title": "Causal graphs and do-calculus",
          "kind": "clean",
          "href": "learn/causal-inference/causal-graphs/",
          "on": "causal-inference/causal-graphs",
          "more": []
        },
        {
          "n": "07-03",
          "title": "Confounding, colliders, and Simpson's paradox",
          "kind": "clean",
          "href": "learn/causal-inference/confounding/",
          "on": "causal-inference/confounding",
          "more": []
        },
        {
          "n": "07-04",
          "title": "Propensity scores, matching, and IPW",
          "kind": "clean",
          "href": "learn/causal-inference/propensity-matching/",
          "on": "causal-inference/propensity-matching",
          "more": []
        },
        {
          "n": "07-05",
          "title": "Instrumental variables and two-stage least squares",
          "kind": "clean",
          "href": "learn/causal-inference/instrumental-variables/",
          "on": "causal-inference/instrumental-variables",
          "more": []
        },
        {
          "n": "07-06",
          "title": "Difference-in-differences and synthetic control",
          "kind": "clean",
          "href": "learn/causal-inference/time-series-causality/",
          "on": "causal-inference/time-series-causality",
          "more": []
        },
        {
          "n": "07-07",
          "title": "Uplift modelling and CATE",
          "kind": "clean",
          "href": "learn/causal-inference/uplift-modeling/",
          "on": "causal-inference/uplift-modeling",
          "more": []
        },
        {
          "n": "07-08",
          "title": "A/B testing at scale",
          "kind": "clean",
          "href": "learn/causal-inference/ab-testing/",
          "on": "causal-inference/ab-testing",
          "more": []
        },
        {
          "n": "07-09",
          "title": "Selection bias and feedback loops in deployed ML",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "07-10",
          "title": "The Bayesian workflow and MCMC",
          "kind": "clean",
          "href": "learn/causal-inference/bayesian-workflow/",
          "on": "causal-inference/bayesian-workflow",
          "more": []
        }
      ]
    },
    {
      "n": "08",
      "slug": "neural-nets",
      "title": "Neural network foundations",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "neural-nets",
      "lessons": [
        {
          "n": "08-01",
          "title": "A neural network end to end",
          "kind": "clean",
          "href": "learn/neural-nets/nn-walkthrough/",
          "on": "neural-nets/nn-walkthrough",
          "more": []
        },
        {
          "n": "08-02",
          "title": "Perceptron, MLP, and the XOR problem",
          "kind": "clean",
          "href": "learn/neural-nets/perceptron-mlp/",
          "on": "neural-nets/perceptron-mlp",
          "more": []
        },
        {
          "n": "08-03",
          "title": "Activation functions",
          "kind": "clean",
          "href": "learn/neural-nets/activation-functions/",
          "on": "neural-nets/activation-functions",
          "more": []
        },
        {
          "n": "08-04",
          "title": "Loss functions",
          "kind": "clean",
          "href": "learn/neural-nets/loss-functions/",
          "on": "neural-nets/loss-functions",
          "more": []
        },
        {
          "n": "08-05",
          "title": "Forward pass, computational graphs, universal approximation",
          "kind": "clean",
          "href": "learn/neural-nets/forward-pass/",
          "on": "neural-nets/forward-pass",
          "more": []
        },
        {
          "n": "08-06",
          "title": "Weight initialization",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "08-07",
          "title": "Backpropagation from scratch",
          "kind": "clean",
          "href": "learn/neural-nets/backprop/",
          "on": "neural-nets/backprop",
          "more": []
        },
        {
          "n": "08-08",
          "title": "PyTorch autograd and nn.Module",
          "kind": "clean",
          "href": "learn/neural-nets/pytorch-fundamentals/",
          "on": "neural-nets/pytorch-fundamentals",
          "more": []
        },
        {
          "n": "08-09",
          "title": "Optimizers I: SGD, momentum, AdaGrad, RMSProp",
          "kind": "clean",
          "href": "learn/neural-nets/sgd-momentum/",
          "on": "neural-nets/sgd-momentum",
          "more": []
        },
        {
          "n": "08-10",
          "title": "Optimizers II: Adam, AdamW, schedules, Muon",
          "kind": "clean",
          "href": "learn/neural-nets/adam-lr-scheduling/",
          "on": "neural-nets/adam-lr-scheduling",
          "more": []
        },
        {
          "n": "08-11",
          "title": "Normalization: batch, layer, RMS, group",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "08-12",
          "title": "Regularization",
          "kind": "clean",
          "href": "learn/neural-nets/regularization/",
          "on": "neural-nets/regularization",
          "more": []
        }
      ]
    },
    {
      "n": "09",
      "slug": "cnn",
      "title": "Convolutional networks and vision",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "cnn",
      "lessons": [
        {
          "n": "09-01",
          "title": "Why convolution",
          "kind": "clean",
          "href": "learn/cnn/fc-for-images/",
          "on": "cnn/fc-for-images",
          "more": []
        },
        {
          "n": "09-02",
          "title": "Convolution from scratch with im2col",
          "kind": "clean",
          "href": "learn/cnn/convolution/",
          "on": "cnn/convolution",
          "more": []
        },
        {
          "n": "09-03",
          "title": "Pooling and receptive fields",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "09-04",
          "title": "Classic architectures: LeNet, AlexNet, VGG",
          "kind": "merge",
          "href": "learn/cnn/cnn-architectures/",
          "on": "cnn/cnn-architectures",
          "more": [
            {
              "href": "learn/cnn/style-transfer/",
              "on": "cnn/style-transfer",
              "title": "Neural Style Transfer"
            }
          ]
        },
        {
          "n": "09-05",
          "title": "Residual networks",
          "kind": "merge",
          "href": "learn/advanced-cv/cifar100/",
          "on": "advanced-cv/cifar100",
          "more": []
        },
        {
          "n": "09-06",
          "title": "Efficient architectures",
          "kind": "clean",
          "href": "learn/cnn/efficient-cnns/",
          "on": "cnn/efficient-cnns",
          "more": []
        },
        {
          "n": "09-07",
          "title": "Transfer learning with timm",
          "kind": "clean",
          "href": "learn/cnn/transfer-learning/",
          "on": "cnn/transfer-learning",
          "more": []
        },
        {
          "n": "09-08",
          "title": "Encoder-decoder and U-Net",
          "kind": "clean",
          "href": "learn/cnn/unet/",
          "on": "cnn/unet",
          "more": []
        },
        {
          "n": "09-09",
          "title": "Semantic and instance segmentation",
          "kind": "clean",
          "href": "learn/cnn/segmentation/",
          "on": "cnn/segmentation",
          "more": []
        },
        {
          "n": "09-10",
          "title": "Detection fundamentals",
          "kind": "clean",
          "href": "learn/advanced-cv/object-detection/",
          "on": "advanced-cv/object-detection",
          "more": []
        },
        {
          "n": "09-11",
          "title": "Single-stage detection from scratch",
          "kind": "clean",
          "href": "learn/advanced-cv/yolo/",
          "on": "advanced-cv/yolo",
          "more": []
        },
        {
          "n": "09-12",
          "title": "Temporal and volumetric convolution",
          "kind": "merge",
          "href": "learn/cnn/1d-3d-convolutions/",
          "on": "cnn/1d-3d-convolutions",
          "more": [
            {
              "href": "learn/advanced-cv/video/",
              "on": "advanced-cv/video",
              "title": "Video Understanding"
            }
          ]
        },
        {
          "n": "09-13",
          "title": "OCR and document AI",
          "kind": "clean",
          "href": "learn/advanced-cv/ocr/",
          "on": "advanced-cv/ocr",
          "more": []
        }
      ]
    },
    {
      "n": "10",
      "slug": "sequence-models",
      "title": "Sequence models",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "rnn-nlp",
      "lessons": [
        {
          "n": "10-01",
          "title": "Tokenization: BPE, WordPiece, SentencePiece",
          "kind": "clean",
          "href": "learn/rnn-nlp/tokenization/",
          "on": "rnn-nlp/tokenization",
          "more": []
        },
        {
          "n": "10-02",
          "title": "Word vectors: word2vec, GloVe, fastText",
          "kind": "clean",
          "href": "learn/rnn-nlp/word-vectors/",
          "on": "rnn-nlp/word-vectors",
          "more": []
        },
        {
          "n": "10-03",
          "title": "Recurrent networks and backpropagation through time",
          "kind": "clean",
          "href": "learn/rnn-nlp/rnn/",
          "on": "rnn-nlp/rnn",
          "more": []
        },
        {
          "n": "10-04",
          "title": "LSTMs and GRUs",
          "kind": "clean",
          "href": "learn/rnn-nlp/lstm-gru/",
          "on": "rnn-nlp/lstm-gru",
          "more": []
        },
        {
          "n": "10-05",
          "title": "Sequence to sequence with attention",
          "kind": "clean",
          "href": "learn/rnn-nlp/seq2seq-attention/",
          "on": "rnn-nlp/seq2seq-attention",
          "more": []
        },
        {
          "n": "10-06",
          "title": "Language modelling and perplexity",
          "kind": "clean",
          "href": "learn/rnn-nlp/classical-lm/",
          "on": "rnn-nlp/classical-lm",
          "more": []
        },
        {
          "n": "10-07",
          "title": "Decoding strategies",
          "kind": "clean",
          "href": "learn/rnn-nlp/text-generation/",
          "on": "rnn-nlp/text-generation",
          "more": []
        },
        {
          "n": "10-08",
          "title": "Sequence labelling and CRFs",
          "kind": "clean",
          "href": "learn/rnn-nlp/sequence-labeling/",
          "on": "rnn-nlp/sequence-labeling",
          "more": []
        },
        {
          "n": "10-09",
          "title": "Dependency parsing",
          "kind": "clean",
          "href": "learn/rnn-nlp/dependency-parsing/",
          "on": "rnn-nlp/dependency-parsing",
          "more": []
        },
        {
          "n": "10-10",
          "title": "Contextual embeddings: ELMo to transformers",
          "kind": "clean",
          "href": "learn/rnn-nlp/elmo/",
          "on": "rnn-nlp/elmo",
          "more": []
        }
      ]
    },
    {
      "n": "11",
      "slug": "transformers",
      "title": "Transformers",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "transformers",
      "lessons": [
        {
          "n": "11-01",
          "title": "Self-attention",
          "kind": "clean",
          "href": "learn/transformers/self-attention/",
          "on": "transformers/self-attention",
          "more": []
        },
        {
          "n": "11-02",
          "title": "Multi-head attention",
          "kind": "clean",
          "href": "learn/transformers/multi-head-attention/",
          "on": "transformers/multi-head-attention",
          "more": []
        },
        {
          "n": "11-03",
          "title": "Positional encoding",
          "kind": "clean",
          "href": "learn/transformers/positional-encoding/",
          "on": "transformers/positional-encoding",
          "more": []
        },
        {
          "n": "11-04",
          "title": "Rotary position embeddings",
          "kind": "clean",
          "href": "learn/transformers/rope/",
          "on": "transformers/rope",
          "more": []
        },
        {
          "n": "11-05",
          "title": "The transformer block",
          "kind": "clean",
          "href": "learn/transformers/transformer-block/",
          "on": "transformers/transformer-block",
          "more": []
        },
        {
          "n": "11-06",
          "title": "Encoder-decoder transformers",
          "kind": "clean",
          "href": "learn/transformers/full-transformer/",
          "on": "transformers/full-transformer",
          "more": []
        },
        {
          "n": "11-07",
          "title": "Modern blocks: RMSNorm, SwiGLU, Llama-style",
          "kind": "clean",
          "href": "learn/transformers/modern-blocks/",
          "on": "transformers/modern-blocks",
          "more": []
        },
        {
          "n": "11-08",
          "title": "Attention variants: MQA, GQA, sliding window",
          "kind": "clean",
          "href": "learn/transformers/gqa-mqa/",
          "on": "transformers/gqa-mqa",
          "more": []
        },
        {
          "n": "11-09",
          "title": "Flash attention",
          "kind": "clean",
          "href": "learn/transformers/flash-attention/",
          "on": "transformers/flash-attention",
          "more": []
        },
        {
          "n": "11-10",
          "title": "KV cache and autoregressive inference",
          "kind": "clean",
          "href": "learn/transformers/kv-cache/",
          "on": "transformers/kv-cache",
          "more": []
        },
        {
          "n": "11-11",
          "title": "Linear and sub-quadratic attention",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "11-12",
          "title": "State-space models: S4, Mamba, the selective scan",
          "kind": "split",
          "href": "learn/advanced-nlp/interpretability/",
          "on": "advanced-nlp/interpretability",
          "more": []
        }
      ]
    },
    {
      "n": "12",
      "slug": "generative",
      "title": "Generative modeling",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "generative",
      "lessons": [
        {
          "n": "12-01",
          "title": "Autoencoders",
          "kind": "clean",
          "href": "learn/generative/autoencoders/",
          "on": "generative/autoencoders",
          "more": []
        },
        {
          "n": "12-02",
          "title": "Variational autoencoders and the ELBO",
          "kind": "clean",
          "href": "learn/generative/vae/",
          "on": "generative/vae",
          "more": []
        },
        {
          "n": "12-03",
          "title": "GANs and the min-max game",
          "kind": "split",
          "href": "learn/generative/gan/",
          "on": "generative/gan",
          "more": []
        },
        {
          "n": "12-04",
          "title": "WGAN-GP and conditional generation",
          "kind": "merge",
          "href": "learn/generative/gan/",
          "on": "generative/gan",
          "more": [
            {
              "href": "learn/generative/conditional-generation/",
              "on": "generative/conditional-generation",
              "title": "Conditional Generation"
            }
          ]
        },
        {
          "n": "12-05",
          "title": "Autoregressive generative models",
          "kind": "clean",
          "href": "learn/generative/ar-generative/",
          "on": "generative/ar-generative",
          "more": []
        },
        {
          "n": "12-06",
          "title": "Normalizing flows",
          "kind": "split",
          "href": "learn/generative/flows/",
          "on": "generative/flows",
          "more": []
        },
        {
          "n": "12-07",
          "title": "Energy-based models and score matching",
          "kind": "clean",
          "href": "learn/generative/ebm-score/",
          "on": "generative/ebm-score",
          "more": []
        },
        {
          "n": "12-08",
          "title": "DDPM from scratch",
          "kind": "clean",
          "href": "learn/generative/ddpm/",
          "on": "generative/ddpm",
          "more": []
        },
        {
          "n": "12-09",
          "title": "Sampling and guidance: DDIM and classifier-free guidance",
          "kind": "clean",
          "href": "learn/generative/diffusion-guidance/",
          "on": "generative/diffusion-guidance",
          "more": []
        },
        {
          "n": "12-10",
          "title": "Latent diffusion and diffusion transformers",
          "kind": "clean",
          "href": "learn/generative/latent-diffusion/",
          "on": "generative/latent-diffusion",
          "more": []
        },
        {
          "n": "12-11",
          "title": "Flow matching, rectified flow, consistency models",
          "kind": "split",
          "href": "learn/generative/flows/",
          "on": "generative/flows",
          "more": []
        },
        {
          "n": "12-12",
          "title": "Generative evaluation and why FID lies",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        }
      ]
    },
    {
      "n": "13",
      "slug": "multimodal",
      "title": "Multimodal, self-supervised, and vision transformers",
      "track": "III",
      "trackName": "Deep learning core",
      "wasSlug": "multimodal",
      "lessons": [
        {
          "n": "13-01",
          "title": "Vision transformers",
          "kind": "clean",
          "href": "learn/advanced-cv/vit/",
          "on": "advanced-cv/vit",
          "more": []
        },
        {
          "n": "13-02",
          "title": "Metric learning: Siamese networks and triplet loss",
          "kind": "clean",
          "href": "learn/multimodal/siamese/",
          "on": "multimodal/siamese",
          "more": []
        },
        {
          "n": "13-03",
          "title": "Contrastive self-supervision: SimCLR and BYOL",
          "kind": "clean",
          "href": "learn/multimodal/simclr-byol/",
          "on": "multimodal/simclr-byol",
          "more": []
        },
        {
          "n": "13-04",
          "title": "Self-supervised vision: DINO and MAE",
          "kind": "clean",
          "href": "learn/advanced-cv/dino-mae/",
          "on": "advanced-cv/dino-mae",
          "more": []
        },
        {
          "n": "13-05",
          "title": "CLIP",
          "kind": "clean",
          "href": "learn/multimodal/clip/",
          "on": "multimodal/clip",
          "more": []
        },
        {
          "n": "13-06",
          "title": "Zero-shot and few-shot transfer",
          "kind": "clean",
          "href": "learn/multimodal/zero-shot/",
          "on": "multimodal/zero-shot",
          "more": []
        },
        {
          "n": "13-07",
          "title": "Vision-language models and captioning",
          "kind": "clean",
          "href": "learn/multimodal/vlm-captioning/",
          "on": "multimodal/vlm-captioning",
          "more": []
        },
        {
          "n": "13-08",
          "title": "Visual question answering",
          "kind": "clean",
          "href": "learn/multimodal/vqa/",
          "on": "multimodal/vqa",
          "more": []
        },
        {
          "n": "13-09",
          "title": "Multimodal fusion architectures",
          "kind": "clean",
          "href": "learn/multimodal/multimodal-fusion/",
          "on": "multimodal/multimodal-fusion",
          "more": []
        },
        {
          "n": "13-10",
          "title": "Audio representations and wav2vec",
          "kind": "clean",
          "href": "learn/multimodal/audio-representations/",
          "on": "multimodal/audio-representations",
          "more": []
        },
        {
          "n": "13-11",
          "title": "Speech: recognition and synthesis",
          "kind": "clean",
          "href": "learn/multimodal/stt-tts/",
          "on": "multimodal/stt-tts",
          "more": []
        },
        {
          "n": "13-12",
          "title": "Multimodal evaluation",
          "kind": "clean",
          "href": "learn/multimodal/multimodal-eval/",
          "on": "multimodal/multimodal-eval",
          "more": []
        }
      ]
    },
    {
      "n": "14",
      "slug": "reinforcement-learning",
      "title": "Reinforcement learning",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "reinforcement-learning",
      "lessons": [
        {
          "n": "14-01",
          "title": "MDPs and the Bellman equations",
          "kind": "clean",
          "href": "learn/reinforcement-learning/mdp-bellman/",
          "on": "reinforcement-learning/mdp-bellman",
          "more": []
        },
        {
          "n": "14-02",
          "title": "Monte Carlo and temporal difference learning",
          "kind": "clean",
          "href": "learn/reinforcement-learning/mc-td/",
          "on": "reinforcement-learning/mc-td",
          "more": []
        },
        {
          "n": "14-03",
          "title": "Q-learning and SARSA",
          "kind": "clean",
          "href": "learn/reinforcement-learning/q-learning/",
          "on": "reinforcement-learning/q-learning",
          "more": []
        },
        {
          "n": "14-04",
          "title": "Bandits, exploration, and regret",
          "kind": "clean",
          "href": "learn/reinforcement-learning/bandits/",
          "on": "reinforcement-learning/bandits",
          "more": []
        },
        {
          "n": "14-05",
          "title": "Deep Q-networks",
          "kind": "clean",
          "href": "learn/reinforcement-learning/dqn/",
          "on": "reinforcement-learning/dqn",
          "more": []
        },
        {
          "n": "14-06",
          "title": "DQN variants: double, duelling, prioritized replay",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "14-07",
          "title": "Policy gradients and REINFORCE",
          "kind": "clean",
          "href": "learn/reinforcement-learning/policy-gradient/",
          "on": "reinforcement-learning/policy-gradient",
          "more": []
        },
        {
          "n": "14-08",
          "title": "Actor-critic and A2C",
          "kind": "clean",
          "href": "learn/reinforcement-learning/actor-critic/",
          "on": "reinforcement-learning/actor-critic",
          "more": []
        },
        {
          "n": "14-09",
          "title": "PPO and trust regions",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "14-10",
          "title": "Model-based RL and MCTS",
          "kind": "clean",
          "href": "learn/reinforcement-learning/model-based-rl/",
          "on": "reinforcement-learning/model-based-rl",
          "more": []
        },
        {
          "n": "14-11",
          "title": "Offline RL: CQL and IQL",
          "kind": "clean",
          "href": "learn/reinforcement-learning/offline-rl/",
          "on": "reinforcement-learning/offline-rl",
          "more": []
        },
        {
          "n": "14-12",
          "title": "Imitation learning and inverse RL",
          "kind": "clean",
          "href": "learn/reinforcement-learning/imitation-learning/",
          "on": "reinforcement-learning/imitation-learning",
          "more": []
        }
      ]
    },
    {
      "n": "15",
      "slug": "pretrained-lms",
      "title": "Pretrained language models",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "advanced-nlp",
      "lessons": [
        {
          "n": "15-01",
          "title": "A GPT-style language model from scratch",
          "kind": "clean",
          "href": "learn/advanced-nlp/gpt/",
          "on": "advanced-nlp/gpt",
          "more": []
        },
        {
          "n": "15-02",
          "title": "A BERT-style masked LM from scratch",
          "kind": "clean",
          "href": "learn/advanced-nlp/bert/",
          "on": "advanced-nlp/bert",
          "more": []
        },
        {
          "n": "15-03",
          "title": "Encoder, decoder, encoder-decoder",
          "kind": "clean",
          "href": "learn/advanced-nlp/architectures/",
          "on": "advanced-nlp/architectures",
          "more": []
        },
        {
          "n": "15-04",
          "title": "Using pretrained models properly",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "15-05",
          "title": "Fine-tuning pretrained encoders",
          "kind": "merge",
          "href": "learn/advanced-nlp/fine-tuning-transformers/",
          "on": "advanced-nlp/fine-tuning-transformers",
          "more": []
        },
        {
          "n": "15-06",
          "title": "Named entity recognition",
          "kind": "clean",
          "href": "learn/advanced-nlp/ner/",
          "on": "advanced-nlp/ner",
          "more": []
        },
        {
          "n": "15-07",
          "title": "Natural language inference",
          "kind": "clean",
          "href": "learn/advanced-nlp/nli/",
          "on": "advanced-nlp/nli",
          "more": []
        },
        {
          "n": "15-08",
          "title": "Extractive question answering",
          "kind": "clean",
          "href": "learn/advanced-nlp/qa/",
          "on": "advanced-nlp/qa",
          "more": []
        },
        {
          "n": "15-09",
          "title": "NLP evaluation and significance",
          "kind": "merge",
          "href": "learn/advanced-nlp/nlp-eval/",
          "on": "advanced-nlp/nlp-eval",
          "more": []
        },
        {
          "n": "15-10",
          "title": "In-context learning and induction heads",
          "kind": "split",
          "href": "learn/advanced-nlp/cot/",
          "on": "advanced-nlp/cot",
          "more": []
        }
      ]
    },
    {
      "n": "16",
      "slug": "reasoning-scaling",
      "title": "Scaling, reasoning, and test-time compute",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "llm-systems",
      "lessons": [
        {
          "n": "16-01",
          "title": "Scaling laws and Chinchilla",
          "kind": "clean",
          "href": "learn/llm-systems/scaling-laws/",
          "on": "llm-systems/scaling-laws",
          "more": []
        },
        {
          "n": "16-02",
          "title": "Pretraining data pipelines and mixtures",
          "kind": "clean",
          "href": "learn/llm-systems/llm-data-pipelines/",
          "on": "llm-systems/llm-data-pipelines",
          "more": []
        },
        {
          "n": "16-03",
          "title": "Mixture of experts",
          "kind": "clean",
          "href": "learn/llm-systems/moe/",
          "on": "llm-systems/moe",
          "more": []
        },
        {
          "n": "16-04",
          "title": "Multi-token prediction and alternative objectives",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "16-05",
          "title": "Chain of thought and reasoning traces",
          "kind": "split",
          "href": "learn/advanced-nlp/cot/",
          "on": "advanced-nlp/cot",
          "more": []
        },
        {
          "n": "16-06",
          "title": "Test-time compute: best-of-N, self-consistency, budgets",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "16-07",
          "title": "Verifiers, process reward models, and search over reasoning",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "16-08",
          "title": "Long context: position interpolation, YaRN, sliding window",
          "kind": "clean",
          "href": "learn/llm-systems/long-context/",
          "on": "llm-systems/long-context",
          "more": []
        },
        {
          "n": "16-09",
          "title": "Benchmarks, contamination, and honest LLM evaluation",
          "kind": "merge",
          "href": "learn/llm-systems/llm-eval/",
          "on": "llm-systems/llm-eval",
          "more": [
            {
              "href": "learn/frontier-frameworks/eval-harnesses/",
              "on": "frontier-frameworks/eval-harnesses",
              "title": "Evaluation Harnesses & Custom Evals"
            }
          ]
        },
        {
          "n": "16-10",
          "title": "Emergence, capability forecasting, and reading frontier claims",
          "kind": "merge",
          "href": "learn/frontier-frameworks/open-weight-models/",
          "on": "frontier-frameworks/open-weight-models",
          "more": [
            {
              "href": "learn/frontier-frameworks/staying-current/",
              "on": "frontier-frameworks/staying-current",
              "title": "Staying Current: Releases, Benchmarks & Changelogs"
            }
          ]
        }
      ]
    },
    {
      "n": "17",
      "slug": "post-training",
      "title": "Post-training: fine-tuning and alignment",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "fine-tuning",
      "lessons": [
        {
          "n": "17-01",
          "title": "Full fine-tuning versus feature extraction",
          "kind": "clean",
          "href": "learn/fine-tuning/full-fine-tuning/",
          "on": "fine-tuning/full-fine-tuning",
          "more": []
        },
        {
          "n": "17-02",
          "title": "LoRA from scratch, then peft",
          "kind": "clean",
          "href": "learn/fine-tuning/lora/",
          "on": "fine-tuning/lora",
          "more": []
        },
        {
          "n": "17-03",
          "title": "QLoRA and quantized fine-tuning",
          "kind": "clean",
          "href": "learn/fine-tuning/qlora/",
          "on": "fine-tuning/qlora",
          "more": []
        },
        {
          "n": "17-04",
          "title": "Prompt tuning and prefix tuning",
          "kind": "clean",
          "href": "learn/fine-tuning/prompt-tuning/",
          "on": "fine-tuning/prompt-tuning",
          "more": []
        },
        {
          "n": "17-05",
          "title": "PEFT methods compared under one protocol",
          "kind": "clean",
          "href": "learn/fine-tuning/adapters/",
          "on": "fine-tuning/adapters",
          "more": []
        },
        {
          "n": "17-06",
          "title": "Model merging, task arithmetic, and model soups",
          "kind": "clean",
          "href": "learn/frontier-frameworks/finetuning-stacks/",
          "on": "frontier-frameworks/finetuning-stacks",
          "more": []
        },
        {
          "n": "17-07",
          "title": "Instruction tuning and SFT with trl",
          "kind": "clean",
          "href": "learn/fine-tuning/instruction-tuning/",
          "on": "fine-tuning/instruction-tuning",
          "more": []
        },
        {
          "n": "17-08",
          "title": "Reward modelling",
          "kind": "clean",
          "href": "learn/fine-tuning/reward-modeling/",
          "on": "fine-tuning/reward-modeling",
          "more": []
        },
        {
          "n": "17-09",
          "title": "RLHF with PPO",
          "kind": "clean",
          "href": "learn/fine-tuning/rlhf-ppo/",
          "on": "fine-tuning/rlhf-ppo",
          "more": []
        },
        {
          "n": "17-10",
          "title": "DPO and preference optimization",
          "kind": "clean",
          "href": "learn/fine-tuning/dpo-grpo/",
          "on": "fine-tuning/dpo-grpo",
          "more": []
        },
        {
          "n": "17-11",
          "title": "GRPO and RLVR: reasoning with verifiable rewards",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "17-12",
          "title": "Constitutional AI, RLAIF, and post-training evaluation",
          "kind": "clean",
          "href": "learn/fine-tuning/unsloth/",
          "on": "fine-tuning/unsloth",
          "more": []
        }
      ]
    },
    {
      "n": "18",
      "slug": "retrieval-rag",
      "title": "Retrieval, RAG, and knowledge systems",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "rag-agents",
      "lessons": [
        {
          "n": "18-01",
          "title": "Embeddings and vector spaces",
          "kind": "split",
          "href": "learn/rag-agents/embeddings-vector-stores/",
          "on": "rag-agents/embeddings-vector-stores",
          "more": []
        },
        {
          "n": "18-02",
          "title": "Approximate nearest neighbour indexing",
          "kind": "split",
          "href": "learn/rag-agents/embeddings-vector-stores/",
          "on": "rag-agents/embeddings-vector-stores",
          "more": []
        },
        {
          "n": "18-03",
          "title": "Sparse retrieval: BM25 and inverted indexes",
          "kind": "split",
          "href": "learn/rag-agents/chunking-retrieval/",
          "on": "rag-agents/chunking-retrieval",
          "more": []
        },
        {
          "n": "18-04",
          "title": "Dense retrieval and bi-encoders",
          "kind": "split",
          "href": "learn/rag-agents/chunking-retrieval/",
          "on": "rag-agents/chunking-retrieval",
          "more": []
        },
        {
          "n": "18-05",
          "title": "Training embedding models: InfoNCE, hard negatives, Matryoshka",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "18-06",
          "title": "Reranking and fusion",
          "kind": "merge",
          "href": "learn/rag-agents/advanced-rag/",
          "on": "rag-agents/advanced-rag",
          "more": []
        },
        {
          "n": "18-07",
          "title": "Query transformation: HyDE, rewriting, decomposition",
          "kind": "split",
          "href": "learn/rag-agents/advanced-rag/",
          "on": "rag-agents/advanced-rag",
          "more": []
        },
        {
          "n": "18-08",
          "title": "RAG end to end: assembly, citation, faithfulness",
          "kind": "clean",
          "href": "learn/rag-agents/rag-pipeline/",
          "on": "rag-agents/rag-pipeline",
          "more": []
        },
        {
          "n": "18-09",
          "title": "GraphRAG and multi-hop retrieval",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "18-10",
          "title": "Multimodal and cross-modal retrieval",
          "kind": "clean",
          "href": "learn/advanced-cv/image-retrieval/",
          "on": "advanced-cv/image-retrieval",
          "more": []
        },
        {
          "n": "18-11",
          "title": "Retrieval at scale: sharding, freshness, latency",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "18-12",
          "title": "RAG evaluation and a knowledge assistant",
          "kind": "merge",
          "href": "learn/rag-agents/rag-eval/",
          "on": "rag-agents/rag-eval",
          "more": [
            {
              "href": "learn/rag-agents/capstone-assistant/",
              "on": "rag-agents/capstone-assistant",
              "title": "Domain-Specific AI Assistant (Capstone)"
            }
          ]
        }
      ]
    },
    {
      "n": "19",
      "slug": "agentic-ai",
      "title": "Agentic AI systems and MCP",
      "track": "IV",
      "trackName": "Language models and modern AI",
      "wasSlug": "agentic-ai",
      "lessons": [
        {
          "n": "19-01",
          "title": "The agent loop",
          "kind": "merge",
          "href": "learn/agentic-ai/agent-loop/",
          "on": "agentic-ai/agent-loop",
          "more": [
            {
              "href": "learn/rag-agents/agent-loops/",
              "on": "rag-agents/agent-loops",
              "title": "Agent Loops, Tool Use & Planning"
            }
          ]
        },
        {
          "n": "19-02",
          "title": "Tool and function calling",
          "kind": "merge",
          "href": "learn/agentic-ai/tool-calling/",
          "on": "agentic-ai/tool-calling",
          "more": [
            {
              "href": "learn/llm-systems/structured-output/",
              "on": "llm-systems/structured-output",
              "title": "Structured Output & Function Calling"
            }
          ]
        },
        {
          "n": "19-03",
          "title": "The Model Context Protocol",
          "kind": "clean",
          "href": "learn/agentic-ai/mcp/",
          "on": "agentic-ai/mcp",
          "more": []
        },
        {
          "n": "19-04",
          "title": "ReAct, planning, and task decomposition",
          "kind": "clean",
          "href": "learn/agentic-ai/react-planning/",
          "on": "agentic-ai/react-planning",
          "more": []
        },
        {
          "n": "19-05",
          "title": "Agent memory",
          "kind": "merge",
          "href": "learn/agentic-ai/agent-memory/",
          "on": "agentic-ai/agent-memory",
          "more": []
        },
        {
          "n": "19-06",
          "title": "Context engineering and long-horizon state",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "19-07",
          "title": "Multi-agent orchestration",
          "kind": "merge",
          "href": "learn/agentic-ai/multi-agent/",
          "on": "agentic-ai/multi-agent",
          "more": [
            {
              "href": "learn/rag-agents/multi-agent/",
              "on": "rag-agents/multi-agent",
              "title": "Multi-Agent Orchestration"
            }
          ]
        },
        {
          "n": "19-08",
          "title": "Computer use, browser, and code-execution agents",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "19-09",
          "title": "Agent evaluation: tasks, trajectories, rubrics",
          "kind": "merge",
          "href": "learn/agentic-ai/agent-evaluation/",
          "on": "agentic-ai/agent-evaluation",
          "more": [
            {
              "href": "learn/rag-agents/guardrails/",
              "on": "rag-agents/guardrails",
              "title": "Guardrails & Agent Evaluation"
            }
          ]
        },
        {
          "n": "19-10",
          "title": "Observability, tracing, and cost control",
          "kind": "clean",
          "href": "learn/agentic-ai/observability/",
          "on": "agentic-ai/observability",
          "more": []
        },
        {
          "n": "19-11",
          "title": "Guardrails, prompt injection, and agent security",
          "kind": "merge",
          "href": "learn/agentic-ai/agent-security/",
          "on": "agentic-ai/agent-security",
          "more": [
            {
              "href": "learn/rag-agents/guardrails/",
              "on": "rag-agents/guardrails",
              "title": "Guardrails & Agent Evaluation"
            }
          ]
        },
        {
          "n": "19-12",
          "title": "Capstone: a production agent",
          "kind": "merge",
          "href": "learn/agentic-ai/agent-capstone/",
          "on": "agentic-ai/agent-capstone",
          "more": [
            {
              "href": "learn/rag-agents/voice-agents/",
              "on": "rag-agents/voice-agents",
              "title": "Voice Agents — STT→LLM→TTS"
            }
          ]
        }
      ]
    },
    {
      "n": "20",
      "slug": "pytorch-internals",
      "title": "PyTorch internals and performance",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "pytorch-internals",
      "lessons": [
        {
          "n": "20-01",
          "title": "Custom autograd functions and hooks",
          "kind": "clean",
          "href": "learn/pytorch-internals/custom-autograd/",
          "on": "pytorch-internals/custom-autograd",
          "more": []
        },
        {
          "n": "20-02",
          "title": "Advanced nn.Module patterns",
          "kind": "clean",
          "href": "learn/pytorch-internals/nn-module-patterns/",
          "on": "pytorch-internals/nn-module-patterns",
          "more": []
        },
        {
          "n": "20-03",
          "title": "Custom losses and gradient utilities",
          "kind": "clean",
          "href": "learn/pytorch-internals/custom-loss/",
          "on": "pytorch-internals/custom-loss",
          "more": []
        },
        {
          "n": "20-04",
          "title": "Advanced data pipelines",
          "kind": "clean",
          "href": "learn/pytorch-internals/data-pipelines/",
          "on": "pytorch-internals/data-pipelines",
          "more": []
        },
        {
          "n": "20-05",
          "title": "CUDA memory and OOM forensics",
          "kind": "clean",
          "href": "learn/pytorch-internals/cuda-memory/",
          "on": "pytorch-internals/cuda-memory",
          "more": []
        },
        {
          "n": "20-06",
          "title": "Profiling and bottleneck analysis",
          "kind": "merge",
          "href": "learn/pytorch-internals/debugging-profiling/",
          "on": "pytorch-internals/debugging-profiling",
          "more": [
            {
              "href": "learn/training-systems/profiling/",
              "on": "training-systems/profiling",
              "title": "Profiling & Bottleneck Analysis"
            }
          ]
        },
        {
          "n": "20-07",
          "title": "torch.compile: Dynamo and Inductor",
          "kind": "split",
          "href": "learn/training-systems/torch-compile/",
          "on": "training-systems/torch-compile",
          "more": []
        },
        {
          "n": "20-08",
          "title": "Triton kernels and custom ops",
          "kind": "clean",
          "href": "learn/frontier-frameworks/torch-compile-triton/",
          "on": "frontier-frameworks/torch-compile-triton",
          "more": []
        },
        {
          "n": "20-09",
          "title": "TorchScript, torch.fx, and graph transformations",
          "kind": "merge",
          "href": "learn/pytorch-internals/torchscript/",
          "on": "pytorch-internals/torchscript",
          "more": [
            {
              "href": "learn/pytorch-internals/torch-fx/",
              "on": "pytorch-internals/torch-fx",
              "title": "torch.fx Graph Transformations"
            }
          ]
        },
        {
          "n": "20-10",
          "title": "Build a mini training framework",
          "kind": "clean",
          "href": "learn/pytorch-internals/mini-framework/",
          "on": "pytorch-internals/mini-framework",
          "more": []
        }
      ]
    },
    {
      "n": "21",
      "slug": "distributed-training",
      "title": "Distributed and efficient training",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "training-systems",
      "lessons": [
        {
          "n": "21-01",
          "title": "Mixed precision: fp16, bf16, fp8",
          "kind": "clean",
          "href": "learn/training-systems/mixed-precision/",
          "on": "training-systems/mixed-precision",
          "more": []
        },
        {
          "n": "21-02",
          "title": "Gradient checkpointing",
          "kind": "clean",
          "href": "learn/training-systems/gradient-checkpointing/",
          "on": "training-systems/gradient-checkpointing",
          "more": []
        },
        {
          "n": "21-03",
          "title": "Gradient accumulation and large batch training",
          "kind": "clean",
          "href": "learn/training-systems/gradient-accumulation/",
          "on": "training-systems/gradient-accumulation",
          "more": []
        },
        {
          "n": "21-04",
          "title": "Data loading at scale",
          "kind": "clean",
          "href": "learn/training-systems/data-loading-scale/",
          "on": "training-systems/data-loading-scale",
          "more": []
        },
        {
          "n": "21-05",
          "title": "Training stability and NaN forensics",
          "kind": "clean",
          "href": "learn/training-systems/training-stability/",
          "on": "training-systems/training-stability",
          "more": []
        },
        {
          "n": "21-06",
          "title": "Collectives and ring all-reduce",
          "kind": "clean",
          "href": "learn/pytorch-internals/distributed-primitives/",
          "on": "pytorch-internals/distributed-primitives",
          "more": []
        },
        {
          "n": "21-07",
          "title": "Distributed data parallel",
          "kind": "clean",
          "href": "learn/training-systems/ddp/",
          "on": "training-systems/ddp",
          "more": []
        },
        {
          "n": "21-08",
          "title": "FSDP and ZeRO",
          "kind": "clean",
          "href": "learn/training-systems/fsdp/",
          "on": "training-systems/fsdp",
          "more": []
        },
        {
          "n": "21-09",
          "title": "Tensor, pipeline, and sequence parallelism",
          "kind": "split",
          "href": "learn/training-systems/torch-compile/",
          "on": "training-systems/torch-compile",
          "more": []
        },
        {
          "n": "21-10",
          "title": "An end-to-end optimized training run",
          "kind": "clean",
          "href": "learn/training-systems/optimized-pipeline/",
          "on": "training-systems/optimized-pipeline",
          "more": []
        }
      ]
    },
    {
      "n": "22",
      "slug": "inference-serving",
      "title": "Inference, serving, and deployment",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "llm-systems",
      "lessons": [
        {
          "n": "22-01",
          "title": "LLM architecture patterns in production",
          "kind": "clean",
          "href": "learn/llm-systems/llm-architectures/",
          "on": "llm-systems/llm-architectures",
          "more": []
        },
        {
          "n": "22-02",
          "title": "Quantization: PTQ, QAT, GPTQ, AWQ",
          "kind": "clean",
          "href": "learn/llm-systems/quantization/",
          "on": "llm-systems/quantization",
          "more": []
        },
        {
          "n": "22-03",
          "title": "Knowledge distillation",
          "kind": "clean",
          "href": "learn/llm-systems/distillation/",
          "on": "llm-systems/distillation",
          "more": []
        },
        {
          "n": "22-04",
          "title": "Speculative decoding and decoding-time algorithms",
          "kind": "clean",
          "href": "learn/llm-systems/speculative-decoding/",
          "on": "llm-systems/speculative-decoding",
          "more": []
        },
        {
          "n": "22-05",
          "title": "Serving engines: paged attention and continuous batching",
          "kind": "merge",
          "href": "learn/frontier-frameworks/vllm-inference/",
          "on": "frontier-frameworks/vllm-inference",
          "more": []
        },
        {
          "n": "22-06",
          "title": "Model export: TorchScript, ONNX, runtimes",
          "kind": "merge",
          "href": "learn/mlops/torchscript-onnx/",
          "on": "mlops/torchscript-onnx",
          "more": [
            {
              "href": "learn/frontier-frameworks/onnx-export/",
              "on": "frontier-frameworks/onnx-export",
              "title": "Model Export: ONNX & Quantized Runtimes"
            }
          ]
        },
        {
          "n": "22-07",
          "title": "Serving APIs: batching and streaming",
          "kind": "clean",
          "href": "learn/mlops/model-serving/",
          "on": "mlops/model-serving",
          "more": []
        },
        {
          "n": "22-08",
          "title": "Containerization",
          "kind": "clean",
          "href": "learn/mlops/docker/",
          "on": "mlops/docker",
          "more": []
        },
        {
          "n": "22-09",
          "title": "Provider APIs in production",
          "kind": "clean",
          "href": "learn/frontier-frameworks/provider-apis/",
          "on": "frontier-frameworks/provider-apis",
          "more": []
        },
        {
          "n": "22-10",
          "title": "Feature stores and training-serving skew",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "22-11",
          "title": "Latency, throughput, and cost engineering",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "22-12",
          "title": "ML system design patterns",
          "kind": "clean",
          "href": "learn/mlops/system-design/",
          "on": "mlops/system-design",
          "more": []
        }
      ]
    },
    {
      "n": "23",
      "slug": "mlops",
      "title": "MLOps, monitoring, and reliability",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "mlops",
      "lessons": [
        {
          "n": "23-01",
          "title": "ML strategy and error analysis",
          "kind": "clean",
          "href": "learn/mlops/ml-strategy/",
          "on": "mlops/ml-strategy",
          "more": []
        },
        {
          "n": "23-02",
          "title": "Experiment tracking and the model registry",
          "kind": "clean",
          "href": "learn/mlops/mlflow/",
          "on": "mlops/mlflow",
          "more": []
        },
        {
          "n": "23-03",
          "title": "CI/CD for machine learning",
          "kind": "clean",
          "href": "learn/mlops/cicd/",
          "on": "mlops/cicd",
          "more": []
        },
        {
          "n": "23-04",
          "title": "ML testing and data validation",
          "kind": "clean",
          "href": "learn/mlops/testing/",
          "on": "mlops/testing",
          "more": []
        },
        {
          "n": "23-05",
          "title": "Drift detection and shift adaptation",
          "kind": "merge",
          "href": "learn/mlops/monitoring/",
          "on": "mlops/monitoring",
          "more": [
            {
              "href": "learn/trustworthy-ai/distribution-shift/",
              "on": "trustworthy-ai/distribution-shift",
              "title": "Distribution Shift & Drift Detection"
            }
          ]
        },
        {
          "n": "23-06",
          "title": "Monitoring, alerting, and incident response",
          "kind": "split",
          "href": "learn/mlops/monitoring/",
          "on": "mlops/monitoring",
          "more": []
        },
        {
          "n": "23-07",
          "title": "Online experimentation and canary rollouts",
          "kind": "promote",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "23-08",
          "title": "Retraining loops and feedback-loop hazards",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "23-09",
          "title": "Cost, capacity, and reliability engineering",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "23-10",
          "title": "A production pipeline, end to end",
          "kind": "clean",
          "href": "learn/mlops/project-structure/",
          "on": "mlops/project-structure",
          "more": []
        }
      ]
    },
    {
      "n": "24",
      "slug": "trustworthy-ai",
      "title": "Trustworthy, safe, and interpretable AI",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "trustworthy-ai",
      "lessons": [
        {
          "n": "24-01",
          "title": "Uncertainty: epistemic, aleatoric, and Bayesian deep learning",
          "kind": "clean",
          "href": "learn/trustworthy-ai/calibration/",
          "on": "trustworthy-ai/calibration",
          "more": []
        },
        {
          "n": "24-02",
          "title": "Conformal prediction",
          "kind": "clean",
          "href": "learn/trustworthy-ai/conformal-prediction/",
          "on": "trustworthy-ai/conformal-prediction",
          "more": []
        },
        {
          "n": "24-03",
          "title": "Fairness metrics and their impossibility",
          "kind": "clean",
          "href": "learn/trustworthy-ai/fairness/",
          "on": "trustworthy-ai/fairness",
          "more": []
        },
        {
          "n": "24-04",
          "title": "Attribution I: saliency, Grad-CAM, integrated gradients",
          "kind": "clean",
          "href": "learn/advanced-cv/grad-cam/",
          "on": "advanced-cv/grad-cam",
          "more": []
        },
        {
          "n": "24-05",
          "title": "Attribution II: Shapley, KernelSHAP, PDP and ICE",
          "kind": "clean",
          "href": "learn/ml-applications/shap/",
          "on": "ml-applications/shap",
          "more": []
        },
        {
          "n": "24-06",
          "title": "Attribution faithfulness and sanity checks",
          "kind": "clean",
          "href": "learn/trustworthy-ai/attribution/",
          "on": "trustworthy-ai/attribution",
          "more": []
        },
        {
          "n": "24-07",
          "title": "Mechanistic interpretability I: superposition and SAEs",
          "kind": "clean",
          "href": "learn/trustworthy-ai/superposition-sae/",
          "on": "trustworthy-ai/superposition-sae",
          "more": []
        },
        {
          "n": "24-08",
          "title": "Mechanistic interpretability II: probing, patching, circuits",
          "kind": "merge",
          "href": "learn/trustworthy-ai/probing-patching/",
          "on": "trustworthy-ai/probing-patching",
          "more": [
            {
              "href": "learn/advanced-nlp/interpretability/",
              "on": "advanced-nlp/interpretability",
              "title": "Mechanistic Interpretability"
            }
          ]
        },
        {
          "n": "24-09",
          "title": "Adversarial attacks",
          "kind": "clean",
          "href": "learn/cnn/adversarial/",
          "on": "cnn/adversarial",
          "more": []
        },
        {
          "n": "24-10",
          "title": "Certified defences and adversarial training",
          "kind": "clean",
          "href": "learn/trustworthy-ai/adversarial-robustness/",
          "on": "trustworthy-ai/adversarial-robustness",
          "more": []
        },
        {
          "n": "24-11",
          "title": "Privacy: DP-SGD, membership inference, unlearning",
          "kind": "split",
          "href": "learn/trustworthy-ai/distribution-shift/",
          "on": "trustworthy-ai/distribution-shift",
          "more": []
        },
        {
          "n": "24-12",
          "title": "Red-teaming, watermarking, and governance",
          "kind": "merge",
          "href": "learn/trustworthy-ai/red-teaming/",
          "on": "trustworthy-ai/red-teaming",
          "more": [
            {
              "href": "learn/trustworthy-ai/alignment-governance/",
              "on": "trustworthy-ai/alignment-governance",
              "title": "Alignment & Governance Overview"
            }
          ]
        }
      ]
    },
    {
      "n": "25",
      "slug": "applications",
      "title": "Applied ML and domain systems",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "ml-applications",
      "lessons": [
        {
          "n": "25-01",
          "title": "Collaborative filtering and matrix factorization",
          "kind": "clean",
          "href": "learn/ml-applications/recommenders-cf/",
          "on": "ml-applications/recommenders-cf",
          "more": []
        },
        {
          "n": "25-02",
          "title": "Two-tower neural retrieval",
          "kind": "clean",
          "href": "learn/ml-applications/neural-recommenders/",
          "on": "ml-applications/neural-recommenders",
          "more": []
        },
        {
          "n": "25-03",
          "title": "Search and learning to rank",
          "kind": "clean",
          "href": "learn/ml-applications/search-ranking/",
          "on": "ml-applications/search-ranking",
          "more": []
        },
        {
          "n": "25-04",
          "title": "Position bias and feedback loops in ranking",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "25-05",
          "title": "Time series forecasting",
          "kind": "clean",
          "href": "learn/ml-applications/time-series/",
          "on": "ml-applications/time-series",
          "more": []
        },
        {
          "n": "25-06",
          "title": "Graph neural networks",
          "kind": "clean",
          "href": "learn/ml-applications/gnn/",
          "on": "ml-applications/gnn",
          "more": []
        },
        {
          "n": "25-07",
          "title": "Tabular deep learning versus gradient boosting",
          "kind": "split",
          "href": "learn/ml-applications/tabular-dl/",
          "on": "ml-applications/tabular-dl",
          "more": []
        },
        {
          "n": "25-08",
          "title": "Semi-supervised and label-efficient learning",
          "kind": "clean",
          "href": "learn/ml-applications/semi-supervised/",
          "on": "ml-applications/semi-supervised",
          "more": []
        },
        {
          "n": "25-09",
          "title": "Multi-task learning",
          "kind": "clean",
          "href": "learn/ml-applications/multi-task/",
          "on": "ml-applications/multi-task",
          "more": []
        },
        {
          "n": "25-10",
          "title": "Audio classification",
          "kind": "clean",
          "href": "learn/ml-applications/audio-classification/",
          "on": "ml-applications/audio-classification",
          "more": []
        },
        {
          "n": "25-11",
          "title": "Fraud detection under extreme imbalance",
          "kind": "new",
          "href": null,
          "on": null,
          "more": []
        },
        {
          "n": "25-12",
          "title": "Domain capstone",
          "kind": "split",
          "href": "learn/ml-applications/tabular-dl/",
          "on": "ml-applications/tabular-dl",
          "more": []
        }
      ]
    },
    {
      "n": "26",
      "slug": "interview-capstone",
      "title": "Interview preparation and system design capstone",
      "track": "V",
      "trackName": "Systems, trust and practice",
      "wasSlug": "interview-capstone",
      "lessons": [
        {
          "n": "26-01",
          "title": "The interview landscape and a preparation strategy",
          "kind": "clean",
          "href": "learn/interview-capstone/interview-landscape/",
          "on": "interview-capstone/interview-landscape",
          "more": []
        },
        {
          "n": "26-02",
          "title": "An ML system design framework",
          "kind": "clean",
          "href": "learn/interview-capstone/system-design-framework/",
          "on": "interview-capstone/system-design-framework",
          "more": []
        },
        {
          "n": "26-03",
          "title": "Design case: recommender and feed",
          "kind": "clean",
          "href": "learn/interview-capstone/design-recommender/",
          "on": "interview-capstone/design-recommender",
          "more": []
        },
        {
          "n": "26-04",
          "title": "Design case: search and ads",
          "kind": "clean",
          "href": "learn/interview-capstone/design-search-ads/",
          "on": "interview-capstone/design-search-ads",
          "more": []
        },
        {
          "n": "26-05",
          "title": "Design case: fraud detection",
          "kind": "split",
          "href": "learn/interview-capstone/design-fraud-llm/",
          "on": "interview-capstone/design-fraud-llm",
          "more": []
        },
        {
          "n": "26-06",
          "title": "Design case: LLM and agent products",
          "kind": "split",
          "href": "learn/interview-capstone/design-fraud-llm/",
          "on": "interview-capstone/design-fraud-llm",
          "more": []
        },
        {
          "n": "26-07",
          "title": "ML coding patterns from scratch",
          "kind": "clean",
          "href": "learn/interview-capstone/coding-patterns/",
          "on": "interview-capstone/coding-patterns",
          "more": []
        },
        {
          "n": "26-08",
          "title": "Classical CS algorithms for ML interviews",
          "kind": "clean",
          "href": "learn/interview-capstone/cs-algorithms/",
          "on": "interview-capstone/cs-algorithms",
          "more": []
        },
        {
          "n": "26-09",
          "title": "ML breadth, rapid fire",
          "kind": "clean",
          "href": "learn/interview-capstone/breadth-rapid-fire/",
          "on": "interview-capstone/breadth-rapid-fire",
          "more": []
        },
        {
          "n": "26-10",
          "title": "Deep-dive derivations",
          "kind": "clean",
          "href": "learn/interview-capstone/derivations/",
          "on": "interview-capstone/derivations",
          "more": []
        },
        {
          "n": "26-11",
          "title": "Take-homes, storytelling, and the portfolio",
          "kind": "clean",
          "href": "learn/interview-capstone/portfolio-capstone/",
          "on": "interview-capstone/portfolio-capstone",
          "more": []
        }
      ]
    }
  ],

  // Kept on the site, cut from the notebooks — see the block comment above.
  kept: [
    {
      "n": "09-04",
      "title": "MediaPipe Real-Time Vision",
      "reason": "Needs a webcam, so it cannot execute headlessly. Committing outputs makes that disqualifying. A keypoint topic that runs on a static image replaces it in a later revision.",
      "href": "learn/advanced-cv/mediapipe/"
    },
    {
      "n": "22-01",
      "title": "JAX & Functional ML: jit, grad, vmap",
      "reason": "The course is PyTorch-first. Two notebooks on a framework the reader will not use are worse than none, and the functional-autodiff insight is better served by 08-07 and 20-01.",
      "href": "learn/frontier-frameworks/jax-fundamentals/"
    },
    {
      "n": "22-02",
      "title": "Training in JAX with Flax & Optax",
      "reason": "Same as 22-01.",
      "href": "learn/frontier-frameworks/flax-optax/"
    }
  ],

  tracks() {
    const out = [];
    for (const m of this.modules) {
      let t = out.find(x => x.id === m.track);
      if (!t) { t = { id: m.track, name: m.trackName, modules: [] }; out.push(t); }
      t.modules.push(m);
    }
    return out;
  },
  counts() {
    const slots = this.modules.reduce((a, m) => a + m.lessons.length, 0);
    const written = this.modules.reduce((a, m) => a + m.lessons.filter(l => l.href).length, 0);
    return { modules: this.modules.length, slots, written, planned: slots - written };
  },
};
