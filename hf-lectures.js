// hf-lectures.js — condensed on-site overviews for the HuggingFace Tutorial.
// 7 sections / 38 notebooks. The full runnable notebooks live on GitHub.
// Consumed by hf-hub-app.jsx (hub) and hf-section-app.jsx (section page).
// notebook fields: n=id, t=title, models=models/tools, d=description, diff=difficulty,
//   cur=curriculum lesson refs ("module-slug/lesson-slug") this notebook supplements —
//   the B5 supplementary-track mapping; rendered by hf-section-app.jsx as module-page links.

window.HF = {
  repo: "https://github.com/derrickmo/huggingface_tutorials",
  folder(dir) { return `${this.repo}/tree/main/notebooks/${dir}`; },
  find(slug) { return this.sections.find(s => s.slug === slug); },
  totalNotebooks() { return this.sections.reduce((a, s) => a + s.notebooks.length, 0); },

  sections: [
    {
      slug: "fundamentals", dir: "00_fundamentals", title: "Transformer Fundamentals",
      blurb: "How transformers and the HuggingFace ecosystem actually work — before you touch a specific model.",
      summary: "Understand what transformers are and how the HuggingFace ecosystem is organized before using specific models — tokenization and embeddings, attention internals, AutoClasses and pipelines, unified preprocessors, and model configuration.",
      takeaways: [
        "How tokenizers and embeddings turn text into the inputs a model actually sees.",
        "What's inside a transformer — self-attention, heads, encoder vs decoder — by inspecting real models.",
        "How the ecosystem fits together: AutoClasses, pipelines, processors, configs, and the Hub.",
      ],
      code: `from transformers import pipeline
clf = pipeline("sentiment-analysis")            # model + tokenizer, auto-wired
clf("HuggingFace makes this delightfully easy")  # -> [{'label': 'POSITIVE', ...}]`,
      codeCaption: "The whole ecosystem, behind one call.",
      notebooks: [
        { n: "00_01", t: "Tokenization & Embeddings", models: "AutoTokenizer", d: "BPE, WordPiece, vocabulary, special tokens, embeddings.", diff: "Beginner", cur: ["rnn-nlp/tokenization", "rnn-nlp/word-vectors"] },
        { n: "00_02", t: "Transformer Architecture", models: "AutoModel", d: "Self-attention, multi-head attention, encoder vs decoder.", diff: "Beginner", cur: ["transformers/self-attention", "transformers/full-transformer"] },
        { n: "00_03", t: "HuggingFace Ecosystem", models: "Pipeline, HfApi", d: "Hub navigation, AutoClasses, pipelines, model cards.", diff: "Beginner", cur: ["frontier-frameworks/open-weight-models"] },
        { n: "00_04", t: "Preprocessors & Feature Extractors", models: "AutoProcessor", d: "Unified preprocessing, padding/truncation, multimodal processors.", diff: "Beginner", cur: ["rnn-nlp/tokenization", "multimodal/clip"] },
        { n: "00_05", t: "Model Configuration & Customization", models: "AutoConfig", d: "config.json, model surgery, freezing, memory estimation.", diff: "Beginner", cur: ["llm-systems/llm-architectures", "fine-tuning/full-fine-tuning"] },
      ],
    },
    {
      slug: "nlp", dir: "01_nlp", title: "Natural Language Processing",
      blurb: "The core NLP task suite end to end, then parameter-efficient fine-tuning.",
      summary: "The core NLP task suite end to end — text generation, classification, summarization, named-entity recognition, question answering, and translation — then parameter-efficient fine-tuning with LoRA and Unsloth.",
      takeaways: [
        "Run every core NLP task in a few lines via pipelines and AutoModels.",
        "When to reach for causal vs masked vs seq2seq models.",
        "Adapt LLMs cheaply with LoRA / Unsloth instead of full fine-tuning.",
      ],
      code: `from transformers import pipeline
gen = pipeline("text-generation", model="distilgpt2")
gen("In the future, AI will", max_new_tokens=20, do_sample=True)`,
      codeCaption: "Generation in three lines — then swap in any model.",
      notebooks: [
        { n: "01_01", t: "Text Generation", models: "GPT-2, DistilGPT2", d: "Causal LM, greedy/beam/sampling decoding.", diff: "Beginner", cur: ["rnn-nlp/text-generation", "advanced-nlp/gpt"] },
        { n: "01_02", t: "Text Classification", models: "DistilBERT, BERT", d: "Sentiment analysis and topic classification.", diff: "Beginner", cur: ["advanced-nlp/bert"] },
        { n: "01_03", t: "Text Summarization", models: "DistilBART, BART", d: "Abstractive summarization, seq2seq.", diff: "Intermediate", cur: ["rnn-nlp/seq2seq-attention", "advanced-nlp/architectures"] },
        { n: "01_04", t: "Named Entity Recognition", models: "DistilBERT-NER", d: "Token classification, BIO tags, span extraction.", diff: "Intermediate", cur: ["advanced-nlp/ner"] },
        { n: "01_05", t: "Question Answering", models: "DistilBERT-QA", d: "Extractive QA — context + question to answer span.", diff: "Intermediate", cur: ["advanced-nlp/qa"] },
        { n: "01_06", t: "Translation", models: "MarianMT", d: "Machine translation, multilingual, beam search.", diff: "Intermediate", cur: ["rnn-nlp/seq2seq-attention"] },
        { n: "01_07", t: "Fine-tuning (Unsloth)", models: "Llama 3.2 / 3.1", d: "2-5x faster LLM fine-tuning (GPU).", diff: "Advanced", cur: ["fine-tuning/unsloth"] },
        { n: "01_08", t: "Fine-tuning (LoRA)", models: "GPT-2", d: "Adapter training with LoRA (CPU-compatible).", diff: "Advanced", cur: ["fine-tuning/lora"] },
      ],
    },
    {
      slug: "computer-vision", dir: "02_computer_vision", title: "Computer Vision",
      blurb: "Vision with transformers — classification, detection, OCR, and segmentation.",
      summary: "Vision with transformers — image classification (ViT), object detection (DETR, YOLOv8), OCR (TrOCR), and image segmentation (SegFormer).",
      takeaways: [
        "Vision Transformers classify images with the same attention machinery as NLP.",
        "Detection, OCR, and segmentation — each a few lines via pipelines.",
        "How image preprocessing (image processors) differs from text.",
      ],
      code: `from transformers import pipeline
clf = pipeline("image-classification", model="google/vit-base-patch16-224")
clf("photo.jpg")[:3]      # top-3 labels with scores`,
      codeCaption: "ViT: attention, applied to image patches.",
      notebooks: [
        { n: "02_01", t: "Image Classification", models: "ViT", d: "Identify objects in images.", diff: "Beginner", cur: ["advanced-cv/vit"] },
        { n: "02_02", t: "Object Detection", models: "DETR, YOLOv8", d: "Detect and localize multiple objects.", diff: "Intermediate", cur: ["advanced-cv/object-detection", "advanced-cv/yolo"] },
        { n: "02_03", t: "OCR", models: "TrOCR, PaddleOCR", d: "Extract text from images (80+ languages).", diff: "Intermediate", cur: ["advanced-cv/ocr"] },
        { n: "02_04", t: "Image Segmentation", models: "SegFormer", d: "Semantic, instance, and panoptic segmentation.", diff: "Intermediate", cur: ["advanced-cv/object-detection"] },
      ],
    },
    {
      slug: "audio", dir: "03_audio", title: "Audio",
      blurb: "Speech-to-text, text-to-speech, and audio classification.",
      summary: "Speech and sound — transcription with Whisper, speech synthesis with SpeechT5, and audio classification with the Audio Spectrogram Transformer.",
      takeaways: [
        "Transcribe and synthesize speech with pretrained models.",
        "How audio becomes model input — waveforms and mel spectrograms.",
        "Classify sound with the same transformer backbone.",
      ],
      code: `from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
asr("audio.wav")["text"]`,
      codeCaption: "Whisper: audio in, text out.",
      notebooks: [
        { n: "03_01", t: "Speech Recognition", models: "Whisper", d: "Transcribe audio to text.", diff: "Intermediate", cur: ["multimodal/stt-tts"] },
        { n: "03_02", t: "Text-to-Speech", models: "SpeechT5", d: "Generate natural-sounding speech.", diff: "Intermediate", cur: ["multimodal/stt-tts"] },
        { n: "03_03", t: "Audio Classification", models: "AST", d: "Environmental sounds, music genre classification.", diff: "Intermediate", cur: ["ml-applications/audio-classification", "multimodal/audio-representations"] },
      ],
    },
    {
      slug: "multimodal", dir: "04_multimodal", title: "Multimodal",
      blurb: "Where vision and language meet — captioning, VQA, image generation, and documents.",
      summary: "Where vision and language meet — image captioning (BLIP), visual question answering (ViLT), text-to-image generation (Stable Diffusion), image editing and inpainting, and document understanding.",
      takeaways: [
        "Connect images and text: captioning, visual QA, and retrieval.",
        "Generate and edit images with diffusion models.",
        "Parse real documents — forms and receipts — with layout-aware models.",
      ],
      code: `from transformers import pipeline
cap = pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")
cap("photo.jpg")[0]["generated_text"]`,
      codeCaption: "One shared space for pixels and words.",
      notebooks: [
        { n: "04_01", t: "Image-to-Text (Captioning)", models: "BLIP", d: "Generate captions from images.", diff: "Intermediate", cur: ["multimodal/vlm-captioning"] },
        { n: "04_02", t: "Visual Question Answering", models: "ViLT", d: "Ask questions about images.", diff: "Intermediate", cur: ["multimodal/vqa"] },
        { n: "04_03", t: "Text-to-Image Generation", models: "Stable Diffusion", d: "Prompt engineering, negative prompts, schedulers.", diff: "Intermediate", cur: ["generative/latent-diffusion", "generative/diffusion-guidance"] },
        { n: "04_04", t: "Image Editing & Inpainting", models: "SD Inpainting, InstructPix2Pix", d: "Inpainting, img2img, instruction-based editing.", diff: "Advanced", cur: ["generative/diffusion-guidance"] },
        { n: "04_05", t: "Document Understanding", models: "LayoutLM, Donut", d: "Form parsing, receipt extraction, document QA.", diff: "Advanced", cur: ["multimodal/multimodal-fusion", "advanced-cv/ocr"] },
      ],
    },
    {
      slug: "best-practices", dir: "05_best_practices", title: "Best Practices & Production",
      blurb: "Take models to production — performance, quantization, datasets, demos, and training.",
      summary: "Take models to production — local LLMs with Ollama, performance and caching, responsible AI, datasets, Gradio demos, quantization (intro plus GPTQ/AWQ), and the Trainer API.",
      takeaways: [
        "Measure and optimize latency, memory, and cost.",
        "Shrink models with quantization (INT8 to GPTQ / AWQ / 4-bit).",
        "Ship demos with Gradio/Spaces, train properly with the Trainer API, and build responsibly.",
      ],
      code: `from transformers import AutoModelForCausalLM, BitsAndBytesConfig
cfg = BitsAndBytesConfig(load_in_4bit=True)
model = AutoModelForCausalLM.from_pretrained("gpt2", quantization_config=cfg)`,
      codeCaption: "Run bigger models on smaller hardware.",
      notebooks: [
        { n: "05_01", t: "Ollama Integration", models: "Local LLMs", d: "Use Ollama models with HuggingFace tools.", diff: "Intermediate", cur: ["frontier-frameworks/open-weight-models"] },
        { n: "05_02", t: "Performance & Caching", models: "Optimization", d: "Latency, throughput, batching, cost estimation.", diff: "Intermediate", cur: ["frontier-frameworks/vllm-inference", "transformers/kv-cache"] },
        { n: "05_03", t: "Model Cards & AI Ethics", models: "Responsible AI", d: "Bias, fairness, and documentation.", diff: "Intermediate", cur: ["trustworthy-ai/fairness", "trustworthy-ai/alignment-governance"] },
        { n: "05_04", t: "HuggingFace Datasets", models: "datasets", d: "Load, filter, preprocess, and create custom datasets.", diff: "Beginner", cur: ["llm-systems/llm-data-pipelines", "training-systems/data-loading-scale"] },
        { n: "05_05", t: "Gradio & Spaces", models: "gradio", d: "Build web UIs and deploy to HuggingFace Spaces.", diff: "Intermediate", cur: ["mlops/model-serving"] },
        { n: "05_06", t: "Quantization & Compression", models: "ONNX", d: "INT8 quantization, ONNX export, benchmarking.", diff: "Intermediate", cur: ["llm-systems/quantization", "mlops/torchscript-onnx"] },
        { n: "05_07", t: "Quantization Deep Dive", models: "GPTQ, AWQ, bitsandbytes", d: "4-bit/8-bit, perplexity evaluation.", diff: "Advanced", cur: ["llm-systems/quantization", "fine-tuning/qlora"] },
        { n: "05_08", t: "Training Best Practices", models: "Trainer API", d: "LR schedules, grad accumulation, mixed precision.", diff: "Advanced", cur: ["training-systems/mixed-precision", "training-systems/gradient-accumulation"] },
      ],
    },
    {
      slug: "agentic", dir: "06_agentic_workflows", title: "Agentic Workflows",
      blurb: "Build agents that use tools — MCP, multi-tool patterns, RAG, structured output.",
      summary: "Build agents that use tools — Model Context Protocol basics and servers, multi-tool patterns (ReAct, Plan-and-Execute, Reflection), RAG with local LLMs, and structured output with function calling.",
      takeaways: [
        "Give LLMs tools via the Model Context Protocol (MCP).",
        "Orchestrate multi-step agents — ReAct, Plan-and-Execute, Reflection.",
        "Ground answers with RAG and enforce reliable, validated structured output.",
      ],
      code: `from pydantic import BaseModel
class Person(BaseModel):
    name: str; age: int
# the model must return JSON that validates against the schema
person = extract(prompt, response_model=Person)   # typed, validated output`,
      codeCaption: "Reliable agents = tools + validated output.",
      notebooks: [
        { n: "06_01", t: "MCP Basics", models: "Tool-using agents", d: "Model Context Protocol fundamentals, tool calling.", diff: "Intermediate", cur: ["agentic-ai/mcp", "agentic-ai/tool-calling"] },
        { n: "06_02", t: "MCP Servers", models: "Reusable tools", d: "Build file system and data analysis servers.", diff: "Advanced", cur: ["agentic-ai/mcp"] },
        { n: "06_03", t: "Multi-Tool Agents", models: "Agent patterns", d: "ReAct, Plan-and-Execute, Reflection.", diff: "Advanced", cur: ["agentic-ai/react-planning", "agentic-ai/multi-agent"] },
        { n: "06_04", t: "RAG with Local LLMs", models: "FAISS, ChromaDB", d: "Vector databases, semantic search, context injection.", diff: "Advanced", cur: ["rag-agents/embeddings-vector-stores", "rag-agents/rag-pipeline"] },
        { n: "06_05", t: "Structured Output", models: "Pydantic, instructor", d: "JSON mode, validation, function-calling patterns.", diff: "Advanced", cur: ["llm-systems/structured-output", "agentic-ai/tool-calling"] },
      ],
    },
  ],
};
