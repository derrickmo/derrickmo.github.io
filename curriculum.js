// GENERATED from content/ by _private/scripts/gen-from-store.mjs — DO NOT EDIT BY HAND.
// Edit the canonical store (content/modules/, lessons/) and re-run the generator.
// contentVersion 1.1.0
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
      "title": "Transformers — Architecture to Attention",
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
      "title": "Advanced NLP — Pretrained Language Models",
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
          "nb": "15-04_custom_loss_gradient_utilities.ipynb"
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
      "title": "Large Language Models — Systems & Scaling",
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
          "status": "PENDING",
          "nb": "19-02_neural_recommenders_two_tower.ipynb"
        },
        {
          "n": "19-03",
          "slug": "time-series",
          "title": "Time Series Forecasting",
          "status": "PENDING",
          "nb": "19-03_time_series_forecasting.ipynb"
        },
        {
          "n": "19-04",
          "slug": "search-ranking",
          "title": "Search & Ranking Systems",
          "status": "PENDING",
          "nb": "19-04_search_ranking_systems.ipynb"
        },
        {
          "n": "19-05",
          "slug": "shap",
          "title": "SHAP & Model-Agnostic Explainability",
          "status": "PENDING",
          "nb": "19-05_shap_model_agnostic_explainability.ipynb"
        },
        {
          "n": "19-06",
          "slug": "gnn",
          "title": "Graph Neural Networks",
          "status": "PENDING",
          "nb": "19-06_graph_neural_networks.ipynb"
        },
        {
          "n": "19-07",
          "slug": "audio-classification",
          "title": "Audio Classification",
          "status": "PENDING",
          "nb": "19-07_audio_classification.ipynb"
        },
        {
          "n": "19-08",
          "slug": "semi-supervised",
          "title": "Semi-Supervised Learning",
          "status": "PENDING",
          "nb": "19-08_semi_supervised_learning.ipynb"
        },
        {
          "n": "19-09",
          "slug": "multi-task",
          "title": "Multi-Task & Multi-Output Learning",
          "status": "PENDING",
          "nb": "19-09_multi_task_multi_output_learning.ipynb"
        },
        {
          "n": "19-10",
          "slug": "tabular-dl",
          "title": "Tabular Deep Learning",
          "status": "PENDING",
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
          "status": "PENDING",
          "nb": "20-01_ml_strategy_error_analysis.ipynb"
        },
        {
          "n": "20-02",
          "slug": "mlflow",
          "title": "Experiment Tracking with MLflow",
          "status": "PENDING",
          "nb": "20-02_mlflow_experiment_tracking.ipynb"
        },
        {
          "n": "20-03",
          "slug": "torchscript-onnx",
          "title": "Model Export — TorchScript & ONNX",
          "status": "PENDING",
          "nb": "20-03_model_export_torchscript_onnx.ipynb"
        },
        {
          "n": "20-04",
          "slug": "model-serving",
          "title": "Model Serving — FastAPI & Gradio",
          "status": "PENDING",
          "nb": "20-04_model_serving_fastapi_gradio.ipynb"
        },
        {
          "n": "20-05",
          "slug": "docker",
          "title": "Docker Containerization",
          "status": "PENDING",
          "nb": "20-05_docker_containerization.ipynb"
        },
        {
          "n": "20-06",
          "slug": "monitoring",
          "title": "Data Drift & Model Monitoring",
          "status": "PENDING",
          "nb": "20-06_data_drift_model_monitoring.ipynb"
        },
        {
          "n": "20-07",
          "slug": "cicd",
          "title": "CI/CD for ML",
          "status": "PENDING",
          "nb": "20-07_cicd_for_ml.ipynb"
        },
        {
          "n": "20-08",
          "slug": "testing",
          "title": "ML Testing & Data Validation",
          "status": "PENDING",
          "nb": "20-08_ml_testing_data_validation.ipynb"
        },
        {
          "n": "20-09",
          "slug": "project-structure",
          "title": "ML Project Structure & Best Practices",
          "status": "PENDING",
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
          "nb": "21-01_the_agent_loop.ipynb"
        },
        {
          "n": "21-02",
          "slug": "tool-calling",
          "title": "Tool Calling & Function Calling",
          "status": "LIVE",
          "nb": "21-02_tool_calling_function_calling.ipynb"
        },
        {
          "n": "21-03",
          "slug": "mcp",
          "title": "MCP: Protocol, Clients & Servers",
          "status": "LIVE",
          "nb": "21-03_mcp_protocol_clients_servers.ipynb"
        },
        {
          "n": "21-04",
          "slug": "react-planning",
          "title": "ReAct, Planning & Task Decomposition",
          "status": "LIVE",
          "nb": "21-04_react_planning_task_decomposition.ipynb"
        },
        {
          "n": "21-05",
          "slug": "agent-memory",
          "title": "Agent Memory & Context Management",
          "status": "LIVE",
          "nb": "21-05_agent_memory_context_management.ipynb"
        },
        {
          "n": "21-06",
          "slug": "multi-agent",
          "title": "Multi-Agent Orchestration",
          "status": "LIVE",
          "nb": "21-06_multi_agent_orchestration.ipynb"
        },
        {
          "n": "21-07",
          "slug": "agent-evaluation",
          "title": "Agent Evaluation: Tasks & Trajectories",
          "status": "LIVE",
          "nb": "21-07_agent_evaluation_tasks_trajectories.ipynb"
        },
        {
          "n": "21-08",
          "slug": "observability",
          "title": "Observability, Tracing & Cost Control",
          "status": "LIVE",
          "nb": "21-08_observability_tracing_cost_control.ipynb"
        },
        {
          "n": "21-09",
          "slug": "agent-security",
          "title": "Guardrails & Agent Security",
          "status": "LIVE",
          "nb": "21-09_guardrails_agent_security.ipynb"
        },
        {
          "n": "21-10",
          "slug": "agent-capstone",
          "title": "Capstone: Build a Production Agent",
          "status": "LIVE",
          "nb": "21-10_capstone_build_a_production_agent.ipynb"
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
      "status": "PENDING",
      "lessons": [
        {
          "n": "24-01",
          "slug": "calibration",
          "title": "Calibration & Temperature Scaling",
          "status": "PENDING",
          "nb": "24-01_calibration.ipynb"
        },
        {
          "n": "24-02",
          "slug": "conformal-prediction",
          "title": "Conformal Prediction",
          "status": "PENDING",
          "nb": "24-02_conformal_prediction.ipynb"
        },
        {
          "n": "24-03",
          "slug": "fairness",
          "title": "Fairness Metrics & Trade-offs",
          "status": "PENDING",
          "nb": "24-03_fairness.ipynb"
        },
        {
          "n": "24-04",
          "slug": "attribution",
          "title": "Attribution: SHAP, Saliency & Attention Rollout",
          "status": "PENDING",
          "nb": "24-04_attribution.ipynb"
        },
        {
          "n": "24-05",
          "slug": "superposition-sae",
          "title": "Mechanistic Interpretability I: Superposition & SAEs",
          "status": "PENDING",
          "nb": "24-05_superposition_sae.ipynb"
        },
        {
          "n": "24-06",
          "slug": "probing-patching",
          "title": "Mechanistic Interpretability II: Probing & Activation Patching",
          "status": "PENDING",
          "nb": "24-06_probing_patching.ipynb"
        },
        {
          "n": "24-07",
          "slug": "adversarial-robustness",
          "title": "Adversarial Robustness & Certified Defenses",
          "status": "PENDING",
          "nb": "24-07_adversarial.ipynb"
        },
        {
          "n": "24-08",
          "slug": "distribution-shift",
          "title": "Distribution Shift & Drift Detection",
          "status": "PENDING",
          "nb": "24-08_drift_detection.ipynb"
        },
        {
          "n": "24-09",
          "slug": "red-teaming",
          "title": "Red-Teaming & Model Auditing",
          "status": "PENDING",
          "nb": "24-09_red_teaming.ipynb"
        },
        {
          "n": "24-10",
          "slug": "alignment-governance",
          "title": "Alignment & Governance Overview",
          "status": "PENDING",
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
      "status": "PENDING",
      "lessons": [
        {
          "n": "25-01",
          "slug": "interview-landscape",
          "title": "The ML Interview Landscape & Strategy",
          "status": "PENDING",
          "nb": "25-01_interview_strategy.ipynb"
        },
        {
          "n": "25-02",
          "slug": "system-design-framework",
          "title": "ML System Design Framework",
          "status": "PENDING",
          "nb": "25-02_system_design_framework.ipynb"
        },
        {
          "n": "25-03",
          "slug": "design-recommender",
          "title": "Design Case: Recommender & Feed",
          "status": "PENDING",
          "nb": "25-03_design_recommender.ipynb"
        },
        {
          "n": "25-04",
          "slug": "design-search-ads",
          "title": "Design Case: Search & Ads",
          "status": "PENDING",
          "nb": "25-04_design_search_ads.ipynb"
        },
        {
          "n": "25-05",
          "slug": "design-fraud-llm",
          "title": "Design Case: Fraud Detection & LLM Products",
          "status": "PENDING",
          "nb": "25-05_design_fraud_llm.ipynb"
        },
        {
          "n": "25-06",
          "slug": "coding-patterns",
          "title": "Coding Patterns for ML Interviews",
          "status": "PENDING",
          "nb": "25-06_coding_patterns.ipynb"
        },
        {
          "n": "25-07",
          "slug": "cs-algorithms",
          "title": "Classical CS Algorithms Review",
          "status": "PENDING",
          "nb": "25-07_cs_algorithms.ipynb"
        },
        {
          "n": "25-08",
          "slug": "breadth-rapid-fire",
          "title": "ML Breadth Rapid-Fire",
          "status": "PENDING",
          "nb": "25-08_breadth_rapid_fire.ipynb"
        },
        {
          "n": "25-09",
          "slug": "derivations",
          "title": "Deep-Dive Derivations",
          "status": "PENDING",
          "nb": "25-09_derivations.ipynb"
        },
        {
          "n": "25-10",
          "slug": "portfolio-capstone",
          "title": "Take-Homes, Storytelling & Portfolio Capstone",
          "status": "PENDING",
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
